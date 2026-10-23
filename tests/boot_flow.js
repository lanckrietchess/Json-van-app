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
    w.fetch=()=>Promise.reject(new Error('offline'));
    w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
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
  await sleep(4500);steps.push(['boot',title()]);
  steps.push(['ghost card on #quests',!!w.document.querySelector('[data-lc25-ghost]')]);
  steps.push(['coach text',/Coach Lanckriet/.test(w.document.body.textContent)]);
  click('[data-lc25-start]');await sleep(900);steps.push(['after Let\'s go',title()]);
  click('[data-p="youtube"]');click('[data-next]');await sleep(200);
  click('[data-next]');await sleep(200);                       // rating step: skip
  click('[data-pain] [data-k="threats"]');click('[data-next]');await sleep(200);
  click('[data-mspc] [data-k="yes"]');click('[data-next]');await sleep(1200);
  steps.push(['after 4 onboarding steps',title()]);
  steps.push(['asks for username',!!w.document.querySelector('[data-user]')]);
  steps.push(['profile saved',JSON.stringify((w.App&&w.App.profile||{}).leak||null)]);
  const out={file:path.basename(file),errors:[...new Set(errors)],steps,hash:w.location.hash,onboarded:!!(w.App&&w.App.onboarded)};
  console.log(JSON.stringify(out,null,1));process.exit(0);
})().catch(e=>{console.log(JSON.stringify({fatal:String(e.stack||e).slice(0,400),errors:[...new Set(errors)]}));process.exit(1)});
