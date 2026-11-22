-- LC100 (9.65.0, 23 Nov 2026): the withdrawal button, Kyenzo's games in Theory / Trim / Ranked, the student game opt-in and
-- the community auto-join. Runs twice safely. Needs: lc65 (community), lc95 (master games), lc97 (member state), lc99 (consents).
--
-- 1. The EU withdrawal function (Consumer Rights Directive art. 11a, from 19 June 2026): "Withdraw from contract here" in the app
--    and on the landing page. The consumer gives a name, the contract and an e-mail; one confirmation tap stores the statement with
--    its date and time (lc100_withdrawals) and the stripe function e-mails the acknowledgement (durable medium). The owner sees every
--    statement in owner menu > Withdrawal waivers, with the refund deadline (14 days after the statement, art. 13).
--    Pro is a personalised digital service (game reviews, coach, adaptive training), so after the CJEU's Sky Österreich judgment
--    (C-234/25, 9 July 2026) the right of withdrawal is NOT given up when Pro starts at once: the member asks for an immediate start
--    and, when they withdraw within 14 days, pays only for the days they used (art. 14(3)). Consent wording "w2-2026-11-23".
-- 2. lc99_consents also takes the token packs (flow 'tokens') and a guest consent before a Payment Link (source 'app_guest').
-- 3. Kyenzo's Hall of Fame (Trim > "Kyenzo's Gems"): mg_gems(kind) and mg_by_ids(ids).
-- 4. Students who pay may share their own games for Kyenzo's analysis (lc100_contrib): an explicit, unticked opt-in with their
--    Chess.com / Lichess names, revocable at any time; the owner sees the list (lc100_admin_contrib) to ingest or remove.
-- 5. Every new account joins the main community (lc65_members) by a trigger on auth.users; existing accounts are backfilled.

-- ---------- 1. withdrawals ----------
create table if not exists public.lc100_withdrawals (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  email        text not null check (char_length(email) between 3 and 200),
  name         text not null check (char_length(name) between 1 and 80),
  contract     text not null check (contract in ('pro_trial', 'pro_monthly', 'pro_yearly', 'pro_month_once', 'vip_monthly', 'vip_yearly', 'tokens', 'other')),
  note         text not null default '' check (char_length(note) <= 500),
  account      text not null default '',           -- the signed-in account's e-mail, when there was one
  device       text not null default '',
  mailed       boolean not null default false,     -- the acknowledgement e-mail went out
  status       text not null default 'received' check (status in ('received', 'refunded', 'partly_refunded', 'declined', 'duplicate')),
  handled_at   timestamptz,
  handled_note text not null default '' check (char_length(handled_note) <= 500)
);
create index if not exists lc100_withdrawals_email on public.lc100_withdrawals(email, created_at desc);
alter table public.lc100_withdrawals enable row level security;
revoke all on table public.lc100_withdrawals from public, anon, authenticated;

