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
     SQL: sql/20261116100000_lc89_lc90_inline_cms_founding_paywall.sql (the owner runs it). Without it the pop-up runs on the defaults below. */
  const VERSION="9.52.0",DAY=864e5,SEEN="lc90-seen",CACHE="lc90-cfg";
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
    features:[{t:"Keep training every day: 10 tokens a day with Pro instead of 1",on:true},{t:"Every course included, right away: the whole library",on:true},
      {t:"The 24/7 AI coach and the full Trim report on your own games",on:true},{t:"The Test Panel: first access to new paid courses and features",on:true},
      {t:"The Founding Member badge on your profile",on:true}],
    cta_trial:"Start my {days}-day €0 Founding Trial",cta_buy:"Skip the trial: pay now",cta_later:"Not now, continue with 1 token a day",
    consent:"I want Pro to start right away. €0 today, then the plan I picked from day {days_after} until I cancel. Because Pro starts at once, I give up my 14-day right of withdrawal for the paid period, so a payment that has gone through is not refunded.",
    fine:"Your card is kept by Stripe (we never see it). Cancel any time before the trial ends in Account > Manage subscription and nothing is charged. The yearly launch rate stays the same for as long as your subscription stays active."};
  const TEXT=["eyebrow","title","subtitle","body","badge","price_yearly","price_yearly_old","price_month_equiv","price_monthly","cta_trial","cta_buy","cta_later","consent","fine"];
  const LIM={eyebrow:60,title:90,subtitle:160,body:700,badge:90,price_yearly:20,price_yearly_old:20,price_month_equiv:20,price_monthly:20,cta_trial:70,cta_buy:60,cta_later:70,consent:500,fine:500};
  const BANNED=/\b(lifetime|for life|forever)\b/i;   /* the launch rate holds while the subscription stays active, never "for life" (the server refuses it too) */
  function clean(c){
    c=c&&typeof c==="object"?c:{};const o={};
    o.on=c.on!==false;o.use_live=c.use_live!==false;
    TEXT.forEach(k=>{const v=typeof c[k]==="string"?c[k].replace(/[<>]/g,"").trim().slice(0,LIM[k]):"";o[k]=v||DEF[k]});
    const pct=Math.round(+c.discount_pct);o.discount_pct=pct>=0&&pct<=90?pct:DEF.discount_pct;
    const d=c.trial_days;o.trial_days=Number.isInteger(d)&&d>=0&&d<=30?d:DEF.trial_days;
    ["stripe_price_yearly","stripe_price_monthly"].forEach(k=>{o[k]=/^price_[A-Za-z0-9]{6,80}$/.test(String(c[k]||""))?String(c[k]):""});
    const f=Array.isArray(c.features)?c.features:DEF.features;
    o.features=f.filter(x=>x&&typeof x.t==="string"&&x.t.trim()).slice(0,12).map(x=>({t:x.t.replace(/[<>]/g,"").trim().slice(0,140),on:x.on!==false}));
    return o;
  }
  function wording(c){return TEXT.concat([]).some(k=>BANNED.test(c[k]||""))||(c.features||[]).some(x=>BANNED.test(x.t))}
  const eur=c=>{c=+c||0;return"€"+(c%100===0?String(c/100):(c/100).toFixed(2))};
  /* the numbers shown: the live launch ladder from the Stripe function (default) or the owner's typed prices */
  function numbers(c,p){
    const n={days:c.trial_days,days_after:c.trial_days+1,yearly:c.price_yearly,yearly_old:c.price_yearly_old,month_equiv:c.price_month_equiv,monthly:c.price_monthly,pct:c.discount_pct,left:"",rate_name:"Founding Member",tranche:1,live:false};
    if(c.use_live&&p&&p.ok&&Array.isArray(p.yearly)){
      const t=p.tranche||4,y=+p.yearly[t-1]||+p.base;
      Object.assign(n,{yearly:eur(y),yearly_old:eur(p.base),month_equiv:eur(Math.round(y/12)),monthly:eur(p.monthly),pct:Array.isArray(p.discountPct)&&t<4?(+p.discountPct[t-1]||0):0,
        left:Array.isArray(p.left)&&t<4?String(p.left[t-1]):"",rate_name:{1:"Founding Member",2:"Early Adopter",3:"Launch",4:"Pro"}[t]||"Pro",tranche:t,live:true});
    }
    return n;
  }
  const fill=(s,n)=>String(s||"").replace(/\{(days|days_after|yearly|yearly_old|month_equiv|monthly|pct|left|rate_name)\}/g,(m,k)=>String(n[k]==null?"":n[k]));

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
  function html(c,n,preview){
    const feats=(c.features||[]).filter(x=>x.on);
    const trial=c.trial_days>0;
    return'<div class="lc90">'+(preview?'<p class="lc90-pv">'+ic("eye")+" Preview: this is what a student sees. Buttons do not open checkout.</p>":"")
      +'<p class="lc90-eye">'+E(fill(c.eyebrow,n))+"</p>"+'<p class="lc90-sub">'+E(fill(c.subtitle,n))+"</p>"+'<p class="lc90-body">'+E(fill(c.body,n))+"</p>"
      +(n.tranche<4&&n.pct>0?'<p class="lc90-badge">'+E(fill(c.badge,n).replace(/\s*·\s*$/,"").replace(/·\s*places left$/,""))+"</p>":"")
      +'<div class="lc90-plans" role="radiogroup" aria-label="Choose your plan">'
      +'<label class="lc90-plan is-on"><input type="radio" name="lc90-plan" value="yearly" checked><span class="lc90-pl"><b>Yearly'+(n.tranche<4&&n.pct>0?' <em>'+E(n.pct)+"% off</em>":"")+'</b><span class="lc90-price">'+(n.pct>0&&n.yearly_old&&n.yearly_old!==n.yearly?"<s>"+E(n.yearly_old)+"</s> ":"")+"<strong>"+E(n.yearly)+'</strong> a year</span><small>About '+E(n.month_equiv)+" a month</small></span></label>"
      +'<label class="lc90-plan"><input type="radio" name="lc90-plan" value="monthly"><span class="lc90-pl"><b>Monthly</b><span class="lc90-price"><strong>'+E(n.monthly)+"</strong> a month</span><small>No launch discount</small></span></label></div>"
      +(feats.length?'<ul class="lc90-feats">'+feats.map(x=>"<li>"+ic("check")+" <span>"+E(fill(x.t,n))+"</span></li>").join("")+"</ul>":"")
      +(trial?'<label class="lc90-ok"><input type="checkbox" data-lc90-ok> <span>'+E(fill(c.consent,n))+"</span></label>":"")
      +'<div class="btn-row lc90-btns"><button type="button" class="btn btn-gold" data-lc90="go"'+(trial?" disabled":"")+">"+ic("lock")+" "+E(trial?fill(c.cta_trial,n):"Lock in my rate")+"</button>"
      +(trial?'<button type="button" class="btn btn-ghost" data-lc90="buy">'+E(fill(c.cta_buy,n))+"</button>":"")+"</div>"
      +'<p class="form-msg" data-lc90-msg aria-live="polite"></p><p class="small muted lc90-fine">'+E(fill(c.fine,n))+'</p><div class="btn-row"><button type="button" class="btn btn-quiet" data-lc90="later">'+E(fill(c.cta_later,n))+"</button></div></div>";
  }
  const WHY={sign_in:"Sign in first: the trial is tied to your account, so Pro switches on by itself on every device.",trial_used:"You already used your free trial. You can still lock in the rate without one.",
    already_member:"You already have Pro.",no_trial:"The trial is switched off right now. You can still lock in the rate.",network:"No connection. Nothing was charged.",slow_down:"Too many tries. Wait a minute.",not_configured:"Checkout is not set up on this build."};
  async function stripeCall(path,body){
    const c=cfgSB();if(!c.url)return{ok:false,reason:"not_configured"};
    try{const r=await fetch(c.url+"/functions/v1/stripe/"+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body||{})});const j=await r.json().catch(()=>({}));j.status=r.status;return j}catch(e){return{ok:false,reason:"network",status:0}}
  }
  const go=u=>{try{LC36.support.go(u)}catch(e){location.href=u}};
  function checkout(plan){
    try{if(typeof LC44!=="undefined"&&LC44.checkout)return LC44.checkout(plan,2)}catch(e){}
    try{return LC36.support.checkout(plan,2)}catch(e){say("Checkout could not start. Nothing was charged. Try again.","bad");return false}
  }
  async function open(o){
    o=o||{};const preview=!!o.preview,c=o.cfg?clean(o.cfg):await cfg(),p=await pricing(),n=numbers(c,p);
    if(!preview)log("shown");
    let picked=false;
    return openSheet({title:fill(c.title,n),cls:"lc90-sheet",noFocus:true,html:html(c,n,preview),onClose(){if(!preview&&!picked)log("closed")},onMount(s){
      const el=s.el,msg=t=>{const m=Q("[data-lc90-msg]",el);if(m)m.textContent=t||""},plan=()=>{const r=Q('input[name="lc90-plan"]:checked',el);return r&&r.value==="monthly"?"monthly":"yearly"};
      const ok=Q("[data-lc90-ok]",el),goBtn=Q('[data-lc90="go"]',el);
      if(ok)ok.addEventListener("change",()=>{goBtn.disabled=!ok.checked});
      el.addEventListener("change",e=>{if(e.target&&e.target.name==="lc90-plan")QA(".lc90-plan",el).forEach(l=>l.classList.toggle("is-on",!!Q("input:checked",l)))});
      el.addEventListener("click",async e=>{
        const b=e.target.closest&&e.target.closest("[data-lc90]");if(!b)return;const a=b.getAttribute("data-lc90");e.preventDefault();
        if(a==="later"){if(!preview){picked=true;log("later")}s.close();return}
        if(preview){msg("Preview: in the real pop-up this "+(a==="go"&&c.trial_days>0?"opens the "+c.trial_days+"-day trial checkout":"opens Stripe checkout")+" for the "+plan()+" plan.");return}
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
      +field("cta_trial","Trial button")+field("cta_buy","Pay-now button")+field("cta_later","“Not now” button")+field("consent","Consent checkbox (legal: keep the meaning)",true)+field("fine","Fine print",true)+"</div>"
      +'<div class="panel pad stack"><h2>Prices and trial</h2><label class="lc90-sw"><input type="checkbox" data-k="use_live"'+(ED.use_live?" checked":"")+"><span><b>Use the live prices</b><small>Recommended: the pop-up shows the rate Stripe really charges now (Founding, then Early Adopter, …).</small></span></label>"
      +'<p class="small" data-lc90-live>Live prices loading…</p><div class="lc90-two">'+field("price_yearly","Yearly price shown")+field("price_yearly_old","Old yearly price (struck through)")+field("price_month_equiv","Per month, billed yearly")+field("price_monthly","Monthly price shown")
      +'<label class="field"><span class="field-label">Discount %</span><input class="input" type="number" min="0" max="90" data-k="discount_pct" value="'+E(ED.discount_pct)+'"></label>'
      +'<label class="field"><span class="field-label">Trial length (days) <small class="muted">0 = no trial; the server uses this</small></span><input class="input" type="number" min="0" max="30" data-k="trial_days" value="'+E(ED.trial_days)+'"></label></div>'
      +'<p class="small muted lc90-mis" data-lc90-mis hidden></p>'
      +'<div class="lc90-two"><label class="field"><span class="field-label">Stripe Price ID, yearly Founding rate <small class="muted">optional, price_…</small></span><input class="input" data-k="stripe_price_yearly" value="'+E(ED.stripe_price_yearly)+'" placeholder="price_…" autocomplete="off"></label>'
      +'<label class="field"><span class="field-label">Stripe Price ID, Pro monthly <small class="muted">optional, price_…</small></span><input class="input" data-k="stripe_price_monthly" value="'+E(ED.stripe_price_monthly)+'" placeholder="price_…" autocomplete="off"></label></div>'
      +'<p class="small muted">Empty = the built-in prices (Pro €39 a month, the yearly launch ladder). A Price ID is only used after Stripe confirms it is an active euro price with the right interval; the yearly one only while Founding places are left. The monthly one applies to every Pro monthly checkout.</p></div>'
      +'<div class="panel pad stack"><h2>Features and bonuses</h2><p class="small muted">Ticked lines show in the pop-up, in this order. At most 12.</p><ol class="lc90-fl" data-lc90-fl>'+flHTML()+'</ol><div class="btn-row"><button type="button" class="btn btn-ghost" data-lc90e="fadd">'+ic("plus")+" Add a line</button></div></div>"
      +'<div class="panel pad stack lc90-actions"><p class="form-msg" data-lc90-emsg aria-live="polite"></p><div class="btn-row"><button type="button" class="btn btn-ghost" data-lc90e="preview">'+ic("eye")+' Preview Pop-up</button><button type="button" class="btn btn-gold" data-lc90e="save">'+ic("cloud-arrow-up")+' Save &amp; Publish</button></div>'
      +'<div class="btn-row"><button type="button" class="btn btn-quiet" data-lc90e="history">Earlier versions</button><button type="button" class="btn btn-quiet" data-lc90e="defaults">Back to the default texts</button></div></div>';
    mismatch(view);
  }
  function flHTML(){return(ED.features||[]).map((x,i)=>'<li class="lc90-fi"><input type="checkbox" data-fon="'+i+'"'+(x.on?" checked":"")+' aria-label="Show this line"><input class="input" data-ft="'+i+'" maxlength="140" value="'+E(x.t)+'" aria-label="Feature line '+(i+1)+'">'
    +'<span class="lc90-fb"><button type="button" class="btn btn-quiet btn-sm" data-lc90e="fup" data-i="'+i+'" aria-label="Move up">↑</button><button type="button" class="btn btn-quiet btn-sm" data-lc90e="fdown" data-i="'+i+'" aria-label="Move down">↓</button><button type="button" class="btn btn-quiet btn-sm" data-lc90e="fdel" data-i="'+i+'" aria-label="Delete">✕</button></span></li>').join("")}
  function readEd(view){
    const o=Object.assign({},ED);
    QA("[data-k]",view).forEach(x=>{const k=x.getAttribute("data-k");if(x.type==="checkbox")o[k]=x.checked;else if(x.type==="number")o[k]=x.value===""?NaN:Math.round(+x.value);else o[k]=x.value});
    o.features=QA("[data-ft]",view).map(x=>({t:x.value,on:!!(Q('[data-fon="'+x.getAttribute("data-ft")+'"]',view)||{}).checked}));
    return o;
  }
  let liveP=null;
  async function livePrices(view){
    liveP=await pricing();const el=Q("[data-lc90-live]",view);if(!el)return;
    if(!(liveP&&liveP.ok)){el.textContent="The live prices could not load right now.";return}
    const n=numbers(Object.assign({},ED,{use_live:true}),liveP);
    el.innerHTML="Live now: <b>"+E(n.yearly)+"</b> a year ("+E(n.rate_name)+(n.left?", "+E(n.left)+" places left":"")+"), <b>"+E(n.monthly)+"</b> a month.";mismatch(view);
  }
  function mismatch(view){
    const el=Q("[data-lc90-mis]",view);if(!el||!liveP||!liveP.ok)return;const o=readEd(view);
    if(o.use_live){el.hidden=true;return}
    const n=numbers(Object.assign({},o,{use_live:true}),liveP),off=[];
    if(String(o.price_yearly).replace(/\s/g,"")!==n.yearly)off.push("yearly "+o.price_yearly+" (Stripe charges "+n.yearly+")");
    if(String(o.price_monthly).replace(/\s/g,"")!==n.monthly)off.push("monthly "+o.price_monthly+" (Stripe charges "+n.monthly+")");
    el.hidden=!off.length;el.textContent=off.length?"⚠ The shown price differs from what checkout charges: "+off.join("; ")+". Fix the text, set a matching Stripe Price ID, or tick “Use the live prices”.":"";
  }
  async function stats(view){
    const el=Q("[data-lc90-stats]",view);if(!el)return;const r=await rpc("lc89_paywall_stats",{p_days:30});
    if(!(r&&r.data&&r.data.ok)){el.innerHTML='<p class="small muted">'+(missing(r)?"Counters appear after the SQL is run.":"Counters could not load.")+"</p>";return}
    const c=r.data.counts||{},n=k=>+c[k]||0,sh=n("shown"),pct=k=>sh?Math.round(n(k)/sh*100)+"%":"–";
    el.innerHTML='<div class="lc90-grid">'+[["shown","Shown"],["trial","Trial tapped"],["yearly","Yearly tapped"],["monthly","Monthly tapped"],["later","Not now"]].map(x=>"<div><b>"+n(x[0])+"</b><span>"+x[1]+(x[0]==="shown"?"":" · "+pct(x[0]))+"</span></div>").join("")+'</div><p class="small muted">Last 30 days, one count per device per day. A tap opens checkout; paid members are counted in the Funnel dashboard.</p>';
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
    msg({trial_days:"The trial length is a whole number from 0 to 30.",price_id:"A Stripe Price ID starts with price_.",features:"At most 12 feature lines.",wording:"Pick other words: no “lifetime”, “for life” or “forever”.",unsafe:"Remove the code-like text.",too_big:"Too much text."}[d.error]||(r&&(r.status===401||r.status===403)?"Only an admin can publish. Sign in with the owner account.":"Could not publish. Nothing changed. Try again."));
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
    if(a==="defaults"){ED=clean(Object.assign({},DEF,{on:ED.on,use_live:ED.use_live,stripe_price_yearly:ED.stripe_price_yearly,stripe_price_monthly:ED.stripe_price_monthly,trial_days:ED.trial_days}));paintEd(view);stats(view);livePrices(view);say("Default texts loaded. Press Save & Publish to make them live.");return}
    ED=readEd(view);const f=ED.features;
    if(a==="fadd"){if(f.length>=12){say("12 lines is the maximum.");return}f.push({t:"",on:true})}
    if(a==="fdel")f.splice(i,1);
    if(a==="fup"&&i>0){const x=f[i-1];f[i-1]=f[i];f[i]=x}
    if(a==="fdown"&&i<f.length-1){const x=f[i+1];f[i+1]=f[i];f[i]=x}
    const fl=Q("[data-lc90-fl]",view);if(fl)fl.innerHTML=flHTML();
    if(a==="fadd"){const n=Q('[data-ft="'+(f.length-1)+'"]',view);if(n)n.focus()}
  }

  /* ---------- wiring ---------- */
  function ownerRows(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc90-own]",m)||!owner())return;
    const ref=Q("[data-lc86-own]",m)||Q("[data-lc85-own]",m)||Q("[data-lc82-own]",m)||Q("[data-lc74-own]",m)||Q("[data-lc73-own]",m);if(!ref)return;
    const b=document.createElement("a");b.href="#paywall-editor";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc90-own","");
    b.innerHTML="<span><b>Paywall &amp; Founding Offer Editor</b><small>The Day-7 pop-up: texts, prices, trial, features, preview</small></span>";
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
    _t:{clean:clean,numbers:numbers,fill:fill,due:due,wording:wording,DEF:DEF,cfg:cfg,reset(){CFG=null;cfgAt=0;busy=false}}};
})(); /*@@end lc90*/
