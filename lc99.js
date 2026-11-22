/*@@module lc99*/
const LC99=(()=>{
  "use strict";
  /* LC99 (build 9.64.0): the withdrawal waiver and "your €25 counts toward the year".
     1. A member who paid the one-time Pro month (LC97's post-trial offer) may switch to the yearly plan during that month and 7 days after
        it, with what they paid for the month taken off the first year. The Upgrades page shows a card while the server says it is open
        (lc99_state); the card opens one sheet with the plain terms (today's price, the renewal price, how to cancel, the year starts today)
        and an UNCHECKED box "Pro starts right away, I give up my 14-day right of withdrawal". The pay button stays off until it is ticked;
        the stripe function's route "annual25" refuses a checkout without the consent, takes the credit from the database (never the
        browser), and the webhook marks the credit used (once per account).
     2. Owner menu > Withdrawal waivers (#consents): the stored waivers (lc99_admin_consents), newest first, with the exact wording, the
        flow, the Stripe session and where it was written (server = by the stripe function with the session, app = before a Payment Link).
     SQL: sql/20261122100000_lc99_withdrawal_consent_annual25.sql. The trial (LC73 / LC90) and the one-time month (LC97) send the same
     consent fields (consent: true, consent_v, consent_text). */
  const VERSION="9.64.0",CONSENT_V="w1-2026-11-22",SQLF="sql/20261122100000_lc99_withdrawal_consent_annual25.sql";
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
  function wording(n){return"I want the yearly plan to start right away. I pay "+eur(n.today)+" today for my first year, then "+eur(n.yearly)+" each year until I cancel. Because Pro starts at once, I give up my 14-day right of withdrawal, so a payment that has gone through is not refunded."}
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
    view.innerHTML='<section class="lc99-log"><p class="lc99-kick">Owner · evidence</p><h1>Withdrawal waivers</h1><p class="muted">Every time a member ticked “Pro starts right away, I give up my 14-day right of withdrawal” before a payment: the exact words they saw, the flow and the Stripe session. Server rows are written by the payment function with the session; app rows are written right before a Payment Link.</p>'
      +'<div class="lc99-row"><input class="input" type="email" data-lc99-em placeholder="e-mail (empty = everyone)"><button type="button" class="btn btn-primary" data-lc99s="look">Show</button></div><div data-lc99-out><p class="small muted">Loading…</p></div></section>';
    look(view,"");return null;
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

  function ownerRows(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc99-own]",m)||!owner())return;
    const ref=Q("[data-lc97-own]",m)||Q("[data-lc90-own]",m);if(!ref)return;
    const b=document.createElement("a");b.href="#consents";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc99-own","");
    b.innerHTML="<span><b>Withdrawal waivers</b><small>Who ticked the 14-day waiver before paying, with the exact words</small></span>";
    b.addEventListener("click",()=>{try{const mm=Q("#lc49-menu");if(mm)mm.remove()}catch(x){}});
    ref.insertAdjacentElement("afterend",b);
  }
  function onClick(e){
    if(e.target.closest&&e.target.closest("[data-lc99-open]")){e.preventDefault();open();return}
    const b=e.target.closest&&e.target.closest("[data-lc99s]");if(!b||!owner())return;e.preventDefault();
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
      +".lc99-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}.lc99-list li{padding:10px 12px;border-radius:12px;background:#1e293b;border:1px solid #334155;display:grid;gap:4px;overflow-wrap:anywhere}.lc99-list small{color:#94a3b8}.lc99-list code{color:#38bdf8}";
    document.head.appendChild(s);
  }
  let deb=0;
  function afterRender(r){clearTimeout(deb);deb=setTimeout(()=>{ownerRows();if(route()==="upgrades")paint()},3000)}
  function init(){
    try{
      css();
      if(typeof MOUNT!=="undefined"){MOUNT.consents=mountLog;try{DOC_TITLES.consents="Withdrawal waivers";ROUTE_TITLES.consents="the waivers"}catch(e){}}
      try{const lv=LC26.levels,o=lv.minLevel;if(lv&&!lv.__lc99){lv.__lc99=1;lv.minLevel=r=>r==="consents"?1:o(r)}}catch(e){}
      document.addEventListener("click",onClick);
      let d2=0;new MutationObserver(()=>{clearTimeout(d2);d2=setTimeout(ownerRows,250)}).observe(document.body,{childList:true,subtree:true});
    }catch(e){console.error("lc99",e)}
  }
  return{init:init,afterRender:afterRender,version:VERSION,open:open,preview:()=>open({preview:true}),state:state,paint:paint,
    _t:{numbers:numbers,wording:wording,terms:terms,sheetHTML:sheetHTML,WHY:WHY,CONSENT_V:CONSENT_V,reset(){MEM=null;memAt=0}}};
})(); /*@@end lc99*/
