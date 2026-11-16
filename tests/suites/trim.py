# trim (9.51.0): the Trim review and its interrogation, in real Chromium at 390x844, on a real blunder game (the Blackburne Shilling trap).
# Guards the 9.51.0 fixes:
#  - the LC79 name collision (the Creator Studio's const LC79 shadowed the 7.9 coach-tone module): the interrogation verdict crashed,
#    the profile / Settings sheet did not open, and the friend code crashed. The 7.9 module is LC79T now.
#  - the report bars count leaks (they showed weighted points: 1 blunder read as "3"),
#  - the course link follows the leak's MSPC letter (an M leak pointed to the P chapter when the better move was a check),
#  - every key moment names the better move,
#  - nothing in the review scrolls sideways on a phone (the coach chat did, through a long course-link button).
GAME = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3#'
with sync_playwright() as p:
    br = p.chromium.launch()
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'trim')
    pg.goto('http://127.0.0.1:8765/app.html#trim'); pg.wait_for_timeout(3500)
    pg.evaluate("document.getElementById('an-import').open=true"); pg.wait_for_timeout(300)
    pg.locator('textarea#an-pgn:visible').first.fill(GAME)
    pg.locator('button:visible', has_text='Load game').first.click(); pg.wait_for_timeout(1200)
    pg.locator('button:visible', has_text='I was White').first.click(); pg.wait_for_timeout(400)
    pg.locator('button:visible', has_text='Run the Trim review').first.click()
    for i in range(100):
        pg.wait_for_timeout(3000)
        if pg.evaluate("/Review complete|Review done/i.test(document.getElementById('view').innerText)"): break
    pg.wait_for_timeout(1500)
    shut = lambda: pg.evaluate("(()=>{const t=[...document.querySelectorAll('.sheet-wrap')].map(s=>(s.querySelector('h2,h3')||s).textContent.trim().slice(0,40));document.querySelectorAll('.sheet-wrap [data-close]').forEach(b=>b.click());return t})()")
    print('sheets after the review:', shut()); pg.wait_for_timeout(600)
    t = pg.evaluate("document.getElementById('view').innerText")
    out('key moment names the better move [5.Nxf7 better Bxf7+]', 'Qxg2 came anyway. Better: Bxf7+.' in t)
    out('report bars count leaks [M, P, opening]', pg.evaluate("(()=>{const r=document.getElementById('an-report');const n=l=>{const b=[...r.querySelectorAll('.bar')].find(x=>x.textContent.startsWith(l));return b?+b.querySelector('.bar-n').textContent:null};return [n('M, Move'),n('P, Priorities'),n('Opening')]})()"))
    out('biggest leak and its course agree [top leak, coach link, where taught]', ['M, Move: Read the move first' in t, 'For your biggest leak: The MSPC System › M, Move' in t, 'Where this is taught\nThe MSPC System › M, Move' in t])
    out('nothing scrolls sideways [chat, page]', pg.evaluate("[[...document.querySelectorAll('#view .chat')].every(e=>e.scrollWidth<=e.clientWidth+2), document.documentElement.scrollWidth<=window.innerWidth+1]"))
    shut(); pg.wait_for_timeout(400)
    pg.locator('button:visible', has_text='Interrogate my mistakes').first.click(); pg.wait_for_timeout(2500)
    out('no fixed banner over the board for an unknown time control', pg.evaluate("!document.querySelector('.acc-banner.fw-banner')"))
    for n in range(6):
        b = pg.locator('[data-iq="giveup"]:visible')
        if not b.count(): break
        b.first.click(); pg.wait_for_timeout(3500)
    pg.wait_for_timeout(1500)
    out('interrogation verdict renders [heading, tone line host]', pg.evaluate("(()=>{const v=document.querySelector('.iq-verdict');return [v?v.querySelector('h3').textContent:'', typeof LC79T, typeof LC79T.tone.verdictHTML]})()"))
    shut(); pg.goto('http://127.0.0.1:8765/app.html#home'); pg.wait_for_timeout(2500)
    pg.mouse.click(8, 600); pg.evaluate("openProfile(); undefined;"); pg.wait_for_timeout(900)
    out('profile and Settings open', pg.evaluate("(()=>{const s=[...document.querySelectorAll('.sheet-wrap')].pop();return !!s && /Your profile/.test(s.innerText)})()"))
    out('friend code [prefix]', pg.evaluate("Friends.code().slice(0,5)"))
    out('the Studio module is untouched [camSrc, pawnCheck]', pg.evaluate("[typeof LC79.camSrc, typeof LC79.pawnCheck]"))
    c.close(); br.close()
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
