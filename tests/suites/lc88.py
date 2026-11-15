# lc88 (9.48.0): one guide at a time. Every guiding block (Claim Level 2, the Level road, the quest level, the quest drip, the road-done
# card, the Hero's Journey invitation, the save hint, the upgrade banner, the mission card and the floating LC19 notes) is folded into ONE
# banner right under the navigation, showing exactly one step with at most two buttons. When that step is done the banner moves on to the
# next one. On the quest board itself (#quests) the board is the step, so the banner steps aside; the ritual road waits until the quest
# levels are done and then shows one step at a time. Two automatic sheets with the same title never stack.
GUIDES = "['#lc42-claim','#lc42-strip','#lc84-strip','#lc39-q','#lc71-road-done','[data-lc62-card]','#lc40-nudge','#lc45-banner','.lc71-mission','#lc19-banners','#lc69-road']"
STATE = """(() => { const vis = (e) => { if (!e) return false; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'; };
  const b = document.getElementById('lc88'), on = !!b && !b.hidden && vis(b);
  return { src: LC88.current(), guides: %s.filter((s) => vis(document.querySelector(s))), bar: on ? b.querySelector('.lc88-x').textContent.replace(/\\s+/g, ' ').trim() : '',
    buttons: on ? [...b.querySelectorAll('.lc88-a .btn')].map((x) => x.textContent.trim()) : [], sheets: [...document.querySelectorAll('.sheet-wrap')].filter(vis).length }; })()""" % GUIDES
def skip_first_run(pg):
    for i in range(6):
        n = pg.evaluate("(() => { const bs = [...document.querySelectorAll('.lc30-ask button')]; if (!bs.length) return 0; (bs.find((b) => /skip|later|not now|continue|next/i.test(b.textContent)) || bs[0]).click(); return 1; })()")
        if not n: break
        pg.wait_for_timeout(1000)
def st(pg, k):
    pg.wait_for_timeout(1300); s = pg.evaluate(STATE)
    out(k + ' [source, other guides visible, sheets]', [s['src'], s['guides'], s['sheets']])
    out(k + ' [banner text, buttons]', [s['bar'], s['buttons']])
