#!/usr/bin/env python3
# tools/opening_paths.py (9.73.0): "Master one opening": which middlegame and endgame lessons each opening course needs,
# measured in Kyenzo's own games, written to data/opening-paths.json (read by LC105, page #opening-path).
#
#   python3 tools/opening_paths.py --games DIR_WITH_games-*.json_and_puzzles-*.json [--content content.json] [--write]
#
# Per course (Vienna & 1.e4 and Colle-Koltanowski with White, Caro-Kann and Semi-Slav with Black; a game belongs to a course by
# its first moves). Output: data/opening-paths.json (a small file next to the app; the app's content feed keeps only its own
# lists, so this is not in content.json):
#   middlegame  the pawn structure at move 15 (the tests of tools/middlegame_plans.py); every structure that at least 3 % of
#               that course's games reach points to the lesson that teaches it, with the count as the reason ("312 of my
#               Caro-Kann games"). The basic lessons every opening needs come first.
#   endgame     the first endgame position of every game (queens off, at most a rook and a minor piece each, or fewer pieces):
#               rook / pawn / minor-piece / opposite-coloured bishops / queen / rook-and-minor endings, each pointing to its
#               lessons and drills, ordered by how often that course reaches it.
#   positions   up to 40 middlegame and 40 endgame positions from that course's games where Kyenzo found the only good move
#               (great / brilliant / punish), for "Train the middlegames of my games" (LC95, sessionStorage lc95-open {ids}).
# Nothing in the lessons changes: this only links them.
import argparse, collections, glob, json, os, re, sys
import chess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import middlegame_plans as MP

COURSES = [("Vienna & 1.e4", "w"), ("Colle-Koltanowski", "w"), ("Caro-Kann", "b"), ("Semi-Slav", "b")]
BASE_MG = ["mg-ch-t0-01-l1", "mg-ch-t0-02-l1", "mg-ch-t0-05-l1", "mg-planning-l1", "mg-ch-t1-05-l2"]
STRUCT_MG = {
    "iqp-mine": ["mg-ch-t2-03-l3"], "iqp-theirs": ["mg-ch-t2-03-l3", "mg-ch-t2-05-l3"], "hanging-mine": ["mg-ch-t2-04-l3"],
    "hanging-theirs": ["mg-ch-t2-04-l3"], "carlsbad": ["mg-ch-t2-02-l3"], "minority": ["mg-ch-t2-02-l3"],
    "chain-e5": ["mg-ch-t2-07-l3"], "f-file": ["mg-ch-t1-04-l2", "mg-ch-t1-03-l2"], "opposite": ["mg-ch-t3a-06-l4", "mg-ch-t1-03-l2"],
    "stonewall": ["mg-ch-t2-05-l3"], "doubled-g": ["mg-ch-t2-05-l3"], "open-centre": ["mg-ch-t2-08-l3"], "queenless": ["mg-transitions-l5"],
}
BASE_EG = ["eg-bp-laws-l1", "eg-bp-wincondition-l1", "eg-bp-mates-l1", "eg-bp-principles-l1", "eg-bp-conversion-l2"]
EG_TYPES = {
    "rook": ("Rook endings", ["eg-bp-rook-l2", "eg-bp-rook-l3", "eg-bp-rook-l4"], ["eg-bp-rook"]),
    "pawn": ("King and pawn endings", ["eg-bp-square-l1", "eg-bp-opposition-l2", "eg-bp-opposition-l3", "eg-bp-passers-l2", "eg-bp-passers-l3"], ["eg-bp-square", "eg-bp-opposition", "eg-bp-passers"]),
    "minor": ("Bishop and knight endings", ["eg-bp-bishop-knight-l2", "eg-bp-bishop-knight-l3", "eg-bp-bishop-knight-l4"], ["eg-bp-bishop-knight"]),
    "opposite": ("Opposite-coloured bishops", ["eg-bp-opposite-l3"], ["eg-bp-opposite"]),
    "queen": ("Queen endings", ["eg-bp-queen-l2", "eg-bp-queen-l4"], ["eg-bp-queen"]),
    "rook-minor": ("Rook and minor piece endings", ["eg-bp-pieces-vs-l3", "eg-bp-conversion-l3"], ["eg-bp-pieces-vs", "eg-bp-conversion"]),
}

def course_of(color, sans):
    if len(sans) < 2: return None
    if color == "w":
        return "Vienna & 1.e4" if sans[0] == "e4" else "Colle-Koltanowski" if sans[0] in ("d4", "Nf3") else None
    black = sans[1::2][:2]
    if "c6" not in black: return None
    return "Caro-Kann" if "e4" in sans[:3:2] else "Semi-Slav"

