# lc110 (9.80.0): the core Hub and the Level 20 unlock. A new player sees only the blue (featured) menu items plus one quiet
# "N more open at Level 20" row; hidden pages still open from a link; #features shows the progress and previews; Level 20 opens every
# feature at once (no quest-level gate left), one LC88 step, the optional quest (3 previews, or opening a feature, = +30 XP once, Skip
# ends it), toggles per feature, the owner panel (core list in v5.lc110) and the owner preview switch. Real Chromium, 390x844; Supabase stubbed.
APP = 'http://127.0.0.1:8765/app.html'
SB = 'https://wllljllajadiwjdsageu.supabase.co'
OVER = "Math.max(0, document.documentElement.scrollWidth - innerWidth)"
OLD = "localStorage.setItem('lc90-seen', JSON.stringify(Date.now())); localStorage.setItem('lc34-first', JSON.stringify(Date.now() - 20 * 864e5)); localStorage.setItem('lc19-sw', JSON.stringify({ on: false, level: 3, done: Date.now() }))"
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
PANEL = "[...document.querySelectorAll('#n5-panel .n5-item')].map(a => a.getAttribute('href'))"
def fresh(br, tag, hash='#home', pre=''):
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc110-' + tag)
    pg.route(SB + '/**', lambda r: r.fulfill(status=200, content_type='application/json', body='{"ok":false,"error":"stub"}'))
    pg.goto('http://127.0.0.1:8765/version.json')
    pg.evaluate(OLD)
    if pre: pg.evaluate(pre)
    pg.goto(APP + hash); pg.wait_for_timeout(2800)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
    return c, pg
def menu(pg, g, foot=False):
    pg.evaluate("Nav5.close()"); pg.click('[data-n5="%s"]' % g); pg.wait_for_timeout(250)
    r = pg.evaluate(PANEL); f = pg.evaluate("(() => { const f = document.querySelector('[data-lc110-foot]'); return f ? f.innerText.replace(/\\n/g, ' | ') : ''; })()")
    pg.evaluate("Nav5.close()"); return [r, f] if foot else r
def go(pg, h, ms=1200):
    pg.evaluate("location.hash = '%s'" % h); pg.wait_for_timeout(ms)
