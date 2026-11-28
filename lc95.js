/*@@module lc95*/
const LC95=(()=>{
  "use strict";
  /* 9.61.0: this page is now THE MSPC trainer (#think; the old case player is gone from the app, #kgames is an old address of
     the same page). Every position has an M / S / P / C bar: M and S say what the board shows, P lists your checks and captures
     (never which one), C says how to check a candidate, and after the move what the line does (LC93). Learning the method itself
     is LC96, #learn-mspc.
     LC95 (build 9.60.0): Kyenzo's Games. Real positions from Kyenzo's own rated rapid + blitz games on Chess.com (304 -> 2105),
     analysed once by Stockfish (tools/master_games.py, GitHub workflow "Kyenzo's Games (analysis)") and stored in Supabase
     (public.my_master_games, public.master_puzzles; sql/20261118150000_lc95_master_games.sql).
     #kgames has three tabs:
       Find my move   brilliant / great / punish: the position before a move Kyenzo found; play it.
       Spot my mistake blunder / mistake / missed: the position before a move that cost Kyenzo; find the better move. Filtered by
                       rating tier (default: the player's own tier), so a 900 player sees the mistakes Kyenzo made at 900.
       By opening      the openings Kyenzo played most, with his score; a tap trains the positions of that opening.
     Free: the same 3 "Find my move" positions for everyone each day (mg_daily), the rest shows what Pro opens (LC90 "Try Pro free").
     Pro / VIP: everything. The gate is in the app (the rows are public, like content.json).
     Explanations come from the board and the stored Stockfish lines (LC83.solutionFacts / LC83.diagnose), never from an AI.
     A different move than Kyenzo's is judged by the browser's own Stockfish (LC25.alt.check): "Also good" when it keeps the result.
     Entry points: Train > Think > "Kyenzo's games", a card on #think and a card with his top openings on #openings.
     Owner: Sync now (mg_admin_sync), hide / feature a position (mg_curate). */
  const VERSION="9.65.0";
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.prototype.slice.call((r||document).querySelectorAll(s));
  const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const say=(m,k,ms)=>{try{toast(m,k||"",ms)}catch(e){}};
  const ic=n=>{try{return icon(n)}catch(e){return""}};
  const ROUTE="kgames";
  const TIERS=["0-799","800-1199","1200-1599","1600-1999","2000+"];
  const GOOD=["brilliant","great","punish"],BAD=["blunder","mistake","missed"];
  const FREE_N=3;
  const STEPNAME={M:"Their move",S:"The position",P:"Checks, captures, attacks",C:"Calculate"};
  const route=()=>{let h="";try{h=decodeURIComponent(String(location.hash||"").replace(/^#/,""))}catch(e){h=""}return h};
  const routeName=()=>route().toLowerCase().split(/[\/?&]/)[0];
  /* the router takes the whole hash as the route, so a card that opens a tab leaves its wish in sessionStorage "lc95-open" ({tab, eco, tier}) */
  const params=()=>{let o={};try{o=JSON.parse(sessionStorage.getItem("lc95-open")||"{}")||{};sessionStorage.removeItem("lc95-open")}catch(e){o={}}return o&&typeof o==="object"?o:{}};
  const owner=()=>{try{return !!(LC49.owner()||Admin.active)}catch(e){return false}};
  function pro(){
    try{if(Admin.active&&Admin.preview&&Admin.preview())return Admin.preview()!=="free"}catch(e){}
    try{if(typeof App.isPro==="function")return !!App.isPro()}catch(e){}
    try{return String(App.access&&App.access.tier||"free")!=="free"}catch(e){return false}
  }
  const today=()=>new Date().toISOString().slice(0,10);
  const tierOf=r=>{r=+r||0;return r<800?"0-799":r<1200?"800-1199":r<1600?"1200-1599":r<2000?"1600-1999":"2000+"};
  function myTier(){try{const e=+(App.profile&&(App.profile.elo||App.profile.rating))||0;return e>0?tierOf(e):""}catch(e){return""}}
  const store={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  async function rpc(fn,args,auth){
    try{const h={};if(auth){const t=await LC26.sync.token();if(!t)return{status:401,data:null};h.Authorization="Bearer "+t}
      const r=await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:h,body:JSON.stringify(args||{})});
      /* 9.82.0: a stored "brilliant" that is not a sacrifice by the current rule shows as an only move */
      try{if(r&&Array.isArray(r.data)&&typeof brilliantChecked==="function")r.data=r.data.map(brilliantChecked)}catch(e){}
      return r}catch(e){return{status:0,data:null}}
  }
  const missing=r=>!!(r&&(r.status===404||(r.data&&/PGRST202|does not exist|42883|42P01/i.test(String(r.data.code||"")+String(r.data.message||"")))));

  /* ---------- pure helpers (tested) ---------- */
  function uciToMove(u){u=String(u||"");return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u)?{from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||undefined}:null}
  function sanLine(fen,ucis,max){
    const out=[];try{const g=new Chess(fen);for(const u of (ucis||[]).slice(0,max||6)){const m=uciToMove(u);if(!m)break;const mv=g.move({from:m.from,to:m.to,promotion:m.promotion||"q"});if(!mv)break;out.push(mv.san)}}catch(e){}
    return out;
  }
  function numbered(fen,sans){
    const p=String(fen).split(" "),turn=p[1]||"w";let n=+p[5]||1,w=turn==="w",s="";
    sans.forEach((x,i)=>{if(w)s+=(s?" ":"")+n+". "+x;else s+=(s?" ":"")+(i===0?n+"... ":"")+x;if(!w)n++;w=!w});
    return s;
  }
  const evalWords=cp=>{cp=+cp;if(!Number.isFinite(cp))return"";if(Math.abs(cp)>=9000)return cp>0?"a forced mate":"getting mated";const p=Math.abs(cp)/100;return(cp>=0?"+":"-")+p.toFixed(1)};
  function prompt(p){
    const prev=p.prev_fen&&p.prev?sanLine(p.prev_fen,[p.prev],1)[0]:"";
    if(p.kind==="brilliant")return{h:"Find my brilliant move",t:"I found a sacrifice here. Only one move works. Your turn."};
    if(p.kind==="great")return{h:"Find the only move",t:"One move keeps everything together. Every other move gives it away."};
    if(p.kind==="punish")return{h:"Punish the blunder",t:(prev?"My opponent just played "+prev+". ":"My opponent just blundered. ")+"Make it count."};
    if(p.kind==="missed")return{h:"Don't miss it like I did",t:(prev?"My opponent just played "+prev+", a blunder, ":"My opponent had just blundered, ")+"and I missed the punishment. Find it."};
    return{h:p.kind==="blunder"?"Spot my blunder":"Spot my mistake",t:"I was "+(p.my_rating?p.my_rating+" Elo":"at this level")+" in this game. My move here cost me. Find the better move."};
  }
  function explain(p){
    const side=p.side,line=sanLine(p.fen,(p.solution&&p.solution.length?p.solution:[p.best]).concat([]),4);
    let facts="";try{const sf=LC83.solutionFacts(p.fen,(p.solution&&p.solution.length?p.solution:[p.best]),side);facts=sf&&sf.text?sf.text:""}catch(e){}
    if(GOOD.indexOf(p.kind)>=0){
      return{title:p.kind==="brilliant"?"Brilliant":p.kind==="great"?"The only move":"Punished",
        text:"I played "+(p.played_san||line[0]||"it")+" in this game ("+E2(p.time_class)+", "+(p.my_rating||"?")+" Elo). "+(facts?facts+" ":"")+(line.length>1?"The line: "+numbered(p.fen,line)+".":"")};
    }
    let why="";try{const pm=uciToMove(p.played);const d=pm?LC83.diagnose({fen:p.fen,color:side,played:{from:pm.from,to:pm.to,promotion:pm.promotion||"q"},bestUci:p.best,replyUci:(p.reply||[])[0],bestPv:p.line,replyPv:p.reply,prevFen:p.prev_fen,oppUci:p.prev}):null;why=d&&d.error?d.error:""}catch(e){}
    return{title:"Better: "+(p.best_san||line[0]||""),
      text:"In the game I played "+(p.played_san||"another move")+" ("+evalWords(p.eval_before)+" before, "+evalWords(p.eval_after)+" after). "+(why?why+" ":"")+(facts&&!(why&&p.best_san&&why.indexOf(p.best_san)>=0)?"The better move: "+facts:"")};
  }
  const E2=s=>String(s||"").replace(/[^a-z]/gi,"");
  /* the free taste: 3 a day, the same set for everyone (mg_daily); done ids are remembered per day on this device */
  function freeLeft(){const s=store.get("lc95-free",{});return s.day===today()?Math.max(0,FREE_N-(s.done||[]).length):FREE_N}
  function freeMark(id){const s=store.get("lc95-free",{});const o=s.day===today()?s:{day:today(),done:[]};if(o.done.indexOf(id)<0)o.done.push(id);store.set("lc95-free",o)}

  /* ---------- data ---------- */
  const C={tiers:null,openings:null,state:""};
  async function loadTiers(){if(C.tiers)return C.tiers;const r=await rpc("mg_tiers",{});if(missing(r)){C.state="nosql";return null}C.tiers=Array.isArray(r.data)?r.data:[];return C.tiers}
  async function loadOpenings(){if(C.openings)return C.openings;const r=await rpc("mg_openings",{p_color:null,p_min:5});if(missing(r)){C.state="nosql";return null}C.openings=Array.isArray(r.data)?r.data:[];return C.openings}
  async function loadList(tab,tier,eco){
    /* 9.65.0 (LC100): a set of positions by id (the Hall of Fame, the Theory examples) or one phase (the Middlegame / Endgame cards);
       a free player plays them inside the same 3 a day */
    if(S.ids&&S.ids.length){const r=await rpc("mg_by_ids",{p_ids:S.ids});if(missing(r)){C.state="nosql";return[]}const l=Array.isArray(r.data)?r.data:[];return pro()?l:l.slice(0,Math.max(0,freeLeft()))}
    if(S.phase){const r=await rpc("mg_puzzles",{p_kinds:GOOD,p_tier:null,p_phase:S.phase,p_eco:null,p_limit:pro()?40:FREE_N,p_offset:0,p_seed:today()+"ph"+S.phase});if(missing(r)){C.state="nosql";return[]}const l=Array.isArray(r.data)?r.data:[];return pro()?l:l.slice(0,Math.max(0,freeLeft()))}
    if(!pro()){if(tab!=="find")return[];const r=await rpc("mg_daily",{p_n:FREE_N});return Array.isArray(r.data)?r.data:[]}
    const kinds=tab==="mist"?BAD:tab==="open"?GOOD.concat(BAD):GOOD;
    const r=await rpc("mg_puzzles",{p_kinds:kinds,p_tier:tier||null,p_phase:null,p_eco:eco||null,p_limit:40,p_offset:0,p_seed:today()+tab+(tier||"")+(eco||"")});
    if(missing(r)){C.state="nosql";return[]}
    return Array.isArray(r.data)?r.data:[];
  }

  /* ---------- page ---------- */
  const S={tab:"find",tier:"",eco:"",phase:"",ids:[],list:[],i:0,board:null,view:null,done:false,misses:0,hints:0};
  async function mount(view){
    css();S.view=view;const pr=params();
    S.tab=pr.tab==="mist"||pr.tab==="open"?pr.tab:pr.eco?"open":"find";S.eco=/^[A-E]\d{0,2}$/.test(pr.eco||"")?pr.eco:"";S.tier=TIERS.indexOf(pr.tier)>=0?pr.tier:"";
    S.phase=/^(opening|middlegame|endgame)$/.test(pr.phase||"")?pr.phase:"";S.ids=Array.isArray(pr.ids)?pr.ids.map(String).filter(x=>/^[A-Za-z0-9_-]{1,40}$/.test(x)).slice(0,40):[];S.label=typeof pr.label==="string"?pr.label.replace(/[<>]/g,"").slice(0,60):"";
    if(S.ids.length||S.phase){S.tab="find";S.eco="";S.tier=""}
    view.innerHTML='<div class="lc95"><header class="lc95-hd"><p class="lc95-tag">MSPC trainer</p><h1>Find the moves I found</h1>'
      +'<p class="muted">Real positions from my own rated games on the climb from 304 to 2105. Run M, S, P and C first, then play the move. Stockfish checked every answer, so it is the truth, not my opinion. New to MSPC? <a href="#learn-mspc">Learn the system first</a>.</p></header>'
      +'<div class="lc95-climb" data-lc95-climb></div>'
      +'<div class="seg lc95-tabs" role="tablist">'+[["find","Find my move"],["mist","Spot my mistake"],["open","By opening"]].map(t=>'<button type="button" role="tab" data-lc95-tab="'+t[0]+'" aria-pressed="'+(S.tab===t[0])+'">'+t[1]+"</button>").join("")+"</div>"
      +'<div data-lc95-body><p class="small muted">Loading…</p></div>'
      +(owner()?'<div class="lc95-own panel pad"><b>Owner</b> <button type="button" class="btn btn-ghost btn-sm" data-lc95="sync">'+ic("rotate")+' Sync now</button> <span class="small muted" data-lc95-sync></span></div>':"")
      +"</div>";
    paintClimb();await body();
  }
  async function paintClimb(){
    const el=Q("[data-lc95-climb]",S.view);if(!el)return;const t=await loadTiers();
    if(!t||!t.length){el.innerHTML="";return}
    el.innerHTML='<p class="small muted">My blunders per game, level by level:</p><div class="lc95-tiers">'+TIERS.map(name=>{const x=t.filter(r=>r.tier===name)[0];if(!x)return"";
      return'<button type="button" class="lc95-tier'+(S.tier===name?" is-on":"")+'" data-lc95-tier="'+name+'"><b>'+name+'</b><span>'+E(x.blunders_per_game)+' blunders a game</span><small>'+E(x.games)+' games · '+E(x.acc||"?")+'% accuracy</small></button>'}).join("")+"</div>";
  }
  async function body(){
    const b=Q("[data-lc95-body]",S.view);if(!b)return;S.board=null;
    QA("[data-lc95-tab]",S.view).forEach(x=>x.setAttribute("aria-pressed",String(x.getAttribute("data-lc95-tab")===S.tab)));
    if(!pro()&&S.tab!=="find"){b.innerHTML=lockCard(S.tab);return}
    if(S.tab==="open"&&!S.eco){b.innerHTML='<p class="small muted">Loading…</p>';const o=await loadOpenings();b.innerHTML=openingsHTML(o);return}
    if(S.tab==="mist"&&!S.tier)S.tier=myTier();
    b.innerHTML='<p class="small muted">Loading…</p>';
    S.list=await loadList(S.tab,S.tab==="find"?"":S.tier,S.tab==="open"?S.eco:"");S.i=0;
    if(C.state==="nosql"){b.innerHTML='<div class="panel pad"><p>'+(owner()?"Run sql/20261118150000_lc95_master_games.sql in Supabase, then Sync now.":"My games are being prepared. Check back soon.")+"</p></div>";return}
    if(!pro()){const done=store.get("lc95-free",{});const ids=done.day===today()?done.done||[]:[];S.list=S.list.filter(p=>ids.indexOf(p.id)<0);if(!S.list.length){b.innerHTML=lockCard("done");return}}
    if(!S.list.length){b.innerHTML='<div class="panel pad"><p>No positions here yet.'+(S.tab==="mist"&&S.tier?" Try another level.":"")+"</p>"+(S.tab==="mist"?tierPicker():"")+(S.eco?'<button type="button" class="btn btn-ghost" data-lc95="openings">All openings</button>':"")+"</div>";return}
    b.innerHTML=(S.ids.length||S.phase?'<p class="lc95-eco">'+E(S.label||(S.ids.length?"Picked from Kyenzo’s Gems":"My "+S.phase+" positions"))+' <button type="button" class="btn btn-quiet btn-sm" data-lc95-tab="find">All positions</button></p>':"")+(S.tab==="mist"?tierPicker():"")+(S.eco?'<p class="lc95-eco">'+E(S.eco)+" · "+E(S.list[0].opening||"")+' <button type="button" class="btn btn-quiet btn-sm" data-lc95="openings">All openings</button></p>':"")
      +'<div class="lc95-run"><div class="lc95-bd"><div data-lc95-board></div></div><div class="lc95-pn panel pad" data-lc95-panel aria-live="polite"></div></div>';
    S.board=Board(Q("[data-lc95-board]",b),{});show();
  }
  function tierPicker(){return'<div class="lc95-tp" role="group" aria-label="Level">'+TIERS.map(t=>'<button type="button" class="btn btn-sm '+(S.tier===t?"btn-primary":"btn-quiet")+'" data-lc95-tier="'+t+'">'+t+"</button>").join("")+"</div>"}
  function lockCard(kind){
    const n=kind==="done"?"That was today’s "+FREE_N+".":kind==="mist"?"The mistakes I made at your level":"Every opening I played, with the positions that decided the games";
    return'<div class="panel pad lc95-lock">'+ic("lock")+'<h2>'+E(n)+'</h2><p>'+(kind==="done"?"New ones tomorrow. Pro trains every position from my games: the brilliant moves, the mistakes per level and every opening.":kind==="mist"?"Pro shows the exact positions where I lost points at your rating, and what I should have played. That is the fastest way past your level.":"Pro opens my openings with my real score and the positions they produced.")+'</p><button type="button" class="btn btn-primary" data-lc95="pro">Try Pro free</button></div>';
  }
  function openingsHTML(o){
    if(!o||!o.length)return'<div class="panel pad"><p>No openings yet.</p></div>';
    return'<ul class="lc95-ops">'+o.slice(0,30).map(x=>'<li><button type="button" data-lc95-eco="'+E(x.eco)+'"><b>'+E(x.opening||x.eco)+'</b><span>'+E(x.eco)+" · "+(x.color==="w"?"White":"Black")+" · "+E(x.games)+" games · "+E(x.score)+'% score</span><small>'+E(+x.puzzles+ +x.mistakes)+" positions</small></button></li>").join("")+"</ul>";
  }
  function show(){
    const p=S.list[S.i],pn=Q("[data-lc95-panel]",S.view);if(!p||!pn||!S.board)return;
    S.done=false;S.misses=0;S.hints=0;
    const pv=uciToMove(p.prev);
    S.board.orientation(p.side==="w"?"white":"black");S.board.clearMarks();S.board.setArrows([]);
    S.board.setPosition(p.fen,{animate:false,lastMove:pv?{from:pv.from,to:pv.to}:null});
    S.board.setInteractive(p.side);S.board.setOnMove(onMove);
    const pr=prompt(p);
    pn.innerHTML='<p class="lc95-kind is-'+E(p.kind)+'">'+E(p.kind)+(p.tier?" · "+E(p.tier):"")+(p.opening?" · "+E(p.opening):"")+'</p><h2>'+E(pr.h)+'</h2><p>'+E(pr.t)+'</p><p class="small muted">'+(p.side==="w"?"White":"Black")+" to move.</p>"
      +'<div class="lc95-mspc" role="group" aria-label="Run MSPC">'+["M","S","P","C"].map(k=>'<button type="button" class="lc95-mk" data-lc95-k="'+k+'"><b>'+k+'</b><span>'+E(STEPNAME[k])+"</span></button>").join("")+'</div><div class="lc95-mf" data-lc95-mf></div>'
      +'<div class="lc95-fb" data-lc95-fb></div><div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-lc95="hint">'+ic("lightbulb")+' Hint</button><button type="button" class="btn btn-quiet btn-sm" data-lc95="show" hidden>'+ic("eye")+' Show me</button><button type="button" class="btn btn-primary btn-sm" data-lc95="next" hidden>Next '+ic("arrow-right")+"</button></div>"
      +'<p class="small muted lc95-count">'+(S.i+1)+" / "+S.list.length+(pro()?"":" · free today: "+freeLeft()+" left")+"</p>"
      +(owner()?'<p class="small"><button type="button" class="btn btn-quiet btn-sm" data-lc95="hide">Hide this one</button> <button type="button" class="btn btn-quiet btn-sm" data-lc95="feature">Feature it</button></p>':"");
  }
  function fb(v,label,text){const el=Q("[data-lc95-fb]",S.view);if(el)el.innerHTML=label?'<div class="lc95-msg is-'+v+'"><b>'+E(/[.!?:\u2026]$/.test(label)?label:label+".")+"</b> "+E(text||"")+"</div>":""}
  function target(p){return(p.solution&&p.solution[0])||p.best||p.played}
  function onMove(m){
    const p=S.list[S.i];if(!p||S.done)return;
    const g=new Chess(p.fen),mv=g.move({from:m.from,to:m.to,promotion:m.promotion||"q"});
    if(!mv){S.board.setPosition(p.fen,{animate:false});return}
    const uci=mv.from+mv.to+(mv.promotion||""),t=target(p);
    if(uci===t||uci.slice(0,4)===String(t).slice(0,4)&&!mv.promotion){solved(true);return}
    S.board.setInteractive(null);
    const back=()=>{const pv=uciToMove(p.prev);S.board.setPosition(p.fen,{animate:false,lastMove:pv?{from:pv.from,to:pv.to}:null});S.board.setInteractive(p.side)};
    if(BAD.indexOf(p.kind)>=0&&uci===p.played){S.misses++;fb("off","That was my move.","It is the one that cost me. Look for a better one.");setTimeout(back,900);more();return}
    fb("hint","Checking…","");
    let done=false;const fin=r=>{if(done)return;done=true;
      if(r&&(r.tier==="full"||r.tier==="mostly")){fb("alt",r.label||"Also good",(r.text?r.text+" ":"")+"In the game the move was "+(sanLine(p.fen,[t],1)[0]||"another one")+".");solved(false,true);return}
      S.misses++;S.board.shake&&S.board.shake();fb("off","Not this one.",S.misses>=2?"Use the hint, or let me show you.":"Calculate their best answer to "+mv.san+" first.");setTimeout(back,700);more()};
    try{const pr=LC25&&LC25.alt&&LC25.alt.check?LC25.alt.check({fen:p.fen,from:mv.from,to:mv.to,promotion:mv.promotion||"",san:mv.san}):null;
      if(pr&&pr.then){pr.then(fin,()=>fin(null));setTimeout(()=>fin(null),9000)}else fin(null)}catch(e){fin(null)}
  }
  /* MSPC before the move: M and S from the board, P your checks and captures (not which one), C how to check a candidate;
     after the move, C shows what the line does. Never the answer before the move. */
  function mspcStep(k){
    const p=S.list[S.i],el=Q("[data-lc95-mf]",S.view);if(!p||!el)return;
    QA("[data-lc95-k]",S.view).forEach(b=>b.classList.toggle("is-on",b.getAttribute("data-lc95-k")===k));
    const pv=uciToMove(p.prev),o={fen:p.fen,lastMove:pv?{from:pv.from,to:pv.to}:null,side:p.side};
    let h="";
    try{if(k==="P")h=LC93.html("P",Object.assign(o,{ucis:[]}));else if(k==="C")h=S.done?LC93.html("C",Object.assign(o,{ucis:p.solution||[]})):"";else h=LC93.html(k,o)}catch(e){h=""}
    if(k==="C"&&!S.done)h='<div class="lc93"><p class="lc93-h"><b>Calculate</b></p><ul><li>Take your best candidate and find their best answer to it: their checks and captures first.</li><li>Still good after their best answer? Play it on the board. If not, the next candidate.</li></ul></div>';
    el.innerHTML=h||'<p class="small muted">Nothing to add from the board here.</p>';
    try{Telemetry.log({e:"q",x:"lc95-mspc-"+k})}catch(e){}
  }
  function more(){if(S.misses>=2){const b=Q('[data-lc95="show"]',S.view);if(b)b.hidden=false}}
  function solved(clean,alt){
    const p=S.list[S.i];S.done=true;S.board.setInteractive(null);S.board.setOnMove(null);
    const sol=(p.solution&&p.solution.length?p.solution:[target(p)]);
    const g=new Chess(p.fen);let last=null;const fens=[];sol.slice(0,4).forEach(u=>{const m=uciToMove(u);if(!m)return;const mv=g.move({from:m.from,to:m.to,promotion:m.promotion||"q"});if(mv){last={from:mv.from,to:mv.to};fens.push({fen:g.fen(),last:last})}});
    let k=0;const step=()=>{if(k>=fens.length||!S.board)return;const f=fens[k++];S.board.setPosition(f.fen,{animate:true,lastMove:f.last});if(k<fens.length)setTimeout(step,700)};
    if(!alt)step();
    const x=explain(p);
    if(!alt)fb(clean&&!S.misses&&!S.hints?"good":"info",clean&&!S.misses&&!S.hints?"Correct. "+x.title:x.title,x.text);
    else{const el=Q("[data-lc95-fb]",S.view);if(el)el.insertAdjacentHTML("beforeend",'<div class="lc95-msg is-info"><b>'+E(x.title)+"</b> "+E(x.text)+"</div>")}
    const nb=Q('[data-lc95="next"]',S.view);if(nb)nb.hidden=false;const sb=Q('[data-lc95="show"]',S.view);if(sb)sb.hidden=true;
    const hb=Q('[data-lc95="hint"]',S.view);if(hb)hb.hidden=true;
    if(p.game_id){const pn=Q("[data-lc95-panel]",S.view);if(pn&&!Q("[data-lc95-game]",pn))pn.insertAdjacentHTML("beforeend",'<p class="small"><a data-lc95-game href="https://www.chess.com/game/live/'+encodeURIComponent(p.game_id)+'" target="_blank" rel="noopener">Open the whole game '+ic("arrow-up-right-from-square")+"</a></p>")}
    if(!pro())freeMark(p.id);
    try{FeatureChecklist.mark("mspc")}catch(e){}try{if(clean&&!S.misses&&!S.hints)V6.addXp("think",10)}catch(e){}
    try{Telemetry.log({e:"q",x:"lc95-"+p.kind+(clean&&!S.misses?"-ok":"-seen")})}catch(e){}
  }
  function hint(){
    const p=S.list[S.i];if(!p||S.done)return;S.hints++;const m=uciToMove(target(p));
    if(S.hints===1){const t=String(sanLine(p.fen,[target(p)],1)[0]||"");fb("hint","Hint",BAD.indexOf(p.kind)>=0?"I played "+(p.played_san||"something else")+". What did that allow? The better move is a "+(/[+#]/.test(t)?"check":/x/.test(t)?"capture":"quiet move")+".":"It is a "+(/[+#]/.test(t)?"check":/x/.test(t)?"capture":"quiet move")+". Look at your checks, captures and attacks first.")}
    else if(m){S.board.mark(m.from,"hl-hint");fb("hint","Hint","It starts on "+m.from+".");const b=Q('[data-lc95="show"]',S.view);if(b)b.hidden=false}
  }
  async function sync(){
    const el=Q("[data-lc95-sync]",S.view);const out=t=>{if(el)el.textContent=t};
    out("Asking GitHub…");let r=await rpc("mg_admin_sync",{p_step:"pull"},true);
    if(missing(r)){out("Run sql/20261118150000_lc95_master_games.sql first.");return}
    if(!(r&&r.data&&r.data.ok)){out(r&&r.data&&r.data.reason==="owner_only"?"Sign in with the owner account.":"Could not start the sync.");return}
    for(let i=0;i<12;i++){await new Promise(z=>setTimeout(z,5000));r=await rpc("mg_admin_sync",{p_step:"collect"},true);const d=r&&r.data||{};
      out((d.games||0)+" games, "+(d.puzzles||0)+" positions"+(d.pending?", "+d.pending+" files still coming…":"")+(d.failed?", "+d.failed+" failed":""));
      if(d.ok&&!d.pending)break}
    C.tiers=null;C.openings=null;paintClimb();
  }
  async function curate(hidden){const p=S.list[S.i];if(!p)return;const r=await rpc("mg_curate",hidden?{p_id:p.id,p_hidden:true}:{p_id:p.id,p_featured:true},true);
    if(r&&r.data&&r.data.ok){say(hidden?"Hidden from players.":"Featured: it comes first.","good");if(hidden){S.list.splice(S.i,1);if(S.i>=S.list.length)S.i=0;S.list.length?show():body()}}else say("Could not save. Sign in with the owner account.","bad")}
  function onClick(e){
    const it=e.target.closest&&e.target.closest("[data-lc95-intent]");if(it){try{sessionStorage.setItem("lc95-open",it.getAttribute("data-lc95-intent"))}catch(x){}return}
    const b=e.target.closest&&e.target.closest("[data-lc95],[data-lc95-tab],[data-lc95-tier],[data-lc95-eco],[data-lc95-k]");if(!b||!S.view||!S.view.contains(b))return;
    if(b.hasAttribute("data-lc95-tab")){S.tab=b.getAttribute("data-lc95-tab");S.eco="";S.ids=[];S.phase="";body();return}
    if(b.hasAttribute("data-lc95-tier")){const t=b.getAttribute("data-lc95-tier");S.tier=S.tier===t&&S.tab!=="mist"?"":t;if(S.tab!=="mist")S.tab="mist";paintClimb();body();return}
    if(b.hasAttribute("data-lc95-eco")){S.eco=b.getAttribute("data-lc95-eco");body();return}
    if(b.hasAttribute("data-lc95-k"))return mspcStep(b.getAttribute("data-lc95-k"));
    const a=b.getAttribute("data-lc95");
    if(a==="next"){S.i++;if(S.i>=S.list.length){if(!pro()){body();return}S.i=0}show();return}
    if(a==="hint")return hint();
    if(a==="show"){S.misses=2;solved(false);return}
    if(a==="pro"){try{LC90.open({from:"kgames"})}catch(x){location.hash="#upgrades"}return}
    if(a==="openings"){S.eco="";S.tab="open";body();return}
    if(a==="sync")return sync();
    if(a==="hide")return curate(true);
    if(a==="feature")return curate(false);
  }

  /* ---------- entry points ---------- */
  function cardHTML(title,text,href,btn,intent){return'<a class="lc95-card" data-lc95-card href="'+href+'"'+(intent?" data-lc95-intent='"+E(JSON.stringify(intent))+"'":"")+'><span class="lc95-card-ic">'+ic("chess-king")+'</span><span><b>'+E(title)+"</b><small>"+E(text)+"</small></span><span class=\"lc95-card-go\">"+E(btn)+" "+ic("arrow-right")+"</span></a>"}
  async function entry(r){
    const v=Q("#view");if(!v||Q("[data-lc95-card]",v))return;
    if(r==="openings"){const o=await loadOpenings();if(!o||!o.length||Q("[data-lc95-card]",v))return;const h=Q("h1",v);if(!h)return;const top=o.slice(0,3).map(x=>x.opening||x.eco).join(", ");
      (h.closest("header")||h).insertAdjacentHTML("afterend",cardHTML("My own games in these openings",top+": the positions that decided my games.","#think","Open",{tab:"open",eco:String(o[0].eco).slice(0,2)}))}
  }
  let deb=0;
  function afterRender(r){clearTimeout(deb);deb=setTimeout(()=>{try{entry(r||routeName())}catch(e){}},300)}
  function css(){
    if(Q("#lc95-css"))return;const s=document.createElement("style");s.id="lc95-css";
    s.textContent=".lc95{max-width:1100px;margin:0 auto;display:grid;gap:14px}.lc95 h1{margin:0}.lc95-tag{margin:0;color:#38bdf8;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase}"
      +".lc95-tiers{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.lc95-tier{display:flex;flex-direction:column;gap:2px;text-align:left;padding:10px 12px;border-radius:14px;background:#1e293b;border:1px solid rgba(148,163,184,.2);color:inherit;min-height:44px;cursor:pointer}.lc95-tier.is-on{border-color:#38bdf8}.lc95-tier span{color:#fbbf24;font-weight:700;font-size:13px}.lc95-tier small{color:#94a3b8}"
      +".lc95-tabs button{min-height:44px}.lc95-tp{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.lc95-tp .btn{min-height:44px}"
      +".lc95-run{display:grid;gap:14px}@media (min-width:900px){.lc95-run{grid-template-columns:minmax(0,560px) minmax(0,1fr);align-items:start}}.lc95-bd{width:100%;max-width:560px}"
      +".lc95-pn h2{margin:4px 0 6px;font-size:20px}.lc95-kind{margin:0;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#94a3b8}.lc95-kind.is-brilliant{color:#22d3ee}.lc95-kind.is-great{color:#38bdf8}.lc95-kind.is-punish{color:#4ade80}.lc95-kind.is-blunder,.lc95-kind.is-missed{color:#f87171}.lc95-kind.is-mistake{color:#fb923c}"
      +".lc95-msg{margin:8px 0;padding:10px 12px;border-radius:12px;background:#0f172a;border:1px solid #334155}.lc95-msg.is-good{border-color:#22c55e}.lc95-msg.is-off{border-color:#f87171}.lc95-msg.is-alt{border-color:#38bdf8}.lc95-msg.is-hint{border-color:#fbbf24}"
      +".lc95 .btn-row .btn{min-height:44px}.lc95-ops{list-style:none;margin:0;padding:0;display:grid;gap:8px}.lc95-ops button{width:100%;display:flex;flex-direction:column;gap:2px;text-align:left;padding:12px 14px;border-radius:14px;background:#1e293b;border:1px solid rgba(148,163,184,.2);color:inherit;min-height:44px;cursor:pointer}.lc95-ops span{color:#94a3b8;font-size:13px}.lc95-ops small{color:#38bdf8;font-weight:700}"
      +".lc95-mspc{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0 4px}.lc95-mk{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border-radius:12px;background:#0f172a;border:1px solid #334155;color:inherit;min-height:44px;cursor:pointer}.lc95-mk b{color:#38bdf8;font-size:18px}.lc95-mk span{font-size:11px;color:#94a3b8;text-align:center}.lc95-mk.is-on{border-color:#38bdf8}.lc95-lock{text-align:center;display:grid;gap:8px;justify-items:center}.lc95-lock h2{margin:0}.lc95-own{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.lc95-eco{margin:0;display:flex;gap:8px;align-items:center;flex-wrap:wrap}"
      +".lc95-card{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;margin:10px 0;padding:12px 14px;border-radius:14px;background:linear-gradient(135deg,rgba(56,189,248,.14),rgba(30,41,59,.9));border:1px solid rgba(56,189,248,.35);color:inherit;text-decoration:none;min-height:44px}.lc95-card b{display:block}.lc95-card small{display:block;color:#94a3b8}.lc95-card-ic{font-size:22px;color:#38bdf8}.lc95-card-go{color:#38bdf8;font-weight:800;white-space:nowrap}";
    document.head.appendChild(s);
  }
  function init(){
    try{
      /* 9.61.0: this page IS the MSPC trainer (#think); #kgames stays as an old address of the same page */
      if(typeof MOUNT!=="undefined"){MOUNT[ROUTE]=mount;MOUNT.think=mount;try{DOC_TITLES[ROUTE]="MSPC trainer";DOC_TITLES.think="MSPC trainer";ROUTE_TITLES[ROUTE]="the MSPC trainer";ROUTE_TITLES.think="the MSPC trainer"}catch(e){}}
      try{const lv=LC26.levels,o=lv.minLevel;if(lv&&!lv.__lc95){lv.__lc95=1;lv.minLevel=r=>r===ROUTE?1:o(r)}}catch(e){}
      document.addEventListener("click",onClick);
    }catch(e){console.error("lc95",e)}
  }
  return{init:init,afterRender:afterRender,mount:mount,version:VERSION,_t:{sanLine:sanLine,numbered:numbered,prompt:prompt,explain:explain,tierOf:tierOf,freeLeft:freeLeft,freeMark:freeMark,uciToMove:uciToMove,evalWords:evalWords,state:()=>S,cache:C,play:u=>{const m=uciToMove(u);if(m)onMove(m)}}};
})(); /*@@end lc95*/
