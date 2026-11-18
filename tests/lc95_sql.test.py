#!/usr/bin/env python3
"""PostgreSQL test for sql/20261118150000_lc95_master_games.sql (Kyenzo's Games, 9.60.0).
pg_net is stubbed (net.http_get records the url, the test answers it). Checks: the pull asks only the fixed GitHub folder;
collect loads the index, then the games, then the puzzles (puzzles wait for their games file); a file name that is not
games-/puzzles-YYYY(-H).json is never asked; anon reads games and puzzles but cannot write them or call the loader;
a hidden puzzle is invisible; the filters (mg_puzzles, mg_openings, mg_tiers, mg_daily, mg_game) answer; only the owner
can sync or curate; a failed answer is marked failed; the file runs twice.
Run: python3 tests/lc95_sql.test.py (needs a local PostgreSQL 16)."""
import os, subprocess, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL = open(os.path.join(ROOT, 'sql', '20261118150000_lc95_master_games.sql')).read()
FX = os.path.join(ROOT, 'tests', 'fixtures', 'master_data')
OWNER = '11111111-1111-1111-1111-111111111111'; MEMBER = '22222222-2222-2222-2222-222222222222'
SETUP = """
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth; create schema if not exists net; create schema if not exists extensions;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create table if not exists public.admin_users(user_id uuid primary key);
insert into public.admin_users values ('%s') on conflict do nothing;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid()) $$;
create table if not exists net._req(id bigserial primary key, url text);
create table if not exists net._http_response(id bigint primary key, status_code int, content text, error_msg text);
create or replace function net.http_get(url text, params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
  returns bigint language sql as $$ insert into net._req(url) values (url) returning id $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid(), public.is_admin() to anon, authenticated;
""" % OWNER
def psql(args, text): return subprocess.run(['su', 'postgres', '-c', 'psql ' + args], input=text, capture_output=True, text=True)
subprocess.run(['pg_ctlcluster', '16', 'main', 'start'], capture_output=True)
psql('-q -c "drop database if exists lc95" -c "create database lc95"', '')
r = psql('-q -d lc95 -v ON_ERROR_STOP=1', SETUP); assert r.returncode == 0, r.stderr
r = psql('-q -d lc95 -v ON_ERROR_STOP=1', SQL); assert r.returncode == 0, r.stderr
r = psql('-q -d lc95 -v ON_ERROR_STOP=1', SQL); assert r.returncode == 0, 'second run: ' + r.stderr
P = 0; F = 0
def ok(c, m):
    global P, F
    P += c; F += (not c); print(('PASS ' if c else 'FAIL ') + m)
def run(sql, role='', uid=''):
    pre = ("set role %s; " % role if role else '') + "select set_config('test.uid','%s',false);\n" % uid
    return psql('-q -t -A -d lc95', pre + sql)
def val(sql, **k):
    r = run(sql, **k); lines = [l for l in r.stdout.strip().splitlines() if l.strip()]
    return (lines[-1] if lines else '') if not r.stderr.strip() else 'ERR ' + r.stderr.strip()[:200]
def q(s): return "'" + s.replace("'", "''") + "'"
def answer(name, status=200, body=None):
    """Answer every open request for a file with the fixture (or the given body)."""
    if body is None: body = open(os.path.join(FX, name)).read()
    val("insert into net._http_response(id, status_code, content) select id, %d, %s from net._req where url like %s "
        "and id not in (select id from net._http_response);" % (status, q(body), q('%/' + name + '?%')))

ok(val("select public.mg_pull()->>'ok';") == 'true', 'the owner (SQL) can pull')
ok(val("select count(*) from net._req where url like 'https://raw.githubusercontent.com/lanckrietchess/Json-van-app/master-data/master/data/index.json?t=%';") == '1', 'the pull asks the fixed GitHub folder for index.json')
ok(val("select public.mg_collect()->>'pending';") == '1', 'nothing arrived yet: the index stays pending')
answer('index.json')
r = val("select public.mg_collect();")
ok('"pending": 2' in r, 'the index queues the two real files: ' + r)
ok(val("select count(*) from net._req where url like '%evil%';") == '0', 'a file name outside the pattern is never asked')
answer('puzzles-2026-2.json')
val("select public.mg_collect();")
ok(val("select state from public.master_sync where file = 'puzzles-2026-2.json';") == 'pending', 'the puzzles wait for their games file')
answer('games-2026-2.json')
r = val("select public.mg_collect();")
games = json.load(open(os.path.join(FX, 'games-2026-2.json'))); puzz = json.load(open(os.path.join(FX, 'puzzles-2026-2.json')))
raw_puzz = len(puzz)
puzz = [p for p in puzz if not (p['kind'] in ('blunder', 'mistake', 'missed') and p['eval_after'] >= 170)]
ok(val("select count(*) from public.my_master_games;") == str(len(games)), 'every game is loaded')
r = val("select public.mg_collect();")
ok(val("select count(*) from public.master_puzzles;") == str(len(puzz)) and raw_puzz > len(puzz), 'every puzzle is loaded after its games, a mistake that still left +1.7 is not: ' + r)
ok(val("select count(*) from public.master_sync where state = 'loaded';") == '3', 'index, games and puzzles are marked loaded')
ok(val("select array_length(evals, 1) = plies + 1 from public.my_master_games limit 1;") == 't', 'the evaluations arrive as an int array')
ok(val("select count(*) from public.master_puzzles where array_length(solution,1) >= 1;") == str(len([p for p in puzz if p['solution']])), 'solutions arrive as text arrays')
val("select public.mg_collect();"); answer('games-2026-2.json')
ok(val("select count(*) from public.my_master_games;") == str(len(games)), 'a second load does not duplicate games')

