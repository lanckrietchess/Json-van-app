"""Studio 2.0 NLE (LC79): silence cut after a take, Cut silences, split, trim handles, delete, undo, ripple, two-deck playback
   without stalls and the caption box, in real Chromium. From the repo root: npm i chess.js@0.10.3 jquery@3.7.1 @chrisoakman/chessboardjs@1.0.0 html2canvas@1.4.1
   then NM=./node_modules python3 tests/chromium_942/nle.py   (CHROME=/path/to/chrome to use an installed Chrome)."""
import asyncio, json, os, sys, threading, http.server, functools
from playwright.async_api import async_playwright
ROOT=os.environ.get('SITE',os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))); NM=os.environ.get('NM','node_modules')
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8766),functools.partial(H,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start()
CDN={'jquery.min.js':NM+'/jquery/dist/jquery.min.js','chess.min.js':NM+'/chess.js/chess.js','chessboard-1.0.0.min.js':NM+'/@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js','html2canvas.min.js':NM+'/html2canvas/dist/html2canvas.min.js'}
R=[]
def ok(c,m): R.append((bool(c),m)); print(('PASS ' if c else 'FAIL ')+m, flush=True)
CUR="LC79.db().list.find(p=>p.id===LC79.db().cur)"
# a take: voice (tone) 0-1.5, silence 1.5-6 (4.5 s), voice 6-7, silence 7-9 (2 s), voice 9-10; the level track is measured like the Studio does (dB every 0.1 s)
MK="""(async(name,col,pattern,secs)=>{const T=LanckrietStudio._t;const c=document.createElement('canvas');c.width=540;c.height=960;const g=c.getContext('2d');const st=c.captureStream(30);
 const ac=new AudioContext();const o=ac.createOscillator();o.frequency.value=330;const gn=ac.createGain();gn.gain.value=0;const d=ac.createMediaStreamDestination();const an=ac.createAnalyser();an.fftSize=2048;o.connect(gn);gn.connect(d);gn.connect(an);o.start();
 st.addTrack(d.stream.getAudioTracks()[0]);const mr=new MediaRecorder(st,{mimeType:'video/webm'});const ch=[];mr.ondataavailable=e=>ch.push(e.data);
 const t0=performance.now(),env=[],buf=new Float32Array(2048);let f=0;const on=t=>pattern.some(p=>t>=p[0]&&t<p[1]);
 const iv=setInterval(()=>{const t=(performance.now()-t0)/1000;gn.gain.value=on(t)?.4:0;g.fillStyle=col;g.fillRect(0,0,540,960);g.fillStyle='#fff';g.font='70px sans-serif';g.fillText(name+' '+(f++),40,480)},20);
 const lv=setInterval(()=>{an.getFloatTimeDomainData(buf);let s=0;for(let i=0;i<buf.length;i++)s+=buf[i]*buf[i];const r=Math.sqrt(s/buf.length);env.push(r>0?Math.max(-100,Math.round(20*Math.log10(r))):-100)},100);
 mr.start(250);await new Promise(r=>setTimeout(r,secs*1000));mr.stop();await new Promise(r=>mr.onstop=r);clearInterval(iv);clearInterval(lv);o.stop();ac.close();
 const blob=new Blob(ch,{type:'video/webm'});const t={id:'t'+name,name:name,blob:blob,mime:'video/webm',durationMs:secs*1000,w:540,h:960,fps:30,env:env,markers:[],cuts:[],trimIn:0,trimOut:secs,createdAt:Date.now(),size:blob.size,onDisk:false,
   captions:[{s:.2,e:1.3,t:'first words here'},{s:6.1,e:6.9,t:'after the long pause'}]};await T.Takes.add(t);return T.Takes.get(t.id).env.length})"""
async def main():
    async with async_playwright() as p:
        kw={'args':['--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']}
        if os.environ.get('CHROME'): kw['executable_path']=os.environ['CHROME']
        b=await p.chromium.launch(**kw)
        ctx=await b.new_context(viewport={'width':1280,'height':900},service_workers='block')
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
        page.on('dialog',lambda d: asyncio.ensure_future(d.accept()))
        await page.add_init_script("""localStorage.setItem('lc26-auth',JSON.stringify({email:'lanckrietchess@gmail.com',access_token:'x',expires_at:9999999999,user:{id:'u1',email:'lanckrietchess@gmail.com'}}));localStorage.setItem('lc6-state-v1',JSON.stringify({total:1700,xp:{}}));localStorage.setItem('lc19-sw',JSON.stringify({on:false}));localStorage.setItem('lc42-onb',JSON.stringify({done:true}));""")
        await page.goto('http://127.0.0.1:8766/app.html#studio'); await page.wait_for_timeout(5000)
        await page.evaluate("LC49.owner=()=>true;location.hash='#quests';undefined;"); await page.wait_for_timeout(1200)
        await page.evaluate("history.replaceState(null,'','#studio');const v=document.querySelector('#view');v.innerHTML='';MOUNT.studio(v);setTimeout(()=>LC79.afterRender('studio'),400);undefined;"); await page.wait_for_timeout(3500)
        await page.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());undefined;")
        ok(await page.evaluate("!!(window.LanckrietStudio&&LanckrietStudio._t)"),'Studio mounted')
        # 1. silence cut right after a take
        await page.evaluate("(()=>{const p=LC79.newProject('NLE');Store.set('lc79-recto',p.id)})();undefined;")
        n=await page.evaluate(MK+"('A','#1e3a8a',[[0,1.5],[6,7],[9,10]],10)")
        ok(n>=90,'take A recorded with a level track (%d values)'%n)
        await page.evaluate("LC79.afterTake(LanckrietStudio._t.Takes.get('tA'));undefined;")
        cuts=await page.evaluate("LanckrietStudio._t.Takes.get('tA').cuts")
        ok(len(cuts)==1 and 1.5<=cuts[0]['s']<=2.0 and 5.6<=cuts[0]['e']<=6.1,'after the take the 4.5 s silence is cut automatically, the 2 s pause stays: '+json.dumps(cuts))
        st=await page.evaluate("(()=>{const p="+CUR+";const s=LC79.segments(p);return[p.clips.length,p.clips.every(c=>c.raw),s.total,s.map(x=>[+x.T0.toFixed(2),+x.s.toFixed(2),+x.e.toFixed(2)])]})()")
        ok(st[0]==2 and st[1] and 5.4<st[2]<6.6,'take lands in the recording project as 2 voice blocks, ripple total %.2f s %s'%(st[2],st[3]))
        n=await page.evaluate(MK+"('B','#7f1d1d',[[0,10]],6)")
        ok(n>=45,'take B recorded (no silence, %d values)'%n)
        await page.evaluate("Store.set('lc79-recto','');undefined;")
        # 2. editor
        await page.evaluate("LC79.openProjects();undefined;"); await page.wait_for_timeout(900)
        await page.click('#lc79-ed [data-a="addtake"][data-take="tB"]'); await page.wait_for_timeout(400)
        ui=await page.evaluate("[document.querySelectorAll('#lc79-ed .lc79-clip').length,document.querySelectorAll('#lc79-ed .lc79-hd').length,document.querySelectorAll('#lc79-ed .lc79-ruler i').length]")
        ok(ui[0]==3 and ui[1]==6 and ui[2]>=3,'timeline: 3 blocks, a trim handle on both edges, a ruler '+str(ui))
        t0=await page.evaluate("LC79.segments("+CUR+").total")
        await page.click('#lc79-ed [data-a="silq"][data-v="1.5"]'); await page.click('#lc79-ed [data-a="cutsil"]'); await page.wait_for_timeout(500)
        t1=await page.evaluate("[LC79.segments("+CUR+").total,"+CUR+".clips.length]")
        ok(t1[1]==4 and 1.2<t0-t1[0]<2.0,'Cut silences 1.5 s removes the 2 s pause: %.2f -> %.2f s, %d blocks'%(t0,t1[0],t1[1]))
        await page.focus('#lc79-ed [data-a="home"]'); await page.keyboard.press('Control+z'); await page.wait_for_timeout(300)
        ok(await page.evaluate(CUR+".clips.length")==3,'Ctrl+Z undoes the silence cut')
        await page.click('#lc79-ed [data-a="cutsil"]'); await page.wait_for_timeout(300)
        # 3. split at the playhead with S
        await page.evaluate("LC79._ed.T=0.8;undefined;"); await page.focus('#lc79-ed [data-a="home"]'); await page.keyboard.press('s'); await page.wait_for_timeout(300)
        sp=await page.evaluate("(()=>{const p="+CUR+";return[p.clips.length,p.clips[0].out,p.clips[1].in]})()")
        ok(sp[0]==5 and abs(sp[1]-0.8)<0.02 and abs(sp[2]-0.8)<0.02,'S splits the block under the playhead at 0.8 s '+str(sp))
        # 4. trim handle drag (right edge of block 1, 40 px to the left)
        before=await page.evaluate("[LC79.segments("+CUR+").total,"+CUR+".clips[0].out]")
        h=await page.evaluate("(()=>{const r=document.querySelectorAll('#lc79-ed .lc79-clip')[0].querySelector('.lc79-hd.r').getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2]})()")
        await page.mouse.move(h[0],h[1]); await page.mouse.down(); await page.mouse.move(h[0]-20,h[1],steps=4); await page.mouse.move(h[0]-40,h[1],steps=4); await page.mouse.up(); await page.wait_for_timeout(400)
        after=await page.evaluate("(()=>{const p="+CUR+",s=LC79.segments(p);let gap=0;for(let i=1;i<s.length;i++)gap=Math.max(gap,Math.abs(s[i].T0-(s[i-1].T0+s[i-1].e-s[i-1].s)));return[s.total,p.clips[0].out,gap]})()")
        ok(after[1]<before[1]-0.05 and abs((before[0]-after[0])-(before[1]-after[1]))<0.02 and after[2]<1e-6,'dragging the right handle trims block 1 (%.2f -> %.2f s) and the rest closes up, gap %.4f'%(before[1],after[1],after[2]))
        # left handle of block 2
        before=await page.evaluate(CUR+".clips[1].in")
        h=await page.evaluate("(()=>{const r=document.querySelectorAll('#lc79-ed .lc79-clip')[1].querySelector('.lc79-hd.l').getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2]})()")
        await page.mouse.move(h[0],h[1]); await page.mouse.down(); await page.mouse.move(h[0]+30,h[1],steps=5); await page.mouse.up(); await page.wait_for_timeout(400)
        ok(await page.evaluate(CUR+".clips[1].in")>before+0.05,'dragging the left handle trims the start of block 2')
        # 5. select a block and delete it
        n0=await page.evaluate(CUR+".clips.length")
        bx=await page.evaluate("(()=>{const r=document.querySelectorAll('#lc79-ed .lc79-clip')[2].getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2]})()")
        await page.mouse.click(bx[0],bx[1]); await page.wait_for_timeout(300)
        sel=await page.evaluate("LC79._ed.sel")
        await page.keyboard.press('Delete'); await page.wait_for_timeout(400)
        dl=await page.evaluate("(()=>{const p="+CUR+",s=LC79.segments(p);let gap=0;for(let i=1;i<s.length;i++)gap=Math.max(gap,Math.abs(s[i].T0-(s[i-1].T0+s[i-1].e-s[i-1].s)));return[p.clips.length,gap,p.clips.some(c=>c.id===%s)]})()"%json.dumps(sel and sel.get('id')))
        ok(sel and sel.get('kind')=='clip' and dl[0]==n0-1 and not dl[2] and dl[1]<1e-6,'Delete removes the selected block, no gap left '+str(dl))
        await page.screenshot(path=os.path.join(os.path.dirname(__file__),'shot_nle_1280.png'))
        # 6. two-deck playback: no stall at any cut, time runs at real speed
        pb=await page.evaluate("""(async()=>{const p=%s;const cv=document.createElement('canvas');const ctl={};let s0=0,last=0,maxGap=0,gapAt=0,lastT=-1,back=0,t1=0;
          const r=await LC79.run(p,{canvas:cv,record:false,ctl:ctl,onTime:(t)=>{const n=performance.now();if(!s0){s0=n;last=n}if(n-last>maxGap){maxGap=n-last;gapAt=t}last=n;if(t<lastT-1e-3)back++;lastT=t;t1=t}});
          return{wall:(last-s0)/1000,played:t1,total:r.total,stalls:r.stalls,swaps:r.swaps,maxGap:maxGap,gapAt:gapAt,back:back}})()"""%CUR)
        ok(pb['stalls']==0 and pb['swaps']>=2,'every cut is a deck swap with the next clip already loaded: %d swaps, %d stalls'%(pb['swaps'],pb['stalls']))
        ok(abs(pb['wall']-pb['played'])<0.35 and pb['maxGap']<120 and pb['back']==0,'plays in real time without a freeze: %.2f s wall for %.2f s of video, longest frame gap %.0f ms (at %.2f s)'%(pb['wall'],pb['played'],pb['maxGap'],pb['gapAt']))
        # 7. long project: 40 blocks alternating two takes, still 2 decks and no stall
        lp=await page.evaluate("""(async()=>{const p=LC79.newProject('Long');for(let i=0;i<40;i++){const a=i%2?'tA':'tB';const s=(i*0.37)%4;p.clips.push({id:'L'+i,take:a,in:+s.toFixed(2),out:+(s+0.5).toFixed(2),raw:true})}
          const cv=document.createElement('canvas'),ctl={};let vmax=0;const r=await LC79.run(p,{canvas:cv,record:false,ctl:ctl,onTime:()=>{vmax=Math.max(vmax,document.querySelectorAll('body>video').length)}});
          LC79.db().cur=LC79.db().list.find(x=>x.name==='NLE').id;return{stalls:r.stalls,swaps:r.swaps,total:r.total,vmax:vmax}})()""")
        ok(lp['stalls']<=1 and lp['swaps']>=39,'40 cuts back and forth between two takes: %d swaps, %d stalls'%(lp['swaps'],lp['stalls']))
        base=await page.evaluate("Object.keys(LC79._ed.scrubV).length")
        ok(lp['vmax']<=2+base,'playback keeps 2 video elements whatever the length (%d, plus %d still-frame readers)'%(lp['vmax'],base))
        # 8. caption box: select, drag, resize, style
        await page.evaluate("LC79._ed.T=0.4;LC79._ed.paint();undefined;"); await page.wait_for_timeout(800)
        await page.evaluate("document.querySelector('#lc79-ed .lc79-body').scrollTop=0;undefined;")
        await page.click('#lc79-ed [data-a="capstyle"]'); await page.wait_for_timeout(900)
        cr=await page.evaluate("(()=>{const r=LC79._ed.capRect,cv=document.querySelector('#lc79-ed .lc79-stagebox canvas'),b=cv.getBoundingClientRect(),k=b.width/cv.width;return r?[b.left+(r.x+r.w/2)*k,b.top+(r.y+r.h/2)*k,b.left+(r.x+r.w+3*Math.max(1,cv.width/540))*k,b.top+(r.y+r.h+3*Math.max(1,cv.width/540))*k]:null})()")
        ok(cr is not None,'caption box is on the preview')
        if cr:
            print('hit at', await page.evaluate("(()=>{const e=document.elementFromPoint(%f,%f);return e&&(e.tagName+'.'+e.className)})()"%(cr[0],cr[1])), cr)
            y0=await page.evaluate("LC79.capStyle("+CUR+",540,960).y")
            await page.mouse.move(cr[0],cr[1]); await page.mouse.down(); await page.mouse.move(cr[0],cr[1]-150,steps=6); await page.mouse.up(); await page.wait_for_timeout(300)
            y1=await page.evaluate(CUR+".cap&&"+CUR+".cap.y")
            ok(y1 and y1<y0-0.1,'dragging the box moves the captions up (y %.2f -> %.2f)'%(y0,y1))
            cr=await page.evaluate("(()=>{const r=LC79._ed.capRect,cv=document.querySelector('#lc79-ed .lc79-stagebox canvas'),b=cv.getBoundingClientRect(),k=b.width/cv.width,m=3*Math.max(1,cv.width/540);return[b.left+(r.x+r.w+m)*k,b.top+(r.y+r.h+m)*k]})()")
            s0=await page.evaluate(CUR+".cap.scale")
            await page.mouse.move(cr[0],cr[1]); await page.mouse.down(); await page.mouse.move(cr[0]+60,cr[1]+10,steps=6); await page.mouse.up(); await page.wait_for_timeout(300)
            s1=await page.evaluate(CUR+".cap.scale")
            ok(s1>s0*1.1,'dragging the corner makes the captions bigger (scale %.2f -> %.2f)'%(s0,s1))
            await page.click('#lc79-ed [data-f="c_box"]'); await page.wait_for_timeout(200)
            await page.evaluate("(()=>{const i=document.querySelector('#lc79-ed [data-f=\"c_fg\"]');i.value='#fbbf24';i.dispatchEvent(new Event('change',{bubbles:true}))})();undefined;")
            stl=await page.evaluate(CUR+".cap")
            ok(stl['box'] is False and stl['fg']=='#fbbf24','style: background box off, text colour set '+json.dumps(stl))
            await page.screenshot(path=os.path.join(os.path.dirname(__file__),'shot_caption_box.png'))
            # the caption is burned into a played frame at its new place
            px=await page.evaluate("""(async()=>{const p=%s;const cv=document.createElement('canvas');const ctl={};let hit=null;await LC79.run(p,{canvas:cv,record:false,ctl:ctl,onTime:(t)=>{if(hit==null&&t>0.5){const g=cv.getContext('2d'),c=LC79.capStyle(p,cv.width,cv.height),y=Math.round(c.y*cv.height),d=g.getImageData(0,Math.max(0,y-40),cv.width,80).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]>220&&d[i+1]>160&&d[i+1]<210&&d[i+2]<90)n++;hit=n;ctl.stopped=true}}});return hit})()"""%CUR)
            ok(px and px>30,'played frame shows the yellow caption at the box position (%s px)'%px)
        # 9. layout
        ovf=await page.evaluate("document.querySelector('#lc79-ed .lc79-body').scrollWidth<=document.querySelector('#lc79-ed').clientWidth+1")
        ok(ovf,'no sideways page scroll at 1280 px (the timeline scrolls inside itself)')
        await page.set_viewport_size({'width':390,'height':844}); await page.wait_for_timeout(600)
        await page.evaluate("LC79._ed.sel=null;LC79._ed.paint();document.querySelector('#lc79-ed .lc79-tl').scrollIntoView();undefined;"); await page.wait_for_timeout(500)
        await page.screenshot(path=os.path.join(os.path.dirname(__file__),'shot_nle_390.png'))
        small=await page.evaluate("[...document.querySelectorAll('#lc79-ed .lc79-tlbar button')].filter(b=>b.offsetParent&&b.getBoundingClientRect().height<44).map(b=>b.textContent.trim())")
        ok(not small,'timeline tool buttons >= 44 px at 390 px '+str(small))
        ovf=await page.evaluate("document.querySelector('#lc79-ed .lc79-body').scrollWidth<=document.querySelector('#lc79-ed').clientWidth+1")
        ok(ovf,'no sideways page scroll at 390 px')
        ok(not errs,'no page errors '+str(errs[:3]))
        await b.close()
    bad=[m for c,m in R if not c]; print('RESULT',len(R)-len(bad),'passed',len(bad),'failed'); sys.exit(1 if bad else 0)
asyncio.run(main())
