/*@@module lc94*/
const LC94=(()=>{
  "use strict";
  /* LC94 (build 9.58.0): the funnel, the first-click source and the ?u= deep link. Same text in index.html (the landing page) and app.html.
     1. Funnel: 11 steps, each sent ONCE per device to public.lc94_step (sql/20261118100000_lc94_funnel.sql). The device id is the app's own
        deviceId() (localStorage "lc-hub-device"), the same id the checkout sends to Stripe, so the server can add the last step ("paid").
          landing, iab_open, first_open, name_entered, first_review_done, signed_in, install, day2_return, paywall_seen, checkout_started, paid
        Nothing is sent for the owner in admin mode. A failed call is retried on the next page load (a step counts as sent only on HTTP 2xx).
     2. Source: the first non-empty ?src=, ?utm_source=, ?ref= or LC73 short-link code this device ever saw (localStorage "lc94-src"),
        sent with every step. ?source=iab (LC87's "open outside" link) is not a source: it keeps the original one.
     3. Deep link (app only): /app.html?u=<Chess.com or Lichess name>&site=chesscom|lichess&src=mc_ig. The name is taken as the answer to the
        first-run question, the "How did you find us?" step is filled from ?src= when it names a platform, and the first review starts at once
        (LC42.begin -> LC50 scans the latest game on the device with Stockfish). The parameters leave the address bar so a reload does not restart it.
     3b. (9.67.0, undone in 9.75.0: the quick start goes straight into the review again; LC102 only keeps the name) The landing's quick start no longer jumps into the app: LC102 keeps the name (localStorage "lc102-handoff"), starts the
        install and shows an "Open the app" card. The app reads that handoff when it is opened without ?u= (readHand), once, 7 days max.
     4. In an Instagram / TikTok / Facebook browser (LC87 soft mode) one LC88 step after the first review: "Keep this review", which opens the same
        game in Chrome / Safari (the in-app browser keeps nothing once it is closed).
     5. (9.74.0) Clean numbers: nothing is sent from a Vercel preview address (*-lanckrietchess.vercel.app), with ?lc94=0, or from a device
        that was marked as the owner's (localStorage "lc94-excluded"). A device is marked when the owner's account is signed in (LC49) or the
        landing editor (LC89) confirmed an admin session; excludeMe(token) also asks the server (lc94_exclude_me, admin only), which deletes
        the device's old rows and ignores it from then on. */
  const W=window,D=document,VERSION="9.75.0";
  const STEPS=["landing","iab_open","first_open","name_entered","first_review_done","signed_in","install","day2_return","paywall_seen","checkout_started","paid"];
  const K_X="lc94-excluded",K_DONE="lc94-done",K_SRC="lc94-src",K_FIRST="lc94-first",K_DEEP="lc94-deep",K_IABX="lc94-iab-x",K_DEV="lc-hub-device";
  const NAME=/^[A-Za-z0-9_-]{2,30}$/,DEV_RE=/^d-[a-z0-9]{12,40}$/;
  const isApp=()=>/\/app(\.html)?$/.test(location.pathname);
  const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
  const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  const ssGet=k=>{try{return JSON.parse(sessionStorage.getItem(k)||"null")}catch(e){return null}};
  const ssSet=(k,v)=>{try{if(v==null)sessionStorage.removeItem(k);else sessionStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  const clean=(v,n)=>String(v==null?"":v).toLowerCase().replace(/[^a-z0-9_.-]/g,"").slice(0,n||40);
  const admin=()=>{try{return typeof Admin!=="undefined"&&!!Admin.active}catch(e){return false}};
  const iab=()=>W.__lcIab==="soft";

  /* ---------- the device id: the app's deviceId(), or the same format on the landing page (same storage, so both pages agree) ---------- */
  function dev(){
    try{if(typeof deviceId==="function")return deviceId()}catch(e){}
    let id=lsGet(K_DEV,"");
    if(!DEV_RE.test(id||"")){id="d-"+Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>(b<36?"0":"")+b.toString(36)).join("").slice(0,20);lsSet(K_DEV,id)}
    return id;
  }
  /* ---------- the first-click source ---------- */
  function captureSource(search){
    if(lsGet(K_SRC,""))return lsGet(K_SRC,"");
    let s="";
    try{const P=new URLSearchParams(search==null?location.search:search);s=clean(P.get("src"))||clean(P.get("utm_source"))||clean(P.get("ref"))}catch(e){}
    if(!s){const c=lsGet("lc73-src",null);if(c&&typeof c==="object")s=clean(c.code)||clean(c.utm_source)||clean(c.ref)}
    if(s==="iab")s="";
    if(s)lsSet(K_SRC,s);
    return s;
  }
  const src=()=>lsGet(K_SRC,"")||"";
  /* the platform a source names, for the app's own "How did you find us?" answer (LC30) */
  function platformOf(s){
    s=String(s||"");
    return/^(mc_)?(ig|insta)/.test(s)?"instagram":/^(mc_)?(tt|tk|tiktok)/.test(s)?"tiktok":/^(mc_)?(yt|youtube)/.test(s)?"youtube":/^(mc_)?(fb|facebook)/.test(s)?"facebook":/^(mc_)?(x|tw)([_.-]|p$|$)/.test(s)?"x":"";
  }

  /* ---------- the funnel ---------- */
  function endpoint(){
    let u="",k="";
    try{const c=CONFIG.features.supabase;u=c.url;k=c.anonKey}catch(e){}
    if(!u||!k){try{u=D.querySelector('meta[name="lc-sb-url"]').getAttribute("content");k=D.querySelector('meta[name="lc-sb-key"]').getAttribute("content")}catch(e){}}
    return/^https:\/\//.test(u||"")&&k?{u:String(u).replace(/\/+$/,""),k:k}:null;
  }
  const sent=()=>lsGet(K_DONE,{})||{};
  const preview=h=>/-lanckrietchess\.vercel\.app$/i.test(String(h==null?location.hostname:h));
  const excluded=()=>{try{return!!lsGet(K_X,0)||preview()||/[?&]lc94=0(&|$)/.test(location.search)}catch(e){return false}};
  let xAsked=0;
  /* the owner's device: never counted again; with a session token the server also drops its old rows (admin only) */
  function excludeMe(token){
    try{
      lsSet(K_X,Date.now());
      const ep=endpoint();if(!ep||!token||xAsked||typeof fetch!=="function")return false;
      xAsked=1;
      fetch(ep.u+"/rest/v1/rpc/lc94_exclude_me",{method:"POST",credentials:"omit",headers:{"Content-Type":"application/json",apikey:ep.k,Authorization:"Bearer "+token},
        body:JSON.stringify({p_aid:dev()})}).then(r=>{if(!r||!r.ok)xAsked=0}).catch(()=>{xAsked=0});
      return true;
    }catch(e){return false}
  }
  function ownerHere(){
    try{if(typeof LC49!=="undefined"&&(LC49.ownerAccount&&LC49.ownerAccount()||LC49.hard&&LC49.hard()))return true}catch(e){}
    try{if(typeof Admin!=="undefined"&&Admin.real&&Admin.real())return true}catch(e){}
    return false;
  }
  function checkOwner(){
    if(xAsked||!ownerHere())return;
    let t="";try{const s=LC26.sync.session();t=s&&s.access_token||""}catch(e){}
    if(t)excludeMe(t);else lsSet(K_X,Date.now());
  }
  const pending={};
  function step(name){
    try{
      if(STEPS.indexOf(name)<0||name==="paid"||admin()||excluded())return false;
      if(sent()[name]||pending[name])return false;
      const ep=endpoint();if(!ep||typeof fetch!=="function")return false;
      pending[name]=1;
      fetch(ep.u+"/rest/v1/rpc/lc94_step",{method:"POST",keepalive:true,credentials:"omit",
        headers:{"Content-Type":"application/json",apikey:ep.k,Authorization:"Bearer "+ep.k},
        body:JSON.stringify({p_aid:dev(),p_step:name,p_src:src()||null})})
        .then(r=>{if(r&&r.ok){const d=sent();d[name]=Date.now();lsSet(K_DONE,d)}})
        .catch(()=>{})
        .then(()=>{delete pending[name]});
      return true;
    }catch(e){return false}
  }

  /* ---------- the deep link (app.html?u=...) ---------- */
  function readDeep(search){
    try{
      const P=new URLSearchParams(search==null?location.search:search),u=String(P.get("u")||"").trim();
      if(!NAME.test(u))return null;
      const site=/^li/i.test(String(P.get("site")||""))?"lichess":"chesscom",e=parseInt(P.get("elo")||"",10);
      /* 9.79.0: an LC109 short link (ManyChat) may also bring the rating: used when the site's own rating cannot be read */
      return e>=100&&e<=3500?{u:u,site:site,elo:e}:{u:u,site:site};
    }catch(e){return null}
  }
  /* 9.67.0: the landing's quick start (LC102) keeps the name in localStorage "lc102-handoff". An installed app opens on its own start
     address (no ?u=), so the app reads it here: used once, at most 7 days old. A real ?u= link wins and clears it. */
  const K_HAND="lc102-handoff";
  function readHand(){
    try{
      const h=lsGet(K_HAND,null);if(!h)return null;
      localStorage.removeItem(K_HAND);
      if(!h||typeof h!=="object"||!NAME.test(h.u||"")||!(Date.now()-(+h.at||0)<7*864e5))return null;
      return{u:h.u,site:h.site==="lichess"?"lichess":"chesscom",via:"handoff"};
    }catch(e){return null}
  }
  function stripDeep(){
    try{
      const url=new URL(location.href);let ch=false;
      ["u","site","resume","elo"].forEach(k=>{if(url.searchParams.has(k)){url.searchParams.delete(k);ch=true}});
      if(ch)history.replaceState(history.state,"",url.pathname+(url.searchParams.toString()?"?"+url.searchParams.toString():"")+url.hash);
    }catch(e){}
  }
  const trimCount=()=>{try{const s=Store.get("lc-hub-trim-stats-v1",{})||{};return Object.keys(s.games||{}).length}catch(e){return 0}};
  /* 9.59.0: "How did you find this app?" is not asked when the link already says it (?src=ig_bio, ?src=mc_ig, an LC73 short link).
     LC30 then opens straight on "Connect your Chess.com or Lichess account": one question less before the first review. */
  function attrFromSource(){
    try{
      const pl=platformOf(src());
      if(pl&&typeof LC30!=="undefined"&&LC30.attribution&&!(LC30.state()||{}).attr)return LC30.attribution.save({source:"social",detail:pl,creator:LC30.attribution.DEFAULT_CREATOR});
    }catch(e){}
    return false;
  }
  /* called by boot() right before the first-run sheet would open. true = the deep link took over (no first-run sheet). */
  function deepStart(){
    const d=ssGet(K_DEEP);if(!d||!NAME.test(d.u||""))return false;
    ssSet(K_DEEP,null);
    try{
      if(typeof LC42!=="undefined"&&LC42.owns())return false;   /* already on the road: nothing to restart */
      const onb=!!(typeof App!=="undefined"&&App.onboarded);
      if(onb&&trimCount()>0)return false;                          /* a returning player with reviews: the link changes nothing */
      if(typeof App!=="undefined"){
        const p=Object.assign({},App.profile||{});
        if(d.site==="lichess")p.lichess_username=d.u;else p.chess_com_username=d.u;
        try{App.profile=typeof sanitizeProfile==="function"?sanitizeProfile(p):p}catch(e){App.profile=p}
        App.onboarded=true;try{App.save()}catch(e){}
      }
      const pl=platformOf(src());
      try{if(!Store.get("lc80-onb",null))Store.set("lc80-onb",{done:true,at:Date.now(),platform:pl,code:"",creator:"",mspc:"",pain:"",v:"8.0",via:"deeplink"})}catch(e){}
      attrFromSource();
      try{if(typeof LC50!=="undefined")LC50.pre.start(d.site,d.u)}catch(e){}
      /* 9.59.0: the rating too, like LC30's Connect does (the Learn page's "Active ELO" and the coach's level read it) */
      const setElo=r=>{if(r&&typeof App!=="undefined"&&!(App.profile||{}).elo){App.profile=Object.assign({},App.profile,{elo:r});try{App.save()}catch(e){}}};
      try{if(typeof Elo!=="undefined"&&Elo.fetchProfile)Elo.fetchProfile(d.site,d.u).then(pr=>{setElo(pr&&(pr.rapid||pr.blitz||pr.bullet)||d.elo)}).catch(()=>setElo(d.elo));else setElo(d.elo)}catch(e){}
      setTimeout(()=>{try{if(typeof LC42!=="undefined"&&LC42.begin(d.site==="lichess"?{li:d.u}:{cc:d.u}))step("name_entered")}catch(e){console.error("lc94 deep",e)}},600);
      return true;
    }catch(e){console.error("lc94 deep",e);return false}
  }

  /* ---------- the in-app browser step (LC88 source "iab"): keep this review, open it in Chrome / Safari ---------- */
  function reviewDone(){
    try{if(typeof LC42!=="undefined"&&/^(sys|libq|second|done)$/.test(String(LC42._t.st().step||"")))return true}catch(e){}
    return trimCount()>0;
  }
  function resumeUrl(){
    let site="",user="";
    try{const s=LC42._t.st();site=s.site||"";user=s.user||""}catch(e){}
    if(!user){try{const p=App.profile||{};if(p.chess_com_username){site="chesscom";user=p.chess_com_username}else if(p.lichess_username){site="lichess";user=p.lichess_username}}catch(e){}}
    const u=new URL("/app.html",location.href);
    if(NAME.test(user)){u.searchParams.set("u",user);u.searchParams.set("site",site==="lichess"?"lichess":"chesscom");u.searchParams.set("resume","1")}
    const s=src();if(s)u.searchParams.set("src",s);
    return u.href;
  }
  function openOutside(){try{if(W.LC87&&LC87.out)return LC87.out(resumeUrl())}catch(e){}location.href=resumeUrl()}
  function iabStep(){
    if(!iab()||!reviewDone())return null;
    const x=+lsGet(K_IABX,0)||0;if(x&&Date.now()-x<3*864e5)return null;
    const L=W.LC87||{},label=L.android?"Open in Chrome":(L.ios&&L.iosV>=17)?"Open in Safari":"Copy the link",app=L.app||"this app";
    return{html:"<b>Keep this review.</b> <span class=\"lc88-s\">The browser inside "+String(app).replace(/[<>&"]/g,"")+" forgets everything when you close it. Open the app in your own browser: your game comes along.</span>",
      acts:[{label:label,run:openOutside,primary:true},{label:"×",dismiss:true,run:()=>lsSet(K_IABX,Date.now())}],sig:"iab"};
  }

  /* ---------- the landing page's quick start (9.59.0): the name in, straight to the first mistake ----------
     <form id="lc94-qs"> under the hero title: a Chess.com name (or Lichess, one tap) goes to /app.html?u=<name>&site=...&src=<first source>.
     No install, no account, no question first; it works inside Instagram / TikTok too (LC87 soft mode). */
  function quickStart(){
    const f=D.getElementById("lc94-qs");if(!f||f.__lc94)return;f.__lc94=1;
    const inp=f.querySelector("input[name=u]"),msg=f.querySelector("[data-qs-msg]"),sw=f.querySelector("[data-qs-site]");
    let site="chesscom";
    const label=()=>{if(inp)inp.placeholder=site==="lichess"?"Your Lichess username":"Your Chess.com username";if(sw)sw.textContent=site==="lichess"?"I play on Chess.com":"I play on Lichess"};
    if(sw)sw.addEventListener("click",e=>{e.preventDefault();site=site==="lichess"?"chesscom":"lichess";label();try{inp.focus()}catch(x){}});
    /* 9.79.0: an LC109 short link set to "landing page" brings the name (?u=&site=): it is filled in, one tap starts the review */
    try{const d=readDeep();if(d&&inp){inp.value=d.u;site=d.site;f.setAttribute("data-lc109-filled","1");
      if(msg)msg.textContent="Your "+(site==="lichess"?"Lichess":"Chess.com")+" name is filled in: one tap and I show you your biggest mistake.";
      const b=f.querySelector("button[type=submit],button:not([type])");if(b)try{b.focus({preventScroll:true})}catch(x){}}}catch(x){}
    f.addEventListener("submit",e=>{
      e.preventDefault();
      let u=String(inp&&inp.value||"").trim().replace(/^@/,"");
      const m=/(?:chess\.com\/(?:member|\w+\/member)\/|lichess\.org\/(?:@\/)?)([A-Za-z0-9_-]{2,30})/i.exec(u);
      if(m){if(/lichess/i.test(u))site="lichess";u=m[1]}
      if(!NAME.test(u)){if(msg)msg.textContent="Type your "+(site==="lichess"?"Lichess":"Chess.com")+" username: letters, numbers, - and _.";try{inp.focus()}catch(x){}return}
      const url=new URL("/app.html",location.href);url.searchParams.set("u",u);url.searchParams.set("site",site);
      const s=src();if(s)url.searchParams.set("src",s);
      step("name_entered");
      /* 9.67.0: LC102 (landing only) keeps the name on the device, starts the install from this same tap and shows a small "Open the app"
         card once that is done (never over a playing video). No jump into the app and no review on submit. Without LC102: the old jump. */
      /* 9.75.0: value first again: the name goes straight into the review (in this browser, no install, no account). LC102 only keeps
         the name on the device, so an app installed later still opens on this player. The install comes after the review (LC107). */
      try{if(typeof LC102!=="undefined"&&LC102._t&&LC102._t.save)LC102._t.save(u,site,s)}catch(x){}
      (W.__lcNav||function(x){location.href=x})(url.pathname+url.search);
    });
    label();
  }

  /* ---------- watchers ---------- */
  let tick=0;
  function watch(){
    if(D.hidden)return;
    checkOwner();
    const s=sent();
    if(!s.first_review_done&&reviewDone())step("first_review_done");
    if(!s.paywall_seen&&D.querySelector(".lc90-sheet")&&!admin())step("paywall_seen");
  }
  function wrapCheckout(){
    try{
      if(typeof LC36==="undefined"||!LC36.support||typeof LC36.support.go!=="function"||LC36.support.go.__lc94)return;
      const g=LC36.support.go,f=function(u){try{if(/^https:\/\/[a-z0-9.-]*stripe\.com\//i.test(String(u||"")))step("checkout_started")}catch(e){}return g.apply(this,arguments)};
      f.__lc94=1;LC36.support.go=f;
    }catch(e){}
  }
  function wrapBegin(){
    try{
      if(typeof LC42==="undefined"||typeof LC42.begin!=="function"||LC42.begin.__lc94)return;
      const b=LC42.begin,f=function(){const r=b.apply(this,arguments);if(r)step("name_entered");return r};
      f.__lc94=1;LC42.begin=f;
    }catch(e){}
  }

  function init(){
    try{
      captureSource();
      if(isApp())checkOwner();
      const standalone=(()=>{try{return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}catch(e){return false}})();
      if(iab())step("iab_open");
      W.addEventListener("appinstalled",()=>step("install"));
      if(!isApp()){step("landing");quickStart();return}
      /* the app */
      let d=readDeep();
      if(d){try{localStorage.removeItem(K_HAND)}catch(e){}}else d=readHand();
      if(d){ssSet(K_DEEP,d);stripDeep();
        /* LC30 asks "How familiar are you with chess?" on a brand-new install 600 ms after start: the link already answered it */
        try{if(typeof LC30!=="undefined"&&LC30.level0&&!LC30.level0.s().choice)LC30.level0.set({choice:"know",auto:true,via:"deeplink"})}catch(e){}}
      const first=+lsGet(K_FIRST,0)||0;
      if(!first)lsSet(K_FIRST,Date.now());else if(Date.now()-first>=20*36e5)step("day2_return");
      attrFromSource();
      step("first_open");
      if(standalone)step("install");
      W.addEventListener("lc39-signed-in",()=>step("signed_in"));
      wrapCheckout();wrapBegin();
      if(!tick)tick=setInterval(watch,4000);
    }catch(e){console.error("lc94",e)}
  }
  return{VERSION:VERSION,STEPS:STEPS,init:init,step:step,excludeMe:excludeMe,excluded:excluded,deepStart:deepStart,iabStep:iabStep,src:src,
    _t:{preview:preview,ownerHere:ownerHere,readHand:readHand,captureSource:captureSource,platformOf:platformOf,attrFromSource:attrFromSource,quickStart:quickStart,readDeep:readDeep,resumeUrl:resumeUrl,reviewDone:reviewDone,dev:dev,watch:watch}};
})();
/*@@end lc94*/
