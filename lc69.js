/*@@module lc69*/ const LC69=(()=>{
  "use strict";
  /* LC69 (build 9.34.0):
     1. Landing page texts (hero title, mission, Hero's Journey story, intro video) are edited by the owner INSIDE the app (owner menu > "Landing page texts"),
        saved in the database (lc69_landing, owner-only writes) and read by index.html. Nothing on the public page can edit anything.
     2. Coach Lanckriet's micro-dialogues: short, sharp lines at the right moment (an opening mistake, a clean line, blitz habits). Max one per 3 minutes.
     3. Anti-blitz wall: when most recent games are blitz or bullet and the Rapid rating is under 2000, the app tags the habit ("Blitz Junkie") on Trim
        and on the quest page and sends the student back to Rapid + MSPC. Nothing is blocked: it is a coach, not a lock.
     4. "Road to a Lanckriet Student": the daily ritual on the quest page: the pre-game MSPC puzzle, a Rapid game, Trim it. Discipline ranks come from the
        ritual streak (not from rating), plus "2000+ Master" from the server-verified peak.
     5. Books Vault (#books): what classic training books teach, where players usually get stuck with them, and how the Lanckriet system
        turns them into a habit at the board (9.38.2: calm, professional wording, no "versus" framing). The texts are summaries in our own words; the owner should read them once (see PROJECT_KNOWLEDGE 5.17). */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0].toLowerCase();
  const face=(e,s)=>{try{return LC67.face(e,s)}catch(x){return'<span aria-hidden="true">♞</span>'}};
  const day=t=>{const d=new Date(t||Date.now());return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
  async function rpc(fn,args){
    try{const tok=await LC26.sync.token();if(!tok)return{status:0,data:null};
      return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:{Authorization:"Bearer "+tok},body:JSON.stringify(args||{})})}catch(e){return{status:0,data:null}}
  }

  /* ============ 1. landing texts (owner) ============ */
  const LKEYS=[
    ["hero_title","Hero title","My goal is to save 20,000 people out of the lies and chaos by the end of 2027.",160,false],
    ["hero_sub","Line under the title","Stop guessing why you lose. A 2100+ ELO coach in your pocket.",200,false],
    ["story","My story (one paragraph per line)","",2400,true],
    ["video","Intro video link (YouTube, Vimeo or an mp4 address)","",300,false]];
  async function landingSheet(){
    let sh=null;try{sh=openSheet({title:"Landing page texts",cls:"lc36-sheet lc69-sheet",noFocus:true,html:'<p class="muted">Loading…</p>'})}catch(e){return}
    const host=sh.el||document;
    const r=await rpc("lc69_landing_get",{}),d=r.data;
    if(!(r.status===200&&d&&d.ok)){host.innerHTML='<p class="form-msg is-bad">'+esc(r.status===404?"Run the 9.34.0 SQL file first.":"Sign in as the owner first.")+'</p>';return}
    const v=d.values||{};
    host.innerHTML='<p class="small muted">These texts replace the defaults on the landing page within a minute. Leave a field empty to keep the default. Plain text only. Never promise a rating result or "lifetime" prices.</p>'
      +LKEYS.map(k=>'<label class="lc69-f"><span>'+esc(k[1])+'</span>'+(k[4]?'<textarea class="input" rows="7" maxlength="'+k[3]+'" data-k="'+k[0]+'" placeholder="Default text is used">'+esc(v[k[0]]||"")+'</textarea>':'<input class="input" maxlength="'+k[3]+'" data-k="'+k[0]+'" value="'+esc(v[k[0]]||"")+'" placeholder="'+esc(k[2]||"Default text is used")+'">')+'</label>').join("")
      +'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc69="land-save">Save</button><a class="btn btn-ghost" href="/" target="_blank" rel="noopener">Open the landing page</a></div><p class="form-msg" data-lc69-msg aria-live="polite"></p>';
    host.addEventListener("click",async e=>{
      if(!(e.target.closest&&e.target.closest('[data-lc69="land-save"]')))return;e.preventDefault();
      const o={};QA("[data-k]",host).forEach(i=>{o[i.getAttribute("data-k")]=i.value.trim()});
      if(/\blifetime\b|\bforever\b/i.test(JSON.stringify(o))){Q("[data-lc69-msg]",host).textContent="Remove “lifetime” / “forever”: launch prices last as long as the subscription stays active.";return}
      if(o.video&&!/^https:\/\//i.test(o.video)){Q("[data-lc69-msg]",host).textContent="The video link must start with https://";return}
      const s=await rpc("lc69_landing_set",{p_values:o});
      Q("[data-lc69-msg]",host).textContent=s.status===200&&s.data&&s.data.ok?"Saved. The landing page shows it within a minute.":"Could not save.";
    });
  }

  /* ============ 2. Coach Lanckriet micro-dialogues ============ */
  const LINES={
    opening:["That’s a classic delusional “don’t memorize your opening” trap. You actually need proper theory.","Theory is not memorising for its own sake: it is knowing what the position wants. Run M first: what did their move change?"],
    clean:["You’re one step closer to full clarity.","Under 2000, every game feels like chaos. Above it, it is calm: you know what the position asks. Every clean line moves you there."],
    blitz:["Classic Blitz-junkie move: hoping for tricks instead of calculating.","Blitz trains your hands, not your head. Under 2000 Rapid, play Rapid and run MSPC on every move."],
    miss:["Slow down. The routine is four questions, not one guess.","That miss is information. Name the step you skipped, then try again."]};
  let lastSay=+rd("lc69-said",0)||0,openT=0;
  function bubble(kind,force){
    if(!force&&Date.now()-lastSay<3*60*1000)return false;
    const L=LINES[kind];if(!L)return false;const n=+rd("lc69-n-"+kind,0)||0,text=L[n%L.length];wr("lc69-n-"+kind,n+1);
    lastSay=Date.now();wr("lc69-said",lastSay);
    let b=Q("#lc69-bubble");if(b)b.remove();
    b=document.createElement("div");b.id="lc69-bubble";b.className="lc69-bubble";b.setAttribute("role","status");
    b.innerHTML='<span class="lc69-face">'+face(kind==="clean"?["happy","proud"]:kind==="blitz"?["tough_love","skeptical","serious"]:["serious","skeptical"],40)+'</span><p><b>Coach Lanckriet</b>'+esc(text)+'</p><button type="button" class="lc69-x" data-lc69="bx" aria-label="Close">×</button>';
    document.body.appendChild(b);setTimeout(()=>{try{b.classList.add("out");setTimeout(()=>b.remove(),400)}catch(e){}},9000);
    return true;
  }
  function watchFeedback(){
    const r=route();if(r!=="openings"&&r!=="mspc-rep")return;
    const v=Q("#view");if(!v)return;
    QA(".fb-bad,.fb-miss",v).forEach(fb=>{
      if(fb.__lc69)return;fb.__lc69=1;
      clearTimeout(openT);openT=setTimeout(()=>{if(fb.isConnected)bubble("opening")},3000);   /* after 3 seconds, as specified */
    });
    QA(".fb-done",v).forEach(fb=>{
      if(fb.__lc69)return;fb.__lc69=1;
      const t=(fb.textContent||"").toLowerCase();if(/complete|learned|clean|perfect/.test(t))bubble("clean");
    });
  }

  /* ============ 3. anti-blitz wall ============ */
  function speed(pgn){
    const m=String(pgn||"").match(/\[TimeControl "([^"]+)"\]/);if(!m)return"";
    const t=m[1];if(/^-$|\//.test(t))return"daily";
    const p=t.split("+"),base=+p[0]||0,inc=+p[1]||0,est=base+40*inc;
    return est<180?"bullet":est<480?"blitz":est<1500?"rapid":"classical";
  }
  function rating(){
    try{const s=rd("lc59",{})||{};if(s.s&&+s.s.peak)return+s.s.peak}catch(e){}
    try{return+App.profile.elo||0}catch(e){return 0}
  }
  function blitzState(){
    const g=(rd("lc42-games",[])||[]).slice(0,10),sp=g.map(x=>speed(x.pgn)).filter(Boolean);
    const fast=sp.filter(s=>s==="blitz"||s==="bullet").length,r=rating();
    return{n:sp.length,fast:fast,junkie:sp.length>=4&&fast/sp.length>=.5&&(!r||r<2000),rating:r};
  }
  function blitzCard(where){
    const v=Q("#view");if(!v||Q("#lc69-blitz",v))return;
    const b=blitzState();if(!b.junkie)return;
    const c=document.createElement("section");c.id="lc69-blitz";c.className="panel pad lc69-blitz";
    c.innerHTML='<span class="lc69-face">'+face(["tough_love","skeptical","serious"],48)+'</span><div><p class="lc69-tag">Habit found: Blitz Junkie</p><p><b>'+b.fast+' of your last '+b.n+' games were blitz or bullet.</b> Classic Blitz-junkie move: hoping for tricks instead of calculating. Under 2000 Rapid, blitz trains your hands, not your thinking.</p><p class="small muted">The order for your next games: Rapid (10 minutes or more), the pre-game MSPC puzzle first, then Trim every game.</p><div class="btn-row"><a class="btn btn-primary btn-sm" href="#bot">Play a slow game vs my Sparring Partner</a><a class="btn btn-ghost btn-sm" href="#ranked">Do the pre-game MSPC puzzle</a></div></div>';
    const lib=Q("#lc39-lib",v),ref=where==="trim"&&lib?lib:v.firstElementChild;
    if(ref&&ref.parentNode)ref.parentNode.insertBefore(c,ref);else v.insertBefore(c,v.firstChild);
    const k=day();if(rd("lc69-bday","")!==k){wr("lc69-bday",k);bubble("blitz",true)}
  }

  /* ============ 4. Road to a Lanckriet Student ============ */
  const RANKS=[[0,"Rookie"],[3,"Ritual Keeper"],[7,"Disciplined"],[14,"Iron Routine"],[30,"Unshakeable"]];
  function road(){
    if(route()!=="quests")return;
    const v=Q("#view");if(!v||Q("#lc69-road",v))return;
    let R={streak:0,best:0,total:0,day:""};try{R=LC67.ritual.get()}catch(e){}
    const today=day(),puz=R.day===today;
    const games=(rd("lc42-games",[])||[]),slowToday=games.filter(g=>g.t&&day(g.t)===today&&/rapid|classical|daily/.test(speed(g.pgn)));
    const trims=(()=>{try{const d=rd("lc-hub-trim-stats-v1",{})||{};return Object.keys(d.games||{}).map(k=>d.games[k]).filter(x=>x&&x.t&&day(x.t)===today).length}catch(e){return 0}})();
    const best=Math.max(+R.best||0,+R.streak||0),rk=RANKS.filter(x=>best>=x[0]).pop(),nx=RANKS.filter(x=>x[0]>best)[0];
    const master=rating()>=2000;
    const newest=games.filter(g=>g.t).sort((a,b)=>b.t-a.t)[0],lastTrimT=(()=>{try{const d=rd("lc-hub-trim-stats-v1",{})||{};return Math.max(0,...Object.keys(d.games||{}).map(k=>+d.games[k].t||0))}catch(e){return 0}})();
    const fresh=newest&&newest.t>lastTrimT;
    const step=(ok,t,s,a)=>'<li class="'+(ok?"ok":"")+'"><span class="lc69-ck" aria-hidden="true">'+(ok?"✓":"")+'</span><div><b>'+t+'</b><small>'+s+'</small></div>'+(ok?"":a)+'</li>';
    const c=document.createElement("section");c.id="lc69-road";c.className="panel pad lc69-road";
    c.innerHTML='<header><span class="lc69-face">'+face(["calm","neutral"],48)+'</span><div><p class="lc69-tag">Road to a Lanckriet Student</p><h2>Today’s ritual</h2><p class="small muted">Discipline rank: <b>'+esc(rk[1])+'</b>'+(master?' · <b>2000+ Master</b>':'')+' · ritual streak '+(+R.streak||0)+(nx?' · '+(nx[0]-best)+' more days to '+esc(nx[1]):'')+'</p></div></header>'
      +'<ol class="lc69-steps">'+step(puz,"1. The pre-game MSPC puzzle","Before your first game: one fresh position, four questions.",'<a class="btn btn-primary btn-sm" href="#ranked">Start</a>')
      +step(slowToday.length>0,"2. Play one Rapid game","10 minutes or more. Run MSPC on every move. No blitz.",'<a class="btn btn-ghost btn-sm" href="#bot">Play here</a>')
      +step(trims>0,"3. Trim the game","Find the move that cost you points and turn it into a Working Point.",'<a class="btn btn-ghost btn-sm" href="#trim">Trim</a>')+'</ol>'
      +(fresh?'<p class="lc69-fresh">♟ A new game is in your library since your last Trim. <a href="#trim">Trim it now</a>.</p>':"");
    const ref=v.firstElementChild;if(ref)v.insertBefore(c,ref.nextSibling&&ref.classList&&ref.classList.contains("lc56-instant-wrap")?ref.nextSibling:ref);else v.appendChild(c);
  }

  /* ============ 5. Books Vault ============ */
  const BOOKS=[
    {id:"kotov",title:"Think Like a Grandmaster",author:"Alexander Kotov",year:1971,
     what:"Kotov describes how strong players decide: list the candidate moves first, then calculate each one once, in a tree, without jumping back and forth. He also shows how a player assesses a position before calculating, and why time trouble comes from undisciplined thinking.",
     good:"A fixed thinking order. That is the heart of MSPC: the same questions, in the same order, every move.",
     lazy:"Read only as a calculation manual, it can turn into “calculate everything”. Below 2000 most mistakes are not long lines but a threat that was missed after the opponent’s move.",
     ours:"MSPC puts Kotov’s discipline in an order that fits club games: Move (their threat) and Specifics (the plan) come before the tree. Then Priorities give you the candidate list, and Calculation checks it once.",
     link:"#think",linkText:"Train it: the MSPC trainer"},
    {id:"woodpecker",title:"The Woodpecker Method",author:"Axel Smith and Hans Tikkanen",year:2018,
     what:"A large set of tactical puzzles solved in cycles: the whole set again and again, each cycle faster, until the patterns are automatic.",
     good:"Repetition works. Patterns you have seen many times are found in a second.",
     lazy:"Solving fast on autopilot: you look for the first forcing move because a puzzle always has one. In a real game nobody tells you that there is a tactic, so the habit of checking first matters more than speed.",
     ours:"We repeat too, but with the process switched on: the pre-game MSPC puzzle, the Shuffle Trainer and your own mistakes in My mistakes. You answer Move and Priorities before you are allowed to move.",
     link:"#shuffle",linkText:"Train it: the Shuffle Trainer"},
    {id:"silman",title:"How to Reassess Your Chess",author:"Jeremy Silman",year:1993,
     what:"Silman teaches players to read a position through its imbalances (minor pieces, pawn structure, space, material, development, files and squares) and to make a plan from them.",
     good:"Plans come from features of the position, not from hope.",
     lazy:"A list of imbalances can turn into a checklist you recite without ever choosing a plan.",
     ours:"That is the S in MSPC: notice the structure and features, then name ONE plan. The middlegame course trains it on real structures.",
     link:"#middlegame",linkText:"Train it: Middlegame"},
    {id:"dvoretsky",title:"Dvoretsky’s Endgame Manual",author:"Mark Dvoretsky",year:2003,
     what:"A complete reference of the endgame positions a strong player must know, with the key positions highlighted.",
     good:"Precise technique, organised by theme.",
     lazy:"Reading it cover to cover too early spends hours on positions you will rarely meet. The basic endings, played until they are automatic, give more points first.",
     ours:"The endgame course gives the right theory at the right level: the positions a player at your rating meets, learned and then drilled.",
     link:"#endgame",linkText:"Train it: Endgame"}];
  function mountBooks(view){
    view.innerHTML='<section class="lc69-books"><header class="lc69-bh"><span class="lc69-face">'+face(["serious","calm"],52)+'</span><div><p class="lc69-tag">Books Vault</p><h1>The classics, used the right way</h1><p class="muted">Reading a great book is not the same as getting better from it. For each classic: what it teaches, where players usually get stuck with it, and how to turn it into a habit you use at the board.</p></div></header>'
      +BOOKS.map(b=>'<article class="panel pad lc69-book" id="book-'+b.id+'"><h2>'+esc(b.title)+'</h2><p class="small muted">'+esc(b.author)+' · '+b.year+'</p><p><b>What it teaches.</b> '+esc(b.what)+'</p><p><b>What it gets right.</b> '+esc(b.good)+'</p><p class="lc69-lazy"><b>Where players get stuck.</b> '+esc(b.lazy)+'</p><div class="lc69-take"><span class="lc69-face sm">'+face(["calm","neutral"],30)+'</span><p><b>Kyenzo’s take.</b> '+esc(b.ours)+'</p></div><a class="btn btn-ghost btn-sm" href="'+b.link+'">'+esc(b.linkText)+'</a></article>').join("")
      +'<p class="small muted">Summaries in our own words, to help you decide what to read and how to use it. Buy the books from the publishers if you want the full text.</p></section>';
    return null;
  }

  /* ============ wiring ============ */
  function ownerRow(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc69-admin]",m))return;
    const ref=Q("[data-lc59-admin]",m)||Q("[data-lc65-admin]",m);if(!ref)return;
    const b=document.createElement("button");b.type="button";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc69-admin","");
    b.innerHTML="<span><b>Landing page texts</b><small>Hero title, mission, your story and the intro video</small></span>";
    ref.insertAdjacentElement("beforebegin",b);
  }
  function onDoc(e){
    const t=e.target;if(!t||!t.closest)return;
    if(t.closest("[data-lc69-admin]")){e.preventDefault();e.stopPropagation();try{const m=Q("#lc49-menu");if(m)m.remove()}catch(x){}landingSheet();return}
    if(t.closest('[data-lc69="bx"]')){e.preventDefault();const b=Q("#lc69-bubble");if(b)b.remove()}
  }
  function css(){
    if(Q("#lc69-css"))return;const s=document.createElement("style");s.id="lc69-css";
    s.textContent=".lc69-face{flex:0 0 auto;width:48px;height:48px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#0f172a;border:1px solid #38bdf8;color:#38bdf8;font-size:22px}.lc69-face.sm{width:30px;height:30px;font-size:15px}.lc69-face img{width:100%;height:100%;object-fit:cover}"
      +".lc69-bubble{position:fixed;left:10px;right:10px;bottom:76px;z-index:90;max-width:460px;display:flex;gap:10px;align-items:flex-start;padding:12px 44px 12px 12px;border-radius:16px;background:#1e293b;border:1px solid #38bdf8;box-shadow:0 12px 36px rgba(0,0,0,.5);transition:opacity .35s}.lc69-bubble.out{opacity:0}.lc69-bubble p{margin:0;font-size:14.5px;line-height:1.4}.lc69-bubble p b{display:block;color:#38bdf8;font-size:12px;letter-spacing:.04em;text-transform:uppercase}.lc69-x{position:absolute;top:2px;right:2px;width:44px;height:44px;background:none;border:0;color:#94a3b8;font-size:22px;cursor:pointer}"
      +".lc69-tag{margin:0 0 2px;color:#fbbf24;font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}"
      +".lc69-blitz{display:flex;gap:12px;align-items:flex-start;margin:0 0 12px;border:1px solid #fb7185}.lc69-blitz p{margin:0 0 6px}.lc69-blitz .btn{min-height:44px}"
      +".lc69-road{margin:0 0 12px;border:1px solid rgba(251,191,36,.45)}.lc69-road header{display:flex;gap:12px;align-items:center}.lc69-road h2{margin:0;font-size:20px}.lc69-steps{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:8px}.lc69-steps li{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:10px;border-radius:12px;background:#0f172a;border:1px solid #334155}.lc69-steps li.ok{border-color:#4ade80}.lc69-steps small{display:block;color:#94a3b8}.lc69-steps .btn{min-height:44px}.lc69-ck{width:26px;height:26px;border-radius:50%;border:2px solid #334155;display:grid;place-items:center;color:#4ade80;font-weight:900}.lc69-steps li.ok .lc69-ck{border-color:#4ade80}.lc69-fresh{margin:10px 0 0;font-size:14px}"
      +".lc69-books{max-width:820px;margin:0 auto}.lc69-bh{display:flex;gap:12px;align-items:flex-start;margin-bottom:14px}.lc69-bh h1{margin:0 0 4px;font-size:clamp(22px,5vw,30px)}.lc69-book{margin-bottom:12px}.lc69-book h2{margin:0;font-size:19px}.lc69-book p{margin:6px 0}.lc69-lazy{color:#fda4af}.lc69-take{display:flex;gap:10px;align-items:flex-start;padding:10px;border-radius:12px;background:#0f172a;border:1px solid #334155;margin:8px 0}.lc69-take p{margin:0}.lc69-book .btn{min-height:44px}"
      +".lc69-f{display:grid;gap:4px;margin:0 0 10px;font-size:14px}";
    document.head.appendChild(s);
  }
  let deb=0;
  function scan(){const r=route();watchFeedback();if(r==="trim")blitzCard("trim");if(r==="quests"){road();blitzCard("quests")}ownerRow()}
  function afterRender(){clearTimeout(deb);deb=setTimeout(()=>{try{scan()}catch(e){}},300)}
  function init(){
    css();
    try{if(typeof MOUNT!=="undefined"&&!MOUNT.books)MOUNT.books=mountBooks}catch(e){}
    document.addEventListener("click",onDoc,true);
    new MutationObserver(()=>{clearTimeout(deb);deb=setTimeout(()=>{try{scan()}catch(e){}},250)}).observe(document.body,{childList:true,subtree:true});
  }
  return{init:init,afterRender:afterRender,bubble:bubble,speed:speed,blitzState:blitzState,BOOKS:BOOKS,mountBooks:mountBooks,landingSheet:landingSheet,LINES:LINES,version:"9.34.0"};
})(); /*@@end lc69*/
