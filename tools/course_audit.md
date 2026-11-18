# Course audit (tools/course_truth.mjs)

Generated from the board and Stockfish 19 (depth 16) with the app's own Coach Brain (lc83.js).

## Solutions where Stockfish prefers another move (6)

All of these keep the same result (the evaluation after the course move is within a few tenths of Stockfish's move, or both mate). The course move stays; the Runner already accepts equal alternatives through the engine check.

- `bp-p0-3`: course e3, Stockfish Kf4 (eval 590, after the course move 587)
- `bp-p1-2`: course a5, Stockfish Ke4 (eval 648, after the course move 622)
- `bp-p1-5`: course Rh1, Stockfish Rh3 (eval 0, after the course move 0)
- `lc-43col`: course d8=Q#, Stockfish d8=R# (eval mate 1, after the course move mate 0)
- `mspc-caro-adv-l5-trade-the-bishop`: course Nxe3, Stockfish Qd7 (eval -47, after the course move -39)
- `mspc-colle-e4-l5-blockade`: course Bd4, Stockfish Bb3 (eval 99, after the course move 76)

## Text problems (7)

The checker only knows the position and the line. A note on an MSPC case is often a reference to an earlier opening move (4.dxc5, ...dxc4, ...Nbd7) or a wrong answer that explains a piece is NOT there: review each one by hand. On 17 Nov 2026 all seven below were of that kind, none was an error.

- `mspc-caro-adv-l3-regain-pawn`: MSPC case names dxc5, pawn on d6 that is not on the board in this line
- `mspc-caro-adv-l4-pin-on-f3`: MSPC case names dxc5 that is not on the board in this line
- `mspc-colle-e4-l3-queen-recapture`: MSPC case names bishop on e4 that is not on the board in this line
- `mspc-colle-nbd7-l2-rook-recapture`: MSPC case names bishop on e4 that is not on the board in this line
- `mspc-colle-nbd7-l3-wedge`: MSPC case names Nbd7 that is not on the board in this line
- `mspc-slav-meran-l2-the-break`: MSPC case names dxc4 that is not on the board in this line
- `mspc-slav-meran-l4-b4-counter`: MSPC case names pawn on d5 that is not on the board in this line

## Rewritten drills (212): what each one really teaches

Compare the lesson topic with what the solution really does: a drill whose motif does not match its chapter is a candidate to move to another chapter.

| id | lesson topic | what the solution does | new title |
|---|---|---|---|
| `lc-1JQm4` | Core principles and vocabulary | skewer | Skewer wins the bishop |
| `lc-40f2S` | Winconditions: the two ways endgames end | skewer | Skewer wins the queen |
| `lc-43col` | Core principles and vocabulary | mateNet | Mate in 1 with a promotion |
| `lc-4K85X` | Basic mates and mating technique | backRank | Mate in 1 on the back rank |
| `lc-6oWKO` | The rule of the square and first passed pawns | removal | Removing the defender wins the pawn |
| `lc-BqkHU` | Basic mates and mating technique | backRank | Mate in 1 on the back rank |
| `lc-C9CdU` | The rule of the square and first passed pawns | material | Win the pawn on h3 |
| `lc-CCe77` | Winconditions: the two ways endgames end | backRank | Mate in 1 on the back rank |
| `lc-CtI2H` | Winconditions: the two ways endgames end | mateNet | Mate in 1 with the rook |
| `lc-CzEOB` | Basic mates and mating technique | backRank | Mate in 1 on the back rank |
| `lc-ENszJ` | The rule of the square and first passed pawns | promotion | Promote the d-pawn and win the rook |
| `lc-G5zLv` | The rule of the square and first passed pawns | promotion | Promote the d-pawn |
| `lc-JVQIm` | Core principles and vocabulary | runaway | The runaway h-pawn |
| `lc-KM0Nq` | The rule of the square and first passed pawns | promotion | Promote the b-pawn |
| `lc-Olyil` | Winconditions: the two ways endgames end | backRank | Mate in 1 on the back rank |
| `lc-PglNQ` | Laws that decide endgames | win | Zugzwang: make them run out of safe moves |
| `lc-SD9hz` | Core principles and vocabulary | mateNet | Mate in 1 with the knight |
| `lc-WlXc8` | Winconditions: the two ways endgames end | backRank | Mate in 1 on the back rank |
| `lc-XeHnu` | Winconditions: the two ways endgames end | runaway | The runaway a-pawn |
| `lc-Yacpz` | Winconditions: the two ways endgames end | mateNet | Mate in 2 with the rook |
| `lc-Yb5Fq` | Laws that decide endgames | mateNet | Mate in 1: underpromote |
| `lc-bfHDL` | Winconditions: the two ways endgames end | runaway | Breakthrough: the h-pawn runs |
| `lc-bpNME` | Core principles and vocabulary | skewer | Skewer wins the rook |
| `lc-gFqgK` | Laws that decide endgames | mateNet | Mate in 1: underpromote |
| `lc-j1sXy` | Laws that decide endgames | fork | Fork wins the queen |
| `lc-laA40` | Core principles and vocabulary | promotion | Promote the c-pawn |
| `lc-nszk8` | Laws that decide endgames | material | Win the pawn on a6 |
| `lc-oEmZ9` | Laws that decide endgames | win | Zugzwang: make them run out of safe moves |
| `lc-qBprc` | Basic mates and mating technique | backRank | Mate in 2 on the back rank |
| `lc-tjZs5` | Core principles and vocabulary | runaway | The runaway d-pawn |
| `lc-uEQpt` | Winconditions: the two ways endgames end | backRank | Mate in 1 on the back rank |
| `lc-uJITt` | Core principles and vocabulary | promotion | Promote the a-pawn |
| `lc-vKMNv` | Winconditions: the two ways endgames end | promotion | Promote the b-pawn |
| `lc-w4Kcs` | Winconditions: the two ways endgames end | promotion | Promote the c-pawn |
| `lc-xcW6J` | Core principles and vocabulary | promotion | Promote the d-pawn |
| `lc-xq2W3` | Core principles and vocabulary | pin | Pin wins the queen |
| `lc-y9CgV` | The rule of the square and first passed pawns | promotion | Promote the a-pawn and win the rook |
| `lc-zDVG3` | Core principles and vocabulary | runaway | The runaway a-pawn |
| `lc-zQd39` | Laws that decide endgames | material | Win the pawn on g5 |
| `lc-49ebp` | Queen endings | mateNet | Mate in 1 with the queen |
| `lc-4NwJW` | Winconditions: the two ways endgames end | mateNet | Mate in 2 with the rook |
| `lc-5XnPN` | Winconditions: the two ways endgames end | mateNet | Mate in 1 with the rook |
| `lc-5cyUn` | Bishops, knights and the blockade | mateNet | Mate in 2 with the pawn |
| `lc-9TRHP` | Opposition, key squares and tempo | promotion | Promote the c-pawn |
| `lc-9XWAR` | Winconditions: the two ways endgames end | mateNet | Mate in 2 with the queen |
| `lc-Cal8F` | Rook endings | mateNet | Mate in 1 with the rook |
| `lc-D8wyK` | Bishops, knights and the blockade | mateNet | Mate in 1 with the knight |
| `lc-EyqYa` | Winconditions: the two ways endgames end | runaway | The runaway g-pawn |
| `lc-GYdPX` | Bishops, knights and the blockade | promotion | Promote the g-pawn |
| `lc-Iibap` | Queen endings | pin | Pin wins the queen |
| `lc-J6aIs` | Passed pawns, majorities and races | fork | Fork wins the queen |
| `lc-JNCCq` | Queen endings | skewer | Skewer wins the queen |
| `lc-LsBga` | Winconditions: the two ways endgames end | promotion | Promote the f-pawn and win the rook |
| `lc-NHH1j` | Bishops, knights and the blockade | runaway | The runaway h-pawn |
| `lc-NTIrG` | Queen endings | skewer | Skewer wins the queen |
| `lc-Pr6Kd` | Queen endings | mateNet | Mate in 1 with the rook |
| `lc-RNV8z` | Conversion, fortresses and exchanging | material | Win the pawn on g3 |
| `lc-SS5vA` | Passed pawns, majorities and races | fork | Fork wins the queen |
| `lc-VRVPM` | Winconditions: the two ways endgames end | mateNet | Mate in 1 with the queen |
| `lc-XTJuF` | Rook endings | quietThreat | A quiet move wins the rook |
| `lc-Y7onQ` | Queen endings | mateNet | Mate in 1 with the queen |
| `lc-bHIZx` | Opposition, key squares and tempo | removal | Removing the defender wins the pawn |
| `lc-baIaG` | Rook endings | trade | Trade into a won endgame |
| `lc-buuLc` | Queen endings | fork | Fork wins the queen |
| `lc-d49wh` | Conversion, fortresses and exchanging | win | Zugzwang: make them run out of safe moves |
| `lc-dMENY` | Bishops, knights and the blockade | runaway | Breakthrough: the c-pawn runs |
| `lc-dybiq` | Opposition, key squares and tempo | material | Win the pawn on a4 |
| `lc-e104b` | Rook endings | skewer | Skewer wins the rook |
| `lc-erSYy` | Passed pawns, majorities and races | fork | Fork wins the queen |
| `lc-gLl9q` | Bishops, knights and the blockade | runaway | The runaway a-pawn |
| `lc-hMBSh` | Conversion, fortresses and exchanging | runaway | The runaway a-pawn |
| `lc-oJe20` | Passed pawns, majorities and races | mateNet | Mate in 1: underpromote |
| `lc-oejPX` | Opposition, key squares and tempo | runaway | The runaway f-pawn |
| `lc-ovWEy` | Conversion, fortresses and exchanging | material | Win the pawn on f4 |
| `lc-pjG9K` | Bishops, knights and the blockade | runaway | The runaway b-pawn |
| `lc-qahW4` | Queen endings | skewer | Skewer wins the queen |
| `lc-t7SU9` | Opposition, key squares and tempo | material | Win the pawn on h6 |
| `lc-z0AeB` | Conversion, fortresses and exchanging | runaway | The runaway e-pawn |
| `lc-zDdj3` | Bishops, knights and the blockade | material | Win the knight on c6 |
| `lc-0MLAj` | Conversion, fortresses and exchanging | material | Win the rook on g8 |
| `lc-0OBZU` | Passed pawns, majorities and races | runaway | The runaway c-pawn |
| `lc-0b02Q` | Winconditions: the two ways endgames end | mateNet | Mate in 3 with the queen |
| `lc-3hXdQ` | Opposition, key squares and tempo | runaway | The runaway e-pawn |
| `lc-62rXy` | Conversion, fortresses and exchanging | runaway | The runaway d-pawn |
| `lc-64KWn` | Winconditions: the two ways endgames end | runaway | The runaway d-pawn |
| `lc-6BKzC` | Opposite-coloured bishops | trade | Trade into a won endgame |
| `lc-9PWGI` | Rook versus minor pieces and material balance | mateNet | Mate in 3 with the rook |
| `lc-9d8PX` | Rook versus minor pieces and material balance | backRank | Mate in 2 on the back rank |
| `lc-9eXvi` | Rook endings | skewer | Skewer wins the rook |
| `lc-ALGsV` | Rook endings | runaway | The runaway d-pawn |
| `lc-BDPQ1` | Bishops, knights and the blockade | mateNet | Mate in 2 with the pawn |
| `lc-DbRsV` | Winconditions: the two ways endgames end | runaway | Breakthrough: the c-pawn runs |
| `lc-E9Hod` | Rook endings | mateNet | Mate in 5 with the rook |
| `lc-FEyo3` | Winconditions: the two ways endgames end | mateNet | Mate in 2 with the queen |
| `lc-HIYZl` | Winconditions: the two ways endgames end | backRank | Mate in 2 on the back rank |
| `lc-HfmsU` | Passed pawns, majorities and races | mateNet | Mate in 2 with the rook |
| `lc-ISOAr` | Rook endings | pin | Pin with the rook |
| `lc-L3GIc` | Rook endings | win | Find the best plan: rook each |
| `lc-MDK0k` | Opposition, key squares and tempo | win | Zugzwang: make them run out of safe moves |
| `lc-NDQvn` | Bishops, knights and the blockade | promotion | Promote the f-pawn |
| `lc-Ol4Dx` | Opposition, key squares and tempo | mateNet | Mate in 1 with the rook |
| `lc-PHPWR` | Opposite-coloured bishops | mateNet | Mate in 1 with the rook |
| `lc-PTe31` | Winconditions: the two ways endgames end | promotion | Promote the f-pawn and win the rook |
| `lc-Ph8Sk` | Winconditions: the two ways endgames end | discovered | Discovered attack wins the queen |
| `lc-QtT8T` | Opposite-coloured bishops | material | Win the rook on c8 |
| `lc-S5iby` | Bishops, knights and the blockade | promotion | Promote the d-pawn |
| `lc-SV1kB` | Winconditions: the two ways endgames end | mateNet | Mate in 2 with the queen |
| `lc-T4Sbu` | Passed pawns, majorities and races | pin | Pin wins the bishop |
| `lc-Xb8Z1` | Opposition, key squares and tempo | win | Zugzwang: make them run out of safe moves |
| `lc-XpdRd` | Bishops, knights and the blockade | promotion | Promote the g-pawn |
| `lc-XwK8x` | Conversion, fortresses and exchanging | material | Win the pawn on h4 |
| `lc-hGXo6` | Passed pawns, majorities and races | fork | Fork wins the queen |
| `lc-i5omx` | Passed pawns, majorities and races | quietThreat | A quiet move wins the rook |
| `lc-kPDuf` | Rook versus minor pieces and material balance | skewer | Skewer wins the queen |
| `lc-m0RnP` | Passed pawns, majorities and races | mateNet | Mate in 2 with the rook |
| `lc-mSGv8` | Conversion, fortresses and exchanging | promotion | Promote the c-pawn |
| `lc-oJQel` | Winconditions: the two ways endgames end | fork | Fork wins the rook |
| `lc-ocBkM` | Passed pawns, majorities and races | fork | Fork wins the queen |
| `lc-peTvH` | Opposition, key squares and tempo | runaway | Breakthrough: the b-pawn runs |
| `lc-tquEH` | Conversion, fortresses and exchanging | removal | Removing the defender wins the rook |
| `lc-vtGTA` | Opposite-coloured bishops | promotion | Promote the d-pawn |
| `lc-w0mSX` | Bishops, knights and the blockade | deflection | Deflection wins the knight |
| `lc-1yHog` | Rook versus minor pieces and material balance | mateNet | Mate in 6 with a promotion |
| `lc-2GyPL` | Opposition, key squares and tempo | win | Win the knight on f4 |
| `lc-2y11K` | Passed pawns, majorities and races | promotion | Promote the e-pawn |
| `lc-5UybD` | Bishops, knights and the blockade | promotion | Promote the d-pawn |
| `lc-8OATu` | Opposition, key squares and tempo | material | Win the queen on d8 |
| `lc-8mDNj` | Conversion, fortresses and exchanging | material | Win the pawn on f5 |
| `lc-8nmO8` | Winconditions: the two ways endgames end | mateNet | Mate in 1 with the rook |
| `lc-AUCkJ` | Conversion, fortresses and exchanging | mateNet | Mate in 1 with the queen |
| `lc-DP2Dq` | Basic mates and mating technique | mateNet | Mate in 3 with the queen |
| `lc-DXU3a` | Conversion, fortresses and exchanging | backRank | Mate in 1 on the back rank |
| `lc-EHiQY` | Basic mates and mating technique | mateNet | Mate in 1 with the queen |
| `lc-FAFlE` | Rook versus minor pieces and material balance | deflection | Deflection wins the knight |
| `lc-K5sBt` | Passed pawns, majorities and races | mateNet | Mate in 2 with the bishop |
| `lc-MwuyV` | Queen endings | mateNet | Mate in 1 with the queen |
| `lc-PWJQu` | Bishops, knights and the blockade | promotion | Promote the e-pawn |
| `lc-PqQcL` | Rook endings | win | Find the only defence: rook each |
| `lc-QEwdo` | Winconditions: the two ways endgames end | fork | Fork wins the rook |
| `lc-T851t` | Winconditions: the two ways endgames end | pin | Pin wins the queen |
| `lc-TIRyk` | Rook endings | mateNet | Mate in 1 with the rook |
| `lc-Tgcth` | Queen endings | skewer | Skewer wins the pawn |
| `lc-U70p8` | Opposition, key squares and tempo | win | Find the best plan: king and pawn |
| `lc-VAS9W` | Opposition, key squares and tempo | material | Win the pawn on h4 |
| `lc-VgTK8` | Winconditions: the two ways endgames end | pin | Pin wins the rook |
| `lc-YYgmv` | Bishops, knights and the blockade | win | The quiet move that changes everything |
| `lc-aUNuB` | Rook versus minor pieces and material balance | skewer | Skewer wins the queen |
| `lc-hbGzs` | Bishops, knights and the blockade | promotion | Promote the g-pawn |
| `lc-jCLsq` | Basic mates and mating technique | mateNet | Mate in 2 with the queen |
| `lc-m4Rgk` | Passed pawns, majorities and races | runaway | Breakthrough: the d-pawn runs |
| `lc-m6WFe` | Bishops, knights and the blockade | runaway | The runaway f-pawn |
| `lc-mavOY` | Bishops, knights and the blockade | runaway | The runaway a-pawn |
| `lc-ocER5` | Passed pawns, majorities and races | runaway | The runaway d-pawn |
| `lc-pnt0q` | Passed pawns, majorities and races | win | Find the only defence: king and pawn |
| `lc-r4PXY` | Conversion, fortresses and exchanging | material | Win the pawn on f4 |
| `lc-s49pZ` | Rook versus minor pieces and material balance | backRank | Mate in 3 on the back rank |
| `lc-sjZP8` | Passed pawns, majorities and races | skewer | Skewer with the rook |
| `lc-uL1BA` | Passed pawns, majorities and races | fork | Fork wins the queen |
| `lc-uYfdI` | Winconditions: the two ways endgames end | mateNet | Mate in 2 with the rook |
| `lc-wUIPK` | Queen endings | mateNet | Mate in 2 with the pawn |
| `lc-wZb4M` | Passed pawns, majorities and races | skewer | Skewer wins the queen |
| `lc-xRbrL` | Rook versus minor pieces and material balance | promotion | Promote the h-pawn |
| `lc-10wbo` | Passed pawns, majorities and races | promotion | Promote the c-pawn and win the bishop |
| `lc-1cFyH` | Bishops, knights and the blockade | runaway | The runaway g-pawn |
| `lc-1g6ER` | Fortress and anti-fortress | win | Zugzwang: make them run out of safe moves |
| `lc-1lOKk` | Conversion, fortresses and exchanging | quietThreat | A quiet move with a threat |
| `lc-5STDu` | Rook endings | win | Find the best plan: rook each |
| `lc-7WvMG` | Grandmaster technique | mateNet | Mate in 2 with the pawn |
| `lc-As6Kk` | Conversion, fortresses and exchanging | fork | Fork with the knight |
| `lc-AvAxT` | Rook endings | pin | Pin with the rook |
| `lc-BroaT` | Opposition, key squares and tempo | runaway | The runaway h-pawn |
| `lc-C73cj` | Passed pawns, majorities and races | deflection | Deflection wins the rook |
| `lc-EGFs2` | Winconditions: the two ways endgames end | mateNet | Mate in 4 with the queen |
| `lc-FGk7H` | Grandmaster technique | mateNet | Mate in 1 with the knight |
| `lc-GxCfh` | Rook versus minor pieces and material balance | fork | Fork wins the queen |
| `lc-IOZo8` | Winconditions: the two ways endgames end | skewer | Skewer wins the queen |
| `lc-J5o1Y` | Winconditions: the two ways endgames end | win | Find the only defence: bishop against knight |
| `lc-LCImq` | Bishops, knights and the blockade | promotion | Promote the e-pawn |
| `lc-LrDuo` | Fortress and anti-fortress | promotion | Promote the d-pawn |
| `lc-MrC8W` | Rook versus minor pieces and material balance | promotion | Promote the b-pawn and win the rook |
| `lc-SoJVA` | Opposite-coloured bishops | runaway | Breakthrough: the b-pawn runs |
| `lc-TQ3cF` | Passed pawns, majorities and races | promotion | Promote the b-pawn |
| `lc-UJFHe` | Transformations and structure-born endgames | promotion | Promote the h-pawn |
| `lc-VtvcA` | Rook endings | win | Win the pawn on e7 |
| `lc-WngNr` | Planning, prophylaxis and the king | material | Win the pawn on g6 |
| `lc-XJIhN` | Transformations and structure-born endgames | material | Win the pawn on a4 |
| `lc-ay6rK` | Transformations and structure-born endgames | material | Win the pawn on h5 |
| `lc-cM39C` | Conversion, fortresses and exchanging | deflection | Deflection with the queen |
| `lc-cPkeY` | Bishops, knights and the blockade | runaway | The runaway g-pawn |
| `lc-e8NRx` | Queen endings | mateNet | Mate in 3 with the pawn |
| `lc-f1VgJ` | Bishops, knights and the blockade | removal | Removing the defender wins the knight |
| `lc-fReXg` | Rook versus minor pieces and material balance | runaway | The runaway g-pawn |
| `lc-iqIeM` | Grandmaster technique | mateNet | Mate in 2 with the rook |
| `lc-l9zPV` | Queen endings | mateNet | Mate in 1 with the queen |
| `lc-o4Cgz` | Passed pawns, majorities and races | promotion | Promote the f-pawn and win the rook |
| `lc-pFMJj` | Queen endings | skewer | Skewer wins the queen |
| `lc-pNyg1` | Planning, prophylaxis and the king | runaway | The runaway c-pawn |
| `lc-qanJ3` | Opposition, key squares and tempo | win | The quiet move that changes everything |
| `lc-rGZkW` | Opposite-coloured bishops | win | The runaway pawn: bishop against king and pawns |
| `lc-rTlPc` | Planning, prophylaxis and the king | promotion | Promote the a-pawn |
| `lc-sdb8H` | Fortress and anti-fortress | promotion | Promote the h-pawn |
| `lc-sxXMm` | Opposition, key squares and tempo | win | Zugzwang: make them run out of safe moves |
| `lc-tcNZK` | Opposite-coloured bishops | runaway | The runaway a-pawn |
| `mg-lc-t9OZp` | Middlegame · The Plan-Selection Method: From Imbalances to Plans | quietThreat | A quiet move wins the rook |
| `mg-lc-fDwSk` | Middlegame · The Plan-Selection Method: From Imbalances to Plans | mateNet | Mate in 3 with the rook |
| `mg-lc-8g4h0` | Middlegame · Prophylaxis I: What Does My Opponent Want? | mateNet | Mate in 2 with the rook |
| `mg-lc-zQU2Z` | Middlegame · Prophylaxis I: What Does My Opponent Want? | removal | Removing the defender wins the rook |
| `mg-lc-eY6Nb` | Middlegame · Prophylaxis I: What Does My Opponent Want? | skewer | Skewer wins the queen |
| `mg-lc-KEPe0` | Middlegame · Development Lead and the Uncastled King | fork | Fork wins the rook |
| `mg-lc-134eC` | Middlegame · Development Lead and the Uncastled King | fork | Fork wins the queen |
| `mg-lc-jRnke` | Middlegame · Prophylaxis Masterclass: Overprotection, Restraint, Preventing Counterplay | mateNet | Mate in 2 with the queen |
| `mg-lc-rY8rl` | Middlegame · Prophylaxis Masterclass: Overprotection, Restraint, Preventing Counterplay | backRank | Mate in 3 on the back rank |