-- for the stripe function (route "withdraw"): store one statement; at most 5 a day per e-mail and 10 per device
create or replace function public._lc100_withdraw(p_email text, p_name text, p_contract text, p_note text, p_device text, p_account text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e text := lower(btrim(coalesce(p_email, ''))); n text := left(btrim(regexp_replace(coalesce(p_name, ''), '[<>\r\n\t]', ' ', 'g')), 80);
  d text := left(regexp_replace(coalesce(p_device, ''), '[^A-Za-z0-9_-]', '', 'g'), 64); r public.lc100_withdrawals;
begin
  if e !~ '^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,24}$' then return jsonb_build_object('ok', false, 'reason', 'email'); end if;
  if n = '' then return jsonb_build_object('ok', false, 'reason', 'name'); end if;
  if coalesce(p_contract, '') not in ('pro_trial', 'pro_monthly', 'pro_yearly', 'pro_month_once', 'vip_monthly', 'vip_yearly', 'tokens', 'other') then
    return jsonb_build_object('ok', false, 'reason', 'contract'); end if;
  if (select count(*) from public.lc100_withdrawals w where w.email = e and w.created_at > now() - interval '1 day') >= 5
     or (d <> '' and (select count(*) from public.lc100_withdrawals w where w.device = d and w.created_at > now() - interval '1 day') >= 10) then
    return jsonb_build_object('ok', false, 'reason', 'slow_down'); end if;
  insert into public.lc100_withdrawals (email, name, contract, note, account, device)
  values (e, n, p_contract, left(btrim(regexp_replace(coalesce(p_note, ''), '[<>]', '', 'g')), 500), lower(left(coalesce(p_account, ''), 200)), d)
  returning * into r;
  return jsonb_build_object('ok', true, 'id', r.id, 'at', r.created_at, 'email', r.email, 'name', r.name, 'contract', r.contract);
end $$;

create or replace function public._lc100_withdraw_mailed(p_id bigint) returns void language sql security definer set search_path = public as $$
  update public.lc100_withdrawals set mailed = true where id = p_id $$;

-- the signed-in member: their own statements (to show "received on …")
create or replace function public.lc100_my_withdrawals() returns jsonb language plpgsql security definer set search_path = public as $$
declare e text := public._lc26_email();
begin
  if e is null or e = '' then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  return jsonb_build_object('ok', true, 'rows', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'at', w.created_at, 'contract', w.contract, 'status', w.status, 'mailed', w.mailed) order by w.id desc)
    from public.lc100_withdrawals w where w.email = e or w.account = e), '[]'::jsonb));
end $$;

-- the owner: every statement, newest first, with the refund deadline; and marking one handled
create or replace function public.lc100_admin_withdrawals(p_limit int) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok', true, 'rows', coalesce((select jsonb_agg(to_jsonb(x) order by x.id desc) from (
    select w.*, w.created_at + interval '14 days' as refund_by from public.lc100_withdrawals w order by w.id desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) x), '[]'::jsonb));
