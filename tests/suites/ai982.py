# ai982 (9.82.0): an honest "Brilliant" and every AI answer on the player's own key. Real Chromium, 390x844, Supabase stubbed,
# the AI providers mocked (the real ones are never called).
#  1. sacrificeOf / isSacrifice: THIS move gives material (the moved piece can be won, or another piece is left to be won by a
#     legal exchange). 16 positions from Kyenzo's games with the answer of tools/master_games.py's rule, the Opera Game's Qb8+.
#  2. LC103.sacOf: a quiet move followed by a sacrifice later in the line is NOT a sacrifice (the Ne4 bug); a capture line where
#     they take 2+ and the mover stays down is one.
#  3. brilliantChecked: a stored "brilliant" that is not a sacrifice shows as an only move.
#  4. No key: AI.on() is false, AI.chat refuses ("byok") without a network call, the Pro coach's hardcoded course guide answers a
#     course question after a real Trim review; Make My Own answers byok.
#  5. With a key: AI.chat answers through the provider (Anthropic mocked), with the bot's prompt and the board context, an invented
#     move gets one retry and is then dropped ("checked"); nothing goes to the Arena.
#  6. #ai-keys "Power the app with AI": the page, the Account menu item, the set-up sheet opens on the provider picked, 390 px.
APP = 'http://127.0.0.1:8765/app.html'
SB = 'https://wllljllajadiwjdsageu.supabase.co'
OVER = "Math.max(0, document.documentElement.scrollWidth - innerWidth)"
OLD = "localStorage.setItem('lc90-seen', JSON.stringify(Date.now())); localStorage.setItem('lc34-first', JSON.stringify(Date.now() - 20 * 864e5)); localStorage.setItem('lc19-sw', JSON.stringify({ on: false, level: 3, done: Date.now() }))"
ROWS = [
  ('r1b1q1k1/pp1n1pbp/6p1/4N3/3QP3/2N4P/PPP2PP1/R4RK1 w - - 1 15', 'f2f4', False),
  ('r1b1kbnr/pp2pppp/2p5/q7/1n6/P1NB1N2/1PPP1PPP/R1BQK2R w KQkq - 0 7', 'a3b4', True),
  ('1n5k/2p4p/1p1p2p1/1P1B2P1/3P2r1/7q/2PN1P2/R2QR1K1 w - - 2 25', 'd1g4', True),
  ('r4rk1/4bppp/pqp1p3/3pP3/1P6/P1NQBn2/4KP1P/R6R b - - 1 18', 'd5d4', True),
  ('2Q5/p3r1pk/1p5p/4N3/P2P4/2n1P2P/5PPK/4q3 b - - 3 37', 'e1f2', True),
  ('r2qr3/pppk1ppp/2np4/3N4/3N4/8/PPP1QPPP/R3K2R w KQ - 1 13', 'd5e3', True),
  ('r1bq1rk1/ppppnppp/2n5/4P3/3P4/2PB1N2/P1PB2PP/R2QK2R w KQ - 3 11', 'd3h7', True),
  ('r2q3r/1p5p/pn4k1/4QRb1/P2PNn2/8/1P3PPP/R5K1 b - - 7 24', 'h7h6', False),
  ('2Q3k1/1p2bppp/4p3/p2pP3/N5P1/P2qPn2/6KP/5R2 b - - 0 26', 'e7f8', True),
  ('rnb2r1k/ppp2Bp1/7p/2N3NQ/1q6/3P4/PPP3PP/R3KR2 w Q - 1 16', 'c2c3', True),
  ('r1b1r1k1/ppN3pp/2n5/3p4/8/7P/PPP1BPq1/R2QKR2 b Q - 1 16', 'c8h3', True),
  ('2kr4/5p2/p6p/1pP5/P2Q1P2/8/6PP/1R2r1K1 w - - 0 30', 'b1e1', True),
  ('r1bq1rk1/ppp1b2p/2n2pp1/3pP2Q/3P4/2PB4/P1P1N1PP/R1B1K2R w KQ - 0 11', 'd3g6', True),
  ('r4rk1/pp2pppp/8/8/8/8/PPP2PPP/R4RK1 w - - 0 1', 'a2a3', False),
  ('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 'h5f7', False),
  ('4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 1 16', 'b3b8', True),
]
GOOD = 'Your knight on f6 shields h7. Keep it there and play Rfe8.'
BAD = 'Play Qh5 and mate on h9 with your bishop on a1.'
NG4 = 'r4rk1/ppp2ppp/5n2/8/8/8/PPP2PPP/R4RK1 b - - 0 1'
with sync_playwright() as p:
    br = p.chromium.launch()
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'ai982')
    pg.route(SB + '/**', lambda r: r.fulfill(status=200, content_type='application/json', body='{"ok":false,"error":"stub"}'))
    arena = []; prov = []; mode = {'a': [GOOD]}
    pg.route('**/functions/v1/arena**', lambda r: (arena.append(r.request.post_data or ''), r.fulfill(status=200, content_type='application/json', body='{"ok":false,"reason":"stub"}'))[1])
    def anth(route):
        prov.append(route.request.post_data or '')
        if '/v1/models' in route.request.url: return route.fulfill(status=200, content_type='application/json', body='{"data":[{"id":"claude-haiku-5-5"}]}')
        txt = mode['a'].pop(0) if len(mode['a']) > 1 else mode['a'][0]
        route.fulfill(status=200, content_type='application/json', body=json.dumps({'content': [{'type': 'text', 'text': txt}]}))
    pg.route('https://api.anthropic.com/**', anth)
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(OLD)
    pg.goto(APP + '#home'); pg.wait_for_timeout(3000)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
    got = pg.evaluate("(rows => rows.map(r => isSacrifice(r[0], r[1])))(%s)" % json.dumps([[a, b] for a, b, _ in ROWS]))
    out('sacrifice rule [the same answer as master_games.py on 16 positions]', [g == e for g, (_, _, e) in zip(got, ROWS)].count(True))
    out('sacrifice details [Bxh7+ the moved bishop, d4 leaves the knight on f3, Qb8+ the queen]', pg.evaluate("""[JSON.stringify(sacrificeOf('r1bq1rk1/ppppnppp/2n5/4P3/3P4/2PB1N2/P1PB2PP/R2QK2R w KQ - 3 11', 'd3h7')),
      JSON.stringify(sacrificeOf('r4rk1/4bppp/pqp1p3/3pP3/1P6/P1NQBn2/4KP1P/R6R b - - 1 18', 'd5d4')), JSON.stringify(sacrificeOf('4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 1 16', 'b3b8'))]"""))
    out('LC103 [a quiet move before a later sacrifice is not one; Qb8+ is; a capture line where they take 2+ is]', pg.evaluate("""(() => { const T = LC103._t;
      const quiet = T.sacOf('r2q3r/1p5p/pn4k1/4QRb1/P2PNn2/8/1P3PPP/R5K1 b - - 7 24', ['h7h6', 'f5f4', 'g5f4', 'e5f4', 'h8f8'], 'b', 'h7h6');
      const opera = T.sacOf('4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 1 16', ['b3b8', 'd7b8', 'd1d8'], 'w', 'b3b8');
      const line = T.sacOf('rnbqr1k1/pp3pp1/5n1p/3p4/1PB2Q2/P1NP2N1/2P3PP/R4RK1 w - - 0 15', ['c3d5', 'f6d5', 'f4f7', 'g8h8'], 'w', 'c3d5');
      return [quiet, !!opera && opera.piece, !!line]; })()"""))
    out('brilliantChecked [f4 shown as an only move, Bxh7+ stays brilliant]', pg.evaluate("""[brilliantChecked({kind: 'brilliant', fen: 'r1b1q1k1/pp1n1pbp/6p1/4N3/3QP3/2N4P/PPP2PP1/R4RK1 w - - 1 15', played: 'f2f4', reply: ['d7e5', 'f4e5', 'g7e5']}).kind,
      brilliantChecked({kind: 'brilliant', fen: 'r1bq1rk1/ppppnppp/2n5/4P3/3P4/2PB1N2/P1PB2PP/R2QK2R w KQ - 3 11', played: 'd3h7', reply: ['g8h7']}).kind]"""))
    # 4. no key
    out('no key [AI.on, AI.chat refuses with byok, Make My Own byok, nothing sent]', pg.evaluate("""(async () => { let r = ''; try { await AI.chat('coachPaid', [{role: 'user', content: 'why?'}], {}) } catch (e) { r = e.reason }
      let m = null; try { m = await LC36.make.handlers.hook('a hook about loose pieces', 1) } catch (e) { m = {error: String(e)} } return [AI.on(), r, m && m.error]; })()""") + [sum(1 for x in arena if '"chat"' in x), len(prov)])
    # 5. with a key
    pg.evaluate("localStorage.setItem('lc92-ai', JSON.stringify({prov: 'anthropic', key: 'SECRET-KEY-982', model: 'claude-haiku-5-5'}))")
    out('own key [AI.on, answer, the bot prompt + board context sent, the provider only]', pg.evaluate("""(async () => { const r = await AI.chat('coachPaid', [{role: 'user', content: 'Why is Ng4 bad?'}], {fen: '%s'}); return [AI.on(), r.text, r.byok]; })()""" % NG4)
        + [any('board_context' in x and 'Coach Lanckriet' in x and NG4 in x for x in prov), sum(1 for x in arena if '"chat"' in x)])
    mode['a'] = [BAD]; n0 = len(prov)
    out('own key, invented move [two tries, then dropped as checked]', pg.evaluate("""(async () => { try { await AI.chat('coachPaid', [{role: 'user', content: 'why?'}], {fen: '%s'}); return 'shown' } catch (e) { return e.reason } })()""" % NG4) + ' ' + str(len(prov) - n0))
    mode['a'] = [GOOD]
    out('Make My Own on the own key [ok, no tokens]', pg.evaluate("LC36.make.handlers.hook('loose pieces cost games', 1).then(r => [r.ok, r.cost])"))
    pg.evaluate("localStorage.removeItem('lc92-ai')")
    # the hardcoded Pro coach: a real review, then a course question
    pg.evaluate("App.access.tier = 'vault'; location.hash = '#trim'"); pg.wait_for_timeout(3000)
    pg.evaluate("document.getElementById('an-import').open=true"); pg.wait_for_timeout(300)
    pg.locator('textarea#an-pgn:visible').first.fill('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3#')
    pg.locator('button:visible', has_text='Load game').first.click(); pg.wait_for_timeout(1200)
    pg.locator('button:visible', has_text='I was White').first.click(); pg.wait_for_timeout(400)
    pg.locator('button:visible', has_text='Run the Trim review').first.click()
    for i in range(100):
        pg.wait_for_timeout(3000)
        if pg.evaluate("/Review complete|Review done/i.test(document.getElementById('view').innerText)"): break
    pg.wait_for_timeout(1200)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(400)
    if not pg.evaluate("!!document.getElementById('coach-form')"): pg.evaluate("location.hash = '#trim'"); pg.wait_for_timeout(2500)
    pg.evaluate("(() => { const f = document.getElementById('coach-form'); f.querySelector('input').value = 'What should I study after this game?'; f.requestSubmit(); })()"); pg.wait_for_timeout(1500)
    out('built-in course guide [the opening line, the chapter for the biggest leak, a button, the quota line]', pg.evaluate("""(() => { const m = [...document.querySelectorAll('#view .msg-bot')].pop(); const t = m ? m.innerText : ''; const q = document.getElementById('coach-quota');
      return [/You played|first moves of this game|Opening/.test(t), /For your biggest leak:/.test(t), !!(m && m.parentElement && m.parentElement.querySelector('a.btn, button.btn')), q ? q.textContent : ''] })()"""))
    out('Trim phone [overflow-x]', pg.evaluate(OVER))
    # 6. the page
    pg.evaluate("location.hash = '#ai-keys'"); pg.wait_for_timeout(1200)
    out('#ai-keys [title, no key yet, 6 providers, Gemini free and Claude paid recommended, the key stays on the device]', pg.evaluate("""(() => { const v = document.getElementById('view').innerText; return [document.querySelector('.lc92-page h1').textContent,
      /No AI key on this device yet/.test(v), document.querySelectorAll('.lc92-pk').length, /Google Gemini\\s*Free · recommended/.test(v), /Anthropic Claude\\s*Paid · recommended/.test(v), /never goes to our server/.test(v)] })()"""))
    out('#ai-keys phone [overflow-x, buttons 44 px]', [pg.evaluate(OVER), pg.evaluate("[...document.querySelectorAll('.lc92-page .btn')].every(b => b.getBoundingClientRect().height >= 44)")])
    pg.locator('.lc92-pk', has_text='Anthropic Claude').locator('[data-lc92=open]').click(); pg.wait_for_timeout(500)
    out('set-up sheet [opens on the provider picked, title]', pg.evaluate("[document.querySelector('.lc92-wrap [data-lc92-f=prov]').value, document.getElementById('lc92-t').textContent]"))
    pg.fill('.lc92-wrap [data-lc92-f=key]', 'SECRET-KEY-982'); pg.click('.lc92-wrap [data-lc92=save]'); pg.wait_for_timeout(1500); pg.evaluate("LC92.close()"); pg.wait_for_timeout(300)
    out('#ai-keys after save [active line, Remove button]', pg.evaluate("(() => { const s = document.querySelector('[data-lc92-status]'); return [/Active on this device: Anthropic Claude/.test(s.innerText), !!s.querySelector('[data-lc92=forget]')] })()"))
    pg.evaluate("location.hash = '#home'"); pg.wait_for_timeout(1200); pg.evaluate("(() => { const c = document.getElementById('profile-chip'); if (c) c.click(); })()"); pg.wait_for_timeout(500)
    out('Account menu [Power the app with AI right after My Membership & Upgrades, in the menu]', pg.evaluate("(() => { const i = PM_ITEMS.findIndex(x => x[0] === '#ai-keys'); return [i, PM_ITEMS[i - 1][0], !!document.querySelector('.pm-item[href=\"#ai-keys\"]')] })()"))
    pg.evaluate("localStorage.removeItem('lc92-ai')")
    out('arena [no AI call went to the Arena]', sum(1 for x in arena if '"chat"' in x))
    out('LC92 [inline copy equals lc92.js, build]', pg.evaluate("""(async () => { const src = await (await fetch('lc92.js')).text(), html = await (await fetch('app.html')).text(); const a = html.indexOf('/*@@module lc92*/'), b = html.indexOf('/*@@end lc92*/') + 14; return [html.slice(a, b) === src.trim(), LC92.version, CONFIG.version] })()"""))
    c.close(); br.close()
print('ERRORS', len([e for e in errs if 'Failed to load resource' not in e]))
for e in errs:
    if 'Failed to load resource' not in e: print(e)
