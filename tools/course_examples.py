#!/usr/bin/env python3
# tools/course_examples.py (9.77.0): every rule, law and lesson of the endgame and middlegame courses gets its OWN examples,
# found on the board by a test written for that rule, from Kyenzo's own games (Chess.com, ~5,100 analysed games) and from the
# Lichess database (tools/lichess_examples.json, made by tools/lichess_examples.py in the workflow "Course examples (Lichess)").
# Asked by Kyenzo on 27 Nov 2026: "go through the Endgame Blueprint, per lesson, per rule and per law a few positions from my
# games and the database, and the middlegame: learn first (specifics, alarm signals, MSPC, the plan, then checks, captures and
# attacks: the most forcing move that supports the plan), then drills from my games and the database".
#
#   python3 tools/course_examples.py build --games DIR (games-*.json + puzzles-*.json of master-data) [--depth 16] [--write]
#
# How an example is found (nothing is said about a position that this tool did not check):
#   1. a DETECTOR per rule looks at the board and the move (python-chess only): "the rook goes behind the passed pawn",
#      "the king takes the opposition", "a knight lands on an outpost no pawn can chase", "Bxh7+ with a knight ready for g5" ...
#      and returns the sentence that says so (it is true by construction: it is what the test measured);
#   2. Stockfish then checks the claim of the rule: a "find" example must have exactly one good move (the next best loses
#      10 % win chance or more), a "win" rule must still win (+2 or mate), a "draw" rule must hold (within 0.8) while the next
#      best loses; a "play" example (a position to play out against Stockfish) must have the goal its rule says (win / draw).
#   3. per rule at most 2 positions of Kyenzo's games and 2 of the Lichess database, from different games, spread over the levels.
# Outputs (with --write):
#   content.json: lists.endgame / lists.middlegame get the drills (kg-*, mg-kg-* his games; ldb-*, mg-ldb-* Lichess), with
#     `rule`, `reason`, `plan` and the source; egthemes / mgthemes take their anchor / simple / hard drills from the rules each
#     theme covers (egthemes.covers, mgthemes.topicId); every lesson's `steps` are rebuilt from the same examples (the old steps
#     still pointed at the removed Lichess drills); tools/course_engine.json gets the engine entries for tools/course_truth.mjs.
#   data/eg-blueprint.json: the Endgame Blueprint (sources/endgame-blueprint.md) as data: tiers, rules with their tag, concepts,
#     must-know positions (each FEN re-checked), typical errors, upgrade triggers, and per rule its examples (find + play + look).
#   tools/course_examples.md: the report (examples per rule, the rules without an example and why).
# Never stored: opponent names, game links, Lichess user names (only the puzzle id, the rating and the year).
import argparse, collections, glob, json, math, os, random, re, sys, time
import chess, chess.engine

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import middlegame_plans as MP

P_, N_, B_, R_, Q_, K_ = chess.PAWN, chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN, chess.KING
V = {P_: 1, N_: 3, B_: 3, R_: 5, Q_: 9, K_: 0}
NAME = {P_: 'pawn', N_: 'knight', B_: 'bishop', R_: 'rook', Q_: 'queen', K_: 'king'}
GOOD = ('brilliant', 'great', 'punish')
TIERS = ['0-799', '800-1199', '1200-1599', '1600-1999', '2000+']
SIDE = {True: 'White', False: 'Black'}

def wp(cp): return 50 + 50 * (2 / (1 + math.exp(-0.00368208 * cp)) - 1)
def sqn(s): return chess.square_name(s)
def rel(s, c): r = chess.square_rank(s); return r if c else 7 - r
def fil(s): return chess.square_file(s)
def pawns(b, c): return list(b.pieces(P_, c))
def pieces(b, c): return {p: len(b.pieces(p, c)) for p in (N_, B_, R_, Q_)}
def npieces(b, c): return sum(pieces(b, c).values())
def material(b, c): return sum(V[p.piece_type] * (1 if p.color == c else -1) for p in b.piece_map().values())
def kp_only(b): return npieces(b, True) == 0 and npieces(b, False) == 0
def sqcol(s): return (fil(s) + chess.square_rank(s)) % 2
def centre_dist(s): return max(abs(3.5 - fil(s)), abs(3.5 - chess.square_rank(s)))

def passed(b, s, c):
    f, r = fil(s), chess.square_rank(s)
    for q in b.pieces(P_, not c):
        qf, qr = fil(q), chess.square_rank(q)
        if abs(qf - f) <= 1 and ((qr > r) if c else (qr < r)): return False
    return True
def passers(b, c): return [s for s in pawns(b, c) if passed(b, s, c)]
def prom(s, c): return chess.square(fil(s), 7 if c else 0)
def steps_to_queen(s, c): r = rel(s, c); return (7 - r) - (1 if r == 1 else 0)
def in_square(k, s, c, defender_to_move):
    if k is None: return False
    d, n = chess.square_distance(k, prom(s, c)), steps_to_queen(s, c)
    return d <= n if defender_to_move else d <= n - 1
def ahead(s, c, n=1):
    r = chess.square_rank(s) + (n if c else -n)
    return chess.square(fil(s), r) if 0 <= r <= 7 else None
def key_squares(s, c):
    f, r = fil(s), rel(s, c)
    if f in (0, 7):
        ff = 1 if f == 0 else 6
        return {chess.square(ff, 6 if c else 1), chess.square(ff, 7 if c else 0)}
    out = set()
    rows = [r + 2] if r <= 3 else [r + 1, r + 2]
    for rr in rows:
        rr = min(rr, 7)
        for df in (-1, 0, 1):
            ff = f + df
            if 0 <= ff <= 7: out.add(chess.square(ff, rr if c else 7 - rr))
    return out
def mob(b, s):
    p = b.piece_at(s)
    if not p: return 0
    return sum(1 for t in b.attacks(s) if not (b.piece_at(t) and b.piece_at(t).color == p.color))
def total_mob(b, c): return sum(mob(b, s) for s, p in b.piece_map().items() if p.color == c and p.piece_type not in (P_, K_))
def wing_files(b): return sorted({fil(s) for s in b.pieces(P_, True) | b.pieces(P_, False)})

def eg_type(b, me):
    a, o = pieces(b, me), pieces(b, not me)
    ta, to = sum(a.values()), sum(o.values())
    pw = len(b.pieces(P_, True)) + len(b.pieces(P_, False))
    only = lambda d, **w: d[N_] == w.get('n', 0) and d[B_] == w.get('b', 0) and d[R_] == w.get('r', 0) and d[Q_] == w.get('q', 0)
    if ta == 0 and to == 0: return 'kp' if pw else None
    if only(a, r=1) and only(o, r=1): return 'rook'
    if only(a, r=2) and only(o, r=2): return 'rooks2'
    if only(a, q=1) and only(o, q=1): return 'queen'
    if (only(a, n=1) and only(o, b=1)) or (only(a, b=1) and only(o, n=1)): return 'nb'
    if only(a, b=1) and only(o, b=1):
        return 'bb-same' if sqcol(next(iter(b.pieces(B_, True)))) == sqcol(next(iter(b.pieces(B_, False)))) else 'bb-opp'
    if only(a, n=1) and only(o, n=1): return 'nn'
    if (only(a, r=1) and (only(o, n=1) or only(o, b=1))) or (only(o, r=1) and (only(a, n=1) or only(a, b=1))): return 'r-minor'
    if a[R_] == 1 and o[R_] == 1 and ta == 2 and to == 2 and not a[Q_] and not o[Q_]: return 'rm'
    if (ta <= 1 and to == 0) or (to <= 1 and ta == 0): return 'minor-pawns' if (a[N_] + a[B_] + o[N_] + o[B_]) else 'mates'
    if not a[Q_] and not o[Q_] and ta + to <= 4: return 'eg-other'
    return None

def is_endgame(b):
    """queens off with at most 3 pieces each, or one queen each and nothing else"""
    q = len(b.pieces(Q_, True)) + len(b.pieces(Q_, False))
    return eg_type(b, True) is not None or (q == 0 and npieces(b, True) <= 3 and npieces(b, False) <= 3)

def sac_kind(b, m):
    p = b.piece_at(m.from_square); me = p.color
    cap = b.piece_at(m.to_square); cv = V[cap.piece_type] if cap else (1 if b.is_en_passant(m) else 0)
    pv = V[p.piece_type]
    a = b.copy(); a.push(m)
    if a.is_checkmate(): return None
    att = [V[a.piece_at(s).piece_type] for s in a.attackers(not me, m.to_square)]
    if not att: return None
    defended = bool(a.attackers(me, m.to_square))
    if not (min(att) < pv or not defended): return None
    if pv - cv < 2 and not (p.piece_type == P_ and cv == 0 and not defended): return None
    ek = b.king(not me); tf = sqn(m.to_square)
    if p.piece_type == B_ and cap and cap.piece_type == P_ and tf in ('h7', 'h2') and a.is_check(): return 'greek-gift'
    if p.piece_type in (B_, N_) and tf in ('f7', 'f2') and cap and cap.piece_type == P_: return 'f7'
    if p.piece_type == N_: return 'knight'
    if p.piece_type == R_ and cap and cap.piece_type in (N_, B_): return 'exchange'
    if p.piece_type == R_ and ek is not None and chess.square_distance(ek, m.to_square) <= 2: return 'rook-king'
    if p.piece_type == Q_: return 'queen'
    if p.piece_type == P_: return 'pawn'
    if p.piece_type == B_ and ek is not None and chess.square_distance(ek, m.to_square) <= 2: return 'bishop-king'
    return 'piece'

class Ctx:
    """one candidate: the position with the solver to move, the move to find, the line after it"""
    def __init__(s, fen, best=None, line=None, prev=None, prev_fen=None, meta=None):
        s.ok = True
        try:
            s.b = chess.Board(fen)
        except Exception:
            s.ok = False; return
        s.me = s.b.turn; s.meta = meta or {}
        s.m = None; s.a = None; s.end = s.b; s.steps = []
        if best:
            try:
                m = chess.Move.from_uci(best)
                if m in s.b.legal_moves: s.m = m
            except Exception: pass
            if s.m is None: s.ok = False; return
            b = s.b.copy()
            for u in (line or [best]):
                try: mv = chess.Move.from_uci(u)
                except Exception: break
                if mv not in b.legal_moves: break
                s.steps.append((b.copy(), mv)); b.push(mv)
            if not s.steps or s.steps[0][1] != s.m:
                b = s.b.copy(); b.push(s.m); s.steps = [(s.b.copy(), s.m)]
            s.end = b
            s.a = s.b.copy(); s.a.push(s.m)
        s.prev = None
        if prev and prev_fen:
            try:
                pb = chess.Board(prev_fen); pm = chess.Move.from_uci(prev)
                if pm in pb.legal_moves: s.prev = pm; s.pb = pb
            except Exception: pass
        s.typ = eg_type(s.b, s.me); s.mat = material(s.b, s.me)
        s.eg = s.meta.get('phase') == 'endgame' if s.meta.get('phase') else is_endgame(s.b)
        s.mg = s.meta.get('phase') == 'middlegame' if s.meta.get('phase') else (not s.eg and s.b.fullmove_number >= 8)
    # the move
    def piece(s): return s.b.piece_at(s.m.from_square)
    def pt(s): return s.piece().piece_type
    def cap(s): return s.b.is_capture(s.m)
    def chk(s): return s.b.gives_check(s.m)
    def quiet(s): return not s.cap() and not s.chk() and not s.m.promotion
    def san(s): return s.b.san(s.m)
    def own_moves(s): return [mv for i, (bb, mv) in enumerate(s.steps) if i % 2 == 0]
    def recaptured(s):
        return len(s.steps) >= 2 and s.steps[1][0].is_capture(s.steps[1][1]) and s.steps[1][1].to_square == s.m.to_square

# ---------------------------------------------------------------- endgame detectors (each returns the true sentence, or None)
def d_stalemate_avoid(c):
    if not c.m or not c.eg: return None
    for mv in c.b.legal_moves:
        if mv == c.m: continue
        b = c.b.copy(); b.push(mv)
        if b.is_stalemate(): return 'Careful: ' + c.b.san(mv) + ' would be stalemate. ' + c.san() + ' keeps a legal move for their king and keeps the win.'
    return None
def d_stalemate_save(c):
    if not c.m or not c.eg or c.mat > -2: return None
    if c.end.is_stalemate(): return 'You are ' + str(-c.mat) + ' points down, and ' + c.san() + ' heads for stalemate: no legal move, no check, a draw.'
    return None
def d_dead(c):
    if not c.m or not c.eg or c.mat > -1: return None
    if c.end.is_insufficient_material() and not c.b.is_insufficient_material():
        return c.san() + ' removes the last material that could mate: what is left is a dead position, a draw.'
    return None
def d_perpetual(c):
    if not c.m or not c.chk() or c.mat > -2: return None
    own = c.own_moves()
    if len(own) < 3: return None
    if all(bb.gives_check(mv) for i, (bb, mv) in enumerate(c.steps) if i % 2 == 0):
        return 'You are ' + str(-c.mat) + ' points down, but ' + c.san() + ' starts checks their king cannot escape: a draw by perpetual check / repetition.'
    return None
def d_promote(c):
    if not c.m or not c.eg: return None
    for i, (bb, mv) in enumerate(c.steps[:5]):
        if i % 2 == 0 and mv.promotion:
            return ('The pawn promotes: ' + bb.san(mv) + '.') if i else (c.san() + ': the pawn promotes.')
    return None
def d_under(c):
    for i, (bb, mv) in enumerate(c.steps[:5]):
        if i % 2 == 0 and mv.promotion and mv.promotion != Q_:
            return 'Underpromotion: ' + bb.san(mv) + ' (a ' + NAME[mv.promotion] + ', not a queen' + (', because a queen would be stalemate' if (lambda x: (x.push(chess.Move(mv.from_square, mv.to_square, Q_)), x.is_stalemate())[1])(bb.copy()) else '') + ').'
    return None
def d_mate(c):
    if not c.m or not c.eg: return None
    if c.end.is_checkmate() and c.end.turn != c.me and len(c.own_moves()) >= 2:
        return 'A Mate Wincondition in the endgame: the line ends in checkmate (' + c.steps[-1][0].san(c.steps[-1][1]) + ').'
    return None
def d_mate_rook(c):
    return d_mate(c) if c.typ in ('rook', 'rooks2', 'rm') else None
def d_king_active(c):
    if not c.m or c.pt() != K_ or c.b.is_check() or c.typ in (None, 'kp') or not c.eg: return None
    if c.b.pieces(Q_, True) or c.b.pieces(Q_, False): return None
    if centre_dist(c.m.to_square) < centre_dist(c.m.from_square) and not c.cap():
        return c.san() + ': the king walks to the centre and becomes a fighting piece.'
    return None
def d_kp_king(c):
    if not c.m or c.pt() != K_ or c.typ != 'kp' or c.b.is_check() or c.cap(): return None
    return c.san() + ': in the pawn ending the more active king decides.'
def d_trade_ahead(c):
    if not c.m or not c.eg or c.mat < 2 or not c.cap(): return None
    cp = c.b.piece_at(c.m.to_square)
    if cp and cp.piece_type in (N_, B_, R_, Q_) and c.recaptured():
        return 'You are ' + str(c.mat) + ' points up: ' + c.san() + ' trades pieces, not pawns.'
    return None
def d_square(c):
    if not c.m or c.typ != 'kp': return None
    if c.pt() == P_ and passed(c.b, c.m.from_square, c.me):
        ek = c.b.king(not c.me)
        if not in_square(ek, c.m.to_square, c.me, True) and in_square(ek, c.m.from_square, c.me, False) is False:
            return c.san() + ': their king on ' + sqn(ek) + ' is outside the square of the pawn, so it runs through.'
    if c.pt() == K_:
        for s in passers(c.b, not c.me):
            if in_square(c.m.to_square, s, not c.me, False):
                others = [mv for mv in c.b.legal_moves if mv.from_square == c.m.from_square and mv != c.m and not in_square(mv.to_square, s, not c.me, False)]
                if others: return c.san() + ': the king steps into the square of the ' + sqn(s) + '-pawn and catches it.'
    return None
def d_king_front(c):
    if not c.m or c.pt() != K_ or c.typ != 'kp' or c.cap(): return None
    for s in passers(c.b, c.me):
        if abs(fil(c.m.to_square) - fil(s)) <= 1 and rel(c.m.to_square, c.me) > rel(s, c.me):
            return c.san() + ': king in front, pawn behind: the king leads the ' + sqn(s) + '-pawn.'
    return None
