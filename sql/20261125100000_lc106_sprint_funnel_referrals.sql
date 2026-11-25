-- 9.74.0 (LC106): the 2-Week Rating Sprint, clean funnel numbers, and referral tokens only for real chess players.
-- Idempotent: safe to run again.
--
-- 1. Funnel (LC94): devices of the owner (marked by the app after the server confirmed the admin session) never count.
--    public.lc94_excluded holds those device ids; lc94_step ignores them, lc94_report leaves them out.
-- 2. The Sprint: 14 days from the start, one per account. Start rating = the verified rating now (public.lc59_links, read by the
--    elo-verify function on the server), or the player's own highest rating of the last 7 days when the app sends a higher one
--    (a higher start only makes the target harder, so the browser can never make it easier). Target by start rating
--    (lc106_cfg.targets). Two goals:
--      XP goal (the process): xp_goal XP in the 14 days -> the Sprint price: pct % off the first Pro or VIP payment, until
--      reward_days after the Sprint ends, once (the stripe function asks public._lc106_reward_pct and the webhook marks it used).
--      XP is reported by the app; the server only accepts at most xp_day_max XP a day, so it cannot be finished in one go.
--      Rating goal: the verified rating (lc59_links.last_rating) reaches start + target -> the owner sees it in lc106_admin()
--      and the member can show the result on the Wall of Love (the LC59 proof flow).
-- 3. Referral tokens (lc36_referral_claim): the inviter's tokens are held until the invited friend has linked a real
--    Chess.com / Lichess account (a row in lc59_links), then paid. Fake accounts without a chess account earn nothing.

-- ---------------------------------------------------------------- 1. funnel
create table if not exists public.lc94_excluded (aid text primary key, why text not null default 'owner', at timestamptz not null default now());
alter table public.lc94_excluded enable row level security;

create or replace function public.lc94_exclude_me(p_aid text) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then return false; end if;
  if p_aid is null or p_aid !~ '^[A-Za-z0-9_-]{8,64}$' then return false; end if;
  insert into public.lc94_excluded (aid, why) values (p_aid, 'owner') on conflict (aid) do nothing;
  delete from public.lc94_funnel where aid = p_aid;
  return true;
end $$;
grant execute on function public.lc94_exclude_me(text) to authenticated;

create or replace function public.lc94_step(p_aid text, p_step text, p_src text default null::text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_src text := nullif(left(regexp_replace(lower(coalesce(p_src, '')), '[^a-z0-9_.-]', '', 'g'), 40), '');
begin
  if p_aid is null or p_aid !~ '^[A-Za-z0-9_-]{8,64}$' then return; end if;
  if p_step is null or p_step = 'paid' then return; end if;   -- 'paid' only comes from the Stripe function (service role)
  if exists (select 1 from public.lc94_excluded where aid = p_aid) then return; end if;   -- 9.74.0: the owner's devices
  insert into public.lc94_funnel (aid, step, src) values (p_aid, p_step, v_src) on conflict do nothing;
exception when check_violation then return;   -- an unknown step name: ignored
end $$;

create or replace function public.lc94_report(p_days integer default 14) returns table(step text, src text, players bigint)
language sql security definer set search_path = public, pg_temp as $$
  select f.step, coalesce(f.src, '(none)'), count(*)
  from public.lc94_funnel f
  where public.is_admin() and f.t > now() - make_interval(days => least(greatest(coalesce(p_days, 14), 1), 90))
    and not exists (select 1 from public.lc94_excluded x where x.aid = f.aid)
  group by 1, 2
  order by array_position(array['landing','iab_open','first_open','name_entered','first_review_done','signed_in',
                                'install','day2_return','paywall_seen','checkout_started','paid'], f.step), 3 desc
$$;

-- ---------------------------------------------------------------- 2. the Sprint
create table if not exists public.lc106_cfg (k text primary key, v jsonb not null, updated_at timestamptz not null default now());
alter table public.lc106_cfg enable row level security;
insert into public.lc106_cfg (k, v) values ('main', jsonb_build_object(
  'on', true, 'days', 14, 'xp_goal', 1500, 'xp_day_max', 2500, 'pct', 20, 'reward_days', 14,
  'targets', jsonb_build_array(jsonb_build_array(1000, 100), jsonb_build_array(1400, 75), jsonb_build_array(1800, 50), jsonb_build_array(100000, 30))))
on conflict (k) do nothing;

create table if not exists public.lc106_sprint (
  user_id uuid primary key, email text not null, site text, uname text,
  started_at timestamptz not null default now(), ends_at timestamptz not null,
  start_rating integer not null, target integer not null,
  xp_start integer not null default 0, xp_now integer not null default 0, xp_goal integer not null,
  xp_at timestamptz not null default now(),
  xp_done_at timestamptz, rating_done_at timestamptz, best_rating integer,
  pct integer not null default 0, reward_until timestamptz, reward_used_at timestamptz, reward_session text,
  proof_ok boolean not null default false);
alter table public.lc106_sprint enable row level security;
create index if not exists lc106_sprint_email on public.lc106_sprint (lower(email));

create or replace function public._lc106_cfg() returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select v from public.lc106_cfg where k = 'main'), '{}'::jsonb)
$$;

