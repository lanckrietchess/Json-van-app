#!/usr/bin/env python3
"""tools/model_games.py (9.83.0): Kyenzo's model games per opening chapter -> data/model-games.json (LC111, the "Model games" tab).

For every opening chapter in content.json (`trees`, not the "Model Games" groups, which are course content already):
  1. take Kyenzo's WON games (master/data/games-*.json on the branch master-data) in which he played the chapter's side;
  2. a game belongs to a chapter only when its moves follow the chapter's `path` to the end (the position the chapter is about);
     when several chapters match, the one with the longest path wins (the most specific chapter), then the deepest match in its tree;
  3. inside the chapter, the game is followed move by move through the chapter's tree: `line` = the plies that are in the course;
  4. per chapter at most --max games (default 12): deepest in the course line first, then a real finish (mate, resignation) before a
     win on time, then his accuracy, then the newest.
The file keeps, per game, only what the app shows: the game id (the full moves come from the database, mg_game_moves, for Pro),
date, time class, the two ratings (no names), accuracy, how it ended, the plies in the course line, the move where it left the
course, and the first moves as SAN up to the free preview (`free` plies: the course line and 4 half-moves past it, at least 10 and at most 20).
Usage: python3 tools/model_games.py --games <dir with games-*.json> [--content content.json] [--out data/model-games.json] [--max 12]
       python3 tools/model_games.py --self-test
Needs python-chess.
"""
import argparse, glob, io, json, os, sys, time
import chess, chess.pgn

SKIP_GROUPS = ('Colle Model Games', 'Black Model Games')
END = {'checkmated': 'mate', 'resigned': 'resignation', 'timeout': 'time', 'abandoned': 'abandoned', 'win': 'win'}

def sans_of_pgn(pgn):
    g = chess.pgn.read_game(io.StringIO(pgn))
    if not g: return []
    b = g.board(); out = []
    if b.fen() != chess.STARTING_FEN: return []
    for mv in g.mainline_moves():
        out.append(b.san(mv)); b.push(mv)
    return out

def clean(s): return str(s).replace('+', '').replace('#', '').replace('!', '').replace('?', '').strip()

def path_sans(path):
    out = []
    for tok in str(path or '').split():
        t = tok.split('.')[-1] if '.' in tok else tok
        if t and not t[0].isdigit(): out.append(clean(t))
    return out

def follow(tree, sans):
    """plies of `sans` that are in the tree, from the root"""
    nodes, k = tree, 0
    while k < len(sans):
        nxt = [n for n in (nodes or []) if clean(n.get('m', '')) == clean(sans[k])]
        if not nxt: break
        nodes = nxt[0].get('c') or []; k += 1
    return k

def build(content, games, cap=12):
    chs = [t for t in content.get('trees', []) if t.get('group') not in SKIP_GROUPS and t.get('tree')]
    for t in chs: t['_path'] = path_sans(t.get('path'))
    out = {t['id']: [] for t in chs}
    used = 0
    for g in games:
        if str(g.get('result')) != 'win' or g.get('color') not in ('w', 'b'): continue
        sans = sans_of_pgn(g.get('pgn') or '')
        if len(sans) < 12: continue
        best = None
        for t in chs:
            if t.get('side') != g['color']: continue
            p = t['_path']
            if len(sans) < len(p) or [clean(x) for x in sans[:len(p)]] != p: continue
            d = follow(t['tree'], sans)
            if d < len(p): continue
            key = (len(p), d)
            if not best or key > best[0]: best = (key, t, d)
        if not best: continue
        (_, t, d) = best
        free = min(max(10, d + 4), 20)
        term = END.get(str(g.get('termination') or ''), str(g.get('termination') or 'win'))
        try: acc = float(g.get('acc_me')) if g.get('acc_me') not in (None, '', 'None') else None
        except ValueError: acc = None
        ply = d  # the first ply that is NOT in the course (0-based), when the game goes on
        out[t['id']].append({'id': str(g['id']), 'end_time': int(float(g.get('end_time') or 0)), 'tc': g.get('time_class') or '',
            'me': int(float(g.get('my_rating') or 0)) or None, 'opp': int(float(g.get('opp_rating') or 0)) or None, 'acc': acc,
            'end': term, 'plies': len(sans), 'line': d, 'left': sans[ply] if ply < len(sans) else '', 'leftPly': ply if ply < len(sans) else None,
            'free': free, 'san': sans[:free], 'eco': g.get('eco') or '', 'opening': g.get('opening') or ''})
        used += 1
    for k in out:
        out[k].sort(key=lambda x: (-x['line'], x['end'] == 'time', -(x['acc'] or 0), -x['end_time']))
        out[k] = out[k][:cap]
    return {'v': 1, 'built': time.strftime('%Y-%m-%d'), 'games_used': used, 'max': cap,
            'rule': 'wins only, Kyenzo on the chapter side, the game follows the chapter path to the end (longest path wins), sorted by depth in the course line',
            'chapters': {k: v for k, v in out.items() if v}}

