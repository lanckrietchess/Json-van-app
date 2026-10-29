-- LC36 Proof Queue (hub 9.14.0): rating snapshots, a configurable ELO threshold, the Proof Queue for the admin and for business partners,
-- profile inspection, and the starred "Verified Proof List". Idempotent. Not applied by the assistant.
-- Needs 20261028100000_lc36_netflix_data.sql first (lc36_usage_rollup, lc36_j, lc36_n).
--
-- Where the numbers come from (read from your live project on 2026-10-28):
--   * Members' chess usernames are NOT in the cloud (the Hub keeps them on the device) and lc7_members.elo is a single value without history.
--     So the app now reports a rating snapshot (site, username, rapid/blitz/bullet) at most once a day per site: lc36_rating_report.
--     The first snapshot after connecting is the baseline ("at join"). A snapshot is a LEAD SIGNAL: the app reports it, so it can be faked.
--     The proof itself is the public rating history of the account, which the admin screen loads straight from Chess.com / Lichess.
--   * A member's plan cannot be derived from the database (licence devices do not match member ids). The app proves its plan by presenting
--     its licence key: lc36_plan_link checks the key against public.licenses and stores free/pro/vip with the check time.
--   * Partners with kind = 'creator' see no queue (only the list of their own starred students). Every other approved partner sees the queue of
--     THEIR members (members attributed to their code) who made their profile public.

create table if not exists public.lc36_rating_snapshots (
  id        bigserial primary key,
  member_id uuid        not null references public.lc7_members (id) on delete cascade,
  site      text        not null check (site in ('chesscom', 'lichess')),
  uname     text        not null check (uname ~ '^[A-Za-z0-9_-]{2,30}$'),
  rapid     integer check (rapid  between 100 and 3500),
  blitz     integer check (blitz  between 100 and 3500),
  bullet    integer check (bullet between 100 and 3500),
  day       date        not null default (now() at time zone 'utc')::date,
  taken_at  timestamptz not null default now(),
  unique (member_id, site, day)
);
create index if not exists lc36_snap_member_ix on public.lc36_rating_snapshots (member_id, site, taken_at);
create table if not exists public.lc36_member_plan (
  member_id  uuid primary key references public.lc7_members (id) on delete cascade,
  plan       text        not null check (plan in ('pro', 'vip')),
  license_id uuid,
  source     text,
  checked_at timestamptz not null default now()
);
create table if not exists public.lc36_proof_stars (
  member_id  uuid primary key references public.lc7_members (id) on delete cascade,
  by_admin   boolean     not null default false,
  partner_id uuid,
  note       text,
  show_app   boolean     not null default false,   -- the OWNER switch: this starred student may be listed inside the app
  show_web   boolean     not null default false,   -- the OWNER switch: this starred student may be listed on the public landing page
  ref        text        not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),   -- public handle of the card (never the member id)
  starred_at timestamptz not null default now()
);
alter table public.lc36_proof_stars add column if not exists show_app boolean not null default false;
alter table public.lc36_proof_stars add column if not exists show_web boolean not null default false;
alter table public.lc36_proof_stars add column if not exists ref text not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
create unique index if not exists lc36_stars_ref_uq on public.lc36_proof_stars (ref);
-- The STUDENT's own switches (default off). A student appears in a list only when the owner switched that list on AND the student allowed it.
create table if not exists public.lc36_proof_consent (
  member_id  uuid primary key references public.lc7_members (id) on delete cascade,
  show_app   boolean     not null default false,
  show_web   boolean     not null default false,
  updated_at timestamptz not null default now()
);
alter table public.lc36_proof_consent enable row level security;
revoke all on public.lc36_proof_consent from anon, authenticated;
alter table public.lc36_rating_snapshots enable row level security;
alter table public.lc36_member_plan      enable row level security;
alter table public.lc36_proof_stars      enable row level security;
revoke all on public.lc36_rating_snapshots, public.lc36_member_plan, public.lc36_proof_stars from anon, authenticated;

