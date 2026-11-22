# lc100 (9.65.0): the withdrawal function and the consent step before every Payment Link (legal review), Kyenzo's games in Theory /
# Trim / Ranked, the students' game opt-in, the community auto-join and the giveaway end date.
# Real Chromium, 390x844 (and 1280x800 for the withdrawal page), Supabase, the Stripe function and the master-data positions file stubbed.
import json as _json, copy as _copy
APP = 'http://127.0.0.1:8765/app.html'
SB = 'https://wllljllajadiwjdsageu.supabase.co'
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
MEMBER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'm', refresh_token: '', exp: Date.now() + 36e5, email: 'anna@example.com' }))"
OLD = "localStorage.setItem('lc34-first', JSON.stringify(Date.now() - 20 * 864e5))"
PRICING = {'ok': True, 'tier': 2, 'tranche': 1, 'left': [37, 100, 100], 'sold': [63, 0, 0], 'caps': [100, 100, 100], 'yearly': [19950, 29925, 35910, 39900], 'base': 39900, 'monthly': 3900,
           'discountPct': [50, 25, 10], 'vip': {'ok': True, 'tier': 3, 'tranche': 1, 'left': [100, 100, 100], 'yearly': [29950, 44925, 53910, 59900], 'base': 59900, 'monthly': 5900, 'discountPct': [50, 25, 10]}}
E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
PZ = [{'id': 'p1', 'game_id': '111111111', 'kind': 'brilliant', 'fen': 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', 'side': 'w', 'played': 'g1f3', 'best': 'g1f3',
       'solution': ['g1f3'], 'line': ['g1f3'], 'prev': 'e7e5', 'prev_fen': E4, 'tier': '1600-1999', 'eco': 'C20', 'phase': 'middlegame', 'tags': [], 'featured': False,
       'my_rating': 1850, 'opp_rating': 1900, 'time_class': 'rapid', 'end_time': '2026-03-01T10:00:00Z', 'opening': 'King’s Pawn', 'result': 'win', 'url': 'https://www.chess.com/game/live/111111111'}]
GAMES = [{'id': '222222222', 'url': 'https://www.chess.com/game/live/222222222', 'end_time': '2026-04-01T10:00:00Z', 'time_class': 'blitz', 'color': 'w', 'my_rating': 1500, 'opp_rating': 2000,
          'tier': '1200-1599', 'result': 'win', 'termination': 'resigned', 'eco': 'D02', 'opening': 'Colle System', 'plies': 60, 'acc_me': 97.5, 'acc_opp': 80, 'brilliant': 1, 'great': 2, 'blunder': 0, 'mistake': 0, 'gap': 500}]
MOVES = {'id': '222222222', 'url': 'https://www.chess.com/game/live/222222222', 'color': 'w', 'my_rating': 1500, 'opp_rating': 2000, 'result': 'win', 'time_class': 'blitz', 'opening': 'Colle System',
         'acc_me': 97.5, 'end_time': '2026-04-01T10:00:00Z', 'moves': '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0'}
WD = [{'id': 7, 'created_at': '2026-11-23T10:15:00Z', 'refund_by': '2026-12-07T10:15:00Z', 'email': 'anna@example.com', 'name': 'Anna Peeters', 'contract': 'pro_monthly', 'note': 'Not for me',
       'account': 'anna@example.com', 'device': 'd', 'mailed': True, 'status': 'received', 'handled_at': None, 'handled_note': ''}]
