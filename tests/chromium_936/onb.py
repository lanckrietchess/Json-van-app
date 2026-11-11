PGN='[White "me"]\n[Black "opp"]\n[Result "0-1"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3# 0-1'
INIT='try{localStorage.setItem("lc6-state-v1",JSON.stringify({total:0,xp:{}}));}catch(e){}'
async def run(pg,ctx,chk):
    await pg.goto('http://localhost:8765/app.html#quests');await pg.wait_for_timeout(5000)
    await pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());undefined;")
    chk('no ghost card before the road is done',await pg.evaluate("!document.querySelector('[data-lc25-ghost]')"))
    await pg.evaluate("(p)=>{LC39._t.games=async(site,user,n)=>[{pgn:p,color:'w',opp:'opp',res:'0-1',t:1}];Store.set('lc42-onb',{step:'tease',site:'chesscom',user:'me',at:Date.now(),since:Date.now(),scan:{done:0,tot:0,leaks:{}}});LC42._t.teaser();}",PGN)
    for i in range(12):
        await pg.wait_for_timeout(500)
        if await pg.evaluate("!!document.querySelector('.sheet-wrap [data-lc42-prev] *')"): break
    chk('live preview board shows while scanning',await pg.evaluate("!!document.querySelector('.sheet-wrap [data-lc42-prev] .board-host, .sheet-wrap [data-lc42-prev] [data-square], .sheet-wrap [data-lc42-prev] *')"))
    await pg.screenshot(path='/home/claude/w/shots/teaser_scan.png')
    for i in range(30):
        await pg.wait_for_timeout(1000)
        if await pg.evaluate("!!document.querySelector('.sheet-wrap .lc52-card')"): break
    chk('first mistake card appears',await pg.evaluate("(document.querySelector('.sheet-wrap .lc52-h')||{}).textContent||''"))
    await pg.evaluate("(document.querySelector('.sheet-wrap [data-lc42-full]')||{click(){}}).click();undefined;")
    for i in range(60):
        await pg.wait_for_timeout(2000)
        if await pg.evaluate("!!document.querySelector('#lc42-claim')||(Store.get('lc42-onb')||{}).step!=='first'"): break
    await pg.wait_for_timeout(500)
    print(await pg.evaluate("(()=>({h:location.hash,goto:document.querySelectorAll('[data-act=goto]').length,rv:(document.querySelector('[data-act=review]')||{}).disabled,q:(document.querySelector('#an-quota')||{}).textContent,moves:(document.querySelector('#an-moves')||{children:[]}).children.length,stats:Object.keys((Store.get('lc-hub-trim-stats-v1',{})||{}).games||{}).length,onb:Store.get('lc42-onb')}))()"))
    st=await pg.evaluate("(()=>{const s=Store.get('lc42-onb')||{};return{step:s.step,ready2:!!s.ready2,claim:!!document.querySelector('#lc42-claim'),levelSheet:[...document.querySelectorAll('.sheet-wrap')].map(x=>x.innerText.slice(0,40)),y:Math.round(scrollY),boardY:Math.round(document.querySelector('.board-shell').getBoundingClientRect().top)}})()")
    chk('review done on Trim: no Level 2 pop-up, a Claim bar instead',st['step']=='first' and st['claim'] and not any('Level 2' in x for x in st['levelSheet']),st)
    await pg.screenshot(path='/home/claude/w/shots/claim.png')
    await pg.evaluate("(document.querySelector('[data-lc42-claim]')||{click(){}}).click();undefined;");await pg.wait_for_timeout(1200)
    chk('Claim opens Level 2',await pg.evaluate("[...document.querySelectorAll('.sheet-wrap')].some(x=>/Level 2/.test(x.innerText))&&(Store.get('lc42-onb')||{}).step==='sys'"))
    await pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());undefined;")
    lay=await pg.evaluate("(()=>{const a=document.querySelector('#coach'),b=document.querySelector('#lc71-coachbox'),mv=document.querySelector('#an-moves');return{box:!!b,boxInAside:!!(b&&a.contains(b)),card:!!(b&&b.querySelector('#lc66-coach')),km:!!(b&&b.querySelector('#lc71-km .lc71-kmnav')),asideAfterMoves:!!(mv&&a&&(mv.compareDocumentPosition(a)&4)),askHidden:[...document.querySelectorAll('#an-report button')].filter(x=>/Ask the coach about this game/.test(x.textContent)).every(x=>getComputedStyle(x).display==='none'),lib:!!document.querySelector('#lc39-lib .lc71-libtog')}})()")
    chk('Trim: one coach place with key moments + card (phone)',lay['box'] and lay['boxInAside'] and lay['card'] and lay['km'] and lay['asideAfterMoves'] and lay['askHidden'],lay)
    chk('library has the fold toggle',lay['lib'])
    await pg.evaluate("LC30.authed=async(n,a)=>n==='lc71_warn_list'?{ok:true,rows:[{name:'Sam',text:'Their queen was already eyeing g2.',match:1}]}:{ok:true};undefined;")
    await pg.evaluate("(()=>{const d=document.querySelector('#lc71-coachbox details[data-lc71-crowd]');d.open=true})()")
    await pg.wait_for_timeout(600)
    w=await pg.evaluate("(()=>{const d=document.querySelector('#lc71-coachbox details[data-lc71-crowd]');return d?d.innerText:null})()")
    chk('warning dropdown lists answers + Send one for approval myself',bool(w) and 'Sam' in w and 'Send one for approval myself' in w,w)
    sw=await pg.evaluate("document.documentElement.scrollWidth");chk('Trim no horizontal scroll',sw<=pg.viewport_size['width'],sw)
    await pg.evaluate("window.scrollTo(0,document.querySelector('#lc71-coachbox').getBoundingClientRect().top+scrollY-80)")
    await pg.screenshot(path='/home/claude/w/shots/trim_coach.png')
    nb=await pg.evaluate("[...document.querySelectorAll('#lc71-km .lc71-kmnav .btn, .lc71-libtog, [data-lc71-own], #lc42-claim .btn')].map(b=>Math.round(b.getBoundingClientRect().height)).filter(h=>h>0)")
    chk('new tap targets >= 44 px',all(h>=44 for h in nb),nb)
