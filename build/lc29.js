/* ==========================================================================
   LC29 (hub 9.7.0): Coach avatar variations and the universal Help (?). Additive layer over 9.6.0.
   1. getRandomCoachAvatar(emotion): picks a random photo from /assets/images/coach/<emotion>/<emotion>_N.png.
      The file list comes from manifest.json (written by scripts/build-coach-manifest.mjs, optional) or, when that is missing,
      from probing numbered files (HEAD requests, cached 6 hours). Any problem falls back to neutral/neutral_1.png and then to the
      knight icon. It never throws and never shows a broken image.
   2. A small ? next to the heading of every screen (Settings toggle "Show Lanckriet Chess Help", default on). It opens a sheet
      with What / How / Why (MSPC) / Ranks, a random coach expression and the Listen button.
   3. Help texts and audio metadata live in assets/help/help.json (feature_id, text_content, voice_id, audio_cached, audio_url).
      Audio is generated once by scripts/build-help-audio.mjs and served as a static file: no API call and no key in the browser.
      If a clip is not generated yet, Listen falls back to the hub's existing voice (LC19 coach, cached on the server by text).
   ========================================================================== */
const LC29=(()=>{
  "use strict";
  const EMOTIONS=["neutral","thinking","serious","happy","skeptical","tough_love"];
  const ALIAS={"tough-love":"tough_love",toughlove:"tough_love",tough:"tough_love",sceptical:"skeptical",think:"thinking",smile:"happy",smiling:"happy",stern:"serious"};
  const FALLBACK={cat:"neutral",file:"neutral_1.png"};
  const KF="lc29-coach-files",KL="lc29-coach-last",KS="lc29-help-seen",KH="lc29-help-json";
  const CFG={maxIndex:40,batch:8,okTtlMs:6*36e5,emptyTtlMs:10*6e4,netMs:4000,imgMs:5000,helpMs:6000};
  const SECS=[["what","What it is"],["how","How to use it"],["why","Why it works (MSPC)"],["ranks","Ranks and levels"]];
  const E=s=>{try{return typeof esc==="function"?esc(s):String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}catch(e){return""}};
  const Q=(s,r)=>(r||document).querySelector(s);
  const rd=(k,d)=>{try{return Store.get(k,d)}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const say=(m,k)=>{try{toast(m,k)}catch(e){}};
  const ver=()=>{try{return encodeURIComponent(String(CONFIG.assetVersion||""))}catch(e){return""}};

  /* ---------- where the files live ----------
     Default: <site>/assets/. Admin can point it somewhere else with CONFIG.coachAssets (an https address ending in /assets/). */
  function base(){
    let b="";try{b=String(CONFIG.coachAssets||"")}catch(e){}
    if(!b){try{b=new URL("assets/",location.origin+location.pathname.replace(/[^/]*$/,"")).href}catch(e){b="/assets/"}}
    return b.replace(/\/*$/,"/");
  }
  const coachBase=()=>base()+"images/coach/";
  const siteRoot=()=>base().replace(/assets\/$/,"");

  async function fetchT(url,init,ms){
    const ac=typeof AbortController==="function"?new AbortController():null,t=ac?setTimeout(()=>ac.abort(),ms):0;
    try{return await fetch(url,Object.assign({},init||{},ac?{signal:ac.signal}:{}))}finally{clearTimeout(t)}
  }

  /* ---------- 1. coach avatars ---------- */
  const norm=c=>{let k=String(c==null?"":c).toLowerCase().trim().replace(/[\s-]+/g,"_");k=ALIAS[k]||k;return EMOTIONS.indexOf(k)>=0?k:"neutral"};
  const FILE_RE=/^([a-z_]+)_(\d{1,3})\.(png|jpe?g|webp)$/i;
  const okName=(cat,n)=>{const m=FILE_RE.exec(String(n||""));return!!m&&m[1].toLowerCase()===cat};
  const num=n=>{const m=FILE_RE.exec(String(n));return m?+m[2]:0};
  const sortFiles=a=>Array.from(new Set(a)).sort((x,y)=>num(x)-num(y));

  let mP=null;
  function manifest(){
    if(!mP)mP=(async()=>{
      try{const r=await fetchT(coachBase()+"manifest.json?v="+ver(),{cache:"no-cache"},CFG.netMs);if(!r.ok)return null;
        const j=await r.json();return j&&typeof j==="object"&&j.categories&&typeof j.categories==="object"?j:null}
      catch(e){return null}
    })();
    return mP;
  }
  /* HEAD instead of loading the picture: probing 40 numbers must not download 40 photos. A 200 that is not an image (a catch-all rewrite) counts as missing. */
  async function exists(url){
    try{const r=await fetchT(url,{method:"HEAD",cache:"no-cache"},CFG.netMs);if(!r.ok)return false;
      const ct=String(r.headers&&r.headers.get?r.headers.get("content-type")||"":"");return!ct||/^image\//i.test(ct)}
    catch(e){return false}
  }
  async function probe(cat){
    const found=[];
    for(let start=1;start<=CFG.maxIndex;start+=CFG.batch){
      const idx=[];for(let i=start;i<start+CFG.batch&&i<=CFG.maxIndex;i++)idx.push(i);
      const rs=await Promise.all(idx.map(i=>exists(coachBase()+cat+"/"+cat+"_"+i+".png")));
      let hit=false;rs.forEach((ok,k)=>{if(ok){found.push(cat+"_"+idx[k]+".png");hit=true}});
      if(!hit)break;                         /* a whole batch without a hit: the numbering has ended */
    }
    return found;
  }
  const mem={},inflight={};
  function cached(cat){
    const c=rd(KF,{}),h=c&&c[cat];if(!h||!Array.isArray(h.files))return null;
    return Date.now()-h.t<(h.files.length?CFG.okTtlMs:CFG.emptyTtlMs)?h.files.filter(n=>okName(cat,n)):null;
  }
  const store=(cat,files)=>{const c=rd(KF,{});c[cat]={t:Date.now(),files:files};wr(KF,c)};
  function list(cat){
    cat=norm(cat);
    if(mem[cat])return Promise.resolve(mem[cat]);
    const c=cached(cat);if(c){mem[cat]=c;return Promise.resolve(c)}
    if(inflight[cat])return inflight[cat];
    inflight[cat]=(async()=>{
      let files=null;const m=await manifest();
      if(m&&Array.isArray(m.categories[cat]))files=m.categories[cat].filter(n=>okName(cat,n));
      if(!files)files=await probe(cat);
      files=sortFiles(files);mem[cat]=files;store(cat,files);delete inflight[cat];return files;
    })().catch(()=>{delete inflight[cat];return[]});
    return inflight[cat];
  }
  /* a random file that is not the one shown last time (when there is more than one) */
  function pickFrom(cat,pool){
    if(!pool.length)return null;
    const last=(rd(KL,{})||{})[cat],opts=pool.length>1?pool.filter(f=>f!==last):pool,f=opts[Math.floor(Math.random()*opts.length)];
    const l=rd(KL,{});l[cat]=f;wr(KL,l);return f;
  }
  function canShow(url){
    return new Promise(res=>{
      let done=false;const im=new Image(),f=ok=>{if(done)return;done=true;clearTimeout(t);im.onload=im.onerror=null;res(ok)},t=setTimeout(()=>f(false),CFG.imgMs);
      im.onload=()=>f(true);im.onerror=()=>f(false);im.src=url;
    });
  }
  /* returns an image address, or "" when nothing can be shown (the caller then draws the knight icon) */
  async function getRandom(emotion){
    const cat=norm(emotion);let files=[];
    try{files=await list(cat)}catch(e){}
    const pool=files.slice();
    for(let n=0;n<3&&pool.length;n++){
      const f=pickFrom(cat,pool);pool.splice(pool.indexOf(f),1);
      const url=coachBase()+cat+"/"+f;if(await canShow(url))return url;
    }
    const fb=coachBase()+FALLBACK.cat+"/"+FALLBACK.file;
    if(await canShow(fb))return fb;
    return"";
  }
  /* instant answer for code that cannot wait (the mini-player): a known file or "" (and it starts the lookup for next time) */
  function peek(emotion){
    try{const cat=norm(emotion),files=mem[cat];
      if(!files){list(cat).catch(()=>{});return""}
      return files.length?coachBase()+cat+"/"+pickFrom(cat,files):"";
    }catch(e){return""}
  }
  const knight='<svg class="lc29-av-svg" viewBox="0 0 48 48" width="64" height="64" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/><text x="24" y="31.5" text-anchor="middle" font-size="24" fill="#38bdf8" font-family="\'Segoe UI Symbol\',\'Noto Sans Symbols 2\',serif">\u265e</text></svg>';

  /* ---------- 2. help data ---------- */
  const validHelp=j=>!!j&&typeof j==="object"&&Array.isArray(j.features);
  function indexHelp(j){
    const m=new Map();
    (j.features||[]).forEach(f=>{if(f&&typeof f==="object"&&/^[a-z0-9][a-z0-9._-]{0,40}$/i.test(String(f.feature_id||"")))m.set(String(f.feature_id),f)});
    return m;
  }
  let hP=null,hIdx=null;
  function loadHelp(){
    if(hP)return hP;
    hP=(async()=>{
      let j=null;
      try{const r=await fetchT(base()+"help/help.json?v="+ver(),{cache:"no-cache"},CFG.helpMs);
        if(r.ok){const x=await r.json();if(validHelp(x)){j=x;wr(KH,x)}}}catch(e){}
      if(!j){const x=rd(KH,null);if(validHelp(x))j=x}          /* offline or GitHub down: the last good copy */
      hIdx=indexHelp(j||{features:[]});
      if(!hIdx.size)hP=null;                                     /* try again next time */
      return hIdx;
    })();
    return hP;
  }
  const compose=f=>SECS.map(s=>String(f&&f[s[0]]||"").trim()).filter(Boolean).join(" ");
  const seen=id=>!!(rd(KS,{})||{})[id];
  const markSeen=id=>{const s=rd(KS,{})||{};s[id]=1;wr(KS,s)};

  /* ---------- 3. the (?) button on every screen ---------- */
  let curRoute="",mo=null,tm=0;
  const enabled=()=>{try{return App.settings.lcHelp!==false}catch(e){return true}};
  function removeBtn(old){const p=old.parentNode;if(p&&p.classList&&p.classList.contains("lc29-row"))p.remove();else old.remove()}
  function ensure(){
    try{
      const view=Q("#view");if(!view||!curRoute)return;
      const old=Q(".lc29-q",view),want=enabled()&&hIdx&&hIdx.has(curRoute);
      if(!want){if(old)removeBtn(old);return}
      if(old&&old.getAttribute("data-lc29-open")===curRoute)return;
      if(old)removeBtn(old);
      const b=document.createElement("button");
      b.type="button";b.className="lc29-q"+(seen(curRoute)?"":" is-new");b.setAttribute("data-lc29-open",curRoute);
      b.setAttribute("aria-label","Help for this screen");b.title="Help";b.textContent="?";
      const host=Q("h1",view)||Q("h2",view);
      if(host)host.appendChild(b);
      else{const row=document.createElement("div");row.className="lc29-row";row.appendChild(b);view.insertBefore(row,view.firstChild)}
    }catch(e){}
  }
  function afterRender(route){
    curRoute=String(route||"");
    try{
      if(!mo&&typeof MutationObserver==="function"){const v=Q("#view");if(v){mo=new MutationObserver(()=>{clearTimeout(tm);tm=setTimeout(ensure,200)});mo.observe(v,{childList:true,subtree:true})}}
    }catch(e){}
    loadHelp().then(()=>ensure()).catch(()=>{});
    setTimeout(ensure,400);
  }

  /* ---------- 4. the help sheet and its audio ---------- */
  let au=null,auUrl="",usedFb=false;
  function dropAudio(){
    if(au){try{au.pause()}catch(e){}au=null}
    if(auUrl){try{URL.revokeObjectURL(auUrl)}catch(e){}auUrl=""}
  }
  function stopAudio(){
    dropAudio();
    if(usedFb){usedFb=false;try{LC19.coach.stop()}catch(e){}}
  }
  function audioHref(f){
    const u=String(f&&f.audio_url||"");if(!u)return"";
    try{const a=new URL(u,siteRoot());
      if(!(a.protocol==="https:"||a.origin===location.origin))return"";
      const h=f.text_hash?"?h="+encodeURIComponent(String(f.text_hash).slice(0,32)):"";
      return a.href.split("?")[0]+h;
    }catch(e){return""}
  }
  const LBL={idle:"\u25B6 Listen",loading:"Loading\u2026",playing:"\u275A\u275A Pause",paused:"\u25B6 Resume"};
  async function listen(f,ui){
    if(au){if(au.paused){try{await au.play();ui("playing")}catch(e){ui("paused")}}else{au.pause();ui("paused")}return}
    if(usedFb){usedFb=false;try{LC19.coach.stop()}catch(e){}ui("idle");return}
    ui("loading");
    const href=f.audio_cached===true?audioHref(f):"";
    if(href){
      let blobOk=false;
      try{
        const r=await fetch(href);if(!r.ok)throw new Error("http");const b=await r.blob();if(!b.size)throw new Error("empty");
        try{LC19.coach.stop()}catch(e){}
        auUrl=URL.createObjectURL(b);const a=new Audio(auUrl);au=a;blobOk=true;
        a.onended=()=>{dropAudio();ui("idle")};
        a.onerror=()=>{dropAudio();ui("idle")};
        try{await a.play();ui("playing")}catch(e){ui("paused");say("Tap Resume to play.")}   /* a browser that wants a fresh tap */
        return;
      }catch(e){if(!blobOk)dropAudio()}
    }
    /* not generated yet (or unreachable): the hub's existing coach voice, which the server caches by text */
    const text=String(f.text_content||"").trim()||compose(f);
    try{
      if(typeof LC19!=="undefined"&&LC19.coach&&typeof LC19.coach.say==="function"){
        usedFb=true;ui("playing");await LC19.coach.say(text,{title:f.title});usedFb=false;ui("idle");return;
      }
    }catch(e){}
    usedFb=false;ui("idle");say("The voice is not available right now.","bad");
  }
  async function open(id){
    if(typeof openSheet!=="function")return;
    stopAudio();
    const idx=await loadHelp(),f=idx&&idx.get(String(id));
    if(!f){say("There is no help for this screen yet.");return}
    markSeen(String(f.feature_id));
    Array.from(document.querySelectorAll(".lc29-q.is-new")).forEach(b=>b.classList.remove("is-new"));
    const parts=SECS.map(s=>{
      const t=String(f[s[0]]||"").trim();
      return t?'<section class="lc29-sec"><h3>'+E(s[1])+"</h3><p>"+E(t)+"</p></section>":"";
    }).join("");
    const html='<div class="lc29-top"><span class="lc29-av" data-lc29-av>'+knight+'</span><div class="lc29-who"><p class="lc29-name">Coach Lanckriet</p><p class="lc29-sub">A quick guide to this screen</p>'+
      '<button type="button" class="btn btn-primary btn-sm lc29-listen" data-lc29-listen>'+LBL.idle+"</button></div></div>"+
      parts+'<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-close>Got it</button></div>'+
      '<p class="small muted lc29-foot">Hide the ? buttons any time in Settings: Show Lanckriet Chess Help.</p>';
    openSheet({title:String(f.title||"Help"),cls:"lc29-sheet",html:html,noFocus:true,onClose:stopAudio,onMount(s){
      const btn=Q("[data-lc29-listen]",s.el),ui=k=>{if(btn&&btn.isConnected){btn.textContent=LBL[k]||LBL.idle;btn.disabled=k==="loading"}};
      if(btn)btn.addEventListener("click",()=>{listen(f,ui)});
      getRandom(f.emotion||"neutral").then(url=>{
        const h=Q("[data-lc29-av]",s.el);if(!h||!url)return;
        h.innerHTML='<img class="lc29-av-img" src="'+E(url)+'" alt="Coach Lanckriet" width="64" height="64" referrerpolicy="no-referrer">';
      }).catch(()=>{});
    }});
  }
  function onClick(e){
    const t=e.target&&e.target.closest?e.target.closest("[data-lc29-open]"):null;if(!t)return;
    e.preventDefault();e.stopPropagation();open(t.getAttribute("data-lc29-open"));
  }
  function init(){
    try{
      if(typeof window!=="undefined")window.getRandomCoachAvatar=getRandom;
      document.addEventListener("click",onClick,true);
      document.addEventListener("change",e=>{try{if(e.target&&e.target.matches&&e.target.matches('[data-p36="lcHelp"]'))setTimeout(ensure,0)}catch(x){}});
      setTimeout(()=>{list("neutral").catch(()=>{})},1500);        /* warm the list the mini-player uses */
    }catch(e){console.error("lc29 init",e)}
  }
  return{init:init,afterRender:afterRender,open:open,
    avatar:{get:getRandom,peek:peek,list:list,emotions:EMOTIONS.slice()},
    help:{load:loadHelp,compose:compose},
    _t:{norm:norm,okName:okName,pickFrom:pickFrom,probe:probe,audioHref:audioHref,base:base,ensure:ensure,mem:mem}};
})();
