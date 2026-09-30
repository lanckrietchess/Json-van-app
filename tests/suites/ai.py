import subprocess, os, time, json, threading, hashlib, re as _re
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
B = 'http://127.0.0.1:8765/index.html'; SRV = 'http://127.0.0.1:8787'; TOKEN = 'e2e-admin-token-0123456789'; KEY = 'LC-E2E-VAULT-1'
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
envv = dict(os.environ, PORT='8787', ADMIN_TOKEN=TOKEN, ANTHROPIC_API_KEY='sk-e2e', ANTHROPIC_URL='http://127.0.0.1:8799/v1/messages', MEMBER_KEYS=json.dumps([{'tier': 'vault', 'sha256': H(KEY), 'label': 'E2E member'}]))
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
try:
  with sync_playwright() as p:
    br = p.chromium.launch()
    try:
        ca = mkctx(br, 1280, 900); pa = ca.new_page(); watch(pa, 'A'); boot(pa, 'Anna')
        out('A unlocks with the member key [ok, tier, message, remote, key kept]', pa.evaluate("(k) => Access.accept(k, 'manual').then((r) => [r.ok, r.tier || '', r.message, App.access.remote, !!App.access.key])", KEY))
        pa.evaluate("location.hash = '#trim'"); pa.wait_for_selector('#coach', timeout=15000); pa.wait_for_timeout(700)
        inp = '#coach form input[type="text"], #coach form textarea, #coach form input:not([type])'
        pa.fill(inp, 'What does 5.Qe2 threaten here?'); pa.press(inp, 'Enter')
        pa.wait_for_function("[...document.querySelectorAll('#coach-chat .msg-bot')].some((m) => /Coach \\(test\\)/.test(m.innerText))", timeout=15000)
        out('A: the Pro coach answered', pa.evaluate("[...document.querySelectorAll('#coach-chat .msg-bot')].map((m) => m.innerText).filter((t) => /Coach \\(test\\)/.test(t))[0]"))
        s = LAST['body']['system']
        out('Claude request [key, API version, model, question, rules first, MSPC prompt, peak var, board context]', [LAST['headers'].get('x-api-key'), LAST['headers'].get('anthropic-version'), LAST['body'].get('model'), LAST['body']['messages'][-1]['content'][:40], s[:12], 'MSPC System' in s, '2105' in s, '<board_context>' in s and '"fen"' in s])
        shot(pa, '#coach', 'ai_coach.png', 800)
        cb = mkctx(br, 1280, 900); pb = cb.new_page(); watch(pb, 'B'); boot(pb, 'Bram')
        out('B tries the same key [ok, message]', pb.evaluate("(k) => Access.accept(k, 'manual').then((r) => [r.ok, r.message])", KEY))
        out('B asks the AI anyway', ask(pb))
        cc = mkctx(br, 1280, 900); pc = cc.new_page(); watch(pc, 'free'); boot(pc, 'Free')
        out('free player [sales assistant uses AI, coach AI]', [pc.evaluate("AI.forBot('sales')"), ask(pc)])
        cd = mkctx(br, 1280, 900); pd = cd.new_page(); watch(pd, 'admin'); boot(pd, 'Kyenzo')
        pd.evaluate("(t) => { Object.defineProperty(Admin, 'active', { get: () => true, configurable: true }); Store.set('lc5-admin-token', t); location.hash = '#review-queue'; }", TOKEN)
        pd.wait_for_selector('.srv5 [data-srv5-tab="members"]', timeout=15000); pd.click('.srv5 [data-srv5-tab="members"]'); pd.wait_for_selector('.srv5 .sp5-row', timeout=10000)
        out('admin: Members and AI', pd.evaluate("document.querySelector('.srv5').innerText.replace(/\\s+/g, ' ').slice(0, 250)"))
        shot(pd, '.srv5', 'ai_members.png', 400)
        pd.click('.srv5 [data-srv5="unbind"]'); pd.wait_for_timeout(1200)
        out('after the reset, B unlocks', pb.evaluate("(k) => Access.accept(k, 'manual').then((r) => [r.ok, r.tier || ''])", KEY))
        out('after the reset [B asks, then A asks]', [ask(pb), ask(pa)])
        out('admin prompt test (preview)', pd.evaluate("(t) => AI.chat('coachPaid', [{ role: 'user', content: 'Test run' }], {}, { action: 'preview', instructions: 'PREVIEW PROMPT', secret: t }).then((r) => 'answered', (e) => 'refused: ' + e.reason)", TOKEN))
        out('preview used the new prompt', 'PREVIEW PROMPT' in LAST['body']['system'])
        pb.evaluate("location.hash = '#trim'"); pb.wait_for_selector('#coach', timeout=15000); pb.click('[data-act="sample"]'); pb.wait_for_timeout(800); pb.click('[data-act="review"]')
        for i in range(60):
            pb.wait_for_timeout(1500); pb.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach((b) => b.click())")
            if pb.query_selector('[data-act="interrogate"]'): break
        pb.click('[data-act="interrogate"]'); pb.wait_for_selector('.iq-chat', timeout=20000); pb.wait_for_timeout(400)
        for i in range(24):
            if pb.query_selector('[data-iq="after"]'): pb.click('[data-iq="after"]'); pb.wait_for_timeout(700); break
            b = pb.query_selector('.iq button:has-text("Give up")')
            if b: b.click()
            pb.wait_for_timeout(700)
        pb.wait_for_selector('[data-iq5="ai"]', timeout=10000); pb.click('[data-iq5="ai"]'); pb.wait_for_selector('.iq5-ai-text', timeout=15000)
        out('B: AI session conclusion', pb.evaluate("document.querySelector('.iq5-ai-text').innerText"))
        out('the conclusion request carried the session', ['trim_session' in LAST['body']['system'], 'Ngf6' in LAST['body']['system']])
        shot(pb, '.iq5-end', 'ai_conclusion.png', 600)
    except Exception as e: out('FAIL', repr(e)[:700])
    br.close()
finally:
    srv.terminate(); fake.shutdown()
print('ERRORS', len([e for e in errs if '404' not in e])); [print(' ', e[:260]) for e in errs if '404' not in e][:10]
