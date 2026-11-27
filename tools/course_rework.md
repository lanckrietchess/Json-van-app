# Course rework (tools/course_rework.py, 9.77.0)

Removed 203 Lichess endgame drills and 9 Lichess middlegame drills.
Added 240 endgame and 264 middlegame drills from Kyenzo's own games, each checked by Stockfish 16 (depth 16).

| Theme | Drills from his games |
|---|---:|
| egt-laws-l1 | 7 |
| egt-mates-l1 | 3 |
| egt-principles-l1 | 7 |
| egt-square-l1 | 7 |
| egt-wincondition-l1 | 7 |
| egt-bishop-knight-l2 | 7 |
| egt-conversion-l2 | 7 |
| egt-opposition-l2 | 7 |
| egt-passers-l2 | 7 |
| egt-queen-l2 | 0 |
| egt-rook-l2 | 7 |
| egt-wincondition-l2 | 7 |
| egt-bishop-knight-l3 | 7 |
| egt-conversion-l3 | 7 |
| egt-opposite-l3 | 5 |
| egt-opposition-l3 | 7 |
| egt-passers-l3 | 7 |
| egt-pieces-vs-l3 | 7 |
| egt-rook-l3 | 7 |
| egt-wincondition-l3 | 7 |
| egt-bishop-knight-l4 | 7 |
| egt-conversion-l4 | 2 |
| egt-mates-l4 | 0 |
| egt-opposition-l4 | 7 |
| egt-passers-l4 | 7 |
| egt-pieces-vs-l4 | 7 |
| egt-queen-l4 | 0 |
| egt-rook-l4 | 7 |
| egt-wincondition-l4 | 7 |
| egt-bishop-knight-l5 | 7 |
| egt-conversion-l5 | 0 |
| egt-fortress-l5 | 7 |
| egt-gm-l5 | 7 |
| egt-opposite-l5 | 0 |
| egt-opposition-l5 | 7 |
| egt-passers-l5 | 7 |
| egt-pieces-vs-l5 | 7 |
| egt-planning-l5 | 7 |
| egt-queen-l5 | 0 |
| egt-rook-l5 | 7 |
| egt-transform-l5 | 6 |
| egt-wincondition-l5 | 7 |
| mgt-ch_t0_01 | 5 |
| mgt-ch_t0_02 | 7 |
| mgt-ch_t0_03 | 7 |
| mgt-ch_t0_04 | 7 |
| mgt-ch_t0_05 | 7 |
| mgt-ch_t0_06 | 7 |
| mgt-ch_t1_01 | 7 |
| mgt-ch_t1_02 | 7 |
| mgt-ch_t1_03 | 7 |
| mgt-ch_t1_04 | 7 |
| mgt-ch_t1_05 | 7 |
| mgt-ch_t1_06 | 7 |
| mgt-ch_t2_01 | 7 |
| mgt-ch_t2_02 | 7 |
| mgt-ch_t2_03 | 7 |
| mgt-ch_t2_04 | 7 |
| mgt-ch_t2_05 | 7 |
| mgt-ch_t2_06 | 7 |
| mgt-ch_t2_07 | 7 |
| mgt-ch_t2_08 | 7 |
| mgt-ch_t2_09 | 7 |
| mgt-ch_t3a_01 | 7 |
| mgt-ch_t3a_02 | 7 |
| mgt-ch_t3a_03 | 7 |
| mgt-ch_t3a_04 | 7 |
| mgt-ch_t3a_05 | 7 |
| mgt-ch_t3a_06 | 7 |
| mgt-ch_t3a_07 | 7 |
| mgt-ch_t3a_08 | 7 |
| mgt-ch_t3b_01 | 7 |
| mgt-ch_t3b_02 | 7 |
| mgt-ch_t3b_03 | 7 |
| mgt-ch_t3b_04 | 7 |
| mgt-ch_t3b_05 | 7 |
| mgt-ch_t3b_06 | 7 |
| mgt-ch_t3b_07 | 7 |
| mgt-ch_t3b_08 | 7 |
| mgt-ch_t3c_01 | 7 |

## Endgame Lab

- Rook endings: 3 positions to know, 24 to play out, 40 key moments (of 164)
- King and pawn endings: 4 positions to know, 24 to play out, 40 key moments (of 122)
- Queen endings: 1 positions to know, 22 to play out, 0 key moments (of 0)
- Knight against bishop: 0 positions to know, 16 to play out, 20 key moments (of 38)
- Opposite-coloured bishops: 0 positions to know, 17 to play out, 8 key moments (of 12)
- Same-coloured bishops: 1 positions to know, 11 to play out, 3 key moments (of 4)
- Knight endings: 0 positions to know, 22 to play out, 17 key moments (of 30)
- Rook against a minor piece: 1 positions to know, 23 to play out, 37 key moments (of 58)
- Rook and minor piece each: 0 positions to know, 24 to play out, 0 key moments (of 0)
- Two rooks each: 0 positions to know, 24 to play out, 0 key moments (of 0)
- Piece against pawns: 0 positions to know, 19 to play out, 31 key moments (of 61)
- Basic mates: 3 positions to know, 16 to play out, 5 key moments (of 7)

## Middlegame Lab

- The Greek Gift (Bxh7+ / ...Bxh2+): 8 found, 5 missed (of 13)
- The f7 / f2 sacrifice: 14 found, 14 missed (of 32)
- The knight sacrifice (d5, f5, e6, ...): 40 found, 40 missed (of 140)
- The exchange sacrifice (a rook for a minor piece): 40 found, 32 missed (of 77)
- The rook sacrifice on the king's cover (Rxh7, Rxg7, ...): 40 found, 23 missed (of 78)
- The bishop sacrifice next to the king (Bxg6, Bxg7, ...): 35 found, 26 missed (of 66)
- The queen sacrifice: 40 found, 40 missed (of 163)
- The pawn sacrifice for time and open lines: 8 found, 29 missed (of 40)
- Plan, Queenless middlegame (queens traded by move 15): 40 positions (of 401)
- Plan, Half-open f-file for you (the f-pawn was exchanged): 40 positions (of 311)
- Plan, Kings castled on opposite wings: pawn storms: 40 positions (of 219)
- Plan, Open centre (no d- or e-pawns left): 40 positions (of 201)
- Plan, They have the isolated queen's pawn: 40 positions (of 133)
- Plan, You have the isolated queen's pawn: 40 positions (of 90)
- Plan, You have hanging pawns (c + d): 40 positions (of 71)
- Plan, Pawn chain d4-e5 against e6-d5 (Advance Caro / French): 40 positions (of 63)
- Plan, They have hanging pawns (c + d): 40 positions (of 52)
- Plan, Carlsbad structure (you have d4 against their d5 + c6, or the mirror): 40 positions (of 45)
- Plan, Carlsbad with your queenside pawns: the minority attack: 28 positions (of 29)
- Plan, Doubled g-pawns after ...hxg6 / Bxg6 recaptures: 26 positions (of 29)
- Plan, Stonewall (d4-e3-f4 or d5-e6-f5): 15 positions (of 22)
