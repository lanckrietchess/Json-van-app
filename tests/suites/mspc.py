import re
B = 'http://127.0.0.1:8765/index.html'
ITEM_JS = """(() => { const id = App.ui.think && App.ui.think.id; const it = (CONTENT.think || []).find((x) => x.id === id); return it ? { id, fen: it.fen, stages: it.stages.map((s) => [s.k || '', s.type, s.type === 'mcq' ? ((s.options || []).find((o) => o.correct) || {}).text : s.type === 'tap' ? (s.answer || []).join(',') : s.type === 'move' ? Object.keys(s.accept || {}).join('|') : (s.pgn || '').slice(0, 40)]) } : null; })()"""
MOVE_JS = "([fen, san]) => { for (const f of [fen, sideTo(fen, sideOf(fen) === 'w' ? 'b' : 'w')]) { const g = new Chess(); if (!g.load(f)) continue; const m = g.move(san, { sloppy: true }); if (m) return [m.from, m.to, m.color, m.san]; } return null; }"
SAN_RE = re.compile(r'(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8])(?:=[QRBN])?')
def fbk(pg, root): return pg.evaluate("(r) => { const f = document.querySelector(r + ' .st-feedback'); return f ? f.innerText.replace(/\\s+/g, ' ').trim().slice(0, 300) : ''; }", root)
def drag(pg, board, a, b): pg.drag_and_drop('#%s [data-square="%s"] img' % (board, a), '#%s [data-square="%s"]' % (board, b))
def steps(pg, root): return pg.evaluate("(r) => [...document.querySelectorAll(r + ' .mspc-steps li')].map((li) => li.className || '-').join(' ')", root)
def shot(pg, sel, name, maxh=1000):
    box = pg.evaluate("(s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }; }", sel)
    box['height'] = min(box['height'], maxh); pg.screenshot(path=SHOTS + '/' + name, full_page=True, clip=box)
