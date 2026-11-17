import json
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
    # ---- the Coach Brain on real games with the real engine: five different mistakes, five different causes ----
    REAL = pg.evaluate("""async () => {
      await Engine.load();
      const games = {legal: ['1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 5. Nxe5 Bxd1', 'Bxd1'], elephant: ['1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Nbd7 5. cxd5 exd5 6. Nxd5', 'Nxd5'],
        noah: ['1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 d6 5. d4 b5 6. Bb3 Nxd4 7. Nxd4 exd4 8. Qxd4', 'Qxd4'], fried: ['1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5 6. Nxf7 Kxf7 7. Qf3+ Ke6 8. Nc3 Nb4 9. a3', 'a3'],
        shilling: ['1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7', 'Nxf7']};
      const out = {};
      for (const k of Object.keys(games)) { const g = new Chess(); g.load_pgn(games[k][0]); const h = g.history({verbose: true}); const m = h[h.length - 1]; g.undo(); const before = g.fen(); const prev = h.length > 1 ? (() => { const t = new Chess(before); t.undo(); return t.fen(); })() : null;
        const t = new Chess(before); t.move(m); const b = await Engine.analyse(before, {depth: 14}), a = await Engine.analyse(t.fen(), {depth: 14});
        const d = LC83.diagnose({fen: before, color: m.color, played: {from: m.from, to: m.to, promotion: m.promotion || 'q', san: m.san}, bestUci: b.best, replyUci: a.best, bestPv: b.lines[0].pv, replyPv: a.lines[0].pv, replyMate: a.lines[0].mate, prevFen: prev, oppUci: h.length > 1 ? h[h.length-2].from + h[h.length-2].to : null});
        out[k] = d ? {pv: a.lines[0].pv.join(' '), id: d.id, error: d.error, alarm: d.alarm.label, action: d.action, blind: d.blind && d.blind.id, train: d.train && d.train.theme, line: d.line && d.line.ref} : null; }
      return out; }""")
    out('coach956 real legal 5...Bxd1 [mate allowed, the line ends Nd5#, trains mate in 2, blind spot: the recapture never came]', [REAL['legal']['id'], 'Nd5#' in REAL['legal']['error'], REAL['legal']['train'], REAL['legal']['blind']])
    out('coach956 real elephant 6.Nxd5 [a piece is lost on d5, blind spot: the pin on f6 was not a real pin]', [REAL['elephant']['id'] in ('hanging', 'counter', 'discovered'), 'd5' in REAL['elephant']['error'], REAL['elephant']['blind']])
    out('coach956 real noah 8.Qxd4 [trapped piece, the bishop on b3, trains trapped pieces]', [REAL['noah']['id'], 'bishop on b3' in REAL['noah']['error'], REAL['noah']['train']])
    out('coach956 real fried liver 9.a3 [names the fork on c2, blind spot: looking at your own threat]', [REAL['fried']['id'] in ('ignoredThreat', 'doubleAttack'), 'forks your king on e1 and your rook on a1' in REAL['fried']['error'] or 'king on e1 and your rook on a1' in REAL['fried']['error'], REAL['fried']['blind']])
    out('coach956 real shilling 5.Nxf7 [the threat on g2 was ignored, names Qxg2]', [REAL['shilling']['id'], 'Qxg2' in REAL['shilling']['error']])
    out('coach956 real games [5 different errors, 5 different action steps, no stock pawn-structure line]', [len(set(v['error'] for v in REAL.values())), len(set(v['action'] for v in REAL.values())), not any(STOCK in (v['error'] + v['action']).lower() for v in REAL.values())])
    # ---- LC92: the AI coach on the player's own key (providers mocked; the key never goes anywhere else) ----
    calls = []
    GOOD = '{"headline":"The knight was the wall","why_it_felt_right":"Ng4 looks active.","what_happened":"Rxf7+ comes through the f-file once the knight on f6 leaves.","alarm_signal":"A blocker on a line.","working_point":"Before a piece leaves, check what it shields.","action_step":"Look along the f-file before Ng4.","how_to_find_the_better_move":"Rh8 moves the rook off the f-file first.","drill":"Ten x-ray puzzles."}'
    BAD = '{"headline":"Attack!","what_happened":"Qh5 wins at once on h7.","action_step":"Play Qh5."}'
    mode = {'g': [GOOD]}
    def gem(route):
        calls.append(('gemini', route.request.url, route.request.headers.get('x-goog-api-key'), route.request.post_data or ''))
        if '/models?' in route.request.url or route.request.url.endswith('/models'):
            return route.fulfill(status=200, content_type='application/json', body='{"models":[{"name":"models/gemini-flash-latest","supportedGenerationMethods":["generateContent"]}]}')
        txt = mode['g'].pop(0) if len(mode['g']) > 1 else mode['g'][0]
        route.fulfill(status=200, content_type='application/json', body=json.dumps({'candidates': [{'content': {'parts': [{'text': txt}]}}]}))
    def groq(route):
        calls.append(('groq', route.request.url, route.request.headers.get('authorization'), route.request.post_data or ''))
        if route.request.url.endswith('/models'): return route.fulfill(status=200, content_type='application/json', body='{"data":[{"id":"llama-3.1-8b-instant"},{"id":"openai/gpt-oss-120b"}]}')
        route.fulfill(status=200, content_type='application/json', body=json.dumps({'choices': [{'message': {'content': GOOD}}]}))
    def anth(route):
        calls.append(('anthropic', route.request.url, route.request.headers.get('anthropic-dangerous-direct-browser-access'), route.request.post_data or ''))
        if '/v1/models' in route.request.url: return route.fulfill(status=200, content_type='application/json', body='{"data":[{"id":"claude-haiku-5-5"}]}')
        route.fulfill(status=200, content_type='application/json', body=json.dumps({'content': [{'type': 'text', 'text': GOOD}]}))
    pg.route('https://generativelanguage.googleapis.com/**', gem); pg.route('https://api.groq.com/**', groq); pg.route('https://api.anthropic.com/**', anth)
    sent = []
    pg.on('request', lambda r: sent.append(r.url) if ('SECRET-KEY-123' in (r.post_data or '') or 'SECRET-KEY-123' in r.url or any('SECRET-KEY-123' in v for v in r.headers.values())) else None)
    pg.evaluate("location.hash = '#ai-coach'"); pg.wait_for_timeout(600)
    out('coach956 ai sheet [opens from #ai-coach, 6 providers, free ones first, key field is a password field]', pg.evaluate("(() => { const w = document.querySelector('.lc92-wrap'); if (!w) return 'no sheet'; const o = [...w.querySelectorAll('[data-lc92-f=prov] option')].map(x => x.value); return [o.length, o.slice(0, 3).join(','), w.querySelector('[data-lc92-f=key]').type]; })()"))
    pg.fill('.lc92-wrap [data-lc92-f=key]', 'SECRET-KEY-123'); pg.click('.lc92-wrap [data-lc92=save]'); pg.wait_for_timeout(1500)
    out('coach956 ai test and save [works, model picked from the list, saved on this device]', pg.evaluate("(() => [/Works/.test(document.querySelector('[data-lc92-st]').textContent), LC92._cfg().model, LC92.on()])()"))
    pg.evaluate("LC92.close()")
    pg.evaluate("(() => { const d = %s; const h = LC61.tail({fen: '%s', color: 'b', diag: d}); const box = document.createElement('div'); box.id = 't956'; box.className = 'lc61-tail'; box.innerHTML = h; document.body.appendChild(box); })()" % (D, NG4))
    out('coach956 coach card [stockfish line, train button, AI button]', pg.evaluate("(() => { const b = document.getElementById('t956'); return [/Stockfish\\./.test(b.textContent), !!b.querySelector('[data-lc61=train]'), !!b.querySelector('[data-lc92=explain]')]; })()"))
    pg.click('#t956 [data-lc92=explain]'); pg.wait_for_timeout(1500)
    out('coach956 ai explain [answer shown, checked against the board, sent the fact sheet with the diagnosis]', pg.evaluate("(() => { const o = document.querySelector('#t956 [data-lc92-out]'); return [/The knight was the wall/.test(o.textContent), /checked against the board/.test(o.textContent)]; })()") + [any('coach_brain_diagnosis' in c[3] and 'blocking the f-file' in c[3] for c in calls if c[0] == 'gemini')])
    # an answer with an invented move is retried once, then dropped
    pg.evaluate("localStorage.removeItem('lc92-cache')"); n0 = len([c for c in calls if ':generateContent' in c[1]]); mode['g'] = [BAD]
    pg.evaluate("document.getElementById('t956').remove()"); pg.evaluate("(() => { const d = %s; const box = document.createElement('div'); box.id = 't956'; box.innerHTML = LC92.block(d, {fen: '%s', color: 'b', san: 'Ng4', num: 22}); document.body.appendChild(box); })()" % (D, NG4))
    pg.click('#t956 [data-lc92=explain]'); pg.wait_for_timeout(1500)
    out('coach956 ai invented move [2 tries, not shown, says why, names Qh5]', [len([c for c in calls if ':generateContent' in c[1]]) - n0] + pg.evaluate("(() => { const o = document.querySelector('#t956 [data-lc92-out]').textContent; return [!/Attack!/.test(o), /does not match the board/.test(o), /Qh5/.test(o)]; })()"))
    mode['g'] = [BAD, GOOD]; pg.evaluate("localStorage.removeItem('lc92-cache')"); pg.click('#t956 [data-lc92=explain]'); pg.wait_for_timeout(1500)
    out('coach956 ai retry [a bad first answer, a good second answer is shown]', pg.evaluate("/The knight was the wall/.test(document.querySelector('#t956 [data-lc92-out]').textContent)"))
    # other providers: request shapes
    pg.evaluate("localStorage.setItem('lc92-ai', JSON.stringify({prov: 'groq', key: 'SECRET-KEY-123', model: ''})); localStorage.removeItem('lc92-cache')")
    out('coach956 groq [test picks gpt-oss-120b, bearer key, chat completions]', pg.evaluate("LC92.test({prov: 'groq', key: 'SECRET-KEY-123', model: ''}).then(r => r.model)") and [pg.evaluate("LC92.test({prov: 'groq', key: 'SECRET-KEY-123', model: ''}).then(r => r.model)"), any(c[0] == 'groq' and c[2] == 'Bearer SECRET-KEY-123' for c in calls), any(c[0] == 'groq' and c[1].endswith('/chat/completions') for c in calls)])
    out('coach956 anthropic [browser header set, model from the list]', [pg.evaluate("LC92.test({prov: 'anthropic', key: 'SECRET-KEY-123', model: ''}).then(r => r.model)"), any(c[0] == 'anthropic' and c[2] == 'true' for c in calls)])
    out('coach956 chrome built-in [works without a key through LanguageModel]', pg.evaluate("""(async () => { window.LanguageModel = {availability: async () => 'available', create: async () => ({prompt: async () => '{"ok":true}', destroy() {}})}; const r = await LC92.test({prov: 'chrome'}); localStorage.setItem('lc92-ai', JSON.stringify({prov: 'chrome', key: '', model: r.model})); return [r.model, LC92.on()]; })()"""))
    out('coach956 coach chat on the own key [answers, rejects an invented square]', pg.evaluate("""(async () => { const fen = '%s'; window.LanguageModel.create = async () => ({prompt: async () => 'Your knight on f6 shields f7. Keep it there and play Rh8.', destroy() {}}); const a = await LC92.chat('why is Ng4 bad?', {fen: fen, moves: [], user: 'b'});
      window.LanguageModel.create = async () => ({prompt: async () => 'Play Qh5 and mate on h9 with your bishop on a1.', destroy() {}}); const b = await LC92.chat('why?', {fen: fen, moves: [], user: 'b'}); return [!!(a && /Rh8/.test(a.text)), b === null]; })()""" % NG4))
    out('coach956 the key only went to the provider hosts', sorted(set(u.split('/')[2] for u in sent)))
    pg.evaluate("localStorage.removeItem('lc92-ai'); localStorage.removeItem('lc92-cache')")
    c.close(); br.close()
bad = [e for e in errs if ('PAGEERROR' in e or 'console' in e) and 'Failed to load' not in e and 'navigator.vibrate' not in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
