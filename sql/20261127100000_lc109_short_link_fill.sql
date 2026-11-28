-- LC109 (9.79.0): short links that carry a Chess.com or Lichess username (ManyChat), and optionally a rating.
-- A link of LC73 (/l/<code>) can now be set to "fill in" a name: /l/<code>/c/<name> = a Chess.com username, /l/<code>/lc/<name> = a
-- Lichess username, /l/<code>/<name> = the site the link is set to (Either = l.html checks both sites), ?elo=<rating> optional.
-- ManyChat puts its custom field where <name> is. l.html then opens the review of that player's last lost game (fill_dest 'review')
-- or the landing page with the name filled in (fill_dest 'landing'), with ?src=<code> as before.
-- Every click with a name is kept per device and day (lc73_hits.name / site / elo), so the owner sees who came in through a link.
-- Runs twice without harm.

alter table public.lc73_links add column if not exists fill text not null default '';
alter table public.lc73_links add column if not exists fill_on boolean not null default false;
alter table public.lc73_links add column if not exists fill_elo boolean not null default false;
alter table public.lc73_links add column if not exists fill_dest text not null default 'review';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'lc73_links_fill_chk') then
    alter table public.lc73_links add constraint lc73_links_fill_chk check (fill in ('', 'chesscom', 'lichess', 'either') and fill_dest in ('review', 'landing'));
  end if;
end $$;

alter table public.lc73_hits add column if not exists name text not null default '';
alter table public.lc73_hits add column if not exists site text not null default '';
alter table public.lc73_hits add column if not exists elo int;
create index if not exists lc73_hits_named on public.lc73_hits (code, created_at desc) where name <> '';

-- the clean name of a link: 2-30 letters, digits, - and _ (Chess.com 3-25, Lichess 2-30)
create or replace function public._lc109_name(p text) returns text language sql immutable as $$
  select case when btrim(coalesce(p, '')) ~ '^[A-Za-z0-9_-]{2,30}$' then btrim(p) else '' end $$;

