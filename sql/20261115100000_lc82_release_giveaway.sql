-- LC82 (build 9.42.0): the Release Giveaway (15-day ELO-gain challenge), its public Proof Queue board, the social-proof counters
-- (total verified ELO gained, 5-star reviews) and the owner's overview.
-- Idempotent: safe to run twice. Never applied by the assistant: the owner runs it in the Supabase SQL editor.
-- Needs (earlier migrations): public._lc26_email(), public._lc_require_admin(), public.lc59_links (sql/20261107100000_lc59_milestones_proof.sql).
-- Optional: public.lc59_proof (first-name suggestion), public.app_feedback (the in-app feedback with a 1-5 star rating; read through to_jsonb,
-- so a missing table or a different column layout gives 0, never an error).
--
-- How the numbers stay honest: the browser never sends a rating. The Edge Function `elo-verify` reads the PUBLIC Chess.com / Lichess Rapid
-- rating and writes it to public.lc59_links. A trigger copies every new verified rating into the member's giveaway entry, but only while the
-- giveaway runs (starts_at .. ends_at). Start rating = the verified rating at the moment the member joined.
-- Gain = latest verified rating minus start (rank_by = 'last', default) or highest verified rating minus start (rank_by = 'peak').
-- Prize: the top N (default 5) win 1 month of Pro. Awarding is MANUAL: the owner screen builds the SQL (public._lc_create_license, 30 days,
-- tier 2) to paste into the SQL editor. Nothing here creates a licence by itself.

