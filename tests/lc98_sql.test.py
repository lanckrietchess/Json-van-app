#!/usr/bin/env python3
"""PostgreSQL test for sql/20261121100000_lc98_segment_videos_lanes.sql (LC98: the landing page's Elo segment videos and the owner's lanes).
'segvideo' is a new lc89_cfg key: only the owner saves, anyone reads, the five segments and their fields are checked, a live segment
needs an address, unsafe text is refused, the old keys still save, history and restore work. Lanes: owner only (anon and members are
refused, RLS blocks a direct read), the slug follows the trackers' rule ([a-z0-9-], 2 to 24), one lane per slug, update keeps the slug,
delete works, short-link codes are listed for the clash warning. The file runs twice.
Run: python3 tests/lc98_sql.test.py (needs a local PostgreSQL 16)."""
import os, subprocess, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL89 = open(os.path.join(ROOT, 'sql', '20261116100000_lc89_lc90_inline_cms_founding_paywall.sql')).read()
SQL = open(os.path.join(ROOT, 'sql', '20261121100000_lc98_segment_videos_lanes.sql')).read()
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
create table if not exists public.lc73_links(code text primary key, platform text, label text, dest text, partner_email text, active boolean default true, created_at timestamptz default now());
insert into public.lc73_links(code, platform) values ('igb', 'instagram') on conflict do nothing;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid(), auth.jwt(), public.is_admin(), public._lc_require_admin() to anon, authenticated;
""" % (OWNER, MEMBER, OWNER)
def psql(args, text): return subprocess.run(['su', 'postgres', '-c', 'psql ' + args], input=text, capture_output=True, text=True)
subprocess.run(['pg_ctlcluster', '16', 'main', 'start'], capture_output=True)
psql('-q -c "drop database if exists lc98" -c "create database lc98"', '')
r = psql('-q -d lc98 -v ON_ERROR_STOP=1', SETUP); assert r.returncode == 0, r.stderr
r = psql('-q -d lc98 -v ON_ERROR_STOP=1', SQL89); assert r.returncode == 0, 'lc89: ' + r.stderr
r = psql('-q -d lc98 -v ON_ERROR_STOP=1', SQL); assert r.returncode == 0, r.stderr
r = psql('-q -d lc98 -v ON_ERROR_STOP=1', SQL); assert r.returncode == 0, 'second run: ' + r.stderr
P = 0; F = 0
def ok(c, m):
    global P, F
    P += c; F += (not c); print(('PASS ' if c else 'FAIL ') + m)
def pre(role, uid, email): return "set role %s; select set_config('test.uid','%s',false), set_config('test.email','%s',false);\n" % (role, uid, email)
def j(sql, role='anon', uid='', email=''):
    r = psql('-q -t -A -d lc98', pre(role, uid, email) + 'select ' + sql + ';')
    lines = [l for l in r.stdout.strip().splitlines() if l.strip() and not l.startswith('|')]
    try: return json.loads(lines[-1])
    except Exception: return {'_err': r.stderr.strip()[:200]}
def raw(sql, role, uid='', email=''): return psql('-q -t -A -d lc98', pre(role, uid, email) + sql)
O = dict(role='authenticated', uid=OWNER, email='lanckrietchess@gmail.com')
M = dict(role='authenticated', uid=MEMBER, email='member@x.be')
q = lambda v: json.dumps(v).replace("'", "''")
def save(k, v, **who): return j("public.lc89_cfg_save('%s','%s'::jsonb)" % (k, q(v)), **(who or O))

# ---------- segvideo ----------
doc = {'v': 1, 'on': True, 'label': 'Pick your rating', 'def': '800-1200', 'segs': {
    '0-800': {'url': 'https://youtu.be/abcdefghijk', 'yt': 'unlisted', 'live': True},
    '800-1200': {'url': 'https://www.youtube.com/watch?v=bcdefghijkl', 'yt': 'public', 'live': True},
    '1200-1600': {'url': '', 'yt': 'private', 'live': False}}}
ok('_err' in save('segvideo', doc, role='anon'), 'anon cannot save the segment videos')
ok('_err' in save('segvideo', doc, **M), 'a member cannot save the segment videos')
ok(save('segvideo', doc).get('ok') is True, 'the owner saves the segment videos')
ok(j("public.lc89_cfg_public('segvideo')").get('v') == doc, 'anyone (the landing page) reads them')
bad = lambda segs, **extra: save('segvideo', dict({'segs': segs}, **extra)).get('error')
ok(bad({'3000-plus': {}}) == 'segment', 'an unknown segment is refused')
ok(bad({'0-800': {'url': 'http://youtu.be/abcdefghijk'}}) == 'url', 'a plain http address is refused')
ok(bad({'0-800': {'url': 'https://youtu.be/x"onload'}}) == 'url', 'an address with a quote is refused')
ok(bad({'0-800': {'url': '', 'live': True}}) == 'live_without_url', 'a live segment without an address is refused')
ok(bad({'0-800': {'yt': 'secret'}}) == 'visibility', 'an unknown visibility is refused')
ok(bad({'0-800': {'live': 'yes'}}) == 'live', 'live must be true or false')
ok(bad({}, label='x' * 81) == 'label', 'a label over 80 characters is refused')
ok(bad({}, **{'def': '9000'}) == 'def', 'an unknown default segment is refused')
ok(bad({'0-800': {'url': 'https://youtu.be/abcdefghijk', 'title': '<script>x</script>'}}) == 'unsafe', 'a <script> anywhere is refused')
ok(save('landing', {'v': 1, 'text': {'how.h': 'Same'}}).get('ok') is True and save('mspc', {'intro': 'x'}).get('ok') is True, 'landing and mspc still save')
ok(save('paywall', {'trial_days': 7}).get('ok') is True and save('paywall', {'title': 'Lifetime deal'}).get('error') == 'wording', 'the paywall rules still hold')
doc2 = dict(doc, label='Choose your level'); save('segvideo', doc2)
h = j("public.lc89_cfg_history('segvideo')", **O)
ok(len(h.get('rows', [])) >= 1, 'the previous version is in the history')
rid = h['rows'][0]['id']
ok(j("public.lc89_cfg_restore(%d)" % rid, **O).get('ok') is True and j("public.lc89_cfg_public('segvideo')")['v']['label'] == 'Pick your rating', 'restore brings the old label back')
w = raw("insert into public.lc89_cfg(k, v) values ('segvideo', '{}') on conflict (k) do update set v = '{}';", **M)
ok('denied' in w.stderr or 'violates' in w.stderr or 'policy' in w.stderr, 'a member cannot write the table directly')

# ---------- lanes ----------
lane = lambda p, **who: j("public.lc98_lane_save('%s'::jsonb)" % q(p), **(who or O))
ok('_err' in lane({'slug': 'fb-ads', 'name': 'Facebook ads'}, role='anon'), 'anon cannot create a lane')
ok('_err' in lane({'slug': 'fb-ads', 'name': 'Facebook ads'}, **M), 'a member cannot create a lane')
ok('_err' in j('public.lc98_lanes()', **M), 'a member cannot list the lanes')
r1 = lane({'slug': 'FB-Ads', 'name': 'Facebook ads', 'dest': 'landing', 'seg': '800-1200', 'note': 'November test'})
ok(r1.get('ok') is True and r1.get('slug') == 'fb-ads', 'the owner creates a lane, the slug is lower-cased')
ok(lane({'slug': 'fb-ads', 'name': 'Again'}).get('error') == 'taken', 'one lane per slug')
ok(lane({'slug': 'fb_ads', 'name': 'x'}).get('error') == 'slug', 'an underscore is refused (LC73 would drop it)')
ok(lane({'slug': 'a', 'name': 'x'}).get('error') == 'slug', 'a one-letter slug is refused')
ok(lane({'slug': 'x' * 25, 'name': 'x'}).get('error') == 'slug', 'a slug over 24 characters is refused')
ok(lane({'slug': '-ab', 'name': 'x'}).get('error') == 'slug', 'a slug cannot start with a dash')
ok(lane({'slug': 'ok-1', 'name': ''}).get('error') == 'name', 'a name is needed')
ok(lane({'slug': 'ok-1', 'name': 'x', 'dest': 'stripe'}).get('error') == 'dest', 'an unknown destination is refused')
ok(lane({'slug': 'ok-1', 'name': 'x', 'seg': '5000'}).get('error') == 'seg', 'an unknown segment is refused')
ok(lane({'slug': 'ok-1', 'name': '<script>x</script>'}).get('error') == 'unsafe', 'unsafe text is refused')
ok(lane({'slug': 'mc-flow2', 'name': 'ManyChat flow 2', 'dest': 'deeplink'}).get('ok') is True, 'a deep-link lane is created')
L = j('public.lc98_lanes()', **O)
ok([x['slug'] for x in L.get('rows', [])] == ['mc-flow2', 'fb-ads'] and L.get('short_links') == ['igb'], 'the owner lists the lanes (newest first) and the short-link codes')
ok(lane({'slug': 'fb-ads', 'name': 'Facebook ads (Nov)', 'active': False, 'update': True}).get('ok') is True, 'update a lane')
L = j('public.lc98_lanes()', **O); f = [x for x in L['rows'] if x['slug'] == 'fb-ads'][0]
ok([f['name'], f['active'], L['rows'][-1]['slug']] == ['Facebook ads (Nov)', False, 'fb-ads'], 'the new name is saved, an archived lane goes last')
ok(lane({'slug': 'nope', 'name': 'x', 'update': True}).get('error') == 'not_found', 'updating a missing lane says not found')
d = raw('select * from public.lc98_lanes;', **M)
ok('denied' in d.stderr, 'a member cannot read the table directly')
ok('_err' in j("public.lc98_lane_del('mc-flow2')", **M), 'a member cannot delete a lane')
ok(j("public.lc98_lane_del('mc-flow2')", **O).get('ok') is True and len(j('public.lc98_lanes()', **O)['rows']) == 1, 'the owner deletes a lane')
print('\n%d passed, %d failed' % (P, F))
raise SystemExit(1 if F else 0)
