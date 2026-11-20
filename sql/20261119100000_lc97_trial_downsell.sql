-- LC97 (build 9.62.0, 19 Nov 2026): the Pro trial lifecycle and the post-trial downsell. Idempotent: safe to run twice.
-- LIVE since 20 Nov 2026 (applied by Claude through the Supabase connector, migration "lc97_trial_downsell", with the owner's go).
-- Needs sql/20261113100000_lc72_lc73_launch_funnels.sql (lc73_trials) and sql/20261116100000_lc89_lc90_inline_cms_founding_paywall.sql first.
--
-- What it stores, per account (e-mail, lower case):
--   lc97_member_state: subscription state (free / trialing / trial_cancelled / trial_ended / active / downsell_month / canceled),
--     trial start and end, trial_used, the post-trial pop-up flags (shown, dismissed, the choice), one_time_discount_used, and a mirror
--     of the daily token state (intro week 3 a day, free 1 a day, Pro 10 a day). The token LIMIT itself stays enforced by the Arena server.
--   lc97_downsell: the one-time "1 month of Pro" checkout. A unique index allows at most ONE open-or-paid row per e-mail, so two
--     checkouts opened at the same time can never both be paid: the offer is single use per account at the database level.
--   lc97_log: one counter row per account and choice (shown, yearly, discount, free, closed), for the owner's report.
-- Who writes what:
--   the member (signed in, through the app): lc97_state(), lc97_mark(event, device), lc97_sync_tokens(...)
--   the stripe Edge Function (service role): public._lc97_downsell_ok(email), public._lc97_note(email, kind, ref)
--   the owner (public._lc_require_admin()): lc97_admin_state(email), lc97_admin_reset(email, scope), lc97_admin_report(days)
-- The truth about trials stays public.lc73_trials (written by the stripe webhook); this file reads it and never changes it,
-- except lc97_admin_reset(..., 'all') for a TEST account (the owner's own choice).

create table if not exists public.lc97_member_state (
  email text primary key check (email = lower(email) and char_length(email) between 3 and 200),
  sub_status text not null default 'free' check (sub_status in ('free', 'trialing', 'trial_cancelled', 'trial_ended', 'active', 'downsell_month', 'canceled')),
  plan text not null default '' check (plan in ('', 'monthly', 'yearly', 'downsell', 'other')),
  trial_used boolean not null default false,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  trial_converted_at timestamptz,
  trial_cancelled boolean not null default false,
  post_trial_popup_shown_at timestamptz,
  post_trial_popup_dismissed_at timestamptz,
  post_trial_choice text not null default '' check (post_trial_choice in ('', 'yearly', 'discount', 'free', 'closed')),
  one_time_discount_used boolean not null default false,
  discount_session text,
  discount_claimed_at timestamptz,
  token_phase text not null default '' check (token_phase in ('', 'intro', 'free', 'trial', 'pro', 'vip')),
  tokens_per_day int check (tokens_per_day is null or tokens_per_day between 0 and 1000),
  intro_ends_at timestamptz,
  tokens_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now());

create table if not exists public.lc97_downsell (
  session_id text primary key check (char_length(session_id) between 8 and 220),
  email text not null check (email = lower(email)),
  status text not null default 'open' check (status in ('open', 'paid', 'expired')),
  url text not null default '' check (char_length(url) <= 2000),
  amount_cents int not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  paid_at timestamptz);
create unique index if not exists lc97_downsell_one_live on public.lc97_downsell(email) where status in ('open', 'paid');

create table if not exists public.lc97_log (
  email text not null, kind text not null check (kind in ('shown', 'yearly', 'discount', 'free', 'closed', 'paid')),
  device text not null default '', created_at timestamptz not null default now(), primary key (email, kind));

alter table public.lc97_member_state enable row level security;
alter table public.lc97_downsell enable row level security;
alter table public.lc97_log enable row level security;
revoke all on public.lc97_member_state, public.lc97_downsell, public.lc97_log from anon, authenticated;

-- how long the downsell stays open after the pop-up was first shown (hours). One week.
create or replace function public._lc97_window() returns interval language sql immutable as $$ select interval '168 hours' $$;

-- brings an account's row up to date from lc73_trials (the webhook's truth) and public.licenses; returns the row
create or replace function public._lc97_refresh(p_email text) returns public.lc97_member_state language plpgsql security definer set search_path = public as $$
declare e text := lower(coalesce(p_email, '')); s public.lc97_member_state; t record; lic record; ever boolean := false; st text; pl text := '';
begin
  if e !~ '^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,24}$' then raise exception 'bad_email'; end if;
  insert into public.lc97_member_state(email) values (e) on conflict (email) do nothing;
  select * into s from public.lc97_member_state where email = e for update;
  if to_regclass('public.lc73_trials') is not null then
    select x.started_at, x.trial_end, x.converted_at, x.cancelled into t from public.lc73_trials x where x.email = e order by x.started_at desc limit 1;
    if found then
      s.trial_used := true; s.trial_started_at := t.started_at; s.trial_ends_at := t.trial_end; s.trial_converted_at := t.converted_at; s.trial_cancelled := coalesce(t.cancelled, false);
    end if;
  end if;
  select l.tier, l.expires_at, coalesce(l.flags, '{}'::jsonb) as flags into lic from public.licenses l
    where lower(l.email) = e and l.tier >= 2 and coalesce(l.revoked, false) = false and (l.expires_at > now() or coalesce(l.lifetime, false))
    order by (coalesce(l.flags->>'plan', '') = 'downsell') asc, l.expires_at desc nulls first limit 1;
  ever := exists (select 1 from public.licenses l where lower(l.email) = e and l.tier >= 2);
  if lic.tier is not null then
    pl := case when lic.flags->>'plan' in ('monthly', 'yearly', 'downsell') then lic.flags->>'plan' else 'other' end;
    if pl = 'downsell' then st := 'downsell_month';
    elsif s.trial_used and s.trial_converted_at is null and s.trial_ends_at > now() then st := case when s.trial_cancelled then 'trial_cancelled' else 'trialing' end;
    else st := 'active'; end if;
  elsif s.trial_used and s.trial_converted_at is null then st := 'trial_ended';
  elsif ever then st := 'canceled';
  else st := 'free'; end if;
  update public.lc97_member_state set sub_status = st, plan = pl, trial_used = s.trial_used, trial_started_at = s.trial_started_at, trial_ends_at = s.trial_ends_at,
    trial_converted_at = s.trial_converted_at, trial_cancelled = s.trial_cancelled, updated_at = now() where email = e returning * into s;
  return s;
end $$;

-- the post-trial offer is open: the trial ended without converting, nothing paid is active, the discount was never used, the pop-up
-- was not dismissed, and (once shown) less than a week passed since it was first shown
create or replace function public._lc97_offer_open(s public.lc97_member_state) returns boolean language sql stable set search_path = public as $$
  select s.trial_used and s.trial_converted_at is null and s.trial_ends_at is not null and s.trial_ends_at <= now()
    and s.sub_status in ('trial_ended', 'canceled', 'free') and not s.one_time_discount_used and s.post_trial_popup_dismissed_at is null
    and (s.post_trial_popup_shown_at is null or s.post_trial_popup_shown_at > now() - public._lc97_window())
    and not exists (select 1 from public.lc97_downsell d where d.email = s.email and d.status = 'paid') $$;

create or replace function public._lc97_state_of(p_email text) returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.lc97_member_state; active boolean; offer boolean; dl record;
begin
  s := public._lc97_refresh(p_email);
  active := s.sub_status in ('trialing', 'trial_cancelled', 'active', 'downsell_month');
  offer := public._lc97_offer_open(s);
  select d.session_id, d.expires_at into dl from public.lc97_downsell d where d.email = s.email and d.status = 'open' and d.expires_at > now() limit 1;
  return jsonb_build_object('ok', true, 'signed_in', true, 'server_now', now(), 'sub_status', s.sub_status, 'plan', s.plan, 'active', active,
    'trial', jsonb_build_object('used', s.trial_used, 'started_at', s.trial_started_at, 'ends_at', s.trial_ends_at, 'converted_at', s.trial_converted_at,
      'cancelled', s.trial_cancelled, 'running', s.sub_status in ('trialing', 'trial_cancelled'),
      'days_left', case when s.sub_status in ('trialing', 'trial_cancelled') then greatest(0, ceil(extract(epoch from (s.trial_ends_at - now())) / 86400.0))::int else 0 end),
    'trial_eligible', not s.trial_used and not active,
    'post_trial', jsonb_build_object('offer_open', offer, 'popup_due', offer and s.post_trial_popup_shown_at is null, 'shown_at', s.post_trial_popup_shown_at,
      'dismissed_at', s.post_trial_popup_dismissed_at, 'choice', s.post_trial_choice,
      'offer_until', case when s.post_trial_popup_shown_at is null then null else s.post_trial_popup_shown_at + public._lc97_window() end),
    'discount', jsonb_build_object('used', s.one_time_discount_used, 'claimed_at', s.discount_claimed_at, 'checkout_open', dl.session_id is not null),
    'tokens', jsonb_build_object('phase', s.token_phase, 'per_day', s.tokens_per_day, 'intro_ends_at', s.intro_ends_at, 'synced_at', s.tokens_synced_at));
end $$;

-- the signed-in member's own state (the app's single source for the trial and the post-trial pop-up)
create or replace function public.lc97_state() returns jsonb language plpgsql security definer set search_path = public as $$
declare e text := lower(coalesce(public._lc26_email(), ''));
begin
  if e = '' then return jsonb_build_object('ok', true, 'signed_in', false); end if;
  return public._lc97_state_of(e);
