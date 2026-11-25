# lc94 (9.58.0): the funnel (11 steps, once per device, with the first-click source), the ?u= deep link that starts the first review,
# the soft in-app browser mode (LC87: nothing is blocked, the app boots inside Instagram / TikTok) and the "Keep this review" step (LC88 source "iab").
# Real Chromium, 390x844, the real app. The Supabase calls are caught here (nothing reaches the network); Chess.com is the kyenzotest fixture.
import json as _j
_FX = _j.load(open(FIX + '/chesscom.json', encoding='utf-8'))
UA_IG_A = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.82 Mobile Safari/537.36 Instagram 330.0.0.40.92 Android (34/14; 420dpi; 1080x2400; Google; Pixel 8; shiba; shiba; en_US; 599382017)'
UA_IG_I = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.2.29.92 (iPhone15,2; iOS 17_5; en_US; en; scale=3.00; 1179x2556; 601420827)'
UA_FB_16 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/447.0.0.40.112;FBBV/556226014;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/16.6;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/5]'
UA_TT_A = 'Mozilla/5.0 (Linux; Android 13; SM-S911B Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36 trill_340204 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/34.2.4 ByteLocale/en BytedanceWebview/d8a21c6'
CALLS = []
def _cc(r):
    u = r.request.url.split('?')[0]
    b = _FX['archives'] if '/kyenzotest/games/archives' in u else _FX['month'] if '/kyenzotest/games/2026/11' in u else _FX['stats'] if u.endswith('/kyenzotest/stats') else _FX['profile'] if u.endswith('/player/kyenzotest') else None
    if b is None: return r.fulfill(status=404, body='{}', content_type='application/json')
    CALLS.append(['chesscom', u]); r.fulfill(status=200, body=_j.dumps(b), content_type='application/json', headers={'access-control-allow-origin': '*'})
def _rpc(r):
    if r.request.url.endswith('/rest/v1/rpc/lc94_step'):
        CALLS.append(['step', _j.loads(r.request.post_data or '{}')]); return r.fulfill(status=204, body='', headers={'access-control-allow-origin': '*'})
    return r.fallback()
def ctx(br, ua=None, fresh=False, init=''):
    kw = dict(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=1)
    if ua: kw['user_agent'] = ua
    c = br.new_context(**kw); c.route('**/*', route); c.route('https://api.chess.com/**', _cc); c.route('**/rest/v1/rpc/**', _rpc)
    if init: c.add_init_script(script=init)
    if not fresh: c.add_init_script(script=INIT)
    return c
