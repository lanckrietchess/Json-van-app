-- LC98 (9.63.0, 21 Nov 2026): the landing page's Elo segment videos and the owner's traffic lanes (?src= links).
-- 1. lc89_cfg gets a fourth key, 'segvideo': the five Elo segments of the landing page's right-hand video player
--    (0 - 800, 800 - 1200, 1200 - 1600, 1600 - 2000, 2000+ Elo), each with its video address, the YouTube visibility the owner
--    notes for himself (public / unlisted / private) and whether the segment is live on the landing page. Written in the app by the
--    owner (lc89_cfg_save), read by everyone (lc89_cfg_public), 30 versions of history like 'landing', 'paywall' and 'mspc'.
-- 2. lc98_lanes: the owner's own traffic sources ("lanes", e.g. Facebook ads, a new ManyChat flow). A lane is a name plus a slug; the
--    landing page link is /?src=<slug>. The slug follows the rules both trackers already use (LC73 keeps [a-z0-9-] up to 24 characters,
--    LC94 keeps [a-z0-9_.-] up to 40), so it is [a-z0-9-], 2 to 24 characters: the same text arrives in lc73_attrib.code and lc94_funnel.src.
--    Only an admin reads or writes it (RLS has no policies; the functions check public.is_admin()).
-- Needs: sql/20261116100000_lc89_lc90_inline_cms_founding_paywall.sql, sql/20261118170000_lc96_mspc_learn.sql (the lc89_cfg_save below
-- replaces that version and keeps all of it). Runs twice safely.

alter table public.lc89_cfg drop constraint if exists lc89_cfg_k_check;
alter table public.lc89_cfg add constraint lc89_cfg_k_check check (k in ('landing', 'paywall', 'mspc', 'segvideo'));
alter table public.lc89_cfg_history drop constraint if exists lc89_cfg_history_k_check;
alter table public.lc89_cfg_history add constraint lc89_cfg_history_k_check check (k in ('landing', 'paywall', 'mspc', 'segvideo'));

-- the segment rules: only the five known segments, an https address (or empty), a known visibility, a short label
create or replace function public._lc98_segvideo_error(p jsonb) returns text language plpgsql immutable as $$
declare s text; v jsonb;
begin
  if p ? 'label' and (jsonb_typeof(p->'label') <> 'string' or char_length(p->>'label') > 80) then return 'label'; end if;
  if p ? 'def' and coalesce(p->>'def', '') not in ('', '0-800', '800-1200', '1200-1600', '1600-2000', '2000-plus') then return 'def'; end if;
  if not (p ? 'segs') then return ''; end if;
  if jsonb_typeof(p->'segs') <> 'object' then return 'segs'; end if;
  for s, v in select * from jsonb_each(p->'segs') loop
    if s not in ('0-800', '800-1200', '1200-1600', '1600-2000', '2000-plus') then return 'segment'; end if;
    if jsonb_typeof(v) <> 'object' then return 'segment'; end if;
    if coalesce(v->>'url', '') <> '' and ((v->>'url') !~ '^https://[^\s<>"'']{4,}$' or char_length(v->>'url') > 400) then return 'url'; end if;
    if coalesce(v->>'yt', '') not in ('', 'public', 'unlisted', 'private') then return 'visibility'; end if;
    if v ? 'live' and jsonb_typeof(v->'live') <> 'boolean' then return 'live'; end if;
    if coalesce((v->>'live')::boolean, false) and coalesce(v->>'url', '') = '' then return 'live_without_url'; end if;
  end loop;
  return '';
end $$;

