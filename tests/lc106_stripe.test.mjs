/* LC106 (9.74.0): the 2-Week Rating Sprint price in the Stripe function. Fake database, fake Stripe and Supabase Auth.
   Route "sprint": signed in, the ticked box, and the database's price (never the browser's number); the price is a one-time percent coupon
   that replaces the 10 % referral discount; a trial checkout of a Sprint member gets it too; a missing SQL means no price (fails closed);
   the webhook marks the price used, once.
   node tests/lc106_stripe.test.mjs */
import { makeStripeHandler } from '../functions/stripe/stripe.js';
import { createHmac } from 'node:crypto';
let pass = 0, fail = 0; const t = (n, c) => { if (c) { pass++; console.log('  ok  ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const seen = [];
const S = { pct: 20, pctThrows: false, disc: null };
const fakeSql = { unsafe: async (q, a) => { seen.push([q, a]); let r = [];
    if (/_lc106_reward_pct/.test(q)) { if (S.pctThrows) throw Object.assign(new Error('function public._lc106_reward_pct(text) does not exist'), { code: '42883' }); r = [{ p: S.pct }]; }
    else if (/FROM public\.lc89_cfg WHERE k = 'paywall'/.test(q)) r = [];
    else if (/GROUP BY tranche, status/.test(q)) r = [];
    else if (/SELECT slot FROM/.test(q)) r = [];
    else if (/SELECT 1 AS ok FROM public\.lc73_trials WHERE email/.test(q)) r = [];
    else if (/FROM public\.licenses WHERE lower\(email\)/.test(q)) r = [];
    else if (/lc73_discount_for/.test(q)) r = [{ k: S.disc }];
    else if (/FROM public\.lc73_customers/.test(q)) r = [];
    else if (/SELECT \* FROM arena\.lc34_pro_sales WHERE session_id/.test(q)) r = [{ session_id: 'cs_test_sprint123456', tier: 2, plan: 'monthly', email: 'a@b.co', amount_cents: 3900, tranche: null, device: 'dev_abcdefgh1' }];
    else if (/_lc_create_license/.test(q)) r = [{ license_key: 'LC-SPRINT-KEY' }];
    r.count = 1; return r; }, begin: async (f) => f(fakeSql) };
const forms = [], coupons = [];
const fetchImpl = async (u, o) => {
  if (/\/auth\/v1\/user$/.test(u)) return new Response(JSON.stringify(/good/.test(o.headers.Authorization) ? { email: 'a@b.co' } : {}), { status: /good/.test(o.headers.Authorization) ? 200 : 401 });
  if (/\/v1\/coupons/.test(u)) { coupons.push([o.method, u, new URLSearchParams(o.body || '')]); return new Response(JSON.stringify({ id: 'x' }), { status: o.method === 'GET' ? 404 : 200 }); }
  forms.push(new URLSearchParams(o.body || ''));
  return new Response(JSON.stringify({ id: 'cs_test_sprint123456', url: 'https://checkout.stripe.com/c/pay/s' }), { status: 200 });
};
const env = { STRIPE_SECRET_KEY: 'sk_test_x', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', STRIPE_WEBHOOK_SECRET: 'whsec_test_1234567890', APP_URL: 'https://lanckrietchesstrainerhub.vercel.app/app.html' };
let h = makeStripeHandler(fakeSql, env, fetchImpl);
const call = async (path, body) => { const r = await h(new Request('https://x.supabase.co/functions/v1/stripe/' + path, { method: 'POST', body: JSON.stringify(body) })); const j = await r.json(); j._status = r.status; return j; };
const TOK = 'good.token.abcdefghijklmnopqrstuvwxyz';
const ran = (re) => seen.filter(([q]) => re.test(q));

let j = await call('sprint', { plan: 'monthly', consent: true });
t('signed out: refused (sign_in)', j.ok === false && j.reason === 'sign_in' && forms.length === 0);
j = await call('sprint', { token: TOK, plan: 'monthly' });
t('without the ticked box: refused (consent)', j.ok === false && j.reason === 'consent' && forms.length === 0);
S.pct = 0; j = await call('sprint', { token: TOK, plan: 'monthly', consent: true });
t('no Sprint price in the database: refused', j.ok === false && j.reason === 'no_sprint_price' && forms.length === 0);
S.pct = 20; S.disc = 'invitee';
j = await call('sprint', { token: TOK, plan: 'monthly', tier: 3, consent: true, pct: 60 }); let f = forms.pop();
t('with the price: the checkout opens', j.ok === true && /checkout\.stripe\.com/.test(j.url));
t('the coupon is the database\'s 20 %, not the browser\'s 60 %', f.get('discounts[0][coupon]') === 'LC-SPRINT20' && coupons.some(([m, , b]) => m === 'POST' && b.get('percent_off') === '20' && b.get('duration') === 'once'));
t('no 10 % referral discount on top', !f.get('discounts[1][coupon]') && !f.get('metadata[ref_disc]'));
t('VIP can be bought with it', /VIP/.test(f.get('line_items[0][price_data][product_data][name]') || ''));
t('metadata marks the Sprint price and the waiver', f.get('metadata[sprint]') === '1' && f.get('metadata[sprint_pct]') === '20' && !!f.get('metadata[withdrawal_waiver]'));
S.disc = null;
j = await call('trial', { token: TOK, plan: 'monthly', consent: true }); f = forms.pop();
t('a trial of a Sprint member carries the price to the first payment', j.ok === true && f.get('discounts[0][coupon]') === 'LC-SPRINT20' && f.get('subscription_data[trial_period_days]'));
S.pctThrows = true; j = await call('trial', { token: TOK, plan: 'monthly', consent: true }); f = forms.pop(); S.pctThrows = false;
t('the LC106 SQL missing: the trial still works, without a Sprint price', j.ok === true && !f.get('discounts[0][coupon]') && !f.get('metadata[sprint]'));
h = makeStripeHandler(fakeSql, env, fetchImpl);   /* a fresh handler: the per-IP limit */
S.pctThrows = true; j = await call('sprint', { token: TOK, plan: 'monthly', consent: true }); S.pctThrows = false;
t('the LC106 SQL missing: the sprint route refuses (fails closed)', j.ok === false && j.reason === 'no_sprint_price');

const hook = async (ev) => { const raw = JSON.stringify(ev), ts = Math.floor(Date.now() / 1000), sig = 't=' + ts + ',v1=' + createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(ts + '.' + raw).digest('hex');
  return h(new Request('https://x.supabase.co/functions/v1/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': sig }, body: raw })); };
seen.length = 0;
let w = await hook({ id: 'evt_s1', type: 'checkout.session.completed', data: { object: { id: 'cs_test_sprint123456', mode: 'subscription', payment_status: 'paid', amount_total: 3120, subscription: 'sub_S1', customer: 'cus_S1', customer_details: { email: 'a@b.co' }, metadata: { lc: 'pro', plan: 'monthly', sprint: '1', sprint_pct: '20' } } } });
t('paid: the licence is made and the Sprint price is marked used for this account and session', w.status === 200 && ran(/_lc_create_license/).length === 1 && ran(/_lc106_used/).some(([, a]) => a[0] === 'a@b.co' && a[1] === 'cs_test_sprint123456'));
seen.length = 0;
w = await hook({ id: 'evt_s2', type: 'checkout.session.completed', data: { object: { id: 'cs_test_sprint123456', mode: 'subscription', payment_status: 'paid', customer_details: { email: 'a@b.co' }, metadata: { lc: 'pro', plan: 'monthly' } } } });
t('a normal purchase does not touch the Sprint price', !ran(/_lc106_used/).length);
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
