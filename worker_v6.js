
/* ==========================================================================
   v6: the Executive layer on the server (hub v6.0.0)
   - Master Event Engine: dates, XP multipliers, token costs, second-chance
     limits, colour themes, welcome pop-ups and challenges. Players read the
     live ones with v6_state; the admin edits them with the ADMIN_TOKEN.
   - Community benchmarks: every player's weekly contribution (XP, correct
     answers, puzzles, Boss Fights) is summed here. The XP total sets a phase,
     and a phase gives a server-wide XP buff to players who contributed the
     minimum. The server caps what one player can add.
   - Arena rating: updated once per finished week from the tournament result
     (the same formula as the hub: V6Core.arenaUpdate, a copy, below).
   ========================================================================== */
const V6D = { goals: { xp: 250000, correct: 20000, puzzles: 3000, boss: 400 }, min: 100, phases: [[0.4, 1.1], [0.7, 1.15], [1, 1.2]], arena: { start: 1100, floor: 1000, cap: 3000, maxWeek: 60 }, weekCap: { xp: 30000, correct: 3000, puzzles: 600, boss: 60 } };
const v6clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
/* ---------- shared with index.html: keep both copies identical ---------- */
function v6Phase(total, goal) {
  const g = Math.max(1, +goal || 1), p = Math.max(0, +total || 0) / g;
  let phase = -1, mult = 1;
  V6D.phases.forEach((ph, i) => { if (p >= ph[0]) { phase = i; mult = ph[1]; } });
  return { pct: Math.min(1, p), phase, mult };
}
function v6ArenaUpdate(rating, rank, players) {
  const A = V6D.arena, r = Number.isFinite(+rating) ? +rating : A.start, n = Math.max(1, Math.round(+players || 1)), k = v6clamp(Math.round(+rank || n), 1, n);
  const p = n > 1 ? 1 - (k - 1) / (n - 1) : 0.5, weight = v6clamp(n / 8, 0.25, 1);
  return v6clamp(Math.round(r + (p - 0.5) * 2 * A.maxWeek * weight), A.floor, A.cap);
}
/* ---------- end of the shared part ---------- */
async function v6Goals(env) {
  const row = await env.DB.prepare("SELECT v FROM v6_cfg WHERE k = 'goals'").first();
  let o = null;
  try { o = row ? JSON.parse(row.v) : null; } catch (e) { o = null; }
  const g = o && o.goals && typeof o.goals === 'object' ? o.goals : {};
  return { goals: { xp: int(g.xp, 1, 1e9) || V6D.goals.xp, correct: int(g.correct, 1, 1e9) || V6D.goals.correct, puzzles: int(g.puzzles, 1, 1e9) || V6D.goals.puzzles, boss: int(g.boss, 1, 1e9) || V6D.goals.boss }, min: o && Number.isFinite(+o.min) ? int(o.min, 0, 1e6) : V6D.min };
}
function v6CleanEvent(e) {
  if (!e || typeof e !== 'object' || !/^[\w-]{2,40}$/.test(String(e.id || ''))) throw err('bad_input');
  const col = (v) => (/^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? String(v) : ''), ch = e.challenge && typeof e.challenge === 'object' ? e.challenge : null, th = e.theme && typeof e.theme === 'object' ? e.theme : null, w = e.welcome && typeof e.welcome === 'object' ? e.welcome : null;
  const out = {
    id: String(e.id), title: str(e.title, 60) || 'Event', on: e.on !== false, start: int(e.start, 0, 4e12) || 0, end: int(e.end, 0, 4e12) || 0,
    xpMult: Math.round(v6clamp(Number.isFinite(+e.xpMult) ? +e.xpMult : 1, 0.5, 5) * 100) / 100, tokenCost: int(e.tokenCost, 0, 10) == null ? 1 : int(e.tokenCost, 0, 10),
    mspcFree: int(e.mspcFree, 0, 100) || 0, mspcPaid: int(e.mspcPaid, 0, 500) || 0,
    theme: th && col(th.accent) ? { accent: col(th.accent), accentInk: col(th.accentInk) || '#0b1222' } : null,
    welcome: w && (str(w.title, 60) || str(w.text, 400)) ? { title: str(w.title, 60), text: str(w.text, 400) } : null,
    challenge: null
  };
  if (out.end && out.end <= out.start) throw err('bad_dates');
  if (ch && str(ch.title, 60) && ['xp', 'correct', 'puzzles', 'boss'].indexOf(ch.metric) >= 0 && int(ch.target, 1, 1e6)) {
    const bd = ch.badge && typeof ch.badge === 'object' && str(ch.badge.name, 40) ? { id: String(ch.badge.id || e.id).replace(/[^\w-]/g, '').slice(0, 30) || out.id, name: str(ch.badge.name, 40) } : null;
    out.challenge = { title: str(ch.title, 60), metric: ch.metric, target: int(ch.target, 1, 1e6), reward: { tokens: int((ch.reward || {}).tokens, 0, 50) || 0, xp: int((ch.reward || {}).xp, 0, 1e5) || 0 }, badge: bd };
  }
  return out;
}
async function v6Events(env, admin) {
  const t = now(), q = admin ? 'SELECT doc FROM v6_events ORDER BY t_start DESC LIMIT 100'
    : 'SELECT doc FROM v6_events WHERE active = 1 AND (t_end = 0 OR t_end > ?) AND t_start <= ? ORDER BY t_start DESC LIMIT 20';
  const rows = (admin ? await env.DB.prepare(q).all() : await env.DB.prepare(q).bind(t, t + 3 * DAY).all()).results;
  return rows.map((r) => { try { return JSON.parse(r.doc); } catch (e) { return null; } }).filter(Boolean);
}
async function v6ArenaOf(env, pid) {
  const r = await env.DB.prepare('SELECT r_after AS rating, wk FROM v6_arena_log WHERE pid = ? ORDER BY wk DESC LIMIT 1').bind(pid).first();
  if (!r) return null;
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM v6_arena_log WHERE pid = ?').bind(pid).first();
  return { rating: r.rating, weeks: (n && n.n) || 1, last: r.wk };
}
/* One row per player per finished week; a second run of the same week changes nothing. */
async function v6ArenaApply(env, wk, entries) {
  for (const e of entries) {
    if (e.players < 2) continue;
    if (await env.DB.prepare('SELECT 1 AS x FROM v6_arena_log WHERE wk = ? AND pid = ?').bind(wk, e.pid).first()) continue;
    const prev = await env.DB.prepare('SELECT r_after AS r FROM v6_arena_log WHERE pid = ? AND wk < ? ORDER BY wk DESC LIMIT 1').bind(e.pid, wk).first();
    const before = prev ? prev.r : V6D.arena.start;
    await env.DB.prepare('INSERT OR IGNORE INTO v6_arena_log (wk, pid, r_before, r_after, rank, players) VALUES (?, ?, ?, ?, ?, ?)').bind(wk, e.pid, before, v6ArenaUpdate(before, e.rank, e.players), e.rank, e.players).run();
  }
}
const V6_ACTIONS = {
  /* The player's contribution goes in (capped), the live events, the community totals and the arena rating come back. */
  async v6_state(b, env) {
    const me = await touch(env, b);
    await quota(env, me.pid, 'v6', 1, 2000);
    const t = now(), period = isoWeek(t), add = b.add && typeof b.add === 'object' ? b.add : {};
    const a = { xp: int(add.xp, 0, 5000) || 0, correct: int(add.correct, 0, 600) || 0, puzzles: int(add.puzzles, 0, 200) || 0, boss: int(add.boss, 0, 10) || 0 };
    let mine = await env.DB.prepare('SELECT xp, correct, puzzles, boss, updated FROM v6_bench WHERE period = ? AND pid = ?').bind(period, me.pid).first();
    if (!me.banned && (a.xp || a.correct || a.puzzles || a.boss)) {
      const sec = mine ? Math.max(0, t - mine.updated) / 1000 : 600, W = V6D.weekCap, cur = mine || { xp: 0, correct: 0, puzzles: 0, boss: 0 };
      const next = {
        xp: Math.min(W.xp, cur.xp + Math.min(a.xp, Math.floor(sec * 60) + 500)), correct: Math.min(W.correct, cur.correct + Math.min(a.correct, Math.floor(sec) + 20)),
        puzzles: Math.min(W.puzzles, cur.puzzles + Math.min(a.puzzles, Math.floor(sec / 5) + 5)), boss: Math.min(W.boss, cur.boss + Math.min(a.boss, Math.floor(sec / 60) + 2))
      };
      await env.DB.prepare('INSERT INTO v6_bench (period, pid, xp, correct, puzzles, boss, updated) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (period, pid) DO UPDATE SET xp = excluded.xp, correct = excluded.correct, puzzles = excluded.puzzles, boss = excluded.boss, updated = excluded.updated')
        .bind(period, me.pid, next.xp, next.correct, next.puzzles, next.boss, t).run();
      mine = Object.assign({}, next, { updated: t });
    }
    const cfg = await v6Goals(env);
    const tot = await env.DB.prepare('SELECT COALESCE(SUM(b.xp), 0) AS xp, COALESCE(SUM(b.correct), 0) AS correct, COALESCE(SUM(b.puzzles), 0) AS puzzles, COALESCE(SUM(b.boss), 0) AS boss, COUNT(*) AS players FROM v6_bench b JOIN players p ON p.pid = b.pid WHERE b.period = ? AND p.banned = 0 AND b.xp > 0').bind(period).first();
    const totals = { xp: tot.xp, correct: tot.correct, puzzles: tot.puzzles, boss: tot.boss };
    return {
      period, events: await v6Events(env, false), arena: await v6ArenaOf(env, me.pid),
      bench: { period, goals: cfg.goals, min: cfg.min, totals, players: tot.players, phase: v6Phase(totals.xp, cfg.goals.xp) },
      mine: { period, xp: mine ? mine.xp : 0, correct: mine ? mine.correct : 0, puzzles: mine ? mine.puzzles : 0, boss: mine ? mine.boss : 0 }
    };
  },
  async v6_event_list(b, env) { needAdmin(env, b); return { events: await v6Events(env, true), goals: await v6Goals(env) }; },
  async v6_event_save(b, env) {
    needAdmin(env, b);
    const e = v6CleanEvent(b.event);
    if (!(await env.DB.prepare('SELECT id FROM v6_events WHERE id = ?').bind(e.id).first()) && (await env.DB.prepare('SELECT COUNT(*) AS n FROM v6_events').first()).n >= 100) throw err('too_many');
    await env.DB.prepare('INSERT INTO v6_events (id, doc, t_start, t_end, active, updated) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET doc = excluded.doc, t_start = excluded.t_start, t_end = excluded.t_end, active = excluded.active, updated = excluded.updated')
      .bind(e.id, JSON.stringify(e), e.start, e.end, e.on ? 1 : 0, now()).run();
    return { id: e.id };
  },
  async v6_event_delete(b, env) {
    needAdmin(env, b);
    if (!/^[\w-]{2,40}$/.test(String(b.id || ''))) throw err('bad_input');
    return { removed: (await env.DB.prepare('DELETE FROM v6_events WHERE id = ?').bind(b.id).run()).meta.changes };
  },
  async v6_goals_save(b, env) {
    needAdmin(env, b);
    const g = b.goals && typeof b.goals === 'object' ? b.goals : {};
    const doc = { goals: { xp: int(g.xp, 1, 1e9) || V6D.goals.xp, correct: int(g.correct, 1, 1e9) || V6D.goals.correct, puzzles: int(g.puzzles, 1, 1e9) || V6D.goals.puzzles, boss: int(g.boss, 1, 1e9) || V6D.goals.boss }, min: int(b.min, 0, 1e6) == null ? V6D.min : int(b.min, 0, 1e6) };
    await env.DB.prepare("INSERT INTO v6_cfg (k, v) VALUES ('goals', ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v").bind(JSON.stringify(doc)).run();
    return doc;
  }
};
Object.assign(ACTIONS, V6_ACTIONS);
