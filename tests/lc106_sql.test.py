#!/usr/bin/env python3
"""PostgreSQL test for sql/20261125100000_lc106_sprint_funnel_referrals.sql (LC106, 9.74.0).
Funnel: an owner device (lc94_exclude_me, admin only) never counts and its old rows go; the first run archives the old funnel once.
Sprint: needs a linked chess account; start = the verified rating or a higher week peak (never lower, never absurd); target by segment;
one Sprint per chess account; XP is capped per day; the XP goal sets the Sprint price; the rating goal is read from lc59_links;
the stripe helpers are not callable by members and give the price once. Referral tokens wait for the friend's Chess.com / Lichess link.
Run: python3 tests/lc106_sql.test.py (needs a local PostgreSQL 16)."""
import os, subprocess, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda f: open(os.path.join(ROOT, 'sql', f)).read()
SQL94, SQL = rd('20261118100000_lc94_funnel.sql'), rd('20261125100000_lc106_sprint_funnel_referrals.sql')
DB = 'lc106'
U1, U2, OWN = '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000ff'
M1, M2 = '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'
SETUP = """
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create table auth.users(id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create table public.admin_users(user_id uuid primary key);
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid()) $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create table public.lc59_links(user_id uuid primary key, email text not null, site text, uname text, start_rating int, last_rating int, peak_rating int,
  linked_at timestamptz default now(), last_at timestamptz default now());
create table public.lc7_members(id uuid primary key, email text);
create table public.lc7_token_ledger(id bigserial primary key, member_id uuid, delta int, reason text, ref_id text, created_at timestamptz default now());
insert into auth.users values ('%s','a@x.be'), ('%s','b@x.be'), ('%s','lanckrietchess@gmail.com');
insert into public.admin_users values ('%s');
insert into public.lc7_members values ('%s','a@x.be'), ('%s','b@x.be');
""" % (U1, U2, OWN, OWN, M1, M2)
def psql(args, text): return subprocess.run(['su', 'postgres', '-c', 'psql ' + args], input=text, capture_output=True, text=True)
subprocess.run(['pg_ctlcluster', '16', 'main', 'start'], capture_output=True)
psql('-q -c "drop database if exists %s" -c "create database %s"' % (DB, DB), '')
OLD = "select public.lc94_step('olddevice01','landing','ig'); select public.lc94_step('olddevice02','first_open',null);"
for name, text in (('setup', SETUP), ('lc94', SQL94), ('old rows', OLD), ('lc106', SQL), ('lc106 again', SQL)):
    r = psql('-q -d %s -v ON_ERROR_STOP=1' % DB, text); assert r.returncode == 0, name + ': ' + r.stderr
P = 0; F = 0
def ok(c, m):
    global P, F
    c = bool(c); P += c; F += (not c); print(('PASS ' if c else 'FAIL ') + m)
def q(sql, role='authenticated', uid=''):
    r = psql('-q -t -A -d ' + DB, "set role %s; select set_config('test.uid','%s',false);\nselect %s;" % (role, uid, sql))
    lines = [l for l in r.stdout.strip().splitlines() if l.strip()]
    if r.returncode or 'ERROR' in r.stderr: return 'ERR:' + r.stderr.strip()
    v = lines[-1] if lines else ''
    try: return json.loads(v)
    except Exception: return v
def su(sql):
    if sql.lstrip().split()[0].lower() in ('insert', 'update', 'delete', 'select'):
        r = psql('-q -t -A -v ON_ERROR_STOP=1 -d ' + DB, sql + ';'); assert r.returncode == 0, sql + ': ' + r.stderr
        lines = [l for l in r.stdout.strip().splitlines() if l.strip()]
        try: return json.loads(lines[-1]) if lines else None
        except Exception: return lines[-1]
    return q(sql, 'postgres')

# ---- funnel
ok(su("count(*) from public.lc94_funnel") == 0 and su("count(*) from public.lc94_funnel_archive") == 2, 'the old funnel rows are archived once and the funnel starts at zero')
q("public.lc94_step('realvisitor1','landing','ig')", 'anon')
ok(su("count(*) from public.lc94_funnel_archive") == 2 and su("count(*) from public.lc94_funnel") == 1, 'a second run does not reset again')
q("public.lc94_step('ownerdevice1','landing',null)", 'anon')
ok(q("public.lc94_exclude_me('ownerdevice1')", uid=U1) in (False, 'f'), 'a member cannot exclude a device')
ok(q("public.lc94_exclude_me('ownerdevice1')", uid=OWN) in (True, 't'), 'the owner excludes his device')
q("public.lc94_step('ownerdevice1','first_open',null)", 'anon')
ok(su("count(*) from public.lc94_funnel where aid='ownerdevice1'") == 0, "the owner's device leaves no rows, old or new")
ok(str(q("public.lc94_exclude_me('x')", 'anon')).startswith('ERR'), 'anon cannot call lc94_exclude_me')