def self_test():
    content = {'trees': [
        {'id': 'ck', 'group': 'Caro-Kann', 'side': 'b', 'path': '1.e4 c6 2.d4 d5', 'tree': [{'m': 'e4', 'c': [{'m': 'c6', 'c': [{'m': 'd4', 'c': [{'m': 'd5', 'c': [{'m': 'e5', 'c': [{'m': 'Bf5'}]}]}]}]}]}]},
        {'id': 'ck-adv', 'group': 'Caro-Kann', 'side': 'b', 'path': '1.e4 c6 2.d4 d5 3.e5', 'tree': [{'m': 'e4', 'c': [{'m': 'c6', 'c': [{'m': 'd4', 'c': [{'m': 'd5', 'c': [{'m': 'e5', 'c': [{'m': 'Bf5', 'c': [{'m': 'Nf3'}]}]}]}]}]}]}]},
        {'id': 'mg', 'group': 'Black Model Games', 'side': 'b', 'path': '1.e4 c6', 'tree': [{'m': 'e4'}]}]}
    pg = lambda mv: '[Event "x"]\n\n' + mv
    games = [
        {'id': '1', 'color': 'b', 'result': 'win', 'termination': 'resigned', 'pgn': pg('1. e4 c6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 5. Be2 c5 6. O-O Nc6 7. c3 Qb6 0-1'), 'acc_me': '90'},
        {'id': '2', 'color': 'w', 'result': 'win', 'pgn': pg('1. e4 c6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 5. Be2 c5 6. O-O Nc6 7. c3 Qb6 1-0')},   # he was White: never a Caro-Kann model game
        {'id': '3', 'color': 'b', 'result': 'loss', 'pgn': pg('1. e4 c6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 5. Be2 c5 6. O-O Nc6 7. c3 Qb6 1-0')},   # a loss: never
        {'id': '4', 'color': 'b', 'result': 'win', 'termination': 'timeout', 'pgn': pg('1. e4 c6 2. d4 d5 3. exd5 cxd5 4. c4 Nf6 5. Nc3 e6 6. Nf3 Be7 0-1')},
        {'id': '5', 'color': 'b', 'result': 'win', 'pgn': pg('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 0-1')}]
    r = build(content, games)
    ok = r['chapters'].get('ck-adv', [{}])[0].get('id') == '1' and r['chapters']['ck-adv'][0]['line'] == 7 and [x['id'] for x in r['chapters'].get('ck', [])] == ['4'] \
        and 'mg' not in r['chapters'] and r['games_used'] == 2 and r['chapters']['ck-adv'][0]['left'] == 'e6' and len(r['chapters']['ck-adv'][0]['san']) == 11
    print('self-test', 'ok' if ok else 'FAILED', json.dumps(r['chapters'])[:400])
    return 0 if ok else 1

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--games'); ap.add_argument('--content', default='content.json'); ap.add_argument('--out', default='data/model-games.json')
    ap.add_argument('--max', type=int, default=12); ap.add_argument('--self-test', action='store_true'); a = ap.parse_args()
    if a.self_test: sys.exit(self_test())
    if not a.games: ap.error('--games is required')
    games = []
    for f in sorted(glob.glob(os.path.join(a.games, 'games-*.json'))): games += json.load(open(f, encoding='utf-8'))
    r = build(json.load(open(a.content, encoding='utf-8')), games, a.max)
    os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
    json.dump(r, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    n = sum(len(v) for v in r['chapters'].values())
    print('wrote', a.out, '·', len(r['chapters']), 'chapters with model games ·', n, 'games ·', r['games_used'], 'wins matched')

if __name__ == '__main__': main()
