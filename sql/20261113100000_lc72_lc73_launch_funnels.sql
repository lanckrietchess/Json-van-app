-- LC72 + LC73 (build 9.37.0, 12 Nov 2026). Idempotent: run it twice without harm. Run AFTER the LC36, LC59, LC65, LC68/69, LC70 and LC71 files.
-- LC72: landing page editor (Wall of Love, Proof Queue, screenshots), library page extras, member titles, Coach chat + automated messages, caption minutes.
-- LC73: 7-day trial bookkeeping, rescue offer, referral discounts, priority messages, priority game reviews, chat requests + blocks + spam bans,
--       rivals and tribes, short links, source tracking, analytics dashboard, KPI targets, partner view.
-- Never reveals an e-mail to another member. Tables: RLS on, no direct access; everything goes through the functions below.

-- ============ shared helpers ============
create table if not exists public.lc72_cfg (k text primary key, v jsonb not null, updated_at timestamptz not null default now());
insert into public.lc72_cfg(k,v) values
 ('landing','{"love_on":true,"proof_on":true,"builtin_on":true,"shots_on":true}'),
 ('priority_tokens','5'),('review_tokens','20'),('captions_daily_sec','7200'),('classics_hidden','false'),
 ('auto_from',to_jsonb(now())),('owner_email','"lanckrietchess@gmail.com"'),('owner_name','"Kyenzo"')
on conflict (k) do nothing;
alter table public.lc72_cfg enable row level security; revoke all on public.lc72_cfg from anon, authenticated;

create or replace function public._lc72_getcfg(p_k text) returns jsonb language sql stable security definer set search_path = public as $$ select v from public.lc72_cfg where k = p_k $$;
create or replace function public._lc72_admin() returns boolean language plpgsql security definer set search_path = public as $$
begin perform public._lc_require_admin(); return true; exception when others then return false; end $$;
create or replace function public._lc72_email() returns text language plpgsql stable security definer set search_path = public as $$
begin return lower(coalesce(public._lc26_email(),'')); exception when others then return ''; end $$;
create or replace function public._lc72_uemail(p_uid uuid) returns text language sql stable security definer set search_path = public as $$
  select lower(coalesce((select email from auth.users where id = p_uid),'')) $$;
create or replace function public._lc72_owner_email() returns text language sql stable security definer set search_path = public as $$
  select lower(coalesce(public._lc72_getcfg('owner_email')#>>'{}','lanckrietchess@gmail.com')) $$;
create or replace function public._lc72_tier(p_email text) returns int language plpgsql stable security definer set search_path = public as $$
begin if coalesce(p_email,'') = '' then return 0; end if; return coalesce(public._lc70_tier(p_email),0); exception when others then return 0; end $$;
create or replace function public._lc72_buyer(p_email text) returns boolean language plpgsql stable security definer set search_path = public as $$
begin if coalesce(p_email,'') = '' or to_regclass('public.lc70_grants') is null then return false; end if;
  return exists(select 1 from public.lc70_grants where email = p_email and source in ('tokens','stripe'));
exception when others then return false; end $$;
-- title code: C = coach (owner), S = Lanckriet Chess Student (VIP), A = Lanckriet Chess Apprentice (Pro or a library purchase)
create or replace function public._lc72_code(p_email text) returns text language plpgsql stable security definer set search_path = public as $$
declare t int;
begin if coalesce(p_email,'') = '' then return ''; end if;
  if p_email = public._lc72_owner_email() then return 'C'; end if;
  t := public._lc72_tier(p_email);
  if t >= 3 then return 'S'; end if;
  if t >= 2 or public._lc72_buyer(p_email) then return 'A'; end if;
  return '';
end $$;
create or replace function public._lc72_clean(p text, n int) returns text language sql immutable as $$
  select left(btrim(regexp_replace(coalesce(p,''), '[\u0000-\u0008\u000b\u000c\u000e-\u001f<>]', '', 'g')), n) $$;

-- owner settings (whitelisted keys)
create or replace function public.lc72_cfg_set(p_key text, p_val jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  if p_key not in ('landing','priority_tokens','review_tokens','captions_daily_sec','classics_hidden','owner_name') then return jsonb_build_object('ok',false,'error','key'); end if;
  if p_key in ('priority_tokens','review_tokens','captions_daily_sec') and (jsonb_typeof(p_val) <> 'number' or (p_val#>>'{}')::numeric < 1 or (p_val#>>'{}')::numeric > 100000) then return jsonb_build_object('ok',false,'error','value'); end if;
  insert into public.lc72_cfg(k,v,updated_at) values (p_key,p_val,now()) on conflict (k) do update set v = excluded.v, updated_at = now();
  return jsonb_build_object('ok',true);
end $$;

-- ============ LC72.1 landing page: owner items, screenshots, sections ============
create table if not exists public.lc72_land_items (
  id bigserial primary key, kind text not null check (kind in ('love','proof')), visible boolean not null default true, pinned boolean not null default false,
  sort int not null default 0, name text not null default '' check (char_length(name) <= 60), role text not null default '' check (char_length(role) <= 120),
  site text not null default '' check (site in ('','chesscom','lichess','other')), start_r int, peak_r int, days int,
  body text not null default '' check (char_length(body) <= 1200), shot text not null default '' check (shot = '' or shot ~ '^https://'),
  link text not null default '' check (link = '' or link ~ '^https://'), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.lc72_shots (
  id bigserial primary key, slot text not null check (slot in ('hero','think','theory','trim','gallery')), url text not null check (url ~ '^https://'),
  caption text not null default '' check (char_length(caption) <= 160), sort int not null default 0, visible boolean not null default true, created_at timestamptz not null default now());
alter table public.lc72_land_items enable row level security; alter table public.lc72_shots enable row level security;
revoke all on public.lc72_land_items, public.lc72_shots from anon, authenticated;

create or replace function public.lc72_landing_public() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok',true,'cfg',coalesce(public._lc72_getcfg('landing'),'{}'::jsonb),
    'items',(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'kind',i.kind,'pinned',i.pinned,'name',i.name,'role',i.role,'site',i.site,'start',i.start_r,'peak',i.peak_r,
       'days',i.days,'body',i.body,'shot',i.shot,'link',i.link) order by i.pinned desc, i.sort, i.id desc),'[]'::jsonb) from public.lc72_land_items i where i.visible),
    'shots',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'slot',s.slot,'url',s.url,'caption',s.caption) order by s.slot, s.sort, s.id),'[]'::jsonb) from public.lc72_shots s where s.visible))
$$;
create or replace function public.lc72_land_admin() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok',true,'cfg',coalesce(public._lc72_getcfg('landing'),'{}'::jsonb),
    'items',(select coalesce(jsonb_agg(to_jsonb(i) order by i.kind, i.pinned desc, i.sort, i.id desc),'[]'::jsonb) from public.lc72_land_items i),
    'shots',(select coalesce(jsonb_agg(to_jsonb(s) order by s.slot, s.sort, s.id),'[]'::jsonb) from public.lc72_shots s));
