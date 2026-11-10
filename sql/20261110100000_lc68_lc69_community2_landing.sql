-- 9.34.0 (LC68 + LC69). Idempotent. Run AFTER sql/20261108120000_lc65_community.sql (it replaces three of its functions with a newer version).
-- LC68: feed categories and chat channels managed by the owner, up / down votes with Hot / Top / New, a light posting threshold.
-- LC69: landing page texts edited by the owner inside the app, and the public member counter for the hero.

-- ---------------- tables ----------------
create table if not exists public.lc68_categories(slug text primary key, name text not null, sort int not null default 0, admin_only boolean not null default false);
insert into public.lc68_categories(slug,name,sort,admin_only) values
  ('general','General',1,false),('wins','Wins',2,false),('questions','Questions',3,false),('games','Games to review',4,false),('announcements','Announcements',5,true)
  on conflict do nothing;
create table if not exists public.lc68_cfg(id int primary key default 1 check (id=1), min_level int not null default 2, min_hours int not null default 1, hide_at int not null default -5);
insert into public.lc68_cfg(id) values (1) on conflict do nothing;
create table if not exists public.lc68_down(post_id bigint not null references public.lc65_posts(id) on delete cascade, user_id uuid not null, created_at timestamptz not null default now(), primary key(post_id,user_id));
create table if not exists public.lc69_landing(key text primary key, value text not null default '', updated_at timestamptz not null default now());
do $$ declare t text; begin
  foreach t in array array['lc68_categories','lc68_cfg','lc68_down','lc69_landing'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop; end $$;

-- ---------------- helpers ----------------
create or replace function public._lc68_score(p_post bigint) returns int language sql stable security definer set search_path = public as $$
  select (select count(*) from public.lc65_likes l where l.kind='p' and l.ref=p_post)::int - (select count(*) from public.lc68_down d where d.post_id=p_post)::int $$;
create or replace function public._lc68_myvote(p_post bigint, p_uid uuid) returns int language sql stable security definer set search_path = public as $$
  select case when exists(select 1 from public.lc65_likes l where l.kind='p' and l.ref=p_post and l.user_id=p_uid) then 1
              when exists(select 1 from public.lc68_down d where d.post_id=p_post and d.user_id=p_uid) then -1 else 0 end $$;
create or replace function public._lc68_slug(p_name text) returns text language sql immutable as $$
  select left(trim(both '-' from regexp_replace(lower(coalesce(p_name,'')),'[^a-z0-9]+','-','g')),30) $$;
create or replace function public._lc68_clean(t text, n int) returns text language sql immutable as $$
  select left(btrim(regexp_replace(coalesce(t,''),'[\x00-\x08\x0B\x0C\x0E-\x1F<>]','','g')),n) $$;
revoke all on function public._lc68_score(bigint), public._lc68_myvote(bigint,uuid) from public, anon, authenticated;

-- ---------------- public: categories + the threshold the app shows ----------------
create or replace function public.lc68_cats() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok',true,
    'cats',(select coalesce(jsonb_agg(jsonb_build_object('slug',slug,'name',name,'admin_only',admin_only) order by sort, slug),'[]'::jsonb) from public.lc68_categories),
    'cfg',(select jsonb_build_object('min_level',min_level,'min_hours',min_hours,'hide_at',hide_at) from public.lc68_cfg where id=1)) $$;

-- ---------------- votes: up = the existing like (points and levels stay as they were), down = lc68_down ----------------
create or replace function public.lc68_vote(p_post bigint, p_v int) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); owner uuid; cur int; want int := case when p_v>0 then 1 when p_v<0 then -1 else 0 end;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','auth'); end if;
  select user_id into owner from public.lc65_posts where id=p_post and not deleted;
  if owner is null then return jsonb_build_object('ok',false,'error','not_found'); end if;
  if owner=uid then return jsonb_build_object('ok',false,'error','own'); end if;
  cur := public._lc68_myvote(p_post,uid);
  if want=cur then want:=0; end if;                       -- pressing the same arrow again takes the vote back
  delete from public.lc65_likes where kind='p' and ref=p_post and user_id=uid;
  delete from public.lc68_down where post_id=p_post and user_id=uid;
  if want=1 then insert into public.lc65_likes(kind,ref,user_id) values ('p',p_post,uid) on conflict do nothing;
  elsif want=-1 then insert into public.lc68_down(post_id,user_id) values (p_post,uid) on conflict do nothing; end if;
  return jsonb_build_object('ok',true,'myvote',want,'score',public._lc68_score(p_post),'likes',(select count(*) from public.lc65_likes where kind='p' and ref=p_post));
end $$;