end $$;
create or replace function public.lc100_admin_withdrawal_set(p_id bigint, p_status text, p_note text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  if coalesce(p_status, '') not in ('received', 'refunded', 'partly_refunded', 'declined', 'duplicate') then return jsonb_build_object('ok', false, 'error', 'status'); end if;
  update public.lc100_withdrawals set status = p_status, handled_at = case when p_status = 'received' then null else now() end,
    handled_note = left(coalesce(p_note, ''), 500) where id = p_id;
  return jsonb_build_object('ok', found);
end $$;

-- ---------- 2. consents: token packs and guests ----------
do $$ begin
  alter table public.lc99_consents drop constraint if exists lc99_consents_flow_check;
  alter table public.lc99_consents add constraint lc99_consents_flow_check check (flow in ('trial', 'downsell', 'annual25', 'yearly', 'monthly', 'vip', 'vip_monthly', 'tokens'));
  alter table public.lc99_consents drop constraint if exists lc99_consents_source_check;
  alter table public.lc99_consents add constraint lc99_consents_source_check check (source in ('server', 'app', 'app_guest'));
end $$;

-- right before a Payment Link (Pro / VIP plans and token packs do not pass our server): the member's account, or the e-mail a guest
-- typed; at most 30 rows a day per e-mail and per device
create or replace function public.lc100_consent_note(p_flow text, p_version text, p_wording text, p_device text, p_email text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s text := public._lc26_email(); e text; d text := left(regexp_replace(coalesce(p_device, ''), '[^A-Za-z0-9_-]', '', 'g'), 64);
begin
  e := lower(coalesce(nullif(s, ''), btrim(coalesce(p_email, ''))));
  if e !~ '^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,24}$' then return jsonb_build_object('ok', false, 'error', 'email'); end if;
  if p_flow not in ('yearly', 'monthly', 'vip', 'vip_monthly', 'tokens') then return jsonb_build_object('ok', false, 'error', 'flow'); end if;
  if coalesce(p_version, '') !~ '^[A-Za-z0-9._-]{1,40}$' then return jsonb_build_object('ok', false, 'error', 'version'); end if;
  if char_length(coalesce(p_wording, '')) not between 20 and 1200 then return jsonb_build_object('ok', false, 'error', 'wording'); end if;
  if (select count(*) from public.lc99_consents c where c.email = e and c.created_at > now() - interval '1 day') >= 30
     or (d <> '' and (select count(*) from public.lc99_consents c where c.device = d and c.created_at > now() - interval '1 day') >= 30) then
    return jsonb_build_object('ok', false, 'error', 'slow_down'); end if;
  insert into public.lc99_consents (email, flow, version, wording, device, source)
  values (e, p_flow, p_version, p_wording, d, case when coalesce(s, '') <> '' then 'app' else 'app_guest' end);
  return jsonb_build_object('ok', true);
end $$;

-- ---------- 3. Kyenzo's Hall of Fame ----------
-- brilliant = his brilliant moves; great = his only moves; accuracy = his most accurate wins; upsets = wins against the highest-rated
-- opponents compared with his own rating; featured = the positions the owner featured. Game rows never carry the PGN here.
create or replace function public.mg_gems(p_kind text default 'brilliant', p_limit int default 24) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare lim int := least(greatest(coalesce(p_limit, 24), 1), 60);
begin
  if p_kind in ('brilliant', 'great', 'featured') then
    return coalesce((select jsonb_agg(to_jsonb(q)) from (
      select p.id, p.game_id, p.kind, p.fen, p.side, p.played, p.best, p.solution, p.line, p.prev, p.prev_fen, p.tier, p.eco, p.phase, p.tags, p.featured,
        g.my_rating, g.opp_rating, g.time_class, g.end_time, g.opening, g.result, g.url
      from public.master_puzzles p join public.my_master_games g on g.id = p.game_id
      where not p.hidden and (case when p_kind = 'featured' then p.featured and p.kind in ('brilliant', 'great', 'punish') else p.kind = p_kind end)
      order by p.featured desc, g.my_rating desc, g.end_time desc limit lim) q), '[]'::jsonb);
  end if;
  if p_kind in ('accuracy', 'upsets') then
    return coalesce((select jsonb_agg(to_jsonb(q)) from (
      select g.id, g.url, g.end_time, g.time_class, g.color, g.my_rating, g.opp_rating, g.tier, g.result, g.termination, g.eco, g.opening, g.plies,
        g.acc_me, g.acc_opp, g.brilliant, g.great, g.blunder, g.mistake, g.opp_rating - g.my_rating as gap
      from public.my_master_games g
      where g.result = 'win' and g.plies >= 30 and (p_kind <> 'accuracy' or g.acc_me is not null)
      order by case when p_kind = 'accuracy' then g.acc_me else (g.opp_rating - g.my_rating)::numeric end desc nulls last, g.end_time desc limit lim) q), '[]'::jsonb);
  end if;
  return '[]'::jsonb;
end $$;

-- a set of positions by id, in the order asked (the Hall of Fame and the Theory examples open them in the MSPC trainer)
create or replace function public.mg_by_ids(p_ids text[]) returns setof public.master_puzzles language sql stable set search_path = public as $$
  select p.* from public.master_puzzles p join unnest((coalesce(p_ids, array[]::text[]))[1:40]) with ordinality u(id, n) on u.id = p.id
  where not p.hidden order by u.n $$;

-- a game with its moves only (the PGN without its header lines: no opponent name leaves the database this way)
create or replace function public.mg_game_moves(p_id text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', g.id, 'url', g.url, 'end_time', g.end_time, 'time_class', g.time_class, 'color', g.color, 'my_rating', g.my_rating,
    'opp_rating', g.opp_rating, 'result', g.result, 'termination', g.termination, 'eco', g.eco, 'opening', g.opening, 'plies', g.plies,
    'acc_me', g.acc_me, 'acc_opp', g.acc_opp, 'evals', g.evals,
    'moves', btrim(regexp_replace(regexp_replace(g.pgn, '^(\s*\[[^\]]*\]\s*)+', ''), '\{[^}]*\}', '', 'g')))
  from public.my_master_games g where g.id = p_id $$;

revoke all on function public.mg_gems(text, int), public.mg_by_ids(text[]), public.mg_game_moves(text) from public;
grant execute on function public.mg_gems(text, int), public.mg_by_ids(text[]), public.mg_game_moves(text) to anon, authenticated;

-- ---------- 4. students share their games ----------
create table if not exists public.lc100_contrib (
  email       text primary key check (email = lower(email) and char_length(email) between 3 and 200),
  enabled     boolean not null default false,
  chesscom    text not null default '' check (chesscom = '' or chesscom ~ '^[A-Za-z0-9_-]{3,25}$'),
  lichess     text not null default '' check (lichess = '' or lichess ~ '^[A-Za-z0-9_-]{2,30}$'),
  consent_v   text not null default '',
  consent_txt text not null default '' check (char_length(consent_txt) <= 600),
  opted_in_at timestamptz,
  revoked_at  timestamptz,
  ingested_at timestamptz,
  updated_at  timestamptz not null default now()
);
alter table public.lc100_contrib enable row level security;
revoke all on table public.lc100_contrib from public, anon, authenticated;

create or replace function public._lc100_paying(p_email text) returns boolean language plpgsql security definer set search_path = public as $$
declare s public.lc97_member_state;
begin
  if coalesce(p_email, '') = '' then return false; end if;
  s := public._lc97_refresh(p_email);
  return s.sub_status in ('active', 'downsell_month');
exception when others then return false;
end $$;

create or replace function public.lc100_contrib_get() returns jsonb language plpgsql security definer set search_path = public as $$
declare e text := public._lc26_email(); r public.lc100_contrib;
begin
  if e is null or e = '' then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  select * into r from public.lc100_contrib where email = lower(e);
  return jsonb_build_object('ok', true, 'paying', public._lc100_paying(e), 'enabled', coalesce(r.enabled, false), 'chesscom', coalesce(r.chesscom, ''),
    'lichess', coalesce(r.lichess, ''), 'opted_in_at', r.opted_in_at, 'revoked_at', r.revoked_at);
end $$;

create or replace function public.lc100_contrib_set(p_on boolean, p_chesscom text, p_lichess text, p_version text, p_text text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e text := lower(coalesce(public._lc26_email(), '')); c text := btrim(coalesce(p_chesscom, '')); l text := btrim(coalesce(p_lichess, ''));
begin
  if e = '' then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  if not coalesce(p_on, false) then   -- switching off is always allowed and wipes the names
    update public.lc100_contrib set enabled = false, chesscom = '', lichess = '', revoked_at = now(), updated_at = now() where email = e;
    return jsonb_build_object('ok', true, 'enabled', false);
  end if;
  if not public._lc100_paying(e) then return jsonb_build_object('ok', false, 'error', 'members_only'); end if;
  if c <> '' and c !~ '^[A-Za-z0-9_-]{3,25}$' then return jsonb_build_object('ok', false, 'error', 'chesscom'); end if;
  if l <> '' and l !~ '^[A-Za-z0-9_-]{2,30}$' then return jsonb_build_object('ok', false, 'error', 'lichess'); end if;
  if c = '' and l = '' then return jsonb_build_object('ok', false, 'error', 'no_account'); end if;
  if char_length(coalesce(p_text, '')) not between 20 and 600 or coalesce(p_version, '') !~ '^[A-Za-z0-9._-]{1,40}$' then return jsonb_build_object('ok', false, 'error', 'wording'); end if;
  insert into public.lc100_contrib (email, enabled, chesscom, lichess, consent_v, consent_txt, opted_in_at, revoked_at, updated_at)
  values (e, true, c, l, p_version, p_text, now(), null, now())
  on conflict (email) do update set enabled = true, chesscom = excluded.chesscom, lichess = excluded.lichess, consent_v = excluded.consent_v,
    consent_txt = excluded.consent_txt, opted_in_at = coalesce(case when public.lc100_contrib.enabled then public.lc100_contrib.opted_in_at end, now()), revoked_at = null, updated_at = now();
  return jsonb_build_object('ok', true, 'enabled', true);
end $$;

-- the owner: who shares (to ingest) and who stopped (to remove their games)
create or replace function public.lc100_admin_contrib() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok', true, 'rows', coalesce((select jsonb_agg(jsonb_build_object('email', c.email, 'enabled', c.enabled, 'chesscom', c.chesscom, 'lichess', c.lichess,
    'opted_in_at', c.opted_in_at, 'revoked_at', c.revoked_at, 'ingested_at', c.ingested_at, 'paying', public._lc100_paying(c.email)) order by c.enabled desc, c.updated_at desc)
    from public.lc100_contrib c), '[]'::jsonb));
