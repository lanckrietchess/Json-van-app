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
- `mg-kg-105211280657-50`: generated text failed the check: Rxe7, queen on e7 (kept the old text)
- `mspc-caro-adv-l3-regain-pawn`: MSPC case names dxc5, pawn on d6 that is not on the board in this line
- `mspc-caro-adv-l4-pin-on-f3`: MSPC case names dxc5 that is not on the board in this line
- `mspc-colle-e4-l3-queen-recapture`: MSPC case names bishop on e4 that is not on the board in this line
- `mspc-colle-nbd7-l2-rook-recapture`: MSPC case names bishop on e4 that is not on the board in this line
- `mspc-colle-nbd7-l3-wedge`: MSPC case names Nbd7 that is not on the board in this line
- `mspc-slav-meran-l2-the-break`: MSPC case names dxc4 that is not on the board in this line
- `mspc-slav-meran-l4-b4-counter`: MSPC case names pawn on d5 that is not on the board in this line

## Rewritten drills (305): what each one really teaches

Compare the lesson topic with what the solution really does: a drill whose motif does not match its chapter is a candidate to move to another chapter.

| id | lesson topic | what the solution does | new title |
|---|---|---|---|
| `kg-143850627920-107` | Opposition, key squares and tempo | material | Win the queen on g8 |
| `kg-125093330103-81` | Passed pawns, majorities and races | material | Win the pawn on e5 |
| `kg-185100776126-100` | Passed pawns, majorities and races | win | Passer Wincondition vocabulary |
| `kg-108932498215-79` | Conversion, fortresses and exchanging | skewer | Skewer wins the pawn |
| `kg-98331264253-95` | Winconditions: the two ways endgames end | quietThreat | A quiet move with a threat |
| `kg-104530875093-103` | Winconditions: the two ways endgames end | skewer | Skewer wins the pawn |
| `kg-104267543781-106` | Queen endings | promotion | Promote the g-pawn |
| `kg-94081740796-95` | Winconditions: the two ways endgames end | removal | Removing the defender wins the pawn |
| `kg-101330455138-76` | Winconditions: the two ways endgames end | material | Win the rook on e6 |
| `kg-118072196149-112` | Queen endings | promotion | Promote the a-pawn |
| `kg-101456170114-72` | Winconditions: the two ways endgames end | promotion | Promote the c-pawn |
| `kg-103981899771-82` | Winconditions: the two ways endgames end | win | 0.5 The Endgame Scan |
| `kg-97372198311-73` | Winconditions: the two ways endgames end | material | Win the pawn on b5 |
| `kg-172536858052-103` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-185100776126-98` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-94131245360-76` | Conversion, fortresses and exchanging | material | Win the rook on b2 |
| `kg-95728247674-94` | Winconditions: the two ways endgames end | material | Win the rook on g5 |
| `kg-119739049573-92` | Conversion, fortresses and exchanging | win | Ahead → trade pieces, not pawns. Behind → trade pawns, not pieces |
| `kg-172536858052-105` | The rule of the square and first passed pawns | promotion | Promote the h-pawn |
| `kg-170745843914-84` | The rule of the square and first passed pawns | win | King in front, pawn behind |
| `kg-184670247024-112` | The rule of the square and first passed pawns | draw | Find the drawing move |
| `kg-136688726580-155` | The rule of the square and first passed pawns | draw | Find the drawing move |
| `kg-101437712726-67` | The rule of the square and first passed pawns | material | Win the rook on b2 |
| `kg-101411351490-70` | Core principles and vocabulary | draw | Find the drawing move |
| `kg-101236245168-78` | Core principles and vocabulary | win | Activate the king |
| `kg-172536858052-99` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-118072196149-86` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-118072196149-98` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-142915753198-118` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-171579937380-74` | Opposition, key squares and tempo | win | Key squares |
| `kg-184445377108-96` | Opposition, key squares and tempo | material | Win the pawn on f5 |
| `kg-123968486431-123` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-166450045716-75` | Rook endings | win | Cut-off geometry |
| `kg-109352394083-89` | Winconditions: the two ways endgames end | win | Cut-off geometry |
| `kg-142915753198-106` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-113928623337-114` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-125174958653-122` | Passed pawns, majorities and races | runaway | The runaway h-pawn |
| `kg-109354958019-89` | Passed pawns, majorities and races | runaway | The runaway a-pawn |
| `kg-115412374605-77` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-118072196149-108` | Passed pawns, majorities and races | promotion | Promote the a-pawn |
| `kg-115653509717-150` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-136145360518-130` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-108508231233-105` | Bishops, knights and the blockade | material | Win the bishop on g3 |
| `kg-119739049573-96` | Bishops, knights and the blockade | win | Bishops stop Passer Winconditions from a distance; knights stop them best from directly in front |
| `kg-94131245360-64` | Rook endings | draw | Find the drawing move |
| `kg-101236245168-56` | Rook endings | win | Activity first |
| `kg-144010780652-157` | Rook endings | runaway | The runaway a-pawn |
| `kg-125177920531-99` | Conversion, fortresses and exchanging | material | Win the knight on g6 |
| `kg-105731955463-105` | Conversion, fortresses and exchanging | material | Win the pawn on a5 |
| `kg-105194457669-137` | Conversion, fortresses and exchanging | runaway | The runaway g-pawn |
| `kg-143850627920-153` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-142915753198-100` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-143850627920-145` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-123432656681-113` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-173929443396-68` | Transformations and structure-born endgames | win | A protected Passer Wincondition cannot be captured by the king alone |
| `kg-172536858052-107` | Opposition, key squares and tempo | promotion | Promote the h-pawn |
| `kg-115326541599-87` | Rook endings | win | Activity as material |
| `kg-115653509717-162` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-113854242447-73` | Bishops, knights and the blockade | material | Win the pawn on c5 |
| `kg-173019988864-109` | Winconditions: the two ways endgames end | mateNet | Mate in 2 with the rook |
| `kg-113854242447-77` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-122908515307-79` | Rook endings | win | Win the pawn on e4 |
| `kg-130628998055-65` | Rook endings | draw | Find the drawing move |
| `kg-113665219497-76` | Rook endings | draw | Find the drawing move |
| `kg-145540556038-111` | Rook endings | draw | Find the drawing move |
| `kg-109187492441-49` | Bishops, knights and the blockade | material | Win the pawn on b5 |
| `kg-173767537722-67` | Bishops, knights and the blockade | win | Bishop vs knight |
| `kg-172698203830-93` | Bishops, knights and the blockade | runaway | The runaway a-pawn |
| `kg-172839738884-114` | Bishops, knights and the blockade | win | Knight endings behave like pawn endings |
| `kg-173323291218-127` | Conversion, fortresses and exchanging | draw | Find the drawing move |
| `kg-174142198060-199` | Opposite-coloured bishops | material | Win the pawn on a7 |
| `kg-115418895421-118` | Rook versus minor pieces and material balance | draw | Find the drawing move |
| `kg-113512781355-179` | Rook versus minor pieces and material balance | draw | Find the drawing move |
| `kg-115653509717-154` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-171597951290-69` | Conversion, fortresses and exchanging | win | Do not hurry |
| `kg-121808971217-98` | Conversion, fortresses and exchanging | win | The pawn-ending test |
| `kg-136798328538-64` | Transformations and structure-born endgames | win | The breakthrough |
| `kg-113488157221-68` | Passed pawns, majorities and races | runaway | Breakthrough: the f-pawn runs |
| `kg-123614501423-109` | Passed pawns, majorities and races | win | Healthy majorities create Passer Winconditions; crippled (doubled) majorities often cannot |
| `kg-123432656681-85` | Passed pawns, majorities and races | fork | Fork wins the knight |
| `kg-145540556038-115` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-144827592474-89` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-136817540486-66` | Transformations and structure-born endgames | win | Corresponding squares |
| `kg-104262101387-108` | Rook versus minor pieces and material balance | material | Win the rook on a7 |
| `kg-173656688896-123` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-146030666952-117` | Passed pawns, majorities and races | promotion | Promote the g-pawn |
| `kg-186858718290-85` | Passed pawns, majorities and races | promotion | Promote the b-pawn |
| `kg-145540556038-103` | Rook endings | draw | Find the drawing move |
| `kg-172698203830-65` | Planning, prophylaxis and the king | quietThreat | A quiet move wins the bishop |
| `kg-173767537722-87` | Planning, prophylaxis and the king | win | Domination |
| `kg-174410301520-124` | Fortress and anti-fortress | draw | Find the drawing move |
| `kg-136878671744-106` | Fortress and anti-fortress | promotion | Promote the b-pawn |
| `kg-174410301520-122` | Grandmaster technique | draw | Find the drawing move |
| `kg-174324223042-73` | Grandmaster technique | fork | Fork wins the rook |
| `kg-169354933430-96` | Planning, prophylaxis and the king | win | Schematic thinking |
| `kg-173369553034-110` | Planning, prophylaxis and the king | win | Schematic thinking |
| `kg-184248058720-118` | Rook versus minor pieces and material balance | material | Win the pawn on e5 |
| `kg-140682082606-99` | Rook versus minor pieces and material balance | win | Up the exchange? |
| `kg-174169793606-80` | Transformations and structure-born endgames | fork | Fork wins the knight |
| `kg-136848902962-85` | Transformations and structure-born endgames | win | Win the pawn on a5 |
| `kg-115398559317-121` | Transformations and structure-born endgames | win | Sacrifice a pawn to create a second Wincondition |
| `kg-172839738884-98` | Passed pawns, majorities and races | promotion | Promote the h-pawn |
| `kg-136976390646-83` | Passed pawns, majorities and races | win | Advance your Passer Winconditions when it gains space or ties the opponent down; blockade the opponent's before they gain momentum |
| `kg-186858718290-99` | Passed pawns, majorities and races | runaway | The runaway a-pawn |
| `kg-136470533808-107` | Bishops, knights and the blockade | skewer | Skewer wins the knight |
| `kg-185831494300-67` | Conversion, fortresses and exchanging | material | Win the rook on a6 |
| `kg-123613900786-75` | Conversion, fortresses and exchanging | win | Win the rook on b5 |
| `kg-137873469960-109` | Conversion, fortresses and exchanging | promotion | Promote the g-pawn |
| `kg-185063618532-92` | Conversion, fortresses and exchanging | win | Know what each exchange does |
| `kg-173928899960-120` | Conversion, fortresses and exchanging | draw | Find the drawing move |
| `kg-174460367674-73` | Rook versus minor pieces and material balance | win | Material by the numbers (Kaufman's database findings) |
| `kg-125856555819-77` | Rook versus minor pieces and material balance | draw | Find the drawing move |
| `kg-174217788014-111` | Fortress and anti-fortress | material | Win the pawn on f5 |
| `kg-125093330103-83` | Winconditions: the two ways endgames end | win | Spend the Passer Wincondition at the right moment |
| `kg-186858718290-89` | Winconditions: the two ways endgames end | promotion | Promote the b-pawn |
| `kg-136878671744-102` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-187395488832-112` | Fortress and anti-fortress | material | Win the pawn on d6 |
| `kg-186858718290-63` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-144827592474-97` | Opposition, key squares and tempo | draw | Find the drawing move |
| `mg-kg-103970452959-47` | The Blunder Check: Making M Automatic | quietThreat | A quiet move with a threat |
| `mg-kg-101008105294-31` | The Blunder Check: Making M Automatic | trade | Trade into a won endgame |
| `mg-kg-94130945526-23` | The Blunder Check: Making M Automatic | material | Win the queen on d2 |
| `mg-kg-98912635135-55` | The Blunder Check: Making M Automatic | pin | Pin wins the knight |
| `mg-kg-95701893030-67` | The Blunder Check: Making M Automatic | win | Win the rook on g1 |
| `mg-kg-101408423932-34` | The Blunder Check: Making M Automatic | win | The Blunder Check: Making M Automatic |
| `mg-kg-105138606107-33` | Direct Threats: Making Them and Meeting Them | pin | Pin wins the rook |
| `mg-kg-104670712861-42` | Direct Threats: Making Them and Meeting Them | quietThreat | A quiet move wins the pawn |
| `mg-kg-104605175611-51` | Direct Threats: Making Them and Meeting Them | pin | Pin holds the draw |
| `mg-kg-144285880952-33` | Open Files and the Seventh Rank | quietThreat | A quiet move with a threat |
| `mg-kg-108829265901-57` | Direct Threats: Making Them and Meeting Them | quietThreat | A quiet move with a threat |
| `mg-kg-105812482807-45` | Defending | material | Win the pawn on c5 |
| `mg-kg-165840590334-53` | Defending | draw | Find the drawing move |
| `mg-kg-105358223601-22` | Defending | material | Win the knight on d4 |
| `mg-kg-104525557069-81` | Defending | draw | Find the drawing move |
| `mg-kg-109453936951-33` | Defending | quietThreat | A quiet move with a threat |
| `mg-kg-105050558653-45` | Defending | material | Win the pawn on f3 |
| `mg-kg-105718828985-22` | Defending | discovered | Discovered attack wins the knight |
| `mg-kg-174126542058-40` | Synthesis: The Full Grandmaster MSPC Loop | draw | Find the drawing move |
| `mg-kg-184056134368-33` | Defending | draw | Find the drawing move |
| `mg-kg-174419031530-43` | Prophylaxis | quietThreat | A quiet move with a threat |
| `mg-kg-173984958128-40` | Defending | fork | Fork wins the bishop |
| `mg-kg-121376399105-24` | Prophylaxis | draw | Find the drawing move |
| `mg-kg-166011097260-24` | Prophylaxis | pin | Pin wins the bishop |
| `mg-kg-124393808569-32` | The Principle of Two Weaknesses | draw | Find the drawing move |
| `mg-kg-125157004069-29` | Prophylaxis | draw | Find the drawing move |
| `mg-kg-124735115759-47` | Prophylaxis | draw | Find the drawing move |
| `mg-kg-174330535664-37` | Prophylaxis | quietThreat | A quiet move with a threat |
| `mg-kg-108846716727-52` | Open Files and the Seventh Rank | win | Open Files and the Seventh Rank |
| `mg-kg-105136868751-68` | Open Files and the Seventh Rank | material | Win the pawn on f4 |
| `mg-kg-104525557069-83` | Open Files and the Seventh Rank | draw | Find the drawing move |
| `mg-kg-171568789566-35` | Regrouping: Improving the Worst Piece and Rerouting | draw | Find the drawing move |
| `mg-kg-171106008162-21` | Regrouping: Improving the Worst Piece and Rerouting | draw | Find the drawing move |
| `mg-kg-185590229474-53` | Regrouping: Improving the Worst Piece and Rerouting | quietThreat | A quiet move with a threat |
| `mg-kg-170700286658-44` | Regrouping: Improving the Worst Piece and Rerouting | win | Regrouping: Improving the Worst Piece and Rerouting |
| `mg-kg-170380226986-29` | Regrouping: Improving the Worst Piece and Rerouting | draw | Find the drawing move |
| `mg-kg-136851866956-73` | Regrouping: Improving the Worst Piece and Rerouting | pin | Pin with the rook |
| `mg-kg-101439643066-50` | King Safety Basics | quietThreat | A quiet move with a threat |
| `mg-kg-99945731461-22` | King Safety Basics | material | Win the knight on e3 |
| `mg-kg-95800504886-21` | King Safety Basics | quietThreat | A quiet move with a threat |
| `mg-kg-98218472801-63` | King Safety Basics | material | Win the pawn on g7 |
| `mg-kg-101442459716-27` | King Safety Basics | material | Win the knight on e6 |
| `mg-kg-104497227541-33` | King Safety Basics | material | Win the bishop on f6 |
| `mg-kg-113593855283-52` | Hanging Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-131386745221-20` | Hanging Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-143355380168-34` | Hanging Pawns | discovered | Discovered attack wins the pawn |
| `mg-kg-113507431047-50` | Hanging Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-114454861643-45` | Hanging Pawns | win | Hanging Pawns |
| `mg-kg-113682585213-36` | Hanging Pawns | material | Win the pawn on b4 |
| `mg-kg-97873175549-25` | Piece Coordination and Activity | quietThreat | A quiet move with a threat |
| `mg-kg-95721352316-43` | Piece Coordination and Activity | quietThreat | A quiet move wins the knight |
| `mg-kg-94071237148-27` | Piece Coordination and Activity | material | Win the knight on d5 |
| `mg-kg-94089010912-20` | Finding and choosing a plan | draw | Find the drawing move |
| `mg-kg-104512249579-31` | Piece Coordination and Activity | win | Piece Coordination and Activity |
| `mg-kg-95808027894-31` | Piece Coordination and Activity | skewer | Skewer wins the knight |
| `mg-kg-184989931504-29` | Colour-Complex Domination | quietThreat | A quiet move with a threat |
| `mg-kg-123503538656-58` | Colour-Complex Domination | win | Colour-Complex Domination |
| `mg-kg-184248058720-112` | Colour-Complex Domination | skewer | Skewer wins the rook |
| `mg-kg-186084890434-39` | Colour-Complex Domination | win | Colour-Complex Domination |
| `mg-kg-137948480116-59` | Colour-Complex Domination | win | Colour-Complex Domination |
| `mg-kg-173308436152-126` | Colour-Complex Domination | pin | Pin with the queen |
| `mg-kg-123962497275-49` | Piece Exchanges: Which Pieces to Trade | draw | Find the drawing move |
| `mg-kg-109354277663-21` | Piece Exchanges: Which Pieces to Trade | win | Win the knight on e5 |
| `mg-kg-143536979866-21` | Piece Exchanges: Which Pieces to Trade | pin | Pin wins the knight |
| `mg-kg-142887919292-54` | Piece Exchanges: Which Pieces to Trade | discovered | Discovered attack wins the bishop |
| `mg-kg-122823238325-26` | Piece Exchanges: Which Pieces to Trade | draw | Find the drawing move |
| `mg-kg-113662220933-31` | Piece Exchanges: Which Pieces to Trade | draw | Find the drawing move |
| `mg-kg-100397623901-47` | Finding and choosing a plan | skewer | Skewer holds the draw |
| `mg-kg-103977672221-43` | Finding and choosing a plan | win | The Plan-Selection Method: From Imbalances to Plans |
| `mg-kg-99325561019-21` | Finding and choosing a plan | win | The Plan-Selection Method: From Imbalances to Plans |
| `mg-kg-169223765720-35` | Finding and choosing a plan | quietThreat | A quiet move wins the bishop |
| `mg-kg-170740709304-30` | Finding and choosing a plan | quietThreat | A quiet move wins the bishop |
| `mg-kg-125007579627-72` | The Isolated Queen's Pawn (Both Sides) | trade | Trade into a won endgame |
| `mg-kg-125240991761-42` | The Isolated Queen's Pawn (Both Sides) | win | The Isolated Queen's Pawn (Both Sides) |
| `mg-kg-170891024696-49` | Weak Squares, Outposts and Backward Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-124979351489-24` | The Isolated Queen's Pawn (Both Sides) | quietThreat | A quiet move with a threat |
| `mg-kg-143546250638-39` | The Isolated Queen's Pawn (Both Sides) | material | Win the rook on e4 |
| `mg-kg-117325186703-66` | The Isolated Queen's Pawn (Both Sides) | material | Win the pawn on f7 |
| `mg-kg-97460392093-41` | Core Tactical Patterns | pin | Pin wins the bishop |
| `mg-kg-103969756431-45` | Loose Pieces and the CCA Scan | material | Win the knight on e5 |
| `mg-kg-96664094111-28` | Loose Pieces and the CCA Scan | material | Win the knight on g4 |
| `mg-kg-95735378042-47` | Loose Pieces and the CCA Scan | material | Win the bishop on e6 |
| `mg-kg-95715122618-26` | Loose Pieces and the CCA Scan | material | Win the rook on a8 |
| `mg-kg-95729689018-34` | Loose Pieces and the CCA Scan | material | Win the bishop on d6 |
| `mg-kg-97376966997-52` | Core Tactical Patterns | quietThreat | A quiet move wins the bishop |
| `mg-kg-101406696238-71` | Core Tactical Patterns | fork | Fork wins the queen |
| `mg-kg-101279236646-40` | Core Tactical Patterns | fork | Fork with the knight |
| `mg-kg-101469241574-40` | Core Tactical Patterns | fork | Fork wins the rook |
| `mg-kg-94147791566-43` | Core Tactical Patterns | skewer | Skewer wins the rook |
| `mg-kg-105279673839-21` | Development Lead and the Uncastled King | material | Win the pawn on g2 |
| `mg-kg-105746357491-20` | Development Lead and the Uncastled King | fork | Fork with the knight |
| `mg-kg-105175251031-30` | Development Lead and the Uncastled King | material | Win the pawn on d5 |
| `mg-kg-97623557293-31` | Development Lead and the Uncastled King | discovered | Discovered attack wins the bishop |
| `mg-kg-99625372361-29` | Development Lead and the Uncastled King | fork | Fork wins the rook |
| `mg-kg-82176503540-24` | Development Lead and the Uncastled King | win | Development Lead and the Uncastled King |
| `mg-kg-170380966396-20` | Repertoire-to-Middlegame Bridges at Advanced Level | trade | Trade into a won endgame |
| `mg-kg-145591583942-26` | Repertoire-to-Middlegame Bridges at Advanced Level | discovered | Discovered attack wins the bishop |
| `mg-kg-173694101558-20` | Repertoire-to-Middlegame Bridges at Advanced Level | trade | Trade into a won endgame |
| `mg-kg-137738253494-30` | Repertoire-to-Middlegame Bridges at Advanced Level | material | Win the bishop on a6 |
| `mg-kg-168611113334-30` | The Positional Exchange Sacrifice and Other Positional Sacrifices | win | Win the knight on f4 |
| `mg-kg-145336004368-20` | Repertoire-to-Middlegame Bridges at Advanced Level | trade | Trade into a won endgame |
| `mg-kg-174322181660-32` | Synthesis: The Full Grandmaster MSPC Loop | win | Win the pawn on g5 |
| `mg-kg-174126148394-23` | Synthesis: The Full Grandmaster MSPC Loop | win | Grandmaster Calculation and Critical-Moment Decisions |
| `mg-kg-174460833408-61` | Grandmaster Calculation and Critical-Moment Decisions | quietThreat | A quiet move with a threat |
| `mg-kg-174419031530-47` | Grandmaster Calculation and Critical-Moment Decisions | win | Grandmaster Calculation and Critical-Moment Decisions |
| `mg-kg-174140164294-30` | Synthesis: The Full Grandmaster MSPC Loop | win | Grandmaster Calculation and Critical-Moment Decisions |
| `mg-kg-187535970256-40` | The Positional Exchange Sacrifice and Other Positional Sacrifices | draw | Find the drawing move |
| `mg-kg-186394519162-55` | The Positional Exchange Sacrifice and Other Positional Sacrifices | win | Win the knight on e5 |
| `mg-kg-137125481040-49` | The Positional Exchange Sacrifice and Other Positional Sacrifices | discovered | Discovered attack wins the knight |
| `mg-kg-185545515950-31` | Space, Restriction and Strangling the Opponent's Breaks | quietThreat | A quiet move with a threat |
| `mg-kg-172932178956-59` | The Positional Exchange Sacrifice and Other Positional Sacrifices | draw | Find the drawing move |
| `mg-kg-136510077240-42` | The Positional Exchange Sacrifice and Other Positional Sacrifices | discovered | Discovered attack wins the rook |
| `mg-kg-123399691516-56` | Middlegame-to-endgame transitions | draw | Find the drawing move |
| `mg-kg-172675555182-48` | Middlegame-to-endgame transitions | fork | Fork with the rook |
| `mg-kg-173401001306-46` | Middlegame-to-endgame transitions | draw | Find the drawing move |
| `mg-kg-187405731530-56` | Middlegame-to-endgame transitions | material | Win the queen on f3 |
| `mg-kg-137509814856-26` | Middlegame-to-endgame transitions | win | Win the queen on e5 |
| `mg-kg-138521938836-44` | Middlegame-to-endgame transitions | material | Win the queen on c1 |
| `mg-kg-173931787814-109` | Middlegame-to-endgame transitions | runaway | The runaway a-pawn |
| `mg-kg-185320508798-43` | Middlegame-to-endgame transitions | win | Middlegame-to-Endgame Transitions II: Conversion Technique |
| `mg-kg-173259096730-46` | Middlegame-to-endgame transitions | win | Middlegame-to-Endgame Transitions II: Conversion Technique |
| `mg-kg-184665710860-56` | Middlegame-to-endgame transitions | material | Win the queen on f7 |
| `mg-kg-137082455912-26` | Middlegame-to-endgame transitions | material | Win the queen on d8 |
| `mg-kg-173693836568-57` | Middlegame-to-endgame transitions | material | Win the queen on d2 |
| `mg-kg-173990300252-31` | Transformation of Advantages | material | Win the knight on f7 |
| `mg-kg-186083816974-58` | Transformation of Advantages | trade | Trade into a won endgame |
| `mg-kg-184589327050-52` | The Initiative: Pawn Sacrifices for Time and Open Lines | win | Transformation of Advantages |
| `mg-kg-172974183526-41` | Transformation of Advantages | quietThreat | A quiet move with a threat |
| `mg-kg-173713970772-37` | Transformation of Advantages | discovered | Discovered attack wins the knight |
| `mg-kg-184267543296-25` | Transformation of Advantages | pin | Pin wins the queen |
| `mg-kg-184211800742-55` | Weak Squares, Outposts and Backward Pawns | fork | Fork wins the rook |
| `mg-kg-186658850282-56` | Weak Squares, Outposts and Backward Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-113490648439-22` | Weak Squares, Outposts and Backward Pawns | win | Weak Squares, Outposts and Backward Pawns |
| `mg-kg-143351326364-41` | Weak Squares, Outposts and Backward Pawns | win | Weak Squares, Outposts and Backward Pawns |
| `mg-kg-123163205803-67` | Weak Squares, Outposts and Backward Pawns | fork | Fork wins the rook |
| `mg-kg-171256600800-22` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | draw | Find the drawing move |
| `mg-kg-170980698128-20` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | draw | Find the drawing move |
| `mg-kg-123357688177-32` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | draw | Find the drawing move |
| `mg-kg-143540373528-32` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | draw | Find the drawing move |
| `mg-kg-141023345014-31` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | quietThreat | A quiet move with a threat |
| `mg-kg-172566006562-27` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | win | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair |
| `mg-kg-119555401561-43` | The Principle of Two Weaknesses | draw | Find the drawing move |
| `mg-kg-115676919167-26` | The Principle of Two Weaknesses | win | The Principle of Two Weaknesses |
| `mg-kg-115327179551-20` | The Principle of Two Weaknesses | quietThreat | A quiet move with a threat |
| `mg-kg-121697419981-28` | The Principle of Two Weaknesses | draw | Find the drawing move |
| `mg-kg-115999277905-25` | The Principle of Two Weaknesses | fork | Fork with the pawn |
| `mg-kg-187401595708-33` | Pawn Centres, Majorities and Mobile Pawn Masses | quietThreat | A quiet move wins the knight |
| `mg-kg-137127149138-26` | Pawn Centres, Majorities and Mobile Pawn Masses | quietThreat | A quiet move with a threat |
| `mg-kg-123278931180-47` | Pawn Centres, Majorities and Mobile Pawn Masses | win | Pawn Centres, Majorities and Mobile Pawn Masses |
| `mg-kg-184260342644-34` | Pawn Centres, Majorities and Mobile Pawn Masses | quietThreat | A quiet move with a threat |
| `mg-kg-185703773586-27` | Pawn Centres, Majorities and Mobile Pawn Masses | quietThreat | A quiet move with a threat |
| `mg-kg-185654843256-34` | Pawn Centres, Majorities and Mobile Pawn Masses | quietThreat | A quiet move with a threat |
| `mg-kg-174460367674-37` | The Initiative: Pawn Sacrifices for Time and Open Lines | win | Win the pawn on c5 |
| `mg-kg-174418107022-26` | The Initiative: Pawn Sacrifices for Time and Open Lines | fork | Fork wins the pawn |
| `mg-kg-174322181660-38` | The Initiative: Pawn Sacrifices for Time and Open Lines | quietThreat | A quiet move with a threat |
| `mg-kg-184056134368-29` | The Initiative: Pawn Sacrifices for Time and Open Lines | win | Win the pawn on f4 |
| `mg-kg-174527620416-61` | The Initiative: Pawn Sacrifices for Time and Open Lines | win | Win the pawn on g3 |
| `mg-kg-144285269128-54` | Attacking the Castled King: Mating Patterns and the Greek Gift | material | Win the pawn on g7 |
| `mg-kg-108243613617-47` | Attacking the Castled King: Mating Patterns and the Greek Gift | backRank | Mate in 2 on the back rank |
| `mg-kg-109455004647-50` | Attacking the Castled King: Mating Patterns and the Greek Gift | fork | Fork wins the pawn |
| `mg-kg-107792531013-61` | Attacking the Castled King: Mating Patterns and the Greek Gift | fork | Fork wins the rook |
| `mg-kg-105279119019-36` | Attacking the Castled King: Mating Patterns and the Greek Gift | win | Win the pawn on f7 |
| `mg-kg-140813794826-47` | Attacking the Castled King: Mating Patterns and the Greek Gift | win | Win the pawn on b2 |
| `mg-kg-108337257299-71` | Basic Pawn Breaks: Levers and Opening Lines | win | Basic Pawn Breaks: Levers and Opening Lines |
| `mg-kg-108828034877-38` | Basic Pawn Breaks: Levers and Opening Lines | quietThreat | A quiet move with a threat |
| `mg-kg-105904737159-33` | Basic Pawn Breaks: Levers and Opening Lines | win | Basic Pawn Breaks: Levers and Opening Lines |
| `mg-kg-137156707212-66` | Opposite-Side Castling: Pawn Storms and Tempo Counting | deflection | Deflection wins the bishop |
| `mg-kg-184618063722-54` | Opposite-Side Castling: Pawn Storms and Tempo Counting | pin | Pin holds the draw |
| `mg-kg-136770410662-34` | Opposite-Side Castling: Pawn Storms and Tempo Counting | trade | Trade into a won endgame |
| `mg-kg-137013926116-59` | Opposite-Side Castling: Pawn Storms and Tempo Counting | quietThreat | A quiet move with a threat |
| `mg-kg-173755873730-34` | Opposite-Side Castling: Pawn Storms and Tempo Counting | win | Opposite-Side Castling: Pawn Storms and Tempo Counting |
| `mg-kg-164186350956-23` | Space, Restriction and Strangling the Opponent's Breaks | quietThreat | A quiet move with a threat |
| `mg-kg-186391353258-26` | Space, Restriction and Strangling the Opponent's Breaks | discovered | Discovered attack with the pawn |
| `mg-kg-186649736982-28` | Space, Restriction and Strangling the Opponent's Breaks | fork | Fork with the pawn |
| `mg-kg-109187492441-35` | Space, Restriction and Strangling the Opponent's Breaks | fork | Fork with the pawn |
| `mg-kg-113861957463-38` | Space, Restriction and Strangling the Opponent's Breaks | fork | Fork wins the bishop |
| `mg-kg-119900969261-63` | Pawn Chains: The Advance Structure and Attacking the Base | material | Win the pawn on c7 |
| `mg-kg-95800553142-25` | Pawn Chains: The Advance Structure and Attacking the Base | draw | Find the drawing move |
| `mg-kg-187564599052-24` | The Carlsbad Structure and the Minority Attack | trade | Trade into a won endgame |
| `mg-kg-170595612202-49` | The Carlsbad Structure and the Minority Attack | material | Win the knight on c5 |
| `mg-kg-125417366269-49` | The Carlsbad Structure and the Minority Attack | quietThreat | A quiet move wins the bishop |
| `mg-kg-170922316006-29` | The Carlsbad Structure and the Minority Attack | win | The Carlsbad Structure and the Minority Attack |
| `mg-kg-118073937473-43` | The Carlsbad Structure and the Minority Attack | win | The Carlsbad Structure and the Minority Attack |
| `mg-kg-113493552729-25` | The Carlsbad Structure and the Minority Attack | material | Win the knight on e4 |
| `mg-kg-174410301520-70` | Synthesis: The Full Grandmaster MSPC Loop | quietThreat | A quiet move wins the knight |
| `mg-kg-174376801088-36` | Synthesis: The Full Grandmaster MSPC Loop | material | Win the pawn on e6 |
