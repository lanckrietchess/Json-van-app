#!/usr/bin/env python3
# tools/repertoire_build.py (9.72.0): Kyenzo's ChessTempo repertoire export -> the opening trees in content.json.
#
#   python3 tools/repertoire_build.py sources/ct-all-repertoires-2026-11-25.pgn \
#       --games DIR_WITH_games-*.json [--engine] [--write] [--report tools/repertoire_report.md]
#
# What it does, in this order (nothing is invented; every move comes from the PGN, from Kyenzo's own
# games or from Stockfish, and every node records where it came from in the report):
#   1. White chapters other than "Colle" become a NEW group "Vienna & 1.e4" (side w), split into chapters
#      of at most MAX_LEAVES lines, every move and comment exactly as in the export.
#   2. The White "Colle" chapter and every Black chapter are MERGED into the existing trees
#      (Colle-Koltanowski, Caro-Kann, Semi-Slav): existing nodes and their notes are never changed or
#      removed; a new branch is attached in the chapter whose path it continues, or becomes a new chapter
#      of that group when no chapter covers it yet.
#   3. Comments: ChessTempo stores a comment per POSITION, so a comment written for the White repertoire
#      also shows up in the Black export of the same position. A comment that appears at the same path in
#      a White and a Black chapter is kept only on the side that played the commented move.
#   4. Levels (the app's 5-level system, node field "l"): the main line of every branch stays on the level
#      of its parent, rarer replies move up one or two levels (how often Kyenzo met them in his own games
#      decides), and depth moves a line up too (Level 2 to move 12, Level 3 to move 17, Level 4 to move
#      23, deeper is Level 5). Level 1 (free) is Level 2 cut off a few moves after the chapter's path.
#   5. --engine: gaps. Every position from Kyenzo's own games (first 14 half-moves) that he reached at
#      least GAP_MIN times while still in book, but that no chapter covers, gets a short line: our move is
#      his own most-played move when Stockfish (depth 16, 3 lines) keeps it within GAP_TOL centipawns of
#      its best, otherwise Stockfish's best; their reply is their most common reply in his games, otherwise
#      Stockfish's. Example: 1.d4 e5 (the Englund Gambit) for the Colle.
#
# Without --write it only prints and writes the report. Re-run after a new export; it is idempotent
# (nodes already in the trees are skipped).
import argparse, collections, copy, glob, json, os, re, sys
import chess, chess.pgn, chess.engine

NEW_GROUP = "Vienna & 1.e4"
NEW_GROUP_INTRO = ("1.e4 with the Vienna (2.Nc3) and a direct answer to every other defence: the White repertoire "
                   "Kyenzo took to 2105. You play for the initiative from move one, and the same attacking ideas "
                   "come back in every chapter.")
MAX_LEAVES = 22
GAP_MIN, GAP_TOL, GAP_PLY = 5, 35, 14
CHAPTER_NAMES = {"1) e4 e5, Nc3": "Vienna", "2) e4 c5, a3": "Sicilian 2.a3", "3) Lanckriet system": "Caro-Kann: Lanckriet System",
                 "4) Papa-Ticulat Gambit": "French: Papa-Ticulat Gambit", "anti Alekhine’s Defence": "Alekhine",
                 "anti-Modern": "Modern", "anti-Pirc/Philidor": "Pirc and Philidor", "anti-Scandinavian": "Scandinavian",
                 "rest": "Other defences"}
TITLES = {  # clearer names for chapters whose move order differs from an existing chapter (same positions, other road)
    "semislav-c4-d5-nc3-nf6-nf3-e6-e3-nbd7-bd3": "Meran via 3.Nc3: 6.Bd3",
    "semislav-c4-d5-nc3-nf6-nf3-e6-e3-nbd7-qc2": "Anti-Meran via 3.Nc3: 6.Qc2",
    "semislav-c4-d5-nc3-nf6-nf3-e6-e3-nbd7-other": "Meran via 3.Nc3: 6.cxd5",
}
CAL = re.compile(r'\[%(cal|csl)\s+([^\]]+)\]')
REPORT = []


def say(*a):
    line = " ".join(str(x) for x in a)
    REPORT.append(line)
    print(line)


