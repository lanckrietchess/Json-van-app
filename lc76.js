/*@@module lc76*/
const LC76=(()=>{
  "use strict";
  /* LC76 (build 9.38.1): Gift a Friend, on the receiving side. When the signed-in e-mail has an active gift licence (made by the stripe webhook),
     Pro is claimed at once and a "Congrats! You are on Pro" pop-up says who gave it (the first name the giver typed, never their e-mail) with
     their note and a thank-you box; the giver sees the thank-you the next time they open the app. SQL: sql/20261113140000_lc76_gifts.sql. */
  const Q=(s,r)=>(r||document).querySelector(s);
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const say=(t,k)=>{try{toast(t,k||"")}catch(e){}};
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const face=(e,s)=>{try{return LC67.face(e,s)}catch(x){return'<span aria-hidden="true">♞</span>'}};
  const myName=()=>{try{const p=App.profile||{};return String(p.name||p.first||"").split(" ")[0]||""}catch(e){return""}};
  async function tok(){try{return await LC26.sync.token()}catch(e){return""}}
  async function rpc(fn,args){const t=await tok();if(!t)return{status:0,data:null};try{return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:{Authorization:"Bearer "+t},body:JSON.stringify(args||{})})}catch(e){return{status:0,data:null}}}
  let last=0,busy=false;
  const conf=()=>'<div class="lc74-conf" aria-hidden="true">'+Array.from({length:18},(x,i)=>'<i style="left:'+(5+i*5.2)+"%;animation-delay:"+(i%6)*.12+"s;background:"+["#fbbf24","#38bdf8","#4ade80","#f472b6"][i%4]+'"></i>').join("")+"</div>";
  async function claim(){   /* switch Pro on right away (the same claim the app does at sign-in) */
    try{if(typeof LC30!=="undefined"&&typeof deviceId==="function"){const r=await LC30.authed("lc36_claim_my_licence",{p_device:deviceId()});if(r&&r.ok&&r.key&&typeof License!=="undefined")License.apply(r,r.key,"email")}}catch(e){}
    try{Quota.refresh()}catch(e){}
  }
  async function check(force){
    if(busy||!sess()||(!force&&Date.now()-last<600000))return;busy=true;last=Date.now();
    try{
      const r=await rpc("lc76_gift_check",{});const d=r.data||{};if(!d.ok)return;
      const g=d.gift;
      if(g&&!g.seen){await claim();giftPop(g)}
      else if((d.thanks||[]).length)thanksPop(d.thanks);
    }finally{busy=false}
  }
  function giftPop(g){
    const who=g.from_name?esc(g.from_name):"A friend",until=g.until?new Date(g.until).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}):"";
    try{openSheet({title:"Congrats! You are on Pro",noFocus:true,cls:"lc76-sheet lc36-consent",html:conf()
      +'<div class="lc74-pop"><span class="lc69-face">'+face(["happy","proud","smile"],64)+'</span><div><p class="lc74-k">A gift for you</p><h3>'+who+" gifted you Pro!</h3>"+(g.note?'<p class="lc76-note">“'+esc(g.note)+"”</p>":"")+'<p class="small muted">The whole library, the 24/7 coach and 10 tokens a day'+(until?", until "+esc(until):"")+".</p></div></div>"
      +(g.can_thank?'<div class="lc74-share"><label class="field"><span class="field-label">Send '+who+' a thank-you</span><textarea class="input" rows="2" maxlength="600" data-lc76-msg placeholder="Thank you! Let’s train together."></textarea></label><div class="btn-row"><button type="button" class="btn btn-gold" data-lc76-thanks>Send my thanks</button><a class="btn btn-primary" href="#quests" data-close>Start training</a></div></div>'
        :'<div class="btn-row"><a class="btn btn-primary" href="#quests" data-close>Start training</a></div>'),
      onMount:s=>{
        rpc("lc76_gift_seen_set",{p_key:g.gkey});
        s.el.addEventListener("click",async e=>{if(!e.target.closest("[data-lc76-thanks]"))return;const b=e.target.closest("[data-lc76-thanks]"),m=String((Q("[data-lc76-msg]",s.el)||{}).value||"").trim();
          if(!m){say("Write a few words first.","bad");return}b.disabled=true;const r=await rpc("lc76_gift_thanks",{p_key:g.gkey,p_body:m,p_name:myName()});
          if(r.data&&r.data.ok){s.close();say("Thanks sent: "+(g.from_name||"your friend")+" sees it in the app.","good")}else{b.disabled=false;say("Could not send it. Try again later.","bad")}});
      }})}catch(e){}
  }
  function thanksPop(list){
    const t=list[list.length-1];
    try{openSheet({title:"Your gift made someone happy",noFocus:true,cls:"lc76-sheet lc36-consent",html:conf()+'<div class="lc74-pop"><span class="lc69-face">'+face(["happy","smile"],56)+'</span><div><h3>'+esc(t.name)+" says thank you</h3><p class=\"lc76-note\">“"+esc(t.body)+"”</p>"+(list.length>1?'<p class="small muted">and '+(list.length-1)+" more thank-you"+(list.length>2?"s":"")+".</p>":"")+'</div></div><div class="btn-row"><a class="btn btn-gold" href="/#gift" target="_blank" rel="noopener" data-close>Gift another friend</a><button type="button" class="btn btn-ghost" data-close>Close</button></div>',
      onMount:()=>{rpc("lc76_thanks_seen",{p_ids:list.map(x=>x.id)})}})}catch(e){}
  }
  function css(){if(Q("#lc76-css"))return;const s=document.createElement("style");s.id="lc76-css";s.textContent=".lc76-note{font-size:17px;font-style:italic;color:#fde68a;margin:6px 0}";document.head.appendChild(s)}
  function afterRender(){setTimeout(()=>{try{check(false)}catch(e){}},1200)}
  function init(){
    css();setTimeout(()=>check(true),5000);
    window.addEventListener("storage",e=>{if(e.key==="lc26-auth")setTimeout(()=>check(true),1500)});   /* signed in in another tab or by the magic link */
    try{const o=LC26.sync.verify;if(typeof o==="function"&&!o.__lc76){const f=async function(){const r=await o.apply(this,arguments);setTimeout(()=>check(true),1500);return r};f.__lc76=1;LC26.sync.verify=f}}catch(e){}
  }
  return{init:init,afterRender:afterRender,check:check,_t:{giftPop:giftPop,thanksPop:thanksPop},version:"9.38.1"};
})(); /*@@end lc76*/
