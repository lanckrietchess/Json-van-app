#!/usr/bin/env python3
"""Runs the hub's test suites and checks their key results.

  python tests/run.py            all suites
  python tests/run.py mspc ai    only these

Suites: unit (server, Node), mspc, arena, formats (browser), server, ai, members
(browser + a local Arena server on ports 8787/8799, Node 22.5+). Each browser
suite prints labelled results; the expectations below are what a correct build
prints. Exit code 1 when anything fails. Screenshots land in tests/shots/."""
import os, re, sys, subprocess, shutil
TESTS = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(TESTS)
EXPECT = {
  'mspc': [r"\[multiple-choice buttons, interactive steps\]: \[0, 1\]", r"M, after tapping \w\d: Correct", r"S \(tap stage from the file\): Correct", r"P, check: Correct",
           r"after dragging 170px left \[columns, session, board px\]: \['\d+px \d+px', '\{\"trainer\":0\.\d+\}', \d+\]", r"phone \[handle hidden, inline columns, overflow-x\]: \[True, '', 0\]",
           r"clinic S, wrong phase: Not that phase", r"clinic C, Ndf6: Correct", r"clinic miscalc \[feedback, struggles, log\]: \['Tagged: .*\['calc'\], 1\]",
           r"iq answer box after two taps: d6, e4", r"iq reply: Yes, that is the threat", r"fixed coach answer: Tap Upgrades", r"defaults back \[M name, M tags\]: \['Move', 8\]"],
  'arena': [r"score after 3 MSPC solves, 1 opening, 1 miss \[state, live board\]: \[3, '1 Kyenzo Test \(you\) 3 solved'\]", r"bad codes \[html-name, garbage\]: \['\{\"pid\":\"\",\"name\":\"img src=x onerror=alert\(1\)\",\"rating\":null",
            r"friends: \[\['Hikaru', 'chesscom', 2810", r"board: 1 Anna 5 solved / 2 Kyenzo Test \(you\) 3 solved / 3 Bram 1 solved", r"friend blunder M: Correct", r"friend blunder C \(Ndf6\): Correct",
            r"weekly payout .*\"rank\":1,\"players\":3,\"prize\":3\}', 3, None, True, 0\]", r"opened link on a new device \[friends, search left, hash\]: \[\['Kyenzo Test ?'\], '', '#leaderboard', 0\]",
            r"staged \[route, played, best, opening, has game\]: \[\['admin', 'Ngf6', 'Ndf6', 'Caro-Kann', True\]\]", r"Phase A, first message: Macro reality check: 1 blunder", r"Phase D, conclusion: Working points",
            r"ManyChat link: https://ig\.me/m/lanckrietchess\?ref=MSPC_[A-Za-z]+", r"webhook fired, sessions stored: \[\[.*'https://hook\.example\.com/x'\], 3\]",
            r"sent to the queue \[queue size, staged left\]: \[1, \['sptest2'\]\]", r"admin saved \[tournament, sales, unpublished\]: \['\{\"on\":true,\"metric\":\"trim\""],
  'formats': [r"admin-published hub file \+ v5 .*'https://lanckriet-arena\.example\.workers\.dev', 'Move!', 1, 'MSPC', 7, .*'Trim Week'\]", r"your real content\.json \+ v5 .*'https://lanckriet-arena\.example\.workers\.dev', 'Move!', 1, 'MSPC', 7, .*'Trim Week'\]",
              r"your real content\.json as it is .*\['null', '-', 'Move', 0, '-', 7, .*'Weekly MSPC Sprint'\]", r"copy the v5 section \[valid JSON when pasted, starts with\]: \[True"],
  'server': [r"A synced \[pid, server rows\]: \['[a-z0-9]{14}'", r"B board \(server\): 1 Anna \(friend\) 4 solved / 2 Bram \(you\) 2 solved", r"B after Anna trained \[board, fresh card score\]: \['1 Anna \(friend\) 6 solved / 2 Bram \(you\) 2 solved', \[\['Anna', 6\]\]\]",
             r"B stages a free puzzle: 1", r"A solved Bram’s blunder: Correct Ndf6", r"admin: server queue: REPERTOIRE 5\.\.\.Ngf6 better: Ndf6 Caro-Kann, Anna", r"admin: sent \[review queue size, server queue now\]: \[1,",
             r"A board after Bram is banned: \[\[\"Anna\",8\]\]", r"admin: test connection: Connected\. The admin token works\.", r"admin: wrong token: Connected, but the admin token is not accepted\.",
             r"admin: saved \[published server address, token stays local\]: \['\{\"url\":\"http://127\.0\.0\.1:8787\"\}', True, True\]"],
  'ai': [r"A unlocks with the member key \[ok, tier, message, remote, key kept\]: \[True, 'vault'", r"A: the Pro coach answered: Coach \(test\)",
         r"Claude request \[.*\]: \['sk-e2e', '2023-06-01', 'claude-haiku-4-5-20251001', 'What does 5\.Qe2 threaten here\?', 'Server rules', True, True, True\]",
         r"B tries the same key \[ok, message\]: \[False, 'This key is already active on another device", r"B asks the AI anyway: refused", r"free player \[sales assistant uses AI, coach AI\]: \[False, 'refused",
         r"admin: Members and AI: .*AI coach on, model claude-haiku-4-5-20251001", r"after the reset, B unlocks: \[True, 'vault'\]", r"after the reset \[B asks, then A asks\]: \['answered: .*', 'refused: bound'\]",
         r"admin prompt test \(preview\): answered", r"preview used the new prompt: True", r"B: AI session conclusion: Coach \(test\)", r"the conclusion request carried the session: \[True, True\]"],
  'members': [r"before the server: unlocked on the device \[ok, tier, remote\]: \[True, 'vault', False\]", r"server goes live, weekly check \[result, tier kept\]: \[None, 'vault'\]", r"AI coach on this device: answered",
              r"re-enter the key \[ok, tier\]: \[True, 'vault'\]", r"weekly check after connecting: \[None, 'vault'\]", r"a second device with the same key \[ok, message\]: \[False, 'This key is already active on another device"],
}
ORDER = ['unit', 'mspc', 'arena', 'formats', 'server', 'ai', 'members']
NEEDS_NODE = {'unit', 'server', 'ai', 'members'}
def node_ok():
    try: v = subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip().lstrip('v').split('.'); return (int(v[0]), int(v[1])) >= (22, 5)
    except Exception: return False
