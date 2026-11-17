# hub (9.50.0): the Creator Studio Content Hub save, in real Chromium (390x844).
# 1. Quota.call unwraps the live Arena's HTTP-200 wrapper ({ok:false,error:"Bad request payload",details:"<json>"}) into the real reason,
#    keeps the real HTTP status when the server sends httpStatus, and a request that never gets an answer carries the browser's own error.
# 2. In the Studio, as the owner, "Save this take to Content hub" against a server without the Content hub shows the exact reason (no false
#    "No connection"), keeps the take, and shows "Download Video Directly (.webm)", which downloads that video on a tap.
# 3. A failed render is stored as a take in IndexedDB (TakeDB) and survives a reload.
APP = 'http://127.0.0.1:8765/app.html'
ARENA = 'https://arena.test/functions/v1/arena'
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
SR = "(() => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot && e.shadowRoot.getElementById('stage')); return h ? h.shadowRoot : null; })()"
import json as _json
mode = {'v': 'old'}
def arena(r):
    try: b = _json.loads(r.request.post_data or '{}')
    except Exception: b = {}
    a = b.get('action', '')
    if a in ('content_begin', 'content_list'):
        if mode['v'] == 'old':      # what the live arena answers today: the wrapper hides the reason in details
            return r.fulfill(status=200, content_type='application/json', body=_json.dumps({'ok': False, 'error': 'Bad request payload', 'details': '{"ok":false,"reason":"unknown_action"}'}))
        if mode['v'] == 'new':      # the 9.50.0 wrapper: the reason on top plus the real status
            return r.fulfill(status=200, content_type='application/json', body=_json.dumps({'ok': False, 'reason': 'too_large', 'max': 52428800, 'error': 'Bad request payload', 'details': '{"ok":false,"reason":"too_large"}', 'httpStatus': 413}))
        if mode['v'] == 'down':
            return r.abort('connectionrefused')
    return r.fulfill(status=200, content_type='application/json', body='{"ok":true}')
PATCH = "V5Net.on = () => true; V5Net.url = () => '" + ARENA + "'; undefined;"
with sync_playwright() as p:
    br = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
    c = mkctx(br, 390, 844, True); c.route(ARENA + '*', arena); c.route(ARENA, arena)
    pg = c.new_page(); watch(pg, 'hub')
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(OWNER)
    pg.goto(APP + '#home'); pg.wait_for_timeout(2500)
    pg.evaluate(PATCH)
    mode['v'] = 'old'
    out('Quota.call, live wrapper [reason, wrapped, ok]', pg.evaluate("Quota.call('content_begin', {}).then(r => [r.reason, !!r.wrapped, r.ok])"))
    mode['v'] = 'new'
    out('Quota.call, 9.50.0 wrapper [reason, status, max]', pg.evaluate("Quota.call('content_begin', {}).then(r => [r.reason, r.status, r.max])"))
    mode['v'] = 'down'
    out('Quota.call, no answer [reason, has the browser error]', pg.evaluate("Quota.call('content_begin', {}).then(r => [r.reason, typeof r.error === 'string' && r.error.length > 3])"))
    # 2. the Studio as the owner
    mode['v'] = 'old'
    pg.goto(APP + '#studio'); pg.wait_for_function("!!(" + SR + ")", timeout=30000); pg.wait_for_timeout(2500)
    pg.evaluate(PATCH)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())")
    pg.evaluate("""(async () => { const S = window.LanckrietStudio; const blob = new Blob([new Uint8Array(6000).fill(7)], { type: 'video/webm;codecs=vp9,opus' });
      await S.takes.add({ id: 'tk-hub-1', name: 'Hub test take', blob, mime: 'video/webm', durationMs: 4000, w: 720, h: 1280, fps: 30, env: [], markers: [], cuts: [], trimIn: 0, trimOut: 4, createdAt: Date.now(), size: blob.size, onDisk: false, captions: [] });
      S._t.Trim.open && S._t.Trim.open('tk-hub-1'); })()""")
    pg.wait_for_timeout(600)
    pg.evaluate("window.LanckrietStudio.lc35.state.usage = null; window.LanckrietStudio._t.Takes.cur = 'tk-hub-1'; undefined;")
    pg.evaluate("(async () => { const L = window.LanckrietStudio.lc35; const t = window.LanckrietStudio._t.Takes.get('tk-hub-1'); await L._t.failSafe({ reason: 'unknown_action', status: 200 }, t.blob, { name: t.name, mime: t.mime, take: t, retry: { title: t.name, mime: 'video/webm', platforms: {}, meta: {} } }); })()")
    pg.wait_for_timeout(700)
    R = "const R = " + SR + ";"
    out('Studio after a refused save [message, no false No connection, safe box, download button]', pg.evaluate("(() => { " + R + " const m = R.getElementById('lc35-msg'), b = R.querySelector('#lc35-safe [data-lc35-dl]'); return [/deploy the latest arena function/.test(m ? m.textContent : ''), !/No connection/.test(m ? m.textContent : ''), !!R.getElementById('lc35-safe'), b ? b.textContent : '']; })()"))
    with pg.expect_download(timeout=8000) as dl:
        pg.evaluate("(() => { " + R + " R.querySelector('#lc35-safe [data-lc35-dl]').click(); })()")
    d = dl.value
    out('Download Video Directly [file name, size]', [d.suggested_filename, __import__('os').path.getsize(d.path())])
    pg.screenshot(path=SHOTS + '/hub-failsafe.png')
    # 3. a failed RENDER is kept as a take in IndexedDB and survives a reload
    pg.evaluate("(async () => { const L = window.LanckrietStudio.lc35; const blob = new Blob([new Uint8Array(9000).fill(3)], { type: 'video/webm' }); await L._t.failSafe({ reason: 'network', error: 'Failed to fetch' }, blob, { name: 'Render kept (Master)', mime: 'video/webm', seconds: 12, w: 720, h: 1280, fps: 30 }); })()")
    pg.wait_for_timeout(600)
    out('failed render [in the takes list, saved to IndexedDB]', pg.evaluate("(() => { const t = window.LanckrietStudio._t.Takes.list.filter(x => x.name === 'Render kept (Master)')[0]; return [!!t, !!(t && t.saved)]; })()"))
    pg.reload(); pg.wait_for_function("!!(" + SR + ")", timeout=30000); pg.wait_for_timeout(2500)
    out('after a reload [render still on the device]', pg.evaluate("window.LanckrietStudio._t.TakeDB.all().then(a => (a || []).some(x => x && x.name === 'Render kept (Master)' && x.blob && x.blob.size === 9000))"))
    c.close(); br.close()
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
