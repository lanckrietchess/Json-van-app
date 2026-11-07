# lc58 (9.31.0): Working Points and evaluation graphs fill themselves from the linked account's recent games.
# Real Chromium, 390x844. The engine and the Chess.com fetch are stubs (a real Stockfish takes minutes per game); everything else is the real app.
import json as _json
MEMBER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'member@example.com' })); localStorage.setItem('lc19-sw', JSON.stringify({ on: false, level: 5 })); localStorage.setItem('lc-hub-elo-v1', JSON.stringify({ chesscom: { user: 'tester' } }));"
PGNS = ['[Event "t"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 *', '[Event "t"]\n\n1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 h6 7. Bh4 b6 *',
        '[Event "t"]\n\n1. c4 e5 2. Nc3 Nf6 3. Nf3 Nc6 4. g3 d5 5. cxd5 Nxd5 6. Bg2 Nb6 7. O-O Be7 *', '[Event "t"]\n\n1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6 7. Nf3 Nd7 *']
def _chesscom(pg):
    cors = {'access-control-allow-origin': '*', 'content-type': 'application/json'}
    games = {'games': [{'white': {'username': 'tester', 'rating': 1200, 'result': 'win' if i % 2 == 0 else 'resigned'}, 'black': {'username': 'opp%d' % i, 'rating': 1250, 'result': 'resigned' if i % 2 == 0 else 'win'}, 'pgn': PGNS[i], 'time_class': 'rapid', 'end_time': 1700000000 + i} for i in range(4)]}
    def h(route, request):
        body = {'archives': ['https://api.chess.com/pub/player/tester/games/2026/11']} if request.url.endswith('/games/archives') else games
        route.fulfill(status=200, headers=cors, body=_json.dumps(body))
    pg.route('**/api.chess.com/**', h)
STUBS = """
window.__calls = []; window.__scans = 0;
Engine.load = async () => true;
LC80.scan.parseGame = (pgn) => ({ pgn: pgn, moves: [], fens: [] });
LC80.scan.analyseGame = async (g, tick, cancelled) => {
  window.__scans++; const n = window.__scans;
  await new Promise(r => setTimeout(r, 120));
  if (cancelled()) throw new Error('cancelled');
  const items = [{ color: 'w', cls: 'blunder', k: 'P' }, { color: 'w', cls: 'mistake', k: 'P' }, { color: 'w', cls: 'mistake', k: n % 2 ? 'S' : 'M' }, { color: 'b', cls: 'blunder', k: 'C' }, { color: 'w', cls: 'good', k: 'M' }];
  items.series = Array.from({ length: 24 }, (_, i) => Math.round(Math.sin(i / 3 + n) * 120));
  return items;
};
undefined;
"""
def _open(br, hash_='home', stubs=True, wait=1500):
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc58'); _chesscom(pg)
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(MEMBER)
    pg.goto('http://127.0.0.1:8765/app.html#' + hash_); pg.wait_for_timeout(wait)
    pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x => x.remove())")
    if stubs: pg.evaluate(STUBS)
    return c, pg
