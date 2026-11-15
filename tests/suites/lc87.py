# lc87 (9.47.0, install state 9.49.0): the in-app browser gate and the install button. Real Chromium with the user agents of the real in-app browsers.
# In Instagram / TikTok / Facebook (Android and iPhone) the landing page AND the app are covered by one screen (nothing under it can be
# tapped, the app does not boot), with "Open in Chrome" (intent) or "Open in Safari" (x-safari) and Copy the link; Android Instagram tries
# Chrome once by itself. Normal Chrome, Safari and the installed app never see it; ?lc_iab=0 switches it off for the tab. In a real browser
# the Install button opens the native prompt at once when the browser offered it, otherwise the browser's own steps on the landing page.
UAS = {
  'ig-android': 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.82 Mobile Safari/537.36 Instagram 330.0.0.40.92 Android (34/14; 420dpi; 1080x2400; Google; Pixel 8; shiba; shiba; en_US; 599382017)',
  'ig-iphone': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.2.29.92 (iPhone15,2; iOS 17_5; en_US; en; scale=3.00; 1179x2556; 601420827)',
  'tiktok-android': 'Mozilla/5.0 (Linux; Android 13; SM-S911B Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36 trill_340204 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/34.2.4 ByteLocale/en BytedanceWebview/d8a21c6',
  'fb-iphone-ios16': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/447.0.0.40.112;FBBV/556226014;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/16.6;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/5]',
  'chrome-android': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
  'safari-iphone': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
}
GATE = "(() => { const g = document.getElementById('lc87'); if (!g) return 'none'; const r = g.getBoundingClientRect(); const go = document.getElementById('lc87-go'); const top = document.elementFromPoint(innerWidth / 2, innerHeight - 30); const vis = [...document.body.children].filter(x => x.id !== 'lc87' && getComputedStyle(x).display !== 'none').length; return [r.width >= innerWidth - 1 && r.height >= innerHeight - 1, go ? go.textContent : '', go ? (go.getAttribute('href') || '').split(':')[0] : '', !!top && g.contains(top), vis, document.getElementById('lc87-h').textContent]; })()"
def ctx(br, ua, w=390, h=844):
    c = br.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True, device_scale_factor=1, user_agent=ua)
    c.route('**/*', route); c.add_init_script(script=INIT); return c
