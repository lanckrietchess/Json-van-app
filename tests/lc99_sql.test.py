#!/usr/bin/env python3
"""PostgreSQL test for sql/20261122100000_lc99_withdrawal_consent_annual25.sql (LC99: the withdrawal-waiver log and "your EUR 25 counts").
On top of the LC97 SQL: an account without the one-time month cannot switch with a credit, an account that paid it can (during the month and
7 days after), the credit is what was really paid, it ends after 37 days, once used it is gone, an active subscription refuses it; the waiver
rows: the server writes them, a member can only add a Payment Link row for itself (flow, version, wording checked, 30 a day), nobody reads
the table directly, the owner reads it through the admin function; the file runs twice.
Run: python3 tests/lc99_sql.test.py (needs a local PostgreSQL 16)."""
import os, subprocess, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL97 = open(os.path.join(ROOT, 'sql', '20261119100000_lc97_trial_downsell.sql')).read()
SQL = open(os.path.join(ROOT, 'sql', '20261122100000_lc99_withdrawal_consent_annual25.sql')).read()
DB = 'lc99'
SETUP = """
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create or replace function public._lc26_email() returns text language sql stable as $$ select lower(coalesce(current_setting('test.email',true),'')) $$;
create or replace function public._lc_require_admin() returns void language plpgsql as $$ begin if coalesce(current_setting('test.admin',true),'0')<>'1' then raise exception 'not_admin'; end if; end $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid(), public._lc26_email(), public._lc_require_admin() to anon, authenticated;
create table public.licenses(id serial primary key, license_key text, email text, source text, tier smallint, lifetime boolean default false, expires_at timestamptz,
  flags jsonb default '{}'::jsonb, status text default 'active', revoked boolean default false);
create table public.lc73_trials (session_id text primary key, email text not null, subscription_id text, customer_id text, started_at timestamptz not null default now(),
  trial_end timestamptz not null, converted_at timestamptz, cancelled boolean not null default false, rescue_until timestamptz, rescue_used boolean not null default false, partner text);
"""
def psql(args, text): return subprocess.run(['su', 'postgres', '-c', 'psql ' + args], input=text, capture_output=True, text=True)
subprocess.run(['pg_ctlcluster', '16', 'main', 'start'], capture_output=True)
psql('-q -c "drop database if exists %s" -c "create database %s"' % (DB, DB), '')
for name, text in (('setup', SETUP), ('lc97', SQL97), ('lc99', SQL), ('lc99 again', SQL)):
    r = psql('-q -d %s -v ON_ERROR_STOP=1' % DB, text); assert r.returncode == 0, name + ': ' + r.stderr
P = 0; F = 0
def ok(c, m):
    global P, F
    P += c; F += (not c); print(('PASS ' if c else 'FAIL ') + m)
def pre(role, email, admin=False): return "set role %s; select set_config('test.email','%s',false), set_config('test.admin','%s',false);\n" % (role, email, '1' if admin else '0')
def j(sql, role='authenticated', email='', admin=False):
    r = psql('-q -t -A -d ' + DB, pre(role, email, admin) + 'select ' + sql + ';')
    lines = [l for l in r.stdout.strip().splitlines() if l.strip() and not l.startswith('|')]
    try: return json.loads(lines[-1])
    except Exception: return {'_err': (r.stderr.strip() or r.stdout.strip())[:300]}
def su(sql):
    r = psql('-q -t -A -d ' + DB, sql); return (r.stdout.strip().splitlines() or [''])[-1].strip(), r.stderr.strip()
def raw(sql, role='authenticated', email=''): return psql('-q -t -A -d ' + DB, pre(role, email) + sql)
A, B, C = 'anna@x.be', 'bert@x.be', 'carl@x.be'
aok = lambda e: su("select public._lc99_annual25_ok('%s');" % e)[0]
st = lambda e: j('public.lc99_state()', email=e)