def stub(pg, calls, box):
    def rpc(route, request):
        n = request.url.split('/rpc/')[1].split('?')[0]; body = _json.loads(request.post_data or '{}'); calls.append([n, body])
        J = lambda o, st=200: route.fulfill(status=st, content_type='application/json', body=_json.dumps(o))
        if n == 'lc100_consent_note': return J({'ok': True})
        if n == 'lc100_admin_withdrawals': return J({'ok': True, 'rows': WD})
        if n == 'lc100_admin_withdrawal_set': return J({'ok': True})
        if n == 'lc99_admin_consents': return J({'ok': True, 'rows': []})
        if n == 'mg_gems': return J(PZ if body.get('p_kind') in ('brilliant', 'great') else GAMES)
        if n == 'mg_game_moves': return J(MOVES)
        if n == 'mg_puzzles': return J(PZ)
        if n == 'mg_by_ids': return J(PZ)
        if n in ('mg_tiers', 'mg_openings', 'mg_daily'): return J([])
        if n == 'lc100_join_main': return J({'ok': True, 'joined': True})
        if n == 'lc100_contrib_get': return J(box['contrib'])
        if n == 'lc100_contrib_set': box['contrib'] = dict(box['contrib'], enabled=bool(body.get('p_on')), chesscom=body.get('p_chesscom'), lichess=body.get('p_lichess'), opted_in_at='2026-11-23T10:00:00Z'); return J({'ok': True})
        if n == 'lc100_admin_contrib': return J({'ok': True, 'rows': [{'email': 'pay@x.be', 'enabled': True, 'chesscom': 'Good_Name', 'lichess': '', 'opted_in_at': '2026-11-23T10:00:00Z', 'revoked_at': None, 'ingested_at': None, 'paying': True},
                                                                       {'email': 'gone@x.be', 'enabled': False, 'chesscom': '', 'lichess': '', 'opted_in_at': None, 'revoked_at': '2026-11-23T11:00:00Z', 'ingested_at': '2026-11-20T10:00:00Z', 'paying': False}]})
        if n == 'lc89_cfg_public': return J({'ok': True, 'k': body.get('p_k'), 'v': {'on': True, 'trial_days': 7, 'use_live': True} if body.get('p_k') == 'paywall' else {}})
        if n == 'lc97_state': return J({'ok': True, 'signed_in': True, 'sub_status': 'free', 'trial_eligible': True, 'trial': {'used': False}, 'post_trial': {}, 'discount': {}, 'tokens': {}})
        return J({'ok': False, 'error': 'stub'})
    def fn(route, request):
        path = request.url.split('/functions/v1/stripe/')[1].split('?')[0]; body = _json.loads(request.post_data or '{}'); calls.append(['stripe/' + path, body])
        J = lambda o, st=200: route.fulfill(status=st, content_type='application/json', body=_json.dumps(o))
        if path == 'pricing': return J(PRICING)
        if path == 'withdraw': return J({'ok': True, 'id': 7, 'ref': 'W7', 'at': '2026-11-23T10:15:00Z', 'mailed': False, 'text': 'We received your withdrawal.\n\nStatement: I withdraw from my contract for "Pro, monthly".\nReference: W7'})
        return J({}, 404)
    pg.route(SB + '/rest/v1/rpc/**', rpc)
    pg.route(SB + '/functions/v1/stripe/**', fn)
    pg.route('https://buy.stripe.com/**', lambda r: r.fulfill(status=200, content_type='text/html', body='<title>Stripe link</title>link'))
    pg.route('https://cdn.jsdelivr.net/gh/lanckrietchess/**', lambda r: r.fulfill(status=200, content_type='application/json', body=_json.dumps(box['pos'])))
    pg.route('https://raw.githubusercontent.com/lanckrietchess/**', lambda r: r.fulfill(status=200, content_type='application/json', body=_json.dumps(box['pos'])))
def fresh(br, w, hh, mob, tag, who=MEMBER, hash='#home', contrib=None, pos=None):
    calls = []; box = {'contrib': contrib or {'ok': True, 'paying': False, 'enabled': False, 'chesscom': '', 'lichess': ''}, 'pos': pos or {'v': 1, 'pos': {}}}
    c = mkctx(br, w, hh, mob); pg = c.new_page(); watch(pg, 'lc100-' + tag); stub(pg, calls, box)
    pg.goto('http://127.0.0.1:8765/version.json')
    if who: pg.evaluate(who)
    pg.evaluate(OLD)
    pg.goto(APP + hash); pg.wait_for_timeout(2400)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(400)
    return c, pg, calls, box
