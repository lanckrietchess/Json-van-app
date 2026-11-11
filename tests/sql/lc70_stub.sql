-- test stubs for the LC70 library SQL: roles, admin check, signed-in e-mail, licences
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create or replace function public._lc_require_admin() returns void language plpgsql as $$ begin if coalesce(current_setting('test.admin',true),'0')<>'1' then raise exception 'not_admin'; end if; end $$;
create or replace function public._lc26_email() returns text language sql stable as $$ select lower(coalesce(current_setting('test.email',true),'')) $$;
create table if not exists public.licenses(id serial primary key, email text, tier int, status text default 'active', revoked boolean default false,
  lifetime boolean default false, is_lifetime boolean default false, expires_at timestamptz, source text default 'stripe');
