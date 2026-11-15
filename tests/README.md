# Tests (simulated browser and logic)

Everything here runs in Node with jsdom: fast, no browser needed. The tests that need a real browser are in `../browser/`.

    npm install                      # jsdom, chess.js and the engine used by two checks
    export CONTENT=/path/to/content.json   # your course JSON (used by the boot scripts)
    node logic.test.js               # pure logic: alternative verdicts, flashcards, ghost, challenge links, recap, redemption pick, tilt rule/parsers (29)
    node dom.test.js                 # the LC25 module against a DOM: Auto-Advance, flashcards, alt-check, Penalty Box + built-in puzzle pool, ghost, rival link,
                                     # MSPC notes, long-text fold, tilt poll, celebration queue, wait puzzle, tech theme, ALL-ENGLISH module (76)
    node flow.test.js                # onboarding to redemption end to end, XP, quest, popups, error paths (13)
    node sw.test.js                  # sw.js activate keeps the shell, libraries, coach clips and notes (1)
    node language.test.js            # static guard: no locale-less date calls, no-translate flags, no Dutch strings in code/content/notes (6)
    node shorten_keys.test.js        # the short-texts tool and the app compute the same key for all 682 real texts (2)
    node audit_logic.test.js         # the puzzle-audit tool and the app judge a move identically on 20,000 random inputs (2)
    node theme_contrast.test.js      # the tech theme never makes text harder to read; muted text reaches WCAG AA (2)
    node lc79_unit.test.js           # Creator Studio LC79: motifs, trimmed PGN, live-caption alignment, and the Studio 2.0 NLE core: silence detection,
                                     # ripple cut, split, trim, delete, no gaps, caption box (38)

    # the REAL index.html booted in jsdom with your real content (each prints a JSON list of steps and errors)
    node boot_flow.js ../index.html    node boot_routes.js ../index.html    node boot_runners.js ../index.html    node boot_admin.js ../index.html
    node boot_notes.js ../index.html   node boot_tilt.js ../index.html      node boot_final.js ../index.html

Studio 2.0 Edit Studio in real Chromium (from the repo root, after `npm i chess.js@0.10.3 jquery@3.7.1 @chrisoakman/chessboardjs@1.0.0 html2canvas@1.4.1`):
`NM=./node_modules python3 tests/chromium_942/nle.py` (add `CHROME=/path/to/chrome` to use an installed Chrome): silence cut after a take,
Cut silences, S split, trim handles, Delete, Ctrl+Z, two-deck playback without stalls, caption box drag / resize / style, 390 px layout (25).
Release Giveaway (LC82, 9.42.0) in real Chromium with a stubbed Supabase: `NM=./node_modules python3 tests/chromium_942/giveaway.py` (port 8767):
link a chess account (elo-verify), join with the public-board opt-in, the board, the banner, the owner overview with the winners' SQL,
the landing counters and board, 390 and 1280 px (44). SQL on PostgreSQL 16: `tests/sql/lc82_stub.sql`, then `sql/20261107100000_lc59_milestones_proof.sql`,
`sql/20261115100000_lc82_release_giveaway.sql` (twice), then `tests/sql/lc82.test.sql` (29). Script modes: `node tests/lc79_prompt.test.js` (23, Full Script unchanged, Bullet Points).

jsdom cannot see layout, overlays, taps, fonts, offline behaviour or native controls. Those are covered by `../browser/` (24 real-Firefox tests).
The notes generator and puzzle audit tests are in `../tools/mspc` (`npm test`, plus `verify-notes.mjs`).
Marathon onboarding, calm guide, keyboard shell and in-app browser bar (9.43.0) in real Chromium: `NM=./node_modules python3 tests/chromium_943/marathon.py`
(port 8768, scripted engine, 390 and 1280 px, Instagram user agent) (30). The honest MSPC engine (LC83): `node tests/lc83_truth.test.js` (22: quiet moves stay quiet,
only pieces that can really be won are "attacked", lost defence, king shield, opened lines, passed pawns, the M / S / P / C breakdown of a mistake).
The rest of the road, one calm message, Trim on a phone and the install buttons (9.44.0) in real Chromium: `NM=./node_modules python3 tests/chromium_944/road.py`
(port 8769, 390 px): LC42 hands Level 4 to LC84 (patterns of the last games, the training that fits, one exercise = Level 5), the tour of every blue
section (pulse, the ? heard to the end, one exercise on trainers, the "could not hear it" way out), the Lanckriet Student Quests (rival, community post,
invite link), the LC83 pop-up policy (20 s gap, tapped pop-ups pass, nothing on the Trim analysis), the Trim phone order without sticky board and
without the jump after a review, Level 2's Google step, the landing page's Instagram install (Android: Chrome intent, iPhone: the steps) and the
?install=1 sheet within 2 s.
