#!/usr/bin/env node
/* Generates the Coach Lanckriet help audio ONCE per text and saves it as a static file in the repo.
   The app then plays the file: no ElevenLabs call per visitor, no API key in the browser.

   Usage (from the repo root, with a .env next to this folder):
     node scripts/build-help-audio.mjs --dry            show what would be generated and how many characters it costs
     node scripts/build-help-audio.mjs                  generate every clip that is missing or whose text changed
     node scripts/build-help-audio.mjs --only think,trim
     node scripts/build-help-audio.mjs --budget 9000    stop after about 9000 characters (free ElevenLabs plans have a monthly limit); run again next month
     node scripts/build-help-audio.mjs --force          regenerate everything

   .env names it understands:  ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID (or VOICE_ID), ELEVENLABS_MODEL (optional),
                               CACHE_AUDIO_ENABLED (default true; false = do nothing)
   The key is read from the environment and is never printed or written anywhere. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HELP = path.join(ROOT, 'assets', 'help', 'help.json');
const OUT_DIR = path.join(ROOT, 'assets', 'audio', 'help');

/* tiny .env reader: KEY=value, # comments, optional quotes, spaces around the value are trimmed (a stray space after = is common) */
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 1) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv(path.join(ROOT, '.env'));

const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const opt = (n) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : ''; };
const DRY = flag('dry'), FORCE = flag('force');
const ONLY = new Set(String(opt('only') || '').split(',').map((s) => s.trim()).filter(Boolean));
const BUDGET = Number(opt('budget') || process.env.HELP_AUDIO_CHAR_BUDGET || 0) || Infinity;

const KEY = process.env.ELEVENLABS_API_KEY || '';
const VOICE = process.env.ELEVENLABS_VOICE_ID || process.env.VOICE_ID || '';
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const API = process.env.ELEVENLABS_API_BASE || 'https://api.elevenlabs.io';   /* only changed in tests */
const ENABLED = String(process.env.CACHE_AUDIO_ENABLED ?? 'true').toLowerCase() !== 'false';

const compose = (f) => ['what', 'how', 'why', 'ranks'].map((k) => String(f[k] || '').trim()).filter(Boolean).join(' ');
const textOf = (f) => (String(f.text_content || '').trim() || compose(f));
const hashOf = (text) => crypto.createHash('sha256').update(`${VOICE}|${MODEL}|${text}`).digest('hex').slice(0, 16);
const save = (doc) => fs.writeFileSync(HELP, JSON.stringify(doc, null, 2) + '\n', 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!fs.existsSync(HELP)) { console.error('Missing ' + path.relative(ROOT, HELP)); process.exit(1); }
const doc = JSON.parse(fs.readFileSync(HELP, 'utf8'));
if (!Array.isArray(doc.features)) { console.error('help.json has no "features" list.'); process.exit(1); }
if (!ENABLED) { console.log('CACHE_AUDIO_ENABLED is false: nothing generated. The app falls back to the live coach voice.'); process.exit(0); }
if (!DRY && (!KEY || !VOICE)) {
  console.error('Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID (or VOICE_ID) in .env. Run with --dry to preview without them.');
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

const todo = [];
for (const f of doc.features) {
  if (ONLY.size && !ONLY.has(f.feature_id)) continue;
  if (!/^[a-z0-9][a-z0-9._-]{0,40}$/i.test(String(f.feature_id || ''))) { console.warn('skip: bad feature_id', f.feature_id); continue; }
  const text = textOf(f), hash = hashOf(text), rel = `assets/audio/help/${f.feature_id}.mp3`;
  const fresh = f.audio_cached === true && f.text_hash === hash && fs.existsSync(path.join(ROOT, rel));
  if (fresh && !FORCE) continue;
  todo.push({ f, text, hash, rel });
}
const chars = todo.reduce((n, t) => n + t.text.length, 0);
console.log(`${todo.length} clip(s) to generate, ${chars} characters, voice ${VOICE || '(not set)'}, model ${MODEL}.`);
if (DRY) { todo.forEach((t) => console.log(`  ${t.f.feature_id.padEnd(14)} ${String(t.text.length).padStart(4)} chars`)); process.exit(0); }

let spent = 0, made = 0;
for (const t of todo) {
  if (spent + t.text.length > BUDGET) { console.log(`Budget of ${BUDGET} characters reached. Run the script again later to continue.`); break; }
  const res = await fetch(`${API}/v1/text-to-speech/${encodeURIComponent(VOICE)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: t.text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  }).catch((e) => ({ ok: false, status: 0, text: async () => String(e && e.message || e) }));
  if (!res.ok) {
    const body = String(await res.text()).slice(0, 300);
    console.error(`FAILED ${t.f.feature_id}: HTTP ${res.status} ${body}`);
    if ([401, 402, 403, 429].includes(res.status)) {
      console.error('Stopping: this is a key, plan or quota problem, not a text problem. A 402 usually means the voice needs a paid plan.');
      break;
    }
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) { console.error(`FAILED ${t.f.feature_id}: audio too small (${buf.length} bytes)`); continue; }
  fs.writeFileSync(path.join(ROOT, t.rel), buf);
  Object.assign(t.f, { voice_id: VOICE, audio_cached: true, audio_url: t.rel, text_hash: t.hash });
  save(doc);                                   /* after every clip, so a stopped run keeps its progress */
  spent += t.text.length; made++;
  console.log(`ok ${t.f.feature_id}  ${(buf.length / 1024).toFixed(0)} KB`);
  await sleep(400);
}
console.log(`Done: ${made} generated, ${spent} characters used. Commit assets/audio/help/ and assets/help/help.json to GitHub.`);
