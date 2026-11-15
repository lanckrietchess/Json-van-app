/*@@module lc84*/
const LC84=(()=>{
  "use strict";
  /* LC84 (build 9.44.0): the rest of the road, after LC42's first three levels. One strip, one step at a time, blue pulses on the one
     thing to tap next. Nothing opens by itself except the level-up message.
     Level 4 (step "pat"): the patterns across the last 10 games (Stockfish found the mistakes, the MSPC check sorts them by the step that
              failed). The player picks the matching training and finishes one exercise there = Level 5.
     Level 5 (step "tour"): every blue section that is not done yet: open it, tap the ? and listen to Coach Lanckriet to the end, and
              where it is a trainer, finish one exercise there.
     Then (step "quests"): the Lanckriet Student Quests: find a rival, post in the community, share your invite link.
     One saved state (Store lc84-road). Steps: pat, tour, quests, done. */
  const VERSION="9.44.0";
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.prototype.slice.call((r||document).querySelectorAll(s));
  const E=s=>{try{return esc(s)}catch(e){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}};
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const hashNow=()=>{let h="";try{h=decodeURIComponent((location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){h=""}return h.split("/")[0].split("?")[0]};
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const KEY="lc84-road",XP=100,CLAIM_MS=60000,DEAF_MS=90000;
  const OWN=/^(pat|tour|quests)$/;
  const NOSTRIP=/^(admin|privacy|upgrades|level0|giveaway-admin|landing-editor|studio)$/;
  const has=r=>{try{return typeof MOUNT!=="undefined"&&!!MOUNT[r]}catch(e){return false}};

  /* ---------- state ---------- */
  const blank=()=>({step:"",since:0,xp0:0,pick:"",pickAt:0,i:0,ph:"go",heard:{},opened:{},q:{rival:0,post:0,share:0},doneAt:0});
  const st=()=>{const s=Object.assign(blank(),rd(KEY,{})||{});s.q=Object.assign({rival:0,post:0,share:0},s.q||{});s.heard=s.heard||{};s.opened=s.opened||{};return s};
  const put=p=>{const s=Object.assign(st(),p);wr(KEY,s);return s};
  const xpNow=()=>{try{return +LC26.sync.snapshot().xp||0}catch(e){return 0}};
  const award=()=>{try{V6.addXp("think",XP,{noBench:true,noFw:true})}catch(e){}};
  function setLevel(n){
    try{
      const q=rd("lc19-sw",null);
      if(q&&q.on&&(+q.level||1)<n)wr("lc19-sw",Object.assign({},q,{level:Math.min(n,5),base:xpNow()}));
      try{LC19.quest._t.decorate()}catch(e){}
    }catch(e){}
  }
  const lc42=()=>{try{return typeof LC42!=="undefined"&&LC42.owns()}catch(e){return false}};
  const mine=()=>OWN.test(st().step);
  const owns=()=>mine()||lc42();

  /* ---------- the blue sections: what to open, which ? to hear, and whether it has an exercise ---------- */
  const TOUR=[
    {id:"books",label:"Books Vault",grp:"learn",href:"#books",routes:["books"],help:["books"],note:"Kyenzo’s library. More courses and books are coming soon."},
    {id:"shuffle",label:"Ranked Shuffle Trainer",grp:"ranked",href:"#ranked-shuffle",routes:["ranked-shuffle","shuffle"],help:["shuffle"],ex:true,note:"Random lines and rated puzzles in one trainer."},
    {id:"bot",label:"Test your framework against a bot",grp:"learn",href:"#bot",routes:["bot"],help:["bot"],ex:true,note:"Play Stockfish at your level and think before you move."},
    {id:"community",label:"Community",grp:"social",href:"#community",routes:["community"],help:["community"],note:"Posts, wins and questions."},
    {id:"friends",label:"Friends",grp:"social",href:"#friends",routes:["friends"],help:["friends","account"],note:"Follow each other’s progress."},
    {id:"giveaway",label:"Release Giveaway",grp:"social",href:"#giveaway",routes:["giveaway"],help:["giveaway"],when:()=>has("giveaway"),note:"15 days, the top 5 ELO gainers win a month of Pro."},
    {id:"coach-chat",label:"Coach Kyenzo",grp:"social",href:"#coach-chat",routes:["coach-chat"],help:["coach-chat"],when:()=>has("coach-chat"),note:"Direct messages with Kyenzo."}
  ];
  const tour=()=>TOUR.filter(t=>!t.when||t.when());
  const NAMES={M:"Move",S:"Specifics",P:"Priorities",C:"Calculation"};
  const WHY={M:"You miss what their last move threatened or changed.",S:"You overlook loose pieces, weak squares or the structure.",P:"You skip checks, captures and attacks before you decide.",C:"Your calculation stops early or misses their best reply."};
  const FIX={
    M:[{r:"think",label:"MSPC trainer",note:"Drill the Move step: name their threat before you move."},{r:"clinic",label:"Blunder Clinic",note:"Fix the blunders players keep making."}],
    S:[{r:"middlegame",label:"Middlegame course",note:"Plans and structures: what the position needs."},{r:"vision",label:"Board Vision",note:"See loose pieces and weak squares faster."}],
    P:[{r:"themes",label:"Puzzles by theme",note:"Checks, captures and attacks until they come first."},{r:"think",label:"MSPC trainer",note:"Answer M, S, P and C on real positions."}],
    C:[{r:"think",label:"MSPC trainer",note:"Calculate one reply deeper, every time."},{r:"survival",label:"Survival & Defense",note:"Hold or convert by calculating to the end."}]
  };
  const PICKS={think:"MSPC trainer",clinic:"Blunder Clinic",middlegame:"Middlegame course",vision:"Board Vision",themes:"Puzzles by theme",survival:"Survival & Defense"};
  function leaks(){try{return LC42._t.leaksAll()||{}}catch(e){return {}}}
  function topKeys(L){return Object.keys(NAMES).filter(k=>(L[k]|0)>0).sort((a,b)=>(L[b]|0)-(L[a]|0))}
  function scanInfo(){try{const s=LC42._t.st().scan||{};const tot=(s.tot|0)+1;return{tot:tot,done:Math.min(tot,(s.done|0)+1),fin:!!s.fin}}catch(e){return{tot:1,done:1,fin:true}}}
  /* the training that fits: the two biggest leaks, two options each, no duplicates */
  function options(L){
    const keys=topKeys(L).slice(0,2),seen={},out=[];
    (keys.length?keys:["C"]).forEach(k=>(FIX[k]||[]).forEach(o=>{if(!seen[o.r]){seen[o.r]=1;out.push(Object.assign({k:keys.length?k:""},o))}}));
    return out.slice(0,4);
  }

  /* ---------- entry: LC42 hands over when Level 4 opens ---------- */
  function begin(){
    const s=st();if(OWN.test(s.step)||s.step==="done")return false;
    put(Object.assign(blank(),{step:"pat",since:Date.now()}));
    try{const sc=scanInfo();if(!sc.fin)LC42._t.scanRest()}catch(e){}
    poll();paint();return true;
  }

  /* ---------- Level 4: patterns ---------- */
  function patternsHTML(){
    const L=leaks(),keys=topKeys(L),sc=scanInfo(),n=keys.reduce((a,k)=>a+(L[k]|0),0);
    const rows=keys.length?keys.map(k=>'<li><b>'+E(NAMES[k])+'</b> · '+L[k]+(L[k]===1?" mistake":" mistakes")+'<small>'+E(WHY[k])+'</small></li>').join("")
      :'<li>No repeated leak yet. That is a good sign: train the full routine so it stays that way.</li>';
    const status=sc.fin?"Stockfish went through "+sc.tot+(sc.tot===1?" game":" games")+" and found "+n+(n===1?" mistake":" mistakes")+". The MSPC check sorts them by the step that failed."
      :"Still checking your games: "+sc.done+" of "+sc.tot+" done. This list fills in by itself.";
    const opts=options(L).map(o=>'<button type="button" class="lc84-opt" data-lc84-pick="'+E(o.r)+'"><b>'+E(o.label)+'</b><small>'+(o.k?E(NAMES[o.k])+": ":"")+E(o.note)+'</small></button>').join("");
    return '<p>'+E(status)+'</p><ul class="lc84-leaks">'+rows+'</ul><p><b>Pick one training that fits.</b> Finish one exercise there and Level 5 opens.</p><div class="lc84-opts">'+opts+'</div>';
  }
  function openPatterns(){
    try{openSheet({title:"Your patterns",cls:"lc84-sheet",noFocus:true,html:patternsHTML()+'<div class="btn-row"><button type="button" class="btn btn-quiet" data-close>Later</button></div>'})}catch(e){}
  }
  function pick(r){
    const s=put({pick:r,pickAt:Date.now(),xp0:xpNow()});
    closeSheets();location.hash="#"+r;
    say("Finish one exercise here. Level 5 opens when it is done.","good");
    return s;
  }
  function patDone(){
    award();setLevel(5);
    put({step:"tour",since:Date.now(),i:0,ph:"go",xp0:xpNow()});
    levelSheet("Level 5","Level 5 unlocked","You trained the leak that costs you the most. Now the last part of the road: every blue section of your Hub, one at a time. Open it, tap the <b>?</b> and listen to Coach Lanckriet. Where it is a trainer, finish one exercise.",'<button type="button" class="btn btn-primary" data-lc84-gonext>Show me the first one</button>');
  }

  /* ---------- Level 5: the tour of the blue sections ---------- */
  function curItem(s){const list=tour();s=s||st();while(s.i<list.length&&s.heard[list[s.i].id]==="done")s.i++;return list[s.i]||null}
  const onItem=t=>!!t&&t.routes.indexOf(hashNow())>=0;
  function advance(){
    const s=st(),list=tour(),h=Object.assign({},s.heard);const t=curItem(s);if(t)h[t.id]="done";
    let i=s.i+1;while(i<list.length&&h[list[i].id]==="done")i++;
    if(i>=list.length){put({heard:h,i:i});tourDone();return}
    put({heard:h,i:i,ph:"go",xp0:xpNow(),since:Date.now()});
    say("Next: "+list[i].label+".","good");paint();
  }
  function onListened(id){
    const s=st();id=String(id||"");
    if(s.step!=="tour")return;
    const t=curItem(s);if(!t||t.help.indexOf(id)<0)return;
    if(t.ex){put({ph:"ex",xp0:xpNow(),since:Date.now()});paint();say("Now finish one exercise here.","good")}
    else advance();
  }
  function tourDone(){
    award();
    put({step:"quests",since:Date.now()});
    levelSheet("Student Quests","Lanckriet Student Quests","You know every part of your Hub now. Three quests left, and they are about people: find a rival, post in the community and bring in a friend.",'<button type="button" class="btn btn-primary" data-lc84-quests>Open my Student Quests</button>');
  }

  /* ---------- the Lanckriet Student Quests ---------- */
  const QDEF=[
    {k:"rival",label:"Find a Rival",note:"Pick a player at your level and race each other up the ranks.",when:()=>has("rivals"),btn:'<a class="btn btn-primary btn-sm" href="#rivals" data-lc84-q="rival">Find a Rival</a>'},
    {k:"post",label:"Post in the community",note:"Share a win, ask a question or post a game to review.",btn:'<button type="button" class="btn btn-primary btn-sm" data-lc84-post="wins">Share a win</button><button type="button" class="btn btn-ghost btn-sm" data-lc84-post="questions">Ask a question</button><button type="button" class="btn btn-ghost btn-sm" data-lc84-post="games">Post a game</button>'},
    {k:"share",label:"Bring in a friend",note:"Send your ready-made invite link. Your next friend who joins gives you 10 tokens.",btn:'<a class="btn btn-primary btn-sm" href="#refer" data-lc84-q="share">Share my invite link</a>'}
  ];
  const qList=()=>QDEF.filter(q=>!q.when||q.when());
  function questsHTML(){
    const s=st();
    return '<ol class="lc84-ql">'+qList().map(q=>'<li class="'+(s.q[q.k]?"is-done":"")+'"><b>'+(s.q[q.k]?"✓ ":"")+E(q.label)+'</b><small>'+E(q.note)+'</small>'+(s.q[q.k]?"":'<div class="lc84-qb">'+q.btn+'</div>')+'</li>').join("")+'</ol>';
  }
  function openQuests(){try{openSheet({title:"Lanckriet Student Quests",cls:"lc84-sheet",noFocus:true,html:questsHTML()+'<div class="btn-row"><button type="button" class="btn btn-quiet" data-close>Close</button></div>'})}catch(e){}}
  function questDone(k){
    const s=st();if(s.step!=="quests"||s.q[k])return;
    const q=Object.assign({},s.q);q[k]=Date.now();put({q:q});award();
    say("Quest done: "+((QDEF.filter(x=>x.k===k)[0]||{}).label||"")+". +"+XP+" XP","good");
    if(qList().every(x=>q[x.k]))return graduate();
    paint();
  }
  function graduate(){
    put({step:"done",doneAt:Date.now()});
    const x=Q("#lc84-strip");if(x)x.remove();clearPulse();
    levelSheet("Student road","You finished the Lanckriet Student road","Every part of the Hub is yours now. From here it is simple: Trim your games, train the leak it finds, and repeat. Your normal quests continue on the quest board.",'<a class="btn btn-primary" href="#quests" data-lc84-close>Open my quests</a>');
  }

  /* ---------- the one strip ---------- */
  function stripModel(){
    const s=st(),r=hashNow();
    if(s.step==="pat"){
      if(s.pick){
        const here=r===s.pick,ready=Date.now()-(s.pickAt||0)>CLAIM_MS;
        return here?{k:"pick-h"+(ready?1:0),t:"<b>Level 4:</b> finish one exercise here. Level 5 opens when it is done.",b:ready?'<button type="button" class="btn btn-quiet btn-sm" data-lc84-claim>I finished one: continue</button>':"",pulse:[]}
          :{k:"pick-a",t:"<b>Level 4:</b> finish one exercise in "+E(PICKS[s.pick]||"your training")+".",b:'<a class="btn btn-primary btn-sm" href="#'+E(s.pick)+'">Open it</a><button type="button" class="btn btn-quiet btn-sm" data-lc84-pat>Pick another</button>',pulse:[]};
      }
      const sc=scanInfo();
      return{k:"pat"+(sc.fin?1:0),t:"<b>Level 4: your patterns.</b> "+(sc.fin?"I checked your last "+sc.tot+" games.":"I am checking your last games ("+sc.done+" of "+sc.tot+").")+" See where you lose points and pick the training that fits.",b:'<button type="button" class="btn btn-primary btn-sm" data-lc84-pat>See my patterns</button>',pulse:["[data-lc84-pat]"]};
    }
    if(s.step==="tour"){
      const t=curItem(s),list=tour();if(!t)return null;
      const n=list.indexOf(t)+1,head='<span class="lc84-n">Level 5 · '+n+' of '+list.length+'</span> ';
      if(!onItem(t))return{k:"go-"+t.id,t:head+"<b>Next: "+E(t.label)+".</b> "+E(t.note)+" Tap the blue <b>"+E(t.grp==="learn"?"Learn":t.grp==="ranked"?"Ranked":"Social")+"</b> tab, then <b>"+E(t.label)+"</b>.",b:'<a class="btn btn-primary btn-sm" href="'+E(t.href)+'">Open '+E(t.label)+'</a>',pulse:['.n5-tab[data-n5="'+t.grp+'"]','.n5-item[href="'+t.href+'"]']};
      if(s.ph==="ex"){
        const ready=Date.now()-(s.since||0)>CLAIM_MS;
        return{k:"ex-"+t.id+(ready?1:0),t:head+"<b>Now finish one exercise here.</b> Then the next section opens.",b:ready?'<button type="button" class="btn btn-quiet btn-sm" data-lc84-claim>I finished one: continue</button>':"",pulse:[]};
      }
      const deaf=s.opened[t.id]&&Date.now()-s.opened[t.id]>DEAF_MS;
      return{k:"hear-"+t.id+(deaf?1:0),t:head+"<b>Tap the blue ?</b> next to the title and listen to Coach Lanckriet to the end.",b:(deaf?'<button type="button" class="btn btn-quiet btn-sm" data-lc84-deaf>I could not hear it: continue</button>':""),pulse:[".lc29-q"]};
    }
    if(s.step==="quests"){
      const left=qList().filter(q=>!s.q[q.k]),tot=qList().length;
      const cur=left[0];
      if(cur&&cur.k==="rival"&&r==="rivals")return{k:"q-riv",t:"<b>Student Quest:</b> pick a rival or join a tribe on this page.",b:"",pulse:["[data-lc73-rq]","[data-lc73-tj]"]};
      if(cur&&cur.k==="share"&&r==="refer")return{k:"q-ref",t:"<b>Student Quest:</b> tap <b>Share my link</b> and send it to one friend.",b:"",pulse:["[data-v71-share]"]};
      if(cur&&cur.k==="post"&&r==="community")return{k:"q-post",t:"<b>Student Quest:</b> write your post and send it.",b:"",pulse:["[data-c-send]"]};
      return{k:"q"+left.length,t:'<span class="lc84-n">Student Quests · '+(tot-left.length)+' of '+tot+'</span> <b>Lanckriet Student Quests.</b> '+(cur?E(cur.label)+" is next.":""),b:'<button type="button" class="btn btn-primary btn-sm" data-lc84-quests>Open my Student Quests</button>',pulse:["[data-lc84-quests]"]};
    }
    return null;
  }
  function paint(){
    try{
      const v=Q("#view");if(!v)return;
      const on=Q("#lc84-strip");
      const m=mine()&&!lc42()&&!NOSTRIP.test(hashNow())&&!Q(".trainer.is-live",v)?stripModel():null;
      if(!m){if(on)on.remove();clearPulse();return}
      pulse(m.pulse||[]);
      if(on&&on.parentNode===v&&on.getAttribute("data-sig")===m.k)return;
      if(on)on.remove();
      const a=document.createElement("aside");a.id="lc84-strip";a.className="lc84-strip";a.setAttribute("role","note");a.setAttribute("data-sig",m.k);
      a.innerHTML='<p>'+m.t+'</p>'+(m.b?'<div class="lc84-row">'+m.b+'</div>':"");
      v.insertBefore(a,v.firstChild);
      pulse(m.pulse||[]);
    }catch(e){}
  }
  /* blue pulse: only on the one thing to tap next */
  let want=[];
  function pulse(sel){want=sel.slice();QA(".lc84-pulse").forEach(el=>{if(!sel.some(s=>{try{return el.matches(s)}catch(e){return false}}))el.classList.remove("lc84-pulse")});sel.forEach(s=>{try{QA(s).forEach(el=>el.classList.add("lc84-pulse"))}catch(e){}})}
  function clearPulse(){want=[];QA(".lc84-pulse").forEach(el=>el.classList.remove("lc84-pulse"))}

  /* ---------- sheets ---------- */
  function closeSheets(){QA(".sheet-wrap [data-close]").forEach((c,i,a)=>{if(i===a.length-1)try{c.click()}catch(e){}})}
  function levelSheet(title,head,body,btn){
    try{openSheet({title:title,cls:"lc25-sheet lc25-level lc84-sheet",noFocus:true,html:'<div class="lc25-pop"><h2>'+E(head)+'</h2><p><b>+'+XP+' XP</b></p></div><p>'+body+'</p><div class="btn-row">'+btn+'<button type="button" class="btn btn-quiet" data-close>Later</button></div>'})}catch(e){}
    paint();
  }

  /* ---------- progress: polled, nothing waits on a timer the player can see ---------- */
  let pt=0;
  function poll(){clearInterval(pt);pt=setInterval(tick,2500);tick()}
  function tick(){
    const s=st();
    if(!OWN.test(s.step)){clearInterval(pt);clearPulse();const x=Q("#lc84-strip");if(x)x.remove();return}
    if(document.visibilityState==="hidden")return;
    if(s.step==="pat"&&s.pick&&xpNow()>(+s.xp0||0))return patDone();
    if(s.step==="tour"&&s.ph==="ex"&&xpNow()>(+s.xp0||0))return advance();
    paint();
  }

  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    if(t.closest("[data-lc84-pat]")){e.preventDefault();closeSheets();setTimeout(openPatterns,closeDelay());return}
    const pk=t.closest("[data-lc84-pick]");if(pk){e.preventDefault();pick(pk.getAttribute("data-lc84-pick"));return}
    if(t.closest("[data-lc84-claim]")){e.preventDefault();const s=st();if(s.step==="pat")patDone();else if(s.step==="tour")advance();return}
    if(t.closest("[data-lc84-deaf]")){e.preventDefault();const s=st(),it=curItem(s);if(it)onListened(it.help[0]);return}
    if(t.closest("[data-lc84-gonext]")){e.preventDefault();closeSheets();const it=curItem();if(it)location.hash=it.href;return}
    if(t.closest("[data-lc84-quests]")){e.preventDefault();closeSheets();setTimeout(openQuests,closeDelay());return}
    if(t.closest("[data-lc84-close]")){closeSheets();return}
    const qa=t.closest("[data-lc84-q]");if(qa){closeSheets();return}
    const po=t.closest("[data-lc84-post]");if(po){e.preventDefault();wr("lc84-postcat",po.getAttribute("data-lc84-post"));closeSheets();location.hash="#community";return}
    /* the quests themselves, on their own pages */
    const s=st();
    if(s.step==="quests"){
      if(t.closest("[data-lc73-rq],[data-lc73-tj],[data-lc73-tc]"))setTimeout(()=>questDone("rival"),400);
      if(t.closest("[data-v71-share]"))setTimeout(()=>questDone("share"),400);
    }
    /* the ? of the current tour section: remember when it was opened (for the "could not hear it" way out) */
    const lq=t.closest("[data-lc29-open]");
    if(lq&&s.step==="tour"){const it=curItem(s);if(it&&it.help.indexOf(lq.getAttribute("data-lc29-open"))>=0&&!s.opened[it.id]){const o=Object.assign({},s.opened);o[it.id]=Date.now();put({opened:o})}}
    if(t.closest("[data-n5]"))setTimeout(()=>pulse(want),40);
  }
  const closeDelay=()=>Q(".sheet-wrap")?380:0;
  /* the community quest: choose the category the player picked and put the cursor in the title */
  function prefillPost(){
    const cat=rd("lc84-postcat","");if(!cat||hashNow()!=="community")return;
    let n=0;const iv=setInterval(()=>{
      const sel=Q("[data-c-cat-sel]"),ti=Q("[data-c-title]");
      if(sel||++n>40){clearInterval(iv);if(sel){try{sel.value=cat;sel.dispatchEvent(new Event("change",{bubbles:true}))}catch(e){}if(ti){try{ti.scrollIntoView({block:"center"})}catch(e){}}wr("lc84-postcat","")}}
    },250);
  }

  let obs=null;
  function afterRender(route){
    try{
      if(obs){try{obs.disconnect()}catch(e){}obs=null}
      if(!mine())return;
      const run=()=>paint();
      setTimeout(run,180);
      prefillPost();
      if(typeof MutationObserver==="function"){
        let b=false;const m=obs=new MutationObserver(()=>{if(b)return;b=true;setTimeout(()=>{b=false;run()},200)});
        m.observe(Q("#view")||document.body,{childList:true,subtree:true});
        setTimeout(()=>{try{m.disconnect()}catch(e){}if(obs===m)obs=null},15000);
      }
    }catch(e){}
  }
  function css(){
    if(Q("#lc84-css"))return;const s=document.createElement("style");s.id="lc84-css";
    s.textContent='.lc84-strip{margin:0 0 12px;padding:10px 12px;border:1px solid rgba(56,189,248,.45);background:rgba(56,189,248,.08);border-radius:12px;display:grid;gap:8px;font-size:14px;line-height:1.45}.lc84-strip p{margin:0}'
      +'.lc84-row,.lc84-qb{display:flex;gap:8px;flex-wrap:wrap}.lc84-strip .btn,.lc84-sheet .btn{min-height:44px}.lc84-n{font-size:11px;font-weight:800;color:#38bdf8;text-transform:uppercase;letter-spacing:.04em}'
      +'.lc84-leaks,.lc84-ql{list-style:none;padding:0;margin:8px 0;display:grid;gap:8px}.lc84-leaks li,.lc84-ql li{padding:8px 10px;border:1px solid rgba(148,163,184,.3);border-radius:10px}.lc84-leaks small,.lc84-ql small,.lc84-opt small{display:block;opacity:.8;margin-top:2px}'
      +'.lc84-ql li.is-done{border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.06)}.lc84-ql .lc84-qb{margin-top:8px}'
      +'.lc84-opts{display:grid;gap:8px}.lc84-opt{display:block;width:100%;text-align:left;min-height:56px;padding:10px 12px;border-radius:12px;border:1px solid rgba(56,189,248,.55);background:rgba(56,189,248,.1);color:#e2e8f0;font:inherit;cursor:pointer}.lc84-opt b{color:#38bdf8}'
      +'@keyframes lc84b{0%,100%{box-shadow:0 0 0 0 rgba(56,189,248,.65)}50%{box-shadow:0 0 0 8px rgba(56,189,248,0)}}'
      +'.lc84-pulse{animation:lc84b 1.6s ease-in-out infinite!important;outline:2px solid #38bdf8!important;outline-offset:2px;border-radius:10px}.lc29-q.lc84-pulse{border-radius:50%}'
      +'@media (max-width:959px){#view>#lc84-strip,#view>#lc42-strip{order:-20}}'
      +'@media (prefers-reduced-motion:reduce){.lc84-pulse{animation:none!important}}';
    document.head.appendChild(s);
  }
  function init(){
    try{
      css();
      document.addEventListener("click",onClick,true);
      window.addEventListener("lc29-listened",e=>{try{onListened(String(e.detail||""))}catch(x){}});
      window.addEventListener("lc39-posted",()=>{try{questDone("post")}catch(x){}});
      if(mine())poll();
    }catch(e){console.error("lc84",e)}
  }
  return{init:init,afterRender:afterRender,begin:begin,owns:owns,version:VERSION,
    _t:{st:st,put:put,tick:tick,paint:paint,stripModel:stripModel,options:options,patternsHTML:patternsHTML,patDone:patDone,advance:advance,onListened:onListened,questDone:questDone,tour:tour,curItem:curItem,openPatterns:openPatterns,openQuests:openQuests,TOUR:TOUR,FIX:FIX}};
})(); /*@@end lc84*/
