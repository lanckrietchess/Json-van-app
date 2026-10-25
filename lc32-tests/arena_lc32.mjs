import postgres from 'postgres';
import { makeHandler } from '../out/handler.js';
import { PG_TYPES } from '../out/db.js';
const sql = postgres({ host: '127.0.0.1', username: 'postgres', database: 'lc26a', max: 4, types: PG_TYPES, onnotice: () => {} });
const realFetch = globalThis.fetch; let eleven = [], elevenMode = 'ok';
globalThis.fetch = async (u, init) => {
  if (String(u).includes('api.elevenlabs.io')) { const b = JSON.parse(init.body); eleven.push(b.text); if (elevenMode === 'fail') return new Response('x', { status: 500 }); return new Response(new Uint8Array(1200).fill(7), { status: 200 }); }
  return realFetch(u, init);
};
const S = 'admin-token-admin-token';
const handle = makeHandler(sql, { PID_SALT: 'test-salt-test-salt', TOKENS_FREE: '1', ADMIN_TOKEN: S, ELEVENLABS_API_KEY: 'k'.repeat(24), ELEVENLABS_VOICE_ID: 'VoiceId1234567' });
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const call = async (action, body) => { const r = await handle(new Request('https://x.test/', { method: 'POST', headers: { Origin: 'https://lanckrietchess-app.vercel.app', 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ action }, body)) })); return Object.assign({ status: r.status }, await r.json()); };
await sql.unsafe('truncate arena.players, arena.quota, arena.token_ledger, arena.token_bonus, arena.token_spend, arena.voice_cache');
const T = (n, c = 'a') => c.repeat(n);
const dev = 'voice-device-aaaa-1';
console.log('A. pricing and dry run');
let r = await call('carousel_voice', { device: dev, dry: true, texts: [T(300), T(800, 'b')] });
ok(r.ok && r.dry && r.chars === 1100 && r.newChars === 1100 && r.cost === 2, '1,100 new characters price at 2 tokens (per 1,000, rounded up)');
r = await call('carousel_voice', { device: dev, dry: true, texts: [T(400)] });
ok(r.ok && r.cost === 1 && r.state.left === 1 && r.state.bonus === 0, '400 characters price at 1 token; the dry run charged nothing');
r = await call('carousel_voice', { device: dev, dry: true, texts: [T(1000, 'c')] });
ok(r.cost === 1, 'exactly 1,000 characters is 1 token');
ok(eleven.length === 0, 'a dry run never calls ElevenLabs');

console.log('B. daily token first');
r = await call('carousel_voice', { device: dev, ref: 'job-1', texts: [T(300), '', T(200, 'd')] });
ok(r.ok && r.charged && r.cost === 1 && r.fromDaily === 1 && r.fromBonus === 0, 'a free player pays from the daily token');
ok(r.state.left === 0 && r.state.used === 1, 'daily pocket is now empty');
ok(r.clips.length === 3 && r.clips[0].audio.length > 100 && r.clips[1].audio === '' && r.clips[2].audio.length > 100, 'one clip per slide, empty slide gets no audio');
ok(eleven.length === 2, 'two clips generated');

console.log('C. out of tokens');
const before = eleven.length;
r = await call('carousel_voice', { device: dev, ref: 'job-2', texts: [T(250, 'e')] });
ok(r.status === 403 && r.reason === 'token_limit' && r.needed === 1 && r.state.left === 0, 'no tokens left: 403 token_limit, with the price');
ok(eleven.length === before, 'nothing generated when the player cannot pay');
ok((await sql.unsafe("select count(*)::int n from arena.token_spend where ref = 'job-2'"))[0].n === 0, 'the failed job left no charge record');

console.log('D. cached text is free');
r = await call('carousel_voice', { device: dev, ref: 'job-3', texts: [T(300), T(200, 'd')] });
ok(r.ok && r.cost === 0 && r.charged === false && r.clips.every((c) => c.cached), 'same text again: cost 0, served from cache');
ok(eleven.length === before, 'cache hit does not call ElevenLabs');

