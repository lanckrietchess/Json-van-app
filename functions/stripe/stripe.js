/* stripe.js: Stripe Connect for the creator marketplace (hub 9.5.0). Supabase Edge Function "stripe".
   Viewers support a creator (one-time or monthly). The creator is paid by Stripe straight to their connected account (destination
   charge); the platform keeps an application fee of 10 to 20 percent. The hub never sees card data: Stripe Checkout does.
   Routes (POST):  /checkout  public, returns a Checkout URL
                   /admin      admin secret: create_account, onboard_link, refresh
                   /downsell   LC97 (9.62.0): the one-time post-trial month (signed-in token; the database decides who may buy it, once per account)
                   /webhook    Stripe only, verified with STRIPE_WEBHOOK_SECRET
   Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, ADMIN_TOKEN. Optional: APP_URL, ALLOWED_ORIGINS, MIN_DONATION_CENTS (300), MAX_DONATION_CENTS (50000),
   STRIPE_COUNTRY (BE), STRIPE_API_BASE (tests),
   DOWNSELL_CENTS (2500: the one-time post-trial month), DOWNSELL_DAYS (30). No Deno-only APIs: the Node tests run exactly this file.
   Entry point: index.ts (Deno.serve). Deploy all three files together: index.ts, stripe.js, db.js. */
import { makeDB } from './db.js';
import { createHmac, timingSafeEqual } from 'node:crypto';

/* 9.26.0: ONE production address (the default for APP_URL and SUPPORT_URL), and the owner's own sites are always allowed to call this function,
   whatever ALLOWED_ORIGINS says, so a stale secret can never block payments on the live site. */
const DEFAULT_ORIGIN = 'https://lanckrietchesstrainerhub.vercel.app';
const OWN_ORIGINS = ['https://lanckrietchesstrainerhub.vercel.app', 'https://www.lanckrietchess.com', 'https://lanckrietchess.com', 'https://lanckrietchess-app.vercel.app'];
const now = () => Date.now();
const num = (v, d) => (Number.isFinite(+v) && +v > 0 ? Math.floor(+v) : d);
const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
/* flatten {a:{b:1}} to Stripe's form encoding a[b]=1 */
export function formEncode(obj, prefix, out) {
  out = out || new URLSearchParams();
  for (const k of Object.keys(obj)) {
    const v = obj[k], key = prefix ? prefix + '[' + k + ']' : k;
    if (v === undefined || v === null) continue;
    if (typeof v === 'object') formEncode(v, key, out); else out.append(key, String(v));
  }
  return out;
}
/* the platform's share and the creator's share of an amount, in cents; the fee always stays inside 10 to 20 percent */
export function split(amount, feePct) {
  const pct = Math.min(20, Math.max(10, Math.round(+feePct || 15)));
  const fee = Math.max(1, Math.round(amount * pct / 100));
  return { pct, fee, net: amount - fee };
}
/* Stripe-Signature: t=timestamp,v1=hex(HMAC_SHA256(secret, t + '.' + rawBody)); refuse anything older than 5 minutes */
export function verifySignature(raw, header, secret, nowMs, tolSec) {
  if (!header || !secret) return false;
  const parts = {}; String(header).split(',').forEach((p) => { const i = p.indexOf('='); if (i > 0) (parts[p.slice(0, i).trim()] = parts[p.slice(0, i).trim()] || []).push(p.slice(i + 1).trim()); });
  const t = +(parts.t && parts.t[0]); if (!t || Math.abs((nowMs || now()) / 1000 - t) > (tolSec || 300)) return false;
  const want = createHmac('sha256', secret).update(t + '.' + raw).digest();
  return (parts.v1 || []).some((h) => { try { const b = Buffer.from(h, 'hex'); return b.length === want.length && timingSafeEqual(b, want); } catch (e) { return false; } });
}
export const WEBHOOK_MAX = 524288;   /* 512 KB: the largest body /webhook accepts (9.58.0) */
const eqSecret = (a, b) => { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || '')); return y.length >= 16 && x.length === y.length && timingSafeEqual(x, y); };

