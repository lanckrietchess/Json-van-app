/*@@module lc74*/
const LC74=(()=>{
  "use strict";
  /* LC74 (build 9.37.0):
     1. Coach Lanckriet's voice ONLY from the recorded ElevenLabs clips (assets/audio/coach and assets/audio/lessons, made by
        tools/make_coach_audio.py and tools/make_lesson_audio.py). The browser's own speech (English read with a Dutch voice) is switched off
        for the whole app: a text without a clip is shown, not spoken, and the owner's audit logs it so the script can voice it in one batch
        (owner menu > Coach voice audit > Download the list, then: python3 tools/make_coach_audio.py --extra coach_voice_extra.json).
     2. "Congratulations!" pop-ups at real milestones (XP level up, quest level, the Student Road, beating your rival this week, a strong game
        review) that ask "Share this achievement to the Community Wall of Love / Feed?". Share my results stays OFF until the member says yes
        (GDPR opt-in): yes = Share my results ON (app + website), a post in the community feed and the achievement in Kyenzo's Wall of Love queue. */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0].toLowerCase();
  const say=(t,k)=>{try{toast(t,k||"")}catch(e){}};
  const owner=()=>{try{return !!(LC49.owner()||Admin.active)}catch(e){return false}};
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const face=(e,s)=>{try{return LC67.face(e,s)}catch(x){return'<span aria-hidden="true">♞</span>'}};
  const myName=()=>{try{const p=App.profile||{};return String(p.name||p.first||"").split(" ")[0]||String((sess()||{}).email||"").split("@")[0]||"Member"}catch(e){return"Member"}};
  async function tok(){try{return await LC26.sync.token()}catch(e){return""}}
  async function rpc(fn,args){const t=await tok();if(!t)return{status:0,data:null};try{return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:{Authorization:"Bearer "+t},body:JSON.stringify(args||{})})}catch(e){return{status:0,data:null}}}

  /* ============ 1. Coach Lanckriet's voice ============ */
  const DIRS=["assets/audio/coach/","assets/audio/lessons/"];let idx=null,idxAt=0,audio=null,playing=0;
  async function indexes(){
    if(idx&&Date.now()-idxAt<36e5)return idx;
    const out={};await Promise.all(DIRS.map(async d=>{try{const r=await fetch(d+"index.json",{cache:"no-cache"});if(!r.ok)return;const j=await r.json(),c=(j&&j.clips)||{};
      Object.keys(c).forEach(h=>{const v=c[h],f=typeof v==="string"?v:v&&v.file;if(f&&!out[h])out[h]=d+f})}catch(e){}}));
    idx=out;idxAt=Date.now();return idx;
  }
  async function hashOf(text){try{return await LC60.hashOf(LC60.clean(text))}catch(e){return""}}
  async function clipOf(text){const h=await hashOf(text);if(!h)return"";const i=await indexes();return i[h]||""}
  function logMissing(text){
    if(!owner())return;const t=String(text||"").replace(/\s+/g," ").trim();if(t.length<3)return;
    const l=rd("lc74-voice-missing",[]);if(Array.isArray(l)&&l.indexOf(t)<0){l.push(t);wr("lc74-voice-missing",l.slice(-600))}
  }
  function stop(){playing++;try{audio&&audio.pause()}catch(e){}}
  async function sayAll(texts){
    stop();const run=playing,list=(Array.isArray(texts)?texts:[texts]).map(x=>String(x||"").trim()).filter(Boolean);let any=false;
    for(const t of list){
      if(run!==playing)return any;
      const u=await clipOf(t);if(!u){logMissing(t);continue}
      any=true;
      await new Promise(res=>{try{if(!audio)audio=new Audio();audio.onended=audio.onerror=()=>res();audio.src=u;const p=audio.play();if(p&&p.catch)p.catch(()=>res())}catch(e){res()}});
    }
    if(!any)say(owner()?"No recorded voice for this text yet: it is on the Coach voice audit list.":"Coach Lanckriet’s voice for this part is not recorded yet.","");
    return any;
  }
  /* the browser's own voice is off everywhere: anything that still calls it plays the recorded clip, or nothing */
  function guard(){
    try{if(!("speechSynthesis" in window)||window.speechSynthesis.__lc74)return;const ss=window.speechSynthesis;
      ss.speak=function(u){try{sayAll([u&&u.text||""])}catch(e){}};ss.__lc74=true}catch(e){}
  }
  /* the coach's micro-dialogues (LC69) get the same speaker button as the other coach texts (it shows only when the clip exists) */
  function bubbleVoice(){
    const b=Q("#lc69-bubble");if(!b||b.__lc74)return;b.__lc74=1;
    const p=Q("p",b)||b,t=(p.textContent||"").trim();if(!t)return;
    try{p.insertAdjacentHTML("beforeend"," "+LC61.vbtn(t));LC61.paintVoice()}catch(e){}
    clipOf(t).then(u=>{if(!u)logMissing(t)});
  }
  async function scanPage(){
    const texts=[];QA('[data-lc61="voice"]').forEach(b=>texts.push(b.getAttribute("data-text")||""));
    QA("#lc69-bubble p,.lc61-tail p,.lc66-coach p,[data-lc60-say]").forEach(e=>texts.push(e.getAttribute&&e.getAttribute("data-lc60-say")||e.textContent||""));
    let miss=0;for(const t of texts){if(String(t).trim().length<3)continue;if(!(await clipOf(t))){logMissing(t);miss++}}
    return{seen:texts.length,miss:miss};
  }
  async function audit(){
    const i=await indexes(),n=Object.keys(i).length,c=Object.keys(i).filter(h=>/coach\//.test(i[h])).length,l=(rd("lc74-voice-missing",[])||[]);
    try{openSheet({title:"Coach voice audit",noFocus:true,cls:"lc74-sheet",html:
      '<p><b>'+n+'</b> recorded clips found ('+c+' coach texts, '+(n-c)+' lesson texts). The help buttons use assets/audio/help.</p>'
      +(n?"":'<p class="lc70-warn">No clips are uploaded yet, so nothing can be spoken. Run the two scripts below on your computer and upload the folders.</p>')
      +'<p><b>'+l.length+'</b> texts on the missing list (collected while you use the app as the owner).</p>'
      +'<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-lc74="scan">Scan this page</button><button type="button" class="btn btn-primary btn-sm" data-lc74="dl"'+(l.length?"":" disabled")+'>Download the list (JSON)</button><button type="button" class="btn btn-quiet btn-sm" data-lc74="clear"'+(l.length?"":" disabled")+">Clear the list</button></div>"
      +'<ol class="small">'+l.slice(-30).map(t=>"<li>"+esc(t)+"</li>").join("")+"</ol>"
      +'<h4>Make the voice (on your computer, with your ElevenLabs key in .env)</h4><pre class="lc74-pre">python3 tools/make_lesson_audio.py --dry\npython3 tools/make_lesson_audio.py --scope takeaway,idea\nnode tools/coach_audio_texts.mjs\npython3 tools/make_coach_audio.py --extra coach_voice_extra.json --dry\npython3 tools/make_coach_audio.py --extra coach_voice_extra.json</pre><p class="small muted">Then upload assets/audio/coach/ and assets/audio/lessons/ (the mp3 files AND index.json). Texts with a name or a number in them (they change per player) cannot be pre-recorded: they stay text only.</p>',
      onMount:s=>{s.el.addEventListener("click",async e=>{const b=e.target.closest("[data-lc74]");if(!b)return;const a=b.getAttribute("data-lc74");
        if(a==="scan"){const r=await scanPage();say(r.miss+" of "+r.seen+" texts on this page have no clip yet.","good");s.close();audit()}
        if(a==="dl"){const blob=new Blob([JSON.stringify({texts:rd("lc74-voice-missing",[])},null,1)],{type:"application/json"}),u=URL.createObjectURL(blob),x=document.createElement("a");x.href=u;x.download="coach_voice_extra.json";document.body.appendChild(x);x.click();x.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}
        if(a==="clear"){wr("lc74-voice-missing",[]);s.close();audit()}})}})}catch(e){}
  }

  /* ============ 2. Congratulations! + share (opt-in) ============ */
  const K="lc74-ms";
  const st=()=>Object.assign({lv:0,ql:0,road:0,rival:"",an:{},last:0,nope:0,nopeAt:0},rd(K,{})||{});
  const save=s=>wr(K,s);
  function roadRunning(){try{const o=rd("lc42-onb",null);return !!(o&&o.step&&o.step!=="done")}catch(e){return false}}
  function level(){try{return +((typeof getUserLevel==="function"?getUserLevel():LC61.getUserLevel())||{}).level||0}catch(e){return 0}}
  function questLv(){try{return +LC19.quest.level()||0}catch(e){return 0}}
  let queue=[],showing=false;
  function check(){
    if(!sess()||roadRunning())return;
    const s=st();let changed=false;
    const lv=level();if(lv){if(!s.lv){s.lv=lv;changed=true}else if(lv>s.lv){queue.push({kind:"level",title:"Level "+lv+" reached",line:"You climbed to level "+lv+". That is training, not luck."});s.lv=lv;changed=true}}
    const ql=questLv();if(ql){if(!s.ql){s.ql=ql;changed=true}else if(ql>s.ql){queue.push({kind:"quest",title:"Quest level "+ql+" complete",line:"Quest level "+ql+" is done. Every finished quest is a habit that stays."});s.ql=ql;changed=true}}
    const road=(rd("lc71-badges",{})||{}).student_road;if(road&&!s.road){s.road=road;changed=true;queue.push({kind:"road",title:"Lanckriet Student Road completed",line:"You finished the Road to a Lanckriet Student. That is 1,500 XP of real work."})}
    const beat=rd("lc73-beat","");if(beat&&beat!==s.rival){s.rival=beat;changed=true;queue.push({kind:"rival",title:"You beat your rival this week",line:"More training XP than your rival this week. Keep the pressure on."})}
    if(changed)save(s);
    next();
  }
  function trimScan(){
    if(route()!=="trim")return;const rs=QA(".report-stats .rs").filter(x=>/Accuracy/i.test(x.textContent))[0];if(!rs)return;
    const acc=parseFloat((Q("b",rs)||{}).textContent);if(!(acc>=85))return;
    const id=((Q("#an-meta")||{}).textContent||"").replace(/\s+/g," ").slice(0,80)+"|"+acc;const s=st();if(s.an[id])return;
    s.an[id]=Date.now();const keys=Object.keys(s.an);if(keys.length>40)delete s.an[keys[0]];save(s);
    queue.push({kind:"analysis",title:"A strong game: "+Math.round(acc)+"% accuracy",line:Math.round(acc)+"% accuracy in a reviewed game. Your thinking held up move after move."});next();
  }
  function next(){
    if(showing||!queue.length)return;
    const s=st();if(s.nope>=3&&Date.now()-s.nopeAt<7*864e5){queue=[];return}   /* said "Not now" 3 times: ask at most once a week */
    if(Date.now()-(+s.last||0)<20*6e4&&queue[0].kind!=="level"){return}       /* never two pop-ups within 20 minutes */
    const m=queue.shift();showing=true;s.last=Date.now();save(s);pop(m);
  }
  function pop(m){
    const conf=Array.from({length:18},(x,i)=>'<i style="left:'+(5+i*5.2)+"%;animation-delay:"+(i%6)*.12+"s;background:"+["#fbbf24","#38bdf8","#4ade80","#f472b6"][i%4]+'"></i>').join("");
    let sh=null;
    try{sh=openSheet({title:"Congratulations!",noFocus:true,cls:"lc74-sheet lc36-consent",html:
      '<div class="lc74-conf" aria-hidden="true">'+conf+'</div><div class="lc74-pop"><span class="lc69-face">'+face(["happy","proud","smile"],64)+'</span><div><p class="lc74-k">Milestone</p><h3>'+esc(m.title)+"</h3><p>"+esc(m.line)+"</p></div></div>"
      +'<div class="lc74-share"><b>Share this achievement to the Community Wall of Love / Feed?</b><p class="small muted">Your first name and this achievement appear in the community feed, and Kyenzo may put it on the Wall of Love on the website. Never your e-mail. You can switch it off any time in Account > Share my results.</p>'
      +'<label class="field"><span class="field-label">Add one sentence (optional)</span><input class="input" maxlength="200" data-lc74-line placeholder="What helped you most?"></label>'
      +'<div class="btn-row"><button type="button" class="btn btn-gold" data-lc74-yes>Yes, share it</button><button type="button" class="btn btn-ghost" data-lc74-no>Not now</button></div></div>',
      onMount:s=>{
        s.el.addEventListener("click",async e=>{
          if(e.target.closest("[data-lc74-no]")){const z=st();z.nope=(+z.nope||0)+1;z.nopeAt=Date.now();save(z);s.close();return}
          if(e.target.closest("[data-lc74-yes]")){const b=e.target.closest("[data-lc74-yes]");b.disabled=true;const line=String((Q("[data-lc74-line]",s.el)||{}).value||"").trim();
            const ok=await share(m,line);s.close();say(ok?"Shared. Thank you for inspiring the others!":"Could not share it right now. Try again later.",ok?"good":"bad");const z=st();z.nope=0;save(z)}
        });
      }})}catch(e){}
    const done=()=>{showing=false;setTimeout(next,1500)};
    if(sh&&sh.el){const mo=new MutationObserver(()=>{if(!sh.el.isConnected){mo.disconnect();done()}});mo.observe(document.body,{childList:true,subtree:true})}else done();
  }
  async function share(m,line){
    let ok=false;
    /* 1. Share my results ON (the member's explicit yes; it stays OFF until now) */
    try{if(typeof V71!=="undefined"&&V71.online()){const r=await V71.call("lc36_proof_consent_set",{p_app:true,p_web:true});ok=!!(r&&r.ok)||ok}}catch(e){}
    /* 2. a post in the community feed (Wins) */
    try{const r=await Quota.call("c39_post",{title:m.title,body:(line?line+"\n\n":"")+m.line+"\n\nShared from Lanckriet Chess.",category:"wins",name:myName()});ok=!!(r&&r.ok)||ok}catch(e){}
    /* 3. Kyenzo's Wall of Love queue (he decides what goes on the website) */
    try{const r=await rpc("lc74_share",{p:{kind:m.kind,title:m.title,body:line,name:myName()}});ok=!!(r.data&&r.data.ok)||ok}catch(e){}
    return ok;
  }

  /* ============ wiring ============ */
  function ownerRow(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc74-own]",m)||!owner())return;const ref=Q("[data-lc73-own]",m)||Q("[data-lc72-own]",m)||Q("[data-lc59-admin]",m);if(!ref)return;
    const b=document.createElement("button");b.type="button";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc74-own","voice");b.innerHTML="<span><b>Coach voice audit</b><small>Where Coach Lanckriet’s ElevenLabs voice is missing, and the batch list</small></span>";
    ref.insertAdjacentElement("beforebegin",b);
  }
  function css(){
    if(Q("#lc74-css"))return;const s=document.createElement("style");s.id="lc74-css";
    s.textContent=".lc74-pop{display:flex;gap:14px;align-items:center}.lc74-pop h3{margin:2px 0 4px;font-size:22px}.lc74-pop p{margin:0}.lc74-k{color:#fbbf24;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase}"
      +".lc74-share{margin-top:14px;padding:12px;border-radius:14px;border:1px solid rgba(251,191,36,.5);background:rgba(251,191,36,.07)}.lc74-share .btn{min-height:44px}.lc74-share p{margin:6px 0}"
      +".lc74-conf{position:relative;height:0}.lc74-conf i{position:absolute;top:-10px;width:8px;height:14px;border-radius:2px;opacity:0}"
      +"@media (prefers-reduced-motion:no-preference){.lc74-conf i{animation:lc74f 1.6s ease-out forwards}}@keyframes lc74f{0%{opacity:1;transform:translateY(0) rotate(0)}100%{opacity:0;transform:translateY(140px) rotate(540deg)}}"
      +".lc74-pre{white-space:pre-wrap;font-size:12px;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:10px;overflow-x:auto}";
    document.head.appendChild(s);
  }
  let deb=0;
  function scan(){ownerRow();bubbleVoice();trimScan()}
  function afterRender(){clearTimeout(deb);deb=setTimeout(()=>{try{scan();check()}catch(e){}},400)}
  function init(){
    css();guard();
    document.addEventListener("click",e=>{const o=e.target.closest&&e.target.closest("[data-lc74-own]");if(o){e.preventDefault();e.stopPropagation();try{const m=Q("#lc49-menu");if(m)m.remove()}catch(x){}audit()}},true);
    new MutationObserver(()=>{clearTimeout(deb);deb=setTimeout(()=>{try{scan()}catch(e){}},250)}).observe(document.body,{childList:true,subtree:true});
    setInterval(()=>{try{if(!document.hidden)check()}catch(e){}},30000);
  }
  return{init:init,afterRender:afterRender,voice:{say:sayAll,stop:stop,clipOf:clipOf,indexes:indexes,audit:audit,scanPage:scanPage},check:check,_t:{pop:pop,share:share,queue:()=>queue},version:"9.37.0"};
})(); /*@@end lc74*/
