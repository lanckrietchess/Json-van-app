# coach956 (9.56.0): the honest coach. LC83.diagnose reads the board, Stockfish's better move and refutation, and the opponent's last move,
# and names the CAUSE of the mistake (a blocker that left its line, a mate allowed, a double attack allowed, a threat ignored ...).
# The same diagnosis feeds Game-to-Script (LC79 makeCase), the Trim coach card (LC61.tail), Content Trim (LC64.caseOf) and the course Runner.
# Case 1 is Kyenzo's own game: 22...Ng4?? (better Rh8) lets Rxf7+ because the knight on f6 was blocking the f-file.
APP = 'http://127.0.0.1:8765/app.html'
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
NG4 = '2r2r2/1bq1bpk1/p4n2/1p3R2/3P4/P1NQ4/1PB3PP/R5K1 b - - 0 22'
BACK = '4r1k1/5ppp/8/8/8/2N5/5PPP/6K1 w - - 0 1'
STOCK = 'pawn structure'
with sync_playwright() as p:
    br = p.chromium.launch()
    c = mkctx(br, 1280, 900); pg = c.new_page(); watch(pg, 'coach956')
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(OWNER)
    pg.goto(APP + '#home'); pg.wait_for_timeout(4500); pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())")
    D = "LC83.diagnose({fen: '%s', color: 'b', played: {from: 'f6', to: 'g4', san: 'Ng4'}, bestUci: 'f8h8', replyUci: 'f5f7'})" % NG4
    out('coach956 Ng4 [cause, letter, alarm]', pg.evaluate("(() => { const d = %s; return [d.id, d.k, d.alarm.label]; })()" % D))
    out('coach956 Ng4 error [names the f-file, the knight was blocking, Rxf7 with check, no x-ray through two pieces]', pg.evaluate("(() => { const e = %s.error; return [/f-file/.test(e), /knight on f6 was the piece blocking/.test(e), /Rxf7\\+ comes with check/.test(e), /rook on f8/.test(e) && !/attacks your rook on f8/.test(e)]; })()" % D))
    out('coach956 Ng4 action [names the line and the better move]', pg.evaluate("(() => { const a = %s.action; return [/f-file/.test(a), /Rh8/.test(a)]; })()" % D))
    out('coach956 Shilling Nxe5 [cause, letter]', pg.evaluate("(() => { const g = new Chess(); ['e4','e5','Nf3','Nc6','Bc4','Nd4'].forEach(m => g.move(m)); const d = LC83.diagnose({fen: g.fen(), color: 'w', played: {from: 'f3', to: 'e5', san: 'Nxe5'}, bestUci: 'f3d4', replyUci: 'd8g5'}); return [d.id, d.k, /g2/.test(d.error)]; })()"))
    out('coach956 back rank [cause, letter]', pg.evaluate("(() => { const d = LC83.diagnose({fen: '%s', color: 'w', played: {from: 'c3', to: 'b5', san: 'Nb5'}, bestUci: 'h2h3', replyUci: 'e8e1'}); return [d.id, d.k]; })()" % BACK))
    out('coach956 different causes give different texts [3 distinct errors, 3 distinct action steps]', pg.evaluate("(() => { const g = new Chess(); ['e4','e5','Nf3','Nc6','Bc4','Nd4'].forEach(m => g.move(m)); const a = [%s, LC83.diagnose({fen: g.fen(), color: 'w', played: {from: 'f3', to: 'e5'}, bestUci: 'f3d4', replyUci: 'd8g5'}), LC83.diagnose({fen: '%s', color: 'w', played: {from: 'c3', to: 'b5'}, bestUci: 'h2h3', replyUci: 'e8e1'})]; return [new Set(a.map(d => d.error)).size, new Set(a.map(d => d.action)).size]; })()" % (D, BACK)))
    # the Trim coach card
    out('coach956 coach card [what went wrong, their last move, alarm label, working point, action, no stock pawn-structure line]', pg.evaluate("(() => { const d = %s; const h = LC61.tail({fen: '%s', color: 'b', diag: d}); const t = h.replace(/<[^>]+>/g, ' '); return [/What went wrong/.test(t), /Their last move/.test(t), t.includes(d.alarm.label), t.includes(d.wp.text), t.includes(d.action), !t.toLowerCase().includes('%s')]; })()" % (D, NG4, STOCK)))
    # Game-to-Script (Creator Studio)
    out('coach956 game-to-script [letter, alarm from the diagnosis, error, socratic asks about Rh8, no stock line]', pg.evaluate("(() => { const g = {fens: ['%s', 'x'], moves: [{from: 'f6', to: 'g4', san: 'Ng4', color: 'b'}], headers: {White: 'A', Black: 'Kyenzo'}, color: 'b'}; const it = {i: 0, color: 'b', san: 'Ng4', num: 22, best: 'f8h8', bestSan: 'Rh8', reply: 'f5f7', replySan: 'Rxf7+', cls: 'blunder', loss: 45}; let c; try { c = LC79.makeCase(g, it); } catch (e) { return 'err ' + e.message; } const all = JSON.stringify([c.wp, c.action, c.alarm, c.qs]).toLowerCase(); return [c.letter, c.alarm.label, /f-file/.test(c.error), c.qs.some(q => /Rh8/.test(q.join(' '))), !all.includes('%s')]; })()" % (NG4, STOCK)))
    # Content Trim
    out('coach956 content trim caseOf [letter, error names the f-file, alarm]', pg.evaluate("(() => { const g = {fens: ['%s', 'x'], moves: [{from: 'f6', to: 'g4', san: 'Ng4', color: 'b'}]}; const it = {i: 0, color: 'b', san: 'Ng4', best: 'f8h8', bestSan: 'Rh8', reply: 'f5f7', replySan: 'Rxf7+', cls: 'blunder', loss: 45}; try { const c = LC64.caseOf(g, it, 0); return [c.letter, /f-file/.test(c.error || ''), c.alarm.label]; } catch (e) { return 'err ' + e.message; } })()" % NG4))
    # Trim key moment (lcCategorize) and the coach chat answer
    out('coach956 trim key moment [letter, text is the diagnosis, alarm kept]', pg.evaluate("(() => { if (typeof lcCategorize !== 'function') return 'no lcCategorize'; const g = new Chess('%s'); g.move({from: 'f6', to: 'g4'}); const Z = {fens: ['%s', g.fen()], moves: [{from: 'f6', to: 'g4', san: 'Ng4', color: 'b'}]}; const it = {i: 0, color: 'b', san: 'Ng4', num: 22, from: 'f6', to: 'g4', best: 'f8h8', bestSan: 'Rh8', reply: 'f5f7', cls: 'blunder', loss: 45}; lcCategorize(it, Z); return [it.k, /f-file/.test(it.text), it.diag && it.diag.alarm.label]; })()" % (NG4, NG4)))
    c.close(); br.close()
bad = [e for e in errs if ('PAGEERROR' in e or 'console' in e) and 'Failed to load' not in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
