# lc89 (9.52.0): the inline editor on the landing page. Real Chromium, 390x844 and 1280x800, Supabase stubbed.
# Visitors: published texts apply (sanitised: no script, no on...= handler, no javascript: link), hidden sections and blocks stay hidden,
# the section order follows the doc, and the "Edit this page" button never shows, not even with the owner e-mail faked in localStorage
# (the server says no). The owner (the server says admin): the button shows, ?edit=1 opens the editor, a text edit + a hidden section +
# a moved section + a Wall card + a proof card are published in ONE Save & Publish, with exactly the diff in lc89_cfg_save.
import json as _json
SBRPC = 'https://wllljllajadiwjdsageu.supabase.co/rest/v1/rpc/'
LAND = 'http://127.0.0.1:8765/index.html'
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'owner-token', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
FAKE = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'member-token', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
DOC = {'v': 1, 'text': {'how.2': 'Think <b>once</b>, the same way.<script>window.__x=1</script><img src=x onerror="window.__x=2">',
                        'faq.1': 'Questions & answers <a href="javascript:alert(1)">bad</a> <a href="/privacy.html">good</a>'},
       'href': {'giveaway.3': 'javascript:alert(1)'}, 'hide': {'giveaway': True}, 'box': {'proof.poc': True}, 'order': ['mission', 'story', 'proof', 'love']}
def stub(pg, doc=None, admin=False, calls=None):
    def h(route, request):
        n = request.url.split('/rpc/')[1].split('?')[0]; body = _json.loads(request.post_data or '{}'); auth = request.headers.get('authorization', '')
        if calls is not None: calls.append([n, body, auth])
        J = lambda o, st=200: route.fulfill(status=st, content_type='application/json', body=_json.dumps(o))
        if n == 'lc89_cfg_public': return J({'ok': True, 'k': 'landing', 'v': doc or {}})
        if n == 'lc89_whoami': return J({'ok': True, 'admin': bool(admin and 'owner-token' in auth), 'signed_in': True})
        if n == 'lc86_wall_admin': return J({'ok': True, 'rows': []}) if admin else J({'message': 'not_admin'}, 403)
        if n == 'lc72_land_admin': return J({'ok': True, 'cfg': {}, 'items': [], 'shots': []}) if admin else J({'message': 'not_admin'}, 403)
        if n == 'lc89_cfg_save': return J({'ok': True}) if admin and 'owner-token' in auth else J({'message': 'not_admin'}, 403)
        if n in ('lc86_wall_save', 'lc72_land_save'): return J({'ok': True, 'id': 50 + len(calls or [])})
        if n == 'lc86_wall_public': return J({'ok': True, 'rows': []})
        return route.fulfill(status=404, body='')
    pg.route(SBRPC + '**', h)
