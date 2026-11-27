# THE ENDGAME BLUEPRINT
### From Zero to Grandmaster — Rules & Concepts

---

## COURSE ARCHITECTURE

| Tier | Level | Rating guide |
|---|---|---|
| 0 | Foundations | 0–800 |
| 1 | Speedcourse | ~800–1200 |
| 2 | Intermediate | ~1200–1600 |
| 3A | Advanced — Theoretical Endgames | ~1600–2000 |
| 3B | Advanced — Endgame Strategy | ~2000–2300 |
| 3C | Advanced — Grandmaster Deep Dives | 2300+ |

### Build principles

1. **Nothing is ever unlearned.** Every rule is scoped so it stays true at every level. Higher tiers add refinements (marked *Refines Rx.y*) — they never contradict a lower tier.
2. **Honest labels.** Every rule carries one tag:
   - **[LAW]** — FIDE Laws of Chess.
   - **[THEORY]** — an exact, verifiable result (tablebase-provable).
   - **[PRINCIPLE]** — a strong rule of thumb. Exceptions exist and are named where they matter.
3. **Experience-based upgrade triggers.** Move up when you can *do* the checklist at the end of a tier — not when you reach a rating.
4. **Teaching IDs.** R = Rule · C = Concept · P = Must-know position. Example: **R2.15** = Tier 2, Rule 15.
5. **Verification.** Every FEN was validated with python-chess. All 3–4-piece positions were checked against Syzygy tablebases; the 5+-piece positions were checked with Stockfish and match established theory. Paste any FEN into a board editor (ChessTempo, Lichess).
6. **Sourcing note.** This module is written from standard endgame theory, the FIDE Laws and tablebase data — not from project source books. Appendix D lists the reference works to cite per lesson.

---

# PART 0 — THE WINCONDITION FRAMEWORK
*The backbone of every tier.*

## 0.1 Definition

A **Wincondition** is a concrete mechanism that ends the game in your favour. The endgame has exactly two:

- **Mate Wincondition** — any checkmate attack or mating net.
- **Passer Wincondition** — any passed pawn: a pawn that no enemy pawn can stop on its own file or on the adjacent files. Its final form is promotion, which normally converts into a Mate Wincondition.

## 0.2 Everything else is a lever

Material, king activity, piece activity, space, weak pawns, zugzwang and the tempo count do not win by themselves. They are **levers**: tools to *create* a Wincondition, *execute* it, or *deny* the opponent's.

## 0.3 The five laws of the framework

- **Law 1 — No Wincondition, no win.** If neither side can create a Wincondition, the position is a draw, whatever the material count.
- **Law 2 — Material is not a Wincondition.** K+B vs K and K+N vs K are dead draws; K+2N vs K cannot force mate. In endings with only a minor piece against pawns, database statistics put the bishop at about 2½ pawns and the knight even lower — partly because the piece cannot win once its own last pawn disappears.
- **Law 3 — Guard the last pawn.** Playing for a win, keep at least one pawn: it is the raw material of your Passer Wincondition. Defending, trade pawns: every pawn trade deletes a potential Passer Wincondition.
- **Law 4 — Count both sides.** Your Wincondition only matters relative to your opponent's. Races are decided by tempi.
- **Law 5 — Every exchange changes the Wincondition balance.** Before trading, ask: does this trade speed up my Wincondition, or kill my opponent's?

## 0.4 The defender's mirror — Wincondition denial

1. **Blockade** — stop the Passer Wincondition on the square directly in front of it (king or knight ideal).
2. **Elimination** — trade the last pawns; give a piece for the last pawn when the remaining material cannot mate.
3. **Theoretical draw** — steer into a known drawn position (Philidor, wrong bishop, rook vs bishop).
4. **Fortress** — a setup the attacker cannot break.
5. **Stalemate.**
6. **Perpetual check or repetition.**
7. **Counter-Wincondition** — create your own Passer or Mate Wincondition so the attacker must stop and defend.

## 0.5 The Endgame Scan

Run it whenever the position changes character (an exchange, a pawn break, a new passed pawn):

1. **Inventory** — Which Winconditions exist for both sides: active, potential, none?
2. **Tempo** — Who executes first? Count moves to promotion or mate, including checks, captures and queening with check.
3. **Levers** — Which lever speeds up mine or slows down theirs?
4. **Transition test** — Can I trade into a known win? Can my opponent trade into a known draw?
5. **Decision** — Create · Execute · Deny · or Improve ("do not hurry").

## 0.6 The Conversion Ladder

Every won endgame is won in this order:

1. **Secure** — kill counterplay, protect loose pieces and pawns.
2. **Improve** — centralise the king, activate the worst piece, fix enemy weaknesses.
3. **Create** — produce a Passer Wincondition or a Mate Wincondition.
4. **Execute** — escort the Passer Wincondition or deliver mate, without allowing stalemate or perpetual check.

---

# TIER 0 — FOUNDATIONS (0–800)
**Mission:** know what wins, what draws, and how to finish.

## Rules

### The laws that decide endgames
- **R0.1 [LAW] Stalemate is a draw.** The side to move has no legal move and is not in check.
- **R0.2 [LAW] Dead position = immediate draw.** When neither side can checkmate by any series of legal moves — K vs K, K+B vs K, K+N vs K, K+B vs K+B with same-coloured bishops — the game ends drawn.
- **R0.3 [LAW] Repetition.** A draw can be claimed when the same position occurs for the third time (same player to move, same castling and en passant rights). The fifth occurrence ends the game automatically.
- **R0.4 [LAW] The 50-move rule.** 50 moves by each player without a capture or a pawn move: a draw can be claimed. 75 moves: automatic draw, unless the last move is checkmate. Online platforms use their own implementations.
- **R0.5 [LAW] Flag-fall.** Run out of time and you lose — unless your opponent has no possible way to checkmate you; then it is a draw.
- **R0.6 [LAW] Promotion.** A pawn reaching the last rank must become a queen, rook, bishop or knight of its own colour. The choice is free.

### Core principles
- **R0.7 [PRINCIPLE] Name the Wincondition before you plan.** Every winning plan ends in a Mate Wincondition or a Passer Wincondition.
- **R0.8 [PRINCIPLE] Activate the king.** Once the queens are gone, the king is a fighting piece. March it to the centre.
- **R0.9 [PRINCIPLE] Know the values.** Pawn 1 · knight 3 · bishop 3 · rook 5 · queen 9. An active endgame king fights roughly like a minor piece.
- **R0.10 [PRINCIPLE] Ahead → trade pieces, not pawns. Behind → trade pawns, not pieces.** (Framework Law 3.)
- **R0.11 [THEORY] In the basic mates (K+Q, K+R, K+2B, K+B+N vs K) the lone king is always mated on the edge.** Drive it there.
- **R0.12 [PRINCIPLE] The stalemate check.** In a winning position, before every move ask: "After my move, does my opponent still have a legal move?"
- **R0.13 [THEORY] Rule of the square — stopping a Passer Wincondition with the king.** Draw a square from the pawn to its promotion rank. If the defending king is inside it, or steps into it with the move, it catches the pawn (provided nothing blocks its path). A pawn on its starting square counts from one square further, because of the double step.
- **R0.14 [PRINCIPLE] King in front, pawn behind.** In K+P vs K, lead with the king; the pawn follows.
- **R0.15 [THEORY] The rook pawn is special.** K + rook pawn vs K is a draw once the defending king reaches the corner in front of the pawn.
- **R0.16 [PRINCIPLE] Push your Passer Wincondition when it is safe.** Every step forward ties down more enemy force.
- **R0.17 [PRINCIPLE] Blockade enemy Passer Winconditions** on the square directly in front of them.

