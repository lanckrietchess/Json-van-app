"""LC32 build (hub 9.10.0): token balances in the profile menu, board-first trainers, B2B Carousel Builder.

    python3 apply_patches_v32.py <dir> 9.9.0 9.10.0

<dir> holds index.v9.9.0.html, sw.v9.9.0.js, manifest.v9.9.0.webmanifest, lc32.js and lc32.css.
Every anchor must match EXACTLY once or the build stops. The finished page is syntax-checked with node.
"""
import sys, re, os, subprocess, tempfile
H, OLD, NEW = (sys.argv[1:4] + [None, None, None])[:3]
if not (H and OLD and NEW): sys.exit(__doc__)
P = lambda *a: os.path.join(H, *a)
s = open(P(f'index.v{OLD}.html'), encoding='utf-8').read()

def once(a, b, label):
    global s
    n = s.count(a)
    if n != 1: sys.exit(f"PATCH FAILED [{label}]: anchor found {n}x")
    s = s.replace(a, b); print("ok", label)

# --- module + css
once('try{LC30.init()}catch(e){console.error(e)}\n',
     'try{LC30.init()}catch(e){console.error(e)}\n\n' + open(P('lc32.js'), encoding='utf-8').read().strip() + '\ntry{LC32.init()}catch(e){console.error(e)}\n', 'module')
once('\nbody.lc30-l0 #brand-menu{display:none!important}\n</style>\n<script>"use strict";const SKOOL_URLS',
     '\nbody.lc30-l0 #brand-menu{display:none!important}\n</style>\n<style id="lc32-css">\n' + open(P('lc32.css'), encoding='utf-8').read().strip() + '\n</style>\n<script>"use strict";const SKOOL_URLS', 'css')

# --- 1.1 two token balances in the profile menu (Quota already spends daily first, bonus second, on the server and on the device)
once('el.innerHTML=(()=>{try{return typeof LC30!=="undefined"?LC30.pm.head():""}catch(e){return""}})()+PM_ITEMS.map',
     'el.innerHTML=(()=>{try{return typeof LC30!=="undefined"?LC30.pm.head():""}catch(e){return""}})()+(()=>{try{return typeof LC32!=="undefined"?LC32.pm.tokens():""}catch(e){return""}})()+PM_ITEMS.map', 'profile menu tokens')
# --- the voice call needs the same credentials the other Arena calls use
once('call:call,known:known,', 'call:call,creds:creds,known:known,', 'Quota.creds export')

# --- 1.2 trainers: StageRunner tells the layout which step is showing
once('function renderSteps(){const el=part("steps");if(!el)return;',
     'function renderSteps(){try{if(typeof LC32!=="undefined")LC32.step(host,at)}catch(e){}const el=part("steps");if(!el)return;', 'trainer step hook')

# --- 2. B2B Partner: a Carousel tab
once('[["overview","Overview"],["shop","Shop"],["keys","Keys"],["toolkit","Toolkit"],["profile","Profile"]]',
     '[["overview","Overview"],["shop","Shop"],["keys","Keys"],["toolkit","Toolkit"],["carousel","Carousel"],["profile","Profile"]]', 'partner tab')
once('else body=profileHTML(p);return head+',
     'else if(pTab==="carousel")body=\'<section class="panel pad" data-lc32-host><p class="small muted">Loading…</p></section>\';else body=profileHTML(p);return head+', 'partner tab body')
once('const paint=()=>{if(!dead)view.innerHTML=partnerHTML(dash,catalog)};',
     'const paint=()=>{if(!dead){view.innerHTML=partnerHTML(dash,catalog);try{if(typeof LC32!=="undefined")LC32.afterPartner(view,pTab)}catch(e){console.error(e)}}};', 'partner paint hook')

# --- version bump
print(OLD, 'occurrences', s.count(OLD)); s = s.replace(OLD, NEW)
for k, m in enumerate(re.finditer(r'<script>(.*?)</script>', s, flags=re.S)):
    code = m.group(1)
    if len(code) < 10000: continue
    f = tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8'); f.write(code); f.close()
    r = subprocess.run(['node', '--check', f.name], capture_output=True, text=True); os.unlink(f.name)
    if r.returncode: sys.exit("SYNTAX ERROR in built script #%d:\n%s" % (k, r.stderr[:800]))
print("built script parses")
open(P('index.html'), 'w', encoding='utf-8').write(s)
for src, dst in ((f'sw.v{OLD}.js', 'sw.js'), (f'manifest.v{OLD}.webmanifest', 'manifest.webmanifest')):
    open(P(dst), 'w', encoding='utf-8').write(open(P(src), encoding='utf-8').read().replace(OLD, NEW))
print("written", len(s))
