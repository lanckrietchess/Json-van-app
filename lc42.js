const LC42=(()=>{
  "use strict";
  /* LC42: the first-time path.
     teaser (LC39 quick win / LC25 redemption) -> "Analyze the whole game" (free; Level 2 + Game Library) -> the 9 other recent games are scanned in the
     background -> the (?) explains the Library -> weak points to confirm -> Working Points (?) -> analyse a second game on your own -> Level 3.
     One saved state (Store lc42-onb). Every step that is not a real milestone has a Skip. */
  const Q=(s,r)=>(r||document).querySelector(s);
  const E=s=>{try{return esc(s)}catch(e){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}};
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const admin=()=>{try{return !!Admin.active}catch(e){return false}};
  const hashNow=()=>{let h="";try{h=decodeURIComponent((location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){h=""}return h.split("/")[0].split("?")[0]};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const KEY="lc42-onb",KG="lc42-games",XP=100;
  const NAMES={M:"Move",S:"Specifics",P:"Priorities",C:"Calculation"};
  const WHY={M:"You miss what your opponent just threatened or changed on the board.",S:"You overlook loose pieces, weak squares or the structure.",P:"You skip checks, captures and attacks before you decide.",C:"Your calculation stops early or misses their best reply."};
  const ACTIVE=/^(first|lib|wp|sys|second)$/;
  const ENGINE=new Set(["trim","bot","think","mspc-rep","shuffle","themes","puzzles","vision","survival","clinic","review-queue","ranked","brilliant"]);
  /* the engine is one shared worker: a new request cancels the running one. So the background scan stays away from exercise pages, and from Trim while the person is touching the screen. */
  let lastTouch=0;
  const touch=()=>{lastTouch=Date.now()};
  const engineBusy=()=>{const h=hashNow();return h==="trim"?Date.now()-lastTouch<15000:ENGINE.has(h)};

  /* ---------- state ---------- */
  const blank=()=>({step:"",site:"",user:"",g1:null,base:null,base2:null,imported:0,scan:{done:0,tot:0,leaks:{},fin:false},pts:false});
  const st=()=>Object.assign(blank(),rd(KEY,{})||{});
  const put=p=>{const s=Object.assign(st(),p);wr(KEY,s);return s};
  const trimCount=()=>{try{const s=Store.get("lc-hub-trim-stats-v1",{})||{};return Object.keys(s.games||{}).length}catch(e){return 0}};
  const mistakeCount=()=>{try{return MistakeLog.all().length}catch(e){return 0}};
  const xpNow=()=>{try{return LC26.sync.snapshot().xp||0}catch(e){return 0}};
  const helpSeen=id=>{try{return !!(rd("lc29-help-seen",{})||{})[id]}catch(e){return false}};
  function award(){try{V6.addXp("think",XP,{noBench:true,noFw:true})}catch(e){}}
  /* only ever raises the quest level (never lowers it, never touches a finished or admin quest) */
  function setLevel(n){
    try{
      const q=rd("lc19-sw",null);
      if(q&&q.on&&(+q.level||1)<n)wr("lc19-sw",Object.assign({},q,{level:Math.min(n,5),base:xpNow()}));
      try{LC19.quest._t.decorate()}catch(e){}
    }catch(e){}
  }
  const toast2=(m,k)=>{try{toast(m,k||"")}catch(e){}};

  /* ---------- 1. start: the "Analyze the whole game" button ---------- */
  function acctInfo(g){
    let site=/^li/i.test(String(g.site||""))?"lichess":g.site?"chesscom":"",user=String(g.user||"");
    const tryS=s=>{try{const a=Elo.acct(s);return a&&a.user?String(a.user):""}catch(e){return ""}};
    if(!site)site=tryS("chesscom")?"chesscom":tryS("lichess")?"lichess":"";
    if(!user&&site)user=tryS(site);
    if(!user){try{const p=App.profile||{};user=String(site==="lichess"?p.lichess_username:p.chess_com_username||"")}catch(e){}}
    return{site:site||"chesscom",user:user};
  }
  function startFirst(g){
    g=g||{};if(!g.pgn)return false;
    const a=acctInfo(g),s0=st();
    put({step:"first",site:a.site,user:a.user,g1:{pgn:String(g.pgn).slice(0,60000),color:g.color==="b"?"b":"w"},base:{t:trimCount(),m:mistakeCount()},scan:blank().scan,pts:false,at:Date.now()});
    try{App.ui.trimLoad={pgn:String(g.pgn).slice(0,60000),id:null,user:g.color==="b"?"b":"w",review:false}}catch(e){}
    location.hash="#trim";
    importRest();poll();
    return true;
  }
  /* the other recent games, fetched while the person is busy with the first one */
  async function importRest(){
    const s=st();if(!s.user)return;
    try{
      const list=await LC39._t.games(s.site,s.user,10);
      const keep=(list||[]).slice(0,10).map(x=>({pgn:String(x.pgn||"").slice(0,20000),color:x.color==="b"?"b":"w",res:x.res||"",opp:x.opp||"",t:+x.t||0})).filter(x=>x.pgn);
      wr(KG,keep);put({imported:keep.length});
    }catch(e){}
  }

  /* ---------- 2. milestones ---------- */
  let pt=0;
  function poll(){clearInterval(pt);pt=setInterval(tick,2500);tick()}
  function tick(){
    const s=st();
    if(!ACTIVE.test(s.step)){clearInterval(pt);return}
    if(s.step==="first"&&s.base&&(trimCount()>s.base.t||mistakeCount()>s.base.m))return firstDone();
    if(s.step==="second"&&s.base2&&(trimCount()>s.base2.t||mistakeCount()>s.base2.m))return secondDone();
    if(s.step==="lib"&&helpSeen("trim"))put({step:"wp"});
    if(s.step==="sys"&&helpSeen("system"))toSecond();
    paint(hashNow());
  }
  function firstDone(){
    put({step:"lib",lvl2:Date.now()});
    award();setLevel(2);
    try{scanRest()}catch(e){}
    try{
      openSheet({title:"Level 2",cls:"lc25-sheet lc25-level lc42-sheet",noFocus:true,
        html:'<div class="lc25-pop"><h2>Level 2 unlocked</h2><p><b>+'+XP+' XP</b></p></div><p>Your first full analysis is done. The Game Library is open. I am scanning your other recent games in the background to find patterns.</p><p class="small muted">Next: open the Library and tap the <b>?</b> next to the title to hear Coach Lanckriet explain it.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc42-go="trim">Open the Game Library</button><button type="button" class="btn btn-quiet" data-close>Later</button></div>'});
    }catch(e){}
  }
  function toSecond(){put({step:"second",base2:{t:trimCount(),m:mistakeCount()}});paint(hashNow())}
  function secondDone(){
    put({step:"done",doneAt:Date.now()});
    award();setLevel(3);
    try{
      openSheet({title:"Level 3",cls:"lc25-sheet lc25-level lc42-sheet",noFocus:true,
        html:'<div class="lc25-pop"><h2>Level 3 unlocked</h2><p><b>+'+XP+' XP</b></p></div><p>You analysed a game on your own. Leaderboards and achievement chapters are open. Your quests continue on the quest board.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc42-go="quests">Open my quests</button><button type="button" class="btn btn-quiet" data-close>Later</button></div>'});
    }catch(e){}
    const x=Q("#lc42-strip");if(x)x.remove();
  }

  /* ---------- 3. background scan of the other games (Stockfish on this device; pauses while an exercise or Trim needs the engine) ---------- */
  let scanning=false;
  function bump(i,items,color){
    const s=st(),leaks=Object.assign({},s.scan.leaks);
    if(items)items.forEach(it=>{if(it&&it.color===color&&(it.cls==="blunder"||it.cls==="mistake")){const k=NAMES[it.k]?it.k:"S";leaks[k]=(leaks[k]||0)+1}});
    put({scan:{done:i,tot:s.scan.tot,leaks:leaks,fin:i>=s.scan.tot}});
  }
  async function scanRest(){
    if(scanning)return;
    const s0=st();if(s0.scan&&s0.scan.fin)return;
    scanning=true;
    try{
      let all=rd(KG,[])||[];
      for(let w=0;w<10&&!all.length;w++){await sleep(1500);all=rd(KG,[])||[]}
      const g1=s0.g1&&s0.g1.pgn?s0.g1.pgn.slice(0,200):"";
      const rest=all.filter(x=>x.pgn.slice(0,200)!==g1).slice(0,9);
      put({scan:Object.assign({},st().scan,{tot:rest.length,fin:!rest.length})});
      if(!rest.length)return;
      const S=LC80.scan;let i=st().scan.done||0,tries=0;
      while(i<rest.length){
        while(engineBusy())await sleep(3000);
        const x=rest[i];let items=null;
        try{
          if(!(await Engine.load()))throw new Error("engine");
          const g=S.parseGame(x.pgn);
          if(g){g.color=x.color;items=await S.analyseGame(g,()=>{},()=>engineBusy())}
        }catch(e){
          if(/cancelled|superseded/.test(String(e&&e.message))&&tries++<30){await sleep(3000);continue}
          if(/engine/.test(String(e&&e.message)))break;
          items=null;
        }
        tries=0;i++;bump(i,items,x.color);
      }
    }catch(e){console.error("lc42",e)}finally{scanning=false}
  }

  /* ---------- 4. weak points: summary across the scanned games, the person picks, they land in Working Points ---------- */
  function showWeak(){
    const s=st(),lk=s.scan.leaks||{},L=Object.keys(lk).filter(k=>NAMES[k]).sort((a,b)=>lk[b]-lk[a]),n=s.scan.done||0;
    if(typeof openSheet!=="function")return;
    if(!L.length){
      openSheet({title:"Your weak points",cls:"lc42-sheet",html:'<p>I scanned '+n+(n===1?" game":" games")+' and found no mistake that keeps coming back. Nice. Keep reviewing games and the picture gets sharper.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc42-wskip data-close>Continue</button></div>'});
      return;
    }
    const rows=L.slice(0,4).map((k,i)=>'<label class="lc42-wp"><input type="checkbox" name="wp" value="'+k+'"'+(i<3?" checked":"")+'><span><b>'+E(NAMES[k])+'</b> · '+lk[k]+(lk[k]===1?" mistake":" mistakes")+'<small>'+E(WHY[k])+'</small></span></label>').join("");
    openSheet({title:"Your weak points",cls:"lc42-sheet",
      html:'<p>Across '+n+(n===1?" game":" games")+' I found these patterns. Pick the ones you want to work on. They go into your Working Points.</p><form data-lc42-wform>'+rows+'<div class="btn-row"><button type="submit" class="btn btn-primary">Add to my Working Points</button><button type="button" class="btn btn-quiet" data-lc42-wskip data-close>Not now</button></div></form>',
      onMount(sh){
        sh.el.addEventListener("submit",e=>{
          const f=e.target.closest("[data-lc42-wform]");if(!f)return;e.preventDefault();
          const picked=Array.prototype.slice.call(f.querySelectorAll('input[name="wp"]:checked')).map(x=>x.value);
          let added=0;picked.forEach(k=>{try{if(Framework.coachAdd(k,null,{sev:2,freq:(lk[k]||0)>=3?3:2,pers:2}))added++}catch(x){}});
          put({pts:true,step:"sys"});sh.close();
          toast2(added?"Added to your Working Points.":"Nothing added.",added?"good":"");paint(hashNow());
        });
      }});
  }

  /* ---------- 5. the (?) help the Library and Working Points screens need (used only when the server help file has no entry) ---------- */
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
      what:"Working points are the habits you decided to fix, such as always checking their threat before you move. They are the heart of your personal MSPC system.",
      how:"Add a point yourself or from a game review. Your Hub brings it back in drills and reviews and marks it clean when you avoid it.",
      why:"One habit fixed at a time beats a long list of tips. Working points keep your training pointed at what actually costs you games."}
  };
  function fill(idx){try{Object.keys(HELP).forEach(k=>{if(!idx.has(k))idx.set(k,HELP[k])})}catch(e){}}

  /* ---------- 6. the quest strip: always says what the next step is ---------- */
  const ROUTES=new Set(["quests","home","trim","system","games","insights","my-mistakes"]);
  function stripHTML(s,route){
    const go=(to,label)=>route===to?"":'<button type="button" class="btn btn-primary" data-lc42-go="'+to+'">'+label+'</button>';
    if(s.step==="first")return route==="trim"?{k:"first",t:"<b>Analyse the whole game.</b> Go through it to the last move: it is free and it opens Level 2.",b:""}:{k:"first2",t:"<b>Next:</b> analyse your whole game. It is free and it opens Level 2.",b:go("trim","Analyze the whole game")};
    if(s.step==="lib")return{k:"lib"+route,t:"<b>Level 2: the Game Library.</b> Tap the <b>?</b> next to the title to hear Coach Lanckriet explain the Library and Trim.",b:go("trim","Open the Game Library")+'<button type="button" class="btn btn-quiet" data-lc42-skip="lib">Skip</button>'};
    if(s.step==="wp"){
      const sc=s.scan||{},ready=sc.fin||(sc.done||0)>=3;
      return{k:"wp"+(ready?1:0)+"-"+(sc.done||0),t:ready?"<b>Your weak points are ready.</b> Pick what you want to work on.":"<b>Scanning your other games</b> ("+(sc.done||0)+" of "+(sc.tot||"…")+"). The Hub finds your weak points while you wait. You can keep using the app.",b:ready?'<button type="button" class="btn btn-primary" data-lc42-weak>See my weak points</button>':'<button type="button" class="btn btn-quiet" data-lc42-skip="wp">Skip</button>'};
    }
    if(s.step==="sys")return{k:"sys"+route,t:"<b>Next: Working Points.</b> Open them and tap the <b>?</b> to hear how they work.",b:go("system","Open Working Points")+'<button type="button" class="btn btn-quiet" data-lc42-skip="sys">Skip</button>'};
    if(s.step==="second")return{k:"second"+route,t:"<b>Last step to Level 3.</b> Return to the Game Library and analyse one of your other games on your own.",b:go("trim","Open the Game Library")};
    return null;
  }
  function paint(route){
    try{
      const v=Q("#view");if(!v)return;
      const on=Q("#lc42-strip",v),s=st();
      const want=!admin()&&ACTIVE.test(s.step)&&ROUTES.has(route)&&!Q(".trainer",v)?stripHTML(s,route):null;
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
    const go=t.closest("[data-lc42-go]");
    if(go){e.preventDefault();const to=go.getAttribute("data-lc42-go");const sh=go.closest(".sheet-wrap");const c=sh&&sh.querySelector("[data-close]");if(c)c.click();location.hash="#"+to;return}
    if(t.closest("[data-lc42-weak]")){e.preventDefault();showWeak();return}
    const sk=t.closest("[data-lc42-skip]");
    if(sk){e.preventDefault();const k=sk.getAttribute("data-lc42-skip");if(k==="lib")put({step:"wp"});else if(k==="wp")put({step:"sys"});else if(k==="sys")toSecond();paint(hashNow());return}
    if(t.closest("[data-lc42-wskip]")){put({step:"sys"});setTimeout(()=>paint(hashNow()),300)}
  }

  let obs=null;
  function afterRender(route){
    try{
      if(obs){try{obs.disconnect()}catch(e){}obs=null}
      const s=st();if(!ACTIVE.test(s.step))return;
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
    +'.lc42-code{margin:0}.lc42-code summary{min-height:44px;display:flex;align-items:center;cursor:pointer;color:#38bdf8}.lc42-codeform{margin-top:6px}.lc42-codeform .btn{min-height:44px}'
    +'.lc42-wp{display:flex;gap:10px;align-items:flex-start;min-height:44px;padding:8px 4px}.lc42-wp small{display:block;opacity:.8}.lc42-wp input{width:22px;height:22px;flex:none}';
    document.head.appendChild(s);
  }
  function init(){
    try{
      css();
      document.addEventListener("click",onClick,true);["pointerdown","keydown","touchstart"].forEach(n=>document.addEventListener(n,touch,true));
      const s=st();
      if(ACTIVE.test(s.step)){
        poll();
        if((s.step==="lib"||s.step==="wp"||s.step==="sys"||s.step==="second")&&!(s.scan&&s.scan.fin))setTimeout(()=>{try{scanRest()}catch(e){}},4000);
      }
    }catch(e){console.error("lc42",e)}
  }
  return{init:init,afterRender:afterRender,startFirst:startFirst,fill:fill,showWeak:showWeak,_t:{st:st,put:put,tick:tick,firstDone:firstDone,secondDone:secondDone,scanRest:scanRest,paint:paint,stripHTML:stripHTML,importRest:importRest,toSecond:toSecond}};
})();
