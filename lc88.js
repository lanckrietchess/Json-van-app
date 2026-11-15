/*@@module lc88*/
const LC88=(()=>{
  "use strict";
  /* LC88 (build 9.48.0): one guide at a time.
     Six modules each drew their own guiding block at the top of the page (the Level road LC42, the rest of the road LC84, the quest drip
     LC39, the "save your progress" hint LC40, the Hero's Journey card LC62, the "road done" card LC71, the upgrade banner LC45, the
     "Claim Level 2" bar LC42), so a new player could see three or four of them at once, plus the whole "Today's ritual" list.
     Now: those blocks are never shown themselves. They keep working underneath (their logic, state and buttons are untouched); LC88 picks the
     ONE with the highest priority and shows its text and buttons in a calm banner directly under the navigation. A tap on a banner button
     taps the real button underneath, so every flow works exactly as before. When the step is done its block changes or disappears, and the
     banner slides to the next single step.
       Priority: Claim Level 2 > a coach note from the LC19 stack (tilt, redeem, game, weekly / monthly) > the Level road (LC42) > the rest of the road (LC84) > the quest level (LC19: "Quest level 1: your first
                 game", the step the quest board shows; on the quest board itself the banner steps aside) > the quest drip (LC39) > the road done card (LC71) >
                 Hero's Journey invitation (LC62) > save-your-progress hint (LC40) > the upgrade banner (LC45) > the mission card
                 (LC71), the last two only after LC85's grace period.
     Celebrations: one at a time; a badge or leaderboard card during the quest levels goes to the quiet inbox (the bell).
     Today's ritual (#quests, LC69 + the Find a Rival step of LC73): one step at a time. When nothing above is waiting, the page shows only the
     next open step of the ritual (the others behind "Show all steps"); when something above is waiting, the list folds away completely, so
     there is never more than one thing to do on the screen.
     While a guided pop-up is open (the Level sheets) the banner steps aside. Automatic pop-ups already wait for each other (LC83); a pop-up with
     the same title as the one that is open is dropped. */
  const VERSION="9.48.0";
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.prototype.slice.call((r||document).querySelectorAll(s));
  const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const route=()=>{let h="";try{h=decodeURIComponent(String(location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){h=""}return h.split(/[\/?&]/)[0]};
  const NOBAR=/^(admin|privacy|level0|studio|wall-cms|social-proof|giveaway-admin|landing-editor|reset)$/;
  /* the guiding blocks, highest priority first. sel: where it lives; kind: shown in the banner's small label */
  const SOURCES=[
    {id:"claim",sel:"#lc42-claim",kind:"Level up"},
    {id:"note",sel:"#lc19-banners>.lc19-b:not([data-b=quest])",kind:"Coach"},
    {id:"road",sel:"#lc42-strip",kind:"Your road"},
    {id:"road2",sel:"#lc84-strip",kind:"Your road"},
    {id:"level",model:levelModel,kind:"Quest",page:"quests"},
    {id:"quest",sel:"#lc39-q",kind:"Quest"},
    {id:"done",sel:"#lc71-road-done",kind:"Today"},
    {id:"hero",sel:"[data-lc62-card]",kind:"Your story"},
    {id:"save",sel:"#lc40-nudge",kind:"Tip"},
    {id:"upgrade",sel:"#lc45-banner",kind:"Pro",late:true},
    {id:"mission",sel:".lc71-mission",kind:"Mission",late:true}
  ];
  /* the floating LC19 stack goes too: its notes come through the banner, its "Quest level N unlocked" note is the banner's next step */
  const HIDE=SOURCES.filter(s=>s.sel).map(s=>"html.lc88-on "+s.sel).concat(["html.lc88-on #lc19-banners"]).join(",");
  const GUIDE_SHEET=".lc42-sheet,.lc84-sheet,.lc25-level";
  const graceNow=()=>{try{return typeof LC85!=="undefined"&&LC85.grace()}catch(e){return false}};
  const vis=el=>!!el&&el.isConnected&&!el.hidden;

  /* the quest level (LC19) as one step: level 1 = the first game review, higher levels = XP and the first way to earn it */
  function levelModel(){
    try{
      const q=LC19.quest;if(!q||!q.active())return null;
      const L=+q.level()||1,p=(q._t.progress&&q._t.progress())||{},lv=typeof LC26!=="undefined"?LC26.levels:null;
      const title=lv&&lv.title?lv.title(L):(L===1?"Your first game":"Level "+L),max=lv&&lv.max?lv.max:3;
      if(L===1)return{html:"<b>Quest level 1 of "+max+": "+E(title)+".</b> <span class=\"lc88-s\">Analyse your first game and find the move that cost you the most.</span>",acts:[{label:"Analyse my first game",href:"#trim",primary:true}],sig:"L1"+(p.pct||0)};
      const tr=((lv&&lv.tracks&&lv.tracks[L])||[])[0];
      return{html:"<b>Quest level "+L+" of "+max+": "+E(title)+".</b> <span class=\"lc88-s\">"+(+p.have||0)+" / "+(+p.need||0)+" XP. Earn it any way you like.</span>",
        acts:(tr?[{label:String(tr[1]).slice(0,40),href:String(tr[3]||"#quests"),primary:true}]:[]).concat([{label:"All options",href:"#quests"}]),sig:"L"+L+"-"+(p.have||0)};
    }catch(e){return null}
  }
  /* pure: pick the one source to show from a list of {id, present} in priority order */
  function pick(list,grace){for(const s of list){if(!s.present)continue;if(s.late&&grace)continue;return s.id}return""}

  /* the source's words, without its own buttons, links, pictures or close crosses */
  function textOf(el){
    const c=el.cloneNode(true);
    QA("button,a,img,svg,[role=img],.lc69-face,.lc48-coach,.lc45-coachrow,.btn-row,.lc84-row,.lc84-qb",c).forEach(x=>{if(x.matches(".lc84-qb,.lc84-row,.btn-row")){QA("button,a",x).forEach(y=>y.remove());if(!x.textContent.trim())x.remove()}else x.remove()});
    QA("[class]",c).forEach(x=>{const k=x.className&&x.className.baseVal==null?String(x.className):"";x.removeAttribute("class");if(/small|muted|lc39-qn|lc84-n/.test(k))x.setAttribute("class","lc88-s")});
    QA("*",c).forEach(x=>{[].slice.call(x.attributes).forEach(a=>{if(a.name!=="class")x.removeAttribute(a.name)})});
    /* a space after every closing tag, so "MSPC Wizard" and "Step 1" never run together once the layout is gone */
    let h=c.innerHTML.replace(/\s+/g," ").replace(/(<\/(?:b|strong|em|span|div|p|h\d|small|label)>)(?=[^\s<])/g,"$1 ").replace(/(<\/(?:b|strong|em|span|div|p|h\d|small|label)>)(<(?!\/))/g,"$1 $2").trim();
    if(!c.textContent.trim())h="";
    return h;
  }
  /* the source's actions, in order: [{el, label, primary, dismiss}] */
  function actionsOf(el){
    return QA("button,a[href],a.btn",el).filter(b=>!b.disabled&&b.offsetParent!==undefined).map(b=>{
      const label=(b.getAttribute("aria-label")&&!b.textContent.trim()?b.getAttribute("aria-label"):b.textContent).replace(/\s+/g," ").trim();
      const dismiss=/^(×|x|✕)$/i.test(b.textContent.trim())||/hide|dismiss|close|not now/i.test(b.getAttribute("aria-label")||"")||b.matches(".lc39-qskip,[data-lc40-nx],.lc45-x,[data-lc45-x],.lc19-x");
      return{el:b,label:label.slice(0,60),primary:b.classList.contains("btn-primary")||b.classList.contains("btn-gold"),dismiss:dismiss}}).filter(a=>a.label).slice(0,4);
  }

  /* ---------- the banner ---------- */
  let bar=null,cur={sig:"",acts:[]},mo=null,deb=0,busy=false;
  function host(){return Q("#view")}
  function ensureBar(){
    const v=host();if(!v)return null;
    if(!bar){bar=document.createElement("div");bar.id="lc88";bar.className="lc88";bar.setAttribute("role","status");bar.setAttribute("aria-live","polite");bar.hidden=true;
      bar.addEventListener("click",onBar);
      /* play the slide-in once per new step: a page re-render that moves the banner must not replay it */
      bar.addEventListener("animationend",()=>bar.classList.remove("lc88-in"))}
    /* the first thing inside #view: the page header is fixed and #view carries its top padding, so this sits right under the navigation */
    if(bar.parentNode!==v||v.firstElementChild!==bar)v.insertBefore(bar,v.firstChild);
    return bar;
  }
  function onBar(e){
    const b=e.target.closest&&e.target.closest("[data-lc88-i]");if(!b)return;e.preventDefault();
    const a=cur.acts[+b.getAttribute("data-lc88-i")];if(!a){update(true);return}
    if(a.href){if(/^#/.test(a.href)){if(location.hash===a.href){try{window.dispatchEvent(new HashChangeEvent("hashchange"))}catch(x){}}else location.hash=a.href}else location.href=a.href}
    else{if(!a.el||!a.el.isConnected){update(true);return}try{a.el.click()}catch(x){}}
    setTimeout(()=>update(true),60);setTimeout(()=>update(true),600);
  }
  function show(src,el,model){
    const b=ensureBar();if(!b)return;
    const text=model?model.html:textOf(el),acts=model?model.acts.map(a=>Object.assign({dismiss:false},a)):actionsOf(el),sig=src.id+"|"+text+"|"+acts.map(a=>a.label).join("/");
    cur.acts=acts;
    if(sig===cur.sig&&!b.hidden&&b.getAttribute("data-src")===src.id)return;
    const isNew=src.id+"|"+text!==String(cur.sig).split("|").slice(0,2).join("|");
    cur.sig=sig;
    const main=acts.filter(a=>!a.dismiss),dis=acts.filter(a=>a.dismiss);
    b.innerHTML='<span class="lc88-dot" aria-hidden="true">♞</span><div class="lc88-t"><span class="lc88-k">'+E(src.kind)+'</span><div class="lc88-x">'+(text||"")+"</div></div>"
      +'<div class="lc88-a">'+main.slice(0,2).map((a,i)=>'<button type="button" class="btn btn-sm '+(i===0?"btn-primary":"btn-ghost")+'" data-lc88-i="'+acts.indexOf(a)+'">'+E(a.label)+"</button>").join("")
      +(dis.length?'<button type="button" class="lc88-close" data-lc88-i="'+acts.indexOf(dis[0])+'" aria-label="'+E(dis[0].label==="×"?"Hide":dis[0].label)+'" title="'+E(dis[0].label==="×"?"Hide":dis[0].label)+'">'+(/^skip$/i.test(dis[0].label)?"Skip":"×")+"</button>":"")+"</div>";
    b.setAttribute("data-src",src.id);
    b.hidden=false;
    if(isNew){b.classList.remove("lc88-in");void b.offsetWidth;b.classList.add("lc88-in")}
  }
  function hideBar(){if(bar){bar.hidden=true;bar.removeAttribute("data-src")}cur={sig:"",acts:[]}}

  /* ---------- Today's ritual: one step at a time ---------- */
  function ritual(srcShown){
    const ol=Q("#lc69-road ol.lc69-steps");if(!ol)return false;
    const items=QA(":scope > li",ol),open=items.filter(li=>!li.classList.contains("ok"));
    items.forEach(li=>{if(li!==open[0]&&li.classList.contains("lc88-cur"))li.classList.remove("lc88-cur")});
    let tg=Q(".lc88-rtog",ol.parentNode);
    if(!tg){tg=document.createElement("button");tg.type="button";tg.className="btn btn-quiet btn-sm lc88-rtog";tg.addEventListener("click",()=>{ol.classList.toggle("lc88-all");paintTog()});ol.insertAdjacentElement("afterend",tg)}
    const paintTog=()=>{const all=ol.classList.contains("lc88-all"),done=items.length-open.length,t=all?"Show one step at a time":(srcShown?"Today’s ritual: "+done+" of "+items.length+" done · show the steps":"Show all "+items.length+" steps ("+done+" done)");if(tg.textContent!==t)tg.textContent=t;const hd=items.length<2&&!srcShown;if(tg.hidden!==hd)tg.hidden=hd};
    if(ol.classList.contains("lc88-fold")!==!!srcShown)ol.classList.toggle("lc88-fold",!!srcShown);
    if(ol.classList.contains("lc88-one")!==!srcShown)ol.classList.toggle("lc88-one",!srcShown);
    if(open[0]&&!open[0].classList.contains("lc88-cur"))open[0].classList.add("lc88-cur");
    paintTog();
    return !srcShown&&open.length>0;
  }

  /* ---------- the conductor ---------- */
  function update(force){
    if(busy)return;busy=true;
    try{
      const on=document.documentElement.classList.contains("lc88-on");if(!on){busy=false;return}
      const r=route(),list=SOURCES.map(s=>{if(s.model){const m=s.model();return Object.assign({},s,{m:m,present:!!m})}const el=Q(s.sel);return Object.assign({},s,{el:el,present:vis(el)&&!!(el.textContent||"").trim()})});
      const id=NOBAR.test(r)?"":pick(list,graceNow());
      const src=list.filter(s=>s.id===id)[0];
      /* a sheet on screen (a level-up, a guide, anything the player opened) is the one thing to look at: the banner waits behind it */
      const guideSheet=!!Q(GUIDE_SHEET)||QA(".sheet-wrap").some(w=>vis(w)&&getComputedStyle(w).display!=="none");
      /* while the quest levels run (onboarding), the quest level is the one road: the ritual road waits until they are done */
      const lvl=list.filter(s=>s.id==="level")[0];document.documentElement.classList.toggle("lc88-lvl",!!(lvl&&lvl.present));
      ritual(!!src);
      /* the quest board already shows the quest level: no second copy above it */
      if(!src||guideSheet||(src.page&&src.page===r)){hideBar();busy=false;return}
      let m=src.m;
      if(m){const here="#"+r;m=Object.assign({},m,{acts:m.acts.filter(a=>a.href!==here)})}
      show(src,src.el,m);
    }catch(e){}
    busy=false;
  }
  function schedule(){clearTimeout(deb);deb=setTimeout(update,70)}

  /* a pop-up with the same title as the one that is already open is dropped (two "Level 2 unlocked" at once, for example) */
  function wrapSheets(){
    try{
      if(typeof openSheet!=="function"||openSheet.__lc88)return;
      const prev=openSheet;
      const f=function(o){
        try{const t=String(o&&o.title||"").trim();if(t&&QA(".sheet-wrap .sheet-head h2").some(h=>h.textContent.trim()===t))return{el:document.createElement("div"),close(){},deferred:true}}catch(e){}
        return prev.apply(this,arguments);
      };
      f.__lc88=true;openSheet=f;
    }catch(e){}
  }

  function css(){
    if(Q("#lc88-css"))return;const s=document.createElement("style");s.id="lc88-css";
    s.textContent=HIDE+"{display:none!important}"
      +".lc88{order:-100;display:flex;align-items:center;gap:12px;margin:0 0 14px;width:100%;box-sizing:border-box;padding:10px 12px;border-radius:14px;border:1px solid rgba(56,189,248,.4);background:linear-gradient(90deg,rgba(56,189,248,.11),rgba(30,41,59,.92));box-shadow:0 6px 18px rgba(0,0,0,.18)}"
      +".lc88[hidden]{display:none!important}.lc88-dot{flex:none;width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#38bdf8;color:#0f172a;font-size:19px}"
      +".lc88-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.lc88-k{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#38bdf8}"
      +".lc88-x{font-size:14px;line-height:1.4;color:#e2e8f0}.lc88-x p{margin:0}.lc88-x b{color:#fff}.lc88-x .lc88-s{color:#94a3b8;font-size:13px}.lc88-x div{display:inline}"
      +".lc88-a{display:flex;gap:6px;align-items:center;flex:none}.lc88-a .btn{min-height:44px;white-space:nowrap}"
      +".lc88-close{min-width:44px;min-height:44px;border:0;background:transparent;color:#94a3b8;font-size:18px;cursor:pointer;border-radius:10px;font-weight:700}.lc88-close:hover{color:#e2e8f0;background:rgba(148,163,184,.12)}"
      +"@media (max-width:640px){.lc88{flex-wrap:wrap;align-items:flex-start}.lc88-t{flex:1 1 calc(100% - 60px)}.lc88-a{width:100%;padding-left:48px;box-sizing:border-box;flex-wrap:wrap}.lc88-a .btn{flex:1 1 auto}}"
      +".lc88-in{animation:lc88in .32s ease-out}@keyframes lc88in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.lc88-in{animation:none}}"
      +"html.lc88-lvl #lc69-road{display:none!important}"
      +"#lc69-road ol.lc88-fold>li{display:none!important}#lc69-road ol.lc88-one:not(.lc88-all)>li:not(.lc88-cur){display:none!important}#lc69-road ol.lc88-fold.lc88-all>li{display:flex!important}"
      +".lc88-rtog{margin-top:8px;min-height:44px}";
    document.head.appendChild(s);
  }
  function afterRender(r){schedule();setTimeout(update,400)}
  /* celebrations: one at a time. A second one while another is on screen or a sheet is open, and a badge or leaderboard card while the
     quest levels run, goes to the quiet inbox (the bell) instead of on top of the step. Nothing is lost: the badge itself is already earned. */
  const CELE={brilliant:a=>["brilliant","Brilliant move!!",a[0]],great:a=>["perfect","Great find",a[0]],perfect:a=>["perfect","Perfect run",a[0]],
    streak:a=>["streak",a[0]+" in a row","Right on the first try, every one of them."],rank:a=>["rank","You\u2019re on the leaderboard",a[0]],badge:a=>["badge",a[0],a[1]]};
  function celeWait(k){
    if(Q(".cele")||QA(".sheet-wrap").some(w=>vis(w)&&getComputedStyle(w).display!=="none"))return true;
    return(k==="badge"||k==="rank")&&document.documentElement.classList.contains("lc88-lvl");
  }
  function guardCele(){
    try{
      if(typeof Celebrate==="undefined"||Celebrate.__lc88)return;
      Object.keys(CELE).forEach(k=>{const f=Celebrate[k];if(typeof f!=="function")return;
        Celebrate[k]=function(){const a=[].slice.call(arguments);if(celeWait(k)){try{const q=CELE[k](a);Quiet.push(q[0],q[1],q[2])}catch(e){}return}return f.apply(this,a)}});
      Celebrate.__lc88=1;
    }catch(e){}
  }
  function init(){
    try{
      if(window.__lcIab)return;
      css();document.documentElement.classList.add("lc88-on");wrapSheets();guardCele();
      mo=new MutationObserver(ms=>{for(const m of ms){if(bar&&(m.target===bar||bar.contains(m.target)))continue;schedule();return}});
      mo.observe(document.body,{childList:true,subtree:true});
      window.addEventListener("hashchange",schedule);
      setTimeout(wrapSheets,1500);
      schedule();
    }catch(e){console.error("lc88",e)}
  }
  return{init:init,afterRender:afterRender,update:update,version:VERSION,current:()=>bar&&!bar.hidden?bar.getAttribute("data-src"):"",_t:{pick:pick,textOf:textOf,actionsOf:actionsOf,SOURCES:SOURCES,ritual:ritual,levelModel:levelModel,celeWait:celeWait}};
})(); /*@@end lc88*/
