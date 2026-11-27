# Course audit (tools/course_truth.mjs)

Generated from the board and Stockfish 19 (depth 16) with the app's own Coach Brain (lc83.js).

## Solutions where Stockfish prefers another move (5)

All of these keep the same result (the evaluation after the course move is within a few tenths of Stockfish's move, or both mate). The course move stays; the Runner already accepts equal alternatives through the engine check.

- `bp-p0-3`: course e3, Stockfish Kf4 (eval 590, after the course move 587)
- `bp-p1-2`: course a5, Stockfish Ke4 (eval 648, after the course move 622)
- `bp-p1-5`: course Rh1, Stockfish Rh3 (eval 0, after the course move 0)
- `mspc-caro-adv-l5-trade-the-bishop`: course Nxe3, Stockfish Qd7 (eval -47, after the course move -39)
- `mspc-colle-e4-l5-blockade`: course Bd4, Stockfish Bb3 (eval 99, after the course move 76)

## Text problems (20)

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
- `mg-kg-95803898562-67`: generated text failed the check: exf6 (kept the old text)
- `mg-kg-105211280657-50`: generated text failed the check: Rxe7 (kept the old text)
- `mspc-caro-adv-l3-regain-pawn`: MSPC case names dxc5, pawn on d6 that is not on the board in this line
- `mspc-caro-adv-l4-pin-on-f3`: MSPC case names dxc5 that is not on the board in this line
- `mspc-colle-e4-l3-queen-recapture`: MSPC case names bishop on e4 that is not on the board in this line
- `mspc-colle-nbd7-l2-rook-recapture`: MSPC case names bishop on e4 that is not on the board in this line
- `mspc-colle-nbd7-l3-wedge`: MSPC case names Nbd7 that is not on the board in this line
- `mspc-slav-meran-l2-the-break`: MSPC case names dxc4 that is not on the board in this line
- `mspc-slav-meran-l4-b4-counter`: MSPC case names pawn on d5 that is not on the board in this line

## Rewritten drills (301): what each one really teaches

Compare the lesson topic with what the solution really does: a drill whose motif does not match its chapter is a candidate to move to another chapter.

| id | lesson topic | what the solution does | new title |
|---|---|---|---|
| `kg-143850627920-107` | Opposition, key squares and tempo | material | Win the queen on g8 |
| `kg-185100776126-98` | Passed pawns, majorities and races | win | Passer Wincondition vocabulary |
| `kg-125093330103-81` | Passed pawns, majorities and races | material | Win the pawn on e5 |
| `kg-108932498215-79` | Conversion, fortresses and exchanging | skewer | Skewer wins the pawn |
| `kg-98331264253-95` | Winconditions: the two ways endgames end | quietThreat | A quiet move with a threat |
| `kg-104530875093-103` | Winconditions: the two ways endgames end | skewer | Skewer wins the pawn |
| `kg-104267543781-106` | Queen endings | promotion | Promote the g-pawn |
| `kg-82189006250-114` | Winconditions: the two ways endgames end | material | Win the queen on a1 |
| `kg-101456170114-74` | Winconditions: the two ways endgames end | promotion | Promote the c-pawn |
| `kg-101330455138-76` | Winconditions: the two ways endgames end | material | Win the rook on e6 |
| `kg-118072196149-112` | Queen endings | promotion | Promote the a-pawn |
| `kg-101456170114-72` | Winconditions: the two ways endgames end | promotion | Promote the c-pawn |
| `kg-103981899771-82` | Winconditions: the two ways endgames end | win | 0.5 The Endgame Scan |
| `kg-95808317302-75` | Winconditions: the two ways endgames end | runaway | The runaway g-pawn |
| `kg-101455845942-55` | Winconditions: the two ways endgames end | win | 0.6 The Conversion Ladder |
| `kg-172536858052-103` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-115412374605-81` | Winconditions: the two ways endgames end | promotion | Promote the a-pawn |
| `kg-94131245360-76` | Conversion, fortresses and exchanging | material | Win the rook on b2 |
| `kg-95728247674-94` | Winconditions: the two ways endgames end | material | Win the rook on g5 |
| `kg-119739049573-92` | Conversion, fortresses and exchanging | win | Ahead → trade pieces, not pawns. Behind → trade pawns, not pieces |
| `kg-115412374605-83` | Passed pawns, majorities and races | promotion | Promote the a-pawn |
| `kg-170745843914-84` | The rule of the square and first passed pawns | win | King in front, pawn behind |
| `kg-184670247024-112` | The rule of the square and first passed pawns | draw | Find the drawing move |
| `kg-136688726580-155` | The rule of the square and first passed pawns | draw | Find the drawing move |
| `kg-101437712726-67` | The rule of the square and first passed pawns | material | Win the rook on b2 |
| `kg-94081740796-95` | Laws that decide endgames | removal | Removing the defender wins the pawn |
| `kg-94081740796-123` | Core principles and vocabulary | win | Activate the king |
| `kg-101236245168-78` | Core principles and vocabulary | win | Activate the king |
| `kg-172536858052-99` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-118072196149-86` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-142915753198-100` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-143850627920-141` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-171579937380-74` | Opposition, key squares and tempo | win | Key squares |
| `kg-184445377108-96` | Opposition, key squares and tempo | material | Win the pawn on f5 |
| `kg-123968486431-123` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-115934384085-114` | Rook endings | win | Cut-off geometry |
| `kg-125258918881-104` | Rook endings | win | Cut-off geometry |
| `kg-143850627920-135` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-97372198311-49` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-109354958019-89` | Passed pawns, majorities and races | runaway | The runaway a-pawn |
| `kg-125174958653-122` | Passed pawns, majorities and races | runaway | The runaway h-pawn |
| `kg-118072196149-108` | Passed pawns, majorities and races | promotion | Promote the a-pawn |
| `kg-115653509717-182` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-136145360518-134` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-108508231233-105` | Bishops, knights and the blockade | material | Win the bishop on g3 |
| `kg-113589062667-67` | Bishops, knights and the blockade | win | Bishops stop Passer Winconditions from a distance; knights stop them best from directly in front |
| `kg-124655992395-78` | Rook endings | draw | Find the drawing move |
| `kg-94131245360-64` | Rook endings | draw | Find the drawing move |
| `kg-144010780652-157` | Rook endings | runaway | The runaway a-pawn |
| `kg-101236245168-56` | Rook endings | win | Activity first |
| `kg-142161597868-119` | Conversion, fortresses and exchanging | material | Win the queen on h5 |
| `kg-105731955463-105` | Conversion, fortresses and exchanging | material | Win the pawn on a5 |
| `kg-105194457669-137` | Conversion, fortresses and exchanging | runaway | The runaway g-pawn |
| `kg-142915753198-106` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-143850627920-153` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-142915753198-110` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-123432656681-113` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-184662523360-57` | Passed pawns, majorities and races | material | Win the pawn on e6 |
| `kg-173929443396-68` | Transformations and structure-born endgames | win | A protected Passer Wincondition cannot be captured by the king alone |
| `kg-115412374605-77` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-172536858052-107` | Opposition, key squares and tempo | promotion | Promote the h-pawn |
| `kg-115326541599-87` | Rook endings | win | Activity as material |
| `kg-115653509717-154` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-113854242447-73` | Bishops, knights and the blockade | material | Win the pawn on c5 |
| `kg-173019988864-109` | Winconditions: the two ways endgames end | mateNet | Mate in 2 with the rook |
| `kg-143850627920-123` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-130628998055-65` | Rook endings | draw | Find the drawing move |
| `kg-171597951290-77` | Rook endings | win | The rook on the 7th rank |
| `kg-113665219497-76` | Rook endings | draw | Find the drawing move |
| `kg-145540556038-103` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-109187492441-49` | Bishops, knights and the blockade | material | Win the pawn on b5 |
| `kg-172656514060-66` | Bishops, knights and the blockade | quietThreat | A quiet move with a threat |
| `kg-172698203830-93` | Bishops, knights and the blockade | runaway | The runaway a-pawn |
| `kg-172839738884-114` | Bishops, knights and the blockade | win | Knight endings behave like pawn endings |
| `kg-173323291218-127` | Conversion, fortresses and exchanging | draw | Find the drawing move |
| `kg-174217788014-107` | Opposite-coloured bishops | material | Win the pawn on b7 |
| `kg-115418895421-118` | Rook versus minor pieces and material balance | draw | Find the drawing move |
| `kg-113512781355-179` | Rook versus minor pieces and material balance | draw | Find the drawing move |
| `kg-115653509717-158` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-186659963834-77` | Bishops, knights and the blockade | win | Blockade with the right piece |
| `kg-113779820817-70` | Conversion, fortresses and exchanging | win | Do not hurry |
| `kg-121808971217-98` | Conversion, fortresses and exchanging | win | The pawn-ending test |
| `kg-136798328538-64` | Transformations and structure-born endgames | win | The breakthrough |
| `kg-123432656681-85` | Passed pawns, majorities and races | fork | Fork wins the knight |
| `kg-113488157221-68` | Passed pawns, majorities and races | runaway | Breakthrough: the f-pawn runs |
| `kg-144827592474-89` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-186858718290-63` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-104262101387-108` | Rook versus minor pieces and material balance | material | Win the rook on a7 |
| `kg-136817540486-66` | Transformations and structure-born endgames | win | Mined squares (mutual zugzwang) |
| `kg-173656688896-93` | Bishops, knights and the blockade | fork | Fork wins the bishop |
| `kg-173767537722-103` | Bishops, knights and the blockade | win | Knight vs rook pawn on the 7th |
| `kg-145001446258-110` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-136071834682-106` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-172656514060-70` | Bishops, knights and the blockade | quietThreat | A quiet move with a threat |
| `kg-125856555819-77` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-186858718290-87` | Passed pawns, majorities and races | promotion | Promote the b-pawn |
| `kg-146030666952-117` | Passed pawns, majorities and races | promotion | Promote the g-pawn |
| `kg-145540556038-111` | Rook endings | draw | Find the drawing move |
| `kg-172698203830-65` | Planning, prophylaxis and the king | quietThreat | A quiet move wins the bishop |
| `kg-123611141578-84` | Planning, prophylaxis and the king | win | Domination |
| `kg-174410301520-122` | Grandmaster technique | draw | Find the drawing move |
| `kg-136878671744-98` | Fortress and anti-fortress | draw | Find the drawing move |
| `kg-174324223042-73` | Grandmaster technique | fork | Fork wins the rook |
| `kg-169354933430-96` | Planning, prophylaxis and the king | win | Schematic thinking |
| `kg-173369553034-110` | Planning, prophylaxis and the king | material | Win the pawn on g3 |
| `kg-184248058720-118` | Rook versus minor pieces and material balance | material | Win the pawn on e5 |
| `kg-140682082606-99` | Conversion, fortresses and exchanging | win | Up the exchange? |
| `kg-170425754086-72` | Transformations and structure-born endgames | material | Win the pawn on d5 |
| `kg-174169793606-80` | Transformations and structure-born endgames | fork | Fork wins the knight |
| `kg-115398559317-121` | Transformations and structure-born endgames | win | Sacrifice a pawn to create a second Wincondition |
| `kg-169355731336-142` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-172839738884-98` | Passed pawns, majorities and races | win | Advance your Passer Winconditions when it gains space or ties the opponent down; blockade the opponent's before they gain momentum |
| `kg-186858718290-99` | Passed pawns, majorities and races | win | Majorities matter more as material decreases |
| `kg-173466547628-113` | Conversion, fortresses and exchanging | material | Win the bishop on c4 |
| `kg-123613900786-75` | Conversion, fortresses and exchanging | win | Win the rook on b5 |
| `kg-123509398244-68` | Conversion, fortresses and exchanging | win | Know what each exchange does |
| `kg-173928899960-120` | Conversion, fortresses and exchanging | draw | Find the drawing move |
| `kg-174460367674-73` | Rook versus minor pieces and material balance | win | Material by the numbers (Kaufman's database findings) |
| `kg-185749533028-96` | Fortress and anti-fortress | material | Win the pawn on g5 |
| `kg-174410301520-124` | Grandmaster technique | draw | Find the drawing move |
| `kg-125093330103-83` | Winconditions: the two ways endgames end | win | Spend the Passer Wincondition at the right moment |
| `kg-146030666952-113` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-136878671744-104` | Winconditions: the two ways endgames end | promotion | Promote the b-pawn |
| `kg-187395488832-112` | Fortress and anti-fortress | material | Win the pawn on d6 |
| `kg-173767537722-87` | Opposition, key squares and tempo | win | Domination wins minor pieces |
| `mg-kg-95701893030-67` | The Blunder Check: Making M Automatic | win | Win the rook on g1 |
| `mg-kg-98915221133-21` | The Blunder Check: Making M Automatic | material | Win the bishop on f6 |
| `mg-kg-98591682179-43` | The Blunder Check: Making M Automatic | win | The Blunder Check: Making M Automatic |
| `mg-kg-95807471502-52` | The Blunder Check: Making M Automatic | pin | Pin with the rook |
| `mg-kg-103970452959-47` | The Blunder Check: Making M Automatic | quietThreat | A quiet move with a threat |
| `mg-kg-104605175611-51` | Direct Threats: Making Them and Meeting Them | pin | Pin holds the draw |
| `mg-kg-108421295203-20` | Direct Threats: Making Them and Meeting Them | quietThreat | A quiet move wins the bishop |
| `mg-kg-109455669043-39` | Direct Threats: Making Them and Meeting Them | quietThreat | A quiet move with a threat |
| `mg-kg-104670712861-42` | Direct Threats: Making Them and Meeting Them | quietThreat | A quiet move with a threat |
| `mg-kg-144285880952-33` | Direct Threats: Making Them and Meeting Them | quietThreat | A quiet move with a threat |
| `mg-kg-165840590334-53` | Defending | draw | Find the drawing move |
| `mg-kg-105718828985-22` | Defending | discovered | Discovered attack wins the knight |
| `mg-kg-137567716516-30` | Defending | quietThreat | A quiet move with a threat |
| `mg-kg-109453936951-33` | Defending | quietThreat | A quiet move with a threat |
| `mg-kg-174126542058-40` | Synthesis: The Full Grandmaster MSPC Loop | win | Win the rook on h8 |
| `mg-kg-174419031530-43` | Defending | quietThreat | A quiet move with a threat |
| `mg-kg-184056134368-33` | Prophylaxis | draw | Find the drawing move |
| `mg-kg-174330535664-37` | Defending | quietThreat | A quiet move with a threat |
| `mg-kg-121376399105-24` | Prophylaxis | draw | Find the drawing move |
| `mg-kg-170980698128-20` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | win | Prophylaxis Masterclass: Overprotection, Restraint, Preventing Counterplay |
| `mg-kg-172529612438-43` | Prophylaxis | skewer | Skewer wins the knight |
| `mg-kg-143421318696-29` | Prophylaxis | quietThreat | A quiet move with a threat |
| `mg-kg-184702538536-30` | Prophylaxis | draw | Find the drawing move |
| `mg-kg-174140164294-30` | Synthesis: The Full Grandmaster MSPC Loop | win | Prophylaxis Masterclass: Overprotection, Restraint, Preventing Counterplay |
| `mg-kg-173990300252-29` | Prophylaxis | discovered | Discovered attack wins the queen |
| `mg-kg-174332570588-27` | Synthesis: The Full Grandmaster MSPC Loop | pin | Pin holds the draw |
| `mg-kg-105136868751-68` | Open Files and the Seventh Rank | draw | Find the drawing move |
| `mg-kg-108155363967-57` | Open Files and the Seventh Rank | draw | Find the drawing move |
| `mg-kg-108846716727-52` | Open Files and the Seventh Rank | win | Open Files and the Seventh Rank |
| `mg-kg-104525557069-83` | Open Files and the Seventh Rank | draw | Find the drawing move |
| `mg-kg-171106008162-21` | Regrouping: Improving the Worst Piece and Rerouting | draw | Find the drawing move |
| `mg-kg-170380226986-29` | Regrouping: Improving the Worst Piece and Rerouting | draw | Find the drawing move |
| `mg-kg-185422552916-27` | Regrouping: Improving the Worst Piece and Rerouting | draw | Find the drawing move |
| `mg-kg-146457537822-20` | Regrouping: Improving the Worst Piece and Rerouting | quietThreat | A quiet move with a threat |
| `mg-kg-137013926116-59` | Opposite-Side Castling: Pawn Storms and Tempo Counting | quietThreat | A quiet move with a threat |
| `mg-kg-136851866956-73` | Regrouping: Improving the Worst Piece and Rerouting | pin | Pin with the rook |
| `mg-kg-97460392093-37` | King Safety Basics | draw | Find the drawing move |
| `mg-kg-98218472801-63` | King Safety Basics | material | Win the pawn on g7 |
| `mg-kg-101442459716-27` | King Safety Basics | material | Win the knight on e6 |
| `mg-kg-101439643066-50` | King Safety Basics | quietThreat | A quiet move with a threat |
| `mg-kg-82189127106-27` | King Safety Basics | material | Win the bishop on d6 |
| `mg-kg-82176437366-73` | King Safety Basics | draw | Find the drawing move |
| `mg-kg-113593855283-52` | Hanging Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-131386745221-20` | Hanging Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-114454861643-45` | Hanging Pawns | trade | Trade into a won endgame |
| `mg-kg-113682585213-36` | Hanging Pawns | material | Win the pawn on b4 |
| `mg-kg-124225114305-50` | Hanging Pawns | win | Win the bishop on d5 |
| `mg-kg-113507431047-50` | Hanging Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-94071237148-27` | Piece Coordination and Activity | material | Win the knight on d5 |
| `mg-kg-97873175549-25` | Piece Coordination and Activity | quietThreat | A quiet move with a threat |
| `mg-kg-94089010912-20` | Finding and choosing a plan | draw | Find the drawing move |
| `mg-kg-95721352316-43` | Piece Coordination and Activity | quietThreat | A quiet move wins the knight |
| `mg-kg-104512249579-31` | Piece Coordination and Activity | win | Piece Coordination and Activity |
| `mg-kg-97204246047-27` | Piece Coordination and Activity | quietThreat | A quiet move with a threat |
| `mg-kg-186084890434-39` | Colour-Complex Domination | win | Colour-Complex Domination |
| `mg-kg-184248058720-112` | Colour-Complex Domination | skewer | Skewer wins the rook |
| `mg-kg-184989931504-29` | Colour-Complex Domination | quietThreat | A quiet move with a threat |
| `mg-kg-136073244696-49` | Colour-Complex Domination | fork | Fork wins the pawn |
| `mg-kg-172745044956-68` | Colour-Complex Domination | draw | Find the drawing move |
| `mg-kg-185921194824-34` | Colour-Complex Domination | pin | Pin with the queen |
| `mg-kg-113662220933-31` | Piece Exchanges: Which Pieces to Trade | win | Win the knight on a3 |
| `mg-kg-142887919292-54` | Piece Exchanges: Which Pieces to Trade | discovered | Discovered attack wins the bishop |
| `mg-kg-143536979866-21` | Piece Exchanges: Which Pieces to Trade | pin | Pin wins the knight |
| `mg-kg-109354277663-21` | Piece Exchanges: Which Pieces to Trade | win | Win the knight on e5 |
| `mg-kg-122823238325-26` | Piece Exchanges: Which Pieces to Trade | draw | Find the drawing move |
| `mg-kg-123962497275-49` | Piece Exchanges: Which Pieces to Trade | draw | Find the drawing move |
| `mg-kg-104508001609-54` | Finding and choosing a plan | fork | Fork wins the rook |
| `mg-kg-103977672221-43` | Finding and choosing a plan | draw | Find the drawing move |
| `mg-kg-94138948842-24` | Finding and choosing a plan | quietThreat | A quiet move with a threat |
| `mg-kg-146750791360-23` | Finding and choosing a plan | win | The Plan-Selection Method: From Imbalances to Plans |
| `mg-kg-169223765720-35` | Finding and choosing a plan | quietThreat | A quiet move with a threat |
| `mg-kg-170891024696-49` | Weak Squares, Outposts and Backward Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-125240991761-42` | The Isolated Queen's Pawn (Both Sides) | win | The Isolated Queen's Pawn (Both Sides) |
| `mg-kg-124979351489-24` | The Isolated Queen's Pawn (Both Sides) | quietThreat | A quiet move with a threat |
| `mg-kg-117325186703-66` | The Isolated Queen's Pawn (Both Sides) | win | The Isolated Queen's Pawn (Both Sides) |
| `mg-kg-143546250638-39` | The Isolated Queen's Pawn (Both Sides) | material | Win the rook on e4 |
| `mg-kg-115330779875-30` | The Isolated Queen's Pawn (Both Sides) | material | Win the pawn on d4 |
| `mg-kg-101455154730-60` | Loose Pieces and the CCA Scan | material | Win the bishop on h5 |
| `mg-kg-97460392093-41` | Core Tactical Patterns | pin | Pin with the rook |
| `mg-kg-101330455138-66` | Loose Pieces and the CCA Scan | material | Win the rook on e7 |
| `mg-kg-82182609742-36` | Loose Pieces and the CCA Scan | material | Win the knight on e2 |
| `mg-kg-95729689018-34` | Loose Pieces and the CCA Scan | material | Win the bishop on d6 |
| `mg-kg-82176550190-50` | Loose Pieces and the CCA Scan | material | Win the queen on b2 |
| `mg-kg-97376966997-52` | Core Tactical Patterns | quietThreat | A quiet move wins the bishop |
| `mg-kg-101406696238-71` | Core Tactical Patterns | fork | Fork wins the queen |
| `mg-kg-101279236646-40` | Core Tactical Patterns | fork | Fork with the knight |
| `mg-kg-95729909050-52` | Core Tactical Patterns | discovered | Discovered attack wins the queen |
| `mg-kg-95728011470-35` | Core Tactical Patterns | pin | Pin wins the rook |
| `mg-kg-105279673839-21` | Development Lead and the Uncastled King | material | Win the pawn on g2 |
| `mg-kg-105175251031-30` | Development Lead and the Uncastled King | material | Win the pawn on d5 |
| `mg-kg-105746357491-20` | Development Lead and the Uncastled King | fork | Fork with the knight |
| `mg-kg-82176503540-24` | Development Lead and the Uncastled King | win | Development Lead and the Uncastled King |
| `mg-kg-99625372361-29` | Development Lead and the Uncastled King | fork | Fork wins the rook |
| `mg-kg-97623557293-31` | Development Lead and the Uncastled King | win | Win the bishop on d3 |
| `mg-kg-173694101558-20` | Repertoire-to-Middlegame Bridges at Advanced Level | trade | Trade into a won endgame |
| `mg-kg-170380966396-20` | Repertoire-to-Middlegame Bridges at Advanced Level | trade | Trade into a won endgame |
| `mg-kg-137738253494-30` | Repertoire-to-Middlegame Bridges at Advanced Level | material | Win the bishop on a6 |
| `mg-kg-145336004368-20` | Repertoire-to-Middlegame Bridges at Advanced Level | trade | Trade into a won endgame |
| `mg-kg-168611113334-30` | The Positional Exchange Sacrifice and Other Positional Sacrifices | win | Win the knight on f4 |
| `mg-kg-136480966210-28` | Repertoire-to-Middlegame Bridges at Advanced Level | material | Win the knight on h3 |
| `mg-kg-174322181660-32` | Synthesis: The Full Grandmaster MSPC Loop | trade | Trade into a won endgame |
| `mg-kg-174410301520-70` | Grandmaster Calculation and Critical-Moment Decisions | quietThreat | A quiet move wins the knight |
| `mg-kg-174127039288-49` | Synthesis: The Full Grandmaster MSPC Loop | fork | Fork with the knight |
| `mg-kg-187535970256-40` | The Positional Exchange Sacrifice and Other Positional Sacrifices | draw | Find the drawing move |
| `mg-kg-137156707212-66` | Opposite-Side Castling: Pawn Storms and Tempo Counting | deflection | Deflection wins the bishop |
| `mg-kg-185545515950-31` | Pawn Centres, Majorities and Mobile Pawn Masses | quietThreat | A quiet move with a threat |
| `mg-kg-172932178956-59` | The Positional Exchange Sacrifice and Other Positional Sacrifices | draw | Find the drawing move |
| `mg-kg-136510077240-42` | The Positional Exchange Sacrifice and Other Positional Sacrifices | discovered | Discovered attack wins the rook |
| `mg-kg-186394519162-55` | The Positional Exchange Sacrifice and Other Positional Sacrifices | win | Win the knight on e5 |
| `mg-kg-137125481040-49` | The Positional Exchange Sacrifice and Other Positional Sacrifices | discovered | Discovered attack wins the knight |
| `mg-kg-184665710860-56` | Middlegame-to-endgame transitions | material | Win the queen on f7 |
| `mg-kg-138521938836-44` | Middlegame-to-endgame transitions | material | Win the queen on c1 |
| `mg-kg-123399691516-56` | Middlegame-to-endgame transitions | draw | Find the drawing move |
| `mg-kg-173401001306-46` | Middlegame-to-endgame transitions | draw | Find the drawing move |
| `mg-kg-173259096730-46` | Middlegame-to-endgame transitions | win | Middlegame-to-Endgame Transitions II: Conversion Technique |
| `mg-kg-137509814856-26` | Middlegame-to-endgame transitions | draw | Find the drawing move |
| `mg-kg-173931787814-109` | Middlegame-to-endgame transitions | runaway | The runaway a-pawn |
| `mg-kg-185320508798-43` | Middlegame-to-endgame transitions | win | Middlegame-to-Endgame Transitions II: Conversion Technique |
| `mg-kg-172675555182-48` | Middlegame-to-endgame transitions | fork | Fork with the rook |
| `mg-kg-187405731530-56` | Middlegame-to-endgame transitions | material | Win the queen on f3 |
| `mg-kg-136836895326-43` | Middlegame-to-endgame transitions | win | Win the queen on g3 |
| `mg-kg-137082455912-26` | Middlegame-to-endgame transitions | material | Win the queen on d8 |
| `mg-kg-173990300252-31` | Transformation of Advantages | material | Win the knight on f7 |
| `mg-kg-186083816974-58` | Transformation of Advantages | trade | Trade into a won endgame |
| `mg-kg-184589327050-52` | The Initiative: Pawn Sacrifices for Time and Open Lines | win | Transformation of Advantages |
| `mg-kg-172974183526-41` | Transformation of Advantages | quietThreat | A quiet move with a threat |
| `mg-kg-123089771692-47` | Transformation of Advantages | material | Win the queen on f2 |
| `mg-kg-184664618028-43` | Transformation of Advantages | win | Transformation of Advantages |
| `mg-kg-113490648439-22` | Weak Squares, Outposts and Backward Pawns | win | Weak Squares, Outposts and Backward Pawns |
| `mg-kg-186658850282-56` | Weak Squares, Outposts and Backward Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-143351326364-41` | The Principle of Two Weaknesses | win | Weak Squares, Outposts and Backward Pawns |
| `mg-kg-184211800742-55` | Weak Squares, Outposts and Backward Pawns | fork | Fork wins the rook |
| `mg-kg-125417366269-49` | Weak Squares, Outposts and Backward Pawns | quietThreat | A quiet move wins the bishop |
| `mg-kg-171256600800-22` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | draw | Find the drawing move |
| `mg-kg-115401559163-52` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | win | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair |
| `mg-kg-143540373528-32` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | draw | Find the drawing move |
| `mg-kg-172566006562-27` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | win | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair |
| `mg-kg-143454091728-22` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | win | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair |
| `mg-kg-115999277905-25` | The Principle of Two Weaknesses | fork | Fork with the pawn |
| `mg-kg-119555401561-43` | The Principle of Two Weaknesses | draw | Find the drawing move |
| `mg-kg-143078603434-33` | The Principle of Two Weaknesses | draw | Find the drawing move |
| `mg-kg-125240991761-62` | The Principle of Two Weaknesses | quietThreat | A quiet move with a threat |
| `mg-kg-166012634736-37` | The Principle of Two Weaknesses | win | The Principle of Two Weaknesses |
| `mg-kg-137382547942-32` | Pawn Centres, Majorities and Mobile Pawn Masses | quietThreat | A quiet move wins the bishop |
| `mg-kg-145704919904-73` | Pawn Centres, Majorities and Mobile Pawn Masses | win | Pawn Centres, Majorities and Mobile Pawn Masses |
| `mg-kg-170745843914-40` | Pawn Centres, Majorities and Mobile Pawn Masses | quietThreat | A quiet move with a threat |
| `mg-kg-123506115046-44` | Pawn Centres, Majorities and Mobile Pawn Masses | win | Pawn Centres, Majorities and Mobile Pawn Masses |
| `mg-kg-185817479712-32` | Pawn Centres, Majorities and Mobile Pawn Masses | win | Pawn Centres, Majorities and Mobile Pawn Masses |
| `mg-kg-174418107022-26` | The Initiative: Pawn Sacrifices for Time and Open Lines | fork | Fork wins the pawn |
| `mg-kg-174460367674-37` | The Initiative: Pawn Sacrifices for Time and Open Lines | win | Win the pawn on c5 |
| `mg-kg-174322181660-38` | The Initiative: Pawn Sacrifices for Time and Open Lines | quietThreat | A quiet move with a threat |
| `mg-kg-174527620416-59` | The Initiative: Pawn Sacrifices for Time and Open Lines | draw | Find the drawing move |
| `mg-kg-136584574214-27` | The Initiative: Pawn Sacrifices for Time and Open Lines | material | Win the pawn on d4 |
| `mg-kg-144285269128-54` | Attacking the Castled King: Mating Patterns and the Greek Gift | material | Win the pawn on g7 |
| `mg-kg-108243613617-47` | Attacking the Castled King: Mating Patterns and the Greek Gift | backRank | Mate in 2 on the back rank |
| `mg-kg-109455004647-50` | Attacking the Castled King: Mating Patterns and the Greek Gift | fork | Fork wins the pawn |
| `mg-kg-107792531013-61` | Attacking the Castled King: Mating Patterns and the Greek Gift | fork | Fork wins the rook |
| `mg-kg-144285598338-44` | Attacking the Castled King: Mating Patterns and the Greek Gift | win | Win the queen on f1 |
| `mg-kg-140813794826-47` | Attacking the Castled King: Mating Patterns and the Greek Gift | win | Win the pawn on b2 |
| `mg-kg-108828034877-38` | Basic Pawn Breaks: Levers and Opening Lines | quietThreat | A quiet move with a threat |
| `mg-kg-108337257299-71` | Basic Pawn Breaks: Levers and Opening Lines | win | Basic Pawn Breaks: Levers and Opening Lines |
| `mg-kg-184260342644-34` | Opposite-Side Castling: Pawn Storms and Tempo Counting | quietThreat | A quiet move with a threat |
| `mg-kg-173755873730-34` | Opposite-Side Castling: Pawn Storms and Tempo Counting | win | Opposite-Side Castling: Pawn Storms and Tempo Counting |
| `mg-kg-136770410662-34` | Opposite-Side Castling: Pawn Storms and Tempo Counting | material | Win the queen on g7 |
| `mg-kg-184618063722-54` | Opposite-Side Castling: Pawn Storms and Tempo Counting | pin | Pin holds the draw |
| `mg-kg-164186350956-25` | Space, Restriction and Strangling the Opponent's Breaks | quietThreat | A quiet move with a threat |
| `mg-kg-186649736982-28` | Space, Restriction and Strangling the Opponent's Breaks | fork | Fork with the pawn |
| `mg-kg-109187492441-35` | Space, Restriction and Strangling the Opponent's Breaks | fork | Fork with the pawn |
| `mg-kg-113861957463-38` | Space, Restriction and Strangling the Opponent's Breaks | fork | Fork holds the draw |
| `mg-kg-174322181660-42` | Space, Restriction and Strangling the Opponent's Breaks | fork | Fork with the pawn |
| `mg-kg-170595612202-49` | The Carlsbad Structure and the Minority Attack | material | Win the knight on c5 |
| `mg-kg-187564599052-24` | The Carlsbad Structure and the Minority Attack | trade | Trade into a won endgame |
| `mg-kg-170922316006-29` | The Carlsbad Structure and the Minority Attack | win | The Carlsbad Structure and the Minority Attack |
| `mg-kg-118073937473-43` | The Carlsbad Structure and the Minority Attack | win | The Carlsbad Structure and the Minority Attack |
| `mg-kg-113493552729-25` | The Carlsbad Structure and the Minority Attack | win | Win the knight on f3 |
| `mg-kg-174376801088-36` | Synthesis: The Full Grandmaster MSPC Loop | material | Win the pawn on e6 |
