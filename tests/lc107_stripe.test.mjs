/* 9.75.0: the Sprint's 13th month in the Stripe function. Fake database, fake Stripe and Supabase Auth.
   Route "sprint" with a month reward: yearly only (monthly is refused), no coupon, the metadata marks the 13th month; the webhook pays,
   makes the licence, then moves the first renewal 30 days (trial_end = period end + 30 days, no proration) and adds 30 days to the
   licence, and marks the reward used. A yearly trial that converts inside the reward window gets the same; a normal conversion does not.
   A missing reward SQL = no 13th month (fails closed).
   node tests/lc107_stripe.test.mjs */
import { makeStripeHandler } from '../functions/stripe/stripe.js';
import { createHmac } from 'node:crypto';
let pass = 0, fail = 0; const t = (n, c) => { if (c) { pass++; console.log('  ok  ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const seen = [];
const S = { reward: { kind: 'month', pct: 0, until: '2026-12-01T10:00:00Z' }, throws: false, trial: null, sale: null };
const fakeSql = { unsafe: async (q, a) => { seen.push([q, a]); let r = [];
    if (/_lc106_reward\(/.test(q)) { if (S.throws) throw Object.assign(new Error('function public._lc106_reward(text) does not exist'), { code: '42883' }); r = [{ r: S.reward }]; }
    else if (/_lc106_reward_pct/.test(q)) { if (S.throws) throw Object.assign(new Error('missing'), { code: '42883' }); r = [{ p: 0 }]; }
    else if (/FROM public\.lc89_cfg WHERE k = 'paywall'/.test(q)) r = [];
    else if (/GROUP BY tranche, status/.test(q)) r = [];
    else if (/SELECT slot FROM/.test(q)) r = [];
    else if (/SELECT 1 AS ok FROM public\.lc73_trials WHERE email/.test(q)) r = [];
    else if (/SELECT session_id FROM public\.lc73_trials WHERE subscription_id/.test(q)) r = S.trial ? [{ session_id: S.trial }] : [];
    else if (/FROM public\.licenses WHERE lower\(email\)/.test(q)) r = [];
    else if (/lc73_discount_for/.test(q)) r = [{ k: null }];
    else if (/FROM public\.lc73_customers/.test(q)) r = [];
    else if (/SELECT \* FROM arena\.lc34_pro_sales WHERE session_id/.test(q)) r = [{ session_id: 'cs_test_year13', tier: 2, plan: 'yearly', email: 'a@b.co', amount_cents: 19950, tranche: 1, device: 'dev_abcdefgh1' }];
    else if (/SELECT \* FROM arena\.lc34_pro_sales WHERE subscription_id/.test(q)) r = S.sale ? [S.sale] : [];
    else if (/_lc_create_license/.test(q)) r = [{ license_key: 'LC-YEAR-13' }];
    r.count = 1; return r; }, begin: async (f) => f(fakeSql) };
const forms = [], subs = [];
const PERIOD_END = 1830000000;
const fetchImpl = async (u, o) => {
  if (/\/auth\/v1\/user$/.test(u)) return new Response(JSON.stringify(/good/.test(o.headers.Authorization) ? { email: 'a@b.co' } : {}), { status: /good/.test(o.headers.Authorization) ? 200 : 401 });
  if (/\/v1\/coupons/.test(u)) return new Response(JSON.stringify({ id: 'x' }), { status: o.method === 'GET' ? 404 : 200 });
  if (/\/v1\/subscriptions\//.test(u)) { subs.push([o.method, u, new URLSearchParams(o.body || '')]); return new Response(JSON.stringify(o.method === 'GET' ? { id: 'sub_Y1', items: { data: [{ current_period_end: PERIOD_END }] } } : { id: 'sub_Y1' }), { status: 200 }); }
  forms.push(new URLSearchParams(o.body || ''));
  return new Response(JSON.stringify({ id: 'cs_test_year13', url: 'https://checkout.stripe.com/c/pay/y13' }), { status: 200 });
};
const env = { STRIPE_SECRET_KEY: 'sk_test_x', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', STRIPE_WEBHOOK_SECRET: 'whsec_test_1234567890', APP_URL: 'https://lanckrietchesstrainerhub.vercel.app/app.html' };
let h = makeStripeHandler(fakeSql, env, fetchImpl);
const call = async (path, body) => { const r = await h(new Request('https://x.supabase.co/functions/v1/stripe/' + path, { method: 'POST', body: JSON.stringify(body) })); const j = await r.json(); j._status = r.status; return j; };
const TOK = 'good.token.abcdefghijklmnopqrstuvwxyz';
const ran = (re) => seen.filter(([q]) => re.test(q));

let j = await call('sprint', { token: TOK, plan: 'monthly', consent: true });
t('month reward: the monthly plan is refused (yearly_only)', j.ok === false && j.reason === 'yearly_only' && forms.length === 0);
j = await call('sprint', { token: TOK, plan: 'yearly', tier: 3, consent: true }); let f = forms.pop();
t('yearly: the checkout opens', j.ok === true && /checkout\.stripe\.com/.test(j.url));
t('no coupon, the 13th month in the metadata', !f.get('discounts[0][coupon]') && f.get('metadata[sprint]') === '1' && f.get('metadata[sprint_month]') === '1' && f.get('subscription_data[metadata][sprint_month]') === '1');
h = makeStripeHandler(fakeSql, env, fetchImpl);
j = await call('trial', { token: TOK, plan: 'yearly', consent: true }); f = forms.pop();
t('a trial checkout carries no 13th month yet (it comes at the conversion)', j.ok === true && !f.get('metadata[sprint_month]'));
S.throws = true; h = makeStripeHandler(fakeSql, env, fetchImpl);
j = await call('sprint', { token: TOK, plan: 'yearly', consent: true });
t('the reward SQL missing: refused (fails closed)', j.ok === false && j.reason === 'no_sprint_price');
S.throws = false;

const hook = async (ev) => { const raw = JSON.stringify(ev), ts = Math.floor(Date.now() / 1000), sig = 't=' + ts + ',v1=' + createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(ts + '.' + raw).digest('hex');
  return h(new Request('https://x.supabase.co/functions/v1/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': sig }, body: raw })); };
seen.length = 0; subs.length = 0;
let w = await hook({ id: 'evt_y13', type: 'checkout.session.completed', data: { object: { id: 'cs_test_year13', mode: 'subscription', payment_status: 'paid', amount_total: 19950, subscription: 'sub_Y1', customer: 'cus_A1', customer_details: { email: 'a@b.co' }, metadata: { lc: 'pro', plan: 'yearly', sprint: '1', sprint_month: '1' } } } });
const upd = subs.find(([m]) => m === 'POST');
t('paid: the licence is made', w.status === 200 && ran(/_lc_create_license/).length === 1);
t('the first renewal moves 30 days: trial_end = period end + 30 days, no proration', upd && upd[2].get('trial_end') === String(PERIOD_END + 30 * 86400) && upd[2].get('proration_behavior') === 'none');
t('the licence runs 30 days longer', ran(/expires_at \+ interval '30 days'/).some(([, a]) => a[0] === 'LC-YEAR-13'));
t('the reward is marked used', ran(/_lc106_used/).some(([, a]) => a[0] === 'a@b.co'));
seen.length = 0; subs.length = 0;
w = await hook({ id: 'evt_plain', type: 'checkout.session.completed', data: { object: { id: 'cs_test_year13', mode: 'subscription', payment_status: 'paid', subscription: 'sub_Y1', customer_details: { email: 'a@b.co' }, metadata: { lc: 'pro', plan: 'yearly' } } } });
t('a normal yearly purchase gets no 13th month', !subs.some(([m]) => m === 'POST') && !ran(/expires_at \+ interval/).length);
// a yearly trial converting inside the window
S.sale = { session_id: 'cs_trial1', tier: 2, plan: 'yearly', email: 'a@b.co', amount_cents: 19950, tranche: 1, license_key: 'LC-TRIAL-1', status: 'paid' }; S.trial = 'cs_trial1';
seen.length = 0; subs.length = 0;
w = await hook({ id: 'evt_conv', type: 'invoice.paid', data: { object: { id: 'in_1', subscription: 'sub_Y1', amount_paid: 19950, billing_reason: 'subscription_cycle', lines: { data: [{ period: { end: PERIOD_END } }] } } } });
t('a yearly trial that converts inside the window: the 13th month and used', w.status === 200 && subs.some(([m]) => m === 'POST') && ran(/expires_at \+ interval '30 days'/).length === 1 && ran(/_lc106_used/).length === 1);
S.reward = null; seen.length = 0; subs.length = 0; S.trial = 'cs_trial1';
w = await hook({ id: 'evt_conv2', type: 'invoice.paid', data: { object: { id: 'in_2', subscription: 'sub_Y1', amount_paid: 19950, billing_reason: 'subscription_cycle', lines: { data: [{ period: { end: PERIOD_END } }] } } } });
t('no reward: a normal conversion', !subs.some(([m]) => m === 'POST') && !ran(/_lc106_used/).length);
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
