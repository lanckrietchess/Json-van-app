-- =====================================================================================================================
-- LC35 migration (hub 9.13.0): Creator Studio Content Hub (cloud library of exported shorts with per-platform status).
-- Idempotent. Run AFTER 20261026120000_lc34_funnel.sql. Files live in a PRIVATE Storage bucket; the Arena Edge Function (service role)
-- is the only thing that signs upload and download URLs, so there are no Storage policies to maintain.
-- Set the bucket's file size limit to what your plan allows (Free plan: 50 MB) and keep CONTENT_MAX_FILE_MB at or below it.
-- =====================================================================================================================
begin;

create table if not exists arena.lc35_content (
  id        text primary key check (id ~ '^ct_[0-9a-f]{12}$'),
  owner     text   not null,
  title     text   not null,
  fmt       text   not null default '',
  variant   text   not null default '',
  state     text   not null default 'uploading' check (state in ('uploading','ready')),
  platforms text   not null default '{}',
  meta      text   not null default '{}',
  path      text   not null,
  mime      text   not null default 'video/mp4',
  bytes     bigint not null default 0,
  created   bigint not null,
  updated   bigint not null
);
create index if not exists lc35_owner_ix on arena.lc35_content (owner, updated desc);
create index if not exists lc35_state_ix on arena.lc35_content (state, created);

do $$
begin
  alter table arena.lc35_content enable row level security;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update, delete on arena.lc35_content to service_role;
  end if;
  -- the private bucket (skipped where Storage is not installed, for example in a plain Postgres test database)
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('creator-content', 'creator-content', false, 52428800, array['video/mp4','video/webm','video/quicktime'])
    on conflict (id) do nothing;
  end if;
end $$;

commit;
