# Lanckrietchess Training Hub v4.0.0

## What's new in v4.0: opening chapters are trees

The Opening Trainer no longer plays straight "stems". Every chapter is a **tree**: one position can hold several replies of your opponent and several moves of your own, exactly as in ChessTempo.

- **Any move of the chapter is right.** If you play a move that exists elsewhere in the chapter tree, the trainer does not mark it wrong: it says *Also in this chapter* and follows you into that branch (the line counter jumps with it). A move that belongs to **another chapter** of the same repertoire (for example 9.b4 inside the 9.e4 chapter) gets *That is your repertoire too*, with no penalty. Only a move that is nowhere in the repertoire counts as a mistake.
- **Single line mode.** One line at a time, with ◀ ▶ arrows and a line picker (✓ marks the lines you have done). At the end of every line: *Would you like to see the next line or practice this one first?* with Next line, Practice this line again and Train the full chapter.
- **Full chapter mode.** The whole branching chapter in one session. The opponent picks among the replies you have not covered yet; after every leaf the run jumps back to the nearest branch point that still has lines waiting, until every line of the level is covered. A meter shows *x of n lines covered*.
- Learn (arrows, first time through) and Explore (the tree with Stockfish) work on the same chapters. Kyenzo's notes show in full under the board, arrows and coloured squares from the file (`[%cal]`, `[%csl]`) are drawn on the board, and !/?/!? symbols show next to the moves.
- Progress, spaced repetition, streaks, the leaderboard and "Train only my mistakes" keep working: every leaf of a tree is still a line with a stable id.

### Course data (content.json, format `tree-v1`)

`content.json` was rebuilt **move for move from the ChessTempo export** (`ct-all-repertoires`, 11 trees). Nothing was added and nothing left out: a check replays every level against its source file (same moves, same comment blocks, 0 differences). Earlier versions added Semi-Slav chapters that are not in your export (such as the Botvinnik) and missed the Réti and the Exchange Slav; the file now holds exactly what the export holds. Note: 5.g3 (the Catalan set-up) *is* in your export, on levels 3 and 4, so it is in the course with your moves.

| Level | Source in the export |
|---|---|
| 1 Free | the chapter's first level, up to your third move after the chapter's branch point (`stopMoveIndex`) |
| 2 Beginner | course 1 (`Colle 1 V3`, `caro-kann 1V2`, `semi-slav 1V2`) |
| 3 Intermediate | course 2 (`… 2 V3`, `… 2V2`) |
| 4 Advanced | course 3 (`… 3 V3`, `… 3V2`) |
| 5 Master | the model games, as two repertoire tabs: Colle Model Games and Black Model Games |

Each level is exactly its own file, so a move that a later course dropped is not in that later level. A level a chapter doesn't have shows *From Level 3* (the chapter starts later) or *Soon*.

A chapter in the file:

```json
{ "topicId": "semislav-anti-moscow-6-bh4", "title": "Anti-Moscow: 6.Bh4",
  "path": "1.d4 c6 2.c4 d5 3.Nf3 Nf6 4.Nc3 e6 5.Bg5 h6 6.Bh4",
  "levels": [ { "level": 1, "isFree": true, "requiredTier": 0, "stopMoveIndex": 16 },
              { "level": 2, "isFree": false, "requiredTier": 2, "source": "semi-slav 1V2" } ],
  "tree": [ { "m": "d4", "n": ["Kyenzo's note"], "c": [ { "m": "c6", "c": [ … ] } ] } ] }
```

A node: `m` move (SAN), `n` comment blocks, `g` NAGs, `ar`/`sq` drawings (`"Gc4e3"`, `"Rh3"`), `l` the first level that has the move (left out = same as the move before), `x` deeper levels that dropped it, `c` the moves after it (the first is the main line). The notes of a move that several chapters play (the approach moves) are written once, in the first chapter that plays it; every chapter shows them.

**Hand edits:** you can still edit `content.json` by hand. Every move is replayed with chess.js when the file comes in; an illegal move is left out with what follows it and named in Admin > Live data. The old v3.9 format (`levels[].pgn`) still loads.

### Admin > Import ChessTempo trees

Paste your export or pick the `.pgn` file. The hub reads every tree (about a second), guesses the repertoire and level of each (edit them), splits the trees into chapters at their branch points, lets you rename the chapters, and then either puts them in your admin draft (publish as usual) or downloads a data file in the format above. This is how a new ChessTempo export becomes an app update without a developer.

