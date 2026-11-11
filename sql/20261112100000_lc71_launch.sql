-- LC71 (build 9.36.0): launch polish. Run AFTER the LC61/LC62 file, the LC65 file, the LC68/LC69 file and the LC70 file. Safe to run twice.
-- 1. Trim: "What should have warned you here?" shows approved answers of other players (lc71_warn_list).
-- 2. Community leaderboard: every member who used the community appears (also with 0 points), the coach is pinned on top,
--    the caller is listed right under the coach with their real rank (lc65_c39_board replaced).
-- 3. Library: lessons keep a folder name, and a lesson can be a PGN (an opening for the opening trainer) instead of a video (_lc70_videos replaced).

-- ---------- 1. approved warnings for a position ----------
create or replace function public.lc71_warn_list(p_fen text, p_alarm text, p_letter text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare f text := split_part(coalesce(p_fen,''),' ',1);
begin
  return jsonb_build_object('ok',true,'rows',coalesce((
    select jsonb_agg(jsonb_build_object('name',coalesce(nullif(btrim(first_name),''),'A player'),'text',body,'match',m) order by m, created_at desc)
    from (
      select first_name, body, created_at,
        case when f <> '' and split_part(fen,' ',1) = f then 1
             when coalesce(p_alarm,'') <> '' and alarm = p_alarm then 2
             when coalesce(p_letter,'') <> '' and letter = p_letter then 3 else 4 end m
      from public.lc61_warnings where status = 'approved'
      order by 3, created_at desc limit 200) q
    where m < 4 limit 8),'[]'::jsonb));
end $$;
revoke all on function public.lc71_warn_list(text,text,text) from public;
grant execute on function public.lc71_warn_list(text,text,text) to anon, authenticated;

-- ---------- 2. community leaderboard ----------
create or replace function public.lc65_c39_board(p_a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); mp int; owner_id uuid; my_rank int; total int; rows jsonb;
begin
  if uid is null then return jsonb_build_object('ok',false,'status',200,'reason','auth'); end if;
  if coalesce(p_a->>'name','') <> '' then perform public._lc65_touch(p_a->>'name');
  elsif not exists(select 1 from public.lc65_members where user_id = uid) then perform public._lc65_touch('Member'); end if;
  select id into owner_id from auth.users where lower(email) = 'lanckrietchess@gmail.com' limit 1;
  mp := public._lc65_pts(uid);
  with b as (select m.user_id, public._lc65_pts(m.user_id) pts, m.updated_at upd from public.lc65_members m where m.user_id is distinct from owner_id),
       r as (select user_id, row_number() over (order by pts desc, upd asc) rk from b)
  select (select count(*) from b), (select rk from r where user_id = uid) into total, my_rank;
  rows := '[]'::jsonb;
  if owner_id is not null then
    rows := rows || jsonb_build_array(jsonb_build_object('name',coalesce((select name from public.lc65_members where user_id=owner_id),'Kyenzo'),'coach',true,
      'level',public._lc65_level(public._lc65_pts(owner_id)),'pts',public._lc65_pts(owner_id),'rank',null,'you',uid = owner_id));
  end if;
  if uid is distinct from owner_id then
    rows := rows || jsonb_build_array(jsonb_build_object('name',coalesce((select name from public.lc65_members where user_id=uid),'Member'),'you',true,
      'level',public._lc65_level(mp),'pts',mp,'rank',my_rank));
  end if;
  rows := rows || coalesce((
    with b as (select m.user_id, m.name, public._lc65_pts(m.user_id) pts, m.updated_at upd from public.lc65_members m where m.user_id is distinct from owner_id),
         q as (select user_id, name, pts, row_number() over (order by pts desc, upd asc) rk from b)
    select jsonb_agg(jsonb_build_object('name',name,'level',public._lc65_level(pts),'pts',pts,'rank',rk) order by rk) from q where q.user_id <> uid and rk <= 30),'[]'::jsonb);
  return jsonb_build_object('ok',true,'status',200,'me',jsonb_build_object('level',public._lc65_level(mp),'pts',mp,'next',public._lc65_next(mp),'rank',my_rank,'total',total),'board',rows);
end $$;
grant execute on function public.lc65_c39_board(jsonb) to authenticated;

-- ---------- 3. library lessons: folders and PGN openings ----------
create or replace function public._lc70_videos(p jsonb) returns jsonb
language plpgsql immutable as $$
declare out jsonb := '[]'::jsonb; v jsonb; t text; u text; f text; g text; sd text;
begin
  if p is null or jsonb_typeof(p) <> 'array' then return out; end if;
  for v in select * from jsonb_array_elements(p) limit 200 loop
    if jsonb_typeof(v) <> 'object' then continue; end if;
    t := left(btrim(coalesce(v->>'title','')), 120); u := btrim(coalesce(v->>'url',''));
    f := left(btrim(regexp_replace(coalesce(v->>'folder',''),'[<>]','','g')), 80);
    g := btrim(coalesce(v->>'pgn',''));
    sd := case when v->>'side' in ('w','b') then v->>'side' else '' end;
    if g <> '' then
      if char_length(g) <= 20000 then
        out := out || jsonb_build_array(jsonb_build_object('title', coalesce(nullif(t,''),'Opening'), 'pgn', g, 'folder', f, 'side', sd));
      end if;
    elsif u ~ '^https://(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com|m\.youtube\.com)/' and char_length(u) <= 300 then
      out := out || jsonb_build_array(jsonb_build_object('title', coalesce(nullif(t,''),'Lesson'), 'url', u, 'folder', f));
    end if;
  end loop;
  return out;
end $$;
revoke all on function public._lc70_videos(jsonb) from public, anon, authenticated;