with sync_playwright() as p:
    br = p.chromium.launch()
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc88')
    pg.goto('http://127.0.0.1:8765/app.html#trim'); pg.wait_for_timeout(3500); skip_first_run(pg)
    pg.evaluate("location.hash = '#trim'"); st(pg, 'new player on the game review'); pg.screenshot(path=SHOTS + '/lc88-new-player.png')
    out('banner place [first in the page, right under the navigation, no other block above it]', pg.evaluate("(() => { const b = document.getElementById('lc88'), t = document.getElementById('topbar'), v = document.getElementById('view'); const r = b.getBoundingClientRect(); const above = [...v.children].filter((x) => x !== b && getComputedStyle(x).display !== 'none' && x.getBoundingClientRect().height > 0 && x.getBoundingClientRect().top < r.top).length; return [b.parentNode === v, Math.round(r.top - t.getBoundingClientRect().bottom) >= 0 && r.top < 260, above]; })()"))
    out('fixed pop-ups on the screen [none besides the navigation and the owner tools]', pg.evaluate("[...document.querySelectorAll('body *')].filter((e) => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.position === 'fixed' && s.display !== 'none' && s.visibility !== 'hidden' && r.height > 40 && r.width > 120 && r.bottom > 0 && r.top < innerHeight && !e.closest('#topbar') && !e.closest('[id^=lc49]') && !e.closest('[class*=lc49]') && !e.closest('.toast-wrap,#toasts') && e.closest('body') && !e.closest('#lc88'); }).map((e) => e.id || String(e.className)).length"))
    out('the OG badge waits in the bell [no celebration on screen, in the quiet inbox]', pg.evaluate("[document.querySelectorAll('.cele').length, JSON.parse(localStorage.getItem('lc-hub-quiet-v1') || '{\"items\":[]}').items.some((x) => /OG/.test(x.title))]"))
    out('celebrations one at a time [second one waits]', pg.evaluate("(() => { const before = JSON.parse(localStorage.getItem('lc-hub-quiet-v1') || '{\"items\":[]}').items.length; Celebrate.brilliant('One'); const a = document.querySelectorAll('.cele').length; Celebrate.great('Two'); return [a, document.querySelectorAll('.cele').length, JSON.parse(localStorage.getItem('lc-hub-quiet-v1')).items.length - before]; })()"))
    pg.evaluate("location.hash = '#quests'"); st(pg, 'the quest board')
    out('quest board [the board shows the step, Analyse my first game]', pg.evaluate("(() => { const q = document.querySelector('.lc19-q'); return [!!q, !!q && /Quest level 1 of 5/i.test(q.textContent), !!q && /Analyse my first game/.test(q.textContent)]; })()"))
    # a coach note from the LC19 stack comes through the banner, its cross goes back to the step
    pg.evaluate("location.hash = '#trim'"); pg.wait_for_timeout(1000)
    pg.evaluate("LC19.ui.banner('tilt', 'warn', 'Three losses in a row', '<p>Take a short break before the next game.</p>', [['tilt-break', 'Take a break']])"); st(pg, 'a coach note arrives')
    pg.click('#lc88 .lc88-close'); st(pg, 'after hiding the note')
    # the step is done: the banner moves on to the next single step
    pg.evaluate("MistakeLog.all = () => [{ id: 1 }]; LC19.quest._t.advance()"); st(pg, 'first game reviewed')
    pg.click('#lc88 .lc88-a .btn-ghost'); pg.wait_for_timeout(800)
    out('All options [goes to the quest board]', pg.evaluate("location.hash"))
    # the quest levels are done: the ritual road comes back, one step at a time, and the banner shows the next guide
    pg.wait_for_timeout(1500); st(pg, 'a level-up sheet opens')
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach((x) => x.click())"); pg.wait_for_timeout(600)
    pg.evaluate("LC19.quest.active = () => false; location.hash = '#trim'"); pg.wait_for_timeout(800); pg.evaluate("location.hash = '#quests'"); st(pg, 'quests done, on the quest board'); pg.screenshot(path=SHOTS + '/lc88-quests-done.png')
    out('ritual road [shown, steps folded to one or hidden behind a toggle]', pg.evaluate("(() => { const r = document.getElementById('lc69-road'); if (!r || getComputedStyle(r).display === 'none') return 'no road'; const li = [...r.querySelectorAll('ol.lc69-steps > li')].filter((l) => getComputedStyle(l).display !== 'none'); return [true, li.length <= 1, !!r.querySelector('.lc88-rtog')]; })()"))
    # two automatic sheets with the same title never stack
    pg.evaluate("openSheet({ title: 'Claim Level 2', html: '<p>a</p>' }); openSheet({ title: 'Claim Level 2', html: '<p>b</p>' })"); pg.wait_for_timeout(600)
    out('same sheet twice [sheets open]', pg.evaluate("[...document.querySelectorAll('.sheet-wrap')].filter((s) => getComputedStyle(s).display !== 'none' && /Claim Level 2/.test(s.textContent)).length"))
    c.close()
    # unit: the pick order and the quest-level step
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc88-unit')
    pg.goto('http://127.0.0.1:8765/app.html#trim'); pg.wait_for_timeout(2500)
    out('pick [first present wins, late ones wait during the first days]', pg.evaluate("(() => { const P = LC88._t.pick; const L = (a) => a.map((x) => ({ id: x[0], present: x[1], late: x[2] })); return [P(L([['claim', false], ['road', true], ['quest', true]]), false), P(L([['upgrade', true, true], ['mission', true, true]]), true), P(L([['save', false], ['upgrade', true, true]]), false), P(L([]), false)]; })()"))
    out('priority order', pg.evaluate("LC88._t.SOURCES.map((s) => s.id).join(' > ')"))
    out('version', pg.evaluate("LC88.version"))
    c.close()
    br.close()
src = open(REPO + '/lc88.js', encoding='utf-8').read(); app = open(REPO + '/app.html', encoding='utf-8').read()
out('LC88 [lc88.js is the inline module, init and afterRender wired]', [('/*@@module lc88*/' + src.strip() + '\n/*@@end lc88*/') in app or src.strip() in app, 'LC88.init()' in app, 'LC88.afterRender(' in app])
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