# ---------------------------------------------------------------- PGN
def clean_comment(c):
    ar, sq = [], []
    for kind, body in CAL.findall(c or ""):
        for t in body.split(','):
            t = t.strip()
            if kind == 'cal' and re.fullmatch(r'[RGBY][a-h][1-8][a-h][1-8]', t): ar.append(t)
            if kind == 'csl' and re.fullmatch(r'[RGBY][a-h][1-8]', t): sq.append(t)
    txt = CAL.sub('', c or '').replace('\r', '').strip()
    txt = re.sub(r'[ \t]+\n', '\n', txt)
    txt = re.sub(r'\n{3,}', '\n\n', txt)
    return txt, ar[:16], sq[:16]


def node_of(gn):
    o = {'m': gn.san()}
    txt, ar, sq = clean_comment(gn.comment)
    if txt: o['n'] = [txt[:12000]]
    if ar: o['ar'] = ar
    if sq: o['sq'] = sq
    nags = [n for n in gn.nags if 1 <= n <= 255][:6]
    if nags: o['g'] = nags
    kids = [node_of(v) for v in gn.variations]
    if kids: o['c'] = kids
    return o


def read_pgn(path):
    out = []
    with open(path, encoding='utf-8') as f:
        while True:
            g = chess.pgn.read_game(f)
            if g is None: break
            h = dict(g.headers)
            col = 'w' if h.get('ChesstempoRepertoireColour', '').lower().startswith('w') else 'b'
            name = h.get('White') if col == 'w' else h.get('Black')
            out.append({'name': name, 'side': col, 'tree': [node_of(v) for v in g.variations], 'errors': [str(e) for e in g.errors]})
    return out


def walk(tree, pre=()):
    for o in tree:
        p = pre + (o['m'],)
        yield p, o
        yield from walk(o.get('c', []), p)


def leafcount(o):
    ks = o.get('c', [])
    return 1 if not ks else sum(leafcount(k) for k in ks)


def movetext(sans, ply0=0):
    out = []
    for i, s in enumerate(sans):
        p = ply0 + i
        n = p // 2 + 1
        out.append(f"{n}.{s}" if p % 2 == 0 else (f"{n}...{s}" if i == 0 else s))
    return " ".join(out)


def slug(s):
    s = re.sub(r'[^a-z0-9]+', '-', s.lower().replace('...', '-').replace('’', '')).strip('-')
    return s[:44].rstrip('-')


# ---------------------------------------------------------------- games
def load_games(d):
    G = []
    for f in sorted(glob.glob(os.path.join(d, 'games-*.json'))):
        for g in json.load(open(f)):
            body = g['pgn'].split('\n\n', 1)[1] if '\n\n' in g['pgn'] else g['pgn']
            body = re.sub(r'\{[^}]*\}', '', body)
            body = re.sub(r'\d+\.\.\.', '', body)
            body = re.sub(r'\d+\.', '', body)
            toks = [t for t in body.split() if t not in ('1-0', '0-1', '1/2-1/2', '*')]
            b, sans = chess.Board(), []
            for t in toks[:32]:
                try: mv = b.parse_san(t)
                except Exception: break
                sans.append(b.san(mv)); b.push(mv)
            G.append({'c': g['color'], 'sans': sans, 'open': g.get('opening', '') or '', 'r': g.get('my_rating', 0)})
    return G


def counts(G):
    cnt = {'w': collections.Counter(), 'b': collections.Counter()}
    for g in G:
        s = g['sans']
        for k in range(0, len(s) + 1):
            cnt[g['c']][tuple(s[:k])] += 1
    return cnt


# ---------------------------------------------------------------- levels
def floor_for(ply):
    return 2 if ply <= 24 else 3 if ply <= 34 else 4 if ply <= 46 else 5


def assign(nodes, parent_l, prefix, side, cnt, start_rank=0):
    """Give every node in `nodes` (children of the position after `prefix`) a level in o['_l']."""
    mover = 'w' if len(prefix) % 2 == 0 else 'b'
    own = mover == side
    vp = cnt[side].get(tuple(prefix), 0)
    for i, o in enumerate(nodes):
        r = i + start_rank
        p = list(prefix) + [o['m']]
        ply = len(p)
        fl = floor_for(ply if own else ply + 1)
        if own:
            bump = 0 if r == 0 else 1
        else:
            vc = cnt[side].get(tuple(p), 0)
            share = vc / vp if vp >= 6 else None
            if r == 0 or vc >= 20 or (share is not None and share >= 0.2): bump = 0
            elif share is not None and share >= 0.06: bump = 1
            elif share is None and r <= 1: bump = 1
            else: bump = 2
        L = min(5, max(parent_l + bump, fl))
        o['_l'] = L
        assign(o.get('c', []), L, p, side, cnt)