tap = lambda pg, js, ms=650: (pg.evaluate(js), pg.wait_for_timeout(ms))
OVER = "Math.max(0, document.documentElement.scrollWidth - innerWidth)"
CF = "document.querySelector('.lc99-cf-sheet')"
with sync_playwright() as p:
    br = p.chromium.launch()
    # ---------- the withdrawal function (#withdraw), signed out ----------
    for w, hh, mob, tag in [(390, 844, True, 'phone'), (1280, 800, False, 'desktop')]:
        c, pg, calls, box = fresh(br, w, hh, mob, 'wd-' + tag, who=None, hash='#withdraw')
        pg.evaluate("location.hash = '#withdraw'"); pg.wait_for_timeout(900)
        pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
        out(tag + ' withdraw page [h1, fields, contract options]', pg.evaluate("(() => { const f = document.querySelector('[data-lc99-wdf]'); return [document.querySelector('.lc99-wd h1').textContent, !!f.name && !!f.email && !!f.contract && !!f.note, f.contract.options.length]; })()"))
        tap(pg, "document.querySelector('[data-lc99-wdf] button[type=submit]').click()", 300)
        out(tag + ' empty form [message, no call]', [pg.evaluate("document.querySelector('[data-lc99-wdmsg]').textContent"), not any(x[0] == 'stripe/withdraw' for x in calls)])
        pg.fill('[data-lc99-wdf] [name=name]', 'Anna Peeters'); pg.fill('[data-lc99-wdf] [name=email]', 'Anna@Example.com'); pg.select_option('[data-lc99-wdf] [name=contract]', 'pro_monthly')
        tap(pg, "document.querySelector('[data-lc99-wdf] button[type=submit]').click()", 400)
        out(tag + ' check step [form hidden, summary, one confirm button]', pg.evaluate("[document.querySelector('[data-lc99-wdf]').hidden, [...document.querySelectorAll('.lc99-wdc li')].map(l => l.textContent), document.querySelector('[data-lc99-wdgo]').textContent]"))
        out(tag + ' withdraw layout [overflow-x, confirm >= 44px]', pg.evaluate("[" + OVER + ", document.querySelector('[data-lc99-wdgo]').getBoundingClientRect().height >= 44]"))
        tap(pg, "document.querySelector('[data-lc99-wdgo]').click()", 1200)
        wdc = [x[1] for x in calls if x[0] == 'stripe/withdraw']
        out(tag + ' sent [confirm true, name, lower-case e-mail, contract]', [bool(wdc) and wdc[0].get('confirm') is True, wdc[0].get('name') if wdc else None, wdc[0].get('email') if wdc else None, wdc[0].get('contract') if wdc else None])
        out(tag + ' received [heading, reference, acknowledgement, download + mail buttons]', pg.evaluate("[document.querySelector('.lc99-wdc.is-done h2').textContent.trim(), /W7/.test(document.querySelector('.lc99-wdc.is-done').textContent), document.querySelector('[data-lc99-ack]').textContent.startsWith('We received your withdrawal.'), !!document.querySelector('[data-lc99-wddl]'), /^mailto:anna@example\\.com/.test(document.querySelector('.lc99-wdc.is-done a.btn').getAttribute('href'))]"))
        pg.screenshot(path=SHOTS + '/lc100-withdraw-' + tag + '.png')
        c.close()
    # ---------- the consent step before a Payment Link: VIP monthly, back = nothing, then pay ----------
    c, pg, calls, box = fresh(br, 390, 844, True, 'cf-vip', hash='#upgrades')
    pg.evaluate("window.__r = 'x'; void LC44.checkout('monthly', 3).then(v => { window.__r = v })"); pg.wait_for_timeout(1500)
    out('VIP monthly confirm [title, price, terms, box unchecked, pay off]', pg.evaluate("(() => { const s = " + CF + "; return [s.closest('.sheet').querySelector('.sheet-head h2').textContent, s.querySelector('.lc99-price').textContent, [...s.querySelectorAll('.lc99-terms li')].map(l => l.textContent), s.querySelector('[data-lc99-cfok]').checked, s.querySelector('[data-lc99-cfpay]').disabled]; })()"))
    out('VIP monthly wording', pg.evaluate(CF + ".querySelector('.lc99-ok span').textContent"))
    out('confirm layout [overflow-x, box >= 44px, pay >= 44px]', pg.evaluate("[" + OVER + ", " + CF + ".querySelector('.lc99-ok').getBoundingClientRect().height >= 44, " + CF + ".querySelector('[data-lc99-cfpay]').getBoundingClientRect().height >= 44]"))
    pg.screenshot(path=SHOTS + '/lc100-confirm-vip.png')
    tap(pg, CF + ".closest('.sheet').querySelector('[data-close]').click()", 800)
    out('Back [no checkout, resolved false, nothing logged]', [pg.evaluate("location.host"), pg.evaluate("window.__r"), not any(x[0] == 'lc100_consent_note' for x in calls)])
    pg.evaluate("void LC44.checkout('monthly', 3)"); pg.wait_for_timeout(1500)
    tap(pg, CF + ".querySelector('[data-lc99-cfok]').click()"); text = pg.evaluate(CF + ".querySelector('.lc99-ok span').textContent")
    tap(pg, CF + ".querySelector('[data-lc99-cfpay]').click()", 2500)
    nt = [x[1] for x in calls if x[0] == 'lc100_consent_note']
    out('VIP monthly paid [flow, version, exact wording, then the Payment Link]', [nt[0].get('p_flow') if nt else None, nt[0].get('p_version') if nt else None, bool(nt) and nt[0].get('p_wording') == text, pg.evaluate("location.host + location.pathname")])
    c.close()
    # ---------- token pack, as a guest ----------
    c, pg, calls, box = fresh(br, 390, 844, True, 'cf-tok', who=None, hash='#upgrades')
    pg.evaluate("void LC44.shop()"); pg.wait_for_timeout(800)
    pg.fill('.lc44-sheet input[name=email]', 'guest@example.com')
    tap(pg, "document.querySelector('[data-lc44-pack=\"t100\"]').click()", 1500)
    out('token pack confirm [title, price, terms, wording]', pg.evaluate("(() => { const s = " + CF + "; return [s.closest('.sheet').querySelector('.sheet-head h2').textContent, s.querySelector('.lc99-price').textContent, [...s.querySelectorAll('.lc99-terms li')].map(l => l.textContent), s.querySelector('.lc99-ok span').textContent]; })()"))
    tap(pg, CF + ".querySelector('[data-lc99-cfok]').click()"); tap(pg, CF + ".querySelector('[data-lc99-cfpay]').click()", 2500)
    nt = [x[1] for x in calls if x[0] == 'lc100_consent_note']
    out('token pack paid [flow, guest e-mail, then the Payment Link with the e-mail]', [nt[0].get('p_flow') if nt else None, nt[0].get('p_email') if nt else None, pg.evaluate("location.host + location.search")])
    c.close()
    # ---------- LC90: "Skip the trial: pay now" and VIP go through the same step ----------
    c, pg, calls, box = fresh(br, 390, 844, True, 'cf-90', hash='#upgrades')
    pg.evaluate("void LC90.open({from: 'upgrades'})"); pg.wait_for_timeout(1800)
    tap(pg, "document.querySelector('.lc90-sheet [data-lc90=\"buy\"]').click()", 1800)
    out('LC90 pay now [the trial sheet closed, the consent step opened: Pro yearly]', pg.evaluate("[!document.querySelector('.lc90-sheet'), !!" + CF + " && " + CF + ".closest('.sheet').querySelector('.sheet-head h2').textContent]"))
    tap(pg, CF + ".closest('.sheet').querySelector('[data-close]').click()", 600)
    pg.evaluate("void LC90.open({from: 'upgrades'})"); pg.wait_for_timeout(1800)
    tap(pg, "document.querySelector('.lc90-sheet input[name=lc90-tier][value=vip]').click()", 400)
    tap(pg, "document.querySelector('.lc90-sheet [data-lc90=\"vip\"]').click()", 1800)
    out('LC90 VIP [the consent step: VIP yearly, price]', pg.evaluate("!!" + CF + " && [" + CF + ".closest('.sheet').querySelector('.sheet-head h2').textContent, " + CF + ".querySelector('.lc99-price').textContent]"))
    c.close()
    # ---------- links to the withdrawal page ----------
    c, pg, calls, box = fresh(br, 390, 844, True, 'links', hash='#upgrades')
    pg.wait_for_timeout(1500)
    out('Upgrades page link', pg.evaluate("(document.querySelector('[data-lc99-wdlink] a') || {}).textContent || ''"))
    c.close()
    land = open(REPO + '/index.html', encoding='utf-8').read()
    out('landing footer link [outside the CMS, to #withdraw]', ['<p class="lc-withdraw"><a href="/app.html#withdraw">Withdraw from contract here</a>' in land, 'data-cms' not in land.split('<p class="lc-withdraw">')[1].split('</p>')[0]])
    # ---------- owner: withdrawal statements ----------
    c, pg, calls, box = fresh(br, 1280, 800, False, 'own-wd', who=OWNER, hash='#consents')
    pg.evaluate("location.hash = '#consents'"); pg.wait_for_timeout(1500)
    out('owner statements [title, badge, row, refund by]', pg.evaluate("[document.querySelector('.lc99-log h1').textContent, (document.querySelector('[data-lc99-wd] .lc99-badge') || {}).textContent, /W7 · Anna Peeters/.test(document.querySelector('[data-wid=\"7\"]').textContent), /refund by 7 Dec/.test(document.querySelector('[data-wid=\"7\"]').textContent)]"))
    pg.select_option('[data-wid="7"] [data-wst]', 'refunded'); pg.fill('[data-wid="7"] [data-wnote]', 're_123')
    tap(pg, "document.querySelector('[data-wid=\"7\"] [data-lc99s=\"wsave\"]').click()", 800)
    st = [x[1] for x in calls if x[0] == 'lc100_admin_withdrawal_set']
    out('owner save [id, status, note]', [st[0].get('p_id'), st[0].get('p_status'), st[0].get('p_note')] if st else None)
    c.close()
    # ---------- Theory: the opening chip and a replayed game ----------
    import sys as _sys; _sys.path.insert(0, REPO + '/tools'); import master_positions as _mp
    key = _mp.key_of(E4)
    c, pg, calls, box = fresh(br, 390, 844, True, 'chip', who=OWNER, hash='#openings', pos={'v': 1, 'pos': {key: [37, 20, 4, 13, ['222222222'], [['e5', 21], ['c5', 9]]]}})
    out('the app and the tool agree on the key', pg.evaluate("LC100._t.keyOf('" + E4 + "')") == key)
    pg.evaluate("(() => { const v = document.querySelector('#view'), d = document.createElement('div'); d.id = 'lc100-host'; d.style.width = '320px'; v.appendChild(d); window.__b = Board(d, {}); window.__b.setPosition('" + E4 + "', {animate: false}); })()")
    pg.wait_for_timeout(900)
    out('opening chip [count, score, next moves, game button]', pg.evaluate("(() => { const ch = document.querySelector('#lc100-host + [data-lc100-chip]'); return ch ? [ch.querySelector('b').textContent.trim(), ch.querySelector('span').textContent, ch.querySelector('.small').textContent, !!ch.querySelector('[data-lc100-game]')] : null; })()"))
    pg.evaluate("window.__b.setPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', {animate: false})"); pg.wait_for_timeout(600)
    out('start position: no chip', pg.evaluate("document.querySelector('#lc100-host + [data-lc100-chip]').hidden"))
    pg.evaluate("window.__b.setPosition('" + E4 + "', {animate: false})"); pg.wait_for_timeout(600)
    tap(pg, "document.querySelector('#lc100-host + [data-lc100-chip] [data-lc100-game]').click()", 1500)
    out('replay [sheet title, meta, moves, opened at the position, no chip inside]', pg.evaluate("(() => { const s = document.querySelector('.lc100-sheet'); return s ? [s.querySelector('.sheet-head h2').textContent, s.querySelector('.lc100-gm .small').textContent, s.querySelectorAll('[data-lc100-moves] button').length, s.querySelector('[data-lc100-ply]').textContent, !s.querySelector('[data-lc100-chip]')] : null; })()"))
    tap(pg, "document.querySelector('.lc100-sheet [data-lc100-n=\"next\"]').click()", 400)
    out('replay next [move counter, highlighted move]', pg.evaluate("[document.querySelector('.lc100-sheet span[data-lc100-ply]').textContent, document.querySelector('.lc100-sheet [data-lc100-moves] button.is-on').textContent]"))
    out('replay layout [overflow-x, nav >= 44px]', pg.evaluate("[" + OVER + ", document.querySelector('.lc100-sheet [data-lc100-n=\"next\"]').getBoundingClientRect().height >= 44]"))
    pg.screenshot(path=SHOTS + '/lc100-replay.png')
    c.close()
    # ---------- Middlegame card, Kyenzo's Gems, the trainer with ids ----------
    c, pg, calls, box = fresh(br, 390, 844, True, 'mg', who=OWNER, hash='#middlegame')
    pg.wait_for_timeout(1500)
    out('middlegame card [title, intent]', pg.evaluate("(() => { const a = document.querySelector('[data-lc100-phase]'); return a ? [a.querySelector('b').textContent, a.getAttribute('data-lc100-intent')] : null; })()"))
    pg.evaluate("location.hash = '#kgems'"); pg.wait_for_timeout(1500)
    out('gems page [h1, tabs, first row, buttons]', pg.evaluate("[document.querySelector('.lc100 h1').textContent, [...document.querySelectorAll('[data-lc100-tab]')].map(b => b.textContent), document.querySelector('.lc100-gems li b').textContent, [...document.querySelectorAll('.lc100-gems li .btn')].map(b => b.textContent.trim())]"))
    tap(pg, "document.querySelector('[data-lc100-tab=\"upsets\"]').click()", 900)
    out('gems upsets [row]', pg.evaluate("document.querySelector('.lc100-gems li b').textContent"))
    out('gems layout [overflow-x]', pg.evaluate(OVER))
    pg.screenshot(path=SHOTS + '/lc100-gems.png')
    tap(pg, "document.querySelector('[data-lc100-tab=\"brilliant\"]').click()", 900)
    tap(pg, "document.querySelector('.lc100-gems [data-lc100-intent]').click()", 2200)
    out('Find my move [route, mg_by_ids asked with the ids]', [pg.evaluate("location.hash"), [x[1].get('p_ids') for x in calls if x[0] == 'mg_by_ids'][:1]])
    c.close()
    # ---------- Ranked: one in four from Kyenzo's games ----------
    c, pg, calls, box = fresh(br, 390, 844, True, 'rk', who=OWNER, hash='#puzzles')
    pg.evaluate("localStorage.setItem('lc100-rk', '0'); LC100._t.setPool([LC100._t.toPuzzle(" + _json.dumps(PZ[0]) + ")])")
    got = pg.evaluate("(async () => { localStorage.setItem('lc100-rk', '3'); const p = await PuzzleFeed.next(1900); const n = +localStorage.getItem('lc100-rk'); return [p && p.source, p && p.id, n]; })()")
    out('Ranked feed [every 4th puzzle is Kyenzo\'s: source, id, counter]', got)
    app_ = open(REPO + '/app.html', encoding='utf-8').read()
    out('Ranked label and link [From Kyenzo’s games, Open the game]', ['pz.source==="kyenzo"?"From Kyenzo’s games"' in app_, '(pz.source==="kyenzo"?" Open the game":" Open on Lichess")' in app_])
    c.close()
    # ---------- Account: the community join and the game opt-in ----------
    c, pg, calls, box = fresh(br, 390, 844, True, 'acc-free', hash='#account')
    pg.wait_for_timeout(1800)
    out('community join [called once with the account]', len([x for x in calls if x[0] == 'lc100_join_main']))
    out('opt-in, not paying [title, text, no form]', pg.evaluate("(() => { const b = document.querySelector('[data-lc100-contrib]'); return b ? [b.querySelector('h3').textContent.trim(), b.querySelector('p').textContent, !b.querySelector('[data-lc100-cok]')] : null; })()"))
    out('Account withdraw link', pg.evaluate("(document.querySelector('[data-lc99-wdlink] a') || {}).getAttribute ? document.querySelector('[data-lc99-wdlink] a').getAttribute('href') : ''"))
    pg.evaluate("location.hash = '#home'"); pg.wait_for_timeout(900)
    out('community join [not again on the next page]', len([x for x in calls if x[0] == 'lc100_join_main']))
    c.close()
    c, pg, calls, box = fresh(br, 390, 844, True, 'acc-pay', hash='#account', contrib={'ok': True, 'paying': True, 'enabled': False, 'chesscom': '', 'lichess': ''})
    pg.wait_for_timeout(1800)
    out('opt-in, paying [box unchecked, button off]', pg.evaluate("(() => { const b = document.querySelector('[data-lc100-contrib]'); return [b.querySelector('[data-lc100-cok]').checked, b.querySelector('[data-lc100-c=\"on\"]').disabled, b.querySelector('.lc100-ok span').textContent]; })()"))
    pg.fill('[data-lc100-contrib] [name=cc]', 'Anna_Chess')
    tap(pg, "document.querySelector('[data-lc100-cok]').click()"); tap(pg, "document.querySelector('[data-lc100-c=\"on\"]').click()", 1200)
    cs = [x[1] for x in calls if x[0] == 'lc100_contrib_set']
    out('opt-in saved [on, name, version, wording shown]', [cs[0].get('p_on'), cs[0].get('p_chesscom'), cs[0].get('p_version'), cs[0].get('p_text') == pg.evaluate("LC100._t.OPT")] if cs else None)
    out('opt-in on [title, stop button]', pg.evaluate("[document.querySelector('[data-lc100-contrib] h3').textContent.trim(), !!document.querySelector('[data-lc100-c=\"off\"]')]"))
    tap(pg, "document.querySelector('[data-lc100-c=\"off\"]').click()", 1200)
    cs = [x[1] for x in calls if x[0] == 'lc100_contrib_set']
    out('opt-out [off, names wiped]', [cs[-1].get('p_on'), cs[-1].get('p_chesscom'), cs[-1].get('p_lichess')])
    c.close()
    c, pg, calls, box = fresh(br, 1280, 800, False, 'own-co', who=OWNER, hash='#contrib')
    pg.evaluate("location.hash = '#contrib'"); pg.wait_for_timeout(1500)
    out('owner shared games [h1, headings, rows]', pg.evaluate("[document.querySelector('.lc100 h1').textContent, [...document.querySelectorAll('[data-lc100-co] .lc99-h2')].map(h => h.textContent), document.querySelectorAll('[data-lc100-em]').length]"))
    c.close()
    # ---------- the owner menu: every owner page has its row (9.65.0: the rows were missing) ----------
    c, pg, calls, box = fresh(br, 1280, 800, False, 'menu', who=OWNER, hash='#home')
    pg.wait_for_timeout(1500); pg.evaluate("document.querySelector('#lc49-float').click()"); pg.wait_for_timeout(1500)
    hrefs = pg.evaluate("[...document.querySelectorAll('#lc49-menu a')].map(a => a.getAttribute('href'))")
    out('owner menu rows [seg-videos, lanes, paywall, trial lab, consents, contrib]', [h in hrefs for h in ['#seg-videos', '#lanes', '#paywall-editor', '#trial-lab', '#consents', '#contrib']])
    c.close()
    # ---------- the landing page: the five Elo segments are always above the video ----------
    c = mkctx(br, 1301, 900, False); pg = c.new_page(); watch(pg, 'lc100-land')
    pg.route('**/rest/v1/rpc/**', lambda r: r.fulfill(status=200, content_type='application/json', body='{"ok":false}'))
    pg.goto('http://127.0.0.1:8765/'); pg.wait_for_timeout(2500)
    out('landing segments without any video saved [bar shown, 5 segments, coming soon, MSPC card hidden, no owner link]', pg.evaluate("[!document.getElementById('seg-box').classList.contains('hide'), [...document.querySelectorAll('#seg-bar [data-seg]')].map(b => b.textContent), (document.querySelector('#walk-hero .seg-soon b') || {}).textContent, document.getElementById('coach-card').classList.contains('hide'), !document.getElementById('seg-admin')]"))
    pg.evaluate("window.__lcSegAdmin()")
    out('landing owner link (after the server confirms an admin)', pg.evaluate("document.getElementById('seg-admin').getAttribute('href')"))
    c.close()
    # ---------- the giveaway ends on 9 December ----------
    c, pg, calls, box = fresh(br, 390, 844, True, 'gw', hash='#giveaway')
    pg.evaluate("location.hash = '#giveaway'"); pg.wait_for_timeout(1200)
    out('giveaway page heading', pg.evaluate("(document.querySelector('.lc82-page h1') || {}).textContent || ''"))
    c.close()
    br.close()
app_ = open(REPO + '/app.html', encoding='utf-8').read()
same = [open(REPO + '/' + n + '.js', encoding='utf-8').read().strip() in app_ for n in ('lc100', 'lc99', 'lc95', 'lc44', 'lc79', 'lc82')]
out('LC100 [embedded copies equal lc100 / lc99 / lc95 / lc44 / lc79 / lc82, init + afterRender wired, Board tells its position, no 15-day copy, build]',
    same + ['try{LC100.init()}' in app_, 'LC100.afterRender(route)' in app_, 'dispatchEvent(new CustomEvent("lc-fen"' in app_, 'in 15 days' not in app_ and '15-day ELO' not in app_, __import__('re').search(r'CONFIG=\{version:"([^"]+)"', app_).group(1)])
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
