# lc109 (9.79.0): short links that fill in a player (ManyChat).
# 1. l.html reads the player from the link: /c/<name>, /lc/<name>, /<name>, ?u=, a profile address, ?elo=; an unfilled field is ignored.
# 2. /l/<code>/c/<name>?elo= on a "review" link opens /app.html?src=&u=&site=chesscom&elo= (the review of the last lost game).
# 3. Either without c/ or lc/: the page asks Chess.com and Lichess (here Lichess knows the name) and tells the server the site it found.
# 4. A "landing" link: the landing page fills the name into the quick start. 5. A link that does not fill in, and an empty ManyChat field.
# 6. Owner: Analytics > New short link with "Fill in a player", the ManyChat sheet with the addresses, People + CSV, Start; phone width.
import json as _json
SB = 'https://wllljllajadiwjdsageu.supabase.co'
BASE = 'http://127.0.0.1:8765'
LHTML = open(REPO + '/l.html', encoding='utf-8').read()
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
def lpage(br, cfg, chess_ok=True, lichess_ok=False):
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc109-l'); calls = []; box = {'app': None}
    pg.route(BASE + '/l/**', lambda r: r.fulfill(status=200, content_type='text/html', body=LHTML))
    def rpc(r):
        b = _json.loads(r.request.post_data or '{}'); calls.append(b)
        r.fulfill(status=200, content_type='application/json', body=_json.dumps(cfg))
    pg.route(SB + '/rest/v1/rpc/lc73_link_open', rpc)
    pg.route('https://api.chess.com/**', lambda r: r.fulfill(status=200 if chess_ok else 404, content_type='application/json', body='{}', headers={'Access-Control-Allow-Origin': '*'}))
    pg.route('https://lichess.org/**', lambda r: r.fulfill(status=200 if lichess_ok else 404, content_type='application/json', body='{}', headers={'Access-Control-Allow-Origin': '*'}))
    def dest(r):
        box['app'] = r.request.url.replace(BASE, ''); r.fulfill(status=200, content_type='text/html', body='<p>dest</p>')
    pg.route(BASE + '/app.html*', dest)
    return c, pg, calls, box
def follow(pg, box, path):
    box['app'] = None; pg.goto(BASE + path); pg.wait_for_timeout(900)
    for _ in range(30):
        if box['app'] or '/l/' not in pg.url: break
        pg.wait_for_timeout(150)
    return box['app'] or pg.url.replace(BASE, '')
