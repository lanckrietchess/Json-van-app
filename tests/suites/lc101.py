# lc101 (9.66.0): the coach chat for every member, Kyenzo's welcome message, and the withdrawal acknowledgement in the chat instead of
# an e-mail. Real Chromium, 390x844; Supabase and the Stripe function stubbed.
import json as _json
APP = 'http://127.0.0.1:8765/app.html'
SB = 'https://wllljllajadiwjdsageu.supabase.co'
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
MEMBER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'm', refresh_token: '', exp: Date.now() + 36e5, email: 'free@example.com' }))"
OLD = "localStorage.setItem('lc34-first', JSON.stringify(Date.now() - 20 * 864e5))"
WELCOME = 'Hi Free, welcome! I’m Kyenzo, your coach in this app. This chat goes straight to me.'
AUTO = [{'event': 'buyer', 'enabled': True, 'body': 'Thanks', 'cta_label': '', 'cta_href': ''}, {'event': 'welcome', 'enabled': True, 'body': 'Hi {name}, welcome!', 'cta_label': 'Review my last game', 'cta_href': '#trim'},
        {'event': 'trial', 'enabled': True, 'body': 'Trial', 'cta_label': '', 'cta_href': ''}]
def stub(pg, calls, box):
    def rpc(route, request):
        n = request.url.split('/rpc/')[1].split('?')[0]; body = _json.loads(request.post_data or '{}'); calls.append([n, body])
        J = lambda o, st=200: route.fulfill(status=st, content_type='application/json', body=_json.dumps(o))
        owner = 'Bearer x' in (request.headers.get('authorization') or '')
        if n == 'lc101_welcome':
            if box['welcomed']: return J({'ok': True, 'sent': False, 'why': 'done'})
            box['welcomed'] = True; box['msgs'].append({'id': 1, 'owner': True, 'kind': 'auto', 'body': WELCOME, 'cta': {'label': 'Review my last game', 'href': '#trim'}, 't': '2026-11-24T09:00:00Z'}); box['unread'] = 1
            return J({'ok': True, 'sent': True})
        if n == 'lc72_auto_check': return J({'ok': True, 'sent': []})
        if n == 'lc72_me': return J({'ok': True, 'code': 'C' if owner else '', 'title': '', 'tier': 0, 'buyer': False, 'customer': True, 'owner': owner, 'unread': 0 if owner else box['unread'], 'priority': False, 'priority_tokens': 5, 'review_tokens': 20, 'coach': 'Kyenzo'})
        if n == 'lc72_chat_get': box['unread'] = 0; return J({'ok': True, 'allowed': True, 'priority': False, 'msgs': box['msgs']})
        if n == 'lc72_chat_send': box['msgs'].append({'id': len(box['msgs']) + 1, 'owner': False, 'kind': 'chat', 'body': body.get('p_body'), 't': '2026-11-24T09:05:00Z'}); return J({'ok': True})
        if n == 'lc72_inbox': return J({'ok': True, 'unread': 1, 'rows': [{'uid': 'u1', 'name': 'Free', 'email': 'free@example.com', 'code': '', 'tier': 0, 'buyer': False, 'trial': False, 'unread': 1, 'priority': True, 'last': 'I withdraw from my contract', 'last_at': '2026-11-24T09:00:00Z'}]})
        if n == 'lc72_auto_get': return J({'ok': True, 'rows': AUTO, 'sent': {'welcome': 3}})
        if n == 'lc97_state': return J({'ok': True, 'signed_in': True, 'sub_status': 'free', 'trial_eligible': True, 'trial': {'used': False}, 'post_trial': {}, 'discount': {}, 'tokens': {}})
        if n == 'lc100_join_main': return J({'ok': True, 'joined': False})
        return J({'ok': False, 'error': 'stub'})
    def fn(route, request):
        path = request.url.split('/functions/v1/stripe/')[1].split('?')[0]; body = _json.loads(request.post_data or '{}'); calls.append(['stripe/' + path, body])
        J = lambda o, st=200: route.fulfill(status=st, content_type='application/json', body=_json.dumps(o))
        if path == 'withdraw': return J({'ok': True, 'id': 9, 'ref': 'W9', 'at': '2026-11-24T10:00:00Z', 'mailed': False, 'dm': bool(body.get('token')), 'text': 'We received your withdrawal.\n\nReference: W9'})
        return J({}, 404)
    pg.route(SB + '/rest/v1/rpc/**', rpc)
    pg.route(SB + '/functions/v1/stripe/**', fn)
def fresh(br, tag, who=MEMBER, hash='#home'):
    calls = []; box = {'welcomed': False, 'msgs': [], 'unread': 0}
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc101-' + tag); stub(pg, calls, box)
    pg.goto('http://127.0.0.1:8765/version.json')
    if who: pg.evaluate(who)
    pg.evaluate(OLD); pg.evaluate("localStorage.setItem('lc-hub-v2', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('lc-hub-v2') || '{}'), { profile: { name: 'Free' } })))")
    pg.goto(APP + hash); pg.wait_for_timeout(2400)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
    return c, pg, calls, box
