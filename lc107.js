/*@@module lc107*/
const LC107=(()=>{
  "use strict";
  /* LC107 (build 9.75.0): the road after the first review.
     1. The gift: the "Game done" card of the first review (LC42) ends with "Your gift: the 2000 Elo Roadmap" for the player's own
        rating (Kyenzo's five segment videos, the same links as the landing page: lc89_cfg 'segvideo', LC98), with "Watch my
        roadmap" and "Install the app" (the native prompt, the 2 steps on an iPhone, or "open in Chrome / Safari" inside
        Instagram / TikTok, where nothing can be installed).
     2. The Library: #roadmap (the five videos, the player's own first) and a card on top of #books, so the roadmap is always one tap
        away, also for people who skipped it after the review.
     3. One sale at a time, after value, never in the first review:
          9.76.0: only AFTER LC90's Day-7 pop-up was shown (the offers are spread: the Sprint bonus right after the onboarding
          quest, the trial in the Day-7 pop-up, then trial and book come back at the reviews, the one-time €25 month at the trial end).
          after a game review (Trim, a review with key moments): one card in the report, right after the first key moment when there are
          three or more (mid-review), otherwise at its end. A free player who can still start the trial gets "Try Pro free", taking
          turns with the book; a player whose trial is used gets the book; paying members get nothing.
          after the Day-7 pop-up, no trial started, no purchase: one LC88 step for the book.
        The book is an LC70 Library item: id "roadmap-2000" (or the first pinned, live book with a euro price and a Payment Link).
        Until Kyenzo adds it there, only the trial card shows. */
  const VERSION="9.76.0",W=window,D=document;
  const Q=(s,r)=>(r||D).querySelector(s),QA=(s,r)=>[].slice.call((r||D).querySelectorAll(s));
  const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ic=n=>{try{return typeof icon==="function"?icon(n)+" ":""}catch(e){return""}};
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const ls={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  const DAY=864e5,K_CFG="lc107-seg",K_BOOKX="lc107-bookx",K_CARDS="lc107-cards";
  const SEGS=[["0-800","0 - 800 Elo",0,800],["800-1200","800 - 1200 Elo",800,1200],["1200-1600","1200 - 1600 Elo",1200,1600],["1600-2000","1600 - 2000 Elo",1600,2000],["2000-plus","2000+ Elo",2000,99999]];
  const BOOK_ID="roadmap-2000";

  /* ---------- pure (tested) ---------- */
  function segOf(r){r=+r;if(!Number.isFinite(r)||r<=0)return"";for(const s of SEGS)if(r<s[3])return s[0];return"2000-plus"}
  function ytId(u){const m=/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/.exec(String(u||""));return m?m[1]:""}
  /* which sale card after a review: trial while it can still start (taking turns with the book), else the book, else nothing */
  function pickCard(o){
    if(!o||o.member)return"";
    const book=!!o.book&&!o.bookOwned;
    if(o.trial&&book)return(+o.n||0)%2?"book":"trial";
    if(o.trial)return"trial";
    return book?"book":"";
  }

  /* ---------- state ---------- */
  let CFG=ls.get(K_CFG,null),BOOK=null,bookAt=0,cur="";
  const member=()=>{try{if(Admin.active&&Admin.preview&&Admin.preview())return Admin.preview()!=="free"}catch(e){}
    try{if(typeof App.isPro==="function")return !!App.isPro()}catch(e){}try{return String(App.access&&App.access.tier||"free")!=="free"}catch(e){return false}};
  const trialOk=()=>{try{return typeof LC97==="undefined"||!LC97.trialEligible||LC97.trialEligible()!==false}catch(e){return true}};
  const standalone=()=>{try{return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}catch(e){return false}};
  const iab=()=>{try{return W.__lcIab==="soft"||!!(W.LC87&&W.LC87.isIab&&W.LC87.isIab())}catch(e){return false}};
  function rating(){
    try{const e=+(App.profile&&App.profile.elo);if(e>0)return e}catch(e){}
    try{const s=typeof LC106!=="undefined"&&LC106.state();if(s&&+(s.now||s.rating)>0)return+(s.now||s.rating)}catch(e){}
    try{for(const site of["chesscom","lichess"]){const a=Elo.acct(site);if(a&&+a.rating>0)return+a.rating}}catch(e){}
    return 0;
  }
  async function loadCfg(force){
    if(!force&&CFG&&Date.now()-(+CFG.at||0)<DAY)return CFG;
    try{
      const r=await LC26.sync.http("/rest/v1/rpc/lc89_cfg_public",{method:"POST",body:JSON.stringify({p_k:"segvideo"})});
      let v=r&&r.status===200?r.data:null;if(v&&v.v)v=v.v;if(Array.isArray(v))v=v[0];
      if(v&&v.segs){CFG={at:Date.now(),segs:v.segs};ls.set(K_CFG,CFG)}
    }catch(e){}
    return CFG;
  }
  const live=()=>SEGS.filter(s=>{const x=CFG&&CFG.segs&&CFG.segs[s[0]];return x&&x.live!==false&&ytId(x.url)});
  const mySeg=()=>{const s=segOf(rating());return live().some(x=>x[0]===s)?s:(live()[0]||[""])[0]};
  const label=id=>(SEGS.find(s=>s[0]===id)||[,""])[1];

  /* ---------- 1. the gift and the install button ---------- */
  function giftHTML(){
    const s=mySeg();if(!s)return"";
    return'<div class="lc107-gift" data-lc107-gift><p class="lc107-k">'+ic("gift")+"Your gift for finishing your first review</p>"
      +"<p><b>The 2000 Elo Roadmap</b>, the video for your level ("+E(label(s))+"): where you stand, what most advice gets wrong, the system that works and how to train it in this app.</p>"
      +'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc107="watch" data-seg="'+E(s)+'">'+ic("circle-play")+"Watch my roadmap</button>"
      +(standalone()?"":'<button type="button" class="btn btn-ghost" data-lc107="install">'+ic("download")+"Install the app</button>")+"</div>"
      +'<p class="small muted">No time now? It stays in your Library: <a href="#roadmap">The 2000 Elo Roadmap</a>.</p></div>';
  }
  function playerHTML(id){
    const x=CFG&&CFG.segs&&CFG.segs[id],v=x&&ytId(x.url);
    return v?'<div class="lc107-player"><iframe title="The 2000 Elo Roadmap: '+E(label(id))+'" src="https://www.youtube-nocookie.com/embed/'+v+'?rel=0&playsinline=1" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>'
      :'<p class="muted">This video is not online yet.</p>';
  }
  function chips(sel){return'<div class="lc107-chips" role="group" aria-label="Rating">'+live().map(s=>'<button type="button" class="btn btn-sm '+(s[0]===sel?"btn-primary":"btn-quiet")+'" data-lc107-seg="'+s[0]+'" aria-pressed="'+(s[0]===sel)+'">'+E(s[1])+"</button>").join("")+"</div>"}
  async function watch(id){
    await loadCfg();id=id||mySeg();if(!id){say("The roadmap videos are not online yet.");return}
    try{Telemetry.log({e:"lc107",x:"watch-"+id})}catch(e){}
    if(typeof openSheet!=="function"){location.hash="#roadmap";return}
    openSheet({title:"The 2000 Elo Roadmap",cls:"lc107-sheet",noFocus:true,
      html:'<div class="lc107" data-lc107-box>'+chips(id)+'<div data-lc107-play>'+playerHTML(id)+"</div>"
        +'<p class="small muted">All five videos stay in your Library under <a href="#roadmap" data-close>The 2000 Elo Roadmap</a>.</p>'
        +(standalone()?"":'<div class="btn-row"><button type="button" class="btn btn-ghost" data-lc107="install">'+ic("download")+"Install the app</button></div>")+"</div>"});
  }
  function install(){
    if(standalone()){say("You are already in the app.");return}
    try{Telemetry.log({e:"lc107",x:"install"})}catch(e){}
    if(iab()){   /* Instagram / TikTok cannot install anything: open the same review in Chrome / Safari first */
      let u=location.href;try{const r=String(LC94._t.resumeUrl()||"");if(r)u=/^https?:/.test(r)?r:location.origin+r}catch(e){}
      try{W.LC87.out(u);return}catch(e){location.href=u;return}
    }
    const bip=W.__lcBip;
    if(bip&&typeof bip.prompt==="function"){try{bip.prompt();bip.userChoice&&bip.userChoice.then(c=>{if(c&&c.outcome==="accepted"){W.__lcBip=null;say("Installing…","good")}})}catch(e){}return}
    const ios=!!(W.LC87&&W.LC87.ios);
    if(typeof openSheet!=="function"){say(ios?"Tap Share, then Add to Home Screen.":"Open your browser menu and tap Install app.");return}
    openSheet({title:"Install the app",cls:"lc107-sheet",noFocus:true,html:'<ol class="lc107-steps">'+(ios
      ?"<li>Tap <b>Share</b> (the square with the arrow; in Safari 26 it is behind <b>⋯</b>).</li><li>Choose <b>Add to Home Screen</b>.</li>"
      :"<li>Open your browser menu (<b>⋮</b> top right).</li><li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li>")+"</ol><p class=\"small muted\">Your games and progress come along.</p>"});
  }

  /* ---------- 2. #roadmap and the Library card ---------- */
  async function mount(v){
    const host=v||Q("#view");if(!host)return;css();
    host.innerHTML='<div data-lc107-page><header class="page-head"><h1>'+ic("route")+"The 2000 Elo Roadmap</h1></header><p class=\"muted\">Loading…</p></div>";
    await loadCfg();
    const p=Q("[data-lc107-page]",host);if(!p)return;
    const mine=mySeg(),list=live();
    if(!list.length){p.innerHTML='<header class="page-head"><h1>'+ic("route")+'The 2000 Elo Roadmap</h1></header><p class="muted">The videos are not online yet.</p>';return}
    p.innerHTML='<header class="page-head"><h1>'+ic("route")+'The 2000 Elo Roadmap</h1></header>'
      +'<p class="muted">Five videos, one per rating band. Each one: where you stand, what most advice gets wrong, the system that works and how to train it in this app.'+(mine?" Yours is first.":"")+"</p>"
      +'<div class="lc107" data-lc107-box>'+chips(mine)+'<div data-lc107-play>'+playerHTML(mine)+"</div></div>";
  }
  function libraryCard(){
    const v=Q("#view");if(!v||cur!=="books"||Q("[data-lc107-lib]",v))return;
    const s=D.createElement("section");s.className="section";s.setAttribute("data-lc107-lib","");s.style.marginBottom="12px";
    s.innerHTML='<a class="panel lc107-libcard" href="#roadmap">'+ic("route")+'<span><b>The 2000 Elo Roadmap</b><small>Free video course · 5 videos, one per rating band'+(segOf(rating())?" · yours: "+E(label(segOf(rating()))):"")+"</small></span></a>";
    const h=Q("h1",v),a=h?h.closest("header,section,div")||h:null;
    if(a&&a.parentNode)a.parentNode.insertBefore(s,a.nextSibling);else v.insertBefore(s,v.firstChild);
  }

  /* ---------- 3. one sale at a time ---------- */
  async function book(force){
    if(!force&&BOOK&&Date.now()-bookAt<10*60e3)return BOOK;
    try{
      if(typeof LC70==="undefined"||!LC70.catalog)return null;
      const d=await LC70.catalog("kyenzo");const items=(d&&d.items)||[];
      BOOK=items.find(it=>it.id===BOOK_ID)||items.find(it=>it.kind==="book"&&it.pinned&&+it.price_cents>0&&/^https:\/\/buy\.stripe\.com\//.test(it.buy_link||""))||null;
      bookAt=Date.now();
    }catch(e){BOOK=null}
    return BOOK;
  }
  const firstSeen=()=>{const v=+ls.get("lc94-first",0)||0;return v||Date.now()};
  /* 9.76.0: LC90's Day-7 pop-up was shown on this device (or a trial was started, or the first visit is 8+ days old) */
  const afterPopup=()=>{try{if(+JSON.parse(localStorage.getItem("lc90-seen")||"0")>0)return true}catch(e){}
    try{if(typeof LC97!=="undefined"&&LC97.hadTrial&&LC97.hadTrial())return true}catch(e){}return Date.now()-firstSeen()>=8*DAY};
  const inFirstReview=()=>{try{return/^(tease|first)$/.test(String(LC42._t.st().step||""))}catch(e){return false}};
  const eur=c=>"€"+(Math.round(+c||0)/100).toFixed(2);
  function cardHTML(kind,n){
    if(kind==="trial")return'<div class="lc107-sale" data-lc107-sale="trial"><p><b>'+(n>=3?"You just found "+n+" mistakes in one game.":"Want every review to go deeper?")+"</b> With Pro you train each one: every course level, the full coach and 10 game reviews a day.</p>"
      +'<div class="btn-row"><button type="button" class="btn btn-primary btn-sm" data-lc107="trial">'+ic("gift")+'Try Pro free</button><button type="button" class="btn btn-quiet btn-sm" data-lc107="later">Later</button></div></div>';
    const b=BOOK||{};
    return'<div class="lc107-sale" data-lc107-sale="book"><p><b>You clearly love these reviews.</b> Make the feedback land harder: the book <b>'+E(b.title||"The 2000 Elo Roadmap")+"</b> explains every system behind it and where it came from, my road from 304 to 2105.</p>"
      +'<div class="btn-row"><button type="button" class="btn btn-primary btn-sm" data-lc107="book">'+ic("book")+"Get the e-book"+(b.price_cents?" · "+eur(b.price_cents):"")+'</button><button type="button" class="btn btn-quiet btn-sm" data-lc107="later">Later</button></div></div>';
  }
  /* the review report (#an-report): one card per game, after the first key moment when there are 3+, else at the end */
  async function reviewCard(){
    try{
      if(cur!=="trim"||inFirstReview()||member()||!afterPopup())return;
      const rep=Q("#an-report");if(!rep||Q("[data-lc107-sale]",rep))return;
      const keys=QA('[data-act="goto"]',rep);if(!keys.length)return;
      const gid=(()=>{try{return String((App.ui.trimLoad&&App.ui.trimLoad.pgn)||rep.textContent).slice(0,160)}catch(e){return rep.textContent.slice(0,160)}})();
      const seen=ls.get(K_CARDS,{n:0,ids:[]});if(seen.ids.indexOf(gid)>=0)return;
      const bk=await book();
      const kind=pickCard({member:member(),trial:trialOk(),book:!!bk,bookOwned:!!(bk&&bk.access),n:seen.n});
      if(!kind||Q("[data-lc107-sale]",rep))return;
      const box=D.createElement("div");box.innerHTML=cardHTML(kind,keys.length);const el=box.firstChild;
      const after=keys.length>=3?(keys[0].closest("li,.rv-key,div")||keys[0]):null;
      if(after&&after.parentNode&&rep.contains(after))after.parentNode.insertBefore(el,after.nextSibling);else rep.appendChild(el);
      seen.n++;seen.ids=seen.ids.concat([gid]).slice(-30);ls.set(K_CARDS,seen);
      try{Telemetry.log({e:"lc107",x:"card-"+kind})}catch(e){}
    }catch(e){console.error("lc107",e)}
  }
  /* LC88: day 4+, no trial, no purchase -> one step for the book */
  function bookStep(){
    try{
      if(!BOOK||BOOK.access||member())return null;
      if(!afterPopup())return null;
      try{if(typeof LC97!=="undefined"&&LC97.hadTrial&&LC97.hadTrial())return null}catch(e){}   /* a trial was started: the yearly offer, not the book */
      const x=+ls.get(K_BOOKX,0)||0;if(x&&Date.now()-x<5*DAY)return null;
      return{html:"<b>My story and every system in one book.</b> <span class=\"lc88-s\">"+E(BOOK.title||"The 2000 Elo Roadmap")+(BOOK.price_cents?", "+eur(BOOK.price_cents):"")+": how I went from 304 to 2105 and why the app trains you the way it does.</span>",
        acts:[{label:"See the book",run:()=>openBook(),primary:true},{label:"×",dismiss:true,run:()=>ls.set(K_BOOKX,Date.now())}],sig:"book"};
    }catch(e){return null}
  }
  async function openBook(){
    const b=await book(true);
    if(!b){location.hash="#books";return}
    try{if(typeof LC70!=="undefined"&&LC70.buyEuro&&+b.price_cents>0&&!b.access){LC70.buyEuro(b,"digital");return}}catch(e){}
    location.hash="#books";
  }

  /* ---------- wiring ---------- */
  const CSS=".lc107-gift{margin-top:12px;padding:12px;border:1px solid rgba(56,189,248,.45);border-radius:12px;background:rgba(56,189,248,.06)}.lc107-gift p{margin:6px 0}.lc107-k{font-weight:700}"
    +".lc107-player{position:relative;padding-top:56.25%;border-radius:10px;overflow:hidden;background:#000;margin:8px 0}.lc107-player iframe{position:absolute;inset:0;width:100%;height:100%;border:0}"
    +".lc107-chips{display:flex;flex-wrap:wrap;gap:6px}.lc107-libcard{display:flex;gap:10px;align-items:center;padding:12px 14px;text-decoration:none;color:inherit;border-color:rgba(56,189,248,.45)}"
    +".lc107-libcard small{display:block;color:#94a3b8}.lc107-sale{margin:10px 0;padding:10px 12px;border:1px solid rgba(56,189,248,.45);border-radius:12px;background:#1e293b}.lc107-sale p{margin:0 0 8px}.lc107-steps{padding-left:20px}";
  function css(){if(Q("#lc107-css"))return;const st=D.createElement("style");st.id="lc107-css";st.textContent=CSS;D.head.appendChild(st)}
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    const sg=t.closest("[data-lc107-seg]");
    if(sg){e.preventDefault();const id=sg.getAttribute("data-lc107-seg"),box=sg.closest("[data-lc107-box]");if(box){const p=Q("[data-lc107-play]",box);if(p)p.innerHTML=playerHTML(id);QA("[data-lc107-seg]",box).forEach(b=>{const on=b.getAttribute("data-lc107-seg")===id;b.classList.toggle("btn-primary",on);b.classList.toggle("btn-quiet",!on);b.setAttribute("aria-pressed",String(on))})}return}
    const b=t.closest("[data-lc107]");if(!b)return;
    const a=b.getAttribute("data-lc107");e.preventDefault();
    if(a==="watch")watch(b.getAttribute("data-seg"));
    else if(a==="install")install();
    else if(a==="trial"){try{LC90.open({from:"review"})}catch(x){location.hash="#upgrades"}}
    else if(a==="book")openBook();
    else if(a==="later"){const c=b.closest("[data-lc107-sale]");if(c)c.remove()}
  }
  function afterRender(route){
    cur=String(route||"");css();
    if(cur==="books")setTimeout(libraryCard,50);
  }
  function init(){
    try{
      css();D.addEventListener("click",onClick);
      try{const lv=LC26.levels,o=lv.minLevel;if(lv&&!lv.__lc107){lv.__lc107=1;lv.minLevel=r=>r==="roadmap"?1:o(r)}}catch(e){}
      loadCfg();setTimeout(()=>{book()},4000);
      let t=0;new MutationObserver(()=>{if(t)return;t=setTimeout(()=>{t=0;if(cur==="trim")reviewCard();if(cur==="books")libraryCard()},400)}).observe(D.body,{childList:true,subtree:true});
    }catch(e){console.error("lc107",e)}
  }
  return{init:init,afterRender:afterRender,mount:mount,giftHTML:giftHTML,watch:watch,install:install,bookStep:bookStep,openBook:openBook,version:VERSION,
    _t:{afterPopup:afterPopup,segOf:segOf,ytId:ytId,pickCard:pickCard,loadCfg:loadCfg,book:book,reviewCard:reviewCard,setCfg:v=>{CFG=v},setBook:v=>{BOOK=v;bookAt=Date.now()},SEGS:SEGS}};
})(); /*@@end lc107*/
