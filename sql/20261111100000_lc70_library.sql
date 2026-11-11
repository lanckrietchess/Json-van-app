-- LC70 (build 9.35.0): the Library. Kyenzo's own books, book summaries and video courses (shelf 'kyenzo') and the Guest Library (shelf 'guest':
-- books and courses of outside creators, labelled as such). Run AFTER the LC36 SQL (it reads public.licenses for Pro / VIP, uses public._lc26_email()
-- and public._lc_require_admin()). Idempotent: safe to run twice.
--
-- Access rules (decided in the database, never in the browser):
--   owner (admin)                         -> everything
--   bought (row in lc70_grants)           -> that item, for as long as the account exists (a one-time purchase; NO subscription needed)
--   active Pro (licence tier >= 2)        -> items flagged pro_ebook (the e-book of the thinking system) or pro_included (every Kyenzo course by default)
--   active VIP (licence tier >= 3)        -> everything Pro gets + items flagged vip_included (guest items only when agreed with the creator)
--                                            + a free hardcover of items flagged vip_hardcover (one per account, the owner ships it by hand)
--   price-less item (no tokens, no price) -> free for everybody
-- Payments: euro purchases go through a Stripe Payment Link that carries the metadata lc_item=<item id> (and lc_format=paperback|hardcover for a
-- printed book); the stripe-links function then calls lc70_grant_paid / lc70_order_paid. Token purchases: the app spends the tokens through the
-- Arena first, then records the purchase with lc70_buy_tokens (the database cannot see the Arena wallet: see PROJECT_KNOWLEDGE section 9).

