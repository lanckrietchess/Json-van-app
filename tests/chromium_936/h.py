# harness: python3 h.py <script.py>  ; script defines async def run(pg,ctx,chk)
import asyncio, json, os, sys, importlib.util
from playwright.async_api import async_playwright
NM='/home/claude/w/node_modules/'
LIBS={'jquery':NM+'jquery/dist/jquery.min.js','chess.min.js':NM+'chess.js/chess.js','chessboard':NM+'@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js'}
EXTRA={}
res=[]
def chk(n,ok,x=None): res.append(('PASS ' if ok else 'FAIL ')+n+('' if x is None else ' '+json.dumps(x)[:300]))
async def route(r):
    u=r.request.url
    for k,v in EXTRA.items():
        if k in u:
            body=v(u,r.request) if callable(v) else v
            return await r.fulfill(status=200,body=body if isinstance(body,str) else json.dumps(body),content_type='application/json',headers={'access-control-allow-origin':'*'})
    if 'cdnjs.cloudflare.com' in u:
        for k,f in LIBS.items():
            if k in u and u.endswith('.js'):
                body=open(f).read()
                if k=='chess.min.js': body='var exports={};'+body+';window.Chess=window.Chess||exports.Chess;'
                return await r.fulfill(status=200,body=body,content_type='application/javascript')
        if 'chessboard' in u and u.endswith('.css'): return await r.fulfill(status=200,body=open(NM+'@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.css').read(),content_type='text/css')
        return await r.fulfill(status=200,body='',content_type='text/css' if u.endswith('.css') else 'application/javascript')
    if u.startswith('http://localhost:8765'): return await r.continue_()
    if 'chessboardjs.com' in u: return await r.abort()
    return await r.abort()
async def main(path,w,h):
    spec=importlib.util.spec_from_file_location('t',path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
    EXTRA.update(getattr(m,'EXTRA',{}))
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={'width':w,'height':h},device_scale_factor=1,is_mobile=w<500,has_touch=w<500,service_workers='block')
        await ctx.route('**/*',route)
        init=getattr(m,'INIT','')
        if init: await ctx.add_init_script(init)
        pg=await ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)[:300]))
        try:
            await m.run(pg,ctx,chk)
        except Exception as e:
            chk('EXCEPTION',False,str(e)[:200])
        chk('no page errors',not errs,errs[:5])
        await b.close()
    print('\n'.join(res))
w=int(os.environ.get('W','390'));h=int(os.environ.get('H','844'))
asyncio.run(main(sys.argv[1],w,h))
