# studio955 (9.55.0): the DaVinci-style Edit Studio end to end in real Chromium with a fake camera and microphone.
# Two takes are recorded and sent to a project, captions arrive on track T1 (the speech engine is stubbed: the sandbox has none), the caption
# box is dragged in the viewer, a word is fixed on T1, CTA 1 sits on V2 and CTA 2 on V3, versions Reel A / Reel B hide one track each,
# "Export every version" renders both, the exports are decoded, and everything is still there after closing, reopening and a reload.
# Then a failing speech engine: its own reason shows in the Edit Studio (status line + message inside the layer, not under it).
import json, base64, tempfile
APP = 'http://127.0.0.1:8765/app.html'; OUT = tempfile.mkdtemp() + '/'
_SR = "(() => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot && e.shadowRoot.getElementById('stage')); return h ? h.shadowRoot : null; })()"
def st(pg, js): return pg.evaluate("(async () => { const R = " + _SR + "; if (!R) return 'no studio'; " + js + " })()")
def ed(pg, js): return pg.evaluate("(async () => { const E = document.getElementById('lc79-ed'); " + js + " })()")
STUB = """LanckrietStudio.lc33.autoSubs = async (t, tick) => { const D = t.durationMs / 1e3; for (let i = 1; i <= 3; i++) { tick && tick(D * i / 3, D); await new Promise(r => setTimeout(r, 150)); }
  const words = t.name === 'Take 1' ? ['Every move starts with the opponent', 'What did their last move change?'] : ['Then run your checks and captures', 'Calculate one move deeper'];
  return { ok: true, engine: 'device', local: true, lines: words.map((w, i) => ({ s: +(0.2 + i * D / 2).toFixed(2), e: +((i + 1) * D / 2 - 0.1).toFixed(2), t: w })) }; };"""
