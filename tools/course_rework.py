#!/usr/bin/env python3
# tools/course_rework.py (9.77.0): the middlegame and endgame courses rebuilt on Kyenzo's own games, asked by Kyenzo on
# 26 Nov 2026 ("the Lichess puzzles do not match the lessons: train the real positions").
#
#   python3 tools/course_rework.py --games DIR_WITH_games-*.json_and_puzzles-*.json [--content content.json] [--depth 16] [--write]
#   then: node tools/course_truth.mjs content.json tools/course_engine.json --write     (the texts of the new drills)
#
# 1. Course drills. Every endgame and middlegame position of his ~5,100 analysed games (master-data puzzles-*.json) gets a
#    kind of chess by the board alone: the endgame type (rook, pawn, knight against bishop, ...) and what the solution does
#    (king move, pawn push, the trade into a pawn ending, a mate, the Greek Gift, an exchange sacrifice, a plan move in the
#    IQP / Carlsbad / ... structure of tools/middlegame_plans.py). Each theme of the courses (egthemes / mgthemes: anchor,
#    3 simple, 3 hard) takes positions of ITS kind, near its level by his rating at the time. Stockfish (--depth, 3 lines)
#    re-checks every pick: its best move must be the only good one (the second best drops 10 % win chance or more, and not
#    both winning), the line goes on only while every move of yours stays the only good one. The drills are kg-<game>-<ply>
#    (lists.endgame) and mg-kg-<game>-<ply> (lists.middlegame); the Lichess-based lc-* and mg-lc-* drills are removed. The
#    Blueprint (bp-*) and theory (th-*) drills stay. Texts: tools/course_truth.mjs from the same engine data (this tool
#    writes their entries into tools/course_engine.json in its format: cp and mate from White's side).
# 2. The Labs (data/eg-lab.json, data/mg-lab.json, read by LC108). Endgame Lab: per endgame type the lessons that teach it,
#    the positions to know by heart (each one proven here: win, or draw, by Stockfish), positions of his games to PLAY OUT
#    against Stockfish (goal win when Stockfish gives +2.5 or more, goal hold when it gives between -2.2 and +0.4, both re-
#    checked at --depth), what he played there (moves only: no names) and his key moments of that type (ids for LC95).
#    Middlegame Lab: the typical sacrifices (Greek Gift, f7 / f2, knight on d5 / f5 / e6, exchange, rook on the king, queen,
#    pawn) and the plans per structure, each with the moments of his games where it was the only good move (or missed).
# Never stored: opponent names, game links (they name the opponent), anything Stockfish did not confirm here.
import argparse, collections, glob, json, math, os, random, re, sys, time
import chess, chess.engine
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import middlegame_plans as MP

V = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}
GOOD = ('brilliant', 'great', 'punish')
TIERS = ['0-799', '800-1199', '1200-1599', '1600-1999', '2000+']
TIER_RATING = {'0-799': 700, '800-1199': 1000, '1200-1599': 1400, '1600-1999': 1800, '2000+': 2050}
SIDE = {True: 'White', False: 'Black'}

def wp(cp):  # win chance (%) for the side the score belongs to, the Lichess curve
    return 50 + 50 * (2 / (1 + math.exp(-0.00368208 * cp)) - 1)

def pov(info, turn):
    return info['score'].pov(turn).score(mate_score=10000)

def white(info):
    s = info['score'].white()
    return {'cp': s.score(), 'mate': s.mate()}

def pieces(b, c):
    return {p: len(b.pieces(p, c)) for p in (chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN)}

def sqcol(s): return (chess.square_file(s) + chess.square_rank(s)) % 2