end $$;

-- the member's pop-up events: shown (only while the offer is open), yearly / discount (a checkout button), free / closed (dismissed for good)
create or replace function public.lc97_mark(p_event text, p_device text) returns jsonb language plpgsql security definer set search_path = public as $$
declare e text := lower(coalesce(public._lc26_email(), '')); s public.lc97_member_state; ev text := lower(coalesce(p_event, ''));
  d text := left(regexp_replace(coalesce(p_device, ''), '[^A-Za-z0-9_-]', '', 'g'), 64);
begin
  if e = '' then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  if ev not in ('shown', 'yearly', 'discount', 'free', 'closed') then return jsonb_build_object('ok', false, 'error', 'bad_event'); end if;
  s := public._lc97_refresh(e);
  if not public._lc97_offer_open(s) then return jsonb_build_object('ok', false, 'error', 'not_eligible', 'state', public._lc97_state_of(e)); end if;
  if ev = 'shown' then
    update public.lc97_member_state set post_trial_popup_shown_at = coalesce(post_trial_popup_shown_at, now()), updated_at = now() where email = e;
  elsif ev in ('free', 'closed') then
    update public.lc97_member_state set post_trial_popup_shown_at = coalesce(post_trial_popup_shown_at, now()), post_trial_popup_dismissed_at = now(),
      post_trial_choice = ev, updated_at = now() where email = e;
  else
    update public.lc97_member_state set post_trial_popup_shown_at = coalesce(post_trial_popup_shown_at, now()), post_trial_choice = ev, updated_at = now() where email = e;
  end if;
  insert into public.lc97_log(email, kind, device) values (e, ev, d) on conflict do nothing;
  return public._lc97_state_of(e);
