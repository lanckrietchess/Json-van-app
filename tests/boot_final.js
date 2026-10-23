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
  const mkBoard=()=>{const st={onMove:null};return new Proxy(st,{get(t,k){if(k in t)return t[k];if(k==='setOnMove')return f=>{t.onMove=f};if(k==='orientation')return o=>o||'white';if(k==='fen')return()=>'';return()=>undefined}})};
  const cj=JSON.parse(fs.readFileSync((process.env.CONTENT||'/mnt/project/content.json'),'utf8'));
  const ALTS=process.env.ALTS||(fs.existsSync(path.join(__dirname,'..','puzzle-alts.json'))?path.join(__dirname,'..','puzzle-alts.json'):'/home/claude/v25/gen/out-audit/puzzle-alts.json');
  const alts=JSON.parse(fs.readFileSync(ALTS,'utf8'));

  /* 1. the coach has one face, in cards, chips and celebration popups */
  steps.push(['LC19.coach.avatar exported',E("typeof LC19.coach.avatar")]);
  steps.push(['v25 cards use the coach avatar',String(w.LC25.avatarHtml(30)===E("LC19.coach.avatar(30)"))]);
  E("CONFIG.coachAvatar='https://example.org/coach.png'");
  steps.push(['an admin photo replaces it everywhere',String(/<img class="lc19-av-img" src="https:\/\/example\.org\/coach\.png"/.test(w.LC25.avatarHtml(30))&&/lc19-av-img/.test(w.LC25.coachHead('Hi')))]);
  E("CONFIG.coachAvatar=''");
  E("App.settings.popups=true;Celebrate.streak(3)");
  steps.push(['celebration popup shows the coach',String(!!w.document.querySelector('.cele .cele-card .cele-av svg, .cele .cele-card .cele-av img'))]);

  /* 2. theme */
  steps.push(['tech theme on by default (html attribute)',String(w.document.documentElement.getAttribute('data-lc25-theme')==='tech')]);
  const meta=w.document.querySelector('meta[name="theme-color"]');steps.push(['theme-color meta',meta?meta.getAttribute('content'):'(no meta)']);
  steps.push(['Settings has the Tech theme row, on',String(/data-p36="lc25Theme" checked/.test(E("V36.settingsHTML()")))]);
  E("App.settings.lc25Theme=false");w.LC25.theme.apply();steps.push(['switched off: attribute gone',String(w.document.documentElement.getAttribute('data-lc25-theme')===null)]);E("App.settings.lc25Theme=true");w.LC25.theme.apply();

  /* 3. the engine wrapper is on, and the real Engine.load still returns its promise */
  steps.push(['Engine.load wrapped',String(E("Engine._lc25")===1&&typeof E("Engine.load()").then==='function')]);

  /* 4. YOUR audited puzzles: play the alternative the audit found; the real runner accepts it with no engine */
  w.LC25.palts.map=alts.positions;w.LC25.palts.fresh=true;
  const EGp=E('EG');let pick=null;
  for(const p of cj.lists.endgame.concat(cj.lists.middlegame||[])){
    if(!p||!p.puzzle_fen||!p.solution_moves||!p.solution_moves.length)continue;
    const g=new w.Chess(p.puzzle_fen);if(g.turn()!==p.side)continue;
    const key=p.puzzle_fen.split(' ').slice(0,3).join(' ');const e=alts.positions[key];if(!e)continue;
    const mainUci=p.solution_moves[0];const mv0=g.moves({verbose:true}).find(m=>m.from+m.to===mainUci.slice(0,4));if(!mv0)continue;
    const alt=e.alts.find(a=>a.s.replace(/[+#]/g,'')!==mv0.san.replace(/[+#]/g,'')&&a.t==='full');if(!alt)continue;
    const am=g.moves({verbose:true}).find(m=>m.san.replace(/[+#]/g,'')===alt.s.replace(/[+#]/g,''));if(!am)continue;
    pick={p,alt,am,e};break;
  }
  steps.push(['an audited puzzle with a real alternative',pick?pick.p.id+': solution '+pick.p.solution_moves[0]+', alternative '+pick.alt.s:'NONE FOUND']);
  if(pick){
    const board=mkBoard();const views=[];
    E("Engine.analyse=function(){throw new Error('the engine must not be used for a precomputed alternative')}");
    const r=EGp.Runner({puzzle:pick.p,board,title:pick.p.title,onUpdate:v=>views.push(v),onFinish(){}});   // no section: exactly how the real puzzle screens call it
    r.start();r.move({from:pick.am.from,to:pick.am.to,promotion:pick.am.promotion});await sleep(80);
    const v=views[views.length-1]||{},fb=v.feedback||{};
    steps.push(['the alternative is accepted without an engine',(fb.label||'?')+' | finished='+!!v.finished+' | text="'+String(fb.text||'').slice(0,110)+'"']);
    steps.push(['the explanation names another strong move or the solution',String(/Other good moves here|just like|as good as|holds the balance|winning edge/.test(fb.text||''))]);
  }
  const out={file:path.basename(file),errors:[...new Set(errors)],steps};
  console.log(JSON.stringify(out));process.exit(0);
})().catch(e=>{console.log(JSON.stringify({fatal:String(e.stack||e).slice(0,400),errors:[...new Set(errors)]}));process.exit(1)});
