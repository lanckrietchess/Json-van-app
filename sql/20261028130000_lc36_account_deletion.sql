-- LC36 account deletion (hub 9.14.0). Google Play requires, for an app that lets people create an account: an in-app path to delete the account AND the
-- data linked to it, plus a web page where a deletion can be requested without installing the app (Play Console help 13327111, read 2026-10-28).
-- Idempotent. Not applied by the assistant. FK facts below were read from your live project on 2026-10-28: every table that points at lc7_members
-- cascades or sets null, except lc14_keys (issued_to, redeemed_by: no action), which is cleared first.
--
-- What is deleted for a member: the member row and everything that cascades from it (referrals, friendships, badges, rating snapshots, plan link,
-- stars, ledger, rivals, golden tickets, discount codes ...), the cloud progress (lc8_member_state). Kept on purpose: paid licences and purchase records
-- (tax and refund duties), set to null where they pointed at the member. The Arena data of the device is removed by the Arena action account_delete.

create table if not exists public.lc36_deletion_requests (
  id         bigserial primary key,
  email      text        not null check (email = lower(email)),
  note       text,
  status     text        not null default 'open' check (status in ('open', 'done', 'rejected')),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
alter table public.lc36_deletion_requests enable row level security;
revoke all on public.lc36_deletion_requests from anon, authenticated;

-- 1. From the web page: anyone can ask. The answer never says whether the address is known (no account enumeration).
create or replace function public.lc36_request_deletion(p_email text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_email !~ '^[^@[:space:]]{1,64}@[^@[:space:]]{1,120}\.[^@[:space:]]{2,24}$' then return jsonb_build_object('ok', false, 'error', 'bad_email'); end if;
  if not public.lc7_rate_ok('lc36_del_one', v_email, 3, interval '1 day') or not public.lc7_rate_ok('lc36_del_all', 'all', 300, interval '1 day') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  insert into public.lc36_deletion_requests (email, note) values (v_email, left(nullif(btrim(p_note), ''), 500));
  return jsonb_build_object('ok', true);
end $$;

-- 2. In the app: the member deletes the cloud data linked to this device's member.
create or replace function public.lc36_delete_member(p_id uuid, p_token text, p_confirm text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if public.lc7_auth(p_id, p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if upper(btrim(coalesce(p_confirm, ''))) <> 'DELETE' then return jsonb_build_object('ok', false, 'error', 'confirm'); end if;
  begin update public.lc14_keys set issued_to = null where issued_to = p_id; exception when undefined_table or undefined_column or not_null_violation then null; end;
  begin update public.lc14_keys set redeemed_by = null where redeemed_by = p_id; exception when undefined_table or undefined_column or not_null_violation then null; end;
  delete from public.lc8_member_state where id = p_id::text;
  delete from public.lc7_members where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- 3. In the app, for a signed-in member: the email login and its consent record.
create or replace function public.lc36_delete_login() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_email text := public._lc26_email(); v_uid uuid := auth.uid();
begin
  if v_email = '' or v_uid is null then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  delete from public.lc36_email_consent where email = v_email;
  delete from auth.users where id = v_uid;
  update public.lc36_deletion_requests set status = 'done', handled_at = now() where email = v_email and status = 'open';
  return jsonb_build_object('ok', true);
end $$;

-- 4. Admin: the open requests, and handling one by email (login + consent). Member data without an email can only be removed by the member (in the app).
create or replace function public.lc36_admin_deletion_requests() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok', true, 'rows', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'email', email, 'note', note, 'status', status, 'created_at', created_at,
      'has_login', exists (select 1 from auth.users u where lower(u.email) = r.email)) order by created_at desc) from public.lc36_deletion_requests r where status = 'open'), '[]'::jsonb));
end $$;
create or replace function public.lc36_admin_delete_by_email(p_email text) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_n integer;
begin
  perform public._lc_require_admin();
  if v_email = '' then return jsonb_build_object('ok', false, 'error', 'bad_email'); end if;
  delete from public.lc36_email_consent where email = v_email;
  delete from auth.users where lower(email) = v_email; get diagnostics v_n = row_count;
  update public.lc36_deletion_requests set status = 'done', handled_at = now() where email = v_email and status = 'open';
  return jsonb_build_object('ok', true, 'login_deleted', v_n);
end $$;

revoke all on function public.lc36_request_deletion(text, text), public.lc36_delete_member(uuid, text, text) from public;
revoke all on function public.lc36_delete_login(), public.lc36_admin_deletion_requests(), public.lc36_admin_delete_by_email(text) from public, anon;
grant execute on function public.lc36_request_deletion(text, text), public.lc36_delete_member(uuid, text, text) to anon, authenticated, service_role;
grant execute on function public.lc36_delete_login(), public.lc36_admin_deletion_requests(), public.lc36_admin_delete_by_email(text) to authenticated, service_role;
