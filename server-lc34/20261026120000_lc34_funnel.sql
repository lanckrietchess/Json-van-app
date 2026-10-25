-- =====================================================================================================================
-- LC34 migration (hub 9.12.0): Pro subscription sales with Founding / Early Adopter tranches.
-- Idempotent. Run AFTER 20261025100000_lc28_creator_hub.sql. Needs public.licenses and public._lc_create_license(...) (already in production).
-- One row per Checkout session. A tranche slot (1..cap) is held while the session is open and kept when it is paid. The partial unique index is
-- what makes it impossible to sell more than the cap, however many people press the button at the same moment.
-- =====================================================================================================================
begin;

create table if not exists arena.lc34_pro_sales (
  session_id      text primary key,
  email           text not null default '',
  plan            text not null check (plan in ('yearly','monthly')),
  tranche         int  check (tranche in (1,2,3)),
  slot            int  check (slot >= 1),
  amount_cents    int  not null check (amount_cents > 0),
  status          text not null default 'open' check (status in ('open','paid','expired','refunded')),
  device          text not null default '',
  created         bigint not null,
  expires         bigint not null,
  paid_at         bigint,
  subscription_id text,
  customer_id     text,
  license_key     text,
  license_expires bigint
);
create unique index if not exists lc34_slot_uq   on arena.lc34_pro_sales (tranche, slot) where status in ('open','paid') and slot is not null;
create index        if not exists lc34_sub_ix    on arena.lc34_pro_sales (subscription_id);
create index        if not exists lc34_cust_ix   on arena.lc34_pro_sales (customer_id);
create index        if not exists lc34_key_ix    on arena.lc34_pro_sales (upper(license_key));
create index        if not exists lc34_status_ix on arena.lc34_pro_sales (status, expires);

do $$
begin
  alter table arena.lc34_pro_sales enable row level security;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update, delete on arena.lc34_pro_sales to service_role;
  end if;
end $$;

commit;
