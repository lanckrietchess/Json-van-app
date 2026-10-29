-- LC36 (hub 9.14.0): referral claim after registration, email-verified licence claim, email consent store, data briefing.
-- Idempotent (create or replace / if not exists). Written against the LIVE definitions read on 2026-10-28:
--   public.lc7_register, lc7_resolve_code, lc7_ref_tokens, lc7_award_badge, lc7_auth, lc7_rate_ok,
--   public._lc26_email, public._lc_require_admin, public._lc_device_ok, public._lc_throttle, public._lc_sync, public._lc_bind, public._lc_payload.
-- NOTHING in this file is applied by the assistant. Read it, then run it in the Supabase SQL editor.
--
-- 1. lc36_referral_claim(p_id, p_token, p_code)
--    lc7_register only credits a referral at the moment a NEW member registers with a ?ref= code. Telling the app "a friend sent me" later
--    (first-launch question, Refer a Friend page) never credited anybody, and a test account on the owner's own device is rejected
--    ('same_device'). Live check on 2026-10-28: 240 members, 0 rows in lc7_referrals, 0 members with referral_count > 0.
--    This function credits a member's referrer AFTER registration, with the same ladder, badges, token ledger and auto-friendship.
--    Rules: only member codes (creator/partner codes keep going through attribution); not yourself; one referrer per member; only in the
--    first 14 days after registration; anti-farming (same device, a device that was already referred) is skipped ONLY when the referrer
--    is an owner, so the admin's own test accounts count.
create or replace function public.lc36_referral_claim(p_id uuid, p_token text, p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me public.lc7_members%rowtype; v_ref public.lc7_members%rowtype; v_res jsonb; v_n integer; v_tokens integer; v_reason text := null;
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if not public.lc7_rate_ok('lc36_claim', p_id::text, 5, interval '1 day') then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  select * into me from public.lc7_members where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if me.referrer_id is not null then return jsonb_build_object('ok', false, 'error', 'already_referred'); end if;
  if me.created_at < now() - interval '14 days' then return jsonb_build_object('ok', false, 'error', 'too_late'); end if;
  v_res := public.lc7_resolve_code(p_code);
  if v_res is null then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  if v_res ->> 'kind' <> 'member' then return jsonb_build_object('ok', false, 'error', 'not_a_member_code'); end if;
  if (v_res ->> 'id')::uuid = p_id then return jsonb_build_object('ok', false, 'error', 'own_code'); end if;
  select * into v_ref from public.lc7_members where id = (v_res ->> 'id')::uuid for update;
  if not found or v_ref.banned then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  if not coalesce(v_ref.is_owner, false) then
    if v_ref.device_hash is not distinct from me.device_hash then v_reason := 'same_device';
    elsif exists (select 1 from public.lc7_members where device_hash = me.device_hash and referrer_id is not null) then v_reason := 'device_already_referred';
    end if;
  end if;
  if v_reason is not null then return jsonb_build_object('ok', false, 'error', 'ignored', 'reason', v_reason); end if;

  v_n := v_ref.referral_count + 1;
  v_tokens := public.lc7_ref_tokens(v_n);
  update public.lc7_members set referrer_id = v_ref.id where id = p_id;
  insert into public.lc7_referrals (referrer_id, referred_id, seq, tokens) values (v_ref.id, p_id, v_n, v_tokens);
  update public.lc7_members
     set referral_count = v_n,
         vampire_unlocked_at = case when vampire_unlocked_at is null and v_n >= public.lc7_cfg_num('vampire_unlock_at', 100)
                                    then now() else vampire_unlocked_at end
   where id = v_ref.id;
  insert into public.lc7_token_ledger (member_id, delta, reason, ref_id) values (v_ref.id, v_tokens, 'referral', p_id::text);
  if v_n = 1 then perform public.lc7_award_badge(v_ref.id, 'first_friend');
  elsif v_n in (5, 10, 25, 50, 100) then perform public.lc7_award_badge(v_ref.id, 'ref_' || v_n);
  end if;
  insert into public.lc7_friendships (a, b) values (least(v_ref.id, p_id), greatest(v_ref.id, p_id)) on conflict do nothing;
  return jsonb_build_object('ok', true, 'friend_name', v_ref.name, 'count', v_n, 'auto_friended', true);
end $$;

-- 2. lc36_claim_my_licence(p_device): switch a web purchase on in the app after the buyer signs in with the SAME email.
--    The email comes from the verified Supabase Auth session (_lc26_email), never from a parameter, so knowing somebody's address is not
--    enough (lc_claim_by_email takes the address as a plain argument). Sources: stripe (web checkout), gift (Gift a friend), skool (legacy buyers).
create or replace function public.lc36_claim_my_licence(p_device text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_email text := public._lc26_email(); lic public.licenses;
begin
  if v_email = '' then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  if not public._lc_device_ok(p_device) then return jsonb_build_object('ok', false, 'error', 'invalid_request'); end if;
  if public._lc_throttle('claim36', 10) then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  select * into lic from public.licenses
   where lower(email) = v_email and source in ('stripe', 'gift', 'skool') and status = 'active' and coalesce(revoked, false) = false
     and (coalesce(lifetime, false) or coalesce(is_lifetime, false) or expires_at > now())
   order by tier desc, expires_at desc nulls first limit 1 for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_purchase'); end if;
  lic := public._lc_sync(lic);
  if lic.status = 'revoked' or coalesce(lic.revoked, false) then return jsonb_build_object('ok', false, 'error', 'revoked'); end if;
  if not public._lc_bind(lic.id, p_device, lic.devices_max) then return jsonb_build_object('ok', false, 'error', 'device_limit'); end if;
  return public._lc_payload(lic, lic.license_key);
end $$;

-- 3. Email consent store (marketing updates). One row per verified email; the member ticks the box themselves (default NOT ticked).
create table if not exists public.lc36_email_consent (
  email         text primary key check (email = lower(email)),
  marketing     boolean     not null default false,
  source        text        not null default 'signup',
  consented_at  timestamptz,
  updated_at    timestamptz not null default now()
);
alter table public.lc36_email_consent enable row level security;
revoke all on public.lc36_email_consent from anon, authenticated;

create or replace function public.lc36_consent_set(p_marketing boolean, p_source text default 'signup') returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_email text := public._lc26_email();
begin
  if v_email = '' then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  insert into public.lc36_email_consent (email, marketing, source, consented_at, updated_at)
  values (v_email, coalesce(p_marketing, false), left(coalesce(nullif(btrim(p_source), ''), 'signup'), 30), case when p_marketing then now() end, now())
  on conflict (email) do update
     set marketing = excluded.marketing, source = excluded.source, updated_at = now(),
         consented_at = case when excluded.marketing and not public.lc36_email_consent.marketing then now()
                             when excluded.marketing then public.lc36_email_consent.consented_at else null end;
  return jsonb_build_object('ok', true, 'marketing', coalesce(p_marketing, false));
end $$;

-- admin export: every verified email with its consent. Admin only. Marketing mail may only go to rows where marketing = true.
create or replace function public.lc36_admin_email_export() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok', true, 'rows', coalesce((
    select jsonb_agg(jsonb_build_object('email', u.email, 'created_at', u.created_at, 'marketing', coalesce(c.marketing, false), 'consented_at', c.consented_at,
                                        'source', c.source) order by u.created_at desc)
      from auth.users u left join public.lc36_email_consent c on c.email = lower(u.email)), '[]'::jsonb));
