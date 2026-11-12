/*@@module lc73*/
const LC73=(()=>{
  "use strict";
  /* LC73 (build 9.37.0): funnels and growth.
     1. 7-day trial of Pro: EUR 0 today with the card on file at Stripe (card capture), then EUR 39 a month until cancelled. One per e-mail.
        A reminder before the trial ends; after the first paid month a rescue offer: switch to yearly and that EUR 39 comes off the first year.
        The saved Stripe customer makes later purchases one tap (Stripe shows the saved card). Referral: 10% off for the invited friend's first
        purchase and the friend who invited them 10% off their next purchase (9.38.0: own referral codes, lc75_refcodes; API checkouts only).
     2. Priority Game Analysis: send a game for Kyenzo's own review for tokens, with explicit consent for a public video review.
     3. Chat requests (accept first), a Block button, and automatic escalating chat bans (3 different blockers in a week).
     4. Rivals (Looking for a Rival hub, invite a friend) and Tribes with weekly XP leaderboards and Tribe Wars; "Find a Rival" is step 1 of the
        Road to a Lanckriet Student.
     5. #analytics: short links (/l/code), sources, the funnel, revenue, retention, lifetime numbers, KPI targets; partners see only their links.
     SQL: sql/20261113100000_lc72_lc73_launch_funnels.sql. Stripe: functions/stripe (routes trial, rescue, gift_quote). */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0].toLowerCase();
  const ic=n=>{try{return icon(n)}catch(e){return""}};
  const say=(t,k)=>{try{toast(t,k||"")}catch(e){}};
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const owner=()=>{try{return !!(LC49.owner()||Admin.active)}catch(e){return false}};
  const cfg=()=>{try{return LC26.sync.cfg()}catch(e){return{url:"",key:""}}};
  async function tok(){try{return await LC26.sync.token()}catch(e){return""}}
  async function rpc(fn,args,anon){const t=await tok();if(!t&&!anon)return{status:0,data:null,noauth:true};
    try{return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:t?{Authorization:"Bearer "+t}:{},body:JSON.stringify(args||{})})}catch(e){return{status:0,data:null}}}
  const missing=r=>r&&(r.status===404||(r.data&&/PGRST202|does not exist/i.test(String(r.data.code||"")+String(r.data.message||""))));
  const sheet=(title,html,onMount)=>{try{return openSheet({title:title,html:html,noFocus:true,cls:"lc73-sheet",onMount:onMount})}catch(e){return null}};
  const myName=()=>{try{const p=App.profile||{};return String(p.name||p.first||"").split(" ")[0]||String((sess()||{}).email||"").split("@")[0]||"Member"}catch(e){return"Member"}};
  const eur=c=>"€"+(Math.round(+c||0)/100).toFixed(2);
  const xpTotal=()=>{try{return +(V6.state().total)||0}catch(e){try{return +((Store.get("lc6-state-v1",{})||{}).total)||0}catch(x){return 0}}};
  const device=()=>{let d=rd("lc73-dev","");if(!/^[a-z0-9-]{8,40}$/.test(d)){d="d-"+Math.random().toString(36).slice(2,12)+Date.now().toString(36);wr("lc73-dev",d)}return d};
  async function stripeCall(path,body){
    const c=cfg();if(!c.url)return{ok:false,reason:"not_configured"};
    try{const r=await fetch(c.url+"/functions/v1/stripe/"+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body||{})});const j=await r.json().catch(()=>({}));j.status=r.status;return j}catch(e){return{ok:false,reason:"network",status:0}}
  }
  const WHY={sign_in:"Sign in first.",trial_used:"You already used your 7-day trial.",already_member:"You already have Pro.",no_offer:"This offer is not open for your account.",network:"No connection. Nothing was charged.",slow_down:"Too many tries. Wait a minute."};
  const go=u=>{try{LC36.support.go(u)}catch(e){location.href=u}};

  /* ============ source tracking (first touch) ============ */
  function srcRec(){try{const s=JSON.parse(localStorage.getItem("lc73-src")||"null");if(s&&typeof s==="object")return s}catch(e){}
    try{const m=/(?:^|;\s*)lc73_src=([^;]+)/.exec(document.cookie);if(m){const c=JSON.parse(decodeURIComponent(m[1]));if(c&&typeof c==="object")return c}}catch(e){}return null}   /* 9.38.0: a cookie copy as the fallback */
  async function track(){
    const today=new Date().toISOString().slice(0,10),s=srcRec()||{};
    if(rd("lc73-open-day","")!==today){wr("lc73-open-day",today);rpc("lc73_hit",{p:{kind:"app_open",device:s.device||device(),code:s.code||"",utm_source:s.utm_source||""}},true)}
    const se=sess();if(!se)return;
    if(rd("lc73-att","")===String(se.email).toLowerCase())return;
    const r=await rpc("lc73_attach",{p:Object.assign({device:s.device||device()},s)});if(r.data&&r.data.ok)wr("lc73-att",String(se.email).toLowerCase());
  }

  /* ============ 1. trial, reminder, rescue, referral discount ============ */
  let offC={at:0,d:null};
  async function offers(force){if(!sess())return null;if(!force&&offC.d&&Date.now()-offC.at<300000)return offC.d;const r=await rpc("lc73_my_offers",{});offC={at:Date.now(),d:r.data&&r.data.ok?r.data:null};return offC.d}
  function startTrial(){
    if(!sess()){sheet("Sign in first",'<p>The trial is tied to your account, so Pro switches on by itself on every device.</p><div class="btn-row"><a class="btn btn-primary" href="#account" data-close>Sign in</a></div>');return}
    sheet("Try Pro for 7 days",'<div class="lc73-trial"><p class="lc73-big">€0 today</p><ul><li>The whole library, the 24/7 coach, the MSPC engine and 10 tokens a day.</li><li>The coach chat with Kyenzo.</li><li>After 7 days Pro costs <b>€39 a month</b> until you cancel.</li><li>Your card is kept by Stripe (we never see it), so later purchases take one tap.</li><li>Cancel any time before day 8 in Account > Manage subscription and nothing is charged. We remind you 2 days before the trial ends.</li><li>Forgot to cancel? The month is not refunded, but within 14 days you can turn those €39 into €39 off the yearly plan.</li></ul>'
      +'<label class="lc70-check"><input type="checkbox" data-lc73-ok> <span>I want Pro to start right away. I understand: €0 today, then €39 a month from day 8 until I cancel. Because Pro starts at once, I give up my 14-day right of withdrawal for the paid months, so a payment that has gone through is not refunded.</span></label><div class="btn-row"><button type="button" class="btn btn-gold" data-lc73-go disabled>'+ic("lock")+' Start my 7-day trial</button></div><p class="form-msg" data-lc73-msg aria-live="polite"></p></div>',
      s=>{const ok=Q("[data-lc73-ok]",s.el),b=Q("[data-lc73-go]",s.el),msg=Q("[data-lc73-msg]",s.el);ok.addEventListener("change",()=>{b.disabled=!ok.checked});
        b.addEventListener("click",async()=>{b.disabled=true;msg.textContent="Opening secure checkout…";const j=await stripeCall("trial",{token:await tok(),device:device()});
          if(j.ok&&/^https:\/\/[a-z0-9.-]+\.stripe\.com\//i.test(j.url||"")){wr("lc72-auto-at",0);go(j.url);return}
          b.disabled=false;msg.textContent=WHY[j.reason]||"Checkout could not start. Nothing was charged. Still stuck? DM @lanckrietchess on Instagram."})});
  }
  async function rescue(){
    const j0=await offers(true);if(!j0||!j0.rescue){say(WHY.no_offer,"bad");return}
    const j=await stripeCall("rescue",{token:await tok(),device:device()});
    if(j.ok&&/^https:\/\/[a-z0-9.-]+\.stripe\.com\//i.test(j.url||"")){go(j.url);return}
    say(WHY[j.reason]||"Checkout could not start. Nothing was charged.","bad");
  }
  async function banners(){
    const r=route();if(!/^(home|quests|upgrades|account|system)$/.test(r))return;
    const v=Q("#view");if(!v||Q("#lc73-ban",v))return;
    const o=await offers();if(!o)return;
    let html="";
    if(o.rescue)html='<b>Your trial became Pro: €39 for this month.</b><span>Switch to the yearly plan now and those €39 come off your first year, so nothing is lost. Offer open until '+esc(new Date(o.rescue.until).toLocaleDateString("en-GB",{day:"numeric",month:"long"}))+'.</span><div class="btn-row"><button type="button" class="btn btn-gold" data-lc73="rescue">Switch to yearly, €39 off</button><button type="button" class="btn btn-ghost" data-lc73="portal">Manage subscription</button></div>';
    else if(o.trial&&o.trial.active&&new Date(o.trial.ends)-Date.now()<2*864e5&&rd("lc73-remind",0)!==new Date().toDateString())
      {wr("lc73-remind",new Date().toDateString());html='<b>Your Pro trial ends on '+esc(new Date(o.trial.ends).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"}))+'.</b><span>After that Pro costs €39 a month until you cancel, and a payment that has gone through is not refunded. Want to stop? Cancel in Manage subscription before then and nothing is charged.</span><div class="btn-row"><button type="button" class="btn btn-ghost" data-lc73="portal">Manage subscription</button></div>'}
    else if(o.discount&&r==="upgrades")html='<b>10% off '+(o.discount==="invitee"?"your first purchase":"your next purchase")+'.</b><span>'+(o.discount==="invitee"?"A friend invited you.":"A friend you invited became a customer.")+' The discount is applied at checkout from this page.</span>';
    else if(!o.had_trial&&r==="upgrades"){let tier=0;try{tier=+(await LC72.me()).tier||0}catch(e){}if(tier<2)html='<b>Try Pro for 7 days: €0 today.</b><span>Then €39 a month until you cancel. Cancel any time before day 7 and nothing is charged.</span><div class="btn-row"><button type="button" class="btn btn-gold" data-lc73="trial">Start my 7-day trial</button></div>'}
    if(!html)return;const b=document.createElement("section");b.id="lc73-ban";b.className="panel pad lc73-ban";b.innerHTML=html;v.insertAdjacentElement("afterbegin",b);
  }
  function portal(){try{const p=(window.__lcP||{}).portal;if(p){window.open(p,"_blank","noopener");return}}catch(e){}try{LC36.support.open("manage")}catch(e){location.hash="#account"}}
  /* plans and packs bought in the app get the referral discount through the API checkout (Payment Links cannot carry a personal discount) */
  async function discountCheckout(path,body){
    const o=await offers();if(!o||!o.discount)return false;
    const em=String((sess()||{}).email||"").toLowerCase();say("Opening secure checkout with your 10% discount…");
    const j=await stripeCall(path,Object.assign({email:em,token:await tok(),device:device()},body));
    if(j.ok&&/^https:\/\/[a-z0-9.-]+\.stripe\.com\//i.test(j.url||"")){go(j.url);return true}
    return false;
  }
  function packCheckout(id){if(!(offC.d&&offC.d.discount))return false;discountCheckout("tokens",{pack:id}).then(ok=>{if(!ok){try{const k=LC44.PACKS.filter(x=>x.id===id)[0];go(LC44._t.withMail(k.url,String((sess()||{}).email||"")))}catch(e){}}});return true}

  /* ============ 2. Priority Game Analysis ============ */
  function trimCard(){
    if(route()!=="trim")return;const v=Q("#view");if(!v||Q("#lc73-pga",v))return;const host=Q(".page-head",v)||v.firstElementChild;if(!host)return;
    const c=document.createElement("section");c.id="lc73-pga";c.className="panel pad lc73-pga";
    c.innerHTML='<div><p class="lc73-tag">Priority Game Analysis</p><b>Send a game to Kyenzo himself.</b><span class="small muted">A proud win or a painful loss: he reviews it personally. Good games can become social proof, instructive ones a lesson on YouTube or Shorts (only with your OK).</span></div><div class="btn-row"><button type="button" class="btn btn-gold btn-sm" data-lc73="review">Send a game</button><button type="button" class="btn btn-ghost btn-sm" data-lc73="my-reviews">My reviews</button></div>';
    host.insertAdjacentElement("afterend",c);
  }
  function currentPgn(){try{const a=Q("#an-import textarea")||Q("textarea[name=pgn]");if(a&&a.value.trim().length>10)return a.value.trim()}catch(e){}try{const g=rd("lc42-games",null);const l=Array.isArray(g)?g:(g&&g.games)||[];const x=l[0];return x&&(x.pgn||"")||""}catch(e){return""}}
  async function reviewSheet(){
    if(!sess()){say("Sign in first.","bad");return}
    let price=20;try{price=+((await LC72.me())||{}).review_tokens||20}catch(e){}
    sheet("Priority Game Analysis",'<form class="stack" data-lc73-rev novalidate><label class="field"><span class="field-label">The game (PGN)</span><textarea class="input" name="pgn" rows="6" maxlength="20000" placeholder="[Event &quot;Rapid&quot;] 1. e4 c6 …">'+esc(currentPgn())+'</textarea></label>'
      +'<label class="field"><span class="field-label">What kind of game?</span><select class="input" name="kind"><option value="learn">I want to learn from it</option><option value="proud">I am proud of this one</option></select></label>'
      +'<label class="field"><span class="field-label">Your question or what you were thinking (optional)</span><textarea class="input" name="note" rows="3" maxlength="800"></textarea></label>'
      +'<label class="lc70-check"><input type="checkbox" name="pub"> <span>Kyenzo may review this game in a public video (YouTube, Shorts, Reels).</span></label>'
      +'<label class="lc70-check"><input type="checkbox" name="nm"> <span>He may mention my first name.</span></label>'
      +'<label class="lc70-check"><input type="checkbox" name="age"> <span>I am 16 or older, or a parent agrees.</span></label>'
      +'<p class="small muted">Price: <b>'+price+' tokens</b>. You get the review in the coach chat. Without the first box the review stays private.</p><div class="btn-row"><button class="btn btn-gold" type="submit">'+ic("coins")+" Send for "+price+' tokens</button></div><p class="form-msg" aria-live="polite"></p></form>',
      s=>{const f=Q("[data-lc73-rev]",s.el),msg=Q(".form-msg",f);f.addEventListener("submit",async e=>{e.preventDefault();const E=f.elements;
        if(E.pgn.value.trim().length<10){msg.textContent="Paste the game first.";return}if(E.pub.checked&&!E.age.checked){msg.textContent="A public review needs the age box.";return}
        const b=Q("button[type=submit]",f);b.disabled=true;msg.textContent="Paying…";const ref="lc73-rev-"+Date.now();
        let paid=true;if(!owner()){for(let k=0;k*10<price;k++){let r=null;try{r=await Quota.call("token_spend",{kind:"wallet",n:Math.min(10,price-k*10),ref:ref+"-"+k})}catch(x){}if(!r||r.status!==200||r.ok!==true){paid=false;break}}}
        if(!paid){b.disabled=false;msg.innerHTML='Not enough tokens. <button type="button" class="btn btn-ghost btn-sm" data-lc44-open>Get tokens</button>';return}
        const r=await rpc("lc73_review_submit",{p:{pgn:E.pgn.value,kind:E.kind.value,note:E.note.value,consent_public:E.pub.checked,consent_name:E.nm.checked,age_ok:E.age.checked,tokens:price,ref:ref,name:myName()}});
        try{Quota.refresh()}catch(x){}
        if(r.data&&r.data.ok){s.close();say("Sent. Kyenzo answers in the coach chat.","good")}else{b.disabled=false;msg.textContent=missing(r)?"The review desk is not installed yet (SQL). Your tokens: DM @lanckrietchess.":"Could not send it. Your tokens were used: DM @lanckrietchess with ref "+ref}})});
  }
  async function myReviews(){const r=await rpc("lc73_review_mine",{});const l=(r.data&&r.data.rows)||[];
    sheet("My Priority Game Reviews",l.length?'<ul class="lc73-list">'+l.map(x=>'<li><b>'+esc({new:"Waiting",reviewing:"Kyenzo is on it",done:"Ready",published:"Published",declined:"Declined"}[x.status]||x.status)+"</b> · "+esc(new Date(x.created).toLocaleDateString("en-GB"))+(x.answer?"<p>"+esc(x.answer)+"</p>":"")+(x.video?'<a class="btn btn-ghost btn-sm" href="'+esc(x.video)+'" target="_blank" rel="noopener noreferrer">Watch</a>':"")+"</li>").join("")+"</ul>":'<p class="muted">No reviews yet.</p>')}
  async function reviewQueue(st){
    const r=await rpc("lc73_review_queue",{p_status:st||"open"});const l=(r.data&&r.data.rows)||[];
    sheet("Priority Game Reviews",'<div class="lc70-filter">'+[["open","Open"],["done","Done"],["published","Published"],["all","All"]].map(x=>'<button type="button" class="lc70-f'+((st||"open")===x[0]?" is-on":"")+'" data-lc73="rq" data-s="'+x[0]+'">'+x[1]+"</button>").join("")+"</div>"
      +(missing(r)?'<p class="lc70-warn">Run the 9.37.0 SQL file first.</p>':l.length?l.map(x=>'<form class="panel pad stack lc73-rq" data-lc73-rq="'+x.id+'"><b>'+esc(x.name)+(x.code?' <span class="lc72-t is-'+x.code+'">'+esc({S:"Student",A:"Apprentice",C:"Coach"}[x.code])+"</span>":"")+'</b><small class="muted">'+esc(x.kind==="proud"?"Proud of it":"To learn from")+" · "+esc(x.tokens)+" tokens · public video: "+(x.consent_public?"yes":"no")+", name: "+(x.consent_name?"yes":"no")+", 16+/parent: "+(x.age_ok?"yes":"no")+'</small>'+(x.note?"<p>“"+esc(x.note)+"”</p>":"")
        +'<textarea class="input" readonly rows="3">'+esc(x.pgn)+'</textarea><textarea class="input" name="answer" rows="4" placeholder="Your review (the member sees it in the coach chat)">'+esc(x.answer||"")+'</textarea><input class="input" name="video" placeholder="Video link (optional, https://…)" value="'+esc(x.video_url||"")+'"><div class="btn-row"><button class="btn btn-ghost btn-sm" type="submit" name="st" value="reviewing">Working on it</button><button class="btn btn-primary btn-sm" type="submit" name="st" value="done">Send review</button>'+(x.consent_public?'<button class="btn btn-gold btn-sm" type="submit" name="st" value="published">Published</button>':"")+'<button class="btn btn-quiet btn-sm" type="submit" name="st" value="declined">Decline</button></div></form>').join(""):'<p class="muted">Nothing waiting.</p>'),
      s=>{s.el.addEventListener("submit",async e=>{const f=e.target.closest("[data-lc73-rq]");if(!f)return;e.preventDefault();const st2=(e.submitter&&e.submitter.value)||"done";
        const r2=await rpc("lc73_review_set",{p_id:+f.getAttribute("data-lc73-rq"),p:{status:st2,answer:f.elements.answer.value,video:f.elements.video.value}});say(r2.data&&r2.data.ok?"Saved"+(st2==="done"||st2==="published"?": the member got your review in the coach chat.":"."):"Could not save.",r2.data&&r2.data.ok?"good":"bad");if(r2.data&&r2.data.ok)f.remove()})});
  }

  /* ============ 3. chat requests and blocks (community) ============ */
  async function dmPanel(){
    if(route()!=="community"||!sess())return;const v=Q("#view");if(!v||Q("#lc73-dm",v))return;
    const box=document.createElement("details");box.id="lc73-dm";box.className="panel pad lc73-dm";v.insertAdjacentElement("afterbegin",box);
    const r=await rpc("lc73_dm_requests",{});if(!r.data||!r.data.ok){box.remove();return}const req=r.data.rows||[];
    box.innerHTML='<summary><b>'+ic("envelope")+" Message requests"+(req.length?' <span class="lc72-badge">'+req.length+"</span>":"")+'</b><small class="muted">Nobody can send you private messages until you accept. Block anybody who bothers you.</small></summary><div data-lc73-dmbody></div>';
    if(req.length)box.open=true;paintDm(box,req);
  }
  async function paintDm(box,req){
    const body=Q("[data-lc73-dmbody]",box);if(!body)return;
    if(!req){const r=await rpc("lc73_dm_requests",{});req=(r.data&&r.data.rows)||[]}
    const t=await (async()=>{try{return await Quota.call("c46_dm_threads",{})}catch(e){return null}})(),bl=await rpc("lc73_blocked_list",{});
    body.innerHTML=(req.length?req.map(x=>'<div class="lc73-req"><p><b>'+esc(x.name)+'</b> wants to send you a message. Accept the chat?'+(x.first?'<small class="muted">“'+esc(x.first)+'”</small>':"")+'</p><div class="btn-row"><button type="button" class="btn btn-primary btn-sm" data-lc73="dm-yes" data-u="'+esc(x.with)+'">Accept</button><button type="button" class="btn btn-ghost btn-sm" data-lc73="dm-no" data-u="'+esc(x.with)+'">Decline</button><button type="button" class="btn btn-quiet btn-sm" data-lc73="block" data-u="'+esc(x.with)+'">Block</button></div></div>').join(""):'<p class="small muted">No open requests.</p>')
      +((t&&t.threads||[]).length?'<h4>Your chats</h4>'+(t.threads||[]).map(x=>'<div class="lc73-req"><p><b>'+esc(String(x.name||"").replace(/\u2063./g,""))+"</b>"+(x.pending?' <small class="muted">waiting for them to accept</small>':"")+'</p><button type="button" class="btn btn-quiet btn-sm" data-lc73="block" data-u="'+esc(x.with)+'">Block</button></div>').join(""):"")
      +((bl.data&&bl.data.rows||[]).length?'<h4>Blocked</h4>'+bl.data.rows.map(x=>'<div class="lc73-req"><p>'+esc(x.name)+'</p><button type="button" class="btn btn-ghost btn-sm" data-lc73="unblock" data-u="'+esc(x.with)+'">Unblock</button></div>').join(""):"");
  }
  async function bansSheet(){const r=await rpc("lc73_spam_list",{});const l=(r.data&&r.data.rows)||[];
    sheet("Chat bans (blocked by 3 people in a week)",'<p class="small muted">Level 1 = 1 week, 2 = 1 month, 3 = 1 year, 4 = permanent. Check before you lift one: blocks can also be a group targeting somebody.</p>'+(l.length?'<ul class="lc73-list">'+l.map(x=>'<li><b>'+esc(x.name)+"</b> · level "+x.level+" · blocked by "+x.blocks+' people <button type="button" class="btn btn-ghost btn-sm" data-lc73="unban" data-u="'+esc(x.uid)+'">Lift one level</button></li>').join("")+"</ul>":'<p class="muted">No bans.</p>'))}

  /* ============ 4. rivals and tribes ============ */
  function weekXp(){const wk=(()=>{const d=new Date(),k=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-k);return d.toISOString().slice(0,10)})(),tot=xpTotal();let s=rd("lc73-wk",null);
    if(!s||s.week!==wk){s={week:wk,base:tot};wr("lc73-wk",s)}return Math.max(0,tot-(+s.base||0))}
  async function reportXp(){if(!sess())return;const last=+rd("lc73-xp-at",0)||0;if(Date.now()-last<600000)return;wr("lc73-xp-at",Date.now());await rpc("lc73_xp_report",{p_xp:weekXp()})}
  function mountRivals(view){view.innerHTML='<section class="lc73-riv" data-lc73-riv><p class="muted">Loading…</p></section>';paintRivals();return null}
  async function paintRivals(){
    const host=Q("[data-lc73-riv]");if(!host)return;
    if(!sess()){host.innerHTML='<div class="panel pad"><h1>Rivals & Tribes</h1><p>Sign in first: rivals and tribes are tied to your account.</p><a class="btn btn-primary" href="#account">Sign in</a></div>';return}
    await rpc("lc73_xp_report",{p_xp:weekXp()});wr("lc73-xp-at",Date.now());
    const [h,t]=await Promise.all([rpc("lc73_hub_list",{}),rpc("lc73_tribe_mine",{})]);const H=h.data||{},T=t.data||{};
    if(missing(h)){host.innerHTML='<div class="panel pad"><h1>Rivals & Tribes</h1><p class="muted">Opens soon.</p></div>';return}
    const riv=H.rivals||[],inc=riv.filter(x=>x.status==="pending"&&!x.mine),mine=riv.filter(x=>x.status==="ok"),out=riv.filter(x=>x.status==="pending"&&x.mine);
    wr("lc73-has-rival",mine.length>0);
    try{const top=Math.max.apply(null,mine.map(x=>+x.xp||0));if(mine.length&&(+H.my_xp||0)>=200&&(+H.my_xp||0)>top)wr("lc73-beat",(()=>{const d=new Date(),k=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-k);return d.toISOString().slice(0,10)})())}catch(e){}   /* LC74 congratulates once per week */
    let elo="";try{elo=+(App.profile&&App.profile.elo)||""}catch(e){}
    host.innerHTML='<h1>Rivals & Tribes</h1><p class="muted">Your rival keeps you honest: same week, same work, one leaderboard. This week you trained <b>'+weekXp()+' XP</b>.</p>'
      +'<section class="panel pad"><h2>Your rivals</h2>'+(inc.length?inc.map(x=>'<div class="lc73-req"><p><b>'+esc(x.name)+'</b> wants to be your rival.</p><div class="btn-row"><button type="button" class="btn btn-primary btn-sm" data-lc73="riv-yes" data-u="'+esc(x.uid)+'">Accept</button><button type="button" class="btn btn-ghost btn-sm" data-lc73="riv-no" data-u="'+esc(x.uid)+'">No thanks</button></div></div>').join(""):"")
      +(mine.length?'<ol class="lc73-board"><li class="is-me"><b>You</b><span>'+(H.my_xp||0)+' XP</span></li>'+mine.map(x=>'<li><b>'+esc(x.name)+"</b><span>"+(+x.xp||0)+" XP</span></li>").join("")+"</ol>":'<p class="muted">No rival yet. Pick one below or invite a friend.</p>')
      +(out.length?'<p class="small muted">Waiting for: '+out.map(x=>esc(x.name)).join(", ")+"</p>":"")
      +'<div class="btn-row"><a class="btn btn-ghost btn-sm" href="#refer">'+ic("user-plus")+' Invite a friend as your rival</a></div><p class="small muted">Your friend gets 10% off their first purchase; you get 10% off your next purchase when they buy (use your 10% link on the Refer a Friend page).</p></section>'
      +'<section class="panel pad"><h2>Looking for a Rival</h2>'+(H.me&&H.me.active?'<p class="small">You are on the list'+(H.me.rating?" at "+esc(H.me.rating):"")+'. <button type="button" class="btn btn-quiet btn-sm" data-lc73="hub-off">Leave the list</button></p>'
        :'<form class="lc73-hub" data-lc73-hub><input class="input" name="rating" type="number" min="100" max="3000" placeholder="Your Rapid rating" value="'+esc(elo)+'"><input class="input" name="note" maxlength="140" placeholder="One line: what you train, when you play"><button class="btn btn-primary" type="submit">Put me on the list</button></form>')
      +((H.rows||[]).length?'<ul class="lc73-list">'+H.rows.map(x=>'<li><b>'+esc(x.name)+"</b>"+(x.rating?" · "+esc(x.rating):"")+(x.note?'<small class="muted">'+esc(x.note)+"</small>":"")+(x.rival?'<span class="lc72-pill">'+(x.rival==="ok"?"Your rival":"Asked")+"</span>":'<button type="button" class="btn btn-ghost btn-sm" data-lc73="riv-ask" data-u="'+esc(x.uid)+'">Challenge</button>')+"</li>").join("")+"</ul>":'<p class="small muted">Nobody else on the list right now.</p>')+"</section>"
      +'<section class="panel pad"><h2>Your Tribe</h2>'+(T.tribe?'<p><b>'+esc(T.tribe.name)+'</b> · code <code>'+esc(T.tribe.code)+'</code> · tribe score this week <b>'+T.tribe.score+'</b> (average XP)</p><ol class="lc73-board">'+(T.members||[]).map(x=>'<li class="'+(x.me?"is-me":"")+'"><b>'+esc(x.name)+"</b><span>"+x.xp+" XP</span></li>").join("")+"</ol>"
        +(T.war?'<div class="lc73-war"><p class="lc73-tag">Tribe War this week</p><p><b>'+esc(T.tribe.name)+"</b> "+T.tribe.score+' vs <b>'+esc(T.war.name)+"</b> "+T.war.score+'</p><p class="small muted">Highest average weekly XP wins. Pairs are made from last week’s scores.</p></div>':'<p class="small muted">Tribe Wars start when another tribe with 2 or more members exists.</p>')
        +'<div class="btn-row"><button type="button" class="btn btn-quiet btn-sm" data-lc73="tribe-leave">Leave the tribe</button></div>'
        :'<p class="muted">A tribe is up to 12 players who are each other’s rivals, with one weekly leaderboard and a war against another tribe.</p><form class="lc73-hub" data-lc73-tc><input class="input" name="name" maxlength="30" placeholder="Tribe name"><button class="btn btn-primary" type="submit">Create a tribe</button></form><form class="lc73-hub" data-lc73-tj><input class="input" name="code" maxlength="6" placeholder="Join with a code" style="text-transform:uppercase"><button class="btn btn-ghost" type="submit">Join</button></form>')
      +((T.board||[]).length?'<h3>All tribes this week</h3><ol class="lc73-board">'+T.board.map(x=>'<li class="'+(x.mine?"is-me":"")+'"><b>'+esc(x.name)+"</b><span>"+x.score+" · "+x.members+" members</span></li>").join("")+"</ol>":"")+"</section>"
      +'<details class="panel pad lc73-old"><summary><b>Your rival list by name and your club groups</b></summary><div data-lc73-old></div></details>';
    try{const old=Q("[data-lc73-old]",host);if(old&&oldMount)oldMount(old)}catch(e){}   /* the earlier Rivals and groups page (LC19) stays available here */
  }
  async function roadStep(){
    if(route()!=="quests")return;const st=Q("#view .lc69-steps");if(!st||Q("[data-lc73-step]",st))return;
    const done=!!rd("lc73-has-rival",false);const li=document.createElement("li");li.setAttribute("data-lc73-step","");if(done)li.className="ok";
    li.innerHTML='<span class="lc69-ck" aria-hidden="true">'+(done?"✓":"1")+'</span><span><b>Find a Rival</b><small>Invite a friend or pick one from Looking for a Rival</small></span>'+(done?"":'<a class="btn btn-primary btn-sm" href="#rivals">Find a Rival</a>');
    st.insertAdjacentElement("afterbegin",li);
  }

  /* ============ 5. analytics, short links, partners ============ */
  let dash={range:rd("lc73-range","30"),from:"",to:"",all:!!rd("lc73-all",false)};
  const PLAT=[["instagram","ig"],["tiktok","tk"],["youtube","yt"],["facebook","fb"],["reddit","rd"],["x","x"],["direct","dm"],["other","ot"]],TYPE=[["b","Bio"],["c","Comment"],["p","Post"],["d","Description"],["s","Story"],["v","Video"]];
  function rangeOf(){const d=new Date(),iso=x=>x.toISOString().slice(0,10);if(dash.all)return{all:true};
    if(dash.range==="today")return{from:iso(d),to:iso(d)};if(dash.range==="7")return{from:iso(new Date(Date.now()-6*864e5)),to:iso(d)};if(dash.range==="month")return{from:iso(new Date(d.getFullYear(),d.getMonth(),1,12)),to:iso(d)};
    if(dash.range==="custom"&&dash.from&&dash.to)return{from:dash.from,to:dash.to};
    if(dash.range==="180")return{from:iso(new Date(Date.now()-179*864e5)),to:iso(d)};if(dash.range==="year")return{from:iso(new Date(d.getFullYear(),0,1,12)),to:iso(d)};return{from:iso(new Date(Date.now()-29*864e5)),to:iso(d)}}
  function mountDash(view){view.innerHTML='<section class="lc73-dash" data-lc73-dash><p class="muted">Loading…</p></section>';paintDash();return null}
  const pct=(a,b)=>b>0?Math.round(a/b*1000)/10:null;
  async function paintDash(){
    const host=Q("[data-lc73-dash]");if(!host)return;const lite=host.hasAttribute("data-lc73-lite");
    if(lite){dash.range=rd("lc73-range","30");dash.all=!!rd("lc73-all",false)}
    if(!sess()){host.innerHTML='<div class="panel pad"><p>Sign in first.</p></div>';return}
    const r=await rpc("lc73_dash",{p:rangeOf()});const d=r.data||{};
    if(missing(r)){host.innerHTML='<div class="panel pad"><b>Run sql/20261113100000_lc72_lc73_launch_funnels.sql first.</b></div>';return}
    if(!d.ok){host.innerHTML='<div class="panel pad"><h1>Analytics</h1><p class="muted">This dashboard is for the owner and business partners.</p></div>';return}
    const F=d.funnel||{},K=d.kpis||{},P=d.paid||{},R=d.retention||{},L=d.lifetime||{};
    const steps=[["views","Views",null],["visits","Landing visits","view_to_visit"],["installs","Installs / app opens","visit_to_install"],["signups","Sign-ups","install_to_signup"],["cards","Card captured (trial)","signup_to_card"],["paying","Paying customers","card_to_paid"]];
    const stepHTML=steps.map((s,i)=>{const v=+F[s[0]]||0,prev=i?(+F[steps[i-1][0]]||0):0,c=i?pct(v,prev):null,tg=s[2]?+K[s[2]]:null,cls=c==null||tg==null?"":c<tg*.7?" is-red":c<tg?" is-orange":" is-green";
      return'<div class="lc73-step'+cls+'"><b>'+v.toLocaleString("en-GB")+"</b><span>"+s[1]+"</span>"+(c!=null?'<small>'+c+"%"+(tg!=null?" · target "+tg+"%":"")+"</small>":"")+"</div>"}).join("");
    const tree={};(d.links||[]).forEach(l=>{(tree[l.platform]=tree[l.platform]||[]).push(l)});
    const sum=(a,k)=>a.reduce((n,x)=>n+(+x[k]||0),0),base=location.origin+"/l/";
    const ltv=+L.customers?Math.round((+L.revenue||0)/(+L.customers)):0;
    const full='<header class="lc73-dh"><div><p class="lc73-tag">'+(d.admin?"Owner":"Partner")+'</p><h1>Analytics</h1></div><div class="lc70-filter">'+[["today","Today"],["7","7 days"],["30","30 days"],["month","This month"],["custom","Custom"]].map(x=>'<button type="button" class="lc70-f'+(!dash.all&&dash.range===x[0]?" is-on":"")+'" data-lc73="rng" data-r="'+x[0]+'">'+x[1]+"</button>").join("")+'<button type="button" class="lc70-f lc73-all'+(dash.all?" is-on":"")+'" data-lc73="all" aria-pressed="'+dash.all+'">All-time</button></div></header>'
      +(dash.range==="custom"&&!dash.all?'<form class="lc73-hub" data-lc73-cr><input class="input" type="date" name="f" value="'+esc(dash.from)+'"><input class="input" type="date" name="t" value="'+esc(dash.to)+'"><button class="btn btn-primary btn-sm" type="submit">Show</button></form>':"")
      +'<section class="lc73-life"><div><b>'+eur(L.revenue)+'</b><span>Lifetime revenue</span></div><div><b>'+(+L.customers||0)+'</b><span>Lifetime buyers</span></div><div><b>'+eur(ltv)+'</b><span>Value per buyer (LTV)</span></div><div><b>'+(+L.repeat||0)+'</b><span>Bought more than once</span></div><div><b>'+(+L.upsell||0)+'</b><span>Bought 2+ kinds (upsell)</span></div></section>'
      +'<h2>Funnel'+(dash.all?" (all time)":"")+'</h2><div class="lc73-funnel">'+stepHTML+"</div>"
      +'<h2>Paid in this period</h2><div class="lc73-grid"><div><b>'+eur(P.revenue_cents)+'</b><span>Revenue (API checkouts, packs, library)</span></div><div><b>'+(+P.subs_pro||0)+'</b><span>Pro subscriptions</span></div><div><b>'+(+P.subs_vip||0)+'</b><span>VIP subscriptions</span></div><div><b>'+(+P.token_packs||0)+'</b><span>Token packs</span></div><div><b>'+(+P.courses||0)+'</b><span>Courses</span></div><div><b>'+(+P.books||0)+'</b><span>E-books and summaries</span></div></div>'
      +'<h2>Retention</h2><div class="lc73-grid"><div><b>'+(+R.active||0)+'</b><span>Active Pro/VIP now</span></div><div><b>'+(+R.renewals||0)+'</b><span>Renewals</span></div><div><b>'+(+R.lapsed||0)+'</b><span>Lapsed (churn)</span></div><div><b>'+(pct(+R.renewals||0,(+R.renewals||0)+(+R.lapsed||0))??"–")+'%</b><span>Renewal rate</span></div><div><b>'+(+R.trial_converted||0)+'</b><span>Trials converted</span></div><div><b>'+(+R.trial_cancelled||0)+'</b><span>Trials cancelled</span></div></div>'
      ;const linksPart='<h2>Links per platform</h2>'+Object.keys(tree).sort().map(p=>{const l=tree[p];return'<details class="lc73-tree"><summary><b>'+esc(p)+'</b><span>'+sum(l,"clicks")+" clicks · "+sum(l,"visits")+" visits · "+sum(l,"signups")+" sign-ups · "+sum(l,"paying")+" paying"+(sum(l,"clicks")?" · "+pct(sum(l,"paying"),sum(l,"clicks"))+"% to paying":"")+'</span></summary><table class="lc73-t"><thead><tr><th>Link</th><th>Clicks</th><th>Visits</th><th>Installs</th><th>Sign-ups</th><th>Paying</th><th>Conv.</th><th></th></tr></thead><tbody>'
        +l.map(x=>'<tr'+(x.active?"":' class="is-off"')+'><td><code>/l/'+esc(x.code)+'</code><small>'+esc(x.label)+'</small></td><td>'+x.clicks+"</td><td>"+x.visits+"</td><td>"+x.installs+"</td><td>"+x.signups+"</td><td>"+x.paying+"</td><td>"+(pct(x.paying,x.clicks)??"–")+'%</td><td><button type="button" class="btn btn-ghost btn-sm" data-lc73="copy" data-u="'+esc(base+x.code)+'">Copy</button>'+(d.admin&&x.active?'<button type="button" class="btn btn-quiet btn-sm" data-lc73="link-off" data-c="'+esc(x.code)+'">Stop</button>':"")+"</td></tr>").join("")+"</tbody></table></details>"}).join("")
      +'<form class="panel pad lc73-mk" data-lc73-link><h3>New short link</h3><div class="lc73-mkrow"><select class="input" name="pl">'+PLAT.map(x=>'<option value="'+x[0]+'">'+x[0]+"</option>").join("")+'</select><select class="input" name="ty">'+TYPE.map(x=>'<option value="'+x[0]+'">'+x[1]+"</option>").join("")+'</select><input class="input" name="code" maxlength="24" placeholder="code (auto)"><input class="input" name="label" maxlength="80" placeholder="Label, e.g. Reddit post r/chess"><select class="input" name="dest"><option value="/">Landing page</option><option value="/app.html">The app</option><option value="/#pricing">Prices</option></select></div><div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-lc73="suggest">Suggest a code</button><button class="btn btn-primary btn-sm" type="submit">Create link</button></div><p class="small muted">The link is '+esc(base)+'<i>code</i>. It remembers the source on that device, so sign-ups and purchases are counted for the link.</p></form>'
      +'<h2>Sources of sign-ups</h2><ul class="lc73-list">'+Object.keys(d.sources||{}).map(k=>"<li><b>"+esc(k)+"</b> · "+d.sources[k]+"</li>").join("")+"</ul>"
      +'<form class="panel pad" data-lc73-views><h3>Views per channel</h3><div class="lc73-mkrow"><input class="input" name="ch" maxlength="30" placeholder="tiktok"><input class="input" type="date" name="f"><input class="input" type="date" name="t"><input class="input" type="number" name="v" min="0" placeholder="Views"><button class="btn btn-primary btn-sm" type="submit">Add</button></div><ul class="lc73-list">'+(d.views||[]).map(v=>"<li><b>"+esc(v.channel)+"</b> "+esc(v.period_start)+" → "+esc(v.period_end)+": "+(+v.views).toLocaleString("en-GB")+' <button type="button" class="btn btn-quiet btn-sm" data-lc73="view-del" data-id="'+v.id+'">×</button></li>').join("")+"</ul></form>"
      ;const kpiPart=(d.admin?'<form class="panel pad" data-lc73-kpi><h3>KPI targets (%)</h3><div class="lc73-mkrow">'+steps.slice(1).map(s=>'<label class="field"><span class="field-label">'+s[1]+'</span><input class="input" type="number" step="0.1" min="0" max="100" name="'+s[2]+'" value="'+esc(K[s[2]]??"")+'"></label>').join("")+'<label class="field"><span class="field-label">Sign-up to paying</span><input class="input" type="number" step="0.1" name="signup_to_paid" value="'+esc(K.signup_to_paid??"")+'"></label></div><p class="small muted">A step below its target turns orange, below 70% of it red.</p><button class="btn btn-primary btn-sm" type="submit">Save targets</button></form>':"")
      ;const partPart=(d.admin?'<form class="panel pad" data-lc73-partner><h3>Business partners</h3><p class="small muted">A partner signs in with this e-mail and sees only the people who came through their link codes.</p><div class="lc73-mkrow"><input class="input" name="em" type="email" placeholder="partner@email.com"><input class="input" name="nm" placeholder="Name"><input class="input" name="codes" placeholder="codes, comma separated"><button class="btn btn-primary btn-sm" type="submit">Save</button></div><ul class="lc73-list">'+(d.partners||[]).map(x=>"<li><b>"+esc(x.name||x.email)+"</b> "+esc(x.email)+" · "+esc((x.codes||[]).join(", "))+"</li>").join("")+"</ul></form>":"")
      ;host.innerHTML=lite?linksPart+partPart:full+linksPart+kpiPart+partPart+'<p class="small muted">Revenue counts API checkouts, token packs and library sales. Payment-Link subscriptions show up under Active Pro/VIP and in Stripe. Views are what you type in. Numbers are a guide, not accounting.</p>';
  }
  function suggest(f){const pl=f.elements.pl.value,ty=f.elements.ty.value,pre=(PLAT.filter(x=>x[0]===pl)[0]||["","ot"])[1]+ty;let n=1;const have=QA("[data-lc73-dash] code").map(c=>c.textContent.replace("/l/",""));let c=pre;while(have.indexOf(c)>=0){n++;c=pre+n}f.elements.code.value=c}

  /* ============ events ============ */
  async function onClick(e){
    const t=e.target;if(!t||!t.closest)return;
    const own=t.closest("[data-lc73-own]");if(own){e.preventDefault();e.stopPropagation();try{const m=Q("#lc49-menu");if(m)m.remove()}catch(x){}const k=own.getAttribute("data-lc73-own");if(k==="reviews")reviewQueue();else if(k==="bans")bansSheet();else location.hash="#analytics";return}
    const pk=t.closest("[data-lc44-pack]");if(pk&&offC.d&&offC.d.discount&&!t.closest("[data-lc72-pack]")){e.preventDefault();e.stopPropagation();packCheckout(pk.getAttribute("data-lc44-pack"));return}
    const b=t.closest("[data-lc73]");if(!b)return;const a=b.getAttribute("data-lc73"),u=b.getAttribute("data-u");
    if(a==="trial"){startTrial();return}if(a==="rescue"){rescue();return}if(a==="portal"){portal();return}
    if(a==="review"){reviewSheet();return}if(a==="my-reviews"){myReviews();return}if(a==="rq"){const s=Q(".lc73-sheet");try{s&&s.closest(".sheet-wrap").remove()}catch(x){}reviewQueue(b.getAttribute("data-s"));return}
    if(a==="dm-yes"||a==="dm-no"){await rpc("lc73_dm_answer",{p_peer:u,p_accept:a==="dm-yes"});say(a==="dm-yes"?"Accepted: you can chat now.":"Declined.","good");paintDm(Q("#lc73-dm"));return}
    if(a==="block"||a==="unblock"){if(a==="block"&&!window.confirm("Block this person? They cannot message you any more."))return;await rpc("lc73_block",{p_peer:u,p_on:a==="block"});say(a==="block"?"Blocked.":"Unblocked.","good");const d=Q("#lc73-dm");if(d)paintDm(d);return}
    if(a==="unban"){await rpc("lc73_unban",{p_uid:u});say("Lifted one level.","good");return}
    if(a==="riv-ask"){const r=await rpc("lc73_rival_ask",{p_uid:u});say(r.data&&r.data.status==="ok"?"You are rivals now.":"Challenge sent.","good");paintRivals();return}
    if(a==="riv-yes"||a==="riv-no"){await rpc("lc73_rival_answer",{p_uid:u,p_ok:a==="riv-yes"});paintRivals();return}
    if(a==="hub-off"){await rpc("lc73_hub_join",{p:{name:myName(),active:false}});paintRivals();return}
    if(a==="tribe-leave"){if(!window.confirm("Leave your tribe?"))return;await rpc("lc73_tribe_leave",{});paintRivals();return}
    if(a==="rng"){dash.all=false;wr("lc73-all",false);dash.range=b.getAttribute("data-r");wr("lc73-range",dash.range);paintDash();return}
    if(a==="all"){dash.all=!dash.all;wr("lc73-all",dash.all);paintDash();return}
    if(a==="copy"){try{await navigator.clipboard.writeText(u);say("Copied: "+u,"good")}catch(x){window.prompt("Copy the link:",u)}return}
    if(a==="link-off"){await rpc("lc73_link_del",{p_code:b.getAttribute("data-c")});paintDash();return}
    if(a==="view-del"){await rpc("lc73_views_save",{p:{delete:b.getAttribute("data-id")}});paintDash();return}
    if(a==="suggest"){suggest(b.closest("form"));return}
  }
  async function onSubmit(e){
    const f=e.target;if(!f||!f.matches)return;const E=f.elements;
    if(f.matches("[data-lc73-hub]")){e.preventDefault();const r=await rpc("lc73_hub_join",{p:{name:myName(),rating:E.rating.value,note:E.note.value,active:true}});say(r.data&&r.data.ok?"You are on the list.":"Could not save.",r.data&&r.data.ok?"good":"bad");paintRivals();return}
    if(f.matches("[data-lc73-tc]")){e.preventDefault();const r=await rpc("lc73_tribe_create",{p_name:E.name.value,p_me:myName()});const d=r.data||{};say(d.ok?"Tribe created. Share the code "+d.code+" with your friends.":{name:"Pick another name (3 to 30 characters).",taken:"That name is taken.",already:"Leave your tribe first."}[d.error]||"Could not create it.",d.ok?"good":"bad");paintRivals();return}
    if(f.matches("[data-lc73-tj]")){e.preventDefault();const r=await rpc("lc73_tribe_join",{p_code:E.code.value,p_me:myName()});const d=r.data||{};say(d.ok?"Welcome to "+d.tribe+".":{code:"No tribe with that code.",full:"That tribe is full (12)."}[d.error]||"Could not join.",d.ok?"good":"bad");paintRivals();return}
    if(f.matches("[data-lc73-cr]")){e.preventDefault();dash.from=E.f.value;dash.to=E.t.value;paintDash();return}
    if(f.matches("[data-lc73-link]")){e.preventDefault();if(!E.code.value)suggest(f);const r=await rpc("lc73_link_save",{p:{code:E.code.value.toLowerCase(),platform:E.pl.value,label:E.label.value,dest:E.dest.value}});const d=r.data||{};
      if(d.ok){try{await navigator.clipboard.writeText(location.origin+"/l/"+d.code)}catch(x){}say("Link ready and copied: "+location.origin+"/l/"+d.code,"good");paintDash()}else say({code:"Use 2 to 24 letters, digits or -.",taken:"That code is taken.",forbidden:"Only the owner and partners can make links."}[d.error]||"Could not create it.","bad");return}
    if(f.matches("[data-lc73-views]")){e.preventDefault();const r=await rpc("lc73_views_save",{p:{channel:E.ch.value,from:E.f.value,to:E.t.value,views:E.v.value}});say(r.data&&r.data.ok?"Saved.":"Fill in channel, both dates and the views.",r.data&&r.data.ok?"good":"bad");paintDash();return}
    if(f.matches("[data-lc73-kpi]")){e.preventDefault();const p={};QA("input",f).forEach(i=>{if(i.value!=="")p[i.name]=+i.value});await rpc("lc73_kpi_set",{p:p});say("Targets saved.","good");paintDash();return}
    if(f.matches("[data-lc73-partner]")){e.preventDefault();const r=await rpc("lc73_partner_set",{p:{email:E.em.value,name:E.nm.value,codes:E.codes.value.split(",").map(x=>x.trim()).filter(Boolean)}});say(r.data&&r.data.ok?"Partner saved.":"Check the e-mail address.",r.data&&r.data.ok?"good":"bad");paintDash();return}
  }
  function ownerRows(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc73-own]",m)||!owner())return;const ref=Q("[data-lc72-own]",m)||Q("[data-lc59-admin]",m);if(!ref)return;
    const mk=(k,t,s)=>{const b=document.createElement("button");b.type="button";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc73-own",k);b.innerHTML="<span><b>"+t+"</b><small>"+s+"</small></span>";return b};
    ref.insertAdjacentElement("beforebegin",mk("analytics","Analytics & short links","Funnel, revenue, retention, lifetime numbers, /l/ links, partners"));
    ref.insertAdjacentElement("beforebegin",mk("reviews","Priority Game Reviews","Games members sent you for tokens"));
    ref.insertAdjacentElement("beforebegin",mk("bans","Chat bans","Members blocked by 3 people in a week"));
  }
  async function partnerCard(){
    if(route()!=="account"||!sess()||owner())return;const v=Q("#view");if(!v||Q("#lc73-pc",v))return;
    let p=rd("lc73-partner",null);if(!p||Date.now()-p.at>864e5){const r=await rpc("lc73_partner_me",{});p={at:Date.now(),on:!!(r.data&&r.data.partner)};wr("lc73-partner",p)}
    if(!p.on)return;const c=document.createElement("section");c.id="lc73-pc";c.className="panel pad";c.innerHTML='<b>Your partner dashboard</b><p class="small muted">Visitors, sign-ups and buyers that came through your links.</p><a class="btn btn-primary" href="#analytics">Open it</a>';v.insertAdjacentElement("afterbegin",c);
  }
  function css(){
    if(Q("#lc73-css"))return;const s=document.createElement("style");s.id="lc73-css";
    s.textContent=".lc73-tag{margin:0;color:#fbbf24;font-weight:800;font-size:12px}.lc73-ban{display:grid;gap:6px;border:1px solid #fbbf24;margin:0 0 12px}.lc73-ban .btn{min-height:44px}.lc73-big{font-size:28px;font-weight:800;margin:0 0 6px;color:#fbbf24}.lc73-trial ul{padding-left:1.1rem;display:grid;gap:4px}"
      +".lc73-pga{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;border:1px solid rgba(251,191,36,.55);margin:0 0 12px}.lc73-pga>div:first-child{display:grid;gap:2px;max-width:560px}.lc73-pga .btn{min-height:44px}"
      +".lc73-list{list-style:none;padding:0;display:grid;gap:8px}.lc73-list li{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 10px;border-radius:10px;background:#0f172a;border:1px solid #334155}.lc73-list small{flex-basis:100%}.lc73-list .btn{min-height:40px;margin-left:auto}"
      +".lc73-dm summary{min-height:44px;display:grid;gap:2px;cursor:pointer}.lc73-req{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:8px 0;border-top:1px solid #334155}.lc73-req p{margin:0}.lc73-req small{display:block}.lc73-req .btn{min-height:44px}"
      +".lc73-riv,.lc73-dash{max-width:960px;margin:0 auto}.lc73-riv section{margin:0 0 12px}.lc73-board{padding:0;list-style:none;counter-reset:r;display:grid;gap:6px}.lc73-board li{display:flex;justify-content:space-between;gap:10px;padding:8px 12px;border-radius:10px;background:#0f172a;border:1px solid #334155;counter-increment:r}.lc73-board li::before{content:counter(r)'.';color:#94a3b8;margin-right:6px}.lc73-board li b{flex:1}.lc73-board li.is-me{border-color:#38bdf8}"
      +".lc73-hub{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.lc73-hub .input{flex:1 1 160px;min-height:44px}.lc73-hub .btn{min-height:44px}.lc73-war{border:1px solid #fbbf24;border-radius:12px;padding:10px;margin:8px 0}.lc73-war p{margin:2px 0}"
      +".lc73-dh{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;justify-content:space-between}.lc73-dh h1{margin:0}.lc73-all.is-on{background:#fbbf24!important;border-color:#fbbf24!important;color:#0f172a!important}"
      +".lc73-life{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:14px 0;padding:14px;border-radius:18px;background:radial-gradient(500px 200px at 0 0,rgba(251,191,36,.18),transparent 60%),#1e293b;border:1px solid rgba(251,191,36,.5)}.lc73-life div{display:grid}.lc73-life b{font-size:clamp(22px,4vw,30px);color:#fbbf24}.lc73-life span{color:#cbd5e1;font-size:13px}"
      +".lc73-funnel,.lc73-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.lc73-step,.lc73-grid>div{display:grid;gap:2px;padding:10px;border-radius:12px;background:#1e293b;border:1px solid #334155}.lc73-step b,.lc73-grid b{font-size:22px}.lc73-step span,.lc73-grid span{font-size:13px;color:#cbd5e1}.lc73-step small{color:#94a3b8}"
      +".lc73-step.is-orange{border-color:#fb923c;background:rgba(251,146,60,.1)}.lc73-step.is-red{border-color:#ef4444;background:rgba(239,68,68,.12)}.lc73-step.is-green{border-color:#22c55e}"
      +".lc73-tree{border:1px solid #334155;border-radius:12px;margin:0 0 8px;padding:0 10px}.lc73-tree summary{min-height:48px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;cursor:pointer}.lc73-tree summary span{color:#94a3b8;font-size:13px}.lc73-t{width:100%;border-collapse:collapse;font-size:13px;display:block;overflow-x:auto}.lc73-t th,.lc73-t td{padding:6px 8px;border-bottom:1px solid #334155;text-align:left;white-space:nowrap}.lc73-t small{display:block;color:#94a3b8}.lc73-t tr.is-off{opacity:.5}"
      +".lc73-mkrow{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}.lc73-mkrow .input,.lc73-mkrow .field{flex:1 1 140px;min-height:44px}.lc73-dash h2{margin:18px 0 8px;font-size:18px}.lc73-dash form{margin:12px 0}";
    document.head.appendChild(s);
  }
  let deb=0,oldMount=null;
  function scan(){ownerRows();const r=route();if(r==="trim")trimCard();if(r==="community")dmPanel();if(r==="quests")roadStep();if(r==="account")partnerCard();banners()}
  let trk=0;
  function afterRender(){clearTimeout(deb);deb=setTimeout(()=>{try{scan()}catch(e){}},250);reportXp();clearTimeout(trk);trk=setTimeout(()=>{try{track()}catch(e){}},1500)}   /* 9.38.1: link the source also when the person signs in after the app started */
  function init(){
    css();
    try{if(typeof MOUNT!=="undefined"){if(MOUNT.rivals&&MOUNT.rivals!==mountRivals)oldMount=MOUNT.rivals;MOUNT.rivals=mountRivals;MOUNT.analytics=mountDash;try{DOC_TITLES.rivals="Rivals & Tribes";DOC_TITLES.analytics="Analytics";ROUTE_TITLES.rivals="Rivals & Tribes";ALIASES.tribes="rivals";ALIASES.tribe="rivals";ALIASES.rival="rivals"}catch(e){}}}catch(e){}
    try{if(typeof LC36!=="undefined"&&LC36.support&&LC36.support.checkout&&!LC36.support.checkout.__lc73){const orig=LC36.support.checkout;const f=async function(plan,tier){const o=await offers();if(o&&o.discount&&(await discountCheckout("subscribe",{plan:plan==="monthly"?"monthly":"yearly",tier:Number(tier)===3?3:2})))return true;return orig.apply(this,arguments)};f.__lc73=true;LC36.support.checkout=f}}catch(e){}
    document.addEventListener("click",onClick,true);document.addEventListener("submit",onSubmit,true);
    window.addEventListener("storage",e=>{if(e.key==="lc26-auth")setTimeout(()=>{try{track()}catch(x){}},1500)});
    window.addEventListener("appinstalled",()=>{const s=srcRec()||{};rpc("lc73_hit",{p:{kind:"install",device:s.device||device(),code:s.code||""}},true)});
    new MutationObserver(()=>{clearTimeout(deb);deb=setTimeout(()=>{try{scan()}catch(e){}},200)}).observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>{track();offers()},4000);
  }
  return{init:init,afterRender:afterRender,paintDash:paintDash,startTrial:startTrial,rescue:rescue,offers:offers,packCheckout:packCheckout,weekXp:weekXp,track:track,version:"9.37.0"};
})(); /*@@end lc73*/
