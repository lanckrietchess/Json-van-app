-- =====================================================================================================
-- schema_v7_update.sql   LanckrietChess hub 7.1.x   (Supabase / Postgres)
-- Viral engine + Business shop + Beginner IAP funnel + Hall of Fame.
-- Run the WHOLE file once in Supabase > SQL Editor. Safe to run more than once (idempotent).
-- Adds only new objects prefixed lc7_ . It does not change 001-005, public.licenses, admin_users or app_feedback.
--
-- HOW IT WORKS
--  * Players have no Supabase Auth account. On first open the app calls lc7_register(); the server answers with
--    a member id + a secret token (kept in localStorage, only its SHA-256 hash is stored). Every later call sends
--    id + token. This is deliberately separate from the public activity pid, so nobody can squat or steal an identity.
--  * Tables are locked down with RLS. The app talks ONLY to lc7_* RPC functions (SECURITY DEFINER).
--    The signed-in admin (a row in public.admin_users) can also read/write the admin tables directly.
--  * Money is always stored in euro CENTS. 1 Business Credit = EUR 1 of purchase value (shop prices are in cents too).
-- =====================================================================================================
begin;

-- -----------------------------------------------------------------------------------------------------
-- 0. TABLES
-- -----------------------------------------------------------------------------------------------------

-- 0.1 Tunable settings (edit values here, no redeploy needed)
create table if not exists public.lc7_cfg (
  k    text primary key,
  v    jsonb not null,
  note text
);
insert into public.lc7_cfg (k, v, note) values
  ('app_url',                  '"https://lanckrietchess-app.vercel.app/"', 'Base URL used to build referral and tracking links'),
  ('attribution_days',         '7',      'Days a new member can still set or change their creator attribution'),
  ('ref_first_tokens',         '10',     'Tokens for the 1st referral'),
  ('ref_mid_tokens',           '2',      'Tokens for referral 2 up to ref_mid_until'),
  ('ref_late_tokens',          '1',      'Tokens for every referral after ref_mid_until'),
  ('ref_mid_until',            '100',    'Last referral number that still earns ref_mid_tokens'),
  ('vampire_unlock_at',        '100',    'Referrals needed to unlock Vampire Mode'),
  ('vampire_base_pct',         '1',      'Base passive XP share in percent'),
  ('vampire_scale_step',       '100',    'Every this many ACTIVE referred users adds vampire_scale_add to the multiplier'),
  ('vampire_scale_add',        '0.25',   'Multiplier added per scale step'),
  ('vampire_scale_cap',        '3',      'Highest multiplier (3 = 3 percent at the base of 1 percent)'),
  ('vampire_active_days',      '30',     'A referred user counts as active if seen in the last N days'),
  ('vampire_game_xp_cap',      '5000',   'Largest XP amount accepted for one game report'),
  ('credit_direct_pct',        '30',     'Business credit percent: purchase by a member attributed to the partner'),
  ('credit_support_pct',       '10',     'Business credit percent: purchase made with a partner support code'),
  ('upsell_elo',               '1200',   'ELO that triggers the Beginner to Full upgrade offer'),
  ('upsell_hours',             '48',     'Length of the upgrade countdown'),
  ('upsell_discount_cents',    '20000',  'Discount in the upgrade offer (EUR 200)'),
  ('pro_price_cents',          '100000', 'Full Lifetime Access list price (EUR 1,000)'),
  ('beginner_price_cents',     '10000',  'Beginner Bootcamp one-time price (EUR 100)'),
  ('conversion_beginner_keys', '15',     'Beginner Keys given when a Pro key is redeemed by someone who already owns Pro Lifetime'),
  ('device_member_cap',        '3',      'Most members one device may ever register (anti referral farming)'),
  ('vip_invite_url',           '""',     'Link shown to Community Legend winners (monthly VIP Q&A / live game review)')
on conflict (k) do nothing;

-- 0.2 Members
create table if not exists public.lc7_members (
  id                   uuid primary key default gen_random_uuid(),
  token_hash           text not null,
  device_hash          text,
  name                 text not null default 'Player',
  public_profile       boolean not null default true,          -- false = hidden from every leaderboard
  banned               boolean not null default false,
  account_type         text not null default 'user' check (account_type in ('user','business')),
  email                text,
  ref_code             text not null unique,                   -- permanent private referral code (?ref=...)
  referrer_id          uuid references public.lc7_members(id) on delete set null,
  referral_count       integer not null default 0,
  vampire_unlocked_at  timestamptz,
  vampire_xp_pending   numeric(14,3) not null default 0,       -- fractional XP waiting to be claimed
  vampire_xp_total     bigint not null default 0,
  -- onboarding attribution
  attr_partner_id      uuid,                                   -- creator/partner credited for this member (house = Lanckriet Chess)
  attr_hint_partner_id uuid,                                   -- partner whose link brought the member in, if any
  attr_platform        text,
  attr_via             text not null default 'default' check (attr_via in ('default','link','survey','support_code')),
  attr_status          text not null default 'pending' check (attr_status in ('pending','confirmed')),
  attr_locked          boolean not null default false,
  attr_last_prompt_on  date,
  attr_dismissed_at    timestamptz,
  attr_dismiss_count   integer not null default 0,
  attr_set_at          timestamptz,
  attr_locked_at       timestamptz,
  -- entitlements
  beginner_access      boolean not null default false,
  beginner_source      text check (beginner_source in ('iap','key','admin','purchase')),
  beginner_at          timestamptz,
  pro_lifetime         boolean not null default false,
  pro_source           text,
  vip_qna              boolean not null default false,
  vip_since            timestamptz,
  -- 1200 ELO upsell
  elo                  integer,
  elo_at               timestamptz,
  upsell_started_at    timestamptz,
  upsell_expires_at    timestamptz,
  last_active_at       timestamptz not null default now(),
  created_at           timestamptz not null default now()
);
create index if not exists lc7_members_referrer on public.lc7_members (referrer_id);
create index if not exists lc7_members_attr     on public.lc7_members (attr_partner_id);
create index if not exists lc7_members_device   on public.lc7_members (device_hash);
create index if not exists lc7_members_refcount on public.lc7_members (referral_count desc) where referral_count > 0;

