-- 9.75.0 (LC106 v2 + LC107): the Sprint reward becomes a 13th month on the yearly plan, a week-1 XP goal keeps the 3 tokens a day
-- for one more week, and the reward has a real 48-hour deadline. Idempotent: safe to run again. Needs 20261125100000_lc106_*.sql.
--
-- 1. Sprint reward (cfg 'main' -> reward 'month' | 'pct'): reach EITHER goal (the XP goal or the rating target) and the reward is
--    fixed on the row (reward_at, reward_kind, pct: a later config change never changes what was promised). It stays open until
--    reward_hours (48) after the later of the Sprint's end and the member's trial end, and is used once.
--      month: the yearly Pro or VIP plan runs 13 months for the price of 12 (the stripe function moves the first renewal 30 days).
--      pct:   pct % off the first payment (the 9.74.0 behaviour, kept for the owner to switch back).
-- 2. Week-1 goal: week1_xp (500) XP in the first week1_days (7) days of the Sprint -> week1_tokens (14) bonus tokens, once
--    (= 2 extra a day for a week: the 3 a day of the intro week for one more week). Paid through public.lc36_token_credits,
--    like the rating milestones (LC59); the app claims it with LC36.tokens.claim.

update public.lc106_cfg set v = v || jsonb_build_object('reward', 'month', 'reward_hours', 48, 'week1_xp', 500, 'week1_days', 7, 'week1_tokens', 14),
  updated_at = now() where k = 'main' and not (v ? 'reward');

alter table public.lc106_sprint add column if not exists reward_at timestamptz;
alter table public.lc106_sprint add column if not exists reward_kind text;
alter table public.lc106_sprint add column if not exists week1_done_at timestamptz;
update public.lc106_sprint set reward_at = coalesce(xp_done_at, rating_done_at), reward_kind = 'pct'
  where reward_at is null and (xp_done_at is not null or rating_done_at is not null) and pct > 0;   -- a 9.74.0 promise stays what it was

create or replace function public._lc106_trial_end(p_email text) returns timestamptz language plpgsql stable security definer set search_path = public, pg_temp as $$
declare t timestamptz;
begin
  if to_regclass('public.lc73_trials') is null then return null; end if;
  execute 'select max(trial_end) from public.lc73_trials where lower(email) = lower($1)' into t using p_email;
  return t;
end $$;

-- the deadline of a reached reward: reward_hours after the later of the Sprint's end and the trial's end
create or replace function public._lc106_until(s public.lc106_sprint) returns timestamptz language sql stable security definer set search_path = public, pg_temp as $$
  select case when s.reward_at is null then null
    else greatest(s.ends_at, coalesce(public._lc106_trial_end(s.email), s.ends_at))
         + make_interval(hours => coalesce((public._lc106_cfg() ->> 'reward_hours')::int, 48)) end
$$;

create or replace function public._lc106_view(s public.lc106_sprint) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare l public.lc59_links%rowtype; cur integer; c jsonb := public._lc106_cfg(); u timestamptz := public._lc106_until(s);
        w1d integer := coalesce((c ->> 'week1_days')::int, 7);
begin
  select * into l from public.lc59_links where user_id = s.user_id;
  cur := coalesce(l.last_rating, s.start_rating);
  return jsonb_build_object('ok', true, 'joined', true, 'started_at', s.started_at, 'ends_at', s.ends_at,
    'days_left', greatest(0, ceil(extract(epoch from (s.ends_at - now())) / 86400)::int), 'over', now() >= s.ends_at,
    'site', s.site, 'uname', s.uname, 'start', s.start_rating, 'now', cur, 'gain', cur - s.start_rating, 'target', s.target,
    'best', greatest(coalesce(s.best_rating, s.start_rating), cur), 'rating_at', l.last_at,
    'xp', greatest(0, s.xp_now - s.xp_start), 'xp_goal', s.xp_goal,
    'xp_done', s.xp_done_at is not null, 'rating_done', s.rating_done_at is not null,
    'reward_kind', coalesce(s.reward_kind, c ->> 'reward', 'month'), 'pct', case when s.reward_at is null then coalesce((c ->> 'pct')::int, 20) else s.pct end,
    'reward_at', s.reward_at, 'reward_until', u, 'reward_used', s.reward_used_at is not null,
    'reward_active', s.reward_at is not null and s.reward_used_at is null and u > now(),
    'week1_xp', coalesce((c ->> 'week1_xp')::int, 500), 'week1_tokens', coalesce((c ->> 'week1_tokens')::int, 14),
    'week1_until', s.started_at + make_interval(days => w1d), 'week1_done', s.week1_done_at is not null);
end $$;

