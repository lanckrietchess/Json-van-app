# lc56 (9.30.0): board first on phones, touch belongs to the board, Instant Play, one-tap Shuffle, puzzle ELO from the account, auto-continue ~300 ms, photo -> FEN scan.
# Real Chromium, 390x844 phone. The scan endpoint is a stub (the real function is tested by `node tests/fenscan.test.mjs`).
import json as _json, base64 as _b64, time as _time
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
MEMBER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'member@example.com' }))"
SEED = "localStorage.setItem('lc19-sw', JSON.stringify({ on: false, level: 5 })); localStorage.setItem('lc-hub-elo-v1', JSON.stringify({ chesscom: { user: 'tester' } }));"
def _open(br, who, hash_, w=390, h=844):
    c = mkctx(br, w, h, w < 700); pg = c.new_page(); watch(pg, 'lc56-' + hash_)
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate((OWNER if who == 'owner' else MEMBER if who == 'member' else '') + ';' + SEED)
    pg.goto('http://127.0.0.1:8765/app.html#' + hash_); pg.wait_for_timeout(4500)
    pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x => x.remove())"); pg.wait_for_timeout(500)
    return c, pg
def _box(pg, sel): return pg.evaluate("(() => { const e = document.querySelector(%s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.top + scrollY), Math.round(r.bottom + scrollY)]; })()" % _json.dumps(sel))
with sync_playwright() as p:
    br = p.chromium.launch()
    # ---- 1. board first, phone layout
    c, pg = _open(br, 'member', 'bot'); b = _box(pg, '#view .board-b72b1'); q = _box(pg, '#lc39-q'); ta = pg.evaluate("getComputedStyle(document.querySelector('#bt .board-b72b1')).touchAction")
    out('bot [board starts above 560 px, board ends inside the 844 px screen, quest strip below the board, touch-action]', [b[0] < 560, b[1] <= 844, q[0] > b[0], ta]); c.close()
    c, pg = _open(br, 'member', 'trim'); b = _box(pg, '#view .board-b72b1'); n = _box(pg, '.an-main .nav-row'); s = pg.evaluate("!!document.querySelector('.an-main .nav-row .lc56-scan')")
    out('trim [board starts above 300 px, controls under it, scan button in the controls]', [b[0] < 300, n[0] >= b[1] - 4, s]); c.close()
    for r in ('middlegame', 'endgame', 'openings'):
        c, pg = _open(br, 'member', r); i = _box(pg, '.lc56-instant'); m = _box(pg, '#theory-root [id^="metrics-"]')
        out(r + ' [Instant Play above 460 px, stats below it]', [bool(i) and i[0] < 460, (m is None) or m[0] > i[1]]); c.close()
    c, pg = _open(br, 'member', 'shuffle'); g = _box(pg, '.lc56-go'); col = pg.evaluate("document.querySelector('#shuffle-root .sh-setup').classList.contains('lc56-c')")
    out('shuffle [Start shuffling above 300 px, options folded]', [bool(g) and g[0] < 300, col]); c.close()
    # ---- 2. Instant Play really starts a drill
    for r in ('endgame', 'middlegame'):
        c, pg = _open(br, 'member', r); pg.click('.lc56-instant'); pg.wait_for_selector('#view .trainer .board-b72b1', timeout=8000)
        out(r + ' Instant Play [drill with a board is on screen]', True); c.close()
    c, pg = _open(br, 'member', 'openings'); pg.click('.lc56-instant'); pg.wait_for_selector('#view .trainer .board-b72b1, #view .board-b72b1', timeout=8000)
    out('openings Instant Play [repertoire drill with a board is on screen]', True); c.close()
    # ---- 3. Shuffle: one tap in, options open on request
    c, pg = _open(br, 'member', 'shuffle'); pg.click('.lc56-opt'); opened = pg.evaluate("!document.querySelector('#shuffle-root .sh-setup').classList.contains('lc56-c') && !!document.querySelector('#shuffle-root .sh-scope')")
    pg.click('.lc56-opt'); folded = pg.evaluate("document.querySelector('#shuffle-root .sh-setup').classList.contains('lc56-c')")
    pg.click('.lc56-go'); shown = pg.wait_for_selector('.lc56-load', timeout=3000) is not None; pg.wait_for_selector('#shuffle-root .board-b72b1', timeout=10000); pg.wait_for_timeout(900)
    out('shuffle [Options opens, folds again, Start shows the tip screen, a board appears, the tip screen is gone]', [opened, folded, shown, pg.evaluate("!document.querySelector('.lc56-load')")]); c.close()
    # ---- 4. rated puzzles start at the account's rating (1000 without one)
    c, pg = _open(br, 'member', 'home'); pg.evaluate("localStorage.removeItem('lc-puzzle-elo'); Object.keys(localStorage).filter(k => /puzzle.?elo|pz/i.test(k)).forEach(k => localStorage.removeItem(k)); App.profile.elo = 1337; location.hash = '#puzzles'"); pg.wait_for_timeout(2500)
    r1 = pg.evaluate("[PuzzleElo.started(), PuzzleElo.get().rating, !document.querySelector('[data-pz-start]')]"); c.close()
    c, pg = _open(br, 'guest', 'home'); pg.evaluate("Object.keys(localStorage).filter(k => /puzzle.?elo|pz/i.test(k)).forEach(k => localStorage.removeItem(k)); location.hash = '#puzzles'"); pg.wait_for_timeout(2500)
    r2 = pg.evaluate("[PuzzleElo.started(), PuzzleElo.get().rating]"); c.close()
    out('rated puzzles [linked rating 1337 used, no manual pick shown; no account starts at 1000]', [r1, r2])
    # ---- 5. auto-continue: the next button is pressed by itself well under a second after a solved item
    c, pg = _open(br, 'member', 'think'); pg.evaluate("window.__t0 = 0; window.__t1 = 0; const b = document.createElement('button'); b.setAttribute('data-act', 'next'); b.className = 'btn'; b.textContent = 'Next'; b.addEventListener('click', () => { window.__t1 = performance.now(); }); document.querySelector('#view').appendChild(b); window.__t0 = performance.now();")
    pg.wait_for_function('window.__t1 > 0', timeout=5000); dt = pg.evaluate('Math.round(window.__t1 - window.__t0)')
    out('auto-continue [next pressed by itself in under 900 ms]', [dt < 900, dt >= 250]); c.close()
    # ---- 6. photo -> FEN scan
    PLACE = '6k1/5ppp/8/8/8/8/5PPP/3R2K1'; CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS'}
    def scan_case(answer, who='owner', delay=0.0):
        c, pg = _open(br, who, 'trim'); got = {}
        def h(route, request):
            if request.method == 'OPTIONS': return route.fulfill(status=204, headers=CORS)
            got['body'] = _json.loads(request.post_data); got['auth'] = request.headers.get('authorization'); got['apikey'] = bool(request.headers.get('apikey'))
            if delay: _time.sleep(delay)
            route.fulfill(status=answer[0], headers=dict(CORS, **{'content-type': 'application/json'}), body=_json.dumps(answer[1]))
        pg.route('**/functions/v1/fen-scan', h)
        big = pg.evaluate("(() => { const c = document.createElement('canvas'); c.width = 3000; c.height = 2000; const x = c.getContext('2d'); x.fillStyle = '#c9a56b'; x.fillRect(0, 0, 3000, 2000); x.fillStyle = '#222'; x.fillRect(500, 300, 2000, 1400); return c.toDataURL('image/jpeg', 0.9).split(',')[1]; })()")
        return c, pg, got, _b64.b64decode(big)
    # good photo
    c, pg, got, img = scan_case((200, {'ok': True, 'fen': PLACE + ' w - - 0 1', 'confidence': 0.9, 'orientation': 'white_bottom'}), delay=0.9)
    with pg.expect_file_chooser() as fc: pg.click('.lc56-scan')
    ch = fc.value; native = pg.evaluate("(() => { const i = document.querySelector('#lc56-file'); return [i.accept, i.getAttribute('capture')]; })()")
    ch.set_files({'name': 'puzzle.jpg', 'mimeType': 'image/jpeg', 'buffer': img}); pg.wait_for_timeout(350)
    spinner = pg.evaluate("!!document.querySelector('.lc56-scanov')"); pg.wait_for_function("!document.querySelector('.lc56-scanov')", timeout=10000); pg.wait_for_timeout(1200)
    dims = pg.evaluate("(u) => new Promise(r => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = u; })", got['body']['image'])
    pos = pg.evaluate("[!!document.querySelector('#an-board [data-square=\"d1\"] img[data-piece=\"wR\"]'), !!document.querySelector('#an-board [data-square=\"g8\"] img[data-piece=\"bK\"]'), !document.querySelector('#an-board [data-square=\"a8\"] img')]")
    out('scan, good photo [native camera picker accept/capture, spinner on the board, resized to <= 1080 px, token + key sent]', [native, spinner, max(dims) <= 1080 and max(dims) > 500, (got['auth'] or '').startswith('Bearer '), got['apikey']])
    out('scan, good photo [position is on the analysis board: rook d1, king g8, nothing else]', pos); c.close()
    # unreadable photo -> clear message, nothing crashes
    c, pg, got, img = scan_case((422, {'ok': False, 'reason': 'unreadable'}))
    before = pg.evaluate("document.querySelector('#an-board').innerHTML.length")
    with pg.expect_file_chooser() as fc: pg.click('.lc56-scan')
    fc.value.set_files({'name': 'p.jpg', 'mimeType': 'image/jpeg', 'buffer': img}); pg.wait_for_timeout(1800)
    out('scan, unreadable photo [better-lighting message, board untouched, page alive, spinner gone]', ['better lighting' in pg.evaluate('document.body.innerText'), pg.evaluate("document.querySelector('#an-board').innerHTML.length") == before, pg.evaluate("!!document.querySelector('.lc56-scan')"), pg.evaluate("!document.querySelector('.lc56-scanov')")]); c.close()
    # a position that cannot be real (two white kings) -> same message
    c, pg, got, img = scan_case((200, {'ok': True, 'fen': '6k1/5ppp/8/8/8/8/5PPP/3R1KK1 w - - 0 1'}))
    with pg.expect_file_chooser() as fc: pg.click('.lc56-scan')
    fc.value.set_files({'name': 'p.jpg', 'mimeType': 'image/jpeg', 'buffer': img}); pg.wait_for_timeout(1800)
    out('scan, impossible position from the server [rejected by chess.js, message shown]', ['better lighting' in pg.evaluate('document.body.innerText')]); c.close()
    # daily limit and network failure
    c, pg, got, img = scan_case((429, {'ok': False, 'reason': 'limit'}))
    with pg.expect_file_chooser() as fc: pg.click('.lc56-scan')
    fc.value.set_files({'name': 'p.jpg', 'mimeType': 'image/jpeg', 'buffer': img}); pg.wait_for_timeout(1500)
    out('scan, daily limit [its own message]', ['today’s board scans' in pg.evaluate('document.body.innerText')]); c.close()
    c, pg, got, img = scan_case((200, {}))
    pg.unroute('**/functions/v1/fen-scan'); pg.route('**/functions/v1/fen-scan', lambda route, request: route.abort())
    with pg.expect_file_chooser() as fc: pg.click('.lc56-scan')
    fc.value.set_files({'name': 'p.jpg', 'mimeType': 'image/jpeg', 'buffer': img}); pg.wait_for_timeout(1800)
    out('scan, no connection [message, no crash, spinner gone]', ['better lighting' in pg.evaluate('document.body.innerText'), pg.evaluate("!document.querySelector('.lc56-scanov')")]); c.close()
    # a free member gets the upgrade pop-up BEFORE the camera opens; a guest is sent to sign in
    c, pg = _open(br, 'member', 'trim'); opened = []
    pg.on('filechooser', lambda f: opened.append(1)); pg.click('.lc56-scan'); pg.wait_for_timeout(1200)
    out('scan, free member [no camera, upgrade pop-up]', [len(opened) == 0, pg.evaluate("!!document.querySelector('.sheet-wrap')")]); c.close()
    c, pg = _open(br, 'guest', 'trim'); opened = []
    pg.on('filechooser', lambda f: opened.append(1)); pg.click('.lc56-scan'); pg.wait_for_timeout(1000)
    out('scan, guest [no camera, sign-in hint]', [len(opened) == 0, 'Sign in to scan a board' in pg.evaluate('document.body.innerText') or pg.evaluate('location.hash') == '#account']); c.close()
    # ---- 7. the module in app.html is the file lc56.js
    c, pg = _open(br, 'member', 'home')
    mod = open(REPO + '/lc56.js', encoding='utf-8').read().strip(); app = open(REPO + '/app.html', encoding='utf-8').read()
    out('LC56 [embedded copy equals lc56.js, build, init]', [mod in app, pg.evaluate('CONFIG.version'), pg.evaluate("typeof LC56 === 'object'")]); c.close()
    br.close()
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
