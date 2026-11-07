# lc60 (9.32.0): Coach Lanckriet's voice in the lessons. Real Chromium, 390x844. The index is built with tools/make_lesson_audio.py's own collect() from the REAL
# content.json (so the text hashes are the ones the script really produces); every clip is a tiny real WAV (0.4 s of silence) served under its mp3 name.
import io as _io, json as _json, wave as _wave, importlib.util as _iu, os as _os, struct as _struct
_spec = _iu.spec_from_file_location('mla60', REPO + '/tools/make_lesson_audio.py'); _mla = _iu.module_from_spec(_spec); _spec.loader.exec_module(_mla)
_clips = _mla.collect(_json.load(open(REPO + '/content.json', encoding='utf-8')), _mla.DEFAULT_SCOPES)
_INDEX = _json.dumps({'v': 1, 'voice': 'test', 'clips': {c['id']: {'file': c['id'] + '.mp3', 'kind': c['kind'], 'src': c['src']} for c in _clips}})
def _wav():
    b = _io.BytesIO(); w = _wave.open(b, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(8000); w.writeframes(_struct.pack('<h', 0) * 3200); w.close(); return b.getvalue()
_WAV = _wav()
SEED = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'member@example.com' })); localStorage.setItem('lc19-sw', JSON.stringify({ on: false, level: 5 })); localStorage.setItem('lc-hub-elo-v1', JSON.stringify({ chesscom: { user: 'tester' } }));"
def _open(br, route_='endgame', with_audio=True):
    c = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, service_workers='block'); c.route('**/*', route); c.add_init_script(script=INIT)   # no service worker: its asset cache would answer before the test's stand-ins
    pg = c.new_page(); watch(pg, 'lc60'); hits = {'index': 0, 'mp3': []}
    def h(route, request):
        u = request.url
        if u.endswith('/index.json'):
            hits['index'] += 1
            return route.fulfill(status=200, headers={'content-type': 'application/json'}, body=_INDEX) if with_audio else route.fulfill(status=404, body='')
        if u.endswith('.mp3'): hits['mp3'].append(u.rsplit('/', 1)[1]); return route.fulfill(status=200, headers={'content-type': 'audio/mpeg'}, body=_WAV)
        route.fallback()
    pg.route('**/assets/audio/lessons/*', h)
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(SEED)
    pg.goto('http://127.0.0.1:8765/app.html#' + route_); pg.wait_for_timeout(4500)
    pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x => x.remove())"); pg.wait_for_timeout(300)
    return c, pg, hits
with sync_playwright() as p:
    br = p.chromium.launch()
    c, pg, hits = _open(br)
    pg.evaluate("document.querySelector('[data-eg-open$=\"|learn\"]').click()"); pg.wait_for_selector('.lc60-say', timeout=10000); pg.wait_for_timeout(600)
    n = pg.evaluate("document.querySelectorAll('.lc60-say').length"); bar = pg.evaluate("[!!document.querySelector('.lc60-bar .lc60-all'), document.querySelector('.lc60-stop').hidden]")
    out('endgame lesson [speaker buttons on the voiced paragraphs, "Listen to this lesson" bar, Stop hidden, index read once]', [n >= 3, bar, hits['index']])
    big = pg.evaluate("(() => { const b = document.querySelector('.lc60-say'); const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return [Math.round(r.width) >= 28, e === b || b.contains(e)]; })()")
    out('speaker button [at least 28 px wide, really tappable]', big)
    pg.click('.lc60-say >> nth=0'); pg.wait_for_function("document.querySelector('.lc60-say.is-on')", timeout=5000)
    on_state = pg.evaluate("[document.querySelector('.lc60-say.is-on').getAttribute('aria-pressed'), !!document.querySelector('.lc60-now'), !document.querySelector('.lc60-stop').hidden]")
    pg.wait_for_function("!document.querySelector('.lc60-say.is-on')", timeout=6000)
    out('one paragraph [plays: button turns on, the paragraph is highlighted, the clip is requested; when it ends everything resets]', [on_state, len(hits['mp3']) >= 1, pg.evaluate("!document.querySelector('.lc60-now')")])
    hits['mp3'].clear(); pg.click('.lc60-all'); pg.wait_for_function("document.querySelector('.lc60-say.is-on')", timeout=5000)
    pg.wait_for_timeout(2600)
    seq = len(set(hits['mp3']))
    pg.click('.lc60-stop'); pg.wait_for_timeout(300); n_stop = len(hits['mp3']); pg.wait_for_timeout(1500)
    out('Listen to this lesson [plays several different clips one after the other, Stop ends it and nothing more is requested]', [seq >= 3, len(hits['mp3']) == n_stop, pg.evaluate("!document.querySelector('.lc60-say.is-on') && document.querySelector('.lc60-stop').hidden")])
    # a second lesson screen: no second index request (kept 24 h)
    pg.evaluate("location.hash = '#middlegame'"); pg.wait_for_timeout(1500)
    pg.evaluate("document.querySelector('[data-eg-open$=\"|learn\"]') && document.querySelector('[data-eg-open$=\"|learn\"]').click()"); pg.wait_for_timeout(1500)
    out('middlegame lesson [also gets the speakers; the index is NOT requested again]', [pg.evaluate("document.querySelectorAll('.lc60-say').length") >= 1, hits['index']]); c.close()
    # no audio folder yet: nothing is shown, one request, no error
    c, pg, hits = _open(br, with_audio=False)
    pg.evaluate("document.querySelector('[data-eg-open$=\"|learn\"]').click()"); pg.wait_for_timeout(2500)
    out('no audio files yet [no buttons, no bar, ONE index request, lesson text still there]', [pg.evaluate("document.querySelectorAll('.lc60-say, .lc60-bar').length"), hits['index'], pg.evaluate("document.querySelector('#theory-root h2') !== null")])
    pg.evaluate("location.hash = '#middlegame'"); pg.wait_for_timeout(1200); pg.evaluate("document.querySelector('[data-eg-open$=\"|learn\"]') && document.querySelector('[data-eg-open$=\"|learn\"]').click()"); pg.wait_for_timeout(1500)
    out('no audio files yet, another lesson [still only one index request in 6 hours]', hits['index']); c.close()
    # the cleaning in the browser equals the script's cleaning (this is what makes the hashes match)
    c, pg, hits = _open(br, 'home')
    samples = ['Know **when** a game is over \u2192 stalemate \u2014 repetition \u2705 and 50-move -> rule\u00a0here.', '  Many   spaces\n\nand a line break  ', 'Plain text without anything special in it at all.']
    js = pg.evaluate("(a) => Promise.all(a.map(async t => LC60.clean(t) + '|' + await LC60.hashOf(LC60.clean(t))))", samples)
    py = [_mla.clean(t) + '|' + _mla.clip_id(_mla.clean(t)) for t in samples]
    out('browser cleaning + SHA-1 equals the Python script for markdown, arrows, dashes, emoji, spaces', [js == py]); c.close()
    mod = open(REPO + '/lc60.js', encoding='utf-8').read().strip(); app = open(REPO + '/app.html', encoding='utf-8').read()
    out('LC60 [embedded copy equals lc60.js, build]', [mod in app, '9.32.0' in app.split('const CONFIG={version:"')[1][:12]])
    br.close()
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