def d_rookpawn_corner(c):
    if not c.m or c.typ != 'kp' or c.pt() != K_: return None
    th = pawns(c.b, not c.me)
    if not th or any(fil(s) not in (0, 7) for s in th) or pawns(c.b, c.me): return None
    corner = prom(th[0], not c.me)
    if chess.square_distance(c.m.to_square, corner) < chess.square_distance(c.m.from_square, corner):
        return c.san() + ': with a rook pawn the corner in front of it (' + sqn(corner) + ') is a draw for the defender.'
    return None
def opposition_of(b, me):
    k, e = b.king(me), b.king(not me)
    df, dr = abs(fil(k) - fil(e)), abs(chess.square_rank(k) - chess.square_rank(e))
    if (df == 0 and dr in (2, 4, 6)) or (dr == 0 and df in (2, 4, 6)): return max(df, dr)
    if df == dr == 2: return 2
    return 0
def d_opposition(c):
    if not c.m or c.typ != 'kp' or c.pt() != K_ or c.cap(): return None
    if opposition_of(c.a, c.me) == 2 and opposition_of(c.b, c.me) != 2:
        return c.san() + ': the kings face each other with one square between, and they are to move: you have the opposition.'
    return None
def d_distant_opp(c):
    if not c.m or c.typ != 'kp' or c.pt() != K_ or c.cap(): return None
    d = opposition_of(c.a, c.me)
    if d in (4, 6): return c.san() + ': distant opposition, ' + str(d - 1) + ' squares between the kings and they are to move.'
    return None
def d_keysq(c):
    if not c.m or c.typ != 'kp' or c.pt() != K_: return None
    for s in pawns(c.b, c.me):
        ks = key_squares(s, c.me)
        if c.m.to_square in ks and c.m.from_square not in ks:
            return c.san() + ': the king reaches a key square of the ' + sqn(s) + '-pawn (' + ', '.join(sorted(sqn(x) for x in ks)) + '): from there the pawn queens whoever moves.'
    return None
def d_defend_front(c):
    if not c.m or c.typ != 'kp' or c.pt() != K_ or c.cap(): return None
    th = passers(c.b, not c.me)
    if not th or passers(c.b, c.me): return None
    for s in th:
        if fil(c.m.to_square) == fil(s) and rel(c.m.to_square, not c.me) > rel(s, not c.me):
            return c.san() + ': the defending king stays in front of the ' + sqn(s) + '-pawn.'
    return None
def d_tempo(c):
    if not c.m or c.typ != 'kp' or c.pt() != P_ or c.cap(): return None
    if passed(c.b, c.m.from_square, c.me): return None
    if chess.square_distance(c.b.king(True), c.b.king(False)) <= 3:
        return c.san() + ': a spare pawn move. It hands the move to them, and in this king position that is zugzwang.'
    return None
def outside_passer(b, me):
    other = [fil(s) for s in pawns(b, True) + pawns(b, False)]
    for s in passers(b, me):
        rest = [f for f in other if f != fil(s) or False]
        rest = [fil(x) for x in pawns(b, True) + pawns(b, False) if x != s]
        if rest and min(abs(f - fil(s)) for f in rest) >= 3: return s
    return None
def d_outside(c):
    if not c.m or c.typ != 'kp': return None
    s = outside_passer(c.b, c.me)
    if s is None: return None
    return 'Your ' + sqn(s) + '-pawn is an outside passed pawn: it pulls their king away while yours goes to the other side. ' + c.san() + '.'
def d_nn_outside(c):
    if not c.m or c.typ != 'nn': return None
    s = outside_passer(c.b, c.me)
    return ('A knight ending plays like a pawn ending: your outside passed pawn on ' + sqn(s) + ' decides. ' + c.san() + '.') if s is not None else None
def d_protected(c):
    if not c.m or c.typ != 'kp': return None
    for s in passers(c.a, c.me):
        if any(c.a.piece_at(x) == chess.Piece(P_, c.me) for x in c.a.attackers(c.me, s)):
            return 'Your protected passed pawn on ' + sqn(s) + ' cannot be taken by the king alone: it ties their king down. ' + c.san() + '.'
    return None
def d_separated(c):
    if not c.m or not c.eg or npieces(c.b, not c.me) > 1: return None
    ps = passers(c.b, c.me)
    if len(ps) >= 2 and max(fil(x) for x in ps) - min(fil(x) for x in ps) >= 3 and c.pt() == P_:
        return 'Two passed pawns far apart (' + ', '.join(sqn(x) for x in ps) + '): one lone defender cannot stop both. ' + c.san() + '.'
    return None
def d_race(c):
    if not c.m or c.typ != 'kp' or c.pt() != P_: return None
    if passers(c.b, c.me) and passers(c.b, not c.me) and passed(c.b, c.m.from_square, c.me):
        return 'A race of passed pawns: count the moves to queen for both sides. ' + c.san() + '.'
    return None
def d_race_queens(c):
    if not c.m or c.typ != 'kp': return None
    pr = [mv.promotion and bb.turn for bb, mv in c.steps if mv.promotion]
    cols = {bb.turn for bb, mv in c.steps if mv.promotion}
    if len(cols) == 2: return 'Both sides queen, and the race is only half the calculation: what happens after the queens arrive decides.'
    return None
def d_minor_stop(c):
    if not c.m or c.pt() not in (N_, B_) or not c.eg: return None
    for s in passers(c.b, not c.me):
        path = [x for x in (ahead(s, not c.me, i) for i in range(1, 8 - rel(s, not c.me))) if x is not None]
        if c.m.to_square in path[:1]: return c.san() + ': the ' + NAME[c.pt()] + ' blockades the ' + sqn(s) + '-pawn right in front of it.'
        if c.pt() == B_ and any(x in c.a.attacks(c.m.to_square) for x in path) and not any(x in c.b.attacks(c.m.from_square) for x in path):
            return c.san() + ': the bishop stops the ' + sqn(s) + '-pawn from far away, on its path.'
    return None
def is_rook_eg(c): return c.typ in ('rook', 'rooks2', 'rm')
def d_rook_behind(c):
    if not c.m or c.pt() != R_ or not is_rook_eg(c) or c.cap(): return None
    t = c.m.to_square
    for s in passers(c.b, c.me):
        if fil(s) == fil(t) and rel(t, c.me) < rel(s, c.me) and fil(c.m.from_square) != fil(s):
            return c.san() + ': the rook goes behind your passed pawn on ' + sqn(s) + ' (Tarrasch\'s rule): every push makes the rook stronger.'
    for s in passers(c.b, not c.me):
        if fil(s) == fil(t) and rel(t, not c.me) < rel(s, not c.me) and fil(c.m.from_square) != fil(s):
            return c.san() + ': the rook goes behind their passed pawn on ' + sqn(s) + ': it attacks it while their rook is stuck in front.'
    return None
def d_rook_active(c):
    if not c.m or c.pt() != R_ or not is_rook_eg(c) or c.cap(): return None
    before, after = mob(c.b, c.m.from_square), mob(c.a, c.m.to_square)
    if after >= before + 4: return c.san() + ': activity first. The rook goes from ' + str(before) + ' to ' + str(after) + ' squares.'
    return None
def d_rook_active_down(c):
    return d_rook_active(c) if c.mat <= -1 else None
def d_cutoff(c):
    if not c.m or c.pt() != R_ or not is_rook_eg(c) or c.cap() or c.chk(): return None
    ek = c.b.king(not c.me)
    for s in passers(c.b, c.me):
        tf, kf, pf = fil(c.m.to_square), fil(ek), fil(s)
        if min(kf, pf) < tf < max(kf, pf) and fil(c.m.from_square) != tf:
            return c.san() + ': the rook builds a wall on the ' + 'abcdefgh'[tf] + '-file: their king is cut off from your ' + sqn(s) + '-pawn.'
        tr, kr, pr = chess.square_rank(c.m.to_square), chess.square_rank(ek), chess.square_rank(s)
        if min(kr, pr) < tr < max(kr, pr) and chess.square_rank(c.m.from_square) != tr and abs(kf - pf) <= 1:
            return c.san() + ': the rook cuts their king off along the ' + str(tr + 1) + 'th rank.'
    return None
def rp_vs_r(b, att):
    """R+P vs R with `att` the side with the pawn"""
    return pieces(b, att) == {N_: 0, B_: 0, R_: 1, Q_: 0} and pieces(b, not att) == {N_: 0, B_: 0, R_: 1, Q_: 0} and len(pawns(b, att)) == 1 and not pawns(b, not att)
def lucena_shape(b, att):
    if not rp_vs_r(b, att): return False
    s = pawns(b, att)[0]
    if fil(s) in (0, 7) or rel(s, att) != 6: return False
    k, e = b.king(att), b.king(not att)
    return rel(k, att) == 7 and abs(fil(k) - fil(s)) <= 1 and abs(fil(e) - fil(s)) >= 2
def philidor_shape(b, de):
    att = not de
    if not rp_vs_r(b, att): return False
    s = pawns(b, att)[0]; k = b.king(de); r = next(iter(b.pieces(R_, de)))
    return rel(s, att) <= 4 and abs(fil(k) - fil(s)) <= 1 and rel(k, att) >= 6 and rel(r, de) == 2
def d_lucena_find(c):
    if not c.m or not lucena_shape(c.b, c.me): return None
    return 'Lucena: pawn on the 7th, your king in front of it, their king cut off. ' + c.san() + ' starts the bridge.'
def d_philidor_find(c):
    if not c.m or c.pt() != R_: return None
    if philidor_shape(c.a, c.me) and not philidor_shape(c.b, c.me): return c.san() + ': Philidor\'s third-rank defence. The rook keeps their king off the 6th rank.'
    return None
def d_transform(c):
    if not c.m or not c.cap() or c.typ in (None, 'kp'): return None
    for i in range(1, min(4, len(c.steps)) + 1):
        bb = c.steps[i][0] if i < len(c.steps) else c.end
        if kp_only(bb): return c.san() + ' trades into a pawn ending, and the pawn ending is won: count it to the end before you trade.'
    return None
def d_avoid_kp(c):
    """needs the engine: a capture into the pawn ending exists, it is worse, and the best move keeps the pieces"""
    if not c.m or c.typ in (None, 'kp') or c.cap(): return None
    for mv in c.b.legal_moves:
        if not c.b.is_capture(mv): continue
        b = c.b.copy(); b.push(mv)
        for r in b.legal_moves:
            if r.to_square == mv.to_square and b.is_capture(r):
                b2 = b.copy(); b2.push(r)
                if kp_only(b2): c.meta['kp_trade'] = mv.uci(); return 'The pawn-ending test: ' + c.b.san(mv) + ' trades into a pawn ending that is NOT won. ' + c.san() + ' keeps the pieces.'
    return None
def d_convert(c):
    if not c.m or not c.eg or c.mat < 1: return None
    return 'You are ' + str(c.mat) + ' up: secure, improve, create the passed pawn, execute. ' + c.san() + '.'
def d_triangulation(c):
    if not c.m or c.typ != 'kp' or c.pt() != K_ or len(c.steps) < 5: return None
    if all(bb.piece_at(mv.from_square).piece_type == K_ for i, (bb, mv) in enumerate(c.steps[:5]) if i % 2 == 0):
        b5 = c.steps[5][0] if len(c.steps) > 5 else c.end
        if b5.board_fen() == c.b.board_fen() and b5.turn != c.b.turn:
            return 'Triangulation: three king moves later the same position comes back with THEM to move. ' + c.san() + ' starts the triangle.'
    return None
def d_reti(c):
    if not c.m or c.typ != 'kp' or c.pt() != K_: return None
    df, dr = abs(fil(c.m.to_square) - fil(c.m.from_square)), abs(chess.square_rank(c.m.to_square) - chess.square_rank(c.m.from_square))
    if df != 1 or dr != 1 or not passers(c.b, c.me): return None
    for s in passers(c.b, not c.me):
        if not in_square(c.b.king(c.me), s, not c.me, True):
            return c.san() + ': a diagonal king walk with two goals, towards your own pawn and towards the square of their ' + sqn(s) + '-pawn (the Réti idea).'
    return None
def d_breakthrough(c):
    if not c.m or c.typ != 'kp' or c.pt() != P_ or c.cap(): return None
    if any(c.a.piece_at(x) == chess.Piece(P_, not c.me) for x in c.a.attackers(not c.me, c.m.to_square)):
        return c.san() + ': a breakthrough. The pawn is given so that another one becomes a passed pawn.'
    return None
def d_candidate(c):
    if not c.m or not c.eg or c.pt() != P_ or c.cap() or passed(c.b, c.m.from_square, c.me): return None
    f = fil(c.m.from_square)
    if not any(fil(x) == f and rel(x, c.me) > rel(c.m.from_square, c.me) for x in pawns(c.b, not c.me)):
        return c.san() + ': the candidate first: the pawn with no enemy pawn in front of it goes ahead, the others support it.'
    return None
def d_rook7(c):
    if not c.m or c.pt() != R_ or not is_rook_eg(c): return None
    if rel(c.m.to_square, c.me) == 6 and rel(c.m.from_square, c.me) != 6: return c.san() + ': the rook on the 7th rank hits the pawns from the side and cages their king.'
    return None
def d_flank(c):
    if not c.m or c.pt() != R_ or not is_rook_eg(c) or not c.chk() or c.mat > 0: return None
    ek = c.b.king(not c.me)
    if chess.square_rank(c.m.to_square) != chess.square_rank(ek): return None
    for s in passers(c.b, not c.me):
        if abs(fil(c.m.to_square) - fil(s)) >= 4:
            return c.san() + ': a check from the side, with ' + str(abs(fil(c.m.to_square) - fil(s)) - 1) + ' files between the rook and the pawn: enough checking distance.'
    return None
def d_blockade(c):
    if not c.m or not c.eg: return None
    for s in passers(c.b, not c.me):
        if ahead(s, not c.me) == c.m.to_square:
            return c.san() + ': blockade. The ' + NAME[c.pt()] + ' stops the ' + sqn(s) + '-pawn on the square right in front of it.'
    return None
def d_blockade_nk(c):
    return d_blockade(c) if c.m and c.pt() in (N_, K_) else None
def d_quiet(c):
    if not c.m or not c.eg or not c.quiet() or c.pt() == P_: return None
    return c.san() + ': do not hurry. No check, no capture, no push: the piece improves first.'
def d_worst(c):
    if not c.m or c.pt() in (P_, K_) or not c.quiet(): return None
    mine = [(mob(c.b, s), s) for s, p in c.b.piece_map().items() if p.color == c.me and p.piece_type not in (P_, K_)]
    if len(mine) < 2: return None
    if min(mine)[1] == c.m.from_square and mob(c.a, c.m.to_square) >= mob(c.b, c.m.from_square) + 3:
        return c.san() + ': improve the worst piece. The ' + NAME[c.pt()] + ' had ' + str(mob(c.b, c.m.from_square)) + ' squares, now ' + str(mob(c.a, c.m.to_square)) + '.'
    return None
def d_restrict(c):
    if not c.m or not c.quiet(): return None
    b2 = c.a.copy()
    drop = total_mob(c.b, not c.me) - total_mob(c.a, not c.me)
    if drop >= 5: return c.san() + ': restrict before you attack. Their pieces lose ' + str(drop) + ' squares.'
    return None
def d_domination(c):
    if not c.m: return None
    for s, p in c.a.piece_map().items():
        if p.color == c.me or p.piece_type not in (N_, B_): continue
        def safe(bd):
            n = 0
            for t in bd.attacks(s):
                q = bd.piece_at(t)
                if q and q.color == p.color: continue
                if not bd.attackers(c.me, t): n += 1
            return n
        if safe(c.a) == 0 and c.b.piece_at(s) == p and safe(c.b) >= 1:
            return c.san() + ': domination. Their ' + NAME[p.piece_type] + ' on ' + sqn(s) + ' has no safe square left.'
    return None
def d_defender_pawns(c):
    if not c.m or not c.eg or c.mat > -1 or c.pt() != P_ or not c.cap(): return None
    t = c.b.piece_at(c.m.to_square)
    if t and t.piece_type == P_: return 'The defender trades pawns: ' + c.san() + ' deletes one of their possible passed pawns.'
    return None
def d_eg_sac(c):
    if not c.m or not c.eg: return None
    k = sac_kind(c.b, c.m)
    if k and k != 'pawn': return c.san() + ': you give material back to win: the ' + NAME[c.pt()] + ' is the price for a faster Wincondition.'
    return None
def d_eg_pawnsac(c):
    if not c.m or not c.eg or c.pt() != P_: return None
    if sac_kind(c.b, c.m) == 'pawn' and not passed(c.b, c.m.from_square, c.me): return c.san() + ': a pawn sacrifice that creates a second Wincondition.'
    return None
