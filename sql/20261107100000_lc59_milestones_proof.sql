-- LC59 (build 9.32.0): ELO milestones with token rewards, the Catch-Up Bonus, and the ranked Proof Queue / Wall of Love for the landing page.
-- Idempotent: safe to run twice. Never applied by the assistant.
-- Needs: public._lc26_email() and public._lc_require_admin() (earlier migrations), public.lc36_token_credits (sql/20261028110000_lc36_commerce.sql).
-- Where the numbers come from: the Edge Function `elo-verify` reads the PUBLIC Chess.com / Lichess rating itself (the browser cannot fake it) and calls
-- lc59_link_record. The first verified rating is the START rating, the highest verified rating since is the PEAK. Milestones are every full hundred
-- above the start hundred that the PEAK has reached. Tokens are filed as credits under the member's e-mail (like a bought pack); the Arena moves them
-- into the wallet at sign-in (tokens_claim_email).
-- Limit worth knowing: nobody can prove they OWN a chess account from outside. One account name can be linked to ONE member (first come, first served),
-- and nothing reaches the public landing page before the owner has approved it in Admin mode.

create table if not exists public.lc59_cfg (k text primary key, v numeric not null, note text);
insert into public.lc59_cfg (k, v, note) values
  ('catchup_base',   800,  'Catch-Up Bonus counts the hundreds above this rating'),
  ('catchup_cap',    10,   'Catch-Up Bonus: most tokens a new member can get'),
  ('milestone_max',  3200, 'highest milestone level'),
  ('wall_min_gain',  50,   'smallest peak gain shown as a result on the landing page'),
  ('msg_min_chars',  30,   'a real message: at least this many characters'),
  ('msg_min_words',  6,    'a real message: at least this many words')
on conflict (k) do nothing;

create table if not exists public.lc59_links (
  user_id      uuid primary key,
  email        text        not null check (email = lower(email)),
  site         text        not null check (site in ('chesscom', 'lichess')),
  uname        text        not null check (uname ~ '^[A-Za-z0-9_-]{2,30}$'),
  start_rating integer     not null check (start_rating between 100 and 3500),
  last_rating  integer     not null,
  peak_rating  integer     not null,
  linked_at    timestamptz not null default now(),
  last_at      timestamptz not null default now()
);
create unique index if not exists lc59_links_acct_uq on public.lc59_links (site, lower(uname));
create table if not exists public.lc59_catchup (
  user_id uuid primary key, email text not null unique check (email = lower(email)), tokens integer not null check (tokens > 0),
  start_rating integer not null, claimed_at timestamptz not null default now()
);
create table if not exists public.lc59_milestones (
  id bigserial primary key, user_id uuid not null, email text not null check (email = lower(email)), level integer not null,
  tokens integer not null, allow_proof boolean not null default false, message text, msg_ok boolean not null default false,
  nice_try boolean not null default false, claimed_at timestamptz not null default now(),
  unique (user_id, level)
);
create table if not exists public.lc59_proof (
  user_id uuid primary key, email text not null check (email = lower(email)),
  first_name text check (first_name is null or char_length(first_name) between 2 and 24),
  allow_web boolean not null default false, allow_app boolean not null default false,
  message text, msg_status text not null default 'none' check (msg_status in ('none', 'pending', 'approved', 'rejected')),
  result_approved boolean not null default false, note text, updated_at timestamptz not null default now()
);
alter table public.lc59_cfg        enable row level security;
alter table public.lc59_links      enable row level security;
alter table public.lc59_catchup    enable row level security;
alter table public.lc59_milestones enable row level security;
alter table public.lc59_proof      enable row level security;
revoke all on public.lc59_cfg, public.lc59_links, public.lc59_catchup, public.lc59_milestones, public.lc59_proof from anon, authenticated;

create or replace function public._lc59_cfg(p_k text, p_d numeric) returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((select v from public.lc59_cfg where k = p_k), p_d) $$;

