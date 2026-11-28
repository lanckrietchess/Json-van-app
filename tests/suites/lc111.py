# lc111 (9.83.0): Kyenzo's model games in the opening trainer (Learn | Drill | Model games | Explore), the LC100 chip gone from the
# trainer, and the trial hold on the deepest opening levels. A free player: the tab sits between Drill and Explore with the chapter's
# count, opens in the trainer's place (the trainer's board is hidden, never squeezed), shows only wins with the course side, marks the
# course moves and where the game left the course, and stops after the free preview with a Pro lock; Drill closes it again. Pro: the whole
# game from mg_game_moves (stubbed). Trial (LC97's cached state = trialing): Levels 4 and 5 of an opening chapter stay locked, Level 3 is
# open, the gate says so; the owner setting lives in v5.lc111. Real Chromium, 390x844; Supabase stubbed.
import json as _json
APP = 'http://127.0.0.1:8765/app.html'
SB = 'https://wllljllajadiwjdsageu.supabase.co'
OVER = "Math.max(0, document.documentElement.scrollWidth - innerWidth)"
OLD = "localStorage.setItem('lc90-seen', JSON.stringify(Date.now())); localStorage.setItem('lc34-first', JSON.stringify(Date.now() - 20 * 864e5)); localStorage.setItem('lc19-sw', JSON.stringify({ on: false, level: 3, done: Date.now() }))"
CH = 'caro-advance-4-nf3'
STATE = {'moves': None}
def sb(r):
    if 'mg_game_moves' in r.request.url and STATE['moves']:
        return r.fulfill(status=200, content_type='application/json', body=_json.dumps({'moves': STATE['moves'], 'color': 'b', 'result': 'win'}))
    return r.fulfill(status=200, content_type='application/json', body='{"ok":false,"error":"stub"}')
def fresh(br, tag, pre=''):
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'lc111-' + tag)
    pg.route(SB + '/**', sb)
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(OLD)
    if pre: pg.evaluate(pre)
    pg.goto(APP + '#home'); pg.wait_for_timeout(2800)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
    return c, pg
def chapter(pg, lvl=1):
    pg.evaluate("""((ch, k) => { const l = Trees.lines().filter(x => x.tree === ch && x.lvl === k)[0] || Trees.lines().filter(x => x.tree === ch)[0];
      App.ui.op = Object.assign(App.ui.op || {}, { tab: l.group, screen: 'train', lineId: l.id, lv: k, lvLine: l.id, mode: 'drill', only: false, picked: true, scope: 'line' });
      location.hash = '#openings'; })('%s', %d)""" % (CH, lvl)); pg.wait_for_timeout(2600)
