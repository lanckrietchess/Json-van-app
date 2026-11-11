-- run from the repo root on a fresh database after tests/sql/lc68_stub.sql and sql/20261108120000_lc65_community.sql
\set ON_ERROR_STOP on
create table if not exists public.lc61_warnings(id uuid primary key default gen_random_uuid(),user_id uuid not null, first_name text, fen text, san text, letter text, alarm text, body text not null, status text not null default 'pending', created_at timestamptz not null default now());
\i sql/20261112100000_lc71_launch.sql
\i sql/20261112100000_lc71_launch.sql
insert into auth.users(id,email) values ('00000000-0000-0000-0000-00000000000a','lanckrietchess@gmail.com'),('00000000-0000-0000-0000-00000000000b','b@x.be'),('00000000-0000-0000-0000-00000000000c','c@x.be');
insert into public.lc65_members(user_id,name) values ('00000000-0000-0000-0000-00000000000a','Kyenzo'),('00000000-0000-0000-0000-00000000000b','Bea');
insert into public.lc61_warnings(user_id,first_name,fen,letter,alarm,body,status) values
 ('00000000-0000-0000-0000-00000000000b','Bea','8/8/8/8/8/8/8/K6k w - - 0 1','M','loose','Same position answer here.','approved'),
 ('00000000-0000-0000-0000-00000000000b','Bea','x','S','loose','Same alarm answer.','approved'),
 ('00000000-0000-0000-0000-00000000000b','Bea','x','C','none','Pending one.','pending');
select set_config('test.uid','00000000-0000-0000-0000-00000000000c',false);
select 'board_new' t, public.lc65_c39_board('{"community":"main","name":"Cas"}');
select 'warn' t, public.lc71_warn_list('8/8/8/8/8/8/8/K6k b - - 3 9','loose','M');
select 'vids' t, public._lc70_videos('[{"title":"A","url":"https://youtu.be/abcdefghijk","folder":"Ch 1"},{"title":"Caro","pgn":"1.e4 c6","folder":"Ch 2","side":"b"},{"title":"bad","url":"http://evil"}]');
set role anon; select 'anon warn ok' t, (public.lc71_warn_list('x','','')->>'ok'); reset role;
set role authenticated; do $$ begin perform public._lc70_videos('[]'); raise notice 'FAIL: member can run _lc70_videos'; exception when insufficient_privilege then raise notice 'PASS: _lc70_videos closed'; end $$; reset role;