end $$;

-- 4. Data briefing ---------------------------------------------------------------------------------------------------------------
create or replace function public.lc36_j(p text) returns jsonb language plpgsql immutable as $$
begin return p::jsonb; exception when others then return null; end $$;
create or replace function public.lc36_n(p jsonb) returns numeric language sql immutable as $$
  select case when jsonb_typeof(p) = 'number' then (p #>> '{}')::numeric else 0 end $$;

-- Tool usage from what members already store in the cloud (lc8_member_state: progress counters, XP per module, activity heat-map).
-- p_ids null = everybody. Counters only, no content.
create or replace function public.lc36_usage_rollup(p_ids text[] default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  with s as (
    select m.id,
           public.lc36_j(m.state ->> 'lc-hub-v2')       as hub,
           public.lc36_j(m.state ->> 'lc6-state-v1')    as lc6,
           public.lc36_j(m.state ->> 'lc11-activity')   as act
      from public.lc8_member_state m where p_ids is null or m.id = any (p_ids)),
  d as (
    select s.id, sum(public.lc36_n(v -> 'p')) as p, sum(public.lc36_n(v -> 'b')) as b, sum(public.lc36_n(v -> 'm')) as mm, sum(public.lc36_n(v -> 'x')) as x
      from s, lateral jsonb_each(coalesce(s.act -> 'days', '{}'::jsonb)) e(k, v)
     where jsonb_typeof(s.act -> 'days') = 'object' and e.k >= to_char(now() - interval '30 days', 'YYYY-MM-DD')
     group by s.id)
  select jsonb_build_object(
    'members_with_progress', (select count(*) from s),
    'puzzles',  jsonb_build_object('tries', coalesce((select sum(public.lc36_n(hub #> '{stats,puzzles,tries}')) from s), 0),   'correct', coalesce((select sum(public.lc36_n(hub #> '{stats,puzzles,correct}')) from s), 0)),
    'openings', jsonb_build_object('tries', coalesce((select sum(public.lc36_n(hub #> '{stats,openings,tries}')) from s), 0),  'correct', coalesce((select sum(public.lc36_n(hub #> '{stats,openings,correct}')) from s), 0)),
    'shuffle',  jsonb_build_object('tries', coalesce((select sum(public.lc36_n(hub #> '{stats,shuffle,tries}')) from s), 0),   'correct', coalesce((select sum(public.lc36_n(hub #> '{stats,shuffle,correct}')) from s), 0)),
    'xp',       jsonb_build_object('openings',  coalesce((select sum(public.lc36_n(lc6 #> '{xp,openings}')) from s), 0), 'middlegame', coalesce((select sum(public.lc36_n(lc6 #> '{xp,middlegame}')) from s), 0),
                                   'endgame',   coalesce((select sum(public.lc36_n(lc6 #> '{xp,endgame}')) from s), 0),  'puzzles',    coalesce((select sum(public.lc36_n(lc6 #> '{xp,puzzles}')) from s), 0),
                                   'think',     coalesce((select sum(public.lc36_n(lc6 #> '{xp,think}')) from s), 0)),
    'last_30_days', jsonb_build_object('puzzles', coalesce((select sum(p) from d), 0), 'bot_games', coalesce((select sum(b) from d), 0), 'mspc', coalesce((select sum(mm) from d), 0), 'other', coalesce((select sum(x) from d), 0),
                                       'active_members', (select count(*) from d where coalesce(p, 0) + coalesce(b, 0) + coalesce(mm, 0) + coalesce(x, 0) > 0))
  ) into r;
  return r;
end $$;
revoke all on function public.lc36_usage_rollup(text[]) from public, anon, authenticated;

-- Admin: everything. KPI counters first.
--   total_members  = registered members (device accounts), banned and owner accounts left out
--   paying_members = distinct emails with an ACTIVE paid licence from Stripe (web checkout) or legacy Skool. Keys the admin handed out
--                    (source admin: testers, winners) and gifts are NOT counted as paying: they are listed apart, so the 1% KPI is not inflated.
create or replace function public.lc36_data_briefing() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_total integer; v_paying integer; v_stripe integer; v_skool integer; v_gift integer; v_admin integer; v_ev jsonb := '[]'::jsonb; v_spend jsonb := '[]'::jsonb; v_cat jsonb := '[]'::jsonb;
begin
  perform public._lc_require_admin();
  select count(*) into v_total from public.lc7_members where not banned and not coalesce(is_owner, false);
  select count(distinct lower(email)) filter (where source = 'stripe'), count(distinct lower(email)) filter (where source = 'skool'),
         count(distinct lower(email)) filter (where source = 'gift'),   count(distinct lower(email)) filter (where source = 'admin'),
         count(distinct lower(email)) filter (where source in ('stripe', 'skool'))
    into v_stripe, v_skool, v_gift, v_admin, v_paying
    from public.licenses
   where status = 'active' and coalesce(revoked, false) = false and (coalesce(lifetime, false) or coalesce(is_lifetime, false) or expires_at > now());
  if to_regclass('arena.ev_events') is not null then
    execute 'select coalesce(jsonb_agg(x), ''[]''::jsonb) from (select e, coalesce(k, '''') as k, count(*)::int as n from arena.ev_events group by 1, 2 order by n desc limit 40) x' into v_ev;
  end if;
  if to_regclass('arena.token_spend') is not null then
    execute 'select coalesce(jsonb_agg(x), ''[]''::jsonb) from (select coalesce(kind, '''') as kind, count(*)::int as n from arena.token_spend group by 1 order by n desc limit 20) x' into v_spend;
  end if;
  if to_regclass('arena.lb_vol') is not null then
    execute 'select coalesce(jsonb_agg(x), ''[]''::jsonb) from (select cat, sum(n)::int as tries, sum(ok)::int as correct from arena.lb_vol group by 1 order by tries desc limit 30) x' into v_cat;
  end if;
  return jsonb_build_object('ok', true, 'generated_at', now(),
    'kpi', jsonb_build_object('total_members', v_total, 'paying_members', v_paying,
                              'paying_pct', case when v_total > 0 then round(v_paying::numeric * 100 / v_total, 2) else 0 end, 'target_pct', 1,
                              'paying_stripe', v_stripe, 'paying_legacy_skool', v_skool, 'gifted', v_gift, 'admin_keys', v_admin),
    'members', jsonb_build_object(
        'new_7d',  (select count(*) from public.lc7_members where created_at > now() - interval '7 days'  and not coalesce(is_owner, false)),
        'new_30d', (select count(*) from public.lc7_members where created_at > now() - interval '30 days' and not coalesce(is_owner, false)),
        'active_7d', (select count(*) from public.lc7_members where last_active_at > now() - interval '7 days' and not coalesce(is_owner, false)),
        'email_accounts', (select count(*) from auth.users),
        'marketing_opt_in', (select count(*) from public.lc36_email_consent where marketing),
        'with_referrer', (select count(*) from public.lc7_members where referrer_id is not null)),
    'intake', jsonb_build_object(
        'how_found', coalesce((select jsonb_agg(jsonb_build_object('source', source, 'detail', coalesce(detail, ''), 'n', n) order by n desc)
                                 from (select source, detail, count(*)::int as n from public.lc30_attribution group by 1, 2) a), '[]'::jsonb),
        'creators',  coalesce((select jsonb_agg(jsonb_build_object('creator', creator, 'n', n) order by n desc)
                                 from (select creator, count(*)::int as n from public.lc30_attribution where creator is not null group by 1 order by 2 desc limit 15) c), '[]'::jsonb),
        'via',       coalesce((select jsonb_object_agg(coalesce(attr_via, 'none'), n) from (select attr_via, count(*)::int as n from public.lc7_members group by 1) v), '{}'::jsonb)),
    'tools', jsonb_build_object('progress', public.lc36_usage_rollup(null), 'events', v_ev, 'token_spend', v_spend, 'puzzle_categories', v_cat));
end $$;

-- Partner: aggregates for the members attributed to the caller's approved partner code. No emails. Names only for public profiles.
create or replace function public.lc36_partner_briefing(p_id uuid, p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.lc7_partners%rowtype; v_ids text[];
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.lc7_partners where member_id = p_id and status = 'approved';
  if not found then return jsonb_build_object('ok', false, 'error', 'not_partner'); end if;
  select coalesce(array_agg(id::text), '{}') into v_ids from public.lc7_members where attr_partner_id = p.id and not banned;
  return jsonb_build_object('ok', true, 'generated_at', now(), 'partner', jsonb_build_object('name', p.name, 'code', p.code),
    'members', jsonb_build_object(
        'total',   coalesce(array_length(v_ids, 1), 0),
        'new_7d',  (select count(*) from public.lc7_members where attr_partner_id = p.id and not banned and created_at > now() - interval '7 days'),
        'new_30d', (select count(*) from public.lc7_members where attr_partner_id = p.id and not banned and created_at > now() - interval '30 days'),
        'active_7d', (select count(*) from public.lc7_members where attr_partner_id = p.id and not banned and last_active_at > now() - interval '7 days')),
    'sales', coalesce((select jsonb_object_agg(status, n) from (select coalesce(status, 'unknown') as status, count(*)::int as n from public.lc7_purchases where partner_id = p.id group by 1) s), '{}'::jsonb),
    'tools', jsonb_build_object('progress', public.lc36_usage_rollup(v_ids)),
    'students', coalesce((select jsonb_agg(jsonb_build_object('name', m.name, 'since', m.created_at, 'last_active', m.last_active_at, 'elo', m.elo) order by m.last_active_at desc nulls last)
                            from (select * from public.lc7_members where attr_partner_id = p.id and not banned and public_profile order by last_active_at desc nulls last limit 100) m), '[]'::jsonb));
end $$;

revoke all on function public.lc36_referral_claim(uuid, text, text)   from public;
revoke all on function public.lc36_claim_my_licence(text)             from public, anon;
revoke all on function public.lc36_consent_set(boolean, text)         from public, anon;
revoke all on function public.lc36_admin_email_export()               from public, anon;
revoke all on function public.lc36_data_briefing()                    from public, anon;
revoke all on function public.lc36_partner_briefing(uuid, text)       from public;
grant execute on function public.lc36_referral_claim(uuid, text, text)  to anon, authenticated, service_role;
grant execute on function public.lc36_claim_my_licence(text)            to authenticated, service_role;
grant execute on function public.lc36_consent_set(boolean, text)        to authenticated, service_role;
grant execute on function public.lc36_admin_email_export()              to authenticated, service_role;
grant execute on function public.lc36_data_briefing()                   to authenticated, service_role;
grant execute on function public.lc36_partner_briefing(uuid, text)      to anon, authenticated, service_role;
