import subprocess,sys,time,json,os
os.environ['PLAYWRIGHT_BROWSERS_PATH']='/opt/pw-browsers'
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','-d','/home/claude/w/site'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
from playwright.sync_api import sync_playwright
out={}
try:
    with sync_playwright() as p:
        b=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'])
        ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block',permissions=['camera','microphone'])
        pg=ctx.new_page();errs=[]
        pg.on('console',lambda m:errs.append('C:'+m.text[:140]) if m.type in('error','warning') and 'Failed to load' not in m.text else None)
        pg.on('pageerror',lambda e:errs.append((str(e)[:120]+' | '+str(getattr(e,'stack',''))[:600])))
        base='/home/claude/w/jt/node_modules/'
        libs={'jquery.min.js':base+'jquery/dist/jquery.min.js','chess.min.js':base+'chess.js/chess.js','chessboard-1.0.0.min.js':base+'@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js'}
        def route(r):
            u=r.request.url
            for k,v in libs.items():
                if u.endswith(k): return r.fulfill(path=v,content_type='application/javascript')
            return r.continue_() if 'localhost:8765' in u else r.abort()
        pg.route('**/*',route)
        pg.add_init_script("localStorage.setItem('lc6-state-v1',JSON.stringify({total:1700,xp:{}}));localStorage.setItem('lc-hub-v2',JSON.stringify({v:2,profile:{name:'Tester',elo:1500,created:'2026-09-01'},onboarded:true,access:{tier:'free'}}));localStorage.setItem('lc42-onb',JSON.stringify({step:'done'}))")
        pg.goto('http://localhost:8765/app.html#quests',wait_until='load');pg.wait_for_timeout(4000)
        pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b=>b.click())")
        # count intervals / rAF created from now on, to prove the Studio leaves nothing running
        pg.evaluate("""(()=>{window.__iv=new Set();window.__raf=0;const si=window.setInterval,ci=window.clearInterval;window.setInterval=function(){const id=si.apply(window,arguments);window.__iv.add(id);return id};window.clearInterval=function(id){window.__iv.delete(id);return ci(id)};})()""")
        pg.evaluate("Admin.softOn(true)")
        pg.evaluate("location.hash='#creator-studio'")
        pg.wait_for_timeout(1500)
        out['hash']=pg.evaluate("location.hash")
        # find the studio route name
        out['routes']=pg.evaluate("typeof MOUNT==='object'?Object.keys(MOUNT).filter(k=>/stud|creat/i.test(k)):null")
        pg.evaluate("Admin.softOn(true)")
        pg.evaluate("(()=>{const d=document.createElement('div');d.id='sv';d.style.cssText='position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:99999;background:#000';document.body.appendChild(d);window.__un=MOUNT.studio(d)})()"); pg.wait_for_timeout(5000)
        FIND="(()=>{const e=document.querySelector('#sv');return e&&e.shadowRoot&&e.shadowRoot.querySelector('#lcs')?e:null})()"
        out['mounted']=pg.evaluate("!!"+FIND)
        out['adm']=pg.evaluate("[Admin.active,Admin.soft(),typeof LC49!=='undefined'&&LC49.owner&&LC49.owner()]")

        out['tabs']=pg.evaluate("(()=>{const e=%s;return e?e.shadowRoot.querySelectorAll('.lc66-tab').length:0})()"%FIND)
        for t in ('t1','t2','t3','t4'):
            pg.evaluate("(()=>{const e=%s;e.shadowRoot.querySelector('[data-tab=%s]').click()})()"%(FIND,t)); pg.wait_for_timeout(700)
            out['tab_'+t]=pg.evaluate("(()=>{const e=%s;return [...e.shadowRoot.querySelectorAll('.panel')].filter(p=>getComputedStyle(p).display!=='none').map(p=>p.dataset.id+':'+Math.round(p.getBoundingClientRect().width)+'x'+Math.round(p.getBoundingClientRect().height))})()"%FIND)
            if t=='t2': pg.screenshot(path='/home/claude/w/shot_studio_t2.png')
        out['intervals_open']=pg.evaluate("window.__iv.size")
        pg.evaluate("window.__un&&window.__un();document.querySelector('#sv').remove()"); pg.wait_for_timeout(2500)
        out['intervals_after_leaving']=pg.evaluate("window.__iv.size")
        out['setInterval_wrapper_gone']=pg.evaluate("String(window.setInterval).indexOf('lcSweep')<0")
        out['errors']=errs[:8]
        b.close()
finally: srv.terminate()
print(json.dumps(out,indent=1)[:2800])
