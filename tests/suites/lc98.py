# lc98 (9.63.0): the landing page's Elo segment selector above the hero video, the owner's "Landing videos per Elo" page, and the
# Sources & lanes panel (copy link per source row, New source / lane). Real Chromium, 390x844 and 1280x800, Supabase stubbed.
# Landing: no segment live = since 9.65.0 the bar with "coming soon" (before: no bar, coach card); live segments = the bar with the 5 exact labels right above the
# player, the default segment, a click switches the video (and keeps playing when a video was already playing), fullscreen allowed, a
# segment that is not live shows the walkthrough with a note or a "coming soon" card, ?elo= opens a segment, the pick is remembered,
# arrow keys work, the left-hand story and the install button are untouched, nothing scrolls sideways.
# App (owner): the editor shows the 5 segments with link / visibility / live, warns about a Private video, publishes lc89_cfg 'segvideo';
# the lanes page lists lanes + sources from lc94_report with the counts and a Copy link per row (production address, ?src=), creates
# a lane (slug rules, copied link), CSV export; the Command Center carries the panel; LC73's source rows get a Copy link; members see nothing.
import json as _json
LAND = 'http://127.0.0.1:8765/'
APP = 'http://127.0.0.1:8765/app.html'
SB = 'https://wllljllajadiwjdsageu.supabase.co'
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
MEMBER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'm', refresh_token: '', exp: Date.now() + 36e5, email: 'anna@example.com' }))"
OLD = "localStorage.setItem('lc34-first', JSON.stringify(Date.now() - 20 * 864e5))"
Y1, Y2, YW = 'aaaaaaaaaa1', 'bbbbbbbbbb2', 'wwwwwwwwww3'
CFG = {'v': 1, 'on': True, 'label': 'Pick your rating', 'def': '800-1200', 'segs': {
    '0-800': {'url': 'https://youtu.be/' + Y1, 'yt': 'unlisted', 'live': True},
    '800-1200': {'url': 'https://www.youtube.com/watch?v=' + Y2, 'yt': 'public', 'live': True},
    '1200-1600': {'url': 'https://youtu.be/cccccccccc4', 'yt': 'private', 'live': False}}}
REPORT = [{'step': 'landing', 'src': 'fb-ads', 'players': 40}, {'step': 'first_open', 'src': 'fb-ads', 'players': 12}, {'step': 'paid', 'src': 'fb-ads', 'players': 1},
          {'step': 'landing', 'src': 'mc_ig', 'players': 90}, {'step': 'first_review_done', 'src': 'mc_ig', 'players': 30}, {'step': 'landing', 'src': '(none)', 'players': 7}]
def stub(pg, calls, box):
    def rpc(route, request):
        n = request.url.split('/rpc/')[1].split('?')[0]; body = _json.loads(request.post_data or '{}'); calls.append([n, body])
        J = lambda o, st=200: route.fulfill(status=st, content_type='application/json', body=_json.dumps(o))
        if n == 'lc89_cfg_public': return J({'ok': True, 'k': body.get('p_k'), 'v': box.get('seg') if body.get('p_k') == 'segvideo' else {}, 'updated_at': '2026-11-21T10:00:00Z' if body.get('p_k') == 'segvideo' and box.get('seg') else None})
        if n == 'lc89_cfg_save':
            if body.get('p_k') == 'segvideo': box['seg'] = body.get('p_v'); return J({'ok': True, 'updated_at': '2026-11-21T11:00:00Z'})
            return J({'ok': False, 'error': 'key'})
        if n == 'lc89_cfg_history': return J({'ok': True, 'rows': [{'id': 7, 'saved_at': '2026-11-20T09:00:00Z', 'saved_by': 'lanckrietchess@gmail.com', 'size': 300}]})
        if n == 'lc98_lanes': return J({'ok': True, 'rows': box['lanes'], 'short_links': ['igb']})
        if n == 'lc98_lane_save':
            p = body.get('p') or {}
            if any(l['slug'] == p.get('slug') for l in box['lanes']) and not p.get('update'): return J({'ok': False, 'error': 'taken'})
            if p.get('update'):
                for l in box['lanes']:
                    if l['slug'] == p['slug']: l.update({k: v for k, v in p.items() if k != 'update'})
            else: box['lanes'].insert(0, dict(p, active=True, created_at='2026-11-21T12:00:00Z'))
            return J({'ok': True, 'slug': p.get('slug')})
        if n == 'lc94_report': return J(REPORT)
        if n == 'lc75_funnel': return J({'ok': True, 'admin': True, 'rows': {'all': {}}, 'kpis': {}, 'channels': [], 'range': {'days': 30}})
        if n == 'lc73_dash': return J({'ok': True, 'admin': True, 'links': [], 'sources': {'fb-ads': 3, 'direct': 2}, 'views': [], 'partners': []})
        if n == 'lc69_member_count': return J({'ok': True, 'members': 120})
        return J({'ok': False, 'error': 'stub'})
    def arena(route, request):
        body = _json.loads(request.post_data or '{}')
        if body.get('action') == 'video_get' and box.get('walk'): return route.fulfill(status=200, content_type='application/json', body=_json.dumps({'ok': True, 'url': 'https://youtu.be/' + YW, 'updated': 0}))
        return route.fulfill(status=200, content_type='application/json', body=_json.dumps({'ok': False}))
    pg.route(SB + '/rest/v1/rpc/**', rpc)
    pg.route(SB + '/functions/v1/arena**', arena)