## Concepts
- **C0.1 What is an endgame?** Not a fixed move number but a change of priorities: the kings become fighters, and pawns become the main source of Winconditions.
- **C0.2 The edge is a prison.** Mate Wincondition technique means shrinking the enemy king's space (the "box") until it stands on the edge.
- **C0.3 The basic mates — your first Mate Wincondition drills.**
  - **K+Q vs K** — shrink the box with the queen a knight's move away from the enemy king; when it reaches the edge, stop and bring your own king; mate with king support. At most 10 moves with best play.
  - **K+R vs K** — the rook cuts the board, the king approaches; when the kings face each other, check from the side to push the enemy king back; use rook waiting moves. At most 16 moves.
  - **K+2R (or K+Q+R) vs K** — the ladder: the heavy pieces alternate checks rank by rank. If the king attacks one of them, move it to the far end of its rank.
- **C0.4 Kings move diagonally as fast as straight.** A diagonal path is often the shortest route — the seed of the Réti manoeuvre (Tier 2).
- **C0.5 Passer Wincondition vocabulary.** Passed pawn · protected passer (defended by a pawn) · connected passers (adjacent files) · outside passer (far from the other pawns) · candidate (a pawn that can become a passer).
- **C0.6 Stalemate is the defender's friend.** A lone king heads for the corner and for "no-move" positions.

## Must-know positions
- **P0.1 — The stalemate trap** · `k7/8/1Q6/8/8/8/8/2K5 b - - 0 1`
  Black to move: stalemate. The queen, a knight's move from the cornered king, takes every square but gives no check.
- **P0.2 — The square** · `7k/8/8/8/1p3K2/8/8/8 w - - 0 1`
  White to move: 1.Ke3 enters the square and catches the pawn — draw. Black to move: 1...b3 and the Passer Wincondition promotes.
- **P0.3 — King first** · `8/8/4k3/8/4K3/8/4P3/8 w - - 0 1`
  White wins with either side to move: the king is already ahead of its pawn, and the e-pawn's spare moves win the opposition battle (Tier 1).
- **P0.4 — The rook-pawn corner** · `k7/8/1K6/P7/8/8/8/8 w - - 0 1`
  Draw with either side to move: the defending king owns the corner.

## Typical errors
- Stalemating with the queen a knight's move from the cornered king.
- Chasing the king with random checks instead of building the box.
- Leaving the king at home once the queens are off.
- Trading the last pawn while ahead in material.
- Pushing an unsupported pawn straight into the enemy king.

## Upgrade triggers → Tier 1
- You mate with K+Q vs K and K+R vs K against a computer from random positions, ten times in a row, without stalemate.
- You apply the rule of the square in seconds, including the double-step case.
- You can list every dead-position material combination.
- You can point out both Winconditions in your own games.

---

# TIER 1 — SPEEDCOURSE (~800–1200)
**Mission:** master king-and-pawn endings and meet the first theoretical rook positions.

## Rules

### King and pawn
- **R1.1 [THEORY] Opposition.** Kings on the same file, rank or diagonal with one square between them: the side *not* to move has the opposition. With three or five squares between them it is *distant* opposition — same logic.
- **R1.2 [THEORY] Key squares decide K+P vs K.** If the attacking king reaches a key square and the pawn cannot be captured, it wins — no matter who is to move.
  - Pawn on its 2nd–4th rank: the three squares two ranks in front of it.
  - Pawn on its 5th–6th rank: the three squares one rank in front **and** the three squares two ranks in front.
  - Rook pawn: only the two squares on the adjacent file that touch the promotion square (White a-pawn: b7 and b8).
- **R1.3 [THEORY] Shortcut.** With your pawn on the 4th or 5th rank (not a rook pawn), a king on the 6th rank — on the pawn's file or an adjacent file — always stands on a key square.
- **R1.4 [PRINCIPLE] Opposition is the tool; key squares are the goal.** Use the opposition to shoulder your way onto a key square.
- **R1.5 [PRINCIPLE] Defender: stay in front, retreat straight back.** In K vs K+P keep your king in front of the pawn; when pushed, step straight backward so you can retake the opposition.
- **R1.6 [THEORY] Spare pawn moves win the opposition.** A pawn that has not advanced far keeps tempo moves in reserve — use them to hand the move to the opponent.
- **R1.7 [THEORY] The rook-pawn trap.** *Refines R0.15.* K + rook pawn vs K is also drawn when the defending king controls the two key squares (b7 and b8 against a White a-pawn) — for example by locking the attacking king in front of its own pawn.
- **R1.8 [PRINCIPLE] The outside Passer Wincondition wins pawn endings.** Use it as a decoy: while the enemy king runs to stop it, your king invades on the other wing.
- **R1.9 [THEORY] A protected Passer Wincondition cannot be captured by the king alone.** As long as its protector stands, the enemy king stays tied to it.
- **R1.10 [PRINCIPLE] Separated Passer Winconditions overload a lone king.** Check each one with the rule of the square — often one of them promotes.
- **R1.11 [THEORY] Passer Wincondition races.** Count the moves to promotion for both sides. Then check the details: does a queen arrive with check, and can the first queen stop the second (by controlling its promotion square, or by skewering king and new queen)?

### Queen and minor pieces
- **R1.12 [THEORY] The wrong bishop.** Bishop + rook pawn vs king is a draw when the bishop does not control the promotion square and the defending king reaches the corner. Extra pawns on the same rook file change nothing.
- **R1.13 [THEORY] Queen vs pawn on the 7th, defending king beside it.** The queen wins against centre (d/e) and knight (b/g) pawns. Against bishop (c/f) and rook (a/h) pawns it is a draw by stalemate tricks — unless the attacking king is already close.
- **R1.14 [THEORY] Queen vs pawn — the method.** Check and pin until the defending king must step *in front of* its pawn. That buys one tempo for your king to approach. Repeat.
- **R1.15 [PRINCIPLE] Bishops stop Passer Winconditions from a distance; knights stop them best from directly in front** — and knights struggle against rook pawns.

