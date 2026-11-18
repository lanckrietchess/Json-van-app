# lc95 (9.60.0): Kyenzo's Games. Real Chromium, 390x844, the real app. The Supabase calls (mg_tiers, mg_daily, mg_puzzles,
# mg_openings, mg_curate) are answered here from tests/fixtures/master_data (two of Kyenzo's real games, analysed by
# tools/master_games.py with the real Stockfish). Free: the daily taste and the Pro lock; Pro: mistakes by level and openings.
import json as _j
_G = _j.load(open(FIX + '/master_data/games-2026-2.json', encoding='utf-8'))
_P = _j.load(open(FIX + '/master_data/puzzles-2026-2.json', encoding='utf-8'))
GOODK, BADK = ['brilliant', 'great', 'punish'], ['blunder', 'mistake', 'missed']
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
CALLS = []
NOSQL = {'on': False}
def _rpc(r):
    u = r.request.url.split('?')[0]; fn = u.rsplit('/', 1)[-1]
    if not fn.startswith('mg_'): return r.fallback()
    a = _j.loads(r.request.post_data or '{}'); CALLS.append([fn, a])
    H = {'access-control-allow-origin': '*'}
    if NOSQL['on']: return r.fulfill(status=404, body=_j.dumps({'code': 'PGRST202', 'message': 'Could not find the function'}), content_type='application/json', headers=H)
    if fn == 'mg_tiers':
        t = {}
        for g in _G: t.setdefault(g['tier'], []).append(g)
        body = [{'tier': k, 'games': len(v), 'acc': round(sum(x['acc_me'] for x in v) / len(v), 1), 'blunders_per_game': round(sum(x['counts']['blunder'] for x in v) / len(v), 2), 'mistakes_per_game': 1, 'score': 50, 'puzzles': len(_P)} for k, v in t.items()]
    elif fn == 'mg_daily': body = [p for p in _P if p['kind'] in GOODK][:a.get('p_n', 3)]
    elif fn == 'mg_puzzles':
        body = [p for p in _P if p['kind'] in a.get('p_kinds', GOODK) and (not a.get('p_tier') or p['tier'] == a['p_tier']) and (not a.get('p_eco') or p['eco'].startswith(a['p_eco']))]
    elif fn == 'mg_openings': body = [{'eco': 'B12', 'opening': 'Caro Kann Defense Advance', 'color': 'b', 'games': 2, 'score': 50, 'acc': 84, 'puzzles': 2, 'mistakes': 7}]
    elif fn == 'mg_curate': body = {'ok': True}
    elif fn == 'mg_admin_sync': body = {'ok': True, 'games': 2, 'puzzles': 9, 'pending': 0}
    else: body = []
    r.fulfill(status=200, body=_j.dumps(body), content_type='application/json', headers=H)
def ctx(br, extra=''):
    c = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=1)
    c.route('**/*', route); c.route('**/rest/v1/rpc/**', _rpc); c.add_init_script(script=INIT)
    if extra: c.add_init_script(script=extra)
    return c
