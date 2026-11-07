const LC57=(()=>{
  "use strict";
  /* LC57 (build 9.31.0): the e-mail "Opt-In Incentive".
     A member ticks ONE unticked box ("send me coaching tips and offers by email, and my bonus token") and gets a welcome mail with a bonus key worth 1 token.
     Rules that make it legal and safe:
       - the box is never pre-ticked, the button stays off until it is ticked, "No thanks" is always there, the benefit and what the person agrees to are stated;
       - the consent is stored by the server (lc36_consent_set, source "incentive") and can be withdrawn in Account > Email updates;
       - the key is checked by the SERVER (lc57_redeem): once per account AND once per e-mail address, and only for a member whose box is ticked;
       - if the welcome mail cannot be sent (no mail service set up yet) the app shows the key on screen instead of pretending a mail left.
     The old two-button sheets (LC36 "Chess updates by email?", LC39 "Email updates?") and the Account card now use this one flow. */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const KEY="lc57",get=()=>{try{return Store.get(KEY,{})||{}}catch(e){return{}}},put=o=>{try{Store.set(KEY,Object.assign(get(),o))}catch(e){}};
  const authed=(n,a)=>{try{return LC30.authed(n,a||{})}catch(e){return Promise.resolve({ok:false,error:"server"})}};
  const token=()=>{try{const s=LC26.sync.session();return s&&s.access_token||""}catch(e){return ""}};
  const email=()=>{try{const s=LC26.sync.session();return String(s&&s.email||"")}catch(e){return ""}};
  const fnBase=()=>{try{return String(LC26.sync.cfg().url||"").replace(/\/+$/,"")+"/functions/v1"}catch(e){return ""}};
  const TXT={
    title:"Get 1 bonus token",
    lead:"Tick the box to get coaching tips, new lessons and offers by email. As a thank-you we send you a bonus key worth 1 token.",
    box:"Yes, send me coaching tips and offers by email, and my bonus token.",
    small:"Optional. You can unsubscribe at any time in Account > Email updates. We only use your address for Lanckriet Chess updates. See the <a href=\"privacy.html\" target=\"_blank\" rel=\"noopener\">privacy policy</a>."
  };
  const ERR={
    invalid_key:"That key is not valid. Check it and try again.",already_redeemed:"This key was already used on your account. Each account can use it once.",
    consent:"Tick the email box first, then use your key.",sign_in:"Sign in first, then use your key.",credits_missing:"The bonus system is not ready yet. Try again later.",
    missing_function:"The bonus system is not ready yet. Try again later.",network:"No connection. Try again.",forbidden:"Sign in again, then try again."
  };
  let busy=false,sheet=null;

  /* ---------- the one flow: tick -> consent -> queue -> mail (or the key on screen) ---------- */
  async function accept(){
    const c=await authed("lc36_consent_set",{p_marketing:true,p_source:"incentive"});
    if(!c||!c.ok)return{ok:false,msg:ERR[c&&c.error]||"Could not save that. Try again later."};
    try{Store.set("lc39-mail",{v:true,at:Date.now()});Store.set("lc36-consent",Date.now())}catch(e){}
    put({consent:true});
    const w=await authed("lc57_welcome_start");
    if(w&&w.already){put({redeemed:true});return{ok:true,state:"done"}}
    if(!w||!w.ok)return{ok:false,msg:ERR[w&&w.error]||"Could not save that. Try again later."};
    put({queued:true});
    let sent=false;
    try{
      const k=LC26.sync.cfg(),r=await fetch(fnBase()+"/welcome-mail",{method:"POST",headers:{"Content-Type":"application/json",apikey:k.key||"",Authorization:"Bearer "+token()},body:"{}"});
      const j=await r.json().catch(()=>null);sent=!!(j&&j.ok&&j.sent);
    }catch(e){sent=false}
    if(sent){put({sent:true});return{ok:true,state:"mail"}}
    const rv=await authed("lc57_welcome_reveal");
    return{ok:true,state:"key",key:rv&&rv.ok?rv.key:""};
  }
  async function decline(){
    try{await authed("lc36_consent_set",{p_marketing:false,p_source:"incentive"})}catch(e){}
    try{Store.set("lc39-mail",{v:false,at:Date.now()});Store.set("lc36-consent",Date.now())}catch(e){}
    put({consent:false});
  }
  async function redeem(raw){
    const r=await authed("lc57_redeem",{p_key:String(raw||"")});
    if(r&&r.ok){
      put({redeemed:true,consent:true});say("+"+(r.tokens||1)+" token added to your bonus tokens.","good");
      try{LC36.tokens.claim(true)}catch(e){}
      return{ok:true};
    }
    if(r&&r.error==="already_redeemed")put({redeemed:true});
    return{ok:false,msg:ERR[r&&r.error]||"Could not use that key. Try again later."};
  }
  async function unsubscribe(){
    const r=await authed("lc36_consent_set",{p_marketing:false,p_source:"account"});
    if(r&&r.ok){try{Store.set("lc39-mail",{v:false,at:Date.now()});Store.set("lc36-consent",Date.now())}catch(e){}put({consent:false});say("Okay. No marketing emails.","good");return true}
    say("Could not save that. Try again later.","bad");return false;
  }
  async function refresh(){
    if(!token())return null;
    const r=await authed("lc57_status");
    if(r&&r.ok){put({consent:!!r.consent,redeemed:!!r.redeemed,queued:!!r.queued,sent:!!r.sent,at:Date.now()});return r}
    return null;
  }

  /* ---------- the sheet (onboarding) ---------- */
  function boxHTML(){
    return '<label class="lc57-box"><input type="checkbox" data-lc57="tick"><span>'+esc(TXT.box)+'</span></label><p class="small muted lc57-small">'+TXT.small+'</p>';
  }
  function stateHTML(s){
    if(s.state==="mail")return '<p><b>Check your inbox.</b> We sent your bonus key to '+esc(email()||"your email")+'. Enter it under <b>Account &gt; Bonus key</b> to get your token.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc57="gokey">Enter the key now</button><button type="button" class="btn btn-ghost" data-close>Later</button></div>';
    if(s.state==="key")return '<p>We could not send the email right now. Here is your bonus key:</p><p class="lc57-key"><b>'+esc(s.key||"")+'</b></p><div class="lc57-redeem"><input type="text" class="input" data-lc57="key" value="'+esc(s.key||"")+'" aria-label="Bonus key" autocomplete="off" autocapitalize="characters" spellcheck="false"><button type="button" class="btn btn-primary" data-lc57="redeem">Redeem now</button></div><p class="form-msg" data-lc57="msg" aria-live="polite"></p>';
    if(s.state==="done")return '<p><b>All set.</b> Your bonus token is on your account.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-close>Great</button></div>';
    return '<p>'+esc(TXT.lead)+'</p>'+boxHTML()+'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc57="accept" disabled>Get my bonus token</button><button type="button" class="btn btn-ghost" data-lc57="no">No thanks</button></div><p class="form-msg" data-lc57="msg" aria-live="polite"></p>';
  }
  function openIncentive(){
    try{
      if(typeof openSheet!=="function")return false;
      if(Q(".lc57-sheet"))return true;
      const g=get();if(g.redeemed)return true;
      const sh=openSheet({title:TXT.title,cls:"lc36-sheet lc36-consent lc57-sheet",noFocus:true,html:'<div class="lc57-body" data-lc57="body">'+stateHTML({state:g.consent&&g.sent?"mail":""})+"</div>"});
      sheet=sh;return true;
    }catch(e){return false}
  }

  /* ---------- the Account card ---------- */
  function cardHTML(){
    const g=get();let h='<h3>Email updates</h3>';
    if(g.redeemed)h+='<p class="small muted">'+(g.consent?"You get coaching tips and offers by email. ":"You are not getting marketing emails. ")+'Your bonus token has been added. Thank you.</p>'+(g.consent?'<div class="btn-row"><button type="button" class="btn btn-quiet" data-lc57="unsub">Unsubscribe from marketing emails</button></div>':'');
    else if(g.consent)h+='<p class="small muted">You get coaching tips and offers by email. '+(g.sent?"Your welcome mail with the bonus key is in your inbox.":"Your bonus key is waiting for you.")+'</p><label class="field"><span class="field-label">Bonus key</span><span class="lc57-redeem"><input type="text" class="input" data-lc57="key" placeholder="Type your bonus key" aria-label="Bonus key" autocomplete="off" autocapitalize="characters" spellcheck="false"><button type="button" class="btn btn-primary" data-lc57="redeem">Redeem</button></span></label><div class="btn-row"><button type="button" class="btn btn-quiet" data-lc57="resend">Send my welcome mail again</button><button type="button" class="btn btn-quiet" data-lc57="unsub">Unsubscribe from marketing emails</button></div>';
    else h+='<p class="small muted">'+esc(TXT.lead)+'</p>'+boxHTML()+'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc57="accept" disabled>Get my bonus token</button></div>';
    return h+'<p class="form-msg" data-lc57="msg" aria-live="polite"></p>';
  }
  function paintCard(){
    const c=Q(".lc39-mailcard");if(!c||!token())return;
    const h=cardHTML();if(c.getAttribute("data-lc57h")===String(h.length)+(get().consent?"c":"n")+(get().redeemed?"r":"")+(get().sent?"s":""))return;
    c.innerHTML=h;c.setAttribute("data-lc57h",String(h.length)+(get().consent?"c":"n")+(get().redeemed?"r":"")+(get().sent?"s":""));c.classList.add("lc57-card");
  }

  /* ---------- clicks ---------- */
  const msgOf=el=>{const h=el.closest(".lc57-sheet,.lc39-mailcard,.sheet");return h&&Q('[data-lc57="msg"]',h)};
  const setMsg=(el,t,bad)=>{const m=msgOf(el);if(m){m.className="form-msg"+(bad?" is-bad":"");m.textContent=t||""}};
  async function onClick(e){
    const el=e.target.closest&&e.target.closest("[data-lc57]");if(!el)return;
    const a=el.getAttribute("data-lc57");
    if(a==="tick"||a==="key"||a==="msg"||a==="body")return;
    e.preventDefault();
    const host=el.closest(".lc57-sheet,.lc39-mailcard,.sheet");
    if(a==="accept"){
      const tick=Q('[data-lc57="tick"]',host||document);if(!tick||!tick.checked){setMsg(el,"Tick the box first.",true);return}
      if(busy)return;busy=true;el.disabled=true;setMsg(el,"Saving…");
      const r=await accept();busy=false;
      if(!r.ok){el.disabled=false;setMsg(el,r.msg,true);return}
      const body=host&&host.classList.contains("lc57-sheet")?Q('[data-lc57="body"]',host):null;
      if(body){body.innerHTML=stateHTML(r)}
      else{say(r.state==="mail"?"Check your inbox for your bonus key.":r.state==="key"?"We could not send the mail. Your key is on screen.":"Done.","good");paintCard();
        if(r.state==="key"&&r.key){const k=Q('[data-lc57="key"]');if(k)k.value=r.key}}
      return;
    }
    if(a==="no"){await decline();try{sheet&&sheet.close&&sheet.close()}catch(x){}return}
    if(a==="redeem"){
      const k=Q('[data-lc57="key"]',host||document);if(!k||!k.value.trim()){setMsg(el,"Type your bonus key first.",true);return}
      if(busy)return;busy=true;el.disabled=true;setMsg(el,"Checking…");
      const r=await redeem(k.value);busy=false;el.disabled=false;
      if(!r.ok){setMsg(el,r.msg,true);return}
      if(host&&host.classList.contains("lc57-sheet")){const body=Q('[data-lc57="body"]',host);if(body)body.innerHTML=stateHTML({state:"done"})}
      else{const c=Q(".lc39-mailcard");if(c){c.removeAttribute("data-lc57h");paintCard()}}
      return;
    }
    if(a==="gokey"){try{sheet&&sheet.close&&sheet.close()}catch(x){}try{location.hash="#account"}catch(x){}return}
    if(a==="unsub"){if(await unsubscribe()){const c=Q(".lc39-mailcard");if(c){c.removeAttribute("data-lc57h");paintCard()}}return}
    if(a==="resend"){
      if(busy)return;busy=true;el.disabled=true;
      const w=await authed("lc57_welcome_start");let sent=false;
      if(w&&w.ok){try{const k=LC26.sync.cfg(),r=await fetch(fnBase()+"/welcome-mail",{method:"POST",headers:{"Content-Type":"application/json",apikey:k.key||"",Authorization:"Bearer "+token()},body:"{}"});const j=await r.json().catch(()=>null);sent=!!(j&&j.ok&&j.sent)}catch(x){}}
      busy=false;el.disabled=false;
      if(sent){put({sent:true});setMsg(el,"Sent. Check your inbox (and your spam folder).")}
      else{const rv=await authed("lc57_welcome_reveal");setMsg(el,rv&&rv.ok?"We could not send the mail. Your key: "+rv.key:"We could not send the mail right now.",!(rv&&rv.ok));if(rv&&rv.ok){const k=Q('[data-lc57="key"]');if(k)k.value=rv.key}}
      return;
    }
  }
  function onChange(e){
    const t=e.target;if(!t||!t.matches||!t.matches('[data-lc57="tick"]'))return;
    const host=t.closest(".lc57-sheet,.lc39-mailcard,.sheet"),b=host&&Q('[data-lc57="accept"]',host);if(b)b.disabled=!t.checked;
  }

  const CSS=".lc57-box{display:flex;gap:10px;align-items:flex-start;margin:12px 0 6px;font-size:14.5px;line-height:1.4;cursor:pointer}.lc57-box input{width:22px;height:22px;flex:0 0 auto;margin-top:1px;accent-color:#38bdf8}.lc57-small{margin:6px 0 12px}.lc57-key{font-size:20px;letter-spacing:.04em;text-align:center;background:var(--ink-2,#1e293b);border-radius:10px;padding:12px}.lc57-redeem{display:flex;gap:8px;align-items:stretch}.lc57-redeem .input{flex:1 1 auto;min-width:0;text-transform:uppercase}.lc57-card .btn-row{margin-top:10px}";
  let on=false,t=0;
  function afterRender(route){
    clearTimeout(t);
    t=setTimeout(()=>{
      try{
        if(route==="account"||/^#account/.test(location.hash||"")){paintCard();if(token()&&Date.now()-(get().at||0)>6e4)refresh().then(()=>paintCard())}
      }catch(e){}
    },250);
  }
  function init(){
    if(on)return;on=true;
    try{const st=document.createElement("style");st.id="lc57-css";st.textContent=CSS;(document.head||document.documentElement).appendChild(st)}catch(e){}
    document.addEventListener("click",onClick,true);document.addEventListener("change",onChange,true);
  }
  return{init:init,afterRender:afterRender,openIncentive:openIncentive,cardHTML:cardHTML,paintCard:paintCard,refresh:refresh,_accept:accept,_redeem:redeem,TXT:TXT,version:"9.31.0"};
})();
