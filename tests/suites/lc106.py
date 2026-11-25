# lc106 (9.74.0): the 2-Week Rating Sprint (Home card, #sprint, the Sprint price checkout with the consent step, the LC88 step, LC90's
# "What changed" block), "What changed" from the real reviewed-games numbers, clean funnel numbers (preview host, owner device) and the
# first review's "Instinct versus MSPC". Real Chromium, 390x844; Supabase and the Stripe function stubbed.
import json as _json, datetime as _dt
_S0 = (_dt.datetime.now(_dt.timezone.utc) - _dt.timedelta(days=6, hours=2)).strftime('%Y-%m-%dT%H:%M:%SZ')
_UNTIL = (_dt.datetime.now(_dt.timezone.utc) + _dt.timedelta(hours=47, minutes=30)).strftime('%Y-%m-%dT%H:%M:%SZ')
APP = 'http://127.0.0.1:8765/app.html'
SB = 'https://wllljllajadiwjdsageu.supabase.co'
MEMBER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'm', refresh_token: '', exp: Date.now() + 36e5, email: 'free@example.com' }))"
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
OLD = "localStorage.setItem('lc34-first', JSON.stringify(Date.now() - 20 * 864e5))"
OVER = "Math.max(0, document.documentElement.scrollWidth - innerWidth)"
def stub(pg, calls, box):
    def rpc(route, request):
        n = request.url.split('/rpc/')[1].split('?')[0]; body = _json.loads(request.post_data or '{}'); calls.append([n, body])
        J = lambda o, st=200: route.fulfill(status=st, content_type='application/json', body=_json.dumps(o))
        if n == 'lc106_state': return J(box['sprint'] or {'ok': True, 'joined': False, 'linked': True, 'rating': 1180, 'target': 75, 'days': 14, 'xp_goal': 1500, 'pct': 20})
        if n == 'lc106_join':
            box['sprint'] = {'ok': True, 'joined': True, 'started_at': box['started'], 'ends_at': '2026-12-09T10:00:00Z', 'days_left': 8, 'over': False, 'site': 'chesscom', 'uname': 'free',
                             'start': 1180, 'now': 1215, 'gain': 35, 'target': 75, 'best': 1215, 'xp': 1600, 'xp_goal': 1500, 'xp_done': True, 'rating_done': False,
                             'pct': 20, 'reward_kind': 'month', 'reward_at': _S0, 'reward_active': True, 'reward_until': _UNTIL, 'reward_used': False,
                             'week1_xp': 500, 'week1_tokens': 14, 'week1_done': True, 'week1_until': _S0}
            return J(box['sprint'])
        if n == 'lc106_progress': return J(box['sprint'])
        if n == 'lc106_admin': return J({'ok': True, 'cfg': {'on': True, 'xp_goal': 1500, 'pct': 20, 'days': 14, 'reward_days': 14, 'xp_day_max': 2500}, 'rows': [{'email': 'a@b.co', 'site': 'chesscom', 'uname': 'alpha', 'start': 950, 'now': 1010, 'target': 100, 'xp': 900, 'xp_goal': 1500, 'pct': 0}]})
        if n == 'lc94_exclude_me': box['excluded'] += 1; return J(True)
        if n == 'lc94_step': box['steps'].append(body.get('p_step')); return J(None)
        if n == 'lc97_state': return J({'ok': True, 'signed_in': True, 'sub_status': 'free', 'trial_eligible': True, 'trial': {'used': False}, 'post_trial': {}, 'discount': {}, 'tokens': {}})
        return J({'ok': False, 'error': 'stub'})
    def fn(route, request):
        path = request.url.split('/functions/v1/stripe/')[1].split('?')[0]; body = _json.loads(request.post_data or '{}'); calls.append(['stripe/' + path, body])
        J = lambda o, st=200: route.fulfill(status=st, content_type='application/json', body=_json.dumps(o))
        if path == 'sprint': return J({'ok': True, 'url': 'http://127.0.0.1:8765/version.json?checkout=sprint'})
        return J({}, 404)
    pg.route(SB + '/rest/v1/rpc/**', rpc)
    pg.route(SB + '/functions/v1/stripe/**', fn)
