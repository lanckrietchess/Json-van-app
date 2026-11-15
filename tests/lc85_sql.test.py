#!/usr/bin/env python3
"""PostgreSQL test for sql/20261115120000_lc85_feature_feedback.sql: a member offers a message, nobody sees it until the owner approves it,
the feature's own messages come first, no e-mail or user id leaves the database, only the owner can list and approve, and the file runs twice.
Run: python3 tests/lc85_sql.test.py (needs a local PostgreSQL 16, like tests/lc59_sql.test.py)."""
import os, subprocess, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL = open(os.path.join(ROOT, 'sql', '20261115120000_lc85_feature_feedback.sql')).read()
SETUP = """
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('lc.uid', true),'')::uuid $$;
create or replace function public._lc_require_admin() returns void language plpgsql as $$ begin
  if lower(coalesce(current_setting('lc.email', true),'')) <> 'lanckrietchess@gmail.com' then raise exception 'not_admin' using errcode = '42501'; end if; end $$;
grant usage on schema public to anon, authenticated;
"""
def psql(args, text):
    return subprocess.run(['su', 'postgres', '-c', 'psql ' + args], input=text, capture_output=True, text=True)
subprocess.run(['pg_ctlcluster', '16', 'main', 'start'], capture_output=True)
psql('-q -c "drop database if exists lc85" -c "create database lc85"', '')
r = psql('-q -d lc85 -v ON_ERROR_STOP=1', SETUP); assert r.returncode == 0, r.stderr
r = psql('-q -d lc85 -v ON_ERROR_STOP=1', SQL); assert r.returncode == 0, r.stderr
r = psql('-q -d lc85 -v ON_ERROR_STOP=1', SQL); assert r.returncode == 0, 'second run: ' + r.stderr
P = 0; F = 0
def ok(c, m):
    global P, F
    P += c; F += (not c); print(('PASS ' if c else 'FAIL ') + m)
def q(sql, role='anon', email='', uid=''):
    pre = "set role %s; select set_config('lc.email','%s',false), set_config('lc.uid','%s',false);\n" % (role, email, uid)
    r = psql('-q -t -A -d lc85', pre + sql)
    lines = [l for l in r.stdout.strip().splitlines() if l.strip() and not l.startswith('lanck') and l != '|']
    return (lines[-1] if lines else ''), r.stderr
def j(sql, **k):
    out, err = q('select ' + sql + ';', **k)
    try: return json.loads(out)
    except Exception: return {'_err': err.strip()[:200], '_out': out}
ok(j("public.lc85_submit('openings','Opening trainer',5,'The tree finally makes sense','Anna')").get('ok') is True, 'anon can offer a 5-star message')
ok(j("public.lc85_submit('trim','Trim',4,'Found my real leak in one game',null)", role='authenticated', uid='11111111-1111-1111-1111-111111111111').get('ok') is True, 'a member can offer one too')
ok(j("public.lc85_submit('trim','Trim',3,'meh, fine','Bob')").get('error') == 'stars', 'under 4 stars is refused')
ok(j("public.lc85_submit('Bad Feature!','x',5,'great stuff',null)").get('error') == 'bad_feature', 'a bad feature id is refused')
ok(j("public.lc85_submit('trim','Trim',5,'hi',null)").get('error') == 'short', 'a too short text is refused')
ok(j("public.lc85_submit('openings','Opening trainer',5,'The tree finally makes sense','Anna')").get('dup') is True, 'the same text twice is kept once')
ok(j("public.lc85_submit('openings','x',5,'Name check <b>',' <script>Eve</script> ')").get('ok') is True, 'odd characters in the name are stripped')
ok(j("public.lc85_proof('openings')").get('rows') == [], 'nothing is public before the owner approves')
ok('_err' in j("public.lc85_admin_list()", role='authenticated', email='someone@example.com'), 'a normal member cannot list')
ok('_err' in j("public.lc85_admin_list()"), 'anon cannot list')
lst = j("public.lc85_admin_list()", role='authenticated', email='lanckrietchess@gmail.com')
rows = lst.get('rows') or []
ok(len(rows) == 3, 'the owner sees the 3 offered messages (got %d)' % len(rows))
ok(all('user_id' not in r and 'email' not in r for r in rows), 'no user id or e-mail in the owner list')
ok(all(r.get('who') is None or all(ch.isalpha() or ch in " .'-" for ch in r['who']) for r in rows), 'names keep only letters, spaces, dots, apostrophes and dashes')
ids = {r['feature'] + ':' + r['text'][:8]: r['id'] for r in rows}
ok('_err' in j("public.lc85_admin_set(%d, true)" % ids['openings:The tree'], role='authenticated', email='x@y.z'), 'a normal member cannot approve')
ok(j("public.lc85_admin_set(%d, true)" % ids['openings:The tree'], role='authenticated', email='lanckrietchess@gmail.com').get('ok') is True, 'the owner approves the opening message')
ok(j("public.lc85_admin_set(%d, true)" % ids['trim:Found my'], role='authenticated', email='lanckrietchess@gmail.com').get('ok') is True, 'the owner approves the Trim message')
pr = j("public.lc85_proof('trim')").get('rows') or []
ok(len(pr) == 2 and pr[0]['feature'] == 'trim' and pr[0]['same'] is True and pr[1]['same'] is False, 'the feature\'s own message comes first, the other after it')
ok(all(set(r.keys()) == {'feature', 'title', 'stars', 'text', 'who', 'same'} for r in pr), 'the public rows hold only feature, title, stars, text, name and same')
ok(j("public.lc85_admin_set(%d, false)" % ids['trim:Found my'], role='authenticated', email='lanckrietchess@gmail.com').get('ok') is True, 'the owner hides it again')
ok(len(j("public.lc85_proof('trim')").get('rows') or []) == 1, 'a hidden message is gone from the public list')
out, err = q('select count(*) from public.lc85_proof;')
ok('permission denied' in err, 'the table itself is closed to anon')
print('RESULT %d passed %d failed' % (P, F))
raise SystemExit(1 if F else 0)
