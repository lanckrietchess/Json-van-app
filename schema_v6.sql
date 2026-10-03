
-- v6 (hub 6.0.0): the Executive layer. Master Event Engine, community benchmarks, Arena rating. Safe to run more than once.
CREATE TABLE IF NOT EXISTS v6_events (id TEXT PRIMARY KEY, doc TEXT NOT NULL, t_start INTEGER NOT NULL DEFAULT 0, t_end INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, updated INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS v6_events_window ON v6_events (active, t_start, t_end);
CREATE TABLE IF NOT EXISTS v6_cfg (k TEXT PRIMARY KEY, v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS v6_bench (period TEXT NOT NULL, pid TEXT NOT NULL, xp INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0, puzzles INTEGER NOT NULL DEFAULT 0, boss INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL, PRIMARY KEY (period, pid));
CREATE INDEX IF NOT EXISTS v6_bench_period ON v6_bench (period);
CREATE TABLE IF NOT EXISTS v6_arena_log (wk TEXT NOT NULL, pid TEXT NOT NULL, r_before INTEGER NOT NULL, r_after INTEGER NOT NULL, rank INTEGER NOT NULL, players INTEGER NOT NULL, PRIMARY KEY (wk, pid));
CREATE INDEX IF NOT EXISTS v6_arena_pid ON v6_arena_log (pid, wk);
