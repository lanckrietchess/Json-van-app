-- LC89 + LC90 (build 9.52.0, 16 Nov 2026). Idempotent: safe to run twice. Never applied by the assistant: the owner runs it in the Supabase SQL editor.
-- Needs (earlier migrations / the live project): public.is_admin() (true when auth.uid() is in public.admin_users) and public._lc_require_admin().
--
-- LC89: the inline editor ON the landing page. The owner signs in, the landing page asks the SERVER whether this session is an admin
--       (lc89_whoami), and only then shows "Edit this page". Every write is checked again on the server: a visitor who fakes the button in
--       DevTools still cannot save anything (RLS + security definer functions that call is_admin()).
-- LC90: the Day-7 Founding Member pop-up in the app. Its texts, prices, trial length, Stripe Price IDs and feature list live in the same
--       table under the key 'paywall', edited in the app (owner menu > Paywall & Founding Offer Editor). The Stripe Edge Function reads the
--       trial length and the Price IDs from here on the server, never from the browser.
--
-- Table lc89_cfg: one row per key ('landing', 'paywall'). Anyone may READ it (the landing page and the pop-up are public copy).
-- Only an admin may INSERT / UPDATE / DELETE (RLS policies below), and the app writes through lc89_cfg_save(), which also keeps a history.

create table if not exists public.lc89_cfg (
  k          text primary key check (k in ('landing', 'paywall')),
  v          jsonb not null default '{}'::jsonb check (jsonb_typeof(v) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);
alter table public.lc89_cfg enable row level security;
revoke all on table public.lc89_cfg from public, anon, authenticated;
grant select on table public.lc89_cfg to anon, authenticated;
grant insert, update, delete on table public.lc89_cfg to authenticated;   -- RLS below lets only an admin through
drop policy if exists lc89_cfg_read on public.lc89_cfg;
create policy lc89_cfg_read on public.lc89_cfg for select to anon, authenticated using (true);
drop policy if exists lc89_cfg_admin_ins on public.lc89_cfg;
create policy lc89_cfg_admin_ins on public.lc89_cfg for insert to authenticated with check (public.is_admin());
drop policy if exists lc89_cfg_admin_upd on public.lc89_cfg;
create policy lc89_cfg_admin_upd on public.lc89_cfg for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists lc89_cfg_admin_del on public.lc89_cfg;
create policy lc89_cfg_admin_del on public.lc89_cfg for delete to authenticated using (public.is_admin());

-- every save keeps the previous version (the last 30 per key), so a wrong publish can be undone in one tap
create table if not exists public.lc89_cfg_history (
  id       bigserial primary key,
  k        text not null check (k in ('landing', 'paywall')),
  v        jsonb not null,
  saved_at timestamptz not null default now(),
  saved_by text not null default ''
);
create index if not exists lc89_cfg_history_k on public.lc89_cfg_history (k, id desc);
alter table public.lc89_cfg_history enable row level security;   -- no policies: only the functions below read or write it
revoke all on table public.lc89_cfg_history from public, anon, authenticated;

-- the pop-up's own counters (shown, trial / yearly / monthly tapped, not now), one row per device, kind and day
create table if not exists public.lc89_paywall_events (
  id         bigserial primary key,
  day        date not null default (now() at time zone 'utc')::date,
  device     text not null check (char_length(device) between 4 and 64),
  email      text not null default '',
  kind       text not null check (kind in ('shown', 'trial', 'yearly', 'monthly', 'later', 'closed')),
  created_at timestamptz not null default now(),
  unique (day, device, kind)
);
create index if not exists lc89_paywall_events_email on public.lc89_paywall_events (email) where email <> '';
alter table public.lc89_paywall_events enable row level security;
revoke all on table public.lc89_paywall_events from public, anon, authenticated;

-- ---------- helpers ----------
create or replace function public._lc89_admin() returns boolean language plpgsql stable security definer set search_path = public as $$
begin return coalesce(public.is_admin(), false); exception when others then return false; end $$;
create or replace function public._lc89_email() returns text language sql stable security definer set search_path = public as $$
  select case when lower(coalesce(auth.jwt() ->> 'email', '')) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' then lower(auth.jwt() ->> 'email') else '' end $$;

-- a quick, dumb safety net for text that will be shown as (sanitised) HTML on the landing page; the page sanitises again before it renders
create or replace function public._lc89_unsafe(p jsonb) returns boolean language sql immutable as $$
  select coalesce(p::text, '') ~* '(<\s*/?\s*(script|iframe|object|embed|style|link|meta|form|svg|math)\M|javascript:|vbscript:|data:text/html|<[^>]*[\s/]on[a-z]+\s*=)' $$;

-- the Day-7 pop-up rules: never "lifetime / for life / forever" (the launch rate holds for as long as the subscription stays active),
-- Price IDs only in Stripe's own shape, trial 0 to 30 days, at most 12 feature lines
create or replace function public._lc89_paywall_error(p jsonb) returns text language plpgsql immutable as $$
declare n int;
begin
  if p ? 'trial_days' then
    if jsonb_typeof(p->'trial_days') <> 'number' then return 'trial_days'; end if;
    if (p->>'trial_days')::numeric not between 0 and 30 or (p->>'trial_days')::numeric <> floor((p->>'trial_days')::numeric) then return 'trial_days'; end if;
  end if;
  if coalesce(p->>'stripe_price_yearly', '') !~ '^(|price_[A-Za-z0-9]{6,80})$' or coalesce(p->>'stripe_price_monthly', '') !~ '^(|price_[A-Za-z0-9]{6,80})$' then return 'price_id'; end if;
  if p ? 'features' and jsonb_typeof(p->'features') <> 'array' then return 'features'; end if;
  select count(*) into n from jsonb_array_elements(coalesce(p->'features', '[]'::jsonb)); if n > 12 then return 'features'; end if;
  if p::text ~* '\m(lifetime|for life|forever)\M' then return 'wording'; end if;
  return '';
end $$;

-- ---------- who am I (the landing page shows "Edit this page" only when this says admin) ----------
create or replace function public.lc89_whoami() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', true, 'admin', public._lc89_admin(), 'signed_in', auth.uid() is not null) $$;

-- ---------- public read ----------
create or replace function public.lc89_cfg_public(p_k text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', true, 'k', p_k, 'v', coalesce((select v from public.lc89_cfg where k = p_k), '{}'::jsonb),
    'updated_at', (select updated_at from public.lc89_cfg where k = p_k)) $$;

-- ---------- owner: save (and keep the previous version) ----------
create or replace function public.lc89_cfg_save(p_k text, p_v jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare old jsonb; err text;
begin
  perform public._lc_require_admin();
  if p_k not in ('landing', 'paywall') then return jsonb_build_object('ok', false, 'error', 'key'); end if;
  if p_v is null or jsonb_typeof(p_v) <> 'object' then return jsonb_build_object('ok', false, 'error', 'shape'); end if;
  if octet_length(p_v::text) > 300000 then return jsonb_build_object('ok', false, 'error', 'too_big'); end if;
  if public._lc89_unsafe(p_v) then return jsonb_build_object('ok', false, 'error', 'unsafe'); end if;
  if p_k = 'paywall' then err := public._lc89_paywall_error(p_v); if err <> '' then return jsonb_build_object('ok', false, 'error', err); end if; end if;
  select v into old from public.lc89_cfg where k = p_k;
  if old is not null and old <> '{}'::jsonb then
    insert into public.lc89_cfg_history (k, v, saved_by) values (p_k, old, public._lc89_email());
    delete from public.lc89_cfg_history where k = p_k and id not in (select id from public.lc89_cfg_history where k = p_k order by id desc limit 30);
  end if;
  insert into public.lc89_cfg (k, v, updated_at, updated_by) values (p_k, p_v, now(), public._lc89_email())
    on conflict (k) do update set v = excluded.v, updated_at = now(), updated_by = excluded.updated_by;
  return jsonb_build_object('ok', true, 'updated_at', now());
end $$;

create or replace function public.lc89_cfg_history(p_k text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok', true, 'rows', coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'saved_at', h.saved_at, 'saved_by', h.saved_by, 'size', octet_length(h.v::text)) order by h.id desc)
    from public.lc89_cfg_history h where h.k = p_k), '[]'::jsonb));
