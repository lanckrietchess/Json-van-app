# Lanckrietchess Training Hub

Chess training web app by Kyenzo (lanckrietchess, certified chess coach), live at https://lanckrietchess-app.vercel.app, also installable as a PWA and in the Play Store (TWA). Read HANDOFF.md for what V5 changed and what is still open.

## Architecture rules (never break these)

- The whole app is one self-contained, unminified `index.html`: vanilla JavaScript, Tailwind from its CDN, chess.js and chessboard.js from cdnjs. No build step, no framework, no bundler, no npm dependencies for the site.
- Dark slate design (#0f172a background, #1e293b cards, #38bdf8 accents), top-bar navigation, mobile first (check 390px wide).
- No hardcoded course content. Everything players study comes from `content.json` in the GitHub repo `lanckrietchess/Json-van-app`, the single source of truth. Never add, change or remove course content (repertoires, chapters, lines, positions, lessons) in code or in `content.json`: the courses must stay 100% faithful to Kyenzo's ChessTempo exports.
- Admin settings live in the `v5` section of `content.json`, written by the hub's own admin mode (Publish). Don't hardcode them.
- Stockfish runs in the player's browser (`engine/`, a Web Worker). No server-side engine.
- Free players never cause AI calls. AI answers are for paid members only, through the Arena server.
- No secrets in the repo. ADMIN_TOKEN, ANTHROPIC_API_KEY and PID_SALT live in Cloudflare (`wrangler secret put`); `server/admin-token.txt` is git-ignored.
- UI copy is English, short and plain, in Kyenzo's coaching voice. Keep the existing tone. The founder text shows a 2105 peak rating.

## Layout

- `index.html`: the hub. Find code by name (`const Tourney =`, `function MSPCStep`, `const V5Doc =`), not by line number.
- `engine/`: Stockfish 19 lite (WASM) and its GPL licence.
- `server/`: the Arena server (Cloudflare Worker + D1): tournament, friends, peer puzzles, member keys and the AI coach. `server/README.md` explains it.
- `tests/`: regression suites; `tests/README.md` explains them.
- Files that were in the repo before V5 (service worker, manifest, icons, `.well-known`, `vercel.json`) stay; V5 doesn't replace them.

## Before every commit

- `python tests/run.py` must end with ALL SUITES PASSED (`node server/test/unit.mjs` alone for server-only changes).
- A new feature gets new expectations in `tests/run.py` or new checks in `server/test/unit.mjs`.

## Working agreements

- Work on a branch and open a pull request; never push to main directly. Vercel builds a preview for every pull request: test there.
- Ask Kyenzo before anything that needs his accounts (Cloudflare, Anthropic, GitHub settings, Play Console) or that deletes files.