-- ---------------- newer versions of three LC65 functions ----------------
-- the feed: sort hot / top / new, score and my vote on every post, posts at or below the hide score are hidden from others
create or replace function public.lc65_c39_feed(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); comm text := coalesce(nullif(p_a->>'community',''),'main'); cat text := coalesce(p_a->>'category','');
  pg int := greatest(0,coalesce((p_a->>'page')::int,0)); srt text := coalesce(nullif(p_a->>'sort',''),'hot'); adm boolean := public._lc65_admin();
  hide int := coalesce((select hide_at from public.lc68_cfg where id=1),-5); rows jsonb; n int;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  if srt not in ('hot','top','new') then srt:='hot'; end if;
  perform public._lc65_touch(p_a->>'name');
  select count(*) into n from public.lc65_posts p
    where p.community=comm and not p.deleted and (cat='' or p.category=cat) and (adm or p.user_id=uid or public._lc68_score(p.id) > hide);
  with base as (
    select p.*, public._lc68_score(p.id) as score, extract(epoch from (now()-p.created_at))/3600.0 as hrs
    from public.lc65_posts p
    where p.community=comm and not p.deleted and (cat='' or p.category=cat)
      and (adm or p.user_id=uid or public._lc68_score(p.id) > hide)
  ), ranked as (
    select b.*, case srt when 'new' then extract(epoch from b.created_at)
                         when 'top' then b.score*1e10 + extract(epoch from b.created_at)
                         else (b.score+1)/power(b.hrs+2,1.5) end as rk
    from base b order by b.pinned desc, 
      (case srt when 'new' then extract(epoch from b.created_at) when 'top' then b.score*1e10 + extract(epoch from b.created_at) else (b.score+1)/power(b.hrs+2,1.5) end) desc
    offset pg*20 limit 20
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',coalesce(m.name,'Member'),'level',public._lc65_level(public._lc65_pts(r.user_id)),'created',(extract(epoch from r.created_at)*1000)::bigint,
      'category',r.category,'pinned',r.pinned,'title',r.title,'preview',left(r.body,220),
      'likes',(select count(*) from public.lc65_likes l where l.kind='p' and l.ref=r.id),'liked',exists(select 1 from public.lc65_likes l where l.kind='p' and l.ref=r.id and l.user_id=uid),
      'comments',(select count(*) from public.lc65_comments c where c.post_id=r.id and not c.deleted),'mine',r.user_id=uid,
      'score',r.score,'myvote',public._lc68_myvote(r.id,uid)) order by r.pinned desc, r.rk desc),'[]'::jsonb)
    into rows from ranked r left join public.lc65_members m on m.user_id=r.user_id;
  return jsonb_build_object('ok',true,'status',200,'posts',rows,'more',n > (pg+1)*20,'sort',srt);
end $$;

-- one post: also its score and my vote
create or replace function public.lc65_c39_post_get(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pid bigint := (p_a->>'id')::bigint; r public.lc65_posts; post jsonb; cm jsonb;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  select * into r from public.lc65_posts where id=pid and not deleted;
  if not found then return jsonb_build_object('ok',false,'status',200,'reason','not_found'); end if;
  post := jsonb_build_object('id',r.id,'name',coalesce((select name from public.lc65_members where user_id=r.user_id),'Member'),'level',public._lc65_level(public._lc65_pts(r.user_id)),
    'created',(extract(epoch from r.created_at)*1000)::bigint,'category',r.category,'pinned',r.pinned,'title',r.title,'body',r.body,
    'likes',(select count(*) from public.lc65_likes l where l.kind='p' and l.ref=r.id),'liked',exists(select 1 from public.lc65_likes l where l.kind='p' and l.ref=r.id and l.user_id=uid),'mine',r.user_id=uid,
    'score',public._lc68_score(r.id),'myvote',public._lc68_myvote(r.id,uid));
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',coalesce(m.name,'Member'),'level',public._lc65_level(public._lc65_pts(c.user_id)),'created',(extract(epoch from c.created_at)*1000)::bigint,
    'body',c.body,'likes',(select count(*) from public.lc65_likes l where l.kind='c' and l.ref=c.id),'liked',exists(select 1 from public.lc65_likes l where l.kind='c' and l.ref=c.id and l.user_id=uid),'mine',c.user_id=uid) order by c.created_at),'[]'::jsonb)
    into cm from public.lc65_comments c left join public.lc65_members m on m.user_id=c.user_id where c.post_id=r.id and not c.deleted;
  return jsonb_build_object('ok',true,'status',200,'post',post,'comments',cm);
end $$;

