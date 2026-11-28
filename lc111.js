/*@@module lc111*/
const LC111=(()=>{
  "use strict";
  /* LC111 (build 9.83.0): Kyenzo's model games in the opening trainer, and the trial hold on the deepest levels.
     1. Model games: a fourth mode in the chapter trainer, between Drill and Explore (Learn | Drill | Model games | Explore). It lists
        Kyenzo's own WON games in that chapter: he played the course's side, the game follows the chapter's path to the end, and when several
        chapters fit, the most specific one (longest path) gets the game. The data is data/model-games.json (tools/model_games.py: his ~5,100
        analysed games on the branch master-data, wins only, at most 12 per chapter, deepest in the course line first). The game you are
        training comes first ("Your line": the game played the current line as far as the course goes). A game replays on its own board in
        the same place as the trainer (the trainer is out of the way while it shows (#op-body.lc111-on), never pushed away); the moves of the course are marked,
        and the move where the game leaves the course says what the course plays there. Free: the first moves of every game (the course line and
        4 half-moves past it, 10 to 20 half-moves, from the JSON); Pro / VIP / the trial: the whole game (mg_game_moves, moves only, no names), LC90's pop-up for
        free players. Clicking Learn, Drill or Explore closes it and the trainer goes on where it was.
     2. The opening chip of LC100 ("Kyenzo reached this position …") no longer shows in the trainer (it sat under the board and squeezed it,
        and it counted his games with both colours); the Model games tab replaces it.
     3. Trial hold: during the free Pro trial (LC97: sub_status trialing / trial_cancelled) the opening levels above `trialMax` (default 3, so
        Level 4 Advanced and Level 5 Master) stay locked until the first payment; the gate says so, with the date the trial turns into Pro.
        Levels.open asks window.__lcAccess.trialHold(level, item); only course lines of the opening trees (items with a `tree`) are held, a
        level unlocked earlier with credits stays open, the owner is never held. These rules only stop the APP: content.json is public in
        the repository.
     Owner: in the Model games panel, "Owner": show the tab, the highest level the trial opens; saved in v5.lc111 (publish to make it live).
     No server, no AI. Suite: python tests/run.py lc111. */
  const VERSION="9.83.0",URL_="data/model-games.json?v="+VERSION;
  const D=document,Q=(s,r)=>(r||D).querySelector(s),QA=(s,r)=>Array.from((r||D).querySelectorAll(s));
  const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ic=n=>{try{return icon(n)}catch(e){return""}};
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const route=()=>{let h="";try{h=decodeURIComponent(String(location.hash||"").replace(/^#/,""))}catch(e){h=""}return h.toLowerCase().split(/[\/?&]/)[0]};
  const owner=()=>{try{return !!(LC49.owner()||Admin.active)}catch(e){return false}};
  const DEF={on:true,trialMax:3};
  function cleanCfg(x){
    const o={};if(!x||typeof x!=="object"||Array.isArray(x))return o;
    if(typeof x.on==="boolean")o.on=x.on;
    if(x.trialMax!==""&&x.trialMax!=null&&Number.isFinite(+x.trialMax))o.trialMax=Math.max(1,Math.min(5,Math.round(+x.trialMax)));
    return o;
  }
  function cfg(){let v={};try{v=(V5Doc.get()||{}).lc111||{}}catch(e){v={}}return Object.assign({},DEF,cleanCfg(v))}

  /* ---------- who sees what ---------- */
  function full(){
    try{if(Admin.active&&Admin.preview&&Admin.preview())return Admin.preview()!=="free"}catch(e){}
    try{if(typeof App.isPro==="function")return !!App.isPro()}catch(e){}
    try{return String(App.access&&App.access.tier||"free")!=="free"}catch(e){return false}
  }
  function trial(){try{return typeof LC97!=="undefined"&&LC97.trialing?LC97.trialing():null}catch(e){return null}}
  /* pure: is level k of this item held back for a member in the trial? */
  function holds(k,it,o){
    o=o||{};if(!o.trial||o.owner)return false;
    if(!it||!(it.tree||o.tree))return false;                          /* only the opening trees (a line, or a level's lead item) */
    if(it.id&&Array.isArray(o.unlocks)&&o.unlocks.indexOf(it.id)>=0)return false;
    return (+k||1)>(+o.max||3);
  }
  function trialHold(k,it){
    const t=trial();if(!t)return false;
    let un=[];try{un=App.unlocks||[]}catch(e){un=[]}
    let tree=false;try{tree=!!(it&&it.topicId&&Trees.has(it.topicId))}catch(e){tree=false}
    return holds(k,it,{trial:true,owner:owner()&&!(Admin.preview&&Admin.preview()),unlocks:un,max:cfg().trialMax,tree:tree});
  }
  function trialGateHTML(k,it){
    if(!trialHold(k,it))return"";
    const t=trial()||{},max=cfg().trialMax;let end="";
    const upto=max+1<5?"Levels "+(max+1)+" to 5":"Level 5";
    try{if(t.ends_at)end=new Date(t.ends_at).toLocaleDateString("en-GB",{day:"numeric",month:"long"})}catch(e){end=""}
    const when=t.cancelled?" with a paid plan (your trial is cancelled, so it does not turn into Pro by itself)":" with your first payment"+(end?", when your trial turns into Pro on "+E(end):"");
    return'<div class="lc111-hold"><p>'+ic("hourglass-half")+" <b>Your trial opens Levels 1 to "+max+".</b></p><p class=\"small\">"+upto
      +(max+1<5?" open":" opens")+when+". Everything else in Pro is yours right now: train these lines to the end of Level "+max+" first.</p>"
      +'<div class="btn-row"><a class="btn btn-ghost btn-sm" href="#upgrades">'+ic("crown")+" My membership</a></div></div>";
  }

  /* ---------- the data ---------- */
  let DATA=null,LOADING=null;
  function load(){
    if(DATA)return Promise.resolve(DATA);
    if(!LOADING)LOADING=fetch(URL_,{cache:"no-cache"}).then(r=>r.ok?r.json():null).then(d=>{DATA=d&&d.chapters&&typeof d.chapters==="object"?d:{chapters:{}};return DATA}).catch(()=>{LOADING=null;return{chapters:{}}});
    return LOADING;
  }
  const clean=s=>String(s||"").replace(/[+#!?]/g,"").trim();
  /* pure: how many half-moves two move lists share from the start */
  function common(a,b){a=a||[];b=b||[];let k=0;while(k<a.length&&k<b.length&&clean(a[k])===clean(b[k]))k++;return k}
  /* pure: the games of a chapter, the current line first */
  function ordered(games,linePath){
    const lp=(linePath||[]).map(clean);
    return (games||[]).map((g,i)=>{const k=common(g.san,lp),need=Math.min(lp.length,+g.line||0,(g.san||[]).length);return{g:g,i:i,k:k,mine:lp.length>0&&k>0&&k>=need}})
      .sort((x,y)=>(y.mine-x.mine)||(y.k-x.k)||(x.i-y.i)).map(x=>Object.assign({},x.g,{mine:x.mine}));
  }
  const END={mate:"won by checkmate",resignation:"opponent resigned",time:"won on time",abandoned:"opponent left",win:"won"};
  function metaOf(g){
    const tc=g.tc?g.tc[0].toUpperCase()+g.tc.slice(1):"";let d="";
    try{if(g.end_time)d=new Date(g.end_time*1000).toLocaleDateString("en-GB",{month:"short",year:"numeric"})}catch(e){d=""}
    return[tc,g.me?"Kyenzo "+g.me:"",g.opp?"opponent "+g.opp:"",END[g.end]||"won",g.acc?Math.round(g.acc)+"% accuracy":"",d].filter(Boolean).join(" · ");
  }
  const moveNo=(i)=>Math.floor(i/2)+1;
  const label=(i,san)=>moveNo(i)+(i%2===0?". ":"... ")+san;

  /* ---------- the current chapter in the trainer ---------- */
  function current(){
    let it=null;try{it=Trees.line(App.ui.op.lineId)}catch(e){it=null}
    if(!it||!it.tree)return null;
    let info=null;try{info=Trees.info(it.tree)}catch(e){info=null}
    return{id:it.tree,title:info&&info.title||it.topic||"",side:info&&info.side||it.side||"w",path:String(it.treePath||"").split(" ").filter(Boolean),info:info};
  }
  function courseAt(info,sans){
    try{const n=info&&(sans.length?info.idx[sans.map(clean).join(" ")]:info.root);return n&&n.kids?n.kids.map(k=>clean(k.san)).filter(Boolean).slice(0,3):[]}catch(e){return[]}
  }

  /* ---------- the panel ---------- */
  const S={open:false,ch:null,list:[],gi:0,fens:[],sans:[],at:0,board:null,full:false,loading:false,token:0};
  function bar(){const b=Q("#op-body .tt40-bar");return b&&Q('.seg[aria-label="Mode"]',b)?b:null}
  function ensureButton(){
    const b=bar();if(!b||!cfg().on)return;
    const seg=Q('.seg[aria-label="Mode"]',b);
    const ch=current();
    load().then(d=>{
      const games=ch&&d.chapters[ch.id]||[];let btn=Q("[data-lc111-mg]",seg);
      if(!games.length){if(btn)btn.remove();if(S.open)close();return}
      if(!btn){btn=D.createElement("button");btn.type="button";btn.setAttribute("data-lc111-mg","");
        const dr=Q('[data-mode="drill"]',seg);if(dr)dr.insertAdjacentElement("afterend",btn);else seg.appendChild(btn)}
      const h=ic("chess-king")+' Model games <span class="chip-n">'+games.length+"</span>";
      if(btn.getAttribute("data-lc111-n")!==String(games.length)){btn.innerHTML=h;btn.setAttribute("data-lc111-n",String(games.length))}
      if(btn.getAttribute("aria-pressed")!==String(S.open))btn.setAttribute("aria-pressed",String(S.open));
      if(S.open&&S.ch&&ch&&S.ch.id!==ch.id)openPanel();
    });
  }
  function close(){
    S.open=false;S.token++;
    try{if(S.board)S.board.destroy()}catch(e){}S.board=null;
    const p=Q("[data-lc111-panel]");if(p)p.remove();
    const body=Q("#op-body");if(body)body.classList.remove("lc111-on");
    const btn=Q("[data-lc111-mg]");if(btn)btn.setAttribute("aria-pressed","false");
  }
  async function openPanel(){
    const body=Q("#op-body"),b=bar();if(!body||!b)return;
    const ch=current();if(!ch)return;
    const d=await load(),games=d.chapters[ch.id]||[];if(!games.length)return;
    if(S.board){try{S.board.destroy()}catch(e){}S.board=null}
    const old=Q("[data-lc111-panel]");if(old)old.remove();
    S.open=true;S.ch=ch;S.list=ordered(games,ch.path);S.gi=0;S.full=full();
    body.classList.add("lc111-on");
    QA('.seg[aria-label="Mode"] [data-mode]',b).forEach(x=>x.setAttribute("aria-pressed","false"));
    const btn=Q("[data-lc111-mg]",b);if(btn)btn.setAttribute("aria-pressed","true");
    const sec=D.createElement("section");sec.className="lc111";sec.setAttribute("data-lc111-panel","");sec.setAttribute("data-lc100-nochip","");
    sec.innerHTML=trainerShell("lc111-board","lc111-side");
    b.insertAdjacentElement("afterend",sec);
    S.board=Board(Q("#lc111-board",sec),{orientation:ch.side==="w"?"white":"black"});S.board.setInteractive(null);
    const fl=Q('[data-flip="lc111-board"]',sec);if(fl)fl.addEventListener("click",()=>S.board.flip());
    sec.addEventListener("click",onPanelClick);
    paintSide();pick(0);
    try{Telemetry.log({e:"lc111",x:"open",c:ch.id})}catch(e){}
  }
  function paintSide(){
    const side=Q("#lc111-side");if(!side)return;const ch=S.ch,g=S.list[S.gi];
    const card=(x,i)=>'<button type="button" class="lc111-g" data-lc111-g="'+i+'" aria-pressed="'+(i===S.gi)+'"><b>'+(x.mine?'<span class="lc111-mine">Your line</span> ':"")
      +E((x.me&&x.opp?x.me+" vs "+x.opp:"A win")+(x.end==="mate"?" · checkmate":""))+"</b><small>"+E(metaOf(x))+"</small><small>"+E("In the course for "+Math.ceil((+x.line||0)/2)+" moves"+(x.left?", then "+label(x.leftPly,x.left):""))+"</small></button>";
    side.innerHTML='<p class="st-kicker">'+ic("chess-king")+" Kyenzo’s model games</p><h2 class=\"st-title\">"+E(ch.title)+"</h2>"
      +'<p class="st-brief">Only my wins in this line, with '+(ch.side==="w"?"White":"Black")+", the side you play. Watch where the course ends and how I played on.</p>"
      +'<div data-lc111-game></div>'
      +'<div class="lc111-list" role="list">'+S.list.map(card).join("")+"</div>"
      +(owner()?ownerHTML():"");
  }
  function ownerHTML(){
    const c=cfg();
    return'<details class="lc111-own"><summary>'+ic("screwdriver-wrench")+" Owner</summary>"
      +'<label class="lc111-row"><input type="checkbox" data-lc111-own="on"'+(c.on?" checked":"")+"> Show the Model games tab</label>"
      +'<label class="lc111-row">The trial opens up to <select data-lc111-own="trialMax">'+[1,2,3,4,5].map(k=>'<option value="'+k+'"'+(k===c.trialMax?" selected":"")+">Level "+k+(k===5?" (no hold)":"")+"</option>").join("")+"</select></label>"
      +'<button type="button" class="btn btn-ghost btn-sm" data-lc111-own="save">Save</button><p class="small muted">Saved on this device; publish to make it live. Data: '+E(DATA&&DATA.built||"?")+", "+E(DATA&&DATA.games_used||0)+" wins matched.</p></details>";
  }
  async function pick(i){
    S.gi=Math.max(0,Math.min(S.list.length-1,i));const g=S.list[S.gi],tok=++S.token;
    QA("[data-lc111-g]").forEach(b=>b.setAttribute("aria-pressed",String(+b.getAttribute("data-lc111-g")===S.gi)));
    let sans=(g.san||[]).slice(),complete=false;
    paintGame(g,sans,false,true);
    if(S.full){
      try{
        const r=await LC26.sync.http("/rest/v1/rpc/mg_game_moves",{method:"POST",headers:{},body:JSON.stringify({p_id:String(g.id)})});
        const gm=r&&r.status===200&&r.data;if(tok!==S.token)return;
        if(gm&&gm.moves){const c=new Chess();let ok=false;try{ok=c.load_pgn(String(gm.moves),{sloppy:true})}catch(e){ok=false}
          if(ok){const h=c.history();if(h.length>=sans.length&&common(h,sans)===sans.length){sans=h;complete=true}}}
      }catch(e){}
      if(tok!==S.token)return;
    }
    paintGame(g,sans,complete,false);
  }
  function paintGame(g,sans,complete,loading){
    const host=Q("[data-lc111-game]");if(!host)return;
    const c=new Chess(),fens=[{fen:c.fen(),last:null}];const ok=[];
    for(const s of sans){const m=c.move(s,{sloppy:true});if(!m)break;ok.push(m.san);fens.push({fen:c.fen(),last:{from:m.from,to:m.to}})}
    S.fens=fens;S.sans=ok;const line=+g.line||0,cut=!complete&&!loading&&ok.length<(+g.plies||0);
    host.innerHTML='<div class="lc111-nav" role="group" aria-label="Moves">'
      +'<button type="button" class="btn btn-ghost btn-sm" data-lc111-n="first" aria-label="First move">'+ic("backward-fast")+'</button><button type="button" class="btn btn-ghost btn-sm" data-lc111-n="prev" aria-label="Previous move">'+ic("backward-step")+"</button>"
      +'<span data-lc111-at></span><button type="button" class="btn btn-ghost btn-sm" data-lc111-n="next" aria-label="Next move">'+ic("forward-step")+'</button><button type="button" class="btn btn-ghost btn-sm" data-lc111-n="last" aria-label="Last move">'+ic("forward-fast")+"</button></div>"
      +'<div class="lc111-moves">'+ok.map((s,i)=>(i%2===0?'<span class="lc111-no">'+moveNo(i)+".</span>":"")+'<button type="button" data-lc111-p="'+(i+1)+'" class="'+(i<line?"is-book":i===line?"is-out":"")+'">'+E(s)+"</button>").join(" ")
      +(loading&&S.full?' <span class="small muted">Loading the whole game…</span>':"")+"</div>"
      +'<p class="small muted lc111-key"><span class="is-book">Course moves</span> <span class="is-out">Left the course</span></p>'
      +'<p class="lc111-note" data-lc111-note></p>'
      +(cut?'<div class="lc111-lock">'+ic("lock")+" <span><b>The rest of this game is in Pro.</b> "+E(((+g.plies||0)-ok.length))+" more half-moves, to the win: the middlegame plan and how I converted it.</span>"
        +'<button type="button" class="btn btn-gold btn-sm" data-lc111-pro>'+ic("crown")+" See the whole game</button></div>":"");
    go(Math.min(ok.length,Math.max(line,0)));
  }
  function go(i){
    if(!S.board||!S.fens.length)return;S.at=Math.max(0,Math.min(S.fens.length-1,i));const f=S.fens[S.at];
    S.board.setPosition(f.fen,{animate:true,lastMove:f.last});
    const at=Q("[data-lc111-at]");if(at)at.textContent=S.at?"Move "+moveNo(S.at-1)+" of "+Math.ceil((S.fens.length-1)/2):"Start";
    QA(".lc111-moves button.is-on").forEach(b=>b.classList.remove("is-on"));const b=Q('[data-lc111-p="'+S.at+'"]');if(b){b.classList.add("is-on");try{b.scrollIntoView({block:"nearest",inline:"nearest"})}catch(x){}}
    const g=S.list[S.gi],line=+g.line||0,note=Q("[data-lc111-note]");if(!note)return;
    if(S.at>line&&S.sans[line]){
      const alt=courseAt(S.ch.info,S.sans.slice(0,line)).filter(x=>x!==clean(S.sans[line]));
      note.innerHTML=ic("signs-post")+" "+E("Here the game leaves the course: "+label(line,S.sans[line])+(alt.length?". The course plays "+alt.map(x=>label(line,x)).join(" or ")+" here.":"."));
    }else if(S.at>0&&S.at<=line)note.innerHTML=ic("book-open")+" "+E("Still in the course: "+label(S.at-1,S.sans[S.at-1])+".");
    else note.textContent="";
  }
  function onPanelClick(e){
    const g=e.target.closest("[data-lc111-g]");if(g){pick(+g.getAttribute("data-lc111-g"));return}
    const n=e.target.closest("[data-lc111-n]");if(n){const a=n.getAttribute("data-lc111-n");go(a==="first"?0:a==="prev"?S.at-1:a==="next"?S.at+1:S.fens.length-1);return}
    const p=e.target.closest("[data-lc111-p]");if(p){go(+p.getAttribute("data-lc111-p"));return}
    if(e.target.closest("[data-lc111-pro]")){try{if(typeof LC90!=="undefined"&&LC90.open){LC90.open({from:"model"});return}}catch(x){}location.hash="#upgrades";return}
    const o=e.target.closest('[data-lc111-own="save"]');if(o)saveOwner();
  }
  function saveOwner(){
    try{
      const next=cleanCfg({on:!!(Q('[data-lc111-own="on"]')||{}).checked,trialMax:+(Q('[data-lc111-own="trialMax"]')||{}).value});
      const d=Admin.ensureDraft(),v5=Object.assign({},d.v5||{});v5.lc111=next;d.v5=V5Doc.clean(v5);Admin.saveDraft(d);try{V5Doc.apply(d.v5)}catch(x){}
      say("Saved. Publish to make it live.","good");
    }catch(e){say("Could not save: "+(e&&e.message||e),"bad")}
  }
  function onDocClick(e){
    const mg=e.target.closest&&e.target.closest("[data-lc111-mg]");
    if(mg){e.preventDefault();if(S.open)return;openPanel();return}
    if(S.open&&e.target.closest&&e.target.closest('#op-body [data-mode],#op-body [data-act],#op-body [data-lv-go],#op-body [data-lv],#op-body .lv39 button')&&!e.target.closest("[data-lc111-panel]"))close();
  }
  function onKey(e){
    if(!S.open||e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName||""))return;
    if(e.key==="ArrowRight"){go(S.at+1);e.preventDefault()}else if(e.key==="ArrowLeft"){go(S.at-1);e.preventDefault()}
  }

  function css(){
    if(Q("#lc111-css"))return;const s=D.createElement("style");s.id="lc111-css";
    s.textContent=".lc111{margin-top:14px}.lc111-list{display:grid;gap:8px;margin-top:14px;max-height:340px;overflow:auto}"
      +".lc111-g{display:grid;gap:2px;text-align:left;padding:10px 12px;border-radius:10px;border:1px solid rgba(148,163,184,.2);background:#0f172a;color:inherit;cursor:pointer}"
      +".lc111-g[aria-pressed=true]{border-color:#38bdf8;box-shadow:0 0 0 1px #38bdf8 inset}.lc111-g small{color:#94a3b8}"
      +".lc111-mine{font-size:11px;padding:1px 6px;border-radius:999px;background:rgba(56,189,248,.15);color:#38bdf8;margin-right:4px}"
      +".lc111-nav{display:flex;align-items:center;gap:6px;margin:6px 0}.lc111-nav span{flex:1;text-align:center;font-size:13px;color:#94a3b8}"
      +".lc111-moves{display:flex;flex-wrap:wrap;gap:2px 4px;max-height:150px;overflow:auto;font-size:14px;line-height:1.7}"
      +".lc111-moves button{background:none;border:0;color:#cbd5e1;padding:0 3px;border-radius:4px;cursor:pointer}.lc111-moves button.is-on{background:#38bdf8;color:#0f172a}"
      +".lc111-moves .is-book,.lc111-key .is-book{color:#7dd3fc;font-weight:600}.lc111-moves .is-out,.lc111-key .is-out{color:#fbbf24;font-weight:600}.lc111-no{color:#64748b;font-size:12px}"
      +".lc111-key span{margin-right:12px}.lc111-note{min-height:1.4em;font-size:14px;margin:6px 0}"
      +".lc111-lock{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);font-size:14px}"
      +".lc111-own{margin-top:14px;font-size:14px}.lc111-row{display:flex;gap:8px;align-items:center;margin:8px 0}"
      +".lc111-hold{margin:10px 0;padding:12px 14px;border-radius:10px;background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.3)}"
      +"[data-lc111-mg] .chip-n{margin-left:4px}"
      /* while the model games show, the trainer (and the strip V6 puts above it) is out of the way, not squeezed */
      +"#op-body.lc111-on>:not(.back-bar):not(.lv39):not(.tt40-bar):not(.lc111){display:none!important}#op-body.lc111-on .tt40-scope{display:none!important}.lc111 .v6-strip{display:none!important}";
    D.head.appendChild(s);
  }

  /* ---------- wiring ---------- */
  let obs=0;
  function afterRender(r){
    r=r||route();css();
    if(r!=="openings"){if(S.open)close();return}
    setTimeout(ensureButton,50);
  }
  function init(){
    try{
      css();D.addEventListener("click",onDocClick,true);D.addEventListener("keydown",onKey);
      const A=window.__lcAccess||(window.__lcAccess={});A.trialHold=trialHold;A.trialGateHTML=trialGateHTML;
      new MutationObserver(()=>{if(obs||route()!=="openings")return;obs=setTimeout(()=>{obs=0;if(bar()&&(!Q("[data-lc111-mg]")||S.open))ensureButton();if(S.open&&!Q("[data-lc111-panel]"))close()},250)}).observe(D.body,{childList:true,subtree:true});
      if(route()==="openings")load();
    }catch(e){console.error("lc111",e)}
  }
  return{init:init,afterRender:afterRender,version:VERSION,load:load,open:openPanel,close:close,trialHold:trialHold,cleanCfg:cleanCfg,
    _t:{common:common,ordered:ordered,holds:holds,metaOf:metaOf,cfg:cfg,S:S,current:current,courseAt:courseAt,trialGateHTML:trialGateHTML}};
})(); /*@@end lc111*/
