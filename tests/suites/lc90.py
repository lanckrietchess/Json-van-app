# lc90 (9.52.0): the Day-7 Founding Member pop-up and the Paywall & Founding Offer Editor. Real Chromium, 390x844 and 1280x800, Supabase and
# the Stripe function stubbed. A free player whose 3-tokens-a-day week is over gets the pop-up once (live Founding prices, the owner's texts and
# features, consent before the trial), the trial goes to the Stripe function with plan + src and opens Stripe; a player still in the week, a
# second visit, and the owner never get it by themselves. The editor (owner only): edit, add a feature, Preview Pop-up (no checkout), the
# "for life" wording is refused, Save & Publish sends exactly the cleaned config to lc89_cfg_save.
import json as _json
APP = 'http://127.0.0.1:8765/app.html'
SB = 'https://wllljllajadiwjdsageu.supabase.co'
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
MEMBER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'm', refresh_token: '', exp: Date.now() + 36e5, email: 'anna@example.com' }))"
OLD = "localStorage.setItem('lc34-first', JSON.stringify(Date.now() - 8 * 864e5))"
NEW = "localStorage.setItem('lc34-first', JSON.stringify(Date.now() - 2 * 864e5))"
PAYWALL = {'on': True, 'title': 'Your intro week is over', 'subtitle': 'From today: 1 token a day.', 'use_live': True, 'trial_days': 7,
           'features': [{'t': 'Every course included', 'on': True}, {'t': 'Hidden line', 'on': False}, {'t': 'The Test Panel', 'on': True}]}
PRICING = {'ok': True, 'tier': 2, 'tranche': 1, 'left': [37, 100, 100], 'sold': [63, 0, 0], 'caps': [100, 100, 100], 'yearly': [19950, 29925, 35910, 39900], 'base': 39900, 'monthly': 3900, 'discountPct': [50, 25, 10], 'vip': {'ok': True, 'tier': 3, 'tranche': 1, 'left': [100, 100, 100], 'yearly': [29950, 44925, 53910, 59900], 'base': 59900, 'monthly': 5900, 'discountPct': [50, 25, 10]}}
def stub(pg, calls, seen=False, paywall=PAYWALL):
    def rpc(route, request):
        n = request.url.split('/rpc/')[1].split('?')[0]; body = _json.loads(request.post_data or '{}'); calls.append([n, body])
        J = lambda o, st=200: route.fulfill(status=st, content_type='application/json', body=_json.dumps(o))
        if n == 'lc89_cfg_public': return J({'ok': True, 'k': body.get('p_k'), 'v': paywall if body.get('p_k') == 'paywall' else {}})
        if n == 'lc89_paywall_seen': return J({'ok': True, 'signed_in': True, 'seen': seen})
        if n in ('lc89_paywall_log', 'lc89_cfg_save'): return J({'ok': True})
        if n == 'lc89_paywall_stats': return J({'ok': True, 'days': 30, 'counts': {'shown': 40, 'trial': 6, 'yearly': 2, 'later': 20}})
        return route.fulfill(status=404, body='')
    def fn(route, request):
        path = request.url.split('/functions/v1/stripe/')[1].split('?')[0]; body = _json.loads(request.post_data or '{}'); calls.append(['stripe/' + path, body])
        if path == 'pricing': return route.fulfill(status=200, content_type='application/json', body=_json.dumps(PRICING))
        if path == 'trial': return route.fulfill(status=200, content_type='application/json', body=_json.dumps({'ok': True, 'url': 'https://checkout.stripe.com/c/pay/cs_test_trial', 'tranche': 1}))
        return route.fulfill(status=404, body='{}')
    pg.route(SB + '/rest/v1/rpc/**', rpc)
    pg.route(SB + '/functions/v1/stripe/**', fn)
    pg.route('https://checkout.stripe.com/**', lambda r: r.fulfill(status=200, content_type='text/html', body='<title>Stripe</title>stripe'))
def boot(pg, *js):
    pg.goto('http://127.0.0.1:8765/version.json')
    for x in js: pg.evaluate(x)