def finalize(o, parent_l):
    """Turn the computed '_l' into the app's compact 'l' (only where it differs from the parent)."""
    L = o.pop('_l', None)
    if L is None:
        L = o.get('l', parent_l)
    elif L != parent_l:
        o['l'] = L
    for k in o.get('c', []):
        finalize(k, L)


def eff_levels(tree):
    """path -> effective level of every node of an existing tree."""
    out = {}
    def rec(ns, pre, pl):
        for o in ns:
            p = pre + (o['m'],)
            L = o.get('l', pl)
            out[p] = L
            rec(o.get('c', []), p, L)
    rec(tree, (), 1)
    return out


def max_level(o, parent_l):
    L = o.get('l', parent_l)
    return max([L] + [max_level(k, L) for k in o.get('c', [])])


def node_at(tree, path):
    ns, o = tree, None
    for m in path:
        o = next((x for x in ns if x['m'] == m), None)
        if o is None: return None
        ns = o.get('c', [])
    return o


def path_moves(path_text):
    return [t for t in re.sub(r'\d+\.(\.\.)?', ' ', path_text or '').split() if t]


# ---------------------------------------------------------------- comments shared between colours
def shared_comment_filter(chapters):
    seen = collections.defaultdict(dict)  # path -> side -> set(texts)
    for ch in chapters:
        for p, o in walk(ch['tree']):
            for t in o.get('n', []):
                seen[p].setdefault(ch['side'], set()).add(t.strip())
    dropped = 0
    for ch in chapters:
        for p, o in walk(ch['tree']):
            if 'n' not in o: continue
            mover = 'w' if len(p) % 2 == 1 else 'b'
            keep = []
            for t in o['n']:
                both = all(t.strip() in seen[p].get(s, set()) for s in ('w', 'b'))
                if both and ch['side'] != mover: dropped += 1; continue
                keep.append(t)
            if keep: o['n'] = keep
            else: o.pop('n')
    return dropped


# ---------------------------------------------------------------- new chapters (split by size)
def split_chapters(top, side, starts=None):
    """top: the root node list. starts: [(path, node)] to split (default: every first move).
    Returns [(path, node_at_end, kids_or_None)]: a chapter is the chain to node_at_end plus its kids."""
    out = []
    def rec(path, node):
        n, p = node, list(path)
        while len(n.get('c', [])) == 1 and (leafcount(n) > MAX_LEAVES or len(p) < 2):
            n = n['c'][0]; p.append(n['m'])
        if leafcount(n) <= MAX_LEAVES or not n.get('c'):
            out.append((p, n, None)); return
        kids = n['c']
        big = [k for k in kids if leafcount(k) > 3]
        small = [k for k in kids if leafcount(k) <= 3]
        if not big:
            out.append((p, n, None)); return
        for k in big: rec(p + [k['m']], k)
        if small: out.append((p, n, small))
    for path, node in (starts if starts is not None else [([o['m']], o) for o in top]):
        rec(path, node)
    return out


def chapter_tree(root_list, path, kids):
    """Chain from the root along `path`, then the chosen kids (or the whole subtree) at its end."""
    ns, chain = root_list, []
    for m in path:
        o = next(x for x in ns if x['m'] == m)
        chain.append(o); ns = o.get('c', [])
    copies = []
    for o in chain:
        c = {k: copy.deepcopy(v) for k, v in o.items() if k not in ('c', 'x')}
        copies.append(c)
    for a, b in zip(copies, copies[1:]): a['c'] = [b]
    end = chain[-1]
    sel = kids if kids is not None else end.get('c', [])
    if sel: copies[-1]['c'] = copy.deepcopy(sel)
    return [copies[0]]


def strip_seen_notes(trees):
    """Keep a note only in the first chapter of a group that shows that path (the app indexes notes per group)."""
    seen = set()
    for t in trees:
        for p, o in walk(t['tree']):
            if 'n' in o or 'ar' in o or 'sq' in o:
                if p in seen:
                    for k in ('n', 'ar', 'sq', 'g'): o.pop(k, None)
                else: seen.add(p)


def levels_list(stop):
    return [{"k": 1, "rt": 0, "stop": stop}, {"k": 2, "rt": 2}, {"k": 3, "rt": 2}, {"k": 4, "rt": 2}, {"k": 5, "rt": 2}]


