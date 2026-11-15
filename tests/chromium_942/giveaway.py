"""Release Giveaway (LC82) in real Chromium with a stubbed Supabase: link a chess account, join, the public board, the banner, the Social menu
   entry, the owner overview with the winners' SQL, the landing page counters and board, 390 px layout.
   From the repo root: npm i chess.js@0.10.3 jquery@3.7.1 @chrisoakman/chessboardjs@1.0.0 html2canvas@1.4.1
   then NM=./node_modules python3 tests/chromium_942/giveaway.py"""
import asyncio, json, os, threading, http.server, functools, time
from playwright.async_api import async_playwright
ROOT=os.environ.get('SITE',os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))); NM=os.environ.get('NM','node_modules')
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8767),functools.partial(H,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start()
CDN={'jquery.min.js':NM+'/jquery/dist/jquery.min.js','chess.min.js':NM+'/chess.js/chess.js','chessboard-1.0.0.min.js':NM+'/@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js','html2canvas.min.js':NM+'/html2canvas/dist/html2canvas.min.js'}
R=[]
def ok(c,m): R.append((bool(c),m)); print(('PASS ' if c else 'FAIL ')+m, flush=True)
now=time.time()
iso=lambda t: time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime(t))
G={'id':'release-2026','title':'Release Giveaway','starts_at':iso(now-86400*2),'ends_at':iso(now+86400*13),'winners':5,'prize':'1 month of Pro','rank_by':'last','running':True,'upcoming':False,'ended':False}
S={'linked':False,'joined':None,'calls':[]}
ROWS=[{'rank':1,'first_name':'Bram','site':'lichess','start':1500,'now':1720,'peak':1720,'gain':220},{'rank':3,'first_name':'Cleo','site':'chesscom','start':800,'now':850,'peak':850,'gain':50}]
def status():
    d={'ok':True,'signed_in':True,'giveaway':G,'entries':3,'linked':S['linked'],'site':'chesscom' if S['linked'] else None,'uname':'anna_chess' if S['linked'] else None,'rating':1000 if S['linked'] else None,'first_name':'Anna'}
    j=S['joined']
    if j: d['entry']={'start':1000,'last':1150,'peak':1180,'gain':150,'rank':2,'show_public':j['pub'],'joined_at':iso(now),'last_at':iso(now),'site':'chesscom','uname':'anna_chess'}
    return d
ADMIN={'ok':True,'giveaway':G,'giveaways':[G],'entries':[
  {'user_id':'00000000-0000-0000-0000-00000000000b','rank':1,'gain':220,'email':'b@x.be','first_name':'Bram','site':'lichess','uname':'bram_l','start':1500,'now':1720,'peak':1720,'show_public':True,'joined_at':iso(now),'last_at':iso(now),'awarded_at':None,'disqualified':False,'note':None},
  {'user_id':'00000000-0000-0000-0000-00000000000a','rank':2,'gain':150,'email':'a@x.be','first_name':'Anna','site':'chesscom','uname':'anna_chess','start':1000,'now':1150,'peak':1180,'show_public':True,'joined_at':iso(now),'last_at':iso(now),'awarded_at':None,'disqualified':False,'note':None}],
  'top_gains':[{'email':'b@x.be','site':'lichess','uname':'bram_l','start':1500,'now':1720,'peak':1720,'gain':220}],
  'five_star':[{'email':'a@x.be','message':'The Trim found my real leak.','elo':'+150','showcase':'true','status':'pending','at':iso(now)}],
  'proof':{'ok':True,'elo_gained':450,'members_gained':3,'reviews':{'five_star':2,'rated':3,'avg':4.67},'giveaway':G,'giveaway_entries':3}}
