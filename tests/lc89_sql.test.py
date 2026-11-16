#!/usr/bin/env python3
"""PostgreSQL test for sql/20261116100000_lc89_lc90_inline_cms_founding_paywall.sql (LC89 landing CMS + LC90 Day-7 pop-up).
Only an admin (public.is_admin(), the admin_users table on the live project) saves; anyone reads; RLS blocks a direct write by a member
even when they skip the functions (the DevTools case); unsafe HTML and "lifetime" wording are refused; the history keeps the old version and
restores it; the pop-up counters dedupe per device and day; the file runs twice.
Run: python3 tests/lc89_sql.test.py (needs a local PostgreSQL 16)."""
import os, subprocess, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL = open(os.path.join(ROOT, 'sql', '20261116100000_lc89_lc90_inline_cms_founding_paywall.sql')).read()
OWNER = '11111111-1111-1111-1111-111111111111'; MEMBER = '22222222-2222-2222-2222-222222222222'
SETUP = """
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users(id uuid primary key, email text, created_at timestamptz default now());
insert into auth.users values ('%s','lanckrietchess@gmail.com', now() - interval '30 days'), ('%s','member@x.be', now() - interval '8 days') on conflict do nothing;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email', coalesce(current_setting('test.email',true),'')) $$;
create table if not exists public.admin_users(user_id uuid primary key);
insert into public.admin_users values ('%s') on conflict do nothing;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid()) $$;
create or replace function public._lc_require_admin() returns void language plpgsql stable as $$ begin
  if not public.is_admin() then raise exception 'not_admin' using errcode = '42501'; end if; end $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid(), auth.jwt(), public.is_admin(), public._lc_require_admin() to anon, authenticated;
""" % (OWNER, MEMBER, OWNER)
def psql(args, text): return subprocess.run(['su', 'postgres', '-c', 'psql ' + args], input=text, capture_output=True, text=True)
subprocess.run(['pg_ctlcluster', '16', 'main', 'start'], capture_output=True)
psql('-q -c "drop database if exists lc89" -c "create database lc89"', '')
r = psql('-q -d lc89 -v ON_ERROR_STOP=1', SETUP); assert r.returncode == 0, r.stderr
r = psql('-q -d lc89 -v ON_ERROR_STOP=1', SQL); assert r.returncode == 0, r.stderr
r = psql('-q -d lc89 -v ON_ERROR_STOP=1', SQL); assert r.returncode == 0, 'second run: ' + r.stderr
P = 0; F = 0
def ok(c, m):
    global P, F
    P += c; F += (not c); print(('PASS ' if c else 'FAIL ') + m)
def pre(role, uid, email): return "set role %s; select set_config('test.uid','%s',false), set_config('test.email','%s',false);\n" % (role, uid, email)
def j(sql, role='anon', uid='', email=''):
    r = psql('-q -t -A -d lc89', pre(role, uid, email) + 'select ' + sql + ';')
    lines = [l for l in r.stdout.strip().splitlines() if l.strip() and not l.startswith('|')]
    try: return json.loads(lines[-1])
    except Exception: return {'_err': r.stderr.strip()[:200]}
def raw(sql, role, uid='', email=''): return psql('-q -t -A -d lc89', pre(role, uid, email) + sql)
O = dict(role='authenticated', uid=OWNER, email='lanckrietchess@gmail.com')
M = dict(role='authenticated', uid=MEMBER, email='member@x.be')
q = lambda v: json.dumps(v).replace("'", "''")
def save(k, v, **who): return j("public.lc89_cfg_save('%s','%s'::jsonb)" % (k, q(v)), **(who or O))

# who am I
ok(j('public.lc89_whoami()').get('admin') is False, 'anon: not admin')
ok(j('public.lc89_whoami()', **M).get('admin') is False, 'a signed-in member: not admin')
ok(j('public.lc89_whoami()', **O).get('admin') is True, 'the owner (in admin_users): admin')
ok(j('public.lc89_whoami()', role='authenticated', uid=MEMBER, email='lanckrietchess@gmail.com').get('admin') is False, 'the owner e-mail alone is not enough: admin comes from admin_users')

# saving
doc = {'v': 1, 'text': {'how.h': 'Think <b>the same</b> way'}, 'hide': {'giveaway': True}, 'order': ['mission', 'story', 'love']}
ok('_err' in save('landing', doc, role='anon'), 'anon cannot save')
ok('_err' in save('landing', doc, **M), 'a member cannot save through the function')
ok(save('landing', doc).get('ok') is True, 'the owner saves the landing page')
ok(j("public.lc89_cfg_public('landing')").get('v') == doc, 'anyone reads the published landing page')
ok(save('landing', {'text': {'x': '<script>alert(1)</script>'}}).get('error') == 'unsafe', 'a <script> is refused')
ok(save('landing', {'text': {'x': '<img src=x onerror=alert(1)>'}}).get('error') == 'unsafe', 'an on...= handler is refused')
ok(save('landing', {'href': {'x': 'javascript:alert(1)'}}).get('error') == 'unsafe', 'a javascript: link is refused')
ok(save('landing', {'text': {'x': 'Done = good, once = enough'}}).get('ok') is True, 'ordinary text with = still saves')
ok(save('nope', {}).get('error') == 'key', 'unknown keys are refused')
ok(save('landing', {'big': 'x' * 300001}).get('error') == 'too_big', 'more than 300 kB is refused')

