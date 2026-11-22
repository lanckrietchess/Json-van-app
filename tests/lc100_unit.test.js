/* LC100 (9.65.0) unit tests without a browser: the position hash (same as tools/master_positions.py), the Theory chip text, a stored
   position as a Ranked puzzle, the nearest-rated pick, the CSV; the Creator Studio watermark CTA (defaults, cues, placement next to the
   watermark, drawn only at its time) and the Studio's Pause seams for "Cut silences".
   node tests/lc100_unit.test.js (needs npm install in tests/ for chess.js) */
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0; const t = (n, c) => { if (c) { pass++; console.log('  ok  ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const Chess = require('./node_modules/chess.js').Chess;
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const L = new Function('Chess', src('lc100.js').replace('/*@@module lc100*/', '').replace('/*@@end lc100*/', '') + ';return LC100;')(Chess);
const T = L._t;

// ---------- the hash and the chip ----------
t('FNV-1a 32: the same values as the Python tool (empty, "a")', T.fnv('') === '811c9dc5' && T.fnv('a') === 'e40c292c');
t('the key ignores the en-passant square and the move counters', T.keyOf('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1') === T.keyOf('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 9'));
const py = require('child_process').spawnSync('python3', ['-I', '-c', 'import sys; sys.path.insert(0, sys.argv[1]); import master_positions as m; print(m.key_of("r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"))', path.join(__dirname, '..', 'tools')], { encoding: 'utf8' });
t('the app and tools/master_positions.py make the same key', py.status === 0 && py.stdout.trim() === T.keyOf('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'));
const ch = T.chipText([37, 20, 4, 13, ['g1', 'g2'], [['Nf3', 12], ['c4', 5], ['g3', 2], ['b3', 1]]]);
t('chip: count, score and the three most played next moves', ch.head === 'Kyenzo reached this position 37 times' && ch.line === '20 won · 4 drawn · 13 lost (59% score)' && ch.next === 'Next in his games: Nf3 (12×), c4 (5×), g3 (2×)' && ch.games[0] === 'g1');
t('chip: nothing for a position he reached once, or not at all', T.chipText([1, 1, 0, 0, [], []]) === null && T.chipText(undefined) === null);

// ---------- Ranked ----------
const P = { id: '1-9', game_id: '123456789', kind: 'great', tier: '1200-1599', side: 'w', prev_fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', prev: 'e7e5',
  fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', solution: ['g1f3', 'b8c6', 'f1b5'], best: 'g1f3', tags: ['capture'] };
const z = T.toPuzzle(P);
t('a stored position becomes a Ranked puzzle: id, source, the setup move, one move to find', z && z.id === 'kg-1-9' && z.source === 'kyenzo' && z.setup.san === 'e5' && z.solution.length === 1 && z.solution[0] === 'g1f3' && z.before === P.prev_fen);
t('its rating follows the level and the kind (1400 + 150 for an only move)', z.rating === 1550 && T.ratingOf({ tier: '2000+', kind: 'brilliant' }) === 2400 && T.ratingOf({ tier: '0-799', kind: 'punish' }) === 700);
t('the game link and the label ("The only move, at 1200-1599 Elo")', z.url === 'https://www.chess.com/game/live/123456789' && z.game.label === 'The only move, at 1200-1599 Elo');
t('a mistake of his is never a Ranked puzzle', T.toPuzzle(Object.assign({}, P, { kind: 'blunder' })) === null);
t('a position whose setup move does not lead to it is dropped', T.toPuzzle(Object.assign({}, P, { prev: 'd7d5' })) === null);
t('an illegal first move is dropped', T.toPuzzle(Object.assign({}, P, { solution: ['e1e3'], best: 'e1e3' })) === null);
const list = [{ id: 'a', rating: 900 }, { id: 'b', rating: 1450 }, { id: 'c', rating: 1700 }];
t('the pick is the nearest rating that was not seen yet', T.pickFrom(list, 1500, () => false).id === 'b' && T.pickFrom(list, 1500, (id) => id === 'b').id === 'c');
t('nothing within 400 points: no pick (Lichess takes over)', T.pickFrom(list, 2400, () => false) === null);
t('CSV: a header and quoted values', T.csv([{ email: 'a@b.co', enabled: true, chesscom: 'x"y' }]).split('\n')[1].startsWith('"a@b.co","true","x""y"'));

// ---------- the Creator Studio watermark CTA ----------
const S = new Function(src('lc79.js').replace('/*@@module lc79*/', '').replace('/*@@end lc79*/', '') + ';return LC79;')();
const n = S.wmcNorm(null);
t('defaults: off, Instagram / Facebook first, both texts, the last 6 seconds', n.on === false && n.set === 'ig' && n.texts.ig === 'Get your own personalized roadmap — comment RM' && n.texts.tt === 'Get your own personalized roadmap — link in bio' && n.cues.length === 1 && n.cues[0].end && n.cues[0].d === 6);
const w = S.wmcNorm({ on: true, set: 'tt', texts: { ig: ' <b>Comment RM</b> ', tt: '' }, cues: [{ t: 3, d: 4 }, { end: true, d: 5 }] });
t('texts are cleaned (no HTML), an empty one falls back to the default', w.texts.ig === 'b Comment RM /b' && w.texts.tt === 'Get your own personalized roadmap — link in bio' && w.set === 'tt');
t('cues: from 3 s for 4 s, and the last 5 s of a 30 s video', !S.wmcActive(w, 2.9, 30) && S.wmcActive(w, 3, 30).s === 3 && !S.wmcActive(w, 7.1, 30) && S.wmcActive(w, 26, 30).s === 25 && !S.wmcActive(w, 24.9, 30));
const lo = S.wmcPlace(1080, 1920, { x: 290, y: 1700, w: 500, h: 80 }, 600, 70), hi = S.wmcPlace(1080, 1920, { x: 290, y: 120, w: 500, h: 80 }, 600, 70);
t('placement: right above a watermark at the bottom, right under one at the top, centred on it', lo.y + 70 <= 1700 && lo.y > 1550 && hi.y >= 200 && hi.y < 260 && lo.x === 240 && hi.x === 240);
const edge = S.wmcPlace(1080, 1920, { x: 900, y: 1700, w: 160, h: 60 }, 600, 70);
t('placement: never off the frame', edge.x + 600 <= 1080 && edge.x >= 0);
const calls = []; const g = new Proxy({}, { get: (o, k) => k in o ? o[k] : (k === 'measureText' ? (s) => ({ width: String(s).length * 20 }) : (...a) => { calls.push([k, a]); }), set: (o, k, v) => { o[k] = v; return true; } });
const proj = { clips: [], wmcta: { on: true, set: 'ig', cues: [{ t: 1, d: 3 }] } };
S.drawWmCta(g, 1080, 1920, proj, 0.5);
t('drawn nothing before its time', !calls.some((c) => c[0] === 'fillText'));
S.drawWmCta(g, 1080, 1920, proj, 2);
const ft = calls.filter((c) => c[0] === 'fillText').map((c) => c[1][0]).join(' ');
t('drawn at its time with the Instagram / Facebook text (split over two lines when too wide)', /Get your own/.test(ft) && /comment RM/.test(ft));
proj.wmcta.set = 'tt'; calls.length = 0; S.drawWmCta(g, 1080, 1920, proj, 2);
t('the TikTok set draws the TikTok text', /link in bio/.test(calls.filter((c) => c[0] === 'fillText').map((c) => c[1][0]).join(' ')));
proj.wmcta.on = false; calls.length = 0; S.drawFrame(g, 1080, 1920, null, null, 0, proj, 2);
t('switched off: drawFrame draws no CTA', !calls.some((c) => c[0] === 'fillText' && /roadmap/.test(c[1][0])));

// ---------- Pause seams (in the Studio code of app.html) ----------
const app = src('app.html'), i = app.indexOf('function findSilences('), j = app.indexOf('function markerCut(', i);
const helpers = new Function(app.slice(i, j) + ';return{findSilences:findSilences,pauseSeams:pauseSeams};')();
const env = [-20, -20, -20, -55, -55, -55, -20, -20, -60, -60, -20, -20];   // 0.1 s per step; a pause at 0.3 s and one at 0.8 s
const seams = helpers.pauseSeams([0.3, 0.8], env, 0.1, -40, 0);
t('a quiet bit right after a Pause / Resume seam is cut, even when shorter than the silence setting', seams.length === 2 && Math.abs(seams[0].s - 0.3) < 1e-9 && Math.abs(seams[0].e - 0.6) < 1e-9 && seams[1].seam === 1);
t('a seam with speech right after it is left alone', helpers.pauseSeams([0.1], env, 0.1, -40, 0).length === 0);
t('the take remembers its pause points and "Cut silences" uses them', /this\.pauses=\[\]/.test(app) && /pauses:\(this\.pauses\|\|\[\]\)\.slice\(\)/.test(app) && /seams=pauseSeams\(t\.pauses/.test(app));

// ---------- captions: windows and word times (9.65.0) ----------
{
  const i2 = app.indexOf('function speechWindows('), j2 = app.indexOf('const bigOk=', i2);
  const C = new Function(app.slice(i2, j2) + ';return{speechWindows:speechWindows,fixTimes:fixTimes};')();
  const SR = 16000, dur = 70, pcm = new Float32Array(SR * dur);
  for (let i = 0; i < pcm.length; i++) { const t = i / SR; const quiet = (t > 21.5 && t < 22.3) || (t > 45 && t < 45.6); pcm[i] = quiet ? 0 : 0.3 * Math.sin(i / 9); }
  const A = { pcm, dur, peak: 0.3 };
  const W = C.speechWindows(A, 25);
  t('a 70 s take is cut into windows of at most 25 s that cover it all', W.length >= 3 && W[0][0] === 0 && W[W.length - 1][1] === pcm.length && W.every((w, k) => w[1] - w[0] <= 25 * SR && (k === 0 || w[0] === W[k - 1][1])));
  t('the first cut falls in the pause around 22 s, not in the middle of a word', W[0][1] / SR > 21.4 && W[0][1] / SR < 22.4);
  const piled = C.fixTimes([{ s: 0, e: 0, t: 'every' }, { s: 0, e: 0, t: 'move' }, { s: 0, e: 0, t: 'starts' }, { s: 0, e: 0, t: 'with' }, { s: 0, e: 0, t: 'a' }, { s: 0, e: 0, t: 'question' }], 20, A, 0);
  t('words that all share one time are spread over the window, in order', piled.length === 6 && piled[5].s > 10 && piled.every((x, k) => k === 0 || x.s >= piled[k - 1].s));
  const odd = C.fixTimes([{ s: 1, e: 1.4, t: 'look' }, { s: 0.6, e: 0.9, t: 'at' }, { s: 2, e: 2.3, t: 'the' }, { s: 99, e: 100, t: 'knight' }], 20, A, 0);
  t('a word that starts before the one before it, or after the window, is put back in order and inside', odd[1].s >= odd[0].e - 0.05 && odd[3].s <= 20 && odd.every((x) => x.e > x.s));
}
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