def fresh(br, tag, who=MEMBER, hash='#home', pre=''):
    calls = []; box = {'sprint': None, 'excluded': 0, 'steps': [], 'started': _S0}
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc106-' + tag); stub(pg, calls, box)
    pg.goto('http://127.0.0.1:8765/version.json')
    if who: pg.evaluate(who)
    pg.evaluate(OLD); pg.evaluate("localStorage.setItem('lc94-done', JSON.stringify({first_review_done: Date.now()}))")
    if pre: pg.evaluate(pre)
    pg.goto(APP + hash); pg.wait_for_timeout(2600)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
    return c, pg, calls, box
ROWS = """(() => { const S0 = Date.parse('""" + _S0 + """'), d = n => S0 + n * 864e5; return [{t: d(-9), acc: 70, bl: 3, mi: 2, ia: 2, rating: 1150, result: 'loss'}, {t: d(-7), acc: 72, bl: 2, mi: 2, rating: 1160, result: 'win'},
  {t: d(-5), acc: 69, bl: 3, mi: 3, rating: 1150, result: 'loss'}, {t: d(1), acc: 78, bl: 1, mi: 1, gr: 1, rating: 1190, result: 'win'},
  {t: d(3), acc: 80, bl: 1, mi: 1, rating: 1205, result: 'win'}, {t: d(5), acc: 76, bl: 0, mi: 2, rating: 1215, result: 'draw'}]; })()"""
