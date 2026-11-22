# lc97 (9.62.0): the trial lifecycle and the one-time post-trial downsell. Real Chromium, 390x844 and 1280x800, Supabase and the Stripe
# function stubbed. A member whose trial ended (server: popup_due) gets ONE pop-up, marked shown BEFORE it opens: yearly Pro first (blue, a
# month price billed yearly), the one-time month (€25, €39 struck through), then a small Free link. The discount goes to the stripe function's
# "downsell" route and opens Stripe; Free and closing dismiss it for good; a refusal shows the server's reason. The trial entries follow the
# server: LC90 drops the trial when it is used (and shows its trial line when it is not), the Upgrades page shows the trial status and relabels
# its button, the LC85 upgrade sheet gets a "Try Pro free" row, the Day-7 pop-up waits after a trial. A cancelled checkout from the pop-up
# brings it back once; ?lc97=paid claims the licence. The owner's simulator walks the road and previews without checkout.
import json as _json, copy as _copy
APP = 'http://127.0.0.1:8765/app.html'
SB = 'https://wllljllajadiwjdsageu.supabase.co'
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
MEMBER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'm', refresh_token: '', exp: Date.now() + 36e5, email: 'anna@example.com' }))"
OLD = "localStorage.setItem('lc34-first', JSON.stringify(Date.now() - 20 * 864e5))"
PRICING = {'ok': True, 'tier': 2, 'tranche': 1, 'left': [37, 100, 100], 'sold': [63, 0, 0], 'caps': [100, 100, 100], 'yearly': [19950, 29925, 35910, 39900], 'base': 39900, 'monthly': 3900,
           'discountPct': [50, 25, 10], 'downsell': {'cents': 2500, 'anchor_cents': 3900, 'days': 30},
           'vip': {'ok': True, 'tier': 3, 'tranche': 1, 'left': [100, 100, 100], 'yearly': [29950, 44925, 53910, 59900], 'base': 59900, 'monthly': 5900, 'discountPct': [50, 25, 10]}}
BASE = {'ok': True, 'signed_in': True, 'sub_status': 'free', 'plan': '', 'active': False, 'trial': {'used': False, 'running': False, 'days_left': 0}, 'trial_eligible': True,
        'post_trial': {'offer_open': False, 'popup_due': False, 'shown_at': None, 'dismissed_at': None, 'choice': ''}, 'discount': {'used': False}, 'tokens': {}}
def S(**k):
    s = _copy.deepcopy(BASE)
    for a, b in k.items():
        if isinstance(b, dict) and isinstance(s.get(a), dict): s[a].update(b)
        else: s[a] = b
    return s
ENDED = dict(sub_status='trial_ended', trial_eligible=False, trial={'used': True, 'started_at': '2026-11-10T09:00:00Z', 'ends_at': '2026-11-17T09:00:00Z'}, post_trial={'offer_open': True, 'popup_due': True})
def stub(pg, calls, box, downsell=None):
    def rpc(route, request):
        n = request.url.split('/rpc/')[1].split('?')[0]; body = _json.loads(request.post_data or '{}'); calls.append([n, body])
        J = lambda o, st=200: route.fulfill(status=st, content_type='application/json', body=_json.dumps(o))
        if n == 'lc97_state': return J(box['s'])
        if n == 'lc97_mark':
            ev = body.get('p_event'); s = box['s']; pt = s['post_trial']
            if not pt.get('offer_open'): return J({'ok': False, 'error': 'not_eligible'})
            pt['popup_due'] = False; pt['shown_at'] = pt.get('shown_at') or '2026-11-19T10:00:00Z'
            if ev in ('free', 'closed'): pt['dismissed_at'] = '2026-11-19T10:01:00Z'; pt['offer_open'] = False; pt['choice'] = ev
            elif ev != 'shown': pt['choice'] = ev
            return J(s)
        if n in ('lc97_sync_tokens', 'lc89_paywall_log'): return J({'ok': True})
        if n == 'lc97_admin_report': return J({'ok': True, 'days': 30, 'trials_started': 12, 'popup_shown': 5, 'discount_paid': 2})
        if n == 'lc97_admin_state': return J(S(**ENDED))
        if n == 'lc89_cfg_public': return J({'ok': True, 'k': body.get('p_k'), 'v': {'on': True, 'trial_days': 7, 'use_live': True} if body.get('p_k') == 'paywall' else {}})
        if n == 'lc89_paywall_seen': return J({'ok': True, 'signed_in': True, 'seen': False})
        if n == 'lc36_claim_my_licence': return J({'ok': False, 'error': 'no_licence'})
        return J({'ok': False, 'error': 'stub'})
    def fn(route, request):
        path = request.url.split('/functions/v1/stripe/')[1].split('?')[0]; body = _json.loads(request.post_data or '{}'); calls.append(['stripe/' + path, body])
        J = lambda o, st=200: route.fulfill(status=st, content_type='application/json', body=_json.dumps(o))
        if path == 'pricing': return J(PRICING)
        if path == 'downsell': return J(downsell or {'ok': True, 'url': 'https://checkout.stripe.com/c/pay/cs_test_down', 'amount_cents': 2500})
        if path == 'trial': return J({'ok': True, 'url': 'https://checkout.stripe.com/c/pay/cs_test_trial'})
        return J({}, 404)
    pg.route(SB + '/rest/v1/rpc/**', rpc)
    pg.route(SB + '/functions/v1/stripe/**', fn)
    pg.route('https://checkout.stripe.com/**', lambda r: r.fulfill(status=200, content_type='text/html', body='<title>Stripe</title>stripe'))
