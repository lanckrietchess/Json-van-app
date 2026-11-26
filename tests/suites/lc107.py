# lc107 (9.75.0): the road after the first review. The roadmap gift for the player's own rating (watch, switch, install), #roadmap and
# the Library card, the install button (Instagram / TikTok -> Chrome / Safari, Chrome's own prompt), one sale card per review (trial or
# book, mid-review when 3+ key moments, never for members), the day-4 book step, plain words and the last lost game in the first
# review, LC97's post-trial pop-up with the Sprint bonus, and the landing quick start straight into the review.
# Real Chromium, 390x844; Supabase stubbed.
import json as _json, datetime as _dt
APP = 'http://127.0.0.1:8765/app.html'
SB = 'https://wllljllajadiwjdsageu.supabase.co'
MEMBER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'm', refresh_token: '', exp: Date.now() + 36e5, email: 'free@example.com' }))"
OLD = "localStorage.setItem('lc34-first', JSON.stringify(Date.now() - 20 * 864e5))"
OVER = "Math.max(0, document.documentElement.scrollWidth - innerWidth)"
SEGV = {'ok': True, 'v': {'v': 1, 'on': True, 'segs': {'0-800': {'url': 'https://youtu.be/sgzNv092cVU', 'live': True}, '800-1200': {'url': 'https://youtu.be/UvSrFTXZOTY', 'live': True},
        '1200-1600': {'url': 'https://youtu.be/fCIybWKa6k0', 'live': True}, '1600-2000': {'url': 'https://youtu.be/FOEa0wKr7nY', 'live': True}, '2000-plus': {'url': 'https://youtu.be/HhzG0BMTTCA', 'live': True}}}}
UNTIL = (_dt.datetime.now(_dt.timezone.utc) + _dt.timedelta(hours=30)).strftime('%Y-%m-%dT%H:%M:%SZ')
def stub(pg, calls):
    def rpc(route, request):
        n = request.url.split('/rpc/')[1].split('?')[0]; body = _json.loads(request.post_data or '{}'); calls.append([n, body])
        J = lambda o, st=200: route.fulfill(status=st, content_type='application/json', body=_json.dumps(o))
        if n == 'lc89_cfg_public' and body.get('p_k') == 'segvideo': return J(SEGV)
        if n == 'lc70_catalog': return J({'ok': True, 'items': [], 'claims': {}, 'me': {}})
        if n == 'lc106_state': return J({'ok': True, 'joined': False, 'linked': False, 'xp_goal': 1500, 'pct': 20})
        if n == 'lc97_state': return J({'ok': True, 'signed_in': True, 'sub_status': 'trial_ended', 'trial_eligible': False, 'trial': {'used': True, 'started_at': '2026-11-10T10:00:00Z', 'ends_at': '2026-11-17T10:00:00Z'}, 'post_trial': {}, 'discount': {}, 'tokens': {}})
        return J({'ok': False, 'error': 'stub'})
    pg.route(SB + '/rest/v1/rpc/**', rpc)
def fresh(br, tag, hash='#home', pre='', who=MEMBER):
    calls = []
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc107-' + tag); stub(pg, calls)
    pg.goto('http://127.0.0.1:8765/version.json')
    if who: pg.evaluate(who)
    pg.evaluate(OLD); pg.evaluate("localStorage.setItem('lc-hub-v2', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('lc-hub-v2') || '{}'), { profile: { name: 'Free', elo: 1340 } })))")
    if pre: pg.evaluate(pre)
    pg.goto(APP + hash); pg.wait_for_timeout(2600)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
    return c, pg, calls
