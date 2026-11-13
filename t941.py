"""9.41.0: live landing page + automatic captions in real Chromium. From the repo root: npm i chess.js@0.10.3 jquery@3.7.1 @chrisoakman/chessboardjs@1.0.0 html2canvas@1.4.1
   then NM=./node_modules python3 tests/chromium_941/t941.py (serves the repo on port 8765; Supabase and other hosts are stubbed)."""
import asyncio, json, os, sys, time, threading, http.server, functools
from playwright.async_api import async_playwright
ROOT=os.environ.get('SITE',os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))); NM=os.environ.get('NM','node_modules')
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8765),functools.partial(H,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start()
CDN={'jquery.min.js':NM+'/jquery/dist/jquery.min.js','chess.min.js':NM+'/chess.js/chess.js','chessboard-1.0.0.min.js':NM+'/@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js','html2canvas.min.js':NM+'/html2canvas/dist/html2canvas.min.js'}
R=[]
def ok(c,m): R.append((bool(c),m)); print(('PASS ' if c else 'FAIL ')+m, flush=True)
PGN=open(os.path.join(os.path.dirname(__file__),'..','chromium_939','fixture.pgn')).read()
PGN_OLD='[White "Kyenzo"]\n[Black "Student"]\n[WhiteElo "1500"]\n[BlackElo "1210"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Na5 6. Bb5+ c6 7. dxc6 bxc6 8. Be2 h6 9. Nf3 e4 10. Ne5 Qd4 11. Ng4 Bxg4 12. Bxg4 Qe5 13. Be2 Bc5 14. O-O O-O 15. d3 Rad8 1-0'
SH="(()=>{const v=document.querySelector('#view');const h=[...v.querySelectorAll('*')].find(e=>e.shadowRoot&&e.shadowRoot.querySelector('#lcs'));return h.shadowRoot})()"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--disable-dev-shm-usage','--auto-accept-this-tab-capture','--autoplay-policy=no-user-gesture-required','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'])
        ctx=await b.new_context(viewport={'width':1280,'height':860},service_workers='block')
        async def route(r):
            u=r.request.url
            for k,v in CDN.items():
                if u.endswith(k): return await r.fulfill(path=v,content_type='application/javascript')
            if '127.0.0.1' in u: return await r.continue_()
            if 'supabase.co' in u:
                if '/auth/v1/user' in u: return await r.fulfill(status=200,body=json.dumps({'id':'u1','email':'lanckrietchess@gmail.com','user_metadata':{}}),content_type='application/json')
                return await r.fulfill(status=404,body='{}',content_type='application/json')
            return await r.fulfill(status=503,body='')
        await ctx.route('**/*',route)
        page=await ctx.new_page(); errs=[]
        page.on('pageerror',lambda e: errs.append(str(e)))
        page.on('dialog',lambda d: asyncio.ensure_future(d.accept()));DL=[];page.on('download',lambda d: DL.append(d.suggested_filename))
        await page.add_init_script("""localStorage.setItem('lc26-auth',JSON.stringify({email:'lanckrietchess@gmail.com',access_token:'x',expires_at:9999999999,user:{id:'u1',email:'lanckrietchess@gmail.com'}}));localStorage.setItem('lc6-state-v1',JSON.stringify({total:1700,xp:{}}));localStorage.setItem('lc19-sw',JSON.stringify({on:false}));localStorage.setItem('lc42-onb',JSON.stringify({done:true}));""")
        await page.goto('http://127.0.0.1:8765/app.html#studio'); await page.wait_for_timeout(5000)
        await page.evaluate("localStorage.setItem('lc26-auth',JSON.stringify({email:'lanckrietchess@gmail.com',access_token:'x',expires_at:9999999999,user:{id:'u1',email:'lanckrietchess@gmail.com'}}));LC49.owner=()=>true;location.hash='#quests';undefined;"); await page.wait_for_timeout(1500)
        await page.evaluate("history.replaceState(null,'','#studio');const v=document.querySelector('#view');v.innerHTML='';MOUNT.studio(v);setTimeout(()=>LC79.afterRender('studio'),400);undefined;"); await page.wait_for_timeout(3500)
        print('route', await page.evaluate('location.hash'), await page.evaluate("[localStorage.getItem('lc26-auth')?'auth-kept':'auth-GONE',(()=>{try{return LC49.owner()}catch(e){return 'x'}})()]"))
        await page.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());undefined;")
        ok(await page.evaluate("!!(window.LanckrietStudio&&LanckrietStudio._t)"),'Studio mounted')
        # 1. landing never redirects in preview, even in "installed app" mode
        p2=await ctx.new_page()
        await p2.add_init_script("const _mm=window.matchMedia.bind(window);window.matchMedia=q=>/standalone/.test(q)?{matches:true,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}:_mm(q);")
        await p2.goto('http://127.0.0.1:8765/index.html?preview=1&lc79=live'); await p2.wait_for_timeout(1500)
        ok(p2.url.find('/index.html')>0,'installed-app mode + preview=1: stays on the landing page ('+p2.url.split('8765')[1]+')')
        await p2.goto('http://127.0.0.1:8765/index.html'); await p2.wait_for_timeout(1500)
        ok('/app.html' in p2.url,'control: without preview the installed app still goes to the app ('+p2.url.split('8765')[1]+')')
        await p2.close()
        # 2. live landing page over the stage
        await page.evaluate("(()=>{const sr="+SH+";sr.querySelectorAll('.lc31-scrim').forEach(x=>x.remove())})();localStorage.removeItem('lc79-cta');undefined;")
        await page.keyboard.press('l'); await page.wait_for_timeout(4500)
        g=await page.evaluate("(()=>{const sr="+SH+";const w=sr.querySelector('#lc79-lp'),cv=sr.querySelector('#stage-cv');if(!w)return null;const a=w.getBoundingClientRect(),b=cv.getBoundingClientRect();const f=w.querySelector('iframe');let land=false,path='';try{land=!!f.contentDocument.querySelector('#h-hero');path=f.contentWindow.location.pathname+f.contentWindow.location.search}catch(e){}return{vis:getComputedStyle(w).display,dx:Math.abs(a.left-b.left)+Math.abs(a.top-b.top),dw:Math.abs(a.width-b.width)+Math.abs(a.height-b.height),w:Math.round(a.width),h:Math.round(a.height),land,path,how:LC79.live().how}})()")
        ok(g and g['vis']=='block' and g['dx']<=2 and g['dw']<=2 and g['w']>100,'live page covers exactly the stage: '+str(g))
        ok(g and g['land'] and g['path'].startswith('/index.html?preview=1'),'it is the public landing page (index.html?preview=1), not the app')
        bx=await page.evaluate("(()=>{const r=("+SH+").querySelector('#lc79-lp').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
        await page.mouse.move(bx[0],bx[1]); await page.mouse.wheel(0,900); await page.wait_for_timeout(1200)
        sc=await page.evaluate("("+SH+").querySelector('#lc79-lp iframe').contentWindow.scrollY")
        ok(sc>100,'the mouse wheel scrolls the live page (scrollY %d)'%sc)
        clk=await page.evaluate("(()=>{const f=("+SH+").querySelector('#lc79-lp iframe');const a=f.contentDocument.querySelector('a[href^=\"#\"]');if(!a)return 'no anchor';a.click();return f.contentWindow.location.hash||'clicked'})()")
        ok(clk not in ('no anchor',),'a link inside the live page can be clicked ('+str(clk)+')')
        for _ in range(12):
            await page.wait_for_timeout(500)
            if await page.evaluate("!!(LC79.live().video&&LC79.live().video.videoWidth)||!!LC79.live().snap"): break
        info=await page.evaluate("[LC79.live().how,!!(LC79.live().video&&LC79.live().video.videoWidth),!!LC79.live().snap]")
        ok(info[1] or info[2],'the live page gets into the picture: capture='+str(info[0])+' video='+str(info[1])+' snapshot='+str(info[2]))
        px=await page.evaluate("(()=>{const sr="+SH+";const f=sr.querySelector('#lc79-lp iframe');f.contentWindow.dispatchEvent(new MouseEvent('mousemove',{clientX:150,clientY:200}));const c=document.createElement('canvas');c.width=540;c.height=960;const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,540,960);LC79.drawLive(g,540,960);const d=g.getImageData(0,0,540,960).data;let lit=0,gold=0;for(let i=0;i<d.length;i+=4){if(d[i]+d[i+1]+d[i+2]>40)lit++;if(d[i]>230&&d[i+1]>170&&d[i+1]<205&&d[i+2]<70)gold++}window.__lp=c.toDataURL();return [lit,gold]})()")
        ok(px[0]>200000,'the frame fills the whole picture (%d lit pixels of 518400)'%px[0])
        ok(px[1]>50,'yellow pointer ring where the mouse is (%d px)'%px[1])
        import base64; open('shot_live.png','wb').write(base64.b64decode((await page.evaluate("window.__lp")).split(',')[1]))
        await page.evaluate("(()=>{const f=("+SH+").querySelector('#lc79-lp iframe');f.contentWindow.document.dispatchEvent(new KeyboardEvent('keydown',{key:'l',bubbles:true}))})();undefined;"); await page.wait_for_timeout(400)
        ok(not await page.evaluate("LC79.state().ctaOn") and await page.evaluate("getComputedStyle(("+SH+").querySelector('#lc79-lp')).display")=='none','key L inside the landing page hides it again')
        await page.evaluate("localStorage.setItem('lc79-cta',JSON.stringify({mode:'live',fit:'board',v:2}));LC79.ctaToggle(true);undefined;"); await page.wait_for_timeout(800)
        gb=await page.evaluate("(()=>{const sr="+SH+";const a=sr.querySelector('#lc79-lp').getBoundingClientRect(),b=sr.querySelector('.layer[data-layer=board]').getBoundingClientRect();return [Math.abs(a.left-b.left)+Math.abs(a.top-b.top)+Math.abs(a.width-b.width)+Math.abs(a.height-b.height),Math.round(a.width),Math.round(b.width)]})()")
        ok(gb[0]<=3,'option "board area": the live page covers exactly the board '+str(gb))
        await page.evaluate("LC79.ctaToggle(false);localStorage.removeItem('lc79-cta');undefined;")
        # 3. automatic captions + hide
        made=await page.evaluate("""(async()=>{const T=LanckrietStudio._t;const mk=async(id,col)=>{const c=document.createElement('canvas');c.width=360;c.height=640;const g=c.getContext('2d');const st=c.captureStream(30);const ac=new AudioContext();const o=ac.createOscillator();const d=ac.createMediaStreamDestination();o.connect(d);o.start();st.addTrack(d.stream.getAudioTracks()[0]);const mr=new MediaRecorder(st,{mimeType:'video/webm'});const ch=[];mr.ondataavailable=e=>ch.push(e.data);const iv=setInterval(()=>{g.fillStyle=col;g.fillRect(0,0,360,640)},33);mr.start(200);await new Promise(r=>setTimeout(r,1500));mr.stop();await new Promise(r=>mr.onstop=r);clearInterval(iv);o.stop();ac.close();const blob=new Blob(ch,{type:'video/webm'});await T.Takes.add({id:id,name:id,blob:blob,mime:'video/webm',durationMs:1500,w:360,h:640,fps:30,env:[],markers:[],cuts:[],trimIn:0,trimOut:1.5,createdAt:Date.now(),size:blob.size,onDisk:false,captions:[]})};await mk('capA','#334155');await mk('capB','#3f3f46');
          window.__calls=0;LanckrietStudio.lc33.autoSubs=async(t)=>{window.__calls++;return t.id==='capA'?{ok:true,lines:[{s:.1,e:1.2,t:'hello from the coach'}]}:{ok:false,error:'This clip is silent'}};
          const p=LC79.newProject('Caps test');p.clips=[{id:'c1',take:'capA'},{id:'c2',take:'capB'}];return LC79.needsCaps(p).length})()""")
        ok(made==2,'two takes without captions are found (%s)'%made)
        await page.evaluate("LC79.openProjects();undefined;"); await page.wait_for_timeout(800)
        lab=await page.evaluate("document.querySelector('#lc79-ed [data-a=caps]').textContent")
        ok('on' in lab,'clear CC Captions button in the project bar: '+lab)
        await page.click('#lc79-ed [data-a="caps"]'); await page.wait_for_timeout(300)
        ok('hidden' in await page.evaluate("document.querySelector('#lc79-ed [data-a=caps]').textContent"),'pressing it hides the captions')
        await page.click('#lc79-ed [data-a="export"]')
        for _ in range(40):
            await page.wait_for_timeout(500)
            if not await page.evaluate("!!document.querySelector('#lc79-ed .lc79-busy')"): break
        ok(await page.evaluate("window.__calls")==0,'captions hidden: export does not write captions')
        await page.click('#lc79-ed [data-a="caps"]'); await page.wait_for_timeout(300)
        n0=await page.evaluate("LanckrietStudio._t.Takes.list.length")
        await page.click('#lc79-ed [data-a="export"]')
        for _ in range(60):
            await page.wait_for_timeout(500)
            if not await page.evaluate("!!document.querySelector('#lc79-ed .lc79-busy')"): break
        r=await page.evaluate("[window.__calls,(LanckrietStudio._t.Takes.get('capA').captions||[]).length,(LanckrietStudio._t.Takes.get('capB').captions||[]).length,LanckrietStudio._t.Takes.list.length]")
        ok(r[0]==2 and r[1]==1 and r[2]==0,'on export: captions written automatically for the take that has speech, the silent one is skipped '+str(r[:3]))
        ok(r[3]==n0+1,'the export still finishes (new take in the archive)')
        db=await page.evaluate("(async()=>{const req=indexedDB.open('lcs2');const d=await new Promise(r=>req.onsuccess=()=>r(req.result));const st=d.transaction(d.objectStoreNames[0]).objectStore(d.objectStoreNames[0]);const v=await new Promise(r=>{const q=st.get('capA');q.onsuccess=()=>r(q.result)});return v&&v.captions?v.captions.length:-1})()")
        ok(db==1,'the written captions are saved with the take (editable later), IndexedDB: '+str(db))
        e2=[e for e in errs if 'lc79' in e.lower()]
        ok(not e2,'no LC79 page errors '+str(e2[:2]))
        await b.close()
    print('RESULT',sum(1 for r in R if r[0]),'passed',sum(1 for r in R if not r[0]),'failed')
asyncio.run(main())
