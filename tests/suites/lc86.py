# lc86 (9.46.0): the person-by-person Wall of Love on the landing page and its CMS in the app (#wall-cms). Real Chromium, 390x844 and 1280x800.
# Landing: the two starter cards render directly above the Proof Queue, a tap opens the gallery (Esc / backdrop close it), people from
# lc86_wall_public() replace the starters (avatar or initials, result tag, screenshots and chat in order), admin mode (owner + ?admin=1) shows
# the bar and an Edit link per card, a visitor never sees them. App: the owner page lists people, adds one (name, tag, chat line, screenshot by
# URL) and sends exactly that to lc86_wall_save; a non-owner gets "This page is for the owner"; the missing SQL gives the honest message.
import json as _json
APP = 'http://127.0.0.1:8765/app.html'
SBRPC = 'https://wllljllajadiwjdsageu.supabase.co/rest/v1/rpc/'
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
IMG = 'https://wllljllajadiwjdsageu.supabase.co/storage/v1/object/public/lc72-landing/wall/a.webp'
PEOPLE = {'ok': True, 'rows': [
  {'id': 7, 'name': 'Anna V.', 'tag': '+210 Elo in 2 months', 'avatar': '', 'items': [{'t': 'msg', 'from': 'member', 'text': 'I stopped hanging pieces.'}, {'t': 'img', 'url': IMG, 'cap': 'Her rating graph'}, {'t': 'msg', 'from': 'coach', 'text': 'That is the M in MSPC.'}]},
  {'id': 9, 'name': '<b>Bob</b>', 'tag': 'Hit 1200 Elo', 'avatar': IMG, 'items': []}]}
PNG = bytes.fromhex('89504e470d0a1a0a0000000d4948445200000001000000010806000000') + b'\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
def stub(pg, people=None, admin=None, saved=None, missing=False):
    def h(route, request):
        n = request.url.split('/rpc/')[1].split('?')[0]
        if n == 'lc89_whoami': return route.fulfill(status=200, content_type='application/json', body=_json.dumps({'ok': True, 'admin': request.headers.get('authorization', '') == 'Bearer x'}))   # 9.52.0: the server decides who is admin
        if n == 'lc86_wall_public': return route.fulfill(status=200, content_type='application/json', body=_json.dumps(people if people is not None else {'ok': True, 'rows': []}))
        if n == 'lc86_wall_admin':
            if missing: return route.fulfill(status=404, content_type='application/json', body=_json.dumps({'code': 'PGRST202', 'message': 'Could not find the function'}))
            return route.fulfill(status=200, content_type='application/json', body=_json.dumps(admin if admin is not None else {'ok': True, 'rows': []}))
        if n == 'lc86_wall_save':
            if saved is not None: saved.append(_json.loads(request.post_data or '{}'))
            return route.fulfill(status=200, content_type='application/json', body=_json.dumps({'ok': True, 'id': 11}))
        return route.fulfill(status=404, body='')
    pg.route(SBRPC + '**', h)
    pg.route('**/storage/v1/object/public/**', lambda r: r.fulfill(status=200, content_type='image/png', body=PNG))
