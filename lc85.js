/*@@module lc85*/
const LC85=(()=>{
  "use strict";
  /* LC85 (build 9.45.0): the in-app funnel. The landing page only informs and installs; everything that costs money happens here, in the app.
     1. One in-app upgrade sheet. Every "Upgrade to Pro", "Become VIP" and "All plans" button (LC36 data-lc36 support / vip / plans) opens it
        instead of a new tab with the landing page: Pro yearly (the live launch rate, LC34's card), Pro monthly, VIP, token packs and Gift a friend.
        Each plan button goes straight to Stripe (LC44's Payment Links, LC36's checkout as the fallback). LC36.support.open() (the old "all plans
        on the landing page") now opens the same sheet, so the app never sends a member to the landing page to pay.
     2. Token triggers: the "Tokens Exhausted" wall (LC81) gets the four token packs right in it; every other "not enough tokens" path already
        opens LC44's Token Refill Shop.
     3. Time-delayed paywalls: the first days after the first visit (graceDays, default 3, admin mode > Funnel & social proof) no sales pop-up
        opens by itself (LC34's master offer and the Popups events stay quiet) and a tap on a locked feature gets the soft sheet: Pro only, no
        scarcity counter, VIP folded away. After that the full sheet with the Founding counter and VIP shows.
     4. Feedback per feature: a small 💬 button next to the ? of every screen. Stars, love / idea / problem, a few words. It goes to the existing
        Feedback queue (app_feedback). With the member's explicit permission (unticked by default) a 4 or 5 star message also goes to the owner's
        social-proof list (lc85_proof), where the owner approves it before anyone sees it.
     5. Social proof: approved messages show in the upgrade sheet of that feature ("See how Anna rated the Opening trainer. Want to unlock this
        Pro feature too?"). Nothing is invented: no approved message = no quote (the 5-star total from LC82 shows when there is one).
     SQL: sql/20261115120000_lc85_feature_feedback.sql (the owner runs it; without it the feedback still reaches the Feedback queue). */
  const VERSION="9.45.0",DAY=864e5;
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.prototype.slice.call((r||document).querySelectorAll(s));
  const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const say=(m,k,ms)=>{try{toast(m,k||"",ms)}catch(e){}};
  const ic=n=>{try{return icon(n)}catch(e){return""}};
  const route=()=>{let h="";try{h=decodeURIComponent(String(location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){h=""}return h.split(/[\/?&]/)[0]};
  const owner=()=>{try{return !!(LC49.owner()||Admin.active)}catch(e){return false}};
  const EMAIL=/^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,24}$/;
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const mail=()=>{const s=sess();return s&&s.email&&EMAIL.test(String(s.email))?String(s.email).toLowerCase():""};
  async function tok(){try{return await LC26.sync.token()}catch(e){return""}}
  async function rpc(fn,args,anon){
    try{
      const h={};if(!anon){const t=await tok();if(!t)return{status:401,data:null};h.Authorization="Bearer "+t}
      else{const t=await tok();if(t)h.Authorization="Bearer "+t}
      return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:h,body:JSON.stringify(args||{})});
    }catch(e){return{status:0,data:null}}
  }
  const missing=r=>!!(r&&(r.status===404||(r.data&&/PGRST202|does not exist|42883/i.test(String(r.data.code||"")+String(r.data.message||"")))));
  const NOSQL="The social-proof list is not switched on yet. Run sql/20261115120000_lc85_feature_feedback.sql in the Supabase SQL editor.";

  /* ---------- settings (admin mode > Funnel & social proof, saved in v5.lc85 of content.json) ---------- */
  const DEF={graceDays:3,fbOn:true};
  function cfg(){let v={};try{v=(V5Doc.get()||{}).lc85||{}}catch(e){v={}}const o=Object.assign({},DEF,v);o.graceDays=Math.max(0,Math.min(30,Math.round(+o.graceDays)));if(!Number.isFinite(o.graceDays))o.graceDays=DEF.graceDays;return o}
  function cleanCfg(x){const o={};if(!x||typeof x!=="object"||Array.isArray(x))return o;if(x.graceDays!==""&&x.graceDays!=null&&Number.isFinite(+x.graceDays))o.graceDays=Math.max(0,Math.min(30,Math.round(+x.graceDays)));if(typeof x.fbOn==="boolean")o.fbOn=x.fbOn;return o}

  /* ---------- the grace period (time-delayed paywalls) ---------- */
  function first(){let f=0;try{f=+LC34.tokens.first()||0}catch(e){f=0}if(!f){f=+rd("lc85-first",0)||0;if(!f){f=Date.now();wr("lc85-first",f)}}return f}
  const days=()=>Math.max(0,(Date.now()-first())/DAY);
  /* pure: is a member who started at `start` still in the grace period at `now`? */
  function inGrace(start,now,graceDays){if(!(graceDays>0))return false;return(now-start)<graceDays*DAY}
  function paid(){try{if(Admin.active&&!(Admin.preview&&Admin.preview()))return false}catch(e){}try{return String(App.access&&App.access.tier||"free")!=="free"}catch(e){return false}}
  function grace(){const f=rd("lc85-force","");if(f==="grace")return true;if(f==="open")return false;return inGrace(first(),Date.now(),cfg().graceDays)}
  function graceLeft(){const g=cfg().graceDays;return Math.max(0,Math.ceil(g-days()))}

  /* ---------- feature names ---------- */
  const NOFB=/^(admin|privacy|upgrades|level0|giveaway-admin|social-proof|wall-cms|landing-editor|studio|reset|delete-account|analytics)$/;
  function featureName(r){
    r=r||route();let t="";
    try{if(typeof DOC_TITLES!=="undefined"&&DOC_TITLES[r])t=String(DOC_TITLES[r])}catch(e){}
    if(!t){try{const h=Q("#view h1")||Q("#view h2");if(h){const c=h.cloneNode(true);QA("button,.lc29-q,.lc85-fb",c).forEach(x=>x.remove());t=c.textContent.trim()}}catch(e){}}
    t=t.replace(/\s+/g," ").replace(/\s*[|·–-]\s*Lanckriet Chess.*$/i,"").trim();
    return(t||"this feature").slice(0,60);
  }

  /* ---------- social proof ---------- */
  const PC={};
  async function proof(feature){
    const k=String(feature||"").slice(0,40),c=PC[k];if(c&&Date.now()-c.at<10*6e4)return c.rows;
    let rows=[];
    const r=await rpc("lc85_proof",{p_feature:k||null},true);
    if(r&&r.status===200&&r.data&&Array.isArray(r.data.rows))rows=r.data.rows.filter(x=>x&&x.text).slice(0,6);
    PC[k]={at:Date.now(),rows:rows};return rows;
  }
  const stars=n=>"★★★★★".slice(0,Math.max(0,Math.min(5,n|0)))+"☆☆☆☆☆".slice(0,5-Math.max(0,Math.min(5,n|0)));
  function quoteHTML(q,featureLabel){
    const who=q.who?E(q.who):"A member",same=q.feature&&featureLabel&&q.same;
    return'<figure class="lc85-quote"><span class="lc85-stars" aria-label="'+(q.stars|0)+' out of 5 stars">'+stars(q.stars)+'</span><blockquote>“'+E(String(q.text).slice(0,220))+'”</blockquote><figcaption>— '+who+(q.title?' <span>on '+E(q.title)+'</span>':"")+"</figcaption></figure>"
      +(same?'<p class="lc85-proof-ask">See how '+who+' rated '+E(featureLabel)+'. Want to unlock this Pro feature too?</p>':"");
  }
  async function fillProof(host,feature,label){
    if(!host)return;
    let rows=[];try{rows=await proof(feature)}catch(e){rows=[]}
    if(!host.isConnected)return;
    if(rows.length){const pick=rows.filter(x=>x.same)[0]||rows[0];host.innerHTML=quoteHTML(pick,label);host.hidden=false;return}
    try{const sp=typeof LC82!=="undefined"?await LC82.proof(false):null,n=sp&&sp.reviews?(+sp.reviews.five_star||0):0;
      if(n>0&&host.isConnected){host.innerHTML='<p class="lc85-proof-sum"><span class="lc85-stars">★★★★★</span> '+n.toLocaleString("en-US")+(n===1?" member gave":" members gave")+" the Hub five stars.</p>";host.hidden=false}}catch(e){}
  }

  /* ---------- the in-app upgrade sheet (subscription triggers) ---------- */
  let upBusy=false;
  const eur=c=>{try{return LC34._t.eur(c)}catch(e){c=+c||0;return"€"+(c%100===0?String(c/100):(c/100).toFixed(2))}};
  async function pricing(){try{return await LC34._t.pricing()}catch(e){return null}}
  function proCard(p){try{return LC34._t.offerCard(p)}catch(e){return""}}
  function checkout(plan,tier){
    try{if(typeof LC44!=="undefined"&&LC44.checkout)return LC44.checkout(plan,tier)}catch(e){}
    try{return LC36.support.checkout(plan,tier)}catch(e){say("Checkout could not start. Nothing was charged. Try again.","bad");return false}
  }
  function vipHTML(p){
    const v=p&&p.vip,y=v&&Array.isArray(v.yearly)?eur(v.yearly[(v.tranche||3)-1]||v.base):"",m=v&&v.monthly?eur(v.monthly):"";
    return'<div class="lc85-plan is-vip"><h3>'+ic("gem")+' VIP</h3><p>Everything in Pro, with your tokens upfront: <b>500 tokens at once each month</b>, or <b>7,000 at once</b> on the yearly plan. The Lanckriet Chess Student title, a blue profile banner and priority in live streams and the community.</p>'
      +'<div class="btn-row"><button type="button" class="btn btn-gold" data-lc85-plan="yearly" data-tier="3">Become VIP, yearly'+(y?" · "+E(y):"")+'</button><button type="button" class="btn btn-ghost" data-lc85-plan="monthly" data-tier="3">VIP, monthly'+(m?" · "+E(m)+"/month":"")+"</button></div></div>";
  }
  function upHTML(o,p,soft){
    const label=o.label||"",isVip=Number(o.tier)===3;
    let h='<div class="lc85-up">';
    if(label&&label!=="this feature")h+='<p class="lc85-kick">'+ic("lock")+" "+E(label)+(isVip?" is part of VIP.":" is part of Pro.")+"</p>";
    h+=soft?'<p class="lc85-lead">You are in your first days. Level 1 of everything stays free, so take your time. When you want the full system, it is one tap away.</p>'
           :'<p class="lc85-lead">The full MSPC system: every repertoire, the Masterclass, the full Trim report and the 24/7 coach. Secure checkout with Stripe.</p>';
    h+='<div data-lc97-slot hidden></div>';   /* 9.62.0: LC97 fills a "Try Pro free" row while the trial is unused */
    h+='<div class="lc85-proof" data-lc85-proof hidden></div>';
    h+='<div class="lc85-plan is-pro">'+(soft?'<h3>'+ic("sparkles")+' Pro</h3>':proCard(p))
      +'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc85-plan="yearly" data-tier="2">'+E(!soft&&p&&p.tranche===1?"Lock in my Founding rate":!soft&&p&&p.tranche===2?"Lock in my Early Adopter rate":"Upgrade to Pro, yearly")+'</button>'
      +'<button type="button" class="btn btn-ghost" data-lc85-plan="monthly" data-tier="2">Pro, monthly'+(p&&p.monthly?" · "+E(eur(p.monthly))+"/month":"")+"</button></div>"
      +'<p class="small muted lc85-guar">'+ic("shield-halved")+" Launch Price Guarantee: your yearly launch rate stays the same for as long as your subscription stays active.</p></div>";
    h+=soft&&!isVip?'<details class="lc85-more"><summary>VIP and more options</summary>'+vipHTML(p)+"</details>":vipHTML(p);
    h+='<div class="lc85-extra"><button type="button" class="btn btn-quiet" data-lc85="tokens">'+ic("coins")+' Just a few tokens</button><button type="button" class="btn btn-quiet" data-lc85="gift">'+ic("gift")+" Gift a friend</button></div>";
    h+='<p class="small muted lc85-fine">Your membership switches on in this app by itself: use the email you sign in with. Payment is handled by Stripe; we never see your card.</p></div>';
    return h;
  }
  async function upgrade(o){
    o=Object.assign({tier:2,src:"button"},o||{});
    if(upBusy||Q(".lc85-upsheet"))return;upBusy=true;
    const r=o.route||route();o.feature=o.feature||r;o.label=o.label||(NOFB.test(r)||r==="home"||!r?"":featureName(r));
    const soft=grace()&&!paid();
    let p=null;try{p=await Promise.race([pricing(),new Promise(res=>setTimeout(()=>res(null),1500))])}catch(e){p=null}
    upBusy=false;
    try{Telemetry.log({e:"lc85-up",x:(soft?"soft-":"full-")+String(o.src).slice(0,12)})}catch(e){}
    openSheet({title:Number(o.tier)===3?"Become VIP":soft?"This is a Pro feature":"Unlock Pro",cls:"lc85-upsheet",noFocus:true,html:upHTML(o,p,soft),onMount(s){
      fillProof(Q("[data-lc85-proof]",s.el),o.feature,o.label);
      try{if(typeof LC97!=="undefined"&&Number(o.tier)!==3)LC97.slot(Q("[data-lc97-slot]",s.el),s)}catch(e){}
      s.el.addEventListener("click",e=>{
        const b=e.target.closest&&e.target.closest("[data-lc85-plan]");
        if(b){e.preventDefault();const plan=b.getAttribute("data-lc85-plan"),tier=+b.getAttribute("data-tier")||2;try{s.close()}catch(x){}checkout(plan,tier);return}
        const x=e.target.closest&&e.target.closest("[data-lc85]");if(!x)return;
        const a=x.getAttribute("data-lc85");e.preventDefault();try{s.close()}catch(y){}
        setTimeout(()=>{if(a==="tokens")shop();else if(a==="gift")gift()},260);
      });
    }});
  }
  function shop(){try{LC44.shop();return true}catch(e){}try{LC81.tokens.wall()}catch(e){}return false}
  function plans(section){
    const s=String(section||"").toLowerCase();
    if(s==="tokens"){shop();return true}
    if(s==="gift"){gift();return true}
    upgrade({src:"plans"});return true;
  }

  /* ---------- Gift a friend, in the app (the same Stripe route the landing page used; the receipt comes back to #upgrades) ---------- */
  function gift(){
    openSheet({title:"Gift a friend",cls:"lc85-giftsheet",noFocus:true,html:'<form class="stack lc85-gift" data-lc85-gift novalidate autocomplete="off">'
      +'<p class="small muted">One year of Pro for someone else, at the launch rate that is live now (or your own yearly rate when that is lower). Paid once, no renewal. Your friend signs in with their email and Pro switches on.</p>'
      +'<label class="field"><span class="field-label">Your friend’s email</span><input class="input" name="to" type="email" inputmode="email" autocapitalize="off" spellcheck="false" required placeholder="friend@example.com"></label>'
      +'<label class="field"><span class="field-label">Your first name <small class="muted">(your friend sees it)</small></span><input class="input" name="name" maxlength="40" placeholder="Anna"></label>'
      +'<label class="field"><span class="field-label">A short message <small class="muted">(optional)</small></span><input class="input" name="note" maxlength="200" placeholder="Let’s both hit 1500 this year!"></label>'
      +'<p class="form-msg" data-lc85-gmsg aria-live="polite"></p><div class="btn-row"><button class="btn btn-primary" type="submit">'+ic("gift")+' Gift one year of Pro</button></div></form>',
      onMount(s){const f=Q("[data-lc85-gift]",s.el),m=Q("[data-lc85-gmsg]",f),b=Q('button[type="submit"]',f);
        f.addEventListener("submit",async e=>{e.preventDefault();const to=String(f.elements.to.value||"").trim().toLowerCase();
          if(!EMAIL.test(to)){m.className="form-msg is-bad";m.textContent="Check your friend’s email address.";f.elements.to.focus();return}
          b.disabled=true;m.className="form-msg";m.textContent="Opening secure checkout…";
          let r=null;try{r=await LC36.support.api("gift",{to:to,email:mail()||undefined,from_name:String(f.elements.name.value||"").trim()||undefined,note:String(f.elements.note.value||"").trim()||undefined,token:(await tok())||undefined})}catch(x){r=null}
          if(r&&r.ok&&typeof r.url==="string"&&/^https:\/\/[a-z0-9.-]+\.stripe\.com\//i.test(r.url)){try{LC36.support.go(r.url)}catch(x){location.href=r.url}return}
          b.disabled=false;m.className="form-msg is-bad";m.textContent=(r&&r.reason&&LC36.support.WHY[r.reason])||"Checkout could not start. Nothing was charged. Try again."});
      }});
  }

  /* ---------- token triggers: the packs inside the Tokens Exhausted wall ---------- */
  function packsHTML(){
    let P=[];try{P=LC44.PACKS||[]}catch(e){P=[]}if(!P.length)return"";
    return'<div class="lc85-packs" role="group" aria-label="Token packs"><p class="lc85-ph"><b>Keep going right now:</b> a token pack, bought once, no subscription.</p><div class="lc85-pk">'
      +P.map(k=>'<button type="button" class="btn lc85-pack" data-lc85-pack="'+E(k.id)+'"><b>'+(+k.tokens).toLocaleString("en-GB")+" tokens</b><span>"+E(k.price)+"</span></button>").join("")+"</div></div>";
  }
  function buyPack(id){
    let k=null;try{k=(LC44.PACKS||[]).filter(x=>x.id===id)[0]}catch(e){k=null}
    if(!k)return shop();
    const em=mail();if(!em){shop();return}           /* the shop asks for the email the tokens go to */
    let u="";try{u=LC44._t.withMail(k.url,em);if(!LC44._t.ok(k.url))u=""}catch(e){u=""}
    if(!u){shop();return}
    try{LC36.support.go(u)}catch(e){location.href=u}
  }
  function wrapWall(){
    try{
      const T=LC81.tokens;if(!T||T.__lc85)return;const orig=T.wall.bind(T);
      T.wall=function(){const r=orig();if(r){setTimeout(()=>{const b=Q(".lc81-tok .lc81-tokbox");if(b&&!Q(".lc85-packs",b)){const d=document.createElement("div");d.innerHTML=packsHTML();if(d.firstChild)b.appendChild(d.firstChild)}},0)}return r};
      T.__lc85=1;
    }catch(e){}
  }

  /* ---------- time-delayed paywalls: wrap the automatic triggers ---------- */
  function wrapTriggers(){
    try{const F=LC34.funnel;if(F&&!F.__lc85){const o=F.eligible.bind(F);F.eligible=function(){if(grace())return false;return o()};F.__lc85=1}}catch(e){}
    try{if(typeof Popups!=="undefined"&&!Popups.__lc85){const o=Popups.fire;Popups.fire=function(ev,ctx){if(grace()&&!paid())return false;return o.apply(this,arguments)};Popups.__lc85=1}}catch(e){}
    try{const S=LC36.support;if(S&&!S.__lc85){S.open=section=>plans(section);S.__lc85=1}}catch(e){}
  }

  /* ---------- the 💬 button next to the ? of every screen ---------- */
  function fbOn(){try{return cfg().fbOn!==false}catch(e){return true}}
  function decorate(){
    try{
      const view=Q("#view");if(!view)return;const r=route()||"home";
      const old=QA(".lc85-fb",view);
      if(!fbOn()||NOFB.test(r)){old.forEach(x=>x.remove());return}
      if(old.length&&old[0].getAttribute("data-lc85-fb")===r&&old[0].isConnected)return;
      old.forEach(x=>x.remove());
      const q=Q(".lc29-q",view),host=q?q.parentNode:(Q("h1",view)||Q("h2",view));if(!host)return;
      const b=document.createElement("button");b.type="button";b.className="lc85-fb";b.setAttribute("data-lc85-fb",r);
      b.setAttribute("aria-label","Feedback on this feature");b.title="Feedback on this feature";b.textContent="💬";
      if(q)q.insertAdjacentElement("afterend",b);else host.appendChild(b);
    }catch(e){}
  }
  const FBK={love:{cat:"praise",label:"I love it",ico:"heart"},idea:{cat:"feature",label:"I have an idea",ico:"lightbulb"},problem:{cat:"bug",label:"Something is off",ico:"bug"}};
  function openFb(r){
    r=r||route()||"home";const label=featureName(r);
    if(Q(".lc85-fbsheet"))return;
    const st={kind:"love",stars:0,busy:false};
    openSheet({title:"Feedback: "+label,cls:"lc85-fbsheet",noFocus:true,html:'<form class="stack lc85-fbf" data-lc85-fbf novalidate autocomplete="off">'
      +'<p class="small muted">Kyenzo reads every message. What do you think of <b>'+E(label)+'</b>?</p>'
      +'<div class="lc85-starsel" role="radiogroup" aria-label="Your rating">'+[1,2,3,4,5].map(n=>'<button type="button" role="radio" aria-checked="false" data-lc85-star="'+n+'" aria-label="'+n+(n===1?" star":" stars")+'">★</button>').join("")+"</div>"
      +'<div class="lc85-kinds" role="radiogroup" aria-label="What kind of feedback">'+Object.keys(FBK).map(k=>'<button type="button" role="radio" aria-checked="'+(k==="love")+'" data-lc85-kind="'+k+'">'+ic(FBK[k].ico)+" "+E(FBK[k].label)+"</button>").join("")+"</div>"
      +'<label class="field"><span class="field-label" data-lc85-q>What do you like most about it?</span><textarea class="input" name="msg" rows="3" maxlength="600" placeholder="A few words are enough"></textarea></label>'
      +'<label class="lc85-ok"><input type="checkbox" name="ok"><span>Kyenzo may show my words to other players in the app <small>(after he has read them; first name or initials only)</small></span></label>'
      +'<label class="field lc85-who" hidden><span class="field-label">Name to show <small class="muted">(optional, e.g. “Anna” or “A.V.”)</small></span><input class="input" name="who" maxlength="24" autocomplete="given-name"></label>'
      +'<p class="form-msg" data-lc85-fmsg aria-live="polite"></p><div class="btn-row"><button class="btn btn-primary" type="submit">'+ic("paper-plane")+' Send</button></div></form>',
      onMount(s){
        const f=Q("[data-lc85-fbf]",s.el),m=Q("[data-lc85-fmsg]",f);
        const paintStars=()=>QA("[data-lc85-star]",f).forEach(b=>{const n=+b.getAttribute("data-lc85-star");b.classList.toggle("on",n<=st.stars);b.setAttribute("aria-checked",String(n===st.stars))});
        const paintKind=()=>{QA("[data-lc85-kind]",f).forEach(b=>b.setAttribute("aria-checked",String(b.getAttribute("data-lc85-kind")===st.kind)));
          Q("[data-lc85-q]",f).textContent=st.kind==="love"?"What do you like most about it?":st.kind==="idea"?"What would make it better for your training?":"What happened, and what did you expect?";
          Q(".lc85-ok",f).hidden=st.kind!=="love";if(st.kind!=="love"){f.elements.ok.checked=false;Q(".lc85-who",f).hidden=true}};
        f.addEventListener("click",e=>{const a=e.target.closest("[data-lc85-star]"),k=e.target.closest("[data-lc85-kind]");
          if(a){st.stars=+a.getAttribute("data-lc85-star");if(st.stars<=2&&st.kind==="love"){st.kind="idea";paintKind()}paintStars()}
          if(k){st.kind=k.getAttribute("data-lc85-kind");paintKind()}});
        f.elements.ok.addEventListener("change",()=>{Q(".lc85-who",f).hidden=!f.elements.ok.checked});
        f.addEventListener("submit",async e=>{
          e.preventDefault();if(st.busy)return;
          const text=String(f.elements.msg.value||"").replace(/\s+/g," ").trim().slice(0,600);
          if(!st.stars&&text.length<3){m.className="form-msg is-bad";m.textContent="Tap a star or write a few words.";return}
          st.busy=true;m.className="form-msg";m.textContent="Sending…";
          const ok=!!f.elements.ok.checked&&st.kind==="love",who=String(f.elements.who.value||"").replace(/[^\p{L}\p{M} .'-]/gu,"").trim().slice(0,24);
          let res={ok:false,message:"Could not send. Try again."};
          try{res=await Feedback.submit({category:FBK[st.kind].cat,message:"["+label+"] "+(text||"(no text)"),rating:st.stars,showcase:ok,email:mail()})}catch(x){res={ok:false,message:"Could not send. Try again."}}
          if(ok&&st.stars>=4&&text.length>=3){rpc("lc85_submit",{p_feature:r.slice(0,40),p_title:label,p_stars:st.stars,p_text:text,p_who:who||null},true).catch(()=>{})}
          st.busy=false;
          if(!res.ok){m.className="form-msg is-bad";m.textContent=res.message||"Could not send. Try again.";return}
          wr("lc85-fb-last",{r:r,at:Date.now(),stars:st.stars});
          s.close();say(st.kind==="love"&&st.stars>=4?"Thank you! That means a lot."+(ok?" Kyenzo reads it before anyone else sees it.":""):"Thank you! Kyenzo reads every message.","good",3600);
        });
        paintKind();
      }});
  }

  /* ---------- owner page: #social-proof (approve messages, grace days) ---------- */
  async function mountAdmin(view){
    if(!owner()){view.innerHTML='<div class="panel pad"><p>This page is for the owner.</p></div>';return}
    const c=cfg();
    view.innerHTML='<div class="lc85-admin"><p class="lc85-tag">Owner</p><h1>Funnel & social proof</h1>'
      +'<form class="panel pad stack" data-lc85-cfg><h2 class="lc85-h2">Paywall timing</h2><p class="small muted">The first days after a member’s first visit, no sales pop-up opens by itself and a locked feature shows the soft Pro sheet (no counter, VIP folded away). Set 0 to switch the grace period off.</p>'
      +'<label class="field"><span class="field-label">Grace period in days</span><input class="input" name="grace" type="number" min="0" max="30" step="1" value="'+c.graceDays+'"></label>'
      +'<label class="lc85-ok"><input type="checkbox" name="fb"'+(c.fbOn!==false?" checked":"")+'><span>Show the 💬 feedback button next to the ? of every screen</span></label>'
      +'<label class="field"><span class="field-label">Test on this device</span><select class="input" name="force"><option value="">Real timing</option><option value="grace"'+(rd("lc85-force","")==="grace"?" selected":"")+'>Always in the grace period</option><option value="open"'+(rd("lc85-force","")==="open"?" selected":"")+'>Grace period over</option></select></label>'
      +'<div class="btn-row"><button class="btn btn-primary" type="submit">Save</button></div><p class="small muted">Save keeps it in your draft; Publish in admin mode makes it live for everyone.</p></form>'
      +'<section class="panel pad"><h2 class="lc85-h2">Messages members allowed you to show</h2><p class="small muted">Only 4 and 5 star messages whose writer ticked the permission box arrive here. Nothing shows in the app until you press Show.</p><div data-lc85-list><p class="small muted">Loading…</p></div></section></div>';
    paintList();
  }
  async function paintList(){
    const host=Q("[data-lc85-list]");if(!host)return;
    const r=await rpc("lc85_admin_list",{});
    if(missing(r)){host.innerHTML='<p class="form-msg is-bad">'+E(NOSQL)+"</p>";return}
    const rows=r&&r.status===200&&r.data&&Array.isArray(r.data.rows)?r.data.rows:null;
    if(!rows){host.innerHTML='<p class="form-msg is-bad">Could not load the list. Sign in with the owner account and try again.</p>';return}
    if(!rows.length){host.innerHTML='<p class="small muted">No messages yet.</p>';return}
    host.innerHTML='<ul class="lc85-list">'+rows.map(x=>'<li class="'+(x.approved?"is-on":"")+'"><div><span class="lc85-stars">'+stars(x.stars)+'</span> <b>'+E(x.title||x.feature)+'</b> <small class="muted">'+E(x.who||"no name")+" · "+E(String(x.created_at||"").slice(0,10))+"</small></div><p>“"+E(x.text)+'”</p><div class="btn-row"><button type="button" class="btn btn-sm '+(x.approved?"btn-ghost":"btn-primary")+'" data-lc85a="'+(x.approved?"hide":"show")+'" data-id="'+E(x.id)+'">'+(x.approved?"Hide again":"Show in the app")+"</button></div></li>").join("")+"</ul>";
  }
  async function onAdminClick(e){
    const b=e.target.closest&&e.target.closest("[data-lc85a]");if(!b)return;e.preventDefault();b.disabled=true;
    const r=await rpc("lc85_admin_set",{p_id:+b.getAttribute("data-id"),p_ok:b.getAttribute("data-lc85a")==="show"});
    if(!(r&&r.status===200&&r.data&&r.data.ok)){b.disabled=false;say(missing(r)?NOSQL:"Could not save.","bad");return}
    Object.keys(PC).forEach(k=>delete PC[k]);paintList();
  }
  function onAdminSubmit(e){
    const f=e.target.closest&&e.target.closest("[data-lc85-cfg]");if(!f)return;e.preventDefault();
    wr("lc85-force",f.elements.force.value||"");
    try{const d=Admin.ensureDraft(),v5=Object.assign({},d.v5||{});v5.lc85=cleanCfg({graceDays:+f.elements.grace.value,fbOn:!!f.elements.fb.checked});d.v5=V5Doc.clean(v5);Admin.saveDraft(d);try{V5Doc.apply(d.v5)}catch(x){}say("Saved on this device. Publish to make it live.","good")}
    catch(x){say("Sign in to admin mode first to change the live settings. The test switch is saved on this device.","")}
    decorate();
  }
  function ownerRow(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc85-own]",m)||!owner())return;
    const ref=Q("[data-lc82-own]",m)||Q("[data-lc74-own]",m)||Q("[data-lc73-own]",m)||Q("[data-lc59-admin]",m);if(!ref)return;
    const b=document.createElement("a");b.href="#social-proof";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc85-own","1");
    b.innerHTML="<span><b>Funnel & social proof</b><small>Paywall timing, the 💬 button, feature feedback to show as proof</small></span>";
    b.addEventListener("click",()=>{try{const mm=Q("#lc49-menu");if(mm)mm.remove()}catch(x){}});
    ref.insertAdjacentElement("beforebegin",b);
  }

  /* ---------- wiring ---------- */
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    const fb=t.closest(".lc85-fb");if(fb){e.preventDefault();e.stopPropagation();openFb(fb.getAttribute("data-lc85-fb"));return}
    const pk=t.closest("[data-lc85-pack]");if(pk){e.preventDefault();e.stopPropagation();try{const s=Q(".lc81-tok [data-close]");if(s)s.click()}catch(x){}const id=pk.getAttribute("data-lc85-pack");setTimeout(()=>buyPack(id),280);return}
    if(t.closest(".lc85-upsheet"))return;
    const sp=t.closest('[data-lc36="support"],[data-lc36="vip"],[data-lc36="plans"]');
    if(sp){e.preventDefault();e.stopImmediatePropagation();const a=sp.getAttribute("data-lc36"),host=sp.closest(".sheet-wrap"),x=host&&Q(".sheet-head [data-close]",host);
      if(x){x.click();setTimeout(()=>upgrade({tier:a==="vip"?3:2,src:a}),280)}else upgrade({tier:a==="vip"?3:2,src:a});return}
    const a=t.closest('a[href^="/#pricing"],a[href^="/#tokens"],a[href^="/#gift"],a[href="/?plans=1"]');
    if(a){e.preventDefault();e.stopImmediatePropagation();const h=a.getAttribute("href");plans(/tokens/.test(h)?"tokens":/gift/.test(h)?"gift":"")}
  }
  function css(){
    if(Q("#lc85-css"))return;const s=document.createElement("style");s.id="lc85-css";
    s.textContent=".lc85-fb{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;margin-left:6px;vertical-align:middle;border-radius:50%;border:1px solid rgba(56,189,248,.35);background:rgba(56,189,248,.10);font-size:14px;line-height:1;cursor:pointer;position:relative;padding:0}"
      +".lc85-fb::after{content:\"\";position:absolute;inset:-8px}.lc85-fb:hover{background:rgba(56,189,248,.24)}.lc85-fb:focus-visible{outline:2px solid #38bdf8;outline-offset:3px}"
      +".lc85-up{display:grid;gap:12px}.lc85-kick{margin:0;color:#fbbf24;font-weight:800;font-size:13px;letter-spacing:.02em}.lc85-lead{margin:0;color:#cbd5e1}"
      +".lc85-plan{border:1px solid rgba(148,163,184,.25);border-radius:14px;padding:12px;background:#0f172a;display:grid;gap:8px}.lc85-plan.is-pro{border-color:rgba(56,189,248,.5)}.lc85-plan.is-vip{border-color:rgba(251,191,36,.45)}"
      +".lc85-plan h3{margin:0;font-size:17px}.lc85-plan p{margin:0;font-size:14px}.lc85-plan .btn,.lc85-extra .btn{min-height:44px}.lc85-guar{margin:0}"
      +".lc85-more{border:1px dashed rgba(148,163,184,.3);border-radius:14px;padding:6px 12px}.lc85-more summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:700;color:#cbd5e1}"
      +".lc85-extra{display:flex;flex-wrap:wrap;gap:8px}.lc85-fine{margin:0}"
      +".lc85-proof{border-left:3px solid #fbbf24;padding:4px 0 4px 12px}.lc85-quote{margin:0}.lc85-quote blockquote{margin:4px 0;font-size:15px;color:#e2e8f0}.lc85-quote figcaption{font-size:12.5px;color:#94a3b8}.lc85-quote figcaption span{color:#64748b}"
      +".lc85-stars{color:#fbbf24;letter-spacing:1px}.lc85-proof-ask{margin:6px 0 0;font-weight:700;color:#38bdf8;font-size:14px}.lc85-proof-sum{margin:0;color:#cbd5e1}"
      +".lc85-packs{margin-top:12px;display:grid;gap:8px}.lc85-ph{margin:0;font-size:14px}.lc85-pk{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}"
      +".lc85-pack{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:58px;padding:8px 12px;text-align:left}.lc85-pack b{font-size:1rem}.lc85-pack span{color:#fbbf24;font-weight:800}"
      +".lc85-starsel{display:flex;gap:6px}.lc85-starsel button{width:44px;height:44px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#475569;font-size:22px;cursor:pointer}.lc85-starsel button.on{color:#fbbf24;border-color:rgba(251,191,36,.6)}"
      +".lc85-kinds{display:flex;flex-wrap:wrap;gap:6px}.lc85-kinds button{min-height:44px;padding:0 12px;border-radius:999px;border:1px solid #334155;background:#0f172a;color:#cbd5e1;cursor:pointer;font:600 13px inherit}.lc85-kinds button[aria-checked=true]{border-color:#38bdf8;background:rgba(56,189,248,.14);color:#fff}"
      +".lc85-ok{display:flex;gap:10px;align-items:flex-start;min-height:44px;cursor:pointer;font-size:14px}.lc85-ok input{width:22px;height:22px;margin-top:2px;flex:none}.lc85-ok small{display:block;color:#94a3b8}"
      +".lc85-admin{max-width:900px;margin:0 auto;display:grid;gap:14px}.lc85-admin h1{margin:2px 0 4px}.lc85-tag{margin:0;color:#fbbf24;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase}.lc85-h2{font-size:18px;margin:0 0 6px}"
      +".lc85-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}.lc85-list li{background:#0f172a;border:1px solid #334155;border-radius:12px;padding:10px 12px}.lc85-list li.is-on{border-color:rgba(74,222,128,.55)}.lc85-list p{margin:6px 0}";
    document.head.appendChild(s);
  }
  let deb=0;
  function afterRender(r){clearTimeout(deb);deb=setTimeout(()=>{decorate();ownerRow()},120)}
  function init(){
    try{
      css();wrapTriggers();wrapWall();first();
      try{if(typeof MOUNT!=="undefined"){MOUNT["social-proof"]=mountAdmin;try{DOC_TITLES["social-proof"]="Funnel & social proof";ROUTE_TITLES["social-proof"]="the funnel settings"}catch(e){}}}catch(e){}
      try{const lv=LC26.levels,o=lv.minLevel;if(lv&&!lv.__lc85){lv.__lc85=1;lv.minLevel=r=>r==="social-proof"?1:o(r)}}catch(e){}
      window.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("[data-lc85a]"))return onAdminClick(e);onClick(e)},true);   /* window capture: before LC36's own document listener */
      document.addEventListener("submit",onAdminSubmit,true);
      let d2=0;new MutationObserver(()=>{clearTimeout(d2);d2=setTimeout(()=>{decorate();ownerRow()},200)}).observe(document.body,{childList:true,subtree:true});
      setTimeout(()=>{wrapTriggers();wrapWall()},1500);
    }catch(e){console.error("lc85",e)}
  }
  return{init:init,afterRender:afterRender,upgrade:upgrade,plans:plans,gift:gift,shop:shop,openFb:openFb,grace:grace,graceLeft:graceLeft,cfg:cfg,cleanCfg:cleanCfg,proof:proof,version:VERSION,
    _t:{inGrace:inGrace,first:first,days:days,featureName:featureName,decorate:decorate,packsHTML:packsHTML,buyPack:buyPack,quoteHTML:quoteHTML,upHTML:upHTML,stars:stars,NOFB:NOFB,DEF:DEF}};
})(); /*@@end lc85*/
