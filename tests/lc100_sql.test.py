#!/usr/bin/env python3
"""PostgreSQL test for sql/20261123100000_lc100_withdraw_games_community.sql (LC100, 9.65.0).
The withdrawal statements (stored with date and time, checked, rate-limited, only the owner reads them, a member sees their own), the
consent log for Payment Links (members and guests, token packs), Kyenzo's Hall of Fame (brilliant / great / accuracy / upsets, no PGN, no
hidden positions), mg_by_ids keeps the order, mg_game_moves strips the PGN header (no opponent name), the student opt-in (paying members
only, both names checked, switching off always works and wipes the names, the owner list), the community auto-join (trigger on
auth.users, the backfill, no duplicates, a broken name never blocks a sign-up) and the file runs twice.
Run: python3 tests/lc100_sql.test.py (needs a local PostgreSQL 16)."""
import os, subprocess, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL97 = open(os.path.join(ROOT, 'sql', '20261119100000_lc97_trial_downsell.sql')).read()
SQL99 = open(os.path.join(ROOT, 'sql', '20261122100000_lc99_withdrawal_consent_annual25.sql')).read()
SQL = open(os.path.join(ROOT, 'sql', '20261123100000_lc100_withdraw_games_community.sql')).read()
DB = 'lc100'
SETUP = """
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create or replace function public._lc26_email() returns text language sql stable as $$ select lower(coalesce(current_setting('test.email',true),'')) $$;
create or replace function public._lc_require_admin() returns void language plpgsql as $$ begin if coalesce(current_setting('test.admin',true),'0')<>'1' then raise exception 'not_admin'; end if; end $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid(), public._lc26_email(), public._lc_require_admin() to anon, authenticated;
create table public.licenses(id serial primary key, license_key text, email text, source text, tier smallint, lifetime boolean default false, expires_at timestamptz,
  flags jsonb default '{}'::jsonb, status text default 'active', revoked boolean default false);
create table public.lc73_trials (session_id text primary key, email text not null, subscription_id text, customer_id text, started_at timestamptz not null default now(),
  trial_end timestamptz not null, converted_at timestamptz, cancelled boolean not null default false, rescue_until timestamptz, rescue_used boolean not null default false, partner text);
create table public.lc65_members(user_id uuid primary key, name text not null default 'Member', updated_at timestamptz not null default now());
create table public.my_master_games(id text primary key, url text, end_time timestamptz, time_class text, time_control text, color char(1), my_rating int, opp_rating int,
  tier text, result text, termination text, eco text, opening text, eco_url text, plies int, pgn text, evals int[], acc_me numeric, acc_opp numeric,
  chesscom_acc_me numeric, chesscom_acc_opp numeric, brilliant int, great int, blunder int, mistake int, inaccuracy int, opp_blunder int, analysis_v int, loaded_at timestamptz);
create table public.master_puzzles(id text primary key, game_id text, ply int, kind text, fen text, side char(1), played text, best text, solution text[], line text[],
  reply text[], prev text, prev_fen text, tier text, eco text, phase text, tags text[], featured boolean default false, hidden boolean default false, end_time timestamptz);
grant select on public.my_master_games, public.master_puzzles to anon, authenticated;
insert into auth.users values ('00000000-0000-0000-0000-000000000001','old@x.be','{"name":"Olaf Old"}');
insert into public.my_master_games(id,url,end_time,time_class,color,my_rating,opp_rating,tier,result,termination,eco,opening,plies,pgn,acc_me,acc_opp,brilliant,great,blunder,mistake) values
 ('g1','https://www.chess.com/game/live/g1',now(),'rapid','w',1500,1700,'1200-1599','win','resigned','C40','Kings Pawn',60,'[White "Lanckrietchess_YT"]\n[Black "SecretOpponent"]\n\n1. e4 {[%clk 0:09:58]} e5 2. Nf3 1-0',91.2,70,1,2,0,0),
 ('g2','https://www.chess.com/game/live/g2',now(),'blitz','b',1900,1950,'1600-1999','win','checkmated','B12','Caro-Kann',44,'[White "X"]\n\n1. e4 c6 0-1',97.5,80,0,1,0,0),
 ('g3','https://www.chess.com/game/live/g3',now(),'rapid','w',800,1300,'800-1199','win','resigned','D02','Colle',50,'1. d4 d5 1-0',80.1,60,0,0,1,1),
 ('g4','https://www.chess.com/game/live/g4',now(),'rapid','w',1000,900,'800-1199','loss','resigned','D02','Colle',50,'1. d4 d5 0-1',99.9,60,0,0,1,1);
insert into public.master_puzzles(id,game_id,kind,fen,side,played,best,solution,tier,phase,featured,hidden) values
 ('p1','g1','brilliant','8/8/8/8/8/8/8/K6k w - - 0 1','w','a1a2','a1a2','{a1a2}','1200-1599','middlegame',false,false),
 ('p2','g2','brilliant','8/8/8/8/8/8/8/K6k w - - 0 1','b','a1a2','a1a2','{a1a2}','1600-1999','endgame',false,false),
 ('p3','g1','brilliant','8/8/8/8/8/8/8/K6k w - - 0 1','w','a1a2','a1a2','{a1a2}','1200-1599','middlegame',false,true),
 ('p4','g3','great','8/8/8/8/8/8/8/K6k w - - 0 1','w','a1a2','a1a2','{a1a2}','800-1199','opening',true,false);
"""
def psql(args, text): return subprocess.run(['su', 'postgres', '-c', 'psql ' + args], input=text, capture_output=True, text=True)
subprocess.run(['pg_ctlcluster', '16', 'main', 'start'], capture_output=True)
psql('-q -c "drop database if exists %s" -c "create database %s"' % (DB, DB), '')
for name, text in (('setup', SETUP), ('lc97', SQL97), ('lc99', SQL99), ('lc100', SQL), ('lc100 again', SQL)):
    r = psql('-q -d %s -v ON_ERROR_STOP=1' % DB, text); assert r.returncode == 0, name + ': ' + r.stderr
