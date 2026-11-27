#!/usr/bin/env python3
"""PostgreSQL test for sql/20261127100000_lc109_short_link_fill.sql (LC109, 9.79.0): short links that fill in a player (ManyChat).
A click with a name keeps that name, site and rating per device and day (once, the second click of the same device updates it); a link
that does not fill in (or with fill-in off) keeps no name; a fixed-site link names its site; the old 2-argument call of l.html still works;
only the owner and the link's partner change the settings or see the people; anon cannot; the file runs twice.
Run: python3 tests/lc109_sql.test.py (needs a local PostgreSQL 16)."""
import os, subprocess, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL = open(os.path.join(ROOT, 'sql', '20261127100000_lc109_short_link_fill.sql')).read()
DB = 'lc109'
SETUP = r"""
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
grant usage on schema public to anon, authenticated;
create or replace function public._lc72_admin() returns boolean language sql stable as $$ select coalesce(current_setting('test.admin',true),'0')='1' $$;
create or replace function public._lc72_email() returns text language sql stable as $$ select lower(coalesce(current_setting('test.email',true),'')) $$;
create table public.lc73_links (code text primary key check (code ~ '^[a-z0-9-]{2,24}$'), platform text not null default 'other', label text not null default '',
  dest text not null default '/', partner_email text not null default '', active boolean not null default true, created_at timestamptz not null default now());
create table public.lc73_hits (id bigserial primary key, day date not null default current_date, kind text not null, code text not null default '',
  utm_source text not null default '', device text not null default '', created_at timestamptz not null default now());
create unique index lc73_hits_once on public.lc73_hits (device, kind, day, code) where device <> '';
create table public.lc73_partners (email text primary key, name text not null default '', codes text[] not null default '{}', created_at timestamptz not null default now());
create or replace function public.lc73_link_open(p_code text, p_device text) returns jsonb language plpgsql security definer set search_path = public as $$
begin return jsonb_build_object('ok', true, 'old', true); end $$;
grant execute on function public.lc73_link_open(text, text) to anon, authenticated;
grant execute on function public._lc72_admin(), public._lc72_email() to anon, authenticated;
insert into public.lc73_links(code, platform, label, partner_email) values ('igm', 'instagram', 'ManyChat IG', ''), ('fbm', 'facebook', 'ManyChat FB', 'p@x.be'), ('plain', 'x', 'X bio', '');
insert into public.lc73_partners(email, codes) values ('p@x.be', '{fbm}');
"""
def psql(args, text): return subprocess.run(['su', 'postgres', '-c', 'psql ' + args], input=text, capture_output=True, text=True)
subprocess.run(['pg_ctlcluster', '16', 'main', 'start'], capture_output=True)
psql('-q -c "drop database if exists %s" -c "create database %s"' % (DB, DB), '')
for name, text in (('setup', SETUP), ('lc109', SQL), ('lc109 again', SQL)):
    r = psql('-q -d %s -v ON_ERROR_STOP=1' % DB, text); assert r.returncode == 0, name + ': ' + r.stderr
P = 0; F = 0
def ok(c, m):
    global P, F
    c = bool(c); P += c; F += (not c); print(('PASS ' if c else 'FAIL ') + m)
def j(sql, role='authenticated', email='', admin=False):
    pre = "set role %s; select set_config('test.email','%s',false), set_config('test.admin','%s',false);\n" % (role, email, '1' if admin else '0')
    r = psql('-q -t -A -d ' + DB, pre + 'select ' + sql + ';')
    lines = [l for l in r.stdout.strip().splitlines() if l.strip() and not l.startswith('|')]
    try: return json.loads(lines[-1])
    except Exception: return {'_err': r.stderr.strip()[:300]}
def q(sql): return psql('-q -t -A -d ' + DB, sql + ';').stdout.strip()

# owner sets the fill-in
r = j("public.lc109_link_set('igm', '{\"fill\":\"either\",\"fill_on\":true,\"fill_elo\":true,\"fill_dest\":\"review\"}')", admin=True)
ok(r.get('ok') and r.get('fill') == 'either' and r.get('fill_elo'), 'the owner sets a link to fill in a Chess.com or Lichess name with a rating: %s' % r)
ok(j("public.lc109_link_set('igm', '{\"fill_on\":true}')", email='nobody@x.be').get('error') == 'forbidden', 'a member who is not the partner cannot change it')
ok('_err' in j("public.lc109_link_set('igm', '{}')", role='anon'), 'anon cannot call lc109_link_set')
ok(j("public.lc109_link_set('fbm', '{\"fill\":\"chesscom\",\"fill_on\":true}')", email='p@x.be').get('ok'), 'the partner of a link can set its fill-in')
ok(j("public.lc109_link_set('fbm', '{\"fill\":\"nonsense\"}')", admin=True).get('error') == 'invalid', 'an unknown fill kind is refused')

