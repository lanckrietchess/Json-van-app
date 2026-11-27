# lc109 (9.79.0): the book's secret 30-day accountability page. Hidden before the link, unlocked by #blueprint30 (and ?book=blueprint),
# then in Learn > Kyenzo's books and on #books; start, today's task with its links, ticking boxes, the accountability check (yes / I skipped),
# two empty days, the tracker grid (fix a past day), the day-7 / 14 notes, the day-30 summary and LC88's once-a-day step.
# Real Chromium, 390x844; Supabase stubbed.
APP = 'http://127.0.0.1:8765/app.html'
SB = 'https://wllljllajadiwjdsageu.supabase.co'
OVER = "Math.max(0, document.documentElement.scrollWidth - innerWidth)"
def fresh(br, tag, hash='#home', pre=''):
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc109-' + tag)
    pg.route(SB + '/**', lambda r: r.fulfill(status=200, content_type='application/json', body='{"ok":false,"error":"stub"}'))
    pg.goto('http://127.0.0.1:8765/version.json')
    pg.evaluate("localStorage.setItem('lc34-first', JSON.stringify(Date.now() - 20 * 864e5))")
    if pre: pg.evaluate(pre)
    pg.goto(APP + hash); pg.wait_for_timeout(2600)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
    return c, pg