create table if not exists public.lc70_items (
  id              text primary key check (id ~ '^[a-z0-9-]{3,48}$'),
  shelf           text not null default 'kyenzo' check (shelf in ('kyenzo','guest')),
  kind            text not null default 'book' check (kind in ('book','summary','course')),
  status          text not null default 'draft' check (status in ('draft','pending','live','rejected')),
  title           text not null check (char_length(title) between 1 and 120),
  subtitle        text not null default '' check (char_length(subtitle) <= 200),
  author          text not null default '' check (char_length(author) <= 120),
  blurb           text not null default '' check (char_length(blurb) <= 2000),
  cover_url       text not null default '' check (cover_url = '' or cover_url ~ '^(https://|/assets/)'),
  creator_name    text not null default '' check (char_length(creator_name) <= 80),
  creator_bio     text not null default '' check (char_length(creator_bio) <= 600),
  creator_email   text not null default '' check (creator_email = lower(creator_email)),
  pinned          boolean not null default false,
  sort            int not null default 0,
  tokens          int check (tokens is null or tokens between 1 and 100000),
  price_cents     int check (price_cents is null or price_cents between 50 and 500000),
  buy_link        text not null default '' check (buy_link = '' or buy_link ~ '^https://buy\.stripe\.com/[A-Za-z0-9]+$'),
  paperback_cents int check (paperback_cents is null or paperback_cents between 50 and 500000),
  paperback_link  text not null default '' check (paperback_link = '' or paperback_link ~ '^https://buy\.stripe\.com/[A-Za-z0-9]+$'),
  hardcover_cents int check (hardcover_cents is null or hardcover_cents between 50 and 500000),
  hardcover_link  text not null default '' check (hardcover_link = '' or hardcover_link ~ '^https://buy\.stripe\.com/[A-Za-z0-9]+$'),
  pro_ebook       boolean not null default false,
  pro_included    boolean not null default false,
  vip_included    boolean not null default false,
  vip_hardcover   boolean not null default false,
  ebook_url       text not null default '' check (ebook_url = '' or ebook_url ~ '^https://'),
  body            text not null default '' check (char_length(body) <= 60000),
  videos          jsonb not null default '[]'::jsonb check (jsonb_typeof(videos) = 'array'),
  owner_note      text not null default '' check (char_length(owner_note) <= 400),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create table if not exists public.lc70_grants (
  email        text not null check (email = lower(email)),
  item_id      text not null references public.lc70_items(id) on delete cascade,
  source       text not null check (source in ('tokens','stripe','owner')),
  ref          text not null default '',
  tokens       int,
  amount_cents int,
  created_at   timestamptz not null default now(),
  primary key (email, item_id)
);
create table if not exists public.lc70_orders (
  id           bigserial primary key,
  kind         text not null check (kind in ('paid','vip_claim')),
  email        text not null check (email = lower(email)),
  item_id      text not null references public.lc70_items(id) on delete cascade,
  format       text not null check (format in ('paperback','hardcover')),
  session_id   text unique,
  amount_cents int not null default 0,
  name         text not null default '',
  line1        text not null default '',
  line2        text not null default '',
  postal       text not null default '',
  city         text not null default '',
  country      text not null default '',
  status       text not null default 'new' check (status in ('new','shipped','cancelled')),
  tracking     text not null default '',
  created_at   timestamptz not null default now(),
  shipped_at   timestamptz
);
create unique index if not exists lc70_orders_one_claim on public.lc70_orders(email, item_id) where kind = 'vip_claim';
create index if not exists lc70_grants_item on public.lc70_grants(item_id);

alter table public.lc70_items  enable row level security;
alter table public.lc70_grants enable row level security;
alter table public.lc70_orders enable row level security;
revoke all on public.lc70_items, public.lc70_grants, public.lc70_orders from anon, authenticated;
revoke all on sequence public.lc70_orders_id_seq from anon, authenticated;

-- helpers -------------------------------------------------------------------------------------------------------------------------------------------
create or replace function public._lc70_admin() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  begin perform public._lc_require_admin(); return true; exception when others then return false; end;
end $$;

create or replace function public._lc70_tier(p_email text) returns int
language plpgsql security definer set search_path = public as $$
declare v int := 0;
begin
  if coalesce(p_email,'') = '' or to_regclass('public.licenses') is null then return 0; end if;
  execute 'select coalesce(max(tier),0)::int from public.licenses where lower(email) = $1 and status = ''active'' and coalesce(revoked,false) = false
             and (coalesce(lifetime,false) or coalesce(is_lifetime,false) or expires_at > now())' into v using p_email;
  return coalesce(v,0);
exception when others then return 0;
end $$;

-- why the caller may open an item ('owner','owned','pro','vip','free') or null
create or replace function public._lc70_why(i public.lc70_items, p_email text, p_tier int, p_admin boolean) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if p_admin then return 'owner'; end if;
  if i.tokens is null and i.price_cents is null then return 'free'; end if;
  if p_email <> '' and exists (select 1 from public.lc70_grants g where g.email = p_email and g.item_id = i.id) then return 'owned'; end if;
  if p_tier >= 3 and (i.vip_included or i.pro_included or i.pro_ebook) then return 'vip'; end if;
  if p_tier >= 2 and (i.pro_included or i.pro_ebook) then return 'pro'; end if;
  return null;
end $$;

create or replace function public._lc70_txt(p jsonb, k text, n int) returns text
language sql immutable as $$ select left(btrim(regexp_replace(coalesce(p->>k,''), '[\u0000-\u0008\u000b\u000c\u000e-\u001f<>]', '', 'g')), n) $$;
create or replace function public._lc70_int(p jsonb, k text) returns int
language plpgsql immutable as $$ begin if coalesce(p->>k,'') = '' then return null; end if; return (p->>k)::numeric::int; exception when others then return null; end $$;

create or replace function public._lc70_videos(p jsonb) returns jsonb
language plpgsql immutable as $$
declare out jsonb := '[]'::jsonb; v jsonb; t text; u text;
begin
  if p is null or jsonb_typeof(p) <> 'array' then return out; end if;
  for v in select * from jsonb_array_elements(p) limit 80 loop
    t := left(btrim(coalesce(v->>'title','')), 120); u := btrim(coalesce(v->>'url',''));
    if u ~ '^https://(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com|m\.youtube\.com)/' and char_length(u) <= 300 then
      out := out || jsonb_build_array(jsonb_build_object('title', coalesce(nullif(t,''),'Lesson'), 'url', u));
    end if;
  end loop;
  return out;
end $$;

create or replace function public._lc70_pub(i public.lc70_items, p_why text, p_admin boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id',i.id,'shelf',i.shelf,'kind',i.kind,'status',i.status,'title',i.title,'subtitle',i.subtitle,'author',i.author,'blurb',i.blurb,
    'cover',i.cover_url,'creator',i.creator_name,'creator_bio',i.creator_bio,'pinned',i.pinned,'sort',i.sort,'tokens',i.tokens,'price_cents',i.price_cents,
    'buy_link',i.buy_link,'paperback_cents',i.paperback_cents,'paperback_link',i.paperback_link,'hardcover_cents',i.hardcover_cents,'hardcover_link',i.hardcover_link,
    'pro_ebook',i.pro_ebook,'pro_included',i.pro_included,'vip_included',i.vip_included,'vip_hardcover',i.vip_hardcover,
    'lessons',jsonb_array_length(i.videos),'has_ebook',i.ebook_url <> '','has_body',i.body <> '','access',p_why,
    'owner_note',case when p_admin then i.owner_note else '' end,'creator_email',case when p_admin then i.creator_email else '' end,'updated_at',i.updated_at)
$$;

-- 1. catalog: everybody (anonymous too) sees live items; the owner also sees drafts and pending guest items --------------------------------------
create or replace function public.lc70_catalog(p_shelf text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_email text := coalesce(public._lc26_email(),''); v_admin boolean := public._lc70_admin(); v_tier int; v_items jsonb; v_claims jsonb;
begin
  v_tier := public._lc70_tier(v_email);
  select coalesce(jsonb_agg(public._lc70_pub(i, public._lc70_why(i, v_email, v_tier, v_admin), v_admin) order by i.pinned desc, i.sort, i.created_at desc), '[]'::jsonb)
    into v_items from public.lc70_items i
   where i.shelf = case when p_shelf = 'guest' then 'guest' else 'kyenzo' end and (i.status = 'live' or v_admin);
  select coalesce(jsonb_object_agg(o.item_id, o.status), '{}'::jsonb) into v_claims from public.lc70_orders o where o.kind = 'vip_claim' and o.email = v_email and v_email <> '';
  return jsonb_build_object('ok',true,'items',v_items,'claims',v_claims,'me',jsonb_build_object('signed_in',v_email <> '','tier',v_tier,'admin',v_admin));
end $$;

-- 2. open: the private part (e-book link, summary text, video lessons) only for somebody with access -------------------------------------------
create or replace function public.lc70_open(p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_email text := coalesce(public._lc26_email(),''); v_admin boolean := public._lc70_admin(); i public.lc70_items; v_why text;
begin
  select * into i from public.lc70_items where id = p_id and (status = 'live' or v_admin);
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  v_why := public._lc70_why(i, v_email, public._lc70_tier(v_email), v_admin);
  if v_why is null then return jsonb_build_object('ok',false,'error',case when v_email = '' then 'sign_in' else 'no_access' end); end if;
  return jsonb_build_object('ok',true,'access',v_why,'ebook_url',i.ebook_url,'body',i.body,'videos',i.videos);
end $$;

-- 3. a token purchase (the app has already spent the tokens through the Arena) ----------------------------------------------------------------
create or replace function public.lc70_buy_tokens(p_id text, p_ref text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_email text := coalesce(public._lc26_email(),''); i public.lc70_items; n int;
begin
  if v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  select * into i from public.lc70_items where id = p_id and status = 'live';
  if not found or i.tokens is null then return jsonb_build_object('ok',false,'error','not_for_tokens'); end if;
  select count(*) into n from public.lc70_grants where email = v_email and source = 'tokens' and created_at > now() - interval '1 day';
  if n >= 20 then return jsonb_build_object('ok',false,'error','rate_limited'); end if;
  insert into public.lc70_grants(email,item_id,source,ref,tokens) values (v_email, i.id, 'tokens', left(coalesce(p_ref,''),120), i.tokens)
  on conflict (email,item_id) do nothing;
  return jsonb_build_object('ok',true);
end $$;

-- 4. the VIP hardcover: one per account and item, shipped by the owner ---------------------------------------------------------------------------
create or replace function public.lc70_hardcover_claim(p_id text, p_addr jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_email text := coalesce(public._lc26_email(),''); i public.lc70_items;
        v_name text := public._lc70_txt(p_addr,'name',80); v_l1 text := public._lc70_txt(p_addr,'line1',120); v_l2 text := public._lc70_txt(p_addr,'line2',120);
        v_pc text := public._lc70_txt(p_addr,'postal',20); v_city text := public._lc70_txt(p_addr,'city',80); v_cc text := upper(public._lc70_txt(p_addr,'country',2));
begin
  if v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  select * into i from public.lc70_items where id = p_id and status = 'live' and vip_hardcover;
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  if public._lc70_tier(v_email) < 3 then return jsonb_build_object('ok',false,'error','vip_only'); end if;
  if char_length(v_name) < 2 or char_length(v_l1) < 3 or char_length(v_pc) < 2 or char_length(v_city) < 2 or v_cc !~ '^[A-Z]{2}$' then
    return jsonb_build_object('ok',false,'error','address'); end if;
  insert into public.lc70_orders(kind,email,item_id,format,name,line1,line2,postal,city,country)
  values ('vip_claim', v_email, i.id, 'hardcover', v_name, v_l1, v_l2, v_pc, v_city, v_cc) on conflict do nothing;
  if not found then return jsonb_build_object('ok',false,'error','already'); end if;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.lc70_my_orders() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_email text := coalesce(public._lc26_email(),'');
begin
  if v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  return jsonb_build_object('ok',true,'orders',(select coalesce(jsonb_agg(jsonb_build_object('item',o.item_id,'kind',o.kind,'format',o.format,'status',o.status,
    'tracking',o.tracking,'at',o.created_at) order by o.created_at desc),'[]'::jsonb) from public.lc70_orders o where o.email = v_email));
end $$;

-- 5. owner: add / edit / delete / pin / approve, grants, orders, sales ----------------------------------------------------------------------------
create or replace function public.lc70_admin_upsert(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id text := lower(public._lc70_txt(p,'id',48)); v_title text := public._lc70_txt(p,'title',120); r public.lc70_items;
begin
  perform public._lc_require_admin();
  if v_title = '' then return jsonb_build_object('ok',false,'error','title'); end if;
  if v_id = '' then v_id := left(trim(both '-' from regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g')), 36) || '-' || substr(md5(random()::text),1,5); end if;
  if v_id !~ '^[a-z0-9-]{3,48}$' then return jsonb_build_object('ok',false,'error','id'); end if;
  insert into public.lc70_items as t (id,shelf,kind,status,title,subtitle,author,blurb,cover_url,creator_name,creator_bio,creator_email,pinned,sort,tokens,price_cents,buy_link,
      paperback_cents,paperback_link,hardcover_cents,hardcover_link,pro_ebook,pro_included,vip_included,vip_hardcover,ebook_url,body,videos,updated_at)
  values (v_id,
    case when p->>'shelf' = 'guest' then 'guest' else 'kyenzo' end,
    case when p->>'kind' in ('book','summary','course') then p->>'kind' else 'book' end,
    case when p->>'status' in ('draft','pending','live','rejected') then p->>'status' else 'draft' end,
    v_title, public._lc70_txt(p,'subtitle',200), public._lc70_txt(p,'author',120), public._lc70_txt(p,'blurb',2000), public._lc70_txt(p,'cover',300),
    public._lc70_txt(p,'creator',80), public._lc70_txt(p,'creator_bio',600), lower(public._lc70_txt(p,'creator_email',200)),
    coalesce((p->>'pinned')::boolean,false), coalesce(public._lc70_int(p,'sort'),0), public._lc70_int(p,'tokens'), public._lc70_int(p,'price_cents'),
    public._lc70_txt(p,'buy_link',200), public._lc70_int(p,'paperback_cents'), public._lc70_txt(p,'paperback_link',200),
    public._lc70_int(p,'hardcover_cents'), public._lc70_txt(p,'hardcover_link',200),
    coalesce((p->>'pro_ebook')::boolean,false), coalesce((p->>'pro_included')::boolean,false), coalesce((p->>'vip_included')::boolean,false),
    coalesce((p->>'vip_hardcover')::boolean,false), public._lc70_txt(p,'ebook_url',600), left(coalesce(p->>'body',''),60000), public._lc70_videos(p->'videos'), now())
  on conflict (id) do update set shelf = excluded.shelf, kind = excluded.kind, status = excluded.status, title = excluded.title, subtitle = excluded.subtitle,
    author = excluded.author, blurb = excluded.blurb, cover_url = excluded.cover_url, creator_name = excluded.creator_name, creator_bio = excluded.creator_bio,
    creator_email = case when excluded.creator_email = '' then t.creator_email else excluded.creator_email end,
    pinned = excluded.pinned, sort = excluded.sort, tokens = excluded.tokens, price_cents = excluded.price_cents, buy_link = excluded.buy_link,
    paperback_cents = excluded.paperback_cents, paperback_link = excluded.paperback_link, hardcover_cents = excluded.hardcover_cents, hardcover_link = excluded.hardcover_link,
    pro_ebook = excluded.pro_ebook, pro_included = excluded.pro_included, vip_included = excluded.vip_included, vip_hardcover = excluded.vip_hardcover,
    ebook_url = excluded.ebook_url, body = excluded.body, videos = excluded.videos, updated_at = now()
  returning * into r;
  return jsonb_build_object('ok',true,'id',r.id);
exception when check_violation then return jsonb_build_object('ok',false,'error','invalid');
end $$;

create or replace function public.lc70_admin_get(p_id text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare i public.lc70_items;
begin
  perform public._lc_require_admin();
  select * into i from public.lc70_items where id = p_id;
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  return jsonb_build_object('ok',true,'item',public._lc70_pub(i,'owner',true) || jsonb_build_object('ebook_url',i.ebook_url,'body',i.body,'videos',i.videos));
end $$;

create or replace function public.lc70_admin_set(p_id text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  update public.lc70_items set
    status = case when p->>'status' in ('draft','pending','live','rejected') then p->>'status' else status end,
    pinned = coalesce((p->>'pinned')::boolean, pinned),
    owner_note = case when p ? 'note' then public._lc70_txt(p,'note',400) else owner_note end,
    updated_at = now()
  where id = p_id;
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.lc70_admin_delete(p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  if exists (select 1 from public.lc70_grants where item_id = p_id) or exists (select 1 from public.lc70_orders where item_id = p_id) then
    update public.lc70_items set status = 'draft', updated_at = now() where id = p_id;   -- bought items are never deleted: they go back to draft
    return jsonb_build_object('ok',true,'kept',true);
  end if;
  delete from public.lc70_items where id = p_id;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.lc70_admin_grant(p_email text, p_id text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(btrim(coalesce(p_email,'')));
begin
  perform public._lc_require_admin();
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok',false,'error','email'); end if;
  if not exists (select 1 from public.lc70_items where id = p_id) then return jsonb_build_object('ok',false,'error','not_found'); end if;
  if p_on then insert into public.lc70_grants(email,item_id,source,ref) values (v_email,p_id,'owner','admin') on conflict (email,item_id) do nothing;
  else delete from public.lc70_grants where email = v_email and item_id = p_id; end if;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.lc70_admin_orders() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok',true,'orders',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'kind',o.kind,'email',o.email,'item',o.item_id,'title',i.title,
    'format',o.format,'amount_cents',o.amount_cents,'name',o.name,'line1',o.line1,'line2',o.line2,'postal',o.postal,'city',o.city,'country',o.country,
    'status',o.status,'tracking',o.tracking,'at',o.created_at,'shipped_at',o.shipped_at,'tier',public._lc70_tier(o.email)) order by (o.status = 'new') desc, o.created_at desc),'[]'::jsonb)
    from public.lc70_orders o join public.lc70_items i on i.id = o.item_id where o.created_at > now() - interval '400 days'));
end $$;

create or replace function public.lc70_admin_order_set(p_id bigint, p_status text, p_tracking text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  if p_status not in ('new','shipped','cancelled') then return jsonb_build_object('ok',false,'error','status'); end if;
  update public.lc70_orders set status = p_status, tracking = left(btrim(coalesce(p_tracking,'')),120),
         shipped_at = case when p_status = 'shipped' then coalesce(shipped_at, now()) else null end where id = p_id;
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  return jsonb_build_object('ok',true);
end $$;

-- addresses are only kept as long as needed: the owner wipes them 90 days after shipping (button in the owner menu)
create or replace function public.lc70_admin_purge() returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform public._lc_require_admin();
  update public.lc70_orders set name = '', line1 = '', line2 = '', postal = '', city = '', tracking = ''
   where status in ('shipped','cancelled') and coalesce(shipped_at, created_at) < now() - interval '90 days' and (line1 <> '' or name <> '');
  get diagnostics n = row_count;
  return jsonb_build_object('ok',true,'wiped',n);
end $$;

create or replace function public.lc70_admin_sales() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok',true,'rows',(select coalesce(jsonb_agg(x order by x->>'title'),'[]'::jsonb) from (
    select jsonb_build_object('id',i.id,'title',i.title,'shelf',i.shelf,'creator',i.creator_name,
      'tokens_sales',(select count(*) from public.lc70_grants g where g.item_id = i.id and g.source = 'tokens'),
      'tokens_total',(select coalesce(sum(g.tokens),0) from public.lc70_grants g where g.item_id = i.id and g.source = 'tokens'),
      'stripe_sales',(select count(*) from public.lc70_grants g where g.item_id = i.id and g.source = 'stripe'),
      'stripe_cents',(select coalesce(sum(g.amount_cents),0) from public.lc70_grants g where g.item_id = i.id and g.source = 'stripe'),
      'print_orders',(select count(*) from public.lc70_orders o where o.item_id = i.id and o.kind = 'paid'),
      'print_cents',(select coalesce(sum(o.amount_cents),0) from public.lc70_orders o where o.item_id = i.id and o.kind = 'paid'),
      'vip_claims',(select count(*) from public.lc70_orders o where o.item_id = i.id and o.kind = 'vip_claim')) as x
    from public.lc70_items i) s));
end $$;

-- 6. Stripe fulfilment (called by the stripe-links function with the database role only; members cannot call these) ------------------------
create or replace function public.lc70_grant_paid(p_email text, p_id text, p_session text, p_amount int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(btrim(coalesce(p_email,'')));
begin
  if v_email = '' then return jsonb_build_object('ok',false,'error','email'); end if;
  if not exists (select 1 from public.lc70_items where id = p_id) then return jsonb_build_object('ok',false,'error','unknown_item'); end if;
  insert into public.lc70_grants(email,item_id,source,ref,amount_cents) values (v_email,p_id,'stripe',left(coalesce(p_session,''),120),p_amount)
  on conflict (email,item_id) do nothing;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.lc70_order_paid(p_email text, p_id text, p_format text, p_session text, p_amount int, p_ship jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(btrim(coalesce(p_email,''))); a jsonb := coalesce(p_ship->'address','{}'::jsonb);
begin
  if v_email = '' then return jsonb_build_object('ok',false,'error','email'); end if;
  if p_format not in ('paperback','hardcover') then return jsonb_build_object('ok',false,'error','format'); end if;
  if not exists (select 1 from public.lc70_items where id = p_id) then return jsonb_build_object('ok',false,'error','unknown_item'); end if;
  insert into public.lc70_orders(kind,email,item_id,format,session_id,amount_cents,name,line1,line2,postal,city,country)
  values ('paid', v_email, p_id, p_format, p_session, coalesce(p_amount,0), public._lc70_txt(p_ship,'name',80), public._lc70_txt(a,'line1',120),
          public._lc70_txt(a,'line2',120), public._lc70_txt(a,'postal_code',20), public._lc70_txt(a,'city',80), upper(public._lc70_txt(a,'country',2)))
  on conflict (session_id) do nothing;
  return jsonb_build_object('ok',true);
end $$;

-- 7. Guest Library: an outside creator submits and manages their own items; the owner approves before anything goes live -------------------
create or replace function public.lc70_creator_submit(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_email text := coalesce(public._lc26_email(),''); v_id text := lower(public._lc70_txt(p,'id',48)); v_title text := public._lc70_txt(p,'title',120);
        cur public.lc70_items; n int;
begin
  if v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  if v_title = '' then return jsonb_build_object('ok',false,'error','title'); end if;
  if public._lc70_txt(p,'creator',80) = '' then return jsonb_build_object('ok',false,'error','creator'); end if;
  select count(*) into n from public.lc70_items where creator_email = v_email and updated_at > now() - interval '1 day';
  if n >= 20 then return jsonb_build_object('ok',false,'error','rate_limited'); end if;
  if v_id <> '' then
    select * into cur from public.lc70_items where id = v_id;
    if not found or cur.shelf <> 'guest' or cur.creator_email <> v_email then return jsonb_build_object('ok',false,'error','not_yours'); end if;
  else
    select count(*) into n from public.lc70_items where creator_email = v_email;
    if n >= 10 then return jsonb_build_object('ok',false,'error','limit'); end if;
    v_id := 'g-' || left(trim(both '-' from regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g')), 34) || '-' || substr(md5(random()::text),1,5);
  end if;
  insert into public.lc70_items as t (id,shelf,kind,status,title,subtitle,author,blurb,cover_url,creator_name,creator_bio,creator_email,tokens,price_cents,ebook_url,body,videos,updated_at)
  values (v_id,'guest',case when p->>'kind' in ('book','summary','course') then p->>'kind' else 'course' end,'pending',v_title,public._lc70_txt(p,'subtitle',200),
    public._lc70_txt(p,'author',120),public._lc70_txt(p,'blurb',2000),public._lc70_txt(p,'cover',300),public._lc70_txt(p,'creator',80),public._lc70_txt(p,'creator_bio',600),
    v_email,public._lc70_int(p,'tokens'),public._lc70_int(p,'price_cents'),public._lc70_txt(p,'ebook_url',600),left(coalesce(p->>'body',''),60000),public._lc70_videos(p->'videos'),now())
  on conflict (id) do update set kind = excluded.kind, status = 'pending', title = excluded.title, subtitle = excluded.subtitle, author = excluded.author,
    blurb = excluded.blurb, cover_url = excluded.cover_url, creator_name = excluded.creator_name, creator_bio = excluded.creator_bio, tokens = excluded.tokens,
    price_cents = excluded.price_cents, ebook_url = excluded.ebook_url, body = excluded.body, videos = excluded.videos, updated_at = now();
  return jsonb_build_object('ok',true,'id',v_id,'status','pending');
exception when check_violation then return jsonb_build_object('ok',false,'error','invalid');
end $$;

create or replace function public.lc70_creator_mine() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_email text := coalesce(public._lc26_email(),'');
begin
  if v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  return jsonb_build_object('ok',true,'items',(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'kind',i.kind,'status',i.status,'title',i.title,'subtitle',i.subtitle,
    'author',i.author,'blurb',i.blurb,'cover',i.cover_url,'creator',i.creator_name,'creator_bio',i.creator_bio,'tokens',i.tokens,'price_cents',i.price_cents,
    'ebook_url',i.ebook_url,'body',i.body,'videos',i.videos,'owner_note',i.owner_note,
    'sales',(select count(*) from public.lc70_grants g where g.item_id = i.id and g.source in ('tokens','stripe'))) order by i.created_at desc),'[]'::jsonb)
    from public.lc70_items i where i.creator_email = v_email and i.shelf = 'guest'));
end $$;

-- permissions: tables are never readable directly; only these functions -------------------------------------------------------------------------
revoke all on function public._lc70_admin(), public._lc70_tier(text), public._lc70_why(public.lc70_items,text,int,boolean),
  public._lc70_pub(public.lc70_items,text,boolean), public._lc70_videos(jsonb) from public, anon, authenticated;
revoke all on function public.lc70_grant_paid(text,text,text,int), public.lc70_order_paid(text,text,text,text,int,jsonb) from public, anon, authenticated;
revoke all on function public.lc70_catalog(text), public.lc70_open(text), public.lc70_buy_tokens(text,text), public.lc70_hardcover_claim(text,jsonb),
  public.lc70_my_orders(), public.lc70_admin_upsert(jsonb), public.lc70_admin_get(text), public.lc70_admin_set(text,jsonb), public.lc70_admin_delete(text),
  public.lc70_admin_grant(text,text,boolean), public.lc70_admin_orders(), public.lc70_admin_order_set(bigint,text,text), public.lc70_admin_purge(),
  public.lc70_admin_sales(), public.lc70_creator_submit(jsonb), public.lc70_creator_mine() from public;
grant execute on function public.lc70_catalog(text) to anon, authenticated;
grant execute on function public.lc70_open(text), public.lc70_buy_tokens(text,text), public.lc70_hardcover_claim(text,jsonb), public.lc70_my_orders(),
  public.lc70_admin_upsert(jsonb), public.lc70_admin_get(text), public.lc70_admin_set(text,jsonb), public.lc70_admin_delete(text),
  public.lc70_admin_grant(text,text,boolean), public.lc70_admin_orders(), public.lc70_admin_order_set(bigint,text,text), public.lc70_admin_purge(),
  public.lc70_admin_sales(), public.lc70_creator_submit(jsonb), public.lc70_creator_mine() to authenticated;
