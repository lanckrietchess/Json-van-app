import asyncio, json, os, sys
from playwright.async_api import async_playwright
NM='/home/claude/w/node_modules/'
LIBS={'jquery':NM+'jquery/dist/jquery.min.js','chess.min.js':NM+'chess.js/chess.js','chessboard':NM+'@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js'}
PZ={"game":{"pgn":"e4 e5 Bc4 Nc6 Qh5 Nf6"},"puzzle":{"id":"P1","rating":1400,"solution":["h5f7"],"themes":["mateIn1"]}}
res=[]
def chk(n,ok,x=None): res.append(('PASS ' if ok else 'FAIL ')+n+('' if x is None else ' '+json.dumps(x)[:300]))
async def route(r):
    u=r.request.url
    if 'cdnjs.cloudflare.com' in u:
        for k,f in LIBS.items():
            if k in u and u.endswith('.js'):
                body=open(f).read()
                if k=='chess.min.js': body='var exports={};'+body+';window.Chess=window.Chess||exports.Chess;'
                return await r.fulfill(status=200,body=body,content_type='application/javascript')
        if 'chessboard' in u and u.endswith('.css'): return await r.fulfill(status=200,body=open(NM+'@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.css').read(),content_type='text/css')
        return await r.fulfill(status=200,body='',content_type='text/css' if u.endswith('.css') else 'application/javascript')
    if 'lichess.org/api/puzzle/next' in u:
        PZ['puzzle']['id']='P%d'%len(res);return await r.fulfill(status=200,body=json.dumps(PZ),content_type='application/json',headers={'access-control-allow-origin':'*'})
    if 'rpc/lc69_member_count' in u: return await r.fulfill(status=200,body='{"ok":true,"members":1234}',content_type='application/json',headers={'access-control-allow-origin':'*'})
    if 'rpc/lc69_landing_public' in u: return await r.fulfill(status=200,body='{"ok":true,"values":{}}',content_type='application/json',headers={'access-control-allow-origin':'*'})
    if u.startswith('http://localhost:8765'): return await r.continue_()
    if 'chessboardjs.com' in u or 'img/chesspieces' in u: return await r.continue_()
    return await r.abort()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True,service_workers='block')
        await ctx.route('**/*',route)
        await ctx.add_init_script('localStorage.setItem("lc6-state-v1",JSON.stringify({total:1700,xp:{}}));localStorage.setItem("lc19-sw",JSON.stringify({on:false}));')
        pg=await ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://localhost:8765/app.html#shuffle'); await pg.wait_for_timeout(5000)
        await pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());undefined;")
        g=await pg.evaluate("!!document.querySelector('#view .lc67-gate')")
        chk('Chromium 390px: the pre-game puzzle shows on #shuffle',g)
        arr=await pg.evaluate("document.querySelectorAll('#view .arrow-bad').length")
        chk('Chromium: the red arrow of the opponent last move is drawn at step M',arr>=1,arr)
        bw=await pg.evaluate("(()=>{const b=document.querySelector('#view .lc67-pzboard');const r=b.getBoundingClientRect();return [Math.round(r.width),Math.round(r.bottom)]})()")
        chk('Chromium: the puzzle board fits the phone width',bw[0]<=390 and bw[0]>=280,bw)
        await pg.screenshot(path='/home/claude/w/shots/gate.png')
        sw=await pg.evaluate("document.documentElement.scrollWidth")
        chk('no horizontal scroll on the gate',sw<=390,sw)
        for i in range(4):
            await pg.click('#view [data-lc67="step"]'); await pg.wait_for_timeout(120)
        # play Qxf7# by tapping the two squares
        for k in range(6):
            st=await pg.evaluate("(()=>{const r=LC67.gate._last.run();const s=r.state();return{done:s.done,step:s.step,u:r.P.solution[s.step]||''}})()")
            if st['done'] or not st['u']: break
            sq=await pg.evaluate("(u=>{const f=s=>{const e=document.querySelector('#view .lc67-pzboard [data-square=\"'+s+'\"]');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return[r.x+r.width/2,r.y+r.height/2]};return[f(u.slice(0,2)),f(u.slice(2,4))]})",st['u'])
            await pg.mouse.click(*sq[0]); await pg.wait_for_timeout(250); await pg.mouse.click(*sq[1]); await pg.wait_for_timeout(900)
        t=await pg.evaluate("document.querySelector('#view [data-lc67-step]').textContent")
        chk('Chromium: the solution is played by tapping squares and the puzzle is solved',('Correct' in t),t[:120])
        await pg.evaluate("while(LC67.pool.left()>0)LC67.pool.slice(80);undefined;")
        await pg.wait_for_timeout(2500)
        m=await pg.evaluate("(()=>{const s=[...document.querySelectorAll('#view .sh-matrix .sh-scopes .sh-scope')].map(b=>{const r=b.getBoundingClientRect();return[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]});const a=document.querySelector('#view .sh-allrow .sh-scope').getBoundingClientRect();const go=document.querySelector('#view .lc56-go');return{s:s,all:[Math.round(a.x),Math.round(a.y),Math.round(a.width)],go:go?Math.round(go.getBoundingClientRect().y):null}})()")
        s=m['s']
        two=len(s)==4 and s[0][1]==s[1][1] and s[2][1]==s[3][1] and s[2][1]>s[0][1] and s[0][0]<s[1][0]
        chk('Chromium: real 2x2 grid (two rows of two)',two,m)
        chk('Chromium: Shuffle all is full width under the grid',m['all'][1]>s[2][1] and m['all'][2]>=s[1][0]+s[1][2]-s[0][0]-4,m)
        chk('Chromium: matrix is above the Start button',m['go'] is None or m['go']>m['all'][1],m)
        chk('Chromium: tap targets >= 44 px in the matrix',min(x[3] for x in s)>=44,[x[3] for x in s])
        await pg.screenshot(path='/home/claude/w/shots/matrix.png',full_page=False)
        sw=await pg.evaluate("document.documentElement.scrollWidth"); chk('no horizontal scroll on Shuffle',sw<=390,sw)
        # books + quests
        for r in ['#books','#quests','#openings']:
            await pg.goto('http://localhost:8765/app.html'+r); await pg.wait_for_timeout(3500)
            await pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());undefined;")
            sw=await pg.evaluate("document.documentElement.scrollWidth"); chk('no horizontal scroll on '+r,sw<=390,sw)
            await pg.screenshot(path='/home/claude/w/shots/'+r[1:]+'.png')
        chk('Openings shows the MSPC card',await pg.evaluate("!!document.querySelector('#lc67-mspc')"))
        # simulation bar
        await pg.evaluate("window.__lc67Reload=()=>{};localStorage.setItem('lc67-sim','1');undefined;")
        await pg.goto('http://localhost:8765/app.html#home'); await pg.wait_for_timeout(3500)
        bar=await pg.evaluate("(()=>{const b=document.querySelector('#lc67-simbar');if(!b)return null;const r=b.getBoundingClientRect();const btn=b.querySelector('button').getBoundingClientRect();return[Math.round(r.bottom),Math.round(btn.height)]})()")
        chk('Chromium: simulation bar on screen with a 44px Stop button',bar is not None and bar[0]<=844 and bar[1]>=44,bar)
        await pg.evaluate("localStorage.removeItem('lc67-sim');undefined;")
        chk('no page errors in Chromium',not errs,errs[:4])
        # landing
        lp=await ctx.new_page(); lerr=[]; lp.on('pageerror',lambda e: lerr.append(str(e)[:200]))
        await lp.goto('http://localhost:8765/index.html'); await lp.wait_for_timeout(2500)
        h=await lp.evaluate("document.querySelector('#h-hero').textContent")
        chk('landing: mission title',h.startswith('My goal is to save 20,000 people'),h)
        chk('landing: live counter 1,234 of 20,000',await lp.evaluate("!document.querySelector('#mcount').classList.contains('hide')&&document.querySelector('#mc-n').textContent==='1,234'"))
        chk('landing: story (355, 500, 2105)',await lp.evaluate("(()=>{const t=document.querySelector('#story-t').textContent;return /355/.test(t)&&/500/.test(t)&&/2105/.test(t)})()"))
        order=await lp.evaluate("['love','proof','how','price-contrast','pricing'].map(id=>Math.round(document.getElementById(id).getBoundingClientRect().top+scrollY))")
        chk('landing order: Wall of Love, Proof, Method, contrast, pricing',order==sorted(order),order)
        sw=await lp.evaluate("document.documentElement.scrollWidth"); chk('landing: no horizontal scroll at 390px',sw<=390,sw)
        c=await lp.query_selector('#vs-grid .flip')
        await c.scroll_into_view_if_needed(); await c.click(); await lp.wait_for_timeout(700)
        st=await lp.evaluate("(()=>{const c=document.querySelector('#vs-grid .flip');const b=c.querySelector('.back').getBoundingClientRect(),f=c.querySelector('.front');return{p:c.getAttribute('aria-pressed'),t:getComputedStyle(c.querySelector('.back')).transform,h:Math.round(c.getBoundingClientRect().height)}})()")
        chk('landing: the competitor card flips on tap',st['p']=='true' and st['t'] in ('none','matrix(1, 0, 0, 1, 0, 0)'),st)
        await lp.screenshot(path='/home/claude/w/shots/landing_flip.png')
        await lp.evaluate("scrollTo(0,0)"); await lp.screenshot(path='/home/claude/w/shots/landing_hero.png')
        chk('landing: no page errors',not lerr,lerr[:3])
        await b.close()
    print('\n'.join(res))
asyncio.run(main())