def l1_stop(path_len, side):
    s = max(path_len + 4, 9 if side == 'w' else 10)
    if side == 'w' and s % 2 == 0: s += 1
    if side == 'b' and s % 2 == 1: s += 1
    return s


# ---------------------------------------------------------------- merge into existing trees
def merge(ch, trees, group, cnt, made, used_ids, names=None, solo=()):
    names = (names or {}).get(ch['side'], {})
    """Attach every new branch of chapter `ch` to the existing tree of `group` whose path it continues."""
    side = ch['side']
    gt = [t for t in trees if t['group'] == group]
    have = {}
    for t in gt:
        for p, _ in walk(t['tree']): have.setdefault(p, []).append(t)
    tpaths = {t['id']: tuple(path_moves(t['path'])) for t in gt}
    added = 0
    pending_new = []

    def rec(ns, pre):
        nonlocal added
        for i, o in enumerate(ns):
            p = pre + (o['m'],)
            if p in have:
                rec(o.get('c', []), p); continue
            if len(p) <= 2 and side == 'b' and p[-1] not in ('c6',):
                say(f"  skipped a stray first move {movetext(list(p))} (not part of the 1...c6 system)"); continue
            q = p[:-1]
            own = (len(q) % 2 == 0) == (side == 'w')
            holders = have.get(q, []) if q else []
            def score(t):
                tp = tpaths[t['id']]; k = 0
                while k < min(len(tp), len(p)) and tp[k] == p[k]: k += 1
                return k
            cands = []
            if holders:
                best = max(score(t) for t in holders)
                top = [t for t in holders if score(t) == best]
                if own or len(top) == 1: cands = top[:1]
            sub = copy.deepcopy(o)
            if cands:
                t = max(cands, key=lambda t: len(tpaths[t['id']]))
                parent = node_at(t['tree'], q)
                E = eff_levels(t['tree'])[q]
                rank = len(parent.get('c', []))
                assign([sub], E, list(q), side, cnt, start_rank=rank)
                finalize(sub, E)
                parent.setdefault('c', []).append(sub)
                for pp, _ in walk([sub], q): have.setdefault(pp, []).append(t)
                n = sum(1 for _ in walk([sub]))
                added += n
                need = max_level(sub, E)
                for k in (4, 5):
                    if need >= k and not any(L['k'] == k for L in t['levels']):
                        t['levels'].append({"k": k, "rt": 2}); t['levels'].sort(key=lambda x: x['k'])
                        say(f"  {t['title']}: Level {k} added (the new lines need it)")
                say(f"  + {movetext(list(p))}  -> {t['title']} ({n} moves)")
            else:
                pending_new.append((p, o))
    rec(ch['tree'], ())
    # branches that no chapter covers yet: new chapters of this group (split by size like the new group)
    byq = collections.OrderedDict()
    for p, o in pending_new: byq.setdefault(p[:-1], []).append((p, o))
    skip = 1 if group == "Colle-Koltanowski" else 2
    for q, items in byq.items():
        subs = [copy.deepcopy(o) for _, o in items]
        if sum(1 for _ in walk(subs)) <= 2:
            say(f"  skipped {', '.join(movetext(list(p)) for p, _ in items)}: too short for a chapter of its own"); continue
        base = next(iter(have.get(q, []) or gt))
        E = eff_levels(base['tree']).get(q, 2) if q else 2
        assign(subs, max(E, 2), list(q), side, cnt)
        for s_ in subs: finalize(s_, max(E, 2))
        root = chapter_tree(base['tree'], list(q), []) if q else []
        if q:
            node_at(root, q)['c'] = subs
            for p_, o_ in walk(root):
                if len(p_) <= len(q):
                    for k in ('n', 'ar', 'sq', 'g'): o_.pop(k, None)
        else:
            root = subs
        if q and len(items) > 1:
            mine = [p for p, _ in items if p in solo]                 # a frequent gap (20+ games) gets a chapter of its own
            rest = [p for p, _ in items if p not in solo]
            starts = [(list(p), node_at(root, p)) for p in mine]
            chs = split_chapters(root, side, starts) if starts else []
            if len(rest) == 1: chs += split_chapters(root, side, [(list(rest[0]), node_at(root, rest[0]))])
            elif rest and not mine: chs += split_chapters(root, side, [(list(q), node_at(root, q))])
            elif rest: chs.append((list(q), node_at(root, q), [node_at(root, p) for p in rest]))
        else:
            chs = split_chapters(root, side, [(list(p), node_at(root, p)) for p, _ in items])
        for path, node, kids in chs:
            sel = kids if kids is not None else None
            title = movetext(path[skip:], skip) if len(path) > skip else movetext(path)
            shown = kids if kids is not None else (node.get('c', []) if tuple(path) == q else None)
            if shown: title += " (" + ", ".join(movetext([k['m']], len(path)) for k in shown) + ")"
            nm = short_name(names.get(tuple(path)) or "") if not shown and len(path) >= 2 else ""
            if nm: title = nm + ": " + title   # a name only for one clear position, never for a list of different replies
            title = title[:90]
            tid = base['id'].split('-')[0] + '-' + slug(" ".join(path[skip:]) + (" other" if kids is not None else ""))
            while tid in used_ids: tid += 'x'
            used_ids.add(tid)
            tree = chapter_tree(root, path, sel)
            t = {"id": tid, "title": title, "group": group, "side": side, "path": movetext(path),
                 "levels": levels_list(l1_stop(len(path), side)), "tree": tree}
            made.append(t)
            for pp, _ in walk(tree): have.setdefault(pp, []).append(t)
            tpaths[tid] = tuple(path)
            n = sum(1 for _, o_ in walk(tree) if 'c' not in o_)
            added += n
            say(f"  NEW chapter {title} ({n} lines)")
    return added


