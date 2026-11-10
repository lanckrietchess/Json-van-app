import asyncio,json
from playwright.async_api import async_playwright
exec(open('cr.py').read().split('res=[]')[0].split('PZ=')[0])
import importlib
src=open('cr.py').read()
route_src=src[src.index('async def route(r):'):src.index('async def main():')]
PZ={"game":{"pgn":"e4 e5"},"puzzle":{"id":"x","rating":1,"solution":["a2a3"]}};res=[]
exec(route_src)
ITEM=[{"id":"g|5","kind":"brilliant","fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2","san":"Nf3","num":2,"color":"w","ply":2,"title":"Me vs You","opening":"KP","date":"2026-11-01","pgn":"1. e4 e5 2. Nf3 *","user":"w","uci":"g1f3","pv":"","cp":0,"t":1}]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block')
        await ctx.route('**/*',route)
        await ctx.add_init_script('localStorage.setItem("lc6-state-v1",JSON.stringify({total:1700,xp:{}}));localStorage.setItem("lc19-sw",JSON.stringify({on:false}));localStorage.setItem("lc-hub-brilliant-v1",'+json.dumps(json.dumps(ITEM))+');')
        pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
        await pg.goto('http://localhost:8765/app.html#brilliant');await pg.wait_for_timeout(4000)
        await pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());undefined;")
        await pg.wait_for_timeout(600)
        print('VIEW',(await pg.evaluate("document.querySelector('#view').innerText.slice(0,300)+' | bm-show:'+!!document.querySelector('#bm-show')+' rows:'+!!document.querySelector('#bm-show .btn-row')")).replace('\n',' '))
        has=await pg.evaluate("!!document.querySelector('[data-lc68=\"share-brill\"]')")
        print(('PASS' if has else 'FAIL')+' Chromium: Brilliant page has "Share in the community"')
        if has:
            await pg.click('[data-lc68="share-brill"]');await pg.wait_for_timeout(2500)
            await pg.evaluate("document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());undefined;")
            d=await pg.evaluate("JSON.stringify({h:location.hash,draft:localStorage.getItem('lc68-draft')})")
            print(('PASS' if '#community' in d else 'FAIL')+' share opens the community with a draft '+d[:250])
        print('errors',errs[:3])
        await b.close()
asyncio.run(main())