create table if not exists public.lc82_giveaways (
  id         text primary key check (id ~ '^[a-z0-9-]{3,40}$'),
  title      text not null default 'Release Giveaway' check (char_length(title) between 3 and 80),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  winners    integer not null default 5 check (winners between 1 and 50),
  prize      text not null default '1 month of Pro' check (char_length(prize) between 3 and 80),
  rank_by    text not null default 'last' check (rank_by in ('last', 'peak')),
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
-- the first giveaway: 15 days from the moment this file is run (the owner can change the dates in the app: owner menu > Release Giveaway)
insert into public.lc82_giveaways (id, starts_at, ends_at) values ('release-2026', now(), now() + interval '15 days') on conflict (id) do nothing;

create table if not exists public.lc82_entries (
  giveaway_id  text not null references public.lc82_giveaways(id) on delete cascade,
  user_id      uuid not null,
  email        text not null check (email = lower(email)),
  first_name   text check (first_name is null or char_length(first_name) between 2 and 24),
  site         text not null check (site in ('chesscom', 'lichess')),
  uname        text not null,
  start_rating integer not null,
  last_rating  integer not null,
  peak_rating  integer not null,
  show_public  boolean not null default false,
  joined_at    timestamptz not null default now(),
  last_at      timestamptz not null default now(),
  awarded_at   timestamptz,
  disqualified boolean not null default false,
  note         text,
  primary key (giveaway_id, user_id)
);
create unique index if not exists lc82_entries_acct_uq on public.lc82_entries (giveaway_id, site, lower(uname));

alter table public.lc82_giveaways enable row level security;
alter table public.lc82_entries enable row level security;
revoke all on public.lc82_giveaways, public.lc82_entries from public, anon, authenticated;

-- ---------- helpers ----------
create or replace function public._lc82_cur() returns public.lc82_giveaways language sql stable security definer set search_path = public as $$
  -- the running giveaway, else the next one, else the most recent one that ended
  select g from public.lc82_giveaways g where g.active
   order by (now() between g.starts_at and g.ends_at) desc, (g.starts_at > now()) desc,
            case when g.starts_at > now() then g.starts_at end asc, g.ends_at desc
   limit 1 $$;

create or replace function public._lc82_gain(e public.lc82_entries, p_rank text) returns integer language sql immutable as $$
  select case when p_rank = 'peak' then e.peak_rating - e.start_rating else e.last_rating - e.start_rating end $$;

create or replace function public._lc82_gjson(g public.lc82_giveaways) returns jsonb language sql stable as $$
  select case when g.id is null then null else jsonb_build_object('id', g.id, 'title', g.title, 'starts_at', g.starts_at, 'ends_at', g.ends_at, 'winners', g.winners,
    'prize', g.prize, 'rank_by', g.rank_by, 'running', now() between g.starts_at and g.ends_at, 'upcoming', now() < g.starts_at, 'ended', now() > g.ends_at) end $$;

-- ranked entries of one giveaway (disqualified entries rank last and are never shown publicly)
create or replace function public._lc82_ranked(p_id text) returns table (user_id uuid, rnk integer, gain integer) language sql stable security definer set search_path = public as $$
  select e.user_id, (row_number() over (order by e.disqualified, public._lc82_gain(e, g.rank_by) desc, e.joined_at))::integer,
         public._lc82_gain(e, g.rank_by)
    from public.lc82_entries e join public.lc82_giveaways g on g.id = e.giveaway_id where e.giveaway_id = p_id $$;

-- ---------- every new verified rating lands in the running giveaway ----------
create or replace function public._lc82_on_rating() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.lc82_entries e set last_rating = new.last_rating, peak_rating = greatest(e.peak_rating, new.last_rating), last_at = now()
    from public.lc82_giveaways g
   where e.user_id = new.user_id and g.id = e.giveaway_id and now() between g.starts_at and g.ends_at
     and e.site = new.site and lower(e.uname) = lower(new.uname);
  return new;
end $$;
drop trigger if exists lc82_rating on public.lc59_links;
create trigger lc82_rating after update of last_rating on public.lc59_links for each row execute function public._lc82_on_rating();

-- ---------- member ----------
create or replace function public.lc82_status() returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); g public.lc82_giveaways; l public.lc59_links; e public.lc82_entries; v_first text; v_rank integer; v_n integer; v_gain integer;
begin
  g := public._lc82_cur();
  if v_uid is null then return jsonb_build_object('ok', true, 'signed_in', false, 'giveaway', public._lc82_gjson(g)); end if;
  select * into l from public.lc59_links where user_id = v_uid;
  if to_regclass('public.lc59_proof') is not null then
    begin execute 'select first_name from public.lc59_proof where user_id = $1' into v_first using v_uid; exception when others then v_first := null; end;
  end if;
  if g.id is not null then
    select * into e from public.lc82_entries where giveaway_id = g.id and user_id = v_uid;
    select count(*) into v_n from public.lc82_entries where giveaway_id = g.id;
    if e.user_id is not null then select r.rnk, r.gain into v_rank, v_gain from public._lc82_ranked(g.id) r where r.user_id = v_uid; end if;
  end if;
  return jsonb_build_object('ok', true, 'signed_in', true, 'giveaway', public._lc82_gjson(g), 'entries', coalesce(v_n, 0),
    'linked', l.user_id is not null, 'site', l.site, 'uname', l.uname, 'rating', l.last_rating, 'checked_at', l.last_at,
    'first_name', coalesce(e.first_name, v_first),
    'entry', case when e.user_id is null then null else jsonb_build_object('start', e.start_rating, 'last', e.last_rating, 'peak', e.peak_rating, 'gain', v_gain,
      'rank', v_rank, 'show_public', e.show_public, 'joined_at', e.joined_at, 'last_at', e.last_at, 'site', e.site, 'uname', e.uname) end);
end $$;