-- 1. The app reports a rating (member auth, the same lc7_auth the rest of the Hub uses). One row per member, site and day.
create or replace function public.lc36_rating_report(p_id uuid, p_token text, p_site text, p_uname text, p_rapid integer, p_blitz integer, p_bullet integer) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if p_site not in ('chesscom', 'lichess') or coalesce(p_uname, '') !~ '^[A-Za-z0-9_-]{2,30}$' then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;
  if not (coalesce(p_rapid between 100 and 3500, false) or coalesce(p_blitz between 100 and 3500, false) or coalesce(p_bullet between 100 and 3500, false)) then return jsonb_build_object('ok', false, 'error', 'no_rating'); end if;
  if not public.lc7_rate_ok('lc36_rating', p_id::text, 8, interval '1 day') then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  insert into public.lc36_rating_snapshots (member_id, site, uname, rapid, blitz, bullet)
  values (p_id, p_site, p_uname, case when p_rapid between 100 and 3500 then p_rapid end, case when p_blitz between 100 and 3500 then p_blitz end, case when p_bullet between 100 and 3500 then p_bullet end)
  on conflict (member_id, site, day) do update set uname = excluded.uname, rapid = excluded.rapid, blitz = excluded.blitz, bullet = excluded.bullet, taken_at = now();
  return jsonb_build_object('ok', true);
exception when check_violation then return jsonb_build_object('ok', false, 'error', 'bad_input');
end $$;

