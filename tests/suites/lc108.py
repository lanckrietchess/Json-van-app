# lc108 (9.77.0): the Endgame Lab (#eg-lab: the Blueprint view with every rule and its examples, the find-the-move runner,
# the must-know positions, the upgrade triggers; and the view by endgame type) and the Middlegame Lab (#mg-lab), the Plan Check on
# Ranked (not in the middlegame course any more), the lesson steps (every ref exists), the cards on Theory > Endgame / Middlegame, the
# play-out against the real Stockfish (the rule of the square, played to the draw), the end rules (stalemate when you must win),
# the Pro gate on my endgames, the LC95 hand-over of the key moments, and the courses without Lichess drills.
# Real Chromium, signed in as the owner, the real data/eg-lab.json and data/mg-lab.json.
APP = 'http://127.0.0.1:8765/app.html'
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
OLD = "localStorage.setItem('lc34-first', JSON.stringify(Date.now() - 20 * 864e5))"
OVER = "Math.max(0, document.documentElement.scrollWidth - innerWidth)"
SPY = "window.__lc95 = null; { const o = sessionStorage.setItem.bind(sessionStorage); sessionStorage.setItem = (k, v) => { if (k === 'lc95-open') window.__lc95 = JSON.parse(v); return o(k, v); }; } 0"
def boot(br, tag, hash, w=390, h=844):
    c = mkctx(br, w, h, w < 800); pg = c.new_page(); watch(pg, 'lc108-' + tag)
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(OWNER); pg.evaluate(OLD)
    pg.goto(APP + '#home'); pg.wait_for_timeout(2600)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
    if hash: pg.evaluate("h => { location.hash = h }", hash); pg.wait_for_timeout(2200)
    return c, pg
