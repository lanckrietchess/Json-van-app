-- 9.52.0: the arena token tables with the column types of the live database (read on 16 Nov 2026), for tests/arena_week1.test.mjs.
-- Load after tests/sql/arena_lc35_stub.sql.
create table if not exists arena.token_ledger (owner text, day text, n numeric default 0, updated bigint default 0, primary key (owner, day));
create table if not exists arena.token_bonus (owner text primary key, n numeric default 0, updated bigint default 0);
create table if not exists arena.token_spend (owner text, day text, ref text, kind text default '', t bigint default 0, state text default 'consumed', src text, primary key (owner, day, ref));
create table if not exists arena.activations (hash text primary key, pid text, created bigint default 0, last bigint default 0);
create table if not exists arena.member_pids (member_id text primary key, pid text, updated bigint default 0);
