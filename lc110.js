/*@@module lc110*/
const LC110=(()=>{
  "use strict";
  /* LC110 (build 9.81.0): the core Hub and the Level 20 unlock.
     1. Core view: a player starts with only the core features in the menus: the blue (featured) items of Nav5, plus the personal unlock of
        the book (#blueprint30, which keeps its own rule). Every other item is left out of the Train / Ranked / Learn / Social menus. Nothing
        is locked: a link from the coach, a course or the road still opens the page. Each menu with hidden items ends with one quiet row,
        "N more open at Level 20", to #features.
     2. Level 20: when the XP level (the level in the top bar, LC61.getUserLevel) reaches 20 through normal training, every other feature
        opens at once and stays open on this device. No extra XP gate, no second threshold: from then on LC26's quest levels open every
        route too (minLevel = 1). Pro / VIP content keeps its own tier rule.
     3. The light quest (optional, never blocks): open the feature list (#features), look at 3 features (the preview says what it does and
        how it helps; opening the feature counts too), and keep or switch off what you want. One LC88 step announces it; "×" or "Skip" ends
        it. Done = +30 XP once.
     4. After the unlock every new feature can be switched off or on again on #features (stored on this device). Core features always stay.
     Owner: #features has the owner panel (on / off, the level, which items are core; default = the blue items), saved in v5.lc110 of
     content.json (publish to make it live), and a preview switch on this device (normal / new player / Level reached). The owner sees every
     feature unless a preview is on. Everything stays on the device (localStorage "lc110-core"); no server, no AI, no cost. */
  const VERSION="9.81.0",W=window,D=document,K="lc110-core",FK="lc110-force",ROUTE="features",NEED=3,QUEST_XP=30;
  const DEF={on:true,level:20,core:null};
  const ALWAYS=["#blueprint30"];   /* personal unlocks with their own rule */
  const GNAME={"3t":"Train",ranked:"Ranked",learn:"Learn",social:"Social"};
  const Q=(s,r)=>(r||D).querySelector(s),QA=(s,r)=>[].slice.call((r||D).querySelectorAll(s));
  const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ic=(n,c)=>{try{return typeof icon==="function"?icon(n,c):""}catch(e){return""}};
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const ls={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  const route=()=>{let h="";try{h=decodeURIComponent(String(location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){h=""}return h.split(/[\/?&]/)[0]};

  /* ---------- how each feature helps (the preview; "what it does" is the menu note) ---------- */
  const HELPS={
    "#think":"Drills the four questions on real positions until you ask them by habit, so you catch more of your own mistakes before you make them.",
    "#learn-mspc":"Shows how Move, Specifics, Priorities and Calculation work on positions from my games, so you know what each step looks for.",
    "#openings":"Learn your repertoire line by line and drill it, so you reach a middlegame you understand instead of guessing on move 8.",
    "#middlegame":"The plans behind the structures you get, so you know what to do when there is nothing to calculate.",
    "#endgame":"The technique to turn a better position into a win, or to hold a worse one to a draw.",
    "#themes":"Unrated puzzles by motif: train one pattern until you see it at once, with no rating at stake.",
    "#diagnostic":"A fast scan of up to 5 recent games that names your biggest leak.",
    "#games":"Every game you saved, in folders, so you can go back to any review.",
    "#brilliant":"The moments you played well. Seeing them again shows you what your good thinking looks like.",
    "#kgems":"My own best moves and games, with the thinking behind them.",
    "#insights":"Where your accuracy leaks: by phase and by MSPC step, from the games you reviewed.",
    "#leaderboard":"Weekly tournaments and rankings: a reason to train a little every day, against real people.",
    "#dex":"Collect every line and drill it to mastery. Your progress shows as a collection.",
    "#events":"Boost events and challenges: extra XP for set tasks, for a limited time.",
    "#ranked":"Skill Matrix chapters, Boss Fights and bounties: a step-by-step path with a clear next goal.",
    "#guest-library":"Books and courses by guest coaches and authors, next to mine.",
    "#srs":"Your own mistakes come back over the days until you get them right.",
    "#clinic":"The blunders players keep making, one at a time, with the reason they go wrong.",
    "#vault-browser":"Search other students’ mistakes by opening, phase or MSPC step.",
    "#shuffle":"Random MSPC positions one after the other, so the chapter title never gives the answer away.",
    "#calendar":"Plan short training blocks in your week, so training happens at fixed moments.",
    "#vision":"Coordinates, knight paths and legal moves at speed: the basics that make calculation easier.",
    "#survival":"Hold a draw or convert a win against Stockfish: practice for positions you can’t look up.",
    "#hall":"The top referrers and creators of the community.",
    "#live":"Watch streams, ask questions live and support creators.",
    "#peer":"Puzzles built from real blunders of other players: the mistakes that really happen.",
    "#sparring":"Challenge other students on Chess.com or Lichess, then review the game here."
  };

  /* ---------- settings (owner, v5.lc110 of content.json) ---------- */
  function cleanCfg(x){
    const o={};if(!x||typeof x!=="object"||Array.isArray(x))return o;
    if(typeof x.on==="boolean")o.on=x.on;
    if(x.level!==""&&x.level!=null&&Number.isFinite(+x.level))o.level=Math.max(2,Math.min(100,Math.round(+x.level)));
    if(Array.isArray(x.core))o.core=x.core.filter(h=>typeof h==="string"&&/^#[a-z0-9-]{1,40}$/.test(h)).slice(0,80);
    return o;
  }
  function cfg(){let v={};try{v=(V5Doc.get()||{}).lc110||{}}catch(e){v={}}return Object.assign({},DEF,cleanCfg(v))}

  /* ---------- state (this device) ---------- */
  function blank(){return{v:1,unlockedAt:0,atLevel:0,seen:{},off:{},questDone:0,questSkip:0,dism:0}}
  function st(){const s=ls.get(K,null);const b=blank();if(!s||typeof s!=="object")return b;return Object.assign(b,s,{seen:Object.assign({},s.seen||{}),off:Object.assign({},s.off||{})})}
  function save(s){ls.set(K,s)}
  const force=()=>{const f=ls.get(FK,"");return f==="core"||f==="open"?f:""};
  const owner=()=>{try{return !!(LC49.owner()||Admin.active)}catch(e){return false}};
  /* the owner in admin mode sees every feature, unless the LC53 "Test as" preview (Admin.active is false while a role is viewed) or this
     module's own preview is on */
  function exempt(){if(force())return false;try{return !!Admin.active}catch(e){return false}}
  function level(){
    let L=null;try{L=LC61.getUserLevel()}catch(e){}
    if(!L||!Number.isFinite(+L.level)){try{L=V6.level()}catch(e){L=null}}
    if(!L||!Number.isFinite(+L.level))L={level:1,xp:0,lo:0,hi:60,pct:0,toNext:60};
    return L;
  }
  const xpFor=lv=>60*(lv-1)*(lv-1);   /* the same curve as V6 (levelOf) */

  /* ---------- pure (tested) ---------- */
  /* is an item in the menu? o: {core, on, unlocked, off, exempt} */
  function decide(o){
    if(!o.on||o.core||o.exempt)return true;
    if(!o.unlocked)return false;
    return !o.off;
  }
  /* the quest: how many of the new features were looked at, and is it done */
  function quest(s,newHrefs,opened){
    const seen=newHrefs.filter(h=>s.seen&&s.seen[h]).length;
    return{seen:Math.min(seen,NEED),need:NEED,done:!!s.questDone||seen>=NEED,skipped:!!s.questSkip,open:!!opened&&!s.questDone&&!s.questSkip&&seen<NEED};
  }

  /* ---------- the items ---------- */
  function groups(){try{return Nav5._t.GROUPS||[]}catch(e){return[]}}
  /* own rule of an item (its original `when`), without this module's filter */
  function ownOk(it){const p=it.__lc110p;if(!p)return true;try{return !!p()}catch(e){return false}}
  function rows(){
    const out=[],seen={};
    groups().forEach(g=>(g.sections||[]).forEach(sec=>(sec.items||[]).forEach(it=>{
      if(!it||!it.href||seen[it.href])return;seen[it.href]=1;wrapItem(it);
      out.push({g:g.id,gl:GNAME[g.id]||g.label,sec:sec.title||"",it:it});
    })));
    return out;
  }
  function isCore(it){
    if(ALWAYS.indexOf(it.href)>=0)return true;
    const c=cfg().core;return Array.isArray(c)?c.indexOf(it.href)>=0:!!it.featured;
  }
  const isOpen=()=>{const f=force();if(f)return f==="open";return !!st().unlockedAt};
  function visible(it){
    const c=cfg();
    return decide({on:c.on,core:isCore(it),exempt:exempt(),unlocked:isOpen(),off:!!st().off[it.href]});
  }
  function wrapItem(it){
    if(it.__lc110)return;
    if(it.when)it.__lc110p=it.when;
    it.when=function(){return ownOk(it)&&visible(it)};
    it.__lc110=1;
  }
  function wrapAll(){rows()}
  /* the features that open at Level 20 (that exist for this player) */
  const extras=()=>rows().filter(r=>!isCore(r.it)&&ownOk(r.it));
  const cores=()=>rows().filter(r=>isCore(r.it)&&ownOk(r.it));

  /* ---------- the unlock ---------- */
  function check(){
    try{
      const c=cfg();if(!c.on)return false;
      const s=st();if(s.unlockedAt)return false;
      const L=level();if(+L.level<c.level)return false;
      s.unlockedAt=Date.now();s.atLevel=+L.level;save(s);
      if(!exempt())say("Level "+c.level+": your full Hub is open. "+extras().length+" new features are in your menus.","good");
      try{if(typeof LC88!=="undefined")LC88.update()}catch(e){}
      return true;
    }catch(e){return false}
  }
  function markSeen(href){
    const s=st();if(!isOpen()||s.seen[href])return;
    if(!extras().some(r=>r.it.href===href))return;
    s.seen[href]=Date.now();save(s);
    const q=quest(s,extras().map(r=>r.it.href),true);
    if(q.seen>=NEED&&!s.questDone&&!s.questSkip){
      s.questDone=Date.now();save(s);
      try{if(typeof V6!=="undefined"&&V6.addXp)V6.addXp("think",QUEST_XP,{noBench:true,noFw:true})}catch(e){}
      say("Quest done: +"+QUEST_XP+" XP. Keep the features you like, switch off the rest.","good");
    }
  }

  /* ---------- LC88: one step after the unlock ---------- */
  function guide(){
    try{
      const c=cfg();if(!c.on||exempt())return null;
      if(route()===ROUTE)return null;
      const s=st();if(!isOpen()||s.dism)return null;
      const list=extras().map(r=>r.it.href),q=quest(s,list,true);if(!q.open)return null;
      return{html:"<b>Level "+c.level+": your full Hub is open.</b> <span class=\"lc88-s\">"+list.length+" new features are in your menus. Look at "+NEED+" of them ("+q.seen+" of "+NEED+" so far) and keep the ones you want.</span>",
        acts:[{label:"See what’s new",run:()=>{location.hash="#"+ROUTE},primary:true},{label:"×",dismiss:true,run:()=>{const x=st();x.dism=Date.now();save(x)}}],sig:"lc110-"+q.seen};
    }catch(e){return null}
  }

  /* ---------- the menus: one quiet row at the bottom ---------- */
  function foot(){
    try{
      const p=Q("#n5-panel");if(!p||p.hidden)return;
      const t=Q('[data-n5][aria-expanded="true"]'),gid=t&&t.getAttribute("data-n5");
      const old=Q("[data-lc110-foot]",p);if(old)old.remove();
      if(!gid||gid==="biz"||!cfg().on||exempt())return;
      const g=groups().filter(x=>x.id===gid)[0];if(!g)return;
      const mine=rows().filter(r=>r.g===gid&&ownOk(r.it)),hid=mine.filter(r=>!visible(r.it)).length;
      let h="";
      if(!isOpen()){
        if(!hid)return;
        const L=level();
        h='<a role="menuitem" class="n5-item lc110-foot" data-lc110-foot href="#'+ROUTE+'">'+ic("lock","n5-ico")+"<span><b>"+hid+" more open at Level "+cfg().level+"</b><small>You are Level "+(+L.level||1)+". See what they are.</small></span></a>";
      }else{
        h='<a role="menuitem" class="n5-item lc110-foot" data-lc110-foot href="#'+ROUTE+'">'+ic("sliders","n5-ico")+"<span><b>Manage features</b><small>"+(hid?hid+" switched off in this menu. ":"")+"Switch features on or off.</small></span></a>";
      }
      p.insertAdjacentHTML("beforeend",'<div class="n5-sec lc110-fsec">'+h+"</div>");
    }catch(e){}
  }

  /* ---------- the page ---------- */
  let OPENED={};
  function previewHTML(r,canSee){
    const it=r.it,help=HELPS[it.href]||"";
    return'<div class="lc110-prev" data-lc110-prev="'+E(it.href)+'">'
      +"<p><b>What it does:</b> "+E(it.note||it.label)+"</p>"
      +(help?"<p><b>How it helps:</b> "+E(help)+"</p>":"")
      +(canSee?'<a class="btn btn-quiet btn-sm" href="'+E(it.href)+'">'+ic("arrow-right")+" Open "+E(it.label)+"</a>":'<p class="lc110-dim">'+ic("lock")+" Opens at Level "+cfg().level+".</p>")
      +"</div>";
  }
  function rowHTML(r,mode){
    const it=r.it,s=st(),off=!!s.off[it.href],open=!!OPENED[it.href],looked=!!s.seen[it.href];
    const tog=mode==="open"?'<label class="lc110-sw" title="In my menu"><input type="checkbox" data-lc110-tog="'+E(it.href)+'"'+(off?"":" checked")+' aria-label="Show '+E(it.label)+' in my menu"><i aria-hidden="true"></i></label>':"";
    return'<li class="lc110-row'+(looked&&mode==="open"?" is-seen":"")+'">'
      +'<div class="lc110-top">'+ic(it.icon||"circle","lc110-ico")
      +'<span class="lc110-name"><b>'+E(it.label)+"</b><small>"+E(it.note||r.gl)+(looked&&mode==="open"?" · looked at":"")+"</small></span>"
      +'<button type="button" class="btn btn-quiet btn-sm lc110-pbtn" data-lc110-peek="'+E(it.href)+'" aria-expanded="'+open+'">'+(open?"Close":"Preview")+"</button>"+tog+"</div>"
      +(open?previewHTML(r,mode==="open"):"")+"</li>";
  }
  function listHTML(list,mode){
    const by={};list.forEach(r=>{(by[r.g]=by[r.g]||[]).push(r)});
    return Object.keys(GNAME).filter(k=>by[k]).map(k=>'<h3 class="lc110-gh">'+E(GNAME[k])+'</h3><ul class="lc110-list">'+by[k].map(r=>rowHTML(r,mode)).join("")+"</ul>").join("");
  }
  function ownerHTML(){
    if(!owner())return"";
    const c=cfg(),f=force(),all=rows();
    const core=Array.isArray(c.core)?c.core:all.filter(r=>r.it.featured||ALWAYS.indexOf(r.it.href)>=0).map(r=>r.it.href);
    return'<section class="lc110-card lc110-own" data-lc110-own><h2>'+ic("pen-ruler")+" Owner: core view</h2>"
      +'<p class="lc110-dim">Players start with the core items only. Everything else opens at the level below, through normal training. Default core = the blue items of the menus'+(Array.isArray(c.core)?" (you changed it)":"")+".</p>"
      +'<form data-lc110-cfg class="lc110-form">'
      +'<label class="lc110-chk"><input type="checkbox" name="on"'+(c.on?" checked":"")+"> Core view on (off = every player sees every feature)</label>"
      +'<label>Unlock level <input type="number" name="level" min="2" max="100" value="'+c.level+'" inputmode="numeric"></label>'
      +"<p class=\"lc110-dim\">XP needed for Level "+c.level+": "+xpFor(c.level).toLocaleString("en-US")+".</p>"
      +'<fieldset><legend>Core items (always in the menus)</legend><div class="lc110-grid">'
      +all.map(r=>'<label class="lc110-chk"><input type="checkbox" name="core" value="'+E(r.it.href)+'"'+(core.indexOf(r.it.href)>=0?" checked":"")+(ALWAYS.indexOf(r.it.href)>=0?" disabled":"")+"> "+E(r.gl+" · "+r.it.label)+(r.it.featured?" <span class=\"lc110-blue\">blue</span>":"")+"</label>").join("")
      +"</div></fieldset>"
      +'<div class="lc110-actions"><button type="submit" class="btn btn-primary btn-sm">Save</button><button type="button" class="btn btn-quiet btn-sm" data-lc110="blue">Use the blue items</button></div>'
      +'<p class="lc110-dim" data-lc110-msg role="status"></p></form>'
      +'<h3 class="lc110-gh">Preview on this device</h3><div class="lc110-actions">'
      +[["","Normal (owner sees all)"],["core","New player (core only)"],["open","Level reached"]].map(x=>'<button type="button" class="btn btn-sm '+(f===x[0]?"btn-primary":"btn-quiet")+'" data-lc110-force="'+x[0]+'">'+E(x[1])+"</button>").join("")
      +'</div><div class="lc110-actions"><button type="button" class="btn btn-quiet btn-sm" data-lc110="reset">Reset my unlock and quest on this device</button></div></section>';
  }
  function render(host){
    const v=host||Q("[data-lc110-page]");if(!v)return;css();wrapAll();
    const c=cfg(),s=st(),L=level(),ex=extras(),co=cores(),openNow=isOpen()||!c.on;
    let h='<header class="lc110-head"><p class="lc110-k">'+ic("layer-group")+" Your features</p><h1>"+(openNow?"Your full Hub":"Your core Hub")+"</h1></header>";
    if(exempt())h+='<p class="lc110-note">'+ic("eye")+" You see every feature (owner). Use the preview below to see what a player sees.</p>";
    if(!c.on){
      h+='<section class="lc110-card"><p>Every feature is in your menus.</p></section>';
    }else if(!isOpen()){
      const lv=+L.level||1,need=xpFor(c.level),have=Math.max(0,+L.xp||0),pct=Math.max(0,Math.min(100,Math.round(have/need*100)));
      h+='<section class="lc110-card"><p>You start with the core of the Hub: the blue items in your menus. Start there; the rest waits, so nothing gets in the way.</p>'
        +"<p>Everything else opens at <b>Level "+c.level+"</b>, by itself, through normal training: every review, drill and puzzle gives XP. No extra quests, no second gate.</p>"
        +'<div class="lc110-bar" role="progressbar" aria-label="Level '+lv+' of '+c.level+'" aria-valuenow="'+pct+'" aria-valuemin="0" aria-valuemax="100"><i style="width:'+pct+'%"></i></div>'
        +'<p class="lc110-dim">Level '+lv+" · "+have.toLocaleString("en-US")+" / "+need.toLocaleString("en-US")+" XP</p></section>";
      if(ex.length)h+='<section class="lc110-card"><h2>What opens at Level '+c.level+"</h2><p class=\"lc110-dim\">"+ex.length+" features. Tap Preview to see what each one does.</p>"+listHTML(ex,"locked")+"</section>";
    }else{
      const q=quest(s,ex.map(r=>r.it.href),true);
      if(q.open){
        h+='<section class="lc110-card lc110-quest" data-lc110-quest><h2>'+ic("compass")+" Explore what’s new <span class=\"lc110-opt\">optional</span></h2>"
          +'<ol class="lc110-steps"><li class="is-done">Open your feature list</li><li'+(q.seen>=NEED?' class="is-done"':"")+">Look at "+NEED+" features ("+q.seen+" of "+NEED+"): tap Preview, or open one</li><li>Keep or switch off what you want</li></ol>"
          +'<div class="lc110-bar"><i style="width:'+Math.round(q.seen/NEED*100)+'%"></i></div>'
          +'<div class="lc110-actions"><button type="button" class="btn btn-quiet btn-sm" data-lc110="skip">Skip the quest</button></div></section>';
      }else if(q.done&&!q.skipped){
        h+='<section class="lc110-card lc110-quest is-done"><p>'+ic("check")+" Quest done. Switch features on or off whenever you like.</p></section>";
      }
      h+='<section class="lc110-card"><h2>Unlocked at Level '+c.level+"</h2><p class=\"lc110-dim\">Switch a feature off and it leaves your menus. Switch it on and it is back.</p>"
        +'<div class="lc110-actions"><button type="button" class="btn btn-quiet btn-sm" data-lc110="allon">Show all</button><button type="button" class="btn btn-quiet btn-sm" data-lc110="alloff">Hide all of these</button></div>'
        +(ex.length?listHTML(ex,"open"):'<p class="lc110-dim">Nothing extra right now.</p>')+"</section>";
    }
    if(co.length)h+='<details class="lc110-card lc110-core"><summary><b>Your core features</b> <span class="lc110-dim">('+co.length+", always in your menus)</span></summary><ul class=\"lc110-clist\">"
      +co.map(r=>'<li><a href="'+E(r.it.href)+'">'+ic(r.it.icon||"circle")+" "+E(r.it.label)+"</a> <small>"+E(r.gl)+"</small></li>").join("")+"</ul></details>";
    h+=ownerHTML();
    v.innerHTML='<div class="lc110" data-lc110-page>'+h+"</div>";
  }
  function mount(v){
    const host=v||Q("#view");if(!host)return;css();check();OPENED={};
    host.innerHTML='<div data-lc110-page></div>';
    render(Q("[data-lc110-page]",host));
  }

  /* ---------- actions ---------- */
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    if(t.closest("[data-n5]")){setTimeout(foot,0);return}
    const pk=t.closest("[data-lc110-peek]");
    if(pk){e.preventDefault();const href=pk.getAttribute("data-lc110-peek");OPENED[href]=!OPENED[href];if(OPENED[href])markSeen(href);render();
      const b=Q('[data-lc110-peek="'+href+'"]');if(b)try{b.focus({preventScroll:true})}catch(x){}return}
    const fo=t.closest("[data-lc110-force]");
    if(fo){e.preventDefault();ls.set(FK,fo.getAttribute("data-lc110-force")||"");render();try{Nav5.render(route())}catch(x){}return}
    const b=t.closest("[data-lc110]");if(!b)return;
    const a=b.getAttribute("data-lc110"),s=st();
    if(a==="skip"){e.preventDefault();s.questSkip=Date.now();save(s);render();say("Fine. Your features are open: switch them on or off any time.","")}
    else if(a==="allon"||a==="alloff"){e.preventDefault();extras().forEach(r=>{if(a==="alloff")s.off[r.it.href]=1;else delete s.off[r.it.href]});save(s);render();try{Nav5.render(route())}catch(x){}}
    else if(a==="blue"){e.preventDefault();const f=Q("[data-lc110-cfg]");if(f)QA('input[name="core"]',f).forEach(i=>{const r=rows().filter(x=>x.it.href===i.value)[0];i.checked=!!(r&&(r.it.featured||ALWAYS.indexOf(r.it.href)>=0))})}
    else if(a==="reset"){e.preventDefault();save(blank());OPENED={};render();say("Unlock and quest reset on this device.","")}
  }
  function onChange(e){
    const t=e.target;if(!t||!t.getAttribute||!t.hasAttribute("data-lc110-tog"))return;
    const href=t.getAttribute("data-lc110-tog"),s=st();
    if(t.checked)delete s.off[href];else s.off[href]=1;save(s);
    try{Nav5.render(route())}catch(x){}
  }
  function onSubmit(e){
    const f=e.target&&e.target.closest&&e.target.closest("[data-lc110-cfg]");if(!f)return;e.preventDefault();
    let said="";const tell=m=>{said=m};
    const core=QA('input[name="core"]',f).filter(i=>i.checked||i.disabled).map(i=>i.value);
    const blue=rows().filter(r=>r.it.featured||ALWAYS.indexOf(r.it.href)>=0).map(r=>r.it.href);
    const same=core.length===blue.length&&core.every(h=>blue.indexOf(h)>=0);
    const next=cleanCfg({on:!!f.elements.on.checked,level:+f.elements.level.value,core:same?null:core});
    if(same)delete next.core;
    try{const d=Admin.ensureDraft(),v5=Object.assign({},d.v5||{});v5.lc110=next;d.v5=V5Doc.clean(v5);Admin.saveDraft(d);try{V5Doc.apply(d.v5)}catch(x){}tell("Saved on this device. Publish to make it live.");say("Saved. Publish to make it live.","good")}
    catch(x){tell("Sign in to admin mode first to change the live settings.")}
    render();const msg=Q("[data-lc110-msg]");if(msg)msg.textContent=said;
  }

  /* ---------- owner menu row ---------- */
  function ownerRow(){
    try{
      const m=Q("#lc49-menu");if(!m||Q("[data-lc110-ownrow]",m)||!owner())return;
      const ref=Q("[data-lc85-own]",m)||Q("[data-lc82-own]",m)||Q("[data-lc74-own]",m)||Q("[data-lc73-own]",m)||Q("[data-lc59-admin]",m);if(!ref)return;
      const b=D.createElement("a");b.href="#"+ROUTE;b.className="lc49-mi lc49-tool";b.setAttribute("data-lc110-ownrow","1");
      b.innerHTML="<span><b>Core view & Level "+cfg().level+"</b><small>Which features new players see, the unlock level, preview</small></span>";
      b.addEventListener("click",()=>{try{const mm=Q("#lc49-menu");if(mm)mm.remove()}catch(x){}});
      ref.insertAdjacentElement("beforebegin",b);
    }catch(e){}
  }

  function css(){
    if(Q("#lc110-css"))return;const s=D.createElement("style");s.id="lc110-css";
    s.textContent=".lc110{display:grid;gap:14px;max-width:760px;margin:0 auto}.lc110-head h1{margin:2px 0 0}.lc110-k{margin:0;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#38bdf8}"
      +".lc110-card{background:#1e293b;border:1px solid #334155;border-radius:14px;padding:14px 16px;display:grid;gap:10px;min-width:0}.lc110-card h2{margin:0;font-size:17px}.lc110-card p{margin:0;line-height:1.5}"
      +".lc110-note{margin:0;padding:10px 12px;border-radius:12px;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.35);color:#e2e8f0}"
      +".lc110-dim{color:#94a3b8;font-size:13.5px}.lc110-opt{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;border:1px solid #475569;border-radius:999px;padding:1px 8px;margin-left:6px;vertical-align:middle}"
      +".lc110-bar{height:8px;border-radius:999px;background:#0f172a;overflow:hidden}.lc110-bar i{display:block;height:100%;background:#38bdf8;border-radius:999px}"
      +".lc110-gh{margin:6px 0 0;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#94a3b8}"
      +".lc110-list,.lc110-clist{list-style:none;margin:0;padding:0;display:grid;gap:6px}.lc110-row{border:1px solid #334155;border-radius:12px;background:#0f172a;padding:6px 8px;min-width:0}.lc110-row.is-seen{border-color:rgba(56,189,248,.45)}"
      +".lc110-top{display:flex;align-items:center;gap:10px;min-height:44px;min-width:0}.lc110-ico{flex:none;width:32px;height:32px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;background:#1e293b;color:#38bdf8}"
      +".lc110-name{flex:1;min-width:0;display:flex;flex-direction:column}.lc110-name b{font-size:14.5px;overflow-wrap:anywhere}.lc110-name small{color:#94a3b8;font-size:12px}"
      +".lc110-pbtn{min-height:44px;flex:none}.lc110-prev{padding:8px 4px 6px 42px;display:grid;gap:8px}.lc110-prev .btn{justify-self:start;min-height:44px}"
      +".lc110-sw{position:relative;flex:none;width:52px;height:44px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.lc110-sw input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}"
      +".lc110-sw i{width:44px;height:26px;border-radius:999px;background:#475569;position:relative;transition:background .15s}.lc110-sw i:after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#e2e8f0;transition:transform .15s}"
      +".lc110-sw input:checked+i{background:#38bdf8}.lc110-sw input:checked+i:after{transform:translateX(18px);background:#0f172a}.lc110-sw input:focus-visible+i{outline:2px solid #38bdf8;outline-offset:2px}"
      +".lc110-steps{margin:0;padding-left:20px;display:grid;gap:4px}.lc110-steps li.is-done{color:#94a3b8;text-decoration:line-through}.lc110-quest{border-color:rgba(56,189,248,.5)}"
      +".lc110-actions{display:flex;flex-wrap:wrap;gap:8px}.lc110-actions .btn{min-height:44px}"
      +".lc110-core summary{cursor:pointer;min-height:44px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}.lc110-clist a{display:inline-flex;align-items:center;gap:6px;min-height:40px;color:#e2e8f0}.lc110-clist small{color:#94a3b8}"
      +".lc110-form{display:grid;gap:10px}.lc110-form input[type=number]{min-height:44px;width:90px;margin-left:8px;border-radius:10px;background:#0f172a;color:#e2e8f0;border:1px solid #334155;padding:0 10px;font-size:16px}"
      +".lc110-form fieldset{border:1px solid #334155;border-radius:12px;padding:8px 10px;margin:0;min-width:0}.lc110-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:2px 12px}"
      +".lc110-chk{display:flex;align-items:center;gap:8px;min-height:40px;overflow-wrap:anywhere}.lc110-chk input{width:20px;height:20px;flex:none}.lc110-blue{font-size:11px;color:#38bdf8;border:1px solid rgba(56,189,248,.5);border-radius:999px;padding:0 6px}"
      +".n5-item.lc110-foot{opacity:.9;border:1px dashed #475569}.n5-item.lc110-foot b{color:#cbd5e1}.lc110-fsec{margin-top:4px}";
    D.head.appendChild(s);
  }

  /* ---------- wiring ---------- */
  let cur="";
  function afterRender(r){
    cur=String(r||"");css();wrapAll();check();
    try{const h="#"+route();if(isOpen()&&h!=="#"+ROUTE)markSeen(h)}catch(e){}
    setTimeout(ownerRow,300);
  }
  function init(){
    try{
      css();D.addEventListener("click",onClick);D.addEventListener("change",onChange);D.addEventListener("submit",onSubmit,true);
      D.addEventListener("keydown",e=>{if(e.key==="ArrowDown"&&e.target&&e.target.closest&&e.target.closest("[data-n5]"))setTimeout(foot,0)});
      if(typeof MOUNT!=="undefined"){MOUNT[ROUTE]=mount;try{DOC_TITLES[ROUTE]="Your features";ROUTE_TITLES[ROUTE]="your features"}catch(e){}}
      /* the page opens from quest level 1; once Level 20 is reached no quest level holds any route back */
      try{const lv=LC26.levels,o=lv.minLevel;if(lv&&!lv.__lc110){lv.__lc110=1;lv.minLevel=r=>(r===ROUTE||(cfg().on&&isOpen()))?1:o(r)}}catch(e){}
      wrapAll();
      setInterval(()=>{if(D.visibilityState==="visible")check()},20000);
      let t=0;new MutationObserver(()=>{if(t)return;t=setTimeout(()=>{t=0;if(Q("#lc49-menu")&&!Q("[data-lc110-ownrow]"))ownerRow()},250)}).observe(D.body,{childList:true});
    }catch(e){console.error("lc110",e)}
  }
  return{init:init,afterRender:afterRender,mount:mount,guide:guide,visible:visible,unlocked:isOpen,cleanCfg:cleanCfg,version:VERSION,
    _t:{decide:decide,quest:quest,cfg:cfg,st:st,save:save,blank:blank,rows:rows,extras:extras,cores:cores,isCore:isCore,check:check,level:level,xpFor:xpFor,foot:foot,HELPS:HELPS,K:K,FK:FK}};
})(); /*@@end lc110*/