def ago(n): return "(() => { const d = new Date(Date.now() - %d * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })()" % n
with sync_playwright() as p:
    br = p.chromium.launch()
    c, pg = fresh(br, 'hidden')
    out('pure [day numbers, boxes per day, check, streak]', pg.evaluate("""(() => { const T = LC109._t, now = Date.now(), y = n => T.ymd(now - n * 864e5);
      const s = Object.assign(T.blank(), { start: y(4), days: { 1: { m: 1, g1: 1 }, 2: { m: 1, g1: 1 } } });
      const s2 = Object.assign(T.blank(), { start: y(4), days: { 1: { m: 1, g1: 1 }, 2: { m: 1, g1: 1 }, 3: { m: 1, g1: 1 }, 4: { m: 1 } } });
      return [T.dayNo(y(0), now), T.dayNo(y(29), now), T.boxesOf(7).length, T.boxesOf(8).length, [T.check(s, now).ask, T.check(s, now).two], [T.check(s2, now).ask, T.check(s2, now).two], T.streak(s, now), T.streak(s2, now)]; })()"""))
    out('before the link [not unlocked, no Learn item]', pg.evaluate("[LC109.unlocked(), Nav5._t.items(Nav5._t.GROUPS.filter(g => g.id === 'learn')[0]).some(x => x.href === '#blueprint30')]"))
    pg.evaluate("location.hash = '#blueprint30'"); pg.wait_for_timeout(1200)
    out('the link [unlocked, secret intro, rules, start button, level gate]', pg.evaluate("""[LC109.unlocked(), /You found the secret page/.test(document.body.innerText), /What should I have thought here\\?/.test(document.body.innerText), !!document.querySelector('[data-lc109=start]'), !!document.querySelector('[data-lc109-page]')]"""))
    out('secret page phone [overflow-x]', pg.evaluate(OVER))
    pg.click('[data-lc109=start]'); pg.wait_for_timeout(400)
    out('day 1 [week, task, link, two boxes]', pg.evaluate("""(() => { const t = document.querySelector('[data-lc109-today]'); return [/Week 1: Think · Day 1 of 30/.test(t.innerText), /MSPC System page/.test(t.innerText), !!t.querySelector('a[href=\"#learn-mspc\"]'), t.querySelectorAll('[data-lc109-box]').length]; })()"""))
    pg.click('[data-lc109-today] [data-lc109-box="m"]'); pg.wait_for_timeout(200); pg.click('[data-lc109-today] [data-lc109-box="g1"]'); pg.wait_for_timeout(300)
    out('ticked [saved, full day, streak 1]', pg.evaluate("(() => { const s = JSON.parse(localStorage.getItem('lc109-b30')); return [s.days[1].m, s.days[1].g1, !!document.querySelector('[data-lc109-day=\"1\"].is-full'), LC109._t.streak(s, Date.now())]; })()"))
    pg.evaluate("location.hash = '#books'"); pg.wait_for_timeout(1500)
    out('#books [card to the secret page]', pg.evaluate("(() => { const a = document.querySelector('[data-lc109-lib] a'); return a ? [a.getAttribute('href'), /Your First 30 Days/.test(a.textContent)] : null; })()"))
    c.close()
    # day 9: yesterday empty -> accountability check; day 7 done earlier
    pre = "localStorage.setItem('lc109-b30', JSON.stringify({ v: 1, unlocked: Date.now(), src: 'link', start: %s, days: { 1: {m:1,g1:1}, 2: {m:1,g1:1}, 3: {m:1,g1:1}, 4: {m:1,g1:1}, 5: {m:1,g1:1}, 6: {m:1,g1:1}, 7: {m:1,g1:1} }, notes: {}, answered: {} }))" % ago(8)
    c, pg = fresh(br, 'check', '#home', pre)
    out('Learn menu [item shows once unlocked, under Kyenzo’s books]', pg.evaluate("[Nav5._t.items(Nav5._t.GROUPS.filter(g => g.id === 'learn')[0]).some(x => x.href === '#blueprint30'), Nav5._t.GROUPS.filter(g => g.id === 'learn')[0].sections[0].items.map(x => x.href)]"))
    out('LC88 step [check-in for day 8]', pg.evaluate("(() => { const m = LC109.guide(); return m ? [/Accountability check/.test(m.html), /Day 8/.test(m.html), m.acts.length, m.sig] : null; })()"))
    pg.evaluate("location.hash = '#blueprint30'"); pg.wait_for_timeout(1200)
    out('day 9 [check card, no two-day warning, four boxes, LC88 hides here]', pg.evaluate("[!!document.querySelector('[data-lc109-check=\"8\"]'), !document.querySelector('[data-lc109-two]'), document.querySelectorAll('[data-lc109-today] [data-lc109-box]').length, LC109.guide()]"))
    pg.click('[data-lc109=did]'); pg.wait_for_timeout(400)
    out('Yes [day 8 opens to tick]', pg.evaluate("[!!document.querySelector('[data-lc109-edit=\"8\"]'), document.querySelectorAll('[data-lc109-edit] [data-lc109-box]').length]"))
    pg.click('[data-lc109-edit] [data-lc109-box="m"]'); pg.wait_for_timeout(300)
    out('ticked day 8 [check gone, part day]', pg.evaluate("[!document.querySelector('[data-lc109-check]'), !!document.querySelector('[data-lc109-day=\"8\"].is-part')]"))
    pg.click('[data-lc109-day="5"]'); pg.wait_for_timeout(300)
    out('fix a past day [day 5 editor, future locked]', pg.evaluate("[!!document.querySelector('[data-lc109-edit=\"5\"]'), document.querySelector('[data-lc109-day=\"12\"]').disabled]"))
    c.close()
    # day 12: days 10 and 11 empty -> skip + two-day rule
    pre = "localStorage.setItem('lc109-b30', JSON.stringify({ v: 1, unlocked: Date.now(), src: 'link', start: %s, days: { 9: {m:1,g1:1,g2:1,a:1} }, notes: {}, answered: {} }))" % ago(11)
    c, pg = fresh(br, 'two', '#blueprint30', pre)
    out('day 12 [check for day 11, two-day rule]', pg.evaluate("[!!document.querySelector('[data-lc109-check=\"11\"]'), /if you skip one, don’t skip two/.test((document.querySelector('[data-lc109-two]') || {}).innerText || '')]"))
    pg.click('[data-lc109=skipped]'); pg.wait_for_timeout(300)
    out('I skipped it [honest skip saved, check gone, grid says skip]', pg.evaluate("(() => { const s = JSON.parse(localStorage.getItem('lc109-b30')); return [s.days[11].skip, !document.querySelector('[data-lc109-check]'), /skip/.test(document.querySelector('[data-lc109-day=\"11\"]').innerText)]; })()"))
    c.close()
    # day 14 note, then day 30 summary
    pre = "localStorage.setItem('lc109-b30', JSON.stringify({ v: 1, unlocked: Date.now(), src: 'link', start: %s, days: { 13: {m:1,g1:1,g2:1,a:1} }, notes: { d7: 'C, I never checked their reply' }, answered: {} }))" % ago(13)
    c, pg = fresh(br, 'd14', '#blueprint30', pre)
    out('day 14 [task, note field, links]', pg.evaluate("[/first Alarm Signal and your first Working Point/.test(document.querySelector('[data-lc109-today]').innerText), !!document.querySelector('[data-lc109-note=\"d14\"]'), !!document.querySelector('[data-lc109-today] a[href=\"#system\"]')]"))
    pg.fill('[data-lc109-note="d14"]', 'Their queen moved -> what does it attack now?'); pg.dispatch_event('[data-lc109-note="d14"]', 'change'); pg.wait_for_timeout(200)
    out('note saved', pg.evaluate("JSON.parse(localStorage.getItem('lc109-b30')).notes.d14"))
    c.close()
    pre = "localStorage.setItem('lc109-b30', JSON.stringify({ v: 1, unlocked: Date.now(), src: 'link', start: %s, days: { 28: {m:1,g1:1,g2:1,a:1}, 29: {m:1,g1:1,g2:1,a:1} }, notes: { d7: 'C', d14: 'Queen moved -> scan' }, answered: {} }))" % ago(29)
    c, pg = fresh(br, 'd30', '#blueprint30', pre)
    pg.evaluate("window.__clip = ''; navigator.clipboard.writeText = t => { window.__clip = t; return Promise.resolve() }")
    out('day 30 [tell Kyenzo, start again]', pg.evaluate("[!!document.querySelector('[data-lc109-today] [data-lc109=tell]'), !!document.querySelector('[data-lc109=again]')]"))
    pg.click('[data-lc109-today] [data-lc109=tell]'); pg.wait_for_timeout(800)
    out('summary [copied, notes in it, coach chat]', pg.evaluate("[/My first 30 days with The 2000\\+ Blueprint/.test(window.__clip), /Queen moved -> scan/.test(window.__clip), location.hash]"))
    pg.evaluate("location.hash = '#blueprint30'"); pg.wait_for_timeout(900)
    pg.click('[data-lc109=again]'); pg.wait_for_timeout(400)
    out('start again [round 2, day 8]', pg.evaluate("(() => { const s = JSON.parse(localStorage.getItem('lc109-b30')); return [s.round, LC109._t.dayNo(s.start, Date.now())]; })()"))
    out('page phone [overflow-x]', pg.evaluate(OVER))
    out('LC109 [embedded copy equals lc109.js, init, afterRender, route, LC88 source, build]', pg.evaluate("""(async () => {
      const src = await (await fetch('lc109.js')).text(), html = await (await fetch('app.html')).text(), g = await (await fetch('lc88.js')).text();
      const a = html.indexOf('/*@@module lc109*/'), b = html.indexOf('/*@@end lc109*/') + 15;
      return [html.slice(a, b) === src.trim(), html.includes('LC109.init()'), html.includes('LC109.afterRender(route)'), html.includes('blueprint30:v=>'), g.includes('id:"b30"') && html.includes('id:"b30"'), LC109.version];
    })()"""))
    c.close()
    # ?book=blueprint unlocks too
    c, pg = fresh(br, 'query', '', '')
    pg.goto(APP + '?book=blueprint'); pg.wait_for_timeout(2600)
    out('?book=blueprint [unlocked, on the page]', pg.evaluate("[LC109.unlocked(), location.hash, !!document.querySelector('[data-lc109-page]')]"))
    c.close()
    real = [e for e in errs if 'Failed to load resource' not in e]
    print('ERRORS', len(real))
    for e in real[:8]: print('  ', e)
