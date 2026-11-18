# lc96 (9.61.0): the MSPC System page (#learn-mspc) and the new MSPC trainer (#think = Kyenzo's Games with an M / S / P / C bar).
# Real Chromium, 390x844, the real app. Supabase is answered here: lc89_cfg_public 'mspc' (empty first, then what the owner saved),
# lc89_cfg_save, mg_examples (missing at first: the page falls back to mg_puzzles), mg_daily / mg_puzzles / mg_tiers from the
# two real games in tests/fixtures/master_data.
import json as _j
_P = _j.load(open(FIX + '/master_data/puzzles-2026-2.json', encoding='utf-8'))
_G = _j.load(open(FIX + '/master_data/games-2026-2.json', encoding='utf-8'))
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
GOODK = ['brilliant', 'great', 'punish']
ST = {'cfg': {}, 'examples': False, 'saved': []}
CALLS = []
def _rpc(r):
    u = r.request.url.split('?')[0]
    H = {'access-control-allow-origin': '*'}
    if '/rest/v1/master_puzzles' in u:
        want = r.request.url.split('id=eq.')[-1].split('&')[0]
        return r.fulfill(status=200, body=_j.dumps([p for p in _P if p['id'] == want]), content_type='application/json', headers=H)
    fn = u.rsplit('/', 1)[-1]
    if fn not in ('lc89_cfg_public', 'lc89_cfg_save', 'mg_examples', 'mg_puzzles', 'mg_daily', 'mg_tiers', 'mg_openings'): return r.fallback()
    a = _j.loads(r.request.post_data or '{}'); CALLS.append([fn, a])
    if fn == 'lc89_cfg_public':
        if a.get('p_k') != 'mspc': return r.fallback()
        body = {'ok': True, 'k': 'mspc', 'v': ST['cfg']}
    elif fn == 'lc89_cfg_save':
        ST['saved'].append(a); ST['cfg'] = a.get('p_v') or {}; body = {'ok': True}
    elif fn == 'mg_examples':
        if not ST['examples']: return r.fulfill(status=404, body=_j.dumps({'code': 'PGRST202', 'message': 'Could not find the function'}), content_type='application/json', headers=H)
        body = [dict(p, cat='tactic') for p in _P if p['kind'] in GOODK]
    elif fn == 'mg_puzzles': body = [p for p in _P if p['kind'] in a.get('p_kinds', GOODK)][:a.get('p_limit', 20)]
    elif fn == 'mg_daily': body = [p for p in _P if p['kind'] in GOODK][:3]
    elif fn == 'mg_tiers': body = [{'tier': '1600-1999', 'games': 2, 'acc': 84, 'blunders_per_game': 1.5, 'mistakes_per_game': 1, 'score': 50, 'puzzles': 9}]
    else: body = []
    r.fulfill(status=200, body=_j.dumps(body), content_type='application/json', headers=H)
def ctx(br, extra=''):
    c = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=1)
    c.route('**/*', route); c.route('**/rest/v1/**', _rpc); c.add_init_script(script=INIT)
    if extra: c.add_init_script(script=extra)
    return c
