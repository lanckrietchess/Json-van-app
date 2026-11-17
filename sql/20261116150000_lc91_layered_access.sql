-- LC91 (build 9.53.0, 16 Nov 2026): layered access. Idempotent: safe to run twice. Never applied by the assistant: the owner runs it in the
-- Supabase SQL editor, AFTER sql/20261116100000_lc89_lc90_inline_cms_founding_paywall.sql.
-- The Day-7 pop-up (LC90) now has a VIP path next to Pro. This file:
--   1. lets the pop-up count "vip" taps (lc89_paywall_events.kind),
--   2. checks the VIP feature list like the Pro one (an array, at most 12 lines) when the owner saves the pop-up.
-- The level access switches (beginner_in_week, strict_lock) are plain booleans in the same 'paywall' row: nothing to change for them.

alter table public.lc89_paywall_events drop constraint if exists lc89_paywall_events_kind_check;
alter table public.lc89_paywall_events add constraint lc89_paywall_events_kind_check
  check (kind in ('shown', 'trial', 'yearly', 'monthly', 'vip', 'later', 'closed'));

create or replace function public._lc89_paywall_error(p jsonb) returns text language plpgsql immutable as $$
declare n int; f text;
begin
  if p ? 'trial_days' then
    if jsonb_typeof(p->'trial_days') <> 'number' then return 'trial_days'; end if;
    if (p->>'trial_days')::numeric not between 0 and 30 or (p->>'trial_days')::numeric <> floor((p->>'trial_days')::numeric) then return 'trial_days'; end if;
  end if;
  if coalesce(p->>'stripe_price_yearly', '') !~ '^(|price_[A-Za-z0-9]{6,80})$' or coalesce(p->>'stripe_price_monthly', '') !~ '^(|price_[A-Za-z0-9]{6,80})$' then return 'price_id'; end if;
  foreach f in array array['features', 'vip_features'] loop
    if p ? f and jsonb_typeof(p->f) <> 'array' then return 'features'; end if;
    select count(*) into n from jsonb_array_elements(case when jsonb_typeof(p->f) = 'array' then p->f else '[]'::jsonb end);
    if n > 12 then return 'features'; end if;
  end loop;
  if p::text ~* '\m(lifetime|for life|forever)\M' then return 'wording'; end if;
  return '';
end $$;

create or replace function public.lc89_paywall_log(p_kind text, p_device text) returns jsonb language plpgsql security definer set search_path = public as $$
declare d text := left(regexp_replace(coalesce(p_device, ''), '[^A-Za-z0-9_-]', '', 'g'), 64);
begin
  if p_kind not in ('shown', 'trial', 'yearly', 'monthly', 'vip', 'later', 'closed') or char_length(d) < 4 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  insert into public.lc89_paywall_events (device, email, kind) values (d, public._lc89_email(), p_kind) on conflict (day, device, kind) do nothing;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public._lc89_paywall_error(jsonb) from public, anon, authenticated;
revoke all on function public.lc89_paywall_log(text, text) from public, anon, authenticated;
grant execute on function public.lc89_paywall_log(text, text) to anon, authenticated;