SHEET = "document.querySelector('.lc90-sheet')"
with sync_playwright() as p:
    br = p.chromium.launch()
    for w, hh, mob, tag in [(390, 844, True, 'phone'), (1280, 800, False, 'desktop')]:
        calls = []
        c = mkctx(br, w, hh, mob); pg = c.new_page(); watch(pg, 'lc90-' + tag); stub(pg, calls)
        boot(pg, MEMBER, OLD)
        pg.goto(APP + '#home'); pg.wait_for_timeout(1500)
        pg.evaluate("document.querySelectorAll('.sheet-wrap:not(.lc90-sheet) [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
        pg.evaluate("LC90._t.reset(); LC90.check('test')"); pg.wait_for_timeout(2500)
        out(tag + ' day 8, free [pop-up open, title, prices, struck price, features shown, trial button locked]', pg.evaluate("(() => { const s = " + SHEET + "; if (!s) return [false]; return [true, s.getAttribute('aria-label'), [...s.querySelectorAll('[data-tierbox=\"pro\"] .lc90-price strong')].map(x => x.textContent), (s.querySelector('[data-tierbox=\"pro\"] .lc90-price s') || {}).textContent, [...s.querySelectorAll('[data-tierbox=\"pro\"] .lc90-feats li')].map(x => x.textContent.trim()), s.querySelector('[data-lc90=\"go\"]').disabled]; })()"))
        out(tag + ' pop-up texts [eyebrow, badge, button]', pg.evaluate("(() => { const s = " + SHEET + "; return [s.querySelector('.lc90-eye').textContent, (s.querySelector('.lc90-badge') || {}).textContent, s.querySelector('[data-lc90=\"go\"]').textContent.trim()]; })()"))
        out(tag + ' pop-up layout [overflow-x, sheet inside the screen width]', pg.evaluate("[Math.max(0, document.documentElement.scrollWidth - innerWidth), document.querySelector('.lc90-sheet').getBoundingClientRect().width <= innerWidth]"))
        pg.screenshot(path=SHOTS + '/lc90-popup-' + tag + '.png')
        out(tag + ' logged and remembered [shown logged, seen asked, device flag]', [any(x[0] == 'lc89_paywall_log' and x[1].get('p_kind') == 'shown' for x in calls), any(x[0] == 'lc89_paywall_seen' for x in calls), pg.evaluate("!!localStorage.getItem('lc-hub-lc90-seen') || !!Object.keys(localStorage).find(k => /lc90-seen/.test(k))")])
        out(tag + ' VIP path [two tier cards, VIP box hidden, VIP live prices, VIP extras, no trial in VIP]', pg.evaluate("(() => { const s = " + SHEET + "; return [s.querySelectorAll('.lc90-tier').length, s.querySelector('[data-tierbox=\"vip\"]').hidden, [...s.querySelectorAll('[data-tierbox=\"vip\"] .lc90-price strong')].map(x => x.textContent), [...s.querySelectorAll('[data-tierbox=\"vip\"] .lc90-feats li')].length, !s.querySelector('[data-tierbox=\"vip\"] [data-lc90-ok]')]; })()"))
        pg.evaluate("(() => { const s = " + SHEET + "; s.querySelector('input[name=\"lc90-tier\"][value=\"vip\"]').click(); })()"); pg.wait_for_timeout(200)
        out(tag + ' VIP chosen [pro box hidden, vip box shown]', pg.evaluate("(() => { const s = " + SHEET + "; return [s.querySelector('[data-tierbox=\"pro\"]').hidden, s.querySelector('[data-tierbox=\"vip\"]').hidden]; })()"))
        pg.screenshot(path=SHOTS + '/lc90-popup-vip-' + tag + '.png')
        pg.evaluate("(() => { const s = " + SHEET + "; s.querySelector('input[name=\"lc90-tier\"][value=\"pro\"]').click(); })()"); pg.wait_for_timeout(200)
        pg.evaluate("(() => { const s = " + SHEET + "; s.querySelector('[data-lc90-ok]').click(); s.querySelector('[data-lc90=\"go\"]').click(); })()"); pg.wait_for_timeout(1500)
        tr = [x[1] for x in calls if x[0] == 'stripe/trial']
        out(tag + ' trial [sent plan, src, token present, opened Stripe]', [tr[0].get('plan') if tr else None, tr[0].get('src') if tr else None, bool(tr and tr[0].get('token')), pg.evaluate("location.host")])
        c.close()
    # the VIP button: checkout with tier 3, counted as "vip"
    calls = []
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc90-vip'); stub(pg, calls)
    boot(pg, MEMBER, OLD); pg.goto(APP + '#home'); pg.wait_for_timeout(1500)
    pg.evaluate("document.querySelectorAll('.sheet-wrap:not(.lc90-sheet) [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
    pg.evaluate("LC90._t.reset(); LC90.check('test')"); pg.wait_for_timeout(2500)
    pg.evaluate("window.__co = null; if (typeof LC44 !== 'undefined') LC44.checkout = (p, t) => { window.__co = [p, t]; return true }; LC36.support.checkout = (p, t) => { window.__co = [p, t]; return true }; undefined;")
    pg.evaluate("(() => { const s = " + SHEET + "; s.querySelector('input[name=\"lc90-tier\"][value=\"vip\"]').click(); s.querySelector('input[name=\"lc90-vplan\"][value=\"monthly\"]').click(); s.querySelector('[data-lc90=\"vip\"]').click(); })()"); pg.wait_for_timeout(800)
    out('VIP button [checkout plan + tier, counted, sheet closed]', [pg.evaluate("window.__co"), any(x[0] == 'lc89_paywall_log' and x[1].get('p_kind') == 'vip' for x in calls), pg.evaluate("!" + SHEET)])
    c.close()
    # layered access (9.53.0): Beginner open in the intro week, Intermediate / Advanced / Master locked, no credit unlock for them
    ACC = "[Levels.open({id: 'acc-l1', lvl: 1}), Levels.open({id: 'acc-l2', lvl: 2}), Levels.open({id: 'acc-l3', lvl: 3}), Levels.open({id: 'acc-l5', lvl: 5}), !!(Credits.unlock({id: 'acc-l3', lvl: 3}) || {}).strict, /fa-lock|lock/.test(lockBadge({id: 'acc-l4', lvl: 4}))]"
    for label, js, cfgv in [('day 3, free', NEW, PAYWALL), ('day 8, free', OLD, PAYWALL), ('day 3, free, owner switched Beginner off and strict off', NEW, dict(PAYWALL, beginner_in_week=False, strict_lock=False))]:
        c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc90-acc'); stub(pg, [], paywall=cfgv)
        boot(pg, MEMBER, js); pg.goto(APP + '#home'); pg.wait_for_timeout(1500); pg.evaluate("LC90._t.reset(); LC90._t.cfg(true)"); pg.wait_for_timeout(800)
        out('access ' + label + ' [L1, L2, L3, L5, credits refused for L3, lock badge on L4]', pg.evaluate(ACC))
        c.close()
    # the moment, pure: week over needs a 7-day-old device (a server without the intro week says week1 false for everyone)
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc90-due'); stub(pg, [])
    pg.goto(APP + '#home'); pg.wait_for_timeout(1500)
    out('due [over + 8 days, over + 2 days, last day + empty, last day + tokens left, last day + bonus left, in the week]', pg.evaluate("[LC90._t.due({on:false},1,0,8), LC90._t.due({on:false},1,0,2), LC90._t.due({on:true,left:1},0,0,6.5), LC90._t.due({on:true,left:1},2,0,6.5), LC90._t.due({on:true,left:1},0,3,6.5), LC90._t.due({on:true,left:4},0,0,3)]"))
    c.close()
    # still inside the intro week: nothing
    calls = []
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc90-week'); stub(pg, calls)
    boot(pg, MEMBER, NEW); pg.goto(APP + '#home'); pg.wait_for_timeout(1500); pg.evaluate("LC90._t.reset(); LC90.check('test')"); pg.wait_for_timeout(1500)
    out('day 3 [pop-up, asked the server]', pg.evaluate("[!!" + SHEET + ", " + str(any(x[0] == 'lc89_paywall_seen' for x in calls)).lower() + "]"))
    c.close()
    # already seen on another device: nothing, and remembered here
    calls = []
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc90-seen'); stub(pg, calls, seen=True)
    boot(pg, MEMBER, OLD); pg.goto(APP + '#home'); pg.wait_for_timeout(1500); pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.evaluate("LC90._t.reset(); LC90.check('test')"); pg.wait_for_timeout(1500)
    out('seen on another device [pop-up, shown logged]', [pg.evaluate("!!" + SHEET), any(x[0] == 'lc89_paywall_log' for x in calls)])
    c.close()
    # the owner: never by itself; the editor
    calls = []
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc90-owner'); stub(pg, calls)
    boot(pg, OWNER, OLD); pg.goto(APP + '#home'); pg.wait_for_timeout(1500); pg.evaluate("LC90._t.reset(); LC90.check('test')"); pg.wait_for_timeout(1200)
    out('owner on day 8 [pop-up by itself]', pg.evaluate("!!" + SHEET))
    pg.goto(APP + '#paywall-editor'); pg.wait_for_timeout(2500)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
    out('editor [title, fields, Pro lines, VIP lines, live price line, counters]', pg.evaluate("[(document.querySelector('#view h1') || {}).textContent, document.querySelectorAll('.lc90-ed [data-k]').length, document.querySelectorAll('.lc90-ed .lc90-ft[data-fk=\"features\"]').length, document.querySelectorAll('.lc90-ed .lc90-ft[data-fk=\"vip_features\"]').length, (document.querySelector('[data-lc90-live]') || {}).textContent, (document.querySelector('[data-lc90-stats] b') || {}).textContent]"))
    pg.fill('.lc90-ed [data-k="title"]', 'Day 7: keep your momentum')
    pg.evaluate("document.querySelector('[data-lc90e=\"fadd\"]').click()"); pg.wait_for_timeout(200)
    pg.fill('.lc90-ed .lc90-ft[data-fk="features"][data-i="3"]', 'Priority in live streams')
    pg.evaluate("document.querySelector('[data-lc90e=\"fup\"][data-fk=\"features\"][data-i=\"3\"]').click()"); pg.wait_for_timeout(200)
    pg.evaluate("document.querySelector('[data-lc90e=\"fadd\"][data-fk=\"vip_features\"]').click()"); pg.wait_for_timeout(200)
    pg.fill('.lc90-ed .lc90-ft[data-fk="vip_features"][data-i="4"]', 'A monthly live Q&A')
    pg.evaluate("document.querySelector('[data-lc90e=\"preview\"]').click()"); pg.wait_for_timeout(1500)
    out('preview [open, title, preview note, Pro features in order, VIP extras]', pg.evaluate("(() => { const s = " + SHEET + "; if (!s) return [false]; return [true, s.getAttribute('aria-label'), !!s.querySelector('.lc90-pv'), [...s.querySelectorAll('[data-tierbox=\"pro\"] .lc90-feats li')].map(x => x.textContent.trim()), [...s.querySelectorAll('[data-tierbox=\"vip\"] .lc90-feats li')].map(x => x.textContent.trim())]; })()"))
    n0 = len(calls)
    pg.evaluate("(() => { const s = " + SHEET + "; s.querySelector('[data-lc90-ok]').click(); s.querySelector('[data-lc90=\"go\"]').click(); })()"); pg.wait_for_timeout(600)
    out('preview buttons [no checkout, message]', [not any(x[0].startswith('stripe/trial') or x[0] == 'lc89_paywall_log' for x in calls[n0:]), pg.evaluate("(document.querySelector('.lc90-sheet [data-lc90-msg]') || {}).textContent")])
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(400)
    pg.fill('.lc90-ed [data-k="body"]', 'Half price for life.')
    pg.evaluate("document.querySelector('[data-lc90e=\"save\"]').click()"); pg.wait_for_timeout(600)
    out('wording refused [message, nothing sent]', [pg.evaluate("document.querySelector('[data-lc90-emsg]').textContent"), not any(x[0] == 'lc89_cfg_save' for x in calls)])
    pg.fill('.lc90-ed [data-k="body"]', 'Half price, for as long as your subscription stays active.')
    pg.fill('.lc90-ed [data-k="stripe_price_yearly"]', 'prod_123')
    pg.evaluate("document.querySelector('[data-lc90e=\"save\"]').click()"); pg.wait_for_timeout(600)
    out('bad Price ID refused', pg.evaluate("document.querySelector('[data-lc90-emsg]').textContent"))
    pg.fill('.lc90-ed [data-k="stripe_price_yearly"]', 'price_1QFOUND99'); pg.fill('.lc90-ed [data-k="trial_days"]', '14')
    pg.evaluate("document.querySelector('[data-lc90e=\"save\"]').click()"); pg.wait_for_timeout(1200)
    sv = [x[1] for x in calls if x[0] == 'lc89_cfg_save']
    v = sv[0]['p_v'] if sv else {}
    out('saved [key, title, body, trial days, price id, features]', [sv[0].get('p_k') if sv else None, v.get('title'), v.get('body'), v.get('trial_days'), v.get('stripe_price_yearly'), [(f['t'], f['on']) for f in v.get('features', [])]])
    out('saved VIP and access [vip on, VIP lines, beginner in week, strict lock]', [v.get('vip_on'), [f['t'] for f in v.get('vip_features', [])], v.get('beginner_in_week'), v.get('strict_lock')])
    out('saved [message]', pg.evaluate("document.querySelector('[data-lc90-emsg]').textContent"))
    pg.evaluate("document.querySelector('[data-k=\"use_live\"]').click()"); pg.fill('.lc90-ed [data-k="price_yearly"]', '€149'); pg.wait_for_timeout(300)
    out('typed price differs from Stripe [warning]', pg.evaluate("(document.querySelector('[data-lc90-mis]') || {}).textContent"))
    out('editor layout [overflow-x]', pg.evaluate("Math.max(0, document.documentElement.scrollWidth - innerWidth)"))
    pg.screenshot(path=SHOTS + '/lc90-editor-phone.png', full_page=False)
    c.close()
    # a visitor on the editor route
    calls = []
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc90-guest'); stub(pg, calls)
    pg.goto(APP + '#paywall-editor'); pg.wait_for_timeout(2500)
    out('editor for a visitor [owner only]', pg.evaluate("[/for the owner/.test(document.getElementById('view').textContent), !document.querySelector('.lc90-ed [data-k]')]"))
    c.close()
    br.close()
mod = open(REPO + '/lc90.js', encoding='utf-8').read().strip(); app = open(REPO + '/app.html', encoding='utf-8').read()
out('LC90 [embedded copy equals lc90.js, init and afterRender wired]', [mod in app, 'try{LC90.init()}' in app, 'LC90.afterRender(route)' in app])
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
