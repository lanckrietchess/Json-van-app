#!/usr/bin/env python3
# tools/endgame_theory.py (9.72.0): textbook endgame drills, every position proven by Stockfish (no position from memory).
#
#   python3 tools/endgame_theory.py content.json [--per 5] [--depth 20] [--seed 7] [--write]
#
# For each theme below the tool sets up random positions of that kind, keeps only those where Stockfish (depth --depth,
# 2 lines) finds exactly ONE move that keeps the result (the second best changes a win into a draw, or a draw into a loss),
# checks the theme's own condition on that move, and writes a drill to lists.endgame (ids th-<theme>-<n>) in the existing
# topic of that kind (Rook endings, Queen endings), with the solution line from Stockfish's principal variation.
# The texts are the theme's rule plus facts the tool proved for that position (only move, result, the defender's best
# reply); nothing else is claimed. Re-running replaces the th-* drills.
import argparse, json, random, sys
import chess, chess.engine

THEMES = {
    'rvp-cut': {
        'title': 'Rook against pawn: cut the king off',
        'topicId': 'eg-bp-rook', 'topic': 'Rook endings', 'chap': 'eg-ch-rook', 'tag': 'Endgame theory · Rook against pawn',
        'brief': 'White to move. Your rook against their pawn, with their king close to it and your king far away.',
        'principle': 'Rook against pawn: cut their king off from the pawn along a rank or a file, then win the pawn with rook and king together.',
        'why': 'The only winning move. Every other move lets their king escort the pawn far enough to draw.',
        'alarm': 'Alarm Signal: rook against a lone pawn. Before you chase the pawn, ask which rank or file keeps their king away from it.',
        'res': 'win',
    },
    'qvp-7th': {
        'title': 'Queen against a pawn on the seventh',
        'topicId': 'eg-bp-queen', 'topic': 'Queen endings', 'chap': 'eg-ch-queen', 'tag': 'Endgame theory · Queen against pawn',
        'brief': 'White to move. Their pawn is one step from queening and their king protects it; your king is far away.',
        'principle': 'Queen against a pawn on the seventh: with checks and pins, force their king in front of its own pawn, then use that free move to bring your king one step closer. Repeat.',
        'why': 'The only winning move. Every other move lets the pawn queen or gives a draw.',
        'alarm': 'Alarm Signal: queen against a pawn on the seventh. Do not hurry: every time their king blocks its own pawn, your king gets a free move.',
        'res': 'win',
    },
}

def rnd_sq(rng, files='abcdefgh', ranks='12345678'):
    return chess.parse_square(rng.choice(files) + rng.choice(ranks))

def sq(f, r):
    return chess.square(f, r) if 0 <= f <= 7 and 0 <= r <= 7 else None

def setup(theme, rng):
    b = chess.Board(None)
    if theme == 'rvp-cut':
        pf = rng.choice('bcdefg'); pr = rng.choice('345')
        p = chess.parse_square(pf + pr)
        bk = sq(chess.square_file(p) + rng.choice([-1, 0, 1]), chess.square_rank(p) + rng.choice([0, 1]))
        if bk is None: return None
        wk = rnd_sq(rng, ranks='5678')
        wr = rnd_sq(rng)
        b.set_piece_at(p, chess.Piece(chess.PAWN, chess.BLACK))
        b.set_piece_at(bk, chess.Piece(chess.KING, chess.BLACK))
        b.set_piece_at(wk, chess.Piece(chess.KING, chess.WHITE))
        b.set_piece_at(wr, chess.Piece(chess.ROOK, chess.WHITE))
    else:
        pf = rng.choice('bdeg')
        p = chess.parse_square(pf + '2')
        bk = sq(chess.square_file(p) + rng.choice([-1, 0, 1]), rng.choice([0, 1, 2]))
        if bk is None: return None
        wk = rnd_sq(rng, ranks='678')
        wq = rnd_sq(rng, ranks='45678')
        b.set_piece_at(p, chess.Piece(chess.PAWN, chess.BLACK))
        b.set_piece_at(bk, chess.Piece(chess.KING, chess.BLACK))
        b.set_piece_at(wk, chess.Piece(chess.KING, chess.WHITE))
        b.set_piece_at(wq, chess.Piece(chess.QUEEN, chess.WHITE))
    b.turn = chess.WHITE
    if len(set(b.piece_map())) != 4 or not b.is_valid() or b.is_check() or b.was_into_check():
        return None
    return b

