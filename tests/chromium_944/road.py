"""9.44.0 in real Chromium (390 px phone): the rest of the road (LC84) after LC42's Level 3, the one-calm-message policy (LC83),
   Level 2's Google save step, the Trim phone layout, the landing page's in-app-browser install and the 2-second install sheet.
   From the repo root: npm i chess.js@0.10.3 jquery@3.7.1 @chrisoakman/chessboardjs@1.0.0
   then NM=./node_modules python3 tests/chromium_944/road.py   (port 8769)"""
import asyncio, os, threading, http.server, functools, time
from playwright.async_api import async_playwright
ROOT=os.environ.get('SITE',os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))); NM=os.environ.get('NM','node_modules')
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8769),functools.partial(H,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start()
CDN={'jquery.min.js':NM+'/jquery/dist/jquery.min.js','chess.min.js':NM+'/chess.js/chess.js','chessboard-1.0.0.min.js':NM+'/@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js','chessboard-1.0.0.min.css':NM+'/@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.css'}
R=[]
def ok(c,m): R.append((bool(c),m)); print(('PASS ' if c else 'FAIL ')+m, flush=True)
BASE="localStorage.setItem('lc6-state-v1',JSON.stringify({total:500,xp:{}}));localStorage.setItem('lc71-day0',JSON.stringify(Date.now()-9e8));localStorage.setItem('lc80-onb',JSON.stringify({done:true}));"
ROAD=BASE+"localStorage.setItem('lc19-sw',JSON.stringify({on:true,level:3}));localStorage.setItem('lc42-onb',JSON.stringify({step:'second',since:Date.now(),at:1,base2:{t:0,m:0},scan:{done:9,tot:9,leaks:{M:3,C:2},fin:true}}));"
PGN='[White "me"]\n[Black "opp"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. h3 h6 8. Re1 a6 9. Nbd2 Ba7 10. Nf1 Qe7 11. Ng3 Qd7 12. Be3 Qxh3 13. gxh3 Bxh3 14. Bxa7 Rxa7 15. Nh2 Kh7 16. Qf3 Kg8 17. Qxf6 gxf6 18. Re2 Kh7 19. Rd2 Kg6 20. Nf5 Bxf5 0-1'
ANDROID_IG='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 Instagram 330.0.0.0'
IOS16_IG='Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.0'

async def route(r):
    u=r.request.url
    for k,v in CDN.items():
        if u.endswith(k): return await r.fulfill(path=v,content_type='text/css' if k.endswith('css') else 'application/javascript')
    if '127.0.0.1' in u: return await r.continue_()
    return await r.fulfill(status=404,body='{}',content_type='application/json')

async def phone(b,init,ua=None,W=390):
    kw=dict(viewport={'width':W,'height':844},is_mobile=W<500,has_touch=W<500,service_workers='block')
    if ua: kw['user_agent']=ua
    ctx=await b.new_context(**kw); await ctx.route('**/*',route)
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)[:200]))
    if init: await pg.add_init_script(init)
    return ctx,pg,errs

