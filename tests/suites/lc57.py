# lc57 (9.31.0): the e-mail opt-in with the bonus token. Real Chromium, 390x844. The server is a stub that follows the database rules
# (the real rules are proven on PostgreSQL by tests/lc57_sql.test.py and the mail function by tests/welcome.test.mjs).
import json as _json
MEMBER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'member@example.com' })); localStorage.setItem('lc19-sw', JSON.stringify({ on: false, level: 5 })); localStorage.setItem('lc-hub-elo-v1', JSON.stringify({ chesscom: { user: 'tester' } }));"
CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS'}
KEY = 'WELCOME-TOKEN-2026'
def _server(pg, mail_ok=True):
    S = {'consent': False, 'redeemed': False, 'queued': False, 'sent': False, 'calls': [], 'mail_calls': 0}
    def rpc(route, request):
        if request.method == 'OPTIONS': return route.fulfill(status=204, headers=CORS)
        name = request.url.split('/rpc/')[1].split('?')[0]
        if not name.startswith(('lc36_consent_set', 'lc57_')): return route.fallback()
        a = _json.loads(request.post_data or '{}'); S['calls'].append(name); r = {'ok': True}
        if name == 'lc36_consent_set': S['consent'] = bool(a.get('p_marketing')); r = {'ok': True, 'marketing': S['consent']}
        elif name == 'lc57_status': r = {'ok': True, 'consent': S['consent'], 'redeemed': S['redeemed'], 'queued': S['queued'], 'sent': S['sent']}
        elif name == 'lc57_welcome_start':
            if not S['consent']: r = {'ok': False, 'error': 'consent'}
            elif S['redeemed']: r = {'ok': True, 'already': True}
            else: S['queued'] = True; r = {'ok': True, 'queued': True}
        elif name == 'lc57_welcome_reveal': r = {'ok': True, 'key': KEY} if S['consent'] else {'ok': False, 'error': 'consent'}
        elif name == 'lc57_redeem':
            k = ''.join(str(a.get('p_key', '')).split()).upper()
            if k != KEY: r = {'ok': False, 'error': 'invalid_key'}
            elif S['redeemed']: r = {'ok': False, 'error': 'already_redeemed'}
            elif not S['consent']: r = {'ok': False, 'error': 'consent'}
            else: S['redeemed'] = True; r = {'ok': True, 'tokens': 1}
        route.fulfill(status=200, headers=dict(CORS, **{'content-type': 'application/json'}), body=_json.dumps(r))
    def mail(route, request):
        if request.method == 'OPTIONS': return route.fulfill(status=204, headers=CORS)
        S['mail_calls'] += 1
        if mail_ok: S['sent'] = True; return route.fulfill(status=200, headers=dict(CORS, **{'content-type': 'application/json'}), body=_json.dumps({'ok': True, 'sent': True}))
        route.fulfill(status=503, headers=dict(CORS, **{'content-type': 'application/json'}), body=_json.dumps({'ok': False, 'reason': 'not_configured'}))
    pg.route('**/rest/v1/rpc/*', rpc); pg.route('**/functions/v1/welcome-mail', mail)
    return S
def _open(br, hash_='home', mail_ok=True):
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc57'); S = _server(pg, mail_ok)
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(MEMBER)
    pg.goto('http://127.0.0.1:8765/app.html#' + hash_); pg.wait_for_timeout(4500)
    pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x => x.remove()); window.__claims = 0; LC36.tokens.claim = () => { window.__claims++; return Promise.resolve(); }"); pg.wait_for_timeout(300)
    return c, pg, S
