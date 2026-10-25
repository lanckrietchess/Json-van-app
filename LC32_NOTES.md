# LC32 / hub 9.10.0: token balances, board-first trainers, B2B Carousel Builder

Built from the 9.9.0 page (LC31 included) with `apply_patches_v32.py` (8 exact-match hooks) and a patched Edge Function `arena.js` (`patch_arena_v32.py`, 2 hooks, 92 lines added, none removed).

## Deploy
1. **Arena function first.** Diff `arena.js` against the deployed copy, back it up, deploy it. It uses the secrets `coach_voice` already needs (`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`). Optional secret `VOICE_TOKEN_CHARS` (default 1000 characters per token). No SQL migration: it uses `token_spend`, `voice_cache`, `token_ledger` and `token_bonus`, which already exist.
2. Replace `index.html`, `sw.js`, `manifest.webmanifest` (9.10.0 everywhere).
3. Old page + new function is safe (the old page never calls `carousel_voice`). New page + old function works except voice-over, which then says it could not be made.

## What changed
| Request | Change |
|---|---|
| 1.1 Token display | The profile menu shows two cards side by side: **Free daily** (n / limit, countdown to 00:00 UTC, "Unlimited" for VIP/admin) and **Purchased** (never expire). It updates live while open. The spend order was already daily first, purchased second, on the server (`takeOne`) and on the device (`Credits.spend`). Verified, not changed. |
| 1.2 Trainers on a phone | The board is pinned right under the top bar and the question sits directly below it. Title, kicker and brief move beneath. After each M, S, P, C step the brief folds away and the next prompt scrolls up under the board. Applies to all 27 screens built on the shared trainer shell. Trim: once a game is loaded, the board and move buttons are pinned at the top. Desktop is unchanged. Very short landscape screens do not pin. |
| 2.1 Slide editor | Hook, content and CTA stages (hook always first, CTA always last). 6 branded templates with a per-slide override, formats 4:5 / 1:1 / 9:16. Ctrl+V (or button, file, drop) for screenshots; images are kept in IndexedDB so they survive a reload. FEN, PGN move-by-move (up to 12 slides) and a puzzle list. Arrows, circles, text, 24 stickers, 5 colours, undo. |
| 2.2 Libraries | Hook & Idea (18 items), Content & Assets (6 backgrounds + 6 image prompts), CTA (9, including the EUR 80+/hr vs 24/7 AI coach price anchor and `[REFERRAL_LINK]`). Partners add their own (kept on the device). The admin adds shared items through `content.json`, key `carouselLibs` (`{hooks|assets|ctas: [{cat, text}]}`), no rebuild. The AI prompt generator writes image prompts to copy; it does not generate images. |
| 2.3 Voice-over | Server action `carousel_voice`: 1 token per 1,000 NEW characters (rounded up, whole job). Cache hits are free. Daily tokens first, then purchased. The same ref is never charged twice. Tokens and the global voice fuse are returned if ElevenLabs fails. Client: price check, a confirm step before spending, a clear "Not enough tokens" message. Limits: 12 slides, 1,100 characters per slide, 5,000 per job. |
| Export | PNG slides, and a WebM video (voice mixed in, or your own music file). Both carry the Studio's tier watermark. Course positions (Guard) show a placeholder, and the course scan is finished before every export. |

## Tested (real headless Chrome with fake devices; real Postgres for the server)
- Browser: Studio suites t6 to t11 (76 checks, unchanged), t12 trainer layout (16), t13 token menu (9), t14 Carousel Builder end to end (60), t15 Trim (6).
- t14 sends the voice calls through the REAL arena handler on Postgres; only ElevenLabs is faked (a short WAV).
- Server: `arena_lc32.mjs` (31) plus the earlier token suite (34) and Creator Hub suite (35) on the patched function.

## NOT tested
- Real course content: there was no `content.json`. The trainer layout was tested with the app's real board and step runner on a synthetic drill, and Trim with its built-in sample game.
- A real ElevenLabs call, real Supabase, a real Android phone or TWA, a real touch screen. Annotations were tested with mouse events; the code uses pointer events and `touch-action:none`.
- The other trainer screens that share the shell were not each opened. They get the same CSS, but Bot trainer, Vision, openings and the rest still need one look each on a phone.
- WebM from MediaRecorder has no duration header, so some platforms (Instagram, TikTok) may ask for a re-encode. PNG slides are the safe path for Instagram.
- The fixed top bar is about 150 px tall on a phone (nav, hero slot, two buttons), so "top of the screen" means directly under it.
- The Carousel tab shows for approved partners and in the admin preview. Free members do not see it.