# ---------- "your EUR 25 counts" ----------
ok(j('public.lc99_state()', email='').get('signed_in') is False, 'signed out: no state, no error')
ok(aok(A) == 'no_month' and st(A)['annual25']['status'] == 'no_month', 'no one-time month: no credit')
ok(aok('not-an-email') == 'sign_in', 'a bad e-mail is refused')
su("insert into public.lc73_trials(session_id,email,started_at,trial_end,cancelled) values ('cs_anna_1234567','%s',now()-interval '9 days',now()-interval '2 days',true);" % A)
su("insert into public.lc97_downsell(session_id,email,amount_cents,expires_at,status,paid_at) values ('cs_dl_anna_123','%s',2500,now(),'paid',now()-interval '3 days');" % A)
su("insert into public.licenses(license_key,email,tier,expires_at,flags) values ('LC-ANNA-D','%s',2,now()+interval '27 days','{\"plan\":\"downsell\",\"one_time\":true}');" % A)
s = st(A)['annual25']
ok(aok(A) == 'ok' and s['status'] == 'ok', 'during the paid month: the switch with a credit is open (the month licence itself does not block it)')
ok(s['credit_cents'] == 2500, 'the credit is what was paid: 2500 cents')
ok(s['until'] is not None, 'the app gets the last day of the offer')
su("insert into public.lc73_trials(session_id,email,started_at,trial_end,cancelled) values ('cs_bert_1234567','%s',now()-interval '50 days',now()-interval '43 days',true);" % B)
su("insert into public.lc97_downsell(session_id,email,amount_cents,expires_at,status,paid_at) values ('cs_dl_bert_123','%s',1999,now(),'paid',now()-interval '36 days');" % B)
ok(aok(B) == 'ok' and st(B)['annual25']['credit_cents'] == 1999, 'six days after the month ended: still open, the credit follows the price paid (1999)')
su("update public.lc97_downsell set paid_at = now()-interval '38 days' where email='%s';" % B)
ok(aok(B) == 'expired', 'after the month + 7 days: expired')
su("insert into public.licenses(license_key,email,tier,expires_at,flags) values ('LC-ANNA-Y','%s',2,now()+interval '365 days','{\"plan\":\"yearly\"}');" % A)
ok(aok(A) == 'already_member', 'an active yearly subscription: refused (already a member)')
su("delete from public.licenses where license_key='LC-ANNA-Y';")
su("select public._lc99_note('%s','annual25_paid','cs_year_anna_1');" % A)
ok(aok(A) == 'used' and st(A)['annual25']['status'] == 'used', 'after the webhook marked it paid: used, never twice')
ok(su("select annual25_session from public.lc97_member_state where email='%s';" % A)[0] == 'cs_year_anna_1', 'the yearly session is stored')
su("select public._lc99_note('%s','annual25_paid','cs_other_9999');" % A)
ok(su("select annual25_session from public.lc97_member_state where email='%s';" % A)[0] == 'cs_year_anna_1', 'a repeated webhook keeps the first session')
r = raw("select public._lc99_annual25_ok('%s');" % C, email=C)
ok('denied' in r.stderr, 'a member cannot call the internal check')
r = raw("select public._lc99_note('%s','annual25_paid','x');" % C, email=C)
ok('denied' in r.stderr, 'a member cannot mark the credit as used')

# ---------- the waiver log ----------
W = 'I want Pro to start right away. Because Pro starts at once, I give up my 14-day right of withdrawal.'
su("select public._lc99_consent('%s','downsell','w1','%s','cs_dl_anna_123','dev_abc');" % (A, W))
ok(su("select count(*) from public.lc99_consents where email='%s' and flow='downsell' and source='server' and session_id='cs_dl_anna_123';" % A)[0] == '1', 'the stripe function stores the waiver with the session and the exact wording')
out, err = su("select public._lc99_consent('%s','refund','w1','%s','','');" % (A, W))
ok('violates' in err, 'an unknown flow is refused by the table')
r = raw("select public._lc99_consent('%s','downsell','w1','x','','');" % C, email=C)
ok('denied' in r.stderr, 'a member cannot write a server row')
n = j("public.lc99_consent_note('yearly','w1','%s','dev_carl_1')" % W, email=C)
ok(n.get('ok') is True and su("select source||':'||flow||':'||email from public.lc99_consents where email='%s';" % C)[0] == 'app:yearly:' + C, 'a member logs its own Payment Link waiver (source app, its own e-mail)')
ok(j("public.lc99_consent_note('downsell','w1','%s','d')" % W, email=C).get('error') == 'flow', 'a member cannot log a server-checked flow')
ok(j("public.lc99_consent_note('yearly','w 1','%s','d')" % W, email=C).get('error') == 'version', 'the version is checked')
ok(j("public.lc99_consent_note('yearly','w1','short','d')" % (), email=C).get('error') == 'wording', 'the wording must be the real text')
ok(j("public.lc99_consent_note('yearly','w1','%s','d')" % W, email='').get('error') == 'sign_in', 'signed out: refused')
for i in range(30): j("public.lc99_consent_note('vip','w1','%s','d')" % W, email=B)
ok(j("public.lc99_consent_note('vip','w1','%s','d')" % W, email=B).get('error') == 'slow_down', 'at most 30 rows a day per account')
r = raw('select * from public.lc99_consents;', email=C)
ok('denied' in r.stderr, 'nobody reads the table directly')
ok('_err' in j("public.lc99_admin_consents('', 10)", email=C), 'a member cannot use the owner view')
a = j("public.lc99_admin_consents('%s', 10)" % A, email='lanckrietchess@gmail.com', admin=True)
ok(a.get('ok') is True and len(a['rows']) == 1 and a['rows'][0]['wording'] == W, 'the owner reads one account\'s waivers')
r = raw('select public.lc99_state();', role='anon')
ok('denied' in r.stderr, 'anon cannot call the member state')
print('\n%d passed, %d failed' % (P, F))
raise SystemExit(1 if F else 0)