-- is this a real message? length, words, letters, no repeated characters, no links, not the same word over and over
create or replace function public._lc59_msg_ok(p text) returns boolean language plpgsql immutable as $$
declare t text := btrim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g')); n_words integer; n_letters integer; n_long integer; n_distinct integer;
begin
  if t = '' or char_length(t) < 30 or char_length(t) > 600 then return false; end if;
  if t ~* '(https?:|www\.|\.com|\.net|@)' then return false; end if;
  if t ~ '(.)\1{4,}' then return false; end if;
  n_words := coalesce(array_length(regexp_split_to_array(t, ' '), 1), 0);
  if n_words < 6 then return false; end if;
  n_letters := char_length(regexp_replace(t, '[^[:alpha:]]', '', 'g'));
  if n_letters < 0.7 * char_length(replace(t, ' ', '')) then return false; end if;
  select count(*) filter (where char_length(w) >= 4), count(distinct lower(w)) into n_long, n_distinct from unnest(regexp_split_to_array(t, ' ')) w;
  if n_long < 3 or n_distinct < 0.6 * n_words then return false; end if;
  return true;
end $$;

-- called ONLY by the Edge Function elo-verify (service role) with a rating it read itself from Chess.com / Lichess
create or replace function public.lc59_link_record(p_user uuid, p_email text, p_site text, p_uname text, p_rating integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l public.lc59_links; v_email text := lower(coalesce(p_email, '')); v_catch integer; v_first boolean := false; v_base integer; v_cap integer;
begin
  if p_user is null or v_email = '' or p_site not in ('chesscom', 'lichess') or p_uname !~ '^[A-Za-z0-9_-]{2,30}$' or p_rating is null or p_rating not between 100 and 3500 then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end if;
  select * into l from public.lc59_links where user_id = p_user;
  if found then
    if l.site <> p_site or lower(l.uname) <> lower(p_uname) then return jsonb_build_object('ok', false, 'error', 'already_linked'); end if;
    update public.lc59_links set last_rating = p_rating, last_at = now(), peak_rating = greatest(peak_rating, p_rating) where user_id = p_user returning * into l;
  else
    if exists (select 1 from public.lc59_links x where x.site = p_site and lower(x.uname) = lower(p_uname)) then return jsonb_build_object('ok', false, 'error', 'account_taken'); end if;
    insert into public.lc59_links (user_id, email, site, uname, start_rating, last_rating, peak_rating) values (p_user, v_email, p_site, p_uname, p_rating, p_rating, p_rating) returning * into l;
    v_first := true;
    -- Catch-Up Bonus: a member who joins at 1437 has "missed" 900, 1000 ... 1400. One token per hundred, once, capped.
    v_base := public._lc59_cfg('catchup_base', 800)::int; v_cap := public._lc59_cfg('catchup_cap', 10)::int;
    v_catch := greatest(0, least(v_cap, (p_rating / 100) - (v_base / 100)));
    if v_catch > 0 and to_regclass('public.lc36_token_credits') is not null then
      insert into public.lc59_catchup (user_id, email, tokens, start_rating) values (p_user, v_email, v_catch, p_rating) on conflict do nothing;
      if found then
        insert into public.lc36_token_credits (email, tokens, pack, amount_cents, session_id) values (v_email, v_catch, 'catchup', 0, 'catchup:' || p_user::text) on conflict (session_id) do nothing;
      else v_catch := 0; end if;
    else v_catch := 0; end if;
  end if;
  return jsonb_build_object('ok', true, 'first', v_first, 'site', l.site, 'uname', l.uname, 'start', l.start_rating, 'last', l.last_rating, 'peak', l.peak_rating, 'catchup', coalesce(v_catch, 0));
end $$;

-- everything the app needs to know, in one call
create or replace function public.lc59_status() returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); l public.lc59_links; pr public.lc59_proof; v_due jsonb; v_up jsonb; v_done jsonb; v_cu integer; v_max integer := public._lc59_cfg('milestone_max', 3200)::int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  select * into l from public.lc59_links where user_id = v_uid;
  if not found then return jsonb_build_object('ok', true, 'linked', false); end if;
  select * into pr from public.lc59_proof where user_id = v_uid;
  select coalesce(jsonb_agg(m.level order by m.level), '[]') into v_done from public.lc59_milestones m where m.user_id = v_uid;
  select coalesce(jsonb_agg(g order by g), '[]') into v_due from generate_series(((l.start_rating / 100) + 1) * 100, least((l.peak_rating / 100) * 100, v_max), 100) g
    where not exists (select 1 from public.lc59_milestones m where m.user_id = v_uid and m.level = g);
  select coalesce(jsonb_agg(m.level order by m.level), '[]') into v_up from public.lc59_milestones m where m.user_id = v_uid and m.allow_proof and not m.msg_ok;
  select tokens into v_cu from public.lc59_catchup where user_id = v_uid;
  return jsonb_build_object('ok', true, 'linked', true, 'site', l.site, 'uname', l.uname, 'start', l.start_rating, 'last', l.last_rating, 'peak', l.peak_rating,
    'peak_gain', greatest(0, l.peak_rating - l.start_rating), 'catchup', coalesce(v_cu, 0), 'claimed', v_done, 'due', v_due, 'upgradable', v_up,
    'proof', jsonb_build_object('allow_web', coalesce(pr.allow_web, false), 'allow_app', coalesce(pr.allow_app, false), 'first_name', pr.first_name,
                                'msg_status', coalesce(pr.msg_status, 'none'), 'result_approved', coalesce(pr.result_approved, false)));
