"""9.43.0 in real Chromium: the marathon onboarding (every mistake of the first game, one MSPC card each, "Yes, I'll apply this",
   no Level 2 or other pop-up before the end), the calm guide (other sheets wait), the in-app browser bar (Instagram UA), the keyboard shell.
   The engine is scripted (Engine.analyse stubbed per position) so the flow is deterministic; the MSPC texts come from the real LC83.
   From the repo root: npm i chess.js@0.10.3 jquery@3.7.1 @chrisoakman/chessboardjs@1.0.0 html2canvas@1.4.1
   then NM=./node_modules python3 tests/chromium_943/marathon.py   (port 8768)"""
import asyncio, json, os, threading, http.server, functools
from playwright.async_api import async_playwright
ROOT=os.environ.get('SITE',os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))); NM=os.environ.get('NM','node_modules')
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8768),functools.partial(H,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start()
CDN={'jquery.min.js':NM+'/jquery/dist/jquery.min.js','chess.min.js':NM+'/chess.js/chess.js','chessboard-1.0.0.min.js':NM+'/@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js','html2canvas.min.js':NM+'/html2canvas/dist/html2canvas.min.js'}
R=[]
def ok(c,m): R.append((bool(c),m)); print(('PASS ' if c else 'FAIL ')+m, flush=True)
PGN='1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. h3 h6 8. Re1 a6 9. Nbd2 Ba7 10. Nf1 Qe7 11. Ng3 Qd7 12. Be3 Qxh3 13. gxh3 Bxh3 14. Bxa7 Rxa7 15. Nh2 Kh7 16. Qf3 Kg8 17. Qxf6 gxf6 18. Re2 Kh7 19. Rd2 Kg6 20. Nf5 Bxf5 *'
# white POV evals per ply index (after the move of that ply): white mistakes at ply 32 (17.Qxf6, queen for a knight) and ply 24 (13...? no: 13.gxh3 fine). Scripted:
STUB="""(pgn)=>{const c=new Chess();c.load_pgn(pgn);const h=c.history({verbose:true}),b=new Chess(),F={};F[b.fen()]=0;const fens=[b.fen()];h.forEach((m,i)=>{b.move(m.san);fens.push(b.fen());F[b.fen()]=i+1});
 /* eval by ply: steady +40, white blunders on plies 16 (9.Nbd2 -> -260), 26 (14.Bxa7 -> -220) and 32 (17.Qxf6 -> -280); black blunders back in between */
 const EV=i=>{if(i>=17&&i<=18)return -260;if(i>=19&&i<=26)return 40;if(i>=27&&i<=28)return -220;if(i>=29&&i<=32)return 40;if(i>=33)return -280;return 40};
 window.__ev=EV;window.__fenIdx=F;
 Engine.load=async()=>true;Engine.toCp=l=>l.cp;
 Engine.analyse=async(fen)=>{await new Promise(r=>setTimeout(r,25));const i=F[fen];const g=new Chess(fen);const ms=g.moves({verbose:true});const nx=h[i];
   const alt=ms.filter(m=>!nx||m.from+m.to!==nx.from+nx.to)[0]||ms[0];const cp=EV(i==null?0:i);return{best:alt?alt.from+alt.to+(alt.promotion||''):null,lines:[{cp:cp}]}};
 LC39._t.games=async()=>[{pgn:pgn,color:'w',opp:'opp',res:'0-1',t:1}];
 try{LC50.pre.ready=()=>null;LC50.pre.wait=async()=>null}catch(e){}
 return h.length}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--disable-dev-shm-usage'])
        async def route(r):
            u=r.request.url
            for k,v in CDN.items():
                if u.endswith(k): return await r.fulfill(path=v,content_type='application/javascript')
            if '127.0.0.1' in u: return await r.continue_()
            return await r.fulfill(status=404,body='{}',content_type='application/json')
        for W in (390,1280):
            ctx=await b.new_context(viewport={'width':W,'height':844 if W==390 else 900},is_mobile=W<500,has_touch=W<500,service_workers='block')
            await ctx.route('**/*',route)
            page=await ctx.new_page(); errs=[]
            page.on('pageerror',lambda e: errs.append(str(e)[:200]))
            await page.add_init_script("localStorage.setItem('lc6-state-v1',JSON.stringify({total:120,xp:{}}));localStorage.setItem('lc19-sw',JSON.stringify({on:true,level:1}));localStorage.setItem('lc71-day0',JSON.stringify(Date.now()-9e8));localStorage.setItem('lc80-onb',JSON.stringify({done:true}));")
            await page.goto('http://127.0.0.1:8768/app.html#quests'); await page.wait_for_timeout(5000)
            await page.evaluate("document.querySelectorAll('.sheet-wrap,.lc30-ask').forEach(x=>x.remove());undefined;")
            n=await page.evaluate(STUB,PGN)
            ok(n>30,'%d px: test game loaded (%d plies), engine scripted'%(W,n))
            await page.evaluate("LC42.begin({cc:'tester'});undefined;")
            for i in range(40):
                await page.wait_for_timeout(500)
                if await page.evaluate("!!document.querySelector('.lc42-tease [data-lc42-next]')"): break
            c=await page.evaluate("(()=>{const s=document.querySelector('.lc42-tease');return{kick:(s.querySelector('.lc52-kick')||{}).textContent,rows:[...s.querySelectorAll('.lc42-ml b')].map(b=>b.textContent),yes:(s.querySelector('[data-lc42-next]')||{}).textContent,board:!!s.querySelector('[data-lc42-mb] .lc-board, [data-lc42-mb] svg, [data-lc42-mb] div'),txt:s.innerText,sheets:document.querySelectorAll('.sheet-wrap').length}})()")
            ok(c['kick'].startswith('Mistake 1') and c['rows']==['M · Move','S · Specifics','P · Priorities','C · Calculation'] and 'apply this' in c['yes'] and c['board'],'first mistake at once: one MSPC card (M, S, P, C), a board and "Yes, I’ll apply this": '+str({k:c[k] for k in ('kick','rows','yes')}))
            ok(c['sheets']==1 and 'Level 2' not in c['txt'],'nothing else on screen: no Level 2, one sheet')
            ok('this is where it went wrong' in c['txt'].lower() and 'Your rule for the next game' in c['txt'],'the leak letter and the rule for the next game are shown')
            ok(not any(x in c['txt'] for x in ['It attacks the bishop on a7','attacks the pawn on h6']),'no invented attacks in the card')
            await page.evaluate("openSheet({title:'Promo test',cls:'x-promo',html:'<p>promo</p>'});undefined;"); await page.wait_for_timeout(400)
            ok(await page.evaluate("document.querySelectorAll('.sheet-wrap').length===1&&LC83._t.held().length===1"),'calm guide: another pop-up during the marathon waits in the queue')
            seen=[c['kick']]
            for k in range(8):
                await page.click('.lc42-tease [data-lc42-next]')
                for i in range(40):
                    await page.wait_for_timeout(400)
                    st=await page.evaluate("(()=>{const s=document.querySelector('.lc42-tease');return s?{kick:(s.querySelector('.lc52-kick')||{}).textContent,next:!!s.querySelector('[data-lc42-next]'),end:!!s.querySelector('[data-lc42-mclaim]')}:null})()")
                    if st and (st['next'] or st['end']): break
                if st['end']: break
                seen.append(st['kick'])
            ok(len(seen)==3 and seen[1].startswith('Mistake 2') and seen[2].startswith('Mistake 3'),'"Yes" flows to the next mistake by itself: '+str(seen))
            end=await page.evaluate("(()=>{const s=document.querySelector('.lc42-tease');return{t:s.innerText,claim:!!s.querySelector('[data-lc42-mclaim]'),save:!!s.querySelector('[data-lc42-msave]'),step:(Store.get('lc42-onb')||{}).step,lvl:[...document.querySelectorAll('.sheet-wrap')].some(x=>/Level 2 unlocked/.test(x.innerText))}})()")
            ok(end['claim'] and end['save'] and end['step']=='tease' and not end['lvl'] and 'all 3 big mistakes' in end['t'],'only at the end: Claim Level 2 + optional Save my progress, Level 2 not given yet')
            lay=await page.evaluate("[document.documentElement.scrollWidth-innerWidth,[...document.querySelectorAll('.lc42-tease button')].filter(b=>b.offsetParent&&b.getBoundingClientRect().height<43.5).map(b=>b.textContent.trim().slice(0,24))]")
            ok(lay[0]<=0 and not lay[1],'%d px: no sideways scroll, buttons >= 44 px %s'%(W,lay))
            await page.click('.lc42-tease [data-lc42-mclaim]'); await page.wait_for_timeout(1800)
            lv=await page.evaluate("[(Store.get('lc42-onb')||{}).step,[...document.querySelectorAll('.sheet-wrap')].map(x=>x.innerText.slice(0,40)),JSON.stringify(LC42._t.leaksAll())]")
            ok(lv[0]=='sys' and sum(1 for x in lv[1] if 'Level 2' in x)==1 and not any('promo' in x for x in lv[1]),'Claim Level 2 opens ONE Level 2 sheet (no double level-up, the waiting pop-up still waits), the marathon leaks feed the working points '+str(lv))
            await page.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());undefined;"); await page.wait_for_timeout(5000)
            ok(await page.evaluate("[...document.querySelectorAll('.sheet-wrap')].some(x=>/promo/.test(x.innerText))"),'the waiting pop-up comes after the marathon, when the screen is calm')
            ok(not errs,'no page errors '+str(errs[:3]))
            await ctx.close()
        # keyboard shell + in-app browser
        ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block',user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36 Instagram 330.0.0.0 Android')
        await ctx.route('**/*',route); page=await ctx.new_page(); errs=[]; page.on('pageerror',lambda e: errs.append(str(e)[:200]))
        await page.goto('http://127.0.0.1:8768/index.html'); await page.wait_for_timeout(1500)
        L=await page.evaluate("(()=>{const b=document.querySelector('.iab');return b?{t:b.innerText,intent:(b.querySelector('a[href^=\"intent://\"]')||{}).href||''}:null})()")
        ok(L and 'Instagram' in L['t'] and 'package=com.android.chrome' in L['intent'] and 'app.html' in L['intent'],'landing in Instagram (Android): quiet bar with "Open in Chrome" (intent) '+str(L)[:160])
        await page.click('.iab [data-iab-x]'); await page.reload(); await page.wait_for_timeout(1200)
        ok(await page.evaluate("!document.querySelector('.iab')"),'× hides it for a day')
        await page.goto('http://127.0.0.1:8768/app.html#quests'); await page.wait_for_timeout(5000)
        A=await page.evaluate("(()=>{const b=document.querySelector('.lc83-iab');return{bar:!!b,txt:b?b.innerText:'',vp:document.querySelector('meta[name=viewport]').content,fs:getComputedStyle(Object.assign(document.body.appendChild(document.createElement('input')),{type:'text'})).fontSize}})()")
        ok(A['bar'] and 'Instagram' in A['txt'],'app in Instagram: the same quiet bar')
        ok('interactive-widget=resizes-content' in A['vp'] and A['fs']=='16px','keyboard shell: viewport resizes with the keyboard, inputs 16 px (no zoom on focus) '+str(A['vp'])+' '+A['fs'])
        kb=await page.evaluate("(()=>{document.documentElement.classList.add('lc-kb');document.documentElement.style.setProperty('--lc-vvh','400px');const f=document.querySelector('#lc49-float,.lc49-float');const s=openSheet({title:'Type',cls:'lc40-auth',html:'<input class=input>'});const sh=document.querySelector('.sheet-wrap .sheet');const r=[f?getComputedStyle(f).display:'none',sh?Math.round(parseFloat(getComputedStyle(sh).maxHeight)):0];document.documentElement.classList.remove('lc-kb');return r})()")
        ok(kb[0]=='none' and 0<kb[1]<=400,'keyboard open: floating bars step aside, a sheet fits the visible part '+str(kb))
        ok(not errs,'no page errors '+str(errs[:3]))
        await b.close()
    print('RESULT %d passed %d failed'%(sum(1 for r in R if r[0]),sum(1 for r in R if not r[0])))
asyncio.run(main())
