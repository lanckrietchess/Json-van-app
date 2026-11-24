/*@@module lc100*/
const LC100=(()=>{
  "use strict";
  /* LC100 (build 9.65.0): Kyenzo's real games across Theory, Trim and Ranked, the students' game opt-in and the community auto-join.
     1. Theory > Openings: a chip under the board says how often Kyenzo reached the position in his own rated games, his score from there and
        what was played next, with one of those games to replay ("See one of his games"). The index is master/data/positions.json on the
        branch master-data (tools/master_positions.py, written by the workflow "Kyenzo's Games (analysis)"), loaded once and kept in the
        browser's Cache Storage for a week. The Board tells the page its position with a bubbling "lc-fen" event (Board.setPosition).
        Middlegame / Endgame: a card with his positions of that phase, opened in the MSPC trainer (LC95, sessionStorage lc95-open {phase}).
        The courses themselves stay 100% Kyenzo's ChessTempo exports: nothing here changes content.json.
     2. Trim > "Kyenzo's Gems" (#kgems): his brilliant moves, his only moves, his most accurate wins and his biggest upsets (mg_gems), each
        position playable in the MSPC trainer (lc95-open {ids}) and each game replayable here (mg_game_moves: the moves, never the names).
     3. Ranked: one rated puzzle in four comes from Kyenzo's own games (his brilliant / only / punishing moves, one move to find), rated by
        the level he played at; the pool is fetched once a day and kept on the device (lc100-kp), so the Ranked feed stays fast.
     4. Paying members (not during the free trial) may share their own Chess.com / Lichess games for Kyenzo's analysis: an unticked box on
        Account, revocable at any time (the names are wiped); the owner list on #contrib (owner menu) to ingest or remove.
     5. Every account joins the main community (a trigger on auth.users); the app calls lc100_join_main once per account as a safety net.
     SQL: sql/20261123100000_lc100_withdraw_games_community.sql. Free players cause no AI calls here: everything is stored Stockfish data. */
  const VERSION="9.65.0",SQLF="sql/20261123100000_lc100_withdraw_games_community.sql";
  const POS_URLS=["https://cdn.jsdelivr.net/gh/lanckrietchess/Json-van-app@master-data/master/data/positions.json",
    "https://raw.githubusercontent.com/lanckrietchess/Json-van-app/master-data/master/data/positions.json"];
  const GOOD=["brilliant","great","punish"],CONTRIB_V="c1-2026-11-23";
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.prototype.slice.call((r||document).querySelectorAll(s));
  const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const ic=n=>{try{return icon(n)}catch(e){return""}};
  const route=()=>{let h="";try{h=decodeURIComponent(String(location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){h=""}return h.split(/[\/?&]/)[0]};
  const owner=()=>{try{return !!(LC49.owner()||Admin.active)}catch(e){return false}};
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const store={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  function pro(){
    try{if(Admin.active&&Admin.preview&&Admin.preview())return Admin.preview()!=="free"}catch(e){}
    try{if(typeof App.isPro==="function")return !!App.isPro()}catch(e){}
    try{return String(App.access&&App.access.tier||"free")!=="free"}catch(e){return false}
  }
  async function rpc(fn,args,auth){
    try{const h={};if(auth){const t=await LC26.sync.token();if(!t)return{status:401,data:null};h.Authorization="Bearer "+t}
      return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:h,body:JSON.stringify(args||{})})}catch(e){return{status:0,data:null}}
  }
  const missing=r=>!!(r&&(r.status===404||(r.data&&/PGRST202|does not exist|42883|42P01/i.test(String(r.data.code||"")+String(r.data.message||"")))));
  const today=()=>new Date().toISOString().slice(0,10);
  const dayTxt=t=>{try{return new Date(t).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}catch(e){return""}};
  const uciMove=u=>(u=String(u||""),/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u)?{from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||undefined}:null);
  const TIERMID={"0-799":700,"800-1199":1000,"1200-1599":1400,"1600-1999":1800,"2000+":2100};
  const KIND={brilliant:"Brilliant move",great:"The only move",punish:"Punished a blunder"};

  /* ---------- pure (tested) ---------- */
  function fnv(s){let h=0x811c9dc5;s=unescape(encodeURIComponent(String(s)));for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return("0000000"+h.toString(16)).slice(-8)}
  const keyOf=fen=>fnv(String(fen||"").split(" ").slice(0,3).join(" "));
  const START_KEY=keyOf("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  function chipText(e){
    if(!e||!(e[0]>=2))return null;
    const n=e[0],w=e[1],d=e[2],l=e[3],score=Math.round((w+d/2)/n*100),next=(e[5]||[]).filter(x=>x&&x[0]).slice(0,3);
    return{head:"Kyenzo reached this position "+n+" times",line:w+" won · "+d+" drawn · "+l+" lost ("+score+"% score)",next:next.length?"Next in his games: "+next.map(x=>x[0]+" ("+x[1]+"×)").join(", "):"",games:(e[4]||[]).slice(0,3)};
  }
  function ratingOf(p){const base=TIERMID[p.tier]||1300,b=p.kind==="brilliant"?300:p.kind==="great"?150:0;return Math.max(600,Math.min(2600,base+b))}
  /* a stored position as a Ranked puzzle: the opponent's last move, then Kyenzo's one move to find */
  function toPuzzle(p){
    try{
      if(!p||GOOD.indexOf(p.kind)<0||!p.prev_fen||!p.prev)return null;
      const g=new Chess(p.prev_fen),m=uciMove(p.prev);if(!m)return null;const mv=g.move({from:m.from,to:m.to,promotion:m.promotion||"q"});if(!mv)return null;
      if(g.fen().split(" ")[0]!==String(p.fen||"").split(" ")[0])return null;
      const first=(Array.isArray(p.solution)&&p.solution[0])||p.best;if(!uciMove(first))return null;
      const t=new Chess(p.fen),fm=uciMove(first);if(!t.move({from:fm.from,to:fm.to,promotion:fm.promotion||"q"}))return null;
      const tags=(p.tags||[]).filter(x=>typeof x==="string").slice(0,4);
      return{id:"kg-"+p.id,source:"kyenzo",rating:ratingOf(p),plays:0,themes:tags,before:p.prev_fen,setup:{from:mv.from,to:mv.to,san:mv.san},fen:p.fen,solution:[first],
        game:{id:String(p.game_id||"").slice(0,20),perf:"",label:(KIND[p.kind]||"His move")+(p.tier?", at "+p.tier+" Elo":"")},url:/^\d{5,20}$/.test(String(p.game_id||""))?"https://www.chess.com/game/live/"+p.game_id:""};
    }catch(e){return null}
  }
  function pickFrom(list,target,seen){
    let best=null,d=Infinity;(list||[]).forEach(x=>{if(!x||seen&&seen(x.id))return;const k=Math.abs(x.rating-target);if(k<d){d=k;best=x}});
    return best&&d<=400?best:null;
  }

  /* ---------- 1. the opening positions index ---------- */
  let POS=null,posP=null;
  async function positions(){
    if(POS)return POS;if(posP)return posP;
    posP=(async()=>{
      const fresh=+store.get("lc100-pos-at",0)>Date.now()-7*864e5;let cache=null;
      try{if(typeof caches!=="undefined")cache=await caches.open("lc100-pos")}catch(e){cache=null}
      if(cache&&fresh){try{const r=await cache.match(POS_URLS[0]);if(r){const j=await r.json();if(j&&j.pos){POS=j;return POS}}}catch(e){}}
      for(const u of POS_URLS){
        try{const r=await fetch(u,{cache:"no-cache"});if(!r.ok)continue;const copy=r.clone(),j=await r.json();if(!j||typeof j.pos!=="object")continue;
          POS=j;try{if(cache){await cache.put(POS_URLS[0],copy);store.set("lc100-pos-at",Date.now())}}catch(e){}return POS}catch(e){}
      }
      if(cache){try{const r=await cache.match(POS_URLS[0]);if(r){POS=await r.json();return POS}}catch(e){}}
      POS={pos:{},missing:true};return POS;
    })();
    try{return await posP}finally{posP=null}
  }
  const chipTimers=new WeakMap();
  function onFen(ev){
    const host=ev.target;if(!host||!host.closest||route()!=="openings"||host.closest(".sheet")||host.closest("[data-lc100-nochip]"))return;
    clearTimeout(chipTimers.get(host));chipTimers.set(host,setTimeout(()=>paintChip(host,ev.detail&&ev.detail.fen),180));
  }
  async function paintChip(host,fen){
    if(!fen||!document.body.contains(host))return;
    let chip=host.nextElementSibling&&host.nextElementSibling.hasAttribute&&host.nextElementSibling.hasAttribute("data-lc100-chip")?host.nextElementSibling:null;
    const k=keyOf(fen);if(k===START_KEY){if(chip)chip.hidden=true;return}
    const P=await positions();if(!document.body.contains(host)||host.getAttribute("data-fen")!==fen)return;
    const t=chipText(P&&P.pos&&P.pos[k]);
    if(!t){if(chip)chip.hidden=true;return}
    if(!chip){chip=document.createElement("div");chip.className="lc100-chip";chip.setAttribute("data-lc100-chip","");host.insertAdjacentElement("afterend",chip)}
    chip.hidden=false;
    chip.innerHTML='<p><b>'+ic("chess-king")+" "+E(t.head)+'</b> <span>'+E(t.line)+"</span></p>"+(t.next?'<p class="small">'+E(t.next)+"</p>":"")
      +(t.games.length?'<button type="button" class="btn btn-quiet btn-sm" data-lc100-game="'+E(t.games[0])+'" data-lc100-key="'+E(k)+'">'+ic("play")+" See one of his games</button>":"");
  }

  /* ---------- 2. a game, replayed (moves only, no names) ---------- */
  async function openGame(id,o){
    o=o||{};if(typeof openSheet!=="function")return;
    const r=await rpc("mg_game_moves",{p_id:String(id)});
    if(missing(r)){say(owner()?"Run "+SQLF+" first.":"Kyenzo's games are being prepared. Check back soon.");return}
    const gm=r&&r.data;if(!gm||!gm.moves){say("This game could not be loaded.","bad");return}
    const g=new Chess();let okp=false;try{okp=g.load_pgn(String(gm.moves),{sloppy:true})}catch(e){okp=false}
    if(!okp){say("This game could not be read.","bad");return}
    const hist=g.history({verbose:true}),c=new Chess(),fens=[{fen:c.fen(),last:null,san:""}];
    hist.forEach(m=>{c.move(m);fens.push({fen:c.fen(),last:{from:m.from,to:m.to},san:m.san})});
    let at=0;if(o.key){for(let i=1;i<fens.length;i++){if(keyOf(fens[i].fen)===o.key){at=i;break}}}else if(o.ply>0)at=Math.min(o.ply,fens.length-1);
    const meta=[gm.time_class?gm.time_class[0].toUpperCase()+gm.time_class.slice(1):"",gm.my_rating?"Kyenzo "+gm.my_rating:"",gm.opp_rating?"opponent "+gm.opp_rating:"",gm.result==="win"?"won":gm.result==="draw"?"draw":gm.result==="loss"?"lost":"",gm.acc_me?gm.acc_me+"% accuracy":"",dayTxt(gm.end_time)].filter(Boolean).join(" · ");
    let board=null;
    openSheet({title:(gm.opening||"Kyenzo’s game").slice(0,80),cls:"lc100-sheet",noFocus:true,onClose(){try{board&&board.destroy()}catch(e){}},
      html:'<div class="lc100-gm"><p class="small muted">'+E(meta)+'</p><div class="lc100-gbd" data-lc100-nochip><div data-lc100-gboard></div></div>'
        +'<div class="lc100-gnav" role="group" aria-label="Moves"><button type="button" class="btn btn-ghost btn-sm" data-lc100-n="first" aria-label="First move">'+ic("backward-fast")+'</button><button type="button" class="btn btn-ghost btn-sm" data-lc100-n="prev" aria-label="Previous move">'+ic("backward-step")+'</button><span data-lc100-ply></span><button type="button" class="btn btn-ghost btn-sm" data-lc100-n="next" aria-label="Next move">'+ic("forward-step")+'</button><button type="button" class="btn btn-ghost btn-sm" data-lc100-n="last" aria-label="Last move">'+ic("forward-fast")+"</button></div>"
        +'<div class="lc100-moves" data-lc100-moves></div>'+(gm.url&&/^https:\/\/www\.chess\.com\//.test(gm.url)?'<p class="small"><a href="'+E(gm.url)+'" target="_blank" rel="noopener noreferrer">'+ic("arrow-up-right-from-square")+" Open on Chess.com</a></p>":"")+"</div>",
      onMount(sh){
        const el=sh.el;board=Board(Q("[data-lc100-gboard]",el),{});board.orientation(gm.color==="b"?"black":"white");board.setInteractive(null);
        const mv=Q("[data-lc100-moves]",el);
        mv.innerHTML=fens.slice(1).map((f,i)=>(i%2===0?'<span class="lc100-no">'+(i/2+1)+".</span>":"")+'<button type="button" data-lc100-ply="'+(i+1)+'">'+E(f.san)+"</button>").join(" ");
        const go=i=>{at=Math.max(0,Math.min(fens.length-1,i));const f=fens[at];board.setPosition(f.fen,{animate:true,lastMove:f.last});
          const pl=Q("[data-lc100-ply]",el);if(pl)pl.textContent=at?"Move "+Math.ceil(at/2)+" of "+Math.ceil((fens.length-1)/2):"Start";
          QA("[data-lc100-ply].is-on",mv).forEach(b=>b.classList.remove("is-on"));const b=Q('[data-lc100-ply="'+at+'"]',mv);if(b){b.classList.add("is-on");try{b.scrollIntoView({block:"nearest"})}catch(x){}}};
        el.addEventListener("click",e=>{const b=e.target.closest("[data-lc100-n],button[data-lc100-ply]");if(!b)return;
          const n=b.getAttribute("data-lc100-n");if(n)go(n==="first"?0:n==="prev"?at-1:n==="next"?at+1:fens.length-1);else go(+b.getAttribute("data-lc100-ply"))});
        setTimeout(()=>{try{board.resize&&board.resize()}catch(e){}go(at)},60);
      }});
    try{Telemetry.log({e:"lc100",x:"game"})}catch(e){}
  }

  /* ---------- 3. Middlegame / Endgame: his positions of that phase ---------- */
  async function phaseCard(r){
    const v=Q("#view");if(!v||Q("[data-lc100-phase]",v))return;
    const head=Q("#theory-head",v);if(!head)return;
    const res=await rpc("mg_puzzles",{p_kinds:GOOD,p_tier:null,p_phase:r,p_eco:null,p_limit:3,p_offset:0,p_seed:today()+"card"+r});
    const l=res&&Array.isArray(res.data)?res.data:[];if(!l.length||route()!==r||Q("[data-lc100-phase]",v))return;
    head.insertAdjacentHTML("afterend",'<a class="lc100-card" data-lc100-phase href="#think" data-lc100-intent=\''+E(JSON.stringify({phase:r}))+'\'><span class="lc100-ic">'+ic(r==="endgame"?"chess-pawn":"chess-knight")+'</span><span><b>From my own games: '+E(r)+" positions I solved</b><small>"+E(l.map(x=>(KIND[x.kind]||"Position")+(x.tier?" at "+x.tier:"")).join(" · "))+'. Run MSPC, then find my move.</small></span><span class="btn btn-primary btn-sm">Train them</span></a>');
  }

  /* ---------- 4. Kyenzo's Gems (#kgems) ---------- */
  const TABS=[["brilliant","Brilliant moves"],["great","Only moves"],["accuracy","Most accurate games"],["upsets","Biggest upsets"]];
  const G={tab:"brilliant",cache:{}};
  async function mountGems(view){
    css();
    view.innerHTML='<section class="lc100"><p class="lc100-tag">Trim · Hall of Fame</p><h1>Kyenzo’s Gems</h1><p class="muted">The best moments from my own rated games on the climb from 304 to 2105: the brilliant moves, the only moves that held, my most accurate wins and my biggest upsets. Play a position yourself, or replay the whole game.</p>'
      +'<div class="seg lc100-tabs" role="tablist">'+TABS.map(t=>'<button type="button" role="tab" data-lc100-tab="'+t[0]+'" aria-pressed="'+(G.tab===t[0])+'">'+t[1]+"</button>").join("")+"</div>"
      +'<div data-lc100-body><p class="small muted">Loading…</p></div></section>';
    await gemsBody(view);return null;
  }
  async function gemsBody(view){
    const b=Q("[data-lc100-body]",view);if(!b)return;
    QA("[data-lc100-tab]",view).forEach(x=>x.setAttribute("aria-pressed",String(x.getAttribute("data-lc100-tab")===G.tab)));
    let l=G.cache[G.tab];
    if(!l){b.innerHTML='<p class="small muted">Loading…</p>';const r=await rpc("mg_gems",{p_kind:G.tab,p_limit:24});
      if(missing(r)){b.innerHTML='<div class="panel pad"><p>'+(owner()?"Run "+E(SQLF)+" in Supabase first.":"My games are being prepared. Check back soon.")+"</p></div>";return}
      l=G.cache[G.tab]=Array.isArray(r&&r.data)?r.data:[]}
    if(!l.length){b.innerHTML='<div class="panel pad"><p>Nothing here yet.</p></div>';return}
    const isPos=G.tab==="brilliant"||G.tab==="great";
    b.innerHTML=(isPos&&!pro()?'<p class="small muted">Free: these count toward your 3 positions a day from my games. Pro plays every one.</p>':"")
      +'<ul class="lc100-gems">'+l.map((x,i)=>isPos
        ?'<li><div><b>'+E(KIND[x.kind]||"Position")+"</b> · "+E(x.opening||x.eco||"")+'<small>'+E([x.time_class,x.my_rating?"I was "+x.my_rating:"",x.opp_rating?"vs "+x.opp_rating:"",x.phase,dayTxt(x.end_time)].filter(Boolean).join(" · "))+'</small></div><div class="lc100-acts"><a class="btn btn-primary btn-sm" href="#think" data-lc100-intent=\''+E(JSON.stringify({ids:l.slice(i).concat(l.slice(0,i)).map(y=>y.id).slice(0,30)}))+'\'>'+ic("chess-board")+' Find my move</a><button type="button" class="btn btn-ghost btn-sm" data-lc100-game="'+E(x.game_id)+'" data-lc100-gfen="'+E(x.fen)+'">'+ic("play")+" The game</button></div></li>"
        :'<li><div><b>'+E(G.tab==="accuracy"?x.acc_me+"% accuracy":"+"+x.gap+" Elo: "+x.my_rating+" beat "+x.opp_rating)+"</b> · "+E(x.opening||x.eco||"")+'<small>'+E([x.time_class,G.tab==="accuracy"?"I was "+x.my_rating+" vs "+x.opp_rating:x.acc_me?x.acc_me+"% accuracy":"",x.brilliant?x.brilliant+" brilliant":"",x.termination,dayTxt(x.end_time)].filter(Boolean).join(" · "))+'</small></div><div class="lc100-acts"><button type="button" class="btn btn-primary btn-sm" data-lc100-game="'+E(x.id)+'">'+ic("play")+" Replay</button></div></li>").join("")+"</ul>";
  }
  function trimCard(r){
    const v=Q("#view");if(!v||Q("[data-lc100-gemcard]",v))return;const h=Q("h1",v);if(!h)return;
    (h.closest("header")||h).insertAdjacentHTML("afterend",'<a class="lc100-card" data-lc100-gemcard href="#kgems"><span class="lc100-ic">'+ic("gem")+'</span><span><b>Kyenzo’s Gems</b><small>My brilliant moves, best games and biggest upsets, from 304 to 2105.</small></span><span class="btn btn-ghost btn-sm">Open</span></a>');
  }

  /* ---------- 5. Ranked: one puzzle in four from Kyenzo's games ---------- */
  let KP=null,kpP=null;
  async function pool(){
    if(KP&&KP.day===today())return KP.list;
    const s=store.get("lc100-kp",null);if(s&&s.day===today()&&Array.isArray(s.list)){KP=s;return s.list}
    if(kpP)return kpP;
    kpP=(async()=>{const r=await rpc("mg_puzzles",{p_kinds:GOOD,p_tier:null,p_phase:null,p_eco:null,p_limit:100,p_offset:0,p_seed:"rk"+today()});
      const l=(r&&Array.isArray(r.data)?r.data:[]).map(toPuzzle).filter(Boolean);
      KP={day:today(),list:l};if(l.length)store.set("lc100-kp",KP);return l})();
    try{return await kpP}finally{kpP=null}
  }
  const rankedRoute=()=>/^(puzzles|ranked|ranked-shuffle|shuffle)$/.test(route());
  function turn(){const n=(+store.get("lc100-rk",0)||0)+1;store.set("lc100-rk",n);return n%4===0}
  function wrapFeed(){
    try{
      if(typeof PuzzleFeed==="undefined"||!PuzzleFeed||PuzzleFeed.__lc100)return;
      const orig=PuzzleFeed.next;if(typeof orig!=="function")return;
      PuzzleFeed.next=async function(target){
        if(rankedRoute()&&turn()){try{const l=await Promise.race([pool(),new Promise(z=>setTimeout(()=>z([]),2500))]);
          const seen=id=>{try{return PuzzleElo.seen(id)}catch(e){return false}},p=pickFrom(l,+target||1500,seen);if(p)return p}catch(e){}}
        return orig.apply(this,arguments);
      };
      PuzzleFeed.__lc100=true;
    }catch(e){console.error("lc100 feed",e)}
  }

  /* ---------- 6. the community: join the main one once per account ---------- */
  async function joinMain(){
    const s=sess();if(!s||!s.email)return;const k=String(s.email).toLowerCase();if(store.get("lc100-joined","")===k)return;
    let n="";try{n=String(App.profile&&(App.profile.firstName||App.profile.name)||"").split(/\s+/)[0].slice(0,24)}catch(e){n=""}
    const r=await rpc("lc100_join_main",{p_name:n},true);if(r&&r.status===200&&r.data&&r.data.ok)store.set("lc100-joined",k);
  }

  /* ---------- 7. students share their games (Account) and the owner list (#contrib) ---------- */
  const acct=site=>{let u="";try{const a=Elo.acct(site);u=a&&(a.user||a.username)||""}catch(e){u=""}
    if(!u)try{u=App.profile&&App.profile[site==="chesscom"?"chess_com_username":"lichess_username"]||""}catch(e){u=""}
    u=String(u||"").trim();return(site==="chesscom"?/^[A-Za-z0-9_-]{3,25}$/:/^[A-Za-z0-9_-]{2,30}$/).test(u)?u:""};
  const OPT="Use my rated games from the accounts below for Kyenzo’s analysis and training material in this app: the positions and moves, never my name. I can stop at any time; my account names are then deleted and my games are taken out.";
  const CW={members_only:"Sharing opens for paying members: once your plan is paid (not during the free trial).",chesscom:"That Chess.com name does not look right (3 to 25 letters, digits, - or _).",
    lichess:"That Lichess name does not look right (2 to 30 letters, digits, - or _).",no_account:"Fill in at least one account.",wording:"Tick the box first.",sign_in:"Sign in first."};
  async function contribPanel(){
    const v=Q("#view");if(!v||route()!=="account"||!sess()||Q("[data-lc100-contrib]",v))return;
    const box=document.createElement("section");box.className="panel pad lc100-contrib";box.setAttribute("data-lc100-contrib","");v.appendChild(box);
    const r=await rpc("lc100_contrib_get",{},true);
    if(missing(r)||!(r&&r.status===200&&r.data&&r.data.ok)){box.remove();return}
    paintContrib(box,r.data);
  }
  function paintContrib(box,d){
    if(d.enabled){box.innerHTML='<h3>'+ic("handshake")+' You share your games with Kyenzo</h3><p class="small muted">Since '+E(dayTxt(d.opted_in_at))+": "+E([d.chesscom?"Chess.com "+d.chesscom:"",d.lichess?"Lichess "+d.lichess:""].filter(Boolean).join(" · "))+'. Thank you: your positions help other players train.</p><div class="btn-row"><button type="button" class="btn btn-ghost" data-lc100-c="off">Stop sharing</button></div><p class="form-msg" data-lc100-cmsg aria-live="polite"></p>';return}
    box.innerHTML='<h3>'+ic("handshake")+' Share your games with Kyenzo</h3><p class="small muted">'+(d.paying?"Optional. Kyenzo analyses the games of members who share them and turns the best moments into training positions.":"For paying members, once the plan is paid (not during the free trial).")+"</p>"
      +(d.paying?'<div class="lc100-cf"><label class="field"><span class="field-label">Chess.com name</span><input class="input" name="cc" maxlength="25" value="'+E(d.chesscom||acct("chesscom"))+'"></label><label class="field"><span class="field-label">Lichess name</span><input class="input" name="li" maxlength="30" value="'+E(d.lichess||acct("lichess"))+'"></label></div>'
        +'<label class="lc99-ok lc100-ok"><input type="checkbox" data-lc100-cok> <span>'+E(OPT)+'</span></label><div class="btn-row"><button type="button" class="btn btn-primary" data-lc100-c="on" disabled>Share my games</button></div><p class="form-msg" data-lc100-cmsg aria-live="polite"></p>':"");
    const ok=Q("[data-lc100-cok]",box),b=Q('[data-lc100-c="on"]',box);if(ok&&b)ok.addEventListener("change",()=>{b.disabled=!ok.checked});
  }
  async function contribSet(box,on){
    const msg=t=>{const m=Q("[data-lc100-cmsg]",box);if(m)m.textContent=t||""};
    const cc=on?String((Q('[name="cc"]',box)||{}).value||"").trim():"",li=on?String((Q('[name="li"]',box)||{}).value||"").trim():"";
    if(on&&!(Q("[data-lc100-cok]",box)||{}).checked){msg(CW.wording);return}
    msg("Saving…");const r=await rpc("lc100_contrib_set",{p_on:on,p_chesscom:cc,p_lichess:li,p_version:CONTRIB_V,p_text:OPT},true);
    if(r&&r.status===200&&r.data&&r.data.ok){const g=await rpc("lc100_contrib_get",{},true);if(g&&g.data&&g.data.ok)paintContrib(box,g.data);say(on?"Thank you. Kyenzo can now use your games.":"Stopped. Your account names are deleted.","good");return}
    msg(CW[r&&r.data&&r.data.error]||"Could not save (HTTP "+(r&&r.status)+").");
  }
  async function mountContrib(view){
    css();
    if(!owner()){view.innerHTML='<section class="panel pad"><h1>Shared games</h1><p class="muted">This page is for the owner.</p></section>';return null}
    view.innerHTML='<section class="lc100"><p class="lc100-tag">Owner</p><h1>Shared games</h1><p class="muted">Paying members who said yes to “Share your games with Kyenzo”. Ingest the accounts that share (for example <code>python3 tools/master_games.py run --user NAME</code> with a separate output folder), tick them as done, and remove the games of everyone under “Stopped sharing”.</p><div data-lc100-co><p class="small muted">Loading…</p></div></section>';
    contribList(view);return null;
  }
  async function contribList(view){
    const out=Q("[data-lc100-co]",view);if(!out)return;const r=await rpc("lc100_admin_contrib",{},true);
    if(missing(r)){out.innerHTML="<p><b>Run "+E(SQLF)+" first.</b></p>";return}
    const l=r&&r.data&&r.data.rows;if(!Array.isArray(l)){out.innerHTML='<p class="small muted">Could not load (HTTP '+E(r&&r.status)+").</p>";return}
    const on=l.filter(x=>x.enabled),off=l.filter(x=>!x.enabled&&x.ingested_at);
    const row=x=>'<li data-lc100-em="'+E(x.email)+'"><div><b>'+E(x.email)+"</b> · "+E([x.chesscom?"Chess.com "+x.chesscom:"",x.lichess?"Lichess "+x.lichess:""].filter(Boolean).join(" · ")||"no names")+(x.enabled&&!x.paying?' <span class="lc99-badge">not paying any more</span>':"")
      +"<small>"+(x.enabled?"Sharing since "+E(dayTxt(x.opted_in_at)):"Stopped on "+E(dayTxt(x.revoked_at)))+(x.ingested_at?" · ingested "+E(dayTxt(x.ingested_at)):" · not ingested")+"</small></div>"
      +(x.enabled?'<button type="button" class="btn btn-ghost btn-sm" data-lc100-ing="'+(x.ingested_at?"0":"1")+'">'+(x.ingested_at?"Mark not ingested":"Mark ingested")+"</button>":'<button type="button" class="btn btn-ghost btn-sm" data-lc100-ing="0">Games removed</button>')+"</li>";
    out.innerHTML='<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-lc100-csv>'+ic("file-csv")+" Export CSV</button></div>"
      +'<h2 class="lc99-h2">Sharing ('+on.length+")</h2>"+(on.length?'<ul class="lc99-list">'+on.map(row).join("")+"</ul>":'<p class="small muted">Nobody yet.</p>')
      +'<h2 class="lc99-h2">Stopped sharing: remove their games ('+off.length+")</h2>"+(off.length?'<ul class="lc99-list">'+off.map(row).join("")+"</ul>":'<p class="small muted">Nothing to remove.</p>');
    out._rows=l;
  }
  function csv(l){const q=v=>'"'+String(v==null?"":v).replace(/"/g,'""')+'"';return["email,enabled,chesscom,lichess,opted_in_at,revoked_at,ingested_at,paying"].concat((l||[]).map(x=>[x.email,x.enabled,x.chesscom,x.lichess,x.opted_in_at,x.revoked_at,x.ingested_at,x.paying].map(q).join(","))).join("\n")}

  function ownerRows(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc100-own]",m)||!owner())return;
    const ref=Q("[data-lc99-own]",m)||Q("[data-lc97-own]",m);if(!ref)return;
    const b=document.createElement("a");b.href="#contrib";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc100-own","");
    b.innerHTML="<span><b>Shared games</b><small>Members who share their games with you: ingest or remove</small></span>";
    b.addEventListener("click",()=>{try{const mm=Q("#lc49-menu");if(mm)mm.remove()}catch(x){}});
    ref.insertAdjacentElement("afterend",b);
  }

  /* ---------- wiring ---------- */
  async function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    const it=t.closest("[data-lc100-intent]");if(it){try{sessionStorage.setItem("lc95-open",it.getAttribute("data-lc100-intent"))}catch(x){}return}
    const gb=t.closest("[data-lc100-game]");if(gb){e.preventDefault();const fen=gb.getAttribute("data-lc100-gfen");openGame(gb.getAttribute("data-lc100-game"),{key:gb.getAttribute("data-lc100-key")||(fen?keyOf(fen):"")});return}
    const tb=t.closest("[data-lc100-tab]");if(tb){G.tab=tb.getAttribute("data-lc100-tab");gemsBody(Q("#view"));return}
    const cb=t.closest("[data-lc100-c]");if(cb){e.preventDefault();const box=cb.closest("[data-lc100-contrib]");if(box)contribSet(box,cb.getAttribute("data-lc100-c")==="on");return}
    const ing=t.closest("[data-lc100-ing]");if(ing&&owner()){const li=ing.closest("[data-lc100-em]");const r=await rpc("lc100_admin_contrib_ingested",{p_email:li.getAttribute("data-lc100-em"),p_done:ing.getAttribute("data-lc100-ing")==="1"},true);
      say(r&&r.data&&r.data.ok?"Saved.":"Could not save.",r&&r.data&&r.data.ok?"good":"bad");contribList(Q("#view"));return}
    const cv=t.closest("[data-lc100-csv]");if(cv&&owner()){const out=Q("[data-lc100-co]");try{const b=new Blob([csv(out&&out._rows)],{type:"text/csv"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="shared-games.csv";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}catch(x){}}
  }
  function css(){
    if(Q("#lc100-css"))return;const s=document.createElement("style");s.id="lc100-css";
    s.textContent=".lc100{max-width:900px;margin:0 auto;display:grid;gap:12px}.lc100 h1{margin:0}.lc100-tag{margin:0;color:#38bdf8;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase}.lc100-tabs button{min-height:44px}"
      +".lc100-chip{margin:8px 0 0;padding:10px 12px;border-radius:12px;background:#1e293b;border:1px solid rgba(56,189,248,.35);display:grid;gap:4px;max-width:560px}.lc100-chip p{margin:0;overflow-wrap:anywhere}.lc100-chip b{color:#e2e8f0}.lc100-chip span{color:#94a3b8}.lc100-chip .btn{justify-self:start;min-height:40px}"
      +".lc100-card{display:flex;gap:12px;align-items:center;padding:12px 14px;margin:0 0 12px;border-radius:14px;background:#1e293b;border:1px solid rgba(56,189,248,.35);color:inherit;text-decoration:none}.lc100-card>span:nth-child(2){flex:1;display:grid;gap:2px;min-width:0}.lc100-card small{color:#94a3b8}.lc100-ic{color:#38bdf8;font-size:20px}.lc100-card .btn{min-height:40px;flex:none}"
      +".lc100-gems{list-style:none;margin:0;padding:0;display:grid;gap:8px}.lc100-gems li{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:12px;border-radius:12px;background:#1e293b;border:1px solid #334155}.lc100-gems li>div:first-child{display:grid;gap:2px;min-width:0;flex:1 1 220px;overflow-wrap:anywhere}.lc100-gems small{color:#94a3b8}.lc100-acts{display:flex;gap:6px;flex-wrap:wrap}.lc100-acts .btn{min-height:40px}"
      +".lc100-gm{display:grid;gap:10px}.lc100-gbd{width:100%;max-width:460px;margin:0 auto}.lc100-gnav{display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap}.lc100-gnav .btn{min-height:44px;min-width:44px}.lc100-gnav span{min-width:110px;text-align:center;color:#94a3b8;font-size:13px}"
      +".lc100-moves{max-height:150px;overflow:auto;line-height:2;font-size:13.5px;padding:6px;border-radius:10px;background:#0f172a}.lc100-moves button{background:none;border:0;color:#cbd5e1;padding:2px 4px;border-radius:6px;cursor:pointer;min-height:28px}.lc100-moves button.is-on{background:#38bdf8;color:#0f172a}.lc100-no{color:#64748b}"
      +".lc100-contrib{margin-top:14px;display:grid;gap:8px}.lc100-contrib h3{margin:0}.lc100-cf{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}.lc100-ok{font-size:13.5px}";
    document.head.appendChild(s);
  }
  let deb=0;
  function afterRender(r){
    r=r||route();clearTimeout(deb);
    deb=setTimeout(()=>{try{
      if(r==="middlegame"||r==="endgame")phaseCard(r);
      if(r==="trim"||r==="games")trimCard(r);
      if(r==="account")contribPanel();
      if(r==="openings")positions();
      joinMain();ownerRows();
    }catch(e){console.error("lc100",e)}},400);
  }
  function init(){
    try{
      css();
      if(typeof MOUNT!=="undefined"){MOUNT.kgems=mountGems;MOUNT.contrib=mountContrib;try{DOC_TITLES.kgems="Kyenzo’s Gems";ROUTE_TITLES.kgems="Kyenzo’s Gems";DOC_TITLES.contrib="Shared games";ROUTE_TITLES.contrib="the shared games"}catch(e){}}
      try{const lv=LC26.levels,o=lv.minLevel;if(lv&&!lv.__lc100){lv.__lc100=1;lv.minLevel=r=>r==="kgems"||r==="contrib"?1:o(r)}}catch(e){}
      document.addEventListener("lc-fen",onFen);document.addEventListener("click",onClick);
      wrapFeed();setTimeout(wrapFeed,1500);
      /* 9.65.0: a throttle, not a debounce: the page never stops changing, so a reset timer never fired and the owner menu missed its rows */
      let d2=0;new MutationObserver(()=>{if(d2)return;d2=setTimeout(()=>{d2=0;ownerRows()},250)}).observe(document.body,{childList:true,subtree:true});
    }catch(e){console.error("lc100",e)}
  }
  return{init:init,afterRender:afterRender,version:VERSION,openGame:openGame,positions:positions,mountGems:mountGems,
    _t:{fnv:fnv,keyOf:keyOf,chipText:chipText,toPuzzle:toPuzzle,pickFrom:pickFrom,ratingOf:ratingOf,csv:csv,OPT:OPT,state:()=>({G:G,POS:POS,KP:KP}),setPos(p){POS=p},setPool(l){KP={day:today(),list:l}}}};
})(); /*@@end lc100*/