-- 2. The app proves its plan with its licence key. Only an active, not revoked licence counts. VIP = the licence flag vip (set by the Stripe webhook).
create or replace function public.lc36_plan_link(p_id uuid, p_token text, p_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare lic public.licenses; v_plan text;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if coalesce(p_key, '') !~* '^LC-[A-Za-z0-9_-]{2,200}$' then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;
  if not public.lc7_rate_ok('lc36_plan', p_id::text, 12, interval '1 day') then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  select * into lic from public.licenses where upper(license_key) = upper(p_key) and status = 'active' and coalesce(revoked, false) = false
     and (coalesce(lifetime, false) or coalesce(is_lifetime, false) or expires_at > now()) and tier >= 2 limit 1;
  if not found then delete from public.lc36_member_plan where member_id = p_id; return jsonb_build_object('ok', true, 'plan', 'free'); end if;
  v_plan := case when lic.flags ->> 'vip' = 'true' then 'vip' else 'pro' end;
  insert into public.lc36_member_plan (member_id, plan, license_id, source, checked_at) values (p_id, v_plan, lic.id, lic.source, now())
  on conflict (member_id) do update set plan = excluded.plan, license_id = excluded.license_id, source = excluded.source, checked_at = now();
  return jsonb_build_object('ok', true, 'plan', v_plan);
end $$;

-- 3. The configurable threshold (stored in lc7_cfg like the rest of your numbers). Default: +50 rating in 30 days.
create or replace function public.lc36_proof_cfg() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('min_gain', public.lc7_cfg_num('proof_min_gain', 50)::int, 'days', public.lc7_cfg_num('proof_days', 30)::int) $$;
revoke all on function public.lc36_proof_cfg() from public, anon, authenticated;
create or replace function public.lc36_admin_proof_config(p_min_gain integer, p_days integer) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  if p_min_gain is null or p_days is null or p_min_gain not between 1 and 2000 or p_days not between 1 and 365 then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;
  insert into public.lc7_cfg (k, v, note) values ('proof_min_gain', to_jsonb(p_min_gain), 'Proof Queue: minimum rating gain') on conflict (k) do update set v = excluded.v;
  insert into public.lc7_cfg (k, v, note) values ('proof_days', to_jsonb(p_days), 'Proof Queue: window in days') on conflict (k) do update set v = excluded.v;
  return jsonb_build_object('ok', true, 'config', public.lc36_proof_cfg());
end $$;

-- 4. The card list. One builder for queue and list. Rating of a snapshot = rapid, else blitz, else bullet.
--    baseline = the last snapshot at or before (now - days), else the first snapshot ever (a member who joined inside the window).
create or replace function public.lc36_proof_build(p_partner uuid, p_min_gain integer, p_days integer, p_starred boolean, p_public_only boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  with cand as (
    select m.id, m.name, m.created_at, m.attr_partner_id, m.public_profile,
           (select s.site from public.lc36_rating_snapshots s where s.member_id = m.id order by s.taken_at desc limit 1) as site
      from public.lc7_members m
     where not m.banned and not coalesce(m.is_owner, false)
       and (p_partner is null or m.attr_partner_id = p_partner)
       and (not p_public_only or m.public_profile)
       and (not p_starred or exists (select 1 from public.lc36_proof_stars x where x.member_id = m.id))),
  r as (
    select c.*,
      (select to_jsonb(l) from (select s.uname, coalesce(s.rapid, s.blitz, s.bullet) as rating, s.taken_at as at from public.lc36_rating_snapshots s where s.member_id = c.id and s.site = c.site order by s.taken_at desc limit 1) l) as latest,
      coalesce(
        (select to_jsonb(b) from (select coalesce(s.rapid, s.blitz, s.bullet) as rating, s.taken_at as at from public.lc36_rating_snapshots s where s.member_id = c.id and s.site = c.site and s.taken_at <= now() - make_interval(days => p_days) order by s.taken_at desc limit 1) b),
        (select to_jsonb(b) from (select coalesce(s.rapid, s.blitz, s.bullet) as rating, s.taken_at as at from public.lc36_rating_snapshots s where s.member_id = c.id and s.site = c.site order by s.taken_at asc limit 1) b)) as baseline
      from cand c where c.site is not null),
  g as (select r.*, (latest ->> 'rating')::int - (baseline ->> 'rating')::int as gain from r where latest is not null and baseline is not null)
  select coalesce(jsonb_agg(jsonb_build_object(
      'member_id', g.id, 'name', g.name, 'joined_at', g.created_at, 'site', g.site, 'uname', g.latest ->> 'uname',
      'baseline', g.baseline, 'latest', g.latest, 'gain', g.gain,
      'span_days', greatest(0, ((g.latest ->> 'at')::timestamptz::date - (g.baseline ->> 'at')::timestamptz::date)),
      'plan', coalesce((select pl.plan from public.lc36_member_plan pl where pl.member_id = g.id), 'free'),
      'plan_checked_at', (select pl.checked_at from public.lc36_member_plan pl where pl.member_id = g.id),
      'starred', exists (select 1 from public.lc36_proof_stars x where x.member_id = g.id),
      'note', (select x.note from public.lc36_proof_stars x where x.member_id = g.id),
      'show_app', coalesce((select x.show_app from public.lc36_proof_stars x where x.member_id = g.id), false),
      'show_web', coalesce((select x.show_web from public.lc36_proof_stars x where x.member_id = g.id), false),
      'consent_app', coalesce((select c.show_app from public.lc36_proof_consent c where c.member_id = g.id), false),
      'consent_web', coalesce((select c.show_web from public.lc36_proof_consent c where c.member_id = g.id), false),
      'public_profile', g.public_profile) order by g.gain desc, g.created_at), '[]'::jsonb)
    from g where p_starred or g.gain >= p_min_gain
$$;
revoke all on function public.lc36_proof_build(uuid, integer, integer, boolean, boolean) from public, anon, authenticated;

create or replace function public.lc36_admin_proof_queue() returns jsonb language plpgsql security definer set search_path = public as $$
declare c jsonb := public.lc36_proof_cfg();
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok', true, 'config', c, 'rows', public.lc36_proof_build(null, (c ->> 'min_gain')::int, (c ->> 'days')::int, false, false));
end $$;
create or replace function public.lc36_admin_proof_list() returns jsonb language plpgsql security definer set search_path = public as $$
declare c jsonb := public.lc36_proof_cfg();
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok', true, 'config', c, 'rows', public.lc36_proof_build(null, 0, (c ->> 'days')::int, true, false));
end $$;
-- partners: queue only for kind <> 'creator'; list for every approved partner; public profiles only
create or replace function public.lc36_partner_of(p_id uuid, p_token text) returns public.lc7_partners language plpgsql stable security definer set search_path = public as $$
declare p public.lc7_partners;
begin
  if public.lc7_auth(p_id, p_token) is null then return null; end if;
  select * into p from public.lc7_partners where member_id = p_id and status = 'approved';
  if not found then return null; end if;
  return p;
end $$;
revoke all on function public.lc36_partner_of(uuid, text) from public, anon, authenticated;
create or replace function public.lc36_partner_proof_queue(p_id uuid, p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.lc7_partners := public.lc36_partner_of(p_id, p_token); c jsonb := public.lc36_proof_cfg();
begin
  if p.id is null then return jsonb_build_object('ok', false, 'error', 'not_partner'); end if;
  if p.kind = 'creator' then return jsonb_build_object('ok', false, 'error', 'no_queue_for_creators'); end if;
  return jsonb_build_object('ok', true, 'config', c, 'rows', public.lc36_proof_build(p.id, (c ->> 'min_gain')::int, (c ->> 'days')::int, false, true));
end $$;
create or replace function public.lc36_partner_proof_list(p_id uuid, p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.lc7_partners := public.lc36_partner_of(p_id, p_token); c jsonb := public.lc36_proof_cfg();
begin
  if p.id is null then return jsonb_build_object('ok', false, 'error', 'not_partner'); end if;
  return jsonb_build_object('ok', true, 'config', c, 'rows', public.lc36_proof_build(p.id, 0, (c ->> 'days')::int, true, true));
end $$;

-- 5. Stars. A star puts the student on the Verified Proof List (permanent until unstarred).
create or replace function public.lc36_admin_proof_star(p_member uuid, p_on boolean, p_note text default null) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  if not exists (select 1 from public.lc7_members where id = p_member) then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if coalesce(p_on, false) then
    insert into public.lc36_proof_stars (member_id, by_admin, note) values (p_member, true, left(nullif(btrim(p_note), ''), 300))
    on conflict (member_id) do update set note = coalesce(excluded.note, public.lc36_proof_stars.note);
  else delete from public.lc36_proof_stars where member_id = p_member; end if;
  return jsonb_build_object('ok', true, 'starred', coalesce(p_on, false));
end $$;
create or replace function public.lc36_partner_proof_star(p_id uuid, p_token text, p_member uuid, p_on boolean, p_note text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.lc7_partners := public.lc36_partner_of(p_id, p_token);
begin
  if p.id is null then return jsonb_build_object('ok', false, 'error', 'not_partner'); end if;
  if p.kind = 'creator' then return jsonb_build_object('ok', false, 'error', 'no_queue_for_creators'); end if;
  if not exists (select 1 from public.lc7_members where id = p_member and attr_partner_id = p.id and public_profile and not banned) then return jsonb_build_object('ok', false, 'error', 'not_your_student'); end if;
  if coalesce(p_on, false) then
    insert into public.lc36_proof_stars (member_id, by_admin, partner_id, note) values (p_member, false, p.id, left(nullif(btrim(p_note), ''), 300))
    on conflict (member_id) do update set note = coalesce(excluded.note, public.lc36_proof_stars.note);
  else delete from public.lc36_proof_stars where member_id = p_member; end if;
  return jsonb_build_object('ok', true, 'starred', coalesce(p_on, false));
end $$;

-- 5b. Consent and the two public lists (inside the app, and on the landing page).
--     The student switches their own two settings; the owner switches the two lists per starred student. Both must be on.
create or replace function public.lc36_proof_consent_set(p_id uuid, p_token text, p_app boolean, p_web boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if not public.lc7_rate_ok('lc36_consent', p_id::text, 30, interval '1 day') then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  insert into public.lc36_proof_consent (member_id, show_app, show_web, updated_at) values (p_id, coalesce(p_app, false), coalesce(p_web, false), now())
  on conflict (member_id) do update set show_app = excluded.show_app, show_web = excluded.show_web, updated_at = now();
  return jsonb_build_object('ok', true, 'show_app', coalesce(p_app, false), 'show_web', coalesce(p_web, false));
end $$;
create or replace function public.lc36_proof_consent_get(p_id uuid, p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c public.lc36_proof_consent;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into c from public.lc36_proof_consent where member_id = p_id;
  return jsonb_build_object('ok', true, 'show_app', coalesce(c.show_app, false), 'show_web', coalesce(c.show_web, false));
end $$;
-- the owner's switch for one list of one starred student; it cannot be turned on without the student's own permission for that list
create or replace function public.lc36_admin_proof_surface(p_member uuid, p_surface text, p_on boolean) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  if p_surface not in ('app', 'web') then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;
  if not exists (select 1 from public.lc36_proof_stars where member_id = p_member) then return jsonb_build_object('ok', false, 'error', 'not_starred'); end if;
  if coalesce(p_on, false) and not exists (select 1 from public.lc36_proof_consent c where c.member_id = p_member and case p_surface when 'app' then c.show_app else c.show_web end) then
    return jsonb_build_object('ok', false, 'error', 'no_consent'); end if;
  if p_surface = 'app' then update public.lc36_proof_stars set show_app = coalesce(p_on, false) where member_id = p_member;
  else update public.lc36_proof_stars set show_web = coalesce(p_on, false) where member_id = p_member; end if;
  return jsonb_build_object('ok', true, 'surface', p_surface, 'on', coalesce(p_on, false));
end $$;
-- if a student withdraws, their card leaves that list at once (the owner switch is switched off too, so a later "yes" does not bring it back by itself)
create or replace function public.lc36_proof_consent_sync() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.show_app then update public.lc36_proof_stars set show_app = false where member_id = new.member_id; end if;
  if not new.show_web then update public.lc36_proof_stars set show_web = false where member_id = new.member_id; end if;
  return new;
end $$;
drop trigger if exists lc36_proof_consent_sync_t on public.lc36_proof_consent;
create trigger lc36_proof_consent_sync_t after insert or update on public.lc36_proof_consent for each row execute function public.lc36_proof_consent_sync();

-- the list. p_surface 'web' (landing page) or 'app' (inside the Hub). First name only; no member id, no email.
create or replace function public.lc36_proof_rows(p_surface text) returns jsonb language sql stable security definer set search_path = public as $$
  with st as (select x.member_id, x.ref, m.name, m.created_at from public.lc36_proof_stars x
                join public.lc36_proof_consent c on c.member_id = x.member_id join public.lc7_members m on m.id = x.member_id
               where p_surface in ('app', 'web') and not m.banned and m.public_profile
                 and case p_surface when 'app' then x.show_app and c.show_app else x.show_web and c.show_web end),
  site as (select st.*, (select s.site from public.lc36_rating_snapshots s where s.member_id = st.member_id order by s.taken_at desc limit 1) as site from st),
  pts as (select site.member_id, jsonb_agg(jsonb_build_array((extract(epoch from s.taken_at) * 1000)::bigint, coalesce(s.rapid, s.blitz, s.bullet)) order by s.taken_at) as p
            from site join public.lc36_rating_snapshots s on s.member_id = site.member_id and s.site = site.site group by site.member_id)
  select coalesce(jsonb_agg(jsonb_build_object(
      'ref', site.ref, 'first_name', left(split_part(btrim(site.name), ' ', 1), 20), 'site', site.site, 'joined_at', site.created_at,
      'start', (pts.p -> 0 -> 1)::int, 'now', (pts.p -> (jsonb_array_length(pts.p) - 1) -> 1)::int,
      'gain', (pts.p -> (jsonb_array_length(pts.p) - 1) -> 1)::int - (pts.p -> 0 -> 1)::int,
      'days', greatest(0, (((pts.p -> (jsonb_array_length(pts.p) - 1) -> 0)::bigint - (pts.p -> 0 -> 0)::bigint) / 86400000)::int),
      'plan', coalesce((select pl.plan from public.lc36_member_plan pl where pl.member_id = site.member_id), 'free'),
      'points', pts.p) order by ((pts.p -> (jsonb_array_length(pts.p) - 1) -> 1)::int - (pts.p -> 0 -> 1)::int) desc), '[]'::jsonb)
    from site join pts on pts.member_id = site.member_id where jsonb_array_length(pts.p) >= 2
$$;
-- the public wrapper: an object, because the Hub's anonymous RPC helper only returns objects
create or replace function public.lc36_proof_public(p_surface text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', true, 'rows', public.lc36_proof_rows(p_surface))
$$;
-- one card opened: the account data of that student (progress and tool use as counters), for the same two lists and the same two permissions
create or replace function public.lc36_proof_public_detail(p_surface text, p_ref text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_id uuid; v_card jsonb;
begin
  if p_surface not in ('app', 'web') or coalesce(p_ref, '') !~ '^[0-9a-f]{16}$' then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;
  select x.member_id into v_id from public.lc36_proof_stars x join public.lc36_proof_consent c on c.member_id = x.member_id join public.lc7_members m on m.id = x.member_id
   where x.ref = p_ref and not m.banned and m.public_profile and case p_surface when 'app' then x.show_app and c.show_app else x.show_web and c.show_web end;
  if v_id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select e into v_card from jsonb_array_elements(public.lc36_proof_rows(p_surface)) e where e ->> 'ref' = p_ref;
  if v_card is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'card', v_card,
    'xp', (select public.lc36_j(s.state ->> 'lc6-state-v1') -> 'xp' from public.lc8_member_state s where s.id = v_id::text),
    'tools', jsonb_build_object('progress', public.lc36_usage_rollup(array[v_id::text])));
end $$;

-- 6. Profile inspection: the usual profile numbers, the Data Dashboard numbers of THIS member, and every snapshot (the app draws the graph from the
--    public rating history of uname and puts a marker on joined_at).
create or replace function public.lc36_proof_profile_build(p_member uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', true,
    'member', jsonb_build_object('id', m.id, 'name', m.name, 'joined_at', m.created_at, 'last_active', m.last_active_at, 'elo', m.elo,
        'plan', coalesce((select pl.plan from public.lc36_member_plan pl where pl.member_id = m.id), 'free'),
        'starred', exists (select 1 from public.lc36_proof_stars x where x.member_id = m.id)),
    'xp', (select public.lc36_j(s.state ->> 'lc6-state-v1') -> 'xp' from public.lc8_member_state s where s.id = m.id::text),
    'tools', jsonb_build_object('progress', public.lc36_usage_rollup(array[m.id::text])),
    'snapshots', coalesce((select jsonb_agg(jsonb_build_object('site', s.site, 'uname', s.uname, 'rapid', s.rapid, 'blitz', s.blitz, 'bullet', s.bullet, 'at', s.taken_at) order by s.taken_at) from public.lc36_rating_snapshots s where s.member_id = m.id), '[]'::jsonb))
  from public.lc7_members m where m.id = p_member and not m.banned
$$;
revoke all on function public.lc36_proof_profile_build(uuid) from public, anon, authenticated;
create or replace function public.lc36_admin_proof_profile(p_member uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  perform public._lc_require_admin();
  r := public.lc36_proof_profile_build(p_member);
  return coalesce(r, jsonb_build_object('ok', false, 'error', 'not_found'));
end $$;
create or replace function public.lc36_partner_proof_profile(p_id uuid, p_token text, p_member uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.lc7_partners := public.lc36_partner_of(p_id, p_token); r jsonb;
begin
  if p.id is null then return jsonb_build_object('ok', false, 'error', 'not_partner'); end if;
  if not exists (select 1 from public.lc7_members where id = p_member and attr_partner_id = p.id and public_profile and not banned) then return jsonb_build_object('ok', false, 'error', 'not_your_student'); end if;
  r := public.lc36_proof_profile_build(p_member);
  return coalesce(r, jsonb_build_object('ok', false, 'error', 'not_found'));
end $$;

revoke all on function public.lc36_rating_report(uuid, text, text, text, integer, integer, integer) from public;
revoke all on function public.lc36_plan_link(uuid, text, text) from public;
revoke all on function public.lc36_admin_proof_surface(uuid, text, boolean) from public, anon;
revoke all on function public.lc36_proof_rows(text) from public, anon, authenticated;
revoke all on function public.lc36_proof_public(text), public.lc36_proof_public_detail(text, text), public.lc36_proof_consent_set(uuid, text, boolean, boolean), public.lc36_proof_consent_get(uuid, text) from public;
grant execute on function public.lc36_proof_public(text), public.lc36_proof_public_detail(text, text), public.lc36_proof_consent_set(uuid, text, boolean, boolean), public.lc36_proof_consent_get(uuid, text) to anon, authenticated, service_role;
grant execute on function public.lc36_admin_proof_surface(uuid, text, boolean) to authenticated, service_role;
revoke all on function public.lc36_admin_proof_config(integer, integer), public.lc36_admin_proof_queue(), public.lc36_admin_proof_list(), public.lc36_admin_proof_star(uuid, boolean, text), public.lc36_admin_proof_profile(uuid) from public, anon;
revoke all on function public.lc36_partner_proof_queue(uuid, text), public.lc36_partner_proof_list(uuid, text), public.lc36_partner_proof_star(uuid, text, uuid, boolean, text), public.lc36_partner_proof_profile(uuid, text, uuid) from public;
grant execute on function public.lc36_rating_report(uuid, text, text, text, integer, integer, integer), public.lc36_plan_link(uuid, text, text),
  public.lc36_partner_proof_queue(uuid, text), public.lc36_partner_proof_list(uuid, text), public.lc36_partner_proof_star(uuid, text, uuid, boolean, text), public.lc36_partner_proof_profile(uuid, text, uuid) to anon, authenticated, service_role;
grant execute on function public.lc36_admin_proof_config(integer, integer), public.lc36_admin_proof_queue(), public.lc36_admin_proof_list(), public.lc36_admin_proof_star(uuid, boolean, text), public.lc36_admin_proof_profile(uuid) to authenticated, service_role;