def run(name):
    if name in NEEDS_NODE and not node_ok(): return None, 'skipped: needs Node.js 22.5 or newer'
    if name == 'unit':
        p = subprocess.run(['node', 'test/unit.mjs'], cwd=REPO + '/server', capture_output=True, text=True, timeout=300)
        fails = [l for l in p.stdout.splitlines() if l.startswith('FAIL')]
        return ('ALL PASSED' in p.stdout and not fails), '\n'.join(fails) or p.stdout.strip().splitlines()[-1]
    os.makedirs(TESTS + '/.run', exist_ok=True)
    f = TESTS + '/.run/' + name + '.py'
    open(f, 'w', encoding='utf-8').write(open(TESTS + '/harness.py', encoding='utf-8').read() + '\n' + open(TESTS + '/suites/' + name + '.py', encoding='utf-8').read())
    p = subprocess.run([sys.executable, f], capture_output=True, text=True, timeout=900, env=dict(os.environ, LC_TESTS=TESTS))
    out = p.stdout
    missing = [e for e in EXPECT[name] if not re.search(e, out)]
    bad = [l for l in out.splitlines() if l.startswith('FAIL')]
    errors = re.search(r"^ERRORS (\d+)", out, re.M)
    if not errors: bad.append('no ERRORS line: the suite did not finish')
    elif errors.group(1) != '0': bad.append('ERRORS ' + errors.group(1) + ' (console or page errors, see the lines after it)')
    ok = not missing and not bad
    detail = '' if ok else '\n'.join(['  missing: ' + m for m in missing] + ['  ' + b for b in bad])
    open(TESTS + '/.run/' + name + '.log', 'w', encoding='utf-8').write(out + '\n--- stderr ---\n' + p.stderr)
    return ok, detail or '%d expectations met' % len(EXPECT[name])
if __name__ == '__main__':
    todo = [a for a in sys.argv[1:] if a in ORDER] or ORDER
    failed = 0
    for n in todo:
        ok, detail = run(n)
        print(('SKIP ' if ok is None else 'PASS ' if ok else 'FAIL ') + n.ljust(8) + ' ' + detail.split('\n')[0] if ok is not False else 'FAIL ' + n.ljust(8) + '\n' + detail, flush=True)
        if ok is False: failed += 1
    print('\n' + ('ALL SUITES PASSED' if not failed else str(failed) + ' SUITE(S) FAILED: full output in tests/.run/<suite>.log'))
    sys.exit(1 if failed else 0)
