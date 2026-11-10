// boot.js <app.html> <test.js>  : boots the real app.html in jsdom with the real CDN libraries mapped to npm files
const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const NM=path.join(__dirname,'..','node_modules');
const file=process.argv[2],test=process.argv[3];
let html=fs.readFileSync(file,'utf8');
const lib={'jquery':fs.readFileSync(NM+'/jquery/dist/jquery.min.js','utf8'),'chess':fs.readFileSync(NM+'/chess.js/chess.js','utf8'),'chessboard':fs.readFileSync(NM+'/@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js','utf8')};
html=html.replace(/<script[^>]*src="https:\/\/cdnjs[^"]*jquery[^"]*"[^>]*><\/script>/,()=>'<script>'+lib.jquery+'</script>')
 .replace(/<script[^>]*src="https:\/\/cdnjs[^"]*chess\.min\.js"[^>]*><\/script>/,()=>'<script>'+lib.chess+';window.Chess=window.Chess||(typeof Chess!=="undefined"?Chess:exports.Chess)</script>')
 .replace(/<script[^>]*src="https:\/\/cdnjs[^"]*chessboard[^"]*"[^>]*><\/script>/,()=>'<script>'+lib.chessboard+'</script>')
 .replace(/<script[^>]*src="https:\/\/cdn\.tailwindcss[^"]*"[^>]*><\/script>/g,'').replace(/<link[^>]*rel="stylesheet"[^>]*href="https:[^>]*>/g,'');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>{errs.push(String(e.message).slice(0,300))});vc.on('error',(...a)=>{errs.push('console.error '+a.map(x=>String(x&&x.message||x)).join(' ').slice(0,300))});
const CONTENT=process.env.CONTENT||path.join(__dirname,'..','content.json');
const seed=JSON.parse(process.env.SEED||'{}');
const dom=new JSDOM(html,{url:'https://lanckrietchesstrainerhub.vercel.app/app.html'+(process.env.HASH||''),runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
 beforeParse(w){
  w.exports={};
  Object.keys(seed).forEach(k=>w.localStorage.setItem(k,typeof seed[k]==='string'?seed[k]:JSON.stringify(seed[k])));
  w.matchMedia=w.matchMedia||(q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
  w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=function(){};w.Element.prototype.scrollTo=function(){};
  const Ob=class{observe(){}unobserve(){}disconnect(){}};w.IntersectionObserver=Ob;w.ResizeObserver=Ob;
  w.AudioContext=w.webkitAudioContext=class{constructor(){this.currentTime=0;this.destination={};this.state='running'}createOscillator(){return{connect(){},start(){},stop(){},frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}},type:''}}createGain(){return{connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},value:0}}}resume(){return Promise.resolve()}close(){}};
  w.HTMLCanvasElement.prototype.getContext=()=>null;w.HTMLMediaElement.prototype.play=()=>Promise.resolve();w.HTMLMediaElement.prototype.pause=()=>{};
  w.Worker=class{constructor(){}postMessage(){}terminate(){}addEventListener(){}};
  w.navigator.serviceWorker=undefined;
  w.fetch=async(u,i)=>{u=String(u);if(global.FETCH){const r=await global.FETCH(u,i);if(r)return r}
    const p=u.replace(/[?#].*$/,'');
    if(/content\.json$|\/json$/.test(p)&&fs.existsSync(CONTENT)){const t=fs.readFileSync(CONTENT,'utf8');return{ok:true,status:200,json:async()=>JSON.parse(t),text:async()=>t,headers:{get:()=>null}}}
    if(/version\.json$/.test(p))return{ok:true,status:200,json:async()=>({build:'0'}),text:async()=>'{"build":"0"}',headers:{get:()=>null}};
    return{ok:false,status:404,json:async()=>({}),text:async()=>'',headers:{get:()=>null}}};
 }});
const w=dom.window;global.W=w;
setTimeout(async()=>{
  try{ if(test) await require(path.resolve(test))(w,errs); }catch(e){console.log('TEST ERR',String(e&&e.stack||e).slice(0,600))}
  if(process.env.ERRS)console.log('ERRS',errs.length,errs.slice(0,8));
  process.exit(0);
},+(process.env.WAIT||4500));