-- 0.3 Partners (approved creators, clubs, businesses) + the house partner
create table if not exists public.lc7_partners (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code ~ '^[a-z0-9][a-z0-9-]{2,23}$'),   -- tracking link + Creator Support Code
  member_id      uuid unique references public.lc7_members(id) on delete set null,
  name           text not null,
  kind           text not null default 'creator' check (kind in ('house','creator','club','business')),
  is_house       boolean not null default false,
  status         text not null default 'approved' check (status in ('approved','suspended')),
  contact_email  text,
  links          jsonb not null default '[]'::jsonb,           -- approved public links: [{"label":"YouTube","url":"https://..."}]
  links_pending  jsonb,
  links_status   text not null default 'none' check (links_status in ('none','pending','approved','rejected')),
  flair          text,                                         -- team flair shown on the Hall of Fame
  badge          text,
  balance_cents  bigint not null default 0,                    -- spendable Business Credits
  earned_cents   bigint not null default 0,                    -- lifetime credits earned = the Revenue Bometer
  spent_cents    bigint not null default 0,
  created_at     timestamptz not null default now(),
  approved_at    timestamptz,
  approved_by    uuid
);
create unique index if not exists lc7_one_house on public.lc7_partners (is_house) where is_house;
insert into public.lc7_partners (code, name, kind, is_house, approved_at)
values ('lanckrietchess', 'Lanckriet Chess', 'house', true, now())
on conflict (code) do nothing;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'lc7_members_attr_partner_fk') then
    alter table public.lc7_members add constraint lc7_members_attr_partner_fk
      foreign key (attr_partner_id) references public.lc7_partners(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lc7_members_hint_partner_fk') then
    alter table public.lc7_members add constraint lc7_members_hint_partner_fk
      foreign key (attr_hint_partner_id) references public.lc7_partners(id) on delete set null;
  end if;
end $$;

-- 0.4 Partner applications (the in-app queue)
create table if not exists public.lc7_partner_applications (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.lc7_members(id) on delete cascade,
  channel_name  text not null,
  contact_email text not null,
  socials       jsonb not null default '{}'::jsonb,
  stats         jsonb not null default '{}'::jsonb,
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note    text,
  partner_id    uuid references public.lc7_partners(id) on delete set null,
  created_at    timestamptz not null default now(),
  decided_at    timestamptz,
  decided_by    uuid
);
create unique index if not exists lc7_one_pending_app on public.lc7_partner_applications (member_id) where status = 'pending';

-- 0.5 Private referrals, friends, token + vampire ledgers, badges
create table if not exists public.lc7_referrals (
  id          bigserial primary key,
  referrer_id uuid not null references public.lc7_members(id) on delete cascade,
  referred_id uuid not null unique references public.lc7_members(id) on delete cascade,
  seq         integer not null,
  tokens      integer not null,
  created_at  timestamptz not null default now()
);
create index if not exists lc7_referrals_referrer on public.lc7_referrals (referrer_id, seq);

create table if not exists public.lc7_friendships (
  a          uuid not null references public.lc7_members(id) on delete cascade,
  b          uuid not null references public.lc7_members(id) on delete cascade,
  via        text not null default 'referral',
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
create index if not exists lc7_friendships_b on public.lc7_friendships (b);

create table if not exists public.lc7_token_ledger (
  id         bigserial primary key,
  member_id  uuid not null references public.lc7_members(id) on delete cascade,
  delta      integer not null,
  reason     text not null,
  ref_id     text,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists lc7_token_unclaimed on public.lc7_token_ledger (member_id) where claimed_at is null;

create table if not exists public.lc7_vampire_ledger (
  id          bigserial primary key,
  referrer_id uuid not null references public.lc7_members(id) on delete cascade,
  source_id   uuid not null references public.lc7_members(id) on delete cascade,
  game_id     text not null,
  base_xp     integer not null,
  pct         numeric(6,3) not null,
  xp          numeric(12,3) not null,
  created_at  timestamptz not null default now(),
  unique (source_id, game_id)
);
create index if not exists lc7_vampire_referrer on public.lc7_vampire_ledger (referrer_id, created_at desc);

create table if not exists public.lc7_badge_defs (
  code        text primary key,
  label       text not null,
  description text,
  kind        text not null default 'referral' check (kind in ('referral','partner','special')),
  sort        integer not null default 0
);
insert into public.lc7_badge_defs (code, label, description, kind, sort) values
  ('first_friend',     'First Friend',     'Brought your first friend into the grind',      'referral', 10),
  ('ref_5',            'Training Partner', '5 friends joined through your link',            'referral', 20),
  ('ref_10',           'Contender',        '10 friends joined through your link',           'referral', 30),
  ('ref_25',           'Squad Captain',    '25 friends joined through your link',           'referral', 40),
  ('ref_50',           'Challenger',       '50 friends joined through your link',           'referral', 50),
  ('ref_100',          'Vampire Elite',    '100 friends joined. Vampire Mode unlocked',     'referral', 60),
  ('community_legend', 'Community Legend', 'Giveaway winner who shared the prize forward',  'special',  70),
  ('partner',          'Partner',          'Approved Lanckriet Chess business partner',     'partner',  5)
on conflict (code) do nothing;

create table if not exists public.lc7_member_badges (
  member_id  uuid not null references public.lc7_members(id) on delete cascade,
  badge_code text not null references public.lc7_badge_defs(code) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (member_id, badge_code)
);

-- 0.6 Purchases, partner credit ledger, shop
create table if not exists public.lc7_purchases (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid references public.lc7_members(id) on delete set null,
  product      text not null check (product in ('beginner_course','pro_lifetime','pro_subscription','other')),
  amount_cents integer not null check (amount_cents >= 0),     -- what the buyer actually paid
  currency     text not null default 'EUR',
  source       text not null default 'manual' check (source in ('play_billing','skool','manual','other')),
  external_ref text not null unique,                           -- order id / purchase token: makes recording idempotent
  discount_code text,
  partner_id   uuid references public.lc7_partners(id) on delete set null,
  credit_type  text check (credit_type in ('direct','support_code')),
  credit_cents bigint not null default 0,
  status       text not null default 'paid' check (status in ('paid','refunded')),
  created_at   timestamptz not null default now()
);
create index if not exists lc7_purchases_partner on public.lc7_purchases (partner_id, created_at desc);

create table if not exists public.lc7_credit_ledger (
  id          bigserial primary key,
  partner_id  uuid not null references public.lc7_partners(id) on delete cascade,
  delta_cents bigint not null,
  reason      text not null check (reason in ('purchase_direct','purchase_support','shop_spend','refund','admin_adjust')),
  purchase_id uuid,
  order_id    uuid,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists lc7_credit_partner on public.lc7_credit_ledger (partner_id, created_at desc);

create table if not exists public.lc7_shop_items (
  sku         text primary key,
  kind        text not null check (kind in ('pro_lifetime_key','pro_pass','giveaway_pack','beginner_pack','xp_boost','custom_module')),
  label       text not null,
  description text,
  cost_cents  bigint not null check (cost_cents > 0),
  config      jsonb not null default '{}'::jsonb,
  active      boolean not null default true,
  sort        integer not null default 0
);
-- PRICES: events and the custom module use the amounts from the brief. Keys and packs are priced at face value
-- (Pro Lifetime EUR 1,000, Beginner Key EUR 100) so nothing is discounted by accident. The subscription pass has no
-- price in the brief, so it ships INACTIVE: set cost_cents, then set active = true.
insert into public.lc7_shop_items (sku, kind, label, description, cost_cents, config, active, sort) values
  ('pro_lifetime_key',  'pro_lifetime_key', 'Pro Lifetime Access Key',            'One key that unlocks Full Lifetime Access. Order 1 to 20.',          100000, '{"class":"pro_lifetime"}', true,  10),
  ('pro_pass_30d',      'pro_pass',         'Pro Subscription Pass (30 days)',    'A 30 day Pro pass. Set the price before switching it on.',            10000, '{"days":30}',              false, 20),
  ('giveaway_pack_1',   'giveaway_pack',    'Giveaway Pack: 1 Pro Lifetime Key',  'One prize key for a comment competition.',                          100000, '{"qty":1}',                true,  30),
  ('giveaway_pack_3',   'giveaway_pack',    'Giveaway Pack: 3 Pro Lifetime Keys', 'Three prize keys for a comment competition.',                       300000, '{"qty":3}',                true,  31),
  ('giveaway_pack_5',   'giveaway_pack',    'Giveaway Pack: 5 Pro Lifetime Keys', 'Five prize keys for a comment competition.',                        500000, '{"qty":5}',                true,  32),
  ('beginner_pack_10',  'beginner_pack',    'Beginner Key Pack (10)',             'Ten Beginner Keys (0 to 1200 ELO content) to hand out to followers.', 100000, '{"qty":10}',               true,  40),
  ('xp_boost_1d',       'xp_boost',         '1-Day 1.5x XP Boost',                '1.5x XP for your followers for 24 hours, with a named pop-up.',      20000, '{"hours":24,"multiplier":1.5}',  true, 50),
  ('xp_boost_1w',       'xp_boost',         '1-Week 1.5x XP Boost',               '1.5x XP for your followers for 7 days, with a named pop-up.',       100000, '{"hours":168,"multiplier":1.5}', true, 51),
  ('xp_boost_1m',       'xp_boost',         '1-Month 1.5x XP Boost',              '1.5x XP for your followers for 30 days, with a named pop-up.',      300000, '{"hours":720,"multiplier":1.5}', true, 52),
  ('custom_module',     'custom_module',    'Custom Repertoire / Opening Module', 'Your own opening line inside the opening trainer, under a creator dropdown.', 300000, '{}',              true, 60)
on conflict (sku) do nothing;

create table if not exists public.lc7_shop_orders (
  id         uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.lc7_partners(id) on delete cascade,
  sku        text not null references public.lc7_shop_items(sku),
  qty        integer not null default 1,
  cost_cents bigint not null,
  status     text not null default 'fulfilled' check (status in ('fulfilled','refunded')),
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists lc7_orders_partner on public.lc7_shop_orders (partner_id, created_at desc);

-- 0.7 Keys (Beginner Key is its own class: free + beginner content ONLY)
create table if not exists public.lc7_keys (
  id              uuid primary key default gen_random_uuid(),
  key             text not null unique,
  key_class       text not null check (key_class in ('beginner','pro_lifetime','giveaway_pro','pro_pass')),
  status          text not null default 'available' check (status in ('available','redeemed','converted','revoked')),
  partner_id      uuid references public.lc7_partners(id) on delete set null,
  owner_member_id uuid references public.lc7_members(id) on delete set null,
  order_id        uuid references public.lc7_shop_orders(id) on delete set null,
  source          text not null default 'shop' check (source in ('shop','conversion','admin')),
  label           text,
  pass_days       integer,
  redeemed_by     uuid references public.lc7_members(id) on delete set null,
  redeemed_at     timestamptz,
  license_key     text,                                        -- the public.licenses key minted for a Pro redemption
  created_at      timestamptz not null default now()
);
create index if not exists lc7_keys_partner on public.lc7_keys (partner_id, created_at desc);
create index if not exists lc7_keys_owner   on public.lc7_keys (owner_member_id);

-- 0.8 Marketing events, custom modules, creator toolkit, upgrade codes, rate limiting
create table if not exists public.lc7_events (
  id         uuid primary key default gen_random_uuid(),
  partner_id uuid references public.lc7_partners(id) on delete cascade,   -- null = platform wide
  order_id   uuid references public.lc7_shop_orders(id) on delete set null,
  kind       text not null default 'xp_boost',
  multiplier numeric(3,2) not null default 1.5 check (multiplier >= 1 and multiplier <= 5),
  title      text not null,
  popup_text text,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  status     text not null default 'scheduled' check (status in ('scheduled','cancelled')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists lc7_events_window on public.lc7_events (status, starts_at, ends_at);

create table if not exists public.lc7_partner_modules (
  id             uuid primary key default gen_random_uuid(),
  partner_id     uuid not null references public.lc7_partners(id) on delete cascade,
  order_id       uuid references public.lc7_shop_orders(id) on delete set null,
  title          text not null,
  side           text not null default 'both' check (side in ('white','black','both')),
  repertoire_key text,                                         -- key of the repertoire inside content.json (single source of truth)
  status         text not null default 'ordered' check (status in ('ordered','in_production','live','cancelled')),
  notes          text,
  created_at     timestamptz not null default now(),
  live_at        timestamptz
);

create table if not exists public.lc7_toolkit (
  id       serial primary key,
  kind     text not null check (kind in ('description','script','caption','dm')),
  platform text not null default 'any',
  title    text not null,
  body     text not null,          -- placeholders: {{link}} {{code}} {{name}} {{app_url}}
  sort     integer not null default 0,
  active   boolean not null default true
);

create table if not exists public.lc7_discount_codes (
  code         text primary key,
  member_id    uuid not null references public.lc7_members(id) on delete cascade,
  kind         text not null default 'upsell_1200',
  product      text not null default 'pro_lifetime',
  amount_cents integer not null,
  expires_at   timestamptz not null,
  used_at      timestamptz,
  purchase_id  uuid,
  created_at   timestamptz not null default now()
);
create index if not exists lc7_discount_member on public.lc7_discount_codes (member_id);

create table if not exists public.lc7_rate_log (
  id      bigserial primary key,
  scope   text not null,
  subject text not null,
  at      timestamptz not null default now()
);
create index if not exists lc7_rate_lookup on public.lc7_rate_log (scope, subject, at desc);

-- Creator toolkit starter templates (edit freely in the table)
insert into public.lc7_toolkit (kind, platform, title, body, sort)
select * from (values
  ('description','youtube','YouTube description block',
   E'Train smarter with the free Lanckriet Chess Training Hub: structured openings, tactics and the MSPC thinking method.\nStart free here: {{link}}\nSupport code: {{code}}', 10),
  ('description','instagram','Instagram / TikTok bio line',
   E'Free chess training hub, built around a clear thinking method. Try it: {{link}}', 20),
  ('caption','instagram','Reel caption',
   E'Most rating points are lost to the same few leaks. This free hub helps you find yours.\nLink in bio, or go to {{link}}', 30),
  ('script','any','15 second spoken promo',
   E'If you keep losing rating to the same kind of mistake, there is a free training hub that teaches you a clear way to think every move. I use it with my community. The link and my support code {{code}} are in the description.', 40),
  ('script','any','Community post',
   E'New for the community: the Lanckriet Chess Training Hub is free to start. Open {{link}} on your phone and add it to your home screen. Tell me in the comments which opening you want to master first.', 50),
  ('dm','any','Friendly DM',
   E'Hey {{name}}, if you want a structured way to improve at chess, this free app is worth a look: {{link}}', 60)
) as t(kind, platform, title, body, sort)
where not exists (select 1 from public.lc7_toolkit);

-- -----------------------------------------------------------------------------------------------------
-- 1. HELPERS (internal. Not callable by players, see the grants at the bottom)
-- -----------------------------------------------------------------------------------------------------
create or replace function public.lc7_cfg_num(p_k text, p_default numeric)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(v #>> '{}', '')::numeric from public.lc7_cfg where k = p_k), p_default)
$$;

create or replace function public.lc7_cfg_txt(p_k text, p_default text)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select v #>> '{}' from public.lc7_cfg where k = p_k), p_default)
$$;

-- Admin = a signed-in user listed in public.admin_users (matched on user_id, id or email), or the service role.
create or replace function public.lc7_is_admin()
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then return true; end if;
  if auth.uid() is null then return false; end if;
  return exists (
    select 1 from public.admin_users a
     where to_jsonb(a) ->> 'user_id' = auth.uid()::text
        or to_jsonb(a) ->> 'id'      = auth.uid()::text
        or (to_jsonb(a) ->> 'email' is not null and lower(to_jsonb(a) ->> 'email') = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
exception when undefined_table then
  return false;
end $$;

create or replace function public.lc7_auth(p_id uuid, p_token text)
returns uuid language plpgsql stable security definer set search_path = public as $$
begin
  if p_id is null or p_token is null or length(p_token) < 32 or length(p_token) > 128 then return null; end if;
  perform 1 from public.lc7_members m
   where m.id = p_id and not m.banned
     and m.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if found then return p_id; end if;
  return null;
end $$;

create or replace function public.lc7_clean(p_t text, p_max integer, p_default text default '')
returns text language sql immutable set search_path = public as $$
  select coalesce(nullif(left(btrim(regexp_replace(coalesce(p_t, ''), '[[:cntrl:]<>]', ' ', 'g')), p_max), ''), p_default)
$$;

create or replace function public.lc7_rate_ok(p_scope text, p_subject text, p_max integer, p_window interval)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if random() < 0.02 then delete from public.lc7_rate_log where at < now() - interval '2 days'; end if;
  select count(*) into v_n from public.lc7_rate_log where scope = p_scope and subject = p_subject and at > now() - p_window;
  if v_n >= p_max then return false; end if;
  insert into public.lc7_rate_log (scope, subject) values (p_scope, p_subject);
  return true;
end $$;

-- LCB-XXXX-XXXX-XXXX style codes without look-alike characters
create or replace function public.lc7_new_key(p_prefix text)
returns text language plpgsql volatile set search_path = public as $$
declare
  v_alpha text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_raw   bytea := decode(md5(gen_random_uuid()::text || gen_random_uuid()::text), 'hex');
  v_out   text := '';
  v_i     integer;
begin
  for v_i in 0..11 loop
    v_out := v_out || substr(v_alpha, (get_byte(v_raw, v_i) % 31) + 1, 1);
    if v_i in (3, 7) then v_out := v_out || '-'; end if;
  end loop;
  return p_prefix || '-' || v_out;
end $$;

create or replace function public.lc7_house_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.lc7_partners where is_house limit 1
$$;

-- A code is either a partner code (creator link / support code) or a private member referral code.
create or replace function public.lc7_resolve_code(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_c text := lower(btrim(coalesce(p_code, ''))); v_id uuid;
begin
  if v_c !~ '^[a-z0-9][a-z0-9-]{2,23}$' then return null; end if;
  select id into v_id from public.lc7_partners where code = v_c and status = 'approved';
  if found then return jsonb_build_object('kind', 'partner', 'id', v_id); end if;
  select id into v_id from public.lc7_members where ref_code = v_c and not banned;
  if found then return jsonb_build_object('kind', 'member', 'id', v_id); end if;
  return null;
end $$;

create or replace function public.lc7_award_badge(p_member uuid, p_code text)
returns void language sql security definer set search_path = public as $$
  insert into public.lc7_member_badges (member_id, badge_code) values (p_member, p_code) on conflict do nothing
$$;

create or replace function public.lc7_badges_json(p_member uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', d.code, 'label', d.label, 'awarded_at', b.awarded_at) order by d.sort), '[]'::jsonb)
    from public.lc7_member_badges b join public.lc7_badge_defs d on d.code = b.badge_code
   where b.member_id = p_member
$$;

-- Token ladder: 1st = 10, 2nd..100th = 2, 101st+ = 1
create or replace function public.lc7_ref_tokens(p_n integer)
returns integer language sql stable security definer set search_path = public as $$
  select case when p_n <= 1 then public.lc7_cfg_num('ref_first_tokens', 10)::int
              when p_n <= public.lc7_cfg_num('ref_mid_until', 100)::int then public.lc7_cfg_num('ref_mid_tokens', 2)::int
              else public.lc7_cfg_num('ref_late_tokens', 1)::int end
$$;

-- Vampire share in percent: base share x a multiplier that grows with the ACTIVE referred network.
create or replace function public.lc7_vampire_pct(p_member uuid)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare v_active integer; v_mult numeric;
begin
  select count(*) into v_active from public.lc7_members
   where referrer_id = p_member
     and last_active_at > now() - make_interval(days => public.lc7_cfg_num('vampire_active_days', 30)::int);
  v_mult := least(public.lc7_cfg_num('vampire_scale_cap', 3),
                  1 + floor(v_active / greatest(1, public.lc7_cfg_num('vampire_scale_step', 100))) * public.lc7_cfg_num('vampire_scale_add', 0.25));
  return round(public.lc7_cfg_num('vampire_base_pct', 1) * v_mult, 3);
end $$;

-- Does this member already own Full Pro Lifetime? (flag set by keys/purchases/links, or a lifetime licence on their email)
create or replace function public.lc7_owns_pro_lifetime(p_member uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_flag boolean; v_email text;
begin
  select pro_lifetime, email into v_flag, v_email from public.lc7_members where id = p_member;
  if coalesce(v_flag, false) then return true; end if;
  if v_email is null then return false; end if;
  begin
    return exists (select 1 from public.licenses l
                    where lower(l.email) = lower(v_email) and coalesce(l.is_lifetime, false)
                      and not coalesce(l.revoked, false) and l.tier >= 2);
  exception when undefined_column or undefined_table then
    return false;
  end;
end $$;

-- Inserts a row into public.licenses using only the columns that table really has.
create or replace function public.lc7_mint_license(p_row jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare v_cols text;
begin
  select string_agg(quote_ident(c.column_name), ',') into v_cols
    from information_schema.columns c
   where c.table_schema = 'public' and c.table_name = 'licenses'
     and c.column_name in (select jsonb_object_keys(p_row));
  if v_cols is null then raise exception 'public.licenses has none of the expected columns'; end if;
  execute format('insert into public.licenses (%1$s) select %1$s from jsonb_populate_record(null::public.licenses, $1)', v_cols) using p_row;
  return p_row ->> 'license_key';
end $$;

-- Locks attribution once the window has passed. Runs lazily inside the RPCs; also callable by a cron.
create or replace function public.lc7_refresh_lock(p_member uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.lc7_members
     set attr_locked = true, attr_locked_at = now()
   where id = p_member and not attr_locked
     and created_at + make_interval(days => public.lc7_cfg_num('attribution_days', 7)::int) <= now();
end $$;

create or replace function public.lc7_lock_expired_attributions()
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if not public.lc7_is_admin() then return 0; end if;
  update public.lc7_members set attr_locked = true, attr_locked_at = now()
   where not attr_locked and created_at + make_interval(days => public.lc7_cfg_num('attribution_days', 7)::int) <= now();
  get diagnostics v_n = row_count;
  return v_n;
end $$;

create or replace function public.lc7_attr_json(p_member uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare m public.lc7_members%rowtype; p public.lc7_partners%rowtype; v_days numeric; v_prompt boolean;
begin
  select * into m from public.lc7_members where id = p_member;
  if not found then return null; end if;
  select * into p from public.lc7_partners where id = m.attr_partner_id;
  v_days := greatest(0, ceil(extract(epoch from (m.created_at + make_interval(days => public.lc7_cfg_num('attribution_days', 7)::int) - now())) / 86400));
  v_prompt := not m.attr_locked and m.attr_status = 'pending' and (m.attr_last_prompt_on is null or m.attr_last_prompt_on < current_date);
  return jsonb_build_object(
    'status', case when m.attr_locked then 'locked' else m.attr_status end,
    'locked', m.attr_locked,
    'days_left', case when m.attr_locked then 0 else v_days end,
    'should_prompt', v_prompt,
    'platform', m.attr_platform,
    'via', m.attr_via,
    'partner', case when p.id is null then null else jsonb_build_object('code', p.code, 'name', p.name, 'is_house', p.is_house) end,
    'prefill_partner_code', p.code,
    'dismissed_at', m.attr_dismissed_at,
    'undo_seconds', 60,
    'support_code_allowed', not m.attr_locked);
end $$;

create or replace function public.lc7_upsell_json(p_member uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare m public.lc7_members%rowtype; d public.lc7_discount_codes%rowtype; v_left numeric;
begin
  select * into m from public.lc7_members where id = p_member;
  if not found or m.upsell_started_at is null then return jsonb_build_object('started', false, 'active', false); end if;
  select * into d from public.lc7_discount_codes where member_id = p_member and kind = 'upsell_1200' limit 1;
  v_left := greatest(0, extract(epoch from (m.upsell_expires_at - now())));
  return jsonb_build_object(
    'started', true,
    'active', v_left > 0 and d.used_at is null and not m.pro_lifetime,
    'used', d.used_at is not null,
    'expires_at', m.upsell_expires_at,
    'seconds_left', floor(v_left),
    'code', case when v_left > 0 and d.used_at is null then d.code end,
    'discount_cents', d.amount_cents,
    'list_price_cents', public.lc7_cfg_num('pro_price_cents', 100000)::bigint,
    'price_after_cents', greatest(0, public.lc7_cfg_num('pro_price_cents', 100000)::bigint - coalesce(d.amount_cents, 0)));
end $$;

-- -----------------------------------------------------------------------------------------------------
-- 2. REGISTRATION, REFERRALS, VAMPIRE MODE, PROFILE
-- -----------------------------------------------------------------------------------------------------

-- First app open. p_ref may be a creator code (?ref=creator) or a friend's private code (?ref=friend).
create or replace function public.lc7_register(p_device text, p_name text default null, p_ref text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_dev text; v_id uuid := gen_random_uuid(); v_token text; v_code text; v_name text;
  v_res jsonb; v_kind text; v_target uuid;
  v_house uuid := public.lc7_house_id(); v_partner uuid; v_via text := 'default';
  v_referrer public.lc7_members%rowtype; v_ref_id uuid; v_reason text := null;
  v_n integer; v_tokens integer := 0;
begin
  if p_device is null or p_device !~ '^[A-Za-z0-9_.:-]{8,100}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_device');
  end if;
  v_dev := encode(sha256(convert_to(p_device, 'UTF8')), 'hex');
  if not public.lc7_rate_ok('register', v_dev, 5, interval '1 day') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  v_name := public.lc7_clean(p_name, 30, 'Player');
  v_partner := v_house;

  v_res := public.lc7_resolve_code(p_ref);
  if v_res is not null then v_kind := v_res ->> 'kind'; v_target := (v_res ->> 'id')::uuid; end if;
  if v_kind = 'partner' then v_partner := v_target; v_via := 'link'; end if;

  loop
    v_code := substr(md5(gen_random_uuid()::text), 1, 8);
    exit when not exists (select 1 from public.lc7_members where ref_code = v_code)
          and not exists (select 1 from public.lc7_partners where code = v_code);
  end loop;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  -- private referral: who may earn from it (anti farming)
  if v_kind = 'member' then
    select * into v_referrer from public.lc7_members where id = v_target for update;
    if found then
      if v_referrer.device_hash is not distinct from v_dev then v_reason := 'same_device';
      elsif (select count(*) from public.lc7_members where device_hash = v_dev) >= public.lc7_cfg_num('device_member_cap', 3) then v_reason := 'device_limit';
      elsif exists (select 1 from public.lc7_members where device_hash = v_dev and referrer_id is not null) then v_reason := 'device_already_referred';
      else v_ref_id := v_referrer.id;
      end if;
    end if;
  end if;

  insert into public.lc7_members (id, token_hash, device_hash, name, ref_code, referrer_id,
                                  attr_partner_id, attr_hint_partner_id, attr_via)
  values (v_id, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), v_dev, v_name, v_code, v_ref_id,
          v_partner, case when v_via = 'link' then v_partner end, v_via);

  if v_ref_id is not null then
    v_n := v_referrer.referral_count + 1;
    v_tokens := public.lc7_ref_tokens(v_n);
    insert into public.lc7_referrals (referrer_id, referred_id, seq, tokens) values (v_ref_id, v_id, v_n, v_tokens);
    update public.lc7_members
       set referral_count = v_n,
           vampire_unlocked_at = case when vampire_unlocked_at is null and v_n >= public.lc7_cfg_num('vampire_unlock_at', 100)
                                      then now() else vampire_unlocked_at end
     where id = v_ref_id;
    insert into public.lc7_token_ledger (member_id, delta, reason, ref_id) values (v_ref_id, v_tokens, 'referral', v_id::text);
    if v_n = 1 then perform public.lc7_award_badge(v_ref_id, 'first_friend');
    elsif v_n in (5, 10, 25, 50, 100) then perform public.lc7_award_badge(v_ref_id, 'ref_' || v_n);
    end if;
    insert into public.lc7_friendships (a, b) values (least(v_ref_id, v_id), greatest(v_ref_id, v_id)) on conflict do nothing;
  end if;

  return jsonb_build_object(
    'ok', true, 'id', v_id, 'token', v_token, 'ref_code', v_code,
    'ref_link', rtrim(public.lc7_cfg_txt('app_url', ''), '/') || '/?ref=' || v_code,
    'created_at', now(),
    'referral', case
        when coalesce(v_kind, '') <> 'member' then jsonb_build_object('status', 'none')
        when v_ref_id is not null then jsonb_build_object('status', 'rewarded', 'friend_name', v_referrer.name, 'auto_friended', true)
        else jsonb_build_object('status', 'ignored', 'reason', coalesce(v_reason, 'invalid')) end,
    'attribution', public.lc7_attr_json(v_id));
end $$;

create or replace function public.lc7_me(p_id uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m public.lc7_members%rowtype; p public.lc7_partners%rowtype;
  v_tok bigint; v_next integer;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  perform public.lc7_refresh_lock(p_id);
  update public.lc7_members set last_active_at = now() where id = p_id and last_active_at < now() - interval '10 minutes';
  select * into m from public.lc7_members where id = p_id;
  select coalesce(sum(delta), 0) into v_tok from public.lc7_token_ledger where member_id = p_id and claimed_at is null;
  select min(x) into v_next from unnest(array[1, 5, 10, 25, 50, 100]) x where x > m.referral_count;
  select * into p from public.lc7_partners where member_id = p_id;
  return jsonb_build_object(
    'ok', true, 'id', m.id, 'name', m.name, 'public_profile', m.public_profile, 'account_type', m.account_type,
    'ref_code', m.ref_code,
    'ref_link', rtrim(public.lc7_cfg_txt('app_url', ''), '/') || '/?ref=' || m.ref_code,
    'referral_count', m.referral_count, 'next_milestone', v_next,
    'tokens_unclaimed', v_tok,
    'vampire', jsonb_build_object(
        'unlocked', m.vampire_unlocked_at is not null,
        'unlock_at', public.lc7_cfg_num('vampire_unlock_at', 100)::int,
        'pct', case when m.vampire_unlocked_at is not null then public.lc7_vampire_pct(m.id) end,
        'xp_unclaimed', floor(m.vampire_xp_pending), 'xp_total', m.vampire_xp_total),
    'badges', public.lc7_badges_json(m.id),
    'attribution', public.lc7_attr_json(m.id),
    'entitlements', jsonb_build_object(
        'beginner', m.beginner_access, 'beginner_source', m.beginner_source,
        'pro_lifetime', public.lc7_owns_pro_lifetime(m.id),
        'vip_qna', m.vip_qna,
        'vip_invite_url', case when m.vip_qna then nullif(public.lc7_cfg_txt('vip_invite_url', ''), '') end),
    'upsell', public.lc7_upsell_json(m.id),
    'partner', case when p.id is null then null else jsonb_build_object(
        'code', p.code, 'name', p.name, 'status', p.status,
        'tracking_link', rtrim(public.lc7_cfg_txt('app_url', ''), '/') || '/?ref=' || p.code) end,
    'server_time', now());
end $$;

-- Moves unclaimed referral tokens and whole Vampire XP into the app (the client adds them to its balance).
create or replace function public.lc7_claim_rewards(p_id uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tokens bigint; v_pending numeric; v_xp bigint;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select vampire_xp_pending into v_pending from public.lc7_members where id = p_id for update;
  v_xp := floor(v_pending);
  update public.lc7_members set vampire_xp_pending = vampire_xp_pending - v_xp, vampire_xp_total = vampire_xp_total + v_xp where id = p_id;
  with c as (update public.lc7_token_ledger set claimed_at = now() where member_id = p_id and claimed_at is null returning delta)
  select coalesce(sum(delta), 0) into v_tokens from c;
  return jsonb_build_object('ok', true, 'tokens', v_tokens, 'vampire_xp', v_xp);
end $$;

create or replace function public.lc7_set_profile(p_id uuid, p_token text, p_name text default null, p_public boolean default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  update public.lc7_members
     set name = case when p_name is null then name else public.lc7_clean(p_name, 30, 'Player') end,
         public_profile = coalesce(p_public, public_profile)
   where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.lc7_friends(p_id uuid, p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  return jsonb_build_object('ok', true, 'friends', coalesce((
    select jsonb_agg(jsonb_build_object('ref_code', m.ref_code, 'name', m.name, 'since', f.created_at,
                                        'referral_count', m.referral_count, 'badges', public.lc7_badges_json(m.id))
                     order by f.created_at desc)
      from public.lc7_friendships f
      join public.lc7_members m on m.id = case when f.a = p_id then f.b else f.a end
     where (f.a = p_id or f.b = p_id) and not m.banned), '[]'::jsonb));
end $$;

-- One call per finished game by a referred player. The referrer earns the Vampire share (idempotent per game).
create or replace function public.lc7_report_game_xp(p_id uuid, p_token text, p_game_id text, p_xp integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ref uuid; v_pct numeric; v_xp numeric; v_rows integer;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if p_game_id is null or p_game_id !~ '^[A-Za-z0-9_:.-]{1,64}$' or p_xp is null or p_xp < 1
     or p_xp > public.lc7_cfg_num('vampire_game_xp_cap', 5000) then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;
  if not public.lc7_rate_ok('xp', p_id::text, 300, interval '1 hour') then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  update public.lc7_members set last_active_at = now() where id = p_id;
  select referrer_id into v_ref from public.lc7_members where id = p_id;
  if v_ref is null or not exists (select 1 from public.lc7_members where id = v_ref and vampire_unlocked_at is not null and not banned) then
    return jsonb_build_object('ok', true, 'credited', false);
  end if;
  v_pct := public.lc7_vampire_pct(v_ref);
  v_xp  := p_xp * v_pct / 100;
  insert into public.lc7_vampire_ledger (referrer_id, source_id, game_id, base_xp, pct, xp)
  values (v_ref, p_id, p_game_id, p_xp, v_pct, v_xp) on conflict (source_id, game_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 1 then update public.lc7_members set vampire_xp_pending = vampire_xp_pending + v_xp where id = v_ref; end if;
  return jsonb_build_object('ok', true, 'credited', v_rows = 1);
end $$;

-- GDPR style erase. Partner rows and purchases stay (accounting) but lose the link to the person.
create or replace function public.lc7_forget_me(p_id uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  delete from public.lc7_members where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- -----------------------------------------------------------------------------------------------------
-- 3. ONBOARDING ATTRIBUTION (7-day window)
-- -----------------------------------------------------------------------------------------------------
create or replace function public.lc7_approved_partners()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', code, 'name', name, 'flair', flair, 'is_house', is_house)
                            order by is_house desc, lower(name)), '[]'::jsonb)
    from public.lc7_partners where status = 'approved'
$$;

-- p_mark = true records "pop-up shown today" so it opens at most once per day.
create or replace function public.lc7_attribution_state(p_id uuid, p_token text, p_mark boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_j jsonb;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  perform public.lc7_refresh_lock(p_id);
  v_j := public.lc7_attr_json(p_id);
  if p_mark and (v_j ->> 'should_prompt')::boolean then
    update public.lc7_members set attr_last_prompt_on = current_date where id = p_id;
  end if;
  return jsonb_build_object('ok', true) || v_j;
end $$;

create or replace function public.lc7_attribution_submit(p_id uuid, p_token text, p_platform text, p_partner_code text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_plat text := lower(btrim(coalesce(p_platform, ''))); v_res jsonb; v_partner uuid; v_locked boolean;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if not public.lc7_rate_ok('attr', p_id::text, 20, interval '1 hour') then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  perform public.lc7_refresh_lock(p_id);
  if v_plat not in ('youtube','tiktok','instagram','facebook','friend','skool','search','other') then
    return jsonb_build_object('ok', false, 'error', 'invalid_platform');
  end if;
  select attr_locked into v_locked from public.lc7_members where id = p_id;
  if v_locked then return jsonb_build_object('ok', false, 'error', 'locked'); end if;
  if nullif(btrim(coalesce(p_partner_code, '')), '') is null then
    v_partner := public.lc7_house_id();
  else
    v_res := public.lc7_resolve_code(p_partner_code);
    if v_res is null or v_res ->> 'kind' <> 'partner' then return jsonb_build_object('ok', false, 'error', 'unknown_code'); end if;
    v_partner := (v_res ->> 'id')::uuid;
  end if;
  update public.lc7_members
     set attr_platform = v_plat, attr_partner_id = v_partner, attr_status = 'confirmed', attr_via = 'survey', attr_set_at = now()
   where id = p_id;
  return jsonb_build_object('ok', true) || public.lc7_attr_json(p_id);
end $$;

-- The pop-up was closed: starts the 60 second undo bar on the client and counts the dismissal.
create or replace function public.lc7_attribution_dismiss(p_id uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  update public.lc7_members
     set attr_dismissed_at = now(), attr_dismiss_count = attr_dismiss_count + 1, attr_last_prompt_on = current_date
   where id = p_id;
  return jsonb_build_object('ok', true, 'undo_until', now() + interval '60 seconds');
end $$;

-- "Member Access" > Creator Support Code. Inside the 7 days it sets the PERMANENT referrer and locks it.
create or replace function public.lc7_apply_support_code(p_id uuid, p_token text, p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_res jsonb; v_locked boolean; p public.lc7_partners%rowtype;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if not public.lc7_rate_ok('support', p_id::text, 10, interval '1 hour') then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  perform public.lc7_refresh_lock(p_id);
  select attr_locked into v_locked from public.lc7_members where id = p_id;
  if v_locked then return jsonb_build_object('ok', false, 'error', 'window_closed'); end if;
  v_res := public.lc7_resolve_code(p_code);
  if v_res is null or v_res ->> 'kind' <> 'partner' then return jsonb_build_object('ok', false, 'error', 'unknown_code'); end if;
  select * into p from public.lc7_partners where id = (v_res ->> 'id')::uuid;
  if p.is_house then return jsonb_build_object('ok', false, 'error', 'unknown_code'); end if;
  update public.lc7_members
     set attr_partner_id = p.id, attr_status = 'confirmed', attr_via = 'support_code', attr_set_at = now(),
         attr_locked = true, attr_locked_at = now()
   where id = p_id;
  return jsonb_build_object('ok', true, 'partner_name', p.name) || public.lc7_attr_json(p_id);
end $$;

-- -----------------------------------------------------------------------------------------------------
-- 4. PARTNER PROGRAM: application, admin approval, dashboard, profile links, toolkit
-- -----------------------------------------------------------------------------------------------------
create or replace function public.lc7_apply_partner(p_id uuid, p_token text, p_channel_name text, p_contact text,
                                                    p_socials jsonb default '{}', p_stats jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_name text := public.lc7_clean(p_channel_name, 80); v_contact text := public.lc7_clean(p_contact, 200); v_app uuid;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if length(v_name) < 2 or length(v_contact) < 5 then return jsonb_build_object('ok', false, 'error', 'invalid_request'); end if;
  if jsonb_typeof(coalesce(p_socials, '{}')) <> 'object' or jsonb_typeof(coalesce(p_stats, '{}')) <> 'object'
     or length(coalesce(p_socials, '{}')::text) > 2000 or length(coalesce(p_stats, '{}')::text) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;
  if not public.lc7_rate_ok('apply', p_id::text, 3, interval '1 day') then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  if exists (select 1 from public.lc7_members where id = p_id and account_type = 'business') then return jsonb_build_object('ok', false, 'error', 'already_partner'); end if;
  if exists (select 1 from public.lc7_partner_applications where member_id = p_id and status = 'pending') then return jsonb_build_object('ok', false, 'error', 'already_pending'); end if;
  insert into public.lc7_partner_applications (member_id, channel_name, contact_email, socials, stats)
  values (p_id, v_name, v_contact, coalesce(p_socials, '{}'), coalesce(p_stats, '{}')) returning id into v_app;
  return jsonb_build_object('ok', true, 'application_id', v_app);
end $$;

-- Admin: approve (creates the partner + tracking link, flips the account to Business) or reject.
create or replace function public.lc7_admin_decide_application(p_app_id uuid, p_approve boolean, p_code text default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.lc7_partner_applications%rowtype; v_code text; v_pid uuid;
begin
  if not public.lc7_is_admin() then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  select * into a from public.lc7_partner_applications where id = p_app_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if a.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'already_decided'); end if;
  if not coalesce(p_approve, false) then
    update public.lc7_partner_applications set status = 'rejected', admin_note = public.lc7_clean(p_note, 500), decided_at = now(), decided_by = auth.uid() where id = p_app_id;
    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;
  if exists (select 1 from public.lc7_partners where member_id = a.member_id) then return jsonb_build_object('ok', false, 'error', 'already_partner'); end if;
  v_code := lower(btrim(coalesce(nullif(p_code, ''), 'c-' || substr(md5(gen_random_uuid()::text), 1, 6))));
  if v_code !~ '^[a-z0-9][a-z0-9-]{2,23}$' then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  if exists (select 1 from public.lc7_partners where code = v_code) or exists (select 1 from public.lc7_members where ref_code = v_code) then
    return jsonb_build_object('ok', false, 'error', 'code_taken');
  end if;
  insert into public.lc7_partners (code, member_id, name, kind, contact_email, approved_at, approved_by)
  values (v_code, a.member_id, a.channel_name, 'creator', a.contact_email, now(), auth.uid()) returning id into v_pid;
  update public.lc7_members set account_type = 'business' where id = a.member_id;
  perform public.lc7_award_badge(a.member_id, 'partner');
  update public.lc7_partner_applications
     set status = 'approved', partner_id = v_pid, admin_note = public.lc7_clean(p_note, 500), decided_at = now(), decided_by = auth.uid()
   where id = p_app_id;
  return jsonb_build_object('ok', true, 'status', 'approved', 'partner_id', v_pid, 'code', v_code,
                            'tracking_link', rtrim(public.lc7_cfg_txt('app_url', ''), '/') || '/?ref=' || v_code);
end $$;

create or replace function public.lc7_partner_dashboard(p_id uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.lc7_partners%rowtype;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.lc7_partners where member_id = p_id and not is_house;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_partner'); end if;
  return jsonb_build_object(
    'ok', true,
    'partner', jsonb_build_object('code', p.code, 'name', p.name, 'status', p.status, 'flair', p.flair, 'badge', p.badge,
        'links', p.links, 'links_pending', p.links_pending, 'links_status', p.links_status,
        'tracking_link', rtrim(public.lc7_cfg_txt('app_url', ''), '/') || '/?ref=' || p.code),
    'bometer', jsonb_build_object('balance_cents', p.balance_cents, 'earned_cents', p.earned_cents, 'spent_cents', p.spent_cents,
        'direct_pct', public.lc7_cfg_num('credit_direct_pct', 30), 'support_pct', public.lc7_cfg_num('credit_support_pct', 10)),
    'followers', (select count(*) from public.lc7_members m where m.attr_partner_id = p.id and m.id is distinct from p.member_id and not m.banned),
    'purchases', (select jsonb_build_object('count', count(*), 'credited_cents', coalesce(sum(credit_cents), 0))
                    from public.lc7_purchases where partner_id = p.id and status = 'paid'),
    'ledger', coalesce((select jsonb_agg(to_jsonb(l) - 'partner_id') from (select id, delta_cents, reason, note, created_at from public.lc7_credit_ledger where partner_id = p.id order by id desc limit 20) l), '[]'::jsonb),
    'orders', coalesce((select jsonb_agg(to_jsonb(o) - 'partner_id' - 'payload') from (select id, sku, qty, cost_cents, status, created_at from public.lc7_shop_orders where partner_id = p.id order by created_at desc limit 10) o), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(to_jsonb(e)) from (select id, title, multiplier, starts_at, ends_at, status from public.lc7_events where partner_id = p.id order by starts_at desc limit 10) e), '[]'::jsonb),
    'modules', coalesce((select jsonb_agg(to_jsonb(x)) from (select id, title, side, status, repertoire_key, created_at from public.lc7_partner_modules where partner_id = p.id order by created_at desc) x), '[]'::jsonb));
end $$;

-- Partner submits public links; they only show on the Hall of Fame after an admin approves them.
create or replace function public.lc7_partner_update_profile(p_id uuid, p_token text, p_links jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_clean jsonb; v_pid uuid;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select id into v_pid from public.lc7_partners where member_id = p_id and not is_house and status = 'approved';
  if not found then return jsonb_build_object('ok', false, 'error', 'not_partner'); end if;
  if p_links is null or jsonb_typeof(p_links) <> 'array' or jsonb_array_length(p_links) > 6 then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('label', public.lc7_clean(e ->> 'label', 30, 'Link'), 'url', left(e ->> 'url', 200))), '[]'::jsonb)
    into v_clean
    from jsonb_array_elements(p_links) e
   where jsonb_typeof(e) = 'object' and (e ->> 'url') ~* '^https://[^\s<>"'']{4,}$';
  update public.lc7_partners set links_pending = v_clean, links_status = 'pending' where id = v_pid;
  return jsonb_build_object('ok', true, 'links_pending', v_clean);
end $$;

create or replace function public.lc7_admin_approve_links(p_partner_id uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.lc7_is_admin() then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  update public.lc7_partners
     set links = case when p_approve then coalesce(links_pending, '[]'::jsonb) else links end,
         links_pending = case when p_approve then null else links_pending end,
         links_status = case when p_approve then 'approved' else 'rejected' end
   where id = p_partner_id and links_status = 'pending';
  if not found then return jsonb_build_object('ok', false, 'error', 'nothing_pending'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.lc7_partner_toolkit(p_id uuid, p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p public.lc7_partners%rowtype; v_link text;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.lc7_partners where member_id = p_id and not is_house and status = 'approved';
  if not found then return jsonb_build_object('ok', false, 'error', 'not_partner'); end if;
  v_link := rtrim(public.lc7_cfg_txt('app_url', ''), '/') || '/?ref=' || p.code;
  return jsonb_build_object('ok', true, 'templates', coalesce((
    select jsonb_agg(jsonb_build_object('id', t.id, 'kind', t.kind, 'platform', t.platform, 'title', t.title,
        'body', replace(replace(replace(replace(t.body, '{{link}}', v_link), '{{code}}', p.code), '{{name}}', p.name), '{{app_url}}', public.lc7_cfg_txt('app_url', '')))
        order by t.sort, t.id)
      from public.lc7_toolkit t where t.active), '[]'::jsonb));
end $$;

-- -----------------------------------------------------------------------------------------------------
-- 5. PURCHASES, CREDIT CONVERSION (30% direct / 10% support code), REFUNDS
-- -----------------------------------------------------------------------------------------------------
-- One credit per purchase. Priority: (1) the buyer's attributed partner earns 30%; (2) otherwise a valid support code
-- earns its partner 10%. The house partner and the partner's own purchases never earn credit.
create or replace function public.lc7_record_purchase_internal(
  p_member uuid, p_product text, p_amount_cents integer, p_source text, p_ref text,
  p_support_code text default null, p_discount_code text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m public.lc7_members%rowtype; v_attr public.lc7_partners%rowtype; v_sup public.lc7_partners%rowtype;
  v_res jsonb; v_pid uuid := gen_random_uuid(); v_credit bigint := 0; v_type text; v_partner uuid;
  v_disc boolean := false;
begin
  if p_product not in ('beginner_course','pro_lifetime','pro_subscription','other') or p_amount_cents is null or p_amount_cents < 0
     or p_ref is null or length(btrim(p_ref)) < 3 then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;
  if exists (select 1 from public.lc7_purchases where external_ref = p_ref) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  select * into m from public.lc7_members where id = p_member for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'member_not_found'); end if;
  perform public.lc7_refresh_lock(p_member);

  select * into v_attr from public.lc7_partners where id = m.attr_partner_id and status = 'approved' and not is_house;
  if found and v_attr.member_id is distinct from m.id then
    v_credit := floor(p_amount_cents * public.lc7_cfg_num('credit_direct_pct', 30) / 100); v_type := 'direct'; v_partner := v_attr.id;
  else
    v_res := public.lc7_resolve_code(p_support_code);
    if v_res is not null and v_res ->> 'kind' = 'partner' then
      select * into v_sup from public.lc7_partners where id = (v_res ->> 'id')::uuid and not is_house;
      if found and v_sup.member_id is distinct from m.id then
        v_credit := floor(p_amount_cents * public.lc7_cfg_num('credit_support_pct', 10) / 100); v_type := 'support_code'; v_partner := v_sup.id;
      end if;
    end if;
  end if;

  if p_discount_code is not null then
    update public.lc7_discount_codes set used_at = now(), purchase_id = v_pid
     where code = upper(btrim(p_discount_code)) and member_id = p_member and used_at is null and expires_at > now();
    v_disc := found;
  end if;

  insert into public.lc7_purchases (id, member_id, product, amount_cents, source, external_ref, discount_code, partner_id, credit_type, credit_cents)
  values (v_pid, p_member, p_product, p_amount_cents, coalesce(p_source, 'manual'), btrim(p_ref),
          case when v_disc then upper(btrim(p_discount_code)) end, v_partner, v_type, v_credit);

  if v_credit > 0 then
    update public.lc7_partners set balance_cents = balance_cents + v_credit, earned_cents = earned_cents + v_credit where id = v_partner;
    insert into public.lc7_credit_ledger (partner_id, delta_cents, reason, purchase_id)
    values (v_partner, v_credit, case when v_type = 'direct' then 'purchase_direct' else 'purchase_support' end, v_pid);
  end if;

  if p_product = 'beginner_course' and not m.beginner_access then
    update public.lc7_members set beginner_access = true, beginner_source = case when p_source = 'play_billing' then 'iap' else 'purchase' end, beginner_at = now() where id = p_member;
  elsif p_product = 'pro_lifetime' then
    update public.lc7_members set pro_lifetime = true, pro_source = coalesce(p_source, 'purchase') where id = p_member;
  end if;

  return jsonb_build_object('ok', true, 'purchase_id', v_pid, 'credit_cents', v_credit, 'credit_type', v_type, 'discount_applied', v_disc);
end $$;

-- Admin (Skool or manual sale). Identify the buyer by member id or by the email linked on the member.
create or replace function public.lc7_admin_record_purchase(
  p_member_id uuid, p_email text, p_product text, p_amount_cents integer, p_source text, p_ref text,
  p_support_code text default null, p_discount_code text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_m uuid := p_member_id;
begin
  if not public.lc7_is_admin() then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  if v_m is null and p_email is not null then select id into v_m from public.lc7_members where lower(email) = lower(btrim(p_email)) limit 1; end if;
  if v_m is null then return jsonb_build_object('ok', false, 'error', 'member_not_found'); end if;
  return public.lc7_record_purchase_internal(v_m, p_product, p_amount_cents, p_source, p_ref, p_support_code, p_discount_code);
end $$;

-- Edge Function (service role) after it verified a Google Play Billing purchase with Google. p_ref = Play order id.
create or replace function public.lc7_service_record_purchase(
  p_member_id uuid, p_product text, p_amount_cents integer, p_ref text,
  p_support_code text default null, p_discount_code text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  return public.lc7_record_purchase_internal(p_member_id, p_product, p_amount_cents, 'play_billing', p_ref, p_support_code, p_discount_code);
end $$;

create or replace function public.lc7_admin_refund_purchase(p_purchase_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare x public.lc7_purchases%rowtype;
begin
  if not public.lc7_is_admin() then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  select * into x from public.lc7_purchases where id = p_purchase_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if x.status = 'refunded' then return jsonb_build_object('ok', false, 'error', 'already_refunded'); end if;
  update public.lc7_purchases set status = 'refunded' where id = x.id;
  if x.credit_cents > 0 and x.partner_id is not null then
    update public.lc7_partners set balance_cents = balance_cents - x.credit_cents, earned_cents = earned_cents - x.credit_cents where id = x.partner_id;
    insert into public.lc7_credit_ledger (partner_id, delta_cents, reason, purchase_id, note) values (x.partner_id, -x.credit_cents, 'refund', x.id, 'Purchase refunded');
  end if;
  return jsonb_build_object('ok', true, 'note', 'Credit reversed. Switch off the buyer''s access by hand with lc7_admin_set_access if needed.');
end $$;

create or replace function public.lc7_admin_adjust_credits(p_partner_id uuid, p_delta_cents bigint, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.lc7_is_admin() then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  update public.lc7_partners
     set balance_cents = balance_cents + p_delta_cents,
         earned_cents = case when p_delta_cents > 0 then earned_cents + p_delta_cents else earned_cents end
   where id = p_partner_id and not is_house;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  insert into public.lc7_credit_ledger (partner_id, delta_cents, reason, note) values (p_partner_id, p_delta_cents, 'admin_adjust', public.lc7_clean(p_note, 200));
  return jsonb_build_object('ok', true);
end $$;

-- -----------------------------------------------------------------------------------------------------
-- 6. BUSINESS SHOP
-- -----------------------------------------------------------------------------------------------------
create or replace function public.lc7_shop_catalog()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('sku', sku, 'kind', kind, 'label', label, 'description', description,
                                               'cost_cents', cost_cents, 'config', config) order by sort), '[]'::jsonb)
    from public.lc7_shop_items where active
$$;

create or replace function public.lc7_partner_redeem(p_id uuid, p_token text, p_sku text, p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_p public.lc7_partners%rowtype; v_item public.lc7_shop_items%rowtype;
  v_qty integer := 1; v_cost bigint; v_order uuid := gen_random_uuid(); v_left bigint;
  v_keys jsonb := '[]'::jsonb; v_key text; v_i integer; v_class text; v_prefix text;
  v_start timestamptz; v_end timestamptz; v_hours integer; v_title text; v_popup text; v_mult numeric;
  v_event jsonb; v_module jsonb; v_side text;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if not public.lc7_rate_ok('redeem', p_id::text, 30, interval '1 hour') then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  select * into v_p from public.lc7_partners where member_id = p_id and status = 'approved' and not is_house for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_partner'); end if;
  select * into v_item from public.lc7_shop_items where sku = p_sku and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'unknown_item'); end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then p_payload := '{}'; end if;

  -- validate everything BEFORE charging
  if v_item.kind in ('pro_lifetime_key', 'pro_pass') then
    v_qty := case when p_payload ->> 'qty' ~ '^[0-9]{1,3}$' then least(20, greatest(1, (p_payload ->> 'qty')::int)) else 1 end;
  elsif v_item.kind in ('giveaway_pack', 'beginner_pack') then
    v_qty := greatest(1, coalesce((v_item.config ->> 'qty')::int, 1));
  end if;
  v_cost := v_item.cost_cents * case when v_item.kind in ('pro_lifetime_key', 'pro_pass') then v_qty else 1 end;

  if v_item.kind = 'xp_boost' then
    v_hours := coalesce((v_item.config ->> 'hours')::int, 24);
    v_mult  := coalesce((v_item.config ->> 'multiplier')::numeric, 1.5);
    begin v_start := coalesce(nullif(p_payload ->> 'starts_at', '')::timestamptz, now()); exception when others then v_start := null; end;
    if v_start is null or v_start < now() - interval '10 minutes' or v_start > now() + interval '90 days' then
      return jsonb_build_object('ok', false, 'error', 'bad_start');
    end if;
    v_start := greatest(v_start, now());
    v_end   := v_start + make_interval(hours => v_hours);
    if exists (select 1 from public.lc7_events e where e.partner_id = v_p.id and e.status = 'scheduled'
                  and tstzrange(e.starts_at, e.ends_at) && tstzrange(v_start, v_end)) then
      return jsonb_build_object('ok', false, 'error', 'event_overlap');
    end if;
    v_title := public.lc7_clean(p_payload ->> 'title', 60, v_p.name || ' XP Boost');
    v_popup := public.lc7_clean(p_payload ->> 'popup_text', 240, v_p.name || ' is hosting a 1.5x XP boost for the community. Train now and make it count.');
  elsif v_item.kind = 'custom_module' then
    v_title := public.lc7_clean(p_payload ->> 'title', 80);
    v_side  := lower(coalesce(p_payload ->> 'side', 'both'));
    if length(v_title) < 3 or v_side not in ('white', 'black', 'both') then return jsonb_build_object('ok', false, 'error', 'invalid_request'); end if;
  end if;

  update public.lc7_partners set balance_cents = balance_cents - v_cost, spent_cents = spent_cents + v_cost
   where id = v_p.id and balance_cents >= v_cost returning balance_cents into v_left;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'insufficient_credits', 'cost_cents', v_cost, 'balance_cents', v_p.balance_cents);
  end if;
  insert into public.lc7_shop_orders (id, partner_id, sku, qty, cost_cents, payload) values (v_order, v_p.id, v_item.sku, v_qty, v_cost, p_payload);
  insert into public.lc7_credit_ledger (partner_id, delta_cents, reason, order_id, note) values (v_p.id, -v_cost, 'shop_spend', v_order, v_item.label);

  if v_item.kind in ('pro_lifetime_key', 'pro_pass', 'giveaway_pack', 'beginner_pack') then
    v_class  := case v_item.kind when 'pro_lifetime_key' then 'pro_lifetime' when 'pro_pass' then 'pro_pass'
                                 when 'giveaway_pack' then 'giveaway_pro' else 'beginner' end;
    v_prefix := case when v_class = 'beginner' then 'LCB' else 'LCP' end;
    for v_i in 1..v_qty loop
      loop
        v_key := public.lc7_new_key(v_prefix);
        exit when not exists (select 1 from public.lc7_keys where key = v_key);
      end loop;
      insert into public.lc7_keys (key, key_class, partner_id, order_id, source, label, pass_days)
      values (v_key, v_class, v_p.id, v_order, 'shop', v_item.label, case when v_class = 'pro_pass' then coalesce((v_item.config ->> 'days')::int, 30) end);
      v_keys := v_keys || to_jsonb(v_key);
    end loop;
  elsif v_item.kind = 'xp_boost' then
    insert into public.lc7_events (partner_id, order_id, multiplier, title, popup_text, starts_at, ends_at)
    values (v_p.id, v_order, v_mult, v_title, v_popup, v_start, v_end);
    v_event := jsonb_build_object('title', v_title, 'multiplier', v_mult, 'starts_at', v_start, 'ends_at', v_end);
  elsif v_item.kind = 'custom_module' then
    insert into public.lc7_partner_modules (partner_id, order_id, title, side, notes)
    values (v_p.id, v_order, v_title, v_side, public.lc7_clean(p_payload ->> 'notes', 1000));
    v_module := jsonb_build_object('title', v_title, 'side', v_side, 'status', 'ordered');
  end if;

  return jsonb_build_object('ok', true, 'order_id', v_order, 'cost_cents', v_cost, 'balance_cents', v_left,
                            'keys', v_keys, 'event', v_event, 'module', v_module);
end $$;

create or replace function public.lc7_partner_keys(p_id uuid, p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_pid uuid;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select id into v_pid from public.lc7_partners where member_id = p_id and not is_house;
  return jsonb_build_object('ok', true, 'keys', coalesce((
    select jsonb_agg(jsonb_build_object('key', k.key, 'class', k.key_class, 'status', k.status, 'label', k.label, 'redeemed_at', k.redeemed_at, 'created_at', k.created_at) order by k.created_at desc)
      from (select * from public.lc7_keys where owner_member_id = p_id or (v_pid is not null and partner_id = v_pid) order by created_at desc limit 200) k), '[]'::jsonb));
end $$;

create or replace function public.lc7_my_keys(p_id uuid, p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  return public.lc7_partner_keys(p_id, p_token);
end $$;

-- -----------------------------------------------------------------------------------------------------
-- 7. KEY REDEMPTION: Beginner Keys, Pro keys and the OVER-THE-CAP conversion (anti arbitrage)
-- -----------------------------------------------------------------------------------------------------
-- A Pro Lifetime / giveaway key redeemed by someone who ALREADY owns Pro Lifetime is NOT activated. It is converted into
-- N Beginner Keys (default 15, owned by the winner so they can hand them out) + the Community Legend badge + VIP Q&A invite.
-- A Pro redemption mints a normal row in public.licenses; the app then activates it with the existing lc_redeem_key flow.
create or replace function public.lc7_redeem_key(p_id uuid, p_token text, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m public.lc7_members%rowtype; k public.lc7_keys%rowtype;
  v_key text := upper(btrim(coalesce(p_key, ''))); v_pro boolean; v_lic text; v_new jsonb := '[]'::jsonb;
  v_conv integer; v_i integer; v_code text; v_email text; v_lifetime boolean; v_exp timestamptz;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if not public.lc7_rate_ok('redeem_key', p_id::text, 12, interval '1 hour') then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  if v_key !~ '^LC[BP]-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$' then return jsonb_build_object('ok', false, 'error', 'key_not_found'); end if;
  select * into m from public.lc7_members where id = p_id for update;
  select * into k from public.lc7_keys where key = v_key for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'key_not_found'); end if;
  if k.status <> 'available' then return jsonb_build_object('ok', false, 'error', case when k.status = 'revoked' then 'revoked' else 'key_used' end); end if;
  v_pro := public.lc7_owns_pro_lifetime(p_id);

  if k.key_class = 'beginner' then
    if m.beginner_access or v_pro then return jsonb_build_object('ok', false, 'error', 'already_has_access'); end if;
    update public.lc7_keys set status = 'redeemed', redeemed_by = p_id, redeemed_at = now() where id = k.id;
    update public.lc7_members set beginner_access = true, beginner_source = 'key', beginner_at = now() where id = p_id;
    return jsonb_build_object('ok', true, 'kind', 'beginner', 'converted', false);
  end if;

  if k.key_class in ('pro_lifetime', 'giveaway_pro') and v_pro then
    v_conv := public.lc7_cfg_num('conversion_beginner_keys', 15)::int;
    for v_i in 1..v_conv loop
      loop
        v_code := public.lc7_new_key('LCB');
        exit when not exists (select 1 from public.lc7_keys where key = v_code);
      end loop;
      insert into public.lc7_keys (key, key_class, owner_member_id, order_id, source, label)
      values (v_code, 'beginner', p_id, k.order_id, 'conversion', 'Community Legend prize');
      v_new := v_new || to_jsonb(v_code);
    end loop;
    update public.lc7_keys set status = 'converted', redeemed_by = p_id, redeemed_at = now() where id = k.id;
    perform public.lc7_award_badge(p_id, 'community_legend');
    update public.lc7_members set vip_qna = true, vip_since = coalesce(vip_since, now()) where id = p_id;
    return jsonb_build_object('ok', true, 'kind', 'pro', 'converted', true, 'beginner_keys', v_new, 'badge', 'community_legend',
                              'vip_qna', true, 'vip_invite_url', nullif(public.lc7_cfg_txt('vip_invite_url', ''), ''));
  end if;

  if k.key_class = 'pro_pass' and v_pro then return jsonb_build_object('ok', false, 'error', 'already_has_access'); end if;

  v_lifetime := k.key_class <> 'pro_pass';
  v_exp := case when v_lifetime then null else now() + make_interval(days => coalesce(k.pass_days, 30)) end;
  v_email := coalesce(m.email, 'member-' || m.id::text || '@members.lanckrietchess.invalid');   -- licences need an email; this one is a placeholder
  v_lic := public.lc7_mint_license(jsonb_build_object(
      'license_key', public.lc7_new_key('LC'), 'tier', 2, 'email', v_email, 'is_lifetime', v_lifetime, 'expires_at', v_exp,
      'revoked', false, 'kind', case when v_lifetime then 'Partner key: Pro Lifetime' else 'Partner key: Pro Pass' end,
      'daily_tokens', 10, 'flags', '{}'::jsonb, 'devices_max', 2, 'source', 'admin'));
  update public.lc7_keys set status = 'redeemed', redeemed_by = p_id, redeemed_at = now(), license_key = v_lic where id = k.id;
  if v_lifetime then update public.lc7_members set pro_lifetime = true, pro_source = 'key' where id = p_id; end if;
  return jsonb_build_object('ok', true, 'kind', 'pro', 'converted', false, 'license_key', v_lic, 'tier', 2,
                            'lifetime', v_lifetime, 'expires_at', v_exp, 'daily_tokens', 10, 'flags', '{}'::jsonb);
end $$;

-- Lets someone who already owns a lifetime licence (Skool, admin) be recognised, so the anti-arbitrage rule applies to them.
create or replace function public.lc7_link_license(p_id uuid, p_token text, p_license_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row jsonb;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if not public.lc7_rate_ok('link', p_id::text, 10, interval '1 hour') then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  if p_license_key is null or p_license_key !~ '^LC-[A-Za-z0-9-]{6,60}$' then return jsonb_build_object('ok', false, 'error', 'key_not_found'); end if;
  select to_jsonb(l) into v_row from public.licenses l where l.license_key = p_license_key limit 1;
  if v_row is null then return jsonb_build_object('ok', false, 'error', 'key_not_found'); end if;
  if coalesce((v_row ->> 'revoked')::boolean, false) then return jsonb_build_object('ok', false, 'error', 'revoked'); end if;
  update public.lc7_members
     set email = coalesce(email, lower(nullif(v_row ->> 'email', ''))),
         pro_lifetime = pro_lifetime or (coalesce((v_row ->> 'is_lifetime')::boolean, false) and coalesce((v_row ->> 'tier')::int, 0) >= 2),
         pro_source = case when pro_lifetime then pro_source else 'license' end
   where id = p_id;
  return jsonb_build_object('ok', true, 'pro_lifetime', public.lc7_owns_pro_lifetime(p_id));
end $$;

create or replace function public.lc7_admin_set_access(p_member_id uuid, p_beginner boolean default null, p_pro_lifetime boolean default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.lc7_is_admin() then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  update public.lc7_members
     set beginner_access = coalesce(p_beginner, beginner_access),
         beginner_source = case when p_beginner is true and not beginner_access then 'admin' when p_beginner is false then null else beginner_source end,
         beginner_at     = case when p_beginner is true and not beginner_access then now() else beginner_at end,
         pro_lifetime    = coalesce(p_pro_lifetime, pro_lifetime),
         pro_source      = case when p_pro_lifetime is true and not pro_lifetime then 'admin' else pro_source end
   where id = p_member_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.lc7_admin_grant_badge(p_member_id uuid, p_badge text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.lc7_is_admin() then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  if not exists (select 1 from public.lc7_badge_defs where code = p_badge) then return jsonb_build_object('ok', false, 'error', 'unknown_badge'); end if;
  perform public.lc7_award_badge(p_member_id, p_badge);
  return jsonb_build_object('ok', true);
end $$;

-- -----------------------------------------------------------------------------------------------------
-- 8. 1200 ELO UPSELL (48 hour countdown, EUR 200 off Full Lifetime Access)
-- -----------------------------------------------------------------------------------------------------
create or replace function public.lc7_report_elo(p_id uuid, p_token text, p_elo integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_trig uuid; v_code text;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if p_elo is null or p_elo < 100 or p_elo > 3500 then return jsonb_build_object('ok', false, 'error', 'invalid_request'); end if;
  if not public.lc7_rate_ok('elo', p_id::text, 120, interval '1 hour') then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  update public.lc7_members set elo = p_elo, elo_at = now(), last_active_at = now() where id = p_id;
  if p_elo >= public.lc7_cfg_num('upsell_elo', 1200) and not public.lc7_owns_pro_lifetime(p_id) then
    update public.lc7_members
       set upsell_started_at = now(), upsell_expires_at = now() + make_interval(hours => public.lc7_cfg_num('upsell_hours', 48)::int)
     where id = p_id and upsell_started_at is null and beginner_access
    returning id into v_trig;
    if v_trig is not null then
      v_code := public.lc7_new_key('UP12');
      insert into public.lc7_discount_codes (code, member_id, amount_cents, expires_at)
      values (v_code, p_id, public.lc7_cfg_num('upsell_discount_cents', 20000)::int, now() + make_interval(hours => public.lc7_cfg_num('upsell_hours', 48)::int));
    end if;
  end if;
  return jsonb_build_object('ok', true, 'triggered', v_trig is not null, 'upsell', public.lc7_upsell_json(p_id));
end $$;

create or replace function public.lc7_upsell_state(p_id uuid, p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  return jsonb_build_object('ok', true) || public.lc7_upsell_json(p_id);
end $$;

-- -----------------------------------------------------------------------------------------------------
-- 9. EVENTS, CREATOR MODULES, LEADERBOARDS, HALL OF FAME
-- -----------------------------------------------------------------------------------------------------
create or replace function public.lc7_admin_create_event(p_partner_id uuid, p_title text, p_hours integer, p_multiplier numeric default 1.5,
                                                         p_popup text default null, p_starts_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_start timestamptz := coalesce(p_starts_at, now());
begin
  if not public.lc7_is_admin() then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  if p_hours is null or p_hours < 1 or p_hours > 24 * 90 or p_multiplier < 1 or p_multiplier > 5 then return jsonb_build_object('ok', false, 'error', 'invalid_request'); end if;
  insert into public.lc7_events (partner_id, multiplier, title, popup_text, starts_at, ends_at)
  values (p_partner_id, p_multiplier, public.lc7_clean(p_title, 60, 'XP Boost'), public.lc7_clean(p_popup, 240), v_start, v_start + make_interval(hours => p_hours));
  return jsonb_build_object('ok', true);
end $$;

-- Boosts and pop-ups this player should see right now: platform wide ones + the ones of the partner they are attributed to.
create or replace function public.lc7_active_events(p_id uuid, p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_partner uuid;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select attr_partner_id into v_partner from public.lc7_members where id = p_id;
  return jsonb_build_object('ok', true, 'events', coalesce((
    select jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'multiplier', e.multiplier, 'title', e.title, 'popup_text', e.popup_text,
                                        'starts_at', e.starts_at, 'ends_at', e.ends_at, 'host', p.name, 'host_code', p.code) order by e.ends_at)
      from public.lc7_events e left join public.lc7_partners p on p.id = e.partner_id
     where e.status = 'scheduled' and now() >= e.starts_at and now() < e.ends_at
       and (e.partner_id is null or e.partner_id = v_partner)), '[]'::jsonb));
end $$;

-- Creator dropdown inside the opening trainer. The lines themselves live in content.json under repertoire_key.
create or replace function public.lc7_creator_modules()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('partner_code', p.code, 'partner_name', p.name, 'title', x.title, 'side', x.side,
                                               'repertoire_key', x.repertoire_key) order by lower(p.name), x.title), '[]'::jsonb)
    from public.lc7_partner_modules x join public.lc7_partners p on p.id = x.partner_id
   where x.status = 'live' and x.repertoire_key is not null and p.status = 'approved'
$$;

create or replace function public.lc7_top_creators(p_limit integer default 10)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by (x ->> 'rank')::int), '[]'::jsonb) from (
    select jsonb_build_object('rank', row_number() over (order by f.followers desc, p.created_at), 'code', p.code, 'name', p.name,
             'followers', f.followers, 'flair', p.flair, 'badge', p.badge,
             'links', case when p.links_status = 'approved' then p.links else '[]'::jsonb end) as x
      from public.lc7_partners p
      cross join lateral (select count(*)::int as followers from public.lc7_members m
                           where m.attr_partner_id = p.id and m.id is distinct from p.member_id and not m.banned) f
     where not p.is_house and p.status = 'approved' and f.followers > 0
     order by f.followers desc, p.created_at
     limit least(greatest(coalesce(p_limit, 10), 1), 50)
  ) s
$$;

-- Private referrers whose referral_count lies in [p_min, p_max] (p_max null = no upper bound).
create or replace function public.lc7_ref_list(p_min integer, p_max integer, p_limit integer)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by (x ->> 'rank')::int), '[]'::jsonb) from (
    select jsonb_build_object('rank', row_number() over (order by m.referral_count desc, m.created_at), 'name', m.name,
             'count', m.referral_count, 'business', m.account_type = 'business',
             'badges', public.lc7_badges_json(m.id),
             'flair', p.flair, 'links', case when p.links_status = 'approved' then p.links end) as x
      from public.lc7_members m left join public.lc7_partners p on p.member_id = m.id
     where m.public_profile and not m.banned and m.referral_count >= greatest(p_min, 1)
       and (p_max is null or m.referral_count <= p_max)
     order by m.referral_count desc, m.created_at
     limit least(greatest(coalesce(p_limit, 10), 1), 200)
  ) s
$$;

create or replace function public.lc7_top_referrers(p_limit integer default 10)
returns jsonb language sql stable security definer set search_path = public as $$
  select public.lc7_ref_list(1, null, p_limit)
$$;

-- Tier 1 = the homepage Top 10 lists. Tier 2 Vampire Elite Vanguard 100+, Tier 3 Challengers 50-99, Tier 4 Contenders 10-49.
create or replace function public.lc7_hall_of_fame(p_limit integer default 50)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'tier1', jsonb_build_object('title', 'Grandmasters', 'creators', public.lc7_top_creators(10), 'referrers', public.lc7_top_referrers(10)),
    'tier2', jsonb_build_object('title', 'Vampire Elite Vanguard', 'min', 100, 'members', public.lc7_ref_list(100, null, p_limit)),
    'tier3', jsonb_build_object('title', 'Challengers', 'min', 50, 'max', 99, 'members', public.lc7_ref_list(50, 99, p_limit)),
    'tier4', jsonb_build_object('title', 'Contenders', 'min', 10, 'max', 49, 'members', public.lc7_ref_list(10, 49, p_limit)),
    'generated_at', now())
$$;

-- -----------------------------------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY + GRANTS
-- -----------------------------------------------------------------------------------------------------
-- Every table: RLS on, nothing readable for anon. The signed-in admin gets a policy; players use the RPCs above.
do $$
declare t text;
begin
  foreach t in array array[
    'lc7_cfg','lc7_members','lc7_partners','lc7_partner_applications','lc7_referrals','lc7_friendships','lc7_token_ledger',
    'lc7_vampire_ledger','lc7_badge_defs','lc7_member_badges','lc7_purchases','lc7_credit_ledger','lc7_shop_items',
    'lc7_shop_orders','lc7_keys','lc7_events','lc7_partner_modules','lc7_toolkit','lc7_discount_codes','lc7_rate_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('drop policy if exists lc7_admin_all on public.%I', t);
    if t = 'lc7_rate_log' then continue; end if;
    if t = 'lc7_members' then
      -- admins may read members but never the token hash or the device hash
      execute (select format('grant select (%s) on public.lc7_members to authenticated', string_agg(quote_ident(column_name), ','))
                 from information_schema.columns
                where table_schema = 'public' and table_name = 'lc7_members' and column_name not in ('token_hash', 'device_hash'));
      execute 'grant update (banned, public_profile, name, email, account_type, beginner_access, pro_lifetime, vip_qna) on public.lc7_members to authenticated';
      execute 'create policy lc7_admin_all on public.lc7_members for all to authenticated using (public.lc7_is_admin()) with check (public.lc7_is_admin())';
    else
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
      execute format('create policy lc7_admin_all on public.%I for all to authenticated using (public.lc7_is_admin()) with check (public.lc7_is_admin())', t);
    end if;
  end loop;
end $$;

grant usage, select on all sequences in schema public to authenticated;

-- Functions: nothing is callable by default. Then open exactly what each role needs.
do $$
declare
  r record;
  v_player text[] := array[
    'lc7_register','lc7_me','lc7_claim_rewards','lc7_set_profile','lc7_friends','lc7_report_game_xp','lc7_forget_me',
    'lc7_approved_partners','lc7_attribution_state','lc7_attribution_submit','lc7_attribution_dismiss','lc7_apply_support_code',
    'lc7_apply_partner','lc7_partner_dashboard','lc7_partner_update_profile','lc7_partner_toolkit',
    'lc7_shop_catalog','lc7_partner_redeem','lc7_partner_keys','lc7_my_keys','lc7_redeem_key','lc7_link_license',
    'lc7_report_elo','lc7_upsell_state','lc7_active_events','lc7_creator_modules',
    'lc7_top_creators','lc7_top_referrers','lc7_hall_of_fame'];
begin
  for r in select p.oid::regprocedure as sig, p.proname as name
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname like 'lc7\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
    if r.name = any (v_player) then
      execute format('grant execute on function %s to anon, authenticated', r.sig);
    elsif r.name like 'lc7\_admin\_%' or r.name in ('lc7_is_admin', 'lc7_lock_expired_attributions') then
      execute format('grant execute on function %s to authenticated', r.sig);
    end if;
  end loop;
end $$;

commit;

-- Optional (pg_cron): lock expired attribution windows nightly. The RPCs also lock lazily, so this is only tidiness.
--   select cron.schedule('lc7-lock-attribution', '5 0 * * *', $$update public.lc7_members set attr_locked = true, attr_locked_at = now()
--     where not attr_locked and created_at + interval '7 days' <= now()$$);
