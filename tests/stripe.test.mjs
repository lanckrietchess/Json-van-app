/* the Supabase Edge Function "stripe" (functions/stripe), run in Node with a fake database and a fake Stripe API.
   node tests/stripe.test.mjs */
import { makeStripeHandler } from '../functions/stripe/stripe.js';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
const fakeSql = { unsafe: async (q) => { const r = []; r.count = 1; return r; }, begin: async (f) => f(fakeSql) };
let pass = 0, fail = 0; const t = (n, c) => { if (c) { pass++; console.log('  ok  ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const LIVE = 'https://lanckrietchesstrainerhub.vercel.app';
const req = (path, o) => new Request('https://x.supabase.co/functions/v1/stripe/' + path, o);
t('index.ts is the entry point and starts the server (Deno.serve)', /Deno\.serve\(makeStripeHandler\(/.test(fs.readFileSync(new URL('../functions/stripe/index.ts', import.meta.url), 'utf8')));
{
  const h = makeStripeHandler(fakeSql, {});
  for (const o of [LIVE, 'https://www.lanckrietchess.com']) {
    const r = await h(req('pricing', { method: 'OPTIONS', headers: { origin: o } }));
    t('preflight from ' + o, r.status === 204 && r.headers.get('access-control-allow-origin') === o);
  }
  t('a foreign site gets no CORS', !(await h(req('pricing', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }))).headers.get('access-control-allow-origin'));
  const p = await h(req('pricing', { method: 'POST', headers: { origin: LIVE }, body: '{}' })); const j = await p.json();
  t('pricing answers', p.status === 200 && j.ok && j.tranche === 1 && j.vip && j.packs.length === 4);
}
{
  const h = makeStripeHandler(fakeSql, { ALLOWED_ORIGINS: 'https://lanckrietchess-app.vercel.app' });
  t('a stale ALLOWED_ORIGINS secret still lets the live site in', (await h(req('pricing', { method: 'OPTIONS', headers: { origin: LIVE } }))).headers.get('access-control-allow-origin') === LIVE);
}
for (const [label, env] of [['no APP_URL secret', {}], ['APP_URL secret on the old address', { APP_URL: 'https://lanckrietchess-app.vercel.app/app.html', SUPPORT_URL: 'https://lanckrietchess-app.vercel.app/' }]]) {
  const forms = [];
  const fetchImpl = async (u, o) => { forms.push(new URLSearchParams(o.body || '')); return new Response(JSON.stringify({ id: 'cs_test_abcdefghij', url: 'https://checkout.stripe.com/x' }), { status: 200 }); };
  const h = makeStripeHandler(fakeSql, Object.assign({ STRIPE_SECRET_KEY: 'sk_test_x' }, env), fetchImpl);
  await h(req('subscribe', { method: 'POST', body: JSON.stringify({ plan: 'monthly', email: 'a@b.co' }) }));
  await h(req('tokens', { method: 'POST', body: JSON.stringify({ pack: 't3', email: 'a@b.co', ret: 'support' }) }));
  t(label + ': after paying in the app, back to the live app', forms[0].get('success_url') === LIVE + '/app.html#upgrades?paid={CHECKOUT_SESSION_ID}');
  t(label + ': after paying on the website, back to the live website', forms[1].get('success_url') === LIVE + '/?paid={CHECKOUT_SESSION_ID}');
}
{
  const h = makeStripeHandler(fakeSql, { STRIPE_WEBHOOK_SECRET: 'whsec_test_1234567890' });
  const raw = JSON.stringify({ id: 'evt_1', type: 'customer.created', data: { object: {} } }), ts = Math.floor(Date.now() / 1000);
  const sig = 't=' + ts + ',v1=' + createHmac('sha256', 'whsec_test_1234567890').update(ts + '.' + raw).digest('hex');
  t('webhook with a valid Stripe signature: 200', (await h(req('webhook', { method: 'POST', headers: { 'stripe-signature': sig }, body: raw }))).status === 200);
  t('webhook with a wrong signature: 400', (await h(req('webhook', { method: 'POST', headers: { 'stripe-signature': 't=' + ts + ',v1=00' }, body: raw }))).status === 400);
}
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