### Rook endings — first theory
- **R1.16 [PRINCIPLE] Rooks belong behind Passer Winconditions** — behind your own (the rook pushes) and behind the enemy's (the rook attacks while the enemy rook stays stuck in front). *Tarrasch's rule.*
- **R1.17 [PRINCIPLE] Activity first.** An active rook is often worth a pawn. A rook passively guarding a pawn is a bad investment.
- **R1.18 [PRINCIPLE] Cut off the enemy king.** A king cut off from the Passer Wincondition by your rook is out of the game — the first step of almost every winning rook ending.
- **R1.19 [THEORY] Lucena position — WIN ("building a bridge").** Pawn on the 7th (not a rook pawn), attacking king on the promotion square, defending king cut off from the pawn. Method: check the defending king one file further away, lift your rook to the 4th rank, walk your king out, and block the last check with the rook.
- **R1.20 [THEORY] Philidor position — DRAW ("third-rank defence").** Defending king on the promotion square; defending rook on its own third rank, keeping the attacking king off the 6th. The moment the pawn advances to the 6th, swing the rook to the far end of the board and check from behind: the king has lost its shelter.
- **R1.21 [PRINCIPLE] Two connected Passer Winconditions on the 6th rank usually beat a lone rook** when both kings are far away — unless the rook can win one of them at once, with tempo.

### Conversion
- **R1.22 [PRINCIPLE] Trade into a pawn ending only after calculating it to the end.** Pawn endings are the most forcing and least forgiving endings: there, Winconditions are pure tempo arithmetic.
- **R1.23 [PRINCIPLE] The three steps of a material advantage.** Win the pawn → turn it into a Passer Wincondition → escort it home.

## Concepts
- **C1.1 Zugzwang** — the obligation to move becomes a disadvantage. It is the engine of every pawn ending.
- **C1.2 The opposition family** — direct, distant and diagonal: one parity idea at different distances.
- **C1.3 Key squares** — ask "where must my king stand?", not "which pawn move?"
- **C1.4 Spare tempi** — pawn moves held in reserve are the currency of pawn endings.
- **C1.5 Decoy** — an outside Passer Wincondition pulls the enemy king away from the real battlefield.
- **C1.6 Underpromotion** — a knight for a check or fork, a rook to avoid stalemate (P2.3).
- **C1.7 Cut-off geometry** — ranks and files are walls built by rooks.
- **C1.8 The bridge and the shield** — in Lucena the rook shields its own king from checks; in Philidor the rook guards the 6th rank, then checks from behind.

## Must-know positions
- **P1.1 — Opposition decides** · `4k3/8/3KP3/8/8/8/8/8 b - - 0 1`
  Black to move draws: 1...Kd8! 2.e7+ Ke8 3.Ke6 stalemate. White to move wins: 1.e7 Kf7 2.Kd7 and the pawn queens.
- **P1.2 — The outside Passer Wincondition as decoy** · `8/8/3k4/8/P2K2p1/6P1/8/8 w - - 0 1`
  White wins: 1.a5 Kc6 2.Ke5 Kb5 3.Kf4 Kxa5 4.Kxg4 — Black's king was dragged to a5 while White's king collected g4.
- **P1.3 — The wrong bishop** · `k7/8/PK6/8/8/4B3/8/8 b - - 0 1`
  Draw: the dark-squared bishop can never control a8.
- **P1.4 — Lucena** · `3K4/3P1k2/8/8/8/8/2r5/4R3 w - - 0 1`
  White wins: 1.Rf1+ Kg7 2.Rf4! Rc1 3.Ke7 Re1+ 4.Kd6 Rd1+ 5.Ke6 Re1+ 6.Kd5 Rd1+ 7.Rd4 — the bridge.
- **P1.5 — Philidor** · `4k3/R7/7r/3KP3/8/8/8/8 w - - 0 1`
  Draw: 1.e6 Rh1! 2.Kd6 Rd1+ 3.Ke5 Re1+ — checks from behind, forever.

## Typical errors
- Pushing the pawn early and losing the opposition.
- Defending K vs K+P from the side instead of in front.
- Philidor: dropping the rook to the back rank before the pawn reaches the 6th, letting the attacking king in.
- Lucena: skipping the bridge and walking into endless checks.
- Queen vs c/f/a/h pawn: capturing the pawn when it gives stalemate.

## Upgrade triggers → Tier 2
- You win every won K+P vs K position and hold every drawn one against an engine.
- You play Lucena and Philidor from memory — from both sides.
- You win five different pawn endings with an outside Passer Wincondition against a computer.
- You can explain why the wrong bishop draws.

---

# TIER 2 — INTERMEDIATE (~1200–1600)
**Mission:** control tempo, value activity, and start thinking strategically.

## Rules

### Pawn endings — tempo and geometry
- **R2.1 [THEORY] Triangulation.** If the position is won with the *opponent* to move, and your king can use three squares while the enemy king has only two useful ones, walk the triangle to lose a tempo.
- **R2.2 [THEORY] A knight cannot lose a tempo.** It changes square colour on every move, so it can never return to the same square in an odd number of moves. Kings, bishops, rooks and queens can.
- **R2.3 [THEORY] Distant and diagonal opposition** follow the same parity logic — take them early to win the race to the key squares.
- **R2.4 [PRINCIPLE] Shouldering.** Use your king's body to block the enemy king's route. Often stronger than approaching directly.
- **R2.5 [THEORY] The Réti manoeuvre.** A king moving diagonally can chase two goals at once — hunting an enemy Passer Wincondition while supporting its own. Count diagonal routes before you give up a race.
- **R2.6 [THEORY] The breakthrough.** Three pawns on the 5th facing three on the 7th, kings far away: a pawn sacrifice creates a Passer Wincondition by force.
- **R2.7 [PRINCIPLE] The candidate moves first.** In a pawn majority, advance the pawn with no enemy pawn in front of it — your future Passer Wincondition. The others support it.
- **R2.8 [PRINCIPLE] Healthy majorities create Passer Winconditions; crippled (doubled) majorities often cannot.**
- **R2.9 [PRINCIPLE] Reserve tempi decide blocked pawn endings.** Count spare pawn moves on both sides before the kings reach zugzwang. Doubled pawns can be a hidden source of tempi.
- **R2.10 [PRINCIPLE] The more active king usually decides the pawn ending.**
- **R2.11 [PRINCIPLE] Rook pawns are the most drawish pawns** in pawn, bishop and rook endings, and against a queen on the 7th. Against a knight they are the most dangerous.

