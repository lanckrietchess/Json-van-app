#!/usr/bin/env python3
"""tools/master_games.py (9.60.0): Kyenzo's own Chess.com games -> analysed data for the app's "Kyenzo's Games" section (LC95).

What it does, per calendar year (so the GitHub workflow can run the years side by side):
  1. downloads the monthly archives of the account from the public Chess.com API (rated rapid + blitz, standard chess only);
  2. runs Stockfish on every position (node limit, one engine per worker), and a second, deeper multi-PV look where a move
     might be brilliant, an only move or the punishment of a blunder;
  3. writes master/data/games-YYYY.json (one row per game: meta, PGN without clocks, per-ply evaluations, accuracy,
     move-quality counts) and master/data/puzzles-YYYY.json (the positions the app trains: brilliant, great, punish,
     missed, blunder, mistake), plus master/data/index.json.
Nothing here calls an AI; the analysis runs once, offline (the app itself never runs a server-side engine).

Definitions (from the board and Stockfish, never Chess.com's private labels: the public API has no move classifications):
  win chance    wc(cp) = 2 / (1 + exp(-0.00368208 * cp)) - 1   (Lichess), mate = +-1; cp clamped to +-1500
  loss          wc before the move minus wc after it, from the mover's side (0..2)
  blunder >= 0.30, mistake >= 0.20, inaccuracy >= 0.10 (Lichess thresholds)
  great         the played move is Stockfish's best and the second best is at least 0.25 wc worse (an only move)
  brilliant     a great move that is also a real sacrifice made BY THIS MOVE (9.82.0: see _is_sacrifice), not played from an already won position
                (wc before <= 0.80) and not leaving a losing one (wc after >= -0.10)
  punish        the opponent's previous move was a blunder and Kyenzo found the best (or a 0.05-wc-close) reply
  missed        the opponent's previous move was a blunder and Kyenzo did not punish it (loss >= 0.20)
  accuracy      per move 103.1668 * exp(-0.04354 * (win% before - win% after)) - 3.1669 (Lichess), averaged
Usage:
  python3 tools/master_games.py run --year 2024 [--half 1|2] [--user lanckrietchess_yt] [--workers 4] [--nodes 60000]
    (9.72.0: with LICHESS_USER=<name> in the environment, that Lichess account's rated blitz + rapid games of the same
     half year are added (row id = the Lichess game id); the workflow reads it from the repository variable LICHESS_USER)
  python3 tools/master_games.py index            (rebuilds master/data/index.json from the year files)
  python3 tools/master_games.py --self-test      (two sample games from tests/fixtures/master_games.json, no network)
Needs: pip install python-chess, and a stockfish binary on PATH (or STOCKFISH=/path).
"""
import json, math, os, re, sys, time, shutil, urllib.request, urllib.error
from concurrent.futures import ProcessPoolExecutor

import chess, chess.engine, chess.pgn, io

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUT = os.path.join(REPO, 'master', 'data')
UA = 'LanckrietChessTrainingHub/1.0 (+https://lanckrietchesstrainerhub.vercel.app)'
VALUES = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}
TIERS = [(0, 799, '0-799'), (800, 1199, '800-1199'), (1200, 1599, '1200-1599'), (1600, 1999, '1600-1999'), (2000, 9999, '2000+')]
VERSION = 1   # bump when the analysis rules change: every game is analysed again


# ---------- small helpers ----------
def tier_of(r):
    for lo, hi, name in TIERS:
        if lo <= (r or 0) <= hi: return name
    return TIERS[-1][2]

def cp_of(score):
    """A PovScore (white POV) -> centipawns, mates as +-(10000 - plies)."""
    s = score.white()
    if s.is_mate():
        m = s.mate()
        return (10000 - abs(m)) * (1 if m > 0 else -1) if m != 0 else 0
    return max(-1500, min(1500, s.score()))

def wc(cp):
    if cp is None: return 0.0
    if abs(cp) >= 9000: return 1.0 if cp > 0 else -1.0
    return 2 / (1 + math.exp(-0.00368208 * cp)) - 1

def winpct(cp): return 50 + 50 * wc(cp)

def material(board, color):
    return sum(VALUES[p.piece_type] * (1 if p.color == color else -1) for p in board.piece_map().values())

def phase_of(board, ply):
    heavy = sum(VALUES[p.piece_type] for p in board.piece_map().values() if p.piece_type not in (chess.PAWN, chess.KING))
    if heavy <= 13: return 'endgame'
    if ply < 20: return 'opening'
    return 'middlegame'