end $$;
create or replace function public.lc100_admin_contrib_ingested(p_email text, p_done boolean) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  update public.lc100_contrib set ingested_at = case when coalesce(p_done, false) then now() else null end, updated_at = now() where email = lower(coalesce(p_email, ''));
  return jsonb_build_object('ok', found);
end $$;

-- ---------- 5. every new account joins the main community ----------
create or replace function public._lc100_auto_join() returns trigger language plpgsql security definer set search_path = public as $$
declare n text;
begin
  begin
    n := split_part(btrim(coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'first_name', '')), ' ', 1);
    n := left(regexp_replace(n, '[<>&"'']', '', 'g'), 24);
    insert into public.lc65_members (user_id, name) values (new.id, case when n = '' then 'Member' else n end) on conflict (user_id) do nothing;
  exception when others then null;   -- a sign-up never fails because of the community
  end;
  return new;
end $$;
revoke all on function public._lc100_auto_join() from public, anon, authenticated;
drop trigger if exists lc100_auto_join on auth.users;
create trigger lc100_auto_join after insert on auth.users for each row execute function public._lc100_auto_join();

-- the existing accounts (no duplicates: the user id is the key)
insert into public.lc65_members (user_id, name)
select u.id, coalesce(nullif(left(regexp_replace(split_part(btrim(coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', '')), ' ', 1), '[<>&"'']', '', 'g'), 24), ''), 'Member')
from auth.users u on conflict (user_id) do nothing;

-- the app's own idempotent call after sign-in (an account made before the trigger, or a trigger that was dropped)
create or replace function public.lc100_join_main(p_name text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n text := left(regexp_replace(btrim(coalesce(p_name, '')), '[<>&"'']', '', 'g'), 24);
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  insert into public.lc65_members (user_id, name) values (auth.uid(), case when n = '' then 'Member' else n end) on conflict (user_id) do nothing;
  return jsonb_build_object('ok', true, 'joined', found);
end $$;

-- ---------- grants ----------
revoke all on function public._lc100_withdraw(text, text, text, text, text, text), public._lc100_withdraw_mailed(bigint), public._lc100_paying(text) from public, anon, authenticated;
revoke all on function public.lc100_my_withdrawals(), public.lc100_admin_withdrawals(int), public.lc100_admin_withdrawal_set(bigint, text, text),
  public.lc100_contrib_get(), public.lc100_contrib_set(boolean, text, text, text, text), public.lc100_admin_contrib(), public.lc100_admin_contrib_ingested(text, boolean),
  public.lc100_join_main(text) from public, anon;
grant execute on function public.lc100_my_withdrawals(), public.lc100_admin_withdrawals(int), public.lc100_admin_withdrawal_set(bigint, text, text),
  public.lc100_contrib_get(), public.lc100_contrib_set(boolean, text, text, text, text), public.lc100_admin_contrib(), public.lc100_admin_contrib_ingested(text, boolean),
  public.lc100_join_main(text) to authenticated;
revoke all on function public.lc100_consent_note(text, text, text, text, text) from public;
grant execute on function public.lc100_consent_note(text, text, text, text, text) to anon, authenticated;
