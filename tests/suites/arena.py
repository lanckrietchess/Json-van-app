import json
B = 'http://127.0.0.1:8765/index.html'
QE2 = "(() => { const g = new Chess(); ['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nd7','Qe2'].forEach((m) => g.move(m)); return g.fen(); })()"
def drag(pg, board, a, b): pg.drag_and_drop('#%s [data-square="%s"] img' % (board, a), '#%s [data-square="%s"]' % (board, b))
def fbk(pg, root): return pg.evaluate("(r) => { const f = document.querySelector(r + ' .st-feedback'); return f ? f.innerText.replace(/\\s+/g, ' ').trim().slice(0, 200) : ''; }", root)
def shot(pg, sel, name, maxh=1100):
    box = pg.evaluate("(s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }; }", sel)
    box['height'] = min(box['height'], maxh); pg.screenshot(path=SHOTS + '/' + name, full_page=True, clip=box)
def cc(route):
    u = route.request.url
    body = {'chess_rapid': {'last': {'rating': 2810}}, 'chess_blitz': {'last': {'rating': 3300}}} if u.split('?')[0].endswith('/stats') else {'username': 'Hikaru', 'avatar': ''}
    route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, body=json.dumps(body))
with sync_playwright() as p:
    br = p.chromium.launch()
    try:
        c = mkctx(br, 1280, 900); c.route('https://api.chess.com/pub/player/**', cc); pg = c.new_page(); watch(pg, 'arena')
        pg.goto(B + '#leaderboard'); pg.wait_for_selector('#arena5 .ar5-cup', timeout=20000); pg.wait_for_function('!Site.pending()', timeout=20000); pg.wait_for_timeout(400)
        out('arena [cup title, rows, think tabs]', pg.evaluate("[document.querySelector('.ar5-cup h2').textContent, [...document.querySelectorAll('.ar5-board li')].map((l) => l.innerText.replace(/\\s+/g, ' ')), [...document.querySelectorAll('.theory-tab b')].map((b) => b.textContent).join('|')]"))
        pg.evaluate("App.profile.name = 'Kyenzo Test'; App.save(); App.score('think', true); App.score('think', true); App.score('clinic', true); App.score('openings', true); App.score('think', false)")
        out('score after 3 MSPC solves, 1 opening, 1 miss [state, live board]', pg.evaluate("[Tourney.state().score, [...document.querySelectorAll('.ar5-board li')].map((l) => l.innerText.replace(/\\s+/g, ' ')).join(' / ')]"))
        fen = pg.evaluate(QE2)
        codes = pg.evaluate("""(fen) => { const wk = isoWeek(new Date()), mk = (u, s, e, d) => 'LCF1.' + btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, u, e, d, f: 'Checks first', fd: 4, t: { w: wk, m: 'mspc', s }, b: { f: fen, p: 'Ngf6', b: 'Ndf6', o: 'Caro-Kann', n: 5 }, at: Date.now() - 36e5 })))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
          return [mk('Anna', 5, 1210, 15), mk('Bram', 1, 980, -8), mk('<img src=x onerror=alert(1)>', 2, 99999, 5)]; }""", fen)
        pg.fill('[data-ar-add] [name="q"]', codes[0]); pg.click('[data-ar-add] button[type="submit"]'); pg.wait_for_timeout(300)
        out('bad codes [html-name, garbage]', pg.evaluate("(c) => [JSON.stringify(Friends.decode(c)), Friends.addCode('LCF1.nonsense!!').ok]", codes[2]))
        pg.evaluate("(c) => { Friends.addCode(c); Arena.paint(); }", codes[1])
        pg.fill('[data-ar-add] [name="q"]', 'hikaru'); pg.select_option('[data-ar-add] [name="site"]', 'chesscom'); pg.click('[data-ar-add] button[type="submit"]')
        pg.wait_for_selector('.ar5-card:has-text("Hikaru")', timeout=10000); pg.wait_for_timeout(300)
        out('friends', pg.evaluate("Friends.list().map((f) => [f.name, f.site || 'code', f.rating, f.t ? f.t.s : null, !!f.b])"))
        out('board', pg.evaluate("[...document.querySelectorAll('.ar5-board li')].map((l) => l.innerText.replace(/\\s+/g, ' ')).join(' / ')"))
        shot(pg, '#arena5', 'arena.png', 1200)
        pg.click('[data-ar="solve"][data-id="lc:anna"]'); pg.wait_for_selector('#ar-panel .m5', timeout=10000); pg.wait_for_timeout(300)
        pg.click('#ar-board [data-square="d6"]'); pg.click('#ar-panel [data-m5="check"]'); pg.wait_for_timeout(300); out('friend blunder M', fbk(pg, '#ar-panel'))
        pg.click('#ar-panel [data-act="advance"]'); pg.wait_for_timeout(300)
        drag(pg, 'ar-board', 'd7', 'f6'); pg.wait_for_timeout(500); out('friend blunder C (Ndf6)', fbk(pg, '#ar-panel'))
        shot(pg, '[data-ar5-solve]', 'arena_solve.png', 800)
        out('weekly payout [result, credits added, second roll, new week, score]', pg.evaluate("""(() => { const s = Tourney.state(), d = new Date(); d.setDate(d.getDate() - 7); const last = isoWeek(d);
          s.wk = last; s.metric = 'mspc'; s.score = 7; delete s.paid[last]; Store.set('lc5-tourney', s);
          const l = Store.get('lanckriet_friends_list', []); l.forEach((f) => { if (f.t) { f.t.w = last; f.t.s = f.name === 'Anna' ? 5 : 2; } }); Store.set('lanckriet_friends_list', l);
          const before = App.credits.purchased, r = Tourney.roll(), again = Tourney.roll();
          return [JSON.stringify(r), App.credits.purchased - before, again, Tourney.state().wk === isoWeek(new Date()), Tourney.state().score]; })()"""))
        link = pg.evaluate("Friends.link()"); out('share link length', len(link))
        c.close()
        c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'link')
        pg.goto(link); pg.wait_for_timeout(2500)
        out('opened link on a new device [friends, search left, hash]', pg.evaluate("[Friends.list().map((f) => f.name + ' ' + (f.b ? 'with blunder' : '')), location.search, location.hash, document.documentElement.scrollWidth - innerWidth]"))
        shot(pg, '#arena5', 'arena_phone.png', 1400)
        c.close()
    except Exception as e: out('FAIL arena', repr(e)[:500])
    try:
        c = mkctx(br, 1280, 900); pg = c.new_page(); watch(pg, 'trim3')
        pg.goto(B + '#trim'); pg.wait_for_selector('#coach', timeout=20000); pg.wait_for_function('!Site.pending()', timeout=20000)
        pg.evaluate("""V5Doc.apply({ sales: { manychat: 'https://ig.me/m/lanckrietchess', keyword: 'MSPC', webhook: 'https://hook.example.com/x' } });
          Store.set('lc5-iq-history', [{ at: 1, n: 2, found: 1, by: { M: 1, S: 1, P: 1, C: 1, time: 1 } }, { at: 2, n: 2, found: 1, by: { M: 1, S: 1, P: 1, C: 1, time: 1 } }]);
          window.__beacons = []; navigator.sendBeacon = (u) => { window.__beacons.push(u); return true; };""")
        pg.click('[data-act="sample"]'); pg.wait_for_timeout(800); pg.click('[data-act="review"]')
        for i in range(60):
            pg.wait_for_timeout(1500); pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach((b) => b.click())")
            if pg.query_selector('[data-act="interrogate"]'): break
        out('staged [route, played, best, opening, has game]', pg.evaluate("Store.get('staging_peer_puzzles', []).map((x) => [x.route, x.played, x.best, x.opening, !!x.sans])"))
        out('latest blunder', pg.evaluate("JSON.stringify(Store.get('lc5-last-blunder', null))"))
        pg.click('[data-act="interrogate"]'); pg.wait_for_selector('.iq-chat', timeout=20000); pg.wait_for_timeout(500)
        out('Phase A, first message', pg.evaluate("(document.querySelector('.iq-log .iq-msg') || {}).innerText"))
        for i in range(20):
            if pg.query_selector('[data-iq="after"]'): pg.click('[data-iq="after"]'); pg.wait_for_timeout(700); break
            b = pg.query_selector('.iq button:has-text("Give up")')
            if b: b.click()
            pg.wait_for_timeout(700)
        out('Phase D, conclusion', pg.evaluate("((document.querySelector('.iq5-end') || {}).innerText || 'NONE').replace(/\\s+/g, ' ')"))
        out('ManyChat link', pg.evaluate("(document.querySelector('.iq5-mc a') || {}).href || 'none'"))
        out('webhook fired, sessions stored', pg.evaluate("(() => { const a = document.querySelector('.iq5-mc a'); if (!a) return 'no link'; a.addEventListener('click', (e) => e.preventDefault()); a.click(); return [window.__beacons, Store.get('lc5-iq-history', []).length]; })()"))
        shot(pg, '#an-interro', 'trim_end.png', 1100)
        c.close()
    except Exception as e: out('FAIL trim', repr(e)[:500])
    try:
        c = mkctx(br, 1280, 900); pg = c.new_page(); watch(pg, 'admin3')
        pg.goto(B + '#home'); pg.wait_for_timeout(800); pg.wait_for_function('!Site.pending()', timeout=20000)
        pg.evaluate("""((fen) => { Object.defineProperty(Admin, 'active', { get: () => true, configurable: true });
          Store.set('staging_peer_puzzles', [{ id: 'sptest', route: 'admin', fen, played: 'Ngf6', best: 'Ndf6', cls: 'blunder', num: 5, color: 'b', opening: 'Caro-Kann', name: 'Test', elo: 950, at: Date.now(), start: new Chess().fen(), sans: ['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nd7','Qe2','Ngf6','Nd6#'], side: 'b' },
            { id: 'sptest2', route: 'peer', fen, played: 'Ngf6', best: 'Ndf6', cls: 'blunder', num: 5, color: 'b', opening: '', name: 'Test', elo: 950, at: Date.now() }]);
          location.hash = '#review-queue'; })(%s)""" % QE2)
        pg.wait_for_selector('.sp5', timeout=10000); pg.wait_for_timeout(300)
        shot(pg, '.sp5', 'queue_stage.png', 500)
        pg.click('[data-sp="queue"]'); pg.wait_for_timeout(500)
        out('sent to the queue [queue size, staged left]', pg.evaluate("[(Store.get('lc-hub-review-queue-v1', []) || []).length, Store.get('staging_peer_puzzles', []).map((x) => x.id)]"))
        pg.evaluate("V5Admin.arena()"); pg.wait_for_selector('[data-v5ar]', timeout=5000)
        pg.fill('[data-v5ar] [name="title"]', 'Trim Week'); pg.select_option('[data-v5ar] [name="metric"]', 'trim'); pg.fill('[data-v5ar] [name="p0"]', '5'); pg.fill('[data-v5ar] [name="p1"]', '2')
        pg.fill('[data-v5ar] [name="mc"]', 'https://ig.me/m/lanckrietchess'); pg.fill('[data-v5ar] [name="kw"]', 'MSPC fix!')
        pg.click('[data-v5ar] button[type="submit"]'); pg.wait_for_timeout(600)
        out('admin saved [tournament, sales, unpublished]', pg.evaluate("[JSON.stringify(V5Doc.tournament()), JSON.stringify(V5Doc.sales()), Admin.dirty()]"))
        c.close()
    except Exception as e: out('FAIL admin', repr(e)[:500])
    br.close()
print('ERRORS', len([e for e in errs if '404' not in e])); [print(' ', e[:300]) for e in errs if '404' not in e][:12]
