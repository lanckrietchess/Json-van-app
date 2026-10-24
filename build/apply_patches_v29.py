"""Builds hub 9.7.0 (LC29: coach avatar variations + universal Help) from the 9.6.0 files.
Needs next to it: index.v9.6.0.html, sw.v9.6.0.js, manifest.v9.6.0.webmanifest, lc29.js, lc29.css. Every anchor must match exactly once or the build stops."""
import sys, re, subprocess, tempfile, os
H = sys.argv[1] if len(sys.argv) > 1 else '.'
P = lambda n: os.path.join(H, n)
s = open(P('index.v9.6.0.html'), encoding='utf-8').read()

def once(a, b, label):
    global s
    n = s.count(a)
    if n != 1: sys.exit(f"PATCH FAILED [{label}]: anchor found {n}x")
    s = s.replace(a, b); print("ok", label)

# 1. after every screen is drawn, add the ? button (guarded: a missing module changes nothing)
once('V33.view(route);try{FeatureChecklist.visit(route)}catch(e){}',
     'V33.view(route);try{FeatureChecklist.visit(route)}catch(e){}try{if(typeof LC29!=="undefined")LC29.afterRender(route)}catch(e){}', 'render-hook')
# 2. the Settings toggle (default on: the switch helper treats anything but false as on)
once('sw("popups","Show achievement pop-ups"',
     'sw("lcHelp","Show Lanckriet Chess Help","A small ? next to the title of every screen. Tap it for a short explanation from Coach Lanckriet: what it is, how to use it, why it works (MSPC) and how ranks and levels apply. Off: the ? buttons disappear.")+sw("popups","Show achievement pop-ups"', 'settings-toggle')
# 3. the mini-player avatar uses a random coach photo when there are any (try/catch: the module is defined later in the file)
OLD = 'const url=typeof CONFIG==="object"&&CONFIG&&typeof CONFIG.coachAvatar==="string"&&/^https:\\/\\//.test(CONFIG.coachAvatar)?CONFIG.coachAvatar:"";'
NEW = 'const url=(()=>{try{return LC29.avatar.peek("neutral")}catch(e){return""}})()||(typeof CONFIG==="object"&&CONFIG&&typeof CONFIG.coachAvatar==="string"&&/^https:\\/\\//.test(CONFIG.coachAvatar)?CONFIG.coachAvatar:"");'
once(OLD, NEW, 'mini-player-avatar')
# 4. styles and module
css = open(P('lc29.css'), encoding='utf-8').read().strip()
once('\n</style>\n<script>"use strict";const SKOOL_URLS', '\n</style>\n<style id="lc29-css">\n' + css + '\n</style>\n<script>"use strict";const SKOOL_URLS', 'css')
mod = open(P('lc29.js'), encoding='utf-8').read().strip()
once('try{LC28.init()}catch(e){console.error(e)}\n', 'try{LC28.init()}catch(e){console.error(e)}\n\n' + mod + '\ntry{LC29.init()}catch(e){console.error(e)}\n', 'module')
# 5. version
print('9.6.0 occurrences', s.count('9.6.0')); s = s.replace('9.6.0', '9.7.0')
# 6. syntax check of every big script in the finished page
for k, m in enumerate(re.finditer(r'<script>(.*?)</script>', s, flags=re.S)):
    code = m.group(1)
    if len(code) < 10000: continue
    f = tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8'); f.write(code); f.close()
    r = subprocess.run(['node', '--check', f.name], capture_output=True, text=True); os.unlink(f.name)
    if r.returncode: sys.exit("SYNTAX ERROR in built script #%d:\n%s" % (k, r.stderr[:600]))
print("built script parses")
open(P('index.html'), 'w', encoding='utf-8').write(s)

# 7. service worker: stale-while-revalidate for /assets/ (coach photos, help.json, audio) in its own cache that releases do not delete
w = open(P('sw.v9.6.0.js'), encoding='utf-8').read()
def once_w(a, b, label):
    global w
    n = w.count(a)
    if n != 1: sys.exit(f"SW PATCH FAILED [{label}]: anchor found {n}x")
    w = w.replace(a, b); print("ok sw", label)
once_w("const LIB_CACHE = 'lc-lib-v1';", "const LIB_CACHE = 'lc-lib-v1';\nconst ASSET_CACHE = 'lc-assets-v1';   /* coach photos, help.json, help audio: opens from cache, refreshes in the background */", 'sw-const')
once_w("!k.startsWith('lc-coach-') && !k.startsWith('lc-notes-')", "!k.startsWith('lc-coach-') && !k.startsWith('lc-notes-') && !k.startsWith('lc-assets-')", 'sw-keep')
once_w("const pinnedLib = (u) =>", """async function assetSwr(event, request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  const net = fetch(request).then(async (res) => {
    if (cacheable(res)) await cache.put(request, res.clone()).catch(() => {});   /* a 404 is never stored */
    return res;
  }).catch(() => null);
  if (hit) { event.waitUntil(net); return hit; }
  return (await net) || new Response('', { status: 504 });
}

const pinnedLib = (u) =>""", 'sw-fn')
once_w("    if (p.startsWith(SCOPE + 'engine/'))", "    if (p.startsWith(SCOPE + 'assets/')) { event.respondWith(assetSwr(event, request)); return; }\n    if (p.startsWith(SCOPE + 'engine/'))", 'sw-route')
w = w.replace('9.6.0', '9.7.0')
open(P('sw.js'), 'w', encoding='utf-8').write(w)
t = open(P('manifest.v9.6.0.webmanifest'), encoding='utf-8').read(); open(P('manifest.webmanifest'), 'w', encoding='utf-8').write(t.replace('9.6.0', '9.7.0'))
print("written", len(s))
