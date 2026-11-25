#!/usr/bin/env python3
# tools/middlegame_plans.py (9.72.0): which middlegame structures Kyenzo reaches in his own games, how he scores in them,
# and whether the middlegame course already has a lesson for that structure.
#
#   python3 tools/middlegame_plans.py --games DIR_WITH_games-*.json [--content content.json] [--md tools/middlegame_report.md]
#
# The structure is read from the board at move 15 (ply 30) of every game that is still in the middlegame there (queens or
# at least 4 minor/major pieces each). Every rule is a pure pawn / king test, listed in STRUCTURES; a game can have several.
# The report is the to-do list for the middlegame courses: a frequent structure without a lesson is a gap.
import argparse, collections, glob, json, os, re
import chess

def pawns(b, c): return b.pieces(chess.PAWN, c)
def files(sqs): return {chess.square_file(s) for s in sqs}
def has(b, c, name): return b.piece_at(chess.parse_square(name)) == chess.Piece(chess.PAWN, c)

def iqp(b, c):
    P = pawns(b, c); F = files(P)
    d = [s for s in P if chess.square_file(s) == 3]
    return bool(d) and 2 not in F and 4 not in F

def hanging(b, c):
    P = pawns(b, c); F = files(P)
    return 2 in F and 3 in F and 1 not in F and 4 not in F

def carlsbad(b, c):
    o = not c
    return (has(b, o, 'd5' if c else 'd4') and has(b, o, 'c6' if c else 'c3') and has(b, c, 'd4' if c else 'd5')
            and 2 not in files(pawns(b, c)) and 4 not in files(pawns(b, o)))

def chain_e5(b, c):   # White pawns d4 + e5 against Black e6 + d5 (Advance Caro / French chain)
    return has(b, chess.WHITE, 'e5') and has(b, chess.WHITE, 'd4') and has(b, chess.BLACK, 'e6') and has(b, chess.BLACK, 'd5')

def half_open_f(b, c):
    return 5 not in files(pawns(b, c)) and 5 in files(pawns(b, not c))

def opposite_castled(b, c):
    kw, kb = b.king(chess.WHITE), b.king(chess.BLACK)
    if kw is None or kb is None: return False
    fw, fb = chess.square_file(kw), chess.square_file(kb)
    return (fw <= 2 and fb >= 5) or (fw >= 5 and fb <= 2)

def stonewall(b, c):
    return has(b, chess.WHITE, 'd4') and has(b, chess.WHITE, 'e3') and has(b, chess.WHITE, 'f4') or \
           has(b, chess.BLACK, 'd5') and has(b, chess.BLACK, 'e6') and has(b, chess.BLACK, 'f5')

def doubled_g(b, c):
    return sum(1 for s in pawns(b, c) if chess.square_file(s) == 6) >= 2 and 7 not in files(pawns(b, c))

def open_center(b, c):
    return not any(chess.square_file(s) in (3, 4) for s in pawns(b, chess.WHITE) | pawns(b, chess.BLACK))

def queenless(b, c):
    return not b.pieces(chess.QUEEN, chess.WHITE) and not b.pieces(chess.QUEEN, chess.BLACK)

def minority(b, c):   # Carlsbad with the queenside pawns still there: the minority attack is on
    return carlsbad(b, c) and len([s for s in pawns(b, c) if chess.square_file(s) in (0, 1)]) >= 2

