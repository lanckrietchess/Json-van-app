const LC43=(()=>{
  "use strict";
  /* LC43: the upgrade pop-up. It opens when a member taps a Pro-only feature (instead of the plain "Part of Pro" sheet).
     It shows the launch rate (regular price crossed out, spots left), makes sure the buyer has an account BEFORE Stripe
     (no account = one tap "Create account & proceed"), then goes straight to the Stripe checkout with that exact email.
     If the checkout function cannot be reached it shows a Retry button and says why (CORS / ALLOWED_ORIGINS, JWT, keys, offline). */
  const Q=(s,r)=>(r||document).querySelector(s);
  const E=s=>{try{return esc(s)}catch(e){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}};
  const EMAIL=/^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,24}$/;
  const eur=c=>{c=+c||0;return"€"+(c%100===0?String(c/100):(c/100).toFixed(2))};
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const cfg=()=>{try{return LC26.sync.cfg()||{}}catch(e){return {}}};
  const admin=()=>{try{return !!Admin.active}catch(e){return false}};
  const paid=()=>{try{return App.rank()>=2}catch(e){return false}};
  const fnBase=()=>String(cfg().url||"").replace(/\/+$/,"")+"/functions/v1/stripe";

  /* ---------- the Stripe function: plain call first, then once more with the public key (a function that checks JWTs answers 401 without it) ---------- */
  async function raw(path,body,hdr){
    let t=0;
    try{
      const ctl=typeof AbortController==="function"?new AbortController():null;if(ctl)t=setTimeout(()=>ctl.abort(),15000);
      const r=await fetch(fnBase()+"/"+path,{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr||{}),body:JSON.stringify(body||{}),signal:ctl?ctl.signal:undefined});
      const j=await r.json().catch(()=>({}));return Object.assign({status:r.status},j);
    }catch(e){return{ok:false,reason:"network",status:0}}finally{if(t)clearTimeout(t)}
  }
  async function api(path,body){
    const r=await raw(path,body);
    if(r.status===0||r.status===401||r.status===403){const k=cfg().key;if(k){const r2=await raw(path,body,{Authorization:"Bearer "+k,apikey:k});if(r2.status===200)return r2}}
    return r;
  }
  let mem=null;
  async function pricing(){
    if(mem&&Date.now()-mem.at<60e3)return mem.p;
    const r=await api("pricing",{});
    const p=r&&r.ok&&Array.isArray(r.yearly)?r:null;mem={p:p,at:Date.now()};return p;
  }
  /* does an account exist for this email? true / false, or null when the check is not available (the SQL function is not installed, no connection) */
  async function exists(em){
    try{
      const c=cfg();if(!c.url||!c.key)return null;
      const r=await fetch(String(c.url).replace(/\/+$/,"")+"/rest/v1/rpc/lc43_account_exists",{method:"POST",headers:{"Content-Type":"application/json",apikey:c.key,Authorization:"Bearer "+c.key},body:JSON.stringify({p_email:em})});
      const j=await r.json().catch(()=>null);
      return r.status===200&&j&&j.ok===true&&typeof j.exists==="boolean"?j.exists:null;
    }catch(e){return null}
  }
  /* why did the checkout not open? A visitor gets a plain sentence; the owner (admin mode) also gets the cause */
  async function diagnose(r){
    const st=r&&r.status,why=r&&(r.reason||r.error);
    if(st===401||st===403)return{u:"Checkout is not reachable right now. Nothing was charged.",o:"The stripe function answered "+st+": it refuses calls without a login. Deploy it with: supabase functions deploy stripe --no-verify-jwt"};
    if(st===404)return{u:"Checkout is not reachable right now. Nothing was charged.",o:"The stripe function or this route was not found (404). Deploy the stripe function (routes pricing, subscribe, tokens, gift)."};
    if(why==="not_configured"||why==="stripe_not_configured"||why==="no_stripe")return{u:"Checkout is not open yet. Nothing was charged. Please try again soon.",o:"The stripe function says it is not configured: set the Stripe secret key and the price settings as Supabase secrets, then redeploy."};
    if(st===0||why==="network"){
      if(typeof navigator!=="undefined"&&navigator.onLine===false)return{u:"You seem to be offline. Check your connection and try again. Nothing was charged.",o:"The browser reports no network."};
      let reach=false;try{await fetch(fnBase()+"/pricing",{method:"GET",mode:"no-cors"});reach=true}catch(e){reach=false}
      let origin="";try{origin=location.origin}catch(e){}
      return reach?{u:"We could not reach secure checkout from here. Nothing was charged.",o:"The function is reachable but the browser blocked the answer (CORS). Set the secret ALLOWED_ORIGINS on the stripe function to include "+origin+" (and the Vercel address) and redeploy it."}
                  :{u:"We could not reach secure checkout. Nothing was charged.",o:"The stripe function cannot be reached at all: it is not deployed, the project is paused, or the address in the page is wrong."};
    }
    return{u:"Checkout could not start. Nothing was charged. Please try again.",o:"The stripe function answered "+(st||"?")+(why?" ("+why+")":"")+". Check its logs in the Supabase dashboard."};
  }

  /* ---------- the pop-up ---------- */
  let sheet=null,last=null,orig=null,ctx={what:""};
  const root=()=>sheet&&sheet.el;
  const setMsg=(h,cls)=>{const m=Q("[data-lc43-msg]",root());if(m){m.innerHTML=h||"";m.className="form-msg lc43-msg"+(cls?" is-"+cls:"")}};
  function band(p){
    const t=p?(p.tranche||4):0;
    if(p&&t<4&&(p.left==null||p.left[t-1]==null||p.left[t-1]>0)){
      const price=p.yearly[t-1],pct=(p.discountPct&&p.discountPct[t-1])||Math.round((1-price/p.base)*100),cap=(p.caps&&p.caps[t-1])||100,left=p.left&&p.left[t-1];
      return{label:"Upgrade to Pro · "+eur(price)+" / year",html:'<span class="lc43-tag">'+(t===1?"Founding Member rate":t===2?"Early Adopter rate":"Launch rate")+'</span><span class="lc43-pct">'+pct+'% off</span>'
        +'<div class="lc43-prices"><s>'+eur(p.base)+' / year</s><b>'+eur(price)+'</b><span>/ year</span></div>'
        +(left!=null?'<div class="lc43-bar" aria-hidden="true"><i style="width:'+Math.max(4,Math.round((1-left/cap)*100))+'%"></i></div><p class="lc43-left"><b>'+left+' of '+cap+'</b> spots left at this price</p>':"")};
    }
    if(p){return{label:"Upgrade to Pro · "+eur(p.base)+" / year",html:'<div class="lc43-prices"><b>'+eur(p.base)+'</b><span>/ year, or '+eur(p.monthly)+' / month</span></div>'}}
    return{label:"Upgrade to Pro",html:'<span class="lc43-tag">Founding Member rate</span><span class="lc43-pct">50% off</span><div class="lc43-prices"><s>€399 / year</s><b>€199.50</b><span>/ year</span></div><p class="lc43-left">For the first 100 members. Your exact rate and the spots left are confirmed at checkout.</p>'};
  }
  function main(p){
    const s=sess(),em=s&&s.email?String(s.email):"",b=band(p);
    let pend="";try{pend=LC26.sync.pending()||""}catch(e){}
    root().innerHTML='<div class="lc43">'
      +(ctx.what?'<p class="lc43-what"><b>'+E(ctx.what)+'</b> is part of Pro.</p>':'<p class="lc43-what">This is part of Pro.</p>')
      +'<div class="lc43-band">'+b.html+'</div>'
      +'<ul class="lc43-list"><li>The whole library: every repertoire, the middlegame, endgames and the Opening Vault</li><li>Your 24/7 AI coach and the MSPC engine</li><li>Full Trim reports on your own games</li><li>10 tokens a day, refreshed daily</li></ul>'
      +'<p class="small muted">This rate is for the Pro plan, billed yearly. Your price stays the same for as long as your subscription stays active. The Free plan stays available.</p>'
      +(em?'<p class="small muted">Signed in as <b>'+E(em)+'</b>. Your membership switches on for this account.</p>':'<label class="lc43-em"><span class="small">Your email (your membership switches on for it)</span><input class="input" name="email" type="email" autocomplete="email" placeholder="you@example.com" value="'+E(pend)+'" aria-label="Email address"></label>')
      +'<p class="form-msg lc43-msg" data-lc43-msg aria-live="polite"></p>'
      +'<div class="btn-row"><button type="button" class="btn btn-gold" data-lc43-buy>'+E(b.label)+'</button></div>'
      +'<div class="btn-row lc43-more"><button type="button" class="btn btn-quiet" data-lc43-plans>See all plans</button><button type="button" class="btn btn-quiet" data-lc43-other>Other ways to unlock</button></div></div>';
  }
  function create(em,ex){
    root().innerHTML='<div class="lc43"><h3 class="lc43-h">'+(ex===false?"No account found yet.":"Confirm your account first.")+'</h3>'
      +'<p>'+(ex===false?"First, create your account to secure your membership.":"First, confirm your account to secure your membership. If you already have one, nothing changes.")+'</p>'
      +'<label class="lc43-em"><span class="small">Your email</span><input class="input" name="email" type="email" autocomplete="email" value="'+E(em)+'" aria-label="Email address"></label>'
      +'<p class="small muted">We email you a sign-in link and a 6-digit code, so you can open the app right after paying. Use the same email at checkout.</p>'
      +'<p class="form-msg lc43-msg" data-lc43-msg aria-live="polite"></p>'
      +'<div class="btn-row"><button type="button" class="btn btn-gold" data-lc43-create>Create account &amp; proceed</button><button type="button" class="btn btn-quiet" data-lc43-back>Back</button></div></div>';
    const i=Q("input[name=email]",root());if(i&&!em)i.focus();
  }
  const emailNow=()=>{const s=sess();if(s&&s.email)return String(s.email).toLowerCase();const i=Q("input[name=email]",root());return i?String(i.value||"").trim().toLowerCase():""};
  const busy=b=>{QA(root(),"button").forEach(x=>{x.disabled=!!b})};
  const QA=(r,s)=>Array.prototype.slice.call((r||document).querySelectorAll(s));

  async function pay(em){
    last=()=>pay(em);
    busy(true);setMsg("Opening secure checkout…","");
    try{const u=await LC44.urlFor("yearly",2,em);if(u){try{LC36.support.go(u)}catch(e){location.href=u}return}}catch(e){}
    let r=null;
    try{
      let dev="";try{dev=String(deviceId()).slice(0,64)}catch(e){}
      r=await api("subscribe",{plan:"yearly",tier:2,email:em,device:dev});
    }catch(e){r={ok:false,reason:"network",status:0}}
    if(r&&r.ok&&typeof r.url==="string"&&/^https:\/\/[a-z0-9.-]+\.stripe\.com\//i.test(r.url)){try{LC36.support.go(r.url)}catch(e){location.href=r.url}return}
    busy(false);
    const d=await diagnose(r);
    setMsg(E(d.u)+' <button type="button" class="btn btn-ghost btn-sm" data-lc43-retry>Try again</button>'+(admin()?'<br><small class="lc43-owner">Owner: '+E(d.o)+'</small>':'<br><small>Still stuck? Send a DM to @lanckrietchess on Instagram.</small>'),"bad");
  }
  async function onBuy(){
    const em=emailNow();
    if(!EMAIL.test(em)){setMsg("Enter the email you sign in with.","bad");const i=Q("input[name=email]",root());if(i)i.focus();return}
    const s=sess();
    if(s&&s.email&&String(s.email).toLowerCase()===em){pay(em);return}      /* signed in: the account is verified */
    busy(true);setMsg("Checking your account…","");
    const ex=await exists(em);busy(false);
    if(ex===true){pay(em);return}
    create(em,ex);
  }
  async function onCreate(){
    const em=emailNow();
    if(!EMAIL.test(em)){setMsg("That email address does not look right.","bad");return}
    busy(true);setMsg("Creating your account…","");
    try{await LC26.sync.otp(em)}catch(e){}        /* sign-up + sign-in mail; a failed mail never blocks the purchase: the membership is tied to this email */
    pay(em);
  }
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t||!root()||!root().contains(t))return;
    if(t.closest("[data-lc43-buy]")){e.preventDefault();onBuy();return}
    if(t.closest("[data-lc43-create]")){e.preventDefault();onCreate();return}
    if(t.closest("[data-lc43-retry]")){e.preventDefault();if(last)last();return}
    if(t.closest("[data-lc43-back]")){e.preventDefault();main(mem&&mem.p);return}
    if(t.closest("[data-lc43-plans]")){e.preventDefault();try{LC36.support.open("pricing")}catch(x){}return}
    if(t.closest("[data-lc43-other]")){e.preventDefault();const f=orig;try{sheet.close()}catch(x){}if(f)setTimeout(f,260)}
  }
  function open(what,fallback){
    if(typeof openSheet!=="function"){if(fallback)fallback();return}
    ctx={what:String(what||"")};orig=fallback||null;last=null;
    const wasOpen=Q(".lc43-sheet");if(wasOpen)return;
    sheet=openSheet({title:"Upgrade to Pro",cls:"lc43-sheet",noFocus:true,html:'<div class="lc43"><p class="small muted">Loading the current rate…</p></div>'});
    if(!sheet||!sheet.el){if(fallback)fallback();return}
    sheet.el.addEventListener("click",onClick);
    sheet.el.addEventListener("submit",e=>{e.preventDefault()});
    const staticP=mem&&mem.p;
    if(staticP)main(staticP);else main(null);                                  /* never wait: show the plain version at once, upgrade it when the live numbers arrive */
    pricing().then(p=>{if(Q(".lc43-sheet")&&Q("[data-lc43-buy]",root())&&p&&!Q("input[name=email]:focus",root())&&!Q("[data-lc43-create]",root())){const v=(Q("input[name=email]",root())||{}).value||"";main(p);const i=Q("input[name=email]",root());if(i&&v)i.value=v}});
  }

  /* ---------- the Pro locks of the app open this pop-up ---------- */
  let pass=false;
  function wrap(){
    const o=window.openUnlock;
    if(typeof o==="function"&&!o.__lc43){
      const f=function(lock,what){
        if(pass||paid()||lock==="community"||lock==="mentor")return o.apply(this,arguments);
        const a=arguments,self=this;open(what,()=>{pass=true;try{o.apply(self,a)}finally{pass=false}});
      };
      f.__lc43=true;window.openUnlock=f;
    }
    const g=window.openLevelGate;
    if(typeof g==="function"&&!g.__lc43){
      const f2=function(item){
        let vip=false;try{vip=Levels.required(item)>=3}catch(e){}
        if(pass||paid()||vip||!item)return g.apply(this,arguments);
        const a=arguments,self=this;open((item&&(item.title||item.topic))||"",()=>{pass=true;try{g.apply(self,a)}finally{pass=false}});
      };
      f2.__lc43=true;window.openLevelGate=f2;
    }
  }
  function css(){
    if(Q("#lc43-css"))return;const s=document.createElement("style");s.id="lc43-css";
    s.textContent='.lc43{display:grid;gap:10px}.lc43 .btn{min-height:44px}.lc43-what{margin:0}.lc43-h{margin:0;font-size:1.25rem}'
    +'.lc43-band{padding:12px 14px;border:1px solid rgba(251,191,36,.45);border-radius:14px;background:linear-gradient(90deg,rgba(251,191,36,.12),rgba(56,189,248,.06))}'
    +'.lc43-tag{font-weight:800;letter-spacing:.08em;font-size:.74rem;text-transform:uppercase;color:#fbbf24}.lc43-pct{margin-left:8px;font-weight:700;font-size:.74rem;padding:2px 10px;border:1px solid rgba(251,191,36,.55);border-radius:999px;color:#fde68a}'
    +'.lc43-prices{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-top:6px}.lc43-prices s{opacity:.65;font-weight:700;text-decoration-thickness:.1em}.lc43-prices b{font-size:2rem;line-height:1;font-weight:900}.lc43-prices span{opacity:.75;font-weight:600}'
    +'.lc43-bar{height:8px;border-radius:99px;background:#0f172a;overflow:hidden;margin:10px 0 4px}.lc43-bar i{display:block;height:100%;background:#fbbf24}.lc43-left{margin:4px 0 0;font-size:.9rem}.lc43-left b{color:#fbbf24}'
    +'.lc43-list{margin:0;padding-left:1.1rem;display:grid;gap:4px}.lc43-em{display:grid;gap:4px}.lc43-em .input{min-height:44px}.lc43-more{opacity:.95}'
    +'.lc43-msg{min-height:1.2em;margin:0}.lc43-msg small{opacity:.85}.lc43-owner{color:#fca5a5}.lc43-sheet .btn-gold{background:#fbbf24;color:#0f172a;border-color:#fbbf24}';
    document.head.appendChild(s);
  }
  function init(){try{css();wrap()}catch(e){console.error("lc43",e)}}
  return{init:init,open:open,_t:{api:api,pricing:pricing,exists:exists,diagnose:diagnose,band:band,fnBase:fnBase}};
})();
