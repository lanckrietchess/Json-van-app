# lc59 (9.32.0): ELO milestones with token rewards, the Catch-Up Bonus, the "Nice try!" answer, the Account card and the owner's approval sheet.
# Real Chromium, 390x844. The server is a stub that follows the database rules (the real rules are proven on PostgreSQL by tests/lc59_sql.test.py,
# the rating check by tests/eloverify.test.mjs).
import json as _json, re as _re
SEED = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: '%s' })); localStorage.setItem('lc19-sw', JSON.stringify({ on: false, level: 5 })); localStorage.setItem('lc-hub-elo-v1', JSON.stringify({ chesscom: { user: 'tester' } })); localStorage.setItem('lc59', JSON.stringify({ at: Date.now() }));"   # the app's own automatic check is held back so the test drives it
CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS'}
GOOD = 'After three weeks with the MSPC routine I stopped hanging pieces and my rating went up a lot.'
def _msg_ok(t):
    t = ' '.join((t or '').split())
    w = t.split(' ') if t else []
    if len(t) < 30 or len(w) < 6 or _re.search(r'(https?:|www\.|\.com|@)', t) or _re.search(r'(.)\1{4,}', t): return False
    return len({x.lower() for x in w}) >= 0.6 * len(w) and sum(1 for x in w if len(x) >= 4) >= 3