with sync_playwright() as p:
    br = p.chromium.launch()
    c, pg, calls = fresh(br, 'gift')
    out('pure [segments, YouTube ids, sale card]', pg.evaluate("""(() => { const T = LC107._t; return [[0, 799, 800, 1340, 1999, 2105].map(T.segOf), T.ytId('https://youtu.be/sgzNv092cVU'), T.ytId('https://www.youtube.com/watch?v=UvSrFTXZOTY&t=3'),
      [T.pickCard({member: true, trial: true}), T.pickCard({trial: true, n: 0}), T.pickCard({trial: true, book: true, n: 1}), T.pickCard({trial: false, book: true}), T.pickCard({trial: false, book: true, bookOwned: true})]]; })()"""))
    pg.evaluate("LC107._t.loadCfg(true)"); pg.wait_for_timeout(600)
    out('gift [title, my segment, watch, install, library line]', pg.evaluate("""(() => { const d = document.createElement('div'); d.innerHTML = LC107.giftHTML(); const t = d.textContent;
      return [/Your gift for finishing your first review/.test(t), /1200 - 1600 Elo/.test(t), !!d.querySelector('[data-lc107=watch][data-seg="1200-1600"]'), !!d.querySelector('[data-lc107=install]'), !!d.querySelector('a[href="#roadmap"]')]; })()"""))
    pg.evaluate("LC107.watch('1200-1600')"); pg.wait_for_timeout(700)
    out('watch [sheet, my video, five ratings]', pg.evaluate("""(() => { const f = document.querySelector('.lc107-sheet iframe'); return [!!f, f ? /fCIybWKa6k0/.test(f.src) : false, document.querySelectorAll('.lc107-sheet [data-lc107-seg]').length]; })()"""))
    pg.click('.lc107-sheet [data-lc107-seg="0-800"]'); pg.wait_for_timeout(300)
    out('switch rating [the video changes]', pg.evaluate("/sgzNv092cVU/.test(document.querySelector('.lc107-sheet iframe').src)"))
    out('sheet phone [overflow-x]', pg.evaluate(OVER))
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
    pg.evaluate("window.__outTo = ''; window.LC87 = Object.assign({}, window.LC87 || {}, { out: u => { window.__outTo = u } }); window.__lcIab = 'soft'; LC107.install()"); pg.wait_for_timeout(200)
    out('install inside Instagram [opens the app address in the real browser]', pg.evaluate("[window.__outTo.indexOf('http://127.0.0.1:8765/app.html') === 0, (window.__outTo.match(/http/g) || []).length]"))
    pg.evaluate("window.__lcIab = false; window.LC87.isIab = () => false; window.__p = 0; window.__lcBip = { prompt: () => { window.__p++ }, userChoice: Promise.resolve({ outcome: 'dismissed' }) }; LC107.install()"); pg.wait_for_timeout(200)
    out('install with Chrome\'s prompt [native prompt]', pg.evaluate("window.__p"))
    pg.evaluate("location.hash = '#roadmap'"); pg.wait_for_timeout(1500)
    out('#roadmap [title, five ratings, mine selected, video]', pg.evaluate("""(() => { const p = document.querySelector('[data-lc107-page]'); const on = p.querySelector('[data-lc107-seg][aria-pressed=true]');
      return [p.querySelector('h1').textContent.replace(/\\W+$/, '').trim(), p.querySelectorAll('[data-lc107-seg]').length, on && on.getAttribute('data-lc107-seg'), !!p.querySelector('iframe')]; })()"""))
    out('#roadmap phone [overflow-x]', pg.evaluate(OVER))
    pg.evaluate("location.hash = '#books'"); pg.wait_for_timeout(1800)
    out('Library card [on #books, links to #roadmap]', pg.evaluate("(() => { const a = document.querySelector('[data-lc107-lib] a'); return a ? [a.getAttribute('href'), /The 2000 Elo Roadmap/.test(a.textContent)] : null; })()"))
    # a review report with 3 key moments
    pg.evaluate("location.hash = '#trim'"); pg.wait_for_timeout(1500)
    out('before the Day-7 pop-up [no sale card, no book step]', pg.evaluate("""(async () => { localStorage.removeItem('lc90-seen'); localStorage.setItem('lc94-first', JSON.stringify(Date.now() - 3 * 864e5)); try { LC97.hadTrial = () => false } catch (e) {}
      LC107._t.setBook({ id: 'roadmap-2000', kind: 'book', title: 'The 2000 Elo Roadmap', price_cents: 999, buy_link: 'https://buy.stripe.com/test123' });
      let r = document.querySelector('#an-report'); if (!r) { r = document.createElement('div'); r.id = 'an-report'; document.querySelector('#view').appendChild(r) }
      r.innerHTML = '<ul><li><button data-act="goto">m1</button></li></ul>'; await LC107._t.reviewCard(); return [!!document.querySelector('#an-report [data-lc107-sale]'), LC107._t.afterPopup(), LC107.bookStep()]; })()"""))
    pg.evaluate("localStorage.setItem('lc90-seen', JSON.stringify(Date.now())); 0")
    pg.evaluate("""(() => { localStorage.removeItem('lc107-cards'); LC107._t.setBook(null); try { LC97.trialEligible = () => true } catch (e) {}
      let r = document.querySelector('#an-report'); if (!r) { r = document.createElement('div'); r.id = 'an-report'; document.querySelector('#view').appendChild(r) }
      r.innerHTML = '<ul class="rv-keys"><li><button data-act="goto">m1</button></li><li><button data-act="goto">m2</button></li><li><button data-act="goto">m3</button></li></ul>'; })()""")
    pg.wait_for_timeout(1500)
    out('review card [trial, after the first key moment, once]', pg.evaluate("""(() => { const c = document.querySelector('#an-report [data-lc107-sale]'); if (!c) return null; const first = document.querySelector('#an-report li');
      return [c.getAttribute('data-lc107-sale'), first.nextElementSibling === c, document.querySelectorAll('#an-report [data-lc107-sale]').length]; })()"""))
    pg.evaluate("""(() => { const r = document.querySelector('#an-report'); r.innerHTML = '<p>other game</p><ul><li><button data-act="goto">x</button></li></ul>'; LC107._t.setBook({ id: 'roadmap-2000', kind: 'book', title: 'The 2000 Elo Roadmap', price_cents: 999, buy_link: 'https://buy.stripe.com/test123' }); })()""")
    pg.wait_for_timeout(1500)
    out('second review [the book takes its turn, at the end, price]', pg.evaluate("""(() => { const c = document.querySelector('#an-report [data-lc107-sale]'); return c ? [c.getAttribute('data-lc107-sale'), c === document.querySelector('#an-report').lastElementChild, /€9\\.99/.test(c.textContent)] : null; })()"""))
    out('book step [after the Day-7 pop-up; not after a trial]', pg.evaluate("""(() => { try { LC97.hadTrial = () => false } catch (e) {} const a = LC107.bookStep();
      LC97.hadTrial = () => true; const b = LC107.bookStep(); LC97.hadTrial = () => false; return [!!a && a.acts[0].label, b]; })()"""))
    out('first review in plain words [no system words, last lost game first]', pg.evaluate("""(() => { const p = LC42._t.plain, o = LC42._t.gameOrder;
      const t = p('A CCA scan finds it. Name the Alarm Signal and run the Working Point (the P of MSPC). Action Step: look.');
      return [/CCA|Alarm|Working|MSPC|Action Step/.test(t), t, o([{pgn: 'a', res: 'win'}, {pgn: 'b', res: 'loss'}, {res: 'loss'}, {pgn: 'c', res: 'draw'}, {pgn: 'd', res: 'loss'}]).map(g => g.pgn).join('')]; })()"""))
    # LC97's post-trial pop-up with an open Sprint bonus
    pg.evaluate("LC106._t.set({ ok: true, joined: true, started_at: '2026-11-10T10:00:00Z', ends_at: '2026-11-24T10:00:00Z', reward_kind: 'month', reward_active: true, reward_used: false, reward_until: '" + UNTIL + "', pct: 20, start: 1300, now: 1350, gain: 50, target: 75, xp: 1600, xp_goal: 1500 })")
    pg.evaluate("location.hash = '#home'"); pg.wait_for_timeout(1200)
    pg.evaluate("LC97.preview(); 0"); pg.wait_for_timeout(1500)
    out('post-trial pop-up [the 13th month on the yearly option, live countdown]', pg.evaluate("""(() => { const b = document.querySelector('[data-lc97="yearly"]'); return b ? [/13 months for the price of 12/.test(b.textContent), /\\d+h \\d\\dm/.test(b.textContent)] : 'no pop-up'; })()"""))
    out('LC107 [embedded copy equals lc107.js, init, afterRender, route, LC88 book step, gift in LC42, build]', pg.evaluate("""(async () => {
      const src = await (await fetch('lc107.js')).text(), html = await (await fetch('app.html')).text();
      const a = html.indexOf('/*@@module lc107*/'), b = html.indexOf('/*@@end lc107*/') + 15;
      return [html.slice(a, b) === src.trim(), html.includes('try{LC107.init()}'), html.includes('LC107.afterRender(route)'), html.includes('roadmap:v=>typeof LC107'), html.includes('LC107.bookStep()'), html.includes('LC107.giftHTML()'), LC107.version]; })()"""))
    c.close()
    # the landing quick start: straight into the review
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc107-landing')
    pg.route(SB + '/rest/v1/rpc/**', lambda r, q: r.fulfill(status=200, content_type='application/json', body='null'))
    pg.goto('http://127.0.0.1:8765/index.html?src=tt_bio'); pg.wait_for_timeout(1500)
    pg.evaluate("window.__nav = ''; window.__lcNav = u => { window.__nav = u }; window.__lcInstall = () => { window.__inst = 1; return 'prompt' }; 0")
    pg.fill('#lc94-qs input[name], #lc94-qs input', 'kyenzotest'); pg.evaluate("document.querySelector('#lc94-qs').requestSubmit ? document.querySelector('#lc94-qs').requestSubmit() : document.querySelector('#lc94-qs button[type=submit]').click()"); pg.wait_for_timeout(600)
    out('landing quick start [straight to the review, no install first, name kept]', pg.evaluate("[window.__nav, !!window.__inst, (JSON.parse(localStorage.getItem('lc102-handoff') || '{}')).u || '']"))
    c.close()
    br.close()
# the fake review report has no real moments behind its buttons: Trim's own focusMoment trips over it (not a real case)
real = [e for e in errs if 'Failed to load resource' not in e and "reading 'items'" not in e]
print('ERRORS', len(real))
for e in real[:8]: print('  ', e[:300])