with sync_playwright() as p:
    br = p.chromium.launch()
    c, pg, calls, box = fresh(br, 'unit')
    out('pure [targets, week peak, nothing old counts]', pg.evaluate("""(() => { const T = LC106._t, now = Date.parse('""" + _S0 + """') + 6 * 864e5;
      return [[800, 1000, 1399, 1700, 2100].map(r => T.targetFor(r)), T.weekPeak(""" + ROWS + """, now), T.weekPeak([{t: now - 9 * 864e5, rating: 1500}], now)]; })()"""))
    out('what changed [only true improvements, strongest first]', pg.evaluate("""(() => { const l = LC106._t.changes(""" + ROWS + """, Date.parse('""" + _S0 + """'), Date.parse('""" + _S0 + """') + 6 * 864e5, {gain: 35, start: 1180, now: 1215, xp: 1600, xp_goal: 1500});
      return l.map(x => x.k + ': ' + x.text); })()"""))
    out('what changed [worse numbers are never shown]', pg.evaluate("""LC106._t.changes([{t: 1, bl: 1}, {t: 2, bl: 1}, {t: 3, bl: 1}, {t: 10, bl: 3}, {t: 11, bl: 3}, {t: 12, bl: 3}], 5, 20, {gain: -10}).map(x => x.k)"""))
    out('home invite [card, start button, LC88 step]', pg.evaluate("""(() => { const c = document.querySelector('[data-lc106-home]'); const g = LC106.guide();
      return [!!c, !!(c && c.querySelector('[data-lc106=start]')), c ? c.querySelector('.lc106-t').textContent : '', g && g.acts[0].href]; })()"""))
    pg.evaluate("LC19.ui._t.load = async () => " + ROWS)
    pg.click('[data-lc106-home] [data-lc106=start]'); pg.wait_for_timeout(1500)
    j = [b for n, b in calls if n == 'lc106_join']
    out('join [sent the week peak and the XP]', [len(j), j[0].get('p_peak') if j else None, isinstance(j[0].get('p_xp') if j else None, int)])
    out('home progress [day, rating line, XP line, 13th month, countdown, what changed]', pg.evaluate("""(() => { const c = document.querySelector('[data-lc106-home]'); const t = c ? c.textContent : '';
      return [/Day 7 of 14/.test(t), /1180 → 1215/.test(t), /1,600 \\/ 1,500 XP/.test(t), /13 months for the price of 12/.test(t), /47h \\d\\dm/.test(t), c.querySelectorAll('.lc106-ach li').length]; })()"""))
    out('LC88 bonus step [countdown, claim]', pg.evaluate("(() => { const g = LC106.guide(); return [/Ends in/.test(g.html), g.acts[0].label, g.acts[0].href]; })()"))
    out('home phone [overflow-x]', pg.evaluate(OVER))
    out('LC90 pop-up block [what changed, the rest of the Sprint, the bonus]', pg.evaluate("""(() => { const h = LC106.popupHTML(); return [/What changed in your first/.test(h), /8 days left/.test(h), /Your Sprint bonus \\(13 months/.test(h)]; })()"""))
    pg.evaluate("location.hash = '#sprint'"); pg.wait_for_timeout(1500)
    out('page [title, two yearly plan buttons, how it works]', pg.evaluate("""[document.querySelector('[data-lc106-page] h1').textContent.trim(), document.querySelectorAll('[data-lc106-buy]').length, /How the Sprint works/.test(document.querySelector('[data-lc106-page]').textContent)]"""))
    pg.click('[data-lc106-buy="yearly"][data-lc106-tier="2"]'); pg.wait_for_timeout(500)
    out('consent step [box unticked, pay off, 14 days kept]', pg.evaluate("""(() => { const s = document.querySelector('.lc106-sheet'); return [!!s, s.querySelector('[data-lc106-ok]').checked, s.querySelector('[data-lc106-pay]').disabled, /withdraw within 14 days/.test(s.textContent)]; })()"""))
    pg.check('.lc106-sheet [data-lc106-ok]'); pg.click('.lc106-sheet [data-lc106-pay]'); pg.wait_for_timeout(1500)
    s = [b for n, b in calls if n == 'stripe/sprint']
    out('sprint checkout [route, plan, tier, consent, no percentage from the browser, opened]', [len(s), s[0].get('plan') if s else '', s[0].get('tier') if s else 0, s[0].get('consent') if s else None, 'pct' in (s[0] if s else {}), 'checkout=sprint' in pg.url])
    c.close()
    c, pg, calls, box = fresh(br, 'owner', who=OWNER, hash='#sprint')
    pg.wait_for_timeout(1200)
    out('owner [admin list, settings, device excluded from the funnel]', pg.evaluate("""[!!document.querySelector('[data-lc106-admin] table'), document.querySelectorAll('[data-lc106-cfg]').length, !!localStorage.getItem('lc94-excluded')]"""))
    out('owner funnel [no steps sent]', [n for n, b in calls if n == 'lc94_step'])
    c.close()
    c, pg, calls, box = fresh(br, 'preview', who=None, pre="localStorage.removeItem('lc94-done')")
    out('preview host is never counted', pg.evaluate("[LC94._t.preview('json-van-app-abc123-lanckrietchess.vercel.app'), LC94._t.preview('lanckrietchesstrainerhub.vercel.app')]"))
    out('a normal visitor still counts', 'first_open' in [b.get('p_step') for n, b in calls if n == 'lc94_step'])
    out('first review [Instinct versus MSPC block]', pg.evaluate("""(() => { const f = (LC42._t && LC42._t.instinctHTML) || null; if (!f) return 'not exported';
      const h = f('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', {played: {from: 'h2', to: 'h3'}, bestUci: 'f1b5'}, 'h3', 'Bb5');
      return [/Your instinct versus the better move/.test(h), /Your instinct played h3/.test(h), /The better move was Bb5/.test(h) && !/MSPC/.test(h)]; })()"""))
    out('LC106 [embedded copy equals lc106.js, init, afterRender, route, LC88 step, LC90 hook, build]', pg.evaluate("""(async () => {
      const src = await (await fetch('lc106.js')).text(), html = await (await fetch('app.html')).text();
      const a = html.indexOf('/*@@module lc106*/'), b = html.indexOf('/*@@end lc106*/') + 15;
      return [html.slice(a, b) === src.trim(), html.includes('try{LC106.init()}'), html.includes('LC106.afterRender(route)'), html.includes('sprint:v=>typeof LC106'), html.includes('LC106.guide()'), html.includes('LC106.popupHTML()'), LC106.version]; })()"""))
    c.close()
    br.close()
real = [e for e in errs if 'Failed to load resource' not in e]
print('ERRORS', len(real))
for e in real[:8]: print('  ', e[:300])
