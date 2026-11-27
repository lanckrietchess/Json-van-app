/*@@module lc108*/
const LC108=(()=>{
  "use strict";
  /* LC108 (build 9.77.0): the Endgame Lab and the Middlegame Lab, built on Kyenzo's own games (tools/course_rework.py, data/eg-lab.json
     and data/mg-lab.json; every position checked by Stockfish there).
     #eg-lab: pick an endgame type (rook endings, king and pawn, knight against bishop, opposite bishops, queen, ...). Per type:
       1. How to play it (the coach's checklist) and the rules from the Endgame Blueprint lessons (open the lesson in one tap),
       2. Positions to know by heart (Lucena, Philidor, opposition, the square, the wrong bishop, the basic mates ...), each one
          played out against Stockfish with its goal: WIN, or HOLD THE DRAW,
       3. My endgames: positions of Kyenzo's games to play out against Stockfish (goal win or hold, from Stockfish's verdict),
          then "How I played it" (his moves, no names),
       4. My key moments of that type: find the move (LC95 with those positions, sessionStorage lc95-open {ids, label}).
     #mg-lab: the typical sacrifices (Greek Gift, f7 / f2, knight, exchange, rook or bishop on the king, queen, pawn) with the
       checklist and his positions (found it / missed it), and the plans per pawn structure with his plan moves.
     The play-out: Stockfish (the app's engine, in the browser) answers at full strength. Win = checkmate, or a won position
     Stockfish rates +9 or a mate in 10 or less (the basic mates: only checkmate counts). Hold = threefold repetition, the 50-move
     rule (50 moves without a capture or pawn move), stalemate, dead material, or 50 moves survived. Lost = their checkmate, or the
     win gone (below +0.8 on two of your moves in a row) / Stockfish winning (below -6 on two moves in a row).
     Free players: every position to know, and the first 3 of my endgames per type; the rest opens with Pro (LC90). */
  const VERSION="9.77.0",EG_URL="data/eg-lab.json?v="+VERSION,MG_URL="data/mg-lab.json?v="+VERSION,FREE_PLAY=3,MT=650;
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.from((r||document).querySelectorAll(s));
  const H=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ic=n=>{try{return icon(n)+" "}catch(e){return""}};
  const say=m=>{try{toast(m)}catch(e){}};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const store={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  function pro(){
    try{if(Admin.active&&Admin.preview&&Admin.preview())return Admin.preview()!=="free"}catch(e){}
    try{if(typeof App.isPro==="function")return !!App.isPro()}catch(e){}
    try{return String(App.access&&App.access.tier||"free")!=="free"}catch(e){return false}
  }
  let EG=null,MG=null,LEG=null,LMG=null,BOOK=null,LBK=null,cur="",S={type:"",mgTab:"sacs",open:"",view:"book",part:"T0"},PO=null,FR=null;
  function loadEG(){if(EG)return Promise.resolve(EG);if(!LEG)LEG=fetch(EG_URL,{cache:"no-cache"}).then(r=>r.ok?r.json():null).then(d=>(EG=d&&Array.isArray(d.types)?d:{types:[]})).catch(()=>(EG={types:[]}));return LEG}
  function loadMG(){if(MG)return Promise.resolve(MG);if(!LMG)LMG=fetch(MG_URL,{cache:"no-cache"}).then(r=>r.ok?r.json():null).then(d=>(MG=d&&Array.isArray(d.sacs)?d:{sacs:[],plans:[]})).catch(()=>(MG={sacs:[],plans:[]}));return LMG}
  const BOOK_URL="data/eg-blueprint.json?v="+VERSION;
  function loadBook(){if(BOOK)return Promise.resolve(BOOK);if(!LBK)LBK=fetch(BOOK_URL,{cache:"no-cache"}).then(r=>r.ok?r.json():null).then(d=>(BOOK=d&&Array.isArray(d.parts)?d:{parts:[]})).catch(()=>(BOOK={parts:[]}));return LBK}
  const type=id=>(EG&&EG.types||[]).find(t=>t.id===id)||null;
  const done=()=>store.get("lc108-done",{});
  const markDone=id=>{const d=done();d[id]=Date.now();store.set("lc108-done",d)};
  const goalTxt=it=>it.goal==="win"?"Win it":"Hold the draw";
  const goalChip=it=>'<span class="lc108-chip is-'+(it.goal==="win"?"win":"hold")+'">'+H(goalTxt(it))+"</span>";
  const sideTxt=s=>s==="w"?"White":"Black";
  const resTxt=r=>r==="win"?"I won this game":r==="draw"?"This game was a draw":r==="loss"?"I lost this game":"";
  function san(fen,ucis){const out=[];try{const g=new Chess(fen);for(const u of ucis||[]){const n=g.fen().split(" ");const m=g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||undefined});if(!m)break;out.push((n[1]==="w"?n[5]+".":out.length?"":n[5]+"...")+m.san)}}catch(e){}return out.join(" ")}
  function focusLesson(id,title,lvl){try{sessionStorage.setItem("lc105-focus",JSON.stringify({id:id,title:title,lvl:lvl}))}catch(e){}location.hash="#endgame"}
  function openMoments(ids,label){try{sessionStorage.setItem("lc95-open",JSON.stringify({ids:(ids||[]).slice(0,40),label:label}))}catch(e){}location.hash="#think"}
  const CSS='.lc108 .lc108-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:10px 0}'+
    '.lc108 .lc108-type{display:grid;gap:2px;text-align:left;padding:10px 12px;border-radius:12px;border:1px solid var(--rule);background:var(--card,#1e293b);color:inherit;cursor:pointer}'+
    '.lc108 .lc108-type.is-on{border-color:#38bdf8;box-shadow:0 0 0 1px #38bdf8 inset}.lc108 .lc108-type b{font-size:14px}.lc108 .lc108-type span{font-size:12px;color:var(--muted,#94a3b8)}'+
    '.lc108 .panel{padding:12px 14px;margin-bottom:12px}.lc108 h2{margin:0 0 6px;font-size:17px}.lc108 ol,.lc108 ul{margin:4px 0 0;padding-left:20px}.lc108 li{margin:3px 0}'+
    '.lc108 .lc108-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:8px 0;border-top:1px solid var(--rule)}.lc108 .lc108-row:first-of-type{border-top:0}'+
    '.lc108 .lc108-row .grow{flex:1 1 180px;min-width:0}.lc108-chip{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;margin-left:6px}'+
    '.lc108-chip.is-win{background:rgba(56,189,248,.15);color:#38bdf8}.lc108-chip.is-hold{background:rgba(250,204,21,.15);color:#facc15}'+
    '.lc108 details{border-top:1px solid var(--rule);padding:6px 0}.lc108 summary{cursor:pointer;font-weight:700}'+
    '.lc108-po{display:grid;gap:10px}.lc108-po .lc108-bd{width:min(100%,460px);margin:0 auto}.lc108-po .lc108-st{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px}'+
    '.lc108-msg{padding:10px 12px;border-radius:10px;background:rgba(148,163,184,.12)}.lc108-msg.is-ok{background:rgba(34,197,94,.15)}.lc108-msg.is-bad{background:rgba(239,68,68,.15)}'+
    '.lc108-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}'+
    '.lc108-ex{font:inherit;font-size:12px;font-weight:700;padding:5px 10px;border-radius:999px;border:1px solid #38bdf8;background:rgba(56,189,248,.12);color:#38bdf8;cursor:pointer}'+
    '.lc108-ex span{font-weight:500;opacity:.8}.lc108-ex.is-lock{border-color:var(--rule);background:transparent;color:var(--muted,#94a3b8)}.lc108-hero{display:grid;gap:6px}';
  function css(){if(Q("#lc108-css"))return;const s=document.createElement("style");s.id="lc108-css";s.textContent=CSS;document.head.appendChild(s)}

  /* ---------------- Endgame Lab ---------------- */
  function egHTML(){
    if(!EG)return'<section class="section lc108"><h1>Endgame Lab</h1><p class="muted">Loading…</p></section>';
    const T=EG.types.filter(t=>(t.theory||[]).length||(t.play||[]).length||(t.moments||[]).length);
    if(!S.type||!type(S.type))S.type=(T[0]||{}).id||"";
    const t=type(S.type);
    const grid=T.map(x=>'<button type="button" class="lc108-type'+(x.id===S.type?" is-on":"")+'" data-lc108-type="'+H(x.id)+'" aria-pressed="'+(x.id===S.type)+'"><b>'+H(x.name)+'</b><span>'+
      [(x.theory||[]).length?(x.theory.length+" to know"):"",(x.play||[]).length?(x.play.length+" to play out"):"",(x.moments||[]).length?(x.moments.length+" key moments"):""].filter(Boolean).join(" · ")+"</span></button>").join("");
    const head='<h1 style="margin-bottom:4px">'+ic("chess-pawn")+'Endgame Lab</h1>'+
      '<div class="lc108-tabs" role="group" aria-label="View">'+[["book","The Blueprint: every rule"],["types","By endgame type"]].map(([k,l])=>'<button type="button" class="btn btn-sm '+(S.view===k?"btn-primary":"btn-quiet")+'" data-lc108-view="'+k+'" aria-pressed="'+(S.view===k)+'">'+l+"</button>").join("")+"</div>";
    if(S.view==="book")return'<section class="section lc108" data-lc108-eg>'+head+bookHTML()+"</section>";
    return'<section class="section lc108" data-lc108-eg>'+head+
      '<p class="muted" style="margin-top:0">Pick the endgame you want to get better at. Learn its rules, play the positions you must know by heart, then play my own endgames out against Stockfish: sometimes you have to win, sometimes you have to hold the draw.</p>'+
      '<div class="lc108-grid" role="group" aria-label="Endgame type">'+grid+"</div>"+(t?typeHTML(t):"")+"</section>";
  }
  /* ---------------- the Endgame Blueprint (data/eg-blueprint.json): every rule, law and concept with its examples ---------------- */
  const md=t=>H(t).replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>").replace(/\*([^*]+)\*/g,"<i>$1</i>").replace(/`([^`]+)`/g,"<code>$1</code>");
  const partFree=id=>/^(P0|T0|T1|A)/.test(id);
  const trig=()=>store.get("lc108-trig",{});
  function exBtn(it,i,x,lock){
    const lab=x.mode==="find"?"Find the move":x.mode==="play"?(x.goal==="win"?"Win it":"Hold it"):"See it";
    const src=x.src==="lichess"?"Lichess":"my game";
    return'<button type="button" class="lc108-ex'+(lock?" is-lock":"")+'" data-lc108-ex="'+H(it.id)+'|'+i+'">'+(lock?ic("lock"):"")+H(lab)+' <span>· '+H(src)+(done()[x.id||x.drill]?" ✓":"")+"</span></button>";
  }
  function ruleHTML(it,pid){
    const xs=it.examples||[],lock=!partFree(pid)&&!pro();
    return'<div class="lc108-row" id="lc108-r-'+H(it.id)+'" style="display:block"><div><span class="lc108-chip is-'+(it.tag==="LAW"?"hold":"win")+'" style="margin:0 6px 0 0">'+H(it.tag||"")+'</span><b>'+H(it.id)+" · "+md(it.title||"")+"</b>"+
      (it.refines?' <span class="small muted">refines '+H(it.refines)+"</span>":"")+"</div>"+(it.text?'<p class="small" style="margin:4px 0">'+md(String(it.text).replace(/^[—–-]\s*/,""))+"</p>":"")+
      ((it.bullets||[]).length?'<ul class="small">'+it.bullets.map(b=>"<li>"+md(b)+"</li>").join("")+"</ul>":"")+
      (xs.length?'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">'+xs.map((x,i)=>exBtn(it,i,x,lock)).join("")+"</div>":"")+"</div>";
  }
  function bookHTML(){
    if(!BOOK)return'<p class="muted">Loading the Blueprint…</p>';
    const parts=BOOK.parts.filter(p=>p.id!=="T3");
    if(!parts.length)return'<p class="muted">The Blueprint could not load. Check your connection and open this page again.</p>';
    const tabs=parts.filter(p=>!/^A/.test(p.id)).concat(parts.some(p=>/^A/.test(p.id))?[{id:"A",label:"Appendix",title:""}]:[]);
    if(!tabs.some(p=>p.id===S.part))S.part=tabs[0].id;
    const sel=S.part==="A"?parts.filter(p=>/^A/.test(p.id)):parts.filter(p=>p.id===S.part);
    const T=trig();
    const body=sel.map(p=>{
      const secs=(p.sections||[]).map(s=>'<div class="panel"><h2>'+md(s.title.replace(/^\d\.\d\s*/,""))+"</h2>"+(s.text||[]).map(t=>'<p class="small" style="margin:4px 0">'+md(t.replace(/^- /,"• "))+"</p>").join("")+
        (s.id&&(s.examples||[]).length?'<div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">'+s.examples.map((x,i)=>exBtn({id:s.id},i,x,!partFree(p.id)&&!pro())).join("")+"</div>":"")+(s.items||[]).map(it=>ruleHTML(it,p.id)).join("")+"</div>").join("");
      const con=(p.concepts||[]).length?'<div class="panel"><h2>Concepts</h2>'+p.concepts.map(it=>ruleHTML(Object.assign({tag:"CONCEPT"},it),p.id)).join("")+"</div>":"";
      const pos=(p.positions||[]).length?'<div class="panel"><h2>'+ic("brain")+'Must-know positions</h2><p class="small muted" style="margin:0 0 4px">Play each one against Stockfish until you can do it from memory, from both sides.</p>'+p.positions.map(it=>'<div class="lc108-row" style="display:block"><b>'+H(it.id)+" · "+H(it.title)+"</b>"+(it.text?'<p class="small" style="margin:4px 0">'+md(it.text)+"</p>":"")+
        (it.fens||[]).map((f,j)=>f.verdict==="win"||f.verdict==="draw"?'<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:6px">'+(f.text?'<span class="small grow" style="flex:1 1 200px">'+md(f.text)+"</span>":'<span class="small grow muted" style="flex:1 1 200px">'+H((f.side==="w"?"White":"Black")+" to move · Stockfish: "+f.verdict)+"</span>")+
          '<button type="button" class="btn btn-primary btn-sm" data-lc108-pos="'+H(it.id)+'|'+j+'">'+ic("play")+H((f.side==="w"?"White":"Black")+": "+(f.verdict==="win"?"win it":"hold it"))+"</button></div>":"").join("")+"</div>").join("")+"</div>":"";
      const err=(p.errors||[]).length?'<div class="panel"><h2>Typical errors</h2><ul class="small">'+p.errors.map(x=>"<li>"+md(x)+"</li>").join("")+"</ul></div>":"";
      const tr=(p.triggers||[]).length?'<div class="panel"><h2>'+H(p.triggerTitle||"Upgrade triggers")+'</h2><p class="small muted" style="margin:0 0 4px">Move up when you can DO these, not when you reach a rating. Tick what you can do.</p>'+p.triggers.map((x,j)=>{const k=p.id+"-"+j;return'<label class="small" style="display:flex;gap:8px;align-items:flex-start;margin:6px 0"><input type="checkbox" data-lc108-trig="'+k+'"'+(T[k]?" checked":"")+"> <span>"+md(x)+"</span></label>"}).join("")+"</div>":"";
      const txt=(p.text||[]).length?'<div class="panel">'+p.text.map(t=>'<p class="small" style="margin:4px 0">'+md(t.replace(/^- /,"• "))+"</p>").join("")+"</div>":"";
      return'<h2 style="margin:12px 0 2px">'+H(p.label)+" · "+md(p.title)+(p.range?' <span class="small muted">('+H(p.range)+" Elo)</span>":"")+"</h2>"+(p.mission?'<p class="muted" style="margin:0 0 8px"><b>Mission:</b> '+md(p.mission)+"</p>":"")+txt+secs+con+pos+err+tr}).join("");
    const n=parts.reduce((a,p)=>a+[].concat(...(p.sections||[]).map(s=>(s.items||[]).concat(s.id?[s]:[])),p.concepts||[]).filter(x=>(x.examples||[]).length).length,0);
    return'<p class="muted" style="margin-top:0">My Endgame Blueprint, from zero to grandmaster: every law, rule and concept, with positions from my own games and from the Lichess database that show it. '+H(n)+" rules have examples so far. Find the move, or play it out against Stockfish.</p>"+
      '<div class="lc108-tabs" role="group" aria-label="Tier">'+tabs.map(p=>'<button type="button" class="btn btn-sm '+(S.part===p.id?"btn-primary":"btn-quiet")+'" data-lc108-part="'+H(p.id)+'" aria-pressed="'+(S.part===p.id)+'">'+H(p.label)+"</button>").join("")+"</div>"+body;
  }
  function bookRule(id){for(const p of (BOOK&&BOOK.parts)||[]){for(const s of p.sections||[]){if(s.id===id)return{it:Object.assign({title:s.title},s),p:p};for(const it of s.items||[])if(it.id===id)return{it:it,p:p}}for(const it of p.concepts||[])if(it.id===id)return{it:it,p:p}}return null}
  function openExample(rid,i){
    const f=bookRule(rid);if(!f)return;const x=(f.it.examples||[])[+i];if(!x)return;
    if(!partFree(f.p.id)&&!pro()){try{LC90.open({from:"blueprint"})}catch(e){location.hash="#upgrades"}return}
    const title=rid+" · "+String(f.it.title||"").replace(/\*/g,"");
    if(x.mode==="find")return findOpen(x,title,f.it);
    if(x.mode==="play")return playItem({id:x.id,fen:x.fen,side:x.side,goal:x.goal,mateOnly:x.mateOnly,title:title,how:[x.reason,x.source].filter(Boolean)},{name:"Blueprint"},"book");
    lookOpen(x,title);
  }
  function openPos(pid,j){
    for(const p of (BOOK&&BOOK.parts)||[])for(const it of p.positions||[])if(it.id===pid){const f=(it.fens||[])[+j];if(!f)return;
      return playItem({id:pid+"-"+j,fen:f.fen,side:f.side,goal:f.verdict==="win"?"win":"draw",title:pid+" · "+it.title,how:[f.text||it.text,f.proof].filter(Boolean),mateOnly:false},{name:"Blueprint"},"book")}
  }
  function lookOpen(x,title){
    try{openSheet({title:title,cls:"lc108-sheet",html:'<div class="lc108-po"><div class="lc108-bd" data-lc108-look></div><div class="lc108-msg">'+H(x.text||"")+'</div><p class="small muted">'+H(x.source||"")+"</p></div>",
      onMount:api=>{const el=Q("[data-lc108-look]",api&&api.el||api);if(!el)return;const b=Board(el,{});try{b.orientation("white")}catch(e){}b.setPosition(x.fen,{animate:false});b.setInteractive(null)}})}catch(e){console.error("lc108",e)}
  }
  /* ---------------- find the move (a rule example): the solution line, another move judged by Stockfish ---------------- */
  function findOpen(x,title,rule){
    if(PO){PO.tok++;PO=null}
    FR={x:x,title:title,rule:rule,g:new Chess(x.fen),i:1,side:x.side,over:false,busy:false,tok:0,tries:0,board:null};
    try{openSheet({title:title,cls:"lc108-sheet",html:'<div class="lc108-po" data-lc108-fr><div class="lc108-msg"><b>'+H(x.side==="w"?"White":"Black")+' to move after their last move.</b> Find the move. '+H(String(rule&&rule.title||"").replace(/\*/g,""))+'.</div><div class="lc108-bd" data-lc108-bd></div><div data-lc108-fb></div>'+
      '<div class="btn-row" style="display:flex;flex-wrap:wrap;gap:6px"><button type="button" class="btn btn-quiet btn-sm" data-lc108-fr="show">'+ic("lightbulb")+'Show the move</button><button type="button" class="btn btn-quiet btn-sm" data-lc108-fr="again">'+ic("rotate")+"Again</button></div></div>",
      onMount:mountFR,onClose:()=>{if(FR)FR.tok++;FR=null}})}catch(e){console.error("lc108",e)}
  }
  function mountFR(api){
    const root=api&&api.el||api,host=Q("[data-lc108-bd]",root);if(!host||!FR)return;
    FR.root=root;FR.board=Board(host,{});try{FR.board.orientation(FR.side==="w"?"white":"black")}catch(e){}
    FR.board.setOnMove(frMove);frStart();
  }
  function frFb(kind,h){const el=FR&&FR.root&&Q("[data-lc108-fb]",FR.root);if(el)el.innerHTML=h?'<div class="lc108-msg'+(kind?" is-"+kind:"")+'">'+h+"</div>":""}
  async function frStart(){
    if(!FR)return;const tok=++FR.tok;FR.g=new Chess(FR.x.fen);FR.i=1;FR.over=false;FR.board.setArrows([]);frFb("","");
    FR.board.setPosition(FR.g.fen(),{animate:false});FR.board.setInteractive(null);
    await sleep(500);if(!FR||tok!==FR.tok)return;
    const u=FR.x.solution[0],mv=FR.g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||undefined});
    if(mv)FR.board.setPosition(FR.g.fen(),{animate:true,lastMove:{from:mv.from,to:mv.to}});
    FR.board.setInteractive(FR.side);
  }
  async function frMove(m){
    if(!FR||FR.over||FR.busy){if(FR)FR.board.setPosition(FR.g.fen(),{animate:false});return}
    const want=FR.x.solution[FR.i]||"",before=FR.g.fen();
    const mv=FR.g.move({from:m.from,to:m.to,promotion:m.promotion||(want[4]||"q")});
    if(!mv){FR.board.setPosition(FR.g.fen(),{animate:false});return}
    const u=mv.from+mv.to+(mv.promotion||"");
    FR.board.setPosition(FR.g.fen(),{animate:false,lastMove:{from:mv.from,to:mv.to}});
    if(u===want){
      FR.i++;
      if(FR.i>=FR.x.solution.length)return frDone(true,"");
      FR.busy=true;FR.board.setInteractive(null);const tok=FR.tok;await sleep(450);if(!FR||tok!==FR.tok)return;
      const r=FR.x.solution[FR.i],rm=FR.g.move({from:r.slice(0,2),to:r.slice(2,4),promotion:r[4]||undefined});FR.i++;FR.busy=false;
      if(rm)FR.board.setPosition(FR.g.fen(),{animate:true,lastMove:{from:rm.from,to:rm.to}});
      if(FR.i>=FR.x.solution.length)return frDone(true,"");
      frFb("","Good. Keep going.");FR.board.setInteractive(FR.side);return;
    }
    /* another move: Stockfish decides */
    FR.busy=true;FR.board.setInteractive(null);frFb("","Checking your move with Stockfish…");const tok=FR.tok;
    let ok=false,lossTxt="";
    try{const a=await ask(before,{movetime:500}),b=await ask(FR.g.fen(),{movetime:500});
      const best=forMe(a.lines&&a.lines[0],FR.side),mine=forMe(b.lines&&b.lines[0],FR.side),loss=best-mine;
      ok=loss<=35&&!(best>=9000&&mine<9000);lossTxt=Math.abs(loss)>=9000?"it misses the mate":"it gives away "+(loss/100).toFixed(1)}catch(e){lossTxt="Stockfish did not answer"}
    if(!FR||tok!==FR.tok)return;FR.busy=false;
    if(ok)return frDone(true,"Also good: Stockfish rates "+mv.san+" as strong as the move of the line.");
    FR.tries++;FR.g.undo();FR.board.setPosition(FR.g.fen(),{animate:false});FR.board.setInteractive(FR.side);
    frFb("bad","Not this one: "+H(mv.san)+" ("+H(lossTxt)+"). Look again: what does the rule ask for here?");
  }
  function frDone(ok,extra){
    if(!FR)return;FR.over=true;FR.board.setInteractive(null);
    const x=FR.x;let line="";try{line=san(x.fen,x.solution)}catch(e){}
    frFb(ok?"ok":"","<b>"+(ok?(FR.tries?"Solved.":"Solved, first try."):"The move.")+"</b> "+H(extra?extra+" ":"")+H(x.reason||"")+(line?'<br><span class="small">The line: '+H(line)+"</span>":"")+'<br><span class="small muted">'+H(x.source||"")+"</span>");
    if(ok){markDone(x.id);try{App.score("endgame",true)}catch(e){}try{V6.addXp("endgame",FR.tries?10:20,{noBench:true})}catch(e){}}
  }
  function frShow(){
    if(!FR||FR.over)return;const u=FR.x.solution[FR.i];if(!u)return;
    FR.board.setArrows([{from:u.slice(0,2),to:u.slice(2,4),kind:"best"}]);FR.tries++;
  }
  function typeHTML(t){
    const d=done(),P=pro();
    const lessons=(t.lessons||[]).map(l=>'<details><summary>'+H(l.title)+'</summary>'+(l.takeaway?'<p class="small" style="margin:6px 0"><b>In one line:</b> '+H(l.takeaway)+"</p>":"")+
      '<ul class="small">'+(l.rules||[]).map(r=>"<li>"+H(r)+"</li>").join("")+'</ul><button type="button" class="btn btn-quiet btn-sm" style="margin-top:6px" data-lc108-lesson="'+H(l.id)+'" data-lc108-lt="'+H(l.title)+'" data-lc108-ll="'+H(l.lvl||"")+'">Open the full lesson</button></details>').join("");
    const row=(it,i,kind)=>{const lock=kind==="play"&&!P&&i>=FREE_PLAY;
      const meta=kind==="play"?[sideTxt(it.side)+" to move",it.tier?"my "+it.tier+" game":"",it.year||""].filter(Boolean).join(" · "):sideTxt(it.side)+" to move";
      return'<div class="lc108-row"><div class="grow"><b>'+H(kind==="play"?(it.goal==="win"?"Win this ":"Hold this ")+t.name.replace(/s$/,"").toLowerCase():it.title)+"</b>"+goalChip(it)+(d[it.id]?' <span class="small" style="color:#22c55e">✓ done</span>':"")+'<div class="small muted">'+H(meta)+"</div></div>"+
        '<button type="button" class="btn '+(lock?"btn-quiet":"btn-primary")+' btn-sm" data-lc108-play="'+H(it.id)+'" data-lc108-kind="'+kind+'">'+(lock?ic("lock")+"Pro":ic("play")+"Play vs Stockfish")+"</button></div>"};
    return'<div class="panel"><h2>'+ic("list-check")+"How to play "+H(t.name.toLowerCase())+'</h2><p class="small muted" style="margin:0 0 4px">'+H(t.what||"")+"</p><ol>"+(t.steps||[]).map(s=>"<li>"+H(s)+"</li>").join("")+"</ol>"+
      (lessons?'<p class="small muted" style="margin:10px 0 2px">All the rules, from the Endgame Blueprint:</p>'+lessons:"")+"</div>"+
      ((t.theory||[]).length?'<div class="panel"><h2>'+ic("brain")+'Positions to know by heart</h2><p class="small muted" style="margin:0 0 4px">Play each one until you can do it without thinking. The goal is next to it.</p>'+t.theory.map((x,i)=>row(x,i,"theory")).join("")+"</div>":"")+
      ((t.play||[]).length?'<div class="panel"><h2>'+ic("chess-board")+'My endgames: play them out</h2><p class="small muted" style="margin:0 0 4px">Positions from my own games. Stockfish defends (or attacks) at full strength. After the game you see how I played it.</p>'+t.play.map((x,i)=>row(x,i,"play")).join("")+"</div>":"")+
      ((t.moments||[]).length?'<div class="panel"><h2>'+ic("bolt")+'My key moments</h2><p class="small muted" style="margin:0 0 8px">'+H(t.moments.length)+" positions from my "+H(t.name.toLowerCase())+' where one move decided the game. Find it.</p><button type="button" class="btn btn-primary btn-sm" data-lc108-mom="'+H(t.id)+'">'+ic("bolt")+"Find the move ("+t.moments.length+")</button></div>":"");
  }
  /* ---------------- Middlegame Lab ---------------- */
  function mgHTML(){
    if(!MG)return'<section class="section lc108"><h1>Middlegame Lab</h1><p class="muted">Loading…</p></section>';
    const tabs='<div class="lc108-tabs" role="group" aria-label="Section">'+[["sacs","Typical sacrifices"],["plans","Plans per structure"]].map(([k,l])=>'<button type="button" class="btn btn-sm '+(S.mgTab===k?"btn-primary":"btn-quiet")+'" data-lc108-mgtab="'+k+'" aria-pressed="'+(S.mgTab===k)+'">'+l+"</button>").join("")+"</div>";
    const rows=S.mgTab==="sacs"?MG.sacs.filter(s=>(s.found||[]).length||(s.missed||[]).length):MG.plans.filter(s=>(s.ids||[]).length);
    const body=rows.map(s=>{
      const les=(s.lessons||[]).map(l=>'<p class="small muted" style="margin:8px 0 2px">From the lesson “'+H(l.title)+'”:</p><ul class="small">'+(l.rules||[]).slice(0,5).map(r=>"<li>"+H(r)+"</li>").join("")+'</ul><button type="button" class="btn btn-quiet btn-sm" style="margin-top:4px" data-lc108-mglesson="'+H(l.id)+'" data-lc108-lt="'+H(l.title)+'" data-lc108-ll="'+H(l.lvl||"")+'">Open the lesson</button>').join("");
      const btns=S.mgTab==="sacs"?((s.found||[]).length?'<button type="button" class="btn btn-primary btn-sm" data-lc108-mgmom="'+H(s.id)+'" data-lc108-which="found">'+ic("bolt")+"Find it in my games ("+s.found.length+")</button>":"")+((s.missed||[]).length?'<button type="button" class="btn btn-quiet btn-sm" data-lc108-mgmom="'+H(s.id)+'" data-lc108-which="missed">Where I missed it ('+s.missed.length+")</button>":"")
        :'<button type="button" class="btn btn-primary btn-sm" data-lc108-mgmom="'+H(s.id)+'" data-lc108-which="ids">'+ic("bolt")+"Find the plan move ("+s.ids.length+")</button>";
      return'<details class="panel" '+(S.open===s.id?"open":"")+' data-lc108-det="'+H(s.id)+'"><summary>'+H(s.name)+' <span class="small muted">· '+H(s.n)+" in my games</span></summary>"+
        '<p class="small muted" style="margin:8px 0 2px">'+(S.mgTab==="sacs"?"Before you sacrifice, check:":"The plan:")+'</p><ol class="small">'+(s.checklist||s.steps||[]).map(x=>"<li>"+H(x)+"</li>").join("")+"</ol>"+les+
        '<div class="btn-row" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">'+btns+"</div></details>"}).join("");
    return'<section class="section lc108" data-lc108-mg><h1 style="margin-bottom:4px">'+ic("chess-knight")+'Middlegame Lab</h1>'+
      '<p class="muted" style="margin-top:0">The plans and the sacrifices that decide middlegames, each one trained on the positions of my own games where it was the only good move.</p>'+tabs+body+"</section>";
  }
  /* ---------------- the play-out against Stockfish ---------------- */
  async function ask(fen,o){for(let t=0;t<6;t++){try{return await Engine.analyse(fen,o)}catch(e){if(/superseded/.test(String(e&&e.message||e))){await sleep(250+t*200);continue}throw e}}throw new Error("The engine stayed busy.")}
  const forMe=(l,side)=>{if(!l)return 0;const v=l.mate!=null?(l.mate>0?1e4-l.mate*10:-1e4-l.mate*10):(l.cp||0);return side==="w"?v:-v};
  const evTxt=v=>Math.abs(v)>=9000?(v>0?"you mate":"they mate"):(v>0?"+":"")+(v/100).toFixed(1)+" for you";
  function findItem(id){for(const t of (EG&&EG.types)||[]){for(const k of ["theory","play"]){const it=(t[k]||[]).find(x=>x.id===id);if(it)return{it:it,t:t,kind:k}}}return null}
  function playOpen(id,kind){
    const f=findItem(id);if(!f)return;
    if(f.kind==="play"&&!pro()&&f.t.play.indexOf(f.it)>=FREE_PLAY){try{LC90.open({from:"lab"})}catch(e){location.hash="#upgrades"}return}
    playItem(f.it,f.t,f.kind);
  }
  function playItem(it,t,kind){
    if(FR){FR.tok++;FR=null}
    PO={id:it.id,it:it,t:t,kind:kind,g:new Chess(it.fen),side:it.side,busy:false,over:false,bad:0,myMoves:0,ev:null,hints:0,tok:0,board:null};
    try{openSheet({title:(it.title||((it.goal==="win"?"Win: ":"Hold: ")+t.name)),cls:"lc108-sheet",html:poHTML(),onMount:mountPO,onClose:()=>{if(PO)PO.tok++;PO=null}})}catch(e){console.error("lc108",e)}
  }
  function poHTML(){
    const it=PO.it;
    return'<div class="lc108-po" data-lc108-po><div class="lc108-msg"><b>'+H(sideTxt(it.side))+" to move. Goal: "+H(it.goal==="win"?"win it.":"hold the draw.")+"</b> "+
      H(it.goal==="win"?(it.mateOnly?"Only checkmate counts.":"Checkmate, or queen a pawn / win material until Stockfish rates it as completely won (+9 or a forced mate)."):"A repetition, the 50-move rule (50 moves without a capture or a pawn move), stalemate, or 50 moves without losing.")+"</div>"+
      ((it.how||[]).length?'<details><summary class="small">How to do it</summary><ol class="small">'+it.how.map(x=>"<li>"+H(x)+"</li>").join("")+"</ol></details>":"")+
      '<div class="lc108-bd" data-lc108-bd></div><div class="lc108-st small" data-lc108-st></div><div data-lc108-fb></div>'+
      '<div class="btn-row" style="display:flex;flex-wrap:wrap;gap:6px"><button type="button" class="btn btn-quiet btn-sm" data-lc108-po="hint">'+ic("lightbulb")+'Hint</button><button type="button" class="btn btn-quiet btn-sm" data-lc108-po="restart">'+ic("rotate")+"Restart</button>"+
      ((PO.it.played||[]).length?'<button type="button" class="btn btn-quiet btn-sm" data-lc108-po="mine">How I played it</button>':"")+"</div></div>";
  }
  function mountPO(api){
    const root=api&&api.el||api;const host=Q("[data-lc108-bd]",root);if(!host||!PO)return;
    PO.root=root;PO.board=Board(host,{});
    try{PO.board.orientation(PO.side==="w"?"white":"black")}catch(e){}
    PO.board.setOnMove(onMove);
    restart();
  }
  function restart(){
    if(!PO)return;PO.tok++;PO.g=new Chess(PO.it.fen);PO.over=false;PO.bad=0;PO.myMoves=0;PO.ev=null;PO.busy=false;
    PO.board.setArrows([]);PO.board.setPosition(PO.g.fen(),{animate:false});fb("","");status();
    if(PO.g.turn()!==PO.side)engineMove();else PO.board.setInteractive(PO.side);
  }
  function status(){
    const el=PO&&PO.root&&Q("[data-lc108-st]",PO.root);if(!el)return;
    const clock=+(PO.g.fen().split(" ")[4]||0);
    el.innerHTML='<span>Your moves: <b>'+PO.myMoves+"</b></span><span>Without a capture or pawn move: <b>"+Math.floor(clock/2)+"/50</b></span>"+(PO.ev!=null?"<span>Stockfish: <b>"+H(evTxt(PO.ev))+"</b></span>":"")+(PO.busy?'<span class="muted">Stockfish is thinking…</span>':"");
  }
  function fb(kind,html){const el=PO&&PO.root&&Q("[data-lc108-fb]",PO.root);if(el)el.innerHTML=html?'<div class="lc108-msg'+(kind?" is-"+kind:"")+'">'+html+"</div>":""}
  function onMove(m){
    if(!PO||PO.over||PO.busy||PO.g.turn()!==PO.side){if(PO)PO.board.setPosition(PO.g.fen(),{animate:false});return}
    const mv=PO.g.move({from:m.from,to:m.to,promotion:m.promotion||"q"});
    if(!mv){PO.board.setPosition(PO.g.fen(),{animate:false});return}
    PO.myMoves++;PO.board.setArrows([]);
    PO.board.setPosition(PO.g.fen(),{animate:false,lastMove:{from:mv.from,to:mv.to}});
    if(judgeEnd())return;
    engineMove();
  }
  async function engineMove(){
    if(!PO||PO.over)return;const tok=++PO.tok;PO.busy=true;PO.board.setInteractive(null);status();
    let r=null;try{r=await ask(PO.g.fen(),{movetime:MT})}catch(e){if(PO&&tok===PO.tok){PO.busy=false;fb("bad","Stockfish did not answer ("+H(e.message||e)+"). Tap Restart.");}return}
    if(!PO||tok!==PO.tok)return;
    const l=r&&r.lines&&r.lines[0];PO.ev=forMe(l,PO.side);
    if(judgeEval())return;
    const u=r.best||(l&&l.pv&&l.pv[0]);if(!u){PO.busy=false;judgeEnd();return}
    const mv=PO.g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||"q"});
    PO.busy=false;
    if(mv)PO.board.setPosition(PO.g.fen(),{animate:true,lastMove:{from:mv.from,to:mv.to}});
    if(judgeEnd())return;
    status();PO.board.setInteractive(PO.side);
  }
  function finish(ok,text){
    if(!PO)return;PO.over=true;PO.busy=false;PO.board.setInteractive(null);status();
    fb(ok?"ok":"bad","<b>"+(ok?"Done.":"Not this time.")+"</b> "+H(text)+((PO.it.played||[]).length?' <button type="button" class="btn btn-quiet btn-sm" data-lc108-po="mine">How I played it</button>':"")+' <button type="button" class="btn btn-primary btn-sm" data-lc108-po="restart">'+(ok?"Again":"Try again")+"</button>");
    if(ok){markDone(PO.id);try{App.score("endgame",true)}catch(e){}try{V6.addXp("endgame",PO.kind==="theory"?20:30,{noBench:true})}catch(e){}
      try{Telemetry.log("lc108_done",{id:PO.id,goal:PO.it.goal,hints:PO.hints})}catch(e){}}
  }
  /* the end of the game on the board (rules) */
  function judgeEnd(){
    const g=PO.g,goal=PO.it.goal,myTurn=g.turn()===PO.side;
    if(g.in_checkmate()){if(myTurn)finish(false,"Checkmate: Stockfish mated you.");else finish(true,goal==="win"?"Checkmate.":"You even mated Stockfish.");return true}
    let why="";
    if(g.in_stalemate())why="Stalemate";else if(g.insufficient_material())why="Not enough material left to mate";else if(g.in_threefold_repetition())why="The same position three times";else if(+(g.fen().split(" ")[4]||0)>=100)why="50 moves without a capture or a pawn move";
    if(why){if(goal==="win")finish(false,why+": a draw. The win slipped away.");else finish(true,why+": a draw. You held it.");return true}
    if(goal==="draw"&&PO.myMoves>=50&&!myTurn){finish(true,"You survived 50 moves and Stockfish found no way through.");return true}
    return false;
  }
  /* material for the player, and "converted": a new queen, or 3 points more than at the start */
  const VAL={p:1,n:3,b:3,r:5,q:9,k:0};
  function mat(fen,side){let n=0;String(fen).split(" ")[0].replace(/[1-8\/]/g,"").split("").forEach(c=>{const w=c===c.toUpperCase(),v=VAL[c.toLowerCase()]||0;n+=(w===(side==="w")?v:-v)});return n}
  function gained(){if(!PO)return false;const h=PO.g.history({verbose:true});if(h.some(m=>m.promotion&&m.color===PO.side))return true;return mat(PO.g.fen(),PO.side)-mat(PO.it.fen,PO.side)>=3}
  /* Stockfish's verdict after your move */
  function judgeEval(){
    const v=PO.ev,goal=PO.it.goal;
    if(goal==="win"){
      if(!PO.it.mateOnly&&v>=900&&gained()){finish(true,v>=9000?"Stockfish now sees a forced mate for you: converted.":"Stockfish now rates it as completely won ("+evTxt(v)+"): converted.");return true}
      if(v<80){PO.bad++;if(PO.bad>=2){finish(false,"Stockfish says the win is gone ("+evTxt(v)+"). Look at the hint at the moment it went wrong and try again.");return true}}else PO.bad=0;
    }else{
      if(v<=-600){PO.bad++;if(PO.bad>=2){finish(false,"Stockfish now wins by force ("+evTxt(v)+").");return true}}else PO.bad=0;
    }
    return false;
  }
  async function hint(){
    if(!PO||PO.over||PO.busy||PO.g.turn()!==PO.side)return;
    PO.hints++;PO.busy=true;status();const tok=PO.tok;
    let r=null;try{r=await ask(PO.g.fen(),{movetime:900})}catch(e){}
    if(!PO||tok!==PO.tok)return;PO.busy=false;status();
    const u=r&&(r.best||(r.lines&&r.lines[0]&&r.lines[0].pv&&r.lines[0].pv[0]));
    if(u){PO.board.setArrows([{from:u.slice(0,2),to:u.slice(2,4),kind:"best"}]);fb("","Stockfish’s move: <b>"+H(san(PO.g.fen(),[u]).replace(/^\d+\.+/,""))+"</b>.")}
  }
  function mine(){
    if(!PO||!(PO.it.played||[]).length)return;const it=PO.it;PO.tok++;PO.over=true;PO.busy=false;PO.board.setInteractive(null);
    const line=san(it.fen,it.played||[]);
    fb("","<b>How I played it.</b> "+H(resTxt(it.result)?resTxt(it.result)+".":"")+" "+(line?"My game went on: "+H(line)+".":"")+' <button type="button" class="btn btn-quiet btn-sm" data-lc108-po="replay">Replay on the board</button> <button type="button" class="btn btn-primary btn-sm" data-lc108-po="restart">Play it yourself</button>');
  }
  async function replay(){
    if(!PO)return;const it=PO.it,tok=++PO.tok,g=new Chess(it.fen);PO.board.setPosition(g.fen(),{animate:false});
    for(const u of (it.played||[]).slice(0,40)){await sleep(700);if(!PO||tok!==PO.tok)return;const mv=g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||undefined});if(!mv)break;PO.board.setPosition(g.fen(),{animate:true,lastMove:{from:mv.from,to:mv.to}})}
  }
  /* ---------------- the cards on Theory > Endgame / Middlegame ---------------- */
  function cardHTML(kind){
    if(kind==="eg")return'<div class="panel lc108-hero" style="padding:12px 14px;border:1px solid #38bdf8"><p style="margin:0;font-weight:800">'+ic("chess-pawn")+'Endgame Lab: the Blueprint with examples</p>'+
      '<p class="small muted" style="margin:0">Every law, rule and concept of my Endgame Blueprint, from Tier 0 to grandmaster, with positions from my own games and the Lichess database. Or train by type: rook endings, king and pawn, knight against bishop, opposite bishops, queen endings, the positions to know by heart, and my endgames to play out against Stockfish.</p>'+
      '<div><a class="btn btn-primary btn-sm" href="#eg-lab">'+ic("play")+"Open the Endgame Lab</a></div></div>";
    return'<div class="panel lc108-hero" style="padding:12px 14px;border:1px solid #38bdf8"><p style="margin:0;font-weight:800">'+ic("chess-knight")+'Middlegame Lab: plans and sacrifices</p>'+
      '<p class="small muted" style="margin:0">The Greek Gift, the exchange sacrifice, the knight on d5 / f5, and the plan for every pawn structure, trained on the moments of my own games where it was the only good move.</p>'+
      '<div><a class="btn btn-primary btn-sm" href="#mg-lab">'+ic("play")+"Open the Middlegame Lab</a></div></div>";
  }
  function paintCard(route){
    const view=Q("#view");if(!view)return;
    const kind=route==="middlegame"?"mg":route==="endgame"?"eg":null;if(!kind)return;
    let box=Q("[data-lc108-card]",view);
    if(!box){box=document.createElement("section");box.className="section";box.setAttribute("data-lc108-card","");box.style.marginBottom="12px";box.innerHTML=cardHTML(kind)}
    const l105=Q("[data-lc105-card]",view),after=Q('#theory-root [id^="metrics-"]',view)||Q(".lc56-instant-wrap",view);
    if(l105&&l105.parentNode){if(l105.previousElementSibling!==box)l105.parentNode.insertBefore(box,l105)}
    else if(after&&after.parentNode){if(after.nextElementSibling!==box)after.parentNode.insertBefore(box,after.nextSibling)}
    else if(!box.parentNode)view.insertBefore(box,view.firstChild);
  }
  /* ---------------- routes ---------------- */
  function paint(){const v=Q("#view");if(!v)return;if(cur==="eg-lab")v.innerHTML=egHTML();else if(cur==="mg-lab")v.innerHTML=mgHTML()}
  function mountEG(view){css();cur="eg-lab";S.view=store.get("lc108-view","book");
    try{const f=JSON.parse(sessionStorage.getItem("lc108-open")||"null");if(f){sessionStorage.removeItem("lc108-open");if(f.view)S.view=f.view;if(f.part)S.part=f.part;if(f.type)S.type=f.type;S.focus=f.rule||""}}catch(e){}
    view.innerHTML=egHTML();Promise.all([loadEG(),loadBook()]).then(()=>{if(cur==="eg-lab"&&Q("#view")===view){paint();if(S.focus){const el=document.getElementById("lc108-r-"+S.focus);S.focus="";if(el)try{el.scrollIntoView({block:"center"});el.style.outline="2px solid #38bdf8"}catch(e){}}}});return()=>{}}
  function mountMG(view){css();cur="mg-lab";view.innerHTML=mgHTML();loadMG().then(()=>{if(cur==="mg-lab"&&Q("#view")===view)paint()});return()=>{}}
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    const ty=t.closest("[data-lc108-type]");if(ty){S.type=ty.getAttribute("data-lc108-type");paint();return}
    const vw=t.closest("[data-lc108-view]");if(vw){S.view=vw.getAttribute("data-lc108-view");store.set("lc108-view",S.view);paint();return}
    const pt=t.closest("[data-lc108-part]");if(pt){S.part=pt.getAttribute("data-lc108-part");paint();const v=Q("#view");if(v)try{v.querySelector("[data-lc108-eg]").scrollIntoView({block:"start"})}catch(x){}return}
    const ex=t.closest("[data-lc108-ex]");if(ex){const a=ex.getAttribute("data-lc108-ex").split("|");openExample(a[0],a[1]);return}
    const ps=t.closest("[data-lc108-pos]");if(ps){const a=ps.getAttribute("data-lc108-pos").split("|");openPos(a[0],a[1]);return}
    const tg=t.closest("[data-lc108-trig]");if(tg){const T=trig();T[tg.getAttribute("data-lc108-trig")]=tg.checked?Date.now():0;store.set("lc108-trig",T);return}
    const fr=t.closest("button[data-lc108-fr]");if(fr){const a=fr.getAttribute("data-lc108-fr");if(a==="again"){FR&&(FR.tries=0);frStart()}else if(a==="show")frShow();return}
    const pl=t.closest("[data-lc108-play]");if(pl){playOpen(pl.getAttribute("data-lc108-play"),pl.getAttribute("data-lc108-kind"));return}
    const po=t.closest("[data-lc108-po]");if(po&&po.tagName==="BUTTON"){const a=po.getAttribute("data-lc108-po");if(a==="restart")restart();else if(a==="hint")hint();else if(a==="mine")mine();else if(a==="replay")replay();return}
    const ls=t.closest("[data-lc108-lesson],[data-lc108-mglesson]");
    if(ls){const id=ls.getAttribute("data-lc108-lesson")||ls.getAttribute("data-lc108-mglesson");try{sessionStorage.setItem("lc105-focus",JSON.stringify({id:id,title:ls.getAttribute("data-lc108-lt"),lvl:+ls.getAttribute("data-lc108-ll")||0}))}catch(x){}location.hash=ls.hasAttribute("data-lc108-mglesson")?"#middlegame":"#endgame";return}
    const mo=t.closest("[data-lc108-mom]");if(mo){const ty2=type(mo.getAttribute("data-lc108-mom"));if(ty2)openMoments(ty2.moments,ty2.name+": my key moments");return}
    const mt=t.closest("[data-lc108-mgtab]");if(mt){S.mgTab=mt.getAttribute("data-lc108-mgtab");S.open="";paint();return}
    const mm=t.closest("[data-lc108-mgmom]");
    if(mm&&MG){const id=mm.getAttribute("data-lc108-mgmom"),w=mm.getAttribute("data-lc108-which");const s=(w==="ids"?MG.plans:MG.sacs).find(x=>x.id===id);if(!s)return;
      openMoments(s[w]||[],s.name+(w==="missed"?": where I missed it":w==="found"?": find it":": find the plan move"));return}
  }
  function onToggle(e){const d=e.target;if(d&&d.matches&&d.matches("[data-lc108-det]")&&d.open)S.open=d.getAttribute("data-lc108-det")}
  /* the MSPC Plan Check (V9.PlanLab: choose the specifics, then the plan) lives on Ranked since 9.77.0; the middlegame course is Learn + Drill */
  let planLab=null;
  function paintPlan(){
    const view=Q("#view");if(!view||Q("[data-lc108-plan]",view))return;
    try{if(typeof V9==="undefined"||!V9.planCheckCard)return}catch(e){return}
    const box=document.createElement("div");box.setAttribute("data-lc108-plan","");
    box.innerHTML='<section class="section"><div class="section-head"><div><h2>'+ic("magic-sparkles")+'MSPC Plan Check</h2><p class="small muted" style="margin:0">Name the specifics of the position, then the plan. One check a day for free.</p></div></div></section>'+V9.planCheckCard();
    const first=view.querySelector(":scope > section");
    if(first&&first.nextSibling)view.insertBefore(box,first.nextSibling);else view.appendChild(box);
    try{planLab=V9.planCheckMount(box)}catch(e){console.error("lc108 plan",e)}
  }
  function afterRender(route){
    cur=String(route||"");
    if(planLab&&cur!=="ranked"){try{planLab.destroy()}catch(e){}planLab=null}
    if(cur==="middlegame"||cur==="endgame"){css();paintCard(cur)}
    if(cur==="ranked")setTimeout(paintPlan,300);
  }
  function init(){
    try{
      document.addEventListener("click",onClick);
      document.addEventListener("toggle",onToggle,true);
      try{const lv=LC26.levels,o=lv.minLevel;if(lv&&!lv.__lc108){lv.__lc108=1;lv.minLevel=r=>r==="eg-lab"||r==="mg-lab"?1:o(r)}}catch(e){}
      let t=0;new MutationObserver(()=>{if(t||(cur!=="middlegame"&&cur!=="endgame"))return;t=setTimeout(()=>{t=0;paintCard(cur)},400)}).observe(document.body,{childList:true,subtree:true});
    }catch(e){console.error("lc108",e)}
  }
  return{init:init,afterRender:afterRender,mountEG:mountEG,mountMG:mountMG,loadEG:loadEG,loadMG:loadMG,loadBook:loadBook,version:VERSION,
    _t:{egHTML:egHTML,mgHTML:mgHTML,playOpen:playOpen,judgeEnd:()=>PO&&judgeEnd(),judgeEval:()=>PO&&judgeEval(),po:()=>PO,fr:()=>FR,state:S,forMe:forMe,move:m=>onMove(m),frMove:m=>frMove(m),openExample:openExample,openPos:openPos,bookRule:bookRule}};
})(); /*@@end lc108*/
