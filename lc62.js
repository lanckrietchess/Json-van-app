/*@@module lc62*/ const LC62=(()=>{
  "use strict";
  /* LC62 (build 9.33.0): the Hero's Journey.
     A member whose VERIFIED rating (read by the server through elo-verify / LC59) has risen 150 or more since the start gets a four-chapter wizard:
       1 The Struggle (start rating and the working points the app saw)  2 The Epiphany  3 The App and the method (the part used most)  4 The Result (verified peak, net gain).
     The chapters are stitched into one story on the device (no AI call, no cost) and the member edits it before sending.
     The owner approves in Admin mode: 5 bonus tokens, the "Lanckriet Chess Elite Student" badge and publication on the landing page (SQL lc62_*).
     The server decides whether the +150 is real (it reads the start / peak itself); the client only asks. */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const authed=(n,a)=>{try{return LC30.authed(n,a||{})}catch(e){return Promise.resolve({ok:false,error:"server"})}};
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0];
  const KEY="lc62",GAP=6*3600*1000,NEED=150;
  const MOD={openings:"the Openings trainer",middlegame:"the Middlegame course",endgame:"the Endgame course",puzzles:"the puzzle trainer",think:"the MSPC Think trainer"};
  let st={at:0,status:"",elite:false,start:null,peak:null},busy=false;
  const saved=()=>Object.assign({at:0,status:"",elite:false,start:null,peak:null,seen:0},rd(KEY,{}));

  async function refresh(force){
    if(busy||!sess())return saved();
    const s=saved();if(!force&&Date.now()-s.at<GAP)return s;
    busy=true;
    try{
      const r=await authed("lc62_journey_mine");
      if(r&&r.ok){const n={at:Date.now(),status:r.status||"",elite:!!r.elite,start:r.start==null?null:+r.start,peak:r.peak==null?null:+r.peak,seen:s.seen};wr(KEY,n);return n}
    }catch(e){}finally{busy=false}
    return s;
  }
  const gain=s=>s.start!=null&&s.peak!=null?s.peak-s.start:0;
  const unlocked=s=>gain(s)>=NEED&&s.status!=="pending"&&s.status!=="approved";

  function firstName(){try{return String(App.profile.name||"").trim().split(/\s+/)[0]||""}catch(e){return""}}
  function topModule(){
    let best="",bx=0;
    try{const x=(V6.state()||{}).xp||{};Object.keys(MOD).forEach(k=>{if((+x[k]||0)>bx){bx=+x[k];best=k}})}catch(e){}
    return best;
  }
  function struggles(){
    let pts=[];try{pts=Framework.ranked().slice(0,3).map(p=>String(p.text||"").replace(/[.\s]+$/,""))}catch(e){}
    return pts.filter(Boolean);
  }
  function chapters(s){
    const m=topModule(),sg=struggles();
    return{
      1:"I started at "+s.start+" ELO."+(sg.length?" What kept costing me games was: "+sg.join("; ")+".":" I kept losing games I felt I should have won."),
      2:"Then I found Lanckriet Chess and started using the app.",
      3:m?"What helped me most was "+MOD[m]+", together with the MSPC method: I stopped guessing and followed the same four steps every move.":"What helped me most was the MSPC method: I stopped guessing and followed the same four steps every move.",
      4:"My verified peak is now "+s.peak+" ELO, a net gain of +"+(s.peak-s.start)+"."
    };
  }
  /* stitch four chapters into one flowing first-person story (templates, no AI) */
  const GLUE=[["","Then something changed. "],["","That changed how I trained. "],["","The result speaks for itself. "]];
  function stitch(ch,variant){
    const v=(variant||0)%2,clean=t=>String(t||"").trim().replace(/\s+/g," ");
    const a=clean(ch[1]),b=clean(ch[2]),c=clean(ch[3]),d=clean(ch[4]);
    if(v===0)return[a,"Then something changed. "+b,"That changed how I trained. "+c,"The result speaks for itself. "+d].filter(Boolean).join("\n\n");
    return["Where I started: "+a,"What turned it around: "+b+" "+c,"Where I am now: "+d].filter(Boolean).join("\n\n");
  }

  function openWizard(s){
    s=s||saved();
    if(!(gain(s)>=NEED)){say("Your Hero's Journey unlocks when your verified rating is "+NEED+" higher than where you started.");return}
    const ch=chapters(s);let step=1,variant=0,story="";
    const TITLES={1:"Chapter 1: The Struggle",2:"Chapter 2: The Epiphany",3:"Chapter 3: The App and the Method",4:"Chapter 4: The Result"};
    const sh=openSheet({title:"Your Hero's Journey",cls:"lc36-sheet lc62-sheet",noFocus:true,html:'<div data-lc62-body></div>'});
    const box=()=>Q("[data-lc62-body]",sh.el||document);
    function paint(){
      const b=box();if(!b)return;
      if(step<=4){
        b.innerHTML='<p class="small muted">Step '+step+' of 5 · we filled this in from your own data. Change anything that is not true.</p><h3>'+TITLES[step]+'</h3>'
          +'<label class="field"><textarea rows="5" maxlength="600" data-lc62-ch>'+esc(ch[step])+'</textarea></label>'
          +(step===1&&!true?"":"")
          +'<div class="btn-row">'+(step>1?'<button type="button" class="btn btn-ghost" data-lc62="back">Back</button>':'')+'<button type="button" class="btn btn-primary" data-lc62="next">'+(step===4?"Write my story":"Next")+'</button></div>';
      }else{
        if(!story)story=stitch(ch,variant);
        b.innerHTML='<p class="small muted">Step 5 of 5 · your chapters as one story. Edit it until it sounds like you.</p><label class="field"><textarea rows="12" maxlength="2500" data-lc62-story>'+esc(story)+'</textarea></label>'
          +'<p class="small muted">After you send it, the coach reads it first. If it is approved you get <b>5 bonus tokens</b>, the <b>Elite Student</b> badge and a place on the website with your first name and ratings.</p>'
          +'<div class="btn-row"><button type="button" class="btn btn-ghost" data-lc62="back">Back</button><button type="button" class="btn btn-ghost" data-lc62="again">Write it another way</button><button type="button" class="btn btn-primary" data-lc62="send">Send for approval</button></div><p class="form-msg" data-lc62-out aria-live="polite"></p>';
      }
    }
    const keep=()=>{const t=Q("[data-lc62-ch]",box());if(t&&step<=4)ch[step]=t.value;const u=Q("[data-lc62-story]",box());if(u)story=u.value};
    box().addEventListener("click",async e=>{
      const el=e.target.closest("[data-lc62]");if(!el)return;e.preventDefault();
      const a=el.getAttribute("data-lc62");keep();
      if(a==="next"){step++;if(step===5)story="";paint()}
      else if(a==="back"){step=Math.max(1,step-1);paint()}
      else if(a==="again"){variant++;story=stitch(ch,variant);paint()}
      else if(a==="send"){
        const out=Q("[data-lc62-out]",box());el.disabled=true;
        const r=await authed("lc62_journey_submit",{p_first:firstName(),p_ch:{"1":ch[1],"2":ch[2],"3":ch[3],"4":ch[4]},p_story:story,p_module:topModule()});
        el.disabled=false;
        if(r&&r.ok){wr(KEY,Object.assign(saved(),{status:"pending",at:Date.now()}));if(out)out.textContent="Sent. The coach will read it. Thank you.";say("Your journey is with the coach.","good");try{paintCard()}catch(e2){}}
        else if(out)out.textContent=r&&r.error==="story"?"Write a little more (at least a few sentences).":r&&r.error==="not_yet"?"The server does not see a verified gain of "+NEED+" yet.":r&&r.error==="no_verified_rating"?"Link your Chess.com or Lichess account first so we can verify the numbers.":"Could not send that now. Try again later.";
      }
    });
    paint();
  }

  /* the unlock card on the dashboard */
  function paintCard(){
    const r=route();if(r!=="quests"&&r!=="home"&&r!=="account")return;
    const view=Q("#view")||Q("main");if(!view)return;
    const s=saved();let c=Q("[data-lc62-card]",view);
    const show=unlocked(s)||s.status==="pending";
    if(!show){if(c)c.remove();return}
    const html=s.status==="pending"?'<b>Your Hero\'s Journey is with the coach.</b><span>You will get 5 bonus tokens and the Elite Student badge when it is approved.</span>'
      :'<b>You climbed +'+gain(s)+' ELO. Your Hero\'s Journey is unlocked.</b><span>Four short chapters, pre-filled from your own games. 5 bonus tokens and the Elite Student badge when approved.</span><button type="button" class="btn btn-primary" data-lc62="open">Tell my story</button>';
    if(!c){c=document.createElement("section");c.className="panel pad lc62-card";c.setAttribute("data-lc62-card","");view.insertBefore(c,view.firstChild)}
    if(c.innerHTML!==html)c.innerHTML=html;
  }
  function paintBadge(){
    const s=saved();if(!s.elite)return;
    QA(".lc30-pmhead").forEach(h=>{if(!Q(".lc62-elite",h)){const b=document.createElement("span");b.className="lc62-elite";b.textContent="Lanckriet Chess Elite Student";h.appendChild(b)}});
  }

  /* owner: approve / reject */
  async function openAdmin(){
    try{const sh=openSheet({title:"Hero's Journeys",cls:"lc36-sheet lc62-sheet lc62-admin",noFocus:true,html:'<p class="muted">Loading…</p>'});await adminPaint(sh.el)}catch(e){say("Could not open that.","bad")}
  }
  async function adminPaint(el){
    const r=await authed("lc62_admin_queue");
    if(!r||!r.ok){el.innerHTML='<p class="form-msg is-bad">'+esc(r&&r.error==="forbidden"?"Sign in as the owner first.":"Not ready: run the LC61/LC62 SQL.")+'</p>';return}
    const rows=r.rows||[];
    if(!rows.length){el.innerHTML='<p class="muted">No journeys waiting.</p>';return}
    el.innerHTML='<p class="small muted">The ratings were read by the server. Check the member\'s public profile if you want to be sure. Approving gives 5 tokens, the Elite badge and publishes on the landing page.</p>'+rows.map(x=>
      '<div class="lc59-row" data-user="'+esc(x.user_id)+'"><p><b>'+esc(x.first_name||"?")+'</b> · '+(+x.start_elo)+' → '+(+x.peak_elo)+' (+'+((+x.peak_elo)-(+x.start_elo))+') · most used: '+esc(x.module||"?")+'</p><blockquote style="white-space:pre-wrap">'+esc(x.story)+'</blockquote>'
      +'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc62-a="approved">✓ Approve (+5 tokens, badge, publish)</button><button type="button" class="btn btn-ghost" data-lc62-a="rejected">Reject</button></div></div>').join("");
  }
  async function onAdminClick(e){
    const b=e.target.closest&&e.target.closest("[data-lc62-a]");if(!b)return;e.preventDefault();
    const row=b.closest("[data-user]"),host=b.closest(".lc62-admin");
    const r=await authed("lc62_admin_set",{p_user:row.getAttribute("data-user"),p_status:b.getAttribute("data-lc62-a")});
    if(r&&r.ok){say(r.token_status==="failed"?"Approved, but the 5 tokens could not be credited: check lc36_token_credits.":"Saved. The landing page updates by itself.",r.token_status==="failed"?"bad":"good");adminPaint(host)}else say("Could not save that.","bad");
  }
  function addOwnerRow(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc62-admin]",m))return;
    const ref=Q("[data-lc61-admin]",m)||Q("[data-lc59-admin]",m);if(!ref)return;
    const b=document.createElement("button");b.type="button";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc62-admin","");
    b.innerHTML="<span><b>Hero's Journeys</b><small>Approve stories: 5 tokens, Elite badge, landing page</small></span>";
    ref.insertAdjacentElement("afterend",b);
  }
  function css(){
    if(Q("#lc62-css"))return;
    const s=document.createElement("style");s.id="lc62-css";
    s.textContent=".lc62-card{display:grid;gap:8px;border:1px solid #fbbf24;background:#1e293b;margin-bottom:14px}.lc62-card span{color:#94a3b8}.lc62-elite{display:inline-block;margin-top:6px;padding:4px 10px;border-radius:999px;background:#0f172a;border:1px solid #38bdf8;color:#38bdf8;font-size:12px;font-weight:700}";
    document.head.appendChild(s);
  }
  let timer=0;
  function afterRender(){clearTimeout(timer);timer=setTimeout(async()=>{try{await refresh(false)}catch(e){}try{paintCard();paintBadge();addOwnerRow()}catch(e){}},500)}
  function init(){
    css();
    document.addEventListener("click",e=>{
      const o=e.target.closest&&e.target.closest("[data-lc62=\"open\"]");if(o){e.preventDefault();openWizard();return}
      if(e.target.closest&&e.target.closest("[data-lc62-admin]")){e.preventDefault();openAdmin()}
    },true);
    document.addEventListener("click",onAdminClick,true);
    new MutationObserver(()=>{try{addOwnerRow();paintBadge()}catch(e){}}).observe(document.body,{childList:true,subtree:false});
  }
  return{init:init,afterRender:afterRender,refresh:refresh,openWizard:openWizard,stitch:stitch,chapters:chapters,unlocked:unlocked,gain:gain,NEED:NEED,version:"9.33.0"};
})(); /*@@end lc62*/