# ---------------------------------------------------------------- gaps from Kyenzo's games
def in_side_trees(trees, side):
    have = set()
    for t in trees:
        if t['side'] != side or '-games-' in t['id'] or t['id'].startswith('black-games'): continue
        for p, _ in walk(t['tree']): have.add(p)
    return have


def gaps(trees, G, cnt, side, engine, names):
    have = in_side_trees(trees, side)
    out = []
    for p, n in cnt[side].items():
        if not p or len(p) > GAP_PLY or n < GAP_MIN: continue
        mover = 'w' if len(p) % 2 == 1 else 'b'
        if mover == side: continue                      # only positions after THEIR move
        if p in have or p[:-1] not in have: continue    # we were in book, they left it
        out.append((p, n))
    out.sort(key=lambda x: (len(x[0]), -x[1]))
    # keep only the first gap on every road (a deeper gap below a shallower one is part of that line)
    keep = []
    for p, n in out:
        if any(p[:len(k)] == k for k, _ in keep): continue
        keep.append((p, n))
    lines = []
    for p, n in keep:
        line = gap_line(p, side, G, cnt, engine)
        if line: lines.append((p, n, line))
    return lines


def gap_line(p, side, G, cnt, engine, own_moves=4):
    """A short tree after the gap position p: [ { m, c... } ] starting with OUR move."""
    b = chess.Board()
    for m in p: b.push_san(m)
    def our_move(board, prefix):
        info = engine.analyse(board, chess.engine.Limit(depth=16), multipv=3)
        best = info[0]['score'].pov(board.turn).score(mate_score=10000)
        cands = {board.san(i['pv'][0]): i['score'].pov(board.turn).score(mate_score=10000) for i in info}
        # his most played move here
        nxt = collections.Counter()
        for g in G:
            s = g['sans']
            if g['c'] == side and len(s) > len(prefix) and tuple(s[:len(prefix)]) == tuple(prefix): nxt[s[len(prefix)]] += 1
        for mv, k in nxt.most_common(3):
            if mv in cands and best - cands[mv] <= GAP_TOL: return mv, cands[mv], 'games'
            if mv not in cands:
                mvo = board.parse_san(mv)
                r = engine.analyse(board, chess.engine.Limit(depth=16), root_moves=[mvo])
                sc = r['score'].pov(board.turn).score(mate_score=10000)
                if best - sc <= GAP_TOL: return mv, sc, 'games'
        return board.san(info[0]['pv'][0]), best, 'stockfish'
    def their_moves(board, prefix):
        nxt = collections.Counter()
        for g in G:
            s = g['sans']
            if g['c'] == side and len(s) > len(prefix) and tuple(s[:len(prefix)]) == tuple(prefix): nxt[s[len(prefix)]] += 1
        picks = [mv for mv, k in nxt.most_common(2) if k >= 3]
        if not picks:
            info = engine.analyse(board, chess.engine.Limit(depth=14), multipv=1)
            picks = [board.san(info[0]['pv'][0])]
        return picks
    def build(board, prefix, left, wide=True):
        if left <= 0 or board.is_game_over(): return []
        mv, sc, why = our_move(board, prefix)
        o = {'m': mv, '_why': why, '_cp': sc}
        board.push_san(mv)
        kids = []
        if left > 1 and not board.is_game_over():
            for r in their_moves(board, prefix + [mv])[:2 if wide else 1]:
                board.push_san(r)
                rest = build(board, prefix + [mv, r], left - 1, False)
                board.pop()
                node = {'m': r}
                if rest: node['c'] = rest
                kids.append(node)
        board.pop()
        if kids: o['c'] = kids
        return [o]
    return build(b, list(p), own_moves)


