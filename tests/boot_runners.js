/* Boots a real index.html in jsdom with the 3 CDN libraries supplied locally. Usage: node boot.js <file> [waitMs] */
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs'),path=require('path');
const file=process.argv[2],wait=+process.argv[3]||6000;
const lib=p=>fs.readFileSync(p,'utf8').replace(/<\/script/gi,'<\\/script');
const cj=lib(path.join(path.dirname(require.resolve('chess.js')),'chess.js'));
const libs='<script>'+lib(require.resolve('jquery/dist/jquery.min.js'))+'</script><script>'+lib(require.resolve('@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js'))+'</script><script>(function(){var exports={};var module={exports:exports};'+cj+';window.Chess=(module.exports&&module.exports.Chess)||exports.Chess||module.exports})()</script>';
let html=fs.readFileSync(file,'utf8').replace(/<script src="https:\/\/cdnjs[^>]*><\/script>/g,'');
const hi=html.indexOf('</head>');html=html.slice(0,hi)+libs+html.slice(hi);
const errors=[],logs=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>errors.push('jsdomError: '+((e.detail&&(e.detail.stack||e.detail.message))||e.message).split('\n').slice(0,3).join(' | ').slice(0,300)));
vc.on('error',(...a)=>errors.push('console.error: '+a.map(x=>x&&x.message||String(x)).join(' ').slice(0,200)));
vc.on('log',(...a)=>logs.push(a.join(' ').slice(0,160)));
const dom=new JSDOM(html,{url:'https://lanckrietchess-app.vercel.app/?source=pwa#home',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){
    const content=fs.readFileSync((process.env.CONTENT||'/mnt/project/content.json'),'utf8');w.fetch=(u)=>/content\.json/.test(String(u))?Promise.resolve({ok:true,status:200,headers:{get:()=>null},json:async()=>JSON.parse(content),text:async()=>content}):Promise.reject(new Error('offline'));
    w.localStorage.setItem('lc19-sw',JSON.stringify({on:false,level:4}));w.localStorage.setItem('lc25-welcomed','true');w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
    w.HTMLCanvasElement.prototype.getContext=()=>null;
    w.requestIdleCallback=w.requestIdleCallback||(f=>setTimeout(f,1));
    w.scrollTo=()=>{};
  }});
const w=dom.window;

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const click=sel=>{const e=w.document.querySelector(sel);if(!e)throw new Error('missing '+sel);e.click()};
const title=()=>{const s=[...w.document.querySelectorAll('.sheet-wrap')].pop();return s?((s.querySelector('h2,h3,.sheet-title')||{}).textContent||'?').trim().slice(0,60):'(no sheet)'};
(async()=>{
  const steps=[];
  await sleep(4000);
  w.document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());

  w.document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());
  const mkBoard=()=>{const calls=[];const st={onMove:null,calls};return new Proxy(st,{get(t,k){if(k in t)return t[k];if(k==='setOnMove')return f=>{t.onMove=f};if(k==='orientation')return o=>o||'white';if(k==='fen')return()=>'';return(...a)=>{t.calls.push(String(k));return undefined}}})};
  const FEN='6k1/5ppp/8/8/8/8/5PPP/R3R1K1 w - - 0 1';
  steps.push(['EG reachable',w.eval('typeof EG')+'/'+w.eval('typeof EG.Runner')+'/'+w.eval('typeof StageRunner')]);

  /* ---- StageRunner (think / middlegame stages) ---- */
  const run=async(label,checkImpl,mv)=>{
    const host=w.document.createElement('div');w.document.body.appendChild(host);const board=mkBoard();
    w.LC25.alt.check=checkImpl;
    const drill={id:'t-'+label,fen:FEN,title:'Mate it',brief:'b',tag:'t',stages:[{type:'move',accept:{'Ra8#':'Back-rank mate.'},bad:{'h3':'That wastes the mate.'}}]};
    const r=w.StageRunner({drill,board,host,section:'middlegame',onNext(){},nextLabel:'Next drill'});r.start();
    const fb=()=>(host.querySelector('[data-part="feedback"]')||{}).textContent||'';
    board.onMove(mv);const during=fb();await sleep(60);
    return {label,during:during.slice(0,60),after:fb().slice(0,160),next:!!host.querySelector('[data-act="next"]')};
  };
  w.LC25.alt.wants=()=>true;
  steps.push(['stage: listed move (no engine)',JSON.stringify(await run('listed',async()=>{throw new Error('must not be called')},{from:'a1',to:'a8'}))]);
  steps.push(['stage: unlisted mate -> Also winning',JSON.stringify(await run('alt',async()=>({tier:'full',text:'Re8# also forces mate.'}),{from:'e1',to:'e8'}))]);
  steps.push(['stage: unlisted weak -> Not the move',JSON.stringify(await run('weak',async()=>({tier:'no'}),{from:'g2',to:'g3'}))]);
  steps.push(['stage: engine unavailable -> original path',JSON.stringify(await run('null',async()=>null,{from:'g2',to:'g3'}))]);
  steps.push(['stage: explicit bad move skips engine',JSON.stringify(await run('bad',async()=>{throw new Error('must not be called')},{from:'h2',to:'h3'}))]);

  /* ---- EG.Runner (puzzles with solution_moves) ---- */
  const prun=async(label,checkImpl,mv)=>{
    const board=mkBoard();w.LC25.alt.check=checkImpl;const views=[];let fin=null;
    const p={id:'p-'+label,puzzle_fen:FEN,solution_moves:['a1a8'],side:'w',title:'Mate',ann:{}};
    const r=w.eval('EG').Runner({puzzle:p,board,section:'endgame',title:'Mate',onUpdate:v=>views.push(v),onFinish:x=>{fin=x}});
    r.start();r.move(mv);const during=views.length?views[views.length-1].feedback:null;await sleep(60);
    const last=views[views.length-1]||{};
    return {label,during:during&&during.label,after:last.feedback&&last.feedback.label,text:last.feedback&&(last.feedback.text||'').slice(0,50),finished:!!last.finished};
  };
  steps.push(['runner: exact solution',JSON.stringify(await prun('exact',async()=>{throw new Error('must not be called')},{from:'a1',to:'a8'}))]);
  steps.push(['runner: other mate (existing rule)',JSON.stringify(await prun('mate',async()=>{throw new Error('must not be called')},{from:'e1',to:'e8'}))]);
  steps.push(['runner: unlisted non-mate winning move',JSON.stringify(await prun('alt',async()=>({tier:'mostly',text:'Playable.'}),{from:'g2',to:'g3'}))]);
  steps.push(['runner: unlisted losing move',JSON.stringify(await prun('weak',async()=>({tier:'no'}),{from:'g2',to:'g4'}))]);
  steps.push(['runner: engine throws',JSON.stringify(await prun('throw',async()=>{throw new Error('x')},{from:'g2',to:'g4'}))]);
  const out={file:path.basename(file),errors:[...new Set(errors)],steps};
  console.log(JSON.stringify(out));process.exit(0);
})().catch(e=>{console.log(JSON.stringify({fatal:String(e.stack||e).slice(0,400),errors:[...new Set(errors)]}));process.exit(1)});
