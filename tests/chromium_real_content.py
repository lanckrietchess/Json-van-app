# Real course data check (Chromium). Needs content.json next to app.html in the served folder; adjust the three library paths (jquery, chess.js, chessboard.js from tests/vendor) and the folder.
import subprocess,sys,time,json,os
os.environ['PLAYWRIGHT_BROWSERS_PATH']='/opt/pw-browsers'
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','-d','/home/claude/w/site'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
from playwright.sync_api import sync_playwright
out={}
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
        out['content']=pg.evaluate("({openings:(CONTENT.openings||[]).length,groups:(CONTENT.groups||[]).length,eg:Object.keys(CONTENT.courses||{}).length, banner:!!document.body.innerText.match(/course data did not load/)})")
        pg.evaluate("location.hash='#openings'");pg.wait_for_timeout(2500)
        pg.evaluate("[...document.querySelectorAll('#view button')].filter(b=>/^Caro-Kann/.test(b.textContent.trim()))[0].click()");pg.wait_for_timeout(1500)
        out['rows_after_group']=pg.evaluate("document.querySelectorAll('[data-line]').length")
        ids=pg.evaluate("(CONTENT.openings||[]).filter(o=>o.group==='Caro-Kann').slice(0,3).map(o=>o.id)")
        out['caro_ids']=ids
        # flag the 2nd line (not the one Train would pick first) and press Train My Repertoire
        out['cards']=pg.evaluate("[...document.querySelectorAll('[data-lv-card]')].slice(0,4).map(c=>c.getAttribute('data-lv-card')+' | '+c.innerText.replace(/\\s+/g,' ').slice(0,60))")
        out['line_fields']=pg.evaluate("(()=>{const o=CONTENT.openings.filter(x=>x.group==='Caro-Kann')[0];return {id:o.id,tree:o.tree,title:o.title,chapter:o.chapter,topic:o.topic}})()")
        un=pg.evaluate("(CONTENT.openings||[]).filter(o=>o.group==='Caro-Kann'&&App.unlocked(o)).slice(0,4).map(o=>({id:o.id,tree:o.tree}))")
        out['unlocked_caro']=un[:3]
        flagid=un[-1]['id'];flagtree=un[-1]['tree']
        pg.evaluate("LC66.flag(%s)"%json.dumps(flagid)); pg.evaluate("LC66.afterRender()"); pg.wait_for_timeout(1200)
        out['star_on_card']=pg.evaluate("(()=>{const c=document.querySelector('[data-lv-card=\"%s\"]');return c?!!c.querySelector('.lc66-star'):'nocard'})()"%flagtree)
        out['stars_total']=pg.evaluate("document.querySelectorAll('.lc66-star').length")
        out['pick_with_flag']=pg.evaluate("(()=>{const g=CONTENT.groups.filter(x=>x.name==='Caro-Kann')[0];const r=LC81.train.pick({lines:(CONTENT.openings||[]).filter(o=>o.group===g.name)});return {why:r.why,id:r.line&&r.line.id,mode:r.mode}})()")
        out['pick_is_flagged_line']=out['pick_with_flag']['id']==flagid
        pg.evaluate("App.progress[%s]={best:.95,runs:1,last:Date.now()+9999}"%json.dumps(flagid)); pg.evaluate("LC66.afterRender()"); pg.wait_for_timeout(1000)
        out['star_after_clean_drill']=pg.evaluate("document.querySelectorAll('.lc66-star').length")
        out['learn_pass_flow']=pg.evaluate("(()=>{const id='%s';Store.set('lc61-learn',{});SmartSkip.mark(id,'learn',1);LC61.learnPass(id);const a=LC61.learnPasses(id);LC61.learnPass(id);return [a,LC61.learnPasses(id)]})()"%un[0]['id'])
        print(json.dumps(out,indent=1)[:2500]); print('errs',errs[:4])
        b.close()
finally: srv.terminate()
