-- LC99 (9.64.0, 22 Nov 2026): proof of the withdrawal waiver, and "your EUR 25 counts toward the year".
-- 1. lc99_consents: one row per time a member ticked the box "Pro starts right away, I give up my 14-day right of withdrawal" before a
--    checkout: the flow (trial / downsell / annual25 / yearly / monthly / vip), the wording version AND the exact wording shown, the Stripe
--    session (when the stripe function made the checkout), the device and where the row came from (server = written by the stripe function
--    after Stripe made the session; app = written by the member's own session right before a Payment Link). Kept as evidence for the shop.
-- 2. The one-time Pro month (LC97 downsell, EUR 25 paid once) now leads somewhere: during that month and 7 days after it, the member may
--    switch to the yearly plan with the amount they paid for the month taken off the first year (Stripe coupon, once). The database decides
--    (public._lc99_annual25_ok), at most once per account (lc97_member_state.annual25_used_at, set by the webhook).
-- Needs: sql/20261119100000_lc97_trial_downsell.sql (lc97_member_state, lc97_downsell, _lc97_refresh). Runs twice safely.

create table if not exists public.lc99_consents (
  id         bigserial primary key,
  email      text not null,
  flow       text not null check (flow in ('trial', 'downsell', 'annual25', 'yearly', 'monthly', 'vip')),
  version    text not null check (char_length(version) between 1 and 40),
  wording    text not null check (char_length(wording) between 1 and 1200),
  session_id text not null default '',
  device     text not null default '',
  source     text not null default 'server' check (source in ('server', 'app')),
  created_at timestamptz not null default now()
);
create index if not exists lc99_consents_email on public.lc99_consents(email, created_at desc);
alter table public.lc99_consents enable row level security;   -- no policies: only the functions below write it, only the owner reads it
revoke all on table public.lc99_consents from public, anon, authenticated;

alter table public.lc97_member_state add column if not exists annual25_used_at timestamptz;
alter table public.lc97_member_state add column if not exists annual25_session text;

create or replace function public._lc99_annual25_window() returns interval language sql immutable as $$ select interval '37 days' $$;   -- the 30-day month + 7 days

-- for the stripe function: may this e-mail switch to yearly with its paid month taken off? 'ok' or the reason
create or replace function public._lc99_annual25_ok(p_email text) returns text language plpgsql security definer set search_path = public as $$
declare e text := lower(coalesce(p_email, '')); s public.lc97_member_state; d record;
begin
  if e !~ '^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,24}$' then return 'sign_in'; end if;
  s := public._lc97_refresh(e);
  select x.amount_cents, x.paid_at, x.session_id into d from public.lc97_downsell x where x.email = e and x.status = 'paid' order by x.paid_at desc nulls last limit 1;
  if d.paid_at is null then return 'no_month'; end if;
  if s.annual25_used_at is not null then return 'used'; end if;
  if d.paid_at <= now() - public._lc99_annual25_window() then return 'expired'; end if;
  -- an active paid subscription (anything but the one-time month itself) already covers this account
  if exists (select 1 from public.licenses l where lower(l.email) = e and l.tier >= 2 and coalesce(l.revoked, false) = false and l.expires_at > now()
             and coalesce(l.flags->>'plan', '') <> 'downsell' and coalesce(l.flags->>'one_time', 'false') <> 'true') then return 'already_member'; end if;
  return 'ok';
end $$;

-- the credit: what the member really paid for the month (cents), never more than 10,000
create or replace function public._lc99_annual25_credit(p_email text) returns int language sql stable security definer set search_path = public as $$
  select least(10000, greatest(0, coalesce((select x.amount_cents from public.lc97_downsell x where x.email = lower(coalesce(p_email, '')) and x.status = 'paid'
    order by x.paid_at desc nulls last limit 1), 0)))::int $$;

-- the member's own view (the app's Upgrades page): may I switch, until when, and how much counts
create or replace function public.lc99_state() returns jsonb language plpgsql security definer set search_path = public as $$
declare e text := public._lc26_email(); why text; d record;
begin
  if e is null or e = '' then return jsonb_build_object('ok', true, 'signed_in', false); end if;
  why := public._lc99_annual25_ok(e);
  select x.paid_at into d from public.lc97_downsell x where x.email = e and x.status = 'paid' order by x.paid_at desc nulls last limit 1;
  return jsonb_build_object('ok', true, 'signed_in', true, 'annual25', jsonb_build_object('status', why, 'credit_cents', public._lc99_annual25_credit(e),
    'until', case when d.paid_at is null then null else d.paid_at + public._lc99_annual25_window() end));