### Rook endings — the practical core
- **R2.12 [PRINCIPLE] The rook on the 7th rank** attacks pawns from the side and cages the enemy king on the back rank.
- **R2.13 [PRINCIPLE] Down a pawn? Activate before you defend.** Give a second pawn if needed to activate rook and king. Passive defence usually loses slowly.
- **R2.14 [THEORY] Short side, long side.** The defending king goes to the short side of the pawn (fewer files); the defending rook goes to the long side to check from the flank.
- **R2.15 [THEORY] Checking distance.** Flank checks normally need three empty files between the checking rook and the pawn (sometimes two with the pawn on the 7th). Any closer, and the attacking king simply walks up to the rook.
- **R2.16 [THEORY] Passive back-rank defence holds only against knight and rook pawns.** *Refines R1.20.* Against bishop and centre pawns it loses once the attacking king reaches the 6th rank on the short side of its pawn: the pawn shields the king from flank checks and the back rank collapses. Use Philidor's defence while you still can.
- **R2.17 [PRINCIPLE] 3 vs 2 and 4 vs 3 on the same wing are usually drawn in rook endings.** An extra pawn wins far more often when it is a distant Passer Wincondition.
- **R2.18 [PRINCIPLE] "All rook endings are drawn."** Tartakower's quip is a warning, not a law. Rook endings are the most common endgame type and among the most drawish: a pawn up is not yet a win.

### Minor pieces
- **R2.19 [PRINCIPLE] Good bishop, bad bishop.** A bishop is bad when its own pawns are fixed on its colour. Put your pawns on the opposite colour of your bishop; fix enemy pawns on the colour of *your* bishop so you can attack them.
- **R2.20 [PRINCIPLE] Bishop vs knight.** Bishops prefer open positions and pawns on both wings; knights prefer closed positions, outposts and all pawns on one wing.
- **R2.21 [PRINCIPLE] Knight endings behave like pawn endings** (Botvinnik). The outside Passer Wincondition and king activity are even more decisive than usual.
- **R2.22 [PRINCIPLE] Opposite-coloured bishops, bishops only:** an extra pawn is usually a draw — often two extra pawns as well. The defender places his pawns on his bishop's colour and blockades on that colour.
- **R2.23 [PRINCIPLE] Opposite-coloured bishops with rooks or queens favour the attacking side.** The defending bishop cannot help on the other colour complex, so the Mate Wincondition grows stronger.
- **R2.24 [THEORY] Rook vs minor piece without pawns is generally a draw.** With a bishop, the defending king runs to the corner *not* of the bishop's colour — there the bishop can block checks. With a knight, keep the knight next to your king and avoid corners.
- **R2.25 [PRINCIPLE] Blockade with the right piece.** The knight is the ideal blockader of a Passer Wincondition — it stays active on the blockade square. In endings, so is the king.

### Strategy begins
- **R2.26 [PRINCIPLE] The principle of two weaknesses.** One weakness can be defended. Create a second one on the other wing and switch between them until the defence breaks.
- **R2.27 [PRINCIPLE] Do not hurry.** If the opponent has no counterplay, improve every piece first. The decisive break comes when everything is ready.
- **R2.28 [PRINCIPLE] The pawn-ending test.** Before trading into a pawn ending, remove all pieces in your head and ask who wins. Winning → trade. Not winning → keep pieces.

## Concepts
- **C2.1 Tempo economy** — pawn endings are arithmetic: moves to promote, spare moves, king steps.
- **C2.2 Two-goal geometry** — the diagonal is as short as the straight line (Réti).
- **C2.3 Activity as material** — an active rook or king often outweighs a pawn.
- **C2.4 Colour complexes** — a bishop fights for one colour; pawns and the king must cover the other.
- **C2.5 Blockade** — the main Wincondition-denial tool in minor-piece endings.
- **C2.6 Weakness targeting** — fix the pawn, attack it with more pieces than can defend it, then add a second target.
- **C2.7 The Mate Wincondition in rook endings** — a king cut off on the back rank, plus an active rook and king, can produce mating nets even with many pawns left.

## Must-know positions
- **P2.1 — The breakthrough** · `6k1/ppp5/8/PPP5/8/8/8/6K1 w - - 0 1`
  White to move wins: 1.b6! axb6 (1...cxb6 2.a6! bxa6 3.c6) 2.c6! bxc6 3.a6 and the a-pawn queens. With Black to move, Black's king arrives in time and the breakthrough fails — count the tempi.
- **P2.2 — Réti** · `7K/8/k1P5/7p/8/8/8/8 w - - 0 1`
  Draw: 1.Kg7 h4 2.Kf6 Kb6 (2...h3 3.Ke7 h2 4.c7 — both pawns queen) 3.Ke5! Kxc6 4.Kf4 — one king walk supported the c-pawn and then caught the h-pawn.
- **P2.3 — Saavedra** · `8/8/1KP5/3r4/8/8/8/k7 w - - 0 1`
  White wins: 1.c7 Rd6+ 2.Kb5 Rd5+ 3.Kb4 Rd4+ 4.Kb3 Rd3+ 5.Kc2 Rd4! 6.c8=R! (6.c8=Q? Rc4+ 7.Qxc4 stalemate) Ra4 7.Kb3 — Rc1 mate and Kxa4 are both threatened.
- **P2.4 — Rook vs bishop: the corner decides**
  - `7k/8/6K1/3b4/8/8/8/R7 w - - 0 1` — Draw: the king sits in the corner *not* of its bishop's colour, so a check on the 8th rank is blocked on g8.
  - `k7/8/1K6/3b4/8/8/8/7R w - - 0 1` — White wins: 1.Rh8+ Bg8 2.Rxg8 mate. Same material, wrong corner.

## Typical errors
- Entering a rook ending a pawn up and treating it as won (R2.18).
- Waiting passively on the back rank against a centre pawn (R2.16).
- Checking from the flank with the rook too close to the pawn (R2.15).
- Fixing your own pawns on your bishop's colour.
- Trading the last rooks without the pawn-ending test (R2.28).
- Attacking one weakness forever instead of creating a second.

## Upgrade triggers → Tier 3A
- You solve triangulation and breakthrough exercises by visualisation only.
- You hold a rook ending a pawn down through activity against a stronger opponent or an engine.
- You win a bishop-vs-knight ending with pawns on both wings.
- You can explain why opposite-coloured bishops are drawish on their own and dangerous with rooks.

---

# TIER 3 — ADVANCED (1600–GM)

# TIER 3A — THEORETICAL ENDGAMES (~1600–2000)
**Mission:** know the anchor positions cold — the targets you steer toward or away from.

## Rules

### Pawn endings — high theory
- **R3A.1 [THEORY] Corresponding squares.** Opposition is a special case of a larger system: every square of the attacking king has a matching square for the defending king. Find the key squares first, then map the correspondence backwards.
- **R3A.2 [THEORY] Mined squares (mutual zugzwang).** Some squares are mines — whoever steps on them first loses. Approach them only with the move in hand.
- **R3A.3 [PRINCIPLE] Outside vs protected Passer Winconditions.** Calculate, don't quote slogans: compare how long the outside passer distracts the enemy king with how long the protected passer ties it down.
- **R3A.4 [PRINCIPLE] A queening race is only half the calculation.** After both sides queen, check immediate checks, skewers and queen-vs-pawn-on-the-7th scenarios (R1.13).

