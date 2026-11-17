# tools/course_engine.py (9.57.0): Stockfish 19 (the app's own engine, in headless Chromium) on every course drill and MSPC case.
# Writes tools/course_engine.json, which tools/course_truth.mjs reads to rewrite and audit the course texts.
#   python3 tools/course_engine.py        (needs Playwright + Chromium, like the test suites; about 3 minutes)
# Per item: the position after the opponent's setup move, Stockfish's 3 best lines there (depth 16), its best defence after
# the course's first move, and its best move for the opponent before the setup move.
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); os.environ.setdefault('LC_TESTS', os.path.join(os.path.dirname(HERE), 'tests'))
exec(open(os.path.join(os.environ['LC_TESTS'], 'harness.py')).read())
import json
c = json.load(open(os.path.join(REPO, 'content.json'), encoding='utf-8'))
L = c['lists']
items = []
for grp in ['endgame', 'middlegame']:
    for e in L[grp]: items.append({'grp': grp, 'id': e['id'], 'fen': e.get('puzzle_fen') or e['fen'], 'side': e['side'], 'sol': e['solution_moves']})
for t in L['think']:
    ln = [s for s in t['stages'] if s['type'] == 'line'][0]
    items.append({'grp': 'think', 'id': t['id'], 'fen': t['fen'], 'side': t['fen'].split(' ')[1], 'pgn': ln['pgn']})
with sync_playwright() as p:
    br = p.chromium.launch(); cx = mkctx(br, 1000, 800); pg = cx.new_page(); watch(pg, 'eng')
    pg.goto('http://127.0.0.1:8765/app.html#home'); pg.wait_for_timeout(4000)
    pg.evaluate("Engine.load()")
    out = {}
    for i in range(0, len(items), 10):
        chunk = items[i:i+10]
        res = pg.evaluate("""async (items) => { const R = {};
          const toU = m => m.from + m.to + (m.promotion || '');
          for (const it of items) { try {
            let sol = it.sol;
            if (!sol) { const g = new Chess(it.fen); const toks = it.pgn.replace(/\\d+\\.(\\.\\.)?/g, ' ').trim().split(/\\s+/); sol = []; for (const t of toks) { const m = g.move(t, {sloppy: true}); if (!m) { sol.push('ILLEGAL:' + t); break; } sol.push(toU(m)); } }
            const g0 = new Chess(it.fen); let setup = null, P0 = it.fen, ours = sol.slice();
            if (g0.turn() !== it.side) { setup = sol[0]; const m = g0.move({from: setup.slice(0,2), to: setup.slice(2,4), promotion: setup[4] || 'q'}); if (!m) { R[it.id] = {err: 'illegal setup'}; continue; } P0 = g0.fen(); ours = sol.slice(1); }
            const legal = (() => { const g = new Chess(P0); for (const u of ours) { if (/ILLEGAL/.test(u)) return false; if (!g.move({from: u.slice(0,2), to: u.slice(2,4), promotion: u[4] || 'q'})) return false; } return true; })();
            const a0 = await Engine.analyse(P0, {depth: 16, multipv: 3});
            const g1 = new Chess(P0); g1.move({from: ours[0].slice(0,2), to: ours[0].slice(2,4), promotion: ours[0][4] || 'q'});
            const a1 = g1.game_over() ? {lines: [{cp: null, mate: g1.in_checkmate() ? 0 : null, pv: []}], best: null} : await Engine.analyse(g1.fen(), {depth: 16});
            let opp = null; if (setup) { const ao = await Engine.analyse(it.fen, {depth: 14}); opp = {best: ao.best, pv: ao.lines[0].pv, cp: ao.lines[0].cp, mate: ao.lines[0].mate}; }
            R[it.id] = {setup: setup, P0: P0, ours: ours, legal: legal, lines: a0.lines.map(l => ({cp: l.cp, mate: l.mate, pv: l.pv.slice(0, 10)})), after: {cp: a1.lines[0].cp, mate: a1.lines[0].mate, pv: (a1.lines[0].pv || []).slice(0, 10)}, opp: opp};
          } catch (e) { R[it.id] = {err: String(e)}; } }
          return R; }""", chunk)
        out.update(res)
        print(i, len(out), flush=True)
    json.dump(out, open(os.path.join(REPO, 'tools/course_engine.json'), 'w'))
    cx.close(); br.close()
