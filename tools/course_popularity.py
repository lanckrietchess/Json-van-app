#!/usr/bin/env python3
# tools/course_popularity.py (9.73.0): how often every branch of the opening courses is played, from the Lichess opening explorer.
#
#   python3 tools/course_popularity.py fetch [--content content.json] [--out tools/course_popularity.json]
#       env LICHESS_TOKEN (the players' database needs a Lichess token since 2025; the masters database does not)
#   python3 tools/course_popularity.py apply [--content content.json] [--pop tools/course_popularity.json] [--base FILE] [--write]
#
# fetch: every position of the four opening courses where the tree branches (or a chapter starts), up to move 15, is asked
#   twice: the Lichess players' database, rated 1000-1800 (blitz, rapid, classical: the "under 2000" players the app is for), and
#   the masters database (2200+ over the board). Results are cached in the --out file, so a re-run only asks what is new; the
#   workflow "Course popularity (Lichess)" runs it and commits the file to the branch.
# apply (what the players then see):
#   1. inside every chapter, the replies of the OPPONENT are ordered by how often players under 2000 play them (masters break a
#      tie and decide where the players' database has no games); Kyenzo's own moves keep his order (his first move stays his main
#      move). Walking a chapter from the top, and "Train now" (the first line not yet trained), therefore reach the most popular
#      line first and the niche lines last.
#   2. the chapters of a course are ordered by how often their start position is reached (players' database first).
#   3. levels, only for the lines added in 9.72.0 (--base = content.json before them; Kyenzo's earlier lines keep his levels):
#      a reply played in at least 15 % of the players' games stays on its parent's level, 4-15 % goes up one, rarer goes up two,
#      and a reply that masters play (>= 10 %) but club players hardly do (< 4 %) goes to Level 5 (Master).
import argparse, json, os, sys, time, urllib.parse, urllib.request, urllib.error
import chess

GROUPS = ["Vienna & 1.e4", "Colle-Koltanowski", "Caro-Kann", "Semi-Slav"]
LICHESS = "https://explorer.lichess.ovh/lichess"
MASTERS = "https://explorer.lichess.ovh/masters"
RATINGS = "1000,1200,1400,1600,1800"
MAX_PLY = 30
UA = "LanckrietChessTrainingHub/1.0 (+https://lanckrietchesstrainerhub.vercel.app)"


def key_of(b):
    return " ".join(b.fen().split()[:4])


def path_moves(text):
    import re
    out = []
    for t in re.sub(r"\d+\.(\.\.)?", " ", text or "").split():
        if not re.fullmatch(r"[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|O-O(-O)?[+#]?", t): break
        out.append(t)
    return out


def positions(doc):
    """Branch positions (and chapter starts) of the opening courses: {key: fen}."""
    want = {}
    for t in doc["trees"]:
        if t["group"] not in GROUPS: continue
        def rec(ns, b, ply):
            if (len(ns) >= 2 or ply <= 2) and ply <= MAX_PLY: want.setdefault(key_of(b), b.fen())
            for o in ns:
                b.push_san(o["m"]); rec(o.get("c", []), b, ply + 1); b.pop()
        rec(t["tree"], chess.Board(), 0)
        b = chess.Board()
        try:
            for m in path_moves(t["path"]): b.push_san(m)
        except Exception: pass
        want.setdefault(key_of(b), b.fen())
    return want


def ask(url, params, token, tries=6):
    q = url + "?" + urllib.parse.urlencode(params)
    for i in range(tries):
        req = urllib.request.Request(q, headers={"User-Agent": UA, "Accept": "application/json"})
        if token: req.add_header("Authorization", "Bearer " + token)
        try:
            with urllib.request.urlopen(req, timeout=40) as r: return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(65); continue
            if e.code in (401, 403): return {"_error": e.code}
            time.sleep(3 + 4 * i)
        except Exception:
            time.sleep(3 + 4 * i)
    return {"_error": "no answer"}


def slim(r):
    if not isinstance(r, dict) or "_error" in r: return None
    tot = r.get("white", 0) + r.get("draws", 0) + r.get("black", 0)
    return {"n": tot, "m": {m["san"]: m["white"] + m["draws"] + m["black"] for m in r.get("moves", [])}}


def fetch(a):
    doc = json.load(open(a.content, encoding="utf-8"))
    cache = json.load(open(a.out)) if os.path.exists(a.out) else {"v": 1, "pos": {}}
    want = positions(doc)
    token = os.environ.get("LICHESS_TOKEN", "").strip()
    todo = [k for k in want if k not in cache["pos"] or cache["pos"][k].get("l") is None and token]
    print(f"{len(want)} positions, {len(todo)} to ask, token: {'yes' if token else 'no'}", flush=True)
    if not token: print("WARNING: no LICHESS_TOKEN secret: only the masters database is asked (the players' database needs a token)", flush=True)
    errs = {"l": 0, "m": 0}
    for i, k in enumerate(todo):
        fen = want[k]
        row = cache["pos"].get(k, {})
        if row.get("l") is None:
            r = ask(LICHESS, {"variant": "standard", "speeds": "blitz,rapid,classical", "ratings": RATINGS, "fen": fen,
                              "moves": 30, "topGames": 0, "recentGames": 0}, token)
            row["l"] = slim(r)
            if row["l"] is None: errs["l"] += 1
            time.sleep(0.6)
        if "m" not in row:
            row["m"] = slim(ask(MASTERS, {"fen": fen, "moves": 30, "topGames": 0}, None))
            if row["m"] is None: errs["m"] += 1
            time.sleep(0.6)
        cache["pos"][k] = row
        if i % 40 == 39:
            json.dump(cache, open(a.out, "w"), separators=(",", ":"))
            print(f"  {i + 1} / {len(todo)}  errors {errs}", flush=True)
    cache["built"] = int(time.time()); cache["ratings"] = RATINGS
    json.dump(cache, open(a.out, "w"), separators=(",", ":"))
    print("done", errs, flush=True)