end $$;

-- a mirror of the device's daily token state, for the owner's view and other devices. The Arena server still enforces the limit.
create or replace function public.lc97_sync_tokens(p_phase text, p_per_day int, p_intro_ends timestamptz) returns jsonb language plpgsql security definer set search_path = public as $$
declare e text := lower(coalesce(public._lc26_email(), '')); ph text := lower(coalesce(p_phase, ''));
begin
  if e = '' then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  if ph not in ('intro', 'free', 'trial', 'pro', 'vip') or p_per_day is null or p_per_day not between 0 and 1000 then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;
  if p_intro_ends is not null and (p_intro_ends < now() - interval '400 days' or p_intro_ends > now() + interval '30 days') then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;
  insert into public.lc97_member_state(email) values (e) on conflict (email) do nothing;
  update public.lc97_member_state set token_phase = ph, tokens_per_day = p_per_day, intro_ends_at = coalesce(p_intro_ends, intro_ends_at), tokens_synced_at = now(), updated_at = now()
    where email = e and (tokens_synced_at is null or tokens_synced_at < now() - interval '5 minutes' or token_phase <> ph or tokens_per_day is distinct from p_per_day);
  return jsonb_build_object('ok', true);
end $$;

-- for the stripe function (service role only): may this e-mail open the one-time downsell checkout now? 'ok' or the reason
create or replace function public._lc97_downsell_ok(p_email text) returns text language plpgsql security definer set search_path = public as $$
declare s public.lc97_member_state;
begin
  s := public._lc97_refresh(p_email);
  if s.one_time_discount_used or exists (select 1 from public.lc97_downsell d where d.email = s.email and d.status = 'paid') then return 'used'; end if;
  if s.sub_status in ('trialing', 'trial_cancelled', 'active', 'downsell_month') then return 'already_member'; end if;
  if not s.trial_used then return 'no_trial'; end if;
  if s.trial_converted_at is not null then return 'already_member'; end if;
  if s.trial_ends_at is null or s.trial_ends_at > now() then return 'trial_running'; end if;
  if s.post_trial_popup_shown_at is null then return 'not_offered'; end if;   -- the offer only exists inside the post-trial pop-up
  if s.post_trial_popup_dismissed_at is not null then return 'dismissed'; end if;
  if s.post_trial_popup_shown_at <= now() - public._lc97_window() then return 'offer_expired'; end if;
  return 'ok';
end $$;

