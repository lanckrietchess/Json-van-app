#!/usr/bin/env python3
"""PostgreSQL test for sql/20261107100000_lc59_milestones_proof.sql: milestones, the Catch-Up Bonus, message quality, one claim per level, the ranked Proof Queue and the owner approval. Needs a local PostgreSQL and root (it uses `su postgres`).
It builds stand-ins for auth.uid(), public._lc26_email(), lc36_email_consent / lc36_consent_set and lc36_token_credits from the repo's own SQL files.
Run: python3 tests/lc59_sql.test.py"""
import os, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
a = open(os.path.join(ROOT, 'sql', '20261028100000_lc36_netflix_data.sql')).read()
i = a.index('create table if not exists public.lc36_email_consent'); j = a.index('end $$;', a.index('create or replace function public.lc36_consent_set')) + 7
consent = a[i:j]
b = open(os.path.join(ROOT, 'sql', '20261028110000_lc36_commerce.sql')).read()
i = b.index('create table if not exists public.lc36_token_credits'); j = b.index('create index if not exists lc36_credits_open_ix'); j = b.index(';', j) + 1
credits = b[i:j]
SETUP = """
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('lc.uid', true),'')::uuid $$;
create or replace function public._lc26_email() returns text language sql stable as $$ select coalesce(lower(current_setting('lc.email', true)),'') $$;
""" + consent + "\n" + credits + "\ngrant usage on schema public to anon, authenticated, service_role;\n"
def psql(args, text):
    return subprocess.run(['su', 'postgres', '-c', 'psql ' + args], input=text, capture_output=True, text=True)
subprocess.run(['pg_ctlcluster', '16', 'main', 'start'], capture_output=True)
psql('-q -c "drop database if exists lc59" -c "create database lc59"', '')
r = psql('-q -d lc59 -v ON_ERROR_STOP=1', SETUP); assert r.returncode == 0, r.stderr

STUB = """create or replace function public._lc_require_admin() returns void language plpgsql as $$ begin if lower(coalesce(current_setting('lc.email', true),'')) <> 'lanckrietchess@gmail.com' then raise exception 'admin only'; end if; end $$;"""
r = psql('-q -d lc59 -v ON_ERROR_STOP=1', STUB); assert r.returncode == 0, r.stderr
MIG = os.path.join(ROOT, 'sql', '20261107100000_lc59_milestones_proof.sql')
for _ in range(2):
    r = psql('-q -d lc59 -v ON_ERROR_STOP=1 -f ' + MIG, ''); assert r.returncode == 0, r.stderr
import json, sys, uuid, concurrent.futures as cf
P = F = 0
def sql(stmts):
    r = subprocess.run(['su', 'postgres', '-c', 'psql -At -q -d lc59 -v ON_ERROR_STOP=0'], input="\n".join(stmts), capture_output=True, text=True); return (r.stdout + r.stderr).strip()
def call(email, uid, expr, role='authenticated'):
    out = sql([f"set role {role};", f"select set_config('lc.email','{email}',false);", f"select set_config('lc.uid','{uid}',false);", f"select {expr};"])
    lines = [l for l in out.splitlines() if l.startswith('{') or l.startswith('[') or 'ERROR' in l or 'denied' in l]
    return lines[-1] if lines else out
def J(s):
    try: return json.loads(s)
    except Exception: return {'_raw': s}
def ok(n, c, x=''):
    global P, F
    if c: P += 1; print('PASS', n)
    else: F += 1; print('FAIL', n, x)
sql(["truncate public.lc59_links, public.lc59_catchup, public.lc59_milestones, public.lc59_proof, public.lc36_token_credits restart identity;"])
A, B, C, D, E, Fu, G, H, I = [str(uuid.uuid4()) for _ in range(9)]
ADMIN = 'lanckrietchess@gmail.com'
def link(uid, email, site, uname, rating): return J(call(email, uid, f"public.lc59_link_record('{uid}','{email}','{site}','{uname}',{rating})", role='service_role'))
def credits(email=None, pack=None):
    w = ' where true' + (f" and email='{email}'" if email else '') + (f" and pack='{pack}'" if pack else '')
    return sql([f"select coalesce(sum(tokens),0)||'/'||count(*) from public.lc36_token_credits{w};"])