with sync_playwright() as p:
    br = p.chromium.launch()
    for w, hh, mob, tag in [(390, 844, True, 'phone'), (1280, 800, False, 'desktop')]:
        # 1. a visitor sees the published page, sanitised
        c = mkctx(br, w, hh, mob); pg = c.new_page(); watch(pg, 'lc89-visit-' + tag); stub(pg, doc=DOC)
        pg.goto(LAND); pg.wait_for_timeout(1500)
        out(tag + ' visitor text [edited heading, script ran, handler ran, bold kept]', pg.evaluate("[document.querySelector('[data-cms=\"how.2\"]').textContent, window.__x || 0, !!document.querySelector('[data-cms=\"how.2\"] img,[data-cms=\"how.2\"] script'), !!document.querySelector('[data-cms=\"how.2\"] b')]"))
        out(tag + ' visitor links [javascript: dropped in text, good link kept, button href kept]', pg.evaluate("[[...document.querySelectorAll('[data-cms=\"faq.1\"] a')].map(a => a.getAttribute('href')), document.querySelector('[data-cms=\"giveaway.3\"]').getAttribute('href')]"))
        out(tag + ' visitor layout [giveaway hidden, proof-of-concept card hidden, order]', pg.evaluate("[getComputedStyle(document.getElementById('giveaway')).display, getComputedStyle(document.querySelector('[data-cms-box=\"proof.poc\"]')).display, [...document.querySelectorAll('[data-cms-sec]')].slice(0, 4).map(s => s.getAttribute('data-cms-sec'))]"))
        out(tag + ' visitor [edit button shown, editable texts]', pg.evaluate("[getComputedStyle(document.getElementById('lc89-edit')).display, document.querySelectorAll('[contenteditable]').length]"))
        out(tag + ' visitor landing [overflow-x]', pg.evaluate("Math.max(0, document.documentElement.scrollWidth - innerWidth)"))
        c.close()
    # 2. the owner's e-mail faked in localStorage, the server says no: nothing shows, ?edit=1 does nothing
    calls = []
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc89-fake'); stub(pg, admin=False, calls=calls)
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(FAKE)
    pg.goto(LAND + '?edit=1'); pg.wait_for_timeout(1500)
    out('faked owner e-mail [server asked, button display, editor open, editable texts]', pg.evaluate("[" + str(any(x[0] == 'lc89_whoami' for x in calls)).lower() + ", getComputedStyle(document.getElementById('lc89-edit')).display, !!document.querySelector('.lc89-bar'), document.querySelectorAll('[contenteditable]').length]"))
    pg.evaluate("const b = document.getElementById('lc89-edit'); b.hidden = false; b.classList.add('is-on'); b.click()"); pg.wait_for_timeout(400)
    out('faked button forced visible and clicked [editor open]', pg.evaluate("!!document.querySelector('.lc89-bar')"))
    c.close()
    # 3. the owner: the button, the editor, one publish
    for w, hh, mob, tag in [(390, 844, True, 'phone'), (1280, 800, False, 'desktop')]:
        calls = []
        c = mkctx(br, w, hh, mob); pg = c.new_page(); watch(pg, 'lc89-owner-' + tag); stub(pg, admin=True, calls=calls)
        pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(OWNER)
        pg.goto(LAND); pg.wait_for_timeout(1500)
        out(tag + ' owner [edit button shown, label]', pg.evaluate("[getComputedStyle(document.getElementById('lc89-edit')).display, document.getElementById('lc89-edit').textContent]"))
        pg.click('#lc89-edit'); pg.wait_for_timeout(1200)
        out(tag + ' editor [bar, publish disabled, editable texts > 100, section bars, wall add tile, proof add tile]', pg.evaluate("[!!document.querySelector('.lc89-bar'), document.querySelector('[data-lc89=\"publish\"]').disabled, document.querySelectorAll('[contenteditable=\"true\"]').length > 100, document.querySelectorAll('.lc89-secbar').length, !!document.querySelector('[data-wl-a=\"add\"]'), !!document.querySelector('[data-pc-a=\"add\"]')]"))
        el = pg.locator('[data-cms="how.2"]'); el.click(); pg.keyboard.press('End' if not mob else 'End'); pg.evaluate("(() => { const e = document.querySelector('[data-cms=\"how.2\"]'); e.focus(); const r = document.createRange(); r.selectNodeContents(e); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); })()")
        pg.keyboard.type(' Every day.'); pg.wait_for_timeout(200)
        pg.evaluate("document.querySelector('[data-lc89=\"sec\"][data-s=\"faq\"]').click()")
        pg.evaluate("document.querySelector('[data-lc89=\"up\"][data-s=\"proof\"]').click()")
        pg.evaluate("document.querySelector('[data-cms-box=\"proof.founder\"] [data-lc89=\"box\"]').click()")
        out(tag + ' editing [counter, publish enabled, link click did not navigate]', [pg.evaluate("document.querySelector('[data-lc89-count]').textContent"), pg.evaluate("!document.querySelector('[data-lc89=\"publish\"]').disabled"), (pg.evaluate("document.querySelector('[data-cms=\"giveaway.3\"]').click(), location.pathname"))])
        pg.evaluate("(() => { const n = document.querySelector('.lc89-wl[data-i=\"0\"] [data-f=\"name\"]'); n.focus(); n.textContent = 'Igor P.'; n.dispatchEvent(new InputEvent('input', { bubbles: true })); })()")
        pg.evaluate("document.querySelector('[data-wl-a=\"add\"]').click()"); pg.wait_for_timeout(200)
        pg.evaluate("(() => { const n = document.querySelector('.lc89-wl[data-i=\"2\"] [data-f=\"name\"]'); n.textContent = 'Lotte'; n.dispatchEvent(new InputEvent('input', { bubbles: true })); const t = document.querySelector('.lc89-wl[data-i=\"2\"] [data-f=\"tag\"]'); t.textContent = '+180 Elo in 5 weeks'; t.dispatchEvent(new InputEvent('input', { bubbles: true })); })()")
        pg.evaluate("document.querySelector('[data-pc-a=\"add\"]').click()"); pg.wait_for_timeout(200)
        pg.fill('.lc89-pc[data-i="0"] [name="name"]', 'Anna'); pg.fill('.lc89-pc[data-i="0"] [name="start"]', '900'); pg.fill('.lc89-pc[data-i="0"] [name="peak"]', '1150')
        out(tag + ' format bar hides when you leave the texts', pg.evaluate("getComputedStyle(document.querySelector('.lc89-fmt')).display"))
        out(tag + ' editor layout [overflow-x, bar inside the screen]', pg.evaluate("[Math.max(0, document.documentElement.scrollWidth - innerWidth), document.querySelector('.lc89-bar').getBoundingClientRect().bottom <= innerHeight + 1]"))
        pg.screenshot(path=SHOTS + '/lc89-editor-' + tag + '.png')
        n0 = len(calls)
        pg.evaluate("document.querySelector('[data-lc89=\"publish\"]').click()"); pg.wait_for_timeout(1500)
        sent = [x for x in calls[n0:] if x[0] in ('lc89_cfg_save', 'lc86_wall_save', 'lc72_land_save')]
        cfg = [x for x in sent if x[0] == 'lc89_cfg_save'][0][1] if any(x[0] == 'lc89_cfg_save' for x in sent) else {}
        v = cfg.get('p_v', {})
        out(tag + ' publish [order of calls, owner token]', [[x[0] for x in sent], all('owner-token' in x[2] for x in sent)])
        out(tag + ' publish doc [texts, hide, box, order head]', [v.get('text'), v.get('hide'), v.get('box'), (v.get('order') or [])[:4]])
        out(tag + ' publish wall [names, tags, sorts, ids]', [[x[1]['p']['name'] for x in sent if x[0] == 'lc86_wall_save'], [x[1]['p']['tag'] for x in sent if x[0] == 'lc86_wall_save'], [x[1]['p']['sort'] for x in sent if x[0] == 'lc86_wall_save'], [x[1]['p']['id'] for x in sent if x[0] == 'lc86_wall_save']])
        out(tag + ' publish proof', [{k: x[1]['p'][k] for k in ('kind', 'name', 'start', 'peak', 'visible')} for x in sent if x[0] == 'lc72_land_save'])
        out(tag + ' after publish [message, publish disabled]', pg.evaluate("[document.querySelector('[data-lc89-msg]').textContent, document.querySelector('[data-lc89=\"publish\"]').disabled]"))
        c.close()
    br.close()
mod = open(REPO + '/lc89.js', encoding='utf-8').read().strip(); land = open(REPO + '/index.html', encoding='utf-8').read()
out('LC89 [inline copy in index.html equals lc89.js, button hidden in the HTML, no e-mail check left]', [mod in land, '<button type="button" class="lc72-edit" id="lc89-edit" hidden>' in land and '.lc72-edit{display:none;' in land, 'lanckrietchess@gmail.com"&&!/preview' not in land and 'own&&sessionStorage' not in land])
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