P = 0; F = 0
def ok(c, m):
    global P, F
    c = bool(c); P += c; F += (not c); print(('PASS ' if c else 'FAIL ') + m)
def pre(role, email, admin=False, uid=''):
    return "set role %s; select set_config('test.email','%s',false), set_config('test.admin','%s',false), set_config('test.uid','%s',false);\n" % (role, email, '1' if admin else '0', uid)
def j(sql, role='authenticated', email='', admin=False, uid=''):
    r = psql('-q -t -A -d ' + DB, pre(role, email, admin, uid) + 'select ' + sql + ';')
    lines = [l for l in r.stdout.strip().splitlines() if l.strip() and not l.startswith('|')]
    try: return json.loads(lines[-1])
    except Exception: return {'_err': (r.stderr.strip() or r.stdout.strip())[:300]}
def su(sql):
    r = psql('-q -t -A -d ' + DB, sql); return (r.stdout.strip().splitlines() or [''])[-1].strip(), r.stderr.strip()
def raw(sql, role='authenticated', email='', uid=''): return psql('-q -t -A -d ' + DB, pre(role, email, False, uid) + sql)

# ---------- 1. withdrawals ----------
w = lambda e, n='Anna', c='pro_monthly', note='', d='dev1', acc='': json.loads(su("select public._lc100_withdraw('%s','%s','%s','%s','%s','%s');" % (e, n, c, note, d, acc))[0])
r = w('anna@x.be', 'Anna <b>Peeters</b>', 'pro_monthly', 'Please refund', 'dev1', 'anna@x.be')
ok(r['ok'] and r['id'] > 0 and r['at'], 'a statement is stored with its date and time')
ok('<' not in su("select name from public.lc100_withdrawals where id=%d;" % r['id'])[0], 'no HTML in the stored name')
ok(w('not-an-email')['reason'] == 'email', 'a bad e-mail is refused')
ok(w('b@x.be', n='  ')['reason'] == 'name', 'an empty name is refused')
ok(w('b@x.be', c='lifetime')['reason'] == 'contract', 'an unknown contract is refused')
for i in range(4): w('anna@x.be', d='dev%d' % (i + 2))
ok(w('anna@x.be', d='dev9')['reason'] == 'slow_down', 'at most 5 a day per e-mail')
ok('denied' in raw("select public._lc100_withdraw('c@x.be','C','tokens','','d','');", email='c@x.be').stderr, 'a member cannot call the internal store')
ok('denied' in raw("select * from public.lc100_withdrawals;", email='anna@x.be').stderr, 'nobody reads the table directly')
m = j('public.lc100_my_withdrawals()', email='anna@x.be')
ok(m['ok'] and len(m['rows']) == 5 and m['rows'][0]['contract'] == 'pro_monthly', 'the member sees their own statements')
ok(j('public.lc100_my_withdrawals()', email='')['error'] == 'sign_in', 'signed out: no list')
ok('not_admin' in str(j('public.lc100_admin_withdrawals(50)', email='anna@x.be')), 'only the owner reads every statement')
a = j('public.lc100_admin_withdrawals(50)', email='owner@x.be', admin=True)
ok(a['ok'] and len(a['rows']) == 5 and a['rows'][0]['refund_by'], 'the owner list has the refund deadline')
ok(j('public.lc100_admin_withdrawal_set(%d,\'refunded\',\'Stripe re_1\')' % r['id'], email='owner@x.be', admin=True)['ok'], 'the owner marks one refunded')
ok(su("select status||'|'||(handled_at is not null) from public.lc100_withdrawals where id=%d;" % r['id'])[0] == 'refunded|true', 'status and time are saved')
ok(j('public.lc100_admin_withdrawal_set(%d,\'gone\',\'\')' % r['id'], email='owner@x.be', admin=True)['error'] == 'status', 'an unknown status is refused')
su("select public._lc100_withdraw_mailed(%d);" % r['id'])
ok(su("select mailed from public.lc100_withdrawals where id=%d;" % r['id'])[0] == 't', 'the acknowledgement e-mail is noted')

