#!/usr/bin/env python3
"""PostgreSQL test for sql/20261115140000_lc86_wall_people.sql: only the owner saves, lists and deletes; the public list holds only visible people
in the owner's order; items are rebuilt (only https screenshots and chat lines survive, at most 24); bad wording and bad avatars are refused;
the file runs twice. Run: python3 tests/lc86_sql.test.py (needs a local PostgreSQL 16)."""
import os, subprocess, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL = open(os.path.join(ROOT, 'sql', '20261115140000_lc86_wall_people.sql')).read()
SETUP = """
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create or replace function public._lc_require_admin() returns void language plpgsql as $$ begin
  if lower(coalesce(current_setting('lc.email', true),'')) <> 'lanckrietchess@gmail.com' then raise exception 'not_admin' using errcode = '42501'; end if; end $$;
grant usage on schema public to anon, authenticated;
"""
def psql(args, text): return subprocess.run(['su', 'postgres', '-c', 'psql ' + args], input=text, capture_output=True, text=True)
subprocess.run(['pg_ctlcluster', '16', 'main', 'start'], capture_output=True)
psql('-q -c "drop database if exists lc86" -c "create database lc86"', '')
r = psql('-q -d lc86 -v ON_ERROR_STOP=1', SETUP); assert r.returncode == 0, r.stderr
r = psql('-q -d lc86 -v ON_ERROR_STOP=1', SQL); assert r.returncode == 0, r.stderr
r = psql('-q -d lc86 -v ON_ERROR_STOP=1', SQL); assert r.returncode == 0, 'second run: ' + r.stderr
P = 0; F = 0
def ok(c, m):
    global P, F
    P += c; F += (not c); print(('PASS ' if c else 'FAIL ') + m)
def j(sql, role='anon', email=''):
    pre = "set role %s; select set_config('lc.email','%s',false);\n" % (role, email)
    r = psql('-q -t -A -d lc86', pre + 'select ' + sql + ';')
    lines = [l for l in r.stdout.strip().splitlines() if l.strip() and not l.startswith('lanck')]
    try: return json.loads(lines[-1])
    except Exception: return {'_err': r.stderr.strip()[:200]}
O = dict(role='authenticated', email='lanckrietchess@gmail.com')
def save(p, **k): return j("public.lc86_wall_save('%s'::jsonb)" % json.dumps(p).replace("'", "''"), **(k or O))
ok('_err' in save({'name': 'X'}, role='anon'), 'anon cannot save')
ok('_err' in save({'name': 'X'}, role='authenticated', email='a@b.c'), 'a member cannot save')
items = [{'t': 'img', 'url': 'https://x.supabase.co/a.webp', 'cap': 'one'}, {'t': 'img', 'url': 'javascript:alert(1)'}, {'t': 'msg', 'from': 'coach', 'text': 'Well <b>done</b>'},
         {'t': 'msg', 'from': 'hacker', 'text': 'hi'}, {'t': 'msg', 'text': '   '}, {'t': 'video', 'url': 'https://x'}, 'junk']
r1 = save({'name': 'Igor P.', 'tag': '+630 Elo in 6 weeks', 'items': items, 'sort': 10})
ok(r1.get('ok') is True and r1.get('id'), 'the owner saves a person')
r2 = save({'name': 'Mathijs', 'tag': 'Hit 1500 Elo', 'sort': 0})
r3 = save({'name': 'Hidden', 'visible': False, 'sort': 5})
ok(save({'name': ''}).get('error') == 'name', 'a name is required')
ok(save({'name': 'A', 'avatar': 'http://insecure.png'}).get('error') == 'avatar', 'the avatar must be https')
ok(save({'name': 'A', 'tag': 'Guaranteed 2000'}).get('error') == 'wording', 'no "guaranteed" in the tag')
ok(save({'name': 'A', 'items': [{'t': 'msg', 'text': 'x'}] * 40}).get('ok') is True, 'too many items are cut, not refused')
pub = j('public.lc86_wall_public()').get('rows') or []
ok([x['name'] for x in pub if x['name'] in ('Mathijs', 'Igor P.')] == ['Mathijs', 'Igor P.'] and 'Hidden' not in [x['name'] for x in pub], 'public: visible people in the owner\'s order')
igor = [x for x in pub if x['name'] == 'Igor P.'][0]
ok(igor['items'] == [{'t': 'img', 'url': 'https://x.supabase.co/a.webp', 'cap': 'one'}, {'t': 'msg', 'from': 'coach', 'text': 'Well bdone/b'}, {'t': 'msg', 'from': 'member', 'text': 'hi'}], 'items are rebuilt: bad links, unknown kinds and empty lines are dropped, angle brackets stripped')
ok(len([x for x in pub if x['name'] == 'A'][0]['items']) == 24, 'at most 24 items per person')
ok(set(igor.keys()) == {'id', 'name', 'tag', 'avatar', 'items'}, 'the public rows hold no dates or flags')
ok('_err' in j('public.lc86_wall_admin()'), 'anon cannot read the owner list')
adm = j('public.lc86_wall_admin()', **O).get('rows') or []
ok(any(x['name'] == 'Hidden' for x in adm), 'the owner list includes hidden people')
ok(save({'id': r2['id'], 'name': 'Mathijs', 'tag': 'Hit 1600 Elo', 'sort': 0}).get('ok') is True and [x for x in j('public.lc86_wall_public()').get('rows') if x['name'] == 'Mathijs'][0]['tag'] == 'Hit 1600 Elo', 'an edit changes the same row')
ok(save({'id': 999999, 'name': 'Ghost'}).get('error') == 'not_found', 'editing a missing id is refused')
ok('_err' in j('public.lc86_wall_del(%d)' % r3['id']), 'anon cannot delete')
ok(j('public.lc86_wall_del(%d)' % r3['id'], **O).get('ok') is True and not any(x['name'] == 'Hidden' for x in j('public.lc86_wall_admin()', **O).get('rows')), 'the owner deletes')
r = psql('-q -t -A -d lc86', "set role anon; select count(*) from public.lc86_wall_people;")
ok('permission denied' in r.stderr, 'the table itself is closed to anon')
print('RESULT %d passed %d failed' % (P, F)); raise SystemExit(1 if F else 0)
