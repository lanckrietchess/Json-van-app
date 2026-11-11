import importlib.util
spec=importlib.util.spec_from_file_location('o','/home/claude/t/onb.py');o=importlib.util.module_from_spec(spec);spec.loader.exec_module(o)
PGN=o.PGN
INIT='try{localStorage.setItem("lc6-state-v1",JSON.stringify({total:900,xp:{}}));localStorage.setItem("lc42-onb",JSON.stringify({step:"done"}));localStorage.setItem("lc19-sw",JSON.stringify({on:false}));}catch(e){}'
EXTRA={'lichess.org/api/puzzle/next':'{"game":{"pgn":"e4 e5 Bc4 Nc6 Qh5 Nf6"},"puzzle":{"id":"P1","rating":1400,"solution":["h5f7"],"themes":["mateIn1"]}}'}
async def run(pg,ctx,chk):
    await pg.goto('http://localhost:8765/app.html#shuffle');await pg.wait_for_timeout(5500)
    await pg.evaluate("document.querySelectorAll('.sheet-wrap,.lc30-ask').forEach(x=>x.remove());undefined;")
    sk=await pg.evaluate("(()=>{const b=document.querySelector('#view [data-lc67=\"skip\"]');return b?b.parentNode.innerText:null})()")
    chk('shuffle gate: Skip for everyone with the ritual warning',bool(sk) and 'Skip this puzzle' in sk and 'ritual' in sk,sk)
    await pg.evaluate("(document.querySelector('#view [data-lc67=\"skip\"]')||{click(){}}).click();undefined;")
    for i in range(16):
        await pg.wait_for_timeout(1000)
        if await pg.evaluate("!document.querySelector('#view .lc67-gate')"): break
    print(await pg.evaluate("(document.querySelector('#view')||{}).innerText.slice(0,200)"))
    chk('skip goes into the Shuffle Trainer',await pg.evaluate("!document.querySelector('#view .lc67-gate')"))
