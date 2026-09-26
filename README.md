# Lanckrietchess Training Hub v3.6.0

One self-contained `index.html` (vanilla JavaScript, Tailwind via CDN, no build step) plus a few small files. It runs on Vercel, GitHub Pages or any static host, installs as a PWA and can be wrapped for the Play Store.

## What's new in v3.6

- **Trophy room (`#trophies`).** 27 badges in seven groups (streaks, volume and accuracy, openings, thinking, game review, rating, community), each with a progress bar. The badge count sets a trophy: Bronze (3), Silver (8), Gold (14), Platinum (20), Diamond (25). The trophy shows in the top bar and next to the player's own name on every leaderboard; ranks 1 to 3 get a gold, silver and bronze trophy. Open it from the profile sheet or the Home "Today" strip.
- **Settings > Show achievement popups.** Off: nothing covers the board while a player calculates. Badges still collect, and a dot on the trophy in the top bar says something new is waiting. Also new in Settings: Learn mode on new opening lines, Stockfish check in Learn mode, and Spaced repetition.
- **Streak HUD and quieter streaks.** Every trainer shows a live first-try streak under the board (flame, count, best). 5, 10 and 20 in a row get a flare on the HUD and at most one slim banner per day that never covers the board; 30 and up keep the full celebration.
- **Learn mode.** The first time a player opens an opening line, it starts in Learn mode: an arrow shows every move, the annotation explains it, and Stockfish checks the move against its top three (the course move is called out only when Stockfish really prefers something else, shown as a green arrow). Nothing is scored. The trainer now has Learn | Drill | Explore.
- **Spaced repetition and Think > My mistakes (`#srs`).** Every move missed on the first try is saved per position (FEN, so transpositions count) and comes back until it is played right twice in a row, here or in any trainer. Finished lines return after 1, 3, 7, 14, 30 and 60 days (10 minutes after a bad run). "Train only my mistakes" plays just those positions; "Review due lines" plays whole lines that are due. The opening list has its own "Train only my mistakes" button per repertoire.
- **Think > Peer puzzles (`#peer`).** Real blunders from players in this hub, with their username and rating: find the move that punishes it. Filter by opening and by level (defaults to the player's own bracket). Moves that win just as much are accepted too. Peer puzzles are rated by the player's rating on the leaderboard.
- **Blunder Clinic per opening.** Cases filter by opening and show the student's name and rating. Student cases are strictly MSPC: exactly four steps, M, S, P and C, in that order, each with a text (the editor and the data import refuse anything else).
- **Leaderboard > Games.** The Game of the Day (the featured game dated today, otherwise the latest) with a replay board, move tags and an MSPC breakdown, and a ranking of the most accurate featured games, filterable by level.
- **Admin > Review Queue (`#review-queue`).** Paste PGN (one game or many), import from your own Game Vault, or pull anonymous community games from the hub worker. Stockfish trims every game on this device: each of the student's moves is sorted into good, bad or blunder and every leak gets an MSPC letter. Check the verdicts, rewrite the comments, choose what each blunder becomes (peer puzzle, Clinic case with editable M, S, P and C texts) and whether the game is featured (with a Game of the Day date). Approve adds it all to your draft in one tap; publish as always. Keep the page open while it trims.
- **ELO gates.** A module can require a minimum rating on top of its tier. Default: the Meran and Moscow Semi-Slav lines need 1400. The unlock rating is the higher of a verified Chess.com or Lichess rating and the hub rating (rated puzzles); a rating typed into the profile never opens a gate. Locked rows show "1400 ELO", and tapping one shows how far the player is and how to get there. Admin menu > ELO gates edits them per repertoire, line, drill or lesson; admin mode always sees everything (preview as a player to test).
- **Data file.** The hand-written data file in the GitHub repository can now carry `community_puzzles` (fen, solution, alternatives, player, elo, opening, played, note, last_move), `featured_games` (pgn, player, elo, opening, date, accuracy, color, result, mspc), `student_mistakes` (fen, played, best, player, elo, opening, M, S, P, C) and `elo_gates` (`{ "semislav-meran": 1400, "group:Semi-Slav": 1200 }`).

**Deploy.** Upload `index.html` and `sw.js` (version `lc-hub-3.6.0`). Nothing changes on the worker.

**Honest limits.** Badges, spaced repetition and the queue live in the browser that made them, like the rest of the progress. Trophies next to other players' names on the community boards need the hub worker to store a trophy per player: send `trophy` (bronze, silver, gold, platinum or diamond) with `lb_sync` and return it on each row; the hub already shows it when a row carries it. Until then the community boards show the top-3 trophies and your own. ELO gates are a front-end gate like the tiers: a determined visitor can open the content with developer tools. A paid member below a gate's rating can't open that module, so say so on your sales page.

## What's new in v3.5.1

- **Imports never drop anything to zero.** An empty or missing repertoire section (`local.repertoire: {}`, `{ "items": [] }`, `null`) leaves the repertoires on this device alone in both Merge and Replace, with a calm message instead of an error. An empty list in a file (`"openings": []`) is read as "not in this file". Empty puzzle attempts no longer wipe the attempt history.
- **Replace swaps only what the file has.** Texts, numbers, tiers and bot instructions are replaced key by key, each list in the file replaces that list, and custom repertoires with the same name take the file's lines while every other repertoire stays. A file with one text no longer erases your other edits.
- **Self-repairing repertoire storage.** Repertoires saved in another shape (`{ "items": [...] }`, a map by id, `"white"` / `"zwart"`, PGN text, a missing id or name, duplicate ids) used to be invisible, so the counter showed 0 and a merge overwrote them. The hub now reads them, writes the list back in the clean shape once, and keeps the original under `lc-hub-repertoire-v2-before-repair`.
- **Safer repertoire matching.** A repertoire is matched by id only when name and colour agree; an id that belongs to a different repertoire gets a new id instead of mixing lines between a White and a Black repertoire.
- **Counts are always computed.** The import counts repertoires, lines, items, drills and attempts from what the file really holds; a missing, zero or broken `counts` only produces a remark.
- **Imported GitHub files respect your draft.** Importing the data engine file in admin mode applies its lines on top of your current draft instead of the built-in lists, so your own edits stay.
- **Hand-written GitHub files are safe too.** An empty list in the live data file never empties a page for players. A content.json published from admin mode keeps a list you emptied on purpose.
- **Vercel and PWA files.** New `vercel.json` (serves the data file `/json` as JSON and keeps `sw.js` fresh), `manifest.webmanifest` and `icons/`, so the hub installs as an app from the Vercel address.

## What's new in v3.5

- **Live data from GitHub.** The hub reads its database straight from `https://raw.githubusercontent.com/lanckrietchess/Json-van-app/main/json` (set in `CONFIG.remote`). Edit that one file on GitHub and every player gets it within a few minutes, without uploading a new `index.html`. The hub looks again every 10 minutes while it is open, when the tab comes back into view and when the connection returns.
- **Seamless fallback.** GitHub first, then the same file on the site itself (Vercel serves the repository, so `/json`), then the last good copy on the device (localStorage), then the built-in content. A 404, a timeout or a broken file never wipes anything and never blocks the page.
- **Every format is read.** The hand-written data engine format (`meta`, `app_settings`, `opening_lines`, `think_section.puzzles`, `theory_section.courses`, `ai_coaches`), a `content.json` from admin mode and a database export all work. Tiers may be written `Free` / `Paid` / `1` / `2`, sides `white` / `zwart`, moves `1. d4 d5` or `["d4","d5"]`; comments and trailing commas are ignored. Opening lines with an id that already exists update that line (a shorter line never cuts a longer verified one); new ids are added; puzzles become MSPC positions; course cards go into the course index. Every move and FEN is still checked with chess.js, and a broken item is skipped with the exact move that failed.
- **Members stay signed in.** The data engine format has no member keys, so keys, gates and shared folders are carried over from the previous file.
- **Admin > Live data (GitHub).** Where the data came from, when, what was loaded, what was skipped and why, which fields the hub doesn't use, and a Sync now button.
- **Follows the Vercel deployment.** Unlock links and exports use the address the hub runs on (production or your own domain). On a Vercel preview, localhost or a file on disk they use `CONFIG.site.production`, so a member never gets a link that expires. The canonical link follows along.
- **Forgiving database import.** Data management reads any of the formats above and files with only player data. Custom repertoires may be an array, `{ "items": [...] }`, `{ "reps": [...] }` or a map by id, with lines as PGN (variations included) or SAN arrays. Missing `counts` or an empty `repertoire.items` never break the import: every number is counted from what the file really holds. Merge matches repertoires by id, then by name and colour, and keeps every line from both sides; lists merge by id and start from the built-in items, so nothing drops to zero. Replace only replaces the parts the file actually contains and warns when a list gets shorter.
- **Publish goes to the same file.** Admin > Publish writes to `lanckrietchess/Json-van-app`, file `json`, by default.
- **Worker.** `hub-worker.js` reads the same file (set `CONTENT_URL` to the raw link), understands `ai_coaches`, always adds the board-data safety rules to the coach instructions, and `ALLOWED_ORIGINS` accepts `https://lanckrietchess-app-*.vercel.app` for previews.

## What's new in v3.4

- **Socratic interrogation (Trim).** The coach chat stays open through M, S, P and C. Players answer in their own words, the hub checks each answer against the engine facts (and the AI coach does too when it is on), and a step only moves on when the answer holds up. 💡 Hint gives up to three hints per step, 🏳️ Give up (Toon antwoord) shows the facts or Stockfish's line and moves on. At C a move can be played on the board or typed. The verdict is filled in from how the steps went, and the player can correct it.
- **Brilliant and great moves.** Every Trim review runs a second Stockfish pass with two lines on the player's best moves: a sound sacrifice is brilliant (!!), the only move that holds is great (!). They get a sound, a glow on the board, a celebration, and land in **Trim > Brilliant moves**, a list with a replay board, "Open in Trim" and a Lichess link.
- **Course index and upsell bridge.** Admin menu > Course index holds the curriculum (modules, chapters, lessons, tiers, tags). Every reviewed mistake is matched to one chapter. Free players see one calm card with the chapter that teaches it and a message that fits their rating bracket; members see "Open the lesson". Both AI coaches get the index in their system prompt and the matched lesson with every question.
- **Mistake log.** Every mistake from every review is saved with move number, FEN, error class, MSPC step, phase, opening, chapter and motif tags (fork, sacrifice, mate, trap, rook or pawn endgame and more).
- **Vault & Mistake Browser (admin).** Admin menu > Vault & Mistake Browser: mistakes, games and brilliant moves from the community (only players who share anonymous stats, never names) or from this device. Filter by chapter, error type, opening, phase and ELO tier, see the totals per chapter, inspect a position, export it to the course builder as an MSPC position or to the Blunder Clinic, or download a CSV.
- **Community ELO leaderboard (Home).** Chess.com and Lichess tabs with Rapid, Blitz and Bullet. Players verify an account by putting a one-time code in the Location field of their profile; the worker checks it and fetches the ratings itself, so nobody can type in a rating. Ratings refresh every few hours.
- **Volume and accuracy board (Think > Leaderboard).** Puzzles attempted, solved and accuracy per category (Openings, Middlegame, Endgame, MSPC Hard Mode). At least 20 solved puzzles to rank; a puzzle counts at most three times a day; accuracy ranks on the Wilson lower bound.
- **MSPC Hard Mode.** A switch on the MSPC trainer: no hints, 40 seconds per step, its own leaderboard category.
- **Trim limit and Trim board.** Free players get 3 reviews per 24 hours (re-reviewing a game is free); Admin > Access > "Unlimited Trim reviews" sets who is unlimited. The Trim board ranks games reviewed, blunders solved and weekly blunder reduction.
- **Blunder Clinic (Think).** Real blunders explained step by step with MSPC, then the player plays the right move. Five classic traps ship with the hub (verified with Stockfish 16); add student cases from the Vault Browser or with Admin > Blunder Clinic cases.
- **MSPC Repertoire Trainer (Think, Accelerator).** Play the Colle-Koltanowski, Caro-Kann or Semi-Slav from move one with an M and P question before your moves and the repertoire move at C. Free players see it behind a lock that opens the upgrade sheet.
- **About page.** A "You are here" pin on the rating curve from the player's verified Chess.com or Lichess rating (or their profile rating), the matching chapter highlighted, and "Training focus", "Mindset shift" and "MSPC principle" per chapter (edit them in Admin > Chapters). A new ELO analytics image sits under the chart (Admin > Numbers and links > Change the images).
- **Publish to GitHub.** The Publish sheet can commit content.json straight to your repository with a fine-grained access token (Contents: read and write, this repository only). The token stays in that browser tab.
- **Session restore.** Trim remembers the game, its review and where you were in the interrogation after a reload.

**Worker update for v3.4.** Upload the new `hub-worker.js`. The new tables are created on the first request; nothing else to set. Optional: a `CONTACT_EMAIL` variable, sent to Chess.com and Lichess in the User-Agent as they ask.

## What's new in v3.3

- **Hyper-Focus.** Each player picks one MSPC habit (M, S, P or C) for the next two weeks. The homepage shows it as a pledge with a quick check-in, the coach asks about it when the player opens Trim, and every Trim review says whether it is still the biggest leak.
- **Blunder interrogation (Trim).** After a review, "Interrogate my mistakes" goes through each of the player's mistakes with Stockfish hidden. M, S and P are questions, answered to the AI coach or honestly with one tap, each followed by the facts. At C the player plays a better move on the board and Stockfish judges it live. The verdict adds to their struggles and to your Insights. Free: the first two mistakes of every game (gate `interrogationFull`).
- **Celebrations.** A sacrifice, or the only move that holds, found on the first try gets "Brilliant move!!". Winning moves in lines, perfect runs, streaks of 5, 10, 20 and more, and a player's first ranked week get their own moment. The sound switch and reduced motion are respected.
- **Leaderboard (Think > Leaderboard).** A score out of 1000 per week, month and all time: 60% accuracy weighted by difficulty, 25% speed against a target time per move, 15% gain on a hub rating. Only the first attempt at each puzzle in a period counts, a player needs 10 different puzzles to be ranked, and attempts faster than a human can move are ignored. Everyone sees their own score; joining the community board is free for Skool community members (gate `leaderboard`).
- **Game Vault (Trim > Game Vault).** Reviewed games are saved automatically with their key moments. Folders sort games and positions by rules (opening, phase, MSPC leak, result), starting with a Mistake Archive and a To Learn folder, and the folder trainer replays each mistake until the player finds the better move. Free: 25 games and positions and 5 folders (gate `vaultUnlimited`). In admin mode you can share one of your own folders with a tier: it is published with content.json and shows up for every player with that tier.
- **Training profile.** Username, Hyper-Focus, repertoire (with White, against 1.e4, against 1.d4), other openings and struggles. It travels in the LC-P1 profile token, reaches the AI coach with every question, and a player can send it to you as a training report (an LC-R1 code) in a Skool DM.
- **Insights (admin).** Admin menu > Insights: the drills players miss most per rating bracket, the exact moves they miss, which MSPC step fails in the trainer, the leaks in their real games by opening and phase, what they ask the coach, how they judge their own mistakes, and video ideas built from those numbers. Sources: the community (needs the database below), imported student reports, or this device. CSV export.
- **Privacy.** Anonymous training stats are shared only after a player says yes (one question, after their third puzzle or first review), under a random id that isn't linked to their name, member key or leaderboard entry. Switching sharing off deletes what was shared; leaving the leaderboard deletes the player and their scores.

## What's new in v3.1

- **Shuffle Trainer.** A second mode on the Think page (`#shuffle`): pick what to shuffle (openings, middlegame, endgames or everything), pick your colour, filter on one course or one line, and play random lines from memory while the computer answers with the course moves. **Keep playing automatically** loads the next line the moment one is done. A combo counter, perfect-line counter, first-try accuracy and your best combo ever sit above the board; lines you miss come back more often, and the session ends with a "shuffle these again" list.
- **Content gating with a tier switcher.** The admin menu opens on **Editing: Free Tier Content / Editing: Paid/Vault Tier Content**. The switch sets the preview, decides which tier new items get, and filters the new **Content gating** screen, where every module (Shuffle all, random repertoire positions, unlimited custom lines, the full Trim report, the Pro coach…) and every line, drill and lesson is set to Free, Free in Skool or Paid. On the pages themselves each item carries a small **Free / Paid** tag you can tap to move it between tiers.
- **Two AI coach bots.** The Trim page now talks to a real grandmaster-level coach: a **Free bot** for Tier 1 and a structurally separate **Pro bot** for Tiers 2 and 3, each with its own instructions, its own conversation and its own limits. Every message carries the live position (FEN), the move history, the legal moves, Stockfish's top lines with evaluations and the Trim verdict of the move you are looking at. Without an AI server (or offline, or when it fails) the built-in Stockfish + MSPC coach answers, exactly as in v3.0.
- **Sales assistant on the Upgrades page.** The Walk / Bridge / Private Jet triage keeps its quick answers, and with an AI server the player can type anything: the assistant sees the answers so far and your prices, asks the missing question and ends with a `[[PATH:...]]` tag that the app turns into the right button.
- **Every bot prompt is editable.** Admin menu > **AI assistants**: view and rewrite the instructions of the free coach, the Pro coach and the sales assistant, copy one coach to the other, restore the defaults, and test a draft against your worker before you publish.
- **About page.** A Chess.com profile-picture frame (username, your own URL or an upload, all from the CMS), a fast-track meter from your lowest rating to your peak, and the hero story restructured into **chronological ELO chapters**: each chapter has a date, the rating at that moment and the gain since the previous one. The rating chart is drawn from those chapters, so editing a chapter updates the chart.
- **Numbers.** Peak rating 2105, Top 0.1%, and a new `fastTrack` value ("2 years and 11 months") that fills the `{fasttrack}` token anywhere in your texts.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app. Replaces your current `index.html` (uploaded as `index_admin.html` in the project). |
| `content.json` | What admin mode publishes: your edits, module access, bot instructions and member keys (as hashes). **Do not overwrite the one on your site with an empty file**; publish a new one from the Admin menu instead. |
| `sw.js` | Service worker: offline support. Pages and the data file are network first. |
| `manifest.webmanifest` | PWA manifest (name, colours, icons). New in v3.5.1 for the Vercel repository. |
| `vercel.json` | **New.** Vercel settings: the data file `/json` is served as JSON, `sw.js` is never cached stale. |
| `hub-worker.js` | **New.** Optional Cloudflare Worker: the AI brain behind the two coach bots and the sales assistant. Not uploaded to your site. |
| `activation-worker.js` | Optional Cloudflare Worker that locks every key to one device (unchanged). Not uploaded to your site. |
| `.nojekyll` | Lets GitHub Pages serve `.well-known/` (needed for the Play Store). |
| `icons/` | App icons: 192, 512, maskable 512 and the Apple touch icon (sky-blue knight on slate). Replace them with your own artwork any time, same file names. |

## Deploy (Vercel + GitHub)

1. Upload `index.html`, `sw.js`, `vercel.json`, `manifest.webmanifest` and the `icons` folder to `lanckrietchess/Json-van-app` (Add file > Upload files, drag the folder in as well > Commit). Vercel deploys the commit to `https://lanckrietchess-app.vercel.app/` by itself. Leave the data file `json` where it is.
2. Check the deployment: open the site, then Admin menu > Live data (GitHub). It should say the data came from GitHub. Later, for the Play Store, add `.well-known/assetlinks.json`.
3. `sw.js` carries version `lc-hub-3.6.0`; bump it every time you upload a new `index.html`, so returning players get it.
4. Moving the data file? Change `CONFIG.remote` (owner, repo, branch, path). A custom domain? Nothing to change: links follow the address the hub is served from. Only `CONFIG.site.production` is used as the fallback address.
5. Before launch, check `CONFIG.access.demoKeys` is `false` in `index.html` (it is in this build).

## AI assistants (the hub worker)

Without a worker the hub behaves exactly like v3.0: the built-in coach answers on the Trim page and the scripted assistant answers on the Upgrades page. To switch on the real bots:

1. **console.anthropic.com** > create an API key, and set a monthly spend limit. Every message costs a little; the limit is your safety net.
2. **dash.cloudflare.com** > Workers & Pages > Create > Worker. Paste `hub-worker.js`, deploy.
3. Worker > Settings > Variables and Secrets:
   - `ANTHROPIC_API_KEY` — your key (type Secret)
   - `CONTENT_URL` — `https://raw.githubusercontent.com/lanckrietchess/Json-van-app/main/json`
   - `ALLOWED_ORIGINS` — `https://lanckrietchess-app.vercel.app,https://lanckrietchess-app-*.vercel.app`
   - `ADMIN_SECRET` — a long random password (type Secret). Admin mode asks for it when you test draft instructions.
   - Optional: `MODEL` (default `claude-sonnet-5`), `MODEL_FREE` / `MODEL_PAID` / `MODEL_SALES` (for example `claude-haiku-4-5` for the free coach, which is cheaper), `MAX_TOKENS`, `FREE_PER_HOUR`, `PAID_PER_HOUR`, `SALES_PER_HOUR`.
4. In `index.html` set `CONFIG.ai.endpoint` to the worker address (`https://lc-hub.yourname.workers.dev`) and upload it.
5. Admin menu > AI assistants > edit the instructions > Publish. The worker reads them from `content.json` on the next message.

How the Pro coach is checked: the app sends the member key with the question, the worker hashes it and looks it up in the key list you published, and only then does the Pro bot answer. Keys you type by hand into `CONFIG.access.keys` are invisible to the worker, so create keys in admin mode (Member keys). If you also run `activation-worker.js`, bind its `lc-bindings` KV namespace to the hub worker as `BINDINGS` and the key is checked against the device it is locked to as well.

Honest limits: the bot instructions travel through `content.json`, so anyone can read them — never put private notes or passwords in them. The rate limit inside the worker is per worker instance, so treat it as a brake, not a lock; the spend limit in the Anthropic console is the real safety net.

## Leaderboard and insights (hub worker + D1)

The community leaderboard and the anonymous stats run on the same hub worker as the AI coach, in a free Cloudflare D1 database. Without it nothing breaks: every player still sees their own score, and Insights works from student reports and your own device.

1. dash.cloudflare.com > Storage & Databases > D1 > Create database. Name it `lc-hub`.
2. Your hub worker > Settings > Bindings > Add > D1 database: variable name `DB`, database `lc-hub`. Deploy the new `hub-worker.js`.
3. The worker creates its tables on the first request. The leaderboard doesn't need the Anthropic key; Insights and the leaderboard admin use the `ADMIN_SECRET` you already set.
4. Running it on a different worker than the AI coach? Admin mode > Numbers and links > "Leaderboard and stats worker URL". Empty means the AI coach worker (`CONFIG.ai.endpoint`).

Numbers and links also holds the puzzles needed to get ranked (default 10) and the three weights (0.6 accuracy, 0.25 speed, 0.15 rating gain). Publish after changing them: the worker reads them from content.json and recomputes every score from the raw attempts, so nobody can send a made-up score.

Admin menu > Leaderboard hides a player (a rude name, an obvious cheat) or brings them back. Admin menu > Insights asks once per browser tab for your `ADMIN_SECRET` and forgets it when the tab closes. Student reports: a player taps "Send my training report" in their profile and pastes the code in a DM; add it under Insights > Student reports.

The free D1 plan allows 5 million rows read and 100,000 rows written per day, and 5 GB of storage. A synced puzzle is one row and stats travel in batches, so that covers thousands of daily players. Stats older than 400 days are deleted when you open Insights.

## Admin mode

**Signing in.** Type `LANCKRIET_ADMIN_MODE` in any key field, enter your email, then the current 6-digit code. The session lasts 14 days, is encrypted with a key stored in this browser only, and is useless if copied to another device. Five wrong attempts lock sign-in for ten minutes.

**Editing.** Pencils appear next to every editable text; "Manage" buttons open lists (MSPC positions, spotlights, repertoires, lines, plans, drills, lessons, ELO chapters, proofs, credentials). The Admin chip in the top bar opens the menu: the tier switcher, Content gating, AI assistants, Profile image, texts, numbers and links, every list, member keys, publish, backup, and "Preview the hub as".

**Tiers.** The switch at the top of the Admin menu (and the tag in the admin bar on every page) decides which tier you are working on: Free shows the hub as a free player sees it and gives new items `lock: free`; Paid previews as a member and gives new items `lock: vault`. Content gating is the full overview; the small Free / Paid tag on a line, drill or lesson is the quick way.

**Publishing.** Edits are saved on your device first. Admin menu > Publish > Download `content.json`, then upload it next to `index.html`. Players get it on their next visit. "Throw away my draft" goes back to what is live.

**Backup.** Admin menu > Backup and restore downloads a private file with your draft and the plain member keys you created. Keep it safe and never upload it.

## Member keys

1. Admin menu > Member keys > enter the member's name, choose the tier, optionally an end date > Create key.
2. Copy the key (for example `LC-ACC-7K2P-QX9M-4TRA`) or the unlock link (`index.html?lc_token=...`) and send it in a Skool DM.
3. Publish. The key works from then on.
4. When a membership ends: switch the key off (or let the end date pass) and publish. The member drops to free access on their next visit.

Without the activation server a key works on any device it is typed into, so give every member their own key and switch off keys that leak. Since v3.1 the key itself is also kept on the member's own device, so the hub worker can confirm the membership before the Pro coach answers.

### One device per key (optional)

Deploy `activation-worker.js` as described at the top of that file (free Cloudflare Worker plus a KV namespace), then set `CONFIG.access.activationEndpoint` to its address. A key then locks to the first device that uses it; a second device gets "This key is already active on another device". The app re-checks weekly, and if a member changes phones you tap "Reset devices" next to their key (it asks for your `ADMIN_SECRET`). Set `MAX_DEVICES` to `2` if members may use a phone and a laptop.

## Play Store (TWA)

1. Host the hub on a domain you control at the root. The Play Store needs `https://your-domain/.well-known/assetlinks.json`.
2. Go to pwabuilder.com, enter your hub URL, choose Android > Generate package. Keep the signing key it gives you.
3. Upload the `assetlinks.json` from the package to `.well-known/assetlinks.json` on your site (`.nojekyll` makes GitHub serve it).
4. Upload the `.aab` in the Play Console. Content updates through `content.json` reach the app without a new release.

## Honest limits

- The hub is a static site. Admin mode protects your editing workflow, but nobody can be stopped from changing what their own browser shows with developer tools. Only files you upload change what players see, which is why publishing works through `content.json`.
- Anything shipped in `index.html` can be read by a determined visitor, including locked drills. Keys control access in the app; they don't encrypt the content.
- Without the activation server, one key can be shared between devices.
- The AI bots need a connection. Offline, or when the worker is down, the built-in coach and the scripted assistant take over so nothing in the hub breaks.

**The leaderboard is a motivation board, not a tournament.** The worker re-scores everything from raw attempts, counts only first tries, ignores impossible speeds, and you can hide players, but someone determined can still send made-up attempts straight to the worker. Joining is gated in the app; the worker doesn't re-check the member key. Scores, the Game Vault and the training profile live in the player's browser like the rest of their progress: clearing browser data starts them over, and the community board keeps only what was synced.

**The v3.4 limits.** The 3 free Trim reviews are counted on the device, like the other free limits. The ELO board trusts Chess.com and Lichess, not the player, but a player could verify someone else's account if that person leaves the code in their own profile, which is unlikely. The Blunder Clinic and course index texts are yours to check and edit. Never upload a backup file to a public repository: it holds your member keys in plain text.

## Updating content by hand

Everything in `CONFIG`, `CONTENT` and `COPY` near the top of `index.html` can still be edited in a text editor. Admin mode just makes it faster and checks your chess for you. The gates in `GATES` and the default bot instructions (`DEFAULT_COACH_PROMPT`, `DEFAULT_SALES_PROMPT`) sit right under `COPY`.