REVIEW = {'ok': True, 'dest': '/', 'code': 'igm', 'platform': 'instagram', 'fill': 'either', 'fill_elo': True, 'fill_dest': 'review'}
with sync_playwright() as p:
    br = p.chromium.launch()
    # 1. the parser
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc109-parse'); pg.add_init_script('window.__lcLinkTest = true')
    pg.route(BASE + '/l/**', lambda r: r.fulfill(status=200, content_type='text/html', body=LHTML)); pg.goto(BASE + '/l/igm')
    cases = [['/l/igm/c/MagnusCarlsen', ''], ['/l/igm/lc/DrNykterstein', ''], ['/l/IGM/hikaru', '?elo=1350'], ['/l/igm', '?u=anna_b&site=lichess'],
             ['/l/igm/c/' + 'https%3A%2F%2Fwww.chess.com%2Fmember%2FGothamChess', ''], ['/l/igm/lichess.org/@/penguingim1', ''], ['/l/igm/c/%7B%7Busername%7D%7D', ''], ['/l/igm/c/', ''], ['/l/igm/USERNAME', '?elo=99999']]
    out('1. parse [name, site, elo] per link', pg.evaluate("cs => cs.map(x => { const r = window.__lcLinkParse(x[0], x[1]); return [r.code, r.name, r.site, r.elo]; })", cases))
    c.close()
    # 2. a review link with a Chess.com name and a rating
    c, pg, calls, box = lpage(br, REVIEW)
    out('2. /l/igm/c/MagnusCarlsen?elo=1350 [opens, sent to the server]', [follow(pg, box, '/l/igm/c/MagnusCarlsen?elo=1350'), [calls[0].get(k) for k in ('p_code', 'p_name', 'p_site', 'p_elo')], len(calls)])
    # 3. Either, no c/ or lc/: Lichess knows the name
    c.close(); c, pg, calls, box = lpage(br, REVIEW, chess_ok=False, lichess_ok=True)
    out('3. /l/igm/DrNykterstein, only Lichess knows it [opens, calls, site sent the second time]', [follow(pg, box, '/l/igm/DrNykterstein'), len(calls), calls[-1].get('p_site')])
    # 4. a landing link: the quick start is filled in
    c.close(); c, pg, calls, box = lpage(br, dict(REVIEW, fill='lichess', fill_dest='landing', fill_elo=False))
    land = follow(pg, box, '/l/igm/DrNykterstein?elo=1800')
    pg.wait_for_timeout(1500)
    out('4. landing link [address, quick start filled in, site, message]', [land, pg.evaluate("(document.querySelector('#lc94-qs input[name=u]') || {}).value"), pg.evaluate("(document.querySelector('#lc94-qs input[name=u]') || {}).placeholder"), pg.evaluate("(document.querySelector('#lc94-qs [data-qs-msg]') || {}).textContent")])
    # 5. no fill-in on the link / an unfilled ManyChat field
    c.close(); c, pg, calls, box = lpage(br, {'ok': True, 'dest': '/app.html#upgrades', 'code': 'plain', 'fill': '', 'fill_elo': False, 'fill_dest': 'review'})
    a = follow(pg, box, '/l/plain/c/hikaru')
    c.close(); c, pg, calls, box = lpage(br, REVIEW)
    b = follow(pg, box, '/l/igm/c/%7B%7Busername%7D%7D')
    out('5. normal link with a name / unfilled field [opens]', [a, b])
    c.close()
    # 6. the owner's Analytics page
    box = {'links': [{'code': 'igb', 'platform': 'instagram', 'label': 'Instagram bio', 'active': True, 'clicks': 4, 'visits': 3, 'installs': 1, 'signups': 0, 'paying': 0},
                     {'code': 'old', 'platform': 'facebook', 'label': 'Old', 'active': False, 'clicks': 0, 'visits': 0, 'installs': 0, 'signups': 0, 'paying': 0}],
           'fill': {'igb': {'code': 'igb', 'fill': '', 'fill_on': False, 'fill_elo': False, 'fill_dest': 'review', 'named': 0, 'active': True}}}
    calls = []
    def rpc(route, request):
        n = request.url.split('/rpc/')[1].split('?')[0]; body = _json.loads(request.post_data or '{}'); calls.append([n, body])
        J = lambda o: route.fulfill(status=200, content_type='application/json', body=_json.dumps(o))
        if n == 'lc73_dash': return J({'ok': True, 'admin': True, 'links': box['links'], 'sources': {}, 'views': [], 'partners': [], 'funnel': {}, 'kpis': {}})
        if n == 'lc75_funnel': return J({'ok': True, 'admin': True, 'rows': {'all': {}}, 'kpis': {}, 'channels': [], 'range': {'days': 30}})
        if n == 'lc94_report': return J([])
        if n == 'lc109_links': return J({'ok': True, 'links': list(box['fill'].values())})
        if n == 'lc73_link_save':
            pp = body['p']; box['links'].insert(0, {'code': pp['code'], 'platform': pp['platform'], 'label': pp['label'], 'active': True, 'clicks': 0, 'visits': 0, 'installs': 0, 'signups': 0, 'paying': 0})
            box['fill'][pp['code']] = {'code': pp['code'], 'fill': '', 'fill_on': False, 'fill_elo': False, 'fill_dest': 'review', 'named': 0, 'active': True}; return J({'ok': True, 'code': pp['code']})
        if n == 'lc109_link_set':
            f = box['fill'].setdefault(body['p_code'], {'code': body['p_code'], 'fill': '', 'fill_on': False, 'fill_elo': False, 'fill_dest': 'review', 'named': 0, 'active': True}); f.update(body['p'])
            for l in box['links']:
                if l['code'] == body['p_code'] and 'active' in body['p']: l['active'] = body['p']['active']
            if body['p_code'] == 'igm': f['named'] = 2
            return J(dict(f, ok=True))
        if n == 'lc109_people': return J({'ok': True, 'code': body['p_code'], 'rows': [{'name': 'MagnusCarlsen', 'site': 'chesscom', 'elo': 1350, 'clicks': 2, 'first': '2026-11-27 18:00', 'last': '2026-11-27 18:05'}, {'name': 'DrNykterstein', 'site': 'lichess', 'elo': None, 'clicks': 1, 'first': '2026-11-27 18:10', 'last': '2026-11-27 18:10'}]})
        return J({'ok': False, 'error': 'stub'})
    for w, hh, mob, tag in [(1280, 800, False, 'desktop'), (390, 844, True, 'phone')]:
        c = mkctx(br, w, hh, mob); c.grant_permissions(['clipboard-read', 'clipboard-write'], origin=BASE); pg = c.new_page(); watch(pg, 'lc109-' + tag)
        pg.route(SB + '/rest/v1/rpc/**', rpc)
        pg.goto(BASE + '/version.json'); pg.evaluate(OWNER); pg.goto(BASE + '/app.html#analytics'); pg.wait_for_timeout(2500)
        pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
        pg.wait_for_selector('[data-lc73-link] select[name=fill]', state='attached', timeout=15000); pg.wait_for_timeout(500)
        if tag == 'desktop':
            out('6. New short link form [ManyChat DM type, fill-in choices, opens choices]', pg.evaluate("""(() => { const f = document.querySelector('[data-lc73-link]'); return [!!f && [...f.elements.ty.options].some(o => o.text === 'ManyChat DM'),
                f && [...f.elements.fill.options].map(o => o.value), f && [...f.elements.fdest.options].map(o => o.value)]; })()"""))
            pg.evaluate("""(() => { const f = document.querySelector('[data-lc73-link]'); f.elements.pl.value = 'instagram'; f.elements.ty.value = 'm'; f.elements.code.value = 'igm'; f.elements.label.value = 'ManyChat IG';
                f.elements.fill.value = 'either'; f.elements.felo.checked = true; f.requestSubmit(); })()"""); pg.wait_for_timeout(1500)
            set_ = [x[1] for x in calls if x[0] == 'lc109_link_set']
            out('6b. created [fill-in saved, ManyChat sheet open, addresses]', [set_[-1] if set_ else None, pg.evaluate("!!document.querySelector('.lc73-sheet [data-lc109-set]')"),
                pg.evaluate("[...document.querySelectorAll('.lc73-sheet .lc109-urls code')].map(c => c.textContent)")])
            pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(400)
            out('6c. the link row [fill line, buttons]', pg.evaluate("""(() => { const r = [...document.querySelectorAll('.lc73-t tr')].find(t => t.textContent.includes('/l/igm')); return r ? [(r.querySelector('.lc109-fill') || {}).textContent, [...r.querySelectorAll('button')].map(b => b.textContent)] : null; })()"""))
            pg.evaluate("[...document.querySelectorAll('.lc73-t tr')].find(t => t.textContent.includes('/l/igm')).querySelector('[data-lc73=people]').click()"); pg.wait_for_timeout(800)
            out('6d. People [rows, profile link, CSV button]', [pg.evaluate("document.querySelectorAll('.lc73-sheet tbody tr').length"), pg.evaluate("(document.querySelector('.lc73-sheet tbody a') || {}).href"), pg.evaluate("!!document.querySelector('.lc73-sheet [data-lc109-csv]')")])
            with pg.expect_download() as dl: pg.click('.lc73-sheet [data-lc109-csv]')
            out('6e. CSV [file, header + rows]', [dl.value.suggested_filename, len(open(dl.value.path(), encoding='utf-8').read().strip().splitlines())])
            pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
            pg.evaluate("[...document.querySelectorAll('.lc73-t tr')].find(t => t.textContent.includes('/l/old')).querySelector('[data-lc73=link-on]').click()"); pg.wait_for_timeout(900)
            out('6f. Start a stopped link [sent, row active]', [[x[1] for x in calls if x[0] == 'lc109_link_set'][-1], pg.evaluate("!([...document.querySelectorAll('.lc73-t tr')].find(t => t.textContent.includes('/l/old')) || {classList: {contains: () => true}}).classList.contains('is-off')")])
        else:
            pg.evaluate("[...document.querySelectorAll('.lc73-t tr')].find(t => t.textContent.includes('/l/igm')).querySelector('[data-lc73=fill]').click()"); pg.wait_for_timeout(800)
            out('7. phone [ManyChat sheet open, page overflow-x, sheet overflow-x]', [pg.evaluate("!!document.querySelector('.lc73-sheet [data-lc109-set]')"), pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth"),
                pg.evaluate("(() => { const s = document.querySelector('.lc73-sheet'); return s ? Math.max(0, s.scrollWidth - s.clientWidth) : -1; })()")])
        c.close()
    app_ = open(REPO + '/app.html', encoding='utf-8').read(); idx = open(REPO + '/index.html', encoding='utf-8').read()
    m73 = open(REPO + '/lc73.js', encoding='utf-8').read(); m94 = open(REPO + '/lc94.js', encoding='utf-8').read()
    out('8. build [lc73 inline, lc94 inline in both pages, vercel rewrite for /l/code/...]', [m73.strip() in app_, m94.strip() in app_ and m94.strip() in idx, '/l/:code/:rest*' in open(REPO + '/vercel.json').read()])
    br.close()
bad = [e for e in errs if ('PAGEERROR' in e or 'console' in e) and 'Failed to load' not in e and 'net::' not in e]; print('ERRORS', len(bad)); [print(e[:300]) for e in bad[:12]]