def opening_of(eco_url):
    if not eco_url: return ''
    slug = eco_url.rstrip('/').split('/')[-1]
    slug = re.split(r'-\d|\.\.\.', slug)[0]
    return slug.replace('-', ' ').replace('_', ' ').strip()

def strip_pgn(pgn):
    """Movetext without clock comments, headers kept (the app's chess.js reads it)."""
    return re.sub(r'\s*\{\[%clk [^}]*\]\}', '', pgn).replace('\r', '')

def anonymise(row):
    """9.72.0: the opponent's name never reaches the public branch. Every header that holds it (White / Black, Termination,
    a Lichess Site / Link to the game page keeps working) gets "Opponent" instead; Kyenzo's own name stays."""
    pgn = row.get('pgn') or ''
    m = re.search(r'\[%s "([^"]*)"\]' % ('Black' if row.get('color') == 'w' else 'White'), pgn)
    if not m or not m.group(1) or m.group(1) == 'Opponent': return row
    opp = m.group(1)
    head, sep, body = pgn.partition('\n\n')
    head = re.sub(r'"([^"]*)"', lambda h: '"' + re.sub(re.escape(opp), 'Opponent', h.group(1), flags=re.I) + '"', head)
    row['pgn'] = head + sep + body
    return row

LICHESS_STATUS = {'mate': 'checkmated', 'resign': 'resigned', 'outoftime': 'timeout', 'timeout': 'abandoned', 'draw': 'agreed',
                  'stalemate': 'stalemate', 'repetition': 'repetition', 'insufficientMaterial': 'insufficient', 'cheat': 'abandoned', 'noStart': 'abandoned'}

def from_lichess(g, me_name):
    """A Lichess API game (NDJSON, pgnInJson) in the Chess.com shape the analysis reads. Kyenzo's side gets `me_name` as its
    username, so the analysis finds him under the same name as on Chess.com; the row id is the Lichess game id (8 letters and
    digits), which never collides with Chess.com's numeric ids."""
    pl = g.get('players', {})
    wn = ((pl.get('white') or {}).get('user') or {}).get('name', '')
    bn = ((pl.get('black') or {}).get('user') or {}).get('name', '')
    status, winner = g.get('status', ''), g.get('winner')
    def side(c, name):
        r = 'win' if winner == c else (LICHESS_STATUS.get(status, 'resigned') if winner else ('stalemate' if status == 'stalemate' else 'agreed'))
        return {'username': name, 'rating': (pl.get(c) or {}).get('rating') or 0, 'result': r}
    me_is_white = wn.lower() == g.get('_me', '').lower()
    clock = g.get('clock') or {}
    op = g.get('opening') or {}
    return {'url': 'https://lichess.org/' + g.get('id', ''), 'uuid': 'li-' + g.get('id', ''), 'pgn': g.get('pgn', ''),
            'time_class': g.get('speed'), 'time_control': '%s+%s' % (clock.get('initial', ''), clock.get('increment', '')),
            'end_time': int((g.get('lastMoveAt') or g.get('createdAt') or 0) / 1000), 'rules': 'chess', 'rated': True,
            'eco': ('https://lichess.org/opening/' + op.get('name', '').replace(' ', '_').replace(':', '').replace(',', '')) if op.get('name') else '',
            'white': side('white', me_name if me_is_white else wn), 'black': side('black', bn if me_is_white else me_name)}

def fetch_lichess(user, year, half, me_name):
    """Rated blitz + rapid games of a Lichess account in one half year, from the public games export (no token needed)."""
    import datetime
    lo = datetime.datetime(year, 1 if half != 2 else 7, 1, tzinfo=datetime.timezone.utc)
    hi = datetime.datetime(year + (1 if half != 1 else 0), 1 if half != 1 else 7, 1, tzinfo=datetime.timezone.utc)
    url = ('https://lichess.org/api/games/user/%s?rated=true&perfType=blitz,rapid&pgnInJson=true&clocks=false&evals=false'
           '&opening=true&since=%d&until=%d' % (user, int(lo.timestamp() * 1000), int(hi.timestamp() * 1000)))
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/x-ndjson'})
    out = []
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            for line in r:
                line = line.strip()
                if not line: continue
                g = json.loads(line.decode('utf-8'))
                if g.get('variant') not in (None, 'standard'): continue
                g['_me'] = user
                out.append(from_lichess(g, me_name))
    except urllib.error.HTTPError as e:
        print('lichess %s: HTTP %s, skipped' % (user, e.code), flush=True)
    return out

