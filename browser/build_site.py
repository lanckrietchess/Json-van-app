"""Builds /tmp/site: the SHIPPED index.html served locally with real libraries, icons, fonts and the Stockfish 19 build the app asks for.
Only a test shim is added (network redirection + error capture); the app code is untouched."""
import os,re,shutil,sys,json
ROOT=os.path.dirname(os.path.abspath(__file__))
APP=os.environ.get('APP_DIR',os.path.abspath(os.path.join(ROOT,'..')))
CONTENT=os.environ.get('CONTENT','/mnt/project/content.json')
SRC=sys.argv[1] if len(sys.argv)>1 else os.path.join(APP,'index.html')
OUT=os.environ.get('SITE_DIR','/tmp/site');NM=os.environ.get('NODE_MODULES',ROOT+'/node_modules')
shutil.rmtree(OUT,ignore_errors=True)
for d in ['vendor','vendor/fa','engine','data','vendor/fonts']:os.makedirs(f'{OUT}/{d}',exist_ok=True)
cp=lambda a,b:shutil.copy(a,f'{OUT}/{b}')
cp(f'{NM}/jquery/dist/jquery.min.js','vendor/jquery.min.js')
cp(f'{NM}/chess.js/chess.js','vendor/chess.js')
cp(f'{NM}/@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js','vendor/chessboard.min.js')
cp(f'{NM}/@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.css','vendor/chessboard.min.css')
shutil.copytree(f'{NM}/@fortawesome/fontawesome-free/css',f'{OUT}/vendor/fa/css');shutil.copytree(f'{NM}/@fortawesome/fontawesome-free/webfonts',f'{OUT}/vendor/fa/webfonts')
for f in ['stockfish-19-lite-single.js','stockfish-19-lite-single.wasm']:cp(f'{NM}/stockfish/bin/{f}',f'engine/{f}')
# fonts: the two families the page asks Google for
css=[]
for fam,pkg,specs in [('Schibsted Grotesk','schibsted-grotesk',[(w,'normal') for w in (400,500,600,700,800)]),('Newsreader','newsreader',[(400,'normal'),(500,'normal'),(400,'italic')])]:
    for w,st in specs:
        fn=f'{pkg}-latin-{w}-{st}.woff2';shutil.copy(f'{NM}/@fontsource/{pkg}/files/{fn}',f'{OUT}/vendor/fonts/{fn}')
        css.append(f"@font-face{{font-family:'{fam}';font-style:{st};font-weight:{w};font-display:swap;src:url(/vendor/fonts/{fn}) format('woff2')}}")
