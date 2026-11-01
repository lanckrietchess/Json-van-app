const LC48=(()=>{
  "use strict";
  /* LC48 (build 9.24.0): the coach pictures and the server's unknown actions.
     1. coach: pictures of Coach Lanckriet per emotion AND intensity 1 to 10, in assets/images/coach/{emotion}/{intensity}.png (+ default.png).
        NOTHING is requested that is not known to exist: assets/images/coach/index.json lists the files (and "_default"), it is read once, and its answer is kept
        for 24 hours on the device. Until the list is known (and when there is no list) the knight icon is shown: no guessing, so no 404 lines in the console.
        url(emotion,intensity) = the closest intensity that exists (a tie goes to the calmer one), then {emotion}/1.png if listed, then default.png.
        A picture that still fails to load is remembered as bad and never requested again.
     2. actions the server does not know (HTTP 400 unknown_action) are remembered for 30 minutes, so the app stops asking for them. */
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const BASE="assets/images/coach/";
  const ALIAS={celebrate:"happy",proud:"happy",excited:"happy",joy:"happy",explaining:"neutral",calm:"neutral",curious:"thinking",think:"thinking",warning:"serious",stern:"serious",strict:"serious",challenge:"tough_love",angry:"tough_love",point:"tough_love",doubt:"skeptical",confused:"skeptical",unsure:"skeptical"};
  const ver=()=>{try{return String(CONFIG.assetVersion||"")}catch(e){return""}};
  const IK="lc48-idx",OFFK="lc48-off",BADK="lc48-bad",DAY=864e5,OFF_MS=6*36e5;
  let map=null,dflt=false,loading=null,bad=null;
  const clamp=n=>{n=Math.round(+n);return Number.isFinite(n)?Math.min(10,Math.max(1,n)):5};
  const canon=e=>{e=String(e||"").toLowerCase().replace(/[^a-z_]/g,"");return ALIAS[e]||e};
  const badSet=()=>{if(bad)return bad;const b=rd(BADK,{})||{};bad=b.v===ver()?b.u||{}:{};return bad};
  function parse(j){
    if(!j||typeof j!=="object"||Array.isArray(j))return null;
    const m={};Object.keys(j).forEach(k=>{if(k.charAt(0)==="_")return;const e=canon(k),l=Array.isArray(j[k])?j[k].map(n=>Math.round(+n)).filter(n=>n>=1&&n<=10):[];if(e&&l.length)m[e]=Array.from(new Set((m[e]||[]).concat(l))).sort((a,b)=>a-b)});
    return{map:m,dflt:!!j._default};
  }
  /* the available intensities of an emotion, closest to the wanted one first (a tie: the calmer one) */
  const order=(list,want)=>list.slice().sort((a,b)=>Math.abs(a-want)-Math.abs(b-want)||a-b);
  function chain(emotion,intensity){
    if(!map)return[];
    const e=canon(emotion),want=clamp(intensity),b=badSet(),out=[];
    order(map[e]||[],want).forEach(n=>{const u=BASE+e+"/"+n+".png";if(!b[u])out.push(u)});
    if(dflt&&!b[BASE+"default.png"])out.push(BASE+"default.png");
    return out;
  }
  const url=(emotion,intensity)=>chain(emotion,intensity)[0]||"";
  /* a random picture of the emotion (for the places that like variety); default.png / "" when none is known */
  const random=emotion=>{if(!map)return"";const e=canon(emotion),l=(map[e]||[]).filter(n=>!badSet()[BASE+e+"/"+n+".png"]);return l.length?BASE+e+"/"+l[Math.floor(Math.random()*l.length)]+".png":url(e,5)};
  const esc2=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const phHTML=size=>{let h="";try{h=LC19.coach.avatar(size)||""}catch(e){}return h||"♞"};
  /* an <img> that walks down the chain by itself, or the knight icon when nothing is known to exist (it is swapped for the picture as soon as the list is known) */
  function img(emotion,intensity,size,cls,extra){
    size=size||40;cls=cls||"lc48-coach";extra=extra?" "+extra:"";
    const c=chain(emotion,intensity);
    if(!c.length){
      return'<span class="'+esc2(cls)+' lc48-ph" data-lc48="1" data-lc48-pending="'+(map?"0":"1")+'" data-lc48-emo="'+esc2(emotion||"")+'" data-lc48-int="'+esc2(intensity==null?5:intensity)+'" data-lc48-size="'+size+'" data-lc48-cls="'+esc2(cls)+'"'+(extra?' data-lc48-extra="'+esc2(extra.trim())+'"':"")+extra+' role="img" aria-label="Coach Lanckriet" style="display:inline-grid;place-items:center;width:'+size+'px;height:'+size+'px;border-radius:50%;background:#1e293b;color:#38bdf8;overflow:hidden">'+phHTML(size)+'</span>';
    }
    return'<img class="'+esc2(cls)+'" data-lc48="1" data-lc48-i="0" data-lc48-chain="'+esc2(c.join("|"))+'" src="'+esc2(c[0])+'" alt="Coach Lanckriet" width="'+size+'" height="'+size+'" decoding="async"'+extra+'>';
  }
  function upgrade(){
    try{
      Array.prototype.slice.call(document.querySelectorAll("[data-lc48-pending]")).forEach(el=>{
        const emo=el.getAttribute("data-lc48-emo"),int=el.getAttribute("data-lc48-int"),size=parseInt(el.getAttribute("data-lc48-size"),10)||40,cls=el.getAttribute("data-lc48-cls")||"lc48-coach",ex=el.getAttribute("data-lc48-extra")||"";
        if(!chain(emo,int).length){el.setAttribute("data-lc48-pending","0");return}
        const t=document.createElement("div");t.innerHTML=img(emo,int,size,cls,ex);const n=t.firstElementChild;if(n)el.replaceWith(n);
      });
    }catch(e){}
  }
  function onError(e){
    const el=e.target;if(!el||el.tagName!=="IMG"||!el.getAttribute||!el.getAttribute("data-lc48"))return;
    const c=String(el.getAttribute("data-lc48-chain")||"").split("|"),i=(+el.getAttribute("data-lc48-i")||0),failed=c[i];
    if(failed){const b=badSet();b[failed]=1;wr(BADK,{v:ver(),u:b})}                 /* never asked again */
    const j=i+1;
    if(j<c.length){el.setAttribute("data-lc48-i",String(j));el.setAttribute("src",c[j]);return}
    const size=parseInt(el.getAttribute("width"),10)||40;
    const s=document.createElement("span");s.className=(el.className||"")+" lc48-ph";s.setAttribute("data-lc48","1");s.style.cssText="display:inline-grid;place-items:center;width:"+size+"px;height:"+size+"px;border-radius:50%;background:#1e293b;color:#38bdf8";s.innerHTML=phHTML(size);
    el.replaceWith(s);
  }
  /* what exists: the list next to the pictures, read once and kept for 24 hours. Unreachable or malformed: no pictures for 6 hours (and no further requests). */
  function load(force){
    try{
      if(map&&!force)return loading||Promise.resolve();
      const c=rd(IK,null);
      if(!force&&c&&c.v===ver()&&Date.now()-(+c.t||0)<DAY&&c.map&&typeof c.map==="object"){map=c.map;dflt=!!c.dflt;return Promise.resolve()}
      const off=rd(OFFK,null);if(!force&&off&&off.v===ver()&&(+off.until||0)>Date.now()){map={};dflt=false;return Promise.resolve()}
      if(loading)return loading;
      loading=fetch(BASE+"index.json",{cache:"no-cache"}).then(r=>r&&r.ok?r.json():null).catch(()=>null).then(j=>{
        const p=parse(j);
        if(p&&Object.keys(p.map).length){map=p.map;dflt=p.dflt;wr(IK,{v:ver(),t:Date.now(),map:map,dflt:dflt})}
        else{map={};dflt=false;wr(OFFK,{v:ver(),until:Date.now()+OFF_MS})}
        loading=null;upgrade();
      });
      return loading;
    }catch(e){map={};return Promise.resolve()}
  }

  /* ---------- 2. actions the server does not know ---------- */
  const MK="lc48-act-miss",TTL=30*6e4;
  function markAction(a){a=String(a||"").slice(0,60);if(!a)return;const m=rd(MK,{})||{};m[a]={until:Date.now()+TTL,v:ver()};wr(MK,m)}
  function actionMissing(a){const m=rd(MK,{})||{},x=m[String(a)];return !!x&&x.v===ver()&&(+x.until||0)>Date.now()}

  function init(){try{document.addEventListener("error",onError,true);load()}catch(e){console.error("lc48",e)}}
  return{init:init,coach:{url:url,verified:url,random:random,chain:chain,img:img,load:load,upgrade:upgrade,ready:()=>!!map,available:()=>!!map&&Object.keys(map).length>0,emotions:()=>map?Object.keys(map):[],map:()=>map?JSON.parse(JSON.stringify(map)):null},markAction:markAction,actionMissing:actionMissing,_t:{canon:canon,order:order,onError:onError,parse:parse,reset:()=>{map=null;dflt=false;loading=null;bad=null}}};
})();