async def main():
    async with async_playwright() as p:
        kw={'args':['--disable-dev-shm-usage']}
        if os.environ.get('CHROME'): kw['executable_path']=os.environ['CHROME']
        b=await p.chromium.launch(**kw)
        async def route(r):
            u=r.request.url
            for k,v in CDN.items():
                if u.endswith(k): return await r.fulfill(path=v,content_type='application/javascript')
            if '127.0.0.1' in u: return await r.continue_()
            if 'supabase.co' in u:
                J=lambda d,st=200: r.fulfill(status=st,body=json.dumps(d),content_type='application/json')
                body={}
                try: body=json.loads(r.request.post_data or '{}')
                except Exception: pass
                if '/auth/v1/user' in u: return await J({'id':'u1','email':'a@x.be','user_metadata':{}})
                if '/functions/v1/elo-verify' in u:
                    S['calls'].append(('verify',body)); S['linked']=True
                    return await J({'ok':True,'first':True,'site':'chesscom','uname':body.get('username'),'start':1000,'last':1000,'peak':1000,'catchup':0})
                fn=u.split('/rpc/')[-1].split('?')[0] if '/rpc/' in u else ''
                if fn: S['calls'].append((fn,body))
                if fn=='lc82_social_proof': return await J(ADMIN['proof'])
                if fn=='lc82_board_public': return await J({'ok':True,'giveaway':G,'entries':3,'rows':ROWS})
                if fn=='lc82_status': return await J(status())
                if fn=='lc82_join': S['joined']={'pub':body.get('p_public'),'first':body.get('p_first')}; return await J(status())
                if fn=='lc82_public_set': S['joined']['pub']=body.get('p_public'); return await J(status())
                if fn=='lc82_admin_board': return await J(ADMIN)
                if fn=='lc82_admin_mark':
                    for e in ADMIN['entries']:
                        if e['user_id']==body.get('p_user') and body.get('p_awarded') is not None: e['awarded_at']=iso(now) if body['p_awarded'] else None
                    return await J(ADMIN)
                return await r.fulfill(status=404,body='{}',content_type='application/json')
            return await r.fulfill(status=503,body='')
        SEED="""localStorage.setItem('lc26-auth',JSON.stringify({email:'%s',access_token:'x',exp:9999999999999,user:{id:'u1',email:'%s'}}));localStorage.setItem('lc6-state-v1',JSON.stringify({total:1700,xp:{}}));localStorage.setItem('lc19-sw',JSON.stringify({on:false}));localStorage.setItem('lc42-onb',JSON.stringify({done:true}));localStorage.setItem('lc71-day0',JSON.stringify(Date.now()-9e8));"""
        for W in (390,1280):
            ctx=await b.new_context(viewport={'width':W,'height':844 if W==390 else 900},service_workers='block')
            await ctx.route('**/*',route)
            page=await ctx.new_page(); errs=[]
            page.on('pageerror',lambda e: errs.append(str(e)))
            page.on('dialog',lambda d: asyncio.ensure_future(d.accept('ok')))
            await page.add_init_script(SEED%('a@x.be','a@x.be'))
            S['linked']=False; S['joined']=None; S['calls']=[]
            await page.goto('http://127.0.0.1:8767/app.html#giveaway'); await page.wait_for_timeout(5500)
            await page.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());if(location.hash!=='#giveaway'){location.hash='#giveaway'};undefined;"); await page.wait_for_timeout(1800)
            await page.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());undefined;")
            t=await page.evaluate("[location.hash,!!document.querySelector('.lc82-page'),(document.querySelector('.lc82-stats')||{}).textContent||'',!!document.querySelector('[data-lc82-link]')]")
            ok(t[0]=='#giveaway' and t[1] and '+450' in t[2] and '2' in t[2] and t[3],'%d px: #giveaway opens with the counters (+450 ELO, 2 five-star) and the link step %s'%(W,str(t[:3])[:120]))
            await page.select_option('[data-lc82-link] select[name=site]','chesscom'); await page.fill('[data-lc82-link] input[name=u]','anna_chess')
            await page.click('[data-lc82-link] button[type=submit]'); await page.wait_for_timeout(2500)
            v=[c for c in S['calls'] if c[0]=='verify']
            ok(v and v[0][1].get('username')=='anna_chess' and v[0][1].get('site')=='chesscom','linking calls elo-verify with the username (the server reads the rating): '+str(v[:1]))
            ok(await page.evaluate("!!document.querySelector('[data-lc82=join]')&&/1000/.test(document.querySelector('.lc82-card').textContent)"),'step 3 shows the verified start rating 1000 and the Join button')
            await page.check('[data-lc82-pub]'); await page.wait_for_timeout(200)
            ok(await page.evaluate("!document.querySelector('.lc82-fn').hidden"),'ticking the public board shows the first-name field (box is OFF by default)')
            await page.fill('[data-lc82-first]','Anna'); await page.click('[data-lc82=join]'); await page.wait_for_timeout(2200)
            j=[c for c in S['calls'] if c[0]=='lc82_join']
            ok(j and j[-1][1]=={'p_first':'Anna','p_public':True},'Join sends first name + public consent: '+str(j[-1:]))
            me=await page.evaluate("(document.querySelector('.lc82-me')||{}).textContent||''")
            ok('1000' in me and '+150' in me and '#2' in me,'joined: start, now, gain and rank are shown: '+me[:80])
            bd=await page.evaluate("[...document.querySelectorAll('.lc82-board li')].map(l=>l.textContent)")
            ok(len(bd)==2 and 'Bram' in bd[0] and '+220' in bd[0],'the public board lists the opted-in players with their rank '+str(bd))
            ok(await page.evaluate("!/a@x\\.be|anna_chess|bram_l/.test(document.querySelector('[data-lc82-board]').textContent)"),'the board shows no e-mail or username')
            await page.evaluate("location.hash='#quests';undefined;"); await page.wait_for_timeout(1800)
            bn=await page.evaluate("(document.querySelector('.lc82-ban')||{}).textContent||''")
            ok('you are in' in bn and '+150' in bn,'banner on #quests: "you are in" with the gain: '+bn[:90])
            ok(await page.evaluate("!!document.querySelector('a[href=\"#giveaway\"]')"),'the banner links to #giveaway')
            await page.click('.lc82-ban [data-lc82=x]'); await page.wait_for_timeout(200)
            ok(await page.evaluate("!document.querySelector('.lc82-ban')&&Date.now()-Store.get('lc82-ban',0)<5000"),'× hides the banner for 3 days')
            ok(await page.evaluate("Nav5&&JSON.stringify(Object.keys(MOUNT)).includes('giveaway')&&document.documentElement.innerHTML.includes('#giveaway')"),'route registered; the Social menu has a Release Giveaway entry')
            # layout
            await page.evaluate("location.hash='#giveaway';undefined;"); await page.wait_for_timeout(1800)
            lay=await page.evaluate("[document.documentElement.scrollWidth-innerWidth,[...document.querySelectorAll('.lc82-page button,.lc82-page a.btn,.lc82-page summary')].filter(b=>b.offsetParent&&b.getBoundingClientRect().height<43.5).map(b=>b.textContent.trim().slice(0,20))]")
            ok(lay[0]<=0 and not lay[1],'%d px: no sideways scroll, every button >= 44 px %s'%(W,str(lay)))
            # owner
            await page.evaluate("LC49.owner=()=>true;location.hash='#giveaway-admin';undefined;"); await page.wait_for_timeout(2200)
            ad=await page.evaluate("[document.querySelectorAll('.lc82-t tbody tr').length,(document.querySelector('[data-lc82-sql]')||{}).value||'',(document.querySelector('.lc82-rev')||{}).textContent||'']")
            ok(ad[0]==2,'owner: entries table with 2 rows')
            ok(ad[1].count('_lc_create_license(')==2 and "'b@x.be', 'giveaway', 'Pro (Release Giveaway, 1 month)', 2, false, now() + interval '30 days', 10" in ad[1] and 'update public.lc82_entries set awarded_at' in ad[1],'owner: the winners SQL grants 30 days of Pro per winner and marks them awarded')
            ok('Trim found my real leak' in ad[2],'owner: five-star reviews listed')
            await page.click('.lc82-t tbody tr:first-child [data-lc82a=award]'); await page.wait_for_timeout(900)
            m=[c for c in S['calls'] if c[0]=='lc82_admin_mark']
            ok(m and m[-1][1].get('p_awarded') is True and await page.evaluate("document.querySelector('.lc82-t tbody tr:first-child').textContent.includes('Awarded')"),'Mark awarded calls lc82_admin_mark and the row shows ✓ Awarded')
            ok(await page.evaluate("(document.querySelector('[data-lc82-sql]')||{}).value.split('_lc_create_license(').length-1")==1,'the SQL then only holds the winner not yet awarded')
            for e in ADMIN['entries']: e['awarded_at']=None
            lay=await page.evaluate("document.documentElement.scrollWidth-innerWidth")
            ok(lay<=0,'%d px: owner page has no sideways page scroll (the table scrolls inside)'%W)
            ok(not errs,'no page errors '+str(errs[:3]))
            # landing
            lp=await ctx.new_page(); lerr=[]; lp.on('pageerror',lambda e: lerr.append(str(e)))
            await lp.goto('http://127.0.0.1:8767/index.html'); await lp.wait_for_timeout(2500)
            L=await lp.evaluate("[!document.getElementById('giveaway').classList.contains('hide'),document.getElementById('gw-board').children.length,(document.getElementById('sp-stats')||{}).textContent||'',(document.getElementById('gw-when')||{}).textContent||'',document.documentElement.scrollWidth-innerWidth]")
            ok(L[0] and L[1]==2 and '+450' in L[2] and 'five-star' in L[2] and 'days left' in L[3] and L[4]<=0,'%d px landing: giveaway section, 2 board rows, +450 / five-star counters, days left, no sideways scroll %s'%(W,str(L)[:140]))
            ok(not lerr,'landing: no page errors '+str(lerr[:2]))
            await ctx.close()
        await b.close()
    print('RESULT %d passed %d failed'%(sum(1 for r in R if r[0]),sum(1 for r in R if not r[0])))
asyncio.run(main())
