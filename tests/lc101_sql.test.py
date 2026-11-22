#!/usr/bin/env python3
"""PostgreSQL test for sql/20261124100000_lc101_welcome_dm.sql (LC101, 9.66.0).
The coach chat (LC72's real "LC72.4" section is loaded from its own file) is open to every signed-in member; the welcome message goes out
once per account (never twice, never to the owner, {name} filled in, the owner can edit or switch it off); the withdrawal acknowledgement
lands in the signed-in member's chat (their statement + Kyenzo's acknowledgement, pinned on top of the owner's inbox, once), never for a
guest or an e-mail without an account, and members cannot call the internal function; the file runs twice.
Run: python3 tests/lc101_sql.test.py (needs a local PostgreSQL 16)."""
import os, re, subprocess, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda f: open(os.path.join(ROOT, 'sql', f)).read()
LC72 = rd('20261113100000_lc72_lc73_launch_funnels.sql')
CHAT = LC72[LC72.index('-- ============ LC72.4'):LC72.index('-- ============ LC72.5')]
SQL97, SQL99, SQL100 = rd('20261119100000_lc97_trial_downsell.sql'), rd('20261122100000_lc99_withdrawal_consent_annual25.sql'), rd('20261123100000_lc100_withdraw_games_community.sql')
SQL = rd('20261124100000_lc101_welcome_dm.sql')
DB = 'lc101'
U1, U2, OWN = '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000ff'
SETUP = """
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb, created_at timestamptz default now());
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
-- LC72's shared helpers, simplified (the real ones need LC70): no tiers, no buyers
create table public.lc72_cfg (k text primary key, v jsonb not null, updated_at timestamptz not null default now());
create or replace function public._lc72_getcfg(p_k text) returns jsonb language sql stable security definer set search_path = public as $$ select v from public.lc72_cfg where k = p_k $$;
create or replace function public._lc72_admin() returns boolean language plpgsql security definer set search_path = public as $$
begin perform public._lc_require_admin(); return true; exception when others then return false; end $$;
create or replace function public._lc72_email() returns text language plpgsql stable security definer set search_path = public as $$
begin return lower(coalesce(public._lc26_email(),'')); exception when others then return ''; end $$;
create or replace function public._lc72_uemail(p_uid uuid) returns text language sql stable security definer set search_path = public as $$
  select lower(coalesce((select email from auth.users where id = p_uid),'')) $$;
create or replace function public._lc72_owner_email() returns text language sql stable security definer set search_path = public as $$
  select lower(coalesce(public._lc72_getcfg('owner_email')#>>'{}','lanckrietchess@gmail.com')) $$;
create or replace function public._lc72_tier(p_email text) returns int language sql stable as $$ select 0 $$;
create or replace function public._lc72_buyer(p_email text) returns boolean language sql stable as $$ select false $$;
create or replace function public._lc72_code(p_email text) returns text language sql stable security definer set search_path = public as $$
  select case when p_email = public._lc72_owner_email() then 'C' else '' end $$;
create or replace function public._lc72_clean(p text, n int) returns text language sql immutable as $$
  select left(btrim(regexp_replace(coalesce(p,''), '[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f<>]', '', 'g')), n) $$;
"""
GRANTS = """
do $$ declare r record; begin
  for r in select p.oid::regprocedure sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname ~ '^_?lc72_' loop
    execute 'revoke all on function ' || r.sig || ' from public, anon, authenticated';
    if r.proname !~ '^_' then execute 'grant execute on function ' || r.sig || ' to authenticated'; end if;
  end loop;
end $$;
insert into auth.users(id,email,raw_user_meta_data) values ('%s','free@x.be','{}'), ('%s','paid@x.be','{}'), ('%s','lanckrietchess@gmail.com','{}');
""" % (U1, U2, OWN)
def psql(args, text): return subprocess.run(['su', 'postgres', '-c', 'psql ' + args], input=text, capture_output=True, text=True)
subprocess.run(['pg_ctlcluster', '16', 'main', 'start'], capture_output=True)
psql('-q -c "drop database if exists %s" -c "create database %s"' % (DB, DB), '')
for name, text in (('setup', SETUP), ('lc72 chat', CHAT), ('grants', GRANTS), ('lc97', SQL97), ('lc99', SQL99), ('lc100', SQL100), ('lc101', SQL), ('lc101 again', SQL)):
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
free = dict(email='free@x.be', uid=U1)

# ---------- 1. the chat is open to everyone signed in ----------
ok(j('public.lc72_me()', **free)['customer'] is True, 'a free member sees the chat (customer = true)')
g = j('public.lc72_chat_get()', **free)
ok(g['allowed'] is True and g['msgs'] == [], 'a free member may write, nothing there yet')
ok(j("public.lc72_chat_send('Hi Kyenzo, a question about my Caro-Kann','Free')", **free)['ok'], 'a free member sends a message (before 9.66.0: members_only)')
ok(su("select owner_unread||'/'||name from public.lc72_threads where user_id='%s';" % U1)[0] == '1/Free', 'it reaches the owner\'s inbox as unread')
ok(j("public.lc72_chat_send('x','')", uid='', email='')['error'] == 'sign_in', 'signed out: no chat')
for i in range(29): raw("select public.lc72_chat_send('m%d','');" % i, email='free@x.be', uid=U1)
ok(j("public.lc72_chat_send('one too many','')", **free)['error'] == 'slow_down', 'still at most 30 messages an hour')
inbox = j("public.lc72_inbox('all')", email='lanckrietchess@gmail.com', admin=True)
ok(any(r['uid'] == U1 for r in inbox['rows']), 'the owner sees the free member in his inbox')

