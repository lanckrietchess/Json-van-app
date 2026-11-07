# lc59land (9.32.0): the landing page in the converting order, the Wall of Love and the ranked Proof Queue. Real Chromium, 390x844, stubbed RPC answers.
import json as _json
CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'content-type': 'application/json'}
PRICING = {"ok": True, "tranche": 1, "left": [37, 100, 100], "caps": [100, 100, 100], "yearly": [19950, 29925, 35910, 39900], "base": 39900, "monthly": 3900, "gift": 39900, "discountPct": 50,
           "vip": {"tranche": 1, "left": [50, 100, 100], "caps": [100, 100, 100], "yearly": [29950, 44925, 53910, 59900], "base": 59900, "monthly": 5900, "discountPct": 50},
           "packs": [{"id": "t3", "tokens": 3, "cents": 100}, {"id": "t100", "tokens": 100, "cents": 1000}, {"id": "t300", "tokens": 300, "cents": 1999}, {"id": "t1000", "tokens": 1000, "cents": 4999}], "portal": ""}
def _page(br, wall=None, legacy=None):
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'land59')
    def h(route, request):
        if request.method == 'OPTIONS': return route.fulfill(status=204, headers=CORS)
        u = request.url
        if '/stripe/pricing' in u: body = PRICING
        elif u.endswith('/rpc/lc59_wall_public'): body = {'ok': True, 'rows': wall or []}
        elif u.endswith('/rpc/lc36_proof_public'): body = {'ok': True, 'rows': legacy or []}
        else: return route.fallback()
        route.fulfill(status=200, headers=CORS, body=_json.dumps(body))
    pg.route('**/stripe/pricing*', h); pg.route('**/rest/v1/rpc/*', h)
    pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(2500)
    return c, pg
ROWS = [{'kind': 3, 'first_name': 'Cleo', 'message': 'Cleo says this trainer finally made me think before every single move.'},
        {'kind': 2, 'first_name': 'Bob', 'site': 'chesscom', 'start': 1000, 'peak': 1300, 'gain': 300, 'days': 40},
        {'kind': 1, 'first_name': 'Dan', 'site': 'lichess', 'start': 1100, 'peak': 1250, 'gain': 150, 'days': 20, 'message': 'Dan wrote that the MSPC routine stopped his random blunders completely.'},
        {'kind': 1, 'first_name': 'Anna', 'site': 'chesscom', 'start': 900, 'peak': 1100, 'gain': 200, 'days': 31, 'message': 'Anna says the Trim review showed her the exact leak she kept repeating.'}]
LEGACY = [{'ref': 'r1', 'first_name': 'Bob', 'site': 'chesscom', 'plan': 'pro', 'start': 1000, 'now': 1250, 'gain': 250, 'joined_at': '2026-10-01T00:00:00Z', 'points': []},
          {'ref': 'r2', 'first_name': 'Eli', 'site': 'chesscom', 'plan': 'free', 'start': 800, 'now': 1200, 'gain': 400, 'joined_at': '2026-10-01T00:00:00Z', 'points': []}]