open(f'{OUT}/vendor/fonts.css','w').write('\n'.join(css))
# data
shutil.copy(CONTENT,f'{OUT}/data/content.json')
for src,dst in [(os.path.join(APP,'mspc-notes.json'),'mspc-notes.json'),(os.path.join(APP,'puzzle-alts.json'),'puzzle-alts.json')]:shutil.copy(src,f'{OUT}/data/{dst}')
for f in ['manifest.webmanifest','sw.js']:shutil.copy(os.path.join(APP,f),f'{OUT}/{f}')
# a famous public-domain loss for the redemption flow: Morphy v. Duke of Brunswick, the user plays Black
open(f'{OUT}/data/loss.pgn','w').write('''[Event "Opera box"]
[Site "Paris"]
[Date "1858.??.??"]
[White "Morphy"]
[Black "Kyenzo"]
[Result "1-0"]
[UTCDate "2026.10.21"]
[UTCTime "10:00:00"]
[Variant "Standard"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0
''')
html=open(SRC,encoding='utf-8').read()
html=html.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js" crossorigin="anonymous">','<script src="/vendor/jquery.min.js">')
html=html.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js" crossorigin="anonymous">','<script src="/vendor/chess.js">')
html=html.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/chessboard-js/1.0.0/chessboard-1.0.0.min.js" crossorigin="anonymous">','<script src="/vendor/chessboard.min.js">')
html=html.replace('https://cdnjs.cloudflare.com/ajax/libs/chessboard-js/1.0.0/chessboard-1.0.0.min.css','/vendor/chessboard.min.css')
html=html.replace('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css','/vendor/fa/css/all.min.css')
html=re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/[^"]*"[^>]*>','<link rel="stylesheet" href="/vendor/fonts.css">',html)
html=re.sub(r'<link rel="preconnect"[^>]*>','',html)
SHIM=r'''<script>
(function(){
  var real=window.fetch.bind(window);window.__errors=[];window.__log=[];
  var ce=console.error;console.error=function(){try{window.__errors.push([].map.call(arguments,function(a){return a&&a.stack||String(a)}).join(' ').slice(0,300))}catch(e){}return ce.apply(console,arguments)};
  window.addEventListener('error',function(e){window.__errors.push('onerror: '+e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno)});
  window.addEventListener('unhandledrejection',function(e){window.__errors.push('unhandledrejection: '+String(e.reason&&e.reason.message||e.reason).slice(0,200))});
  window.fetch=function(u,i){
    var s=String(u&&u.url||u);window.__log.push(s.slice(0,110));
    if(/mspc-notes\.json/.test(s))return real('/data/mspc-notes.json');
    if(/puzzle-alts\.json/.test(s))return real('/data/puzzle-alts.json');
    if(/short-texts\.json/.test(s))return Promise.resolve(new Response('{}',{status:404}));
    if(/raw\.githubusercontent\.com.*\/(json|content\.json)(\?|$)/.test(s))return real('/data/content.json');
    if(/lichess\.org\/api\/games\/user\/kyenzo.*ongoing=false/i.test(s)&&localStorage.getItem('__test_ndjson'))return Promise.resolve(new Response(localStorage.getItem('__test_ndjson'),{status:200}));
    if(/lichess\.org\/api\/games\/user\/kyenzo/i.test(s))return real('/data/loss.pgn');
    if(/^https?:\/\//.test(s)&&s.indexOf(location.origin)!==0)return Promise.reject(new TypeError('blocked in the test sandbox: '+s.slice(0,60)));
    return real(u,i);
  };
  if(navigator.serviceWorker&&!localStorage.getItem('__real_sw'))navigator.serviceWorker.register=function(){return Promise.resolve()};
})();
</script>'''
html=html.replace('<head>','<head>'+SHIM,1)
open(f'{OUT}/index.html','w',encoding='utf-8').write(html)
open(f'{OUT}/t.html','w').write('<!doctype html><title>t</title>')
open(f'{OUT}/narrow.html','w').write('<!doctype html><title>narrow</title><body style="margin:0;background:#1b1b1b"><iframe id="f" name="f" style="width:360px;height:700px;border:0;display:block"></iframe>')
# real service worker test: dummy icons for the precache list, and a test copy of sw.js that treats /vendor like production treats cdnjs
import zlib,struct
def png(w=8,h=8):
    raw=b''.join(b'\x00'+b'\x1e\x29\x3b'*w for _ in range(h))
    def ch(t,d):
        c=struct.pack('>I',len(d))+t+d
        return c+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+ch(b'IDAT',zlib.compress(raw))+ch(b'IEND',b'')
os.makedirs(f'{OUT}/icons',exist_ok=True)
for n in ['icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png']:
    open(f'{OUT}/icons/{n}','wb').write(png())
sw=open(f'{OUT}/sw.js',encoding='utf-8').read()
assert "if (p.startsWith(SCOPE + 'engine/')) {" in sw
open(f'{OUT}/sw.js','w',encoding='utf-8').write(sw.replace("if (p.startsWith(SCOPE + 'engine/')) {","if (p.startsWith(SCOPE + 'engine/') || p.startsWith(SCOPE + 'vendor/')) {"))
print('site built:',OUT,'| index.html',len(html),'bytes | engine',os.path.getsize(f'{OUT}/engine/stockfish-19-lite-single.wasm'),'bytes wasm')
