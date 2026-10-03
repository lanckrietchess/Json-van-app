/* ==========================================================================
   v6 EXECUTIVE LAYER, part 2: state, hooks and screens.
   It listens (App.score, PuzzleElo.record) instead of rewriting the trainers,
   so every drill keeps working as before and the XP economy runs on top.
   Executive Focus Mode only hides the visuals; the economy keeps running.
   Routes: #profile (rank, Skill Matrix, bounties, community, trophies) and
   #events (admin: the Master Event Engine).
   ========================================================================== */
const V6 = (() => {
  const C = V6Core, KEY = 'lc6-state-v1';
  const MOD_OF = { openings: 'openings', middlegame: 'middlegame', endgame: 'endgame', puzzles: 'puzzles', think: 'think', clinic: 'think', peer: 'think', srs: 'think', 'mspc-rep': 'think' };
  const ROUTE_MOD = { openings: 'openings', middlegame: 'middlegame', endgame: 'endgame', puzzles: 'puzzles', think: 'think', clinic: 'think', peer: 'think', srs: 'think', 'mspc-rep': 'think', shuffle: 'shuffle', leaderboard: 'think' };
  const num = (v, d) => (Number.isFinite(+v) && v !== null && v !== '' ? +v : d);
  const today = () => dayKey(new Date());
  const weekKey = () => isoWeek(new Date());
  const tokenOf = () => { const t = Store.get('lc5-admin-token', ''); return typeof t === 'string' ? t : ''; };
  let adminOverride = null;                                         // test hook only
  const isAdmin = () => { if (adminOverride !== null) return adminOverride; try { return !!Admin.active && !!tokenOf() && V5Net.on(); } catch (e) { return false; } };
  const net = () => { try { return V5Net.on(); } catch (e) { return false; } };
  const paidNow = () => { try { return Admin.active || App.isPro(); } catch (e) { return false; } };

  /* ---------- state (this device) ---------- */
  function blank() {
    return { v: 1, xp: C.CFG.modules.reduce((o, m) => { o[m] = 0; return o; }, {}), total: 0, flow: C.flowNew(), completed: {}, trophies: [], second: { day: '', used: 0 }, focus: false, hard: {},
      bounty: { daily: { key: '', items: [] }, weekly: { key: '', items: [] } }, bench: { period: '', xp: 0, correct: 0, puzzles: 0, boss: 0 },
      cache: { at: 0, events: [], bench: null, arena: null }, ev: {}, seenEvents: [], log: [], outbox: { xp: 0, correct: 0, puzzles: 0, boss: 0 }, ranks: {} };
  }
  let S = null;
  function load() {
    const b = blank(), r = Store.get(KEY, null);
    if (!r || typeof r !== 'object') return b;
    C.CFG.modules.forEach((m) => { b.xp[m] = Math.max(0, Math.round(num((r.xp || {})[m], 0))); });
    b.total = Math.max(0, Math.round(num(r.total, 0)));
    const f = r.flow && typeof r.flow === 'object' ? r.flow : {};
    b.flow = { count: Math.max(0, num(f.count, 0) | 0), best: Math.max(0, num(f.best, 0) | 0), saved: Math.max(0, num(f.saved, 0) | 0),
      protect: f.protect && num(f.protect.until, 0) > Date.now() ? { count: num(f.protect.count, 0) | 0, got: num(f.protect.got, 0) | 0, until: num(f.protect.until, 0) } : null };
    b.completed = r.completed && typeof r.completed === 'object' ? Object.keys(r.completed).slice(0, 600).reduce((o, k) => { if (/^[\w:.\-|]{1,120}$/.test(k)) o[k] = num(r.completed[k], 1); return o; }, {}) : {};
    b.trophies = (Array.isArray(r.trophies) ? r.trophies : []).slice(-200).filter((t) => t && typeof t.id === 'string').map((t) => ({ id: String(t.id).slice(0, 80), name: String(t.name || '').slice(0, 60), kind: String(t.kind || '').slice(0, 12), t: num(t.t, 0) }));
    b.second = { day: String((r.second || {}).day || '').slice(0, 10), used: Math.max(0, num((r.second || {}).used, 0) | 0) };
    b.focus = !!r.focus;
    Object.keys(r.hard || {}).forEach((k) => { if (C.CFG.modules.indexOf(k) >= 0 && r.hard[k] === 'hard') b.hard[k] = 'hard'; });
    ['daily', 'weekly'].forEach((k) => {
      const x = (r.bounty || {})[k];
      if (x && typeof x.key === 'string' && Array.isArray(x.items)) b.bounty[k] = { key: x.key.slice(0, 12), items: x.items.slice(0, 5).filter((i) => i && typeof i.id === 'string').map((i) => ({ id: String(i.id).slice(0, 30), metric: String(i.metric || ''), module: String(i.module || ''), target: Math.max(1, num(i.target, 1)), label: String(i.label || '').slice(0, 80), reward: { xp: Math.max(0, num((i.reward || {}).xp, 0)), tokens: Math.max(0, num((i.reward || {}).tokens, 0)) }, progress: Math.max(0, num(i.progress, 0)), done: !!i.done })) };
    });
    const bn = r.bench || {};
    b.bench = { period: String(bn.period || '').slice(0, 10), xp: Math.max(0, num(bn.xp, 0)), correct: Math.max(0, num(bn.correct, 0)), puzzles: Math.max(0, num(bn.puzzles, 0)), boss: Math.max(0, num(bn.boss, 0)) };
    const c = r.cache || {};
    b.cache = { at: num(c.at, 0), events: Array.isArray(c.events) ? c.events.slice(0, 20).map(cleanEvent).filter(Boolean) : [], bench: c.bench && typeof c.bench === 'object' ? c.bench : null, arena: c.arena && typeof c.arena === 'object' ? c.arena : null };
    b.ev = r.ev && typeof r.ev === 'object' ? Object.keys(r.ev).slice(0, 60).reduce((o, k) => { const e = r.ev[k] || {}; o[k] = { p: Math.max(0, num(e.p, 0)), done: !!e.done }; return o; }, {}) : {};
    b.seenEvents = (Array.isArray(r.seenEvents) ? r.seenEvents : []).slice(-60).map((x) => String(x).slice(0, 40));
    b.log = (Array.isArray(r.log) ? r.log : []).slice(-30).filter((x) => x && typeof x === 'object');
    const o = r.outbox || {};
    b.outbox = { xp: Math.max(0, num(o.xp, 0)), correct: Math.max(0, num(o.correct, 0)), puzzles: Math.max(0, num(o.puzzles, 0)), boss: Math.max(0, num(o.boss, 0)) };
    b.ranks = r.ranks && typeof r.ranks === 'object' ? r.ranks : {};
    return b;
  }
  const st = () => S || (S = load());
  let saveT = 0;
  function save(now) {
    clearTimeout(saveT);
    const w = () => { try { Store.set(KEY, st()); } catch (e) { /* storage off */ } };
    if (now) w(); else saveT = setTimeout(w, 250);
  }
  window.addEventListener('pagehide', () => save(true));

  /* ---------- events from the Master Event Engine ---------- */
  function cleanEvent(e) {
    if (!e || typeof e !== 'object' || !/^[\w-]{2,40}$/.test(String(e.id || ''))) return null;
    const t = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').trim().slice(0, n), col = (v) => (/^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? String(v) : '');
    const ch = e.challenge && typeof e.challenge === 'object' ? e.challenge : null, th = e.theme && typeof e.theme === 'object' ? e.theme : null, w = e.welcome && typeof e.welcome === 'object' ? e.welcome : null;
    return {
      id: String(e.id), title: t(e.title, 60) || 'Event', on: e.on !== false, start: Math.max(0, num(e.start, 0)), end: Math.max(0, num(e.end, 0)),
      xpMult: C.clampN(num(e.xpMult, 1), 0.5, 5), tokenCost: C.clampN(Math.round(num(e.tokenCost, C.CFG.second.tokenCost)), 0, 10),
      mspcFree: C.clampN(Math.round(num(e.mspcFree, 0)), 0, 100), mspcPaid: C.clampN(Math.round(num(e.mspcPaid, 0)), 0, 500),
      theme: th ? { accent: col(th.accent), accentInk: col(th.accentInk) } : null,
      welcome: w && (t(w.title, 60) || t(w.text, 400)) ? { title: t(w.title, 60), text: t(w.text, 400) } : null,
      challenge: ch && t(ch.title, 60) && ['xp', 'correct', 'puzzles', 'boss'].indexOf(ch.metric) >= 0 && num(ch.target, 0) > 0
        ? { title: t(ch.title, 60), metric: ch.metric, target: C.clampN(Math.round(num(ch.target, 1)), 1, 1000000), reward: { tokens: C.clampN(Math.round(num((ch.reward || {}).tokens, 0)), 0, 50), xp: C.clampN(Math.round(num((ch.reward || {}).xp, 0)), 0, 100000) },
          badge: ch.badge && t(ch.badge.name, 40) ? { id: String(ch.badge.id || e.id).replace(/[^\w-]/g, '').slice(0, 30) || String(e.id), name: t(ch.badge.name, 40) } : null } : null
    };
  }
  const events = () => C.activeEvents(st().cache.events, Date.now());
  const eventMultNow = () => C.eventMult(events(), Date.now());
  function applyTheme() {
    let el = document.getElementById('v6-theme');
    const ev = events().filter((e) => e.theme && e.theme.accent)[0];
    if (!ev) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('style'); el.id = 'v6-theme'; document.head.appendChild(el); }
    const a = ev.theme.accent, ink = ev.theme.accentInk || '#0b1222', rgb = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)).join(',');
    el.textContent = ':root{--accent:' + a + ';--accent-ink:' + ink + ';--accent-soft:rgba(' + rgb + ',.13);--accent-line:rgba(' + rgb + ',.45)}';
  }

  /* ---------- context: which module a score belongs to ---------- */
  const ctx = { shuffle: '', puzzleRating: 0 };
  let hintCtx = null;
  let boss = null;                                  // set by the Boss Fight screen (part B)
  const modOf = (section) => (section === 'shuffle' ? ctx.shuffle || 'openings' : MOD_OF[section] || '');
  const routeNow = () => { try { return current.route; } catch (e) { return ''; } };
  function stripModule() { const r = ROUTE_MOD[routeNow()] || (boss ? 'openings' : ''); return r === 'shuffle' ? ctx.shuffle || 'openings' : r; }

  /* ---------- ranks, multipliers ---------- */
  function ranks() {
    const mr = C.moduleRanks(st().xp), student = C.studentRank(mr), arena = C.arenaRank(arenaRating()), overall = C.overallRank(student, arena);
    return { mr, student, arena, overall, trained: student.trained };
  }
  function arenaRating() {
    const c = st().cache.arena;
    if (c && num(c.rating, 0) > 0) return Math.round(c.rating);
    let r = 0;
    try { ((Tourney.state().history) || []).forEach((h) => { if (h && h.players >= 2 && h.rank > 0) r = C.arenaUpdate(r || C.CFG.arenaRating.start, h.rank, h.players); }); } catch (e) { r = 0; }
    return r;
  }
  function benchNow() {
    const b = st().cache.bench, mine = st().bench;
    if (!b || !b.totals) return { phase: { pct: 0, phase: -1, mult: 1 }, buff: 1, min: C.CFG.bench.minContribution, mine: mine.xp, goal: C.CFG.bench.goals.xp };
    const goal = num((b.goals || {}).xp, C.CFG.bench.goals.xp), min = num(b.min, C.CFG.bench.minContribution), phase = C.benchPhase(num(b.totals.xp, 0), goal);
    return { phase, buff: C.benchBuff(phase, mine.period === b.period ? mine.xp : 0, min), min, mine: mine.xp, goal };
  }
  /* the position being answered: hint tier, clock, booked assisted XP */
  let pos = { tier: 0, booked: 0, sealed: false, t0: Date.now(), broke: false, rankPen: 0 };
  const resetPos = () => { pos = { tier: 0, booked: 0, sealed: false, t0: Date.now(), broke: false, rankPen: 0 }; try { renderStrips(); } catch (e) { /* no strip yet */ } };
  const hgMode = (module) => (st().hard[module] === 'hard' ? 'hard' : 'off');
  function payout(module, o) {
    o = o || {};
    const R = ranks(), m = R.mr[module], s = st(), flowCount = s.flow.count, b = benchNow();
    return C.xp({
      module, puzzleRating: module === 'puzzles' ? ctx.puzzleRating : 0,
      balancer: m ? C.balancer(m.exact, R.student.exact, R.trained) : 1, flow: o.noFlow ? 1 : C.flowMult(flowCount), streak: C.dayBoost(App.streakDays()), arena: R.arena.mult,
      bench: b.buff, hourglass: o.noClock ? 1 : C.hgMult(module, hgMode(module), Date.now() - pos.t0), event: eventMultNow(), hintTier: o.hintTier != null ? o.hintTier : pos.tier
    });
  }
  function addXp(module, n, opts) {
    opts = opts || {};
    const s = st(), before = ranks();
    s.xp[module] = Math.max(0, (s.xp[module] || 0) + n); s.total = Math.max(0, s.total + n);
    if (n > 0 && !opts.noBench) {
      const b = s.cache.bench, per = b && b.period ? b.period : weekKey();
      if (s.bench.period !== per) s.bench = { period: per, xp: 0, correct: 0, puzzles: 0, boss: 0 };
      s.bench.xp += n; s.outbox.xp += n;
    }
    const after = ranks();
    if (after.mr[module].i > before.mr[module].i) { toast(C.CFG.labels[module] + ': rank ' + after.mr[module].name + '.', 'good'); trophy('rank:' + module + ':' + after.mr[module].name, C.CFG.labels[module] + ' ' + after.mr[module].name, 'rank'); }
    if (after.student.i > before.student.i) toast('Student rank: ' + after.student.name + '.', 'good');
    save(); queueSync();
  }
  function trophy(id, name, kind) {
    const s = st();
    if (s.trophies.some((t) => t.id === id)) return false;
    s.trophies.push({ id, name, kind: kind || 'milestone', t: Date.now() });
    if (s.trophies.length > 200) s.trophies = s.trophies.slice(-200);
    save(); return true;
  }
  function ensureBounties() {
    const s = st(), R = ranks(), order = C.weakest(R.mr);
    [['daily', today()], ['weekly', weekKey()]].forEach((p) => {
      if (s.bounty[p[0]].key !== p[1]) { s.bounty[p[0]] = { key: p[1], items: C.rollBounties(p[0], p[1], order) }; save(); }
    });
  }
  function bountyEvent(ev) {
    ensureBounties();
    const s = st(), fin = [];
    ['daily', 'weekly'].forEach((k) => { C.bountyBump(s.bounty[k].items, ev).forEach((b) => fin.push(b)); });
    fin.forEach((b) => {
      if (b.reward.tokens) { try { Credits.grant(b.reward.tokens); } catch (e) { /* tokens are optional */ } }
      if (b.reward.xp) addXp(C.weakest(ranks().mr)[0], b.reward.xp, { noBench: true });
      toast('Bounty complete: ' + b.label + (b.reward.tokens ? ' (+' + b.reward.tokens + (b.reward.tokens === 1 ? ' token)' : ' tokens)') : '') + '.', 'good');
    });
    if (fin.length) save();
  }
  function eventProgress(metric, n) {
    const s = st();
    events().forEach((e) => {
      const ch = e.challenge;
      if (!ch || ch.metric !== metric) return;
      const x = s.ev[e.id] || (s.ev[e.id] = { p: 0, done: false });
      if (x.done) return;
      x.p += n;
      if (x.p >= ch.target) {
        x.p = ch.target; x.done = true;
        if (ch.reward.tokens) { try { Credits.grant(ch.reward.tokens); } catch (err) { /* optional */ } }
        if (ch.reward.xp) addXp(C.weakest(ranks().mr)[0], ch.reward.xp, { noBench: true });
        if (ch.badge) trophy('event:' + ch.badge.id, ch.badge.name, 'event');
        toast('Event challenge complete: ' + ch.title + (ch.reward.tokens ? ' (+' + ch.reward.tokens + ' tokens)' : '') + '.', 'good');
      }
    });
    save();
  }

  /* ---------- the scoring hook ---------- */
  function onScore(section, ok) {
    const module = modOf(section);
    if (!module) return;
    if (hintCtx && module !== 'puzzles') return;                    // a hint owns its own bookkeeping
    const s = st(), now = Date.now();
    if (pos.sealed) resetPos();
    if (ok) {
      const q = payout(module);
      const hit = C.flowHit(s.flow, now);
      s.flow = hit.flow;
      if (hit.redeemed) toast('Flow restored. Anti-Ragequit saved your chain of ' + s.flow.count + '.', 'good');
      s.log.push({ t: now, m: module, xp: q.xp, x: q.mult, h: pos.tier }); if (s.log.length > 30) s.log.shift();
      const per = s.cache.bench && s.cache.bench.period ? s.cache.bench.period : weekKey();
      if (s.bench.period !== per) s.bench = { period: per, xp: 0, correct: 0, puzzles: 0, boss: 0 };
      s.bench.correct++; s.outbox.correct++;
      if (module === 'puzzles') { s.bench.puzzles++; s.outbox.puzzles++; }
      addXp(module, q.xp);
      if (q.rankPenalty) addXp(module, -q.rankPenalty, { noBench: true });
      bountyEvent({ type: 'correct', module, flow: s.flow.count });
      bountyEvent({ type: 'xp', n: q.xp });
      eventProgress('xp', q.xp); eventProgress('correct', 1); if (module === 'puzzles') eventProgress('puzzles', 1);
      if (boss) boss.onCorrect(q);
    } else {
      const miss = C.flowMiss(s.flow, now);
      s.flow = miss.flow;
      if (miss.protectedUntil) toast('Flow reset. Three right answers within two minutes restore it.');
      if (boss) boss.onMistake({ hint: false });
    }
    resetPos();
    save(); renderStrips();
  }
  /* the Puzzle ELO calls first, then App.score: remember the puzzle's rating for the XP */
  const _record = PuzzleElo.record;
  PuzzleElo.record = function (p, win) { const r = _record.call(PuzzleElo, p, win); if (r && p) ctx.puzzleRating = num(p.rating, 0); return r; };
  const _score = App.score;
  App.score = function (section, ok) { _score.call(App, section, ok); try { onScore(section, ok); } catch (e) { console.error(e); } };
  const _good = Sound.good;
  Sound.good = function () { _good.apply(Sound, arguments); try { if ((pos.sealed || pos.tier) && stripModule() !== 'puzzles') resetPos(); } catch (e) { /* the sound is optional */ } };
  /* every board the hub makes is remembered by its host element, so the strip can read the position */
  const boards = new WeakMap();
  const _Board = Board;
  Board = function (host, opts) {
    const b = _Board(host, opts), so = b.setOnMove;
    b.setOnMove = function (fn) { if (fn) resetPos(); return so.apply(b, arguments); };   // a runner that starts takes the clock with it
    try { boards.set(host, b); } catch (e) { /* ignore */ }
    return b;
  };
  const boardIn = (trainer) => { const h = trainer && qs('.board-host', trainer); return h ? boards.get(h) || null : null; };

  /* ---------- hints: three tiers, the XP bar shrinks at once ---------- */
  const HINT_LABEL = ['Hint: position status', 'Hint: the piece', 'Hint: the solution'];
  function statusText(fen) {
    try {
      const g = new Chess(fen), me = g.turn(), opp = me === 'w' ? 'b' : 'w', cca = ccaList(fen, me), hit = loosePieces(fen, me).filter((x) => x.attacked), th = ccaList(fen, opp);
      return colorName(me) + ' to move in a ' + phaseOf(fen, Math.max(0, (fullmove(fen) - 1) * 2)) + ' position. ' + (g.in_check() ? 'You are in check. ' : '') +
        'Forcing moves for you: ' + cca.checks.length + ' check' + (cca.checks.length === 1 ? '' : 's') + ', ' + cca.captures.length + ' capture' + (cca.captures.length === 1 ? '' : 's') + '. ' +
        (hit.length ? 'Your ' + hit.map((x) => PIECE_NAME[x.type] + ' on ' + x.sq).join(' and ') + ' can be taken for free. ' : '') + (th.checks.length ? 'Your opponent has ' + th.checks.length + ' check' + (th.checks.length === 1 ? '' : 's') + ' ready.' : '');
    } catch (e) { return 'Run MSPC: Move, Specifics, Priorities, Calculation.'; }
  }
  function hintPress(strip) {
    const trainer = strip.nextElementSibling, module = stripModule();
    if (!module || !trainer) return;
    if (boss && boss.mode === 'strict') { toast('Strict Mode has no hints.'); return; }
    if (pos.tier >= 3) return;
    if (pos.tier === 0) {                                             // tier 1: the status of the position, no help with the move itself
      const b = boardIn(trainer);
      pos.tier = 1;
      const note = qs('[data-v6-note]', strip);
      if (note) { note.hidden = false; note.textContent = b ? statusText(b.fen()) : 'Run MSPC: Move, Specifics, Priorities, Calculation.'; }
      renderStrips(); return;
    }
    const native = qs('[data-act="hint"]', trainer);
    if (!native || native.disabled) { toast('No further hint here.'); return; }
    const tier = pos.tier + 1;
    if (module !== 'puzzles' && !boss) {                              // assisted XP is booked now: the drills do not score a move played after a hint
      const q = payout(module, { hintTier: tier, noFlow: true, noClock: true });
      const delta = q.xp - pos.booked;
      pos.booked = q.xp;
      addXp(module, delta, { noBench: delta < 0 });
      if (q.rankPenalty && !pos.rankPen) { pos.rankPen = q.rankPenalty; addXp(module, -q.rankPenalty, { noBench: true }); toast('Full solution: ' + q.rankPenalty + ' rank XP deducted.'); }
      if (!pos.broke) { pos.broke = true; const m = C.flowMiss(st().flow, Date.now()); st().flow = m.flow; }
      pos.sealed = true;
    }
    pos.tier = tier;
    hintCtx = { tier };
    try { native.click(); } finally { hintCtx = null; }
    if (boss && tier >= 2) boss.onMistake({ hint: true });
    save(); renderStrips();
  }

  /* ---------- the strip above every trainer ---------- */
  const PAWN = 'M12 4a3.2 3.2 0 1 1 0 6.4A3.2 3.2 0 0 1 12 4Z M10.2 10.2h3.6c0 1.4.3 2.2 1.1 3.2.9 1.1 1.4 2.5 1.4 4.6H7.7c0-2.1.5-3.5 1.4-4.6.8-1 1.1-1.8 1.1-3.2Z M6.8 18.5h10.4v2.4H6.8Z';
  let stripSeq = 0;
  function stripHTML(id) {
    return '<button type="button" class="btn btn-ghost btn-sm v6-hint" data-v6="hint">' + icon('lightbulb') + '<span data-v6-hl>Hint</span></button>' +
      '<div class="v6-xp" role="img" aria-label="Possible XP for this answer"><span class="v6-xp-bar"><span class="v6-xp-fill" data-v6-fill></span></span><b data-v6-xp>+0 XP</b></div>' +
      '<span class="v6-viz v6-flow" data-v6-flow title="First-try answers in a row"></span>' +
      '<span class="v6-viz v6-hg"><button type="button" class="v6-hg-btn" data-v6="hourglass" aria-pressed="false" title="Hard mode: answer before the glass empties for a bigger XP multiplier"><svg viewBox="0 0 24 24" class="v6-pawn" aria-hidden="true"><defs><clipPath id="v6c' + id + '"><rect data-v6-clip x="0" y="0" width="24" height="24"></rect></clipPath></defs><path class="v6-pawn-out" d="' + PAWN + '"></path><path class="v6-pawn-fill" d="' + PAWN + '" clip-path="url(#v6c' + id + ')"></path></svg><span data-v6-hgl>Hard mode</span></button></span>' +
      '<p class="v6-note small" data-v6-note hidden></p>';
  }
  function scan() {
    qsa('.trainer').forEach((tr) => {
      if (tr.getAttribute('data-v6')) return;
      if (!stripModule()) return;
      tr.setAttribute('data-v6', '1');
      const el = document.createElement('div');
      el.className = 'v6-strip'; el.setAttribute('data-v6-strip', ''); el.innerHTML = stripHTML(++stripSeq);
      tr.parentNode.insertBefore(el, tr);
      tr.classList.add('v6-has-strip');
      resetPos(); renderStrips();
    });
  }
  const fmtClock = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  function renderStrips() {
    const strips = qsa('[data-v6-strip]');
    if (!strips.length) return;
    const module = stripModule(), s = st();
    if (!module) return;
    const hard = hgMode(module) === 'hard', q = payout(module, { hintTier: 0, noClock: !hard }), pen = C.hintPenalty(pos.tier), now = Date.now();
    const lim = C.hgLimit(module) * 1000, rem = Math.max(0, 1 - (now - pos.t0) / lim), strict = boss && boss.mode === 'strict';
    const pr = s.flow.protect && s.flow.protect.until > now ? s.flow.protect : null;
    strips.forEach((el) => {
      if (!el.isConnected) return;
      if (!el.nextElementSibling || !el.nextElementSibling.classList.contains('trainer')) { el.remove(); return; }
      const fill = qs('[data-v6-fill]', el), xpEl = qs('[data-v6-xp]', el), hb = qs('[data-v6-hl]', el), btn = qs('.v6-hint', el);
      const live = Math.round(q.potential * (1 - pen));
      if (fill) fill.style.width = Math.round((1 - pen) * 100) + '%';
      if (xpEl) xpEl.textContent = '+' + live + ' XP' + (pen ? ' (−' + Math.round(pen * 100) + '%)' : '');
      if (hb) hb.textContent = strict ? 'No hints' : pos.tier >= 3 ? 'No more hints' : pos.tier === 0 ? 'Hint: status (−10%)' : pos.tier === 1 ? 'Hint: the piece (−35%)' : 'Hint: the solution (−85%)';
      if (btn) btn.disabled = !!strict || pos.tier >= 3;
      const fl = qs('[data-v6-flow]', el);
      if (fl) fl.innerHTML = pr ? icon('shield-halved') + ' Redeem ' + (pr.got || 0) + '/' + C.CFG.redeem.need + ' · ' + fmtClock(pr.until - now) : s.flow.count >= 3 ? icon('bolt') + ' ' + C.flowName(s.flow.count) + ' ×' + C.flowMult(s.flow.count).toFixed(2) + ' · ' + s.flow.count : icon('bolt') + ' Flow ' + s.flow.count;
      const hbtn = qs('[data-v6="hourglass"]', el), clip = qs('[data-v6-clip]', el), hl = qs('[data-v6-hgl]', el);
      if (hbtn) hbtn.setAttribute('aria-pressed', String(hard));
      if (clip) { const h = hard ? 24 * rem : 24; clip.setAttribute('y', String(24 - h)); clip.setAttribute('height', String(h)); }
      if (hl) hl.textContent = hard ? (rem > 0 ? fmtClock(rem * lim) : 'Time up') + ' · ×' + C.CFG.hourglass.mult[module].toFixed(2) : 'Hard mode';
      if (!pos.tier) { const nt = qs('[data-v6-note]', el); if (nt) nt.hidden = true; }
    });
  }
  setInterval(() => { if (document.visibilityState === 'visible' && qs('[data-v6-strip]') && !st().focus) renderStrips(); }, 500);
  let scanT = 0;
  const kick = () => { if (!scanT) scanT = requestAnimationFrame(() => { scanT = 0; try { scan(); } catch (e) { console.error(e); } }); };

  /* ---------- Executive Focus Mode ---------- */
  function applyFocus() { document.body.classList.toggle('lc-focus', !!st().focus); }
  function setFocus(on) { st().focus = !!on; save(); applyFocus(); renderStrips(); }

  /* ---------- the Arena server: events, community benchmarks, arena rating ---------- */
  let syncT = 0, syncing = false;
  function queueSync(ms) { if (!net()) return; clearTimeout(syncT); syncT = setTimeout(sync, ms == null ? 5000 : ms); }
  async function sync() {
    if (!net() || syncing) return null;
    syncing = true;
    const s = st(), add = Object.assign({}, s.outbox);
    try {
      const r = await V5Net.post('v6_state', { name: App.profile.name || '', add, period: weekKey() });
      s.outbox = { xp: Math.max(0, s.outbox.xp - add.xp), correct: Math.max(0, s.outbox.correct - add.correct), puzzles: Math.max(0, s.outbox.puzzles - add.puzzles), boss: Math.max(0, s.outbox.boss - add.boss) };
      s.cache = { at: Date.now(), events: (Array.isArray(r.events) ? r.events : []).map(cleanEvent).filter(Boolean), bench: r.bench && typeof r.bench === 'object' ? r.bench : null, arena: r.arena && typeof r.arena === 'object' ? r.arena : null };
      if (r.mine && s.cache.bench && r.mine.period === s.cache.bench.period) s.bench = Object.assign({ period: r.mine.period }, { xp: num(r.mine.xp, 0), correct: num(r.mine.correct, 0), puzzles: num(r.mine.puzzles, 0), boss: num(r.mine.boss, 0) });
      save(); applyTheme(); welcome(); refreshChip();
      return r;
    } catch (e) { return null; } finally { syncing = false; }
  }
  function welcome() {
    const s = st();
    events().filter((e) => e.welcome && s.seenEvents.indexOf(e.id) < 0).slice(0, 1).forEach((e) => {
      s.seenEvents.push(e.id); save();
      if (qs('.sheet-wrap') || App.settings.popups === false) { try { Quiet.push('badge', e.welcome.title || e.title, e.welcome.text); } catch (err) { /* optional */ } toast(e.title + ' is live.'); return; }
      openSheet({ title: e.welcome.title || e.title, noFocus: true, html: '<p>' + esc(e.welcome.text) + '</p>' + (e.xpMult !== 1 ? '<p class="small muted">XP ×' + e.xpMult + ' while this event runs.</p>' : '') + (e.challenge ? '<p class="small">' + icon('flag-checkered') + ' Challenge: ' + esc(e.challenge.title) + '.</p>' : '') + '<div class="btn-row"><button type="button" class="btn btn-primary" data-close>Continue</button><a class="btn btn-ghost" href="#profile" data-close>Open my profile</a></div>' });
    });
  }
  /* ---------- second chances ---------- */
  function secondLeft() {
    const s = st(), evs = events(), paid = paidNow();
    let limit = C.secondLimit(paid);
    evs.forEach((e) => { const v = paid ? e.mspcPaid : e.mspcFree; if (v > limit) limit = v; });
    return Math.max(0, limit - (s.second.day === today() ? s.second.used : 0));
  }
  const tokenCost = () => (events().length ? Math.min.apply(null, events().map((e) => e.tokenCost).concat([C.CFG.second.tokenCost])) : C.CFG.second.tokenCost);
  function useSecond() { const s = st(); if (s.second.day !== today()) s.second = { day: today(), used: 0 }; s.second.used++; save(); }
  function spendTokens(n) { try { if (Admin.active) return true; if (Credits.balance() < n) return false; Credits.spend(n); return true; } catch (e) { return false; } }

  /* ---------- Skill Matrix: chapters in order, Boss Fights as the gates ---------- */
  const umCache = {};
  function userMoves(x) {
    if (umCache[x.id] != null) return umCache[x.id];
    let n = 0;
    try { n = buildDrillPlies(x.fen, x.moves, isStatic(x), x.side).filter((p) => p.color === x.side).length; } catch (e) { n = 0; }
    return (umCache[x.id] = n);
  }
  function matrix() {
    const byId = {};
    shufflePool().forEach((x) => { if (x.scope === 'openings' && x.kind === 'line') byId[x.id] = x; });
    const names = (CONTENT.groups || []).map((g) => g && g.name).filter(Boolean);
    (CONTENT.openings || []).forEach((o) => { if (o && o.group && names.indexOf(o.group) < 0) names.push(o.group); });
    return names.map((name) => {
      const lines = (CONTENT.openings || []).filter((o) => o && o.group === name);
      const chs = chaptersOf(lines).map((c, i) => {
        const items = c.lines.map((l) => byId[l.id]).filter(Boolean), open = items.filter((x) => App.unlocked(x));
        const mastery = items.length ? items.reduce((a, x) => a + ((App.progress[x.id] || {}).best || 0), 0) / items.length : 0;
        return { id: c.id, title: chapterName(c, i), items, playable: open, mastery, boss: 'boss:' + c.id };
      });
      const stat = C.chapterStatuses(chs, st().completed), g = (CONTENT.groups || []).filter((x) => x && x.name === name)[0] || {};
      return { name, side: g.side || '', chapters: chs.map((c, i) => Object.assign({}, c, stat[i])) };
    }).filter((g) => g.chapters.length);
  }

  /* ---------- Boss Fights: Hardcore (a mistake limit) and Strict (no mistakes) ---------- */
  const tokensOk = () => { try { return Admin.active || Credits.balance() >= tokenCost(); } catch (e) { return false; } };
  const balText = () => { try { const b = Credits.balance(); return b === Infinity ? '∞' : String(b); } catch (e) { return '0'; } };
  function makeBoss(ch, mode, root, exit) {
    const plan = C.bossPlan(ch.playable.map((x) => Object.assign({}, x, { userMoves: userMoves(x) })));
    if (!plan.lines.length) return null;
    const b = { mode, ch, plan, i: 0, mistakes: 0, limit: C.mistakeLimit(plan.size, mode), correct: 0, size: plan.size, runner: null, board: null, attempt: null, over: '', frozen: false, seq: 0, view: null, alive: true, forgiven: 0, why: '' };
    const q = (sel) => qs(sel, root);
    const label = mode === 'strict' ? 'Strict Mode' : 'Hardcore';
    root.innerHTML = '<section class="v6-boss"><div class="v6-boss-head"><button type="button" class="btn btn-quiet btn-sm" data-v6b="exit">' + icon('arrow-left') + ' Skill Matrix</button>' +
      '<div><p class="st-kicker">Boss Fight · ' + esc(label) + '</p><h2>' + esc(ch.title) + '</h2></div></div>' +
      '<div class="v6-boss-hud" data-v6-hud></div><div class="v6-second" data-v6-second hidden></div>' + trainerShell('boss-board', 'boss-panel') + '<div class="v6-boss-end" data-v6-end hidden></div></section>';
    b.board = Board(q('#boss-board'), {});
    const set0 = b.board.setOnMove;
    b.board.setOnMove = (fn) => { b.boardMove = fn ? (m) => { b.attempt = { fen: b.board.fen(), from: m.from, to: m.to, promotion: m.promotion || '' }; fn(m); } : null; set0(b.boardMove); };
    const hud = () => {
      const el = q('[data-v6-hud]');
      if (!el) return;
      const mm = mode === 'strict' ? '0 allowed' : b.mistakes + ' / ' + b.limit;
      el.innerHTML = '<div><b>' + Math.min(b.correct, b.size) + ' / ' + b.size + '</b><span>Correct moves</span></div><div class="' + (b.mistakes > 0 && mode !== 'strict' && b.mistakes >= b.limit ? 'is-hot' : '') + '"><b>' + esc(mm) + '</b><span>Mistakes</span></div>' +
        (mode === 'strict' ? '' : '<div><b>' + secondLeft() + '</b><span>Second chances today</span></div><div><b>' + esc(balText()) + '</b><span>Tokens</span></div>') + '<div>' + bar(b.size ? b.correct / b.size : 0) + '<span>Line ' + Math.min(b.i + 1, plan.lines.length) + ' of ' + plan.lines.length + '</span></div>';
    };
    const panel = (v) => {
      b.view = v;
      const p = q('#boss-panel'), x = plan.lines[b.i];
      if (!p || !x || b.over) return;
      const mine = (v.played || []).filter((m) => m.color === x.side).length;
      p.innerHTML = '<p class="st-kicker">' + esc('You play ' + colorName(x.side)) + '</p><h2 class="st-title"><span class="sh-title-hidden">' + icon('eye-slash') + ' Hidden line</span></h2>' +
        '<p class="st-brief">Play the line from memory. The computer plays the other side.</p>' + turnHTML(v, 'Your move as ' + colorName(x.side)) + '<span class="dim small" style="margin-left:auto">' + Math.min(mine, v.userPlies) + ' / ' + v.userPlies + '</span></div>' +
        '<div class="st-feedback">' + feedbackHTML(v.feedback) + '</div>' + playedHTML(v.played || []) +
        '<div class="st-actions"><button type="button" data-act="hint" data-v6b="bhint" hidden aria-hidden="true" tabindex="-1"></button>' + (mode === 'strict' ? '' : '<button type="button" class="btn btn-quiet btn-sm" data-v6b="show">Show move (counts as a mistake)</button>') + '<button type="button" class="btn btn-quiet btn-sm" data-v6b="giveup">Give up</button></div>';
    };
    const stop = () => { if (b.runner) { b.runner.destroy(); b.runner = null; } };
    function run() {
      stop();
      const x = plan.lines[b.i];
      if (!x) { clear(); return; }
      b.runner = LineRunner({ board: b.board, id: x.id, kind: 'line', section: 'openings', fen: x.fen, moves: x.moves, side: x.side, ann: x.ann, lastMove: x.lastMove || null, silent: isStatic(x), delay: 320, onUpdate: panel, onFinish: () => { setTimeout(() => { if (b.alive && !b.over) { b.i++; run(); } }, 900); } });
      resetPos(); b.runner.start(); hud();
    }
    function secondPanel(show) {
      const el = q('[data-v6-second]');
      if (!el) return;
      el.hidden = !show;
      if (!show) { el.innerHTML = ''; return; }
      const left = secondLeft(), cost = tokenCost(), tok = tokensOk();
      el.innerHTML = '<div><b>' + (b.frozen ? 'Mistake limit reached.' : 'Mistake ' + b.mistakes + ' of ' + b.limit + '.') + '</b> <span class="small muted" data-v6-verdict>' + esc(b.verdict || 'Checking the move with Stockfish…') + '</span></div>' +
        '<div class="btn-row"><button type="button" class="btn btn-primary btn-sm" data-v6b="sc"' + (left ? '' : ' disabled') + '>' + icon('life-ring') + ' MSPC Second Chance (' + left + ' left today)</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-v6b="tok"' + (tok ? '' : ' disabled') + '>' + icon('coins') + ' Use ' + cost + (cost === 1 ? ' token' : ' tokens') + '</button>' +
        (b.frozen ? '<button type="button" class="btn btn-quiet btn-sm" data-v6b="giveup">End the run</button>' : '<button type="button" class="btn btn-quiet btn-sm" data-v6b="dismiss">Continue</button>') + '</div>';
    }
    function freeze(on) { b.frozen = on; const sh = q('.board-shell'); if (sh) sh.classList.toggle('v6-frozen', on); }
    async function verdict(att, id) {
      if (!att || !b.alive) { b.verdict = 'No engine check for this one.'; if (b.seq === id) secondPanel(true); return; }
      try {
        const before = await Engine.analyse(att.fen, { movetime: 260, multipv: 1 });
        const g = new Chess(att.fen), mv = g.move({ from: att.from, to: att.to, promotion: att.promotion || 'q' });
        if (!mv || !before.lines[0]) throw new Error('no line');
        const pov = mv.color === 'w' ? 1 : -1, cb = Engine.toCp(before.lines[0]);
        const after = g.game_over() ? null : await Engine.analyse(g.fen(), { movetime: 260, multipv: 1 });
        const ca = after && after.lines[0] ? Engine.toCp(after.lines[0]) : (g.in_checkmate() ? 10000 * pov : 0);
        const loss = Math.max(0, Engine.winPct(cb * pov) - Engine.winPct(ca * pov));
        if (!b.alive || b.seq !== id || b.over) return;
        if (loss < 15 && mode !== 'strict') {                       // the engine says it is playable: forgiven, and it costs nothing
          b.mistakes = Math.max(0, b.mistakes - 1); b.forgiven++;
          b.verdict = 'Stockfish: ' + mv.san + ' is playable (−' + Math.round(loss) + '%). Not counted.';
          freeze(false); secondPanel(false); hud(); toast('Playable move: not counted as a mistake.', 'good'); return;
        }
        b.verdict = 'Stockfish: ' + mv.san + ' loses ' + Math.round(loss) + '% win chance.';
      } catch (e) { b.verdict = 'Engine not available: counted as a mistake.'; }
      if (b.alive && b.seq === id && !b.over) secondPanel(true);
    }
    b.mode = mode;
    b.onCorrect = () => { b.correct++; hud(); };
    b.onMistake = (o) => {
      if (!b.alive || b.over) return;
      b.mistakes++; const att = o && o.hint ? null : b.attempt; b.attempt = null; b.last = att; b.verdict = '';
      hud();
      if (mode === 'strict') { fail('Strict Mode allows no mistakes.'); return; }
      const rescue = secondLeft() > 0 || tokensOk();
      if (b.mistakes > b.limit) { if (!rescue) { fail('Mistake limit reached (' + b.limit + ').'); return; } freeze(true); }
      const id = ++b.seq;
      secondPanel(true); verdict(att || null, id);
    };
    function rescued(how) {
      b.mistakes = Math.max(0, b.mistakes - 1); b.forgiven++; b.verdict = how; freeze(false); secondPanel(false); hud();
      toast(how, 'good');
    }
    b.rescue = (kind) => {
      if (kind === 'tok') {
        if (!spendTokens(tokenCost())) { toast('Not enough tokens.'); return; }
        rescued('Mistake forgiven with a token.'); return;
      }
      if (secondLeft() < 1) { toast('No second chances left today.'); return; }
      const fen = (b.last && b.last.fen) || b.board.fen(), mk = { fen, last: null, moves: [] };
      let m = 'M', s2 = 'S', p = 'P';
      try { m = mspcMReply(mk).text; s2 = mspcSReply(mk).text; p = mspcPReply(mk).text; } catch (e) { /* fall back to the labels */ }
      openSheet({ title: 'MSPC Second Chance', noFocus: true,
        html: '<p class="muted small">Run the framework on the position before your move. Then you get the mistake back.</p>' +
          [['M', m], ['S', s2], ['P', p]].map((x) => '<div class="v6-mspc"><p>' + esc(x[1]).replace(/\n/g, '<br>') + '</p></div>').join('') +
          '<div class="v6-mspc"><p><b>C, Calculation:</b> the position is still on the board. Play the right move now, and check the opponent’s best reply first.</p></div>' +
          '<label class="switch-row"><span>I ran M, S and P on this position</span><input type="checkbox" data-v6-ok></label>' +
          '<div class="btn-row"><button type="button" class="btn btn-primary" data-v6-done disabled>Use the second chance</button><button type="button" class="btn btn-ghost" data-close>Cancel</button></div>',
        onMount(sh) {
          const ok = qs('[data-v6-ok]', sh.el), go = qs('[data-v6-done]', sh.el);
          ok.addEventListener('change', () => { go.disabled = !ok.checked; });
          go.addEventListener('click', () => { if (secondLeft() < 1) { sh.close(); return; } useSecond(); sh.close(); rescued('Second chance used. The mistake is not counted.'); });
        } });
    };
    function fail(why) {
      if (b.over) return;
      b.over = 'fail'; b.why = why; stop(); freeze(false); secondPanel(false);
      const e = q('[data-v6-end]'), p = q('.v6-boss .trainer');
      if (p) p.hidden = true;
      if (e) { e.hidden = false; e.innerHTML = '<h3>Boss Fight failed</h3><p class="muted">' + esc(why) + ' ' + b.correct + ' of ' + b.size + ' moves were right.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-v6b="again">' + icon('rotate-right') + ' Try again</button><button type="button" class="btn btn-ghost" data-v6b="exit">Back to the Skill Matrix</button></div>'; }
      Sound.bad();
    }
    function clear() {
      if (b.over) return;
      b.over = 'clear'; stop(); freeze(false); secondPanel(false);
      const s = st(), key = ch.boss + (mode === 'strict' ? ':strict' : ''), first = !s.completed[key];
      s.completed[key] = Date.now();
      if (mode === 'strict' && !s.completed[ch.boss]) s.completed[ch.boss] = Date.now();
      const bonus = first ? (mode === 'strict' ? C.CFG.boss.strictXp : C.CFG.boss.xp) : 10;
      addXp('openings', bonus);
      const per = s.cache.bench && s.cache.bench.period ? s.cache.bench.period : weekKey();
      if (s.bench.period !== per) s.bench = { period: per, xp: 0, correct: 0, puzzles: 0, boss: 0 };
      s.bench.boss++; s.outbox.boss++;
      bountyEvent({ type: 'boss' }); eventProgress('boss', 1);
      trophy('boss:' + ch.id, 'Boss Fight: ' + ch.title, 'boss');
      if (mode === 'strict') trophy('strict:' + ch.id, 'Strict clear: ' + ch.title, 'strict');
      save(true); queueSync(1500);
      const e = q('[data-v6-end]'), p = q('.v6-boss .trainer');
      if (p) p.hidden = true;
      if (e) { e.hidden = false; e.innerHTML = '<h3>' + (mode === 'strict' ? 'Strict clear. No mistakes.' : 'Boss Fight cleared.') + '</h3><p class="muted">' + b.size + ' moves, ' + b.mistakes + ' mistake' + (b.mistakes === 1 ? '' : 's') + (b.forgiven ? ', ' + b.forgiven + ' forgiven' : '') + '. +' + bonus + ' XP.' + (first ? ' The next chapter is open.' : '') + '</p><div class="btn-row"><button type="button" class="btn btn-primary" data-v6b="exit">Back to the Skill Matrix</button>' + (mode !== 'strict' ? '<button type="button" class="btn btn-ghost" data-v6b="again-strict">' + icon('crosshairs') + ' Try Strict Mode</button>' : '') + '</div>'; }
      Sound.fanfare(); toast(mode === 'strict' ? 'Strict clear: ' + ch.title + '.' : 'Boss Fight cleared: ' + ch.title + '.', 'good');
    }
    b.start = () => { hud(); run(); };
    b.click = (a) => {
      if (a === 'exit') exit();
      else if (a === 'again') exit(ch.id, mode);
      else if (a === 'again-strict') exit(ch.id, 'strict');
      else if (a === 'sc' || a === 'tok') b.rescue(a);
      else if (a === 'dismiss') secondPanel(false);
      else if (a === 'giveup') fail('You ended the run.');
      else if (a === 'show' && b.runner && b.runner.showMove) b.runner.showMove();
      else if (a === 'bhint' && b.runner) b.runner.hint();
    };
    b.destroy = () => { b.alive = false; stop(); if (b.board) { b.board.destroy(); b.board = null; } if (boss === b) boss = null; };
    boss = b;
    return b;
  }

  /* ---------- screens ---------- */
  const bar = (p, cls) => '<div class="v6-bar ' + (cls || '') + '"><span style="width:' + Math.round(C.clampN(p, 0, 1) * 100) + '%"></span></div>';
  const fmt = (n) => Math.round(num(n, 0)).toLocaleString('en');
  const dateText = (ms) => (ms ? new Date(ms).toLocaleDateString('en', { day: 'numeric', month: 'short' }) : '');
  function avatar(R) {
    const name = App.profile.name || 'Player', ini = esc(name.trim().slice(0, 1).toUpperCase() || 'P');
    return '<div class="v6-avatar" style="--ring:' + R.arena.color + '" title="Arena rank: ' + esc(R.arena.name) + '"><span>' + ini + '</span><i class="v6-avatar-badge">' + esc(R.student.name.slice(0, 3).toUpperCase()) + '</i></div>';
  }
  function multNow() {
    const R = ranks(), b = benchNow();
    return { streak: C.dayBoost(App.streakDays()), arena: R.arena.mult, bench: b.buff, event: eventMultNow() };
  }
  function tabOverview(R) {
    const s = st(), mm = multNow(), nd = C.nextDayBoost(App.streakDays());
    const bal = (m) => C.balancer(R.mr[m].exact, R.student.exact, R.trained);
    const tag = (m) => { if (R.trained < 2) return ''; const v = bal(m); return v > 1 ? '<em class="v6-boost">Boost ×' + v.toFixed(2) + '</em>' : v < 1 ? '<em class="v6-brake">Brake ×' + v.toFixed(2) + '</em>' : ''; };
    return '<div class="v6-rank3">' + [
      ['Student Rank', R.student.name, 'Weighted mean of your module ranks'],
      ['Arena Rank', R.arena.name + (R.arena.rating ? ' · ' + R.arena.rating : ''), R.arena.mult > 1 ? 'XP ×' + R.arena.mult.toFixed(2) + ' from live tournaments' : 'Play a live tournament to place'],
      ['Overall', R.overall.name, 'Used on leaderboards and profiles']
    ].map((x) => '<div class="v6-stat"><small>' + x[0] + '</small><b>' + esc(x[1]) + '</b><span>' + esc(x[2]) + '</span></div>').join('') + '</div>' +
      '<div class="v6-kpis"><div><small>Total XP</small><b>' + fmt(s.total) + '</b></div><div class="v6-viz"><small>Day streak</small><b>' + App.streakDays() + '</b><span>' + (nd ? 'Next boost at ' + nd.at + ' days' : 'Top boost reached') + '</span></div><div class="v6-viz"><small>Best flow</small><b>' + s.flow.best + '</b></div>' +
      '<div><small>XP multipliers now</small><b>×' + (mm.streak * mm.arena * mm.bench * mm.event).toFixed(2) + '</b><span>Streak ×' + mm.streak.toFixed(2) + ', arena ×' + mm.arena.toFixed(2) + ', community ×' + mm.bench.toFixed(2) + ', event ×' + mm.event.toFixed(2) + '</span></div></div>' +
      '<h3>Modules</h3><div class="v6-mods">' + C.CFG.modules.map((m) => { const x = R.mr[m]; return '<div class="v6-mod"><div><b>' + esc(C.CFG.labels[m]) + '</b><span>' + esc(x.name) + (x.next ? ' → ' + esc(x.next) : '') + '</span>' + tag(m) + '</div>' + bar(x.pct) + '<small>' + fmt(x.xp) + ' XP</small></div>'; }).join('') + '</div>' +
      '<h3>Recent XP</h3>' + (s.log.length ? '<ul class="v6-log">' + s.log.slice().reverse().slice(0, 8).map((x) => '<li><span>' + esc(C.CFG.labels[x.m] || x.m) + '</span><b>+' + x.xp + '</b><small>×' + num(x.x, 1).toFixed(2) + (x.h ? ', hint ' + x.h : '') + '</small></li>').join('') + '</ul>' : '<p class="muted small">No XP yet. Answer one drill correctly.</p>');
  }
  function tabMatrix() {
    const groups = matrix(), s = st();
    if (!groups.length) return '<p class="muted">No repertoire chapters yet. They appear here as soon as the hub’s data file has them.</p>';
    return '<p class="muted small v6-lead">Chapters open in order. Clear a chapter’s Boss Fight to open the next one. Strict Mode (no mistakes) appears after you clear the standard Boss Fight.</p>' + groups.map((g) => {
      const done = g.chapters.filter((c) => c.cleared).length;
      return '<section class="v6-group"><div class="v6-group-head"><h3>' + esc(g.name) + '</h3><span class="small muted">' + (g.side ? esc(g.side) + ', ' : '') + done + ' of ' + g.chapters.length + ' chapters cleared</span></div>' + bar(g.chapters.length ? done / g.chapters.length : 0) +
        '<div class="v6-chaps">' + g.chapters.map((c, i) => {
          const prev = g.chapters[i - 1], noTier = !c.playable.length;
          const act = c.locked ? '<small class="muted">Clear the Boss Fight of ' + esc(prev ? prev.title : 'the chapter before') + ' first.</small>'
            : noTier ? '<a class="btn btn-gold btn-sm" href="#upgrades">' + icon('crown') + ' Needs a higher level</a>'
              : '<button type="button" class="btn ' + (c.cleared ? 'btn-ghost' : 'btn-primary') + ' btn-sm" data-v6b="boss" data-ch="' + esc(c.id) + '" data-mode="hardcore">' + icon('skull-crossbones') + ' Boss Fight</button>' +
                (c.cleared ? '<button type="button" class="btn btn-ghost btn-sm" data-v6b="boss" data-ch="' + esc(c.id) + '" data-mode="strict">' + icon('crosshairs') + ' Strict Mode</button>' : '');
          return '<div class="v6-chap' + (c.locked ? ' is-locked' : '') + '"><div class="v6-chap-main"><b>' + esc(c.title) + '</b><small>' + c.items.length + (c.items.length === 1 ? ' line' : ' lines') + ', mastery ' + Math.round(c.mastery * 100) + '%' + (c.playable.length < c.items.length ? ', ' + c.playable.length + ' open on your plan' : '') + '</small>' + bar(c.mastery) + '</div>' +
            '<div class="v6-chap-act">' + (c.cleared ? '<span class="v6-pill is-good">Boss cleared</span>' : '') + (c.strict ? '<span class="v6-pill is-strict">Strict clear</span>' : '') + act + '</div></div>';
        }).join('') + '</div></section>';
    }).join('');
  }
  function tabBounties(R) {
    ensureBounties();
    const s = st(), weak = C.weakest(R.mr)[0];
    const list = (k, title) => '<h3>' + title + '</h3><div class="v6-bounties">' + s.bounty[k].items.map((b) => '<div class="v6-bounty' + (b.done ? ' is-done' : '') + '"><div><b>' + esc(b.label) + '</b><small>' + (b.done ? 'Complete' : b.progress + ' / ' + b.target) + (b.reward.xp ? ', +' + b.reward.xp + ' XP' : '') + (b.reward.tokens ? ', +' + b.reward.tokens + (b.reward.tokens === 1 ? ' token' : ' tokens') : '') + '</small></div>' + bar(b.progress / b.target) + '</div>').join('') + '</div>';
    return '<p class="muted small v6-lead">Missions are picked from your weakest modules, so they pull your training toward the gaps. Your weakest module right now: ' + esc(C.CFG.labels[weak]) + '.</p>' + list('daily', 'Today') + list('weekly', 'This week');
  }
  function tabCommunity() {
    const s = st(), b = s.cache.bench, B = benchNow(), evs = events();
    const goals = (b && b.goals) || C.CFG.bench.goals, totals = (b && b.totals) || {};
    const M = [['xp', 'XP earned'], ['correct', 'Correct answers'], ['puzzles', 'Puzzles solved'], ['boss', 'Boss Fights cleared']];
    const ticks = C.CFG.bench.phases.map((p) => '<i style="left:' + Math.round(p[0] * 100) + '%" title="×' + p[1].toFixed(2) + ' at ' + Math.round(p[0] * 100) + '%"></i>').join('');
    const mineKey = (k) => (s.bench.period === (b && b.period) || !b ? s.bench[k] : 0);
    const grid = '<div class="v6-grid">' + M.map((m) => { const g = Math.max(1, num(goals[m[0]], 1)), t = num(totals[m[0]], 0); return '<div class="v6-bench"><small>' + m[1] + '</small><b>' + Math.min(100, Math.round(t / g * 100)) + '%</b><span>' + fmt(t) + ' of ' + fmt(g) + '</span><div class="v6-bar v6-bar-ticks"><span style="width:' + Math.round(C.clampN(t / g, 0, 1) * 100) + '%"></span>' + (m[0] === 'xp' ? ticks : '') + '</div><small>You: ' + fmt(mineKey(m[0])) + '</small></div>'; }).join('') + '</div>';
    const buff = B.phase.phase < 0 ? 'No server-wide buff yet. The first phase starts at ' + Math.round(C.CFG.bench.phases[0][0] * 100) + '% of the XP goal.' : 'Phase ' + (B.phase.phase + 1) + ' of ' + C.CFG.bench.phases.length + ': XP ×' + B.phase.mult.toFixed(2) + ' for everyone who contributed at least ' + fmt(B.min) + ' XP. ' + (B.buff > 1 ? 'Active for you.' : 'You have ' + fmt(B.mine) + ' so far.');
    return (net() ? '' : '<p class="v6-note-box">The community benchmarks and events need the Arena server. Add its address under Admin menu, Weekly tournament and sales bridge.</p>') +
      '<h3>Global Benchmark Grid</h3>' + (b ? '<p class="small muted">Week ' + esc(b.period || '') + ', ' + (b.players || 0) + ' player' + (b.players === 1 ? '' : 's') + ' contributing.</p>' : '') + grid + '<p class="v6-buff small">' + esc(buff) + '</p>' +
      '<h3>Events</h3>' + (evs.length ? '<div class="v6-events">' + evs.map((e) => { const x = s.ev[e.id] || { p: 0, done: false }, ch = e.challenge; return '<div class="v6-event"><div><b>' + esc(e.title) + '</b><small>' + (e.end ? 'Until ' + esc(dateText(e.end)) : 'Open-ended') + (e.xpMult !== 1 ? ', XP ×' + e.xpMult : '') + '</small></div>' + (ch ? '<div class="v6-ev-ch"><span>' + esc(ch.title) + '</span>' + bar(x.p / ch.target) + '<small>' + (x.done ? 'Complete' : fmt(x.p) + ' / ' + fmt(ch.target)) + (ch.reward.tokens ? ', +' + ch.reward.tokens + ' tokens' : '') + '</small></div>' : '') + '</div>'; }).join('') + '</div>' : '<p class="muted small">No event is running.</p>');
  }
  function tabTrophies() {
    const s = st(), by = { boss: 'Boss Fights', strict: 'Strict clears', event: 'Event badges', rank: 'Ranks' }, fr = (() => { try { return Friends.list(); } catch (e) { return []; } })();
    const groups = Object.keys(by).map((k) => ({ k, items: s.trophies.filter((t) => t.kind === k) })).filter((g) => g.items.length);
    let hub = 0; try { hub = Badges.count(); } catch (e) { hub = 0; }
    return '<p class="muted small v6-lead">Milestones stay in your cabinet for good. Friends see your last three on your friend card.' + (hub ? ' The hub’s own badges (' + hub + ') are in the <a href="#trophies">trophy room</a>.' : '') + '</p>' +
      (groups.length ? groups.map((g) => '<h3>' + by[g.k] + '</h3><ul class="v6-trophies">' + g.items.slice().reverse().map((t) => '<li><span class="v6-tro v6-tro-' + esc(t.kind) + '">' + icon(t.kind === 'event' ? 'ribbon' : t.kind === 'strict' ? 'crosshairs' : t.kind === 'rank' ? 'ranking-star' : 'skull-crossbones') + '</span><b>' + esc(t.name) + '</b><small>' + esc(dateText(t.t)) + '</small></li>').join('') + '</ul>').join('') : '<p class="muted">Nothing here yet. Clear a Boss Fight or finish an event challenge.</p>') +
      '<h3>Friends</h3>' + (fr.length ? '<div class="v6-friends">' + fr.slice(0, 12).map((f) => '<div class="v6-friend"><b>' + esc(f.name) + '</b>' + friendLine(f) + '</div>').join('') + '</div>' : '<p class="muted small">Add friends on the <a href="#leaderboard">leaderboard</a> to compare ranks and trophies.</p>');
  }
  function mountProfile(view) {
    const ui = { tab: 'overview' };
    const R0 = () => ranks();
    view.innerHTML = '<div class="v6-page" id="v6-page"></div>';
    const root = qs('#v6-page', view);
    function head(R) {
      const s = st();
      return '<header class="v6-head">' + avatar(R) + '<div><h1>' + esc(App.profile.name || 'Your profile') + '</h1><p class="muted">Overall ' + esc(R.overall.name) + ' · Student ' + esc(R.student.name) + ' · Arena ' + esc(R.arena.name) + ' · ' + fmt(s.total) + ' XP</p></div>' +
        '<label class="switch-row v6-focus"><span>Focus Mode: ' + (s.focus ? 'ON' : 'OFF') + '<small class="field-hint" style="display:block">Hides timers, streak widgets and the flow chip. XP and multipliers keep running.</small></span><input type="checkbox" data-v6-focus' + (s.focus ? ' checked' : '') + '></label></header>' +
        '<nav class="seg v6-tabs" role="tablist" aria-label="Profile sections">' + [['overview', 'Overview'], ['matrix', 'Skill Matrix'], ['bounties', 'Bounties'], ['community', 'Community'], ['trophies', 'Trophies']].map((t) => '<button type="button" role="tab" data-v6t="' + t[0] + '" aria-pressed="' + (ui.tab === t[0]) + '">' + t[1] + '</button>').join('') + '</nav>';
    }
    function paint() {
      if (boss) { boss.destroy(); }
      const R = R0();
      root.innerHTML = head(R) + '<div class="v6-body" id="v6-body">' + (ui.tab === 'matrix' ? tabMatrix() : ui.tab === 'bounties' ? tabBounties(R) : ui.tab === 'community' ? tabCommunity() : ui.tab === 'trophies' ? tabTrophies() : tabOverview(R)) + '</div>' + (isAdmin() ? '<p class="small muted v6-admin"><a href="#events">Open the Master Event Engine</a></p>' : '');
    }
    function startBoss(chId, mode) {
      let ch = null;
      matrix().forEach((g) => g.chapters.forEach((c) => { if (c.id === chId) ch = c; }));
      if (!ch || ch.locked || !ch.playable.length) { toast('That chapter is not open yet.'); return; }
      if (mode === 'strict' && !ch.cleared) { toast('Clear the standard Boss Fight first.'); return; }
      if (boss) boss.destroy();
      const b = makeBoss(ch, mode, root, (again, m) => { if (boss) boss.destroy(); if (again) startBoss(again, m); else paint(); });
      if (!b) { toast('This chapter has no line to fight with yet.'); return; }
      b.start(); scrollToEl(root);
    }
    paint();
    sync().then((r) => { if (r && root.isConnected && !boss && (ui.tab === 'community' || ui.tab === 'overview')) { const y = window.scrollY; paint(); window.scrollTo(0, y); } });
    const onClick = (e) => {
      const t = e.target.closest('[data-v6t]');
      if (t) { ui.tab = t.getAttribute('data-v6t'); paint(); return; }
      const b = e.target.closest('[data-v6b]');
      if (!b || !root.contains(b)) return;
      const a = b.getAttribute('data-v6b');
      if (a === 'boss') startBoss(b.getAttribute('data-ch'), b.getAttribute('data-mode') === 'strict' ? 'strict' : 'hardcore');
      else if (boss) boss.click(a);
    };
    root.addEventListener('click', onClick);
    const tick = setInterval(() => { if (!root.isConnected) { clearInterval(tick); return; } }, 5000);
    return () => { root.removeEventListener('click', onClick); clearInterval(tick); if (boss) boss.destroy(); };
  }

  /* ---------- the Master Event Engine (admin) ---------- */
  const localInput = (ms) => { if (!ms) return ''; const d = new Date(ms), p = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); };
  const fromInput = (v) => { const t = v ? new Date(v).getTime() : 0; return Number.isFinite(t) ? t : 0; };
  function mountEvents(view) {
    view.innerHTML = '<div class="v6-page" id="v6-ev"></div>';
    const root = qs('#v6-ev', view);
    if (!isAdmin()) { root.innerHTML = '<header class="v6-head"><div><h1>Master Event Engine</h1><p class="muted">This page is for the admin. Sign in to admin mode and add the Arena server address and admin token under Admin menu, Weekly tournament and sales bridge.</p></div></header>'; return null; }
    let list = [], goals = null, edit = null, msg = '', alive = true;
    const blankEv = () => ({ id: 'ev-' + Date.now().toString(36), title: '', on: true, start: Date.now(), end: Date.now() + 7 * 864e5, xpMult: 1.5, tokenCost: 1, mspcFree: 0, mspcPaid: 0, theme: { accent: '', accentInk: '' }, welcome: { title: '', text: '' }, challenge: { title: '', metric: 'xp', target: 500, reward: { tokens: 1, xp: 0 }, badge: { id: '', name: '' } } });
    const field = (label, html, hint) => '<label class="field"><span class="field-label">' + label + '</span>' + html + (hint ? '<small class="field-hint">' + hint + '</small>' : '') + '</label>';
    const inp = (name, v, type, extra) => '<input class="input" name="' + name + '" type="' + (type || 'text') + '" value="' + esc(v == null ? '' : v) + '" ' + (extra || '') + '>';
    function form() {
      const e = edit, ch = e.challenge || {}, w = e.welcome || {}, th = e.theme || {};
      return '<form class="v6-evform" data-v6ev-form><div class="v6-two">' + field('Title', inp('title', e.title, 'text', 'maxlength="60" required')) + field('Event id', inp('id', e.id, 'text', 'maxlength="40" pattern="[\\w-]{2,40}" required'), 'Letters, numbers and dashes.') + '</div>' +
        '<div class="v6-two">' + field('Starts', inp('start', localInput(e.start), 'datetime-local')) + field('Ends', inp('end', localInput(e.end), 'datetime-local'), 'Empty = no end.') + '</div>' +
        '<div class="v6-two">' + field('XP multiplier', inp('xpMult', e.xpMult, 'number', 'step="0.05" min="0.5" max="5"')) + field('Token cost of a rescue', inp('tokenCost', e.tokenCost, 'number', 'min="0" max="10"')) + '</div>' +
        '<div class="v6-two">' + field('Second chances a day, free', inp('mspcFree', e.mspcFree || '', 'number', 'min="0" max="100"'), 'Empty = the normal 5.') + field('Second chances a day, paid', inp('mspcPaid', e.mspcPaid || '', 'number', 'min="0" max="500"'), 'Empty = the normal 50.') + '</div>' +
        '<div class="v6-two">' + field('Accent colour', inp('accent', th.accent || '#38bdf8', 'color')) + field('Text on the accent', inp('accentInk', th.accentInk || '#082f49', 'color')) + '</div>' +
        '<label class="switch-row"><span>Use the colour theme</span><input type="checkbox" name="useTheme"' + (th.accent ? ' checked' : '') + '></label>' +
        field('Welcome pop-up title', inp('wTitle', w.title, 'text', 'maxlength="60"')) + field('Welcome pop-up text', '<textarea class="input" name="wText" rows="3" maxlength="400">' + esc(w.text || '') + '</textarea>') +
        '<h3>Exclusive challenge</h3><div class="v6-two">' + field('Challenge title', inp('cTitle', ch.title, 'text', 'maxlength="60"'), 'Empty = no challenge.') +
        field('Counts', '<select class="input" name="cMetric">' + [['xp', 'XP earned'], ['correct', 'Correct answers'], ['puzzles', 'Puzzles solved'], ['boss', 'Boss Fights cleared']].map((m) => '<option value="' + m[0] + '"' + (ch.metric === m[0] ? ' selected' : '') + '>' + m[1] + '</option>').join('') + '</select>') + '</div>' +
        '<div class="v6-two">' + field('Target', inp('cTarget', ch.target || '', 'number', 'min="1"')) + field('Reward: tokens', inp('cTokens', (ch.reward || {}).tokens || '', 'number', 'min="0" max="50"')) + '</div>' +
        '<div class="v6-two">' + field('Reward: XP', inp('cXp', (ch.reward || {}).xp || '', 'number', 'min="0"')) + field('Exclusive badge name', inp('cBadge', (ch.badge || {}).name, 'text', 'maxlength="40"')) + '</div>' +
        '<label class="switch-row"><span>Event is switched on</span><input type="checkbox" name="on"' + (e.on !== false ? ' checked' : '') + '></label>' +
        '<div class="btn-row"><button type="submit" class="btn btn-primary">Save event</button><button type="button" class="btn btn-ghost" data-v6ev="cancel">Cancel</button></div></form>';
    }
    function paint() {
      const now = Date.now();
      root.innerHTML = '<header class="v6-head"><div><h1>Master Event Engine</h1><p class="muted">Dates, multipliers, token costs, second-chance limits, colour themes, welcome pop-ups and challenges. Players pick changes up within a few minutes.</p></div><a class="btn btn-ghost btn-sm" href="#profile">Profile</a></header>' +
        (msg ? '<p class="v6-note-box">' + esc(msg) + '</p>' : '') +
        (edit ? form() : '<div class="btn-row"><button type="button" class="btn btn-primary" data-v6ev="new">' + icon('plus') + ' New event</button></div><div class="v6-events">' + (list.length ? list.map((e) => '<div class="v6-event"><div><b>' + esc(e.title) + '</b><small>' + (C.eventActive(e, now) ? 'Live' : e.on === false ? 'Off' : e.start > now ? 'Scheduled' : 'Ended') + ', ' + esc(dateText(e.start)) + (e.end ? ' to ' + esc(dateText(e.end)) : '') + ', XP ×' + e.xpMult + '</small></div><div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-v6ev="edit" data-id="' + esc(e.id) + '">Edit</button><button type="button" class="btn btn-quiet btn-sm" data-v6ev="del" data-id="' + esc(e.id) + '">Delete</button></div></div>').join('') : '<p class="muted small">No events yet.</p>') + '</div>' +
          (goals ? '<h3>Community goals this week</h3><form class="v6-two v6-goals" data-v6ev-goals>' + [['xp', 'XP goal'], ['correct', 'Correct answers'], ['puzzles', 'Puzzles solved'], ['boss', 'Boss Fights']].map((g) => field(g[1], inp('g_' + g[0], goals.goals[g[0]], 'number', 'min="1"'))).join('') + field('Minimum XP to share the buff', inp('g_min', goals.min, 'number', 'min="0"')) + '<div class="btn-row"><button type="submit" class="btn btn-ghost btn-sm">Save goals</button></div></form>' : ''));
    }
    async function load() {
      try {
        const r = await V5Net.post('v6_event_list', { token: tokenOf() });
        list = (Array.isArray(r.events) ? r.events : []).map((e) => Object.assign({ on: e.on !== false }, cleanEvent(e) || {})).filter((e) => e.id);
        goals = r.goals && r.goals.goals ? r.goals : null; msg = '';
      } catch (e) { msg = 'The Arena server said no (' + esc(e.reason || 'error') + '). Check the address and the admin token.'; }
      if (alive) paint();
    }
    const val = (f, n) => (f.elements[n] ? f.elements[n].value : '');
    async function onSubmit(ev) {
      const f = ev.target.closest('[data-v6ev-form]');
      if (f) {
        ev.preventDefault();
        const o = { id: val(f, 'id'), title: val(f, 'title'), on: f.elements.on.checked, start: fromInput(val(f, 'start')), end: fromInput(val(f, 'end')), xpMult: num(val(f, 'xpMult'), 1), tokenCost: num(val(f, 'tokenCost'), 1), mspcFree: num(val(f, 'mspcFree'), 0), mspcPaid: num(val(f, 'mspcPaid'), 0),
          theme: f.elements.useTheme.checked ? { accent: val(f, 'accent'), accentInk: val(f, 'accentInk') } : null, welcome: { title: val(f, 'wTitle'), text: val(f, 'wText') },
          challenge: val(f, 'cTitle') ? { title: val(f, 'cTitle'), metric: val(f, 'cMetric'), target: num(val(f, 'cTarget'), 1), reward: { tokens: num(val(f, 'cTokens'), 0), xp: num(val(f, 'cXp'), 0) }, badge: val(f, 'cBadge') ? { id: val(f, 'id'), name: val(f, 'cBadge') } : null } : null };
        try { await V5Net.post('v6_event_save', { token: tokenOf(), event: o }); edit = null; toast('Event saved.', 'good'); sync(); } catch (e) { msg = 'Could not save (' + esc(e.reason || 'error') + ').'; }
        load(); return;
      }
      const g = ev.target.closest('[data-v6ev-goals]');
      if (g) {
        ev.preventDefault();
        try { await V5Net.post('v6_goals_save', { token: tokenOf(), goals: { xp: num(val(g, 'g_xp'), 1), correct: num(val(g, 'g_correct'), 1), puzzles: num(val(g, 'g_puzzles'), 1), boss: num(val(g, 'g_boss'), 1) }, min: num(val(g, 'g_min'), 0) }); toast('Goals saved.', 'good'); } catch (e) { msg = 'Could not save (' + esc(e.reason || 'error') + ').'; }
        load();
      }
    }
    async function onClick(ev) {
      const b = ev.target.closest('[data-v6ev]');
      if (!b) return;
      const a = b.getAttribute('data-v6ev'), id = b.getAttribute('data-id');
      if (a === 'new') { edit = blankEv(); paint(); }
      else if (a === 'cancel') { edit = null; paint(); }
      else if (a === 'edit') { edit = JSON.parse(JSON.stringify(list.filter((e) => e.id === id)[0] || blankEv())); paint(); }
      else if (a === 'del') {
        if (!(await confirmSheet('Delete this event?', 'Players stop seeing it, and its multiplier ends.', 'Delete'))) return;
        try { await V5Net.post('v6_event_delete', { token: tokenOf(), id }); toast('Event deleted.', 'good'); sync(); } catch (e) { msg = 'Could not delete (' + esc(e.reason || 'error') + ').'; }
        load();
      }
    }
    root.addEventListener('submit', onSubmit); root.addEventListener('click', onClick);
    paint(); load();
    return () => { alive = false; root.removeEventListener('submit', onSubmit); root.removeEventListener('click', onClick); };
  }

  /* ---------- Shuffle Trainer: the filter bar and the Smart Mix ---------- */
  const slug6 = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  function leakSets() {
    const out = { M: {}, S: {}, P: {}, C: {} };
    let log = [];
    try { log = MistakeLog.all() || []; } catch (e) { log = []; }
    const groups = {};
    (CONTENT.openings || []).forEach((o) => { if (o && o.group) (groups[o.group] = groups[o.group] || []).push(o.id); });
    log.forEach((x) => {
      if (!x || !out[x.k]) return;
      const hay = slug6(x.opening) + ' ' + (Array.isArray(x.tags) ? x.tags.join(' ') : String(x.tags || '')).toLowerCase();
      Object.keys(groups).forEach((g) => {
        const gs = slug6(g), first = gs.split('-')[0];
        if (hay.indexOf(gs) >= 0 || (first.length >= 4 && hay.indexOf(first) >= 0)) groups[g].forEach((id) => { out[x.k][id] = 1; });
      });
    });
    return out;
  }
  function shuffleCtx() {
    return { progress: App.progress, now: Date.now(), decay: C.CFG.decayDays, leak: leakSets(), mistakes: (id) => { try { return !!SRS.lineHasMistakes(id); } catch (e) { return false; } } };
  }
  const SH_FILTERS = [['mix', 'Smart Mix'], ['notseen', 'Not seen yet'], ['frontline', 'Active Frontline'], ['mistakes', 'My Mistakes'], ['leak:M', 'Leak: Move'], ['leak:S', 'Leak: Specifics'], ['leak:P', 'Leak: Priorities'], ['leak:C', 'Leak: Calculation']];
  function narrow(filter, open) {
    if (typeof filter !== 'string' || filter.indexOf('v6:') !== 0) return null;
    const mode = filter.slice(3), c = shuffleCtx();
    return mode === 'mix' ? C.smartMix(open, c, 30) : C.filterLines(open, mode, c);
  }
  function counts(open) { const c = shuffleCtx(), o = {}; SH_FILTERS.forEach((f) => { o[f[0]] = f[0] === 'mix' ? Math.min(open.length, 30) : C.filterLines(open, f[0], c).length; }); return o; }
  function filterOptions(current, open) {
    const n = counts(open);
    return '<optgroup label="Training filters">' + SH_FILTERS.map((f) => '<option value="v6:' + f[0] + '"' + (current === 'v6:' + f[0] ? ' selected' : '') + '>' + esc(f[1]) + ' (' + n[f[0]] + ')</option>').join('') + '</optgroup>';
  }
  function filterBar(current, open) {
    const n = counts(open);
    return '<div class="sh-group v6-filters"><span class="sh-label">Quick filters</span><div class="v6-chips">' +
      '<button type="button" class="btn ' + (current === 'v6:mix' ? 'btn-primary' : 'btn-ghost') + ' btn-sm v6-auto" data-v6-f="v6:mix"' + (open.length ? '' : ' disabled') + ' aria-pressed="' + (current === 'v6:mix') + '">' + icon('wand-magic-sparkles') + ' Smart Mix: Auto-Pilot</button>' +
      SH_FILTERS.slice(1).map((f) => '<button type="button" class="v6-chip-btn" data-v6-f="v6:' + f[0] + '" aria-pressed="' + (current === 'v6:' + f[0]) + '"' + (n[f[0]] ? '' : ' disabled title="Nothing matches yet"') + '>' + esc(f[1]) + ' <small>' + n[f[0]] + '</small></button>').join('') + '</div></div>';
  }

  /* ---------- Trim review: the eight icons, for both players ---------- */
  function tagHTML(it, prev) {
    const ic = C.reviewIcon(it, prev, (cp) => Engine.winPct(cp));
    return ic ? '<span class="t v6-k v6-k-' + ic.k + '" title="' + esc(ic.name + ': ' + ic.text) + '">' + esc(ic.glyph) + '</span>' : '';
  }
  const budget = (mine, opp, user) => { let a = 0, b = 0; return (c) => (c.it.color === user ? a++ < mine : b++ < opp); };
  function legend() {
    return '<div class="v6-legend" aria-label="Move icons">' + Object.keys(C.ICONS).map((k) => '<span><span class="t v6-k v6-k-' + k + '">' + esc(C.ICONS[k][0]) + '</span> ' + esc(C.ICONS[k][1]) + '</span>').join('') + '</div>';
  }

  /* ---------- friend cards, top-bar chip, settings ---------- */
  const cleanTxt = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').trim().slice(0, n);
  function card() { const R = ranks(); return C.cardLine({ student: R.student.name, arena: R.arena.name, xp: st().total, trophies: st().trophies.slice(-3).map((t) => t.name) }); }
  function cleanCard(x) {
    if (!x || typeof x !== 'object' || !cleanTxt(x.r, 14)) return null;
    return { r: cleanTxt(x.r, 14), a: cleanTxt(x.a, 10), x: C.clampN(Math.round(num(x.x, 0)), 0, 99999999), t: (Array.isArray(x.t) ? x.t : []).slice(0, 3).map((t) => cleanTxt(t, 24)).filter(Boolean) };
  }
  function friendLine(f) {
    const x = f && f.x;
    if (!x || !x.r) return '';
    return '<p class="v6-fline">' + icon('ranking-star') + ' ' + esc(x.r) + (x.a && x.a !== 'Unranked' ? ', Arena ' + esc(x.a) : '') + ', ' + fmt(x.x) + ' XP' + (x.t && x.t.length ? '. ' + x.t.map(esc).join(', ') : '') + '</p>';
  }
  function chip() { const R = ranks(); return '<span class="v6-chip" style="--ring:' + R.arena.color + '" title="Overall rank: ' + esc(R.overall.name) + '">' + esc(R.overall.name.slice(0, 3).toUpperCase()) + '</span>'; }
  function settingsHTML() {
    return '<label class="switch-row"><span>Executive Focus Mode<small class="field-hint" style="display:block">Hides timers, streak widgets and the flow chip. XP and multipliers keep running.</small></span><input type="checkbox" data-v6-focus' + (st().focus ? ' checked' : '') + '></label>' +
      '<a class="btn btn-ghost btn-sm" href="#profile" data-close style="justify-self:start">' + icon('ranking-star') + ' Open my executive profile</a>';
  }
  /* ---------- wiring ---------- */
  function onDocClick(e) {
    const h = e.target.closest('[data-v6="hint"]');
    if (h) { hintPress(h.closest('[data-v6-strip]')); return; }
    const g = e.target.closest('[data-v6="hourglass"]');
    if (g) {
      const m = stripModule(), s = st();
      if (!m) return;
      if (s.hard[m] === 'hard') delete s.hard[m]; else s.hard[m] = 'hard';
      pos.t0 = Date.now(); save(); renderStrips(); return;
    }
    const f = e.target.closest('[data-v6-f]');
    if (f && !f.disabled) {
      const sel = qs('#sh-filter');
      if (!sel) return;
      const v = f.getAttribute('data-v6-f');
      sel.value = sel.value === v ? '' : v;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  function onDocChange(e) { const t = e.target; if (t && t.matches && t.matches('[data-v6-focus]')) { setFocus(t.checked); qsa('[data-v6-focus]').forEach((x) => { x.checked = t.checked; }); const lab = qs('.v6-focus > span'); if (lab && lab.firstChild) lab.firstChild.textContent = 'Focus Mode: ' + (t.checked ? 'ON' : 'OFF'); } }
  function boot() {
    S = load(); applyFocus(); applyTheme(); ensureBounties();
    const view = qs('#view');
    if (view) new MutationObserver(kick).observe(view, { childList: true, subtree: true });
    document.addEventListener('click', onDocClick);
    document.addEventListener('change', onDocChange);
    window.addEventListener('hashchange', () => { resetPos(); kick(); });
    kick(); sync();
    setInterval(() => { if (document.visibilityState === 'visible') sync(); }, 300000);
  }
  return {
    boot, mountProfile, mountEvents, narrow, filterOptions, filterBar, tagHTML, budget, legend, card, cleanCard, friendLine, chip, settingsHTML,
    ctx(o) { if (o && o.module) { ctx.shuffle = o.module; resetPos(); } },
    state: st, ranks, sync, events, payout, matrix,
    _t: { forceAdmin(v) { adminOverride = v; }, tokenOf, onScore, hintPress, makeBoss, resetPos, get pos() { return pos; }, get boss() { return boss; }, secondLeft, addXp, bountyEvent, eventProgress, trophy, benchNow, leakSets, shuffleCtx, setState(s) { S = s; }, ctxo: ctx }
  };
})();
