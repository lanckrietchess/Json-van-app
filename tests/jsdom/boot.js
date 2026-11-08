// usage: node boot.js <app.html> [script.js]  -> boots app in jsdom, exposes window as global W
const fs=require('fs'),path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const file=process.argv[2]||'../app.html';
const html=fs.readFileSync(file,'utf8');
const NM=path.join(__dirname,'node_modules');
const libs={
 'jquery.min.js':fs.readFileSync(NM+'/jquery/dist/jquery.min.js','utf8'),
 'chess.min.js':fs.readFileSync(NM+'/chess.js/chess.js','utf8'),
 'chessboard-1.0.0.min.js':fs.readFileSync(NM+'/@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js','utf8')};
const vc=new VirtualConsole();const errs=[];
vc.on('jsdomError',e=>errs.push(String(e.message||e).slice(0,200)));
const seed=process.env.SEED?JSON.parse(process.env.SEED):{};
const libsrc=['jquery/dist/jquery.min.js','chess.js/chess.js','@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js'].map(f=>'<script>'+fs.readFileSync(NM+'/'+f,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>').join('\n');
const htmlx=html.replace(/<script[^>]*src="https:\/\/cdnjs[^>]*><\/script>/g,'').replace('<script',()=>libsrc+'\n<script');
const dom=new JSDOM(htmlx,{url:'https://lanckrietchesstrainerhub.vercel.app/app.html'+(process.env.HASH||'#quests'),runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 Object.entries(seed).forEach(([k,v])=>w.localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v)));
 w.matchMedia=w.matchMedia||(q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
 try{Object.defineProperty(w,'crypto',{value:require('crypto').webcrypto,configurable:true})}catch(e){}try{w.TextEncoder=w.TextEncoder||TextEncoder}catch(e){}
 w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=()=>{};
 w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};w.ResizeObserver=w.IntersectionObserver;
 w.AudioContext=class{};w.HTMLCanvasElement.prototype.getContext=()=>null;
 w.fetch=async(u,i)=>{u=String(u);if(global.FETCH){const r=await global.FETCH(u,i);if(r)return r}if(/content\.json/.test(u)&&fs.existsSync(path.join(path.dirname(file),'content.json')))return{ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(path.join(path.dirname(file),'content.json'),'utf8')),text:async()=>''};return{ok:false,status:404,json:async()=>({}),text:async()=>''}};
}});
const w=dom.window;global.W=w;
setTimeout(async()=>{
 try{ if(process.argv[3]) await require(path.resolve(process.argv[3]))(w,errs); }catch(e){console.log('TEST ERR',String(e.message).slice(0,300))}
 console.log('errs:',errs.slice(0,6));process.exit(0)},4500);