def short_name(nm):
    nm = re.sub(r'\b(Game|Defense|Defence|Opening|Variation|Attack|Line|with)\b', '', nm or '')
    nm = re.sub(r'\s+', ' ', nm).strip()
    return nm[:40].rsplit(' ', 1)[0] if len(nm) > 40 else nm


def add_line(forest, path, line):
    """Put a gap line (the moves `path` from the start, then the tree `line`) into a PGN-like forest."""
    ns = forest
    for m in path:
        o = next((x for x in ns if x['m'] == m), None)
        if o is None:
            o = {'m': m}; ns.append(o)
        ns = o.setdefault('c', [])
    for x in line: ns.append(x)


# Hand-written notes for the gap lines, every move checked for legality and against Stockfish when the tool runs.
HAND = {
    ('w', ('d4', 'e5', 'dxe5')): ("MSPC. M: 1...e5 attacks nothing; it offers a pawn so that Black's pieces get open lines. "
        "S: nothing is developed yet, so a free pawn counts as long as it costs no time. P: my only forcing move is the capture. "
        "C: after 2.dxe5 Stockfish says {eval}; I keep the pawn while I develop with Nf3, Bf4 (or Bg5) and e3."),
    ('w', ('d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7', 'Bf4', 'Qb4+', 'Bd2')): ("5.Bd2 blocks the check with a piece that is already out ({eval}). "
        "MSPC, M: 4...Qb4+ checks and attacks b2 at the same time; 5...Qxb2 next is the point of Black's play."),
    ('w', ('d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7', 'Bf4', 'Qb4+', 'Bd2', 'Qxb2', 'Nc3')): ("6.Nc3! develops and is Stockfish's choice ({eval}). "
        "Never 6.Bc3?? Bb4! 7.Qd2 Bxc3 8.Qxc3 Qc1#: that mate is the trap the Englund Gambit is famous for. "
        "MSPC, M: before every bishop move here, ask what their queen on b2 can reach next."),
}
# Branches the gap line must teach even when Stockfish's own reply is another move (the trap lines people actually play).
EXTEND = [('w', ('d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7', 'Bf4'), ['Qb4+', 'Bd2', 'Qxb2', 'Nc3'])]


def hand_notes(forests, eng):
    def find(forest, path):
        ns, o = forest, None
        for m in path:
            o = next((x for x in ns if x['m'] == m), None)
            if o is None: return None
            ns = o.get('c', [])
        return o
    for side, path, more in EXTEND:
        for (sd, grp), forest in forests.items():
            if sd != side: continue
            o = find(forest, path)
            if o is None: continue
            b = chess.Board()
            for m in list(path) + more: b.push_san(m)       # raises on an illegal move: the tool stops, nothing is written
            node = o
            for m in more:
                k = next((x for x in node.get('c', []) if x['m'] == m), None)
                if k is None:
                    k = {'m': m}; node.setdefault('c', []).append(k)
                node = k
            say(f"  extended {movetext(list(path))} with {movetext(more, len(path))}")
    for (side, path), text in HAND.items():
        for (sd, grp), forest in forests.items():
            if sd != side: continue
            o = find(forest, path)
            if o is None: continue
            b = chess.Board()
            for m in path: b.push_san(m)
            info = eng.analyse(b, chess.engine.Limit(depth=18))
            cp = -info['score'].pov(b.turn).score(mate_score=10000)
            prev = b.copy(); prev.pop()
            best = eng.analyse(prev, chess.engine.Limit(depth=18))['pv'][0]
            if prev.san(best) != path[-1]:
                say(f"  hand note at {movetext(list(path))} skipped: Stockfish prefers {prev.san(best)}"); continue
            w = eval_words(cp)
            w = ('the position is ' + w) if w.startswith('equal') else ('White is ' if cp >= 0 else 'Black is ') + w.replace('you are ', '').replace('they are ', '')
            o.setdefault('n', []).insert(0, text.replace('{eval}', w))
            say(f"  hand note at {movetext(list(path))}")