export function makeStripeHandler(sql, env, fetchImpl) {
  const E = Object.assign({ APP_URL: DEFAULT_ORIGIN + '/app.html', SUPPORT_URL: DEFAULT_ORIGIN + '/', ALLOWED_ORIGINS: OWN_ORIGINS.join(','), STRIPE_COUNTRY: 'BE', STRIPE_API_BASE: 'https://api.stripe.com' }, env);
  /* 9.26.0: a secret that still points at the old address is moved to the live one, so a buyer never lands on a dead page after paying */
  ['APP_URL', 'SUPPORT_URL'].forEach((k) => { if (E[k]) E[k] = String(E[k]).replace(/^https:\/\/lanckrietchess-app\.vercel\.app(?=[/?#]|$)/i, DEFAULT_ORIGIN); });
  const DB = makeDB(sql), doFetch = fetchImpl || fetch, hits = new Map();
  const origins = String(E.ALLOWED_ORIGINS).split(',').map((s) => s.trim()).filter(Boolean).concat(OWN_ORIGINS);
  const cors = (req) => { const o = req.headers.get('origin'); return o && origins.indexOf(o) >= 0 ? { 'access-control-allow-origin': o, 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS', vary: 'origin' } : { vary: 'origin' }; };
  const json = (o, status, h) => new Response(JSON.stringify(o), { status: status || 200, headers: Object.assign({ 'content-type': 'application/json' }, h || {}) });
  const limited = (ip) => { const t = now(), a = (hits.get(ip) || []).filter((x) => t - x < 6e4); a.push(t); hits.set(ip, a); if (hits.size > 5000) hits.clear(); return a.length > 10; };
  async function stripe(method, path, form) {
    if (!E.STRIPE_SECRET_KEY) throw Object.assign(new Error('not_configured'), { status: 503 });
    const res = await doFetch(E.STRIPE_API_BASE + '/v1/' + path, { method, headers: Object.assign({ Authorization: 'Bearer ' + E.STRIPE_SECRET_KEY }, form ? { 'content-type': 'application/x-www-form-urlencoded' } : {}), body: form ? formEncode(form).toString() : undefined });
    const j = await res.json().catch(() => null);
    if (!res.ok) { console.error('Stripe ' + res.status + ' ' + path + ': ' + ((j && j.error && j.error.message) || '')); throw Object.assign(new Error('stripe_error'), { status: 502 }); }
    return j;
  }
  /* ----- LC73 (9.37.0): the signed-in buyer, the saved Stripe customer and the referral discount ----- */
  async function userEmail(token) {
    const tok = clean(token, 4000);
    if (!/^[A-Za-z0-9._-]{20,4000}$/.test(tok) || !E.SUPABASE_URL) return '';
    try {
      const r = await doFetch(String(E.SUPABASE_URL).replace(/\/+$/, '') + '/auth/v1/user', { headers: { apikey: E.SUPABASE_ANON_KEY || '', Authorization: 'Bearer ' + tok } });
      if (!r.ok) return '';
      const u = await r.json().catch(() => null), em = clean(u && u.email, 130).toLowerCase();
      return EMAIL34.test(em) ? em : '';
    } catch (e) { return ''; }
  }
  const q1 = async (query, ...a) => { try { return await DB.prepare(query).bind(...a).first(); } catch (e) { return null; } };
  const run1 = async (query, ...a) => { try { await DB.prepare(query).bind(...a).run(); return true; } catch (e) { console.error('LC73: ' + (e && e.message)); return false; } };
  async function customerOf(email) { const r = email ? await q1('SELECT customer_id FROM public.lc73_customers WHERE email = ?', email) : null; return r && /^cus_[A-Za-z0-9]+$/.test(r.customer_id) ? r.customer_id : ''; }
  async function rememberCustomer(email, cus) { if (EMAIL34.test(email || '') && /^cus_[A-Za-z0-9]+$/.test(cus || '')) await run1('INSERT INTO public.lc73_customers (email, customer_id) VALUES (?, ?) ON CONFLICT (email) DO UPDATE SET customer_id = EXCLUDED.customer_id, updated_at = now()', email, cus); }
  async function discountFor(email) { const r = email ? await q1('SELECT public.lc73_discount_for(?) AS k', email) : null; return r && (r.k === 'invitee' || r.k === 'referrer') ? r.k : ''; }
  async function refCoupon() {
    const id = clean(E.REFERRAL_COUPON || 'LC-REF10', 40);
    try { await stripe('GET', 'coupons/' + encodeURIComponent(id)); return id; }
    catch (e) { try { await stripe('POST', 'coupons', { id, percent_off: 10, duration: 'once', name: 'Friend referral: 10% off' }); return id; } catch (e2) { return ''; } }
  }
  /* adds the saved customer (their card is offered again: one tap) and the referral discount to a Checkout form; returns the discount kind used */
  async function personalise(form, email, meta, allowDiscount) {
    /* the card is remembered by Stripe automatically (Stripe keeps it, we only keep the customer id) and offered again next time: one tap */
    const cus = await customerOf(email);
    if (cus) { form.customer = cus; delete form.customer_email; form.saved_payment_method_options = { allow_redisplay_filters: ['always', 'limited', 'unspecified'] }; }
    else if (form.mode === 'payment') form.customer_creation = 'always';
    if (form.mode === 'payment') form.payment_intent_data = Object.assign({}, form.payment_intent_data || {}, { setup_future_usage: 'on_session' });
    let kind = allowDiscount ? await discountFor(email) : '';
    if (kind) { const c = await refCoupon(); if (c) { form.discounts = [{ coupon: c }]; meta.ref_disc = kind; meta.ref_email = email; } else kind = ''; }
    return kind;
  }
  /* LC106 (9.74.0): the 2-Week Rating Sprint price. The database decides (public._lc106_reward_pct: the XP goal reached, not used,
     still in its window); the browser never sends a percentage. Missing SQL or a database hiccup = no Sprint price (fails closed). */
  async function sprintPct(email) {
    const r = email ? await q1('SELECT public._lc106_reward_pct(?) AS p', email) : null, p = r ? Number(r.p) : 0;
    return Number.isInteger(p) && p >= 1 && p <= 60 ? p : 0;
  }
  async function sprintCoupon(pct) {
    const id = 'LC-SPRINT' + pct;
    try { await stripe('GET', 'coupons/' + encodeURIComponent(id)); return id; }
    catch (e) { try { await stripe('POST', 'coupons', { id, percent_off: pct, duration: 'once', name: '2-Week Rating Sprint: ' + pct + '% off' }); return id; } catch (e2) { return ''; } }
  }
  async function fixedCoupon(id, cents, name) {
    try { await stripe('GET', 'coupons/' + encodeURIComponent(id)); return id; }
    catch (e) { try { await stripe('POST', 'coupons', { id, amount_off: cents, currency: 'eur', duration: 'once', name }); return id; } catch (e2) { return ''; } }
  }
  /* LC73 routes: the 7-day trial (one per e-mail) and the rescue offer (after the first paid month of a trial) */
  /* LC90 (9.52.0): the owner's Day-7 pop-up settings (sql/20261116100000_lc89_lc90_inline_cms_founding_paywall.sql), read HERE on the server:
     the trial length (0 = no trial) and optional Stripe Price IDs. The browser never chooses either. Cached for a minute. */
  let pwMem = { at: 0, v: null };
  async function paywallCfg() {
    if (pwMem.v && now() - pwMem.at < 6e4) return pwMem.v;
    /* 9.58.0: the table may be missing (its SQL not run yet) or the database may hiccup. That never breaks a checkout (the trial and the
       prices fall back to the built-in defaults: 7 days, the built-in prices), but it is no longer silent: the reason goes to the logs once a minute. */
    let r = null;
    try { r = await DB.prepare("SELECT v FROM public.lc89_cfg WHERE k = 'paywall'").first(); }   /* not q1: q1 swallows the error, and a missing table must show in the logs */
    catch (e) { console.error('LC90: the paywall settings could not be read (' + ((e && e.code) || '') + ' ' + String((e && e.message) || e).slice(0, 120) + '); the defaults are used. Run sql/20261116100000_lc89_lc90_inline_cms_founding_paywall.sql if lc89_cfg is missing.'); }
    let v = r && r.v; if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } }
    pwMem = { at: now(), v: v && typeof v === 'object' ? v : {} };
    return pwMem.v;
  }
  async function trialDays() {
    const v = await paywallCfg(), d = v && v.trial_days;
    return Number.isInteger(d) && d >= 0 && d <= 30 ? d : 7;
  }
  /* a Price ID from the owner's config is only used after Stripe confirms it: active, in euro, recurring at the right interval */
  const priceMem = new Map();
  async function checkedPrice(id, interval) {
    if (!/^price_[A-Za-z0-9]{6,80}$/.test(String(id || ''))) return null;
    const c = priceMem.get(id); if (c && now() - c.at < 3e5) return c.p && c.p.recurring && c.p.recurring.interval === interval ? c.p : null;
    let p = null;
    try { p = await stripe('GET', 'prices/' + encodeURIComponent(id)); } catch (e) { p = null; }
    const good = p && p.active === true && String(p.currency).toLowerCase() === 'eur' && p.recurring && (p.recurring.interval === 'year' || p.recurring.interval === 'month') && +p.unit_amount > 0 ? p : null;
    priceMem.set(id, { at: now(), p: good }); if (priceMem.size > 50) priceMem.clear();
    if (!good) console.error('LC90: the Price ID ' + id + ' is not an active recurring euro price; the built-in price is used');
    return good && good.recurring.interval === interval ? good : null;
  }
  /* ----- LC99 (9.64.0): the withdrawal waiver. Pro starts at once, so before a paid checkout the member ticks an UNCHECKED box: "Pro starts right
     away, I give up my 14-day right of withdrawal". The app sends consent: true + the wording version + the exact wording it showed; the server
     puts the version in Stripe's metadata and on the receipt text, and stores the wording with the Stripe session in public.lc99_consents
     (sql/20261122100000_lc99_withdrawal_consent_annual25.sql; best effort: a missing table is logged, never blocks a payment). The one-time
     month and the yearly switch with the month's credit REFUSE a checkout without it (reason 'consent'); the trial records it when sent (the
     app always sends it; an old cached app without it still gets its trial, with a log line). ----- */
  /* 9.65.0 (LC100): Pro is a personalised digital service, so after the CJEU's Sky Österreich judgment (C-234/25, 9 July 2026) the member does
     NOT give up the right of withdrawal by starting at once: they ASK for Pro to start during the 14 days and, when they withdraw, pay only for
     the days they used (Consumer Rights Directive art. 14(3)); withdrawing is one button, "Withdraw from contract here" (art. 11a, route
     "withdraw" below). Wording version w2-2026-11-23 (w1 rows stay valid evidence of the request to start at once). */
  const CONSENT_V = 'w2-2026-11-23';
  const KEEP14 = 'I can still withdraw within 14 days with "Withdraw from contract here" (Account); I then pay only for the days I used and get the rest back.';
  const CONSENT_TXT = {
    trial: 'I ask for Pro to start right away. EUR 0 today, then the plan I picked when the trial ends until I cancel. ' + KEEP14,
    downsell: 'I ask for my Pro month to start right away. I pay EUR 25 once for 30 days of full Pro; it does not renew. ' + KEEP14,
    sprint: 'I ask for my plan to start right away. Today I pay the first payment with my Sprint price, then the normal price of the plan I picked until I cancel. ' + KEEP14,
    annual25: 'I ask for the yearly plan to start right away. Today I pay the first year minus what I paid for my Pro month, then the yearly rate each year until I cancel. ' + KEEP14
  };
  const RECEIPT_WAIVER = 'You asked for Pro to start right away. You can withdraw within 14 days of the purchase ("Withdraw from contract here" in the app, Account); you then pay only for the days you used and get the rest back.';
  function consentOf(body, flow) {
    if (!body || body.consent !== true) return null;
    const v = /^[A-Za-z0-9._-]{1,40}$/.test(String(body.consent_v || '')) ? String(body.consent_v) : CONSENT_V;
    const shown = clean(body.consent_text, 1200).replace(/[<>]/g, '').trim();
    return { flow, v, text: shown.length >= 40 ? shown : CONSENT_TXT[flow] || CONSENT_TXT.trial, at: new Date(now()).toISOString() };
  }
  async function logConsent(email, c, session, device) {
    if (!c || !EMAIL34.test(email || '')) return;
    try { await DB.prepare('SELECT public._lc99_consent(?, ?, ?, ?, ?, ?)').bind(email, c.flow, c.v, c.text, session || '', clean(device, 64)).run(); }
    catch (e) { console.error('LC99: the withdrawal waiver for ' + c.flow + ' was not stored (' + String((e && e.message) || e).slice(0, 120) + '); it is still in the Stripe metadata. Run sql/20261122100000_lc99_withdrawal_consent_annual25.sql.'); }
  }
  async function trial(body, ip) {
    if (limited(ip)) return { status: 429, body: { ok: false, reason: 'slow_down' } };
    const email = await userEmail(body.token);
    if (!email) return { status: 401, body: { ok: false, reason: 'sign_in' } };
    const days = await trialDays();
    if (!days) return { status: 409, body: { ok: false, reason: 'no_trial' } };
    if (await q1('SELECT 1 AS ok FROM public.lc73_trials WHERE email = ?', email)) return { status: 409, body: { ok: false, reason: 'trial_used' } };
    if (await q1("SELECT 1 AS ok FROM public.licenses WHERE lower(email) = ? AND tier >= 2 AND coalesce(revoked, false) = false AND expires_at > now()", email)) return { status: 409, body: { ok: false, reason: 'already_member' } };
    /* LC90: the Founding Trial can start on the yearly plan (the live launch rate, a Founding place is held) or the monthly plan */
    const plan = body.plan === 'yearly' ? 'yearly' : 'monthly', c = consentOf(body, 'trial');
    if (!c) console.error('LC99: a trial checkout without the withdrawal waiver (an old app?) for ' + email.replace(/^(.).*@/, '$1…@'));
    return subscribe({ plan, tier: 2, email, ret: body.ret, device: body.device }, ip, { trial: true, trialDays: days, email, consent: c, meta: { trial: '1', trial_days: String(days), src: clean(body.src, 20) || undefined } });
  }
  /* LC106 (9.74.0): Pro or VIP, monthly or yearly, with the Sprint price on the first payment. Signed in, the ticked box (LC99), and the
     database must say the member reached the Sprint's XP goal (the price itself is added in subscribe, from the database). */
  async function sprintBuy(body, ip) {
    if (limited(ip)) return { status: 429, body: { ok: false, reason: 'slow_down' } };
    const email = await userEmail(body.token);
    if (!email) return { status: 401, body: { ok: false, reason: 'sign_in' } };
    const c = consentOf(body, 'sprint');
    if (!c) return { status: 400, body: { ok: false, reason: 'consent' } };
    if (!(await sprintPct(email))) return { status: 409, body: { ok: false, reason: 'no_sprint_price' } };
    const plan = body.plan === 'yearly' ? 'yearly' : 'monthly', tier = Number(body.tier) === 3 ? 3 : 2;
    return subscribe({ plan, tier, email, ret: body.ret, device: body.device }, ip, { email, consent: c, meta: { src: 'sprint' } });
  }
  /* ----- LC100 (9.65.0): the withdrawal function (Consumer Rights Directive art. 11a). The app's "Withdraw from contract here" sends a name, the
     contract and an e-mail after ONE confirmation tap; the statement is stored with its date and time (public._lc100_withdraw) and the
     acknowledgement goes to that e-mail (Resend: RESEND_API_KEY + WELCOME_FROM, the owner in bcc via WITHDRAW_BCC, default the owner's
     address). Works signed out (a buyer of a Payment Link may have no account); signed in, the account is stored too. Without the mail
     secrets the statement is still stored and the app shows the acknowledgement on screen with a download (the owner sees it either way).
     Refunds are made by the owner in Stripe within 14 days: the paid days used are kept (art. 14(3)), the rest goes back. ----- */
  const CONTRACTS = { pro_trial: 'Pro, free trial', pro_monthly: 'Pro, monthly', pro_yearly: 'Pro, yearly', pro_month_once: 'Pro, one month (one-time)',
    vip_monthly: 'VIP, monthly', vip_yearly: 'VIP, yearly', tokens: 'Token pack', other: 'Another purchase' };
  function ackText(r, note) {
    const at = new Date(r.at || now()), utc = at.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    let bxl = ''; try { bxl = at.toLocaleString('en-GB', { timeZone: 'Europe/Brussels', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' (Brussels)'; } catch (e) { bxl = ''; }
    return ['We received your withdrawal.', '',
      'Statement: I withdraw from my contract for "' + (CONTRACTS[r.contract] || r.contract) + '".',
      'Name: ' + r.name, 'E-mail: ' + r.email, 'Received: ' + (bxl || utc) + (bxl ? ' = ' + utc : ''), 'Reference: W' + r.id + (note ? '\nYour note: ' + note : ''), '',
      'What happens next: we stop the renewal and refund you within 14 days of this message, to the card you paid with. For Pro or VIP that started at your request, the days you used are kept and the rest is refunded; for tokens, the unused tokens are refunded. A free trial costs nothing.',
      '', 'Lanckriet Chess, Kyenzo Lanckriet. Questions? Write to me in the app, under Coach Kyenzo.'].join('\n');
  }
  async function withdraw(body, ip) {
    if (limited(ip)) return { status: 429, body: { ok: false, reason: 'slow_down' } };
    const email = clean(body.email, 200).trim().toLowerCase(), name = clean(body.name, 80).replace(/[<>]/g, '').trim(), contract = clean(body.contract, 20), note = clean(body.note, 500).replace(/[<>]/g, '').trim();
    if (!EMAIL34.test(email)) return { status: 400, body: { ok: false, reason: 'email' } };
    if (!name) return { status: 400, body: { ok: false, reason: 'name' } };
    if (!CONTRACTS[contract]) return { status: 400, body: { ok: false, reason: 'contract' } };
    if (body.confirm !== true) return { status: 400, body: { ok: false, reason: 'confirm' } };
    const account = body.token ? await userEmail(body.token) : '';
    let row = null;
    try { row = await DB.prepare('SELECT public._lc100_withdraw(?, ?, ?, ?, ?, ?) AS r').bind(email, name, contract, note, clean(body.device, 64).replace(/[^A-Za-z0-9_-]/g, ''), account || '').first(); }
    catch (e) { console.error('LC100: a withdrawal could not be stored: ' + String((e && e.message) || e).slice(0, 160) + '. Run sql/20261123100000_lc100_withdraw_games_community.sql.'); return { status: 503, body: { ok: false, reason: 'not_ready' } }; }
    let r = row && row.r; if (typeof r === 'string') { try { r = JSON.parse(r); } catch (e) { r = null; } }
    if (!r || !r.ok) return { status: r && r.reason === 'slow_down' ? 429 : 400, body: { ok: false, reason: (r && r.reason) || 'not_ready' } };
    const text = ackText(r, note);
    // LC101 (9.66.0): a signed-in member gets the statement and this acknowledgement in their chat with Kyenzo (kept, never edited)
    let dm = false;
    if (account) {
      const statement = 'I withdraw from my contract for "' + (CONTRACTS[r.contract] || r.contract) + '". Reference W' + r.id + '.' + (note ? '\n' + note : '');
      try { const d = await DB.prepare('SELECT public._lc101_withdraw_dm(?, ?, ?) AS r').bind(r.id, statement, text).first(); dm = !!(d && (d.r === true || d.r === 't')); }
      catch (e) { console.error('LC101: the acknowledgement could not go into the chat: ' + String((e && e.message) || e).slice(0, 160) + '. Run sql/20261124100000_lc101_welcome_dm.sql.'); }
    }
    let mailed = false;
    if (E.RESEND_API_KEY && E.WELCOME_FROM) {
      try {
        const bcc = String(E.WITHDRAW_BCC || 'lanckrietchess@gmail.com').split(',').map((x) => x.trim()).filter((x) => EMAIL34.test(x) && x !== email);
        const res = await doFetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + E.RESEND_API_KEY, 'content-type': 'application/json' },
          body: JSON.stringify({ from: E.WELCOME_FROM, to: [email], bcc: bcc.length ? bcc : undefined, reply_to: E.WELCOME_REPLY_TO || undefined, subject: 'Your withdrawal is received (W' + r.id + ')', text }) });
        mailed = res.ok; if (!res.ok) console.error('LC100: the acknowledgement e-mail was refused (' + res.status + ')');
      } catch (e) { console.error('LC100: the acknowledgement e-mail failed: ' + String((e && e.message) || e).slice(0, 120)); }
      if (mailed) await run1('SELECT public._lc100_withdraw_mailed(?)', r.id);
    }
    return { status: 200, body: { ok: true, id: r.id, ref: 'W' + r.id, at: r.at, mailed, dm, text } };
  }
  async function rescue(body, ip) {
    if (limited(ip)) return { status: 429, body: { ok: false, reason: 'slow_down' } };
    const email = await userEmail(body.token);
    if (!email) return { status: 401, body: { ok: false, reason: 'sign_in' } };
    const t = await q1('SELECT subscription_id FROM public.lc73_trials WHERE email = ? AND rescue_until > now() AND rescue_used = false ORDER BY started_at DESC LIMIT 1', email);
    if (!t) return { status: 409, body: { ok: false, reason: 'no_offer' } };
    return subscribe({ plan: 'yearly', tier: 2, email, ret: body.ret, device: body.device }, ip, { email, minus: num(E.RESCUE_CENTS, 3900), meta: { rescue: '1', cancel_sub: t.subscription_id || '' } });
  }
  /* ----- LC99 (9.64.0): "your EUR 25 counts toward the year". A member who paid the one-time Pro month (LC97 downsell) may switch to the yearly
     plan during that month and 7 days after it, with what they paid for the month taken off the first year (a Stripe coupon, once); renewals are
     at the yearly rate they locked. The database decides (public._lc99_annual25_ok) and the webhook marks it used. Needs the withdrawal waiver. ----- */
  async function annual25(body, ip) {
    if (limited(ip)) return { status: 429, body: { ok: false, reason: 'slow_down' } };
    const email = await userEmail(body.token);
    if (!email) return { status: 401, body: { ok: false, reason: 'sign_in' } };
    const c = consentOf(body, 'annual25');
    if (!c) return { status: 409, body: { ok: false, reason: 'consent' } };
    const okRow = await q1('SELECT public._lc99_annual25_ok(?) AS r', email), why = okRow && okRow.r;
    if (why !== 'ok') return { status: 409, body: { ok: false, reason: why || 'not_ready' } };
    const cr = await q1('SELECT public._lc99_annual25_credit(?) AS c', email), credit = Math.round(+(cr && cr.c) || 0);
    if (!(credit >= 100)) return { status: 409, body: { ok: false, reason: 'not_ready' } };
    const eur = (x) => (x / 100).toFixed(2);
    return subscribe({ plan: 'yearly', tier: 2, email, ret: body.ret, device: body.device }, ip, { email, consent: c, minus: credit,
      coupon: { id: 'LC-MONTH' + credit, name: 'Your Pro month counts toward the year' }, meta: { annual25: '1', credit_cents: String(credit) },
      submit: (amount) => 'Today: EUR ' + eur(Math.max(0, amount - credit)) + ' for your first year (EUR ' + eur(amount) + ' minus the EUR ' + eur(credit) + ' you paid for your Pro month). Then EUR ' + eur(amount)
        + ' a year until you cancel (Account > Manage subscription; cancel before the renewal date and nothing more is charged). Pro starts right away, as you asked in the app. You can withdraw within 14 days and then pay only for the days you used.' });
  }
  /* ----- LC97 (9.62.0): the post-trial downsell. ONE month of Pro, paid once (no subscription, no renewal), at DOWNSELL_CENTS (default 2500)
     instead of the monthly price (PRO_MONTHLY_CENTS, default 3900, shown struck through). Only for an account whose trial ended without
     converting, after the post-trial pop-up was shown and before it was dismissed or a week passed, and at most ONCE per account: the database
     decides (public._lc97_downsell_ok) and a unique index allows one open-or-paid checkout per e-mail (sql/20261119100000_lc97_trial_downsell.sql).
     Missing SQL = the route refuses ('not_ready'): the discount fails closed, never open. ----- */
  const DL = () => ({ cents: num(E.DOWNSELL_CENTS, 2500), anchor: P34().monthly, days: Math.min(31, num(E.DOWNSELL_DAYS, 30)) });
  async function note97(email, kind, ref) {   /* best effort: a missing LC97 table never breaks a payment, it is logged */
    if (!EMAIL34.test(email || '')) return;
    try { await DB.prepare('SELECT public._lc97_note(?, ?, ?)').bind(email, kind, ref || '').run(); }
    catch (e) { console.error('LC97: the ' + kind + ' note for the trial state was not stored: ' + String((e && e.message) || e).slice(0, 120)); }
  }
  async function downsell(body, ip) {
    if (limited(ip)) return { status: 429, body: { ok: false, reason: 'slow_down' } };
    const email = await userEmail(body.token);
    if (!email) return { status: 401, body: { ok: false, reason: 'sign_in' } };
    const c = consentOf(body, 'downsell');   /* LC99: no checkout without the ticked withdrawal waiver */
    if (!c) return { status: 409, body: { ok: false, reason: 'consent' } };
    const okRow = await q1('SELECT public._lc97_downsell_ok(?) AS r', email), why = okRow && okRow.r;
    if (why !== 'ok') return { status: 409, body: { ok: false, reason: why || 'not_ready' } };
    const d = DL();
    await run1("UPDATE public.lc97_downsell SET status = 'expired' WHERE email = ? AND status = 'open' AND expires_at < now()", email);
    const open = await q1("SELECT session_id, url FROM public.lc97_downsell WHERE email = ? AND status = 'open'", email);
    if (open) return /^https:\/\/checkout\.stripe\.com\//.test(String(open.url || '')) ? { status: 200, body: { ok: true, url: open.url, reused: true, amount_cents: d.cents, anchor_cents: d.anchor, days: d.days } } : { status: 409, body: { ok: false, reason: 'in_progress' } };
    const t0 = now(), hold = P34().holdMs, tmp = 'tmp_' + rnd();
    try { await DB.prepare('INSERT INTO public.lc97_downsell (session_id, email, amount_cents, expires_at) VALUES (?, ?, ?, ?)').bind(tmp, email, d.cents, new Date(t0 + hold).toISOString()).run(); }
    catch (e) { if (e && (e.code === '23505' || /duplicate key/i.test(String(e.message)))) return { status: 409, body: { ok: false, reason: 'in_progress' } };
      console.error('LC97: the downsell row could not be stored: ' + String((e && e.message) || e).slice(0, 120)); return { status: 503, body: { ok: false, reason: 'not_ready' } }; }
    const app = String(E.APP_URL).replace(/[?#].*$/, ''), device = clean(body.device, 64).replace(/[^A-Za-z0-9_-]/g, ''), tax = String(E.STRIPE_TAX || '') === 'inclusive';
    const meta = { lc: 'downsell', email, days: String(d.days), anchor_cents: String(d.anchor), device: device || undefined, withdrawal_waiver: c.v, consent_at: c.at };
    const form = { mode: 'payment', customer_email: email, client_reference_id: device || undefined, metadata: meta,
      payment_intent_data: { metadata: meta, description: 'Lanckriet Chess Pro, 1 month (one-time, does not renew). ' + RECEIPT_WAIVER },
      success_url: app + '?lc97=paid#upgrades', cancel_url: app + '?lc97=cancel#upgrades', expires_at: Math.floor((t0 + hold) / 1000), automatic_tax: tax ? { enabled: true } : undefined,
      custom_text: { submit: { message: 'One payment of EUR ' + (d.cents / 100).toFixed(2) + ' for ' + d.days + ' days of full Pro. It does not renew and nothing else is charged. Pro starts right away, as you asked in the app. You can withdraw within 14 days and then pay only for the days you used. This offer is available once per account.' } },
      line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: d.cents, tax_behavior: tax ? 'inclusive' : undefined,
        product_data: { name: 'Lanckriet Chess Pro, 1 month (one-time offer)', description: d.days + ' days of full Pro: the whole library, the 24/7 AI coach and 10 tokens a day. Paid once, no subscription.' } } }] };
    await personalise(form, email, meta, false);   /* the saved card, no referral discount on top of this one */
    let sess;
    try { sess = await stripe('POST', 'checkout/sessions', form); }
    catch (e) { await run1('DELETE FROM public.lc97_downsell WHERE session_id = ?', tmp); throw e; }
    await DB.prepare('UPDATE public.lc97_downsell SET session_id = ?, url = ? WHERE session_id = ?').bind(sess.id, String(sess.url || '').slice(0, 2000), tmp).run();
    await logConsent(email, c, sess.id, device);
    return { status: 200, body: { ok: true, url: sess.url, session: sess.id, amount_cents: d.cents, anchor_cents: d.anchor, days: d.days } };
  }
  async function downsellPaid(o) {
    const m = o.metadata || {}, email = clean(m.email || (o.customer_details && o.customer_details.email) || o.customer_email, 130).toLowerCase();
    if (!EMAIL34.test(email)) { console.error('LC97: downsell paid without a valid email ' + o.id); return; }
    const have = await DB.prepare("SELECT 1 AS ok FROM public.licenses WHERE flags->>'session' = ?").bind(o.id).first();
    if (!have) {   /* Stripe may send the event twice: one payment, one licence */
      const d = DL(), until = now() + num(m.days, d.days) * 864e5;
      const flags = { source: 'stripe', plan: 'downsell', one_time: true, session: o.id, locked_cents: o.amount_total != null ? o.amount_total : d.cents };
      const lic = await DB.prepare('SELECT license_key FROM public._lc_create_license(?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?)')
        .bind(email, 'stripe', 'Pro 1 month (one-time offer)', 2, false, new Date(until).toISOString(), P34().dailyTokens, flags, 3).first();
      if (!lic || !lic.license_key) throw new Error('downsell licence not created');   /* throwing makes Stripe retry the webhook */
    }
    await run1("UPDATE public.lc97_downsell SET status = 'paid', paid_at = now() WHERE session_id = ?", o.id);
    await note97(email, 'downsell_paid', o.id);
    await funnelPaid(o.client_reference_id || m.device);
    await afterPaid(o, email);
  }
  const creatorOf = (code) => DB.prepare('SELECT code, name, stripe_account, charges_enabled, payouts_enabled, fee_pct, status FROM arena.lc27_creators WHERE code = ?').bind(code).first();

  async function checkout(body, ip) {
    if (limited(ip)) return { status: 429, body: { ok: false, reason: 'slow_down' } };
    const code = clean(body.creator, 30), kind = body.kind === 'sub' ? 'sub' : body.kind === 'donation' ? 'donation' : '';
    const amount = Math.round(+body.amount_cents), min = num(E.MIN_DONATION_CENTS, 300), max = num(E.MAX_DONATION_CENTS, 50000);
    if (!kind || !(amount >= min && amount <= max)) return { status: 400, body: { ok: false, reason: 'bad_amount', min, max } };
    const c = await creatorOf(code);
    if (!c || c.status !== 'active') return { status: 404, body: { ok: false, reason: 'not_found' } };
    if (!c.stripe_account || !c.charges_enabled) return { status: 409, body: { ok: false, reason: 'creator_not_ready' } };
    const { pct, fee } = split(amount, c.fee_pct), cur = 'eur', base = String(E.APP_URL);
    const meta = { creator: c.code, kind, fee_pct: pct, fee };
    const form = { mode: kind === 'sub' ? 'subscription' : 'payment', success_url: base + '#live?support=thanks', cancel_url: base + '#live', submit_type: kind === 'sub' ? undefined : 'donate', metadata: meta,
      line_items: [{ quantity: 1, price_data: { currency: cur, unit_amount: amount, product_data: { name: (kind === 'sub' ? 'Monthly support for ' : 'Support for ') + c.name }, recurring: kind === 'sub' ? { interval: 'month' } : undefined } }] };
    if (kind === 'sub') form.subscription_data = { application_fee_percent: pct, transfer_data: { destination: c.stripe_account }, metadata: meta };
    else form.payment_intent_data = { application_fee_amount: fee, transfer_data: { destination: c.stripe_account }, metadata: meta };
    const s = await stripe('POST', 'checkout/sessions', form);
    return { status: 200, body: { ok: true, url: s.url, fee, net: amount - fee } };
  }

  /* ======================= LC34: Pro subscriptions ======================= */
  const hits2 = new Map();
  const readLimited = (ip) => { const t = now(), a = (hits2.get(ip) || []).filter((x) => t - x < 6e4); a.push(t); hits2.set(ip, a); if (hits2.size > 5000) hits2.clear(); return a.length > 60; };
  /* the price ladder: percentages are fixed here; the base prices and the caps can be overridden by settings */
  const LADDER = [50, 25, 10];
  const ladder = (base, pre) => LADDER.map((pct, i) => num(E[pre + (i + 1) + '_CENTS'], Math.round(base * (100 - pct) / 100)));
  const P34 = () => {
    const base = num(E.PRO_YEARLY_BASE_CENTS, 39900);
    return {
      base, monthly: num(E.PRO_MONTHLY_CENTS, 3900),
      caps: [num(E.TRANCHE1_CAP, 100), num(E.TRANCHE2_CAP, 100), num(E.TRANCHE3_CAP, 100)], prices: ladder(base, 'TRANCHE'),
      holdMs: Math.max(31, num(E.HOLD_MINUTES, 35)) * 6e4, graceMs: num(E.LICENSE_GRACE_DAYS, 2) * 864e5, dailyTokens: num(E.PRO_DAILY_TOKENS, 10)
    };
  };
  /* LC39 text: VIP (Tier 3) = everything in Pro (the whole library) plus tokens credited upfront (500 a month, 7,000 a year), the Lanckriet Chess Student title
     with a blue profile border, and priority in streams and the community. Same Founding / Early Adopter tranches per 100 buyers as Pro, counted separately.
     Defaults: 599 a year, 59 a month (VIP_YEARLY_BASE_CENTS, VIP_TRANCHE1_CENTS, VIP_TRANCHE2_CENTS, VIP_MONTHLY_CENTS override them). */
  const PV = () => { const p = P34(), base = num(E.VIP_YEARLY_BASE_CENTS, 59900); return Object.assign({}, p, { base, monthly: num(E.VIP_MONTHLY_CENTS, 5900), prices: ladder(base, 'VIP_TRANCHE') }); };
  const PT = (tier) => (tier === 3 ? PV() : P34());
  /* token packs: fixed here, never taken from the browser */
  const PACKS = { t3: { cents: 100, tokens: 3 }, t100: { cents: 1000, tokens: 100 }, t300: { cents: 1999, tokens: 300 }, t1000: { cents: 4999, tokens: 1000 } };
  const KEY34 = /^LC-[A-Za-z0-9_-]{2,200}$/i, SESSION34 = /^cs_[A-Za-z0-9_]{8,200}$/, EMAIL34 = /^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,24}$/;
  const rnd = () => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(9)), (b) => b.toString(16).padStart(2, '0')).join('');
  async function expireOpen() { await DB.prepare("UPDATE arena.lc34_pro_sales SET status = 'expired' WHERE status = 'open' AND expires < ?").bind(now()).run(); }
  async function pricingState(tier) {
    tier = tier === 3 ? 3 : 2; await expireOpen();
    const p = PT(tier), rows = (await DB.prepare("SELECT tranche, status, COUNT(*) AS n FROM arena.lc34_pro_sales WHERE plan = 'yearly' AND tier = ? AND tranche IN (1, 2, 3) AND status IN ('open', 'paid') GROUP BY tranche, status").bind(tier).all()).results;
    const taken = [0, 0, 0], paid = [0, 0, 0];
    rows.forEach((r) => { taken[r.tranche - 1] += +r.n; if (r.status === 'paid') paid[r.tranche - 1] += +r.n; });
    const left = [0, 1, 2].map((i) => Math.max(0, p.caps[i] - taken[i])), tranche = left[0] > 0 ? 1 : left[1] > 0 ? 2 : left[2] > 0 ? 3 : 4;
    return { ok: true, tier, tranche, left, sold: paid, caps: p.caps, yearly: [p.prices[0], p.prices[1], p.prices[2], p.base], base: p.base, monthly: p.monthly, gift: tier === 2 ? Math.min(giftCents(), [p.prices[0], p.prices[1], p.prices[2], p.base][tranche - 1]) : giftCents(), discountPct: p.prices.map((x) => Math.round((1 - x / p.base) * 100)) };
  }
  async function takeSlot(tranche, cap, row) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const have = new Set((await DB.prepare("SELECT slot FROM arena.lc34_pro_sales WHERE tranche = ? AND tier = ? AND status IN ('open', 'paid') AND slot IS NOT NULL").bind(tranche, row.tier === 3 ? 3 : 2).all()).results.map((r) => r.slot));
      let slot = 0; for (let i = 1; i <= cap; i++) if (!have.has(i)) { slot = i; break; }
      if (!slot) return 0;
      try { await insertSale(Object.assign({}, row, { tranche, slot })); return slot; }
      catch (e) { if (e && (e.code === '23505' || /duplicate key/i.test(String(e.message)))) continue; throw e; }
    }
    return 0;
  }
  const insertSale = (r) => DB.prepare('INSERT INTO arena.lc34_pro_sales (session_id, email, plan, tranche, slot, amount_cents, status, device, created, expires, tier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(r.id, r.email || '', r.plan, r.tranche || null, r.slot || null, r.amount, 'open', r.device || '', r.created, r.expires, r.tier === 3 ? 3 : 2).run();
  /* LC36: the payment page lives outside the app (Netflix model: no checkout inside the Android app). SUPPORT_URL is its https address. */
  const supportUrl = () => { const u = String(E.SUPPORT_URL || '').trim(); return /^https:\/\/[^\s?#]{4,300}$/.test(u.replace(/[?#].*$/, '')) ? u.replace(/[?#].*$/, '') : ''; };
  const returnUrls = (ret) => { const s = ret === 'support' ? supportUrl() : '', app = String(E.APP_URL); return s ? { ok: s + '?paid={CHECKOUT_SESSION_ID}', no: s + '?paid=cancel' } : { ok: app + '#upgrades?paid={CHECKOUT_SESSION_ID}', no: app + '#upgrades?paid=cancel' }; };
  async function subscribe(body, ip) {
    if (limited(ip)) return { status: 429, body: { ok: false, reason: 'slow_down' } };
    const plan = body.plan === 'monthly' ? 'monthly' : body.plan === 'yearly' ? 'yearly' : '';
    if (!plan) return { status: 400, body: { ok: false, reason: 'bad_plan' } };
    const email = clean(body.email, 130).toLowerCase();
    if (email && !EMAIL34.test(email)) return { status: 400, body: { ok: false, reason: 'bad_email' } };
    await expireOpen();
    const tier = Number(body.tier) === 3 ? 3 : 2, p = PT(tier), t0 = now(), tmp = 'tmp_' + rnd(), row = { id: tmp, email, plan, tier, device: clean(body.device, 64), created: t0, expires: t0 + p.holdMs };
    const opt = arguments[2] || {}, member = opt.email || await userEmail(body.token);
    if (member && !email) row.email = member;
    let tranche = null, slot = null, amount = p.monthly;
    if (plan === 'yearly') {
      for (const t of [1, 2, 3]) { const s = await takeSlot(t, p.caps[t - 1], Object.assign({ amount: p.prices[t - 1] }, row)); if (s) { tranche = t; slot = s; amount = p.prices[t - 1]; break; } }
      if (!tranche) { tranche = 4; amount = p.base; await insertSale(Object.assign({ tranche: 4, amount }, row)); }
    } else await insertSale(Object.assign({ amount }, row));
    /* LC90: the owner's Stripe Price ID (Pro only: the yearly one for the Founding rate, the monthly one for every monthly Pro checkout) */
    let priceId = '';
    if (tier === 2 && (plan === 'monthly' || tranche === 1)) {
      const v = await paywallCfg(), pr = await checkedPrice(plan === 'yearly' ? v.stripe_price_yearly : v.stripe_price_monthly, plan === 'yearly' ? 'year' : 'month');
      if (pr) { priceId = pr.id; if (+pr.unit_amount !== amount) { amount = +pr.unit_amount; await DB.prepare('UPDATE arena.lc34_pro_sales SET amount_cents = ? WHERE session_id = ?').bind(amount, tmp).run(); } }
    }
    const base = String(E.APP_URL), meta = Object.assign({ lc: 'pro', plan, tier, tranche: tranche || '', slot: slot || '', locked_cents: amount }, opt.meta || {},
      opt.consent ? { withdrawal_waiver: opt.consent.v, consent_at: opt.consent.at } : {});
    const tax = String(E.STRIPE_TAX || '') === 'inclusive';
    const names = { 1: 'Founding Member rate', 2: 'Early Adopter rate', 3: 'Launch rate', 4: 'Standard rate' };
    const form = { mode: 'subscription', customer_email: email || undefined, client_reference_id: row.device || undefined, metadata: meta,
      success_url: returnUrls(body.ret).ok, cancel_url: returnUrls(body.ret).no, expires_at: Math.floor((t0 + p.holdMs) / 1000),
      automatic_tax: tax ? { enabled: true } : undefined, subscription_data: { metadata: meta },
      line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: amount, tax_behavior: tax ? 'inclusive' : undefined, recurring: { interval: plan === 'yearly' ? 'year' : 'month' },
        product_data: { name: 'Lanckriet Chess ' + (tier === 3 ? 'VIP' : 'Pro') + ', ' + (plan === 'yearly' ? 'yearly' : 'monthly') + (tranche ? ' (' + names[tranche] + ')' : ''), description: (tier === 3 ? 'Everything in Pro, plus your tokens credited upfront (500 a month, or 7,000 on the yearly plan), the Lanckriet Chess Student title, a blue profile border and priority in live streams and the community.' : 'The whole library, the 24/7 AI coach and 10 tokens a day, refreshed daily.') + (tranche && tranche < 4 ? ' Your ' + names[tranche] + ' stays the same for as long as your subscription stays active.' : '') } } }] };
    if (priceId) form.line_items = [{ quantity: 1, price: priceId }];
    if (opt.consent) form.subscription_data.description = (tier === 3 ? 'Lanckriet Chess VIP' : 'Lanckriet Chess Pro') + ', ' + plan + '. ' + RECEIPT_WAIVER;   /* LC99: on the invoices */
    if (opt.trial) {   /* LC73: 7 days at EUR 0 with the card on file, then the plan's price until cancelled; Checkout shows "7 days, then EUR 39.00 / month" */
      const days = Number.isInteger(opt.trialDays) && opt.trialDays >= 1 && opt.trialDays <= 30 ? opt.trialDays : 7;   /* LC90: the owner sets the length */
      form.payment_method_collection = 'always';
      form.subscription_data.trial_period_days = days;
      form.subscription_data.trial_settings = { end_behavior: { missing_payment_method: 'cancel' } };
      form.custom_text = { submit: { message: 'EUR 0 today. From day ' + (days + 1) + ' Pro costs EUR ' + (amount / 100).toFixed(2) + (plan === 'yearly' ? ' a year' : ' a month') + ' until you cancel. Cancel any time before the trial ends (Account > Manage subscription) and nothing is charged. Withdraw within 14 days of today and you pay only for the paid days you used (Withdraw from contract here, in the app).' } };
    }
    if (opt.minus) {   /* LC73 rescue: a one-time EUR 39 off the first year; LC99: the one-time month's credit; renewals are at the normal yearly rate */
      const cp = opt.coupon || { id: 'LC-RESCUE39', name: 'Your first month counts toward the year' };
      const c = await fixedCoupon(cp.id, opt.minus, cp.name);
      if (typeof opt.submit === 'function') form.custom_text = { submit: { message: opt.submit(amount) } };
      if (c) form.discounts = [{ coupon: c }];
      const cus = await customerOf(row.email); if (cus) { form.customer = cus; delete form.customer_email; }
    } else {
      const sp = await sprintPct(row.email), spc = sp ? await sprintCoupon(sp) : '';
      if (spc) { await personalise(form, row.email, meta, false); form.discounts = [{ coupon: spc }]; meta.sprint = '1'; meta.sprint_pct = String(sp); form.subscription_data.metadata = meta; }   /* LC106: the Sprint price replaces the 10 % referral discount (never both) */
      else await personalise(form, row.email, meta, plan === 'yearly' || !opt.trial);
    }
    let sess;
    try { sess = await stripe('POST', 'checkout/sessions', form); }
    catch (e) { await DB.prepare('DELETE FROM arena.lc34_pro_sales WHERE session_id = ?').bind(tmp).run(); throw e; }
    await DB.prepare('UPDATE arena.lc34_pro_sales SET session_id = ? WHERE session_id = ?').bind(sess.id, tmp).run();
    if (opt.consent) await logConsent(row.email, opt.consent, sess.id, row.device);
    const st = await pricingState(tier);
    return { status: 200, body: { ok: true, url: sess.url, session: sess.id, plan, tier, tranche, amount_cents: amount, left: st.left, locked: !!(tranche && tranche < 4) } };
  }
  /* ----- LC36: Gift a friend. One year of Pro, paid once, for another email address. No renewal. The recipient signs in with that address. ----- */
  const giftCents = () => num(E.GIFT_PRO_YEAR_CENTS, P34().base);
  /* LC73 (9.37.0): a gift costs the yearly Pro rate that is live NOW (Founding / Early Adopter / launch), or the member's OWN locked yearly rate when that is lower.
     The member is identified by their Supabase token (never by a typed e-mail, so nobody can borrow somebody else's Founding rate). A gift takes no launch spot. */
  async function giftRate(body) {
    const st = await pricingState(2), p = PT(2), live = st.yearly[(st.tranche || 4) - 1] || p.base;
    let amount = Math.min(live, giftCents()), why = (st.tranche || 4) < 4 ? 'launch' : 'standard', tranche = st.tranche || 4;
    const email = await userEmail(body && body.token);
    if (email) {
      let own = await q1("SELECT min(s.tranche) AS t FROM arena.lc34_pro_sales s WHERE lower(s.email) = ? AND s.status = 'paid' AND s.plan = 'yearly' AND s.tranche BETWEEN 1 AND 3 AND EXISTS (SELECT 1 FROM public.licenses l WHERE upper(l.license_key) = upper(s.license_key) AND coalesce(l.revoked, false) = false AND l.expires_at > now())", email);
      let t = own && own.t ? +own.t : 0;
      if (!t) { const pl = await q1("SELECT 1 AS ok FROM public.lc45_payment_events e WHERE lower(e.email) = ? AND e.product IN ('pro_yearly','vip_yearly') AND EXISTS (SELECT 1 FROM public.licenses l WHERE lower(l.email) = lower(e.email) AND l.tier >= 2 AND coalesce(l.revoked, false) = false AND l.expires_at > now()) LIMIT 1", email); if (pl) t = 1; }   /* the yearly Payment Links carry the Founding price */
      if (t >= 1 && t <= 3 && p.prices[t - 1] < amount) { amount = p.prices[t - 1]; why = 'yours'; tranche = t; }
    }
    return { amount, why, tranche, signed_in: !!email };
  }
  async function gift(body, ip) {
    if (limited(ip)) return { status: 429, body: { ok: false, reason: 'slow_down' } };
    const to = clean(body.to, 130).toLowerCase(), from = clean(body.email, 130).toLowerCase();
    if (!EMAIL34.test(to)) return { status: 400, body: { ok: false, reason: 'bad_recipient' } };
    if (from && !EMAIL34.test(from)) return { status: 400, body: { ok: false, reason: 'bad_email' } };
    const rate = await giftRate(body), amount = rate.amount, urls = returnUrls(body.ret), tax = String(E.STRIPE_TAX || '') === 'inclusive', meta = { lc: 'gift', to, plan: 'yearly', from_name: clean(body.from_name, 40).replace(/[<>]/g, ''), note: clean(body.note, 300).replace(/[<>]/g, '') };   /* 9.38.1: shown to the friend in the app */
    const form = { mode: 'payment', customer_email: from || undefined, metadata: meta, payment_intent_data: { metadata: meta }, success_url: urls.ok, cancel_url: urls.no,
      automatic_tax: tax ? { enabled: true } : undefined,
      line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: amount, tax_behavior: tax ? 'inclusive' : undefined,
        product_data: { name: 'Gift: Lanckriet Chess Pro, 1 year' + (rate.why === 'yours' ? ' (your own rate)' : rate.why === 'launch' ? ' (launch rate)' : ''), description: 'One year of Pro for ' + to + '. They sign in with this email address to switch it on. It does not renew.' } } }] };
    const sess = await stripe('POST', 'checkout/sessions', form);
    return { status: 200, body: { ok: true, url: sess.url, session: sess.id, amount_cents: amount, why: rate.why } };
  }
  async function giftPaid(o) {
    const m = o.metadata || {}, to = clean(m.to, 130).toLowerCase();
    if (!EMAIL34.test(to)) { console.error('LC36: gift without a valid recipient ' + o.id); return; }
    const have = await DB.prepare("SELECT 1 AS ok FROM public.licenses WHERE flags->>'session' = ?").bind(o.id).first();
    if (have) return;   /* Stripe sent the event twice: one gift, one licence */
    const until = now() + 365 * 864e5, from = clean((o.customer_details && o.customer_details.email) || o.customer_email, 130).toLowerCase();
    const flags = { source: 'gift', plan: 'yearly', session: o.id, from, from_name: clean(m.from_name, 40), note: clean(m.note, 300) };
    if (from) await afterPaid(o, from);
    const lic = await DB.prepare('SELECT license_key FROM public._lc_create_license(?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?)')
      .bind(to, 'gift', 'Pro gift (1 year)', 2, false, new Date(until).toISOString(), P34().dailyTokens, flags, 3).first();
    if (!lic || !lic.license_key) throw new Error('gift licence not created');   /* throwing makes Stripe retry the webhook */
  }
  /* ----- LC36: token packs. Paid once, filed under the buyer's email, moved into the wallet when that member signs in (Arena: tokens_claim_email). ----- */
  async function tokensBuy(body, ip) {
    if (limited(ip)) return { status: 429, body: { ok: false, reason: 'slow_down' } };
    const id = clean(body.pack, 8), pack = Object.prototype.hasOwnProperty.call(PACKS, id) ? PACKS[id] : null;
    if (!pack) return { status: 400, body: { ok: false, reason: 'bad_pack' } };
    const email = clean(body.email, 130).toLowerCase();
    if (!EMAIL34.test(email)) return { status: 400, body: { ok: false, reason: 'bad_email' } };
    const urls = returnUrls(body.ret), tax = String(E.STRIPE_TAX || '') === 'inclusive', meta = { lc: 'tokens', pack: id, tokens: pack.tokens, email };
    const form = { mode: 'payment', customer_email: email, metadata: meta, payment_intent_data: { metadata: meta }, success_url: urls.ok, cancel_url: urls.no,
      automatic_tax: tax ? { enabled: true } : undefined,
      line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: pack.cents, tax_behavior: tax ? 'inclusive' : undefined,
        product_data: { name: pack.tokens + ' Lanckriet Chess tokens', description: 'Tokens for deep game analyses and the coach. They are added to your account when you sign in to the Hub with ' + email + '.' } } }] };
    await personalise(form, email, meta, true);
    const sess = await stripe('POST', 'checkout/sessions', form);
    return { status: 200, body: { ok: true, url: sess.url, session: sess.id, amount_cents: pack.cents, tokens: pack.tokens } };
  }
  async function afterPaid(o, email) {   /* LC73: remember the Stripe customer (their saved card is offered next time) and use up a referral discount */
    const m = o.metadata || {};
    if (o.customer) await rememberCustomer(email, o.customer);
    if ((m.ref_disc === 'invitee' || m.ref_disc === 'referrer') && EMAIL34.test(m.ref_email || '')) await run1('SELECT public.lc73_discount_paid(?, ?, ?)', m.ref_email, m.ref_disc, o.id);
  }
  async function tokensPaid(o) {
    const m = o.metadata || {}, pack = Object.prototype.hasOwnProperty.call(PACKS, m.pack) ? PACKS[m.pack] : null;
    const email = clean(m.email || (o.customer_details && o.customer_details.email) || o.customer_email, 130).toLowerCase();
    if (!pack || !EMAIL34.test(email)) { console.error('LC36: token pack without a valid pack or email ' + o.id); return; }
    await DB.prepare('INSERT INTO public.lc36_token_credits (email, tokens, pack, amount_cents, session_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT (session_id) DO NOTHING').bind(email, pack.tokens, m.pack, o.amount_total != null ? o.amount_total : pack.cents, o.id).run();   /* the pack size comes from the table above, not from the metadata */
    await afterPaid(o, email);
  }
  /* LC39 vipCredit: VIP gets its tokens upfront: TOKENS_VIP_MONTH (500) for every paid month, VIP_YEAR_TOKENS (7,000) for every paid year. They wait in
     lc36_token_credits under the buyer's email and move to the wallet at sign-in, like the token packs. The key is the checkout / invoice id: one row per payment. */
  async function vipCredit(sale, email, ref) {
    try {
      if (!sale || Number(sale.tier) !== 3 || !ref) return;
      const em = String(email || sale.email || '').toLowerCase(), yearly = sale.plan === 'yearly';
      if (!EMAIL34.test(em)) { console.error('LC39: VIP credit without a valid email ' + ref); return; }
      await DB.prepare('INSERT INTO public.lc36_token_credits (email, tokens, pack, amount_cents, session_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT (session_id) DO NOTHING')
        .bind(em, yearly ? num(E.VIP_YEAR_TOKENS, 7000) : num(E.TOKENS_VIP_MONTH, 500), yearly ? 'vip_year' : 'vip_month', 0, ref).run();
    } catch (e) { console.error('LC39: VIP credit failed for ' + ref + ': ' + (e && e.message)); }
  }
  const saleView = (r) => ({ plan: r.plan, vip: r.tier === 3, tranche: r.tranche, founding: r.tranche === 1, early: r.tranche === 1 || r.tranche === 2, locked_cents: r.amount_cents });
  async function claim(body, ip) {
    if (readLimited(ip)) return { status: 429, body: { ok: false, reason: 'slow_down' } };
    const id = clean(body.session, 220);
    if (!SESSION34.test(id)) return { status: 400, body: { ok: false, reason: 'bad_session' } };
    const r = await DB.prepare('SELECT * FROM arena.lc34_pro_sales WHERE session_id = ?').bind(id).first();
    if (!r) return { status: 404, body: { ok: false, reason: 'not_found' } };
    if (r.status === 'paid' && r.license_key) return { status: 200, body: Object.assign({ ok: true, status: 'paid', key: r.license_key, expires: r.license_expires }, saleView(r)) };
    return { status: 200, body: { ok: true, status: r.status === 'paid' ? 'pending' : r.status === 'open' ? 'pending' : r.status } };
  }
  async function entitlement(body, ip) {
    if (readLimited(ip)) return { status: 429, body: { ok: false, reason: 'slow_down' } };
    const key = clean(body.key, 220).replace(/\s+/g, '');
    if (!KEY34.test(key)) return { status: 400, body: { ok: false, reason: 'bad_key' } };
    const r = await DB.prepare("SELECT * FROM arena.lc34_pro_sales WHERE upper(license_key) = upper(?) AND status = 'paid' ORDER BY paid_at DESC LIMIT 1").bind(key).first();
    if (!r) return { status: 200, body: { ok: true, founding: false, early: false, tranche: 0, active: false } };
    const lic = await DB.prepare("SELECT 1 AS ok FROM public.licenses WHERE upper(license_key) = upper(?) AND coalesce(revoked, false) = false AND (expires_at IS NULL OR expires_at > now())").bind(key).first();
    return { status: 200, body: Object.assign({ ok: true, active: !!lic, expires: r.license_expires }, saleView(r)) };   /* the badge is for good: it is kept after a lapse */
  }
  const trialLen = (m) => { const d = Math.floor(+(m && m.trial_days)); return d >= 1 && d <= 30 ? d : 7; };   /* LC90: older sessions carry no trial_days: 7 */
  const licenseUntil = (sale, periodEndMs) => (periodEndMs || (now() + (sale.plan === 'yearly' ? 365 : 30) * 864e5)) + P34().graceMs;
  /* LC94 (9.58.0): the last step of the funnel, on the same device id the app sent with the checkout. Best effort: a missing table or a
     database hiccup is logged and never stops the licence. */
  async function funnelPaid(device) {
    const aid = String(device || '');
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(aid)) return;
    try { await DB.prepare("INSERT INTO public.lc94_funnel (aid, step, src) VALUES (?, 'paid', NULL) ON CONFLICT DO NOTHING").bind(aid).run(); }
    catch (e) { console.error('LC94: the paid step was not stored: ' + String((e && e.message) || e).slice(0, 120)); }
  }
  async function proPaid(o) {
    const sale = await DB.prepare('SELECT * FROM arena.lc34_pro_sales WHERE session_id = ?').bind(o.id).first();
    if (!sale) { console.error('LC34: paid session without a sale row ' + o.id); return; }
    const email = clean((o.customer_details && o.customer_details.email) || o.customer_email || sale.email, 130).toLowerCase();
    try { await DB.prepare("UPDATE arena.lc34_pro_sales SET status = 'paid', paid_at = ?, email = ?, subscription_id = ?, customer_id = ? WHERE session_id = ?").bind(now(), email, o.subscription || null, o.customer || null, o.id).run(); }
    catch (e) {   /* the hold had expired and somebody else took the slot: the buyer paid the tranche price, so the price is honoured and the slot is dropped */
      if (e && (e.code === '23505' || /duplicate key/i.test(String(e.message)))) await DB.prepare("UPDATE arena.lc34_pro_sales SET status = 'paid', slot = NULL, paid_at = ?, email = ?, subscription_id = ?, customer_id = ? WHERE session_id = ?").bind(now(), email, o.subscription || null, o.customer || null, o.id).run();
      else throw e;
    }
    await vipCredit(sale, email, o.id);
    await funnelPaid(sale.device);
    await afterPaid(o, email);
    const m = o.metadata || {};
    if (m.trial === '1') {
      await run1('INSERT INTO public.lc73_trials (session_id, email, subscription_id, customer_id, trial_end) VALUES (?, ?, ?, ?, ?) ON CONFLICT (session_id) DO NOTHING', o.id, email, o.subscription || null, o.customer || null, new Date(now() + trialLen(m) * 864e5).toISOString());
      await run1("INSERT INTO public.lc73_sub_events (kind, email, ref) VALUES ('trial_start', ?, ?) ON CONFLICT DO NOTHING", email, o.id);
      await note97(email, 'trial_start', o.id);   /* LC97: trial_used, start and end in the member state */
    }
    if (m.rescue === '1') {
      await run1('UPDATE public.lc73_trials SET rescue_used = true WHERE email = ?', email);
      await run1("INSERT INTO public.lc73_sub_events (kind, email, amount_cents, ref) VALUES ('rescue', ?, ?, ?) ON CONFLICT DO NOTHING", email, o.amount_total || 0, o.id);
      if (/^sub_[A-Za-z0-9]+$/.test(m.cancel_sub || '') && m.cancel_sub !== o.subscription) { try { await stripe('DELETE', 'subscriptions/' + m.cancel_sub); } catch (e) { console.error('LC73: could not cancel the monthly plan ' + m.cancel_sub); } }
    }
    if (m.sprint === '1') await run1('SELECT public._lc106_used(?, ?)', email, o.id);   /* LC106: the Sprint price is used, once */
    if (m.annual25 === '1') {   /* LC99: the yearly plan with the one-time month's credit is paid: the credit is used, once */
      try { await DB.prepare('SELECT public._lc99_note(?, ?, ?)').bind(email, 'annual25_paid', o.id).run(); }
      catch (e) { console.error('LC99: the credit was not marked used for ' + o.id + ': ' + String((e && e.message) || e).slice(0, 120)); }
    }
    if (sale.license_key) return;
    const until = m.trial === '1' ? now() + (trialLen(m) + 1) * 864e5 + P34().graceMs : licenseUntil(sale), flags = { source: 'stripe', plan: sale.plan, vip: sale.tier === 3, tranche: sale.tranche || 0, founding: sale.tranche === 1, early: sale.tranche === 1 || sale.tranche === 2, locked_cents: sale.amount_cents, session: o.id };
    const lic = await DB.prepare('SELECT license_key FROM public._lc_create_license(?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?)')
      .bind(email, 'stripe', (sale.tier === 3 ? 'VIP ' : 'Pro ') + sale.plan, 2, false, new Date(until).toISOString(), P34().dailyTokens, flags, 3).first();   /* an object, not a string: the driver encodes jsonb itself */
    if (!lic || !lic.license_key) throw new Error('licence not created');   /* throwing makes Stripe retry the webhook; nothing is lost */
    await DB.prepare('UPDATE arena.lc34_pro_sales SET license_key = ?, license_expires = ? WHERE session_id = ?').bind(lic.license_key, until, o.id).run();
  }
  async function proEvent(ev, o) {
    const m = o.metadata || {};
    if (ev.type === 'checkout.session.completed' && m.lc === 'tokens') { if (o.mode === 'payment' && o.payment_status === 'paid') await tokensPaid(o); return true; }
    if (ev.type === 'checkout.session.completed' && m.lc === 'downsell') { if (o.mode === 'payment' && o.payment_status === 'paid') await downsellPaid(o); return true; }
    if (ev.type === 'checkout.session.expired' && m.lc === 'downsell') { await run1("UPDATE public.lc97_downsell SET status = 'expired' WHERE session_id = ? AND status = 'open'", o.id); return true; }
    if (ev.type === 'checkout.session.completed' && m.lc === 'gift') { if (o.mode === 'payment' && o.payment_status === 'paid') await giftPaid(o); return true; }
    if (ev.type === 'checkout.session.completed' && m.lc === 'pro') { if (o.mode === 'subscription' && (o.payment_status === 'paid' || (m.trial === '1' && o.payment_status === 'no_payment_required'))) await proPaid(o); return true; }
    if (ev.type === 'customer.subscription.deleted' && o.id) { if (await q1('SELECT 1 AS ok FROM public.lc73_trials WHERE subscription_id = ? AND converted_at IS NULL', o.id)) await run1("UPDATE arena.lc34_pro_sales SET status = 'expired', slot = NULL WHERE subscription_id = ? AND status = 'paid'", o.id);   /* LC90: an unconverted trial frees its Founding place */
      /* LC97 (9.62.0): an unconverted trial's Pro ends when the trial ends (before, the licence ran one day plus the grace days longer),
         so the post-trial pop-up comes at the real end of the trial. Never earlier than now, never later than the licence already said. */
      const tr97 = await q1('SELECT email, trial_end FROM public.lc73_trials WHERE subscription_id = ? AND converted_at IS NULL', o.id);
      if (tr97 && tr97.trial_end) await run1("UPDATE public.licenses SET expires_at = LEAST(expires_at, GREATEST(now(), ?::timestamptz)) WHERE coalesce(revoked, false) = false AND upper(license_key) IN (SELECT upper(license_key) FROM arena.lc34_pro_sales WHERE subscription_id = ? AND license_key IS NOT NULL)", new Date(tr97.trial_end).toISOString(), o.id);
      await run1('UPDATE public.lc73_trials SET cancelled = true WHERE subscription_id = ? AND converted_at IS NULL', o.id); await run1("INSERT INTO public.lc73_sub_events (kind, ref) VALUES ('trial_cancel', ?) ON CONFLICT DO NOTHING", o.id);
      if (tr97) await note97(String(tr97.email || '').toLowerCase(), 'trial_cancel', o.id);
      return false; }
    if (ev.type === 'checkout.session.expired' && m.lc === 'pro') { await DB.prepare("UPDATE arena.lc34_pro_sales SET status = 'expired' WHERE session_id = ? AND status = 'open'").bind(o.id).run(); return true; }
    if (ev.type === 'invoice.paid') {
      const subId = o.subscription || (o.parent && o.parent.subscription_details && o.parent.subscription_details.subscription) || '';
      const sale = subId && await DB.prepare("SELECT * FROM arena.lc34_pro_sales WHERE subscription_id = ? AND status = 'paid'").bind(subId).first();
      if (!sale) return false;
      if (o.billing_reason === 'subscription_cycle') await vipCredit(sale, sale.email, o.id);   /* the first invoice is credited by the checkout event */
      if (+o.amount_paid > 0) {   /* LC73: the first paid invoice after a trial converts it and opens the rescue offer for 14 days; later ones are renewals */
        const tr = await q1('SELECT session_id FROM public.lc73_trials WHERE subscription_id = ? AND converted_at IS NULL', subId);
        if (tr) { await run1("UPDATE public.lc73_trials SET converted_at = now(), rescue_until = now() + interval '14 days' WHERE session_id = ?", tr.session_id); await run1("INSERT INTO public.lc73_sub_events (kind, email, amount_cents, ref) VALUES ('trial_convert', ?, ?, ?) ON CONFLICT DO NOTHING", sale.email || '', +o.amount_paid, o.id); await note97(String(sale.email || '').toLowerCase(), 'trial_convert', o.id); }
        else if (o.billing_reason === 'subscription_cycle') await run1("INSERT INTO public.lc73_sub_events (kind, email, amount_cents, ref) VALUES ('renewal', ?, ?, ?) ON CONFLICT DO NOTHING", sale.email || '', +o.amount_paid, o.id);
      }
      const end = o.lines && o.lines.data && o.lines.data[0] && o.lines.data[0].period && o.lines.data[0].period.end;
      if (sale.license_key && end) {
        const until = licenseUntil(sale, end * 1000);
        await DB.prepare('UPDATE public.licenses SET expires_at = GREATEST(coalesce(expires_at, to_timestamp(0)), ?::timestamptz) WHERE upper(license_key) = upper(?) AND coalesce(revoked, false) = false').bind(new Date(until).toISOString(), sale.license_key).run();
        await DB.prepare('UPDATE arena.lc34_pro_sales SET license_expires = GREATEST(coalesce(license_expires, 0), ?) WHERE session_id = ?').bind(until, sale.session_id).run();
      }
      return true;
    }
    if (ev.type === 'charge.refunded' && o.refunded === true && o.customer) {
      const sale = await DB.prepare("SELECT * FROM arena.lc34_pro_sales WHERE customer_id = ? AND status = 'paid' ORDER BY paid_at DESC LIMIT 1").bind(o.customer).first();
      if (!sale) return false;
      await DB.prepare("UPDATE arena.lc34_pro_sales SET status = 'refunded' WHERE session_id = ?").bind(sale.session_id).run();
      try { await DB.prepare('DELETE FROM public.lc36_token_credits WHERE session_id = ? AND claimed_at IS NULL').bind(sale.session_id).run(); } catch (e) { console.error('LC39: could not remove the unclaimed VIP credit: ' + (e && e.message)); }
      if (sale.license_key) {
        try { await DB.prepare("UPDATE public.licenses SET revoked = true, status = 'revoked' WHERE upper(license_key) = upper(?)").bind(sale.license_key).run(); }
        catch (e) { await DB.prepare('UPDATE public.licenses SET revoked = true WHERE upper(license_key) = upper(?)').bind(sale.license_key).run(); }
      }
      return true;
    }
    return false;
  }
  async function admin(body) {
    if (!eqSecret(body.secret, E.ADMIN_TOKEN)) return { status: 403, body: { ok: false, reason: 'forbidden' } };
    const c = await creatorOf(clean(body.creator, 30)); if (!c) return { status: 404, body: { ok: false, reason: 'not_found' } };
    if (body.op === 'create_account') {
      if (c.stripe_account) return { status: 200, body: { ok: true, account: c.stripe_account, existing: true } };
      const a = await stripe('POST', 'accounts', { type: 'express', country: E.STRIPE_COUNTRY, capabilities: { card_payments: { requested: true }, transfers: { requested: true } }, business_profile: { name: c.name }, metadata: { creator: c.code } });
      await DB.prepare('UPDATE arena.lc27_creators SET stripe_account = ? WHERE code = ?').bind(a.id, c.code).run();
      return { status: 200, body: { ok: true, account: a.id } };
    }
    if (!c.stripe_account) return { status: 409, body: { ok: false, reason: 'no_account' } };
    if (body.op === 'onboard_link') { const l = await stripe('POST', 'account_links', { account: c.stripe_account, type: 'account_onboarding', refresh_url: String(E.APP_URL) + '#admin-live', return_url: String(E.APP_URL) + '#admin-live' }); return { status: 200, body: { ok: true, url: l.url } }; }
    if (body.op === 'refresh') {
      const a = await stripe('GET', 'accounts/' + encodeURIComponent(c.stripe_account));
      await DB.prepare('UPDATE arena.lc27_creators SET charges_enabled = ?, payouts_enabled = ? WHERE code = ?').bind(a.charges_enabled ? 1 : 0, a.payouts_enabled ? 1 : 0, c.code).run();
      return { status: 200, body: { ok: true, charges_enabled: !!a.charges_enabled, payouts_enabled: !!a.payouts_enabled } };
    }
    return { status: 400, body: { ok: false, reason: 'bad_input' } };
  }
  async function ledger(eventId, kind, creator, gross, fee, ref) {
    await DB.prepare('INSERT OR IGNORE INTO arena.lc27_ledger (event_id, kind, creator, gross, fee, net, currency, ref, t) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(eventId, kind, creator, gross, fee, gross - fee, 'eur', ref || null, now()).run();
  }
  async function handle(ev) {
    const o = ev.data && ev.data.object || {};
    if (await proEvent(ev, o)) return;
    if (ev.type === 'checkout.session.completed' && o.mode === 'payment' && o.payment_status === 'paid' && o.metadata && o.metadata.creator)
      return ledger(ev.id, 'donation', o.metadata.creator, o.amount_total, split(o.amount_total, o.metadata.fee_pct).fee, o.id);
    if (ev.type === 'invoice.paid' && o.amount_paid > 0) {
      const m = (o.subscription_details && o.subscription_details.metadata) || (o.lines && o.lines.data && o.lines.data[0] && o.lines.data[0].metadata) || {};
      if (m.creator) return ledger(ev.id, 'subscription', m.creator, o.amount_paid, split(o.amount_paid, m.fee_pct).fee, o.id);
    }
    if (ev.type === 'charge.refunded' && o.amount_refunded > 0 && o.metadata && o.metadata.creator)
      return ledger(ev.id, 'refund', o.metadata.creator, -o.amount_refunded, -split(o.amount_refunded, o.metadata.fee_pct).fee, o.id);
    if (ev.type === 'account.updated' && o.id)
      await DB.prepare('UPDATE arena.lc27_creators SET charges_enabled = ?, payouts_enabled = ? WHERE stripe_account = ?').bind(o.charges_enabled ? 1 : 0, o.payouts_enabled ? 1 : 0, o.id).run();
  }
  async function webhook(raw, sig) {
    if (!verifySignature(raw, sig, E.STRIPE_WEBHOOK_SECRET)) return { status: 400, body: { ok: false, reason: 'bad_signature' } };
    let ev; try { ev = JSON.parse(raw); } catch (e) { return { status: 400, body: { ok: false, reason: 'bad_json' } }; }
    if (!ev || typeof ev.id !== 'string') return { status: 400, body: { ok: false, reason: 'bad_json' } };
    const first = await DB.prepare('INSERT OR IGNORE INTO arena.lc27_events (id, t) VALUES (?, ?)').bind(ev.id, now()).run();
    if (!first.meta.changes) return { status: 200, body: { ok: true, duplicate: true } };
    try { await handle(ev); } catch (e) { await DB.prepare('DELETE FROM arena.lc27_events WHERE id = ?').bind(ev.id).run(); throw e; }   // Stripe retries what we could not store
    return { status: 200, body: { ok: true } };
  }
  return async function (req) {
    const h = cors(req), path = new URL(req.url).pathname.replace(/\/+$/, '').split('/').pop();
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (req.method !== 'POST') return json({ ok: false, reason: 'method' }, 405, h);
    try {
      const raw = await req.text();
      /* 9.58.0: Stripe's own events (an invoice with lines, discounts and tax) can be far bigger than 20 KB; a 413 there made Stripe retry
         for three days and then give up, so a buyer paid without a licence. The webhook gets 512 KB, the browser routes keep 20 KB. */
      if (raw.length > (path === 'webhook' ? WEBHOOK_MAX : 20000)) return json({ ok: false, reason: 'too_large' }, 413, h);
      let r;
      if (path === 'webhook') r = await webhook(raw, req.headers.get('stripe-signature'));
      else { let body; try { body = JSON.parse(raw || '{}'); } catch (e) { return json({ ok: false, reason: 'bad_json' }, 400, h); }
        if (path === 'checkout') r = await checkout(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'subscribe') r = await subscribe(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'tokens') r = await tokensBuy(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'gift') r = await gift(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'gift_quote') r = readLimited((req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim()) ? { status: 429, body: { ok: false, reason: 'slow_down' } } : { status: 200, body: Object.assign({ ok: true }, await giftRate(body)) };
        else if (path === 'trial') r = await trial(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'rescue') r = await rescue(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'annual25') r = await annual25(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'withdraw') r = await withdraw(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'sprint') r = await sprintBuy(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'downsell') r = await downsell(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'pricing') r = readLimited((req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim()) ? { status: 429, body: { ok: false, reason: 'slow_down' } } : { status: 200, body: Object.assign(await pricingState(2), { vip: await pricingState(3), downsell: { cents: DL().cents, anchor_cents: DL().anchor, days: DL().days }, packs: Object.keys(PACKS).map((k) => ({ id: k, cents: PACKS[k].cents, tokens: PACKS[k].tokens })), portal: /^https:\/\/[^\s]{4,300}$/.test(String(E.BILLING_PORTAL_URL || '')) ? String(E.BILLING_PORTAL_URL) : '' }) };
        else if (path === 'claim') r = await claim(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'entitlement') r = await entitlement(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'admin') r = await admin(body); else return json({ ok: false, reason: 'unknown_route' }, 404, h); }
      return json(r.body, r.status, h);
    } catch (e) { if (!e.status) console.error('stripe function: ' + (e && e.stack || e)); return json({ ok: false, reason: e.message === 'not_configured' ? 'not_configured' : 'server' }, e.status || 500, h); }
  };
}
