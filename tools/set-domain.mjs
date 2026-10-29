#!/usr/bin/env node
/* Lanckriet Chess: change the web address everywhere it is written (one command).
     node set-domain.mjs https://www.yourdomain.com [folder]
   The folder is the deploy folder (default: the folder above this one). It rewrites the current address in:
     index.html (landing: canonical, og:url, og:image), app.html (canonical, og:url, site.production, share base, sample link),
     functions/stripe/stripe.js (DEFAULT_ORIGIN: the default for APP_URL, SUPPORT_URL and ALLOWED_ORIGINS).
   It prints the two things it cannot do for you: the database setting and the Supabase Auth setting. Nothing is written outside the folder. */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const OLD = 'https://lanckrietchess-app.vercel.app';
const next = String(process.argv[2] || '').replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+$/i.test(next)) { console.error('Usage: node set-domain.mjs https://yourdomain.com [folder]   (https, no path)'); process.exit(1); }
const root = path.resolve(process.argv[3] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const files = ['index.html', 'app.html', 'functions/stripe/stripe.js', 'functions/arena/arena.js'];
let total = 0;
for (const f of files) {
  const p = path.join(root, f); if (!fs.existsSync(p)) { console.log(`  skipped ${f} (not in ${root})`); continue; }
  const s = fs.readFileSync(p, 'utf8'), n = s.split(OLD).length - 1; if (!n) { console.log(`  ${f}: nothing to change`); continue; }
  fs.writeFileSync(p, s.split(OLD).join(next)); total += n; console.log(`  ${f}: ${n} change${n === 1 ? '' : 's'}`);
}
console.log(`\n${total} address${total === 1 ? '' : 'es'} changed to ${next}\n`);
console.log('Two things to do yourself:');
console.log(`  1. Supabase SQL editor:  update public.lc7_cfg set v = to_jsonb('${next}/'::text) where k = 'app_url';   (the base of the referral links)`);
console.log(`  2. Supabase Auth > URL Configuration: Site URL = ${next}/app.html and add ${next}/app.html to the redirect URLs.`);
console.log(`  3. Stripe function secrets: APP_URL=${next}/app.html  SUPPORT_URL=${next}/  ALLOWED_ORIGINS=${next}   (stripe-setup.mjs prints them)`);