create or replace function public._lc106_target(p_rating integer) returns integer language plpgsql stable security definer set search_path = public, pg_temp as $$
declare t jsonb; r jsonb;
begin
  t := coalesce(public._lc106_cfg() -> 'targets', '[]'::jsonb);
  for r in select value from jsonb_array_elements(t) loop
    if p_rating < (r ->> 0)::int then return (r ->> 1)::int; end if;
  end loop;
  return 30;
end $$;

-- the row as the app sees it, with the verified rating of now
create or replace function public._lc106_view(s public.lc106_sprint) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare l public.lc59_links%rowtype; cur integer;
begin
  select * into l from public.lc59_links where user_id = s.user_id;
  cur := coalesce(l.last_rating, s.start_rating);
  return jsonb_build_object('ok', true, 'joined', true, 'started_at', s.started_at, 'ends_at', s.ends_at,
    'days_left', greatest(0, ceil(extract(epoch from (s.ends_at - now())) / 86400)::int), 'over', now() >= s.ends_at,
    'site', s.site, 'uname', s.uname, 'start', s.start_rating, 'now', cur, 'gain', cur - s.start_rating, 'target', s.target,
    'best', greatest(coalesce(s.best_rating, s.start_rating), cur), 'rating_at', l.last_at,
    'xp', greatest(0, s.xp_now - s.xp_start), 'xp_goal', s.xp_goal,
    'xp_done', s.xp_done_at is not null, 'rating_done', s.rating_done_at is not null,
    'pct', s.pct, 'reward_until', s.reward_until, 'reward_used', s.reward_used_at is not null);
end $$;

create or replace function public.lc106_state() returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); s public.lc106_sprint%rowtype; l public.lc59_links%rowtype; c jsonb := public._lc106_cfg();
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'sign_in'); end if;
  if not coalesce((c ->> 'on')::boolean, true) then return jsonb_build_object('ok', false, 'reason', 'off'); end if;
  select * into s from public.lc106_sprint where user_id = uid;
  if found then return public._lc106_view(s); end if;
  select * into l from public.lc59_links where user_id = uid;
  return jsonb_build_object('ok', true, 'joined', false, 'linked', l.user_id is not null, 'rating', l.last_rating,
    'target', case when l.last_rating is null then null else public._lc106_target(l.last_rating) end,
    'days', coalesce((c ->> 'days')::int, 14), 'xp_goal', coalesce((c ->> 'xp_goal')::int, 1500), 'pct', coalesce((c ->> 'pct')::int, 20));
end $$;

create or replace function public.lc106_join(p_xp integer, p_peak integer default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); l public.lc59_links%rowtype; c jsonb := public._lc106_cfg(); s public.lc106_sprint%rowtype; st integer; em text;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'sign_in'); end if;
  if not coalesce((c ->> 'on')::boolean, true) then return jsonb_build_object('ok', false, 'reason', 'off'); end if;
  select * into s from public.lc106_sprint where user_id = uid;
  if found then return public._lc106_view(s); end if;
  select * into l from public.lc59_links where user_id = uid;
  if not found or l.last_rating is null then return jsonb_build_object('ok', false, 'reason', 'link'); end if;
  if exists (select 1 from public.lc106_sprint where lower(site) = lower(l.site) and lower(uname) = lower(l.uname))
    then return jsonb_build_object('ok', false, 'reason', 'account_used'); end if;   -- one Sprint per chess account
  select email into em from auth.users where id = uid;
  -- the player's own highest rating of the last week, only when it is HIGHER (and not absurd): a harder target, never an easier one
  st := l.last_rating;
  if p_peak is not null and p_peak > st and p_peak <= st + 400 then st := p_peak; end if;
  insert into public.lc106_sprint (user_id, email, site, uname, ends_at, start_rating, target, xp_start, xp_now, xp_goal, best_rating)
  values (uid, coalesce(em, l.email, ''), l.site, l.uname, now() + make_interval(days => coalesce((c ->> 'days')::int, 14)), st,
          public._lc106_target(st), greatest(0, coalesce(p_xp, 0)), greatest(0, coalesce(p_xp, 0)), coalesce((c ->> 'xp_goal')::int, 1500), st)
  returning * into s;
  return public._lc106_view(s);
