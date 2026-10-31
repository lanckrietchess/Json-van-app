const LC42=(()=>{
  "use strict";
  /* LC42: the first-time path, one road, no choices.
     Level 1: ONE mistake of the latest game (shown the moment it is found) -> "Analyze the whole game" (Trim starts by itself); the 9 other recent
              games are fetched and scanned in the background -> a finished Trim = Level 2.
     Level 2: overview of the leaks across the games + personal working points -> MSPC System: tap the ? and listen to Coach Lanckriet to the end = Level 3.
     Level 3: Game Library opens -> tap the ? on Trim and listen to the end -> trim one of the other games yourself = Level 4 (the normal quests continue).
     One saved state (Store lc42-onb). Steps: tease, first, sys, libq, second, done. */
  const Q=(s,r)=>(r||document).querySelector(s);
  const E=s=>{try{return esc(s)}catch(e){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}};
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const admin=()=>{try{return !!Admin.active}catch(e){return false}};
  const hashNow=()=>{let h="";try{h=decodeURIComponent((location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){h=""}return h.split("/")[0].split("?")[0]};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const KEY="lc42-onb",KG="lc42-games",XP=100;
  const NAMES={M:"Move",S:"Specifics",P:"Priorities",C:"Calculation"};
  const WHY={M:"You miss what your opponent just threatened or changed on the board.",S:"You overlook loose pieces, weak squares or the structure.",P:"You skip checks, captures and attacks before you decide.",C:"Your calculation stops early or misses their best reply."};
  const OWN=/^(tease|first|sys|libq|second)$/;
  const ENGINE=new Set(["think","mspc-rep","shuffle","themes","puzzles","vision","survival","bot","clinic","review-queue","ranked","brilliant"]);
  /* the engine is one shared worker: a new request cancels the running one. So the background scan stays away from exercise pages, from a running Trim review and from Trim while the person is touching the screen. */
  let lastTouch=0;
  const touch=()=>{lastTouch=Date.now()};
  const reviewing=()=>{const b=Q("#an-review-bar");return !!b&&!b.hidden};
  const engineBusy=()=>{const h=hashNow();return h==="trim"?(reviewing()||Date.now()-lastTouch<8000):ENGINE.has(h)};

  /* ---------- state ---------- */
  const blank=()=>({step:"",site:"",user:"",g1:null,base:null,base2:null,at:0,since:0,imported:0,scan:{done:0,tot:0,leaks:{},fin:false},pts:false});
  const st=()=>Object.assign(blank(),rd(KEY,{})||{});
  const put=p=>{const s=Object.assign(st(),p);wr(KEY,s);return s};
  const owns=()=>!admin()&&OWN.test(st().step);
  const quest=()=>rd("lc19-sw",null);
  const levelNow=()=>{const q=quest();return q&&q.on?(+q.level||1):5};
  const eligible=()=>{try{const q=quest();return !admin()&&!!q&&q.on===true&&(+q.level||1)===1&&!st().step}catch(e){return false}};
  const trimCount=()=>{try{const s=Store.get("lc-hub-trim-stats-v1",{})||{};return Object.keys(s.games||{}).length}catch(e){return 0}};
  const mistakeCount=()=>{try{return MistakeLog.all().length}catch(e){return 0}};
  const xpNow=()=>{try{return LC26.sync.snapshot().xp||0}catch(e){return 0}};
  const helpSeen=id=>{try{return !!(rd("lc29-help-seen",{})||{})[id]}catch(e){return false}};
  const award=()=>{try{V6.addXp("think",XP,{noBench:true,noFw:true})}catch(e){}};
  const toast2=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  /* only ever raises the quest level (never lowers it, never touches a finished or admin quest) */
  function setLevel(n){
    try{
      const q=quest();
      if(q&&q.on&&(+q.level||1)<n)wr("lc19-sw",Object.assign({},q,{level:Math.min(n,5),base:xpNow()}));
      try{LC19.quest._t.decorate()}catch(e){}
    }catch(e){}
  }
  const abort=()=>{put({step:"done",doneAt:Date.now()});const x=Q("#lc42-strip");if(x)x.remove()};

  /* ---------- 0. entry: right after the first-run questions and the Chess.com / Lichess connection ---------- */
  function begin(h){
    try{
      if(!eligible())return false;
      const site=h&&h.cc?"chesscom":h&&h.li?"lichess":"",user=String(h&&(h.cc||h.li)||"");
      if(!site||!user)return false;
      put({step:"tease",site:site,user:user,at:Date.now(),since:Date.now(),scan:blank().scan,pts:false});
      setTimeout(()=>{try{teaser()}catch(e){console.error("lc42",e)}},350);
      poll();
      return true;
    }catch(e){return false}
  }

  /* ---------- 1. the teaser: ONE mistake, shown the moment it is found ---------- */
  const saveBlock=()=>{
    try{if(LC26.sync.session())return""}catch(e){return""}
    return'<details class="lc42-save"><summary>Save my progress (optional)</summary><div class="lc39-gate"><button type="button" class="btn btn-primary lc39-google" data-lc39-google>Sign in with Google</button><p class="small muted lc39-or">or with your email</p>'
      +'<form data-lc39-mail class="lc39-row"><input class="input" name="email" type="email" autocomplete="email" placeholder="you@example.com" aria-label="Email address"><button type="submit" class="btn btn-ghost">Email me a link or code</button></form>'
      +LC26.sync.codeForm("lc39")+'<p class="form-msg" data-lc39-gmsg aria-live="polite"></p></div></details>';
  };
  async function firstMistake(g,onProg,alive){
    const ch=new Chess();if(!ch.load_pgn(g.pgn))return{none:true};
    const hist=ch.history({verbose:true}),b=new Chess(),fens=[b.fen()];
    hist.forEach(m=>{b.move(m.san);fens.push(b.fen())});
    if(!(await Engine.load()))throw new Error("engine");
    const cap=Math.min(hist.length,90),w=g.color==="w",ev=[],best=[];
    for(let i=0;i<=cap;i++){
      if(!alive())return null;
      const fin=LC39._t.endScore(fens[i]);       /* checkmate / draw: terminal score, never asked from the engine */
      if(fin!==null){ev[i]=fin;best[i]=null}
      else{const r=await Engine.analyse(fens[i],{depth:10,multipv:1});const l=r&&r.lines&&r.lines[0];ev[i]=l?Engine.toCp(l):0;best[i]=r&&r.best||null}
      onProg(i/cap);
      const p=i-1;                                /* the move just evaluated: ply p, from fens[p] to fens[i] */
      if(p>=6&&((p%2===0)===w)){
        const pm=hist[p];
        if(/#$/.test(pm.san))continue;            /* a delivered checkmate is never a mistake */
        if(best[p]&&best[p]===pm.from+pm.to+(pm.promotion||""))continue;
        const before=w?ev[p]:-ev[p],after=w?ev[i]:-ev[i],loss=before-after;
        if(loss>=150&&before>-500){
          const bu=best[p]||"";
          return{ply:p,loss:loss,before:before,after:after,played:pm,fen:fens[p],bestUci:bu,bestSan:bu?(Engine.uciToSan(fens[p],bu)||bu):"",no:Math.floor(p/2)+1};
        }
      }
    }
    return{none:true};
  }
  async function teaser(){
    if(typeof openSheet!=="function")return;
    const s0=st();if(s0.step!=="tease")return;
    let alive=true;
    const sh=openSheet({title:"Your first win",cls:"lc42-sheet lc42-tease",noFocus:true,
      html:'<p data-lc42-tmsg>Reading your latest game…</p><div class="lc39-prog"><span data-lc42-prog></span></div><p class="small muted">This takes a few seconds. Your first mistake shows up as soon as I find it.</p>'+saveBlock(),
      onClose:()=>{alive=false}});
    const el=sh&&sh.el;if(!el)return;
    const stop=t=>{el.innerHTML='<p>'+E(t)+'</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc42-abort data-close>Continue</button></div>'};
    importRest();
    let g=null;
    try{const gs=await LC39._t.games(s0.site,s0.user,1);g=gs&&gs[0]}catch(e){}
    if(!alive||!el.isConnected)return;
    if(!g||!g.pgn){stop("I could not load a recent game for "+s0.user+". You can check the username later in your account. Continue.");return}
    put({g1:{pgn:String(g.pgn).slice(0,60000),color:g.color==="b"?"b":"w"}});
    let r=null;
    try{r=await firstMistake(g,p=>{const b=Q("[data-lc42-prog]",el);if(b)b.style.width=Math.round(p*100)+"%"},()=>alive&&el.isConnected)}
    catch(e){if(alive&&el.isConnected)stop("Stockfish could not start on this device, so I cannot scan your game. Continue.");return}
    if(!alive||!el.isConnected||!r)return;
    let html;
    if(r.none){html='<p class="lc39-qwh">Clean game.</p><p>No big blunder in your latest game. Nice. Now let me show you the whole picture.</p><div class="btn-row"><button type="button" class="btn btn-primary lc42-full" data-lc42-full>Analyze the whole game</button></div>'}
    else{html=LC39._t.turnHTML(r,g.color==="b")}
    el.innerHTML=html+saveBlock();
    const fx=el.querySelector("[data-lc39-fix]");if(fx)fx.remove();     /* one road: no side paths */
    try{scanRest()}catch(e){}                                              /* the engine is free while they read: scan the other games */
  }

  /* ---------- 2. "Analyze the whole game": Trim starts by itself ---------- */
  function autoReview(){
    let n=0;const t=setInterval(()=>{
      if(++n>45||hashNow()!=="trim"){clearInterval(t);return}
      const rv=Q('[data-act="review"]'),mv=Q("#an-moves");
      if(rv&&!rv.disabled&&mv&&mv.children.length&&!reviewing()){clearInterval(t);rv.click()}
    },400);
  }
  function startFirst(g){
    g=g||{};
    const s=st();
    const gg=g.pgn?{pgn:String(g.pgn).slice(0,60000),color:g.color==="b"?"b":"w"}:s.g1;
    if(!gg||!gg.pgn)return false;
    try{App.ui.trimLoad={pgn:gg.pgn,id:null,user:gg.color,review:false}}catch(e){}
    if(s.step==="tease"){
      put({step:"first",g1:gg,base:{t:trimCount(),m:mistakeCount()},since:Date.now()});
      importRest();poll();
    }
    location.hash="#trim";
    autoReview();
    return true;
  }
  /* the other recent games, fetched while the person is busy with the first one */
  async function importRest(){
    const s=st();if(!s.user)return;
    if((rd(KG,[])||[]).length)return;
    try{
      const list=await LC39._t.games(s.site,s.user,10);
      const keep=(list||[]).slice(0,10).map(x=>({pgn:String(x.pgn||"").slice(0,20000),color:x.color==="b"?"b":"w",res:x.res||"",opp:x.opp||"",t:+x.t||0})).filter(x=>x.pgn);
      wr(KG,keep);put({imported:keep.length});
    }catch(e){}
  }

  /* ---------- 3. background scan of the other games ---------- */
  let scanning=false;
  function bump(i,items,color){
    const s=st(),leaks=Object.assign({},s.scan.leaks);
    if(items)items.forEach(it=>{if(it&&it.color===color&&(it.cls==="blunder"||it.cls==="mistake")){const k=NAMES[it.k]?it.k:"S";leaks[k]=(leaks[k]||0)+1}});
    put({scan:{done:i,tot:s.scan.tot,leaks:leaks,fin:i>=s.scan.tot}});
    refreshOv();
    if(i>=s.scan.tot&&s.step!=="tease"&&s.step!=="first")addPoints();
  }
  async function scanRest(){
    if(scanning)return;
    const s0=st();if(s0.scan&&s0.scan.fin)return;
    scanning=true;
    try{
      let all=rd(KG,[])||[];
      for(let w=0;w<20&&!all.length;w++){await sleep(1500);all=rd(KG,[])||[]}
      const g1=s0.g1&&s0.g1.pgn?s0.g1.pgn.slice(0,200):"";
      const rest=all.filter(x=>x.pgn.slice(0,200)!==g1).slice(0,9);
      put({scan:Object.assign({},st().scan,{tot:rest.length,fin:!rest.length})});
      if(!rest.length){refreshOv();return}
      const S=LC80.scan;let i=st().scan.done||0,tries=0;
      while(i<rest.length){
        while(engineBusy())await sleep(2500);
        const x=rest[i];let items=null;
        try{
          if(!(await Engine.load()))throw new Error("engine");
          const g=S.parseGame(x.pgn);
          if(g){g.color=x.color;items=await S.analyseGame(g,()=>{},()=>engineBusy())}
        }catch(e){
          if(/cancelled|superseded/.test(String(e&&e.message))&&tries++<40){await sleep(2500);continue}
          if(/engine/.test(String(e&&e.message)))break;
          items=null;
        }
        tries=0;i++;bump(i,items,x.color);
      }
    }catch(e){console.error("lc42",e)}finally{scanning=false}
  }

  /* ---------- 4. Level 2: the overview and the personal working points ---------- */
  function leaksAll(){
    const s=st(),L=Object.assign({},(s.scan&&s.scan.leaks)||{});
    try{MistakeLog.all().forEach(e=>{if(e&&(+e.t||0)>=(s.at||0)&&s.g1&&e.color===s.g1.color&&(e.cls==="blunder"||e.cls==="mistake")){const k=NAMES[e.k]?e.k:"S";L[k]=(L[k]||0)+1}})}catch(e){}
    return L;
  }
  const topKeys=()=>{const L=leaksAll();return Object.keys(L).filter(k=>NAMES[k]).sort((a,b)=>L[b]-L[a])};
  function addPoints(){
    try{const L=leaksAll();topKeys().slice(0,3).forEach(k=>{try{Framework.coachAdd(k,null,{sev:2,freq:L[k]>=3?3:2,pers:2})}catch(e){}});put({pts:true})}catch(e){}
  }
  function ovBody(){
    const s=st(),L=leaksAll(),keys=topKeys(),sc=s.scan||{},tot=(sc.tot||0)+1,done=Math.min(tot,(sc.done||0)+1);
    const rows=keys.length?keys.slice(0,4).map(k=>'<li><b>'+E(NAMES[k])+'</b> · '+L[k]+(L[k]===1?" mistake":" mistakes")+'<small>'+E(WHY[k])+'</small></li>').join(""):"<li>No repeated leak yet.</li>";
    const status=sc.fin?"I went through "+tot+(tot===1?" game.":" games."):"Still going through your other games: "+done+" of "+tot+" done. This list fills in by itself.";
    return{rows:rows,status:status};
  }
  function refreshOv(){
    try{const l=Q("[data-lc42-ovlist]"),t=Q("[data-lc42-ovstat]");if(!l||!t)return;const b=ovBody();l.innerHTML=b.rows;t.textContent=b.status}catch(e){}
  }
  function firstDone(){
    put({step:"sys",since:Date.now(),l2:Date.now()});
    award();setLevel(2);addPoints();
    try{scanRest()}catch(e){}
    const b=ovBody();
    try{
      openSheet({title:"Level 2",cls:"lc25-sheet lc25-level lc42-sheet",noFocus:true,
        html:'<div class="lc25-pop"><h2>Level 2 unlocked</h2><p><b>+'+XP+' XP</b></p></div><p>Your first full Trim is done. This is where you lose the most points:</p><ul class="lc42-ov" data-lc42-ovlist>'+b.rows+'</ul><p class="small muted" data-lc42-ovstat>'+E(b.status)+'</p><p>I saved your top leaks as personal working points. Next: open your MSPC System. It also shows the working points that fit your rating.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc42-go="system">Open my MSPC System</button><button type="button" class="btn btn-quiet" data-close>Later</button></div>'});
    }catch(e){}
  }

  /* ---------- 5. Level 3 and 4: listen to Coach Lanckriet (the ? button), then do it yourself ---------- */
  function onListened(id){
    const s=st();
    if(s.step==="sys"&&id==="system"){
      put({step:"libq",since:Date.now()});award();setLevel(3);paint(hashNow());
      try{openSheet({title:"Level 3",cls:"lc25-sheet lc25-level lc42-sheet",noFocus:true,
        html:'<div class="lc25-pop"><h2>Level 3 unlocked</h2><p><b>+'+XP+' XP</b></p></div><p>Your Game Library is open. It holds your 10 latest games. Open it, tap the <b>?</b> and listen to Coach Lanckriet explain the Library and Trim.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc42-go="trim">Open the Game Library</button><button type="button" class="btn btn-quiet" data-close>Later</button></div>'})}catch(e){}
    }else if(s.step==="libq"&&id==="trim"){
      put({step:"second",base2:{t:trimCount(),m:mistakeCount()},since:Date.now()});paint(hashNow());
      toast2("Now pick a game and trim it yourself.","good");
    }
  }
  function secondDone(){
    put({step:"done",doneAt:Date.now()});
    award();setLevel(4);
    try{openSheet({title:"Level 4",cls:"lc25-sheet lc25-level lc42-sheet",noFocus:true,
      html:'<div class="lc25-pop"><h2>Level 4 unlocked</h2><p><b>+'+XP+' XP</b></p></div><p>You trimmed a game on your own. You know the way now. Your quests continue on the quest board.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc42-go="quests">Open my quests</button><button type="button" class="btn btn-quiet" data-close>Later</button></div>'})}catch(e){}
    const x=Q("#lc42-strip");if(x)x.remove();
  }
  let pt=0;
  function poll(){clearInterval(pt);pt=setInterval(tick,2500);tick()}
  function tick(){
    const s=st();
    if(!OWN.test(s.step)){clearInterval(pt);return}
    if(s.step==="first"&&s.base&&(trimCount()>s.base.t||mistakeCount()>s.base.m))return firstDone();
    if(s.step==="second"&&s.base2&&(trimCount()>s.base2.t||mistakeCount()>s.base2.m))return secondDone();
    paint(hashNow());
  }

  /* ---------- 6. the (?) help the Library and Working Points screens need (used only when the server help file has no entry) ---------- */
  const HELP={
    trim:{feature_id:"trim",title:"Game Library and Trim",
      what:"The Game Library lists your latest games from Chess.com or Lichess. Trim is the review: your Hub walks through the game and shows where it turned.",
      how:"Pick a game from the library and it loads into the review. Go through your mistakes one by one, and try to find the better move before you look at it. Every finished review earns XP.",
      why:"Trim follows MSPC: Move, Specifics, Priorities, Calculation. Seeing which step failed in your own games is how you stop repeating the same mistake."},
    games:{feature_id:"games",title:"Game Library",
      what:"Your saved and imported games live here, ready to review.",
      how:"Open a game and send it to Trim to review it move by move.",
      why:"Your own games show the leaks that cost you the most points."},
    system:{feature_id:"system",title:"Working Points",
      what:"Working points are the habits you decided to fix, such as always checking their threat before you move. They are the heart of your personal MSPC system. You see the ones that fit your rating and your own.",
      how:"Add a point yourself or from a game review. Your Hub brings it back in drills and reviews and marks it clean when you avoid it.",
      why:"One habit fixed at a time beats a long list of tips. Working points keep your training pointed at what actually costs you games."}
  };
  function fill(idx){try{Object.keys(HELP).forEach(k=>{if(!idx.has(k))idx.set(k,HELP[k])})}catch(e){}}

  /* ---------- 7. the quest strip: always says what the next step is ---------- */
  const ROUTES=new Set(["quests","home","trim","system","games","insights","my-mistakes"]);
  function stripHTML(s,route){
    const go=(to,label)=>route===to?"":'<button type="button" class="btn btn-primary" data-lc42-go="'+to+'">'+label+'</button>';
    const skipOn=id=>Date.now()-(s.since||0)>90000&&helpSeen(id);
    const skip=id=>skipOn(id)?'<button type="button" class="btn btn-quiet" data-lc42-skiplisten="'+id+'">I could not hear it: continue</button>':"";
    if(s.step==="tease")return{k:"tease",t:"<b>Your first quick win is waiting.</b> One mistake from your latest game.",b:'<button type="button" class="btn btn-primary" data-lc42-tease>Show me</button>'};
    if(s.step==="first")return route==="trim"?{k:"first",t:"<b>Level 1: your Trim is running.</b> When it is done you reach Level 2.",b:""}:{k:"first2",t:"<b>Next:</b> finish the Trim of your game. It opens Level 2.",b:go("trim","Back to my Trim")};
    if(s.step==="sys")return{k:"sys"+route+(skipOn("system")?1:0),t:"<b>Level 2: your MSPC System.</b> Open it, tap the <b>?</b> and listen to Coach Lanckriet to the end. Then look around: the working points for your rating and your personal ones are in there.",b:go("system","Open my MSPC System")+skip("system")};
    if(s.step==="libq")return{k:"libq"+route+(skipOn("trim")?1:0),t:"<b>Level 3: your Game Library.</b> Tap the <b>?</b> on this page and listen to Coach Lanckriet to the end.",b:go("trim","Open the Game Library")+skip("trim")};
    if(s.step==="second")return{k:"second"+route,t:"<b>Last step to Level 4.</b> Pick one of your other games in the Library and run the full Trim yourself.",b:go("trim","Open the Game Library")};
    return null;
  }
  function paint(route){
    try{
      const v=Q("#view");if(!v)return;
      const s=st();
      /* the Game Library opens at Level 3 */
      const lib=Q("#lc39-lib",v);if(lib)lib.style.display=(owns()&&levelNow()<3)?"none":"";
      const on=Q("#lc42-strip",v);
      const want=!admin()&&OWN.test(s.step)&&ROUTES.has(route)&&!Q(".trainer",v)?stripHTML(s,route):null;
      if(!want){if(on)on.remove();return}
      if(on&&on.getAttribute("data-sig")===want.k)return;
      if(on)on.remove();
      const a=document.createElement("aside");a.id="lc42-strip";a.className="lc42-strip";a.setAttribute("role","note");a.setAttribute("data-sig",want.k);
      a.innerHTML='<p>'+want.t+'</p><div class="btn-row">'+want.b+'</div>';
      v.insertBefore(a,v.firstChild);
    }catch(e){}
  }
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    const full=t.closest("[data-lc42-full]");
    if(full&&st().step==="tease"){e.preventDefault();e.stopPropagation();const sh=full.closest(".sheet-wrap"),c=sh&&sh.querySelector("[data-close]");if(c)c.click();startFirst();return}
    const go=t.closest("[data-lc42-go]");
    if(go){e.preventDefault();const to=go.getAttribute("data-lc42-go"),sh=go.closest(".sheet-wrap"),c=sh&&sh.querySelector("[data-close]");if(c)c.click();location.hash="#"+to;return}
    if(t.closest("[data-lc42-tease]")){e.preventDefault();teaser();return}
    const sl=t.closest("[data-lc42-skiplisten]");
    if(sl){e.preventDefault();onListened(sl.getAttribute("data-lc42-skiplisten"));return}
    if(t.closest("[data-lc42-abort]")){abort();return}
    const th=t.closest(".lc42-tease");
    if(th){
      const sb=t.closest("[data-lc39-show]");
      if(sb){e.preventDefault();e.stopPropagation();const a=Q("[data-lc39-ans]",th);if(a)a.hidden=false;sb.hidden=true}
    }
  }

  let obs=null;
  function afterRender(route){
    try{
      if(obs){try{obs.disconnect()}catch(e){}obs=null}
      const s=st();if(!OWN.test(s.step))return;
      const run=()=>paint(hashNow());
      setTimeout(run,150);
      if(typeof MutationObserver==="function"){
        let b=false;const mine=obs=new MutationObserver(()=>{if(b)return;b=true;setTimeout(()=>{b=false;run()},150)});
        mine.observe(document.body,{childList:true,subtree:true});
        setTimeout(()=>{try{mine.disconnect()}catch(e){}if(obs===mine)obs=null},15000);
      }
    }catch(e){}
  }
  function css(){
    if(Q("#lc42-css"))return;const s=document.createElement("style");s.id="lc42-css";
    s.textContent='.lc42-strip{margin:0 0 12px;padding:12px;border:1px solid rgba(56,189,248,.45);background:rgba(56,189,248,.08);border-radius:12px;display:grid;gap:8px}.lc42-strip p{margin:0}.lc42-strip .btn,.lc42-sheet .btn{min-height:44px}'
    +'.lc42-code{margin:0}.lc42-code summary,.lc42-save summary{min-height:44px;display:flex;align-items:center;cursor:pointer;color:#38bdf8}.lc42-codeform{margin-top:6px}.lc42-codeform .btn{min-height:44px}.lc42-save{margin-top:10px}'
    +'.lc42-ov{list-style:none;padding:0;margin:8px 0;display:grid;gap:8px}.lc42-ov li{padding:8px 10px;border:1px solid rgba(148,163,184,.3);border-radius:10px}.lc42-ov small{display:block;opacity:.8}';
    document.head.appendChild(s);
  }
  function init(){
    try{
      css();
      document.addEventListener("click",onClick,true);
      ["pointerdown","keydown","touchstart"].forEach(n=>document.addEventListener(n,touch,true));
      window.addEventListener("lc29-listened",e=>{try{onListened(String(e.detail||""))}catch(x){}});
      const s=st();
      if(OWN.test(s.step)){
        poll();
        if(s.step!=="tease"&&!(s.scan&&s.scan.fin))setTimeout(()=>{try{scanRest()}catch(e){}},4000);
      }
    }catch(e){console.error("lc42",e)}
  }
  return{init:init,afterRender:afterRender,begin:begin,startFirst:startFirst,fill:fill,owns:owns,eligible:eligible,_t:{st:st,put:put,tick:tick,firstDone:firstDone,secondDone:secondDone,onListened:onListened,scanRest:scanRest,paint:paint,stripHTML:stripHTML,teaser:teaser,importRest:importRest,firstMistake:firstMistake,leaksAll:leaksAll}};
})();
