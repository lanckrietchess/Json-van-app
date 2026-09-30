import subprocess, os, time
B = 'http://127.0.0.1:8765/index.html'; SRV = 'http://127.0.0.1:8787'; TOKEN = 'e2e-admin-token-0123456789'
srv = subprocess.Popen(['node', 'test/serve.mjs'], cwd=REPO + '/server', env=dict(os.environ, PORT='8787', ADMIN_TOKEN=TOKEN), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
import re as _re, urllib.request
print('server up:', urllib.request.urlopen(SRV).read()[:80])
_real_mkctx = mkctx
def mkctx(*a, **k):
    c = _real_mkctx(*a, **k); c.route(_re.compile(r'^http://127\.0\.0\.1:8787/'), lambda r: r.continue_()); return c
QE2 = "(() => { const g = new Chess(); ['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nd7','Qe2'].forEach((m) => g.move(m)); return g.fen(); })()"
def drag(pg, board, a, b): pg.drag_and_drop('#%s [data-square="%s"] img' % (board, a), '#%s [data-square="%s"]' % (board, b))
def fbk(pg, root): return pg.evaluate("(r) => { const f = document.querySelector(r + ' .st-feedback'); return f ? f.innerText.replace(/\\s+/g, ' ').trim().slice(0, 160) : ''; }", root)
def shot(pg, sel, name, maxh=1000):
    box = pg.evaluate("(s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }; }", sel)
    box['height'] = min(box['height'], maxh); pg.screenshot(path=SHOTS + '/' + name, full_page=True, clip=box)
def boot(pg, name):
    pg.goto(B + '#home'); pg.wait_for_timeout(700); pg.wait_for_function('!Site.pending()', timeout=20000)
    pg.evaluate("([u, n]) => { V5Doc.apply({ server: { url: u } }); App.profile.name = n; App.save(); }", [SRV, name])
def rows(pg): return pg.evaluate("[...document.querySelectorAll('.ar5-board li')].map((l) => l.innerText.replace(/\\s+/g, ' ')).join(' / ')")
def reopen(pg, h):
    pg.evaluate("location.hash = '#home'"); pg.wait_for_timeout(300); pg.evaluate("(h) => { location.hash = h; }", h)
try:
  with sync_playwright() as p:
    br = p.chromium.launch()
    try:
        ca = mkctx(br, 1280, 900); pa = ca.new_page(); watch(pa, 'A'); boot(pa, 'Anna')
        cb = mkctx(br, 1280, 900); pb = cb.new_page(); watch(pb, 'B'); boot(pb, 'Bram')
        pa.evaluate("for (let i = 0; i < 4; i++) App.score('think', true)"); pb.evaluate("App.score('clinic', true); App.score('think', true)")
        pa.wait_for_timeout(3600)
        out('A synced [pid, server rows]', pa.evaluate("[V5Net.pid(), JSON.stringify((Tourney.server() || {}).rows)]"))
        pb.evaluate("(c) => Friends.addCode(c)", pa.evaluate("Friends.code()"))
        reopen(pb, '#leaderboard'); pb.wait_for_selector('#arena5 .ar5-cup', timeout=15000); pb.wait_for_timeout(2500)
        out('B board (server)', rows(pb)); out('B friend', pb.evaluate("Friends.list().map((f) => [f.id.slice(0, 4), f.name, f.t && f.t.s])"))
        pa.evaluate("App.score('think', true); App.score('think', true)")
        reopen(pa, '#leaderboard'); pa.wait_for_selector('#arena5 .ar5-cup', timeout=15000); pa.wait_for_timeout(2500)
        reopen(pb, '#leaderboard'); pb.wait_for_selector('#arena5 .ar5-cup', timeout=15000); pb.wait_for_timeout(2800)
        out('B after Anna trained [board, fresh card score]', [rows(pb), pb.evaluate("Friends.list().map((f) => [f.name, f.t && f.t.s])")])
        shot(pb, '#arena5 .ar5-grid', 'srv_arena.png', 700)
        fen = pb.evaluate(QE2)
        out('B stages a free puzzle', pb.evaluate("(fen) => V5Net.post('p5_stage', { name: 'Bram', items: [{ route: 'peer', fen, played: 'Ngf6', best: 'Ndf6', opening: 'Caro-Kann', elo: 1100, num: 5 }] }).then((r) => r.added)", fen))
        reopen(pa, '#peer'); pa.wait_for_selector('.pool5 .cl-card', timeout=15000)
        pa.click('.pool5 .cl-card'); pa.wait_for_selector('#pool-panel .m5', timeout=10000); pa.wait_for_timeout(300)
        pa.click('#pool-board [data-square="d6"]'); pa.click('#pool-panel [data-m5="check"]'); pa.wait_for_timeout(300); pa.click('#pool-panel [data-act="advance"]'); pa.wait_for_timeout(300)
        drag(pa, 'pool-board', 'd7', 'f6'); pa.wait_for_timeout(500); out('A solved Bram’s blunder', fbk(pa, '#pool-panel'))
        shot(pa, '.pool5', 'srv_pool.png', 900)
        reopen(pa, '#trim'); pa.wait_for_selector('#coach', timeout=15000); pa.click('[data-act="sample"]'); pa.wait_for_timeout(800); pa.click('[data-act="review"]')
        for i in range(60):
            pa.wait_for_timeout(1500); pa.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach((b) => b.click())")
            if pa.query_selector('[data-act="interrogate"]'): break
        pa.wait_for_timeout(1500)
        cc = mkctx(br, 1280, 900); pc = cc.new_page(); watch(pc, 'C'); boot(pc, 'Kyenzo')
        pc.evaluate("(t) => { Object.defineProperty(Admin, 'active', { get: () => true, configurable: true }); Store.set('lc5-admin-token', t); location.hash = '#review-queue'; }", TOKEN)
        pc.wait_for_selector('.srv5 .sp5-row', timeout=15000)
        out('admin: server queue', pc.evaluate("[...document.querySelectorAll('.srv5 .sp5-row')].map((r) => r.innerText.replace(/\\s+/g, ' ')).join(' | ')"))
        shot(pc, '.srv5', 'srv_admin.png', 500)
        pc.click('.srv5 [data-srv5="queue"]'); pc.wait_for_timeout(1500)
        out('admin: sent [review queue size, server queue now]', pc.evaluate("[(Store.get('lc-hub-review-queue-v1', []) || []).length, document.querySelector('.srv5').innerText.replace(/\\s+/g, ' ').slice(-90)]"))
        pc.click('.srv5 [data-srv5-tab="board"]'); pc.wait_for_selector('.srv5 [data-srv5="ban"]', timeout=10000)
        out('admin: board', pc.evaluate("[...document.querySelectorAll('.srv5 .sp5-row')].map((r) => r.innerText.replace(/\\s+/g, ' ')).join(' | ')"))
        pc.click('.srv5 .sp5-row:has-text("Bram") [data-srv5="ban"]'); pc.wait_for_timeout(1200)
        pa.evaluate("Tourney.pull()"); pa.wait_for_timeout(1500)
        out('A board after Bram is banned', pa.evaluate("JSON.stringify((Tourney.server() || {}).rows.map((r) => [r.name, r.score]))"))
        pc.evaluate("V5Admin.arena()"); pc.wait_for_selector('[data-v5ar]', timeout=5000)
        pc.fill('[data-v5ar] [name="srv"]', SRV); pc.click('[data-v5ar-test]'); pc.wait_for_timeout(1500)
        out('admin: test connection', pc.evaluate("document.querySelector('[data-v5ar-out]').textContent"))
        pc.fill('[data-v5ar] [name="tok"]', 'wrong-token-00000000000000'); pc.click('[data-v5ar-test]'); pc.wait_for_timeout(1500)
        out('admin: wrong token', pc.evaluate("document.querySelector('[data-v5ar-out]').textContent"))
        pc.fill('[data-v5ar] [name="tok"]', TOKEN); pc.click('[data-v5ar] button[type="submit"]'); pc.wait_for_timeout(700)
        out('admin: saved [published server address, token stays local]', pc.evaluate("[JSON.stringify(Admin.draft().v5.server), JSON.stringify(Admin.draft()).indexOf('" + TOKEN + "') < 0, Store.get('lc5-admin-token', '') === '" + TOKEN + "']"))
    except Exception as e: out('FAIL e2e', repr(e)[:600])
    br.close()
finally:
    srv.terminate()
print('ERRORS', len([e for e in errs if '404' not in e])); [print(' ', e[:300]) for e in errs if '404' not in e][:12]