def boot(pg, *js):
    pg.goto('http://127.0.0.1:8765/version.json')
    for x in js: pg.evaluate(x)
def buy(pg):   # 9.64.0: the one-time month = pick it, tick the waiver, pay (three taps, like a member)
    pg.evaluate(SH + ".querySelector('[data-lc97=\"discount\"]').click()"); pg.wait_for_timeout(600)
    pg.evaluate(SH + ".querySelector('[data-lc97-ok]').click()"); pg.wait_for_timeout(600)
    pg.evaluate(SH + ".querySelector('[data-lc97=\"pay\"]').click()")
def calm(pg): pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(350)
SH = "document.querySelector('.lc97-sheet')"
def fresh(br, w, hh, mob, tag, state, downsell=None, owner=False, hash='#home', extra=()):
    calls = []; box = {'s': state}
    c = mkctx(br, w, hh, mob); pg = c.new_page(); watch(pg, 'lc97-' + tag); stub(pg, calls, box, downsell)
    boot(pg, OWNER if owner else MEMBER, OLD, *extra)
    pg.goto(APP + hash); pg.wait_for_timeout(1500); calm(pg)
    return c, pg, calls, box
with sync_playwright() as p:
    br = p.chromium.launch()
    for w, hh, mob, tag in [(390, 844, True, 'phone'), (1280, 800, False, 'desktop')]:
        c, pg, calls, box = fresh(br, w, hh, mob, tag, S(**ENDED))
        pg.evaluate("LC97._t.reset(); LC97.check('test')"); pg.wait_for_timeout(2200)
        out(tag + ' post-trial pop-up [open, title, options in order]', pg.evaluate("(() => { const s = " + SH + "; if (!s) return [false]; return [true, s.getAttribute('aria-label'), [...s.querySelectorAll('[data-lc97]')].map(b => b.getAttribute('data-lc97'))]; })()"))
        out(tag + ' yearly option [title, month price, billed yearly line, blue]', pg.evaluate("(() => { const b = " + SH + ".querySelector('[data-lc97=\"yearly\"]'); return [b.querySelector('.lc97-t').textContent.trim(), b.querySelector('strong').textContent, /\\/month billed yearly/.test(b.textContent), getComputedStyle(b).backgroundColor]; })()"))
        out(tag + ' discount option [title, struck, price, tag]', pg.evaluate("(() => { const b = " + SH + ".querySelector('[data-lc97=\"discount\"]'); return [b.querySelector('.lc97-t').textContent.trim(), b.querySelector('s').textContent, b.querySelector('strong').textContent, b.querySelector('.lc97-tag').textContent]; })()"))
        out(tag + ' Free option [text, smaller than the yearly title]', pg.evaluate("(() => { const s = " + SH + ", f = s.querySelector('[data-lc97=\"free\"]'), y = s.querySelector('[data-lc97=\"yearly\"] .lc97-t'); return [f.textContent.trim(), parseFloat(getComputedStyle(f).fontSize) < parseFloat(getComputedStyle(y).fontSize)]; })()"))
        out(tag + ' layout [overflow-x, sheet inside the screen, tap targets >= 44px]', pg.evaluate("[Math.max(0, document.documentElement.scrollWidth - innerWidth), " + SH + ".getBoundingClientRect().width <= innerWidth, [...document.querySelectorAll('.lc97-sheet [data-lc97]')].every(b => b.getBoundingClientRect().height >= 44)]"))
        pg.screenshot(path=SHOTS + '/lc97-popup-' + tag + '.png')
        names = [x[0] for x in calls]
        out(tag + ' marked shown before it opened [mark shown sent, one mark]', [any(x[0] == 'lc97_mark' and x[1].get('p_event') == 'shown' for x in calls), names.count('lc97_mark')])
        buy(pg); pg.wait_for_timeout(1500)
        ds = [x[1] for x in calls if x[0] == 'stripe/downsell']
        out(tag + ' discount [choice marked, downsell called with token + device, opened Stripe]', [any(x[0] == 'lc97_mark' and x[1].get('p_event') == 'discount' for x in calls), bool(ds and ds[0].get('token') and ds[0].get('device')), pg.evaluate("location.host")])
        c.close()
    # Free: dismissed for good, never again
    c, pg, calls, box = fresh(br, 390, 844, True, 'free', S(**ENDED))
    pg.evaluate("LC97._t.reset(); LC97.check('test')"); pg.wait_for_timeout(2000)
    pg.evaluate(SH + ".querySelector('[data-lc97=\"free\"]').click()"); pg.wait_for_timeout(600)
    pg.evaluate("LC97._t.reset(); LC97.check('test')"); pg.wait_for_timeout(1500)
    out('Free [marked free, sheet closed, not reopened]', [any(x[0] == 'lc97_mark' and x[1].get('p_event') == 'free' for x in calls), not pg.evaluate("!!" + SH), sum(1 for x in calls if x[0] == 'lc97_mark' and x[1].get('p_event') == 'shown')])
    c.close()
    # closing with X: dismissed (closed)
    c, pg, calls, box = fresh(br, 390, 844, True, 'close', S(**ENDED))
    pg.evaluate("LC97._t.reset(); LC97.check('test')"); pg.wait_for_timeout(2000)
    pg.evaluate(SH + ".querySelector('.sheet-head [data-close]').click()"); pg.wait_for_timeout(600)
    pg.evaluate("LC97._t.reset(); LC97.check('test')"); pg.wait_for_timeout(1500)
    out('closed [marked closed, no pop-up after]', [any(x[0] == 'lc97_mark' and x[1].get('p_event') == 'closed' for x in calls), not pg.evaluate("!!" + SH)])
    c.close()
    # the server refuses the discount
    c, pg, calls, box = fresh(br, 390, 844, True, 'used', S(**ENDED), downsell={'ok': False, 'reason': 'used'})
    pg.evaluate("LC97._t.reset(); LC97.check('test')"); pg.wait_for_timeout(2000)
    buy(pg); pg.wait_for_timeout(1200)
    out('refused [message, discount hidden, still on the app]', pg.evaluate("[" + SH + ".querySelector('[data-lc97-msg]').textContent, " + SH + ".querySelector('[data-lc97=\"discount\"]').hidden, location.host]"))
    c.close()
    # not due / owner / paying: nothing opens
    for label, st, own in [('trial running', S(sub_status='trialing', trial_eligible=False, trial={'used': True, 'running': True, 'days_left': 3}), False), ('already shown', S(**dict(ENDED, post_trial={'offer_open': True, 'popup_due': False, 'shown_at': 'x'})), False), ('owner, due', S(**ENDED), True)]:
        c, pg, calls, box = fresh(br, 390, 844, True, 'none', st, owner=own)
        pg.evaluate("LC97._t.reset(); LC97.check('test')"); pg.wait_for_timeout(1500)
        out('no pop-up: ' + label + ' [pop-up, shown marked]', [pg.evaluate("!!" + SH), any(x[0] == 'lc97_mark' for x in calls)])
        c.close()
    # trial entry points follow the server
    c, pg, calls, box = fresh(br, 390, 844, True, 'lc90', S(trial_eligible=False, trial={'used': True}, sub_status='trial_ended'))
    pg.evaluate("LC97._t.reset(); LC90.open({from: 'upgrades'})"); pg.wait_for_timeout(2500)
    out('LC90, trial used [sheet, no consent box, no trial line, title]', pg.evaluate("(() => { const s = document.querySelector('.lc90-sheet'); return s ? [true, !s.querySelector('[data-lc90-ok]'), !s.querySelector('.lc90-trial'), s.getAttribute('aria-label')] : [false]; })()"))
    calm(pg); box['s'] = S(); pg.evaluate("LC97._t.reset(); LC90.open({from: 'upgrades'})"); pg.wait_for_timeout(2500)
    out('LC90, trial unused [consent box, trial line]', pg.evaluate("(() => { const s = document.querySelector('.lc90-sheet'); return s ? [!!s.querySelector('[data-lc90-ok]'), (s.querySelector('.lc90-trial') || {}).textContent || ''] : [false]; })()"))
    calm(pg)
    box['s'] = S(trial_eligible=False, trial={'used': True}, sub_status='trial_ended'); pg.evaluate("LC90._t.reset(); LC97._t.reset(); localStorage.removeItem('lc-hub-lc90-seen'); Object.keys(localStorage).filter(k => /lc90-seen/.test(k)).forEach(k => localStorage.removeItem(k)); LC90.check('test')"); pg.wait_for_timeout(2500)
    out('Day-7 pop-up waits after a trial [lc90 sheet]', pg.evaluate("!!document.querySelector('.lc90-sheet')"))
    c.close()
    c, pg, calls, box = fresh(br, 390, 844, True, 'upg', S(sub_status='trialing', trial_eligible=False, trial={'used': True, 'running': True, 'days_left': 3, 'ends_at': '2026-11-22T09:00:00Z'}), hash='#upgrades')
    pg.evaluate("LC97._t.reset(); LC97.afterRender('upgrades')"); pg.wait_for_timeout(3800)
    out('Upgrades, trialing [status box, button label]', pg.evaluate("[(document.querySelector('[data-lc97-status]') || {}).textContent || '', ((document.querySelector('[data-up-try]') || {}).textContent || '').trim()]"))
    out('Upgrades layout [overflow-x]', pg.evaluate("Math.max(0, document.documentElement.scrollWidth - innerWidth)"))
    pg.screenshot(path=SHOTS + '/lc97-upgrades-phone.png')
    c.close()
    c, pg, calls, box = fresh(br, 390, 844, True, 'lc85', S())
    pg.evaluate("LC85.upgrade({src: 'test'})"); pg.wait_for_timeout(2500)
    out('upgrade sheet, trial unused [row shown, text]', pg.evaluate("(() => { const r = document.querySelector('.lc85-upsheet [data-lc97-slot]'); return r ? [!r.hidden, r.textContent.trim().slice(0, 60)] : [false]; })()"))
    pg.evaluate("document.querySelector('[data-lc97-try]').click()"); pg.wait_for_timeout(2800)
    out('upgrade sheet row opens the trial pop-up [lc90 sheet, consent box]', pg.evaluate("[!!document.querySelector('.lc90-sheet'), !!document.querySelector('.lc90-sheet [data-lc90-ok]')]"))
    c.close()
    c, pg, calls, box = fresh(br, 390, 844, True, 'lc85b', S(trial_eligible=False, trial={'used': True}, sub_status='trial_ended'))
    pg.evaluate("LC85.upgrade({src: 'test'})"); pg.wait_for_timeout(2500)
    out('upgrade sheet, trial used [row hidden]', pg.evaluate("(() => { const r = document.querySelector('.lc85-upsheet [data-lc97-slot]'); return !r || r.hidden; })()"))
    c.close()
    # returns from Stripe
    c, pg, calls, box = fresh(br, 390, 844, True, 'ret', S(**dict(ENDED, post_trial={'offer_open': True, 'popup_due': False, 'shown_at': 'x'})), hash='#home', extra=("sessionStorage.setItem('lc97-reopen', String(Date.now()))",))
    pg.goto(APP + '?lc97=cancel#upgrades'); pg.wait_for_timeout(5500)
    out('cancelled checkout [pop-up back once, flag gone from the address]', [pg.evaluate("!!" + SH), pg.evaluate("location.search")])
    c.close()
    c, pg, calls, box = fresh(br, 390, 844, True, 'paid', S(sub_status='downsell_month', trial_eligible=False, trial={'used': True}, discount={'used': True}))
    pg.goto(APP + '?lc97=paid#upgrades'); pg.wait_for_timeout(4500)
    out('paid return [licence claim asked, flag gone, no pop-up]', [any(x[0] == 'lc36_claim_my_licence' for x in calls), pg.evaluate("location.search"), pg.evaluate("!!" + SH)])
    c.close()
    # the owner's simulator
    for w, hh, mob, tag in [(390, 844, True, 'phone'), (1280, 800, False, 'desktop')]:
        c, pg, calls, box = fresh(br, w, hh, mob, 'lab-' + tag, S(), owner=True, hash='#trial-lab')
        pg.wait_for_timeout(1500)
        out(tag + ' simulator [title, rows, day 8 row, post-trial row]', pg.evaluate("(() => { const v = document.getElementById('view'), r = [...v.querySelectorAll('.lc97-tr:not(.lc97-th)')]; return [(v.querySelector('h1') || {}).textContent, r.length, r.some(x => /Day-7 pop-up/.test(x.textContent) && /^8/.test(x.textContent.trim())), r.some(x => /post-trial pop-up opens/.test(x.textContent))]; })()"))
        out(tag + ' simulator layout [overflow-x]', pg.evaluate("Math.max(0, document.documentElement.scrollWidth - innerWidth)"))
        pg.screenshot(path=SHOTS + '/lc97-lab-' + tag + '.png', full_page=True)
        c.close()
    c, pg, calls, box = fresh(br, 390, 844, True, 'lab', S(), owner=True, hash='#trial-lab')
    pg.wait_for_timeout(1200)
    pg.evaluate("document.querySelector('[data-lc97s=\"scen\"][data-k=\"c\"]').click()"); pg.wait_for_timeout(300)
    out('simulator scenario Free [after the pop-up: 1 a day]', pg.evaluate("[...document.querySelectorAll('.lc97-tr')].some(x => /picks Free/.test(x.textContent))"))
    n0 = len(calls)
    pg.evaluate("document.querySelector('.lc97-lab [data-lc97s=\"pv97\"]').click()"); pg.wait_for_timeout(1500)
    buy(pg); pg.wait_for_timeout(500)
    out('simulator preview [open, preview note, no mark, no checkout, message]', pg.evaluate("[!!" + SH + ", !!" + SH + ".querySelector('.lc97-pv')]") + [not any(x[0] in ('lc97_mark', 'stripe/downsell') for x in calls[n0:]), pg.evaluate(SH + ".querySelector('[data-lc97-msg]').textContent")])
    calm(pg)
    pg.evaluate("document.querySelector('[data-lc97s=\"reset\"][data-k=\"discount\"]').click()"); pg.wait_for_timeout(300)
    first = pg.evaluate("document.querySelector('[data-lc97-lm]').textContent")
    out('reset needs two taps [message, nothing sent yet]', [first, not any(x[0] == 'lc97_admin_reset' for x in calls)])
    c.close()
    c, pg, calls, box = fresh(br, 390, 844, True, 'lab-guest', S(), hash='#trial-lab')
    pg.wait_for_timeout(800)
    out('simulator for a member [owner only]', pg.evaluate("/for the owner/.test(document.getElementById('view').textContent)"))
    c.close()
    br.close()
mod = open(REPO + '/lc97.js', encoding='utf-8').read().strip(); app = open(REPO + '/app.html', encoding='utf-8').read()
out('LC97 [embedded copy equals lc97.js, init and afterRender wired]', [mod in app, 'try{LC97.init()}' in app, 'LC97.afterRender(route)' in app])
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
