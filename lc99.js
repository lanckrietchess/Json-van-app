/*@@module lc99*/
const LC99=(()=>{
  "use strict";
  /* LC99 (build 9.64.0): the withdrawal waiver and "your €25 counts toward the year".
     1. A member who paid the one-time Pro month (LC97's post-trial offer) may switch to the yearly plan during that month and 7 days after
        it, with what they paid for the month taken off the first year. The Upgrades page shows a card while the server says it is open
        (lc99_state); the card opens one sheet with the plain terms (today's price, the renewal price, how to cancel, the year starts today)
        and an UNCHECKED box (9.64.0: "… I give up my 14-day right of withdrawal"; 9.65.0: w2, the right stays). The pay button stays off until it is ticked;
        the stripe function's route "annual25" refuses a checkout without the consent, takes the credit from the database (never the
        browser), and the webhook marks the credit used (once per account).
     2. Owner menu > Withdrawal waivers (#consents): the stored waivers (lc99_admin_consents), newest first, with the exact wording, the
        flow, the Stripe session and where it was written (server = by the stripe function with the session, app = before a Payment Link).
     SQL: sql/20261122100000_lc99_withdrawal_consent_annual25.sql. The trial (LC73 / LC90) and the one-time month (LC97) send the same
     consent fields (consent: true, consent_v, consent_text). */
  /* 9.65.0 (LC100 legal review): Pro and VIP are a personalised digital service, so after the CJEU's Sky Österreich judgment (C-234/25,
     9 July 2026) a member does NOT give up the right of withdrawal by starting at once. Every paid step now has the same pattern: the
     plain terms and an UNCHECKED box "I ask for Pro to start right away … I can still withdraw within 14 days … I then pay only for the
     days I used" (wording w2-2026-11-23; tokens: the unused tokens are refunded). The Payment Links (Pro / VIP yearly and monthly from the
     Upgrades page and the Day-7 pop-up's "Skip the trial: pay now" and VIP buttons, the token packs) pass through confirm() first: LC44
     asks it before it opens a link, the consent is logged on the account or, for a guest, with the e-mail they typed (lc100_consent_note).
     The withdrawal function (Consumer Rights Directive art. 11a): "Withdraw from contract here" on #withdraw (Account, Upgrades, the
     landing footer): name, contract, e-mail, one confirmation tap; the stripe function stores the statement with date and time and
     e-mails the acknowledgement; the owner sees every statement on #consents with the refund deadline. */
  const VERSION="9.66.0",CONSENT_V="w2-2026-11-23",SQLF="sql/20261122100000_lc99_withdrawal_consent_annual25.sql",SQLW="sql/20261123100000_lc100_withdraw_games_community.sql";
  const KEEP14="I can still withdraw within 14 days with “Withdraw from contract here” (Account); I then pay only for the days I used and get the rest back.";
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.prototype.slice.call((r||document).querySelectorAll(s));
  const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
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
  const eur=c=>{c=Math.round(+c||0);return"€"+(c%100===0?String(c/100):(c/100).toFixed(2))};
  const day=t=>{try{return new Date(t).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}catch(e){return""}};

  /* ---------- pure: the numbers and the words (also used by the tests) ---------- */
  function numbers(p,credit){
    const ok=p&&p.ok&&Array.isArray(p.yearly),t=ok?(p.tranche||4):1,y=ok?(+p.yearly[t-1]||+p.base):19950,c=Math.max(0,Math.min(Math.round(+credit||0),y-100));
    return{yearly:y,credit:c,today:y-c,rate:{1:"Founding Member",2:"Early Adopter",3:"Launch",4:"Pro"}[t]||"Pro",tranche:t};
  }
  function wording(n){return"I ask for the yearly plan to start right away. I pay "+eur(n.today)+" today for my first year, then "+eur(n.yearly)+" each year until I cancel. I can still withdraw within 14 days with “Withdraw from contract here” (Account); I then pay only for the days I used and get the rest back."}
  function terms(n){
    return["First year: "+eur(n.today)+" today ("+eur(n.yearly)+" minus the "+eur(n.credit)+" you paid for your Pro month).",
      "Then "+eur(n.yearly)+" a year"+(n.tranche<4?" at the "+n.rate+" rate, kept for as long as your subscription stays active":"")+". Cancel any time in Account > Manage subscription; cancel before the renewal date and nothing more is charged.",
      "Your year starts today: it does not wait for your Pro month to end."];
  }
  function sheetHTML(n,st){
    return'<div class="lc99"><p class="lc99-price"><s>'+E(eur(n.yearly))+"</s> <strong>"+E(eur(n.today))+'</strong> <span>today for your first year</span></p>'
      +'<ul class="lc99-terms">'+terms(n).map(x=>"<li>"+E(x)+"</li>").join("")+"</ul>"
      +(st&&st.until?'<p class="small muted">This offer is open until '+E(day(st.until))+", once per account.</p>":"")
      +'<label class="lc99-ok"><input type="checkbox" data-lc99-ok> <span>'+E(wording(n))+"</span></label>"
      +'<div class="lc99-btns"><button type="button" class="btn btn-primary" data-lc99="pay" disabled>'+ic("lock")+" Pay "+E(eur(n.today))+' securely</button><button type="button" class="btn btn-quiet" data-close>Not now</button></div>'
      +'<p class="form-msg" data-lc99-msg aria-live="polite"></p><p class="small muted">Payment is handled by Stripe; we never see your card.</p></div>';
  }
  const WHY={sign_in:"Sign in first: the offer is tied to your account.",consent:"Tick the box first: it confirms Pro may start right away.",no_month:"This offer is for members who bought the one-time Pro month.",
    used:"You already used this offer.",expired:"This offer has ended (it is open during your Pro month and 7 days after it).",already_member:"You already have a Pro subscription.",
    not_ready:"The offer is not switched on on the server yet ("+SQLF+").",slow_down:"Too many tries. Wait a minute.",network:"No connection reached the payment server. Nothing was charged.",not_configured:"Checkout is not set up on this build."};

  /* ---------- the server ---------- */
  let MEM=null,memAt=0;
  async function state(force){
    if(!sess())return{ok:true,signed_in:false};
    if(MEM&&!force&&Date.now()-memAt<3*60e3)return MEM;
    const r=await rpc("lc99_state",{});
    MEM=r&&r.status===200&&r.data&&r.data.ok?r.data:missing(r)?{ok:false,missing:true}:{ok:false};memAt=Date.now();return MEM;
  }
  async function pricing(){try{return await Promise.race([LC34._t.pricing(),new Promise(res=>setTimeout(()=>res(null),2000))])}catch(e){return null}}
  async function stripeCall(path,body){
    const c=cfgSB();if(!c.url)return{ok:false,reason:"not_configured",status:0};
    try{const r=await fetch(c.url+"/functions/v1/stripe/"+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body||{})});const j=await r.json().catch(()=>({}));j.status=r.status;return j}
    catch(e){console.error("[LC99] annual25 checkout:",e);return{ok:false,reason:navigator.onLine===false?"network":"server",status:0}}
  }
  const go=u=>{try{LC36.support.go(u)}catch(e){location.href=u}};

  /* ---------- the sheet ---------- */
  async function open(o){
    o=o||{};const preview=!!o.preview;if(Q(".lc99-sheet"))return null;
    const st=preview?{status:"ok",credit_cents:2500,until:new Date(Date.now()+20*864e5).toISOString()}:((await state(true)).annual25||{});
    if(!preview&&st.status!=="ok"){say(WHY[st.status]||"This offer is not open on your account.");return null}
    const n=numbers(await pricing(),st.credit_cents||2500);
    try{Telemetry.log({e:"lc99",x:preview?"preview":"shown"})}catch(e){}
    return openSheet({title:"Switch to yearly: your "+eur(n.credit)+" counts",cls:"lc99-sheet",noFocus:true,html:sheetHTML(n,st),onMount(sh){
      const el=sh.el,ok=Q("[data-lc99-ok]",el),pay=Q('[data-lc99="pay"]',el),msg=t=>{const m=Q("[data-lc99-msg]",el);if(m)m.textContent=t||""};
      ok.addEventListener("change",()=>{pay.disabled=!ok.checked});
      pay.addEventListener("click",async e=>{
        e.preventDefault();if(!ok.checked){msg(WHY.consent);return}
        if(preview){msg("Preview: opens the yearly checkout at "+eur(n.today)+" today, with the consent.");return}
        pay.disabled=true;msg("Opening secure checkout…");
        const j=await stripeCall("annual25",{token:await tok(),device:dev(),consent:true,consent_v:CONSENT_V,consent_text:wording(n)});
        if(j.ok&&/^https:\/\/checkout\.stripe\.com\//i.test(j.url||"")){go(j.url);return}
        pay.disabled=false;console.error("[LC99] annual25 refused:",j);
        msg(WHY[j.reason]||("Checkout could not start (HTTP "+(j.status||0)+(j.reason?", "+j.reason:"")+"). Nothing was charged."));
        if(/^(used|expired|already_member|no_month)$/.test(j.reason||"")){pay.hidden=true;MEM=null;paint()}
      });
    }});
  }

  /* ---------- the card on the Upgrades page ---------- */
  async function paint(){
    const v=Q("#view");if(!v||route()!=="upgrades"||!sess())return;
    const s=await state();if(route()!=="upgrades")return;
    let box=Q("[data-lc99-card]",v);const st=s&&s.ok&&s.annual25;
    if(!st||st.status!=="ok"){if(box)box.remove();return}
    const n=numbers(await pricing(),st.credit_cents);if(route()!=="upgrades")return;
    if(!box){box=document.createElement("div");box.setAttribute("data-lc99-card","");const lc97=Q("[data-lc97-status]",v),head=Q(".btn-row",v);
      if(lc97)lc97.insertAdjacentElement("afterend",box);else if(head&&head.parentNode)head.parentNode.insertBefore(box,head);else v.prepend(box)}
    box.className="lc99-card";
    box.innerHTML="<div><b>"+ic("crown")+" Your "+E(eur(n.credit))+" counts toward a year of Pro</b><small>"+E(eur(n.today))+" today instead of "+E(eur(n.yearly))+" for your first year"+(st.until?". Open until "+E(day(st.until)):"")+".</small></div>"
      +'<button type="button" class="btn btn-primary" data-lc99-open>Switch to yearly</button>';
  }

  /* ---------- the owner's log ---------- */
  async function mountLog(view){
    if(!owner()){view.innerHTML='<section class="panel pad"><h1>Withdrawal waivers</h1><p class="muted">This page is for the owner.</p></section>';return null}
    view.innerHTML='<section class="lc99-log"><p class="lc99-kick">Owner · evidence</p><h1>Withdrawals &amp; consents</h1><p class="muted">Withdrawal statements first (refund each one within 14 days: keep the paid days used, refund the rest in Stripe), then every time a member asked for Pro to start right away before a payment, with the exact words they saw. Wording w1 (until 22 Nov 2026) said the right was given up; w2 keeps it: the member pays only for the days used. Server rows come from the payment function with the Stripe session; app rows right before a Payment Link (app_guest = not signed in, the e-mail they typed).</p><div data-lc99-wd><p class="small muted">Loading the statements…</p></div><h2 class="lc99-h2">Consents</h2>'
      +'<div class="lc99-row"><input class="input" type="email" data-lc99-em placeholder="e-mail (empty = everyone)"><button type="button" class="btn btn-primary" data-lc99s="look">Show</button></div><div data-lc99-out><p class="small muted">Loading…</p></div></section>';
    look(view,"");wdList(view);return null;
  }
  async function look(view,em){
    const out=Q("[data-lc99-out]",view);if(!out)return;out.innerHTML='<p class="small muted">Loading…</p>';
    const r=await rpc("lc99_admin_consents",{p_email:em,p_limit:100});
    if(missing(r)){out.innerHTML="<p><b>Run "+E(SQLF)+" first.</b></p>";return}
    const l=r&&r.status===200&&r.data&&r.data.rows||null;
    if(!l){out.innerHTML='<p class="small muted">Could not load (HTTP '+E(r&&r.status)+").</p>";return}
    out.innerHTML=l.length?'<ul class="lc99-list">'+l.map(x=>'<li><div><b>'+E(x.email)+"</b> · "+E(x.flow)+" · "+E(x.source)+" · "+E(new Date(x.created_at).toLocaleString("en-GB"))+(x.session_id?" · <code>"+E(x.session_id)+"</code>":"")+"</div><small>"+E(x.version)+": “"+E(x.wording)+"”</small></li>").join("")+"</ul>"
      :'<p class="small muted">No waivers stored yet.</p>';
  }


  /* ---------- the owner: withdrawal statements ---------- */
  const CONTRACT={pro_trial:"Pro, free trial",pro_monthly:"Pro, monthly",pro_yearly:"Pro, yearly",pro_month_once:"Pro, one month (one-time)",vip_monthly:"VIP, monthly",vip_yearly:"VIP, yearly",tokens:"Token pack",other:"Another purchase"};
  async function wdList(view){
    const out=Q("[data-lc99-wd]",view);if(!out)return;
    const r=await rpc("lc100_admin_withdrawals",{p_limit:200});
    if(missing(r)){out.innerHTML="<p><b>Run "+E(SQLW)+" first.</b></p>";return}
    const l=r&&r.status===200&&r.data&&r.data.rows||null;
    if(!l){out.innerHTML='<p class="small muted">Could not load the statements (HTTP '+E(r&&r.status)+").</p>";return}
    const open=l.filter(x=>x.status==="received").length;
    out.innerHTML='<h2 class="lc99-h2">Withdrawal statements'+(open?' <span class="lc99-badge">'+open+" to handle</span>":"")+"</h2>"
      +(l.length?'<ul class="lc99-list">'+l.map(x=>{const late=x.status==="received"&&Date.now()>+new Date(x.refund_by);
        return'<li data-wid="'+E(x.id)+'"><div><b>W'+E(x.id)+" · "+E(x.name)+"</b> · "+E(x.email)+(x.account&&x.account!==x.email?" (account "+E(x.account)+")":"")+" · "+E(CONTRACT[x.contract]||x.contract)+"</div>"
          +"<small>Received "+E(new Date(x.created_at).toLocaleString("en-GB"))+" · refund by <b"+(late?' class="lc99-late"':"")+">"+E(new Date(x.refund_by).toLocaleDateString("en-GB",{day:"numeric",month:"short"}))+"</b> · "+(x.dm?"acknowledgement in their chat":x.mailed?"acknowledgement e-mailed":"guest: acknowledgement shown on screen with a download")+(x.note?" · “"+E(x.note)+"”":"")+"</small>"
          +'<div class="lc99-row"><select class="input" data-wst>'+["received","refunded","partly_refunded","declined","duplicate"].map(k=>'<option value="'+k+'"'+(x.status===k?" selected":"")+">"+k.replace("_"," ")+"</option>").join("")+'</select><input class="input" data-wnote maxlength="500" placeholder="Stripe refund id or a note" value="'+E(x.handled_note||"")+'"><button type="button" class="btn btn-ghost btn-sm" data-lc99s="wsave">Save</button></div></li>'}).join("")+"</ul>"
        :'<p class="small muted">No withdrawal statements yet.</p>');
  }
  async function wdSave(li){
    const id=+li.getAttribute("data-wid"),st=(Q("[data-wst]",li)||{}).value,nt=(Q("[data-wnote]",li)||{}).value||"";
    const r=await rpc("lc100_admin_withdrawal_set",{p_id:id,p_status:st,p_note:nt});
    say(r&&r.data&&r.data.ok?"Saved.":"Could not save (HTTP "+(r&&r.status)+").",r&&r.data&&r.data.ok?"good":"bad");
  }

  /* ---------- the consent step before a Payment Link (Pro / VIP plans and token packs) ---------- */
  async function priceOf(o){
    if(o.discounted)return"";   /* a referral discount: Stripe shows the final price */
    if(o.flow==="tokens")return o.price||"";
    const p=await pricing(),x=p?(o.tier===3?p.vip:p):null;if(!x||!x.ok&&!Array.isArray(x.yearly))return"";
    const t=x.tranche||4;return o.plan==="monthly"?eur(x.monthly):eur(+(x.yearly||[])[t-1]||+x.base);
  }
  function confirmWords(o,price){
    if(o.flow==="tokens")return"I ask for my "+(o.tokens?Number(o.tokens).toLocaleString("en-GB")+" ":"")+"tokens to be added right away. I pay "+(price||"the price shown")+" once. I can still withdraw within 14 days with “Withdraw from contract here” (Account); I then get back the price of the tokens I have not used.";
    const nm=o.tier===3?"VIP":"Pro",per=o.plan==="monthly"?"month":"year";
    return"I ask for "+nm+" to start right away. I pay "+(price||"the price shown at checkout")+" today, then the same every "+per+" until I cancel. "+KEEP14;
  }
  function confirmTerms(o,price){
    if(o.flow==="tokens")return["One payment"+(price?" of "+price:"")+", no subscription: nothing renews.","The tokens are added to your account right after the payment.","Changed your mind? Within 14 days, “Withdraw from contract here” in Account refunds the tokens you have not used."];
    const nm=o.tier===3?"VIP":"Pro",per=o.plan==="monthly"?"a month":"a year";
    return["Today: "+(price||"the price shown at checkout")+". Then "+(price||"the same")+" "+per+" until you cancel (Account > Manage subscription; cancel before the renewal date and nothing more is charged).",
      nm+" starts right away"+(o.tier===3?": the bonus tokens arrive at once.":"."),
      "Changed your mind? Within 14 days, “Withdraw from contract here” in Account: you pay only for the days you used and get the rest back."];
  }
  async function noteConsent(o,words,email){
    const t=await tok();const h=t?{Authorization:"Bearer "+t}:{};
    try{const r=await Promise.race([LC26.sync.http("/rest/v1/rpc/lc100_consent_note",{method:"POST",headers:h,body:JSON.stringify({p_flow:o.flow,p_version:CONSENT_V,p_wording:words,p_device:dev(),p_email:email||""})}),new Promise(z=>setTimeout(()=>z({status:0}),3000))]);
      if(!(r&&r.status===200&&r.data&&r.data.ok))console.error("[LC99] the consent before a Payment Link was not stored:",r&&r.status,r&&r.data);return r}catch(e){console.error("[LC99] consent note:",e);return null}
  }
  /* resolves true when the member ticked the box and pressed Pay (the consent is logged first, best effort), false when they closed it */
  async function confirm(o){
    o=Object.assign({flow:"yearly",plan:"yearly",tier:2},o||{});o.tier=o.tier===3?3:2;
    if(o.flow!=="tokens")o.flow=o.tier===3?(o.plan==="monthly"?"vip_monthly":"vip"):(o.plan==="monthly"?"monthly":"yearly");
    if(typeof openSheet!=="function")return true;
    const old=Q(".lc99-cf-sheet");if(old)try{old.closest(".sheet-wrap").remove()}catch(e){}
    const price=await priceOf(o),words=confirmWords(o,price),terms=confirmTerms(o,price);
    const title=o.flow==="tokens"?"Before you pay: "+(o.tokens?Number(o.tokens).toLocaleString("en-GB")+" tokens":"tokens"):"Before you pay: "+(o.tier===3?"VIP":"Pro")+(o.plan==="monthly"?", monthly":", yearly");
    try{Telemetry.log({e:"lc99",x:"cf-"+o.flow})}catch(e){}
    return new Promise(res=>{let done=false;const fin=v=>{if(!done){done=true;res(v)}};
      openSheet({title:title,cls:"lc99-sheet lc99-cf-sheet",noFocus:true,onClose(){fin(false)},
        html:'<div class="lc99">'+(price?'<p class="lc99-price"><strong>'+E(price)+"</strong> <span>"+(o.flow==="tokens"?"once":o.plan==="monthly"?"a month":"a year")+"</span></p>":"")
          +'<ul class="lc99-terms">'+terms.map(x=>"<li>"+E(x)+"</li>").join("")+"</ul>"
          +'<label class="lc99-ok"><input type="checkbox" data-lc99-cfok> <span>'+E(words)+"</span></label>"
          +'<div class="lc99-btns"><button type="button" class="btn btn-primary" data-lc99-cfpay disabled>'+ic("lock")+" "+E(price?"Pay "+price+" securely":"Continue to secure checkout")+'</button><button type="button" class="btn btn-quiet" data-close>Back</button></div>'
          +'<p class="form-msg" data-lc99-cfmsg aria-live="polite"></p><p class="small muted">Payment is handled by Stripe; we never see your card.</p></div>',
        onMount(sh){const el=sh.el,ok=Q("[data-lc99-cfok]",el),pay=Q("[data-lc99-cfpay]",el);
          ok.addEventListener("change",()=>{pay.disabled=!ok.checked});
          pay.addEventListener("click",async e=>{e.preventDefault();if(!ok.checked){const m=Q("[data-lc99-cfmsg]",el);if(m)m.textContent="Tick the box first.";return}
            pay.disabled=true;const m=Q("[data-lc99-cfmsg]",el);if(m)m.textContent="Opening secure checkout…";
            await noteConsent(o,words,o.email);fin(true);try{sh.close()}catch(x){}});
        }});
    });
  }

  /* ---------- the withdrawal function: #withdraw ("Withdraw from contract here") ---------- */
  const WWHY={email:"Enter the e-mail you used for the purchase.",name:"Enter your name.",contract:"Pick the purchase you withdraw from.",confirm:"Tap “Confirm withdrawal” to send it.",slow_down:"Too many tries. Wait a minute and try again.",
    not_ready:"The withdrawal could not be stored right now. E-mail lanckrietchess@gmail.com with the same details: that counts too.",network:"No connection. Nothing was sent. Try again, or e-mail lanckrietchess@gmail.com."};
  const myName=()=>{try{return String(App.profile&&(App.profile.name||App.profile.firstName)||"").slice(0,80)}catch(e){return""}};
  const myMail=()=>{const x=sess();return x&&x.email?String(x.email).toLowerCase():""};
  function wdFormHTML(){
    return'<section class="lc99-wd"><p class="lc99-kick">Your right of withdrawal</p><h1>Withdraw from contract here</h1>'
      +'<p class="muted">Bought Pro, VIP, a one-time month or tokens in the last 14 days? You can withdraw without giving a reason. Fill in three things, check them, then confirm. You get a confirmation with the date and time right away.</p>'
      +'<form class="lc99-wdf" data-lc99-wdf novalidate><label class="field"><span class="field-label">Your name</span><input class="input" name="name" maxlength="80" autocomplete="name" value="'+E(myName())+'"></label>'
      +'<label class="field"><span class="field-label">The e-mail you used to buy</span><input class="input" name="email" type="email" maxlength="200" autocomplete="email" value="'+E(myMail())+'"></label>'
      +'<label class="field"><span class="field-label">The purchase you withdraw from</span><select class="input" name="contract"><option value="">Choose…</option>'+Object.keys(CONTRACT).map(k=>'<option value="'+k+'">'+E(CONTRACT[k])+"</option>").join("")+"</select></label>"
      +'<label class="field"><span class="field-label">Anything to add? <small class="muted">(optional)</small></span><textarea class="input" name="note" rows="2" maxlength="500"></textarea></label>'
      +'<p class="small muted" data-lc99-wdwhere>'+(myMail()?"The confirmation appears here and in your chat with Kyenzo (Coach Kyenzo), where it stays.":'The confirmation appears here, to download. <a href="#account">Sign in</a> first and it also lands in your chat with Kyenzo. You do not have to.')+"</p>"
      +'<p class="form-msg" data-lc99-wdmsg aria-live="polite"></p><div class="lc99-btns"><button type="submit" class="btn btn-primary">Continue</button></div></form>'
      +'<p class="small muted">What happens next: we stop any renewal and refund you within 14 days, to the card you paid with. For Pro or VIP that started at your request, the days you used are kept and the rest is refunded; for tokens, the unused tokens. A free trial costs nothing. Only want to stop the next renewal? Use Account > Manage subscription instead.</p></section>';
  }
  function wdStepHTML(d){
    return'<div class="lc99-wdc"><h2>Check and confirm</h2><ul class="lc99-terms"><li>I withdraw from my contract for <b>'+E(CONTRACT[d.contract])+"</b>.</li><li>Name: <b>"+E(d.name)+"</b></li><li>E-mail of the purchase: <b>"+E(d.email)+"</b></li>"+(d.note?"<li>Note: "+E(d.note)+"</li>":"")+"</ul>"
      +'<div class="lc99-btns"><button type="button" class="btn btn-primary" data-lc99-wdgo>Confirm withdrawal</button><button type="button" class="btn btn-quiet" data-lc99-wdback>Change</button></div><p class="form-msg" data-lc99-wdmsg2 aria-live="polite"></p></div>';
  }
  function wdDoneHTML(j,d){
    const when=j.at?new Date(j.at).toLocaleString("en-GB",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}):"";
    return'<div class="lc99-wdc is-done"><h2>'+ic("circle-check")+" Your withdrawal is received</h2><p>Reference <b>"+E(j.ref||"")+"</b> · "+E(when)+".</p>"
      +"<p>"+(j.dm?"This confirmation is also in your chat with Kyenzo, where it stays. Kyenzo sees your withdrawal on top of his inbox.":j.mailed?"We e-mailed this confirmation to <b>"+E(d.email)+"</b>. Keep it.":"Save this confirmation: download it or e-mail it to yourself. We have it too.")+"</p>"
      +'<pre class="lc99-ack" data-lc99-ack>'+E(j.text||"")+"</pre>"
      +'<div class="lc99-btns"><button type="button" class="btn btn-primary" data-lc99-wddl>'+ic("download")+' Download the confirmation</button>'+(j.dm?'<a class="btn btn-ghost" href="#coach-chat">'+ic("comments")+" Open my chat</a>":"")+'<a class="btn btn-ghost" href="mailto:'+E(d.email)+"?subject="+encodeURIComponent("Withdrawal "+(j.ref||""))+"&body="+encodeURIComponent(j.text||"")+'">'+ic("envelope")+" E-mail it to myself</a></div></div>";
  }
  async function mountWithdraw(view){
    css();view.innerHTML=wdFormHTML();
    const f=Q("[data-lc99-wdf]",view),msg=t=>{const m=Q("[data-lc99-wdmsg]",view);if(m)m.textContent=t||""};let data=null,last=null;
    f.addEventListener("submit",e=>{e.preventDefault();
      const d={name:String(f.name.value||"").replace(/[<>]/g,"").trim(),email:String(f.email.value||"").trim().toLowerCase(),contract:f.contract.value,note:String(f.note.value||"").replace(/[<>]/g,"").trim()};
      if(!d.name){msg(WWHY.name);f.name.focus();return}if(!/^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,24}$/.test(d.email)){msg(WWHY.email);f.email.focus();return}if(!CONTRACT[d.contract]){msg(WWHY.contract);f.contract.focus();return}
      msg("");data=d;let st=Q(".lc99-wdc",view);if(st)st.remove();f.hidden=true;f.insertAdjacentHTML("afterend",wdStepHTML(d));
      const go=Q("[data-lc99-wdgo]",view);if(go)go.focus()});
    view.addEventListener("click",async e=>{
      if(e.target.closest("[data-lc99-wdback]")){const st=Q(".lc99-wdc",view);if(st)st.remove();f.hidden=false;return}
      if(e.target.closest("[data-lc99-wddl]")&&last){try{const b=new Blob([last.text||""],{type:"text/plain"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="withdrawal-"+(last.ref||"lanckriet")+".txt";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}catch(x){}return}
      const go=e.target.closest("[data-lc99-wdgo]");if(!go||!data)return;
      go.disabled=true;const m2=Q("[data-lc99-wdmsg2]",view);if(m2)m2.textContent="Sending…";
      const j=await stripeCall("withdraw",Object.assign({token:await tok(),device:dev(),confirm:true},data));
      if(j&&j.ok){last=j;const st=Q(".lc99-wdc",view);if(st)st.outerHTML=wdDoneHTML(j,data);try{Telemetry.log({e:"lc99",x:"withdraw"})}catch(x){}return}
      go.disabled=false;if(m2)m2.textContent=WWHY[j&&j.reason]||("It did not go through (HTTP "+E(j&&j.status||0)+"). E-mail lanckrietchess@gmail.com with the same details: that counts too.");
    });
    return null;
  }
  /* the link on Account and Upgrades (art. 11a: easy to find, the whole 14 days) */
  function wdLink(){
    const v=Q("#view"),r=route();if(!v||(r!=="account"&&r!=="upgrades")||Q("[data-lc99-wdlink]",v))return;
    const a=document.createElement("p");a.className="small lc99-wdlink";a.setAttribute("data-lc99-wdlink","");
    a.innerHTML='<a href="#withdraw">'+ic("arrow-rotate-left")+" Withdraw from contract here</a> <span class=\"muted\">(within 14 days of a purchase)</span>";
    v.appendChild(a);
  }

  function ownerRows(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc99-own]",m)||!owner())return;
    const ref=Q("[data-lc97-own]",m)||Q("[data-lc90-own]",m);if(!ref)return;
    const b=document.createElement("a");b.href="#consents";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc99-own","");
    b.innerHTML="<span><b>Withdrawals &amp; consents</b><small>Withdrawal statements to refund, and who asked for Pro to start at once before paying</small></span>";
    b.addEventListener("click",()=>{try{const mm=Q("#lc49-menu");if(mm)mm.remove()}catch(x){}});
    ref.insertAdjacentElement("afterend",b);
  }
  function onClick(e){
    if(e.target.closest&&e.target.closest("[data-lc99-open]")){e.preventDefault();open();return}
    const b=e.target.closest&&e.target.closest("[data-lc99s]");if(!b||!owner())return;e.preventDefault();
    if(b.getAttribute("data-lc99s")==="wsave"){const li=b.closest("[data-wid]");if(li)wdSave(li);return}
    const v=Q("#view");look(v,String((Q("[data-lc99-em]",v)||{}).value||"").trim().toLowerCase());
  }
  function css(){
    if(Q("#lc99-css"))return;const s=document.createElement("style");s.id="lc99-css";
    s.textContent=".lc99{display:grid;gap:10px}.lc99-price{margin:0;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.lc99-price s{color:#94a3b8}.lc99-price strong{font-size:28px;color:#38bdf8}.lc99-price span{color:#cbd5e1}"
      +".lc99-terms{margin:0;padding-left:18px;display:grid;gap:6px;color:#cbd5e1;font-size:14px}.lc99-ok{display:flex;gap:10px;align-items:flex-start;padding:12px;border-radius:12px;border:1px solid #334155;background:#0f172a;cursor:pointer;font-size:13.5px;line-height:1.45}"
      +".lc99-ok input{width:22px;height:22px;flex:none;margin-top:1px;accent-color:#38bdf8}.lc99-btns{display:flex;gap:8px;flex-wrap:wrap}.lc99-btns .btn{min-height:44px}.lc99-btns .btn-primary{flex:1 1 200px}.lc99-btns .btn:disabled{opacity:.5;cursor:not-allowed}"
      +".lc99 [data-lc99-msg]{margin:0}.lc99 [data-lc99-msg]:empty{display:none}"
      +".lc99-card{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:12px 14px;margin:0 0 12px;border-radius:14px;border:2px solid #38bdf8;background:rgba(56,189,248,.08)}.lc99-card div{display:grid;gap:2px}.lc99-card small{color:#94a3b8}.lc99-card .btn{min-height:44px}"
      +".lc99-log{max-width:900px;margin:0 auto;display:grid;gap:12px}.lc99-log h1{margin:0}.lc99-kick{margin:0;color:#fbbf24;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase}.lc99-row{display:flex;gap:8px;flex-wrap:wrap}.lc99-row .input{flex:1 1 220px}.lc99-row .btn{min-height:44px}"
      +".lc99-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}.lc99-list li{padding:10px 12px;border-radius:12px;background:#1e293b;border:1px solid #334155;display:grid;gap:4px;overflow-wrap:anywhere}.lc99-list small{color:#94a3b8}.lc99-list code{color:#38bdf8}"
      +".lc99-h2{margin:8px 0 0;font-size:18px}.lc99-badge{display:inline-block;margin-left:6px;padding:2px 8px;border-radius:999px;background:#f59e0b;color:#0f172a;font-size:12px;font-weight:800}.lc99-late{color:#fca5a5}"
      +".lc99-list select.input{flex:0 1 170px}.lc99-wd{max-width:640px;margin:0 auto;display:grid;gap:12px}.lc99-wd h1{margin:0}.lc99-wdf{display:grid;gap:10px}.lc99-wdc{display:grid;gap:10px;padding:14px;border-radius:14px;border:1px solid #334155;background:#1e293b}"
      +".lc99-wdc.is-done{border-color:#22c55e}.lc99-ack{white-space:pre-wrap;overflow-wrap:anywhere;margin:0;padding:10px;border-radius:10px;background:#0f172a;color:#cbd5e1;font-size:12.5px;max-height:260px;overflow:auto}.lc99-wdlink{margin:16px 0 0;text-align:center}.lc99-wdlink a{color:#38bdf8}";
    document.head.appendChild(s);
  }
  let deb=0;
  function afterRender(r){clearTimeout(deb);deb=setTimeout(()=>{ownerRows();if(route()==="upgrades")paint();wdLink()},3000);setTimeout(wdLink,700)}
  function init(){
    try{
      css();
      if(typeof MOUNT!=="undefined"){MOUNT.consents=mountLog;MOUNT.withdraw=mountWithdraw;try{DOC_TITLES.consents="Withdrawals & consents";ROUTE_TITLES.consents="the withdrawals";DOC_TITLES.withdraw="Withdraw from contract here";ROUTE_TITLES.withdraw="the withdrawal page"}catch(e){}}
      try{const lv=LC26.levels,o=lv.minLevel;if(lv&&!lv.__lc99){lv.__lc99=1;lv.minLevel=r=>r==="consents"||r==="withdraw"?1:o(r)}}catch(e){}
      document.addEventListener("click",onClick);
      /* 9.65.0: a throttle, not a debounce: the page never stops changing, so a reset timer never fired and the owner menu missed its rows */
      let d2=0;new MutationObserver(()=>{if(d2)return;d2=setTimeout(()=>{d2=0;ownerRows()},250)}).observe(document.body,{childList:true,subtree:true});
    }catch(e){console.error("lc99",e)}
  }
  return{init:init,afterRender:afterRender,version:VERSION,open:open,preview:()=>open({preview:true}),state:state,paint:paint,confirm:confirm,mountWithdraw:mountWithdraw,
    _t:{numbers:numbers,wording:wording,terms:terms,sheetHTML:sheetHTML,WHY:WHY,CONSENT_V:CONSENT_V,KEEP14:KEEP14,confirmWords:confirmWords,confirmTerms:confirmTerms,CONTRACT:CONTRACT,reset(){MEM=null;memAt=0}}};
})(); /*@@end lc99*/
