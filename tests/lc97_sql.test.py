#!/usr/bin/env python3
"""PostgreSQL test for sql/20261119100000_lc97_trial_downsell.sql (LC97: the trial lifecycle and the one-time post-trial downsell).
Walks one account through: fresh (trial eligible) -> trial running -> trial cancelled -> trial over (pop-up due) -> pop-up shown (offer open)
-> one checkout at a time (unique index) -> paid (offer locked for good). A second account dismisses the pop-up (offer gone), a third waits
too long (offer expired), a fourth converts (never offered). Also: RLS blocks direct reads/writes, internal functions are service-role only,
the owner tools need the admin, the token mirror validates its input, the file runs twice.
Run: python3 tests/lc97_sql.test.py (needs a local PostgreSQL 16)."""
import os, subprocess, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL = open(os.path.join(ROOT, 'sql', '20261119100000_lc97_trial_downsell.sql')).read()
DB = 'lc97'
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
insert into public.lc73_trials(session_id,email,started_at,trial_end) values ('cs_old_1234567','old@x.be',now()-interval '20 days',now()-interval '13 days');
"""
def psql(args, text): return subprocess.run(['su', 'postgres', '-c', 'psql ' + args], input=text, capture_output=True, text=True)
subprocess.run(['pg_ctlcluster', '16', 'main', 'start'], capture_output=True)
psql('-q -c "drop database if exists %s" -c "create database %s"' % (DB, DB), '')
r = psql('-q -d %s -v ON_ERROR_STOP=1' % DB, SETUP); assert r.returncode == 0, r.stderr
r = psql('-q -d %s -v ON_ERROR_STOP=1' % DB, SQL); assert r.returncode == 0, r.stderr
r = psql('-q -d %s -v ON_ERROR_STOP=1' % DB, SQL); assert r.returncode == 0, 'second run: ' + r.stderr
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
def su(sql):   # as the database owner (the stripe function / the webhook)
    r = psql('-q -t -A -d ' + DB, sql); return (r.stdout.strip().splitlines() or [''])[-1].strip(), r.stderr.strip()
def raw(sql, role='authenticated', email=''): return psql('-q -t -A -d ' + DB, pre(role, email) + sql)
A = 'anna@x.be'
st = lambda e=A: j('public.lc97_state()', email=e)
mark = lambda ev, e=A: j("public.lc97_mark('%s','dev_test_1')" % ev, email=e)
dok = lambda e=A: su("select public._lc97_downsell_ok('%s');" % e)[0]

# signed out / fresh
s = j('public.lc97_state()', email='')
ok(s.get('ok') is True and s.get('signed_in') is False, 'signed out: no state, no error')
s = st()
ok(s.get('sub_status') == 'free' and s.get('trial_eligible') is True, 'a fresh account is free and may start the trial')
ok(s['post_trial']['offer_open'] is False and s['post_trial']['popup_due'] is False, 'a fresh account gets no post-trial pop-up')
ok(mark('shown').get('error') == 'not_eligible', 'the pop-up cannot be marked shown before a trial ended')
ok(dok() == 'no_trial', 'the downsell checkout is refused without a trial')

# the trial starts (webhook: lc73_trials + licence)
su("insert into public.lc73_trials(session_id,email,trial_end) values ('cs_anna_1234567','%s',now()+interval '7 days'); insert into public.licenses(license_key,email,tier,expires_at,flags) values ('LC-ANNA-T','%s',2,now()+interval '10 days','{\"plan\":\"monthly\"}');" % (A, A))
s = st()
ok(s.get('sub_status') == 'trialing' and s['trial']['running'] is True and s['trial']['days_left'] == 7, 'trial running: trialing, 7 days left')
ok(s.get('trial_eligible') is False and s['trial']['used'] is True, 'trial used: no second trial')
ok(dok() == 'already_member', 'no downsell while the trial runs')
su("update public.lc73_trials set cancelled = true where email = '%s';" % A)
ok(st().get('sub_status') == 'trial_cancelled', 'cancelled during the trial: Pro until the trial ends (trial_cancelled)')
ok(st()['post_trial']['offer_open'] is False, 'no offer before the trial is over, even when cancelled')

# the trial is over (webhook shortened the licence to the trial end)
su("update public.lc73_trials set trial_end = now()-interval '1 hour' where email = '%s'; update public.licenses set expires_at = now()-interval '1 hour' where email = '%s';" % (A, A))
s = st()
ok(s.get('sub_status') == 'trial_ended' and s.get('active') is False, 'trial over, not converted: trial_ended, no access')
ok(s['post_trial']['popup_due'] is True and s['post_trial']['offer_open'] is True, 'the post-trial pop-up is due')
ok(dok() == 'not_offered', 'the discount cannot be bought before the pop-up was shown (it exists only in the pop-up)')
s = mark('shown')
ok(s.get('ok') is True and s['post_trial']['popup_due'] is False and s['post_trial']['offer_open'] is True, 'shown: no longer due (once per account), offer stays open')
ok(s['post_trial']['offer_until'] is not None, 'the offer has an end (one week after it was first shown)')
first = s['post_trial']['shown_at']
ok(mark('shown')['post_trial']['shown_at'] == first, 'showing it again keeps the first time (no endless loop, no new week)')
ok(dok() == 'ok', 'after the pop-up: the stripe function may open the one-time checkout')
ok(mark('discount')['post_trial']['choice'] == 'discount', 'tapping the discount records the choice but keeps the offer (checkout may be cancelled)')

# one checkout at a time
su("insert into public.lc97_downsell(session_id,email,amount_cents,expires_at,url) values ('cs_dl_A_123456','%s',2500,now()+interval '30 minutes','https://checkout.stripe.com/a');" % A)
out, err = su("insert into public.lc97_downsell(session_id,email,amount_cents,expires_at) values ('cs_dl_B_123456','%s',2500,now()+interval '30 minutes');" % A)
ok('duplicate key' in err, 'a second open checkout for the same account is refused by the database')
ok(st()['discount']['checkout_open'] is True, 'the state shows the open checkout')
su("update public.lc97_downsell set status='expired' where session_id='cs_dl_A_123456';")
out, err = su("insert into public.lc97_downsell(session_id,email,amount_cents,expires_at) values ('cs_dl_C_123456','%s',2500,now()+interval '30 minutes');" % A)
ok(err == '', 'after an expired checkout a new one may open')

# paid: the offer is locked for good
su("update public.lc97_downsell set status='paid', paid_at=now() where session_id='cs_dl_C_123456'; insert into public.licenses(license_key,email,tier,expires_at,flags) values ('LC-ANNA-D','%s',2,now()+interval '30 days','{\"plan\":\"downsell\"}'); select public._lc97_note('%s','downsell_paid','cs_dl_C_123456');" % (A, A))
s = st()
ok(s.get('sub_status') == 'downsell_month' and s.get('active') is True, 'paid: one month of Pro (downsell_month)')
ok(s['discount']['used'] is True and s['post_trial']['offer_open'] is False, 'one_time_discount_used is set and the offer is closed')
ok(dok() == 'used', 'a second discounted month is refused (used)')
out, err = su("insert into public.lc97_downsell(session_id,email,amount_cents,expires_at) values ('cs_dl_D_123456','%s',2500,now()+interval '30 minutes');" % A)
ok('duplicate key' in err, 'even a direct second row is refused while a paid one exists')
su("update public.licenses set expires_at = now()-interval '1 minute' where license_key='LC-ANNA-D';")
s = st()
ok(s['post_trial']['offer_open'] is False and dok() == 'used', 'after the month ends: still no second discount')
ok(mark('shown').get('error') == 'not_eligible', 'and the pop-up never comes back')

# Bert dismisses: Free
B = 'bert@x.be'
su("insert into public.lc73_trials(session_id,email,started_at,trial_end,cancelled) values ('cs_bert_1234567','%s',now()-interval '8 days',now()-interval '1 day',true);" % B)
ok(st(B)['post_trial']['popup_due'] is True, 'Bert: pop-up due after his trial')
s = mark('free', B)
ok(s['post_trial']['dismissed_at'] is not None and s['post_trial']['choice'] == 'free' and s['post_trial']['offer_open'] is False, 'Bert picks Free: dismissed, offer gone')
ok(dok(B) == 'dismissed', 'Bert cannot buy the discount after dismissing it')
ok(mark('shown', B).get('error') == 'not_eligible', 'Bert never sees the pop-up again')

# Carl waits too long
C = 'carl@x.be'
su("insert into public.lc73_trials(session_id,email,started_at,trial_end) values ('cs_carl_1234567','%s',now()-interval '20 days',now()-interval '13 days');" % C)
mark('shown', C)
su("update public.lc97_member_state set post_trial_popup_shown_at = now()-interval '8 days' where email='%s';" % C)
ok(dok(C) == 'offer_expired' and st(C)['post_trial']['offer_open'] is False, 'Carl: one week after the pop-up the offer expires')

# Dana converts
D = 'dana@x.be'
su("insert into public.lc73_trials(session_id,email,started_at,trial_end,converted_at) values ('cs_dana_1234567','%s',now()-interval '9 days',now()-interval '2 days',now()-interval '2 days'); insert into public.licenses(license_key,email,tier,expires_at,flags) values ('LC-DANA','%s',2,now()+interval '28 days','{\"plan\":\"monthly\"}');" % (D, D))
s = st(D)
ok(s.get('sub_status') == 'active' and s['post_trial']['offer_open'] is False and dok(D) == 'already_member', 'Dana converted: active, never offered the downsell')

# backfill on the second run
ok(su("select sub_status from public.lc97_member_state where email='old@x.be';")[0] == 'trial_ended', 'an old trial is backfilled by the migration')

# security
r = raw("select count(*) from public.lc97_member_state;", email=A)
ok('permission denied' in r.stderr, 'a member cannot read the table directly')
r = raw("update public.lc97_member_state set one_time_discount_used = false where email='%s';" % A, email=A)
ok('permission denied' in r.stderr, 'a member cannot reset the flag directly (the DevTools case)')
r = raw("delete from public.lc97_downsell;", email=A)
ok('permission denied' in r.stderr, 'a member cannot delete the downsell rows')
r = raw("select public._lc97_downsell_ok('%s');" % A, email=A)
ok('permission denied' in r.stderr, 'the internal checks are not callable by a member')
r = raw("select public._lc97_note('%s','downsell_paid','x');" % B, email=B)
ok('permission denied' in r.stderr, 'a member cannot mark a discount paid')
r = raw("select public.lc97_state();", role='anon', email='')
ok('permission denied' in r.stderr, 'anon cannot call the member functions')
ok('_err' in j("public.lc97_admin_reset('%s','discount')" % A, email=A), 'the reset needs the admin')
s = j("public.lc97_admin_reset('%s','discount')" % A, email='lanckrietchess@gmail.com', admin=True)
ok(s.get('ok') is True and s['discount']['used'] is False, 'the owner resets a TEST account\'s discount')
s = j("public.lc97_admin_reset('%s','all')" % B, email='lanckrietchess@gmail.com', admin=True)
ok(s.get('trial_eligible') is True and s.get('sub_status') == 'free', 'scope all: the test account may start a trial again')
rp = j('public.lc97_admin_report(30)', email='lanckrietchess@gmail.com', admin=True)
ok(rp.get('ok') is True and rp.get('popup_shown', 0) >= 1, 'the owner report counts the pop-up')
ok('_err' in j("public.lc97_admin_state('%s')" % A, email=A), 'another account\'s state needs the admin')

# token mirror
ok(j("public.lc97_sync_tokens('intro',3,now()+interval '3 days')", email=A).get('ok') is True, 'token mirror: the intro week (3 a day) is stored')
ok(st()['tokens']['per_day'] == 3 and st()['tokens']['phase'] == 'intro', 'token mirror: shown in the state')
ok(j("public.lc97_sync_tokens('god',999,null)", email=A).get('error') == 'bad_input', 'token mirror: an unknown phase is refused')
ok(j("public.lc97_sync_tokens('free',-1,null)", email=A).get('error') == 'bad_input', 'token mirror: a negative count is refused')

print('\n%d passed, %d failed' % (P, F))
raise SystemExit(1 if F else 0)
