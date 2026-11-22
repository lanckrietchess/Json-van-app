# lc99 (9.64.0): the withdrawal waiver on every step of the trial -> one-time month -> yearly road, and "your €25 counts toward the year".
# Real Chromium, 390x844 and 1280x800, Supabase and the Stripe function stubbed.
# Post-trial pop-up: picking the one-time month or yearly opens a confirm step (terms: price today, renewal, how to cancel) with an UNCHECKED
# waiver box; the pay button is off until it is ticked; Back returns to the options without marking anything; the choice is marked only on
# pay; the downsell request carries consent: true + the version + the exact wording shown; yearly logs the waiver on the account and then
# opens its Payment Link. Upgrades page: the "your €25 counts" card shows only while the server says ok; its sheet shows €199.50 struck and
# €174.50 today, the renewal and cancel terms, an unchecked box; pay sends consent to the annual25 route and opens Stripe; a refusal shows
# its reason. LC90's trial sends the waiver it showed; the owner's #consents page lists the stored waivers; members see nothing.
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
ENDED = dict(BASE, sub_status='trial_ended', trial_eligible=False, trial={'used': True, 'started_at': '2026-11-10T09:00:00Z', 'ends_at': '2026-11-17T09:00:00Z'}, post_trial={'offer_open': True, 'popup_due': True, 'shown_at': None, 'dismissed_at': None, 'choice': ''})
MONTH = dict(BASE, sub_status='downsell_month', active=True, trial_eligible=False, trial={'used': True}, discount={'used': True})
A25 = {'ok': True, 'signed_in': True, 'annual25': {'status': 'ok', 'credit_cents': 2500, 'until': '2026-12-29T10:00:00Z'}}
ROWS = [{'id': 2, 'email': 'anna@example.com', 'flow': 'downsell', 'version': 'w1-2026-11-22', 'wording': 'I want my Pro month to start right away. ... 14-day right of withdrawal ...', 'session_id': 'cs_test_down', 'device': 'd', 'source': 'server', 'created_at': '2026-11-22T10:00:00Z'},
        {'id': 1, 'email': 'bert@example.com', 'flow': 'yearly', 'version': 'w1-2026-11-22', 'wording': 'I want Pro to start right away. ...', 'session_id': '', 'device': 'd', 'source': 'app', 'created_at': '2026-11-22T09:00:00Z'}]
def stub(pg, calls, box):
    def rpc(route, request):
        n = request.url.split('/rpc/')[1].split('?')[0]; body = _json.loads(request.post_data or '{}'); calls.append([n, body])
        J = lambda o, st=200: route.fulfill(status=st, content_type='application/json', body=_json.dumps(o))
        if n == 'lc97_state': return J(box['s'])
        if n == 'lc97_mark':
            ev = body.get('p_event'); s = box['s']; pt = s['post_trial']
            if not pt.get('offer_open'): return J({'ok': False, 'error': 'not_eligible'})
            pt['popup_due'] = False; pt['shown_at'] = pt.get('shown_at') or '2026-11-19T10:00:00Z'
            if ev in ('free', 'closed'): pt['dismissed_at'] = 'x'; pt['offer_open'] = False
            return J(s)
        if n == 'lc99_state': return J(box['a25'])
        if n == 'lc99_consent_note': return J({'ok': True})
        if n == 'lc99_admin_consents': return J({'ok': True, 'rows': ROWS})
        if n in ('lc97_sync_tokens', 'lc89_paywall_log'): return J({'ok': True})
        if n == 'lc89_cfg_public': return J({'ok': True, 'k': body.get('p_k'), 'v': {'on': True, 'trial_days': 7, 'use_live': True} if body.get('p_k') == 'paywall' else {}})
        if n == 'lc89_paywall_seen': return J({'ok': True, 'signed_in': True, 'seen': False})
        return J({'ok': False, 'error': 'stub'})
    def fn(route, request):
        path = request.url.split('/functions/v1/stripe/')[1].split('?')[0]; body = _json.loads(request.post_data or '{}'); calls.append(['stripe/' + path, body])
        J = lambda o, st=200: route.fulfill(status=st, content_type='application/json', body=_json.dumps(o))
        if path == 'pricing': return J(PRICING)
        if path == 'downsell': return J({'ok': True, 'url': 'https://checkout.stripe.com/c/pay/cs_test_down'})
        if path == 'annual25': return J(box.get('a25res') or {'ok': True, 'url': 'https://checkout.stripe.com/c/pay/cs_test_year'})
        if path == 'trial': return J({'ok': True, 'url': 'https://checkout.stripe.com/c/pay/cs_test_trial'})
        return J({}, 404)
    pg.route(SB + '/rest/v1/rpc/**', rpc)
    pg.route(SB + '/functions/v1/stripe/**', fn)
    pg.route('https://checkout.stripe.com/**', lambda r: r.fulfill(status=200, content_type='text/html', body='<title>Stripe</title>stripe'))
    pg.route('https://buy.stripe.com/**', lambda r: r.fulfill(status=200, content_type='text/html', body='<title>Stripe link</title>link'))
