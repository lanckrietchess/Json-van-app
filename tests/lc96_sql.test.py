#!/usr/bin/env python3
"""PostgreSQL test for sql/20261118170000_lc96_mspc_learn.sql (the MSPC System page, 9.61.0), on top of the LC89 CMS and the LC95 tables.
The owner saves 'mspc' (and its history is kept), a member cannot, anyone reads it; 'landing' and 'paywall' still save; an unknown key is refused;
mg_examples sorts Kyenzo's positions into the six kinds of thinking, hardest first, without hidden ones; the file runs twice.
Run: python3 tests/lc96_sql.test.py (needs a local PostgreSQL 16)."""
import os, subprocess, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = lambda f: open(os.path.join(ROOT, 'sql', f)).read()
SQL89, SQL95, SQL96 = R('20261116100000_lc89_lc90_inline_cms_founding_paywall.sql'), R('20261118150000_lc95_master_games.sql'), R('20261118170000_lc96_mspc_learn.sql')
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
NET = """create schema if not exists net; create schema if not exists extensions;
create table if not exists net._http_response(id bigint primary key, status_code int, content text, error_msg text);
create or replace function net.http_get(url text, params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint language sql as $$ select 1::bigint $$;"""
def psql(args, text): return subprocess.run(['su', 'postgres', '-c', 'psql ' + args], input=text, capture_output=True, text=True)
subprocess.run(['pg_ctlcluster', '16', 'main', 'start'], capture_output=True)
psql('-q -c "drop database if exists lc96" -c "create database lc96"', '')
for name, sql in [('setup', SETUP), ('net', NET), ('lc89', SQL89), ('lc95', SQL95), ('lc96', SQL96), ('lc96 again', SQL96)]:
    r = psql('-q -d lc96 -v ON_ERROR_STOP=1', sql); assert r.returncode == 0, name + ': ' + r.stderr
P = 0; F = 0
def ok(c, m):
    global P, F
    P += c; F += (not c); print(('PASS ' if c else 'FAIL ') + m)
def run(sql, role='', uid=''):
    pre = ("set role %s; " % role if role else '') + "select set_config('test.uid','%s',false);\n" % uid
    return psql('-q -t -A -d lc96', pre + sql)
def val(sql, **k):
    r = run(sql, **k); lines = [l for l in r.stdout.strip().splitlines() if l.strip()]
    return (lines[-1] if lines else '') if not r.stderr.strip() else 'ERR ' + r.stderr.strip()[:200]
cfg = json.dumps({'intro': {'t': 'MSPC is how I went from 355 to 2105.'}, 'examples': [{'id': 'g1-10', 'cat': 'tactic', 'M': {'t': 'Their pawn left.'}}]})
ok(json.loads(val("select public.lc89_cfg_save('mspc', %s::jsonb);" % ("'" + cfg + "'"), role='authenticated', uid=OWNER)).get('ok') is True, 'the owner saves the MSPC page')
ok(val("select public.lc89_cfg_save('mspc', '{}'::jsonb);", role='authenticated', uid=MEMBER).startswith('ERR'), 'a member cannot save it')
ok(json.loads(val("select public.lc89_cfg_public('mspc');", role='anon'))['v']['intro']['t'] == 'MSPC is how I went from 355 to 2105.', 'anyone reads it')
ok(json.loads(val("select public.lc89_cfg_save('mspc', '{\"intro\":{\"t\":\"v2\"}}'::jsonb);", role='authenticated', uid=OWNER)).get('ok') is True and val("select count(*) from public.lc89_cfg_history where k = 'mspc';") == '1', 'a second save keeps the first in the history')
ok(json.loads(val("select public.lc89_cfg_save('other', '{}'::jsonb);", role='authenticated', uid=OWNER)).get('error') == 'key', 'an unknown key is refused')
ok(json.loads(val("select public.lc89_cfg_save('landing', '{}'::jsonb);", role='authenticated', uid=OWNER)).get('ok') is True, 'landing still saves')
ok(json.loads(val("""select public.lc89_cfg_save('mspc', '{"intro":{"t":"<script>x</script>"}}'::jsonb);""", role='authenticated', uid=OWNER)).get('error') == 'unsafe', 'a script in a text is refused')
rows = [("g1", "1700"), ("g2", "1200")]
val("insert into public.my_master_games(id, pgn, my_rating, time_class, color) values ('g1', '1. e4', 1700, 'blitz', 'w'), ('g2', '1. d4', 1200, 'rapid', 'b');")
P_ = [  # id, kind, phase, tags, eval_before, eval_after, gap, rating, hidden
 ('g1-10', 'great', 'middlegame', '{check}', 40, 300, 0.5, 1700, False), ('g1-12', 'punish', 'middlegame', '{capture}', 30, 400, 0.9, 1700, False),
 ('g1-14', 'brilliant', 'middlegame', '{sacrifice}', 50, 80, 0.4, 1700, False), ('g1-16', 'great', 'middlegame', '{}', 20, 60, 0.35, 1700, False),
 ('g1-18', 'great', 'middlegame', '{}', 100, 400, 0.6, 1700, False), ('g1-20', 'great', 'middlegame', '{}', -200, -20, 0.7, 1700, False),
 ('g1-22', 'great', 'endgame', '{}', 0, 0, 0.5, 1700, False), ('g2-10', 'great', 'middlegame', '{check}', 40, 300, 0.95, 1200, False),
 ('g1-24', 'great', 'middlegame', '{check}', 40, 300, 0.99, 1700, True), ('g1-26', 'blunder', 'middlegame', '{}', 40, -300, 0, 1700, False),
 ('g1-28', 'great', 'middlegame', '{check}', 9999, 10000, 1.9, 1700, False), ('g1-30', 'great', 'middlegame', '{}', 10, 20, 1.9, 1700, False)]
val("insert into public.master_puzzles(id, game_id, ply, kind, fen, side, phase, tags, eval_before, eval_after, gap, my_rating, solution, hidden) values " + ",".join(
  "('%s','%s',1,'%s','8/8/8/8/8/8/8/K6k w - - 0 1','w','%s','%s',%d,%d,%s,%d,'{e2e4}',%s)" % (i, i.split('-')[0], k, ph, tg, eb, ea, gp, rt, 'true' if hd else 'false') for i, k, ph, tg, eb, ea, gp, rt, hd in P_) + ";")
val("update public.master_puzzles set played_san = 'Kh1', played = 'g1h1' where id = 'g1-30';")
val("update public.master_puzzles set played = 'e4d5', prev = 'c6d5' where id = 'g1-12';")
got = val("select string_agg(cat || ':' || id, ',' order by cat, id) from public.mg_examples(8);", role='anon')
ok(got == 'brilliant:g1-14,defence:g1-20,endgame:g1-22,plan:g1-16,quiet:g1-18,tactic:g1-10,tactic:g2-10', 'six kinds; no hidden, no blunder, no mate already on the board, no recapture, no king step as a plan: ' + got)
first = val("select id from public.mg_examples(8) where cat = 'tactic' limit 1;", role='anon')
ok(first == 'g1-10', 'games at 1600+ first (g1-10 beats g2-10 although g2-10 has the bigger gap): ' + first)
ok(val("select count(*) from public.mg_examples(1);", role='anon') == '6', 'p_n is per kind')
print('%d passed, %d failed' % (P, F)); raise SystemExit(1 if F else 0)