STRUCTURES = [
    ('iqp-mine', 'You have the isolated queen\'s pawn', iqp, ['isolani', 'isolated', 'iqp']),
    ('iqp-theirs', 'They have the isolated queen\'s pawn', lambda b, c: iqp(b, not c), ['isolani', 'isolated', 'iqp', 'blockade']),
    ('hanging-mine', 'You have hanging pawns (c + d)', hanging, ['hanging']),
    ('hanging-theirs', 'They have hanging pawns (c + d)', lambda b, c: hanging(b, not c), ['hanging']),
    ('carlsbad', 'Carlsbad structure (you have d4 against their d5 + c6, or the mirror)', carlsbad, ['carlsbad', 'minority', 'exchange slav', 'exchange']),
    ('minority', 'Carlsbad with your queenside pawns: the minority attack', minority, ['minority']),
    ('chain-e5', 'Pawn chain d4-e5 against e6-d5 (Advance Caro / French)', chain_e5, ['advance', 'chain', 'french']),
    ('f-file', 'Half-open f-file for you (the f-pawn was exchanged)', half_open_f, ['f-file', 'f4', 'vienna', 'kingside attack']),
    ('opposite', 'Kings castled on opposite wings: pawn storms', opposite_castled, ['opposite', 'pawn storm', 'storm']),
    ('stonewall', 'Stonewall (d4-e3-f4 or d5-e6-f5)', stonewall, ['stonewall']),
    ('doubled-g', 'Doubled g-pawns after ...hxg6 / Bxg6 recaptures', doubled_g, ['doubled g', 'nxg6', 'g-pawns']),
    ('open-centre', 'Open centre (no d- or e-pawns left)', open_center, ['open centre', 'open center', 'bishop pair']),
    ('queenless', 'Queenless middlegame (queens traded by move 15)', queenless, ['queenless', 'endgame', 'without queens']),
]

def parse(pgn):
    body = pgn.split('\n\n', 1)[1] if '\n\n' in pgn else pgn
    body = re.sub(r'\{[^}]*\}', '', body); body = re.sub(r'\d+\.\.\.', '', body); body = re.sub(r'\d+\.', '', body)
    return [t for t in body.split() if t not in ('1-0', '0-1', '1/2-1/2', '*')]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--games', required=True); ap.add_argument('--content', default='content.json')
    ap.add_argument('--md', default='tools/middlegame_report.md'); ap.add_argument('--ply', type=int, default=30)
    a = ap.parse_args()
    G = []
    for f in sorted(glob.glob(os.path.join(a.games, 'games-*.json'))): G += json.load(open(f))
    stat = collections.defaultdict(lambda: collections.Counter())
    fam = collections.defaultdict(collections.Counter)
    n_mid = 0
    for g in G:
        b = chess.Board(); ok = True
        for t in parse(g['pgn'])[:a.ply]:
            try: b.push_san(t)
            except Exception: ok = False; break
        if not ok or b.ply() < a.ply: continue
        c = chess.WHITE if g['color'] == 'w' else chess.BLACK
        if sum(len(b.pieces(p, c)) for p in (chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN)) < 4: continue
        n_mid += 1
        first = ' '.join(parse(g['pgn'])[:2])
        for sid, name, test, kw in STRUCTURES:
            if test(b, c):
                stat[sid][g['result']] += 1
                fam[sid][('White ' if g['color'] == 'w' else 'Black ') + first] += 1
    doc = json.load(open(a.content, encoding='utf-8'))
    L = doc.get('lists', {})
    course = json.dumps([L.get('courses.middlegame', []), L.get('mgthemes', []), L.get('middlegame', []), doc.get('middlegameMasterclass', {})], ensure_ascii=False).lower()
    rows = []
    for sid, name, test, kw in STRUCTURES:
        s = stat[sid]; n = sum(s.values())
        if not n: continue
        score = (s['win'] + 0.5 * s['draw']) / n
        hit = [k for k in kw if k in course]
        rows.append((n, sid, name, score, hit, fam[sid].most_common(3)))
    rows.sort(reverse=True)
    out = ['# Middlegame structures in Kyenzo\'s games', '',
           f'{len(G)} games, {n_mid} still in the middlegame at move {a.ply // 2}. Structure read at move {a.ply // 2}; a game can count for several.', '',
           '| Structure | Games | Kyenzo scores | Words found in the middlegame course | Most often from |', '|---|---:|---:|---|---|']
    for n, sid, name, score, hit, top in rows:
        out.append(f'| {name} | {n} | {score * 100:.0f}% | {", ".join(hit) if hit else "**none: no lesson yet**"} | {"; ".join(f"{k} ({v})" for k, v in top)} |')
    out += ['', 'The word test is shallow on purpose: a word found means the course talks about it somewhere, not that it has a full lesson.',
            'The middlegame chapters before 9.72.0 were written for the Colle-Koltanowski, the Caro-Kann and the Semi-Slav, so every row that',
            'comes mostly from "White e4 ..." (the Vienna and the other 1.e4 lines) still needs its own White 1.e4 lesson, whatever the word test says.']
    open(a.md, 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print('\n'.join(out))

if __name__ == '__main__':
    main()
