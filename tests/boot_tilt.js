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
    const content=fs.readFileSync((process.env.CONTENT||'/mnt/project/content.json'),'utf8');const NOTES=process.env.NOTES||require('fs').existsSync(path.join(__dirname,'..','mspc-notes.json'))?path.join(__dirname,'..','mspc-notes.json'):'/home/claude/v25/gen/out/mspc-notes.json';const notesTxt=fs.readFileSync(NOTES,'utf8');w.fetch=(u)=>/mspc-notes\.json/.test(String(u))?Promise.resolve({ok:true,status:200,headers:{get:()=>null},json:async()=>JSON.parse(notesTxt),text:async()=>notesTxt}):/content\.json/.test(String(u))?Promise.resolve({ok:true,status:200,headers:{get:()=>null},json:async()=>JSON.parse(content),text:async()=>content}):Promise.reject(new Error('offline'));
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


  const E=x=>w.eval(x);
  /* 1. profile field names the app really uses for the linked usernames */
  steps.push(['sanitizeProfile keeps',JSON.stringify(E("sanitizeProfile({lichess_username:'abc',chess_com_username:'def',junk:'x'})"))]);
  steps.push(['profile keys the onboarding writes',E("(function(){var s=String(LC80.firstRun)+String(typeof LC80.openOnboard);return 'n/a'})()")]);
  /* 2. Settings page: the switch is there, on by default, and persists */
  const sh=E("V36.settingsHTML()");
  steps.push(['Settings row present',String(/data-p36="lc25Tilt"/.test(sh))]);
  steps.push(['Settings: on by default',String(/data-p36="lc25Tilt" checked/.test(sh))]);
  E("App.settings.lc25Tilt=false;App.save()");
  steps.push(['Settings: off after switching, and persisted',String(!/data-p36="lc25Tilt" checked/.test(E("V36.settingsHTML()")))+' | stored='+String(/lc25Tilt/.test(JSON.stringify(Object.keys(w.localStorage).map(k=>w.localStorage.getItem(k)).filter(v=>/lc25Tilt/.test(v||'')))))]);
  E("App.settings.lc25Tilt=true;App.save()");
  /* 3. my rule against LC19's own rule on random game lists */
  let diff=0,tilted=0;const N=3000;
  for(let i=0;i<N;i++){
    const now=Date.now(),rows=[];const n=Math.floor(Math.random()*6);
    for(let j=0;j<n;j++){const ago=Math.floor(Math.random()*5*3600e3);rows.push({gid:'g'+j,t:now-ago,result:['win','loss','loss','loss','draw'][Math.floor(Math.random()*5)]})}
    if(Math.random()<.1&&rows.length)rows[0].t=rows[rows.length-1].t;
    w.__rows=rows;w.__now=now;
    const mine=w.LC25.logic.tiltRule(JSON.parse(JSON.stringify(rows)),now).tilted,theirs=E("LC19.logic.tiltCheck(__rows,__now).tilted");
    if(mine)tilted++;if(mine!==theirs)diff++;
  }
  steps.push(['tiltRule vs LC19.logic.tiltCheck on '+N+' random lists',diff+' differences ('+tilted+' of them tilted)']);
  steps.push(['LC25 reads LC19 thresholds',JSON.stringify(E("LC19.CFG.tilt"))]);
  /* 4. the whole path in the real app: linked username -> public API -> three losses -> modal */
  const now=Date.now();
  const li=g=>JSON.stringify({id:g[0],variant:'standard',status:'mate',createdAt:now-g[2]*60e3-9e5,lastMoveAt:now-g[2]*60e3,winner:g[1],players:{white:{user:{name:'Kyenzo',id:'kyenzo'}},black:{user:{name:'Rival',id:'rival'}}}});
  const nd=[['a','black',6],['b','black',31],['c','black',58],['d','white',230]].map(li).join('\n');
  const prevFetch=w.fetch;w.fetch=(u)=>/lichess\.org\/api\/games\/user\/kyenzo/.test(String(u))?Promise.resolve({ok:true,status:200,headers:{get:()=>null},text:async()=>nd,json:async()=>({})}):prevFetch(u);
  w.document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());
  E("App.profile.lichess_username='kyenzo'");
  const res=await w.LC25.tilt.poll.check(true);
  steps.push(['poll result',JSON.stringify({tilted:res&&res.tilted,shown:res&&res.shown,rows:res&&res.rows&&res.rows.length,error:res&&res.error})]);
  const m=w.document.querySelector('.sheet-wrap');
  steps.push(['modal in the real app',m?String(/dropped 3 games in a row/.test(m.textContent)&&/Lichess/.test(m.textContent)&&!!m.querySelector('[data-pb="stop"]')):'NO MODAL']);
  if(m){m.querySelector('[data-pb="go"]').click();await sleep(200);steps.push(['Start focus puzzles runs in the real app',String(!!w.document.querySelector('.sheet-wrap [data-pb-root]'))])}
  steps.push(['cooldown marker set (LC19 will not repeat it)',String(+w.localStorage.getItem('lc19-tilt-at')>0||/lc19-tilt-at/.test(JSON.stringify(Object.keys(w.localStorage))))]);
  const out={file:path.basename(file),errors:[...new Set(errors)],steps};
  console.log(JSON.stringify(out));process.exit(0);
})().catch(e=>{console.log(JSON.stringify({fatal:String(e.stack||e).slice(0,400),errors:[...new Set(errors)]}));process.exit(1)});