### Honest limits of v4.0

- ChessTempo stores comments **per position**, not per line. When two of your courses reach the same position, the export repeats that position's comments in both files (for example the Colle model-games introduction on 1.d4 in the Semi-Slav course). The hub keeps them as exported; clean them in ChessTempo and export again.
- Chapter splits and titles of the delivered file were set by hand once; the in-app importer splits automatically (rename chapters in its preview).
- "My repertoire" (the custom builder) still trains line by line.
- The first time a new course file arrives, the hub replays every move once (about half a second on a laptop, a bit more on a phone); after that it is remembered on the device.

## What's new in v3.9: one five-level system for everything

**Breaking change.** All the old access checks are gone: the `lock` words (free, community, vault) on content, the v3.8 ladder (`freeSample`, `tiers`, `tierKey`, `CONFIG.ladder`), the ELO gates (`minElo`, `elo_gates`, the admin sheet) and the free/advanced zones in Middlegame and Endgame. Every chapter and topic in every module now has the same five levels, and there is exactly one check in the whole app: `Levels.open(item)`.

| Level | Name | ELO advice | Access |
|---|---|---|---|
| 1 | Free | none | everyone (`isFree: true`, `requiredTier: 0`) |
| 2 | Beginner | 800–1200 | paid token (`requiredTier: 2`, the Accelerator) |
| 3 | Intermediate | 1200–1600 | paid token |
| 4 | Advanced | 1600–1800 | paid token |
| 5 | Master | 1800+ | paid token (`requiredTier: 3` makes a level Mentorship-only) |

The ELO is advice on the button and never blocks anything. Level 1 is always free and levels 2–5 always paid: an `isFree` or `requiredTier` that contradicts the level is ignored and named in the Live data report.

### Data shape (content.json)

Openings, in `repertoires[].chapters` or a top-level `chapters` list:

```json
{ "topicId": "caro-advance", "title": "Caro-Kann Advance", "repertoire": "Caro-Kann",
  "levels": [
    { "level": 1, "isFree": true,  "requiredTier": 0, "pgn": "1.e4 c6 2.d4 d5 3.e5 c5", "skoolUrl": "" },
    { "level": 2, "isFree": false, "requiredTier": 2, "pgn": "1.e4 c6 2.d4 d5 3.e5 c5 4.c3 Nc6 5.Nf3 cxd4 6.cxd4 Bg4" },
    { "level": 3, "isFree": false, "requiredTier": 2, "pgn": "… (4.dxc5 Nc6 5.Bb5) …", "skoolUrl": "https://www.skool.com/…" }
  ] }
```

- **Cut-off:** Level N plays the lines of levels 1 to N and nothing deeper. A line that is only the start of a longer line drops out. The Explore tree stops at the same point.
- Variations in `( )` become extra lines of that level. `{comments}` become coach notes on every line that plays those moves.
- `stopMoveIndex` (half-moves, or a move such as `"9.e4"`) cuts a level short. A level with a stop but no `pgn` takes the chapter's `pgn`, else the next deeper level's moves.
- `id` on a level keeps an existing line id, so players keep their progress (the migrated content.json uses this for every Level 1).
- A missing or empty level shows as **Soon**; the five buttons are always there.

Puzzles, courses, bootcamps, middlegame, endgame and plans use `topics` (with `"module"`), `think_section.puzzles` or `courses`/`bootcamps`: each level holds `items` (or `puzzles`, `lessons`, `drills`) in their usual shape. Here a level is its own set, not a longer version of the level below.

`skoolUrl` is optional per level and shows a discreet "Watch the video on Skool ↗" link (text editable as `lv.skool` in the copy editor). Only `https` links to `skool.com` are kept.

### Links

`#chapter/<topicId>/<level>` and `#topic/<topicId>/<level>` (level 1–5 or its name) open that chapter or topic on that level, in any module. The link button next to a level bar copies one.

### Older files

Files, drafts and cached copies from before v3.9 still load. Their access words are translated once, at import, and then deleted: free and Skool-community items land on Level 1, paid (vault) items on Level 2, Mentorship items on Level 2 with `requiredTier: 3`. The Live data report says how many items were translated. v3.8 ladder chapters (`freeSample`/`tiers`) are not translated: the report names them so they can be rewritten with `levels`.

### Honest limits (v3.9)

