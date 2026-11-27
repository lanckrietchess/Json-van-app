# captions978 (9.78.0): captions on the voice, caption clusters and caption places per scene, in real Chromium with a fake camera and mic.
# 1. Scene Builder > CC Captions: the panel and the dashed box on the stage (page UI), "Top" for Classic.
# 2. One take is recorded in Classic, switched to Split halfway: the take keeps a scene log with the place of each scene.
# 3. The take gets live-style captions that arrived in bursts (piled on the end of each sentence) and a level track with two sentences:
#    opening the Edit Studio puts them on the voice by itself (old times kept for Undo timing).
# 4. The look per caption: Classic -> Top, Split -> the seam between board and camera (Auto).
# 5. A cluster from two captions (click + shift-click on T1), set to Middle: only those two change.
# 6. Dragging a Split caption in the viewer moves the Split place of this project, not the project look.
# 7. Undo timing / Time captions to my voice. 8. Reload: everything is still there.
import json, tempfile
APP = 'http://127.0.0.1:8765/app.html'
_SR = "(() => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot && e.shadowRoot.getElementById('stage')); return h ? h.shadowRoot : null; })()"
def st(pg, js): return pg.evaluate("(async () => { const R = " + _SR + "; if (!R) return 'no studio'; " + js + " })()")
def ed(pg, js): return pg.evaluate("(async () => { const E = document.getElementById('lc79-ed'); " + js + " })()")
CLICK = """(el, shift) => { const r = el.getBoundingClientRect(), o = {bubbles: true, clientX: r.left + 4, clientY: r.top + 4, pointerId: 1, shiftKey: !!shift};
  el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o)); }"""
