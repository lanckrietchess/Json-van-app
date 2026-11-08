-- LC61 + LC62 (build 9.33.0). Idempotent. Run in the Supabase SQL editor AFTER the LC36 and LC59 migrations.
-- 1. profiles: the member's chess names, so a new device / a reset never asks to connect again
create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  chess_username text, lichess_username text, updated_at timestamptz default now());
alter table public.profiles add column if not exists chess_username text;
alter table public.profiles add column if not exists lichess_username text;
alter table public.profiles add column if not exists updated_at timestamptz default now();
alter table public.profiles enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='lc61_profiles_select_own') then
    create policy lc61_profiles_select_own on public.profiles for select to authenticated using (id = auth.uid()); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='lc61_profiles_insert_own') then
    create policy lc61_profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid()); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='lc61_profiles_update_own') then
    create policy lc61_profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid()); end if;
end $$;

-- 2. LC61: crowdsourced "what should have warned me" queue
create table if not exists public.lc61_warnings(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, first_name text, fen text, san text, letter text, alarm text,
  body text not null, status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now());
alter table public.lc61_warnings enable row level security;
revoke all on public.lc61_warnings from anon, authenticated;

create or replace function public.lc61_warn_submit(p_fen text, p_san text, p_letter text, p_alarm text, p_text text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); t text := btrim(coalesce(p_text,'')); n int;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','auth'); end if;
  if length(t) < 12 or length(t) > 280 then return jsonb_build_object('ok',false,'error','text'); end if;
  select count(*) into n from public.lc61_warnings where user_id=uid and created_at > now() - interval '1 day';
  if n >= 10 then return jsonb_build_object('ok',false,'error','rate'); end if;
  insert into public.lc61_warnings(user_id,fen,san,letter,alarm,body)
  values (uid, left(coalesce(p_fen,''),120), left(coalesce(p_san,''),20), left(coalesce(p_letter,''),2), left(coalesce(p_alarm,''),30), t);
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.lc61_admin_queue()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok',true,'rows',coalesce((select jsonb_agg(jsonb_build_object('id',id,'first_name',first_name,'fen',fen,'san',san,'letter',letter,'alarm',alarm,'text',body) order by created_at)
    from public.lc61_warnings where status='pending'),'[]'::jsonb));
end $$;

create or replace function public.lc61_admin_set(p_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  if p_status not in ('approved','rejected') then return jsonb_build_object('ok',false,'error','status'); end if;
  update public.lc61_warnings set status=p_status where id=p_id;
  return jsonb_build_object('ok',true);
end $$;

-- 3. LC62: Hero's Journey
create table if not exists public.lc62_journeys(
  user_id uuid primary key, first_name text, ch1 text, ch2 text, ch3 text, ch4 text, story text not null,
  module text, start_elo int, peak_elo int, verified boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  token_status text not null default 'none', submitted_at timestamptz not null default now(), decided_at timestamptz);
alter table public.lc62_journeys enable row level security;
revoke all on public.lc62_journeys from anon, authenticated;
create table if not exists public.lc62_elite(user_id uuid primary key, since timestamptz not null default now());
alter table public.lc62_elite enable row level security;
revoke all on public.lc62_elite from anon, authenticated;

-- the server's own start / peak, read from the LC59 link row when it exists (column names differ between installs, so it is read as json)
create or replace function public._lc62_ratings(p_uid uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare j jsonb; s int; p int;
begin
  begin
    execute 'select to_jsonb(l) from public.lc59_links l where l.user_id = $1 limit 1' into j using p_uid;
  exception when others then j := null; end;
  if j is null then return null; end if;
  s := nullif(coalesce(j->>'start_rating', j->>'start', j->>'start_elo'),'')::int;
  p := nullif(coalesce(j->>'peak_rating', j->>'peak', j->>'peak_elo'),'')::int;
  if s is null or p is null then return null; end if;
  return jsonb_build_object('start',s,'peak',p);
end $$;
revoke all on function public._lc62_ratings(uuid) from anon, authenticated;

create or replace function public.lc62_journey_mine()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.lc62_journeys; r2 jsonb;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','auth'); end if;
  select * into r from public.lc62_journeys where user_id=uid;
  r2 := public._lc62_ratings(uid);
  return jsonb_build_object('ok',true,'status',r.status,'elite',exists(select 1 from public.lc62_elite where user_id=uid),
    'start',r2->'start','peak',r2->'peak');
end $$;

create or replace function public.lc62_journey_submit(p_first text, p_ch jsonb, p_story text, p_module text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); st text := btrim(coalesce(p_story,'')); rr jsonb; s int; p int; ok boolean;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','auth'); end if;
  if length(st) < 80 or length(st) > 2500 then return jsonb_build_object('ok',false,'error','story'); end if;
  rr := public._lc62_ratings(uid);
  if rr is null then return jsonb_build_object('ok',false,'error','no_verified_rating'); end if;
  s := (rr->>'start')::int; p := (rr->>'peak')::int;
  if p - s < 150 then return jsonb_build_object('ok',false,'error','not_yet'); end if;
  insert into public.lc62_journeys(user_id,first_name,ch1,ch2,ch3,ch4,story,module,start_elo,peak_elo,verified,status,submitted_at)
  values (uid, left(btrim(coalesce(p_first,'')),30), left(coalesce(p_ch->>'1',''),600), left(coalesce(p_ch->>'2',''),600), left(coalesce(p_ch->>'3',''),600), left(coalesce(p_ch->>'4',''),600),
    st, left(coalesce(p_module,''),30), s, p, true, 'pending', now())
  on conflict (user_id) do update set first_name=excluded.first_name, ch1=excluded.ch1, ch2=excluded.ch2, ch3=excluded.ch3, ch4=excluded.ch4,
    story=excluded.story, module=excluded.module, start_elo=excluded.start_elo, peak_elo=excluded.peak_elo, verified=true,
    status = case when public.lc62_journeys.status='approved' then 'approved' else 'pending' end, submitted_at=now();
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.lc62_admin_queue()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok',true,'rows',coalesce((select jsonb_agg(to_jsonb(j) - 'user_id' || jsonb_build_object('user_id',j.user_id) order by j.submitted_at)
    from public.lc62_journeys j where j.status='pending'),'[]'::jsonb));
