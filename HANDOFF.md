# V5 handoff

What changed in "Lanckriet Chess App V5", where it lives, and what is still open. Everything below is covered by `tests/`.

## The 12 V5 directives

1. **Stockfish in the browser:** Stockfish 19 lite (NNUE, WASM) in a Web Worker from `engine/`, depth 20, MultiPV 1; falls back to a CDN build. (`CONFIG.engine`, `Engine`)
2. **Friends list:** friend codes (`LCF1.` + base64 JSON, validated and escaped), share links (`?friend=`), Chess.com and Lichess follows; cards show rating, weekly progress, Hyper-Focus, tournament score and the latest blunder ("Punish their blunder"). Stored under `lanckriet_friends_list`. (`Friends`, `Arena`)
3. **Stockfish in Learn mode:** eval bar, first choice, verdict on the player's move and the fixed disclaimer. (`LearnEngine`)
4. **Theory navigation:** a 2x2 grid.
5. **Weekly tournament:** admin-chosen metric (MSPC steps, clean Trim reviews, all correct answers), prizes for 1st to 3rd, minimum players, live board, payout at the Monday reset. With the Arena server: one hub-wide board, settled on the server, each prize claimable once. (`Tourney`)
6. **Free versus paid:** free players get button answers only, never AI; paid members get the AI coach through the Arena server. (`CoachActions`, `CoachBot`, `AI`)
7. **Homepage layout jitter:** fixed.
8. **Resizable panels:** trainers and Trim, per session, with an admin default. (`Layout5`)
9. **No multiple choice:** every question is an interactive MSPC step on the board, judged against the course's own answer text and the position; the Blunder Clinic uses the same steps; a Miscalculation tag on calculation steps. (`MSPCStep`, `MSPC5UI`)
10. **Admin CMS:** MSPC framework and coach buttons (step names, tag buttons, mistake tags, fixed coach answers per tier, panel sizes), plus Weekly tournament and sales bridge (metric, prizes, ManyChat link, Arena server). (`V5Admin`)
11. **Peer-Puzzle staging:** every Trim review stages blunders in a FIFO buffer (`staging_peer_puzzles`); repertoire openings go to the admin queue, others to the free peer pool. (`V5Peer`, `V5Pool`)
12. **Trim pipeline:** Phase A macro reality check, Phase B MSPC interrogation (board taps), Phase C Stockfish facts, Phase D conclusion with working points, patterns across sessions, the ManyChat sales bridge for a recurring leak, and an AI conclusion for paid members. (`V5Trim`)

## Data

- Content: `content.json` in `lanckrietchess/Json-van-app`. The hub reads both its own admin-published format and the hand-made data-engine format (`meta`, `app_settings`, `ai_coaches`, `course_index`, `repertoires`, `think_section`).
- Admin settings: the `v5` section (`V5Doc` whitelists it: framework, faq, layout, tournament, sales, server). Admin mode writes it on Publish; for a hand-made file, admin mode has **Copy the v5 section and member keys**.
- Member keys: SHA-256 fingerprints (`sha256('lc-key|' + KEY.toUpperCase())`) in `keys` of `content.json`, or `MEMBER_KEYS` on the server. The live `content.json` has none yet: Kyenzo creates them in admin mode (Member keys) and publishes.

## The Arena server (`server/`)

One Cloudflare Worker with one D1 database. Actions: `t5_sync`, `t5_result` (tournament), `f5_sync` (friends), `p5_stage`, `p5_pool` (peer puzzles), `verify`, `activate`, `check`, `reset` (member keys, one device per key), `chat` (AI coach: paid members, Claude Haiku 4.5 by default, daily caps per member and for the hub), `a5_*` (admin console with ADMIN_TOKEN). The hub finds it through `v5.server.url`; an empty `CONFIG.ai.endpoint`, `verifyEndpoint` or `activationEndpoint` falls back to it (`arenaUrl()`). Setup: `node server/setup.mjs` on Kyenzo's computer.

## Open items

1. **Done (v5 branch): the classic community protocol is on the Arena server** (`COMMUNITY` in `server/arena-worker.js`, tables in `schema.sql`, checks in `server/test/unit.mjs` and `tests/suites/community.py`). What was asked: The older `hub-worker.js` (not in this repo) answered these actions; today the hub keeps them on the device because `CONFIG.community.endpoint` and `CONFIG.ai.endpoint` are empty. Implement them in `server/arena-worker.js` with D1 tables, then let `Ranks` (and the raw `ev_sync` call in `Telemetry`) fall back to `arenaUrl()`. Take request and response shapes from the call sites in `index.html` (search for each action name; the code that reads the answer shows the fields):
   - Leaderboard: `lb_sync` {device, name, bracket, attempts}, `lb_top` {period, device}, `lb_forget` {device}, `lb_volume` {period, cat, sort, device}, `lb_admin` {secret, op, target}.
   - Anonymous training stats: `ev_sync` {app, version, anon, b, events}, `ev_forget` {anon}, `insights` {secret, days}.
   - Trim and Game Vault: `tr_sync` {device, name, bracket, games, solved}, `tr_top` {period, sort, ...}, `vb_sync` {anon, items}, `vb_list` {secret, kind, days}.
   - Verified ratings: `elo_verify` {device, site, user, code, name}: the server fetches the public Chess.com or Lichess profile and checks the code the player put in it (the hub tells them to use the Location field), `elo_forget` {device, site}, `elo_top` {site, mode, device}.
   - Puzzle ratings: `pz_sync` {device, name, bracket, rating, peak, start, games, wins, ...}, `pz_top` {device, limit}.
   - `secret` is the admin credential in these actions: accept ADMIN_TOKEN. The leaderboard weights and minimum puzzles come from `content.json` (the hub's "Numbers and links" settings).
   - Done means: unit checks per action in `server/test/unit.mjs`, a new `community` browser suite (two devices on the Leaderboard page, a verified Chess.com account with a mocked profile, admin insights), and every existing suite still passing.
2. **Done (v5 branch): repository integration** (`sw.js` cache `lc-hub-5.0.0`, `engine/*.wasm` as `application/wasm` in `vercel.json`; no CSP is set, so nothing to allow). What was asked: bump the service worker's cache version so installed apps (PWA and Play Store) load V5; make sure `engine/` (a 1.8 MB WASM file) is cached sensibly; if `vercel.json` sets a Content-Security-Policy, allow the Arena server (`*.workers.dev`), `api.chess.com`, `lichess.org`, `blob:` workers and WASM (`'wasm-unsafe-eval'`); keep `.vercelignore`.
3. **Known limits:** tournament scores are reported by the app, so the server caps them (one point per two seconds, 5,000 a week) and the admin can ban; friend codes are only as fresh as the last sync; the free tier gets no AI by design.
