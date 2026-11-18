/* 9.58.0: the Stripe function never breaks on a missing table, takes Stripe's big events, and records the paid step of the funnel.
   - lc89_cfg missing (its SQL not run): the Founding Trial still starts with the built-in 7 days and prices
   - /webhook accepts bodies up to 512 KB (an invoice with lines and tax is often over 20 KB); the browser routes keep 20 KB
   - a paid checkout writes lc94_funnel (device, 'paid'); a missing lc94_funnel is logged and never stops the licence
   node tests/stripe958.test.mjs */
import { makeStripeHandler, WEBHOOK_MAX } from '../functions/stripe/stripe.js';
import { createHmac } from 'node:crypto';
let pass = 0, fail = 0; const t = (n, c) => { if (c) { pass++; console.log('  ok  ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const seen = [], state = { cfgMissing: true, funnelMissing: false, device: 'd-abc123def456gh' };
const missing = (rel) => Object.assign(new Error('relation "' + rel + '" does not exist'), { code: '42P01' });
const fakeSql = { unsafe: async (q, a) => { seen.push([q, a]); let r = [];
    if (/FROM public\.lc89_cfg/.test(q)) { if (state.cfgMissing) throw missing('public.lc89_cfg'); r = []; }
    else if (/INTO public\.lc94_funnel/.test(q)) { if (state.funnelMissing) throw missing('public.lc94_funnel'); }
    else if (/FROM public\.lc73_trials WHERE email/.test(q)) r = [];
    else if (/FROM public\.licenses WHERE lower\(email\)/.test(q)) r = [];
    else if (/lc73_discount_for/.test(q)) r = [{ k: null }];
    else if (/FROM public\.lc73_customers/.test(q)) r = [];
    else if (/SELECT \* FROM arena\.lc34_pro_sales WHERE session_id/.test(q)) r = [{ session_id: 'cs_paid_1234567890', tier: 2, plan: 'monthly', email: 'a@b.co', amount_cents: 3900, tranche: null, device: state.device }];
    else if (/_lc_create_license/.test(q)) r = [{ license_key: 'LC-TEST-KEY' }];
    r.count = 1; return r; }, begin: async (f) => f(fakeSql) };
const forms = [];
const fetchImpl = async (u, o) => {
  if (/\/auth\/v1\/user$/.test(u)) return new Response(JSON.stringify({ email: 'a@b.co' }), { status: 200 });
  forms.push(new URLSearchParams(o.body || ''));
  return new Response(JSON.stringify({ id: 'cs_test_abcdefghij', url: 'https://checkout.stripe.com/x' }), { status: 200 });
};
const env = { STRIPE_SECRET_KEY: 'sk_test_x', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', STRIPE_WEBHOOK_SECRET: 'whsec_test_1234567890' };
const errs = []; const oldErr = console.error; console.error = (...a) => errs.push(a.join(' '));
const h = makeStripeHandler(fakeSql, env, fetchImpl);
const call = async (path, body) => { const r = await h(new Request('https://x.supabase.co/functions/v1/stripe/' + path, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) })); return { status: r.status, j: await r.json() }; };
const hook = async (ev, pad) => { if (pad) ev.data.object.padding = 'x'.repeat(pad); const raw = JSON.stringify(ev), ts = Math.floor(Date.now() / 1000), sig = 't=' + ts + ',v1=' + createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(ts + '.' + raw).digest('hex');
  const r = await h(new Request('https://x.supabase.co/functions/v1/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': sig }, body: raw })); return { status: r.status, j: await r.json() }; };

// 1. lc89_cfg missing: the trial still works with the defaults
let r = await call('trial', { token: 'good.token.abcdefghijklmnopqrstuvwxyz', plan: 'monthly', device: state.device });
let f = forms.pop();
t('lc89_cfg missing: the trial route answers 200, not 500', r.status === 200 && r.j.ok === true);
t('lc89_cfg missing: the built-in 7-day trial is used', f && f.get('subscription_data[trial_period_days]') === '7');
t('lc89_cfg missing: the reason is in the logs, with the SQL file to run', errs.some((e) => /lc89_cfg/.test(e) && /20261116100000/.test(e)));
t('the device is sent to Stripe as client_reference_id', f && f.get('client_reference_id') === state.device);

// 2. the webhook size limit
t('WEBHOOK_MAX is 512 KB', WEBHOOK_MAX === 524288);
seen.length = 0;
r = await hook({ id: 'evt_big1', type: 'invoice.paid', data: { object: { id: 'in_1', subscription: 'sub_none', amount_paid: 3900 } } }, 60000);
t('a 60 KB Stripe event is accepted (was 413)', r.status === 200 && r.j.ok === true);
r = await hook({ id: 'evt_huge', type: 'invoice.paid', data: { object: { id: 'in_2' } } }, 600000);
t('an event over 512 KB is refused with 413', r.status === 413);
r = await call('subscribe', JSON.stringify({ plan: 'monthly', pad: 'x'.repeat(30000) }));
t('the browser routes keep the 20 KB limit', r.status === 413);

// 3. the paid step of the funnel
seen.length = 0;
r = await hook({ id: 'evt_paid1', type: 'checkout.session.completed', data: { object: { id: 'cs_paid_1234567890', mode: 'subscription', payment_status: 'paid', subscription: 'sub_P1', customer: 'cus_P1', customer_details: { email: 'a@b.co' }, metadata: { lc: 'pro' } } } });
const fp = seen.find(([q]) => /INTO public\.lc94_funnel/.test(q));
t('paid checkout: lc94_funnel gets (device, paid)', r.status === 200 && fp && fp[1][0] === state.device && /'paid'/.test(fp[0]));
t('paid checkout: the licence is still created', seen.some(([q]) => /_lc_create_license/.test(q)));
state.funnelMissing = true; seen.length = 0; errs.length = 0;
r = await hook({ id: 'evt_paid2', type: 'checkout.session.completed', data: { object: { id: 'cs_paid_1234567890', mode: 'subscription', payment_status: 'paid', subscription: 'sub_P2', customer: 'cus_P2', customer_details: { email: 'a@b.co' }, metadata: { lc: 'pro' } } } });
t('lc94_funnel missing: the webhook still answers 200 and creates the licence', r.status === 200 && seen.some(([q]) => /_lc_create_license/.test(q)));
t('lc94_funnel missing: logged, not thrown', errs.some((e) => /LC94/.test(e)));
state.funnelMissing = false; state.device = 'bad id!'; seen.length = 0;
await hook({ id: 'evt_paid3', type: 'checkout.session.completed', data: { object: { id: 'cs_paid_1234567890', mode: 'subscription', payment_status: 'paid', subscription: 'sub_P3', customer: 'cus_P3', customer_details: { email: 'a@b.co' }, metadata: { lc: 'pro' } } } });
t('a sale without a valid device id writes no funnel row', !seen.some(([q]) => /INTO public\.lc94_funnel/.test(q)));

console.error = oldErr;
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
