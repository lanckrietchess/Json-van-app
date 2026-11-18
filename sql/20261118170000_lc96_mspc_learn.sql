-- LC96 (9.61.0): the MSPC System page (#learn-mspc) and the new MSPC trainer (#think = Kyenzo's Games).
-- 1. lc89_cfg gets a third key, 'mspc': Kyenzo's own texts for the page (intro, M / S / P / C, how he uses it, how you use it)
--    and the example positions from his games, each with his comment per step. Written in the app by the owner (lc89_cfg_save),
--    read by everyone (lc89_cfg_public), 30 versions of history like 'landing' and 'paywall'.
-- 2. mg_examples(p_n): the hardest positions from Kyenzo's games per kind of thinking (the game still open, no recapture, no king step
--    for a plan or a quiet move), as candidates for the examples:
--    tactic (a forcing move that wins), brilliant (a real sacrifice), quiet (a quiet move that wins), plan (the only good quiet move
--    in a level position), defence (the only move that holds), endgame (the only move in an endgame). Hardest first: the biggest gap
--    between the best and the second-best move, games at 1600+ first.
-- Needs: sql/20261116100000_lc89_lc90_inline_cms_founding_paywall.sql and sql/20261118150000_lc95_master_games.sql. Runs twice safely.

alter table public.lc89_cfg drop constraint if exists lc89_cfg_k_check;
alter table public.lc89_cfg add constraint lc89_cfg_k_check check (k in ('landing', 'paywall', 'mspc'));
alter table public.lc89_cfg_history drop constraint if exists lc89_cfg_history_k_check;
alter table public.lc89_cfg_history add constraint lc89_cfg_history_k_check check (k in ('landing', 'paywall', 'mspc'));

create or replace function public.lc89_cfg_save(p_k text, p_v jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare old jsonb; err text;
begin
  perform public._lc_require_admin();
  if p_k not in ('landing', 'paywall', 'mspc') then return jsonb_build_object('ok', false, 'error', 'key'); end if;
  if p_v is null or jsonb_typeof(p_v) <> 'object' then return jsonb_build_object('ok', false, 'error', 'shape'); end if;
  if octet_length(p_v::text) > 300000 then return jsonb_build_object('ok', false, 'error', 'too_big'); end if;
  if public._lc89_unsafe(p_v) then return jsonb_build_object('ok', false, 'error', 'unsafe'); end if;
  if p_k = 'paywall' then err := public._lc89_paywall_error(p_v); if err <> '' then return jsonb_build_object('ok', false, 'error', err); end if; end if;
  select v into old from public.lc89_cfg where k = p_k;
  if old is not null and old <> '{}'::jsonb then
    insert into public.lc89_cfg_history (k, v, saved_by) values (p_k, old, public._lc89_email());
    delete from public.lc89_cfg_history where k = p_k and id not in (select id from public.lc89_cfg_history where k = p_k order by id desc limit 30);
  end if;
  insert into public.lc89_cfg (k, v, updated_at, updated_by) values (p_k, p_v, now(), public._lc89_email())
    on conflict (k) do update set v = excluded.v, updated_at = now(), updated_by = excluded.updated_by;
  return jsonb_build_object('ok', true, 'updated_at', now());
end $$;

create or replace function public.mg_examples(p_n int default 8)
returns table (cat text, id text, kind text, fen text, side char(1), played text, played_san text, best text, best_san text, solution text[],
  line text[], prev text, prev_fen text, eval_before int, eval_after int, gap numeric, my_rating int, tier text, eco text, opening text,
  phase text, tags text[], game_id text, time_class text, end_time timestamptz)
language sql stable set search_path = public as $$
  with c as (
    select p.*,
      case
        when p.kind = 'brilliant' then 'brilliant'
        when p.phase = 'endgame' and p.kind in ('great', 'punish') then 'endgame'
        when p.kind = 'great' and coalesce(p.eval_before, 0) <= -60 then 'defence'
        when p.kind in ('great', 'punish') and p.tags && array['check', 'capture'] then 'tactic'
        when p.kind = 'great' and not (p.tags && array['check', 'capture']) and coalesce(p.played_san, '') not like 'K%' and abs(coalesce(p.eval_before, 0)) <= 120 and coalesce(p.eval_after, 0) - coalesce(p.eval_before, 0) < 150 then 'plan'
        when p.kind in ('great', 'punish') and not (p.tags && array['check', 'capture']) and coalesce(p.played_san, '') not like 'K%' then 'quiet'
      end as cat
    from public.master_puzzles p
    where not p.hidden and p.kind in ('brilliant', 'great', 'punish') and array_length(p.solution, 1) >= 1
      -- hard to find, not just the last blow: the game is still open (no mate on the board, not already +3.5), and not a recapture
      and abs(coalesce(p.eval_before, 0)) <= 350
      and not (p.prev is not null and substr(p.played, 3, 2) = substr(p.prev, 3, 2))
  ), r as (
    select c.*, row_number() over (partition by c.cat order by (c.my_rating >= 1600) desc, c.featured desc, coalesce(c.gap, 0) desc, c.end_time desc) as rn
    from c where c.cat is not null
  )
  select r.cat, r.id, r.kind, r.fen, r.side, r.played, r.played_san, r.best, r.best_san, r.solution, r.line, r.prev, r.prev_fen,
    r.eval_before, r.eval_after, r.gap, r.my_rating, r.tier, r.eco, r.opening, r.phase, r.tags, r.game_id, r.time_class, r.end_time
  from r where r.rn <= least(greatest(coalesce(p_n, 8), 1), 30)
  order by r.cat, r.rn
$$;
grant execute on function public.mg_examples(int) to anon, authenticated;
