#!/usr/bin/env python3
"""Kyenzo's opening positions (LC100, 9.65.0): how often Kyenzo reached a position in his own rated games, his score from there and what
was played next, for the Theory counter ("Kyenzo reached this position 37 times").

Reads the games files that tools/master_games.py writes (master/data/games-YYYY-H.json) and writes master/data/positions.json:
  {"v": 1, "built": <unix>, "games": <n>, "plies": 30, "min": 2,
   "pos": {"<key>": [n, wins, draws, losses, ["<game id>", ...up to 3], [["<san>", n], ...up to 4]]}}
<key> is the FNV-1a 32-bit hash (8 hex digits) of the first three FEN fields (board, side to move, castling) after a move, so the app
finds a position from any move order. Wins / draws / losses are from Kyenzo's side. Only positions within the first 30 plies that he
reached at least twice are kept. No opponent names: only game ids, which the app opens through mg_game_moves (moves only).

  python3 tools/master_positions.py master/data            write master/data/positions.json
  python3 tools/master_positions.py --self-test             check the hash and the counting
The workflow "Kyenzo's Games (analysis)" runs it in its publish step, so positions.json lands on the branch master-data with the games."""
import io, json, os, re, sys, time

PLIES, MIN = 30, 2


def fnv(s):
    h = 0x811c9dc5
    for b in s.encode('utf-8'):
        h ^= b
        h = (h * 0x01000193) & 0xffffffff
    return '%08x' % h


def key_of(fen):
    return fnv(' '.join(fen.split(' ')[:3]))


def build(games):
    import chess.pgn
    idx = {}
    n = 0
    for g in games:
        pgn = g.get('pgn') or ''
        try:
            gm = chess.pgn.read_game(io.StringIO(pgn))
        except Exception:
            gm = None
        if not gm:
            continue
        n += 1
        res = g.get('result')
        col = 1 if res == 'win' else 2 if res == 'draw' else 3
        b = gm.board()
        moves = list(gm.mainline_moves())
        for i, mv in enumerate(moves[:PLIES]):
            b.push(mv)
            k = key_of(b.fen())
            e = idx.get(k)
            if e is None:
                e = idx[k] = [0, 0, 0, 0, [], {}]
            e[0] += 1
            e[col] += 1
            gid = str(g.get('id') or '')
            if gid and len(e[4]) < 3 and gid not in e[4]:
                e[4].append(gid)
            if i + 1 < len(moves):
                san = b.san(moves[i + 1])
                e[5][san] = e[5].get(san, 0) + 1
    out = {}
    for k, e in idx.items():
        if e[0] < MIN:
            continue
        nxt = sorted(e[5].items(), key=lambda x: (-x[1], x[0]))[:4]
        out[k] = [e[0], e[1], e[2], e[3], e[4], [[s, c] for s, c in nxt]]
    return {'v': 1, 'built': int(time.time()), 'games': n, 'plies': PLIES, 'min': MIN, 'pos': out}


def load(folder):
    games = []
    for f in sorted(os.listdir(folder)):
        if re.match(r'games-\d{4}(-[12])?\.json$', f):
            with open(os.path.join(folder, f)) as fh:
                d = json.load(fh)
            games.extend(d if isinstance(d, list) else [])
    return games


def self_test():
    assert fnv('') == '811c9dc5', fnv('')
    assert fnv('a') == 'e40c292c', fnv('a')
    start_after_e4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    assert key_of(start_after_e4) == key_of('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'), 'the en-passant field is ignored'
    games = [{'id': '1', 'result': 'win', 'pgn': '1. e4 e5 2. Nf3 Nc6 1-0'}, {'id': '2', 'result': 'loss', 'pgn': '1. e4 c6 2. d4 d5 0-1'},
             {'id': '3', 'result': 'draw', 'pgn': '1. e4 e5 2. Bc4 Nf6 1/2-1/2'}, {'id': '4', 'result': 'win', 'pgn': '[White "Someone"]\n\n1. Nf3 e5 1-0'}]
    r = build(games)
    e4 = r['pos'][key_of(start_after_e4)]
    assert e4[:4] == [3, 1, 1, 1], e4
    assert e4[4] == ['1', '2', '3'], e4
    assert e4[5][0] == ['e5', 2] and e4[5][1] == ['c6', 1], e4[5]
    e5 = r['pos'][key_of('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2')]
    assert e5[0] == 2 and sorted(x[0] for x in e5[5]) == ['Bc4', 'Nf3'], e5
    assert r['games'] == 4 and all(v[0] >= MIN for v in r['pos'].values())
    assert 'Someone' not in json.dumps(r)
    print('self-test ok:', len(r['pos']), 'positions')


if __name__ == '__main__':
    if '--self-test' in sys.argv:
        self_test()
        sys.exit(0)
    folder = sys.argv[1] if len(sys.argv) > 1 else 'master/data'
    r = build(load(folder))
    with open(os.path.join(folder, 'positions.json'), 'w') as fh:
        json.dump(r, fh, separators=(',', ':'))
    print('positions.json:', r['games'], 'games,', len(r['pos']), 'positions')
