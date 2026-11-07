const LC60=(()=>{
  "use strict";
  /* LC60 (build 9.32.0): Coach Lanckriet's voice in the lessons.
     tools/make_lesson_audio.py saves one mp3 per lesson text in assets/audio/lessons/ and lists them in assets/audio/lessons/index.json
     ({"clips": {<hash>: {file,...}}}). The hash is the first 16 hex characters of the SHA-1 of the CLEANED text (the same cleaning as the script).
     Here: on the Endgame and Middlegame lesson screens every paragraph whose text has a clip gets a small speaker button, and the screen gets
     "Listen to this lesson" (plays every voiced paragraph in order, one after the other) and a Stop button.
     No clip yet = nothing is shown and nothing is requested twice: the index is read once, kept 24 h (Store lc60-idx, tied to the build);
     if it cannot be read (the folder does not exist yet) the feature stays off for 6 h (lc60-off). One audio plays at a time. */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const DIR="assets/audio/lessons/";
  const BUILD=()=>{try{return String(CONFIG.assetVersion||"")}catch(e){return ""}};
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0];
  const ROUTES=/^(endgame|middlegame)$/;
  const MAX_CHARS=4500;
  let idx=null,loading=null,audio=null,playing=null,queue=[],t=0,on=false,mo=null;
  const cache=new Map();   // text -> hash

  /* exactly the cleaning of tools/make_lesson_audio.py: clean() */
  function clean(text){
    let s=String(text==null?"":text);
    s=s.replace(/\*\*|__|`/g,"");
    s=s.replace(/^[ \t]*[-\u2022*][ \t]+/gm,"");
    s=s.replace(/\u2192/g," to ").replace(/\u2013/g," to ").replace(/\u2014/g,", ").replace(/->/g," to ");
    s=s.replace(/[\u2600-\u27BF\u{1F300}-\u{1FAFF}\u2190-\u21FF\u2B00-\u2BFF\uFE0F]/gu,"");
    return s.replace(/\s+/g," ").trim().slice(0,MAX_CHARS);
  }
  async function hashOf(text){
    if(cache.has(text))return cache.get(text);
    const buf=await crypto.subtle.digest("SHA-1",new TextEncoder().encode(text));
    const h=Array.prototype.map.call(new Uint8Array(buf),b=>("0"+b.toString(16)).slice(-2)).join("").slice(0,16);
    cache.set(text,h);return h;
  }
  async function loadIndex(){
    if(idx)return idx;
    if(loading)return loading;
    const off=rd("lc60-off",null);if(off&&off.b===BUILD()&&Date.now()-off.at<6*3600*1000)return null;
    const kept=rd("lc60-idx",null);
    if(kept&&kept.b===BUILD()&&Date.now()-kept.at<24*3600*1000&&kept.clips){idx=kept.clips;return idx}
    loading=(async()=>{
      try{
        const r=await fetch(DIR+"index.json",{cache:"no-cache"});
        if(!r.ok)throw new Error("none");
        const j=await r.json(),c=j&&j.clips;
        if(!c||typeof c!=="object"||!Object.keys(c).length)throw new Error("empty");
        const slim={};Object.keys(c).forEach(k=>{if(c[k]&&c[k].file)slim[k]={file:String(c[k].file)}});
        idx=slim;wr("lc60-idx",{b:BUILD(),at:Date.now(),clips:slim});return idx;
      }catch(e){wr("lc60-off",{b:BUILD(),at:Date.now()});return null}
      finally{loading=null}
    })();
    return loading;
  }

  /* ---------- playing ---------- */
  function stop(){
    queue=[];
    try{if(audio){audio.pause();audio.removeAttribute("src");audio.load()}}catch(e){}
    playing=null;mark();
  }
  function mark(){
    QA(".lc60-say").forEach(b=>{const on2=playing&&b.getAttribute("data-clip")===playing;b.classList.toggle("is-on",!!on2);b.setAttribute("aria-pressed",on2?"true":"false");b.setAttribute("aria-label",on2?"Stop the audio":"Listen to this paragraph")});
    QA(".lc60-line").forEach(p=>p.classList.toggle("lc60-now",!!playing&&p.getAttribute("data-lc60")===playing));
    const st=Q(".lc60-stop");if(st)st.hidden=!playing;
  }
  function play(hash,then){
    const c=idx&&idx[hash];if(!c)return;
    if(!audio){audio=new Audio();audio.preload="auto";audio.addEventListener("ended",()=>{playing=null;mark();next()});audio.addEventListener("error",()=>{playing=null;mark();queue=[]})}
    if(playing===hash&&!audio.paused&&!then){stop();return}
    try{audio.pause()}catch(e){}
    audio.src=DIR+c.file;playing=hash;mark();
    const pr=audio.play();if(pr&&pr.catch)pr.catch(()=>{playing=null;mark();queue=[]});
    try{const el=Q('[data-lc60="'+hash+'"]');if(el&&el.scrollIntoView&&queue.length)el.scrollIntoView({block:"center",behavior:"smooth"})}catch(e){}
  }
  function next(){if(!queue.length)return;const h=queue.shift();play(h,true)}
  function playAll(){
    const hs=QA(".lc60-line").map(p=>p.getAttribute("data-lc60")).filter(Boolean);
    if(!hs.length)return;stop();queue=hs.slice(1);play(hs[0],true);
  }

  /* ---------- painting ---------- */
  const SPEAKER='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  async function paint(){
    if(!ROUTES.test(route()))return;
    const root=Q("#theory-root");if(!root)return;
    const ix=await loadIndex();if(!ix)return;
    const els=QA("p, li",root).filter(e=>!e.classList.contains("lc56-sub")&&!e.closest(".lc60-bar")&&!e.querySelector("p, li, button"));
    let found=0;
    for(const e of els){
      const raw=e.textContent||"";if(raw.length<30)continue;
      if(e.getAttribute("data-lc60")){found++;continue}
      const txt=clean(raw.replace(/\s*Listen to this paragraph\s*/g," "));if(txt.length<12)continue;
      const h=await hashOf(txt);
      if(!ix[h])continue;
      e.setAttribute("data-lc60",h);e.classList.add("lc60-line");found++;
      const b=document.createElement("button");b.type="button";b.className="lc60-say";b.setAttribute("data-clip",h);b.setAttribute("aria-label","Listen to this paragraph");b.setAttribute("aria-pressed","false");b.innerHTML=SPEAKER;
      e.insertBefore(b,e.firstChild);
    }
    if(!found)return;
    if(!Q(".lc60-bar",root)){
      const bar=document.createElement("div");bar.className="lc60-bar";
      bar.innerHTML='<button type="button" class="btn btn-primary lc60-all" data-lc60-all>'+SPEAKER+' Listen to this lesson</button><button type="button" class="btn btn-ghost lc60-stop" data-lc60-stop hidden>Stop</button><span class="lc60-who">Coach Lanckriet</span>';
      const h2=Q("h2",root);
      if(h2&&h2.parentNode)h2.parentNode.insertBefore(bar,h2.nextSibling);else root.insertBefore(bar,root.firstChild);
    }
    mark();
  }
  function soon(){clearTimeout(t);t=setTimeout(()=>{paint().catch(()=>{})},160)}
  function onClick(e){
    const say=e.target.closest&&e.target.closest(".lc60-say");
    if(say){e.preventDefault();e.stopPropagation();play(say.getAttribute("data-clip"));return}
    if(e.target.closest&&e.target.closest("[data-lc60-all]")){e.preventDefault();playAll();return}
    if(e.target.closest&&e.target.closest("[data-lc60-stop]")){e.preventDefault();stop()}
  }
  const CSS=".lc60-say{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;margin:0 8px 0 0;padding:0;border-radius:50%;border:1px solid rgba(56,189,248,.45);background:rgba(56,189,248,.12);color:#38bdf8;vertical-align:middle;cursor:pointer;position:relative}.lc60-say::before{content:'';position:absolute;inset:-7px}.lc60-say.is-on{background:#38bdf8;color:#0f172a}.lc60-now{background:rgba(56,189,248,.08);border-radius:8px;box-shadow:-3px 0 0 #38bdf8}.lc60-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0 14px}.lc60-all{display:inline-flex;align-items:center;gap:8px;min-height:44px}.lc60-stop{min-height:44px}.lc60-who{font-size:12.5px;color:var(--fog,#94a3b8)}";
  function init(){
    if(on)return;on=true;
    try{const st=document.createElement("style");st.id="lc60-css";st.textContent=CSS;(document.head||document.documentElement).appendChild(st)}catch(e){}
    document.addEventListener("click",onClick,true);
    window.addEventListener("hashchange",()=>{stop();soon()});
    try{const v=Q("#view");if(v&&typeof MutationObserver==="function"){mo=new MutationObserver(soon);mo.observe(v,{childList:true,subtree:true})}}catch(e){}
  }
  return{init:init,afterRender:soon,clean:clean,hashOf:hashOf,play:play,stop:stop,paint:paint,version:"9.32.0"};
})();
