-- run after tests/sql/lc72_lc73.test.sql on the same database (that file leaves users, links, attribution and purchases behind)
\set ON_ERROR_STOP 1
create or replace function pg_temp.ck(name text, ok boolean) returns void language plpgsql as $$ begin raise notice '% %', case when ok then 'PASS' else 'FAIL' end, name; end $$;
set test.admin='1'; set test.uid='00000000-0000-0000-0000-000000000001'; set test.email='lanckrietchess@gmail.com';
select pg_temp.ck('daily views per channel saved', (public.lc75_views_day(current_date,'{"tiktok":5000,"instagram":1500}')->>'saved')::int = 2);
select pg_temp.ck('saving the same day again replaces it', (public.lc75_views_day(current_date,'{"tiktok":6000}')->>'ok')::boolean);
select pg_temp.ck('views today = 7500', (public.lc75_funnel(jsonb_build_object('from',current_date,'to',current_date))#>>'{rows,all,views}')::int = 6000 + 1500);
select pg_temp.ck('funnel has a tiktok column', public.lc75_funnel('{}')->'channels' ? 'tiktok');
select pg_temp.ck('lifetime works', (public.lc75_funnel('{"all":true}')->>'ok')::boolean and (public.lc75_funnel('{"all":true}')#>>'{range,all}')::boolean);
select pg_temp.ck('signups counted per channel (tkb = tiktok)', (public.lc75_funnel('{"all":true}')#>>'{rows,tiktok,signups}')::int >= 1);
select pg_temp.ck('lead magnet counts as a card/free product', (public.lc75_funnel('{"all":true}')#>>'{rows,all,cards}')::int >= 1);
select pg_temp.ck('kpi targets present', (public.lc75_funnel('{}')#>>'{kpis,l2_ctr,target}')::numeric = 1);
select pg_temp.ck('kpi set', (public.lc75_kpi_set('{"l1_views_day":7000}')->>'ok')::boolean);
select pg_temp.ck('standard links added', exists(select 1 from public.lc73_links where code='rp' and platform='reddit'));
-- text lessons and the public outline
select public.lc70_admin_upsert('{"id":"blueprint-course","shelf":"kyenzo","kind":"course","status":"live","title":"Blueprint course","videos":[{"title":"Intro","url":"https://youtu.be/abcdefghijk","folder":"Module 1"},{"title":"Read first","text":"Paragraph one.","folder":"Module 1"},{"title":"Caro","pgn":"1. e4 c6","folder":"Module 2"}]}'::jsonb);
reset test.admin; set role anon;
select pg_temp.ck('anon sees the outline: titles and types, no links or texts', (public.lc75_outlines(array['blueprint-course'])#>>'{outlines,blueprint-course,1,type}') = 'text'
  and public.lc75_outlines(array['blueprint-course'])::text not like '%youtu.be%' and public.lc75_outlines(array['blueprint-course'])::text not like '%Paragraph one%');
do $$ begin perform public.lc75_funnel('{}'); raise notice 'FAIL anon blocked from the funnel'; exception when others then raise notice 'PASS anon blocked from the funnel'; end $$;
reset role;
-- two-sided referral with the new codes
set test.uid='00000000-0000-0000-0000-000000000006'; set test.email='b1@x.be';
select pg_temp.ck('referral code made', (public.lc75_my_refcode()->>'code') ~ '^k[a-z0-9]{7}$');
insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000009','friend@x.be') on conflict do nothing;
insert into public.lc73_attrib(user_id,email,ref) values ('00000000-0000-0000-0000-000000000009','friend@x.be',(select code from public.lc75_refcodes where user_id='00000000-0000-0000-0000-000000000006'));
select pg_temp.ck('friend gets 10% (invitee)', public.lc73_discount_for('friend@x.be') = 'invitee');
select public.lc73_discount_paid('friend@x.be','invitee','cs_friend');
select pg_temp.ck('referrer then gets 10% on the next purchase', public.lc73_discount_for('b1@x.be') = 'referrer');
select public.lc73_discount_paid('b1@x.be','referrer','cs_b1');
select pg_temp.ck('referrer reward used once', public.lc73_discount_for('b1@x.be') is null);
select pg_temp.ck('own code gives no discount', (select public.lc73_discount_for('b1@x.be')) is null);