def fresh(br, w, hh, mob, tag, s, a25=None, who=MEMBER, hash='#home'):
    calls = []; box = {'s': _copy.deepcopy(s), 'a25': a25 or {'ok': True, 'signed_in': True, 'annual25': {'status': 'no_month', 'credit_cents': 0, 'until': None}}}
    c = mkctx(br, w, hh, mob); pg = c.new_page(); watch(pg, 'lc99-' + tag); stub(pg, calls, box)
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(who); pg.evaluate(OLD)
    pg.goto(APP + hash); pg.wait_for_timeout(2200)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(400)
    return c, pg, calls, box
SH = "document.querySelector('.lc97-sheet')"
tap = lambda pg, js, ms=600: (pg.evaluate(js), pg.wait_for_timeout(ms))
OVER = "Math.max(0, document.documentElement.scrollWidth - innerWidth)"
with sync_playwright() as p:
    br = p.chromium.launch()
    for w, hh, mob, tag in [(390, 844, True, 'phone'), (1280, 800, False, 'desktop')]:
        c, pg, calls, box = fresh(br, w, hh, mob, 'pop-' + tag, ENDED)
        pg.evaluate("LC97._t.reset(); LC97.check('test')"); pg.wait_for_timeout(2200)
        tap(pg, SH + ".querySelector('[data-lc97=\"discount\"]').click()")
        cf = pg.evaluate("(() => { const s = " + SH + ", f = s.querySelector('[data-lc97-cf]'); return [!f.hidden, s.querySelector('.lc97-cfh').textContent, [...f.querySelectorAll('.lc97-terms li')].map(l => l.textContent), s.querySelector('[data-lc97-ok]').checked, s.querySelector('[data-lc97=\"pay\"]').disabled, s.querySelector('[data-lc97=\"pay\"]').textContent.trim(), [...s.querySelectorAll('.lc97-opt, .lc97-free')].every(x => x.hidden)]; })()")
        out(tag + ' one-time month confirm [open, heading, terms, box unchecked, pay off, pay label, options hidden]', cf)
        out(tag + ' waiver wording', pg.evaluate(SH + ".querySelector('.lc97-ok span').textContent"))
        out(tag + ' confirm layout [overflow-x, box >= 44px tall, pay >= 44px]', pg.evaluate("[" + OVER + ", " + SH + ".querySelector('.lc97-ok').getBoundingClientRect().height >= 44, " + SH + ".querySelector('[data-lc97=\"pay\"]').getBoundingClientRect().height >= 44]"))
        pg.screenshot(path=SHOTS + '/lc99-confirm-' + tag + '.png')
        tap(pg, SH + ".querySelector('[data-lc97=\"pay\"]').click()", 500)
        out(tag + ' pay while unticked [no checkout, no choice marked]', [not any(x[0] == 'stripe/downsell' for x in calls), not any(x[0] == 'lc97_mark' and x[1].get('p_event') == 'discount' for x in calls)])
        tap(pg, SH + ".querySelector('[data-lc97=\"back\"]').click()")
        out(tag + ' Back [options visible again, confirm hidden, nothing marked]', pg.evaluate("[[...document.querySelectorAll('.lc97-sheet .lc97-opt')].every(x => !x.hidden), " + SH + ".querySelector('[data-lc97-cf]').hidden]") + [not any(x[0] == 'lc97_mark' and x[1].get('p_event') in ('discount', 'yearly') for x in calls)])
        tap(pg, SH + ".querySelector('[data-lc97=\"discount\"]').click()"); tap(pg, SH + ".querySelector('[data-lc97-ok]').click()")
        text = pg.evaluate(SH + ".querySelector('.lc97-ok span').textContent")
        out(tag + ' ticked [pay on]', pg.evaluate("!" + SH + ".querySelector('[data-lc97=\"pay\"]').disabled"))
        tap(pg, SH + ".querySelector('[data-lc97=\"pay\"]').click()", 1500)
        ds = [x[1] for x in calls if x[0] == 'stripe/downsell']
        out(tag + ' paid [choice marked on pay, consent true, version, exact wording, opened Stripe]', [any(x[0] == 'lc97_mark' and x[1].get('p_event') == 'discount' for x in calls), bool(ds) and ds[0].get('consent') is True, ds[0].get('consent_v') if ds else None, bool(ds) and ds[0].get('consent_text') == text, pg.evaluate("location.host")])
        c.close()
    # yearly from the pop-up: confirm, waiver logged, then its Payment Link
    c, pg, calls, box = fresh(br, 390, 844, True, 'pop-yearly', ENDED)
    pg.evaluate("LC97._t.reset(); LC97.check('test')"); pg.wait_for_timeout(2200)
    tap(pg, SH + ".querySelector('[data-lc97=\"yearly\"]').click()")
    out('yearly confirm [heading, terms, box unchecked, pay label]', pg.evaluate("(() => { const s = " + SH + "; return [s.querySelector('.lc97-cfh').textContent, [...s.querySelectorAll('.lc97-terms li')].map(l => l.textContent), s.querySelector('[data-lc97-ok]').checked, s.querySelector('[data-lc97=\"pay\"]').textContent.trim()]; })()"))
    tap(pg, SH + ".querySelector('[data-lc97-ok]').click()"); text = pg.evaluate(SH + ".querySelector('.lc97-ok span').textContent")
    tap(pg, SH + ".querySelector('[data-lc97=\"pay\"]').click()", 2500)
    nt = [x[1] for x in calls if x[0] == 'lc99_consent_note']
    out('yearly paid [waiver logged: flow, version, wording; then the Payment Link]', [nt[0].get('p_flow') if nt else None, nt[0].get('p_version') if nt else None, bool(nt) and nt[0].get('p_wording') == text, pg.evaluate("location.host")])
    c.close()
    # Upgrades page: "your €25 counts"
    for w, hh, mob, tag in [(390, 844, True, 'phone'), (1280, 800, False, 'desktop')]:
        c, pg, calls, box = fresh(br, w, hh, mob, 'a25-' + tag, MONTH, a25=A25, hash='#upgrades')
        pg.evaluate("LC99._t.reset(); LC99.paint()"); pg.wait_for_timeout(1500)
        out(tag + ' Upgrades card [text, button]', pg.evaluate("(() => { const b = document.querySelector('[data-lc99-card]'); return b ? [b.querySelector('b').textContent.trim(), b.querySelector('small').textContent, b.querySelector('[data-lc99-open]').textContent] : null; })()"))
        tap(pg, "document.querySelector('[data-lc99-open]').click()", 1500)
        sh = "document.querySelector('.lc99-sheet')"
        out(tag + ' yearly switch sheet [title, struck, today, terms, box unchecked, pay off, pay label]', pg.evaluate("(() => { const s = " + sh + "; return s ? [s.querySelector('.sheet-head, h2, .sheet-title') ? s.querySelector('.sheet-head, h2, .sheet-title').textContent.trim() : '', s.querySelector('.lc99-price s').textContent, s.querySelector('.lc99-price strong').textContent, [...s.querySelectorAll('.lc99-terms li')].map(l => l.textContent), s.querySelector('[data-lc99-ok]').checked, s.querySelector('[data-lc99=\"pay\"]').disabled, s.querySelector('[data-lc99=\"pay\"]').textContent.trim()] : null; })()"))
        out(tag + ' yearly switch waiver', pg.evaluate(sh + ".querySelector('.lc99-ok span').textContent"))
        out(tag + ' sheet layout [overflow-x]', pg.evaluate(OVER))
        pg.screenshot(path=SHOTS + '/lc99-annual-' + tag + '.png')
        tap(pg, sh + ".querySelector('[data-lc99=\"pay\"]').click()", 500)
        out(tag + ' pay while unticked [no checkout]', not any(x[0] == 'stripe/annual25' for x in calls))
        tap(pg, sh + ".querySelector('[data-lc99-ok]').click()"); text = pg.evaluate(sh + ".querySelector('.lc99-ok span').textContent")
        tap(pg, sh + ".querySelector('[data-lc99=\"pay\"]').click()", 1500)
        a = [x[1] for x in calls if x[0] == 'stripe/annual25']
        out(tag + ' paid [consent true, version, exact wording, no amount from the browser, opened Stripe]', [bool(a) and a[0].get('consent') is True, a[0].get('consent_v') if a else None, bool(a) and a[0].get('consent_text') == text, bool(a) and not any(k in a[0] for k in ('amount', 'amount_cents', 'minus', 'credit')), pg.evaluate("location.host")])
        c.close()
    c, pg, calls, box = fresh(br, 390, 844, True, 'a25-refused', MONTH, a25=A25, hash='#upgrades')
    box['a25res'] = {'ok': False, 'reason': 'expired'}
    pg.evaluate("LC99._t.reset(); LC99.paint()"); pg.wait_for_timeout(1500)
    tap(pg, "document.querySelector('[data-lc99-open]').click()", 1500); sh = "document.querySelector('.lc99-sheet')"
    tap(pg, sh + ".querySelector('[data-lc99-ok]').click()"); tap(pg, sh + ".querySelector('[data-lc99=\"pay\"]').click()", 1200)
    out('refused [message, pay hidden, still on the app]', pg.evaluate("[" + sh + ".querySelector('[data-lc99-msg]').textContent, " + sh + ".querySelector('[data-lc99=\"pay\"]').hidden, location.host]"))
    c.close()
    c, pg, calls, box = fresh(br, 390, 844, True, 'a25-none', MONTH, a25={'ok': True, 'signed_in': True, 'annual25': {'status': 'used', 'credit_cents': 2500, 'until': None}}, hash='#upgrades')
    pg.evaluate("LC99._t.reset(); LC99.paint()"); pg.wait_for_timeout(1500)
    out('offer used [no card]', pg.evaluate("!document.querySelector('[data-lc99-card]')"))
    c.close()
    # LC90's trial sends the waiver it showed
    c, pg, calls, box = fresh(br, 390, 844, True, 'trial', dict(BASE))
    pg.evaluate("LC90.open({from: 'upgrades'})"); pg.wait_for_timeout(1800)
    s90 = "document.querySelector('.lc90-sheet')"
    out('trial [box unchecked, start off]', pg.evaluate("[" + s90 + ".querySelector('[data-lc90-ok]').checked, " + s90 + ".querySelector('[data-lc90=\"go\"]').disabled]"))
    tap(pg, s90 + ".querySelector('[data-lc90-ok]').click()"); text = pg.evaluate(s90 + ".querySelector('.lc90-ok span').textContent")
    tap(pg, s90 + ".querySelector('[data-lc90=\"go\"]').click()", 1500)
    tr = [x[1] for x in calls if x[0] == 'stripe/trial']
    out('trial [consent true, version, exact wording, opened Stripe]', [bool(tr) and tr[0].get('consent') is True, tr[0].get('consent_v') if tr else None, bool(tr) and tr[0].get('consent_text') == text, pg.evaluate("location.host")])
    c.close()
    # the owner's waiver log
    c, pg, calls, box = fresh(br, 390, 844, True, 'log', dict(BASE), who=OWNER, hash='#consents'); pg.wait_for_timeout(800)
    out('owner log [title, rows, first row]', pg.evaluate("[document.querySelector('.lc99-log h1').textContent, document.querySelectorAll('.lc99-list li').length, document.querySelector('.lc99-list li div').textContent]"))
    out('owner log layout [overflow-x]', pg.evaluate(OVER))
    c.close()
    c, pg, calls, box = fresh(br, 390, 844, True, 'log-member', dict(BASE), hash='#consents')
    out('member [owner only, no admin call]', [pg.evaluate("/for the owner/.test(document.getElementById('view').textContent)"), not any(x[0] == 'lc99_admin_consents' for x in calls)])
    c.close()
    c, pg, calls, box = fresh(br, 390, 844, True, 'unit', dict(BASE))
    out('helpers [numbers, credit capped below the price, wording]', pg.evaluate("[(() => { const n = LC99._t.numbers({ok: true, yearly: [19950, 29925, 35910, 39900], tranche: 1}, 2500); return [n.yearly, n.credit, n.today, n.rate]; })(), LC99._t.numbers({ok: true, yearly: [19950, 29925, 35910, 39900], tranche: 1}, 99999).today, LC99._t.wording(LC99._t.numbers(null, 2500))]"))
    c.close()
    br.close()
app_ = open(REPO + '/app.html', encoding='utf-8').read()
same = [open(REPO + '/' + n + '.js', encoding='utf-8').read().strip() in app_ for n in ('lc73', 'lc90', 'lc97', 'lc99')]
srv = open(REPO + '/functions/stripe/stripe.js', encoding='utf-8').read()
out('LC99 [embedded copies equal lc73 / lc90 / lc97 / lc99, init + afterRender wired, one waiver version everywhere, build]', same + ['try{LC99.init()}' in app_, 'LC99.afterRender(route)' in app_,
    app_.count('"w1-2026-11-22"') >= 4 and "CONSENT_V = 'w1-2026-11-22'" in srv, __import__('re').search(r'CONFIG=\{version:"([^"]+)"', app_).group(1)])
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