end $$;

create or replace function public.lc106_progress(p_xp integer) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); s public.lc106_sprint%rowtype; l public.lc59_links%rowtype; c jsonb := public._lc106_cfg();
        cap integer; nx integer; cur integer;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'sign_in'); end if;
  select * into s from public.lc106_sprint where user_id = uid for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_joined'); end if;
  if now() < s.ends_at and p_xp is not null and p_xp > s.xp_now then
    -- at most xp_day_max XP a day since the last report (so the goal can never be reached in one go)
    cap := ceil(coalesce((c ->> 'xp_day_max')::int, 2500) * greatest(extract(epoch from (now() - s.xp_at)) / 86400, 0.04))::int;
    nx := least(p_xp, s.xp_now + cap);
    update public.lc106_sprint set xp_now = nx, xp_at = now() where user_id = uid;
    s.xp_now := nx;
    if s.xp_done_at is null and nx - s.xp_start >= s.xp_goal then
      update public.lc106_sprint set xp_done_at = now(), pct = coalesce((c ->> 'pct')::int, 20),
        reward_until = s.ends_at + make_interval(days => coalesce((c ->> 'reward_days')::int, 14)) where user_id = uid;
    end if;
  end if;
  select * into l from public.lc59_links where user_id = uid;
  cur := l.last_rating;
  if cur is not null then
    update public.lc106_sprint set best_rating = greatest(coalesce(best_rating, start_rating), cur) where user_id = uid;
    if s.rating_done_at is null and now() <= s.ends_at + interval '1 day' and cur - s.start_rating >= s.target then
      update public.lc106_sprint set rating_done_at = now() where user_id = uid;
    end if;
  end if;
  select * into s from public.lc106_sprint where user_id = uid;
  return public._lc106_view(s);
end $$;

create or replace function public.lc106_proof(p_ok boolean) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.lc106_sprint set proof_ok = coalesce(p_ok, false) where user_id = auth.uid();
  return jsonb_build_object('ok', found);
end $$;

-- for the stripe function (service role): the Sprint price for this e-mail, 0 when there is none
create or replace function public._lc106_reward_pct(p_email text) returns integer
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(max(pct), 0) from public.lc106_sprint
  where lower(email) = lower(p_email) and xp_done_at is not null and reward_used_at is null and reward_until > now() and pct between 1 and 90
$$;
create or replace function public._lc106_used(p_email text, p_session text) returns void
language sql security definer set search_path = public, pg_temp as $$
  update public.lc106_sprint set reward_used_at = now(), reward_session = left(coalesce(p_session, ''), 120)
  where lower(email) = lower(p_email) and reward_used_at is null
$$;
revoke all on function public._lc106_reward_pct(text) from public, anon, authenticated;
revoke all on function public._lc106_used(text, text) from public, anon, authenticated;

create or replace function public.lc106_admin() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'reason', 'owner_only'); end if;
  return jsonb_build_object('ok', true, 'cfg', public._lc106_cfg(), 'rows', coalesce((select jsonb_agg(jsonb_build_object(
    'email', s.email, 'site', s.site, 'uname', s.uname, 'started_at', s.started_at, 'ends_at', s.ends_at, 'start', s.start_rating,
    'now', l.last_rating, 'target', s.target, 'xp', s.xp_now - s.xp_start, 'xp_goal', s.xp_goal, 'xp_done', s.xp_done_at,
    'rating_done', s.rating_done_at, 'pct', s.pct, 'reward_used', s.reward_used_at, 'proof_ok', s.proof_ok) order by s.started_at desc)
    from public.lc106_sprint s left join public.lc59_links l on l.user_id = s.user_id), '[]'::jsonb));
end $$;

create or replace function public.lc106_cfg_save(p_v jsonb) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v jsonb := public._lc106_cfg();
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'reason', 'owner_only'); end if;
  if p_v ? 'on' then v := v || jsonb_build_object('on', (p_v ->> 'on')::boolean); end if;
  if p_v ? 'days' then v := v || jsonb_build_object('days', least(greatest((p_v ->> 'days')::int, 3), 60)); end if;
  if p_v ? 'xp_goal' then v := v || jsonb_build_object('xp_goal', least(greatest((p_v ->> 'xp_goal')::int, 100), 100000)); end if;
  if p_v ? 'xp_day_max' then v := v || jsonb_build_object('xp_day_max', least(greatest((p_v ->> 'xp_day_max')::int, 100), 100000)); end if;
  if p_v ? 'pct' then v := v || jsonb_build_object('pct', least(greatest((p_v ->> 'pct')::int, 0), 60)); end if;
  if p_v ? 'reward_days' then v := v || jsonb_build_object('reward_days', least(greatest((p_v ->> 'reward_days')::int, 1), 90)); end if;
  if jsonb_typeof(p_v -> 'targets') = 'array' then v := v || jsonb_build_object('targets', p_v -> 'targets'); end if;
  insert into public.lc106_cfg (k, v, updated_at) values ('main', v, now()) on conflict (k) do update set v = excluded.v, updated_at = now();
  return jsonb_build_object('ok', true, 'cfg', v);
