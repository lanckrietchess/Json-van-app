const LC52=(()=>{
  "use strict";
  /* LC52 (build 9.25.0): ONE first-run road for everybody, the Game Library you can see, and the tools that tell you which build you are looking at.
     1. connecting Chess.com / Lichess anywhere (first-run questions OR the "connect your account" pop-up) starts the same road (LC42): first-win card, silent import + Trim
        of the whole game, the other 9 games in the background. The old quick-win card (text-glyph board) is only used by people who already have real progress.
     2. Game Library (on the Trim page): works with the name from the first-run questions too, is always visible, and every game shows a small evaluation graph
        (when it has been analysed) that previews the position under your finger or mouse.
     3. owner tools: replay the onboarding as a brand-new member on this device, check for a newer build, and a warning when the page is a frozen Vercel preview. */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.prototype.slice.call((r||document).querySelectorAll(s));
  const E=s=>{try{return esc(s)}catch(e){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}};
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const xp=()=>{try{return LC26.sync.snapshot().xp||0}catch(e){return 0}};
  const ver=()=>{try{return String(CONFIG.assetVersion||"")}catch(e){return""}};
  const replaying=()=>!!rd("lc52-replay",0);
  /* somebody who has no real progress yet (or the owner replaying the road) */
  const owner=()=>{try{return !!LC49.ownerAccount()}catch(e){return false}};
  const firstTimeish=()=>{try{const o=rd("lc42-onb",{})||{};if(o.step==="done")return false}catch(e){}return replaying()||owner()||xp()<300};   /* the owner always gets the new road until he has been through it once */

  /* ---------- 1. one road ---------- */
  function wrapMicro(){
    try{
      const M=LC36.micro;if(!M||typeof M.offer!=="function"||M.offer.__lc52)return;
      const prev=M.offer;
      const f=function(site,user){
        try{
          user=String(user||"").trim();
          if(user&&typeof LC42!=="undefined"&&!LC42.owns()&&firstTimeish()){
            const h=(site==="lichess"||site==="li")?{li:user}:{cc:user};
            if(LC42.begin(h))return true;               /* the same road as the first-run questions */
          }
        }catch(e){console.error("lc52",e)}
        return prev.apply(this,arguments);
      };
      f.__lc52=true;M.offer=f;
    }catch(e){console.error("lc52",e)}
  }
  /* "Analyze the whole game" on any card, also an old one: never a dead end */
  async function openLatest(){
    try{
      const p=App.profile||{};let site="chesscom",user=p.chess_com_username||"";
      if(!user&&p.lichess_username){site="lichess";user=p.lichess_username}
      if(!user){try{const a=Elo.acct("chesscom")||Elo.acct("lichess");if(a&&a.user){user=a.user;site=Elo.acct("chesscom")?"chesscom":"lichess"}}catch(e){}}
      if(!user){location.hash="#ratings";return false}
      const gs=await LC39._t.games(site,user,1),g=gs&&gs[0];
      if(!g||!g.pgn){toast("I could not load a recent game for "+user+". Check the username in your account.","bad");return false}
      App.ui.trimLoad={pgn:String(g.pgn).slice(0,60000),id:null,user:g.color==="b"?"b":"w",review:true};
      location.hash="#trim";return true;
    }catch(e){return false}
  }
  function onClickFull(e){
    const t=e.target&&e.target.closest?e.target.closest("[data-lc42-full]"):null;if(!t)return;
    try{if(LC42.owns())return}catch(x){}                       /* LC42 handles its own road */
    e.preventDefault();e.stopPropagation();
    const sh=t.closest(".sheet-wrap"),c=sh&&sh.querySelector("[data-close]");if(c)c.click();
    openLatest();
  }

  /* ---------- 2. the Game Library: hover preview + evaluation graph ---------- */
  const SPARK_W=120,SPARK_H=26;
  const clip=v=>Math.max(-800,Math.min(800,Math.round(v)));
  function sparkSVG(ev){
    const n=ev.length;if(n<3)return"";
    const pts=ev.map((v,i)=>[(i/(n-1))*SPARK_W,SPARK_H/2-(clip(v)/800)*(SPARK_H/2-2)]);
    const up=pts.map(p=>p[0].toFixed(1)+","+Math.min(SPARK_H/2,p[1]).toFixed(1)).join(" ");
    const line=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
    return'<svg viewBox="0 0 '+SPARK_W+' '+SPARK_H+'" width="'+SPARK_W+'" height="'+SPARK_H+'" aria-hidden="true"><rect width="'+SPARK_W+'" height="'+SPARK_H/2+'" fill="rgba(226,232,240,.10)"/><rect y="'+SPARK_H/2+'" width="'+SPARK_W+'" height="'+SPARK_H/2+'" fill="rgba(2,6,23,.55)"/><path d="'+line+'" fill="none" stroke="#38bdf8" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  }
  const pieceImg=p=>{try{return pieceUrl(p)}catch(e){return""}};
  function boardPreview(fen,flip){
    const rows=String(fen||"").split(" ")[0].split("/");if(rows.length!==8)return"";
    let out="";
    for(let r=0;r<8;r++){const rr=flip?7-r:r;const row=[];rows[rr].split("").forEach(c=>{if(/\d/.test(c))for(let i=0;i<+c;i++)row.push("");else row.push(c)});
      for(let f=0;f<8;f++){const ff=flip?7-f:f,p=row[ff],light=((rr+ff)%2===0);
        const code=p?(p===p.toUpperCase()?"w":"b")+p.toUpperCase():"";
        out+='<i class="lc52-sq '+(light?"l":"d")+'">'+(code?'<img src="'+E(pieceImg(code))+'" alt="" loading="lazy" decoding="async">':"")+"</i>"}}
    return'<div class="lc52-pvboard">'+out+"</div>";
  }
  /* the FEN after `ply` half-moves of a PGN (cached per game) */
  const fenCache={};
  function fenAt(pgn,ply){
    try{
      let a=fenCache[pgn];
      if(!a){const ch=new Chess();if(!ch.load_pgn(pgn))return"";const h=ch.history({verbose:true}),b=new Chess();a=[b.fen()];h.forEach(m=>{b.move(m.san);a.push(b.fen())});fenCache[pgn]=a}
      return a[Math.max(0,Math.min(a.length-1,ply))]||"";
    }catch(e){return""}
  }
  function seriesFor(g){
    try{
      const all=rd("lc42-games",[])||[];
      const k=String(g.pgn||"").slice(0,160);
      const hit=all.filter(x=>x&&x.ev&&(String(x.pgn||"").slice(0,160)===k||(+x.t&&+x.t===+g.t)))[0];
      return hit&&Array.isArray(hit.ev)?hit.ev:null;
    }catch(e){return null}
  }
  /* the stored series is for plies i0..n of the game; spread over the whole width */
  function paintSparks(){
    try{
      const lib=Q("#lc39-lib");if(!lib)return;
      const rows=QA("[data-lc39-game]",lib);if(!rows.length)return;
      const list=window.__lc52list||[];
      rows.forEach(b=>{
        const sp=Q("[data-lc52-spark]",b);if(!sp||sp.getAttribute("data-done"))return;
        const g=list[+b.getAttribute("data-lc39-game")];if(!g)return;
        const ev=seriesFor(g);
        sp.setAttribute("data-done","1");
        if(ev){sp.innerHTML=sparkSVG(ev);sp.setAttribute("data-lc52-ev",ev.join(","));sp.title="Evaluation during the game. Move over it to see the position."}
        else sp.innerHTML='<small class="muted">no graph yet</small>';
      });
    }catch(e){}
  }
  let pv=null;
  function pvShow(x,y,g,ply,evv){
    if(!pv){pv=document.createElement("div");pv.id="lc52-pv";pv.className="lc52-pv";pv.setAttribute("role","tooltip");document.body.appendChild(pv)}
    const fen=fenAt(g.pgn,ply);if(!fen)return;
    pv.innerHTML=boardPreview(fen,g.color==="b")+'<div class="lc52-pvcap"><b>'+(ply===0?"Start":"Move "+Math.ceil(ply/2)+(ply%2?"":"…"))+'</b>'+(evv!=null?'<span>'+(evv>=0?"+":"")+(evv/100).toFixed(1)+'</span>':"")+'</div>';
    const w=190,vw=window.innerWidth,vh=window.innerHeight;
    pv.style.left=Math.max(8,Math.min(vw-w-8,x-w/2))+"px";pv.style.top=Math.max(8,Math.min(vh-240,y-228))+"px";pv.hidden=false;
  }
  const pvHide=()=>{if(pv)pv.hidden=true};
  function onMove(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    const row=t.closest("[data-lc39-game]");if(!row){pvHide();return}
    const g=(window.__lc52list||[])[+row.getAttribute("data-lc39-game")];if(!g)return;
    const sp=t.closest("[data-lc52-spark]");
    const total=(()=>{try{const ch=new Chess();ch.load_pgn(g.pgn);return ch.history().length}catch(x){return 0}})();
    if(sp&&sp.getAttribute("data-lc52-ev")){
      const r=sp.getBoundingClientRect(),cx=(e.touches&&e.touches[0]?e.touches[0].clientX:e.clientX),frac=Math.max(0,Math.min(1,(cx-r.left)/Math.max(1,r.width)));
      const ev=sp.getAttribute("data-lc52-ev").split(",").map(Number),i=Math.round(frac*(ev.length-1));
      const ply=Math.round(frac*total);pvShow(r.left+frac*r.width,r.top,g,ply,ev[i]);
    }else{
      const r=row.getBoundingClientRect();pvShow(r.left+r.width/2,r.top,g,total,null);      /* the final position */
    }
  }
  /* LC39 builds the rows from this list: keep a copy so the graph and the preview know which game is which */
  function hookLibrary(){
    try{
      if(!LC39._t||LC39._t.__lc52)return;
      const g=LC39._t.games;
      LC39._t.games=async function(){const r=await g.apply(this,arguments);try{if(arguments[2]>=10)window.__lc52list=r}catch(e){}return r};
      LC39._t.__lc52=true;
    }catch(e){}
  }

  /* ---------- 3. owner tools ---------- */
  function hardReset(){
    const done=()=>{location.replace(location.pathname+"?fresh="+Date.now()+(location.hash||""))};
    try{
      const p=[];
      if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations)p.push(navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))));
      if(window.caches&&caches.keys)p.push(caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k)))));
      Promise.all(p).then(done,done);
    }catch(e){done()}
  }
  async function checkUpdate(){
    let remote="";
    try{const r=await fetch("version.json?ts="+Date.now(),{cache:"no-store"});if(r.ok){const j=await r.json();remote=String(j&&j.build||"")}}catch(e){}
    const mine=ver(),host=location.hostname;
    const preview=/\.vercel\.app$/.test(host)&&host!=="lanckrietchess-app.vercel.app";
    let html='<p>This page runs build <b>'+E(mine)+'</b> from <b>'+E(host)+'</b>.</p>';
    if(!remote)html+='<p class="small muted">The server did not answer with the newest build number. Check your connection.</p>';
    else if(remote!==mine)html+='<p><b>Build '+E(remote)+' is on the server.</b> You are looking at an older copy kept by this browser.</p>';
    else html+='<p>That is the newest build on the server.</p>';
    if(preview)html+='<p class="lc52-warn"><b>This is a frozen preview link</b>, not your live site. A preview never changes after it was built. Open <a href="https://www.lanckrietchess.com/app.html">www.lanckrietchess.com/app.html</a>.</p>';
    html+='<div class="btn-row"><button type="button" class="btn btn-primary" data-lc52-reset>Load the newest build now</button><button type="button" class="btn btn-quiet" data-close>Close</button></div>';
    openSheet({title:"Which build is this?",cls:"lc52-sheet",noFocus:true,html:html,onMount(s){s.el.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("[data-lc52-reset]")){e.preventDefault();hardReset()}})}});
  }
  function previewBar(){
    try{
      const host=location.hostname;
      if(!(/\.vercel\.app$/.test(host)&&host!=="lanckrietchess-app.vercel.app"))return;
      if(Q("#lc52-prev"))return;
      const b=document.createElement("div");b.id="lc52-prev";b.className="lc52-prev";b.setAttribute("role","alert");
      b.innerHTML='<b>Frozen preview link.</b> This copy never updates. Open <a href="https://www.lanckrietchess.com/app.html">www.lanckrietchess.com/app.html</a> for the live app.';
      document.body.insertBefore(b,document.body.firstChild);
    }catch(e){}
  }
  function replay(){
    openSheet({title:"Replay the onboarding",cls:"lc52-sheet",noFocus:true,
      html:'<p>This starts the first-run road again <b>on this device</b>, as a brand-new member would see it: the questions, the first-win card, the Trim, the working points, the Game Library.</p><p class="small muted">Nothing in your account is deleted. Only the progress of the road on this device is reset (Level 1 and the first-run answers).</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc52-go>Start over</button><button type="button" class="btn btn-quiet" data-close>Cancel</button></div>',
      onMount(s){s.el.addEventListener("click",e=>{
        if(!(e.target.closest&&e.target.closest("[data-lc52-go]")))return;
        e.preventDefault();
        ["lc42-onb","lc42-games","lc50-pre","lc50-batch","lc50-meta","lc39-q","lc39-mail"].forEach(k=>{try{Store.del(k)}catch(x){}});
        try{Object.keys(localStorage).filter(k=>/(^|:)lc39-qw:/.test(k)).forEach(k=>localStorage.removeItem(k))}catch(x){}
        wr("lc52-replay",1);
        try{wr("lc19-sw",{on:true,level:1,base:xp(),t0:Date.now()})}catch(x){}
        try{App.onboarded=false;App.save()}catch(x){}
        s.close();
        setTimeout(()=>{try{location.hash="#home";rerender()}catch(x){}setTimeout(()=>{try{if(!(window.LC80&&LC80.firstRun&&LC80.firstRun()))openOnboarding(true)}catch(x){}},400)},300);
      })}});
  }
  /* the replay ends with the road */
  let spT=0;
  function afterRender(){
    previewBar();setTimeout(paintSparks,250);
    try{const h=(location.hash||"").replace(/^#/,"").split(/[\/?]/)[0].toLowerCase();if(h==="trim"){let n=0;clearInterval(spT);spT=setInterval(()=>{paintSparks();if(++n>12)clearInterval(spT)},700)}}catch(e){}
    try{if(replaying()&&(rd("lc42-onb",{})||{}).step==="done")wr("lc52-replay",0)}catch(e){}
  }
  function css(){
    if(Q("#lc52-css"))return;const s=document.createElement("style");s.id="lc52-css";
    s.textContent='.lc52-spark{display:inline-flex;align-items:center;margin:0 10px;min-width:120px;color:var(--fog)}.lc52-spark svg{display:block;border-radius:6px;border:1px solid var(--hair)}.lc39-g{align-items:center}'
    +'.lc52-pv{position:fixed;z-index:1400;width:190px;padding:8px;border-radius:12px;background:var(--surface);border:1px solid var(--rule);box-shadow:0 14px 36px rgba(2,6,23,.6);pointer-events:none}'
    +'.lc52-pvboard{display:grid;grid-template-columns:repeat(8,1fr);aspect-ratio:1;border-radius:6px;overflow:hidden}.lc52-sq{position:relative;display:block}.lc52-sq.l{background:#e8dcc4}.lc52-sq.d{background:#b58863}.lc52-sq img{position:absolute;inset:0;width:100%;height:100%}'
    +'.lc52-pvcap{display:flex;justify-content:space-between;margin-top:6px;font-size:12.5px}.lc52-pvcap span{font-weight:800;color:#38bdf8}'
    +'.lc52-prev{position:sticky;top:0;z-index:2000;padding:8px 12px;background:#7f1d1d;color:#fee2e2;font-size:13px;text-align:center}.lc52-prev a,.lc52-warn a{color:#fff;text-decoration:underline}'
    +'.lc52-warn{border:1px solid #f87171;border-radius:10px;padding:10px;background:rgba(127,29,29,.35)}'
    +'.lc52-card{display:grid;gap:10px}.lc52-kick{margin:0;font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#38bdf8}.lc52-h{margin:0;font-size:1.25rem;line-height:1.3}.lc52-lead{margin:0;color:var(--fog)}'
    +'.lc52-boardwrap{width:min(100%,440px);margin:2px auto;padding:10px;border-radius:16px;background:linear-gradient(160deg,#1e293b,#0f172a);border:1px solid var(--rule);box-shadow:0 14px 36px rgba(2,6,23,.55)}.lc52-board{width:100%}'
    +'.lc52-fb{margin:0;min-height:1.4em;font-weight:600}.lc52-why{display:grid;gap:4px;padding:12px 14px;border-radius:12px;background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.35)}.lc52-why h4{margin:6px 0 0;font-size:.95rem;color:#7dd3fc}.lc52-why p{margin:0}.lc52-next{margin-top:6px!important}'
    +'.lc52-act .btn{min-height:44px}.lc52-bg{margin:0}';
    document.head.appendChild(s);
  }
  function init(){
    try{
      css();wrapMicro();hookLibrary();previewBar();
      document.addEventListener("click",onClickFull,true);
      document.addEventListener("mouseover",onMove,true);document.addEventListener("mousemove",onMove,true);
      document.addEventListener("touchstart",onMove,{passive:true,capture:true});document.addEventListener("touchmove",onMove,{passive:true,capture:true});
      document.addEventListener("touchend",pvHide,true);
      document.addEventListener("mouseout",e=>{if(!(e.relatedTarget&&e.relatedTarget.closest&&e.relatedTarget.closest("[data-lc39-game]")))pvHide()},true);
      document.addEventListener("click",pvHide,true);
    }catch(e){console.error("lc52",e)}
  }
  return{init:init,afterRender:afterRender,replay:replay,checkUpdate:checkUpdate,hardReset:hardReset,openLatest:openLatest,firstTimeish:firstTimeish,replaying:replaying,sparkSVG:sparkSVG,fenAt:fenAt,paintSparks:paintSparks,_t:{boardPreview:boardPreview,seriesFor:seriesFor}};
})();
