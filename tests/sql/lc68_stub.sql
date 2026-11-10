-- test stubs: auth schema, roles, admin check, LC65 base (tables + helpers as in sql/20261108120000_lc65_community.sql)
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema if not exists auth;
create table if not exists auth.users(id uuid primary key, email text, created_at timestamptz default now());
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create or replace function public._lc_require_admin() returns void language plpgsql as $$ begin if coalesce(current_setting('test.admin',true),'0')<>'1' then raise exception 'not_admin'; end if; end $$;
create table if not exists public.lc65_communities(code text primary key, name text not null, partner text);
insert into public.lc65_communities(code,name) values ('main','Lanckriet Chess') on conflict do nothing;
create table if not exists public.lc65_members(user_id uuid primary key, name text not null default 'Member', updated_at timestamptz not null default now());
create table if not exists public.lc65_posts(id bigserial primary key, community text not null default 'main', category text not null default 'general', user_id uuid not null,
  title text not null, body text not null, pinned boolean not null default false, deleted boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.lc65_comments(id bigserial primary key, post_id bigint not null references public.lc65_posts(id) on delete cascade, user_id uuid not null,
  body text not null, deleted boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.lc65_likes(kind text not null check (kind in ('p','c')), ref bigint not null, user_id uuid not null, primary key(kind,ref,user_id));
create table if not exists public.lc65_channels(slug text primary key, name text not null, descr text not null default '', admin_only boolean not null default false, sort int not null default 0);
insert into public.lc65_channels(slug,name,descr,admin_only,sort) values ('general','General Chat','',false,1),('proofs','Proofs & Wins','',false,2),('questions','Ask a Coach','',false,3),('rivals','Find a Rival','',false,4),('announcements','Announcements','',true,0) on conflict do nothing;
create table if not exists public.lc65_msgs(id bigserial primary key, channel text not null references public.lc65_channels(slug), user_id uuid not null, body text not null, poll jsonb, deleted boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.lc65_votes(msg_id bigint not null references public.lc65_msgs(id) on delete cascade, user_id uuid not null, opt int not null, primary key(msg_id,user_id));
create table if not exists public.lc65_bans(user_id uuid primary key, strikes int not null default 0, until timestamptz, permanent boolean not null default false);
create or replace function public._lc65_admin() returns boolean language plpgsql security definer set search_path = public as $$ begin perform public._lc_require_admin(); return true; exception when others then return false; end $$;
create or replace function public._lc65_touch(p_name text) returns void language plpgsql security definer set search_path = public as $$
declare n text := left(regexp_replace(btrim(coalesce(p_name,'')),'[<>&"'']','','g'),24);
begin if auth.uid() is null then return; end if; if n = '' then n := 'Member'; end if;
  insert into public.lc65_members(user_id,name) values (auth.uid(), n) on conflict (user_id) do update set name = excluded.name, updated_at = now(); end $$;
create or replace function public._lc65_pts(p_uid uuid, p_comm text default null) returns int language sql stable security definer set search_path = public as $$
  select (select count(*) from public.lc65_likes l join public.lc65_posts p on l.kind='p' and l.ref=p.id and p.user_id=p_uid and not p.deleted)::int $$;
create or replace function public._lc65_level(pts int) returns int language sql immutable as $$ select 1 + (case when pts>=5 then 1 else 0 end) $$;
create or replace function public._lc65_links(t text) returns int language sql immutable as $$ select coalesce(array_length(regexp_split_to_array(coalesce(t,''),'https?://'),1),1)-1 $$;
create or replace function public._lc65_ban(p_uid uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.lc65_bans; begin select * into b from public.lc65_bans where user_id=p_uid;
  if found and (b.permanent or (b.until is not null and b.until > now())) then return jsonb_build_object('ok',false,'status',200,'reason','chat_banned'); end if; return null; end $$;