end $$;

-- claim the reward for the highest due milestone. Lower due milestones give 1 token each automatically.
--   1 token: reaching it.  2 tokens: also allowing the result on the website.  3 tokens: also a real message.
create or replace function public.lc59_milestone_claim(p_level integer, p_allow boolean, p_first text, p_message text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text := public._lc26_email(); l public.lc59_links; v_msg text := nullif(btrim(coalesce(p_message, '')), ''); v_ok boolean := false;
        v_nice boolean := false; v_tok integer; v_first text := nullif(btrim(coalesce(p_first, '')), ''); v_low integer := 0; g integer; v_max integer := public._lc59_cfg('milestone_max', 3200)::int;
begin
  if v_uid is null or v_email = '' then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  if to_regclass('public.lc36_token_credits') is null then return jsonb_build_object('ok', false, 'error', 'credits_missing'); end if;
  select * into l from public.lc59_links where user_id = v_uid;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_linked'); end if;
  if p_level is null or p_level % 100 <> 0 or p_level > v_max or p_level <= (l.start_rating / 100) * 100 or p_level > (l.peak_rating / 100) * 100 then
    return jsonb_build_object('ok', false, 'error', 'not_reached');
  end if;
  if exists (select 1 from public.lc59_milestones m where m.user_id = v_uid and m.level = p_level) then return jsonb_build_object('ok', false, 'error', 'already_claimed'); end if;
  if coalesce(p_allow, false) then
    if v_first is null or v_first !~ '^[[:alpha:]][[:alpha:] ''-]{1,23}$' then return jsonb_build_object('ok', false, 'error', 'first_name'); end if;
    v_ok := v_msg is not null and public._lc59_msg_ok(v_msg);
    v_nice := v_msg is not null and not v_ok;
  else v_msg := null; end if;
  v_tok := 1 + (case when coalesce(p_allow, false) then 1 else 0 end) + (case when v_ok then 1 else 0 end);
  begin
    insert into public.lc59_milestones (user_id, email, level, tokens, allow_proof, message, msg_ok, nice_try) values (v_uid, v_email, p_level, v_tok, coalesce(p_allow, false), v_msg, v_ok, v_nice);
  exception when unique_violation then return jsonb_build_object('ok', false, 'error', 'already_claimed'); end;
  insert into public.lc36_token_credits (email, tokens, pack, amount_cents, session_id) values (v_email, v_tok, 'milestone', 0, 'ms:' || v_uid::text || ':' || p_level::text) on conflict (session_id) do nothing;
  -- lower milestones that were never claimed: 1 token each, nobody loses a milestone by jumping two hundreds at once
  for g in select x from generate_series(((l.start_rating / 100) + 1) * 100, p_level - 100, 100) x
            where not exists (select 1 from public.lc59_milestones m where m.user_id = v_uid and m.level = x) loop
    insert into public.lc59_milestones (user_id, email, level, tokens) values (v_uid, v_email, g, 1) on conflict do nothing;
    if found then
      insert into public.lc36_token_credits (email, tokens, pack, amount_cents, session_id) values (v_email, 1, 'milestone', 0, 'ms:' || v_uid::text || ':' || g::text) on conflict (session_id) do nothing;
      v_low := v_low + 1;
    end if;
  end loop;
  if coalesce(p_allow, false) then
    insert into public.lc59_proof (user_id, email, first_name, allow_web, allow_app, message, msg_status)
    values (v_uid, v_email, v_first, true, true, case when v_ok then v_msg end, case when v_ok then 'pending' else 'none' end)
    on conflict (user_id) do update set first_name = excluded.first_name, allow_web = true, allow_app = true, updated_at = now(),
      message = case when v_ok then excluded.message else public.lc59_proof.message end,
      msg_status = case when v_ok then 'pending' else public.lc59_proof.msg_status end;
  end if;
  return jsonb_build_object('ok', true, 'level', p_level, 'tokens', v_tok, 'extra_levels', v_low, 'extra_tokens', v_low, 'nice_try', v_nice, 'message_ok', v_ok, 'allow', coalesce(p_allow, false));
end $$;

-- a milestone that gave 2 tokens (result allowed, no real message): a real message later unlocks the 3rd token, once
create or replace function public.lc59_message_upgrade(p_level integer, p_message text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text := public._lc26_email(); m public.lc59_milestones; v_msg text := nullif(btrim(coalesce(p_message, '')), '');
begin
  if v_uid is null or v_email = '' then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  select * into m from public.lc59_milestones where user_id = v_uid and level = p_level for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_claimed'); end if;
  if not m.allow_proof then return jsonb_build_object('ok', false, 'error', 'proof_not_allowed'); end if;
  if m.msg_ok then return jsonb_build_object('ok', false, 'error', 'already_upgraded'); end if;
  if v_msg is null or not public._lc59_msg_ok(v_msg) then
    update public.lc59_milestones set nice_try = (v_msg is not null) where id = m.id;
    return jsonb_build_object('ok', false, 'error', 'not_valuable', 'nice_try', v_msg is not null);
  end if;
  update public.lc59_milestones set msg_ok = true, nice_try = false, message = v_msg, tokens = tokens + 1 where id = m.id;
  insert into public.lc36_token_credits (email, tokens, pack, amount_cents, session_id) values (v_email, 1, 'milestone', 0, 'ms:' || v_uid::text || ':' || p_level::text || ':up') on conflict (session_id) do nothing;
  insert into public.lc59_proof (user_id, email, allow_web, allow_app, message, msg_status) values (v_uid, v_email, true, true, v_msg, 'pending')
    on conflict (user_id) do update set message = excluded.message, msg_status = 'pending', updated_at = now();
  return jsonb_build_object('ok', true, 'tokens', 1);
end $$;

-- the member can change their mind about the website at any time
create or replace function public.lc59_proof_set(p_allow_web boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  update public.lc59_proof set allow_web = coalesce(p_allow_web, false), updated_at = now() where user_id = v_uid;
  return jsonb_build_object('ok', true, 'allow_web', coalesce(p_allow_web, false));
end $$;

-- THE LANDING PAGE: ranked Proof Queue. 1 = approved message + approved result, 2 = approved result without a message, 3 = approved message only.
-- Only first name, site, ratings, days and the approved message leave the database. Never an e-mail.
create or replace function public.lc59_wall_public() returns jsonb language sql stable security definer set search_path = public as $$
  with base as (
    select p.user_id, p.first_name, p.message, p.msg_status, p.result_approved, p.updated_at, l.site, l.start_rating, l.peak_rating, l.linked_at, l.last_at,
           greatest(0, coalesce(l.peak_rating, 0) - coalesce(l.start_rating, 0)) as gain
      from public.lc59_proof p left join public.lc59_links l on l.user_id = p.user_id
     where p.allow_web and p.first_name is not null),
  r as (
    select b.*, (b.result_approved and b.gain >= public._lc59_cfg('wall_min_gain', 50)) as has_result, (b.msg_status = 'approved' and b.message is not null) as has_msg from base b),
  k as (
    select r.*, case when has_result and has_msg then 1 when has_result then 2 when has_msg then 3 end as kind from r)
  select jsonb_build_object('ok', true, 'rows', coalesce(jsonb_agg(jsonb_build_object(
      'kind', k.kind, 'first_name', k.first_name, 'site', case when k.kind <= 2 then k.site end, 'start', case when k.kind <= 2 then k.start_rating end,
      'peak', case when k.kind <= 2 then k.peak_rating end, 'gain', case when k.kind <= 2 then k.gain end,
      'days', case when k.kind <= 2 then greatest(0, (k.last_at::date - k.linked_at::date)) end,
      'message', case when k.kind in (1, 3) then k.message end, 'at', k.updated_at) order by k.kind, k.gain desc, k.updated_at desc), '[]'::jsonb))
    from (select * from k where kind is not null order by kind, gain desc, updated_at desc limit 40) k
$$;

-- OWNER (Admin mode): everything waiting for a decision, with the numbers to check on Chess.com / Lichess first
create or replace function public.lc59_admin_queue() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok', true, 'rows', coalesce((
    select jsonb_agg(jsonb_build_object('user_id', p.user_id, 'first_name', p.first_name, 'email', p.email, 'allow_web', p.allow_web, 'message', p.message, 'msg_status', p.msg_status,
      'result_approved', p.result_approved, 'site', l.site, 'uname', l.uname, 'start', l.start_rating, 'peak', l.peak_rating, 'last', l.last_rating,
      'gain', greatest(0, coalesce(l.peak_rating, 0) - coalesce(l.start_rating, 0)), 'linked_at', l.linked_at, 'updated_at', p.updated_at) order by (p.msg_status = 'pending' or not p.result_approved) desc, p.updated_at desc)
      from public.lc59_proof p left join public.lc59_links l on l.user_id = p.user_id where p.allow_web), '[]'::jsonb));
