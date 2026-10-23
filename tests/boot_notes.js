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
  await w.LC25.notes.ensure();
  steps.push(['notes loaded in the real app',String(Object.keys(w.LC25.notes.map||{}).length)]);
  steps.push(['feedbackHTML without a note is unchanged',String(!/mspc25/.test(E("feedbackHTML({v:'good',label:'Correct',san:'1. e4',text:'Nice.'})")))]);
  w.__fb={v:'hint',label:'Learn mode',text:'Play the arrow',mspc:{w:'W text',m:'M text',s:'S text',p:'P text',c:'C text',r:'R text'},mspcOpen:true};
  steps.push(['feedbackHTML renders the note',String(/<details class="mspc25" open>/.test(E('feedbackHTML(__fb)'))&&/Calculation\./.test(E('feedbackHTML(__fb)')))]);

  /* ---- long texts: folded through the real feedbackHTML and debriefHTML; short ones byte-identical ---- */
  const cj=JSON.parse(fs.readFileSync((process.env.CONTENT||'/mnt/project/content.json'),'utf8'));
  let longNote=null;(function f(n){for(const x of n){if(!longNote){const t=(x.n||[]).find(q=>q.length>900);if(t)longNote=t}f(x.c||[])}})(cj.trees[1].tree);
  w.__fb2={v:'hint',label:'Learn mode',text:longNote};
  const h2=E('feedbackHTML(__fb2)');
  steps.push(['feedbackHTML: long note ('+longNote.length+' chars) folds',String(/class="fold25w"/.test(h2)&&/data-fold25/.test(h2))+' | html '+h2.length+' chars (full text kept in the button)']);
  steps.push(['feedbackHTML: short text untouched',String(/<p>Nice\.<\/p>/.test(E("feedbackHTML({v:'good',label:'Correct',san:'1. e4',text:'Nice.'})"))&&!/fold25/.test(E("feedbackHTML({v:'good',label:'Correct',san:'1. e4',text:'Nice.'})")))]);
  w.__long=longNote;
  const dh=E("debriefHTML([{k:'M',t:__long},'A short line.',{k:'S',t:'Short.'},__long])");
  steps.push(['debriefHTML: long entries fold, short ones do not',String((dh.match(/data-fold25/g)||[]).length===2&&/<p>A short line\.<\/p>/.test(dh)&&/<b>S<\/b><p>Short\.<\/p>/.test(dh))]);
  steps.push(['debriefHTML: string debrief keeps its muted class when short',String(/<p class="muted">Short one\.<\/p>/.test(E("debriefHTML('Short one.')"))&&/fold25w/.test(E("debriefHTML(__long)"))&&/class="muted"/.test(E("debriefHTML(__long)")))]);
  /* a real click in the real page expands it */
  const host=w.document.createElement('div');w.document.querySelector('#view').appendChild(host);host.innerHTML=h2;
  const btn=host.querySelector('[data-fold25]'),para=host.querySelector('.fold25w p'),before=para.textContent.length;btn.click();
  steps.push(['click Read more in the real page',before+' -> '+para.textContent.length+' chars, equals the original: '+(para.textContent===longNote)]);
  host.remove();

  /* ---- Drill: correct move after 1.e4 -> note attached, closed ---- */
  const views=[];
  let r=E('LineRunner')({board:mkBoard(),pgn:'1. e4 c6 2. d4 d5',ann:{},side:'b',section:'openings',learn:false,onUpdate:v=>views.push(v),onFinish(){}});
  r.start();await sleep(900);
  steps.push(['drill: my turn after e4',String(r.view().yourTurn)]);
  r.move({from:'c7',to:'c6'});await sleep(50);
  const fb=r.view().feedback||{};
  steps.push(['drill: correct move feedback',fb.label+' | mspc='+!!fb.mspc+' | open='+fb.mspcOpen+' | w="'+((fb.mspc||{}).w||'')+'"']);
  const html=E('feedbackHTML')(fb);
  steps.push(['drill: rendered closed note',String(/<details class="mspc25">/.test(html)&&/Specifics\./.test(html))]);
  r.destroy();

  /* ---- Drill: a human note from the coach is kept, the MSPC note sits under it ---- */
  const v2=[];
  r=E('LineRunner')({board:mkBoard(),pgn:'1. e4 c6 2. d4 d5',ann:{'1...c6':'My own note on c6.'},side:'b',section:'openings',learn:false,onUpdate:v=>v2.push(v),onFinish(){}});
  r.start();await sleep(900);r.move({from:'c7',to:'c6'});await sleep(50);
  const f2=r.view().feedback||{};steps.push(['drill: MSPC note added next to the existing feedback text',JSON.stringify({text:f2.text,mspc:!!f2.mspc})]);r.destroy();

  /* ---- Learn mode: the note arrives with the arrow, open ---- */
  E("App.settings.learnSf=false");
  const v3=[];
  r=E('LineRunner')({board:mkBoard(),pgn:'1. e4 c6 2. d4 d5',ann:{},side:'b',section:'openings',learn:true,onUpdate:v=>v3.push(v),onFinish(){}});
  r.start();await sleep(1200);
  const f3=r.view().feedback||{};
  steps.push(['learn: feedback',f3.label+' | text="'+String(f3.text||'').slice(0,40)+'" | mspc='+!!f3.mspc+' | open='+f3.mspcOpen]);
  steps.push(['learn: rendered open note',String(/<details class="mspc25" open>/.test(E('feedbackHTML')(f3)))]);
  r.destroy();

  /* ---- endgame / middlegame puzzle runner: the note follows a correct solver move ---- */
  const content2=JSON.parse(fs.readFileSync((process.env.CONTENT||'/mnt/project/content.json'),'utf8'));
  const eg=content2.lists.endgame.find(x=>x.id&&x.puzzle_fen&&x.solution_moves&&x.solution_moves.length>=4&&x.side==='w'&&String(x.puzzle_fen).split(' ')[1]==='w');
  const v5=[];
  const pr=E('EG').Runner({puzzle:eg,board:mkBoard(),section:'endgame',title:eg.title,onUpdate:v=>v5.push(v),onFinish(){}});
  pr.start();
  const u=eg.solution_moves[0];pr.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||undefined});await sleep(60);
  const last5=v5[v5.length-1]||{},fb5=last5.feedback||{};
  steps.push(['puzzle runner: '+eg.id+' first solver move',fb5.label+' | mspc='+!!fb5.mspc+' | finished='+!!last5.finished]);
  steps.push(['puzzle runner: rendered note',String(/mspc25/.test(E('feedbackHTML')(fb5)))]);

  /* ---- the final move of a line: the summary keeps its note ---- */
  const v6=[];
  r=E('LineRunner')({board:mkBoard(),pgn:'1. e4 c6',ann:{},side:'b',section:'openings',learn:false,onUpdate:v=>v6.push(v),onFinish(){}});
  r.start();await sleep(900);r.move({from:'c7',to:'c6'});await sleep(60);
  const f6=r.view().feedback||{};steps.push(['line: final move summary keeps the note',f6.label+' | mspc='+!!f6.mspc+' | open='+f6.mspcOpen+' | finished='+r.view().finished]);r.destroy();
  const FEN9='6k1/5ppp/8/8/8/8/5PPP/R3R1K1 w - - 0 1';
  w.LC25.notes.map[w.LC25.notes.key(FEN9,'Ra8#')]={m:'m',s:'s',p:'p',c:'c',w:'Back-rank mate.',r:'r'};
  const v7=[];
  const p7=E('EG').Runner({puzzle:{id:'x7',puzzle_fen:FEN9,solution_moves:['a1a8'],side:'w',title:'Mate',ann:{}},board:mkBoard(),section:'endgame',title:'Mate',onUpdate:v=>v7.push(v),onFinish(){}});
  p7.start();p7.move({from:'a1',to:'a8'});await sleep(60);
  const f7=(v7[v7.length-1]||{}).feedback||{};steps.push(['puzzle: final move summary keeps the note',f7.label+' | mspc='+!!f7.mspc+' | w='+((f7.mspc||{}).w||'')]);

  /* ---- Ghost Slayer in the real trophy room list ---- */
  steps.push(['status badge ids',E("SysBadges.LIST.map(b=>b.id).join(',')")]);
  steps.push(['not earned: not drawn',String(!/Ghost Slayer/.test(E('SysBadges.section()')))]);
  w.localStorage.setItem('lc25-ghost',JSON.stringify({t0:Date.now()-864e5,base:0,goal:600,won:true,wonAt:Date.now()}));
  w.eval('Store.set("lc25-ghost",{t0:Date.now()-864e5,base:0,goal:600,won:true,wonAt:Date.now()})');
  const sec=E('SysBadges.section()');
  steps.push(['earned: drawn in Status badges',String(/Ghost Slayer/.test(sec)&&/Status badges/.test(sec))]);

  /* ---- a position without a note stays exactly as before ---- */
  const v4=[];
  r=E('LineRunner')({board:mkBoard(),pgn:'1. d4 d5 2. c4 e6',ann:{},side:'b',section:'openings',learn:false,onUpdate:v=>v4.push(v),onFinish(){}});
  r.start();await sleep(900);r.move({from:'d7',to:'d5'});await sleep(50);
  const f4=r.view().feedback||{};steps.push(['no note for this position (1.d4 d5)',f4.label+' | mspc='+!!f4.mspc]);r.destroy();
  const out={file:path.basename(file),errors:[...new Set(errors)],steps};
  console.log(JSON.stringify(out));process.exit(0);
})().catch(e=>{console.log(JSON.stringify({fatal:String(e.stack||e).slice(0,400),errors:[...new Set(errors)]}));process.exit(1)});
