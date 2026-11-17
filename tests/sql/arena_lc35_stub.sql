-- 9.50.0: the arena tables the Content Hub (LC35) needs, with the column types of the live database (arena.players, arena.quota,
-- arena.lc27_groups). Load this, then sql/20261027100000_lc35_content_hub.sql, into an empty local database. Used by tests/arena_lc35.test.mjs.
create schema if not exists arena;
create table if not exists arena.players (pid text primary key, name text default '', created bigint default 0, updated bigint default 0, banned numeric default 0, card text default '');
create table if not exists arena.quota (pid text, day text, kind text, n numeric default 0, primary key (pid, day, kind));
create table if not exists arena.lc27_groups (pid text, grp text, primary key (pid, grp));