with sync_playwright() as p:
    br = p.chromium.launch()
    # ---- 1. the scan fills graphs and Working Points by itself
    c, pg = _open(br, 'home', wait=2500)
    pre = pg.evaluate("[Framework.active().length, (Store.get('lc42-games', []) || []).length]")
    pg.evaluate("LC58.run(true)"); pg.wait_for_function("LC58.state().fin === true && window.__scans >= 4", timeout=20000); pg.wait_for_timeout(500)
    st = pg.evaluate("(() => { const g = Store.get('lc42-games', []); return [g.length, g.filter(x => x.ev && x.ev.length === 24).length, g.filter(x => x.lk).length, Framework.active().map(x => x.cat).sort().join('')]; })()")
    out('before the scan [no working points, no cached games]', pre)
    out('scan of 4 games [4 games cached, 4 graphs saved, 4 mistake counts, own-colour leaks only: P and S/M, never the opponent\'s C]', [st[0], st[1], st[2], 'C' not in st[3] and 'P' in st[3] and len(st[3]) >= 2])
    out('working points [filled by the scan, 3 at most, a toast told the member]', [pg.evaluate("Framework.active().length"), pg.evaluate("Framework.active().length") <= 3, 'filled in your Working Points' in pg.evaluate("document.body.innerText")])
    pg.evaluate("location.hash = '#system'"); pg.wait_for_timeout(1500)
    out('MSPC System page [shows the new working points]', ['Priorities' in pg.evaluate("document.body.innerText")])
    n0 = pg.evaluate("window.__scans"); pg.evaluate("LC58.run(false)"); pg.wait_for_timeout(800)
    out('a second visit inside the cool-down does not scan again', pg.evaluate("window.__scans") == n0); c.close()
    # ---- 2. the Game Library shows the graphs instead of "no graph yet"
    c, pg = _open(br, 'home', wait=2500); pg.evaluate("LC58.run(true)"); pg.wait_for_function("LC58.state().fin === true", timeout=20000)
    pg.evaluate("location.hash = '#trim'"); pg.wait_for_selector('#lc39-lib [data-lc39-game]', timeout=10000); pg.wait_for_timeout(2500)
    rows = pg.evaluate("(() => { const r = [...document.querySelectorAll('#lc39-lib [data-lc39-game]')]; return [r.length, r.filter(x => x.querySelector('[data-lc52-spark] svg')).length, r.filter(x => /no graph yet/.test(x.textContent)).length]; })()")
    out('Game Library [4 rows, 4 graphs, none says "no graph yet"]', rows)
    pg.screenshot(path=SHOTS + '/lc58-library.png'); c.close()
    # ---- 3. the scan waits while a trainer is on screen and resumes afterwards
    c, pg = _open(br, 'puzzles', wait=2500); pg.evaluate("window.__scans = 0")
    pg.evaluate("(() => { LC58.run(true); return 0; })()"); pg.wait_for_timeout(3500)
    waiting = pg.evaluate("[window.__scans, LC58.busy()]")
    pg.evaluate("location.hash = '#home'"); pg.wait_for_function("window.__scans >= 1", timeout=25000)
    out('scan [waits while a trainer is open (0 games analysed), runs once the person leaves it]', [waiting[0] == 0, waiting[1], pg.evaluate("window.__scans") >= 1]); c.close()
    # ---- 4. nothing happens without a linked account, with LC42's first-time road running, or when switched off
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc58-none')
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate("localStorage.setItem('lc19-sw', JSON.stringify({ on: false, level: 5 }))")
    pg.goto('http://127.0.0.1:8765/app.html'); pg.wait_for_timeout(2500); pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x => x.remove())"); pg.evaluate(STUBS)
    pg.evaluate("LC58.run(true)"); pg.wait_for_timeout(1200)
    out('no linked account [nothing scanned, nothing cached]', [pg.evaluate("window.__scans"), pg.evaluate("(Store.get('lc42-games', []) || []).length")]); c.close()
    c, pg = _open(br, 'home', wait=2500); pg.evaluate("Store.set('lc58-off', 1); LC58.run(true)"); pg.wait_for_timeout(1000)
    out('switched off [lc58-off stops it]', pg.evaluate("window.__scans")); c.close()
    # ---- 5. existing working points are never overwritten, and the scan is quiet when the games are clean
    c, pg = _open(br, 'home', wait=2500)
    pg.evaluate("Framework.coachAdd('S', null, { sev: 2, freq: 2, pers: 2 }); Framework.coachAdd('M', null, { sev: 2, freq: 2, pers: 2 }); Framework.coachAdd('C', null, { sev: 2, freq: 2, pers: 2 })")
    pg.evaluate("LC58.run(true)"); pg.wait_for_function("LC58.state().fin === true", timeout=20000); pg.wait_for_timeout(400)
    out('three working points already there [kept, none added, no "filled in" toast]', [pg.evaluate("Framework.active().length"), 'filled in your Working Points' not in pg.evaluate("document.body.innerText")]); c.close()
    # ---- 6. static
    c, pg = _open(br, 'home', stubs=False, wait=2500)
    mod = open(REPO + '/lc58.js', encoding='utf-8').read().strip(); app = open(REPO + '/app.html', encoding='utf-8').read()
    out('LC58 [embedded copy equals lc58.js, build]', [mod in app, pg.evaluate('CONFIG.version')]); c.close()
    br.close()
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
