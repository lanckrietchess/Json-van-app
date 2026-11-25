/* 9.71.0: on-device captions piled up at the end of the video.
   Cause: transformers.js (3.0.2, still in 4.3.2) crops Whisper's cross-attention at num_frames = samples / 160 (mel frames, 100 a
   second) while the attention has 50 frames a second, so word times come out about twice too late; fixTimes then clamped everything
   past the window to its end. This test runs the REAL caption code from app.html (asrWords, anchorWords, speechWindows, fixTimes,
   whisperSubs, group, chunk) with a fake Whisper that behaves like the library: the right frame count gives the true word times,
   the wrong one (what the pipeline sends) gives the stretched times of the bug.
   Run: node tests/captions_timing.test.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('code not found: ' + from); return src.slice(a, b); };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };

const code = [
  cut('const clean=t=>', '\n'),
  cut('function group(words,maxWords)', '/* "Fix words"'),
  cut('function chunk(lines,maxWords)', '/* ---------- captions from the script'),
  cut('const NOISE=', 'async function autoSubs')
].join('\n');
const ctx = { console: { warn() {}, log: console.log }, navigator: { userAgent: 'test', deviceMemory: 8 } };
vm.runInNewContext('const S=()=>({capWords:6});\n' + code +
  '\nthis.whisperSubs=whisperSubs;this.anchorWords=anchorWords;this.speechWindows=speechWindows;this.asrWords=asrWords;this.setModel=f=>{model=f};', ctx);

/* 40 s of audio at 16 kHz: speech in three phrases, silence between (like a short reel) */
const SR = 16000, DUR = 40, PH = [[2, 7], [12, 19], [27, 33]];
const pcm = new Float32Array(SR * DUR);
PH.forEach(([s, e]) => { for (let i = s * SR; i < e * SR; i++) pcm[i] = 0.25 * Math.sin(i / 5) * (0.6 + 0.4 * Math.sin(i / 900)); });
const audio = { pcm, dur: DUR, peak: 0.25 };
const WORDS = ['This', 'knight', 'looks', 'safe', 'but', 'watch', 'the', 'fork', 'on', 'e5', 'now', 'the', 'queen', 'is', 'gone', 'so', 'check', 'every', 'capture', 'first'];

/* the truth, per window: each phrase that falls inside the window gets words spread over that phrase */
function truth(off, len) {
  const out = []; let k = 0;
  PH.forEach(([s, e]) => {
    const a = Math.max(s, off), b = Math.min(e, off + len); if (b - a < 0.5) return;
    const n = 4, d = (b - a) / n;
    for (let j = 0; j < n; j++) out.push({ s: a - off + j * d, e: a - off + (j + 1) * d - 0.05, t: WORDS[k++ % WORDS.length] });
  });
  return out;
}
/* a fake transformers.js pipeline. Its own call (the pipeline path) has the bug: times stretched by 2 and capped at 30 s.
   model.generate gives the true times only when num_frames = samples / 160 / 2 (what the fix sends). */
function fakeAsr(opts) {
  opts = opts || {};
  let seen = [];
  const winOf = (seg) => { const off = Math.round((seg.byteOffset / 4) / SR * 100) / 100; return { off, len: seg.length / SR }; };
  const stretched = (w) => w.map((x) => ({ s: Math.min(30, x.s * 2), e: Math.min(30, x.e * 2), t: x.t }));
  const asr = async (seg, o) => { seen.push('pipeline'); const { off, len } = winOf(seg); return { chunks: stretched(truth(off, len)).map((x) => ({ text: ' ' + x.t, timestamp: [x.s, x.e] })) }; };
  if (!opts.noDirect) {
    asr.processor = Object.assign(async (seg) => ({ input_features: { seg } }), { feature_extractor: { config: { hop_length: 160, chunk_length: 30 } } });
    asr.model = { config: { max_source_positions: 1500 }, generate: async (o) => {
      if (opts.throwDirect) throw new Error('generate failed');
      seen.push('direct'); const seg = o.inputs.seg, { off, len } = winOf(seg);
      const right = o.num_frames === Math.floor(seg.length / 160 / 2);
      const w = right ? truth(off, len) : stretched(truth(off, len));
      const toks = w.map((x, i) => i);
      return { sequences: { tolist: () => [toks] }, token_timestamps: { tolist: () => [w.map((x) => x.s)] }, _w: w, _right: right, _o: o };
    } };
    asr.tokenizer = { _decode_asr(chunks, o) { const c = chunks[0], w = lastW; return ['', { chunks: w.map((x) => ({ text: ' ' + x.t, timestamp: [x.s, x.e] })) }]; } };
    const g = asr.model.generate; let lastW = null;
    asr.model.generate = async (o) => { const r = await g(o); lastW = r._w; asr._lastRight = r._right; asr._lastCfg = r._o; return r; };
  }
  asr.seen = () => seen;
  return asr;
}
const inPhrase = (t) => PH.some(([s, e]) => t >= s - 0.4 && t <= e + 0.4);
function report(r) { return (r.lines || []).map((l) => l.s.toFixed(1) + '-' + l.e.toFixed(1) + ' ' + l.t).join(' | '); }

