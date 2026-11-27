# Course audit (tools/course_truth.mjs)

Generated from the board and Stockfish 19 (depth 16) with the app's own Coach Brain (lc83.js).

## Solutions where Stockfish prefers another move (5)

All of these keep the same result (the evaluation after the course move is within a few tenths of Stockfish's move, or both mate). The course move stays; the Runner already accepts equal alternatives through the engine check.

- `bp-p0-3`: course e3, Stockfish Kf4 (eval 590, after the course move 587)
- `bp-p1-2`: course a5, Stockfish Ke4 (eval 648, after the course move 622)
- `bp-p1-5`: course Rh1, Stockfish Rh3 (eval 0, after the course move 0)
- `mspc-caro-adv-l5-trade-the-bishop`: course Nxe3, Stockfish Qd7 (eval -47, after the course move -39)
- `mspc-colle-e4-l5-blockade`: course Bd4, Stockfish Bb3 (eval 99, after the course move 76)

## Text problems (19)

The checker only knows the position and the line. A note on an MSPC case is often a reference to an earlier opening move (4.dxc5, ...dxc4, ...Nbd7) or a wrong answer that explains a piece is NOT there: review each one by hand. On 17 Nov 2026 all seven below were of that kind, none was an error.

- `th-rvp-cut-1`: no engine data
- `th-rvp-cut-2`: no engine data
- `th-rvp-cut-3`: no engine data
- `th-rvp-cut-4`: no engine data
- `th-rvp-cut-5`: no engine data
- `th-qvp-7th-1`: no engine data
- `th-qvp-7th-2`: no engine data
- `th-qvp-7th-3`: no engine data
- `th-qvp-7th-4`: no engine data
- `th-qvp-7th-5`: no engine data
- `kg-101271556984-81`: generated text failed the check: gxh3 (kept the old text)
- `mg-ldb-zCKgj`: generated text failed the check: exf6 (kept the old text)
- `mspc-caro-adv-l3-regain-pawn`: MSPC case names dxc5, pawn on d6 that is not on the board in this line
- `mspc-caro-adv-l4-pin-on-f3`: MSPC case names dxc5 that is not on the board in this line
- `mspc-colle-e4-l3-queen-recapture`: MSPC case names bishop on e4 that is not on the board in this line
- `mspc-colle-nbd7-l2-rook-recapture`: MSPC case names bishop on e4 that is not on the board in this line
- `mspc-colle-nbd7-l3-wedge`: MSPC case names Nbd7 that is not on the board in this line
- `mspc-slav-meran-l2-the-break`: MSPC case names dxc4 that is not on the board in this line
- `mspc-slav-meran-l4-b4-counter`: MSPC case names pawn on d5 that is not on the board in this line

## Rewritten drills (503): what each one really teaches

Compare the lesson topic with what the solution really does: a drill whose motif does not match its chapter is a candidate to move to another chapter.

| id | lesson topic | what the solution does | new title |
|---|---|---|---|
| `kg-143850627920-107` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-125093330103-81` | Passed pawns, majorities and races | material | Win the pawn on e5 |
| `kg-185100776126-100` | Passed pawns, majorities and races | runaway | The runaway a-pawn |
| `kg-108932498215-79` | Conversion, fortresses and exchanging | skewer | Skewer wins the pawn |
| `kg-104530875093-103` | Winconditions: the two ways endgames end | skewer | Skewer wins the pawn |
| `kg-115653509717-190` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-104267543781-106` | Queen endings | promotion | Promote the g-pawn |
| `kg-94081740796-95` | Winconditions: the two ways endgames end | removal | Removing the defender wins the pawn |
| `kg-101330455138-76` | Winconditions: the two ways endgames end | material | Win the rook on e6 |
| `kg-118072196149-112` | Queen endings | promotion | Promote the a-pawn |
| `kg-101456170114-72` | Winconditions: the two ways endgames end | promotion | Promote the c-pawn |
| `kg-103981899771-82` | Winconditions: the two ways endgames end | win | 0.5 The Endgame Scan |
| `kg-97372198311-73` | Winconditions: the two ways endgames end | material | Win the pawn on b5 |
| `kg-172536858052-103` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-185100776126-98` | The rule of the square and first passed pawns | win | Count both sides |
| `kg-94131245360-76` | Winconditions: the two ways endgames end | material | Win the rook on b2 |
| `kg-95728247674-94` | Conversion, fortresses and exchanging | material | Win the rook on g5 |
| `kg-119739049573-92` | Conversion, fortresses and exchanging | win | Ahead → trade pieces, not pawns. Behind → trade pawns, not pieces |
| `kg-172536858052-105` | The rule of the square and first passed pawns | promotion | Promote the h-pawn |
| `kg-170745843914-84` | Kyenzo's games · King in front, pawn behind | runaway | The runaway d-pawn |
| `kg-184670247024-112` | Kyenzo's games · The rook pawn is special | draw | Find the drawing move |
| `kg-136688726580-155` | Kyenzo's games · The rook pawn is special | draw | Find the drawing move |
| `kg-101437712726-67` | Winconditions: the two ways endgames end | material | Win the rook on b2 |
| `kg-113854242447-73` | Bishops, knights and the blockade | material | Win the pawn on c5 |
| `kg-101411351490-70` | Core principles and vocabulary | draw | Find the drawing move |
| `kg-94081740796-123` | Core principles and vocabulary | win | Activate the king |
| `kg-172536858052-99` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-118072196149-86` | Kyenzo's games · Zugzwang | draw | Find the drawing move |
| `kg-123082266419-60` | Kyenzo's games · The opposition family | win | The opposition family |
| `kg-143850627920-123` | Kyenzo's games · The opposition family | draw | Find the drawing move |
| `kg-123082266419-62` | Opposition, key squares and tempo | win | Key squares |
| `kg-171579937380-74` | Opposition, key squares and tempo | win | Key squares |
| `kg-123968486431-123` | Kyenzo's games · Underpromotion | draw | Find the drawing move |
| `kg-109352394083-89` | Rook endings | win | Cut-off geometry |
| `kg-166450045716-75` | Winconditions: the two ways endgames end | win | Cut-off geometry |
| `kg-143850627920-141` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-97372198311-67` | Opposition, key squares and tempo | win | Opposition |
| `kg-109354958019-89` | Passed pawns, majorities and races | runaway | The runaway a-pawn |
| `kg-125174958653-122` | Passed pawns, majorities and races | runaway | The runaway h-pawn |
| `kg-115412374605-83` | Opposition, key squares and tempo | promotion | Promote the a-pawn |
| `kg-136145360518-130` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-108508231233-105` | Bishops, knights and the blockade | material | Win the bishop on g3 |
| `kg-119739049573-96` | Bishops, knights and the blockade | win | Bishops stop Passer Winconditions from a distance; knights stop them best from directly in front |
| `kg-124655992395-78` | Rook endings | draw | Find the drawing move |
| `kg-144010780652-157` | Rook endings | runaway | The runaway a-pawn |
| `kg-101236245168-56` | Kyenzo's games · Activity first | win | Activity first |
| `kg-125177920531-99` | Conversion, fortresses and exchanging | material | Win the knight on g6 |
| `kg-105731955463-105` | Conversion, fortresses and exchanging | material | Win the pawn on a5 |
| `kg-105194457669-137` | Conversion, fortresses and exchanging | runaway | The runaway g-pawn |
| `kg-142915753198-100` | Kyenzo's games · Opposition is the tool; key squares are the goal | draw | Find the drawing move |
| `kg-142915753198-116` | Kyenzo's games · Defender: stay in front, retreat straight back | draw | Find the drawing move |
| `kg-143850627920-145` | Kyenzo's games · Defender: stay in front, retreat straight back | draw | Find the drawing move |
| `kg-173929443396-68` | Transformations and structure-born endgames | win | A protected Passer Wincondition cannot be captured by the king alone |
| `kg-115326541599-87` | Rook endings | win | Activity as material |
| `kg-142887919292-74` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-115653509717-186` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-173019988864-109` | Winconditions: the two ways endgames end | mateNet | Mate in 2 with the rook |
| `kg-123432656681-113` | Kyenzo's games · The more active king usually decides the pawn ending | draw | Find the drawing move |
| `kg-113854242447-77` | Kyenzo's games · The more active king usually decides the pawn ending | draw | Find the drawing move |
| `kg-122908515307-79` | Rook endings | win | Win the pawn on e4 |
| `kg-130628998055-65` | Rook endings | draw | Find the drawing move |
| `kg-113665219497-76` | Rook endings | draw | Find the drawing move |
| `kg-145540556038-111` | Rook endings | draw | Find the drawing move |
| `kg-109187492441-49` | Bishops, knights and the blockade | material | Win the pawn on b5 |
| `kg-173767537722-103` | Bishops, knights and the blockade | win | Bishop vs knight |
| `kg-172698203830-81` | Bishops, knights and the blockade | runaway | The runaway a-pawn |
| `kg-172839738884-120` | Bishops, knights and the blockade | win | Knight endings behave like pawn endings |
| `kg-173323291218-127` | Opposite-coloured bishops | draw | Find the drawing move |
| `kg-174142198060-199` | Opposite-coloured bishops | material | Win the pawn on a7 |
| `kg-115418895421-118` | Rook versus minor pieces and material balance | draw | Find the drawing move |
| `kg-113512781355-179` | Rook versus minor pieces and material balance | draw | Find the drawing move |
| `kg-115653509717-154` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-166449564764-81` | Conversion, fortresses and exchanging | win | Do not hurry |
| `kg-171597951290-69` | Conversion, fortresses and exchanging | win | Do not hurry |
| `kg-121808971217-98` | Conversion, fortresses and exchanging | win | The pawn-ending test |
| `kg-123082266419-58` | Opposition, key squares and tempo | win | Distant and diagonal opposition |
| `kg-136798328538-64` | Transformations and structure-born endgames | win | The breakthrough |
| `kg-113488157221-68` | Passed pawns, majorities and races | runaway | Breakthrough: the f-pawn runs |
| `kg-123614501423-109` | Passed pawns, majorities and races | win | Healthy majorities create Passer Winconditions; crippled (doubled) majorities often cannot |
| `kg-123432656681-85` | Passed pawns, majorities and races | fork | Fork wins the knight |
| `kg-145540556038-115` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-144827592474-95` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-136817540486-66` | Transformations and structure-born endgames | win | Corresponding squares |
| `kg-104262101387-108` | Rook versus minor pieces and material balance | material | Win the rook on a7 |
| `kg-186858718290-63` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-173656688896-123` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-146030666952-115` | Passed pawns, majorities and races | promotion | Promote the g-pawn |
| `kg-186858718290-85` | Passed pawns, majorities and races | promotion | Promote the b-pawn |
| `kg-145540556038-103` | Rook endings | draw | Find the drawing move |
| `kg-172698203830-65` | Planning, prophylaxis and the king | quietThreat | A quiet move wins the bishop |
| `kg-173767537722-87` | Planning, prophylaxis and the king | win | Domination |
| `kg-174410301520-122` | Fortress and anti-fortress | draw | Find the drawing move |
| `kg-186858718290-89` | Fortress and anti-fortress | promotion | Promote the b-pawn |
| `kg-174410301520-124` | Grandmaster technique | draw | Find the drawing move |
| `kg-174324223042-73` | Grandmaster technique | fork | Fork wins the rook |
| `kg-169354933430-96` | Planning, prophylaxis and the king | draw | Find the drawing move |
| `kg-173369553034-110` | Planning, prophylaxis and the king | material | Win the pawn on g3 |
| `kg-184248058720-118` | Rook versus minor pieces and material balance | material | Win the pawn on e5 |
| `kg-140682082606-99` | Conversion, fortresses and exchanging | win | Up the exchange? |
| `kg-170425754086-72` | Transformations and structure-born endgames | material | Win the pawn on d5 |
| `kg-174169793606-80` | Transformations and structure-born endgames | fork | Fork wins the knight |
| `kg-136798328538-60` | Transformations and structure-born endgames | win | Sacrifice a pawn to create a second Wincondition |
| `kg-136976390646-83` | Passed pawns, majorities and races | win | Advance your Passer Winconditions when it gains space or ties the opponent down; blockade the opponent's before they gain momentum |
| `kg-172839738884-98` | Passed pawns, majorities and races | win | Advance your Passer Winconditions when it gains space or ties the opponent down; blockade the opponent's before they gain momentum |
| `kg-186858718290-99` | Passed pawns, majorities and races | win | Majorities matter more as material decreases |
| `kg-145301084848-95` | Bishops, knights and the blockade | runaway | The runaway e-pawn |
| `kg-185831494300-67` | Conversion, fortresses and exchanging | material | Win the rook on a6 |
| `kg-173466547628-113` | Conversion, fortresses and exchanging | material | Win the bishop on c4 |
| `kg-137873469960-109` | Conversion, fortresses and exchanging | promotion | Promote the g-pawn |
| `kg-173928899960-120` | Conversion, fortresses and exchanging | draw | Find the drawing move |
| `kg-123432656681-111` | Conversion, fortresses and exchanging | draw | Find the drawing move |
| `kg-174460367674-73` | Rook versus minor pieces and material balance | win | Material by the numbers (Kaufman's database findings) |
| `kg-173767537722-71` | Rook versus minor pieces and material balance | draw | Find the drawing move |
| `kg-125936931413-136` | Fortress and anti-fortress | material | Win the pawn on b3 |
| `kg-125093330103-83` | Winconditions: the two ways endgames end | win | Spend the Passer Wincondition at the right moment |
| `kg-173928899960-106` | Fortress and anti-fortress | draw | Find the drawing move |
| `kg-136878671744-102` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-123611141578-84` | Opposition, key squares and tempo | win | Domination wins minor pieces |
| `ldb-GhFw3` | Core principles and vocabulary | runaway | The runaway h-pawn |
| `ldb-nBKvx` | Core principles and vocabulary | runaway | The runaway a-pawn |
| `ldb-YjQLA` | The rule of the square and first passed pawns | win | Passer Wincondition vocabulary |
| `ldb-tWY62` | Lichess database · Passer Wincondition vocabulary | runaway | The runaway b-pawn |
| `ldb-yLwCM` | Opposition, key squares and tempo | runaway | Breakthrough: the c-pawn runs |
| `ldb-rZHlw` | Lichess database · Zugzwang | win | Zugzwang |
| `ldb-o7D6F` | Opposition, key squares and tempo | win | The opposition family |
| `ldb-LTwOb` | Lichess database · The opposition family | runaway | The runaway f-pawn |
| `ldb-cSi7f` | Opposition, key squares and tempo | win | Key squares |
| `ldb-yU2C2` | Opposition, key squares and tempo | win | Key squares |
| `ldb-I0CmN` | Lichess database · Spare tempi | win | Spare tempi |
| `ldb-VCnJV` | Lichess database · Spare tempi | win | Spare tempi |
| `ldb-ZVA08` | Passed pawns, majorities and races | win | Decoy |
| `ldb-sND8Q` | Passed pawns, majorities and races | runaway | The runaway b-pawn |
| `ldb-nJgOM` | Passed pawns, majorities and races | mateNet | Mate in 1: underpromote |
| `ldb-gi4Id` | Passed pawns, majorities and races | discovered | Discovered attack wins the rook |
| `ldb-PTw45` | Opposition, key squares and tempo | promotion | Promote the f-pawn |
| `ldb-w073j` | Opposition, key squares and tempo | win | Tempo economy |
| `ldb-FzeFt` | Opposition, key squares and tempo | win | Two-goal geometry |
| `ldb-hHU2w` | Opposition, key squares and tempo | runaway | The runaway g-pawn |
| `ldb-KYOIo` | Rook endings | material | Win the rook on e7 |
| `ldb-hGjku` | Rook endings | runaway | The runaway f-pawn |
| `ldb-0OmC8` | Bishops, knights and the blockade | fork | Fork wins the knight |
| `ldb-jhXMX` | Bishops, knights and the blockade | discovered | Discovered attack wins the knight |
| `ldb-MTsQC` | Rook endings | mateNet | Mate in 2 with the bishop |
| `ldb-dIMEC` | Rook endings | mateNet | Mate in 2 with the bishop |
| `ldb-4238k` | Planning, prophylaxis and the king | win | Domination |
| `ldb-xYVuq` | Planning, prophylaxis and the king | quietThreat | A quiet move with a threat |
| `ldb-FwRzV` | Winconditions: the two ways endgames end | fork | Fork with the queen |
| `ldb-bFnOz` | Winconditions: the two ways endgames end | win | Win the knight on f1 |
| `ldb-Sk7nw` | Winconditions: the two ways endgames end | fork | Fork wins the queen |
| `ldb-vWxbn` | Winconditions: the two ways endgames end | fork | Fork wins the queen |
| `ldb-6OVWV` | Winconditions: the two ways endgames end | runaway | The runaway g-pawn |
| `ldb-qi2Gs` | Winconditions: the two ways endgames end | runaway | The runaway f-pawn |
| `ldb-FWC24` | Conversion, fortresses and exchanging | win | Win the rook on f2 |
| `ldb-XJZ9a` | Winconditions: the two ways endgames end | runaway | The runaway f-pawn |
| `ldb-ruEbt` | Winconditions: the two ways endgames end | promotion | Promote the a-pawn |
| `ldb-FJ2Mi` | Winconditions: the two ways endgames end | trade | Trade into a won endgame |
| `ldb-AYvJp` | Winconditions: the two ways endgames end | material | Win the knight on e3 |
| `ldb-MRFA2` | Laws that decide endgames | mateNet | Mate in 1 with the pawn |
| `ldb-JcMqX` | Laws that decide endgames | mateNet | Mate in 1 with the pawn |
| `ldb-sQr3z` | Laws that decide endgames | mateNet | Mate in 1 with the pawn |
| `ldb-mDH7m` | Laws that decide endgames | mateNet | Mate in 1 with the knight |
| `ldb-Pgqx3` | The rule of the square and first passed pawns | win | Rule of the square — stopping a Passer Wincondition with the king |
| `ldb-yBrpx` | Lichess database · Rule of the square — stopping a Passer Wincondition with the king | promotion | Promote the b-pawn |
| `ldb-K0r8O` | The rule of the square and first passed pawns | runaway | The runaway h-pawn |
| `ldb-JstE8` | The rule of the square and first passed pawns | win | King in front, pawn behind |
| `ldb-UO9d1` | The rule of the square and first passed pawns | draw | Find the drawing move |
| `ldb-kNRGZ` | The rule of the square and first passed pawns | draw | Find the drawing move |
| `ldb-IQKq1` | The rule of the square and first passed pawns | promotion | Promote the h-pawn |
| `ldb-3jhv3` | The rule of the square and first passed pawns | promotion | Promote the g-pawn and win the rook |
| `ldb-7tKLK` | Lichess database · Blockade enemy Passer Winconditions | win | Win the bishop on c5 |
| `ldb-nzYxg` | Lichess database · Blockade enemy Passer Winconditions | fork | Fork wins the rook |
| `ldb-km1Wc` | Laws that decide endgames | fork | Fork wins the queen |
| `ldb-8kcou` | Laws that decide endgames | promotion | Promote the d-pawn |
| `ldb-hkwpC` | Laws that decide endgames | runaway | The runaway h-pawn |
| `ldb-929Ks` | Winconditions: the two ways endgames end | backRank | Mate in 2 on the back rank |
| `ldb-ptWd4` | Winconditions: the two ways endgames end | backRank | Mate in 2 on the back rank |
| `ldb-6ricu` | Core principles and vocabulary | runaway | The runaway a-pawn |
| `ldb-wQD6e` | Core principles and vocabulary | win | Activate the king |
| `ldb-0OrmH` | Lichess database · Opposition | runaway | The runaway g-pawn |
| `ldb-c31mI` | Lichess database · Opposition | win | Opposition |
| `ldb-Ci0n7` | Passed pawns, majorities and races | promotion | Promote the d-pawn |
| `ldb-E8whA` | Passed pawns, majorities and races | runaway | The runaway g-pawn |
| `ldb-lPEdW` | Lichess database · Passer Wincondition races | runaway | The runaway d-pawn |
| `ldb-8lmGv` | Lichess database · Passer Wincondition races | runaway | The runaway f-pawn |
| `ldb-GAnC6` | Bishops, knights and the blockade | discovered | Discovered attack wins the rook |
| `ldb-dkZI9` | Bishops, knights and the blockade | mateNet | Mate in 2 with the bishop |
| `ldb-FnqFJ` | Lichess database · Rooks belong behind Passer Winconditions | mateNet | Mate in 1 with the rook |
| `ldb-Fo2FK` | Rook endings | backRank | Mate in 3 on the back rank |
| `ldb-ies1d` | Rook endings | promotion | Promote the d-pawn and win the rook |
| `ldb-iXeAv` | Rook endings | fork | Fork wins the rook |
| `ldb-Ty6Zq` | Lichess database · Key squares decide K+P vs K | win | Key squares decide K+P vs K |
| `ldb-L6yVB` | Opposition, key squares and tempo | win | Key squares decide K+P vs K |
| `ldb-6E4L3` | Conversion, fortresses and exchanging | promotion | Promote the e-pawn and win the bishop |
| `ldb-KYJi6` | Conversion, fortresses and exchanging | deflection | Deflection wins the pawn |
| `ldb-Ay8GR` | Opposition, key squares and tempo | win | Opposition is the tool; key squares are the goal |
| `ldb-u3qTv` | Lichess database · Opposition is the tool; key squares are the goal | material | Win the pawn on a4 |
| `ldb-fZLhm` | Opposition, key squares and tempo | win | Spare pawn moves win the opposition |
| `ldb-GaROo` | Opposition, key squares and tempo | runaway | Breakthrough: the c-pawn runs |
| `ldb-cp1MH` | Passed pawns, majorities and races | runaway | The runaway h-pawn |
| `ldb-ZZJlV` | Lichess database · The outside Passer Wincondition wins pawn endings | win | The outside Passer Wincondition wins pawn endings |
| `ldb-8jjIt` | Lichess database · A protected Passer Wincondition cannot be captured by the king alone | runaway | Breakthrough: the h-pawn runs |
| `ldb-P5mWC` | Passed pawns, majorities and races | material | Win the pawn on h6 |
| `ldb-FWNWV` | Passed pawns, majorities and races | material | Win the queen on f1 |
| `ldb-ZPHB5` | Lichess database · The more active king usually decides the pawn ending | removal | Removing the defender wins the pawn |
| `ldb-VwTws` | Rook endings | pin | Pin wins the knight |
| `ldb-yLpgF` | Rook endings | win | Win the rook on c7 |
| `ldb-FrmVk` | Rook endings | material | Win the rook on c2 |
| `ldb-jL3yu` | Rook endings | backRank | Mate in 3 on the back rank |
| `ldb-xls6Q` | Lichess database · Knight endings behave like pawn endings | quietThreat | A quiet move with a threat |
| `ldb-Q3XvF` | Bishops, knights and the blockade | material | Win the knight on a4 |
| `ldb-VYBUZ` | Bishops, knights and the blockade | win | Blockade with the right piece |
| `ldb-5HQhi` | Bishops, knights and the blockade | fork | Fork wins the rook |
| `ldb-mALXH` | Conversion, fortresses and exchanging | trade | Trade into a won endgame |
| `ldb-JMvXt` | Conversion, fortresses and exchanging | pin | Pin with the rook |
| `ldb-LR4uP` | Conversion, fortresses and exchanging | win | The pawn-ending test |
| `ldb-J8tKd` | Conversion, fortresses and exchanging | removal | Removing the defender wins the pawn |
| `ldb-b9qLH` | Opposition, key squares and tempo | win | Distant and diagonal opposition |
| `ldb-j2IgN` | Opposition, key squares and tempo | win | Distant and diagonal opposition |
| `ldb-HKckl` | Opposition, key squares and tempo | promotion | Promote the e-pawn |
| `ldb-dg5zL` | Opposition, key squares and tempo | win | The Réti manoeuvre |
| `ldb-kMOqm` | Lichess database · The breakthrough | win | The breakthrough |
| `ldb-3MaHx` | Passed pawns, majorities and races | win | The breakthrough |
| `ldb-3BSvW` | Lichess database · The candidate moves first | mateNet | Mate in 3 with the rook |
| `ldb-vTxBl` | Passed pawns, majorities and races | runaway | Breakthrough: the c-pawn runs |
| `ldb-3ccq0` | Passed pawns, majorities and races | runaway | Breakthrough: the c-pawn runs |
| `ldb-2TBcI` | Passed pawns, majorities and races | runaway | Breakthrough: the g-pawn runs |
| `ldb-08wuw` | Passed pawns, majorities and races | runaway | Breakthrough: the b-pawn runs |
| `ldb-v9F1Z` | Passed pawns, majorities and races | win | Reserve tempi decide blocked pawn endings |
| `ldb-l7gTZ` | Opposition, key squares and tempo | win | Corresponding squares |
| `ldb-afewW` | Opposition, key squares and tempo | runaway | Breakthrough: the h-pawn runs |
| `ldb-g7NWO` | Queen endings | runaway | The runaway h-pawn |
| `ldb-FB8R8` | Queen endings | runaway | The runaway a-pawn |
| `ldb-jxYrz` | Opposition, key squares and tempo | win | Mined squares (mutual zugzwang) |
| `ldb-FsybX` | Opposition, key squares and tempo | win | Mined squares (mutual zugzwang) |
| `ldb-TUrBK` | Passed pawns, majorities and races | win | A queening race is only half the calculation |
| `ldb-UHNCe` | Passed pawns, majorities and races | runaway | The runaway b-pawn |
| `ldb-NJB28` | Planning, prophylaxis and the king | pin | Pin wins the rook |
| `ldb-PYNZV` | Planning, prophylaxis and the king | win | Win the pawn on g2 |
| `ldb-rdYaX` | Transformations and structure-born endgames | skewer | Skewer wins the pawn |
| `ldb-QYzgE` | Transformations and structure-born endgames | skewer | Skewer with the bishop |
| `ldb-GGGDr` | Transformations and structure-born endgames | trade | Trade into a won endgame |
| `ldb-XfPfh` | Transformations and structure-born endgames | quietThreat | A quiet move wins the bishop |
| `ldb-VbLYD` | Passed pawns, majorities and races | win | Advance your Passer Winconditions when it gains space or ties the opponent down; blockade the opponent's before they gain momentum |
| `ldb-SCFG6` | Passed pawns, majorities and races | promotion | Promote the h-pawn |
| `ldb-14df1` | Passed pawns, majorities and races | runaway | The runaway h-pawn |
| `ldb-Scv79` | Passed pawns, majorities and races | win | Win the pawn on g5 |
| `ldb-90VC8` | Transformations and structure-born endgames | runaway | Breakthrough: the a-pawn runs |
| `ldb-xTzyN` | Transformations and structure-born endgames | promotion | Promote the g-pawn |
| `ldb-GLT1O` | Rook endings | quietThreat | A quiet move with a threat |
| `ldb-nnaNe` | Rook endings | quietThreat | A quiet move with a threat |
| `ldb-BznEq` | Planning, prophylaxis and the king | quietThreat | A quiet move wins the queen |
| `ldb-x7fRP` | Planning, prophylaxis and the king | win | Improve the worst piece |
| `ldb-qGMhU` | Planning, prophylaxis and the king | quietThreat | A quiet move with a threat |
| `ldb-mPMkQ` | Planning, prophylaxis and the king | fork | Fork with the rook |
| `ldb-ZG9On` | Conversion, fortresses and exchanging | material | Win the rook on c2 |
| `ldb-BhX2N` | Conversion, fortresses and exchanging | material | Win the pawn on b5 |
| `ldb-vDdR3` | Conversion, fortresses and exchanging | win | Know what each exchange does |
| `ldb-1C7JA` | Conversion, fortresses and exchanging | win | Win the rook on e4 |
| `ldb-WWKX8` | Winconditions: the two ways endgames end | discovered | Discovered attack with the pawn |
| `ldb-UmLbE` | Winconditions: the two ways endgames end | material | Win the bishop on c3 |
| `ldb-GQ2IK` | Winconditions: the two ways endgames end | runaway | The runaway b-pawn |
| `ldb-WCcaj` | Winconditions: the two ways endgames end | runaway | The runaway h-pawn |
| `ldb-e9MVY` | Queen endings | promotion | Promote the h-pawn |
| `ldb-xY9JE` | Queen endings | runaway | The runaway c-pawn |
| `ldb-6rcgz` | Opposition, key squares and tempo | win | Tempo parity is global |
| `ldb-yq7bP` | Opposition, key squares and tempo | win | Tempo parity is global |
| `ldb-1PNG8` | Opposition, key squares and tempo | quietThreat | A quiet move wins the knight |
| `ldb-UYs5l` | Opposition, key squares and tempo | fork | Fork wins the bishop |
| `ldb-8FNNz` | Winconditions: the two ways endgames end | backRank | Mate in 3 on the back rank |
| `ldb-cejRd` | Winconditions: the two ways endgames end | quietThreat | A quiet move wins the rook |
| `mg-kg-98591682179-43` | The Blunder Check: Making M Automatic | win | The Blunder Check: Making M Automatic |
| `mg-kg-103970452959-53` | The Blunder Check: Making M Automatic | material | Win the knight on c8 |
| `mg-kg-97377070149-20` | The Blunder Check: Making M Automatic | material | Win the pawn on e5 |
| `mg-kg-95701893030-67` | The Blunder Check: Making M Automatic | win | Win the rook on g1 |
| `mg-kg-94130945526-23` | The Blunder Check: Making M Automatic | material | Win the queen on d2 |
| `mg-kg-101008105294-31` | The Blunder Check: Making M Automatic | trade | Trade into a won endgame |
| `mg-kg-104670712861-42` | Direct Threats: Making Them and Meeting Them | quietThreat | A quiet move with a threat |
| `mg-kg-144285880952-33` | Direct Threats: Making Them and Meeting Them | quietThreat | A quiet move with a threat |
| `mg-kg-104605175611-51` | Direct Threats: Making Them and Meeting Them | pin | Pin holds the draw |
| `mg-kg-105138606107-33` | Direct Threats: Making Them and Meeting Them | pin | Pin wins the rook |
| `mg-kg-108421295203-20` | Direct Threats: Making Them and Meeting Them | quietThreat | A quiet move wins the bishop |
| `mg-kg-105745799355-37` | Direct Threats: Making Them and Meeting Them | draw | Find the drawing move |
| `mg-kg-165840590334-53` | Defending | draw | Find the drawing move |
| `mg-kg-140902378858-58` | Defending | draw | Find the drawing move |
| `mg-kg-104525557069-85` | Defending | draw | Find the drawing move |
| `mg-kg-105050558653-45` | Defending | material | Win the pawn on f3 |
| `mg-kg-105358223601-22` | Defending | material | Win the knight on d4 |
| `mg-kg-144286629460-41` | Defending | win | Defensive Mastery: Active Defence, Counterattack, Fortresses |
| `mg-kg-165840057186-29` | Defending | draw | Find the drawing move |
| `mg-kg-174126542058-40` | Synthesis: The Full Grandmaster MSPC Loop | win | Win the rook on h8 |
| `mg-kg-174419031530-43` | Defending | quietThreat | A quiet move with a threat |
| `mg-kg-184056134368-33` | Synthesis: The Full Grandmaster MSPC Loop | draw | Find the drawing move |
| `mg-kg-173984958128-40` | Defending | fork | Fork wins the bishop |
| `mg-kg-121376399105-24` | Prophylaxis | draw | Find the drawing move |
| `mg-kg-119899792473-50` | Prophylaxis | draw | Find the drawing move |
| `mg-kg-171514066070-25` | Prophylaxis | win | Prophylaxis Masterclass: Overprotection, Restraint, Preventing Counterplay |
| `mg-kg-173322276342-53` | Prophylaxis | draw | Find the drawing move |
| `mg-kg-173990300252-29` | Prophylaxis | discovered | Discovered attack wins the queen |
| `mg-kg-109453936951-33` | Open Files and the Seventh Rank | quietThreat | A quiet move with a threat |
| `mg-kg-105211280657-50` | Open Files and the Seventh Rank | material | Win the bishop on e7 |
| `mg-kg-104525557069-83` | Open Files and the Seventh Rank | draw | Find the drawing move |
| `mg-kg-108846716727-52` | Open Files and the Seventh Rank | win | Open Files and the Seventh Rank |
| `mg-kg-108155363967-57` | Open Files and the Seventh Rank | draw | Find the drawing move |
| `mg-kg-105136868751-68` | Open Files and the Seventh Rank | material | Win the pawn on f4 |
| `mg-kg-172743308384-34` | Regrouping: Improving the Worst Piece and Rerouting | win | Regrouping: Improving the Worst Piece and Rerouting |
| `mg-kg-185590229474-53` | Regrouping: Improving the Worst Piece and Rerouting | quietThreat | A quiet move with a threat |
| `mg-kg-184975668588-25` | Regrouping: Improving the Worst Piece and Rerouting | draw | Find the drawing move |
| `mg-kg-171568789566-35` | Regrouping: Improving the Worst Piece and Rerouting | draw | Find the drawing move |
| `mg-kg-104523020897-45` | King Safety Basics | material | Win the bishop on g7 |
| `mg-kg-101439643066-50` | King Safety Basics | quietThreat | A quiet move with a threat |
| `mg-kg-95800504886-21` | King Safety Basics | quietThreat | A quiet move with a threat |
| `mg-kg-98218472801-63` | King Safety Basics | material | Win the pawn on g7 |
| `mg-kg-101442459716-27` | King Safety Basics | material | Win the knight on e6 |
| `mg-kg-82176437366-73` | King Safety Basics | draw | Find the drawing move |
| `mg-kg-113593855283-52` | Hanging Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-131386745221-20` | Hanging Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-113507431047-50` | Hanging Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-124225114305-50` | Hanging Pawns | discovered | Discovered attack wins the pawn |
| `mg-kg-114454861643-45` | Hanging Pawns | win | Hanging Pawns |
| `mg-kg-113682585213-36` | Hanging Pawns | material | Win the pawn on b4 |
| `mg-kg-94071237148-27` | Piece Coordination and Activity | material | Win the knight on d5 |
| `mg-kg-94089010912-20` | Piece Coordination and Activity | material | Win the pawn on d5 |
| `mg-kg-95721352316-43` | Piece Coordination and Activity | quietThreat | A quiet move wins the knight |
| `mg-kg-97873175549-25` | Piece Coordination and Activity | quietThreat | A quiet move with a threat |
| `mg-kg-104512249579-31` | Piece Coordination and Activity | win | Piece Coordination and Activity |
| `mg-kg-95808027894-31` | Piece Coordination and Activity | skewer | Skewer wins the knight |
| `mg-kg-185921194824-34` | Colour-Complex Domination | pin | Pin with the queen |
| `mg-kg-186289197482-43` | Colour-Complex Domination | win | Colour-Complex Domination |
| `mg-kg-186084890434-39` | Colour-Complex Domination | win | Colour-Complex Domination |
| `mg-kg-123503538656-58` | Colour-Complex Domination | win | Colour-Complex Domination |
| `mg-kg-142887919292-54` | Piece Exchanges: Which Pieces to Trade | discovered | Discovered attack wins the bishop |
| `mg-kg-143536979866-21` | Piece Exchanges: Which Pieces to Trade | pin | Pin wins the knight |
| `mg-kg-109354277663-21` | Piece Exchanges: Which Pieces to Trade | win | Win the knight on e5 |
| `mg-kg-122823238325-26` | Piece Exchanges: Which Pieces to Trade | draw | Find the drawing move |
| `mg-kg-113662220933-31` | Piece Exchanges: Which Pieces to Trade | win | Win the knight on a3 |
| `mg-kg-123962497275-49` | Piece Exchanges: Which Pieces to Trade | draw | Find the drawing move |
| `mg-kg-100397623901-47` | Finding and choosing a plan | skewer | Skewer holds the draw |
| `mg-kg-94138948842-24` | Finding and choosing a plan | quietThreat | A quiet move with a threat |
| `mg-kg-95803898562-75` | Finding and choosing a plan | material | Win the knight on h7 |
| `mg-kg-99325561019-21` | Finding and choosing a plan | win | The Plan-Selection Method: From Imbalances to Plans |
| `mg-kg-147197934480-59` | Finding and choosing a plan | discovered | Discovered attack with the bishop |
| `mg-kg-136146178368-29` | Finding and choosing a plan | quietThreat | A quiet move with a threat |
| `mg-kg-170891024696-49` | Weak Squares, Outposts and Backward Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-125007579627-72` | The Isolated Queen's Pawn (Both Sides) | trade | Trade into a won endgame |
| `mg-kg-124979351489-24` | The Isolated Queen's Pawn (Both Sides) | quietThreat | A quiet move with a threat |
| `mg-kg-125240991761-42` | The Isolated Queen's Pawn (Both Sides) | win | The Isolated Queen's Pawn (Both Sides) |
| `mg-kg-117325186703-66` | The Isolated Queen's Pawn (Both Sides) | win | The Isolated Queen's Pawn (Both Sides) |
| `mg-kg-143546250638-39` | The Isolated Queen's Pawn (Both Sides) | material | Win the rook on e4 |
| `mg-kg-95715122618-26` | Loose Pieces and the CCA Scan | material | Win the rook on a8 |
| `mg-kg-102417618309-37` | Loose Pieces and the CCA Scan | material | Win the knight on d2 |
| `mg-kg-95735378042-47` | Loose Pieces and the CCA Scan | material | Win the bishop on e6 |
| `mg-kg-104586696203-24` | Loose Pieces and the CCA Scan | material | Win the bishop on b4 |
| `mg-kg-97460392093-41` | Core Tactical Patterns | pin | Pin with the rook |
| `mg-kg-101406696238-71` | Core Tactical Patterns | fork | Fork wins the queen |
| `mg-kg-97376966997-52` | Core Tactical Patterns | quietThreat | A quiet move wins the bishop |
| `mg-kg-97767105745-29` | Core Tactical Patterns | fork | Fork wins the knight |
| `mg-kg-105279673839-21` | Development Lead and the Uncastled King | material | Win the pawn on g2 |
| `mg-kg-105746357491-20` | Development Lead and the Uncastled King | quietThreat | A quiet move with a threat |
| `mg-kg-82176503540-24` | Development Lead and the Uncastled King | win | Development Lead and the Uncastled King |
| `mg-kg-173694101558-20` | Repertoire-to-Middlegame Bridges at Advanced Level | trade | Trade into a won endgame |
| `mg-kg-170380966396-20` | Repertoire-to-Middlegame Bridges at Advanced Level | trade | Trade into a won endgame |
| `mg-kg-145591583942-26` | Repertoire-to-Middlegame Bridges at Advanced Level | discovered | Discovered attack wins the bishop |
| `mg-kg-137738253494-30` | Repertoire-to-Middlegame Bridges at Advanced Level | material | Win the bishop on a6 |
| `mg-kg-145336004368-20` | Repertoire-to-Middlegame Bridges at Advanced Level | trade | Trade into a won endgame |
| `mg-kg-168611113334-30` | The Positional Exchange Sacrifice and Other Positional Sacrifices | win | Win the knight on f4 |
| `mg-kg-174322181660-32` | Synthesis: The Full Grandmaster MSPC Loop | win | Win the pawn on g5 |
| `mg-kg-174410301520-70` | Grandmaster Calculation and Critical-Moment Decisions | quietThreat | A quiet move wins the knight |
| `mg-kg-174126148394-23` | Grandmaster Calculation and Critical-Moment Decisions | win | Grandmaster Calculation and Critical-Moment Decisions |
| `mg-kg-174460833408-61` | Grandmaster Calculation and Critical-Moment Decisions | quietThreat | A quiet move with a threat |
| `mg-kg-173948115340-20` | Synthesis: The Full Grandmaster MSPC Loop | win | Grandmaster Calculation and Critical-Moment Decisions |
| `mg-kg-187535970256-40` | The Positional Exchange Sacrifice and Other Positional Sacrifices | draw | Find the drawing move |
| `mg-kg-136510077240-42` | Dynamic vs Static: The Trade-Off Ledger | discovered | Discovered attack wins the rook |
| `mg-kg-137125481040-49` | Dynamic vs Static: The Trade-Off Ledger | discovered | Discovered attack wins the knight |
| `mg-kg-185545515950-31` | Space, Restriction and Strangling the Opponent's Breaks | quietThreat | A quiet move with a threat |
| `mg-kg-172932178956-59` | The Positional Exchange Sacrifice and Other Positional Sacrifices | draw | Find the drawing move |
| `mg-kg-172675555182-48` | Middlegame-to-endgame transitions | fork | Fork with the rook |
| `mg-kg-137509814856-26` | Middlegame-to-endgame transitions | win | Win the queen on e5 |
| `mg-kg-123399691516-56` | Middlegame-to-endgame transitions | draw | Find the drawing move |
| `mg-kg-185320508798-43` | Middlegame-to-endgame transitions | win | Middlegame-to-Endgame Transitions II: Conversion Technique |
| `mg-kg-173931787814-109` | Middlegame-to-endgame transitions | runaway | The runaway a-pawn |
| `mg-kg-173259096730-46` | Middlegame-to-endgame transitions | win | Middlegame-to-Endgame Transitions II: Conversion Technique |
| `mg-kg-184665710860-56` | Middlegame-to-endgame transitions | material | Win the queen on f7 |
| `mg-kg-138521938836-44` | Middlegame-to-endgame transitions | material | Win the queen on c1 |
| `mg-kg-173401001306-46` | Middlegame-to-endgame transitions | draw | Find the drawing move |
| `mg-kg-187405731530-56` | Middlegame-to-endgame transitions | material | Win the queen on f3 |
| `mg-kg-173370369950-29` | Middlegame-to-endgame transitions | material | Win the queen on e2 |
| `mg-kg-137082455912-26` | Middlegame-to-endgame transitions | material | Win the queen on d8 |
| `mg-kg-186083816974-58` | Transformation of Advantages | trade | Trade into a won endgame |
| `mg-kg-184589327050-52` | Transformation of Advantages | win | Transformation of Advantages |
| `mg-kg-173713970772-37` | Transformation of Advantages | discovered | Discovered attack wins the knight |
| `mg-kg-143351326364-41` | Weak Squares, Outposts and Backward Pawns | win | Weak Squares, Outposts and Backward Pawns |
| `mg-kg-113490648439-22` | Weak Squares, Outposts and Backward Pawns | win | Weak Squares, Outposts and Backward Pawns |
| `mg-kg-184211800742-55` | Weak Squares, Outposts and Backward Pawns | fork | Fork wins the rook |
| `mg-kg-186658850282-56` | Weak Squares, Outposts and Backward Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-171256600800-22` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | draw | Find the drawing move |
| `mg-kg-123357688177-32` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | win | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair |
| `mg-kg-187560377120-35` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | quietThreat | A quiet move with a threat |
| `mg-kg-119555401561-43` | The Principle of Two Weaknesses | draw | Find the drawing move |
| `mg-kg-121697419981-28` | The Principle of Two Weaknesses | draw | Find the drawing move |
| `mg-kg-124393808569-32` | The Principle of Two Weaknesses | draw | Find the drawing move |
| `mg-kg-115999277905-25` | The Principle of Two Weaknesses | fork | Fork with the pawn |
| `mg-kg-125240991761-62` | The Principle of Two Weaknesses | quietThreat | A quiet move with a threat |
| `mg-kg-115327179551-20` | The Principle of Two Weaknesses | quietThreat | A quiet move with a threat |
| `mg-kg-185703773586-29` | Pawn Centres, Majorities and Mobile Pawn Masses | quietThreat | A quiet move with a threat |
| `mg-kg-170745843914-40` | Pawn Centres, Majorities and Mobile Pawn Masses | quietThreat | A quiet move with a threat |
| `mg-kg-125602774501-33` | Pawn Centres, Majorities and Mobile Pawn Masses | win | Pawn Centres, Majorities and Mobile Pawn Masses |
| `mg-kg-123278931180-47` | Pawn Centres, Majorities and Mobile Pawn Masses | win | Pawn Centres, Majorities and Mobile Pawn Masses |
| `mg-kg-123388793618-34` | Pawn Centres, Majorities and Mobile Pawn Masses | discovered | Discovered attack wins the bishop |
| `mg-kg-174460367674-37` | The Initiative: Pawn Sacrifices for Time and Open Lines | win | Win the pawn on c5 |
| `mg-kg-174418107022-26` | The Initiative: Pawn Sacrifices for Time and Open Lines | fork | Fork wins the pawn |
| `mg-kg-184056134368-29` | The Initiative: Pawn Sacrifices for Time and Open Lines | win | Win the pawn on f4 |
| `mg-kg-174322181660-38` | The Initiative: Pawn Sacrifices for Time and Open Lines | quietThreat | A quiet move with a threat |
| `mg-kg-174527620416-59` | The Initiative: Pawn Sacrifices for Time and Open Lines | draw | Find the drawing move |
| `mg-kg-144285269128-54` | Attacking the Castled King: Mating Patterns and the Greek Gift | material | Win the pawn on g7 |
| `mg-kg-107792531013-61` | Attacking the Castled King: Mating Patterns and the Greek Gift | fork | Fork wins the rook |
| `mg-kg-108243613617-47` | Attacking the Castled King: Mating Patterns and the Greek Gift | backRank | Mate in 2 on the back rank |
| `mg-kg-109455004647-50` | Attacking the Castled King: Mating Patterns and the Greek Gift | fork | Fork wins the pawn |
| `mg-kg-108828034877-38` | Basic Pawn Breaks: Levers and Opening Lines | quietThreat | A quiet move with a threat |
| `mg-kg-108337257299-71` | Basic Pawn Breaks: Levers and Opening Lines | win | Basic Pawn Breaks: Levers and Opening Lines |
| `mg-kg-173755873730-34` | Opposite-Side Castling: Pawn Storms and Tempo Counting | win | Opposite-Side Castling: Pawn Storms and Tempo Counting |
| `mg-kg-136770410662-34` | Opposite-Side Castling: Pawn Storms and Tempo Counting | trade | Trade into a won endgame |
| `mg-kg-137156707212-66` | Opposite-Side Castling: Pawn Storms and Tempo Counting | deflection | Deflection wins the bishop |
| `mg-kg-184260342644-34` | Opposite-Side Castling: Pawn Storms and Tempo Counting | quietThreat | A quiet move with a threat |
| `mg-kg-185988998500-68` | Opposite-Side Castling: Pawn Storms and Tempo Counting | draw | Find the drawing move |
| `mg-kg-164186350956-25` | Space, Restriction and Strangling the Opponent's Breaks | quietThreat | A quiet move with a threat |
| `mg-kg-186649736982-28` | Space, Restriction and Strangling the Opponent's Breaks | fork | Fork with the pawn |
| `mg-kg-95800553142-25` | Pawn Chains: The Advance Structure and Attacking the Base | draw | Find the drawing move |
| `mg-kg-170595612202-49` | The Carlsbad Structure and the Minority Attack | material | Win the knight on c5 |
| `mg-kg-187564599052-24` | The Carlsbad Structure and the Minority Attack | trade | Trade into a won endgame |
| `mg-kg-125417366269-49` | The Carlsbad Structure and the Minority Attack | quietThreat | A quiet move wins the bishop |
| `mg-kg-170922316006-29` | The Carlsbad Structure and the Minority Attack | win | The Carlsbad Structure and the Minority Attack |
| `mg-kg-174140164294-30` | Synthesis: The Full Grandmaster MSPC Loop | win | Synthesis: The Full Grandmaster MSPC Loop |
| `mg-kg-174332570588-27` | Synthesis: The Full Grandmaster MSPC Loop | pin | Pin holds the draw |
| `mg-ldb-IlTjh` | Loose Pieces and the CCA Scan | trade | Trade into a won endgame |
| `mg-ldb-O6Bkk` | Loose Pieces and the CCA Scan | backRank | Mate in 1 on the back rank |
| `mg-ldb-U5ntl` | Loose Pieces and the CCA Scan | backRank | Mate in 1 on the back rank |
| `mg-ldb-dvXEn` | Piece Coordination and Activity | fork | Fork wins the rook |
| `mg-ldb-KHCm3` | Core Tactical Patterns | trade | Trade into a won endgame |
| `mg-ldb-IlBrA` | Core Tactical Patterns | backRank | Mate in 2 on the back rank |
| `mg-ldb-3Qmm0` | Core Tactical Patterns | fork | Fork wins the queen |
| `mg-ldb-edT6n` | Development Lead and the Uncastled King | backRank | Mate in 1 on the back rank |
| `mg-ldb-qaSCu` | Development Lead and the Uncastled King | fork | Fork wins the rook |
| `mg-ldb-PRiQ4` | Development Lead and the Uncastled King | smothered | Mate in 1: smothered |
| `mg-ldb-1BN43` | Development Lead and the Uncastled King | fork | Fork wins the rook |
| `mg-ldb-5CzQT` | Direct Threats: Making Them and Meeting Them | fork | Fork wins the rook |
| `mg-ldb-9zvz6` | Attacking the Castled King: Mating Patterns and the Greek Gift | mateNet | Mate in 2 with the rook |
| `mg-ldb-Mg6Ne` | Attacking the Castled King: Mating Patterns and the Greek Gift | backRank | Mate in 2 on the back rank |
| `mg-ldb-81p6w` | Attacking the Castled King: Mating Patterns and the Greek Gift | runaway | The runaway h-pawn |
| `mg-ldb-W99HO` | Open Files and the Seventh Rank | pin | Pin wins the queen |
| `mg-ldb-GniQf` | Basic Pawn Breaks: Levers and Opening Lines | discovered | Discovered attack wins the queen |
| `mg-ldb-EZqPl` | Basic Pawn Breaks: Levers and Opening Lines | quietThreat | A quiet move with a threat |
| `mg-ldb-QeF0i` | Basic Pawn Breaks: Levers and Opening Lines | discovered | Discovered attack wins the bishop |
| `mg-ldb-3vSwu` | Basic Pawn Breaks: Levers and Opening Lines | mateNet | Mate in 2 with the pawn |
| `mg-ldb-ADdFS` | The Carlsbad Structure and the Minority Attack | material | Win the knight on e4 |
| `mg-ldb-1M8Xp` | The Carlsbad Structure and the Minority Attack | discovered | Discovered attack wins the knight |
| `mg-ldb-dlAnh` | The Carlsbad Structure and the Minority Attack | material | Win the knight on e3 |
| `mg-ldb-UPvyi` | The Isolated Queen's Pawn (Both Sides) | removal | Removing the defender wins the bishop |
| `mg-ldb-NN14g` | Hanging Pawns | fork | Fork wins the knight |
| `mg-ldb-XZTDt` | Weak Squares, Outposts and Backward Pawns | fork | Fork wins the bishop |
| `mg-ldb-I9hyQ` | Weak Squares, Outposts and Backward Pawns | mateNet | Mate in 1 with the knight |
| `mg-ldb-cvu3G` | Piece Exchanges: Which Pieces to Trade | trade | Trade into a won endgame |
| `mg-ldb-bkdYF` | Pawn Chains: The Advance Structure and Attacking the Base | trade | Trade into a won endgame |
| `mg-ldb-zW8Vh` | Pawn Chains: The Advance Structure and Attacking the Base | discovered | Discovered attack with the pawn |
| `mg-ldb-Y8VWS` | Pawn Chains: The Advance Structure and Attacking the Base | quietThreat | A quiet move wins the rook |
| `mg-ldb-BYU3x` | Pawn Chains: The Advance Structure and Attacking the Base | discovered | Discovered attack with the pawn |
| `mg-ldb-Aqi81` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | fork | Fork wins the queen |
| `mg-ldb-Ugyfd` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | skewer | Skewer wins the queen |
| `mg-ldb-eHbBz` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | mateNet | Mate in 1 with the bishop |
| `mg-ldb-065ae` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | skewer | Skewer wins the queen |
| `mg-ldb-JSEDz` | The Principle of Two Weaknesses | quietThreat | A quiet move wins the queen |
| `mg-ldb-OR3Zg` | Dynamic vs Static: The Trade-Off Ledger | pin | Pin wins the bishop |
| `mg-ldb-T5XdZ` | Dynamic vs Static: The Trade-Off Ledger | mateNet | Mate in 2 with the queen |
| `mg-ldb-1MgWp` | Dynamic vs Static: The Trade-Off Ledger | win | Win the bishop on g2 |
| `mg-ldb-4CNWL` | Colour-Complex Domination | backRank | Mate in 2 on the back rank |
| `mg-ldb-OwoQ6` | Colour-Complex Domination | discovered | Discovered attack wins the queen |
| `mg-ldb-9zChr` | Colour-Complex Domination | mateNet | Mate in 2 with the rook |
| `mg-ldb-0zLZp` | Space, Restriction and Strangling the Opponent's Breaks | fork | Fork with the pawn |
| `mg-ldb-gNoGd` | Space, Restriction and Strangling the Opponent's Breaks | discovered | Discovered attack wins the rook |
| `mg-ldb-OZ8pk` | Space, Restriction and Strangling the Opponent's Breaks | skewer | Skewer wins the bishop |
| `mg-ldb-d3ldy` | Space, Restriction and Strangling the Opponent's Breaks | trade | Trade into a won endgame |
| `mg-ldb-elaki` | Regrouping: Improving the Worst Piece and Rerouting | pin | Pin wins the rook |
| `mg-ldb-TnZ6Z` | Regrouping: Improving the Worst Piece and Rerouting | pin | Pin wins the queen |
| `mg-ldb-VZjLx` | Opposite-Side Castling: Pawn Storms and Tempo Counting | mateNet | Mate in 2 with the rook |
| `mg-ldb-yrJMY` | Opposite-Side Castling: Pawn Storms and Tempo Counting | backRank | Mate in 2 on the back rank |
| `mg-ldb-UPnmY` | Pawn Centres, Majorities and Mobile Pawn Masses | fork | Fork wins the queen |
| `mg-ldb-2BDcF` | Transformation of Advantages | trade | Trade into a won endgame |
| `mg-ldb-nz5TI` | Transformation of Advantages | discovered | Discovered attack wins the knight |
| `mg-ldb-aWH7m` | Transformation of Advantages | runaway | Breakthrough: the b-pawn runs |
| `mg-ldb-pOcZB` | Transformation of Advantages | win | Win the pawn on g6 |
| `mg-ldb-CWnge` | The Positional Exchange Sacrifice and Other Positional Sacrifices | fork | Fork wins the bishop |
| `mg-ldb-Wv1wZ` | The Positional Exchange Sacrifice and Other Positional Sacrifices | pin | Pin wins the bishop |
| `mg-ldb-UYwGC` | The Positional Exchange Sacrifice and Other Positional Sacrifices | discovered | Discovered attack wins the bishop |
| `mg-ldb-KMhhp` | The Positional Exchange Sacrifice and Other Positional Sacrifices | skewer | Skewer wins the bishop |
| `mg-ldb-K9WHM` | The Initiative: Pawn Sacrifices for Time and Open Lines | quietThreat | A quiet move wins the pawn |
| `mg-ldb-BsSOD` | The Initiative: Pawn Sacrifices for Time and Open Lines | skewer | Skewer wins the rook |
| `mg-ldb-8ezPi` | Grandmaster Calculation and Critical-Moment Decisions | pin | Pin wins the rook |
| `mg-ldb-VxhGX` | Synthesis: The Full Grandmaster MSPC Loop | fork | Fork wins the queen |
| `mg-ldb-frcug` | Finding and choosing a plan | fork | Fork wins the rook |
| `mg-ldb-xqsXE` | Finding and choosing a plan | quietThreat | A quiet move with a threat |
| `mg-ldb-AfzGG` | Finding and choosing a plan | fork | Fork wins the knight |
| `mg-ldb-vzE7j` | Finding and choosing a plan | trade | Trade into a won endgame |
| `mg-ldb-DNERO` | Middlegame-to-endgame transitions | removal | Removing the defender wins the bishop |
| `mg-ldb-hNG0s` | Middlegame-to-endgame transitions | fork | Fork wins the bishop |
