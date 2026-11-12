-- LC75 (build 9.38.0): the 9-level Funnel Command Center, daily views per channel, more standard short links, text lessons and the public
-- course outline for the library. Idempotent. Run AFTER sql/20261113100000_lc72_lc73_launch_funnels.sql.

-- ============ KPI targets (absolute, percentage or "at most") ============
create table if not exists public.lc75_kpis (stage text primary key, target numeric not null check (target >= 0), kind text not null check (kind in ('pct','abs','max')), label text not null default '');
insert into public.lc75_kpis(stage,target,kind,label) values
 ('l1_views_day',6000,'abs','Views per day'),('l2_ctr',1,'pct','Clicks per view (CTR)'),('l3_click_visit',60,'pct','Clicks that reach the landing page'),
 ('l4_visit_signup',20,'pct','Visitors who register'),('l5_signup_card',10,'pct','Registrations with a card or a lead magnet'),('l6_card_paid',30,'pct','Card holders who pay'),
 ('l6_app_conv',1,'pct','Registrations that pay (whole app)'),('l6_sales_month',18,'abs','Sales per 30 days'),('l7_churn',10,'max','Subscription churn (lower is better)'),
 ('l7_repeat',20,'pct','Buyers who buy again'),('l8_upsell',10,'pct','Customers who took an upsell'),('l9_referrers',5,'pct','Members who referred someone'),('l9_buyer_buyer',2,'pct','Buyers who brought a buyer')
on conflict (stage) do nothing;
alter table public.lc75_kpis enable row level security; revoke all on public.lc75_kpis from anon, authenticated;
create or replace function public.lc75_kpi_set(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare k text;
begin perform public._lc_require_admin();
  for k in select jsonb_object_keys(p) loop
    update public.lc75_kpis set target = greatest(0, least(1000000, (p->>k)::numeric)) where stage = k;
  end loop;
  return jsonb_build_object('ok',true);
exception when invalid_text_representation then return jsonb_build_object('ok',false,'error','value');
end $$;

-- more standard short links (owner can add any other in the dashboard)
insert into public.lc73_links(code,platform,label,dest) values ('ytp','youtube','YouTube pinned comment','/'),('yts','youtube','YouTube Shorts description','/'),('tkc','tiktok','TikTok comment','/'),
  ('igs','instagram','Instagram story','/'),('rp','reddit','Reddit post','/'),('xp','x','X post','/') on conflict do nothing;

-- ============ daily views per channel (typed in, or later by an API job with the service role) ============
create or replace function public.lc75_views_day(p_day date, p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare adm boolean := public._lc72_admin(); pe text := public._lc72_email(); k text; n int := 0;
begin
  if not adm and not exists(select 1 from public.lc73_partners where email = pe) then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  if p_day is null or p_day > current_date + 1 or p_day < date '2024-01-01' then return jsonb_build_object('ok',false,'error','day'); end if;
  for k in select jsonb_object_keys(p) loop
    if k !~ '^[a-z0-9_-]{1,30}$' or coalesce(p->>k,'') = '' then continue; end if;
    delete from public.lc73_views where channel = k and period_start = p_day and period_end = p_day and partner_email = case when adm then '' else pe end;
    insert into public.lc73_views(channel,period_start,period_end,views,note,partner_email) values (k,p_day,p_day,greatest(0,(p->>k)::bigint),'day',case when adm then '' else pe end);
    n := n + 1;
  end loop;
  return jsonb_build_object('ok',true,'saved',n);
exception when invalid_text_representation or numeric_value_out_of_range then return jsonb_build_object('ok',false,'error','value');
end $$;

-- ============ the channel of a code / utm_source ============
create or replace function public._lc75_chan(p_code text, p_utm text) returns text language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(platform,'') from public.lc73_links where code = lower(coalesce(p_code,''))),
    case lower(coalesce(nullif(p_utm,''),'')) when '' then 'direct' when 'ig' then 'instagram' when 'insta' then 'instagram' when 'tt' then 'tiktok' when 'yt' then 'youtube'
      when 'fb' then 'facebook' when 'twitter' then 'x' when 'reddit.com' then 'reddit' else left(lower(p_utm),30) end) $$;