end $$;

-- for the stripe function: store the waiver it just sent to Stripe (best effort there: a missing table is logged, never blocks a payment)
create or replace function public._lc99_consent(p_email text, p_flow text, p_version text, p_wording text, p_session text, p_device text) returns void
language plpgsql security definer set search_path = public as $$
declare e text := lower(coalesce(p_email, ''));
begin
  if e !~ '^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,24}$' then return; end if;
  insert into public.lc99_consents (email, flow, version, wording, session_id, device, source)
  values (e, p_flow, left(coalesce(p_version, ''), 40), left(coalesce(p_wording, ''), 1200), left(coalesce(p_session, ''), 220),
          left(regexp_replace(coalesce(p_device, ''), '[^A-Za-z0-9_-]', '', 'g'), 64), 'server');
end $$;

-- for the member's own session, right before a Payment Link (those checkouts do not pass our server): at most 30 rows a day per account
create or replace function public.lc99_consent_note(p_flow text, p_version text, p_wording text, p_device text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e text := public._lc26_email();
begin
  if e is null or e = '' then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  if p_flow not in ('yearly', 'monthly', 'vip') then return jsonb_build_object('ok', false, 'error', 'flow'); end if;
  if coalesce(p_version, '') !~ '^[A-Za-z0-9._-]{1,40}$' then return jsonb_build_object('ok', false, 'error', 'version'); end if;
  if char_length(coalesce(p_wording, '')) not between 20 and 1200 then return jsonb_build_object('ok', false, 'error', 'wording'); end if;
  if (select count(*) from public.lc99_consents c where c.email = e and c.created_at > now() - interval '1 day') >= 30 then return jsonb_build_object('ok', false, 'error', 'slow_down'); end if;
  insert into public.lc99_consents (email, flow, version, wording, device, source)
  values (e, p_flow, p_version, p_wording, left(regexp_replace(coalesce(p_device, ''), '[^A-Za-z0-9_-]', '', 'g'), 64), 'app');
  return jsonb_build_object('ok', true);
end $$;

-- for the stripe function (webhook): the yearly plan with the month's credit was paid
create or replace function public._lc99_note(p_email text, p_kind text, p_ref text) returns void language plpgsql security definer set search_path = public as $$
declare e text := lower(coalesce(p_email, ''));
begin
  if e !~ '^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,24}$' then return; end if;
  perform public._lc97_refresh(e);
  if p_kind = 'annual25_paid' then
    update public.lc97_member_state set annual25_used_at = coalesce(annual25_used_at, now()), annual25_session = coalesce(annual25_session, left(coalesce(p_ref, ''), 220)) where email = e;
  end if;
end $$;

-- the owner: the latest consents (all, or one account)
create or replace function public.lc99_admin_consents(p_email text, p_limit int) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok', true, 'rows', coalesce((select jsonb_agg(to_jsonb(c) order by c.id desc) from (select * from public.lc99_consents
    where coalesce(p_email, '') = '' or email = lower(p_email) order by id desc limit least(greatest(coalesce(p_limit, 50), 1), 500)) c), '[]'::jsonb));
end $$;

revoke all on function public._lc99_annual25_window(), public._lc99_annual25_ok(text), public._lc99_annual25_credit(text), public._lc99_consent(text, text, text, text, text, text),
  public._lc99_note(text, text, text) from public, anon, authenticated;
revoke all on function public.lc99_state(), public.lc99_consent_note(text, text, text, text), public.lc99_admin_consents(text, int) from public, anon;
grant execute on function public.lc99_state(), public.lc99_consent_note(text, text, text, text), public.lc99_admin_consents(text, int) to authenticated;
