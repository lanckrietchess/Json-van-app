const LC45=(()=>{
  "use strict";
  /* LC45 (build 9.20.5): account navigation, admin switch, conversion banner, coach avatar, purchase watcher, community error panel.
     1. The profile chip opens My Account for members and the owner; a small caret next to it opens the dropdown. Guests still get the sign-in sheet (LC40).
     2. The dropdown: "My Account" is gone, "My Membership & Upgrades" and the blue suggestion sit right under the header; Creator Studio is there in admin mode.
     3. Admin: "view the app as" (own access, tiers, B2C/B2B roles), the admin menu, a way back when viewing as a role, and a sign-in entry (#admin).
     4. A dismissible conversion banner under the walkthrough / feedback row: dismissed = hidden 24 h, the next times 3 days.
     5. Coach Lanckriet's avatar (the official images of the data repo, with the right expression) in the banner and on the guided-flow sheets.
     6. After a Payment Link purchase the app claims tokens / the membership when the member comes back (the webhook needs a moment).
     7. Community load errors get a "Try again" button and, for the owner, the reason. */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.prototype.slice.call((r||document).querySelectorAll(s));
  const E=s=>{try{return esc(s)}catch(e){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}};
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const real=()=>{try{return !!Admin.real()}catch(e){return false}};
  const admin=()=>{try{return !!Admin.active}catch(e){return false}};
  const paid=()=>{try{return App.rank()>=2}catch(e){return false}};
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const hashNow=()=>{let h="";try{h=decodeURIComponent((location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){h=""}return h.split("/")[0].split("?")[0]};
  const refresh=()=>{try{refreshChip()}catch(e){}try{rerender()}catch(e){}};

  /* ---------- 5. Coach Lanckriet's avatar ---------- */
  const EMO=["neutral","thinking","serious","happy","skeptical","tough_love"];
  function avUrl(emo){
    emo=EMO.indexOf(emo)>=0?emo:"neutral";let u="";
    try{u=LC29.avatar.peek(emo)||LC29.avatar.peek("neutral")||""}catch(e){}
    if(!u){try{const c=CONFIG&&CONFIG.coachAvatar;if(typeof c==="string"&&/^https:\/\//.test(c))u=c}catch(e){}}
    return u;
  }
  function coachAv(emo,size){
    size=size||40;const u=avUrl(emo);
    if(u)return'<img class="lc45-av" data-lc45-emo="'+E(emo||"neutral")+'" src="'+E(u)+'" alt="Coach Lanckriet" width="'+size+'" height="'+size+'" referrerpolicy="no-referrer">';
    let h="";try{h=LC19.coach.avatar(size)||""}catch(e){}
    return'<span class="lc45-av lc45-av-ph" data-lc45-emo="'+E(emo||"neutral")+'" style="width:'+size+'px;height:'+size+'px">'+(h||"♞")+'</span>';
  }
  const warm=emo=>{try{const p=LC29.avatar.get(emo);if(p&&p.then)p.then(()=>setTimeout(refreshAv,50)).catch(()=>{})}catch(e){}};
  function refreshAv(){QA("[data-lc45-emo]").forEach(el=>{const emo=el.getAttribute("data-lc45-emo"),u=avUrl(emo);if(el.tagName==="IMG"){if(u&&el.getAttribute("src")!==u)el.setAttribute("src",u)}else if(u){const w=el.style.width||"40px";el.outerHTML=coachAv(emo,parseInt(w,10)||40)}})}
  /* the guided-flow sheets (LC42 path, LC43 upgrade pop-up) get a coach row with the right expression */
  function emoFor(sh){
    const t=sh.textContent||"";
    if(sh.classList.contains("lc42-tease")){if(/That is the move/.test(t))return"happy";if(/still loses ground/.test(t))return"skeptical";if(/Clean game/.test(t))return"happy";return"thinking"}
    if(/Level \d unlocked/.test(t))return"happy";
    if(sh.classList.contains("lc43-sheet"))return"happy";
    return"neutral";
  }
  function decorate(){
    QA(".lc42-sheet,.lc43-sheet,.lc44-sheet").forEach(w=>{
      const host=w.classList.contains("sheet")?w:(Q(".sheet-body",w)||Q(".sheet",w)||w);
      let row=Q(".lc45-coachrow",host);const emo=emoFor(w);
      if(!row){row=document.createElement("div");row.className="lc45-coachrow";row.innerHTML=coachAv(emo,40)+'<span><b>Coach Lanckriet</b></span>';host.insertBefore(row,host.firstChild);warm(emo)}
      else{const im=Q("[data-lc45-emo]",row);if(im&&im.getAttribute("data-lc45-emo")!==emo){const nu=document.createElement("span");nu.innerHTML=coachAv(emo,40);im.replaceWith(nu.firstChild)}}
    });
  }

  /* ---------- 1. the chip opens My Account, the caret opens the menu ---------- */
  let pass=false;
  function onChip(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t||!t.closest("#profile-chip")||pass)return;
    if(!sess()&&!real())return;                         /* guests: the sign-in sheet of LC40 */
    e.preventDefault();e.stopImmediatePropagation();
    location.hash="#account";
  }
  function ensureCaret(){
    const chip=Q("#profile-chip");if(!chip||Q("#pm-caret"))return;
    const b=document.createElement("button");b.type="button";b.id="pm-caret";b.className="pm-caret";b.setAttribute("aria-haspopup","menu");b.setAttribute("aria-label","Open the menu");b.innerHTML="▾";
    chip.insertAdjacentElement("afterend",b);
    b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();pass=true;try{chip.click()}finally{pass=false}});
  }

  /* ---------- 2 + 3. the dropdown ---------- */
  let busy=false;
  const VIEW=[["","Admin (full access)"],["tier:free","A free player"],["tier:community","A free member"],["tier:vault","A Pro member"],["tier:mentor","A VIP member"]];
  function viewValue(){try{const r=Admin.viewingAs();if(r)return"role:"+r;const p=Admin.preview();return p?"tier:"+p:""}catch(e){return""}}
  function adminBlock(p,anchor){
    let blk=Q(".lc45-adm",p);
    if(real()){
      const cur=viewValue();
      const roles=(()=>{try{return Admin.roles().filter(r=>r.id!=="admin")}catch(e){return[]}})();
      const html='<label class="small muted" for="lc45-view">Admin: view the app as</label><select class="input" id="lc45-view" data-lc45-view>'
        +VIEW.map(v=>'<option value="'+v[0]+'"'+(cur===v[0]?" selected":"")+'>'+E(v[1])+'</option>').join("")
        +roles.map(r=>'<option value="role:'+E(r.id)+'"'+(cur==="role:"+r.id?" selected":"")+'>'+E(r.label)+'</option>').join("")
        +'</select><div class="btn-row"><button type="button" class="btn btn-quiet btn-sm" data-lc45-adminmenu>Admin menu</button></div>';
      if(!blk){blk=document.createElement("div");blk.className="lc45-adm";blk.innerHTML=html;anchor.after(blk)}
      else if(blk.getAttribute("data-cur")!==cur){blk.innerHTML=html}
      blk.setAttribute("data-cur",cur);
    }else{
      let known=false;try{known=typeof ADMIN_TOKEN!=="undefined"&&!!Store.get(ADMIN_TOKEN,null)}catch(e){}
      if(known&&!blk){blk=document.createElement("div");blk.className="lc45-adm";blk.innerHTML='<button type="button" class="pm-item" data-lc45-gate>Admin sign-in</button>';anchor.after(blk)}
      else if(!known&&blk)blk.remove();
    }
  }
  function tidy(){
    const p=Q("#pm-panel");if(!p||busy)return;busy=true;
    try{
      QA('a.pm-item[href="#account"]',p).forEach(a=>a.remove());
      const head=Q(".lc30-pmhead",p)||null,up=Q('a.pm-item[href="#upgrades"]',p),sug=Q(".lc37-sug",p);
      let anchor=head;
      if(up){up.classList.add("pm-primary");if(anchor){if(anchor.nextElementSibling!==up)anchor.after(up)}else if(p.firstElementChild!==up)p.insertBefore(up,p.firstChild);anchor=up}
      if(sug){sug.classList.add("pm-primary");if(anchor&&anchor.nextElementSibling!==sug)anchor.after(sug);anchor=sug}
      /* any other block with a blue primary button stays in the top group */
      QA(":scope > *",p).forEach(c=>{if(c!==up&&c!==sug&&c!==head&&!c.classList.contains("lc45-adm")&&!c.classList.contains("pm-item")&&c.querySelector&&c.querySelector(".btn-primary,.btn.primary")&&anchor&&anchor.nextElementSibling!==c){anchor.after(c);anchor=c}});
      if(anchor)adminBlock(p,anchor);
      /* Creator Studio, in admin mode, right under the MSPC System */
      const sys=Q('a.pm-item[href="#system"]',p),has=Q('a.pm-item[href="#studio"]',p);
      if(admin()&&sys&&!has){const a=document.createElement("a");a.setAttribute("role","menuitem");a.className="pm-item";a.href="#studio";a.innerHTML=(()=>{try{return icon("video")}catch(e){return""}})()+"<span>Creator Studio</span>";sys.after(a)}
      else if(!admin()&&has)has.remove();
    }finally{busy=false}
  }
  let pmObs=null;
  function watchPanel(){
    const p=Q("#pm-panel");if(!p||p.__lc45)return;p.__lc45=true;
    let b=false;pmObs=new MutationObserver(()=>{if(b||busy)return;b=true;setTimeout(()=>{b=false;tidy()},0)});pmObs.observe(p,{childList:true});
    p.addEventListener("change",e=>{
      const s=e.target&&e.target.closest?e.target.closest("[data-lc45-view]"):null;if(!s)return;
      const v=String(s.value||"");
      try{
        if(v.indexOf("role:")===0)Admin.setRole(v.slice(5));
        else{Admin.setRole("");Admin.setPref("preview",v.indexOf("tier:")===0?v.slice(5):"")}
      }catch(x){}
      refresh();paintPill();setTimeout(()=>{const c=Q("#pm-caret");if(c&&Q("#pm-panel")&&!Q("#pm-panel").hidden){}},0);
    });
    tidy();
  }
  function panelClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    if(t.closest("[data-lc45-adminmenu]")){e.preventDefault();const c=Q("#admin-chip");if(c)c.click();return}
    if(t.closest("[data-lc45-gate]")){e.preventDefault();try{CMS.gate()}catch(x){}return}
    if(t.closest("[data-lc45-exit]")){e.preventDefault();try{Admin.setRole("");Admin.setPref("preview","")}catch(x){}refresh();paintPill();return}
  }
  /* viewing as a B2C/B2B role hides the admin chip: this pill is the way back */
  function paintPill(){
    let pill=Q("#lc45-pill");
    let viewing="";try{viewing=real()&&!admin()?Admin.viewingAs():""}catch(e){}
    if(!viewing){if(pill)pill.remove();return}
    let label=viewing;try{label=Admin.roleDef(viewing).short||viewing}catch(e){}
    if(!pill){pill=document.createElement("div");pill.id="lc45-pill";pill.className="lc45-pill";document.body.appendChild(pill)}
    pill.innerHTML='<span>Viewing as <b>'+E(label)+'</b></span><button type="button" class="btn btn-primary btn-sm" data-lc45-exit>Back to Admin</button>';
  }

  /* ---------- 4. the conversion banner ---------- */
  const BK="lc45-ban";
  const dismissed=()=>{const b=rd(BK,null);return !!b&&(+b.until||0)>Date.now()};
  function dismiss(){const b=rd(BK,null),n=(b&&+b.n||0)+1;wr(BK,{n:n,until:Date.now()+(n<=1?24:72)*36e5});const x=Q("#lc45-banner");if(x)x.remove()}
  let bannerSeq=0;
  async function paintBanner(route){
    const seq=++bannerSeq,old=Q("#lc45-banner");
    const on=(route==="home"||route==="quests"||route==="")&&!real()&&!paid()&&!dismissed()&&!(()=>{try{return LC42.owns()}catch(e){return false}})();
    if(!on){if(old)old.remove();return}
    const host=Q("#top-actions");if(!host){return}
    let open=true;try{open=await LC44._t.foundingOpen(2)}catch(e){open=true}
    if(seq!==bannerSeq||dismissed())return;
    const text=open?"Upgrade to Pro / VIP with Founding Member Discount":"Upgrade to Pro / VIP";
    let b=Q("#lc45-banner");
    if(!b){b=document.createElement("aside");b.id="lc45-banner";b.className="lc45-banner";b.setAttribute("role","note");host.insertAdjacentElement("afterend",b)}
    b.innerHTML=coachAv("happy",40)+'<span class="lc45-bt">'+E(text)+'</span><button type="button" class="btn btn-primary" data-lc45-up>'+(open?"See the Founding rate":"See the plans")+'</button><button type="button" class="lc45-x" data-lc45-x aria-label="Dismiss for now">×</button>';
    warm("happy");
  }
  function bannerClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    if(t.closest("[data-lc45-x]")){e.preventDefault();dismiss();return}
    if(t.closest("[data-lc45-up]")){e.preventDefault();try{LC43.open("",null)}catch(x){location.hash="#upgrades"}}
  }

  /* ---------- 6. after a Payment Link purchase ---------- */
  const PK="lc45-pay",DAY3=3*36e5;
  const marked=()=>{const p=rd(PK,null);return p&&Date.now()-(+p.t||0)<DAY3?p:null};
  function mark(){wr(PK,{t:Date.now()})}
  let claiming=false,timers=[];
  async function claimNow(){
    if(claiming||!sess())return;claiming=true;
    try{
      let got=0;
      try{got=await LC36.tokens.claim(true)||0}catch(e){}
      try{await LC36.licence.claim()}catch(e){}
      try{if(paid()||got>0){wr(PK,null)}}catch(e){}
    }finally{claiming=false}
  }
  function backFromPay(){
    if(!marked()||document.visibilityState==="hidden")return;
    timers.forEach(clearTimeout);timers=[];
    [1500,12000,40000,120000].forEach(ms=>timers.push(setTimeout(()=>{if(marked())claimNow()},ms)));
  }

  /* ---------- 7. community: load errors with a way out ---------- */
  async function diagArena(r){
    const st=r&&r.status,why=r&&r.reason;
    if(st===404||why==="unknown_action"||why==="bad_action")return{u:"The community is not fully connected yet.",o:"The arena function does not know the community actions (c39_*). Apply patch_arena_lc38.py and patch_arena_lc39.py to arena.js and redeploy: supabase functions deploy arena --no-verify-jwt"};
    if(st===401||st===403)return{u:"The community cannot be reached right now.",o:"The arena function answered "+st+": deploy it with --no-verify-jwt."};
    if(why==="off")return{u:"The community is not connected yet.",o:"The arena says the community is off: check its secrets and the LC39 SQL migration."};
    if(st===0||why==="network"||why==="offline"){
      if(typeof navigator!=="undefined"&&navigator.onLine===false)return{u:"You seem to be offline. Check your connection and try again.",o:"The browser reports no network."};
      let reach=false,url="";try{url=arenaUrl()}catch(e){}
      try{if(url){await fetch(url,{method:"GET",mode:"no-cors"});reach=true}}catch(e){reach=false}
      let origin="";try{origin=location.origin}catch(e){}
      return reach?{u:"We could not reach the community from here. Nothing you wrote is lost.",o:"The arena function is reachable but the browser blocked the answer (CORS). Set the secret ALLOWED_ORIGINS on the arena function to include "+origin+" (and the Vercel address), then redeploy it."}
                  :{u:"We could not reach the community server. Nothing you wrote is lost.",o:"The arena function cannot be reached at all: it is not deployed, the project is paused, or the address is wrong."};
    }
    if(st>=500)return{u:"The community server had a problem. Please try again in a minute.",o:"The arena function crashed (HTTP "+st+"). Supabase > Edge Functions > arena > Logs shows the error. Usual causes: a missing secret (PID_SALT, ADMIN_TOKEN, SUPABASE_URL, ...), a database call that fails, or a module you just added (remove its wiring lines and redeploy to test)."+(r&&r.text?" Answer: "+String(r.text).slice(0,200):"")};
    return{u:"The community could not load. Please try again.",o:"The arena answered "+(st||"?")+(why?" ("+why+")":"")+". Check its logs."};
  }
  function commError(host,r,retry){
    if(!host)return;
    host.innerHTML='<div class="lc45-err panel pad" role="alert"><p class="form-msg is-bad" data-lc45-emsg>Loading…</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc45-retry>Try again</button></div><p class="small muted" data-lc45-eown></p></div>';
    const b=Q("[data-lc45-retry]",host);if(b)b.addEventListener("click",()=>{b.disabled=true;try{retry&&retry()}catch(e){}});
    diagArena(r).then(d=>{const m=Q("[data-lc45-emsg]",host),o=Q("[data-lc45-eown]",host);if(m)m.textContent=d.u;if(o)o.textContent=(real()||/[?&]debug/.test(location.search))?"Owner: "+d.o:"Still stuck? Send a DM to @lanckrietchess on Instagram."});
  }

  /* ---------- wiring ---------- */
  let obs=null;
  function afterRender(route){
    try{
      ensureCaret();watchPanel();paintPill();
      const run=()=>{paintBanner(hashNow());decorate();tidy()};
      setTimeout(run,160);
      if(obs){try{obs.disconnect()}catch(e){}obs=null}
      if(typeof MutationObserver==="function"){let b=false;const m=obs=new MutationObserver(()=>{if(b)return;b=true;setTimeout(()=>{b=false;decorate();watchPanel()},150)});m.observe(document.body,{childList:true,subtree:true});setTimeout(()=>{try{m.disconnect()}catch(x){}if(obs===m)obs=null},8000)}
    }catch(e){}
  }
  function css(){
    if(Q("#lc45-css"))return;const s=document.createElement("style");s.id="lc45-css";
    s.textContent='.pm-caret{min-width:44px;min-height:44px;border:0;background:transparent;color:inherit;font-size:1.1rem;cursor:pointer;border-radius:10px}.pm-caret:hover{background:rgba(148,163,184,.15)}'
    +'#pm-panel .pm-primary{background:rgba(56,189,248,.14);color:#38bdf8;font-weight:800}.lc45-adm{display:grid;gap:6px;padding:8px 12px;border-top:1px dashed rgba(148,163,184,.3);border-bottom:1px dashed rgba(148,163,184,.3)}.lc45-adm .input{min-height:44px}'
    +'.lc45-banner{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:8px 0 0;padding:10px 12px;border:1px solid rgba(251,191,36,.45);border-radius:14px;background:linear-gradient(90deg,rgba(251,191,36,.12),rgba(56,189,248,.07))}'
    +'.lc45-bt{flex:1 1 220px;font-weight:700}.lc45-banner .btn{min-height:44px}.lc45-x{min-width:44px;min-height:44px;background:none;border:0;color:inherit;cursor:pointer;font-size:1.5rem;line-height:1}'
    +'.lc45-av{border-radius:50%;object-fit:cover;flex:none;background:#1e293b}.lc45-av-ph{display:inline-grid;place-items:center;color:#38bdf8;font-size:1.3rem}.lc45-coachrow{display:flex;align-items:center;gap:10px;margin:0 0 10px}'
    +'.lc45-pill{position:fixed;left:12px;bottom:12px;z-index:90;display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:999px;background:#0f172a;border:1px solid rgba(56,189,248,.5);box-shadow:0 8px 30px rgba(0,0,0,.4)}.lc45-pill .btn{min-height:44px}'
    +'.lc45-err{display:grid;gap:8px}.lc45-err .btn{min-height:44px}';
    document.head.appendChild(s);
  }
  function openAdminGate(){if(hashNow()==="admin"){location.hash="#quests";setTimeout(()=>{try{CMS.gate()}catch(e){}},300)}}
  function init(){
    try{
      css();
      try{const i=PM_ITEMS.findIndex(x=>x[0]==="#account");if(i>=0)PM_ITEMS.splice(i,1)}catch(e){}
      document.addEventListener("click",onChip,true);
      document.addEventListener("click",panelClick,true);
      document.addEventListener("click",bannerClick,true);
      try{const og=LC36.support.go;if(typeof og==="function"&&!og.__lc45){const f=function(u){mark();return og.apply(this,arguments)};f.__lc45=true;LC36.support.go=f}}catch(e){}
      document.addEventListener("visibilitychange",backFromPay);window.addEventListener("focus",backFromPay);window.addEventListener("pageshow",backFromPay);
      window.addEventListener("hashchange",()=>{openAdminGate();paintBanner(hashNow())});
      window.addEventListener("lc39-signed-in",()=>{if(marked())setTimeout(claimNow,800)});
      if(/[?&]paid=/.test(location.hash||"")||/[?&]paid=/.test(location.search||"")){mark();setTimeout(claimNow,1200);backFromPay()}
      ensureCaret();watchPanel();paintPill();openAdminGate();
      if(marked())setTimeout(backFromPay,1500);
    }catch(e){console.error("lc45",e)}
  }
  return{init:init,afterRender:afterRender,commError:commError,coachAv:coachAv,tidy:tidy,_t:{dismiss:dismiss,dismissed:dismissed,paintBanner:paintBanner,claimNow:claimNow,diagArena:diagArena,mark:mark,decorate:decorate,marked:marked}};
})();
