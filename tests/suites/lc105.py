# lc105 (9.73.0): "Master one opening" (#opening-path), the "Crucial for your openings" cards on Middlegame / Endgame, the
# Shuffle filter for an opening's endgames, the LC95 hand-over of his positions, and Game-to-Script's "Instructive good moment" /
# "Instructive mistake" (one position from his analysed games, scanned alone with the real Stockfish). Real Chromium, signed in as
# the owner; master-data comes from tests/fixtures/master (one great move and one blunder from two of Kyenzo's real games).
import json as _j
APP = 'http://127.0.0.1:8765/app.html'
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
OLD = "localStorage.setItem('lc34-first', JSON.stringify(Date.now() - 20 * 864e5))"
OVER = "Math.max(0, document.documentElement.scrollWidth - innerWidth)"
_SR = "(() => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot && e.shadowRoot.getElementById('stage')); return h ? h.shadowRoot : null; })()"
def st(pg, js): return pg.evaluate("(async () => { const R = " + _SR + "; if (!R) return 'no studio'; " + js + " })()")
MD = {}
for n in ('index.json', 'puzzles-2026-2.json', 'games-2026-2.json'): MD[n] = open(FIX + '/master/' + n, encoding='utf-8').read()
FETCHED = []
def _md(r):
    n = r.request.url.split('?')[0].rsplit('/', 1)[-1]; FETCHED.append(n)
    if n in MD: return r.fulfill(status=200, body=MD[n], content_type='application/json', headers={'access-control-allow-origin': '*'})
    return r.fulfill(status=404, body='{}')
def boot(br, tag, hash, w=390, h=844):
    c = mkctx(br, w, h, w < 800); pg = c.new_page(); watch(pg, 'lc105-' + tag)
    pg.route('https://cdn.jsdelivr.net/gh/lanckrietchess/**', _md)
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(OWNER); pg.evaluate(OLD)
    pg.goto(APP + '#home'); pg.wait_for_timeout(2600)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
    if hash: pg.evaluate("h => { location.hash = h }", hash); pg.wait_for_timeout(2000)
    return c, pg
