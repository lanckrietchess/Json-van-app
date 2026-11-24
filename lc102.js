/*@@module lc102*/
/* LC102 (build 9.67.0): the landing page's quick start -> install -> "Open the app" card, never over a playing video. index.html only.
   1. Submit (LC94's form #lc94-qs hands over to LC102.submit): the name is checked by LC94, then
        - kept on this device in localStorage "lc102-handoff" {u, site, src, at}: the app (LC94.init) reads it when it is opened WITHOUT
          ?u= (an installed app starts on /app.html?source=pwa), so the name still comes along; it is used once and expires after 7 days.
          Android and computers share this storage between the browser and the installed app; iPhone does not (there the card's link
          carries the name);
        - the page does NOT jump into the app and no review starts on submit (the review starts when the person opens the app);
        - the install starts from the same tap (window.__lcInstall in the landing's install script: the native prompt, the 2-tap
          iPhone guide, or nothing when the app is already installed or we are inside Instagram / TikTok).
   2. Once the install step is over, ONE small card at the bottom (not a modal): "Your review is ready, <name>." + "Open the app"
      (the deep link /app.html?u=&site=&src=) + a close button.
   3. Video rule: the card is never on screen while the hero video (or any video on the page) plays. YouTube (enablejsapi=1) and Vimeo
      report their state over postMessage, <video> elements over their own events. While a video plays the card waits; it shows the
      moment the video is paused or ended (or the iframe is gone, e.g. a segment without a video). A player that never answers is
      treated as playing while it is on screen. While the install guide is open the card waits too.
   Testing: window.__lcNav(url) replaces navigation; LC102._t exposes the state. */
