/* LC97 (9.62.0): the one-time post-trial downsell and the trial-state notes in the Stripe function. Fake database, fake Stripe and Supabase Auth.
   The database decides who may buy the month (public._lc97_downsell_ok); one open checkout per account is reused, a second is refused;
   the webhook creates a 30-day licence once, marks the discount used and the trial state; a cancelled trial's licence ends at the trial end.
   node tests/lc97_stripe.test.mjs */
import { makeStripeHandler } from '../functions/stripe/stripe.js';
import { createHmac } from 'node:crypto';
let pass = 0, fail = 0; const t = (n, c) => { if (c) { pass++; console.log('  ok  ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const seen = [];
const S = { ok: 'ok', okThrows: false, open: null, insertDup: false, licenceHave: false, trial: { email: 'a@b.co', trial_end: new Date(Date.now() + 2 * 864e5) } };
const fakeSql = { unsafe: async (q, a) => { seen.push([q, a]); let r = [];
    if (/_lc97_downsell_ok/.test(q)) { if (S.okThrows) throw Object.assign(new Error('function public._lc97_downsell_ok(text) does not exist'), { code: '42883' }); r = [{ r: S.ok }]; }
    else if (/SELECT session_id, url FROM public\.lc97_downsell/.test(q)) r = S.open ? [S.open] : [];
    else if (/INSERT INTO public\.lc97_downsell/.test(q)) { if (S.insertDup) throw Object.assign(new Error('duplicate key value violates unique constraint "lc97_downsell_one_live"'), { code: '23505' }); }
    else if (/FROM public\.licenses WHERE flags->>'session'/.test(q)) r = S.licenceHave ? [{ ok: 1 }] : [];
    else if (/_lc_create_license/.test(q)) r = [{ license_key: 'LC-DOWN-KEY' }];
    else if (/SELECT email, trial_end FROM public\.lc73_trials/.test(q)) r = S.trial ? [S.trial] : [];
    else if (/SELECT 1 AS ok FROM public\.lc73_trials WHERE subscription_id/.test(q)) r = S.trial ? [{ ok: 1 }] : [];
    else if (/FROM public\.lc73_customers/.test(q)) r = [];
    else if (/GROUP BY tranche, status/.test(q)) r = [];
    r.count = 1; return r; }, begin: async (f) => f(fakeSql) };
const forms = []; let stripeFail = false;
const fetchImpl = async (u, o) => {
  if (/\/auth\/v1\/user$/.test(u)) return new Response(JSON.stringify(/good/.test(o.headers.Authorization) ? { email: 'a@b.co' } : {}), { status: /good/.test(o.headers.Authorization) ? 200 : 401 });
  if (stripeFail) return new Response(JSON.stringify({ error: { message: 'boom' } }), { status: 500 });
  forms.push(new URLSearchParams(o.body || ''));
  return new Response(JSON.stringify({ id: 'cs_test_down1234567', url: 'https://checkout.stripe.com/c/pay/down' }), { status: 200 });
};
const env = { STRIPE_SECRET_KEY: 'sk_test_x', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', STRIPE_WEBHOOK_SECRET: 'whsec_test_1234567890' };
let h = makeStripeHandler(fakeSql, env, fetchImpl);
const call = async (path, body) => (await h(new Request('https://x.supabase.co/functions/v1/stripe/' + path, { method: 'POST', body: JSON.stringify(body) }))).json();
const TOK = 'good.token.abcdefghijklmnopqrstuvwxyz';
const ran = (re) => seen.filter(([q]) => re.test(q));

let j = await call('downsell', {});
t('signed out: the downsell asks for a sign-in', j.ok === false && j.reason === 'sign_in');
for (const why of ['no_trial', 'trial_running', 'not_offered', 'dismissed', 'offer_expired', 'used', 'already_member']) {
  S.ok = why; j = await call('downsell', { consent: true, token: TOK });
  t('the database says "' + why + '": refused with that reason, no checkout', j.ok === false && j.reason === why);
}
t('no Stripe checkout was created for any refusal', forms.length === 0);
S.ok = 'ok'; S.okThrows = true; j = await call('downsell', { consent: true, token: TOK });
t('LC97 SQL not run yet: refused (fails closed, never a free discount)', j.ok === false && j.reason === 'not_ready' && forms.length === 0);
S.okThrows = false;

seen.length = 0; j = await call('downsell', { consent: true, token: TOK, device: 'dev_abcdefgh1' }); let f = forms.pop();
t('eligible: a Stripe checkout opens', j.ok === true && /^https:\/\/checkout\.stripe\.com\//.test(j.url) && j.amount_cents === 2500 && j.anchor_cents === 3900 && j.days === 30);
t('a one-time payment (no subscription, no renewal) of EUR 25.00 in euro', f.get('mode') === 'payment' && f.get('line_items[0][price_data][unit_amount]') === '2500' && f.get('line_items[0][price_data][currency]') === 'eur' && !f.get('line_items[0][price_data][recurring][interval]'));
t('the product says one month, one-time', /1 month \(one-time offer\)/.test(f.get('line_items[0][price_data][product_data][name]') || ''));
t('checkout text: once per account, it does not renew', /does not renew/.test(f.get('custom_text[submit][message]') || '') && /once per account/.test(f.get('custom_text[submit][message]') || ''));
t('metadata: lc=downsell with the e-mail and 30 days', f.get('metadata[lc]') === 'downsell' && f.get('metadata[email]') === 'a@b.co' && f.get('metadata[days]') === '30');
t('return addresses keep the route in the hash and the flag in the search part', /app\.html\?lc97=paid#upgrades$/.test(f.get('success_url') || '') && /app\.html\?lc97=cancel#upgrades$/.test(f.get('cancel_url') || ''));
t('the checkout expires (a held offer is released)', +f.get('expires_at') > Date.now() / 1000 + 25 * 60);
t('the device id goes along for the funnel', f.get('client_reference_id') === 'dev_abcdefgh1');
t('no referral coupon is stacked on the downsell', !f.get('discounts[0][coupon]'));
t('a row is reserved, then given the session id and url', ran(/INSERT INTO public\.lc97_downsell/).length === 1 && ran(/UPDATE public\.lc97_downsell SET session_id/).some(([, a]) => a[0] === 'cs_test_down1234567' && /checkout\.stripe\.com/.test(a[1])));
t('stale open checkouts are expired first', ran(/SET status = 'expired' WHERE email = \$1 AND status = 'open' AND expires_at < now\(\)/).length === 1);

h = makeStripeHandler(fakeSql, env, fetchImpl);   /* a fresh rate limit (10 tries a minute per address) */
S.open = { session_id: 'cs_test_down1234567', url: 'https://checkout.stripe.com/c/pay/down' }; j = await call('downsell', { consent: true, token: TOK });
t('an open checkout is reused (tapping twice never opens two)', j.ok === true && j.reused === true && forms.length === 0);
S.open = { session_id: 'tmp_x', url: '' }; j = await call('downsell', { consent: true, token: TOK });
t('a checkout being created right now: in_progress', j.ok === false && j.reason === 'in_progress');
S.open = null; S.insertDup = true; j = await call('downsell', { consent: true, token: TOK });
t('a parallel second checkout hits the unique index: in_progress, no Stripe call', j.ok === false && j.reason === 'in_progress' && forms.length === 0);
S.insertDup = false; stripeFail = true; seen.length = 0;
const res = await h(new Request('https://x.supabase.co/functions/v1/stripe/downsell', { method: 'POST', body: JSON.stringify({ consent: true, token: TOK }) }));
t('Stripe fails: an error, and the reserved row is removed again', res.status === 502 && ran(/DELETE FROM public\.lc97_downsell WHERE session_id/).length === 1);
stripeFail = false;

env.DOWNSELL_CENTS = '1999'; h = makeStripeHandler(fakeSql, env, fetchImpl);
j = await call('downsell', { consent: true, token: TOK }); f = forms.pop();
t('DOWNSELL_CENTS sets the price on the server (the browser never does)', j.amount_cents === 1999 && f.get('line_items[0][price_data][unit_amount]') === '1999');
j = await call('downsell', { consent: true, token: TOK, amount_cents: 1 }); f = forms.pop();
t('an amount sent by the browser is ignored', f.get('line_items[0][price_data][unit_amount]') === '1999');
delete env.DOWNSELL_CENTS; h = makeStripeHandler(fakeSql, env, fetchImpl);
j = await call('pricing', {});
t('pricing tells the app the downsell numbers (25 vs 39, 30 days)', j.downsell && j.downsell.cents === 2500 && j.downsell.anchor_cents === 3900 && j.downsell.days === 30);
t('token packs cost the same as the Payment Links and the app (EUR 1, 10, 19.99, 49.99)', JSON.stringify((j.packs || []).map((x) => x.cents)) === '[100,1000,1999,4999]');

// webhook
const hook = async (ev) => { const raw = JSON.stringify(ev), ts = Math.floor(Date.now() / 1000), sig = 't=' + ts + ',v1=' + createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(ts + '.' + raw).digest('hex');
  return h(new Request('https://x.supabase.co/functions/v1/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': sig }, body: raw })); };
const paid = (id) => ({ id, type: 'checkout.session.completed', data: { object: { id: 'cs_test_down1234567', mode: 'payment', payment_status: 'paid', amount_total: 2500, customer: 'cus_ABC123', client_reference_id: 'dev_abcdefgh1', customer_details: { email: 'a@b.co' }, metadata: { lc: 'downsell', email: 'a@b.co', days: '30' } } } });
seen.length = 0; let w = await hook(paid('evt_d1'));
const lic = ran(/_lc_create_license/)[0];
t('paid: one licence, Pro (tier 2), plan downsell', w.status === 200 && lic && lic[1][0] === 'a@b.co' && lic[1][3] === 2 && lic[1][7].plan === 'downsell' && lic[1][7].one_time === true);
const days = lic ? (new Date(lic[1][5]).getTime() - Date.now()) / 864e5 : 0;
t('the licence runs 30 days and does not renew', days > 29.9 && days < 30.1 && (lic[1][4] === false || lic[1][4] === 0));   /* the driver shim sends false as 0 */
t('the downsell row is marked paid', ran(/UPDATE public\.lc97_downsell SET status = 'paid'/).some(([, a]) => a[0] === 'cs_test_down1234567'));
t('the member state gets one_time_discount_used (downsell_paid)', ran(/_lc97_note/).some(([, a]) => a[0] === 'a@b.co' && a[1] === 'downsell_paid'));
t('the funnel records the paid step on the device', ran(/lc94_funnel/).some(([, a]) => a[0] === 'dev_abcdefgh1'));
S.licenceHave = true; seen.length = 0; w = await hook(paid('evt_d2'));
t('Stripe sends it twice: still one licence', w.status === 200 && ran(/_lc_create_license/).length === 0);
S.licenceHave = false; seen.length = 0;
w = await hook({ id: 'evt_d3', type: 'checkout.session.expired', data: { object: { id: 'cs_test_down1234567', mode: 'payment', metadata: { lc: 'downsell' } } } });
t('an expired checkout frees the offer for a new try', ran(/UPDATE public\.lc97_downsell SET status = 'expired' WHERE session_id/).length === 1);
seen.length = 0;
w = await hook({ id: 'evt_d4', type: 'checkout.session.completed', data: { object: { id: 'cs_unpaid_1234567', mode: 'payment', payment_status: 'unpaid', metadata: { lc: 'downsell', email: 'a@b.co' } } } });
t('an unpaid session gives nothing', ran(/_lc_create_license/).length === 0);

// trial notes
seen.length = 0;
w = await hook({ id: 'evt_t1', type: 'customer.subscription.deleted', data: { object: { id: 'sub_T1' } } });
const short = ran(/UPDATE public\.licenses SET expires_at = LEAST/)[0];
t('a cancelled, unconverted trial: its licence ends at the trial end (not 3 days later)', short && short[1][0] === S.trial.trial_end.toISOString() && short[1][1] === 'sub_T1');
t('and the member state hears trial_cancel', ran(/_lc97_note/).some(([, a]) => a[0] === 'a@b.co' && a[1] === 'trial_cancel'));
S.trial = null; seen.length = 0;
w = await hook({ id: 'evt_t2', type: 'customer.subscription.deleted', data: { object: { id: 'sub_PAID' } } });
t('a paying member who cancels: the licence is not shortened', ran(/UPDATE public\.licenses SET expires_at = LEAST/).length === 0);

console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
