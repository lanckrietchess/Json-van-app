/* 9.50.0: the Creator Studio Content Hub (LC35S, inline in app.html) no longer shows a false "No connection", retries the upload,
   and never loses a video: on any failure the render is kept on the device (IndexedDB takes) and a "Download Video Directly" button appears.
   This runs the real LC35S code from app.html with a fake Arena (Quota.call) and a fake storage (XMLHttpRequest).
   Run: node tests/content_hub.test.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const a = src.indexOf('const LC35S=(()=>{'), b = src.indexOf('})();', src.indexOf('_t:{why:why', a)) + 5;
if (a < 0 || b < 5) { console.log('RESULT 0 passed 1 failed (LC35S not found)'); process.exit(1); }
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };

/* ---- the world around LC35S ---- */
const calls = [], puts = [], added = [], downloads = [], errors = [];
let answers = {}, putScript = [], store = {}, session = {};
const msg = { textContent: '', className: '' };
const Quota = { call: async (action, body) => { calls.push({ action, body }); const f = answers[action]; return f ? (typeof f === 'function' ? f(body) : f) : { ok: false, reason: 'unknown_action' }; } };
class XHR {
  constructor() { this.upload = {}; this.status = 0; this.responseText = ''; }
  open(m, u) { this.m = m; this.u = u; }
  send(fd) {
    const f = fd.get(''), next = putScript.length ? putScript.shift() : { status: 200, body: '{}' };
    puts.push({ url: this.u, type: f && f.type, size: f && f.size });
    setImmediate(() => { if (next.status === 0) { this.onerror && this.onerror(); return; } this.status = next.status; this.responseText = next.body || ''; this.onload && this.onload(); });
  }
}
const ctx = {
  console: { log() {}, warn() {}, error: (...x) => errors.push(x.map(String).join(' ')) },
  Host: { isCreator: () => true, isAdmin: () => false }, Quota,
  Store: { get: (k, d) => (k in store ? store[k] : d), set: (k, v) => { store[k] = v; } },
  sessionStorage: { getItem: (k) => (k in session ? session[k] : null), setItem: (k, v) => { session[k] = v; } },
  toast() {}, uid: (() => { let n = 0; return () => 'id' + (++n); })(),
  $: (q) => (q === '#lc35-msg' ? msg : null), h: () => null, icon: () => '',
  Takes: { list: [], add: async (t) => { added.push(t); t.saved = true; return t; } },
  Trim: { take: () => null }, download: (blob, name) => downloads.push({ name, type: blob.type, size: blob.size }),
  XMLHttpRequest: XHR, FormData, Blob, URL, Promise, JSON, Math, Date, String, Number, Array, Object, Error,
  setTimeout: (f) => setImmediate(f), clearTimeout() {}, setInterval: () => 0, clearInterval() {}, setImmediate,
  document: { createElement: () => ({ style: {}, append() {}, remove() {} }), body: { append() {} } }, location: { href: 'https://x.test/' }, navigator: {}
};
vm.createContext(ctx);
vm.runInContext(src.slice(a, b) + '\nthis.LC35S=LC35S;', ctx);
const L = ctx.LC35S, T = L._t;
const begin = { ok: true, id: 'ct_aaaaaaaaaaaa', upload: { url: 'https://store.test/up?token=1', path: 'p/ct/x.webm' } };
const commit = { ok: true, item: { id: 'ct_aaaaaaaaaaaa', title: 'Caro trap', platforms: {} }, usage: { items: 1 } };
const webm = new Blob([Buffer.alloc(4000, 1)], { type: 'video/webm;codecs=vp9,opus' });
const opts = { title: 'Caro trap', mime: 'video/webm', platforms: {}, meta: {} };
const reset = () => { calls.length = 0; puts.length = 0; added.length = 0; downloads.length = 0; errors.length = 0; putScript = []; answers = {}; L.state.items = []; L.state.usage = null; };