(async () => {
  console.log('A. the windows: at most 15 s, cut in a pause');
  const W = ctx.speechWindows(audio, 15).map(([a, b]) => [a / SR, b / SR]);
  ok(W.every(([a, b]) => b - a <= 15.01), 'every window is at most 15 s (' + W.map(([a, b]) => a.toFixed(1) + '-' + b.toFixed(1)).join(', ') + ')');
  ok(W.slice(0, -1).every(([, b]) => !inPhrase(b) || PH.every(([s, e]) => b < s + 0.2 || b > e - 0.2)), 'each cut falls in a pause, not in the middle of a phrase');

  console.log('B. the fix: the model is called with the right frame count');
  let asr = fakeAsr();
  ctx.setModel(() => Promise.resolve(asr));
  let r = await ctx.whisperSubs({}, null, audio, 'en');
  ok(r.ok, 'captions were written');
  ok(asr.seen().every((x) => x === 'direct'), 'the direct model path was used for every window (' + asr.seen().join(', ') + ')');
  ok(asr._lastRight === true && asr._lastCfg.return_token_timestamps === true && asr._lastCfg.language === 'en', 'num_frames = samples / 160 / 2, word timestamps on, language kept');
  ok(r.lines.every((l) => inPhrase(l.s) && inPhrase(Math.max(l.s, l.e - 0.2))), 'every caption sits on speech: ' + report(r));
  ok(PH.every(([s, e]) => r.lines.some((l) => l.s >= s - 0.4 && l.s <= e)), 'every phrase has its captions (start, middle and end of the video)');
  ok(r.lines.filter((l) => l.s > 33.5).length === 0, 'no caption piles up at the end of the video');
  ok(r.lines.every((l, i) => !i || l.s >= r.lines[i - 1].s), 'captions are in order');

  console.log('C. the safety net: the old pipeline path with the stretched times of the bug');
  asr = fakeAsr({ throwDirect: true });
  ctx.setModel(() => Promise.resolve(asr));
  r = await ctx.whisperSubs({}, null, audio, 'en');
  ok(r.ok && asr.seen().every((x) => x === 'pipeline'), 'the pipeline was used when the direct path failed');
  ok(r.lines.every((l) => inPhrase(l.s)), 'stretched times are put back onto the speech: ' + report(r));
  ok(r.lines.filter((l) => l.s > 33.5).length === 0, 'still no pile-up at the end');
  ok(r.lines.every((l) => !PH.some(([s, e], i) => i < PH.length - 1 && l.s < e && l.e > PH[i + 1][0])), 'no caption runs across a pause between two phrases');
  ok(PH.every(([s, e]) => r.lines.some((l) => l.s >= s - 0.4 && l.s <= e)), 'every phrase still has its captions');

  asr = fakeAsr({ noDirect: true });
  ctx.setModel(() => Promise.resolve(asr));
  r = await ctx.whisperSubs({}, null, audio, 'en');
  ok(r.ok && r.lines.every((l) => inPhrase(l.s)) && r.lines.filter((l) => l.s > 33.5).length === 0, 'a library without the parts the direct path needs: pipeline + safety net, captions on speech');

  ok(r.lines.every((l) => !PH.some(([s, e], i) => i < PH.length - 1 && l.s < e && l.e > PH[i + 1][0])), 'no caption runs across a pause between two phrases');

  console.log('E. a real reel: 22 s of talking without a break, the bug as transformers.js makes it (per chunk the times are stretched by min(2, 30 / chunk length), as transformers.js does)');
  const SR2 = 16000, D2 = 22, pcm2 = new Float32Array(SR2 * D2);
  for (let i = 1 * SR2; i < 21 * SR2; i++) pcm2[i] = 0.25 * Math.sin(i / 5) * (0.6 + 0.4 * Math.sin(i / 900));
  const au2 = { pcm: pcm2, dur: D2, peak: 0.25 };
  const T2 = []; for (let k = 0; k < 40; k++) T2.push({ s: 1 + k * 0.5, e: 1 + k * 0.5 + 0.42, t: 'w' + k });
  const win2 = (seg) => { const off = (seg.byteOffset / 4) / SR2, len = seg.length / SR2; return { off, len, f: Math.min(2, 30 / len), w: T2.filter((x) => x.s >= off - 0.01 && x.s < off + len).map((x) => ({ s: x.s - off, e: Math.min(len, x.e - off), t: x.t })) }; };
  const mk2 = (direct) => {
    const asr = async (seg) => { const W = win2(seg); return { chunks: W.w.map((x) => ({ text: ' ' + x.t, timestamp: [x.s * W.f, x.e * W.f] })) }; };
    if (direct) {
      let lastW = null;
      asr.processor = Object.assign(async (seg) => ({ input_features: { seg } }), { feature_extractor: { config: { hop_length: 160, chunk_length: 30 } } });
      asr.model = { config: { max_source_positions: 1500 }, generate: async (o) => { const seg = o.inputs.seg, W = win2(seg), right = o.num_frames === Math.floor(seg.length / 320); lastW = right ? W.w : W.w.map((x) => ({ s: x.s * W.f, e: x.e * W.f, t: x.t })); return { sequences: { tolist: () => [lastW.map((x, i) => i)] }, token_timestamps: { tolist: () => [lastW.map((x) => x.s)] } }; } };
      asr.tokenizer = { _decode_asr: () => ['', { chunks: lastW.map((x) => ({ text: ' ' + x.t, timestamp: [x.s, x.e] })) }] };
    }
    return asr;
  };
  for (const [label, direct] of [['the fix', true], ['the safety net alone', false]]) {
    ctx.setModel(() => Promise.resolve(mk2(direct)));
    const r2 = await ctx.whisperSubs({}, null, au2, 'en');
    const words = []; r2.lines.forEach((l) => { const n = l.t.split(' ').length; const ws = l.w && l.w.length === n ? l.w : null; l.t.split(' ').forEach((t, j) => words.push({ t, s: ws ? ws[j].s : l.s })); });
    const err = words.map((w) => Math.abs(w.s - T2[+w.t.slice(1)].s));
    ok(r2.ok && words.length === 40, label + ': all 40 words are in the captions');
    ok(Math.max.apply(null, err) <= (direct ? 0.3 : 1.2), label + ': every word within ' + (direct ? '0.3' : '1.2') + ' s of where it was said (worst ' + Math.max.apply(null, err).toFixed(2) + ' s)');
    ok(r2.lines.filter((l) => l.s > 20.5).length <= 1, label + ': no pile of captions at the end (' + r2.lines.filter((l) => l.s > 20.5).length + ' start in the last 1.5 s)');
  }

  console.log('D. anchorWords on its own');
  const one = audio, off = 12, len = 10; /* window 12-22 s: speech 12-19 s */
  const good = [{ s: 0.2, e: 1, t: 'a' }, { s: 2, e: 3, t: 'b' }, { s: 5, e: 6.5, t: 'c' }];
  const g2 = ctx.anchorWords(good, one, off, len);
  ok(g2.every((x, i) => Math.abs(x.s - good[i].s) < 0.31), 'good times stay (almost) as they are');
  const bad = good.map((x) => ({ s: x.s * 2, e: x.e * 2, t: x.t }));
  const b2 = ctx.anchorWords(bad, one, off, len);
  ok(b2.every((x) => x.s >= 0 && x.e <= 7.3), 'times twice too late are mapped back onto the 7 s of speech (' + b2.map((x) => x.s.toFixed(2)).join(', ') + ')');
  ok(ctx.anchorWords([], one, off, len).length === 0, 'no words: nothing');

  console.log('RESULT ' + pass + ' passed ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('CRASH', e && e.stack || e); console.log('RESULT ' + pass + ' passed ' + (fail + 1) + ' failed'); process.exit(1); });
