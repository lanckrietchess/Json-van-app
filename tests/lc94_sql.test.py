#!/usr/bin/env python3
"""PostgreSQL test for sql/20261118100000_lc94_funnel.sql (LC94 funnel, 9.58.0).
anon records a step once per device; an unknown step, a bad device id or 'paid' from the browser is ignored (no error); the source is cleaned;
nobody reads or writes the table directly; only the owner (public.is_admin()) reads the report; the service role can add 'paid'; the file runs twice.
Run: python3 tests/lc94_sql.test.py (needs a local PostgreSQL 16)."""
import os, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL = open(os.path.join(ROOT, 'sql', '20261118100000_lc94_funnel.sql')).read()
OWNER = '11111111-1111-1111-1111-111111111111'; MEMBER = '22222222-2222-2222-2222-222222222222'
SETUP = """
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create table if not exists public.admin_users(user_id uuid primary key);
insert into public.admin_users values ('%s') on conflict do nothing;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid()) $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid(), public.is_admin() to anon, authenticated;
""" % OWNER
def psql(args, text): return subprocess.run(['su', 'postgres', '-c', 'psql ' + args], input=text, capture_output=True, text=True)
subprocess.run(['pg_ctlcluster', '16', 'main', 'start'], capture_output=True)
psql('-q -c "drop database if exists lc94" -c "create database lc94"', '')
r = psql('-q -d lc94 -v ON_ERROR_STOP=1', SETUP); assert r.returncode == 0, r.stderr
r = psql('-q -d lc94 -v ON_ERROR_STOP=1', SQL); assert r.returncode == 0, r.stderr
r = psql('-q -d lc94 -v ON_ERROR_STOP=1', SQL); assert r.returncode == 0, 'second run: ' + r.stderr
P = 0; F = 0
def ok(c, m):
    global P, F
    P += c; F += (not c); print(('PASS ' if c else 'FAIL ') + m)
def run(sql, role='anon', uid=''):
    pre = ("set role %s; " % role if role else '') + "select set_config('test.uid','%s',false);\n" % uid
    return psql('-q -t -A -d lc94', pre + sql)
def val(sql, **k):
    r = run(sql, **k); lines = [l for l in r.stdout.strip().splitlines() if l.strip()]
    return (lines[-1] if lines else '') if not r.stderr.strip() else 'ERR ' + r.stderr.strip()[:160]
count = lambda where='true': val('select count(*) from public.lc94_funnel where %s;' % where, role='')

D1 = 'd-abc123def456gh'
ok(val("select public.lc94_step('%s','landing','MC_IG!');" % D1) == '', 'anon records a step')
ok(val("select public.lc94_step('%s','landing','yt');" % D1) == '', 'the same step again: no error')
ok(count("aid='%s'" % D1) == '1', 'the same step counts once per device')
ok(val("select src from public.lc94_funnel where aid='%s';" % D1, role='') == 'mc_ig', 'the source is cleaned (lower case, safe characters) and the first one stays')
ok(val("select public.lc94_step('%s','first_review_done',null);" % D1) == '' and count("aid='%s'" % D1) == '2', 'a second step for the same device')
ok(val("select public.lc94_step('%s','hacked',null);" % D1) == '' and count("step='hacked'") == '0', 'an unknown step: ignored, no error')
ok(val("select public.lc94_step('bad id!','landing',null);") == '' and count("aid='bad id!'") == '0', 'a bad device id: ignored')
ok(val("select public.lc94_step('%s','paid',null);" % D1) == '' and count("step='paid'") == '0', "'paid' from the browser: ignored")
ok(val("select public.lc94_step('%s','landing','%s');" % ('d-zzzzzzzzzzzz', 'x' * 200)) == '' and val("select length(src) from public.lc94_funnel where aid='d-zzzzzzzzzzzz';", role='') == '40', 'a long source is cut to 40')
ok(val('select count(*) from public.lc94_funnel;').startswith('ERR'), 'anon cannot read the table directly')
ok(run("insert into public.lc94_funnel(aid,step) values ('d-hhhhhhhhhhhh','paid');").stderr.strip() != '', 'anon cannot write the table directly')
ok(run("insert into public.lc94_funnel(aid,step) values ('d-hhhhhhhhhhhh','paid');", role='authenticated', uid=MEMBER).stderr.strip() != '', 'a member cannot write the table directly')
ok(run("insert into public.lc94_funnel(aid,step) values ('%s','paid') on conflict do nothing;" % D1, role='').stderr.strip() == '' and count("step='paid'") == '1', "the service role (the Stripe function) adds 'paid'")
ok(val('select count(*) from public.lc94_report(14);', role='authenticated', uid=MEMBER) == '0', 'a member gets an empty report')
ok(val('select count(*) from public.lc94_report(14);') .startswith('ERR'), 'anon cannot call the report')
rep = run('select step||\'|\'||src||\'|\'||players from public.lc94_report(14);', role='authenticated', uid=OWNER).stdout.split(); rep = [x for x in rep if '|' in x]
ok(rep[:1] == ['landing|mc_ig|1'] and 'paid|(none)|1' in rep, 'the owner gets the report, landing first, paid last: %s' % rep)
print('%d passed, %d failed' % (P, F)); raise SystemExit(1 if F else 0)
