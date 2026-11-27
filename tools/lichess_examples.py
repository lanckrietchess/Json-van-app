#!/usr/bin/env python3
# tools/lichess_examples.py (9.77.0): the Lichess database part of tools/course_examples.py, run by the workflow
# "Course examples (Lichess)" (.github/workflows/course-examples.yml) because this machine cannot reach Lichess.
#
#   python3 tools/lichess_examples.py [--out tools/lichess_examples.json] [--minutes 150] [--depth 16]
#
# Source: the official Lichess puzzle database (database.lichess.org, CC0): every row is a position from a real rated Lichess
# game with its forced solution, rating and themes. Only the endgame and middlegame rows are read, and only rows that many
# players solved (popularity 50+, 100+ plays). Every row goes through the SAME rule tests as Kyenzo's own games
# (course_examples.detect: the test must say what the move does for the rule), then Stockfish 16 re-checks the candidates
# (course_examples.verify_find: the only good move, the rule's claim) and keeps a few per rule, spread over the ratings.
# Stored per example: the puzzle id, its rating, the position, the line and the engine data. No user names, no game links.
import argparse, collections, csv, io, json, os, random, sys, time, traceback, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import chess
import course_examples as CE

URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst'

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(HERE, 'lichess_examples.json'))
    ap.add_argument('--minutes', type=float, default=150); ap.add_argument('--depth', type=int, default=16)
    ap.add_argument('--engine', default='/usr/games/stockfish'); ap.add_argument('--threads', type=int, default=4)
    ap.add_argument('--file', default='', help='a local copy of the .csv.zst (testing)')
    ap.add_argument('--keep-eg', type=int, default=3); ap.add_argument('--keep-mg', type=int, default=8)
    a = ap.parse_args()
    t0 = time.time(); st = {'ok': False, 'started': time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime()), 'source': URL, 'rows': 0, 'read': 0}
    out = {'status': st, 'endgame': {}, 'middlegame': {}}
    def save():
        st['minutes'] = round((time.time() - t0) / 60, 1)
        json.dump(out, open(a.out, 'w'), separators=(',', ':'))
    try:
        import zstandard
        book = CE.parse_blueprint(os.path.join(CE.ROOT, 'sources', 'endgame-blueprint.md'))
        rule_tier = {}
        for p in book['parts']:
            for rid in CE.all_rule_ids({'parts': [p]}): rule_tier[rid] = CE.RULE_TIER.get(p['id'], 2)
        raw = open(a.file, 'rb') if a.file else urllib.request.urlopen(urllib.request.Request(URL, headers={'User-Agent': 'LanckrietChessTrainingHub/1.0'}), timeout=120)
        text = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(raw), encoding='utf-8')
        rd = csv.reader(text)
        head = next(rd)
        ix = {k: i for i, k in enumerate(head)}
        pool = {'endgame': collections.defaultdict(list), 'middlegame': collections.defaultdict(list)}
        seen = collections.Counter(); rng = random.Random(27); cap = 300
        for row in rd:
            st['rows'] += 1
            if time.time() - t0 > a.minutes * 60: st['stopped'] = 'time budget'; break
            try:
                th = row[ix['Themes']].split()
                grp = 'endgame' if 'endgame' in th else 'middlegame' if 'middlegame' in th else None
                if not grp or int(row[ix['Popularity']]) < 50 or int(row[ix['NbPlays']]) < 100: continue
                mv = row[ix['Moves']].split()
                if len(mv) < 2: continue
                b = chess.Board(row[ix['FEN']]); b.push(chess.Move.from_uci(mv[0]))
                rating = int(row[ix['Rating']])
                meta = {'src': 'lichess', 'phase': grp, 'rating': rating, 'level': CE.rating_tier(rating), 'pid': row[ix['PuzzleId']], 'game': row[ix['PuzzleId']]}
                c = CE.Ctx(b.fen(), mv[1], mv[1:], mv[0], row[ix['FEN']], meta)
                if not c.ok: continue
                st['read'] += 1
                for rule, hits in CE.detect(c, grp).items():
                    for mode, claim, reason, fn in hits:
                        if mode != 'find': continue
                        rec = {'fen': b.fen(), 'best': mv[1], 'line': mv[1:], 'prev': mv[0], 'prev_fen': row[ix['FEN']], 'reason': reason, 'claim': claim,
                               'pid': meta['pid'], 'rating': rating, 'kp_trade': c.meta.get('kp_trade'), 'level': meta['level']}
                        key = (grp, rule); seen[key] += 1; P = pool[grp][rule]
                        if len(P) < cap: P.append(rec)
                        else:
                            j = rng.randrange(seen[key])
                            if j < cap: P[j] = rec
                        break
            except Exception:
                continue
            if st['rows'] % 200000 == 0:
                st['candidates'] = {g: {r: len(v) for r, v in pool[g].items()} for g in pool}
                print('rows', st['rows'], 'read', st['read'], round(time.time() - t0), 's', flush=True)
        st['candidates'] = {g: {r: len(v) for r, v in pool[g].items()} for g in pool}
        st['scan_minutes'] = round((time.time() - t0) / 60, 1)
        save()
        E = CE.Eng(a.engine, a.depth, a.threads)
        for grp in ('endgame', 'middlegame'):
            for rule, P in sorted(pool[grp].items()):
                lvl = rule_tier.get(rule, 2)
                if grp == 'middlegame':
                    lv = {'mg-ch-t0': 0, 'mg-ch-t1': 1, 'mg-ch-t2': 2, 'mg-ch-t3a': 3, 'mg-ch-t3b': 4, 'mg-ch-t3c': 4}
                    lvl = next((v for k, v in lv.items() if rule.startswith(k)), 2)
                rng.shuffle(P)
                P.sort(key=lambda r: abs(r['level'] - lvl))
                keep = a.keep_eg if grp == 'endgame' else a.keep_mg
                got = []
                eng_need = any(r['claim'] in ('threat_made', 'threat_parried', 'threat_parried_quiet') for r in P[:1])
                for r in P[:keep * (12 if eng_need else 4)]:
                    if len(got) >= keep: break
                    c = CE.Ctx(r['fen'], r['best'], r['line'], r['prev'], r['prev_fen'], {'src': 'lichess', 'phase': grp, 'rating': r['rating']})
                    if r.get('kp_trade'): c.meta['kp_trade'] = r['kp_trade']
                    need = r['claim'] if r['claim'] in ('threat_made', 'threat_parried', 'threat_parried_quiet') else None
                    claim = r['claim'] if r['claim'] in ('win', 'draw', 'only') else 'only'
                    try: v = CE.verify_find(E, c, claim, need)
                    except Exception: v = None
                    if not v: continue
                    o = E.an(chess.Board(r['prev_fen']), 1, depth=max(12, a.depth - 4))
                    b1 = chess.Board(r['prev_fen']); b1.push(chess.Move.from_uci(r['prev']))
                    r['line_ok'] = v['line']
                    if c.meta.get('threat'): r['reason'] += ' (If you pass, they ' + ('mate' if c.meta['threat'] == 'mate' else 'win ' + str(c.meta['threat']) + ' points') + '.)'
                    r['engine'] = {'setup': r['prev'], 'P0': b1.fen(), 'ours': v['line'], 'legal': True, 'lines': v['lines'], 'after': v['after'],
                                   'opp': {'best': o[0]['pv'][0].uci() if o[0].get('pv') else None, 'pv': [m.uci() for m in o[0].get('pv', [])[:10]], **CE.white(o[0])}}
                    got.append(r)
                if got: out[grp][rule] = got
                print(grp, rule, len(got), 'of', len(P), '|', E.calls, 'calls |', round(time.time() - t0), 's', flush=True)
                save()
        E.close()
        st['ok'] = True
    except Exception as e:
        st['error'] = repr(e); st['trace'] = traceback.format_exc()[-1500:]
    save()
    print(json.dumps(st)[:2000])

if __name__ == '__main__':
    main()