create or replace function public.lc106_progress(p_xp integer) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); s public.lc106_sprint%rowtype; l public.lc59_links%rowtype; c jsonb := public._lc106_cfg();
        cap integer; nx integer; cur integer; w1 boolean := false; v jsonb;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'sign_in'); end if;
  select * into s from public.lc106_sprint where user_id = uid for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_joined'); end if;
  if now() < s.ends_at and p_xp is not null and p_xp > s.xp_now then
    -- at most xp_day_max XP a day since the last report (so no goal can be reached in one go)
    cap := ceil(coalesce((c ->> 'xp_day_max')::int, 2500) * greatest(extract(epoch from (now() - s.xp_at)) / 86400, 0.04))::int;
    nx := least(p_xp, s.xp_now + cap);
    update public.lc106_sprint set xp_now = nx, xp_at = now() where user_id = uid;
    s.xp_now := nx;
    if s.xp_done_at is null and nx - s.xp_start >= s.xp_goal then
      update public.lc106_sprint set xp_done_at = now() where user_id = uid; s.xp_done_at := now();
    end if;
  end if;
  -- the week-1 goal: the 3 a day for one more week, as bonus tokens, once
  if s.week1_done_at is null and now() <= s.started_at + make_interval(days => coalesce((c ->> 'week1_days')::int, 7))
     and s.xp_now - s.xp_start >= coalesce((c ->> 'week1_xp')::int, 500) then
    update public.lc106_sprint set week1_done_at = now() where user_id = uid;
    if to_regclass('public.lc36_token_credits') is not null and coalesce((c ->> 'week1_tokens')::int, 14) > 0 then
      execute 'insert into public.lc36_token_credits (email, tokens, pack, amount_cents, session_id) values ($1, $2, ''sprint_week1'', 0, $3) on conflict (session_id) do nothing'
        using s.email, coalesce((c ->> 'week1_tokens')::int, 14), 'sp1:' || uid::text;
    end if;
    w1 := true;
  end if;
  select * into l from public.lc59_links where user_id = uid;
  cur := l.last_rating;
  if cur is not null then
    update public.lc106_sprint set best_rating = greatest(coalesce(best_rating, start_rating), cur) where user_id = uid;
    if s.rating_done_at is null and now() <= s.ends_at + interval '1 day' and cur - s.start_rating >= s.target then
      update public.lc106_sprint set rating_done_at = now() where user_id = uid; s.rating_done_at := now();
    end if;
  end if;
  -- either goal fixes the reward on the row (what was promised does not change with the config)
  if s.reward_at is null and (s.xp_done_at is not null or s.rating_done_at is not null) and now() <= s.ends_at + interval '1 day' then
    update public.lc106_sprint set reward_at = now(), reward_kind = coalesce(c ->> 'reward', 'month'), pct = coalesce((c ->> 'pct')::int, 20)
      where user_id = uid;
  end if;
  select * into s from public.lc106_sprint where user_id = uid;
  v := public._lc106_view(s);
  return v || jsonb_build_object('week1_new', w1);
end $$;

-- for the stripe function (service role): the reward of this e-mail, null when there is none
create or replace function public._lc106_reward(p_email text) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare s public.lc106_sprint%rowtype; u timestamptz;
begin
  select * into s from public.lc106_sprint where lower(email) = lower(p_email) and reward_at is not null and reward_used_at is null
    order by reward_at desc limit 1;
  if not found then return null; end if;
  u := public._lc106_until(s);
  if u is null or u <= now() then return null; end if;
  return jsonb_build_object('kind', coalesce(s.reward_kind, 'month'), 'pct', s.pct, 'until', u);
end $$;
create or replace function public._lc106_reward_pct(p_email text) returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((case when r ->> 'kind' = 'pct' then (r ->> 'pct')::int end), 0) from (select public._lc106_reward(p_email) r) x
$$;
revoke all on function public._lc106_reward(text), public._lc106_reward_pct(text), public._lc106_trial_end(text), public._lc106_until(public.lc106_sprint)
  from public, anon, authenticated;

create or replace function public.lc106_admin() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'reason', 'owner_only'); end if;
  return jsonb_build_object('ok', true, 'cfg', public._lc106_cfg(), 'rows', coalesce((select jsonb_agg(jsonb_build_object(
    'email', s.email, 'site', s.site, 'uname', s.uname, 'started_at', s.started_at, 'ends_at', s.ends_at, 'start', s.start_rating,
    'now', l.last_rating, 'target', s.target, 'xp', s.xp_now - s.xp_start, 'xp_goal', s.xp_goal, 'xp_done', s.xp_done_at,
    'rating_done', s.rating_done_at, 'week1_done', s.week1_done_at, 'reward_at', s.reward_at, 'reward_kind', s.reward_kind, 'pct', s.pct,
    'reward_until', public._lc106_until(s), 'reward_used', s.reward_used_at, 'proof_ok', s.proof_ok) order by s.started_at desc)
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
  if p_v ->> 'reward' in ('month', 'pct') then v := v || jsonb_build_object('reward', p_v ->> 'reward'); end if;
  if p_v ? 'reward_hours' then v := v || jsonb_build_object('reward_hours', least(greatest((p_v ->> 'reward_hours')::int, 1), 336)); end if;
  if p_v ? 'week1_xp' then v := v || jsonb_build_object('week1_xp', least(greatest((p_v ->> 'week1_xp')::int, 50), 50000)); end if;
  if p_v ? 'week1_days' then v := v || jsonb_build_object('week1_days', least(greatest((p_v ->> 'week1_days')::int, 1), 14)); end if;
  if p_v ? 'week1_tokens' then v := v || jsonb_build_object('week1_tokens', least(greatest((p_v ->> 'week1_tokens')::int, 0), 100)); end if;
  if jsonb_typeof(p_v -> 'targets') = 'array' then v := v || jsonb_build_object('targets', p_v -> 'targets'); end if;
  insert into public.lc106_cfg (k, v, updated_at) values ('main', v, now()) on conflict (k) do update set v = excluded.v, updated_at = now();
  return jsonb_build_object('ok', true, 'cfg', v);
end $$;

revoke all on function public._lc106_view(public.lc106_sprint), public.lc106_progress(integer), public.lc106_admin(), public.lc106_cfg_save(jsonb) from public, anon;
grant execute on function public.lc106_progress(integer), public.lc106_admin(), public.lc106_cfg_save(jsonb) to authenticated;