- The gate is front-end, like every gate in this hub: it stops casual access, not a determined developer.
- Content that was "free in Skool" (community key) is now Level 1 and open to everyone. Put it on Level 2 if it should stay behind a token.
- Module gates (GATES), shared coach folders and the course index keep their own tiers; the Lichess rated Puzzles page is unchanged.
- The admin level pickers (L1–L5 in the gating sheet, the level tag, the item form fields `lvl`, `requiredTier`, `skoolUrl`, `topicId`) were checked for syntax but not clicked through in a browser test.


One self-contained `index.html` (vanilla JavaScript, Tailwind via CDN, no build step) plus a few small files. It runs on Vercel, GitHub Pages or any static host, installs as a PWA and can be wrapped for the Play Store.

## What's new in v3.8

- **Five-level chapters.** A chapter can now come in five levels: Free Sample, Beginner (0–800), Intermediate (800–1200), Advanced (1200–1600+) and Masters (1600–2200+). Put them in the data file as a top-level `"chapters"` list (each with a `"repertoire"`), or inside `repertoires[].chapters`:

  ```json
  "chapters": [
    { "chapterId": "caro-advance-3c5", "title": "Caro-Kann Advance: the 3...c5 break", "repertoire": "Caro-Kann",
      "freeSample": { "stopMoveIndex": 6, "moves": "1.e4 c6 2.d4 d5 3.e5 c5", "description": "Strike at White's centre straight away with 3...c5." },
      "tiers": {
        "beginner":     { "guidelineElo": "0-800",      "stopMoveIndex": 10,   "moves": "1.e4 c6 2.d4 d5 3.e5 c5 4.c3 Nc6 5.Nf3 cxd4" },
        "intermediate": { "guidelineElo": "800-1200",   "stopMoveIndex": 14,   "moves": "..." },
        "advanced":     { "guidelineElo": "1200-1600+", "stopMoveIndex": 16,   "moves": "..." },
        "masters":      { "guidelineElo": "1600-2200+", "stopMoveIndex": null, "moves": "..." } } }
  ]
  ```

  `stopMoveIndex` counts half-moves (6 = 1.e4 c6 2.d4 d5 3.e5 c5); a move like `"8.dxc5"` or `"5...cxd4"` works too, and `null` plays the whole line. Two shortcuts: a comment in `{ }` after a move becomes your note on that move (Learn mode shows it, and it reaches every shallower level that plays the same moves), and a level with a `stopMoveIndex` but no `moves` uses the moves of the next deeper level, so one full line with five stop points is enough. A level that isn't in the file shows as "Soon". `tier-chapters-example.json` has two chapters built from your Caro-Kann Advance and Colle lessons, with your own notes.
- **The level bar.** Every five-level chapter shows the five levels above the board. The Free Sample is open to everyone and styled as the hook; a tap on any level loads its line on the same board at once (no reload), in Learn or Drill mode. Under the bar: "Recommended guideline: Master the Beginner section before moving to Intermediate, but you are free to explore at your own pace." With a verified Chess.com or Lichess rating, or a rating in the profile, the level that fits gets a green dot and one extra sentence. Nothing is ever blocked by rating: ELO gates don't apply to levels.
- **The gateway.** A level the player's membership doesn't cover dims the board on the position where that level carries on from the free sample ("Beginner carries on from here"), and the panel says how far it goes ("to move 8: 8 moves of yours to learn, with 5 of Kyenzo's notes"). "Talk to Kyenzo's assistant" opens the sales assistant over the trainer, and the assistant already knows the chapter and level (the AI worker gets it as `interest` in the context). "I have a member key" opens the key sheet; after a valid key the level starts right away.
- **Next level.** A finished level offers "Next level: Intermediate" (or "Unlock Intermediate", with a line on how far it goes), and the last level offers the next chapter.
- **Chapter cards.** The list shows each five-level chapter as one card: the free sample as the main row, the four levels underneath with their guideline, lock and progress.
- **Chapter links.** `https://lanckrietchess-app.vercel.app/#chapter/caro-advance-3c5` opens a chapter's free sample, `…/#chapter/caro-advance-3c5/intermediate` a level. For video descriptions and bios. The link button next to the guideline copies it.
- **Access per level.** `CONFIG.ladder.access` sets the membership each paid level needs (default: `vault`, the Accelerator). A level in the file can set its own with `"lock": "community"` or `"vault"`. The Free Sample is always free.
- **Live data.** Admin menu > Live data lists every five-level chapter with the half-moves each level plays, so you can check your stop points.