# ---- Sprint
ok(q("public.lc106_join(100, null)->>'reason'", uid=U1) == 'link', 'joining needs a linked chess account')
su("insert into public.lc59_links(user_id,email,site,uname,start_rating,last_rating) values ('%s','a@x.be','chesscom','alpha',950,950)" % U1)
s = q("public.lc106_join(100, 1400)", uid=U1)
ok(s.get('start') == 950, 'an absurd week peak (+400 or more) is ignored')
su("delete from public.lc106_sprint")
s = q("public.lc106_join(100, 1010)", uid=U1)
ok(s.get('start') == 1010 and s.get('target') == 75, 'a higher week peak is the start and the target follows its segment (1000-1400: +75)')
su("delete from public.lc106_sprint")
s = q("public.lc106_join(100, 800)", uid=U1)
ok(s.get('start') == 950 and s.get('target') == 100, 'a lower week peak never lowers the start (under 1000: +100)')
ok(q("public.lc106_join(9999, 2000)", uid=U1).get('start') == 950, 'joining again returns the same Sprint')
su("insert into public.lc59_links(user_id,email,site,uname,start_rating,last_rating) values ('%s','b@x.be','chesscom','ALPHA',950,950)" % U2)
ok(q("public.lc106_join(0, null)->>'reason'", uid=U2) == 'account_used', 'one Sprint per chess account')
s = q("public.lc106_progress(100000)", uid=U1)
ok(0 < s.get('xp') < 1500 and not s.get('xp_done'), 'a huge XP jump is capped per day')
su("update public.lc106_sprint set xp_at = now() - interval '1 day'")
s = q("public.lc106_progress(1700)", uid=U1)
ok(s.get('xp') == 1600 and s.get('xp_done') and s.get('pct') == 20, 'the XP goal (1500) unlocks the Sprint price (20 %)')
ok(su("public._lc106_reward_pct('A@x.be')") == 20, 'the stripe helper finds the price by e-mail')
ok(str(q("public._lc106_reward_pct('a@x.be')", uid=U1)).startswith('ERR'), 'members cannot call the stripe helper')
su("select public._lc106_used('a@x.be','cs_test')")
ok(su("public._lc106_reward_pct('a@x.be')") == 0, 'the price is used once')
su("update public.lc59_links set last_rating = 1060 where user_id='%s'" % U1)
s = q("public.lc106_progress(1700)", uid=U1)
ok(s.get('rating_done') and s.get('gain') == 110, 'the rating goal is read from the verified rating')
ok(q("public.lc106_admin()->>'ok'", uid=U1) is False and q("jsonb_array_length(public.lc106_admin()->'rows')", uid=OWN) == 1, 'lc106_admin is owner only')
ok(q("public.lc106_cfg_save('{\"pct\":99}'::jsonb)->'cfg'->>'pct'", uid=OWN) == 60, 'the owner can change the price, at most 60 %')

# ---- referral tokens
su("insert into public.lc7_token_ledger(member_id,delta,reason,ref_id) values ('%s',5,'referral','%s')" % (M1, M2))   # friend b@x.be is linked
ok(su("count(*) from public.lc7_token_ledger") == 1, 'a friend with a linked chess account pays at once')
su("insert into public.lc7_members values ('10000000-0000-0000-0000-000000000003','c@x.be')")
su("insert into public.lc7_token_ledger(member_id,delta,reason,ref_id) values ('%s',5,'referral','10000000-0000-0000-0000-000000000003')" % M1)
ok(su("count(*) from public.lc7_token_ledger") == 1 and su("count(*) from public.lc106_ref_pending where paid_at is null") == 1, 'a friend without a chess account: the tokens wait')
su("insert into public.lc7_token_ledger(member_id,delta,reason,ref_id) values ('%s',2,'daily',null)" % M1)
ok(su("count(*) from public.lc7_token_ledger") == 2, 'other ledger rows are not touched')
su("insert into public.lc59_links(user_id,email,site,uname,last_rating) values ('00000000-0000-0000-0000-0000000000c3','C@x.be','lichess','gamma',1200)")
ok(su("count(*) from public.lc7_token_ledger where reason='referral'") == 2 and su("count(*) from public.lc106_ref_pending where paid_at is null") == 0, 'the link pays the held tokens, once')
print('\n%d passed, %d failed' % (P, F))
raise SystemExit(1 if F else 0)
