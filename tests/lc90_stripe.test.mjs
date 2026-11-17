/* LC90 (9.52.0): the Day-7 Founding Trial in the Stripe function. Fake database and fake Stripe / Supabase Auth.
   The trial runs on the yearly plan (Founding rate, a place held) or the monthly plan; its length and the Price IDs come from the owner's
   lc89_cfg 'paywall' row on the SERVER; a Price ID is used only after Stripe confirms it; a cancelled, unconverted trial frees its place.
   node tests/lc90_stripe.test.mjs */
import { makeStripeHandler } from '../functions/stripe/stripe.js';
import { createHmac } from 'node:crypto';
let pass = 0, fail = 0; const t = (n, c) => { if (c) { pass++; console.log('  ok  ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const seen = [];
let state = { soldT1: 0, cfg: null, trialOpen: true };
const fakeSql = { unsafe: async (q, a) => { seen.push([q, a]); let r = [];
    if (/FROM public\.lc89_cfg WHERE k = 'paywall'/.test(q)) r = state.cfg ? [{ v: state.cfg }] : [];
    else if (/GROUP BY tranche, status/.test(q)) r = state.soldT1 ? [{ tranche: 1, status: 'paid', n: state.soldT1 }] : [];
    else if (/SELECT slot FROM/.test(q)) r = state.soldT1 >= 100 && a[0] === 1 ? Array.from({ length: 100 }, (_, i) => ({ slot: i + 1 })) : [];
    else if (/FROM public\.lc73_trials WHERE subscription_id = \$1 AND converted_at IS NULL/.test(q) && /SELECT 1/.test(q)) r = state.trialOpen ? [{ ok: 1 }] : [];
    else if (/FROM public\.lc73_trials WHERE email/.test(q)) r = [];
    else if (/FROM public\.licenses WHERE lower\(email\)/.test(q)) r = [];
    else if (/lc73_discount_for/.test(q)) r = [{ k: null }];
    else if (/FROM public\.lc73_customers/.test(q)) r = [];
    else if (/SELECT \* FROM arena\.lc34_pro_sales WHERE session_id/.test(q)) r = [{ session_id: 'cs_trial_y1234567890', tier: 2, plan: 'yearly', email: 'a@b.co', amount_cents: 19950, tranche: 1 }];
    else if (/_lc_create_license/.test(q)) r = [{ license_key: 'LC-TEST-KEY' }];
    r.count = 1; return r; }, begin: async (f) => f(fakeSql) };
const forms = [], gets = [];
let priceObj = { id: 'price_FOUND1234', active: true, currency: 'eur', unit_amount: 19900, recurring: { interval: 'year' } };
const fetchImpl = async (u, o) => {
  if (/\/auth\/v1\/user$/.test(u)) return new Response(JSON.stringify(/good/.test(o.headers.Authorization) ? { email: 'a@b.co' } : {}), { status: /good/.test(o.headers.Authorization) ? 200 : 401 });
  if (/\/v1\/prices\//.test(u)) { gets.push(u); return new Response(JSON.stringify(priceObj), { status: priceObj ? 200 : 404 }); }
  if (/coupons/.test(u)) return new Response(JSON.stringify({ id: 'LC-REF10' }), { status: 200 });
  forms.push(new URLSearchParams(o.body || ''));
  return new Response(JSON.stringify({ id: 'cs_test_abcdefghij', url: 'https://checkout.stripe.com/x' }), { status: 200 });
};
const env = { STRIPE_SECRET_KEY: 'sk_test_x', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', STRIPE_WEBHOOK_SECRET: 'whsec_test_1234567890' };
const mk = () => makeStripeHandler(fakeSql, env, fetchImpl);
let h = mk();
const call = async (path, body) => (await h(new Request('https://x.supabase.co/functions/v1/stripe/' + path, { method: 'POST', body: JSON.stringify(body) }))).json();
const TOK = 'good.token.abcdefghijklmnopqrstuvwxyz';

// no owner config: the LC73 defaults (7 days, built-in prices)
let j = await call('trial', { token: TOK, plan: 'yearly' }); let f = forms.pop();
t('Founding Trial on the yearly plan: 7 days, card required', j.ok && f.get('subscription_data[trial_period_days]') === '7' && f.get('payment_method_collection') === 'always');
t('yearly trial: the live Founding rate 199.50 a year, built-in price', f.get('line_items[0][price_data][unit_amount]') === '19950' && f.get('line_items[0][price_data][recurring][interval]') === 'year' && j.tranche === 1);
t('yearly trial: the checkout text says "a year" and day 8', /From day 8 Pro costs EUR 199\.50 a year/.test(f.get('custom_text[submit][message]') || ''));
t('the trial metadata carries trial_days', f.get('metadata[trial]') === '1' && f.get('metadata[trial_days]') === '7');
t('a Founding place is held for the trial', seen.some(([q, a]) => /INSERT INTO arena\.lc34_pro_sales/.test(q) && a && a.includes(1) && a.includes('yearly')));
j = await call('trial', { token: TOK }); f = forms.pop();
t('no plan given: the monthly trial as before (39 a month)', j.ok && f.get('line_items[0][price_data][unit_amount]') === '3900' && /a month/.test(f.get('custom_text[submit][message]') || ''));

// the owner's config, read on the server
state.cfg = { trial_days: 14, stripe_price_yearly: 'price_FOUND1234', stripe_price_monthly: '' }; h = mk();
j = await call('trial', { token: TOK, plan: 'yearly', trial_days: 30 }); f = forms.pop();
t('the trial length comes from the owner\'s config (14), not from the browser (30)', f.get('subscription_data[trial_period_days]') === '14' && /From day 15/.test(f.get('custom_text[submit][message]') || ''));
t('a confirmed Price ID replaces the built-in price', f.get('line_items[0][price]') === 'price_FOUND1234' && !f.get('line_items[0][price_data][unit_amount]'));
t('the ledger and the text follow the Price ID amount (199.00)', j.amount_cents === 19900 && /EUR 199\.00 a year/.test(f.get('custom_text[submit][message]') || '') && seen.some(([q, a]) => /UPDATE arena\.lc34_pro_sales SET amount_cents/.test(q) && a[0] === 19900));
t('Stripe was asked about the Price ID', gets.some((u) => /prices\/price_FOUND1234$/.test(u)));
priceObj = Object.assign({}, priceObj, { recurring: { interval: 'month' } }); h = mk(); gets.length = 0;
j = await call('trial', { token: TOK, plan: 'yearly' }); f = forms.pop();
t('a Price ID with the wrong interval is ignored (built-in yearly price)', f.get('line_items[0][price_data][unit_amount]') === '19950' && !f.get('line_items[0][price]'));
priceObj = Object.assign({}, priceObj, { recurring: { interval: 'year' }, active: false }); h = mk();
j = await call('subscribe', { plan: 'yearly', tier: 2, token: TOK }); f = forms.pop();
t('an archived Price ID is ignored', !f.get('line_items[0][price]') && f.get('line_items[0][price_data][unit_amount]') === '19950');
priceObj = Object.assign({}, priceObj, { active: true, currency: 'usd' }); h = mk();
j = await call('subscribe', { plan: 'yearly', tier: 2, token: TOK }); f = forms.pop();
t('a Price ID in another currency is ignored', !f.get('line_items[0][price]'));
priceObj = { id: 'price_FOUND1234', active: true, currency: 'eur', unit_amount: 19900, recurring: { interval: 'year' } }; state.soldT1 = 100; h = mk();
j = await call('subscribe', { plan: 'yearly', tier: 2, token: TOK }); f = forms.pop();
t('after the first 100: the Founding Price ID is not used (Early Adopter ladder price)', !f.get('line_items[0][price]') && f.get('line_items[0][price_data][unit_amount]') === '29925');
state.soldT1 = 0;
j = await call('subscribe', { plan: 'yearly', tier: 3, token: TOK }); f = forms.pop();
t('VIP never uses the Pro Price ID', !f.get('line_items[0][price]'));
state.cfg = { trial_days: 0 }; h = mk();
j = await call('trial', { token: TOK, plan: 'yearly' });
t('trial length 0: the trial is switched off', j.ok === false && j.reason === 'no_trial');
state.cfg = { trial_days: 'x' }; h = mk();
j = await call('trial', { token: TOK, plan: 'monthly' }); f = forms.pop();
t('a broken trial length falls back to 7', f.get('subscription_data[trial_period_days]') === '7');

// webhook: the trial licence follows the trial length; a cancelled, unconverted trial frees its place
const hook = async (ev) => { const raw = JSON.stringify(ev), ts = Math.floor(Date.now() / 1000), sig = 't=' + ts + ',v1=' + createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(ts + '.' + raw).digest('hex');
  return h(new Request('https://x.supabase.co/functions/v1/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': sig }, body: raw })); };
seen.length = 0;
let w = await hook({ id: 'evt_y1', type: 'checkout.session.completed', data: { object: { id: 'cs_trial_y1234567890', mode: 'subscription', payment_status: 'no_payment_required', subscription: 'sub_Y1', customer: 'cus_ABC123', customer_details: { email: 'a@b.co' }, metadata: { lc: 'pro', trial: '1', trial_days: '14' } } } });
const lic = seen.find(([q]) => /_lc_create_license/.test(q)), until = lic && Date.parse(lic[1][5]);
t('webhook: the 14-day trial gets a licence of about 15 days + grace', w.status === 200 && until > Date.now() + 16 * 864e5 && until < Date.now() + 18 * 864e5);
const tr = seen.find(([q]) => /INSERT INTO public\.lc73_trials/.test(q));
t('webhook: the trial end is day 14', tr && Math.abs(Date.parse(tr[1][4]) - (Date.now() + 14 * 864e5)) < 6e4);
seen.length = 0;
w = await hook({ id: 'evt_y2', type: 'customer.subscription.deleted', data: { object: { id: 'sub_Y1' } } });
t('cancelled during the trial: the Founding place is freed', seen.some(([q, a]) => /UPDATE arena\.lc34_pro_sales SET status = 'expired', slot = NULL WHERE subscription_id/.test(q) && a[0] === 'sub_Y1'));
state.trialOpen = false; seen.length = 0;
w = await hook({ id: 'evt_y3', type: 'customer.subscription.deleted', data: { object: { id: 'sub_PAID' } } });
t('a paying member who cancels keeps the sale (no place freed)', !seen.some(([q]) => /SET status = 'expired', slot = NULL/.test(q)));
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
