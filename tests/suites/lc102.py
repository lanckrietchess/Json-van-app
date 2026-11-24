# lc102 (9.67.0): the landing's quick start -> install -> "Open the app" card, never over a playing video, and the name handoff into the app.
# Real Chromium, 390x844 (phone) and 1280x800, the real landing page and app. Supabase is stubbed (segment videos, funnel steps), Chess.com is
# the kyenzotest fixture. YouTube cannot load here, so the player's state messages are fed to LC102's own message handler with the
# real iframe as their source (the same objects a real player's postMessage gives).
# A. Chrome without a native prompt: submit = no jump, the name is kept, the guide opens, the card waits for it, then shows the deep link.
# B. Native prompt accepted (card after appinstalled, no second bottom message) and declined (card offers the browser).
# C. Instagram browser: no install there, the card at once.
# D. The video rule: YouTube playing / paused / ended / buffering / cued, a segment without a video, a player that never answers
#    (waits while on screen), a <video> file; the iframe asks the player API (enablejsapi=1).
# E. The app: a home-screen start (no ?u=) reads the handoff once and starts the review; an old handoff is ignored; ?u= wins.
import json as _j
_FX = _j.load(open(FIX + '/chesscom.json', encoding='utf-8'))
LAND = 'http://127.0.0.1:8765/index.html'
UA_IG_A = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.82 Mobile Safari/537.36 Instagram 330.0.0.40.92 Android (34/14; 420dpi; 1080x2400; Google; Pixel 8; shiba; shiba; en_US; 599382017)'
Y1, Y2 = 'aaaaaaaaaa1', 'bbbbbbbbbb2'
SEG = {'v': 1, 'on': True, 'label': 'Pick your rating', 'def': '800-1200', 'segs': {
    '0-800': {'url': 'https://youtu.be/' + Y1, 'yt': 'public', 'live': True},
    '800-1200': {'url': 'https://www.youtube.com/watch?v=' + Y2, 'yt': 'public', 'live': True},
    '1600-2000': {'url': 'https://lanckrietchesstrainerhub.vercel.app/v/demo.mp4', 'yt': 'public', 'live': True}}}
CALLS = []
def _cc(r):
    u = r.request.url.split('?')[0]
    b = _FX['archives'] if '/kyenzotest/games/archives' in u else _FX['month'] if '/kyenzotest/games/2026/11' in u else _FX['stats'] if u.endswith('/kyenzotest/stats') else _FX['profile'] if u.endswith('/player/kyenzotest') else None
    if b is None: return r.fulfill(status=404, body='{}', content_type='application/json')
    r.fulfill(status=200, body=_j.dumps(b), content_type='application/json', headers={'access-control-allow-origin': '*'})
def _rpc(r):
    u = r.request.url
    if u.endswith('/rest/v1/rpc/lc94_step'):
        CALLS.append(['step', _j.loads(r.request.post_data or '{}')]); return r.fulfill(status=204, body='', headers={'access-control-allow-origin': '*'})
    if u.endswith('/rest/v1/rpc/lc89_cfg_public'):
        k = _j.loads(r.request.post_data or '{}').get('p_k')
        return r.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body=_j.dumps({'ok': True, 'k': k, 'v': SEG if k == 'segvideo' else {}}))
    return r.fallback()
def ctx(br, ua=None, fresh=False, init='', w=390, h=844):
    kw = dict(viewport={'width': w, 'height': h}, is_mobile=w < 800, has_touch=w < 800, device_scale_factor=1)
    if ua: kw['user_agent'] = ua
    c = br.new_context(**kw); c.route('**/*', route); c.route('https://api.chess.com/**', _cc); c.route('**/rest/v1/rpc/**', _rpc)
    c.add_init_script(script="window.__navs = []; window.__lcNav = (u) => window.__navs.push(u);" + init)
    if not fresh: c.add_init_script(script=INIT)
    return c