with sync_playwright() as p:
    br = p.chromium.launch()
    c, pg = fresh(br, 'new')
    out('pure [decide: core, locked, open, off, exempt, core view off; quest]', pg.evaluate("""(() => { const T = LC110._t;
      return [T.decide({ on: true, core: true }), T.decide({ on: true }), T.decide({ on: true, unlocked: true }), T.decide({ on: true, unlocked: true, off: true }),
        T.decide({ on: true, exempt: true }), T.decide({ on: false }), [T.quest({ seen: { '#a': 1, '#b': 1 } }, ['#a', '#b', '#c'], true).seen, T.quest({ seen: { '#a': 1, '#b': 1, '#c': 1 } }, ['#a', '#b', '#c'], true).done, T.quest({ questSkip: 1, seen: {} }, ['#a'], true).open], T.xpFor(20)]; })()"""))
    out('new player [level, unlocked, cleanCfg]', pg.evaluate("[LC110._t.level().level, LC110.unlocked(), JSON.stringify(LC110.cleanCfg({ on: false, level: 250, core: ['#trim', 'x', '#a b'] }))]"))
    out('Train menu [items, last row]', menu(pg, '3t', True))
    out('Learn menu [items]', menu(pg, 'learn'))
    out('Social menu [items]', menu(pg, 'social'))
    out('Ranked menu [items]', menu(pg, 'ranked'))
    go(pg, '#openings', 1800)
    out('hidden page still opens from a link [hash, page shown]', pg.evaluate("[location.hash, !!document.querySelector('#view') && document.querySelector('#view').innerText.length > 50]"))
    go(pg, '#features')
    out('locked page [title, level line, extras listed, no switches]', pg.evaluate("""[document.querySelector('.lc110-head h1').textContent, /Level 1 · 0 \\/ 21,660 XP/.test(document.body.innerText), document.querySelectorAll('[data-lc110-peek]').length > 20, document.querySelectorAll('[data-lc110-tog]').length]"""))
    pg.click('[data-lc110-peek="#openings"]'); pg.wait_for_timeout(250)
    out('locked preview [what, how, opens at Level 20, not counted]', pg.evaluate("""(() => { const p = document.querySelector('[data-lc110-prev="#openings"]'); return [/What it does:/.test(p.innerText), /How it helps:/.test(p.innerText), /Opens at Level 20/.test(p.innerText), Object.keys(LC110._t.st().seen).length]; })()"""))
    out('locked page phone [overflow-x]', pg.evaluate(OVER))
    out('LC88 before Level 20: None', pg.evaluate("LC110.guide()"))
    pg.evaluate("V6.addXp('think', 22000, { noBench: true, noFw: true })")
    go(pg, '#home', 1500)
    out('Level 20 [level, unlocked, quest levels open every route, LC88 step]', pg.evaluate("""(() => { const g = LC110.guide(); return [LC110._t.level().level, LC110.unlocked(), LC26.levels.minLevel('leaderboard'), LC26.levels.minLevel('dex'), g ? [/Level 20: your full Hub is open/.test(g.html), /0 of 3/.test(g.html), g.acts.length] : null]; })()"""))
    t = menu(pg, '3t')
    out('Train menu after [MSPC trainer, Openings, Endgame in it, manage row]', ['#think' in t, '#openings' in t, '#endgame' in t, t[-1]])
    go(pg, '#features')
    out('open page [title, quest card, switches]', pg.evaluate("[document.querySelector('.lc110-head h1').textContent, !!document.querySelector('[data-lc110-quest]'), document.querySelectorAll('[data-lc110-tog]').length > 20]"))
    pg.click('[data-lc110-peek="#openings"]'); pg.wait_for_timeout(250); pg.click('[data-lc110-peek="#endgame"]'); pg.wait_for_timeout(250)
    out('two previews [seen, open link, quest 2 of 3]', pg.evaluate("[Object.keys(LC110._t.st().seen).length, !!document.querySelector('[data-lc110-prev=\"#endgame\"] a[href=\"#endgame\"]'), /\\(2 of 3\\)/.test(document.querySelector('[data-lc110-quest]').innerText)]"))
    xp0 = pg.evaluate("V6.state().total")
    go(pg, '#leaderboard', 1500)
    out('opening a feature counts [quest done, +30 XP, LC88 step gone]', pg.evaluate("[!!LC110._t.st().questDone, V6.state().total - %d, LC110.guide()]" % xp0))
    go(pg, '#features')
    out('quest done card', pg.evaluate("[!document.querySelector('[data-lc110-quest]'), /Quest done/.test(document.body.innerText)]"))
    pg.click('label.lc110-sw:has([data-lc110-tog="#openings"])'); pg.wait_for_timeout(300)
    t, f = menu(pg, '3t', True)
    out('switch off Openings [saved, gone from Train, manage row says 1 off]', [pg.evaluate("LC110._t.st().off['#openings']"), '#openings' in t, '1 switched off' in f])
    pg.click('label.lc110-sw:has([data-lc110-tog="#openings"])'); pg.wait_for_timeout(300)
    out('switch on again', '#openings' in menu(pg, '3t'))
    pg.click('[data-lc110="alloff"]'); pg.wait_for_timeout(300)
    out('hide all [Train = core + manage row]', menu(pg, '3t'))
    pg.click('[data-lc110="allon"]'); pg.wait_for_timeout(300)
    out('open page phone [overflow-x]', pg.evaluate(OVER))
    c.close()
    # unlocked, Skip ends the quest without looking at anything
    c, pg = fresh(br, 'skip', '#features', "localStorage.setItem('lc110-core', JSON.stringify({ v: 1, unlockedAt: Date.now(), atLevel: 20, seen: {}, off: {} }))")
    pg.click('[data-lc110="skip"]'); pg.wait_for_timeout(300)
    out('skip [no quest card, no LC88 step, every feature still open]', pg.evaluate("[!document.querySelector('[data-lc110-quest]'), LC110.guide(), LC110.visible({ href: '#openings', label: 'x' })]"))
    c.close()
    # the owner: sees every feature, owner panel, preview switch, core list saved in the draft
    c, pg = fresh(br, 'owner', '#home', OWNER)
    out('owner [admin, every Train item, no last row]', [pg.evaluate("!!(typeof Admin !== 'undefined' && Admin.active)"), len(menu(pg, '3t'))])
    go(pg, '#features')
    out('owner page [owner note, panel, core boxes, blue tags]', pg.evaluate("[/You see every feature \\(owner\\)/.test(document.body.innerText), !!document.querySelector('[data-lc110-own]'), document.querySelectorAll('[data-lc110-cfg] input[name=core]:checked').length, document.querySelectorAll('.lc110-blue').length]"))
    pg.click('[data-lc110-force="core"]'); pg.wait_for_timeout(300)
    out('owner preview new player [Train]', menu(pg, '3t'))
    pg.click('[data-lc110-force=""]'); pg.wait_for_timeout(300)
    pg.check('[data-lc110-cfg] input[name=core][value="#think"]')
    pg.click('[data-lc110-cfg] button[type=submit]'); pg.wait_for_timeout(500)
    out('owner saves MSPC trainer as core [draft v5.lc110, message]', pg.evaluate("(() => { let d = null; try { d = V5Doc.get().lc110 } catch (e) {} return [d && d.core && d.core.indexOf('#think') >= 0, d && d.level, (document.querySelector('[data-lc110-msg]') || {}).textContent || '']; })()"))
    pg.click('[data-lc110-force="core"]'); pg.wait_for_timeout(300)
    out('owner preview with the new core [Train]', menu(pg, '3t'))
    pg.click('[data-lc110-force=""]'); pg.wait_for_timeout(200)
    out('LC110 [embedded copy equals lc110.js, init, afterRender, route, LC88 source, V5Doc whitelist, build]', pg.evaluate("""(async () => {
      const src = await (await fetch('lc110.js')).text(), html = await (await fetch('app.html')).text(), g = await (await fetch('lc88.js')).text();
      const a = html.indexOf('/*@@module lc110*/'), b = html.indexOf('/*@@end lc110*/') + 15;
      return [html.slice(a, b) === src.trim(), html.includes('LC110.init()'), html.includes('LC110.afterRender(route)'), !!MOUNT.features, g.includes('id:"core"') && html.includes('id:"core"'), JSON.stringify(V5Doc.clean({ lc110: { level: 12, on: true, core: ['#trim'] } }).lc110), LC110.version];
    })()"""))
    c.close()
    br.close()
print('ERRORS', len([e for e in errs if 'Failed to load resource' not in e]))
for e in errs:
    if 'Failed to load resource' not in e: print(e)