VIS = "(() => { const ov = document.getElementById('wl-ov'); return !ov.hidden; })()"
with sync_playwright() as p:
    br = p.chromium.launch()
    for w, hh, mob, tag in [(390, 844, True, 'phone'), (1280, 800, False, 'desktop')]:
        # 1. a visitor, no people saved yet: the starter cards
        c = mkctx(br, w, hh, mob); pg = c.new_page(); watch(pg, 'wall-' + tag); stub(pg)
        pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(1500)
        out(tag + ' starters [section shown, directly above the Proof Queue, names, tags, admin bar hidden]', pg.evaluate("(() => { const l = document.getElementById('love'); let n = l.nextElementSibling; while (n && n.tagName !== 'SECTION') n = n.nextElementSibling; return [!l.classList.contains('hide'), n && n.id, [...document.querySelectorAll('#wl-grid .wl-name')].map(x => x.textContent), [...document.querySelectorAll('#wl-grid .wl-tag')].map(x => x.textContent), document.getElementById('wl-admin').classList.contains('hide')]; })()"))
        pg.click('#wl-grid [data-wl="seed-igor"]'); pg.wait_for_timeout(300)
        out(tag + ' starter gallery [open, name, chat line from Kyenzo, focus on close]', pg.evaluate("[" + VIS + ", document.getElementById('wl-h').textContent, document.querySelectorAll('#wl-body .wl-msg.coach').length, document.activeElement && document.activeElement.id]"))
        pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        out(tag + ' Esc closes, focus back on the card', pg.evaluate("[" + VIS + ", document.activeElement && document.activeElement.getAttribute('data-wl')]"))
        c.close()
        # 2. people from the CMS replace the starters
        c = mkctx(br, w, hh, mob); pg = c.new_page(); watch(pg, 'wall2-' + tag); stub(pg, people=PEOPLE)
        pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(1500)
        out(tag + ' people [names escaped, initials or avatar, CTA counts screenshots, no Edit for visitors]', pg.evaluate("[[...document.querySelectorAll('#wl-grid .wl-name')].map(x => x.textContent), document.querySelector('#wl-grid [data-wl=\"7\"] .wl-av').textContent, !!document.querySelector('#wl-grid [data-wl=\"9\"] img.wl-av'), document.querySelector('#wl-grid [data-wl=\"7\"] .wl-cta').textContent, document.querySelectorAll('.wl-edit').length]"))
        pg.click('#wl-grid [data-wl="7"]'); pg.wait_for_timeout(500)
        out(tag + ' gallery [items in order, image loaded, caption, fits the screen]', pg.evaluate("(() => { const b = document.getElementById('wl-body'); const r = document.querySelector('.wl-box').getBoundingClientRect(); return [[...b.children].map(x => x.classList.contains('wl-shot') ? 'img' : x.classList.contains('coach') ? 'coach' : 'member'), b.querySelector('img').complete, b.querySelector('figcaption').textContent, r.top >= 0 && r.bottom <= innerHeight && r.right <= innerWidth]; })()"))
        pg.mouse.click(5, 5); pg.wait_for_timeout(200)
        out(tag + ' backdrop closes', pg.evaluate(VIS))
        out(tag + ' landing [overflow-x]', pg.evaluate("Math.max(0, document.documentElement.scrollWidth - innerWidth)"))
        pg.screenshot(path=SHOTS + '/lc86-wall-' + tag + '.png')
        c.close()
    # 3. admin mode: owner signed in + ?admin=1
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'wall-admin'); stub(pg, people=PEOPLE)
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(OWNER)
    pg.goto('http://127.0.0.1:8765/?admin=1#love'); pg.wait_for_timeout(1500)
    out('admin mode [still on the landing page, bar shown, Edit links, add link]', pg.evaluate("[location.pathname, !document.getElementById('wl-admin').classList.contains('hide'), [...document.querySelectorAll('.wl-edit')].map(a => a.getAttribute('href')), document.querySelector('#wl-admin a').getAttribute('href')]"))
    pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(1200)
    out('admin mode stays for this tab [bar]', pg.evaluate("!document.getElementById('wl-admin').classList.contains('hide')"))
    pg.goto('http://127.0.0.1:8765/index.html?admin=0'); pg.wait_for_timeout(1200)
    out('admin=0 leaves admin mode [bar hidden]', pg.evaluate("document.getElementById('wl-admin').classList.contains('hide')"))
    c.close()
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'wall-visitor-admin'); stub(pg, people=PEOPLE)
    pg.goto('http://127.0.0.1:8765/?admin=1#love'); pg.wait_for_timeout(1500)
    out('a visitor with ?admin=1 [bar hidden, no Edit links]', pg.evaluate("[document.getElementById('wl-admin').classList.contains('hide'), document.querySelectorAll('.wl-edit').length]"))
    c.close()
    # 4. the CMS in the app
    saved = []
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'cms'); stub(pg, admin=PEOPLE, saved=saved)
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(OWNER)
    pg.goto(APP + '#wall-cms'); pg.wait_for_timeout(3000)
    pg.evaluate("document.querySelectorAll('.sheet-wrap:not(.lc86-sheet) [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(400)
    out('cms list [title, rows, landing admin button]', pg.evaluate("[(document.querySelector('#view h1') || {}).textContent, [...document.querySelectorAll('.lc86-list li b')].map(b => b.textContent), !!document.querySelector('[data-lc86=\"landing\"]')]"))
    pg.evaluate("window.__open = []; window.open = (u) => { window.__open.push(u); return {}; }; document.querySelector('[data-lc86=\"landing\"]').click()")
    out('cms opens the landing page in admin mode', pg.evaluate("window.__open[0].replace(location.origin, '')"))
    pg.evaluate("document.querySelector('[data-lc86=\"add\"]').click()"); pg.wait_for_timeout(500)
    pg.fill('.lc86-sheet input[name=name]', 'Lotte'); pg.fill('.lc86-sheet input[name=tag]', 'Hit 1400 Elo')
    pg.evaluate("document.querySelector('.lc86-sheet [data-add=\"msg\"]').click()"); pg.wait_for_timeout(200)
    pg.fill('.lc86-sheet [data-text="0"]', 'The Trim showed me my real leak.')
    pg.evaluate("window.prompt = () => '" + IMG + "'; document.querySelector('.lc86-sheet [data-add=\"url\"]').click()"); pg.wait_for_timeout(200)
    pg.fill('.lc86-sheet [data-cap="1"]', 'Chat with Kyenzo')
    pg.evaluate("document.querySelector('.lc86-sheet [data-it=\"up\"][data-i=\"1\"]').click()"); pg.wait_for_timeout(200)
    out('cms editor [items after moving the screenshot up, initials preview]', pg.evaluate("[[...document.querySelectorAll('.lc86-sheet .lc86-it')].map(x => x.classList.contains('is-img') ? 'img' : 'msg'), document.querySelector('.lc86-sheet [data-avprev]').textContent]"))
    pg.evaluate("document.querySelector('.lc86-sheet form').requestSubmit()"); pg.wait_for_timeout(1200)
    out('cms save [sent to lc86_wall_save, sheet closed]', [saved[0]['p'] if saved else None, pg.evaluate("!document.querySelector('.lc86-sheet')")])
    c.close()
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'cms-nosql'); stub(pg, missing=True)
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(OWNER)
    pg.goto(APP + '#wall-cms'); pg.wait_for_timeout(3000)
    out('cms without the SQL [honest message]', pg.evaluate("/sql\\/20261115140000_lc86_wall_people\\.sql/.test((document.querySelector('[data-lc86-list]') || {}).textContent || '')"))
    c.close()
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'cms-guest'); stub(pg)
    pg.goto(APP + '#wall-cms'); pg.wait_for_timeout(3000)
    out('cms for a visitor [owner only, no list]', pg.evaluate("[/for the owner/.test(document.getElementById('view').textContent), !document.querySelector('[data-lc86-list]')]"))
    c.close()
    br.close()
mod = open(REPO + '/lc86.js', encoding='utf-8').read().strip(); app = open(REPO + '/app.html', encoding='utf-8').read()
out('LC86 [embedded copy equals lc86.js]', mod in app)
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
