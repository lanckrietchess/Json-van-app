# Real lesson chain check (Chromium): lesson done -> Go straight to the Drill -> drill set done -> sparring step. Adjust paths like chromium_real_content.py.
import subprocess,sys,time,json,os
os.environ['PLAYWRIGHT_BROWSERS_PATH']='/opt/pw-browsers'
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','-d','/home/claude/w/site'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
from playwright.sync_api import sync_playwright
out={'steps':[]}
try:
    with sync_playwright() as p:
        b=p.chromium.launch()
        ctx=b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,service_workers='block')
        pg=ctx.new_page();errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
        base='/home/claude/w/jt/node_modules/'
        libs={'jquery.min.js':base+'jquery/dist/jquery.min.js','chess.min.js':base+'chess.js/chess.js','chessboard-1.0.0.min.js':base+'@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js'}
        def route(r):
            u=r.request.url
            for k,v in libs.items():
                if u.endswith(k): return r.fulfill(path=v,content_type='application/javascript')
            return r.continue_() if 'localhost:8765' in u else r.abort()
        pg.route('**/*',route)
        pg.add_init_script("localStorage.setItem('lc6-state-v1',JSON.stringify({total:1700,xp:{}}));localStorage.setItem('lc-hub-v2',JSON.stringify({v:2,profile:{name:'Tester',elo:1500,created:'2026-09-01'},onboarded:true,access:{tier:'free'},credits:{daily:3,purchased:2}}));localStorage.setItem('lc42-onb',JSON.stringify({step:'done'}))")
        pg.goto('http://localhost:8765/app.html#quests',wait_until='load');pg.wait_for_timeout(5000)
        pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b=>b.click())")
        pg.evaluate("Admin.softOn(true)")
        pg.evaluate("location.hash='#endgame'");pg.wait_for_timeout(2500)
        out['learn_cards']=pg.evaluate("[...document.querySelectorAll('[data-eg-open]')].slice(0,6).map(e=>e.getAttribute('data-eg-open'))")
        out['tabs']=pg.evaluate("[...document.querySelectorAll('#view [role=tab],#view .seg button')].slice(0,8).map(e=>e.textContent.trim().slice(0,20))")
        card=pg.evaluate("(()=>{const e=[...document.querySelectorAll('[data-eg-open]')].filter(x=>/\\|learn$/.test(x.getAttribute('data-eg-open')))[0];return e?e.getAttribute('data-eg-open'):null})()")
        out['card']=card
        if card:
            pg.evaluate("[...document.querySelectorAll('[data-eg-open]')].filter(x=>x.getAttribute('data-eg-open')==%s)[0].click()"%json.dumps(card));pg.wait_for_timeout(1500)
            for i in range(160):
                st=pg.evaluate("(()=>{const k=[...document.querySelectorAll('.st-kicker')].map(x=>x.textContent.trim()).join('|');const b=[...document.querySelectorAll('#view button,#view a.btn')].filter(x=>x.offsetParent).map(x=>(x.getAttribute('data-act')||'')+':'+x.textContent.trim().slice(0,22));return {k:k,b:b.slice(0,8)}})()")
                if i<2 or 'complete' in st['k'].lower(): out['steps'].append((i,st))
                if 'lesson complete' in st['k'].lower(): break
                clicked=pg.evaluate("""(()=>{const q=a=>[...document.querySelectorAll('#view [data-act="'+a+'"]')].filter(x=>x.offsetParent&&!x.disabled)[0];
                  const pick=q('finish')||q('next')||q('show');if(pick){pick.click();return pick.getAttribute('data-act')}return null})()""")
                pg.wait_for_timeout(450)
                if not clicked: break
            pg.wait_for_timeout(1500)
            out['final_text']=pg.evaluate("document.querySelector('#view').innerText.replace(/\\s+/g,' ').slice(0,400)")
            out['sparring_box']=pg.evaluate("!!document.querySelector('[data-lc64-drill]')")
            out['fb_done']=pg.evaluate("[...document.querySelectorAll('.fb-done strong,.fb strong')].map(x=>x.textContent)")
            out['lesson_attrs']=pg.evaluate("[...new Set([...document.querySelectorAll('#view [data-eg-lesson],#view [data-lesson],#view [data-eg-open]')].map(e=>[...e.attributes].map(a=>a.name).filter(n=>/lesson|eg-/.test(n)).join(',')))]")
            out['kicker']=pg.evaluate("[...document.querySelectorAll('.st-kicker')].map(x=>x.textContent.trim())")
            out['action_button']=pg.evaluate("(()=>{const b=document.querySelector('[data-lc64-learn]');return b?b.textContent.trim():null})()")
            out['actions_row']=pg.evaluate("(document.querySelector('.st-actions')||{innerText:''}).innerText.replace(/\\s+/g,' ').slice(0,200)")
            if out['action_button']:
                pg.evaluate("document.querySelector('[data-lc64-learn]').click()");pg.wait_for_timeout(2500)
                out['after_click_cards']=pg.evaluate("document.querySelector('#view').innerText.replace(/\\s+/g,' ').slice(60,200)")
                out['now_part']=pg.evaluate("(document.querySelector('.st-kicker')||{textContent:''}).textContent")
                out['spar_at_start']=pg.evaluate("!!document.querySelector('[data-lc64-drill]')")
                it=0
                for i in range(140):
                    it=i
                    pg.evaluate("""(()=>{const q=a=>[...document.querySelectorAll('#view [data-act="'+a+'"]')].filter(x=>x.offsetParent&&!x.disabled)[0];const p=q('finish')||q('next')||q('show');if(p)p.click()})()""")
                    pg.wait_for_timeout(500)
                    if pg.evaluate("!!document.querySelector('[data-lc64-drill]')"): break
                pg.wait_for_timeout(1500)
                out['iterations']=it; out['kicker_at_box']=pg.evaluate("[...document.querySelectorAll('.st-kicker')].map(x=>x.textContent.trim()).join('|')")
                out['drill_end']=pg.evaluate("({k:(document.querySelector('.st-kicker')||{textContent:''}).textContent,fb:[...document.querySelectorAll('.fb strong')].map(x=>x.textContent),btn:[...document.querySelectorAll('#view button,#view a.btn')].filter(x=>x.offsetParent).map(x=>(x.getAttribute('data-act')||'-')+':'+x.textContent.trim().slice(0,20)).slice(0,10),acts:!!document.querySelector('.st-actions')})")
                out['spar_box']=pg.evaluate("!!document.querySelector('[data-lc64-drill]')")
                if out['spar_box']:
                    pg.evaluate("document.querySelector('[data-lc64=\"spar\"]').click()");pg.wait_for_timeout(1500)
                    out['went_to']=pg.evaluate("location.hash")
        out['errs']=errs[:4]
        print(json.dumps(out,indent=1)[:3500])
        b.close()
finally: srv.terminate()