panel = "(() => { const p = document.querySelector('[data-lc95-panel]'); return p ? p.innerText : ''; })()"
fbtext = "(() => { const p = document.querySelector('[data-lc95-fb]'); return p ? p.innerText.replace(/\\s+/g, ' ').trim() : ''; })()"
with sync_playwright() as p:
    br = p.chromium.launch()
    # A. free player
    c = ctx(br); pg = c.new_page(); watch(pg, 'free')
    pg.goto('http://127.0.0.1:8765/app.html#home'); pg.wait_for_timeout(2500)
    out('LC95 [embedded copy equals lc95.js, build, in the Think menu]', [open(REPO + '/lc95.js', encoding='utf-8').read().rstrip('\n') in open(REPO + '/app.html', encoding='utf-8').read(), pg.evaluate('LC95.version'), pg.evaluate("Nav5._t.GROUPS[0].sections[0].items.some(x => x.href === '#kgames' && x.label === 'Kyenzo’s games')")])
    pg.evaluate("location.hash = '#kgames'"); pg.wait_for_timeout(2500)
    out('free page [title, tabs, climb strip, board, first prompt]', pg.evaluate("[document.querySelector('.lc95 h1').childNodes[0].textContent, [...document.querySelectorAll('[data-lc95-tab]')].map(b => b.textContent), document.querySelectorAll('.lc95-tier').length, !!document.querySelector('[data-lc95-board] .lc-board'), document.querySelector('[data-lc95-panel] h2').textContent]"))
    out('free page [asked the daily set, not the full list]', [x[0] for x in CALLS if x[0] in ('mg_daily', 'mg_puzzles')][:1])
    first = pg.evaluate('LC95._t.state().list[0]')
    out('free page [board turned to Kyenzo’s side, count line]', [pg.evaluate("document.querySelector('[data-lc95-board] .board-b72b1, [data-lc95-board] [class*=board]') ? LC95._t.state().board.orientation() : ''"), 'free today: 3 left' in pg.evaluate(panel)])
    pg.evaluate("window.__alt = 0; LC25.alt.check = () => { window.__alt++; return Promise.resolve({ tier: 'none' }); }; undefined")
    bad = 'h7h6' if first['solution'][0] != 'h7h6' else 'a7a6'
    pg.evaluate("LC95._t.play(%s)" % _j.dumps(bad)); pg.wait_for_timeout(900)
    out('wrong move [Stockfish asked, message, position back]', [pg.evaluate('window.__alt'), pg.evaluate(fbtext)[:15], pg.evaluate('LC95._t.state().board.fen()') == first['fen']])
    pg.evaluate("LC95._t.play(%s)" % _j.dumps(bad)); pg.wait_for_timeout(900)
    out('second wrong move [Show me appears]', pg.evaluate("!document.querySelector('[data-lc95=\"show\"]').hidden"))
    pg.evaluate("LC95._t.play(%s)" % _j.dumps(first['solution'][0])); pg.wait_for_timeout(1800)
    f = pg.evaluate(fbtext)
    out('solved [title, says what Kyenzo played, Next shown, game link]', [f.split('.')[0], ('I played ' + first['played_san']) in f, pg.evaluate("!document.querySelector('[data-lc95=\"next\"]').hidden"), pg.evaluate("(document.querySelector('[data-lc95-game]') || {}).href || ''")])
    out('free counter after one [left]', pg.evaluate('LC95._t.freeLeft()'))
    pg.click('[data-lc95-tab="mist"]'); pg.wait_for_timeout(800)
    out('free, mistakes tab [lock title, button]', pg.evaluate("[document.querySelector('.lc95-lock h2').textContent, document.querySelector('.lc95-lock [data-lc95=\"pro\"]').textContent]"))
    pg.evaluate("window.__open = []; LC90.open = o => window.__open.push(o); undefined")
    pg.click('.lc95-lock [data-lc95="pro"]'); pg.wait_for_timeout(300)
    out('Try Pro free [opens the offer from kgames]', pg.evaluate('window.__open'))
    out('phone [no sideways scroll on #kgames]', pg.evaluate('document.documentElement.scrollWidth - innerWidth'))
    c.close()
    # B. Pro player at 1700: the mistakes at his level, then the openings
    del CALLS[:]
    c = ctx(br, OWNER); pg = c.new_page(); watch(pg, 'pro')
    pg.goto('http://127.0.0.1:8765/app.html#think'); pg.wait_for_timeout(4000)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(1200)
    out('#think [card to my games]', pg.evaluate("(() => { const a = document.querySelector('[data-lc95-card]'); return a ? [a.getAttribute('href'), a.querySelector('b').textContent] : null; })()"))
    pg.evaluate("location.hash = '#openings'"); pg.wait_for_timeout(2500)
    out('#openings [card with my top opening]', pg.evaluate("(() => { const a = document.querySelector('[data-lc95-card]'); return a ? [a.getAttribute('href'), a.getAttribute('data-lc95-intent'), a.querySelector('small').textContent.slice(0, 26)] : null; })()"))
    pg.evaluate("App.isPro = () => true; App.profile.elo = 1700; sessionStorage.setItem('lc95-open', JSON.stringify({ tab: 'mist' })); location.hash = '#kgames'"); pg.wait_for_timeout(2500)
    out('owner [Sync now shown]', pg.evaluate("!!document.querySelector('[data-lc95=\"sync\"]')"))
    a = [x[1] for x in CALLS if x[0] == 'mg_puzzles']
    out('pro mistakes [asked kinds, tier from the rating, tier picker on]', [a[-1].get('p_kinds') if a else None, a[-1].get('p_tier') if a else None, pg.evaluate("(document.querySelector('.lc95-tp .btn-primary') || {}).textContent")])
    m = pg.evaluate('LC95._t.state().list[0]')
    out('pro mistake prompt [heading, Kyenzo’s rating named]', [pg.evaluate("document.querySelector('[data-lc95-panel] h2').textContent"), ('I was %d Elo' % m['my_rating']) in pg.evaluate(panel)])
    pg.evaluate("LC95._t.play(%s)" % _j.dumps(m['played'])); pg.wait_for_timeout(1200)
    out('playing Kyenzo’s own mistake [named, no Stockfish needed]', pg.evaluate(fbtext)[:22])
    pg.evaluate("LC95._t.play(%s)" % _j.dumps(m['solution'][0])); pg.wait_for_timeout(1800)
    f = pg.evaluate(fbtext)
    out('pro mistake solved [better move named, the game move named]', [f.startswith('Correct. Better: ' + m['best_san']) or f.startswith('Better: ' + m['best_san']), ('In the game I played ' + m['played_san']) in f])
    pg.click('[data-lc95-tab="open"]'); pg.wait_for_timeout(1200)
    out('pro openings [list]', pg.evaluate("[...document.querySelectorAll('[data-lc95-eco]')].map(b => b.querySelector('b').textContent)"))
    pg.click('[data-lc95-eco="B12"]'); pg.wait_for_timeout(1500)
    a = [x[1] for x in CALLS if x[0] == 'mg_puzzles']
    out('pro opening B12 [eco asked, both kinds, header]', [a[-1].get('p_eco'), sorted(a[-1].get('p_kinds')), pg.evaluate("document.querySelector('.lc95-eco').textContent.slice(0, 5)")])
    c.close()
    # C. no SQL yet: a calm message, no error
    NOSQL['on'] = True
    c = ctx(br); pg = c.new_page(); watch(pg, 'nosql')
    pg.goto('http://127.0.0.1:8765/app.html#kgames'); pg.wait_for_timeout(3000)
    out('no SQL yet [message]', pg.evaluate("(document.querySelector('[data-lc95-body]') || {}).innerText || ''").strip())
    c.close(); NOSQL['on'] = False
    br.close()
bad = [e for e in errs if 'PAGEERROR' in e or 'lc95' in e.lower()]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
