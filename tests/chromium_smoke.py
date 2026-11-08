import subprocess,sys,time,json,os
os.environ['PLAYWRIGHT_BROWSERS_PATH']='/opt/pw-browsers'
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','-d','/home/claude/w/site'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
from playwright.sync_api import sync_playwright
out={}
try:
    with sync_playwright() as p:
        b=p.chromium.launch()
        ctx=b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,service_workers='block')
        errs=[];pg=ctx.new_page()
        pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e)[:160]))
        pg.on('console',lambda m:errs.append('CONSOLE '+m.text[:160]) if m.type=='error' else None)
        # block external CDNs but serve the three libraries from npm copies
        base='/home/claude/w/jt/node_modules/'
        libs={'jquery.min.js':base+'jquery/dist/jquery.min.js','chess.min.js':base+'chess.js/chess.js','chessboard-1.0.0.min.js':base+'@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js'}
        def route(r):
            u=r.request.url
            for k,v in libs.items():
                if u.endswith(k): return r.fulfill(path=v,content_type='application/javascript')
            if 'localhost:8765' in u: return r.continue_()
            return r.abort()
        pg.route('**/*',route)
        pg.add_init_script("localStorage.setItem('lc6-state-v1',JSON.stringify({total:1700,xp:{}}));localStorage.setItem('lc-hub-v2',JSON.stringify({v:2,profile:{name:'Tester',elo:1500,created:'2026-09-01'},onboarded:true,access:{tier:'free'},credits:{daily:3,purchased:2,lastReset:'2026-11-08'}}));localStorage.setItem('lc42-onb',JSON.stringify({step:'done'}))")
        pg.goto('http://localhost:8765/app.html#quests',wait_until='load'); pg.wait_for_timeout(5000)
        out['footer_version']=pg.evaluate("typeof CONFIG==='undefined'?'?':CONFIG.assetVersion") if False else None
        out['topbar']=pg.evaluate("(document.querySelector('#lc30-xp .lc30-lv')||{}).textContent")
        pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b=>b.click())"); pg.wait_for_timeout(400); pg.evaluate("document.querySelector('#profile-chip').click()"); pg.wait_for_timeout(700)
        out['card']=pg.evaluate("(document.querySelector('.lc39-pmlv')||{}).textContent")
        pg.keyboard.press('Escape')
        pg.evaluate("location.hash='#bot'"); pg.wait_for_timeout(3500)
        out['bt']=pg.evaluate("[...document.querySelector('#bt').children].map(e=>String(e.className).slice(0,22)+'#'+e.id+' order='+getComputedStyle(e).order+' top='+Math.round(e.getBoundingClientRect().top+scrollY)+' h='+Math.round(e.offsetHeight))")
        pg.screenshot(path='/home/claude/w/shot_bot.png')
        out['errors']=errs[:12]
        b.close()
finally:
    srv.terminate()
print(json.dumps(out,indent=1)[:3500])