with sync_playwright() as p:
    br = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
    c, pg = boot(br, 'page', '#opening-path')
    out('page [title, four courses, default = the White choice, three parts]', pg.evaluate("[document.querySelector('[data-lc105-page] h1').textContent, [...document.querySelectorAll('[data-lc105-pick]')].map(b => b.textContent), document.querySelector('[data-lc105-pick][aria-pressed=true]').textContent, document.querySelectorAll('[data-lc105-page] h2').length]"))
    pg.click('[data-lc105-pick="Caro-Kann"]'); pg.wait_for_timeout(300)
    out('Caro-Kann [lead names his games, middlegame lessons, a reason from his games, endgame lessons]', pg.evaluate("""(() => { const p = document.querySelector('[data-lc105-page]'); const mg = [...p.querySelectorAll('[data-lc105-kind=mg]')], eg = [...p.querySelectorAll('[data-lc105-kind=eg]')];
      return [/of my own Caro-Kann games/.test(p.textContent), mg.length >= 8, /of my \\d+ Caro-Kann games reach it at move 15/.test(p.textContent), eg.length >= 8]; })()"""))
    out('phone [overflow-x]', pg.evaluate(OVER))
    pg.evaluate("window.__lc95 = null; const o = sessionStorage.setItem.bind(sessionStorage); sessionStorage.setItem = (k, v) => { if (k === 'lc95-open') window.__lc95 = JSON.parse(v); return o(k, v); }")
    pg.click('[data-lc105-pos="mg"]'); pg.wait_for_timeout(1500)
    out('my positions [LC95 gets the ids and the label, opens the trainer]', pg.evaluate("[window.__lc95.ids.length > 0, window.__lc95.label, location.hash]"))
    pg.evaluate("location.hash = '#opening-path'"); pg.wait_for_timeout(1200); pg.click('[data-lc105-pick="Caro-Kann"]'); pg.wait_for_timeout(300)
    pg.click('[data-lc105-eg="Caro-Kann"]'); pg.wait_for_timeout(1200)
    out('Train these endgames [Shuffle, endgame scope, filter, a smaller pool]', pg.evaluate("""(() => { const s = App.settings.shuffle; const all = shufflePool().filter(x => x.scope === 'endgame');
      const f = LC105.filter(s.filter, all); return [location.hash, s.scope, s.filter, f.length > 0 && f.length < all.length]; })()"""))
    pg.evaluate("location.hash = '#middlegame'"); pg.wait_for_timeout(2200)
    out('middlegame card [shown, title, rows for my openings, link]', pg.evaluate("(() => { const c = document.querySelector('[data-lc105-card]'); return c ? [true, c.querySelector('p').textContent.trim(), c.querySelectorAll('li').length, c.querySelector('a').getAttribute('href')] : null; })()"))
    pg.evaluate("location.hash = '#endgame'"); pg.wait_for_timeout(2200)
    out('endgame card [shown]', pg.evaluate("!!document.querySelector('[data-lc105-card]')"))
    pg.evaluate("location.hash = '#openings'"); pg.wait_for_timeout(1800)
    out('openings card links here', pg.evaluate("!!document.querySelector('[data-lc104] a[href=\"#opening-path\"]')"))
    out('LC105 [embedded copy equals lc105.js, init, afterRender, route, shuffle hook, build]', pg.evaluate("""(async () => {
      const src = await (await fetch('lc105.js')).text(), html = await (await fetch('app.html')).text();
      const a = html.indexOf('/*@@module lc105*/'), b = html.indexOf('/*@@end lc105*/') + 15;
      return [html.slice(a, b) === src.trim(), html.includes('try{LC105.init()}'), html.includes('LC105.afterRender(route)'), html.includes('"opening-path":v=>'), html.includes('LC105.filter(cfg.filter,open)'), LC105.version];
    })()"""))
    c.close()
    # Game-to-Script: one instructive moment from his games
    c = mkctx(br, 1280, 800, False); pg = c.new_page(); watch(pg, 'lc105-g2s'); pg.route('https://cdn.jsdelivr.net/gh/lanckrietchess/**', _md)
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(OWNER); pg.evaluate("localStorage.setItem('lc103-ui', JSON.stringify({depth: 'fast'}))")
    pg.goto(APP + '#studio'); pg.wait_for_function("!!(" + _SR + ")", timeout=30000); pg.wait_for_timeout(3500)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())")
    st(pg, "const f = R.querySelector('.lc31-fmt'); if (f) f.click(); return 1"); pg.wait_for_timeout(400)
    pg.evaluate("LC79.openScript()"); pg.wait_for_timeout(800)
    out('quick buttons [good, mistake, scope]', pg.evaluate("[!!document.querySelector('#lc79-ai [data-a=quick-good]'), !!document.querySelector('#lc79-ai [data-a=quick-bad]'), [...document.querySelectorAll('#lc79-ai select[data-f=qscope] option')].map(o => o.textContent)]"))
    for kind, sel in (('good', 'quick-good'), ('mistake', 'quick-bad')):
        import time as _t; t0 = _t.time()
        pg.click('#lc79-ai [data-a=' + sel + ']')
        try: pg.wait_for_function("(() => { const s = document.querySelector('#lc79-ai [data-st]'); return s && /Make a video project|No moment|tries|Could not|HTTP|found/.test(s.textContent); })()", timeout=90000)
        except Exception: print('status after 90 s:', pg.evaluate("(document.querySelector('#lc79-ai [data-st]') || {}).textContent"), FETCHED)
        secs = round(_t.time() - t0)
        out('instructive ' + kind + ' [status, one moment, under 60 s]', pg.evaluate("[document.querySelector('#lc79-ai [data-st]').textContent.split('.')[0], (LC79._ai.list || []).length]") + [secs < 60])
    out('master-data asked [index, puzzles, games]', sorted(set(FETCHED)))
    c.close()
    real = [e for e in errs if 'Failed to load resource' not in e]
    print('ERRORS', len(real))
    for e in real[:8]: print('  ', e)
