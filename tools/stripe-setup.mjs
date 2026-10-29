#!/usr/bin/env node
/* Lanckriet Chess: one-time Stripe setup.  Node 18 or newer, no packages.

   WHAT IT DOES (and nothing else)
     1. checks your secret key,
     2. creates the webhook endpoint that tells the app about payments (checkout.session.completed, checkout.session.expired, invoice.paid, charge.refunded),
     3. creates the customer portal (members cancel or update their card there) with its public LOGIN PAGE,
     4. prints the exact settings to paste into your Supabase Edge Function secrets.
   It does NOT create products or prices: the app creates each price at checkout (that is how the Founding / Early Adopter / 10% ladder locks a member's price).

   USAGE
     STRIPE_SECRET_KEY=sk_live_xxx node stripe-setup.mjs --domain https://YOURDOMAIN --project-ref YOURPROJECTREF
     add --dry-run to see what would be created without creating anything.
     add --webhook-url https://.../functions/v1/stripe/webhook to use another endpoint address.
   Run it once with a TEST key (sk_test_...) first, then once with the LIVE key. The two modes are separate in Stripe: each gives its own webhook secret and portal login page.
   If a webhook endpoint with the same address already exists the script does not create a second one (Stripe shows the signing secret only once, at creation): get the secret
   from the Stripe dashboard (Developers > Webhooks > the endpoint > Reveal) or delete that endpoint and run again. */
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : ''; };
const flag = (k) => argv.includes('--' + k);
const KEY = String(process.env.STRIPE_SECRET_KEY || '').trim();
const BASE = String(process.env.STRIPE_API_BASE || 'https://api.stripe.com').replace(/\/+$/, '');   // STRIPE_API_BASE only exists for the tests
const DRY = flag('dry-run');
const die = (m) => { console.error('\nERROR: ' + m + '\n'); process.exit(1); };
if (!/^sk_(test|live)_[A-Za-z0-9]{10,}$/.test(KEY)) die('Set STRIPE_SECRET_KEY to your secret key (sk_test_... or sk_live_...). Never use a publishable key (pk_...).');
const domain = String(arg('domain') || '').replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+$/i.test(domain)) die('Give your site with --domain https://yourdomain (https, no path).');
const ref = String(arg('project-ref') || '').trim();
const webhookUrl = arg('webhook-url') || (ref ? `https://${ref}.supabase.co/functions/v1/stripe/webhook` : '');
if (!/^https:\/\/[^\s]+$/.test(webhookUrl)) die('Give --project-ref YOUR_SUPABASE_PROJECT_REF (the part before .supabase.co) or a full --webhook-url.');
const live = KEY.startsWith('sk_live_');

