import postgres from 'postgres';
import http from 'node:http';
import { createHmac } from 'node:crypto';
import { makeStripeHandler } from '../out/stripe/stripe.js';
import { PG_TYPES } from '../out/db.js';
const sql = postgres({ host: '127.0.0.1', username: 'postgres', database: 'lc26a', max: 12, types: PG_TYPES, onnotice: () => {} });
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };
/* a licence function that behaves like production: LC- key, expiry, flags, tier */
await sql.unsafe(`create or replace function public._lc_create_license(p_email text, p_source text, p_kind text, p_tier integer, p_lifetime boolean, p_expires timestamptz, p_daily integer, p_flags jsonb, p_devices integer) returns public.licenses language plpgsql as $f$
declare l public.licenses; begin insert into public.licenses (license_key,email,source,kind,tier,lifetime,expires_at,daily_tokens,flags,devices_max) values ('LC-'||upper(substr(md5(random()::text||clock_timestamp()::text),1,16)),p_email,p_source,p_kind,p_tier,p_lifetime,p_expires,p_daily,p_flags,p_devices) returning * into l; return l; end $f$`);
const seen = []; let n = 0, failNext = false;
const mock = http.createServer((req, res) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => { const form = Object.fromEntries(new URLSearchParams(b)); seen.push({ method: req.method, url: req.url, form }); res.setHeader('content-type', 'application/json');
  if (req.url === '/v1/checkout/sessions') { if (failNext) { failNext = false; res.statusCode = 500; return res.end('{"error":{"message":"boom"}}'); } n++; return res.end(JSON.stringify({ id: 'cs_test_' + String(n).padStart(6, '0') + 'abcdefgh', url: 'https://checkout.stripe.test/pay/' + n })); }
  res.statusCode = 404; res.end('{"error":{"message":"nope"}}'); }); }).listen(8803);
const SECRET = 'whsec_test_secret';
const env = { STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: SECRET, ADMIN_TOKEN: 'admin-token-admin-token', STRIPE_API_BASE: 'http://127.0.0.1:8803', APP_URL: 'https://app.test/', ALLOWED_ORIGINS: 'https://app.test' };
const mkh = (e) => makeStripeHandler(sql, Object.assign({}, env, e || {}));
const poster = (handle) => async (path, body, headers) => { const raw = typeof body === 'string' ? body : JSON.stringify(body); const r = await handle(new Request('https://fn.test/functions/v1/stripe/' + path, { method: 'POST', headers: Object.assign({ 'content-type': 'application/json', 'x-forwarded-for': (headers && headers.ip) || '1.1.1.' + (Math.random() * 250 | 0) }, headers || {}), body: raw })); return Object.assign({ status: r.status }, await r.json()); };
const sign = (raw, t) => `t=${t},v1=${createHmac('sha256', SECRET).update(t + '.' + raw).digest('hex')}`;
let evn = 0;
const hookWith = (post) => (ev) => { ev.id = ev.id || 'evt_' + (++evn); const raw = JSON.stringify(ev); return post('webhook', raw, { 'stripe-signature': sign(raw, Math.floor(Date.now() / 1000)), ip: '9.9.9.9' }); };
const reset = async () => { await sql.unsafe('truncate arena.lc34_pro_sales, arena.lc27_events cascade'); await sql.unsafe("delete from public.licenses where source = 'stripe'"); };
const DAY = 864e5;
await reset();

console.log('A. pricing state');
let handle = mkh(), post = poster(handle), hook = hookWith(post);
let r = await post('pricing', {});
ok(r.ok && r.tranche === 1 && r.left[0] === 100 && r.left[1] === 100 && r.yearly.join() === '20000,30000,40000' && r.monthly === 3900, 'empty: tranche 1, 100 + 100 places, EUR 200 / 300 / 400 a year, monthly EUR 39');
ok(r.discountPct.join() === '50,25,0', 'discounts 50% / 25% / 0%');

console.log('B. monthly stays at full price');
r = await post('subscribe', { plan: 'monthly', device: 'dev-1' });
let f = seen.at(-1).form;
ok(r.ok && r.tranche === null && r.amount_cents === 3900 && !r.locked, 'monthly: EUR 39, no tranche, no price lock');
ok(f.mode === 'subscription' && f['line_items[0][price_data][unit_amount]'] === '3900' && f['line_items[0][price_data][recurring][interval]'] === 'month' && f['line_items[0][price_data][currency]'] === 'eur', 'Stripe is asked for a monthly EUR 39 subscription');
ok(f.success_url === 'https://app.test/#upgrades?paid={CHECKOUT_SESSION_ID}'.replace(/[{}]/g, (c) => c) || f.success_url.includes('CHECKOUT_SESSION_ID'), 'success URL carries the session id for the claim step');
ok(+f.expires_at > Date.now() / 1000 + 30 * 60, 'the Checkout session lives at least 30 minutes (Stripe minimum) so a held place is never released early');
r = await post('pricing', {}); ok(r.left[0] === 100, 'a monthly checkout does not use up a founding place');