# ---------------------------------------------------------------- endgame types
EG_TYPES = [
    ('rook', 'Rook endings', 'One rook each, plus pawns.'),
    ('kp', 'King and pawn endings', 'Only kings and pawns.'),
    ('queen', 'Queen endings', 'One queen each, plus pawns.'),
    ('nb', 'Knight against bishop', 'One knight against one bishop, plus pawns.'),
    ('bb-opp', 'Opposite-coloured bishops', 'One bishop each, on different colours.'),
    ('bb-same', 'Same-coloured bishops', 'One bishop each, on the same colour.'),
    ('nn', 'Knight endings', 'One knight each, plus pawns.'),
    ('r-minor', 'Rook against a minor piece', 'A rook against a knight or a bishop.'),
    ('rm', 'Rook and minor piece each', 'Rook + knight or bishop on both sides.'),
    ('rooks2', 'Two rooks each', 'Two rooks each, plus pawns.'),
    ('minor-pawns', 'Piece against pawns', 'One side has a minor piece, the other only pawns.'),
    ('mates', 'Basic mates', 'Mate with queen, rook, or bishop and knight.'),
]
EG_LESSONS = {   # the Endgame Blueprint lessons (courses.endgame) that teach each type
    'rook': ['eg-bp-rook-l2', 'eg-bp-rook-l3', 'eg-bp-rook-l4', 'eg-bp-rook-l5'],
    'kp': ['eg-bp-square-l1', 'eg-bp-opposition-l2', 'eg-bp-passers-l2', 'eg-bp-opposition-l3', 'eg-bp-passers-l3', 'eg-bp-opposition-l4'],
    'queen': ['eg-bp-queen-l2', 'eg-bp-queen-l4', 'eg-bp-queen-l5'],
    'nb': ['eg-bp-bishop-knight-l3', 'eg-bp-bishop-knight-l4', 'eg-bp-bishop-knight-l5'],
    'bb-opp': ['eg-bp-opposite-l3', 'eg-bp-opposite-l5'],
    'bb-same': ['eg-bp-bishop-knight-l2', 'eg-bp-bishop-knight-l3'],
    'nn': ['eg-bp-bishop-knight-l4'],
    'r-minor': ['eg-bp-pieces-vs-l3', 'eg-bp-pieces-vs-l4', 'eg-bp-pieces-vs-l5'],
    'rm': ['eg-bp-conversion-l3', 'eg-bp-pieces-vs-l5'],
    'rooks2': ['eg-bp-rook-l3', 'eg-bp-conversion-l3'],
    'minor-pawns': ['eg-bp-bishop-knight-l2', 'eg-bp-pieces-vs-l3'],
    'mates': ['eg-bp-mates-l1', 'eg-bp-mates-l4'],
}
EG_STEPS = {   # the coach's short checklist per type (how to play it); the full rules are the lessons above
    'rook': ['Put your rook behind the passed pawn: behind your own to push it, behind theirs to stop it.',
             'An active rook is worth a pawn. Do not guard a pawn from the side if you can attack something instead.',
             'Cut their king off along a file or a rank before you push.',
             'Winning with a pawn on the 7th: build the bridge (Lucena). Defending: rook on your third rank, then checks from behind (Philidor).',
             'Check from far away, from the long side: three files or more between your rook and the pawn.',
             'Trade into the pawn ending only after you counted that it wins.'],
    'kp': ['Count first: every tempo decides. Whose king reaches the key squares first?',
           'The opposition: kings facing each other with one square between; the side NOT to move holds it.',
           'Key squares: with your king on a key square of your pawn, the pawn queens whoever moves.',
           'The rule of the square: draw the square from the pawn to the last rank. A king inside it catches the pawn.',
           'An outside passed pawn wins: it pulls their king away, your king eats the other side.',
           'Defending: keep your king in front of the pawn. A rook pawn with your king in the corner is a draw.'],
    'queen': ['Centralise the queen first: the centre gives checks on every side.',
              'The king hides close to the enemy king or in front of its own passed pawn.',
              'Your passed pawn is the plan: every check you can stop with a block that pushes it is a gain.',
              'Queen against a pawn on the 7th: check and pin until their king stands in front of its pawn, then bring your king one step.',
              'Defending: perpetual check is your draw. Look for it before every move.'],
    'nb': ['The bishop wants open play and pawns on both wings; the knight wants a closed position and pawns on one wing.',
           'Put your pawns on the colour your bishop does NOT control, so the bishop defends them from far and the king blocks the rest.',
           'A knight needs a protected square (an outpost) that no pawn can attack.',
           'The king goes to the side where the play is, usually to attack the pawns on the bishop\'s other colour.',
           'A knight cannot lose a tempo: in tight positions that decides.'],
    'bb-opp': ['The defender builds a fortress: the king blocks one passed pawn, the bishop stops the other from far.',
               'The attacker needs two passed pawns far apart (best: three files or more), one for the king and one for the bishop.',
               'Pawns on the colour of the defending bishop are targets; put yours on your own bishop\'s colour when you defend.',
               'Two pawns up is often still a draw. Count the files between the passed pawns before you trade.'],
    'bb-same': ['A good bishop sees the squares its own pawns do not stand on; a bad bishop is locked by its pawns.',
                'Fix their pawns on your bishop\'s colour, then attack them.',
                'Your king decides: bring it to the side where their pawns are weak.',
                'With bishop + rook pawn: if the bishop does not control the queening corner and their king gets there, it is a draw.'],
    'nn': ['Knight endings play like pawn endings: the king and the passed pawn decide.',
           'An outside passed pawn is even stronger with knights: a knight is slow to come back.',
           'Look for the knight check that forks king and pawn, and the fork that trades into a won pawn ending.',
           'A knight stops a pawn best from in front of it.'],
    'r-minor': ['Up the exchange: keep pawns on both wings, open files for the rook, and trade pawns only when your king can win the rest.',
                'Rook against bishop without pawns: the defender\'s king goes to the corner the bishop does not control.',
                'Rook against knight without pawns: keep the knight next to its king; a knight cut off from its king can be lost.',
                'The defender wants pawns on one wing and a fortress for the minor piece.'],
    'rm': ['Find the worst piece on each side; improving yours is the plan.',
           'Decide which trade helps you: trade the rooks or the minor pieces, but only into an ending you counted.',
           'Rook + bishop work well with pawns on both wings; rook + knight with play on one side.',
           'King activity still counts: bring it to the centre once the queens are off.'],
    'rooks2': ['Double rooks on an open file, then go to the 7th rank: two rooks on the 7th often mate or win pawns.',
               'Trade one pair of rooks when you are ahead: one rook each is simpler to win.',
               'When you are worse, keep both rooks: more pieces, more chances for checks and counterplay.'],
    'minor-pawns': ['Count: can the piece stop the pawns, or do two connected pawns on the 6th beat it?',
                    'The king must help: the side whose king reaches the pawns first decides.',
                    'A knight against a rook pawn on the 7th is the hardest case for the knight; a bishop stops pawns from far.'],
    'mates': ['Queen or rook: build a box around their king and make it smaller with every move.',
              'Bring your king close: the mate needs it (except the queen in the corner).',
              'Stalemate check before every queen move: leave their king a free square until the mating move.',
              'Bishop + knight: drive the king to the corner of the bishop\'s colour. The W-manoeuvre of the knight keeps it there.'],
}

def eg_type(b, me):
    a, o = pieces(b, me), pieces(b, not me)
    ta, to = sum(a.values()), sum(o.values())
    N, B, R, Q = chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN
    pawns = len(b.pieces(chess.PAWN, True)) + len(b.pieces(chess.PAWN, False))
    only = lambda d, **w: d[N] == w.get('n', 0) and d[B] == w.get('b', 0) and d[R] == w.get('r', 0) and d[Q] == w.get('q', 0)
    if ta == 0 and to == 0: return 'kp' if pawns else None
    if not pawns:
        if (ta, to) in ((1, 0), (0, 1)) and (a[Q] or o[Q] or a[R] or o[R]): return 'mates'
        if (ta, to) in ((2, 0), (0, 2)) and ((a[B] == 1 and a[N] == 1) or (o[B] == 1 and o[N] == 1)): return 'mates'
        if (only(a, r=1) and (only(o, n=1) or only(o, b=1))) or (only(o, r=1) and (only(a, n=1) or only(a, b=1))): return 'r-minor'
        return None
    if only(a, r=1) and only(o, r=1): return 'rook'
    if only(a, r=2) and only(o, r=2): return 'rooks2'
    if only(a, q=1) and only(o, q=1): return 'queen'
    if (only(a, n=1) and only(o, b=1)) or (only(a, b=1) and only(o, n=1)): return 'nb'
    if only(a, b=1) and only(o, b=1):
        return 'bb-same' if sqcol(next(iter(b.pieces(B, True)))) == sqcol(next(iter(b.pieces(B, False)))) else 'bb-opp'
    if only(a, n=1) and only(o, n=1): return 'nn'
    if (only(a, r=1) and (only(o, n=1) or only(o, b=1))) or (only(o, r=1) and (only(a, n=1) or only(a, b=1))): return 'r-minor'
    if a[R] == 1 and o[R] == 1 and ta == 2 and to == 2 and not a[Q] and not o[Q]: return 'rm'
    if (ta == 1 and a[N] + a[B] == 1 and to == 0) or (to == 1 and o[N] + o[B] == 1 and ta == 0): return 'minor-pawns'
    return None

def material(b, c):
    return sum(V[p.piece_type] * (1 if p.color == c else -1) for p in b.piece_map().values())

# ---------------------------------------------------------------- what the solution does
def push_line(fen, ucis):
    b = chess.Board(fen); out = []
    for u in ucis:
        try: m = chess.Move.from_uci(u)
        except Exception: break
        if m not in b.legal_moves: break
        out.append((b.copy(), m)); b.push(m)
    return out, b

def sac_kind(b, m):
    """the kind of sacrifice m is, or None: it gives a piece that a cheaper piece (or nothing) can take back, and is not won back at once"""
    p = b.piece_at(m.from_square); me = p.color
    cap = b.piece_at(m.to_square); cv = V[cap.piece_type] if cap else (1 if b.is_en_passant(m) else 0)
    pv = V[p.piece_type]
    a = b.copy(); a.push(m)
    att = [V[a.piece_at(s).piece_type] for s in a.attackers(not me, m.to_square)]
    if not att: return None
    defended = bool(a.attackers(me, m.to_square))
    if not (min(att) < pv or not defended): return None
    if pv - cv < 2 and not (p.piece_type == chess.PAWN and cv == 0 and not defended): return None
    ek = b.king(not me); tf = chess.square_name(m.to_square)
    if p.piece_type == chess.BISHOP and cap and cap.piece_type == chess.PAWN and tf in ('h7', 'h2') and a.is_check(): return 'greek-gift'
    if p.piece_type in (chess.BISHOP, chess.KNIGHT) and tf in ('f7', 'f2') and cap and cap.piece_type == chess.PAWN: return 'f7'
    if p.piece_type == chess.KNIGHT and tf[0] in 'cdef' and tf[1] in ('45' if not me else '45') : return 'knight'
    if p.piece_type == chess.KNIGHT: return 'knight'
    if p.piece_type == chess.ROOK and cap and cap.piece_type in (chess.KNIGHT, chess.BISHOP): return 'exchange'
    if p.piece_type == chess.ROOK and ek is not None and chess.square_distance(ek, m.to_square) <= 2: return 'rook-king'
    if p.piece_type == chess.QUEEN: return 'queen'
    if p.piece_type == chess.PAWN: return 'pawn'
    if p.piece_type == chess.BISHOP and ek is not None and chess.square_distance(ek, m.to_square) <= 2: return 'bishop-king'
    return None