-- for the stripe function: a trial or payment event happened for this e-mail
create or replace function public._lc97_note(p_email text, p_kind text, p_ref text) returns void language plpgsql security definer set search_path = public as $$
declare e text := lower(coalesce(p_email, ''));
begin
  if e !~ '^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,24}$' then return; end if;
  perform public._lc97_refresh(e);
  if p_kind = 'downsell_paid' then
    update public.lc97_member_state set one_time_discount_used = true, discount_session = left(coalesce(p_ref, ''), 220), discount_claimed_at = coalesce(discount_claimed_at, now()),
      post_trial_choice = 'discount', post_trial_popup_dismissed_at = coalesce(post_trial_popup_dismissed_at, now()), updated_at = now() where email = e;
    insert into public.lc97_log(email, kind) values (e, 'paid') on conflict do nothing;
    perform public._lc97_refresh(e);
  end if;
end $$;

-- owner: any account's state, a reset for TEST accounts, and the counters
create or replace function public.lc97_admin_state(p_email text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return public._lc97_state_of(lower(coalesce(p_email, '')));
end $$;

create or replace function public.lc97_admin_reset(p_email text, p_scope text) returns jsonb language plpgsql security definer set search_path = public as $$
declare e text := lower(coalesce(p_email, '')); sc text := lower(coalesce(p_scope, ''));
begin
  perform public._lc_require_admin();
  if sc not in ('popup', 'discount', 'all') then return jsonb_build_object('ok', false, 'error', 'bad_scope'); end if;
  if not exists (select 1 from public.lc97_member_state where email = e) then perform public._lc97_refresh(e); end if;
  update public.lc97_member_state set post_trial_popup_shown_at = null, post_trial_popup_dismissed_at = null, post_trial_choice = '', updated_at = now() where email = e;
  delete from public.lc97_log where email = e and kind in ('shown', 'yearly', 'discount', 'free', 'closed');
  if sc in ('discount', 'all') then
    update public.lc97_member_state set one_time_discount_used = false, discount_session = null, discount_claimed_at = null where email = e;
    delete from public.lc97_downsell where email = e;
    delete from public.lc97_log where email = e and kind = 'paid';
  end if;
  if sc = 'all' and to_regclass('public.lc73_trials') is not null then
    delete from public.lc73_trials where email = e;
    update public.lc97_member_state set trial_used = false, trial_started_at = null, trial_ends_at = null, trial_converted_at = null, trial_cancelled = false where email = e;
  end if;
  return public._lc97_state_of(e);
end $$;

create or replace function public.lc97_admin_report(p_days int) returns jsonb language plpgsql security definer set search_path = public as $$
declare f timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok', true, 'days', greatest(1, least(coalesce(p_days, 30), 365)),
    'trials_started', (select count(*) from public.lc97_member_state where trial_started_at >= f),
    'trialing_now', (select count(*) from public.lc97_member_state where sub_status in ('trialing', 'trial_cancelled')),
    'trial_ended_unconverted', (select count(*) from public.lc97_member_state where trial_used and trial_converted_at is null and trial_ends_at >= f and trial_ends_at <= now()),
    'converted', (select count(*) from public.lc97_member_state where trial_converted_at >= f),
    'popup_shown', (select count(*) from public.lc97_log where kind = 'shown' and created_at >= f),
    'chose_yearly', (select count(*) from public.lc97_log where kind = 'yearly' and created_at >= f),
    'chose_discount', (select count(*) from public.lc97_log where kind = 'discount' and created_at >= f),
    'chose_free', (select count(*) from public.lc97_log where kind = 'free' and created_at >= f),
    'closed', (select count(*) from public.lc97_log where kind = 'closed' and created_at >= f),
    'discount_paid', (select count(*) from public.lc97_downsell where status = 'paid' and paid_at >= f));
end $$;

-- rights: members call the three member functions; the owner's functions check the admin themselves; the internal ones are service-role only
revoke all on function public._lc97_refresh(text), public._lc97_offer_open(public.lc97_member_state), public._lc97_state_of(text), public._lc97_downsell_ok(text),
  public._lc97_note(text, text, text) from public, anon, authenticated;
revoke all on function public.lc97_state(), public.lc97_mark(text, text), public.lc97_sync_tokens(text, int, timestamptz),
  public.lc97_admin_state(text), public.lc97_admin_reset(text, text), public.lc97_admin_report(int) from public, anon;
grant execute on function public.lc97_state(), public.lc97_mark(text, text), public.lc97_sync_tokens(text, int, timestamptz),
  public.lc97_admin_state(text), public.lc97_admin_reset(text, text), public.lc97_admin_report(int) to authenticated;

-- backfill: every account that already had a trial gets its row (nothing is shown or charged by this)
do $$ declare r record; begin
  if to_regclass('public.lc73_trials') is null then return; end if;
  for r in select distinct email from public.lc73_trials where email ~ '^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,24}$' loop
    perform public._lc97_refresh(r.email);
  end loop;
end $$;
