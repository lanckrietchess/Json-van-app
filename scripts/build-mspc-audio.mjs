#!/usr/bin/env node
/* Coach Lanckriet's voice for the MSPC System page (#learn-mspc, LC96).
   Reads the PUBLISHED texts (lc89_cfg 'mspc', public read through lc89_cfg_public) and makes ONE mp3 per text with ElevenLabs,
   with the same voice and model as the ? help clips. The page plays /assets/audio/mspc/<slot>.mp3 only while
   assets/audio/mspc/index.json says that clip was made from the text that is live now (FNV-1a, the same as LC96._t.fnv),
   so an edited text never plays an old recording.

   Usage (repo root):
     node scripts/build-mspc-audio.mjs --dry      what would be generated and how many characters it costs
     node scripts/build-mspc-audio.mjs            generate every clip that is missing or whose text changed
     node scripts/build-mspc-audio.mjs --budget 9000
   Needs ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID (or VOICE_ID) in the environment or a .env next to scripts/ (never printed).
   The Supabase address and the PUBLIC anon key are read from app.html (CONFIG...supabase), or SUPABASE_URL / SUPABASE_ANON_KEY. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'assets', 'audio', 'mspc');
const INDEX = path.join(OUT_DIR, 'index.json');
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('='); if (i < 1) continue;
    const k = line.slice(0, i).trim(); let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv(path.join(ROOT, '.env'));
const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const opt = (n) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : ''; };
const DRY = flag('dry'), FORCE = flag('force');
const BUDGET = Number(opt('budget') || 0) || Infinity;
const KEY = process.env.ELEVENLABS_API_KEY || '';
const VOICE = process.env.ELEVENLABS_VOICE_ID || process.env.VOICE_ID || '';
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const API = process.env.ELEVENLABS_API_BASE || 'https://api.elevenlabs.io';

/* FNV-1a, exactly LC96._t.fnv */
export function fnv(s) { let h = 2166136261; s = String(s || ''); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }
/* every slot of the page that has a text: intro, step-M..C, use, you, ex-<id>-intro|M|S|P|C|move */
export function slotsOf(v) {
  const out = []; v = v && typeof v === 'object' ? v : {};
  const add = (key, s) => { const t = String((s && s.t) || '').trim(); if (t && /^[a-z0-9_-]{2,60}$/i.test(key)) out.push({ key, text: t }); };
  add('intro', v.intro); ['M', 'S', 'P', 'C'].forEach((k) => add('step-' + k, v.steps && v.steps[k])); add('use', v.use); add('you', v.you);
  (Array.isArray(v.examples) ? v.examples : []).forEach((e) => { const id = String((e && e.id) || '').replace(/[^A-Za-z0-9_-]/g, ''); if (!id) return; ['intro', 'M', 'S', 'P', 'C', 'move'].forEach((k) => add('ex-' + id + '-' + k, e[k])); });
  return out;
}
function supabase() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY };
  const html = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
  const m = html.match(/supabase:\{url:"(https:\/\/[a-z0-9]+\.supabase\.co)",anonKey:"([A-Za-z0-9._-]+)"/);
  if (!m) throw new Error('No Supabase address in app.html: set SUPABASE_URL and SUPABASE_ANON_KEY.');
  return { url: m[1], key: m[2] };
}
async function main() {
  const sb = supabase();
  const r = await fetch(sb.url + '/rest/v1/rpc/lc89_cfg_public', { method: 'POST', headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.key, 'content-type': 'application/json' }, body: JSON.stringify({ p_k: 'mspc' }) });
  if (!r.ok) { console.error('Could not read the published MSPC page: HTTP ' + r.status); process.exit(1); }
  const d = await r.json(); const slots = slotsOf(d && d.v);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const index = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, 'utf8')) : {};
  const todo = slots.filter((s) => FORCE || !index[s.key] || index[s.key].h !== fnv(s.text) || !fs.existsSync(path.join(OUT_DIR, index[s.key].file)));
  const chars = todo.reduce((n, t) => n + t.text.length, 0);
  console.log(`${slots.length} text(s) on the page, ${todo.length} clip(s) to generate, ${chars} characters, voice ${VOICE || '(not set)'}, model ${MODEL}.`);
  if (DRY) { todo.forEach((t) => console.log('  ' + t.key.padEnd(30) + String(t.text.length).padStart(5) + ' chars')); return; }
  if (!KEY || !VOICE) { console.error('Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID. Run with --dry to preview.'); process.exit(1); }
  let used = 0;
  for (const t of todo) {
    if (used + t.text.length > BUDGET) { console.log('Budget reached: run again later for the rest.'); break; }
    const res = await fetch(`${API}/v1/text-to-speech/${encodeURIComponent(VOICE)}?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text: t.text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }) });
    if (!res.ok) { console.error(`${t.key}: ElevenLabs answered HTTP ${res.status}. Stopping.`); break; }
    const file = t.key + '.mp3';
    fs.writeFileSync(path.join(OUT_DIR, file), Buffer.from(await res.arrayBuffer()));
    index[t.key] = { h: fnv(t.text), file }; used += t.text.length;
    fs.writeFileSync(INDEX, JSON.stringify(index, null, 1) + '\n');
    console.log('  made ' + file);
  }
  /* clips of texts that are no longer on the page drop out of the index (the files stay until someone deletes them) */
  const live = new Set(slots.map((s) => s.key)); Object.keys(index).forEach((k) => { if (!live.has(k)) delete index[k]; });
  fs.writeFileSync(INDEX, JSON.stringify(index, null, 1) + '\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message || e); process.exit(1); });
