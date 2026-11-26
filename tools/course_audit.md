# Course audit (tools/course_truth.mjs)

Generated from the board and Stockfish 19 (depth 16) with the app's own Coach Brain (lc83.js).

## Solutions where Stockfish prefers another move (5)

All of these keep the same result (the evaluation after the course move is within a few tenths of Stockfish's move, or both mate). The course move stays; the Runner already accepts equal alternatives through the engine check.

- `bp-p0-3`: course e3, Stockfish Kf4 (eval 590, after the course move 587)
- `bp-p1-2`: course a5, Stockfish Ke4 (eval 648, after the course move 622)
- `bp-p1-5`: course Rh1, Stockfish Rh3 (eval 0, after the course move 0)
- `mspc-caro-adv-l5-trade-the-bishop`: course Nxe3, Stockfish Qd7 (eval -47, after the course move -39)
- `mspc-colle-e4-l5-blockade`: course Bd4, Stockfish Bb3 (eval 99, after the course move 76)

## Text problems (18)

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
- `mg-kg-108069610649-39`: generated text failed the check: hxg3 (kept the old text)
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
| `kg-97372198311-49` | Laws that decide endgames | draw | Find the drawing move |
| `kg-101408340466-100` | Laws that decide endgames | draw | Find the drawing move |
| `kg-101411351490-70` | Laws that decide endgames | draw | Find the drawing move |
| `kg-96476861975-129` | Laws that decide endgames | material | Win the pawn on a7 |
| `kg-94107881184-101` | Laws that decide endgames | skewer | Skewer wins the rook |
| `kg-101456170114-72` | Laws that decide endgames | promotion | Promote the c-pawn |
| `kg-94081740796-95` | Laws that decide endgames | removal | Removing the defender wins the pawn |
| `kg-101439023346-60` | Basic mates and mating technique | backRank | Mate in 1 on the back rank |
| `kg-98331264253-99` | Basic mates and mating technique | backRank | Mate in 1 on the back rank |
| `kg-173019988864-109` | Basic mates and mating technique | mateNet | Mate in 2 with the rook |
| `kg-94131245360-72` | Core principles and vocabulary | win | Core principles and vocabulary |
| `kg-95808317302-75` | Core principles and vocabulary | runaway | The runaway g-pawn |
| `kg-95819180538-112` | Core principles and vocabulary | material | Win the knight on e4 |
| `kg-101439175390-102` | Core principles and vocabulary | material | Win the pawn on g4 |
| `kg-82189006250-78` | Core principles and vocabulary | material | Win the rook on c1 |
| `kg-101236245168-78` | Core principles and vocabulary | win | Core principles and vocabulary |
| `kg-103981899771-82` | Core principles and vocabulary | win | Core principles and vocabulary |
| `kg-142915753198-112` | The rule of the square and first passed pawns | draw | Find the drawing move |
| `kg-123432656681-113` | The rule of the square and first passed pawns | draw | Find the drawing move |
| `kg-142887919292-92` | The rule of the square and first passed pawns | material | Win the pawn on f7 |
| `kg-124811421409-96` | The rule of the square and first passed pawns | draw | Find the drawing move |
| `kg-143850627920-107` | The rule of the square and first passed pawns | draw | Find the drawing move |
| `kg-172536858052-93` | The rule of the square and first passed pawns | material | Win the pawn on a5 |
| `kg-113854242447-73` | The rule of the square and first passed pawns | material | Win the pawn on c5 |
| `kg-101439175390-82` | Winconditions: the two ways endgames end | win | Winconditions: the two ways endgames end |
| `kg-96473995865-50` | Winconditions: the two ways endgames end | quietThreat | A quiet move with a threat |
| `kg-101456170114-74` | Winconditions: the two ways endgames end | promotion | Promote the c-pawn |
| `kg-97372198311-67` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-82189006250-110` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-98913894031-84` | Winconditions: the two ways endgames end | skewer | Skewer with the rook |
| `kg-101236245168-82` | Winconditions: the two ways endgames end | skewer | Skewer wins the rook |
| `kg-105731955463-105` | Bishops, knights and the blockade | material | Win the pawn on a5 |
| `kg-105302425655-85` | Bishops, knights and the blockade | win | Bishops, knights and the blockade |
| `kg-104601159943-113` | Bishops, knights and the blockade | quietThreat | A quiet move with a threat |
| `kg-118068545043-114` | Bishops, knights and the blockade | quietThreat | A quiet move with a threat |
| `kg-144125714110-79` | Bishops, knights and the blockade | win | Bishops, knights and the blockade |
| `kg-115653509717-178` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-172348522684-94` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-94138948842-64` | Conversion, fortresses and exchanging | quietThreat | A quiet move with a threat |
| `kg-104772046265-62` | Conversion, fortresses and exchanging | material | Win the pawn on d5 |
| `kg-113779820817-70` | Conversion, fortresses and exchanging | win | Conversion, fortresses and exchanging |
| `kg-124395578249-84` | Conversion, fortresses and exchanging | win | Conversion, fortresses and exchanging |
| `kg-125174958653-122` | Conversion, fortresses and exchanging | runaway | The runaway h-pawn |
| `kg-120688255757-78` | Conversion, fortresses and exchanging | win | Conversion, fortresses and exchanging |
| `kg-119739049573-96` | Conversion, fortresses and exchanging | win | Conversion, fortresses and exchanging |
| `kg-172536858052-95` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-143850627920-135` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-113762408023-84` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-113928623337-114` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-171579937380-72` | Opposition, key squares and tempo | material | Win the pawn on h5 |
| `kg-118072196149-100` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-142915753198-110` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-185100776126-96` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-115412374605-83` | Passed pawns, majorities and races | promotion | Promote the a-pawn |
| `kg-124811421409-94` | Passed pawns, majorities and races | material | Win the pawn on g4 |
| `kg-143850627920-73` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-118072196149-108` | Passed pawns, majorities and races | promotion | Promote the a-pawn |
| `kg-172536858052-99` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-123432656681-111` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-108234139761-119` | Rook endings | draw | Find the drawing move |
| `kg-108233518485-77` | Rook endings | material | Win the pawn on c5 |
| `kg-165840590334-89` | Rook endings | draw | Find the drawing move |
| `kg-105194457669-137` | Rook endings | runaway | The runaway g-pawn |
| `kg-106439901363-59` | Rook endings | material | Win the rook on e1 |
| `kg-130628998055-89` | Rook endings | draw | Find the drawing move |
| `kg-171597951290-67` | Rook endings | win | Rook endings |
| `kg-105720642409-65` | Winconditions: the two ways endgames end | material | Win the pawn on f4 |
| `kg-105731955463-101` | Winconditions: the two ways endgames end | fork | Fork wins the rook |
| `kg-108508231233-105` | Winconditions: the two ways endgames end | material | Win the bishop on g3 |
| `kg-124655992395-78` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-113512781355-135` | Winconditions: the two ways endgames end | material | Win the pawn on g4 |
| `kg-109352394083-95` | Winconditions: the two ways endgames end | material | Win the queen on c8 |
| `kg-113928623337-88` | Winconditions: the two ways endgames end | material | Win the pawn on c5 |
| `kg-118068545043-104` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-113776751099-100` | Bishops, knights and the blockade | quietThreat | A quiet move with a threat |
| `kg-172440343132-88` | Bishops, knights and the blockade | runaway | The runaway a-pawn |
| `kg-172557697546-79` | Bishops, knights and the blockade | material | Win the pawn on e4 |
| `kg-144125714110-81` | Bishops, knights and the blockade | quietThreat | A quiet move with a threat |
| `kg-170845765858-99` | Bishops, knights and the blockade | deflection | Deflection wins the pawn |
| `kg-115653509717-150` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-125258918881-104` | Conversion, fortresses and exchanging | win | Conversion, fortresses and exchanging |
| `kg-115934384085-98` | Conversion, fortresses and exchanging | runaway | The runaway d-pawn |
| `kg-120688255757-72` | Conversion, fortresses and exchanging | win | Conversion, fortresses and exchanging |
| `kg-145232891398-66` | Conversion, fortresses and exchanging | win | Conversion, fortresses and exchanging |
| `kg-137262071922-110` | Conversion, fortresses and exchanging | runaway | The runaway c-pawn |
| `kg-185063618532-92` | Conversion, fortresses and exchanging | win | Conversion, fortresses and exchanging |
| `kg-136258298676-114` | Conversion, fortresses and exchanging | win | Conversion, fortresses and exchanging |
| `kg-99712365003-70` | Opposite-coloured bishops | runaway | Breakthrough: the a-pawn runs |
| `kg-173323291218-127` | Opposite-coloured bishops | draw | Find the drawing move |
| `kg-174217788014-107` | Opposite-coloured bishops | draw | Find the drawing move |
| `kg-174142198060-199` | Opposite-coloured bishops | material | Win the pawn on a7 |
| `kg-174330535664-83` | Opposite-coloured bishops | win | Opposite-coloured bishops |
| `kg-142915753198-94` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-185100776126-86` | Opposition, key squares and tempo | win | Opposition, key squares and tempo |
| `kg-113854242447-77` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-113762408023-102` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-118072196149-94` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-143850627920-145` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-171579937380-74` | Opposition, key squares and tempo | runaway | The runaway h-pawn |
| `kg-185100776126-98` | Passed pawns, majorities and races | win | Passed pawns, majorities and races |
| `kg-115398559317-121` | Passed pawns, majorities and races | win | Passed pawns, majorities and races |
| `kg-123432656681-103` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-118072196149-106` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-115412374605-79` | Passed pawns, majorities and races | promotion | Promote the a-pawn |
| `kg-172536858052-107` | Passed pawns, majorities and races | promotion | Promote the h-pawn |
| `kg-125093330103-81` | Passed pawns, majorities and races | material | Win the pawn on e5 |
| `kg-123614501423-109` | Rook versus minor pieces and material balance | win | Rook versus minor pieces and material balance |
| `kg-123609583371-79` | Rook versus minor pieces and material balance | material | Win the pawn on f4 |
| `kg-143463096636-56` | Rook versus minor pieces and material balance | material | Win the pawn on a5 |
| `kg-113512781355-189` | Rook versus minor pieces and material balance | material | Win the rook on d2 |
| `kg-115418895421-118` | Rook versus minor pieces and material balance | draw | Find the drawing move |
| `kg-119900969261-111` | Rook versus minor pieces and material balance | draw | Find the drawing move |
| `kg-125161716081-89` | Rook versus minor pieces and material balance | draw | Find the drawing move |
| `kg-113665219497-46` | Rook endings | win | Rook endings |
| `kg-142887919292-74` | Rook endings | draw | Find the drawing move |
| `kg-109023562941-82` | Rook endings | draw | Find the drawing move |
| `kg-144010780652-159` | Rook endings | quietThreat | A quiet move with a threat |
| `kg-184219743088-109` | Rook endings | win | Rook endings |
| `kg-130628998055-65` | Rook endings | draw | Find the drawing move |
| `kg-186659963834-77` | Rook endings | win | Rook endings |
| `kg-113512781355-179` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-142915753198-100` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-143850627920-151` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-113574595445-79` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-121808971217-98` | Winconditions: the two ways endgames end | win | Winconditions: the two ways endgames end |
| `kg-118072196149-86` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-115653509717-190` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-172656514060-70` | Bishops, knights and the blockade | quietThreat | A quiet move with a threat |
| `kg-145001446258-110` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-136878671744-102` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-173928899960-106` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-173656688896-93` | Bishops, knights and the blockade | fork | Fork wins the bishop |
| `kg-145301084848-93` | Bishops, knights and the blockade | material | Win the pawn on h3 |
| `kg-136145360518-130` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-97071635223-88` | Conversion, fortresses and exchanging | win | Conversion, fortresses and exchanging |
| `kg-123509398244-68` | Conversion, fortresses and exchanging | win | Conversion, fortresses and exchanging |
| `kg-186858718290-69` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-146030666952-81` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-136688726580-127` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-136798328538-76` | Opposition, key squares and tempo | material | Win the pawn on g6 |
| `kg-184670247024-124` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-186083816974-84` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-136147592896-104` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-144827592474-97` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-173654631852-75` | Passed pawns, majorities and races | win | Passed pawns, majorities and races |
| `kg-171063915044-81` | Passed pawns, majorities and races | win | Passed pawns, majorities and races |
| `kg-146030666952-117` | Passed pawns, majorities and races | promotion | Promote the g-pawn |
| `kg-184662523360-57` | Passed pawns, majorities and races | material | Win the pawn on e6 |
| `kg-186858718290-81` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-136817540486-66` | Passed pawns, majorities and races | win | Passed pawns, majorities and races |
| `kg-172604947926-81` | Rook versus minor pieces and material balance | draw | Find the drawing move |
| `kg-166370582398-120` | Rook versus minor pieces and material balance | draw | Find the drawing move |
| `kg-172795807126-94` | Rook versus minor pieces and material balance | material | Win the rook on h2 |
| `kg-173708584222-114` | Rook versus minor pieces and material balance | material | Win the rook on c2 |
| `kg-123611141578-84` | Rook versus minor pieces and material balance | win | Rook versus minor pieces and material balance |
| `kg-185546275712-89` | Rook versus minor pieces and material balance | runaway | The runaway a-pawn |
| `kg-185631236444-71` | Rook versus minor pieces and material balance | material | Win the pawn on h2 |
| `kg-169355731336-142` | Rook endings | draw | Find the drawing move |
| `kg-136976390646-83` | Rook endings | win | Rook endings |
| `kg-171567644960-75` | Rook endings | win | Rook endings |
| `kg-142802055250-69` | Rook endings | win | Rook endings |
| `kg-185640218878-77` | Rook endings | win | Rook endings |
| `kg-173655386584-74` | Rook endings | win | Rook endings |
| `kg-185639479976-130` | Rook endings | material | Win the pawn on a3 |
| `kg-173767537722-71` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-173656688896-123` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-187395488832-112` | Winconditions: the two ways endgames end | material | Win the pawn on d6 |
| `kg-136878671744-104` | Winconditions: the two ways endgames end | promotion | Promote the b-pawn |
| `kg-172839738884-118` | Winconditions: the two ways endgames end | win | Winconditions: the two ways endgames end |
| `kg-186858718290-85` | Winconditions: the two ways endgames end | promotion | Promote the b-pawn |
| `kg-184670247024-122` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-145001446258-86` | Bishops, knights and the blockade | win | Win the pawn on b5 |
| `kg-170418080032-100` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-173656688896-113` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-125856555819-77` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-136071834682-106` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-136145360518-134` | Bishops, knights and the blockade | draw | Find the drawing move |
| `kg-174460367674-73` | Bishops, knights and the blockade | win | Bishops, knights and the blockade |
| `kg-145540556038-115` | Fortress and anti-fortress | draw | Find the drawing move |
| `kg-166370582398-116` | Fortress and anti-fortress | draw | Find the drawing move |
| `kg-147197934480-97` | Fortress and anti-fortress | draw | Find the drawing move |
| `kg-184670247024-126` | Fortress and anti-fortress | draw | Find the drawing move |
| `kg-185749533028-96` | Fortress and anti-fortress | material | Win the pawn on g5 |
| `kg-146030666952-79` | Fortress and anti-fortress | draw | Find the drawing move |
| `kg-174217788014-111` | Fortress and anti-fortress | material | Win the pawn on f5 |
| `kg-184400452358-63` | Grandmaster technique | draw | Find the drawing move |
| `kg-172927225942-71` | Grandmaster technique | win | Grandmaster technique |
| `kg-145001446258-116` | Grandmaster technique | draw | Find the drawing move |
| `kg-172656514060-66` | Grandmaster technique | quietThreat | A quiet move with a threat |
| `kg-172839738884-96` | Grandmaster technique | win | Grandmaster technique |
| `kg-184056134368-63` | Grandmaster technique | win | Grandmaster technique |
| `kg-174417768206-74` | Grandmaster technique | win | Grandmaster technique |
| `kg-127404579769-81` | Opposition, key squares and tempo | win | Opposition, key squares and tempo |
| `kg-184445377108-96` | Opposition, key squares and tempo | material | Win the pawn on f5 |
| `kg-136817540486-62` | Opposition, key squares and tempo | win | Opposition, key squares and tempo |
| `kg-187460231868-91` | Opposition, key squares and tempo | win | Opposition, key squares and tempo |
| `kg-186858718290-65` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-184670247024-112` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-146030666952-83` | Opposition, key squares and tempo | draw | Find the drawing move |
| `kg-144827592474-89` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-136817540486-68` | Passed pawns, majorities and races | win | Win the pawn on g3 |
| `kg-186858718290-87` | Passed pawns, majorities and races | promotion | Promote the b-pawn |
| `kg-185649748750-92` | Passed pawns, majorities and races | win | Passed pawns, majorities and races |
| `kg-172789636462-74` | Passed pawns, majorities and races | draw | Find the drawing move |
| `kg-146030666952-115` | Passed pawns, majorities and races | promotion | Promote the g-pawn |
| `kg-136798328538-64` | Passed pawns, majorities and races | win | Passed pawns, majorities and races |
| `kg-173708584222-110` | Rook versus minor pieces and material balance | material | Win the rook on c1 |
| `kg-184248058720-118` | Rook versus minor pieces and material balance | material | Win the pawn on e5 |
| `kg-185476127462-80` | Rook versus minor pieces and material balance | quietThreat | A quiet move with a threat |
| `kg-140682082606-99` | Rook versus minor pieces and material balance | win | Rook versus minor pieces and material balance |
| `kg-173753086706-75` | Rook versus minor pieces and material balance | quietThreat | A quiet move wins the pawn |
| `kg-166370582398-108` | Rook versus minor pieces and material balance | draw | Find the drawing move |
| `kg-172604947926-89` | Rook versus minor pieces and material balance | win | Rook versus minor pieces and material balance |
| `kg-174277562840-109` | Planning, prophylaxis and the king | draw | Find the drawing move |
| `kg-173767537722-67` | Planning, prophylaxis and the king | win | Planning, prophylaxis and the king |
| `kg-168040938366-74` | Planning, prophylaxis and the king | draw | Find the drawing move |
| `kg-173656688896-89` | Planning, prophylaxis and the king | quietThreat | A quiet move with a threat |
| `kg-125856555819-65` | Planning, prophylaxis and the king | win | Planning, prophylaxis and the king |
| `kg-166370582398-126` | Planning, prophylaxis and the king | draw | Find the drawing move |
| `kg-173655386584-82` | Planning, prophylaxis and the king | win | Planning, prophylaxis and the king |
| `kg-145540556038-111` | Rook endings | draw | Find the drawing move |
| `kg-136976390646-153` | Rook endings | draw | Find the drawing move |
| `kg-123613900786-75` | Rook endings | win | Win the rook on b5 |
| `kg-136688726580-59` | Rook endings | win | Rook endings |
| `kg-173282389556-130` | Rook endings | deflection | Deflection wins the rook |
| `kg-185640218878-75` | Rook endings | win | Rook endings |
| `kg-173648197132-70` | Rook endings | runaway | The runaway h-pawn |
| `kg-96476861975-127` | Transformations and structure-born endgames | material | Win the rook on b6 |
| `kg-125177920531-99` | Transformations and structure-born endgames | material | Win the knight on g6 |
| `kg-173466547628-113` | Transformations and structure-born endgames | material | Win the bishop on c4 |
| `kg-136510077240-78` | Transformations and structure-born endgames | win | Win the rook on f6 |
| `kg-174216732214-137` | Transformations and structure-born endgames | win | Win the rook on d4 |
| `kg-125856555819-89` | Transformations and structure-born endgames | material | Win the knight on c4 |
| `kg-125936931413-136` | Winconditions: the two ways endgames end | material | Win the pawn on b3 |
| `kg-173928899960-102` | Winconditions: the two ways endgames end | quietThreat | A quiet move with a threat |
| `kg-185749533028-106` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-144827592474-95` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-136878671744-98` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-184670247024-120` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `kg-146030666952-113` | Winconditions: the two ways endgames end | draw | Find the drawing move |
| `mg-kg-96676747781-61` | The Blunder Check: Making M Automatic | win | The Blunder Check: Making M Automatic |
| `mg-kg-96398928043-30` | The Blunder Check: Making M Automatic | material | Win the queen on g4 |
| `mg-kg-97538493831-53` | The Blunder Check: Making M Automatic | win | The Blunder Check: Making M Automatic |
| `mg-kg-95959187578-44` | The Blunder Check: Making M Automatic | win | The Blunder Check: Making M Automatic |
| `mg-kg-97265510361-76` | The Blunder Check: Making M Automatic | discovered | Discovered attack with the king |
| `mg-kg-82182496172-37` | Loose Pieces and the CCA Scan | material | Win the knight on f5 |
| `mg-kg-97204246047-25` | Loose Pieces and the CCA Scan | material | Win the bishop on g5 |
| `mg-kg-98141350923-31` | Loose Pieces and the CCA Scan | material | Win the pawn on h3 |
| `mg-kg-82187711874-38` | Loose Pieces and the CCA Scan | material | Win the knight on b4 |
| `mg-kg-82182609742-36` | Loose Pieces and the CCA Scan | material | Win the knight on e2 |
| `mg-kg-98217944557-30` | Loose Pieces and the CCA Scan | win | Win the knight on e4 |
| `mg-kg-95763416672-59` | Loose Pieces and the CCA Scan | material | Win the queen on g6 |
| `mg-kg-104512806257-20` | Piece Coordination and Activity | quietThreat | A quiet move with a threat |
| `mg-kg-101468862786-41` | Piece Coordination and Activity | quietThreat | A quiet move with a threat |
| `mg-kg-104499621759-55` | Piece Coordination and Activity | draw | Find the drawing move |
| `mg-kg-95754787870-45` | Piece Coordination and Activity | quietThreat | A quiet move wins the knight |
| `mg-kg-95807942916-28` | Piece Coordination and Activity | trade | Trade into a won endgame |
| `mg-kg-101406785444-81` | Piece Coordination and Activity | win | Piece Coordination and Activity |
| `mg-kg-102419985747-33` | Piece Coordination and Activity | quietThreat | A quiet move with a threat |
| `mg-kg-104141450817-25` | King Safety Basics | win | King Safety Basics |
| `mg-kg-98218472801-29` | King Safety Basics | win | King Safety Basics |
| `mg-kg-101427232536-48` | King Safety Basics | draw | Find the drawing move |
| `mg-kg-101456170114-46` | King Safety Basics | discovered | Discovered attack holds the draw |
| `mg-kg-96471432557-68` | King Safety Basics | win | King Safety Basics |
| `mg-kg-97376966997-52` | King Safety Basics | quietThreat | A quiet move wins the bishop |
| `mg-kg-104897981181-29` | King Safety Basics | draw | Find the drawing move |
| `mg-kg-97725555671-48` | Core Tactical Patterns | win | Win the rook on g4 |
| `mg-kg-97767105745-27` | Core Tactical Patterns | material | Win the pawn on e5 |
| `mg-kg-97707578511-39` | Core Tactical Patterns | material | Win the bishop on d2 |
| `mg-kg-95753654468-36` | Core Tactical Patterns | material | Win the pawn on b7 |
| `mg-kg-96664094111-28` | Core Tactical Patterns | material | Win the knight on g4 |
| `mg-kg-101420452018-43` | Core Tactical Patterns | material | Win the queen on c8 |
| `mg-kg-95803898562-75` | Core Tactical Patterns | material | Win the knight on h7 |
| `mg-kg-97017697497-29` | Finding and choosing a plan | win | Finding and choosing a plan |
| `mg-kg-95800504886-21` | Finding and choosing a plan | quietThreat | A quiet move with a threat |
| `mg-kg-102417618309-23` | Finding and choosing a plan | win | Finding and choosing a plan |
| `mg-kg-99714186047-21` | Finding and choosing a plan | pin | Pin with the queen |
| `mg-kg-94089010912-20` | Finding and choosing a plan | draw | Find the drawing move |
| `mg-kg-101427270316-39` | Finding and choosing a plan | win | Finding and choosing a plan |
| `mg-kg-97708315203-45` | Finding and choosing a plan | quietThreat | A quiet move with a threat |
| `mg-kg-105307211059-34` | Development Lead and the Uncastled King | material | Win the pawn on h7 |
| `mg-kg-104525388987-20` | Development Lead and the Uncastled King | material | Win the knight on g5 |
| `mg-kg-105887438953-21` | Development Lead and the Uncastled King | material | Win the bishop on f5 |
| `mg-kg-105137520995-33` | Development Lead and the Uncastled King | skewer | Skewer wins the knight |
| `mg-kg-108845555055-31` | Development Lead and the Uncastled King | discovered | Discovered attack wins the queen |
| `mg-kg-105394241875-21` | Development Lead and the Uncastled King | win | Development Lead and the Uncastled King |
| `mg-kg-108244195569-30` | Direct Threats: Making Them and Meeting Them | quietThreat | A quiet move with a threat |
| `mg-kg-140813794826-55` | Direct Threats: Making Them and Meeting Them | quietThreat | A quiet move with a threat |
| `mg-kg-105838259693-37` | Direct Threats: Making Them and Meeting Them | quietThreat | A quiet move with a threat |
| `mg-kg-105819078371-23` | Direct Threats: Making Them and Meeting Them | quietThreat | A quiet move with a threat |
| `mg-kg-144391524672-53` | Direct Threats: Making Them and Meeting Them | win | Direct Threats: Making Them and Meeting Them |
| `mg-kg-109454432629-20` | Direct Threats: Making Them and Meeting Them | quietThreat | A quiet move with a threat |
| `mg-kg-105300617797-21` | Direct Threats: Making Them and Meeting Them | win | Direct Threats: Making Them and Meeting Them |
| `mg-kg-144285269128-54` | Attacking the Castled King: Mating Patterns and the Greek Gift | material | Win the pawn on g7 |
| `mg-kg-104878851881-29` | Attacking the Castled King: Mating Patterns and the Greek Gift | mateNet | Mate in 1 with the queen |
| `mg-kg-104763601271-75` | Attacking the Castled King: Mating Patterns and the Greek Gift | mateNet | Mate in 1 with the queen |
| `mg-kg-109455004647-50` | Attacking the Castled King: Mating Patterns and the Greek Gift | fork | Fork wins the pawn |
| `mg-kg-108829265901-59` | Attacking the Castled King: Mating Patterns and the Greek Gift | mateNet | Mate in 1 with the rook |
| `mg-kg-108604154701-48` | Attacking the Castled King: Mating Patterns and the Greek Gift | mateNet | Mate in 1 with the knight |
| `mg-kg-105660548297-20` | Attacking the Castled King: Mating Patterns and the Greek Gift | mateNet | Mate in 1 with the queen |
| `mg-kg-104672985225-21` | Open Files and the Seventh Rank | win | Open Files and the Seventh Rank |
| `mg-kg-108829265901-57` | Open Files and the Seventh Rank | quietThreat | A quiet move with a threat |
| `mg-kg-144285598338-32` | Open Files and the Seventh Rank | quietThreat | A quiet move with a threat |
| `mg-kg-104605175611-51` | Open Files and the Seventh Rank | pin | Pin holds the draw |
| `mg-kg-144285880952-33` | Open Files and the Seventh Rank | quietThreat | A quiet move with a threat |
| `mg-kg-105211280657-50` | Open Files and the Seventh Rank | material | Win the bishop on e7 |
| `mg-kg-108155363967-57` | Open Files and the Seventh Rank | draw | Find the drawing move |
| `mg-kg-108828034877-38` | Basic Pawn Breaks: Levers and Opening Lines | quietThreat | A quiet move with a threat |
| `mg-kg-108337257299-71` | Basic Pawn Breaks: Levers and Opening Lines | win | Basic Pawn Breaks: Levers and Opening Lines |
| `mg-kg-105727174585-27` | Basic Pawn Breaks: Levers and Opening Lines | quietThreat | A quiet move with a threat |
| `mg-kg-115418895421-60` | Basic Pawn Breaks: Levers and Opening Lines | win | Basic Pawn Breaks: Levers and Opening Lines |
| `mg-kg-144009767578-35` | Basic Pawn Breaks: Levers and Opening Lines | quietThreat | A quiet move with a threat |
| `mg-kg-125239784423-37` | Basic Pawn Breaks: Levers and Opening Lines | win | Basic Pawn Breaks: Levers and Opening Lines |
| `mg-kg-185101438366-62` | Basic Pawn Breaks: Levers and Opening Lines | quietThreat | A quiet move with a threat |
| `mg-kg-105730215285-52` | Defending | win | Defending |
| `mg-kg-105187268433-27` | Defending | quietThreat | A quiet move with a threat |
| `mg-kg-105908383309-35` | Defending | win | Defending |
| `mg-kg-105746357491-72` | Defending | draw | Find the drawing move |
| `mg-kg-105175836061-47` | Defending | quietThreat | A quiet move with a threat |
| `mg-kg-104678471279-29` | Defending | draw | Find the drawing move |
| `mg-kg-105654045559-65` | Defending | win | Defending |
| `mg-kg-170526954094-67` | Prophylaxis | quietThreat | A quiet move with a threat |
| `mg-kg-121376399105-24` | Prophylaxis | draw | Find the drawing move |
| `mg-kg-113768424675-26` | Prophylaxis | trade | Trade into a won endgame |
| `mg-kg-144012923062-25` | Prophylaxis | quietThreat | A quiet move with a threat |
| `mg-kg-143544998318-47` | Prophylaxis | draw | Find the drawing move |
| `mg-kg-120226788759-24` | Prophylaxis | draw | Find the drawing move |
| `mg-kg-113767193447-73` | Prophylaxis | quietThreat | A quiet move wins the knight |
| `mg-kg-171078128006-33` | The Carlsbad Structure and the Minority Attack | pin | Pin with the bishop |
| `mg-kg-144124851400-29` | The Carlsbad Structure and the Minority Attack | win | The Carlsbad Structure and the Minority Attack |
| `mg-kg-124982939613-49` | The Carlsbad Structure and the Minority Attack | win | The Carlsbad Structure and the Minority Attack |
| `mg-kg-143468363946-47` | The Carlsbad Structure and the Minority Attack | win | The Carlsbad Structure and the Minority Attack |
| `mg-kg-142888173870-45` | The Carlsbad Structure and the Minority Attack | draw | Find the drawing move |
| `mg-kg-187560377120-27` | The Carlsbad Structure and the Minority Attack | win | The Carlsbad Structure and the Minority Attack |
| `mg-kg-123163205803-37` | The Carlsbad Structure and the Minority Attack | quietThreat | A quiet move with a threat |
| `mg-kg-170891372278-69` | The Isolated Queen's Pawn (Both Sides) | win | The Isolated Queen's Pawn (Both Sides) |
| `mg-kg-124389511607-65` | The Isolated Queen's Pawn (Both Sides) | draw | Find the drawing move |
| `mg-kg-124819740127-69` | The Isolated Queen's Pawn (Both Sides) | quietThreat | A quiet move with a threat |
| `mg-kg-124932580779-119` | The Isolated Queen's Pawn (Both Sides) | win | The Isolated Queen's Pawn (Both Sides) |
| `mg-kg-170891024696-49` | The Isolated Queen's Pawn (Both Sides) | quietThreat | A quiet move with a threat |
| `mg-kg-171578258652-46` | The Isolated Queen's Pawn (Both Sides) | quietThreat | A quiet move with a threat |
| `mg-kg-184702538536-72` | The Isolated Queen's Pawn (Both Sides) | skewer | Skewer with the rook |
| `mg-kg-121808971217-84` | Hanging Pawns | win | Hanging Pawns |
| `mg-kg-113593855283-52` | Hanging Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-170595012628-49` | Hanging Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-118411668635-32` | Hanging Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-140941315052-32` | Hanging Pawns | discovered | Discovered attack with the pawn |
| `mg-kg-124393808569-30` | Hanging Pawns | draw | Find the drawing move |
| `mg-kg-124810781677-55` | Hanging Pawns | fork | Fork with the queen |
| `mg-kg-115401559163-52` | Weak Squares, Outposts and Backward Pawns | win | Weak Squares, Outposts and Backward Pawns |
| `mg-kg-113776751099-76` | Weak Squares, Outposts and Backward Pawns | win | Weak Squares, Outposts and Backward Pawns |
| `mg-kg-113597361547-49` | Weak Squares, Outposts and Backward Pawns | win | Weak Squares, Outposts and Backward Pawns |
| `mg-kg-115420729883-41` | Weak Squares, Outposts and Backward Pawns | fork | Fork with the bishop |
| `mg-kg-143554995142-65` | Weak Squares, Outposts and Backward Pawns | quietThreat | A quiet move with a threat |
| `mg-kg-118001397631-65` | Weak Squares, Outposts and Backward Pawns | fork | Fork wins the rook |
| `mg-kg-123077443843-41` | Weak Squares, Outposts and Backward Pawns | draw | Find the drawing move |
| `mg-kg-122823238325-26` | Piece Exchanges: Which Pieces to Trade | win | Win the knight on e3 |
| `mg-kg-143573769544-46` | Piece Exchanges: Which Pieces to Trade | win | Win the knight on d3 |
| `mg-kg-123962497275-35` | Piece Exchanges: Which Pieces to Trade | draw | Find the drawing move |
| `mg-kg-170852950450-23` | Piece Exchanges: Which Pieces to Trade | draw | Find the drawing move |
| `mg-kg-141023494582-25` | Piece Exchanges: Which Pieces to Trade | material | Win the knight on f6 |
| `mg-kg-171596347886-30` | Piece Exchanges: Which Pieces to Trade | material | Win the bishop on d6 |
| `mg-kg-142640640834-37` | Piece Exchanges: Which Pieces to Trade | material | Win the rook on c7 |
| `mg-kg-113603960611-32` | Pawn Chains: The Advance Structure and Attacking the Base | quietThreat | A quiet move with a threat |
| `mg-kg-143168557874-50` | Pawn Chains: The Advance Structure and Attacking the Base | win | Pawn Chains: The Advance Structure and Attacking the Base |
| `mg-kg-115648779131-51` | Pawn Chains: The Advance Structure and Attacking the Base | win | Pawn Chains: The Advance Structure and Attacking the Base |
| `mg-kg-118270759505-58` | Pawn Chains: The Advance Structure and Attacking the Base | win | Pawn Chains: The Advance Structure and Attacking the Base |
| `mg-kg-119641223249-69` | Pawn Chains: The Advance Structure and Attacking the Base | quietThreat | A quiet move with a threat |
| `mg-kg-172529612438-43` | Pawn Chains: The Advance Structure and Attacking the Base | skewer | Skewer wins the knight |
| `mg-kg-109280384135-61` | Pawn Chains: The Advance Structure and Attacking the Base | fork | Fork wins the bishop |
| `mg-kg-143351326364-41` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | win | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair |
| `mg-kg-124637973131-67` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | draw | Find the drawing move |
| `mg-kg-114453090501-62` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | draw | Find the drawing move |
| `mg-kg-144127214016-43` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | discovered | Discovered attack holds the draw |
| `mg-kg-144010780652-75` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | quietThreat | A quiet move with a threat |
| `mg-kg-187406773914-82` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | win | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair |
| `mg-kg-119971787103-28` | Minor-Piece Imbalances: Good Knight vs Bad Bishop, the Bishop Pair | quietThreat | A quiet move wins the rook |
| `mg-kg-124208933869-56` | The Principle of Two Weaknesses | draw | Find the drawing move |
| `mg-kg-143460687146-76` | The Principle of Two Weaknesses | draw | Find the drawing move |
| `mg-kg-123963730723-72` | The Principle of Two Weaknesses | win | The Principle of Two Weaknesses |
| `mg-kg-113666381185-25` | The Principle of Two Weaknesses | quietThreat | A quiet move wins the knight |
| `mg-kg-108937229607-33` | The Principle of Two Weaknesses | material | Win the pawn on g4 |
| `mg-kg-124717766295-23` | The Principle of Two Weaknesses | draw | Find the drawing move |
| `mg-kg-109089720873-20` | The Principle of Two Weaknesses | win | Win the knight on e4 |
| `mg-kg-166717706430-45` | Finding and choosing a plan | quietThreat | A quiet move with a threat |
| `mg-kg-184564575802-55` | Finding and choosing a plan | win | Finding and choosing a plan |
| `mg-kg-145704919904-65` | Finding and choosing a plan | quietThreat | A quiet move with a threat |
| `mg-kg-185685991862-47` | Finding and choosing a plan | win | Finding and choosing a plan |
| `mg-kg-185637987464-66` | Finding and choosing a plan | quietThreat | A quiet move with a threat |
| `mg-kg-170417563346-59` | Finding and choosing a plan | pin | Pin wins the pawn |
| `mg-kg-185479614024-37` | Finding and choosing a plan | win | Finding and choosing a plan |
| `mg-kg-185545515950-31` | Dynamic vs Static: The Trade-Off Ledger | quietThreat | A quiet move with a threat |
| `mg-kg-137455302172-45` | Dynamic vs Static: The Trade-Off Ledger | quietThreat | A quiet move with a threat |
| `mg-kg-172792173652-56` | Dynamic vs Static: The Trade-Off Ledger | win | Dynamic vs Static: The Trade-Off Ledger |
| `mg-kg-185637529748-41` | Dynamic vs Static: The Trade-Off Ledger | quietThreat | A quiet move with a threat |
| `mg-kg-123456697680-21` | Dynamic vs Static: The Trade-Off Ledger | win | Dynamic vs Static: The Trade-Off Ledger |
| `mg-kg-137156707212-66` | Dynamic vs Static: The Trade-Off Ledger | deflection | Deflection wins the bishop |
| `mg-kg-173019988864-33` | Dynamic vs Static: The Trade-Off Ledger | quietThreat | A quiet move with a threat |
| `mg-kg-138097152512-53` | Colour-Complex Domination | quietThreat | A quiet move with a threat |
| `mg-kg-166717706430-43` | Colour-Complex Domination | quietThreat | A quiet move with a threat |
| `mg-kg-136581288524-46` | Colour-Complex Domination | quietThreat | A quiet move with a threat |
| `mg-kg-186464245010-26` | Colour-Complex Domination | win | Colour-Complex Domination |
| `mg-kg-136834293278-56` | Colour-Complex Domination | quietThreat | A quiet move with a threat |
| `mg-kg-173838357374-51` | Colour-Complex Domination | draw | Find the drawing move |
| `mg-kg-166024808608-53` | Colour-Complex Domination | quietThreat | A quiet move wins the bishop |
| `mg-kg-136005674246-32` | Space, Restriction and Strangling the Opponent's Breaks | draw | Find the drawing move |
| `mg-kg-170745843914-40` | Space, Restriction and Strangling the Opponent's Breaks | quietThreat | A quiet move with a threat |
| `mg-kg-173739747392-24` | Space, Restriction and Strangling the Opponent's Breaks | win | Space, Restriction and Strangling the Opponent's Breaks |
| `mg-kg-185642483822-35` | Space, Restriction and Strangling the Opponent's Breaks | quietThreat | A quiet move wins the knight |
| `mg-kg-164374828664-103` | Space, Restriction and Strangling the Opponent's Breaks | win | Space, Restriction and Strangling the Opponent's Breaks |
| `mg-kg-173259096730-46` | Space, Restriction and Strangling the Opponent's Breaks | win | Space, Restriction and Strangling the Opponent's Breaks |
| `mg-kg-186518813682-73` | Space, Restriction and Strangling the Opponent's Breaks | win | Space, Restriction and Strangling the Opponent's Breaks |
| `mg-kg-136145360518-36` | Regrouping: Improving the Worst Piece and Rerouting | win | Regrouping: Improving the Worst Piece and Rerouting |
| `mg-kg-185575034882-31` | Regrouping: Improving the Worst Piece and Rerouting | quietThreat | A quiet move with a threat |
| `mg-kg-165410029962-49` | Regrouping: Improving the Worst Piece and Rerouting | draw | Find the drawing move |
| `mg-kg-173625064078-20` | Regrouping: Improving the Worst Piece and Rerouting | win | Regrouping: Improving the Worst Piece and Rerouting |
| `mg-kg-173708584222-50` | Regrouping: Improving the Worst Piece and Rerouting | quietThreat | A quiet move wins the queen |
| `mg-kg-185643196666-34` | Regrouping: Improving the Worst Piece and Rerouting | fork | Fork wins the pawn |
| `mg-kg-168035036792-47` | Regrouping: Improving the Worst Piece and Rerouting | quietThreat | A quiet move with a threat |
| `mg-kg-184618063722-54` | Opposite-Side Castling: Pawn Storms and Tempo Counting | pin | Pin holds the draw |
| `mg-kg-165506489706-65` | Opposite-Side Castling: Pawn Storms and Tempo Counting | quietThreat | A quiet move with a threat |
| `mg-kg-136818404826-44` | Opposite-Side Castling: Pawn Storms and Tempo Counting | quietThreat | A quiet move with a threat |
| `mg-kg-137082938560-38` | Opposite-Side Castling: Pawn Storms and Tempo Counting | win | Opposite-Side Castling: Pawn Storms and Tempo Counting |
| `mg-kg-172745044956-34` | Opposite-Side Castling: Pawn Storms and Tempo Counting | win | Opposite-Side Castling: Pawn Storms and Tempo Counting |
| `mg-kg-136770410662-34` | Opposite-Side Castling: Pawn Storms and Tempo Counting | trade | Trade into a won endgame |
| `mg-kg-173658053616-22` | Opposite-Side Castling: Pawn Storms and Tempo Counting | fork | Fork wins the bishop |
| `mg-kg-185631236444-55` | Pawn Centres, Majorities and Mobile Pawn Masses | discovered | Discovered attack with the pawn |
| `mg-kg-185654843256-34` | Pawn Centres, Majorities and Mobile Pawn Masses | quietThreat | A quiet move with a threat |
| `mg-kg-145544002442-51` | Pawn Centres, Majorities and Mobile Pawn Masses | quietThreat | A quiet move with a threat |
| `mg-kg-137382547942-32` | Pawn Centres, Majorities and Mobile Pawn Masses | quietThreat | A quiet move with a threat |
| `mg-kg-125602774501-33` | Pawn Centres, Majorities and Mobile Pawn Masses | win | Pawn Centres, Majorities and Mobile Pawn Masses |
| `mg-kg-185544823858-24` | Pawn Centres, Majorities and Mobile Pawn Masses | quietThreat | A quiet move with a threat |
| `mg-kg-172650284328-28` | Pawn Centres, Majorities and Mobile Pawn Masses | quietThreat | A quiet move with a threat |
| `mg-kg-145591583942-26` | Repertoire-to-Middlegame Bridges at Advanced Level | discovered | Discovered attack wins the bishop |
| `mg-kg-173883752108-26` | Repertoire-to-Middlegame Bridges at Advanced Level | discovered | Discovered attack wins the knight |
| `mg-kg-170421521386-25` | Repertoire-to-Middlegame Bridges at Advanced Level | draw | Find the drawing move |
| `mg-kg-173694101558-20` | Repertoire-to-Middlegame Bridges at Advanced Level | trade | Trade into a won endgame |
| `mg-kg-145336004368-20` | Repertoire-to-Middlegame Bridges at Advanced Level | trade | Trade into a won endgame |
| `mg-kg-170380966396-20` | Repertoire-to-Middlegame Bridges at Advanced Level | trade | Trade into a won endgame |
| `mg-kg-137082775102-23` | Repertoire-to-Middlegame Bridges at Advanced Level | material | Win the bishop on c6 |
| `mg-kg-174460833408-61` | Prophylaxis | quietThreat | A quiet move with a threat |
| `mg-kg-174332570588-27` | Prophylaxis | pin | Pin holds the draw |
| `mg-kg-184066232732-26` | Prophylaxis | win | Prophylaxis |
| `mg-kg-174140164294-30` | Prophylaxis | win | Prophylaxis |
| `mg-kg-174366384598-39` | Prophylaxis | win | Prophylaxis |
| `mg-kg-184056134368-33` | Prophylaxis | draw | Find the drawing move |
| `mg-kg-173990300252-29` | Prophylaxis | discovered | Discovered attack wins the queen |
| `mg-kg-147745822782-58` | Transformation of Advantages | material | Win the pawn on f2 |
| `mg-kg-136976390646-53` | Transformation of Advantages | material | Win the bishop on h7 |
| `mg-kg-145162370800-27` | Transformation of Advantages | pin | Pin wins the pawn |
| `mg-kg-173424797244-57` | Transformation of Advantages | material | Win the queen on c3 |
| `mg-kg-123089771692-47` | Transformation of Advantages | material | Win the queen on f2 |
| `mg-kg-186083816974-58` | Transformation of Advantages | trade | Trade into a won endgame |
| `mg-kg-184064619042-84` | Transformation of Advantages | win | Win the queen on c6 |
| `mg-kg-187535970256-40` | The Positional Exchange Sacrifice and Other Positional Sacrifices | draw | Find the drawing move |
| `mg-kg-173228208188-36` | The Positional Exchange Sacrifice and Other Positional Sacrifices | win | Win the knight on f2 |
| `mg-kg-136771414554-40` | The Positional Exchange Sacrifice and Other Positional Sacrifices | win | Win the knight on f2 |
| `mg-kg-130697379097-54` | The Positional Exchange Sacrifice and Other Positional Sacrifices | win | Win the knight on f2 |
| `mg-kg-186337576860-44` | The Positional Exchange Sacrifice and Other Positional Sacrifices | win | Win the knight on f2 |
| `mg-kg-168611113334-30` | The Positional Exchange Sacrifice and Other Positional Sacrifices | win | Win the knight on f4 |
| `mg-kg-184020044820-40` | The Positional Exchange Sacrifice and Other Positional Sacrifices | win | Win the bishop on d4 |
| `mg-kg-174043763006-42` | The Initiative: Pawn Sacrifices for Time and Open Lines | mateNet | Mate in 1 with the queen |
| `mg-kg-174370016076-24` | The Initiative: Pawn Sacrifices for Time and Open Lines | mateNet | Mate in 1 with the queen |
| `mg-kg-174126542058-40` | The Initiative: Pawn Sacrifices for Time and Open Lines | win | Win the rook on h8 |
| `mg-kg-174418107022-26` | The Initiative: Pawn Sacrifices for Time and Open Lines | discovered | Discovered attack wins the pawn |
| `mg-kg-174460367674-37` | The Initiative: Pawn Sacrifices for Time and Open Lines | material | Win the pawn on c5 |
| `mg-kg-174376801088-36` | The Initiative: Pawn Sacrifices for Time and Open Lines | material | Win the pawn on e6 |
| `mg-kg-174528482838-40` | The Initiative: Pawn Sacrifices for Time and Open Lines | trade | Trade into a won endgame |
| `mg-kg-170417563346-57` | Middlegame-to-endgame transitions | win | Middlegame-to-endgame transitions |
| `mg-kg-173767537722-45` | Middlegame-to-endgame transitions | win | Middlegame-to-endgame transitions |
| `mg-kg-174047603856-97` | Middlegame-to-endgame transitions | quietThreat | A quiet move with a threat |
| `mg-kg-174366384598-69` | Middlegame-to-endgame transitions | win | Middlegame-to-endgame transitions |
| `mg-kg-184055575746-40` | Middlegame-to-endgame transitions | win | Middlegame-to-endgame transitions |
| `mg-kg-184019510934-51` | Middlegame-to-endgame transitions | quietThreat | A quiet move with a threat |
| `mg-kg-174410301520-70` | Middlegame-to-endgame transitions | quietThreat | A quiet move wins the knight |
| `mg-kg-186394519162-55` | Middlegame-to-endgame transitions | win | Win the knight on e5 |
| `mg-kg-123286804130-58` | Middlegame-to-endgame transitions | quietThreat | A quiet move with a threat |
| `mg-kg-136145875758-42` | Middlegame-to-endgame transitions | quietThreat | A quiet move with a threat |
| `mg-kg-145817011378-79` | Middlegame-to-endgame transitions | win | Middlegame-to-endgame transitions |
| `mg-kg-145550225544-76` | Middlegame-to-endgame transitions | win | Middlegame-to-endgame transitions |
| `mg-kg-164822232150-75` | Middlegame-to-endgame transitions | win | Middlegame-to-endgame transitions |
| `mg-kg-174366384598-45` | Middlegame-to-endgame transitions | trade | Trade into a won endgame |
| `mg-kg-174412987018-25` | Defending | win | Defending |
| `mg-kg-174330535664-37` | Defending | quietThreat | A quiet move with a threat |
| `mg-kg-174126148394-23` | Defending | win | Defending |
| `mg-kg-174332570588-59` | Defending | win | Defending |
| `mg-kg-173948115340-38` | Defending | draw | Find the drawing move |
| `mg-kg-174366384598-47` | Defending | trade | Trade into a won endgame |
| `mg-kg-173990300252-57` | Defending | discovered | Discovered attack with the rook |
| `mg-kg-173948115340-22` | Grandmaster Calculation and Critical-Moment Decisions | quietThreat | A quiet move with a threat |
| `mg-kg-174329658090-22` | Grandmaster Calculation and Critical-Moment Decisions | win | Win the bishop on e6 |
| `mg-kg-174127039288-49` | Grandmaster Calculation and Critical-Moment Decisions | fork | Fork with the knight |
| `mg-kg-174322181660-32` | Grandmaster Calculation and Critical-Moment Decisions | trade | Trade into a won endgame |
| `mg-kg-174376801088-64` | Grandmaster Calculation and Critical-Moment Decisions | discovered | Discovered attack wins the pawn |
| `mg-kg-173990300252-59` | Grandmaster Calculation and Critical-Moment Decisions | quietThreat | A quiet move with a threat |
| `mg-kg-174527620416-65` | Grandmaster Calculation and Critical-Moment Decisions | quietThreat | A quiet move with a threat |
| `mg-kg-184056134368-49` | Synthesis: The Full Grandmaster MSPC Loop | material | Win the pawn on f7 |
| `mg-kg-174048463810-46` | Synthesis: The Full Grandmaster MSPC Loop | quietThreat | A quiet move with a threat |
| `mg-kg-174419031530-43` | Synthesis: The Full Grandmaster MSPC Loop | quietThreat | A quiet move with a threat |
| `mg-kg-174329658090-30` | Synthesis: The Full Grandmaster MSPC Loop | material | Win the knight on f3 |
| `mg-kg-174527620416-63` | Synthesis: The Full Grandmaster MSPC Loop | win | Synthesis: The Full Grandmaster MSPC Loop |
| `mg-kg-173984958128-40` | Synthesis: The Full Grandmaster MSPC Loop | fork | Fork wins the bishop |
| `mg-kg-174526329708-32` | Synthesis: The Full Grandmaster MSPC Loop | skewer | Skewer wins the rook |