### Rook endings — the canon
- **R3A.5 [PRINCIPLE] The Rule of Five.** Pawn protected, defending king cut off by files: add the pawn's rank to the number of files the defending king is cut off. More than five: usually a win. Five or less: normally a draw. Knight and rook pawns are exceptions.
- **R3A.6 [THEORY] Against a pawn on the 7th, only flank checks work; against a pawn on the 6th, checks from behind work too** — the Philidor mechanism.
- **R3A.7 [THEORY] Vančura position — DRAW.** Rook pawn on the 6th with the attacking rook in front of it: the defending rook attacks the pawn *from the side* along the 6th rank, and the defending king shuttles between g7 and h7 (against an a-pawn). Meet the approaching king with checks from the side, keeping your distance; if the pawn advances to the 7th, put the rook behind it (R3A.8).
- **R3A.8 [THEORY] The g7/h7 rule.** Rook pawn on the 7th, attacking rook in front (Ra8, Pa7), defending rook behind the pawn: a draw with the defending king on g7 or h7. Anywhere else, a rook check or skewer usually forces the pawn through (e.g., Rh8! Rxa7, Rh7+).
- **R3A.9 [PRINCIPLE] Rook + two pawns vs rook usually wins** — connected pawns most easily. The notorious exception is f- and h-pawns: often a theoretical draw with an excellent defence, yet regularly lost in practice.
- **R3A.10 [PRINCIPLE] Rook vs connected Passer Winconditions.** *Refines R1.21.* The rook attacks from behind and the rook side's king must come fast; the pawns win when they reach the 6th with tempo and the rook cannot pick one of them off.

### Queen endings
- **R3A.11 [THEORY] The winning zone.** *Refines R1.13.* Against bishop and rook pawns on the 7th, the queen still wins when the attacking king is close enough to create a Mate Wincondition or to support the capture.
- **R3A.12 [THEORY] Queen vs rook is a win** (barring immediate tactics). Drive the king to the edge, then separate rook and king by zugzwang — the queen can pass the move with a triangle of checks (P3A.4) — and finish with a fork or mate.
- **R3A.13 [THEORY] Queen vs rook + pawn can be a fortress.** A rook on its third rank, protected by a pawn on its second rank next to its king, often cannot be broken.
- **R3A.14 [PRINCIPLE] In queen endings the Passer Wincondition outranks material.** A far-advanced passer escorted by the queen beats one or two extra pawns elsewhere.
- **R3A.15 [PRINCIPLE] Perpetual check is the defender's main denial tool.** The attacker centralises the queen, uses pawns as shelter, and answers checks with **cross-checks** — blocking a check while giving check.