with sync_playwright() as p:
    br = p.chromium.launch()
    # ---- A. the sheet, mail works
    c, pg, S = _open(br)
    pg.evaluate("LC36.licence.askConsent()"); pg.wait_for_selector('.lc57-sheet', timeout=5000)
    txt = pg.evaluate("document.querySelector('.lc57-sheet').innerText")
    out('sheet [benefit wording, not the old two-button text]', ['1 token' in txt, 'coaching tips' in txt and 'unsubscribe at any time' in txt, 'Yes, keep me posted' not in txt])
    out('sheet [box NOT pre-ticked, button off, No thanks present]', [pg.evaluate("document.querySelector('.lc57-sheet [data-lc57=tick]').checked"), pg.evaluate("document.querySelector('.lc57-sheet [data-lc57=accept]').disabled"), pg.evaluate("!!document.querySelector('.lc57-sheet [data-lc57=no]')")])
    pg.check('.lc57-sheet [data-lc57=tick]'); enabled = pg.evaluate("!document.querySelector('.lc57-sheet [data-lc57=accept]').disabled")
    pg.click('.lc57-sheet [data-lc57=accept]'); pg.wait_for_function("document.querySelector('.lc57-sheet').innerText.includes('Check your inbox')", timeout=6000)
    out('sheet, ticked and accepted [button on, consent stored, queued, mail sent, inbox message with the address]', [enabled, S['consent'], S['queued'], S['sent'], 'member@example.com' in pg.evaluate("document.querySelector('.lc57-sheet').innerText")])
    out('sheet, accepted [old consent keys updated so the old prompts stay quiet]', pg.evaluate("[(Store.get('lc39-mail', {}) || {}).v, !!Store.get('lc36-consent', 0)]"))
    pg.click('.lc57-sheet [data-lc57=gokey]'); pg.wait_for_timeout(1500)
    out('sheet, "Enter the key now" [goes to Account]', pg.evaluate('location.hash') == '#account'); 
    # ---- B. Account card: wrong key, right key, once
    pg.wait_for_selector('.lc39-mailcard [data-lc57=key]', timeout=8000); card = pg.evaluate("document.querySelector('.lc39-mailcard').innerText")
    out('account card [key field, mail note, unsubscribe]', ['Bonus key' in card, 'inbox' in card, 'Unsubscribe' in card])
    pg.fill('.lc39-mailcard [data-lc57=key]', 'NOPE'); pg.click('.lc39-mailcard [data-lc57=redeem]'); pg.wait_for_function("document.querySelector('.lc39-mailcard [data-lc57=msg]').textContent.includes('not valid')", timeout=5000)
    pg.fill('.lc39-mailcard [data-lc57=key]', '  welcome-token-2026 '); pg.click('.lc39-mailcard [data-lc57=redeem]'); pg.wait_for_function("document.querySelector('.lc39-mailcard').innerText.includes('bonus token has been added')", timeout=6000)
    out('account card [wrong key refused, right key (any case, spaces) works, token wallet is claimed, card says done]', [S['redeemed'], pg.evaluate('window.__claims') >= 1, 'Redeem' not in pg.evaluate("document.querySelector('.lc39-mailcard').innerText")])
    again = pg.evaluate("LC57._redeem('WELCOME-TOKEN-2026').then(r => [r.ok, r.msg])")
    out('a second use is refused with its own message', [again[0], 'already used' in (again[1] or '')])
    pg.click('.lc39-mailcard [data-lc57=unsub]'); pg.wait_for_timeout(1000)
    out('unsubscribe [consent off on the server, the card says so]', [S['consent'], 'not getting marketing emails' in pg.evaluate("document.querySelector('.lc39-mailcard').innerText")]); c.close()
    # ---- C. mail service not set up: the key is shown, redeem works from the sheet
    c, pg, S = _open(br, mail_ok=False)
    pg.evaluate("LC36.licence.askConsent()"); pg.wait_for_selector('.lc57-sheet'); pg.check('.lc57-sheet [data-lc57=tick]'); pg.click('.lc57-sheet [data-lc57=accept]')
    pg.wait_for_function("document.querySelector('.lc57-sheet').innerText.includes('could not send the email')", timeout=6000)
    out('mail not configured [honest message, the key is on screen, no claim that a mail was sent]', [KEY in pg.evaluate("document.querySelector('.lc57-sheet').innerText"), 'Check your inbox' not in pg.evaluate("document.querySelector('.lc57-sheet').innerText"), S['mail_calls']])
    pg.click('.lc57-sheet [data-lc57=redeem]'); pg.wait_for_function("document.querySelector('.lc57-sheet').innerText.includes('All set')", timeout=6000)
    out('mail not configured, Redeem now [token credited once, wallet claimed]', [S['redeemed'], pg.evaluate('window.__claims') >= 1]); c.close()
    # ---- D. No thanks
    c, pg, S = _open(br)
    pg.evaluate("LC36.licence.askConsent()"); pg.wait_for_selector('.lc57-sheet'); pg.click('.lc57-sheet [data-lc57=no]'); pg.wait_for_timeout(900)
    out('No thanks [no consent, nothing queued, no mail, sheet closed, not asked again]', [S['consent'], S['queued'], S['mail_calls'], pg.evaluate("!document.querySelector('.lc57-sheet')"), pg.evaluate("(Store.get('lc39-mail', {}) || {}).v")]); c.close()
    # ---- E. Account card before any answer: unticked box, button off, ticking works
    c, pg, S = _open(br, 'account'); pg.wait_for_selector('.lc39-mailcard [data-lc57=tick]', timeout=8000)
    off = pg.evaluate("[document.querySelector('.lc39-mailcard [data-lc57=tick]').checked, document.querySelector('.lc39-mailcard [data-lc57=accept]').disabled]")
    pg.check('.lc39-mailcard [data-lc57=tick]'); pg.click('.lc39-mailcard [data-lc57=accept]'); pg.wait_for_function("document.querySelector('.lc39-mailcard').innerText.includes('Redeem')", timeout=6000)
    out('account card, first time [unticked + button off; ticking and accepting shows the key field]', [off, S['consent'], S['sent']]); c.close()
    # ---- F. static
    c, pg, S = _open(br)
    mod = open(REPO + '/lc57.js', encoding='utf-8').read().strip(); app = open(REPO + '/app.html', encoding='utf-8').read()
    out('LC57 [embedded copy equals lc57.js, both old sheets hand over to it, build]', [mod in app, app.count('LC57.openIncentive()'), pg.evaluate('CONFIG.version')]); c.close()
    br.close()
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