def _server(pg, rating=1437, deployed=True):
    S = {'rating': rating, 'link': None, 'claimed': {}, 'credits': 0, 'allow': False, 'approved': False, 'msg_status': 'none', 'calls': [], 'verify': 0, 'wallet': 0}
    def due():
        l = S['link']
        if not l: return []
        return [g for g in range((l['start'] // 100 + 1) * 100, (l['peak'] // 100) * 100 + 1, 100) if g not in S['claimed']]
    def verify(route, request):
        if request.method == 'OPTIONS': return route.fulfill(status=204, headers=CORS)
        S['verify'] += 1
        if not deployed: return route.fulfill(status=404, headers=CORS, body='')
        r = S['rating']; first = S['link'] is None
        if first: S['link'] = {'start': r, 'peak': r, 'last': r}; cu = max(0, min(10, r // 100 - 8)); S['credits'] += cu
        else: S['link']['last'] = r; S['link']['peak'] = max(S['link']['peak'], r); cu = 0
        route.fulfill(status=200, headers=dict(CORS, **{'content-type': 'application/json'}), body=_json.dumps({'ok': True, 'cached': False, 'first': first, 'site': 'chesscom', 'uname': 'tester', 'start': S['link']['start'], 'last': r, 'peak': S['link']['peak'], 'catchup': cu}))
    def rpc(route, request):
        if request.method == 'OPTIONS': return route.fulfill(status=204, headers=CORS)
        name = request.url.split('/rpc/')[1].split('?')[0]
        if not name.startswith('lc59_'): return route.fallback()
        a = _json.loads(request.post_data or '{}'); S['calls'].append(name); l = S['link']; r = {'ok': True}
        if name == 'lc59_status':
            if not l: r = {'ok': True, 'linked': False}
            else: r = {'ok': True, 'linked': True, 'site': 'chesscom', 'uname': 'tester', 'start': l['start'], 'last': l['last'], 'peak': l['peak'], 'peak_gain': max(0, l['peak'] - l['start']), 'catchup': max(0, min(10, l['start'] // 100 - 8)), 'claimed': sorted(S['claimed']), 'due': due(), 'upgradable': [k for k, v in S['claimed'].items() if v['allow'] and not v['ok']], 'proof': {'allow_web': S['allow'], 'allow_app': S['allow'], 'first_name': None, 'msg_status': S['msg_status'], 'result_approved': S['approved']}}
        elif name == 'lc59_milestone_claim':
            lv = a['p_level']
            if lv not in due(): r = {'ok': False, 'error': 'not_reached' if lv not in S['claimed'] else 'already_claimed'}
            elif a['p_allow'] and not _re.match(r"^[A-Za-z][A-Za-z '-]{1,23}$", (a.get('p_first') or '').strip()): r = {'ok': False, 'error': 'first_name'}
            else:
                msg = (a.get('p_message') or '').strip(); ok = bool(a['p_allow'] and msg and _msg_ok(msg)); nice = bool(a['p_allow'] and msg and not ok)
                tok = 1 + (1 if a['p_allow'] else 0) + (1 if ok else 0); extra = [g for g in due() if g < lv]
                S['claimed'][lv] = {'allow': bool(a['p_allow']), 'ok': ok, 'tokens': tok}
                for g in extra: S['claimed'][g] = {'allow': False, 'ok': False, 'tokens': 1}
                S['credits'] += tok + len(extra)
                if a['p_allow']: S['allow'] = True; S['msg_status'] = 'pending' if ok else S['msg_status']
                r = {'ok': True, 'level': lv, 'tokens': tok, 'extra_levels': len(extra), 'extra_tokens': len(extra), 'nice_try': nice, 'message_ok': ok, 'allow': bool(a['p_allow'])}
        elif name == 'lc59_message_upgrade':
            m = S['claimed'].get(a['p_level'])
            if not m: r = {'ok': False, 'error': 'not_claimed'}
            elif m['ok']: r = {'ok': False, 'error': 'already_upgraded'}
            elif not _msg_ok(a.get('p_message')): r = {'ok': False, 'error': 'not_valuable', 'nice_try': True}
            else: m['ok'] = True; m['tokens'] += 1; S['credits'] += 1; S['msg_status'] = 'pending'; r = {'ok': True, 'tokens': 1}
        elif name == 'lc59_proof_set': S['allow'] = bool(a.get('p_allow_web')); r = {'ok': True, 'allow_web': S['allow']}
        elif name == 'lc59_admin_queue':
            r = {'ok': True, 'rows': [{'user_id': 'u-1', 'first_name': 'Anna', 'allow_web': True, 'message': GOOD, 'msg_status': S['msg_status'] if S['msg_status'] != 'none' else 'pending', 'result_approved': S['approved'], 'site': 'chesscom', 'uname': 'tester', 'start': 1000, 'peak': 1300, 'last': 1280, 'gain': 300}]}
        elif name == 'lc59_admin_set':
            if a.get('p_result') is not None: S['approved'] = bool(a['p_result'])
            if a.get('p_msg'): S['msg_status'] = a['p_msg']
            r = {'ok': True}
        route.fulfill(status=200, headers=dict(CORS, **{'content-type': 'application/json'}), body=_json.dumps(r))
    pg.route('**/functions/v1/elo-verify', verify); pg.route('**/rest/v1/rpc/*', rpc)
    return S
def _open(br, hash_='home', rating=1437, who='member@example.com', deployed=True, account=True):
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc59'); S = _server(pg, rating, deployed)
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate((SEED % who) + ('' if account else "localStorage.removeItem('lc-hub-elo-v1');"))
    pg.goto('http://127.0.0.1:8765/app.html#' + hash_); pg.wait_for_timeout(2500)
    pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x => x.remove()); window.__w = 0; LC36.tokens.claim = () => { window.__w++; return Promise.resolve(); }; undefined;")
    return c, pg, S
def _sheet(pg): return pg.evaluate("(document.querySelector('.lc59-sheet') || {innerText: ''}).innerText")
with sync_playwright() as p:
    br = p.chromium.launch()
    # ---- 1. joining high: Catch-Up Bonus, no milestone pop-up for hundreds below the start
    c, pg, S = _open(br, rating=1437)
    pg.evaluate("(() => { LC59.run(true); return 0; })()"); pg.wait_for_selector('.lc59-catchup', timeout=8000); t = _sheet(pg)
    out('join at 1437 [Catch-Up Bonus pop-up: +6, one token per hundred, tokens claimed into the wallet, no milestone pop-up for hundreds below the start]', ['+6' in t and 'catch-up token' in t, S['credits'], pg.evaluate('window.__w') >= 1, 'You reached' not in t])
    pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x => x.remove())"); c.close()
    # ---- 2. a milestone: the pop-up, the ladder, tick -> fields, 3 tokens
    c, pg, S = _open(br, rating=1437); pg.evaluate("(() => { LC59.run(true); return 0; })()"); pg.wait_for_selector('.lc59-catchup'); pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x => x.remove())")
    S['rating'] = 1520; pg.evaluate("(() => { LC59.run(true); return 0; })()"); pg.wait_for_function("document.querySelector('.lc59-sheet') && document.querySelector('.lc59-sheet').innerText.includes('You reached')", timeout=8000); t = _sheet(pg)
    out('milestone 1500 [congratulation, the three-step reward ladder, Peak Gain line, box unticked, fields hidden until ticked]', ['You reached 1500 ELO' in t, '1 token' in t and '2 tokens' in t and '3 tokens' in t, '+83' in t, pg.evaluate("[document.querySelector('.lc59-sheet [data-lc59=allow]').checked, document.querySelector('.lc59-sheet [data-lc59=more]').hidden]")])
    pg.check('.lc59-sheet [data-lc59=allow]'); out('ticking the website box shows first name + message', pg.evaluate("!document.querySelector('.lc59-sheet [data-lc59=more]').hidden"))
    pg.click('.lc59-sheet [data-lc59=claim]'); pg.wait_for_function("document.querySelector('.lc59-sheet').innerText.includes('Add your first name')", timeout=5000)
    out('allow without a first name [refused with a clear message, nothing claimed]', [S['claimed'] == {}, S['credits']])
    pg.fill('.lc59-sheet [data-lc59=first]', 'Anna'); pg.fill('.lc59-sheet [data-lc59=msg]', GOOD); w0 = pg.evaluate('window.__w'); c0 = S['credits']
    pg.click('.lc59-sheet [data-lc59=claim]'); pg.wait_for_function("document.querySelector('.lc59-sheet').innerText.includes('3 tokens added')", timeout=6000)
    out('allow + first name + real message [3 tokens, the wallet is claimed, message waits for the owner]', [S['credits'] - c0, pg.evaluate('window.__w') > w0, S['msg_status'], S['allow']]); c.close()
    # ---- 3. the "Nice try!" easter egg and the 3rd token later
    c, pg, S = _open(br, rating=1437); pg.evaluate("(() => { LC59.run(true); return 0; })()"); pg.wait_for_selector('.lc59-catchup'); pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x => x.remove())")
    S['rating'] = 1520; pg.evaluate("(() => { LC59.run(true); return 0; })()"); pg.wait_for_function("document.querySelector('.lc59-sheet') && document.querySelector('.lc59-sheet').innerText.includes('You reached')", timeout=8000)
    c0 = S['credits']; pg.check('.lc59-sheet [data-lc59=allow]'); pg.fill('.lc59-sheet [data-lc59=first]', 'Bob'); pg.fill('.lc59-sheet [data-lc59=msg]', 'asdf asdf asdf asdf asdf asdf asdf'); pg.click('.lc59-sheet [data-lc59=claim]')
    pg.wait_for_function("document.querySelector('.lc59-sheet').innerText.includes('Nice try')", timeout=6000); t = _sheet(pg)
    out('made-up message [exact "Nice try! I actually check the messages manually" answer, still 2 tokens for the proof, a way to unlock the 3rd]', ['Nice try! I actually check the messages manually' in t, '2 tokens' in t, S['credits'] - c0, 'Unlock my 3rd token' in t])
    pg.fill('.lc59-sheet [data-lc59=msg2]', 'good good good good good good good'); pg.click('.lc59-sheet [data-lc59=upgrade]'); pg.wait_for_function("document.querySelector('.lc59-sheet [data-lc59=msg-out]') && document.querySelector('.lc59-sheet [data-lc59=msg-out]').textContent.includes('Nice try')", timeout=5000)
    out('another made-up try later [the playful answer again, no token]', S['credits'] - c0)
    pg.fill('.lc59-sheet [data-lc59=msg2]', GOOD); pg.click('.lc59-sheet [data-lc59=upgrade]'); pg.wait_for_function("document.querySelector('.lc59-sheet').innerText.includes('Token number 3')", timeout=6000)
    out('a real review later [3rd token unlocked, once]', [S['credits'] - c0, S['msg_status']]); c.close()
    # ---- 4. just 1 token, and allow without a message = 2
    c, pg, S = _open(br, rating=1437); pg.evaluate("(() => { LC59.run(true); return 0; })()"); pg.wait_for_selector('.lc59-catchup'); pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x => x.remove())")
    S['rating'] = 1620; pg.evaluate("(() => { LC59.run(true); return 0; })()"); pg.wait_for_function("document.querySelector('.lc59-sheet') && document.querySelector('.lc59-sheet').innerText.includes('You reached 1600')", timeout=8000)
    c0 = S['credits']; pg.click('.lc59-sheet [data-lc59=claim]'); pg.wait_for_function("document.querySelector('.lc59-sheet').innerText.includes('added')", timeout=6000)
    out('box not ticked [1 token for 1600 + 1 for the lower milestone 1500 that was never claimed; no website consent recorded]', [S['credits'] - c0, S['allow'], 'for the lower milestones' in _sheet(pg)]); c.close()
    # ---- 5. "Later" is respected for a day; the Account card; withdrawing from the website
    c, pg, S = _open(br, rating=1437); pg.evaluate("(() => { LC59.run(true); return 0; })()"); pg.wait_for_selector('.lc59-catchup'); pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x => x.remove())")
    S['rating'] = 1520; pg.evaluate("(() => { LC59.run(true); return 0; })()"); pg.wait_for_selector('.lc59-sheet [data-lc59=claim]'); pg.click('.lc59-sheet [data-lc59=later]'); pg.wait_for_timeout(700)
    pg.evaluate("(() => { LC59.run(true); return 0; })()"); pg.wait_for_timeout(1500)
    out('"Later" [the pop-up does not come back for 24 hours]', pg.evaluate("!document.querySelector('.lc59-sheet')"))
    pg.evaluate("location.hash = '#account'"); pg.wait_for_selector('.lc59-card', timeout=10000); card = pg.evaluate("document.querySelector('.lc59-card').innerText")
    out('Account card [linked name, start, peak and gain, next milestone, catch-up, a Claim button for the unclaimed 1500]', ['tester' in card and 'start 1437' in card and 'peak 1520' in card and '+83' in card, 'Next milestone: 1600' in card, 'Catch-up bonus: 6' in card, 'Claim 1500' in card])
    pg.click('.lc59-card [data-lc59=open]'); pg.wait_for_selector('.lc59-sheet [data-lc59=claim]'); pg.check('.lc59-sheet [data-lc59=allow]'); pg.fill('.lc59-sheet [data-lc59=first]', 'Cleo'); pg.click('.lc59-sheet [data-lc59=claim]'); pg.wait_for_function("document.querySelector('.lc59-sheet').innerText.includes('2 tokens added')", timeout=6000)
    pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x => x.remove())"); pg.wait_for_function("document.querySelector('.lc59-card').innerText.includes('Take me off the website')", timeout=8000)
    out('Account card after allowing [says it appears once checked, offers "Take me off the website", offers the review for the 3rd token]', ['once I have checked it' in pg.evaluate("document.querySelector('.lc59-card').innerText"), pg.evaluate("!!document.querySelector('.lc59-card [data-lc59=review]')")])
    pg.click('.lc59-card [data-lc59=hide]'); pg.wait_for_function("!document.querySelector('.lc59-card').innerText.includes('Take me off the website')", timeout=6000)
    out('withdraw from the website [server updated, card updated]', [S['allow']]); c.close()
    # ---- 6. silent when it cannot work
    c, pg, S = _open(br, account=False); pg.evaluate("(() => { LC59.run(true); return 0; })()"); pg.wait_for_timeout(1200)
    out('no linked chess account [no request, no pop-up]', [S['verify'], pg.evaluate("!document.querySelector('.lc59-sheet')")]); c.close()
    c, pg, S = _open(br, deployed=False); pg.evaluate("(() => { LC59.run(true); return 0; })()"); pg.wait_for_timeout(1500)
    out('function not deployed yet (404) [silent: no pop-up, no error toast, no crash]', [S['verify'] >= 1, pg.evaluate("!document.querySelector('.lc59-sheet')"), pg.evaluate("!/went wrong|error/i.test(document.body.innerText.slice(0, 600))")]); c.close()
    c, pg, S = _open(br, rating=1437); pg.evaluate("(() => { LC59.run(true); return 0; })()"); pg.wait_for_selector('.lc59-catchup'); pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x => x.remove())"); n = S['verify']
    pg.evaluate("(() => { LC59.run(false); return 0; })()"); pg.wait_for_timeout(800)
    out('a second visit within 12 hours [no new rating read]', S['verify'] == n); c.close()
    # ---- 7. the owner approves
    c, pg, S = _open(br, who='lanckrietchess@gmail.com'); pg.evaluate("(() => { LC59.openAdmin(); return 0; })()"); pg.wait_for_selector('.lc59-row', timeout=8000); t = pg.evaluate("document.querySelector('.lc59-admin').innerText")
    out('owner sheet [name, linked Chess.com name with a profile link, start, PEAK and gain, the message, both statuses]', ['Anna' in t and 'tester' in t and '1000' in t and 'peak 1300' in t and '+300' in t, GOOD[:20] in t, pg.evaluate("document.querySelector('.lc59-row a').href.includes('chess.com/member/tester')")])
    pg.click('.lc59-row [data-lc59=a-result]'); pg.wait_for_function("document.querySelector('.lc59-row').innerText.includes('Remove star')", timeout=6000); pg.click('.lc59-row [data-st=approved]'); pg.wait_for_function("document.querySelector('.lc59-row').innerText.includes('Unapprove message')", timeout=6000)
    out('owner approves result (star) and message [server updated, the list refreshes]', [S['approved'], S['msg_status']])
    pg.click('.lc59-row [data-st=rejected]'); pg.wait_for_timeout(900); out('owner rejects the message', S['msg_status']); c.close()
    c, pg, S = _open(br, who='lanckrietchess@gmail.com', hash_='home'); pg.wait_for_selector('#lc49-float', timeout=12000); pg.click('#lc49-float'); pg.wait_for_selector('[data-lc59-admin]', timeout=5000); pg.click('[data-lc59-admin]'); pg.wait_for_selector('.lc59-admin .lc59-row', timeout=8000)
    out('owner menu [row "Student proofs and messages" opens the same sheet]', True); c.close()
    mod = open(REPO + '/lc59.js', encoding='utf-8').read().strip(); app = open(REPO + '/app.html', encoding='utf-8').read()
    out('LC59 [embedded copy equals lc59.js, owner row in lc49.js and its copy]', [mod in app, 'data-lc59-admin' in open(REPO + '/lc49.js', encoding='utf-8').read(), open(REPO + '/lc49.js', encoding='utf-8').read().strip() in app])
    br.close()
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