def d_decoy(c):
    if not c.m or not c.eg or c.pt() != P_ or not passed(c.b, c.m.from_square, c.me): return None
    if sac_kind(c.b, c.m) == 'pawn' or (c.a.attackers(not c.me, c.m.to_square) and not c.a.attackers(c.me, c.m.to_square)):
        return c.san() + ': the passed pawn is spent as a decoy: while they take it, the real win comes elsewhere.'
    return None
def d_lever(c):
    if not c.m or not c.eg or c.pt() != P_ or c.cap(): return None
    if any(c.a.piece_at(x) and c.a.piece_at(x).piece_type == P_ and c.a.piece_at(x).color != c.me for x in c.a.attacks(c.m.to_square)):
        return c.san() + ': a pawn lever that opens an entry square for your king or pieces.'
    return None
def d_counter(c):
    if not c.m or not c.eg or c.mat > -1 or c.pt() != P_ or not passed(c.b, c.m.from_square, c.me): return None
    return 'You are behind, so you race: ' + c.san() + ' pushes your own passed pawn and they must stop to deal with it.'
def d_q_passer(c):
    if not c.m or c.typ != 'queen': return None
    for s in passers(c.b, c.me):
        if rel(s, c.me) >= 4 and c.mat <= 1 and c.pt() == P_ and c.m.from_square == s:
            return 'In queen endings the passed pawn outranks material: ' + c.san() + '.'
    return None
def d_qperpetual(c): return d_perpetual(c) if c.typ == 'queen' else None
def d_outside_vs_prot(c):
    if c.typ != 'kp': return None
    o = outside_passer(c.b, c.me); pr = [s for s in passers(c.b, not c.me) if any(c.b.piece_at(x) == chess.Piece(P_, not c.me) for x in c.b.attackers(not c.me, s))]
    if o is not None and pr: return 'Your outside passed pawn on ' + sqn(o) + ' against their protected passed pawn on ' + sqn(pr[0]) + ': calculate which one ties the other king down longer.'
    return None

# ---------------------------------------------------------------- endgame position tests (for "play it out" examples)
def mat_is(b, me, mine, theirs, mine_p=None, theirs_p=None):
    def match(c, want, pw):
        d = pieces(b, c)
        if any(d[p] != want.get(p, 0) for p in (N_, B_, R_, Q_)): return False
        if pw is not None and not pw(len(pawns(b, c))): return False
        return True
    return match(me, mine, mine_p) and match(not me, theirs, theirs_p)
def p_kqk(b, me): return mat_is(b, me, {Q_: 1}, {}, lambda n: n == 0, lambda n: n == 0)
def p_krk(b, me): return mat_is(b, me, {R_: 1}, {}, lambda n: n == 0, lambda n: n == 0)
def p_kbnk(b, me): return mat_is(b, me, {B_: 1, N_: 1}, {}, lambda n: n == 0, lambda n: n == 0)
def p_2b(b, me): return mat_is(b, me, {B_: 2}, {}, lambda n: n == 0, lambda n: n == 0)
def p_keysq(b, me):
    if not mat_is(b, me, {}, {}, lambda n: n == 1, lambda n: n == 0): return False
    s = pawns(b, me)[0]; return b.king(me) in key_squares(s, me)
def p_rookpawn_draw(b, me):  # me = defender
    th = pawns(b, not me)
    return kp_only(b) and th and not pawns(b, me) and all(fil(s) in (0, 7) for s in th) and len({fil(s) for s in th}) == 1 and \
        chess.square_distance(b.king(me), prom(th[0], not me)) <= 1
def p_wrongb(b, me):  # me = defender
    att = not me
    if not mat_is(b, me, {}, {B_: 1}, lambda n: n == 0, lambda n: n >= 1): return False
    th = pawns(b, att)
    if not all(fil(s) in (0, 7) for s in th) or len({fil(s) for s in th}) != 1: return False
    bs = next(iter(b.pieces(B_, att)))
    return sqcol(bs) != sqcol(prom(th[0], att)) and chess.square_distance(b.king(me), prom(th[0], att)) <= 2
def p_qvp7(b, me):
    for att in (me, not me):
        if mat_is(b, att, {Q_: 1}, {}, lambda n: n == 0, lambda n: n == 1) and rel(pawns(b, not att)[0], not att) == 6: return True
    return False
def p_lucena(b, me): return lucena_shape(b, me)
def p_philidor(b, me): return philidor_shape(b, me)
def p_connected6(b, me):
    for side in (me, not me):
        ps = passers(b, side)
        if pieces(b, side) == {N_: 0, B_: 0, R_: 0, Q_: 0} and pieces(b, not side)[R_] == 1 and npieces(b, not side) == 1 and \
                any(abs(fil(x) - fil(y)) == 1 and rel(x, side) >= 5 and rel(y, side) >= 4 for x in ps for y in ps if x != y): return True
    return False
def p_backrank(b, me):  # me = attacker
    if not rp_vs_r(b, me): return False
    s = pawns(b, me)[0]; r = next(iter(b.pieces(R_, not me))); k = b.king(not me)
    return fil(s) in (2, 3, 4, 5) and rel(r, not me) == 0 and abs(fil(k) - fil(s)) <= 1 and rel(k, me) >= 6
def p_samewing(b, me):
    if eg_type(b, me) != 'rook': return False
    fs = wing_files(b)
    return fs and (max(fs) <= 3 or min(fs) >= 4) and abs(material(b, me)) == 1
def p_rook_down(b, me): return eg_type(b, me) == 'rook' and material(b, me) == -1
def bad_bishop(b, c):
    bs = list(b.pieces(B_, c))
    if len(bs) != 1: return False
    col = sqcol(bs[0])
    fixed = [s for s in pawns(b, c) if sqcol(s) == col and ahead(s, c) is not None and b.piece_at(ahead(s, c)) and b.piece_at(ahead(s, c)).piece_type == P_]
    return len(fixed) >= 3
def p_badbishop(b, me): return eg_type(b, me) in ('bb-same', 'nb') and bad_bishop(b, not me) and not bad_bishop(b, me)
def p_bvn_wings(b, me):
    if eg_type(b, me) != 'nb' or pieces(b, me)[B_] != 1: return False
    fs = wing_files(b); return fs and min(fs) <= 2 and max(fs) >= 5
def p_nvb_onewing(b, me):
    if eg_type(b, me) != 'nb' or pieces(b, me)[N_] != 1: return False
    fs = wing_files(b); return fs and (max(fs) <= 3 or min(fs) >= 4)
def p_nvbadb(b, me): return eg_type(b, me) == 'nb' and pieces(b, me)[N_] == 1 and bad_bishop(b, not me)
def p_ocb_draw(b, me): return eg_type(b, me) == 'bb-opp' and material(b, me) in (-1, -2)
def p_ocb_heavy(b, me):
    a, o = pieces(b, me), pieces(b, not me)
    if a[B_] != 1 or o[B_] != 1 or a[N_] or o[N_] or (a[R_] + a[Q_]) == 0 or (a[R_], a[Q_]) != (o[R_], o[Q_]): return False
    return sqcol(next(iter(b.pieces(B_, me)))) != sqcol(next(iter(b.pieces(B_, not me))))
def p_ocb_win(b, me):
    if eg_type(b, me) != 'bb-opp' or material(b, me) < 2: return False
    ps = passers(b, me); return len(ps) >= 2 and max(fil(x) for x in ps) - min(fil(x) for x in ps) >= 3
def p_rvminor0(b, me):
    return (mat_is(b, me, {B_: 1}, {R_: 1}, lambda n: n == 0, lambda n: n == 0) or mat_is(b, me, {N_: 1}, {R_: 1}, lambda n: n == 0, lambda n: n == 0))
def p_vancura(b, me):  # me = defender
    att = not me
    if not rp_vs_r(b, att): return False
    s = pawns(b, att)[0]
    if fil(s) not in (0, 7) or rel(s, att) != 5: return False
    ra = next(iter(b.pieces(R_, att))); rd = next(iter(b.pieces(R_, me)))
    return fil(ra) == fil(s) and rel(ra, att) > rel(s, att) and chess.square_rank(rd) == chess.square_rank(s)
def p_g7h7(b, me):
    for att in (me, not me):
        if not rp_vs_r(b, att): continue
        s = pawns(b, att)[0]
        if fil(s) not in (0, 7) or rel(s, att) != 6: continue
        ra = next(iter(b.pieces(R_, att))); rd = next(iter(b.pieces(R_, not att)))
        if fil(ra) == fil(s) and rel(ra, att) == 7 and fil(rd) == fil(s) and rel(rd, att) < rel(s, att): return True
    return False
def p_rule5(b, me):
    for att in (me, not me):
        if not rp_vs_r(b, att): continue
        s = pawns(b, att)[0]; e = b.king(not att); ra = next(iter(b.pieces(R_, att)))
        if min(fil(e), fil(s)) < fil(ra) < max(fil(e), fil(s)) and fil(s) not in (0, 7): return True
    return False
def p_r2p(b, me): return mat_is(b, me, {R_: 1}, {R_: 1}, lambda n: n == 2, lambda n: n == 0)
def p_qr(b, me): return mat_is(b, me, {Q_: 1}, {R_: 1}, lambda n: n == 0, lambda n: n == 0)
def p_qrp(b, me): return mat_is(b, me, {Q_: 1}, {R_: 1}, lambda n: n == 0, lambda n: n == 1) or mat_is(b, me, {R_: 1}, {Q_: 1}, lambda n: n == 1, lambda n: n == 0)
def p_2nvp(b, me): return mat_is(b, me, {N_: 2}, {}, lambda n: n == 0, lambda n: n == 1)
def p_2bvn(b, me): return mat_is(b, me, {B_: 2}, {N_: 1}, lambda n: n == 0, lambda n: n == 0)
def p_nvrp7(b, me):
    for side in (me, not me):
        if mat_is(b, side, {N_: 1}, {}, lambda n: n == 0, lambda n: n == 1):
            s = pawns(b, not side)[0]
            if fil(s) in (0, 7) and rel(s, not side) == 6: return True
    return False
def p_rbvr(b, me): return mat_is(b, me, {R_: 1, B_: 1}, {R_: 1}, lambda n: n == 0, lambda n: n == 0) or mat_is(b, me, {R_: 1}, {R_: 1, B_: 1}, lambda n: n == 0, lambda n: n == 0)
def p_rnvr(b, me): return mat_is(b, me, {R_: 1, N_: 1}, {R_: 1}, lambda n: n == 0, lambda n: n == 0) or mat_is(b, me, {R_: 1}, {R_: 1, N_: 1}, lambda n: n == 0, lambda n: n == 0)
def p_qv2m(b, me):
    return any(mat_is(b, x, {Q_: 1}, mm, lambda n: n == 0, lambda n: n == 0) for x in (me, not me) for mm in ({B_: 2}, {N_: 2}))
def p_bpvb(b, me): return eg_type(b, me) == 'bb-same' and sorted([len(pawns(b, me)), len(pawns(b, not me))]) == [0, 1]
def p_npvn(b, me): return eg_type(b, me) == 'nn' and sorted([len(pawns(b, me)), len(pawns(b, not me))]) == [0, 1]
def p_q2r(b, me): return any(mat_is(b, x, {Q_: 1}, {R_: 2}) for x in (me, not me))
def p_exchange_up(b, me): return eg_type(b, me) == 'r-minor' and pieces(b, me)[R_] == 1 and pawns(b, me) and pawns(b, not me)
def p_mat_draw(b, me): return is_endgame(b) and material(b, me) <= -2 and npieces(b, not me) >= 1
def p_rook_down2(b, me): return eg_type(b, me) == 'rook' and material(b, me) == -2
def p_r_vs_passers(b, me):
    for side in (me, not me):
        if npieces(b, side) == 0 and pieces(b, not side)[R_] == 1 and npieces(b, not side) == 1:
            ps = passers(b, side)
            if any(abs(fil(x) - fil(y)) == 1 for x in ps for y in ps if x != y): return True
    return False

def make_find(name, test, text):
    def f(c):
        if not c.m or not c.eg: return None
        try: ok = test(c)
        except Exception: ok = False
        return text(c) if ok else None
    f.__name__ = name
    return f
d_ocb_hold = make_find('d_ocb_hold', lambda c: c.typ == 'bb-opp' and c.mat <= -1, lambda c: 'Opposite-coloured bishops, ' + str(-c.mat) + ' down: ' + c.san() + ' is the move that keeps the draw (Stockfish: the others lose).')
d_ocb_heavy = make_find('d_ocb_heavy', lambda c: p_ocb_heavy(c.b, c.me) and c.mat >= 0, lambda c: 'Opposite bishops with heavy pieces: their bishop cannot defend the other colour. ' + c.san() + '.')
d_ocb_win = make_find('d_ocb_win', lambda c: c.typ == 'bb-opp' and c.mat >= 1, lambda c: 'Opposite bishops, ' + str(c.mat) + ' up: ' + c.san() + ' keeps the win (the recipe: passed pawns far apart).')
d_rvminor_hold = make_find('d_rvminor_hold', lambda c: p_rvminor0(c.b, c.me), lambda c: 'Rook against your minor piece, no pawns: ' + c.san() + ' is the move that keeps the draw.')
d_exchange_up = make_find('d_exchange_up', lambda c: p_exchange_up(c.b, c.me), lambda c: 'Up the exchange with pawns on the board: ' + c.san() + ' is the move that keeps the win.')
d_minor_eg = make_find('d_minor_eg', lambda c: c.typ in ('nb', 'bb-same', 'nn'), lambda c: 'Minor-piece ending: ' + c.san() + ' is the only move that keeps the result.')
d_nvbadb = make_find('d_nvbadb', lambda c: p_nvbadb(c.b, c.me), lambda c: 'Good knight against a bad bishop (its pawns are fixed on its own colour): ' + c.san() + ' keeps the win.')
d_bvn_wings = make_find('d_bvn_wings', lambda c: p_bvn_wings(c.b, c.me), lambda c: 'Bishop against knight with pawns on both wings: ' + c.san() + ' keeps the win.')
d_badb = make_find('d_badb', lambda c: p_badbishop(c.b, c.me), lambda c: 'Their bishop is bad, its pawns are fixed on its colour: ' + c.san() + ' keeps the win.')
d_pawnless = make_find('d_pawnless', lambda c: not pawns(c.b, True) and not pawns(c.b, False) and npieces(c.b, True) + npieces(c.b, False) >= 3, lambda c: 'A pawnless ending: ' + c.san() + ' is the only move that keeps the result.')
d_fortress = make_find('d_fortress', lambda c: c.mat <= -2 and npieces(c.b, not c.me) >= 1, lambda c: 'You are ' + str(-c.mat) + ' points down and still not lost: ' + c.san() + ' is the only move that keeps the draw.')
d_gm_eg = make_find('d_gm_eg', lambda c: c.meta.get('tier') == '2000+' or (c.meta.get('rating') or 0) >= 2100, lambda c: 'A critical endgame moment at master level: ' + c.san() + ' is the only move that keeps the result.')
d_qvp7_find = make_find('d_qvp7_find', lambda c: p_qvp7(c.b, c.me), lambda c: 'Queen against a pawn on the 7th: ' + c.san() + ' is the only move that keeps the result.')
d_wrongb_find = make_find('d_wrongb_find', lambda c: p_wrongb(c.b, c.me) and c.pt() == K_, lambda c: 'The wrong bishop: ' + c.san() + ' heads for the corner the bishop cannot cover.')
d_queen_eg = make_find('d_queen_eg', lambda c: c.typ == 'queen', lambda c: 'Queen ending: ' + c.san() + ' is the only move that keeps the result.')