end $$;
create or replace function public.lc59_admin_set(p_user uuid, p_result boolean, p_msg text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  if p_msg is not null and p_msg not in ('approved', 'rejected', 'pending') then return jsonb_build_object('ok', false, 'error', 'bad_status'); end if;
  update public.lc59_proof set result_approved = coalesce(p_result, result_approved), msg_status = coalesce(p_msg, msg_status), note = coalesce(p_note, note), updated_at = now() where user_id = p_user;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public._lc59_cfg(text, numeric), public._lc59_msg_ok(text) from public, anon, authenticated;
revoke all on function public.lc59_link_record(uuid, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.lc59_status(), public.lc59_milestone_claim(integer, boolean, text, text), public.lc59_message_upgrade(integer, text), public.lc59_proof_set(boolean),
                       public.lc59_admin_queue(), public.lc59_admin_set(uuid, boolean, text, text), public.lc59_wall_public() from public, anon;
do $$ begin
  grant execute on function public.lc59_link_record(uuid, text, text, text, integer) to service_role;
  grant execute on function public.lc59_status(), public.lc59_milestone_claim(integer, boolean, text, text), public.lc59_message_upgrade(integer, text), public.lc59_proof_set(boolean),
                            public.lc59_admin_queue(), public.lc59_admin_set(uuid, boolean, text, text) to authenticated, service_role;
  grant execute on function public.lc59_wall_public() to anon, authenticated, service_role;
exception when undefined_object then null; end $$;