ok(val("select count(*) from public.my_master_games;", role='anon') == str(len(games)), 'anon reads the games')
ok(val("select count(*) from public.master_puzzles;", role='anon') == str(len(puzz)), 'anon reads the puzzles')
ok(val("delete from public.master_puzzles;", role='anon').startswith('ERR'), 'anon cannot delete puzzles')
ok(val("update public.my_master_games set result = 'win';", role='anon').startswith('ERR'), 'anon cannot change games')
ok(val("select public.mg_pull();", role='anon').startswith('ERR'), 'anon cannot pull')
ok(val("select public.mg_collect();", role='authenticated', uid=MEMBER).startswith('ERR'), 'a member cannot run the loader')
ok(val("select count(*) from public.master_sync;", role='anon').startswith('ERR'), 'nobody reads the sync log through the API')
ok(json.loads(val("select public.mg_admin_sync('collect');", role='authenticated', uid=MEMBER))['reason'] == 'owner_only', 'mg_admin_sync is owner only')
ok(json.loads(val("select public.mg_admin_sync('collect');", role='authenticated', uid=OWNER)).get('ok') is True, 'the owner syncs from the app')

pid = val("select id from public.master_puzzles order by id limit 1;")
ok(json.loads(val("select public.mg_curate(%s, true, null);" % q(pid), role='authenticated', uid=MEMBER))['reason'] == 'owner_only', 'a member cannot hide a puzzle')
ok(json.loads(val("select public.mg_curate(%s, true, null);" % q(pid), role='authenticated', uid=OWNER))['ok'] is True, 'the owner hides a puzzle')
ok(val("select count(*) from public.master_puzzles;", role='anon') == str(len(puzz) - 1), 'a hidden puzzle is invisible to the app')
val("select public.mg_curate(%s, false, true);" % q(pid), role='authenticated', uid=OWNER)

kinds_m = [p for p in puzz if p['kind'] in ('blunder', 'mistake', 'missed')]
ok(val("select count(*) from public.mg_puzzles(array['blunder','mistake','missed'], null, null, null, 50);", role='anon') == str(len(kinds_m)), 'mg_puzzles filters on kind')
t = puzz[0]['tier']
ok(val("select count(*) from public.mg_puzzles(array['brilliant','great','punish','blunder','mistake','missed'], %s, null, null, 50);" % q(t), role='anon') == str(len([p for p in puzz if p['tier'] == t])), 'mg_puzzles filters on tier')
ok(val("select count(*) from public.mg_puzzles(array['brilliant','great','punish','blunder','mistake','missed'], null, null, 'B1', 50);", role='anon') == str(len(puzz)), 'mg_puzzles filters on an ECO prefix')
ok(val("select id from public.mg_puzzles(array['brilliant','great','punish','blunder','mistake','missed'], null, null, null, 1);", role='anon') == pid, 'a featured puzzle comes first')
ok(val("select count(*) <= 100 from public.mg_puzzles(array['blunder'], null, null, null, 1000);", role='anon') == 't' and val("select pg_get_functiondef('public.mg_puzzles(text[],text,text,text,int,int,text)'::regprocedure) like '%least(greatest(coalesce(p_limit, 20), 1), 100)%';") == 't', 'the limit is capped at 100')
o = val("select eco || '|' || games || '|' || score from public.mg_openings(null, 1) limit 1;", role='anon')
ok(o.startswith('B12|2|50'), 'mg_openings: B12, two games, 50 percent: ' + o)
ok(val("select count(*) from public.mg_tiers();", role='anon') == str(len(set(g['tier'] for g in games))), 'mg_tiers has one row per tier')
ok(val("select count(*) from public.mg_daily(3);", role='anon') == str(min(3, len([p for p in puzz if p['kind'] in ('brilliant','great','punish')]))), 'mg_daily gives the free taste')
ok(val("select (select string_agg(id, ',') from public.mg_daily(3, '2026-11-20')) = (select string_agg(id, ',') from public.mg_daily(3, '2026-11-20'));", role='anon') == 't', 'the daily set is the same for everyone that day')
ok(val("select result from public.mg_game(%s);" % q(games[0]['id']), role='anon') == games[0]['result'], 'mg_game returns one game')

val("select public.mg_pull();")
answer('index.json', status=404, body='Not Found')
val("select public.mg_collect();")
ok(val("select state from public.master_sync where file = 'index.json';") == 'failed', 'a 404 answer is marked failed')
ok(val("select count(*) from public.my_master_games;") == str(len(games)), 'a failed pull leaves the data alone')
print('%d passed, %d failed' % (P, F)); raise SystemExit(1 if F else 0)
