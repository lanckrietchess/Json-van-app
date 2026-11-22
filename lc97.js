/*@@module lc97*/
const LC97=(()=>{
  "use strict";
  /* LC97 (build 9.62.0): the Pro trial lifecycle and the post-trial downsell.
     The road: intro week (3 tokens a day, Arena server) -> day 8: 1 token a day and LC90's Day-7 pop-up offers the free Pro trial (or Free)
     -> trial (Pro, 10 a day) -> the trial ends without converting -> ONE post-trial pop-up (this module):
        1. "Keep Pro and unlock all courses for 1 year"  (blue, main): the live yearly rate, shown as a month price billed yearly
        2. "Get 1 month of full Pro for an exclusive discount": one payment (EUR 25, the monthly EUR 39 struck through), once per account
        3. "Free" (small): back to 1 token a day
     The truth lives in Supabase (sql/20261119100000_lc97_trial_downsell.sql, lc97_state / lc97_mark): the pop-up opens only when the server
     says it is due, it is marked shown BEFORE it opens (so it can never loop), closing it or picking Free dismisses it for good, and the
     one-month checkout (stripe function route "downsell") is refused by the database unless this pop-up was shown, not dismissed, less than a
     week ago and never used. A cancelled checkout from the pop-up brings the pop-up back once (the offer is still open), nothing else does.
     Trial entry points: LC90 shows the trial only while the server says it is unused (trialEligible), the Upgrades page labels its button by
     it, the LC85 upgrade sheet gets a "Try Pro free" row, and the Upgrades page shows the trial status (days left, cancelled, ended).
     Owner: #trial-lab (owner menu > Trial & Downsell Simulator): the live state of any account, a day-by-day simulation of the whole road built
     on the same decide() the app uses, previews of both pop-ups without checkout, test-account resets and the counters.
     SIM_ENABLED=false hides the simulator page and its menu row (the owner-only gate stays either way). */
  /* 9.64.0 (LC99): picking a paid option no longer jumps straight to Stripe. It opens a confirm step in the same pop-up: what is paid today,
     whether it renews and how to cancel, and an UNCHECKED box "Pro starts right away, I give up my 14-day right of withdrawal" (the same
     pattern as the trial). The pay button stays off until the box is ticked; the choice is marked on the server only when it is confirmed
     (Back returns to the three options). The one-time month sends the consent to the stripe function, which refuses a checkout without it;
     the yearly plan goes to its Payment Link after the consent is logged on the account (lc99_consent_note). */
  const VERSION="9.64.0",CONSENT_V="w1-2026-11-22",DAY=864e5,CACHE="lc97-state",REOPEN="lc97-reopen",TSYNC="lc97-tsync",SIM_ENABLED=true;
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.prototype.slice.call((r||document).querySelectorAll(s));
  const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const say=(m,k,ms)=>{try{toast(m,k||"",ms)}catch(e){}};
  const ic=n=>{try{return icon(n)}catch(e){return""}};
  const route=()=>{let h="";try{h=decodeURIComponent(String(location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){h=""}return h.split(/[\/?&]/)[0]};
  const owner=()=>{try{return !!(LC49.owner()||Admin.active)}catch(e){return false}};
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const cfgSB=()=>{try{return LC26.sync.cfg()}catch(e){return{url:"",key:""}}};
  async function tok(){try{return await LC26.sync.token()}catch(e){return""}}
  async function rpc(fn,args){
    try{const t=await tok();if(!t)return{status:401,data:null};
      return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:{Authorization:"Bearer "+t},body:JSON.stringify(args||{})})}catch(e){return{status:0,data:null,error:String(e&&e.message||e)}}
  }
  const missing=r=>!!(r&&(r.status===404||(r.data&&/PGRST202|does not exist|42883|42P01/i.test(String(r.data.code||"")+String(r.data.message||"")))));
  const dev=()=>{let d="";try{d=String(deviceId())}catch(e){d=""}return d.replace(/[^A-Za-z0-9_-]/g,"").slice(0,64)||"device"};
  const eur=c=>{c=+c||0;return"€"+(c%100===0?String(c/100):(c/100).toFixed(2))};
  const day=t=>{try{return new Date(t).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}catch(e){return""}};

  /* ---------- the app's view of the member (pure) ---------- */
  function appPaid(){try{if(String(App.access&&App.access.tier||"free")!=="free")return true}catch(e){}try{return Quota.tier()!=="free"}catch(e){return false}}
  function appVip(){try{return String(App.access&&App.access.tier||"")==="vip"||Quota.tier()==="vip"}catch(e){return false}}
  function intro(){try{return LC34.tokens.info()||{on:false,left:0}}catch(e){return{on:false,left:0}}}
  /* decide: ONE place that turns the server's state + the device's intro week into the phase, the tokens a day, trial eligibility and the
     pop-up to show. Used by the live app and by the owner's simulator, so the simulator shows exactly what the app does. */
  function decide(x){
    x=x||{};const s=x.srv&&x.srv.ok&&x.srv.signed_in?x.srv:null,st=s?String(s.sub_status||"free"):"",pt=s&&s.post_trial||{};
    let phase="free",perDay=1;
    if(st==="trialing"||st==="trial_cancelled"){phase="trial";perDay=10}
    else if(st==="active"||st==="downsell_month"||x.paid){phase=x.vip?"vip":"pro";perDay=10}
    else if(x.intro&&x.intro.on===true){phase="intro";perDay=3}
    const paidNow=phase==="trial"||phase==="pro"||phase==="vip";
    const trialEligible=s?(!!s.trial_eligible&&!paidNow):(paidNow?false:null);
    let popup="none",why="";
    if(x.owner&&!x.sim)why="owner";
    else if(!s)why=x.srv&&x.srv.signed_in===false?"signed_out":"no_state";
    else if(paidNow)why="paid";
    else if(pt.popup_due)popup="downsell";
    else if(x.reopen&&pt.offer_open&&!pt.dismissed_at)popup="downsell";
    else why=s.discount&&s.discount.used?"discount_used":pt.dismissed_at?"dismissed":pt.shown_at?"already_shown":s.trial&&s.trial.used?"trial_not_over":"no_trial";
    return{phase:phase,perDay:perDay,trialEligible:trialEligible,popup:popup,why:popup==="none"?why:"",offerOpen:!!pt.offer_open,status:st||"unknown"};
  }

  /* ---------- the server state (cached) ---------- */
  let MEM=null,memAt=0,busy=false,fetching=null;
  async function state(force){
    if(!sess())return{ok:true,signed_in:false};
    if(MEM&&!force&&Date.now()-memAt<5*60e3)return MEM;
    if(fetching)return fetching;
    fetching=(async()=>{
      const r=await rpc("lc97_state",{});
      if(r&&r.status===200&&r.data&&r.data.ok){MEM=r.data;memAt=Date.now();wr(CACHE,{at:memAt,v:MEM})}
      else if(missing(r)){MEM={ok:false,missing:true};memAt=Date.now()}
      else{const c=rd(CACHE,null);MEM=c&&c.v?c.v:{ok:false,error:"http_"+(r&&r.status)};memAt=Date.now()-4*60e3}   /* retry in a minute */
      return MEM;
    })();
    try{return await fetching}finally{fetching=null}
  }
  function cached(){if(MEM)return MEM;const c=rd(CACHE,null);return c&&c.v?c.v:null}
  /* true / false from the server; null = not known yet (signed out or not loaded): the trial is shown and the server decides at checkout */
  function trialEligibleNow(){const s=cached();if(!s||!s.ok||!s.signed_in)return appPaid()?false:null;return !!s.trial_eligible}
  async function trialEligible(ms){
    if(!sess())return appPaid()?false:null;
    const s=await Promise.race([state(),new Promise(res=>setTimeout(()=>res(null),ms||1500))]);
    return s&&s.ok&&s.signed_in?!!s.trial_eligible:trialEligibleNow();
  }
  function hadTrial(){const s=cached();return !!(s&&s.ok&&s.trial&&s.trial.used)}

  /* ---------- the post-trial pop-up ---------- */
  async function pricing(){try{return await Promise.race([LC34._t.pricing(),new Promise(res=>setTimeout(()=>res(null),2000))])}catch(e){return null}}
  /* the numbers: the yearly rate Stripe charges now (Founding, then Early Adopter, ...), its month price, and the one-time month from the server */
  function numbers(p){
    const ok=p&&p.ok&&Array.isArray(p.yearly),t=ok?(p.tranche||4):1,y=ok?(+p.yearly[t-1]||+p.base):19950,ds=p&&p.downsell||{};
    return{yearly:y,yearlyTxt:eur(y),month:eur(Math.round(y/12)),rate:{1:"Founding Member",2:"Early Adopter",3:"Launch",4:"Pro"}[t]||"Pro",tranche:t,
      dl:eur(+ds.cents||2500),dlAnchor:eur(+ds.anchor_cents||(p&&+p.monthly)||3900),dlDays:+ds.days||30};
  }
  function dsHTML(n,s,preview){
    const len=s&&s.trial&&s.trial.started_at&&s.trial.ends_at?Math.max(1,Math.round((new Date(s.trial.ends_at)-new Date(s.trial.started_at))/DAY)):7;
    return'<div class="lc97">'+(preview?'<p class="lc97-pv">'+ic("eye")+" Preview: this is what a student sees. Buttons do not open checkout or change anything.</p>":"")
      +'<p class="lc97-lead">For '+E(len)+" days you trained with every Pro tool. Pick how you want to keep going.</p>"
      +'<button type="button" class="lc97-opt lc97-main" data-lc97="yearly"><span class="lc97-t">'+ic("crown")+" Keep Pro and unlock all courses for 1 year</span>"
        +'<span class="lc97-p"><strong>'+E(n.month)+"</strong>/month billed yearly</span>"
        +"<small>"+E(n.yearlyTxt)+" a year"+(n.tranche<4?" · "+E(n.rate)+" rate, kept for as long as your subscription stays active":"")+"</small></button>"
      +'<button type="button" class="lc97-opt lc97-disc" data-lc97="discount"><span class="lc97-tag">One-time offer · only here</span><span class="lc97-t">Get 1 month of full Pro for an exclusive discount</span>'
        +'<span class="lc97-p"><s>'+E(n.dlAnchor)+"/month</s> <strong>"+E(n.dl)+"/month</strong></span><small>One payment for "+E(n.dlDays)+" days. No subscription: it does not renew.</small></button>"
      +'<div class="lc97-cf" data-lc97-cf hidden></div>'
      +'<p class="form-msg" data-lc97-msg aria-live="polite"></p>'
      +'<button type="button" class="lc97-free" data-lc97="free">Free <span>· continue with 1 token a day</span></button>'
      +'<p class="small muted lc97-fine">Payment is handled by Stripe; we never see your card. The one-month offer is available once per account and only from this screen.</p></div>';
  }
  /* the confirm step (9.64.0): the plain terms, then the unchecked withdrawal box; the wording is sent along and stored as shown */
  function wording(kind,n){
    return kind==="discount"?"I want my Pro month to start right away. I pay "+n.dl+" once for "+n.dlDays+" days of full Pro; it does not renew. Because Pro starts at once, I give up my 14-day right of withdrawal, so this payment is not refunded once it has gone through."
      :"I want Pro to start right away. I pay "+n.yearlyTxt+" today for one year, then the same each year until I cancel. Because Pro starts at once, I give up my 14-day right of withdrawal, so a payment that has gone through is not refunded.";
  }
  function cfHTML(kind,n){
    const terms=kind==="discount"?[n.dl+" today, paid once. No subscription: it does not renew and nothing else is charged.",n.dlDays+" days of full Pro, starting the moment you pay.",
        "Want to keep Pro after that? During your month (and 7 days after it) you can switch to yearly, and your "+n.dl+" counts toward the first year."]
      :[n.yearlyTxt+" today for your first year (about "+n.month+" a month)"+(n.tranche<4?", at the "+n.rate+" rate":"")+".",
        "It renews at the same rate every year until you cancel. Cancel any time in Account > Manage subscription; cancel before the renewal date and nothing more is charged."];
    return'<p class="lc97-cfh">'+(kind==="discount"?"Your one-time Pro month":"Pro for 1 year")+'</p><ul class="lc97-terms">'+terms.map(x=>"<li>"+E(x)+"</li>").join("")+"</ul>"
      +'<label class="lc97-ok"><input type="checkbox" data-lc97-ok> <span>'+E(wording(kind,n))+"</span></label>"
      +'<div class="lc97-cfb"><button type="button" class="btn btn-primary" data-lc97="pay" data-k="'+kind+'" disabled>'+ic("lock")+" "+E(kind==="discount"?"Pay "+n.dl+" securely":"Continue to secure payment")+"</button>"
      +'<button type="button" class="btn btn-quiet" data-lc97="back">Back</button></div>';
  }
  const WHY={sign_in:"Sign in first: the offer is tied to your account.",consent:"Tick the box first: it confirms Pro may start right away.",used:"You already used this one-time offer.",already_member:"You already have Pro.",
    dismissed:"This offer was closed.",offer_expired:"This offer has ended.",not_offered:"This offer is not open on your account.",trial_running:"Your trial is still running.",
    no_trial:"This offer is for members whose trial ended.",in_progress:"A checkout for this offer is already being opened. Try again in a moment.",
    not_ready:"The offer is not switched on on the server yet (sql/20261119100000_lc97_trial_downsell.sql).",slow_down:"Too many tries. Wait a minute.",
    network:"No connection reached the payment server. Nothing was charged.",not_configured:"Checkout is not set up on this build."};
  async function stripeCall(path,body){
    const c=cfgSB();if(!c.url)return{ok:false,reason:"not_configured",status:0};
    try{const r=await fetch(c.url+"/functions/v1/stripe/"+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body||{})});const j=await r.json().catch(()=>({}));j.status=r.status;return j}
    catch(e){console.error("[LC97] downsell checkout:",e);return{ok:false,reason:navigator.onLine===false?"network":"server",status:0,detail:String(e&&e.message||e)}}
  }
  const go=u=>{try{LC36.support.go(u)}catch(e){location.href=u}};
  function checkout(plan,tier){
    try{if(typeof LC44!=="undefined"&&LC44.checkout)return LC44.checkout(plan,tier)}catch(e){}
    try{return LC36.support.checkout(plan,tier)}catch(e){say("Checkout could not start. Nothing was charged. Try again.","bad");return false}
  }
  async function mark(ev){const r=await rpc("lc97_mark",{p_event:ev,p_device:dev()});if(r&&r.status===200&&r.data){if(r.data.ok){MEM=r.data;memAt=Date.now();wr(CACHE,{at:memAt,v:MEM})}return r.data}return{ok:false,error:"http_"+(r&&r.status)}}
  async function openDownsell(o){
    o=o||{};const preview=!!o.preview;
    if(Q(".lc97-sheet"))return null;
    const s=o.state||(preview?null:await state());
    if(!preview){   /* marked shown on the server BEFORE it opens: a failure means no pop-up, never a loop */
      const m=await mark("shown");
      if(!m||!m.ok){if(m&&m.error!=="not_eligible")console.error("[LC97] the post-trial pop-up was not marked shown:",m);return null}
    }
    const n=numbers(await pricing());let picked=false;
    try{Telemetry.log({e:"lc97",x:preview?"preview":"shown"})}catch(e){}
    return openSheet({title:"Your Pro trial has ended",cls:"lc97-sheet",noFocus:true,html:dsHTML(n,s,preview),onClose(){if(!preview&&!picked)mark("closed").catch(()=>{})},onMount(sh){
      const el=sh.el,msg=t=>{const m=Q("[data-lc97-msg]",el);if(m)m.textContent=t||""},cf=Q("[data-lc97-cf]",el);
      const step=kind=>{QA(".lc97-opt,.lc97-free,.lc97-lead",el).forEach(x=>{x.hidden=!!kind});cf.hidden=!kind;cf.innerHTML=kind?cfHTML(kind,n):"";msg("");
        if(kind){const ok=Q("[data-lc97-ok]",cf),pay=Q('[data-lc97="pay"]',cf);ok.addEventListener("change",()=>{pay.disabled=!ok.checked});try{ok.focus({preventScroll:true})}catch(x){}}};
      el.addEventListener("click",async e=>{
        const b=e.target.closest&&e.target.closest("[data-lc97]");if(!b)return;const a=b.getAttribute("data-lc97");e.preventDefault();
        if(a==="yearly"||a==="discount"){step(a);return}
        if(a==="back"){step("");return}
        if(preview){msg(a==="pay"?(b.getAttribute("data-k")==="discount"?"Preview: opens the one-time "+n.dl+" checkout for "+n.dlDays+" days (once per account), with the consent.":"Preview: opens the yearly Pro checkout ("+n.yearlyTxt+" a year), with the consent."):"Preview: closes the pop-up; the student stays on Free with 1 token a day.");return}
        if(a==="free"){picked=true;mark("free").catch(()=>{});sh.close();say("You are on Free: 1 token a day. Pro stays one tap away in Upgrades.");return}
        if(a!=="pay")return;
        const kind=b.getAttribute("data-k"),ok=Q("[data-lc97-ok]",el);
        if(!ok||!ok.checked){msg(WHY.consent);return}
        const text=wording(kind,n);
        if(kind==="yearly"){picked=true;b.disabled=true;mark("yearly").catch(()=>{});
          await Promise.race([rpc("lc99_consent_note",{p_flow:"yearly",p_version:CONSENT_V,p_wording:text,p_device:dev()}),new Promise(res=>setTimeout(res,1500))]).catch(()=>{});
          try{sessionStorage.setItem(REOPEN,String(Date.now()))}catch(x){}sh.close();checkout("yearly",2);return}
        if(kind==="discount"){
          picked=true;b.disabled=true;msg("Opening secure checkout…");mark("discount").catch(()=>{});
          const j=await stripeCall("downsell",{token:await tok(),device:dev(),consent:true,consent_v:CONSENT_V,consent_text:text});
          if(j.ok&&/^https:\/\/checkout\.stripe\.com\//i.test(j.url||"")){try{sessionStorage.setItem(REOPEN,String(Date.now()))}catch(x){}go(j.url);return}
          b.disabled=false;picked=false;
          const why=WHY[j.reason]||("Checkout could not start (HTTP "+(j.status||0)+(j.reason?", "+j.reason:"")+"). Nothing was charged.");
          console.error("[LC97] downsell checkout refused:",j);msg(why);
          if(j.reason==="used"||j.reason==="dismissed"||j.reason==="offer_expired"||j.reason==="already_member"){b.hidden=true;picked=true}
        }
      });
    }});
  }

  /* ---------- when: calm screens only, never over another sheet, never for paying members or the owner ---------- */
  const CALM=/^(|home|dashboard|trim|upgrades|account|quests|system|games)$/;
  async function check(why,reopen){
    if(busy||typeof window.__lcIab!=="undefined"&&window.__lcIab===true)return;
    if(!sess()||!CALM.test(route())||Q(".sheet-wrap")||Q(".lc30-ask"))return;
    busy=true;
    try{
      const s=await state(why==="return");
      if(Q(".sheet-wrap"))return;
      const d=decide({srv:s,paid:appPaid(),vip:appVip(),intro:intro(),owner:owner(),reopen:!!reopen});
      syncTokens(d,s);
      if(d.popup==="downsell")await openDownsell({state:s});
    }catch(e){console.error("[LC97] check",e)}finally{busy=false}
  }
  /* a mirror of the device's token state on the account (the Arena server still enforces the limit), at most every 6 hours or on a change */
  function syncTokens(d,s){
    if(!s||!s.ok||!s.signed_in)return;
    const key=d.phase+":"+d.perDay,last=rd(TSYNC,null);if(last&&last.k===key&&Date.now()-last.at<6*36e5)return;
    const w=intro(),ends=w&&w.on===true&&+w.left>0?new Date(Date.now()+(+w.left)*DAY).toISOString():null;
    wr(TSYNC,{k:key,at:Date.now()});rpc("lc97_sync_tokens",{p_phase:d.phase,p_per_day:d.perDay,p_intro_ends:ends}).catch(()=>{});
  }
  /* the return from Stripe: ?lc97=paid|cancel#upgrades (the flag in the search part, the route in the hash) */
  const startFlag=(()=>{try{const m=/[?&]lc97=(paid|cancel)\b/.exec(location.search||"");if(m){const u=new URL(location.href);u.searchParams.delete("lc97");history.replaceState(null,"",u.pathname+(u.search||"")+u.hash)}return m?m[1]:""}catch(e){return""}})();
  async function claim(){try{if(typeof LC30!=="undefined"&&typeof deviceId==="function"){const r=await LC30.authed("lc36_claim_my_licence",{p_device:deviceId()});if(r&&r.ok&&r.key&&typeof License!=="undefined")return License.apply(r,r.key,"email")}}catch(e){}return false}
  function handleReturn(){
    /* the reopen flag is set when a checkout starts from the pop-up; it is used (and removed) only on a return from Stripe, within 2 hours */
    let flag=startFlag,re=false;
    try{const v=+sessionStorage.getItem(REOPEN)||0;if(v&&Date.now()-v>2*36e5)sessionStorage.removeItem(REOPEN);else re=!!v}catch(e){re=false}
    if(!flag&&re&&/[#&?]paid=cancel\b/.test(location.hash||""))flag="cancel";   /* the yearly checkout from the pop-up was cancelled (LC34's return) */
    if(flag){try{sessionStorage.removeItem(REOPEN)}catch(e){}}
    if(flag==="paid"){
      say("Payment received. Your Pro month switches on in a moment…","good",6000);
      let n=0;const tryClaim=async()=>{n++;const done=await claim();try{Quota.refresh()}catch(e){}MEM=null;
        if(done||appPaid()){say("Pro is on. Enjoy your month!","good",6000);try{rerender()}catch(e){}return}if(n<6)setTimeout(tryClaim,[2e3,5e3,10e3,20e3,40e3][n-1]||4e4)};
      setTimeout(tryClaim,1500);
    }else if(flag==="cancel"&&re)setTimeout(()=>check("return",true),1800);   /* the offer is still open: the pop-up comes back once */
  }

  /* ---------- the trial on the Upgrades page and in the upgrade sheet ---------- */
  async function trialDays(){try{const c=await LC90._t.cfg();return +c.trial_days||0}catch(e){return 7}}
  function statusHTML(s){
    if(!s||!s.ok||!s.signed_in)return"";const t=s.trial||{},st=s.sub_status;
    if(st==="trialing")return'<div class="lc97-st is-on">'+ic("rocket")+" <span><b>Your free Pro trial: "+E(t.days_left)+" day"+(t.days_left===1?"":"s")+" left</b><small>It ends on "+E(day(t.ends_at))+". Cancel any time before then in Manage subscription and nothing is charged.</small></span></div>";
    if(st==="trial_cancelled")return'<div class="lc97-st">'+ic("calendar")+" <span><b>Your trial is cancelled</b><small>Pro stays on until "+E(day(t.ends_at))+". Nothing is charged.</small></span></div>";
    if(st==="downsell_month")return'<div class="lc97-st is-on">'+ic("crown")+" <span><b>Your one-time Pro month is on</b><small>Paid once, it does not renew. Switch to yearly during your month and what you paid counts toward the first year.</small></span></div>";
    if(st==="trial_ended")return'<div class="lc97-st">'+ic("clock")+" <span><b>Your free trial has ended</b><small>You are on Free (1 token a day). Pick a plan below to switch Pro back on.</small></span></div>";
    return"";
  }
  async function paintUpgrades(){
    const v=Q("#view");if(!v||route()!=="upgrades")return;
    const s=await state();if(route()!=="upgrades")return;
    const te=s&&s.ok&&s.signed_in?!!s.trial_eligible:null,btn=Q("[data-up-try]",v);
    if(btn&&te===false)btn.innerHTML=ic("rocket")+" See the Pro offer";   /* the trial is used: the same pop-up, without the trial */
    const h=statusHTML(s);let box=Q("[data-lc97-status]",v);
    if(!h){if(box)box.remove();return}
    if(!box){box=document.createElement("div");box.setAttribute("data-lc97-status","");const head=Q(".btn-row",v);if(head&&head.parentNode)head.parentNode.insertBefore(box,head);else v.prepend(box)}
    box.innerHTML=h;
  }
  /* LC85 calls this when its upgrade sheet opens: a "Try Pro free" row while the trial is unused */
  async function slot(host,sheet){
    if(!host||appPaid())return;
    const [te,days]=await Promise.all([trialEligible(1200),trialDays()]);
    if(te===false||!days||!host.isConnected)return;
    host.hidden=false;host.className="lc97-slot";
    host.innerHTML='<div><b>'+ic("gift")+" Try Pro free for "+E(days)+" days</b><small>€0 today. Cancel any time before day "+E(days+1)+" and nothing is charged.</small></div><button type=\"button\" class=\"btn btn-primary\" data-lc97-try>Start free trial</button>";
    host.addEventListener("click",e=>{if(!e.target.closest("[data-lc97-try]"))return;e.preventDefault();try{sheet&&sheet.close()}catch(x){}setTimeout(()=>{try{LC90.open({from:"sheet"})}catch(x){console.error(x)}},260)});
  }

  /* ---------- the owner's simulator (#trial-lab) ---------- */
  /* simulate: the whole road day by day, built on decide() with the server state the database would hold that day */
  function simulate(o){
    o=Object.assign({trialDay:8,trialLen:7,cancel:true,convert:false,choice:"discount",days:45},o||{});
    const rows=[];let tUsed=false,tStart=0,tEnd=0,shown=0,dismissed=0,choice="",dUsed=false,dEnd=0,paidSub=false,day7Seen=false;
    for(let d=1;d<=o.days;d++){
      const ev=[];
      const introOn=d<=7;
      if(!day7Seen&&!introOn&&!tUsed&&!paidSub){day7Seen=true;ev.push("Day-7 pop-up (LC90): free trial or Free")}
      if(o.trialDay&&d===o.trialDay&&!tUsed&&!paidSub){tUsed=true;tStart=d;tEnd=d+o.trialLen;ev.push("starts the "+o.trialLen+"-day trial ("+(o.cancel?"cancels it right away":"keeps it")+")")}
      if(tUsed&&!o.cancel&&o.convert&&d===tEnd&&!paidSub){paidSub=true;ev.push("trial converts: Pro is paid")}
      if(dUsed&&d===dEnd)ev.push("the one-time month ends: back to Free, the offer stays locked");
      const trialRun=tUsed&&d>=tStart&&d<tEnd,dRun=dUsed&&d<dEnd;
      const sub=paidSub?"active":dRun?"downsell_month":trialRun?(o.cancel?"trial_cancelled":"trialing"):tUsed?"trial_ended":"free";
      const over=tUsed&&!paidSub&&d>=tEnd,offer=over&&!dUsed&&!dismissed&&(!shown||d-shown<7);
      const srv={ok:true,signed_in:true,sub_status:sub,trial_eligible:!tUsed&&!paidSub,trial:{used:tUsed},discount:{used:dUsed},
        post_trial:{offer_open:offer,popup_due:offer&&!shown,shown_at:shown?d:null,dismissed_at:dismissed?d:null}};
      const r=decide({srv:srv,intro:{on:introOn,left:Math.max(0,8-d)},sim:true});
      if(r.popup==="downsell"){shown=d;ev.push("post-trial pop-up opens ("+({yearly:"picks yearly Pro",discount:"buys the one-time month",free:"picks Free",closed:"closes it"}[o.choice]||o.choice)+")");
        if(o.choice==="yearly"){paidSub=true}else if(o.choice==="discount"){dUsed=true;dEnd=d+30;dismissed=d}else{dismissed=d}choice=o.choice}
      if(d===tEnd&&tUsed&&!paidSub&&!ev.length)ev.push("trial over");
      const after=paidSub?"active":dUsed&&d<dEnd?"downsell_month":sub;
      rows.push({day:d,phase:r.phase,perDay:paidSub||(dUsed&&d<dEnd)?10:r.perDay,status:after,trialEligible:r.trialEligible,popup:r.popup,events:ev,offer:offer&&!dismissed});
    }
    return rows;
  }
  const SCEN={a:{label:"Trial, cancelled, buys the one-time month",trialDay:8,cancel:true,choice:"discount"},b:{label:"Trial, cancelled, picks yearly",trialDay:8,cancel:true,choice:"yearly"},
    c:{label:"Trial, cancelled, picks Free",trialDay:8,cancel:true,choice:"free"},d:{label:"Trial, cancelled, closes the pop-up",trialDay:8,cancel:true,choice:"closed"},
    e:{label:"Trial converts (keeps it)",trialDay:8,cancel:false,convert:true,choice:"free"},f:{label:"Never starts a trial",trialDay:0,cancel:false,choice:"free"},
    g:{label:"Trial from Upgrades on day 3",trialDay:3,cancel:true,choice:"discount"}};
  let LAB={scen:"a"};
  function simHTML(){
    const sc=SCEN[LAB.scen]||SCEN.a,rows=simulate(Object.assign({},sc,{days:45})),keep=rows.filter(r=>r.events.length||r.day===1||r.day===7||r.day===8);
    return'<div class="lc97-sim"><div class="lc97-chips">'+Object.keys(SCEN).map(k=>'<button type="button" class="btn btn-sm '+(k===LAB.scen?"btn-primary":"btn-ghost")+'" data-lc97s="scen" data-k="'+k+'">'+E(SCEN[k].label)+"</button>").join("")+"</div>"
      +'<div class="lc97-tbl" role="table"><div class="lc97-tr lc97-th" role="row"><span>Day</span><span>Tokens</span><span>State</span><span>What happens</span></div>'
      +keep.map(r=>'<div class="lc97-tr" role="row"><span>'+r.day+"</span><span>"+r.perDay+"/day</span><span>"+E(r.status)+(r.trialEligible?" · trial open":"")+(r.offer?" · offer open":"")+"</span><span>"+E(r.events.join(" → ")||"—")
        +(r.events.some(x=>/Day-7/.test(x))?' <button type="button" class="btn btn-quiet btn-sm" data-lc97s="pv90">Preview</button>':"")+(r.popup==="downsell"?' <button type="button" class="btn btn-quiet btn-sm" data-lc97s="pv97">Preview</button>':"")+"</span></div>").join("")
      +'</div><p class="small muted">Every row comes from the same decide() the app runs; the database rules behind it are covered by tests/lc97_sql.test.py. Previews never open checkout and change nothing.</p></div>';
  }
  async function mount(view){
    if(!owner()||!SIM_ENABLED){view.innerHTML='<section class="panel pad"><h1>Trial &amp; Downsell Simulator</h1><p class="muted">This page is for the owner.</p></section>';return null}
    view.innerHTML='<section class="lc97-lab"><p class="lc97-kick">Owner · testing aid</p><h1>Trial &amp; Downsell Simulator</h1>'
      +'<p class="muted">Walk the whole road without waiting real days: intro week → day 8 (1 token) → trial → trial end → post-trial pop-up → one-time offer lock. Switch this page off before launch with <code>SIM_ENABLED=false</code> in lc97.js (the owner gate stays either way).</p>'
      +'<div class="panel pad stack"><h2>1. The road, day by day</h2><div data-lc97-sim>'+simHTML()+"</div></div>"
      +'<div class="panel pad stack"><h2>2. Pop-up previews</h2><div class="btn-row"><button type="button" class="btn btn-ghost" data-lc97s="pv90">Day-7 trial pop-up</button><button type="button" class="btn btn-ghost" data-lc97s="pv97">Post-trial pop-up</button><button type="button" class="btn btn-ghost" data-lc97s="pv99">“Your €25 counts” yearly switch</button></div></div>'
      +'<div class="panel pad stack"><h2>3. A real account</h2><p class="small muted">The server state (lc97_state) and what the app decides for it. Use a TEST account for resets: “all” also deletes its trial row so it can start a new trial.</p>'
      +'<div class="lc97-row"><input class="input" type="email" data-lc97-em placeholder="e-mail (empty = my own account)"><button type="button" class="btn btn-primary" data-lc97s="look">Look up</button></div>'
      +'<div class="btn-row"><button type="button" class="btn btn-quiet" data-lc97s="reset" data-k="popup">Reset pop-up flags</button><button type="button" class="btn btn-quiet" data-lc97s="reset" data-k="discount">Reset the one-time offer</button><button type="button" class="btn btn-quiet" data-lc97s="reset" data-k="all">Reset all (incl. the trial)</button></div>'
      +'<p class="form-msg" data-lc97-lm aria-live="polite"></p><pre class="lc97-pre" data-lc97-out>Not loaded yet.</pre></div>'
      +'<div class="panel pad stack"><h2>4. Counters (30 days)</h2><div data-lc97-rep><p class="small muted">Loading…</p></div></div></section>';
    report(view);look(view,"");return null;
  }
  async function look(view,em){
    const out=Q("[data-lc97-out]",view),msg=Q("[data-lc97-lm]",view);if(!out)return;out.textContent="Loading…";
    const r=em?await rpc("lc97_admin_state",{p_email:em}):{status:200,data:await state(true)};
    if(missing(r)){out.textContent="The LC97 SQL is not run yet: sql/20261119100000_lc97_trial_downsell.sql";return}
    if(!r||r.status!==200||!r.data){out.textContent="Could not load (HTTP "+(r&&r.status)+"): "+JSON.stringify(r&&r.data||r&&r.error||"");return}
    const d=decide({srv:r.data,paid:em?false:appPaid(),intro:em?{on:false}:intro(),sim:true});
    out.textContent=JSON.stringify({decide:d,server:r.data},null,2);if(msg)msg.textContent=em?"State of "+em:"Your own account";
  }
  async function report(view){
    const h=Q("[data-lc97-rep]",view);if(!h)return;const r=await rpc("lc97_admin_report",{p_days:30});
    if(missing(r)){h.innerHTML='<p class="small muted">Run sql/20261119100000_lc97_trial_downsell.sql to see the counters.</p>';return}
    const d=r&&r.data;if(!d||!d.ok){h.innerHTML='<p class="small muted">Could not load the counters (HTTP '+E(r&&r.status)+").</p>";return}
    const L=[["trials_started","Trials started"],["trialing_now","In a trial now"],["converted","Converted"],["trial_ended_unconverted","Ended, not converted"],["popup_shown","Post-trial pop-up shown"],["chose_yearly","Picked yearly"],["chose_discount","Tapped the one-time month"],["discount_paid","One-time month paid"],["chose_free","Picked Free"],["closed","Closed it"]];
    h.innerHTML='<div class="lc97-grid">'+L.map(x=>"<div><b>"+E(d[x[0]]||0)+"</b><span>"+E(x[1])+"</span></div>").join("")+"</div>";
  }
  let armed="";
  async function onLab(e){
    const b=e.target.closest&&e.target.closest("[data-lc97s]");if(!b||!owner())return;const a=b.getAttribute("data-lc97s"),view=Q("#view");e.preventDefault();
    if(a==="scen"){LAB.scen=b.getAttribute("data-k");const h=Q("[data-lc97-sim]",view);if(h)h.innerHTML=simHTML();return}
    if(a==="pv90"){try{LC90.preview()}catch(x){say("The Day-7 pop-up (LC90) is not loaded.","bad")}return}
    if(a==="pv97"){openDownsell({preview:true,state:{trial:{started_at:Date.now()-7*DAY,ends_at:Date.now()}}});return}
    if(a==="pv99"){try{LC99.preview()}catch(x){say("The yearly switch (LC99) is not loaded.","bad")}return}
    const em=String((Q("[data-lc97-em]",view)||{}).value||"").trim().toLowerCase();
    if(a==="look"){look(view,em);return}
    if(a==="reset"){
      const k=b.getAttribute("data-k"),msg=Q("[data-lc97-lm]",view),who=em||(()=>{try{const x=sess()||{};return String(x.email||x.user&&x.user.email||"").toLowerCase()}catch(x){return""}})();
      if(!who){if(msg)msg.textContent="Type the test account's e-mail first.";return}
      if(armed!==k+who){armed=k+who;if(msg)msg.textContent="Tap again to reset “"+k+"” for "+who+".";setTimeout(()=>{if(armed===k+who)armed=""},6000);return}
      armed="";const r=await rpc("lc97_admin_reset",{p_email:who,p_scope:k});
      if(r&&r.status===200&&r.data&&r.data.ok){if(msg)msg.textContent="Reset “"+k+"” for "+who+".";MEM=null;const out=Q("[data-lc97-out]",view);if(out)out.textContent=JSON.stringify(r.data,null,2);report(view)}
      else if(msg)msg.textContent="Reset failed (HTTP "+(r&&r.status)+"): "+JSON.stringify(r&&r.data||"");
    }
  }
  function ownerRows(){
    if(!SIM_ENABLED)return;const m=Q("#lc49-menu");if(!m||Q("[data-lc97-own]",m)||!owner())return;
    const ref=Q("[data-lc90-own]",m);if(!ref)return;
    const b=document.createElement("a");b.href="#trial-lab";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc97-own","");
    b.innerHTML="<span><b>Trial &amp; Downsell Simulator</b><small>Day 1 → trial → post-trial offer, previews, test resets</small></span>";
    b.addEventListener("click",()=>{try{const mm=Q("#lc49-menu");if(mm)mm.remove()}catch(x){}});
    ref.insertAdjacentElement("afterend",b);
  }
  function css(){
    if(Q("#lc97-css"))return;const s=document.createElement("style");s.id="lc97-css";
    s.textContent=".lc97{display:grid;gap:10px}.lc97-pv{margin:0;padding:8px 10px;border-radius:10px;background:rgba(56,189,248,.12);color:#38bdf8;font-weight:700;font-size:13px}.lc97-lead{margin:0;color:#cbd5e1}.lc97 [data-lc97-msg]{margin:0}.lc97 [data-lc97-msg]:empty{display:none}"
      +".lc97-opt{display:grid;gap:4px;width:100%;text-align:left;padding:14px;border-radius:16px;cursor:pointer;min-height:44px;font:inherit;color:#e2e8f0}"
      +".lc97-main{background:#38bdf8;border:2px solid #38bdf8;color:#0f172a;box-shadow:0 8px 24px rgba(56,189,248,.25)}.lc97-main .lc97-t{font-size:17px;font-weight:800}.lc97-main small{color:#0f172a;opacity:.8}.lc97-main strong{font-size:26px}"
      +".lc97-disc{background:#1e293b;border:2px solid #fbbf24}.lc97-disc .lc97-t{font-size:15px;font-weight:800}.lc97-disc strong{font-size:22px;color:#fbbf24}.lc97-disc s{color:#94a3b8}.lc97-disc small{color:#94a3b8}"
      +".lc97-tag{justify-self:start;padding:2px 10px;border-radius:999px;background:rgba(251,191,36,.16);color:#fbbf24;font-weight:800;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase}"
      +".lc97-cf{display:grid;gap:10px}.lc97-cf[hidden]{display:none}.lc97-cfh{margin:0;font-weight:800;font-size:16px}.lc97-terms{margin:0;padding-left:18px;display:grid;gap:6px;color:#cbd5e1;font-size:14px}"
      +".lc97-ok{display:flex;gap:10px;align-items:flex-start;padding:12px;border-radius:12px;border:1px solid #334155;background:#0f172a;cursor:pointer;font-size:13.5px;line-height:1.45}.lc97-ok input{width:22px;height:22px;flex:none;margin-top:1px;accent-color:#38bdf8}"
      +".lc97-cfb{display:flex;gap:8px;flex-wrap:wrap}.lc97-cfb .btn{min-height:44px}.lc97-cfb .btn-primary{flex:1 1 200px}.lc97-cfb .btn:disabled{opacity:.5;cursor:not-allowed}"
      +".lc97-opt:disabled{opacity:.6;cursor:wait}.lc97-opt[hidden]{display:none}.lc97-p{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}"
      +".lc97-free{justify-self:center;background:none;border:0;color:#94a3b8;font:inherit;font-size:13px;padding:10px 14px;min-height:44px;cursor:pointer;text-decoration:underline}.lc97-free span{text-decoration:none}.lc97-fine{margin:0;text-align:center}"
      +".lc97-st{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;margin:0 0 12px;border-radius:14px;border:1px solid #334155;background:#1e293b}.lc97-st.is-on{border-color:#38bdf8}.lc97-st span{display:grid;gap:2px}.lc97-st small{color:#94a3b8}"
      +".lc97-slot{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:12px;border-radius:14px;border:2px solid #38bdf8;background:rgba(56,189,248,.08)}.lc97-slot div{display:grid;gap:2px}.lc97-slot small{color:#94a3b8}.lc97-slot .btn{min-height:44px}"
      +".lc97-lab{max-width:900px;margin:0 auto;display:grid;gap:12px}.lc97-lab h1{margin:0}.lc97-lab h2{margin:0;font-size:18px}.lc97-kick{margin:0;color:#fbbf24;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase}"
      +".lc97-lab .btn{min-height:44px}.lc97-chips{display:flex;flex-wrap:wrap;gap:6px}.lc97-tbl{display:grid;gap:2px;overflow:hidden}.lc97-tr{display:grid;grid-template-columns:44px 64px minmax(0,1.1fr) minmax(0,2fr);gap:8px;padding:8px;border-radius:8px;background:#0f172a;font-size:13px;align-items:center}"
      +".lc97-tr span{min-width:0;overflow-wrap:anywhere}.lc97-th{background:none;color:#94a3b8;font-weight:700}@media (max-width:520px){.lc97-tr{grid-template-columns:36px 54px minmax(0,1fr)}.lc97-tr span:nth-child(4){grid-column:1/-1}}"
      +".lc97-row{display:flex;gap:8px;flex-wrap:wrap}.lc97-row .input{flex:1 1 220px}.lc97-pre{margin:0;max-height:360px;overflow:auto;padding:10px;border-radius:10px;background:#0f172a;font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere}"
      +".lc97-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}.lc97-grid div{display:grid;gap:2px;padding:10px;border-radius:12px;background:#0f172a;border:1px solid #334155}.lc97-grid b{font-size:22px}.lc97-grid span{color:#94a3b8;font-size:12.5px}";
    document.head.appendChild(s);
  }
  let deb=0,tick=0;
  function afterRender(r){clearTimeout(deb);deb=setTimeout(()=>{ownerRows();if(route()==="upgrades")paintUpgrades();check("open")},2800)}
  function init(){
    try{
      css();
      if(typeof MOUNT!=="undefined"&&SIM_ENABLED){MOUNT["trial-lab"]=mount;try{DOC_TITLES["trial-lab"]="Trial & Downsell Simulator";ROUTE_TITLES["trial-lab"]="the trial simulator"}catch(e){}}
      try{const lv=LC26.levels,o=lv.minLevel;if(lv&&!lv.__lc97){lv.__lc97=1;lv.minLevel=r=>r==="trial-lab"?1:o(r)}}catch(e){}
      document.addEventListener("click",onLab);
      let d2=0;new MutationObserver(()=>{clearTimeout(d2);d2=setTimeout(ownerRows,250)}).observe(document.body,{childList:true,subtree:true});
      clearInterval(tick);tick=setInterval(()=>{if(document.visibilityState==="visible")check("tick")},5*60e3);
      setTimeout(handleReturn,1200);
    }catch(e){console.error("lc97",e)}
  }
  return{init:init,afterRender:afterRender,version:VERSION,state:state,decide:decide,trialEligible:trialEligible,trialEligibleNow:trialEligibleNow,hadTrial:hadTrial,
    slot:slot,open:openDownsell,preview:()=>openDownsell({preview:true}),check:check,
    _t:{decide:decide,simulate:simulate,numbers:numbers,dsHTML:dsHTML,statusHTML:statusHTML,SCEN:SCEN,WHY:WHY,reset(){MEM=null;memAt=0;busy=false}}};
})(); /*@@end lc97*/
