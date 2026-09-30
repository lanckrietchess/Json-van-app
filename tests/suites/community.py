import subprocess, os, time, json as _json
# The classic community protocol on a local Arena server: two devices on the Leaderboard page
# (desktop and phone), a verified Chess.com account (the server reads a mocked public profile),
# and the coach's Insights from the anonymous stats.
B = 'http://127.0.0.1:8765/index.html'; SRV = 'http://127.0.0.1:8789'; TOKEN = 'e2e-admin-token-0123456789'; CODE = 'LC-TEST23'
MOCKS = {'https://api.chess.com/pub/player/kyenzotest': {'username': 'kyenzotest', 'url': 'https://www.chess.com/member/KyenzoTest', 'avatar': '', 'location': 'Ghent ' + CODE, 'name': 'K'},
         'https://api.chess.com/pub/player/kyenzotest/stats': {'chess_rapid': {'last': {'rating': 2105}}, 'chess_blitz': {'last': {'rating': 1990}}}}
srv = subprocess.Popen(['node', 'test/serve.mjs'], cwd=REPO + '/server', env=dict(os.environ, PORT='8789', ADMIN_TOKEN=TOKEN, FETCH_MOCKS=_json.dumps(MOCKS)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
import re as _re, urllib.request
print('server up:', urllib.request.urlopen(SRV).read()[:80])
_real_mkctx = mkctx
def mkctx(*a, **k):
    c = _real_mkctx(*a, **k); c.route(_re.compile(r'^http://127\.0\.0\.1:8789/'), lambda r: r.continue_()); return c
def shot(pg, sel, name, maxh=1000):
    box = pg.evaluate("(s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }; }", sel)
    box['height'] = min(box['height'], maxh); pg.screenshot(path=SHOTS + '/' + name, full_page=True, clip=box)
# A player with n puzzles, the first `ok` of them solved: the attempts the hub logs, on the device.
ATTEMPTS = """([n, ok, cat]) => { const t = Date.now() - 3600e3, list = [];
  for (let i = 0; i < n; i++) list.push({ id: 'think-e2e-' + i, k: 'think', c: i < 3 ? 'endgame' : cat, a: i < ok ? 1 : 0, ms: 18000 + i * 700, mv: 2, d: 1300, t: t + i * 60e3 });
  Attempts.merge(list); return Attempts.all().length; }"""
def boot(pg, name, n, ok):
    pg.goto(B + '#home'); pg.wait_for_timeout(700); pg.wait_for_function('!Site.pending()', timeout=20000)
    pg.evaluate("([u, nm]) => { V5Doc.apply({ server: { url: u } }); GATE_OVR.leaderboard = 'free'; App.profile.name = nm; App.settings.board = true; App.save(); }", [SRV, name])
    pg.evaluate(ATTEMPTS, [n, ok, 'middlegame'])
    return pg.evaluate("Ranks.sync()")
def rows(pg, sel):
    return pg.evaluate("(s) => [...document.querySelectorAll(s + ' .lb-row')].map((l) => (l.classList.contains('is-you') ? '*' : '') + (l.querySelector('.sr-only') || l.querySelector('.lb-rank')).textContent + ' ' + l.querySelector('.lb-name').firstChild.textContent.trim() + ' ' + l.querySelector('.lb-val').textContent).join(' / ')", sel)
def board(pg, h):
    pg.evaluate("location.hash = '#home'"); pg.wait_for_timeout(300); pg.evaluate("(h) => { location.hash = h; }", h)
try:
  with sync_playwright() as p:
    br = p.chromium.launch()
    try:
        ca = mkctx(br, 1280, 900); pa = ca.new_page(); watch(pa, 'A')
        cb = mkctx(br, 390, 844, True); pb = cb.new_page(); watch(pb, 'B')
        out('endpoint falls back to the Arena server [A synced, B synced, endpoint]', [boot(pa, 'Anna', 24, 22), boot(pb, 'Bram', 12, 7), pa.evaluate("Ranks.endpoint()")])
        # With the server on, the hub asks once whether to share anonymous stats; B says no.
        pb.evaluate("askConsent()"); pb.wait_for_selector('.sheet-wrap [data-share="0"]', timeout=5000)
        out('B is asked once to share stats [title, again]', [pb.evaluate("document.querySelector('.sheet-wrap h2, .sheet-wrap .sheet-title').textContent.trim()"), pb.evaluate("document.querySelector('.sheet-wrap [data-share=\"0\"]').click(); new Promise((r) => setTimeout(r, 400)).then(() => { askConsent(); return [App.settings.share, !!document.querySelector('.sheet-wrap [data-share]')]; })")])
        board(pa, '#leaderboard'); pa.wait_for_selector('#lb-board .lb-list', timeout=15000); pa.wait_for_timeout(300)
        out('A score board', rows(pa, '#lb-board'))
        out('A: the server ranks the score the device shows', pa.evaluate("+document.querySelector('#lb-board .lb-row.is-you .lb-val').textContent === Ranks.mine('week').score && Ranks.mine('week').ranked"))
        board(pb, '#leaderboard'); pb.wait_for_selector('#lb-board .lb-list', timeout=15000); pb.wait_for_timeout(300)
        out('B score board (phone)', [rows(pb, '#lb-board'), pb.evaluate("document.querySelector('#lb-board').innerText.replace(/\\s+/g, ' ').slice(-40)")])
        out('B phone [overflow-x]', pb.evaluate("Math.max(document.documentElement.scrollWidth, innerWidth) - document.documentElement.clientWidth"))
        out('B phone [gap between your card and friends >= 12px]', pb.evaluate("document.querySelector('.ar5-friends').getBoundingClientRect().top - document.querySelector('.ar5-me').getBoundingClientRect().bottom >= 12"))
        shot(pb, '#lb-board', 'community_phone.png', 900)
        pb.click('[data-lbm="volume"]'); pb.wait_for_selector('#vb-board .lb-list', timeout=15000); pb.wait_for_timeout(300)
        out('B volume board (20 solved to rank)', rows(pb, '#vb-board'))
        pb.click('[data-vs="accuracy"]'); pb.wait_for_timeout(1200)
        out('B volume board, accuracy', rows(pb, '#vb-board'))
        pb.evaluate("App.ui.lbMode = 'score'")
        # Anna puts the code in the Location field of her Chess.com profile (mocked on the server).
        out('A verifies Chess.com', pa.evaluate("(code) => { Elo.start('chesscom', 'kyenzotest'); Elo.acct('chesscom').code = code; return Elo.verify('chesscom').then((r) => [r.ok, r.community, Elo.acct('chesscom').user, Elo.acct('chesscom').rapid]); }", CODE))
        out('B tries a wrong code', pb.evaluate("() => { Elo.start('chesscom', 'kyenzotest'); Elo.acct('chesscom').code = 'LC-WRONG9'; return Elo.verify('chesscom').then((r) => [r.ok, r.reason]); }"))
        board(pb, '#home'); pb.wait_for_selector('#elo-board .elo-podium', timeout=15000); pb.wait_for_timeout(300)
        out('B sees the ELO board', pb.evaluate("document.querySelector('#elo-board #elo-body').innerText.replace(/\\s+/g, ' ').slice(0, 120)"))
        shot(pb, '#elo-board', 'community_elo_phone.png', 700)
        # Anonymous stats: Anna says yes; her misses reach the coach's Insights.
        pa.evaluate("Telemetry.log({ e: 's', k: 'think-e2e-1', g: 'MSPC' }); Telemetry.log({ e: 'f', k: 'think-e2e-1', g: 'MSPC', v: 25 }); Telemetry.log({ e: 'q', x: 'plan', q: 'What is the plan here?' }); Telemetry.setShare(true)")
        pa.wait_for_function("+Store.get('lc-hub-events-sent', 0) >= Telemetry.all()[Telemetry.all().length - 1].t", timeout=15000)
        out('A shares stats [sent]', pa.evaluate("Telemetry.all().length"))
        cc = mkctx(br, 1280, 900); pc = cc.new_page(); watch(pc, 'C')
        pc.goto(B + '#home'); pc.wait_for_timeout(700); pc.wait_for_function('!Site.pending()', timeout=20000)
        pc.evaluate("([u, t]) => { V5Doc.apply({ server: { url: u } }); Object.defineProperty(Admin, 'active', { get: () => true, configurable: true }); sessionStorage.setItem('lc-hub-worker-secret', t); location.hash = '#insights'; }", [SRV, TOKEN])
        pc.wait_for_function("document.querySelector('#ins-body') && !/Loading/.test(document.querySelector('#ins-body').innerText) && document.querySelector('#ins-body').innerText.length > 40", timeout=15000)
        out('admin insights', pc.evaluate("document.querySelector('#ins-body').innerText.replace(/\\s+/g, ' ').slice(0, 400)"))
        out('admin insights [players on the board, question]', pc.evaluate("[/2 on the leaderboard/.test(document.body.innerText), /What is the plan here\\?/.test(document.body.innerText)]"))
        pc.evaluate("sessionStorage.setItem('lc-hub-worker-secret', 'wrong-secret-000000000000'); App.ui.ins = null; location.hash = '#home'"); pc.wait_for_timeout(300); pc.evaluate("location.hash = '#insights'")
        pc.wait_for_function("/refused/.test((document.querySelector('#ins-body') || {}).innerText || '')", timeout=15000)
        out('admin insights, wrong token', pc.evaluate("document.querySelector('#ins-body').innerText.replace(/\\s+/g, ' ').slice(0, 80)"))
        errs[:] = [e for e in errs if not (e.startswith('C console:') and '403' in e)]   # the refusal above is the expected answer
        # The admin hides Bram; he leaves the board. He forgets himself; the board still hides him when he comes back.
        pc.evaluate("sessionStorage.setItem('lc-hub-worker-secret', '" + TOKEN + "')")
        out('admin hides Bram', pc.evaluate("Ranks.post({ action: 'lb_admin', secret: '" + TOKEN + "', op: 'list' }).then((r) => Ranks.post({ action: 'lb_admin', secret: '" + TOKEN + "', op: 'hide', target: r.players.filter((x) => x.name === 'Bram')[0].device })).then((r) => r.players.map((x) => x.name + (x.hidden ? ' (hidden)' : '')).join(', '))"))
        out('A board after the admin hid Bram', pa.evaluate("Ranks.post({ action: 'lb_top', period: 'week', device: deviceId() }).then((d) => d.rows.map((r) => r.name).join(', ') + ' / ' + d.total)"))
    except Exception as e: out('FAIL community', repr(e)[:600])
    br.close()
finally:
    srv.terminate()
print('ERRORS', len([e for e in errs if '404' not in e])); [print(' ', e[:300]) for e in errs if '404' not in e][:12]
