/* captions Edge Function with stubbed Supabase and ElevenLabs. node tests/captions.test.mjs */
import { handle, toWords } from '../functions/captions/captions.js';
let pass = 0, fail = 0; const t = (n, c) => { if (c) { pass++; console.log('  ok  ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const env = { ELEVENLABS_API_KEY: 'k', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' };
let allow = { ok: true }, sent = null;
const fetch = async (u, o) => {
  if (/auth\/v1\/user/.test(u)) return new Response('{"email":"lanckrietchess@gmail.com"}', { status: /good/.test(o.headers.Authorization) ? 200 : 401 });
  if (/lc72_caption_allow/.test(u)) return new Response(JSON.stringify(allow), { status: 200 });
  sent = o; return new Response(JSON.stringify({ language_code: 'eng', text: 'Knight to f3.', words: [{ text: 'Knight', start: 0.12, end: 0.5, type: 'word' }, { text: ' ', start: .5, end: .52, type: 'spacing' }, { text: 'to', start: .52, end: .6, type: 'word' }, { text: 'f3.', start: .62, end: 1.0, type: 'word' }] }), { status: 200 });
};
const rq = (h, body) => new Request('https://x/functions/v1/captions?lang=en&dur=12', { method: 'POST', headers: Object.assign({ 'content-type': 'audio/wav', origin: 'https://lanckrietchesstrainerhub.vercel.app' }, h), body: body || new Uint8Array(1000) });
let r = await handle(rq({}), env, { fetch }); t('no token: 401', r.status === 401);
r = await handle(rq({ authorization: 'Bearer badbadbadbadbadbadbadbad' }), env, { fetch }); t('wrong token: 401', r.status === 401);
allow = { ok: false, error: 'admin_only' }; r = await handle(rq({ authorization: 'Bearer goodgoodgoodgoodgoodgood' }), env, { fetch }); t('members are refused', r.status === 403 && (await r.json()).reason === 'admin_only');
allow = { ok: true }; r = await handle(rq({ authorization: 'Bearer goodgoodgoodgoodgoodgood' }), env, { fetch }); const j = await r.json();
t('owner gets word timings', r.status === 200 && j.ok && j.words.length === 3 && j.words[2].t === 'f3.' && j.words[0].s === 0.12);
t('language and word granularity sent to ElevenLabs', sent && sent.body.get('language_code') === 'eng' && sent.body.get('timestamps_granularity') === 'word' && sent.headers['xi-api-key'] === 'k');
t('CORS for the live site', r.headers.get('access-control-allow-origin') === 'https://lanckrietchesstrainerhub.vercel.app');
r = await handle(rq({ authorization: 'Bearer goodgoodgoodgoodgoodgood', 'content-type': 'text/plain' }), env, { fetch }); t('wrong type refused', r.status === 415);
r = await handle(rq({ authorization: 'Bearer goodgoodgoodgoodgoodgood' }), Object.assign({}, env, { CAPTIONS_ENABLED: '0' }), { fetch }); t('kill switch', r.status === 503);
t('spacing and empty words dropped', toWords({ words: [{ text: ' ', type: 'spacing' }, { text: 'a', start: 1, end: 1.2, type: 'word' }] }).length === 1);
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
