-- 9.82.0: three positions in Kyenzo's games were stored as "brilliant" although the move itself gives no material
-- (f4 and h6 are pawn moves, Qxg5+ is a queen trade). tools/master_games.py had the same fault as the Studio scan:
-- a deficit after the mover's NEXT move in the engine line counted as a sacrifice. They are only moves, so they become "great".
-- The app already shows them as "The only move" without this file (brilliantChecked); this keeps the database honest.
-- Idempotent: a second run changes nothing.
with fixed as (
  update public.master_puzzles set kind = 'great'
   where kind = 'brilliant' and id in ('95807942916-28', '185685991862-47', '186083816974-58')
  returning game_id
)
update public.my_master_games g
   set brilliant = greatest(0, coalesce(g.brilliant, 0) - 1)
  from fixed
 where g.id::text = fixed.game_id::text;
