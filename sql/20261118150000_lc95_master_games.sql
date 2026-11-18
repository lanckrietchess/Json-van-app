-- LC95 (9.60.0): Kyenzo's Games. Kyenzo's own rated rapid + blitz Chess.com games, analysed by tools/master_games.py
-- (GitHub workflow "Kyenzo's Games (analysis)", results on the branch master-data), loaded here and read by the app.
-- Tables: public.my_master_games (one row per game) and public.master_puzzles (the trainable positions:
--   brilliant / great / punish = Kyenzo found it, missed / blunder / mistake = Kyenzo went wrong, by rating tier).
-- Loading: select public.mg_pull();  -- asks GitHub for master/data/index.json and every file in it (pg_net, async)
--          select public.mg_collect(); -- turns the answers that arrived into rows (run it again until 'pending' is 0)
--          pg_cron: mg_pull every Monday 06:07 UTC, mg_collect every 10 minutes (a no-op when nothing is pending).
-- Filters (anyone can call them; the app's Pro gate is in the app, like the courses): mg_puzzles, mg_openings, mg_tiers,
--          mg_daily, mg_game. Owner only (public.is_admin()): mg_admin_sync, mg_curate.
-- No opponent names are stored. The PGNs are Kyenzo's public Chess.com games.
-- Needs: pg_net (installed), public.is_admin(); pg_cron is optional (the cron lines are skipped without it). Runs twice safely.

create table if not exists public.my_master_games (
  id text primary key,
  url text,
  end_time timestamptz,
  time_class text check (time_class in ('rapid','blitz')),
  time_control text,
  color char(1) check (color in ('w','b')),
  my_rating int,
  opp_rating int,
  tier text,
  result text check (result in ('win','draw','loss')),
  termination text,
  eco text,
  opening text,
  eco_url text,
  plies int,
  pgn text not null,
  evals int[],
  acc_me numeric(5,1),
  acc_opp numeric(5,1),
  chesscom_acc_me numeric(5,2),
  chesscom_acc_opp numeric(5,2),
  brilliant int default 0, great int default 0, blunder int default 0, mistake int default 0, inaccuracy int default 0, opp_blunder int default 0,
  analysis_v int default 1,
  loaded_at timestamptz default now()
);
create index if not exists my_master_games_eco on public.my_master_games (eco);
create index if not exists my_master_games_tier on public.my_master_games (tier);
create index if not exists my_master_games_end on public.my_master_games (end_time desc);

create table if not exists public.master_puzzles (
  id text primary key,
  game_id text not null references public.my_master_games(id) on delete cascade,
  ply int not null,
  kind text not null check (kind in ('brilliant','great','punish','missed','blunder','mistake')),
  fen text not null,
  side char(1) not null check (side in ('w','b')),
  played text, played_san text,
  best text, best_san text,
  solution text[] not null default '{}',
  line text[] default '{}',
  reply text[] default '{}',
  prev text, prev_fen text,
  eval_before int, eval_after int,
  loss numeric(5,3), gap numeric(5,3),
  my_rating int, tier text,
  eco text, opening text,
  phase text check (phase in ('opening','middlegame','endgame')),
  tags text[] default '{}',
  time_class text,
  end_time timestamptz,
  featured boolean not null default false,
  hidden boolean not null default false
);
create index if not exists master_puzzles_kind on public.master_puzzles (kind, tier);
create index if not exists master_puzzles_eco on public.master_puzzles (eco);
create index if not exists master_puzzles_game on public.master_puzzles (game_id);

create table if not exists public.master_sync (
  file text primary key,
  req_id bigint,
  state text not null default 'pending' check (state in ('pending','loaded','failed')),
  rows int,
  detail text,
  asked_at timestamptz default now(),
  loaded_at timestamptz
);

alter table public.my_master_games enable row level security;
alter table public.master_puzzles enable row level security;
alter table public.master_sync enable row level security;
drop policy if exists mg_games_read on public.my_master_games;
create policy mg_games_read on public.my_master_games for select to anon, authenticated using (true);
drop policy if exists mg_puzzles_read on public.master_puzzles;
create policy mg_puzzles_read on public.master_puzzles for select to anon, authenticated using (not hidden);
revoke insert, update, delete on public.my_master_games, public.master_puzzles from anon, authenticated;
revoke all on public.master_sync from anon, authenticated;
grant select on public.my_master_games, public.master_puzzles to anon, authenticated;

-- where the workflow publishes (a constant so nobody can point the loader somewhere else)
create or replace function public._mg_base() returns text language sql immutable as
$$ select 'https://raw.githubusercontent.com/lanckrietchess/Json-van-app/master-data/master/data/' $$;

-- ---------- loading ----------
create or replace function public.mg_pull() returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare rid bigint;
begin
  select net.http_get(url := public._mg_base() || 'index.json?t=' || extract(epoch from now())::bigint, timeout_milliseconds := 60000) into rid;
  insert into public.master_sync(file, req_id, state, asked_at, detail) values ('index.json', rid, 'pending', now(), null)
    on conflict (file) do update set req_id = excluded.req_id, state = 'pending', asked_at = now(), detail = null;
  return jsonb_build_object('ok', true, 'index_request', rid);
end $$;

create or replace function public._mg_load_games(j jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.my_master_games as g (id, url, end_time, time_class, time_control, color, my_rating, opp_rating, tier, result, termination,
    eco, opening, eco_url, plies, pgn, evals, acc_me, acc_opp, chesscom_acc_me, chesscom_acc_opp,
    brilliant, great, blunder, mistake, inaccuracy, opp_blunder, analysis_v, loaded_at)
  select r->>'id', r->>'url', to_timestamp((r->>'end_time')::bigint), r->>'time_class', r->>'time_control', r->>'color',
    (r->>'my_rating')::int, (r->>'opp_rating')::int, r->>'tier', r->>'result', left(r->>'termination', 40),
    r->>'eco', left(r->>'opening', 160), r->>'eco_url', (r->>'plies')::int, r->>'pgn',
    array(select (x)::int from jsonb_array_elements_text(r->'evals') x),
    (r->>'acc_me')::numeric, (r->>'acc_opp')::numeric, (r->>'chesscom_acc_me')::numeric, (r->>'chesscom_acc_opp')::numeric,
    coalesce((r->'counts'->>'brilliant')::int,0), coalesce((r->'counts'->>'great')::int,0), coalesce((r->'counts'->>'blunder')::int,0),
    coalesce((r->'counts'->>'mistake')::int,0), coalesce((r->'counts'->>'inaccuracy')::int,0), coalesce((r->'counts'->>'opp_blunder')::int,0),
    coalesce((r->>'v')::int, 1), now()
  from jsonb_array_elements(j) r
  where r->>'id' is not null and r->>'pgn' is not null and r->>'time_class' in ('rapid','blitz')
  on conflict (id) do update set url = excluded.url, end_time = excluded.end_time, my_rating = excluded.my_rating, opp_rating = excluded.opp_rating,
    tier = excluded.tier, result = excluded.result, termination = excluded.termination, eco = excluded.eco, opening = excluded.opening,
    eco_url = excluded.eco_url, plies = excluded.plies, pgn = excluded.pgn, evals = excluded.evals, acc_me = excluded.acc_me,
    acc_opp = excluded.acc_opp, chesscom_acc_me = excluded.chesscom_acc_me, chesscom_acc_opp = excluded.chesscom_acc_opp,
    brilliant = excluded.brilliant, great = excluded.great, blunder = excluded.blunder, mistake = excluded.mistake,
    inaccuracy = excluded.inaccuracy, opp_blunder = excluded.opp_blunder, analysis_v = excluded.analysis_v, loaded_at = now();
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public._mg_load_puzzles(j jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.master_puzzles as p (id, game_id, ply, kind, fen, side, played, played_san, best, best_san, solution, line, reply,
    prev, prev_fen, eval_before, eval_after, loss, gap, my_rating, tier, eco, opening, phase, tags, time_class, end_time)
  select r->>'id', r->>'game_id', (r->>'ply')::int,
    -- a king step is an only move at most, never a brilliant sacrifice (the analysis before 18 Nov 2026 labelled 23 of them brilliant)
    case when r->>'kind' = 'brilliant' and r->>'played_san' like 'K%' then 'great' else r->>'kind' end, r->>'fen', r->>'side', r->>'played', r->>'played_san', r->>'best', r->>'best_san',
    array(select x from jsonb_array_elements_text(coalesce(r->'solution','[]')) x),
    array(select x from jsonb_array_elements_text(coalesce(r->'line','[]')) x),
    array(select x from jsonb_array_elements_text(coalesce(r->'reply','[]')) x),
    r->>'prev', r->>'prev_fen', (r->>'eval_before')::int, (r->>'eval_after')::int, (r->>'loss')::numeric, (r->>'gap')::numeric,
    (r->>'my_rating')::int, r->>'tier', r->>'eco', left(r->>'opening', 160), r->>'phase',
    array(select x from jsonb_array_elements_text(coalesce(r->'tags','[]')) x where not (x = 'sacrifice' and r->>'played_san' like 'K%')), r->>'time_class', to_timestamp((r->>'end_time')::bigint)
  from jsonb_array_elements(j) r
  where r->>'id' is not null and r->>'kind' in ('brilliant','great','punish','missed','blunder','mistake')
    -- a mistake that still left Kyenzo clearly better (+1.7 or more) teaches little: not a training position
    and not (r->>'kind' in ('blunder','mistake','missed') and coalesce((r->>'eval_after')::int, 0) >= 170)
    and exists (select 1 from public.my_master_games g where g.id = r->>'game_id')
  on conflict (id) do update set kind = excluded.kind, fen = excluded.fen, side = excluded.side, played = excluded.played,
    played_san = excluded.played_san, best = excluded.best, best_san = excluded.best_san, solution = excluded.solution, line = excluded.line,
    reply = excluded.reply, prev = excluded.prev, prev_fen = excluded.prev_fen, eval_before = excluded.eval_before, eval_after = excluded.eval_after,
    loss = excluded.loss, gap = excluded.gap, my_rating = excluded.my_rating, tier = excluded.tier, eco = excluded.eco, opening = excluded.opening,
    phase = excluded.phase, tags = excluded.tags, time_class = excluded.time_class, end_time = excluded.end_time;
  get diagnostics n = row_count;
  return n;
end $$;

-- the answers that arrived become rows; the index answer queues the files (games before puzzles, so the puzzles find their game)
create or replace function public.mg_collect() returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s record; resp record; j jsonb; f jsonb; rid bigint; n int; done int := 0; failed int := 0;
begin
  for s in select * from public.master_sync where state = 'pending' and req_id is not null
           order by (file = 'index.json') desc, (file like 'games-%') desc, file loop
    select status_code, content, error_msg into resp from net._http_response where id = s.req_id;
    if not found then
      if s.asked_at < now() - interval '30 minutes' then
        update public.master_sync set state = 'failed', detail = 'no answer' where file = s.file; failed := failed + 1;
      end if;
      continue;
    end if;
    if resp.status_code is distinct from 200 then
      update public.master_sync set state = 'failed', detail = left(coalesce(resp.status_code::text, '') || ' ' || coalesce(resp.error_msg, ''), 200) where file = s.file;
      failed := failed + 1; continue;
    end if;
    begin
      j := resp.content::jsonb;
    exception when others then
      update public.master_sync set state = 'failed', detail = 'not JSON' where file = s.file; failed := failed + 1; continue;
    end;
    if s.file = 'index.json' then
      for f in select * from jsonb_array_elements(coalesce(j->'files', '[]')) loop
        continue when (f->>'name') !~ '^(games|puzzles)-[0-9]{4}(-[12])?\.json$';
        select net.http_get(url := public._mg_base() || (f->>'name') || '?t=' || extract(epoch from now())::bigint, timeout_milliseconds := 120000) into rid;
        insert into public.master_sync(file, req_id, state, asked_at, detail) values (f->>'name', rid, 'pending', now(), null)
          on conflict (file) do update set req_id = excluded.req_id, state = 'pending', asked_at = now(), detail = null;
      end loop;
      update public.master_sync set state = 'loaded', rows = jsonb_array_length(coalesce(j->'files','[]')), loaded_at = now() where file = s.file;
      done := done + 1;
    elsif s.file like 'games-%' then
      n := public._mg_load_games(j);
      update public.master_sync set state = 'loaded', rows = n, loaded_at = now() where file = s.file; done := done + 1;
    else
      -- puzzles wait until the games file of the same half year is in
      if exists (select 1 from public.master_sync where file = replace(s.file, 'puzzles-', 'games-') and state = 'pending') then continue; end if;
      n := public._mg_load_puzzles(j);
      update public.master_sync set state = 'loaded', rows = n, loaded_at = now() where file = s.file; done := done + 1;
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'loaded', done, 'failed', failed,
    'pending', (select count(*) from public.master_sync where state = 'pending'),
    'games', (select count(*) from public.my_master_games), 'puzzles', (select count(*) from public.master_puzzles));
end $$;

revoke all on function public.mg_pull(), public.mg_collect(), public._mg_load_games(jsonb), public._mg_load_puzzles(jsonb) from public, anon, authenticated;

-- owner button in the app: pull now / collect now
create or replace function public.mg_admin_sync(p_step text default 'collect') returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'reason', 'owner_only'); end if;
  if p_step = 'pull' then return public.mg_pull(); end if;
  return public.mg_collect() || jsonb_build_object('files', (select coalesce(jsonb_agg(jsonb_build_object('file', file, 'state', state, 'rows', rows, 'detail', detail) order by file), '[]') from public.master_sync));
end $$;

create or replace function public.mg_curate(p_id text, p_hidden boolean default null, p_featured boolean default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'reason', 'owner_only'); end if;
  update public.master_puzzles set hidden = coalesce(p_hidden, hidden), featured = coalesce(p_featured, featured) where id = p_id;
  return jsonb_build_object('ok', found);
end $$;
revoke all on function public.mg_admin_sync(text), public.mg_curate(text, boolean, boolean) from public, anon;
grant execute on function public.mg_admin_sync(text), public.mg_curate(text, boolean, boolean) to authenticated;

-- ---------- filters for the app ----------
-- puzzles: kinds (brilliant, great, punish = find Kyenzo's move; blunder, mistake, missed = find what Kyenzo missed), tier, phase, eco
create or replace function public.mg_puzzles(p_kinds text[] default array['brilliant','great','punish'], p_tier text default null,
  p_phase text default null, p_eco text default null, p_limit int default 20, p_offset int default 0, p_seed text default null)
returns setof public.master_puzzles language sql stable set search_path = public as $$
  select * from public.master_puzzles
  where not hidden and kind = any(p_kinds) and (p_tier is null or tier = p_tier) and (p_phase is null or phase = p_phase)
    and (p_eco is null or eco like p_eco || '%')
  order by featured desc, case when p_seed is null then null else md5(id || p_seed) end, end_time desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100) offset greatest(coalesce(p_offset, 0), 0)
$$;

-- the openings Kyenzo actually played, with his score and the training positions they hold
create or replace function public.mg_openings(p_color text default null, p_min int default 5)
returns table (eco text, opening text, color char(1), games bigint, score numeric, acc numeric, puzzles bigint, mistakes bigint)
language sql stable set search_path = public as $$
  select g.eco, min(g.opening), g.color, count(*),
    round(avg(case g.result when 'win' then 1 when 'draw' then 0.5 else 0 end) * 100, 1),
    round(avg(g.acc_me), 1),
    (select count(*) from public.master_puzzles p where p.eco = g.eco and not p.hidden and p.side = g.color and p.kind in ('brilliant','great','punish')),
    (select count(*) from public.master_puzzles p where p.eco = g.eco and not p.hidden and p.side = g.color and p.kind in ('blunder','mistake','missed'))
  from public.my_master_games g
  where g.eco <> '' and (p_color is null or g.color = p_color)
  group by g.eco, g.color having count(*) >= coalesce(p_min, 5)
  order by count(*) desc
$$;

-- Kyenzo's climb, tier by tier: how many games, his accuracy, blunders per game, what was typical at that level
create or replace function public.mg_tiers()
returns table (tier text, games bigint, acc numeric, blunders_per_game numeric, mistakes_per_game numeric, score numeric, first_game timestamptz, last_game timestamptz, puzzles bigint)
language sql stable set search_path = public as $$
  select g.tier, count(*), round(avg(g.acc_me), 1), round(avg(g.blunder), 2), round(avg(g.mistake), 2),
    round(avg(case g.result when 'win' then 1 when 'draw' then 0.5 else 0 end) * 100, 1), min(g.end_time), max(g.end_time),
    (select count(*) from public.master_puzzles p where p.tier = g.tier and not p.hidden)
  from public.my_master_games g group by g.tier
  order by min(g.my_rating)
$$;

-- the same few positions for everyone on the same day (the free taste)
create or replace function public.mg_daily(p_n int default 3, p_day date default (now() at time zone 'utc')::date)
returns setof public.master_puzzles language sql stable set search_path = public as $$
  select * from public.master_puzzles where not hidden and kind in ('brilliant','great','punish')
  order by md5(id || p_day::text) limit least(greatest(coalesce(p_n, 3), 1), 10)
$$;

create or replace function public.mg_game(p_id text) returns public.my_master_games language sql stable set search_path = public as
$$ select * from public.my_master_games where id = p_id $$;

grant execute on function public.mg_puzzles(text[], text, text, text, int, int, text), public.mg_openings(text, int), public.mg_tiers(),
  public.mg_daily(int, date), public.mg_game(text) to anon, authenticated;

-- ---------- schedule (only where pg_cron exists) ----------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname in ('lc95-mg-pull', 'lc95-mg-collect');
    perform cron.schedule('lc95-mg-pull', '7 6 * * 1', 'select public.mg_pull()');
    perform cron.schedule('lc95-mg-collect', '*/10 * * * *', 'select public.mg_collect()');
  end if;
end $$;