# rule id -> detectors: ('find', fn, claim) or ('play', fn, goal) ; goal 'win' / 'draw' / 'eval' (from Stockfish)
E = {
 'L0.1': [('play', p_mat_draw, 'draw')], 'L0.2': [('play', p_mat_draw, 'draw')], 'L0.4': [('find', d_race, 'only')], 'L0.5': [('find', d_transform, 'win')],
 'D0.1': [('find', d_blockade, 'only')], 'D0.2': [('find', d_dead, 'draw')], 'D0.3': [('play', p_philidor, 'draw'), ('play', p_wrongb, 'draw'), ('play', p_rvminor0, 'draw')],
 'D0.4': [('play', p_ocb_draw, 'draw')], 'D0.5': [('find', d_stalemate_save, 'draw')], 'D0.6': [('find', d_perpetual, 'draw')], 'D0.7': [('find', d_counter, 'only')],
 'F0.5': [('find', d_convert, 'win')], 'F0.6': [('find', d_convert, 'win')],
 'R0.1': [('find', d_stalemate_avoid, 'win'), ('find', d_stalemate_save, 'draw')], 'R0.2': [('find', d_dead, 'draw')], 'R0.3': [('find', d_perpetual, 'draw')],
 'R0.6': [('find', d_promote, 'win'), ('find', d_under, 'only')], 'R0.7': [('find', d_mate, 'win'), ('find', d_promote, 'win')], 'R0.8': [('find', d_king_active, 'only')],
 'R0.10': [('find', d_trade_ahead, 'win')], 'R0.11': [('play', p_kqk, 'win'), ('play', p_krk, 'win')], 'R0.12': [('find', d_stalemate_avoid, 'win')],
 'R0.13': [('find', d_square, 'only')], 'R0.14': [('find', d_king_front, 'win')], 'R0.15': [('find', d_rookpawn_corner, 'draw'), ('play', p_rookpawn_draw, 'draw')],
 'R0.16': [('find', d_promote, 'win')], 'R0.17': [('find', d_blockade, 'only')],
 'C0.2': [('play', p_kqk, 'win')], 'C0.3': [('play', p_krk, 'win')], 'C0.4': [('find', d_reti, 'only')], 'C0.5': [('find', d_outside, 'win')], 'C0.6': [('find', d_stalemate_save, 'draw')],
 'R1.1': [('find', d_opposition, 'only')], 'R1.2': [('find', d_keysq, 'win'), ('play', p_keysq, 'win')], 'R1.3': [('play', p_keysq, 'win')], 'R1.4': [('find', d_opposition, 'only'), ('find', d_keysq, 'win')],
 'R1.5': [('find', d_defend_front, 'draw')], 'R1.6': [('find', d_tempo, 'only')], 'R1.7': [('play', p_rookpawn_draw, 'draw')], 'R1.8': [('find', d_outside, 'win')],
 'R1.9': [('find', d_protected, 'win')], 'R1.10': [('find', d_separated, 'win')], 'R1.11': [('find', d_race, 'only')], 'R1.12': [('play', p_wrongb, 'draw')],
 'R1.13': [('play', p_qvp7, 'eval')], 'R1.14': [('play', p_qvp7, 'eval')], 'R1.15': [('find', d_minor_stop, 'only')], 'R1.16': [('find', d_rook_behind, 'only')],
 'R1.17': [('find', d_rook_active, 'only')], 'R1.18': [('find', d_cutoff, 'only')], 'R1.19': [('find', d_lucena_find, 'win'), ('play', p_lucena, 'win')],
 'R1.20': [('find', d_philidor_find, 'draw'), ('play', p_philidor, 'draw')], 'R1.21': [('play', p_connected6, 'eval')], 'R1.22': [('find', d_transform, 'win')], 'R1.23': [('find', d_convert, 'win')],
 'C1.1': [('find', d_tempo, 'only')], 'C1.2': [('find', d_opposition, 'only'), ('find', d_distant_opp, 'only')], 'C1.3': [('find', d_keysq, 'win')], 'C1.4': [('find', d_tempo, 'only')],
 'C1.5': [('find', d_outside, 'win')], 'C1.6': [('find', d_under, 'only')], 'C1.7': [('find', d_cutoff, 'only')], 'C1.8': [('play', p_lucena, 'win'), ('play', p_philidor, 'draw')],
 'R2.1': [('find', d_triangulation, 'win')], 'R2.3': [('find', d_distant_opp, 'only')], 'R2.5': [('find', d_reti, 'only')], 'R2.6': [('find', d_breakthrough, 'win')],
 'R2.7': [('find', d_candidate, 'only')], 'R2.8': [('find', d_candidate, 'only')], 'R2.9': [('find', d_tempo, 'only')], 'R2.10': [('find', d_kp_king, 'only')],
 'R2.11': [('play', p_rookpawn_draw, 'draw')], 'R2.12': [('find', d_rook7, 'only')], 'R2.13': [('find', d_rook_active_down, 'only'), ('play', p_rook_down, 'draw')],
 'R2.14': [('find', d_flank, 'draw')], 'R2.15': [('find', d_flank, 'draw')], 'R2.16': [('play', p_backrank, 'win')], 'R2.17': [('play', p_samewing, 'draw')],
 'R2.18': [('play', p_rook_down, 'draw')], 'R2.19': [('play', p_badbishop, 'win')], 'R2.20': [('play', p_bvn_wings, 'win'), ('play', p_nvb_onewing, 'win')],
 'R2.21': [('find', d_nn_outside, 'win')], 'R2.22': [('play', p_ocb_draw, 'draw')], 'R2.23': [('play', p_ocb_heavy, 'win')], 'R2.24': [('play', p_rvminor0, 'draw')],
 'R2.25': [('find', d_blockade_nk, 'only')], 'R2.27': [('find', d_quiet, 'win')], 'R2.28': [('find', d_avoid_kp, 'only'), ('find', d_transform, 'win')],
 'C2.1': [('find', d_race, 'only')], 'C2.2': [('find', d_reti, 'only')], 'C2.3': [('find', d_rook_active, 'only')], 'C2.4': [('play', p_badbishop, 'win')], 'C2.5': [('find', d_blockade, 'only')],
 'C2.7': [('find', d_mate_rook, 'win')],
 'R3A.1': [('find', d_tempo, 'only')], 'R3A.2': [('find', d_tempo, 'only')], 'R3A.3': [('play', d_outside_vs_prot, 'eval')], 'R3A.4': [('find', d_race_queens, 'only')],
 'R3A.5': [('play', p_rule5, 'eval')], 'R3A.6': [('find', d_flank, 'draw')], 'R3A.7': [('play', p_vancura, 'draw')], 'R3A.8': [('play', p_g7h7, 'eval')], 'R3A.9': [('play', p_r2p, 'win')],
 'R3A.10': [('play', p_r_vs_passers, 'eval')], 'R3A.11': [('play', p_qvp7, 'eval')], 'R3A.12': [('play', p_qr, 'win')], 'R3A.13': [('play', p_qrp, 'eval')], 'R3A.14': [('find', d_q_passer, 'win')],
 'R3A.15': [('find', d_qperpetual, 'draw')], 'R3A.16': [('play', p_kbnk, 'win')], 'R3A.17': [('play', p_2b, 'win')], 'R3A.18': [('play', p_2nvp, 'eval')], 'R3A.19': [('play', p_2bvn, 'eval')],
 'R3A.20': [('play', p_nvrp7, 'eval')], 'R3A.21': [('play', p_rbvr, 'eval')], 'R3A.22': [('play', p_rnvr, 'draw')], 'R3A.23': [('play', p_qv2m, 'eval')], 'R3A.24': [('play', p_bpvb, 'eval')],
 'R3A.25': [('play', p_npvn, 'eval')], 'C3A.3': [('play', p_mat_draw, 'draw')], 'C3A.4': [('find', d_stalemate_save, 'draw')], 'C3A.5': [('find', d_qperpetual, 'draw')],
 'R3B.1': [('find', d_worst, 'only')], 'R3B.3': [('find', d_worst, 'only')], 'R3B.4': [('find', d_restrict, 'only')], 'R3B.5': [('find', d_trade_ahead, 'win')], 'R3B.6': [('find', d_transform, 'win')],
 'R3B.7': [('find', d_avoid_kp, 'only')], 'R3B.8': [('find', d_defender_pawns, 'draw')], 'R3B.10': [('play', p_exchange_up, 'win')], 'R3B.11': [('find', d_eg_sac, 'win')],
 'R3B.12': [('find', d_eg_pawnsac, 'win')], 'R3B.13': [('find', d_promote, 'win'), ('find', d_blockade, 'only')], 'R3B.15': [('find', d_outside, 'win')], 'R3B.17': [('find', d_lever, 'only')],
 'R3B.21': [('find', d_rook_active_down, 'only')], 'R3B.22': [('play', p_nvbadb, 'win')], 'R3B.23': [('play', p_bvn_wings, 'win')], 'R3B.24': [('play', p_ocb_win, 'win')], 'R3B.25': [('play', p_q2r, 'eval')],
 'C3B.2': [('find', d_domination, 'only')], 'R3C.1': [('play', p_mat_draw, 'draw')], 'R3C.2': [('play', p_mat_draw, 'draw')], 'R3C.6': [('find', d_tempo, 'only')], 'R3C.8': [('find', d_domination, 'only')],
 'R3C.9': [('find', d_mate, 'win')], 'R3C.10': [('find', d_decoy, 'win')], 'R3C.11': [('find', d_counter, 'only')], 'R3C.12': [('play', p_rook_down2, 'eval')], 'R3C.14': [('play', p_philidor, 'draw'), ('play', p_vancura, 'draw')],
 'R3C.15': [('find', d_q_passer, 'win')], 'C3C.3': [('find', d_mate, 'win')],
}
for rid, extra in {
    'R2.22': [('find', d_ocb_hold, 'draw')], 'D0.4': [('find', d_ocb_hold, 'draw'), ('find', d_fortress, 'draw')], 'R2.23': [('find', d_ocb_heavy, 'win')], 'R3B.24': [('find', d_ocb_win, 'win')],
    'R2.24': [('find', d_rvminor_hold, 'draw')], 'R3B.10': [('find', d_exchange_up, 'win')], 'R3B.9': [('find', d_minor_eg, 'only')], 'R3B.22': [('find', d_nvbadb, 'win')],
    'R3B.23': [('find', d_bvn_wings, 'win')], 'R2.20': [('find', d_bvn_wings, 'win')], 'R2.19': [('find', d_badb, 'win')], 'R3A.19': [('find', d_pawnless, 'only')],
    'R3A.21': [('find', d_pawnless, 'only')], 'R3A.22': [('find', d_pawnless, 'only')], 'R3A.23': [('find', d_pawnless, 'only')], 'R3A.24': [('find', d_minor_eg, 'only')],
    'R3A.25': [('find', d_minor_eg, 'only')], 'R3A.20': [('find', d_minor_eg, 'only')], 'R3C.1': [('find', d_fortress, 'draw')], 'R3C.2': [('find', d_fortress, 'draw')],
    'C3C.1': [('find', d_fortress, 'draw')], 'R3C.17': [('find', d_gm_eg, 'only')], 'C3C.4': [('find', d_gm_eg, 'only')], 'R3A.11': [('find', d_qvp7_find, 'only')],
    'R3A.12': [('find', d_pawnless, 'only')], 'R3A.13': [('find', d_queen_eg, 'only')], 'R1.12': [('find', d_wrongb_find, 'draw')], 'C3A.2': [('find', d_flank, 'draw'), ('find', d_cutoff, 'only')],
    'C3A.1': [('find', d_lucena_find, 'win'), ('find', d_philidor_find, 'draw')], 'R3A.18': [('find', d_pawnless, 'only')],
}.items():
    E.setdefault(rid, [])
    E[rid] = E[rid] + extra
# rules that need Stockfish beyond the only-move test: the pawn ending after the capture must be worse
ENGINE_EXTRA = {d_avoid_kp: 'kp_trade_worse'}

# ---------------------------------------------------------------- middlegame detectors (per lesson topic)
def mg_ok(c): return c.m is not None and c.mg and not c.b.is_check()
def d_mg_blunder(c):
    if not mg_ok(c) or c.meta.get('kind') not in ('blunder', 'mistake') or not c.meta.get('played'): return None
    try: pm = chess.Move.from_uci(c.meta['played'])
    except Exception: return None
    if pm == c.m or pm not in c.b.legal_moves: return None
    c.meta['played_san'] = c.b.san(pm)
    return 'In my game I played ' + c.b.san(pm) + ' here without the blunder check, and it cost me. Run M first: what does their last move do, and what does your move allow?'
def loose(b, s, c): return not b.attackers(c, s)
def d_mg_loose(c):
    if not mg_ok(c): return None
    if c.cap():
        t = c.b.piece_at(c.m.to_square)
        if t and t.piece_type in (N_, B_, R_, Q_) and loose(c.b, c.m.to_square, not c.me):
            return 'Their ' + NAME[t.piece_type] + ' on ' + sqn(c.m.to_square) + ' had no defender: the CCA scan finds it. ' + c.san() + '.'
    att = [s for s in c.a.attacks(c.m.to_square) if c.a.piece_at(s) and c.a.piece_at(s).color != c.me and c.a.piece_at(s).piece_type in (N_, B_, R_, Q_) and loose(c.a, s, not c.me)]
    if att and len(c.own_moves()) >= 2 and material(c.end, c.me) - c.mat >= 3:
        return c.san() + ' attacks the loose ' + NAME[c.a.piece_at(att[0]).piece_type] + ' on ' + sqn(att[0]) + ': a piece with no defender is a target.'
    return None
def d_mg_activity(c):
    if not mg_ok(c) or c.pt() in (P_, K_) or not c.quiet(): return None
    ek = c.b.king(not c.me)
    if ek is not None and chess.square_distance(ek, c.m.to_square) <= 2: return None
    g = mob(c.a, c.m.to_square) - mob(c.b, c.m.from_square)
    if g >= 4: return c.san() + ': the ' + NAME[c.pt()] + ' goes from ' + str(mob(c.b, c.m.from_square)) + ' to ' + str(mob(c.a, c.m.to_square)) + ' squares and joins the other pieces.'
    return None
def d_mg_tactic(c):
    if not mg_ok(c) or len(c.own_moves()) < 2 or material(c.end, c.me) - c.mat < 2: return None
    t = c.m.to_square; p = c.a.piece_at(t)
    targets = [s for s in c.a.attacks(t) if c.a.piece_at(s) and c.a.piece_at(s).color != c.me and (c.a.piece_at(s).piece_type == K_ or V[c.a.piece_at(s).piece_type] >= 3)]
    if len(targets) >= 2: return c.san() + ': a fork. The ' + NAME[p.piece_type] + ' attacks ' + ' and '.join(NAME[c.a.piece_at(s).piece_type] + ' on ' + sqn(s) for s in targets[:2]) + '.'
    ek = c.a.king(not c.me)
    for s, q in c.a.piece_map().items():
        if q.color != c.me and q.piece_type in (N_, B_, R_, Q_) and c.a.is_pinned(not c.me, s) and s in c.a.attacks(t) and not c.b.is_pinned(not c.me, s):
            return c.san() + ': a pin. Their ' + NAME[q.piece_type] + ' on ' + sqn(s) + ' cannot move without exposing the king.'
    if c.chk() and p.piece_type in (B_, R_, Q_) and ek is not None:
        ray = chess.ray(t, ek)
        if ray:
            for s in chess.SquareSet(ray):
                q = c.a.piece_at(s)
                if q and q.color != c.me and q.piece_type in (R_, Q_) and chess.square_distance(t, s) > chess.square_distance(t, ek):
                    return c.san() + ': a skewer. The king must move and the ' + NAME[q.piece_type] + ' on ' + sqn(s) + ' behind it falls.'
    before = {s for s in c.b.piece_map() if c.b.piece_at(s).color != c.me and V[c.b.piece_at(s).piece_type] >= 3 and any(x != c.m.from_square for x in c.b.attackers(c.me, s))}
    after = {s for s, q in c.a.piece_map().items() if q.color != c.me and (q.piece_type == K_ or V[q.piece_type] >= 3) and any(x != t for x in c.a.attackers(c.me, s))}
    new = after - before
    if new: return c.san() + ': a discovered attack. Moving the ' + NAME[p.piece_type] + ' opens a line onto their ' + NAME[c.a.piece_at(min(new)).piece_type] + ' on ' + sqn(min(new)) + '.'
    return None
def d_mg_trade_ahead(c):
    if not mg_ok(c) or c.mat < 2 or not c.cap(): return None
    t = c.b.piece_at(c.m.to_square)
    if t and t.piece_type in (N_, B_, R_, Q_) and c.recaptured(): return 'You are ' + str(c.mat) + ' points up: the simple plan is to trade pieces. ' + c.san() + '.'
    return None
def d_mg_uncastled(c):
    if not mg_ok(c): return None
    ek = c.b.king(not c.me)
    if ek is None or sqn(ek) != ('e8' if c.me else 'e1'): return None
    dev = lambda col: sum(1 for s in list(c.b.pieces(N_, col)) + list(c.b.pieces(B_, col)) if rel(s, col) > 0)
    if dev(c.me) >= dev(not c.me) + 2 and (c.chk() or c.cap() or (c.pt() == P_ and fil(c.m.to_square) in (3, 4)) or sac_kind(c.b, c.m)):
        return 'Their king is still on ' + sqn(ek) + ' and you have ' + str(dev(c.me) - dev(not c.me)) + ' more pieces out: open the centre now. ' + c.san() + '.'
    return None