**Deploy.** Add your chapters to the `json` file in `lanckrietchess/Json-van-app` (the example file shows the shape), then upload `index.html` and `sw.js` (version `lc-hub-3.8.0`). Every level becomes one opening line with the id `<chapterId>--<level>`, so progress, spaced repetition, Shuffle and Explore work on it like on any line. Nothing changes on the worker.

**Honest limits.** Levels are a front-end gate like every tier: a determined visitor can read the locked moves with developer tools. Masters currently needs the Accelerator like the other paid levels; a mentorship-only level needs one more lock level in the hub.

## What's new in v3.7

- **The GitHub file is the only source of course content.** `index.html` no longer carries any repertoire, opening line, chapter, MSPC position, middlegame or endgame drill, bootcamp lesson, spotlight, Blunder Clinic case or course index. Every list starts empty and holds exactly what the data file holds. Nothing is merged on top any more: in v3.6 the live file (11 Colle lines, 1 Caro-Kann line, 1 Semi-Slav line) was mixed with the built-in lines, so players saw 13, 4 and 4. The old rule that "a shorter line never cuts a longer one" is gone too: the file wins, moves included. The About page story (Kyenzo's ELO chapters, proofs, credentials) stays in the file as brand copy, and the data file can still replace it.
- **Chapters come from the file.** The repertoire tabs show the chapter count from the file, the list shows "7 chapters, 9 lines", and every line carries its chapter number. Two ways to write chapters: a `"chapter"` field on an opening line (lines with the same chapter are grouped; a line without one is a chapter of its own), or a nested `repertoires` list:

  ```json
  "repertoires": [
    { "name": "Caro-Kann", "side": "black", "intro": "1...c6 against 1.e4.",
      "chapters": [
        { "title": "Advance with 3...c5", "lines": [ { "id": "ck-adv-1", "pgn": "1.e4 c6 2.d4 d5 3.e5 c5", "tier": "Free" } ] },
        { "title": "Classical", "pgn": "1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5", "tier": "Paid" }
      ] }
  ]
  ```

  A repertoire without a side is played with Black when its name sounds like a defence (Caro, Slav, French, Sicilian, Defence…), otherwise with White. Admin menu > Live data lists the chapters and lines per repertoire exactly as players see them.
- **Cache busting that actually works.** GitHub's raw CDN caches for five minutes and ignores query strings (tested: every unique `?v=` came back as a cache hit of the same age). So the hub first asks the GitHub API for the newest commit on the branch and reads the file at that commit, an address that can never be stale. Every request also carries a fresh `?v=` and `cache: 'no-store'`, so no browser, PWA or service-worker cache answers it. Without the API (GitHub allows 60 anonymous calls per hour per network; the hub asks at most once a minute and pauses 15 minutes after a limit), it falls back to the branch, then to this site's copy, then to the last good copy on the device. The device copy moved to a new key, so the v3.6 mix is dropped once. `CONFIG.remote.pinCommit: false` switches the commit lookup off.
- **Theory > Puzzles (`#puzzles`).** Rated tactics from the Lichess puzzle API, on a clean board with the player card, the Puzzle ELO (with a provisional mark for the first 10), peak, solve rate, the streak counter under the board and a green or red rating change after every result. The opponent's last move plays first, then it's your turn; any mating move counts, as on Lichess. A wrong move costs rating once, and you can keep trying unrated. Hint shows the piece (free); showing the move or the solution counts as a miss. Every puzzle counts once; retries and repeats are unrated. The first visit asks for a starting level (or the player's verified rating).
- **Difficulty selector.** Easier (−200), My level (±0), Harder (+200) and Deep calc (+400), remembered per device. The public Lichess endpoint takes a difficulty level, not a rating: without a Lichess login its levels sit around 900, 1200, 1500, 1800 and 2100. The hub picks the level closest to your Puzzle ELO plus the offset, checks the real rating of every puzzle, and asks again (up to 3 times) until one lands within 250 of the target. Puzzles that don't fit wait in a small queue, and the next one is fetched while you solve the current one.
- **Puzzle bank.** For players below ~900, and when Lichess can't be reached, the hub uses `puzzle_bank` from the data file: rows copied straight from the Lichess puzzle database CSV (`"00008,r6k/pp2r2p/...,f2g3 e6e7 b2b1 b3c1 b1c1 h6c1,1913,..."`) or objects `{ "id", "fen", "moves", "rating", "themes" }`. The FEN is the position before the opponent's move, `moves[0]` is that move, the rest is the solution. Every move is checked with chess.js.
- **Leaderboard > Puzzles.** Your Puzzle ELO, peak, solve rate and form over the last 20, and the community board with the gold, silver and bronze trophies for the top three and every player's own trophy next to their name. It needs two new actions on the hub worker (below). Until they are there, players see their own rating and a calm "goes live with the next worker update".
- **Achievement pop-ups, now routed.** Settings > Show achievement pop-ups was already there since v3.6. Off now means: nothing covers the board, and every moment that would have popped up (brilliant move, streaks of 10 and more, first ranked week, badges, a new Puzzle ELO hundred) is kept in a "Kept quietly" list in the profile sheet, with a dot on the profile chip in the top bar until it's opened.
- **Empty states.** A page whose section isn't in the file yet says so ("No middlegame lessons, drills or plans in the course file yet"), says "Loading the course data…" while the first sync runs, and redraws itself as soon as the file arrives. Middlegame and Endgame show only the sections the file fills (admin mode keeps every section so you can add items).
- **Service worker.** Cached pages and data are stored under the address without the query string, so cache-busted requests don't pile up and unlock links (`?lc_token=`) never sit in the cache. Version `lc-hub-3.7.0`.

**Deploy.**

1. Check `json-v3.7-migration.json`. It is your live file, unchanged in the parts you wrote (meta, app_settings, opening_lines, think_section, theory_section, ai_coaches), plus everything that used to be built into `index.html`: the repertoire intros (`groups`), the MSPC positions, middlegame plans and drills, endgame drills, the three bootcamps, spotlights and Blunder Clinic cases (`lists`), and the course index (`course_index`). The 9 old built-in opening lines are under `archived_opening_lines`: players don't see them until you move them into `opening_lines`, so your chapter counts stay yours.
2. Upload it to `lanckrietchess/Json-van-app` **as `json`** (replace the file), then upload `index.html` and `sw.js`. Upload the data file first, or the middlegame, endgame and MSPC pages are empty until you do.
3. Open the site, then Admin menu > Live data. It should say "GitHub, commit …" and list the chapters per repertoire. If you were editing in admin mode before, your draft still wins on your own device: Admin menu > Publish > "Throw away my draft" shows the live file.

**Fix in the data file.** `colle-1-rook-lift` and `puzzle_colle_rook_lift` are skipped: 12.Rxe4 is illegal after 11.e5 Nxe5 (e4 is empty). Re-export that line from ChessTempo. Admin menu > Live data lists every skipped item with the move that failed.

**Hub worker: the Puzzle ELO board.** Add this to `hub-worker.js` and call it from the action switch, with the same JSON response and CORS helper the other actions use: `if (body.action === 'pz_sync' || body.action === 'pz_top') return <yourJsonResponse>(await puzzleBoard(body, env));`. It recomputes every rating from the raw results with the same formula as the hub, so a typed-in rating never reaches the board.

```js
async function puzzleBoard(body, env) {
  if (!env.DB) return { ok: false, reason: 'no-db' };
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS pz_players (device TEXT PRIMARY KEY, name TEXT, bracket TEXT, trophy TEXT, start INTEGER, rating INTEGER, peak INTEGER, games INTEGER, wins INTEGER, hidden INTEGER DEFAULT 0, updated INTEGER)').run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS pz_results (device TEXT, id TEXT, r INTEGER, w INTEGER, t INTEGER, PRIMARY KEY (device, id))').run();
  const dev = String(body.device || '').slice(0, 64), now = Date.now();
  if (body.action === 'pz_sync') {
    if (!/^[\w-]{8,64}$/.test(dev)) return { ok: false, reason: 'device' };
    const name = String(body.name || '').replace(/[\u0000-\u001f<>"'`\\]/g, '').trim().slice(0, 24);
    if (!name) return { ok: false, reason: 'name' };
    const start = Math.min(2800, Math.max(400, Math.round(+body.start || 1200)));
    const list = (Array.isArray(body.results) ? body.results : []).slice(0, 150)
      .filter((x) => x && /^[\w-]{2,60}$/.test(String(x.id)) && +x.r >= 100 && +x.r <= 3500 && +x.t > 0 && +x.t <= now + 60000);
    for (const x of list) await env.DB.prepare('INSERT OR IGNORE INTO pz_results (device, id, r, w, t) VALUES (?, ?, ?, ?, ?)').bind(dev, String(x.id), Math.round(+x.r), x.w ? 1 : 0, Math.round(+x.t)).run();
    const all = (await env.DB.prepare('SELECT r, w FROM pz_results WHERE device = ? ORDER BY t').bind(dev).all()).results || [];
    let rating = start, peak = start, wins = 0;
    all.forEach((x, i) => {
      const k = i < 10 ? 48 : i < 30 ? 32 : 20, e = 1 / (1 + Math.pow(10, (x.r - rating) / 400));
      let d = Math.round(k * ((x.w ? 1 : 0) - e));
      if (x.w && d < 1) d = 1; if (!x.w && d > -1) d = -1;
      rating = Math.min(3300, Math.max(100, rating + d)); peak = Math.max(peak, rating); wins += x.w ? 1 : 0;
    });
    const trophy = ['bronze', 'silver', 'gold', 'platinum', 'diamond'].indexOf(body.trophy) >= 0 ? body.trophy : '';
    await env.DB.prepare('INSERT INTO pz_players (device, name, bracket, trophy, start, rating, peak, games, wins, updated) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(device) DO UPDATE SET name=excluded.name, bracket=excluded.bracket, trophy=excluded.trophy, start=excluded.start, rating=excluded.rating, peak=excluded.peak, games=excluded.games, wins=excluded.wins, updated=excluded.updated')
      .bind(dev, name, String(body.bracket || '').slice(0, 20), trophy, start, rating, peak, all.length, wins, now).run();
    return { ok: true, rating };
  }
  const limit = Math.min(100, Math.max(1, Math.round(+body.limit || 50)));
  const where = 'hidden = 0 AND games >= 5';
  const rows = (await env.DB.prepare('SELECT device, name, bracket, trophy, rating, peak, games FROM pz_players WHERE ' + where + ' ORDER BY rating DESC, peak DESC LIMIT ?').bind(limit).all()).results || [];
  const total = ((await env.DB.prepare('SELECT COUNT(*) AS n FROM pz_players WHERE ' + where).first()) || {}).n || 0;
  let you = null;
  if (dev && !rows.some((r) => r.device === dev)) {
    const mine = await env.DB.prepare('SELECT rating FROM pz_players WHERE device = ? AND ' + where).bind(dev).first();
    if (mine) { const above = await env.DB.prepare('SELECT COUNT(*) AS n FROM pz_players WHERE ' + where + ' AND rating > ?').bind(mine.rating).first(); you = { rank: ((above && above.n) || 0) + 1 }; }
  }
  return { ok: true, total, you, rows: rows.map((r, i) => ({ rank: i + 1, name: r.name, bracket: r.bracket, trophy: r.trophy, rating: r.rating, peak: r.peak, games: r.games, you: r.device === dev })) };
}
```

To hide a player from this board, set `hidden = 1` on their row in the D1 console (Admin > Leaderboard doesn't reach this table yet).

**Honest limits.** The Puzzle ELO lives in the browser that earned it, like the rest of the progress. The worker recomputes ratings from raw results, but it trusts the puzzle ratings and outcomes the device sends, so treat this board as motivation, not a tournament. Lichess puzzles need a connection to lichess.org, and Lichess can pause the hub for a minute when many players on one network fetch at once; the bank covers that if you fill it. Below ~900 Lichess can't match a rating without a login, which is what the bank is for. The commit lookup counts against GitHub's 60 anonymous API calls per hour per network: a school or office full of players shares that budget, and the hub then falls back to the branch file (at most five minutes old). The ELO gates in `CONFIG.eloGates` (Semi-Slav Meran and Moscow at 1400) still apply by line id; put `elo_gates` in the data file to change them.

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
3. `sw.js` carries version `lc-hub-4.0.0`; bump it every time you upload a new `index.html`, so returning players get it.
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

Everything in `CONFIG` and `COPY` near the top of `index.html` can still be edited in a text editor. Since v3.7 `CONTENT` holds no course content: repertoires, lines, chapters (including the five-level chapters of v3.8), drills and lessons live in the data file on GitHub. `CONFIG.ladder` sets which membership opens each level. Admin mode just makes it faster and checks your chess for you. The gates in `GATES` and the default bot instructions (`DEFAULT_COACH_PROMPT`, `DEFAULT_SALES_PROMPT`) sit right under `COPY`.
