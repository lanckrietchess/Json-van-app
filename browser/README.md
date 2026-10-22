# Real-browser tests

These run the **actual shipped `index.html`** in a real browser (Firefox, headless) with a real Stockfish 19, and use real taps, real timers and
a real service worker. They exist because the simulated-browser tests (jsdom) cannot see layout, overlays, taps, fonts, offline behaviour or
what a native control looks like. Every bug listed in `V25_NOTES.md` under "Found by the real browser" was invisible to jsdom.

## Set up (once)

    # Python 3.10+, Node 18+, and a Firefox with geckodriver (for example from conda-forge)
    pip install selenium langdetect
    npm install                                   # libraries, icons, fonts and Stockfish 19 for the offline test site
    export FIREFOX=/path/to/firefox GECKODRIVER=/path/to/geckodriver
    export CONTENT=/path/to/content.json          # your course JSON (the file published as "json")

## Run

    sh serve.sh                                   # builds /tmp/site from this package's index.html and serves it on http://127.0.0.1:8765
    python3 mkstate.py                            # once: completes the onboarding for real and saves a "returning member" browser state
    python3 test_real_1.py                        # first run, onboarding, redemption (real Stockfish), popups                   4 tests
    python3 test_real_2.py                        # long-text fold, Auto-Advance, flashcard, Penalty Box, wait puzzle             5 tests
    python3 test_real_3.py                        # alternative answers, tilt check, Settings, trophy room, drill note, 24-route audit   6 tests
    python3 test_real_4.py                        # a Dutch (Belgium) phone: everything stays English                              5 tests
    python3 test_real_5.py                        # a 360 px wide phone: nothing spills sideways                                   3 tests
    python3 test_real_6.py                        # real service worker: stop the server, the app + Stockfish + notes still work    1 test
    ONLY="drill" python3 test_real_3.py           # run the tests whose title contains a word

Screenshots go to `shots/`. Set `APP_DIR` to test another build.

## What is stubbed, and what is not

Real: the app code, Firefox, Stockfish 19 (WebAssembly in a worker), taps and drags on the board, timers, the service worker and its caches, the
fonts and icons. Stubbed by a small shim in the served page (`build_site.py`): the network. Fetches for your course JSON, the notes and the
puzzle alternatives are served from local files; Lichess returns a fixture game (Morphy v. Duke of Brunswick) so the redemption has a game to
analyse; every other outside request is refused. The test site serves the CDN libraries from `/vendor`, and the test copy of `sw.js` treats
`/vendor` the way production treats cdnjs.

## Limits

- Firefox only. Chrome (what the Play Store app uses) and Safari are not covered.
- Headless Firefox cannot be narrower than 500 px, so the 360 px test loads the app in a 360 px `<iframe>`; the app and its media queries see 360 px.
- Firefox without a Dutch language pack formats dates in en-US, so the Dutch-phone test cannot reproduce a Dutch phone's date formatting. That part
  is guarded by code and by `tests/language.test.js` (no locale-less `toLocale...` call), and was checked under a Dutch system locale in Node.
- The operating system's own file dialog cannot be driven or restyled.
