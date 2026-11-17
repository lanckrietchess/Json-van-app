# course957 (9.57.0): the courses explained by the board, for humans.
# - The MSPC trainer asks each case's own question with its own answers (before 9.57.0 a written question was turned into an
#   unrelated "tap squares and pick a tag" task), and after every step adds what the board itself shows (LC93).
# - In a case's line, a move the line does not list is judged by Stockfish (LC25.alt) and a wrong move is explained by what it allows.
# - Every Lichess-based endgame and middlegame drill got its texts rewritten from the board and Stockfish by tools/course_truth.mjs,
#   with the app's own Coach Brain (LC83). The suite checks the result and re-runs the tool's own claim checker.
import json, subprocess, re
APP = 'http://127.0.0.1:8765/app.html'
OWNER = "localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))"
ROOT = os.path.dirname(TESTS)
# ---- content, read straight from the file ----
C = json.load(open(os.path.join(ROOT, 'content.json'), encoding='utf-8'))
L = C['lists']
drills = [x for x in L['endgame'] + L['middlegame'] if x['id'].startswith('lc-') or x['id'].startswith('mg-lc-')]
item = {x['id']: x for x in L['endgame'] + L['middlegame']}
blob = json.dumps(L, ensure_ascii=False)
out('course957 content [lichess drills, the old stock sentence is gone, the RED FLAG template is gone, every drill has M S P C]', [len(drills), 'One forcing sequence wins material' not in blob, 'RED FLAG' not in blob, all(set(d['ms_pc_breakdown']) >= {'M', 'S', 'P', 'C'} for d in drills)])
out('course957 skewer drill lc-1JQm4 [title, explanation, alarm, M]', [item['lc-1JQm4']['title'], 'skewers their king on d6' in item['lc-1JQm4']['explanation'], item['lc-1JQm4']['alarm_signal'].startswith('Alarm Signal · Skewer'), item['lc-1JQm4']['ms_pc_breakdown']['M']])
out('course957 underpromotion lc-Yb5Fq [title, says why not a queen]', [item['lc-Yb5Fq']['title'], 'f1=Q would not even give check' in item['lc-Yb5Fq']['explanation']])
out('course957 quiet move mg-lc-t9OZp [title, names the mate threat, CCA list]', [item['mg-lc-t9OZp']['title'], 'threatens Qxh7#' in item['mg-lc-t9OZp']['explanation'], item['mg-lc-t9OZp']['ms_pc_breakdown']['P'].startswith('Your checks: Qg7+')])
out('course957 breakthrough lc-m4Rgk [title]', item['lc-m4Rgk']['title'])
out('course957 titles [distinct titles of 212, no title used more than 10 times]', [len(set(d['title'] for d in drills)) > 60, max(sum(1 for d in drills if d['title'] == t) for t in set(d['title'] for d in drills)) <= 10])
r = subprocess.run(['node', os.path.join(ROOT, 'tools/course_truth.mjs'), os.path.join(ROOT, 'content.json'), os.path.join(ROOT, 'tools/course_engine.json')], capture_output=True, text=True, timeout=300)
first = (r.stdout or r.stderr).splitlines()[0] if (r.stdout or r.stderr) else ''
out('course957 the tool re-checks every claim [rewritten, no generated text failed]', [first.split(' audit')[0], 'generated text failed' not in r.stdout])
with sync_playwright() as p:
    br = p.chromium.launch()
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'course957')
    pg.goto('http://127.0.0.1:8765/version.json'); pg.evaluate(OWNER)
    pg.goto(APP + '#think'); pg.wait_for_timeout(5000); pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())"); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('#think-chapters [data-chap]').click()"); pg.wait_for_timeout(900)
    out('course957 trainer M [the case asks its own question, 3 written answers, no tap-and-tag task]', pg.evaluate("[(document.querySelector('.st-prompt')||{}).innerText.slice(1, 40), document.querySelectorAll('[data-opt]').length, !document.querySelector('.m5, [data-m5-tag]')]"))
    pg.evaluate("[...document.querySelectorAll('[data-opt]')].find(b => /^Nothing/.test(b.innerText)).click()"); pg.wait_for_timeout(300)
    out('course957 trainer wrong answer [not quite, the case explains why]', pg.evaluate("(() => { const t = document.querySelector('[data-part=feedback]').innerText; return [/Not quite/.test(t), /recapture can wait/.test(t)]; })()"))
    pg.evaluate("[...document.querySelectorAll('[data-opt]')].find(b => /f7-pawn/.test(b.innerText)).click()"); pg.wait_for_timeout(700)
    out('course957 trainer M from the board [what their bishop did, their threat now]', pg.evaluate("(() => { const t = (document.querySelector('[data-lc93=M]')||{}).innerText || ''; return [/Their bishop went from g4 to d1/.test(t), /Their threat now: dxe5/.test(t)]; })()"))
    pg.evaluate("document.querySelector('[data-act=advance]').click()"); pg.wait_for_timeout(400)
    pg.evaluate("(() => { const e = document.querySelector('[data-square=f7]'); const r = e.getBoundingClientRect(); for (const t of ['pointerdown', 'pointerup']) e.dispatchEvent(new PointerEvent(t, {bubbles: true, clientX: r.x + 5, clientY: r.y + 5})); e.click(); })()"); pg.wait_for_timeout(700)
    out('course957 trainer S from the board [material, loose pieces on both sides]', pg.evaluate("(() => { const t = (document.querySelector('[data-lc93=S]')||{}).innerText || ''; return [/pawns' worth down/.test(t), /Loose on their side: bishop on d1/.test(t), /Loose on your side: knight on e5/.test(t)]; })()"))
    pg.evaluate("document.querySelector('[data-act=advance]').click()"); pg.wait_for_timeout(400)
    pg.evaluate("[...document.querySelectorAll('[data-opt]')].find(b => /^Bxf7\\+/.test(b.innerText)).click()"); pg.wait_for_timeout(700)
    out('course957 trainer P from the board [your checks, the case move is a check]', pg.evaluate("(() => { const t = (document.querySelector('[data-lc93=P]')||{}).innerText || ''; return [/Your checks: Bb5\\+ and Bxf7\\+/.test(t), /Bxf7\\+, is a check/.test(t)]; })()"))
    pg.evaluate("document.querySelector('[data-act=advance]').click()"); pg.wait_for_timeout(1500)
    # a wrong move in the line: Stockfish answers it, LC83 says what it allows
    def tap(a, b):
        for q in (a, b):
            r = pg.evaluate("(() => { const e = document.querySelector('#think-board [data-square=%s]'); e.scrollIntoView({block: 'center'}); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()" % q)
            pg.mouse.click(r[0], r[1]); pg.wait_for_timeout(120)
    def fb(): return pg.evaluate("(document.querySelector('[data-part=feedback]')||{}).innerText || ''")
    # a move the line does not list: Stockfish judges it (Bb5+ is a real engine verdict: it throws away the mate)
    tap('c4', 'b5')
    for _ in range(40):
        pg.wait_for_timeout(250)
        if re.search('does not work|Also good|not the line', fb(), re.I): break
    out('course957 trainer C wrong move [judged by the engine, not accepted]', [bool(re.search('does not work here', fb())), 'Also good' not in fb()])
    # an alternative Stockfish agrees with is accepted and the case goes on (verdict stubbed to "full")
    pg.evaluate("window.__realAlt = LC25.alt.check; LC25.alt.check = async () => ({tier: 'full', label: 'Also good', text: 'Stockfish agrees: this works as well.'}); undefined")
    tap('c4', 'b5'); pg.wait_for_timeout(700); alt = fb()
    pg.evaluate("LC25.alt.check = window.__realAlt; undefined"); pg.wait_for_timeout(2600)
    out('course957 trainer C alternative [accepted, the case continues with its own move]', [bool(re.search('Also good', alt)), 'The case continues with Bxf7+' in alt])
    tap('c3', 'd5'); seen = False
    for _ in range(20):
        pg.wait_for_timeout(150)
        if pg.evaluate("((document.querySelector('[data-lc93=C]')||{}).innerText || '').indexOf('The line ends in mate') >= 0"): seen = True; break
    out('course957 trainer C from the board [the line ends in mate]', seen)
    # the drill insight the player sees after a drill
    ins = pg.evaluate("""(async () => { const c = await (await fetch('/content.json')).json(); const it = c.lists.endgame.find(x => x.id === 'lc-1JQm4'); const h = document.createElement('div'); h.innerHTML = insightHTML(it); return h.innerText; })()""")
    out('course957 drill insight [explanation, the four letters, alarm, action step]', ['skewers their king on d6' in ins, 'Their king on d6 and bishop on b8 stand on one diagonal' in ins, 'Alarm Signal' in ins, 'Action Step' in ins])
    out('course957 nothing scrolls sideways at 390', pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"))
    c.close(); br.close()
bad = [e for e in errs if ('PAGEERROR' in e or 'console' in e) and 'Failed to load' not in e and 'navigator.vibrate' not in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