### Minor pieces — theory and technique
- **R3A.16 [THEORY] K+B+N vs K is a forced mate** in at most 33 moves: drive the king to a corner of the bishop's colour. Learn the knight's W-manoeuvre (or Delétang's triangle method).
- **R3A.17 [THEORY] K+2B vs K** is mate in at most 19 moves. Side-by-side bishops build a wall, the king approaches, and mate can be given in any corner.
- **R3A.18 [THEORY] K+2N vs K cannot be forced — but K+2N vs K+P often can.** The knights generally win when the pawn is securely blockaded by a knight on or behind the **Troitzky line** — Black pawns: a4, b6, c5, d4, e4, f5, g6, h4 (White pawns, mirrored: a5, b3, c4, d5, e5, f4, g3, h5). Some of these wins take more than 50 moves.
- **R3A.19 [THEORY] Two bishops vs knight (no pawns) is generally a win** — tablebases overturned the old drawing verdict — but some wins exceed the 50-move limit.
- **R3A.20 [PRINCIPLE] Knight vs rook pawn on the 7th.** The knight holds only if it controls the promotion square or reaches it in time. Rook pawns are the knight's nightmare.
- **R3A.21 [THEORY] Rook + bishop vs rook is generally a theoretical draw — but hard to defend.** Winning positions: Philidor's and Lolli's. Drawing methods: the Cochrane defence (pin the bishop to its king, away from the edge) and the second-rank defence.
- **R3A.22 [THEORY] Rook + knight vs rook is a draw** and much easier to hold.
- **R3A.23 [THEORY] Queen vs two bishops: the queen wins most positions**, but it can take up to 71 moves — the 50-move rule can rescue the defender. **Queen vs two knights: the queen wins many positions, but the knights hold a large share of draws.**
- **R3A.24 [PRINCIPLE] Bishop + pawn vs same-coloured bishop.** A draw if the defending king gets in front of the pawn on a square the attacking bishop cannot attack. Otherwise the result depends on whether the defending bishop keeps a diagonal across the pawn's path that the attacker cannot cut.
- **R3A.25 [PRINCIPLE] Knight + pawn vs knight is usually a draw with the defending king in front** — and the defending knight can often give itself up for the last pawn, since K+N vs K is a dead position.

## Concepts
- **C3A.1 Anchor positions** — theory is a map of targets, not a list of moves. Steer toward winning anchors (Lucena, queen vs rook, B+N mate) and away from drawn ones (Philidor, Vančura, wrong bishop).
- **C3A.2 Zones** — many endings are decided by *where* the defending king stands: the queen's winning zone, the Troitzky line, the Rule of Five, g7/h7 in rook-pawn endings.
- **C3A.3 Fortress (introduction)** — a static setup the attacker cannot break: wrong bishop, opposite-bishop blockade, queen vs rook + pawn.
- **C3A.4 Stalemate architecture** — stalemate as a designed defence: queen vs c/f/a/h pawns, desperado rooks, the wrong-bishop corner.
- **C3A.5 Cross-check** — blocking a check with a check; the attacker's weapon against perpetual.
- **C3A.6 The 50-move horizon** — several theoretical wins (2B vs N, 2N vs P, Q vs 2B) collide with the 50-move rule. Theory and practice can give different results.

## Must-know positions
- **P3A.1 — Vančura** · `R7/6k1/P4r2/8/2K5/8/8/8 w - - 0 1`
  Draw: Black's rook stays on the 6th, hitting a6 from the side; the king shuttles g7–h7; an approaching White king is met by checks from the side. If 1.a7, then 1...Ra6 — rook behind the pawn, king on g7.
- **P3A.2 — Queen vs bishop pawn** · `7K/8/6Q1/8/8/8/1kp5/8 w - - 0 1`
  Draw: 1.Qb6+ Ka1! 2.Qd4+ Kb1 3.Qb4+ Ka1 4.Qc3+ Kb1 5.Qb3+ Ka1! — 6.Qxc2 is stalemate, and White's king is too far away to help.
  Contrast (same setup): the centre pawn `7K/8/7Q/8/8/8/2kp4/8 w - - 0 1` and the knight pawn `7K/8/6Q1/8/8/8/kp6/8 w - - 0 1` are White wins; the rook pawn `7K/8/6Q1/8/8/8/pk6/8 w - - 0 1` is a draw.
- **P3A.3 — The g7/h7 rule**
  - `R7/P5k1/8/8/8/8/r7/6K1 w - - 0 1` — Draw: the king stands on g7.
  - `R7/P4k2/8/8/8/8/r7/6K1 w - - 0 1` — White wins: 1.Rh8! (1...Rxa7 2.Rh7+ and 3.Rxa7).
- **P3A.4 — Queen vs rook: the zugzwang triangle** · `1k6/1r6/2K5/Q7/8/8/8/8 w - - 0 1`
  White wins. With Black to move this is zugzwang: the rook must leave its king. With White to move, pass the move: 1.Qe5+ Ka8 2.Qa1+ Kb8 3.Qa5 — same position, Black to move.

## Typical errors
- Assuming every rook-pawn ending is drawn — the defending king must reach g7/h7 (R3A.8).
- Starting flank checks too close to the pawn (R2.15).
- B+N mate: pushing the king to the wrong corner and never switching.
- Taking the bishop pawn with the queen when it is stalemate (P3A.2).
- Allowing a queen vs rook + pawn fortress when pieces could have been kept.
- Forgetting the 50-move count in 2B vs N, 2N vs P and Q vs 2B.

## Upgrade triggers → Tier 3B
- You mate with K+B+N vs K well inside 50 moves under blitz conditions.
- You win Lucena and hold Philidor and Vančura against an engine from random starts.
- You recite the Troitzky line and the queen-vs-pawn rule without notes.
- You survive 50 moves of R vs R+B against an engine with the Cochrane defence.

---

# TIER 3B — ENDGAME STRATEGY (~2000–2300)
**Mission:** think like a master — plans, exchanges and transformations instead of isolated positions.

## Rules

### Planning
- **R3B.1 [PRINCIPLE] Schematic thinking.** Before calculating, picture the ideal setup — where every piece and the king belong — and the route there. Calculate only where the opponent can interfere.
- **R3B.2 [PRINCIPLE] Prophylaxis first.** Ask what your opponent wants: usually an active rook, a Passer Wincondition or a known draw. Stop that before pursuing your own plan.
- **R3B.3 [PRINCIPLE] Improve the worst piece.** In slow endings, the side whose worst piece is better usually wins.
- **R3B.4 [PRINCIPLE] Restrict before you attack.** Take squares away from the enemy king and pieces first; Winconditions become unstoppable once the defender is paralysed.

### The art of exchanging
- **R3B.5 [PRINCIPLE] Trade the defender's best piece; keep your best attacker.**
- **R3B.6 [PRINCIPLE] Convert into the endgame type that magnifies your advantage.** An extra pawn converts most reliably in pawn and minor-piece endings (except opposite-coloured bishops), least reliably in rook and opposite-bishop endings. See Appendix B.
- **R3B.7 [PRINCIPLE] Know what each exchange does.** It removes a defender against your Passer Wincondition, removes an attacker from the opponent's Mate Wincondition, or changes the endgame type. Name which one before you trade.
- **R3B.8 [PRINCIPLE] The defender trades pawns and chooses the drawing material** — rook endings, opposite-coloured bishops, the wrong bishop, the queen vs rook + pawn fortress.
- **R3B.9 [PRINCIPLE] Material by the numbers (Kaufman's database findings).** An unpaired bishop and a knight are equal on average — the position decides. The bishop pair is worth about half a pawn. With six or more pawns each the knight is marginally better, with four or fewer the bishop; rooks gain value as pawns disappear.
- **R3B.10 [PRINCIPLE] Up the exchange?** Keep pawns on both wings and avoid structures where the minor piece and pawns can build a fortress. Returning the exchange at the right moment is often the cleanest win.

### Transformations
- **R3B.11 [PRINCIPLE] Turn static advantages into dynamic ones at the right moment** — return material to activate your king or rook, or to create an unstoppable Passer Wincondition.
- **R3B.12 [PRINCIPLE] Sacrifice a pawn to create a second Wincondition.** Two threats — a Passer Wincondition on one wing, a king invasion or Mate Wincondition on the other — break defences that hold against one.
- **R3B.13 [PRINCIPLE] Advance your Passer Winconditions when it gains space or ties the opponent down; blockade the opponent's before they gain momentum.**

### Pawn structure in the endgame
- **R3B.14 [PRINCIPLE] Structural weaknesses grow as pieces disappear.** Isolated, doubled and backward pawns are defended by pieces; every exchange removes a defender.
- **R3B.15 [PRINCIPLE] Majorities matter more as material decreases.** With both kings on one wing, a majority on the other wing produces an outside Passer Wincondition.
- **R3B.16 [PRINCIPLE] Fix, then attack.** Fix enemy pawns on squares your pieces can hit, then bring the king.
- **R3B.17 [PRINCIPLE] Create an entry square.** Kings win endings by invasion — use a pawn lever to open a door.

### The king: fighter and target
- **R3B.18 [PRINCIPLE] The king-safety paradox.** With queens or two rooks each on the board, activity and safety compete: the Mate Wincondition is still alive. Activate the king only where enemy heavy pieces cannot build a mating net.
- **R3B.19 [PRINCIPLE] Pawns are an umbrella.** A king beside or in front of its pawns is shielded from checks along those lines.

### Master-level technique by material
- **R3B.20 [PRINCIPLE] Tarrasch's rule serves activity, not the other way round.** *Refines R1.16.* If a rook in front of or beside a passed pawn is more active — cutting off the king, attacking pawns — activity wins the argument.
- **R3B.21 [PRINCIPLE] In rook endings, counterplay beats passive material defence.** The side that creates a Passer Wincondition first often wins even while behind in pawns.
- **R3B.22 [PRINCIPLE] Knight vs bad bishop is a Wincondition generator.** Fix pawns on the bishop's colour, occupy the key squares with the king, and use zugzwang.
- **R3B.23 [PRINCIPLE] Bishop vs knight with pawns on both wings.** Create a Passer Wincondition on one wing to deflect the knight, then invade on the other.
- **R3B.24 [PRINCIPLE] Opposite-coloured bishops — the winning recipe.** *Refines R2.22.* You need two Passer Winconditions far apart. With one file between them it is usually a draw; the wider the gap the better, and three or more files apart normally wins. Connected passers need to reach the 6th rank. Beware the wrong rook pawn.
- **R3B.25 [PRINCIPLE] Queen vs two rooks.** Rooks are strong when they protect each other; the queen wins with forks against loose rooks and with attacks on weak pawns and the king.

### Practical
- **R3B.26 [PRINCIPLE] Clock economy.** In long endings play the obvious improving moves quickly; spend your time at transitions — exchanges, pawn breaks, entering theoretical positions.
- **R3B.27 [LAW] Count the 50 moves yourself** in long defences (R+B vs R, Q vs 2B): every capture or pawn move resets the count.

## Concepts
- **C3B.1 Advantage transformation** — material ↔ activity ↔ structure ↔ Winconditions.
- **C3B.2 Domination** — controlling every square an enemy piece could use.
- **C3B.3 Two weaknesses, deep version** — the second weakness can be a Mate Wincondition threat rather than a pawn.
- **C3B.4 Harmony** — pieces protecting each other and the king, so that no tactic interrupts the plan.
- **C3B.5 Structure-born endgames** — what middlegame structures leave behind:
  - **Isolated queen's pawn** — its dynamism fades with every exchange; the pawn becomes a target and the square in front of it a permanent blockade post.
  - **Hanging pawns** — dynamic with pieces on the board; targets that need constant protection without them.
  - **Carlsbad (minority attack)** — the minority attack leaves a weak pawn (usually on c6 or c3) that becomes the main endgame target.
  - **…c6 structures after …dxe4 (Caro-Kann main lines)** — White has a 4 vs 3 majority on the queenside (a–d vs a–c), Black on the kingside (e–h vs f–h). With both kings castled short, the queenside majority is the one that produces the outside Passer Wincondition.
  - **Doubled pawns** — a crippled majority may never create a Passer Wincondition, but the extra pawn controls squares and supplies spare tempi.
  - **Space advantage** — worth less as pieces come off; the cramped side usually welcomes exchanges.

## Typical errors
- Trading pieces automatically when ahead — straight into a rook or opposite-bishop ending.
- Pushing pawns into the defender's zone before the king is ready (hurrying).
- Activating the king while enemy heavy pieces can still build a Mate Wincondition.
- Defending one weakness passively instead of creating counterplay.
- Planning without asking what the opponent wants.

## Upgrade triggers → Tier 3C
- In your own games you can name the exchange that changed the Wincondition balance, and why.
- You convert slightly better endings with no extra material against strong opposition.
- You annotate a master endgame without an engine, and your plans match the engine's key decisions.

---

# TIER 3C — GRANDMASTER DEEP DIVES (2300+)
**Mission:** the invisible layer — fortresses, geometry, maximal technique and practical dominance.

## Rules

### Fortress and anti-fortress
- **R3C.1 [PRINCIPLE] Test for fortresses before you simplify.** At every major exchange ask: "Afterwards, can the defender build a setup I cannot break?" If yes, change the structure first — then trade.
- **R3C.2 [PRINCIPLE] Fortress warning signs.** The defender has safe waiting moves; your king has no entry square; the blockaders cannot be attacked by enough pieces; your pawns are fixed on the wrong colour.
- **R3C.3 [PRINCIPLE] The anti-fortress toolkit.** Zugzwang (remove the waiting moves) · pawn breaks and sacrifices that open entry lines · changing the colour complex of the pawns · exchanging the key defender · returning material to reach a known win · a second Wincondition on the other wing.
- **R3C.4 [PRINCIPLE] Engines can misjudge fortresses.** A large evaluation with no visible progress over long lines is a fortress alarm. Check with tablebases (up to 7 pieces) or search for a concrete break yourself.

### Geometry and tempo
- **R3C.5 [PRINCIPLE] Think in routes, not moves.** King routes that serve two purposes, rook switches with tempo, queen checks that also centralise.
- **R3C.6 [PRINCIPLE] Tempo parity is global.** In complex endings, count the spare tempi of the whole board — pawn moves, bishop and rook waiting moves. The last spare tempo wins the mutual zugzwang.
- **R3C.7 [PRINCIPLE] Design zugzwangs against knights.** *Refines R2.2.* A knight cannot lose a tempo: aim for positions where the opponent's only free piece is a knight, or where every other waiting move is gone.
- **R3C.8 [PRINCIPLE] Domination wins minor pieces.** Take away every square of a knight or bishop until it is lost or permanently tied down.

### Wincondition interplay
- **R3C.9 [PRINCIPLE] The switch.** The strongest technique combines both Winconditions: a Passer Wincondition that drags defenders to passive squares, then a Mate Wincondition against the stripped king — or mating threats that force the defender to let a passed pawn through.
- **R3C.10 [PRINCIPLE] Spend the Passer Wincondition at the right moment.** It can be worth more as a decoy than as a queen: its sacrifice deflects a defender, opens a line, or gains the decisive king tempo.
- **R3C.11 [PRINCIPLE] Defend with a counter-Wincondition.** At the top level the best defence is often a race, not a blockade: create your own Passer or Mate Wincondition and make the attacker spend tempi.

### Rook endings — the grandmaster layer
- **R3C.12 [PRINCIPLE] Activity can outweigh two pawns.** When your rook is the most active piece on the board and your king escorts a Passer Wincondition, material counts less than tempo.
- **R3C.13 [PRINCIPLE] The activity triangle** (teaching model): active rook + active king + Passer Wincondition. The side that completes its triangle first usually wins; defend by breaking one side of the opponent's triangle.
- **R3C.14 [THEORY] Know the drawing zones exactly** — Philidor, Vančura, flank checks with enough distance, the Rule of Five, the g7/h7 rule — so you can calculate transitions into R+P vs R long before they happen.

### Queen and heavy-piece endings
- **R3C.15 [PRINCIPLE] Queen endings are races of Passer Winconditions and checks.** The attacking king walks toward its passed pawn or toward the enemy king, where checks can be blocked with cross-checks.
- **R3C.16 [PRINCIPLE] Trust the position, not the piece myth.** Capablanca's claims that queen + knight beats queen + bishop, and rook + bishop beats rook + knight, hold only by small statistical margins (Kaufman). King safety, colour complexes and Passer Winconditions decide.

### Practical grandmaster technique
- **R3C.17 [PRINCIPLE] Maximum problems, minimum risk.** In equal or slightly better endings, choose lines that demand accurate moves from the opponent for a long time while you keep zero losing risk.
- **R3C.18 [PRINCIPLE] Repeat once to gain time — never three times.** A single repetition banks clock time and tests whether the defender knows the right waiting moves.
- **R3C.19 [LAW] The flag-fall nuance.** *Refines R0.5.* You lose on time if your opponent could checkmate you by *any* series of legal moves — even a helpmate. So K+N or K+B against your K+P can still win on time; against your bare king they cannot.
- **R3C.20 [PRINCIPLE] Tablebase literacy.** Learn WDL (win/draw/loss), DTZ (distance to the next capture or pawn move that resets the 50-move count) and DTM (distance to mate). All positions with up to 7 pieces are solved and partial 8-piece work is ongoing — expect published "rules" to keep being refined.
- **R3C.21 [PRINCIPLE] A win beyond 50 moves is not a practical win.** Choose winning methods a human can execute inside the 50-move horizon.
- **R3C.22 [PRINCIPLE] Know the endgames your openings produce.** Every repertoire has typical structures; steer the middlegame toward endings where your structure's Winconditions are healthier.
- **R3C.23 [PRINCIPLE] Calculate backwards from the anchor.** Identify the target theoretical position first, then find the move order that reaches it with the right side to move.
- **R3C.24 [PRINCIPLE] Build a personal anchor library** — 100–150 positions you can play perfectly from both sides, grouped by material and structure, reviewed with spaced repetition.

## Concepts
- **C3C.1 Static vs dynamic fortresses** — static: the attacker has no entry at all; dynamic: the defender holds only with exact waiting moves or perpetual threats.
- **C3C.2 Global zugzwang** — zugzwang as a whole-board resource, not a king-and-pawn trick.
- **C3C.3 The Wincondition switch** — alternating Passer and Mate Winconditions until one defence cracks.
- **C3C.4 Practical probability** — choosing lines by how hard they are for the opponent, not only by their evaluation.
- **C3C.5 Model technique** — Capablanca (simplification), Rubinstein (rook endings), Smyslov (harmony), Karpov (restriction and domination), Fischer (bishop vs knight), Carlsen (pressure in equal endings).

## Typical errors
- Simplifying straight into a fortress.
- Trusting engine numbers in blocked positions.
- Winning too slowly and running into the 50-move rule.
- Applying theory without its exceptions: knight pawns in the Rule of Five, the wrong rook pawn in opposite-bishop endings, the king's square in rook-pawn endings.

## Grandmaster standard
- You explain any endgame result through its Winconditions and denial mechanisms.
- You steer ten to twenty moves ahead into anchor positions.
- You win "equal" endings against masters and hold worse ones against stronger players.

---

# APPENDIX A — THEORETICAL RESULTS AT A GLANCE
"Generally" means exceptions exist in specific positions. Move counts assume best play.

### Mate Wincondition — the basic mates
- **K+Q vs K** — win, at most 10 moves
- **K+R vs K** — win, at most 16 moves
- **K+2B vs K** (opposite colours) — win, at most 19 moves
- **K+B+N vs K** — win, at most 33 moves
- **K+2N vs K** — no forced mate
- **K+B vs K · K+N vs K** — dead position

### Pawnless endings
- **Q vs R** — generally a win
- **Q vs 2B** — generally a win (up to 71 moves)
- **Q vs 2N** — many wins, but a large share of draws
- **R vs B** — generally a draw (defending king to the corner not of its bishop's colour)
- **R vs N** — generally a draw (knight next to its king, away from corners)
- **R+B vs R** — generally a draw (Philidor and Lolli positions win; Cochrane and second-rank defences hold)
- **R+N vs R** — generally a draw
- **2B vs N** — generally a win (some wins exceed 50 moves)

### Passer Wincondition endings
- **K+P vs K** — decided by key squares
- **K + rook pawn vs K** — draw once the defender reaches the corner or traps the attacking king
- **K+B + wrong rook pawn vs K** — draw once the defending king reaches the corner
- **Q vs pawn on the 7th** — win vs b/d/e/g pawns; vs a/c/f/h pawns a draw unless the attacking king is close
- **R+P vs R** — Lucena wins; Philidor and Vančura draw; the Rule of Five as a guide
- **R+2P vs R** — usually a win (f+h notoriously drawish)
- **2N vs P** — generally a win when blockaded on or behind the Troitzky line (sometimes beyond 50 moves)
- **Q vs R+P** — fortress draws exist
- **Opposite-coloured bishops** — +1 usually drawn; +2 depends on the distance between the passed pawns

---

# APPENDIX B — THE EXTRA PAWN: CONVERSION LADDER [PRINCIPLE]
From easiest to hardest in typical positions. Structure and activity can overturn the order.

1. **Pawn endings** — usually winning.
2. **Knight endings** — usually winning.
3. **Same-coloured bishop endings** — often winning; harder if your pawns sit on your bishop's colour.
4. **Queen endings** — real winning chances, but perpetual check is always lurking.
5. **Rook endings** — often drawn.
6. **Opposite-coloured bishop endings** — usually drawn.

---

# APPENDIX C — GLOSSARY
- **Wincondition** — a concrete mechanism that ends the game in your favour: the Mate Wincondition or the Passer Wincondition.
- **Mate Wincondition** — any checkmate attack or mating net.
- **Passer Wincondition** — any passed pawn heading for promotion.
- **Lever** — an advantage that is not itself a Wincondition: material, activity, space, weaknesses, zugzwang.
- **Candidate** — a pawn that can become a passed pawn.
- **Outside passer** — a passed pawn far from the other pawns and the kings.
- **Protected passer** — a passed pawn defended by a pawn.
- **Opposition** — kings facing each other with an odd number of squares between them; the side not to move has it.
- **Key squares** — squares that win for the attacking king, whoever is to move.
- **Corresponding squares** — matching pairs of squares for the two kings.
- **Mined squares** — mutual-zugzwang squares; whoever steps on them first loses.
- **Triangulation** — losing a tempo with a three-square king route.
- **Zugzwang** — having to move is a disadvantage; *mutual* when it applies to both sides.
- **Shouldering** — blocking the enemy king's path with your own king.
- **Breakthrough** — a pawn sacrifice that creates a passed pawn by force.
- **Blockade** — a piece stopping a passed pawn on the square in front of it.
- **Fortress** — a defensive setup the attacker cannot break.
- **Cut-off** — a rook separating the enemy king from the action along a rank or file.
- **Short side / long side** — the side of a pawn with fewer / more files.
- **Checking distance** — the room a rook needs to check effectively from the flank.
- **Bridge** — Lucena's rook block that ends the checks.
- **Cross-check** — blocking a check with a check.
- **Domination** — taking away every square from an enemy piece.
- **Dead position** — a position in which no series of legal moves can produce checkmate for either side.
- **WDL / DTZ / DTM** — tablebase metrics: win-draw-loss; distance to the next capture or pawn move; distance to mate.

---

# APPENDIX D — REFERENCE LIBRARY BY TIER
- **Tiers 0–1:** José Raúl Capablanca — *Chess Fundamentals* · Jeremy Silman — *Silman's Complete Endgame Course*
- **Tier 2:** Jesús de la Villa — *100 Endgames You Must Know* · John Nunn — *Understanding Chess Endgames*
- **Tier 3A:** Mark Dvoretsky — *Dvoretsky's Endgame Manual* · Karsten Müller & Frank Lamprecht — *Fundamental Chess Endings* · John Nunn — *Secrets of Rook Endings* and *Secrets of Pawnless Endings*
- **Tier 3B:** Mikhail Shereshevsky — *Endgame Strategy* · Johan Hellsten — *Mastering Endgame Strategy*
- **Tier 3C:** Jacob Aagaard — *Grandmaster Preparation: Endgame Play* · Tibor Károlyi — *Endgame Virtuoso Anatoly Karpov* · Syzygy tablebases (for example via Lichess)
