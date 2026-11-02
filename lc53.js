const LC53=(()=>{
  "use strict";
  /* LC53 (build 9.27.0): VALUE FIRST.
     1. The first-run questions never open after a review any more. A finished review marks the person as onboarded (the Chess.com / Lichess
        name and rating come from the connection, LC30), so the old rating box and "What costs you the most games?" never interrupt the road.
     2. Email AFTER value: once the FIRST review is finished and the lesson has been seen (the person leaves the Trim page, or after 35 s on it),
        one clean modal: "Great job! To save your progress and personalized feedback, connect your email." Google or an email link (the LC39
        sign-in). Not now: asked again after a later review, at most 3 times. No sign-in hint anywhere before the first review (LC40).
     3. After sign-in: "Awesome, your progress is saved!" -> MSPC Framework & Working Points, tap the ? (Coach Lanckriet), then back to the
        Game Library. On the first-time road (LC42) its own Level 3 sheet does that last step.
     4. Game Library: every game has two buttons. Analyze Game: the game on the board with the engine, no Trim. Trim Game: the whole Trim runs at
        once (no "Run the Trim review" click), the page scrolls to the result and the review counts like any other.
     5. Review feel: a sound and a Chess.com-style badge (!!, !, ★, ✓, ?!, ?, ??) on the board for every reviewed move you step to, and a fanfare
        when a review is done. Uses the app's sound setting.
     6. Owner: a quick "Test as Owner / Pro / Free" switch at the top of the mode menu (LC49), remembered on this device. Part of the owner's
        tools: never remove it or LC49's floating switcher (tests/suites/release.py checks both). */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.prototype.slice.call((r||document).querySelectorAll(s));
  const E=s=>{try{return esc(s)}catch(e){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}};
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const hashNow=()=>{let h="";try{h=decodeURIComponent((location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){h=""}return h.split("/")[0].split("?")[0]};
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const admin=()=>{try{return !!Admin.active}catch(e){return false}};
  const road=()=>{try{return typeof LC42!=="undefined"&&!!LC42.owns()}catch(e){return false}};
  const sheetOpen=()=>!!Q(".sheet-wrap");
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const KEY="lc53",MAX_ASKS=3;
  const st=()=>Object.assign({asks:0,lastAsk:0,reviews:0,askedAtReview:0,stage:"",authAt:0,replay:0},rd(KEY,{})||{});
  const put=p=>{const s=Object.assign(st(),p);wr(KEY,s);return s};

  /* ======================= 1. a finished review = onboarded ======================= */
  function markOnboarded(){
    try{
      if(typeof App==="undefined"||App.onboarded)return;
      const p=App.profile||{};
      App.profile=sanitizeProfile(Object.assign({},p,{chess_com_username:p.chess_com_username||"",lichess_username:p.lichess_username||""}));
      App.onboarded=true;App.save();
      wr("lc80-onb",Object.assign({},rd("lc80-onb",{})||{},{done:true,at:Date.now(),via:"first-review",v:"9.27"}));
      try{refreshChip()}catch(e){}
    }catch(e){console.error("lc53 onboarded",e)}
  }

  /* ======================= 2. the email ask, after the lesson ======================= */
  let askT=0,armed=false;
  function onReviewDone(){
    const s=put({reviews:st().reviews+1});
    try{Sound.fanfare()}catch(e){}
    if(trimPending)finishTrim();
    if(sess()||admin())return;
    if(s.asks>=MAX_ASKS||(s.asks&&s.reviews<=s.askedAtReview))return;   /* after "Not now": only again after a later review */
    armed=true;clearTimeout(askT);
    askT=setTimeout(()=>tryAsk("time"),35000);                          /* time with the lesson, or leaving the page (onHash) */
  }
  /* never on top of another pop-up: the screen has to be calm (no sheet, not typing) for three checks in a row, about 2.5 s; level-up and
     quest pop-ups also wait for the moment the person leaves an exercise, so they go first */
  function tryAsk(why,n,calm){
    if(!armed)return;
    if(sess()||admin()){armed=false;return}
    n=n||0;calm=calm||0;
    const busy=sheetOpen()||(document.activeElement&&/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName));
    if(busy){if(n<90)askT=setTimeout(()=>tryAsk(why,n+1,0),1200);return}
    if(calm<2){askT=setTimeout(()=>tryAsk(why,n+1,calm+1),1200);return}
    armed=false;ask();
  }
  function onHash(){if(armed&&hashNow()!=="trim"){clearTimeout(askT);askT=setTimeout(()=>tryAsk("nav"),900)}}
  function gateHTML(){
    let code="";try{code=LC26.sync.codeForm("lc39")}catch(e){}
    return'<div class="lc39-gate lc53-gate"><button type="button" class="btn btn-primary lc39-google" data-lc39-google>Continue with Google</button>'
      +'<p class="small muted lc39-or">or get a sign-in link by email</p>'
      +'<form data-lc39-mail class="lc39-row"><input class="input" name="email" type="email" required autocomplete="email" placeholder="you@example.com" aria-label="Email address"><button type="submit" class="btn btn-ghost">Email me a sign-in link</button></form>'
      +code+'<p class="form-msg" data-lc39-gmsg aria-live="polite"></p></div>';
  }
  function ask(){
    const s=st();put({asks:s.asks+1,lastAsk:Date.now(),askedAtReview:s.reviews,stage:"auth-wait"});
    try{
      openSheet({title:"Save your progress",cls:"lc53-sheet lc53-ask",noFocus:true,
        html:'<div class="lc53-hero" aria-hidden="true">🎉</div><h2 class="lc53-h">Great job!</h2><p class="lc53-p">To save your progress and personalized feedback, connect your email.</p>'+gateHTML()
          +'<div class="btn-row lc53-later"><button type="button" class="btn btn-quiet" data-close data-lc53-later>Not now</button></div>',
        onMount(sh){sh.el.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("[data-lc53-later]"))put({stage:""})})}});
      try{Sound.good()}catch(e){}
    }catch(e){console.error("lc53 ask",e)}
  }

  /* ======================= 3. after sign-in: MSPC, the ?, the Library ======================= */
  let signedT=0;
  function onSignedIn(){
    const s=st();if(s.stage!=="auth-wait"||!sess())return;
    put({stage:"mspc",authAt:Date.now()});
    clearTimeout(signedT);
    /* signed in from inside the ask (email code): close it, its job is done */
    try{const w=(Q(".lc53-ask")||{closest:()=>null}).closest(".sheet-wrap");if(w){const x=Q("[data-close]:not([data-lc53-later])",w);if(x)x.click();else w.remove()}}catch(e){}
    const show=n=>{if(sheetOpen()&&n<30){signedT=setTimeout(()=>show(n+1),1200);return}   /* the "Email updates?" question (LC39) goes first */
      try{openSheet({title:"Progress saved",cls:"lc53-sheet lc53-saved",noFocus:true,
        html:'<div class="lc53-hero" aria-hidden="true">✅</div><h2 class="lc53-h">Awesome, your progress is saved!</h2><p class="lc53-p">Let\'s set up your personalized feedback in the MSPC Framework &amp; Working Points.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-close data-lc53-mspc>Set up my MSPC</button></div>'});
        try{Sound.done()}catch(e){}
      }catch(e){}};
    signedT=setTimeout(()=>show(0),1400);
  }
  function toMspc(){
    put({stage:"listen"});
    if(hashNow()!=="system")location.hash="#system";
    let n=0;const t=setInterval(()=>{
      const q=Q("#view .lc29-q");
      if(q||++n>20){clearInterval(t);if(q){q.classList.add("lc53-pulse");try{q.scrollIntoView({behavior:"smooth",block:"center"})}catch(e){}}
        say("Tap the ? next to the title: Coach Lanckriet explains your MSPC Framework.","good")}
    },300);
  }
  function onListened(id){
    if(String(id)!=="system"||st().stage!=="listen")return;
    put({stage:""});
    QA(".lc53-pulse").forEach(x=>x.classList.remove("lc53-pulse"));
    if(road())return;                                                   /* the first-time road shows its own Level 3 and opens the Library */
    say("Your MSPC is set. Now your Game Library: pick a game and press Trim Game.","good");
    setTimeout(()=>{location.hash="#trim";setTimeout(()=>{const l=Q("#lc39-lib");if(l)try{l.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){}},900)},1200);
  }

  /* ======================= 4. Game Library: Analyze Game and Trim Game ======================= */
  /* the Library card is built once per page: when the account was connected while it already showed "Connect my account", build it again */
  let libFix=0;
  function refreshLib(){
    const stale=Q('#lc39-lib a[href="#ratings"]');if(!stale||Date.now()-libFix<3000)return;
    let has=false;try{const p=App.profile||{};has=!!(p.chess_com_username||p.lichess_username||(Elo.acct("chesscom")||{}).user||(Elo.acct("lichess")||{}).user)}catch(e){}
    if(!has)return;libFix=Date.now();const c=Q("#lc39-lib");if(c)c.remove();try{rerender()}catch(e){}
  }
  function upgradeRows(){
    QA("#lc39-lib [data-lc39-list] button.lc39-g[data-lc39-game]").forEach(b=>{
      const d=document.createElement("div");
      d.className=b.className+" lc53-row";d.setAttribute("data-lc39-game",b.getAttribute("data-lc39-game"));
      const info=b.cloneNode(true);QA(".lc39-gt",info).forEach(x=>x.remove());   /* the old one-word "Trim" label: the two buttons replace it */
      d.innerHTML='<div class="lc53-info">'+info.innerHTML+'</div><div class="lc53-acts"><button type="button" class="btn btn-ghost btn-sm" data-lc53-act="analyze" aria-label="Analyze this game on the board">Analyze Game</button><button type="button" class="btn btn-primary btn-sm" data-lc53-act="trim" aria-label="Trim this game now">Trim Game</button></div>';
      b.replaceWith(d);
    });
  }
  let trimPending=false,trimT=0,trimStarted=0;
  function startTrim(){
    trimPending=true;clearInterval(trimT);let n=0,clicked=false;
    trimT=setInterval(()=>{
      if(++n>120||hashNow()!=="trim"){clearInterval(trimT);trimPending=false;return}
      if(clicked)return;
      const rv=Q('[data-act="review"]'),mv=Q("#an-moves"),bar=Q("#an-review-bar");
      if(rv&&!rv.disabled&&mv&&mv.children.length>1&&!(bar&&!bar.hidden)){clicked=true;trimStarted=Date.now();clearInterval(trimT);rv.click();say("Trimming the whole game…","")}
    },350);
  }
  function finishTrim(){
    trimPending=false;
    setTimeout(()=>{const r=Q("#an-report")||Q("#an-review-status");if(r)try{r.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){}},400);
  }
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    const act=t.closest("[data-lc53-act]");
    if(act){                                                           /* LC39 already loaded the game into the board (its own row click) */
      if(act.getAttribute("data-lc53-act")==="trim")startTrim();
      else{trimPending=false;clearInterval(trimT);setTimeout(()=>{const b=Q("#an-board");if(b)try{b.scrollIntoView({behavior:"smooth",block:"center"})}catch(x){}},500)}
      return;
    }
    if(t.closest("[data-lc53-mspc]")){setTimeout(toMspc,250);return}
    if(t.closest("#lc49-menu [data-lc53-tier]")){e.preventDefault();e.stopPropagation();applyTier(t.closest("[data-lc53-tier]").getAttribute("data-lc53-tier"),false);return}
  }

  /* ======================= 5. review feel: badges and sounds ======================= */
  const KIND={brilliant:["!!","Brilliant"],great:["!","Great move"],best:["★","Best move"],good:["✓","Good move"],inaccuracy:["?!","Inaccuracy"],mistake:["?","Mistake"],blunder:["??","Blunder"],missed:["✕","Missed win"]};
  function kindOf(mv){const k=mv&&Q(".v6-k",mv);if(!k)return"";const m=String(k.className).match(/v6-k-([a-z]+)/);return m&&KIND[m[1]]?m[1]:""}
  function sanOf(mv){const c=mv.cloneNode(true);QA(".t,.v6-k",c).forEach(x=>x.remove());return String(c.textContent||"").trim()}
  function destOf(san,ply){
    const white=ply%2===1;
    if(/^O-O-O/.test(san))return white?"c1":"c8";
    if(/^O-O/.test(san))return white?"g1":"g8";
    const m=san.match(/[a-h][1-8]/g);return m?m[m.length-1]:"";
  }
  function playFor(k){
    try{
      if(k==="brilliant")return Sound.brilliant();
      if(k==="great"||k==="best")return Sound.good();
      if(k==="good")return Sound.move();
      if(k==="inaccuracy")return tones([[440,0,.08,"triangle",.045],[392,.08,.12,"triangle",.04]]);
      if(k==="mistake")return tones([[330,0,.1,"square",.03],[262,.1,.16,"square",.028]]);
      if(k==="blunder"||k==="missed")return tones([[247,0,.12,"sawtooth",.03],[196,.12,.14,"sawtooth",.03],[147,.26,.28,"sawtooth",.028]]);
    }catch(e){}
  }
  let actx=null;
  function tones(seq){
    try{
      if(!App.settings||!App.settings.sound)return;
      actx=actx||new(window.AudioContext||window.webkitAudioContext);if(actx.state==="suspended")actx.resume();
      seq.forEach(n=>{const o=actx.createOscillator(),g=actx.createGain(),t0=actx.currentTime+n[1];o.type=n[3];o.frequency.value=n[0];
        g.gain.setValueAtTime(1e-4,t0);g.gain.exponentialRampToValueAtTime(n[4],t0+.012);g.gain.exponentialRampToValueAtTime(1e-4,t0+n[2]);o.connect(g);g.connect(actx.destination);o.start(t0);o.stop(t0+n[2]+.03)});
    }catch(e){}
  }
  let lastNow=null;
  function onMoveChange(){
    const now=Q("#an-moves .mv.is-now");if(!now||now===lastNow)return;lastNow=now;
    QA("#an-board .lc53-badge").forEach(x=>x.remove());
    const k=kindOf(now);if(!k)return;
    const ply=+now.getAttribute("data-i")||0,sq=destOf(sanOf(now),ply);
    const cell=sq&&(Q('#an-board [data-square="'+sq+'"]')||Q("#an-board .square-"+sq));
    if(cell){const b=document.createElement("span");b.className="lc53-badge k-"+k;b.textContent=KIND[k][0];b.title=KIND[k][1];b.setAttribute("aria-label",KIND[k][1]);if(getComputedStyle(cell).position==="static")cell.style.position="relative";cell.appendChild(b)}
    playFor(k);
  }

  /* ======================= 6. owner: Test as Owner / Pro / Free ======================= */
  const TIERS=[["owner","Owner","all"],["pro","Pro","pov:b2c-paid"],["free","Free","pov:b2c-free"]];
  const TKEY="lc53-tier";
  const isOwner=()=>{try{return !!(LC49.ownerAccount()||LC49.hard())}catch(e){return false}};
  function curTier(){try{const c=LC49.cur();const t=TIERS.filter(x=>x[2]===c)[0];return t?t[0]:(c==="all"?"owner":"")}catch(e){return""}}
  function applyTier(id,quiet){
    const t=TIERS.filter(x=>x[0]===id)[0]||TIERS[0];
    try{LC49.choose(t[2])}catch(e){}
    wr(TKEY,t[0]);
    try{LC49.closeMenu()}catch(e){}
    try{rerender()}catch(e){}
    if(!quiet)say("Testing as "+t[1]+". Switch back any time with the button bottom right.","good");
  }
  function decorateMenu(){
    const m=Q("#lc49-menu");if(!m||Q(".lc53-tiers",m)||!isOwner())return;
    const cur=curTier(),d=document.createElement("div");d.className="lc53-tiers";d.setAttribute("role","group");d.setAttribute("aria-label","Test the app as");
    d.innerHTML='<span class="lc53-tl">Test as</span>'+TIERS.map(t=>'<button type="button" role="menuitemradio" data-lc53-tier="'+t[0]+'" aria-checked="'+(cur===t[0])+'">'+E(t[1])+"</button>").join("");
    m.insertBefore(d,m.firstChild);
  }
  function restoreTier(){
    try{
      const want=rd(TKEY,"owner");if(!want||want==="owner"||!isOwner())return;
      const t=TIERS.filter(x=>x[0]===want)[0];if(t&&LC49.cur()!==t[2])applyTier(want,true);
    }catch(e){}
  }

  /* ======================= wiring ======================= */
  function wrapReleased(){
    try{
      const P=LC26.pop;if(!P||typeof P.released!=="function"||P.released.__lc53)return;
      const og=P.released;
      const f=function(){markOnboarded();let r;try{r=og.apply(this,arguments)}catch(e){console.error(e)}try{onReviewDone()}catch(e){console.error("lc53",e)}return r};
      f.__lc53=true;P.released=f;
    }catch(e){console.error("lc53",e)}
  }
  function css(){
    if(Q("#lc53-css"))return;const s=document.createElement("style");s.id="lc53-css";
    s.textContent='.lc53-sheet .lc53-hero{font-size:44px;line-height:1;text-align:center;margin:4px 0 6px}.lc53-h{text-align:center;margin:0 0 6px;font-size:1.35rem}.lc53-p{text-align:center;margin:0 0 14px}'
      +'.lc53-gate{display:grid;gap:10px}.lc53-gate .lc39-google{width:100%;min-height:48px}.lc53-later{justify-content:center;margin-top:6px}'
      +'.lc53-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;cursor:pointer}.lc53-row .lc53-info{display:flex;align-items:center;gap:10px;flex:1 1 260px;min-width:0}.lc53-row .lc39-gm{flex:1 1 auto;min-width:0}'
      +'.lc53-acts{display:flex;gap:8px;flex:0 0 auto;margin-left:auto}.lc53-acts .btn{min-height:40px;white-space:nowrap}'
      +'@media (max-width:480px){.lc53-row .lc53-info{flex-basis:100%}.lc53-acts{flex:1 1 100%}.lc53-acts .btn{flex:1}}'
      +'.lc53-badge{position:absolute;top:-6px;right:-6px;z-index:5;min-width:22px;height:22px;padding:0 4px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font:800 12px/1 system-ui,sans-serif;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.45);pointer-events:none;animation:lc53pop .28s ease-out}'
      +'.lc53-badge.k-brilliant{background:#1baca6}.lc53-badge.k-great{background:#5c8bb0}.lc53-badge.k-best{background:#81b64c}.lc53-badge.k-good{background:#77915f}.lc53-badge.k-inaccuracy{background:#f7c631;color:#1c1400}.lc53-badge.k-mistake{background:#e58f2a}.lc53-badge.k-blunder{background:#ca3431}.lc53-badge.k-missed{background:#9b6bd1}'
      +'@keyframes lc53pop{0%{transform:scale(.3);opacity:0}70%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}'
      +'.lc53-pulse{box-shadow:0 0 0 0 rgba(56,189,248,.7);animation:lc53ring 1.4s ease-out infinite}@keyframes lc53ring{0%{box-shadow:0 0 0 0 rgba(56,189,248,.7)}100%{box-shadow:0 0 0 14px rgba(56,189,248,0)}}'
      +'.lc53-tiers{display:flex;align-items:center;gap:6px;padding:10px 10px 8px;border-bottom:1px solid var(--hair,rgba(148,163,184,.2))}.lc53-tl{font-size:11.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--fog,#94a3b8);margin-right:auto}'
      +'.lc53-tiers button{min-height:36px;padding:0 12px;border-radius:999px;border:1px solid rgba(251,191,36,.45);background:transparent;color:#fde68a;font:inherit;font-size:12.5px;font-weight:800;cursor:pointer}.lc53-tiers button[aria-checked="true"]{background:#fbbf24;color:#1c1400;border-color:#fbbf24}'
      /* the owner's mode switcher is never covered: the "Back to Admin" pill (LC45, bottom left) is wide on a phone and sits above it */
      +'body:has(#lc45-pill) #lc49-float{bottom:calc(84px + env(safe-area-inset-bottom,0px))!important}'
      +'@media (prefers-reduced-motion:reduce){.lc53-badge,.lc53-pulse{animation:none}}';
    document.head.appendChild(s);
  }
  function init(){
    try{
      css();wrapReleased();
      /* the owner replays the first-time road (LC52): ask again as for a new member */
      const rp=+rd("lc52-replay",0)||0,s=st();if(rp&&!s.replay)put({asks:0,lastAsk:0,reviews:0,askedAtReview:0,stage:"",replay:1});else if(!rp&&s.replay)put({replay:0});
      document.addEventListener("click",onClick,false);
      window.addEventListener("hashchange",onHash);
      window.addEventListener("lc39-signed-in",onSignedIn);
      window.addEventListener("lc29-listened",e=>{try{onListened(e.detail)}catch(x){}});
      if(st().stage==="auth-wait"&&sess())setTimeout(onSignedIn,600);   /* came back from Google or from the email link */
      if(typeof MutationObserver==="function"){
        let a=false;new MutationObserver(()=>{if(a)return;a=true;requestAnimationFrame(()=>{a=false;try{refreshLib();upgradeRows();decorateMenu();onMoveChange()}catch(e){}})}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
      }
      [1500,4500].forEach(ms=>setTimeout(restoreTier,ms));
    }catch(e){console.error("lc53",e)}
  }
  return{init:init,ask:ask,onReviewDone:onReviewDone,onSignedIn:onSignedIn,toMspc:toMspc,applyTier:applyTier,state:st,
    _t:{destOf:destOf,kindOf:kindOf,upgradeRows:upgradeRows,markOnboarded:markOnboarded,tryAsk:tryAsk,TIERS:TIERS}};
})();
