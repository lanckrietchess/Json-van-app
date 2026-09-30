import json as _json, tempfile as _tf
_tmp = _tf.mkdtemp()
_V5 = {'tournament': {'on': True, 'metric': 'trim', 'title': 'Trim Week', 'prizes': [5, 2, 1], 'minPlayers': 2}, 'server': {'url': 'https://lanckriet-arena.example.workers.dev'}, 'framework': {'letters': {'M': {'name': 'Move!', 'text': 'What changed?'}}}, 'faq': [{'q': 'How do I join?', 'a': 'Tap Upgrades.', 'tier': 'free'}], 'sales': {'manychat': 'https://ig.me/m/lanckrietchess', 'keyword': 'MSPC'}}
_pub = _json.load(open(FIX + '/published.json', encoding='utf-8')); _feed = _json.load(open(FIX + '/content-feed.json', encoding='utf-8'))
for _n, _d in (('fmt_hub.json', dict(_pub, v5=_V5)), ('fmt_feed_v5.json', dict(_feed, v5=_V5)), ('fmt_feed.json', _feed)): _json.dump(_d, open(_tmp + '/' + _n, 'w'))
FMT_FILES = [('admin-published hub file + v5', _tmp + '/fmt_hub.json'), ('your real content.json + v5', _tmp + '/fmt_feed_v5.json'), ('your real content.json as it is', _tmp + '/fmt_feed.json')]
PROBE = "[JSON.stringify(V5Doc.tournament()), (V5Doc.server() || {}).url || '-', MSPC_NAME.M, V5Doc.faq('free').length, (V5Doc.sales() || {}).keyword || '-', (CONTENT.think || []).length, Trees.list ? Trees.list().length : '?', Tourney.cfg().title]"
with sync_playwright() as p:
    br = p.chromium.launch()
    for label, path in FMT_FILES:
        try:
            body = open(path, encoding='utf-8').read()
            c = mkctx(br, 1280, 900); c.route('https://raw.githubusercontent.com/**', (lambda b: (lambda route: route.fulfill(status=200, content_type='application/json', body=b)))(body))
            pg = c.new_page(); watch(pg, label[:10])
            pg.goto('http://127.0.0.1:8765/index.html#think'); pg.wait_for_timeout(900); pg.wait_for_function('!Site.pending()', timeout=20000); pg.wait_for_timeout(600)
            out(label + ' [tournament, server, M name, faqs, manychat kw, think items, trees, cup title]', pg.evaluate(PROBE))
            c.close()
        except Exception as e: out('FAIL ' + label, repr(e)[:300])
    c = mkctx(br, 1280, 900); c.grant_permissions(['clipboard-read', 'clipboard-write'], origin='http://127.0.0.1:8765'); pg = c.new_page(); watch(pg, 'copy')
    pg.goto('http://127.0.0.1:8765/index.html#home'); pg.wait_for_timeout(800); pg.wait_for_function('!Site.pending()', timeout=20000)
    pg.evaluate("Object.defineProperty(Admin, 'active', { get: () => true, configurable: true }); const d = Admin.ensureDraft(); d.v5 = V5Doc.clean({ tournament: { title: 'Copy Test', prizes: [4, 0, 0] }, server: { url: 'https://arena.example.workers.dev' } }); Admin.saveDraft(d); V5Admin.arena();")
    pg.wait_for_selector('[data-v5ar-copy]', timeout=5000); pg.click('[data-v5ar-copy]'); pg.wait_for_timeout(500)
    clip = pg.evaluate("navigator.clipboard.readText()")
    ok = False
    try: import json as _j; ok = _j.loads('{' + clip.rstrip(',') + '}')['v5']['tournament']['title'] == 'Copy Test'
    except Exception as e: clip = clip + ' / ' + repr(e)
    out('copy the v5 section [valid JSON when pasted, starts with]', [ok, clip[:60]])
    br.close()
print('ERRORS', len([e for e in errs if '404' not in e])); [print(' ', e[:300]) for e in errs if '404' not in e][:8]
