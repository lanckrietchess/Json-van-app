#!/usr/bin/env python3
"""PostgreSQL test for sql/20261106130000_lc57_welcome_bonus.sql: the bonus key works ONCE per account and once per e-mail, only after the
marketing box is ticked, and a failed credit never leaves a redemption behind. Needs a local PostgreSQL and root (it uses `su postgres`).
It builds stand-ins for auth.uid(), public._lc26_email(), lc36_email_consent / lc36_consent_set and lc36_token_credits from the repo's own SQL files.
Run: python3 tests/lc57_sql.test.py"""
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
psql('-q -c "drop database if exists lc57" -c "create database lc57"', '')
r = psql('-q -d lc57 -v ON_ERROR_STOP=1', SETUP); assert r.returncode == 0, r.stderr
MIG = os.path.join(ROOT, 'sql', '20261106130000_lc57_welcome_bonus.sql')
for _ in range(2):   # idempotent: the migration runs twice
    r = psql('-q -d lc57 -v ON_ERROR_STOP=1 -f ' + MIG, ''); assert r.returncode == 0, r.stderr
import json, sys, uuid
P=F=0
def sql(stmts,role=None):
    s="\n".join(stmts)
    r=subprocess.run(['su','postgres','-c',"psql -At -q -d lc57 -v ON_ERROR_STOP=0"],input=s,capture_output=True,text=True)
    return (r.stdout+r.stderr).strip()
def as_user(email,uid,call,role='authenticated'):
    out=sql([f"set role {role};", f"select set_config('lc.email','{email}',false), set_config('lc.uid','{uid}',false);".replace("select","select 1 from (select").replace(", set_config('lc.uid'", ", 1 as x, set_config('lc.uid'") if False else f"select set_config('lc.email','{email}',false);", f"select set_config('lc.uid','{uid}',false);", f"select {call};"])
    lines=[l for l in out.splitlines() if l.startswith('{') or 'ERROR' in l or 'denied' in l]
    return lines[-1] if lines else out
def ok(n,c,x=''):
    global P,F
    if c: P+=1; print('PASS',n)
    else: F+=1; print('FAIL',n,x)
