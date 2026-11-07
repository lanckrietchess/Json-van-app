# touch (9.29.0): moving a piece on a phone never scrolls the page (LC55). Real Chromium with real touch events (CDP), real chessboard.js from tests/vendor.
# A = without LC55 (reproduces the bug: the page scrolls under the finger while the piece is in the air), B = with the real /lc55.js, C = a swipe that starts on an empty square still scrolls.
import re as _re
_HTML = '''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/chessboard-js/1.0.0/chessboard-1.0.0.min.css"><style>body{margin:0}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chessboard-js/1.0.0/chessboard-1.0.0.min.js"></script></head>
<body><div id="b" style="width:360px"></div><div style="height:2600px;background:linear-gradient(#123,#456)">spacer</div>__FIX__</body></html>'''
def _page(br, fix):
    c = mkctx(br, 390, 700, mobile=True); pg = c.new_page(); watch(pg, 'touch')
    html = _HTML.replace('__FIX__', '<script src="/lc55.js"></script><script>LC55.init()</script>' if fix else '')
    pg.route('http://127.0.0.1:8765/__touch.html', lambda r: r.fulfill(body=html, content_type='text/html'))
    pg.goto('http://127.0.0.1:8765/__touch.html'); pg.wait_for_function("typeof Chessboard === 'function'")
    assert pg.evaluate("'ontouchstart' in document.documentElement"), 'not a touch browser'
    pg.evaluate("window.cb = Chessboard('b', {draggable: true, position: 'start'})"); pg.wait_for_timeout(300)
    return c, pg
def _drag(c, pg, square):
    x, y = pg.evaluate("(() => { const e = document.querySelector('[data-square=\"%s\"]').getBoundingClientRect(); return [e.x + e.width / 2, e.y + e.height / 2]; })()" % square)
    cdp = c.new_cdp_session(pg)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
    for i in range(1, 21):
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': y - i * 12}]}); pg.wait_for_timeout(16)
    air = pg.evaluate("[...document.querySelectorAll('body>img.piece-417db')].some(e => e.style.display !== 'none')"); scrolled = pg.evaluate('window.scrollY')
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); pg.wait_for_timeout(500)
    return scrolled, air
with sync_playwright() as p:
    br = p.chromium.launch()
    c, pg = _page(br, False); s, air = _drag(c, pg, 'e2'); out('touch drag without LC55 [page scrolls, piece in the air]', [s > 100, air]); c.close()
    c, pg = _page(br, True); s, air = _drag(c, pg, 'e2'); out('touch drag with LC55 [page stays put, piece in the air]', [s == 0, air]); c.close()
    c, pg = _page(br, True); s, air = _drag(c, pg, 'e4'); out('touch swipe from an empty square with LC55 [page scrolls, no piece in the air]', [s > 100, not air]); c.close()
    c = mkctx(br, 390, 700, mobile=True); pg = c.new_page(); watch(pg, 'app'); pg.goto('http://127.0.0.1:8765/app.html'); pg.wait_for_timeout(3500)
    mod = open(REPO + '/lc55.js', encoding='utf-8').read().strip(); app = open(REPO + '/app.html', encoding='utf-8').read()
    out('touch real app [LC55 on, build, embedded copy equals lc55.js]', [pg.evaluate("typeof LC55 === 'object' && LC55.stats().on"), pg.evaluate('CONFIG.version'), mod in app])
    c.close(); br.close()
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
