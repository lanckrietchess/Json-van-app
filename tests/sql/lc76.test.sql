-- run after tests/sql/lc75.test.sql on the same database
\set ON_ERROR_STOP 1
create or replace function pg_temp.ck(name text, ok boolean) returns void language plpgsql as $$ begin raise notice '% %', case when ok then 'PASS' else 'FAIL' end, name; end $$;
alter table public.licenses add column if not exists flags jsonb default '{}'::jsonb;
alter table public.licenses add column if not exists license_key text;
insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000011','giver@x.be'),('00000000-0000-0000-0000-000000000012','gifted@x.be') on conflict do nothing;
insert into public.licenses(email,tier,expires_at,source,license_key,flags) values ('gifted@x.be',2,now()+interval '365 days','gift','LC-GIFT-TEST1','{"source":"gift","from":"giver@x.be","from_name":"Anna","note":"Train hard!"}');
set test.uid='00000000-0000-0000-0000-000000000012'; set test.email='gifted@x.be';
select pg_temp.ck('receiver sees the gift with the giver name and note', public.lc76_gift_check()#>>'{gift,from_name}' = 'Anna' and public.lc76_gift_check()#>>'{gift,note}' = 'Train hard!' and not (public.lc76_gift_check()#>>'{gift,seen}')::boolean);
select pg_temp.ck('giver e-mail is never sent to the receiver', public.lc76_gift_check()::text not like '%giver@x.be%');
select pg_temp.ck('thank-you sent', (public.lc76_gift_thanks('LC-GIFT-TEST1','Thank you so much!','Bram')->>'ok')::boolean);
select pg_temp.ck('gift is seen after thanking', (public.lc76_gift_check()#>>'{gift,seen}')::boolean);
select pg_temp.ck('a wrong key is refused', public.lc76_gift_thanks('LC-OTHER','x','Bram')->>'error' = 'no_gift');
set test.uid='00000000-0000-0000-0000-000000000011'; set test.email='giver@x.be';
select pg_temp.ck('giver sees the thanks', public.lc76_gift_check()#>>'{thanks,0,body}' = 'Thank you so much!' and public.lc76_gift_check()#>>'{thanks,0,name}' = 'Bram');
select public.lc76_thanks_seen(array(select id from public.lc76_thanks));
select pg_temp.ck('thanks marked seen', jsonb_array_length(public.lc76_gift_check()->'thanks') = 0);
set role anon;
do $$ begin perform public.lc76_gift_check(); raise notice 'FAIL anon blocked'; exception when others then raise notice 'PASS anon blocked from lc76'; end $$;
reset role;