def d_mg_kingattack(c):
    if not mg_ok(c): return None
    k = sac_kind(c.b, c.m)
    if k == 'greek-gift': return c.san() + ': the Greek Gift. The bishop takes the pawn in front of their king with check; the knight and queen come next.'
    if c.end.is_checkmate() and c.end.turn != c.me and len(c.own_moves()) >= 2:
        ek = c.end.king(not c.me)
        if ek is not None and rel(ek, not c.me) == 0: return 'A mating pattern against the castled king: the line ends in mate on the back rank (' + c.steps[-1][0].san(c.steps[-1][1]) + ').'
        return 'A mating attack on the king: the line ends in mate (' + c.steps[-1][0].san(c.steps[-1][1]) + ').'
    if k in ('rook-king', 'bishop-king'): return c.san() + ': a sacrifice on the king\'s cover to open it for the other pieces.'
    return None
def open_file(b, f): return not any(fil(s) == f for s in b.pieces(P_, True) | b.pieces(P_, False))
def d_mg_openfile(c):
    if not mg_ok(c) or c.pt() not in (R_, Q_) or c.cap(): return None
    t = c.m.to_square
    if c.pt() == R_ and rel(t, c.me) == 6 and rel(c.m.from_square, c.me) != 6: return c.san() + ': the rook reaches the 7th rank.'
    if open_file(c.b, fil(t)) and fil(t) != fil(c.m.from_square):
        other = [s for s in c.b.pieces(R_, c.me) | c.b.pieces(Q_, c.me) if s != c.m.from_square and fil(s) == fil(t)]
        return c.san() + ': the ' + NAME[c.pt()] + ' takes the open ' + 'abcdefgh'[fil(t)] + '-file' + (', doubling with the other heavy piece.' if other else '.')
    return None
def d_mg_lever(c):
    if not mg_ok(c) or c.pt() != P_ or c.cap(): return None
    hits = [s for s in c.a.attacks(c.m.to_square) if c.a.piece_at(s) and c.a.piece_at(s).piece_type == P_ and c.a.piece_at(s).color != c.me]
    if hits: return c.san() + ': a pawn lever against ' + sqn(hits[0]) + '. It opens lines for your pieces.'
    return None
def struct_of(b, c): return {sid for sid, name, test, kw in MP.STRUCTURES if test(b, c)}
def d_mg_carlsbad(c):
    if not mg_ok(c): return None
    st = struct_of(c.b, c.me)
    if not st & {'carlsbad', 'minority'}: return None
    t = c.m.to_square
    if c.pt() == P_ and fil(t) == 1 and 'minority' in st: return c.san() + ': the minority attack. The b-pawn goes forward to leave them a weak c-pawn.'
    if c.pt() == P_ and fil(t) == 4: return c.san() + ': the e-pawn break, the central plan in the Carlsbad structure.'
    if c.pt() == N_ and sqn(t)[0] in 'ce' and rel(t, c.me) in (3, 4): return c.san() + ': the knight heads for its Carlsbad square on the ' + sqn(t)[0] + '-file.'
    return None
def d_mg_iqp(c):
    if not mg_ok(c): return None
    st = struct_of(c.b, c.me); t = c.m.to_square
    if 'iqp-mine' in st:
        d = [s for s in pawns(c.b, c.me) if fil(s) == 3][0]
        if c.pt() == P_ and c.m.from_square == d: return c.san() + ': the d-pawn break. The isolated pawn advances and opens the position for your active pieces.'
        if c.pt() == N_ and sqn(t) in (('e5', 'c5') if c.me else ('e4', 'c4')): return c.san() + ': the knight on its outpost next to the isolated pawn, the typical attacking post.'
        ek = c.b.king(not c.me)
        if c.pt() in (B_, Q_, R_) and ek is not None and chess.square_distance(t, ek) + 2 <= chess.square_distance(c.m.from_square, ek) and c.quiet():
            return c.san() + ': with the isolated pawn you attack while the pieces are on: this piece turns towards their king.'
    if 'iqp-theirs' in st:
        d = [s for s in pawns(c.b, not c.me) if fil(s) == 3][0]; bq = ahead(d, not c.me)
        if t == bq and c.pt() in (N_, B_, Q_, R_): return c.san() + ': the blockade. The ' + NAME[c.pt()] + ' sits on ' + sqn(bq) + ', right in front of their isolated pawn.'
        if c.cap() and c.recaptured() and c.b.piece_at(t) and c.b.piece_at(t).piece_type in (N_, B_): return c.san() + ': against the isolated pawn, trade pieces: every trade makes it weaker.'
        if d in c.a.attacks(t) and d not in c.b.attacks(c.m.from_square) and c.quiet(): return c.san() + ': the ' + NAME[c.pt()] + ' attacks the isolated pawn on ' + sqn(d) + '.'
    return None
def d_mg_hanging(c):
    if not mg_ok(c): return None
    st = struct_of(c.b, c.me); t = c.m.to_square
    if 'hanging-mine' in st and c.pt() == P_ and fil(c.m.from_square) in (2, 3): return c.san() + ': one of the hanging pawns advances when it opens lines for your pieces.'
    if 'hanging-theirs' in st:
        hp = [s for s in pawns(c.b, not c.me) if fil(s) in (2, 3)]
        hit = [s for s in hp if s in c.a.attacks(t) and s not in c.b.attacks(c.m.from_square)]
        if hit and c.quiet(): return c.san() + ': the ' + NAME[c.pt()] + ' attacks the hanging pawn on ' + sqn(hit[0]) + ': make one of them advance.'
    return None
def outpost(b, s, c):
    if rel(s, c) not in (3, 4, 5): return False
    if not any(b.piece_at(x) == chess.Piece(P_, c) for x in b.attackers(c, s)): return False
    f = fil(s)
    for q in b.pieces(P_, not c):
        if abs(fil(q) - f) == 1 and rel(q, c) > rel(s, c): return False
    return True
def d_mg_outpost(c):
    if not mg_ok(c) or c.pt() not in (N_, B_) or c.cap(): return None
    if outpost(c.a, c.m.to_square, c.me) and not outpost(c.b, c.m.from_square, c.me):
        return c.san() + ': an outpost. The ' + NAME[c.pt()] + ' on ' + sqn(c.m.to_square) + ' is protected by a pawn and no enemy pawn can ever chase it.'
    return None
def d_mg_trade(c):
    if not mg_ok(c) or not c.cap() or not c.recaptured(): return None
    t = c.b.piece_at(c.m.to_square)
    if not t or t.piece_type not in (N_, B_, R_) or V[t.piece_type] != V[c.pt()]: return None
    mt, mm = mob(c.b, c.m.to_square), mob(c.b, c.m.from_square)
    if mt > mm: return c.san() + ': trade their active ' + NAME[t.piece_type] + ' (' + str(mt) + ' squares) for your quieter one (' + str(mm) + ').'
    return c.san() + ': the right trade here: it removes a defender or simplifies into a better position.'
def chain_base(b, c):
    out = []
    for s in pawns(b, c):
        if any(b.piece_at(x) == chess.Piece(P_, c) for x in b.attackers(c, s)): continue
        if any(b.piece_at(x) == chess.Piece(P_, c) and rel(x, c) == rel(s, c) + 1 for x in b.attacks(s)):
            front = ahead(s, c)
            if front is not None and b.piece_at(front) and b.piece_at(front).piece_type == P_: out.append(s)
    return out
def d_mg_chain(c):
    if not mg_ok(c) or c.pt() != P_ or c.cap(): return None
    for s in chain_base(c.b, not c.me):
        if s in c.a.attacks(c.m.to_square): return c.san() + ': attack the base of their pawn chain (' + sqn(s) + ').'
    return None
def d_mg_minor(c):
    if not mg_ok(c) or c.pt() not in (N_, B_) or c.cap(): return None
    a, o = pieces(c.b, c.me), pieces(c.b, not c.me)
    if a[B_] == 2 and o[B_] < 2: return c.san() + ': you have the bishop pair: open lines and keep both bishops.'
    if a[N_] >= 1 and o[B_] == 1 and bad_bishop(c.b, not c.me): return c.san() + ': good knight against their bad bishop: put the knight where the bishop can never reach.'
    return None
def d_mg_two_weak(c):
    if not mg_ok(c) or not c.quiet(): return None
    targets = lambda bd: {s for s in pawns(bd, not c.me) if bd.attackers(c.me, s)}
    tb, ta = targets(c.b), targets(c.a)
    new = ta - tb
    if new and tb and max(abs(fil(x) - fil(y)) for x in new for y in tb) >= 4:
        return c.san() + ': a second weakness on the other wing (' + sqn(min(new)) + ', next to ' + sqn(min(tb)) + '): one weakness can be defended, two cannot.'
    return None
def d_mg_colour(c):
    if not mg_ok(c) or c.pt() == K_ or c.cap(): return None
    ob = list(c.b.pieces(B_, not c.me)); cols = {sqcol(s) for s in ob}
    t = c.m.to_square; ek = c.b.king(not c.me)
    if len(cols) == 1 and sqcol(t) not in cols and ek is not None and chess.square_distance(t, ek) <= 2:
        return c.san() + ': their ' + ('light' if cols == {1} else 'dark') + '-squared bishop is the only one left, so the ' + ('dark' if cols == {1} else 'light') + ' squares around their king are yours.'
    return None
def d_mg_space(c):
    if not mg_ok(c) or c.pt() != P_ or c.cap() or rel(c.m.to_square, c.me) not in (4, 5): return None
    drop = total_mob(c.b, not c.me) - total_mob(c.a, not c.me)
    if drop >= 3: return c.san() + ': space. The pawn takes ' + str(drop) + ' squares from their pieces.'
    return None
def d_mg_regroup(c):
    if not mg_ok(c) or c.pt() not in (N_, B_, Q_, R_) or not c.quiet(): return None
    back = rel(c.m.to_square, c.me) < rel(c.m.from_square, c.me)
    if back and mob(c.a, c.m.to_square) >= mob(c.b, c.m.from_square) + 2: return c.san() + ': regrouping. The ' + NAME[c.pt()] + ' steps back to find a better road (' + str(mob(c.b, c.m.from_square)) + ' squares before, ' + str(mob(c.a, c.m.to_square)) + ' after).'
    return d_worst(c)
def d_mg_oppcastle(c):
    if not mg_ok(c) or not MP.opposite_castled(c.b, c.me): return None
    ek = c.b.king(not c.me)
    if c.pt() == P_ and abs(fil(c.m.to_square) - fil(ek)) <= 2 and not c.cap(): return c.san() + ': kings on opposite wings is a race. Your pawns go at their king.'
    if c.pt() in (R_, Q_) and abs(fil(c.m.to_square) - fil(ek)) <= 1 and fil(c.m.to_square) != fil(c.m.from_square): return c.san() + ': a heavy piece onto the file of their king.'
    return None
def d_mg_centre(c):
    if not mg_ok(c) or c.pt() != P_ or c.cap() or fil(c.m.to_square) not in (2, 3, 4, 5): return None
    return c.san() + ': the centre pawn advances: a mobile pawn mass gains space and opens lines.'
def d_mg_bridge(c):
    if not mg_ok(c) or c.meta.get('ply', 99) > 30: return None
    op = (c.meta.get('opening') or '') + ' ' + (c.meta.get('eco') or '')
    for name in ('Colle', 'Caro', 'Slav', 'Vienna', 'Zukertort'):
        if name.lower() in op.lower(): return 'From my ' + name + ' games: the plan of the opening carried into the middlegame. ' + c.san() + '.'
    return None
def d_mg_transform(c):
    if not mg_ok(c): return None
    if c.cap() and (c.b.pieces(Q_, True) and c.b.pieces(Q_, False)) and not (c.end.pieces(Q_, True) or c.end.pieces(Q_, False)):
        return c.san() + ': transform the advantage. The queens come off and the better endgame stays.'
    k = sac_kind(c.b, c.m)
    if k and c.mat >= 2: return c.san() + ': you give material back to turn a material edge into an attack or a passed pawn.'
    return None
def d_mg_exsac(c):
    if not mg_ok(c): return None
    k = sac_kind(c.b, c.m)
    if k == 'exchange': return c.san() + ': the exchange sacrifice. A rook for a minor piece, for something that stays.'
    return None
def d_mg_initiative(c):
    if not mg_ok(c): return None
    k = sac_kind(c.b, c.m)
    if k == 'pawn': return c.san() + ': a pawn for time and open lines: the initiative.'
    if k in ('knight', 'f7'): return c.san() + ': a piece sacrifice for the initiative: the open lines are worth more than the piece.'
    return None
def d_mg_dynamic(c):
    if not mg_ok(c): return None
    k = sac_kind(c.b, c.m)
    if k in ('pawn', 'exchange'): return c.san() + ': dynamic over static. You give ' + ('a pawn' if k == 'pawn' else 'the exchange') + ' for activity that lasts.'
    return None
def d_mg_trans_choose(c):
    if not mg_ok(c) or not c.cap(): return None
    t = c.b.piece_at(c.m.to_square)
    if t and t.piece_type == Q_ and c.recaptured(): return c.san() + ': trade the queens into the ending that suits you.'
    return None
def d_mg_trans_convert(c):
    if not c.m or c.b.is_check() or c.mat < 1 or (c.b.pieces(Q_, True) or c.b.pieces(Q_, False)) or npieces(c.b, c.me) < 2: return None
    if c.pt() == K_ and centre_dist(c.m.to_square) < centre_dist(c.m.from_square): return 'Queens are off and you are ahead: the king joins the game. ' + c.san() + '.'
    if c.pt() == P_ and passed(c.b, c.m.from_square, c.me): return 'Queens are off and you are ahead: push the passed pawn. ' + c.san() + '.'
    return None
def d_mg_calc(c):
    if not mg_ok(c) or len(c.own_moves()) < 3: return None
    if c.meta.get('kind') in ('brilliant', 'great') or (c.meta.get('rating') or 0) >= 1900:
        return 'A critical moment: the line needs ' + str(len(c.own_moves())) + ' exact moves of yours, each one the only good one. ' + c.san() + ' starts it.'
    return None
def d_mg_synthesis(c):
    if not mg_ok(c): return None
    if (c.meta.get('tier') == '2000+' or (c.meta.get('rating') or 0) >= 2100) and (sac_kind(c.b, c.m) or len(c.own_moves()) >= 2):
        return 'The full MSPC loop: their move, the specifics, your checks, captures and attacks, and a line that holds against every reply. ' + c.san() + '.'
    return None

# engine-checked middlegame ideas: the threat after a "pass" (null move)
def d_mg_threat_made(c):
    if not mg_ok(c) or not c.quiet() or c.pt() == K_: return None
    c.meta['need'] = 'threat_made'; return c.san() + ': a quiet move with a threat. If they ignore it, you win material next move.'
def d_mg_defend(c):
    if not mg_ok(c): return None
    c.meta['need'] = 'threat_parried'; return c.san() + ': they threaten something big, and this is the move that meets it.'
def d_mg_kingsafe(c):
    if not mg_ok(c): return None
    mk = c.b.king(c.me)
    if mk is None: return None
    if c.pt() == K_ or chess.square_distance(c.m.to_square, mk) <= 2:
        c.meta['need'] = 'threat_parried'; return c.san() + ': king safety first. Their attack on your king is stopped before anything else.'
    return None
def d_mg_prophylaxis(c):
    if not mg_ok(c) or not c.quiet(): return None
    c.meta['need'] = 'threat_parried_quiet'; return c.san() + ': prophylaxis. Ask what they want, and take it away before it happens.'

MGD = {
 'mg-ch-t0-01': [d_mg_blunder], 'mg-ch-t0-02': [d_mg_loose], 'mg-ch-t0-03': [d_mg_activity], 'mg-ch-t0-04': [d_mg_kingsafe], 'mg-ch-t0-05': [d_mg_tactic],
 'mg-planning': [d_mg_trade_ahead, d_mg_iqp, d_mg_carlsbad, d_mg_outpost, d_mg_two_weak],
 'mg-ch-t1-01': [d_mg_uncastled], 'mg-ch-t1-02': [d_mg_threat_made], 'mg-ch-t1-03': [d_mg_kingattack], 'mg-ch-t1-04': [d_mg_openfile], 'mg-ch-t1-05': [d_mg_lever],
 'mg-defence': [d_mg_defend], 'mg-prophylaxis': [d_mg_prophylaxis],
 'mg-ch-t2-02': [d_mg_carlsbad], 'mg-ch-t2-03': [d_mg_iqp], 'mg-ch-t2-04': [d_mg_hanging], 'mg-ch-t2-05': [d_mg_outpost], 'mg-ch-t2-06': [d_mg_trade], 'mg-ch-t2-07': [d_mg_chain],
 'mg-ch-t2-08': [d_mg_minor], 'mg-ch-t2-09': [d_mg_two_weak],
 'mg-ch-t3a-02': [d_mg_dynamic], 'mg-ch-t3a-03': [d_mg_colour], 'mg-ch-t3a-04': [d_mg_space], 'mg-ch-t3a-05': [d_mg_regroup], 'mg-ch-t3a-06': [d_mg_oppcastle],
 'mg-ch-t3a-07': [d_mg_centre], 'mg-ch-t3a-08': [d_mg_bridge],
 'mg-ch-t3b-02': [d_mg_transform], 'mg-ch-t3b-03': [d_mg_exsac], 'mg-ch-t3b-04': [d_mg_initiative], 'mg-transitions': [d_mg_trans_choose, d_mg_trans_convert],
 'mg-ch-t3b-08': [d_mg_calc], 'mg-ch-t3c-01': [d_mg_synthesis],
}