create or replace function public.lc82_join(p_first text, p_public boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text; g public.lc82_giveaways; l public.lc59_links; v_first text := nullif(btrim(coalesce(p_first, '')), '');
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  v_email := lower(coalesce(public._lc26_email(), ''));
  if v_email = '' then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  g := public._lc82_cur();
  if g.id is null then return jsonb_build_object('ok', false, 'error', 'no_giveaway'); end if;
  if now() < g.starts_at then return jsonb_build_object('ok', false, 'error', 'not_started', 'starts_at', g.starts_at); end if;
  if now() > g.ends_at then return jsonb_build_object('ok', false, 'error', 'ended'); end if;
  select * into l from public.lc59_links where user_id = v_uid;
  if not found then return jsonb_build_object('ok', false, 'error', 'link_first'); end if;
  if v_first is not null and v_first !~ '^[[:alpha:]][[:alpha:] ''-]{1,23}$' then return jsonb_build_object('ok', false, 'error', 'first_name'); end if;
  if coalesce(p_public, false) and v_first is null then return jsonb_build_object('ok', false, 'error', 'first_name'); end if;
  if exists (select 1 from public.lc82_entries x where x.giveaway_id = g.id and x.site = l.site and lower(x.uname) = lower(l.uname) and x.user_id <> v_uid) then
    return jsonb_build_object('ok', false, 'error', 'account_taken');
  end if;
  insert into public.lc82_entries (giveaway_id, user_id, email, first_name, site, uname, start_rating, last_rating, peak_rating, show_public)
    values (g.id, v_uid, v_email, v_first, l.site, l.uname, l.last_rating, l.last_rating, l.last_rating, coalesce(p_public, false))
    on conflict (giveaway_id, user_id) do update set first_name = coalesce(excluded.first_name, public.lc82_entries.first_name), show_public = excluded.show_public;
    -- the start rating is NEVER reset by joining again
  return public.lc82_status();
end $$;

create or replace function public.lc82_public_set(p_public boolean, p_first text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); g public.lc82_giveaways; v_first text := nullif(btrim(coalesce(p_first, '')), ''); e public.lc82_entries;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  g := public._lc82_cur(); if g.id is null then return jsonb_build_object('ok', false, 'error', 'no_giveaway'); end if;
  select * into e from public.lc82_entries where giveaway_id = g.id and user_id = v_uid;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_joined'); end if;
  if v_first is not null and v_first !~ '^[[:alpha:]][[:alpha:] ''-]{1,23}$' then return jsonb_build_object('ok', false, 'error', 'first_name'); end if;
  if coalesce(p_public, false) and coalesce(v_first, e.first_name) is null then return jsonb_build_object('ok', false, 'error', 'first_name'); end if;
  update public.lc82_entries set show_public = coalesce(p_public, false), first_name = coalesce(v_first, first_name) where giveaway_id = g.id and user_id = v_uid;
  return public.lc82_status();
end $$;

-- ---------- public (landing page and app, no sign-in) ----------
-- the giveaway board: only entries whose member said yes, first name + site + start / now / gain + their real rank. Never an e-mail or a username.
create or replace function public.lc82_board_public() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare g public.lc82_giveaways; v_rows jsonb; v_n integer;
begin
  g := public._lc82_cur();
  if g.id is null then return jsonb_build_object('ok', true, 'giveaway', null, 'entries', 0, 'rows', '[]'::jsonb); end if;
  select count(*) into v_n from public.lc82_entries where giveaway_id = g.id and not disqualified;
  select coalesce(jsonb_agg(jsonb_build_object('rank', r.rnk, 'first_name', e.first_name, 'site', e.site, 'start', e.start_rating, 'now', e.last_rating,
           'peak', e.peak_rating, 'gain', r.gain, 'joined_at', e.joined_at) order by r.rnk), '[]'::jsonb) into v_rows
    from public._lc82_ranked(g.id) r join public.lc82_entries e on e.giveaway_id = g.id and e.user_id = r.user_id
   where e.show_public and not e.disqualified and e.first_name is not null and r.rnk <= greatest(g.winners, 10);
  return jsonb_build_object('ok', true, 'giveaway', public._lc82_gjson(g), 'entries', v_n, 'rows', v_rows);
end $$;

-- social proof: totals only. ELO = verified gains (peak minus start of every linked member, positive only); reviews = 5-star ratings in app_feedback.
create or replace function public._lc82_reviews() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v5 integer := 0; vall integer := 0; vavg numeric;
begin
  if to_regclass('public.app_feedback') is not null then
    begin
      execute $q$select count(*) filter (where r = 5), count(*) filter (where r between 1 and 5), round(avg(r) filter (where r between 1 and 5), 2)
                   from (select round(coalesce(nullif(to_jsonb(f)->>'rating', '')::numeric, nullif(to_jsonb(f)->'metadata'->'social'->>'rating', '')::numeric))::int as r
                           from public.app_feedback f) x$q$ into v5, vall, vavg;
    exception when others then v5 := 0; vall := 0; vavg := null; end;
  end if;
  return jsonb_build_object('five_star', coalesce(v5, 0), 'rated', coalesce(vall, 0), 'avg', vavg);
end $$;

create or replace function public.lc82_social_proof() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_gain bigint := 0; v_members integer := 0; v_best integer := 0; g public.lc82_giveaways; v_n integer := 0;
begin
  select coalesce(sum(greatest(0, peak_rating - start_rating)), 0), count(*) filter (where peak_rating > start_rating), coalesce(max(peak_rating - start_rating), 0)
    into v_gain, v_members, v_best from public.lc59_links;
  g := public._lc82_cur();
  if g.id is not null then select count(*) into v_n from public.lc82_entries where giveaway_id = g.id and not disqualified; end if;
  return jsonb_build_object('ok', true, 'elo_gained', v_gain, 'members_gained', v_members, 'best_gain', greatest(0, v_best),
    'reviews', public._lc82_reviews(), 'giveaway', public._lc82_gjson(g), 'giveaway_entries', v_n);
end $$;

-- ---------- owner ----------
create or replace function public.lc82_admin_board(p_id text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.lc82_giveaways; v_entries jsonb; v_top jsonb; v_rev jsonb := '[]'::jsonb; v_all jsonb;
begin
  perform public._lc_require_admin();
  if p_id is null then g := public._lc82_cur(); else select * into g from public.lc82_giveaways where id = p_id; end if;
  select coalesce(jsonb_agg(public._lc82_gjson(x) order by x.starts_at desc), '[]'::jsonb) into v_all from public.lc82_giveaways x;
  if g.id is not null then
    select coalesce(jsonb_agg(jsonb_build_object('user_id', e.user_id, 'rank', r.rnk, 'gain', r.gain, 'email', e.email, 'first_name', e.first_name, 'site', e.site,
             'uname', e.uname, 'start', e.start_rating, 'now', e.last_rating, 'peak', e.peak_rating, 'show_public', e.show_public, 'joined_at', e.joined_at,
             'last_at', e.last_at, 'awarded_at', e.awarded_at, 'disqualified', e.disqualified, 'note', e.note) order by r.rnk), '[]'::jsonb) into v_entries
      from public._lc82_ranked(g.id) r join public.lc82_entries e on e.giveaway_id = g.id and e.user_id = r.user_id;
  end if;
  -- the highest verified gains of all linked members (any time since they linked)
  select coalesce(jsonb_agg(t order by (t->>'gain')::int desc), '[]'::jsonb) into v_top from (
    select jsonb_build_object('email', l.email, 'site', l.site, 'uname', l.uname, 'start', l.start_rating, 'now', l.last_rating, 'peak', l.peak_rating,
           'gain', l.peak_rating - l.start_rating, 'linked_at', l.linked_at, 'last_at', l.last_at) t
      from public.lc59_links l where l.peak_rating > l.start_rating order by l.peak_rating - l.start_rating desc limit 25) s;
  if to_regclass('public.app_feedback') is not null then
    begin
      execute $q$select coalesce(jsonb_agg(z order by z->>'at' desc), '[]'::jsonb) from (
                   select jsonb_build_object('email', j->>'user_email', 'message', j->>'message', 'elo', coalesce(j->>'elo_progress', j->'metadata'->'social'->>'elo_progress'),
                          'video', coalesce(j->>'video_question', j->'metadata'->'social'->>'video_question'),
                          'showcase', coalesce(j->>'showcase_ok', j->'metadata'->'social'->>'ok', 'false'), 'status', j->>'status', 'at', j->>'created_at') z
                     from (select to_jsonb(f) j from public.app_feedback f) x
                    where round(coalesce(nullif(j->>'rating', '')::numeric, nullif(j->'metadata'->'social'->>'rating', '')::numeric)) = 5
                    order by j->>'created_at' desc nulls last limit 60) y$q$ into v_rev;
    exception when others then v_rev := '[]'::jsonb; end;
  end if;
  return jsonb_build_object('ok', true, 'giveaway', public._lc82_gjson(g), 'giveaways', v_all, 'entries', coalesce(v_entries, '[]'::jsonb),
    'top_gains', v_top, 'five_star', coalesce(v_rev, '[]'::jsonb), 'proof', public.lc82_social_proof());
end $$;

create or replace function public.lc82_admin_cfg(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id text := lower(btrim(coalesce(p->>'id', ''))); v_s timestamptz; v_e timestamptz;
begin
  perform public._lc_require_admin();
  if v_id !~ '^[a-z0-9-]{3,40}$' then return jsonb_build_object('ok', false, 'error', 'bad_id'); end if;
  begin v_s := (p->>'starts_at')::timestamptz; v_e := (p->>'ends_at')::timestamptz; exception when others then return jsonb_build_object('ok', false, 'error', 'bad_date'); end;
  if v_s is null then v_s := now(); end if;
  if v_e is null then v_e := v_s + interval '15 days'; end if;
  if v_e <= v_s then return jsonb_build_object('ok', false, 'error', 'bad_date'); end if;
  insert into public.lc82_giveaways (id, title, starts_at, ends_at, winners, prize, rank_by, active)
    values (v_id, coalesce(nullif(btrim(p->>'title'), ''), 'Release Giveaway'), v_s, v_e, coalesce((p->>'winners')::int, 5),
            coalesce(nullif(btrim(p->>'prize'), ''), '1 month of Pro'), coalesce(nullif(p->>'rank_by', ''), 'last'), coalesce((p->>'active')::boolean, true))
    on conflict (id) do update set title = excluded.title, starts_at = excluded.starts_at, ends_at = excluded.ends_at, winners = excluded.winners,
      prize = excluded.prize, rank_by = excluded.rank_by, active = excluded.active;
  return public.lc82_admin_board(v_id);
exception when check_violation then return jsonb_build_object('ok', false, 'error', 'bad_value');
end $$;

create or replace function public.lc82_admin_mark(p_id text, p_user uuid, p_awarded boolean default null, p_disq boolean default null, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  update public.lc82_entries set
    awarded_at = case when p_awarded is null then awarded_at when p_awarded then coalesce(awarded_at, now()) else null end,
    disqualified = coalesce(p_disq, disqualified),
    note = case when p_note is null then note else left(nullif(btrim(p_note), ''), 300) end
   where giveaway_id = p_id and user_id = p_user;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return public.lc82_admin_board(p_id);
end $$;

-- ---------- permissions ----------
revoke all on function public._lc82_cur(), public._lc82_gain(public.lc82_entries, text), public._lc82_gjson(public.lc82_giveaways), public._lc82_ranked(text),
  public._lc82_on_rating(), public._lc82_reviews() from public, anon, authenticated;
revoke all on function public.lc82_status(), public.lc82_join(text, boolean), public.lc82_public_set(boolean, text), public.lc82_board_public(),
  public.lc82_social_proof(), public.lc82_admin_board(text), public.lc82_admin_cfg(jsonb), public.lc82_admin_mark(text, uuid, boolean, boolean, text) from public, anon, authenticated;
grant execute on function public.lc82_board_public(), public.lc82_social_proof() to anon, authenticated;
grant execute on function public.lc82_status(), public.lc82_join(text, boolean), public.lc82_public_set(boolean, text),
  public.lc82_admin_board(text), public.lc82_admin_cfg(jsonb), public.lc82_admin_mark(text, uuid, boolean, boolean, text) to authenticated;
do $$ begin
  grant execute on function public.lc82_board_public(), public.lc82_social_proof() to service_role;
exception when undefined_object then null; end $$;