end $$;

-- approve: 5 bonus tokens (once), the Elite Student badge, publication on the landing page. The token credit is a row in lc36_token_credits
-- (pack 'hero', 0 cents). If that table has other column names in your install, the credit fails SAFELY: token_status becomes 'failed' and you see it in the queue.
create or replace function public.lc62_admin_set(p_user uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.lc62_journeys; em text; ts text := 'none';
begin
  perform public._lc_require_admin();
  if p_status not in ('approved','rejected') then return jsonb_build_object('ok',false,'error','status'); end if;
  select * into r from public.lc62_journeys where user_id=p_user;
  if not found then return jsonb_build_object('ok',false,'error','missing'); end if;
  if p_status='rejected' then
    update public.lc62_journeys set status='rejected', decided_at=now() where user_id=p_user;
    return jsonb_build_object('ok',true);
  end if;
  update public.lc62_journeys set status='approved', decided_at=now() where user_id=p_user;
  insert into public.lc62_elite(user_id) values (p_user) on conflict do nothing;
  if r.token_status <> 'done' then
    begin
      select email into em from auth.users where id=p_user;
      execute 'insert into public.lc36_token_credits(email,tokens,pack,cents,session_id) values ($1,5,''hero'',0,$2)' using em, 'hero:'||p_user::text;
      ts := 'done';
    exception when unique_violation then ts := 'done'; when others then ts := 'failed'; end;
    update public.lc62_journeys set token_status=ts where user_id=p_user;
  end if;
  return jsonb_build_object('ok',true,'token_status',ts);
end $$;

-- public: approved journeys only, first name + story + ratings (never e-mail or id)
create or replace function public.lc62_public()
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object('ok',true,'rows',coalesce(jsonb_agg(jsonb_build_object('first_name',first_name,'story',story,'start',start_elo,'peak',peak_elo,'gain',peak_elo-start_elo) order by (peak_elo-start_elo) desc),'[]'::jsonb))
  from public.lc62_journeys where status='approved';
$$;

grant execute on function public.lc61_warn_submit(text,text,text,text,text) to authenticated;
grant execute on function public.lc61_admin_queue() to authenticated;
grant execute on function public.lc61_admin_set(uuid,text) to authenticated;
grant execute on function public.lc62_journey_mine() to authenticated;
grant execute on function public.lc62_journey_submit(text,jsonb,text,text) to authenticated;
grant execute on function public.lc62_admin_queue() to authenticated;
grant execute on function public.lc62_admin_set(uuid,text) to authenticated;
grant execute on function public.lc62_public() to anon, authenticated;