A=str(uuid.uuid4());A2=str(uuid.uuid4());B=str(uuid.uuid4())
sql(["truncate public.lc57_bonus_redemptions, public.lc57_welcome_queue, public.lc36_email_consent, public.lc36_token_credits restart identity;","update public.lc57_bonus_keys set active=true;"])
j=lambda s:json.loads(s)
r=j(as_user('','','public.lc57_redeem(\'WELCOME-TOKEN-2026\')')); ok('not signed in: sign_in',r['error']=='sign_in',r)
r=j(as_user('a@x.com',A,"public.lc57_status()")); ok('status: nothing ticked, nothing used',r['ok'] and not r['consent'] and not r['redeemed'],r)
r=j(as_user('a@x.com',A,"public.lc57_welcome_start()")); ok('welcome mail refused before the box is ticked',r['error']=='consent',r)
r=j(as_user('a@x.com',A,"public.lc57_redeem('WELCOME-TOKEN-2026')")); ok('key refused before the box is ticked',r['error']=='consent',r)
r=j(as_user('a@x.com',A,"public.lc57_welcome_reveal()")); ok('key is not revealed before the box is ticked',r['error']=='consent',r)
r=j(as_user('a@x.com',A,"public.lc36_consent_set(true,'incentive')")); ok('box ticked (existing consent RPC)',r['ok'] and r['marketing'],r)
r=j(as_user('a@x.com',A,"public.lc57_welcome_start()")); ok('welcome mail queued once',r['ok'] and r.get('queued'),r)
r=j(as_user('a@x.com',A,"public.lc57_welcome_start()")); n=sql(["select count(*) from public.lc57_welcome_queue;"]); ok('asking again does not queue a second mail',r['ok'] and n=='1',(r,n))
r=j(as_user('a@x.com',A,"public.lc57_welcome_reveal()")); ok('fallback: the key is shown to a member who ticked the box',r['ok'] and r['key']=='WELCOME-TOKEN-2026',r)
r=j(as_user('a@x.com',A,"public.lc57_redeem('WRONG-KEY')")); ok('a wrong key is refused',r['error']=='invalid_key',r)
r=j(as_user('a@x.com',A,"public.lc57_redeem('  welcome-token-2026 ')")); ok('the right key works (case and spaces ignored): 1 token',r['ok'] and r['tokens']==1,r)
c=sql(["select count(*)||'|'||sum(tokens)||'|'||min(pack)||'|'||min(amount_cents)||'|'||coalesce(min(claimed_at)::text,'open') from public.lc36_token_credits;"]); ok('one open credit of 1 token (pack welcome) is filed under the e-mail',c=='1|1|welcome|0|open',c)
r=j(as_user('a@x.com',A,"public.lc57_redeem('WELCOME-TOKEN-2026')")); c=sql(["select count(*) from public.lc36_token_credits;"]); ok('the same account cannot use the key twice',r['error']=='already_redeemed' and c=='1',(r,c))
r=j(as_user('a@x.com',A2,"public.lc57_redeem('WELCOME-TOKEN-2026')")); c=sql(["select count(*) from public.lc36_token_credits;"]); ok('deleting and re-creating the account (new user id, same e-mail) gives no second token',r['error']=='already_redeemed' and c=='1',(r,c))
r=j(as_user('a@x.com',A2,"public.lc57_welcome_start()")); ok('and no new welcome mail either',r.get('already') is True,r)
r=j(as_user('a@x.com',A,"public.lc57_status()")); ok('status afterwards: redeemed',r['redeemed'] and r['queued'],r)
r=j(as_user('a@x.com',A,"public.lc36_consent_set(false,'account')")); r=j(as_user('a@x.com',A,"public.lc57_redeem('WELCOME-TOKEN-2026')")); c=sql(["select count(*) from public.lc36_token_credits;"]); ok('unsubscribing afterwards does not allow a second use',r['error']=='already_redeemed' and c=='1',(r,c))
r=j(as_user('b@x.com',B,"public.lc57_redeem('WELCOME-TOKEN-2026')")); ok('another member without the box ticked: refused',r['error']=='consent',r)
as_user('b@x.com',B,"public.lc36_consent_set(true,'incentive')"); r=j(as_user('b@x.com',B,"public.lc57_redeem('WELCOME-TOKEN-2026')")); c=sql(["select count(*) from public.lc36_token_credits;"]); ok('another member after ticking the box: gets their own token',r['ok'] and c=='2',(r,c))
sql(["update public.lc57_bonus_keys set active=false;"]); C=str(uuid.uuid4()); as_user('c@x.com',C,"public.lc36_consent_set(true,'x')"); r=j(as_user('c@x.com',C,"public.lc57_redeem('WELCOME-TOKEN-2026')")); ok('a switched-off key is refused',r['error']=='invalid_key',r); sql(["update public.lc57_bonus_keys set active=true;"])
sql(["alter table public.lc36_token_credits rename to lc36_token_credits_x;"]); r=j(as_user('c@x.com',C,"public.lc57_redeem('WELCOME-TOKEN-2026')")); n=sql(["select count(*) from public.lc57_bonus_redemptions where email='c@x.com';"]); ok('credit table missing: clear error and NO redemption is recorded',r['error']=='credits_missing' and n=='0',(r,n)); sql(["alter table public.lc36_token_credits_x rename to lc36_token_credits;"])
r=j(as_user('c@x.com',C,"public.lc57_redeem('WELCOME-TOKEN-2026')")); ok('after the table is back the redemption works (rolled back cleanly before)',r['ok'],r)
# 8 parallel attempts by the same member: exactly one wins
D=str(uuid.uuid4()); as_user('d@x.com',D,"public.lc36_consent_set(true,'x')")
import concurrent.futures as cf
with cf.ThreadPoolExecutor(8) as ex: res=list(ex.map(lambda _:as_user('d@x.com',D,"public.lc57_redeem('WELCOME-TOKEN-2026')"),range(8)))
wins=sum(1 for x in res if '"ok": true' in x or '"ok":true' in x); c=sql(["select count(*) from public.lc36_token_credits where email='d@x.com';"])
ok('8 parallel attempts: exactly one wins, exactly one credit',wins==1 and c=='1',(wins,c,res[:2]))
# permissions
x=sql(["set role authenticated;","select count(*) from public.lc57_bonus_keys;"]); ok('members cannot read the key table directly','denied' in x,x)
x=sql(["set role authenticated;","select count(*) from public.lc57_bonus_redemptions;"]); ok('members cannot read the redemptions directly','denied' in x,x)
x=sql(["set role anon;","select public.lc57_redeem('WELCOME-TOKEN-2026');"]); ok('anonymous visitors cannot call the redeem function','denied' in x,x)
print('\nRESULT',P,'passed',F,'failed'); sys.exit(1 if F else 0)