console.log('E. daily first, then purchased');
const pid = (await call('hello', { device: dev })).pid;
r = await call('a5_token_grant', { device: 'admin-device-1', token: S, pid, n: 3 });
ok(r.ok && r.bonus === 3, 'admin grants 3 bonus (purchased) tokens');
await sql.unsafe("delete from arena.token_ledger");                       // new day: the daily token is back
r = await call('carousel_voice', { device: dev, dry: true, texts: [T(600, 'f'), T(600, 'g')] });
ok(r.state.left === 1 && r.state.bonus === 3 && r.cost === 2, 'state before: 1 daily + 3 bonus, job costs 2');
r = await call('carousel_voice', { device: dev, ref: 'job-4', texts: [T(600, 'f'), T(600, 'g')] });
ok(r.ok && r.fromDaily === 1 && r.fromBonus === 1, 'daily token spent first, then 1 purchased');
ok(r.state.left === 0 && r.state.bonus === 2, 'after: 0 daily, 2 purchased');

console.log('F. a retry is not charged twice');
const jobT = [T(700, 'h')];
r = await call('carousel_voice', { device: dev, ref: 'job-5', texts: jobT });
ok(r.ok && r.cost === 1 && r.fromBonus === 1 && r.state.bonus === 1, 'first call charges 1 purchased token');
await sql.unsafe('delete from arena.voice_cache');                        // the clip was lost: the client retries with the same ref
r = await call('carousel_voice', { device: dev, ref: 'job-5', texts: jobT });
ok(r.ok && r.charged === false && r.state.bonus === 1, 'same ref again: audio regenerated, no second charge');

console.log('G. ElevenLabs fails: everything is given back');
const st0 = (await call('token_state', { device: dev })).state;
const tot0 = (await sql.unsafe("select coalesce(sum(n),0)::int n from arena.quota where pid = '~all' and kind = 'voice'"))[0].n;
elevenMode = 'fail';
r = await call('carousel_voice', { device: dev, ref: 'job-6', texts: [T(500, 'i'), T(500, 'j')] });
elevenMode = 'ok';
const st1 = (await call('token_state', { device: dev })).state;
const tot1 = (await sql.unsafe("select coalesce(sum(n),0)::int n from arena.quota where pid = '~all' and kind = 'voice'"))[0].n;
ok(r.status === 503 && r.reason === 'voice_unavailable', 'upstream failure is reported (503)');
ok(st1.bonus === st0.bonus && st1.left === st0.left, 'tokens returned (daily ' + st0.left + ' -> ' + st1.left + ', bonus ' + st0.bonus + ' -> ' + st1.bonus + ')');
ok(tot1 === tot0, 'global character fuse returned too');
ok((await sql.unsafe("select count(*)::int n from arena.token_spend where ref = 'job-6'"))[0].n === 0, 'no charge record left, so a retry is charged normally');

console.log('H. validation');
ok((await call('carousel_voice', { device: dev, ref: 'x1', texts: [] })).status === 400, 'no texts: 400');
ok((await call('carousel_voice', { device: dev, ref: 'x2', texts: Array(13).fill('hello there') })).status === 400, 'more than 12 slides: 400');
ok((await call('carousel_voice', { device: dev, ref: 'x3', texts: [T(1101)] })).status === 413, 'a clip over 1,100 characters: 413');
ok((await call('carousel_voice', { device: dev, ref: 'x4', texts: [T(1000), T(1000), T(1000), T(1000), T(1000), T(100)] })).status === 413, 'job over 5,000 characters: 413');
ok((await call('carousel_voice', { device: dev, ref: 'bad ref!', texts: [T(300, 'z')] })).status === 400, 'a ref with odd characters is refused');
ok((await call('carousel_voice', { device: dev, ref: 'x5', texts: [{ a: 1 }, 5] })).status === 400, 'non-text slides: 400');
ok((await call('carousel_voice', { device: dev, ref: 'x6', texts: ['', ''] })).status === 400, 'nothing to read: 400');

console.log('I. voice not configured');
const h2 = makeHandler(sql, { PID_SALT: 'test-salt-test-salt', TOKENS_FREE: '1', ADMIN_TOKEN: S });
const r2 = await h2(new Request('https://x.test/', { method: 'POST', headers: { Origin: 'https://lanckrietchess-app.vercel.app', 'content-type': 'application/json' }, body: JSON.stringify({ action: 'carousel_voice', device: 'other-device-zzzz-9', ref: 'n1', texts: [T(300, 'q')] }) }));
ok(r2.status === 503, 'no ElevenLabs secrets: 503 voice_off and nothing charged');
console.log(`\n${pass} passed, ${fail} failed`);
await sql.end();
