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
  const E = Object.assign({ APP_URL: DEFAULT_ORIGIN + '/', ALLOWED_ORIGINS: DEFAULT_ORIGIN, STRIPE_COUNTRY: 'BE', STRIPE_API_BASE: 'https://api.stripe.com' }, env);
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
        else if (path === 'admin') r = await admin(body); else return json({ ok: false, reason: 'unknown_route' }, 404, h); }
      return json(r.body, r.status, h);
    } catch (e) { if (!e.status) console.error('stripe function: ' + (e && e.stack || e)); return json({ ok: false, reason: e.message === 'not_configured' ? 'not_configured' : 'server' }, e.status || 500, h); }
  };
}
