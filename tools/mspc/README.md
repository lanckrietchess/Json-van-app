# MSPC move notes: how they are made

`mspc-notes.json` holds one short note (Move, Specifics, Priorities, Calculation, Why, Remember) for every move the player makes:
the 2,062 move slots in your 48 course trees (1,845 unique) and the 594 solver moves in your 228 endgame and middlegame puzzle lines.
2,439 notes in all. It is built offline, so the app pays nothing at runtime, and every sentence comes from the board (chess.js) or from
Stockfish numbers. Your `content.json` is only read, never changed.

    npm install                                  # chess.js and Stockfish 16 (a build tool only; it is not shipped in the app)
    npm test                                     # 19 checks, including a fuzz over 1,000+ random positions
    node build-notes.mjs /path/to/content.json --out ./out      # about 20 minutes on one CPU the first time, seconds after (cached)
    node verify-notes.mjs /path/to/content.json ./out/mspc-notes.json    # re-derives every claim from the board; exit code 1 on any failure

Then upload `out/mspc-notes.json` to the root of the Json-van-app repo, next to the file the app reads for your courses (the one named
`json`). Rebuild after you change the trees or puzzles; engine results are cached by position, so only new positions are searched.

A move appears in `out/mspc-report.md` only when the engine thinks it throws away an advantage at depth 10 AND still does at depth 18
AND the position is not still clearly winning afterwards. Those notes say "A course choice" instead of an evaluation.

Tuning lives at the top of `mspc.mjs` (wording, thresholds) and `build-notes.mjs` (`--depth`, `--verify-depth`).


## Puzzle audit (Pillar 4)

    node audit-puzzles.mjs /path/to/content.json --out ./out     # about 2 minutes on one CPU, Stockfish 16, depth 14, 5 lines
    node audit.test.mjs                                          # 8 checks with the real engine on a small fixture

For every solver move in your 228 endgame and middlegame puzzle lines it asks the engine: is your solution really good, which other first
moves are *also* good, and what is the starting position worth. It writes:

- `out/puzzle-alts.json`: the alternatives. Upload it next to `mspc-notes.json`. The app accepts those moves instantly (no engine, works offline)
  and explains why they work. A move that is not in the file still goes to the live engine.
- `out/puzzle-audit-report.md`: solutions the engine ranks well below its best (with a "Still" column: winning, level, worse), positions with several
  good moves, puzzles that start lost, and the "down a queen, find the net" imbalance puzzles.

The verdict rules (5 and 9 win-percentage bands, mate speed) are the app's own; `tests/audit_logic.test.js` checks both agree on 20,000 random inputs.
Rated Lichess puzzles are deliberately not changed: their database holds only puzzles with a unique solution (other than alternative mates, which
the app already accepts), and Puzzle Elo depends on exact solving.


## Built-in mini-puzzle pool

    node make_pool.mjs > pool.json      # 16 candidates; the app embeds the first 14 (see POOL in src/v25/lc25.js)

Positions with EXACTLY ONE checkmating move (so no answer is ever ambiguous), both colours to move, a mix of mating patterns, verified with chess.js
and seeded so the result is reproducible. The app uses them when its own puzzle bank (`PUZZLE_BANK`, filled by the admin) is empty, which it is in the
published content: for the puzzle shown while Stockfish loads, and for the Penalty Box when the Lichess puzzle service cannot be reached.
