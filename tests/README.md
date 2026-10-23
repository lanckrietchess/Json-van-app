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

    # the REAL index.html booted in jsdom with your real content (each prints a JSON list of steps and errors)
    node boot_flow.js ../index.html    node boot_routes.js ../index.html    node boot_runners.js ../index.html    node boot_admin.js ../index.html
    node boot_notes.js ../index.html   node boot_tilt.js ../index.html      node boot_final.js ../index.html

jsdom cannot see layout, overlays, taps, fonts, offline behaviour or native controls. Those are covered by `../browser/` (24 real-Firefox tests).
The notes generator and puzzle audit tests are in `../tools/mspc` (`npm test`, plus `verify-notes.mjs`).