CARD = "(() => { const c = document.getElementById('lc102-card'); if (!c || c.hidden) return null; const b = c.getBoundingClientRect(); return [c.querySelector('b').textContent, c.querySelector('small').textContent, c.querySelector('[data-lc102-open]').getAttribute('href'), b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight]; })()"
SHOWN = "!!(document.getElementById('lc102-card') && !document.getElementById('lc102-card').hidden)"
HAND = "(h => h && [h.u, h.site, h.src])(JSON.parse(localStorage.getItem('lc102-handoff') || 'null'))"
def submit(pg, name):
    pg.fill('#lc94-qs input', name); pg.click('#lc94-qs button[type=submit]')
def yt(pg, state):  # a YouTube player state message, from the hero iframe itself
    pg.evaluate("s => { const f = document.querySelector('#walk-hero iframe'); LC102._t.onMsg({ origin: 'https://www.youtube-nocookie.com', source: f.contentWindow, data: JSON.stringify({ event: 'onStateChange', info: s, id: 1, channel: 'widget' }) }); }", state)
    pg.wait_for_timeout(250)
PROMPT = """o => { window.__prompted = 0; const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => { window.__prompted++; return Promise.resolve(); }; e.userChoice = Promise.resolve({ outcome: o }); window.dispatchEvent(e); }"""
with sync_playwright() as p:
    br = p.chromium.launch()
    # A. Chrome, no native prompt on offer yet
    del CALLS[:]
    c = ctx(br); pg = c.new_page(); watch(pg, 'chrome')
    pg.goto(LAND + '?src=tt_bio'); pg.wait_for_timeout(1200)
    out('quick start text [quick.3]', pg.evaluate("document.querySelector('[data-cms=\"quick.3\"]').textContent"))
    submit(pg, 'https://www.chess.com/member/kyenzotest'); pg.wait_for_timeout(300)
    out('submit [no jump into the app, still on the landing, name kept, message]', [pg.evaluate("window.__navs.length"), pg.evaluate("location.pathname"), pg.evaluate(HAND), pg.evaluate("document.querySelector('[data-qs-msg]').textContent")])
    pg.wait_for_timeout(1500)
    out('install guide [open, card waits behind it]', [pg.evaluate("!document.getElementById('ins-ov').hidden"), pg.evaluate(SHOWN)])
    pg.click('#ins-ov .wl-x'); pg.wait_for_timeout(700)
    out('guide closed [card: title, line, link, inside the screen]', pg.evaluate(CARD))
    out('phone [overflow-x]', pg.evaluate("document.documentElement.scrollWidth - innerWidth"))
    pg.click('#lc102-card [data-lc102-open]'); pg.wait_for_timeout(200)
    out('Open the app [goes to the deep link]', pg.evaluate("window.__navs.pop()"))
    pg.click('#lc102-card [data-lc102-x]'); pg.wait_for_timeout(300)
    out('close [card gone, stays gone]', [pg.evaluate(SHOWN), (pg.wait_for_timeout(900), pg.evaluate(SHOWN))[1]])
    out('funnel [name_entered sent once]', [x[1].get('p_step') for x in CALLS if x[0] == 'step'].count('name_entered'))
    submit(pg, '<bad>'); pg.wait_for_timeout(300)
    out('bad name [message, no guide, no card]', [pg.evaluate("document.querySelector('[data-qs-msg]').textContent"), pg.evaluate("document.getElementById('ins-ov').hidden"), pg.evaluate(SHOWN)])
    c.close()
    # B. the native prompt
    for outcome in ['accepted', 'dismissed']:
        c = ctx(br); pg = c.new_page(); watch(pg, 'prompt-' + outcome)
        pg.goto(LAND); pg.wait_for_timeout(1000); pg.evaluate(PROMPT, outcome)
        submit(pg, 'kyenzotest'); pg.wait_for_timeout(600)
        before = pg.evaluate(SHOWN)
        if outcome == 'accepted': pg.evaluate("window.dispatchEvent(new Event('appinstalled')); undefined"); pg.wait_for_timeout(700)
        m = pg.evaluate("(m => !!m && !m.hidden)(document.getElementById('lc-inst'))")
        out('native prompt ' + outcome + ' [prompted, card before the install was reported, card, bottom message too]', [pg.evaluate("window.__prompted"), before if outcome == 'accepted' else '-', pg.evaluate(CARD), m])
        c.close()
    # C. Instagram's browser: no install possible, the card at once
    c = ctx(br, ua=UA_IG_A); pg = c.new_page(); watch(pg, 'iab')
    pg.goto(LAND + '?src=mc_ig'); pg.wait_for_timeout(1200)
    submit(pg, 'kyenzotest'); pg.wait_for_timeout(700)
    out('instagram [no guide, card]', [pg.evaluate("!document.getElementById('ins-ov') || document.getElementById('ins-ov').hidden"), pg.evaluate(CARD)])
    c.close()
    # D. the video rule (already installed: the card is ready at once, so only the video holds it back)
    c = ctx(br, init="try { localStorage.setItem('lc-pwa-installed', String(Date.now())); } catch (e) {}"); pg = c.new_page(); watch(pg, 'video')
    pg.goto(LAND); pg.wait_for_timeout(1500)
    pg.evaluate("document.getElementById('walk-hero').scrollIntoView({ block: 'center' }); undefined")
    pg.click('#walk-hero [data-play]'); pg.wait_for_timeout(300)
    out('player [iframe, asks the player API]', pg.evaluate("(f => [!!f, /enablejsapi=1/.test(f.src), /origin=http%3A%2F%2F127\\.0\\.0\\.1%3A8765/.test(f.src)])(document.querySelector('#walk-hero iframe'))"))
    submit(pg, 'kyenzotest'); pg.wait_for_timeout(700)
    out('submit while the video starts [card held back]', pg.evaluate(SHOWN))
    seq = []
    yt(pg, 1); seq.append(['playing', pg.evaluate(SHOWN)])
    yt(pg, 3); seq.append(['buffering', pg.evaluate(SHOWN)])
    yt(pg, 2); pg.wait_for_timeout(300); seq.append(['paused', pg.evaluate(SHOWN)])
    yt(pg, 1); seq.append(['playing again', pg.evaluate(SHOWN)])
    yt(pg, 0); pg.wait_for_timeout(300); seq.append(['ended', pg.evaluate(SHOWN)])
    out('youtube states [card shown?]', seq)
    yt(pg, 1); pg.click('[data-seg="1200-1600"]'); pg.wait_for_timeout(700)
    out('playing, then a segment without a video [iframe gone, card shown]', [pg.evaluate("!document.querySelector('#walk-hero iframe')"), pg.evaluate(SHOWN)])
    pg.click('[data-seg="0-800"]'); pg.wait_for_timeout(300); pg.click('#walk-hero [data-play]'); pg.wait_for_timeout(500)
    out('a new video starts [card hidden again]', pg.evaluate(SHOWN))
    yt(pg, 5); r1 = pg.evaluate(SHOWN); pg.wait_for_timeout(1800)
    out('cued, not started [hidden at first (no flash), shown after 1.5 s]', [r1, pg.evaluate(SHOWN)])
    c.close()
    c = ctx(br, init="try { localStorage.setItem('lc-pwa-installed', String(Date.now())); } catch (e) {}"); pg = c.new_page(); watch(pg, 'noapi')
    pg.goto(LAND); pg.wait_for_timeout(1500)
    pg.evaluate("document.getElementById('walk-hero').scrollIntoView({ block: 'center' }); undefined"); pg.click('#walk-hero [data-play]'); pg.wait_for_timeout(300)
    submit(pg, 'kyenzotest'); pg.wait_for_timeout(10600)
    pg.evaluate("document.getElementById('walk-hero').scrollIntoView({ block: 'center' }); undefined"); pg.wait_for_timeout(700)
    a1 = pg.evaluate(SHOWN)
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight); undefined"); pg.wait_for_timeout(800)
    out('player that never answers [hidden while on screen, shown once scrolled away]', [a1, pg.evaluate(SHOWN)])
    pg.evaluate("window.scrollTo(0, 0); undefined"); pg.click('[data-seg="1600-2000"]'); pg.wait_for_timeout(400)
    pg.evaluate("document.getElementById('walk-hero').scrollIntoView({ block: 'center' }); undefined"); pg.wait_for_timeout(600)
    v0 = pg.evaluate(SHOWN)
    pg.evaluate("(v => { Object.defineProperty(v, 'paused', { get: () => false, configurable: true }); v.dispatchEvent(new Event('play')); })(document.querySelector('#walk-hero video'))"); pg.wait_for_timeout(300)
    v1 = pg.evaluate(SHOWN)
    pg.evaluate("(v => { Object.defineProperty(v, 'paused', { get: () => true, configurable: true }); v.dispatchEvent(new Event('pause')); })(document.querySelector('#walk-hero video'))"); pg.wait_for_timeout(300)
    out('<video> file [before play, playing, paused]', [v0, v1, pg.evaluate(SHOWN)])
    c.close()
    c = ctx(br, w=1280, h=800); pg = c.new_page(); watch(pg, 'desktop')
    pg.goto(LAND); pg.wait_for_timeout(1200); pg.evaluate(PROMPT, 'dismissed'); submit(pg, 'kyenzotest'); pg.wait_for_timeout(700)
    out('desktop [card inside the screen, overflow-x]', [(pg.evaluate(CARD) or [0, 0, 0, False])[3], pg.evaluate("document.documentElement.scrollWidth - innerWidth")])
    c.close()
    # E. the app reads the handoff
    H = lambda age, u='kyenzotest': "localStorage.setItem('lc102-handoff', JSON.stringify({ u: '%s', site: 'chesscom', src: 'tt_bio', at: Date.now() - %d, v: 1 }));" % (u, age)
    c = ctx(br, fresh=True, init="if (!sessionStorage.getItem('t-h')) { sessionStorage.setItem('t-h', '1'); " + H(3600e3) + " }"); pg = c.new_page(); watch(pg, 'app-hand')
    pg.goto('http://127.0.0.1:8765/app.html?source=pwa#home'); pg.wait_for_timeout(5000)
    out('home-screen start with a handoff [no first-run sheet, name, road user, handoff used]', pg.evaluate("[!document.querySelector('.lc80-onb'), App.profile.chess_com_username, LC42._t.st().user, localStorage.getItem('lc102-handoff')]"))
    c.close()
    c = ctx(br, fresh=True, init="if (!sessionStorage.getItem('t-h')) { sessionStorage.setItem('t-h', '1'); " + H(8 * 864e5) + " }"); pg = c.new_page(); watch(pg, 'app-old')
    pg.goto('http://127.0.0.1:8765/app.html?source=pwa#home'); pg.wait_for_timeout(3000)
    out('handoff older than 7 days [ignored: first-run screen, no road, cleared]', pg.evaluate("[!!document.querySelector('.lc80-onb, .lc30-ask-box'), LC42._t.st().step || null, localStorage.getItem('lc102-handoff')]"))
    c.close()
    c = ctx(br, fresh=True, init="if (!sessionStorage.getItem('t-h')) { sessionStorage.setItem('t-h', '1'); " + H(1000, 'someone_else') + " }"); pg = c.new_page(); watch(pg, 'app-link')
    pg.goto('http://127.0.0.1:8765/app.html?u=kyenzotest&site=chesscom#home'); pg.wait_for_timeout(4000)
    out('?u= link with an older handoff [the link wins, handoff cleared]', pg.evaluate("[LC42._t.st().user, localStorage.getItem('lc102-handoff')]"))
    c.close()
    br.close()
l = open(REPO + '/index.html', encoding='utf-8').read(); a = open(REPO + '/app.html', encoding='utf-8').read(); m = open(REPO + '/lc102.js', encoding='utf-8').read().strip()
out('LC102 [same text in lc102.js and index.html, init, not in the app, LC94 hands over, build]', [m in l, 'try{LC102.init()}catch(e){}' in l, '/*@@module lc102*/' not in a, 'LC102.submit({u:u,site:site,src:s,url:url.pathname+url.search})' in l, __import__('re').search(r'VERSION="([\d.]+)"', m).group(1)])
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