-- ============ the 9-level funnel ============
create or replace function public.lc75_funnel(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare adm boolean := public._lc72_admin(); codes text[] := public._lc73_partner_codes(); allt boolean := coalesce((p->>'all')::boolean,false);
  f timestamptz; t timestamptz; days numeric; chans text[]; c text; out jsonb := '{}'::jsonb; kp jsonb; r jsonb; life jsonb;
begin
  if not adm and codes = array['__none__'] then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  f := case when allt then '-infinity'::timestamptz else coalesce(nullif(p->>'from','')::date, current_date - 29)::timestamptz end;
  t := case when allt then 'infinity'::timestamptz else (coalesce(nullif(p->>'to','')::date, current_date) + 1)::timestamptz end;
  drop table if exists pg_temp.l75_people; drop table if exists pg_temp.l75_pay; drop table if exists pg_temp.l75_card; drop table if exists pg_temp.l75_hits;
  create temp table l75_people as
    select u.id uid, lower(coalesce(nullif(a.email,''),u.email,'')) email, public._lc75_chan(a.code,a.utm_source) ch, u.created_at, coalesce(a.ref,'') ref
    from auth.users u left join public.lc73_attrib a on a.user_id = u.id where codes is null or a.code = any(codes);
  create temp table l75_hits as select h.kind, h.device, h.created_at, public._lc75_chan(h.code,h.utm_source) ch from public.lc73_hits h where codes is null or h.code = any(codes);
  create temp table l75_pay (email text, kind text, cents bigint, at timestamptz);
  begin execute $q$insert into pg_temp.l75_pay select lower(email), case when tier = 3 then 'vip' else 'pro' end, amount_cents, to_timestamp(paid_at/1000.0) from arena.lc34_pro_sales where status = 'paid' and paid_at is not null$q$; exception when others then null; end;
  begin insert into pg_temp.l75_pay select email, 'tokens', amount_cents, created_at from public.lc36_token_credits where amount_cents > 0; exception when others then null; end;
  begin insert into pg_temp.l75_pay select g.email, case when i.kind = 'course' then 'course' else 'book' end, coalesce(g.amount_cents,0), g.created_at from public.lc70_grants g join public.lc70_items i on i.id = g.item_id where g.source in ('stripe','tokens'); exception when others then null; end;
  begin insert into pg_temp.l75_pay select email, kind, amount_cents, created_at from public.lc73_sub_events where kind in ('renewal','rescue') and amount_cents > 0; exception when others then null; end;
  begin execute $q$insert into pg_temp.l75_pay select lower(email), case when product like 'vip%' then 'vip' when product like 'pro%' then 'pro' else 'tokens' end, coalesce(amount_cents,0), created_at from public.lc45_payment_events where status = 'done'$q$; exception when others then null; end;
  delete from pg_temp.l75_pay where email is null or email = '' or email not in (select email from pg_temp.l75_people);
  create temp table l75_card as select email, started_at at from public.lc73_trials;
  begin insert into pg_temp.l75_card select email, created_at from public.lc70_grants where ref = 'lead'; exception when others then null; end;
  days := case when allt then greatest(1, extract(epoch from (now() - coalesce((select min(created_at) from pg_temp.l75_people), now() - interval '1 day')))/86400) else greatest(1, extract(epoch from (least(t, now()) - f))/86400) end;
  select array_agg(distinct x) into chans from (select ch x from pg_temp.l75_people union select channel from public.lc73_views where adm or partner_email = public._lc72_email()
    union select platform from public.lc73_links where codes is null or code = any(codes)) z where x is not null and x <> '';
  select coalesce(jsonb_object_agg(stage, jsonb_build_object('target',target,'kind',kind,'label',label)),'{}'::jsonb) into kp from public.lc75_kpis;
  foreach c in array array['all'] || coalesce(chans,'{}') loop
    with pe as (select * from pg_temp.l75_people where c = 'all' or ch = c),
         pay as (select y.* from pg_temp.l75_pay y where y.email in (select email from pe)),
         card as (select k.* from pg_temp.l75_card k where k.email in (select email from pe)),
         hit as (select * from pg_temp.l75_hits where (c = 'all' or ch = c) and created_at >= f and created_at < t),
         first_buy as (select email, min(at) at from pay where kind <> 'renewal' group by email),
         up as (select email, bool_or(kind='tokens') tk, bool_or(kind in ('course','book')) lib, bool_or(kind='pro') pr, bool_or(kind='vip') vp, bool_or(kind='rescue') rs,
                  min(at) filter (where kind='tokens') tk_at, max(at) filter (where kind in ('course','book')) lib_at from pay where at < t group by email),
         refd as (select pe.email, public._lc73_ref_email(pe.ref) ref_email, pe.created_at from pe where pe.ref <> '')
    select jsonb_build_object(
      'views',(select coalesce(sum(views),0) from public.lc73_views v where (c = 'all' or v.channel = c) and (adm or v.partner_email = public._lc72_email()) and (allt or (v.period_start >= f::date and v.period_start < t::date))),
      'clicks',(select count(*) from hit where kind='click'),
      'visits',(select count(distinct device) from hit where kind='landing'),
      'installs',(select count(distinct device) from hit where kind in ('install','app_open')),
      'signups',(select count(*) from pe where created_at >= f and created_at < t),
      'cards',(select count(distinct email) from card where at >= f and at < t),
      'paying',(select count(distinct email) from pay where at >= f and at < t and kind <> 'renewal'),
      'card_paid',(select count(distinct k.email) from card k where k.at >= f and k.at < t and exists(select 1 from pay y where y.email = k.email and y.at >= k.at and y.kind <> 'renewal')),
      'sales',(select count(*) from pay where at >= f and at < t and kind not in ('renewal')),
      'revenue',(select coalesce(sum(cents),0) from pay where at >= f and at < t),
      'buyers_all',(select count(distinct email) from pay where at < t),
      'repeat',(select count(*) from (select email from pay where at < t group by email having count(*) >= 2) z),
      'upsell',(select count(*) from up where (tk and lib and lib_at > tk_at) or (pr and vp) or rs),
      'up_tok_course',(select count(*) from up where tk and lib and lib_at > tk_at),'up_pro_vip',(select count(*) from up where pr and vp),'up_rescue',(select count(*) from up where rs),
      'renewals',(select count(*) from public.lc73_sub_events e where e.kind = 'renewal' and e.created_at >= f and e.created_at < t and e.email in (select email from pe)),
      'lapsed',public._lc75_lapsed(f,t,(select array_agg(email) from pe)),
      'active',public._lc75_active((select array_agg(email) from pe)),
      'referred',(select count(*) from refd where created_at >= f and created_at < t),
      'referrers',(select count(distinct ref_email) from refd where ref_email is not null and created_at < t),
      'members_all',(select count(*) from pe where created_at < t),
      'buyer_buyer',(select count(*) from refd r where r.ref_email is not null and r.email in (select email from first_buy) and r.ref_email in (select email from pg_temp.l75_pay)),
      'disc_invitee',(select count(*) from public.lc73_disc_used d where d.kind = 'invitee' and d.used_at >= f and d.used_at < t and d.email in (select email from pe)),
      'disc_referrer',(select count(*) from public.lc73_disc_used d where d.kind = 'referrer' and d.used_at >= f and d.used_at < t and d.email in (select email from pe)),
      'ltv_rev',(select coalesce(sum(cents),0) from pay),'ltv_buyers',(select count(distinct email) from pay)) into r;
    out := out || jsonb_build_object(c, r);
  end loop;
  return jsonb_build_object('ok',true,'admin',adm,'range',jsonb_build_object('all',allt,'days',round(days,1),'from',case when allt then null else f end,'to',case when allt then null else t end),
    'channels',to_jsonb(coalesce(chans,'{}')),'rows',out,'kpis',kp);
end $$;
create or replace function public._lc75_lapsed(f timestamptz, t timestamptz, ems text[]) returns int language plpgsql stable security definer set search_path = public as $$
declare n int;
begin
  select count(distinct lower(l.email)) into n from public.licenses l where l.tier >= 2 and coalesce(l.source,'') <> 'gift' and l.expires_at >= f and l.expires_at < least(t, now())
    and lower(l.email) = any(coalesce(ems,'{}')) and not exists(select 1 from public.licenses l2 where lower(l2.email) = lower(l.email) and l2.tier >= 2 and l2.expires_at > now() and coalesce(l2.revoked,false) = false);
  return coalesce(n,0);
exception when others then return 0; end $$;
create or replace function public._lc75_active(ems text[]) returns int language plpgsql stable security definer set search_path = public as $$
declare n int;
begin
  select count(distinct lower(email)) into n from public.licenses where tier >= 2 and coalesce(revoked,false) = false and expires_at > now() and lower(email) = any(coalesce(ems,'{}'));
  return coalesce(n,0);
exception when others then return 0; end $$;

-- ============ two-sided referral, reliably: every account gets its own 10% code (the friend 10% off the first purchase, the referrer 10% off the next one) ============
create table if not exists public.lc75_refcodes (user_id uuid primary key, email text not null default '', code text not null unique check (code ~ '^k[a-z0-9]{6,10}$'), created_at timestamptz not null default now());
alter table public.lc75_refcodes enable row level security; revoke all on public.lc75_refcodes from anon, authenticated;
create or replace function public.lc75_my_refcode() returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c text; i int := 0;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  select code into c from public.lc75_refcodes where user_id = uid;
  while c is null and i < 5 loop
    begin insert into public.lc75_refcodes(user_id,email,code) values (uid, public._lc72_email(), 'k'||substr(md5(uid::text||clock_timestamp()::text||i),1,7)) returning code into c;
    exception when unique_violation then i := i + 1; end;
  end loop;
  return jsonb_build_object('ok',c is not null,'code',c,'invited',(select count(*) from public.lc73_attrib where ref = c),
    'rewards',(select coalesce(earned - used,0) from public.lc73_ref_rewards where email = public._lc72_email()));
end $$;
-- referrer lookup: the new codes first, then the older LC36 / lc7 codes
create or replace function public._lc73_ref_email(p_code text) returns text language plpgsql stable security definer set search_path = public as $$
declare v jsonb; e text;
begin
  if coalesce(p_code,'') = '' then return null; end if;
  select nullif(lower(coalesce(nullif(r.email,''),u.email)),'') into e from public.lc75_refcodes r left join auth.users u on u.id = r.user_id where r.code = lower(p_code);
  if e is not null then return e; end if;
  begin v := public.lc7_resolve_code(p_code); exception when others then return null; end;
  if v is null or v->>'kind' <> 'member' then return null; end if;
  begin execute 'select lower(email) from public.lc7_members where id = $1' into e using (v->>'id')::uuid; exception when others then e := null; end;
  if e is null then begin select lower(u.email) into e from auth.users u where u.id = (v->>'id')::uuid; exception when others then e := null; end; end if;
  return nullif(e,'');
end $$;
create or replace function public.lc73_discount_for(p_email text) returns text language plpgsql stable security definer set search_path = public as $$
declare a public.lc73_attrib;
begin
  if coalesce(p_email,'') = '' then return null; end if;
  select * into a from public.lc73_attrib where email = p_email and ref <> '' limit 1;
  if found and not exists(select 1 from public.lc73_disc_used where email = p_email and kind = 'invitee') and coalesce(public._lc73_ref_email(a.ref),'') not in ('', p_email) then return 'invitee'; end if;
  if exists(select 1 from public.lc73_ref_rewards where email = p_email and earned > used) then return 'referrer'; end if;
  return null;
end $$;
create or replace function public.lc73_discount_paid(p_email text, p_kind text, p_session text) returns void language plpgsql security definer set search_path = public as $$
declare r text;
begin
  insert into public.lc73_disc_used(email,kind,session_id) values (p_email,p_kind,p_session) on conflict do nothing;
  if not found then return; end if;
  if p_kind = 'referrer' then update public.lc73_ref_rewards set used = used + 1 where email = p_email; return; end if;
  select public._lc73_ref_email(ref) into r from public.lc73_attrib where email = p_email and ref <> '' limit 1;
  if r is not null and r <> p_email then insert into public.lc73_ref_rewards(email,earned) values (r,1) on conflict (email) do update set earned = public.lc73_ref_rewards.earned + 1; end if;
end $$;

-- ============ library: text lessons, and the course outline anyone may see (titles and types only, never links or texts) ============
create or replace function public._lc70_videos(p jsonb) returns jsonb
language plpgsql immutable as $$
declare out jsonb := '[]'::jsonb; v jsonb; t text; u text; f text; g text; sd text; x text;
begin
  if p is null or jsonb_typeof(p) <> 'array' then return out; end if;
  for v in select * from jsonb_array_elements(p) limit 300 loop
    if jsonb_typeof(v) <> 'object' then continue; end if;
    t := left(btrim(coalesce(v->>'title','')), 120); u := btrim(coalesce(v->>'url',''));
    f := left(btrim(regexp_replace(coalesce(v->>'folder',''),'[<>]','','g')), 80);
    g := btrim(coalesce(v->>'pgn','')); x := btrim(regexp_replace(coalesce(v->>'text',''),'[<>]','','g'));
    sd := case when v->>'side' in ('w','b') then v->>'side' else '' end;
    if g <> '' then
      if char_length(g) <= 20000 then out := out || jsonb_build_array(jsonb_build_object('title', coalesce(nullif(t,''),'Opening'), 'pgn', g, 'folder', f, 'side', sd)); end if;
    elsif x <> '' then
      out := out || jsonb_build_array(jsonb_build_object('title', coalesce(nullif(t,''),'Lesson'), 'text', left(x,12000), 'folder', f));
    elsif u ~ '^https://(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com|m\.youtube\.com)/' and char_length(u) <= 300 then
      out := out || jsonb_build_array(jsonb_build_object('title', coalesce(nullif(t,''),'Lesson'), 'url', u, 'folder', f));
    end if;
  end loop;
  return out;
end $$;
revoke all on function public._lc70_videos(jsonb) from public, anon, authenticated;
create or replace function public.lc75_outlines(p_ids text[]) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  return jsonb_build_object('ok',true,'outlines',(select coalesce(jsonb_object_agg(i.id,(select coalesce(jsonb_agg(jsonb_build_object('folder',coalesce(v->>'folder',''),'title',coalesce(v->>'title','Lesson'),
      'type',case when v ? 'pgn' then 'pgn' when v ? 'text' then 'text' else 'video' end)),'[]'::jsonb) from jsonb_array_elements(coalesce(i.videos,'[]'::jsonb)) v)),'{}'::jsonb)
    from public.lc70_items i where i.id = any(coalesce(p_ids,'{}')) and i.status = 'live'));
exception when others then return jsonb_build_object('ok',false,'error','outline');
end $$;

do $$ declare r record; begin
  for r in select p.oid::regprocedure sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname ~ '^_?lc75_' loop
    execute 'revoke all on function ' || r.sig || ' from public, anon, authenticated';
    if r.proname !~ '^_' then execute 'grant execute on function ' || r.sig || ' to authenticated'; end if;
    if r.proname = 'lc75_outlines' then execute 'grant execute on function ' || r.sig || ' to anon'; end if;
  end loop;
  revoke all on function public.lc73_discount_for(text) from public, anon, authenticated;
  revoke all on function public.lc73_discount_paid(text,text,text) from public, anon, authenticated;
  revoke all on function public._lc73_ref_email(text) from public, anon, authenticated;
end $$;
