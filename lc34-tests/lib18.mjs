import postgres from '/home/claude/arena/node_modules/postgres/src/index.js';
import http from 'node:http';
import { createHmac } from 'node:crypto';
import { makeHandler } from '/home/claude/arena/out/handler.js';
import { makeStripeHandler } from '/home/claude/arena/out/stripe/stripe.js';
import { PG_TYPES } from '/home/claude/arena/out/db.js';
export const ORIGIN = 'https://lanckrietchess-app.vercel.app';
export const sql = postgres({ host: '127.0.0.1', username: 'postgres', database: 'lc26a', max: 8, types: PG_TYPES, onnotice: () => {} });
const SECRET = 'whsec_test_secret';
export async function prep() {
  await sql.unsafe(`create or replace function public._lc_create_license(p_email text, p_source text, p_kind text, p_tier integer, p_lifetime boolean, p_expires timestamptz, p_daily integer, p_flags jsonb, p_devices integer) returns public.licenses language plpgsql as $f$
    declare l public.licenses; begin insert into public.licenses (license_key,email,source,kind,tier,lifetime,expires_at,daily_tokens,flags,devices_max) values ('LC-'||upper(substr(md5(random()::text||clock_timestamp()::text),1,16)),p_email,p_source,p_kind,p_tier,p_lifetime,p_expires,p_daily,p_flags,p_devices) returning * into l; return l; end $f$`);
  /* a stand-in for the production lc_license_status(p_key, p_device): same answer shape the hub reads */
  await sql.unsafe(`create or replace function public.lc_license_status(p_key text, p_device text) returns jsonb language plpgsql as $f$
    declare l public.licenses; begin select * into l from public.licenses where upper(license_key)=upper(p_key) limit 1;
      if not found then return jsonb_build_object('ok',false,'error','invalid'); end if;
      if coalesce(l.revoked,false) then return jsonb_build_object('ok',false,'error','revoked'); end if;
      if l.expires_at is not null and l.expires_at < now() then return jsonb_build_object('ok',false,'error','subscription_expired'); end if;
      return jsonb_build_object('ok',true,'tier',l.tier,'expires_at',l.expires_at,'lifetime',coalesce(l.lifetime,false),'daily_tokens',l.daily_tokens,'flags',l.flags); end $f$`);
  await sql.unsafe(`create or replace function public.lc_redeem_key(p_key text, p_device text) returns jsonb language plpgsql as $f$
    declare j jsonb; begin if not exists (select 1 from public.licenses where upper(license_key)=upper(p_key)) then return jsonb_build_object('ok',false,'error','key_not_found'); end if; return public.lc_license_status(p_key,p_device); end $f$`);
  await sql.unsafe('truncate arena.players, arena.quota, arena.token_ledger, arena.token_bonus, arena.token_spend, arena.lc34_pro_sales, arena.lc27_events cascade');
  await sql.unsafe("delete from public.licenses where source = 'stripe'");
}
export const seen = []; let n = 0;
const mock = http.createServer((req, res) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => { const form = Object.fromEntries(new URLSearchParams(b)); seen.push({ url: req.url, form }); res.setHeader('content-type', 'application/json');
  if (req.url === '/v1/checkout/sessions') { n++; return res.end(JSON.stringify({ id: 'cs_test_' + String(n).padStart(6, '0') + 'abcdefgh', url: 'https://checkout.stripe.test/pay/' + n })); }
  res.statusCode = 404; res.end('{}'); }); }).listen(8804);
export const closeMock = () => mock.close();
export const mkArena = (extra) => makeHandler(sql, Object.assign({ PID_SALT: 'salt-salt-salt-salt', ADMIN_TOKEN: 'admin-token-admin-token' }, extra || {}));
export const mkStripe = (extra) => makeStripeHandler(sql, Object.assign({ STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: SECRET, ADMIN_TOKEN: 'admin-token-admin-token', STRIPE_API_BASE: 'http://127.0.0.1:8804', APP_URL: ORIGIN + '/', ALLOWED_ORIGINS: ORIGIN }, extra || {}));
let evn = 0;
export async function payWebhook(stripe, session, o) {   // what Stripe sends once the card was charged
  const ev = { id: 'evt_t' + (++evn), type: 'checkout.session.completed', data: { object: Object.assign({ id: session, mode: 'subscription', payment_status: 'paid', customer: 'cus_' + evn, subscription: 'sub_' + evn, customer_details: { email: 'buyer@example.com' }, metadata: { lc: 'pro' } }, o || {}) } };
  const raw = JSON.stringify(ev), t = Math.floor(Date.now() / 1000), sig = `t=${t},v1=${createHmac('sha256', SECRET).update(t + '.' + raw).digest('hex')}`;
  const r = await stripe(new Request('https://fn.test/functions/v1/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': sig }, body: raw }));
  return r.json();
}
/* routes for the rig: the Arena, the Stripe function, the licence RPC, and a fake Stripe Checkout page */
export function routes(arena, stripe, log) {
  return async (req, full, u, CORS) => {
    const respond = async (r) => { const h = Object.fromEntries(r.headers); await req.respond({ status: r.status, headers: Object.assign({}, CORS, h), body: await r.text() }); return true; };
    if (/functions\/v1\/arena/.test(full)) { if (req.method() === 'OPTIONS') { await req.respond({ status: 204, headers: CORS }); return true; } const body = req.postData() || '{}'; try { log.push('arena:' + JSON.parse(body).action); } catch (e) {} return respond(await arena(new Request(full, { method: 'POST', headers: { Origin: ORIGIN, 'content-type': 'application/json' }, body }))); }
    if (/functions\/v1\/stripe\//.test(full)) { if (req.method() === 'OPTIONS') { await req.respond({ status: 204, headers: Object.assign({}, CORS, { 'access-control-allow-origin': ORIGIN }) }); return true; } const body = req.postData() || '{}'; log.push('stripe:' + u.pathname.split('/').pop() + ':' + body.slice(0, 120)); return respond(await stripe(new Request(full, { method: 'POST', headers: { Origin: ORIGIN, 'content-type': 'application/json', 'x-forwarded-for': '5.5.5.' + (Math.random() * 250 | 0) }, body }))); }
    if (/rpc\/lc_(license_status|redeem_key)/.test(full)) { if (req.method() === 'OPTIONS') { await req.respond({ status: 204, headers: CORS }); return true; } const b = JSON.parse(req.postData() || '{}'); const fn = /redeem_key/.test(full) ? 'lc_redeem_key' : 'lc_license_status'; const r = await sql.unsafe('select public.' + fn + '($1,$2) as j', [b.p_key || '', b.p_device || '']); log.push('rpc:' + fn); await req.respond({ status: 200, headers: Object.assign({}, CORS, { 'content-type': 'application/json' }), body: JSON.stringify(r[0].j) }); return true; }
    if (/checkout\.stripe\.test/.test(full)) { await req.respond({ status: 200, headers: { 'content-type': 'text/html' }, body: '<!doctype html><title>Stripe Checkout (test)</title><h1>Checkout</h1>' }); return true; }
    return undefined;
  };
}
