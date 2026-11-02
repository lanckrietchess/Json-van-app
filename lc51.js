const LC51=(()=>{
  "use strict";
  /* LC51 (build 9.24.1): guest data and account data stay apart, and a guest becomes a member exactly once.
     - A guest has NO server profile: progress lives only in this browser's localStorage (a copy of what sync owns is kept in lc51-guest, never sent anywhere).
     - lc51-own says whose progress this device holds: {k:"guest"} or {k:"account",email}.
     - The FIRST time an account is signed in on a device that holds guest progress, the guest progress is migrated once: the account profile is read,
       merged with the monotonic rules (XP and trims never go down, a finished quest wins, the higher level wins, unlocks are added), pushed and CONFIRMED,
       then lc51-own becomes the account and the guest copy is deleted. From then on only the normal two-way sync runs.
     - Nothing is pushed for a signed-in session until that first link is done (so a half-known device can never overwrite an account).
     - If the device holds progress of ANOTHER account, the member is asked before it is added to the new one; "Cancel" signs out. */
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const OWN="lc51-own",GUEST="lc51-guest",MIG="lc51-mig";
  const SY=()=>{try{return LC26.sync}catch(e){return null}};
  const sess=()=>{try{return SY().session()}catch(e){return null}};
  const own=()=>{const o=rd(OWN,null);return o&&(o.k==="account"||o.k==="guest")?o:{k:"guest"}};
  const E=s=>{try{return esc(s)}catch(e){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}};
  let migrating=false;

  /* the guest copy: only in localStorage, only while nobody is signed in */
  function cacheGuest(){
    try{
      if(sess()||own().k!=="guest")return;
      wr(GUEST,{v:1,at:Date.now(),snap:SY().snapshot()});
    }catch(e){}
  }
  let ct=0;const soon=()=>{clearTimeout(ct);ct=setTimeout(cacheGuest,4000)};

  function confirmSwitch(oldEmail,newEmail){
    return new Promise(res=>{
      let done=false;const end=v=>{if(done)return;done=true;res(v)};
      try{
        openSheet({title:"Progress from another account",cls:"lc51-sheet",noFocus:true,locked:true,
          html:'<p>This device holds progress that belongs to <b>'+E(oldEmail)+'</b>.</p><p class="small muted">If you continue, it is added to the profile of <b>'+E(newEmail)+'</b>. If that is not what you want, cancel: you are signed out and the progress stays with '+E(oldEmail)+'.</p>'
            +'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc51-go>Add it to '+E(newEmail)+'</button><button type="button" class="btn btn-ghost" data-lc51-no data-close>Cancel and sign out</button></div>',
          onMount(s){s.el.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-lc51-go],[data-lc51-no]");if(!t)return;if(t.hasAttribute("data-lc51-go")){end(true);s.close()}else end(false)})},
          onClose(){end(false)}});
      }catch(e){end(true)}
    });
  }

  async function finish(email,from){
    let ok=false;
    migrating=true;try{ok=await SY().push()}catch(e){ok=false}finally{migrating=false}
    if(!ok)return false;                                          /* not confirmed: the guest copy stays, the next sign-in tries again */
    wr(OWN,{k:"account",email:email,at:Date.now(),from:from});
    const m=rd(MIG,{})||{};m[email]={at:Date.now(),from:from};wr(MIG,m);
    try{Store.del(GUEST)}catch(e){}
    if(from==="guest"){try{toast("Your progress is saved to your account.","good")}catch(e){}}
    return true;
  }

  function wrapFetch(){
    const sy=SY();if(!sy||typeof sy.FETCH_USER_PROFILE!=="function"||sy.FETCH_USER_PROFILE.__lc51)return;
    const o=sy.FETCH_USER_PROFILE;
    const f=async function(){
      const s=sy.session();if(!s)return o.apply(this,arguments);
      const w=own();
      if(w.k==="account"&&w.email===s.email)return o.apply(this,arguments);      /* the normal case: the same account again */
      if(w.k==="account"&&w.email!==s.email){
        const go=await confirmSwitch(w.email,s.email);
        if(!go){sy.signOut();try{toast("Signed out. This device keeps the progress of "+w.email+".")}catch(e){}return{ok:false,error:"cancelled"}}
      }
      const r=await o.apply(this,arguments);
      if(r&&r.ok)await finish(s.email,w.k==="guest"?"guest":"account");
      return r;
    };
    f.__lc51=true;sy.FETCH_USER_PROFILE=f;
  }
  /* nothing is pushed for a signed-in session until its first link is done */
  function wrapPush(){
    const sy=SY();if(!sy||typeof sy.push!=="function"||sy.push.__lc51)return;
    const o=sy.push;
    const f=function(){
      const s=sy.session();
      if(s&&!migrating){const w=own();if(!(w.k==="account"&&w.email===s.email))return Promise.resolve(false)}
      return o.apply(this,arguments);
    };
    f.__lc51=true;sy.push=f;
  }
  function init(){
    try{
      const s=sess(),o=rd(OWN,null);
      if(!o){wr(OWN,s?{k:"account",email:s.email,at:Date.now(),from:"existing"}:{k:"guest",at:Date.now()})}   /* a device that already had a signed-in member keeps him */
      wrapFetch();wrapPush();
      document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")cacheGuest()});
    }catch(e){console.error("lc51",e)}
  }
  return{init:init,afterRender:soon,own:own,cacheGuest:cacheGuest,_t:{confirmSwitch:confirmSwitch,finish:finish}};
})();
