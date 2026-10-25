"""LC34: stripe.js gets Pro subscription sales (yearly Founding / Early Adopter / Standard tranches, monthly at full price).
   python3 patch_stripe_v34.py <in stripe.js> <out stripe.js>      every anchor must match exactly once.
   New routes (POST, JSON): pricing, subscribe, claim, entitlement. New webhook events handled: checkout.session.completed (mode subscription,
   metadata.lc = pro), checkout.session.expired, invoice.paid (renewals), charge.refunded (customers of a Pro sale). Creator-support events are untouched."""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def once(a, b, label):
    global s
    c = s.count(a)
    if c != 1: sys.exit(f"PATCH FAILED [{label}]: anchor found {c}x")
    s = s.replace(a, b); print("ok", label)

BLOCK = r'''
  /* ======================= LC34: Pro subscriptions ======================= */
  const hits2 = new Map();
  const readLimited = (ip) => { const t = now(), a = (hits2.get(ip) || []).filter((x) => t - x < 6e4); a.push(t); hits2.set(ip, a); if (hits2.size > 5000) hits2.clear(); return a.length > 60; };
  const P34 = () => ({
    base: num(E.PRO_YEARLY_BASE_CENTS, 40000), monthly: num(E.PRO_MONTHLY_CENTS, 3900),
    caps: [num(E.TRANCHE1_CAP, 100), num(E.TRANCHE2_CAP, 100)], prices: [num(E.TRANCHE1_CENTS, 20000), num(E.TRANCHE2_CENTS, 30000)],
    holdMs: Math.max(31, num(E.HOLD_MINUTES, 35)) * 6e4, graceMs: num(E.LICENSE_GRACE_DAYS, 2) * 864e5, dailyTokens: num(E.PRO_DAILY_TOKENS, 10)
  });
  const KEY34 = /^LC-[A-Za-z0-9_-]{2,200}$/i, SESSION34 = /^cs_[A-Za-z0-9_]{8,200}$/, EMAIL34 = /^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,24}$/;
  const rnd = () => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(9)), (b) => b.toString(16).padStart(2, '0')).join('');
  async function expireOpen() { await DB.prepare("UPDATE arena.lc34_pro_sales SET status = 'expired' WHERE status = 'open' AND expires < ?").bind(now()).run(); }
  async function pricingState() {
    await expireOpen();
    const p = P34(), rows = (await DB.prepare("SELECT tranche, status, COUNT(*) AS n FROM arena.lc34_pro_sales WHERE plan = 'yearly' AND tranche IN (1, 2) AND status IN ('open', 'paid') GROUP BY tranche, status").all()).results;
    const taken = [0, 0], paid = [0, 0];
    rows.forEach((r) => { taken[r.tranche - 1] += +r.n; if (r.status === 'paid') paid[r.tranche - 1] += +r.n; });
    const left = [Math.max(0, p.caps[0] - taken[0]), Math.max(0, p.caps[1] - taken[1])], tranche = left[0] > 0 ? 1 : left[1] > 0 ? 2 : 3;
    return { ok: true, tranche, left, sold: paid, caps: p.caps, yearly: [p.prices[0], p.prices[1], p.base], base: p.base, monthly: p.monthly, discountPct: [50, 25, 0].map((x, i) => i < 2 ? Math.round((1 - p.prices[i] / p.base) * 100) : 0) };
  }
  async function takeSlot(tranche, cap, row) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const have = new Set((await DB.prepare("SELECT slot FROM arena.lc34_pro_sales WHERE tranche = ? AND status IN ('open', 'paid') AND slot IS NOT NULL").bind(tranche).all()).results.map((r) => r.slot));
      let slot = 0; for (let i = 1; i <= cap; i++) if (!have.has(i)) { slot = i; break; }
      if (!slot) return 0;
      try { await insertSale(Object.assign({}, row, { tranche, slot })); return slot; }
      catch (e) { if (e && (e.code === '23505' || /duplicate key/i.test(String(e.message)))) continue; throw e; }
    }
    return 0;
  }
  const insertSale = (r) => DB.prepare('INSERT INTO arena.lc34_pro_sales (session_id, email, plan, tranche, slot, amount_cents, status, device, created, expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(r.id, r.email || '', r.plan, r.tranche || null, r.slot || null, r.amount, 'open', r.device || '', r.created, r.expires).run();
  async function subscribe(body, ip) {
    if (limited(ip)) return { status: 429, body: { ok: false, reason: 'slow_down' } };
    const plan = body.plan === 'monthly' ? 'monthly' : body.plan === 'yearly' ? 'yearly' : '';
    if (!plan) return { status: 400, body: { ok: false, reason: 'bad_plan' } };
    const email = clean(body.email, 130).toLowerCase();
    if (email && !EMAIL34.test(email)) return { status: 400, body: { ok: false, reason: 'bad_email' } };
    await expireOpen();
    const p = P34(), t0 = now(), tmp = 'tmp_' + rnd(), row = { id: tmp, email, plan, device: clean(body.device, 64), created: t0, expires: t0 + p.holdMs };
    let tranche = null, slot = null, amount = p.monthly;
    if (plan === 'yearly') {
      for (const t of [1, 2]) { const s = await takeSlot(t, p.caps[t - 1], Object.assign({ amount: p.prices[t - 1] }, row)); if (s) { tranche = t; slot = s; amount = p.prices[t - 1]; break; } }
      if (!tranche) { tranche = 3; amount = p.base; await insertSale(Object.assign({ tranche: 3, amount }, row)); }
    } else await insertSale(Object.assign({ amount }, row));
    const base = String(E.APP_URL), meta = { lc: 'pro', plan, tranche: tranche || '', slot: slot || '', locked_cents: amount };
    const tax = String(E.STRIPE_TAX || '') === 'inclusive';
    const names = { 1: 'Founding Member rate', 2: 'Early Adopter rate', 3: 'Standard rate' };
    const form = { mode: 'subscription', customer_email: email || undefined, client_reference_id: row.device || undefined, metadata: meta,
      success_url: base + '#upgrades?paid={CHECKOUT_SESSION_ID}', cancel_url: base + '#upgrades?paid=cancel', expires_at: Math.floor((t0 + p.holdMs) / 1000),
      automatic_tax: tax ? { enabled: true } : undefined, subscription_data: { metadata: meta },
      line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: amount, tax_behavior: tax ? 'inclusive' : undefined, recurring: { interval: plan === 'yearly' ? 'year' : 'month' },
        product_data: { name: 'Lanckriet Chess Pro, ' + (plan === 'yearly' ? 'yearly' : 'monthly') + (tranche ? ' (' + names[tranche] + ')' : ''), description: tranche && tranche < 3 ? 'Your ' + names[tranche] + ' stays the same for as long as your subscription stays active.' : undefined } } }] };
    let sess;
    try { sess = await stripe('POST', 'checkout/sessions', form); }
    catch (e) { await DB.prepare('DELETE FROM arena.lc34_pro_sales WHERE session_id = ?').bind(tmp).run(); throw e; }
    await DB.prepare('UPDATE arena.lc34_pro_sales SET session_id = ? WHERE session_id = ?').bind(sess.id, tmp).run();
    const st = await pricingState();
    return { status: 200, body: { ok: true, url: sess.url, session: sess.id, plan, tranche, amount_cents: amount, left: st.left, locked: !!(tranche && tranche < 3) } };
  }
  const saleView = (r) => ({ plan: r.plan, tranche: r.tranche, founding: r.tranche === 1, early: r.tranche === 1 || r.tranche === 2, locked_cents: r.amount_cents });
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
    const until = licenseUntil(sale), flags = { source: 'stripe', plan: sale.plan, tranche: sale.tranche || 0, founding: sale.tranche === 1, early: sale.tranche === 1 || sale.tranche === 2, locked_cents: sale.amount_cents, session: o.id };
    const lic = await DB.prepare('SELECT license_key FROM public._lc_create_license(?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?)')
      .bind(email, 'stripe', 'Pro ' + sale.plan, 2, false, new Date(until).toISOString(), P34().dailyTokens, flags, 3).first();   /* an object, not a string: the driver encodes jsonb itself */
    if (!lic || !lic.license_key) throw new Error('licence not created');   /* throwing makes Stripe retry the webhook; nothing is lost */
    await DB.prepare('UPDATE arena.lc34_pro_sales SET license_key = ?, license_expires = ? WHERE session_id = ?').bind(lic.license_key, until, o.id).run();
  }
  async function proEvent(ev, o) {
    const m = o.metadata || {};
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
'''
once("  async function admin(body) {", BLOCK + "  async function admin(body) {", "pro subscription block")
once("  async function handle(ev) {\n    const o = ev.data && ev.data.object || {};", "  async function handle(ev) {\n    const o = ev.data && ev.data.object || {};\n    if (await proEvent(ev, o)) return;", "webhook hook")
once("else if (path === 'admin') r = await admin(body); else return json(",
     "else if (path === 'subscribe') r = await subscribe(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());\n        else if (path === 'pricing') r = readLimited((req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim()) ? { status: 429, body: { ok: false, reason: 'slow_down' } } : { status: 200, body: await pricingState() };\n        else if (path === 'claim') r = await claim(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());\n        else if (path === 'entitlement') r = await entitlement(body, (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim());\n        else if (path === 'admin') r = await admin(body); else return json(", "routes")
open(dst, 'w', encoding='utf-8').write(s)
