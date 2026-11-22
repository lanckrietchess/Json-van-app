/* LC100 (9.65.0): the withdrawal function in the Stripe function (route "withdraw") and the new wording (w2: the member asks for Pro to
   start at once and keeps the 14-day right, paying only for the days used). Fake database, fake Resend and Supabase Auth.
   node tests/lc100_stripe.test.mjs */
import { makeStripeHandler } from '../functions/stripe/stripe.js';
let pass = 0, fail = 0; const t = (n, c) => { if (c) { pass++; console.log('  ok  ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const seen = [], mails = [];
const S = { reply: null, throws: false };
const fakeSql = { unsafe: async (q, a) => { seen.push([q, a]); let r = [];
    if (/_lc100_withdraw\(/.test(q)) { if (S.throws) throw Object.assign(new Error('function public._lc100_withdraw does not exist'), { code: '42883' });
      r = [{ r: S.reply || { ok: true, id: 7, at: '2026-11-23T10:15:00Z', email: a[0], name: a[1], contract: a[2] } }]; }
    r.count = 1; return r; }, begin: async (f) => f(fakeSql) };
const fetchImpl = async (u, o) => {
  if (/\/auth\/v1\/user$/.test(u)) return new Response(JSON.stringify(/good/.test(o.headers.Authorization) ? { email: 'acc@b.co' } : {}), { status: /good/.test(o.headers.Authorization) ? 200 : 401 });
  if (/api\.resend\.com\/emails/.test(u)) { mails.push(JSON.parse(o.body)); return new Response('{"id":"m1"}', { status: S.mailFail ? 500 : 200 }); }
  return new Response('{}', { status: 200 });
};
const base = { STRIPE_SECRET_KEY: 'sk_test_x', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', APP_URL: 'https://lanckrietchesstrainerhub.vercel.app/app.html' };
let h = makeStripeHandler(fakeSql, base, fetchImpl);
const call = async (path, body) => { const r = await h(new Request('https://x.supabase.co/functions/v1/stripe/' + path, { method: 'POST', body: JSON.stringify(body) })); const j = await r.json(); j._status = r.status; return j; };
const ran = (re) => seen.filter(([q]) => re.test(q));
const W = { email: 'Anna@Example.be', name: 'Anna Peeters', contract: 'pro_monthly', note: 'Not for me', confirm: true, device: 'dev_abcdefgh1' };

let j = await call('withdraw', Object.assign({}, W, { confirm: undefined }));
t('no confirmation tap: refused, nothing stored', j.ok === false && j.reason === 'confirm' && !ran(/_lc100_withdraw/).length);
j = await call('withdraw', Object.assign({}, W, { email: 'nope' }));
t('a bad e-mail: refused', j.reason === 'email' && j._status === 400);
j = await call('withdraw', Object.assign({}, W, { name: ' <> ' }));
t('an empty name: refused', j.reason === 'name');
j = await call('withdraw', Object.assign({}, W, { contract: 'lifetime' }));
t('an unknown contract: refused', j.reason === 'contract');
seen.length = 0; j = await call('withdraw', W);
const st = ran(/_lc100_withdraw\(/)[0];
t('signed out: stored with the lower-case e-mail, the name, the contract, the note and the device', j.ok && st && st[1][0] === 'anna@example.be' && st[1][1] === 'Anna Peeters' && st[1][2] === 'pro_monthly' && st[1][3] === 'Not for me' && st[1][4] === 'dev_abcdefgh1' && st[1][5] === '');
t('the reference and the time come back', j.ref === 'W7' && j.at === '2026-11-23T10:15:00Z');
t('the acknowledgement text: the statement, the contract, the time and what happens next', /I withdraw from my contract for "Pro, monthly"/.test(j.text) && /Received: /.test(j.text) && /2026-11-23 10:15 UTC/.test(j.text) && /refund you within 14 days/.test(j.text) && /Reference: W7/.test(j.text));
t('without the mail secrets: not mailed (the app shows it on screen)', j.mailed === false && mails.length === 0);
seen.length = 0; j = await call('withdraw', Object.assign({}, W, { token: 'good.token.abcdefghijklmnopqrstuvwxyz' }));
t('signed in: the account is stored too', ran(/_lc100_withdraw\(/)[0][1][5] === 'acc@b.co');
h = makeStripeHandler(fakeSql, Object.assign({}, base, { RESEND_API_KEY: 're_x', WELCOME_FROM: 'Lanckriet Chess <hello@x.be>' }), fetchImpl);
seen.length = 0; j = await call('withdraw', W);
const m = mails.pop();
t('with Resend: the acknowledgement goes to the consumer, the owner in bcc', j.mailed === true && m && m.to[0] === 'anna@example.be' && m.bcc[0] === 'lanckrietchess@gmail.com' && /W7/.test(m.subject) && /I withdraw from my contract/.test(m.text));
t('the mail is noted in the database', ran(/_lc100_withdraw_mailed/).length === 1);
S.mailFail = true; seen.length = 0; j = await call('withdraw', W); S.mailFail = false;
t('a refused e-mail: the statement still stands, not noted as mailed', j.ok && j.mailed === false && !ran(/_lc100_withdraw_mailed/).length);
S.reply = { ok: false, reason: 'slow_down' }; j = await call('withdraw', W); S.reply = null;
t('the database rate limit comes back as 429', j.ok === false && j.reason === 'slow_down' && j._status === 429);
S.throws = true; j = await call('withdraw', W); S.throws = false;
t('missing SQL: 503 not_ready', j._status === 503 && j.reason === 'not_ready');

// ---------- the wording (w2) ----------
const src = (await import('node:fs')).readFileSync(new URL('../functions/stripe/stripe.js', import.meta.url), 'utf8');
t('server wording version w2-2026-11-23', /const CONSENT_V = 'w2-2026-11-23'/.test(src));
t('no "give up my 14-day right of withdrawal" in any wording or receipt any more', !/give up (my|your) 14-day right of withdrawal/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));
t('the receipt text: asked to start at once, withdraw within 14 days, pay only for the days used', /You asked for Pro to start right away\. You can withdraw within 14 days/.test(src) && /pay only for the days you used/.test(src));
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