create or replace function public.lc89_cfg_save(p_k text, p_v jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare old jsonb; err text;
begin
  perform public._lc_require_admin();
  if p_k not in ('landing', 'paywall', 'mspc', 'segvideo') then return jsonb_build_object('ok', false, 'error', 'key'); end if;
  if p_v is null or jsonb_typeof(p_v) <> 'object' then return jsonb_build_object('ok', false, 'error', 'shape'); end if;
  if octet_length(p_v::text) > 300000 then return jsonb_build_object('ok', false, 'error', 'too_big'); end if;
  if public._lc89_unsafe(p_v) then return jsonb_build_object('ok', false, 'error', 'unsafe'); end if;
  if p_k = 'paywall' then err := public._lc89_paywall_error(p_v); if err <> '' then return jsonb_build_object('ok', false, 'error', err); end if; end if;
  if p_k = 'segvideo' then err := public._lc98_segvideo_error(p_v); if err <> '' then return jsonb_build_object('ok', false, 'error', err); end if; end if;
  select v into old from public.lc89_cfg where k = p_k;
  if old is not null and old <> '{}'::jsonb then
    insert into public.lc89_cfg_history (k, v, saved_by) values (p_k, old, public._lc89_email());
    delete from public.lc89_cfg_history where k = p_k and id not in (select id from public.lc89_cfg_history where k = p_k order by id desc limit 30);
  end if;
  insert into public.lc89_cfg (k, v, updated_at, updated_by) values (p_k, p_v, now(), public._lc89_email())
    on conflict (k) do update set v = excluded.v, updated_at = now(), updated_by = excluded.updated_by;
  return jsonb_build_object('ok', true, 'updated_at', now());
end $$;

-- ---------- 2. lanes ----------
create table if not exists public.lc98_lanes (
  slug       text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{1,23}$'),
  name       text not null check (char_length(name) between 1 and 60),
  dest       text not null default 'landing' check (dest in ('landing', 'app', 'deeplink')),
  seg        text not null default '' check (seg in ('', '0-800', '800-1200', '1200-1600', '1600-2000', '2000-plus')),
  note       text not null default '' check (char_length(note) <= 200),
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  created_by text not null default ''
);
alter table public.lc98_lanes enable row level security;   -- no policies: only the functions below read or write it
revoke all on table public.lc98_lanes from public, anon, authenticated;

create or replace function public.lc98_lanes() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok', true, 'rows', coalesce((select jsonb_agg(jsonb_build_object('slug', l.slug, 'name', l.name, 'dest', l.dest, 'seg', l.seg,
    'note', l.note, 'active', l.active, 'created_at', l.created_at) order by l.active desc, l.created_at desc) from public.lc98_lanes l), '[]'::jsonb),
    'short_links', coalesce((select jsonb_agg(c.code order by c.code) from public.lc73_links c), '[]'::jsonb));
exception when undefined_table then
  return jsonb_build_object('ok', true, 'rows', coalesce((select jsonb_agg(jsonb_build_object('slug', l.slug, 'name', l.name, 'dest', l.dest, 'seg', l.seg,
    'note', l.note, 'active', l.active, 'created_at', l.created_at) order by l.active desc, l.created_at desc) from public.lc98_lanes l), '[]'::jsonb), 'short_links', '[]'::jsonb);
end $$;

-- create a lane, or (p.update = true) change the name / destination / segment / note / active state of an existing one; the slug never changes
create or replace function public.lc98_lane_save(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare s text := lower(btrim(coalesce(p->>'slug', ''))); n text := btrim(coalesce(p->>'name', '')); d text := coalesce(nullif(p->>'dest', ''), 'landing');
        g text := coalesce(p->>'seg', ''); nt text := btrim(coalesce(p->>'note', '')); upd boolean := coalesce((p->>'update')::boolean, false);
begin
  perform public._lc_require_admin();
  if s !~ '^[a-z0-9][a-z0-9-]{1,23}$' then return jsonb_build_object('ok', false, 'error', 'slug'); end if;
  if char_length(n) < 1 or char_length(n) > 60 then return jsonb_build_object('ok', false, 'error', 'name'); end if;
  if d not in ('landing', 'app', 'deeplink') then return jsonb_build_object('ok', false, 'error', 'dest'); end if;
  if g not in ('', '0-800', '800-1200', '1200-1600', '1600-2000', '2000-plus') then return jsonb_build_object('ok', false, 'error', 'seg'); end if;
  if char_length(nt) > 200 then return jsonb_build_object('ok', false, 'error', 'note'); end if;
  if public._lc89_unsafe(jsonb_build_object('n', n, 'nt', nt)) then return jsonb_build_object('ok', false, 'error', 'unsafe'); end if;
  if upd then
    update public.lc98_lanes set name = n, dest = d, seg = g, note = nt, active = coalesce((p->>'active')::boolean, active) where slug = s;
    if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  else
    if exists (select 1 from public.lc98_lanes where slug = s) then return jsonb_build_object('ok', false, 'error', 'taken'); end if;
    insert into public.lc98_lanes (slug, name, dest, seg, note, created_by) values (s, n, d, g, nt, public._lc89_email());
  end if;
  return jsonb_build_object('ok', true, 'slug', s);
end $$;

create or replace function public.lc98_lane_del(p_slug text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  delete from public.lc98_lanes where slug = lower(btrim(coalesce(p_slug, '')));
  return jsonb_build_object('ok', found);
end $$;

revoke all on function public._lc98_segvideo_error(jsonb), public.lc98_lanes(), public.lc98_lane_save(jsonb), public.lc98_lane_del(text) from public, anon;
grant execute on function public.lc98_lanes(), public.lc98_lane_save(jsonb), public.lc98_lane_del(text) to authenticated;
grant execute on function public.lc89_cfg_save(text, jsonb) to authenticated;

-- check after running:
--   select public._lc98_segvideo_error('{"segs":{"0-800":{"url":"https://youtu.be/abcdefghijk","yt":"unlisted","live":true}}}'::jsonb);  -- ''
--   select public._lc98_segvideo_error('{"segs":{"0-800":{"url":"","live":true}}}'::jsonb);                                            -- live_without_url
--   select public._lc98_segvideo_error('{"segs":{"3000":{}}}'::jsonb);                                                                  -- segment