# ---------------------------------------------------------------- apply
def pop_of(cache, b, san):
    row = cache.get(key_of(b)) or {}
    l, m = row.get("l") or {}, row.get("m") or {}
    return (l.get("m", {}).get(san, 0), m.get("m", {}).get(san, 0), l.get("n", 0), m.get("n", 0))


def reach(cache, b):
    row = cache.get(key_of(b)) or {}
    return ((row.get("l") or {}).get("n", 0), (row.get("m") or {}).get("n", 0))


def apply(a):
    doc = json.load(open(a.content, encoding="utf-8"))
    cache = json.load(open(a.pop))["pos"]
    base = set()
    if a.base:
        for t in json.load(open(a.base, encoding="utf-8"))["trees"]:
            def walk(ns, pre):
                for o in ns:
                    p = pre + (o["m"],); base.add((t["id"], p)); walk(o.get("c", []), p)
            walk(t["tree"], ())
    moved = relev = 0
    for t in doc["trees"]:
        if t["group"] not in GROUPS: continue
        side = t["side"]
        def rec(ns, b, pre, parent_l):
            nonlocal moved, relev
            mover = "w" if b.turn == chess.WHITE else "b"
            if mover != side and len(ns) >= 2:
                order = sorted(ns, key=lambda o: (-pop_of(cache, b, o["m"])[0], -pop_of(cache, b, o["m"])[1]))
                if [o["m"] for o in order] != [o["m"] for o in ns]: moved += 1
                ns[:] = order
            for o in ns:
                p = pre + (o["m"],)
                L = o.get("l", parent_l)
                if mover != side and (t["id"], p) not in base and a.base:
                    pl, pm, nl, nm = pop_of(cache, b, o["m"])
                    sl = pl / nl if nl >= 200 else None
                    sm = pm / nm if nm >= 50 else None
                    if sl is not None or sm is not None:
                        bump = 0 if (sl or 0) >= 0.15 else 1 if (sl or 0) >= 0.04 else 2
                        new = min(5, parent_l + bump)
                        if sm is not None and sm >= 0.10 and (sl is None or sl < 0.04): new = 5
                        if new != L:
                            relev += 1
                            if new == parent_l: o.pop("l", None)
                            else: o["l"] = new
                            L = new
                b.push_san(o["m"]); rec(o.get("c", []), b, p, L); b.pop()
        rec(t["tree"], chess.Board(), (), 1)
        for k in (4, 5):
            if not any(L["k"] == k for L in t["levels"]) and any(o.get("l") == k for o in iter_nodes(t["tree"])):
                t["levels"].append({"k": k, "rt": 2}); t["levels"].sort(key=lambda x: x["k"])
    # chapter order inside every course: how often the chapter's start position is reached
    def start_reach(t):
        """Games that reach the chapter's own lines: follow the single road from move 1; at the first branch, add the games
        of every reply the chapter holds there (a chapter of rare second moves ranks by those rare moves, not by 1.e4 c6)."""
        b, ns, score = chess.Board(), t["tree"], (0, 0)
        while ns:
            if len(ns) >= 2:
                tot = [pop_of(cache, b, o["m"]) for o in ns]
                return (sum(x[0] for x in tot), sum(x[1] for x in tot)) if any(x[0] or x[1] for x in tot) else score
            o = ns[0]
            pl, pm, nl, nm = pop_of(cache, b, o["m"])
            if key_of(b) in cache: score = (pl, pm)
            b.push_san(o["m"]); ns = o.get("c", [])
        return score
    trees = doc["trees"]
    for g in GROUPS:
        idx = [i for i, t in enumerate(trees) if t["group"] == g]
        chs = [trees[i] for i in idx]
        sc = {t['id']: start_reach(t) for t in chs}
        chs.sort(key=lambda t: (-sc[t['id']][0], -sc[t['id']][1]))
        for i, t in zip(idx, chs): trees[i] = t
    print(f"opponent replies reordered at {moved} positions, levels changed on {relev} new lines")
    if a.write:
        open(a.content, "w", encoding="utf-8").write(json.dumps(doc, ensure_ascii=False, indent=1) + "\n")
        print("written", a.content)


def iter_nodes(ns):
    for o in ns:
        yield o
        yield from iter_nodes(o.get("c", []))


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("mode", choices=["fetch", "apply"])
    ap.add_argument("--content", default="content.json"); ap.add_argument("--out", default="tools/course_popularity.json")
    ap.add_argument("--pop", default="tools/course_popularity.json"); ap.add_argument("--base", default="")
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    fetch(a) if a.mode == "fetch" else apply(a)
