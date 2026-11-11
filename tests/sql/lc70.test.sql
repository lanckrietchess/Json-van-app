-- LC70 library: run on a fresh database after tests/sql/lc70_stub.sql and sql/20261111100000_lc70_library.sql (twice, to prove it is idempotent)
\set ON_ERROR_STOP on
create temp table r(n serial, name text, ok boolean);
create or replace function pg_temp.t(name text, ok boolean) returns void language sql as $$ insert into r(name,ok) values (name, coalesce(ok,false)) $$;
create or replace function pg_temp.raises(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
insert into public.licenses(email,tier,expires_at) values ('pro@x.be',2,now()+interval '30 days'),('vip@x.be',3,now()+interval '365 days'),('old@x.be',2,now()-interval '1 day');
-- owner adds items
set test.admin='1'; set test.email='lanckrietchess@gmail.com';
select pg_temp.t('upsert book', (public.lc70_admin_upsert('{"id":"mspc-book","title":"The MSPC System","kind":"book","status":"live","tokens":"100","paperback_cents":"2499","paperback_link":"https://buy.stripe.com/abc123","hardcover_cents":"3999","pro_ebook":true,"vip_hardcover":true,"ebook_url":"https://example.com/book.pdf","pinned":true}'::jsonb))->>'ok' = 'true');
select pg_temp.t('upsert course', (public.lc70_admin_upsert('{"id":"caro-course","title":"Caro-Kann video course","kind":"course","status":"live","price_cents":"4900","buy_link":"https://buy.stripe.com/x9","pro_included":true,"videos":[{"title":"Intro","url":"https://youtu.be/abc"},{"title":"bad","url":"https://evil.com/x"}]}'::jsonb))->>'ok' = 'true');
select pg_temp.t('upsert draft', (public.lc70_admin_upsert('{"id":"draft-1","title":"Draft","status":"draft","tokens":5}'::jsonb))->>'ok' = 'true');
select pg_temp.t('upsert free summary', (public.lc70_admin_upsert('{"id":"free-sum","title":"Free summary","kind":"summary","status":"live","body":"Read this."}'::jsonb))->>'ok' = 'true');
select pg_temp.t('bad link rejected', (public.lc70_admin_upsert('{"id":"bad-1","title":"Bad","buy_link":"https://evil.com/pay"}'::jsonb))->>'error' = 'invalid');
select pg_temp.t('videos filtered', (select jsonb_array_length(videos) from public.lc70_items where id='caro-course') = 1);
select pg_temp.t('owner sees draft', (select count(*) from jsonb_array_elements(public.lc70_catalog('kyenzo')->'items')) = 4);
-- anonymous visitor
set test.admin='0'; set test.email='';
select pg_temp.t('anon sees 3 live', (select count(*) from jsonb_array_elements(public.lc70_catalog('kyenzo')->'items')) = 3);
select pg_temp.t('pinned first', (public.lc70_catalog('kyenzo')->'items'->0->>'id') = 'mspc-book');
select pg_temp.t('no private fields in catalog', (public.lc70_catalog('kyenzo')::text) not like '%example.com/book.pdf%');
select pg_temp.t('anon open needs sign in', (public.lc70_open('mspc-book'))->>'error' = 'sign_in');
select pg_temp.t('free item opens for anon', (public.lc70_open('free-sum'))->>'body' = 'Read this.');
select pg_temp.t('draft hidden', (public.lc70_open('draft-1'))->>'error' = 'not_found');
-- free member
set test.email='free@x.be';
select pg_temp.t('free no access', (public.lc70_open('mspc-book'))->>'error' = 'no_access');
select pg_temp.t('free buys with tokens', (public.lc70_buy_tokens('mspc-book','lib:mspc-book'))->>'ok' = 'true');
select pg_temp.t('free owns now', (public.lc70_open('mspc-book'))->>'access' = 'owned');
select pg_temp.t('second buy no duplicate', (public.lc70_buy_tokens('mspc-book','again'))->>'ok' = 'true' and (select count(*) from public.lc70_grants where email='free@x.be')=1);
select pg_temp.t('course not for tokens', (public.lc70_buy_tokens('caro-course','x'))->>'error' = 'not_for_tokens');
select pg_temp.t('free cannot claim hardcover', (public.lc70_hardcover_claim('mspc-book','{"name":"A B","line1":"Street 1","postal":"8430","city":"Middelkerke","country":"be"}'))->>'error' = 'vip_only');
-- pro member
set test.email='pro@x.be';
select pg_temp.t('pro gets ebook', (public.lc70_open('mspc-book'))->>'access' = 'pro');
select pg_temp.t('pro gets course', (public.lc70_open('caro-course'))->>'access' = 'pro');
select pg_temp.t('expired pro has none', (set_config('test.email','old@x.be',false) is not null) and (public.lc70_open('caro-course'))->>'error' = 'no_access');
-- vip member
set test.email='vip@x.be';
select pg_temp.t('vip gets course', (public.lc70_open('caro-course'))->>'access' = 'vip');
select pg_temp.t('vip bad address', (public.lc70_hardcover_claim('mspc-book','{"name":"A","line1":"x","postal":"","city":"","country":"Belgium"}'))->>'error' = 'address');
select pg_temp.t('vip claims hardcover', (public.lc70_hardcover_claim('mspc-book','{"name":"Anna Peeters","line1":"Zeedijk 1","postal":"8430","city":"Middelkerke","country":"be"}'))->>'ok' = 'true');
select pg_temp.t('vip claims once', (public.lc70_hardcover_claim('mspc-book','{"name":"Anna Peeters","line1":"Zeedijk 1","postal":"8430","city":"Middelkerke","country":"be"}'))->>'error' = 'already');
select pg_temp.t('claim visible in catalog', (public.lc70_catalog('kyenzo')->'claims'->>'mspc-book') = 'new');
select pg_temp.t('member cannot list orders', pg_temp.raises('select public.lc70_admin_orders()'));
select pg_temp.t('member cannot upsert', pg_temp.raises($q$select public.lc70_admin_upsert('{"title":"x"}')$q$));
-- Stripe fulfilment (database role, like the stripe-links function)
select pg_temp.t('paid grant', (public.lc70_grant_paid('Buyer@X.be','caro-course','cs_1',4900))->>'ok' = 'true');
select pg_temp.t('paid grant unknown item', (public.lc70_grant_paid('buyer@x.be','nope','cs_2',100))->>'error' = 'unknown_item');
select pg_temp.t('paid order', (public.lc70_order_paid('buyer@x.be','mspc-book','paperback','cs_3',2499,'{"name":"B Uyer","address":{"line1":"Kerkstraat 2","postal_code":"9000","city":"Gent","country":"BE"}}'))->>'ok' = 'true');
select pg_temp.t('paid order idempotent', (public.lc70_order_paid('buyer@x.be','mspc-book','paperback','cs_3',2499,'{}'))->>'ok' = 'true' and (select count(*) from public.lc70_orders where session_id='cs_3')=1);
set test.email='buyer@x.be';
select pg_temp.t('buyer owns course', (public.lc70_open('caro-course'))->>'access' = 'owned');
select pg_temp.t('buyer sees order', jsonb_array_length((public.lc70_my_orders())->'orders') = 1);
-- Guest creator
set test.email='coach@creator.be';
select pg_temp.t('creator submits', (public.lc70_creator_submit('{"title":"Rook endings for 1200","creator":"Coach Jan","kind":"course","price_cents":"5900","videos":[{"title":"L1","url":"https://www.youtube.com/watch?v=x"}]}'))->>'status' = 'pending');
select pg_temp.t('creator item not public yet', (select count(*) from jsonb_array_elements(public.lc70_catalog('guest')->'items')) = 0);
select pg_temp.t('creator lists own', jsonb_array_length((public.lc70_creator_mine())->'items') = 1);
set test.email='other@x.be';
select pg_temp.t('other cannot edit', (public.lc70_creator_submit(jsonb_build_object('id',(select id from public.lc70_items where shelf='guest'),'title','Hack','creator','X')))->>'error' = 'not_yours');
select pg_temp.t('creator cannot set flags', (select not vip_included and buy_link='' from public.lc70_items where shelf='guest'));
set test.admin='1';
select pg_temp.t('owner approves', (public.lc70_admin_set((select id from public.lc70_items where shelf='guest'),'{"status":"live","note":"Welcome"}'))->>'ok' = 'true');
set test.admin='0';
select pg_temp.t('guest item live', (select count(*) from jsonb_array_elements(public.lc70_catalog('guest')->'items')) = 1);
select pg_temp.t('guest not in kyenzo shelf', (select count(*) from jsonb_array_elements(public.lc70_catalog('kyenzo')->'items')) = 3);
set test.email='vip@x.be';
select pg_temp.t('vip no guest access without flag', (public.lc70_open((select id from public.lc70_items where shelf='guest')))->>'error' = 'no_access');
set test.email='coach@creator.be';
select pg_temp.t('creator edit goes back to pending', (public.lc70_creator_submit(jsonb_build_object('id',(select id from public.lc70_items where shelf='guest'),'title','Rook endings v2','creator','Coach Jan')))->>'status' = 'pending');
-- owner tools
set test.admin='1';
select pg_temp.t('owner grant', (public.lc70_admin_grant('Friend@x.be','caro-course',true))->>'ok' = 'true');
select pg_temp.t('owner revoke', (public.lc70_admin_grant('friend@x.be','caro-course',false))->>'ok' = 'true');
select pg_temp.t('revoke removed the row', not exists(select 1 from public.lc70_grants where email='friend@x.be'));
select pg_temp.t('orders listed', jsonb_array_length((public.lc70_admin_orders())->'orders') = 2);
select pg_temp.t('ship order', (public.lc70_admin_order_set((select id from public.lc70_orders where session_id='cs_3'),'shipped','BE123'))->>'ok' = 'true');
update public.lc70_orders set shipped_at = now() - interval '100 days' where session_id='cs_3';
select pg_temp.t('purge wipes old address', (public.lc70_admin_purge())->>'wiped' = '1');
select pg_temp.t('address is gone', (select line1 = '' and name = '' from public.lc70_orders where session_id='cs_3'));
select pg_temp.t('sales report', jsonb_array_length((public.lc70_admin_sales())->'rows') >= 5);
select pg_temp.t('delete bought item keeps it', (public.lc70_admin_delete('caro-course'))->>'kept' = 'true');
select pg_temp.t('kept as draft', exists(select 1 from public.lc70_items where id='caro-course' and status='draft'));
select pg_temp.t('delete unbought draft', (public.lc70_admin_delete('draft-1'))->>'ok' = 'true');
select pg_temp.t('draft is gone', not exists(select 1 from public.lc70_items where id='draft-1'));
-- permissions
select pg_temp.t('anon cannot read items', not has_table_privilege('anon','public.lc70_items','select'));
select pg_temp.t('authenticated cannot read grants', not has_table_privilege('authenticated','public.lc70_grants','select'));
select pg_temp.t('anon may read catalog', has_function_privilege('anon','public.lc70_catalog(text)','execute'));
select pg_temp.t('anon cannot open', not has_function_privilege('anon','public.lc70_open(text)','execute'));
select pg_temp.t('members cannot fake a Stripe grant', not has_function_privilege('authenticated','public.lc70_grant_paid(text,text,text,int)','execute'));
select pg_temp.t('members cannot fake an order', not has_function_privilege('authenticated','public.lc70_order_paid(text,text,text,text,int,jsonb)','execute'));
select (select count(*) from r where ok)||' of '||(select count(*) from r)||' passed' as result;
select name as failed from r where not ok;
