/* LC99 (9.64.0): the withdrawal waiver and "your EUR 25 counts toward the year" in the Stripe function. Fake database, fake Stripe and Supabase Auth.
   The one-time month (downsell) and the yearly switch with the month's credit (annual25) refuse a checkout without consent: true; with it, the
   waiver version goes into Stripe's metadata and the receipt / invoice text, and the exact wording is stored with the session (lc99_consents);
   the trial records the waiver it is sent; annual25: the database decides, the credit is what was paid (never the browser's number), it is a
   one-time coupon on the live yearly rate, the checkout text discloses today's price and the renewal, the webhook marks the credit used.
   node tests/lc99_stripe.test.mjs */
import { makeStripeHandler } from '../functions/stripe/stripe.js';
import { createHmac } from 'node:crypto';
let pass = 0, fail = 0; const t = (n, c) => { if (c) { pass++; console.log('  ok  ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const seen = [];
const S = { a25: 'ok', a25Throws: false, credit: 2500, consentThrows: false, trialUsed: false };
const fakeSql = { unsafe: async (q, a) => { seen.push([q, a]); let r = [];
    if (/_lc99_annual25_ok/.test(q)) { if (S.a25Throws) throw Object.assign(new Error('function public._lc99_annual25_ok(text) does not exist'), { code: '42883' }); r = [{ r: S.a25 }]; }
    else if (/_lc99_annual25_credit/.test(q)) r = [{ c: S.credit }];
    else if (/_lc99_consent\(/.test(q)) { if (S.consentThrows) throw Object.assign(new Error('function public._lc99_consent does not exist'), { code: '42883' }); }
    else if (/_lc97_downsell_ok/.test(q)) r = [{ r: 'ok' }];
    else if (/SELECT session_id, url FROM public\.lc97_downsell/.test(q)) r = [];
    else if (/FROM public\.lc89_cfg WHERE k = 'paywall'/.test(q)) r = [];
    else if (/GROUP BY tranche, status/.test(q)) r = [];
    else if (/SELECT slot FROM/.test(q)) r = [];
    else if (/SELECT 1 AS ok FROM public\.lc73_trials WHERE email/.test(q)) r = S.trialUsed ? [{ ok: 1 }] : [];
    else if (/FROM public\.licenses WHERE lower\(email\)/.test(q)) r = [];
    else if (/lc73_discount_for/.test(q)) r = [{ k: null }];
    else if (/FROM public\.lc73_customers/.test(q)) r = [];
    else if (/SELECT \* FROM arena\.lc34_pro_sales WHERE session_id/.test(q)) r = [{ session_id: 'cs_test_year1234567', tier: 2, plan: 'yearly', email: 'a@b.co', amount_cents: 19950, tranche: 1, device: 'dev_abcdefgh1' }];
    else if (/_lc_create_license/.test(q)) r = [{ license_key: 'LC-YEAR-KEY' }];
    r.count = 1; return r; }, begin: async (f) => f(fakeSql) };
const forms = [], coupons = [];
const fetchImpl = async (u, o) => {
  if (/\/auth\/v1\/user$/.test(u)) return new Response(JSON.stringify(/good/.test(o.headers.Authorization) ? { email: 'a@b.co' } : {}), { status: /good/.test(o.headers.Authorization) ? 200 : 401 });
  if (/\/v1\/coupons/.test(u)) { coupons.push([o.method, u, new URLSearchParams(o.body || '')]); return new Response(JSON.stringify({ id: 'x' }), { status: o.method === 'GET' ? 404 : 200 }); }
  forms.push(new URLSearchParams(o.body || ''));
  return new Response(JSON.stringify({ id: 'cs_test_year1234567', url: 'https://checkout.stripe.com/c/pay/y' }), { status: 200 });
};
const env = { STRIPE_SECRET_KEY: 'sk_test_x', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', STRIPE_WEBHOOK_SECRET: 'whsec_test_1234567890', APP_URL: 'https://lanckrietchesstrainerhub.vercel.app/app.html' };
let h = makeStripeHandler(fakeSql, env, fetchImpl);
const fresh = () => { h = makeStripeHandler(fakeSql, env, fetchImpl); };
const call = async (path, body) => { const r = await h(new Request('https://x.supabase.co/functions/v1/stripe/' + path, { method: 'POST', body: JSON.stringify(body) })); const j = await r.json(); j._status = r.status; return j; };
const TOK = 'good.token.abcdefghijklmnopqrstuvwxyz';
const ran = (re) => seen.filter(([q]) => re.test(q));
const WORD = 'I want my Pro month to start right away. I pay €25 once for 30 days of full Pro; it does not renew. Because Pro starts at once, I give up my 14-day right of withdrawal, so this payment is not refunded once it has gone through.';

// ---------- the one-time month needs the waiver ----------
let j = await call('downsell', { token: TOK });
t('downsell without consent: refused (consent), no checkout, nothing stored', j.ok === false && j.reason === 'consent' && j._status === 409 && forms.length === 0 && !ran(/lc97_downsell/).length);
j = await call('downsell', { token: TOK, consent: 'yes' });
t('consent must be exactly true (not "yes")', j.ok === false && j.reason === 'consent');
seen.length = 0; j = await call('downsell', { token: TOK, consent: true, consent_v: 'w1-2026-11-22', consent_text: WORD, device: 'dev_abcdefgh1' }); let f = forms.pop();
t('with consent: the checkout opens', j.ok === true && /checkout\.stripe\.com/.test(j.url));
t('Stripe metadata carries the waiver version and the time', f.get('metadata[withdrawal_waiver]') === 'w1-2026-11-22' && /^\d{4}-\d\d-\d\dT/.test(f.get('metadata[consent_at]') || '') && f.get('payment_intent_data[metadata][withdrawal_waiver]') === 'w1-2026-11-22');
t('the receipt text names the waiver', /withdraw within 14 days of the purchase/.test(f.get('payment_intent_data[description]') || ''));
t('the checkout text: once, does not renew, the waiver', /does not renew/.test(f.get('custom_text[submit][message]')) && /withdraw within 14 days/.test(f.get('custom_text[submit][message]')));
const lc = ran(/_lc99_consent\(/)[0];
t('the exact wording is stored with the Stripe session and the device', lc && lc[1][0] === 'a@b.co' && lc[1][1] === 'downsell' && lc[1][2] === 'w1-2026-11-22' && lc[1][3] === WORD && lc[1][4] === 'cs_test_year1234567' && lc[1][5] === 'dev_abcdefgh1');
fresh(); seen.length = 0; j = await call('downsell', { token: TOK, consent: true, consent_text: '<b>x</b>' }); forms.pop();
const lc2 = ran(/_lc99_consent\(/)[0];
t('a missing / too short wording falls back to the server wording; a bad version to the server version', lc2 && /withdraw within 14 days/.test(lc2[1][3]) && !/</.test(lc2[1][3]) && lc2[1][2] === 'w2-2026-11-23');
S.consentThrows = true; fresh(); j = await call('downsell', { token: TOK, consent: true }); forms.pop();
t('the consent table missing (SQL not run): the payment still opens, the waiver stays in Stripe', j.ok === true);
S.consentThrows = false;

// ---------- the trial records the waiver ----------
fresh(); seen.length = 0; j = await call('trial', { token: TOK, plan: 'monthly', consent: true, consent_v: 'w1-2026-11-22', consent_text: 'I want Pro to start right away. €0 today, then the plan I picked from day 8 until I cancel. Because Pro starts at once, I give up my 14-day right of withdrawal.' }); f = forms.pop();
t('trial with consent: subscription with the trial, the waiver in metadata and on the invoices', j.ok === true && f.get('mode') === 'subscription' && f.get('subscription_data[trial_period_days]') === '7'
  && f.get('subscription_data[metadata][withdrawal_waiver]') === 'w1-2026-11-22' && /withdraw within 14 days/.test(f.get('subscription_data[description]') || ''));
t('trial: the waiver is stored with the session (flow trial)', ran(/_lc99_consent\(/).some(([, a]) => a[1] === 'trial' && a[4] === 'cs_test_year1234567'));
fresh(); seen.length = 0; j = await call('trial', { token: TOK, plan: 'monthly' }); f = forms.pop();
t('trial without consent (an old cached app): still opens, nothing stored, no waiver claimed', j.ok === true && !ran(/_lc99_consent\(/).length && !f.get('subscription_data[metadata][withdrawal_waiver]') && !f.get('subscription_data[description]'));

// ---------- annual25 ----------
fresh(); j = await call('annual25', { consent: true });
t('annual25 signed out: sign in', j.ok === false && j.reason === 'sign_in');
j = await call('annual25', { token: TOK });
t('annual25 without consent: refused (consent), the database is not even asked', j.ok === false && j.reason === 'consent' && !ran(/_lc99_annual25_ok/).length);
for (const why of ['no_month', 'used', 'expired', 'already_member']) { S.a25 = why; j = await call('annual25', { token: TOK, consent: true }); t('the database says "' + why + '": refused with that reason', j.ok === false && j.reason === why); }
t('no checkout for any refusal', forms.length === 0);
fresh(); S.a25 = 'ok'; S.a25Throws = true; j = await call('annual25', { token: TOK, consent: true });
t('LC99 SQL not run: refused (fails closed)', j.ok === false && j.reason === 'not_ready' && forms.length === 0);
S.a25Throws = false;
seen.length = 0; coupons.length = 0; j = await call('annual25', { token: TOK, consent: true, consent_v: 'w1-2026-11-22', device: 'dev_abcdefgh1', minus: 99999 }); f = forms.pop();
t('eligible: a yearly subscription at the live Founding rate (EUR 199.50)', j.ok === true && f.get('mode') === 'subscription' && f.get('line_items[0][price_data][recurring][interval]') === 'year' && f.get('line_items[0][price_data][unit_amount]') === '19950' && j.tranche === 1);
t('a one-time EUR 25.00 coupon for the month (created when missing), never the browser\'s number', f.get('discounts[0][coupon]') === 'LC-MONTH2500' && coupons.some(([m, , b]) => m === 'POST' && b.get('amount_off') === '2500' && b.get('duration') === 'once' && b.get('currency') === 'eur'));
const msg = f.get('custom_text[submit][message]') || '';
t('the checkout text: today EUR 174.50, then EUR 199.50 a year, how to cancel, the waiver', /Today: EUR 174\.50 for your first year/.test(msg) && /Then EUR 199\.50 a year until you cancel/.test(msg) && /Manage subscription/.test(msg) && /withdraw within 14 days/.test(msg));
t('metadata: annual25, the credit and the waiver', f.get('metadata[annual25]') === '1' && f.get('metadata[credit_cents]') === '2500' && f.get('metadata[withdrawal_waiver]') === 'w1-2026-11-22');
t('the waiver is stored (flow annual25)', ran(/_lc99_consent\(/).some(([, a]) => a[1] === 'annual25' && a[4] === 'cs_test_year1234567'));
t('no referral coupon stacked on top', !f.get('discounts[1][coupon]'));
fresh(); S.credit = 1999; j = await call('annual25', { token: TOK, consent: true }); f = forms.pop();
t('the credit follows what was really paid (EUR 19.99)', f.get('discounts[0][coupon]') === 'LC-MONTH1999' && /minus the EUR 19\.99 you paid/.test(f.get('custom_text[submit][message]') || ''));
S.credit = 0; j = await call('annual25', { token: TOK, consent: true });
t('no paid amount found: refused', j.ok === false && j.reason === 'not_ready');
S.credit = 2500;

// ---------- webhook ----------
const hook = async (ev) => { const raw = JSON.stringify(ev), ts = Math.floor(Date.now() / 1000), sig = 't=' + ts + ',v1=' + createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(ts + '.' + raw).digest('hex');
  return h(new Request('https://x.supabase.co/functions/v1/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': sig }, body: raw })); };
seen.length = 0;
let w = await hook({ id: 'evt_a25', type: 'checkout.session.completed', data: { object: { id: 'cs_test_year1234567', mode: 'subscription', payment_status: 'paid', amount_total: 17450, subscription: 'sub_Y1', customer: 'cus_A1', customer_details: { email: 'a@b.co' }, metadata: { lc: 'pro', plan: 'yearly', annual25: '1', credit_cents: '2500' } } } });
t('paid: the yearly licence is made', w.status === 200 && ran(/_lc_create_license/).length === 1);
t('paid: the credit is marked used for this account and session', ran(/_lc99_note/).some(([, a]) => a[0] === 'a@b.co' && a[1] === 'annual25_paid' && a[2] === 'cs_test_year1234567'));
seen.length = 0;
w = await hook({ id: 'evt_plain', type: 'checkout.session.completed', data: { object: { id: 'cs_test_year1234567', mode: 'subscription', payment_status: 'paid', customer_details: { email: 'a@b.co' }, metadata: { lc: 'pro', plan: 'yearly' } } } });
t('a normal yearly purchase does not touch the credit', !ran(/_lc99_note/).length);

console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
