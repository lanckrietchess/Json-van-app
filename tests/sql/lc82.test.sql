-- LC82 Release Giveaway. Fresh database: tests/sql/lc82_stub.sql, sql/20261107100000_lc59_milestones_proof.sql,
-- sql/20261115100000_lc82_release_giveaway.sql (twice), then this file. Prints PASS / FAIL per check.
\set ON_ERROR_STOP 1
create or replace function pg_temp.ck(name text, ok boolean) returns void language plpgsql as $$ begin raise notice '% %', case when coalesce(ok,false) then 'PASS' else 'FAIL' end, name; end $$;
-- three members (A, B, C) and the owner
insert into auth.users(id,email) values ('00000000-0000-0000-0000-00000000000a','a@x.be'),('00000000-0000-0000-0000-00000000000b','b@x.be'),
  ('00000000-0000-0000-0000-00000000000c','c@x.be') on conflict do nothing;
select pg_temp.ck('the first giveaway exists: 15 days, 5 winners, 1 month of Pro',
  (select ends_at - starts_at = interval '15 days' and winners = 5 and prize = '1 month of Pro' from public.lc82_giveaways where id = 'release-2026'));
select pg_temp.ck('anonymous status shows the giveaway', (public.lc82_status()->>'signed_in')::boolean = false and public.lc82_status()#>>'{giveaway,id}' = 'release-2026');

-- A: signed in, not linked yet
set test.uid='00000000-0000-0000-0000-00000000000a'; set test.email='a@x.be';
select pg_temp.ck('joining without a linked chess account asks to link first', public.lc82_join('Anna', true)->>'error' = 'link_first');
-- elo-verify links A at 1000 (the server, never the browser)
select public.lc59_link_record('00000000-0000-0000-0000-00000000000a','a@x.be','chesscom','anna_chess',1000);
select pg_temp.ck('public listing needs a first name', public.lc82_join(null, true)->>'error' = 'first_name');
select pg_temp.ck('a made-up first name is refused', public.lc82_join('<b>x', true)->>'error' = 'first_name');
select pg_temp.ck('A joins: start rating = the verified rating 1000', public.lc82_join('Anna', true)#>>'{entry,start}' = '1000');
-- B links at 1500 and joins without the public listing; C links at 800 and joins public
set test.uid='00000000-0000-0000-0000-00000000000b'; set test.email='b@x.be';
select public.lc59_link_record('00000000-0000-0000-0000-00000000000b','b@x.be','lichess','bram_l',1500);
select pg_temp.ck('B joins without the public listing (no name needed)', (public.lc82_join(null, false)#>>'{entry,show_public}')::boolean = false);
set test.uid='00000000-0000-0000-0000-00000000000c'; set test.email='c@x.be';
select public.lc59_link_record('00000000-0000-0000-0000-00000000000c','c@x.be','chesscom','cleo99',800);
select public.lc82_join('Cleo', true);

-- new verified ratings arrive through elo-verify
select public.lc59_link_record('00000000-0000-0000-0000-00000000000a','a@x.be','chesscom','anna_chess',1180);
select public.lc59_link_record('00000000-0000-0000-0000-00000000000a','a@x.be','chesscom','anna_chess',1150);
select public.lc59_link_record('00000000-0000-0000-0000-00000000000b','b@x.be','lichess','bram_l',1720);
select public.lc59_link_record('00000000-0000-0000-0000-00000000000c','c@x.be','chesscom','cleo99',850);
select pg_temp.ck('the trigger copies the verified rating into the entry (last 1150, peak 1180)',
  (select last_rating = 1150 and peak_rating = 1180 from public.lc82_entries where user_id = '00000000-0000-0000-0000-00000000000a'));
set test.uid='00000000-0000-0000-0000-00000000000a'; set test.email='a@x.be';
select pg_temp.ck('A: gain +150 (latest minus start), rank 2 of 3', public.lc82_status()#>>'{entry,gain}' = '150' and public.lc82_status()#>>'{entry,rank}' = '2');
select pg_temp.ck('joining again never resets the start rating', public.lc82_join('Anna', true)#>>'{entry,start}' = '1000');

-- public board
reset test.uid; reset test.email;
set role anon;
select pg_temp.ck('anon can read the board and the social proof', (public.lc82_board_public()->>'ok')::boolean and (public.lc82_social_proof()->>'ok')::boolean);
select pg_temp.ck('board: 3 entries, only the 2 public ones listed, with their real rank (Anna #2, Cleo #3)',
  (public.lc82_board_public()->>'entries')::int = 3 and jsonb_array_length(public.lc82_board_public()->'rows') = 2
  and public.lc82_board_public()#>>'{rows,0,first_name}' = 'Anna' and public.lc82_board_public()#>>'{rows,0,rank}' = '2' and public.lc82_board_public()#>>'{rows,1,rank}' = '3');
select pg_temp.ck('board never shows an e-mail or a username', public.lc82_board_public()::text !~ '(@x\.be|anna_chess|bram_l|cleo99)');
do $$ begin perform 1 from public.lc82_entries; raise notice 'FAIL anon reads the entries table'; exception when others then raise notice 'PASS anon cannot read the entries table'; end $$;
do $$ begin perform public.lc82_status(); raise notice 'FAIL anon can call lc82_status'; exception when others then raise notice 'PASS anon cannot call the member functions'; end $$;
do $$ begin perform public.lc82_admin_board(null); raise notice 'FAIL anon admin'; exception when others then raise notice 'PASS anon cannot call the owner board'; end $$;
reset role;

-- reviews in both layouts: column rating = 5, metadata.social.rating = 5, a 4 and a 5 from an older row layout
insert into public.app_feedback(user_email,message,rating) values ('a@x.be','Love the Trim',5),('b@x.be','Good',4);
insert into public.app_feedback(user_email,message,rating,metadata) values ('c@x.be','Great coach',null,'{"social":{"rating":5,"elo_progress":"+50"}}');
select pg_temp.ck('social proof: total verified ELO gained = sum of peak gains (180 + 220 + 50)', (public.lc82_social_proof()->>'elo_gained')::int = (180 + 220 + 50));
select pg_temp.ck('social proof: 2 five-star reviews out of 3 rated, average 4.67', public.lc82_social_proof()#>>'{reviews,five_star}' = '2'
  and public.lc82_social_proof()#>>'{reviews,rated}' = '3' and public.lc82_social_proof()#>>'{reviews,avg}' = '4.67');
select pg_temp.ck('social proof: giveaway entries 3 and members with a gain 3', (public.lc82_social_proof()->>'giveaway_entries')::int = 3 and (public.lc82_social_proof()->>'members_gained')::int = 3);

-- owner
set test.uid='00000000-0000-0000-0000-00000000000a'; set test.admin='0';
do $$ begin perform public.lc82_admin_board(null); raise notice 'FAIL member reads the owner board'; exception when others then raise notice 'PASS a member cannot read the owner board'; end $$;
set test.admin='1';
select pg_temp.ck('owner board: entries ranked by gain (Bram +220 first) with e-mail', public.lc82_admin_board(null)#>>'{entries,0,email}' = 'b@x.be'
  and public.lc82_admin_board(null)#>>'{entries,0,gain}' = '220');
select pg_temp.ck('owner board: top gains and the two 5-star reviews (both layouts)', jsonb_array_length(public.lc82_admin_board(null)->'top_gains') = 3
  and jsonb_array_length(public.lc82_admin_board(null)->'five_star') = 2 and public.lc82_admin_board(null)::text like '%Great coach%');
select pg_temp.ck('owner marks Bram as awarded', public.lc82_admin_mark('release-2026','00000000-0000-0000-0000-00000000000b',true,null,'Pro sent')#>>'{entries,0,awarded_at}' is not null);
select public.lc82_admin_mark('release-2026','00000000-0000-0000-0000-00000000000c',null,true,'shared account');
select pg_temp.ck('a disqualified entry ranks last and leaves the public board', public.lc82_admin_board(null)#>>'{entries,2,first_name}' = 'Cleo'
  and jsonb_array_length(public.lc82_board_public()->'rows') = 1);
select pg_temp.ck('rank_by peak: Anna counts her peak 1180 (+180)', (public.lc82_admin_cfg(jsonb_build_object('id','release-2026','starts_at',(select starts_at from public.lc82_giveaways where id='release-2026'),
  'ends_at',(select ends_at from public.lc82_giveaways where id='release-2026'),'rank_by','peak'))#>>'{entries,1,gain}') = '180');
select pg_temp.ck('a bad date range is refused', public.lc82_admin_cfg('{"id":"release-2026","starts_at":"2026-12-01","ends_at":"2026-11-01"}')->>'error' = 'bad_date');

-- after the end nothing changes any more, and nobody can join
update public.lc82_giveaways set starts_at = now() - interval '20 days', ends_at = now() - interval '5 days' where id = 'release-2026';
select public.lc59_link_record('00000000-0000-0000-0000-00000000000a','a@x.be','chesscom','anna_chess',1400);
select pg_temp.ck('a rating after the end does not change the entry', (select last_rating = 1150 from public.lc82_entries where user_id = '00000000-0000-0000-0000-00000000000a'));
set test.uid='00000000-0000-0000-0000-00000000000a'; set test.email='a@x.be';
select pg_temp.ck('joining after the end is refused', public.lc82_join('Anna', true)->>'error' = 'ended');
-- an upcoming giveaway becomes the current one and cannot be joined before its start
set test.admin='1';
select public.lc82_admin_cfg(jsonb_build_object('id','winter-2027','starts_at',now() + interval '2 days','ends_at',now() + interval '17 days'));
select pg_temp.ck('the next giveaway is shown as upcoming and refuses an early join', (public.lc82_status()#>>'{giveaway,upcoming}')::boolean
  and public.lc82_join('Anna', true)->>'error' = 'not_started');