def land(br, w, hh, mob, tag, seg, walk=True, q='', pre=()):
    calls = []; box = {'seg': seg, 'walk': walk, 'lanes': []}
    c = mkctx(br, w, hh, mob); pg = c.new_page(); watch(pg, 'lc98-' + tag); stub(pg, calls, box)
    if pre:
        pg.goto(LAND + 'version.json')
        for x in pre: pg.evaluate(x)
    pg.goto(LAND + q); pg.wait_for_timeout(1400)
    return c, pg, calls, box
SEL = "(() => { const b = document.querySelector('#seg-bar [aria-selected=\"true\"]'); return b ? b.getAttribute('data-seg') : null; })()"
HERO = "(() => { const h = document.getElementById('walk-hero'), p = h.querySelector('[data-play]'), f = h.querySelector('iframe'); return { cls: h.className, play: p ? p.getAttribute('data-play') : '', cap: p ? p.querySelector('.cap').textContent : '', frame: f ? f.getAttribute('src') : '', fs: f ? f.hasAttribute('allowfullscreen') && /fullscreen/.test(f.getAttribute('allow')) : null, soon: !!h.querySelector('.seg-soon') }; })()"
NOTE = "(() => { const n = document.getElementById('seg-note'); return n.classList.contains('hide') ? '' : n.textContent; })()"
def app(br, w, hh, mob, tag, who=OWNER, hash='#seg-videos', seg=None, lanes=None):
    calls = []; box = {'seg': seg, 'walk': False, 'lanes': lanes if lanes is not None else [{'slug': 'fb-ads', 'name': 'Facebook ads', 'dest': 'landing', 'seg': '800-1200', 'note': '', 'active': True}]}
    c = mkctx(br, w, hh, mob); c.grant_permissions(['clipboard-read', 'clipboard-write'], origin='http://127.0.0.1:8765'); pg = c.new_page(); watch(pg, 'lc98-' + tag); stub(pg, calls, box)
    pg.goto(APP.replace('app.html', 'version.json')); pg.evaluate(who); pg.evaluate(OLD)
    pg.goto(APP + hash); pg.wait_for_timeout(1800)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
    return c, pg, calls, box