-- a new post: categories from lc68_categories (owner-only ones need the owner), the account must be older than min_hours
create or replace function public.lc65_c39_post(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); t text := btrim(coalesce(p_a->>'title','')); b text := btrim(coalesce(p_a->>'body','')); cat text := coalesce(nullif(p_a->>'category',''),'general');
  comm text := coalesce(nullif(p_a->>'community',''),'main'); n int; bn jsonb; new_id bigint; ao boolean; adm boolean := public._lc65_admin(); hrs int; born timestamptz;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  bn := public._lc65_ban(uid); if bn is not null then return bn; end if;
  if t='' or b='' or length(t)>120 or length(b)>4000 then return jsonb_build_object('ok',false,'status',200,'reason','bad_input'); end if;
  select admin_only into ao from public.lc68_categories where slug=cat;
  if ao is null then cat:='general'; ao:=false; end if;
  if ao and not adm then return jsonb_build_object('ok',false,'status',200,'reason','forbidden'); end if;
  if not adm then
    select min_hours into hrs from public.lc68_cfg where id=1;
    select u.created_at into born from auth.users u where u.id=uid;
    if coalesce(hrs,0)>0 and born is not null and born > now()-make_interval(hours=>hrs) then return jsonb_build_object('ok',false,'status',200,'reason','too_new'); end if;
  end if;
  if public._lc65_links(t||' '||b) > 3 then return jsonb_build_object('ok',false,'status',200,'reason','too_many_links'); end if;
  if not exists(select 1 from public.lc65_communities where code=comm) then comm:='main'; end if;
  select count(*) into n from public.lc65_posts where user_id=uid and created_at > now()-interval '1 day'; if n>=20 then return jsonb_build_object('ok',false,'status',200,'reason','slow_down'); end if;
  perform public._lc65_touch(p_a->>'name');
  insert into public.lc65_posts(community,category,user_id,title,body) values (comm,cat,uid,t,b) returning lc65_posts.id into new_id;
  return jsonb_build_object('ok',true,'status',200,'id',new_id);
end $$;

-- ---------------- owner: categories, channels, threshold ----------------
create or replace function public.lc68_admin_list() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok',true,
    'cats',(select coalesce(jsonb_agg(jsonb_build_object('slug',slug,'name',name,'admin_only',admin_only,'sort',sort) order by sort, slug),'[]'::jsonb) from public.lc68_categories),
    'chans',(select coalesce(jsonb_agg(jsonb_build_object('slug',slug,'name',name,'descr',descr,'admin_only',admin_only,'sort',sort) order by sort, slug),'[]'::jsonb) from public.lc65_channels),
    'cfg',(select jsonb_build_object('min_level',min_level,'min_hours',min_hours,'hide_at',hide_at) from public.lc68_cfg where id=1));
end $$;