SACS = [
    ('greek-gift', 'The Greek Gift (Bxh7+ / ...Bxh2+)',
     ['The bishop takes h7 (h2) with check and the king has to take or run.',
      'A knight can jump to g5 (g4) with check, and nothing takes it for free.',
      'The queen reaches h5 or the h-file in one move.',
      'No defending knight on f6 (f3): an e5-pawn often chased it away first.',
      'Check every king move: Kg8, Kg6 and Kh6 (and Kg1, Kg3, Kh3). You need an answer to each before you give the bishop.',
      'A pawn on h6 or a bishop on e7 (or a queen that covers g5) shuts it down.'],
     'mg-ch-t1-03-l2'),
    ('f7', 'The f7 / f2 sacrifice',
     ['f7 (f2) is guarded only by the king at the start: it is the weakest square.',
      'Bxf7+ or Nxf7 pulls the king out before it castles.',
      'The follow-up must be ready: a knight check on g5 / e6, a queen check, a rook on the f-file.',
      'Count what you win back: the rook on h8, the queen after a fork, or a mating attack.'],
     'mg-ch-t1-01-l2'),
    ('knight', 'The knight sacrifice (d5, f5, e6, ...)',
     ['The knight lands on a square their pawn covers. When the pawn takes, a file or a diagonal opens.',
      'It works when your rooks and queen already aim at that line (the e-file, the long diagonal, their king).',
      'Before you play it, see what you get back if they do NOT take: often the knight just stays there and wins.'],
     'mg-ch-t3b-04-l5'),
    ('exchange', 'The exchange sacrifice (a rook for a minor piece)',
     ['You give a rook for a knight or a bishop, and you get something that stays: their pawns broken, their best piece gone, a big knight, a passed pawn, or their king open.',
      'It is positional: Stockfish says the position is still fine for you afterwards.',
      'Typical: Rxc3 against the c3-knight, Rxf6 against the king\'s knight, Rxe6 to break the centre.'],
     'mg-ch-t3b-03-l5'),
    ('rook-king', 'The rook sacrifice on the king\'s cover (Rxh7, Rxg7, ...)',
     ['The rook takes a pawn in front of their king to open it.',
      'The other pieces must be ready to come in at once: a queen on the h-file, a bishop on the long diagonal.',
      'Count the checks after the sacrifice: if they run out, the sacrifice was too early.'],
     'mg-ch-t1-03-l2'),
    ('bishop-king', 'The bishop sacrifice next to the king (Bxg6, Bxg7, ...)',
     ['The bishop takes a pawn of the king\'s cover to open the files and diagonals around the king.',
      'You need a second attacker ready to use the open lines: the queen, a rook lift, a knight.'],
     'mg-ch-t1-03-l2'),
    ('queen', 'The queen sacrifice',
     ['Give the queen only for mate or for more material back: count the whole line.',
      'Most queen sacrifices are about the back rank, a smothered mate, or a deadly pin.'],
     'mg-ch-t0-05-l1'),
    ('pawn', 'The pawn sacrifice for time and open lines',
     ['A pawn for a lead in development, an open file against their king, or a strong square for your piece.',
      'It works when they need moves to take it and then to cover the holes.',
      'If you cannot name what you get for the pawn, do not give it.'],
     'mg-ch-t3b-04-l5'),
]
PLAN_STEPS = {   # the coach's plan per structure (tools/middlegame_plans.py); the full lessons are linked
    'iqp-mine': ['You have the isolated pawn: play for activity and the attack, not for the endgame.', 'Knight to e5 (e4), a rook to the e- or d-file, the bishop on the b1-h7 diagonal aimed at the king.', 'Push d5 (d4) when your pieces are ready: it opens the position at the right moment.', 'Avoid trades: every trade makes the pawn weaker.'],
    'iqp-theirs': ['They have the isolated pawn: block the square in front of it with a knight.', 'Trade pieces, especially the attackers (their knight on e4 / e5, their light bishop).', 'Then attack the pawn with rooks on the d-file. The endgame is good for you.'],
    'hanging-mine': ['You have hanging pawns: keep them side by side and mobile.', 'Push one of them (d5 or c5) when it opens lines for your pieces; do not push without a reason.', 'Your pieces belong behind them, ready for the break.'],
    'hanging-theirs': ['They have hanging pawns: attack them so that one has to advance, then block the square in front of it.', 'After the push, the other pawn and the square in front become targets.'],
    'carlsbad': ['Carlsbad: the side with the queenside pawns plays the minority attack b4-b5 (...b5-b4) to give the other side a weak c-pawn.', 'The other side plays for the kingside or for the e4 (e5) break.', 'Knights love the square in front of the weak pawn.'],
    'minority': ['Minority attack: push the b-pawn to b5 (...b4), trade on c6 (c3) and attack the backward c-pawn with rooks and pieces.', 'Before you push, put a rook on the b-file or the c-file and a knight ready for c5 / e5.'],
    'chain-e5': ['Pawn chain d4-e5 against e6-d5: attack the base of the chain.', 'With the chain: f4-f5 or a kingside attack (the e5-pawn takes f6 from their knight).', 'Against it: ...c5 and ...f6 hit d4 and e5; put pressure on d4 with ...Nc6, ...Qb6.'],
    'f-file': ['The half-open f-file: rook (or two) on f1, pressure on f7 (f2).', 'Combine it with the knight to g5 and the bishop on the a2-g8 diagonal.'],
    'opposite': ['Kings on opposite wings: it is a race. Pawns forward against their king, fast.', 'Count the tempi: open a file against their king before they open one against yours.', 'Every move that does not attack or defend is lost.'],
    'stonewall': ['Stonewall: the knight goes to e5 (e4), backed by the f-pawn and the d-pawn.', 'Kingside attack: Rf3-h3, Qh5, g4-g5. The dark squares (e5 / e4) are the point.', 'Against it: trade the dark bishop of the Stonewall side, put a knight on e4 (e5).'],
    'doubled-g': ['Doubled g-pawns: the h-file is open or opens. Rook to h1 (h8) and look for checks on the h-file.', 'The doubled pawns cover f5 and h5: use the other squares around the king.'],
    'open-centre': ['Open centre: activity counts most. Rooks on the open d- and e-files, bishops on long diagonals.', 'The bishop pair is strong here. Do not trade a bishop for a knight without a reason.'],
    'queenless': ['Queens are off: play it as an endgame. Bring the king to the centre.', 'Find the weak pawn on their side and put your pieces on it; make a passed pawn.'],
}
MG_STRUCT_LESSON = {'iqp-mine': 'mg-ch-t2-03-l3', 'iqp-theirs': 'mg-ch-t2-03-l3', 'hanging-mine': 'mg-ch-t2-04-l3', 'hanging-theirs': 'mg-ch-t2-04-l3',
                    'carlsbad': 'mg-ch-t2-02-l3', 'minority': 'mg-ch-t2-02-l3', 'chain-e5': 'mg-ch-t2-07-l3', 'f-file': 'mg-ch-t1-04-l2',
                    'opposite': 'mg-ch-t3a-06-l4', 'stonewall': 'mg-ch-t2-05-l3', 'doubled-g': 'mg-ch-t2-05-l3', 'open-centre': 'mg-ch-t2-08-l3',
                    'queenless': 'mg-transitions-l5'}

