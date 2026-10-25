"""LC34 build (hub 9.12.0): launch layer (device routing, habit week, master sales offer, Pro tranches, Stripe checkout, founding badges).

    python3 apply_patches_v34.py <dir> 9.11.0 9.12.0

<dir> holds index.v9.11.0.html, sw.v9.11.0.js, manifest.v9.11.0.webmanifest, lc34/lc34.js and lc34/lc34.css.
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

once('try{LC33.init()}catch(e){console.error(e)}\n', 'try{LC33.init()}catch(e){console.error(e)}\n\n' + open(P('lc34', 'lc34.js'), encoding='utf-8').read().strip() + '\ntry{LC34.init()}catch(e){console.error(e)}\n', 'LC34 module')
once('\n</style>\n<script>"use strict";const SKOOL_URLS', '\n</style>\n<style id="lc34-css">\n' + open(P('lc34', 'lc34.css'), encoding='utf-8').read().strip() + '\n</style>\n<script>"use strict";const SKOOL_URLS', 'LC34 css')

# ---------- ONE master sales trigger: the Growth Path survey and the Tier 2 bot hand over to it ----------
once('ctx=Object.assign({},ctx||{});if(!pv&&(!c.on||qs(".gp-sheet")))return;',
     'ctx=Object.assign({},ctx||{});if(!pv&&typeof LC34!=="undefined"&&LC34.funnel.takeOver(ctx,opt))return;if(!pv&&(!c.on||qs(".gp-sheet")))return;', 'Growth Path hands over')
once('openB(ctx,pv){const c=cfg();', 'openB(ctx,pv){if(!pv&&typeof LC34!=="undefined"&&LC34.funnel.takeOver(ctx,{}))return;const c=cfg();', 'Tier 2 bot hands over')
once('try{DayFunnel.afterTrim({fresh:freshTrim})}catch(e){}', 'try{DayFunnel.afterTrim({fresh:freshTrim})}catch(e){}try{if(typeof LC34!=="undefined")LC34.value("trim")}catch(e){}', 'value moment: Trim finished')

# ---------- habit week ----------
once('verified:st.verified!==false,reason:String(st.reason||"").slice(0,30),at:Date.now()};', 'verified:st.verified!==false,reason:String(st.reason||"").slice(0,30),week1:!!st.week1,week1Ends:+st.week1Ends||0,at:Date.now()};', 'Quota keeps the habit-week fields')
once('const limitFor=n=>n==="vip"?Infinity:LIM[n]||LIM.free',
     'const limitFor=n=>n==="vip"?Infinity:(()=>{try{return typeof LC34!=="undefined"?LC34.tokens.limitFor(n,LIM):(LIM[n]||LIM.free)}catch(e){return LIM[n]||LIM.free}})()', 'offline limit = 3 in the first week')

# ---------- badges ----------
once('return{LIST:LIST,sync:sync,', 'function allList(){try{return typeof LC34!=="undefined"?LC34.badges.list().concat(LIST):LIST}catch(e){return LIST}}return{LIST:LIST,sync:sync,', 'badge list function')
once('mine:()=>LIST.filter(b=>b.got())', 'mine:()=>allList().filter(b=>b.got())', 'badges: mine')
once('const rows=LIST.filter(b=>b.got());if(!rows.length)return"";', 'const rows=allList().filter(b=>b.got());if(!rows.length)return"";', 'badges: trophy room')
once('(()=>{try{return typeof LC32!=="undefined"?LC32.pm.tokens():""}catch(e){return""}})()+PM_ITEMS.map',
     '(()=>{try{return typeof LC34!=="undefined"?LC34.pm.status():""}catch(e){return""}})()+(()=>{try{return typeof LC32!=="undefined"?LC32.pm.tokens():""}catch(e){return""}})()+PM_ITEMS.map', 'profile menu status')

# ---------- Upgrades page + settings + price copy ----------
once('LC19.pricing.anchorHTML(P)+\'<div class="ladder">\'', 'LC19.pricing.anchorHTML(P)+(typeof LC34!=="undefined"?LC34.upgrades.html():"")+\'<div class="ladder">\'', 'Upgrades page offer')
once('bindTokenForms(view,()=>setTimeout(rerender,700));async function onClick(e){const b=e.target.closest("[data-scroll]");', 'bindTokenForms(view,()=>setTimeout(rerender,700));try{LC34.upgrades.refresh()}catch(e){}async function onClick(e){const b=e.target.closest("[data-scroll]");', 'Upgrades page refresh')
once('["links.rival","Rival channel in Skool: where the Get a rival button goes (empty: the Skool community)","url"],',
     '["links.rival","Rival channel in Skool: where the Get a rival button goes (empty: the Skool community)","url"],["links.playStore","Google Play page of the app: where the Android web overlay sends visitors (empty: that overlay stays off)","url"],', 'admin setting: Play link')
once('yearly:"€399"', 'yearly:"€400"', 'standard yearly price copy')

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