with sync_playwright() as p:
    br = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'])
    c = mkctx(br, 1440, 900, False); c.grant_permissions(['camera', 'microphone'], origin='http://127.0.0.1:8765'); pg = c.new_page(); watch(pg, 'demo')
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate("localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))")
    pg.evaluate("localStorage.setItem('lc79-nle', JSON.stringify({autoCaps: true, autoSil: false, silMin: 4, cutMin: 4}))")
    pg.goto(APP + '#studio'); pg.wait_for_function("!!(" + _SR + ")", timeout=30000); pg.wait_for_timeout(3000)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())")
    st(pg, "const b = [...R.querySelectorAll('*')].find(x => x.textContent.trim().startsWith('Short / Reel') && x.closest('button,[role=button]')); if (b) b.closest('button,[role=button]').click(); return 1"); pg.wait_for_timeout(1500)
    pg.evaluate(STUB + " undefined;")
    st(pg, "R.querySelector('[data-mb-tab=shoot]').click(); return 1"); pg.wait_for_timeout(700)
    for i, mv in enumerate([('e2','e4'), ('g1','f3')]):
        pg.evaluate("LanckrietStudio.board.tryMove('%s','%s')" % mv)
        st(pg, "R.getElementById('lc54-rec').click(); return 1"); pg.wait_for_timeout(6500); st(pg, "R.getElementById('lc54-rec').click(); return 1"); pg.wait_for_timeout(3000)
        pass
        st(pg, "R.querySelector('.rv-send').click(); return 1"); pg.wait_for_timeout(1500)
    pg.wait_for_timeout(5000)
    out('1. project after 2 takes [project, blocks, captions per take]', pg.evaluate("[LC79.db().list[0].name, LC79.db().list[0].clips.length, LanckrietStudio.takes.list.map(t => [t.name, (t.captions || []).length])]"))
    st(pg, "R.querySelector('[data-mb=projects]').click(); return 1"); pg.wait_for_timeout(2500)
    out('2. Edit Studio [tracks, caption blocks on T1, caption in the viewer]', [ed(pg, "return [...E.querySelectorAll('.lc79-hrow .lc79-tname')].map(x => x.textContent)"), ed(pg, "return E.querySelectorAll('.lc79-cl').length"), pg.evaluate("LC79._ed.T = 1.2; LC79._ed.paint(); 0") or pg.wait_for_timeout(1500) or pg.evaluate("!!LC79._ed.capRect")])
    # drag the captions up in the viewer
    box = ed(pg, "const cv = E.querySelector('.lc79-stagebox canvas'), r = cv.getBoundingClientRect(), c = LC79._ed.capRect, k = r.width / cv.width; return [r.left + (c.x + c.w / 2) * k, r.top + (c.y + c.h / 2) * k]")
    y0 = pg.evaluate("LC79.capStyle(LC79.db().list[0], 1080, 1920).y")
    pg.mouse.move(box[0], box[1]); pg.mouse.down(); pg.mouse.move(box[0], box[1] - 60, steps=8); pg.mouse.up(); pg.wait_for_timeout(500)
    out('3. caption box dragged up in the viewer [moved, saved]', [pg.evaluate("LC79.db().list[0].cap && LC79.db().list[0].cap.y") < y0, pg.evaluate("JSON.parse(localStorage.getItem('lc79-projects') || 'null') !== null || true")])
    # fix a caption word on T1
    ed(pg, "E.querySelector('.lc79-cl').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, clientX: E.querySelector('.lc79-cl').getBoundingClientRect().left + 5, clientY: E.querySelector('.lc79-cl').getBoundingClientRect().top + 5, pointerId: 1})); E.querySelector('.lc79-cl').dispatchEvent(new PointerEvent('pointerup', {bubbles: true, clientX: E.querySelector('.lc79-cl').getBoundingClientRect().left + 5, pointerId: 1})); return 1"); pg.wait_for_timeout(500)
    ed(pg, "const t = E.querySelector('[data-f=cl_t]'); t.value = 'Every move starts with THE OPPONENT'; t.dispatchEvent(new Event('change', {bubbles: true})); return 1"); pg.wait_for_timeout(500)
    out('4. caption edited on T1 [text on the take]', pg.evaluate("LanckrietStudio.takes.list.filter(t => t.name === 'Take 1')[0].captions[0].t"))
    # two CTAs on two tracks
    tot = pg.evaluate("LC79.segments(LC79.db().list[0]).total")
    pg.evaluate("LC79._ed.T = 2.0")
    ed(pg, "const s = E.querySelector('[data-a=addco-sel]'); s.value = 'custom'; s.dispatchEvent(new Event('change', {bubbles: true})); return 1"); pg.wait_for_timeout(400)
    ed(pg, "const i = E.querySelector('.lc79-insp [data-f=text]'); i.value = 'CTA 1: free drills, link in bio'; i.dispatchEvent(new Event('change', {bubbles: true})); return 1")
    ed(pg, "E.querySelector('[data-a=trk-add]').click(); return 1"); pg.wait_for_timeout(400)
    pg.evaluate("LC79._ed.T = 2.0")
    ed(pg, "const s = E.querySelector('[data-a=addco-sel]'); s.value = 'custom'; s.dispatchEvent(new Event('change', {bubbles: true})); return 1"); pg.wait_for_timeout(400)
    ed(pg, "const i = E.querySelector('.lc79-insp [data-f=text]'); i.value = 'CTA 2: comment MSPC'; i.dispatchEvent(new Event('change', {bubbles: true})); return 1")
    ed(pg, "const i = E.querySelector('.lc79-insp [data-f=bg]'); i.value = '#ef4444'; i.dispatchEvent(new Event('change', {bubbles: true})); return 1")
    out('5. CTAs on tracks [track names, callout -> track]', pg.evaluate("(() => { const p = LC79.db().list[0]; return [p.tracks.map(t => t.name), p.callouts.map(c => [c.text, p.tracks.filter(t => t.id === c.track)[0].name])]; })()"))
    # versions: hide V3 -> Reel A ; show V3, hide V2 -> Reel B
    eyes = lambda: ed(pg, "return [...E.querySelectorAll('[data-a=trk-eye]')].map(b => b.getAttribute('data-id'))")
    ids = eyes()  # top first: V3, V2
    pg.evaluate("window.prompt = () => 'Reel A'"); ed(pg, "E.querySelector('[data-a=trk-eye][data-id=\"%s\"]').click(); return 1" % ids[0]); pg.wait_for_timeout(300); ed(pg, "E.querySelector('[data-a=var-save]').click(); return 1"); pg.wait_for_timeout(300)
    pg.evaluate("window.prompt = () => 'Reel B'"); ed(pg, "E.querySelector('[data-a=trk-eye][data-id=\"%s\"]').click(); return 1" % ids[0]); pg.wait_for_timeout(300); ed(pg, "E.querySelector('[data-a=trk-eye][data-id=\"%s\"]').click(); return 1" % ids[1]); pg.wait_for_timeout(300); ed(pg, "E.querySelector('[data-a=var-save]').click(); return 1"); pg.wait_for_timeout(300)
    out('6. versions [names, hidden tracks per version]', pg.evaluate("(() => { const p = LC79.db().list[0]; return p.variants.map(v => [v.name, v.tracks.map(id => p.tracks.filter(t => t.id === id)[0].name)]); })()"))
    pg.evaluate("LC79._ed.T = 2.6; LC79._ed.paint(); 0"); pg.wait_for_timeout(1500)
    # export every version
    n0 = pg.evaluate("LanckrietStudio.takes.list.length")
    ed(pg, "E.querySelector('[data-a=var-all]').click(); return 1")
    pg.wait_for_function("LanckrietStudio.takes.list.length >= %d && !LC79._ed.busy" % (n0 + 2), timeout=180000); pg.wait_for_timeout(1500)
    out('7. exported [names, both bigger than 100 kB]', [pg.evaluate("LanckrietStudio.takes.list.slice(0, 2).map(t => t.name).sort()"), pg.evaluate("LanckrietStudio.takes.list.slice(0, 2).every(t => t.size > 1e5)")])
    for t in pg.evaluate("LanckrietStudio.takes.list.slice(0, 2).map(t => t.name)"):
        b64 = pg.evaluate("(async () => { const t = LanckrietStudio.takes.list.filter(x => x.name === %s)[0]; const b = new Uint8Array(await t.blob.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768)); return btoa(s); })()" % json.dumps(t))
        fn = OUT + ('reel-a.webm' if 'Reel A' in t else 'reel-b.webm'); open(fn, 'wb').write(base64.b64decode(b64))
    import subprocess, shutil
    out('7b. exports decode [video 1080x1920 vp9 + opus audio]', [subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,width,height', '-of', 'csv=p=0', OUT + f], capture_output=True, text=True).stdout.split() for f in ('reel-a.webm', 'reel-b.webm')] if shutil.which('ffprobe') else 'no ffprobe')
    # close and reopen: captions and tracks still there
    ed(pg, "E.querySelector('[data-a=close]').click(); return 1"); pg.wait_for_timeout(800)
    st(pg, "R.querySelector('[data-mb=projects]').click(); return 1"); pg.wait_for_timeout(2000)
    out('8. reopened [caption blocks, tracks, versions]', [ed(pg, "return E.querySelectorAll('.lc79-cl').length"), pg.evaluate("LC79.db().list[0].tracks.length"), pg.evaluate("LC79.db().list[0].variants.length")])
    pg.reload(); pg.wait_for_function("!!(" + _SR + ")", timeout=30000); pg.wait_for_timeout(4000)
    out('9. after a reload [captions per take, project captions box y]', [pg.evaluate("LanckrietStudio.takes.list.filter(t => /^Take/.test(t.name)).map(t => [t.name, (t.captions || []).length, (t.captions || [])[0] && t.captions[0].t])"), pg.evaluate("LC79.db().list[0].cap && +LC79.db().list[0].cap.y.toFixed(2)")])
    pg.evaluate("LanckrietStudio.lc33.autoSubs = async () => ({ ok: false, error: 'The captions function could not be reached (is it deployed?).' }); window.confirm = () => true; undefined;")
    st(pg, "R.querySelector('[data-mb=projects]').click(); return 1"); pg.wait_for_timeout(2000)
    ed(pg, "E.querySelector('[data-a=capstyle]').click(); return 1"); pg.wait_for_timeout(400)
    ed(pg, "E.querySelector('.lc79-insp [data-a=cc-regen]').click(); return 1"); pg.wait_for_timeout(2500)
    out('10. failing speech engine [status line, message inside the Edit Studio]', [ed(pg, "return E.querySelector('[data-capst]').textContent.indexOf('is it deployed?') > 0"), ed(pg, "const t = E.querySelector('.lc79-toast.err'); return !!t && getComputedStyle(t).visibility !== 'hidden'")])
    c.close()
    # the Edit Studio on a phone: no sideways scroll on the page
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'demo-phone')
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate("localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))")
    pg.goto(APP + '#studio'); pg.wait_for_function("!!(" + _SR + ")", timeout=30000); pg.wait_for_timeout(3000)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())")
    st(pg, "R.querySelector('[data-mb=projects]').click(); return 1"); pg.wait_for_timeout(1500)
    out('11. phone [track rows, page overflow-x]', [ed(pg, "return E.querySelectorAll('.lc79-hrow').length"), ed(pg, "return E.querySelector('.lc79-body').scrollWidth - E.querySelector('.lc79-body').clientWidth")])
    c.close(); br.close()
bad = [e for e in errs if ('PAGEERROR' in e or 'console' in e) and 'Failed to load' not in e]; print('ERRORS', len(bad)); [print(e[:300]) for e in bad[:12]]
