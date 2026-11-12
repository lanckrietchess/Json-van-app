-- LC76 (build 9.38.1): "Congrats! You are on Pro" for the person who received a Gift a Friend, and the thank-you back to the giver. Idempotent.
-- The gift licence itself is made by the stripe webhook (giftPaid, source 'gift', flags {from, from_name, note}); the app already claims it at sign-in.
create table if not exists public.lc76_gift_seen (email text not null, gkey text not null, seen_at timestamptz not null default now(), primary key (email, gkey));
create table if not exists public.lc76_thanks (id bigserial primary key, gkey text not null, from_email text not null, to_email text not null, name text not null default 'Your friend',
  body text not null check (char_length(body) between 1 and 600), seen boolean not null default false, created_at timestamptz not null default now(), unique (gkey, from_email));
alter table public.lc76_gift_seen enable row level security; alter table public.lc76_thanks enable row level security;
revoke all on public.lc76_gift_seen, public.lc76_thanks from anon, authenticated;

-- the newest active gift for the signed-in e-mail: {gkey, from_name, note, until, seen, can_thank}
create or replace function public._lc76_gift(p_email text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r record;
begin
  execute $q$select coalesce(nullif(license_key,''), coalesce(flags->>'session','')) gkey, coalesce(flags,'{}'::jsonb) fl, expires_at
    from public.licenses where lower(email) = $1 and (coalesce(source,'') = 'gift' or coalesce(flags->>'source','') = 'gift')
      and coalesce(revoked,false) = false and expires_at > now() order by expires_at desc limit 1$q$ into r using p_email;
  if r.gkey is null or r.gkey = '' then return null; end if;
  return jsonb_build_object('gkey',r.gkey,'from_name',coalesce(nullif(left(regexp_replace(r.fl->>'from_name','[<>]','','g'),40),''),''),
    'note',left(regexp_replace(coalesce(r.fl->>'note',''),'[<>]','','g'),300),'until',r.expires_at,'can_thank',coalesce(r.fl->>'from','') ~ '@',
    'seen',exists(select 1 from public.lc76_gift_seen where email = p_email and gkey = r.gkey),'thanked',exists(select 1 from public.lc76_thanks where gkey = r.gkey and from_email = p_email));
exception when others then return null;
end $$;
create or replace function public.lc76_gift_check() returns jsonb language plpgsql security definer set search_path = public as $$
declare v_email text := public._lc72_email(); g jsonb;
begin
  if v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  g := public._lc76_gift(v_email);
  return jsonb_build_object('ok',true,'gift',g,
    'thanks',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'body',body,'at',created_at) order by id),'[]'::jsonb) from public.lc76_thanks where to_email = v_email and not seen));
end $$;
create or replace function public.lc76_gift_seen_set(p_key text) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_email text := public._lc72_email();
begin
  if v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  insert into public.lc76_gift_seen(email,gkey) values (v_email,left(coalesce(p_key,''),120)) on conflict do nothing;
  return jsonb_build_object('ok',true);
end $$;
-- the receiver thanks the giver once per gift; the giver sees it the next time they open the app
create or replace function public.lc76_gift_thanks(p_key text, p_body text, p_name text) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_email text := public._lc72_email(); g jsonb; giver text; b text := public._lc72_clean(p_body,600);
begin
  if v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  if b = '' then return jsonb_build_object('ok',false,'error','empty'); end if;
  g := public._lc76_gift(v_email);
  if g is null or g->>'gkey' <> coalesce(p_key,'') then return jsonb_build_object('ok',false,'error','no_gift'); end if;
  begin execute 'select lower(flags->>''from'') from public.licenses where lower(email) = $1 and (coalesce(license_key,'''') = $2 or coalesce(flags->>''session'','''') = $2) limit 1' into giver using v_email, p_key;
  exception when others then giver := null; end;
  if coalesce(giver,'') !~ '@' then return jsonb_build_object('ok',false,'error','no_giver'); end if;
  insert into public.lc76_thanks(gkey,from_email,to_email,name,body) values (p_key, v_email, giver, coalesce(nullif(public._lc72_clean(p_name,40),''),'Your friend'), b)
  on conflict (gkey, from_email) do update set body = excluded.body, name = excluded.name, seen = false, created_at = now();
  insert into public.lc76_gift_seen(email,gkey) values (v_email,p_key) on conflict do nothing;
  return jsonb_build_object('ok',true);
end $$;
create or replace function public.lc76_thanks_seen(p_ids bigint[]) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update public.lc76_thanks set seen = true where id = any(coalesce(p_ids,'{}')) and to_email = public._lc72_email();
  return jsonb_build_object('ok',true);
end $$;
do $$ declare r record; begin
  for r in select p.oid::regprocedure sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname ~ '^_?lc76_' loop
    execute 'revoke all on function ' || r.sig || ' from public, anon, authenticated';
    if r.proname !~ '^_' then execute 'grant execute on function ' || r.sig || ' to authenticated'; end if;
  end loop;
end $$;
