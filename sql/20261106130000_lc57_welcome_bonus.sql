-- LC57 (build 9.31.0): "Opt-In Incentive". A member who ticks the e-mail box gets a welcome mail with a bonus key worth 1 token.
-- The key can be used ONCE per account (and once per e-mail address, so deleting and re-creating an account does not give a second token).
-- Needs: public._lc26_email(), public.lc36_email_consent + public.lc36_consent_set (sql/20261028100000_lc36_netflix_data.sql)
--        and public.lc36_token_credits (sql/20261028110000_lc36_commerce.sql). Idempotent: safe to run twice. Never applied by the assistant.
-- The token is filed as a credit under the member's e-mail (pack 'welcome'); the Arena moves it into the wallet at sign-in (tokens_claim_email), like a bought pack.

create table if not exists public.lc57_bonus_keys (
  key            text primary key check (key = upper(key)),
  tokens         integer     not null check (tokens > 0),
  active         boolean     not null default true,
  needs_consent  boolean     not null default true,
  note           text,
  created_at     timestamptz not null default now()
);
insert into public.lc57_bonus_keys (key, tokens, note) values ('WELCOME-TOKEN-2026', 1, 'welcome mail bonus for ticking the e-mail box') on conflict (key) do nothing;

create table if not exists public.lc57_bonus_redemptions (
  id           bigserial primary key,
  key          text        not null references public.lc57_bonus_keys (key),
  user_id      uuid        not null,
  email        text        not null check (email = lower(email)),
  tokens       integer     not null,
  redeemed_at  timestamptz not null default now(),
  unique (key, user_id),
  unique (key, email)
);

create table if not exists public.lc57_welcome_queue (
  email       text primary key check (email = lower(email)),
  user_id     uuid,
  key         text        not null,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  attempts    integer     not null default 0
);

alter table public.lc57_bonus_keys        enable row level security;
alter table public.lc57_bonus_redemptions enable row level security;
alter table public.lc57_welcome_queue     enable row level security;
revoke all on public.lc57_bonus_keys, public.lc57_bonus_redemptions, public.lc57_welcome_queue from anon, authenticated;

-- is the signed-in member's marketing box ticked? (server truth, written by lc36_consent_set)
create or replace function public._lc57_consent(p_email text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select marketing from public.lc36_email_consent where email = lower(p_email)), false)
$$;

-- what the app shows: ticked or not, key used or not, welcome mail queued / sent
create or replace function public.lc57_status() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text := public._lc26_email(); q public.lc57_welcome_queue;
begin
  if v_uid is null or v_email = '' then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  select * into q from public.lc57_welcome_queue where email = v_email;
  return jsonb_build_object('ok', true,
    'consent',  public._lc57_consent(v_email),
    'redeemed', exists (select 1 from public.lc57_bonus_redemptions r where r.email = v_email or r.user_id = v_uid),
    'queued',   q.email is not null,
    'sent',     q.sent_at is not null);
end $$;

-- step 1 after ticking the box: put the welcome mail in the queue (once per e-mail). Refuses when the box is not ticked.
create or replace function public.lc57_welcome_start() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text := public._lc26_email(); k text;
begin
  if v_uid is null or v_email = '' then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  if not public._lc57_consent(v_email) then return jsonb_build_object('ok', false, 'error', 'consent'); end if;
  if exists (select 1 from public.lc57_bonus_redemptions r where r.email = v_email or r.user_id = v_uid) then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  select key into k from public.lc57_bonus_keys where active and needs_consent order by created_at limit 1;
  if k is null then return jsonb_build_object('ok', false, 'error', 'no_key'); end if;
  insert into public.lc57_welcome_queue (email, user_id, key) values (v_email, v_uid, k) on conflict (email) do nothing;
  return jsonb_build_object('ok', true, 'queued', true);
end $$;

-- fallback when the mail cannot be sent: the member who ticked the box sees the key in the app
create or replace function public.lc57_welcome_reveal() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text := public._lc26_email(); k text;
begin
  if v_uid is null or v_email = '' then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  if not public._lc57_consent(v_email) then return jsonb_build_object('ok', false, 'error', 'consent'); end if;
  select key into k from public.lc57_bonus_keys where active and needs_consent order by created_at limit 1;
  if k is null then return jsonb_build_object('ok', false, 'error', 'no_key'); end if;
  return jsonb_build_object('ok', true, 'key', k);
end $$;

-- step 2: the member types the key. ONE time per account and per e-mail. Everything below is one transaction: if the credit cannot be written,
-- the redemption is rolled back too.
create or replace function public.lc57_redeem(p_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text := public._lc26_email(); v_key text; k public.lc57_bonus_keys;
begin
  if v_uid is null or v_email = '' then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  v_key := upper(regexp_replace(coalesce(p_key, ''), '\s+', '', 'g'));
  select * into k from public.lc57_bonus_keys where key = v_key and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid_key'); end if;
  if exists (select 1 from public.lc57_bonus_redemptions r where r.key = k.key and (r.email = v_email or r.user_id = v_uid)) then
    return jsonb_build_object('ok', false, 'error', 'already_redeemed');
  end if;
  if k.needs_consent and not public._lc57_consent(v_email) then return jsonb_build_object('ok', false, 'error', 'consent'); end if;
  if to_regclass('public.lc36_token_credits') is null then return jsonb_build_object('ok', false, 'error', 'credits_missing'); end if;
  begin
    insert into public.lc57_bonus_redemptions (key, user_id, email, tokens) values (k.key, v_uid, v_email, k.tokens);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'already_redeemed');
  end;
  insert into public.lc36_token_credits (email, tokens, pack, amount_cents, session_id)
  values (v_email, k.tokens, 'welcome', 0, 'bonus:' || k.key || ':' || v_uid::text)
  on conflict (session_id) do nothing;
  return jsonb_build_object('ok', true, 'tokens', k.tokens);
end $$;

revoke all on function public._lc57_consent(text)        from public, anon, authenticated;
revoke all on function public.lc57_status()               from public, anon;
revoke all on function public.lc57_welcome_start()        from public, anon;
revoke all on function public.lc57_welcome_reveal()       from public, anon;
revoke all on function public.lc57_redeem(text)           from public, anon;
do $$ begin
  grant execute on function public.lc57_status()          to authenticated, service_role;
  grant execute on function public.lc57_welcome_start()   to authenticated, service_role;
  grant execute on function public.lc57_welcome_reveal()  to authenticated, service_role;
  grant execute on function public.lc57_redeem(text)      to authenticated, service_role;
  grant select, insert, update on public.lc57_welcome_queue to service_role;
  grant usage, select on all sequences in schema public to service_role;
exception when undefined_object then null; end $$;
