\pset tuples_only on
\pset format unaligned
\set A '''11111111-1111-1111-1111-111111111111'''
insert into auth.users values ('11111111-1111-1111-1111-111111111111','a@x.be',now()-interval '5 days'),('22222222-2222-2222-2222-222222222222','b@x.be',now()-interval '5 days'),
 ('33333333-3333-3333-3333-333333333333','c@x.be',now()-interval '5 days'),('44444444-4444-4444-4444-444444444444','new@x.be',now()-interval '10 minutes') on conflict do nothing;
create temp table r(n text, ok boolean, x text);
-- posts by A
set test.admin='0'; set test.uid='11111111-1111-1111-1111-111111111111';
select 'post A1', public.lc65_c39_post('{"title":"Old win","body":"text","category":"wins","name":"Ann"}');
update public.lc65_posts set created_at=now()-interval '30 hours' where id=1;
select 'post A2', public.lc65_c39_post('{"title":"Fresh question","body":"[[lcboard:moves=e4 e5]]","category":"questions"}');
insert into r select 'announcement refused for members', (public.lc65_c39_post('{"title":"x","body":"y","category":"announcements"}')->>'reason')='forbidden',null;
select public.lc65_c39_post('{"title":"z","body":"z","category":"nope"}');
insert into r select 'unknown category becomes general', (select category from public.lc65_posts where title='z')='general',null;
set test.uid='44444444-4444-4444-4444-444444444444';
insert into r select 'account younger than min_hours cannot post', (public.lc65_c39_post('{"title":"spam","body":"spam"}')->>'reason')='too_new',null;
-- votes
set test.uid='22222222-2222-2222-2222-222222222222';
insert into r select 'up vote', (public.lc68_vote(1,1)->>'score')='1',null;
insert into r select 'same arrow again takes it back', (public.lc68_vote(1,1)->>'myvote')='0',null;
select public.lc68_vote(1,1);
set test.uid='33333333-3333-3333-3333-333333333333';
insert into r select 'down vote', (public.lc68_vote(1,-1)->>'score')='0',null;
insert into r select 'switch down to up', (public.lc68_vote(1,1)->>'score')='2',null;
set test.uid='11111111-1111-1111-1111-111111111111';
insert into r select 'no vote on your own post', (public.lc68_vote(1,1)->>'error')='own',null;
-- feeds
set test.uid='22222222-2222-2222-2222-222222222222';
insert into r select 'new: newest first', (public.lc65_c39_feed('{"sort":"new"}')->'posts'->0->>'title')='z',(public.lc65_c39_feed('{"sort":"new"}')->'posts'->0->>'title');
insert into r select 'top: highest score first', (public.lc65_c39_feed('{"sort":"top"}')->'posts'->0->>'title')='Old win',null;
insert into r select 'feed carries score and my vote', (public.lc65_c39_feed('{"sort":"top"}')->'posts'->0->>'score')='2' and (public.lc65_c39_feed('{"sort":"top"}')->'posts'->0->>'myvote')='1',null;
insert into r select 'hot: an old post with 2 votes vs fresh posts with 0', (public.lc65_c39_feed('{"sort":"hot"}')->'posts'->0->>'title') is not null,(public.lc65_c39_feed('{"sort":"hot"}')->'posts'->0->>'title');
insert into r select 'category filter', jsonb_array_length(public.lc65_c39_feed('{"category":"questions"}')->'posts')=1,null;
insert into r select 'post_get has score', (public.lc65_c39_post_get('{"id":1}')->'post'->>'score')='2',null;
-- hide at -5: 5 down votes on post 2 (A's), others do not see it, A does
do $$ declare i int; begin for i in 1..5 loop insert into auth.users values (gen_random_uuid(),'d'||i||'@x.be',now()-interval '3 days'); end loop; end $$;
do $$ declare u uuid; begin for u in select id from auth.users where email like 'd%@x.be' loop perform set_config('test.uid',u::text,false); perform public.lc68_vote(2,-1); end loop; end $$;
set test.uid='22222222-2222-2222-2222-222222222222';
insert into r select 'post at -5 hidden from others', not exists(select 1 from jsonb_array_elements(public.lc65_c39_feed('{"sort":"new"}')->'posts') p where p->>'id'='2'),null;
set test.uid='11111111-1111-1111-1111-111111111111';
insert into r select 'the author still sees it', exists(select 1 from jsonb_array_elements(public.lc65_c39_feed('{"sort":"new"}')->'posts') p where p->>'id'='2'),null;
-- admin
do $$ begin perform public.lc68_admin_list(); insert into r values ('admin list refused for members',false,null); exception when others then insert into r values ('admin list refused for members',true,null); end $$;
set test.admin='1';
insert into r select 'admin list', jsonb_array_length(public.lc68_admin_list()->'cats')=5 and jsonb_array_length(public.lc68_admin_list()->'chans')=5,null;
insert into r select 'add category', (public.lc68_admin_save('cat','','{"name":"Opening Lab"}')->>'slug')='opening-lab',null;
insert into r select 'duplicate refused', (public.lc68_admin_save('cat','','{"name":"Opening lab"}')->>'error')='exists',null;
select public.lc68_admin_save('cat','opening-lab','{"name":"Opening Lab 2","admin_only":true}');
insert into r select 'rename + owner-only', (select name='Opening Lab 2' and admin_only from public.lc68_categories where slug='opening-lab'),null;
select public.lc68_admin_move('cat','opening-lab',-1);
insert into r select 'move up', (select sort from public.lc68_categories where slug='opening-lab')<(select sort from public.lc68_categories where slug='announcements'),null;
select public.lc68_admin_delete('cat','questions');
insert into r select 'delete category moves posts to General', (select category from public.lc65_posts where id=2)='general' and not exists(select 1 from public.lc68_categories where slug='questions'),null;
insert into r select 'General cannot be deleted', (public.lc68_admin_delete('cat','general')->>'error')='keep_general',null;
insert into r select 'add channel', (public.lc68_admin_save('chan','','{"name":"Endgame Talk","descr":"Rook endings"}')->>'slug')='endgame-talk',null;
insert into public.lc65_msgs(channel,user_id,body) values ('endgame-talk','22222222-2222-2222-2222-222222222222','hi');
select public.lc68_admin_delete('chan','endgame-talk');
insert into r select 'delete channel with messages', not exists(select 1 from public.lc65_msgs where channel='endgame-talk') and not exists(select 1 from public.lc65_channels where slug='endgame-talk'),null;
select public.lc68_admin_cfg('{"min_level":99,"min_hours":0,"hide_at":3}');
insert into r select 'threshold saved and clamped', (select min_level=30 and min_hours=0 and hide_at=-1 from public.lc68_cfg),null;
insert into r select 'public cats include the new category and cfg', jsonb_array_length(public.lc68_cats()->'cats')=5 and (public.lc68_cats()->'cfg'->>'min_level')='30',null;
-- landing
insert into r select 'landing set (admin)', (public.lc69_landing_set('{"hero_title":"My goal <script>","video":"http://x","story":"Line 1\nLine 2","other":"x"}')->>'ok')='true',null;
insert into r select 'landing cleans tags, refuses http video, ignores unknown keys', (select value from public.lc69_landing where key='hero_title')='My goal script' and (select value from public.lc69_landing where key='video')='' and not exists(select 1 from public.lc69_landing where key='other'),(select value from public.lc69_landing where key='hero_title');
insert into r select 'story keeps its line breaks', (select value from public.lc69_landing where key='story')=E'Line 1\nLine 2',null;
insert into r select 'public landing only returns filled values', (public.lc69_landing_public()->'values') ? 'hero_title' and not ((public.lc69_landing_public()->'values') ? 'video'),null;
set test.admin='0';
do $$ begin perform public.lc69_landing_set('{"hero_title":"hack"}'); insert into r values ('landing set refused for members',false,null); exception when others then insert into r values ('landing set refused for members',true,null); end $$;
insert into r select 'member counter', (public.lc69_member_count()->>'members')::int>=9,null;
-- permissions
grant usage on schema public to anon, authenticated;
set role anon;
select 'ANON', (public.lc68_cats()->>'ok')='true' and (public.lc69_landing_public()->>'ok')='true' and (public.lc69_member_count()->>'ok')='true';
do $$ begin perform public.lc68_vote(1,1); raise notice 'ANONVOTE allowed'; exception when insufficient_privilege then raise notice 'ANONVOTE denied'; end $$;
do $$ begin perform count(*) from public.lc68_down; raise notice 'ANONTABLE allowed'; exception when insufficient_privilege then raise notice 'ANONTABLE denied'; end $$;
reset role;
set role authenticated;
do $$ begin perform count(*) from public.lc69_landing; raise notice 'AUTHTABLE allowed'; exception when insufficient_privilege then raise notice 'AUTHTABLE denied'; end $$;
do $$ begin perform public.lc68_admin_cfg('{}'); raise notice 'AUTHADMIN ran'; exception when others then raise notice 'AUTHADMIN refused'; end $$;
reset role;
select 'RESULT', n, ok, coalesce(x,'') from r order by ok, n;
