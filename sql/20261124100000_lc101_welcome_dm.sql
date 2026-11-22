-- LC101 (9.66.0, 22 Nov 2026): the coach chat (LC72, "Coach Kyenzo") for every member, a welcome message in it, and the withdrawal
-- acknowledgement as a message instead of an e-mail. Runs twice safely. Needs: lc72 (coach chat), lc100 (withdrawals).
--
-- 1. Every signed-in member can write to Kyenzo (before: only Pro, VIP, trial and buyers, or a thread Kyenzo started). Same limit as
--    before: 30 messages an hour. No AI is involved: Kyenzo answers himself, so free members cost nothing.
-- 2. A new automated message 'welcome' (owner menu > Coach inbox > Automated messages): sent once per account, from Kyenzo, the first
--    time the member is signed in (lc101_welcome, called by the app). Never to the owner.
-- 3. The withdrawal (route "withdraw" of the stripe function): when the member is signed in, the statement goes into their chat as their
--    own message and the acknowledgement (date, time, reference, what happens next) as Kyenzo's answer; the thread is pinned on top of
--    the owner's inbox until he answers. Chat messages are never edited or deleted (no function does that), so the member keeps a copy
--    that cannot be changed (a durable medium, like the BAWAG e-banking mailbox, CJEU C-375/15), next to the download on screen.

-- ---------- 1. the welcome message ----------
alter table public.lc72_auto drop constraint if exists lc72_auto_event_check;
alter table public.lc72_auto add constraint lc72_auto_event_check check (event in ('welcome', 'trial', 'pro', 'vip', 'buyer'));
insert into public.lc72_auto(event, body, cta_label, cta_href) values
 ('welcome', 'Hi {name}, welcome! I’m Kyenzo, your coach in this app. This chat goes straight to me: stuck on a position, confused by a review, or something does not work? Write it here. I read every message myself. Best first step: review your last game in Trim and train the top Working Point it finds.',
  'Review my last game', '#trim')
on conflict (event) do nothing;

create or replace function public.lc101_welcome(p_name text) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_email text := public._lc72_email(); a public.lc72_auto; nm text := public._lc72_clean(p_name, 40);
begin
  if uid is null or v_email = '' then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  if public._lc72_admin() or v_email = public._lc72_owner_email() then return jsonb_build_object('ok', true, 'sent', false, 'why', 'owner'); end if;
  if exists (select 1 from public.lc72_auto_log where user_id = uid and event = 'welcome') then return jsonb_build_object('ok', true, 'sent', false, 'why', 'done'); end if;
  select * into a from public.lc72_auto where event = 'welcome' and enabled and body <> '';
  if not found then return jsonb_build_object('ok', true, 'sent', false, 'why', 'off'); end if;
  -- the log row first: two tabs at once never send it twice
  insert into public.lc72_auto_log(user_id, event) values (uid, 'welcome') on conflict do nothing;
  if not found then return jsonb_build_object('ok', true, 'sent', false, 'why', 'done'); end if;
  perform public._lc72_post(uid, true, 'auto', replace(replace(a.body, '{name}', coalesce(nullif(nm, ''), 'there')), '{item}', ''),
    case when a.cta_href <> '' then jsonb_build_object('label', coalesce(nullif(a.cta_label, ''), 'Open'), 'href', a.cta_href) else null end, nm);
  return jsonb_build_object('ok', true, 'sent', true);
end $$;

-- ---------- 2. the chat is open to every signed-in member ----------
create or replace function public.lc72_me() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_email text := public._lc72_email(); c text; t public.lc72_threads;
begin
  if auth.uid() is null or v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  c := public._lc72_code(v_email); select * into t from public.lc72_threads where user_id = auth.uid();
  return jsonb_build_object('ok',true,'code',c,'title',case c when 'S' then 'Lanckriet Chess Student' when 'A' then 'Lanckriet Chess Apprentice' when 'C' then 'Coach' else '' end,
    'tier',public._lc72_tier(v_email),'buyer',public._lc72_buyer(v_email),'customer',true,'owner',c = 'C' or public._lc72_admin(),
    'unread',coalesce(t.member_unread,0),'priority',coalesce(t.priority,false),'priority_tokens',coalesce((public._lc72_getcfg('priority_tokens')#>>'{}')::int,5),
    'review_tokens',coalesce((public._lc72_getcfg('review_tokens')#>>'{}')::int,20),'coach',coalesce(public._lc72_getcfg('owner_name')#>>'{}','Kyenzo'));
end $$;
create or replace function public.lc72_chat_get() returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_email text := public._lc72_email(); t public.lc72_threads;
begin
  if uid is null or v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  select * into t from public.lc72_threads where user_id = uid;
  update public.lc72_threads set member_unread = 0 where user_id = uid;
  return jsonb_build_object('ok',true,'allowed',true,'priority',coalesce(t.priority,false),
    'msgs',(select coalesce(jsonb_agg(public._lc72_msg_json(m) order by m.id),'[]'::jsonb) from (select * from public.lc72_msgs where user_id = uid order by id desc limit 120) m));
end $$;
create or replace function public.lc72_chat_send(p_body text, p_name text) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_email text := public._lc72_email(); b text := public._lc72_clean(p_body,2000); n int;
begin
  if uid is null or v_email = '' then return jsonb_build_object('ok',false,'error','sign_in'); end if;
  if b = '' then return jsonb_build_object('ok',false,'error','empty'); end if;
  select count(*) into n from public.lc72_msgs where user_id = uid and not from_owner and created_at > now() - interval '1 hour';
  if n >= 30 then return jsonb_build_object('ok',false,'error','slow_down'); end if;
  perform public._lc72_post(uid,false,'chat',b,null,public._lc72_clean(p_name,40));
  return jsonb_build_object('ok',true);
end $$;

-- ---------- 3. the withdrawal acknowledgement in the chat ----------
alter table public.lc100_withdrawals add column if not exists dm boolean not null default false;

-- for the stripe function only: the statement as the member's message, the acknowledgement as Kyenzo's; only for the signed-in account
-- that sent the statement (a guest gets the download on screen)
create or replace function public._lc101_withdraw_dm(p_id bigint, p_statement text, p_ack text) returns boolean
language plpgsql security definer set search_path = public as $$
declare w public.lc100_withdrawals; uid uuid;
begin
  select * into w from public.lc100_withdrawals where id = p_id;
  if not found or w.account = '' or w.dm then return false; end if;
  select id into uid from auth.users where lower(email) = w.account limit 1;
  if uid is null then return false; end if;
  perform public._lc72_post(uid, false, 'chat', left(coalesce(nullif(btrim(p_statement), ''), 'I withdraw from my contract.'), 2000), null, w.name);
  perform public._lc72_post(uid, true, 'auto', left(coalesce(nullif(btrim(p_ack), ''), 'We received your withdrawal (reference W' || w.id || ').'), 2000), null, null);
  update public.lc72_threads set priority = true, priority_at = now(), owner_unread = owner_unread + 1 where user_id = uid;
  update public.lc100_withdrawals set dm = true where id = p_id;
  return true;
end $$;

-- the owner's list of withdrawals shows where the acknowledgement went (lc100_admin_withdrawals returns w.*, so the new column is in it)

-- ---------- grants ----------
revoke all on function public._lc101_withdraw_dm(bigint, text, text) from public, anon, authenticated;
revoke all on function public.lc101_welcome(text) from public, anon;
grant execute on function public.lc101_welcome(text) to authenticated;