async def clear(pg): await pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());undefined;")
async def wait_for(pg,js,ms=8000):
    t=time.time()
    while (time.time()-t)*1000<ms:
        if await pg.evaluate(js): return True
        await pg.wait_for_timeout(200)
    return False

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--disable-dev-shm-usage'])

        # ---------- 1. the road: Level 3 -> 4 (LC42 hands over) -> patterns -> pick -> Level 5 ----------
        ctx,pg,errs=await phone(b,ROAD)
        await pg.goto('http://127.0.0.1:8769/app.html#home'); await pg.wait_for_timeout(4500); await clear(pg)
        ok(await pg.evaluate("LC84.version==='9.44.0'&&typeof LC84.begin==='function'"),'LC84 loaded (9.44.0)')
        await pg.evaluate("Store.set('lc-hub-trim-stats-v1',{games:{g1:{t:Date.now(),bl:1,mi:1,n:2}},solved:{}});LC42._t.tick();undefined;")
        await pg.wait_for_timeout(600)
        s=await pg.evaluate("(()=>{const sh=document.querySelector('.lc42-sheet');return{lc42:LC42._t.st().step,lc84:LC84._t.st().step,txt:sh?sh.innerText:'',btn:!!(sh&&sh.querySelector('[data-lc84-pat]'))}})()")
        ok(s['lc42']=='done' and s['lc84']=='pat' and 'Level 4 unlocked' in s['txt'] and s['btn'],'a real second Trim ends LC42 and hands over to LC84: Level 4 sheet with See my patterns')
        await pg.evaluate("document.querySelector('.lc42-sheet [data-lc84-pat]').click()"); await pg.wait_for_timeout(900)
        p1=await pg.evaluate("(()=>{const sh=document.querySelector('.lc84-sheet');return{n:document.querySelectorAll('.sheet-wrap').length,txt:sh?sh.innerText:'',opts:[...document.querySelectorAll('[data-lc84-pick]')].map(b=>b.getAttribute('data-lc84-pick'))}})()")
        ok(p1['n']==1 and 'Move' in p1['txt'] and '3 mistakes' in p1['txt'] and 'Calculation' in p1['txt'] and 'Stockfish' in p1['txt'],'patterns sheet: the leaks of the last games, sorted by MSPC step, honest about Stockfish: '+p1['txt'][:90].replace('\n',' '))
        ok(p1['opts'][:2]==['think','clinic'] and 'survival' in p1['opts'],'the training that fits the two biggest leaks (Move: MSPC trainer + Blunder Clinic, Calculation: Survival): '+str(p1['opts']))
        await pg.evaluate("document.querySelector('[data-lc84-pick=\"think\"]').click()"); await pg.wait_for_timeout(1500)
        st=await pg.evaluate("(()=>{const x=document.querySelector('#lc84-strip');return{h:location.hash,pick:LC84._t.st().pick,strip:x?x.innerText:'',q39:!!document.querySelector('#lc39-q'),strips:document.querySelectorAll('#lc84-strip,#lc42-strip,#lc39-q').length}})()")
        ok(st['h']=='#think' and st['pick']=='think' and 'finish one exercise' in st['strip'].lower(),'the pick opens the trainer, the strip says what to do: '+st['strip'][:70])
        ok(not st['q39'] and st['strips']==1,'one strip only: the quest drip (LC39) waits while the road runs')
        await pg.evaluate("V6.addXp('think',12);undefined;")
        ok(await wait_for(pg,"LC84._t.st().step==='tour'&&!!document.querySelector('.lc84-sheet')",7000),'one finished exercise (XP) = Level 5 and the tour of the blue sections')
        lv=await pg.evaluate("(JSON.parse(localStorage.getItem('lc19-sw'))||{}).level")
        ok(lv==5,'quest level raised to 5: %s'%lv)
        await clear(pg)

        # ---------- 2. Level 5: every blue section: open it, hear the ?, an exercise where it is a trainer ----------
        items=await pg.evaluate("LC84._t.tour().map(t=>({id:t.id,href:t.href,help:t.help[0],ex:!!t.ex,grp:t.grp}))")
        ok([i['id'] for i in items][:3]==['books','shuffle','bot'] and any(i['id']=='community' for i in items),'tour order starts with the Books Vault (coming soon), then the trainers: '+str([i['id'] for i in items]))
        await pg.evaluate("location.hash='#home'"); await pg.wait_for_timeout(1200)
        g=await pg.evaluate("(()=>{const x=document.querySelector('#lc84-strip');return{t:x?x.innerText:'',tab:!!document.querySelector('.n5-tab[data-n5=\"learn\"].lc84-pulse')}})()")
        ok('Books Vault' in g['t'] and g['tab'],'not there yet: the strip names it and the blue Learn tab pulses')
        await clear(pg); await pg.click('.n5-tab[data-n5="learn"]'); await pg.wait_for_timeout(500)
        ok(await pg.evaluate("!!document.querySelector('.n5-item[href=\"#books\"].lc84-pulse')"),'inside the menu the Books Vault item pulses')
        await pg.evaluate("try{Nav5.close()}catch(e){};undefined;")
        allq=True;exdone=True;deaf=None
        for it in items:
            await pg.evaluate("h=>{location.hash=h}",it['href']); await pg.wait_for_timeout(1400)
            q=await wait_for(pg,"!!document.querySelector('#view .lc29-q.lc84-pulse')",5000)
            if not q: allq=False; print('  no pulsing ? on',it['id'])
            if deaf is None:
                await pg.evaluate("id=>{const s=LC84._t.st(),o=Object.assign({},s.opened);o[id]=Date.now()-100000;LC84._t.put({opened:o});LC84._t.paint()}",it['id']); await pg.wait_for_timeout(300)
                deaf=await pg.evaluate("!!document.querySelector('#lc84-strip [data-lc84-deaf]')")
            await pg.evaluate("id=>window.dispatchEvent(new CustomEvent('lc29-listened',{detail:id}))",it['help']); await pg.wait_for_timeout(400)
            if it['ex']:
                ph=await pg.evaluate("LC84._t.st().ph")
                if ph!='ex': exdone=False
                await pg.evaluate("V6.addXp('think',7);undefined;")
                if not await wait_for(pg,"LC84._t.st().ph!=='ex'||LC84._t.st().step!=='tour'",6000): exdone=False
        ok(allq,'on every blue section the ? next to the title pulses until it is heard')
        ok(deaf,'no sound after 90 s with the help open: a quiet "I could not hear it: continue" appears')
        ok(exdone,'a trainer in the tour also needs one finished exercise before the next section opens')
        ok(await wait_for(pg,"LC84._t.st().step==='quests'",4000),'every section heard: the Lanckriet Student Quests open')

        # ---------- 3. the Lanckriet Student Quests ----------
        await clear(pg); await pg.evaluate("location.hash='#home'"); await pg.wait_for_timeout(1200)
        await clear(pg); await pg.evaluate("document.querySelector('#lc84-strip [data-lc84-quests]').click()"); await pg.wait_for_timeout(700)
        qs=await pg.evaluate("(()=>{const sh=document.querySelector('.lc84-sheet');return{t:sh?sh.innerText:'',post:document.querySelectorAll('[data-lc84-post]').length,share:!!document.querySelector('[data-lc84-q=\"share\"]')}})()")
        ok('Find a Rival' in qs['t'] and 'Bring in a friend' in qs['t'] and qs['post']==3 and qs['share'],'three quests: Find a Rival, a community post (win / question / game) and the invite link')
        await pg.evaluate("document.querySelector('[data-lc84-post=\"wins\"]').click()"); await pg.wait_for_timeout(1200)
        ok(await pg.evaluate("location.hash==='#community'"),'post option opens the community')
        await pg.evaluate("window.dispatchEvent(new CustomEvent('lc39-posted',{detail:'wins'}))"); await pg.wait_for_timeout(300)
        await pg.evaluate("location.hash='#rivals'"); await pg.wait_for_timeout(1200)
        await pg.evaluate("(()=>{const b=document.createElement('button');b.setAttribute('data-lc73-rq','x');b.id='t-rq';document.querySelector('#view').appendChild(b)})()")
        await pg.evaluate("document.querySelector('#t-rq').click()"); await pg.wait_for_timeout(700)
        await pg.evaluate("location.hash='#refer'"); await pg.wait_for_timeout(1200)
        await pg.evaluate("(()=>{const b=document.createElement('button');b.setAttribute('data-v71-share','');b.id='t-sh';document.querySelector('#view').appendChild(b)})()")
        await pg.evaluate("document.querySelector('#t-sh').click()"); await pg.wait_for_timeout(900)
        fin=await pg.evaluate("(()=>{const sh=document.querySelector('.lc84-sheet');return{step:LC84._t.st().step,q:LC84._t.st().q,txt:sh?sh.innerText:'',strip:!!document.querySelector('#lc84-strip'),own:LC84.owns()}})()")
        ok(fin['step']=='done' and all(fin['q'].values()) and 'Student road' in fin['txt'] and not fin['strip'] and not fin['own'],'all three quests done: graduation message, the road lets go')
        ok(not errs,'no page errors on the road: '+str(errs[:2]))
        await ctx.close()

        # ---------- 4. one calm message at a time (LC83) ----------
        ctx,pg,errs=await phone(b,BASE+"localStorage.setItem('lc19-sw',JSON.stringify({on:false}));localStorage.setItem('lc42-onb',JSON.stringify({step:'done'}));")
        await pg.goto('http://127.0.0.1:8769/app.html#home'); await pg.wait_for_timeout(4500); await clear(pg)
        await pg.wait_for_timeout(300)
        r=await pg.evaluate("""(async()=>{const T=LC83._t,o=[];const n=()=>document.querySelectorAll('.sheet-wrap').length;
          document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());
          T.reset();T.touch(0);
          openSheet({title:'Auto one',cls:'x-a',html:'<p>a</p>'});o.push(n());
          document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());
          openSheet({title:'Auto two',cls:'x-promo',html:'<p>b</p>'});o.push(n());
          T.touch();openSheet({title:'Tapped',cls:'x-c',html:'<p>c</p>'});o.push(n());
          T.touch(0);openSheet({title:'Road',cls:'lc84-sheet',html:'<p>d</p>'});o.push(n());
          return {o:o,held:T.held().map(x=>x.o.title)}})()""")
        ok(r['o'][0]==1,'a pop-up nobody tapped for opens when the screen is calm')
        ok(r['o'][1]==0 and 'Auto two' in r['held'],'a promo pop-up within 20 s of the last one waits in the queue: '+str(r['held']))
        ok(r['o'][2]==1,'a pop-up the person tapped for always opens')
        ok(r['o'][3]==2,'the road (LC84) always passes')
        await clear(pg)
        await pg.evaluate("(p)=>{App.ui.trimLoad={pgn:p,id:null,user:'w',review:false};location.hash='#trim'}",PGN); await pg.wait_for_timeout(3500); await clear(pg)
        t=await pg.evaluate("(()=>{LC83._t.touch(0);LC34.installOverlay(true);const a=document.querySelectorAll('.sheet-wrap').length;return{a:a,held:LC83._t.held().map(x=>x.o.title)}})()")
        ok(t['a']==0 and 'Install the app' in t['held'],'nothing lands on the Trim analysis by itself (install sheet held): '+str(t['held']))
        await pg.evaluate("location.hash='#home'")
        ok(await wait_for(pg,"[...document.querySelectorAll('.sheet h2')].some(h=>/Install the app|Auto two/.test(h.textContent))",30000),'leaving Trim releases the waiting pop-up, one at a time')

        # ---------- 5. Trim on a phone: title + ? on top, board, nothing sticky, the review keeps the board in view ----------
        await clear(pg); await pg.evaluate("(p)=>{App.ui.trimLoad={pgn:p,id:null,user:'w',review:false};location.hash='#trim'}",PGN); await pg.wait_for_timeout(3500); await clear(pg)
        L=await pg.evaluate("""(()=>{const top=e=>e?Math.round(e.getBoundingClientRect().top+scrollY):-1;
          const sticky=[...document.querySelectorAll('#view *')].filter(e=>/sticky|fixed/.test(getComputedStyle(e).position)).length;
          return{q:top(document.querySelector('#view .page-head .lc29-q')),board:top(document.querySelector('.an-main>.board-shell')),nav:top(document.querySelector('.an-main>.nav-row')),moves:top(document.querySelector('#an-moves')),coach:top(document.querySelector('#coach')),eng:top(document.querySelector('.an-main>.cp')),lib:top(document.querySelector('#lc39-lib')),sticky:sticky,sw:document.documentElement.scrollWidth}})()""")
        ok(0<L['q']<L['board']<L['nav']<L['moves']<L['coach']<L['eng']<=L['lib'] or (0<L['q']<L['board']<L['nav']<L['moves']<L['coach']<L['eng'] and L['lib']<0),'reading order on a phone: title+? > board > move buttons > moves > coach > engine lines > library: '+str(L))
        ok(L['sticky']==0 and L['sw']<=390,'nothing sticky for the page to slide under, no sideways scroll')
        await clear(pg); await pg.evaluate("document.querySelector('[data-act=\"review\"]').click()")
        await wait_for(pg,"!!document.querySelector('[data-act=goto]')||/done/i.test((document.querySelector('#an-review-status')||{}).textContent||'')",60000)
        await pg.wait_for_timeout(1500)
        y=await pg.evaluate("Math.round(document.querySelector('.an-main>.board-shell').getBoundingClientRect().top)")
        ok(-40<=y<=844*0.45,'after the review the board is still in view (no jump to the report): board top %d'%y)
        ok(not errs,'no page errors: '+str(errs[:2]))
        await ctx.close()

        # ---------- 6. Level 2: save with Google, then the MSPC System ----------
        ctx,pg,errs=await phone(b,BASE+"localStorage.setItem('lc19-sw',JSON.stringify({on:true,level:1}));localStorage.setItem('lc42-onb',JSON.stringify({step:'first',at:1,scan:{done:3,tot:9,leaks:{S:2},fin:false}}));")
        await pg.goto('http://127.0.0.1:8769/app.html#home'); await pg.wait_for_timeout(4500); await clear(pg)
        await pg.evaluate("LC42._t.firstDone();undefined;"); await pg.wait_for_timeout(500)
        l2=await pg.evaluate("(()=>{const sh=document.querySelector('.lc42-sheet');return{t:sh?sh.innerText:'',g:!!(sh&&sh.querySelector('[data-lc39-google]')),sys:!!(sh&&sh.querySelector('[data-lc42-go=\"system\"]')),lc53:LC53.state()}})()")
        ok('Level 2 unlocked' in l2['t'] and l2['g'] and l2['sys'] and 'Step 1: save your progress' in l2['t'],'Level 2: step 1 save with Google (in the sheet), step 2 the MSPC System')
        ok(l2['lc53']['asks']==1 and l2['lc53']['stage']=='auth-wait','that sheet counts as the one save-progress ask (LC53 will not ask again right after)')
        await clear(pg); await pg.evaluate("location.hash='#system'"); await pg.wait_for_timeout(1500)
        ok(await pg.evaluate("!!document.querySelector('#lc42-strip [data-lc39-google]')&&/MSPC System/.test(document.querySelector('#lc42-strip').innerText)"),'the Level 2 strip keeps the Google button until signed in')
        await ctx.close()

        # ---------- 7. landing page: the install button breaks out of Instagram ----------
        ctx,pg,errs=await phone(b,None,ua=ANDROID_IG); msgs=[]
        pg.on('console',lambda m: msgs.append(m.text))
        await pg.goto('http://127.0.0.1:8769/'); await pg.wait_for_timeout(1500)
        await pg.evaluate("window.__lcNav=u=>console.log('NAV '+u);document.querySelector('[data-install]').click()"); await pg.wait_for_timeout(600)
        intent=[m for m in msgs if 'intent://' in m]
        ok(intent and 'package=com.android.chrome' in intent[0] and 'install%3D1' in intent[0] and 'source%3Diab' in intent[0],'Android Instagram: Install opens the app page in Chrome at once (intent link): '+(intent[0][:120] if intent else str(msgs[:3])))
        ok(await pg.evaluate("location.pathname==='/'"),'the in-app browser does not load the app page itself')
        await ctx.close()
        ctx,pg,errs=await phone(b,None,ua=IOS16_IG)
        await pg.goto('http://127.0.0.1:8769/'); await pg.wait_for_timeout(1500)
        await pg.evaluate("document.querySelector('[data-install]').click()"); await pg.wait_for_timeout(800)
        m=await pg.evaluate("(document.getElementById('lc-inst')||{}).textContent||''")
        ok('Open in browser' in m and await pg.evaluate("location.pathname==='/'"),'iPhone Instagram (older iOS): the steps show right away: '+m[:80])
        await ctx.close()

        # ---------- 8. ?install=1: the install sheet within 2 s ----------
        ctx,pg,errs=await phone(b,BASE+"localStorage.setItem('lc19-sw',JSON.stringify({on:false}));localStorage.setItem('lc42-onb',JSON.stringify({step:'done'}));"
            +"window.__t0=0;window.__ti=0;new MutationObserver(()=>{if(!window.__t0&&document.querySelector('#view')&&document.querySelector('#view').children.length)window.__t0=performance.now();if(!window.__ti&&document.querySelector('.lc34-inst,.lc34-ios'))window.__ti=performance.now()}).observe(document,{childList:true,subtree:true});",W=1280)
        await pg.goto('http://127.0.0.1:8769/app.html?install=1'); await pg.wait_for_timeout(6000)
        tt=await pg.evaluate("[Math.round(window.__t0),Math.round(window.__ti)]")
        ok(tt[1]>0 and tt[1]-tt[0]<=2000,'?install=1: the install sheet is on screen %d ms after the app shows (limit 2000)'%(tt[1]-tt[0]))
        await ctx.close()
        await b.close()
    bad=[m for c,m in R if not c]
    print('\n%d/%d passed'%(len(R)-len(bad),len(R)))
    if bad: raise SystemExit(1)
asyncio.run(main())
