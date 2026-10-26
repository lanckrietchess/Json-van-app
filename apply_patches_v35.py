"""LC35 build (hub 9.13.0): Creator Studio Content Hub, cloud export, Clip Archiver and variant remixer.

    python3 apply_patches_v35.py <dir> 9.12.0 9.13.0

<dir> holds index.v9.12.0.html, sw.v9.12.0.js, manifest.v9.12.0.webmanifest and lc35/lc35-studio.js.
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

once('const api={lc33:LC33S,lc31:LC31,version:VER,', open(P('lc35', 'lc35-studio.js'), encoding='utf-8').read().strip() + '\nconst api={lc35:LC35S,lc33:LC33S,lc31:LC31,version:VER,', 'Studio Content Hub module')
once('STUDIO_CSS+EXT_CSS+LC31_CSS+LC33S_CSS', 'STUDIO_CSS+EXT_CSS+LC31_CSS+LC33S_CSS+LC35S_CSS', 'Studio css')
once('try{LC33S.onMount()}catch(e){console.error(e)}return api}', 'try{LC33S.onMount()}catch(e){console.error(e)}try{LC35S.onMount()}catch(e){console.error(e)}return api}', 'Studio mount')
once('try{LC33S.onUnmount()}catch(e){}Hardware.detach();', 'try{LC33S.onUnmount()}catch(e){}try{LC35S.onUnmount()}catch(e){}Hardware.detach();', 'Studio unmount')
once('try{LC33S.ui.build(editor)}catch(e){console.error(e)}', 'try{LC33S.ui.build(editor)}catch(e){console.error(e)}try{LC35S.ui.build(editor)}catch(e){console.error(e)}', 'timeline in the take editor')

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