create or replace function public.lc68_admin_save(p_kind text, p_slug text, p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare nm text := public._lc68_clean(p_a->>'name',40); ds text := public._lc68_clean(p_a->>'descr',120); ao boolean := coalesce((p_a->>'admin_only')::boolean,false); sl text := coalesce(p_slug,''); mx int;
begin
  perform public._lc_require_admin();
  if p_kind not in ('cat','chan') then return jsonb_build_object('ok',false,'error','bad_input'); end if;
  if sl='' then
    if nm='' then return jsonb_build_object('ok',false,'error','bad_input'); end if;
    sl := public._lc68_slug(nm); if sl='' then return jsonb_build_object('ok',false,'error','bad_input'); end if;
    if p_kind='cat' then
      if exists(select 1 from public.lc68_categories where slug=sl) then return jsonb_build_object('ok',false,'error','exists'); end if;
      select coalesce(max(sort),0)+1 into mx from public.lc68_categories;
      insert into public.lc68_categories(slug,name,sort,admin_only) values (sl,nm,mx,ao);
    else
      if exists(select 1 from public.lc65_channels where slug=sl) then return jsonb_build_object('ok',false,'error','exists'); end if;
      select coalesce(max(sort),0)+1 into mx from public.lc65_channels;
      insert into public.lc65_channels(slug,name,descr,admin_only,sort) values (sl,nm,ds,ao,mx);
    end if;
    return jsonb_build_object('ok',true,'slug',sl);
  end if;
  if p_kind='cat' then
    update public.lc68_categories set name=case when nm='' then name else nm end, admin_only=case when slug='general' then false else ao end where slug=sl;
  else
    update public.lc65_channels set name=case when nm='' then name else nm end, descr=ds, admin_only=ao where slug=sl;
  end if;
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  return jsonb_build_object('ok',true,'slug',sl);
end $$;

create or replace function public.lc68_admin_delete(p_kind text, p_slug text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform public._lc_require_admin();
  if p_slug='general' then return jsonb_build_object('ok',false,'error','keep_general'); end if;
  if p_kind='cat' then
    update public.lc65_posts set category='general' where category=p_slug;
    delete from public.lc68_categories where slug=p_slug;
  elsif p_kind='chan' then
    delete from public.lc65_msgs where channel=p_slug;          -- votes go with them (on delete cascade)
    delete from public.lc65_channels where slug=p_slug;
  else return jsonb_build_object('ok',false,'error','bad_input'); end if;
  get diagnostics n = row_count;
  if n=0 then return jsonb_build_object('ok',false,'error','not_found'); end if;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.lc68_admin_move(p_kind text, p_slug text, p_dir int) returns jsonb language plpgsql security definer set search_path = public as $$
declare me_s int; other text; other_s int; i int := 0; r record;
begin
  perform public._lc_require_admin();
  -- renumber first, so equal sort values can be swapped
  if p_kind='cat' then
    for r in select slug from public.lc68_categories order by sort, slug loop i:=i+1; update public.lc68_categories set sort=i where slug=r.slug; end loop;
    select sort into me_s from public.lc68_categories where slug=p_slug;
    if me_s is null then return jsonb_build_object('ok',false,'error','not_found'); end if;
    select slug, sort into other, other_s from public.lc68_categories where sort=me_s+sign(p_dir)::int;
    if other is null then return jsonb_build_object('ok',true); end if;
    update public.lc68_categories set sort=other_s where slug=p_slug; update public.lc68_categories set sort=me_s where slug=other;
  elsif p_kind='chan' then
    for r in select slug from public.lc65_channels order by sort, slug loop i:=i+1; update public.lc65_channels set sort=i where slug=r.slug; end loop;
    select sort into me_s from public.lc65_channels where slug=p_slug;
    if me_s is null then return jsonb_build_object('ok',false,'error','not_found'); end if;
    select slug, sort into other, other_s from public.lc65_channels where sort=me_s+sign(p_dir)::int;
    if other is null then return jsonb_build_object('ok',true); end if;
    update public.lc65_channels set sort=other_s where slug=p_slug; update public.lc65_channels set sort=me_s where slug=other;
  else return jsonb_build_object('ok',false,'error','bad_input'); end if;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.lc68_admin_cfg(p_cfg jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  update public.lc68_cfg set
    min_level = least(30,greatest(1,coalesce((p_cfg->>'min_level')::int,min_level))),
    min_hours = least(720,greatest(0,coalesce((p_cfg->>'min_hours')::int,min_hours))),
    hide_at   = least(-1,greatest(-100,coalesce((p_cfg->>'hide_at')::int,hide_at)))
  where id=1;
  return jsonb_build_object('ok',true);
end $$;

-- ---------------- LC69: landing texts and the member counter ----------------
create or replace function public.lc69_landing_public() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok',true,'values',coalesce((select jsonb_object_agg(key,value) from public.lc69_landing where key in ('hero_title','hero_sub','story','video') and value<>''),'{}'::jsonb)) $$;
create or replace function public.lc69_landing_get() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok',true,'values',coalesce((select jsonb_object_agg(key,value) from public.lc69_landing),'{}'::jsonb));
end $$;
create or replace function public.lc69_landing_set(p_values jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare k text; lim int; v text;
begin
  perform public._lc_require_admin();
  foreach k in array array['hero_title','hero_sub','story','video'] loop
    if p_values ? k then
      lim := case k when 'story' then 2400 when 'video' then 300 when 'hero_sub' then 200 else 160 end;
      v := left(btrim(regexp_replace(coalesce(p_values->>k,''),'[\x00-\x09\x0B\x0C\x0E-\x1F<>]','','g')),lim);
      if k='video' and v<>'' and v !~ '^https://' then v := ''; end if;
      insert into public.lc69_landing(key,value,updated_at) values (k,v,now()) on conflict (key) do update set value=excluded.value, updated_at=now();
    end if;
  end loop;
  return jsonb_build_object('ok',true);
end $$;
-- only a number leaves the database: how many accounts exist (for "N of 20,000" in the hero)
create or replace function public.lc69_member_count() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok',true,'members',(select count(*) from auth.users)) $$;

-- ---------------- grants ----------------
revoke all on function public.lc68_cats(), public.lc68_vote(bigint,int), public.lc68_admin_list(), public.lc68_admin_save(text,text,jsonb), public.lc68_admin_delete(text,text),
  public.lc68_admin_move(text,text,int), public.lc68_admin_cfg(jsonb), public.lc69_landing_public(), public.lc69_landing_get(), public.lc69_landing_set(jsonb), public.lc69_member_count() from public;
grant execute on function public.lc68_cats(), public.lc69_landing_public(), public.lc69_member_count() to anon, authenticated;
grant execute on function public.lc68_vote(bigint,int), public.lc68_admin_list(), public.lc68_admin_save(text,text,jsonb), public.lc68_admin_delete(text,text),
  public.lc68_admin_move(text,text,int), public.lc68_admin_cfg(jsonb), public.lc69_landing_get(), public.lc69_landing_set(jsonb),
  public.lc65_c39_feed(jsonb), public.lc65_c39_post_get(jsonb), public.lc65_c39_post(jsonb) to authenticated;
