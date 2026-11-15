-- test stubs for LC82: roles, auth schema, admin check, e-mail, the feedback table with both layouts (column rating and metadata.social.rating)
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;
create schema if not exists auth;
create table if not exists auth.users(id uuid primary key, email text, created_at timestamptz default now());
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create or replace function public._lc_require_admin() returns void language plpgsql as $$ begin if coalesce(current_setting('test.admin',true),'0')<>'1' then raise exception 'not_admin'; end if; end $$;
create or replace function public._lc26_email() returns text language sql stable as $$ select lower(coalesce(current_setting('test.email',true),'')) $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid(), public._lc26_email(), public._lc_require_admin() to anon, authenticated;
create table if not exists public.app_feedback(id bigserial primary key, user_email text, category text, message text, rating int, elo_progress text, video_question text,
  showcase_ok boolean default false, metadata jsonb default '{}'::jsonb, status text default 'pending', created_at timestamptz default now());