with sync_playwright() as p:
    br = p.chromium.launch()
    c, pg = _page(br, ROWS, LEGACY)
    order = pg.evaluate("[...document.querySelectorAll('body section[id]')].map(s => s.id)")
    out('section order [video, Wall of Love, Proof Queue, method, price contrast + feature stack, pricing, install, FAQ]', order)
    out('Founding Member banner [moved down into the price contrast, no longer the first thing on the page]', pg.evaluate("(() => { const f = document.getElementById('fm-hero'); return [f.closest('#price-contrast') !== null, document.body.firstElementChild.id !== 'fm-hero', !f.classList.contains('hide')]; })()"))
    names = pg.evaluate("[...document.querySelectorAll('#proof-list .pcard')].map(c => (c.querySelector('.pr-name b, .small b') || {textContent: ''}).textContent + ':' + (c.getAttribute('data-kind') || (c.classList.contains('pr') ? '2' : 'static')))")
    out('Proof Queue ranking [1) message + result by Peak Gain: Anna 200 then Dan 150, 2) results: Eli 400 then Bob 300, 3) message only: Cleo; the owner\'s own cards after the members]', names[:5])
    out('old verified card of Bob is not shown twice', sum(1 for n in names if n.startswith('Bob')) == 1)
    t = pg.evaluate("document.getElementById('proof-list').innerText")
    out('Peak Gain wording [badge, +200 ELO, start to peak, days, quote]', ['peak gain' in t.lower(), '+200 ELO' in t, '900' in t and '1100' in t, 'over 31 days' in t, 'Anna says the Trim review' in t])
    cleo = pg.evaluate("[...document.querySelectorAll('#proof-list .pcard')].filter(c => /Cleo/.test(c.textContent))[0].innerText")
    out('message-only card [no numbers at all]', not any(ch.isdigit() for ch in cleo.replace('Cleo', '')))
    out('Wall of Love order [message + result by Peak Gain first (Anna, Dan), message only last (Cleo)]', pg.evaluate("[...document.querySelectorAll('#love-list figure b')].map(b => b.textContent)"))
    out('Wall of Love [visible, 3 messages, names, gain only where a result exists]', pg.evaluate("(() => { const w = document.getElementById('love'); const f = [...document.querySelectorAll('#love-list figure')]; return [!w.classList.contains('hide'), f.length, f.filter(x => /peak gain/.test(x.textContent)).length]; })()"))
    out('landing phone [no sideways scroll]', pg.evaluate('Math.max(0, document.documentElement.scrollWidth - window.innerWidth)'))
    pg.screenshot(path=SHOTS + '/land59-top.png'); pg.evaluate("document.getElementById('love').scrollIntoView()"); pg.wait_for_timeout(300); pg.screenshot(path=SHOTS + '/land59-love.png')
    pg.evaluate("document.getElementById('price-contrast').scrollIntoView()"); pg.wait_for_timeout(300); pg.screenshot(path=SHOTS + '/land59-stack.png'); c.close()
    # nothing yet: no empty wall, the owner's two cards stay, honest note
    c, pg = _page(br, [], [])
    out('no members yet [Wall of Love hidden, the Founder and Proof of concept cards stay, honest note]', pg.evaluate("[document.getElementById('love').classList.contains('hide'), document.querySelectorAll('#proof-list .pcard').length, /appear here as soon as members allow/.test(document.getElementById('proof-note').textContent)]")); c.close()
    # the stack
    c, pg = _page(br, [], [])
    out('feature stack [18+ ticks in the Lanckriet Chess card against 3 to 4 in each market card]', pg.evaluate("(() => { const hl = document.querySelector('#vs-grid .card.hl'); const others = [...document.querySelectorAll('#vs-grid .card:not(.hl)')]; return [hl.querySelectorAll('li.yes').length >= 18, others.every(o => o.querySelectorAll('li').length <= 4)]; })()"))
    ft = pg.evaluate("document.querySelector('#vs-grid .card.hl').innerText")
    out('feature stack names what exists [complete app, FEN scanner, gamification, three trainers, token loops]', [k in ft for k in ('complete app', 'FEN scanner', 'Gamification', 'Opening trainer', 'Middlegame', 'Endgame', 'Token loops')])
    out('Founding line [EUR 199.50, about EUR 16.60 a month, under EUR 0.55 a day, shown while the first launch tier is open]', pg.evaluate("[!document.getElementById('ds-founding').classList.contains('hide'), /199\\.50/.test(document.getElementById('ds-founding').innerText), /16\\.60/.test(document.getElementById('ds-founding').innerText), /0\\.55/.test(document.getElementById('ds-founding').innerText)]"))
    txt = pg.evaluate("document.body.innerText")
    out('copy [hero: 355 to 2105 and +630 in 6 weeks; no "2 months"; method line; no lifetime / forever; no promise of a rating]', ['355 to 2105' in txt, '+630' in txt and '6 weeks' in txt, '2 months' not in txt, 'Think the same way every time' in txt, 'lifetime' not in txt.lower() and 'forever' not in txt.lower(), 'impossible' not in txt.lower(), 'Nothing here is a promise of a rating' in txt]); c.close()
    br.close()
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
