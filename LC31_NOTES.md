# LC31 / hub 9.9.0: Creator Studio overhaul

Built from the 9.8.0 `index.html` with `apply_patches_v31.py` (17 exact-match hooks, each must match once). The new code is `lc31-studio.js`, inserted inside the Studio closure (it needs Cam, Mic, LAYOUT, Board, Libs). Deploy: replace `index.html`, `sw.js`, `manifest.webmanifest` (version 9.9.0 everywhere). No database or Edge Function change.

## What changed
| Area | Change |
|---|---|
| Camera + mic | "Connect camera & mic" button on the stage, one click. Camera slot shows a Connect call-to-action until live. Errors show as a banner (with Try again) and a toast, not only a hint inside a closed panel. Blocked-permission and embedded-page (iframe) hints. |
| Mic meter | Live VU meter (green/amber/red, peak hold, dB) on the stage and next to the mic selector. The old `#mic-meter` bar, which nothing updated, now moves. "No sound yet" hint after 3.5 s of silence. |
| Camera shape | Circle, Rounded, Square, Wide 16:9, Portrait 3:4, Full frame (camera behind the board) plus a ratio select. Resize keeps the ratio. Saved layouts and old layouts both load. |
| Layout | New preset "Script on top". Drag, resize and snap were already there; tested with real mouse input. Fixed: my own overlay had to be hidden while arranging. |
| PGN | "Import PGN" modal, drop a .pgn file or text anywhere, Ctrl+V anywhere (PGN or FEN), several games give a chooser. Game strip with Save to Student Games, Find critical moments (real Stockfish), Carousel from game. |
| Formats | Picker with 8 formats (Short, AI Short, Long, AI Long, Carousel, Puzzle Breakdown, Live Review, Opening Trap). Forced on a fresh project, Format button afterwards. Sets frame, layout (script on top), camera and a script outline. AI formats open the existing render queue seeded with your narration (headings stripped) and the game. |
| Carousel | Builder: cover, position, text, CTA slides; 4:5, 1:1, 9:16; auto-build from a game; PNG export or Share. The Free-tier watermark is drawn on every slide and course positions stay hidden (Guard). |
| Chess.com | Student Game Library: sync bar, students (name + username or profile link), result filter, 30-minute auto-sync while the Studio is open (your linked account becomes "Me"), de-duplication, accuracy and result stored. Items offer Load, Find critical moments, Make carousel. |

## Tested in real headless Chrome (fake camera/mic devices, real Stockfish 19): 76 checks
`t6` formats, shapes, sanitize (19) · `t7` hardware (14) · `t8` PGN, analysis, carousel, export (16) · `t9` Chess.com, library, auto-sync, render seed (16) · `t10` mouse drag/resize, persistence, phone width (11). `t11` boots the whole built page: no page errors.
Run: copy `lc31-tests/` next to `package.json` (`@sparticuz/chromium puppeteer-core chess.js jquery @chrisoakman/chessboardjs stockfish@19.0.0`), paths at the top of `rig.mjs` and `mountStudio.mjs`.

## NOT tested (be honest)
- The real `#studio` route: no `content.json` in the session, the app stopped at "course data did not load". The Studio was mounted directly from the built page with the same options `mountV2` passes.
- A real webcam/microphone, a real Android phone, the Play Store TWA. Chrome's fake devices only.
- The live Chess.com API (blocked in the sandbox): sync was run against a stub that follows the documented archive/game fields.
- AI voice/avatar output: AI formats only seed the existing render queue (25/100 tokens). Nothing generates avatars in the browser.
- Not wired: an automatic sync trigger right after a Trim finishes (call `LanckrietStudio.lc31.syncAll({force:true})` from there), and importing the Tier 3 Game Vault games into the Student Game Library.