# ---------------------------------------------------------------- positions to know by heart (each proven by Stockfish below)
THEORY = [
    # id, type, fen, goal, title, how, mateOnly
    ('th-keysq', 'kp', '8/8/4k3/8/4K3/8/4P3/8 w - - 0 1', 'win', 'Key squares: the king in front wins',
     ['Your king on e4 stands on a key square of the e2-pawn (d4, e4 and f4).', 'From a key square the pawn queens, whoever is to move: keep the king in front and push the pawn only when the king has room.', 'Use the opposition to keep their king out: when the kings face each other, make them step aside.'], False),
    ('th-oppo-hold', 'kp', '8/4k3/8/4PK2/8/8/8/8 b - - 0 1', 'draw', 'Opposition: the defender holds',
     ['Black to move. Take the opposition: Kf7, facing the white king with one square between.', 'Keep facing their king. If you step aside, their king reaches a key square and the pawn queens.', 'When the pawn reaches the 7th rank with check, step straight in front of it (to the queening square): then it is stalemate or the pawn falls.'], False),
    ('th-square', 'kp', '7k/8/8/8/1p3K2/8/8/8 w - - 0 1', 'draw', 'The rule of the square',
     ['Draw the square from the b4-pawn to b1: b4, e4, e1, b1.', 'Your king on f4 can step into it with Ke3: inside the square it catches the pawn.', 'Then take the pawn: king against king is a draw.'], False),
    ('th-rookpawn', 'kp', '7k/8/6K1/7P/8/8/8/8 b - - 0 1', 'draw', 'Rook pawn: the corner draws',
     ['Black to move. With a rook pawn, your king in the corner (h8) is a draw.', 'Stay on h8 and g8. Their king cannot drive you out without stalemate.'], False),
    ('th-lucena', 'rook', '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', 'win', 'Lucena: build the bridge',
     ['Your pawn is on the 7th, your king on the queening square, their king cut off. This wins.', '1. Check their king one file further away (Rd1+).', '2. Lift your rook to the 4th rank (Rd4).', '3. Walk your king out towards the rook\'s side; when the checks come, block with the rook on the 4th: the bridge.'], False),
    ('th-philidor', 'rook', '3k4/7R/r7/3PK3/8/8/8/8 b - - 0 1', 'draw', 'Philidor: the third-rank defence',
     ['Black to move. Keep your rook on the 6th rank (your third rank): their king cannot come forward.', 'When the pawn steps to the 6th, your rook goes to the 1st rank and checks from behind: their king has no shelter any more.', 'Keep your king in front of the pawn.'], False),
    ('th-cut', 'rook', '1K6/8/5k2/5p2/8/8/R7/8 w - - 0 1', 'win', 'Rook against pawn: cut the king off',
     ['Rook against a pawn with their king next to it: cut their king off from the pawn first.', 'Here Ra5! cuts it along the 5th rank; then the rook and your king win the pawn.'], False),
    ('th-qvp', 'queen', '6Q1/8/5K2/8/8/8/4p3/5k2 w - - 0 1', 'win', 'Queen against a pawn on the 7th',
     ['Check and pin until their king has to stand in front of its own pawn.', 'That gives you a free move: bring your king one step closer. Repeat until your king helps to win the pawn or mate.'], False),
    ('th-wrongb', 'bb-same', '7k/8/5K2/7P/8/8/8/3B4 b - - 0 1', 'draw', 'The wrong bishop',
     ['Black to move. Their bishop is light-squared, the queening square h8 is dark: the wrong bishop.', 'Go to the corner and stay there (h8, g8, h7). Nothing can drive your king out without stalemate.'], False),
    ('th-rvb', 'r-minor', '6bk/8/5K2/8/8/8/8/R7 b - - 0 1', 'draw', 'Rook against bishop: the right corner',
     ['Black to move. Rook against bishop with no pawns is a draw when your king uses the corner the bishop does NOT control.', 'Your bishop is light-squared and h8 is dark: stay near h8 and keep the bishop next to the king, out of forks.', 'Survive 50 moves without a capture and it is a draw (the 50-move rule), or repeat the position.'], False),
    ('th-kqk', 'mates', '8/8/8/3k4/8/8/8/Q3K3 w - - 0 1', 'win', 'Mate with the queen',
     ['Box their king in: put the queen a knight\'s move away from it and follow it.', 'When it is on the edge, bring your king, and stop to check for stalemate before every queen move.'], True),
    ('th-krk', 'mates', '8/8/8/3k4/8/8/8/R3K3 w - - 0 1', 'win', 'Mate with the rook',
     ['Cut their king off with the rook, then bring your king to face it (the opposition).', 'Check when the kings face each other: the king goes back one rank. Repeat until the edge.', 'When the rook is attacked, move it to the far side and keep the box.'], True),
    ('th-kbnk', 'mates', '8/8/8/4k3/8/8/8/2B1KN2 w - - 0 1', 'win', 'Mate with bishop and knight',
     ['The hardest basic mate: you have 50 moves.', 'Drive their king to the edge, then to the corner of your bishop\'s colour (a1 or h8 for this dark bishop).', 'From the wrong corner, push it along the edge with the W-manoeuvre of the knight.'], True),
]

# ---------------------------------------------------------------- course themes: which positions fit which theme
def eg_topic(b, m, kind, typ, me, ev, line_b):
    """the endgame course topics this position teaches, most specific first"""
    out = []
    p = b.piece_at(m.from_square)
    gives = b.gives_check(m)
    if line_b is not None and line_b.is_checkmate(): out.append('eg-bp-mates')
    if typ == 'kp':
        theirs_passed = any(MP_passed(b, s, not me) for s in b.pieces(chess.PAWN, not me))
        if p.piece_type == chess.KING: out += (['eg-bp-square'] if theirs_passed else []) + ['eg-bp-opposition']
        else: out += ['eg-bp-passers']
    elif typ in ('rook', 'rooks2'): out.append('eg-bp-rook')
    elif typ == 'queen': out.append('eg-bp-queen')
    elif typ in ('nb', 'nn', 'bb-same', 'minor-pawns'): out.append('eg-bp-bishop-knight')
    elif typ == 'bb-opp': out.append('eg-bp-opposite')
    elif typ in ('r-minor', 'rm'): out.append('eg-bp-pieces-vs')
    if b.is_capture(m) and line_b is not None and eg_type(line_b, me) == 'kp' and typ != 'kp': out.append('eg-bp-transform')
    if material(b, me) >= 2 and ev >= 200: out.append('eg-bp-conversion')
    if abs(ev) <= 60: out += ['eg-bp-fortress', 'eg-bp-wincondition']
    if p.piece_type == chess.KING and typ != 'kp': out.append('eg-bp-principles')
    if ev >= 200 and abs(material(b, me)) <= 1: out.append('eg-bp-wincondition')
    if p.piece_type not in (chess.KING, chess.PAWN) and not b.is_capture(m) and not gives: out.append('eg-bp-planning')
    if abs(ev) <= 60 or (line_b is not None and line_b.is_stalemate()): out.append('eg-bp-laws')
    out.append('eg-bp-gm')
    return out

