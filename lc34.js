/* ==========================================================================
   LC34 (hub 9.12.0): launch layer.
   1. Device routing after the first value moment (Android web: Google Play overlay; iOS: Add to Home Screen overlay; Play app: nothing).
   2. The habit week: 3 free tokens a day for the first 7 days (the server is the authority; this is the offline fallback and the display).
   3. ONE master sales offer, fired by real friction, replacing the Growth Path survey and the Tier 2 / Tier 3 sales bots as pop-up triggers.
   4. Pro yearly tranches (Founding / Early Adopter / Standard), checkout through the Stripe Edge Function, key claim after payment.
   5. Founding Member and Early Adopter badges with inheritance.
   Additive: every hook in the old code is guarded by typeof LC34 or try/catch. All text is English.
   ========================================================================== */
const LC34=(()=>{
  "use strict";
  const VERSION="34.0.0",DAY=864e5;
  const K={first:"lc34-first",ent:"lc34-ent",fun:"lc34-fun",dev:"lc34-dev",val:"lc34-val",pend:"lc34-pending",price:"lc34-price"};
  const E=s=>{try{return typeof esc==="function"?esc(s):String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}catch(e){return""}};
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.from((r||document).querySelectorAll(s));
  const ic=n=>{try{return typeof icon==="function"?icon(n):""}catch(e){return""}};
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}};
  const wr=(k,v)=>{try{return Store.set(k,v)}catch(e){return false}};
  const say=(m,k,ms)=>{try{toast(m,k,ms)}catch(e){}};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const dayKey=()=>{try{return new Date().toLocaleDateString("en-CA")}catch(e){return new Date().toISOString().slice(0,10)}};
  const eur=c=>{c=+c||0;return"€"+(c%100===0?String(c/100):(c/100).toFixed(2))};
  const httpsOk=u=>{try{return/^https:\/\//i.test(String(u||""))&&!!new URL(String(u)).host}catch(e){return false}};

  /* ======================= 1. device ======================= */
  const dev={
    ua:()=>String(navigator.userAgent||""),
    isAndroid(){return/Android/i.test(dev.ua())},
    isIOS(){return/iPhone|iPad|iPod/i.test(dev.ua())||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1)},
    standalone(){try{return!!(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true}catch(e){return false}},
    inAppBrowser(){return/FBAN|FBAV|Instagram|TikTok|musical_ly|Snapchat|MicroMessenger|Line\//i.test(dev.ua())},
    /* The Google Play app is a Trusted Web Activity: Chrome sets document.referrer to android-app://<package> when it launches. sessionStorage keeps that for the visit.
       ?src=play on the start URL does the same, for a build that has no referrer. The browser and the installed web app never carry either. */
    inPlay(){
      try{
        if(sessionStorage.getItem("lc34-play")==="1")return true;
        const p=new URLSearchParams(location.search||"");
        if(/^android-app:\/\//i.test(document.referrer||"")||p.get("src")==="play"){sessionStorage.setItem("lc34-play","1");return true}
      }catch(e){}
      return false;
    },
    playUrl(){try{const l=CONFIG.links||{},u=l.playStore||l.playReview;return httpsOk(u)?String(u):""}catch(e){return""}},
    mode(){return dev.inPlay()?"play-app":dev.isAndroid()?"android-web":dev.isIOS()?"ios":"other"}
  };
  const snooze=(key,days)=>{const s=rd(K.dev,{});s[key]=Date.now()+days*DAY;wr(K.dev,s)};
  const snoozed=key=>{const s=rd(K.dev,{});return(s[key]||0)>Date.now()};
  const flag=(key,v)=>{const s=rd(K.dev,{});if(v===undefined)return!!s[key];s[key]=v;wr(K.dev,s)};

  function androidOverlay(){
    if(dev.mode()!=="android-web")return false;                       /* the Play app, iOS and desktop never see it */
    const url=dev.playUrl();if(!url)return false;                     /* no link set in admin mode: stay quiet rather than show a dead button */
    if(snoozed("andUntil")||Q(".lc34-and"))return false;
    snooze("andUntil",7);
    openSheet({title:"Get the Android app",cls:"lc34-sheet lc34-and",noFocus:true,
      html:'<div class="lc34-hero"><span class="lc34-appico" aria-hidden="true">'+ic("chess-knight")+'</span><div><h3>Train in the official app</h3>'+
        '<p>The Lanckriet Chess app on Google Play opens full-screen from your home screen and updates itself.</p></div></div>'+
        '<div class="btn-row"><a class="btn btn-primary" data-lc34-play href="'+E(url)+'" target="_blank" rel="noopener noreferrer">'+ic("google-play")+" Open Google Play</a>"+
        '<button type="button" class="btn btn-quiet" data-close>Not now</button></div>',
      onMount(sh){const a=Q("[data-lc34-play]",sh.el);if(a)a.addEventListener("click",()=>{snooze("andUntil",90)})}});
    return true;
  }
  const SVG_SHARE='<svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M24 30V7M16 15l8-8 8 8"/><path d="M14 22H11a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h26a2 2 0 0 0 2-2V24a2 2 0 0 0-2-2h-3"/></svg>';
  const SVG_ADD='<svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="7" width="34" height="34" rx="8"/><path d="M24 16v16M16 24h16"/></svg>';
  const SVG_APP='<svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="12" y="4" width="24" height="40" rx="6"/><rect x="18" y="12" width="12" height="12" rx="3" fill="currentColor" stroke="none"/><path d="M20 38h8"/></svg>';
  function iosOverlay(){
    if(!dev.isIOS()||dev.standalone()||dev.inAppBrowser())return false;
    const s=rd(K.dev,{});if(s.iosShown>=3||snoozed("iosUntil")||Q(".lc34-ios"))return false;
    s.iosShown=(s.iosShown|0)+1;wr(K.dev,s);snooze("iosUntil",14);
    openSheet({title:"Keep it one tap away",cls:"lc34-sheet lc34-ios",noFocus:true,
      html:'<p class="lc34-lead">Nice work. Put the Hub on your home screen so tomorrow\'s tokens are one tap away.</p>'+
        '<ol class="lc34-steps"><li><span class="lc34-stepico">'+SVG_SHARE+'</span><span><b>1.</b> Tap <b>Share</b> in Safari</span></li>'+
        '<li><span class="lc34-stepico">'+SVG_ADD+'</span><span><b>2.</b> Tap <b>Add to Home Screen</b></span></li>'+
        '<li><span class="lc34-stepico">'+SVG_APP+'</span><span><b>3.</b> Launch from your home screen</span></li></ol>'+
        '<div class="btn-row"><button type="button" class="btn btn-primary" data-close>Got it</button></div>'});
    return true;
  }
  /* first value moment: a finished Trim or the first token spent. Counted once per kind of event, never on the very first screen. */
  const val={
    n:()=>rd(K.val,{n:0}).n|0,
    done:()=>val.n()>0
  };
  function value(kind){
    try{
      const v=rd(K.val,{n:0,first:0});v.n=(v.n|0)+1;if(!v.first){v.first=Date.now();v.kind=String(kind||"").slice(0,20)}wr(K.val,v);
      if(v.n===1){
        /* let the reward land first (confetti, XP, the result itself), then show the one overlay that belongs to this device */
        setTimeout(()=>{try{if(dev.isIOS())iosOverlay();else if(dev.mode()==="android-web")androidOverlay()}catch(e){console.error(e)}},1800);
      }
    }catch(e){console.error(e)}
  }
  /* "login": the first-run questions are closed (or never opened). We look every 1.5 s for up to two minutes, once per visit. */
  let loginDone=false;
  function waitLogin(){
    let tries=0;const iv=setInterval(()=>{
      tries++;if(loginDone||tries>80){clearInterval(iv);return}
      if(Q(".lc30-ask")||Q(".sheet-wrap"))return;                      /* never on top of the first-run flow or another sheet */
      loginDone=true;clearInterval(iv);
      try{if(dev.mode()==="android-web")androidOverlay()}catch(e){console.error(e)}
    },1500);
  }

  /* ======================= 2. the habit week ======================= */
  const tokens={
    first(){let f=+rd(K.first,0);if(!f){f=Date.now();wr(K.first,f)}return f},
    week1On(){return Date.now()-tokens.first()<7*DAY},
    /* offline fallback only: when the server answered, Quota uses the limit it sent */
    limitFor(n,LIM){return(n==="free"||!LIM[n])&&tokens.week1On()?Math.max(3,LIM.free):(LIM[n]||LIM.free)},
    info(){
      let st=null;try{st=Quota.state()}catch(e){}
      if(st&&st.week1&&st.week1Ends>Date.now())return{on:true,left:Math.max(1,Math.ceil((st.week1Ends-Date.now())/DAY)),src:"server"};
      if(st&&st.week1===false&&typeof st.limit==="number")return{on:false};            /* the server said the week is over */
      return tokens.week1On()?{on:true,left:Math.max(1,Math.ceil((tokens.first()+7*DAY-Date.now())/DAY)),src:"device"}:{on:false};
    }
  };

  /* ======================= 3. pricing and the master offer ======================= */
  const sbUrl=()=>{try{return String(CONFIG.features.supabase.url||"").replace(/\/+$/,"")}catch(e){return""}};
  async function api(path,body){
    const base=sbUrl();if(!base)return{ok:false,reason:"not_configured",status:0};
    try{
      const res=await fetchWithTimeout(base+"/functions/v1/stripe/"+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body||{})},path==="subscribe"?15e3:8e3);
      const j=await res.json().catch(()=>({}));return Object.assign({status:res.status},j);
    }catch(e){return{ok:false,reason:"network",status:0}}
  }
  let priceMem=null;
  const FALLBACK={ok:false,tranche:3,left:[0,0],yearly:[20000,30000,40000],base:40000,monthly:3900,caps:[100,100]};
  const pricingNow=()=>priceMem||rd(K.price,null)||FALLBACK;
  async function pricing(force){
    if(!force&&priceMem&&Date.now()-priceMem.at<30e3)return priceMem;
    const r=await api("pricing",{});
    if(r&&r.ok&&Array.isArray(r.left)){priceMem=Object.assign({},r,{at:Date.now()});wr(K.price,priceMem);return priceMem}
    return pricingNow();
  }
  const live=p=>!!(p&&p.ok);                                            /* only talk about places left when the server told us */
  function offerCard(p){
    const t=p.tranche||3,price=eur(p.yearly[t-1]||p.base),base=eur(p.base),m=eur(p.monthly),yr=eur(p.monthly*12);
    const names={1:"Founding Member rate",2:"Early Adopter rate",3:"Pro, billed yearly"};
    const cap=p.caps&&p.caps[t-1]||100,left=p.left&&p.left[t-1],bar=live(p)&&t<3?Math.max(4,Math.round((1-left/cap)*100)):0;
    let h='<div class="lc34-card is-t'+t+'"><span class="lc34-tag">'+names[t]+'</span>';
    h+='<div class="lc34-price"><b>'+price+'</b><span>/year</span>'+(t<3?' <s>'+base+'</s><em>'+Math.round((1-p.yearly[t-1]/p.base)*100)+'% off</em>':"")+"</div>";
    if(t<3&&live(p))h+='<div class="lc34-bar" role="img" aria-label="'+left+' of '+cap+' places left"><i style="width:'+bar+'%"></i></div><p class="lc34-left"><b>'+left+" of "+cap+"</b> "+(t===1?"Founding":"Early Adopter")+" places left</p>";
    if(t===1)h+='<p class="lc34-lock"><b>Lock in your Lifetime Founding Rate.</b> The price never goes up as long as your subscription stays active.</p><ul class="lc34-perks"><li>Founding Member badge, yours for good</li><li>Early Adopter badge unlocked automatically</li></ul>';
    else if(t===2)h+='<p class="lc34-lock"><b>Lock in your Early Adopter rate.</b> The price never goes up as long as your subscription stays active.</p><ul class="lc34-perks"><li>Early Adopter badge, yours for good</li></ul>';
    else h+='<p class="lc34-lock">Yearly is the best value: paying monthly would cost '+yr+' a year.</p>';
    return h+"</div>";
  }
  function ctaText(p){const t=p.tranche||3;return t===1?"Lock in my Founding rate · "+eur(p.yearly[0])+"/year":t===2?"Lock in my Early Adopter rate · "+eur(p.yearly[1])+"/year":"Get Pro · "+eur(p.base)+"/year"}
  function offerBody(ctx,p,opts){
    opts=opts||{};
    const play=dev.inPlay();
    let h=opts.pitch===false?"":'<p class="lc34-msg"><b>Your personal coach costs €80+/hour in the real world.</b> Get an elite 24/7 AI coach in your pocket for a fraction of the cost.</p>';
    if(opts.pitch!==false&&ctx&&ctx.leakText)h+='<p class="lc34-ctx">What keeps costing you points right now: <b>'+E(ctx.leakText)+"</b>.</p>";
    if(play)return h+'<p class="small muted">Already a member? Enter your key in <a href="#upgrades">Membership</a>.</p><div class="btn-row"><button type="button" class="btn btn-quiet" data-close>Close</button></div>';
    h+=offerCard(p);
    h+='<div class="btn-row lc34-actions"><button type="button" class="btn btn-primary lc34-cta" data-lc34="buy" data-plan="yearly">'+ic("lock")+" "+E(ctaText(p))+"</button>"+
       (opts.sheet?'<button type="button" class="btn btn-quiet" data-lc34="later">Not now</button>':"")+"</div>"+
       '<p class="lc34-sub"><button type="button" class="lc34-link" data-lc34="buy" data-plan="monthly">Or pay '+eur(p.monthly)+" every month</button> · <a href=\"#upgrades\" data-close>See all plans</a></p>"+
       '<p class="lc34-fine" data-lc34-msg role="status"></p>';
    return h;
  }
  const fun={
    st:()=>Object.assign({day:"",n:0,last:0},rd(K.fun,{})),
    free(){try{return String(App.access&&App.access.tier||"free")==="free"}catch(e){return true}},
    isAdmin(){try{return!!(typeof Admin!=="undefined"&&Admin.active)}catch(e){return false}},
    /* one master offer, only for free members, only after they have had value, at most once a day and not twice within 6 hours */
    eligible(){
      if(!fun.free()||fun.isAdmin()||!val.done())return false;
      const s=fun.st();if(s.day===dayKey()&&s.n>=1)return false;
      return Date.now()-s.last>=6*36e5;
    },
    /* called by the old Growth Path entry points. Always answers true (the old survey and bots no longer open); shows the master offer when eligible. */
    takeOver(ctx,opt){
      if(opt&&opt.preview)return false;
      try{if(fun.eligible())setTimeout(()=>fun.show(ctx||{},"trigger"),0)}catch(e){console.error(e)}
      return true;
    },
    show(ctx,src){
      if(Q(".lc34-offer"))return;
      const s=fun.st();wr(K.fun,{day:dayKey(),n:s.day===dayKey()?s.n+1:1,last:Date.now(),total:(s.total|0)+1,src:String(src||"").slice(0,20)});
      let sheet=null;
      openSheet({title:"Your coach, 24/7",cls:"lc34-sheet lc34-offer",noFocus:true,html:'<div data-lc34-body>'+offerBody(ctx,pricingNow(),{sheet:true})+"</div>",
        onMount(sh){sheet=sh}});
      pricing().then(p=>{const b=sheet&&Q("[data-lc34-body]",sheet.el);if(b&&document.body.contains(b))b.innerHTML=offerBody(ctx,p,{sheet:true})}).catch(()=>{});
    },
    later(){const s=Q(".lc34-offer .sheet-head [data-close]");if(s)s.click()}
  };
  async function buy(plan,btn,msgEl){
    const say2=t=>{if(msgEl)msgEl.textContent=t};
    if(dev.inPlay()){say2("Subscriptions are not available inside the Android app yet.");return}
    const old=btn&&btn.innerHTML;if(btn){btn.disabled=true;btn.textContent="Opening secure checkout…"}
    const r=await api("subscribe",{plan:plan,device:(()=>{try{return deviceId()}catch(e){return""}})()});
    if(r.ok&&r.url&&httpsOk(r.url)){wr(K.pend,{session:r.session,at:Date.now(),plan:plan,tranche:r.tranche});location.href=r.url;return}
    if(btn){btn.disabled=false;btn.innerHTML=old}
    const why={not_configured:"Checkout is not open yet. Please try again soon.",slow_down:"Too many tries. Wait a minute and try again.",network:"No connection. Check your internet and try again.",bad_email:"That email does not look right."};
    say2(why[r.reason]||"Checkout could not start. Nothing was charged. Please try again.");
  }
  /* ----- after Stripe: claim the key, switch Pro on, show the badge ----- */
  async function claim(session,sheetEl){
    const set=(t,sub)=>{const b=sheetEl&&Q("[data-lc34-claim]",sheetEl);if(b)b.innerHTML='<p class="lc34-lead"><b>'+E(t)+"</b></p>"+(sub?'<p class="small muted">'+E(sub)+"</p>":"")};
    for(let i=0;i<45;i++){
      const r=await api("claim",{session:session});
      if(r.ok&&r.status==="paid"&&r.key)return r;
      if(r.status===404||r.status===400||(r.ok&&(r.status==="expired"||r.status==="refunded")))return r;
      if(i===5)set("Still confirming your payment…","Stripe can take up to a minute. You can keep this open.");
      await sleep(2e3);
    }
    return{ok:false,reason:"timeout"};
  }
  async function afterCheckout(session){
    if(Q(".lc34-claim"))return;
    let sheet=null;
    openSheet({title:"Confirming your payment",cls:"lc34-sheet lc34-claim",noFocus:true,locked:true,html:'<div data-lc34-claim><p class="lc34-lead"><b>One moment…</b></p><p class="small muted">We are switching your membership on.</p></div>',onMount(sh){sheet=sh}});
    const r=await claim(session,sheet&&sheet.el);
    const body=sheet&&Q("[data-lc34-claim]",sheet.el);if(!body)return;
    const done=h=>{body.innerHTML=h+'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc34-close>Continue</button></div>';const b=Q("[data-lc34-close]",body);if(b)b.addEventListener("click",()=>{try{sheet.close()}catch(e){}})};
    try{history.replaceState(null,"",location.pathname+location.search+"#upgrades")}catch(e){}
    if(r&&r.ok&&r.status==="paid"&&r.key){
      wr(K.pend,null);
      setEnt({founding:!!r.founding,early:!!r.early||!!r.founding,tranche:r.tranche|0,plan:r.plan,locked_cents:r.locked_cents|0,active:true,expires:r.expires|0,at:Date.now(),key:r.key});
      let acc=null;try{acc=await Access.accept(r.key,"stripe")}catch(e){acc={ok:false,message:"Could not switch on automatically."}}
      try{refreshChip()}catch(e){}
      const rate=r.locked_cents?eur(r.locked_cents)+"/year":"";
      done('<p class="lc34-lead"><b>'+(r.founding?"Welcome, Founding Member.":r.early?"Welcome, Early Adopter.":"Welcome to Pro.")+"</b></p>"+
        (r.founding||r.early?'<p class="lc34-pills">'+(r.founding?'<span class="lc34-pill is-founding">'+ic("crown")+" Founding Member</span> ":"")+'<span class="lc34-pill is-early">'+ic("rocket")+" Early Adopter</span></p>":"")+
        (r.locked_cents&&r.tranche<3?'<p>Your rate is locked at <b>'+rate+"</b> for as long as your subscription stays active.</p>":"")+
        (acc&&acc.ok?'<p class="small">Pro is switched on for this device.</p>':'<p class="small muted">Keep this key to switch Pro on on another device.</p>')+
        '<p class="lc34-key"><code>'+E(r.key)+'</code> <button type="button" class="btn btn-quiet btn-sm" data-lc34="copykey" data-key="'+E(r.key)+'">Copy</button></p>');
      try{setTimeout(()=>{if(typeof rerender==="function")rerender()},400)}catch(e){}
      return;
    }
    if(r&&(r.status==="expired"))return done('<p class="lc34-lead"><b>That checkout expired.</b></p><p class="small muted">Nothing was charged. You can start again from Membership.</p>');
    if(r&&r.status==="refunded")return done('<p class="lc34-lead"><b>That payment was refunded.</b></p>');
    done('<p class="lc34-lead"><b>We could not confirm your payment yet.</b></p><p class="small muted">If you were charged, your membership appears within a few minutes: open this page again. Nothing is lost.</p>');
  }
  /* The return from Stripe is #upgrades?paid=<session>. The app's level gate can rewrite the hash before we look, so it is read once, right now, at start-up. */
  const startPaid=(()=>{try{const m=/[#&?]paid=([^&]+)/.exec(location.hash||"");return m?decodeURIComponent(m[1]):""}catch(e){return""}})();
  let startUsed=false;
  function handleReturn(){
    try{
      let m=null;
      if(startPaid&&!startUsed){startUsed=true;m=[0,encodeURIComponent(startPaid)]}
      else m=/[#&?]paid=([^&]+)/.exec(location.hash||"");
      if(m){
        const v=decodeURIComponent(m[1]);
        if(v==="cancel"){history.replaceState(null,"",location.pathname+location.search+"#upgrades");say("Checkout cancelled. Nothing was charged.","",3500);return}
        if(/^cs_[A-Za-z0-9_]{8,200}$/.test(v)){afterCheckout(v);return}
      }
      /* paid on this device but never claimed (the tab was closed): try once more, quietly */
      const p=rd(K.pend,null);
      if(p&&p.session&&Date.now()-p.at<3*DAY&&dev.mode()!=="play-app"){
        api("claim",{session:p.session}).then(r=>{if(r.ok&&r.status==="paid"&&r.key)afterCheckout(p.session);else if(r.status==="expired"||r.status===404)wr(K.pend,null)}).catch(()=>{});
      }
    }catch(e){console.error(e)}
  }

  /* ======================= 4. badges ======================= */
  const emptyEnt={founding:false,early:false,tranche:0,active:false};
  const ent=()=>Object.assign({},emptyEnt,rd(K.ent,{}));
  function setEnt(e){
    e=Object.assign({},e);if(e.founding)e.early=true;                       /* inheritance: Founding includes Early Adopter, always */
    wr(K.ent,e);paintBody();
    try{if(typeof refreshChip==="function")refreshChip()}catch(x){}
  }
  function paintBody(){
    const e=ent();document.body.classList.toggle("lc34-founding",!!e.founding);document.body.classList.toggle("lc34-early",!!e.early&&!e.founding);
  }
  const badges={
    has:id=>{const e=ent();return id==="founding"?!!e.founding:id==="early"?!!(e.early||e.founding):false},
    list(){
      const e=ent();
      return[
        {id:"founding",ico:"crown",name:"Founding Member",how:"One of the first 100 yearly members. Your rate is locked for as long as your subscription stays active, and this badge is yours for good.",got:()=>e.founding?(e.at||1):0,note:()=>e.active?"Active member":"Badge kept"},
        {id:"early",ico:"rocket",name:"Early Adopter",how:"You joined Pro in the first 200 yearly places. "+(e.founding?"Included with your Founding Member badge.":"This badge is yours for good."),got:()=>(e.early||e.founding)?(e.at||1):0,note:()=>e.founding?"Unlocked by Founding Member":e.active?"Active member":"Badge kept"}
      ];
    }
  };
  async function refreshEnt(force){
    try{
      const e0=rd(K.ent,{});if(!force&&e0.at&&Date.now()-e0.at<6*36e5&&(e0.founding||e0.early))return;
      const key=(Quota.creds()||{}).token;if(!key||!/^LC-/i.test(key))return;
      const r=await api("entitlement",{key:key});
      if(r&&r.ok){
        if(r.founding||r.early)setEnt({founding:!!r.founding,early:!!(r.early||r.founding),tranche:r.tranche|0,plan:r.plan,locked_cents:r.locked_cents|0,active:!!r.active,expires:r.expires|0,at:Date.now(),key:key});
        else if(e0.founding||e0.early){/* the server does not know this key: keep what the device shows, it was earned */}
      }
    }catch(e){}
  }
  const pm={
    status(){
      const e=ent(),h=tokens.info();let out="";
      if(e.founding)out+='<span class="lc34-pill is-founding">'+ic("crown")+" Founding Member</span>";
      if(e.early&&!e.founding)out+='<span class="lc34-pill is-early">'+ic("rocket")+" Early Adopter</span>";
      if(e.founding)out+='<span class="lc34-pill is-early">'+ic("rocket")+" Early Adopter</span>";
      if(h.on)out+=(out?"":"")+'<p class="lc34-habit">'+ic("fire")+" Habit week: <b>3 free tokens a day</b>"+(h.left?" · "+h.left+(h.left===1?" day":" days")+" left":"")+"</p>";
      return out?'<div class="lc34-pm" data-lc34-pm>'+out+"</div>":"";
    }
  };
  /* ----- Upgrades page: the Pro yearly offer on top of the plan ladder ----- */
  const upgrades={
    html(){
      if(dev.inPlay())return'<section class="panel lc34-up" data-lc34-up><h3>Pro</h3><p class="small muted">Already a member? Enter your key below.</p></section>';
      return'<section class="panel lc34-up" data-lc34-up><p class="lc34-msg"><b>Your personal coach costs €80+/hour in the real world.</b> Get an elite 24/7 AI coach in your pocket for a fraction of the cost.</p><div data-lc34-body>'+offerBody({},pricingNow(),{pitch:false})+"</div></section>";
    },
    refresh(){
      const els=QA("[data-lc34-up] [data-lc34-body]");if(!els.length||dev.inPlay())return;
      pricing().then(p=>els.forEach(b=>{if(document.body.contains(b))b.innerHTML=offerBody({},p,{pitch:false})})).catch(()=>{});
    }
  };

  /* ======================= wiring ======================= */
  function onClick(e){
    const t=e.target.closest&&e.target.closest("[data-lc34]");if(!t)return;
    const a=t.getAttribute("data-lc34");
    if(a==="buy"){e.preventDefault();buy(t.getAttribute("data-plan")==="monthly"?"monthly":"yearly",t,t.closest("[data-lc34-body]")&&Q("[data-lc34-msg]",t.closest("[data-lc34-body]")))}
    else if(a==="later"){e.preventDefault();fun.later()}
    else if(a==="copykey"){const k=t.getAttribute("data-key")||"";try{copyText(k).then(ok=>say(ok?"Key copied.":"Copy failed. Select the key and copy it by hand.",ok?"good":"bad"))}catch(x){}}
  }
  let started=false;
  function init(){
    if(started)return;started=true;
    tokens.first();paintBody();
    document.addEventListener("click",onClick);
    window.addEventListener("hashchange",()=>{handleReturn();setTimeout(upgrades.refresh,400)});
    /* every token that was spent counts as a value moment, whatever screen spent it */
    try{
      const orig=Quota.spend;
      if(typeof orig==="function")Quota.spend=async function(){const r=await orig.apply(this,arguments);try{if(r&&r.ok)value("token")}catch(e){}return r};
    }catch(e){}
    waitLogin();
    setTimeout(()=>{handleReturn();refreshEnt(false);pricing().catch(()=>{})},2500);
  }
  return{VERSION:VERSION,init:init,dev:dev,tokens:tokens,funnel:fun,pm:pm,badges:badges,upgrades:upgrades,value:value,
    _t:{api:api,pricing:pricing,offerBody:offerBody,offerCard:offerCard,androidOverlay:androidOverlay,iosOverlay:iosOverlay,afterCheckout:afterCheckout,setEnt:setEnt,ent:ent,eur:eur,val:val,buy:buy,refreshEnt:refreshEnt,K:K}};
})();