(async () => {
  console.log('A. the false "No connection" is gone');
  reset();
  /* what the live Arena (before the deploy) answers, after Quota.call unwrapped its 200 wrapper */
  answers.content_begin = { ok: false, reason: 'unknown_action', status: 200, wrapped: true, error: 'Bad request payload', details: '{"ok":false,"reason":"unknown_action"}' };
  let r = await L.saveToCloud(webm, opts);
  ok(r.ok === false && r.reason === 'unknown_action', 'a server without the Content hub gives reason "unknown_action", not "network" (' + r.reason + ')');
  ok(!/No connection/i.test(T.why(r)) && /deploy the latest arena function/.test(T.why(r)) && /\[unknown_action\]/.test(T.why(r)), 'the message says what is wrong and shows the technical reason: ' + T.why(r));
  ok(errors.some((e) => /\[Content hub\] start refused: unknown_action/.test(e)), 'and it goes to console.error');
  ok(/HTTP 403/.test(T.why({ reason: 'forbidden', status: 403 })) && /Failed to fetch/.test(T.why({ reason: 'network', error: 'Failed to fetch' })), 'the HTTP status and the browser\'s own error are shown');
  ok(T.why({ reason: 'weird_new_reason', status: 418, error: 'teapot' }) === 'The Content hub did not accept it. [weird_new_reason · HTTP 418 · teapot]', 'an unknown answer is shown as it is');

  console.log('B. the admin secret is never overwritten by an empty one');
  reset(); answers.content_begin = { ok: false, reason: 'forbidden', status: 403 };
  store['lc5-admin-token'] = 'admin-token-admin-token';
  await L.saveToCloud(webm, opts);
  ok(calls[0].body.secret === 'admin-token-admin-token', 'the owner\'s admin token from this device is sent');
  delete store['lc5-admin-token']; reset(); answers.content_begin = { ok: false, reason: 'forbidden', status: 403 };
  await L.saveToCloud(webm, opts);
  ok(!('secret' in calls[0].body), 'without a token no "secret" key is sent at all (so Quota.call\'s own stays)');

  console.log('C. the upload: plain video type, retries, exact storage errors');
  reset(); answers.content_begin = begin; answers.content_commit = commit;
  r = await L.saveToCloud(webm, opts);
  ok(r.ok && puts.length === 1 && puts[0].type === 'video/webm' && puts[0].size === 4000, 'the file is sent as plain video/webm (the bucket refuses "video/webm;codecs=...")');
  reset(); answers.content_begin = begin; answers.content_commit = commit; putScript = [{ status: 503, body: '{"message":"busy"}' }, { status: 0 }, { status: 200 }];
  r = await L.saveToCloud(webm, opts);
  ok(r.ok && puts.length === 3, 'a 503 and a dropped connection are retried: saved on the third try');
  reset(); answers.content_begin = begin; answers.content_commit = commit; answers.content_delete = { ok: true }; putScript = [{ status: 413, body: '{"statusCode":"413","error":"Payload too large","message":"The object exceeded the maximum allowed size"}' }];
  r = await L.saveToCloud(webm, opts);
  ok(!r.ok && r.reason === 'too_large' && r.status === 413 && /exceeded the maximum allowed size/.test(r.error) && puts.length === 1, 'storage 413: no retry, reason too_large with the storage\'s own words');
  ok(calls.some((c) => c.action === 'content_delete'), 'the half-started project is cleaned up on the server');
  reset(); answers.content_begin = begin; answers.content_delete = { ok: true }; putScript = [{ status: 0 }, { status: 0 }, { status: 0 }];
  r = await L.saveToCloud(webm, opts);
  ok(!r.ok && r.reason === 'network' && puts.length === 3 && /no answer from the storage/.test(r.error), 'three dropped connections: reason network, with what actually happened');
  reset(); answers.content_begin = begin; putScript = [{ status: 400, body: '{"error":"invalid_mime_type","message":"mime type video/x-matroska is not supported"}' }];
  r = await L.saveToCloud(webm, opts);
  ok(!r.ok && r.reason === 'upload_failed' && r.status === 400 && /not supported/.test(T.why(r)), 'a refused file type: "The cloud storage refused the file. [upload_failed · HTTP 400 · …]"');
  reset(); let n = 0; answers.content_begin = () => (++n === 1 ? { ok: false, reason: 'network', status: 0, error: 'Failed to fetch' } : begin); answers.content_commit = commit;
  r = await L.saveToCloud(webm, opts);
  ok(r.ok && n === 2, 'a start request that got no answer is tried once more');

  console.log('D. the fail-safe: never lose a video');
  reset();
  await T.failSafe({ reason: 'unknown_action', status: 200 }, webm, { name: 'Caro trap (Master)', mime: 'video/webm', seconds: 31, w: 1080, h: 1920, fps: 30, retry: opts });
  ok(added.length === 1 && added[0].blob === webm && added[0].name === 'Caro trap (Master)', 'a failed render is kept as a take on this device (IndexedDB)');
  const sf = T.safe();
  ok(sf.length === 1 && sf[0].file === 'caro-trap-master-.webm'.replace('-.', '.') && sf[0].stored === true && !!sf[0].retry, 'a "Download Video Directly" entry (caro-trap-master.webm) with a retry');
  ok(/Not saved to the Content hub/.test(msg.textContent) && /safe on this device/.test(msg.textContent) && /Download Video Directly/.test(msg.textContent) && /bad/.test(msg.className), 'the message says it was not saved, that it is safe, and where the download is');
  ok(src.indexOf('text:"Download Video Directly (."+extOfMime(x.mime)+")"') > 0 && src.indexOf('onclick:()=>download(x.blob,x.file)') > 0, 'the button downloads that exact video on a tap (a real user click, so no browser blocks it)');
  reset();
  const take = { id: 't1', name: 'Take 3', blob: webm, mime: 'video/webm', saved: true, w: 1080, h: 1920, durationMs: 9000 };
  ctx.Trim.take = () => take; answers.content_begin = { ok: false, reason: 'limit_bytes', status: 409 };
  await T.saveTakeToHub();
  ok(added.length === 0 && T.safe().some((x) => x.name === 'Take 3' && x.stored), 'a take that is already on the device is not copied twice, and still gets the download button');
  answers.content_begin = begin; answers.content_commit = commit;
  await T.retrySafe(T.safe().filter((x) => x.name === 'Take 3')[0]);
  ok(!T.safe().some((x) => x.name === 'Take 3') && /Saved to the Content hub/.test(msg.textContent), 'Try the upload again: once it works, the entry goes away');
  ok(src.indexOf('if(!can()){download(r.blob') < 0 && src.indexOf('It was saved as a download instead') < 0, 'no automatic download without a tap any more (browsers block those after an upload)');

  console.log('RESULT ' + pass + ' passed ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('CRASH', e && e.stack); console.log('RESULT ' + pass + ' passed ' + (fail + 1) + ' failed'); process.exit(1); });