GOOD = 'After three weeks with the MSPC routine I stopped hanging pieces and my rating went up a lot.'
r = link(A, 'a@x.com', 'chesscom', 'PlayerA', 1437); ok('first verified link: start 1437, peak 1437, flagged first', r.get('ok') and r['first'] and r['start'] == 1437 and r['peak'] == 1437, r)
ok('Catch-Up Bonus: one token per hundred below the start (900 to 1400 = 6), filed once under the e-mail', r['catchup'] == 6 and credits('a@x.com', 'catchup') == '6/1', (r, credits('a@x.com')))
r = link(A, 'a@x.com', 'chesscom', 'playera', 1500); ok('a later read raises the peak, the start stays, NO second catch-up', r['start'] == 1437 and r['peak'] == 1500 and r['catchup'] == 0 and credits('a@x.com', 'catchup') == '6/1', r)
r = link(A, 'a@x.com', 'chesscom', 'playera', 1380); ok('a tilt-queue (rating falls to 1380) never lowers the peak: Peak Gain is the highest rise since joining', r['last'] == 1380 and r['peak'] == 1500, r)
link(A, 'a@x.com', 'chesscom', 'playera', 1500)
r = link(A, 'a@x.com', 'lichess', 'other', 1500); ok('one linked account per member', r.get('error') == 'already_linked', r)
r = link(B, 'b@x.com', 'chesscom', 'PLAYERA', 1000); ok('an account that belongs to another member cannot be linked (case-insensitive)', r.get('error') == 'account_taken', r)
r = link(B, 'b@x.com', 'chesscom', 'bad name!', 1000); ok('a bad user name is refused', r.get('error') == 'bad_input', r)
r = link(B, 'b@x.com', 'chesscom', 'playerB', 5000); ok('an impossible rating is refused', r.get('error') == 'bad_input', r)
r = link(B, 'b@x.com', 'chesscom', 'playerB', 1000); ok('start 1000 gives 2 catch-up tokens', r['catchup'] == 2, r)
link(B, 'b@x.com', 'chesscom', 'playerB', 1300)
r = link(C, 'c@x.com', 'lichess', 'playerC', 2300); ok('catch-up is capped at 10 tokens', r['catchup'] == 10, r)
r = link(D, 'd@x.com', 'lichess', 'playerD', 850); ok('below 900 there is nothing to catch up (no credit row)', r['catchup'] == 0 and credits('d@x.com') == '0/0', r)
r = J(call('a@x.com', A, 'public.lc59_status()')); ok('status: linked, peak gain 63, due [1500], catch-up 6', r['linked'] and r['peak_gain'] == 63 and r['due'] == [1500] and r['catchup'] == 6, r)
r = J(call('z@x.com', G, 'public.lc59_status()')); ok('status for a member with no linked account: linked false', r['ok'] and r['linked'] is False, r)
for lvl in (1400, 1600, 1550):
    r = J(call('a@x.com', A, f"public.lc59_milestone_claim({lvl}, false, null, null)")); ok(f'level {lvl}: not reached / not a milestone', r.get('error') == 'not_reached', r)
r = J(call('a@x.com', A, "public.lc59_milestone_claim(1500, false, null, null)")); ok('claim 1500 without the website: 1 token', r['ok'] and r['tokens'] == 1 and credits('a@x.com', 'milestone') == '1/1', r)
r = J(call('a@x.com', A, "public.lc59_milestone_claim(1500, true, 'Anna', null)")); ok('the same milestone cannot be claimed twice', r.get('error') == 'already_claimed' and credits('a@x.com', 'milestone') == '1/1', r)
# B: jumps 1000 -> 1300, allows proof, real message
r = J(call('b@x.com', B, f"public.lc59_milestone_claim(1300, true, 'Bob', '{GOOD}')")); ok('allowed + real message: 3 tokens, message ok, no easter egg', r['ok'] and r['tokens'] == 3 and r['message_ok'] and not r['nice_try'], r)
ok('the two lower milestones (1100, 1200) give 1 token each by themselves: 5 tokens in 3 credits', credits('b@x.com', 'milestone') == '5/3', credits('b@x.com'))
pr = sql(["select msg_status||'|'||allow_web||'|'||result_approved from public.lc59_proof where first_name='Bob';"]); ok('Bob\'s message waits for the owner (pending), result not approved yet', pr == 'pending|true|false', pr)
# C: junk messages -> easter egg, 2 tokens
JUNK = ["asdf asdf asdf asdf asdf asdf asdf", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "great great great great great great great", "check my page www.example.com for really great chess lessons", "12345 67890 12345 67890 12345 67890 123", "good app", "nice nice nice nice good good good app app app"]
bad = []
for j in JUNK:
    if sql([f"select public._lc59_msg_ok('{j}');"]) == 't': bad.append(j)