# ---------- 2. the welcome message ----------
paid = dict(email='paid@x.be', uid=U2)
ok(su("select count(*) from public.lc72_auto where event='welcome' and enabled and body like 'Hi {name}, welcome!%';")[0] == '1', 'the welcome message is there, on, in Kyenzo\'s words')
r = j("public.lc101_welcome('Paula Peeters')", **paid)
ok(r['ok'] and r['sent'] is True, 'the first time signed in: sent')
m = su("select body||'|'||(cta->>'href') from public.lc72_msgs where user_id='%s' and kind='auto';" % U2)[0]
ok(m.startswith('Hi Paula Peeters, welcome!') and m.endswith('|#trim'), '{name} filled in, the button opens Trim')
ok(su("select member_unread||'/'||owner_unread||'/'||name from public.lc72_threads where user_id='%s';" % U2)[0] == '1/0/Paula Peeters', 'unread for the member (the app shows "Kyenzo sent you a message"), not for the owner')
r = j("public.lc101_welcome('Paula')", **paid)
ok(r['sent'] is False and r['why'] == 'done' and su("select count(*) from public.lc72_msgs where user_id='%s';" % U2)[0] == '1', 'never twice')
ok(j("public.lc101_welcome('')", email='lanckrietchess@gmail.com', uid=OWN)['why'] == 'owner', 'never to the owner')
ok(j("public.lc101_welcome('')", uid='', email='')['error'] == 'sign_in', 'signed out: nothing')
su("insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a3','noname@x.be');")
j("public.lc101_welcome('')", email='noname@x.be', uid='00000000-0000-0000-0000-0000000000a3')
ok(su("select body from public.lc72_msgs where user_id='00000000-0000-0000-0000-0000000000a3';")[0].startswith('Hi there, welcome!'), 'no name: "Hi there"')
ok(j("public.lc72_auto_set('welcome', '{\"enabled\":false,\"body\":\"Hey {name}!\",\"cta_label\":\"\",\"cta_href\":\"\"}'::jsonb)", email='lanckrietchess@gmail.com', admin=True)['ok'], 'the owner edits it (Automated messages)')
su("insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a4','later@x.be');")
ok(j("public.lc101_welcome('L')", email='later@x.be', uid='00000000-0000-0000-0000-0000000000a4')['why'] == 'off', 'switched off: not sent')
ok('lc101_welcome' in su("select string_agg(p.proname, ',') from pg_proc p where has_function_privilege('authenticated', p.oid, 'execute') and p.proname like 'lc101%';")[0]
   and su("select has_function_privilege('anon','public.lc101_welcome(text)','execute');")[0] == 'f', 'members may call it, guests may not')

# ---------- 3. the withdrawal acknowledgement in the chat ----------
wd = lambda e, acc: json.loads(su("select public._lc100_withdraw('%s','Paula','pro_monthly','','dev1','%s');" % (e, acc))[0])
w1 = wd('paid@x.be', 'paid@x.be')
ok(su("select public._lc101_withdraw_dm(%d, 'I withdraw from my contract for \"Pro, monthly\". Reference W%d.', 'We received your withdrawal. Reference: W%d');" % (w1['id'], w1['id'], w1['id']))[0] == 't', 'a signed-in member: delivered to the chat')
msgs = su("select string_agg((case when from_owner then 'K:' else 'M:' end)||kind||':'||left(body,30), ' | ' order by id) from public.lc72_msgs where user_id='%s' and id > (select min(id) from public.lc72_msgs where user_id='%s');" % (U2, U2))[0]
ok(msgs.startswith('M:chat:I withdraw from my contract') and 'K:auto:We received your withdrawal' in msgs, 'their statement, then Kyenzo\'s acknowledgement')
ok(su("select priority::text||'/'||(owner_unread>0)::text from public.lc72_threads where user_id='%s';" % U2)[0] == 'true/true', 'pinned on top of the owner\'s inbox, unread')
ok(su("select dm from public.lc100_withdrawals where id=%d;" % w1['id'])[0] == 't', 'noted on the statement (the owner list shows "in their chat")')
n0 = su("select count(*) from public.lc72_msgs where user_id='%s';" % U2)[0]
ok(su("select public._lc101_withdraw_dm(%d, 'again', 'again');" % w1['id'])[0] == 'f' and su("select count(*) from public.lc72_msgs where user_id='%s';" % U2)[0] == n0, 'only once per statement')
w2 = wd('guest@x.be', '')
ok(su("select public._lc101_withdraw_dm(%d, 's', 'a');" % w2['id'])[0] == 'f', 'a guest (not signed in): no chat, the download on screen')
w3 = wd('ghost@x.be', 'ghost@x.be')
ok(su("select public._lc101_withdraw_dm(%d, 's', 'a');" % w3['id'])[0] == 'f', 'an account e-mail without an account row: nothing')
ok('denied' in raw("select public._lc101_withdraw_dm(%d, 's', 'a');" % w1['id'], email='paid@x.be', uid=U2).stderr, 'a member cannot call the internal function')
ok(j("public.lc72_owner_send('%s', 'Refunded today.', null)" % U2, email='lanckrietchess@gmail.com', admin=True)['ok']
   and su("select priority from public.lc72_threads where user_id='%s';" % U2)[0] == 'f', 'the owner answers: the pin goes away')
ok(su("select count(*) from pg_proc where proname ~ '^(lc72|_lc72|lc101|_lc101)_' and prosrc ~* '(delete|update)\\s+(from\\s+)?public\\.lc72_msgs';")[0] == '0', 'no function edits or deletes a chat message (the member keeps an unchanged copy)')
print('\n%d passed, %d failed' % (P, F))
raise SystemExit(1 if F else 0)