with sync_playwright() as p:
    br = p.chromium.launch()
    # ---------- landing: nothing live = as before ----------
    c, pg, calls, box = land(br, 390, 844, True, 'none', {}, walk=False)
    out('landing, no segment saved (9.65.0: the bar is always there) [bar shown, coach card hidden, segvideo asked]', [pg.evaluate("!document.getElementById('seg-box').classList.contains('hide')"), pg.evaluate("document.getElementById('coach-card').classList.contains('hide')"), any(x[0] == 'lc89_cfg_public' and x[1].get('p_k') == 'segvideo' for x in calls)])
    c.close()
    for w, hh, mob, tag in [(390, 844, True, 'phone'), (1280, 800, False, 'desktop')]:
        c, pg, calls, box = land(br, w, hh, mob, tag, CFG)
        out(tag + ' segment bar [shown, label, the 5 labels, right above the player]', [pg.evaluate("!document.getElementById('seg-box').classList.contains('hide')"), pg.evaluate("document.getElementById('seg-h').textContent"),
            pg.evaluate("[...document.querySelectorAll('#seg-bar [data-seg]')].map(b => b.textContent)"), pg.evaluate("document.getElementById('seg-box').nextElementSibling.id")])
        h = pg.evaluate(HERO)
        out(tag + ' default segment [selected, its video, caption, coach card hidden]', [pg.evaluate(SEL), Y2 in h['play'], h['cap'], pg.evaluate("document.getElementById('coach-card').classList.contains('hide')")])
        out(tag + ' left side untouched [install button, story heading]', [pg.evaluate("document.querySelector('.hero-main [data-install]').textContent"), pg.evaluate("document.getElementById('h-story').textContent")])
        out(tag + ' layout [overflow-x, buttons >= 44px, labels fit, bar inside the hero column]', pg.evaluate("[Math.max(0, document.documentElement.scrollWidth - innerWidth), [...document.querySelectorAll('#seg-bar [data-seg]')].every(b => b.getBoundingClientRect().height >= 44), [...document.querySelectorAll('#seg-bar [data-seg]')].every(b => b.scrollWidth <= b.clientWidth + 1), (() => { const a = document.getElementById('seg-bar').getBoundingClientRect(), s = document.getElementById('hero-side').getBoundingClientRect(); return a.left >= s.left - 1 && a.right <= s.right + 1; })()]"))
        pg.evaluate("scrollTo(0, document.getElementById('seg-box').getBoundingClientRect().top + scrollY - 90)"); pg.wait_for_timeout(200); pg.screenshot(path=SHOTS + '/lc98-landing-' + tag + '.png')
        pg.click('#seg-bar [data-seg="0-800"]'); pg.wait_for_timeout(200); h = pg.evaluate(HERO)
        out(tag + ' click 0 - 800 [selected, video switched, caption]', [pg.evaluate(SEL), Y1 in h['play'], h['cap']])
        pg.click('#walk-hero [data-play]'); pg.wait_for_timeout(200); h = pg.evaluate(HERO)
        out(tag + ' play [iframe, the 0 - 800 video, fullscreen allowed]', [bool(h['frame']), Y1 in h['frame'], h['fs']])
        pg.click('#seg-bar [data-seg="800-1200"]'); pg.wait_for_timeout(200); h = pg.evaluate(HERO)
        out(tag + ' switch while playing [plays the 800 - 1200 video at once]', [Y2 in h['frame'], 'autoplay=1' in h['frame']])
        pg.click('#seg-bar [data-seg="1200-1600"]'); pg.wait_for_timeout(200); h = pg.evaluate(HERO)
        out(tag + ' not live yet [walkthrough shown, note]', [YW in (h['play'] + h['frame']), pg.evaluate(NOTE)])
        pg.focus('#seg-bar [data-seg="1200-1600"]'); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(150)
        out(tag + ' arrow key [next segment selected and focused]', [pg.evaluate(SEL), pg.evaluate("document.activeElement.getAttribute('data-seg')")])
        c.close()
    # remembered pick, ?elo=, coming soon without a walkthrough
    c, pg, calls, box = land(br, 390, 844, True, 'remember', CFG, pre=["localStorage.setItem('lc98-seg', '0-800')"])
    out('remembered pick [0-800 opens]', pg.evaluate(SEL))
    c.close()
    c, pg, calls, box = land(br, 390, 844, True, 'elo', CFG, q='?elo=1350', pre=["localStorage.setItem('lc98-seg', '0-800')"])
    out('?elo=1350 [beats the remembered pick: 1200-1600]', pg.evaluate(SEL))
    c.close()
    c, pg, calls, box = land(br, 390, 844, True, 'soon', CFG, walk=False, q='?elo=2000%2B')
    out('?elo=2000+ without a walkthrough [2000-plus, coming soon card]', [pg.evaluate(SEL), pg.evaluate("document.querySelector('#walk-hero .seg-soon b').textContent")])
    c.close()
    off = dict(CFG, on=False)
    c, pg, calls, box = land(br, 390, 844, True, 'off', off, pre=["localStorage.setItem('lc98-segcfg', JSON.stringify({v: " + _json.dumps(CFG) + ", at: 1}))"])
    out('switched off after a cached on [bar hidden, walkthrough back in the hero]', [pg.evaluate("document.getElementById('seg-box').classList.contains('hide')"), YW in pg.evaluate(HERO)['play']])
    c.close()
    # ---------- app: Landing videos per Elo ----------
    for w, hh, mob, tag in [(390, 844, True, 'phone'), (1280, 800, False, 'desktop')]:
        c, pg, calls, box = app(br, w, hh, mob, 'seg-' + tag, seg=CFG)
        out(tag + ' editor [title, segments, live boxes checked, 1200 - 1600 status]', [pg.evaluate("document.querySelector('.lc98 h1').textContent"), pg.evaluate("[...document.querySelectorAll('.lc98-seg legend')].map(l => l.textContent)"),
            pg.evaluate("[...document.querySelectorAll('[name^=\"l-\"]')].map(i => i.checked)"), pg.evaluate("document.querySelector('[data-lc98-row=\"1200-1600\"] [data-lc98-st]').textContent")])
        out(tag + ' editor layout [overflow-x]', pg.evaluate("Math.max(0, document.documentElement.scrollWidth - innerWidth)"))
        pg.screenshot(path=SHOTS + '/lc98-editor-' + tag + '.png', full_page=False)
        c.close()
    c, pg, calls, box = app(br, 390, 844, True, 'seg-save', seg=CFG)
    pg.fill('[name="u-1600-2000"]', 'https://youtu.be/dddddddddd5'); pg.check('[name="l-1600-2000"]'); pg.select_option('[name="y-1600-2000"]', 'public')
    out('live status while typing [1600 - 2000]', pg.evaluate("document.querySelector('[data-lc98-row=\"1600-2000\"] [data-lc98-st]').textContent"))
    pg.fill('[name="u-2000-plus"]', 'not a link'); pg.click('[data-lc98-segform] button[type=submit]'); pg.wait_for_timeout(500)
    out('bad link [not published, message]', [not any(x[0] == 'lc89_cfg_save' for x in calls), 'not a YouTube' in pg.evaluate("document.querySelector('[data-lc98-msg]').textContent")])
    pg.fill('[name="u-2000-plus"]', ''); pg.click('[data-lc98-segform] button[type=submit]'); pg.wait_for_timeout(900)
    sv = [x[1] for x in calls if x[0] == 'lc89_cfg_save']
    d = sv[-1]['p_v'] if sv else {}
    out('published [key, live segments, 1600 - 2000 link, default, private still not live]', [sv[-1]['p_k'] if sv else None, [k for k, v in d.get('segs', {}).items() if v.get('live')], d.get('segs', {}).get('1600-2000', {}).get('url'), d.get('def'), d.get('segs', {}).get('1200-1600', {}).get('live')])
    out('published message', pg.evaluate("document.querySelector('[data-lc98-msg]').textContent"))
    pg.click('[data-lc98-row="800-1200"] [data-lc98="seg-copy"]'); pg.wait_for_timeout(300)
    out('copy landing link for one Elo [clipboard]', pg.evaluate("navigator.clipboard.readText()"))
    c.close()
    # ---------- app: Sources & lanes ----------
    for w, hh, mob, tag in [(390, 844, True, 'phone'), (1280, 800, False, 'desktop')]:
        c, pg, calls, box = app(br, w, hh, mob, 'lanes-' + tag, hash='#lanes')
        rows = pg.evaluate("[...document.querySelectorAll('[data-lc98-src-row]')].map(r => [r.getAttribute('data-lc98-src-row'), [...r.querySelectorAll('td:not(.lc98-act)')].map(t => +t.textContent)])")
        out(tag + ' lanes [rows in order with counts]', rows)
        out(tag + ' lanes layout [overflow-x]', pg.evaluate("Math.max(0, document.documentElement.scrollWidth - innerWidth)"))
        pg.screenshot(path=SHOTS + '/lc98-lanes-' + tag + '.png')
        c.close()
    c, pg, calls, box = app(br, 1280, 800, False, 'lanes-copy', hash='#lanes')
    pg.click('[data-lc98-src-row="fb-ads"] [data-lc98="copy"]'); pg.wait_for_timeout(300)
    a1 = pg.evaluate("navigator.clipboard.readText()")
    pg.click('[data-lc98-src-row="mc_ig"] [data-lc98="copy"]'); pg.wait_for_timeout(300)
    a2 = pg.evaluate("navigator.clipboard.readText()")
    pg.click('[data-lc98-src-row="(none)"] [data-lc98="copy"]'); pg.wait_for_timeout(300)
    out('copy per row [lane with its Elo video, a seen source, direct]', [a1, a2, pg.evaluate("navigator.clipboard.readText()")])
    pg.fill('[data-lc98-lane] [name="name"]', 'Facebook Ads – Nov'); pg.wait_for_timeout(100)
    out('slug from the name [slug, preview]', [pg.input_value('[data-lc98-lane] [name="slug"]'), pg.evaluate("document.querySelector('[data-lc98-preview]').textContent")])
    pg.fill('[data-lc98-lane] [name="slug"]', 'fb ads'); pg.wait_for_timeout(100)
    out('slug typing [space becomes a dash]', pg.input_value('[data-lc98-lane] [name="slug"]'))
    pg.fill('[data-lc98-lane] [name="slug"]', 'fb-ads'); pg.click('[data-lc98-lane] button[type=submit]'); pg.wait_for_timeout(700)
    out('taken slug [message]', pg.evaluate("document.querySelector('[data-lc98-lmsg]').textContent"))
    pg.fill('[data-lc98-lane] [name="name"]', 'ManyChat flow 2'); pg.fill('[data-lc98-lane] [name="slug"]', 'mc-flow2'); pg.select_option('[data-lc98-lane] [name="dest"]', 'deeplink')
    pg.click('[data-lc98-lane] button[type=submit]'); pg.wait_for_timeout(1000)
    sv = [x[1]['p'] for x in calls if x[0] == 'lc98_lane_save']
    out('new lane [saved, copied, ready box, row listed first]', [[sv[-1]['slug'], sv[-1]['dest'], sv[-1]['name']], pg.evaluate("navigator.clipboard.readText()"), pg.evaluate("!!document.querySelector('.lc98-made')"), pg.evaluate("document.querySelector('[data-lc98-src-row]').getAttribute('data-lc98-src-row')")])
    with pg.expect_download() as dl: pg.click('[data-lc98="csv"]')
    txt = open(dl.value.path(), encoding='utf-8').read().splitlines()
    out('CSV [header, rows, fb-ads line]', [txt[0], len(txt) - 1, [l for l in txt if ',fb-ads,' in l][0]])
    pg.click('[data-lc98-src-row="fb-ads"] [data-lc98="lane-arch"]'); pg.wait_for_timeout(800)
    out('archive [sent active false, row dimmed]', [[x[1]['p'].get('update'), x[1]['p'].get('active')] for x in calls if x[0] == 'lc98_lane_save'][-1] + [pg.evaluate("document.querySelector('[data-lc98-src-row=\"fb-ads\"]').classList.contains('is-off')")])
    c.close()
    # ---------- Command Center + LC73 source rows + owner menu ----------
    c, pg, calls, box = app(br, 1280, 800, False, 'cc', hash='#analytics'); pg.wait_for_timeout(1200)
    out('Command Center [Sources & lanes panel with rows, LC73 sources have Copy link]', [pg.evaluate("document.querySelectorAll('[data-lc75-cc] [data-lc98-src-row]').length"), pg.evaluate("[...document.querySelectorAll('.lc73-list [data-lc73=\"copy\"]')].map(b => b.getAttribute('data-u'))")])
    c.close()
    c, pg, calls, box = app(br, 390, 844, True, 'member', who=MEMBER, hash='#lanes')
    out('member [lanes page owner only, seg editor owner only, no lane calls]', [pg.evaluate("/for the owner/.test(document.getElementById('view').textContent)"), (pg.goto(APP + '#seg-videos'), pg.wait_for_timeout(1200), pg.evaluate("/for the owner/.test(document.getElementById('view').textContent)"))[2], not any(x[0] in ('lc98_lanes', 'lc89_cfg_save') for x in calls)])
    c.close()
    # unit-ish checks on the module
    c, pg, calls, box = app(br, 390, 844, True, 'unit', hash='#home')
    out('helpers [slugify, slug rules, landing link, app link, deep link]', pg.evaluate("[LC98._t.slugify('Facebook Ads – Nov 2026 (test)'), ['ab', 'fb_ads', '-ab', 'a'.repeat(25), 'fb-ads'].map(LC98._t.slugOk), LC98._t.landingLink('fb-ads', '2000-plus'), LC98._t.appLink('tt-bio', 'app'), LC98._t.appLink('mc-x', 'deeplink'), LC98._t.landingLink('direct')]"))
    c.close()
    br.close()
mod = open(REPO + '/lc98.js', encoding='utf-8').read().strip(); app_ = open(REPO + '/app.html', encoding='utf-8').read()
m73 = open(REPO + '/lc73.js', encoding='utf-8').read().strip(); m75 = open(REPO + '/lc75.js', encoding='utf-8').read().strip()
out('LC98 [embedded copy equals lc98.js, LC73 and LC75 too, init and afterRender wired, build]', [mod in app_, m73 in app_, m75 in app_, 'try{LC98.init()}' in app_, 'LC98.afterRender(route)' in app_, __import__('re').search(r'CONFIG=\{version:"([^"]+)"', app_).group(1)])
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
