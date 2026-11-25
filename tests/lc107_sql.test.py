#!/usr/bin/env python3
"""PostgreSQL test for sql/20261126100000_lc107_sprint_month_week1.sql (9.75.0) on top of the 9.74.0 Sprint SQL.
The reward is a 13th month by default and fixed on the row when EITHER goal is reached (the XP goal or the rating target); it stays
open until 48 hours after the later of the Sprint's end and the trial's end, then closes; used once; a config change never changes
what was promised; the pct mode still works when the owner switches to it. Week 1: 500 XP in the first 7 days -> 14 bonus tokens
in lc36_token_credits, once. The stripe helpers are not callable by members. The file runs twice.
Run: python3 tests/lc107_sql.test.py (needs a local PostgreSQL 16)."""
import os, subprocess, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda f: open(os.path.join(ROOT, 'sql', f)).read()
SQL94, SQL106, SQL = rd('20261118100000_lc94_funnel.sql'), rd('20261125100000_lc106_sprint_funnel_referrals.sql'), rd('20261126100000_lc107_sprint_month_week1.sql')
DB = 'lc107'
U1, U2, OWN = '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000ff'
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
create table public.lc36_token_credits(id bigserial primary key, email text, tokens int, pack text, amount_cents int, session_id text unique,
  created_at timestamptz default now(), claimed_at timestamptz, claimed_owner text);
