"""Shared test harness: serves the repo root at http://127.0.0.1:8765, mocks the CDNs
with tests/vendor and GitHub with tests/fixtures, and gives each suite mkctx(),
watch(), out() and errs. Run suites through tests/run.py."""
import json, os, sys, time, threading, functools, http.server
from playwright.sync_api import sync_playwright
TESTS = os.environ.get('LC_TESTS') or os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(TESTS)
SITE = REPO; VENDOR = TESTS + '/vendor'; FIX = TESTS + '/fixtures'; SHOTS = TESTS + '/shots'
os.makedirs(SHOTS, exist_ok=True)
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def end_headers(self):
        self.send_header('Cache-Control','no-store'); super().end_headers()
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8765), functools.partial(H, directory=SITE))
threading.Thread(target=srv.serve_forever, daemon=True).start()
FILES = {'jquery.min.js': VENDOR + '/jquery.min.js', 'chess.min.js': VENDOR + '/chess.js', 'chessboard-1.0.0.min.js': VENDOR + '/chessboard-1.0.0.min.js', 'chessboard-1.0.0.min.css': VENDOR + '/chessboard-1.0.0.min.css'}
PUB = open(FIX + '/published.json', encoding='utf-8').read()
def route(r):
    u=r.request.url
    if u.startswith('http://127.0.0.1:8765'): return r.continue_()
    base=u.split('?')[0]
    for k,p in FILES.items():
        if base.endswith(k): return r.fulfill(path=p, content_type='text/css' if p.endswith('.css') else 'application/javascript')
    if 'cdn.tailwindcss.com' in u: return r.fulfill(body='window.tailwind={};', content_type='application/javascript')
    if 'fonts.googleapis.com' in u or 'font-awesome' in u: return r.fulfill(body='', content_type='text/css')
    if 'raw.githubusercontent.com' in u: return r.fulfill(body=PUB, content_type='application/json')
    if 'api.github.com' in u: return r.fulfill(status=404, body='')
    return r.abort()
INIT="""
try { if (!localStorage.getItem('lc-hub-v2')) localStorage.setItem('lc-hub-v2', JSON.stringify({ v: 2, onboarded: true, settings: { sound: false, board: false, autoVault: true }, profile: {}, access: { tier: 'free' } })); } catch (e) {}
window.__cls = 0; window.__shifts = [];
try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push([Math.round(performance.now()), +e.value.toFixed(4)]); } } }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
"""
errs=[]
def mkctx(browser, w, h, mobile=False):
    c=browser.new_context(viewport={'width':w,'height':h}, is_mobile=mobile, has_touch=mobile, device_scale_factor=1)
    c.route('**/*', route); c.add_init_script(script=INIT); return c
def watch(page, tag):
    page.on('console', lambda m: errs.append(tag+' console: '+m.text) if m.type=='error' else None)
    page.on('pageerror', lambda e: errs.append(tag+' PAGEERROR: '+str(e)))
def out(k,v): print(k+':', v, flush=True)
LAST_BOT="(() => { const m = [...document.querySelectorAll('#coach-chat .msg-bot:not(.typing)')]; return m.length ? m[m.length-1].innerText.slice(0,420) : ''; })()"
