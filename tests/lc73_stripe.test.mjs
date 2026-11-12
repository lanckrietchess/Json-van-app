/* LC73 (9.37.0): gift at the member's own / the live launch rate, the 7-day trial, the rescue offer, referral discounts and the webhook bookkeeping.
   Fake database and fake Stripe / Supabase Auth. node tests/lc73_stripe.test.mjs */
import { makeStripeHandler } from '../functions/stripe/stripe.js';
import { createHmac } from 'node:crypto';
let pass = 0, fail = 0; const t = (n, c) => { if (c) { pass++; console.log('  ok  ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const seen = [];
let state = { soldT1: 0, ownT: 0, trialUsed: false, member: false, disc: '', rescue: null };
const fakeSql = { unsafe: async (q, a) => { seen.push([q, a]); let r = [];
    if (/GROUP BY tranche, status/.test(q)) r = state.soldT1 ? [{ tranche: 1, status: 'paid', n: state.soldT1 }] : [];
    else if (/min\(s\.tranche\)/.test(q)) r = [{ t: state.ownT || null }];
    else if (/FROM public\.lc73_trials WHERE email = \$1 AND rescue_until/.test(q)) r = state.rescue ? [state.rescue] : [];
    else if (/FROM public\.lc73_trials WHERE email/.test(q)) r = state.trialUsed ? [{ ok: 1 }] : [];
    else if (/FROM public\.licenses WHERE lower\(email\)/.test(q)) r = state.member ? [{ ok: 1 }] : [];
    else if (/lc73_discount_for/.test(q)) r = [{ k: state.disc || null }];
    else if (/FROM public\.lc73_customers/.test(q)) r = [{ customer_id: 'cus_ABC123' }];
    else if (/SELECT \* FROM arena\.lc34_pro_sales WHERE session_id/.test(q)) r = [{ session_id: 'cs_trial_1234567890', tier: 2, plan: 'monthly', email: 'a@b.co', amount_cents: 3900, tranche: null }];
    else if (/SELECT slot FROM/.test(q)) r = [];
    else if (/_lc_create_license/.test(q)) r = [{ license_key: 'LC-TEST-KEY' }];
    r.count = 1; return r; }, begin: async (f) => f(fakeSql) };
const forms = [];
const fetchImpl = async (u, o) => {
  if (/\/auth\/v1\/user$/.test(u)) return new Response(JSON.stringify(/good/.test(o.headers.Authorization) ? { email: 'a@b.co' } : {}), { status: /good/.test(o.headers.Authorization) ? 200 : 401 });
  if (/coupons/.test(u)) return new Response(JSON.stringify({ id: 'LC-REF10' }), { status: 200 });
  forms.push(new URLSearchParams(o.body || ''));
  return new Response(JSON.stringify({ id: 'cs_test_abcdefghij', url: 'https://checkout.stripe.com/x' }), { status: 200 });
};
const env = { STRIPE_SECRET_KEY: 'sk_test_x', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', STRIPE_WEBHOOK_SECRET: 'whsec_test_1234567890' };
const h = makeStripeHandler(fakeSql, env, fetchImpl);
const call = async (path, body) => (await h(new Request('https://x.supabase.co/functions/v1/stripe/' + path, { method: 'POST', body: JSON.stringify(body) }))).json();
const TOK = 'good.token.abcdefghijklmnopqrstuvwxyz';
// gift
let j = await call('gift_quote', {});
t('gift without sign-in: the live Founding rate (199.50), not 399', j.amount === 19950 && j.why === 'launch');
state.soldT1 = 100; j = await call('gift_quote', {});
t('first 100 sold: the live rate moves to 299.25', j.amount === 29925);
state.ownT = 1; j = await call('gift_quote', { token: TOK });
t('signed-in Founding member keeps their own 199.50 for a gift', j.amount === 19950 && j.why === 'yours');
j = await call('gift_quote', { token: 'bad.token.abcdefghijklmnopqrstuvwxyz' });
t('a wrong token gets the live rate', j.amount === 29925);
j = await call('gift', { to: 'friend@x.be', token: TOK, from_name: 'Anna', note: 'Train hard!' }); const gf = forms.pop();
t('gift carries the giver name and note (shown to the friend)', gf.get('metadata[from_name]') === 'Anna' && gf.get('metadata[note]') === 'Train hard!');
t('gift checkout charges the member rate', j.ok && gf.get('line_items[0][price_data][unit_amount]') === '19950');
j = await call('pricing', {});
t('pricing shows the live launch rate for gifts', j.gift === 29925);
state.soldT1 = 0; state.ownT = 0;
// trial
j = await call('trial', {});
t('trial needs sign-in', j.reason === 'sign_in');
j = await call('trial', { token: TOK }); let f = forms.pop();
t('trial: 7 days, card required, monthly 39', j.ok && f.get('subscription_data[trial_period_days]') === '7' && f.get('payment_method_collection') === 'always' && f.get('line_items[0][price_data][unit_amount]') === '3900' && f.get('metadata[trial]') === '1');
t('trial: the EUR 0 today / then 39 a month text is on the checkout', /EUR 0 today/.test(f.get('custom_text[submit][message]') || ''));
state.trialUsed = true; j = await call('trial', { token: TOK });
t('one trial per e-mail', j.reason === 'trial_used'); state.trialUsed = false;
state.member = true; j = await call('trial', { token: TOK }); t('no trial for active members', j.reason === 'already_member'); state.member = false;
// rescue
j = await call('rescue', { token: TOK }); t('rescue only with an open offer', j.reason === 'no_offer');
state.rescue = { subscription_id: 'sub_OLD123' }; j = await call('rescue', { token: TOK }); f = forms.pop();
t('rescue: yearly at the live rate with a one-time 39 off, old plan cancelled after paying', j.ok && f.get('line_items[0][price_data][recurring][interval]') === 'year' && f.get('discounts[0][coupon]') === 'LC-RESCUE39' && f.get('metadata[cancel_sub]') === 'sub_OLD123');
// referral discount + saved customer
state.disc = 'invitee'; j = await call('tokens', { pack: 't100', email: 'a@b.co', token: TOK }); f = forms.pop();
t('invitee gets the 10% coupon and the saved customer', f.get('discounts[0][coupon]') === 'LC-REF10' && f.get('customer') === 'cus_ABC123' && f.get('metadata[ref_disc]') === 'invitee');
t('the card is saved by Stripe automatically and offered again', f.get('payment_intent_data[setup_future_usage]') === 'on_session' && f.get('saved_payment_method_options[allow_redisplay_filters][1]') === 'limited');
state.disc = '';
// webhook: a trial checkout completes without payment
const ev = { id: 'evt_t1', type: 'checkout.session.completed', data: { object: { id: 'cs_trial_1234567890', mode: 'subscription', payment_status: 'no_payment_required', subscription: 'sub_NEW1', customer: 'cus_ABC123', customer_details: { email: 'a@b.co' }, metadata: { lc: 'pro', trial: '1' } } } };
const raw = JSON.stringify(ev), ts = Math.floor(Date.now() / 1000), sig = 't=' + ts + ',v1=' + createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(ts + '.' + raw).digest('hex');
seen.length = 0;
const w = await h(new Request('https://x.supabase.co/functions/v1/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': sig }, body: raw }));
t('webhook accepts the EUR 0 trial checkout', w.status === 200);
t('trial is recorded and the customer remembered', seen.some(([q]) => /INSERT INTO public\.lc73_trials/.test(q)) && seen.some(([q]) => /INSERT INTO public\.lc73_customers/.test(q)));
t('trial licence is created', seen.some(([q]) => /_lc_create_license/.test(q)));
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
