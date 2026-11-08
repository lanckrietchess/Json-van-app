/*@@module lc65*/ const LC65=(()=>{
  "use strict";
  /* LC65 (build 9.33.0): the community without the arena.
     The community screens (LC39 posts, LC46 channels, polls, messages, reports) call Quota.call("c39_..."/"c46_..."). In 9.32.0 the deployed arena did not know those
     actions and answered 200 with "unknown_action", which showed as "The community could not load (arena answered 200)".
     This module answers those calls itself, through database functions (sql/20261108120000_lc65_community.sql) called with the member's own token.
     If the functions are not installed (HTTP 404), the old arena path is used again for 30 minutes. Reports are judged by the Edge Function community-check (AI, optional);
     what it cannot decide waits in the owner's menu ("Community reports"). */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const RE=/^c(39|46)_[a-z_]+$/;
  let missing=0,orig=null;
  const nameNow=()=>{try{return String(App.profile.name||"").trim().split(/\s+/)[0].replace(/[<>&"']/g,"").slice(0,24)}catch(e){return""}};
  async function token(){try{return await LC26.sync.token()}catch(e){return""}}
  async function rpc(fn,args){
    const tok=await token();if(!tok)return{status:0,data:null,noauth:true};
    return LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:{Authorization:"Bearer "+tok},body:JSON.stringify(args||{})});
  }
  function fnBase(){try{return String(LC26.sync.cfg().url||"").replace(/\/+$/,"")+"/functions/v1"}catch(e){return""}}
  async function checkReport(rid){
    try{
      const tok=await token(),c=LC26.sync.cfg();if(!tok||!fnBase())return null;
      const r=await fetch(fnBase()+"/community-check",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+tok,apikey:c.key},body:JSON.stringify({rid:rid})});
      if(r.status!==200)return null;const j=await r.json();return j&&j.ok?j:null;
    }catch(e){return null}
  }
  async function call(action,body){
    if(Date.now()<missing)return orig.call(Quota,action,body);
    const a=Object.assign({},body||{});const n=nameNow();if(n)a.name=n;
    const r=await rpc("lc65_"+action,{p_a:a});
    if(r.noauth)return{ok:false,status:200,reason:"auth"};
    if(r.status===404||(r.data&&(r.data.code==="PGRST202"||r.data.code==="42883"))){missing=Date.now()+30*60*1000;return orig.call(Quota,action,body)}
    if(r.status===0)return{ok:false,status:0,reason:"network"};
    const d=r.data;
    if(!d||typeof d!=="object"||Array.isArray(d))return{ok:false,status:r.status,reason:"server"};
    if(action==="c46_report"&&d.ok&&d.status==="pending"&&d.rid){
      const j=await checkReport(d.rid);
      return j&&(j.status==="valid"||j.status==="invalid")?{ok:true,status:j.status,reward:j.reward||null}:{ok:true,status:"queued"};
    }
    if(d.ok===true&&d.status===undefined)d.status=200;
    return d;
  }
  /* the owner's list of reports nobody could decide */
  async function openReports(){
    try{
      const sh=openSheet({title:"Community reports",cls:"lc36-sheet lc65-sheet",noFocus:true,html:'<p class="muted">Loading…</p>'});
      const paint=async()=>{
        const r=await rpc("lc65_admin_reports",{});const d=r.data;
        if(!d||!d.ok){sh.el.innerHTML='<p class="form-msg is-bad">'+esc(r.status===404?"Run the LC65 SQL first.":"Sign in as the owner first.")+'</p>';return}
        if(!d.rows.length){sh.el.innerHTML='<p class="muted">No reports waiting.</p>';return}
        sh.el.innerHTML=d.rows.map(x=>'<div class="lc59-row" data-rid="'+x.id+'"><p><b>'+esc(x.kind==="dm"?"Direct message":"Channel post")+'</b> · reason: '+esc(x.reason)+'</p><blockquote>'+esc(x.body)+'</blockquote><div class="btn-row"><button type="button" class="btn btn-primary" data-lc65-r="1">Rule break: remove</button><button type="button" class="btn btn-ghost" data-lc65-r="0">Fine: dismiss</button></div></div>').join("");
      };
      sh.el.addEventListener("click",async e=>{const b=e.target.closest("[data-lc65-r]");if(!b)return;e.preventDefault();const row=b.closest("[data-rid]");
        const r=await rpc("lc65_admin_resolve",{p_rid:+row.getAttribute("data-rid"),p_valid:b.getAttribute("data-lc65-r")==="1"});
        if(r.data&&r.data.ok){say("Saved.","good");paint()}else say("Could not save that.","bad")});
      await paint();
    }catch(e){say("Could not open that.","bad")}
  }
  function addOwnerRow(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc65-admin]",m))return;
    const ref=Q("[data-lc64-trim]",m)||Q("[data-lc62-admin]",m)||Q("[data-lc59-admin]",m);if(!ref)return;
    const b=document.createElement("button");b.type="button";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc65-admin","");
    b.innerHTML="<span><b>Community reports</b><small>Reports the AI check could not decide</small></span>";
    ref.insertAdjacentElement("afterend",b);
  }
  function init(){
    try{
      if(Quota.__lc65)return;Quota.__lc65=true;orig=Quota.call;
      Quota.call=function(action,body){return RE.test(String(action))?call(String(action),body):orig.apply(this,arguments)};
    }catch(e){console.error("lc65",e)}
    document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("[data-lc65-admin]")){e.preventDefault();openReports()}},true);
    new MutationObserver(()=>{try{addOwnerRow()}catch(e){}}).observe(document.body,{childList:true});
  }
  return{init:init,afterRender(){try{addOwnerRow()}catch(e){}},call:call,openReports:openReports,version:"9.33.0"};
})(); /*@@end lc65*/