def MP_passed(b, s, c):
    f, r = chess.square_file(s), chess.square_rank(s)
    for q in b.pieces(chess.PAWN, not c):
        qf, qr = chess.square_file(q), chess.square_rank(q)
        if abs(qf - f) <= 1 and ((qr > r) if c else (qr < r)): return False
    return True

def mg_topics(b, m, kind, me, ev_before, struct, tier, ply, line_b):
    out = []
    p = b.piece_at(m.from_square); cap = b.is_capture(m); chk = b.gives_check(m)
    sk = sac_kind(b, m)
    ek = b.king(not me); mk = b.king(me)
    near_k = ek is not None and chess.square_distance(ek, m.to_square) <= 2
    quiet = not cap and not chk
    a = b.copy(); a.push(m)
    if kind in GOOD or kind == 'missed':
        if sk in ('greek-gift', 'rook-king', 'bishop-king') or (line_b is not None and line_b.is_checkmate() and near_k): out.append('mg-ch-t1-03')
        if sk == 'exchange': out.append('mg-ch-t3b-03')
        if sk == 'pawn': out += ['mg-ch-t3b-04', 'mg-ch-t3a-02']
        if sk in ('knight', 'f7', 'queen'): out += ['mg-ch-t3b-04', 'mg-ch-t0-05']
        if ek is not None and chess.square_file(ek) == 4 and chess.square_rank(ek) in (0, 7) and (cap or chk or sk): out.append('mg-ch-t1-01')
        if cap and not sk: out += ['mg-ch-t0-02', 'mg-ch-t0-05']
        if p.piece_type == chess.ROOK and quiet:
            rel = chess.square_rank(m.to_square) if me else 7 - chess.square_rank(m.to_square)
            if rel == 6: out.append('mg-ch-t1-04')
            elif not any(chess.square_file(s) == chess.square_file(m.to_square) for s in b.pieces(chess.PAWN, me)): out.append('mg-ch-t1-04')
        if p.piece_type == chess.PAWN and quiet and any(a.piece_at(s) and a.piece_at(s).piece_type == chess.PAWN and a.piece_at(s).color != me for s in a.attacks(m.to_square)):
            out.append('mg-ch-t1-05')
        if quiet and p.piece_type == chess.KNIGHT:
            rel = chess.square_rank(m.to_square) if me else 7 - chess.square_rank(m.to_square)
            sup = any(b.piece_at(s) and b.piece_at(s).piece_type == chess.PAWN and b.piece_at(s).color == me for s in a.attackers(me, m.to_square))
            if rel in (4, 5) and sup: out.append('mg-ch-t2-05')
        if quiet:
            for s in struct:
                out += {'carlsbad': ['mg-ch-t2-02'], 'minority': ['mg-ch-t2-02'], 'iqp-mine': ['mg-ch-t2-03'], 'iqp-theirs': ['mg-ch-t2-03'],
                        'hanging-mine': ['mg-ch-t2-04'], 'hanging-theirs': ['mg-ch-t2-04'], 'chain-e5': ['mg-ch-t2-07'], 'opposite': ['mg-ch-t3a-06'],
                        'stonewall': ['mg-ch-t2-05'], 'doubled-g': ['mg-ch-t2-05'], 'open-centre': ['mg-ch-t2-08'], 'queenless': ['mg-transitions']}.get(s, [])
            back = (chess.square_rank(m.to_square) < chess.square_rank(m.from_square)) if me else (chess.square_rank(m.to_square) > chess.square_rank(m.from_square))
            if back and p.piece_type in (chess.KNIGHT, chess.BISHOP, chess.QUEEN): out.append('mg-ch-t3a-05')
            if p.piece_type == chess.PAWN and chess.square_file(m.to_square) in (2, 3, 4, 5): out.append('mg-ch-t3a-07')
            if p.piece_type == chess.PAWN and (chess.square_rank(m.to_square) >= 4 if me else chess.square_rank(m.to_square) <= 3): out.append('mg-ch-t3a-04')
            if mk is not None and chess.square_distance(mk, m.to_square) <= 2 and ev_before <= 50: out += ['mg-defence', 'mg-ch-t0-04']
            if not near_k: out += ['mg-prophylaxis', 'mg-planning', 'mg-ch-t2-09', 'mg-ch-t3a-01', 'mg-ch-t0-03']
            out += ['mg-ch-t1-02', 'mg-ch-t3a-03']
        if cap and line_b is not None and not line_b.pieces(chess.QUEEN, True) and not line_b.pieces(chess.QUEEN, False) and (b.pieces(chess.QUEEN, True) or b.pieces(chess.QUEEN, False)):
            out += ['mg-transitions', 'mg-ch-t3b-02']
        if cap and p.piece_type in (chess.KNIGHT, chess.BISHOP) and b.piece_at(m.to_square) and b.piece_at(m.to_square).piece_type in (chess.KNIGHT, chess.BISHOP): out.append('mg-ch-t2-06')
        if ply <= 26: out.append('mg-ch-t3a-08')
        if kind == 'brilliant' or tier in ('1600-1999', '2000+'): out += ['mg-ch-t3b-08', 'mg-ch-t3c-01']
    if kind in ('blunder', 'mistake'):
        out += ['mg-ch-t0-01']
        if mk is not None and chess.square_distance(mk, m.to_square) <= 2: out.append('mg-ch-t0-04')
        if quiet: out.append('mg-defence')
    return out

# ---------------------------------------------------------------- the engine checks
class Eng:
    def __init__(s, path, depth):
        s.e = chess.engine.SimpleEngine.popen_uci(path); s.e.configure({'Threads': 2, 'Hash': 256}); s.d = depth; s.calls = 0
    def an(s, b, mpv=1, depth=None):
        s.calls += 1
        r = s.e.analyse(b, chess.engine.Limit(depth=depth or s.d), multipv=mpv)
        return r if isinstance(r, list) else [r]
    def close(s): s.e.quit()

def only_move(info, turn, hold=False):
    """the first line is the only good one: the second drops 10 % win chance or more, and they are not both winning"""
    if not info or 'pv' not in info[0] or not info[0]['pv']: return False
    s1 = pov(info[0], turn)
    if len(info) < 2: return True
    s2 = pov(info[1], turn)
    if s2 >= 350 and not (s1 >= 9000 and s2 < 9000): return False
    return wp(s1) - wp(s2) >= 10

