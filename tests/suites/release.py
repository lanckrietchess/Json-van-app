# release (9.26.0): the cache fix, the landing page install, the live address, the owner switch and the Studio additions.
# Runs against app.html (the app) and index.html (the landing page), the way they are deployed.
import re as _re
APP = 'http://127.0.0.1:8765/app.html'
LAND = 'http://127.0.0.1:8765/index.html'
_src = open(REPO + '/app.html', encoding='utf-8').read()
_land = open(REPO + '/index.html', encoding='utf-8').read()
_man = open(REPO + '/manifest.webmanifest', encoding='utf-8').read()
_reset = open(REPO + '/reset.html', encoding='utf-8').read()
# static checks: one version, the live address, no v17
out('versions [CONFIG.version, assetVersion, sw, version.json]', [_re.search(r'const CONFIG=\{version:"([^"]+)"', _src).group(1), _re.search(r'assetVersion:"([^"]+)"', _src).group(1), _re.search(r'serviceWorker:"(sw\.js\?v=[^"]+)"', _src).group(1), open(REPO + '/version.json').read().strip()])
out('old address left in app/landing/stripe defaults', [_src.count('https://lanckrietchess-app.vercel.app'), _land.count('lanckrietchess-app.vercel.app'), open(REPO + '/functions/stripe/stripe.js').read().count("DEFAULT_ORIGIN = 'https://lanckrietchesstrainerhub.vercel.app'")])
out('landing [launch links, manifest link, install buttons]', [_land.count('Launch the app'), bool(_re.search(r'<link rel="manifest" href="/manifest\.webmanifest\?v=9\.26\.0">', _land)), _land.count('data-install href="/app.html?install=1"')])
out('manifest [id, start_url, scope]', [_re.search(r'"id": "([^"]+)"', _man).group(1), _re.search(r'"start_url": "([^"]+)"', _man).group(1), _re.search(r'"scope": "([^"]+)"', _man).group(1)])
out('reset target', _re.search(r'var TARGET = "([^"]+)"', _reset).group(1))
import json as _json, subprocess as _sp
_al = _json.load(open(REPO + '/.well-known/assetlinks.json', encoding='utf-8'))
out('assetlinks [relation, package]', [_al[0]['relation'][0], _al[0]['target']['package_name']])
for _t in ['tests/sw.test.js', 'tests/sw.test.mjs', 'tests/stripe.test.mjs']:
    _r = _sp.run(['node', _t], cwd=REPO, capture_output=True, text=True, timeout=120)
    out('node ' + _t, (_r.stdout.strip().splitlines() or ['no output'])[-1] + ('' if _r.returncode == 0 else ' (exit ' + str(_r.returncode) + ')'))
out('studio [silence default, auto subtitles button]', [_re.search(r'thr:-45,minSil:([.\d]+),', _src).group(1), 'id:"lc33-auto",text:autoState.busy?"Stop writing subtitles":"Auto English subtitles"' in _src])
with sync_playwright() as p:
    br = p.chromium.launch()
    # 1. the landing page: one click opens the browser's own install prompt
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'landing')
    pg.goto(LAND); pg.wait_for_timeout(600)
    pg.evaluate("""() => { window.__prompted = 0; const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => { window.__prompted++; return Promise.resolve(); }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); }""")
    pg.click('.hero [data-install]'); pg.wait_for_timeout(300)
    out('landing install click [prompted, still on landing, message]', [pg.evaluate('window.__prompted'), pg.url.endswith('/index.html'), pg.evaluate("(document.getElementById('lc-inst') || {}).textContent || ''")])
    out('landing phone [overflow-x]', pg.evaluate('Math.max(0, document.documentElement.scrollWidth - window.innerWidth)'))
    c.close()
    # without a prompt (iPhone, in-app browsers) the button still opens the app's install guide
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'landing2')
    pg.add_init_script("delete window.onbeforeinstallprompt; Object.defineProperty(window, 'onbeforeinstallprompt', { value: undefined, configurable: true }); delete window.onbeforeinstallprompt;")
    docs = []; pg.on('request', lambda r: docs.append(r.url.replace('http://127.0.0.1:8765', '')) if r.resource_type == 'document' else None)
    pg.goto(LAND); pg.wait_for_timeout(400)
    pg.click('.hero [data-install]'); pg.wait_for_timeout(1500)
    out('no prompt available: the button opens', (docs + [''])[1])
    c.close()
    # 2. the app: version, live address, service worker
    c = mkctx(br, 1280, 900); pg = c.new_page(); watch(pg, 'app')
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate("caches.open('lc-shell-9.25.0').then(c => c.put('app.html', new Response('OLD BUILD')))")   # what a 9.25.0 install has on the phone
    pg.goto(APP + '#home'); pg.wait_for_timeout(1500)
    out('app [CONFIG.version, footer shows, SiteURL production]', pg.evaluate("[CONFIG.version, (document.body.innerText.match(/v9\\.26\\.0|v17\\.0\\.0/) || [''])[0], SiteURL.production()]"))
    out('preview check [live, old live, per-commit link, localhost]', pg.evaluate("['lanckrietchesstrainerhub.vercel.app','lanckrietchess-app.vercel.app','json-van-app-git-x-lanckrietchess.vercel.app','127.0.0.1'].map(h => LC52._t.isPreviewHost(h))"))
    pg.wait_for_function("navigator.serviceWorker.controller !== null || navigator.serviceWorker.getRegistration().then(r => r && r.active)", timeout=20000)
    pg.wait_for_timeout(1500)
    pg.reload(); pg.wait_for_timeout(2500)
    out('service worker [script, controls the page, caches]', pg.evaluate("Promise.all([navigator.serviceWorker.getRegistration().then(r => r && r.active ? r.active.scriptURL.replace(location.origin, '') : ''), !!navigator.serviceWorker.controller, caches.keys()]).then(a => [a[0], a[1], a[2].sort()])"))
    out('old 9.25.0 shell cache deleted', pg.evaluate("caches.keys().then(k => k.indexOf('lc-shell-9.25.0') < 0)"))
    out('network-first: the page is the newest build', pg.evaluate("document.documentElement.outerHTML.indexOf('OLD BUILD') < 0 && CONFIG.version"))
    # 3. the owner signs in: admin mode, the mode switcher bottom right
    pg.evaluate("localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))")
    pg.reload(); pg.wait_for_timeout(2500)
    out('owner [owner account, admin on, switcher, label]', pg.evaluate("[LC49.ownerAccount(), LC49.active(), !!document.getElementById('lc49-float'), (document.getElementById('lc49-float') || {}).textContent || '']"))
    c.close()
    br.close()

