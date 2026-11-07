const LC56=(()=>{
  "use strict";
  /* LC56 (build 9.30.0): friction removal on the board pages (phones first).
     1. Board first: on the bot, Trim and the board pages the board (and the play settings that belong to it) comes first; the quest strip,
        the Auto-next toggle, the page intro, the stats and the explainers move UNDER the content (CSS only, nothing is deleted).
     2. Touch: on every interactive board the touch belongs to the board (touch-action:none), the page does not scroll under a piece.
     3. Instant Play on Middlegame, Endgame and Openings: one tap starts the right drill (the level comes from the linked account's rating).
     4. Shuffle: one big "Start shuffling" button on top, all options folded away, a short tip screen while the first position loads.
     5. Trim: a Scan button next to the board controls. Photo -> resized in the browser (max 1080 px) -> Edge Function `fen-scan`
        -> FEN -> checked with chess.js -> loaded on the analysis board. A bad read says so and nothing crashes.
     6. Rated puzzles start at the linked account's rating (1000 when there is none) instead of asking.
     Everything here is additive: removing the module restores the old layout. */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const ico=n=>{try{return icon(n)}catch(e){return""}};
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0];
  const rank=()=>{try{return App.rank()}catch(e){return 0}};
  const startElo=()=>{try{const e=Math.round(+(App.profile&&App.profile.elo));return e>=400&&e<=2800?e:1000}catch(e){return 1000}};
  const TAB_OF=e=>e<800?1:e<1200?2:e<1600?3:e<2000?4:5;
  const TIPS=[
    "Before every move ask: what is their threat? That is the M in MSPC.",
    "Checks, captures, attacks: look at them first, then decide.",
    "Name the pawn structure before you choose a plan.",
    "Calculate the forcing line to the end, then check their best reply.",
    "Most blunders are a skipped threat check, not a lack of talent.",
    "If you are doubting a move, you have not thought long enough.",
    "Nothing is forced? Improve your worst piece.",
    "A clean line builds your combo. One slip and it resets: stay sharp.",
    "Do not guess why you lose. Trim the game and find the pattern."
  ];
  const tip=()=>TIPS[Math.floor(Math.random()*TIPS.length)];

  const CSS=`
/* ---- LC56 ---- */
.lc56-instant-wrap{margin:0 0 12px}
.lc56-instant{width:100%;min-height:56px;font-size:17px;font-weight:800;letter-spacing:.01em;display:flex;align-items:center;justify-content:center;gap:8px}
.lc56-sub{margin:6px 2px 0;font-size:12.5px;color:var(--fog,#94a3b8);text-align:center}
.lc56-shbar{display:flex;gap:8px;align-items:stretch;margin:0 0 12px;position:sticky;top:calc(var(--head,56px) + 6px);z-index:25}
.lc56-shbar .lc56-go{flex:1 1 auto;min-height:56px;font-size:17px;font-weight:800}
.lc56-shbar .lc56-opt{flex:0 0 auto;min-height:56px;padding:0 14px}
.sh-setup.lc56-c>*:not(.lc56-shbar){display:none!important}
.lc56-load{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:24px;background:rgba(2,6,23,.88);backdrop-filter:blur(6px)}
.lc56-load .box{max-width:340px;text-align:center}
.lc56-load .ring{width:46px;height:46px;margin:0 auto 14px;border-radius:50%;border:4px solid rgba(56,189,248,.25);border-top-color:#38bdf8;animation:lc56spin .8s linear infinite}
.lc56-load p{margin:0;color:#e2e8f0;font-size:16px;line-height:1.4}
.lc56-load small{display:block;margin-top:10px;color:#94a3b8;font-size:12px}
.lc56-scanov{position:absolute;inset:0;z-index:30;display:grid;place-items:center;background:rgba(2,6,23,.72);border-radius:8px;text-align:center;padding:12px;color:#e2e8f0;font-size:14px}
.lc56-scanov .ring{width:34px;height:34px;margin:0 auto 10px;border-radius:50%;border:3px solid rgba(56,189,248,.25);border-top-color:#38bdf8;animation:lc56spin .8s linear infinite}
.board-shell{position:relative}
@keyframes lc56spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.lc56-load .ring,.lc56-scanov .ring{animation-duration:2.4s}}
/* 2. touch belongs to the board on every interactive board */
.trainer .board-host,.trainer .board-b72b1,.an-grid .board-host,.an-grid .board-b72b1,#bt .board-host,#bt .board-b72b1,#shuffle-root .board-host,#shuffle-root .board-b72b1,#pz-board,#pz-board .board-b72b1{touch-action:none}
@media (max-width:959px){
  /* 1. board first: strips, intros, stats and explainers go under the content */
  #view:has(#theory-root),#view:has(#shuffle-root),#view:has(#bt),#view:has(.an-grid){display:flex;flex-direction:column}
  #view:has(#theory-root)>#lc39-q,#view:has(#shuffle-root)>#lc39-q,#view:has(#bt)>#lc39-q,#view:has(.an-grid)>#lc39-q,#view:has(.trainer)>#lc39-q{order:60}
  #view:has(#theory-root)>#lc25-bar,#view:has(#shuffle-root)>#lc25-bar,#view:has(.trainer)>#lc25-bar{order:55}
  #view:has(#bt)>.page-head,#view:has(.an-grid)>.page-head,#view:has(#shuffle-root)>.sh-back{order:50}
  #bt>#bt-bar{order:-2;padding:10px 12px}
  #bt-bar .bt-bar-row{gap:8px}
  #bt-bar .bt-bar-row .field{flex:1 1 40%;min-width:0}
  #bt>.trainer{order:-1}
  #bt>#bt-onb,#bt>#lc81-bt-banner{order:30}
  #view:has(.an-grid)>.an-grid{order:-10}
  .an-main>.board-shell{order:-3}
  .an-main>.nav-row{order:-2}
  .an-main{display:flex;flex-direction:column}
  #theory-head p{display:none}
  #theory-root{display:flex;flex-direction:column}
  #theory-root>[id^="metrics-"]{order:40}
  #theory-root>.lc56-instant-wrap{order:-10}
}
`;
  let on=false,mo=null,t=0,shOpen=false,busy=false;

  /* ---------- 3. Instant Play ---------- */
  function paintInstant(r){
    const root=Q("#theory-root");if(!root||Q(".lc56-instant-wrap",root))return;
    const w=document.createElement("div");w.className="lc56-instant-wrap";
    const sub=r==="openings"?"Your next repertoire line.":"Starts at your level"+(rank()>=2?" ("+startElo()+" ELO).":".");
    w.innerHTML='<button type="button" class="btn btn-gold lc56-instant" data-lc56="instant">'+ico("bolt")+' Instant Play</button><p class="lc56-sub">'+sub+'</p>';
    root.insertBefore(w,root.firstChild);
  }
  const usable=b=>!!b&&!b.disabled&&b.offsetParent!==null;
  async function instant(){
    const r=route();
    if(r==="openings"){const b=QA(".lc81-train").filter(usable)[0];if(b){b.click();return}say("Pick a line below to start.");return}
    const tab=rank()>=2?TAB_OF(startElo()):1,tb=Q('#theory-root [data-eg-tab="'+tab+'"]');
    if(tb)tb.click();
    for(let i=0;i<20;i++){
      await wait(100);
      const root=Q("#theory-root");if(!root)return;
      const b=QA('[data-eg-open$="|simple"]',root).filter(usable)[0]||QA('[data-eg-open$="|learn"]',root).filter(usable)[0];
      if(b){b.click();return}
    }
    say("Pick a theme below to start.");
  }

  /* ---------- 4. Shuffle ---------- */
  function paintShuffle(){
    const s=Q("#shuffle-root .sh-setup");if(!s)return;
    if(!Q(".lc56-shbar",s)){
      const bar=document.createElement("div");bar.className="lc56-shbar";
      bar.innerHTML='<button type="button" class="btn btn-primary lc56-go" data-lc56="go">'+ico("shuffle")+' Start shuffling</button><button type="button" class="btn btn-ghost lc56-opt" data-lc56="opt" aria-expanded="false">Options</button>';
      s.insertBefore(bar,s.firstChild);
    }
    s.classList.toggle("lc56-c",!shOpen);
    const o=Q(".lc56-opt",s);if(o){o.setAttribute("aria-expanded",shOpen?"true":"false");o.textContent=shOpen?"Hide options":"Options"}
  }
  function loading(text){
    let el=Q(".lc56-load");if(el)el.remove();
    el=document.createElement("div");el.className="lc56-load";el.setAttribute("role","status");
    el.innerHTML='<div class="box"><div class="ring"></div><p>'+(text||tip())+'</p><small>Loading your positions…</small></div>';
    document.body.appendChild(el);return el;
  }
  async function startShuffle(){
    const go=Q("#shuffle-root [data-sh-go]");
    if(!go||go.disabled){shOpen=true;paintShuffle();say("Pick what to shuffle under Options.");return}
    const ov=loading(tip());
    go.click();
    for(let i=0;i<30;i++){await wait(100);if(Q("#shuffle-root .board-b72b1"))break}
    await wait(250);ov.remove();
  }

  /* ---------- 5. Photo -> FEN ---------- */
  const SCAN_MAX=1080;
  function fnBase(){try{return String(LC26.sync.cfg().url||"").replace(/\/+$/,"")+"/functions/v1"}catch(e){return ""}}
  function token(){try{const s=LC26.sync.session();return s&&s.access_token||""}catch(e){return ""}}
  function paintScan(){
    const nav=Q(".an-main .nav-row");if(!nav||Q(".lc56-scan",nav))return;
    const b=document.createElement("button");b.type="button";b.className="icon-btn lc56-scan";b.setAttribute("data-lc56","scan");
    b.setAttribute("aria-label","Scan a board from a photo");b.title="Scan a board from a photo";
    b.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
    nav.appendChild(b);
  }
  function picker(){
    let i=Q("#lc56-file");
    if(!i){
      i=document.createElement("input");i.type="file";i.id="lc56-file";i.accept="image/*";i.setAttribute("capture","environment");
      i.style.cssText="position:fixed;left:-9999px;width:1px;height:1px;opacity:0";
      i.addEventListener("change",()=>{const f=i.files&&i.files[0];i.value="";if(f)scanFile(f)});
      document.body.appendChild(i);
    }
    return i;
  }
  async function shrink(file){
    let bmp=null,w=0,h=0;
    try{bmp=await createImageBitmap(file,{imageOrientation:"from-image"})}catch(e){bmp=null}
    if(!bmp){
      bmp=await new Promise((res,rej)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error("decode"))};im.src=u});
    }
    w=bmp.width||bmp.naturalWidth;h=bmp.height||bmp.naturalHeight;
    const k=Math.min(1,SCAN_MAX/Math.max(w,h)),cw=Math.max(1,Math.round(w*k)),ch=Math.max(1,Math.round(h*k));
    const cv=document.createElement("canvas");cv.width=cw;cv.height=ch;
    cv.getContext("2d").drawImage(bmp,0,0,cw,ch);
    try{bmp.close&&bmp.close()}catch(e){}
    const blob=await new Promise(r=>cv.toBlob(r,"image/jpeg",0.82));
    if(!blob)throw new Error("encode");
    const dataUrl=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(new Error("read"));fr.readAsDataURL(blob)});
    return{dataUrl:dataUrl,w:cw,h:ch};
  }
  /* Piece placement from the server -> a legal FEN, or null. The side to move is whichever side makes the position legal (white first). */
  function legalFen(raw){
    try{
      const place=String(raw||"").trim().split(/\s+/)[0];
      for(const side of["w","b"]){
        const f=place+" "+side+" - - 0 1",g=new Chess(f);
        if(g.fen().split(" ")[0]!==place)continue;
        const v=g.validate_fen?g.validate_fen(f):{valid:true};if(!v.valid)continue;
        const flip=new Chess(place+" "+(side==="w"?"b":"w")+" - - 0 1");
        if(flip.in_check&&flip.in_check())continue;
        if(g.moves().length===0)continue;
        return f;
      }
    }catch(e){}
    return null;
  }
  function loadFen(fen){
    const ta=Q("#an-pgn"),load=Q('#an-import [data-act="load"]');
    if(!ta||!load)throw new Error("no-trim");
    const g=new Chess();if(!g.load(fen))throw new Error("load");
    const first=g.moves()[0];if(!first)throw new Error("nomoves");
    g.header("Event","Scanned position");g.move(first);
    ta.value=g.pgn()+" *";
    load.click();
    const f=Q('.an-main [data-act="first"]');if(f)setTimeout(()=>f.click(),60);
  }
  function overlay(on2,text){
    const sh=Q(".an-main .board-shell");if(!sh)return;
    let o=Q(".lc56-scanov",sh);
    if(!on2){if(o)o.remove();return}
    if(!o){o=document.createElement("div");o.className="lc56-scanov";o.setAttribute("role","status");sh.appendChild(o)}
    o.innerHTML='<div><div class="ring"></div>'+(text||"Reading the board…")+"</div>";
  }
  const BAD="Couldn’t read the board. Try again with better lighting and hold the camera straight above the page.";
  function canScan(){
    if(!token()){say("Sign in to scan a board.","err");try{location.hash="#account"}catch(e){}return false}
    if(rank()<2){try{openUnlock("fen-scan","Scan a board from a photo")}catch(e){say("Scanning a board is part of Pro.")}return false}
    return true;
  }
  async function scanFile(file){
    if(busy||!canScan())return;
    busy=true;overlay(true,"Reading the board…");
    try{
      const img=await shrink(file),c=LC26.sync.cfg(),ctl=typeof AbortController==="function"?new AbortController:null,tm=ctl?setTimeout(()=>ctl.abort(),30000):null;
      let res,j=null;
      try{
        res=await fetch(fnBase()+"/fen-scan",{method:"POST",headers:{"Content-Type":"application/json",apikey:c.key||"",Authorization:"Bearer "+token()},body:JSON.stringify({image:img.dataUrl}),signal:ctl?ctl.signal:undefined});
        j=await res.json().catch(()=>null);
      }finally{if(tm)clearTimeout(tm)}
      if(!res||!j||!j.ok){
        const r=j&&j.reason;
        say(r==="limit"?"You have used today’s board scans. Try again tomorrow.":r==="signin"?"Sign in again to scan a board.":r==="off"?"Board scanning is switched off for now.":BAD,"err");return;
      }
      const fen=legalFen(j.fen);
      if(!fen){say(BAD,"err");return}
      loadFen(fen);
      say("Board loaded. "+(fen.split(" ")[1]==="w"?"White":"Black")+" to move; use the arrows or flip the board if that is wrong.","ok");
    }catch(e){
      say(e&&e.name==="AbortError"?"That took too long. Try again.":(e&&e.message==="no-trim")?"Open the Trim page to scan a board.":BAD,"err");
    }finally{busy=false;overlay(false)}
  }

  /* ---------- 6. rated puzzles start at your rating ---------- */
  function autoPuzzleElo(){
    try{if(typeof PuzzleElo==="undefined"||PuzzleElo.started())return;PuzzleElo.start(startElo());rerender()}catch(e){}
  }

  /* ---------- wiring ---------- */
  function paint(){
    const r=route();
    try{
      if(r==="middlegame"||r==="endgame"||r==="openings")paintInstant(r);
      else if(r==="shuffle")paintShuffle();
      else if(r==="trim")paintScan();
      else if(r==="puzzles")autoPuzzleElo();
    }catch(e){}
  }
  function soon(){clearTimeout(t);t=setTimeout(paint,90)}
  function onClick(e){
    const el=e.target.closest&&e.target.closest("[data-lc56]");if(!el)return;
    const a=el.getAttribute("data-lc56");
    if(a==="instant"){e.preventDefault();instant()}
    else if(a==="go"){e.preventDefault();startShuffle()}
    else if(a==="opt"){e.preventDefault();shOpen=!shOpen;paintShuffle()}
    else if(a==="scan"){e.preventDefault();if(canScan())picker().click()}
  }
  function init(){
    if(on)return;on=true;
    try{const st=document.createElement("style");st.id="lc56-css";st.textContent=CSS;(document.head||document.documentElement).appendChild(st)}catch(e){}
    document.addEventListener("click",onClick,true);
    window.addEventListener("hashchange",soon);
    try{
      const v=Q("#view");
      if(v&&typeof MutationObserver==="function"){mo=new MutationObserver(soon);mo.observe(v,{childList:true,subtree:true})}
    }catch(e){}
    soon();
  }
  return{init:init,afterRender:soon,instant:instant,legalFen:legalFen,tips:TIPS,_scanFile:scanFile,version:"9.30.0"};
})();