const LC102=(function(){
  "use strict";
  const W=window,D=document,VERSION="9.67.0",K_HAND="lc102-handoff",NAME=/^[A-Za-z0-9_-]{2,30}$/,HAND_MS=7*864e5,API_WAIT=10000;
  const lsSet=(k,v)=>{try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  /* ---------- 1. the handoff ---------- */
  function save(u,site,src){if(!NAME.test(u||""))return false;lsSet(K_HAND,{u:u,site:site==="lichess"?"lichess":"chesscom",src:String(src||"").slice(0,40),at:Date.now(),v:1});return true}

  /* ---------- 2. is a video playing? ---------- */
  const st=new WeakMap();   /* iframe -> {k:"yt"|"vm", s:"unknown"|"playing"|"paused"|"ended"|"idle"|"noapi", at, tries} */
  let seq=0;
  const kindOf=src=>/^https:\/\/(www\.)?(youtube-nocookie\.com|youtube\.com)\/embed\//.test(src||"")?"yt":/^https:\/\/player\.vimeo\.com\/video\//.test(src||"")?"vm":"";
  function frames(){return[].slice.call(D.querySelectorAll("iframe")).filter(f=>!!kindOf(f.getAttribute("src")))}
  function post(f,msg){try{const k=kindOf(f.getAttribute("src"));f.contentWindow.postMessage(k==="vm"?msg:JSON.stringify(msg),k==="vm"?"https://player.vimeo.com":"*")}catch(e){}}
  function hello(f){
    const r=st.get(f);if(!r||r.s!=="unknown")return;
    if(r.k==="yt"){post(f,{event:"listening",id:r.id,channel:"widget"});post(f,{event:"command",func:"addEventListener",args:["onStateChange"],id:r.id,channel:"widget"})}
    else["play","pause","ended","finish"].forEach(v=>post(f,{method:"addEventListener",value:v}));
    if(++r.tries<Math.ceil(API_WAIT/400))setTimeout(()=>hello(f),400);
  }
  function hook(f){
    if(st.has(f))return;
    const k=kindOf(f.getAttribute("src"));if(!k)return;
    /* the player was started by a click (autoplay=1): count it as playing until it says otherwise */
    st.set(f,{k:k,s:"unknown",at:Date.now(),tries:0,id:"lc102-"+(++seq)});
    f.addEventListener("load",()=>{const r=st.get(f);if(r){r.tries=0;hello(f)}});
    hello(f);
  }
  function scan(){frames().forEach(hook)}
  function frameOf(win){const all=frames();for(let i=0;i<all.length;i++)if(all[i].contentWindow===win)return all[i];return null}
  function onMsg(e){
    if(!/^https:\/\/(www\.)?(youtube-nocookie\.com|youtube\.com|player\.vimeo\.com)$/.test(e.origin||""))return;
    const f=frameOf(e.source);if(!f)return;hook(f);
    let d=e.data;if(typeof d==="string"){try{d=JSON.parse(d)}catch(x){return}}
    if(!d||typeof d!=="object")return;
    const r=st.get(f);let s="";
    if(r.k==="yt"){
      let ps=null;
      if(d.event==="onStateChange")ps=+d.info;
      else if((d.event==="infoDelivery"||d.event==="initialDelivery")&&d.info&&typeof d.info.playerState==="number")ps=d.info.playerState;
      else if(d.event==="onReady"&&r.s==="unknown")s="idle";
      if(ps!=null)s=ps===1||ps===3?"playing":ps===2?"paused":ps===0?"ended":"idle";
    }else{
      if(d.event==="ready"){r.tries=0;r.s="unknown";hello(f);return}
      s=d.event==="play"||d.event==="playing"?"playing":d.event==="pause"?"paused":d.event==="ended"||d.event==="finish"?"ended":"";
    }
    if(s&&s!==r.s){r.s=s;r.at=Date.now();tick()}
  }
  function visible(el){try{const b=el.getBoundingClientRect(),h=W.innerHeight||D.documentElement.clientHeight;if(!b.height)return false;const v=Math.min(b.bottom,h)-Math.max(b.top,0);return v/b.height>=.4}catch(e){return false}}
  function frameState(f){
    const r=st.get(f);if(!r)return"unknown";
    if(r.s==="unknown"&&Date.now()-r.at>API_WAIT)r.s="noapi";
    /* "ready" / "cued" comes a moment before autoplay starts: only a player that stays idle for 1.5 s is really not playing (no flash) */
    if(r.s==="idle"&&Date.now()-r.at<1500)return"unknown";
    return r.s;
  }
  function playing(){
    const vids=[].slice.call(D.querySelectorAll("video"));
    if(vids.some(v=>!v.paused&&!v.ended))return true;
    return frames().some(f=>{const s=frameState(f);return s==="playing"||s==="unknown"||(s==="noapi"&&visible(f))});
  }
  function guideOpen(){const o=D.getElementById("ins-ov");return!!(o&&!o.hidden)}
  const blocked=()=>playing()||guideOpen();

  /* ---------- 3. the card ---------- */
  let want=null,timer=0,shown=false;
  function css(){
    if(D.getElementById("lc102-css"))return;
    const s=D.createElement("style");s.id="lc102-css";
    s.textContent=".lc102{position:fixed;left:12px;right:12px;bottom:12px;z-index:61;max-width:460px;margin:0 auto;display:flex;align-items:center;gap:10px;padding:10px 10px 10px 12px;border-radius:14px;background:#1e293b;border:1px solid rgba(56,189,248,.55);color:#e2e8f0;box-shadow:0 10px 30px rgba(0,0,0,.45);transform:translateY(0);opacity:1;transition:transform .2s ease,opacity .2s ease}"
      +".lc102[hidden]{display:none}.lc102 img{width:36px;height:36px;border-radius:9px;flex:none}"
      +".lc102 .t{flex:1;min-width:0;font-size:.92rem;line-height:1.3}.lc102 .t b{display:block;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lc102 .t small{display:block;color:#94a3b8;font-size:.82rem}"
      +".lc102 .go{flex:none;display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:10px;background:#38bdf8;color:#0f172a;font-weight:800;text-decoration:none;white-space:nowrap}"
      +".lc102 .x{flex:none;width:36px;height:44px;border:0;background:none;color:#94a3b8;font-size:1.4rem;cursor:pointer}"
      +"@media (prefers-reduced-motion:reduce){.lc102{transition:none}}";
    D.head.appendChild(s);
  }
  const LINES={
    "installed":["Your review is ready, NAME.","Open Lanckriet Chess: your last game is waiting."],
    "installed-now":["Installed. Your review is ready, NAME.","Open it from your home screen, or tap here."],
    "dismissed":["Your review is ready, NAME.","No install needed: it runs in your browser too."],
    "guide":["Your review is ready, NAME.","Added it? Open it from your home screen, or tap here."],
    "iab":["Your review is ready, NAME.","Opens right here, no install needed."]
  };
  function card(){
    let c=D.getElementById("lc102-card");
    if(!c){
      css();c=D.createElement("div");c.id="lc102-card";c.className="lc102";c.hidden=true;c.setAttribute("role","status");c.setAttribute("aria-live","polite");
      D.body.appendChild(c);
      c.addEventListener("click",e=>{
        if(e.target.closest("[data-lc102-x]")){want=null;render();return}
        const a=e.target.closest("[data-lc102-open]");if(!a)return;
        if(W.__lcNav){e.preventDefault();W.__lcNav(a.getAttribute("href"))}
      });
    }
    return c;
  }
  function render(){
    const c=want?card():D.getElementById("lc102-card");if(!c)return;
    if(!want){c.hidden=true;shown=false;W.__lc102q=false;stop();return}
    const on=!blocked();
    if(on&&!shown){
      const L=LINES[want.kind]||LINES.installed;
      c.innerHTML='<img src="/icons/icon-192.png" alt="" width="36" height="36"><span class="t"><b>'+esc(L[0].replace("NAME",want.u))+'</b><small>'+esc(L[1])+'</small></span>'
        +'<a class="go" data-lc102-open href="'+esc(want.url)+'">Open the app</a><button type="button" class="x" data-lc102-x aria-label="Close">×</button>';
      const m=D.getElementById("lc-inst");if(m)m.hidden=true;                 /* never two messages at the bottom */
    }
    if(on!==shown){c.hidden=!on;shown=on}
  }
  function tick(){if(want)render()}
  function start(){if(!timer)timer=setInterval(()=>{scan();tick()},500)}
  function stop(){if(timer){clearInterval(timer);timer=0}}
  function queue(kind,u,url){want={kind:kind,u:u,url:url,at:Date.now()};W.__lc102q=true;start();scan();render()}

  /* ---------- the submit (called by LC94's quick start inside the click / Enter gesture) ---------- */
  function submit(o){
    try{
      if(!o||!NAME.test(o.u||"")||typeof o.url!=="string"||!/^\/app\.html\?/.test(o.url))return false;
      save(o.u,o.site,o.src);
      let standalone=false;try{standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}catch(e){}
      if(standalone||typeof W.__lcInstall!=="function")return false;          /* inside the installed app: LC94 opens the review at once */
      W.__lc102q=true;
      const r=W.__lcInstall(kind=>{if(kind==="standalone"){(W.__lcNav||(x=>{location.href=x}))(o.url);return}queue(kind,o.u,o.url)});
      const m=D.querySelector("#lc94-qs [data-qs-msg]");
      if(m)m.textContent=r==="iab"||r==="installed"?"":"Installing the app… your game comes along.";
      return true;
    }catch(e){console.error("lc102",e);return false}
  }
  function init(){
    try{
      if(/\/app(\.html)?$/.test(location.pathname))return;
      W.addEventListener("message",onMsg);
      ["play","playing","pause","ended"].forEach(t=>D.addEventListener(t,tick,true));
      D.addEventListener("visibilitychange",tick);W.addEventListener("scroll",tick,{passive:true});
      scan();
    }catch(e){console.error("lc102",e)}
  }
  return{VERSION:VERSION,init:init,submit:submit,playing:playing,
    _t:{save:save,want:()=>want,shown:()=>shown,frames:frames,state:f=>frameState(f),blocked:blocked,onMsg:onMsg,queue:queue,K_HAND:K_HAND}};
})();
/*@@end lc102*/
