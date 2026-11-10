/*@@module lc67*/ const LC67=(()=>{
  "use strict";
  /* LC67 (build 9.34.0): the training flow without waiting.
     A. sim   Owner tool "Simulate first login / onboarding": the whole device state (localStorage + sessionStorage, the sign-in session included) is put in a
              backup and the app restarts as a brand-new device (guest, level 1, start tokens). Nothing is sent to or deleted from the server: a guest has no
              server profile. "Stop simulation" restores the backup and reloads: the real session, admin mode, level and tier are back exactly as they were.
     B. pool  The Shuffle Trainer checked every line with chess.js on first use (5 to 10 seconds of frozen screen). The check now runs in small slices in the
              background, and its result is remembered on the device (lc67-poolok), so the wait happens once per device, not once per visit.
     C. gate  Ranked Entry Gate: before the Shuffle Trainer and the Ranked pages a fresh pre-game MSPC puzzle (Lichess, never one seen before on this device;
              a course position when Lichess cannot be reached) is solved with the four MSPC steps. While it is solved the shuffle pool finishes loading.
              It is asked once a day (the daily ritual, with its own streak), and again only when the pool is not ready yet.
     D. flow  Opening trainer: no manual "Drill it" / "Next line". A new line is learned twice, then drilled; a line with a wrong move goes to the back of the
              queue and is learned and drilled again when the level is done. Uses the Auto-next switch (lc25-auto): OFF = the old manual buttons.
     E. lens  MSPC inside the openings: on every move of the student the drill panel offers Coach Lanckriet's four questions with facts read from the position. */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0].toLowerCase();
  const day=t=>{const d=new Date(t||Date.now());return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
  const face=(emo,size)=>{try{const h=LC61.coachImg(emo||["calm","neutral","happy"],size||44);if(h)return h}catch(e){}return'<span class="lc67-knight" aria-hidden="true">♞</span>'};
  const isOwner=()=>{try{return LC49.owner()}catch(e){return false}};

  /* ============================== A. first-login simulator ============================== */
  const SIM="lc67-sim",BAK="lc67-sim-backup",IDB="lc67",KEEP=["lc67-poolok","lc67-poolbad"];
  const simOn=()=>{try{return localStorage.getItem(SIM)==="1"}catch(e){return false}};
  function idb(mode,val){
    return new Promise(res=>{
      try{
        if(typeof indexedDB==="undefined"||!indexedDB)return res(null);
        const rq=indexedDB.open(IDB,1);let done=false;const end=v=>{if(!done){done=true;res(v)}};
        setTimeout(()=>end(null),2500);
        rq.onupgradeneeded=()=>{try{rq.result.createObjectStore("kv")}catch(e){}};
        rq.onerror=()=>end(null);
        rq.onsuccess=()=>{
          try{
            const tx=rq.result.transaction("kv",mode==="get"?"readonly":"readwrite"),st=tx.objectStore("kv");
            if(mode==="get"){const g=st.get(BAK);g.onsuccess=()=>end(g.result||null);g.onerror=()=>end(null)}
            else if(mode==="set"){st.put(val,BAK);tx.oncomplete=()=>end(true);tx.onerror=()=>end(null)}
            else{st.delete(BAK);tx.oncomplete=()=>end(true);tx.onerror=()=>end(null)}
          }catch(e){end(null)}
        };
      }catch(e){res(null)}
    });
  }
  function dump(store){const o={};try{for(let i=0;i<store.length;i++){const k=store.key(i);o[k]=store.getItem(k)}}catch(e){}return o}
  async function simStart(){
    if(simOn())return false;
    const ls=dump(localStorage),ss=dump(sessionStorage);delete ls[BAK];delete ls[SIM];
    const blob=JSON.stringify({v:1,at:Date.now(),ls:ls,ss:ss});
    const inIdb=await idb("set",blob);                     /* a second copy outside localStorage, in case the tab dies half way */
    const keep={};KEEP.forEach(k=>{if(ls[k]!=null)keep[k]=ls[k]});
    try{
      localStorage.clear();
      localStorage.setItem(BAK,blob);localStorage.setItem(SIM,"1");
      Object.keys(keep).forEach(k=>localStorage.setItem(k,keep[k]));
    }catch(e){
      /* no room for the backup next to nothing else: only go on when the IndexedDB copy exists, else put everything back */
      if(inIdb){try{localStorage.removeItem(BAK);localStorage.setItem(SIM,"1")}catch(x){}}
      else{try{localStorage.clear();Object.keys(ls).forEach(k=>localStorage.setItem(k,ls[k]))}catch(x){}say("Not enough storage on this device to start the simulation. Nothing was changed.","bad");return false}
    }
    try{sessionStorage.clear()}catch(e){}
    reload();return true;
  }
  async function simStop(){
    let blob=null;try{blob=localStorage.getItem(BAK)}catch(e){}
    if(!blob)blob=await idb("get");
    let b=null;try{b=JSON.parse(blob)}catch(e){b=null}
    if(!b||!b.ls){say("The backup of your real state was not found on this device. Nothing was changed: sign in again as the owner to continue.","bad");try{localStorage.removeItem(SIM)}catch(e){}return false}
    try{
      localStorage.clear();
      Object.keys(b.ls).forEach(k=>{try{localStorage.setItem(k,b.ls[k])}catch(e){}});
      sessionStorage.clear();Object.keys(b.ss||{}).forEach(k=>{try{sessionStorage.setItem(k,b.ss[k])}catch(e){}});
    }catch(e){}
    await idb("del");
    reload();return true;
  }
  function reload(){try{if(typeof window.__lc67Reload==="function"){window.__lc67Reload();return}location.hash="";location.reload()}catch(e){}}
  function simBar(){
    if(!simOn()||Q("#lc67-simbar"))return;
    const b=document.createElement("div");b.id="lc67-simbar";b.className="lc67-simbar";b.setAttribute("role","status");
    b.innerHTML='<span><b>Simulation: first login.</b> This device acts as a brand-new visitor. Your real account is untouched.</span><button type="button" class="btn btn-sm" data-lc67="sim-stop">Stop simulation</button>';
    document.body.appendChild(b);
  }
  /* while simulating, nothing may travel to the owner's account, even if the owner signs in again inside the simulation */
  function simGuard(){
    if(!simOn())return;
    try{
      const S=LC26.sync,OWN="lanckrietchess@gmail.com";
      const owner=()=>{try{const s=S.session();return!!s&&String(s.email||"").toLowerCase()===OWN}catch(e){return false}};
      const push=S.push,dirty=S.dirty,flush=S.flush;
      S.push=function(){return owner()?Promise.resolve(false):push.apply(S,arguments)};
      S.dirty=function(){if(!owner())return dirty.apply(S,arguments)};
      S.flush=function(){if(!owner())return flush.apply(S,arguments)};
    }catch(e){}
  }
  function simRow(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc67-sim]",m))return;
    const ref=Q("[data-lc52-replay]",m);if(!ref)return;
    const b=document.createElement("button");b.type="button";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc67-sim","");b.setAttribute("role","switch");b.setAttribute("aria-checked","false");
    b.innerHTML="<span><b>Simulate first login / onboarding</b><small>Restart this device as a brand-new visitor. Stop it to get your real state back.</small></span>";
    ref.insertAdjacentElement("beforebegin",b);
  }
  function simCard(){
    const br=Q("#lc36-brief");if(!br||Q("#lc67-simcard")||simOn())return;
    const c=document.createElement("section");c.id="lc67-simcard";c.className="panel pad lc67-simcard";
    c.innerHTML='<h3>Simulate first login / onboarding</h3><p class="small muted">Restarts this device as a brand-new visitor: not signed in, level 1, start tokens, the first-run questions. Your session, admin mode, level and tier are kept in a backup on this device and come back when you stop the simulation. Use a test e-mail address if you sign in while simulating.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc67="sim-ask">Start the simulation</button></div>';
    br.parentNode.insertBefore(c,br);
  }
  function simAsk(){
    try{
      openSheet({title:"Simulate first login",cls:"lc36-sheet lc67-sheet",noFocus:true,
        html:'<p>This device restarts as a <b>brand-new visitor</b>: not signed in, level 1, start tokens, the first-run questions and the value-first road.</p><ul class="lc67-ul"><li>Your real state (session, admin mode, level, tier, settings) is stored in a backup on this device.</li><li>Nothing is sent to or deleted from the server.</li><li>A bar at the bottom of the screen says <b>Stop simulation</b>: that restores everything and reloads.</li><li>If you test the sign-in step, use a test e-mail address, not the owner address.</li></ul><div class="btn-row"><button type="button" class="btn btn-primary" data-lc67="sim-go">Start the simulation</button></div>'});
    }catch(e){simStart()}
  }

  /* ============================== B. shuffle pool warm-up ============================== */
  const PK="lc67-poolok",PB="lc67-poolbad";
  const pool={todo:null,ok:[],bad:[],seeded:false,fast:false,held:0,timer:0,t0:0,total:0};
  const fnv=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
  const keyOf=x=>x.fen+"|"+x.side+"|"+(isStatic(x)?1:0)+"|"+x.moves.join(" ");
  function poolSeed(){
    if(pool.seeded)return true;
    let items=null;
    try{if(typeof CONTENT==="undefined"||!CONTENT||!CONTENT.courses)return false;items=shufflePool(null,true)}catch(e){return false}
    if(!items||!items.length)return false;
    const ok=new Set(rd(PK,[])||[]),bad=new Set(rd(PB,[])||[]);
    pool.todo=[];pool.ok=[];pool.bad=[];
    items.forEach(x=>{
      if(x.kind==="kpk"||!x.fen||!x.moves)return;
      const k=keyOf(x);if(POOL_OK.get(k)!==undefined)return;
      const h=fnv(k);
      if(ok.has(h)){POOL_OK.set(k,true);pool.ok.push(h)}
      else if(bad.has(h)){POOL_OK.set(k,false);pool.bad.push(h)}
      else pool.todo.push([x,k,h]);
    });
    pool.total=pool.todo.length;pool.seeded=true;
    return true;
  }
  function poolSlice(ms){
    const now=()=>(typeof performance!=="undefined"&&performance.now?performance.now():Date.now()),t=now();let n=0;
    while(pool.todo.length&&(n===0||now()-t<ms)){
      const it=pool.todo.shift(),x=it[0];let good=false;
      try{if(fenOk(x.fen)){const plies=buildDrillPlies(x.fen,x.moves,isStatic(x),x.side);good=plies.length===x.moves.length&&plies.some(p=>p.color===x.side)}}catch(e){good=false}
      POOL_OK.set(it[1],good);(good?pool.ok:pool.bad).push(it[2]);n++;
    }
    if(!pool.todo.length){wr(PK,pool.ok.slice(-4000));wr(PB,pool.bad.slice(-500))}
  }
  function poolTick(){
    pool.timer=0;
    if(!poolSeed()){pool.timer=setTimeout(poolTick,1500);return}
    if(!pool.todo.length)return;
    const hidden=(()=>{try{return document.visibilityState==="hidden"}catch(e){return false}})();
    if(!hidden&&Date.now()>pool.held)poolSlice(pool.fast?22:9);
    if(pool.todo.length)pool.timer=setTimeout(poolTick,pool.fast?12:70);
  }
  function poolStart(fast){if(fast)pool.fast=true;if(!pool.timer)pool.timer=setTimeout(poolTick,fast?0:10)}
  const poolReady=()=>pool.seeded&&!pool.todo.length;
  const poolLeft=()=>pool.seeded?pool.todo.length:-1;

  /* ============================== C. pre-game MSPC puzzle + gate ============================== */
  const RK="lc67-ritual",SEEN="lc67-seen";
  const ritual=()=>Object.assign({day:"",streak:0,best:0,total:0},rd(RK,{})||{});
  const ritualDone=()=>ritual().day===day();
  function ritualMark(clean){
    const r=ritual(),today=day();if(r.day===today)return r;
    const y=day(Date.now()-864e5);
    r.streak=r.day===y?(+r.streak||0)+1:1;r.best=Math.max(+r.best||0,r.streak);r.total=(+r.total||0)+1;r.day=today;r.clean=!!clean;wr(RK,r);
    try{V6.addXp("think",10)}catch(e){}
    try{document.dispatchEvent(new CustomEvent("lc67:ritual",{detail:r}))}catch(e){}
    return r;
  }
  const STEPS=[
    ["M","Move","What did their last move change? What does it threaten?"],
    ["S","Specifics","Which structure or feature matters here? Then: what is your plan?"],
    ["P","Priorities","Checks, captures, attacks: for you and for them."],
    ["C","Calculation","Calculate your line to the end. What is their best reply?"]];
  const PIECE={p:"pawn",n:"knight",b:"bishop",r:"rook",q:"queen",k:"king"};
  /* facts read from the position with chess.js (no engine, no AI): what the coach would point at for each step */
  function facts(fen,last,lastSan){
    const out={M:"",S:"",P:"",C:"Do not play the first move you see. Calculate it until the position is quiet, then check their best reply once more."};
    try{
      const g=new Chess(fen),me=g.turn();
      if(last&&last.to){
        const p=fen.split(" ");p[1]=me==="w"?"b":"w";p[3]="-";
        let hit=[];try{const o=new Chess(p.join(" "));hit=o.moves({square:last.to,verbose:true}).filter(m=>m.captured).map(m=>PIECE[m.captured]+" on "+m.to)}catch(e){}
        out.M="Their last move"+(lastSan?" was "+lastSan:"")+" (marked on the board). "+(g.in_check()?"You are in check: that comes first. ":"")+(hit.length?"That piece now attacks your "+hit.slice(0,3).join(" and your ")+".":"It attacks nothing directly: ask what it prepares and which square it left.");
      }else out.M=g.in_check()?"You are in check: that comes first.":"Start with their idea: what would they play if it were their move again?";
      let al=[];try{al=LC61.detect(fen,me).filter(a=>a.id!=="loose").slice(0,2)}catch(e){}
      out.S=al.length?"Alarm Signal"+(al.length>1?"s":"")+" on the board: "+al.map(a=>a.label).join(" and ")+". "+al[0].say:"No Alarm Signal jumps out. Look at the pawn structure and at your worst-placed piece, then name a plan.";
      const mv=g.moves({verbose:true}),ch=mv.filter(m=>/[+#]/.test(m.san)).length,cp=mv.filter(m=>m.captured).length;
      out.P="You have "+ch+(ch===1?" check":" checks")+" and "+cp+(cp===1?" capture":" captures")+". Look at every one of them before a quiet move.";
    }catch(e){}
    return out;
  }
  const uciOf=m=>m.from+m.to+(m.promotion||"");
  async function withTimeout(p,ms){return Promise.race([p,new Promise(r=>setTimeout(()=>r(null),ms))])}
  /* a fresh Lichess puzzle near the student's rating that this device has not shown before */
  async function freshPuzzle(){
    try{
      if(typeof LC64==="undefined"||!LC64.liOne)return null;
      const seen=rd(SEEN,[])||[],target=(()=>{try{return LC64.rating()}catch(e){return 1500}})();
      const got=await withTimeout(Promise.all([0,1,2,3].map(()=>LC64.liOne("").catch(()=>null))),9000);
      if(!got)return null;
      const list=got.filter(j=>j&&j.puzzle&&j.game&&seen.indexOf(String(j.puzzle.id))<0).map(j=>LC64.puzzleFromJson(j)).filter(Boolean);
      if(!list.length)return null;
      list.sort((a,b)=>Math.abs(a.rating-target)-Math.abs(b.rating-target));
      const P=list[0];seen.push(P.id);wr(SEEN,seen.slice(-300));P.src="lichess";return P;
    }catch(e){return null}
  }
  /* no connection: a course position (free MSPC or middlegame drill), not the one used last time */
  function localPuzzle(){
    try{
      const lastId=rd("lc67-local","");
      const src=[].concat((CONTENT.think||[]).filter(d=>d&&d.fen&&!(typeof isRepPuzzle==="function"&&isRepPuzzle(d))).map(d=>{const st=(d.stages||[]).filter(x=>x&&x.type==="line")[0];return st?{id:"c:"+d.id,fen:d.fen,pgn:st.pgn,lm:d.lastMove,it:d}:null}),
        (CONTENT.middlegame||[]).filter(d=>d&&d.fen&&d.pgn).map(d=>({id:d.id,fen:d.fen,pgn:d.pgn,lm:d.lastMove,it:d}))).filter(Boolean).filter(x=>{try{return App.unlocked(x.it)}catch(e){return true}});
      const cand=src.filter(x=>x.id!==lastId);if(!cand.length)return null;
      for(let tries=0;tries<8;tries++){
        const c=cand[Math.floor(Math.random()*cand.length)],g=new Chess();if(!g.load(c.fen))continue;
        const side=g.turn(),sol=[];let ok=true;
        for(const san of pgnTokens(c.pgn)){const m=g.move(san,{sloppy:true});if(!m){ok=false;break}sol.push(uciOf(m))}
        if(!ok||!sol.length)continue;
        wr("lc67-local",c.id);
        const lm=Array.isArray(c.lm)&&c.lm.length===2?{from:c.lm[0],to:c.lm[1]}:null;
        return{fen:c.fen,solution:sol,orient:side==="w"?"white":"black",side:side,rating:0,themes:[],id:c.id,last:lm,lastSan:"",src:"course"};
      }
    }catch(e){}
    return null;
  }
  /* the puzzle itself: four steps with a live board, then the move. onDone(result) is called once. */
  function runPuzzle(host,P,opts){
    opts=opts||{};let alive=true,step=0,si=0,done=false,x=null,tries=0;
    host.innerHTML='<div class="lc67-pz"><div class="lc67-pzboard" data-lc67-board></div><div class="lc67-pzside"><ol class="lc67-steps" aria-label="MSPC steps">'+STEPS.map((s,i)=>'<li data-i="'+i+'"><b>'+s[0]+'</b><span>'+s[1]+'</span></li>').join("")+'</ol><div data-lc67-step aria-live="polite"></div></div></div>';
    const bhost=Q("[data-lc67-board]",host),box=Q("[data-lc67-step]",host);
    const g=new Chess(P.fen);const F=facts(P.fen,P.last,P.lastSan);
    const board=Board(bhost,{fen:P.fen,orientation:P.orient,onMove:m=>onMove(m)});
    const mark=()=>{try{board.setArrows(si===0&&P.last?[{from:P.last.from,to:P.last.to,kind:"bad"}]:[])}catch(e){}};
    const home=()=>{try{x=new Chess(P.fen);board.setPosition(P.fen,{lastMove:P.last||null});board.setInteractive(x.turn());mark()}catch(e){}};
    const lights=()=>QA(".lc67-steps li",host).forEach((li,i)=>{li.className=i<si?"is-done":i===si&&si<4?"is-now":""});
    function paintStep(){
      lights();
      if(si>=4){
        try{board.setArrows([]);board.setPosition(g.fen(),{lastMove:P.last||null});board.setInteractive(P.side)}catch(e){}
        box.innerHTML='<p class="lc67-q"><b>Now play your move.</b> You ran the full routine: trust it.</p>';return;
      }
      const s=STEPS[si];
      box.innerHTML='<p class="lc67-q"><b>'+esc(s[1])+'.</b> '+esc(s[2])+'</p><details class="lc67-hint"><summary>Coach Lanckriet’s view</summary><p>'+esc(F[s[0]]||"")+'</p></details><p class="small muted">The board is live: try moves for both sides.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc67="step">'+(si===3?"I calculated it: let me move":"Done, next")+'</button><button type="button" class="btn btn-ghost" data-lc67="home" hidden>Back to the position</button></div>';
      home();
    }
    function finish(ok,san){
      if(done)return;done=true;try{board.setInteractive(null)}catch(e){}
      const first=P.solution[0];
      try{if(!ok){board.setPosition(P.fen,{lastMove:P.last||null});board.setArrows([{from:first.slice(0,2),to:first.slice(2,4),kind:"best"}])}}catch(e){}
      const r=ritualMark(ok);
      box.innerHTML='<p class="lc67-q">'+(ok?'<b class="lc67-good">Correct.</b> ':'<b class="lc67-bad">The move was '+esc(san||first)+'.</b> ')+esc(ok?"That is how every rated game should start: four questions, then the move.":"The routine was right, the answer was not yet. That is exactly what the routine is for.")+'</p><p class="small muted">Daily ritual done · streak '+r.streak+(r.streak===1?" day":" days")+(P.src==="lichess"&&P.id?' · <a href="https://lichess.org/training/'+esc(P.id)+'" target="_blank" rel="noopener noreferrer">this puzzle on Lichess</a>':"")+'</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc67="go">'+esc(opts.goLabel||"Continue")+'</button></div>';
      if(typeof opts.onSolved==="function"){try{opts.onSolved({ok:ok,ritual:r})}catch(e){}}
    }
    function onMove(m){
      if(done||!alive)return;
      if(si<4){                                              /* still thinking: a free analysis board */
        try{const r=x.move({from:m.from,to:m.to,promotion:m.promotion||"q"});if(!r){board.setPosition(x.fen());return}
          board.setArrows([]);board.setPosition(x.fen(),{lastMove:{from:r.from,to:r.to}});board.setInteractive(x.game_over()?null:x.turn());
          const b=Q('[data-lc67="home"]',host);if(b)b.hidden=false}catch(e){}
        return;
      }
      const want=P.solution[step],got=uciOf(m);
      if(got===want||got.slice(0,4)===want.slice(0,4)){
        g.move({from:want.slice(0,2),to:want.slice(2,4),promotion:want[4]||"q"});step++;
        const reply=P.solution[step];
        if(!reply){board.setPosition(g.fen(),{lastMove:{from:want.slice(0,2),to:want.slice(2,4)}});finish(true);return}
        board.setInteractive(null);
        setTimeout(()=>{if(!alive||done)return;try{g.move({from:reply.slice(0,2),to:reply.slice(2,4),promotion:reply[4]||"q"});step++;board.setPosition(g.fen(),{lastMove:{from:reply.slice(0,2),to:reply.slice(2,4)}});
          if(step>=P.solution.length){finish(true);return}board.setInteractive(P.side);box.innerHTML='<p class="lc67-q"><b>Right.</b> Keep going: one more move.</p>'}catch(e){finish(true)}},350);
        return;
      }
      tries++;try{board.setPosition(g.fen());board.shake()}catch(e){}
      if(tries<2){box.innerHTML='<p class="lc67-q"><b class="lc67-bad">Not that one.</b> Run P again: every check, every capture. One more try.</p>';return}
      let san="";try{const t=new Chess(g.fen()),mm=t.move({from:want.slice(0,2),to:want.slice(2,4),promotion:want[4]||"q"});san=mm?mm.san:""}catch(e){}
      finish(false,san);
    }
    const onClick=e=>{
      const b=e.target.closest&&e.target.closest("[data-lc67]");if(!b||!host.contains(b))return;
      const a=b.getAttribute("data-lc67");
      if(a==="step"){e.preventDefault();si++;paintStep()}
      else if(a==="home"){e.preventDefault();home();b.hidden=true}
      else if(a==="go"){e.preventDefault();if(typeof opts.onDone==="function")opts.onDone()}
    };
    host.addEventListener("click",onClick);
    paintStep();
    return{destroy(){alive=false;host.removeEventListener("click",onClick);try{board.destroy()}catch(e){}},board:board,_move:onMove,P:P,state:()=>({si:si,step:step,done:done})};
  }
  /* the whole pre-game block inside `host`; calls onDone when the student may go on */
  function pregame(host,opts){
    opts=opts||{};let alive=true,run=null,solved=false,waitT=0;
    host.innerHTML='<section class="panel pad lc67-gate" data-lc67-gate><header class="lc67-gh"><span class="lc67-face">'+face(["serious","thinking","neutral"],48)+'</span><div><h2>Pre-game MSPC puzzle</h2><p class="muted">'+esc(opts.lead||"One fresh position before you play. Run the routine: Move, Specifics, Priorities, Calculation.")+'</p></div></header><div data-lc67-pzhost><p class="muted">Getting a fresh puzzle…</p></div><p class="small muted lc67-load" data-lc67-load></p></section>';
    const ph=Q("[data-lc67-pzhost]",host),ld=Q("[data-lc67-load]",host);
    const proceed=()=>{
      if(!alive)return;
      if(opts.needPool&&!poolReady()){ld.textContent="Almost there: checking your last "+Math.max(1,poolLeft())+" lines…";waitT=setTimeout(proceed,200);return}
      alive=false;if(run)run.destroy();if(typeof opts.onDone==="function")opts.onDone();
    };
    const skipRow=()=>{if(isOwner()&&!Q("[data-lc67='skip']",host)){const p=document.createElement("p");p.className="small";p.innerHTML='<button type="button" class="lc67-lnk" data-lc67="skip">Owner: skip the puzzle</button>';host.firstChild.appendChild(p)}};
    const onClick=e=>{if(e.target.closest&&e.target.closest("[data-lc67='skip']")){e.preventDefault();proceed()}};
    host.addEventListener("click",onClick);skipRow();
    (async()=>{
      let P=await freshPuzzle();if(!alive)return;
      if(!P)P=localPuzzle();
      if(!P){ritualMark(false);ph.innerHTML='<p class="muted">No puzzle could be loaded right now. You can go on.</p>';proceed();return}
      if(P.src==="course")ld.textContent="Lichess could not be reached: this position comes from your course.";
      run=runPuzzle(ph,P,{goLabel:opts.goLabel,onDone:proceed,onSolved:()=>{solved=true;if(opts.auto!==false)waitT=setTimeout(proceed,1400)}});
    })();
    return{destroy(){alive=false;clearTimeout(waitT);host.removeEventListener("click",onClick);if(run)run.destroy()},solved:()=>solved,run:()=>run};
  }
  const gate={
    /* the Shuffle Trainer: the puzzle is shown BEFORE the trainer is built, the pool is checked meanwhile */
    mount(root,mountInner,kind){
      poolStart(true);
      const need=!ritualDone()||!poolReady();
      if(!need)return mountInner();
      let inner,pg=null,dead=false;
      pg=gate._last=pregame(root,{needPool:true,goLabel:"Start the Shuffle Trainer",lead:"Your lines load in the background while you solve one fresh position. Run the routine: Move, Specifics, Priorities, Calculation.",
        onDone(){if(dead)return;root.innerHTML="";try{inner=mountInner()}catch(e){console.error(e)}try{if(typeof LC56!=="undefined")LC56.afterRender("shuffle")}catch(e){}try{afterRender("shuffle")}catch(e){}}});
      return()=>{dead=true;try{pg.destroy()}catch(e){}if(typeof inner==="function"){try{inner()}catch(e){}}};
    },
    ROUTES:{ranked:1,puzzles:1},
    /* the other Ranked pages: once a day, drawn over the page */
    cover(r){
      const v=Q("#view");if(!v)return;
      const old=Q(".lc67-cover",v);
      if(!gate.ROUTES[r]||ritualDone()){if(old)old.remove();v.classList.remove("lc67-gated");if(gate._pg){try{gate._pg.destroy()}catch(e){}gate._pg=null}return}
      if(old)return;
      const c=document.createElement("div");c.className="lc67-cover";v.insertBefore(c,v.firstChild);v.classList.add("lc67-gated");
      gate._pg=pregame(c,{needPool:false,goLabel:"Enter Ranked",lead:"Before Ranked: one fresh position with the full routine. This is your daily ritual, once a day.",
        onDone(){gate._pg=null;c.remove();v.classList.remove("lc67-gated")}});
    },
    _pg:null
  };

  /* ============================== D. opening flow + E. MSPC lens ============================== */
  const WK="lc67-weak";
  const autoOn=()=>{try{const a=rd("lc25-auto",null);return!a||a.on!==false}catch(e){return true}};
  const flow={cur:null,handled:"",timer:0,phase:null,pre:{},
    owns(){const c=flow.cur;return!!(c&&c.topic&&!c.only&&autoOn()&&route()==="openings"&&c.panel&&c.panel.isConnected)},
    cancel(){clearTimeout(flow.timer);flow.timer=0},
    weak(){return rd(WK,{})||{}},
    note(c,html){try{const fb=Q(".st-feedback",c.panel);if(!fb)return;let n=Q(".lc67-flow",c.panel);if(!n){n=document.createElement("p");n.className="lc67-flow";fb.insertAdjacentElement("afterend",n)}n.innerHTML=html}catch(e){}},
    later(c,fn){flow.cancel();flow.timer=setTimeout(()=>{flow.timer=0;try{if(flow.cur&&flow.cur.line&&flow.cur.line.id===c.line.id&&c.panel.isConnected&&route()==="openings"&&!Q(".sheet-wrap"))fn()}catch(e){console.error("lc67 flow",e)}},450)},
    panel(c){
      flow.cur=c;
      try{lens(c)}catch(e){}
      const v=c.v;
      if(!v.finished){flow.handled="";if(c.learn&&flow.pre[c.line.id]===undefined){try{flow.pre[c.line.id]=+LC61.learnPasses(c.line.id)||0}catch(e){flow.pre[c.line.id]=2}}return}
      const key=c.line.id+"|"+(c.learn?1:0);
      if(flow.handled===key)return;flow.handled=key;
      if(c.only||!autoOn())return;
      if(c.learn){
        const pre=flow.pre[c.line.id];delete flow.pre[c.line.id];
        const lp=rd("lc67-lp",{})||{},had=lp[c.line.id]!==undefined;lp[c.line.id]=(+lp[c.line.id]||0)+1;wr("lc67-lp",lp);
        let n=2;if(had||pre===0)n=lp[c.line.id];else if(pre!==undefined)n=pre+1;else{try{n=LC61.learnPasses(c.line.id)}catch(e){}}
        const relearn=!!(flow.phase&&flow.phase.now===c.line.id);
        if(n<2&&!relearn){flow.note(c,"<b>Learn pass "+n+" of 2 done.</b> Once more, then you drill it from memory.");flow.later(c,()=>c.start(c.line,true))}
        else{flow.note(c,relearn?"<b>Seen again.</b> Now drill it from memory.":"<b>Learned twice.</b> Now drill it from memory.");flow.later(c,()=>c.start(c.line,false))}
        return;
      }
      /* a finished drill */
      const clean=!v.total||v.clean>=v.total,w=flow.weak(),id=c.line.id;
      if(clean)delete w[id];else w[id]=(+w[id]||0)+1;
      wr(WK,w);
      if(!c.topic)return;                                    /* no chapter ladder: LC25 presses "Next line" */
      const ids=c.set.map(l=>l.id),ph=flow.phase&&flow.phase.key===ids.join(",")?flow.phase:null;
      if(ph){                                                /* we are re-learning the weak lines of this level */
        ph.tries[id]=(ph.tries[id]||0)+1;
        if(clean||ph.tries[id]>=2)ph.queue=ph.queue.filter(q=>q!==id);else{ph.queue=ph.queue.filter(q=>q!==id);ph.queue.push(id)}
        return flow.nextWeak(c,ph);
      }
      const nx=(()=>{try{return c.next()}catch(e){return null}})();
      const clickNext=()=>flow.later(c,()=>{if(typeof c.goNext==="function"){c.goNext();return}const b=Q('[data-act="next-in-level"]',c.panel);if(b)b.click()});
      if(nx&&!nx.wrapped){
        if(!clean)flow.note(c,"<b>Not clean yet.</b> This line comes back at the end of the level.");
        clickNext();return;
      }
      const queue=ids.filter(q=>w[q]);
      if(!queue.length){if(nx)clickNext();return}           /* other unproven lines first; a clean level: the next level / chapter button stays manual */
      flow.phase={key:ids.join(","),queue:queue,tries:{},now:""};
      flow.nextWeak(c,flow.phase);
    },
    nextWeak(c,ph){
      if(!ph.queue.length){
        flow.phase=null;const w=flow.weak(),left=c.set.filter(x=>w[x.id]).length;
        if(left){flow.note(c,"<b>Weak lines trained twice.</b> "+left+(left===1?" line stays on your list and comes":" lines stay on your list and come")+" back first next time.")}
        else{flow.note(c,"<b>Weak lines done.</b> This level is clean now.");say("Weak lines re-learned. This level is clean.","good")}
        return}
      const id=ph.queue[0],l=c.set.filter(x=>x.id===id)[0];
      if(!l){ph.queue.shift();return flow.nextWeak(c,ph)}
      ph.now=id;
      flow.note(c,"<b>Re-learning a weak line</b> ("+ph.queue.length+" left): first see it again, then drill it.");
      flow.later(c,()=>c.start(l,true));
    }
  };
  /* the MSPC lens: Coach Lanckriet's four questions on the student's move, with facts from the position */
  function lens(c){
    const v=c.v,p=c.panel;if(!p||v.finished||!v.yourTurn||v.replay)return;
    const i=v.idx,prev=i>0?v.plies[i-1]:null;
    let fen="";try{fen=prev?prev.fen:START_FEN}catch(e){fen=""}
    if(!fen||!prev)return;                                   /* move 1: nothing to read yet */
    const F=facts(fen,{from:prev.from,to:prev.to},prev.san),open=rd("lc67-lens",0)?" open":"";
    const d=document.createElement("details");d.className="lc67-lens";if(open)d.open=true;
    d.innerHTML='<summary><span class="lc67-face sm">'+face(["thinking","neutral"],28)+'</span><b>MSPC on this move</b><small>Coach Lanckriet</small></summary><ul><li><b>M</b> '+esc(F.M)+'</li><li><b>S</b> '+esc(F.S)+'</li><li><b>P</b> '+esc(F.P)+'</li><li><b>C</b> '+esc(c.learn?"In Learn mode the move is shown: say out loud why it answers M, S and P.":"Recall the repertoire move, then check it against M, S and P before you play it.")+'</li></ul>';
    d.addEventListener("toggle",()=>wr("lc67-lens",d.open?1:0));
    const fb=Q(".st-feedback",p);if(fb)fb.insertAdjacentElement("afterend",d);else p.appendChild(d);
  }
  /* the card on the Openings page that replaces the separate menu entry */
  function openingsCard(){
    if(route()!=="openings")return;
    const v=Q("#view");if(!v||Q("#lc67-mspc",v))return;
    if(Q(".trainer",v)||Q("#op-title",v))return;            /* only on the overview, not inside a line */
    const c=document.createElement("section");c.id="lc67-mspc";c.className="panel pad lc67-mspc";
    c.innerHTML='<span class="lc67-face">'+face(["calm","neutral"],44)+'</span><div><h3>MSPC runs through your openings</h3><p class="muted small">Theory is not memorising. On every move of a line, open <b>MSPC on this move</b>: what their move changed, what the position asks, your checks and captures, then the repertoire move. New lines are learned twice and drilled by themselves; a line with a mistake comes back at the end.</p></div><a class="btn btn-ghost btn-sm" href="#mspc-rep">Critical moments only</a>';
    const anchor=Q(".lc56-instant-wrap",v)||v.firstElementChild;
    if(anchor&&anchor.parentNode===v)anchor.insertAdjacentElement("afterend",c);else v.insertBefore(c,v.firstChild);
  }

  /* ============================== wiring ============================== */
  function css(){
    if(Q("#lc67-css"))return;
    const s=document.createElement("style");s.id="lc67-css";
    s.textContent=
      ".lc67-simbar{position:fixed;left:8px;right:76px;bottom:8px;z-index:95;display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:14px;background:#fbbf24;color:#1c1400;font-size:13px;line-height:1.3;box-shadow:0 8px 30px rgba(0,0,0,.45)}.lc67-simbar .btn{min-height:44px;background:#0f172a;color:#fff;border-color:#0f172a;flex:0 0 auto}"
      +".lc67-simcard{border:1px solid #fbbf24;margin-bottom:12px}.lc67-ul{margin:8px 0 14px;padding-left:1.1rem;display:grid;gap:6px;color:#cbd5e1;font-size:14px}"
      +"[data-lc67-sim][aria-checked=true] b:after{content:' · ON';color:#fbbf24}"
      +".sh-setup>.sh-matrix{order:-2}.sh-setup>.lc56-shbar{order:-1}.sh-setup.lc56-c>.sh-matrix.sh-matrix{display:grid!important}"
      +".sh-matrix .sh-scopes{grid-template-columns:repeat(2,minmax(0,1fr))!important}.sh-matrix .sh-scope{min-height:92px}"
      +".sh-allrow{margin-top:8px}.sh-allrow .sh-scope{width:100%;min-height:56px;display:grid;grid-template-columns:auto 1fr auto;column-gap:12px;align-items:center;border-style:dashed}.sh-allrow .sh-scope>i{margin:0;grid-row:1 / span 2}.sh-allrow .sh-scope b{grid-column:2}.sh-allrow .sh-scope small{grid-column:2}.sh-allrow .sh-scope small:last-child{grid-column:3;grid-row:1 / span 2}"
      +".lc67-gate{max-width:980px;margin:0 auto}.lc67-gh{display:flex;gap:12px;align-items:center;margin-bottom:12px}.lc67-gh h2{font-size:clamp(19px,4.6vw,24px);margin:0}.lc67-gh p{margin:2px 0 0;font-size:14px}"
      +".lc67-face{flex:0 0 auto;width:48px;height:48px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#0f172a;border:1px solid #38bdf8}.lc67-face.sm{width:28px;height:28px}.lc67-face img{width:100%;height:100%;object-fit:cover}.lc67-knight{color:#38bdf8;font-size:22px}.lc67-face.sm .lc67-knight{font-size:15px}"
      +".lc67-pz{display:grid;gap:14px}@media (min-width:860px){.lc67-pz{grid-template-columns:minmax(0,440px) minmax(0,1fr);align-items:start}}.lc67-pzboard{width:100%;max-width:min(440px,calc(100vh - 300px));margin:0 auto;touch-action:none}"
      +".lc67-steps{list-style:none;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:0 0 10px;padding:0}.lc67-steps li{display:grid;justify-items:center;gap:2px;padding:8px 4px;border-radius:12px;border:1px solid #334155;background:#0f172a;color:#94a3b8;font-size:11.5px}.lc67-steps li b{font-size:17px;color:#cbd5e1}.lc67-steps li.is-now{border-color:#38bdf8;color:#e2e8f0}.lc67-steps li.is-now b{color:#38bdf8}.lc67-steps li.is-done{border-color:#4ade80}.lc67-steps li.is-done b{color:#4ade80}"
      +".lc67-q{margin:0 0 8px;font-size:15.5px;line-height:1.45}.lc67-hint{margin:0 0 8px;border:1px solid #334155;border-radius:12px;padding:8px 12px;background:#0f172a}.lc67-hint summary{cursor:pointer;min-height:28px;color:#38bdf8;font-weight:700}.lc67-hint p{margin:6px 0 2px;color:#cbd5e1;font-size:14px}"
      +".lc67-gate .btn-row .btn{min-height:44px}.lc67-good{color:#4ade80}.lc67-bad{color:#fb7185}.lc67-load:empty{display:none}.lc67-lnk{background:none;border:0;color:#94a3b8;text-decoration:underline;min-height:44px;cursor:pointer}"
      +"#view.lc67-gated>*:not(.lc67-cover){display:none!important}"
      +".lc67-flow{margin:8px 0 0;padding:8px 12px;border-radius:10px;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.35);font-size:14px}"
      +".lc67-lens{margin:8px 0 0;border:1px solid #334155;border-radius:12px;background:#0f172a;padding:0 12px}.lc67-lens summary{display:flex;gap:8px;align-items:center;min-height:44px;cursor:pointer;list-style:none}.lc67-lens summary::-webkit-details-marker{display:none}.lc67-lens summary small{color:#94a3b8;margin-left:auto}.lc67-lens ul{list-style:none;margin:0;padding:0 0 10px;display:grid;gap:6px;font-size:13.5px;color:#cbd5e1}.lc67-lens li b{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:6px;background:#1e293b;color:#38bdf8;margin-right:6px;font-size:12px}"
      +".lc67-mspc{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:0 0 12px;border:1px solid rgba(56,189,248,.35)}.lc67-mspc>div{flex:1 1 240px;min-width:0}.lc67-mspc h3{margin:0 0 2px;font-size:16px}.lc67-mspc .btn{min-height:44px}.lc67-backrow{margin:0 0 8px}"
      +".lc64-live{color:#cbd5e1}.lc64-last{color:#fb7185}";
    document.head.appendChild(s);
  }
  function onDoc(e){
    const t=e.target;if(!t||!t.closest)return;
    if(t.closest("[data-lc67-sim]")){e.preventDefault();e.stopPropagation();try{const m=Q("#lc49-menu");if(m)m.remove()}catch(x){}simAsk();return}
    const b=t.closest("[data-lc67]");if(!b)return;
    const a=b.getAttribute("data-lc67");
    if(a==="sim-stop"){e.preventDefault();b.disabled=true;simStop()}
    else if(a==="sim-ask"){e.preventDefault();simAsk()}
    else if(a==="sim-go"){e.preventDefault();b.disabled=true;simStart()}
  }
  let rT=0;
  function afterRender(r){
    r=r||route();
    if(r!=="openings")flow.cancel();
    clearTimeout(rT);rT=setTimeout(()=>{try{simBar();simRow();simCard();gate.cover(route());openingsCard()}catch(e){}},350);
  }
  function init(){
    css();simBar();simGuard();
    document.addEventListener("click",onDoc,true);
    ["touchstart","mousedown"].forEach(ev=>document.addEventListener(ev,()=>{pool.held=Date.now()+600},{passive:true,capture:true}));
    new MutationObserver(()=>{try{simRow()}catch(e){}}).observe(document.body,{childList:true});
    setTimeout(()=>poolStart(false),5000);
    /* #mspc-rep stays reachable (inside Openings); the level gate treats it like before */
  }
  return{init:init,afterRender:afterRender,sim:{on:simOn,start:simStart,stop:simStop,ask:simAsk},pool:{start:poolStart,ready:poolReady,left:poolLeft,seed:poolSeed,slice:poolSlice,_s:pool},
    gate:gate,flow:flow,ritual:{get:ritual,done:ritualDone,mark:ritualMark},pregame:pregame,runPuzzle:runPuzzle,facts:facts,freshPuzzle:freshPuzzle,localPuzzle:localPuzzle,face:face,STEPS:STEPS,version:"9.34.0"};
})(); /*@@end lc67*/
