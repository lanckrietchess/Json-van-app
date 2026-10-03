/* ==========================================================================
   v6 EXECUTIVE LAYER, part 1: the engine.
   Pure functions, no DOM, no storage: everything here is a rule or a
   formula, so it can be tested on its own. Part 2 (the screens and the
   hooks into the trainers) calls it.
   Tuning knobs: V6Core.CFG.
   ========================================================================== */
const V6Core = (() => {
  const clampN = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const num = (v, d) => (v !== null && v !== undefined && v !== '' && Number.isFinite(+v) ? +v : d);
  const r2 = (x) => Math.round(x * 100) / 100;

  const CFG = {
    modules: ['openings', 'middlegame', 'endgame', 'puzzles', 'think'],
    labels: { openings: 'Openings', middlegame: 'Middlegame', endgame: 'Endgames', puzzles: 'Puzzles', think: 'MSPC thinking' },
    /* the Student Rank is the weighted mean of the module ranks */
    weights: { openings: 1, middlegame: 1.2, endgame: 0.8, puzzles: 1, think: 1.2 },
    /* XP for one correct first-try answer, before multipliers */
    base: { openings: 8, middlegame: 12, endgame: 12, think: 12 },
    puzzleBase: { min: 8, max: 34, perRating: 14, ref: 1200 },
    ranks: [['Foundation', 0], ['Developing', 300], ['Competent', 1200], ['Proficient', 3500], ['Advanced', 8000], ['Expert', 16000], ['Master', 30000], ['Grandmaster', 60000]],
    /* Arena: rating from live tournaments. Ring colour on the avatar, global XP multiplier. */
    arena: [['Entry', 0, '#475569', 1], ['Silver', 1150, '#94a3b8', 1.03], ['Gold', 1300, '#eab308', 1.06], ['Platinum', 1500, '#38bdf8', 1.1], ['Diamond', 1750, '#a78bfa', 1.15], ['Elite', 2000, '#e2e8f0', 1.2]],
    arenaRating: { start: 1100, floor: 1000, cap: 3000, maxWeek: 60 },
    balancer: { max: 1.2, min: 0.8, deadZone: 0.25, perRank: 0.1, minTrained: 2 },
    /* flow: first-try answers in a row -> multiplier */
    flow: [[0, 1], [3, 1.05], [5, 1.1], [8, 1.2], [12, 1.35], [18, 1.55], [25, 1.8], [35, 2.1], [50, 2.5]],
    flowNames: [[0, 'Warming up'], [3, 'Flow'], [12, 'Deep flow'], [25, 'Elite flow'], [50, 'Grandmaster Flow']],
    redeem: { windowMs: 120000, minCount: 3, need: 3 },       // Anti-Ragequit: 2 minutes, 3 in a row restore the chain
    /* day streak -> XP boost; a day counts once there is one correct answer */
    days: [[7, 1.05], [14, 1.08], [30, 1.12], [60, 1.16], [100, 1.2], [180, 1.25], [365, 1.3]],
    maxMult: 6,                                               // all multipliers except the admin event
    hourglass: {
      limit: { openings: 8, middlegame: 25, endgame: 30, puzzles: 60, think: 40 },       // seconds per answer in hard mode
      mult: { openings: 1.5, middlegame: 1.35, endgame: 1.35, puzzles: 1.3, think: 1.3 },
      reactive: 0.5, grace: 800
    },
    hint: { penalty: [0, 0.1, 0.35, 0.85], rank: [0, 0, 0, 0.5] },   // tier 0..3: share of the XP lost, share of the base taken off the module
    second: { free: 5, paid: 50, tokenCost: 1 },
    boss: { min: 12, max: 60, hardcoreShare: 0.1, hardcoreMin: 2, hardcoreMax: 6, xp: 40, strictXp: 120 },
    decayDays: 21,
    missOpp: { prevLoss: 15, myLoss: 6, minWin: 60 },
    bench: { phases: [[0.4, 1.1], [0.7, 1.15], [1, 1.2]], minContribution: 100, goals: { xp: 250000, correct: 20000, puzzles: 3000, boss: 400 } }
  };

  /* ---------- ranks ---------- */
  function rankOf(xp, ladder) {
    const L = ladder || CFG.ranks, v = Math.max(0, num(xp, 0));
    let i = 0;
    while (i + 1 < L.length && v >= L[i + 1][1]) i++;
    const lo = L[i][1], hi = i + 1 < L.length ? L[i + 1][1] : null;
    return { i, name: L[i][0], next: hi == null ? '' : L[i + 1][0], pct: hi == null ? 1 : (v - lo) / (hi - lo), xp: v, toNext: hi == null ? 0 : hi - v, exact: i + (hi == null ? 0 : (v - lo) / (hi - lo)) };
  }
  function moduleRanks(xpMap) {
    const out = {};
    CFG.modules.forEach((m) => { const r = rankOf((xpMap || {})[m]); out[m] = Object.assign(r, { index: r.exact }); });
    return out;
  }
  function studentRank(mr) {
    let sw = 0, s = 0, trained = 0;
    CFG.modules.forEach((m) => { const w = CFG.weights[m] || 1; sw += w; s += w * ((mr[m] && mr[m].exact) || 0); if (mr[m] && mr[m].xp > 0) trained++; });
    const exact = sw ? s / sw : 0, i = clampN(Math.floor(exact), 0, CFG.ranks.length - 1);
    return { exact, i, name: CFG.ranks[i][0], trained };
  }
  function arenaRank(rating) {
    const r = num(rating, 0);
    if (!(r > 0)) return { i: 0, name: 'Unranked', rating: 0, color: CFG.arena[0][2], mult: 1 };
    let i = 0;
    CFG.arena.forEach((a, k) => { if (r >= a[1]) i = k; });
    const a = CFG.arena[i];
    return { i, name: a[0], rating: Math.round(r), color: a[2], mult: a[3] };
  }
  /* the Overall rank: 70% student, 30% arena (scaled to the same ladder), student only until the first tournament */
  function overallRank(student, arena) {
    const top = CFG.ranks.length - 1, a = arena && arena.rating > 0 ? arena.i / (CFG.arena.length - 1) * top : null;
    const exact = a == null ? student.exact : student.exact * 0.7 + a * 0.3, i = clampN(Math.round(exact - 0.001), 0, top);
    return { exact, i, name: CFG.ranks[i][0] };
  }
  /* ---------- weak-spot balancer: boost the weak modules, brake the strong ones ---------- */
  function balancer(modExact, studentExact, trained) {
    const B = CFG.balancer;
    if (num(trained, 0) < B.minTrained) return 1;
    const gap = studentExact - modExact;
    if (Math.abs(gap) < B.deadZone) return 1;
    return r2(clampN(1 + gap * B.perRank, B.min, B.max));
  }
  /* ---------- flow multipliers and the Anti-Ragequit window ---------- */
  function flowMult(count) { let m = 1; CFG.flow.forEach((f) => { if (count >= f[0]) m = f[1]; }); return m; }
  function flowName(count) { let n = ''; CFG.flowNames.forEach((f) => { if (count >= f[0]) n = f[1]; }); return n; }
  const flowNew = () => ({ count: 0, best: 0, saved: 0, protect: null });
  function flowHit(f, now) {
    now = num(now, Date.now());
    const s = Object.assign(flowNew(), f), R = CFG.redeem;
    let redeemed = false;
    if (s.protect && now > s.protect.until) s.protect = null;
    if (s.protect) {
      s.protect = Object.assign({}, s.protect, { got: (s.protect.got || 0) + 1 });
      if (s.protect.got >= R.need) { s.count = s.protect.count + s.protect.got; s.saved++; s.protect = null; redeemed = true; }
      else s.count++;
    } else s.count++;
    s.best = Math.max(s.best, s.count);
    return { flow: s, redeemed };
  }
  function flowMiss(f, now) {
    now = num(now, Date.now());
    const s = Object.assign(flowNew(), f), R = CFG.redeem;
    const had = s.count;
    s.protect = !s.protect && had >= R.minCount ? { count: had, got: 0, until: now + R.windowMs } : null;   // a second miss inside the window cancels it
    s.count = 0;
    return { flow: s, lost: had, protectedUntil: s.protect ? s.protect.until : 0 };
  }
  /* ---------- day streak ---------- */
  function dayBoost(days) { let m = 1; CFG.days.forEach((d) => { if (num(days, 0) >= d[0]) m = d[1]; }); return m; }
  function nextDayBoost(days) { const d = CFG.days.filter((x) => x[0] > num(days, 0))[0]; return d ? { at: d[0], mult: d[1] } : null; }
  /* ---------- the hourglass ---------- */
  const hgLimit = (module) => CFG.hourglass.limit[module] || 30;
  function hgMult(module, mode, elapsedMs) {
    const H = CFG.hourglass, full = H.mult[module] || 1.3, lim = hgLimit(module) * 1000 + H.grace, t = num(elapsedMs, Infinity);
    if (mode === 'hard') return t <= lim ? full : 1;                        // pre-commitment: the full multiplier, only inside the limit
    return t <= lim * H.reactive ? r2(1 + (full - 1) / 2) : 1;                // reactive: half the bonus for lightning intuition
  }
  /* ---------- hints ---------- */
  const hintPenalty = (tier) => CFG.hint.penalty[clampN(Math.round(num(tier, 0)), 0, 3)];
  const hintRank = (tier) => CFG.hint.rank[clampN(Math.round(num(tier, 0)), 0, 3)];
  /* ---------- XP for one answer ---------- */
  function puzzleBase(rating) {
    const P = CFG.puzzleBase, r = num(rating, 0) > 0 ? rating : P.ref;
    return clampN(Math.round(P.perRating * clampN(r / P.ref, 0.6, 2.4)), P.min, P.max);
  }
  const baseFor = (module, puzzleRating) => (module === 'puzzles' ? puzzleBase(puzzleRating) : CFG.base[module] || 8);
  function xp(o) {
    const base = o.base != null ? num(o.base, 0) : baseFor(o.module, o.puzzleRating);
    const parts = {
      balancer: num(o.balancer, 1), flow: num(o.flow, 1), streak: num(o.streak, 1), arena: num(o.arena, 1),
      bench: num(o.bench, 1), hourglass: num(o.hourglass, 1), boss: num(o.boss, 1)
    };
    let mult = 1;
    Object.keys(parts).forEach((k) => { mult *= parts[k]; });
    mult = Math.min(mult, CFG.maxMult);
    const ev = num(o.event, 1), pen = hintPenalty(o.hintTier);
    const total = base * mult * ev * (1 - pen);
    return { base, parts, mult: r2(mult), event: ev, hintPenalty: pen, xp: Math.max(0, Math.round(total)), potential: Math.round(base * mult * ev), rankPenalty: Math.round(base * hintRank(o.hintTier)) };
  }
  /* ---------- the second chance ---------- */
  const secondLimit = (paid) => (paid ? CFG.second.paid : CFG.second.free);
  const secondLeft = (state, paid, day) => Math.max(0, secondLimit(paid) - (state && state.day === day ? num(state.used, 0) : 0));
  /* ---------- Skill Matrix and Boss Fights ---------- */
  /* chapters in order; a chapter opens when the Boss Fight of the one before it is cleared. */
  function chapterStatuses(chapters, completed) {
    const done = completed || {};
    let prevOk = true;
    return chapters.map((c, i) => {
      const cleared = !!done[c.boss], strict = !!done[c.boss + ':strict'];
      const open = i === 0 || prevOk, st = { id: c.id, i, open, cleared: open && cleared, strict: open && strict, locked: !open };
      prevOk = open && cleared;
      return st;
    });
  }
  /* A Boss Fight is a shuffle of the chapter's open lines: 12 to 60 of your own correct moves. */
  function bossPlan(lines, rnd) {
    const B = CFG.boss, r = rnd || Math.random, pool = lines.filter((l) => l && l.userMoves > 0);
    if (!pool.length) return { lines: [], size: 0 };
    const order = pool.map((l) => ({ l, k: r() })).sort((a, b) => a.k - b.k).map((x) => x.l);
    const out = [];
    let size = 0, guard = 0;
    while (size < B.min && guard++ < 400) { const l = order[out.length % order.length]; out.push(l); size += l.userMoves; }   // short chapters repeat their lines
    if (size < B.min) return { lines: [], size: 0 };
    for (let k = 0; k < order.length && size < B.max; k++) {                                                                  // long chapters bring the rest, up to the cap
      const l = order[k];
      if (out.indexOf(l) >= 0) continue;
      if (size + l.userMoves > B.max) continue;
      out.push(l); size += l.userMoves;
    }
    while (size > B.max && out.length > 1) { size -= out.pop().userMoves; }
    return { lines: out, size };
  }
  function mistakeLimit(size, mode) {
    if (mode === 'strict') return 0;
    const B = CFG.boss;
    return clampN(Math.ceil(num(size, 0) * B.hardcoreShare), B.hardcoreMin, B.hardcoreMax);
  }
  /* ---------- bounties ---------- */
  function hashStr(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  /* weakest modules first; ties go to the module the player has trained least */
  function weakest(mr, studentExact) {
    return CFG.modules.slice().sort((a, b) => ((mr[a] ? mr[a].exact : 0) - (mr[b] ? mr[b].exact : 0)) || (CFG.modules.indexOf(a) - CFG.modules.indexOf(b)));
  }
  function rollBounties(kind, key, order) {
    const weak = order && order.length ? order : CFG.modules.slice(), pick = weak[hashStr(kind + key) % Math.min(2, weak.length)], L = CFG.labels;
    const mk = (id, metric, module, target, label, reward) => ({ id: kind + ':' + id, metric, module: module || '', target, label, reward, progress: 0, done: false });
    if (kind === 'weekly') return [
      mk('mod', 'correct', pick, 60, 'Answer ' + 60 + ' correctly in ' + L[pick], { xp: 150, tokens: 1 }),
      mk('boss', 'boss', '', 1, 'Clear a Boss Fight', { xp: 200, tokens: 2 }),
      mk('xp', 'xp', '', 1500, 'Earn 1,500 XP', { xp: 300, tokens: 3 })
    ];
    return [
      mk('mod', 'correct', pick, 10, 'Answer 10 correctly in ' + L[pick], { xp: 40, tokens: 0 }),
      mk('flow', 'flow', '', 6, 'Reach a flow of 6', { xp: 40, tokens: 0 }),
      mk('xp', 'xp', '', 150, 'Earn 150 XP', { xp: 0, tokens: 1 })
    ];
  }
  /* ev: { type: 'correct'|'xp'|'boss', module, n, flow } -> the list of bounties that just completed */
  function bountyBump(items, ev) {
    const fin = [];
    (items || []).forEach((b) => {
      if (b.done) return;
      if (b.metric === 'correct' && ev.type === 'correct' && (!b.module || b.module === ev.module)) b.progress += 1;
      else if (b.metric === 'xp' && ev.type === 'xp') b.progress += num(ev.n, 0);
      else if (b.metric === 'boss' && ev.type === 'boss') b.progress += 1;
      else if (b.metric === 'flow' && ev.type === 'correct') b.progress = Math.max(b.progress, num(ev.flow, 0));
      if (b.progress >= b.target) { b.progress = b.target; b.done = true; fin.push(b); }
    });
    return fin;
  }
  /* ---------- community benchmarks ---------- */
  function benchPhase(total, goal) {
    const g = Math.max(1, num(goal, 1)), p = Math.max(0, num(total, 0)) / g;
    let phase = -1, mult = 1;
    CFG.bench.phases.forEach((ph, i) => { if (p >= ph[0]) { phase = i; mult = ph[1]; } });
    return { pct: Math.min(1, p), phase, mult };
  }
  const benchBuff = (phase, mine, min) => (phase && phase.mult > 1 && num(mine, 0) >= num(min, CFG.bench.minContribution) ? phase.mult : 1);
  /* ---------- Arena rating after a settled week ---------- */
  function arenaUpdate(rating, rank, players) {
    const A = CFG.arenaRating, r = num(rating, A.start), n = Math.max(1, Math.round(num(players, 1))), k = clampN(Math.round(num(rank, n)), 1, n);
    const p = n > 1 ? 1 - (k - 1) / (n - 1) : 0.5, weight = clampN(n / 8, 0.25, 1);
    return clampN(Math.round(r + (p - 0.5) * 2 * A.maxWeek * weight), A.floor, A.cap);
  }
  /* ---------- events from the Master Event Engine ---------- */
  function eventActive(e, now) { return !!e && e.on !== false && num(e.start, 0) <= now && (!num(e.end, 0) || now < e.end); }
  function activeEvents(list, now) { return (Array.isArray(list) ? list : []).filter((e) => eventActive(e, num(now, Date.now()))); }
  const eventMult = (list, now) => activeEvents(list, now).reduce((m, e) => m * clampN(num(e.xpMult, 1), 0.5, 5), 1);
  /* ---------- Shuffle Trainer filters ---------- */
  /* ctx: { progress, now, decay (days), mistakes(id), leak: { M: {id: 1}, ... } } */
  function filterLines(pool, mode, ctx) {
    const c = ctx || {}, now = num(c.now, Date.now()), decay = (num(c.decay, CFG.decayDays)) * 864e5, P = c.progress || {};
    if (mode === 'notseen') return pool.filter((x) => !P[x.id]);
    if (mode === 'frontline') return pool.filter((x) => { const p = P[x.id]; return p && num(p.last, 0) > 0 && now - p.last >= decay; });
    if (mode === 'mistakes') return pool.filter((x) => typeof c.mistakes === 'function' && c.mistakes(x.id));
    if (/^leak:[MSPC]$/.test(mode)) { const set = (c.leak || {})[mode.slice(5)] || {}; return pool.filter((x) => set[x.id]); }
    return pool;
  }
  /* The ideal mix: first what is fading or went wrong, then what you have never seen, then the weakest rest. */
  function smartMix(pool, ctx, n, rnd) {
    const r = rnd || Math.random, size = Math.max(1, Math.min(pool.length, num(n, 30))), P = (ctx || {}).progress || {};
    const take = (list, k, used) => { const out = []; for (const x of list) { if (out.length >= k) break; if (!used[x.id]) { used[x.id] = 1; out.push(x); } } return out; };
    const used = {};
    const urgent = filterLines(pool, 'mistakes', ctx).concat(filterLines(pool, 'frontline', ctx)).sort((a, b) => ((P[a.id] ? P[a.id].best : 0) - (P[b.id] ? P[b.id].best : 0)) || r() - 0.5);
    const fresh = filterLines(pool, 'notseen', ctx).sort(() => r() - 0.5);
    const rest = pool.filter((x) => P[x.id]).sort((a, b) => (P[a.id].best - P[b.id].best) || r() - 0.5);
    const out = take(urgent, Math.ceil(size * 0.4), used).concat(take(fresh, Math.ceil(size * 0.3), used));
    out.push.apply(out, take(rest, size - out.length, used));
    if (out.length < size) out.push.apply(out, take(pool.slice().sort(() => r() - 0.5), size - out.length, used));
    return out;
  }
  /* ---------- game review icons ---------- */
  const ICONS = {
    brilliant: ['!!', 'Brilliant', 'A sacrifice that Stockfish confirms wins more.'],
    great: ['!', 'Great', 'The only move that kept the position.'],
    best: ['★', 'Best', 'The engine’s first choice.'],
    good: ['✔', 'Good', 'Keeps the evaluation.'],
    inaccuracy: ['?!', 'Inaccuracy', 'Gives up a little.'],
    mistake: ['?', 'Mistake', 'Gives up a lot.'],
    blunder: ['??', 'Blunder', 'Throws the game away.'],
    missed: ['⟳', 'Missed chance', 'The opponent slipped; this move did not take it.']
  };
  /* it/prev: review items ({ cls, loss, before, color, brill }); win: cp (white's view) -> win percent for the side to move */
  function missedOpportunity(it, prev, win) {
    const M = CFG.missOpp;
    if (!it || !prev || prev.color === it.color) return false;
    if (it.cls !== 'good' && it.cls !== 'inaccuracy') return false;
    if (it.brill) return false;
    const pov = it.color === 'w' ? 1 : -1;
    return num(prev.loss, 0) >= M.prevLoss && num(it.loss, 0) >= M.myLoss && win(num(it.before, 0) * pov) >= M.minWin;
  }
  function reviewIcon(it, prev, win) {
    if (!it) return null;
    let k = '';
    if (it.brill === 'brilliant') k = 'brilliant';
    else if (it.brill === 'great') k = 'great';
    else if (it.cls === 'blunder' || it.cls === 'mistake' || it.cls === 'inaccuracy') k = it.cls;
    else if (missedOpportunity(it, prev, win)) k = 'missed';
    else if (it.cls === 'best') k = 'best';
    else if (it.cls === 'good') k = 'good';
    return k ? { k, glyph: ICONS[k][0], name: ICONS[k][1], text: ICONS[k][2] } : null;
  }
  /* ---------- the standing line of a player, for the friend card ---------- */
  function cardLine(o) {
    return { r: String(o.student || '').slice(0, 14), a: String(o.arena || '').slice(0, 10), x: Math.max(0, Math.round(num(o.xp, 0))), t: (Array.isArray(o.trophies) ? o.trophies : []).slice(-3).map((t) => String(t).slice(0, 24)) };
  }
  const winPct = (cp) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clampN(cp, -3000, 3000))) - 1);

  return { CFG, rankOf, moduleRanks, studentRank, arenaRank, overallRank, balancer, flowMult, flowName, flowNew, flowHit, flowMiss, dayBoost, nextDayBoost, hgLimit, hgMult,
    hintPenalty, hintRank, puzzleBase, baseFor, xp, secondLimit, secondLeft, chapterStatuses, bossPlan, mistakeLimit, hashStr, weakest, rollBounties, bountyBump,
    benchPhase, benchBuff, arenaUpdate, eventActive, activeEvents, eventMult, filterLines, smartMix, ICONS, missedOpportunity, reviewIcon, cardLine, winPct, clampN, num };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = V6Core;