def score(info, b):
    s = info['score'].pov(b.turn)
    return s.score(mate_score=100000)

def judge(theme, b, eng, depth):
    info = eng.analyse(b, chess.engine.Limit(depth=depth), multipv=2)
    if len(info) < 2: return None
    s1, s2 = score(info[0], b), score(info[1], b)
    mv = info[0]['pv'][0]
    if not (s1 >= 500 and s2 <= 80): return None                 # exactly one winning move, the rest draw (or lose)
    if theme == 'rvp-cut':
        if b.piece_type_at(mv.from_square) != chess.ROOK or b.is_capture(mv) or b.gives_check(mv): return None
    if theme == 'qvp-7th':
        if b.piece_type_at(mv.from_square) != chess.QUEEN or b.is_capture(mv): return None
    pv = info[0]['pv'][:5]
    return {'move': mv, 'pv': pv, 's1': s1, 's2': s2, 'second': b.san(info[1]['pv'][0])}

def drill(theme, n, b, r, lvl):
    T = THEMES[theme]
    g = b.copy(); sans = []
    for m in r['pv']:
        sans.append(g.san(m)); g.push(m)
    pgn = []
    for i, s in enumerate(sans):
        pgn.append(('%d.' % (i // 2 + 1) + s) if i % 2 == 0 else s)
    first = sans[0]
    fen = b.fen()
    return {
        'id': 'th-%s-%d' % (theme, n), 'title': T['title'], 'tag': T['tag'], 'fen': fen, 'side': 'w', 'pgn': ' '.join(pgn),
        'ann': {'1.' + first: {'note': T['why'] + ' (Stockfish: %s is the only win; %s already lets it slip.)' % (first, r['second'])}},
        'brief': T['brief'], 'principle': T['principle'], 'topicId': T['topicId'], 'topic': T['topic'], 'chap': T['chap'],
        'lvl': lvl, 'requiredTier': 0 if lvl == 1 else 2, 'puzzle_fen': fen, 'solution_moves': [m.uci() for m in r['pv']],
        'source': 'Endgame theory (textbook position type), proven by Stockfish 19', 'verified': 'python-chess: legal; Stockfish: only winning move',
        'rating': None, 'pieces': 4, 'plies': len(r['pv']), 'themes': [], 'setup': False, 'description': T['brief'],
        'explanation': T['principle'] + ' ' + T['why'], 'alarm_signal': T['alarm'],
        'ms_pc_breakdown': {
            'M': 'No last move to read: the position itself is the question. Count how many moves their king needs to escort the pawn, and how many your pieces need to stop it.',
            'S': T['principle'],
            'P': 'Your forcing moves first, then the quiet one that takes away their king\'s path. Here only %s wins.' % first,
            'C': 'Calculate their best defence to the end: after %s Stockfish\'s line is %s.' % (first, ' '.join(pgn)),
        },
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('content'); ap.add_argument('--per', type=int, default=5); ap.add_argument('--depth', type=int, default=20)
    ap.add_argument('--seed', type=int, default=7); ap.add_argument('--tries', type=int, default=400)
    ap.add_argument('--engine-cmd', default='node engine/stockfish-19-lite-single.js'); ap.add_argument('--write', action='store_true')
    a = ap.parse_args()
    rng = random.Random(a.seed)
    eng = chess.engine.SimpleEngine.popen_uci(a.engine_cmd.split()); eng.configure({'Hash': 64})
    out = []
    try:
        for theme in THEMES:
            got, seen = 0, set()
            for _ in range(a.tries):
                if got >= a.per: break
                b = setup(theme, rng)
                if b is None or b.board_fen() in seen: continue
                seen.add(b.board_fen())
                r = judge(theme, b, eng, 12)                    # a quick filter first, then the real depth
                if not r: continue
                r = judge(theme, b, eng, a.depth)
                if not r: continue
                got += 1
                lvl = [2, 2, 3, 3, 4, 4][min(got - 1, 5)]
                out.append(drill(theme, got, b, r, lvl))
                print(theme, got, b.fen(), b.san(r['move']), r['s1'], r['s2'], flush=True)
    finally:
        eng.quit()
    if a.write:
        doc = json.load(open(a.content, encoding='utf-8'))
        eg = [d for d in doc['lists']['endgame'] if not str(d.get('id', '')).startswith('th-')]
        doc['lists']['endgame'] = eg + out
        open(a.content, 'w', encoding='utf-8').write(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
        print('written', len(out), 'drills')

if __name__ == '__main__':
    main()
