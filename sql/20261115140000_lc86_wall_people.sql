-- LC86 (build 9.46.0): the person-by-person Wall of Love on the landing page, managed by the owner in the app (#wall-cms).
-- Idempotent: safe to run twice. Never applied by the assistant: the owner runs it in the Supabase SQL editor.
-- Needs (earlier migrations): public._lc_require_admin(). Screenshots and avatars are uploaded to the public bucket lc72-landing
-- (sql/20261113100000_lc72_lc73_launch_funnels.sql creates it and lets only the owner upload).
--
-- One row = one person: first name, a result tag ("+630 Elo in 6 weeks"), an avatar (https URL or empty = initials) and an ordered list of
-- proof items: screenshots {"t":"img","url":"https://…","cap":"…"} and chat lines {"t":"msg","from":"member"|"coach","text":"…"}.
-- Only the owner reads the full list and saves; the landing page reads visible people through lc86_wall_public().

create table if not exists public.lc86_wall_people (
  id         bigserial primary key,
  name       text not null check (char_length(name) between 1 and 40),
  tag        text not null default '' check (char_length(tag) <= 60),
  avatar     text not null default '' check (avatar = '' or avatar ~ '^https://'),
  items      jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 24),
  visible    boolean not null default true,
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.lc86_wall_people enable row level security;   -- no policies: only the functions below read or write it
revoke all on table public.lc86_wall_people from public, anon, authenticated;

-- strip control characters and angle brackets, trim, cut
create or replace function public._lc86_clean(p text, n int) returns text language sql immutable as $$
  select left(btrim(regexp_replace(coalesce(p, ''), '[\u0000-\u0008\u000b\u000c\u000e-\u001f<>]', '', 'g')), n) $$;

-- the proof items, rebuilt from scratch: only known shapes survive
create or replace function public._lc86_items(p jsonb) returns jsonb language plpgsql immutable as $$
declare x jsonb; out jsonb := '[]'::jsonb; u text; t text;
begin
  if p is null or jsonb_typeof(p) <> 'array' then return out; end if;
  for x in select value from jsonb_array_elements(p) loop
    exit when jsonb_array_length(out) >= 24;
    if jsonb_typeof(x) <> 'object' then continue; end if;
    if x->>'t' = 'img' then
      u := btrim(coalesce(x->>'url', ''));
      if u !~ '^https://[^\s"''<>]+$' or char_length(u) > 400 then continue; end if;
      out := out || jsonb_build_array(jsonb_build_object('t', 'img', 'url', u, 'cap', public._lc86_clean(x->>'cap', 140)));
    elsif x->>'t' = 'msg' then
      t := public._lc86_clean(x->>'text', 1000);
      if t = '' then continue; end if;
      out := out || jsonb_build_array(jsonb_build_object('t', 'msg', 'from', case when x->>'from' = 'coach' then 'coach' else 'member' end, 'text', t));
    end if;
  end loop;
  return out;
end $$;

-- public: the visible people, in the owner's order
create or replace function public.lc86_wall_public() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', true, 'rows', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'tag', tag, 'avatar', avatar, 'items', items)
    order by sort, id) from public.lc86_wall_people where visible), '[]'::jsonb))
$$;

-- owner: everything, hidden people included
create or replace function public.lc86_wall_admin() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  return jsonb_build_object('ok', true, 'rows', coalesce((select jsonb_agg(to_jsonb(w) order by w.sort, w.id) from public.lc86_wall_people w), '[]'::jsonb));
end $$;

-- owner: add (no id) or change one person
create or replace function public.lc86_wall_save(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_name text := public._lc86_clean(p->>'name', 40); v_av text := btrim(coalesce(p->>'avatar', '')); n int;
begin
  perform public._lc_require_admin();
  if v_name = '' then return jsonb_build_object('ok', false, 'error', 'name'); end if;
  if v_av <> '' and (v_av !~ '^https://[^\s"''<>]+$' or char_length(v_av) > 400) then return jsonb_build_object('ok', false, 'error', 'avatar'); end if;
  if public._lc86_clean(p->>'tag', 60) ~* '\m(lifetime|forever|guarantee[ds]?)\M' then return jsonb_build_object('ok', false, 'error', 'wording'); end if;
  begin v_id := nullif(p->>'id', '')::bigint; exception when others then return jsonb_build_object('ok', false, 'error', 'invalid'); end;
  if v_id is null then
    select count(*) into n from public.lc86_wall_people; if n >= 100 then return jsonb_build_object('ok', false, 'error', 'full'); end if;
    insert into public.lc86_wall_people (name) values (v_name) returning id into v_id;
  end if;
  update public.lc86_wall_people set name = v_name, tag = public._lc86_clean(p->>'tag', 60), avatar = v_av, items = public._lc86_items(p->'items'),
    visible = coalesce((p->>'visible')::boolean, true), sort = coalesce(nullif(p->>'sort', '')::int, 0), updated_at = now()
   where id = v_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'id', v_id);
exception when check_violation or invalid_text_representation or numeric_value_out_of_range then return jsonb_build_object('ok', false, 'error', 'invalid');
end $$;

create or replace function public.lc86_wall_del(p_id bigint) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._lc_require_admin();
  delete from public.lc86_wall_people where id = p_id;
  return jsonb_build_object('ok', found);
end $$;

-- ---------- permissions ----------
revoke all on function public._lc86_clean(text, int), public._lc86_items(jsonb) from public, anon, authenticated;
revoke all on function public.lc86_wall_public(), public.lc86_wall_admin(), public.lc86_wall_save(jsonb), public.lc86_wall_del(bigint) from public, anon, authenticated;
grant execute on function public.lc86_wall_public() to anon, authenticated;
grant execute on function public.lc86_wall_admin(), public.lc86_wall_save(jsonb), public.lc86_wall_del(bigint) to authenticated;
