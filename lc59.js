const LC59=(()=>{
  "use strict";
  /* LC59 (build 9.32.0): the ELO milestone token loop.
     1. The Edge Function `elo-verify` reads the member's PUBLIC Rapid rating on the server (the browser cannot fake it) at most every 12 hours.
        The first read is the start rating, the highest read is the peak.
     2. Every full hundred ABOVE the start hundred that the peak has reached is a milestone. A pop-up congratulates and offers:
          1 token  for reaching it,
          2 tokens if the member lets the result appear on the website (first name and ratings only),
          3 tokens if the member also writes a real message about what changed for them.
        A made-up message ("asdf asdf...") gets the playful "Nice try!" answer, the 2 tokens for the proof, and a way to unlock the 3rd later.
        The server (lc59_milestone_claim) decides everything: levels, tokens, message quality, once per level. This file only asks and shows.
     3. Catch-Up Bonus: a member who joins at 1437 gets one token for every hundred below (900 to 1400), once, so a high start is never punished.
     4. Account card ("Your ELO milestones") and, in Admin mode, a sheet where the owner approves results and messages before they reach the landing page.
     Nothing here runs without a linked Chess.com / Lichess account, a signed-in member and the deployed function: then it is simply silent. */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const KEY="lc59",rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const st=()=>Object.assign({at:0,dismiss:{}},rd(KEY,{})),put=o=>wr(KEY,Object.assign(st(),o));
  const authed=(n,a)=>{try{return LC30.authed(n,a||{})}catch(e){return Promise.resolve({ok:false,error:"server"})}};
  const token=()=>{try{const s=LC26.sync.session();return s&&s.access_token||""}catch(e){return ""}};
  const fnBase=()=>{try{return String(LC26.sync.cfg().url||"").replace(/\/+$/,"")+"/functions/v1"}catch(e){return ""}};
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0];
  const GAP=12*3600*1000,DISMISS=24*3600*1000;
  const NICE="Nice try! I actually check the messages manually. Write one real sentence about what changed for you and you can still unlock your 3rd token.";
  let running=false,busy=false,last=null,t=0,on=false;

  function acct(){
    try{const c=Elo.acct("chesscom");if(c&&c.user)return{site:"chesscom",user:String(c.user)}}catch(e){}
    try{const l=Elo.acct("lichess");if(l&&l.user)return{site:"lichess",user:String(l.user)}}catch(e){}
    try{const p=App.profile||{};if(p.chess_com_username)return{site:"chesscom",user:String(p.chess_com_username)};if(p.lichess_username)return{site:"lichess",user:String(p.lichess_username)}}catch(e){}
    return null;
  }
  const claimWallet=()=>{try{LC36.tokens.claim(true)}catch(e){}};
  const siteName=s=>s==="lichess"?"Lichess":"Chess.com";

  /* ---------- 1. verify (server reads the public rating) ---------- */
  async function verify(force){
    if(running||!token())return null;
    const a=acct();if(!a)return null;
    try{if(typeof LC42!=="undefined"&&LC42.owns&&LC42.owns())return null}catch(e){}
    const s=st();if(!force&&Date.now()-s.at<GAP)return null;
    running=true;
    try{
      const k=LC26.sync.cfg();
      const r=await fetch(fnBase()+"/elo-verify",{method:"POST",headers:{"Content-Type":"application/json",apikey:k.key||"",Authorization:"Bearer "+token()},body:JSON.stringify({site:a.site,username:a.user})});
      const j=await r.json().catch(()=>null);
      if(j&&j.ok){
        put({at:Date.now()});
        if(j.first&&+j.catchup>0)catchUp(j);
        return j;
      }
      if(j&&j.reason==="account_taken"&&Date.now()-(s.takenAt||0)>DISMISS){put({takenAt:Date.now(),at:Date.now()});say("That "+siteName(a.site)+" account is already linked to another member, so no milestone tokens can be earned with it.","bad")}
      else if(j&&(j.reason==="not_found"||j.reason==="no_rapid"||j.reason==="already_linked"))put({at:Date.now()-GAP+3600*1000});   /* try again in an hour, not every visit */
    }catch(e){/* function not deployed or offline: stay silent */}
    finally{running=false}
    return null;
  }
  async function status(){
    if(!token())return null;
    const r=await authed("lc59_status");
    if(r&&r.ok){last=r;put({s:{linked:!!r.linked,due:r.due||[],peak:r.peak,start:r.start,gain:r.peak_gain,at:Date.now()}});return r}
    return null;
  }
  async function run(force){
    const j=await verify(force);
    const s=await status();
    if(s&&s.linked&&(s.due||[]).length)maybePop(s);
    paintCard();
    return{verified:j,status:s};
  }

  /* ---------- 2. the Catch-Up Bonus ---------- */
  function catchUp(j){
    claimWallet();
    try{
      openSheet({title:"Welcome in at "+j.start+" ELO",cls:"lc36-sheet lc36-consent lc59-sheet lc59-catchup",noFocus:true,
        html:'<div class="lc59-pop"><div class="lc59-lvl">+'+(+j.catchup)+'</div><p>Players who join higher should not start behind. For every hundred below your rating you get a <b>catch-up token</b>, so you start with <b>'+(+j.catchup)+' tokens</b> in your wallet. From here, every new hundred ELO on '+esc(siteName(j.site))+' earns you more.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-close>Great</button></div></div>'});
    }catch(e){say("You start with "+(+j.catchup)+" catch-up tokens.","good")}
  }

  /* ---------- 3. the milestone pop-up ---------- */
  function popHTML(level,s){
    const gain=s&&s.peak_gain>0?'<p class="lc59-gain">That is <b>+'+(+s.peak_gain)+'</b> since you joined.</p>':"";
    return '<div class="lc59-pop" data-lc59="body" data-level="'+level+'"><div class="lc59-lvl">'+level+'</div><h3>You reached '+level+' ELO</h3>'+gain
      +'<ul class="lc59-ladder"><li><b>1 token</b> for reaching it</li><li><b>2 tokens</b> if you let me show your result on the website (first name and ratings only)</li><li><b>3 tokens</b> if you also tell me what changed for you, in a real sentence</li></ul>'
      +'<label class="lc59-box"><input type="checkbox" data-lc59="allow"><span>Yes, show my result on the website</span></label>'
      +'<div class="lc59-more" data-lc59="more" hidden><label class="field"><span class="field-label">Your first name</span><input type="text" class="input" data-lc59="first" maxlength="24" autocomplete="given-name"></label>'
      +'<label class="field"><span class="field-label">What changed for you?</span><textarea class="input" data-lc59="msg" rows="3" maxlength="600" placeholder="One or two real sentences, in your own words"></textarea></label>'
      +'<p class="small muted">I read every message myself before anything appears on the website. You can take your result off the website at any time.</p></div>'
      +'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc59="claim">Claim my tokens</button><button type="button" class="btn btn-ghost" data-close data-lc59="later">Later</button></div><p class="form-msg" data-lc59="msg-out" aria-live="polite"></p></div>';
  }
  function maybePop(s){
    try{
      if(typeof openSheet!=="function"||Q(".lc59-sheet"))return;
      const lv=(s.due||[]).slice().sort((a,b)=>b-a)[0];if(!lv)return;
      const d=st().dismiss||{};if(Date.now()-(+d[lv]||0)<DISMISS)return;
      openSheet({title:"Milestone",cls:"lc36-sheet lc36-consent lc59-sheet",noFocus:true,html:popHTML(lv,s),onClose(){const dd=Object.assign({},st().dismiss);dd[lv]=Date.now();put({dismiss:dd})}});
    }catch(e){}
  }
  function openFor(level){try{openSheet({title:"Milestone",cls:"lc36-sheet lc59-sheet",noFocus:true,html:popHTML(level,last)})}catch(e){}}

  const msgEl=host=>Q('[data-lc59="msg-out"]',host);
  const setMsg=(host,t,bad)=>{const m=msgEl(host);if(m){m.className="form-msg"+(bad?" is-bad":"");m.textContent=t||""}};
  const ERR={not_reached:"That milestone is not reached yet.",already_claimed:"You already claimed that milestone.",first_name:"Add your first name (letters only) to show your result on the website.",not_linked:"Link your Chess.com or Lichess account first.",
    credits_missing:"The token system is not ready yet. Try again later.",missing_function:"The milestone system is not ready yet. Try again later.",sign_in:"Sign in first.",network:"No connection. Try again.",forbidden:"Sign in again, then try again."};
  async function claim(host,allowOverride){
    const lv=+(Q('[data-lc59="body"]',host)||{getAttribute(){return 0}}).getAttribute("data-level");
    const allow=allowOverride!==undefined?allowOverride:!!(Q('[data-lc59="allow"]',host)||{}).checked;
    const first=(Q('[data-lc59="first"]',host)||{}).value||"",msg=(Q('[data-lc59="msg"]',host)||{}).value||"";
    if(busy)return;busy=true;setMsg(host,"Saving…");
    const r=await authed("lc59_milestone_claim",{p_level:lv,p_allow:allow,p_first:first,p_message:msg});
    busy=false;
    if(!r||!r.ok){setMsg(host,ERR[r&&r.error]||"Could not save that. Try again later.",true);return}
    claimWallet();await status();
    const extra=+r.extra_tokens>0?" (+"+(+r.extra_tokens)+" for the lower milestones you had not claimed)":"";
    const body=Q('[data-lc59="body"]',host);
    if(r.nice_try&&body){
      body.innerHTML='<div class="lc59-lvl">+'+r.tokens+'</div><h3>'+r.tokens+' tokens are yours'+esc(extra)+'</h3><p class="lc59-nice">'+esc(NICE)+'</p><label class="field"><span class="field-label">What changed for you?</span><textarea class="input" data-lc59="msg2" rows="3" maxlength="600" placeholder="One or two real sentences"></textarea></label><div class="btn-row"><button type="button" class="btn btn-primary" data-lc59="upgrade" data-level="'+lv+'">Unlock my 3rd token</button><button type="button" class="btn btn-ghost" data-close>Not now</button></div><p class="form-msg" data-lc59="msg-out" aria-live="polite"></p>';
      return;
    }
    if(body)body.innerHTML='<div class="lc59-lvl">+'+r.tokens+'</div><h3>'+r.tokens+(r.tokens===1?" token":" tokens")+' added'+esc(extra)+'</h3><p>'+(r.message_ok?"Thank you. I will read your message and your result goes on the website once I have checked it.":r.allow?"Thank you. Your result goes on the website once I have checked it.":"Keep climbing: the next hundred earns you more.")+'</p><div class="btn-row"><button type="button" class="btn btn-primary" data-close>Great</button></div>';
    else say("+"+r.tokens+" tokens added.","good");
    paintCard();
  }
  async function upgrade(host,level){
    const msg=(Q('[data-lc59="msg2"]',host)||{}).value||"";
    if(busy)return;busy=true;setMsg(host,"Checking…");
    const r=await authed("lc59_message_upgrade",{p_level:level,p_message:msg});busy=false;
    if(r&&r.ok){claimWallet();await status();const body=Q('[data-lc59="body"]',host);if(body)body.innerHTML='<div class="lc59-lvl">+1</div><h3>Token number 3 is yours</h3><p>Thank you. I will read your message before it appears anywhere.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-close>Great</button></div>';paintCard();return}
    if(r&&r.error==="not_valuable"){setMsg(host,NICE,true);return}
    setMsg(host,r&&r.error==="already_upgraded"?"You already unlocked that token.":(ERR[r&&r.error]||"Could not save that. Try again later."),true);
  }

  /* ---------- 4. the Account card ---------- */
  function cardHTML(s){
    if(!s)return "";
    if(!s.linked)return '<h3>Your ELO milestones</h3><p class="small muted">Connect your Chess.com or Lichess account to earn tokens at every hundred ELO you reach. If you join above 900, you also get catch-up tokens for the hundreds below you.</p>';
    const next=((Math.floor((+s.peak||0)/100)+1)*100);
    let h='<h3>Your ELO milestones</h3><p class="small muted">'+esc(siteName(s.site))+' · <b>'+esc(s.uname)+'</b> · start '+(+s.start)+' · peak '+(+s.peak)+' (<b>+'+(+s.peak_gain)+'</b>). Next milestone: <b>'+next+'</b>.'+(+s.catchup>0?' Catch-up bonus: '+(+s.catchup)+' tokens.':'')+'</p>';
    if((s.due||[]).length)h+='<div class="btn-row">'+s.due.map(l=>'<button type="button" class="btn btn-primary" data-lc59="open" data-level="'+l+'">Claim '+l+'</button>').join("")+'</div>';
    if((s.upgradable||[]).length)h+='<div class="btn-row">'+s.upgradable.map(l=>'<button type="button" class="btn btn-ghost" data-lc59="review" data-level="'+l+'">Add a review for the 3rd token ('+l+')</button>').join("")+'</div>';
    if(s.proof&&s.proof.allow_web)h+='<p class="small muted">Your result may appear on the website'+(s.proof.result_approved?" (approved)":" once I have checked it")+'. <button type="button" class="btn btn-quiet" data-lc59="hide">Take me off the website</button></p>';
    return h;
  }
  function paintCard(){
    try{
      if(route()!=="account"||!last)return;
      const view=Q("#view");if(!view)return;
      let c=Q(".lc59-card",view);
      if(!c){c=document.createElement("section");c.className="panel pad lc59-card";const m=Q(".lc39-mailcard",view);if(m&&m.parentNode)m.parentNode.insertBefore(c,m.nextSibling);else view.insertBefore(c,view.children[1]||null)}
      const h=cardHTML(last);if(c.getAttribute("data-h")!==h){c.innerHTML=h;c.setAttribute("data-h",h)}
    }catch(e){}
  }
  function reviewSheet(level){
    try{openSheet({title:"Add a review",cls:"lc36-sheet lc59-sheet",noFocus:true,html:'<div class="lc59-pop" data-lc59="body" data-level="'+level+'"><p>Tell me in one or two real sentences what changed for you since you started. A real message unlocks your 3rd token for the '+level+' milestone.</p><label class="field"><span class="field-label">What changed for you?</span><textarea class="input" data-lc59="msg2" rows="3" maxlength="600"></textarea></label><div class="btn-row"><button type="button" class="btn btn-primary" data-lc59="upgrade" data-level="'+level+'">Unlock my 3rd token</button><button type="button" class="btn btn-ghost" data-close>Not now</button></div><p class="form-msg" data-lc59="msg-out" aria-live="polite"></p></div>'})}catch(e){}
  }

  /* ---------- 5. the owner: approve results and messages ---------- */
  async function openAdmin(){
    try{
      const sh=openSheet({title:"Student proofs and messages",cls:"lc36-sheet lc59-sheet lc59-admin",noFocus:true,html:'<p class="muted">Loading…</p>'});
      await adminPaint(sh.el);
    }catch(e){say("Could not open that.","bad")}
  }
  const prof=(site,u)=>site==="lichess"?"https://lichess.org/@/"+encodeURIComponent(u):"https://www.chess.com/member/"+encodeURIComponent(u);
  async function adminPaint(el){
    const r=await authed("lc59_admin_queue");
    if(!r||!r.ok){el.innerHTML='<p class="form-msg is-bad">'+esc(r&&r.error==="forbidden"?"Sign in as the owner first.":"The proof system is not ready (run the LC59 SQL).")+'</p>';return}
    const rows=r.rows||[];
    if(!rows.length){el.innerHTML='<p class="muted">Nothing waiting. Results and messages from members who allowed the website appear here.</p>';return}
    el.innerHTML='<p class="small muted">Check the rating on the member\'s own profile first. Approved items appear on the landing page in this order: message + result, result only, message only.</p>'+rows.map(x=>
      '<div class="lc59-row" data-user="'+esc(x.user_id)+'"><p><b>'+esc(x.first_name||"?")+'</b>'+(x.uname?' · <a href="'+esc(prof(x.site,x.uname))+'" target="_blank" rel="noopener">'+esc(siteName(x.site))+': '+esc(x.uname)+'</a> · '+(+x.start)+' → peak '+(+x.peak)+' (+'+(+x.gain)+')':' · no linked account')+'</p>'
      +(x.message?'<blockquote>“'+esc(x.message)+'”</blockquote>':'<p class="small muted">No message.</p>')
      +'<p class="small muted">Result: '+(x.result_approved?'<b>approved</b>':'not approved')+' · Message: <b>'+esc(x.msg_status)+'</b></p>'
      +'<div class="btn-row"><button type="button" class="btn btn-'+(x.result_approved?"ghost":"primary")+'" data-lc59="a-result" data-on="'+(x.result_approved?"0":"1")+'">'+(x.result_approved?"Remove star":"★ Approve result")+'</button>'
      +(x.message?'<button type="button" class="btn btn-'+(x.msg_status==="approved"?"ghost":"primary")+'" data-lc59="a-msg" data-st="'+(x.msg_status==="approved"?"pending":"approved")+'">'+(x.msg_status==="approved"?"Unapprove message":"✓ Approve message")+'</button><button type="button" class="btn btn-ghost" data-lc59="a-msg" data-st="rejected">Reject message</button>':'')+'</div></div>').join("");
  }
  async function adminSet(row,result,msg){
    const el=row.closest(".lc59-admin")||document;
    const r=await authed("lc59_admin_set",{p_user:row.getAttribute("data-user"),p_result:result,p_msg:msg,p_note:null});
    if(!(r&&r.ok)){say("Could not save that.","bad");return}
    say("Saved. The landing page updates by itself.","good");await adminPaint(el.classList&&el.classList.contains("lc59-admin")?el:Q(".lc59-admin")||el);
  }

  /* ---------- clicks, wiring ---------- */
  async function onClick(e){
    const el=e.target.closest&&e.target.closest("[data-lc59]");if(!el)return;
    const a=el.getAttribute("data-lc59");if(a==="allow"||a==="first"||a==="msg"||a==="msg2"||a==="more"||a==="body"||a==="msg-out")return;
    e.preventDefault();
    const host=el.closest(".lc59-sheet")||document;
    if(a==="claim")return claim(host);
    if(a==="upgrade")return upgrade(host,+el.getAttribute("data-level")||0);
    if(a==="open"){return openFor(+el.getAttribute("data-level")||0)}
    if(a==="review"){return reviewSheet(+el.getAttribute("data-level")||0)}
    if(a==="hide"){const r=await authed("lc59_proof_set",{p_allow_web:false});if(r&&r.ok){say("Your result is off the website.","good");await status();const c=Q(".lc59-card");if(c)c.removeAttribute("data-h");paintCard()}return}
    if(a==="a-result"){const row=el.closest(".lc59-row");return adminSet(row,el.getAttribute("data-on")==="1",null)}
    if(a==="a-msg"){const row=el.closest(".lc59-row");return adminSet(row,null,el.getAttribute("data-st"))}
  }
  function onChange(e){
    const t2=e.target;if(!t2||!t2.matches||!t2.matches('[data-lc59="allow"]'))return;
    const host=t2.closest(".lc59-sheet"),more=host&&Q('[data-lc59="more"]',host);if(more)more.hidden=!t2.checked;
  }
  const CSS=".lc59-pop{text-align:center}.lc59-lvl{font-size:44px;font-weight:900;color:#fbbf24;line-height:1.1;margin:4px 0}.lc59-pop h3{margin:2px 0 8px}.lc59-gain{margin:0 0 8px;color:var(--fog,#94a3b8)}.lc59-ladder{text-align:left;margin:10px auto;padding-left:20px;max-width:340px;font-size:14px;line-height:1.5}.lc59-box{display:flex;gap:10px;align-items:flex-start;text-align:left;margin:12px 0 6px;cursor:pointer;font-size:14.5px}.lc59-box input{width:22px;height:22px;flex:0 0 auto;margin-top:1px;accent-color:#38bdf8}.lc59-more{text-align:left}.lc59-more .field{display:block;margin:8px 0}.lc59-more textarea,.lc59-pop textarea{width:100%;min-height:84px}.lc59-nice{font-weight:700;color:#fbbf24}.lc59-card .btn-row{margin-top:10px}.lc59-row{padding:12px 0;border-bottom:1px solid rgba(148,163,184,.2);text-align:left}.lc59-row blockquote{margin:8px 0;padding:8px 12px;border-left:3px solid #38bdf8;background:rgba(56,189,248,.06);border-radius:6px}";
  function afterRender(r){
    clearTimeout(t);
    t=setTimeout(()=>{try{if(/^(home|quests|account|ratings|insights|system)$/.test(r||route())){if(Date.now()-(st().at||0)>GAP||(r||route())==="account")run(false)}paintCard()}catch(e){}},900);
  }
  function init(){
    if(on)return;on=true;
    try{const s=document.createElement("style");s.id="lc59-css";s.textContent=CSS;(document.head||document.documentElement).appendChild(s)}catch(e){}
    document.addEventListener("click",onClick,true);document.addEventListener("change",onChange,true);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)afterRender()});
    setTimeout(()=>{try{run(false)}catch(e){}},12000);
  }
  return{init:init,afterRender:afterRender,run:run,verify:verify,status:status,openAdmin:openAdmin,openFor:openFor,cardHTML:cardHTML,NICE:NICE,version:"9.32.0"};
})();