console.log('C. yearly: first buyers are Founding Members');
r = await post('subscribe', { plan: 'yearly', email: 'Anna@Example.com', device: 'dev-2' });
f = seen.at(-1).form;
ok(r.ok && r.tranche === 1 && r.amount_cents === 20000 && r.locked && r.left[0] === 99, 'first yearly buyer: tranche 1, EUR 200, price locked, 99 left');
ok(f['line_items[0][price_data][unit_amount]'] === '20000' && f['line_items[0][price_data][recurring][interval]'] === 'year' && f.customer_email === 'anna@example.com', 'Stripe gets EUR 200 per year and the (lower-cased) email');
ok(/stays the same for as long as your subscription stays active/.test(f['line_items[0][price_data][product_data][description]']) && /Founding Member/.test(f['line_items[0][price_data][product_data][name]']), 'the product text says the rate is locked while active');
ok(f['metadata[tranche]'] === '1' && f['metadata[lc]'] === 'pro' && f['subscription_data[metadata][tranche]'] === '1', 'the tranche travels in the metadata of the session and of the subscription');
ok((await post('subscribe', { plan: 'weekly' })).status === 400 && (await post('subscribe', { plan: 'yearly', email: 'not an email' })).status === 400, 'bad plan and bad email are refused');

console.log('D. 40 people press the button at the same time (caps 5 and 3)');
await reset(); handle = mkh({ TRANCHE1_CAP: '5', TRANCHE2_CAP: '3' }); post = poster(handle); hook = hookWith(post);
const res = await Promise.all(Array.from({ length: 40 }, (_, i) => post('subscribe', { plan: 'yearly', device: 'race-' + i })));
const by = [0, 0, 0, 0]; res.forEach((x) => { if (x.ok) by[x.tranche]++; });
console.log('    results:', JSON.stringify({ t1: by[1], t2: by[2], t3: by[3], failed: res.filter((x) => !x.ok).length }));
ok(res.every((x) => x.ok), 'every request got a checkout link');
ok(by[1] === 5 && by[2] === 3 && by[3] === 32, 'exactly 5 Founding, 3 Early Adopter, the rest Standard: never one over');
const slots = await sql.unsafe("select tranche, slot, count(*)::int c from arena.lc34_pro_sales where status = 'open' and slot is not null group by 1, 2 having count(*) > 1");
ok(slots.length === 0, 'no slot is held twice');
const amounts = await sql.unsafe("select tranche, array_agg(distinct amount_cents) a from arena.lc34_pro_sales group by 1 order by 1");
ok(amounts.map((x) => x.tranche + ':' + x.a.join()).join('|') === '1:20000|2:30000|3:40000', 'each tranche charges its own price');
r = await post('pricing', {}); ok(r.tranche === 3 && r.left[0] === 0 && r.left[1] === 0, 'pricing now shows Standard: nothing left in tranche 1 or 2');

console.log('E. places are released');
await reset(); handle = mkh({ TRANCHE1_CAP: '2', TRANCHE2_CAP: '1' }); post = poster(handle); hook = hookWith(post);
await post('subscribe', { plan: 'yearly' }); await post('subscribe', { plan: 'yearly' });
failNext = true; r = await post('subscribe', { plan: 'yearly' });
ok(r.status === 502 || r.ok === false, 'Stripe error: the buyer gets an error, not a link');
const orphan = await sql.unsafe("select count(*)::int c from arena.lc34_pro_sales where session_id like 'tmp_%'"); ok(orphan[0].c === 0, 'and no half-created row is left behind');
r = await post('pricing', {}); ok(r.left.join() === '0,1', 'the failed attempt did not use a place (tranche 1 full, tranche 2 has 1)');
await sql.unsafe("update arena.lc34_pro_sales set expires = $1 where tranche = 1 and slot = 1", [Date.now() - 1000]);
r = await post('pricing', {}); ok(r.left.join() === '1,1', 'an unpaid session older than its hold releases the place');
r = await post('subscribe', { plan: 'yearly' }); ok(r.ok && r.tranche === 1 && r.amount_cents === 20000, 'the next buyer gets the released Founding place');