with sync_playwright() as p:
    br = p.chromium.launch()
    # A. a player: the learn page with the defaults, one example, the trainer with the MSPC bar
    c = ctx(br); pg = c.new_page(); watch(pg, 'player')
    pg.goto('http://127.0.0.1:8765/app.html#home'); pg.wait_for_timeout(2500)
    app = open(REPO + '/app.html', encoding='utf-8').read()
    out('LC96 [embedded copy equals lc96.js, LC95 too, build]', [open(REPO + '/lc96.js', encoding='utf-8').read().rstrip('\n') in app, open(REPO + '/lc95.js', encoding='utf-8').read().rstrip('\n') in app, pg.evaluate('LC96.version')])
    out('Think menu [items]', pg.evaluate("Nav5._t.GROUPS.filter(g => g.id === '3t')[0].sections[0].items.map(x => x.href + ' ' + x.label)"))
    out('old trainer gone [#think mounts the MSPC trainer of my games]', pg.evaluate("MOUNT.think === MOUNT.kgames"))
    pg.evaluate("location.hash = '#learn-mspc'"); pg.wait_for_timeout(2500)
    out('learn page [title, four steps, step names from the app]', pg.evaluate("[document.querySelector('.lc96 h1').childNodes[0].textContent, [...document.querySelectorAll('.lc96-step .lc96-k')].map(x => x.textContent).join(''), [...document.querySelectorAll('.lc96-step h2')].map(x => x.textContent).length]"))
    out('learn page [no empty how-to sections for players, no edit button, examples from my games]', pg.evaluate("[document.querySelectorAll('.lc96-sec').length, !document.querySelector('[data-lc96=\"edit\"]'), document.querySelectorAll('[data-lc96-open]').length > 0]"))
    out('learn page [fell back to mg_puzzles while mg_examples is missing]', sorted(set(x[0] for x in CALLS if x[0] in ('mg_examples', 'mg_puzzles'))))
    pg.evaluate("document.querySelector('[data-lc96-open]').click()"); pg.wait_for_timeout(1500)
    ex = pg.evaluate('LC96._t.ex().p')
    out('example [board, side to move named, Walk me through it]', [pg.evaluate("!!document.querySelector('[data-lc96-board] .lc-board')"), pg.evaluate("document.querySelector('.lc96-vh h2').textContent").endswith('Find my move.'), pg.evaluate("document.querySelector('[data-lc96=\"next\"]').textContent.trim()")])
    pg.evaluate("LC96._t.play(%s)" % _j.dumps(ex['solution'][0])); pg.wait_for_timeout(600)
    out('example [the right move is recognised]', pg.evaluate("document.querySelector('[data-lc96-fb]').innerText.trim()"))
    for i in range(5): pg.evaluate("document.querySelector('[data-lc96=\"next\"]').click()"); pg.wait_for_timeout(400)
    out('walk-through [M S P C then my move, from the board]', pg.evaluate("[[...document.querySelectorAll('.lc96-wk .lc96-k')].map(x => x.textContent.slice(0, 1)).join(''), document.querySelectorAll('.lc96-wk .lc93').length >= 3, document.querySelector('.lc96-wk.is-move .lc96-k').textContent]"))
    out('phone [no sideways scroll on #learn-mspc]', pg.evaluate('document.documentElement.scrollWidth - innerWidth'))
    c.close()
    # B. the owner writes the page and publishes it
    del CALLS[:]
    c = ctx(br, OWNER); pg = c.new_page(); watch(pg, 'owner')
    pg.goto('http://127.0.0.1:8765/app.html#learn-mspc'); pg.wait_for_timeout(3500)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(400)
    pg.evaluate("location.hash = '#home'"); pg.wait_for_timeout(800); pg.evaluate("location.hash = '#learn-mspc'"); pg.wait_for_timeout(2500)
    pg.evaluate("location.hash = '#think'"); pg.wait_for_timeout(2500)
    out('MSPC trainer [title, link to learn, the M S P C bar]', pg.evaluate("[document.querySelector('.lc95 h1').childNodes[0].textContent, !!document.querySelector('.lc95-hd a[href=\"#learn-mspc\"]'), [...document.querySelectorAll('[data-lc95-k] b')].map(x => x.textContent).join('')]"))
    pg.click('[data-lc95-k="P"]'); pg.wait_for_timeout(300)
    t = pg.evaluate("document.querySelector('[data-lc95-mf]').innerText")
    first = pg.evaluate('LC95._t.state().list[0]')
    out('P before the move [lists checks and captures, does not single out the move]', ['Your checks' in t and 'Your captures' in t, 'The move of this case' not in t])
    pg.click('[data-lc95-k="C"]'); pg.wait_for_timeout(300)
    out('C before the move [how to calculate, no line]', pg.evaluate("document.querySelector('[data-lc95-mf]').innerText.indexOf('best answer') >= 0"))
    pg.evaluate("window.__marks = []; const o = FeatureChecklist.mark; FeatureChecklist.mark = id => { window.__marks.push(id); try { o.call(FeatureChecklist, id) } catch (e) {} }; undefined")
    pg.evaluate("LC95._t.play(%s)" % _j.dumps(first['solution'][0])); pg.wait_for_timeout(1500)
    pg.click('[data-lc95-k="C"]'); pg.wait_for_timeout(300)
    out('after the move [quest MSPC Wizard marked, C shows the line]', [pg.evaluate("window.__marks.indexOf('mspc') >= 0"), pg.evaluate("document.querySelector('[data-lc95-mf] .lc93') ? 'line' : 'none'")])
    pg.evaluate("location.hash = '#learn-mspc'"); pg.wait_for_timeout(2500)
    out('owner [Edit this page shown]', pg.evaluate("!!document.querySelector('[data-lc96=\"edit\"]')"))
    pg.evaluate("document.querySelector('[data-lc96=\"edit\"]').click()"); pg.wait_for_timeout(500)
    out('edit mode [text fields for intro, M S P C, use, you; one picker per example]', pg.evaluate("[document.querySelectorAll('[data-lc96-t]').length, document.querySelectorAll('[data-lc96-pick]').length > 0]"))
    pg.evaluate("""(() => { const s = (k, v) => { const t = document.querySelector('[data-lc96-t="' + k + '"]'); t.value = v; };
      s('intro', 'MSPC is how I went from 355 to 2105.'); s('step-M', 'Start with their last move.'); s('use', 'I run it on every move.'); })(); undefined""")
    pg.evaluate("document.querySelector('[data-lc96=\"write\"]').click()"); pg.wait_for_timeout(500)
    pg.evaluate("(() => { const f = document.querySelector('[data-lc96w]'); f.querySelector('[data-w=\"M\"]').value = 'Their pawn left the king.'; f.querySelector('[data-w=\"move\"]').value = 'The knight takes and forks.'; f.requestSubmit(); })(); undefined"); pg.wait_for_timeout(400)
    pg.evaluate("document.querySelector('[data-lc96=\"save\"]').click()"); pg.wait_for_timeout(1200)
    sv = ST['saved'][-1] if ST['saved'] else {}
    v = sv.get('p_v', {})
    out('published [key, intro, M, use, first example comments]', [sv.get('p_k'), v.get('intro', {}).get('t'), v.get('steps', {}).get('M', {}).get('t'), v.get('use', {}).get('t'), (v.get('examples') or [{}])[0].get('M', {}).get('t'), (v.get('examples') or [{}])[0].get('move', {}).get('t')])
    c.close()
    # C. a player sees Kyenzo's words
    def _fnv(t):
        h = 2166136261
        for ch in t: h ^= ord(ch); h = (h * 16777619) & 0xffffffff
        return format(h, 'x')
    c = ctx(br); pg = c.new_page(); watch(pg, 'reader')
    c.route('**/assets/audio/mspc/index.json', lambda r: r.fulfill(status=200, content_type='application/json', body=_j.dumps({'intro': {'h': _fnv('MSPC is how I went from 355 to 2105.'), 'file': 'intro.mp3'}, 'step-M': {'h': 'deadbeef', 'file': 'step-M.mp3'}})))
    pg.goto('http://127.0.0.1:8765/app.html#home'); pg.wait_for_timeout(2000); pg.evaluate("location.hash = '#learn-mspc'"); pg.wait_for_timeout(2500)
    out('player reads [intro, M text, How I use it shown, How you use it hidden]', pg.evaluate("[document.querySelector('.lc96-hd').innerText.indexOf('MSPC is how I went from 355 to 2105.') >= 0, document.querySelector('.lc96-step').innerText.indexOf('Start with their last move.') >= 0, document.querySelectorAll('.lc96-sec').length]"))
    out('Coach Lanckriet audio [intro clip plays, an old clip for a changed text does not, page and script agree on the fingerprint]', pg.evaluate("[(document.querySelector('.lc96-hd [data-lc96-play]') || {}).getAttribute ? document.querySelector('.lc96-hd [data-lc96-play]').getAttribute('data-lc96-play') : '', !document.querySelector('.lc96-step [data-lc96-play]'), LC96._t.fnv('a')]"))
    pg.evaluate("document.querySelector('[data-lc96-open]').click()"); pg.wait_for_timeout(1500)
    pg.evaluate("document.querySelector('[data-lc96=\"next\"]').click()"); pg.wait_for_timeout(400)
    out('example step M [Kyenzo first, then the board]', pg.evaluate("(() => { const li = document.querySelector('.lc96-wk'); return [li.innerText.indexOf('Their pawn left the king.') >= 0, !!li.querySelector('.lc93')]; })()"))
    c.close()
    br.close()
bad = [e for e in errs if 'PAGEERROR' in e or 'lc96' in e.lower() or 'lc95' in e.lower()]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
