/* LC101 (9.66.0): the withdrawal acknowledgement goes into the member's chat with Kyenzo (route "withdraw" of the stripe function).
   Signed in = the statement and the acknowledgement into the chat (dm: true); a guest = not (the download on screen); a missing LC101 SQL
   never blocks the statement. No e-mail is needed. Fake database and Supabase Auth.
   node tests/lc101_stripe.test.mjs */
import { makeStripeHandler } from '../functions/stripe/stripe.js';
let pass = 0, fail = 0; const t = (n, c) => { if (c) { pass++; console.log('  ok  ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const seen = []; const S = { dm: true, dmThrows: false };
const fakeSql = { unsafe: async (q, a) => { seen.push([q, a]); let r = [];
    if (/_lc100_withdraw\(/.test(q)) r = [{ r: { ok: true, id: 12, at: '2026-11-24T09:00:00Z', email: a[0], name: a[1], contract: a[2] } }];
    if (/_lc101_withdraw_dm\(/.test(q)) { if (S.dmThrows) throw Object.assign(new Error('function public._lc101_withdraw_dm does not exist'), { code: '42883' }); r = [{ r: S.dm }]; }
    r.count = 1; return r; }, begin: async (f) => f(fakeSql) };
const fetchImpl = async (u, o) => {
  if (/\/auth\/v1\/user$/.test(u)) return new Response(JSON.stringify(/good/.test(o.headers.Authorization) ? { email: 'paula@x.be' } : {}), { status: /good/.test(o.headers.Authorization) ? 200 : 401 });
  if (/api\.resend\.com/.test(u)) throw new Error('no e-mail should be sent without the mail secrets');
  return new Response('{}', { status: 200 });
};
const h = makeStripeHandler(fakeSql, { STRIPE_SECRET_KEY: 'sk_test_x', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', APP_URL: 'https://lanckrietchesstrainerhub.vercel.app/app.html' }, fetchImpl);
const call = async (body) => { const r = await h(new Request('https://x.supabase.co/functions/v1/stripe/withdraw', { method: 'POST', body: JSON.stringify(body) })); const j = await r.json(); j._status = r.status; return j; };
const ran = (re) => seen.filter(([q]) => re.test(q));
const W = { email: 'paula@x.be', name: 'Paula', contract: 'pro_yearly', note: 'Changed my mind', confirm: true, device: 'dev_1234567' };

let j = await call(Object.assign({ token: 'good.token.abcdefghijklmnopqrstuvwxyz' }, W));
const d = ran(/_lc101_withdraw_dm\(/)[0];
t('signed in: the statement goes into the chat with the id, the statement and the acknowledgement', j.ok && d && d[1][0] === 12 && /^I withdraw from my contract for "Pro, yearly"\. Reference W12\.\nChanged my mind$/.test(d[1][1]) && d[1][2] === j.text);
t('signed in: dm comes back true, nothing e-mailed', j.dm === true && j.mailed === false);
t('the acknowledgement points to the chat, not to an e-mail reply', /Write to me in the app, under Coach Kyenzo\./.test(j.text) && !/Reply to this e-mail/.test(j.text));
seen.length = 0; j = await call(W);
t('a guest: no chat (the download on screen), the statement still stands', j.ok && j.dm === false && !ran(/_lc101_withdraw_dm/).length && ran(/_lc100_withdraw\(/).length === 1);
S.dm = false; j = await call(Object.assign({ token: 'good.token.abcdefghijklmnopqrstuvwxyz' }, W)); S.dm = true;
t('no account row for that e-mail: dm false', j.ok && j.dm === false);
S.dmThrows = true; j = await call(Object.assign({ token: 'good.token.abcdefghijklmnopqrstuvwxyz' }, W)); S.dmThrows = false;
t('the LC101 SQL missing: the withdrawal is still stored and shown (dm false)', j.ok && j._status === 200 && j.dm === false && j.ref === 'W12');
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