-- the click (anon, from l.html): counts the click as before and keeps the name when the link fills one in
drop function if exists public.lc73_link_open(text, text);
create or replace function public.lc73_link_open(p_code text, p_device text, p_name text default '', p_site text default '', p_elo int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.lc73_links; nm text := public._lc109_name(p_name); st text := case when p_site in ('chesscom', 'lichess') then p_site else '' end;
  el int := case when p_elo between 100 and 3500 then p_elo else null end; dv text := left(coalesce(p_device, ''), 40);
begin
  select * into l from public.lc73_links where code = lower(btrim(coalesce(p_code, ''))) and active;
  if not found then return jsonb_build_object('ok', false, 'dest', '/'); end if;
  if not l.fill_on then nm := ''; st := ''; el := null; end if;
  if not l.fill_elo then el := null; end if;
  if nm = '' then st := ''; end if;
  if l.fill in ('chesscom', 'lichess') and nm <> '' and st = '' then st := l.fill; end if;
  insert into public.lc73_hits(kind, code, device, name, site, elo) values ('click', l.code, dv, nm, st, el)
  on conflict (device, kind, day, code) where device <> '' do update
    set name = case when excluded.name <> '' then excluded.name else public.lc73_hits.name end,
        site = case when excluded.name <> '' then excluded.site else public.lc73_hits.site end,
        elo = coalesce(excluded.elo, public.lc73_hits.elo);
  return jsonb_build_object('ok', true, 'dest', l.dest, 'code', l.code, 'platform', l.platform,
    'fill', case when l.fill_on then l.fill else '' end, 'fill_elo', l.fill_on and l.fill_elo, 'fill_dest', l.fill_dest);
end $$;
grant execute on function public.lc73_link_open(text, text, text, text, int) to anon, authenticated;

-- may this person manage this link: the owner, or the partner whose link it is
create or replace function public._lc109_mine(p_code text) returns boolean language sql stable security definer set search_path = public as $$
  select public._lc72_admin() or exists (select 1 from public.lc73_links l where l.code = p_code and l.partner_email <> '' and l.partner_email = public._lc72_email()) $$;

-- the fill-in settings of a link (saved after lc73_link_save made or changed the link), and Start / Stop
create or replace function public.lc109_link_set(p_code text, p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare c text := lower(btrim(coalesce(p_code, ''))); l public.lc73_links;
begin
  if not public._lc109_mine(c) then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  select * into l from public.lc73_links where code = c;
  if not found then return jsonb_build_object('ok', false, 'error', 'missing'); end if;
  update public.lc73_links set
    fill = case when p ? 'fill' then coalesce(nullif(p->>'fill', ''), '') else fill end,
    fill_on = case when p ? 'fill_on' then coalesce((p->>'fill_on')::boolean, false) else fill_on end,
    fill_elo = case when p ? 'fill_elo' then coalesce((p->>'fill_elo')::boolean, false) else fill_elo end,
    fill_dest = case when p ? 'fill_dest' then coalesce(nullif(p->>'fill_dest', ''), 'review') else fill_dest end,
    active = case when p ? 'active' then coalesce((p->>'active')::boolean, true) else active end
  where code = c returning * into l;
  if l.fill = '' then update public.lc73_links set fill_on = false where code = c returning * into l; end if;
  return jsonb_build_object('ok', true, 'code', l.code, 'fill', l.fill, 'fill_on', l.fill_on, 'fill_elo', l.fill_elo, 'fill_dest', l.fill_dest, 'active', l.active);
exception when check_violation or invalid_text_representation then return jsonb_build_object('ok', false, 'error', 'invalid');
end $$;

-- the links this person manages, with their fill-in settings and the people that came in with a name
create or replace function public.lc109_links() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare adm boolean := public._lc72_admin(); em text := public._lc72_email();
begin
  if not adm and not exists (select 1 from public.lc73_partners where email = em) then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  return jsonb_build_object('ok', true, 'links', coalesce((select jsonb_agg(jsonb_build_object('code', l.code, 'platform', l.platform, 'label', l.label, 'dest', l.dest,
      'active', l.active, 'fill', l.fill, 'fill_on', l.fill_on, 'fill_elo', l.fill_elo, 'fill_dest', l.fill_dest,
      'named', (select count(distinct lower(h.name)) from public.lc73_hits h where h.code = l.code and h.kind = 'click' and h.name <> '')) order by l.created_at desc)
    from public.lc73_links l where adm or (l.partner_email <> '' and l.partner_email = em)), '[]'::jsonb));
end $$;

-- the people who came in through one link with a name: one row per name and site, newest first
create or replace function public.lc109_people(p_code text, p_days int default 365) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c text := lower(btrim(coalesce(p_code, '')));
begin
  if not public._lc109_mine(c) then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  return jsonb_build_object('ok', true, 'code', c, 'rows', coalesce((select jsonb_agg(r order by r->>'last' desc) from (
    select jsonb_build_object('name', min(h.name), 'site', h.site, 'clicks', count(*), 'elo', max(h.elo),
      'first', to_char(min(h.created_at) at time zone 'Europe/Brussels', 'YYYY-MM-DD HH24:MI'), 'last', to_char(max(h.created_at) at time zone 'Europe/Brussels', 'YYYY-MM-DD HH24:MI')) as r
    from public.lc73_hits h where h.code = c and h.kind = 'click' and h.name <> '' and h.created_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 365), 3650)))
    group by lower(h.name), h.site limit 2000) x), '[]'::jsonb));
end $$;

revoke all on function public.lc109_link_set(text, jsonb), public.lc109_links(), public.lc109_people(text, int), public._lc109_mine(text) from public, anon;
grant execute on function public.lc109_link_set(text, jsonb), public.lc109_links(), public.lc109_people(text, int) to authenticated;
