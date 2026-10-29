/* stripe.js: Stripe Connect for the creator marketplace (hub 9.5.0). Supabase Edge Function "stripe".
   Viewers support a creator (one-time or monthly). The creator is paid by Stripe straight to their connected account (destination
   charge); the platform keeps an application fee of 10 to 20 percent. The hub never sees card data: Stripe Checkout does.
   Routes (POST):  /checkout  public, returns a Checkout URL
                   /admin      admin secret: create_account, onboard_link, refresh
                   /webhook    Stripe only, verified with STRIPE_WEBHOOK_SECRET
   Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, ADMIN_TOKEN. Optional: APP_URL, ALLOWED_ORIGINS, MIN_DONATION_CENTS (300), MAX_DONATION_CENTS (50000),
   STRIPE_COUNTRY (BE), STRIPE_API_BASE (tests). No Deno-only APIs: the Node tests run exactly this file. */
import { makeDB } from './db.js';
import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_ORIGIN = 'https://lanckrietchess-app.vercel.app';
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
const eqSecret = (a, b) => { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || '')); return y.length >= 16 && x.length === y.length && timingSafeEqual(x, y); };

export function makeStripeHandler(sql, env, fetchImpl) {
  const E = Object.assign({ APP_URL: DEFAULT_ORIGIN + '/app.html', SUPPORT_URL: DEFAULT_ORIGIN + '/', ALLOWED_ORIGINS: DEFAULT_ORIGIN, STRIPE_COUNTRY: 'BE', STRIPE_API_BASE: 'https://api.stripe.com' }, env);
  const DB = makeDB(sql), doFetch = fetchImpl || fetch, hits = new Map();
  const origins = String(E.ALLOWED_ORIGINS).split(',').map((s) => s.trim()).filter(Boolean);
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
  /* LC36: VIP (Tier 3) = the same product and the same Founding / Early Adopter tranches per 100 buyers as Pro, counted separately, at a higher price.
     The defaults are 2x the Pro prices (VIP_YEARLY_BASE_CENTS, VIP_TRANCHE1_CENTS, VIP_TRANCHE2_CENTS, VIP_MONTHLY_CENTS override them). */
  const PV = () => { const p = P34(), base = num(E.VIP_YEARLY_BASE_CENTS, 59900); return Object.assign({}, p, { base, monthly: num(E.VIP_MONTHLY_CENTS, 5900), prices: ladder(base, 'VIP_TRANCHE') }); };
  const PT = (tier) => (tier === 3 ? PV() : P34());
  /* token packs: fixed here, never taken from the browser */
  const PACKS = { t3: { cents: 100, tokens: 3 }, t100: { cents: 1000, tokens: 100 }, t300: { cents: 2000, tokens: 300 }, t1000: { cents: 5000, tokens: 1000 } };
  const KEY34 = /^LC-[A-Za-z0-9_-]{2,200}$/i, SESSION34 = /^cs_[A-Za-z0-9_]{8,200}$/, EMAIL34 = /^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,24}$/;
  const rnd = () => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(9)), (b) => b.toString(16).padStart(2, '0')).join('');
  async function expireOpen() { await DB.prepare("UPDATE arena.lc34_pro_sales SET status = 'expired' WHERE status = 'open' AND expires < ?").bind(now()).run(); }
  async function pricingState(tier) {
    tier = tier === 3 ? 3 : 2; await expireOpen();
    const p = PT(tier), rows = (await DB.prepare("SELECT tranche, status, COUNT(*) AS n FROM arena.lc34_pro_sales WHERE plan = 'yearly' AND tier = ? AND tranche IN (1, 2, 3) AND status IN ('open', 'paid') GROUP BY tranche, status").bind(tier).all()).results;
    const taken = [0, 0, 0], paid = [0, 0, 0];
    rows.forEach((r) => { taken[r.tranche - 1] += +r.n; if (r.status === 'paid') paid[r.tranche - 1] += +r.n; });
    const left = [0, 1, 2].map((i) => Math.max(0, p.caps[i] - taken[i])), tranche = left[0] > 0 ? 1 : left[1] > 0 ? 2 : left[2] > 0 ? 3 : 4;
    return { ok: true, tier, tranche, left, sold: paid, caps: p.caps, yearly: [p.prices[0], p.prices[1], p.prices[2], p.base], base: p.base, monthly: p.monthly, gift: giftCents(), discountPct: p.prices.map((x) => Math.round((1 - x / p.base) * 100)) };
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
    let tranche = null, slot = null, amount = p.monthly;
    if (plan === 'yearly') {
      for (const t of [1, 2, 3]) { const s = await takeSlot(t, p.caps[t - 1], Object.assign({ amount: p.prices[t - 1] }, row)); if (s) { tranche = t; slot = s; amount = p.prices[t - 1]; break; } }
      if (!tranche) { tranche = 4; amount = p.base; await insertSale(Object.assign({ tranche: 4, amount }, row)); }
    } else await insertSale(Object.assign({ amount }, row));
    const base = String(E.APP_URL), meta = { lc: 'pro', plan, tier, tranche: tranche || '', slot: slot || '', locked_cents: amount };
    const tax = String(E.STRIPE_TAX || '') === 'inclusive';
    const names = { 1: 'Founding Member rate', 2: 'Early Adopter rate', 3: 'Launch rate', 4: 'Standard rate' };
    const form = { mode: 'subscription', customer_email: email || undefined, client_reference_id: row.device || undefined, metadata: meta,
      success_url: returnUrls(body.ret).ok, cancel_url: returnUrls(body.ret).no, expires_at: Math.floor((t0 + p.holdMs) / 1000),
      automatic_tax: tax ? { enabled: true } : undefined, subscription_data: { metadata: meta },
      line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: amount, tax_behavior: tax ? 'inclusive' : undefined, recurring: { interval: plan === 'yearly' ? 'year' : 'month' },
        product_data: { name: 'Lanckriet Chess ' + (tier === 3 ? 'VIP' : 'Pro') + ', ' + (plan === 'yearly' ? 'yearly' : 'monthly') + (tranche ? ' (' + names[tranche] + ')' : ''), description: tranche && tranche < 4 ? 'Your ' + names[tranche] + ' stays the same for as long as your subscription stays active.' : undefined } } }] };
    let sess;
    try { sess = await stripe('POST', 'checkout/sessions', form); }
    catch (e) { await DB.prepare('DELETE FROM arena.lc34_pro_sales WHERE session_id = ?').bind(tmp).run(); throw e; }
    await DB.prepare('UPDATE arena.lc34_pro_sales SET session_id = ? WHERE session_id = ?').bind(sess.id, tmp).run();
    const st = await pricingState(tier);
    return { status: 200, body: { ok: true, url: sess.url, session: sess.id, plan, tier, tranche, amount_cents: amount, left: st.left, locked: !!(tranche && tranche < 4) } };
  }
  /* ----- LC36: Gift a friend. One year of Pro, paid once, for another email address. No renewal. The recipient signs in with that address. ----- */
  const giftCents = () => num(E.GIFT_PRO_YEAR_CENTS, P34().base);
  async function gift(body, ip) {
    if (limited(ip)) return { status: 429, body: { ok: false, reason: 'slow_down' } };
    const to = clean(body.to, 130).toLowerCase(), from = clean(body.email, 130).toLowerCase();
    if (!EMAIL34.test(to)) return { status: 400, body: { ok: false, reason: 'bad_recipient' } };
    if (from && !EMAIL34.test(from)) return { status: 400, body: { ok: false, reason: 'bad_email' } };
    const amount = giftCents(), urls = returnUrls(body.ret), tax = String(E.STRIPE_TAX || '') === 'inclusive', meta = { lc: 'gift', to, plan: 'yearly' };
    const form = { mode: 'payment', customer_email: from || undefined, metadata: meta, payment_intent_data: { metadata: meta }, success_url: urls.ok, cancel_url: urls.no,
      automatic_tax: tax ? { enabled: true } : undefined,
      line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: amount, tax_behavior: tax ? 'inclusive' : undefined,
        product_data: { name: 'Gift: Lanckriet Chess Pro, 1 year', description: 'One year of Pro for ' + to + '. They sign in with this email address to switch it on. It does not renew.' } } }] };
    const sess = await stripe('POST', 'checkout/sessions', form);
    return { status: 200, body: { ok: true, url: sess.url, session: sess.id, amount_cents: amount } };
  }
  async function giftPaid(o) {
    const m = o.metadata || {}, to = clean(m.to, 130).toLowerCase();
    if (!EMAIL34.test(to)) { console.error('LC36: gift without a valid recipient ' + o.id); return; }
    const have = await DB.prepare("SELECT 1 AS ok FROM public.licenses WHERE flags->>'session' = ?").bind(o.id).first();
    if (have) return;   /* Stripe sent the event twice: one gift, one licence */
    const until = now() + 365 * 864e5, from = clean((o.customer_details && o.customer_details.email) || o.customer_email, 130).toLowerCase();
    const flags = { source: 'gift', plan: 'yearly', session: o.id, from };
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
    const sess = await stripe('POST', 'checkout/sessions', form);
    return { status: 200, body: { ok: true, url: sess.url, session: sess.id, amount_cents: pack.cents, tokens: pack.tokens } };
  }
  async function tokensPaid(o) {
    const m = o.metadata || {}, pack = Object.prototype.hasOwnProperty.call(PACKS, m.pack) ? PACKS[m.pack] : null;
    const email = clean(m.email || (o.customer_details && o.customer_details.email) || o.customer_email, 130).toLowerCase();
    if (!pack || !EMAIL34.test(email)) { console.error('LC36: token pack without a valid pack or email ' + o.id); return; }
    await DB.prepare('INSERT INTO public.lc36_token_credits (email, tokens, pack, amount_cents, session_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT (session_id) DO NOTHING').bind(email, pack.tokens, m.pack, pack.cents, o.id).run();   /* the pack size comes from the table above, not from the metadata */
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
  const licenseUntil = (sale, periodEndMs) => (periodEndMs || (now() + (sale.plan === 'yearly' ? 365 : 30) * 864e5)) + P34().graceMs;
  async function proPaid(o) {
    const sale = await DB.prepare('SELECT * FROM arena.lc34_pro_sales WHERE session_id = ?').bind(o.id).first();
    if (!sale) { console.error('LC34: paid session without a sale row ' + o.id); return; }
    const email = clean((o.customer_details && o.customer_details.email) || o.customer_email || sale.email, 130).toLowerCase();
    try { await DB.prepare("UPDATE arena.lc34_pro_sales SET status = 'paid', paid_at = ?, email = ?, subscription_id = ?, customer_id = ? WHERE session_id = ?").bind(now(), email, o.subscription || null, o.customer || null, o.id).run(); }
    catch (e) {   /* the hold had expired and somebody else took the slot: the buyer paid the tranche price, so the price is honoured and the slot is dropped */
      if (e && (e.code === '23505' || /duplicate key/i.test(String(e.message)))) await DB.prepare("UPDATE arena.lc34_pro_sales SET status = 'paid', slot = NULL, paid_at = ?, email = ?, subscription_id = ?, customer_id = ? WHERE session_id = ?").bind(now(), email, o.subscription || null, o.customer || null, o.id).run();
      else throw e;
    }
    if (sale.license_key) return;
    const until = licenseUntil(sale), flags = { source: 'stripe', plan: sale.plan, vip: sale.tier === 3, tranche: sale.tranche || 0, founding: sale.tranche === 1, early: sale.tranche === 1 || sale.tranche === 2, locked_cents: sale.amount_cents, session: o.id };
    const lic = await DB.prepare('SELECT license_key FROM public._lc_create_license(?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?)')
      .bind(email, 'stripe', (sale.tier === 3 ? 'VIP ' : 'Pro ') + sale.plan, 2, false, new Date(until).toISOString(), P34().dailyTokens, flags, 3).first();   /* an object, not a string: the driver encodes jsonb itself */
    if (!lic || !lic.license_key) throw new Error('licence not created');   /* throwing makes Stripe retry the webhook; nothing is lost */
    await DB.prepare('UPDATE arena.lc34_pro_sales SET license_key = ?, license_expires = ? WHERE session_id = ?').bind(lic.license_key, until, o.id).run();
  }
  async function proEvent(ev, o) {
    const m = o.metadata || {};
    if (ev.type === 'checkout.session.completed' && m.lc === 'tokens') { if (o.mode === 'payment' && o.payment_status === 'paid') await tokensPaid(o); return true; }
    if (ev.type === 'checkout.session.completed' && m.lc === 'gift') { if (o.mode === 'payment' && o.payment_status === 'paid') await giftPaid(o); return true; }
    if (ev.type === 'checkout.session.completed' && m.lc === 'pro') { if (o.mode === 'subscription' && o.payment_status === 'paid') await proPaid(o); return true; }
    if (ev.type === 'checkout.session.expired' && m.lc === 'pro') { await DB.prepare("UPDATE arena.lc34_pro_sales SET status = 'expired' WHERE session_id = ? AND status = 'open'").bind(o.id).run(); return true; }
    if (ev.type === 'invoice.paid') {
      const subId = o.subscription || (o.parent && o.parent.subscription_details && o.parent.subscription_details.subscription) || '';
      const sale = subId && await DB.prepare("SELECT * FROM arena.lc34_pro_sales WHERE subscription_id = ? AND status = 'paid'").bind(subId).first();
      if (!sale) return false;
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
      if (raw.length > 20000) return json({ ok: false, reason: 'too_large' }, 413, h);
      let r;
      if (path === 'webhook') r = await webhook(raw, req.headers.get('stripe-signature'));
      else { let body; try { body = JSON.parse(raw || '{}'); } catch (e) { return json({ ok: false, reason: 'bad_json' }, 400, h); }
        if (path === 'checkout') r = await checkout(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'subscribe') r = await subscribe(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'tokens') r = await tokensBuy(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'gift') r = await gift(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'pricing') r = readLimited((req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim()) ? { status: 429, body: { ok: false, reason: 'slow_down' } } : { status: 200, body: Object.assign(await pricingState(2), { vip: await pricingState(3), packs: Object.keys(PACKS).map((k) => ({ id: k, cents: PACKS[k].cents, tokens: PACKS[k].tokens })), portal: /^https:\/\/[^\s]{4,300}$/.test(String(E.BILLING_PORTAL_URL || '')) ? String(E.BILLING_PORTAL_URL) : '' }) };
        else if (path === 'claim') r = await claim(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'entitlement') r = await entitlement(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());
        else if (path === 'admin') r = await admin(body); else return json({ ok: false, reason: 'unknown_route' }, 404, h); }
      return json(r.body, r.status, h);
    } catch (e) { if (!e.status) console.error('stripe function: ' + (e && e.stack || e)); return json({ ok: false, reason: e.message === 'not_configured' ? 'not_configured' : 'server' }, e.status || 500, h); }
  };
}