with sync_playwright() as p:
    br = p.chromium.launch()
    try:
        c = mkctx(br, 1280, 900); pg = c.new_page(); watch(pg, 'think')
        pg.goto(B + '#think'); pg.wait_for_selector('#think-panel .st-stage', timeout=20000); pg.wait_for_timeout(900)
        info = pg.evaluate(ITEM_JS); out('think item', info)
        out('[multiple-choice buttons, interactive steps]', pg.evaluate("[document.querySelectorAll('#think-panel .opt').length, document.querySelectorAll('#think-panel .m5').length]"))
        st = info['stages']
        if st[0][1] == 'mcq':
            sq = re.findall(r'\b[a-h][1-8]\b', st[0][2] or '')
            pg.click('#think-panel [data-m5="check"]'); pg.wait_for_timeout(250)
            out('M, check with nothing tapped', fbk(pg, '#think-panel'))
            pg.click('#think-board [data-square="%s"]' % sq[0]); pg.wait_for_timeout(200)
            pg.click('#think-panel [data-m5-tag="0"]'); pg.click('#think-panel [data-m5="check"]'); pg.wait_for_timeout(400)
            out('M, after tapping ' + sq[0], fbk(pg, '#think-panel')); out('M steps', steps(pg, '#think-panel'))
            shot(pg, '.trainer', 'm5_M.png', 760)
            pg.click('#think-panel [data-act="advance"]'); pg.wait_for_timeout(300)
        if st[1][1] == 'tap':
            pg.click('#think-board [data-square="%s"]' % st[1][2].split(',')[0]); pg.wait_for_timeout(300)
            out('S (tap stage from the file)', fbk(pg, '#think-panel'))
            pg.click('#think-panel [data-act="advance"]'); pg.wait_for_timeout(300)
        if st[2][1] == 'mcq':
            mv = None
            for s_ in SAN_RE.findall(st[2][2] or ''):
                mv = pg.evaluate(MOVE_JS, [info['fen'], s_])
                if mv: break
            out('P key move from the answer text', mv)
            if mv and mv[2] != info['fen'].split(' ')[1]: pg.click('#think-panel [data-m5-side="theirs"]'); pg.wait_for_timeout(200)
            if mv:
                drag(pg, 'think-board', mv[0], mv[1]); pg.wait_for_timeout(400)
                out('P, after the move', fbk(pg, '#think-panel'))
                shot(pg, '.trainer', 'm5_P.png', 760)
                pg.click('#think-panel [data-m5="check"]'); pg.wait_for_timeout(400)
                out('P, check', fbk(pg, '#think-panel'))
            out('steps now', steps(pg, '#think-panel'))
        h = pg.query_selector('.trainer > .split5')
        out('handle [hidden, left, columns]', pg.evaluate("(() => { const h = document.querySelector('.trainer > .split5'); return h ? [h.hidden, h.style.left, getComputedStyle(document.querySelector('.trainer')).gridTemplateColumns] : null; })()"))
        if h:
            h.scroll_into_view_if_needed(); pg.wait_for_timeout(200)
            bb = h.bounding_box(); x = bb['x'] + bb['width'] / 2; y = max(bb['y'], 80) + 40
            pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x - 80, y, steps=6); pg.mouse.move(x - 170, y, steps=6); pg.mouse.up(); pg.wait_for_timeout(500)
            out('after dragging 170px left [columns, session, board px]', pg.evaluate("[getComputedStyle(document.querySelector('.trainer')).gridTemplateColumns, sessionStorage.getItem('lc5-split'), Math.round(document.querySelector('#think-board').getBoundingClientRect().width)]"))
            shot(pg, '.trainer', 'split.png', 700)
        c.close()
        c = mkctx(br, 390, 844, True); pg = c.new_page()
        pg.goto(B + '#think'); pg.wait_for_selector('#think-panel .st-stage', timeout=20000); pg.wait_for_timeout(600)
        out('phone [handle hidden, inline columns, overflow-x]', pg.evaluate("[(document.querySelector('.trainer > .split5') || {}).hidden, document.querySelector('.trainer').style.gridTemplateColumns, document.documentElement.scrollWidth - innerWidth]"))
        c.close()
    except Exception as e: out('FAIL think', repr(e)[:500])
    try:
        c = mkctx(br, 1280, 900); pg = c.new_page(); watch(pg, 'clinic')
        pg.goto(B + '#home'); pg.wait_for_timeout(800); pg.wait_for_function('!Site.pending()', timeout=20000); pg.wait_for_timeout(300)
        pg.evaluate("""(() => { const g = new Chess(); ['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nd7','Qe2'].forEach((m) => g.move(m));
          CONTENT.clinic = [{ id: 'qe2-trap', title: 'The Qe2 trap', fen: g.fen(), played: 'Ngf6', best: 'Ndf6', lvl: 1, requiredTier: 0, level: '800-1200', source: 'student', player: 'Test', elo: 950,
            steps: [{ k: 'M', t: '5.Qe2 pins the e7-pawn to the king, so nothing guards d6 any more.' }, { k: 'S', t: 'The king on e8 has no flight squares: d7 and f7 are blocked and e7 is pinned.' }, { k: 'P', t: 'After 5...Ngf6 White has one check that ends the game: 6.Nd6 mate.' }, { k: 'C', t: '5...Ndf6 keeps d7 free for the king and still develops.' }] }];
          location.hash = '#clinic'; })()""")
        pg.wait_for_selector('#cl-panel .m5', timeout=15000); pg.wait_for_timeout(500)
        pg.click('#cl-board [data-square="d6"]'); pg.click('#cl-panel [data-m5="check"]'); pg.wait_for_timeout(300); out('clinic M', fbk(pg, '#cl-panel'))
        pg.click('#cl-panel [data-act="advance"]'); pg.wait_for_timeout(300)
        pg.click('#cl-panel [data-m5-phase="middlegame"]'); pg.click('#cl-board [data-square="e8"]'); pg.click('#cl-panel [data-m5="check"]'); pg.wait_for_timeout(300); out('clinic S, wrong phase', fbk(pg, '#cl-panel'))
        pg.click('#cl-panel [data-m5-phase="opening"]'); pg.click('#cl-panel [data-m5="check"]'); pg.wait_for_timeout(300); out('clinic S, right phase', fbk(pg, '#cl-panel'))
        pg.click('#cl-panel [data-act="advance"]'); pg.wait_for_timeout(300)
        drag(pg, 'cl-board', 'g8', 'f6'); pg.wait_for_timeout(300); out('clinic P, a quiet move', fbk(pg, '#cl-panel'))
        pg.click('#cl-panel [data-m5-side="theirs"]'); pg.wait_for_timeout(200)
        drag(pg, 'cl-board', 'e4', 'd6'); pg.wait_for_timeout(300); out('clinic P, Nd6 for White', fbk(pg, '#cl-panel'))
        shot(pg, '.trainer', 'clinic_P.png', 760)
        pg.click('#cl-panel [data-m5="check"]'); pg.wait_for_timeout(300); out('clinic P, check', fbk(pg, '#cl-panel'))
        pg.click('#cl-panel [data-act="advance"]'); pg.wait_for_timeout(300)
        pg.click('#cl-panel [data-act="miscalc"]'); pg.wait_for_timeout(200); pg.click('#cl-panel [data-act="mis"]'); pg.wait_for_timeout(300)
        out('clinic miscalc [feedback, struggles, log]', [fbk(pg, '#cl-panel'), pg.evaluate("App.profile.struggles"), pg.evaluate("(Store.get('lc5-miscalc', []) || []).length")])
        drag(pg, 'cl-board', 'g8', 'f6'); pg.wait_for_timeout(300); out('clinic C, the game blunder', fbk(pg, '#cl-panel'))
        pg.wait_for_timeout(1900)
        drag(pg, 'cl-board', 'd7', 'f6'); pg.wait_for_timeout(500); out('clinic C, Ndf6', fbk(pg, '#cl-panel')); out('clinic steps', steps(pg, '#cl-panel'))
        shot(pg, '.trainer', 'clinic_done.png', 900)
        c.close()
    except Exception as e: out('FAIL clinic', repr(e)[:500])
    try:
        c = mkctx(br, 1280, 900); pg = c.new_page(); watch(pg, 'trim')
        pg.goto(B + '#trim'); pg.wait_for_selector('#coach', timeout=20000)
        pg.click('[data-act="sample"]'); pg.wait_for_timeout(1000); pg.click('[data-act="review"]')
        for i in range(60):
            pg.wait_for_timeout(1500)
            pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach((b) => b.click())")
            if pg.query_selector('[data-act="interrogate"]'): break
        pg.click('[data-act="interrogate"]'); pg.wait_for_selector('.iq-chat', timeout=20000); pg.wait_for_timeout(600)
        out('iq tag buttons', pg.evaluate("[...document.querySelectorAll('.iq-quick button')].map((b) => b.textContent)"))
        pg.click('#an-board [data-square="d6"]'); pg.wait_for_timeout(150); pg.click('#an-board [data-square="e4"]'); pg.wait_for_timeout(200)
        out('iq answer box after two taps', pg.evaluate("document.querySelector('.iq-ai input').value"))
        pg.click('.iq-ai button[type="submit"]'); pg.wait_for_timeout(900)
        out('iq reply', pg.evaluate("(() => { const m = [...document.querySelectorAll('.iq-log .iq-msg')]; return m.slice(-3).map((x) => x.innerText).join(' | ').slice(0, 420); })()"))
        shot(pg, '#an-interro', 'trim_iq.png', 700)
        out('data file round trip [v5, M name, M tags, faq]', pg.evaluate("""(() => { const d = Site.cleanDoc({ app: 'lanckrietchess-hub', v5: { framework: { letters: { M: { name: 'Move!', text: 'x' } }, tags: { M: ['Check', 'No threat'] } }, faq: [{ q: 'How do I join?', a: 'Tap Upgrades.\\nIt is free.', tier: 'free' }, { q: '', a: 'bad' }], layout: { trainer: 0.4, trim: 3 }, junk: 1 } });
            V5Doc.apply(d.v5); return [JSON.stringify(d.v5), MSPC_NAME.M, V5Doc.tags('M').join('/'), V5Doc.faq('free').length]; })()"""))
        pg.evaluate("location.hash = '#home'"); pg.wait_for_timeout(400); pg.evaluate("location.hash = '#trim'"); pg.wait_for_selector('#coach', timeout=10000); pg.wait_for_timeout(300)
        pg.click('.ca5-btn[data-q="How do I join?"]')
        pg.wait_for_function("(() => { const m = [...document.querySelectorAll('#coach-chat .msg-bot:not(.typing)')]; return m.length && /Tap Upgrades/.test(m[m.length - 1].innerText); })()", timeout=10000)
        out('fixed coach answer', pg.evaluate("(() => { const m = [...document.querySelectorAll('#coach-chat .msg-bot:not(.typing)')]; return m[m.length - 1].innerText; })()"))
        pg.evaluate("V5Doc.apply(null)"); out('defaults back [M name, M tags]', pg.evaluate("[MSPC_NAME.M, V5Doc.tags('M').length]"))
        c.close()
    except Exception as e: out('FAIL trim', repr(e)[:500])
    br.close()
print('ERRORS', len([e for e in errs if '404' not in e])); [print(' ', e[:300]) for e in errs if '404' not in e][:20]
