"""LC31 build (hub 9.9.0): Creator Studio overhaul.

    python3 apply_patches_v31.py <dir> 9.8.0 9.9.0

<dir> holds index.v9.8.0.html, sw.v9.8.0.js, manifest.v9.8.0.webmanifest and lc31-studio.js.
Every anchor must match EXACTLY once or the build stops. The finished page is syntax-checked with node.
Output: <dir>/index.html, sw.js, manifest.webmanifest.
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

# --- the module itself, inside the Studio closure, right before the public api object
mod = open(P('lc31-studio.js'), encoding='utf-8').read().strip()
once('const api={version:VER,', mod + '\nconst api={lc31:LC31,version:VER,', 'module')
once('h("style",{text:STUDIO_CSS+EXT_CSS})', 'h("style",{text:STUDIO_CSS+EXT_CSS+LC31_CSS})', 'css')
once('Proof.onMount();return api}', 'Proof.onMount();try{LC31.onMount()}catch(e){console.error(e)}return api}', 'mount hook')
once('Hardware.detach();', 'try{LC31.onUnmount()}catch(e){}Hardware.detach();', 'unmount hook')

# --- camera shapes: sanitize, aspect lock, draw order, ring
once('zoom:nz(L.camera&&L.camera.zoom,1,1,3)}',
     'zoom:nz(L.camera&&L.camera.zoom,1,1,3),ratio:LC31_RATIO(L.camera),fill:L.camera&&L.camera.fill==="full"?"full":"pip"}', 'sanitize camera')
once('return n==="board"?1:LAYOUT.layers.camera.shape==="circle"?1:0', 'return n==="board"?1:LC31_PXA(LAYOUT.layers.camera)', 'aspect lock')
once('drawBackground(ctx,W,H,L.bg);if(L.board.on){',
     'drawBackground(ctx,W,H,L.bg);if(L.camera.fill==="full"&&L.camera.on&&Cam.ready())drawCamera(ctx,W,H,L.camera);if(L.board.on){', 'full-frame camera behind board')
once('if(L.camera.on&&Cam.ready())drawCamera(ctx,W,H,L.camera);if(L.lower.on',
     'if(L.camera.fill!=="full"&&L.camera.on&&Cam.ready())drawCamera(ctx,W,H,L.camera);if(L.lower.on', 'camera pip after board')
once('if(c.ring){const lw=Math.max(2,W*.0032)', 'if(c.ring&&c.fill!=="full"){const lw=Math.max(2,W*.0032)', 'no ring on full frame')
once('function setCamShape(s){', 'function setCamShape(s){LC31_SHAPEHOOK(s);', 'old shape buttons keep ratio in sync')
once('LAYOUT.layers.camera=Object.assign({},keep.cam,{x:fresh.camera.x,y:fresh.camera.y,w:fresh.camera.w,h:fresh.camera.h});',
     'LAYOUT.layers.camera=Object.assign({},keep.cam,{x:fresh.camera.x,y:fresh.camera.y,w:fresh.camera.w,h:fresh.camera.h});if(keep.cam.fill==="full"){Object.assign(LAYOUT.layers.camera,{x:0,y:0,w:1,h:1})}', 'full frame survives aspect change')

# --- script on top preset
once('{id:"streamer",name:"Full Streamer Mode",scene:"streamer",panels:{stage:[.012,.02,.7,.96],camera:[.72,.02,.268,.46],library:[.72,.5,.268,.48]}}]',
     '{id:"streamer",name:"Full Streamer Mode",scene:"streamer",panels:{stage:[.012,.02,.7,.96],camera:[.72,.02,.268,.46],library:[.72,.5,.268,.48]}},{id:"scripttop",name:"Script on top",scene:"board",panels:{script:[.012,.02,.976,.26],stage:[.012,.29,.6,.69],library:[.62,.29,.368,.69]}}]', 'script on top preset')

# --- Student Game Library: sync bar, filter, actions
once('top.append(h("div",{class:"grow"},search),imp,add);box.append(top);',
     'top.append(h("div",{class:"grow"},search),imp,add);box.append(top);if(def.id==="games")LC31.gamesBar(box,()=>paint());', 'games bar')
once('let items=Libs.list(def.id).filter(i=>!q||JSON.stringify(i).toLowerCase().includes(q));',
     'let items=Libs.list(def.id).filter(i=>!q||JSON.stringify(i).toLowerCase().includes(q));if(def.id==="games")items=items.filter(LC31.gameFilter);', 'games filter')
once('acts:i=>[["Load on board",()=>Act.loadGame(i)],["Copy PGN",()=>copyText(i.pgn)]]',
     'acts:i=>[["Load on board",()=>Act.loadGame(i)],["Find critical moments",()=>LC31.analyseItem(i)],["Make carousel",()=>LC31.carouselFromItem(i)],["Copy PGN",()=>copyText(i.pgn)]]', 'games actions')

# --- AI formats feed the existing render queue
once('kind:"short",hook:"",script:"",game:"",confirm:false,req:"",busy:false,wallets:null,rkey:"",ropen:false,hookText:"",scriptText:"",give:{id:"",amount:"",note:""}};',
     'kind:"short",hook:"",script:"",game:"",confirm:false,req:"",busy:false,wallets:null,rkey:"",ropen:false,hookText:"",scriptText:"",give:{id:"",amount:"",note:""}};try{LC31.seedRender(S)}catch(e){console.error(e)}', 'render seed')

# --- host options from the page: the real Stockfish (the Studio has its own weak Engine that shadows it) and the linked Chess.com name
once('LanckrietStudio.mount(host,{isLocked:fen=>Guard.state(fen)!=="ok",',
     'LanckrietStudio.mount(host,{stockfish:()=>Engine,chessUser:()=>{try{const u=App.profile&&App.profile.chess_com_username;if(u)return String(u)}catch(e){}try{const a=Elo.acct("chesscom");if(a&&a.user)return String(a.user)}catch(e){}return""},isLocked:fen=>Guard.state(fen)!=="ok",', 'host options')

# --- version bump
print(OLD, 'occurrences', s.count(OLD)); s = s.replace(OLD, NEW)

# --- syntax-check every big script of the finished page
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
