/*@@module lc96*/
const LC96=(()=>{
  "use strict";
  /* LC96 (build 9.61.0): the MSPC System page, #learn-mspc (Train > Think > "MSPC System"). It replaces the old MSPC trainer's
     case player as the place to LEARN the method; the trainer itself is now #think = Kyenzo's Games (LC95).
     The page is Kyenzo's own: every text is his, written in the app (owner: "Edit this page") and saved in lc89_cfg 'mspc'
     (sql/20261118170000_lc96_mspc_learn.sql): intro, the four steps M / S / P / C, how he uses it, how you use it, and examples
     from his own games (master_puzzles) with his comment per step. Until he writes a text, a step shows his short MSPC definition
     (the app's MSPC letters) and an example shows what the board itself says (LC93), never an invented explanation.
     Examples are picked from his hardest positions per kind of thinking (mg_examples: tactic, brilliant, quiet move, plan, defence,
     endgame); the owner swaps, adds and removes them. Coach Lanckriet's voice: a slot plays /assets/audio/mspc/<slot>.mp3 when
     assets/audio/mspc/index.json says it was made from the same text (scripts/build-mspc-audio.mjs, workflow "MSPC audio"),
     or an mp3 address the owner pasted for that slot. */
  const VERSION="9.61.0";
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.prototype.slice.call((r||document).querySelectorAll(s));
  const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const say=(m,k,ms)=>{try{toast(m,k||"",ms)}catch(e){}};
  const ic=n=>{try{return icon(n)}catch(e){return""}};
  const ROUTE="learn-mspc";
  const STEPS=["M","S","P","C"];
  const CATS=[["tactic","Tactic","A forcing move that wins."],["brilliant","Brilliant move","A real sacrifice: only one move works."],["quiet","Quiet move","No check, no capture, and it still wins."],["plan","The right plan","A level position: one quiet move fits it."],["defence","Only move to hold","Everything else loses."],["endgame","Endgame technique","One precise move converts or saves it."]];
  const CATNAME={};CATS.forEach(c=>{CATNAME[c[0]]=c[1]});
  const SQL="sql/20261118170000_lc96_mspc_learn.sql";
  const owner=()=>{try{return !!(LC49.owner()||Admin.active)}catch(e){return false}};
  const HTTPS=/^(https:\/\/[^\s"'<>]{3,400}|\/assets\/[A-Za-z0-9_\/.-]{3,200})$/;
  async function rpc(fn,args,auth){
    try{const h={};if(auth){const t=await LC26.sync.token();if(!t)return{status:401,data:null};h.Authorization="Bearer "+t}
      return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:h,body:JSON.stringify(args||{})})}catch(e){return{status:0,data:null}}
  }
  const missing=r=>!!(r&&(r.status===404||(r.data&&/PGRST202|does not exist|42883|42P01/i.test(String(r.data.code||"")+String(r.data.message||"")))));

  /* ---------- pure helpers (tested) ---------- */
  /* FNV-1a, the same in scripts/build-mspc-audio.mjs: a clip belongs to exactly one text */
  function fnv(s){let h=2166136261;s=String(s||"");for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
  const slot=(v)=>v&&typeof v==="object"?{t:String(v.t||"").replace(/\r/g,"").slice(0,4000),a:HTTPS.test(String(v.a||"").trim())?String(v.a).trim():""}:{t:"",a:""};
  function clean(v){
    v=v&&typeof v==="object"?v:{};
    const o={intro:slot(v.intro),steps:{},use:slot(v.use),you:slot(v.you),examples:[]};
    STEPS.forEach(k=>{o.steps[k]=slot(v.steps&&v.steps[k])});
    (Array.isArray(v.examples)?v.examples:[]).slice(0,40).forEach(x=>{if(!x||typeof x!=="object")return;const id=String(x.id||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,40);if(!id)return;
      const e={id:id,cat:CATNAME[x.cat]?x.cat:"tactic",title:String(x.title||"").replace(/[<>]/g,"").slice(0,90),intro:slot(x.intro),move:slot(x.move)};STEPS.forEach(k=>{e[k]=slot(x[k])});o.examples.push(e)});
    return o;
  }
  /* the categories mg_examples uses, for the fallback when that function is not there yet */
  function catOf(p){
    const t=p.tags||[],forcing=t.indexOf("check")>=0||t.indexOf("capture")>=0,eb=+p.eval_before||0,ea=+p.eval_after||0,king=/^K/.test(p.played_san||"");
    if(Math.abs(eb)>350)return"";
    if(p.prev&&p.played&&String(p.played).slice(2,4)===String(p.prev).slice(2,4))return"";
    if(p.kind==="brilliant")return"brilliant";
    if(p.phase==="endgame"&&(p.kind==="great"||p.kind==="punish"))return"endgame";
    if(p.kind==="great"&&eb<=-60)return"defence";
    if((p.kind==="great"||p.kind==="punish")&&forcing)return"tactic";
    if(p.kind==="great"&&!forcing&&!king&&Math.abs(eb)<=120&&ea-eb<150)return"plan";
    if((p.kind==="great"||p.kind==="punish")&&!king)return"quiet";
    return"";
  }
  function pickDefaults(cands,per){
    const out=[];CATS.forEach(c=>{(cands[c[0]]||[]).slice(0,per||2).forEach(p=>out.push({id:p.id,cat:c[0],title:"",intro:slot(),move:slot(),M:slot(),S:slot(),P:slot(),C:slot()}))});return out;
  }
  function sans(fen,ucis,max){const out=[];try{const g=new Chess(fen);for(const u of (ucis||[]).slice(0,max||6)){const mv=g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||"q"});if(!mv)break;out.push(mv.san)}}catch(e){}return out}
  function numbered(fen,list){const p=String(fen).split(" ");let n=+p[5]||1,w=p[1]!=="b",s="";list.forEach((x,i)=>{s+=(s?" ":"")+(w?n+". ":i===0?n+"... ":"")+x;if(!w)n++;w=!w});return s}
  function letter(k){try{const m=MSPC.filter(x=>x.k===k)[0];if(m)return{name:m.name,text:m.text}}catch(e){}return{name:{M:"Move",S:"Specifics",P:"Priorities",C:"Calculation"}[k],text:""}}

  /* ---------- data ---------- */
  const D={cfg:null,raw:null,cands:null,byId:{},audio:null,state:"",edit:false,cur:null};
  async function loadCfg(){
    const r=await rpc("lc89_cfg_public",{p_k:"mspc"});
    D.raw=r&&r.data&&r.data.ok?r.data.v||{}:{};D.cfg=clean(D.raw);
  }
  async function loadCands(){
    if(D.cands)return D.cands;const C={};CATS.forEach(c=>{C[c[0]]=[]});
    let r=await rpc("mg_examples",{p_n:10});
    if(r&&r.status===200&&Array.isArray(r.data)){r.data.forEach(p=>{if(C[p.cat])C[p.cat].push(p)})}
    else{
      if(missing(r)){const lists=await Promise.all([["brilliant"],["great"],["punish"]].map(k=>rpc("mg_puzzles",{p_kinds:k,p_limit:100})));
        if(lists.some(x=>missing(x))){D.state="nosql";D.cands=C;return C}
        const all=[].concat.apply([],lists.map(x=>Array.isArray(x&&x.data)?x.data:[]));
        all.forEach(p=>{const c=catOf(p);if(c)C[c].push(p)});
        Object.keys(C).forEach(k=>C[k].sort((a,b)=>((b.my_rating>=1600)-(a.my_rating>=1600))||((+b.gap||0)-(+a.gap||0))));}
    }
    Object.keys(C).forEach(k=>C[k].forEach(p=>{D.byId[p.id]=p}));
    D.cands=C;return C;
  }
  async function loadAudio(){if(D.audio)return D.audio;try{const r=await fetch("/assets/audio/mspc/index.json",{cache:"no-store"});D.audio=r.ok?await r.json():{}}catch(e){D.audio={}}return D.audio}
  async function puzzleOf(id){
    if(D.byId[id])return D.byId[id];
    try{const r=await LC26.sync.http("/rest/v1/master_puzzles?id=eq."+encodeURIComponent(id)+"&select=*",{method:"GET"});const p=Array.isArray(r.data)?r.data[0]:null;if(p)D.byId[id]=p;return p}catch(e){return null}
  }
  function audioOf(key,s){
    if(s&&s.a)return s.a;
    const a=D.audio&&D.audio[key];return a&&s&&s.t&&a.h===fnv(s.t)&&/^[a-z0-9_-]+\.mp3$/i.test(a.file||"")?"/assets/audio/mspc/"+a.file:"";
  }

  /* ---------- page ---------- */
  let view=null,board=null;
  async function mount(v){
    css();view=v;D.edit=false;D.cur=null;
    v.innerHTML='<div class="lc96"><p class="small muted">Loading…</p></div>';
    await Promise.all([loadCfg(),loadAudio()]);
    await loadCands();
    if(!D.cfg.examples.length){const per=2;D.cfg.examples=pickDefaults(D.cands,per);D.auto=true}else D.auto=false;
    paint();
  }
  function textBlock(key,s,fallback,ph){
    if(D.edit)return'<div class="lc96-ed"><textarea class="input" rows="4" data-lc96-t="'+E(key)+'" placeholder="'+E(ph||"Write this part in your own words.")+'">'+E(s.t)+'</textarea><input class="input" data-lc96-a="'+E(key)+'" placeholder="Audio (optional): https://… .mp3" value="'+E(s.a)+'"></div>';
    const au=audioOf(key,s);
    const body=s.t?s.t.split(/\n{2,}/).map(p=>"<p>"+E(p).replace(/\n/g,"<br>")+"</p>").join(""):(fallback?'<p class="lc96-fb">'+E(fallback)+"</p>":"");
    return(au?'<button type="button" class="btn btn-ghost btn-sm lc96-play" data-lc96-play="'+E(au)+'">'+ic("play")+" Coach Lanckriet</button>":"")+body;
  }
  /* 9.73.0: a draft for the owner only (button "Fill empty fields with a draft" in Edit mode): it fills EMPTY fields, the owner
     rewrites it in his own words and publishes; players never see it before Save & Publish. Written from his MSPC definitions. */
  const DRAFT={
    intro:"Most games under 2000 are not lost to a lack of knowledge. They are lost to one move played without a check. MSPC is the check: four questions, always in the same order, before every move that matters. Move, Specifics, Priorities, Calculation.\n\nIt took me from 304 to 2105 in under three years. Not because it finds genius moves, but because it stops the moves that lose. The good moves come by themselves once the bad ones are gone.",
    M:"Move: what did their last move change?\n\nEvery move does something. It attacks a piece, it defends one, it opens a line, or it prepares a plan. Before you think about your own move, name what theirs did. Then look at what it stopped doing: the piece that moved no longer guards the squares it guarded before.\n\nAsk two things: what does it threaten now, and what did it leave undefended? Most blunders happen because this step was skipped.",
    S:"Specifics: what is this position about?\n\nPart one is noticing. Which phase is it? What is the pawn structure? Which pieces are loose? Where are the kings, and how safe are they? Which files and diagonals are open?\n\nPart two is the plan. The structure tells you where to play: the pawn break, the outpost, the weak square, the side of the board where you are stronger. A move that fits the plan of the structure is almost always better than a move that only looks active.",
    P:"Priorities: checks, captures and attacks.\n\nFirst list every forcing move for you: every check, every capture, every move that attacks something. Then do the same for your opponent. Forcing moves come first because they limit the answers.\n\nIf one of your forcing moves wins something, look at it first. If one of theirs hurts you, deal with it first. Only when nothing forcing works, play the quiet move from your plan.",
    C:"Calculation: check your move to the end.\n\nPick your candidate and play it out in your head. After every move, ask what their best answer is, not the answer you hope for. Keep going until the position is quiet: no more checks, captures or threats.\n\nIf the line ends well, play it. If you find a hole, go back to Priorities and take the next candidate. Never stop halfway out of hope: the reply you skipped is the one that beats you.",
    use:"In a real game I do not run all four steps on every move. On a quiet move, M and a quick P are enough. When something changes (a capture, a pawn break, a piece coming close to my king, or a moment where I feel there must be something), I run the full loop.\n\nIn my own games you can see it: the good moves in the MSPC trainer are the moments where the loop found the only move, and the mistakes are the moments where I skipped a step.",
    you:"Start with M only. For one week, before every move, say out loud what their last move did. That alone removes most hanging pieces.\n\nThen add P: list the checks, captures and attacks for both sides. After that S, and only then full calculation. Train it on positions from my games in the MSPC trainer, and use the Trim review on your own games to see which step you skipped when you lost."
  };
  function paint(){
    if(!view)return;const c=D.cfg,own=owner();
    const head='<header class="lc96-hd"><p class="lc96-tag">The MSPC System</p><h1>How I find the right move</h1>'
      +(own?'<div class="btn-row lc96-own">'+(D.edit?'<button type="button" class="btn btn-primary" data-lc96="save">'+ic("cloud-arrow-up")+' Save & Publish</button><button type="button" class="btn btn-quiet" data-lc96="draft" title="Fills only the empty fields; nothing is live before Save & Publish">Fill empty fields with a draft</button><button type="button" class="btn btn-quiet" data-lc96="cancel">Cancel</button>':'<button type="button" class="btn btn-ghost" data-lc96="edit">'+ic("pen")+" Edit this page</button>")+"</div>":"")
      +textBlock("intro",c.intro,"Four questions before every move: Move, Specifics, Priorities, Calculation. Below: what each one asks, and real positions from my games where MSPC found the move.","The intro: what MSPC is and why it works.")+"</header>";
    const steps='<section class="lc96-steps">'+STEPS.map(k=>{const l=letter(k);return'<article class="lc96-step"><p class="lc96-k">'+k+'</p><h2>'+E(l.name)+"</h2>"+textBlock("step-"+k,c.steps[k],l.text,"What "+k+" asks, and how you answer it.")+"</article>"}).join("")+"</section>";
    const use=(c.use.t||D.edit?'<section class="panel pad lc96-sec"><h2>How I use it</h2>'+textBlock("use",c.use,"","How you use MSPC in your own games, move by move.")+"</section>":"")
      +(c.you.t||D.edit?'<section class="panel pad lc96-sec"><h2>How you use it</h2>'+textBlock("you",c.you,"","How a student uses it: the routine, the order, what to do when there is no time.")+"</section>":"");
    const ex='<section class="lc96-exs"><h2>MSPC in my games</h2><p class="small muted">Positions where the right move was hard to find. Try it first, then walk through the four steps with me.</p>'
      +CATS.map(cat=>{const list=c.examples.map((e,i)=>({e:e,i:i})).filter(x=>x.e.cat===cat[0]);if(!list.length&&!D.edit)return"";
        return'<div class="lc96-cat"><h3>'+E(cat[1])+' <small>'+E(cat[2])+'</small></h3><div class="lc96-grid">'+list.map(x=>exCard(x.e,x.i)).join("")
          +(D.edit?'<button type="button" class="lc96-add" data-lc96="add" data-cat="'+cat[0]+'">'+ic("plus")+" Add a "+E(cat[1].toLowerCase())+"</button>":"")+"</div></div>"}).join("")+"</section>";
    const viewer='<section class="lc96-view" data-lc96-view hidden></section>';
    const cta='<section class="panel pad lc96-cta"><h2>Now use it yourself</h2><p>The MSPC trainer gives you positions from my games. Run the four steps, then play the move.</p><a class="btn btn-primary" href="#think">'+ic("brain")+" Open the MSPC trainer</a></section>";
    const note=D.state==="nosql"?'<div class="panel pad"><p>'+(own?"Run "+SQL+" and sql/20261118150000_lc95_master_games.sql in Supabase.":"The examples are being prepared.")+"</p></div>":"";
    view.innerHTML='<div class="lc96">'+head+steps+use+note+ex+viewer+cta+"</div>";
    if(D.cur!=null&&!D.edit)openEx(D.cur);
  }
  function exCard(e,i){
    const p=D.byId[e.id];const sub=p?(p.my_rating?p.my_rating+" Elo":"")+(p.opening?" · "+p.opening:""):"";
    if(D.edit){const cands=(D.cands&&D.cands[e.cat])||[];
      return'<div class="lc96-ex is-ed"><select class="input" data-lc96-pick="'+i+'">'+cands.map(x=>'<option value="'+E(x.id)+'"'+(x.id===e.id?" selected":"")+">"+E((x.played_san||"")+" · "+(x.my_rating||"?")+" Elo · "+(x.opening||x.eco||""))+"</option>").join("")+(cands.some(x=>x.id===e.id)?"":'<option value="'+E(e.id)+'" selected>'+E(e.id)+"</option>")+'</select><input class="input" data-lc96-title="'+i+'" placeholder="Title (optional)" value="'+E(e.title)+'"><div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-lc96="write" data-i="'+i+'">'+ic("pen")+' Write my comments</button><button type="button" class="btn btn-quiet btn-sm" data-lc96="del" data-i="'+i+'">Remove</button></div></div>'}
    return'<button type="button" class="lc96-ex" data-lc96-open="'+i+'"><b>'+E(e.title||CATNAME[e.cat])+'</b><small>'+E(sub||"From my games")+"</small><span>"+ic("chess-board")+" Study it</span></button>";
  }

  /* ---------- one example ---------- */
  const X={i:-1,p:null,step:-1,solved:false};
  async function openEx(i){
    const e=D.cfg.examples[i];if(!e)return;const host=Q("[data-lc96-view]",view);if(!host)return;
    D.cur=i;X.i=i;X.step=-1;X.solved=false;X.p=await puzzleOf(e.id);
    if(!X.p){host.hidden=false;host.innerHTML='<div class="panel pad"><p>This position is not in my games any more.</p></div>';return}
    const p=X.p,side=p.side==="w"?"White":"Black";
    host.hidden=false;
    host.innerHTML='<div class="panel pad lc96-vh"><p class="lc96-tag">'+E(CATNAME[e.cat])+'</p><h2>'+E(e.title||(side+" to move. Find my move."))+'</h2><p class="small muted">'+E((p.my_rating?"I was "+p.my_rating+" Elo":"")+(p.time_class?", "+p.time_class:"")+(p.opening?", "+p.opening:""))+"</p>"
      +'<div class="lc96-run"><div class="lc96-bd"><div data-lc96-board></div></div><div class="lc96-pn"><div data-lc96-intro>'+textBlock("ex-"+e.id+"-intro",e.intro,"I am "+side+". Try to find my move first. Then walk through how I found it.")+'</div>'
      +'<div class="lc96-fb2" data-lc96-fb aria-live="polite"></div><ol class="lc96-walk" data-lc96-walk></ol>'
      +'<div class="btn-row"><button type="button" class="btn btn-primary btn-sm" data-lc96="next">Walk me through it '+ic("arrow-right")+'</button><button type="button" class="btn btn-quiet btn-sm" data-lc96="close">Close</button></div></div></div></div>';
    board=Board(Q("[data-lc96-board]",host),{});
    const pm=p.prev&&/^[a-h][1-8][a-h][1-8]/.test(p.prev)?{from:p.prev.slice(0,2),to:p.prev.slice(2,4)}:null;
    board.orientation(p.side==="w"?"white":"black");board.setPosition(p.fen,{animate:false,lastMove:pm});board.setInteractive(p.side);board.setOnMove(onMove);
    try{host.scrollIntoView({behavior:"smooth",block:"start"})}catch(x){}
  }
  function fb(v,label,text){const el=Q("[data-lc96-fb]",view);if(el)el.innerHTML=label?'<div class="lc96-msg is-'+v+'"><b>'+E(label)+"</b> "+E(text||"")+"</div>":""}
  function onMove(m){
    const p=X.p;if(!p||X.solved)return;const g=new Chess(p.fen),mv=g.move({from:m.from,to:m.to,promotion:m.promotion||"q"});
    const pm=p.prev?{from:p.prev.slice(0,2),to:p.prev.slice(2,4)}:null;
    if(!mv){board.setPosition(p.fen,{animate:false,lastMove:pm});return}
    const t=(p.solution&&p.solution[0])||p.best||p.played,u=mv.from+mv.to+(mv.promotion||"");
    if(u===t||u.slice(0,4)===String(t).slice(0,4)&&!mv.promotion){X.solved=true;board.setInteractive(null);fb("good","That’s my move.","Now walk through how I found it.");return}
    board.setInteractive(null);fb("hint","Checking…","");
    let done=false;const fin=r=>{if(done)return;done=true;
      if(r&&(r.tier==="full"||r.tier==="mostly")){fb("alt",r.label||"Also good",(r.text?r.text+" ":"")+"I played another move. Walk through it to see mine.");board.setPosition(p.fen,{animate:false,lastMove:pm});return}
      fb("off","Not this one.","Run the four steps with me: tap Walk me through it.");setTimeout(()=>{board.setPosition(p.fen,{animate:false,lastMove:pm});board.setInteractive(p.side)},700)};
    try{const pr=LC25&&LC25.alt&&LC25.alt.check?LC25.alt.check({fen:p.fen,from:mv.from,to:mv.to,promotion:mv.promotion||"",san:mv.san}):null;if(pr&&pr.then){pr.then(fin,()=>fin(null));setTimeout(()=>fin(null),9000)}else fin(null)}catch(x){fin(null)}
  }
  function boardFacts(k){
    const p=X.p;if(!p)return"";const pm=p.prev?{from:p.prev.slice(0,2),to:p.prev.slice(2,4)}:null;
    try{return LC93.html(k,{fen:p.fen,lastMove:pm,side:p.side,ucis:k==="P"?[]:p.solution})}catch(e){return""}
  }
  function nextStep(){
    const e=D.cfg.examples[X.i],p=X.p,w=Q("[data-lc96-walk]",view);if(!e||!p||!w)return;
    X.step++;
    if(X.step<STEPS.length){const k=STEPS[X.step],l=letter(k),s=e[k];
      w.insertAdjacentHTML("beforeend",'<li class="lc96-wk"><p class="lc96-k">'+k+" · "+E(l.name)+"</p>"+(s.t?textBlock("ex-"+e.id+"-"+k,s,""):"")+boardFacts(k)+"</li>");
      if(k==="P"){const sl=sans(p.fen,p.solution,1)[0];if(sl&&s.t==="")w.lastChild.insertAdjacentHTML("beforeend",'<p class="small muted">Which of these is the move? Calculate each one against their best answer.</p>')}
      const b=Q('[data-lc96="next"]',view);if(b)b.innerHTML=X.step===STEPS.length-1?"Show my move "+ic("arrow-right"):"Next step "+ic("arrow-right");
      return}
    const line=sans(p.fen,(p.solution&&p.solution.length?p.solution:[p.best]).concat([]),5);
    let facts="";try{const sf=LC83.solutionFacts(p.fen,p.solution&&p.solution.length?p.solution:[p.best],p.side);facts=sf&&sf.text||""}catch(x){}
    w.insertAdjacentHTML("beforeend",'<li class="lc96-wk is-move"><p class="lc96-k">My move: '+E(p.played_san||line[0]||"")+"</p>"+textBlock("ex-"+e.id+"-move",e.move,facts)+(line.length>1?'<p class="small muted">The line: '+E(numbered(p.fen,line))+"</p>":"")+(p.game_id?'<p class="small"><a href="https://www.chess.com/game/live/'+encodeURIComponent(p.game_id)+'" target="_blank" rel="noopener">The whole game '+ic("arrow-up-right-from-square")+"</a></p>":"")+"</li>");
    const g=new Chess(p.fen);let k=0;const ucis=(p.solution||[]).slice(0,4);const st=()=>{if(k>=ucis.length||!board)return;const u=ucis[k++];const mv=g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||"q"});if(!mv)return;board.setPosition(g.fen(),{animate:true,lastMove:{from:mv.from,to:mv.to}});if(k<ucis.length)setTimeout(st,800)};st();
    X.solved=true;board.setInteractive(null);
    const b=Q('[data-lc96="next"]',view);if(b)b.hidden=true;
    try{FeatureChecklist.mark("learn-mspc")}catch(x){}
  }

  /* ---------- owner: edit, write, save ---------- */
  function collect(){
    const c=D.cfg;
    QA("[data-lc96-t]",view).forEach(t=>{set(t.getAttribute("data-lc96-t"),"t",t.value.trim())});
    QA("[data-lc96-a]",view).forEach(t=>{set(t.getAttribute("data-lc96-a"),"a",t.value.trim())});
    QA("[data-lc96-pick]",view).forEach(s=>{const i=+s.getAttribute("data-lc96-pick");if(c.examples[i])c.examples[i].id=s.value});
    QA("[data-lc96-title]",view).forEach(s=>{const i=+s.getAttribute("data-lc96-title");if(c.examples[i])c.examples[i].title=s.value.trim().slice(0,90)});
  }
  function set(key,f,val){
    const c=D.cfg;let s=null;
    if(key==="intro"||key==="use"||key==="you")s=c[key];
    else if(/^step-[MSPC]$/.test(key))s=c.steps[key.slice(5)];
    else{const m=/^ex-([A-Za-z0-9_-]+)-(intro|move|M|S|P|C)$/.exec(key);if(m){const e=c.examples.filter(x=>x.id===m[1])[0];if(e)s=e[m[2]]}}
    if(s)s[f]=f==="a"&&val&&!HTTPS.test(val)?"":val;
  }
  function writeSheet(i){
    collect();const e=D.cfg.examples[i];if(!e)return;const p=D.byId[e.id];
    const field=(k,label,ph)=>'<label class="field"><span class="field-label">'+E(label)+'</span><textarea class="input" rows="3" data-w="'+k+'" placeholder="'+E(ph)+'">'+E(e[k].t)+'</textarea><input class="input" data-wa="'+k+'" placeholder="Audio (optional): https://… .mp3" value="'+E(e[k].a)+'"></label>';
    try{openSheet({title:"My comments: "+(e.title||CATNAME[e.cat]),noFocus:true,html:'<p class="small muted">'+E(p?(p.side==="w"?"White":"Black")+" to move. I played "+(p.played_san||"?")+(p.my_rating?" at "+p.my_rating+" Elo":"")+".":"")+' Leave a step empty and the page shows what the board says.</p><form class="stack" data-lc96w>'
      +field("intro","Before the move","What the student should look at first.")+field("M","M: Move","What did their last move change?")+field("S","S: Specifics","What is this position about? Which plan?")+field("P","P: Priorities","Checks, captures, attacks: which ones?")+field("C","C: Calculation","How I checked the move against their best answer.")+field("move","The move","Why this move, and what it shows about MSPC.")
      +'<div class="btn-row"><button class="btn btn-primary" type="submit">Keep</button></div></form>',onMount(s){const f=Q("[data-lc96w]",s.el);f.addEventListener("submit",ev=>{ev.preventDefault();
        ["intro","M","S","P","C","move"].forEach(k=>{e[k].t=f.querySelector('[data-w="'+k+'"]').value.trim().slice(0,4000);const a=f.querySelector('[data-wa="'+k+'"]').value.trim();e[k].a=HTTPS.test(a)?a:""});
        s.close();say("Kept. Save & Publish to make it live.","good")})}})}catch(x){}
  }
  async function save(){
    collect();const v=JSON.parse(JSON.stringify(D.cfg));
    const r=await rpc("lc89_cfg_save",{p_k:"mspc",p_v:v},true);
    if(r&&r.data&&r.data.ok){say("Published: the MSPC System page is live.","good");D.edit=false;D.auto=false;paint();return}
    const err=r&&r.data&&(r.data.error||r.data.message)||"";
    say(/key|check constraint|23514/i.test(String(err))?"Run "+SQL+" in Supabase first, then save again.":r&&r.status===401?"Sign in with the owner account.":"Could not publish: "+String(err||r&&r.status||"no answer").slice(0,120),"bad",8000);
  }
  function onClick(e){
    if(!view||!view.isConnected)return;
    const play=e.target.closest&&e.target.closest("[data-lc96-play]");
    if(play&&view.contains(play)){try{if(D.player)D.player.pause();D.player=new Audio(play.getAttribute("data-lc96-play"));D.player.play().catch(()=>say("This clip does not play here.","bad"))}catch(x){}return}
    const o=e.target.closest&&e.target.closest("[data-lc96-open]");if(o&&view.contains(o)){openEx(+o.getAttribute("data-lc96-open"));return}
    const b=e.target.closest&&e.target.closest("[data-lc96]");if(!b||!view.contains(b))return;
    const a=b.getAttribute("data-lc96");
    if(a==="next")return nextStep();
    if(a==="close"){const h=Q("[data-lc96-view]",view);if(h){h.hidden=true;h.innerHTML=""}D.cur=null;board=null;return}
    if(a==="edit"){D.edit=true;D.cur=null;paint();return}
    if(a==="draft"){collect();const c=D.cfg;let n=0;const fill=(o,t)=>{if(o&&!String(o.t||"").trim()){o.t=t;n++}};
      fill(c.intro,DRAFT.intro);fill(c.use,DRAFT.use);fill(c.you,DRAFT.you);["M","S","P","C"].forEach(L=>fill(c.steps[L],DRAFT[L]));
      paint();say(n?"Draft put in "+n+" empty field"+(n===1?"":"s")+". Read it, change it into your own words, then Save & Publish.":"Every field already has your text: nothing changed.","good");return}
    if(a==="cancel"){D.edit=false;D.cfg=clean(D.raw);if(!D.cfg.examples.length)D.cfg.examples=pickDefaults(D.cands,2);paint();return}
    if(a==="save")return save();
    if(a==="write")return writeSheet(+b.getAttribute("data-i"));
    if(a==="del"){collect();D.cfg.examples.splice(+b.getAttribute("data-i"),1);paint();return}
    if(a==="add"){collect();const cat=b.getAttribute("data-cat"),used=D.cfg.examples.map(x=>x.id),next=((D.cands&&D.cands[cat])||[]).filter(x=>used.indexOf(x.id)<0)[0];
      if(!next){say("No more positions of this kind in my games.","");return}
      D.cfg.examples.push({id:next.id,cat:cat,title:"",intro:slot(),move:slot(),M:slot(),S:slot(),P:slot(),C:slot()});paint();return}
  }
  function css(){
    if(Q("#lc96-css"))return;const s=document.createElement("style");s.id="lc96-css";
    s.textContent=".lc96{max-width:1100px;margin:0 auto;display:grid;gap:16px}.lc96 h1{margin:0}.lc96-tag{margin:0;color:#38bdf8;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase}"
      +".lc96-hd p{max-width:760px}.lc96-own{margin:8px 0}.lc96 .btn{min-height:44px}.lc96-fb{color:#cbd5e1}"
      +".lc96-steps{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}.lc96-step{background:#1e293b;border:1px solid rgba(148,163,184,.2);border-radius:16px;padding:14px}.lc96-step h2{margin:0 0 6px;font-size:18px}"
      +".lc96-k{margin:0;color:#38bdf8;font-weight:900;font-size:13px;letter-spacing:.06em}.lc96-step .lc96-k{font-size:26px;line-height:1}"
      +".lc96-sec h2,.lc96-exs h2{margin:0 0 6px}.lc96-cat h3{margin:14px 0 8px;font-size:16px}.lc96-cat h3 small{color:#94a3b8;font-weight:400}"
      +".lc96-grid{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}.lc96-ex{display:flex;flex-direction:column;gap:3px;text-align:left;padding:12px 14px;border-radius:14px;background:#1e293b;border:1px solid rgba(148,163,184,.2);color:inherit;cursor:pointer;min-height:44px}.lc96-ex small{color:#94a3b8}.lc96-ex span{color:#38bdf8;font-weight:700;font-size:13px;margin-top:4px}.lc96-ex.is-ed{cursor:default;gap:6px}"
      +".lc96-add{border:1px dashed rgba(56,189,248,.5);border-radius:14px;background:transparent;color:#38bdf8;min-height:44px;cursor:pointer}"
      +".lc96-run{display:grid;gap:14px;margin-top:10px}@media (min-width:900px){.lc96-run{grid-template-columns:minmax(0,520px) minmax(0,1fr);align-items:start}}.lc96-bd{width:100%;max-width:520px}"
      +".lc96-walk{list-style:none;margin:10px 0;padding:0;display:grid;gap:8px}.lc96-wk{padding:10px 12px;border-radius:12px;background:#0f172a;border:1px solid #334155}.lc96-wk.is-move{border-color:#22c55e}.lc96-wk p{margin:4px 0}"
      +".lc96-msg{margin:8px 0;padding:10px 12px;border-radius:12px;background:#0f172a;border:1px solid #334155}.lc96-msg.is-good{border-color:#22c55e}.lc96-msg.is-off{border-color:#f87171}.lc96-msg.is-alt{border-color:#38bdf8}.lc96-msg.is-hint{border-color:#fbbf24}"
      +".lc96-ed{display:grid;gap:6px;margin:6px 0}.lc96-play{margin:4px 0}.lc96-cta{text-align:center;display:grid;gap:8px;justify-items:center}.lc96-cta h2{margin:0}";
    document.head.appendChild(s);
  }
  function init(){
    try{
      if(typeof MOUNT!=="undefined"){MOUNT[ROUTE]=mount;try{DOC_TITLES[ROUTE]="The MSPC System";ROUTE_TITLES[ROUTE]="the MSPC System page"}catch(e){}}
      try{const lv=LC26.levels,o=lv.minLevel;if(lv&&!lv.__lc96){lv.__lc96=1;lv.minLevel=r=>r===ROUTE?1:o(r)}}catch(e){}
      try{const G=Nav5._t.GROUPS.filter(g=>g.id==="3t")[0],think=G&&G.sections[0].items;
        if(think){for(let i=think.length-1;i>=0;i--)if(think[i].href==="#kgames")think.splice(i,1);
          const t=think.filter(x=>x.href==="#think")[0];if(t){t.label="MSPC trainer";t.note="Find the moves I found in my own games, with MSPC"}
          if(!think.some(x=>x.href==="#"+ROUTE))think.unshift({href:"#"+ROUTE,icon:"book-open-reader",label:"MSPC System",note:"How I find the right move, with examples from my games"})}}catch(e){}
      document.addEventListener("click",onClick);
    }catch(e){console.error("lc96",e)}
  }
  return{init:init,mount:mount,version:VERSION,_t:{fnv:fnv,clean:clean,catOf:catOf,pickDefaults:pickDefaults,numbered:numbered,sans:sans,letter:letter,state:()=>D,ex:()=>X,openEx:openEx,next:nextStep,play:u=>onMove({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]})}};
})(); /*@@end lc96*/