with sync_playwright() as p:
    br = p.chromium.launch()
    c, pg = fresh(br, 'free')
    out('pure [common, ordered: your line first, holds: level 4 in trial, level 3, not a tree item, unlocked, owner, no trial; cleanCfg]', pg.evaluate("""(() => { const T = LC111._t;
      const gs = [{ id: 'a', san: ['e4', 'c6', 'd4', 'd5', 'Nc3'], line: 5 }, { id: 'b', san: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5'], line: 6 }];
      const o = T.ordered(gs, ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3']);
      return [T.common(['e4+', 'c6'], ['e4', 'c6', 'd4']), o.map(x => x.id + (x.mine ? '*' : '')),
        T.holds(4, { tree: 'x', id: 'l' }, { trial: true, max: 3 }), T.holds(3, { tree: 'x' }, { trial: true, max: 3 }), T.holds(5, { id: 'm' }, { trial: true, max: 3 }),
        T.holds(5, { tree: 'x', id: 'l' }, { trial: true, max: 3, unlocks: ['l'] }), T.holds(5, { tree: 'x' }, { trial: true, owner: true }), T.holds(5, { tree: 'x' }, { trial: false }),
        JSON.stringify(LC111.cleanCfg({ on: false, trialMax: 9 })), JSON.stringify(V5Doc.clean({ lc111: { on: false, trialMax: 0, x: 1 } }).lc111)]; })()"""))
    out('data [chapters with games, only wins, every game on the course side]', pg.evaluate("""(async () => { const d = await LC111.load(); const ids = Object.keys(d.chapters);
      const sideOk = ids.every(id => { const t = Trees.info(id); return !t || d.chapters[id].every(g => (g.san.length >= 2)); });
      return [ids.length > 40, /wins only/.test(d.rule), sideOk, ids.indexOf('%s') >= 0]; })()""" % CH))
    chapter(pg)
    out('trainer [Mode buttons in order, count, no LC100 chip]', pg.evaluate("""[[...document.querySelectorAll('#op-body .tt40-bar .seg[aria-label=Mode] button')].map(b => b.getAttribute('data-mode') || (b.hasAttribute('data-lc111-mg') ? 'model' : '?')),
      +(document.querySelector('[data-lc111-mg] .chip-n') || {}).textContent > 0, document.querySelectorAll('[data-lc100-chip]:not([hidden])').length]"""))
    bw0 = pg.evaluate("document.querySelector('#op-board').getBoundingClientRect().width")
    pg.click('[data-lc111-mg]'); pg.wait_for_timeout(1500)
    out('model games open [trainer hidden, panel, board at least as wide as the trainer board, tab pressed, games listed, all wins]', pg.evaluate("""(w0 => { const b = document.querySelector('#lc111-board');
      const tr = [...document.querySelectorAll('#op-body > .trainer, #op-body > .v6-strip')];
      return [tr.length > 0 && tr.every(e => getComputedStyle(e).display === 'none'), !!document.querySelector('[data-lc111-panel]'), b.getBoundingClientRect().width >= w0 - 4,
        document.querySelector('[data-lc111-mg]').getAttribute('aria-pressed'), document.querySelectorAll('[data-lc111-g]').length > 0,
        [...document.querySelectorAll('[data-lc111-g] small')].filter((s, i) => i %% 2 === 0).every(s => /won|resigned|checkmate|left/.test(s.textContent))]; })(%f)""" % bw0))
    out('free preview [moves shown = preview, course moves marked, board on the end of the course, Pro lock]', pg.evaluate("""(() => { const S = LC111._t.S, g = S.list[S.gi];
      return [document.querySelectorAll('[data-lc111-p]').length === g.san.length, document.querySelectorAll('.lc111-moves .is-book').length === Math.min(g.line, g.san.length),
        S.at === Math.min(g.line, g.san.length), !!document.querySelector('[data-lc111-pro]')]; })()"""))
    pg.click('[data-lc111-n="last"]'); pg.wait_for_timeout(400)
    out('left the course [note]', pg.evaluate("""(() => { const S = LC111._t.S, g = S.list[S.gi], n = document.querySelector('[data-lc111-note]').textContent;
      return g.line < g.san.length ? /Here the game leaves the course/.test(n) : /Still in the course/.test(n); })()"""))
    out('phone [overflow-x]', pg.evaluate(OVER))
    pg.screenshot(path=SHOTS + '/lc111-model-free.png', full_page=True)
    pg.click('#op-body [data-mode="drill"]'); pg.wait_for_timeout(1200)
    out('Drill closes it [panel gone, trainer shown, tab not pressed]', pg.evaluate("[!document.querySelector('[data-lc111-panel]'), getComputedStyle(document.querySelector('#op-body > .trainer')).display !== 'none', document.querySelector('[data-lc111-mg]').getAttribute('aria-pressed')]"))
    c.close()

    # Pro: the whole game
    c, pg = fresh(br, 'pro', "localStorage.setItem('lc-hub-v2', JSON.stringify({ v: 2, onboarded: true, settings: { sound: false, board: false }, profile: {}, access: { tier: 'vault' } }))")
    pg.evaluate("App.access.tier = 'vault'")
    chapter(pg)
    full = pg.evaluate("""(async () => { const d = await LC111.load(), l = Trees.lines().filter(x => x.tree === '%s')[0];
      const gs = LC111._t.ordered(d.chapters['%s'], String(l.treePath).split(' ')), g = gs[0], c = new Chess(); g.san.forEach(s => c.move(s, { sloppy: true }));
      for (let i = 0; i < 20 && !c.game_over(); i++) { const m = c.moves(); c.move(m[i %% m.length]); } return c.pgn(); })()""" % (CH, CH))
    STATE['moves'] = full
    pg.click('[data-lc111-mg]'); pg.wait_for_timeout(2000)
    out('Pro [whole game: more moves than the preview, no lock]', pg.evaluate("""(() => { const S = LC111._t.S, g = S.list[S.gi]; return [document.querySelectorAll('[data-lc111-p]').length > g.san.length, !document.querySelector('[data-lc111-pro]')]; })()"""))
    c.close()

    # Trial: Levels 4 and 5 held
    TRIAL = "localStorage.setItem('lc-hub-v2', JSON.stringify({ v: 2, onboarded: true, settings: { sound: false, board: false }, profile: {}, access: { tier: 'vault' } })); localStorage.setItem('lc97-state', JSON.stringify({ at: Date.now(), v: { ok: true, signed_in: true, sub_status: 'trialing', trial: { used: true, ends_at: new Date(Date.now() + 4 * 864e5).toISOString(), days_left: 4 } } }))"
    c, pg = fresh(br, 'trial', TRIAL)
    pg.evaluate("App.access.tier = 'vault'")
    out('trial [LC97.trialing, level 3 open, level 4 held (line and lead item), level 2 line open, a middlegame lesson not held]', pg.evaluate("""(() => { const l = Trees.lines().filter(x => x.tree === '%s')[0], at = k => Object.assign({}, l, { lvl: k, id: l.id + '-t' + k });
      const t = LC97.trialing(); return [t && t.status, Levels.open(at(3)), Levels.open(at(4)), Levels.open({ id: '%s--L4', topicId: '%s', lvl: 4 }), Levels.open(l), LC111.trialHold(5, { id: 'mg-x', topicId: 'mg-lesson' })]; })()""" % (CH, CH, CH)))
    chapter(pg, 4)
    out('trial gate [kick, says Levels 1 to 3, no credits button]', pg.evaluate("""(() => { const p = document.querySelector('#op-panel'); return [!!p.querySelector('.lv39-gate'), /Your trial opens Levels 1 to 3/.test(p.innerText), !p.querySelector('[data-lv-act=credits]')]; })()"""))
    pg.screenshot(path=SHOTS + '/lc111-trial-gate.png', full_page=True)
    out('embedded [lc111 equals lc111.js, lc97 / lc100 too, init + afterRender wired, build]', pg.evaluate("""(async () => { const html = await (await fetch('app.html')).text(); const same = async n => { const src = (await (await fetch(n + '.js')).text()).trim(), a = html.indexOf('/*@@module ' + n + '*/'), b = html.indexOf('/*@@end ' + n + '*/') + ('/*@@end ' + n + '*/').length; return html.slice(a, b) === src };
      return [await same('lc111'), await same('lc97'), await same('lc100'), html.indexOf('LC111.init()') > 0 && html.indexOf('LC111.afterRender(route)') > 0, LC111.version, CONFIG.version]; })()"""))
    c.close(); br.close()
print('ERRORS', len([e for e in errs if 'Failed to load resource' not in e]))
for e in errs:
    if 'Failed to load resource' not in e: print(e)