const enc = (o, p = '', out = []) => { Object.keys(o).forEach((k) => { const v = o[k], key = p ? `${p}[${k}]` : k; if (v === undefined || v === null) return; if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'object' ? enc(x, `${key}[${i}]`, out) : out.push([`${key}[${i}]`, String(x)]))); else if (typeof v === 'object') enc(v, key, out); else out.push([key, String(v)]); }); return out; };
async function stripe(method, path, body) {
  const r = await fetch(BASE + '/v1/' + path, { method, headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/x-www-form-urlencoded' }, body: body ? new URLSearchParams(enc(body)).toString() : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || ('Stripe answered ' + r.status));
  return j;
}
const EVENTS = ['checkout.session.completed', 'checkout.session.expired', 'invoice.paid', 'charge.refunded'];
(async () => {
  console.log(`\nStripe setup in ${live ? 'LIVE' : 'TEST'} mode${DRY ? ' (dry run: nothing is created)' : ''}`);
  let acct; try { acct = await stripe('GET', 'account'); } catch (e) { die('The key was refused: ' + e.message); }
  console.log(`  account: ${acct.business_profile && acct.business_profile.name || acct.settings && acct.settings.dashboard && acct.settings.dashboard.display_name || acct.id}  (charges enabled: ${acct.charges_enabled ? 'yes' : 'NO: finish your Stripe account details first'})`);

  /* 1. webhook */
  let secret = '', hookNote = '';
  const have = (await stripe('GET', 'webhook_endpoints?limit=100')).data.filter((w) => w.url === webhookUrl);
  if (have.length) hookNote = `a webhook endpoint for ${webhookUrl} already exists (${have[0].id}). Not creating another. Reveal its signing secret in the dashboard (Developers > Webhooks).`;
  else if (DRY) hookNote = `would create the webhook endpoint ${webhookUrl} for: ${EVENTS.join(', ')}`;
  else { const w = await stripe('POST', 'webhook_endpoints', { url: webhookUrl, enabled_events: EVENTS, description: 'Lanckriet Chess: purchases, renewals and refunds' }); secret = w.secret; hookNote = `created ${w.id}`; }
  console.log('  webhook: ' + hookNote);

  /* 2. customer portal with login page */
  let portalUrl = '', portalNote = '';
  if (DRY) portalNote = 'would create the customer portal (cancel at period end, card update, invoice history) with its login page';
  else {
    const c = await stripe('POST', 'billing_portal/configurations', {
      business_profile: { headline: 'Lanckriet Chess: manage your membership', privacy_policy_url: domain + '/delete-account.html' },
      features: { subscription_cancel: { enabled: true, mode: 'at_period_end', cancellation_reason: { enabled: true, options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'] } },
                  payment_method_update: { enabled: true }, invoice_history: { enabled: true }, customer_update: { enabled: true, allowed_updates: ['email', 'name'] } },
      login_page: { enabled: true }, default_return_url: domain + '/app.html'
    });
    portalUrl = (c.login_page && c.login_page.url) || ''; portalNote = `created ${c.id}`;
  }
  console.log('  portal: ' + portalNote);

  /* 3. what to paste */
  console.log('\n=== Paste these into Supabase: Edge Functions > stripe > Secrets ===');
  console.log(`STRIPE_SECRET_KEY        ${KEY.slice(0, 8)}...   (your key: set it as is)`);
  console.log(`STRIPE_WEBHOOK_SECRET    ${secret || '(reveal it in the Stripe dashboard: Developers > Webhooks > your endpoint)'}`);
  console.log(`APP_URL                  ${domain}/app.html`);
  console.log(`SUPPORT_URL              ${domain}/`);
  console.log(`ALLOWED_ORIGINS          ${domain}`);
  console.log(`BILLING_PORTAL_URL       ${portalUrl || '(printed when the script runs without --dry-run)'}`);
  console.log('\nOptional, only if you want other numbers than the defaults (Pro 39/month, 399/year; VIP 59/month, 599/year; ladder 50% / 25% / 10% for 100 + 100 + 100):');
  console.log('PRO_YEARLY_BASE_CENTS, PRO_MONTHLY_CENTS, VIP_YEARLY_BASE_CENTS, VIP_MONTHLY_CENTS, TRANCHE1_CAP, TRANCHE2_CAP, TRANCHE3_CAP, GIFT_PRO_YEAR_CENTS');
  console.log('\nSupabase CLI form (if you use it):');
  console.log(`supabase secrets set --project-ref ${ref || 'YOURPROJECTREF'} APP_URL=${domain}/app.html SUPPORT_URL=${domain}/ ALLOWED_ORIGINS=${domain}${portalUrl ? ' BILLING_PORTAL_URL=' + portalUrl : ''}${secret ? ' STRIPE_WEBHOOK_SECRET=' + secret : ''}`);
  console.log('\nStill to do by hand in Stripe (it cannot be done by a script): turn on Stripe Tax if you need it (Settings > Tax), then set the secret STRIPE_TAX=inclusive.');
  console.log('Done.\n');
})().catch((e) => die(e.message));
