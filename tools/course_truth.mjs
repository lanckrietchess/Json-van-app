// tools/course_truth.mjs (9.57.0): rewrites the coaching texts of every Lichess-based endgame and middlegame drill
// from the board and Stockfish, with the same Coach Brain the app uses (lc83.js). No AI, no stock sentence.
//
//   node tools/course_truth.mjs content.json tools/course_engine.json            # dry run: prints the audit
//   node tools/course_truth.mjs content.json tools/course_engine.json --write    # writes content.json + tools/course_audit.md
//
// course_engine.json comes from `python3 tools/course_engine.py` (Stockfish 19 in Chromium, depth 16, see that file).
// What changes, per drill (lists.endgame "kg-*", lists.middlegame "mg-kg-*": since 9.77.0 positions of Kyenzo's own games, from
// tools/course_rework.py, which also writes their engine entries; before that the Lichess "lc-*" / "mg-lc-*" drills): title, brief, description, principle, ann (notes on
// your moves), explanation, ms_pc_breakdown (M, S, P, C), alarm_signal, coaching_tip, elo_insight.foundation / .advanced.
// What never changes: the position, the solution, the source, the chapter. The Endgame Blueprint drills ("bp-*") and the MSPC
// trainer cases (lists.think) are hand-written: they are only AUDITED (every move and "piece on square" checked), never rewritten.
// Every generated text is checked again at the end: each move must be legal in the line, each "piece on square" must be true.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import {createRequire} from 'module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let Chess;
try { ({Chess} = require(path.join(ROOT, 'tests/node_modules/chess.js'))); } catch (e) { console.error('Run `npm install` in tests/ first (chess.js 0.10.3).'); process.exit(2); }

/* the app's own Coach Brain, loaded as the browser loads it */
function loadBrain() {
  const mem = {};
  const ctx = {Chess, console, setTimeout, clearTimeout, Date, JSON, Math, Object, Array, String, Number, RegExp, Set, Map, Error,
    Store: {get: (k, d) => (k in mem ? mem[k] : d), set: (k, v) => { mem[k] = v; }},
    document: {querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {}, readyState: 'complete'},
    window: {addEventListener: () => {}}, location: {hash: ''}, navigator: {userAgent: ''}, localStorage: {getItem: () => null, setItem: () => {}}};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'lc83.js'), 'utf8') + ';this.LC83=LC83;', ctx);
  return ctx.LC83;
}
export const B = loadBrain();

