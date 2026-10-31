const LC47=(()=>{
  "use strict";
  /* LC47 (hotfix 9.20.6):
     1. build guard: version.json on the server is compared with this page; a newer build = drop the service worker + its caches and reload once.
     2. a Supabase RPC that answers 404 (its SQL was never run) is remembered for 30 minutes, so the app stops asking it on every screen.
     3. arena pause: after a 5xx answer the app stops calling the arena for 45 seconds (no storm of red errors, no hammering of a crashed function).
     4. owner console helper:  await LC47.arena()  prints the status and the first 500 characters of the answer of the arena function. */
  const BUILD="9.20.6";
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const MK="lc47-rpc-miss",PK="lc47-arena-pause",LK="lc47-arena-last",TTL=30*6e4;
  const local=()=>{try{return String((CONFIG&&CONFIG.assetVersion)||BUILD)}catch(e){return BUILD}};

  /* ---------- 2. missing RPC functions ---------- */
  function miss(name){const m=rd(MK,{})||{};m[String(name).slice(0,60)]={until:Date.now()+TTL,v:local()};wr(MK,m)}
  function isMissing(name){const m=rd(MK,{})||{},x=m[String(name)];return !!x&&x.v===local()&&(+x.until||0)>Date.now()}

  /* ---------- 3. arena pause ---------- */
  const paused=()=>(+rd(PK,0)||0)>Date.now();
  function arenaFail(status,text){wr(LK,{status:status,text:String(text||"").slice(0,200),t:Date.now()});if(status>=500)wr(PK,Date.now()+45e3)}
  function arenaOk(){if(rd(PK,0))wr(PK,0)}
  const last=()=>rd(LK,null);

  /* ---------- 4. console helper for the owner ---------- */
  async function arena(){
    let url="";try{url=arenaUrl()}catch(e){}
    if(!url){console.log("arena: no address configured");return null}
    try{
      const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"ping",app:"lanckrietchess-hub",device:(()=>{try{return deviceId()}catch(e){return""}})()})});
      const txt=await r.text();console.log("arena",r.status,txt.slice(0,500));return{status:r.status,text:txt.slice(0,500)};
    }catch(e){console.log("arena: not reachable (offline, blocked by CORS or not deployed)",String(e&&e.message||e));return null}
  }

  /* ---------- 1. build guard ---------- */
  const nums=v=>String(v||"").split(".").map(x=>parseInt(x,10)||0);
  function newer(a,b){const x=nums(a),y=nums(b);for(let i=0;i<3;i++){if((x[i]||0)!==(y[i]||0))return(x[i]||0)>(y[i]||0)}return false}
  let lastCheck=0;
  async function guard(reload){
    try{
      if(Date.now()-lastCheck<3e5)return false;lastCheck=Date.now();
      const r=await fetch("version.json?t="+Date.now(),{cache:"no-store"});if(!r||!r.ok)return false;
      const j=await r.json(),remote=String(j&&j.build||"");if(!/^\d+\.\d+\.\d+$/.test(remote))return false;
      if(!newer(remote,local()))return false;
      try{if(typeof LC42!=="undefined"&&LC42.owns())return false}catch(e){}        /* never reload in the middle of the first-time path */
      const k="lc47-heal-"+remote;try{if(sessionStorage.getItem(k))return false;sessionStorage.setItem(k,"1")}catch(e){}
      try{const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(x=>x.unregister()))}catch(e){}
      try{const ks=await caches.keys();await Promise.all(ks.map(x=>caches.delete(x)))}catch(e){}
      (reload||(()=>location.reload()))();
      return true;
    }catch(e){return false}
  }
  function init(){
    try{
      try{console.info("[Lanckriet Chess] build "+local())}catch(e){}
      setTimeout(()=>guard(),3500);
      document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")guard()});
    }catch(e){console.error("lc47",e)}
  }
  return{init:init,miss:miss,isMissing:isMissing,paused:paused,arenaFail:arenaFail,arenaOk:arenaOk,last:last,arena:arena,guard:guard,BUILD:BUILD,_t:{newer:newer,reset:()=>{lastCheck=0}}};
})();
