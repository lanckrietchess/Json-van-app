#!/usr/bin/env node
/* Writes assets/images/coach/manifest.json from the folders, so the app needs ONE request instead of probing numbers.
   Run by hand (node scripts/build-coach-manifest.mjs) or automatically by .github/workflows/coach-manifest.yml on every push.
   The app also works WITHOUT the manifest: it then probes happy_1.png, happy_2.png, ... itself. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'assets', 'images', 'coach');
const CATS = ['neutral', 'thinking', 'serious', 'happy', 'skeptical', 'tough_love'];
const RE = /^([a-z_]+)_(\d{1,3})\.(png|jpe?g|webp)$/i;

const categories = {};
let total = 0;
for (const cat of CATS) {
  const d = path.join(DIR, cat);
  const files = fs.existsSync(d) ? fs.readdirSync(d) : [];
  const ok = files.filter((n) => { const m = RE.exec(n); return m && m[1] === cat; })
    .sort((a, b) => Number(RE.exec(a)[2]) - Number(RE.exec(b)[2]));
  files.filter((n) => !ok.includes(n) && !n.startsWith('.') && !/^readme/i.test(n))
    .forEach((n) => console.warn(`  ignored ${cat}/${n}: the name must look like ${cat}_1.png (lowercase, underscore, number)`));
  categories[cat] = ok; total += ok.length;
  console.log(`${cat.padEnd(10)} ${ok.length} photo(s)`);
}
if (!categories.neutral.includes('neutral_1.png')) console.warn('WARNING: neutral/neutral_1.png is missing. It is the fallback for every other emotion.');
fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify({ generated: new Date().toISOString(), categories }, null, 2) + '\n', 'utf8');
console.log(`manifest.json written (${total} photos).`);