def get_json(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=60) as r: return json.loads(r.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            if i == tries - 1: raise
        except Exception:
            if i == tries - 1: raise
        time.sleep(2 + 3 * i)


# ---------- fetching ----------
def fetch_year(user, year, half=0):
    arch = get_json('https://api.chess.com/pub/player/%s/games/archives' % user) or {'archives': []}
    games = []
    for url in arch.get('archives', []):
        if '/games/%d/' % year not in url: continue
        mo = int(url.rstrip('/').split('/')[-1])
        if half == 1 and mo > 6 or half == 2 and mo <= 6: continue
        month = get_json(url) or {}
        for g in month.get('games', []):
            if g.get('rules') != 'chess' or not g.get('rated') or g.get('time_class') not in ('rapid', 'blitz'): continue
            if not g.get('pgn'): continue
            games.append(g)
        time.sleep(0.4)
    return games


# ---------- analysis ----------
_ENGINE = None
def _engine():
    global _ENGINE
    if _ENGINE is None:
        path = os.environ.get('STOCKFISH') or shutil.which('stockfish') or '/usr/games/stockfish'
        _ENGINE = chess.engine.SimpleEngine.popen_uci(path)
        _ENGINE.configure({'Threads': 1, 'Hash': 64})
    return _ENGINE

def _look(board, nodes, multipv=1):
    info = _engine().analyse(board, chess.engine.Limit(nodes=nodes), multipv=multipv)
    if isinstance(info, dict): info = [info]
    out = []
    for i in info:
        pv = [m.uci() for m in i.get('pv', [])[:8]]
        out.append({'cp': cp_of(i['score']), 'pv': pv})
    return out

def analyse_game(args):
    global _ENGINE
    try: return _analyse_game(args)
    finally:
        if _ENGINE is not None:
            try: _ENGINE.quit()
            except Exception: pass
            _ENGINE = None

def _analyse_game(args):
    g, user, nodes = args
    me = user.lower()
    color = 'w' if g['white']['username'].lower() == me else 'b'
    my_side = chess.WHITE if color == 'w' else chess.BLACK
    game = chess.pgn.read_game(io.StringIO(g['pgn']))
    if game is None: return None
    board = game.board()
    moves = list(game.mainline_moves())
    if len(moves) < 6: return None
    boards, sans = [], []
    b = board.copy()
    for m in moves:
        boards.append(b.copy()); sans.append(b.san(m)); b.push(m)
    final = b
    evals, pvs = [], []
    for bb in boards + [final]:
        if bb.is_game_over():
            if bb.is_checkmate(): evals.append(-10000 if bb.turn == chess.WHITE else 10000)
            else: evals.append(0)
            pvs.append([]); continue
        r = _look(bb, nodes)[0]
        evals.append(r['cp']); pvs.append(r['pv'])
    meR = g['white' if color == 'w' else 'black'].get('rating') or 0
    oppR = g['black' if color == 'w' else 'white'].get('rating') or 0
    eco_url = g.get('eco') or ''
    m_eco = re.search(r'\[ECO "([A-E]\d\d)"\]', g['pgn'])
    eco = m_eco.group(1) if m_eco else ''
    gid = g.get('url', '').rstrip('/').split('/')[-1] or g.get('uuid')
    opening = opening_of(eco_url)
    acc_me, acc_opp = [], []
    counts = {'brilliant': 0, 'great': 0, 'blunder': 0, 'mistake': 0, 'inaccuracy': 0, 'opp_blunder': 0}
    puzzles = []
    loss_by_ply = []
    for i, m in enumerate(moves):
        mover = boards[i].turn
        sgn = 1 if mover == chess.WHITE else -1
        before, after = evals[i] * sgn, evals[i + 1] * sgn
        loss = max(0.0, wc(before) - wc(after))
        loss_by_ply.append(loss)
        a = 103.1668 * math.exp(-0.04354 * max(0.0, winpct(before) - winpct(after))) - 3.1669
        a = max(0.0, min(100.0, a))
        (acc_me if mover == my_side else acc_opp).append(a)
        if mover != my_side:
            if loss >= 0.30 and i >= 4: counts['opp_blunder'] += 1
            continue
        if i < 4: continue
        best = pvs[i][0] if pvs[i] else None
        played = m.uci()
        base = {'game_id': gid, 'ply': i, 'fen': boards[i].fen(), 'side': color, 'played': played, 'played_san': sans[i],
                'best': best, 'best_san': boards[i].san(chess.Move.from_uci(best)) if best else None, 'line': pvs[i][:6],
                'reply': pvs[i + 1][:6], 'eval_before': before, 'eval_after': after, 'loss': round(loss, 3),
                'my_rating': meR, 'tier': tier_of(meR), 'eco': eco, 'opening': opening, 'phase': phase_of(boards[i], i),
                'prev': moves[i - 1].uci() if i else None, 'prev_fen': boards[i - 1].fen() if i else None,
                'time_class': g.get('time_class'), 'end_time': g.get('end_time')}
        prev_blunder = i >= 1 and loss_by_ply[i - 1] >= 0.30
        # mistakes of Kyenzo (Trim material), skip positions that were already lost or won beyond doubt
        if loss >= 0.20 and -0.95 < wc(before) < 0.95:
            kind = 'blunder' if loss >= 0.30 else 'mistake'
            counts[kind] += 1
            if prev_blunder: kind = 'missed'
            # a puzzle only when the move really threw something away (not +5.7 -> +2.3 in a won game)
            if wc(after) < 0.30:
                puzzles.append(dict(base, kind=kind, solution=pvs[i][:1] if pvs[i] else [], tags=_tags(boards[i], pvs[i])))
            continue
        if loss >= 0.10: counts['inaccuracy'] += 1; continue
        # good moves: only look deeper where it can matter
        # a king step is never a sacrifice, even when the line loses material after it (it is an only move at most)
        sac = boards[i].piece_type_at(m.from_square) != chess.KING and _is_sacrifice(boards[i], m, pvs[i + 1], my_side)
        if not (sac or prev_blunder or (abs(before) < 400 and loss < 0.02 and boards[i].is_capture(m) is False and played == best)): continue
        deep = _look(boards[i], nodes * (4 if (sac or prev_blunder) else 2), multipv=2)
        if len(deep) < 2: continue
        b1, b2 = deep[0], deep[1]
        b1cp, b2cp = b1['cp'] * sgn, b2['cp'] * sgn
        gap = wc(b1cp) - wc(b2cp)
        top = b1['pv'][0] if b1['pv'] else None
        found = played == top or (wc(b1cp) - wc(after) <= 0.05 and played in (top, best))
        if not found: continue
        tags = _tags(boards[i], b1['pv'])
        if sac and gap >= 0.25 and wc(before) <= 0.80 and wc(after) >= -0.10:
            counts['brilliant'] += 1
            puzzles.append(dict(base, kind='brilliant', solution=b1['pv'][:3], line=b1['pv'][:6], gap=round(gap, 3), tags=tags + ['sacrifice']))
        elif prev_blunder and wc(after) - wc(before) >= -0.05 and wc(after) >= 0.30 and wc(evals[i - 1] * sgn) < 0.50:
            puzzles.append(dict(base, kind='punish', solution=b1['pv'][:3], line=b1['pv'][:6], gap=round(gap, 3), tags=tags))
        elif gap >= 0.25 and -0.60 <= wc(before) <= 0.80:
            counts['great'] += 1
            puzzles.append(dict(base, kind='great', solution=b1['pv'][:3], line=b1['pv'][:6], gap=round(gap, 3), tags=tags))
    res = g['white' if color == 'w' else 'black'].get('result')
    outcome = 'win' if res == 'win' else ('draw' if res in ('agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient') else 'loss')
    api_acc = g.get('accuracies') or {}
    row = {'id': gid, 'url': g.get('url'), 'end_time': g.get('end_time'), 'time_class': g.get('time_class'),
           'time_control': g.get('time_control'), 'color': color, 'my_rating': meR, 'opp_rating': oppR, 'tier': tier_of(meR),
           'result': outcome, 'termination': (g['white' if color == 'b' else 'black'].get('result') if outcome == 'win' else res),
           'eco': eco, 'opening': opening, 'eco_url': eco_url, 'plies': len(moves), 'pgn': strip_pgn(g['pgn']),
           'evals': evals, 'acc_me': _acc(acc_me), 'acc_opp': _acc(acc_opp),
           'chesscom_acc_me': api_acc.get('white' if color == 'w' else 'black'),
           'chesscom_acc_opp': api_acc.get('black' if color == 'w' else 'white'), 'counts': counts, 'v': VERSION}
    for p in puzzles: p['id'] = '%s-%d' % (gid, p['ply'])
    return row, puzzles

def _acc(xs):
    """Game accuracy: the mean and the harmonic mean of the move accuracies, averaged (close to Lichess)."""
    if not xs: return None
    mean = sum(xs) / len(xs)
    harm = len(xs) / sum(1 / max(x, 1.0) for x in xs)
    return round((mean + harm) / 2, 1)

def _see(b, sq):
    """material the side to move wins by a legal exchange on sq (least valuable attacker first, may stop)"""
    p = b.piece_at(sq)
    if not p or p.piece_type == chess.KING: return 0
    caps = [m for m in b.legal_moves if m.to_square == sq]
    if not caps: return 0
    m = min(caps, key=lambda x: 99 if b.piece_type_at(x.from_square) == chess.KING else VALUES[b.piece_type_at(x.from_square)])
    b2 = b.copy(); b2.push(m)
    return max(0, VALUES[p.piece_type] - _see(b2, sq))

def _is_sacrifice(board, move, reply_pv, me):
    """9.82.0 (the app's rule, sacrificeOf + lineSacrifice): THIS move gives material. (a) the moved piece (worth 3+) can be taken
    and it costs the mover 2+ (no defender, or a cheaper attacker); (b) the move leaves another piece (worth 3+) where the opponent
    wins 2+ by a legal exchange; or (c) the engine line: they take 2+ with their reply and the mover is still down after the next
    move. Before 9.82.0 a deficit after the mover's NEXT move also counted, so a quiet move before a later sacrifice became
    "brilliant"."""
    b = board.copy(); pt = b.piece_type_at(move.from_square); val = VALUES[move.promotion or pt]
    got = VALUES[b.piece_type_at(move.to_square)] if b.piece_at(move.to_square) else (1 if b.is_en_passant(move) else 0)
    m0 = material(b, me); b.push(move)
    if b.is_checkmate(): return False
    to = move.to_square
    att = [x for x in b.legal_moves if x.to_square == to]
    if pt != chess.KING and val >= 3 and val - got >= 2 and att:
        cheap = min(100 if b.piece_type_at(x.from_square) == chess.KING else VALUES[b.piece_type_at(x.from_square)] for x in att)
        if not b.attackers(me, to) or cheap < val: return True
    for sq, p in b.piece_map().items():
        if p.color == me and p.piece_type not in (chess.KING, chess.PAWN) and sq != to and _see(b, sq) >= 2: return True
    seq = []
    for u in (reply_pv or [])[:2]:
        mv = chess.Move.from_uci(u)
        if mv not in b.legal_moves: break
        b.push(mv); seq.append(material(b, me) - m0)
    return len(seq) >= 1 and seq[0] <= -2 and (len(seq) < 2 or seq[1] <= -1)

def _tags(board, pv):
    t = []
    if not pv: return t
    b = board.copy(); first = chess.Move.from_uci(pv[0])
    if first not in b.legal_moves: return t
    if b.gives_check(first): t.append('check')
    if b.is_capture(first): t.append('capture')
    if first.promotion: t.append('promotion')
    for u in pv:
        mv = chess.Move.from_uci(u)
        if mv not in b.legal_moves: break
        b.push(mv)
        if b.is_checkmate(): t.append('mate'); break
    return t


# ---------- year run ----------
def run_year(user, year, workers, nodes, games=None, half=0):
    os.makedirs(OUT, exist_ok=True)
    tag = '%d' % year if not half else '%d-%d' % (year, half)
    gpath, ppath = os.path.join(OUT, 'games-%s.json' % tag), os.path.join(OUT, 'puzzles-%s.json' % tag)
    old_g = {r['id']: r for r in (json.load(open(gpath)) if os.path.exists(gpath) else []) if r.get('v') == VERSION}
    old_p = [p for p in (json.load(open(ppath)) if os.path.exists(ppath) else []) if p['game_id'] in old_g]
    if games is None:
        games = fetch_year(user, year, half)
        li = os.environ.get('LICHESS_USER', '').strip()
        if li and re.fullmatch(r'[A-Za-z0-9_-]{2,30}', li):
            lg = fetch_lichess(li, year, half, user)
            print('lichess %s: %d games' % (li, len(lg)), flush=True)
            games = games + lg
    todo = [g for g in games if (g.get('url', '').rstrip('/').split('/')[-1] or g.get('uuid')) not in old_g]
    print('year %d: %d games, %d new' % (year, len(games), len(todo)), flush=True)
    rows, puzz = list(old_g.values()), list(old_p)
    t0 = time.time()
    with ProcessPoolExecutor(max_workers=workers) as ex:
        for n, res in enumerate(ex.map(analyse_game, [(g, user, nodes) for g in todo], chunksize=2)):
            if res: rows.append(res[0]); puzz.extend(res[1])
            if n % 50 == 49:
                print('  %d / %d  (%.0f s)' % (n + 1, len(todo), time.time() - t0), flush=True)
                _save(gpath, ppath, rows, puzz)
    _save(gpath, ppath, rows, puzz)
    build_index()
    return rows, puzz

def _save(gpath, ppath, rows, puzz):
    rows = [anonymise(r) for r in rows]
    rows = sorted(rows, key=lambda r: r.get('end_time') or 0)
    puzz = sorted(puzz, key=lambda p: (p.get('end_time') or 0, p['ply']))
    json.dump(rows, open(gpath, 'w'), separators=(',', ':'))
    json.dump(puzz, open(ppath, 'w'), separators=(',', ':'))

def build_index():
    files = sorted(f for f in os.listdir(OUT) if re.match(r'(games|puzzles)-\d{4}(-[12])?\.json$', f))
    idx = {'version': VERSION, 'built': int(time.time()), 'files': []}
    for f in files:
        data = json.load(open(os.path.join(OUT, f)))
        idx['files'].append({'name': f, 'rows': len(data)})
    json.dump(idx, open(os.path.join(OUT, 'index.json'), 'w'), indent=1)
    return idx


# ---------- self test ----------
def self_test():
    fx = json.load(open(os.path.join(REPO, 'tests', 'fixtures', 'master_games.json')))
    global OUT
    OUT = os.path.join('/tmp', 'lc95-selftest'); shutil.rmtree(OUT, ignore_errors=True)
    rows, puzz = run_year('lanckrietchess_yt', 2026, 2, 30000, games=fx)
    ok = 0; fail = 0
    def check(c, msg):
        nonlocal ok, fail
        print(('  ok  ' if c else '  FAIL ') + msg); ok += c; fail += (not c)
    check(len(rows) == len(fx), 'every sample game is analysed')
    mate = [r for r in rows if r['pgn'].strip().endswith('0-1') and 'Qh2#' in r['pgn']]
    check(bool(mate) and mate[0]['result'] == 'win' and mate[0]['color'] == 'b', 'the mate game is a win with Black')
    check(all('%clk' not in r['pgn'] for r in rows), 'clock comments are stripped')
    check(all(len(r['evals']) == r['plies'] + 1 for r in rows), 'one evaluation per position')
    check(all(0 <= (r['acc_me'] or 0) <= 100 for r in rows), 'accuracy between 0 and 100')
    check(all(p['side'] == 'b' for p in puzz), 'puzzles are always Kyenzo to move')
    check(all(chess.Move.from_uci(p['solution'][0]) in chess.Board(p['fen']).legal_moves for p in puzz if p['solution']), 'every solution move is legal')
    lost = [r for r in rows if r['result'] == 'loss']
    check(bool(lost) and lost[0]['counts']['blunder'] + lost[0]['counts']['mistake'] >= 1, 'the lost game has at least one mistake')
    check(opening_of('https://www.chess.com/openings/Caro-Kann-Defense-Advance-Botvinnik-Carls-Defense-4.c3-Nc6-5.Nf3') == 'Caro Kann Defense Advance Botvinnik Carls Defense', 'opening name from the ECO link')
    check(tier_of(355) == '0-799' and tier_of(1694) == '1600-1999' and tier_of(2105) == '2000+', 'rating tiers')
    print('%d ok, %d failed' % (ok, fail))
    return fail == 0


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] in ('-h', '--help'): print(__doc__); sys.exit(0)
    if a[0] == '--self-test': sys.exit(0 if self_test() else 1)
    opt = {a[i].lstrip('-'): a[i + 1] for i in range(1, len(a) - 1, 2)}
    if a[0] == 'index': print(json.dumps(build_index(), indent=1)); sys.exit(0)
    if a[0] == 'run':
        run_year(opt.get('user', 'lanckrietchess_yt'), int(opt['year']), int(opt.get('workers', os.cpu_count() or 2)), int(opt.get('nodes', 60000)), half=int(opt.get('half', 0)))
        sys.exit(0)
    print(__doc__); sys.exit(2)