end $$;
revoke all on function public._lc106_cfg(), public._lc106_target(integer), public._lc106_view(public.lc106_sprint),
  public.lc106_state(), public.lc106_join(integer, integer), public.lc106_progress(integer), public.lc106_proof(boolean),
  public.lc106_admin(), public.lc106_cfg_save(jsonb), public.lc94_exclude_me(text) from public, anon;
grant execute on function public.lc94_exclude_me(text) to authenticated;
grant execute on function public.lc106_state(), public.lc106_join(integer, integer), public.lc106_progress(integer),
  public.lc106_proof(boolean), public.lc106_admin(), public.lc106_cfg_save(jsonb) to authenticated;

-- ---------------------------------------------------------------- 3. referral tokens only for real chess players
create table if not exists public.lc106_ref_pending (
  id bigserial primary key, member_id uuid not null, referred_id uuid not null, delta integer not null,
  created_at timestamptz not null default now(), paid_at timestamptz);
alter table public.lc106_ref_pending enable row level security;

create or replace function public._lc106_ref_hold() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare em text;
begin
  if new.reason is distinct from 'referral' or new.ref_id is null or new.ref_id !~ '^[0-9a-f-]{36}$' then return new; end if;
  select email into em from public.lc7_members where id = new.ref_id::uuid;
  if em is not null and exists (select 1 from public.lc59_links where lower(email) = lower(em)) then return new; end if;
  insert into public.lc106_ref_pending (member_id, referred_id, delta) values (new.member_id, new.ref_id::uuid, new.delta);
  return null;   -- held: paid when the friend links a Chess.com / Lichess account
end $$;
drop trigger if exists lc106_ref_hold on public.lc7_token_ledger;
create trigger lc106_ref_hold before insert on public.lc7_token_ledger for each row execute function public._lc106_ref_hold();

create or replace function public._lc106_ref_pay() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare r record;
begin
  for r in select p.* from public.lc106_ref_pending p join public.lc7_members m on m.id = p.referred_id
           where p.paid_at is null and lower(m.email) = lower(new.email) loop
    insert into public.lc7_token_ledger (member_id, delta, reason, ref_id) values (r.member_id, r.delta, 'referral', r.referred_id::text);
    update public.lc106_ref_pending set paid_at = now() where id = r.id;
  end loop;
  return new;
end $$;
drop trigger if exists lc106_ref_pay on public.lc59_links;
create trigger lc106_ref_pay after insert or update of email on public.lc59_links for each row execute function public._lc106_ref_pay();

-- a friend who linked first and gave the member e-mail later
create or replace function public._lc106_ref_pay_member() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare r record;
begin
  if new.email is null or not exists (select 1 from public.lc59_links where lower(email) = lower(new.email)) then return new; end if;
  for r in select * from public.lc106_ref_pending where paid_at is null and referred_id = new.id loop
    insert into public.lc7_token_ledger (member_id, delta, reason, ref_id) values (r.member_id, r.delta, 'referral', r.referred_id::text);
    update public.lc106_ref_pending set paid_at = now() where id = r.id;
  end loop;
  return new;
end $$;
drop trigger if exists lc106_ref_pay_member on public.lc7_members;
create trigger lc106_ref_pay_member after update of email on public.lc7_members for each row execute function public._lc106_ref_pay_member();

-- ---------------------------------------------------------------- 4. one clean start for the funnel (once, asked by Kyenzo on 25 Nov 2026)
-- every row so far was the owner testing or nobody: they move to lc94_funnel_archive, the funnel starts at zero.
create table if not exists public.lc94_funnel_archive (like public.lc94_funnel);
alter table public.lc94_funnel_archive add column if not exists archived_at timestamptz not null default now();
alter table public.lc94_funnel_archive enable row level security;
do $$ begin
  if not exists (select 1 from public.lc106_cfg where k = 'funnel_reset') then
    insert into public.lc94_funnel_archive select f.*, now() from public.lc94_funnel f;
    delete from public.lc94_funnel;
    insert into public.lc106_cfg (k, v) values ('funnel_reset', jsonb_build_object('at', now()));
  end if;
end $$;
revoke all on function public._lc106_ref_hold(), public._lc106_ref_pay(), public._lc106_ref_pay_member() from public, anon, authenticated;