end $$;

create or replace function public.lc89_cfg_restore(p_id bigint) returns jsonb language plpgsql security definer set search_path = public as $$
declare h public.lc89_cfg_history;
begin
  perform public._lc_require_admin();
  select * into h from public.lc89_cfg_history where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return public.lc89_cfg_save(h.k, h.v);
end $$;

-- ---------- LC90: the Day-7 pop-up's counters ----------
create or replace function public.lc89_paywall_log(p_kind text, p_device text) returns jsonb language plpgsql security definer set search_path = public as $$
declare d text := left(regexp_replace(coalesce(p_device, ''), '[^A-Za-z0-9_-]', '', 'g'), 64);
begin
  if p_kind not in ('shown', 'trial', 'yearly', 'monthly', 'later', 'closed') or char_length(d) < 4 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  insert into public.lc89_paywall_events (device, email, kind) values (d, public._lc89_email(), p_kind) on conflict (day, device, kind) do nothing;
  return jsonb_build_object('ok', true);
end $$;

-- signed in: has this account already seen the pop-up (on any device)? Plus the account's age, for the "day 7" moment.
create or replace function public.lc89_paywall_seen() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare em text := public._lc89_email();
begin
  if em = '' then return jsonb_build_object('ok', true, 'seen', false, 'signed_in', false); end if;
  return jsonb_build_object('ok', true, 'signed_in', true,
    'seen', exists(select 1 from public.lc89_paywall_events where email = em and kind = 'shown'),
    'created_at', (select created_at from auth.users where id = auth.uid()));
end $$;

create or replace function public.lc89_paywall_stats(p_days int) returns jsonb language plpgsql security definer set search_path = public as $$
declare since date := (now() at time zone 'utc')::date - greatest(1, least(coalesce(p_days, 30), 365));
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok', true, 'days', greatest(1, least(coalesce(p_days, 30), 365)), 'counts',
    coalesce((select jsonb_object_agg(kind, n) from (select kind, count(distinct device) n from public.lc89_paywall_events where day >= since group by kind) x), '{}'::jsonb));
end $$;

-- ---------- permissions ----------
revoke all on function public._lc89_admin(), public._lc89_email(), public._lc89_unsafe(jsonb), public._lc89_paywall_error(jsonb) from public, anon, authenticated;
revoke all on function public.lc89_whoami(), public.lc89_cfg_public(text), public.lc89_cfg_save(text, jsonb), public.lc89_cfg_history(text), public.lc89_cfg_restore(bigint),
  public.lc89_paywall_log(text, text), public.lc89_paywall_seen(), public.lc89_paywall_stats(int) from public, anon, authenticated;
grant execute on function public.lc89_whoami(), public.lc89_cfg_public(text), public.lc89_paywall_log(text, text), public.lc89_paywall_seen() to anon, authenticated;
grant execute on function public.lc89_cfg_save(text, jsonb), public.lc89_cfg_history(text), public.lc89_cfg_restore(bigint), public.lc89_paywall_stats(int) to authenticated;