with sync_playwright() as p:
    br = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'])
    c = mkctx(br, 1440, 900, False); c.grant_permissions(['camera', 'microphone'], origin='http://127.0.0.1:8765'); pg = c.new_page(); watch(pg, 'cap978')
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate("localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))")
    pg.evaluate("localStorage.setItem('lc79-nle', JSON.stringify({autoCaps: false, autoSil: false, silMin: 4, cutMin: 4}))")
    pg.goto(APP + '#studio'); pg.wait_for_function("!!(" + _SR + ")", timeout=30000); pg.wait_for_timeout(3000)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())")
    st(pg, "const b = [...R.querySelectorAll('*')].find(x => x.textContent.trim().startsWith('Short / Reel') && x.closest('button,[role=button]')); if (b) b.closest('button,[role=button]').click(); return 1"); pg.wait_for_timeout(1500)
    st(pg, "R.querySelector('[data-mb-tab=shoot]').click(); return 1"); pg.wait_for_timeout(1200)
    # 1. the caption place of the scene
    st(pg, "R.querySelector('#lc79-scn [data-s=cz]').click(); return 1"); pg.wait_for_timeout(500)
    st(pg, "R.querySelector('#lc79-czp [data-cz=top]').click(); return 1"); pg.wait_for_timeout(400)
    out('1. Scene Builder captions [panel shown, dashed box on the stage, Classic mode, box in the top half]', st(pg, "const b = R.getElementById('lc79-czbox'), s = R.getElementById('stage').getBoundingClientRect(), r = b && b.getBoundingClientRect(); return [!R.getElementById('lc79-czp').hidden, !!b, JSON.parse(localStorage.getItem('lc79-scene')).capz.classic.mode, !!r && (r.top + r.height / 2 - s.top) < s.height / 2]"))
    # 2. record: Classic, then Split halfway
    pg.evaluate("LanckrietStudio.board.tryMove('e2','e4')")
    st(pg, "R.getElementById('lc54-rec').click(); return 1"); pg.wait_for_timeout(7000)
    st(pg, "const s = R.querySelector('#lc79-scn [data-s=scene]'); s.value = 'split'; s.dispatchEvent(new Event('change', {bubbles: true})); return 1"); pg.wait_for_timeout(5500)
    st(pg, "R.getElementById('lc54-rec').click(); return 1"); pg.wait_for_timeout(3000)
    st(pg, "R.querySelector('.rv-send').click(); return 1"); pg.wait_for_timeout(1500)
    out('2. scene log of the take [scenes, Classic y, Split y, switch in the middle]', pg.evaluate("(() => { const t = LanckrietStudio.takes.list[0], L = t.scenes || []; return [L.map(x => x.scene), L[0] && L[0].z && L[0].z.y, L[1] && L[1].z && L[1].z.y, !!L[1] && L[1].t > 2 && L[1].t < t.durationMs / 1e3 - 2]; })()"))
    # 3. burst captions + a level track with two sentences: one before the switch to Split, one after it
    pg.evaluate("""(() => { const t = LanckrietStudio.takes.list[0], D = t.durationMs / 1e3, sw = t.scenes[1].t, n = Math.round(D * 10), env = [];
      const A = [.4, sw - .3], B = [sw + .3, D - .3];
      for (let i = 0; i < n; i++) { const x = i / 10; env.push((x >= A[0] && x < A[1]) || (x >= B[0] && x < B[1]) ? -18 : -62); }
      t.env = env; t.capChk = 0; delete t.capPrev; t.capBy = 'live';
      const a = A[1], b = B[1];
      t.captions = [{s: a - .2, e: a, t: 'every move starts'}, {s: a, e: a + .2, t: 'with their last move'}, {s: a + .2, e: a + .3, t: 'and its threat'},
                    {s: b - .3, e: b - .2, t: 'then the board splits'}, {s: b - .2, e: b - .1, t: 'you run the checks'}, {s: b - .1, e: b, t: 'captures and attacks'}];
      LanckrietStudio._t.Takes.persistMeta(t); })()""")
    st(pg, "R.querySelector('[data-mb=projects]').click(); return 1"); pg.wait_for_timeout(2500)
    out('3. opened the Edit Studio [checked, old times kept, fit before -> after, 1st start - voice start, 4th start - 2nd voice start]', pg.evaluate("(() => { const t = LanckrietStudio.takes.list[0]; return [t.capChk, Array.isArray(t.capPrev), LC79.capFit(t.capPrev, t.env).bad, LC79.capFit(t.captions, t.env).bad, Math.abs(+(t.captions[0].s - .4).toFixed(1)), Math.abs(+(t.captions[3].s - t.scenes[1].t - .3).toFixed(1))]; })()"))
    out('3b. T1 [caption blocks, none overlap]', ed(pg, "const L = [...E.querySelectorAll('.lc79-cl')].map(x => [parseFloat(x.style.left), x.getBoundingClientRect().width]); return [L.length, L.every((x, i) => !i || x[0] >= L[i - 1][0])]"))
    # 4. the look per caption
    out('4. look per caption [1st: source, y; 4th: source, y]', pg.evaluate("(() => { const p = LC79.db().list[0], t = LanckrietStudio.takes.list[0], a = LC79.capStyleAt(p, 1080, 1920, t, 0, t.captions[0]), b = LC79.capStyleAt(p, 1080, 1920, t, 0, t.captions[3]); return [a._src, a.y, b._src, b.y]; })()"))
    # 5. a cluster: click the 1st caption, shift-click the 2nd, Make a cluster, Middle
    ed(pg, "const f = " + CLICK + "; f(E.querySelectorAll('.lc79-cl')[0], false); return 1"); pg.wait_for_timeout(400)
    ed(pg, "const f = " + CLICK + "; f(E.querySelectorAll('.lc79-cl')[1], true); return 1"); pg.wait_for_timeout(400)
    sel = ed(pg, "return [E.querySelectorAll('.lc79-cl.msel').length, (E.querySelector('.lc79-insp h3') || {}).textContent]")
    ed(pg, "E.querySelector('.lc79-insp [data-a=cg-make]').click(); return 1"); pg.wait_for_timeout(500)
    ed(pg, "E.querySelector('.lc79-insp [data-a=cappre][data-px=g_][data-v=\"0.5\"]').click(); return 1"); pg.wait_for_timeout(500)
    out('5. cluster [selected, inspector, clusters, bands on T1, 1st y, 2nd y, 3rd source]', sel + ed(pg, "return [(E.querySelector('.lc79-insp h3') || {}).textContent.trim(), LC79.db().list[0].capGroups.length, E.querySelectorAll('.lc79-cgband').length]") + pg.evaluate("(() => { const p = LC79.db().list[0], t = LanckrietStudio.takes.list[0], s = i => LC79.capStyleAt(p, 1080, 1920, t, 0, t.captions[i]); return [s(0).y, s(1).y, s(2)._src]; })()"))
    # 6. drag a Split caption up in the viewer
    pg.evaluate("(() => { const p = LC79.db().list[0], t = LanckrietStudio.takes.list[0], it = LC79.capItems(p).filter(x => x.i === 4)[0]; LC79._ed.sel = null; LC79._ed.T = (it.T0 + it.T1) / 2; LC79._ed.paint(); })()"); pg.wait_for_timeout(1800)
    box = ed(pg, "const cv = E.querySelector('.lc79-stagebox canvas'), r = cv.getBoundingClientRect(), c = LC79._ed.capRect, k = r.width / cv.width; return c ? [r.left + (c.x + c.w / 2) * k, r.top + (c.y + c.h / 2) * k] : null")
    capy0 = pg.evaluate("JSON.stringify(LC79.db().list[0].cap || null)")
    if box:
        pg.mouse.move(box[0], box[1]); pg.mouse.down(); pg.mouse.move(box[0], box[1] - 70, steps=8); pg.mouse.up(); pg.wait_for_timeout(500)
    out('6. dragged a Split caption [found, Split place moved up, project look unchanged, inspector]', [bool(box), pg.evaluate("(() => { const p = LC79.db().list[0]; return !!(p.capSc && p.capSc.split && p.capSc.split.y < .6); })()"), pg.evaluate("JSON.stringify(LC79.db().list[0].cap || null)") == capy0, ed(pg, "return (E.querySelector('.lc79-insp h3') || {}).textContent")])
    # 7. undo timing, then time again
    ed(pg, "E.querySelector('[data-a=capstyle]') ? E.querySelector('[data-a=capstyle]').click() : (LC79._ed.sel = {kind: 'cap'}, LC79._ed.paint()); return 1"); pg.wait_for_timeout(500)
    if not ed(pg, "return !!E.querySelector('.lc79-insp [data-a=cc-untime]')"): pg.evaluate("LC79._ed.sel = {kind: 'cap'}; LC79._ed.paint()"); pg.wait_for_timeout(400)
    ed(pg, "E.querySelector('.lc79-insp [data-a=cc-untime]').click(); return 1"); pg.wait_for_timeout(500)
    u = pg.evaluate("LanckrietStudio.takes.list[0].captions[0].s")
    ed(pg, "E.querySelector('.lc79-insp [data-a=cc-time]').click(); return 1"); pg.wait_for_timeout(500)
    out('7. Undo timing / Time captions to my voice [old 1st start, new 1st start]', [u, pg.evaluate("LanckrietStudio.takes.list[0].captions[0].s")])
    # 8. reload
    pg.reload(); pg.wait_for_function("!!(" + _SR + ")", timeout=30000); pg.wait_for_timeout(3500)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())")
    out('8. after a reload [scenes, clusters, Split place, 1st start]', pg.evaluate("(() => { const p = LC79.db().list[0], t = LanckrietStudio.takes.list[0]; return [(t.scenes || []).length, (p.capGroups || []).length, !!(p.capSc && p.capSc.split), t.captions[0].s]; })()"))
    # 9. phone: the Edit Studio inspector of a cluster does not scroll sideways
    c.close(); c = mkctx(br, 390, 844, True); c.grant_permissions(['camera', 'microphone'], origin='http://127.0.0.1:8765'); pg = c.new_page(); watch(pg, 'cap978-phone')
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate("localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))")
    pg.goto(APP + '#studio'); pg.wait_for_function("!!(" + _SR + ")", timeout=30000); pg.wait_for_timeout(3000)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())")
    st(pg, "const b = R.querySelector('#lc79-scn [data-s=cz]'); if (b) b.click(); return 1"); pg.wait_for_timeout(500)
    out('9. phone [captions panel, page overflow-x]', [st(pg, "return !!R.getElementById('lc79-czp') && !R.getElementById('lc79-czp').hidden"), pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")])
    c.close(); br.close()
bad = [e for e in errs if ('PAGEERROR' in e or 'console' in e) and 'Failed to load' not in e]; print('ERRORS', len(bad)); [print(e[:300]) for e in bad[:12]]