def detect(c, grp):
    """{rule: [(mode, claim, reason)]} for one candidate (no engine)"""
    out = {}
    if not c.ok: return out
    if grp == 'endgame':
        for rule, dets in E.items():
            for mode, fn, claim in dets:
                if mode == 'find' and c.m is None: continue
                try:
                    r = fn(c) if mode == 'find' or fn.__code__.co_argcount == 1 else (fn(c.b, c.me) and 'shape')
                except Exception: r = None
                if r: out.setdefault(rule, []).append((mode, claim, r if isinstance(r, str) else '', fn.__name__))
    else:
        for topic, dets in MGD.items():
            for fn in dets:
                c.meta.pop('need', None)
                try: r = fn(c)
                except Exception: r = None
                if r: out.setdefault(topic, []).append(('find', c.meta.get('need') or 'only', r, fn.__name__))
    return out

# ---------------------------------------------------------------- Stockfish
class Eng:
    def __init__(s, path, depth, threads=2):
        s.e = chess.engine.SimpleEngine.popen_uci(path); s.e.configure({'Threads': threads, 'Hash': 256}); s.d = depth; s.calls = 0
    def an(s, b, mpv=1, depth=None, moves=None):
        s.calls += 1
        r = s.e.analyse(b, chess.engine.Limit(depth=depth or s.d), multipv=mpv, root_moves=moves)
        return r if isinstance(r, list) else [r]
    def close(s): s.e.quit()
def pov(info, turn): return info['score'].pov(turn).score(mate_score=10000)
def white(info): s = info['score'].white(); return {'cp': s.score(), 'mate': s.mate()}

def null_threat(E, b, side, depth):
    """what the side NOT to move threatens if `b`'s side to move passes: (points won by the threat in Stockfish's line, mate?)"""
    if b.is_check(): return None
    nb = b.copy(); nb.push(chess.Move.null())
    if nb.is_check(): return None
    try: i = E.an(nb, 1, depth=depth)
    except Exception: return None
    th = nb.turn; sc = i[0]['score'].pov(th)
    if sc.mate() is not None and sc.mate() > 0: return (99, True)
    bb = nb.copy(); m0 = material(bb, th)
    for mv in i[0].get('pv', [])[:4]:
        if mv not in bb.legal_moves: break
        bb.push(mv)
    return (material(bb, th) - m0, False)

def verify_find(E, c, claim, need=None):
    """Stockfish: is c.m the only good move, does the claim hold, and the line while each own move stays the only one"""
    b = c.b; turn = b.turn
    i0 = E.an(b, 3)
    if not i0 or not i0[0].get('pv') or i0[0]['pv'][0] != c.m: return None
    s1 = pov(i0[0], turn); s2 = pov(i0[1], turn) if len(i0) > 1 else -10000
    if len(i0) > 1:
        if s2 >= 350 and not (s1 >= 9000 and s2 < 9000): return None
        if wp(s1) - wp(s2) < 10: return None
    if claim == 'win' and s1 < 200: return None
    if claim == 'draw' and not (abs(s1) <= 80 and s2 <= -150): return None
    if need in ('threat_parried', 'threat_parried_quiet'):
        t = null_threat(E, b, turn, max(10, E.d - 4))   # what they threaten if you pass
        if t is None or s1 > 150 or s1 < -200: return None
        if need == 'threat_parried' and not (t[1] or t[0] >= 3): return None
        if need == 'threat_parried_quiet' and (t[1] or t[0] < 1): return None
        c.meta['threat'] = 'mate' if t[1] else t[0]
    if need == 'threat_made':
        a = b.copy(); a.push(c.m)
        t = null_threat(E, a, not turn, max(10, E.d - 4))  # what you threaten if they pass after your move
        if t is None or not (t[1] or t[0] >= 2): return None
        c.meta['threat'] = 'mate' if t[1] else t[0]
    if c.meta.get('kp_trade'):
        mv = chess.Move.from_uci(c.meta['kp_trade'])
        try: ik = E.an(b, 1, depth=max(10, E.d - 4), moves=[mv])
        except Exception: return None
        if s1 - pov(ik[0], turn) < 150: return None
    line = [c.m]; bb = b.copy(); bb.push(c.m)
    after = E.an(bb, 1)
    own = 1
    while own < 3 and not bb.is_game_over():
        rep = E.an(bb, 1, depth=max(12, E.d - 2))
        if not rep[0].get('pv'): break
        r = rep[0]['pv'][0]; b2 = bb.copy(); b2.push(r)
        if b2.is_game_over(): break
        nx = E.an(b2, 2, depth=max(12, E.d - 2))
        if not nx[0].get('pv'): break
        t1 = pov(nx[0], b2.turn); t2 = pov(nx[1], b2.turn) if len(nx) > 1 else -10000
        if len(nx) > 1 and (wp(t1) - wp(t2) < 10 or (t2 >= 350 and not (t1 >= 9000 and t2 < 9000))): break
        line += [r, nx[0]['pv'][0]]; bb = b2; bb.push(nx[0]['pv'][0]); own += 1
    return {'lines': [dict(white(x), pv=[m.uci() for m in x.get('pv', [])[:10]]) for x in i0], 'line': [m.uci() for m in line],
            'after': dict(white(after[0]), pv=[m.uci() for m in after[0].get('pv', [])[:10]]), 'score': s1}

def verify_play(E, fen, goal):
    b = chess.Board(fen)
    if b.is_game_over() or b.is_check(): return None
    i = E.an(b, 1, depth=max(E.d, 18)); s = pov(i[0], b.turn)
    if goal == 'eval': goal = 'win' if s >= 250 else 'draw' if abs(s) <= 60 else None
    if goal == 'win' and not (s >= 250 and (s < 9000 or (i[0]['score'].pov(b.turn).mate() or 0) >= 4)): return None
    if goal == 'draw' and abs(s) > 60: return None
    if not goal: return None
    return {'goal': goal, 'score': s, 'best': i[0]['pv'][0].uci() if i[0].get('pv') else None}

# ---------------------------------------------------------------- the book
def parse_blueprint(path):
    txt = open(path, encoding='utf-8').read()
    lines = txt.split('\n')
    doc = {'title': 'The Endgame Blueprint', 'subtitle': 'From Zero to Grandmaster: Rules & Concepts', 'parts': []}
    cur = None; sec = None; mode = None; last = None
    def clean(s): return s.strip()
    for ln in lines:
        h1 = re.match(r'^# (.+)$', ln); h2 = re.match(r'^## (.+)$', ln); h3 = re.match(r'^### (.+)$', ln)
        if h1:
            t = h1.group(1).strip()
            if t.startswith('THE ENDGAME BLUEPRINT'): continue
            m = re.match(r'^(PART 0|TIER \d[ABC]?|APPENDIX [A-D]) [—-] (.+)$', t)
            if m:
                pid = m.group(1).replace('PART ', 'P').replace('TIER ', 'T').replace('APPENDIX ', 'A')
                cur = {'id': pid, 'label': m.group(1).title().replace('Part 0', 'Part 0'), 'title': m.group(2).strip().title() if m.group(2).isupper() else m.group(2).strip(),
                       'mission': '', 'range': '', 'sections': [], 'concepts': [], 'positions': [], 'errors': [], 'triggers': [], 'text': []}
                rm = re.search(r'\(([^)]*)\)\s*$', cur['title'])
                if rm: cur['range'] = rm.group(1); cur['title'] = cur['title'][:rm.start()].strip()
                doc['parts'].append(cur); sec = None; mode = 'text'
            else:
                cur = None
            continue
        if cur is None: continue
        if h2:
            t = h2.group(1).strip()
            mode = {'Rules': 'rules', 'Concepts': 'concepts', 'Must-know positions': 'positions', 'Typical errors': 'errors'}.get(t)
            if t.startswith('Upgrade triggers') or t == 'Grandmaster standard': mode = 'triggers'; cur['triggerTitle'] = t.replace('→', 'to')
            if mode is None:
                mode = 'text'; sec = {'title': t, 'items': [], 'text': []}; cur['sections'].append(sec)
            elif mode == 'rules':
                sec = None
            continue
        if h3:
            sec = {'title': h3.group(1).strip(), 'items': [], 'text': []}; cur['sections'].append(sec); continue
        mm = re.match(r'^\*\*Mission:\*\*\s*(.+)$', ln)
        if mm: cur['mission'] = mm.group(1).strip(); continue
        if mm is None and re.match(r'^\*[A-Z].*\*$', ln.strip()) and not cur['mission']: cur['mission'] = ln.strip().strip('*'); continue
        if not ln.strip() or ln.strip() == '---': continue
        if mode == 'rules':
            m = re.match(r'^- \*\*([RC]\d[ABC]?\.\d+) \[(LAW|THEORY|PRINCIPLE)\] (.+?)\*\*\s*(.*)$', ln)
            if m:
                if sec is None: sec = {'title': 'Rules', 'items': [], 'text': []}; cur['sections'].append(sec)
                body = m.group(4).strip(); ref = re.search(r'\*Refines ([RC]\d[ABC]?\.\d+)\.?\*', body)
                it = {'id': m.group(1), 'tag': m.group(2), 'title': m.group(3).strip().rstrip('.'), 'text': re.sub(r'\*Refines [^*]+\*\s*', '', body).strip(), 'refines': ref.group(1) if ref else ''}
                sec['items'].append(it); last = it; continue
            if ln.startswith('  - ') and last is not None: last.setdefault('bullets', []).append(clean(ln[4:])); continue
        if mode == 'concepts':
            m = re.match(r'^- \*\*(C\d[ABC]?\.\d+) (.+?)\*\*\s*(.*)$', ln)
            if m: it = {'id': m.group(1), 'title': m.group(2).strip().rstrip('.'), 'text': m.group(3).strip().lstrip('— ').strip()}; cur['concepts'].append(it); last = it; continue
            if ln.startswith('  - ') and last is not None: last.setdefault('bullets', []).append(clean(ln[4:])); continue
        if mode == 'positions':
            m = re.match(r'^- \*\*(P\d[ABC]?\.\d+) [—-] (.+?)\*\*(?: · `([^`]+)`)?\s*$', ln)
            if m: it = {'id': m.group(1), 'title': m.group(2).strip(), 'fens': ([{'fen': m.group(3), 'text': ''}] if m.group(3) else []), 'text': ''}; cur['positions'].append(it); last = it; continue
            m2 = re.match(r'^\s+- `([^`]+)` [—-] (.+)$', ln)
            if m2 and last is not None: last['fens'].append({'fen': m2.group(1), 'text': m2.group(2).strip()}); continue
            if ln.startswith('  ') and last is not None:
                t = ln.strip()
                m3 = re.match(r'^(.*?)`([^`]+/[^`]+)`(.*)$', t)
                if m3 and ('Contrast' in t or 'same setup' in t):
                    last['contrast'] = t
                    for f in re.findall(r'`([^`]+)`', t): last['fens'].append({'fen': f, 'text': ''})
                    continue
                if last['fens'] and not last['fens'][0]['text']: last['fens'][0]['text'] = t
                else: last['text'] = (last['text'] + ' ' + t).strip()
                continue
        if mode == 'errors' and ln.startswith('- '): cur['errors'].append(clean(ln[2:])); continue
        if mode == 'triggers' and ln.startswith('- '): cur['triggers'].append(clean(ln[2:])); continue
        if mode == 'text':
            t = ln.strip()
            if sec is None: cur['text'].append(t); continue
            m = re.match(r'^- \*\*(Law \d) [—-] (.+?)\*\*\s*(.*)$', t)
            if m: sec['items'].append({'id': 'L0.' + m.group(1)[-1], 'tag': 'LAW OF THE FRAMEWORK', 'title': m.group(2).rstrip('.'), 'text': m.group(3)}); continue
            m = re.match(r'^(\d)\. \*\*(.+?)\*\*\s*[—-]?\s*(.*)$', t)
            if m and cur['id'] == 'P0' and sec['title'].startswith('0.4'): sec['items'].append({'id': 'D0.' + m.group(1), 'tag': 'DENIAL', 'title': m.group(2).rstrip('.'), 'text': m.group(3)}); continue
            sec['text'].append(t)
    # Part 0 sections get ids F0.1 .. F0.6
    for p in doc['parts']:
        if p['id'] == 'P0':
            for s in p['sections']:
                m = re.match(r'^0\.(\d)', s['title'])
                if m: s['id'] = 'F0.' + m.group(1)
    return doc

def all_rule_ids(doc):
    ids = []
    for p in doc['parts']:
        for s in p['sections']:
            if s.get('id'): ids.append(s['id'])
            for it in s['items']: ids.append(it['id'])
        for it in p['concepts']: ids.append(it['id'])
    return ids

# ---------------------------------------------------------------- sources
def tier_index(t):
    return TIERS.index(t) if t in TIERS else 2
def rating_tier(r):
    r = r or 1500
    return 0 if r < 800 else 1 if r < 1200 else 2 if r < 1600 else 3 if r < 2000 else 4
RULE_TIER = {'P0': 0, 'T0': 0, 'T1': 1, 'T2': 2, 'T3A': 3, 'T3B': 4, 'T3C': 4}

def year_of(t):
    try: return time.gmtime(int(t or 0)).tm_year
    except Exception: return ''

def mine_candidates(gdir):
    P, G = [], {}
    for f in sorted(glob.glob(os.path.join(gdir, 'puzzles-*.json'))): P += json.load(open(f))
    for f in sorted(glob.glob(os.path.join(gdir, 'games-*.json'))):
        for g in json.load(open(f)): G[str(g['id'])] = g
    out = []
    for p in P:
        if p.get('phase') not in ('endgame', 'middlegame') or not p.get('prev') or not p.get('prev_fen'): continue
        g = G.get(str(p['game_id']), {})
        meta = {'src': 'mine', 'phase': p['phase'], 'kind': p['kind'], 'tier': p['tier'], 'played': p.get('played'), 'ply': p['ply'],
                'game': str(p['game_id']), 'eco': g.get('eco') or p.get('eco') or '', 'opening': g.get('opening') or '', 'year': year_of(g.get('end_time')),
                'time': g.get('time_class') or '', 'level': tier_index(p['tier']), 'pid': p['id']}
        out.append((p['fen'], p['best'], p.get('line') or [p['best']], p['prev'], p['prev_fen'], meta))
    return out, G

def mine_positions(G, per_game=1):
    """endgame positions of his games for the play-out rules: (fen, meta) with the stored engine eval for the side to move"""
    for gid, g in G.items():
        toks = MP.parse(g['pgn']); b = chess.Board(); evs = g.get('evals') or []
        seen = set()
        for i, t in enumerate(toks):
            try: b.push_san(t)
            except Exception: break
            if i < 20 or b.is_check() or b.is_game_over() or not is_endgame(b): continue
            e = evs[i + 1] if len(evs) > i + 1 else None
            if e is None: continue
            yield b.fen(), {'src': 'mine', 'phase': 'endgame', 'tier': g.get('tier'), 'level': tier_index(g.get('tier')), 'game': gid, 'ply': i + 1,
                            'year': year_of(g.get('end_time')), 'time': g.get('time_class') or '', 'ev': e if b.turn else -e,
                            'next': [], 'result': g.get('result'), 'color': g.get('color')}

def mine_endings(G):
    """final positions of his games that ended by stalemate, repetition, dead position, or a flag against a lone king"""
    txt = {'stalemate': ('R0.1', 'The game ended in stalemate: the side to move had no legal move and was not in check. A draw.'),
           'repetition': ('R0.3', 'The game ended by repetition: the same position for the third time. A draw.'),
           'insufficient': ('R0.2', 'The game ended as a dead position: neither side could mate with what was left. A draw.'),
           'timevsinsufficient': ('R0.5', 'Time ran out, but the other side could not mate with what it had left: a draw, not a loss.')}
    out = collections.defaultdict(list)
    for gid, g in G.items():
        t = g.get('termination')
        if t not in txt: continue
        b = chess.Board()
        try:
            for tok in MP.parse(g['pgn']): b.push_san(tok)
        except Exception: continue
        rule, words = txt[t]
        out[rule].append({'mode': 'look', 'fen': b.fen(), 'text': words, 'src': 'mine', 'tier': g.get('tier'), 'year': year_of(g.get('end_time')), 'time': g.get('time_class') or '', 'id': 'kl-' + gid})
        if t == 'timevsinsufficient': out['R3C.19'].append(out[rule][-1])
    return out