# ---------- 2. consents before a Payment Link ----------
TXT = 'I ask for Pro to start right away. I can still withdraw within 14 days and then pay only for the days I used.'
c = lambda flow, email_arg, role='authenticated', sess='', d='dvc': j("public.lc100_consent_note('%s','w2-2026-11-23','%s','%s','%s')" % (flow, TXT, d, email_arg), role=role, email=sess)
ok(c('vip', '', sess='mem@x.be')['ok'], 'a member: VIP consent stored on the account')
ok(su("select source||'|'||email from public.lc99_consents where flow='vip' order by id desc limit 1;")[0] == 'app|mem@x.be', 'source app, the account e-mail')
ok(c('tokens', 'guest@x.be', role='anon')['ok'], 'a guest: a token-pack consent with the e-mail they typed')
ok(su("select source from public.lc99_consents where flow='tokens' order by id desc limit 1;")[0] == 'app_guest', 'source app_guest')
ok(c('tokens', 'other@x.be', sess='mem@x.be')['ok'] and su("select email from public.lc99_consents where flow='tokens' order by id desc limit 1;")[0] == 'mem@x.be', 'signed in: the typed e-mail never replaces the account')
ok(c('trial', 'guest@x.be', role='anon')['error'] == 'flow', 'the trial is not a Payment Link flow')
ok(c('yearly', 'nope', role='anon')['error'] == 'email', 'a guest without a valid e-mail is refused')
ok(j("public.lc100_consent_note('yearly','w2','short','d','g@x.be')", role='anon')['error'] == 'wording', 'the wording must be the real text')

# ---------- 3. the Hall of Fame ----------
g = j("public.mg_gems('brilliant',10)", role='anon')
ok([x['id'] for x in g] == ['p2', 'p1'], 'brilliant: the hidden one is left out, highest rating first')
ok(all('pgn' not in x for x in g) and g[0]['opening'] == 'Caro-Kann', 'with the game facts, without the PGN')
ok([x['id'] for x in j("public.mg_gems('featured',10)", role='anon')] == ['p4'], 'featured positions')
acc = j("public.mg_gems('accuracy',10)", role='anon')
ok([x['id'] for x in acc] == ['g2', 'g1', 'g3'] and all('pgn' not in x for x in acc), 'accuracy: wins only, best first, no PGN')
ok([x['id'] for x in j("public.mg_gems('upsets',10)", role='anon')][0] == 'g3', 'upsets: the biggest rating gap first (+500)')
ok(j("public.mg_gems('nonsense',10)", role='anon') == [], 'an unknown kind: an empty list')
ids = psql('-q -t -A -d ' + DB, pre('anon', '') + "select string_agg(id, ',') from public.mg_by_ids(array['p4','p3','p1']);").stdout.strip().splitlines()[-1]
ok(ids == 'p4,p1', 'mg_by_ids keeps the order asked and skips the hidden one')
mv = j("public.mg_game_moves('g1')", role='anon')
ok(mv['moves'].startswith('1. e4') and 'SecretOpponent' not in json.dumps(mv) and 'clk' not in mv['moves'], 'the moves without the header (no opponent name) and without clock comments')