with sync_playwright() as p:
    br = p.chromium.launch()
    for k in ['ig-android', 'ig-iphone', 'tiktok-android', 'fb-iphone-ios16']:
        c = ctx(br, UAS[k]); pg = c.new_page(); watch(pg, k)
        pg.add_init_script("window.__navs = []; window.__lcNav = (u) => window.__navs.push(u);")
        pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(1500)
        out(k + ' landing gate [full screen, button, link scheme, on top, nothing else visible, title]', pg.evaluate(GATE))
        out(k + ' landing [the text]', pg.evaluate("document.querySelector('#lc87 p').textContent"))
        out(k + ' auto-try Chrome once [intent tries]', pg.evaluate("window.__navs.filter(u => u.indexOf('intent://') === 0).length"))
        pg.reload(); pg.wait_for_timeout(1200)
        out(k + ' after a reload [no second auto-try]', pg.evaluate("window.__navs.filter(u => u.indexOf('intent://') === 0).length"))
        pg.goto('http://127.0.0.1:8765/app.html#home'); pg.wait_for_timeout(3000)
        out(k + ' app gate [full screen, button, link scheme, on top, nothing else visible, title]', pg.evaluate(GATE))
        out(k + ' app did not boot [__lcIab, no navigation rendered, no sheet open]', pg.evaluate("[window.__lcIab === true, !(document.getElementById('tabs') || {}).innerHTML, document.querySelectorAll('.sheet-wrap').length]"))
        if k == 'ig-android':
            out(k + ' intent [Chrome package, fallback is this page, marked source=iab]', pg.evaluate("(() => { const h = document.getElementById('lc87-go').getAttribute('href'); return [/package=com\\.android\\.chrome/.test(h), decodeURIComponent((/browser_fallback_url=([^;]+)/.exec(h) || [])[1] || '').replace(location.origin, ''), h.indexOf('intent://127.0.0.1:8765/app.html?source=iab') === 0]; })()"))
            c.grant_permissions(['clipboard-read', 'clipboard-write'], origin='http://127.0.0.1:8765')
            pg.click('#lc87 .cp'); pg.wait_for_timeout(400)
            out(k + ' copy [message, clipboard is this page marked source=iab]', [pg.evaluate("document.getElementById('lc87-ok').textContent"), pg.evaluate("navigator.clipboard.readText()").replace('http://127.0.0.1:8765', '').split('#')[0]])
        if k == 'ig-iphone':
            out(k + ' Safari link', pg.evaluate("document.getElementById('lc87-go').getAttribute('href').replace(location.origin, '')"))
        if k == 'fb-iphone-ios16':
            out(k + ' iOS 16 [copy is the big button, steps]', pg.evaluate("[!!document.querySelector('#lc87-go[data-lc87-copy]'), [...document.querySelectorAll('#lc87 li')].map(l => l.textContent)]"))
        c.close()
    # normal browsers: no gate
    for k in ['chrome-android', 'safari-iphone']:
        c = ctx(br, UAS[k]); pg = c.new_page(); watch(pg, k)
        pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(1200)
        out(k + ' no gate [gate, class, LC87.on]', pg.evaluate("[!!document.getElementById('lc87'), document.documentElement.classList.contains('lc-iab'), LC87.on]"))
        if k == 'safari-iphone':
            pg.click('.hero [data-install]'); pg.wait_for_timeout(600)
            out(k + ' install [still on the landing page, steps sheet, Share step, Add to Home Screen step]', pg.evaluate("[location.pathname, !document.getElementById('ins-ov').hidden, /Share/.test(document.getElementById('ins-body').textContent), /Add to Home Screen/.test(document.getElementById('ins-body').textContent)]"))
        else:
            pg.evaluate("window.__p = 0; const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => { window.__p++; return Promise.resolve(); }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); undefined;")
            pg.click('.hero [data-install]'); pg.wait_for_timeout(300)
            out(k + ' install with the prompt [prompted at once, still on the landing page, no sheet]', pg.evaluate("[window.__p, location.pathname, !document.getElementById('ins-ov') || document.getElementById('ins-ov').hidden]"))
            c.close(); c = ctx(br, UAS[k]); pg = c.new_page(); watch(pg, k + '-late')
            pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(800)
            pg.click('.hero [data-install]'); pg.wait_for_timeout(1800)
            out(k + ' install before Chrome offers it [steps sheet, Install app step]', pg.evaluate("[!document.getElementById('ins-ov').hidden, /Install app/.test(document.getElementById('ins-body').textContent)]"))
            pg.evaluate("window.__p = 0; const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => { window.__p++; return Promise.resolve(); }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); undefined;"); pg.wait_for_timeout(200)
            pg.click('[data-ins-now]'); pg.wait_for_timeout(300)
            out(k + ' the prompt arrives while the steps are open [Install now prompts, sheet closed]', pg.evaluate("[window.__p, document.getElementById('ins-ov').hidden]"))
        pg.goto('http://127.0.0.1:8765/app.html#home'); pg.wait_for_timeout(2500)
        out(k + ' app boots normally [no gate, navigation rendered]', pg.evaluate("[!!document.getElementById('lc87'), !!(document.getElementById('tabs') || {}).innerHTML]"))
        c.close()
    # the owner's test switch
    c = ctx(br, UAS['ig-android']); pg = c.new_page(); watch(pg, 'off')
    pg.add_init_script("window.__lcNav = () => {};")
    pg.goto('http://127.0.0.1:8765/index.html?lc_iab=0'); pg.wait_for_timeout(1000)
    pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(1000)
    out('?lc_iab=0 switches it off for this tab [gate]', pg.evaluate("!!document.getElementById('lc87')"))
    c.close()
    # ---- 9.49.0: the install state and the device-smart Install button ----
    UAS['safari-iphone-26'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
    UAS['chrome-windows'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
    FIRE = "(() => { window.__p = 0; const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => { window.__p++; return Promise.resolve(); }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); window.__ev = e; })();"
    # a. Chrome offers its prompt BEFORE the landing page's own script ran: LC87 (first in the <head>) keeps it, one click installs
    c = ctx(br, UAS['chrome-android']); pg = c.new_page(); watch(pg, 'early')
    _land_src = open(REPO + '/index.html', encoding='utf-8').read()
    _cut = _land_src.index('</script>', _land_src.index('/*@@end lc87*/')) + len('</script>')
    _early = _land_src[:_cut] + '<script>' + FIRE + '</script>' + _land_src[_cut:]
    c.route('**/index.html', lambda r: r.fulfill(status=200, content_type='text/html; charset=utf-8', body=_early))
    pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(800)
    out('early prompt [kept by LC87, default prevented, can-install]', pg.evaluate("[LC87.bip() === window.__ev, window.__ev.defaultPrevented, document.documentElement.classList.contains('can-install')]"))
    pg.click('.hero [data-install]'); pg.wait_for_timeout(300)
    out('early prompt, one click [prompted, still on the landing page, no sheet]', pg.evaluate("[window.__p, location.pathname, !document.getElementById('ins-ov') || document.getElementById('ins-ov').hidden]"))
    c.close()
    # b. already installed on this Android phone (the app ran standalone in the last 60 days): the buttons open the app
    c = ctx(br, UAS['chrome-android']); pg = c.new_page(); watch(pg, 'installed')
    pg.add_init_script("if (!sessionStorage.getItem('t-once')) { sessionStorage.setItem('t-once', '1'); localStorage.setItem('lc-pwa-installed', String(Date.now())); }")
    pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(800)
    out('installed [hero button, all install buttons say it, LC87.installed]', pg.evaluate("[document.querySelector('.hero [data-install]').textContent, [...document.querySelectorAll('[data-install]')].every(a => a.textContent === 'Open the app'), LC87.installed()]"))
    pg.evaluate(FIRE); pg.wait_for_timeout(200)
    out('installed, then Chrome offers its prompt (uninstalled) [label back, flag cleared]', pg.evaluate("[document.querySelector('.hero [data-install]').textContent, localStorage.getItem('lc-pwa-installed')]"))
    pg.evaluate("localStorage.setItem('lc-pwa-installed', String(Date.now()))"); pg.reload(); pg.wait_for_timeout(800)
    pg.click('.hero [data-install]'); pg.wait_for_timeout(1500)
    out('installed, click [opens the app, no install flag in the address]', [pg.url.replace('http://127.0.0.1:8765', '').split('#')[0].split('?')[0], 'install=1' in pg.url])
    c.close()
    c = ctx(br, UAS['chrome-android']); pg = c.new_page(); watch(pg, 'stale')
    pg.add_init_script("localStorage.setItem('lc-pwa-installed', String(Date.now() - 61 * 864e5))")
    pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(800)
    out('installed 61 days ago, never launched since [hero button]', pg.evaluate("document.querySelector('.hero [data-install]').textContent"))
    c.close()
    c = ctx(br, UAS['safari-iphone']); pg = c.new_page(); watch(pg, 'ios-flag')
    pg.add_init_script("localStorage.setItem('lc-pwa-installed', String(Date.now()))")
    pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(800)
    out('iPhone never trusts the flag (Safari and the home-screen app do not share storage) [hero button]', pg.evaluate("document.querySelector('.hero [data-install]').textContent"))
    c.close()
    # c. the app running standalone remembers that it is installed
    c = ctx(br, UAS['chrome-android']); pg = c.new_page(); watch(pg, 'standalone')
    pg.add_init_script("const __mm = window.matchMedia.bind(window); window.matchMedia = (q) => /display-mode:\\s*standalone/.test(q) ? { matches: true, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } } : __mm(q);")
    pg.goto('http://127.0.0.1:8765/app.html#home'); pg.wait_for_timeout(2500)
    out('standalone app [flag set, LC87.installed, no gate]', pg.evaluate("[!!localStorage.getItem('lc-pwa-installed'), LC87.installed(), !!document.getElementById('lc87')]"))
    c.close()
    # d. iPhone: the 2-step visual guide (Safari 17 and Safari 26 with Share behind the ⋯ button)
    for k in ['safari-iphone', 'safari-iphone-26']:
        c = ctx(br, UAS[k]); pg = c.new_page(); watch(pg, k + '-guide')
        pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(800)
        pg.click('.hero [data-install]'); pg.wait_for_timeout(500)
        out(k + ' guide [steps, icons, step 1, step 2, no Install now button, sheet fits]', pg.evaluate("(() => { const b = document.getElementById('ins-body'); const li = [...b.querySelectorAll('.ins-two li')]; const box = document.querySelector('#ins-ov .wl-box'); return [li.length, b.querySelectorAll('.ins-two svg').length, li[0] ? li[0].textContent.replace(/^1/, '').trim() : '', li[1] ? li[1].textContent.replace(/^2/, '').trim() : '', !b.querySelector('[data-ins-now]'), box.scrollWidth <= box.clientWidth]; })()"))
        if k == 'safari-iphone-26':
            out(k + ' guide [Open as Web App note]', pg.evaluate("/Open as Web App/.test(document.getElementById('ins-body').textContent)"))
        pg.click('#ins-body [data-ins-x]'); pg.wait_for_timeout(200)
        out(k + ' Got it [sheet closed, page scrolls again]', pg.evaluate("[document.getElementById('ins-ov').hidden, document.documentElement.style.overflow]"))
        c.close()
    # e. a computer with Chrome that has not offered its prompt (yet): one step, the install icon in the address bar
    c = br.new_context(viewport={'width': 1280, 'height': 800}, user_agent=UAS['chrome-windows']); c.route('**/*', route); c.add_init_script(script=INIT); pg = c.new_page(); watch(pg, 'desktop')
    pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(800)
    pg.click('.hero [data-install]'); pg.wait_for_timeout(1800)
    out('desktop Chrome without a prompt [sheet, one step, install icon step, subtitle]', pg.evaluate("[!document.getElementById('ins-ov').hidden, document.querySelectorAll('#ins-body .ins-steps li').length, /install icon/.test(document.getElementById('ins-body').textContent), document.getElementById('ins-sub').textContent]"))
    c.close()
    br.close()
a = open(REPO + '/app.html', encoding='utf-8').read(); l = open(REPO + '/index.html', encoding='utf-8').read(); m = open(REPO + '/lc87.js', encoding='utf-8').read().strip()
out('LC87 [same text in lc87.js, app.html and index.html, first script in both heads]', [m in a, m in l, a.index('/*@@module lc87*/') < a.index('</head>') and a.index('/*@@module lc87*/') < a.index('<script', a.index('<head>') + 7) + 20, l.index('/*@@module lc87*/') < l.index('<script', l.index('<head>')) + 20])
out('LC87 detection [Instagram, TikTok, Facebook, Messenger, Snapchat, Pinterest, LINE | Chrome, Safari, Firefox, Samsung, Edge]', [[__import__('re').search(r'FBAN|FBAV|FB_IAB|FBIOS|FB4A|Instagram|TikTok|musical_ly|BytedanceWebview|Bytedance|trill_|Snapchat|Twitter|LinkedInApp|Pinterest|Line/', u, __import__('re').I) is not None for u in [UAS['ig-android'], UAS['tiktok-android'], UAS['fb-iphone-ios16'], 'Mozilla/5.0 (Linux; Android 14) [FB_IAB/MESSENGER;FBAV/451.0]', 'Snapchat/12.90 (iPhone)', 'Mozilla/5.0 Pinterest for iOS/12', 'Mozilla/5.0 Line/14.1.0']],
    [__import__('re').search(r'FBAN|FBAV|FB_IAB|FBIOS|FB4A|Instagram|TikTok|musical_ly|BytedanceWebview|Bytedance|trill_|Snapchat|Twitter|LinkedInApp|Pinterest|Line/', u, __import__('re').I) is not None for u in [UAS['chrome-android'], UAS['safari-iphone'], 'Mozilla/5.0 (Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0', 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 Edg/124.0']]])
_mf = __import__('json').load(open(REPO + '/manifest.webmanifest', encoding='utf-8'))
out('manifest standalone [display, display_override, scope, start_url, theme, background]', [_mf['display'], _mf['display_override'], _mf['scope'], _mf['start_url'], _mf['theme_color'], _mf['background_color']])
_tags = lambda t: ['<meta name="apple-mobile-web-app-capable" content="yes">' in t, '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">' in t, '<meta name="apple-mobile-web-app-title" content="Lanckriet Chess">' in t, '<meta name="theme-color" content="#0f172a">' in t]
out('iOS standalone tags [capable, black-translucent, title, theme] landing | app', [_tags(l), _tags(a)])
out('service worker [skipWaiting, clients.claim, app checks every 30 min and when back online]', ['self.skipWaiting()' in open(REPO + '/sw.js').read(), 'self.clients.claim()' in open(REPO + '/sw.js').read(), 'setInterval(()=>{if(document.visibilityState==="visible")check()},18e5);window.addEventListener("online",check)' in a])
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