# 4. Auto English subtitles: the REAL autoSubs code from app.html, a real recorded clip with sound, and a stand-in speech service
#    that only accepts an audio TRACK (never the microphone) and answers with two sentences while the clip plays.
_i = _src.index('  const autoState={busy:false,stop:null};'); _j = _src.index('  /* ---------- timing helpers: captions on the edited timeline')
_auto = _src[_i:_j]
_k = _src.index('  function chunk(lines,maxWords){'); _chunk = _src[_k:_src.index('  /* ---------- captions from the script', _k)]
with sync_playwright() as p:
    br = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    c = mkctx(br, 800, 600); pg = c.new_page(); watch(pg, 'subs')
    pg.goto('http://127.0.0.1:8765/version.json')
    res = pg.evaluate("""async ([auto, chunkSrc]) => {
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const g = cv.getContext('2d');
      const ac = new AudioContext(); const osc = ac.createOscillator(); const d = ac.createMediaStreamDestination(); osc.connect(d); osc.start();
      const st = new MediaStream(cv.captureStream(15).getVideoTracks().concat(d.stream.getAudioTracks()));
      const mr = new MediaRecorder(st); const parts = []; mr.ondataavailable = e => parts.push(e.data);
      const iv = setInterval(() => { g.fillStyle = '#' + Math.floor(Math.random() * 4095).toString(16).padStart(3, '0'); g.fillRect(0, 0, 64, 64); }, 60);
      mr.start(); await new Promise(r => setTimeout(r, 3200)); mr.stop(); await new Promise(r => mr.onstop = r); clearInterval(iv); osc.stop();
      const blob = new Blob(parts, { type: 'video/webm' });
      const log = { gotTrack: false, mic: false, local: null };
      class FakeSR { static async available(o) { return 'available'; } static async install() { return true; }
        start(track) { if (!(track instanceof MediaStreamTrack)) { log.mic = true; throw new Error('mic'); } log.gotTrack = track.kind; log.local = this.processLocally === true;
          const say = (i, txt, at) => setTimeout(() => { const r = [{ transcript: txt }]; r.isFinal = false; this.onresult({ resultIndex: i, results: Object.assign([], { [i]: r, length: i + 1 }) });
            setTimeout(() => { const f = [{ transcript: txt }]; f.isFinal = true; this.onresult({ resultIndex: i, results: Object.assign([], { [i]: f, length: i + 1 }) }); }, 600); }, at);
          say(0, 'Every move starts with the opponent', 300); say(1, 'what did their last move change on the board today', 1500); }
        stop() { setTimeout(() => this.onend && this.onend(), 50); } }
      const SRC = () => FakeSR, clean = t => String(t || '').split(' ').filter(Boolean).join(' ').trim();
      const h = (tag, props) => { const e = document.createElement(tag); Object.keys(props || {}).forEach(k => { if (k === 'style') Object.assign(e.style, props.style); else e[k] = props[k]; }); return e; };
      const mod = new Function('SRC', 'clean', 'h', chunkSrc + auto + '; return { autoSubs, trackSupport, autoState };')(SRC, clean, h);
      const t = { id: 1, url: URL.createObjectURL(blob), durationMs: 3200 };
      const ticks = []; const r = await mod.autoSubs(t, (cur, dur) => ticks.push(cur));
      return { ok: r.ok, local: r.local, n: r.lines && r.lines.length, lines: r.lines, log, ticks: ticks.length, busyAfter: mod.autoState.busy, videosLeft: document.querySelectorAll('video').length, support: mod.trackSupport() };
    }""", [_auto, _chunk])
    out('auto subtitles [ok, on device, captions, track not mic, busy after, players left]', [res['ok'], res['local'], res['n'], [res['log']['gotTrack'], res['log']['mic']], res['busyAfter'], res['videosLeft']])
    out('auto subtitles [first two lines, max 8 words, inside the clip]', [[l['t'] for l in res['lines']][:2], max(len(l['t'].split()) for l in res['lines']), all(0 <= l['s'] < l['e'] <= 4.5 for l in res['lines'])])
    c.close(); br.close()
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