# RLS: the DevTools case (a member writes to the table directly)
r = raw("update public.lc89_cfg set v = '{\"hacked\":true}' where k = 'landing'; select v->>'hacked' from public.lc89_cfg where k='landing';", **M)
ok('true' not in r.stdout, 'a member updating the table directly changes nothing (RLS)')
r = raw("insert into public.lc89_cfg(k, v) values ('paywall', '{\"hacked\":true}');", **M)
ok('row-level security' in r.stderr, 'a member inserting directly is refused (RLS)')
r = raw("delete from public.lc89_cfg where k = 'landing'; select count(*) from public.lc89_cfg where k='landing';", **M)
ok(r.stdout.strip().endswith('1'), 'a member deleting directly removes nothing (RLS)')
r = raw("update public.lc89_cfg set v = '{\"hacked\":true}' where k = 'landing';", role='anon')
ok('permission denied' in r.stderr, 'anon cannot write to the table at all')
r = raw("select count(*) from public.lc89_cfg_history;", role='anon')
ok('permission denied' in r.stderr, 'the history is closed to anon')

# history and restore
save('landing', {'v': 1, 'text': {'how.h': 'Second version'}})
h = j("public.lc89_cfg_history('landing')", **O).get('rows') or []
ok(len(h) >= 1, 'the previous version is kept')
ok('_err' in j("public.lc89_cfg_history('landing')", **M), 'a member cannot list the history')
first = h[-1]['id']
ok(j('public.lc89_cfg_restore(%d)' % first, **O).get('ok') is True and j("public.lc89_cfg_public('landing')").get('v') == doc, 'restore brings the first version back')
for i in range(35): save('landing', {'n': i})
ok(len(j("public.lc89_cfg_history('landing')", **O).get('rows') or []) == 30, 'at most 30 versions are kept')

# the Day-7 pop-up config
pw = {'on': True, 'title': 'Your intro week is over', 'trial_days': 7, 'stripe_price_yearly': 'price_1QabcDEF', 'stripe_price_monthly': '',
      'features': [{'t': 'Keep 3 tokens a day', 'on': True}]}
ok(save('paywall', pw).get('ok') is True, 'the owner saves the pop-up')
ok(save('paywall', dict(pw, trial_days=31)).get('error') == 'trial_days', 'a trial longer than 30 days is refused')
ok(save('paywall', dict(pw, trial_days='7')).get('error') == 'trial_days', 'a trial length must be a number')
ok(save('paywall', dict(pw, trial_days=2.5)).get('error') == 'trial_days', 'a trial length is whole days')
ok(save('paywall', dict(pw, stripe_price_yearly='prod_123456')).get('error') == 'price_id', 'only price_... ids')
ok(save('paywall', dict(pw, body='50% off for life')).get('error') == 'wording', 'no "for life": the rate holds while the subscription stays active')
ok(save('paywall', dict(pw, features=[{'t': str(i)} for i in range(13)])).get('error') == 'features', 'at most 12 feature lines')
ok(j("public.lc89_cfg_public('paywall')").get('v', {}).get('stripe_price_yearly') == 'price_1QabcDEF', 'the pop-up config is public (Stripe Price IDs are not secrets)')

# counters
ok(j("public.lc89_paywall_log('shown','dev-abc123')", **M).get('ok') is True, 'a member logs "shown"')
j("public.lc89_paywall_log('shown','dev-abc123')", **M)
ok(j("public.lc89_paywall_log('hack','dev-abc123')").get('error') == 'invalid', 'unknown kinds are refused')
ok(j("public.lc89_paywall_log('later','dev-xyz789')").get('ok') is True, 'anon logs too (device only)')
ok(j('public.lc89_paywall_seen()', **M).get('seen') is True, 'the account has seen it (any device)')
ok(j('public.lc89_paywall_seen()', **O).get('seen') is False, 'another account has not')
ok(j('public.lc89_paywall_seen()').get('signed_in') is False, 'anon: not signed in')
st = j('public.lc89_paywall_stats(30)', **O)
ok(st.get('counts') == {'shown': 1, 'later': 1}, 'stats: one device per kind and day')
ok('_err' in j('public.lc89_paywall_stats(30)', **M), 'a member cannot read the stats')
r = raw("select count(*) from public.lc89_paywall_events;", role='anon')
ok('permission denied' in r.stderr, 'the events table is closed to anon')
print('RESULT %d passed %d failed' % (P, F)); raise SystemExit(1 if F else 0)