OVER = "Math.max(0, document.documentElement.scrollWidth - innerWidth)"
with sync_playwright() as p:
    br = p.chromium.launch()
    # ---------- a free member: the welcome arrives, the chat is open ----------
    c, pg, calls, box = fresh(br, 'free')
    pg.wait_for_timeout(5500)
    wc = [x[1] for x in calls if x[0] == 'lc101_welcome']
    out('welcome asked [once, with the name]', [len(wc), wc[0].get('p_name') if wc else None])
    out('notice [Kyenzo sent you a message, link]', pg.evaluate("(() => { const n = document.getElementById('lc72-note'); return n ? [n.querySelector('b').textContent, n.querySelector('a').getAttribute('href')] : null; })()"))
    pg.evaluate("location.hash = '#coach-chat'"); pg.wait_for_timeout(1500)
    out('free chat [title, welcome bubble, button, send form, no upgrade wall]', pg.evaluate("(() => { const h = document.querySelector('[data-lc72-chat]'); return [h.querySelector('h1').textContent, (h.querySelector('.lc72-msg.is-auto p') || {}).textContent || '', (h.querySelector('.lc72-msg.is-auto a') || {}).textContent || '', !!h.querySelector('[data-lc72-send]'), !h.querySelector('.lc72-up')]; })()"))
    pg.fill('[data-lc72-draft]', 'Hi Kyenzo, why do I lose with the Caro-Kann?')
    pg.evaluate("document.querySelector('[data-lc72-send] button[type=submit]').click()"); pg.wait_for_timeout(1200)
    sc = [x[1] for x in calls if x[0] == 'lc72_chat_send']
    out('free member sends [body, shown as mine]', [sc[0].get('p_body') if sc else None, pg.evaluate("[...document.querySelectorAll('.lc72-msg.is-me p')].map(p => p.textContent).pop() || ''")])
    out('chat layout [overflow-x]', pg.evaluate(OVER))
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(400)
    pg.screenshot(path=SHOTS + '/lc101-chat-phone.png')
    # ---------- the withdrawal, signed in: the acknowledgement goes to the chat ----------
    pg.evaluate("location.hash = '#withdraw'"); pg.wait_for_timeout(1000)
    out('withdraw, signed in [where the confirmation goes]', pg.evaluate("document.querySelector('[data-lc99-wdwhere]').textContent"))
    pg.fill('[data-lc99-wdf] [name=name]', 'Free Member'); pg.select_option('[data-lc99-wdf] [name=contract]', 'tokens')
    pg.evaluate("document.querySelector('[data-lc99-wdf] button[type=submit]').click()"); pg.wait_for_timeout(400)
    pg.evaluate("document.querySelector('[data-lc99-wdgo]').click()"); pg.wait_for_timeout(1300)
    out('withdraw done [sent with the account, chat line, Open my chat, download stays]', pg.evaluate("(() => { const d = document.querySelector('.lc99-wdc.is-done'); return [/This confirmation is also in your chat with Kyenzo/.test(d.textContent), (d.querySelector('a[href=\"#coach-chat\"]') || {}).textContent || '', !!d.querySelector('[data-lc99-wddl]')]; })()")
        + [bool([x for x in calls if x[0] == 'stripe/withdraw' and x[1].get('token')])])
    c.close()
    # ---------- the withdrawal as a guest ----------
    c, pg, calls, box = fresh(br, 'guest', who=None, hash='#withdraw')
    pg.evaluate("location.hash = '#withdraw'"); pg.wait_for_timeout(900)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
    out('withdraw, guest [where, sign-in link]', pg.evaluate("[document.querySelector('[data-lc99-wdwhere]').textContent, (document.querySelector('[data-lc99-wdwhere] a') || {}).getAttribute('href')]"))
    out('guest: no welcome call', len([x for x in calls if x[0] == 'lc101_welcome']))
    c.close()
    # ---------- the owner: the welcome message on top of Automated messages, the inbox copy ----------
    c, pg, calls, box = fresh(br, 'owner', who=OWNER, hash='#coach-chat')
    pg.evaluate("location.hash = '#coach-chat'"); pg.wait_for_timeout(1500)
    out('owner inbox [line, pinned row]', pg.evaluate("[document.querySelector('.lc72-ch p').textContent.split('.')[0], /📌/.test(document.querySelector('.lc72-inbox li').textContent)]"))
    pg.evaluate("document.querySelector('[data-lc72=\"ctab\"][data-t=\"auto\"]').click()"); pg.wait_for_timeout(1200)
    out('owner automated messages [first form, its title]', pg.evaluate("[document.querySelector('[data-lc72-auto]').getAttribute('data-lc72-auto'), document.querySelector('[data-lc72-auto] h3').textContent]"))
    c.close()
    app_ = open(REPO + '/app.html', encoding='utf-8').read()
    same = [open(REPO + '/' + n + '.js', encoding='utf-8').read().strip() in app_ for n in ('lc72', 'lc99')]
    out('LC101 [embedded copies equal lc72 / lc99, menu line, build]', same + ['"Direct messages with Kyenzo: ask him anything"' in app_, __import__('re').search(r'CONFIG=\{version:"([^"]+)"', app_).group(1)])
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
