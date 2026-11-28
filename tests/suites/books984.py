# books984 (9.84.0): e-books in a private bucket and the legal pages. LC70.signBook turns a stored lc78-books address into a signed
# link of one hour (Storage's /object/sign, stubbed here) and leaves any other address alone; a failed signing keeps the plain address.
# The landing footer shows Privacy / Terms / Delete my data outside the CMS; terms.html and privacy.html carry the sections the
# Meta and TikTok app reviews look for. Real Chromium, 390x844; Supabase stubbed.
import json as _json
APP = 'http://127.0.0.1:8765/app.html'
SB = 'https://wllljllajadiwjdsageu.supabase.co'
SIGN = {'calls': [], 'ok': True}
def sb(r):
    u = r.request.url
    if '/storage/v1/object/sign/lc78-books/' in u:
        SIGN['calls'].append([u.split('/object/sign/')[1], r.request.method, _json.loads(r.request.post_data or '{}').get('expiresIn')])
        if not SIGN['ok']: return r.fulfill(status=400, content_type='application/json', body='{"statusCode":"404","error":"not_found"}')
        return r.fulfill(status=200, content_type='application/json', body=_json.dumps({'signedURL': '/object/sign/lc78-books/' + u.split('/lc78-books/')[1] + '?token=abc'}))
    return r.fulfill(status=200, content_type='application/json', body='{"ok":false,"error":"stub"}')
with sync_playwright() as p:
    br = p.chromium.launch()
    c = mkctx(br, 390, 844, True); pg = c.new_page(); watch(pg, 'books984'); pg.route(SB + '/**', sb)
    pg.goto(APP + '#home'); pg.wait_for_timeout(2600)
    pub = SB + '/storage/v1/object/public/lc78-books/roadmap-2000/abc-123.pdf'
    out('signBook [signed, one hour, the path], [other address unchanged]', [pg.evaluate("u => LC70.signBook(u)", pub), SIGN['calls'], pg.evaluate("LC70.signBook('https://example.com/book.pdf')")])
    SIGN['ok'] = False
    out('signBook refused [the plain address stays]', pg.evaluate("u => LC70.signBook(u)", pub) == pub)
    pg.goto('http://127.0.0.1:8765/'); pg.wait_for_timeout(1500)
    out('landing footer [legal links outside the CMS]', pg.evaluate("[...document.querySelectorAll('footer .lc-legal a')].map(a => a.getAttribute('href'))"))
    pg.goto('http://127.0.0.1:8765/terms.html'); pg.wait_for_timeout(300)
    out('terms [title, sections, contact, withdrawal, content licence]', pg.evaluate("[document.querySelector('h1').textContent, document.querySelectorAll('h2').length, /lanckrietchess@gmail\\.com/.test(document.body.innerText), /Right of withdrawal/.test(document.body.innerText), /may not copy, scrape/.test(document.body.innerText)]"))
    pg.goto('http://127.0.0.1:8765/privacy.html'); pg.wait_for_timeout(300)
    out('privacy [Instagram / TikTok section, processors, rights + deletion link, authority, contact e-mail]', pg.evaluate("[/Instagram, TikTok and our other channels/.test(document.body.innerText), /processors/.test(document.body.innerText), !!document.querySelector('a[href=\"/delete-account.html\"]'), /Gegevensbeschermingsautoriteit/.test(document.body.innerText), !!document.querySelector('a[href=\"mailto:lanckrietchess@gmail.com\"]')]"))
    out('embedded [lc70 / lc75 / lc77 equal their files, build]', pg.evaluate("""(async () => { const html = await (await fetch('app.html')).text(); const same = async n => { const src = (await (await fetch(n + '.js')).text()).trim(), a = html.indexOf('/*@@module ' + n + '*/'), b = html.indexOf('/*@@end ' + n + '*/') + ('/*@@end ' + n + '*/').length; return html.slice(a, b) === src };
      return [await same('lc70'), await same('lc75'), await same('lc77'), (html.match(/CONFIG=\\{version:"([^"]+)"/) || [])[1]]; })()"""))
    c.close(); br.close()
print('ERRORS', len([e for e in errs if 'Failed to load resource' not in e]))
for e in errs:
    if 'Failed to load resource' not in e: print(e)