# ---------------------------------------------------------------- build
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['build', 'parse', 'finish'])
    ap.add_argument('--games', default=''); ap.add_argument('--content', default=os.path.join(ROOT, 'content.json'))
    ap.add_argument('--book', default=os.path.join(ROOT, 'sources', 'endgame-blueprint.md'))
    ap.add_argument('--lichess', default=os.path.join(HERE, 'lichess_examples.json'))
    ap.add_argument('--depth', type=int, default=16); ap.add_argument('--engine', default='/usr/games/stockfish')
    ap.add_argument('--write', action='store_true'); ap.add_argument('--seed', type=int, default=27)
    ap.add_argument('--tries', type=int, default=10, help='candidates checked by Stockfish per rule')
    a = ap.parse_args()
    book = parse_blueprint(a.book)
    book['parts'] = [p for p in book['parts'] if p['id'] != 'T3']
    if a.cmd == 'parse':
        print(json.dumps(book, ensure_ascii=False, indent=1)[:4000]); return
    if a.cmd == 'finish':
        return finish(a, book)
    rng = random.Random(a.seed); t0 = time.time()
    doc = json.load(open(a.content, encoding='utf-8')); L = doc['lists']
    rule_tier = {}
    for p in book['parts']:
        for rid in all_rule_ids({'parts': [p]}): rule_tier[rid] = RULE_TIER.get(p['id'], 2)
    # 1. candidates from his games (no engine yet)
    cands, G = mine_candidates(a.games)
    eg_c = collections.defaultdict(list); mg_c = collections.defaultdict(list)
    for fen, best, line, prev, pfen, meta in cands:
        c = Ctx(fen, best, line, prev, pfen, dict(meta))
        if not c.ok: continue
        grp = 'endgame' if meta['phase'] == 'endgame' else 'middlegame'
        for rule, hits in detect(c, grp).items():
            for mode, claim, reason, fn in hits:
                if mode != 'find': continue
                rec = {'fen': fen, 'best': best, 'line': line, 'prev': prev, 'prev_fen': pfen, 'meta': meta, 'claim': claim, 'reason': reason, 'fn': fn,
                       'kp_trade': c.meta.get('kp_trade'), 'played_san': c.meta.get('played_san')}
                (eg_c if grp == 'endgame' else mg_c)[rule].append(rec)
    play_c = collections.defaultdict(list); seen_pg = set()
    for fen, meta in mine_positions(G):
        b = chess.Board(fen); me = b.turn; c = None
        for rule, dets in E.items():
            for mode, fn, goal in dets:
                if mode != 'play' or (meta['game'], rule) in seen_pg: continue
                try:
                    ok = fn(b, me) if fn.__code__.co_argcount == 2 else bool(fn(c or Ctx(fen, meta={'phase': 'endgame'})))
                except Exception: ok = False
                if not ok: continue
                ev = meta['ev']
                if goal == 'win' and ev < 250: continue
                if goal == 'draw' and abs(ev) > 60: continue
                if goal == 'eval' and not (ev >= 250 or abs(ev) <= 60): continue
                seen_pg.add((meta['game'], rule))
                play_c[rule].append({'fen': fen, 'goal': goal, 'meta': meta, 'fn': fn.__name__})
    looks = mine_endings(G)
    print('candidates', round(time.time() - t0), 's | endgame find', sum(len(v) for v in eg_c.values()), '| play', sum(len(v) for v in play_c.values()),
          '| middlegame', sum(len(v) for v in mg_c.values()), flush=True)
    # 2. Stockfish
    E2 = Eng(a.engine, a.depth); vcache = {}; pcache = {}
    def vfind(r):
        k = (r['fen'], r['best'], r['claim'], r['meta'].get('need'))
        if k not in vcache:
            c = Ctx(r['fen'], r['best'], r['line'], r['prev'], r['prev_fen'], dict(r['meta']))
            if r.get('kp_trade'): c.meta['kp_trade'] = r['kp_trade']
            need = r['claim'] if r['claim'] in ('threat_made', 'threat_parried', 'threat_parried_quiet') else None
            claim = r['claim'] if r['claim'] in ('win', 'draw', 'only') else 'only'
            try:
                v = verify_find(E2, c, claim, need)
                if v:
                    o = E2.an(chess.Board(r['prev_fen']), 1, depth=max(12, a.depth - 4))
                    v['opp'] = {'best': o[0]['pv'][0].uci() if o[0].get('pv') else None, 'pv': [m.uci() for m in o[0].get('pv', [])[:10]], **white(o[0])}
                if v and c.meta.get('threat'): v['threat'] = c.meta['threat']
                vcache[k] = v
            except Exception as e: vcache[k] = None
        return vcache[k]
    def vplay(r):
        if r['fen'] not in pcache:
            try: pcache[r['fen']] = verify_play(E2, r['fen'], r['goal'])
            except Exception: pcache[r['fen']] = None
        return pcache[r['fen']]
    def order(rows, lvl):
        rows = rows[:]; rng.shuffle(rows)
        return sorted(rows, key=lambda r: (abs(r['meta'].get('level', 2) - lvl), {'brilliant': 0, 'great': 1, 'punish': 2, 'missed': 3, 'blunder': 4, 'mistake': 5}.get(r['meta'].get('kind'), 6)))
    used_games = collections.Counter()
    found = collections.defaultdict(list)   # rule -> examples
    def take(rule, rows, lvl, n, kind):
        got, games = [], set()
        for r in order(rows, lvl)[:a.tries * 3]:
            if len(got) >= n: break
            gm = r['meta'].get('game')
            if gm in games: continue
            v = vfind(r) if kind == 'find' else vplay(r)
            if not v: continue
            games.add(gm); got.append((r, v))
        return got
    for rule in sorted(set(list(eg_c) + list(play_c)), key=lambda x: (rule_tier.get(x, 2), x)):
        lvl = rule_tier.get(rule, 2)
        for r, v in take(rule, eg_c.get(rule, []), lvl, 2, 'find'): found[rule].append(('find', r, v))
        if len([x for x in found[rule] if x[0] == 'find']) < 2:
            for r, v in take(rule, play_c.get(rule, []), lvl, 2, 'play'): found[rule].append(('play', r, v))
        else:
            for r, v in take(rule, play_c.get(rule, []), lvl, 1, 'play'): found[rule].append(('play', r, v))
        print('rule', rule, len(found[rule]), '|', E2.calls, 'calls |', round(time.time() - t0), 's', flush=True)
    mg_found = collections.defaultdict(list)
    mg_need = collections.Counter(t['topicId'] for t in L['mgthemes'])
    for topic, rows in mg_c.items():
        lvls = sorted({t['tab'] - 1 for t in L['mgthemes'] if t['topicId'] == topic}) or [2]
        n = 6 * mg_need.get(topic, 1)
        per = max(1, n // len(lvls) + 1)
        for lvl in lvls:
            for r, v in take(topic, rows, lvl, per, 'find'):
                if len(mg_found[topic]) < n and all(x[1]['meta'].get('pid') != r['meta'].get('pid') for x in mg_found[topic]): mg_found[topic].append(('find', r, v))
        print('topic', topic, len(mg_found[topic]), '|', E2.calls, 'calls |', round(time.time() - t0), 's', flush=True)
    # book must-know positions, re-checked
    for p in book['parts']:
        for it in p['positions']:
            for f in it['fens']:
                try:
                    b = chess.Board(f['fen']); i = E2.an(b, 1, depth=max(22, a.depth + 6)); s = pov(i[0], b.turn)
                    f['verdict'] = 'win' if s >= 250 else 'draw' if abs(s) <= 80 else ('loss' if s <= -250 else 'unclear')
                    f['side'] = 'w' if b.turn else 'b'; f['proof'] = 'Stockfish 16, depth ' + str(max(22, a.depth + 6)) + ': ' + ('mate' if abs(s) >= 9000 else '%+.1f' % (s / 100)) + ' for the side to move'
                except Exception as e:
                    f['verdict'] = 'invalid'; f['proof'] = 'not a legal position: ' + str(e)
    E2.close()
    print('engine calls', E2.calls, 'in', round(time.time() - t0), 's', flush=True)
    # 3. the Lichess database examples (made by tools/lichess_examples.py in the workflow)
    LI = {'status': {'ok': False, 'why': 'not run yet'}, 'endgame': {}, 'middlegame': {}}
    if os.path.exists(a.lichess):
        try: LI = json.load(open(a.lichess))
        except Exception: pass
    write_all(a, doc, L, book, found, mg_found, looks, LI, rule_tier)

def threat_words(v, r):
    t = v.get('threat')
    if not t: return ''
    if r.get('claim') == 'threat_made': return ' (If they ignore it, you ' + ('mate' if t == 'mate' else 'win ' + str(t) + ' points') + '.)'
    return ' (If you pass, they ' + ('mate' if t == 'mate' else 'win ' + str(t) + ' points') + '.)'

def ex_source(meta):
    if meta.get('src') == 'lichess':
        return 'Lichess database: a real game, puzzle rated ' + str(meta.get('rating')) + (' (' + str(meta.get('year')) + ')' if meta.get('year') else '')
    return "My game (" + (str(meta.get('time') or 'online')) + ', ' + str(meta.get('year') or '') + ', my rating then ' + str(meta.get('tier') or '') + ')'

def san_line(fen, ucis):
    b = chess.Board(fen); out = []
    for i, u in enumerate(ucis):
        m = chess.Move.from_uci(u)
        if m not in b.legal_moves: break
        if i == 0 or b.turn: out.append((str(b.fullmove_number) + '.') if b.turn else (str(b.fullmove_number) + '...'))
        out.append(b.san(m)); b.push(m)
    return re.sub(r'(\d+\.(\.\.)?) ', r'\1', ' '.join(out))

def write_all(a, doc, L, book, found, mg_found, looks, LI, rule_tier):
    rules = {}
    for p in book['parts']:
        for s in p['sections']:
            if s.get('id'): rules[s['id']] = {'title': s['title'], 'text': ' '.join(s['text'])[:300], 'tag': 'FRAMEWORK', 'part': p['id']}
            for it in s['items']: rules[it['id']] = dict(it, part=p['id'])
        for it in p['concepts']: rules[it['id']] = dict(it, tag='CONCEPT', part=p['id'])
    engine_out = {}; drills = {'endgame': [], 'middlegame': []}; by_rule = collections.defaultdict(list)
    def mk(grp, rule_or_topic, mode, r, v, title, principle):
        meta = r['meta']; src = meta.get('src', 'mine')
        if src == 'lichess': did = ('ldb-' if grp == 'endgame' else 'mg-ldb-') + str(meta['pid'])
        else: did = ('kg-' if grp == 'endgame' else 'mg-kg-') + str(meta['game']) + '-' + str(meta['ply'])
        sol = [r['prev']] + v['line']
        b0 = chess.Board(r['prev_fen']); me = chess.Board(r['fen']).turn
        b1 = b0.copy(); b1.push(chess.Move.from_uci(r['prev']))
        d = {'id': did, 'title': title, 'tag': ('Lichess database' if src == 'lichess' else "Kyenzo's games") + ' · ' + title, 'fen': r['prev_fen'], 'side': 'w' if me else 'b',
             'pgn': san_line(r['prev_fen'], sol), 'ann': {}, 'brief': '', 'principle': principle, 'puzzle_fen': r['prev_fen'], 'solution_moves': sol,
             'source': ex_source(meta) + ('' if src == 'lichess' else ('; in the game I found it' if meta.get('kind') in GOOD else '; in the game I went wrong here' if meta.get('kind') else '')),
             'verified': 'Stockfish 16, depth ' + str(a.depth) + ': the only good move' + (', every move of the line' if len(v['line']) > 1 else ''),
             'rating': meta.get('rating') or {0: 700, 1: 1000, 2: 1400, 3: 1800, 4: 2050}.get(meta.get('level', 2)), 'pieces': len(b1.piece_map()), 'plies': len(sol), 'themes': [],
             'setup': True, 'rule': rule_or_topic, 'reason': r['reason'] + threat_words(v, r), 'src': src,
             'kg': {'game': meta.get('game'), 'ply': meta.get('ply'), 'kind': meta.get('kind'), 'tier': meta.get('tier'), 'played': r.get('played_san')} if src != 'lichess' else {'puzzle': meta.get('pid'), 'rating': meta.get('rating')}}
        engine_out[did] = v.get('engine') or {'setup': r['prev'], 'P0': b1.fen(), 'ours': v['line'], 'legal': True, 'lines': v['lines'], 'after': v['after'], 'opp': v.get('opp') or {'best': None, 'pv': [], 'cp': None, 'mate': None}}
        return d
    # endgame: rule examples (find -> drills; play -> eg-blueprint only)
    eg_ex = collections.defaultdict(list)
    for rule, rows in found.items():
        for mode, r, v in rows:
            if mode == 'find':
                ti = rules.get(rule, {}).get('title', rule)
                d = mk('endgame', rule, 'find', r, v, ti, (rules.get(rule, {}).get('title', '') + '. ' + rules.get(rule, {}).get('text', '')).strip()[:400])
                drills['endgame'].append(d); eg_ex[rule].append({'mode': 'find', 'drill': d['id'], 'src': 'mine', 'reason': r['reason']})
            else:
                m = r['meta']
                eg_ex[rule].append({'mode': 'play', 'id': 'kp-' + str(m['game']) + '-' + str(m['ply']), 'fen': r['fen'], 'side': 'w' if chess.Board(r['fen']).turn else 'b', 'goal': v['goal'],
                                    'eval': v['score'], 'src': 'mine', 'source': ex_source(m), 'mateOnly': r['fn'] in ('p_kqk', 'p_krk', 'p_kbnk', 'p_2b'), 'reason': PLAY_WORDS.get(r['fn'], '')})
    for rule, recs in (LI.get('endgame') or {}).items():
        for rec in recs[:2]:
            if rec.get('claim') == 'threat_made': rec['reason'] = rec['reason'].replace('(If you pass, they ', '(If they ignore it, you ')
            r = {'fen': rec['fen'], 'best': rec['best'], 'line': rec['line'], 'prev': rec['prev'], 'prev_fen': rec['prev_fen'], 'reason': rec['reason'],
                 'meta': {'src': 'lichess', 'pid': rec['pid'], 'rating': rec['rating'], 'level': rating_tier(rec['rating'])}}
            v = {'line': rec['line_ok'], 'lines': rec['engine']['lines'], 'after': rec['engine']['after'], 'engine': rec['engine']}
            ti = rules.get(rule, {}).get('title', rule)
            d = mk('endgame', rule, 'find', r, v, ti, (rules.get(rule, {}).get('title', '') + '. ' + rules.get(rule, {}).get('text', '')).strip()[:400])
            if not any(x['id'] == d['id'] for x in drills['endgame']): drills['endgame'].append(d)
            eg_ex[rule].append({'mode': 'find', 'drill': d['id'], 'src': 'lichess', 'reason': rec['reason']})
    for rule, rows in looks.items():
        for x in rows[:2]: eg_ex[rule].append(dict(x, source=ex_source(dict(x, src='mine'))))
    # middlegame
    lessons = {x['topicId']: x for x in L['courses.middlegame']}
    mg_ex = collections.defaultdict(list)
    for topic, rows in mg_found.items():
        les = lessons.get(topic, {})
        for mode, r, v in rows:
            d = mk('middlegame', topic, 'find', r, v, les.get('title') or topic, les.get('takeaway') or les.get('idea') or '')
            drills['middlegame'].append(d); mg_ex[topic].append(d['id'])
    for topic, recs in (LI.get('middlegame') or {}).items():
        les = lessons.get(topic, {})
        for rec in recs[:4]:
            if rec.get('claim') == 'threat_made': rec['reason'] = rec['reason'].replace('(If you pass, they ', '(If they ignore it, you ')
            r = {'fen': rec['fen'], 'best': rec['best'], 'line': rec['line'], 'prev': rec['prev'], 'prev_fen': rec['prev_fen'], 'reason': rec['reason'],
                 'meta': {'src': 'lichess', 'pid': rec['pid'], 'rating': rec['rating'], 'level': rating_tier(rec['rating'])}}
            v = {'line': rec['line_ok'], 'lines': rec['engine']['lines'], 'after': rec['engine']['after'], 'engine': rec['engine']}
            d = mk('middlegame', topic, 'find', r, v, les.get('title') or topic, les.get('takeaway') or les.get('idea') or '')
            if not any(x['id'] == d['id'] for x in drills['middlegame']): drills['middlegame'].append(d); mg_ex[topic].append(d['id'])
    # de-duplicate drills (one position can serve several rules: the first rule keeps it, the others link to it)
    for grp in ('endgame', 'middlegame'):
        seen = {}; keep = []
        for d in drills[grp]:
            if d['id'] in seen: seen[d['id']].setdefault('rules', [seen[d['id']]['rule']]).append(d['rule']); continue
            seen[d['id']] = d; keep.append(d)
        drills[grp] = keep
    dmap = {d['id']: d for g in drills for d in drills[g]}
    # themes and lesson steps
    base = {d['id']: d for d in L['endgame'] if not re.match(r'^(lc|kg|ldb)-', d['id'])}
    les_eg = {x['id']: x for x in L['courses.endgame']}
    report = ['# Course examples (tools/course_examples.py, 9.77.0)', '']
    for th in L['egthemes']:
        cov = []
        for x in th.get('covers') or []:
            if x.startswith('fw:'):
                n_ = x[3:]; cov.append('F' + n_)
                if n_ == '0.3': cov += ['L0.' + str(i) for i in range(1, 6)]
                if n_ == '0.4': cov += ['D0.' + str(i) for i in range(1, 8)]
            else: cov.append(x)
        bp = ['bp-' + x.lower().replace('.', '-') for x in cov if re.match(r'^P\d', x)]
        if 'R1.18' in cov or 'R3A.5' in cov: bp += ['th-rvp-cut-' + str(i) for i in range(1, 6)]
        if 'R1.13' in cov or 'R1.14' in cov or 'R3A.11' in cov: bp += ['th-qvp-7th-' + str(i) for i in range(1, 6)]
        book_ids = [x for x in [th.get('anchorId')] + (th.get('simpleIds') or []) + (th.get('hardIds') or []) if x in base]
        book_ids += [x for x in bp if x in base and x not in book_ids]
        ex = []
        for rid in cov:
            for e in eg_ex.get(rid, []):
                if e['mode'] == 'find' and e['drill'] not in ex: ex.append(e['drill'])
        ex.sort(key=lambda i: (dmap[i]['rating'] or 0))
        pool = book_ids + [i for i in ex if i not in book_ids]
        th['anchorId'] = pool[0] if pool else ''
        rest = pool[1:]
        half = (len(rest) + 1) // 2
        th['simpleIds'] = rest[:half][:6]; th['hardIds'] = rest[half:][:6]
        for i in [th['anchorId']] + th['simpleIds'] + th['hardIds']:
            if i in dmap: dmap[i].update({'topicId': th['topicId'], 'topic': th.get('topic') or th['title'], 'chap': th.get('chap'), 'lvl': th['lvl'], 'requiredTier': th.get('requiredTier', 0)})
        les = les_eg.get(th.get('lessonId'))
        if les is not None:
            steps = []; ids = [th['anchorId']] + th['simpleIds'] + th['hardIds']; ids = [i for i in ids if i]
            for n, i in enumerate(ids):
                d = dmap.get(i) or base.get(i)
                if not d: continue
                side = SIDE[(d.get('side', 'w') == 'w')]
                if i in dmap:
                    r = rules.get(d['rule'], {})
                    pr = 'Example ' + str(n + 1) + ' of ' + str(len(ids)) + ' · ' + d['rule'] + ' ' + r.get('title', '') + '. ' + side + ' to play after the opponent\'s last move. ' + ex_source({'src': d['src'], 'rating': d['kg'].get('rating'), 'time': '', 'year': '', 'tier': d['kg'].get('tier')}).split(':')[0] + '.'
                else:
                    old = next((s for s in les.get('steps') or [] if s.get('ref') == i), None)
                    pr = old['prompt'] if old else 'Position ' + str(n + 1) + ' of ' + str(len(ids)) + '.'
                steps.append({'ref': i, 'prompt': pr, **({'primary': True} if n == 0 else {})})
            les['steps'] = steps
        report.append('- ' + th['id'] + ': ' + str(len(ex)) + ' examples for ' + ', '.join(cov))
    les_mg = {x['id']: x for x in L['courses.middlegame']}
    for th in L['mgthemes']:
        pool = [i for i in mg_ex.get(th['topicId'], []) if i in dmap]
        lvl = th['tab'] - 1
        pool.sort(key=lambda i: (abs(rating_tier(dmap[i]['rating']) - lvl), dmap[i]['rating'] or 0))
        same = [t for t in L['mgthemes'] if t['topicId'] == th['topicId']]
        if len(same) > 1:
            k = sorted(same, key=lambda t: t['tab']).index(th); pool = pool[k::len(same)]
        pool = sorted(pool[:7], key=lambda i: dmap[i]['rating'] or 0)
        th['anchorId'] = pool[0] if pool else ''
        rest = pool[1:]; half = (len(rest) + 1) // 2
        th['simpleIds'] = rest[:half]; th['hardIds'] = rest[half:]
        for i in pool: dmap[i].update({'topicId': th['topicId'], 'topic': th.get('topic') or th['title'], 'chap': th.get('chap'), 'lvl': th['lvl'], 'requiredTier': th.get('requiredTier', 0), 'themeId': th['id']})
        les = les_mg.get(th.get('lessonId'))
        if les is not None:
            les['steps'] = [{'ref': i, 'prompt': 'Example ' + str(n + 1) + ' of ' + str(len(pool)) + ': ' + SIDE[dmap[i]['side'] == 'w'] + ' to play. ' +
                             'M: what did their last move do? S: ' + (les.get('idea') or '').split('.')[0] + '. P: your checks, captures and attacks: which one supports that plan? C: check it against their best reply.',
                             **({'primary': True} if n == 0 else {})} for n, i in enumerate(pool)]
        report.append('- ' + th['id'] + ' (' + th['topicId'] + '): ' + str(len(pool)) + ' examples')
    # the drills of themes nobody uses go
    used = {i for t in L['egthemes'] + L['mgthemes'] for i in [t.get('anchorId')] + (t.get('simpleIds') or []) + (t.get('hardIds') or []) if i}
    for grp in ('endgame', 'middlegame'):
        old = [d for d in L[grp] if not re.match(r'^(lc|mg-lc|kg|mg-kg|ldb|mg-ldb)-', d['id'])]
        L[grp] = old + [d for d in drills[grp] if d['id'] in used or (grp == 'endgame' and any(e.get('drill') == d['id'] for x in eg_ex.values() for e in x))]
    # data/eg-blueprint.json: the book with its examples
    ids_in = {d['id'] for d in L['endgame']}
    def attach(it):
        rid = it['id']; xs = []
        for e in eg_ex.get(rid, []):
            if e['mode'] == 'find' and e['drill'] not in ids_in: continue
            if e['mode'] == 'find':
                d = dmap[e['drill']]
                xs.append({'mode': 'find', 'id': d['id'], 'fen': d['fen'], 'solution': d['solution_moves'], 'side': d['side'], 'reason': e['reason'], 'source': d['source'], 'src': d['src'], 'rating': d['rating']})
            else: xs.append(e)
        seen_ = set(); xs = [x for x in xs if not ((x.get('id') or x.get('fen')) in seen_ or seen_.add(x.get('id') or x.get('fen')))]
        if xs: it['examples'] = xs[:5]
    for p in book['parts']:
        for s in p['sections']:
            if s.get('id'): attach(s)
            for it in s['items']: attach(it)
        for it in p['concepts']: attach(it)
    book['v'] = '9.77.0'; book['note'] = 'Built by tools/course_examples.py: every example found on the board by a test for its rule and checked by Stockfish 16.'
    book['lichess'] = LI.get('status', {})
    missing = [rid for rid in rules if not eg_ex.get(rid)]
    report += ['', '## Rules with examples: ' + str(len([r for r in rules if eg_ex.get(r)])) + ' of ' + str(len(rules)), '', 'Without an example (no board test, or nothing passed Stockfish): ' + ', '.join(missing), '',
               'Lichess database: ' + json.dumps(LI.get('status', {}))]
    print('\n'.join(report[-6:]))
    if not a.write: print('dry run'); return
    open(a.content, 'w', encoding='utf-8').write(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
    ce = os.path.join(HERE, 'course_engine.json')
    eng = json.load(open(ce)) if os.path.exists(ce) else {}
    eng = {k: v for k, v in eng.items() if not re.match(r'^(lc|mg-lc|kg|mg-kg|ldb|mg-ldb)-', k)}; eng.update(engine_out)
    json.dump(eng, open(ce, 'w'))
    json.dump(book, open(os.path.join(ROOT, 'data', 'eg-blueprint.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(HERE, 'course_examples.md'), 'w').write('\n'.join(report) + '\n')

def finish(a, book):
    """after tools/course_truth.mjs: the rule / lesson leads the texts of the example drills (course_truth's motif texts stay as the facts)"""
    doc = json.load(open(a.content, encoding='utf-8')); L = doc['lists']
    rules = {}
    for p in book['parts']:
        for s_ in p['sections']:
            if s_.get('id'): rules[s_['id']] = {'title': re.sub(r'^\d\.\d\s*', '', s_['title']), 'text': ' '.join(s_['text'])}
            for it in s_['items']: rules[it['id']] = it
        for it in p['concepts']: rules[it['id']] = it
    les = {x['topicId']: x for x in L['courses.middlegame']}
    n = 0
    for grp in ('endgame', 'middlegame'):
        for d in L[grp]:
            if not re.match(r'^(kg|mg-kg|ldb|mg-ldb)-', d['id']) or not d.get('rule'): continue
            n += 1
            if grp == 'endgame':
                r = rules.get(d['rule'], {}); t = re.sub(r'\*', '', r.get('title', '')); tx = re.sub(r'^[—–-]\s*', '', re.sub(r'\*', '', r.get('text', '')))
                d['principle'] = (d['rule'] + ' · ' + t + '. ' + tx).strip()[:420]
                d['alarm_signal'] = 'Alarm Signal · ' + d['rule'] + ' ' + t + ': ' + (tx.split('. ')[0] if tx else t) + '.'
                hint = ' Rule ' + d['rule'] + ': ' + t + '.'
            else:
                l = les.get(d['rule'], {}); P_line = next((x['t'] for x in l.get('debrief') or [] if x.get('k') == 'P'), '')
                d['principle'] = l.get('takeaway') or l.get('idea') or d.get('principle', '')
                d['alarm_signal'] = 'Alarm Signal · ' + (l.get('title') or '') + ': ' + (l.get('idea') or '').split(';')[0].split('. ')[0] + '.'
                hint = ' Plan: ' + (l.get('idea') or '').split(';')[0].split('. ')[0] + '. Then your checks, captures and attacks: which one supports it?'
                m = d.get('ms_pc_breakdown') or {}
                if P_line and not (m.get('P') or '').startswith('The plan of this lesson'):
                    m['P'] = 'The plan of this lesson: ' + re.sub(r'\s+', ' ', P_line.split('\n')[0]).strip() + ' ' + (m.get('P') or '')
                try:
                    b = chess.Board(d['fen']); b.push(chess.Move.from_uci(d['solution_moves'][0]))
                    st = [name for sid, name, test, kw in MP.STRUCTURES if test(b, b.turn) and sid != 'queenless']
                    if st and not (m.get('S') or '').startswith('Structure:'): m['S'] = 'Structure: ' + '; '.join(st) + '. ' + (m.get('S') or '')
                except Exception: pass
                if m: d['ms_pc_breakdown'] = m
            if hint.strip() not in (d.get('brief') or ''): d['brief'] = (d.get('brief') or '').rstrip() + hint
            ex = d.get('explanation') or ''
            if d.get('reason') and d['reason'] not in ex: d['explanation'] = (ex + ' ' + d['reason']).strip()
            if d.get('kg', {}).get('played') and 'In my game I played' not in d['explanation']:
                d['explanation'] += ' In my game I played ' + d['kg']['played'] + ' instead.'
    # a drill whose texts tools/course_truth.mjs could not write (its claim check failed) goes, with every link to it
    bad = {d['id'] for g in ('endgame', 'middlegame') for d in L[g] if re.match(r'^(kg|mg-kg|ldb|mg-ldb)-', d['id']) and not d.get('ms_pc_breakdown')}
    if bad:
        for g in ('endgame', 'middlegame'): L[g] = [d for d in L[g] if d['id'] not in bad]
        for t in L['egthemes'] + L['mgthemes']:
            t['simpleIds'] = [x for x in t.get('simpleIds') or [] if x not in bad]; t['hardIds'] = [x for x in t.get('hardIds') or [] if x not in bad]
            if t.get('anchorId') in bad:
                rest = t['simpleIds'] + t['hardIds']; t['anchorId'] = rest[0] if rest else ''
                if rest: (t['simpleIds'] if t['simpleIds'] and t['simpleIds'][0] == rest[0] else t['hardIds']).remove(rest[0])
        for l in L['courses.endgame'] + L['courses.middlegame']:
            if l.get('steps'): l['steps'] = [x for x in l['steps'] if x.get('ref') not in bad]
        bp = os.path.join(ROOT, 'data', 'eg-blueprint.json')
        if os.path.exists(bp):
            B = json.load(open(bp, encoding='utf-8'))
            for p_ in B['parts']:
                for it in [s_ for s_ in p_['sections']] + [i for s_ in p_['sections'] for i in s_['items']] + p_['concepts']:
                    if it.get('examples'): it['examples'] = [x for x in it['examples'] if x.get('id') not in bad]
            json.dump(B, open(bp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        print('dropped', len(bad), 'drills whose texts failed the check:', ', '.join(sorted(bad)))
    open(a.content, 'w', encoding='utf-8').write(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
    print('finished', n, 'example drills')

PLAY_WORDS = {
    'p_mat_draw': 'You are material down, but there is no Wincondition for them: hold it.', 'p_philidor': 'Philidor: the third-rank defence holds.',
    'p_wrongb': 'The wrong bishop: the defending king in the corner holds.', 'p_rvminor0': 'Rook against a minor piece without pawns: the defender holds.',
    'p_ocb_draw': 'Opposite-coloured bishops: a pawn or two down is usually still a draw.', 'p_kqk': 'Mate with the queen: build the box.', 'p_krk': 'Mate with the rook: cut, approach, check.',
    'p_rookpawn_draw': 'The rook pawn: the corner draws.', 'p_keysq': 'The king on a key square of its pawn: it wins whoever moves.', 'p_qvp7': 'Queen against a pawn on the 7th.',
    'p_lucena': 'Lucena: build the bridge.', 'p_connected6': 'Two connected passed pawns far up the board against a rook.', 'p_backrank': 'The passive back-rank defence loses against this pawn.',
    'p_samewing': 'Pawns on one wing only, one pawn up in a rook ending: usually a draw.', 'p_rook_down': 'A pawn down in a rook ending: activity holds it.',
    'p_badbishop': 'Their bishop is bad: its pawns are fixed on its colour.', 'p_bvn_wings': 'Bishop against knight with pawns on both wings: the bishop is better.',
    'p_nvb_onewing': 'Knight against bishop with all pawns on one wing.', 'p_ocb_heavy': 'Opposite bishops with heavy pieces favour the attacker.', 'p_vancura': 'Vančura: attack the rook pawn from the side.',
    'p_g7h7': 'Rook pawn on the 7th with the rook in front: where the defending king stands decides.', 'p_rule5': 'The defending king is cut off by files: the Rule of Five.',
    'p_r2p': 'Rook and two pawns against a rook.', 'p_qr': 'Queen against rook: a win.', 'p_qrp': 'Queen against rook and pawn.', 'p_kbnk': 'Mate with bishop and knight.', 'p_2b': 'Mate with two bishops.',
    'p_2nvp': 'Two knights against a pawn.', 'p_2bvn': 'Two bishops against a knight.', 'p_nvrp7': 'Knight against a rook pawn on the 7th.', 'p_rbvr': 'Rook and bishop against rook.',
    'p_rnvr': 'Rook and knight against rook: a draw.', 'p_qv2m': 'Queen against two minor pieces.', 'p_bpvb': 'Bishop and pawn against a same-coloured bishop.', 'p_npvn': 'Knight and pawn against knight.',
    'p_q2r': 'Queen against two rooks.', 'p_exchange_up': 'Up the exchange with pawns on the board.', 'p_rook_down2': 'Two pawns down in a rook ending: activity can outweigh them.',
    'p_r_vs_passers': 'Rook against connected passed pawns.', 'p_nvbadb': 'Good knight against a bad bishop.', 'p_ocb_win': 'Opposite bishops with two passed pawns far apart: the winning recipe.',
    'd_outside_vs_prot': 'Outside passed pawn against protected passed pawn.',
}

if __name__ == '__main__':
    main()