with sync_playwright() as p:
    br = p.chromium.launch()
    c, pg = boot(br, 'eg', '#eg-lab')
    pg.wait_for_timeout(1200)
    out('blueprint [default view, tier tabs, Tier 0 mission, rules with tags, examples]', pg.evaluate("""(() => { const r = document.querySelector('[data-lc108-eg]');
      return [LC108._t.state.view, r.querySelectorAll('[data-lc108-part]').length >= 7, /know what wins, what draws/.test(r.textContent), r.querySelectorAll('.lc108-chip').length > 10, r.querySelectorAll('[data-lc108-ex]').length > 5]; })()"""))
    pg.click('[data-lc108-part="T1"]'); pg.wait_for_timeout(400)
    out('Tier 1 [R1.16 shown, Lucena P1.4 playable, triggers]', pg.evaluate("""(() => { const r = document.querySelector('[data-lc108-eg]');
      return [!!document.getElementById('lc108-r-R1.16'), !!r.querySelector('[data-lc108-pos^="P1.4|"]'), r.querySelectorAll('[data-lc108-trig]').length]; })()"""))
    ex = pg.evaluate("""(() => { const b = [...document.querySelectorAll('[data-lc108-ex]')].find(x => /Find the move/.test(x.textContent)); return b ? b.getAttribute('data-lc108-ex') : null; })()""")
    pg.evaluate("k => document.querySelector('[data-lc108-ex=\"' + k + '\"]').click()", ex); pg.wait_for_timeout(1600)
    out('find the move [sheet, board, their move played, your turn]', pg.evaluate("(() => { const F = LC108._t.fr(); return [!!document.querySelector('[data-lc108-fr]'), !!document.querySelector('[data-lc108-fr] [data-lc108-bd] *'), F.i, F.g.turn() === F.side]; })()"))
    for i in range(8):
        st = pg.evaluate("(() => { const F = LC108._t.fr(); if (!F || F.over) return 'over'; if (F.busy || F.g.turn() !== F.side) return 'wait'; const u = F.x.solution[F.i]; return u; })()")
        if st == 'over': break
        if st == 'wait': pg.wait_for_timeout(500); continue
        pg.evaluate("u => LC108._t.frMove({from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4]})", st); pg.wait_for_timeout(700)
    out('find the move, solved [over, solved text, the reason, the source]', pg.evaluate("""(() => { const F = LC108._t.fr(); const f = document.querySelector('[data-lc108-fr] [data-lc108-fb]').textContent;
      return [F.over, /Solved/.test(f), f.indexOf(F.x.reason.slice(0, 20)) >= 0, /my game|Lichess database/i.test(f)]; })()"""))
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(400)
    pg.click('[data-lc108-pos^="P1.4|"]'); pg.wait_for_timeout(1500)
    out('Lucena from the book [play-out, goal win]', pg.evaluate("(() => { const P = LC108._t.po(); return [!!P, P && P.it.goal, P && P.side]; })()"))
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(400)
    pg.click('[data-lc108-trig="T1-0"]'); pg.wait_for_timeout(200)
    out('upgrade trigger [saved]', pg.evaluate("!!JSON.parse(localStorage.getItem('lc108-trig') || '{}')['T1-0']"))
    pg.click('[data-lc108-view="types"]'); pg.wait_for_timeout(500)
    out('endgame lab [title, types, rook first, checklist, lessons, positions to know, my endgames, key moments]', pg.evaluate("""(() => { const r = document.querySelector('[data-lc108-eg]');
      return [r.querySelector('h1').textContent.trim(), r.querySelectorAll('[data-lc108-type]').length >= 8, r.querySelector('.lc108-type.is-on b').textContent,
        r.querySelectorAll('ol li').length >= 4, r.querySelectorAll('details').length >= 2, r.querySelectorAll('[data-lc108-kind=theory]').length, r.querySelectorAll('[data-lc108-kind=play]').length >= 10, !!r.querySelector('[data-lc108-mom]')]; })()"""))
    out('rook: Lucena and Philidor, goals', pg.evaluate("[...document.querySelectorAll('[data-lc108-eg] .lc108-row')].filter(r => r.querySelector('[data-lc108-kind=theory]')).map(r => r.querySelector('b').textContent + ' / ' + r.querySelector('.lc108-chip').textContent)"))
    out('phone [overflow-x]', pg.evaluate(OVER))
    pg.click('[data-lc108-type="kp"]'); pg.wait_for_timeout(300)
    out('king and pawn [selected, the square is there]', pg.evaluate("[document.querySelector('.lc108-type.is-on b').textContent, !!document.querySelector('[data-lc108-play=\"th-square\"]')]"))
    pg.click('[data-lc108-play="th-square"]'); pg.wait_for_timeout(1200)
    out('play-out sheet [goal, board, status]', pg.evaluate("(() => { const r = document.querySelector('[data-lc108-po]'); return [r.querySelector('.lc108-msg b').textContent, !!r.querySelector('[data-lc108-bd] *'), /Without a capture or pawn move/.test(r.textContent)]; })()"))
    seq = [('f4', 'e3'), ('e3', 'd3'), ('d3', 'c2')]
    for fr, to in seq:
        pg.wait_for_function("(() => { const P = LC108._t.po(); return P && !P.busy && (P.over || P.g.turn() === P.side); })()", timeout=30000)
        if pg.evaluate("LC108._t.po().over"): break
        pg.evaluate("m => LC108._t.move(m)", {'from': fr, 'to': to})
    for i in range(6):
        pg.wait_for_function("(() => { const P = LC108._t.po(); return P && !P.busy && (P.over || P.g.turn() === P.side); })()", timeout=30000)
        if pg.evaluate("LC108._t.po().over"): break
        mv = pg.evaluate("""(() => { const P = LC108._t.po(); const g = new Chess(P.g.fen()); const ms = g.moves({verbose: true}); const pw = (() => { for (const r of g.board()) for (const q of r) if (q && q.type === 'p' && q.color === 'b') return q.square; return null; })();
      const d = (a, b) => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(+a[1] - +b[1]));
      const m = ms.find(x => x.captured) || ms.filter(x => x.piece === 'k').sort((x, y) => pw ? d(x.to, pw) - d(y.to, pw) : 0)[0]; return m ? {from: m.from, to: m.to} : null; })()""")
        if not mv: break
        pg.evaluate("m => LC108._t.move(m)", mv)
    pg.wait_for_timeout(800)
    out('the square, played out [over, held, done saved]', pg.evaluate("(() => { const P = LC108._t.po(); const f = document.querySelector('[data-lc108-fb]').textContent; return [P.over, /Done\\./.test(f) && /draw/.test(f), !!JSON.parse(localStorage.getItem('lc108-done') || '{}')['th-square']]; })()"))
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(400)
    pg.click('[data-lc108-type="mates"]'); pg.wait_for_timeout(300)
    pg.click('[data-lc108-play="th-kqk"]'); pg.wait_for_timeout(1500)
    out('must win, stalemate on the board [lost, the reason]', pg.evaluate("""(() => { const P = LC108._t.po(); P.tok++; P.busy = false; P.g = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'); LC108._t.judgeEnd();
      const f = document.querySelector('[data-lc108-fb]').textContent; return [P.over, /Not this time/.test(f), /Stalemate: a draw\\. The win slipped away\\./.test(f)]; })()"""))
    out('hold, 50 moves without a pawn move [held]', pg.evaluate("""(() => { const P = LC108._t.po(); P.it = Object.assign({}, P.it, {goal: 'draw'}); P.over = false; P.g = new Chess('6bk/8/5K2/8/8/8/8/R7 w - - 100 80'); LC108._t.judgeEnd();
      return /50 moves without a capture or a pawn move: a draw\\. You held it\\./.test(document.querySelector('[data-lc108-fb]').textContent); })()"""))
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(400)
    pg.click('[data-lc108-type="rook"]'); pg.wait_for_timeout(300)
    pg.evaluate("window.__lc90 = []; App.isPro = () => false; try { Admin.preview = () => 'free'; } catch (e) {} try { LC90.open = o => { window.__lc90.push(o); }; } catch (e) {} 0")
    pg.evaluate("LC108.mountEG(document.querySelector('#view'))"); pg.wait_for_timeout(300)
    out('free player [3 open, the 4th is Pro, LC90 opens]', pg.evaluate("""(() => { const b = [...document.querySelectorAll('[data-lc108-kind=play]')]; b[3].click();
      return [b.slice(0, 3).every(x => !/Pro/.test(x.textContent)), /Pro/.test(b[3].textContent), window.__lc90.length && window.__lc90[0].from]; })()"""))
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(400)
    pg.evaluate(SPY)
    pg.click('[data-lc108-mom="rook"]'); pg.wait_for_timeout(1500)
    out('key moments [LC95 gets the ids and the label, opens the trainer]', pg.evaluate("[window.__lc95.ids.length > 10, window.__lc95.label, location.hash]"))
    pg.evaluate("location.hash = '#eg-lab'"); pg.wait_for_timeout(1500)
    pg.click('[data-lc108-view="book"]'); pg.wait_for_timeout(300); pg.click('[data-lc108-part="T2"]'); pg.wait_for_timeout(300)
    out('free player, Tier 2 example [locked, LC90 opens]', pg.evaluate("""(() => { window.__lc90 = []; const b = document.querySelector('[data-lc108-ex]'); if (!b) return ['none']; const lock = !!b.querySelector('svg, i, .icon') || /btn-quiet/.test(b.className); b.click();
      return [lock, window.__lc90.length ? window.__lc90[0].from : null]; })()"""))
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
    pg.evaluate("location.hash = '#endgame'"); pg.wait_for_timeout(2400)
    out('endgame card [shown, link]', pg.evaluate("(() => { const c = document.querySelector('[data-lc108-card]'); return c ? [true, c.querySelector('a').getAttribute('href')] : [false]; })()"))
    pg.evaluate("location.hash = '#middlegame'"); pg.wait_for_timeout(2400)
    out('middlegame card [shown, link]', pg.evaluate("(() => { const c = document.querySelector('[data-lc108-card]'); return c ? [true, c.querySelector('a').getAttribute('href')] : [false]; })()"))
    pg.evaluate("location.hash = '#mg-lab'"); pg.wait_for_timeout(2200)
    out('middlegame lab [title, tabs, the Greek Gift with its checklist]', pg.evaluate("""(() => { const r = document.querySelector('[data-lc108-mg]'); const gg = r.querySelector('[data-lc108-det=\"greek-gift\"]');
      return [r.querySelector('h1').textContent.trim(), r.querySelectorAll('[data-lc108-mgtab]').length, !!gg, gg ? gg.querySelectorAll('ol li').length >= 5 : false]; })()"""))
    pg.evaluate(SPY)
    pg.evaluate("document.querySelector('[data-lc108-det=\"greek-gift\"]').open = true; 0")
    pg.click('[data-lc108-det="greek-gift"] [data-lc108-which="found"]'); pg.wait_for_timeout(1500)
    out('Greek Gift [LC95 gets my positions]', pg.evaluate("[window.__lc95.ids.length > 0, window.__lc95.label, location.hash]"))
    pg.evaluate("location.hash = '#mg-lab'"); pg.wait_for_timeout(1500)
    pg.click('[data-lc108-mgtab="plans"]'); pg.wait_for_timeout(300)
    out('plans [structures, IQP there]', pg.evaluate("[document.querySelectorAll('[data-lc108-det]').length >= 8, !!document.querySelector('[data-lc108-det=\"iqp-mine\"]')]"))
    out('mg phone [overflow-x]', pg.evaluate(OVER))
    pg.evaluate("location.hash = '#middlegame'"); pg.wait_for_timeout(2600)
    out('middlegame course [no Plan Check]', pg.evaluate("[!document.querySelector('#v9-plan-host'), !/PLAN CHECK/i.test(document.querySelector('#view').innerText)]"))
    pg.evaluate("location.hash = '#ranked'"); pg.wait_for_timeout(3000)
    out('Ranked [Plan Check there, its board]', pg.evaluate("[!!document.querySelector('[data-lc108-plan] #v9-plan-host'), !!document.querySelector('[data-lc108-plan] #v9-plan-host *')]"))
    out('courses [no old Lichess drills, every theme id exists, every lesson step exists, 200+ rule examples, each with rule, reason, brief, explanation]', pg.evaluate("""fetch('content.json').then(r => r.json()).then(d => { const L = d.lists; const ids = new Set([...L.endgame, ...L.middlegame].map(x => x.id));
      const th = [...L.egthemes, ...L.mgthemes].flatMap(t => [t.anchorId, ...(t.simpleIds || []), ...(t.hardIds || [])]).filter(Boolean);
      const st = [...L['courses.endgame'], ...L['courses.middlegame']].flatMap(l => (l.steps || []).map(s => s.ref)).filter(Boolean);
      const ex = [...L.endgame, ...L.middlegame].filter(x => /^(kg|mg-kg|ldb|mg-ldb)-/.test(x.id));
      return [[...ids].some(i => /^(lc|mg-lc)-/.test(i)), th.every(i => ids.has(i)), st.length > 150 && st.every(i => ids.has(i)), ex.length > 200, ex.every(x => x.rule && x.reason && x.brief && x.explanation)]; })"""))
    out('LC108 [embedded copy equals lc108.js, init, afterRender, routes, build]', pg.evaluate("""(async () => {
      const src = await (await fetch('lc108.js')).text(), html = await (await fetch('app.html')).text();
      const a = html.indexOf('/*@@module lc108*/'), b = html.indexOf('/*@@end lc108*/') + 15;
      return [html.slice(a, b) === src.trim(), html.includes('LC108.init()'), html.includes('LC108.afterRender(route)'), html.includes('"eg-lab":v=>') && html.includes('"mg-lab":v=>'), LC108.version];
    })()"""))
    c.close()
    real = [e for e in errs if 'Failed to load resource' not in e]
    print('ERRORS', len(real))
    for e in real[:8]: print('  ', e)
