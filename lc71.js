/*@@module lc71*/
const LC71=(()=>{
  "use strict";
  /* LC71 (build 9.36.0): launch polish.
     1. Day 0: review / satisfaction pop-ups (DayFunnel) wait until 24 hours after the first visit (dayOne()).
     2. Trim: the Game Library bar folds away, a game picked in it (or "Analyze whole game" on the first-win card) scrolls
        straight to the board, Coach Lanckriet has ONE place (the coach panel: Key moments with Previous / Next, the
        explanation card, the chat), the duplicate "Ask the coach about this game" button under the report is hidden.
        "What should have warned you here?" is a dropdown with the approved answers of other players (SQL lc71_warn_list)
        and a "Send one for approval myself" button.
     3. Quests: "Become a Lanckriet Chess Student" (the Road card) has a clear limit of 1,500 XP: then it says Completed,
        gives the badge and stays a single line.
     4. Mission: the Refer a Friend page opens with the mission, and a quiet one-line reminder shows at most once a day
        on a few calm pages (never on a board, never during the first-time road).
     5. Leaderboards: Kyenzo is pinned on top, the member is shown right under him with their REAL rank (lbRows).
     6. Library: a Featured Spotlight for "The 2000+ Blueprint", course lessons in folders, and openings as PGN that
        import straight into My repertoire of the opening trainer. */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const route=()=>{let h="";try{h=decodeURIComponent(String(location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){h=""}return h.split(/[?&\/]/)[0]};
  const ic=n=>{try{return icon(n)}catch(e){return""}};
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const DAY=864e5,ROAD_CAP=1500;
  const xpTotal=()=>{try{return +(V6.state().total)||0}catch(e){try{return +((Store.get("lc6-state-v1",{})||{}).total)||0}catch(x){return 0}}};
  const roadOwns=()=>{try{return typeof LC42!=="undefined"&&LC42.owns()}catch(e){return false}};

  /* ---------- 1. Day 0 ---------- */
  function day0(){
    let d=+rd("lc71-day0",0)||0;
    if(!d){
      const o=rd("lc42-onb",{})||{};
      d=o.at?+o.at:(xpTotal()>300?1:Date.now()); /* an existing member counts as "day 1 or later" */
      wr("lc71-day0",d);
    }
    return d;
  }
  const dayOne=()=>Date.now()-day0()>=DAY;

  /* ---------- 2. Trim ---------- */
  let wantBoard=0;
  const scrollBoard=()=>{wantBoard=Date.now()};
  function tryScroll(){
    if(!wantBoard)return;
    if(Date.now()-wantBoard>20000){wantBoard=0;return}
    if(route()!=="trim")return;
    const b=Q("#view .board-shell"),mv=Q("#an-moves");
    if(!b||!mv||mv.children.length<2)return;
    wantBoard=0;
    const bar=Q(".topbar,header.app-head,#topbar");const off=bar?Math.min(140,bar.getBoundingClientRect().height+8):72;
    try{scrollTo({top:Math.max(0,b.getBoundingClientRect().top+scrollY-off),behavior:"smooth"})}catch(e){}
  }
  function setLib(lib,col){
    lib.classList.toggle("lc71-col",!!col);
    const t=Q(".lc71-libtog",lib);if(t){t.setAttribute("aria-expanded",String(!col));const s=Q(".lc71-tg",t);if(s)s.textContent=col?"Show":"Hide"}
  }
  function libEnhance(){
    const lib=Q("#view #lc39-lib");if(!lib||Q(".lc71-libtog",lib))return;
    const b=document.createElement("button");b.type="button";b.className="lc71-libtog";b.setAttribute("data-lc71-lib","");
    b.innerHTML='<span>'+ic("book")+' Your Game Library</span><span class="lc71-tg">Hide</span>';
    lib.insertBefore(b,lib.firstChild);
    const pref=rd("lc71-libcol",null),mv=Q("#an-moves"),loaded=!!(mv&&mv.children.length>1);
    setLib(lib,pref===null?loaded:!!pref);
  }
  function kmBlock(v){
    const h=QA("#an-report h3",v).filter(x=>/^\s*Key moments\s*$/i.test(x.textContent))[0];
    return h?h.parentNode:Q("#lc71-km",v);
  }
  let kmIdx=0;
  function kmPaint(km){
    const items=QA("ol.moments > li",km);
    let nav=Q(".lc71-kmnav",km);
    if(!items.length){if(nav)nav.remove();return}
    if(kmIdx>=items.length)kmIdx=0;
    items.forEach((li,i)=>li.classList.toggle("lc71-cur",i===kmIdx));
    const html='<button type="button" class="btn btn-ghost btn-sm" data-lc71-km="-1" aria-label="Previous key moment">‹ Previous</button><span class="small">'+(kmIdx+1)+" of "+items.length+'</span><button type="button" class="btn btn-ghost btn-sm" data-lc71-km="1" aria-label="Next key moment">Next ›</button>';
    if(!nav){nav=document.createElement("div");nav.className="lc71-kmnav";const h=Q("h3",km);if(h)h.insertAdjacentElement("afterend",nav);else km.insertBefore(nav,km.firstChild)}
    if(nav.__h!==html){nav.__h=html;nav.innerHTML=html}
  }
  function kmGo(d){
    const km=Q("#lc71-km");if(!km)return;
    const items=QA("ol.moments > li",km);if(!items.length)return;
    kmIdx=(kmIdx+d+items.length)%items.length;
    const b=Q('[data-act="goto"],button',items[kmIdx]);if(b)b.click();
    kmPaint(km);
  }
  function trimLayout(){
    const v=Q("#view");if(!v||route()!=="trim")return;
    const aside=Q("#coach",v),main=Q(".an-main",v),grid=Q(".an-grid",v);if(!aside||!main)return;
    let box=Q("#lc71-coachbox",v);
    if(!box){box=document.createElement("div");box.id="lc71-coachbox";box.className="lc71-coachbox"}
    if(box.parentNode!==aside||aside.firstChild!==box)aside.insertBefore(box,aside.firstChild);
    const km=kmBlock(v);
    if(km){if(!km.id)km.id="lc71-km";km.classList.add("lc71-km");if(km.parentNode!==box||box.firstChild!==km)box.insertBefore(km,box.firstChild);kmPaint(km)}
    const card=Q("#lc66-coach",v);if(card&&card.parentNode!==box)box.appendChild(card);
    const tone=Q(".lc79-tone-bar",main);if(tone){const ref=box.nextSibling;if(tone.parentNode!==aside)aside.insertBefore(tone,ref)}
    QA("#an-report button,#an-report a",v).forEach(b=>{if(/^\s*Ask the coach about this game\s*$/i.test(b.textContent))b.classList.add("lc71-hide")});
    /* phones: the coach panel sits right under the moves, so the whole page reads top to bottom */
    const mob=window.innerWidth<960;
    if(mob){const mp=Q("#an-moves",v),panel=mp&&mp.closest(".panel");if(panel&&panel.parentNode===main&&panel.nextSibling!==aside)panel.insertAdjacentElement("afterend",aside)}
    else if(grid&&aside.parentNode!==grid)grid.insertBefore(aside,main.nextSibling);
  }

  /* "What should have warned you here?": answers of other players */
  async function loadCrowd(d){
    const list=Q("[data-lc71-list]",d);if(!list||d.__lc71)return;d.__lc71=1;
    let r=null;
    try{r=await LC30.authed("lc71_warn_list",{p_fen:d.getAttribute("data-fen")||"",p_alarm:d.getAttribute("data-alarm")||"",p_letter:d.getAttribute("data-letter")||""})}catch(e){r=null}
    const rows=r&&r.ok&&Array.isArray(r.rows)?r.rows:null;
    if(!rows){list.innerHTML='<p class="small muted">Answers from other players appear here once you are signed in.</p>';d.__lc71=0;return}
    list.innerHTML=rows.length?'<ul class="lc71-crowd">'+rows.map(x=>'<li><p>“'+E(x.text)+'”</p><small class="muted">'+E(x.name||"A player")+(+x.match===1?" · this exact position":+x.match===2?" · same alarm signal":" · same MSPC step")+"</small></li>").join("")+"</ul>"
      :'<p class="small muted">No approved answers for this position yet. Be the first.</p>';
  }

  /* ---------- 3. the Road to a Lanckriet Student: a clear limit ---------- */
  function road(){
    if(route()!=="quests")return;
    const tag=QA("#view .lc69-tag").filter(x=>/Lanckriet Student/.test(x.textContent))[0];if(!tag)return;
    const card=tag.closest("section")||tag.parentNode&&tag.parentNode.parentNode;if(!card||card.id==="view")return;
    let st=rd("lc71-road",null);const tot=xpTotal();
    if(!st||typeof st!=="object"){st={base:tot,at:Date.now()};wr("lc71-road",st)}
    const gain=Math.max(0,tot-(+st.base||0));
    if(!st.done&&gain>=ROAD_CAP){
      st=Object.assign({},st,{done:Date.now()});wr("lc71-road",st);
      const b=rd("lc71-badges",{})||{};b.student_road=Date.now();wr("lc71-badges",b);
      say("Quest completed: Become a Lanckriet Chess Student. The badge is yours.","good");
    }
    if(st.done){
      card.classList.add("lc71-hide");
      if(!Q("#lc71-road-done")){const n=document.createElement("section");n.id="lc71-road-done";n.className="panel pad lc71-roaddone";
        n.innerHTML='<span class="lc71-badge" aria-hidden="true">🎓</span><div><p class="lc69-tag">Become a Lanckriet Chess Student</p><b>Completed</b><p class="small muted">You trained '+ROAD_CAP.toLocaleString("en")+' XP on the road and earned the Lanckriet Student Road badge. Keep the daily ritual: it is what keeps the habit.</p></div>';
        card.insertAdjacentElement("afterend",n)}
      return;
    }
    let bar=Q(".lc71-roadbar",card);
    const pct=Math.min(100,Math.round(gain/ROAD_CAP*100)),html='<div class="lc19-bar"><i style="width:'+pct+'%"></i></div><p class="small muted">Quest progress: <b>'+Math.min(gain,ROAD_CAP).toLocaleString("en")+" / "+ROAD_CAP.toLocaleString("en")+" XP</b>. At "+ROAD_CAP.toLocaleString("en")+" XP this quest is completed and the badge is yours.</p>";
    if(!bar){bar=document.createElement("div");bar.className="lc71-roadbar";card.appendChild(bar)}
    if(bar.__h!==html){bar.__h=html;bar.innerHTML=html}
  }

  /* ---------- 4. the mission ---------- */
  const MISSION="My mission is to help 20,000 people by the end of 2027. Help me save your friends by sharing this app or visiting Refer a Friend.";
  const CALM=new Set(["quests","system","account","books","insights","leaderboard","profile","trophies","guest-library"]);
  const today=()=>new Date().toISOString().slice(0,10);
  function mission(){
    const r=route(),v=Q("#view");if(!v)return;
    if(r==="refer"){
      if(!Q(".lc71-mhero",v)){const s=document.createElement("section");s.className="panel pad lc71-mhero";
        s.innerHTML='<h2>My mission is to help 20,000 people. Help me by referring your friends.</h2><p class="muted">Most players stay stuck because nobody shows them a fixed way of thinking. Send this app to one friend who keeps losing the same way: that is how we get to 20,000 by the end of 2027.</p>';
        v.insertBefore(s,v.firstChild)}
      return;
    }
    const on=Q(".lc71-mission",v);
    if(on)return;
    if(!CALM.has(r)||roadOwns()||Q(".trainer,.board-host",v))return;
    const seen=rd("lc71-mission",{})||{};
    if(seen.off&&Date.now()-seen.off<14*DAY)return;
    if(seen.day===today()&&seen.r!==r)return; /* once a day, on one page */
    wr("lc71-mission",Object.assign({},seen,{day:today(),r:r}));
    const a=document.createElement("aside");a.className="lc71-mission";a.setAttribute("role","note");
    a.innerHTML='<span aria-hidden="true">🎯</span><p>'+E(MISSION)+'</p><a class="btn btn-ghost btn-sm" href="#refer">Refer a Friend</a><button type="button" class="lc71-x" data-lc71-mx aria-label="Hide this for two weeks">×</button>';
    v.appendChild(a);
  }

  /* ---------- 5. leaderboards: Kyenzo on top, you right under him ---------- */
  const isCoachName=n=>/^\s*(kyenzo|lanckriet\s*chess|lanckrietchess|coach\s+lanckriet)\b/i.test(String(n||""));
  function lbRows(rows,kind,you,total){
    try{
      rows=(rows||[]).filter(r=>!isCoachName(r.name));
      const coach={rank:"👑",name:"Kyenzo · Coach",label:"2105 peak",sub:"Founder of Lanckriet Chess",you:false,coach:true};
      let me=rows.filter(r=>r.you)[0];
      if(me)rows=rows.filter(r=>r!==me);
      else if(you&&you.rank)me={rank:+you.rank,name:(App.profile&&App.profile.name)||"You",label:"#"+you.rank+(total?" of "+total:""),sub:"",you:true};
      return [coach].concat(me?[me]:[],rows);
    }catch(e){return rows||[]}
  }

  /* ---------- 6. library ---------- */
  const SPOT=/2000\s*\+?\s*blueprint/i;
  function spot(items,d,cardHTML,adm){
    try{
      const it=(items||[]).filter(x=>SPOT.test(x.title||""))[0]||(items||[]).filter(x=>x.pinned&&x.kind==="book")[0];
      if(it)return{id:it.id,html:'<section class="lc71-spot" aria-label="Featured book"><p class="lc71-spot-tag">'+ic("crown")+' Featured · Kyenzo’s own book</p>'+cardHTML(it,d)+"</section>"};
      if(adm)return{id:"",html:'<section class="lc71-spot is-empty"><p class="lc71-spot-tag">'+ic("crown")+' Featured spotlight</p><h3>The 2000+ Blueprint</h3><p class="small muted">Owner: add your book with “2000+ Blueprint” in the title (or pin a book) and it takes this spotlight. Members do not see this box.</p><div class="btn-row"><button type="button" class="btn btn-primary btn-sm" data-lc70="new">'+ic("plus")+" Add The 2000+ Blueprint</button></div></section>"};
    }catch(e){}
    return{id:"",html:""};
  }
  /* the lessons box in the editor: "## Folder", "Title | YouTube link", "PGN: Name | 1.e4 c6 …" (PGN black: … for a Black repertoire) */
  function vidsText(list){
    let f="";const out=[];
    (list||[]).forEach(v=>{
      const fo=String(v.folder||"");if(fo!==f){f=fo;if(fo)out.push("## "+fo)}
      if(v.pgn)out.push("PGN"+(v.side==="b"?" black":v.side==="w"?" white":"")+": "+v.title+" | "+String(v.pgn).replace(/\s+/g," "));
      else if(v.text)out.push("Text: "+v.title+" | "+String(v.text).replace(/\n+/g," // "));   /* 9.38.0: text lessons, // = new paragraph */
      else out.push(v.title+" | "+v.url);
    });
    return out.join("\n");
  }
  function vidsParse(text){
    let folder="";const out=[];
    String(text||"").split("\n").map(l=>l.trim()).filter(Boolean).forEach(l=>{
      let m=/^#{1,3}\s*(.+)$/.exec(l);if(m){folder=m[1].trim().slice(0,80);return}
      m=/^pgn(?:\s*\((white|black)\)|\s+(white|black))?\s*:\s*(.*)$/i.exec(l);
      if(m){const side=(m[1]||m[2]||"").toLowerCase(),rest=m[3],i=rest.indexOf("|");
        const title=i>0?rest.slice(0,i).trim():"Opening",pgn=(i>0?rest.slice(i+1):rest).trim();
        out.push({title:title||"Opening",pgn:pgn,folder:folder,side:side==="black"?"b":side==="white"?"w":""});return}
      m=/^text\s*:\s*(.*)$/i.exec(l);
      if(m){const rest=m[1],i=rest.indexOf("|");out.push({title:(i>0?rest.slice(0,i).trim():"Lesson")||"Lesson",text:(i>0?rest.slice(i+1):rest).split(/\s*\/\/\s*/).join("\n").trim(),folder:folder});return}
      const i=l.lastIndexOf("|");
      out.push(i>0?{title:l.slice(0,i).trim(),url:l.slice(i+1).trim(),folder:folder}:{title:"Lesson",url:l,folder:folder});
    });
    return out;
  }
  let items=[];
  function lessonsHTML(list,ytId){
    items=(list||[]).slice();
    let n=0,f=null,h="",open=false;
    items.forEach((v,idx)=>{
      const fo=String(v.folder||"");
      if(fo!==f){if(open)h+="</ol></details>";f=fo;open=true;
        h+='<details class="lc71-folder" open><summary>'+ic("folder")+" "+E(fo||"Lessons")+"</summary><ol class=\"lc70-lessons lc71-ol\">"}
      if(v.pgn)h+='<li><button type="button" class="lc70-lesson lc71-pgn" data-lc71-pgn="'+idx+'">'+ic("chess-board")+" "+E(v.title)+' <small>Import into my opening trainer</small></button></li>';
      else if(v.text)h+='<li><details class="lc71-txt"><summary class="lc70-lesson">'+ic("file-lines")+" "+E(v.title)+"</summary>"+String(v.text).split(/\n+/).filter(x=>x.trim()).map(x=>"<p>"+E(x)+"</p>").join("")+"</details></li>";
      else{const y=ytId(v.url);if(!y)return;h+='<li><button type="button" class="lc70-lesson'+(n===0?" is-on":"")+'" data-yt="'+E(y)+'" data-t="'+E(v.title)+'">'+(++n)+". "+E(v.title)+"</button></li>"}
    });
    if(open)h+="</ol></details>";
    return h;
  }
  const hasPgn=list=>(list||[]).some(v=>v&&v.pgn);
  function importPgn(v){
    try{
      const res=PGN.parse(String(v.pgn||""));
      if(!res||!res.lines||!res.lines.length){say("That PGN has no moves I can read.","bad");return false}
      if(res.startFen&&typeof START_FEN!=="undefined"&&res.startFen!==START_FEN){say("Only openings from the normal starting position can be drilled.","bad");return false}
      const side=v.side==="b"||v.side==="w"?v.side:(/\bblack\b|caro|slav|sicilian|french|scandi|pirc|modern|defen[cs]e|king'?s indian|gr[uü]nfeld|dutch|nimzo/i.test(v.title||"")?"b":"w");
      const r=Repertoire.add(String(v.title||"Opening").slice(0,40),side,res.lines,res.notes);
      const bits=[];if(r.added)bits.push(r.added+(r.added===1?" line":" lines")+" imported");if(r.dupes)bits.push(r.dupes+" already saved");if(r.limited)bits.push(r.limited+" over the free limit");
      say((bits.join(", ")||"Nothing new to import")+". Find it under My repertoire in Openings.",r.added?"good":"");
      if(r.added){try{App.ui.op=Object.assign(App.ui.op||{},{tab:"mine",screen:"list",picked:true})}catch(e){}
        try{QA(".sheet-wrap [data-close]").forEach(b=>b.click())}catch(e){}
        setTimeout(()=>{location.hash="#openings"},250)}
      return !!r.added;
    }catch(e){console.error("lc71",e);say("Could not import that opening.","bad");return false}
  }

  /* ---------- events, render hook ---------- */
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    if(t.closest("[data-lc42-full]")){scrollBoard();return}
    const lt=t.closest("[data-lc71-lib]");
    if(lt){e.preventDefault();const lib=lt.closest("#lc39-lib");if(lib){const col=!lib.classList.contains("lc71-col");setLib(lib,col);wr("lc71-libcol",col)}return}
    const inLib=t.closest("#lc39-lib button,#lc39-lib a,#lc39-lib [role=button]");
    if(inLib&&!t.closest(".lc71-libtog")&&/analy|trim|open|review|load/i.test(inLib.textContent||"")){
      scrollBoard();setTimeout(()=>{const lib=Q("#lc39-lib");if(lib)setLib(lib,true);tryScroll()},450);setTimeout(tryScroll,1200);return}
    const km=t.closest("[data-lc71-km]");if(km){e.preventDefault();kmGo(+km.getAttribute("data-lc71-km")||1);return}
    const li=t.closest("#lc71-km ol.moments > li");if(li){const all=QA("#lc71-km ol.moments > li");kmIdx=Math.max(0,all.indexOf(li));setTimeout(()=>{const k=Q("#lc71-km");if(k)kmPaint(k)},50)}
    const own=t.closest("[data-lc71-own]");if(own){e.preventDefault();const box=own.parentNode&&Q("[data-lc71-ownbox]",own.parentNode);if(box){box.hidden=false;own.hidden=true;const ta=Q("textarea",box);if(ta)ta.focus()}return}
    if(t.closest("[data-lc71-mx]")){e.preventDefault();const s=rd("lc71-mission",{})||{};wr("lc71-mission",Object.assign({},s,{off:Date.now()}));const a=t.closest(".lc71-mission");if(a)a.remove();return}
    const pg=t.closest("[data-lc71-pgn]");if(pg){e.preventDefault();const v=items[+pg.getAttribute("data-lc71-pgn")];if(v)importPgn(v);return}
  }
  function onToggle(e){const d=e.target;if(d&&d.matches&&d.matches("details[data-lc71-crowd]")&&d.open)loadCrowd(d)}
  let obs=null,deb=0;
  function run(){
    const r=route();
    try{if(r==="trim"){libEnhance();trimLayout();tryScroll()}}catch(e){console.error("lc71",e)}
    try{road()}catch(e){}
    try{mission()}catch(e){}
  }
  function afterRender(){
    try{
      day0();
      if(obs){try{obs.disconnect()}catch(e){}obs=null}
      setTimeout(run,160);
      const v=Q("#view");if(!v||typeof MutationObserver!=="function")return;
      const mine=obs=new MutationObserver(()=>{if(deb)return;deb=setTimeout(()=>{deb=0;run()},220)});
      mine.observe(v,{childList:true,subtree:true});
    }catch(e){}
  }
  function css(){
    if(Q("#lc71-css"))return;const s=document.createElement("style");s.id="lc71-css";
    s.textContent=
      ".lc71-hide{display:none!important}"
      +"#lc39-lib{position:static!important;top:auto!important}"
      +".lc71-libtog{display:flex;width:100%;justify-content:space-between;align-items:center;gap:10px;min-height:44px;background:none;border:0;color:inherit;font-weight:700;font-size:1rem;cursor:pointer;padding:0 0 6px;text-align:left}"
      +".lc71-libtog .lc71-tg{font-size:.85rem;color:#38bdf8;font-weight:600}"
      +"#lc39-lib.lc71-col{padding-top:6px;padding-bottom:6px}#lc39-lib.lc71-col>*:not(.lc71-libtog){display:none!important}"
      +".lc71-coachbox{display:grid;gap:12px;margin:0 0 12px}.lc71-coachbox #lc66-coach{margin:0}"
      +".lc71-km{border:1px solid rgba(56,189,248,.35);border-radius:12px;padding:12px;background:rgba(56,189,248,.06)}.lc71-km h3{margin:0 0 6px}"
      +".lc71-kmnav{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px}.lc71-kmnav .btn{min-height:44px}"
      +".lc71-km ol.moments{max-height:260px;overflow:auto;margin:0}.lc71-km li.lc71-cur{outline:2px solid #fbbf24;outline-offset:2px;border-radius:10px}"
      +".lc71-crowd{list-style:none;margin:8px 0;padding:0;display:grid;gap:8px}.lc71-crowd li{border-left:3px solid #38bdf8;padding:4px 0 4px 10px}.lc71-crowd p{margin:0 0 2px}"
      +".lc71-own{margin-top:8px}.lc71-own>.btn{min-height:44px}"
      +".lc71-roadbar{margin-top:10px}.lc71-roaddone{display:flex;gap:12px;align-items:center;margin:0 0 12px;border-color:rgba(74,222,128,.45)}.lc71-roaddone b{color:#4ade80;font-size:1.1rem}.lc71-badge{font-size:2rem;line-height:1}"
      +".lc71-mission{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:18px 0 6px;padding:10px 12px;border:1px dashed rgba(251,191,36,.45);border-radius:12px;font-size:.9rem;color:#cbd5e1}.lc71-mission p{flex:1 1 220px;margin:0}.lc71-mission .btn{min-height:44px}"
      +".lc71-x{min-width:44px;min-height:44px;background:none;border:0;color:inherit;font-size:1.3rem;cursor:pointer}"
      +".lc71-mhero{margin:0 0 14px;border-color:rgba(251,191,36,.5);background:linear-gradient(135deg,rgba(251,191,36,.1),rgba(56,189,248,.06))}.lc71-mhero h2{margin:0 0 6px;font-size:clamp(1.25rem,4vw,1.6rem);line-height:1.25}"
      +".lc71-spot{margin:0 0 18px;padding:16px;border-radius:18px;border:1px solid rgba(251,191,36,.6);background:radial-gradient(600px 220px at 85% -20%,rgba(251,191,36,.18),transparent 60%),linear-gradient(160deg,#1e293b,#0f172a);box-shadow:0 18px 50px rgba(0,0,0,.35)}"
      +".lc71-spot-tag{margin:0 0 10px;color:#fbbf24;font-weight:700;font-size:.9rem}.lc71-spot.is-empty h3{margin:0 0 6px}"
      +".lc71-spot>.lc70-card,.lc71-spot>article,.lc71-spot>div{background:transparent;border:0;box-shadow:none;max-width:none}"
      +"@media (min-width:700px){.lc71-spot>.lc70-card,.lc71-spot>article{display:grid;grid-template-columns:minmax(150px,210px) 1fr;gap:18px;align-items:start}.lc71-spot .lc70-cover{max-width:210px}}"
      +".lc71-spot h3{font-size:1.45rem}"
      +".lc71-folder{margin:8px 0;border:1px solid rgba(148,163,184,.25);border-radius:10px;padding:4px 10px}.lc71-folder summary{min-height:44px;display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:700}"
      +".lc71-pgn small{display:block;color:#38bdf8;font-size:.78rem}"
      +".lc42-prev{max-width:300px;margin:8px auto}.lc42-prev .board-host,.lc42-prev>div{max-width:300px}"
      +".lc42-claim{position:fixed;left:12px;right:72px;bottom:calc(14px + env(safe-area-inset-bottom,0px));max-width:560px;z-index:70;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 12px;border-radius:14px;background:#0f172a;border:1px solid #fbbf24;box-shadow:0 10px 30px rgba(0,0,0,.5);font-size:.92rem}.lc42-claim span{flex:1 1 200px}.lc42-claim .btn{min-height:44px}"
      +".lc67-skiprow{margin-top:8px}.lc67-skiprow .btn{min-height:44px}"
      +".lb4-list .lb4-row:first-child{border-color:rgba(251,191,36,.5)}.lc39-bd-list li.is-coach{color:#fbbf24}.lc39-bd-list li.is-you{outline:1px solid #38bdf8;border-radius:8px}";
    document.head.appendChild(s);
  }
  function init(){
    try{css();day0();document.addEventListener("click",onClick,true);document.addEventListener("toggle",onToggle,true);
      window.addEventListener("resize",()=>{clearTimeout(deb);deb=setTimeout(()=>{deb=0;run()},250)})}catch(e){console.error("lc71",e)}
  }
  return{init:init,afterRender:afterRender,day0:day0,dayOne:dayOne,scrollBoard:scrollBoard,lbRows:lbRows,spot:spot,vidsText:vidsText,vidsParse:vidsParse,
    lessonsHTML:lessonsHTML,hasPgn:hasPgn,importPgn:importPgn,MISSION:MISSION,ROAD_CAP:ROAD_CAP,_t:{trimLayout:trimLayout,libEnhance:libEnhance,road:road,mission:mission,loadCrowd:loadCrowd,kmGo:kmGo}};
})();
/*@@end lc71*/