# ---------- 4. the student opt-in ----------
OPT = 'Use my games from these accounts for Kyenzo\'s analysis and training material. I can stop at any time.'
setc = lambda e, on, cc='', li='': j("public.lc100_contrib_set(%s,'%s','%s','c1-2026-11-23','%s')" % ('true' if on else 'false', cc, li, OPT.replace("'", "''")), email=e)
ok(j('public.lc100_contrib_get()', email='free@x.be')['paying'] is False, 'a free account is not paying')
ok(setc('free@x.be', True, 'freeguy')['error'] == 'members_only', 'free players cannot opt in')
su("insert into public.licenses(license_key,email,tier,expires_at,flags) values ('LC-P','pay@x.be',2,now()+interval '300 days','{\"plan\":\"yearly\"}');")
ok(j('public.lc100_contrib_get()', email='pay@x.be')['paying'] is True, 'an active subscription is paying')
ok(setc('pay@x.be', True)['error'] == 'no_account', 'at least one account name is needed')
ok(setc('pay@x.be', True, 'bad name!')['error'] == 'chesscom', 'a bad Chess.com name is refused')
ok(setc('pay@x.be', True, 'Good_Name', 'lichessGuy')['ok'], 'a paying member opts in')
gg = j('public.lc100_contrib_get()', email='pay@x.be')
ok(gg['enabled'] and gg['chesscom'] == 'Good_Name' and gg['lichess'] == 'lichessGuy' and gg['opted_in_at'], 'the names and the date are stored')
su("insert into public.lc73_trials(session_id,email,started_at,trial_end) values ('cs_t_1234567','trial@x.be',now(),now()+interval '7 days');")
su("insert into public.licenses(license_key,email,tier,expires_at,flags) values ('LC-T','trial@x.be',2,now()+interval '7 days','{\"plan\":\"monthly\"}');")
ok(setc('trial@x.be', True, 'trialer')['error'] == 'members_only', 'a member still in the free trial cannot opt in')
ad = j('public.lc100_admin_contrib()', email='owner@x.be', admin=True)
ok(ad['ok'] and ad['rows'][0]['chesscom'] == 'Good_Name' and ad['rows'][0]['paying'], 'the owner list for ingestion')
ok('not_admin' in str(j('public.lc100_admin_contrib()', email='pay@x.be')), 'only the owner sees the list')
ok(j("public.lc100_admin_contrib_ingested('pay@x.be',true)", email='owner@x.be', admin=True)['ok'], 'the owner marks the games ingested')
ok(setc('pay@x.be', False)['ok'], 'switching off works')
gg = j('public.lc100_contrib_get()', email='pay@x.be')
ok(not gg['enabled'] and gg['chesscom'] == '' and gg['lichess'] == '' and gg['revoked_at'], 'switching off wipes the names and keeps the date')
su("delete from public.licenses where license_key='LC-P';")
ok(setc('pay@x.be', False)['ok'], 'an ex-member can always switch off')

# ---------- 5. the community ----------
ok(su("select name from public.lc65_members where user_id='00000000-0000-0000-0000-000000000001';")[0] == 'Olaf', 'the backfill: existing accounts joined, first name only')
su("insert into auth.users values ('00000000-0000-0000-0000-000000000002','new@x.be','{\"full_name\":\"Nina <script> New\"}');")
ok(su("select name from public.lc65_members where user_id='00000000-0000-0000-0000-000000000002';")[0] == 'Nina', 'a new account joins the main community at sign-up')
su("insert into auth.users values ('00000000-0000-0000-0000-000000000003','anon@x.be',null);")
ok(su("select name from public.lc65_members where user_id='00000000-0000-0000-0000-000000000003';")[0] == 'Member', 'no name: "Member"')
ok(su("select count(*) from public.lc65_members;")[0] == '3', 'one row per account')
jj = j("public.lc100_join_main('Again')", uid='00000000-0000-0000-0000-000000000002')
ok(jj['ok'] and su("select count(*)||name from public.lc65_members where user_id='00000000-0000-0000-0000-000000000002' group by name;")[0] == '1Nina', 'the app call twice: no duplicate, the name stays')
ok(j("public.lc100_join_main('X')", uid='')['error'] == 'sign_in', 'signed out: no join')
ok(j("public.lc100_join_main('Zed')", uid='00000000-0000-0000-0000-000000000009')['joined'] is True, 'an account made before the trigger joins from the app')
print('\n%d passed, %d failed' % (P, F))
raise SystemExit(1 if F else 0)