def eg_type(b):
    def kinds(c): return {p: len(b.pieces(p, c)) for p in (chess.QUEEN, chess.ROOK, chess.BISHOP, chess.KNIGHT)}
    w, k = kinds(chess.WHITE), kinds(chess.BLACK)
    if w[chess.QUEEN] or k[chess.QUEEN]:
        return "queen" if sum(w.values()) + sum(k.values()) <= 2 else None
    rw, rk = w[chess.ROOK], k[chess.ROOK]
    mw, mk = w[chess.BISHOP] + w[chess.KNIGHT], k[chess.BISHOP] + k[chess.KNIGHT]
    if rw > 1 or rk > 1 or mw > 1 and rw or mk > 1 and rk or mw > 2 or mk > 2: return None
    if not rw and not rk and not mw and not mk: return "pawn"
    if (rw or rk) and not mw and not mk: return "rook"
    if (rw or rk) and (mw or mk): return "rook-minor"
    if w[chess.BISHOP] == 1 and k[chess.BISHOP] == 1 and not w[chess.KNIGHT] and not k[chess.KNIGHT]:
        sq = lambda c: next(iter(b.pieces(chess.BISHOP, c)))
        if (chess.square_file(sq(chess.WHITE)) + chess.square_rank(sq(chess.WHITE))) % 2 != (chess.square_file(sq(chess.BLACK)) + chess.square_rank(sq(chess.BLACK))) % 2:
            return "opposite"
    return "minor"

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--games", required=True); ap.add_argument("--content", default="content.json")
    ap.add_argument("--write", action="store_true"); ap.add_argument("--out", default="data/opening-paths.json")
    a = ap.parse_args()
    G = []
    for f in sorted(glob.glob(os.path.join(a.games, "games-*.json"))): G += json.load(open(f))
    P = []
    for f in sorted(glob.glob(os.path.join(a.games, "puzzles-*.json"))): P += json.load(open(f))
    doc = json.load(open(a.content, encoding="utf-8"))
    lessons = {x["id"]: x for x in doc["lists"]["courses.middlegame"] + doc["lists"]["courses.endgame"]}
    drills = doc["lists"]["endgame"]
    n = collections.Counter(); st = collections.defaultdict(collections.Counter); eg = collections.defaultdict(collections.Counter)
    game_course = {}
    for g in G:
        toks = MP.parse(g["pgn"]); b = chess.Board(); sans = []; at30 = None; first_eg = None
        for i, t in enumerate(toks):
            try: mv = b.parse_san(t)
            except Exception: break
            sans.append(b.san(mv)); b.push(mv)
            if b.ply() == 30: at30 = b.copy()
            if first_eg is None and b.ply() >= 20:
                e = eg_type(b)
                if e: first_eg = e
        c = course_of(g["color"], sans)
        if not c: continue
        game_course[str(g["id"])] = c; n[c] += 1
        if at30 is not None:
            me = chess.WHITE if g["color"] == "w" else chess.BLACK
            for sid, name, test, kw in MP.STRUCTURES:
                if test(at30, me): st[c][sid] += 1
        if first_eg: eg[c][first_eg] += 1
    names = {sid: name for sid, name, _, _ in MP.STRUCTURES}
    out = []
    for course, side in COURSES:
        tot = n[course]
        if not tot: continue
        mg = [{"id": i, "why": "Every opening needs it."} for i in BASE_MG if i in lessons]
        seen = {x["id"] for x in mg}
        for sid, k in st[course].most_common():
            if k < 0.03 * tot: continue
            for lid in STRUCT_MG.get(sid, []):
                if lid not in lessons: continue
                why = f"{k} of my {tot} {course} games reach it at move 15: {names[sid][0].lower() + names[sid][1:]}."
                if lid in seen:
                    for x in mg:
                        if x["id"] == lid and "Every opening" not in x["why"] and len(x["why"]) < 260: x["why"] += " Also: " + names[sid][0].lower() + names[sid][1:] + f" ({k})."
                    continue
                mg.append({"id": lid, "why": why, "n": k}); seen.add(lid)
        egl = [{"id": i, "why": "Every opening needs it."} for i in BASE_EG if i in lessons]
        egd = []
        etot = sum(eg[course].values())
        for t, k in eg[course].most_common():
            label, lids, topics = EG_TYPES[t]
            pct = round(100 * k / etot) if etot else 0
            for lid in lids:
                if lid in lessons and lid not in [x["id"] for x in egl]:
                    egl.append({"id": lid, "why": f"{label}: {pct}% of the endgames in my {course} games ({k}).", "n": k})
            egd += [d["id"] for d in drills if d.get("topicId") in topics and d["id"] not in egd]
        def ids(phase):
            rows = [p for p in P if game_course.get(str(p["game_id"])) == course and p["phase"] == phase and p["kind"] in ("great", "brilliant", "punish")]
            rows.sort(key=lambda p: ({"brilliant": 0, "great": 1, "punish": 2}[p["kind"]], -int(p.get("my_rating") or 0)))
            used, keep = set(), []
            for p in rows:
                if p["game_id"] in used: continue
                used.add(p["game_id"]); keep.append(p["id"])
                if len(keep) >= 40: break
            return keep
        out.append({"group": course, "side": side, "games": tot, "mg": mg, "eg": egl, "egDrills": egd[:80],
                    "mgStructures": [{"id": s, "name": names[s], "n": k} for s, k in st[course].most_common() if k >= 0.03 * tot],
                    "egTypes": [{"id": t, "name": EG_TYPES[t][0], "n": k} for t, k in eg[course].most_common()],
                    "mgIds": ids("middlegame"), "egIds": ids("endgame")})
        print(course, tot, "games |", len(mg), "middlegame lessons |", len(egl), "endgame lessons |", len(egd), "endgame drills |",
              len(out[-1]["mgIds"]), "/", len(out[-1]["egIds"]), "of my positions")
    if a.write:
        os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
        titles = {i: lessons[i]["title"] for c in out for x in c["mg"] + c["eg"] for i in [x["id"]]}
        open(a.out, "w", encoding="utf-8").write(json.dumps({"v": 1, "courses": out, "titles": titles}, ensure_ascii=False, indent=1) + "\n")
        print("written", a.out)

if __name__ == "__main__":
    main()
