const LC48=(()=>{
  "use strict";
  /* LC48 (build 9.20.7): stability and the coach images.
     1. coach: pictures of Coach Lanckriet per emotion AND intensity, in assets/images/coach/{emotion}/{intensity}.png (intensity 1 to 10).
        url(emotion,intensity) picks the closest intensity that exists (a tie goes to the calmer one), then {emotion}/1.png, then default.png.
        If a picture fails to load, the next one in that chain is tried, and the old placeholder icon is the very last resort.
        assets/images/coach/index.json lists what exists; the built-in table below is used until it has loaded, and when it cannot be loaded.
     2. actions the server does not know (HTTP 400 unknown_action) are remembered for 30 minutes, so the app stops asking for them. */
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const BASE="assets/images/coach/";
  const BUILTIN={happy:[10],neutral:[5],thinking:[5],serious:[8],tough_love:[7],skeptical:[5,8]};
  const ALIAS={celebrate:"happy",proud:"happy",excited:"happy",joy:"happy",explaining:"neutral",calm:"neutral",default:"neutral",curious:"thinking",think:"thinking",warning:"serious",stern:"serious",strict:"serious",challenge:"tough_love",angry:"tough_love",point:"tough_love",doubt:"skeptical",confused:"skeptical",unsure:"skeptical"};
  let map=JSON.parse(JSON.stringify(BUILTIN));
  const clamp=n=>{n=Math.round(+n);return Number.isFinite(n)?Math.min(10,Math.max(1,n)):5};
  const canon=e=>{e=String(e||"").toLowerCase().replace(/[^a-z_]/g,"");return ALIAS[e]||e};
  /* the available intensities of an emotion, closest to the wanted one first (a tie: the calmer one) */
  function order(list,want){return list.slice().sort((a,b)=>Math.abs(a-want)-Math.abs(b-want)||a-b)}
  function chain(emotion,intensity){
    const e=canon(emotion),want=clamp(intensity),list=map[e]||[],out=[];
    order(list,want).forEach(n=>out.push(BASE+e+"/"+n+".png"));
    if(list.length&&list.indexOf(1)<0)out.push(BASE+e+"/1.png");
    out.push(BASE+"default.png");
    return out;
  }
  const url=(emotion,intensity)=>chain(emotion,intensity)[0];
  const esc2=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  /* an <img> that walks down the fallback chain by itself (see the error handler below) */
  function img(emotion,intensity,size,cls){
    const c=chain(emotion,intensity);size=size||40;
    return'<img class="'+esc2(cls||"lc48-coach")+'" data-lc48="1" data-lc48-i="0" data-lc48-chain="'+esc2(c.join("|"))+'" src="'+esc2(c[0])+'" alt="Coach Lanckriet" width="'+size+'" height="'+size+'" decoding="async">';
  }
  function onError(e){
    const el=e.target;if(!el||el.tagName!=="IMG"||!el.getAttribute||!el.getAttribute("data-lc48"))return;
    const c=String(el.getAttribute("data-lc48-chain")||"").split("|"),i=(+el.getAttribute("data-lc48-i")||0)+1;
    if(i<c.length){el.setAttribute("data-lc48-i",String(i));el.setAttribute("src",c[i]);return}
    /* nothing loaded: the placeholder icon of the app */
    const size=parseInt(el.getAttribute("width"),10)||40;let ph="";
    try{ph=LC19.coach.avatar(size)||""}catch(x){}
    const s=document.createElement("span");s.className=(el.className||"")+" lc48-ph";s.style.cssText="display:inline-grid;place-items:center;width:"+size+"px;height:"+size+"px;border-radius:50%;background:#1e293b;color:#38bdf8";s.innerHTML=ph||"♞";
    el.replaceWith(s);
  }
  /* what exists: index.json next to the pictures (only well-formed entries are used) */
  function load(){
    try{
      fetch(BASE+"index.json",{cache:"no-cache"}).then(r=>r&&r.ok?r.json():null).then(j=>{
        if(!j||typeof j!=="object"||Array.isArray(j))return;
        const m={};Object.keys(j).forEach(k=>{const e=canon(k),l=Array.isArray(j[k])?j[k].map(n=>Math.round(+n)).filter(n=>n>=1&&n<=10):[];if(e&&l.length)m[e]=Array.from(new Set((m[e]||[]).concat(l))).sort((a,b)=>a-b)});
        if(Object.keys(m).length)map=m;
      }).catch(()=>{});
    }catch(e){}
  }

  /* ---------- 2. actions the server does not know ---------- */
  const MK="lc48-act-miss",TTL=30*6e4,ver=()=>{try{return String(CONFIG.assetVersion||"")}catch(e){return""}};
  function markAction(a){a=String(a||"").slice(0,60);if(!a)return;const m=rd(MK,{})||{};m[a]={until:Date.now()+TTL,v:ver()};wr(MK,m)}
  function actionMissing(a){const m=rd(MK,{})||{},x=m[String(a)];return !!x&&x.v===ver()&&(+x.until||0)>Date.now()}

  function init(){try{document.addEventListener("error",onError,true);load()}catch(e){console.error("lc48",e)}}
  return{init:init,coach:{url:url,chain:chain,img:img,load:load,emotions:()=>Object.keys(map),map:()=>JSON.parse(JSON.stringify(map))},markAction:markAction,actionMissing:actionMissing,_t:{canon:canon,order:order,onError:onError,reset:()=>{map=JSON.parse(JSON.stringify(BUILTIN))}}};
})();