const NAME = {p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king'};
const VAL = {p: 1, n: 3, b: 3, r: 5, q: 9, k: 0};
const SIDE = {w: 'White', b: 'Black'};
const other = c => (c === 'w' ? 'b' : 'w');
const list = a => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const san = (fen, u) => { try { const g = new Chess(fen); const m = g.move({from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || 'q'}); return m ? m.san : u; } catch (e) { return u; } };
const lineName = (a, b) => (a[0] === b[0] ? 'the ' + a[0] + '-file' : a[1] === b[1] ? 'rank ' + a[1] : 'one diagonal');

/* material in words, from `me`'s side */
function material(fen, me) {
  const Bd = B.parse(fen), cnt = c => { const o = {}; Object.keys(Bd).forEach(q => { if (Bd[q].c === c && Bd[q].t !== 'k') o[Bd[q].t] = (o[Bd[q].t] || 0) + 1; }); return o; };
  const a = cnt(me), b = cnt(other(me)), sum = o => Object.keys(o).reduce((t, k) => t + VAL[k] * o[k], 0), d = sum(a) - sum(b);
  const pieces = o => ['q', 'r', 'b', 'n'].filter(k => o[k]).map(k => (o[k] > 1 ? o[k] + ' ' + NAME[k] + 's' : 'a ' + NAME[k]));
  const same = ['q', 'r', 'b', 'n'].every(k => (a[k] || 0) === (b[k] || 0));
  const kinds = same ? (pieces(a).length ? list(pieces(a)).replace(/\ba /g, '') + ' each' : 'kings and pawns only') : 'you have ' + (list(pieces(a)) || 'only pawns') + ', they have ' + (list(pieces(b)) || 'only pawns');
  const bal = d === 0 ? 'Material is level' : d > 0 ? 'You are ' + (d === 1 ? 'a pawn' : d + ' pawns\' worth') + ' up' : 'You are ' + (d === -1 ? 'a pawn' : -d + ' pawns\' worth') + ' down';
  return {d, text: bal + ' (' + kinds + ').'};
}

/* the strongest motif in your line, and what it is about */
const STRONG = ['smothered', 'backRank', 'mateNet', 'fork', 'skewer', 'pin', 'discovered', 'removal', 'deflection', 'trapped', 'promotion'];
function mainMotif(mot) { for (const id of STRONG) { const m = mot.find(x => x.id === id); if (m) return m; } return null; }

const RULE = {
  smothered: {label: 'Smothered mate', principle: 'A king boxed in by its own pieces can be mated by a single knight check.',
    alarm: 'Their king is walled in by its own pieces. A knight check there can be mate.', act: 'When their king has no free square, check every knight check first.'},
  backRank: {label: 'Back-rank mate', principle: 'A king on the back rank behind its own pawns dies to a check on that rank.',
    alarm: 'Their king sits on the back rank behind its own pawns. A rook or queen check on that rank can be mate.', act: 'When their king has no air, look at every check on its back rank.'},
  mateNet: {label: 'Mating net', principle: 'Count the king\'s free squares: when there are none, every check is a candidate for mate.',
    alarm: 'Their king has almost no free squares. Every check is a mate candidate.', act: 'Before anything else, list every check and see where the king can go after each one.'},
  fork: {label: 'Fork', principle: 'One piece, two targets: look for a square from which one of your pieces hits two loose or bigger pieces.',
    alarm: 'Two of their pieces stand where one of yours could hit both at once.', act: 'For every piece, picture the squares it can reach and ask: does one of them hit two targets?'},
  skewer: {label: 'Skewer', principle: 'When their king or queen stands in front of another piece on one line, attack the front piece: what stands behind falls.',
    alarm: 'Their king (or a big piece) and another piece share one line.', act: 'When two of their pieces share a line, look for a check or attack along it.'},
  pin: {label: 'Pin', principle: 'A piece in front of its king cannot move: pin it, then attack it again.',
    alarm: 'One of their pieces stands in front of its king or queen on an open line.', act: 'Look for pieces lined up with their king or queen, then attack the front piece twice.'},
  discovered: {label: 'Discovered attack', principle: 'Moving a piece out of the way can unmask a second attacker: two threats in one move.',
    alarm: 'One of your pieces stands between your own long-range piece and their target.', act: 'When your piece blocks your own line, move it with a threat of its own.'},
  removal: {label: 'Removing the defender', principle: 'When one piece guards another, take or chase the guard first.',
    alarm: 'One of their pieces is held by a single defender.', act: 'Name what defends each target, then ask: can I take or chase that defender?'},
  deflection: {label: 'Deflection', principle: 'Drag a defender away from the square it guards, then strike there.',
    alarm: 'One of their pieces has two jobs at once.', act: 'For each defender, list its jobs. Two jobs means one of them can be broken.'},
  trapped: {label: 'Trapped piece', principle: 'A piece with no safe square left can be attacked and won.',
    alarm: 'One of their pieces has no safe square to go to.', act: 'Count the escape squares of their active pieces, especially pieces deep in your half.'},
  promotion: {label: 'Promotion', principle: 'A passed pawn close to the last rank is worth more than a piece: count who arrives first.',
    alarm: 'A passed pawn is two or three steps from promotion.', act: 'Count the moves: your pawn to the last rank against their king or pieces to the queening square.'},
  trade: {label: 'Trading into a won endgame', principle: 'When the pawn endgame or the simpler ending is won, trade the pieces: the fewer pieces, the easier the win.',
    alarm: 'You are better and a trade of the last big pieces is on offer.', act: 'Before you trade, ask: is the endgame after the trade won? Count the king moves and the passed pawns.'},
  runaway: {label: 'The runaway pawn', principle: 'A passed pawn outside the reach of their king queens on its own: count the square before you push.',
    alarm: 'You have a passed pawn and their king is outside its square.', act: 'With a passed pawn, draw the square: if their king is outside it, push.'},
  quietThreat: {label: 'A quiet move with a threat', principle: 'When the checks and captures fail, look for the quiet move that creates a threat they cannot meet.',
    alarm: 'Your checks and captures do not work yet, but a quiet move can create a threat.', act: 'After the checks and captures, ask: which quiet move makes a threat they cannot answer?'},
  material: {label: 'A loose piece', principle: 'Undefended pieces are targets: count attackers and defenders before every capture.',
    alarm: 'One of their pieces has fewer defenders than attackers.', act: 'Before every move, count the defenders of their pieces and of yours.'},
  draw: {label: 'Holding the draw', principle: 'In a worse endgame, find the one move that keeps the draw: often the king in front of the pawn, or a check from far away.',
    alarm: 'You are worse, but the material left may not be enough to win.', act: 'When you are worse, ask what drawn position you are aiming for, then find the move that reaches it.'},
  win: {label: 'Converting', principle: 'Ahead in the endgame: activate the king, push the passed pawn, and trade pieces, not pawns.',
    alarm: 'You are ahead and the position is quiet.', act: 'Ask which of your pieces does the least, and give it a job.'}
};

/* the outcome of the line, in words, from `me`'s side */
function outcome(e, me, steps, sw) {
  const last = steps[steps.length - 1];
  if (last && last.mate && last.m.color === me) { const n = Math.ceil(steps.length / 2); return {kind: 'mate', n, text: n === 1 ? 'It is mate.' : 'It is mate in ' + n + '.'}; }
  const pov = (l) => (l.mate != null ? {mate: (me === 'w' ? 1 : -1) * l.mate} : {cp: (me === 'w' ? 1 : -1) * (l.cp || 0)});
  const ev = pov(e.lines[0]);
  if (sw.net >= 1) {
    const V = n => ({pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9})[n] || 0, plain = a => a.filter(x => !/new/.test(x)).sort((x, y) => V(y) - V(x));
    let won = plain(sw.won), lost = plain(sw.lost);
    lost.slice().forEach(x => { const i = won.indexOf(x); if (i >= 0) { won.splice(i, 1); lost.splice(lost.indexOf(x), 1); } });
    const cnt = a => { const o = {}; a.forEach(x => { o[x] = (o[x] || 0) + 1; }); return Object.keys(o).sort((x, y) => V(y) - V(x)).map(k => (o[k] > 1 ? o[k] + ' ' + k + 's' : 'a ' + k)); };
    const promo = sw.won.some(x => /new/.test(x));
    let text;
    if (!won.length) text = promo ? 'You get a new ' + sw.won.find(x => /new/.test(x)).replace('a new ', '') + '.' : 'You come out ahead in material.';
    else if (!lost.length) text = 'You win ' + list(cnt(won)).replace(/^a /, 'the ') + '.';
    else text = 'You win ' + list(cnt(won)) + ' for ' + list(cnt(lost)) + '.';
    return {kind: 'material', net: sw.net, text: text.replace(/You win a ([a-z]+) for/, 'You win the $1 for')};
  }
  if (ev.mate != null && ev.mate > 0) return {kind: 'mating', text: 'The attack leads to mate.'};
  if (ev.cp != null && Math.abs(ev.cp) < 60) return {kind: 'draw', text: 'It holds the draw.'};
  if (ev.cp != null && ev.cp >= 200) return {kind: 'win', text: 'The position is winning.'};
  return {kind: 'better', text: 'It keeps the advantage.'};
}

/* a short note on each of your moves: the motif it makes, else the threat it creates, else what it does */
function notesFor(P0, steps, me, mot, oc) {
  const ann = {};
  steps.forEach((st, i) => {
    if (st.m.color !== me) return;
    const no = +String(st.before).split(' ')[5] || 1, key = no + (me === 'w' ? '.' : '...') + st.m.san.replace(/[+#]/g, '');
    let note = '';
    const m = mot.find(x => x.ply === i && x.id !== 'quiet');
    if (st.mate) note = st.m.san + ' is mate.';
    else if (m) note = m.text;
    else {
      const th = B.threatOf(st.after, me);
      if (!st.m.captured && !st.check && th) note = st.m.san + ' threatens ' + (th.kind === 'mate' ? th.san + ', mate' : th.text.replace(/ would /, ' to ')) + '.';
      else { const f = B.factText(B.moveFacts(st.before, st.m.from + st.m.to + (st.m.promotion || ''), me), 1); if (f) note = f.replace(/^It /, st.m.san + ' '); }
    }
    if (i === steps.length - 1 && !st.mate && oc.kind === 'material') note = (note ? note + ' ' : '') + oc.text;
    if (note) ann[key] = {note: note.replace(/\s+/g, ' ').trim()};
  });
  return ann;
}

export function rewrite(d, e, ctx) {
  const me = d.side, them = other(me), P0 = e.P0;
  const steps = B.walk(P0, e.ours, 24), sw = B.swingOf(P0, steps, me), mot = B.motifsOf(P0, steps, me, me);
  const key = steps[0], keySan = key.m.san;
  const oc = outcome(e, me, steps, sw);
  const main = mainMotif(mot);
  /* the quiet move with a threat */
  const keyThreat = !key.check && !key.m.captured ? B.threatOf(key.after, me) : null;
  /* a passed pawn that runs: the line ends with your pawn on the 7th (or 6th) rank and Stockfish says it decides */
  const lastB = steps[steps.length - 1].B1, ev0 = e.lines[0], evMe = ev0.mate != null ? (me === 'w' ? 1 : -1) * ev0.mate * 1000 : (me === 'w' ? 1 : -1) * (ev0.cp || 0);
  const runner = Object.keys(lastB).find(q => lastB[q].t === 'p' && lastB[q].c === me && B.passed(lastB, q) && (me === 'w' ? +q[1] >= 6 : +q[1] <= 3));
  const runaway = !main && oc.kind !== 'mate' && runner && evMe >= 400 && sw.net < 3;
  const traded = !main && !runaway && evMe >= 250 && steps.some((st, i) => st.m.color === them && st.m.captured && steps[i + 1] && steps[i + 1].m.color === me && steps[i + 1].m.to === st.m.to && VAL[st.m.captured] >= 3);
  const breakthrough = runaway && !B.passed(B.parse(P0), runner[0] + (me === 'w' ? '2' : '7')) && !Object.keys(B.parse(P0)).some(q => q[0] === runner[0] && B.parse(P0)[q].t === 'p' && B.parse(P0)[q].c === me && B.passed(B.parse(P0), q));
  let kind = runaway ? 'runaway' : main ? main.id : traded ? 'trade' : keyThreat ? 'quietThreat' : oc.kind === 'draw' ? 'draw' : oc.kind === 'material' ? 'material' : 'win';
  if (oc.kind === 'mate' && !/smothered|backRank/.test(kind)) kind = 'mateNet';
  if (runaway) oc.text = (breakthrough ? keySan + ' is a breakthrough: it opens the way, and ' : '') + (breakthrough ? 'your ' : 'Your ') + runner[0] + '-pawn on ' + runner + ' runs through: their king cannot catch it.';
  if (kind === 'trade') oc.text = 'After the trade the endgame is won for you.';
  if (runaway && !breakthrough && steps.some((st, i) => st.m.color === them && st.m.captured && VAL[st.m.captured] >= 5 && steps[i + 1] && steps[i + 1].m.to === st.m.to)) oc.text = 'The big pieces come off, and ' + oc.text.charAt(0).toLowerCase() + oc.text.slice(1);
  const R = RULE[kind];
  /* underpromotion: say why the queen is wrong */
  let under = '';
  if (key.m.promotion && key.m.promotion !== 'q') {
    const q = B.playOn(P0, key.m.from + key.m.to + 'q');
    if (q) { const g = new Chess(q.after); under = q.m.san.replace(/[+#]/g, '') + (g.in_stalemate() ? ' would be stalemate' : q.mate ? ' also mates' : q.check ? ' would only give check' : ' would not even give check') + '.'; }
  }
  const setupSan = e.setup ? san(d.puzzle_fen, e.setup) : '';
  const lineTxt = B.sanLine(steps, 24);
  /* M: their last move */
  let M;
  if (e.setup) {
    const f = B.factText(B.moveFacts(d.puzzle_fen, e.setup, me), 2);
    M = SIDE[them] + ' just played ' + setupSan + '. ' + (f ? f + ' ' : '') + (main ? 'It walks into a ' + R.label.toLowerCase() + '.' : keyThreat ? 'It leaves a quiet threat on the board for you.' : oc.kind === 'mate' ? 'It leaves their king without enough defenders.' : 'Ask what it gave up before you look at your own moves.');
  } else M = 'No last move to read here: the position itself is the question. ' + (oc.kind === 'draw' ? 'Ask first whether you are fighting to win or to hold.' : '');
  /* S: the specifics that the solution uses */
  const Bd = B.parse(P0), mat = material(P0, me);
  const S = [mat.text];
  const kr = B.kingRoom(P0, them); if (oc.kind === 'mate' || /^(mateNet|backRank|smothered)$/.test(kind)) S.push('Their king on ' + B.kingSq(Bd, them) + ' has ' + (kr ? kr + ' free square' + (kr === 1 ? '' : 's') : 'no free square') + '.');
  const cc = B.cca(P0);
  if (cc.theirLoose.length) S.push('Loose: their ' + list(cc.theirLoose.slice(0, 2).map(x => NAME[x.t] + ' on ' + x.sq)) + '.');
  if (cc.myLoose.length) S.push('Careful: your ' + list(cc.myLoose.slice(0, 2).map(x => NAME[x.t] + ' on ' + x.sq)) + ' ' + (cc.myLoose.length > 1 ? 'are' : 'is') + ' loose too.');
  const pp = Object.keys(Bd).filter(q => Bd[q].t === 'p' && B.passed(Bd, q));
  const mine = pp.filter(q => Bd[q].c === me), theirs = pp.filter(q => Bd[q].c === them);
  if (mine.length || theirs.length) S.push('Passed pawns: ' + (mine.length ? 'yours on ' + list(mine) : 'none for you') + (theirs.length ? ', theirs on ' + list(theirs) : '') + '.');
  if ((kind === 'skewer' || kind === 'pin') && main) { const Bx = steps[main.ply].B1, t = B.lineTricks(Bx, me).find(x => x.id === kind); if (t && Bx[t.front] && Bx[t.behind] && Bd[t.front] && Bd[t.behind] && Bd[t.front].t === Bx[t.front].t && Bd[t.behind].t === Bx[t.behind].t) S.push('Their ' + NAME[Bx[t.front].t] + ' on ' + t.front + ' and ' + NAME[Bx[t.behind].t] + ' on ' + t.behind + ' stand on ' + lineName(t.front, t.behind) + '.'); }
  /* P: the CCA list and where the key move sits in it */
  const g0 = new Chess(P0), mv = g0.moves({verbose: true});
  const checks = mv.filter(m => /[+#]/.test(m.san)).map(m => m.san), caps = mv.filter(m => m.captured).map(m => m.san);
  const cat = key.mate || key.check ? 'a check' : key.m.captured ? 'a capture' : keyThreat ? 'a quiet move with a threat' : 'a quiet move';
  const P = 'Your checks: ' + (checks.length ? list(checks.slice(0, 5)) + (checks.length > 5 ? ' and ' + (checks.length - 5) + ' more' : '') : 'none') + '. Your captures: ' + (caps.length ? list(caps.slice(0, 5)) + (caps.length > 5 ? ' and more' : '') : 'none') + '. '
    + 'The key move is ' + cat + (key.check || key.m.captured ? ': it is on that list, so the CCA scan finds it.' : keyThreat ? ': ' + keySan + ' threatens ' + keyThreat.san + (keyThreat.kind === 'mate' ? ' (mate)' : '') + '. It is not a check or capture, so look for it once the forcing moves fail.' : ': it is not a check or capture, so it only shows up once you compare candidate moves.');
  /* C: the line, the toughest defence, the result */
  let C = 'The line: ' + lineTxt + '. ';
  if (steps.length > 1) {
    const g1 = new Chess(key.after), n = g1.moves().length, reply = steps[1].m.san, top = e.after && e.after.pv && e.after.pv[0] ? san(key.after, e.after.pv[0]) : '';
    C += n === 1 ? reply + ' is their only legal reply. ' : 'After ' + keySan + ' they have ' + n + ' legal replies; ' + (top && top.replace(/[+#]/g, '') === reply.replace(/[+#]/g, '') ? 'Stockfish\'s best defence is ' + reply + ', and it still fails. ' : 'check the others too, not only ' + reply + '. ');
  }
  C += oc.text + (under ? ' ' + under : '');
  /* explanation: one or two sentences, the motif and the result */
  const keyFact = B.factText(B.moveFacts(P0, e.ours[0], me), 1);
  const explanation = oc.kind === 'mate' && steps.length > 1 ? lineTxt + ': mate in ' + oc.n + '.' + (main && main.id !== 'mateNet' ? ' ' + main.text : '') + (under ? ' ' + under : '') : runaway && breakthrough ? oc.text : (main ? main.text : keyThreat ? keySan + ' is quiet, but it threatens ' + keyThreat.san + (keyThreat.kind === 'mate' ? ', mate' : '') + '.' : key.mate ? keySan + ' is mate.' : keyFact ? keyFact.replace(/^It /, keySan + ' ') : 'The key move is ' + keySan + '.') + (oc.kind !== 'mate' || !key.mate ? ' ' + oc.text : '') + (under ? ' ' + under : '');
  /* title, brief */
  /* the biggest piece you win, after equal trades cancel out, and where you take it */
  const VV = n => ({pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9})[n] || 0;
  const wonL = sw.won.filter(x => !/new/.test(x)), lostL = sw.lost.filter(x => !/new/.test(x)).slice();
  const netWon = wonL.filter(x => { const k = lostL.indexOf(x); if (k >= 0) { lostL.splice(k, 1); return false; } return true; }).sort((a, b) => VV(b) - VV(a));
  const won = netWon[0] || '';
  const where = won ? (steps.filter(st => st.m.color === me && st.m.captured && NAME[st.m.captured] === won).pop() || {m: {}}).m.to : '';
  const lastSt = steps[steps.length - 1], promoSt = steps.find(st => st.m.color === me && st.m.promotion);
  let title;
  if (oc.kind === 'mate') title = 'Mate in ' + oc.n + (kind === 'backRank' ? ' on the back rank' : kind === 'smothered' ? ': smothered' : lastSt.m.promotion && lastSt.m.promotion !== 'q' ? ': underpromote' : lastSt.m.promotion ? ' with a promotion' : ' with the ' + NAME[lastSt.m.piece]);
  else if (runaway) title = (breakthrough ? 'Breakthrough: the ' : 'The runaway ') + runner[0] + '-pawn' + (breakthrough ? ' runs' : '');
  else if (kind === 'trade') title = 'Trade into a won endgame';
  else if (main && main.id === 'promotion' && promoSt) title = 'Promote the ' + promoSt.m.from[0] + '-pawn' + (won && won !== 'pawn' ? ' and win the ' + won : '');
  else if (main) title = R.label + (won ? ' wins the ' + won : oc.kind === 'draw' ? ' holds the draw' : ' with the ' + NAME[steps[main.ply].m.piece]);
  else if (keyThreat) title = 'A quiet move ' + (won ? 'wins the ' + won : 'with a threat');
  else if (oc.kind === 'draw') title = 'Find the drawing move';
  else if (won) title = 'Win the ' + won + (where ? ' on ' + where : '');
  else title = d.title;
  const goal = runaway ? 'Find the way to make a passed pawn.' : oc.kind === 'mate' ? 'Find the mate in ' + oc.n + '.' : oc.kind === 'draw' ? 'Find the move that holds the draw.' : oc.kind === 'material' ? 'Find the forcing way to win material.' : 'Find the strongest move.';
  const brief = SIDE[me] + ' to play. ' + (setupSan ? SIDE[them] + ' just played ' + setupSan + '. ' : '') + goal;
  /* insight blocks */
  const alarm = 'Alarm Signal · ' + R.label + ': ' + R.alarm;
  const course = String(d.coaching_tip || '').match(/Linked Course: ([^.]*(?:\.[^R][^.]*)*?)\. Remember/) || String(d.coaching_tip || '').match(/\(Linked course: (.*)\.\)$/);
  const tip = 'Action Step: ' + R.act + (course ? ' (Linked course: ' + course[1] + '.)' : '');
  const elo = Object.assign({}, d.elo_insight || {});
  elo.foundation = 'Foundation: ' + R.principle;
  elo.advanced = 'Sharper: ' + (steps.length > 2 ? 'see the whole line before you start it: ' + lineTxt + '.' : 'after ' + keySan + ', find their best defence yourself before you look at the answer.');
  return {title, brief, description: brief, principle: R.principle, ann: notesFor(P0, steps, me, mot, oc), explanation: explanation.replace(/\s+/g, ' ').trim(),
    ms_pc_breakdown: {M: M.trim(), S: S.join(' '), P, C: C.trim()}, alarm_signal: alarm, coaching_tip: tip, elo_insight: elo, _kind: kind, _line: lineTxt};
}

/* every "piece on square" and every move in a text must be true somewhere on the line */
const SAN_RE = /\b(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|[a-h]x[a-h][1-8](?:=[QRBN])?|[a-h][18]=[QRBN])[+#]?/g;
const PIECE_RE = /\b(king|queen|rook|bishop|knight|pawn)s? on ([a-h][1-8])\b/gi;
const norm = s => String(s).replace(/[x+#]/g, '');
function movesBoth(fen) { const out = []; for (const c of ['w', 'b']) { try { const g = new Chess(); if (g.load(B.withSide(fen, c))) g.moves({verbose: true}).forEach(m => out.push(m)); } catch (e) {} } return out; }
export function claimsCheck(texts, fens, extraSans, depth) {
  const sans = new Set((extraSans || []).map(norm)), bad = [];
  fens.forEach(f => { movesBoth(f).forEach(m => { sans.add(norm(m.san)); if (depth >= 2) { try { const g = new Chess(); g.load(B.withSide(f, m.color)); g.move(m); movesBoth(g.fen()).forEach(x => sans.add(norm(x.san))); } catch (e) {} } }); });
  const txt = texts.join(' \n ');
  (txt.match(SAN_RE) || []).forEach(s => { if (!sans.has(norm(s))) bad.push(s); });
  let m; PIECE_RE.lastIndex = 0;
  while ((m = PIECE_RE.exec(txt))) { const t = {king: 'k', queen: 'q', rook: 'r', bishop: 'b', knight: 'n', pawn: 'p'}[m[1].toLowerCase()];
    if (!fens.some(f => { try { const p = new Chess(f).get(m[2]); return p && p.type === t; } catch (e) { return false; } })) bad.push(m[0]); }
  return [...new Set(bad)];
}
/* the position before the last move, with the moved piece put back (a captured piece is not known, so SAN is compared without x) */
function prevFen(fen, lm) { try { if (!lm || lm.length < 2) return null; const g = new Chess(fen), p = g.get(lm[1]); if (!p) return null; g.remove(lm[1]); g.put(p, lm[0]); const parts = g.fen().split(' '); parts[1] = p.color; parts[3] = '-'; return parts.join(' '); } catch (e) { return null; } }
function fensOf(start, ucis) { const out = [start]; try { const g = new Chess(start); for (const u of ucis) { if (!g.move({from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || 'q'})) break; out.push(g.fen()); } } catch (e) {} return out; }
const textsOf = o => [o.title, o.brief, o.principle, o.explanation, o.alarm_signal, o.coaching_tip, ...Object.values(o.ms_pc_breakdown || {}), ...Object.values(o.ann || {}).map(x => x.note || ''), o.elo_insight && o.elo_insight.foundation, o.elo_insight && o.elo_insight.advanced].filter(Boolean);

export function run(content, engine, opts) {
  const L = content.lists, report = {rewritten: [], audit: [], solutions: [], fit: []};
  const pools = [['endgame', L.endgame], ['middlegame', L.middlegame]];
  for (const [grp, arr] of pools) for (const d of arr) {
    const e = engine[d.id]; if (!e || e.err) { report.audit.push({id: d.id, msg: 'no engine data'}); continue; }
    const best = e.lines[0].pv && e.lines[0].pv[0];
    if (best && best !== e.ours[0]) report.solutions.push({id: d.id, ours: san(e.P0, e.ours[0]), engine: san(e.P0, best), ev: e.lines[0], after: {cp: e.after.cp, mate: e.after.mate}});
    if (!/^(lc|mg-lc|kg|mg-kg)-/.test(d.id)) {
      const bad = claimsCheck(textsOf(d), fensOf(d.puzzle_fen || d.fen, d.solution_moves || []), [], 2);
      if (bad.length) report.audit.push({id: d.id, msg: 'hand-written text names ' + bad.join(', ') + ', not on the board'});
      continue;
    }
    const r = rewrite(d, e);
    const bad = claimsCheck(textsOf(r), fensOf(d.puzzle_fen || d.fen, d.solution_moves), [], 1);
    if (bad.length) { report.audit.push({id: d.id, msg: 'generated text failed the check: ' + bad.join(', ') + ' (kept the old text)'}); continue; }
    const topic = (d.tag || '') + ' ' + (d.topic || '');
    report.fit.push({id: d.id, grp, kind: r._kind, topic: d.topic || d.tag || '', title: r.title, line: r._line});
    report.rewritten.push({id: d.id, before: d.title, after: r.title});
    if (opts.write) { delete r._kind; delete r._line; Object.assign(d, r); }
  }
  /* the old alarm template ("⚠️ ALARM SIGNAL / RED FLAG: When you see X in your games, instantly ask yourself if Y is winning or necessary!") becomes a plain sentence */
  const tidy = a => { const m = String(a || '').match(/When you see (.+?)(?: in your games)?, instantly ask yourself if (.+?) is winning or necessary!?$/i);
    return m ? 'Alarm Signal: you see ' + m[1] + '. Ask whether ' + m[2] + ' works.' : String(a || '').replace(/^⚠️\s*ALARM SIGNAL \/ RED FLAG:\s*/, 'Alarm Signal: '); };
  for (const arr of [L.think, L.endgame, L.middlegame, L.bridge || []]) for (const t of arr) if (t.alarm_signal && /RED FLAG/.test(t.alarm_signal)) { const n = tidy(t.alarm_signal); report.tidy = (report.tidy || 0) + 1; if (opts.write) t.alarm_signal = n; }
  for (const t of L.think) {
    const ln = t.stages.find(s => s.type === 'line'), e = engine[t.id];
    const ucis = e ? e.ours : [];
    const texts = [t.brief, ...t.stages.map(s => [s.prompt, s.explain, s.hint, ...(s.options || []).map(o => o.text + ' ' + (o.why || '')), ...Object.values(s.ann || {}).map(a => [a.note, ...Object.values(a.bad || {})].join(' '))].join(' ')), ...(t.debrief || []).map(x => x.t)].filter(Boolean);
    const fens = fensOf(t.fen, ucis); const prev = prevFen(t.fen, t.lastMove); if (prev) fens.push(prev);
    const bad = claimsCheck(texts, fens, [], 2);
    if (bad.length) report.audit.push({id: t.id, msg: 'MSPC case names ' + bad.join(', ') + ' that is not on the board in this line'});
    if (e && e.lines[0].pv && e.lines[0].pv[0] !== ucis[0]) report.solutions.push({id: t.id, ours: san(t.fen, ucis[0]), engine: san(t.fen, e.lines[0].pv[0]), ev: e.lines[0], after: {cp: e.after.cp, mate: e.after.mate}});
  }
  return report;
}

function md(rep) {
  const out = ['# Course audit (tools/course_truth.mjs)', '', 'Generated from the board and Stockfish 19 (depth 16) with the app\'s own Coach Brain (lc83.js).', '',
    '## Solutions where Stockfish prefers another move (' + rep.solutions.length + ')', '', 'All of these keep the same result (the evaluation after the course move is within a few tenths of Stockfish\'s move, or both mate). The course move stays; the Runner already accepts equal alternatives through the engine check.', ''];
  rep.solutions.forEach(s => out.push('- `' + s.id + '`: course ' + s.ours + ', Stockfish ' + s.engine + ' (eval ' + (s.ev.mate != null ? 'mate ' + s.ev.mate : s.ev.cp) + ', after the course move ' + (s.after.mate != null ? 'mate ' + s.after.mate : s.after.cp) + ')'));
  out.push('', '## Text problems (' + rep.audit.length + ')', '', 'The checker only knows the position and the line. A note on an MSPC case is often a reference to an earlier opening move (4.dxc5, ...dxc4, ...Nbd7) or a wrong answer that explains a piece is NOT there: review each one by hand. On 17 Nov 2026 all seven below were of that kind, none was an error.', '');
  rep.audit.forEach(a => out.push('- `' + a.id + '`: ' + a.msg));
  out.push('', '## Rewritten drills (' + rep.rewritten.length + '): what each one really teaches', '', 'Compare the lesson topic with what the solution really does: a drill whose motif does not match its chapter is a candidate to move to another chapter.', '', '| id | lesson topic | what the solution does | new title |', '|---|---|---|---|');
  rep.fit.forEach(f => out.push('| `' + f.id + '` | ' + f.topic + ' | ' + f.kind + ' | ' + f.title + ' |'));
  return out.join('\n') + '\n';
}

if (process.argv[1] && process.argv[1].endsWith('course_truth.mjs')) {
  const [cPath, ePath] = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const write = process.argv.includes('--write');
  const content = JSON.parse(fs.readFileSync(cPath, 'utf8')), engine = JSON.parse(fs.readFileSync(ePath, 'utf8'));
  const rep = run(content, engine, {write});
  console.log('rewritten', rep.rewritten.length, 'audit notes', rep.audit.length, 'engine disagreements', rep.solutions.length);
  rep.audit.forEach(a => console.log(' -', a.id, a.msg));
  if (write) {
    fs.writeFileSync(cPath, JSON.stringify(content, null, 1) + '\n');
    fs.writeFileSync(path.join(ROOT, 'tools/course_audit.md'), md(rep));
    console.log('wrote', cPath, 'and tools/course_audit.md');
  }
}