def verify(E, fen, want=None, max_own=3):
    """Stockfish's line from fen while each own move is the only good one; None if the first move is not"""
    b = chess.Board(fen); turn = b.turn
    i0 = E.an(b, 3)
    if not only_move(i0, turn): return None
    best = i0[0]['pv'][0]
    if want and best.uci() != want:
        return None
    line = [best]; b.push(best)
    after = E.an(b, 1)
    after_w = white(after[0])
    own = 1
    while own < max_own and not b.is_game_over():
        rep = E.an(b, 1, depth=max(12, E.d - 2))
        if not rep[0].get('pv'): break
        r = rep[0]['pv'][0]; b2 = b.copy(); b2.push(r)
        if b2.is_game_over(): break
        nx = E.an(b2, 2, depth=max(12, E.d - 2))
        if not only_move(nx, b2.turn) or not nx[0].get('pv'): break
        if pov(nx[0], b2.turn) < 9000 and pov(nx[0], b2.turn) - pov(i0[0], turn) > 600 and own >= 1 and pov(i0[0], turn) >= 300: break
        line += [r, nx[0]['pv'][0]]; b = b2; b.push(nx[0]['pv'][0]); own += 1
    return {'lines': [dict(white(x), pv=[m.uci() for m in x.get('pv', [])[:10]]) for x in i0], 'line': [m.uci() for m in line],
            'after': dict(after_w, pv=[m.uci() for m in after[0].get('pv', [])[:10]]), 'score': pov(i0[0], turn), 'end': b}

def san_pgn(fen, ucis):
    b = chess.Board(fen); out = []
    for i, u in enumerate(ucis):
        m = chess.Move.from_uci(u)
        if i == 0 or b.turn: out.append((str(b.fullmove_number) + '.') if b.turn else (str(b.fullmove_number) + '...'))
        out.append(b.san(m)); b.push(m)
    s = ' '.join(out)
    return re.sub(r'(\d+\.) ', r'\1', re.sub(r'(\d+\.\.\.) ', r'\1', s))

def year(p):
    try: return time.gmtime(int(p.get('end_time') or 0)).tm_year
    except Exception: return ''

# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--games', required=True); ap.add_argument('--content', default='content.json')
    ap.add_argument('--depth', type=int, default=16); ap.add_argument('--engine', default='/usr/games/stockfish')
    ap.add_argument('--write', action='store_true'); ap.add_argument('--seed', type=int, default=26)
    ap.add_argument('--play', type=int, default=24, help='positions to play out per endgame type')
    ap.add_argument('--stats', action='store_true', help='only classify and print the counts')
    a = ap.parse_args()
    rng = random.Random(a.seed)
    P = []
    for f in sorted(glob.glob(os.path.join(a.games, 'puzzles-*.json'))): P += json.load(open(f))
    G = []
    for f in sorted(glob.glob(os.path.join(a.games, 'games-*.json'))): G += json.load(open(f))
    doc = json.load(open(a.content, encoding='utf-8')); L = doc['lists']
    E = Eng(a.engine, a.depth)
    t0 = time.time()

    # ---- 1. classify every endgame / middlegame moment
    cand = {'endgame': collections.defaultdict(list), 'middlegame': collections.defaultdict(list)}
    eg_moments = collections.defaultdict(list); sac_moments = collections.defaultdict(list); plan_moments = collections.defaultdict(list)
    for p in P:
        if p['phase'] not in ('endgame', 'middlegame'): continue
        if not p.get('prev') or not p.get('prev_fen') or not p.get('best'): continue
        try:
            b = chess.Board(p['fen']); m = chess.Move.from_uci(p['best'])
            if m not in b.legal_moves: continue
        except Exception: continue
        me = b.turn
        steps, end = push_line(p['fen'], p.get('line') or [p['best']])
        ev = (p['eval_before'] if me else -p['eval_before']) if p.get('eval_before') is not None else 0
        if p['kind'] in ('blunder', 'mistake', 'missed'): ev = (p['eval_before'] if me else -p['eval_before']) if p.get('eval_before') is not None else 0
        if p['phase'] == 'endgame':
            typ = eg_type(b, me)
            if not typ: continue
            if p['kind'] in GOOD or p['kind'] == 'missed':
                eg_moments[typ].append(p)
            if p['kind'] in GOOD or p['kind'] in ('missed', 'blunder'):
                for t in eg_topic(b, m, p['kind'], typ, me, ev, end):
                    if t == 'eg-bp-gm' and p['tier'] not in ('1600-1999', '2000+'): continue
                    cand['endgame'][t].append((p, typ))
        else:
            struct = [sid for sid, name, test, kw in MP.STRUCTURES if test(b, me)]
            sk = sac_kind(b, m)
            if sk and (p['kind'] in GOOD or p['kind'] == 'missed'): sac_moments[sk].append(p)
            if (p['kind'] in GOOD) and not b.is_capture(m) and not b.gives_check(m):
                for s in struct: plan_moments[s].append(p)
            for t in mg_topics(b, m, p['kind'], me, ev, struct, p['tier'], p['ply'], end):
                cand['middlegame'][t].append((p, sk or ''))
    print('classified in', round(time.time() - t0), 's |', {k: len(v) for k, v in cand['endgame'].items()}, flush=True)
    print('middlegame topics', {k: len(v) for k, v in cand['middlegame'].items()}, flush=True)
    print('sacrifices', {k: len(v) for k, v in sac_moments.items()}, '| plans', {k: len(v) for k, v in plan_moments.items()}, flush=True)
    if a.stats: E.close(); return

    # ---- 2. fill the themes: anchor + 3 simple + 3 hard, near the theme's level, each one re-checked by Stockfish
    engine_out = {}
    used = set(); new_drills = {'endgame': [], 'middlegame': []}; theme_fill = {}
    def tier_dist(p, tab): return abs(TIERS.index(p['tier']) - (tab - 1))
    def score_order(p, tab):  # near the level, the clear ones first (big win-chance gap), one per game
        return (tier_dist(p, tab), {'brilliant': 0, 'great': 1, 'punish': 2, 'missed': 3, 'blunder': 4, 'mistake': 5}.get(p['kind'], 6), -(p.get('loss') or 0), rng.random())
    def build(p, grp, th, extra):
        key = p['id']
        if key in used: return None
        b0 = chess.Board(p['prev_fen'])
        try:
            mv = chess.Move.from_uci(p['prev'])
            if mv not in b0.legal_moves: return None
        except Exception: return None
        r = verify(E, p['fen'], want=p['best'], max_own=3)
        if not r: return None
        used.add(key)
        did = ('kg-' if grp == 'endgame' else 'mg-kg-') + key
        sol = [p['prev']] + r['line']
        me = chess.Board(p['fen']).turn
        typ = extra
        names = dict((x[0], x[1]) for x in EG_TYPES)
        sname = dict((x[0], x[1]) for x in SACS)
        tag = "Kyenzo's games · " + (names.get(typ, 'Endgame') if grp == 'endgame' else (sname.get(typ) or th.get('topic') or 'Middlegame')) + ' · ' + p['tier'] + ' game'
        d = {'id': did, 'title': th.get('topic') or th['title'], 'tag': tag, 'fen': p['prev_fen'], 'side': 'w' if me else 'b',
             'pgn': san_pgn(p['prev_fen'], sol), 'ann': {}, 'brief': '', 'principle': '', 'topicId': th['topicId'], 'topic': th.get('topic') or th['title'],
             'chap': th.get('chap'), 'lvl': th['lvl'], 'requiredTier': th.get('requiredTier', 0), 'puzzle_fen': p['prev_fen'], 'solution_moves': sol,
             'source': "Kyenzo's own game (" + str(p.get('time_class') or 'online') + ', ' + str(year(p)) + '), move ' + str(chess.Board(p['fen']).fullmove_number) +
                       ('; in the game he found it' if p['kind'] in GOOD else '; in the game he missed it'),
             'verified': 'Stockfish 16, depth ' + str(a.depth) + ': the only good move' + (' every move of the line' if len(r['line']) > 1 else ''),
             'rating': TIER_RATING.get(p['tier']), 'pieces': len(chess.Board(p['fen']).piece_map()), 'plies': len(sol), 'themes': [],
             'setup': True, 'kg': {'game': str(p['game_id']), 'ply': p['ply'], 'kind': p['kind'], 'tier': p['tier'], 'type': typ},
             'coaching_tip': '(Linked course: ' + (th.get('title') or '') + '.)'}
        if grp == 'middlegame': d['themeId'] = th['id']
        b1 = chess.Board(p['prev_fen']); b1.push(chess.Move.from_uci(p['prev']))
        ob = E.an(chess.Board(p['prev_fen']), 1, depth=max(12, a.depth - 2))
        engine_out[did] = {'setup': p['prev'], 'P0': b1.fen(), 'ours': r['line'], 'legal': True, 'lines': r['lines'], 'after': r['after'],
                           'opp': {'best': ob[0]['pv'][0].uci() if ob[0].get('pv') else None, 'pv': [m.uci() for m in ob[0].get('pv', [])[:10]], 'cp': white(ob[0])['cp'], 'mate': white(ob[0])['mate']}}
        return d
    for grp, themes in (('endgame', L['egthemes']), ('middlegame', L['mgthemes'])):
        for th in sorted(themes, key=lambda t: (t['tab'], t['id'])):
            pool = cand[grp].get(th['topicId'], [])
            pool = sorted(pool, key=lambda x: score_order(x[0], th['tab']))
            got = []; games = set(); tries = 0
            for p, extra in pool:
                if len(got) >= 7 or tries >= 28: break
                if p['game_id'] in games or p['id'] in used: continue
                tries += 1
                d = build(p, grp, th, extra)
                if d: got.append(d); games.add(p['game_id'])
            if not got:
                theme_fill[th['id']] = 0; continue
            got.sort(key=lambda d: (d['rating'] or 0, d['plies']))
            anchor = got[0]
            rest = got[1:]
            simple, hard = rest[:len(rest) // 2 + len(rest) % 2][:3], rest[len(rest) // 2 + len(rest) % 2:][:3]
            if len(rest) <= 3: simple, hard = rest[:2], rest[2:]
            th['_new'] = {'anchorId': anchor['id'], 'simpleIds': [d['id'] for d in simple], 'hardIds': [d['id'] for d in hard]}
            new_drills[grp] += got
            theme_fill[th['id']] = len(got)
            print(grp, th['id'], len(got), 'drills |', E.calls, 'engine calls |', round(time.time() - t0), 's', flush=True)

    # ---- 3. Endgame Lab: positions to know (proven), positions to play out, key moments
    lessons = {x['id']: x for x in L['courses.endgame'] + L['courses.middlegame']}
    theory_ok = collections.defaultdict(list)
    for tid, typ, fen, goal, title, how, mate_only in THEORY:
        b = chess.Board(fen); i = E.an(b, 1, depth=max(20, a.depth + 4)); s = pov(i[0], b.turn)
        ok = (s >= (250 if mate_only else 300)) if goal == 'win' else (abs(s) <= 120)
        print('theory', tid, goal, s, 'ok' if ok else 'FAILED', flush=True)
        if ok: theory_ok[typ].append({'id': tid, 'title': title, 'fen': fen, 'goal': goal, 'side': 'w' if b.turn else 'b', 'how': how, 'mateOnly': mate_only,
                                     'proof': 'Stockfish 16, depth ' + str(max(20, a.depth + 4)) + ': ' + ('mate' if abs(s) >= 9000 else ('%+.1f' % (s / 100))) + ' for the side to move'})
    play = collections.defaultdict(list)
    seen_games = collections.defaultdict(set)
    order = G[:]; rng.shuffle(order)
    order.sort(key=lambda g: TIERS.index(g['tier']) if g.get('tier') in TIERS else 9)
    per_tier = collections.defaultdict(collections.Counter)
    for g in order:
        toks = MP.parse(g['pgn']); b = chess.Board(); hist = []; me = chess.WHITE if g['color'] == 'w' else chess.BLACK
        ok = True
        for t in toks:
            try: mv = b.parse_san(t)
            except Exception: ok = False; break
            hist.append(mv); b.push(mv)
        if not ok or len(hist) < 30: continue
        b = chess.Board(); found = None; typ_seen = set()
        for i, mv in enumerate(hist):
            b.push(mv)
            if i < 20 or b.turn != me or b.is_check() or b.is_game_over(): continue
            typ = eg_type(b, me)
            if not typ or typ in typ_seen: continue
            # stable: the same type 4 plies later
            b2 = b.copy(); ok2 = True
            for mv2 in hist[i + 1:i + 5]: b2.push(mv2)
            if len(hist) < i + 5 or eg_type(b2, me) != typ: continue
            typ_seen.add(typ)
            if len(play[typ]) >= a.play * 3 or per_tier[typ][g['tier']] >= max(4, a.play // 3): continue
            evs = g.get('evals') or []
            if len(evs) <= i + 1 or evs[i + 1] is None: continue
            e_me = evs[i + 1] if me else -evs[i + 1]
            goal = 'win' if e_me >= 250 else 'draw' if -220 <= e_me <= 40 else None
            if not goal: continue
            play[typ].append({'g': g, 'ply': i + 1, 'fen': b.fen(), 'goal': goal, 'ev': e_me, 'next': [m.uci() for m in hist[i + 1:i + 41]]})
            per_tier[typ][g['tier']] += 1
    play_out = {}
    for typ, rows in play.items():
        rows.sort(key=lambda r: (TIERS.index(r['g']['tier']), rng.random()))
        keep = []; nwin = ndraw = 0
        for r in rows:
            if len(keep) >= a.play: break
            if r['goal'] == 'win' and nwin >= a.play * 2 // 3: continue
            if r['goal'] == 'draw' and ndraw >= a.play * 2 // 3: continue
            b = chess.Board(r['fen']); i = E.an(b, 1, depth=a.depth); s = pov(i[0], b.turn)
            if r['goal'] == 'win' and not (300 <= s < 9000 or (s >= 9000 and abs(i[0]['score'].pov(b.turn).mate() or 0) >= 6)): continue
            if r['goal'] == 'draw' and not (-220 <= s <= 40): continue
            res = r['g']['result']
            keep.append({'id': 'kp-' + str(r['g']['id']) + '-' + str(r['ply']), 'fen': r['fen'], 'side': 'w' if b.turn else 'b', 'goal': r['goal'],
                         'eval': s, 'tier': r['g']['tier'], 'year': year({'end_time': r['g'].get('end_time')}), 'time': r['g'].get('time_class') or '',
                         'result': res, 'played': r['next'], 'mateOnly': typ == 'mates'})
            if r['goal'] == 'win': nwin += 1
            else: ndraw += 1
        play_out[typ] = keep
        print('play', typ, len(keep), 'positions (', nwin, 'win /', ndraw, 'hold )', flush=True)
    def lesson_rows(ids):
        out = []
        for lid in ids:
            x = lessons.get(lid)
            if not x: continue
            rules = [re.sub(r'^[A-Z]\d+\.\d+\s*\([^)]*\)\.\s*', '', s).strip() for s in (x.get('learn') or []) if s and not s.startswith('#') and not s.startswith('- ')][:8]
            out.append({'id': lid, 'title': x['title'], 'lvl': x.get('lvl'), 'takeaway': x.get('takeaway') or '', 'rules': rules})
        return out
    def pick_moments(rows, n=40):
        rows = sorted(rows, key=lambda p: ({'brilliant': 0, 'great': 1, 'punish': 2, 'missed': 3}.get(p['kind'], 4), TIERS.index(p['tier']), rng.random()))
        out, gs = [], set()
        for p in rows:
            if p['game_id'] in gs: continue
            gs.add(p['game_id']); out.append(p['id'])
            if len(out) >= n: break
        return out
    eg_lab = {'v': '9.77.0', 'note': 'Built by tools/course_rework.py from Kyenzo\'s own games; every position checked by Stockfish 16.', 'types': []}
    for tid, name, what in EG_TYPES:
        eg_lab['types'].append({'id': tid, 'name': name, 'what': what, 'steps': EG_STEPS.get(tid, []), 'lessons': lesson_rows(EG_LESSONS.get(tid, [])),
                                'theory': theory_ok.get(tid, []), 'play': play_out.get(tid, []), 'moments': pick_moments(eg_moments.get(tid, [])),
                                'n': len(eg_moments.get(tid, []))})
    mg_lab = {'v': '9.77.0', 'note': eg_lab['note'], 'sacs': [], 'plans': []}
    for sid, name, check, lid in SACS:
        rows = sac_moments.get(sid, [])
        found = [p for p in rows if p['kind'] in GOOD]; missed = [p for p in rows if p['kind'] == 'missed']
        mg_lab['sacs'].append({'id': sid, 'name': name, 'checklist': check, 'lessons': lesson_rows([lid]), 'found': pick_moments(found), 'missed': pick_moments(missed),
                               'n': len(rows)})
    names = {sid: nm for sid, nm, _, _ in MP.STRUCTURES}
    for sid, steps in PLAN_STEPS.items():
        rows = plan_moments.get(sid, [])
        mg_lab['plans'].append({'id': sid, 'name': names.get(sid, sid), 'steps': steps, 'lessons': lesson_rows([MG_STRUCT_LESSON[sid]]) if sid in MG_STRUCT_LESSON else [],
                                'ids': pick_moments(rows), 'n': len(rows)})
    mg_lab['plans'].sort(key=lambda x: -x['n'])
    E.close()
    print('engine calls', E.calls, '| time', round(time.time() - t0), 's')

    # ---- 4. write
    old_eg = sum(1 for d in L['endgame'] if d['id'].startswith('lc-')); old_mg = sum(1 for d in L['middlegame'] if d['id'].startswith('mg-lc-'))
    if not a.write:
        print('dry run: would replace', old_eg, 'lc-* and', old_mg, 'mg-lc-* drills by', len(new_drills['endgame']), '+', len(new_drills['middlegame']))
        return
    for grp, themes in (('endgame', L['egthemes']), ('middlegame', L['mgthemes'])):
        keep = [d for d in L[grp] if not re.match(r'^(lc|mg-lc|kg|mg-kg)-', d['id'])]
        ids = {d['id'] for d in keep}
        for th in themes:
            nw = th.pop('_new', None)
            old = lambda xs: [x for x in xs if x in ids]          # the Blueprint / theory drills of a theme stay first
            if nw:
                th['anchorId'] = (old([th.get('anchorId')]) or [nw['anchorId']])[0] if th.get('anchorId') else nw['anchorId']
                if th['anchorId'] != nw['anchorId'] and nw['anchorId'] not in nw['simpleIds']: nw['simpleIds'] = [nw['anchorId']] + nw['simpleIds']
                th['simpleIds'] = (old(th.get('simpleIds') or []) + nw['simpleIds'])[:4]
                th['hardIds'] = (old(th.get('hardIds') or []) + nw['hardIds'])[:4]
            else:
                th['anchorId'] = (old([th.get('anchorId')]) or [''])[0] if th.get('anchorId') else ''
                th['simpleIds'] = old(th.get('simpleIds') or []); th['hardIds'] = old(th.get('hardIds') or [])
            if grp == 'endgame' and not th['anchorId']:
                pool = [x for x in th['simpleIds'] + th['hardIds']]
                if pool: th['anchorId'] = pool[0]; th['simpleIds'] = [x for x in th['simpleIds'] if x != pool[0]]; th['hardIds'] = [x for x in th['hardIds'] if x != pool[0]]
        L[grp] = keep + new_drills[grp]
    open(a.content, 'w', encoding='utf-8').write(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
    ce = os.path.join(os.path.dirname(os.path.abspath(a.content)), 'tools', 'course_engine.json')
    eng = json.load(open(ce)) if os.path.exists(ce) else {}
    eng = {k: v for k, v in eng.items() if not re.match(r'^(lc|mg-lc|kg|mg-kg)-', k)}; eng.update(engine_out)
    json.dump(eng, open(ce, 'w'))
    os.makedirs(os.path.join(os.path.dirname(os.path.abspath(a.content)), 'data'), exist_ok=True)
    root = os.path.dirname(os.path.abspath(a.content))
    json.dump(eg_lab, open(os.path.join(root, 'data', 'eg-lab.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(mg_lab, open(os.path.join(root, 'data', 'mg-lab.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    rep = ['# Course rework (tools/course_rework.py, 9.77.0)', '', f'Removed {old_eg} Lichess endgame drills and {old_mg} Lichess middlegame drills.',
           f'Added {len(new_drills["endgame"])} endgame and {len(new_drills["middlegame"])} middlegame drills from Kyenzo\'s own games, each checked by Stockfish 16 (depth {a.depth}).', '',
           '| Theme | Drills from his games |', '|---|---:|'] + [f'| {k} | {v} |' for k, v in theme_fill.items()] + ['',
           '## Endgame Lab', ''] + [f'- {t["name"]}: {len(t["theory"])} positions to know, {len(t["play"])} to play out, {len(t["moments"])} key moments (of {t["n"]})' for t in eg_lab['types']] + ['',
           '## Middlegame Lab', ''] + [f'- {s["name"]}: {len(s["found"])} found, {len(s["missed"])} missed (of {s["n"]})' for s in mg_lab['sacs']] + \
           [f'- Plan, {s["name"]}: {len(s["ids"])} positions (of {s["n"]})' for s in mg_lab['plans']]
    open(os.path.join(root, 'tools', 'course_rework.md'), 'w').write('\n'.join(rep) + '\n')
    print('\n'.join(rep))

if __name__ == '__main__':
    main()
