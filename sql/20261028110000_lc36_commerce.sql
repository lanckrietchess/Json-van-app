-- LC36 commerce (hub 9.14.0): token packs bought on the web, and the VIP tier (Tier 3) with its own founding tranches.
-- Idempotent. Not applied by the assistant. Run in the Supabase SQL editor after 20261028100000_lc36_netflix_data.sql.
--
-- 1. VIP has its OWN tranche counters (first 100 VIP buyers pay tranche 1, the next 100 tranche 2, then standard), exactly like Pro.
--    The slot index therefore includes the tier. VIP buys the same product as Pro (a Pro licence, flagged vip), only at a higher price.
alter table arena.lc34_pro_sales add column if not exists tier smallint not null default 2 check (tier in (2, 3));
-- The yearly ladder now has THREE discounted tranches (1 = Founding 50%, 2 = Early Adopter 25%, 3 = 10%) and tranche 4 = full price.
alter table arena.lc34_pro_sales drop constraint if exists lc34_pro_sales_tranche_check;
alter table arena.lc34_pro_sales add constraint lc34_pro_sales_tranche_check check (tranche in (1, 2, 3, 4));
drop index if exists arena.lc34_slot_uq;
create unique index if not exists lc34_slot_uq on arena.lc34_pro_sales (tier, tranche, slot) where status in ('open', 'paid') and slot is not null;

-- 2. Token packs. A purchase is filed under the BUYER'S EMAIL; the Arena moves it into the member's token wallet when that member signs in
--    with the same verified email (arena action tokens_claim_email). One row per Stripe Checkout session: a repeated webhook adds nothing.
create table if not exists public.lc36_token_credits (
  id            bigserial primary key,
  email         text        not null check (email = lower(email)),
  tokens        integer     not null check (tokens > 0),
  pack          text        not null,
  amount_cents  integer     not null,
  session_id    text        not null unique,
  created_at    timestamptz not null default now(),
  claimed_at    timestamptz,
  claimed_owner text
);
create index if not exists lc36_credits_open_ix on public.lc36_token_credits (email) where claimed_at is null;
alter table public.lc36_token_credits enable row level security;
revoke all on public.lc36_token_credits from anon, authenticated;
do $$ begin grant select, insert, update on public.lc36_token_credits to service_role; grant usage, select on sequence public.lc36_token_credits_id_seq to service_role; exception when undefined_object then null; end $$;