def eval_words(cp, side_to_move_is_us=True):
    if cp is None: return ""
    if abs(cp) >= 9000: return "a forced mate"
    a = abs(cp) / 100
    who = "you are" if cp > 0 else "they are"
    if a < 0.3: return f"equal ({cp/100:+.1f})"
    if a < 0.8: return f"{who} slightly better ({cp/100:+.1f})"
    if a < 2.0: return f"{who} better ({cp/100:+.1f})"
    return f"{who} winning ({cp/100:+.1f})"


def gap_notes(p, n, line, side, names):
    """Plain facts only: where the position comes from, what Stockfish says, why this move."""
    first = line[0]
    nm = names.get(p, "")
    first.setdefault('n', [])
    src = ("This is my own move from those games, and Stockfish keeps it within a third of a pawn of its best move"
           if first.get('_why') == 'games' else "This is Stockfish's first choice (depth 16)")
    nm = re.sub(r'\s+(with|and|of)$', '', nm or '')
    first['n'].append(f"{('This is the ' + nm + '. ') if nm else ''}I met this position {n} times in my own games. "
                      f"{src}: after it, {eval_words(first.get('_cp'))}.")
    def clean(o):
        o.pop('_why', None); o.pop('_cp', None)
        for k in o.get('c', []): clean(k)
    for o in line: clean(o)