steps = lambda: [x[1].get('p_step') for x in CALLS if x[0] == 'step']
srcs = lambda s: [x[1].get('p_src') for x in CALLS if x[0] == 'step' and x[1].get('p_step') == s]
with sync_playwright() as p:
    br = p.chromium.launch()
    # A. Chrome: landing with ?src=, then the app; every step once per device, the first source stays
    del CALLS[:]
    c = ctx(br); pg = c.new_page(); watch(pg, 'funnel')
    pg.goto('http://127.0.0.1:8765/index.html?src=MC_IG'); pg.wait_for_timeout(1200)
    out('landing [steps, source, device id format]', [steps(), srcs('landing'), pg.evaluate("/^d-[a-z0-9]{12,40}$/.test(JSON.parse(localStorage.getItem('lc-hub-device')))")])
    pg.reload(); pg.wait_for_timeout(800)
    out('landing again [no second landing step]', steps().count('landing'))
    pg.goto('http://127.0.0.1:8765/app.html?src=yt_short#home'); pg.wait_for_timeout(3000)
    out('app [first_open sent, its source is still the first one, same device as the landing]', [steps().count('first_open'), srcs('first_open'), len(set(x[1].get('p_aid') for x in CALLS if x[0] == 'step'))])
    pg.evaluate("window.dispatchEvent(new Event('lc39-signed-in')); undefined"); pg.wait_for_timeout(400)
    pg.evaluate("(() => { const d = document.createElement('div'); d.className = 'lc90-sheet'; d.id = 't-pw'; document.body.appendChild(d); })(); undefined"); pg.wait_for_timeout(4600)
    pg.evaluate("document.getElementById('t-pw').remove(); undefined")
    out('signed in, paywall seen [steps]', [steps().count('signed_in'), steps().count('paywall_seen')])
    pg.evaluate("Store.set('lc-hub-trim-stats-v1', { games: { g1: { t: Date.now() } } }); undefined"); pg.wait_for_timeout(4600)
    out('first review done [step]', steps().count('first_review_done'))
    out('chrome sign-in gate [Google shown]', pg.evaluate("(() => { const d = document.createElement('div'); d.innerHTML = LC53.gateHTML(); document.body.appendChild(d); const r = getComputedStyle(d.querySelector('[data-lc39-google]')).display !== 'none'; d.remove(); return r; })()"))
    pg.route('https://buy.stripe.com/**', lambda r: r.fulfill(status=200, body='<html>stripe</html>', content_type='text/html'))
    out('checkout wrapper [LC36.support.go wrapped, LC42.begin wrapped]', pg.evaluate("[LC36.support.go.__lc94 === 1, LC42.begin.__lc94 === 1]"))
    pg.evaluate("LC36.support.go('https://buy.stripe.com/test_lc94'); undefined"); pg.wait_for_timeout(1500)
    out('checkout started [step]', steps().count('checkout_started'))
    c.close()
    # B. the deep link on a brand-new device: no first-run sheet, the name is in, the first review starts, the address is clean
    del CALLS[:]
    c = ctx(br, fresh=True); pg = c.new_page(); watch(pg, 'deep')
    pg.goto('http://127.0.0.1:8765/app.html?u=kyenzotest&site=chesscom&src=mc_ig#home'); pg.wait_for_timeout(5000)
    out('deep link [no first-run sheet, no source question, onboarded, Chess.com name, road step, site, user]', pg.evaluate("[!document.querySelector('.lc80-onb'), !document.querySelector('.lc30-ask-box'), App.onboarded, App.profile.chess_com_username, LC42._t.st().step, LC42._t.st().site, LC42._t.st().user]"))
    out('deep link [address keeps only the source, attribution from the source, first-run answer]', pg.evaluate("[location.search, (LC30.state().attr || {}).detail, (Store.get('lc80-onb', {}) || {}).via]"))
    out('deep link [the latest games were fetched from Chess.com]', len([x for x in CALLS if x[0] == 'chesscom']) > 0)
    out('deep link [steps]', sorted(set(steps())))
    try: pg.wait_for_function("!!LC42._t.st().g1 && !!LC42._t.st().g1.pgn", timeout=60000)
    except Exception: pass
    out('deep link [the latest game is on the device, the first-mistake sheet is open]', pg.evaluate("[!!(LC42._t.st().g1 && LC42._t.st().g1.pgn), !!document.querySelector('.lc42-tease')]"))
    out('deep link [a mate is named as a mate, not as pawns]', pg.evaluate("(document.querySelector('.lc42-tease .lc52-h') || {}).textContent || ''"))
    out('deep link [rating read like Connect does: Active ELO is known]', pg.evaluate("+(App.profile.elo || 0) > 0"))
    pg.reload(); pg.wait_for_timeout(2500)
    out('deep link after a reload [still on the road, no restart]', pg.evaluate("[LC42._t.st().step, !document.querySelector('.lc80-onb')]"))
    c.close()
    c = ctx(br, fresh=True); pg = c.new_page(); watch(pg, 'deep-li')
    pg.goto('http://127.0.0.1:8765/app.html?u=some_lichess&site=lichess#home'); pg.wait_for_timeout(3000)
    out('deep link lichess [name, site]', pg.evaluate("[App.profile.lichess_username, LC42._t.st().site]"))
    c.close()
    c = ctx(br, fresh=True); pg = c.new_page(); watch(pg, 'deep-bad')
    pg.goto('http://127.0.0.1:8765/app.html?u=%3Cscript%3E#home'); pg.wait_for_timeout(3000)
    out('deep link with a bad name [ignored: the normal first-run screen, no road]', pg.evaluate("[!!document.querySelector('.lc80-onb, .lc30-ask-box'), LC42._t.st().step]"))
    c.close()
    # B2. 9.59.0: the landing page's quick start goes straight into the deep link (a profile link works too)
    del CALLS[:]
    c = ctx(br, init="window.__navs = []; window.__lcNav = (u) => window.__navs.push(u);"); pg = c.new_page(); watch(pg, 'qs')
    pg.goto('http://127.0.0.1:8765/index.html?src=tt_bio'); pg.wait_for_timeout(1200)
    out('quick start [on the first screen, placeholder, button]', pg.evaluate("(f => [f.getBoundingClientRect().bottom <= innerHeight, f.querySelector('input').placeholder, f.querySelector('button[type=submit]').textContent])(document.getElementById('lc94-qs'))"))
    pg.click('#lc94-qs button[type=submit]'); pg.wait_for_timeout(200)
    out('quick start, empty [message, no navigation]', [pg.evaluate("document.querySelector('[data-qs-msg]').textContent"), pg.evaluate("window.__navs.length")])
    # 9.75.0: straight into the review again (9.67.0's install-first is undone): one jump to the deep link, no install guide, no card
    QSLINK = "(() => new Promise(r => setTimeout(() => { const o = document.getElementById('ins-ov'); r([window.__navs.length, window.__navs[window.__navs.length - 1] || null, !!(o && !o.hidden), !!document.querySelector('#lc102-card')]); }, 700)))()"
    pg.fill('#lc94-qs input', 'https://www.chess.com/member/kyenzotest'); pg.click('#lc94-qs button[type=submit]'); pg.wait_for_timeout(1700)
    out('quick start, profile link [one jump to the deep link with the first source, no install guide, no card]', pg.evaluate(QSLINK))
    pg.click('[data-qs-site]'); pg.fill('#lc94-qs input', 'some_lichess'); pg.click('#lc94-qs button[type=submit]'); pg.wait_for_timeout(1700)
    out('quick start, Lichess [placeholder, link]', [pg.evaluate("document.querySelector('#lc94-qs input').placeholder"), pg.evaluate(QSLINK)[1]])
    out('quick start [name_entered sent from the landing page]', steps().count('name_entered'))
    c.close()
    # B3. 9.59.0: a known source answers "How did you find this app?" (the first question is the account), and Upgrades starts with Try Pro free
    c = ctx(br, fresh=True); pg = c.new_page(); watch(pg, 'src')
    pg.goto('http://127.0.0.1:8765/app.html?src=ig_bio#home'); pg.wait_for_timeout(3000)
    out('known source [first question, attribution saved]', [pg.evaluate("(document.querySelector('.lc30-ask-box .lc30-step') || {}).textContent || ''"), pg.evaluate("(LC30.state().attr || {}).detail")])
    c.close()
    c = ctx(br); pg = c.new_page(); watch(pg, 'up')
    pg.route('**/rest/v1/rpc/lc89_paywall_log', lambda r: (CALLS.append(['pwlog', _j.loads(r.request.post_data or '{}')]), r.fulfill(status=200, body='{}', headers={'access-control-allow-origin': '*'}))[1])
    pg.goto('http://127.0.0.1:8765/app.html#upgrades'); pg.wait_for_timeout(3000)
    out('upgrades [first button, nav label]', [pg.evaluate("(b => b ? b.textContent.trim() : '')(document.querySelector('[data-up-try]'))"), pg.evaluate("[...document.querySelectorAll('#tabs a, #tabs button')].map(a => a.innerText.trim())[0]")])
    del CALLS[:]
    pg.click('[data-up-try]'); pg.wait_for_timeout(1500)
    out('Try Pro free [offer title, no intro-week line, not counted as the Day-7 pop-up]', [pg.evaluate("(s => s ? s.innerText.split('\\n').filter(Boolean)[0] : '')(document.querySelector('.lc90-sheet'))"), pg.evaluate("!/intro week is over|goes back to 1 token/.test((document.querySelector('.lc90-sheet') || {}).innerText || '')"), [x[1].get('p_kind') for x in CALLS if x[0] == 'pwlog']])
    c.close()
    # C. Instagram on Android: nothing blocked, Install opens the screen with "Review my last game here", the app boots
    del CALLS[:]
    nav = "window.__navs = []; window.__lcNav = (u) => window.__navs.push(u);"
    c = ctx(br, UA_IG_A, init=nav); pg = c.new_page(); watch(pg, 'ig-a')
    pg.goto('http://127.0.0.1:8765/index.html?src=mc_ig'); pg.wait_for_timeout(1500)
    out('ig-android landing [soft, page visible, no screen yet, hero visible, auto-try Chrome once]', pg.evaluate("[window.__lcIab, document.documentElement.classList.contains('lc-iab'), !document.getElementById('lc87'), !!document.querySelector('.hero') && getComputedStyle(document.querySelector('.hero')).display !== 'none', window.__navs.filter(u => u.indexOf('intent://') === 0).length]"))
    out('ig-android landing [steps]', sorted(set(steps())))
    pg.click('.hero [data-install]'); pg.wait_for_timeout(400)
    out('ig-android Install [screen, title, big button, scheme, here link, still on the landing page]', pg.evaluate("[!!document.getElementById('lc87'), document.getElementById('lc87-h').textContent, document.getElementById('lc87-go').textContent, document.getElementById('lc87-go').getAttribute('href').split(':')[0], document.getElementById('lc87-here').getAttribute('href'), location.pathname]"))
    out('ig-android Install [the text]', pg.evaluate("document.querySelector('#lc87 p').textContent"))
    pg.click('#lc87 [data-lc87-x]'); pg.wait_for_timeout(200)
    out('ig-android close [screen gone]', pg.evaluate("!document.getElementById('lc87')"))
    pg.goto('http://127.0.0.1:8765/app.html#home'); pg.wait_for_timeout(3500)
    out('ig-android app boots [soft, navigation rendered, no screen]', pg.evaluate("[window.__lcIab, !!(document.getElementById('tabs') || {}).innerHTML, !document.getElementById('lc87')]"))
    out('ig-android app first open [no install bar before the first review]', pg.evaluate("!document.querySelector('.lc83-iab')"))
    out('ig-android app, before a review [no Keep step]', pg.evaluate("LC94.iabStep()"))
    out('ig-android sign-in gate [Google hidden (Google refuses in-app browsers), e-mail field shown]', pg.evaluate("(() => { const d = document.createElement('div'); d.innerHTML = LC53.gateHTML(); document.body.appendChild(d); const g = d.querySelector('[data-lc39-google]'), m = d.querySelector('input[type=email]'); const r = [getComputedStyle(g).display, getComputedStyle(m).display !== 'none']; d.remove(); return r; })()"))
    pg.evaluate("App.profile = Object.assign({}, App.profile, { chess_com_username: 'kyenzotest' }); Store.set('lc-hub-trim-stats-v1', { games: { g1: { t: Date.now() } } }); [...document.querySelectorAll('.sheet-wrap')].forEach(w => w.remove()); LC88.update(true); undefined"); pg.wait_for_timeout(900)
    out('ig-android after the first review [banner source, text, button]', pg.evaluate("(() => { const b = document.getElementById('lc88-bar') || document.querySelector('[data-src]'); return b ? [b.getAttribute('data-src'), (b.innerText || '').split('\\n')[0].slice(0, 60), [...b.querySelectorAll('[data-lc88-i]')].map(x => x.textContent.trim()).filter(Boolean)] : 'no bar'; })()"))
    pg.evaluate("(() => { const b = [...document.querySelectorAll('[data-lc88-i]')].find(x => /Open in Chrome/.test(x.textContent)); if (b) b.click(); })(); undefined"); pg.wait_for_timeout(300)
    out('ig-android Keep [intent to Chrome, with the name, the site, resume and source=iab]', pg.evaluate("(() => { const u = window.__navs.filter(x => x.indexOf('intent://') === 0).pop() || ''; return [/package=com\\.android\\.chrome/.test(u), /app\\.html\\?u=kyenzotest&site=chesscom&resume=1&src=mc_ig&source=iab/.test(u)]; })()"))
    pg.evaluate("(() => { const b = [...document.querySelectorAll('[data-lc88-i]')].find(x => x.classList.contains('lc88-close')); if (b) b.click(); })(); undefined"); pg.wait_for_timeout(500)
    out('ig-android Keep dismissed [no step for 3 days]', pg.evaluate("LC94.iabStep()"))
    c.close()
    # D. Instagram on iPhone: Safari link; Facebook on iOS 16: the copy screen
    c = ctx(br, UA_IG_I, init=nav); pg = c.new_page(); watch(pg, 'ig-i')
    pg.goto('http://127.0.0.1:8765/app.html#home'); pg.wait_for_timeout(3000)
    pg.evaluate("App.profile = Object.assign({}, App.profile, { chess_com_username: 'kyenzotest' }); Store.set('lc-hub-trim-stats-v1', { games: { g1: { t: 1 } } }); undefined")
    out('ig-iphone Keep [button label]', pg.evaluate("LC94.iabStep().acts[0].label"))
    pg.evaluate("LC94.iabStep().acts[0].run(); undefined"); pg.wait_for_timeout(200)
    out('ig-iphone Keep [opens Safari with the game]', pg.evaluate("(window.__navs.pop() || '').replace(location.origin, '')"))
    c.close()
    c = ctx(br, UA_FB_16, init=nav); pg = c.new_page(); watch(pg, 'fb16')
    pg.goto('http://127.0.0.1:8765/app.html#home'); pg.wait_for_timeout(3000)
    pg.evaluate("App.profile = Object.assign({}, App.profile, { chess_com_username: 'kyenzotest' }); Store.set('lc-hub-trim-stats-v1', { games: { g1: { t: 1 } } }); undefined")
    out('fb-ios16 Keep [button label]', pg.evaluate("LC94.iabStep().acts[0].label"))
    pg.evaluate("LC94.iabStep().acts[0].run(); undefined"); pg.wait_for_timeout(300)
    out('fb-ios16 Keep [copy screen, big button is Copy, title, no navigation]', pg.evaluate("[!!document.getElementById('lc87'), !!document.querySelector('#lc87-go[data-lc87-copy]'), document.getElementById('lc87-h').textContent, window.__navs.length]"))
    c.close()
    c = ctx(br, UA_TT_A, init=nav); pg = c.new_page(); watch(pg, 'tt')
    pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(1200)
    out('tiktok-android landing [soft, no auto-try (only Instagram and Facebook do that)]', pg.evaluate("[window.__lcIab, window.__navs.length]"))
    c.close()
    br.close()
a = open(REPO + '/app.html', encoding='utf-8').read(); l = open(REPO + '/index.html', encoding='utf-8').read(); m = open(REPO + '/lc94.js', encoding='utf-8').read().strip()
out('LC94 [same text in lc94.js, app.html and index.html, init in both, boot hook, boot runs in soft mode]', [m in a, m in l, 'try{LC94.init()}catch(e){console.error(e)}' in a and 'try{LC94.init()}catch(e){}' in l, 'LC94.deepStart()' in a, '(window.__lcIab===true?void 0:' in a])
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