# clicks (anon, like l.html)
r = j("public.lc73_link_open('igm', 'w-dev1', 'MagnusCarlsen', 'chesscom', 2850)", role='anon')
ok(r.get('ok') and r.get('fill') == 'either' and r.get('fill_elo') and r.get('fill_dest') == 'review', 'a click returns the fill-in settings: %s' % r)
ok(q("select name||'|'||site||'|'||elo from public.lc73_hits where code='igm' and device='w-dev1'") == 'MagnusCarlsen|chesscom|2850', 'the click keeps the name, site and rating')
j("public.lc73_link_open('igm', 'w-dev1', 'MagnusCarlsen', 'lichess', null)", role='anon')
ok(q("select count(*)||'|'||max(site)||'|'||max(elo) from public.lc73_hits where code='igm' and device='w-dev1'") == '1|lichess|2850', 'a second call of the same device on the same day updates the row (the site the page found), no second click')
j("public.lc73_link_open('igm', 'w-dev2', '<script>', 'chesscom', 99999)", role='anon')
ok(q("select name||'|'||site||'|'||coalesce(elo::text,'-') from public.lc73_hits where code='igm' and device='w-dev2'") == '||-', 'a bad name and an impossible rating are not stored (the click still counts)')
j("public.lc73_link_open('fbm', 'w-dev3', 'hikaru', '', null)", role='anon')
ok(q("select site from public.lc73_hits where code='fbm' and device='w-dev3'") == 'chesscom', 'a Chess.com-only link names its site when the link did not say it')
j("public.lc73_link_open('plain', 'w-dev4', 'hikaru', 'chesscom', 2000)", role='anon')
ok(q("select name||'|'||coalesce(elo::text,'-') from public.lc73_hits where code='plain' and device='w-dev4'") == '|-', 'a link that does not fill in keeps no name')
r = j("public.lc73_link_open('plain', 'w-dev5')", role='anon')
ok(r.get('ok') and r.get('fill') == '' and not r.get('old'), 'the old 2-argument call of l.html still works and reaches the new function: %s' % r)
j("public.lc109_link_set('igm', '{\"fill_on\":false}')", admin=True)
j("public.lc73_link_open('igm', 'w-dev6', 'DingLiren', 'chesscom', null)", role='anon')
ok(q("select name from public.lc73_hits where code='igm' and device='w-dev6'") == '', 'with fill-in off the name is ignored')
j("public.lc109_link_set('igm', '{\"fill_on\":true}')", admin=True)

# the owner's views
r = j("public.lc109_links()", admin=True)
L = {x['code']: x for x in r.get('links', [])}
ok(r.get('ok') and L['igm']['named'] == 1 and L['igm']['fill_on'] and L['plain']['fill'] == '', 'lc109_links: settings and the number of people per link')
r = j("public.lc109_links()", email='p@x.be')
ok(r.get('ok') and [x['code'] for x in r['links']] == ['fbm'], 'a partner sees only their own links')
ok(j("public.lc109_links()", email='nobody@x.be').get('error') == 'forbidden', 'a member who is not a partner sees nothing')
r = j("public.lc109_people('igm', 365)", admin=True)
ok(r.get('ok') and len(r['rows']) == 1 and r['rows'][0]['name'] == 'MagnusCarlsen' and r['rows'][0]['site'] == 'lichess' and r['rows'][0]['elo'] == 2850, 'lc109_people: one row per name and site: %s' % r.get('rows'))
ok(j("public.lc109_people('igm', 365)", email='p@x.be').get('error') == 'forbidden', "a partner cannot see another link's people")
ok('_err' in j("public.lc109_people('igm', 365)", role='anon'), 'anon cannot read people')
j("public.lc109_link_set('plain', '{\"active\":false}')", admin=True)
ok(j("public.lc73_link_open('plain', 'w-dev7')", role='anon').get('ok') is False, 'a stopped link opens the landing page (ok false)')
ok(j("public.lc109_link_set('plain', '{\"active\":true}')", admin=True).get('active') is True, 'Start turns a stopped link back on')
print('RESULT', P, 'passed', F, 'failed')
