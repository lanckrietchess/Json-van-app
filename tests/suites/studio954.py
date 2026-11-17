# studio954 (9.54.0): puzzle truth, Instant Train, and the Creator Studio menu bar, devices, live engine, take review and layers / versions.
# Real Chromium with fake camera and microphone. Puzzle truth: LC61.relevant keeps only alarms the winning line uses (a knight fork on a board
# with opposite-side castling gets no "pawn storm" advice), LC83.solutionFacts describes the winning move, LC64.truth picks the Action Step from it.
APP = 'http://127.0.0.1:8765/app.html'
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
_SR = "(() => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot && e.shadowRoot.getElementById('stage')); return h ? h.shadowRoot : null; })()"
def st(pg, js): return pg.evaluate("(async () => { const R = " + _SR + "; if (!R) return 'no studio'; " + js + " })()")
HIDE = "(k, n) => { const el = document.querySelectorAll('#lc79-ed ' + k)[n]; const r = el.getBoundingClientRect(), o = {bubbles: true, clientX: r.left + 4, clientY: r.top + 4, pointerId: 1}; el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o)); document.querySelector('#lc79-ed [data-a=hideit]').click(); }"
FORK = 'r5k1/pp3ppp/2q5/3N4/8/8/PPP2PPP/2KR3R w - - 0 1'
with sync_playwright() as p:
    br = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
    # 1. puzzle truth and Instant Train
    c = mkctx(br, 1280, 900); pg = c.new_page(); watch(pg, 'truth')
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(OWNER)
    pg.goto(APP + '#endgame'); pg.wait_for_timeout(4500); pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())")
    out('truth fork [board alarms, alarms the line uses, motif, action step]', pg.evaluate("(() => { const P = {fen: '%s', solution: ['d5e7','g8f8','e7c6'], side: 'w', themes: ['fork']}; const t = LC64.truth(P); return [LC61.detect(P.fen, 'w').map(a => a.id), t.al.map(a => a.id), t.sf.motif, t.step]; })()" % FORK))
    out('truth storm [pawn push at their king keeps the alarm]', pg.evaluate("LC61.relevant('2kr3r/ppp2ppp/8/8/8/8/PPP2PPP/R4RK1 b - - 0 1', 'b', ['g7g5'], []).map(a => a.id)"))
    out('truth move facts [correct move text]', pg.evaluate("truthLine('%s', {from: 'd5', to: 'e7'}, 'w')" % FORK))
    out('instant train endgame [buttons, opens]', pg.evaluate("(() => { const b = document.querySelector('.rm-chap .rm-instant'); const n = document.querySelectorAll('.rm-chap .rm-instant').length; b.click(); return new Promise(r => setTimeout(() => r([n > 0, !!document.querySelector('#egp-panel, .st-title')]), 1200)); })()"))
    pg.goto(APP + '#openings'); pg.wait_for_timeout(3500)
    out('instant train openings [one per chapter, opens a drill]', pg.evaluate("(() => { const cards = document.querySelectorAll('.lv39-card').length, n = document.querySelectorAll('.lv39-card .rm-instant').length; document.querySelector('.lv39-card .rm-instant').click(); return new Promise(r => setTimeout(() => r([cards === n, !!document.querySelector('.trainer')]), 1200)); })()"))
    c.close()
    # 2. the Studio
    for w, hh, mob, tag in [(390, 844, True, 'phone'), (1280, 800, False, 'desktop')]:
        c = mkctx(br, w, hh, mob); c.grant_permissions(['camera', 'microphone'], origin='http://127.0.0.1:8765'); pg = c.new_page(); watch(pg, 'studio954-' + tag)
        pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(OWNER); pg.evaluate("localStorage.setItem('lc79-nle', JSON.stringify({autoCaps: false, autoSil: true, silMin: 4, cutMin: 4}))")
        pg.goto(APP + '#studio'); pg.wait_for_function("!!(" + _SR + ")", timeout=30000); pg.wait_for_timeout(3000)
        pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())")
        out('studio954 ' + tag + ' top bar below the app bar [studio header visible, menu buttons, corner dropdown hidden]', st(pg, "const tb = document.querySelector('.topbar').getBoundingClientRect().bottom, h = R.querySelector('header.hub').getBoundingClientRect().top; return [h >= tb - 1, R.querySelectorAll('#lc79-menu button').length, getComputedStyle(R.querySelector('.lc66-bar')).display]"))
        if tag == 'phone': c.close(); continue
        st(pg, "R.querySelector('[data-mb=devices]').click(); return 1"); pg.wait_for_timeout(1500)
        st(pg, "const s = R.querySelector('[data-dv=mic]'); s.value = s.options[2].value; s.dispatchEvent(new Event('change', {bubbles: true})); return 1"); pg.wait_for_timeout(1500)
        out('studio954 devices [mic options, saved label, mic on]', [st(pg, "return R.querySelector('[data-dv=mic]').options.length"), pg.evaluate("LanckrietStudio._t.Cfg.micLabel"), pg.evaluate("LanckrietStudio._t.Mic.active")])
        st(pg, "R.querySelector('[data-dv=close]').click(); return 1")
        st(pg, "R.querySelector('[data-mb=engine]').click(); return 1"); pg.wait_for_timeout(3000)
        pg.evaluate("LanckrietStudio.board.tryMove('e2','e4')"); pg.wait_for_timeout(2500); pg.evaluate("LanckrietStudio.board.tryMove('d7','d5')"); pg.wait_for_timeout(2500); pg.evaluate("LanckrietStudio.board.tryMove('f1','a6')"); pg.wait_for_timeout(3500)
        out('studio954 live engine [last move verdict]', st(pg, "const t = R.querySelector('#lc79-eng [data-eg-last]').textContent; return t.slice(0, t.indexOf('(')).trim()"))
        st(pg, "R.querySelector('[data-mb=engine]').click(); return 1")
        st(pg, "R.querySelector('[data-mb-tab=shoot]').click(); return 1"); pg.wait_for_timeout(600)
        def take():
            st(pg, "R.getElementById('lc54-rec').click(); return 1"); pg.wait_for_timeout(5500); st(pg, "R.getElementById('lc54-rec').click(); return 1"); pg.wait_for_timeout(3000)
        take()
        rv = st(pg, "const r = R.querySelector('#lc79-rv'); return r ? [r.querySelector('h3').textContent, r.querySelector('.rv-send').textContent, r.querySelector('.rv-del').textContent] : 'none'")
        st(pg, "R.querySelector('.rv-send').click(); return 1"); pg.wait_for_timeout(1200)
        out('studio954 take review [pop-up, sent to project]', [rv, pg.evaluate("LC79.db().list.map(p => [p.name, p.clips.length])")])
        take(); n = pg.evaluate("LanckrietStudio.takes.list.length"); st(pg, "R.querySelector('.rv-del').click(); return 1"); pg.wait_for_timeout(1200)
        out('studio954 take review delete [takes before, after]', [n, pg.evaluate("LanckrietStudio.takes.list.length")])
        pg.evaluate("window.prompt = () => 'Reel A'"); st(pg, "R.querySelector('[data-mb=projects]').click(); return 1"); pg.wait_for_timeout(1500)
        pg.evaluate("(() => { const p = LC79.db().list[0]; p.callouts.push(LC79.makeCallout(LC79.BUILT[4], .5)); p.callouts.push(LC79.makeCallout(LC79.BUILT[2], 1.5)); LC79._ed.paint(); })()"); pg.wait_for_timeout(500)
        pg.evaluate("(%s)('.lc79-co', 0)" % HIDE); pg.wait_for_timeout(200); pg.evaluate("document.querySelector('#lc79-ed [data-a=var-save]').click()")
        pg.evaluate("window.prompt = () => 'Reel B'"); pg.evaluate("(%s)('.lc79-co', 0)" % HIDE); pg.wait_for_timeout(200); pg.evaluate("(%s)('.lc79-co', 1)" % HIDE); pg.wait_for_timeout(200); pg.evaluate("document.querySelector('#lc79-ed [data-a=var-save]').click()"); pg.wait_for_timeout(300)
        pg.evaluate("document.querySelectorAll('#lc79-ed [data-a=var-apply]')[0].click()"); pg.wait_for_timeout(300)
        t0 = pg.evaluate("LC79.segments(LC79.db().list[0]).total > 0")
        pg.evaluate("(%s)('.lc79-clip', 0)" % HIDE); pg.wait_for_timeout(400)
        out('studio954 layers [versions, version A hides callout 1, block hidden leaves the video empty, marker]', [pg.evaluate("LC79.db().list[0].variants.map(v => v.name)"), pg.evaluate("LC79.db().list[0].callouts.map(c => !!c.hidden)"), [t0, pg.evaluate("LC79.segments(LC79.db().list[0]).total")], pg.evaluate("!!document.querySelector('#lc79-ed .lc79-hidmark')")])
        c.close()
    br.close()
bad = [e for e in errs if ('PAGEERROR' in e or 'console' in e) and 'Failed to load' not in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
