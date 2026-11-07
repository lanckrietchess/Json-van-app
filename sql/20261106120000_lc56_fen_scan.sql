-- LC56 (build 9.30.0): daily counter for the board photo scan (Edge Function fen-scan). Idempotent. Run it in the Supabase SQL editor.
-- One row per member per day; the function adds 1 for every scan attempt and refuses above FEN_SCAN_DAILY (default 5).
create table if not exists public.lc56_fen_scans (
  email text not null,
  day   date not null default current_date,
  n     integer not null default 0,
  primary key (email, day)
);
alter table public.lc56_fen_scans enable row level security;
revoke all on public.lc56_fen_scans from anon, authenticated;