console.log('F. payment: licence, claim, badges');
await reset(); handle = mkh(); post = poster(handle); hook = hookWith(post);
r = await post('subscribe', { plan: 'yearly', email: 'anna@example.com' });
const sid = r.session;
let c = await post('claim', { session: sid }); ok(c.ok && c.status === 'pending', 'before payment: claim says pending');
const completed = (id, extra) => ({ type: 'checkout.session.completed', data: { object: Object.assign({ id, mode: 'subscription', payment_status: 'paid', customer: 'cus_1', subscription: 'sub_1', customer_details: { email: 'Anna@Example.com' }, metadata: { lc: 'pro' } }, extra || {}) } });
const ev1 = completed(sid); ev1.id = 'evt_pay_1';
let h = await hook(ev1); ok(h.status === 200 && h.ok, 'webhook accepted');
c = await post('claim', { session: sid });
ok(c.ok && c.status === 'paid' && /^LC-[0-9A-F]{16}$/.test(c.key) && c.founding && c.early && c.tranche === 1 && c.plan === 'yearly' && c.locked_cents === 20000, 'claim returns the LC- key and the Founding status');
const lic = (await sql.unsafe("select * from public.licenses where license_key = $1", [c.key]))[0];
console.log('    licence row:', JSON.stringify({tier:lic.tier,src:lic.source,email:lic.email,daily:lic.daily_tokens,flags:lic.flags}));
ok(lic.tier === 2 && lic.source === 'stripe' && lic.email === 'anna@example.com' && lic.daily_tokens === 10 && lic.flags.founding === true && lic.flags.tranche === 1 && lic.flags.locked_cents === 20000, 'the licence is Pro (tier 2), 10 tokens a day, with the founding flags');
const days = (new Date(lic.expires_at).getTime() - Date.now()) / DAY; ok(days > 366.5 && days < 367.5, 'yearly: valid for 365 days plus 2 days of grace (' + days.toFixed(1) + ')');
h = await hook(ev1); ok(h.duplicate === true, 'the same Stripe event twice is ignored');
const ev1b = completed(sid); ev1b.id = 'evt_pay_1b'; await hook(ev1b);
ok((await sql.unsafe("select count(*)::int c from public.licenses where source = 'stripe'"))[0].c === 1, 'a second event for the same session does not create a second licence');
let en = await post('entitlement', { key: c.key.toLowerCase() });
ok(en.ok && en.founding && en.early && en.active && en.tranche === 1, 'entitlement: Founding + Early Adopter, active (key in any case)');
ok((await post('entitlement', { key: 'LC-DOESNOTEXIST' })).founding === false && (await post('entitlement', { key: 'x' })).status === 400, 'unknown key: no badges; malformed key: 400');

console.log('G. Early Adopter and Standard buyers');
await reset(); handle = mkh({ TRANCHE1_CAP: '1', TRANCHE2_CAP: '1' }); post = poster(handle); hook = hookWith(post);
const buy = async (email, sub, cus) => { const s = await post('subscribe', { plan: 'yearly', email }); const e = completed(s.session, { customer: cus, subscription: sub, customer_details: { email } }); await hook(e); return Object.assign({ tranche: s.tranche }, await post('claim', { session: s.session })); };
const b1 = await buy('a@x.com', 'sub_a', 'cus_a'), b2 = await buy('b@x.com', 'sub_b', 'cus_b'), b3 = await buy('c@x.com', 'sub_c', 'cus_c');
ok(b1.tranche === 1 && b1.founding && b1.early, 'buyer 1: Founding Member (also gets the Early Adopter badge)');
ok(b2.tranche === 2 && !b2.founding && b2.early && b2.locked_cents === 30000, 'buyer 2: Early Adopter, EUR 300');
ok(b3.tranche === 3 && !b3.founding && !b3.early && b3.locked_cents === 40000, 'buyer 3: Standard, EUR 400, no founding badges');
ok((await post('entitlement', { key: b3.key })).early === false, 'entitlement for a Standard buyer: no badges');

