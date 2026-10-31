const LC40=(()=>{
  "use strict";
  /* LC40: (1) the avatar asks guests to sign in (Google first), (2) a quiet "save your progress" hint, (3) level-up / upgrade pop-ups wait until the exercise is done. */
  const Q=(s,r)=>(r||document).querySelector(s);
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const admin=()=>{try{return !!Admin.active}catch(e){return false}};
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const hashNow=()=>{let h="";try{h=decodeURIComponent((location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){h=""}return h.split("/")[0].split("?")[0]};

  /* ================= 3. Deferred pop-ups ================= */
  const TASK=new Set(["think","mspc-rep","shuffle","themes","openings","middlegame","endgame","puzzles","trim","vision","survival","bot","clinic","srs","review-queue","ranked","brilliant","vault-browser"]);
  const busy=()=>{try{return TASK.has(hashNow())||!!Q("#view .trainer")}catch(e){return false}};
  let queue=[],releasing=false,timer=0,ct=0,ht=0,tries=0;
  /* hold(key,fn): true = queued because an exercise is on screen (fn runs later); false = show it now */
  function hold(key,fn){
    if(releasing||!busy())return false;
    queue=queue.filter(x=>x.key!==key).concat([{key:key,fn:fn,t:Date.now()}]).slice(-5);
    return true;
  }
  function flush(force){
    clearTimeout(timer);
    if(!queue.length)return;
    if(!force&&busy())return;
    if(Q(".sheet-wrap")){if(++tries<=6)timer=setTimeout(()=>flush(force),1500);return}
    tries=0;
    const it=queue.shift();
    releasing=true;try{it.fn()}catch(e){console.error("lc40",e)}finally{releasing=false}
    if(queue.length)timer=setTimeout(()=>flush(force),1500);
  }
  /* an exercise was finished (the XP award is the common end of a puzzle, drill or lesson step): show what waited, after the result had a moment */
  function complete(){
    if(!queue.length)return;
    clearTimeout(ct);ct=setTimeout(()=>flush(true),1400);
  }
  const classify=o=>{
    const t=String(o&&o.title||""),c=" "+String(o&&o.cls||"")+" ";
    if(/^Level \d+ unlocked$/.test(t)&&c.indexOf(" lc37-sheet ")>=0)return"level";
    if(/^You reached \d+/.test(t))return"upgrade";
    if(c.indexOf(" lc36-consent ")>=0||c.indexOf(" lc39-mailsheet ")>=0)return"consent";
    return"";
  };
  function wrapSheet(){
    const o=window.openSheet;if(typeof o!=="function"||o.__lc40)return;
    const f=function(opts){
      const k=classify(opts);
      if(k&&hold(k,()=>o(opts)))return{el:document.createElement("div"),close:function(){}};
      return o.apply(this,arguments);
    };
    f.__lc40=true;window.openSheet=f;
  }
  function wrapToast(){
    const o=window.toast;if(typeof o!=="function"||o.__lc40)return;
    const f=function(m){
      if(/^Your membership is unlocked/.test(String(m||""))){const a=arguments;if(hold("upgrade-toast",()=>o.apply(null,a)))return}
      return o.apply(this,arguments);
    };
    f.__lc40=true;window.toast=f;
  }

  /* ================= 2. Avatar: guests get the sign-in sheet, Google first ================= */
  let authSheet=null,fromChip=false,skip=false;
  function authHTML(){
    return'<div class="lc39-gate lc40-gate"><p>Sign in to save your progress, keep your membership on every device and unlock Social. It takes about 20 seconds.</p>'
      +'<button type="button" class="btn btn-primary lc39-google" data-lc39-google>Sign in with Google</button>'
      +'<p class="small muted lc39-or">or get a sign-in link by email</p>'
      +'<form data-lc39-mail class="lc39-row"><input class="input" name="email" type="email" required autocomplete="email" placeholder="you@example.com" aria-label="Email address"><button type="submit" class="btn btn-ghost">Email me a sign-in link</button></form>'
      +LC26.sync.codeForm("lc39")
      +'<p class="form-msg" data-lc39-gmsg aria-live="polite"></p>'
      +'<button type="button" class="btn btn-quiet lc40-guest" data-close data-lc40-guest>Continue as guest</button></div>';
  }
  function openAuth(){
    if(Q(".lc40-auth")||typeof openSheet!=="function")return;
    authSheet=openSheet({title:"Sign in",cls:"lc40-auth",html:authHTML()});
  }
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    if(t.closest("[data-lc40-nx]")){e.preventDefault();wr("lc40-nudge",Date.now());const n=Q("#lc40-nudge");if(n)n.remove();return}
    if(t.closest("[data-lc40-guest]")){skip=true;fromChip=false;setTimeout(()=>{const c=Q("#profile-chip");if(c)c.click()},280);return}
    if(t.closest("#profile-chip")){
      if(skip){skip=false;return}
      if(sess()||admin())return;                       /* signed in: the normal account menu (My Account first) opens */
      e.preventDefault();e.stopImmediatePropagation();fromChip=true;openAuth();
    }
  }

  /* quiet, non-blocking hint on pages that hold your own data; never on a screen with a board or a trainer */
  const NUDGE=new Set(["quests","trim","insights","trophies","srs","games","review-queue","profile","vault-browser"]);
  function paintNudge(route){
    const v=Q("#view");if(!v)return;
    const on=Q("#lc40-nudge",v);
    const want=NUDGE.has(route)&&!sess()&&!admin()&&Date.now()-(+rd("lc40-nudge",0)||0)>3*864e5&&!Q(".board-host,.trainer",v);
    if(!want){if(on)on.remove();return}
    if(on)return;
    const a=document.createElement("aside");a.id="lc40-nudge";a.className="lc40-nudge";a.setAttribute("role","note");
    a.innerHTML='<span>Save your progress: connect your account so it follows you to every device.</span><button type="button" class="btn btn-primary" data-lc39-google>Sign in with Google</button><button type="button" class="lc40-x" data-lc40-nx aria-label="Dismiss">\u00d7</button>';
    const strip=Q("#lc39-q",v);
    if(strip&&strip.parentNode===v)v.insertBefore(a,strip.nextSibling);else v.insertBefore(a,v.firstChild);
  }
  let obs=null;
  function afterRender(route){
    try{
      if(obs){try{obs.disconnect()}catch(e){}obs=null}
      const run=()=>{try{paintNudge(hashNow())}catch(e){}};
      setTimeout(run,120);
      if(typeof MutationObserver==="function"){
        let b=false;const mine=obs=new MutationObserver(()=>{if(b)return;b=true;setTimeout(()=>{b=false;run()},120)});
        mine.observe(document.body,{childList:true,subtree:true});
        setTimeout(()=>{try{mine.disconnect()}catch(e){}if(obs===mine)obs=null},15000);
      }
    }catch(e){}
  }
  function css(){
    if(Q("#lc40-css"))return;const s=document.createElement("style");s.id="lc40-css";
    s.textContent='.lc40-nudge{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 12px;padding:10px 12px;border:1px solid rgba(56,189,248,.35);background:rgba(56,189,248,.08);border-radius:12px;font-size:.9rem}.lc40-nudge span{flex:1 1 220px}.lc40-nudge .btn{min-height:44px}'
    +'.lc40-x{min-width:44px;min-height:44px;background:none;border:0;color:inherit;cursor:pointer;font-size:1.3rem;line-height:1}'
    +'.lc40-auth .lc39-gate{margin:0;max-width:none}.lc40-auth .btn{min-height:44px}.lc40-guest{justify-self:start}';
    document.head.appendChild(s);
  }
  function init(){
    try{
      css();wrapSheet();wrapToast();
      document.addEventListener("click",onClick,true);
      window.addEventListener("hashchange",()=>{clearTimeout(ht);ht=setTimeout(()=>flush(false),700)});
      window.addEventListener("lc39-signed-in",()=>{
        const had=!!Q(".lc40-auth");try{if(authSheet)authSheet.close()}catch(e){}authSheet=null;
        if(had&&fromChip){fromChip=false;setTimeout(()=>{location.hash="#account"},300)}
      });
    }catch(e){console.error("lc40",e)}
  }
  return{init:init,afterRender:afterRender,hold:hold,complete:complete,busy:busy,flush:flush,_t:{queue:()=>queue.slice(),classify:classify,openAuth:openAuth,paintNudge:paintNudge}};
})();