ok('message quality: junk, repeats, links, numbers and one-liners are NOT accepted', not bad, bad)
ok('message quality: a real sentence is accepted', sql([f"select public._lc59_msg_ok('{GOOD}');"]) == 't')
ok('message quality: the junk list really was tested (the function answers t / f, not an error)', sql(["select public._lc59_msg_ok('good app');"]) == 'f')
link(I, 'i@x.com', 'chesscom', 'playerI', 1000); link(I, 'i@x.com', 'chesscom', 'playerI', 1200)
r = J(call('i@x.com', I, "public.lc59_milestone_claim(1200, true, 'Ivo', 'asdf asdf asdf asdf asdf asdf asdf')")); ok('junk message: "Nice try" flag, still 2 tokens for allowing the proof', r['ok'] and r['tokens'] == 2 and r['nice_try'] and not r['message_ok'], r)
r = J(call('i@x.com', I, "public.lc59_message_upgrade(1200, 'asdf asdf asdf asdf asdf asdf asdf')")); ok('another junk try later: not valuable, easter egg again, no token', r.get('error') == 'not_valuable' and r.get('nice_try') is True, r)
before = credits('i@x.com', 'milestone')
r = J(call('i@x.com', I, f"public.lc59_message_upgrade(1200, '{GOOD}')")); after = credits('i@x.com', 'milestone'); ok('a real review later unlocks the 3rd token, once', r['ok'] and r['tokens'] == 1 and after != before, (r, before, after))
r = J(call('i@x.com', I, f"public.lc59_message_upgrade(1200, '{GOOD}')")); ok('and not a second time', r.get('error') == 'already_upgraded', r)
# D: allow without message = 2 tokens, no first name = refused and nothing written
link(E, 'e@x.com', 'chesscom', 'playerE', 1100); link(E, 'e@x.com', 'chesscom', 'playerE', 1200)
r = J(call('e@x.com', E, "public.lc59_milestone_claim(1200, true, '', null)")); n = sql(["select count(*) from public.lc59_milestones where email='e@x.com';"]); ok('allowing the website without a first name is refused and writes nothing', r.get('error') == 'first_name' and n == '0', (r, n))
r = J(call('e@x.com', E, "public.lc59_milestone_claim(1200, true, 'Eva', null)")); ok('allow without a message: exactly 2 tokens, no easter egg', r['ok'] and r['tokens'] == 2 and not r['nice_try'], r)
# atomic: no credit table
link(Fu, 'f@x.com', 'chesscom', 'playerF', 1100); link(Fu, 'f@x.com', 'chesscom', 'playerF', 1200)
sql(["alter table public.lc36_token_credits rename to lc36_token_credits_x;"]); r = J(call('f@x.com', Fu, "public.lc59_milestone_claim(1200, false, null, null)")); n = sql(["select count(*) from public.lc59_milestones where email='f@x.com';"])
ok('credit table missing: clear error and NO milestone is recorded', r.get('error') == 'credits_missing' and n == '0', (r, n)); sql(["alter table public.lc36_token_credits_x rename to lc36_token_credits;"])
# parallel claims
H2 = H; link(H2, 'h@x.com', 'chesscom', 'playerH', 1100); link(H2, 'h@x.com', 'chesscom', 'playerH', 1200)
with cf.ThreadPoolExecutor(8) as ex: res = list(ex.map(lambda _: call('h@x.com', H2, "public.lc59_milestone_claim(1200, false, null, null)"), range(8)))
wins = sum(1 for x in res if '"ok": true' in x or '"ok":true' in x); n = sql(["select count(*) from public.lc36_token_credits where email='h@x.com' and session_id like '%:1200';"])
ok('8 parallel claims of one level: exactly one wins, exactly one credit', wins == 1 and n == '1', (wins, n))
# the ranked wall
sql(["truncate public.lc59_proof;"])
def prow(uid, email, name, web, msg, mstat, rres): sql([f"insert into public.lc59_proof (user_id,email,first_name,allow_web,message,msg_status,result_approved) values ('{uid}','{email}','{name}',{web},{msg},'{mstat}',{rres});"])
sql([f"update public.lc59_links set start_rating=1000, peak_rating=1200 where user_id='{A}';", f"update public.lc59_links set start_rating=1000, peak_rating=1300 where user_id='{B}';", f"update public.lc59_links set start_rating=1500, peak_rating=1530 where user_id='{C}';",
     f"update public.lc59_links set start_rating=1000, peak_rating=1400 where user_id='{D}';", f"update public.lc59_links set start_rating=1000, peak_rating=1250 where user_id='{E}';", f"update public.lc59_links set start_rating=1000, peak_rating=1100 where user_id='{Fu}';"])
