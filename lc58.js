const LC58=(()=>{
  "use strict";
  /* LC58 (build 9.31.0): Working Points and evaluation graphs fill themselves from the linked account's recent games.
     Until now this only happened on the first-time road (LC42). Now it runs for every member with a linked Chess.com / Lichess account:
       1. the latest 10 games are fetched (and merged into the Game Library cache `lc42-games`, keeping graphs that already exist);
       2. every game without a graph is analysed with the on-device engine, one at a time, ONLY while the person is not training
          (the same engine is used by the trainers, so the scan waits and resumes); each game keeps its evaluation series (LC52 draws the graph
          in the Game Library) and its own mistake count per MSPC letter;
       3. when the Working Points are empty (fewer than 3), the most frequent MSPC leaks become Working Points, once, with a toast.
     Nothing here uses the network except the game fetch the Library already does, nothing is sent to a server, and a failure never blocks the app.
     Not included on purpose: brilliant (!!) moves. They need a second engine line per candidate move; a wrong "!!" is worse than none. */
  const KG="lc42-games",KS="lc58",MAXG=10,COOL=6*3600*1000,RETRY=90*1000,MAXWAIT=20*60*1000;
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0];
  const ENGINE=new Set(["think","mspc-rep","shuffle","themes","puzzles","vision","survival","bot","clinic","review-queue","ranked","brilliant","middlegame","endgame","openings"]);
  const LETTERS={M:"Move",S:"Specifics",P:"Priorities",C:"Calculation"};
  let running=false,lastTouch=0,t=0;
  const state=()=>Object.assign({at:0,done:0,tot:0,pts:false,fin:false},rd(KS,{}));
  const put=o=>wr(KS,Object.assign(state(),o));
  const same=(a,b)=>String(a&&a.pgn||"").slice(0,200)===String(b&&b.pgn||"").slice(0,200);

  function acct(){
    try{const c=Elo.acct("chesscom");if(c&&c.user)return{site:"chesscom",user:String(c.user)}}catch(e){}
    try{const l=Elo.acct("lichess");if(l&&l.user)return{site:"lichess",user:String(l.user)}}catch(e){}
    try{const p=App.profile||{};if(p.chess_com_username)return{site:"chesscom",user:String(p.chess_com_username)};if(p.lichess_username)return{site:"lichess",user:String(p.lichess_username)}}catch(e){}
    return null;
  }
  /* the engine is shared with the trainers: wait while one is on screen, while a Trim game is open, while a sheet is open or the tab is hidden */
  function busy(){
    try{
      if(document.hidden)return true;
      const r=route();
      if(ENGINE.has(r))return true;
      if(r==="trim"){const b=Q("#an-review-bar");if(b&&b.offsetParent!==null)return true;const m=Q("#an-meta");if(m&&m.textContent.trim())return true;if(Date.now()-lastTouch<8000)return true}
      if(Q("#view .trainer"))return true;
    }catch(e){}
    return false;
  }
  async function fetchGames(a){
    const list=await LC39._t.games(a.site,a.user,MAXG);
    return(list||[]).slice(0,MAXG).map(x=>({pgn:String(x.pgn||"").slice(0,20000),color:x.color==="b"?"b":"w",res:x.res||"",opp:x.opp||"",t:+x.t||0})).filter(x=>x.pgn);
  }
  function merge(fresh){
    const old=rd(KG,[])||[];
    const out=fresh.map(g=>{const o=old.filter(x=>same(x,g))[0];return o?Object.assign({},g,o.ev?{ev:o.ev}:{},o.lk?{lk:o.lk}:{}):g});
    wr(KG,out);return out;
  }
  function saveGame(x,items){
    try{
      const all=rd(KG,[])||[],k=all.findIndex(y=>same(y,x));if(k<0)return;
      if(items&&items.series&&items.series.length)all[k].ev=items.series;
      const lk={};(items||[]).forEach(it=>{if(it&&it.color===x.color&&(it.cls==="blunder"||it.cls==="mistake")){const l=LETTERS[it.k]?it.k:"S";lk[l]=(lk[l]||0)+1}});
      all[k].lk=lk;wr(KG,all);
    }catch(e){}
  }
  function repaint(){
    try{QA("[data-lc52-spark]").forEach(s=>{if(!s.querySelector("svg"))s.removeAttribute("data-done")});if(typeof LC52!=="undefined"&&LC52.paintSparks)LC52.paintSparks()}catch(e){}
  }
  function fillPoints(){
    try{
      const all=rd(KG,[])||[],L={};
      all.forEach(g=>{if(g&&g.lk)Object.keys(g.lk).forEach(k=>{if(LETTERS[k])L[k]=(L[k]||0)+g.lk[k]})});
      const keys=Object.keys(L).sort((a,b)=>L[b]-L[a]);if(!keys.length)return false;
      const before=Framework.active().length;if(before>=3)return false;
      for(const k of keys.slice(0,3)){if(Framework.active().length>=3)break;try{Framework.coachAdd(k,null,{sev:2,freq:L[k]>=3?3:2,pers:2})}catch(e){}}
      const now=Framework.active().length;if(now<=before)return false;
      put({pts:true});
      const done=all.filter(g=>g&&g.lk).length;
      try{toast("I went through your last "+done+(done===1?" game":" games")+" and filled in your Working Points: "+keys.slice(0,now-before).map(k=>LETTERS[k]).join(", ")+".","good")}catch(e){}
      try{if(route()==="system")rerender()}catch(e){}
      return true;
    }catch(e){return false}
  }
  async function run(force){
    if(running)return;
    const a=acct();if(!a)return;
    try{if(typeof LC42!=="undefined"&&LC42.owns&&LC42.owns())return}catch(e){}
    if(rd("lc58-off",0))return;
    const s=state();
    if(!force&&(s.fin?Date.now()-s.at<COOL:Date.now()-s.at<RETRY))return;
    running=true;window.__lc58={running:true};
    const t0=Date.now();
    try{
      let games=null;try{games=await fetchGames(a)}catch(e){games=null}
      games=games&&games.length?merge(games):(rd(KG,[])||[]);
      if(!games.length){put({at:Date.now(),fin:true});return}
      const todo=games.filter(x=>!(x.ev&&x.ev.length)||!x.lk);
      put({at:Date.now(),tot:games.length,done:games.length-todo.length,fin:!todo.length});
      if(!todo.length){fillPoints();return}
      const S=LC80.scan;let n=0;
      for(const x of todo){
        let items=null,tries=0;
        for(;;){
          while(busy()){if(Date.now()-t0>MAXWAIT)return;await sleep(2500)}
          try{
            if(!(await Engine.load()))throw new Error("engine");
            const g=S.parseGame(x.pgn);if(!g)break;
            g.color=x.color;items=await S.analyseGame(g,()=>{},()=>busy());break;
          }catch(e){
            const m=String(e&&e.message);
            if(/cancelled|superseded/.test(m)&&tries++<40){await sleep(2500);continue}
            if(/engine/.test(m))throw e;
            items=null;break;
          }
        }
        if(items){saveGame(x,items);n++;put({done:Math.min(games.length,state().done+1),at:Date.now()});repaint();if(n>=3||n===todo.length)fillPoints()}
      }
      put({fin:true,at:Date.now()});fillPoints();
    }catch(e){/* engine missing or offline: the next visit tries again */}
    finally{running=false;window.__lc58={running:false};repaint()}
  }
  function maybe(){
    clearTimeout(t);
    t=setTimeout(()=>{try{if(!document.hidden)run(false)}catch(e){}},1800);
  }
  let on=false;
  function init(){
    if(on)return;on=true;window.__lc58={running:false};
    document.addEventListener("touchstart",()=>{lastTouch=Date.now()},{passive:true,capture:true});
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)maybe()});
    setTimeout(()=>{try{run(false)}catch(e){}},9000);
  }
  function afterRender(r){if(/^(home|quests|system|account|ratings|trim|insights)$/.test(r||route()))maybe()}
  return{init:init,afterRender:afterRender,run:run,busy:busy,acct:acct,state:state,fillPoints:fillPoints,version:"9.31.0"};
})();
