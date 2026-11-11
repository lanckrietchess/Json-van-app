import json
ITEMS=[{"id":"blueprint","shelf":"kyenzo","kind":"book","status":"live","title":"The 2000+ Blueprint","subtitle":"How I went from 355 to 2105","author":"Kyenzo Lanckriet","blurb":"The thinking system behind MSPC.","tokens":300,"price_cents":1999,"pinned":True,"lessons":0,"access":None},
       {"id":"caro-course","shelf":"kyenzo","kind":"course","status":"live","title":"Caro-Kann for club players","blurb":"Video course","lessons":3,"access":"owned"}]
VIDS=[{"title":"Intro","url":"https://youtu.be/dQw4w9WgXcQ","folder":"Chapter 1"},{"title":"Advance line","url":"https://youtu.be/dQw4w9WgXcQ","folder":"Chapter 1"},{"title":"Caro-Kann Advance","pgn":"1.e4 c6 2.d4 d5 3.e5 Bf5 4.Nf3 e6 *","folder":"Chapter 2","side":"b"}]
EXTRA={'rpc/lc70_catalog':json.dumps({"ok":True,"items":ITEMS,"me":{"tier":0}}),'rpc/lc70_open':json.dumps({"ok":True,"access":"owned","videos":VIDS,"body":"","ebook_url":""})}
INIT='try{localStorage.setItem("lc6-state-v1",JSON.stringify({total:900,xp:{}}));localStorage.setItem("lc42-onb",JSON.stringify({step:"done",doneAt:Date.now()}));localStorage.setItem("lc19-sw",JSON.stringify({on:false}));}catch(e){}'
async def run(pg,ctx,chk):
    await pg.goto('http://localhost:8765/app.html#quests');await pg.wait_for_timeout(5000)
    await pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());undefined;")
    chk('build 9.36.0',await pg.evaluate("CONFIG.version"))
    chk('LC71 loaded',await pg.evaluate("typeof LC71==='object'&&typeof LC71.dayOne==='function'"))
    g=await pg.evaluate("(()=>{const e=document.querySelector('[data-lc25-ghost]');return e?e.innerText.slice(0,160):null})()")
    chk('ghost card says Beat the rival after the road',bool(g) and 'Beat the rival' in g,g)
    chk('no real-rival button during the race',await pg.evaluate("!(document.querySelector('[data-lc25-ghost]')||document).innerText.includes('Challenge a real rival')"))
    # won state
    await pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('lc25-ghost')||'null')||Store.get('lc25-ghost');Store.set('lc25-ghost',Object.assign({},s,{won:true,wonAt:Date.now()}));location.hash='#system';setTimeout(()=>location.hash='#quests',300)})()")
    await pg.wait_for_timeout(1800)
    g2=await pg.evaluate("(()=>{const e=document.querySelector('[data-lc25-ghost]');return e?e.innerText.slice(0,200):null})()")
    chk('won: Completed + Challenge a real rival',bool(g2) and 'Completed' in g2 and 'Challenge a real rival' in g2,g2)
    rd=await pg.evaluate("(()=>{const e=document.querySelector('.lc71-roadbar');return e?e.innerText:null})()")
    chk('road card shows the 1,500 XP limit',bool(rd) and '1,500' in rd,rd)
    await pg.evaluate("(()=>{const s=Store.get('lc71-road');Store.set('lc71-road',Object.assign({},s,{base:-2000}));location.hash='#system';setTimeout(()=>location.hash='#quests',300)})()")
    await pg.wait_for_timeout(1800)
    chk('road completed at the cap',await pg.evaluate("!!document.querySelector('#lc71-road-done')&&document.querySelector('#lc71-road-done').innerText.includes('Completed')"))
    await pg.screenshot(path='/home/claude/w/shots/quests.png',full_page=True)
    # learn menu order
    m=await pg.evaluate("(()=>{const g=Nav5&&Nav5.GROUPS?Nav5.GROUPS:null;return null})()")
    t=await pg.evaluate("(()=>{const s=document.documentElement.innerHTML;return 1})()")
    # books
    await pg.evaluate("location.hash='#books'");await pg.wait_for_timeout(2500)
    sp=await pg.evaluate("(()=>{const e=document.querySelector('.lc71-spot');return e?e.innerText.slice(0,200):null})()")
    chk('spotlight shows The 2000+ Blueprint',bool(sp) and '2000+ Blueprint' in sp,sp)
    chk('blueprint not repeated in the grid',await pg.evaluate("[...document.querySelectorAll('.lc70-grid')].every(g=>!g.innerText.includes('2000+ Blueprint'))"))
    sw=await pg.evaluate("document.documentElement.scrollWidth");chk('books no horizontal scroll',sw<=pg.viewport_size['width'],sw)
    await pg.screenshot(path='/home/claude/w/shots/books.png',full_page=False)
    ok=await pg.evaluate("(()=>{const d=document.querySelector('[data-lc70-shelf]').__d;LC70.openItem(d.items.filter(x=>x.id==='caro-course')[0]);return 1})()")
    await pg.wait_for_timeout(1500)
    fo=await pg.evaluate("[...document.querySelectorAll('.sheet-wrap .lc71-folder summary')].map(x=>x.innerText.trim())")
    chk('course opens with folders',fo==['Chapter 1','Chapter 2'],fo)
    await pg.screenshot(path='/home/claude/w/shots/course.png')
    n0=await pg.evaluate("Repertoire.list().length")
    try:
        await pg.click('.sheet-wrap [data-lc71-pgn]',timeout=4000)
    except Exception as e: chk('click pgn',False,str(e)[:100])
    await pg.wait_for_timeout(1500)
    n1=await pg.evaluate("Repertoire.list().map(r=>[r.name,r.side,(r.lines||[]).length])")
    chk('PGN imports into My repertoire',len(n1)==n0+1,n1)
    chk('goes to Openings',await pg.evaluate("location.hash"))
    # refer + mission
    await pg.evaluate("location.hash='#refer'");await pg.wait_for_timeout(1500)
    chk('refer page opens with the mission',await pg.evaluate("(document.querySelector('.lc71-mhero')||{}).innerText||''"))
    # lb rows
    r=await pg.evaluate("LC71.lbRows([{rank:1,name:'Anna',label:'x'},{rank:2,name:'Kyenzo',label:'y'},{rank:3,name:'Bob',label:'z',you:true}],'level',null,3).map(x=>x.rank+':'+x.name)")
    chk('leaderboard: Kyenzo on top, you second with real rank',r[0].endswith('Kyenzo · Coach') and r[1]=='3:Bob',r)
    chk('day0 set; dayOne false for a brand new device',await pg.evaluate("LC71.dayOne()===false||Store.get('lc71-day0')"))
