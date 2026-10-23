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

  const content=fs.readFileSync((process.env.CONTENT||'/mnt/project/content.json'),'utf8');const E=x=>w.eval(x);
  steps.push(['SETTINGS entries',JSON.stringify(E("Site.SETTINGS.filter(x=>/^links\\.rival|^v25\\./.test(x[0]))"))]);
  steps.push(['default CONFIG.links.rival',E('CONFIG.links.rival')]);
  steps.push(['default button url',w.LC25.share.rivalUrl()]);
  const raw0=JSON.parse(content);
  const pub=(settings)=>{const d=JSON.parse(JSON.stringify(raw0));d.settings=Object.assign({},d.settings||{},settings);w.__d=d;E('Site.adopt(__d)')};
  pub({links:{skool:'https://www.skool.com/lanckriet-chess-1924',rival:'https://www.skool.com/lanckriet-chess-1924?c=looking-for-a-rival'},v25:{ghostGoal:750}});
  steps.push(['after publish: CONFIG.links.rival',E('CONFIG.links.rival')]);
  steps.push(['after publish: button url',w.LC25.share.rivalUrl()]);
  steps.push(['after publish: CONFIG.v25.ghostGoal / LC25.ghostGoal()',E('CONFIG.v25&&CONFIG.v25.ghostGoal')+' / '+w.LC25.ghostGoal()]);
  pub({links:{skool:'https://www.skool.com/lanckriet-chess-1924',rival:'javascript:alert(1)'}});
  steps.push(['junk rival rejected by the admin cleaner (config value)',JSON.stringify(E('CONFIG.links.rival'))+' -> button '+w.LC25.share.rivalUrl()]);
  pub({links:{rival:''}});
  steps.push(['admin clears it: config / button',JSON.stringify(E('CONFIG.links.rival'))+' -> '+w.LC25.share.rivalUrl()]);
  pub({});
  steps.push(['setting removed from published doc',JSON.stringify(E('CONFIG.links.rival'))+' -> '+w.LC25.share.rivalUrl()]);
  steps.push(['admin form groups in source',String(/\["Training flow",p=>p\.indexOf\("v25\."\)===0\]/.test(html))]);
  const out={file:path.basename(file),errors:[...new Set(errors)],steps};
  console.log(JSON.stringify(out));process.exit(0);
})().catch(e=>{console.log(JSON.stringify({fatal:String(e.stack||e).slice(0,400),errors:[...new Set(errors)]}));process.exit(1)});
