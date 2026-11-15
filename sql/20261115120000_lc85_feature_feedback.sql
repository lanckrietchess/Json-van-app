-- LC85 (build 9.45.0): feature feedback that a member allowed to be shown, and the owner's approval before it is shown anywhere.
-- Idempotent: safe to run twice. Never applied by the assistant: the owner runs it in the Supabase SQL editor.
-- Needs (earlier migrations): public._lc_require_admin().
--
-- Flow:
--   1. The 💬 button next to the ? of a screen sends every message to public.app_feedback (the Feedback queue), as before.
--   2. Only when the member ticks "Kyenzo may show my words to other players" AND gives 4 or 5 stars, the app ALSO calls lc85_submit:
--      one row in public.lc85_proof with approved = false. Nobody sees it yet.
--   3. The owner opens owner menu > Funnel & social proof, reads it and presses "Show in the app" (lc85_admin_set).
--   4. lc85_proof(feature) returns only approved rows: the text, the stars, the feature and the first name / initials the member chose.
--      Never an e-mail address, never a user id.

create table if not exists public.lc85_proof (
  id          bigint generated always as identity primary key,
  feature     text not null check (feature ~ '^[a-z0-9-]{1,40}$'),
  title       text not null default '' check (char_length(title) <= 60),
  stars       integer not null check (stars between 4 and 5),
  body        text not null check (char_length(body) between 3 and 600),
  who         text check (who is null or char_length(who) <= 24),
  user_id     uuid,
  approved    boolean not null default false,
  approved_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists lc85_proof_feature_idx on public.lc85_proof (feature, approved, created_at desc);
alter table public.lc85_proof enable row level security;   -- no policies: only the functions below read or write it
revoke all on table public.lc85_proof from public, anon, authenticated;

-- a member (signed in or not) offers a message; it waits for the owner
create or replace function public.lc85_submit(p_feature text, p_title text, p_stars integer, p_text text, p_who text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_f text := lower(btrim(coalesce(p_feature, ''))); v_t text := btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g'));
        v_w text := nullif(btrim(regexp_replace(coalesce(p_who, ''), '[^[:alpha:] .''-]', '', 'g')), ''); v_n integer;
begin
  if v_f !~ '^[a-z0-9-]{1,40}$' then return jsonb_build_object('ok', false, 'error', 'bad_feature'); end if;
  if coalesce(p_stars, 0) < 4 or p_stars > 5 then return jsonb_build_object('ok', false, 'error', 'stars'); end if;
  if char_length(v_t) < 3 then return jsonb_build_object('ok', false, 'error', 'short'); end if;
  -- the whole table takes at most 300 new messages an hour, and the same text only once
  select count(*) into v_n from public.lc85_proof where created_at > now() - interval '1 hour';
  if v_n >= 300 then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  if exists (select 1 from public.lc85_proof where feature = v_f and body = left(v_t, 600) and created_at > now() - interval '7 days') then
    return jsonb_build_object('ok', true, 'dup', true);
  end if;
  insert into public.lc85_proof (feature, title, stars, body, who, user_id)
    values (v_f, left(btrim(coalesce(p_title, '')), 60), p_stars, left(v_t, 600), left(v_w, 24), auth.uid());
  return jsonb_build_object('ok', true);
end $$;

-- public: approved messages, the ones for this feature first (same = true), then the newest others; at most 6
create or replace function public.lc85_proof(p_feature text default null) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_f text := lower(btrim(coalesce(p_feature, ''))); v jsonb;
begin
  select coalesce(jsonb_agg(z), '[]'::jsonb) into v from (
    select jsonb_build_object('feature', feature, 'title', title, 'stars', stars, 'text', body, 'who', who, 'same', feature = v_f) z
      from public.lc85_proof where approved
     order by (feature = v_f) desc, approved_at desc nulls last, created_at desc limit 6) s;
  return jsonb_build_object('ok', true, 'rows', v);
end $$;

-- owner: everything that came in (newest first) and the switch
create or replace function public.lc85_admin_list() returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  perform public._lc_require_admin();
  select coalesce(jsonb_agg(z), '[]'::jsonb) into v from (
    select jsonb_build_object('id', id, 'feature', feature, 'title', title, 'stars', stars, 'text', body, 'who', who, 'approved', approved,
           'created_at', created_at) z from public.lc85_proof order by approved, created_at desc limit 200) s;
  return jsonb_build_object('ok', true, 'rows', v);
end $$;

create or replace function public.lc85_admin_set(p_id bigint, p_ok boolean) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  update public.lc85_proof set approved = coalesce(p_ok, false), approved_at = case when coalesce(p_ok, false) then now() else null end where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- permissions ----------
revoke all on function public.lc85_submit(text, text, integer, text, text), public.lc85_proof(text), public.lc85_admin_list(),
  public.lc85_admin_set(bigint, boolean) from public, anon, authenticated;
grant execute on function public.lc85_submit(text, text, integer, text, text), public.lc85_proof(text) to anon, authenticated;
grant execute on function public.lc85_admin_list(), public.lc85_admin_set(bigint, boolean) to authenticated;