end $$;
create or replace function public.lc72_land_save(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id bigint := nullif(p->>'id','')::bigint; r public.lc72_land_items; n int;
begin
  perform public._lc_require_admin();
  if coalesce(p->>'kind','') not in ('love','proof') then return jsonb_build_object('ok',false,'error','kind'); end if;
  if public._lc72_clean(p->>'body',1200) ~* '\m(lifetime|forever)\M' then return jsonb_build_object('ok',false,'error','wording'); end if;
  if v_id is null then
    select count(*) into n from public.lc72_land_items; if n >= 200 then return jsonb_build_object('ok',false,'error','full'); end if;
    insert into public.lc72_land_items(kind) values (p->>'kind') returning * into r; v_id := r.id;
  end if;
  update public.lc72_land_items set kind = p->>'kind', visible = coalesce((p->>'visible')::boolean,true), pinned = coalesce((p->>'pinned')::boolean,false),
    sort = coalesce(nullif(p->>'sort','')::int,0), name = public._lc72_clean(p->>'name',60), role = public._lc72_clean(p->>'role',120),
    site = case when p->>'site' in ('chesscom','lichess','other') then p->>'site' else '' end,
    start_r = nullif(p->>'start','')::int, peak_r = nullif(p->>'peak','')::int, days = nullif(p->>'days','')::int,
    body = public._lc72_clean(p->>'body',1200), shot = public._lc72_clean(p->>'shot',400), link = public._lc72_clean(p->>'link',400), updated_at = now()
  where id = v_id;
  return jsonb_build_object('ok',true,'id',v_id);
exception when check_violation or invalid_text_representation or numeric_value_out_of_range then return jsonb_build_object('ok',false,'error','invalid');
end $$;
create or replace function public.lc72_land_del(p_id bigint) returns jsonb language plpgsql security definer set search_path = public as $$
begin perform public._lc_require_admin(); delete from public.lc72_land_items where id = p_id; return jsonb_build_object('ok',found); end $$;
create or replace function public.lc72_shot_save(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id bigint := nullif(p->>'id','')::bigint; n int;
begin
  perform public._lc_require_admin();
  if v_id is null then
    select count(*) into n from public.lc72_shots; if n >= 60 then return jsonb_build_object('ok',false,'error','full'); end if;
    insert into public.lc72_shots(slot,url,caption,sort,visible) values (p->>'slot', public._lc72_clean(p->>'url',400), public._lc72_clean(p->>'caption',160),
      coalesce(nullif(p->>'sort','')::int,0), coalesce((p->>'visible')::boolean,true)) returning id into v_id;
  else
    update public.lc72_shots set slot = p->>'slot', url = public._lc72_clean(p->>'url',400), caption = public._lc72_clean(p->>'caption',160),
      sort = coalesce(nullif(p->>'sort','')::int,0), visible = coalesce((p->>'visible')::boolean,true) where id = v_id;
  end if;
  return jsonb_build_object('ok',true,'id',v_id);
exception when check_violation or invalid_text_representation then return jsonb_build_object('ok',false,'error','invalid');
end $$;
create or replace function public.lc72_shot_del(p_id bigint) returns jsonb language plpgsql security definer set search_path = public as $$
declare u text;
begin perform public._lc_require_admin(); delete from public.lc72_shots where id = p_id returning url into u; return jsonb_build_object('ok',u is not null,'url',u); end $$;

-- screenshots are stored in a PUBLIC Supabase Storage bucket; only the owner (admin check) can upload, replace or delete
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('lc72-landing','lc72-landing',true) on conflict (id) do update set public = true;
  end if;
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists lc72_landing_insert on storage.objects';
    execute 'drop policy if exists lc72_landing_update on storage.objects';
    execute 'drop policy if exists lc72_landing_delete on storage.objects';
    execute 'create policy lc72_landing_insert on storage.objects for insert to authenticated with check (bucket_id = ''lc72-landing'' and public._lc72_admin())';
    execute 'create policy lc72_landing_update on storage.objects for update to authenticated using (bucket_id = ''lc72-landing'' and public._lc72_admin())';
    execute 'create policy lc72_landing_delete on storage.objects for delete to authenticated using (bucket_id = ''lc72-landing'' and public._lc72_admin())';
  end if;
exception when others then raise notice 'lc72: storage bucket/policies not created (%). Create a public bucket lc72-landing in Storage by hand.', sqlerrm;
end $$;

-- ============ LC72.2 library: free page parts (credentials, summary) and the linked video course ============
create table if not exists public.lc72_item_extra (
  item_id text primary key, credentials text not null default '' check (char_length(credentials) <= 600),
  summary text not null default '' check (char_length(summary) <= 6000), course_id text not null default '', updated_at timestamptz not null default now());
alter table public.lc72_item_extra add column if not exists lead boolean not null default false;
alter table public.lc72_item_extra enable row level security; revoke all on public.lc72_item_extra from anon, authenticated;
create or replace function public.lc72_lib_extras() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok',true,'classics_hidden',coalesce((public._lc72_getcfg('classics_hidden')#>>'{}')::boolean,false),
    'extras',(select coalesce(jsonb_object_agg(e.item_id, jsonb_build_object('credentials',e.credentials,'summary',e.summary,'course_id',e.course_id,'lead',e.lead)),'{}'::jsonb) from public.lc72_item_extra e))
$$;
create or replace function public.lc72_lib_extra_set(p_id text, p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  if coalesce(p_id,'') !~ '^[a-z0-9-]{3,48}$' then return jsonb_build_object('ok',false,'error','id'); end if;
  insert into public.lc72_item_extra(item_id,credentials,summary,course_id,lead,updated_at)
  values (p_id, public._lc72_clean(p->>'credentials',600), left(coalesce(p->>'summary',''),6000), lower(public._lc72_clean(p->>'course_id',48)), coalesce((p->>'lead')::boolean,false), now())
  on conflict (item_id) do update set credentials = excluded.credentials, summary = excluded.summary, course_id = excluded.course_id, lead = excluded.lead, updated_at = now();
  return jsonb_build_object('ok',true);
exception when check_violation then return jsonb_build_object('ok',false,'error','invalid');
end $$;

-- lead magnets (owner ticks "Lead magnet" on the page): any signed-in account opens it at once, no card, no tokens (source 'owner', ref 'lead')
create or replace function public.lc72_lead_claim(p_id text) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_email text := public._lc72_email(); n int;
begin
  if v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  if not exists(select 1 from public.lc72_item_extra e join public.lc70_items i on i.id = e.item_id where e.item_id = p_id and e.lead and i.status = 'live') then return jsonb_build_object('ok',false,'error','not_lead'); end if;
  select count(*) into n from public.lc70_grants where email = v_email and ref = 'lead' and created_at > now() - interval '1 day';
  if n >= 10 then return jsonb_build_object('ok',false,'error','slow_down'); end if;
  insert into public.lc70_grants(email,item_id,source,ref) values (v_email,p_id,'owner','lead') on conflict (email,item_id) do nothing;
  return jsonb_build_object('ok',true);
end $$;

-- ============ LC72.3 titles ============
-- p = {"p":[post ids],"c":[comment ids],"m":[channel message ids],"d":[member uuids]} -> the same keys with id -> title code
create or replace function public.lc72_titles(p jsonb) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare out jsonb := jsonb_build_object('p','{}'::jsonb,'c','{}'::jsonb,'m','{}'::jsonb,'d','{}'::jsonb);
begin
  if auth.uid() is null then return out; end if;
  if to_regclass('public.lc65_posts') is not null and jsonb_typeof(p->'p') = 'array' then
    out := jsonb_set(out,'{p}',(select coalesce(jsonb_object_agg(x.id::text, x.c),'{}'::jsonb) from (select po.id, public._lc72_code(public._lc72_uemail(po.user_id)) c
      from public.lc65_posts po where po.id in (select (jsonb_array_elements_text(p->'p'))::bigint limit 60)) x where x.c <> '')); end if;
  if to_regclass('public.lc65_comments') is not null and jsonb_typeof(p->'c') = 'array' then
    out := jsonb_set(out,'{c}',(select coalesce(jsonb_object_agg(x.id::text, x.c),'{}'::jsonb) from (select co.id, public._lc72_code(public._lc72_uemail(co.user_id)) c
      from public.lc65_comments co where co.id in (select (jsonb_array_elements_text(p->'c'))::bigint limit 200)) x where x.c <> '')); end if;
  if to_regclass('public.lc65_msgs') is not null and jsonb_typeof(p->'m') = 'array' then
    out := jsonb_set(out,'{m}',(select coalesce(jsonb_object_agg(x.id::text, x.c),'{}'::jsonb) from (select g.id, public._lc72_code(public._lc72_uemail(g.user_id)) c
      from public.lc65_msgs g where g.id in (select (jsonb_array_elements_text(p->'m'))::bigint limit 100)) x where x.c <> '')); end if;
  if jsonb_typeof(p->'d') = 'array' then
    out := jsonb_set(out,'{d}',(select coalesce(jsonb_object_agg(x.u::text, x.c),'{}'::jsonb) from (select u, public._lc72_code(public._lc72_uemail(u)) c
      from (select (jsonb_array_elements_text(p->'d'))::uuid u limit 60) q) x where x.c <> '')); end if;
  return out;
exception when others then return out;
end $$;

-- ============ LC72.4 Coach chat (owner <-> paying members and buyers) + automated messages ============
create table if not exists public.lc72_threads (user_id uuid primary key, email text not null default '', name text not null default 'Member', last_at timestamptz not null default now(),
  last_body text not null default '', owner_unread int not null default 0, member_unread int not null default 0, priority boolean not null default false, priority_at timestamptz,
  created_at timestamptz not null default now());
create table if not exists public.lc72_msgs (id bigserial primary key, user_id uuid not null, from_owner boolean not null, kind text not null default 'chat' check (kind in ('chat','auto','priority')),
  body text not null check (char_length(body) between 1 and 2000), cta jsonb, created_at timestamptz not null default now());
create index if not exists lc72_msgs_user on public.lc72_msgs(user_id, id desc);
create table if not exists public.lc72_auto (event text primary key check (event in ('trial','pro','vip','buyer')), enabled boolean not null default true,
  body text not null default '' check (char_length(body) <= 1500), cta_label text not null default '' check (char_length(cta_label) <= 40),
  cta_href text not null default '' check (cta_href = '' or cta_href ~ '^(#[a-z0-9-]{2,40}|https://)'), updated_at timestamptz not null default now());
insert into public.lc72_auto(event,body,cta_label,cta_href) values
 ('trial','Welcome, {name}! Your 7-day Pro trial is on. My advice for these 7 days: connect your Chess.com or Lichess account, Trim your last 3 Rapid games and train the top Working Point it finds. Questions? Write me here: I read every message.','Trim my games','#trim'),
 ('pro','Welcome to Pro, {name}! You now have the whole library, the 24/7 coach and 10 tokens a day. This week: Trim your last 3 Rapid games and train the top Working Point it finds. Want your tokens upfront, the Lanckriet Chess Student title and priority in streams and the community? That is exactly what VIP adds.','See VIP','#upgrades'),
 ('vip','Welcome to VIP, {name}! Your tokens are on your account and your Lanckriet Chess Student title is live. First step: Trim your last game and send me the Working Point it found, right here. Your hardcover of my book can be claimed in the Books Vault.','Open the Books Vault','#books'),
 ('buyer','Thanks for getting {item}, {name}! Tip: run MSPC on every example before you read the answer. Pro includes every course of mine while it is active, if you want the whole library.','See Pro','#upgrades')
on conflict (event) do nothing;
create table if not exists public.lc72_seen (user_id uuid primary key, tier int not null default 0, buyer boolean not null default false, trial boolean not null default false, at timestamptz not null default now());
create table if not exists public.lc72_auto_log (user_id uuid not null, event text not null, sent_at timestamptz not null default now(), primary key (user_id, event));
create table if not exists public.lc72_chat_rate (user_id uuid not null, at timestamptz not null default now());
alter table public.lc72_threads enable row level security; alter table public.lc72_msgs enable row level security; alter table public.lc72_auto enable row level security;
alter table public.lc72_seen enable row level security; alter table public.lc72_auto_log enable row level security; alter table public.lc72_chat_rate enable row level security;
revoke all on public.lc72_threads, public.lc72_msgs, public.lc72_auto, public.lc72_seen, public.lc72_auto_log, public.lc72_chat_rate from anon, authenticated;

create or replace function public._lc72_trialing(p_email text) returns boolean language plpgsql stable security definer set search_path = public as $$
begin if to_regclass('public.lc73_trials') is null then return false; end if;
  return exists(select 1 from public.lc73_trials where email = p_email and converted_at is null and trial_end > now() and not cancelled);
exception when others then return false; end $$;
create or replace function public._lc72_customer(p_email text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(p_email,'') <> '' and (public._lc72_tier(p_email) >= 2 or public._lc72_buyer(p_email) or public._lc72_trialing(p_email)) $$;
create or replace function public._lc72_msg_json(m public.lc72_msgs) returns jsonb language sql stable as $$
  select jsonb_build_object('id',m.id,'owner',m.from_owner,'kind',m.kind,'body',m.body,'cta',m.cta,'t',to_char(m.created_at at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"')) $$;
create or replace function public._lc72_post(p_uid uuid, p_owner boolean, p_kind text, p_body text, p_cta jsonb, p_name text) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.lc72_threads(user_id,email,name) values (p_uid, public._lc72_uemail(p_uid), coalesce(nullif(p_name,''),'Member')) on conflict (user_id) do nothing;
  insert into public.lc72_msgs(user_id,from_owner,kind,body,cta) values (p_uid,p_owner,p_kind,p_body,p_cta);
  update public.lc72_threads set last_at = now(), last_body = left(p_body,90), name = case when coalesce(p_name,'') <> '' then p_name else name end,
    owner_unread = case when p_owner then owner_unread else owner_unread + 1 end, member_unread = case when p_owner then member_unread + 1 else member_unread end,
    priority = case when p_owner then false else priority end where user_id = p_uid;
end $$;

create or replace function public.lc72_me() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_email text := public._lc72_email(); c text; t public.lc72_threads;
begin
  if auth.uid() is null or v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  c := public._lc72_code(v_email); select * into t from public.lc72_threads where user_id = auth.uid();
  return jsonb_build_object('ok',true,'code',c,'title',case c when 'S' then 'Lanckriet Chess Student' when 'A' then 'Lanckriet Chess Apprentice' when 'C' then 'Coach' else '' end,
    'tier',public._lc72_tier(v_email),'buyer',public._lc72_buyer(v_email),'customer',public._lc72_customer(v_email) or t.user_id is not null,'owner',c = 'C' or public._lc72_admin(),
    'unread',coalesce(t.member_unread,0),'priority',coalesce(t.priority,false),'priority_tokens',coalesce((public._lc72_getcfg('priority_tokens')#>>'{}')::int,5),
    'review_tokens',coalesce((public._lc72_getcfg('review_tokens')#>>'{}')::int,20),'coach',coalesce(public._lc72_getcfg('owner_name')#>>'{}','Kyenzo'));
end $$;
create or replace function public.lc72_chat_get() returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_email text := public._lc72_email(); t public.lc72_threads;
begin
  if uid is null or v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  select * into t from public.lc72_threads where user_id = uid;
  update public.lc72_threads set member_unread = 0 where user_id = uid;
  return jsonb_build_object('ok',true,'allowed',public._lc72_customer(v_email) or t.user_id is not null,'priority',coalesce(t.priority,false),
    'msgs',(select coalesce(jsonb_agg(public._lc72_msg_json(m) order by m.id),'[]'::jsonb) from (select * from public.lc72_msgs where user_id = uid order by id desc limit 120) m));
end $$;
create or replace function public.lc72_chat_send(p_body text, p_name text) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_email text := public._lc72_email(); b text := public._lc72_clean(p_body,2000); n int;
begin
  if uid is null or v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  if b = '' then return jsonb_build_object('ok',false,'error','empty'); end if;
  if not (public._lc72_customer(v_email) or exists(select 1 from public.lc72_threads where user_id = uid)) then return jsonb_build_object('ok',false,'error','members_only'); end if;
  select count(*) into n from public.lc72_msgs where user_id = uid and not from_owner and created_at > now() - interval '1 hour';
  if n >= 30 then return jsonb_build_object('ok',false,'error','slow_down'); end if;
  perform public._lc72_post(uid,false,'chat',b,null,public._lc72_clean(p_name,40));
  return jsonb_build_object('ok',true);
end $$;
-- priority: the member paid the token price in the app (Arena token_spend); the thread is pinned on top of the owner's inbox until he answers
create or replace function public.lc72_chat_priority(p_ref text) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_email text := public._lc72_email(); n int;
begin
  if uid is null or v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  if not exists(select 1 from public.lc72_threads where user_id = uid) then return jsonb_build_object('ok',false,'error','no_thread'); end if;
  select count(*) into n from public.lc72_msgs where user_id = uid and kind = 'priority' and created_at > now() - interval '1 day';
  if n >= 3 then return jsonb_build_object('ok',false,'error','slow_down'); end if;
  update public.lc72_threads set priority = true, priority_at = now() where user_id = uid;
  insert into public.lc72_msgs(user_id,from_owner,kind,body) values (uid,false,'priority','Pinned to the top with tokens ('||left(coalesce(p_ref,''),60)||')');
  return jsonb_build_object('ok',true);
end $$;
create or replace function public.lc72_inbox(p_filter text) returns jsonb language plpgsql security definer set search_path = public as $$
declare f text := coalesce(p_filter,'all');
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok',true,'unread',(select coalesce(sum(owner_unread),0) from public.lc72_threads),'rows',(select coalesce(jsonb_agg(r order by (r->>'priority')::boolean desc, (r->>'last_at') desc),'[]'::jsonb) from (
    select jsonb_build_object('uid',x.uid,'name',x.name,'email',x.email,'code',public._lc72_code(x.email),'tier',public._lc72_tier(x.email),'buyer',public._lc72_buyer(x.email),
      'trial',public._lc72_trialing(x.email),'unread',coalesce(t.owner_unread,0),'priority',coalesce(t.priority,false),'last',coalesce(t.last_body,''),'last_at',coalesce(t.last_at,x.created_at)) r
    from (select u.id uid, lower(u.email) email, coalesce(t2.name, nullif(split_part(u.email,'@',1),''),'Member') name, u.created_at
            from auth.users u left join public.lc72_threads t2 on t2.user_id = u.id
           where t2.user_id is not null or public._lc72_customer(lower(u.email)) order by coalesce(t2.last_at,u.created_at) desc limit 400) x
    left join public.lc72_threads t on t.user_id = x.uid) q
    where f = 'all' or (f = 'unread' and (r->>'unread')::int > 0) or (f = 'priority' and (r->>'priority')::boolean) or (f = 'vip' and (r->>'tier')::int >= 3)
       or (f = 'pro' and (r->>'tier')::int = 2) or (f = 'buyers' and (r->>'buyer')::boolean) or (f = 'trial' and (r->>'trial')::boolean)));
end $$;
create or replace function public.lc72_owner_thread(p_uid uuid) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  update public.lc72_threads set owner_unread = 0 where user_id = p_uid;
  return jsonb_build_object('ok',true,'email',public._lc72_uemail(p_uid),'code',public._lc72_code(public._lc72_uemail(p_uid)),
    'msgs',(select coalesce(jsonb_agg(public._lc72_msg_json(m) order by m.id),'[]'::jsonb) from (select * from public.lc72_msgs where user_id = p_uid order by id desc limit 200) m));
end $$;
create or replace function public.lc72_owner_send(p_uid uuid, p_body text, p_cta jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare b text := public._lc72_clean(p_body,2000); c jsonb := null;
begin
  perform public._lc_require_admin();
  if b = '' or not exists(select 1 from auth.users where id = p_uid) then return jsonb_build_object('ok',false,'error','bad_input'); end if;
  if p_cta is not null and coalesce(p_cta->>'href','') ~ '^(#[a-z0-9-]{2,40}|https://)' then c := jsonb_build_object('label',public._lc72_clean(p_cta->>'label',40),'href',left(p_cta->>'href',300)); end if;
  perform public._lc72_post(p_uid,true,'chat',b,c,null);
  return jsonb_build_object('ok',true);
end $$;
create or replace function public.lc72_auto_get() returns jsonb language plpgsql security definer set search_path = public as $$
begin perform public._lc_require_admin();
  return jsonb_build_object('ok',true,'rows',(select coalesce(jsonb_agg(to_jsonb(a) order by a.event),'[]'::jsonb) from public.lc72_auto a),
    'sent',(select coalesce(jsonb_object_agg(event,n),'{}'::jsonb) from (select event, count(*) n from public.lc72_auto_log group by event) z));
end $$;
create or replace function public.lc72_auto_set(p_event text, p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  if public._lc72_clean(p->>'body',1500) ~* '\m(lifetime|forever)\M' then return jsonb_build_object('ok',false,'error','wording'); end if;
  update public.lc72_auto set enabled = coalesce((p->>'enabled')::boolean,true), body = public._lc72_clean(p->>'body',1500), cta_label = public._lc72_clean(p->>'cta_label',40),
    cta_href = public._lc72_clean(p->>'cta_href',300), updated_at = now() where event = p_event;
  return jsonb_build_object('ok',found);
exception when check_violation then return jsonb_build_object('ok',false,'error','invalid');
end $$;
-- the app calls this after sign-in and after a payment: it sends each enabled welcome message once, when the member's state CHANGED
-- (a member who already had Pro before this file ran gets nothing, unless the account is newer than auto_from)
create or replace function public.lc72_auto_check(p_name text) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_email text := public._lc72_email(); s public.lc72_seen; v_tier int; v_buyer boolean; v_trial boolean; fresh boolean; a public.lc72_auto;
  sent text[] := '{}'; ev text; item text := 'your purchase'; nm text := coalesce(nullif(public._lc72_clean(p_name,40),''),'there');
begin
  if uid is null or v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  v_tier := public._lc72_tier(v_email); v_buyer := public._lc72_buyer(v_email); v_trial := public._lc72_trialing(v_email);
  fresh := coalesce((select created_at from auth.users where id = uid) >= coalesce((public._lc72_getcfg('auto_from')#>>'{}')::timestamptz, now()), false);
  select * into s from public.lc72_seen where user_id = uid;
  if not found then
    insert into public.lc72_seen(user_id,tier,buyer,trial) values (uid, case when fresh then 0 else v_tier end, case when fresh then false else v_buyer end, case when fresh then false else v_trial end)
    returning * into s;
  end if;
  foreach ev in array array['trial','vip','pro','buyer'] loop
    if (ev = 'trial' and v_trial and not s.trial) or (ev = 'vip' and v_tier >= 3 and s.tier < 3) or (ev = 'pro' and v_tier = 2 and not v_trial and s.tier < 2)
       or (ev = 'buyer' and v_buyer and not s.buyer) then
      select * into a from public.lc72_auto where event = ev and enabled;
      if found and a.body <> '' and not exists(select 1 from public.lc72_auto_log where user_id = uid and event = ev) then
        if ev = 'buyer' and to_regclass('public.lc70_grants') is not null then
          select coalesce(i.title,'your purchase') into item from public.lc70_grants g join public.lc70_items i on i.id = g.item_id where g.email = v_email and g.source in ('tokens','stripe') order by g.created_at desc limit 1;
        end if;
        perform public._lc72_post(uid,true,'auto',replace(replace(a.body,'{name}',nm),'{item}',coalesce(item,'your purchase')),
          case when a.cta_href <> '' then jsonb_build_object('label',coalesce(nullif(a.cta_label,''),'Open'),'href',a.cta_href) else null end, nm);
        insert into public.lc72_auto_log(user_id,event) values (uid,ev) on conflict do nothing; sent := sent || ev;
      end if;
    end if;
  end loop;
  update public.lc72_seen set tier = greatest(s.tier,v_tier), buyer = s.buyer or v_buyer, trial = s.trial or v_trial, at = now() where user_id = uid;
  return jsonb_build_object('ok',true,'sent',to_jsonb(sent));
end $$;

-- ============ LC72.5 caption minutes for the exact (server) speech-to-text: owner / admin only ============
create table if not exists public.lc72_caption_use (email text not null, day date not null default current_date, seconds int not null default 0, primary key (email, day));
alter table public.lc72_caption_use enable row level security; revoke all on public.lc72_caption_use from anon, authenticated;
create or replace function public.lc72_caption_allow(p_seconds int) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_email text := public._lc72_email(); cap int := coalesce((public._lc72_getcfg('captions_daily_sec')#>>'{}')::int,7200); used int;
begin
  if v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  if not public._lc72_admin() and v_email <> public._lc72_owner_email() then return jsonb_build_object('ok',false,'error','admin_only'); end if;
  if coalesce(p_seconds,0) < 1 or p_seconds > 1200 then return jsonb_build_object('ok',false,'error','length'); end if;
  insert into public.lc72_caption_use(email,day,seconds) values (v_email,current_date,0) on conflict do nothing;
  update public.lc72_caption_use set seconds = seconds + p_seconds where email = v_email and day = current_date and seconds + p_seconds <= cap returning seconds into used;
  if used is null then return jsonb_build_object('ok',false,'error','daily_limit','cap',cap); end if;
  return jsonb_build_object('ok',true,'used',used,'cap',cap);
end $$;

-- ============ LC73.1 trials, Stripe customers, rescue offer, referral discounts (written by the stripe Edge Function) ============
create table if not exists public.lc73_trials (session_id text primary key, email text not null, subscription_id text, customer_id text, started_at timestamptz not null default now(),
  trial_end timestamptz not null, converted_at timestamptz, cancelled boolean not null default false, rescue_until timestamptz, rescue_used boolean not null default false, partner text);
create table if not exists public.lc73_customers (email text primary key, customer_id text not null, updated_at timestamptz not null default now());
create table if not exists public.lc73_sub_events (id bigserial primary key, kind text not null check (kind in ('trial_start','trial_convert','trial_cancel','renewal','rescue','first_payment')),
  email text not null default '', amount_cents int not null default 0, ref text not null default '', created_at timestamptz not null default now());
create unique index if not exists lc73_sub_events_ref on public.lc73_sub_events(kind, ref) where ref <> '';
create table if not exists public.lc73_disc_used (email text not null, kind text not null check (kind in ('invitee','referrer')), session_id text not null, used_at timestamptz not null default now(), primary key (session_id));
create table if not exists public.lc73_ref_rewards (email text primary key, earned int not null default 0, used int not null default 0);
alter table public.lc73_trials enable row level security; alter table public.lc73_customers enable row level security; alter table public.lc73_sub_events enable row level security;
alter table public.lc73_disc_used enable row level security; alter table public.lc73_ref_rewards enable row level security;
revoke all on public.lc73_trials, public.lc73_customers, public.lc73_sub_events, public.lc73_disc_used, public.lc73_ref_rewards from anon, authenticated;

-- ============ LC73.5 source tracking (needed by the discount below) ============
create table if not exists public.lc73_links (code text primary key check (code ~ '^[a-z0-9-]{2,24}$'), platform text not null default 'other' check (char_length(platform) <= 30),
  label text not null default '' check (char_length(label) <= 80), dest text not null default '/' check (dest ~ '^/[A-Za-z0-9_./?=&#-]{0,200}$'),
  partner_email text not null default '', active boolean not null default true, created_at timestamptz not null default now());
insert into public.lc73_links(code,platform,label,dest) values ('igb','instagram','Instagram bio','/'),('tkb','tiktok','TikTok bio','/'),('ytc','youtube','YouTube comment','/'),
  ('ytd','youtube','YouTube description','/'),('fbb','facebook','Facebook bio','/'),('dm1','direct','Direct outreach 1','/') on conflict do nothing;
create table if not exists public.lc73_hits (id bigserial primary key, day date not null default current_date, kind text not null check (kind in ('click','landing','app_open','install')),
  code text not null default '', utm_source text not null default '', device text not null default '', created_at timestamptz not null default now());
create unique index if not exists lc73_hits_once on public.lc73_hits(device, kind, day, code) where device <> '';
create index if not exists lc73_hits_day on public.lc73_hits(day, kind);
create table if not exists public.lc73_attrib (user_id uuid primary key, email text not null default '', code text not null default '', utm_source text not null default '',
  utm_medium text not null default '', utm_campaign text not null default '', ref text not null default '', device text not null default '', first_at timestamptz, created_at timestamptz not null default now());
create table if not exists public.lc73_views (id bigserial primary key, channel text not null check (char_length(channel) between 1 and 30), period_start date not null, period_end date not null,
  views bigint not null check (views >= 0), note text not null default '' check (char_length(note) <= 120), partner_email text not null default '', created_at timestamptz not null default now(), check (period_end >= period_start));
create table if not exists public.lc73_kpis (stage text primary key, target numeric not null check (target >= 0 and target <= 100));
insert into public.lc73_kpis(stage,target) values ('view_to_visit',2),('visit_to_install',20),('install_to_signup',40),('signup_to_card',10),('card_to_paid',50),('signup_to_paid',3) on conflict do nothing;
create table if not exists public.lc73_partners (email text primary key check (email = lower(email)), name text not null default '', codes text[] not null default '{}', created_at timestamptz not null default now());
alter table public.lc73_links enable row level security; alter table public.lc73_hits enable row level security; alter table public.lc73_attrib enable row level security;
alter table public.lc73_views enable row level security; alter table public.lc73_kpis enable row level security; alter table public.lc73_partners enable row level security;
revoke all on public.lc73_links, public.lc73_hits, public.lc73_attrib, public.lc73_views, public.lc73_kpis, public.lc73_partners from anon, authenticated;

-- the referrer of an LC36 / lc7 referral code (null when it cannot be resolved)
create or replace function public._lc73_ref_email(p_code text) returns text language plpgsql stable security definer set search_path = public as $$
declare v jsonb; e text;
begin
  if coalesce(p_code,'') = '' then return null; end if;
  begin v := public.lc7_resolve_code(p_code); exception when others then return null; end;
  if v is null or v->>'kind' <> 'member' then return null; end if;
  begin execute 'select lower(email) from public.lc7_members where id = $1' into e using (v->>'id')::uuid; exception when others then e := null; end;
  if e is null then begin select lower(u.email) into e from auth.users u where u.id = (v->>'id')::uuid; exception when others then e := null; end; end if;
  return nullif(e,'');
end $$;
-- which referral discount a buyer gets now: 'invitee' (came through a friend, first purchase) or 'referrer' (a friend of theirs paid) or null
create or replace function public.lc73_discount_for(p_email text) returns text language plpgsql stable security definer set search_path = public as $$
declare a public.lc73_attrib;
begin
  if coalesce(p_email,'') = '' then return null; end if;
  select * into a from public.lc73_attrib where email = p_email and ref <> '' limit 1;
  if found and not exists(select 1 from public.lc73_disc_used where email = p_email and kind = 'invitee') and coalesce(public._lc73_ref_email(a.ref),'') <> p_email then return 'invitee'; end if;
  return null;   -- 9.37.0: the referrer side was left out on purpose (old referral codes cannot be resolved to an account reliably)
end $$;
-- called by the stripe webhook when a discounted checkout is PAID: marks the discount used and gives the referrer one reward
create or replace function public.lc73_discount_paid(p_email text, p_kind text, p_session text) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.lc73_disc_used(email,kind,session_id) values (p_email,p_kind,p_session) on conflict do nothing;
end $$;
create or replace function public.lc73_my_offers() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_email text := public._lc72_email(); t public.lc73_trials;
begin
  if v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  select * into t from public.lc73_trials where email = v_email order by started_at desc limit 1;
  return jsonb_build_object('ok',true,'discount',public.lc73_discount_for(v_email),
    'trial',case when t.session_id is null then null else jsonb_build_object('ends',t.trial_end,'active',t.converted_at is null and not t.cancelled and t.trial_end > now(),
      'converted',t.converted_at is not null,'cancelled',t.cancelled) end,
    'rescue',case when t.rescue_until > now() and not t.rescue_used then jsonb_build_object('until',t.rescue_until) else null end,
    'customer',exists(select 1 from public.lc73_customers where email = v_email),'had_trial',t.session_id is not null);
end $$;

-- ============ LC73.2 priority game reviews ============
create table if not exists public.lc73_reviews (id bigserial primary key, user_id uuid not null, email text not null, name text not null default 'Member' check (char_length(name) <= 40),
  pgn text not null check (char_length(pgn) between 10 and 20000), note text not null default '' check (char_length(note) <= 800), kind text not null default 'learn' check (kind in ('proud','learn')),
  consent_public boolean not null default false, consent_name boolean not null default false, age_ok boolean not null default false, tokens int not null default 0, ref text not null default '',
  status text not null default 'new' check (status in ('new','reviewing','done','published','declined')), answer text not null default '' check (char_length(answer) <= 4000),
  video_url text not null default '' check (video_url = '' or video_url ~ '^https://'), featured boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.lc73_reviews enable row level security; revoke all on public.lc73_reviews from anon, authenticated;
create or replace function public.lc73_review_submit(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_email text := public._lc72_email(); n int; id bigint;
begin
  if uid is null or v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  if char_length(coalesce(p->>'pgn','')) < 10 then return jsonb_build_object('ok',false,'error','pgn'); end if;
  if coalesce((p->>'consent_public')::boolean,false) and not coalesce((p->>'age_ok')::boolean,false) then return jsonb_build_object('ok',false,'error','age'); end if;
  select count(*) into n from public.lc73_reviews where user_id = uid and created_at > now() - interval '1 day'; if n >= 5 then return jsonb_build_object('ok',false,'error','slow_down'); end if;
  insert into public.lc73_reviews(user_id,email,name,pgn,note,kind,consent_public,consent_name,age_ok,tokens,ref)
  values (uid, v_email, coalesce(nullif(public._lc72_clean(p->>'name',40),''),'Member'), left(regexp_replace(coalesce(p->>'pgn',''),'[<>]','','g'),20000), public._lc72_clean(p->>'note',800),
    case when p->>'kind' = 'proud' then 'proud' else 'learn' end, coalesce((p->>'consent_public')::boolean,false), coalesce((p->>'consent_name')::boolean,false),
    coalesce((p->>'age_ok')::boolean,false), greatest(0,coalesce(nullif(p->>'tokens','')::int,0)), public._lc72_clean(p->>'ref',80)) returning lc73_reviews.id into id;
  return jsonb_build_object('ok',true,'id',id);
exception when check_violation then return jsonb_build_object('ok',false,'error','invalid');
end $$;
create or replace function public.lc73_review_mine() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  return jsonb_build_object('ok',true,'rows',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'status',status,'answer',answer,'video',video_url,'note',note,'created',created_at) order by id desc),'[]'::jsonb)
    from public.lc73_reviews where user_id = auth.uid()));
end $$;
create or replace function public.lc73_review_queue(p_status text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok',true,'rows',(select coalesce(jsonb_agg(to_jsonb(r) - 'email' || jsonb_build_object('email',r.email,'code',public._lc72_code(r.email)) order by r.featured desc, r.id),'[]'::jsonb)
    from public.lc73_reviews r where coalesce(p_status,'open') = 'all' or (coalesce(p_status,'open') = 'open' and r.status in ('new','reviewing')) or r.status = p_status));
end $$;
create or replace function public.lc73_review_set(p_id bigint, p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.lc73_reviews;
begin
  perform public._lc_require_admin();
  update public.lc73_reviews set status = case when p->>'status' in ('new','reviewing','done','published','declined') then p->>'status' else status end,
    answer = coalesce(left(p->>'answer',4000),answer), video_url = coalesce(nullif(public._lc72_clean(p->>'video',400),''),video_url),
    featured = coalesce((p->>'featured')::boolean,featured), updated_at = now() where id = p_id returning * into r;
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  if p->>'status' in ('done','published') then
    perform public._lc72_post(r.user_id,true,'chat','Your Priority Game Review is '||(case when p->>'status' = 'published' then 'published' else 'ready' end)||'. '||left(coalesce(r.answer,''),1500),
      case when r.video_url <> '' then jsonb_build_object('label','Watch the review','href',r.video_url) else jsonb_build_object('label','See my reviews','href','#coach-chat') end, null);
  end if;
  return jsonb_build_object('ok',true);
exception when check_violation then return jsonb_build_object('ok',false,'error','invalid');
end $$;

-- ============ LC73.3 chat requests, blocks and spam bans (replaces the LC65 direct-message functions) ============
create table if not exists public.lc73_dm_ok (a uuid not null, b uuid not null, status text not null default 'pending' check (status in ('pending','ok','declined')), requested_by uuid not null,
  created_at timestamptz not null default now(), primary key (a, b), check (a < b));
create table if not exists public.lc73_blocks (blocker uuid not null, blocked uuid not null, created_at timestamptz not null default now(), primary key (blocker, blocked));
create table if not exists public.lc73_spam (user_id uuid primary key, level int not null default 0, last_ban_at timestamptz);
alter table public.lc73_dm_ok enable row level security; alter table public.lc73_blocks enable row level security; alter table public.lc73_spam enable row level security;
revoke all on public.lc73_dm_ok, public.lc73_blocks, public.lc73_spam from anon, authenticated;
create or replace function public._lc73_pair_status(x uuid, y uuid) returns text language sql stable security definer set search_path = public as $$
  select status from public.lc73_dm_ok where a = least(x,y) and b = greatest(x,y) $$;
create or replace function public._lc73_blocked(x uuid, y uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.lc73_blocks where (blocker = x and blocked = y) or (blocker = y and blocked = x)) $$;

do $$ begin if to_regclass('public.lc65_dms') is not null then
execute $f$
create or replace function public.lc65_c46_dm_send(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $b$
declare uid uuid := auth.uid(); peer uuid; v_body text := btrim(coalesce(p_a->>'body','')); n int; bn jsonb; st text;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  bn := public._lc65_ban(uid); if bn is not null then return bn; end if;
  begin peer := (p_a->>'to')::uuid; exception when others then return jsonb_build_object('ok',false,'status',200,'reason','bad_input'); end;
  if peer=uid or v_body='' or length(v_body)>500 or not exists(select 1 from public.lc65_members where user_id=peer) then return jsonb_build_object('ok',false,'status',200,'reason','bad_input'); end if;
  if public._lc73_blocked(uid,peer) then return jsonb_build_object('ok',false,'status',200,'reason','blocked'); end if;
  if public._lc65_links(v_body)>3 then return jsonb_build_object('ok',false,'status',200,'reason','too_many_links'); end if;
  select count(*) into n from public.lc65_dms where from_id=uid and created_at>now()-interval '1 hour'; if n>=60 then return jsonb_build_object('ok',false,'status',200,'reason','slow_down'); end if;
  st := public._lc73_pair_status(uid,peer);
  if st = 'declined' then return jsonb_build_object('ok',false,'status',200,'reason','declined'); end if;
  if st is null then insert into public.lc73_dm_ok(a,b,status,requested_by) values (least(uid,peer),greatest(uid,peer),'pending',uid); st := 'pending'; end if;
  if st = 'pending' and exists(select 1 from public.lc73_dm_ok where a=least(uid,peer) and b=greatest(uid,peer) and requested_by<>uid) then
    update public.lc73_dm_ok set status='ok' where a=least(uid,peer) and b=greatest(uid,peer); st := 'ok'; end if;   -- answering a request accepts it
  if st = 'pending' and (select count(*) from public.lc65_dms where from_id=uid and to_id=peer) >= 3 then return jsonb_build_object('ok',false,'status',200,'reason','waiting'); end if;
  perform public._lc65_touch(p_a->>'name');
  insert into public.lc65_dms(from_id,to_id,body) values (uid,peer,v_body);
  return jsonb_build_object('ok',true,'status',200,'request',st='pending');
end $b$;
$f$;
execute $f$
create or replace function public.lc65_c46_dm_threads(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $b$
declare uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  return jsonb_build_object('ok',true,'status',200,'threads',(select coalesce(jsonb_agg(jsonb_build_object('with',peer,'name',coalesce(m.name,'Member'),'unread',unread,'last',left(lastb,60),
      'pending',coalesce(public._lc73_pair_status(uid,peer),'pending')<>'ok') order by lastt desc),'[]'::jsonb) from (
    select case when d.from_id=uid then d.to_id else d.from_id end peer, max(d.created_at) lastt,
      (array_agg(d.body order by d.created_at desc))[1] lastb, count(*) filter (where d.to_id=uid and not d.read) unread
    from public.lc65_dms d where (d.from_id=uid or d.to_id=uid) and not d.deleted group by 1) t left join public.lc65_members m on m.user_id=t.peer
    where not public._lc73_blocked(uid,t.peer) and (coalesce(public._lc73_pair_status(uid,t.peer),'') = 'ok'
      or exists(select 1 from public.lc73_dm_ok o where o.a=least(uid,t.peer) and o.b=greatest(uid,t.peer) and o.requested_by=uid and o.status='pending'))));
end $b$;
$f$;
execute $f$
create or replace function public.lc65_c46_dm_get(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $b$
declare uid uuid := auth.uid(); peer uuid; st text;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  begin peer := (p_a->>'with')::uuid; exception when others then return jsonb_build_object('ok',false,'status',200,'reason','bad_input'); end;
  st := public._lc73_pair_status(uid,peer);
  if public._lc73_blocked(uid,peer) then return jsonb_build_object('ok',true,'status',200,'name','Member','msgs','[]'::jsonb,'blocked',true); end if;
  if coalesce(st,'') <> 'ok' and not exists(select 1 from public.lc73_dm_ok where a=least(uid,peer) and b=greatest(uid,peer) and requested_by=uid) then
    return jsonb_build_object('ok',true,'status',200,'name',coalesce((select name from public.lc65_members where user_id=peer),'Member'),'msgs','[]'::jsonb,'request',true); end if;
  update public.lc65_dms set read=true where to_id=uid and from_id=peer and not read;
  return jsonb_build_object('ok',true,'status',200,'name',coalesce((select name from public.lc65_members where user_id=peer),'Member'),'pending',coalesce(st,'')<>'ok',
    'msgs',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'mine',from_id=uid,'body',body,'t',to_char(created_at at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"')) order by id),'[]'::jsonb)
      from (select * from public.lc65_dms where ((from_id=uid and to_id=peer) or (from_id=peer and to_id=uid)) and not deleted order by id desc limit 100) z));
end $b$;
$f$;
end if; end $$;

create or replace function public.lc73_dm_requests() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  return jsonb_build_object('ok',true,'rows',(select coalesce(jsonb_agg(jsonb_build_object('with',o.requested_by,'name',coalesce(m.name,'Member'),'at',o.created_at,
    'first',(select left(body,120) from public.lc65_dms d where d.from_id=o.requested_by and d.to_id=uid order by id limit 1)) order by o.created_at desc),'[]'::jsonb)
    from public.lc73_dm_ok o left join public.lc65_members m on m.user_id=o.requested_by
    where o.status='pending' and o.requested_by<>uid and (o.a=uid or o.b=uid) and not public._lc73_blocked(uid,o.requested_by)));
end $$;
create or replace function public.lc73_dm_answer(p_peer uuid, p_accept boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  update public.lc73_dm_ok set status = case when p_accept then 'ok' else 'declined' end where a=least(uid,p_peer) and b=greatest(uid,p_peer) and requested_by=p_peer and status='pending';
  return jsonb_build_object('ok',found);
end $$;
-- block: 3 different people blocking the same member within 7 days (counted after the last ban) = a chat ban of 1 week, then 1 month, 1 year, permanent
create or replace function public.lc73_block(p_peer uuid, p_on boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s public.lc73_spam; n int; lvl int; until_t timestamptz; perm boolean := false;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  if p_peer is null or p_peer = uid then return jsonb_build_object('ok',false,'error','bad_input'); end if;
  if not p_on then delete from public.lc73_blocks where blocker=uid and blocked=p_peer; return jsonb_build_object('ok',true,'blocked',false); end if;
  insert into public.lc73_blocks(blocker,blocked) values (uid,p_peer) on conflict do nothing;
  update public.lc73_dm_ok set status='declined' where a=least(uid,p_peer) and b=greatest(uid,p_peer);
  if public._lc72_uemail(p_peer) = public._lc72_owner_email() then return jsonb_build_object('ok',true,'blocked',true); end if;
  select * into s from public.lc73_spam where user_id = p_peer;
  select count(distinct blocker) into n from public.lc73_blocks where blocked = p_peer and created_at > greatest(now() - interval '7 days', coalesce(s.last_ban_at,'-infinity'::timestamptz));
  if n >= 3 then
    lvl := least(4, coalesce(s.level,0) + 1);
    until_t := case lvl when 1 then now() + interval '7 days' when 2 then now() + interval '1 month' when 3 then now() + interval '1 year' else null end; perm := lvl = 4;
    insert into public.lc73_spam(user_id,level,last_ban_at) values (p_peer,lvl,now()) on conflict (user_id) do update set level = lvl, last_ban_at = now();
    if to_regclass('public.lc65_bans') is not null then
      insert into public.lc65_bans(user_id,strikes,until,permanent) values (p_peer,0,until_t,perm)
      on conflict (user_id) do update set until = case when public.lc65_bans.permanent then public.lc65_bans.until else greatest(coalesce(public.lc65_bans.until,now()),until_t) end,
        permanent = public.lc65_bans.permanent or perm;
    end if;
  end if;
  return jsonb_build_object('ok',true,'blocked',true);
end $$;
create or replace function public.lc73_blocked_list() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  return jsonb_build_object('ok',true,'rows',(select coalesce(jsonb_agg(jsonb_build_object('with',b.blocked,'name',coalesce(m.name,'Member'),'at',b.created_at) order by b.created_at desc),'[]'::jsonb)
    from public.lc73_blocks b left join public.lc65_members m on m.user_id=b.blocked where b.blocker=auth.uid()));
end $$;
create or replace function public.lc73_spam_list() returns jsonb language plpgsql security definer set search_path = public as $$
begin perform public._lc_require_admin();
  return jsonb_build_object('ok',true,'rows',(select coalesce(jsonb_agg(jsonb_build_object('uid',s.user_id,'name',coalesce(m.name,'Member'),'level',s.level,'at',s.last_ban_at,
    'blocks',(select count(*) from public.lc73_blocks where blocked=s.user_id)) order by s.last_ban_at desc),'[]'::jsonb) from public.lc73_spam s left join public.lc65_members m on m.user_id=s.user_id where s.level>0));
end $$;
create or replace function public.lc73_unban(p_uid uuid) returns jsonb language plpgsql security definer set search_path = public as $$
begin perform public._lc_require_admin();
  update public.lc73_spam set level = greatest(0,level-1), last_ban_at = now() where user_id = p_uid;
  if to_regclass('public.lc65_bans') is not null then update public.lc65_bans set until = null, permanent = false where user_id = p_uid; end if;
  return jsonb_build_object('ok',true);
end $$;

-- ============ LC73.4 rivals and tribes ============
create table if not exists public.lc73_hub (user_id uuid primary key, name text not null default 'Member' check (char_length(name) <= 40), rating int, site text not null default '',
  note text not null default '' check (char_length(note) <= 140), active boolean not null default true, updated_at timestamptz not null default now());
create table if not exists public.lc73_rivals (a uuid not null, b uuid not null, status text not null default 'pending' check (status in ('pending','ok')), requested_by uuid not null,
  created_at timestamptz not null default now(), primary key (a,b), check (a < b));
create table if not exists public.lc73_tribes (id bigserial primary key, name text not null unique check (char_length(name) between 3 and 30), code text not null unique,
  owner uuid not null, created_at timestamptz not null default now());
create table if not exists public.lc73_tribe_members (user_id uuid primary key, tribe_id bigint not null references public.lc73_tribes(id) on delete cascade, name text not null default 'Member', joined_at timestamptz not null default now());
create table if not exists public.lc73_week_xp (user_id uuid not null, week date not null, xp int not null default 0 check (xp between 0 and 6000), updated_at timestamptz not null default now(), primary key (user_id, week));
alter table public.lc73_hub enable row level security; alter table public.lc73_rivals enable row level security; alter table public.lc73_tribes enable row level security;
alter table public.lc73_tribe_members enable row level security; alter table public.lc73_week_xp enable row level security;
revoke all on public.lc73_hub, public.lc73_rivals, public.lc73_tribes, public.lc73_tribe_members, public.lc73_week_xp from anon, authenticated;
create or replace function public._lc73_week(p_at timestamptz) returns date language sql immutable as $$ select (date_trunc('week', p_at at time zone 'utc'))::date $$;

create or replace function public.lc73_hub_list() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  return jsonb_build_object('ok',true,'me',(select to_jsonb(h) - 'user_id' from public.lc73_hub h where h.user_id=uid),
    'rows',(select coalesce(jsonb_agg(jsonb_build_object('uid',h.user_id,'name',h.name,'rating',h.rating,'site',h.site,'note',h.note,'rival',public._lc73_rival_status(uid,h.user_id)) order by abs(coalesce(h.rating,1000)-coalesce((select rating from public.lc73_hub where user_id=uid),1000)), h.updated_at desc),'[]'::jsonb)
      from (select * from public.lc73_hub where active and user_id<>uid and updated_at > now() - interval '30 days' and not public._lc73_blocked(uid,user_id) limit 60) h),
    'rivals',(select coalesce(jsonb_agg(jsonb_build_object('uid',case when r.a=uid then r.b else r.a end,'name',coalesce(h.name,m.name,'Member'),'status',r.status,'mine',r.requested_by=uid,
      'xp',coalesce((select xp from public.lc73_week_xp w where w.user_id=(case when r.a=uid then r.b else r.a end) and w.week=public._lc73_week(now())),0))),'[]'::jsonb)
      from public.lc73_rivals r left join public.lc73_hub h on h.user_id=(case when r.a=uid then r.b else r.a end)
      left join public.lc65_members m on m.user_id=(case when r.a=uid then r.b else r.a end) where r.a=uid or r.b=uid),
    'my_xp',coalesce((select xp from public.lc73_week_xp where user_id=uid and week=public._lc73_week(now())),0));
end $$;
create or replace function public._lc73_rival_status(x uuid, y uuid) returns text language sql stable security definer set search_path = public as $$
  select status from public.lc73_rivals where a=least(x,y) and b=greatest(x,y) $$;
create or replace function public.lc73_hub_join(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  insert into public.lc73_hub(user_id,name,rating,site,note,active,updated_at) values (auth.uid(), coalesce(nullif(public._lc72_clean(p->>'name',40),''),'Member'),
    nullif(p->>'rating','')::int, public._lc72_clean(p->>'site',20), public._lc72_clean(p->>'note',140), coalesce((p->>'active')::boolean,true), now())
  on conflict (user_id) do update set name = excluded.name, rating = excluded.rating, site = excluded.site, note = excluded.note, active = excluded.active, updated_at = now();
  return jsonb_build_object('ok',true);
exception when others then return jsonb_build_object('ok',false,'error','invalid');
end $$;
create or replace function public.lc73_rival_ask(p_uid uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  if p_uid is null or p_uid = uid or public._lc73_blocked(uid,p_uid) then return jsonb_build_object('ok',false,'error','bad_input'); end if;
  select count(*) into n from public.lc73_rivals where requested_by=uid and created_at > now() - interval '1 day'; if n >= 10 then return jsonb_build_object('ok',false,'error','slow_down'); end if;
  insert into public.lc73_rivals(a,b,status,requested_by) values (least(uid,p_uid),greatest(uid,p_uid),'pending',uid)
  on conflict (a,b) do update set status = case when public.lc73_rivals.requested_by <> uid then 'ok' else public.lc73_rivals.status end;
  return jsonb_build_object('ok',true,'status',public._lc73_rival_status(uid,p_uid));
end $$;
create or replace function public.lc73_rival_answer(p_uid uuid, p_ok boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  if p_ok then update public.lc73_rivals set status='ok' where a=least(uid,p_uid) and b=greatest(uid,p_uid);
  else delete from public.lc73_rivals where a=least(uid,p_uid) and b=greatest(uid,p_uid); end if;
  return jsonb_build_object('ok',true);
end $$;
create or replace function public.lc73_xp_report(p_xp int) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  insert into public.lc73_week_xp(user_id,week,xp) values (auth.uid(), public._lc73_week(now()), least(6000,greatest(0,coalesce(p_xp,0))))
  on conflict (user_id,week) do update set xp = greatest(public.lc73_week_xp.xp, excluded.xp), updated_at = now();
  return jsonb_build_object('ok',true);
end $$;
create or replace function public.lc73_tribe_create(p_name text, p_me text) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); t public.lc73_tribes; nm text := public._lc72_clean(p_name,30);
begin
  if uid is null then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  if char_length(nm) < 3 or nm ~* '\m(fuck|shit|nazi|hitler)\M' then return jsonb_build_object('ok',false,'error','name'); end if;
  if exists(select 1 from public.lc73_tribe_members where user_id=uid) then return jsonb_build_object('ok',false,'error','already'); end if;
  insert into public.lc73_tribes(name,code,owner) values (nm, upper(substr(md5(random()::text||clock_timestamp()::text),1,6)), uid) returning * into t;
  insert into public.lc73_tribe_members(user_id,tribe_id,name) values (uid,t.id,coalesce(nullif(public._lc72_clean(p_me,40),''),'Member'));
  return jsonb_build_object('ok',true,'code',t.code);
exception when unique_violation then return jsonb_build_object('ok',false,'error','taken');
end $$;
create or replace function public.lc73_tribe_join(p_code text, p_me text) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); t public.lc73_tribes; n int;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  select * into t from public.lc73_tribes where code = upper(btrim(coalesce(p_code,''))); if not found then return jsonb_build_object('ok',false,'error','code'); end if;
  select count(*) into n from public.lc73_tribe_members where tribe_id = t.id; if n >= 12 then return jsonb_build_object('ok',false,'error','full'); end if;
  insert into public.lc73_tribe_members(user_id,tribe_id,name) values (uid,t.id,coalesce(nullif(public._lc72_clean(p_me,40),''),'Member'))
  on conflict (user_id) do update set tribe_id = excluded.tribe_id, name = excluded.name, joined_at = now();
  return jsonb_build_object('ok',true,'tribe',t.name);
end $$;
create or replace function public.lc73_tribe_leave() returns jsonb language plpgsql security definer set search_path = public as $$
declare tid bigint;
begin
  delete from public.lc73_tribe_members where user_id = auth.uid() returning tribe_id into tid;
  if tid is not null and not exists(select 1 from public.lc73_tribe_members where tribe_id = tid) then delete from public.lc73_tribes where id = tid; end if;
  return jsonb_build_object('ok',true);
end $$;
-- tribe score of a week = average weekly XP of its members; Tribe Wars pair the tribes (2+ members) by last week's score: 1 v 2, 3 v 4, ...
create or replace function public._lc73_tribe_score(p_tid bigint, p_week date) returns int language sql stable security definer set search_path = public as $$
  select coalesce(round(avg(coalesce(w.xp,0)))::int,0) from public.lc73_tribe_members m left join public.lc73_week_xp w on w.user_id=m.user_id and w.week=p_week where m.tribe_id=p_tid $$;
create or replace function public.lc73_tribe_mine() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); tid bigint; wk date := public._lc73_week(now()); opp bigint; rnk int;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  select tribe_id into tid from public.lc73_tribe_members where user_id = uid;
  if tid is null then return jsonb_build_object('ok',true,'tribe',null); end if;
  with t as (select id, public._lc73_tribe_score(id, wk - 7) prev from public.lc73_tribes where (select count(*) from public.lc73_tribe_members where tribe_id=id) >= 2),
       o as (select id, row_number() over (order by prev desc, id) rn from t)
  select o.rn into rnk from o where o.id = tid;
  if rnk is not null then
    with t as (select id, public._lc73_tribe_score(id, wk - 7) prev from public.lc73_tribes where (select count(*) from public.lc73_tribe_members where tribe_id=id) >= 2),
         o as (select id, row_number() over (order by prev desc, id) rn from t)
    select id into opp from o where rn = case when rnk % 2 = 1 then rnk + 1 else rnk - 1 end;
  end if;
  return jsonb_build_object('ok',true,'week',wk,'tribe',(select jsonb_build_object('id',t.id,'name',t.name,'code',t.code,'mine',t.owner=uid,'score',public._lc73_tribe_score(t.id,wk)) from public.lc73_tribes t where t.id=tid),
    'members',(select coalesce(jsonb_agg(jsonb_build_object('uid',m.user_id,'name',m.name,'me',m.user_id=uid,'xp',coalesce(w.xp,0)) order by coalesce(w.xp,0) desc),'[]'::jsonb)
      from public.lc73_tribe_members m left join public.lc73_week_xp w on w.user_id=m.user_id and w.week=wk where m.tribe_id=tid),
    'war',case when opp is null then null else (select jsonb_build_object('name',t.name,'score',public._lc73_tribe_score(t.id,wk),'members',(select count(*) from public.lc73_tribe_members where tribe_id=t.id)) from public.lc73_tribes t where t.id=opp) end,
    'board',(select coalesce(jsonb_agg(jsonb_build_object('name',t.name,'score',public._lc73_tribe_score(t.id,wk),'members',(select count(*) from public.lc73_tribe_members where tribe_id=t.id),'mine',t.id=tid) order by public._lc73_tribe_score(t.id,wk) desc),'[]'::jsonb)
      from (select * from public.lc73_tribes limit 50) t));
end $$;

-- ============ LC73.5 tracking functions ============
create or replace function public.lc73_link_open(p_code text, p_device text) returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.lc73_links;
begin
  select * into l from public.lc73_links where code = lower(btrim(coalesce(p_code,''))) and active;
  if not found then return jsonb_build_object('ok',false,'dest','/'); end if;
  insert into public.lc73_hits(kind,code,device) values ('click',l.code,left(coalesce(p_device,''),40)) on conflict do nothing;
  return jsonb_build_object('ok',true,'dest',l.dest,'code',l.code,'platform',l.platform);
end $$;
create or replace function public.lc73_hit(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare k text := coalesce(p->>'kind',''); d text := left(regexp_replace(coalesce(p->>'device',''),'[^A-Za-z0-9-]','','g'),40);
begin
  if k not in ('landing','app_open','install') or d = '' then return jsonb_build_object('ok',false); end if;
  insert into public.lc73_hits(kind,code,utm_source,device) values (k, lower(left(regexp_replace(coalesce(p->>'code',''),'[^A-Za-z0-9-]','','g'),24)),
    lower(left(regexp_replace(coalesce(p->>'utm_source',''),'[^A-Za-z0-9._-]','','g'),40)), d) on conflict do nothing;
  return jsonb_build_object('ok',true);
end $$;
create or replace function public.lc73_attach(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c text := lower(left(regexp_replace(coalesce(p->>'code',''),'[^A-Za-z0-9-]','','g'),24));
begin
  if uid is null then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  insert into public.lc73_attrib(user_id,email,code,utm_source,utm_medium,utm_campaign,ref,device,first_at)
  values (uid, public._lc72_email(), c, lower(left(coalesce(p->>'utm_source',''),40)), lower(left(coalesce(p->>'utm_medium',''),40)), lower(left(coalesce(p->>'utm_campaign',''),60)),
    left(regexp_replace(coalesce(p->>'ref',''),'[^A-Za-z0-9_-]','','g'),40), left(coalesce(p->>'device',''),40), coalesce(nullif(p->>'first_at','')::timestamptz, now()))
  on conflict (user_id) do update set email = excluded.email,
    ref = case when public.lc73_attrib.ref = '' and public.lc73_attrib.created_at > now() - interval '14 days' then excluded.ref else public.lc73_attrib.ref end;   -- first touch wins
  return jsonb_build_object('ok',true);
exception when others then return jsonb_build_object('ok',false,'error','invalid');
end $$;
create or replace function public._lc73_partner_codes() returns text[] language sql stable security definer set search_path = public as $$
  select case when public._lc72_admin() then null else coalesce((select codes from public.lc73_partners where email = public._lc72_email()),array['__none__']) end $$;
create or replace function public.lc73_partner_me() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin return jsonb_build_object('ok',true,'admin',public._lc72_admin(),'partner',(select jsonb_build_object('name',name,'codes',codes) from public.lc73_partners where email = public._lc72_email())); end $$;
create or replace function public.lc73_link_save(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare c text := lower(btrim(coalesce(p->>'code',''))); adm boolean := public._lc72_admin(); pe text := public._lc72_email(); pr public.lc73_partners;
begin
  if not adm then select * into pr from public.lc73_partners where email = pe; if not found then return jsonb_build_object('ok',false,'error','forbidden'); end if; end if;
  if c !~ '^[a-z0-9-]{2,24}$' or c in ('admin','app','api') then return jsonb_build_object('ok',false,'error','code'); end if;
  if exists(select 1 from public.lc73_links where code = c and (not adm and partner_email <> pe)) then return jsonb_build_object('ok',false,'error','taken'); end if;
  insert into public.lc73_links(code,platform,label,dest,partner_email,active) values (c, lower(public._lc72_clean(p->>'platform',30)), public._lc72_clean(p->>'label',80),
    coalesce(nullif(public._lc72_clean(p->>'dest',200),''),'/'), case when adm then lower(public._lc72_clean(p->>'partner_email',120)) else pe end, coalesce((p->>'active')::boolean,true))
  on conflict (code) do update set platform = excluded.platform, label = excluded.label, dest = excluded.dest, active = excluded.active,
    partner_email = case when adm then excluded.partner_email else public.lc73_links.partner_email end;
  if not adm then update public.lc73_partners set codes = (select array_agg(distinct x) from unnest(codes || c) x) where email = pe; end if;
  return jsonb_build_object('ok',true,'code',c);
exception when check_violation then return jsonb_build_object('ok',false,'error','invalid');
end $$;
create or replace function public.lc73_link_del(p_code text) returns jsonb language plpgsql security definer set search_path = public as $$
begin perform public._lc_require_admin(); update public.lc73_links set active = false where code = p_code; return jsonb_build_object('ok',found); end $$;
create or replace function public.lc73_views_save(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare adm boolean := public._lc72_admin(); pe text := public._lc72_email();
begin
  if not adm and not exists(select 1 from public.lc73_partners where email = pe) then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  if nullif(p->>'delete','') is not null then delete from public.lc73_views where id = (p->>'delete')::bigint and (adm or partner_email = pe); return jsonb_build_object('ok',true); end if;
  insert into public.lc73_views(channel,period_start,period_end,views,note,partner_email) values (lower(public._lc72_clean(p->>'channel',30)), (p->>'from')::date, (p->>'to')::date,
    (p->>'views')::bigint, public._lc72_clean(p->>'note',120), case when adm then '' else pe end);
  return jsonb_build_object('ok',true);
exception when others then return jsonb_build_object('ok',false,'error','invalid');
end $$;
create or replace function public.lc73_kpi_set(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare k text;
begin perform public._lc_require_admin();
  for k in select jsonb_object_keys(p) loop
    if k in ('view_to_visit','visit_to_install','install_to_signup','signup_to_card','card_to_paid','signup_to_paid') then
      insert into public.lc73_kpis(stage,target) values (k, least(100,greatest(0,(p->>k)::numeric))) on conflict (stage) do update set target = excluded.target; end if;
  end loop;
  return jsonb_build_object('ok',true);
end $$;
create or replace function public.lc73_partner_set(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare e text := lower(btrim(coalesce(p->>'email','')));
begin perform public._lc_require_admin();
  if coalesce((p->>'delete')::boolean,false) then delete from public.lc73_partners where email = e; return jsonb_build_object('ok',true); end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok',false,'error','email'); end if;
  insert into public.lc73_partners(email,name,codes) values (e, public._lc72_clean(p->>'name',60),
    coalesce((select array_agg(lower(x)) from jsonb_array_elements_text(coalesce(p->'codes','[]'::jsonb)) x where x ~ '^[A-Za-z0-9-]{2,24}$'),'{}'))
  on conflict (email) do update set name = excluded.name, codes = excluded.codes;
  return jsonb_build_object('ok',true);
end $$;

-- the dashboard. p = {"from":"2026-11-01","to":"2026-11-12"} or {"all":true}. Owner: everything; partner: only the people who came through their codes.
create or replace function public._lc73_sum(q text, p_from timestamptz, p_to timestamptz, p_emails text[]) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin execute q into r using p_from, p_to, p_emails; return coalesce(r,'{}'::jsonb); exception when others then return '{}'::jsonb; end $$;
create or replace function public._lc73_paid_tokens(p_email text) returns boolean language plpgsql stable security definer set search_path = public as $$
begin return exists(select 1 from public.lc36_token_credits c where c.email = p_email and c.amount_cents > 0); exception when others then return false; end $$;
create or replace function public.lc73_dash(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare adm boolean := public._lc72_admin(); codes text[] := public._lc73_partner_codes(); allt boolean := coalesce((p->>'all')::boolean,false);
  f timestamptz; t timestamptz; em text[]; usr uuid[]; res jsonb := '{}'::jsonb; subs jsonb; toks jsonb; lib jsonb; links jsonb; views bigint; v_clicks int; v_land int; v_open int; v_inst int; v_sign int; v_card int;
  v_pay int; rev bigint; churn jsonb; kp jsonb;
begin
  if not adm and codes = array['__none__'] then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  f := case when allt then '-infinity'::timestamptz else coalesce(nullif(p->>'from','')::date, current_date - 30)::timestamptz end;
  t := case when allt then 'infinity'::timestamptz else (coalesce(nullif(p->>'to','')::date, current_date) + 1)::timestamptz end;
  -- the people in scope (partner: attributed to their codes)
  select array_agg(a.email), array_agg(a.user_id) into em, usr from public.lc73_attrib a where codes is null or a.code = any(codes);
  if codes is null then em := null; usr := null; else em := coalesce(em,'{}'); usr := coalesce(usr,'{}'); end if;
  select coalesce(sum(v.views),0) into views from public.lc73_views v where (allt or (v.period_end >= f::date and v.period_start < t::date)) and (adm or v.partner_email = public._lc72_email());
  select count(*) filter (where kind='click'), count(distinct device) filter (where kind='landing'), count(distinct device) filter (where kind='app_open'), count(distinct device) filter (where kind='install')
    into v_clicks, v_land, v_open, v_inst from public.lc73_hits h where h.created_at >= f and h.created_at < t and (codes is null or h.code = any(codes));
  select count(*) into v_sign from auth.users u where u.created_at >= f and u.created_at < t and (codes is null or u.id = any(coalesce(usr,'{}')));
  select count(distinct email) into v_card from public.lc73_trials x where x.started_at >= f and x.started_at < t and (em is null or x.email = any(em));
  subs := public._lc73_sum($q$select jsonb_build_object('pro',count(*) filter (where tier<>3),'vip',count(*) filter (where tier=3),'cents',coalesce(sum(amount_cents),0),
      'emails',coalesce(jsonb_agg(distinct lower(email)),'[]'::jsonb)) from arena.lc34_pro_sales where status='paid' and to_timestamp(paid_at/1000.0) >= $1 and to_timestamp(paid_at/1000.0) < $2 and ($3 is null or lower(email) = any($3))$q$, f, t, em);
  toks := public._lc73_sum($q$select jsonb_build_object('n',count(*),'cents',coalesce(sum(amount_cents),0),'emails',coalesce(jsonb_agg(distinct email),'[]'::jsonb))
      from public.lc36_token_credits where amount_cents > 0 and created_at >= $1 and created_at < $2 and ($3 is null or email = any($3))$q$, f, t, em);
  lib := public._lc73_sum($q$select jsonb_build_object('courses',count(*) filter (where i.kind='course'),'books',count(*) filter (where i.kind<>'course'),'cents',coalesce(sum(g.amount_cents),0),
      'token_buys',count(*) filter (where g.source='tokens'),'emails',coalesce(jsonb_agg(distinct g.email),'[]'::jsonb))
      from public.lc70_grants g join public.lc70_items i on i.id=g.item_id where g.source in ('stripe','tokens') and g.created_at >= $1 and g.created_at < $2 and ($3 is null or g.email = any($3))$q$, f, t, em);
  select count(*) into v_pay from (select jsonb_array_elements_text(coalesce(subs->'emails','[]')) e union select jsonb_array_elements_text(coalesce(toks->'emails','[]'))
    union select jsonb_array_elements_text(coalesce(lib->'emails','[]'))) z;
  rev := coalesce((subs->>'cents')::bigint,0) + coalesce((toks->>'cents')::bigint,0) + coalesce((lib->>'cents')::bigint,0);
  churn := jsonb_build_object(
    'renewals',(select count(*) from public.lc73_sub_events e where e.kind='renewal' and e.created_at >= f and e.created_at < t and (em is null or e.email = any(em))),
    'trial_converted',(select count(*) from public.lc73_trials x where x.converted_at >= f and x.converted_at < t and (em is null or x.email = any(em))),
    'trial_cancelled',(select count(*) from public.lc73_trials x where x.cancelled and x.trial_end >= f and x.trial_end < t and (em is null or x.email = any(em))),
    'lapsed',public._lc73_sum($q$select jsonb_build_object('n',count(distinct lower(email))) from public.licenses l where tier >= 2 and coalesce(source,'') <> 'gift' and expires_at >= $1 and expires_at < least($2, now())
       and not exists(select 1 from public.licenses l2 where lower(l2.email)=lower(l.email) and l2.tier>=2 and l2.expires_at > now() and coalesce(l2.revoked,false)=false) and ($3 is null or lower(email) = any($3))$q$, f, t, em)->'n',
    'active',public._lc73_sum($q$select jsonb_build_object('n',count(distinct lower(email))) from public.licenses where tier >= 2 and coalesce(revoked,false)=false and expires_at > now() and ($3 is null or lower(email) = any($3)) and $1 is not null and $2 is not null$q$, f, t, em)->'n');
  -- all-time customer value: repeat buyers, upsells, LTV (always all time, scope still applied)
  res := public._lc73_sum($q$with pay as (
      select lower(email) e, amount_cents c, 'sub'||tier k from arena.lc34_pro_sales where status='paid' and ($3 is null or lower(email) = any($3))
      union all select email, amount_cents, 'tokens' from public.lc36_token_credits where amount_cents > 0 and ($3 is null or email = any($3))
      union all select g.email, coalesce(g.amount_cents,0), 'lib' from public.lc70_grants g where g.source='stripe' and ($3 is null or g.email = any($3)))
    select jsonb_build_object('customers',count(distinct e),'revenue',coalesce(sum(c),0),'repeat',(select count(*) from (select e from pay group by e having count(*) >= 2) r),
      'upsell',(select count(*) from (select e from pay group by e having count(distinct k) >= 2) u)) from pay where $1 is not null and $2 is not null$q$, f, t, em);
  select coalesce(jsonb_object_agg(stage,target),'{}'::jsonb) into kp from public.lc73_kpis;
  -- per platform and per link code
  select coalesce(jsonb_agg(x order by (x->>'platform'), (x->>'code')),'[]'::jsonb) into links from (
    select jsonb_build_object('code',l.code,'platform',l.platform,'label',l.label,'dest',l.dest,'active',l.active,'partner',l.partner_email,
      'clicks',(select count(*) from public.lc73_hits h where h.code=l.code and h.kind='click' and h.created_at >= f and h.created_at < t),
      'visits',(select count(distinct device) from public.lc73_hits h where h.code=l.code and h.kind='landing' and h.created_at >= f and h.created_at < t),
      'installs',(select count(distinct device) from public.lc73_hits h where h.code=l.code and h.kind in ('install','app_open') and h.created_at >= f and h.created_at < t),
      'signups',(select count(*) from public.lc73_attrib a join auth.users u on u.id=a.user_id where a.code=l.code and u.created_at >= f and u.created_at < t),
      'paying',(select count(*) from public.lc73_attrib a where a.code=l.code and a.email <> '' and (public._lc72_tier(a.email) >= 2 or public._lc72_buyer(a.email)
         or public._lc73_paid_tokens(a.email)))) x
    from public.lc73_links l where codes is null or l.code = any(codes)) q;
  return jsonb_build_object('ok',true,'admin',adm,'range',jsonb_build_object('from',case when allt then null else f end,'to',case when allt then null else t end,'all',allt),
    'funnel',jsonb_build_object('views',views,'clicks',v_clicks,'visits',v_land,'installs',greatest(v_inst,v_open),'signups',v_sign,'cards',v_card,'paying',v_pay),
    'paid',jsonb_build_object('subs_pro',coalesce((subs->>'pro')::int,0),'subs_vip',coalesce((subs->>'vip')::int,0),'token_packs',coalesce((toks->>'n')::int,0),
      'courses',coalesce((lib->>'courses')::int,0),'books',coalesce((lib->>'books')::int,0),'library_token_buys',coalesce((lib->>'token_buys')::int,0),'revenue_cents',rev),
    'retention',churn,'lifetime',res,'kpis',kp,'links',links,
    'sources',(select coalesce(jsonb_object_agg(s,n),'{}'::jsonb) from (select coalesce(nullif(utm_source,''),nullif(code,''),'direct') s, count(*) n from public.lc73_attrib a join auth.users u on u.id=a.user_id
      where u.created_at >= f and u.created_at < t and (codes is null or a.code = any(codes)) group by 1) z),
    'views',(select coalesce(jsonb_agg(to_jsonb(v) order by v.period_start desc),'[]'::jsonb) from (select * from public.lc73_views where adm or partner_email = public._lc72_email() order by period_start desc limit 60) v),
    'partners',case when adm then (select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.lc73_partners x) else null end);
end $$;

-- ============ LC74 member shares: "Share this achievement" from the Congratulations pop-up (opt-in per achievement) ============
create table if not exists public.lc74_shares (id bigserial primary key, user_id uuid not null, name text not null default 'Member' check (char_length(name) <= 40),
  kind text not null default 'other' check (kind in ('level','quest','rival','analysis','road','other')), title text not null check (char_length(title) between 3 and 140),
  body text not null default '' check (char_length(body) <= 600), promoted boolean not null default false, created_at timestamptz not null default now());
alter table public.lc74_shares enable row level security; revoke all on public.lc74_shares from anon, authenticated;
create or replace function public.lc74_share(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int; id bigint;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  select count(*) into n from public.lc74_shares where user_id = uid and created_at > now() - interval '1 day'; if n >= 5 then return jsonb_build_object('ok',false,'error','slow_down'); end if;
  insert into public.lc74_shares(user_id,name,kind,title,body) values (uid, coalesce(nullif(public._lc72_clean(p->>'name',40),''),'Member'),
    case when p->>'kind' in ('level','quest','rival','analysis','road') then p->>'kind' else 'other' end, public._lc72_clean(p->>'title',140), public._lc72_clean(p->>'body',600)) returning lc74_shares.id into id;
  return jsonb_build_object('ok',true,'id',id);
exception when check_violation then return jsonb_build_object('ok',false,'error','invalid');
end $$;
create or replace function public.lc74_shares_admin() returns jsonb language plpgsql security definer set search_path = public as $$
begin perform public._lc_require_admin();
  return jsonb_build_object('ok',true,'rows',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'kind',kind,'title',title,'body',body,'promoted',promoted,'at',created_at) order by id desc),'[]'::jsonb)
    from (select * from public.lc74_shares order by id desc limit 100) z));
end $$;
create or replace function public.lc74_share_promote(p_id bigint) returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.lc74_shares; nid bigint;
begin perform public._lc_require_admin();
  select * into r from public.lc74_shares where id = p_id; if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  insert into public.lc72_land_items(kind,name,role,body,visible) values ('love', r.name, r.title, coalesce(nullif(r.body,''), r.title), true) returning id into nid;
  update public.lc74_shares set promoted = true where id = p_id;
  return jsonb_build_object('ok',true,'item',nid);
end $$;

-- ============ permissions ============
do $$ declare r record; begin
  for r in select p.oid::regprocedure sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and (p.proname ~ '^_?lc7[234]_') loop
    execute 'revoke all on function ' || r.sig || ' from public, anon, authenticated';
    if r.proname !~ '^_' and r.proname not in ('lc73_discount_for','lc73_discount_paid') then execute 'grant execute on function ' || r.sig || ' to authenticated'; end if;
    if r.proname in ('lc72_landing_public','lc72_lib_extras','lc73_link_open','lc73_hit') then execute 'grant execute on function ' || r.sig || ' to anon'; end if;
  end loop;
end $$;
-- _lc72_admin is used inside storage policies, which run as the signed-in member
grant execute on function public._lc72_admin() to authenticated;
