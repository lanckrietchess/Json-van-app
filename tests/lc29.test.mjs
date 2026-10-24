import fs from 'node:fs';
import { boot } from './boot.mjs';
const APP = '/home/claude/lc29/src/index.html';
const CONTENT = fs.readFileSync('/mnt/user-data/uploads/content__35_.json', 'utf8');
const HELP = JSON.parse(fs.readFileSync('/home/claude/lc29/out/help.json', 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* a fake "GitHub/Vercel": which asset paths exist, and what each request returned */
function rig({ files = [], manifest = null, help = HELP, audio = {}, noHelp = false }) {
  const set = new Set(files), log = [];
  const fetchStub = async (u, init) => {
    const url = new URL(u), p = url.pathname, method = (init && init.method) || 'GET';
    if (!p.startsWith('/assets/')) return null;
    log.push(method + ' ' + p + url.search);
    if (p === '/assets/images/coach/manifest.json') return manifest ? new Response(JSON.stringify(manifest), { status: 200, headers: { 'content-type': 'application/json' } }) : new Response('<html>spa</html>', { status: 200, headers: { 'content-type': 'text/html' } });
    if (p === '/assets/help/help.json') return noHelp ? new Response('nope', { status: 404 }) : new Response(JSON.stringify(help), { status: 200, headers: { 'content-type': 'application/json' } });
    if (audio[p]) return new Response(new Uint8Array(4000), { status: 200, headers: { 'content-type': 'audio/mpeg' } });
    if (set.has(p)) return new Response(method === 'HEAD' ? '' : 'img', { status: 200, headers: { 'content-type': 'image/png' } });
    return new Response('', { status: 404 });
  };
  const pre = (w) => {
    w.Image = class { set src(v) { this._s = v; const p = new URL(v, 'https://lanckrietchess-app.vercel.app/').pathname; setTimeout(() => (set.has(p) ? this.onload && this.onload() : this.onerror && this.onerror()), 1); } get src() { return this._s; } };
    w.__played = [];
    w.Audio = class { constructor(u) { this.u = u; this.paused = true; this.currentTime = 0; w.__played.push(u); } play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } };
    w.URL.createObjectURL = () => 'blob:test'; w.URL.revokeObjectURL = () => {};
  };
  return { fetchStub, pre, log, set };
}
const img = (cat, ns) => ns.map((n) => `/assets/images/coach/${cat}/${cat}_${n}.png`);

/* ---------------------------------------------------------------- T1: the built page with a manifest */
console.log('T1 built page, manifest, home screen');
{
  const EM = ['neutral', 'thinking', 'serious', 'happy', 'skeptical', 'tough_love'];
  const files = EM.flatMap((c) => img(c, [1, 2])), manifest = { categories: Object.fromEntries(EM.map((c) => [c, [c + '_1.png', c + '_2.png']])) };
  const r = rig({ files, manifest });
  const b = await boot(APP, { content: CONTENT, wait: 3500, fetch: r.fetchStub, pre: r.pre });
  const w = b.w;
  ok(typeof w.eval('typeof LC29') === 'string' && w.eval('typeof LC29') === 'object', 'LC29 module is defined in the built page');
  ok(w.eval('typeof getRandomCoachAvatar') === 'function' || typeof w.getRandomCoachAvatar === 'function', 'getRandomCoachAvatar is a global function');
  const q = w.document.querySelector('#view .lc29-q');
  ok(!!q, 'a ? button is on the home screen');
  ok(q && q.closest('h1,h2') !== null, 'the ? sits inside the screen heading');
  const route0 = q && q.getAttribute('data-lc29-open'), feat0 = HELP.features.find((f) => f.feature_id === route0);
  ok(!!feat0, 'it is bound to a feature_id that exists in help.json: "' + route0 + '" (a new member lands on this screen)');
  q.click(); await sleep(600);
  const secs = w.document.querySelectorAll('.lc29-sheet .lc29-sec');
  ok(secs.length === 4, 'the help sheet shows four sections (What, How, Why, Ranks), got ' + secs.length);
  const heads = Array.from(secs).map((s) => s.querySelector('h3').textContent);
  ok(heads.join('|') === 'What it is|How to use it|Why it works (MSPC)|Ranks and levels', 'section titles are right');
  const im = w.document.querySelector('.lc29-sheet .lc29-av-img');
  ok(im && new RegExp('/assets/images/coach/' + feat0.emotion + '/' + feat0.emotion + '_[12]\\.png$').test(im.src), route0 + ' uses a photo from its own emotion folder (' + feat0.emotion + '): ' + (im && im.src.split('/').slice(-2).join('/')));
  ok(r.log.some((l) => l.startsWith('GET /assets/images/coach/manifest.json')), 'the manifest was requested');
  ok(!r.log.some((l) => l.startsWith('HEAD ')), 'no probing when a manifest exists');
  w.document.querySelector('.lc29-sheet [data-close]').click(); await sleep(400);
  /* settings toggle */
  ok(b.dom.serialize().includes('Show Lanckriet Chess Help'), 'Settings toggle text is in the built page');
  w.eval('App.settings.lcHelp=false'); w.eval('LC29._t.ensure()'); await sleep(50);
  ok(!w.document.querySelector('#view .lc29-q'), 'toggle off removes the ? buttons');
  w.eval('App.settings.lcHelp=true'); w.eval('LC29._t.ensure()'); await sleep(50);
  ok(!!w.document.querySelector('#view .lc29-q'), 'toggle on brings them back');
  /* a different screen */
  w.location.hash = '#about'; await sleep(1200);
  const q2 = w.document.querySelector('#view .lc29-q');
  ok(q2 && q2.getAttribute('data-lc29-open') === 'about', 'after navigating to #about the ? is bound to "about" (got ' + (q2 && q2.getAttribute('data-lc29-open')) + ')');
  q2.click(); await sleep(600);
  const im2 = w.document.querySelector('.lc29-sheet .lc29-av-img');
  ok(im2 && /\/happy\/happy_[12]\.png$/.test(im2.src), 'about is a happy screen and shows a happy photo');
  w.document.querySelector('.lc29-sheet [data-close]').click(); await sleep(300);
  w.location.hash = '#upgrades'; await sleep(1000);
  ok(w.document.querySelectorAll('#view .lc29-q').length === 1, 'exactly one ? per screen after several navigations');
  const errs = b.errors.filter((e) => /lc29|LC29/i.test(e));
  ok(errs.length === 0, 'no LC29 errors in the console' + (errs.length ? ': ' + errs.join(' / ') : ''));
  b.dom.window.close();
}

/* ---------------------------------------------------------------- T2: no manifest -> probing, gaps, no repeats, fallback */
console.log('T2 probing without a manifest');
{
  const files = [...img('neutral', [1, 2, 4]), ...img('serious', [1, 2])];
  const r = rig({ files });
  const b = await boot(APP, { content: CONTENT, wait: 2500, fetch: r.fetchStub, pre: r.pre });
  const w = b.w;
  const seq = [];
  for (let i = 0; i < 12; i++) seq.push((await w.getRandomCoachAvatar('serious')).split('/').pop());
  ok(seq.every((n) => /^serious_[12]\.png$/.test(n)), 'serious only returns existing files: ' + [...new Set(seq)].join(','));
  ok(seq.every((n, i) => i === 0 || n !== seq[i - 1]), 'two photos never repeat back to back');
  const nl = await w.getRandomCoachAvatar('neutral');
  ok(/neutral_[124]\.png$/.test(nl), 'neutral finds all numbered files incl. one after a gap');
  const probeLog = r.log.filter((l) => l.startsWith('HEAD /assets/images/coach/neutral/'));
  ok(probeLog.length >= 8 && probeLog.length <= 16, 'probing is batched and stops (' + probeLog.length + ' HEAD requests for neutral)');
  const tl = await w.getRandomCoachAvatar('tough_love');
  ok(tl.endsWith('/neutral/neutral_1.png'), 'empty folder falls back to neutral/neutral_1.png');
  ok((await w.getRandomCoachAvatar('banana')).includes('/neutral/'), 'an unknown emotion name is treated as neutral');
  ok((await w.getRandomCoachAvatar('tough-love')).endsWith('/neutral/neutral_1.png'), '"tough-love" maps to tough_love (empty -> fallback)');
  const before = r.log.length; await w.getRandomCoachAvatar('serious'); await w.getRandomCoachAvatar('serious');
  ok(r.log.length === before, 'the file list is cached: no more requests on later calls');
  ok(w.eval('LC29.avatar.peek("serious")').includes('/serious/serious_'), 'peek() answers instantly once the list is known');
  ok(w.eval('LC29.avatar.peek("happy")') === '', 'peek() gives "" while nothing is known and starts the lookup');
  b.dom.window.close();
}

/* ---------------------------------------------------------------- T3: everything missing -> empty string, no throw */
console.log('T3 nothing uploaded yet');
{
  const r = rig({ files: [] });
  const b = await boot(APP, { content: CONTENT, wait: 2500, fetch: r.fetchStub, pre: r.pre });
  const w = b.w;
  let v, threw = false; try { v = await w.getRandomCoachAvatar('happy'); } catch (e) { threw = true; }
  ok(!threw && v === '', 'returns "" (the knight icon is used) and never throws');
  const q = w.document.querySelector('#view .lc29-q'); q && q.click(); await sleep(500);
  ok(!!w.document.querySelector('.lc29-sheet .lc29-av-svg'), 'the help sheet still opens, with the knight icon');
  ok(!w.document.querySelector('.lc29-sheet .lc29-av-img'), 'and no broken image is drawn');
  b.dom.window.close();
}

/* ---------------------------------------------------------------- T4: manifest lists a file that is gone */
console.log('T4 broken file listed in the manifest');
{
  const files = [...img('neutral', [1]), ...img('happy', [1])];   // happy_2 and happy_3 are listed but missing
  const manifest = { categories: { neutral: ['neutral_1.png'], happy: ['happy_1.png', 'happy_2.png', 'happy_3.png'], thinking: [], serious: [], skeptical: [], tough_love: [] } };
  const r = rig({ files, manifest });
  const b = await boot(APP, { content: CONTENT, wait: 2500, fetch: r.fetchStub, pre: r.pre });
  const w = b.w; const got = [];
  for (let i = 0; i < 10; i++) got.push((await w.getRandomCoachAvatar('happy')).split('/').pop());
  ok(got.every((n) => n === 'happy_1.png'), 'a missing file is skipped and a working one is returned every time');
  b.dom.window.close();
}

/* ---------------------------------------------------------------- T5: audio paths */
console.log('T5 audio: cached file and live fallback');
{
  const help = JSON.parse(JSON.stringify(HELP));
  const first = help.features.find((f) => f.feature_id === 'trim');
  Object.assign(first, { voice_id: 'v1', audio_cached: true, audio_url: 'assets/audio/help/trim.mp3', text_hash: 'abc123' });
  const r = rig({ files: img('neutral', [1]), help, audio: { '/assets/audio/help/trim.mp3': 1 } });
  const b = await boot(APP, { content: CONTENT, wait: 3000, fetch: r.fetchStub, pre: r.pre });
  const w = b.w;
  w.eval('window.__say=[];LC19.coach.say=async function(t,o){window.__say.push(t);return true}');
  w.document.querySelector('#view .lc29-q').click(); await sleep(500);
  const btn = w.document.querySelector('[data-lc29-listen]');
  btn.click(); await sleep(400);
  ok(r.log.some((l) => l === 'GET /assets/audio/help/trim.mp3?h=abc123'), 'the saved mp3 is fetched with its text hash');
  ok(w.__played.length === 1, 'the mp3 plays through an Audio element');
  ok(w.__say.length === 0, 'the live voice is NOT called when the clip exists');
  ok(/Pause/.test(btn.textContent), 'button shows Pause while playing, got "' + btn.textContent + '"');
  btn.click(); await sleep(100);
  ok(/Resume/.test(btn.textContent), 'second tap pauses');
  w.document.querySelector('.lc29-sheet [data-close]').click(); await sleep(400);
  w.location.hash = '#about'; await sleep(1200);
  w.document.querySelector('#view .lc29-q').click(); await sleep(500);
  w.document.querySelector('[data-lc29-listen]').click(); await sleep(300);
  ok(w.__say.length === 1 && w.__say[0].length > 100, 'a screen without a generated clip uses the live coach voice with its text');
  ok(w.__played.length === 1, 'and does not start a second Audio element');
  b.dom.window.close();
}

/* ---------------------------------------------------------------- T6: help.json unreachable */
console.log('T6 help.json unreachable');
{
  const r = rig({ files: img('neutral', [1]), noHelp: true });
  const b = await boot(APP, { content: CONTENT, wait: 2500, fetch: r.fetchStub, pre: r.pre });
  ok(!b.w.document.querySelector('#view .lc29-q'), 'no ? and no error when there is no help data at all');
  ok(b.errors.filter((e) => /lc29/i.test(e)).length === 0, 'no LC29 errors');
  b.dom.window.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
