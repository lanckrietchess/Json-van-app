-- run on a fresh database: tests/sql/lc68_stub.sql, the LC65 SQL, the LC68 SQL, tests/sql/lc70_stub.sql, the LC70 SQL, then the LC72/LC73 SQL (twice), then this file.
\set ON_ERROR_STOP 1
create or replace function pg_temp.ck(name text, ok boolean) returns void language plpgsql as $$ begin raise notice '% %', case when ok then 'PASS' else 'FAIL' end, name; end $$;
insert into auth.users(id,email,created_at) values
 ('00000000-0000-0000-0000-000000000001','lanckrietchess@gmail.com',now()-interval '30 days'),
 ('00000000-0000-0000-0000-000000000002','pro@x.be',now()-interval '30 days'),
 ('00000000-0000-0000-0000-000000000003','vip@x.be',now()),
 ('00000000-0000-0000-0000-000000000004','free@x.be',now()),
 ('00000000-0000-0000-0000-000000000005','spam@x.be',now()),
 ('00000000-0000-0000-0000-000000000006','b1@x.be',now()),('00000000-0000-0000-0000-000000000007','b2@x.be',now()) on conflict do nothing;
insert into public.licenses(email,tier,expires_at) values ('pro@x.be',2,now()+interval '20 days'),('vip@x.be',3,now()+interval '300 days');
-- anon: landing data, but no owner function
set role anon;
select pg_temp.ck('anon reads landing', (public.lc72_landing_public()->>'ok')::boolean);
select pg_temp.ck('anon reads library extras', (public.lc72_lib_extras()->>'ok')::boolean);
do $$ begin perform public.lc72_land_admin(); raise notice 'FAIL anon blocked from land_admin'; exception when others then raise notice 'PASS anon blocked from land_admin'; end $$;
do $$ begin perform count(*) from public.lc72_msgs; raise notice 'FAIL anon reads msgs'; exception when others then raise notice 'PASS anon cannot read lc72_msgs'; end $$;
select pg_temp.ck('short link opens', public.lc73_link_open('igb','dev1')->>'dest' = '/');
select pg_temp.ck('landing hit', (public.lc73_hit('{"kind":"landing","device":"dev1","code":"igb"}')->>'ok')::boolean);
reset role;
-- owner: landing items, screenshots, sections
set test.admin='1'; set test.email='lanckrietchess@gmail.com'; set test.uid='00000000-0000-0000-0000-000000000001';
select pg_temp.ck('owner adds a love item', (public.lc72_land_save('{"kind":"love","name":"Anna","body":"MSPC changed how I think.","pinned":true}')->>'ok')::boolean);
select pg_temp.ck('owner proof item', (public.lc72_land_save('{"kind":"proof","name":"Tom","site":"chesscom","start":"800","peak":"1200","days":"60","link":"https://www.chess.com/member/tom"}')->>'ok')::boolean);
select pg_temp.ck('lifetime wording refused', public.lc72_land_save('{"kind":"love","body":"lifetime access"}')->>'error' = 'wording');
select pg_temp.ck('screenshot saved', (public.lc72_shot_save('{"slot":"think","url":"https://x.supabase.co/storage/v1/object/public/lc72-landing/think/a.webp"}')->>'ok')::boolean);
select pg_temp.ck('bad screenshot url refused', public.lc72_shot_save('{"slot":"think","url":"http://x"}')->>'error' = 'invalid');
select pg_temp.ck('section switch', (public.lc72_cfg_set('landing','{"love_on":false,"proof_on":true,"builtin_on":false,"shots_on":true}')->>'ok')::boolean);
select pg_temp.ck('public sees 2 items and 1 shot, love off', jsonb_array_length(public.lc72_landing_public()->'items') = 2 and jsonb_array_length(public.lc72_landing_public()->'shots') = 1 and (public.lc72_landing_public()#>>'{cfg,love_on}') = 'false');
select pg_temp.ck('bad cfg key refused', public.lc72_cfg_set('auto_from','1')->>'error' = 'key');
-- titles
select pg_temp.ck('owner code C', public._lc72_code('lanckrietchess@gmail.com') = 'C');
select pg_temp.ck('pro = Apprentice', public._lc72_code('pro@x.be') = 'A');
select pg_temp.ck('vip = Student', public._lc72_code('vip@x.be') = 'S');
select pg_temp.ck('free = none', public._lc72_code('free@x.be') = '');
insert into public.lc70_items(id,title,status,tokens) values ('the-2000-blueprint','The 2000+ Blueprint','live',100) on conflict do nothing;
insert into public.lc70_grants(email,item_id,source,tokens) values ('free@x.be','the-2000-blueprint','tokens',100);
select pg_temp.ck('buyer = Apprentice', public._lc72_code('free@x.be') = 'A');
select pg_temp.ck('library extra saved', (public.lc72_lib_extra_set('the-2000-blueprint','{"credentials":"355 to 2105","summary":"Free part","course_id":"blueprint-course"}')->>'ok')::boolean);
select pg_temp.ck('library extra public', public.lc72_lib_extras()#>>'{extras,the-2000-blueprint,credentials}' = '355 to 2105');
-- auto messages: the VIP account is new (after auto_from) -> gets the VIP welcome once; the old Pro account had Pro before -> nothing
reset test.admin;
set test.uid='00000000-0000-0000-0000-000000000003'; set test.email='vip@x.be';
select pg_temp.ck('vip welcome sent once', public.lc72_auto_check('Vera')->'sent' = '["vip"]'::jsonb and public.lc72_auto_check('Vera')->'sent' = '[]'::jsonb);
select pg_temp.ck('vip sees the welcome, title Student', jsonb_array_length(public.lc72_chat_get()->'msgs') = 1 and public.lc72_me()->>'title' = 'Lanckriet Chess Student');
select pg_temp.ck('vip can write', (public.lc72_chat_send('Hi coach','Vera')->>'ok')::boolean);
select pg_temp.ck('priority pin', (public.lc72_chat_priority('lc72-prio-1')->>'ok')::boolean);
set test.uid='00000000-0000-0000-0000-000000000002'; set test.email='pro@x.be';
select pg_temp.ck('existing pro: no welcome', public.lc72_auto_check('Piet')->'sent' = '[]'::jsonb);
update public.licenses set tier = 3 where email = 'pro@x.be';
select pg_temp.ck('pro upgrades to vip: vip welcome', public.lc72_auto_check('Piet')->'sent' = '["vip"]'::jsonb);
set test.uid='00000000-0000-0000-0000-000000000004'; set test.email='free@x.be';
select pg_temp.ck('free buyer can write', (public.lc72_chat_send('Question about the book','Fien')->>'ok')::boolean);
set test.uid='00000000-0000-0000-0000-000000000005'; set test.email='spam@x.be';
select pg_temp.ck('non-customer cannot write', public.lc72_chat_send('hello','S')->>'error' = 'members_only');
-- owner inbox: priority first
set test.admin='1'; set test.uid='00000000-0000-0000-0000-000000000001'; set test.email='lanckrietchess@gmail.com';
select pg_temp.ck('inbox: priority thread first', public.lc72_inbox('all')#>>'{rows,0,uid}' = '00000000-0000-0000-0000-000000000003');
select pg_temp.ck('owner reply', (public.lc72_owner_send('00000000-0000-0000-0000-000000000003','Thanks Vera!','{"label":"Open","href":"#books"}')->>'ok')::boolean);
select pg_temp.ck('owner reply clears priority', not (select priority from public.lc72_threads where user_id='00000000-0000-0000-0000-000000000003'));
select pg_temp.ck('auto template edit', (public.lc72_auto_set('pro','{"enabled":true,"body":"Welcome {name}","cta_label":"Go","cta_href":"#upgrades"}')->>'ok')::boolean);
select pg_temp.ck('caption minutes for owner', (public.lc72_caption_allow(60)->>'ok')::boolean);
reset test.admin; set test.uid='00000000-0000-0000-0000-000000000004'; set test.email='free@x.be';
select pg_temp.ck('caption minutes refused for members', public.lc72_caption_allow(60)->>'error' = 'admin_only');
-- chat requests, blocks, bans
insert into public.lc65_members(user_id,name) values ('00000000-0000-0000-0000-000000000004','Fien'),('00000000-0000-0000-0000-000000000005','Spam'),('00000000-0000-0000-0000-000000000006','B1'),('00000000-0000-0000-0000-000000000007','B2') on conflict do nothing;
set test.uid='00000000-0000-0000-0000-000000000005';
select pg_temp.ck('first DM becomes a request', (public.lc65_c46_dm_send('{"to":"00000000-0000-0000-0000-000000000004","body":"hey"}')->>'request')::boolean);
set test.uid='00000000-0000-0000-0000-000000000004';
select pg_temp.ck('recipient: hidden from threads, shown in requests', jsonb_array_length(public.lc65_c46_dm_threads('{}')->'threads') = 0 and jsonb_array_length(public.lc73_dm_requests()->'rows') = 1);
select pg_temp.ck('recipient cannot read before accepting', (public.lc65_c46_dm_get('{"with":"00000000-0000-0000-0000-000000000005"}')->>'request')::boolean);
select pg_temp.ck('accept', (public.lc73_dm_answer('00000000-0000-0000-0000-000000000005',true)->>'ok')::boolean and jsonb_array_length(public.lc65_c46_dm_threads('{}')->'threads') = 1);
select pg_temp.ck('block 1', (public.lc73_block('00000000-0000-0000-0000-000000000005',true)->>'ok')::boolean);
set test.uid='00000000-0000-0000-0000-000000000005';
select pg_temp.ck('blocked: cannot DM', public.lc65_c46_dm_send('{"to":"00000000-0000-0000-0000-000000000004","body":"again"}')->>'reason' = 'blocked');
set test.uid='00000000-0000-0000-0000-000000000006'; select public.lc73_block('00000000-0000-0000-0000-000000000005',true);
select pg_temp.ck('2 blocks: no ban yet', not exists(select 1 from public.lc65_bans where user_id='00000000-0000-0000-0000-000000000005' and until > now()));
set test.uid='00000000-0000-0000-0000-000000000007'; select public.lc73_block('00000000-0000-0000-0000-000000000005',true);
select pg_temp.ck('3 blocks in a week: 1-week ban', (select until between now()+interval '6 days' and now()+interval '8 days' from public.lc65_bans where user_id='00000000-0000-0000-0000-000000000005')
  and (select level from public.lc73_spam where user_id='00000000-0000-0000-0000-000000000005') = 1);
set test.uid='00000000-0000-0000-0000-000000000005';
select pg_temp.ck('banned: cannot post DMs', public.lc65_c46_dm_send('{"to":"00000000-0000-0000-0000-000000000006","body":"x"}')->>'reason' = 'chat_banned');
-- rivals and tribes
set test.uid='00000000-0000-0000-0000-000000000006';
select pg_temp.ck('hub join', (public.lc73_hub_join('{"name":"B1","rating":"900"}')->>'ok')::boolean);
set test.uid='00000000-0000-0000-0000-000000000007'; select public.lc73_hub_join('{"name":"B2","rating":"950"}');
select pg_temp.ck('hub lists B1', public.lc73_hub_list()#>>'{rows,0,name}' = 'B1');
select pg_temp.ck('ask rival', public.lc73_rival_ask('00000000-0000-0000-0000-000000000006')->>'status' = 'pending');
set test.uid='00000000-0000-0000-0000-000000000006';
select pg_temp.ck('asking back accepts', public.lc73_rival_ask('00000000-0000-0000-0000-000000000007')->>'status' = 'ok');
select pg_temp.ck('tribe create', (public.lc73_tribe_create('Knights of MSPC','B1')->>'ok')::boolean);
select public.lc73_xp_report(400);
set test.uid='00000000-0000-0000-0000-000000000007';
select pg_temp.ck('tribe join by code', (public.lc73_tribe_join((select code from public.lc73_tribes limit 1),'B2')->>'ok')::boolean);
select public.lc73_xp_report(9999);
select pg_temp.ck('xp capped at 6000 and tribe score = avg', (select xp from public.lc73_week_xp where user_id='00000000-0000-0000-0000-000000000007') = 6000
  and (public.lc73_tribe_mine()#>>'{tribe,score}')::int = 3200);
-- reviews
select pg_temp.ck('public review needs the age tick', public.lc73_review_submit('{"pgn":"1. e4 e5 2. Nf3 Nc6","consent_public":true}')->>'error' = 'age');
select pg_temp.ck('review submitted', (public.lc73_review_submit('{"pgn":"1. e4 e5 2. Nf3 Nc6","consent_public":true,"age_ok":true,"tokens":20}')->>'ok')::boolean);
set test.admin='1';
select pg_temp.ck('owner queue', jsonb_array_length(public.lc73_review_queue('open')->'rows') = 1);
select pg_temp.ck('owner marks done', (public.lc73_review_set((select id from public.lc73_reviews limit 1),'{"status":"done","answer":"Good game"}')->>'ok')::boolean);
select pg_temp.ck('-> coach message', exists(select 1 from public.lc72_msgs where user_id='00000000-0000-0000-0000-000000000007' and body like 'Your Priority Game Review%'));
-- tracking, partner scope, dashboard
reset test.admin;
select pg_temp.ck('attach source', (public.lc73_attach('{"code":"tkb","utm_source":"tiktok","ref":"ABC"}')->>'ok')::boolean);
select pg_temp.ck('partner without a row is refused', public.lc73_dash('{"all":true}')->>'error' = 'forbidden');
set test.admin='1';
select pg_temp.ck('owner makes a reddit link', (public.lc73_link_save('{"code":"rp","platform":"reddit","label":"Reddit post"}')->>'ok')::boolean);
select pg_temp.ck('partner set', (public.lc73_partner_set('{"email":"b2@x.be","name":"Partner B","codes":["tkb"]}')->>'ok')::boolean);
select pg_temp.ck('views saved', (public.lc73_views_save('{"channel":"tiktok","from":"2026-11-01","to":"2026-11-07","views":12000}')->>'ok')::boolean);
select pg_temp.ck('dashboard all-time', (public.lc73_dash('{"all":true}')#>>'{funnel,views}')::int = 12000 and (public.lc73_dash('{"all":true}')#>>'{funnel,clicks}')::int = 1);
select pg_temp.ck('dashboard range', (public.lc73_dash('{"from":"2026-11-01","to":"2030-01-01"}')->>'ok')::boolean);
select pg_temp.ck('kpi set', (public.lc73_kpi_set('{"signup_to_paid":5}')->>'ok')::boolean);
reset test.admin; set test.email='b2@x.be';
select pg_temp.ck('partner sees only their code', jsonb_array_length(public.lc73_dash('{"all":true}')->'links') = 1 and (public.lc73_dash('{"all":true}')#>>'{funnel,signups}')::int = 1);
select pg_temp.ck('partner creates own link', (public.lc73_link_save('{"code":"b2-yt","platform":"youtube"}')->>'ok')::boolean);
select pg_temp.ck('partner link added to their codes', (select 'b2-yt' = any(codes) from public.lc73_partners where email='b2@x.be'));
select pg_temp.ck('partner cannot take owner code', public.lc73_link_save('{"code":"igb","platform":"x"}')->>'error' = 'taken');
-- authenticated role cannot touch tables or service functions
set role authenticated;
do $$ begin perform count(*) from public.lc73_attrib; raise notice 'FAIL authenticated reads attrib'; exception when others then raise notice 'PASS authenticated cannot read lc73_attrib'; end $$;
do $$ begin perform public.lc73_discount_for('x@y.z'); raise notice 'FAIL member calls discount_for'; exception when others then raise notice 'PASS member cannot call lc73_discount_for'; end $$;
reset role;
-- referral discount: invitee once
insert into public.lc73_attrib(user_id,email,ref) values ('00000000-0000-0000-0000-000000000004','free@x.be','XYZ') on conflict (user_id) do update set ref='XYZ', email='free@x.be';
select pg_temp.ck('invitee discount offered', public.lc73_discount_for('free@x.be') = 'invitee');
select public.lc73_discount_paid('free@x.be','invitee','cs_1');
select pg_temp.ck('invitee discount used up', public.lc73_discount_for('free@x.be') is null);

-- 9.37.0 additions: lead magnets (no card), member shares
set test.admin='1'; set test.uid='00000000-0000-0000-0000-000000000001'; set test.email='lanckrietchess@gmail.com';
insert into public.lc70_items(id,title,status) values ('woodpecker-summary','The Woodpecker Method','live') on conflict do nothing;
select public.lc72_lib_extra_set('woodpecker-summary','{"lead":true}');
reset test.admin; set test.uid='00000000-0000-0000-0000-000000000005'; set test.email='spam@x.be';
select pg_temp.ck('lead magnet opens with an account, no card', (public.lc72_lead_claim('woodpecker-summary')->>'ok')::boolean);
select pg_temp.ck('lead grant does not make an Apprentice', public._lc72_code('spam@x.be') = '');
select pg_temp.ck('a normal item is not a lead', public.lc72_lead_claim('the-2000-blueprint')->>'error' = 'not_lead');
select pg_temp.ck('member shares an achievement', (public.lc74_share('{"kind":"level","title":"Reached level 6","name":"Sam"}')->>'ok')::boolean);
set test.admin='1';
select pg_temp.ck('owner sees the share', jsonb_array_length(public.lc74_shares_admin()->'rows') = 1);
select pg_temp.ck('owner promotes it to the Wall of Love', (public.lc74_share_promote((select id from public.lc74_shares limit 1))->>'ok')::boolean);
select pg_temp.ck('promoted card is on the landing data', exists(select 1 from public.lc72_land_items where kind='love' and name='Sam'));
reset test.admin;