create table public.lc73_trials(session_id text primary key, email text not null, trial_end timestamptz not null);
insert into auth.users values ('%s','a@x.be'), ('%s','b@x.be'), ('%s','lanckrietchess@gmail.com');
insert into public.admin_users values ('%s');
insert into public.lc59_links(user_id,email,site,uname,start_rating,last_rating) values ('%s','a@x.be','chesscom','alpha',1180,1180), ('%s','b@x.be','lichess','beta',900,900);
""" % (U1, U2, OWN, OWN, U1, U2)
def psql(args, text): return subprocess.run(['su', 'postgres', '-c', 'psql ' + args], input=text, capture_output=True, text=True)
subprocess.run(['pg_ctlcluster', '16', 'main', 'start'], capture_output=True)
psql('-q -c "drop database if exists %s" -c "create database %s"' % (DB, DB), '')
for name, text in (('setup', SETUP), ('lc94', SQL94), ('lc106', SQL106), ('lc107', SQL), ('lc107 again', SQL)):
    r = psql('-q -d %s -v ON_ERROR_STOP=1' % DB, text); assert r.returncode == 0, name + ': ' + r.stderr
P = 0; F = 0
def ok(c, m):
    global P, F
    c = bool(c); P += c; F += (not c); print(('PASS ' if c else 'FAIL ') + m)
def q(sql, uid='', role='authenticated'):
    r = psql('-q -t -A -d ' + DB, "set role %s; select set_config('test.uid','%s',false);\nselect %s;" % (role, uid, sql))
    if r.returncode or 'ERROR' in r.stderr: return 'ERR:' + r.stderr.strip()
    lines = [l for l in r.stdout.strip().splitlines() if l.strip()]
    v = lines[-1] if lines else ''
    try: return json.loads(v)
    except Exception: return v
def su(sql):
    r = psql('-q -t -A -v ON_ERROR_STOP=1 -d ' + DB, sql + ';'); assert r.returncode == 0, sql + ': ' + r.stderr
    lines = [l for l in r.stdout.strip().splitlines() if l.strip()]
    try: return json.loads(lines[-1]) if lines else None
    except Exception: return lines[-1]

cfg = su("select v from public.lc106_cfg where k = 'main'")
ok(cfg.get('reward') == 'month' and cfg.get('reward_hours') == 48 and cfg.get('week1_xp') == 500 and cfg.get('week1_tokens') == 14, 'defaults: a 13th month, 48 hours, week 1 = 500 XP -> 14 tokens')
s = q("public.lc106_join(100, null)", U1)
ok(s.get('reward_kind') == 'month' and not s.get('reward_active') and s.get('week1_xp') == 500, 'a new Sprint shows the 13th-month reward, not active yet')
# week 1
su("update public.lc106_sprint set xp_at = now() - interval '1 day' where user_id = '%s'" % U1)
s = q("public.lc106_progress(700)", U1)
ok(s.get('week1_new') and s.get('week1_done') and su("select count(*) from public.lc36_token_credits where pack = 'sprint_week1' and tokens = 14") == 1, 'week 1: 600 XP in the first days -> 14 bonus tokens, credited')
su("update public.lc106_sprint set xp_at = now() - interval '1 day' where user_id = '%s'" % U1)
s = q("public.lc106_progress(900)", U1)
ok(not s.get('week1_new') and su("select count(*) from public.lc36_token_credits") == 1, 'the week-1 tokens come once')
# the rating goal alone unlocks the reward
su("update public.lc59_links set last_rating = 1260 where user_id = '%s'" % U1)
s = q("public.lc106_progress(900)", U1)
ok(s.get('rating_done') and not s.get('xp_done') and s.get('reward_active') and s.get('reward_kind') == 'month', 'the rating target alone unlocks the 13th month')
r = su("select public._lc106_reward('A@x.be')")
ok(r and r.get('kind') == 'month', 'the stripe helper sees the month reward')
ok(su("select public._lc106_reward_pct('a@x.be')") == 0, 'month mode: no percentage for the old helper')
ok(str(q("public._lc106_reward('a@x.be')", U1)).startswith('ERR'), 'members cannot call the stripe helper')
# the deadline: 48 hours after the later of the Sprint end and the trial end
su("update public.lc106_sprint set ends_at = now() - interval '1 hour' where user_id = '%s'" % U1)
su("insert into public.lc73_trials values ('cs_1', 'a@x.be', now() + interval '2 days')")
until = su("select extract(epoch from public._lc106_until(s) - now())/3600 from public.lc106_sprint s where user_id = '%s'" % U1)
ok(95 < float(until) < 97, 'the deadline follows the trial end: 2 days + 48 hours (%s h)' % round(float(until), 1))
su("delete from public.lc73_trials")
su("update public.lc106_sprint set ends_at = now() - interval '49 hours' where user_id = '%s'" % U1)
ok(su("select public._lc106_reward('a@x.be')") is None, 'after 48 hours the reward is closed')
su("update public.lc106_sprint set ends_at = now() - interval '1 hour' where user_id = '%s'" % U1)
# a config change does not change what was promised
q("public.lc106_cfg_save('{\"reward\":\"pct\",\"pct\":30}'::jsonb)", OWN)
ok(su("select public._lc106_reward('a@x.be')").get('kind') == 'month', 'switching the config to pct keeps the promised month')
su("select public._lc106_used('a@x.be', 'cs_test')")
ok(su("select public._lc106_reward('a@x.be')") is None, 'used once')
# pct mode for a new Sprint
s = q("public.lc106_join(0, null)", U2)
su("update public.lc106_sprint set xp_at = now() - interval '1 day' where user_id = '%s'" % U2)
su("update public.lc59_links set last_rating = 1010 where user_id = '%s'" % U2)
s = q("public.lc106_progress(10)", U2)
ok(s.get('reward_kind') == 'pct' and s.get('pct') == 30 and su("select public._lc106_reward_pct('b@x.be')") == 30, 'pct mode still works for a new reward (30 %)')
ok(q("public.lc106_cfg_save('{\"reward_hours\":999,\"week1_xp\":5}'::jsonb)->'cfg'->>'reward_hours'", OWN) == 336, 'the owner limits stay sane (max 336 hours)')
ok(q("public.lc106_cfg_save('{\"reward\":\"month\"}'::jsonb)->'ok'", U1) is False, 'only the owner saves the settings')
print('\n%d passed, %d failed' % (P, F))
raise SystemExit(1 if F else 0)