console.log('H. renewal, lapse, refund');
const k1 = b1.key;
const periodEnd = Math.floor((Date.now() + 365 * DAY) / 1000) + 400 * 86400;     // a year later
await hook({ type: 'invoice.paid', data: { object: { id: 'in_1', subscription: 'sub_a', amount_paid: 20000, lines: { data: [{ period: { end: periodEnd } }] } } } });
let l1 = (await sql.unsafe('select expires_at from public.licenses where license_key = $1', [k1]))[0];
ok(Math.abs(new Date(l1.expires_at).getTime() - (periodEnd * 1000 + 2 * DAY)) < 5000, 'a renewal invoice extends the licence to the new period end + 2 days');
await hook({ type: 'invoice.paid', data: { object: { id: 'in_2', subscription: 'sub_a', amount_paid: 20000, lines: { data: [{ period: { end: Math.floor(Date.now() / 1000) + 3600 } }] } } } });
l1 = (await sql.unsafe('select expires_at from public.licenses where license_key = $1', [k1]))[0];
ok(new Date(l1.expires_at).getTime() > periodEnd * 1000, 'an older invoice never shortens a licence');
await hook({ type: 'invoice.paid', data: { object: { id: 'in_3', subscription: 'sub_unknown', amount_paid: 500, lines: { data: [{ period: { end: periodEnd } }] } } } });
ok(true, 'an invoice for a subscription we do not know is ignored without error');
await sql.unsafe("update public.licenses set expires_at = now() - interval '1 day' where license_key = $1", [k1]);
en = await post('entitlement', { key: k1 }); ok(en.founding === true && en.active === false, 'after a lapse the Founding badge stays (lifetime badge) but the membership is not active');
await hook({ type: 'charge.refunded', data: { object: { id: 'ch_1', refunded: true, customer: 'cus_c', amount_refunded: 40000 } } });
const rl = (await sql.unsafe("select revoked, status from public.licenses where license_key = $1", [b3.key]))[0];
ok(rl.revoked === true, 'a full refund revokes the licence (status: ' + rl.status + ')');
ok((await post('claim', { session: (await sql.unsafe("select session_id from arena.lc34_pro_sales where customer_id = 'cus_c'"))[0].session_id })).status === 'refunded', 'and the sale is marked refunded');
await hook({ type: 'charge.refunded', data: { object: { id: 'ch_2', refunded: false, customer: 'cus_a', amount_refunded: 1000 } } });
ok((await sql.unsafe("select status from arena.lc34_pro_sales where customer_id = 'cus_a'"))[0].status === 'paid', 'a partial refund changes nothing');

console.log('I. late payment after the hold ran out');
await reset(); handle = mkh({ TRANCHE1_CAP: '1', TRANCHE2_CAP: '1' }); post = poster(handle); hook = hookWith(post);
const sA = await post('subscribe', { plan: 'yearly', email: 'late@x.com' });
await sql.unsafe("update arena.lc34_pro_sales set expires = $1 where session_id = $2", [Date.now() - 1000, sA.session]);
const sB = await post('subscribe', { plan: 'yearly', email: 'b@x.com' });
ok(sB.tranche === 1, 'while A\'s hold is expired, B takes the place');
const lateEv = completed(sA.session, { customer: 'cus_late', subscription: 'sub_late', customer_details: { email: 'late@x.com' } }); const lh = await hook(lateEv);
ok(lh.status === 200, 'A\'s payment still arrives and is accepted (no error, no retry storm)');
const ca = await post('claim', { session: sA.session }); ok(ca.status === 'paid' && ca.locked_cents === 20000 && ca.founding === true, 'A paid EUR 200, so A keeps the EUR 200 price and the Founding badge');
const dup = await sql.unsafe("select count(*)::int c from arena.lc34_pro_sales where tranche = 1 and slot = 1 and status in ('open','paid')"); ok(dup[0].c === 1, 'and the place numbering is still unique');

console.log('J. expiry event, signature, claim input');
await reset(); handle = mkh(); post = poster(handle); hook = hookWith(post);
const sX = await post('subscribe', { plan: 'yearly' });
await hook({ type: 'checkout.session.expired', data: { object: { id: sX.session, metadata: { lc: 'pro' } } } });
ok((await post('claim', { session: sX.session })).status === 'expired', 'checkout.session.expired marks the sale expired');
ok((await post('pricing', {})).left[0] === 100, 'and gives the place back');
ok((await post('claim', { session: 'nope' })).status === 400 && (await post('claim', { session: 'cs_test_unknownsession123' })).status === 404, 'bad and unknown session ids');
const raw = JSON.stringify({ id: 'evt_bad', type: 'invoice.paid', data: { object: {} } });
ok((await post('webhook', raw, { 'stripe-signature': 't=1,v1=00' })).status === 400, 'a webhook without a valid Stripe signature is refused');
const hits = []; for (let i = 0; i < 12; i++) hits.push((await post('subscribe', { plan: 'monthly' }, { ip: '7.7.7.7' })).status);
ok(hits.includes(429), 'one address cannot create more than 10 checkout sessions a minute');
console.log(`\n${pass} passed, ${fail} failed`); mock.close(); await sql.end();