prow(A, 'a@x.com', 'Anna', 'true', "'Real praise from Anna about how the routine changed her games.'", 'approved', 'true')   # kind 1, gain 200
prow(B, 'b@x.com', 'Bob', 'true', 'null', 'none', 'true')                                                  # kind 2, gain 300 (higher gain, but kind 2)
prow(C, 'c@x.com', 'Cleo', 'true', "'Cleo says this is the best chess app she ever used, truly.'", 'approved', 'true')  # result approved but gain 30 < 50 -> kind 3
prow(D, 'd@x.com', 'Dan', 'false', "'Dan wrote a long and warm review but did not allow the website.'", 'approved', 'true')   # hidden: no consent
prow(E, 'e@x.com', 'Eva', 'true', "'Eva wrote a heartfelt message that the owner has not read yet.'", 'pending', 'false')    # hidden: nothing approved
prow(Fu, 'f@x.com', 'Finn', 'true', "'Finn loves the trainers and says so in a proper full sentence.'", 'approved', 'false')   # kind 3
w = J(call('anon', '00000000-0000-0000-0000-000000000000', 'public.lc59_wall_public()', role='anon')); rows = w.get('rows', [])
ok('landing queue: only approved + allowed rows are public (Dan, Eva hidden)', sorted(r['first_name'] for r in rows) == ['Anna', 'Bob', 'Cleo', 'Finn'], rows)
ok('ranking: 1) message + verified result, 2) result without message, 3) messages only', [r['kind'] for r in rows] == [1, 2, 3, 3] and rows[0]['first_name'] == 'Anna' and rows[1]['first_name'] == 'Bob', [(r['first_name'], r['kind']) for r in rows])
ok('kind 1 and 2 show start, PEAK and gain; kind 3 shows no numbers at all (nothing is claimed that was not checked)', rows[0]['peak'] == 1200 and rows[0]['gain'] == 200 and rows[1]['gain'] == 300 and rows[2]['start'] is None and rows[2]['gain'] is None, rows)
ok('no e-mail, user id or note ever leaves the wall function', 'email' not in json.dumps(w) and 'user_id' not in json.dumps(w) and '@' not in json.dumps(w), w)
# the owner
r = J(call('a@x.com', A, 'public.lc59_admin_queue()')); ok('a member cannot read the owner queue', 'admin only' in json.dumps(r) or r.get('_raw', '').count('ERROR'), r)
q = J(call(ADMIN, str(uuid.uuid4()), 'public.lc59_admin_queue()')); ok('the owner sees what to check: Chess.com / Lichess name, start, peak, message, status', q['ok'] and any(x['uname'] and x['start'] and x['peak'] and 'msg_status' in x for x in q['rows']), q)
r = J(call(ADMIN, str(uuid.uuid4()), f"public.lc59_admin_set('{E}', true, 'approved', 'checked on chess.com')")); w = J(call('anon', '00000000-0000-0000-0000-000000000000', 'public.lc59_wall_public()', role='anon'))
ok('approving Eva (star) puts her on the landing page in the right place', r['ok'] and any(x['first_name'] == 'Eva' and x['kind'] == 1 for x in w['rows']), w)
r = J(call(ADMIN, str(uuid.uuid4()), f"public.lc59_admin_set('{E}', null, 'rejected')")); w = J(call('anon', '00000000-0000-0000-0000-000000000000', 'public.lc59_wall_public()', role='anon'))
ok('rejecting a message takes it off the page but keeps the approved result (kind 2)', any(x['first_name'] == 'Eva' and x['kind'] == 2 and x['message'] is None for x in w['rows']), w)
r = J(call('a@x.com', A, f"public.lc59_admin_set('{A}', true, 'approved')")); ok('a member cannot approve their own proof', 'admin only' in json.dumps(r) or '_raw' in r, r)
r = J(call('a@x.com', A, 'public.lc59_proof_set(false)')); w = J(call('anon', '00000000-0000-0000-0000-000000000000', 'public.lc59_wall_public()', role='anon')); ok('a member can withdraw from the website at any time', not any(x['first_name'] == 'Anna' for x in w['rows']), w)
# permissions
x = sql(["set role authenticated;", "select count(*) from public.lc59_links;"]); ok('members cannot read the link table directly', 'denied' in x, x)
x = sql(["set role authenticated;", "select count(*) from public.lc59_proof;"]); ok('members cannot read the proof table directly', 'denied' in x, x)
x = sql(["set role anon;", "select public.lc59_status();"]); ok('visitors cannot call the member functions', 'denied' in x, x)
x = sql(["set role authenticated;", f"select public.lc59_link_record('{A}','a@x.com','chesscom','playerA',3000);"]); ok('a member cannot call lc59_link_record themselves (only the verified Edge Function can)', 'denied' in x, x)
print('\nRESULT', P, 'passed', F, 'failed'); sys.exit(1 if F else 0)