def opening_names(G):
    """Chess.com's opening name per move path, per side (his White games name his White chapters)."""
    by = {'w': collections.defaultdict(collections.Counter), 'b': collections.defaultdict(collections.Counter)}
    for g in G:
        s = g['sans']
        for k in range(1, min(len(s), GAP_PLY) + 1):
            if g['open']: by[g['c']][tuple(s[:k])][g['open']] += 1
    out = {'w': {}, 'b': {}}
    for side in by:
        for p, c in by[side].items():
            nm, k = c.most_common(1)[0]
            if k >= 2: out[side][p] = nm
    return out


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pgn'); ap.add_argument('--content', default='content.json')
    ap.add_argument('--games', required=True); ap.add_argument('--engine', action='store_true')
    ap.add_argument('--engine-cmd', default='node engine/stockfish-19-lite-single.js')
    ap.add_argument('--write', action='store_true'); ap.add_argument('--report', default='tools/repertoire_report.md')
    a = ap.parse_args()
    doc = json.load(open(a.content, encoding='utf-8'))
    trees = doc['trees']
    used_ids = {t['id'] for t in trees}
    G = load_games(a.games); cnt = counts(G); names = opening_names(G)
    chs = read_pgn(a.pgn)
    say(f"# Repertoire build\n\nExport: {os.path.basename(a.pgn)}, {len(chs)} chapters. Kyenzo's games: {len(G)}.\n")
    say(f"Comments that ChessTempo repeats in the other colour's export, dropped there: {shared_comment_filter(chs)}\n")
    before = sum(1 for t in trees for _ in walk(t['tree']))

    # 1. the new White group
    say("## New group: " + NEW_GROUP + "\n")
    new = []
    already = any(t['group'] == NEW_GROUP for t in trees)
    made = []
    for ch in chs:
        if ch['side'] != 'w' or ch['name'] == 'Colle': continue
        if already:   # a later export: new lines are merged like the other groups, existing chapters stay as they are
            merge(ch, trees + made, NEW_GROUP, cnt, made, used_ids, names); continue
        prefix = CHAPTER_NAMES.get(ch['name'], ch['name'])
        assign(ch['tree'], 2, [], 'w', cnt)
        for o in ch['tree']: finalize(o, 1)
        for path, node, kids in split_chapters(ch['tree'], 'w'):
            tail_from = 2 if len(path) > 3 else 0
            mt = movetext(path[tail_from:], tail_from) if path[tail_from:] else movetext(path)
            if kids is not None: mt += " (" + ", ".join(movetext([k['m']], len(path)) for k in kids) + ")"
            title = (prefix + ": " + mt)[:90]
            tid = "e4-" + slug(prefix + " " + " ".join(path[tail_from:]) + (" other" if kids is not None else ""))
            while tid in used_ids: tid += "x"
            used_ids.add(tid)
            tree = chapter_tree(ch['tree'], path, kids)
            lc = sum(1 for _, o in walk(tree) if 'c' not in o)
            new.append({"id": tid, "title": title, "group": NEW_GROUP, "side": "w", "path": movetext(path),
                        "levels": levels_list(l1_stop(len(path), 'w')), "tree": tree})
            say(f"- {title}: {lc} lines")
    strip_seen_notes(new)

    # 2. merges
    for ch in chs:
        if ch['side'] == 'w' and ch['name'] != 'Colle': continue
        if ch['side'] == 'w':
            say("\n## Colle (merged into Colle-Koltanowski)\n")
            merge(ch, trees, "Colle-Koltanowski", cnt, made, used_ids, names)
            continue
        say(f"\n## {ch['name']} (merged)\n")
        for top in ch['tree']:
            group = "Caro-Kann" if top['m'] == 'e4' else "Semi-Slav"
            merge({'side': 'b', 'tree': [top], 'name': ch['name']}, trees + made, group, cnt, made, used_ids, names)
    strip_seen_notes(made)

    # 3. gaps
    gapt = []
    if a.engine:
        eng = chess.engine.SimpleEngine.popen_uci(a.engine_cmd.split())
        eng.configure({'Hash': 64})
        try:
            pool = trees + new + made
            forests = collections.OrderedDict(); solo = set()
            for side in ('w', 'b'):
                say(f"\n## Gaps from Kyenzo's games ({'White' if side == 'w' else 'Black'})\n")
                for p, n, line in gaps(pool, G, cnt, side, eng, names):
                    gap_notes(p, n, line, side, names[side])
                    if n >= 20 and len(p) <= 2: solo.add(p)   # a frequent first-move gap (the Englund) gets its own chapter
                    if side == 'w':
                        grp = NEW_GROUP if p[0] == 'e4' else "Colle-Koltanowski"
                    else:
                        grp = "Caro-Kann" if p[0] == 'e4' or (len(p) >= 3 and p[2] == 'e4') else "Semi-Slav"
                    say(f"- {movetext(list(p))} ({names[side].get(p, 'no name')}, {n} games): {movetext([line[0]['m']], len(p))}")
                    add_line(forests.setdefault((side, grp), []), list(p), line)
            hand_notes(forests, eng)
            for (side, grp), forest in forests.items():
                say(f"\n### Gap chapters: {grp}\n")
                merge({'side': side, 'name': 'games', 'tree': forest}, pool, grp, cnt, gapt, used_ids, names, solo)
                pool = trees + new + made + gapt
        finally:
            eng.quit()

    cur = doc.get('settings', {}).get('curriculum', '')
    if cur and '# Vienna & 1.e4 repertoire' not in cur:
        block = ("# Vienna & 1.e4 repertoire [vault] | vienna, e4\n"
                 "## The Vienna: 2.Nc3 [free] | vienna, opening | #openings\n"
                 "## The Sicilian with 2.a3 | sicilian, opening | #openings\n"
                 "## The Lanckriet System against the Caro-Kann | caro-kann, opening | #openings\n"
                 "## The Papa-Ticulat Gambit against the French | french, opening, gambit | #openings\n"
                 "## Alekhine, Modern, Pirc, Philidor, Scandinavian and the rest | opening | #openings\n\n")
        i = cur.find('# Caro-Kann repertoire')
        doc['settings']['curriculum'] = cur[:i] + block + cur[i:] if i >= 0 else cur + '\n\n' + block
    for t in trees + new + made + gapt:
        if t['id'] in TITLES: t['title'] = TITLES[t['id']]
    groups = doc['lists']['groups']
    if not any(g['name'] == NEW_GROUP for g in groups):
        i = next((k for k, g in enumerate(groups) if g['name'] == 'Colle-Koltanowski'), 0)
        groups.insert(i + 1, {"name": NEW_GROUP, "side": "w", "intro": NEW_GROUP_INTRO})
    # new trees go right after the last tree of their group
    for t in new + made + gapt:
        idx = max((k for k, x in enumerate(trees) if x['group'] == t['group']), default=len(trees) - 1)
        trees.insert(idx + 1, t)
    after = sum(1 for t in trees for _ in walk(t['tree']))
    say(f"\n## Totals\n\nMoves in all trees: {before} -> {after}. New chapters: {len(new) + len(made) + len(gapt)}.")
    os.makedirs(os.path.dirname(a.report) or '.', exist_ok=True)
    open(a.report, 'w', encoding='utf-8').write("\n".join(REPORT) + "\n")
    if a.write:
        open(a.content, 'w', encoding='utf-8').write(json.dumps(doc, ensure_ascii=False, indent=1) + "\n")
        print("written", a.content)


if __name__ == '__main__':
    main()
