/*@@module lc90*/
const LC90=(()=>{
  "use strict";
  /* LC90 (build 9.52.0): the Day-7 Founding Member pop-up and its editor.
     1. The moment. A new free player gets 3 tokens a day for the first 7 days (LC34's habit week; the Arena server enforces it). When that week
        is over (the server says so, or the device's own count when offline), or on its last day once the tokens are used up, ONE pop-up opens
        on a calm screen (home, Trim, upgrades, account, quests; never over another sheet). Once per account (lc89_paywall_seen, any device)
        and once per device. Never for paying members, never by itself for the owner (the owner uses Preview).
     2. The offer. The intro week ends and the account drops back to 1 token a day; the Founding Member rate (50% off the yearly plan, EUR 199.50
        instead of 399, about EUR 16.63 a month, for as long as the subscription stays active) or the monthly plan (EUR 39), with a EUR 0
        Founding Trial: the card is saved at Stripe and the chosen plan starts by itself after the trial. The prices are the LIVE ones from the
        Stripe function by default (so the pop-up never shows a rate that is sold out); the trial length and the optional Stripe Price IDs are
        read by the Stripe function on the server, never from this page.
     3. The editor (#paywall-editor, owner menu > Paywall & Founding Offer Editor): title, subtitle, body, badge, buttons, fine print, prices,
        discount, trial length, Stripe Price IDs, the feature list (add, edit, tick on/off, reorder, delete), Preview Pop-up, Save & Publish,
        earlier versions, and the counters (shown, trial, yearly, monthly, not now). Saved in lc89_cfg 'paywall' (admin-only writes, RLS).
     SQL: sql/20261116100000_lc89_lc90_inline_cms_founding_paywall.sql (the owner runs it). Without it the pop-up runs on the defaults below.
     9.53.0, layered access: two paid paths in the pop-up, Pro (Founding Member: monthly or the yearly launch rate, with the EUR 0 trial) and VIP
     (everything in Pro plus the VIP extras; no trial, because the bonus tokens arrive at once), each with its own owner-editable texts, prices
     and feature list. The access rules live here too (window.__lcAccess, read by Levels.open): Level 1 is always open; Level 2 (Beginner) is
     open to a free player during the intro week (owner switch "beginner_in_week"); Levels 3 to 5 (Intermediate, Advanced, Master) stay locked
     for anyone without Pro or VIP, and with "strict_lock" on they cannot be unlocked one by one with credits either. SQL for the VIP counter:
     sql/20261116150000_lc91_layered_access.sql. */
  const VERSION="9.53.0",DAY=864e5,SEEN="lc90-seen",CACHE="lc90-cfg";
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
  async function rpc(fn,args,anon){
    try{const h={},t=await tok();if(!anon&&!t)return{status:401,data:null};if(t)h.Authorization="Bearer "+t;
      return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:h,body:JSON.stringify(args||{})})}catch(e){return{status:0,data:null}}
  }
  const missing=r=>!!(r&&(r.status===404||(r.data&&/PGRST202|does not exist|42883|42P01/i.test(String(r.data.code||"")+String(r.data.message||"")))));
  const NOSQL="The pop-up editor is not switched on yet. Run sql/20261116100000_lc89_lc90_inline_cms_founding_paywall.sql in the Supabase SQL editor, then reload.";
  const dev=()=>{let d="";try{d=String(deviceId())}catch(e){d=""}return d.replace(/[^A-Za-z0-9_-]/g,"").slice(0,64)||"device"};

  /* ---------- the offer: defaults, cleaning (pure) ---------- */
  const DEF={on:true,
    eyebrow:"{rate_name} offer",title:"Your intro week is over",
    subtitle:"From today your account goes back to 1 token a day.",
    body:"For 7 days you trained with 3 tokens a day. Keep that pace: lock in the {rate_name} rate while it is open. {pct}% off the yearly plan, and your rate stays the same for as long as your subscription stays active.",
    badge:"First 100 members only · {left} places left",
    use_live:true,price_yearly:"€199.50",price_yearly_old:"€399",price_month_equiv:"€16.63",price_monthly:"€39",discount_pct:50,trial_days:7,
    stripe_price_yearly:"",stripe_price_monthly:"",
    pro_name:"Pro · {rate_name}",pro_tag:"Everything unlocked, every day",
    features:[{t:"10 tokens a day instead of 1 (more than the 3 of your intro week)",on:true},{t:"Every level unlocked: the Intermediate, Advanced and Master openings and courses",on:true},
      {t:"The 24/7 AI coach and the full Trim report on your own games",on:true},{t:"The {rate_name} badge on your profile",on:true}],
    vip_on:true,vip_name:"VIP",vip_tag:"For the real fans",vip_lead:"Everything in Pro, plus:",
    vip_features:[{t:"500 bonus tokens every month, or 7,000 at once on the yearly plan",on:true},{t:"The Test Panel: first access to new paid courses and features",on:true},
      {t:"The “Lanckriet Chess Student” title and a blue profile border",on:true},{t:"Priority in the community and in live streams",on:true}],
    vip_price_yearly:"€299.50",vip_price_yearly_old:"€599",vip_price_month_equiv:"€24.96",vip_price_monthly:"€59",
    cta_vip:"Become VIP",vip_note:"VIP starts right away (no trial: the bonus tokens arrive at once).",
    beginner_in_week:true,strict_lock:true,
    cta_trial:"Start my {days}-day €0 Founding Trial",cta_buy:"Skip the trial: pay now",cta_later:"Not now, continue with 1 token a day",
    consent:"I want Pro to start right away. €0 today, then the plan I picked from day {days_after} until I cancel. Because Pro starts at once, I give up my 14-day right of withdrawal for the paid period, so a payment that has gone through is not refunded.",
    fine:"Your card is kept by Stripe (we never see it). Cancel any time before the trial ends in Account > Manage subscription and nothing is charged. The yearly launch rate stays the same for as long as your subscription stays active."};
  const TEXT=["eyebrow","title","subtitle","body","badge","price_yearly","price_yearly_old","price_month_equiv","price_monthly","cta_trial","cta_buy","cta_later","consent","fine",
    "pro_name","pro_tag","vip_name","vip_tag","vip_lead","vip_price_yearly","vip_price_yearly_old","vip_price_month_equiv","vip_price_monthly","cta_vip","vip_note"];
  const LIM={eyebrow:60,title:90,subtitle:160,body:700,badge:90,price_yearly:20,price_yearly_old:20,price_month_equiv:20,price_monthly:20,cta_trial:70,cta_buy:60,cta_later:70,consent:500,fine:500,
    pro_name:50,pro_tag:80,vip_name:50,vip_tag:80,vip_lead:80,vip_price_yearly:20,vip_price_yearly_old:20,vip_price_month_equiv:20,vip_price_monthly:20,cta_vip:60,vip_note:200};
  const LISTS=["features","vip_features"];
  const BANNED=/\b(lifetime|for life|forever)\b/i;   /* the launch rate holds while the subscription stays active, never "for life" (the server refuses it too) */
  function clean(c){
    c=c&&typeof c==="object"?c:{};const o={};
    o.on=c.on!==false;o.use_live=c.use_live!==false;o.vip_on=c.vip_on!==false;o.beginner_in_week=c.beginner_in_week!==false;o.strict_lock=c.strict_lock!==false;
    TEXT.forEach(k=>{const v=typeof c[k]==="string"?c[k].replace(/[<>]/g,"").trim().slice(0,LIM[k]):"";o[k]=v||DEF[k]});
    const pct=Math.round(+c.discount_pct);o.discount_pct=pct>=0&&pct<=90?pct:DEF.discount_pct;
    const d=c.trial_days;o.trial_days=Number.isInteger(d)&&d>=0&&d<=30?d:DEF.trial_days;
    ["stripe_price_yearly","stripe_price_monthly"].forEach(k=>{o[k]=/^price_[A-Za-z0-9]{6,80}$/.test(String(c[k]||""))?String(c[k]):""});
    LISTS.forEach(k=>{const f=Array.isArray(c[k])?c[k]:DEF[k];
      o[k]=f.filter(x=>x&&typeof x.t==="string"&&x.t.trim()).slice(0,12).map(x=>({t:x.t.replace(/[<>]/g,"").trim().slice(0,140),on:x.on!==false}))});
    return o;
  }
  function wording(c){return TEXT.some(k=>BANNED.test(c[k]||""))||LISTS.some(k=>(c[k]||[]).some(x=>BANNED.test(x.t)))}
  const eur=c=>{c=+c||0;return"€"+(c%100===0?String(c/100):(c/100).toFixed(2))};
  /* the numbers shown: the live launch ladder from the Stripe function (default) or the owner's typed prices */
  function numbers(c,p){
    const n={days:c.trial_days,days_after:c.trial_days+1,yearly:c.price_yearly,yearly_old:c.price_yearly_old,month_equiv:c.price_month_equiv,monthly:c.price_monthly,pct:c.discount_pct,left:"",rate_name:"Founding Member",tranche:1,live:false,
      vip_yearly:c.vip_price_yearly,vip_yearly_old:c.vip_price_yearly_old,vip_month_equiv:c.vip_price_month_equiv,vip_monthly:c.vip_price_monthly,vip_pct:c.discount_pct,vip_tranche:1};
    if(c.use_live&&p&&p.ok&&Array.isArray(p.yearly)){
      const t=p.tranche||4,y=+p.yearly[t-1]||+p.base;
      Object.assign(n,{yearly:eur(y),yearly_old:eur(p.base),month_equiv:eur(Math.round(y/12)),monthly:eur(p.monthly),pct:Array.isArray(p.discountPct)&&t<4?(+p.discountPct[t-1]||0):0,
        left:Array.isArray(p.left)&&t<4?String(p.left[t-1]):"",rate_name:{1:"Founding Member",2:"Early Adopter",3:"Launch",4:"Pro"}[t]||"Pro",tranche:t,live:true});
    }
    const v=p&&p.vip;   /* the VIP ladder, from the same pricing answer */
    if(c.use_live&&v&&v.ok&&Array.isArray(v.yearly)){
      const t=v.tranche||4,y=+v.yearly[t-1]||+v.base;
      Object.assign(n,{vip_yearly:eur(y),vip_yearly_old:eur(v.base),vip_month_equiv:eur(Math.round(y/12)),vip_monthly:eur(v.monthly),vip_pct:Array.isArray(v.discountPct)&&t<4?(+v.discountPct[t-1]||0):0,vip_tranche:t});
    }
    return n;
  }
  const fill=(s,n)=>String(s||"").replace(/\{(days|days_after|yearly|yearly_old|month_equiv|monthly|pct|left|rate_name|vip_yearly|vip_yearly_old|vip_month_equiv|vip_monthly|vip_pct)\}/g,(m,k)=>String(n[k]==null?"":n[k]));

  /* ---------- config: live from Supabase, cached on the device ---------- */
  let CFG=null,cfgAt=0;
  async function cfg(force){
    if(CFG&&!force&&Date.now()-cfgAt<10*60e3)return CFG;
    const r=await rpc("lc89_cfg_public",{p_k:"paywall"},true);
    if(r&&r.status===200&&r.data&&r.data.ok&&r.data.v&&Object.keys(r.data.v).length){CFG=clean(r.data.v);wr(CACHE,CFG)}
    else CFG=clean(rd(CACHE,null)||DEF);
    cfgAt=Date.now();return CFG;
  }
  async function pricing(){try{return await Promise.race([LC34._t.pricing(),new Promise(res=>setTimeout(()=>res(null),2000))])}catch(e){return null}}

  /* ---------- 9.53.0: layered access (read by Levels.open through window.__lcAccess) ---------- */
  function cfgNow(){if(CFG)return CFG;try{return clean(rd(CACHE,null)||DEF)}catch(e){return clean(DEF)}}
  function beginnerOpen(){const c=cfgNow();if(!c.beginner_in_week||paid())return false;const w=week();return !!w&&w.on===true}   /* Level 2 during the intro week */
  function strict(){return cfgNow().strict_lock!==false}                                                                      /* Levels 3 to 5: no unlock one by one */
  window.__lcAccess={beginnerOpen:beginnerOpen,strict:strict};

  /* ---------- the moment (pure where it can be) ---------- */
  function paid(){try{if(String(App.access&&App.access.tier||"free")!=="free")return true}catch(e){}try{return Quota.tier()!=="free"}catch(e){return false}}
  function week(){try{return LC34.tokens.info()}catch(e){return{on:true,left:7}}}
  function left(){try{return Quota.leftNow()}catch(e){return 1}}
  function bonus(){try{return +Quota.bonusNow()||0}catch(e){return 0}}
  function age(){let f=0;try{f=+LC34.tokens.first()||0}catch(e){f=0}return f?(Date.now()-f)/DAY:0}   /* days since this device first opened the app */
  /* due: the intro week is over, or it is its last day and today's tokens (and bonus tokens) are used up. The device must also be at least
     6 (last day) / 7 days old, so a server that does not run the intro week yet (week1 always false) never shows it to a brand-new player. */
  function due(w,l,b,a){return !!w&&((w.on===false&&+a>=7)||(w.on===true&&+w.left<=1&&+l<=0&&+b<=0&&+a>=6))}
  const CALM=/^(|home|dashboard|trim|upgrades|account|quests|system|games)$/;
  let busy=false,checkT=0;
  async function check(why){
    if(busy||rd(SEEN,0)||typeof window.__lcIab!=="undefined"&&window.__lcIab)return;
    if(owner()||paid()||!CALM.test(route())||Q(".sheet-wrap")||Q(".lc30-ask"))return;
    if(!due(week(),left(),bonus(),age()))return;
    busy=true;
    try{
      const c=await cfg();if(!c.on)return;
      if(sess()){const s=await rpc("lc89_paywall_seen",{});if(s&&s.data&&s.data.ok&&s.data.seen){wr(SEEN,Date.now());return}}
      if(Q(".sheet-wrap")||paid())return;
      wr(SEEN,Date.now());open({src:why||"day7"});
    }finally{busy=false}
  }
  function log(kind){rpc("lc89_paywall_log",{p_kind:kind,p_device:dev()},true).catch(()=>{});try{Telemetry.log({e:"lc90",x:kind})}catch(e){}}

  /* ---------- the pop-up ---------- */
  function plans(name,y,yo,me,mo,pct,tr){
    return'<div class="lc90-plans" role="radiogroup" aria-label="Choose how to pay">'
      +'<label class="lc90-plan is-on"><input type="radio" name="'+name+'" value="yearly" checked><span class="lc90-pl"><b>Yearly'+(tr<4&&pct>0?' <em>'+E(pct)+"% off</em>":"")+'</b><span class="lc90-price">'+(pct>0&&yo&&yo!==y?"<s>"+E(yo)+"</s> ":"")+"<strong>"+E(y)+'</strong> a year</span><small>About '+E(me)+" a month</small></span></label>"
      +'<label class="lc90-plan"><input type="radio" name="'+name+'" value="monthly"><span class="lc90-pl"><b>Monthly</b><span class="lc90-price"><strong>'+E(mo)+"</strong> a month</span><small>No launch discount</small></span></label></div>";
  }
  const featList=(l,n)=>(l||[]).filter(x=>x.on).length?'<ul class="lc90-feats">'+(l||[]).filter(x=>x.on).map(x=>"<li>"+ic("check")+" <span>"+E(fill(x.t,n))+"</span></li>").join("")+"</ul>":"";
  function html(c,n,preview){
    const trial=c.trial_days>0,vip=c.vip_on;
    return'<div class="lc90">'+(preview?'<p class="lc90-pv">'+ic("eye")+" Preview: this is what a student sees. Buttons do not open checkout.</p>":"")
      +'<p class="lc90-eye">'+E(fill(c.eyebrow,n))+"</p>"+'<p class="lc90-sub">'+E(fill(c.subtitle,n))+"</p>"+'<p class="lc90-body">'+E(fill(c.body,n))+"</p>"
      +(n.tranche<4&&n.pct>0?'<p class="lc90-badge">'+E(fill(c.badge,n).replace(/\s*·\s*$/,"").replace(/·\s*places left$/,""))+"</p>":"")
      +(vip?'<div class="lc90-tiers" role="radiogroup" aria-label="Choose Pro or VIP">'
        +'<label class="lc90-tier is-on"><input type="radio" name="lc90-tier" value="pro" checked><span><b>'+E(fill(c.pro_name,n))+"</b><small>"+E(fill(c.pro_tag,n))+"</small><em>"+E(n.yearly)+" a year · "+E(n.monthly)+" a month</em></span></label>"
        +'<label class="lc90-tier"><input type="radio" name="lc90-tier" value="vip"><span><b>'+ic("gem")+" "+E(fill(c.vip_name,n))+"</b><small>"+E(fill(c.vip_tag,n))+"</small><em>"+E(n.vip_yearly)+" a year · "+E(n.vip_monthly)+" a month</em></span></label></div>":"")
      +'<div class="lc90-box" data-tierbox="pro">'+plans("lc90-plan",n.yearly,n.yearly_old,n.month_equiv,n.monthly,n.pct,n.tranche)+featList(c.features,n)
      +(trial?'<label class="lc90-ok"><input type="checkbox" data-lc90-ok> <span>'+E(fill(c.consent,n))+"</span></label>":"")
      +'<div class="btn-row lc90-btns"><button type="button" class="btn btn-gold" data-lc90="go"'+(trial?" disabled":"")+">"+ic("lock-open")+" "+E(trial?fill(c.cta_trial,n):"Lock in my rate")+"</button>"
      +(trial?'<button type="button" class="btn btn-ghost" data-lc90="buy">'+E(fill(c.cta_buy,n))+"</button>":"")+"</div></div>"
      +(vip?'<div class="lc90-box" data-tierbox="vip" hidden>'+plans("lc90-vplan",n.vip_yearly,n.vip_yearly_old,n.vip_month_equiv,n.vip_monthly,n.vip_pct,n.vip_tranche)
        +'<p class="lc90-lead">'+E(fill(c.vip_lead,n))+"</p>"+featList(c.vip_features,n)+'<p class="small muted lc90-fine">'+E(fill(c.vip_note,n))+"</p>"
        +'<div class="btn-row lc90-btns"><button type="button" class="btn btn-gold" data-lc90="vip">'+ic("gem")+" "+E(fill(c.cta_vip,n))+"</button></div></div>":"")
      +'<p class="form-msg" data-lc90-msg aria-live="polite"></p><p class="small muted lc90-fine">'+E(fill(c.fine,n))+'</p><div class="btn-row"><button type="button" class="btn btn-quiet" data-lc90="later">'+E(fill(c.cta_later,n))+"</button></div></div>";
  }
  const WHY={sign_in:"Sign in first: the trial is tied to your account, so Pro switches on by itself on every device.",trial_used:"You already used your free trial. You can still lock in the rate without one.",
    already_member:"You already have Pro.",no_trial:"The trial is switched off right now. You can still lock in the rate.",network:"No connection. Nothing was charged.",slow_down:"Too many tries. Wait a minute.",not_configured:"Checkout is not set up on this build."};
  async function stripeCall(path,body){
    const c=cfgSB();if(!c.url)return{ok:false,reason:"not_configured"};
    try{const r=await fetch(c.url+"/functions/v1/stripe/"+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body||{})});const j=await r.json().catch(()=>({}));j.status=r.status;return j}catch(e){return{ok:false,reason:"network",status:0}}
  }
  const go=u=>{try{LC36.support.go(u)}catch(e){location.href=u}};
  function checkout(plan,tier){
    tier=tier===3?3:2;
    try{if(typeof LC44!=="undefined"&&LC44.checkout)return LC44.checkout(plan,tier)}catch(e){}
    try{return LC36.support.checkout(plan,tier)}catch(e){say("Checkout could not start. Nothing was charged. Try again.","bad");return false}
  }
  async function open(o){
    o=o||{};const preview=!!o.preview,c=o.cfg?clean(o.cfg):await cfg(),p=await pricing(),n=numbers(c,p);
    if(!preview)log("shown");
    let picked=false;
    return openSheet({title:fill(c.title,n),cls:"lc90-sheet",noFocus:true,html:html(c,n,preview),onClose(){if(!preview&&!picked)log("closed")},onMount(s){
      const el=s.el,msg=t=>{const m=Q("[data-lc90-msg]",el);if(m)m.textContent=t||""},plan=nm=>{const r=Q('input[name="'+(nm||"lc90-plan")+'"]:checked',el);return r&&r.value==="monthly"?"monthly":"yearly"};
      const ok=Q("[data-lc90-ok]",el),goBtn=Q('[data-lc90="go"]',el);
      if(ok)ok.addEventListener("change",()=>{goBtn.disabled=!ok.checked});
      el.addEventListener("change",e=>{const nm=e.target&&e.target.name;
        if(nm==="lc90-plan"||nm==="lc90-vplan")QA('input[name="'+nm+'"]',el).forEach(i=>i.closest(".lc90-plan").classList.toggle("is-on",i.checked));
        if(nm==="lc90-tier"){const t=e.target.value;QA(".lc90-tier",el).forEach(l=>l.classList.toggle("is-on",!!Q("input:checked",l)));QA("[data-tierbox]",el).forEach(b=>{b.hidden=b.getAttribute("data-tierbox")!==t});msg("")}});
      el.addEventListener("click",async e=>{
        const b=e.target.closest&&e.target.closest("[data-lc90]");if(!b)return;const a=b.getAttribute("data-lc90");e.preventDefault();
        if(a==="later"){if(!preview){picked=true;log("later")}s.close();return}
        if(preview){msg("Preview: in the real pop-up this "+(a==="vip"?"opens the VIP checkout":a==="go"&&c.trial_days>0?"opens the "+c.trial_days+"-day trial checkout":"opens Stripe checkout")+" for the "+(a==="vip"?plan("lc90-vplan"):plan())+" plan.");return}
        if(a==="vip"){picked=true;log("vip");s.close();checkout(plan("lc90-vplan"),3);return}
        const pl=plan();picked=true;log(a==="go"&&c.trial_days>0?"trial":pl);
        if(a==="buy"||c.trial_days===0){s.close();checkout(pl);return}
        if(!sess()){msg(WHY.sign_in);b.insertAdjacentHTML("afterend",'<a class="btn btn-primary" href="#account" data-close>Sign in</a>');return}
        b.disabled=true;msg("Opening secure checkout…");
        const j=await stripeCall("trial",{token:await tok(),device:dev(),plan:pl,src:"day7"});
        if(j.ok&&/^https:\/\/[a-z0-9.-]+\.stripe\.com\//i.test(j.url||"")){go(j.url);return}
        b.disabled=false;msg((WHY[j.reason]||"Checkout could not start. Nothing was charged. Try again."));
        if(j.reason==="trial_used"||j.reason==="no_trial"){const bb=Q('[data-lc90="buy"]',el);if(bb)bb.focus()}
      });
    }});
  }

  /* ---------- the editor (#paywall-editor) ---------- */
  let ED=null,EDSTATE="";
  async function mount(view){
    if(!owner()){view.innerHTML='<section class="panel pad"><h1>Paywall &amp; Founding Offer Editor</h1><p class="muted">This page is for the owner.</p></section>';return null}
    view.innerHTML='<section class="lc90-ed"><p class="lc90-tag">Owner</p><h1>Paywall &amp; Founding Offer Editor</h1><p class="muted">The pop-up a free player sees once, when the 3-tokens-a-day intro week ends. Everything here is live for every student the moment you press Save &amp; Publish.</p><div data-lc90-ed><p class="muted">Loading…</p></div></section>';
    const r=await rpc("lc89_cfg_public",{p_k:"paywall"},true);
    if(missing(r)){EDSTATE="nosql";ED=clean(DEF)}else{EDSTATE=r&&r.status===200?"ok":"error";ED=clean(r&&r.data&&r.data.v&&Object.keys(r.data.v).length?r.data.v:DEF)}
    paintEd(view);stats(view);livePrices(view);return null;
  }
  function field(k,label,area,hint){const v=ED[k],ml=LIM[k]||200;
    return'<label class="field"><span class="field-label">'+label+(hint?' <small class="muted">'+hint+"</small>":"")+"</span>"+(area?'<textarea class="input" rows="3" data-k="'+k+'" maxlength="'+ml+'">'+E(v)+"</textarea>":'<input class="input" data-k="'+k+'" maxlength="'+ml+'" value="'+E(v)+'">')+"</label>"}
  function paintEd(view){
    const host=Q("[data-lc90-ed]",view);if(!host)return;
    host.innerHTML=(EDSTATE==="nosql"?'<div class="panel pad lc90-warn">'+E(NOSQL)+"</div>":"")
      +'<div class="panel pad stack"><label class="lc90-sw"><input type="checkbox" data-k="on"'+(ED.on?" checked":"")+"><span><b>Pop-up on</b><small>Off = nobody sees it. The 1-token drop after day 7 happens either way.</small></span></label>"
      +'<div class="lc90-stats" data-lc90-stats><p class="small muted">Counters loading…</p></div></div>'
      +'<div class="panel pad stack"><h2>Texts</h2><p class="small muted">Placeholders: {days} {days_after} {yearly} {yearly_old} {month_equiv} {monthly} {pct} {left} {rate_name}. Never write “lifetime”, “for life” or “forever”: the rate holds for as long as the subscription stays active.</p>'
      +field("eyebrow","Small line on top")+field("title","Title")+field("subtitle","Subtitle")+field("body","Body",true)+field("badge","Badge","shows only while a launch rate is open")
      +field("pro_name","Pro card: name")+field("pro_tag","Pro card: one line")
      +field("cta_trial","Trial button")+field("cta_buy","Pay-now button")+field("cta_later","“Not now” button")+field("consent","Consent checkbox (legal: keep the meaning)",true)+field("fine","Fine print",true)+"</div>"
      +'<div class="panel pad stack"><h2>Prices and trial</h2><label class="lc90-sw"><input type="checkbox" data-k="use_live"'+(ED.use_live?" checked":"")+"><span><b>Use the live prices</b><small>Recommended: the pop-up shows the rate Stripe really charges now (Founding, then Early Adopter, …).</small></span></label>"
      +'<p class="small" data-lc90-live>Live prices loading…</p><div class="lc90-two">'+field("price_yearly","Yearly price shown")+field("price_yearly_old","Old yearly price (struck through)")+field("price_month_equiv","Per month, billed yearly")+field("price_monthly","Monthly price shown")
      +'<label class="field"><span class="field-label">Discount %</span><input class="input" type="number" min="0" max="90" data-k="discount_pct" value="'+E(ED.discount_pct)+'"></label>'
      +'<label class="field"><span class="field-label">Trial length (days) <small class="muted">0 = no trial; the server uses this</small></span><input class="input" type="number" min="0" max="30" data-k="trial_days" value="'+E(ED.trial_days)+'"></label></div>'
      +'<p class="small muted lc90-mis" data-lc90-mis hidden></p>'
      +'<div class="lc90-two"><label class="field"><span class="field-label">Stripe Price ID, yearly Founding rate <small class="muted">optional, price_…</small></span><input class="input" data-k="stripe_price_yearly" value="'+E(ED.stripe_price_yearly)+'" placeholder="price_…" autocomplete="off"></label>'
      +'<label class="field"><span class="field-label">Stripe Price ID, Pro monthly <small class="muted">optional, price_…</small></span><input class="input" data-k="stripe_price_monthly" value="'+E(ED.stripe_price_monthly)+'" placeholder="price_…" autocomplete="off"></label></div>'
      +'<p class="small muted">Empty = the built-in prices (Pro €39 a month, the yearly launch ladder). A Price ID is only used after Stripe confirms it is an active euro price with the right interval; the yearly one only while Founding places are left. The monthly one applies to every Pro monthly checkout.</p></div>'
      +'<div class="panel pad stack"><h2>Pro: features and bonuses</h2><p class="small muted">Ticked lines show in the pop-up, in this order. At most 12.</p><ol class="lc90-fl" data-lc90-fl="features">'+flHTML("features")+'</ol><div class="btn-row"><button type="button" class="btn btn-ghost" data-lc90e="fadd" data-fk="features">'+ic("plus")+" Add a line</button></div></div>"
      +'<div class="panel pad stack"><h2>VIP path</h2><label class="lc90-sw"><input type="checkbox" data-k="vip_on"'+(ED.vip_on?" checked":"")+"><span><b>Show VIP in the pop-up</b><small>A second card next to Pro. VIP has no trial: the bonus tokens arrive at once.</small></span></label>"
      +field("vip_name","VIP card: name")+field("vip_tag","VIP card: one line")+field("vip_lead","Line above the VIP extras")+field("cta_vip","VIP button")+field("vip_note","Note under the VIP extras",true)
      +'<div class="lc90-two">'+field("vip_price_yearly","VIP yearly price shown")+field("vip_price_yearly_old","VIP old yearly price")+field("vip_price_month_equiv","VIP per month, billed yearly")+field("vip_price_monthly","VIP monthly price shown")+"</div>"
      +'<p class="small muted">With “Use the live prices” on, the VIP prices come from Stripe too (VIP has its own launch ladder).</p>'
      +'<h3 class="lc90-h3">VIP extras</h3><ol class="lc90-fl" data-lc90-fl="vip_features">'+flHTML("vip_features")+'</ol><div class="btn-row"><button type="button" class="btn btn-ghost" data-lc90e="fadd" data-fk="vip_features">'+ic("plus")+" Add a line</button></div></div>"
      +'<div class="panel pad stack"><h2>Access to the levels</h2><p class="small muted">Level 1 (Free) is always open. Pro and VIP open every level.</p>'
      +'<label class="lc90-sw"><input type="checkbox" data-k="beginner_in_week"'+(ED.beginner_in_week?" checked":"")+"><span><b>Level 2 (Beginner) open during the intro week</b><small>A free player can train Beginner in the 3-tokens-a-day week; after day 7 it locks again.</small></span></label>"
      +'<label class="lc90-sw"><input type="checkbox" data-k="strict_lock"'+(ED.strict_lock?" checked":"")+"><span><b>Strict lock on Intermediate, Advanced and Master</b><small>Levels 3 to 5 open only with Pro or VIP: no unlocking one level with credits. Levels someone already unlocked stay open.</small></span></label></div>"
      +'<div class="panel pad stack lc90-actions"><p class="form-msg" data-lc90-emsg aria-live="polite"></p><div class="btn-row"><button type="button" class="btn btn-ghost" data-lc90e="preview">'+ic("eye")+' Preview Pop-up</button><button type="button" class="btn btn-gold" data-lc90e="save">'+ic("cloud-arrow-up")+' Save &amp; Publish</button></div>'
      +'<div class="btn-row"><button type="button" class="btn btn-quiet" data-lc90e="history">Earlier versions</button><button type="button" class="btn btn-quiet" data-lc90e="defaults">Back to the default texts</button></div></div>';
    mismatch(view);
  }
  function flHTML(key){const at='data-fk="'+key+'"';return(ED[key]||[]).map((x,i)=>'<li class="lc90-fi"><input type="checkbox" class="lc90-fo" '+at+' data-i="'+i+'"'+(x.on?" checked":"")+' aria-label="Show this line"><input class="input lc90-ft" '+at+' data-i="'+i+'" maxlength="140" value="'+E(x.t)+'" aria-label="Line '+(i+1)+'">'
    +'<span class="lc90-fb"><button type="button" class="btn btn-quiet btn-sm" data-lc90e="fup" '+at+' data-i="'+i+'" aria-label="Move up">↑</button><button type="button" class="btn btn-quiet btn-sm" data-lc90e="fdown" '+at+' data-i="'+i+'" aria-label="Move down">↓</button><button type="button" class="btn btn-quiet btn-sm" data-lc90e="fdel" '+at+' data-i="'+i+'" aria-label="Delete">✕</button></span></li>').join("")}
  function readEd(view){
    const o=Object.assign({},ED);
    QA("[data-k]",view).forEach(x=>{const k=x.getAttribute("data-k");if(x.type==="checkbox")o[k]=x.checked;else if(x.type==="number")o[k]=x.value===""?NaN:Math.round(+x.value);else o[k]=x.value});
    LISTS.forEach(key=>{o[key]=QA('.lc90-ft[data-fk="'+key+'"]',view).map(x=>({t:x.value,on:!!(Q('.lc90-fo[data-fk="'+key+'"][data-i="'+x.getAttribute("data-i")+'"]',view)||{}).checked}))});
    return o;
  }
  let liveP=null;
  async function livePrices(view){
    liveP=await pricing();const el=Q("[data-lc90-live]",view);if(!el)return;
    if(!(liveP&&liveP.ok)){el.textContent="The live prices could not load right now.";return}
    const n=numbers(Object.assign({},ED,{use_live:true}),liveP);
    el.innerHTML="Live now: Pro <b>"+E(n.yearly)+"</b> a year ("+E(n.rate_name)+(n.left?", "+E(n.left)+" places left":"")+"), <b>"+E(n.monthly)+"</b> a month · VIP <b>"+E(n.vip_yearly)+"</b> a year, <b>"+E(n.vip_monthly)+"</b> a month.";mismatch(view);
  }
  function mismatch(view){
    const el=Q("[data-lc90-mis]",view);if(!el||!liveP||!liveP.ok)return;const o=readEd(view);
    if(o.use_live){el.hidden=true;return}
    const n=numbers(Object.assign({},o,{use_live:true}),liveP),off=[];
    if(String(o.price_yearly).replace(/\s/g,"")!==n.yearly)off.push("yearly "+o.price_yearly+" (Stripe charges "+n.yearly+")");
    if(String(o.price_monthly).replace(/\s/g,"")!==n.monthly)off.push("monthly "+o.price_monthly+" (Stripe charges "+n.monthly+")");
    if(o.vip_on&&String(o.vip_price_yearly).replace(/\s/g,"")!==n.vip_yearly)off.push("VIP yearly "+o.vip_price_yearly+" (Stripe charges "+n.vip_yearly+")");
    if(o.vip_on&&String(o.vip_price_monthly).replace(/\s/g,"")!==n.vip_monthly)off.push("VIP monthly "+o.vip_price_monthly+" (Stripe charges "+n.vip_monthly+")");
    el.hidden=!off.length;el.textContent=off.length?"⚠ The shown price differs from what checkout charges: "+off.join("; ")+". Fix the text, set a matching Stripe Price ID, or tick “Use the live prices”.":"";
  }
  async function stats(view){
    const el=Q("[data-lc90-stats]",view);if(!el)return;const r=await rpc("lc89_paywall_stats",{p_days:30});
    if(!(r&&r.data&&r.data.ok)){el.innerHTML='<p class="small muted">'+(missing(r)?"Counters appear after the SQL is run.":"Counters could not load.")+"</p>";return}
    const c=r.data.counts||{},n=k=>+c[k]||0,sh=n("shown"),pct=k=>sh?Math.round(n(k)/sh*100)+"%":"–";
    el.innerHTML='<div class="lc90-grid">'+[["shown","Shown"],["trial","Trial tapped"],["yearly","Pro yearly tapped"],["monthly","Pro monthly tapped"],["vip","VIP tapped"],["later","Not now"]].map(x=>"<div><b>"+n(x[0])+"</b><span>"+x[1]+(x[0]==="shown"?"":" · "+pct(x[0]))+"</span></div>").join("")+'</div><p class="small muted">Last 30 days, one count per device per day. A tap opens checkout; paid members are counted in the Funnel dashboard.</p>';
  }
  async function saveEd(view){
    const msg=t=>{const m=Q("[data-lc90-emsg]",view);if(m)m.textContent=t||""},o=readEd(view);
    if(!Number.isInteger(o.trial_days)||o.trial_days<0||o.trial_days>30){msg("The trial length is a whole number from 0 to 30.");return}
    if(!(o.discount_pct>=0&&o.discount_pct<=90)){msg("The discount is a number from 0 to 90.");return}
    for(const k of ["stripe_price_yearly","stripe_price_monthly"])if(o[k]&&!/^price_[A-Za-z0-9]{6,80}$/.test(o[k].trim())){msg("A Stripe Price ID starts with price_ (copy it from Stripe > Product catalog). Leave it empty for the built-in price.");return}
    const c=clean(Object.assign({},o,{stripe_price_yearly:o.stripe_price_yearly.trim(),stripe_price_monthly:o.stripe_price_monthly.trim()}));
    if(wording(c)){msg("Pick other words: no “lifetime”, “for life” or “forever”. The rate holds for as long as the subscription stays active.");return}
    msg("Publishing…");
    const r=await rpc("lc89_cfg_save",{p_k:"paywall",p_v:c});
    if(missing(r)){msg(NOSQL);return}
    const d=r&&r.data||{};
    if(d.ok){ED=c;CFG=c;cfgAt=Date.now();wr(CACHE,c);msg("Published. Every student who reaches day 7 now sees this.");say("Pop-up published.","good");return}
    msg({trial_days:"The trial length is a whole number from 0 to 30.",price_id:"A Stripe Price ID starts with price_.",features:"At most 12 lines per list.",wording:"Pick other words: no “lifetime”, “for life” or “forever”.",unsafe:"Remove the code-like text.",too_big:"Too much text."}[d.error]||(r&&(r.status===401||r.status===403)?"Only an admin can publish. Sign in with the owner account.":"Could not publish. Nothing changed. Try again."));
  }
  async function historyEd(view){
    const r=await rpc("lc89_cfg_history",{p_k:"paywall"}),rows=r&&r.data&&r.data.ok?r.data.rows:null;
    openSheet({title:"Earlier versions",cls:"lc90-sheet",html:rows&&rows.length?'<ul class="lc90-hist">'+rows.map(x=>"<li><span>"+E(new Date(x.saved_at).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))+'</span><button type="button" class="btn btn-ghost btn-sm" data-restore="'+(+x.id)+'">Restore</button></li>').join("")+"</ul>":'<p class="muted">'+(rows?"No earlier versions yet. Every publish keeps the one before it.":"The history could not load.")+"</p>",onMount(s){
      s.el.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-restore]");if(!b)return;b.disabled=true;const x=await rpc("lc89_cfg_restore",{p_id:+b.getAttribute("data-restore")});
        if(x&&x.data&&x.data.ok){s.close();CFG=null;say("That version is live again.","good");mount(view)}else{b.disabled=false;say("Could not restore that version.","bad")}})}});
  }
  function onClick(e){
    const b=e.target.closest&&e.target.closest("[data-lc90e]");if(!b)return;const view=b.closest(".lc90-ed")?b.closest(".lc90-ed").parentNode:null;if(!view)return;
    const a=b.getAttribute("data-lc90e"),i=+b.getAttribute("data-i");e.preventDefault();
    if(a==="preview"){open({preview:true,cfg:readEd(view)});return}
    if(a==="save"){saveEd(view);return}
    if(a==="history"){historyEd(view);return}
    if(a==="defaults"){ED=clean(Object.assign({},DEF,{on:ED.on,use_live:ED.use_live,vip_on:ED.vip_on,beginner_in_week:ED.beginner_in_week,strict_lock:ED.strict_lock,stripe_price_yearly:ED.stripe_price_yearly,stripe_price_monthly:ED.stripe_price_monthly,trial_days:ED.trial_days}));paintEd(view);stats(view);livePrices(view);say("Default texts loaded. Press Save & Publish to make them live.");return}
    const key=LISTS.indexOf(b.getAttribute("data-fk"))>=0?b.getAttribute("data-fk"):"features";
    ED=readEd(view);const f=ED[key];
    if(a==="fadd"){if(f.length>=12){say("12 lines is the maximum.");return}f.push({t:"",on:true})}
    if(a==="fdel")f.splice(i,1);
    if(a==="fup"&&i>0){const x=f[i-1];f[i-1]=f[i];f[i]=x}
    if(a==="fdown"&&i<f.length-1){const x=f[i+1];f[i+1]=f[i];f[i]=x}
    const fl=Q('[data-lc90-fl="'+key+'"]',view);if(fl)fl.innerHTML=flHTML(key);
    if(a==="fadd"){const n=Q('.lc90-ft[data-fk="'+key+'"][data-i="'+(f.length-1)+'"]',view);if(n)n.focus()}
  }

  /* ---------- wiring ---------- */
  function ownerRows(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc90-own]",m)||!owner())return;
    const ref=Q("[data-lc86-own]",m)||Q("[data-lc85-own]",m)||Q("[data-lc82-own]",m)||Q("[data-lc74-own]",m)||Q("[data-lc73-own]",m);if(!ref)return;
    const b=document.createElement("a");b.href="#paywall-editor";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc90-own","");
    b.innerHTML="<span><b>Paywall &amp; Founding Offer Editor</b><small>The Day-7 pop-up (Pro and VIP), level access, preview</small></span>";
    b.addEventListener("click",()=>{try{const mm=Q("#lc49-menu");if(mm)mm.remove()}catch(x){}});
    ref.insertAdjacentElement("beforebegin",b);
  }
  function css(){
    if(Q("#lc90-css"))return;const s=document.createElement("style");s.id="lc90-css";
    s.textContent=".lc90{display:grid;gap:10px}.lc90-pv{margin:0;padding:8px 10px;border-radius:10px;background:rgba(56,189,248,.12);color:#38bdf8;font-weight:700;font-size:13px}"
      +".lc90-eye{margin:0;color:#fbbf24;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase}.lc90-sub{margin:0;font-weight:700;font-size:16px}.lc90-body{margin:0;color:#cbd5e1}"
      +".lc90-badge{margin:0;align-self:start;justify-self:start;padding:4px 12px;border-radius:999px;background:rgba(251,191,36,.16);color:#fbbf24;font-weight:800;font-size:13px}"
      +".lc90-plans{display:grid;grid-template-columns:1fr 1fr;gap:8px}@media (max-width:420px){.lc90-plans{grid-template-columns:1fr}}"
      +".lc90-plan{display:flex;gap:10px;align-items:flex-start;padding:12px;border-radius:14px;border:2px solid #334155;background:#0f172a;cursor:pointer;min-height:44px}.lc90-plan.is-on{border-color:#fbbf24;background:rgba(251,191,36,.06)}"
      +".lc90-plan input{width:20px;height:20px;margin-top:2px;accent-color:#fbbf24}.lc90-pl{display:grid;gap:2px}.lc90-pl em{font-style:normal;color:#4ade80;font-size:12px;margin-left:4px}.lc90-price strong{font-size:20px}.lc90-price s{color:#94a3b8}.lc90-pl small{color:#94a3b8}"
      +".lc90-feats{list-style:none;margin:0;padding:0;display:grid;gap:6px}.lc90-feats li{display:flex;gap:8px;align-items:flex-start}.lc90-feats li i,.lc90-feats li svg{color:#4ade80;margin-top:3px}"
      +".lc90-ok{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:#cbd5e1;cursor:pointer}.lc90-ok input{width:22px;height:22px;flex:none;accent-color:#fbbf24}"
      +".lc90-btns .btn,.lc90 .btn{min-height:44px}.lc90-fine{margin:0}"
      +".lc90-ed{max-width:900px;margin:0 auto;display:grid;gap:12px}.lc90-ed h1{margin:0}.lc90-ed h2{margin:0;font-size:18px}.lc90-tag{margin:0;color:#fbbf24;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase}"
      +".lc90-ed .btn{min-height:44px}.lc90-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media (max-width:600px){.lc90-two{grid-template-columns:1fr}}"
      +".lc90-sw{display:flex;gap:10px;align-items:flex-start;min-height:44px;cursor:pointer}.lc90-sw input{width:22px;height:22px;flex:none}.lc90-sw span{display:grid;gap:2px}.lc90-sw small{color:#94a3b8}"
      +".lc90-fl{list-style:none;margin:0;padding:0;display:grid;gap:8px}.lc90-fi{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center}.lc90-fi>input[type=checkbox]{width:22px;height:22px}.lc90-fb{display:flex;gap:2px}.lc90-fb .btn{min-width:44px}"
      +".lc90-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px}.lc90-grid div{display:grid;gap:2px;padding:10px;border-radius:12px;background:#0f172a;border:1px solid #334155}.lc90-grid b{font-size:22px}.lc90-grid span{color:#94a3b8;font-size:12.5px}"
      +".lc90-tiers{display:grid;grid-template-columns:1fr 1fr;gap:8px}@media (max-width:420px){.lc90-tiers{grid-template-columns:1fr}}"
      +".lc90-tier{display:flex;gap:10px;align-items:flex-start;padding:12px;border-radius:14px;border:2px solid #334155;background:#1e293b;cursor:pointer;min-height:44px}.lc90-tier.is-on{border-color:#38bdf8;background:rgba(56,189,248,.08)}"
      +".lc90-tier input{width:20px;height:20px;margin-top:2px;accent-color:#38bdf8}.lc90-tier span{display:grid;gap:2px}.lc90-tier small{color:#94a3b8}.lc90-tier em{font-style:normal;color:#e2e8f0;font-size:13px;font-weight:700}"
      +".lc90-box{display:grid;gap:10px}.lc90-box[hidden]{display:none}.lc90-lead{margin:0;font-weight:700}.lc90-h3{margin:6px 0 0;font-size:15px}"
      +".lc90-warn{border:1px solid #fbbf24;color:#fbbf24}.lc90-mis{color:#fbbf24!important}.lc90-hist{list-style:none;margin:0;padding:0}.lc90-hist li{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #1e293b}";
    document.head.appendChild(s);
  }
  let deb=0;
  function afterRender(r){clearTimeout(deb);deb=setTimeout(()=>{ownerRows();check("open")},2500)}
  function init(){
    try{
      css();
      if(typeof MOUNT!=="undefined"){MOUNT["paywall-editor"]=mount;try{DOC_TITLES["paywall-editor"]="Paywall & Founding Offer Editor";ROUTE_TITLES["paywall-editor"]="the paywall editor"}catch(e){}}
      try{const lv=LC26.levels,o=lv.minLevel;if(lv&&!lv.__lc90){lv.__lc90=1;lv.minLevel=r=>r==="paywall-editor"?1:o(r)}}catch(e){}
      document.addEventListener("click",onClick);
      document.addEventListener("input",e=>{const v=e.target&&e.target.closest&&e.target.closest(".lc90-ed");if(v)mismatch(v.parentNode)});
      let d2=0;new MutationObserver(()=>{clearTimeout(d2);d2=setTimeout(ownerRows,200)}).observe(document.body,{childList:true,subtree:true});
      clearInterval(checkT);checkT=setInterval(()=>{if(document.visibilityState==="visible")check("tokens")},60e3);   /* the last day: the moment the tokens run out */
    }catch(e){console.error("lc90",e)}
  }
  return{init:init,afterRender:afterRender,mount:mount,open:open,preview:c=>open({preview:true,cfg:c}),check:check,version:VERSION,
    access:{beginnerOpen:beginnerOpen,strict:strict},
    _t:{clean:clean,numbers:numbers,fill:fill,due:due,wording:wording,DEF:DEF,cfg:cfg,reset(){CFG=null;cfgAt=0;busy=false}}};
})(); /*@@end lc90*/
