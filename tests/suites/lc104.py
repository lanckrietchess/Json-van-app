# lc104 (9.72.0): the White repertoire choice (1.d4 / 1.e4 / both), Ranked and the Shuffle Trainer testing only that repertoire,
# and the new course content: the Vienna & 1.e4 group from Kyenzo's ChessTempo export, the merged Caro-Kann / Semi-Slav / Colle lines
# and the Englund Gambit chapter from his games. Real Chromium at 390x844, the real app with the real content.json, signed in as the
# owner (a new free account is sent to the quest board first).
APP = 'http://127.0.0.1:8765/app.html'
OVER = "Math.max(0, document.documentElement.scrollWidth - innerWidth)"
POOL = "(() => { const p = shufflePool().filter(x => x.scope === 'openings'); const g = s => [...new Set(p.filter(x => x.side === s).map(x => x.courseName))].sort(); return [g('w'), g('b').length > 0]; })()"
CARD = "(() => { const c = document.querySelector('[data-lc104]'); if (!c) return null; return [[...c.querySelectorAll('[data-lc104-pick]')].map(b => [b.getAttribute('data-lc104-pick'), b.getAttribute('aria-pressed')]), c.querySelector('[data-lc104-note]').textContent]; })()"
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
OLD = "localStorage.setItem('lc34-first', JSON.stringify(Date.now() - 20 * 864e5))"
NAME = "localStorage.setItem('lc-hub-v2', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('lc-hub-v2') || '{}'), { profile: Object.assign({ name: 'Tester' }, (JSON.parse(localStorage.getItem('lc-hub-v2') || '{}').profile || {})) })))"
def boot(br, tag, hash, pre=''):
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc104-' + tag)
    pg.goto('http://127.0.0.1:8765/version.json')
    if pre: pg.evaluate(pre)
    pg.evaluate(OWNER); pg.evaluate(OLD); pg.evaluate(NAME)
    pg.goto(APP + '#home'); pg.wait_for_timeout(2600)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
    pg.evaluate("h => { location.hash = h }", hash); pg.wait_for_timeout(1800)
    return c, pg
with sync_playwright() as p:
    br = p.chromium.launch()
    c, pg = boot(br, 'openings', '#openings')
    out('content [Vienna group in the groups list, its chapters, lines per level 1-5]', pg.evaluate("""(() => {
      const g = (CONTENT.groups || CONTENT.lists && CONTENT.lists.groups || []).some(x => x.name === 'Vienna & 1.e4');
      const ls = (CONTENT.openings || []).filter(o => o.group === 'Vienna & 1.e4');
      const lv = [1, 2, 3, 4, 5].map(k => ls.filter(o => Levels.of(o) === k).length > 0);
      return [g, new Set(ls.map(o => o.topicId)).size >= 40, lv];
    })()"""))
    out('Englund chapter [a Colle line starts 1.d4 e5 2.dxe5, the trap note is there]', pg.evaluate("""(() => {
      const ls = (CONTENT.openings || []).filter(o => o.group === 'Colle-Koltanowski' && /^1\\.\\s*d4 e5 2\\.\\s*dxe5/.test(o.pgn.replace(/\\s+/g, ' ')));
      return fetch('content.json').then(r => r.json()).then(d => { const t = JSON.stringify(d.trees.filter(x => x.group === 'Colle-Koltanowski')); return [ls.length > 0, /Qc1#/.test(t) && /Englund Gambit/.test(t)]; });
    })()"""))
    out('route', pg.evaluate("location.hash"))
    out('default [card on Theory > Openings, 1.d4 pressed, not picked yet]', pg.evaluate(CARD))
    out('default pool [White courses in Ranked / Shuffle, Black lines too]', pg.evaluate(POOL))
    pg.click('[data-lc104-pick="e4"]'); pg.wait_for_timeout(300)
    out('pick 1.e4 [saved, card]', [pg.evaluate("App.settings.repWhite"), pg.evaluate(CARD)])
    out('1.e4 pool', pg.evaluate(POOL))
    pg.click('[data-lc104-pick="both"]'); pg.wait_for_timeout(300)
    out('both pool', pg.evaluate(POOL))
    out('phone [overflow-x]', pg.evaluate(OVER))
    pg.evaluate("location.hash = '#ranked'"); pg.wait_for_timeout(1800)
    out('ranked [card there, Both still pressed]', pg.evaluate("(() => { const c = document.querySelector('[data-lc104]'); return c ? c.querySelector('[aria-pressed=\"true\"]').getAttribute('data-lc104-pick') : null; })()"))
    out('ranked phone [overflow-x]', pg.evaluate(OVER))
    c.close()
    c, pg = boot(br, 'profile', '#openings', "localStorage.setItem('lc-hub-v2', JSON.stringify({ v: 2, onboarded: true, settings: { sound: false, board: false }, profile: { name: 'E', rep: { w: 'e4' } } }))")
    out('profile says 1.e4 [default e4, not picked]', [pg.evaluate("LC104.choice()"), pg.evaluate("LC104.picked()")])
    out('LC104 [embedded copy equals lc104.js, init, afterRender, pool hook, build]', pg.evaluate("""(async () => {
      const src = await (await fetch('lc104.js')).text(), html = await (await fetch('app.html')).text();
      const a = html.indexOf('/*@@module lc104*/'), b = html.indexOf('/*@@end lc104*/') + 15;
      return [html.slice(a, b) === src.trim(), html.includes('try{LC104.init()}'), html.includes('LC104.afterRender(route)'), html.includes('!LC104.inPool(o))return;'), LC104.version];
    })()"""))
    c.close()
    # Supabase, Chess.com and Lichess are not stubbed here (nothing in LC104 calls them), so their blocked requests are left out
    real = [e for e in errs if 'Failed to load resource' not in e]
    print('ERRORS', len(real))
    for e in real[:8]: print('  ', e)
