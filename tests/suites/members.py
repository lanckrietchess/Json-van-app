import subprocess, os, time, json, threading, hashlib, re as _re
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
B = 'http://127.0.0.1:8765/index.html'; SRV = 'http://127.0.0.1:8787'; TOKEN = 'e2e-admin-token-0123456789'; KEY = 'LC-E2E-VAULT-1'; KEY2 = 'LC-E2E-OLD-MEMBER-7'
H = lambda k: hashlib.sha256(('lc-key|' + k.upper()).encode()).hexdigest()
LAST = {}
class Fake(BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get('content-length', 0)); body = json.loads(self.rfile.read(n) or b'{}')
        LAST['headers'] = {k.lower(): v for k, v in self.headers.items()}; LAST['body'] = body
        q = body['messages'][-1]['content'] if body.get('messages') else ''
        out = json.dumps({'content': [{'type': 'text', 'text': 'Coach (test): I read "' + q[:40] + '". Checks first.'}], 'usage': {'input_tokens': 900, 'output_tokens': 30}}).encode()
        self.send_response(200); self.send_header('content-type', 'application/json'); self.send_header('content-length', str(len(out))); self.end_headers(); self.wfile.write(out)
    def log_message(self, *a): pass
fake = ThreadingHTTPServer(('127.0.0.1', 8799), Fake); threading.Thread(target=fake.serve_forever, daemon=True).start()
envv = dict(os.environ, PORT='8787', ADMIN_TOKEN=TOKEN, ANTHROPIC_API_KEY='sk-e2e', ANTHROPIC_URL='http://127.0.0.1:8799/v1/messages', MEMBER_KEYS=json.dumps([{'tier': 'vault', 'sha256': H(KEY2), 'label': 'pre-server member'}, {'tier': 'vault', 'sha256': H(KEY), 'label': 'E2E member'}]))
srv = subprocess.Popen(['node', 'test/serve.mjs'], cwd=REPO + '/server', env=envv, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
_real_mkctx = mkctx
def mkctx(*a, **k):
    c = _real_mkctx(*a, **k); c.route(_re.compile(r'^http://127\.0\.0\.1:8787/'), lambda r: r.continue_()); return c
def boot(pg, name):
    pg.goto(B + '#home'); pg.wait_for_timeout(700); pg.wait_for_function('!Site.pending()', timeout=20000)
    pg.evaluate("([u, n]) => { V5Doc.apply({ server: { url: u } }); App.profile.name = n; App.save(); }", [SRV, name])
def shot(pg, sel, name, maxh=1000):
    box = pg.evaluate("(s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }; }", sel)
    box['height'] = min(box['height'], maxh); pg.screenshot(path=SHOTS + '/' + name, full_page=True, clip=box)
def ask(pg): return pg.evaluate("AI.chat('coachPaid', [{ role: 'user', content: 'Is Nd6 mate?' }], { fen: 'x' }).then((r) => 'answered: ' + r.text.slice(0, 32), (e) => 'refused: ' + e.reason)")
pub = json.load(open(FIX + '/published.json', encoding='utf-8')); pub['keys'] = (pub.get('keys') or []) + [{'tier': 'vault', 'sha256': H(KEY2), 'label': 'pre-server member'}]; PUB = json.dumps(pub)
def ctx_pub():
    c = mkctx(br, 1280, 900); c.route('https://raw.githubusercontent.com/**', (lambda b: (lambda route: route.fulfill(status=200, content_type='application/json', body=b)))(PUB)); return c
try:
  with sync_playwright() as p:
    br = p.chromium.launch()
    try:
        cd = ctx_pub(); pd = cd.new_page(); watch(pd, 'D')
        pd.goto(B + '#home'); pd.wait_for_timeout(700); pd.wait_for_function('!Site.pending()', timeout=20000)
        out('before the server: unlocked on the device [ok, tier, remote]', pd.evaluate("(k) => Access.accept(k, 'manual').then((r) => [r.ok, App.access.tier, !!App.access.remote])", KEY2))
        pd.evaluate("(u) => { V5Doc.apply({ server: { url: u } }); App.access.checkedAt = ''; App.save(); window.__toasts = []; const t = window.toast; }", SRV)
        out('server goes live, weekly check [result, tier kept]', pd.evaluate("Access.recheckRemote().then((why) => [why, App.access.tier])"))
        out('AI coach on this device', ask(pd))
        pd.evaluate("(u) => { App.access.key = ''; App.save(); }", SRV)
        out('a device that only kept the hash: weekly check [result, tier kept]', pd.evaluate("(() => { App.access.checkedAt = ''; App.save(); return Access.recheckRemote().then((why) => [why, App.access.tier]); })()"))
        pd.evaluate("location.hash = '#trim'"); pd.wait_for_selector('#coach', timeout=15000); pd.wait_for_timeout(600)
        inp = '#coach form input[type="text"], #coach form textarea, #coach form input:not([type])'
        pd.fill(inp, 'What does 5.Qe2 threaten here?'); pd.press(inp, 'Enter')
        pd.wait_for_function("[...document.querySelectorAll('#coach-chat .msg-bot:not(.typing)')].length >= 2", timeout=15000); pd.wait_for_timeout(400)
        out('what the member reads in the coach', pd.evaluate("(() => { const m = [...document.querySelectorAll('#coach-chat .msg-bot:not(.typing)')]; return m[m.length - 1].innerText.slice(0, 150); })()"))
        out('re-enter the key [ok, tier]', pd.evaluate("(k) => Access.accept(k, 'manual').then((r) => [r.ok, App.access.tier])", KEY2))
        out('AI coach after connecting', ask(pd))
        out('weekly check after connecting', pd.evaluate("(() => { App.access.checkedAt = ''; App.save(); return Access.recheckRemote().then((why) => [why, App.access.tier]); })()"))
        ce = ctx_pub(); pe = ce.new_page(); watch(pe, 'E')
        pe.goto(B + '#home'); pe.wait_for_timeout(700); pe.wait_for_function('!Site.pending()', timeout=20000)
        pe.evaluate("(u) => V5Doc.apply({ server: { url: u } })", SRV)
        out('a second device with the same key [ok, message]', pe.evaluate("(k) => Access.accept(k, 'manual').then((r) => [r.ok, (r.message || '').slice(0, 90)])", KEY2))
    except Exception as e: out('FAIL', repr(e)[:500])
    br.close()
finally:
    srv.terminate(); fake.shutdown()
print('ERRORS', len([e for e in errs if '404' not in e])); [print(' ', e[:300]) for e in errs if '404' not in e][:8]
