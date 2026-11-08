-- LC65 (build 9.33.0): the community, all in the database. The client calls these functions directly with the member's own token
-- (no arena action needed). Idempotent. Run AFTER 20261108100000_lc61_lc62_gym_heroes.sql.
create table if not exists public.lc65_communities(code text primary key, name text not null, partner text);
insert into public.lc65_communities(code,name) values ('main','Lanckriet Chess') on conflict do nothing;
create table if not exists public.lc65_members(user_id uuid primary key, name text not null default 'Member', updated_at timestamptz not null default now());
create table if not exists public.lc65_posts(id bigserial primary key, community text not null default 'main', category text not null default 'general', user_id uuid not null,
  title text not null, body text not null, pinned boolean not null default false, deleted boolean not null default false, created_at timestamptz not null default now());
create index if not exists lc65_posts_feed on public.lc65_posts(community, pinned desc, created_at desc) where not deleted;
create table if not exists public.lc65_comments(id bigserial primary key, post_id bigint not null references public.lc65_posts(id) on delete cascade, user_id uuid not null,
  body text not null, deleted boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.lc65_likes(kind text not null check (kind in ('p','c')), ref bigint not null, user_id uuid not null, primary key(kind,ref,user_id));
create table if not exists public.lc65_channels(slug text primary key, name text not null, descr text not null default '', admin_only boolean not null default false, sort int not null default 0);
insert into public.lc65_channels(slug,name,descr,admin_only,sort) values
 ('general','General Chat','Say hello and talk chess.',false,1),
 ('proofs','Proofs & Wins','Share a result or a win. Real numbers only.',false,2),
 ('questions','Ask a Coach','Ask a question about a position, a plan or a rule.',false,3),
 ('rivals','Find a Rival','Find a training partner near your rating.',false,4),
 ('announcements','Announcements','News from Kyenzo.',true,0) on conflict do nothing;
create table if not exists public.lc65_msgs(id bigserial primary key, channel text not null references public.lc65_channels(slug), user_id uuid not null, body text not null,
  poll jsonb, deleted boolean not null default false, created_at timestamptz not null default now());
create index if not exists lc65_msgs_ch on public.lc65_msgs(channel, created_at desc) where not deleted;
create table if not exists public.lc65_votes(msg_id bigint not null references public.lc65_msgs(id) on delete cascade, user_id uuid not null, opt int not null, primary key(msg_id,user_id));
create table if not exists public.lc65_dms(id bigserial primary key, from_id uuid not null, to_id uuid not null, body text not null, read boolean not null default false,
  deleted boolean not null default false, created_at timestamptz not null default now());
create index if not exists lc65_dms_pair on public.lc65_dms(from_id, to_id, created_at);
create table if not exists public.lc65_reports(id bigserial primary key, reporter uuid not null, kind text not null check (kind in ('msg','dm')), ref bigint not null, reason text not null,
  status text not null default 'pending' check (status in ('pending','valid','invalid')), verdict jsonb, created_at timestamptz not null default now(), unique(reporter,kind,ref));
create table if not exists public.lc65_guardian(user_id uuid primary key, valid int not null default 0);
create table if not exists public.lc65_bans(user_id uuid primary key, strikes int not null default 0, until timestamptz, permanent boolean not null default false);
create table if not exists public.lc65_notices(id bigserial primary key, user_id uuid not null, action text not null, seen boolean not null default false, created_at timestamptz not null default now());
do $$ declare t text; begin
  foreach t in array array['lc65_communities','lc65_members','lc65_posts','lc65_comments','lc65_likes','lc65_channels','lc65_msgs','lc65_votes','lc65_dms','lc65_reports','lc65_guardian','lc65_bans','lc65_notices'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop; end $$;

-- helpers (not callable by members)
create or replace function public._lc65_admin() returns boolean language plpgsql security definer set search_path = public as $$
begin perform public._lc_require_admin(); return true; exception when others then return false; end $$;
create or replace function public._lc65_touch(p_name text) returns void language plpgsql security definer set search_path = public as $$
declare n text := left(regexp_replace(btrim(coalesce(p_name,'')),'[<>&"'']','','g'),24);
begin
  if auth.uid() is null then return; end if;
  if n = '' then n := 'Member'; end if;
  insert into public.lc65_members(user_id,name) values (auth.uid(), n) on conflict (user_id) do update set name = excluded.name, updated_at = now();
end $$;
create or replace function public._lc65_pts(p_uid uuid, p_comm text default null) returns int language sql stable security definer set search_path = public as $$
  select (select count(*) from public.lc65_likes l join public.lc65_posts p on l.kind='p' and l.ref=p.id and p.user_id=p_uid and not p.deleted and (p_comm is null or p.community=p_comm))::int
       + (select count(*) from public.lc65_likes l join public.lc65_comments c on l.kind='c' and l.ref=c.id and c.user_id=p_uid and not c.deleted)::int $$;
create or replace function public._lc65_level(pts int) returns int language sql immutable as $$
  select 1 + (case when pts>=5 then 1 else 0 end)+(case when pts>=15 then 1 else 0 end)+(case when pts>=35 then 1 else 0 end)+(case when pts>=75 then 1 else 0 end)+(case when pts>=150 then 1 else 0 end)+(case when pts>=300 then 1 else 0 end) $$;
create or replace function public._lc65_next(pts int) returns int language sql immutable as $$
  select (select min(x) from unnest(array[5,15,35,75,150,300]) x where x>pts) $$;
create or replace function public._lc65_links(t text) returns int language sql immutable as $$ select coalesce(array_length(regexp_split_to_array(coalesce(t,''),'https?://'),1),1)-1 $$;
create or replace function public._lc65_ban(p_uid uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.lc65_bans;
begin
  select * into b from public.lc65_bans where user_id=p_uid;
  if found and (b.permanent or (b.until is not null and b.until > now())) then
    return jsonb_build_object('ok',false,'status',200,'reason','chat_banned','permanent',b.permanent,'until',b.until);
  end if;
  return null;
end $$;
revoke all on function public._lc65_admin(), public._lc65_touch(text), public._lc65_pts(uuid,text), public._lc65_ban(uuid) from public, anon, authenticated;

-- ---------- c39: posts, comments, likes ----------
create or replace function public.lc65_c39_list(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  return jsonb_build_object('ok',true,'status',200,'communities',(select coalesce(jsonb_agg(jsonb_build_object('code',code,'name',name,'partner',partner) order by (code='main') desc, name),'[]'::jsonb) from public.lc65_communities));
end $$;

create or replace function public.lc65_c39_feed(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); comm text := coalesce(nullif(p_a->>'community',''),'main'); cat text := coalesce(p_a->>'category',''); pg int := greatest(0,coalesce((p_a->>'page')::int,0)); rows jsonb; n int;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  perform public._lc65_touch(p_a->>'name');
  select count(*) into n from public.lc65_posts where community=comm and not deleted and (cat='' or category=cat);
  select coalesce(jsonb_agg(x order by (x->>'pinned')::boolean desc, (x->>'created')::bigint desc),'[]'::jsonb) into rows from (
    select jsonb_build_object('id',p.id,'name',coalesce(m.name,'Member'),'level',public._lc65_level(public._lc65_pts(p.user_id)),'created',(extract(epoch from p.created_at)*1000)::bigint,
      'category',p.category,'pinned',p.pinned,'title',p.title,'preview',left(p.body,220),
      'likes',(select count(*) from public.lc65_likes l where l.kind='p' and l.ref=p.id),'liked',exists(select 1 from public.lc65_likes l where l.kind='p' and l.ref=p.id and l.user_id=uid),
      'comments',(select count(*) from public.lc65_comments c where c.post_id=p.id and not c.deleted),'mine',p.user_id=uid) x
    from public.lc65_posts p left join public.lc65_members m on m.user_id=p.user_id
    where p.community=comm and not p.deleted and (cat='' or p.category=cat)
    order by p.pinned desc, p.created_at desc offset pg*20 limit 20) q;
  return jsonb_build_object('ok',true,'status',200,'posts',rows,'more',n > (pg+1)*20);
end $$;

create or replace function public.lc65_c39_post_get(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pid bigint := (p_a->>'id')::bigint; r public.lc65_posts; post jsonb; cm jsonb;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  select * into r from public.lc65_posts where id=pid and not deleted;
  if not found then return jsonb_build_object('ok',false,'status',200,'reason','not_found'); end if;
  post := jsonb_build_object('id',r.id,'name',coalesce((select name from public.lc65_members where user_id=r.user_id),'Member'),'level',public._lc65_level(public._lc65_pts(r.user_id)),
    'created',(extract(epoch from r.created_at)*1000)::bigint,'category',r.category,'pinned',r.pinned,'title',r.title,'body',r.body,
    'likes',(select count(*) from public.lc65_likes l where l.kind='p' and l.ref=r.id),'liked',exists(select 1 from public.lc65_likes l where l.kind='p' and l.ref=r.id and l.user_id=uid),'mine',r.user_id=uid);
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',coalesce(m.name,'Member'),'level',public._lc65_level(public._lc65_pts(c.user_id)),'created',(extract(epoch from c.created_at)*1000)::bigint,
    'body',c.body,'likes',(select count(*) from public.lc65_likes l where l.kind='c' and l.ref=c.id),'liked',exists(select 1 from public.lc65_likes l where l.kind='c' and l.ref=c.id and l.user_id=uid),'mine',c.user_id=uid) order by c.created_at),'[]'::jsonb)
    into cm from public.lc65_comments c left join public.lc65_members m on m.user_id=c.user_id where c.post_id=r.id and not c.deleted;
  return jsonb_build_object('ok',true,'status',200,'post',post,'comments',cm);
end $$;

create or replace function public.lc65_c39_post(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); t text := btrim(coalesce(p_a->>'title','')); b text := btrim(coalesce(p_a->>'body','')); cat text := coalesce(nullif(p_a->>'category',''),'general'); comm text := coalesce(nullif(p_a->>'community',''),'main'); n int; bn jsonb; id bigint;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  bn := public._lc65_ban(uid); if bn is not null then return bn; end if;
  if t='' or b='' or length(t)>120 or length(b)>4000 then return jsonb_build_object('ok',false,'status',200,'reason','bad_input'); end if;
  if cat not in ('general','wins','questions','games','announcements') then cat:='general'; end if;
  if cat='announcements' and not public._lc65_admin() then return jsonb_build_object('ok',false,'status',200,'reason','forbidden'); end if;
  if public._lc65_links(t||' '||b) > 3 then return jsonb_build_object('ok',false,'status',200,'reason','too_many_links'); end if;
  if not exists(select 1 from public.lc65_communities where code=comm) then comm:='main'; end if;
  select count(*) into n from public.lc65_posts where user_id=uid and created_at > now()-interval '1 day'; if n>=20 then return jsonb_build_object('ok',false,'status',200,'reason','slow_down'); end if;
  perform public._lc65_touch(p_a->>'name');
  insert into public.lc65_posts(community,category,user_id,title,body) values (comm,cat,uid,t,b) returning lc65_posts.id into id;
  return jsonb_build_object('ok',true,'status',200,'id',id);
end $$;

create or replace function public.lc65_c39_comment(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); b text := btrim(coalesce(p_a->>'body','')); pid bigint := (p_a->>'post')::bigint; n int; bn jsonb;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  bn := public._lc65_ban(uid); if bn is not null then return bn; end if;
  if b='' or length(b)>1500 then return jsonb_build_object('ok',false,'status',200,'reason','bad_input'); end if;
  if not exists(select 1 from public.lc65_posts where id=pid and not deleted) then return jsonb_build_object('ok',false,'status',200,'reason','not_found'); end if;
  if public._lc65_links(b) > 3 then return jsonb_build_object('ok',false,'status',200,'reason','too_many_links'); end if;
  select count(*) into n from public.lc65_comments where user_id=uid and created_at > now()-interval '1 day'; if n>=60 then return jsonb_build_object('ok',false,'status',200,'reason','slow_down'); end if;
  perform public._lc65_touch(p_a->>'name');
  insert into public.lc65_comments(post_id,user_id,body) values (pid,uid,b);
  return jsonb_build_object('ok',true,'status',200);
end $$;

create or replace function public.lc65_c39_like(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); k text := case when p_a->>'kind'='c' then 'c' else 'p' end; r bigint := (p_a->>'ref')::bigint; owner uuid; liked boolean;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  if k='p' then select user_id into owner from public.lc65_posts where id=r and not deleted; else select user_id into owner from public.lc65_comments where id=r and not deleted; end if;
  if owner is null then return jsonb_build_object('ok',false,'status',200,'reason','not_found'); end if;
  if owner = uid then return jsonb_build_object('ok',false,'status',200,'reason','forbidden'); end if;
  if exists(select 1 from public.lc65_likes where kind=k and ref=r and user_id=uid) then delete from public.lc65_likes where kind=k and ref=r and user_id=uid; liked:=false;
  else insert into public.lc65_likes values (k,r,uid); liked:=true; end if;
  return jsonb_build_object('ok',true,'status',200,'liked',liked,'likes',(select count(*) from public.lc65_likes where kind=k and ref=r));
end $$;

create or replace function public.lc65_c39_pin(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public._lc65_admin() then return jsonb_build_object('ok',false,'status',200,'reason','forbidden'); end if;
  update public.lc65_posts set pinned = coalesce((p_a->>'pinned')::boolean,false) where id=(p_a->>'id')::bigint;
  return jsonb_build_object('ok',true,'status',200);
end $$;

create or replace function public.lc65_c39_delete(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p_id bigint := (p_a->>'id')::bigint; adm boolean := public._lc65_admin(); n int;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  if p_a->>'kind'='c' then update public.lc65_comments set deleted=true where lc65_comments.id=p_id and (user_id=uid or adm);
  else update public.lc65_posts set deleted=true where lc65_posts.id=p_id and (user_id=uid or adm); end if;
  get diagnostics n = row_count;
  if n=0 then return jsonb_build_object('ok',false,'status',200,'reason','forbidden'); end if;
  return jsonb_build_object('ok',true,'status',200);
end $$;

create or replace function public.lc65_c39_board(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); comm text := coalesce(nullif(p_a->>'community',''),'main'); mp int;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  mp := public._lc65_pts(uid);
  return jsonb_build_object('ok',true,'status',200,'me',jsonb_build_object('level',public._lc65_level(mp),'pts',mp,'next',public._lc65_next(mp)),
    'board',(select coalesce(jsonb_agg(jsonb_build_object('name',name,'level',public._lc65_level(pts),'pts',pts) order by pts desc),'[]'::jsonb) from (
       select m.name, public._lc65_pts(m.user_id) pts from public.lc65_members m where exists(select 1 from public.lc65_posts p where p.user_id=m.user_id and p.community=comm) or exists(select 1 from public.lc65_comments c where c.user_id=m.user_id)) q where pts>0 limit 20));
end $$;

-- ---------- c46: channels, polls, messages, reports ----------
create or replace function public.lc65_c46_me(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); nt jsonb; g int;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('action',action)),'[]'::jsonb) into nt from public.lc65_notices where user_id=uid and not seen;
  update public.lc65_notices set seen=true where user_id=uid and not seen;
  select valid into g from public.lc65_guardian where user_id=uid;
  return jsonb_build_object('ok',true,'status',200,'notices',nt,'guardian',case when coalesce(g,0)>=5 then jsonb_build_object('title',true) else null end);
end $$;

create or replace function public.lc65_c46_channels(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  return jsonb_build_object('ok',true,'status',200,'channels',(select jsonb_agg(jsonb_build_object('slug',slug,'name',name,'descr',descr,'admin_only',admin_only) order by sort) from public.lc65_channels));
end $$;

create or replace function public.lc65_c46_msgs(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ch text := p_a->>'channel';
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  if not exists(select 1 from public.lc65_channels where slug=ch) then return jsonb_build_object('ok',false,'status',200,'reason','not_found'); end if;
  return jsonb_build_object('ok',true,'status',200,'msgs',(select coalesce(jsonb_agg(x order by (x->>'id')::bigint desc),'[]'::jsonb) from (
    select jsonb_build_object('id',g.id,'name',coalesce(m.name,'Member'),'t',to_char(g.created_at at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'body',g.body,'author',g.user_id,'mine',g.user_id=uid,
      'poll',case when g.poll is null then null else jsonb_build_object('options',g.poll->'options',
        'counts',(select coalesce(jsonb_agg((select count(*) from public.lc65_votes v where v.msg_id=g.id and v.opt=o.i-1) order by o.i),'[]'::jsonb) from generate_series(1,jsonb_array_length(g.poll->'options')) o(i)),
        'my',(select opt from public.lc65_votes v where v.msg_id=g.id and v.user_id=uid)) end) x
    from public.lc65_msgs g left join public.lc65_members m on m.user_id=g.user_id where g.channel=ch and not g.deleted order by g.id desc limit 50) q));
end $$;

create or replace function public.lc65_c46_post(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ch text := p_a->>'channel'; b text := btrim(coalesce(p_a->>'body','')); ao boolean; opts jsonb; n int; bn jsonb;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  bn := public._lc65_ban(uid); if bn is not null then return bn; end if;
  select admin_only into ao from public.lc65_channels where slug=ch;
  if ao is null then return jsonb_build_object('ok',false,'status',200,'reason','not_found'); end if;
  if ao and not public._lc65_admin() then return jsonb_build_object('ok',false,'status',200,'reason','forbidden'); end if;
  if b='' or length(b)>500 then return jsonb_build_object('ok',false,'status',200,'reason','bad_input'); end if;
  if public._lc65_links(b)>3 then return jsonb_build_object('ok',false,'status',200,'reason','too_many_links'); end if;
  select count(*) into n from public.lc65_msgs where user_id=uid and created_at>now()-interval '1 hour'; if n>=30 then return jsonb_build_object('ok',false,'status',200,'reason','slow_down'); end if;
  if p_a ? 'poll' then
    select coalesce(jsonb_agg(left(btrim(x),60)),'[]'::jsonb) into opts from jsonb_array_elements_text(p_a->'poll'->'options') x where btrim(x)<>'';
    if jsonb_array_length(opts)<2 or jsonb_array_length(opts)>4 then return jsonb_build_object('ok',false,'status',200,'reason','bad_input'); end if;
  end if;
  perform public._lc65_touch(p_a->>'name');
  insert into public.lc65_msgs(channel,user_id,body,poll) values (ch,uid,b,case when opts is null then null else jsonb_build_object('options',opts) end);
  return jsonb_build_object('ok',true,'status',200);
end $$;

create or replace function public.lc65_c46_vote(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); mid bigint := (p_a->>'id')::bigint; o int := (p_a->>'opt')::int; cnt int;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  select jsonb_array_length(poll->'options') into cnt from public.lc65_msgs where id=mid and not deleted and poll is not null;
  if cnt is null or o<0 or o>=cnt then return jsonb_build_object('ok',false,'status',200,'reason','bad_input'); end if;
  insert into public.lc65_votes values (mid,uid,o) on conflict (msg_id,user_id) do update set opt=excluded.opt;
  return jsonb_build_object('ok',true,'status',200);
end $$;

create or replace function public.lc65_c46_dm_threads(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  return jsonb_build_object('ok',true,'status',200,'threads',(select coalesce(jsonb_agg(jsonb_build_object('with',peer,'name',coalesce(m.name,'Member'),'unread',unread,'last',left(lastb,60)) order by lastt desc),'[]'::jsonb) from (
    select case when d.from_id=uid then d.to_id else d.from_id end peer, max(d.created_at) lastt,
      (array_agg(d.body order by d.created_at desc))[1] lastb, count(*) filter (where d.to_id=uid and not d.read) unread
    from public.lc65_dms d where (d.from_id=uid or d.to_id=uid) and not d.deleted group by 1) t left join public.lc65_members m on m.user_id=t.peer));
end $$;

create or replace function public.lc65_c46_dm_get(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); peer uuid;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  begin peer := (p_a->>'with')::uuid; exception when others then return jsonb_build_object('ok',false,'status',200,'reason','bad_input'); end;
  update public.lc65_dms set read=true where to_id=uid and from_id=peer and not read;
  return jsonb_build_object('ok',true,'status',200,'name',coalesce((select name from public.lc65_members where user_id=peer),'Member'),
    'msgs',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'mine',from_id=uid,'body',body,'t',to_char(created_at at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"')) order by id),'[]'::jsonb)
      from (select * from public.lc65_dms where ((from_id=uid and to_id=peer) or (from_id=peer and to_id=uid)) and not deleted order by id desc limit 100) z));
end $$;

create or replace function public.lc65_c46_dm_send(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); peer uuid; b text := btrim(coalesce(p_a->>'body','')); n int; bn jsonb;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  bn := public._lc65_ban(uid); if bn is not null then return bn; end if;
  begin peer := (p_a->>'to')::uuid; exception when others then return jsonb_build_object('ok',false,'status',200,'reason','bad_input'); end;
  if peer=uid or b='' or length(b)>500 or not exists(select 1 from public.lc65_members where user_id=peer) then return jsonb_build_object('ok',false,'status',200,'reason','bad_input'); end if;
  if public._lc65_links(b)>3 then return jsonb_build_object('ok',false,'status',200,'reason','too_many_links'); end if;
  select count(*) into n from public.lc65_dms where from_id=uid and created_at>now()-interval '1 hour'; if n>=60 then return jsonb_build_object('ok',false,'status',200,'reason','slow_down'); end if;
  perform public._lc65_touch(p_a->>'name');
  insert into public.lc65_dms(from_id,to_id,body) values (uid,peer,b);
  return jsonb_build_object('ok',true,'status',200);
end $$;

-- a report is stored; the Edge Function community-check judges it (rule break + chess claims) and calls lc65_report_resolve
create or replace function public.lc65_c46_report(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); k text := p_a->>'kind'; p_ref bigint := (p_a->>'id')::bigint; why text := left(coalesce(p_a->>'reason','other'),30); rid bigint; n int; owner uuid;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  if k not in ('msg','dm') then return jsonb_build_object('ok',false,'status',200,'reason','bad_input'); end if;
  if k='msg' then select user_id into owner from public.lc65_msgs where id=p_ref and not deleted;
  else select from_id into owner from public.lc65_dms where id=p_ref and to_id=uid and not deleted; end if;
  if owner is null then return jsonb_build_object('ok',false,'status',200,'reason','not_found'); end if;
  if owner=uid then return jsonb_build_object('ok',false,'status',200,'reason','bad_input'); end if;
  if exists(select 1 from public.lc65_reports r where r.reporter=uid and r.kind=k and r.ref=p_ref) then return jsonb_build_object('ok',true,'status','already_reported'); end if;
  select count(*) into n from public.lc65_reports r where r.reporter=uid and r.status='invalid' and r.created_at>now()-interval '1 day';
  if n>=3 then return jsonb_build_object('ok',false,'status',200,'reason','report_limited'); end if;
  insert into public.lc65_reports(reporter,kind,ref,reason) values (uid,k,p_ref,why) returning id into rid;
  return jsonb_build_object('ok',true,'rid',rid,'status','pending');
end $$;

-- internal: decide a report. valid = the message is removed, the author gets a strike, the reporter counts toward Guardian of the Community
create or replace function public._lc65_resolve(p_rid bigint, p_valid boolean, p_verdict jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.lc65_reports; owner uuid; b public.lc65_bans; v int; em text; ts text := 'none'; w jsonb;
begin
  select * into r from public.lc65_reports where id=p_rid and status='pending' for update;
  if not found then return jsonb_build_object('ok',false,'reason','not_found'); end if;
  update public.lc65_reports set status=case when p_valid then 'valid' else 'invalid' end, verdict=p_verdict where id=p_rid;
  if not p_valid then return jsonb_build_object('ok',true,'status','invalid'); end if;
  if r.kind='msg' then update public.lc65_msgs set deleted=true where id=r.ref returning user_id into owner;
  else update public.lc65_dms set deleted=true where id=r.ref returning from_id into owner; end if;
  if owner is not null then
    insert into public.lc65_bans(user_id,strikes) values (owner,1) on conflict (user_id) do update set strikes=public.lc65_bans.strikes+1 returning * into b;
    if b.strikes=1 then insert into public.lc65_notices(user_id,action) values (owner,'warning');
    elsif b.strikes=2 then update public.lc65_bans set until=now()+interval '1 day' where user_id=owner; insert into public.lc65_notices(user_id,action) values (owner,'pause');
    else update public.lc65_bans set permanent=true where user_id=owner; insert into public.lc65_notices(user_id,action) values (owner,'permanent'); end if;
  end if;
  insert into public.lc65_guardian(user_id,valid) values (r.reporter,1) on conflict (user_id) do update set valid=public.lc65_guardian.valid+1 returning valid into v;
  if v=5 then
    begin
      select email into em from auth.users where id=r.reporter;
      execute 'insert into public.lc36_token_credits(email,tokens,pack,cents,session_id) values ($1,1,''guardian'',0,$2)' using em,'guardian:'||r.reporter::text;
      ts:='done';
    exception when unique_violation then ts:='done'; when others then ts:='failed'; end;
  end if;
  w := jsonb_build_object('xp',20,'tokens',case when v=5 and ts='done' then 1 else 0 end,'valid',least(v,5),'guardian',v>=5,'title',v=5);
  return jsonb_build_object('ok',true,'status','valid','reward',w);
end $$;
revoke all on function public._lc65_resolve(bigint,boolean,jsonb) from public, anon, authenticated;

-- service-role only: used by the Edge Function community-check
create or replace function public.lc65_report_get(p_rid bigint) returns jsonb language plpgsql security definer set search_path = public as $$
declare role text := coalesce(current_setting('request.jwt.claim.role',true), nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role'); r public.lc65_reports; body text;
begin
  if coalesce(role,'')<>'service_role' then return jsonb_build_object('ok',false,'reason','forbidden'); end if;
  select * into r from public.lc65_reports where id=p_rid and status='pending';
  if not found then return jsonb_build_object('ok',false,'reason','not_found'); end if;
  if r.kind='msg' then select m.body into body from public.lc65_msgs m where m.id=r.ref; else select d.body into body from public.lc65_dms d where d.id=r.ref; end if;
  return jsonb_build_object('ok',true,'reporter',r.reporter,'reason',r.reason,'body',coalesce(body,''));
end $$;
create or replace function public.lc65_report_resolve(p_rid bigint, p_valid boolean, p_verdict jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare role text := coalesce(current_setting('request.jwt.claim.role',true), nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role');
begin
  if coalesce(role,'')<>'service_role' then return jsonb_build_object('ok',false,'reason','forbidden'); end if;
  return public._lc65_resolve(p_rid,p_valid,p_verdict);
end $$;

-- owner: reports the AI check could not decide (or the function is not deployed)
create or replace function public.lc65_admin_reports() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok',true,'rows',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'kind',r.kind,'reason',r.reason,'created',r.created_at,
    'body',coalesce((select m.body from public.lc65_msgs m where r.kind='msg' and m.id=r.ref),(select d.body from public.lc65_dms d where r.kind='dm' and d.id=r.ref),'')) order by r.id)
    from public.lc65_reports r where r.status='pending'),'[]'::jsonb));
end $$;
create or replace function public.lc65_admin_resolve(p_rid bigint, p_valid boolean) returns jsonb language plpgsql security definer set search_path = public as $$
begin perform public._lc_require_admin(); return public._lc65_resolve(p_rid,p_valid,jsonb_build_object('by','owner')); end $$;

grant execute on function public.lc65_c39_list(jsonb), public.lc65_c39_feed(jsonb), public.lc65_c39_post_get(jsonb), public.lc65_c39_post(jsonb), public.lc65_c39_comment(jsonb),
  public.lc65_c39_like(jsonb), public.lc65_c39_pin(jsonb), public.lc65_c39_delete(jsonb), public.lc65_c39_board(jsonb),
  public.lc65_c46_me(jsonb), public.lc65_c46_channels(jsonb), public.lc65_c46_msgs(jsonb), public.lc65_c46_post(jsonb), public.lc65_c46_vote(jsonb),
  public.lc65_c46_dm_threads(jsonb), public.lc65_c46_dm_get(jsonb), public.lc65_c46_dm_send(jsonb), public.lc65_c46_report(jsonb),
  public.lc65_admin_reports(), public.lc65_admin_resolve(bigint,boolean) to authenticated;
grant execute on function public.lc65_report_get(bigint), public.lc65_report_resolve(bigint,boolean,jsonb) to service_role;
