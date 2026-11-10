/*@@module lc68*/ const LC68=(()=>{
  "use strict";
  /* LC68 (build 9.34.0): Community 2.0 on top of the LC39 screens and the LC65 database functions.
     1. Categories (the feed: General, Wins, Questions, Games to review, Announcements) and channels (LC46) come from the database
        (sql/20261110100000_lc68_lc69_community2_landing.sql) and the owner manages them in Admin mode: add, rename, delete, reorder, owner-only.
     2. A post can carry a position or a game (FEN or PGN, or a Brilliant move shared from the Brilliant page). It shows as an interactive board with
        Start / Back / Next / End, the moves list and arrows, and "Analyze game" opens it in Trim. In comments, move numbers like 14...Nxe4 jump the board,
        and "Attach this position" adds a small board of the position the reader is looking at.
     3. Every post has an up and a down vote; the feed sorts Hot, Top or New. Posts with many down votes are hidden from others.
        Posting needs a light threshold: XP level N or an active streak (the owner sets N; checked in the app) and an account older than M hours
        (checked by the database). The owner and admin mode are never blocked.
     A board travels inside the post text as one line: [[lcboard:fen=...;ply=N;moves=e4 e5 Nf3]] (no extra column needed). */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0].toLowerCase();
  const START="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const MARK=/\[\[lcboard:([^\]]{1,3900})\]\]/;
  const MARKG=/\[\[lcboard:[^\]]{1,3900}\]\]/g;
  const isAdmin=()=>{try{return!!(Admin.active||LC49.owner())}catch(e){return false}};

  /* ---------- server calls (the member's own token) ---------- */
  async function rpc(fn,args){
    try{
      const tok=await LC26.sync.token();if(!tok)return{status:0,data:null};
      return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:{Authorization:"Bearer "+tok},body:JSON.stringify(args||{})});
    }catch(e){return{status:0,data:null}}
  }
  async function rpcAnon(fn,args){try{return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",body:JSON.stringify(args||{})})}catch(e){return{status:0,data:null}}}

  /* ---------- board markers ---------- */
  function encode(o){
    const parts=[];
    if(o.fen&&o.fen!==START)parts.push("fen="+o.fen);
    if(o.moves&&o.moves.length)parts.push("moves="+o.moves.join(" "));
    if(o.ply)parts.push("ply="+(+o.ply|0));
    if(o.title)parts.push("t="+String(o.title).replace(/[\[\];=]/g," ").slice(0,60));
    return"[[lcboard:"+parts.join(";")+"]]";
  }
  function decode(s){
    const o={fen:START,moves:[],ply:0,title:""};
    String(s||"").split(";").forEach(p=>{const i=p.indexOf("=");if(i<1)return;const k=p.slice(0,i).trim(),v=p.slice(i+1).trim();
      if(k==="fen")o.fen=v;else if(k==="moves")o.moves=v.split(/\s+/).filter(Boolean).slice(0,400);else if(k==="ply")o.ply=Math.max(0,+v||0);else if(k==="t")o.title=v});
    return o;
  }
  /* FEN or PGN typed by a member -> {fen,moves} checked with chess.js, or null */
  function parseInput(txt){
    txt=String(txt||"").trim();if(!txt)return null;
    try{
      const one=txt.replace(/\s+/g," ");
      if(/^[rnbqkpRNBQKP1-8\/]+ [wb] /.test(one)||/^[rnbqkpRNBQKP1-8]+(\/[rnbqkpRNBQKP1-8]+){7}$/.test(one)){
        const f=/ [wb] /.test(one)?one:one+" w - - 0 1";const g=new Chess();if(!g.load(f))return null;return{fen:g.fen(),moves:[]};
      }
      const g=new Chess();
      if(!g.load_pgn(txt,{sloppy:true})){
        const g2=new Chess();const toks=txt.replace(/\{[^}]*\}/g," ").replace(/\([^)]*\)/g," ").replace(/\d+\.(\.\.)?/g," ").split(/\s+/).filter(t=>t&&!/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
        const mv=[];for(const t of toks){const m=g2.move(t,{sloppy:true});if(!m)return null;mv.push(m.san)}
        return mv.length?{fen:START,moves:mv}:null;
      }
      const h=g.header()||{},start=h.FEN&&String(h.SetUp||"1")!=="0"?h.FEN:START;
      const moves=g.history();if(!moves.length)return{fen:start,moves:[]};
      return{fen:start,moves:moves.slice(0,400)};
    }catch(e){return null}
  }
  /* positions of a board: fens[0]=start, fens[i]=after move i */
  function line(o){
    const g=new Chess();if(!g.load(o.fen||START))return null;
    const fens=[g.fen()],sans=[],mv=[];
    for(const s of o.moves){const m=g.move(s,{sloppy:true});if(!m)break;sans.push(m.san);mv.push({from:m.from,to:m.to});fens.push(g.fen())}
    return{fens:fens,sans:sans,mv:mv,start:o.fen||START};
  }
  const views=[];
  function viewer(host,o,small){
    const L=line(o);if(!L){host.innerHTML='<p class="small muted">This board could not be read.</p>';return null}
    const startNo=(()=>{const p=L.start.split(" ");return{n:+p[5]||1,w:p[1]!=="b"}})();
    const label=i=>{const ply=i+(startNo.w?0:1),n=startNo.n+Math.floor(ply/2);return(ply%2===0?n+".":n+"...")+L.sans[i]};
    host.innerHTML='<div class="lc68-bv'+(small?" sm":"")+'">'+(o.title&&!small?'<p class="lc68-bt">'+esc(o.title)+'</p>':'')+'<div class="lc68-b" data-lc68-b></div>'
      +(L.sans.length&&!small?'<div class="lc68-nav"><button type="button" class="btn btn-ghost btn-sm" data-nv="0" aria-label="Start">⏮</button><button type="button" class="btn btn-ghost btn-sm" data-nv="-1" aria-label="Back">◀</button><button type="button" class="btn btn-ghost btn-sm" data-nv="1" aria-label="Next">▶</button><button type="button" class="btn btn-ghost btn-sm" data-nv="9999" aria-label="End">⏭</button><button type="button" class="btn btn-ghost btn-sm" data-nv="flip" aria-label="Flip the board">⇅</button></div><div class="lc68-ml">'+L.sans.map((s,i)=>'<button type="button" data-ply="'+(i+1)+'">'+esc(label(i))+'</button>').join("")+'</div>':"")
      +(!small?'<div class="btn-row"><button type="button" class="btn btn-primary btn-sm" data-lc68="analyze">Analyze game</button></div>':"")+'</div>';
    const fen0=L.fens[0],side=fen0.split(" ")[1]==="b"&&!L.sans.length?"black":"white";
    const board=Board(Q("[data-lc68-b]",host),{fen:fen0,orientation:side,coords:!small});
    let cur=0;
    const go=i=>{
      cur=Math.max(0,Math.min(L.fens.length-1,i));
      try{board.setPosition(L.fens[cur],{lastMove:cur?L.mv[cur-1]:null});board.setArrows(cur?[{from:L.mv[cur-1].from,to:L.mv[cur-1].to,kind:"plan"}]:[])}catch(e){}
      QA(".lc68-ml button",host).forEach(b=>b.classList.toggle("on",+b.getAttribute("data-ply")===cur));
    };
    host.addEventListener("click",e=>{
      const b=e.target.closest("button");if(!b||!host.contains(b))return;
      if(b.hasAttribute("data-nv")){e.preventDefault();const v=b.getAttribute("data-nv");if(v==="flip"){try{board.flip()}catch(x){}return}go(v==="0"?0:v==="9999"?L.fens.length-1:cur+(+v))}
      else if(b.hasAttribute("data-ply")){e.preventDefault();go(+b.getAttribute("data-ply"))}
      else if(b.getAttribute("data-lc68")==="analyze"){e.preventDefault();analyze(L)}
    });
    go(Math.min(o.ply||0,L.fens.length-1));
    const v={board:board,host:host,go:go,fen:()=>L.fens[cur],L:L,find(tok){const t=String(tok).replace(/[+#!?]+$/,"");for(let i=0;i<L.sans.length;i++){if(label(i).replace(/[+#!?]+$/,"")===t)return i+1}return -1}};
    views.push(v);return v;
  }
  function cleanViews(){for(let i=views.length-1;i>=0;i--){if(!views[i].host.isConnected){try{views[i].board.destroy()}catch(e){}views.splice(i,1)}}}
  /* Analyze game: the moves go into Trim as a PGN (a position without moves becomes a one-move game, like the photo scan) */
  function analyze(L){
    try{
      const g=new Chess(L.start);
      if(L.start!==START){g.header("SetUp","1","FEN",L.start)}
      g.header("Event","Shared in the community");
      L.sans.forEach(s=>g.move(s,{sloppy:true}));
      if(!L.sans.length){const f=g.moves()[0];if(f)g.move(f)}
      wr("lc68-trim",{pgn:g.pgn()+" *",at:Date.now()});
      location.hash="#trim";
    }catch(e){say("This game could not be opened in Trim.","bad")}
  }
  function trimLoad(){
    const j=rd("lc68-trim",null);if(!j||!j.pgn||Date.now()-j.at>60000||route()!=="trim")return;
    const ta=Q("#an-pgn"),load=Q('#an-import [data-act="load"]');if(!ta||!load)return;
    wr("lc68-trim",null);ta.value=j.pgn;load.click();
  }

  /* ---------- categories and channels from the database ---------- */
  let cats=null,cfg={min_level:2,min_hours:1,hide_at:-5};
  async function loadCats(){
    const r=await rpcAnon("lc68_cats",{});
    if(r.status===200&&r.data&&r.data.ok){
      cats=r.data.cats||[];if(r.data.cfg)cfg=Object.assign(cfg,r.data.cfg);
      try{
        const C=window.LC68CATS,N=window.LC68CATN;
        if(C&&Array.isArray(C)&&cats.length){C.splice(1,C.length-1);cats.forEach(c=>C.push([c.slug,c.name]));if(N){Object.keys(N).forEach(k=>delete N[k]);cats.forEach(c=>{N[c.slug]=c.name})}}
      }catch(e){}
    }
    return cats;
  }

  /* ---------- votes and sorting ---------- */
  const feedData={};
  const sortNow=()=>{const s=rd("lc68-sort","hot");return/^(hot|top|new)$/.test(s)?s:"hot"};
  function wrapQuota(){
    try{
      if(Quota.__lc68)return;Quota.__lc68=true;const prev=Quota.call;
      Quota.call=async function(action,body){
        if(action==="c39_feed")body=Object.assign({},body||{},{sort:sortNow()});
        if((action==="c39_post"||action==="c46_post")&&!canPost()){return{ok:false,status:200,reason:"lc68_threshold"}}
        const r=await prev.apply(this,[action,body]);
        try{if(action==="c39_feed"&&r&&r.ok&&Array.isArray(r.posts))r.posts.forEach(p=>{feedData[p.id]=p});if(action==="c39_post_get"&&r&&r.ok&&r.post)feedData[r.post.id]=Object.assign(feedData[r.post.id]||{},r.post)}catch(e){}
        if(r&&r.reason==="too_new")r.reason="lc68_new";
        return r;
      };
    }catch(e){}
  }
  function level(){try{return+getUserLevel()||1}catch(e){return 1}}
  function streak(){try{return+App.streakDays()||0}catch(e){return 0}}
  function canPost(){if(isAdmin())return true;return level()>=(+cfg.min_level||1)||streak()>=1}
  const gateText=()=>"Posting opens at level "+(+cfg.min_level||1)+" or with an active training streak. You are level "+level()+". Train one session today and come back: this keeps the community free of spam.";
  async function vote(id,v,btn){
    const r=await rpc("lc68_vote",{p_post:id,p_v:v});
    const d=r.data;
    if(!(r.status===200&&d&&d.ok)){say(d&&d.error==="own"?"You cannot vote on your own post.":r.status===404?"Votes are not switched on yet.":"Could not save your vote.","bad");return}
    feedData[id]=Object.assign(feedData[id]||{},{score:d.score,myvote:d.myvote,likes:d.likes,liked:d.myvote===1});
    paintVotes();
  }
  function paintVotes(){
    QA(".lc39-post").forEach(card=>{
      const like=Q(".lc39-like[data-like]:not([data-k='c'])",card);if(!like)return;
      const id=+like.getAttribute("data-like"),p=feedData[id];if(!p||p.score===undefined)return;
      let box=Q(".lc68-vote",card);
      if(!box){box=document.createElement("span");box.className="lc68-vote";like.insertAdjacentElement("beforebegin",box);like.classList.add("lc68-hide")}
      box.innerHTML='<button type="button" class="lc68-up'+(p.myvote===1?" on":"")+'" data-lc68-v="1" data-id="'+id+'" aria-pressed="'+(p.myvote===1)+'" aria-label="Up vote">▲</button><b>'+(+p.score||0)+'</b><button type="button" class="lc68-dn'+(p.myvote===-1?" on":"")+'" data-lc68-v="-1" data-id="'+id+'" aria-pressed="'+(p.myvote===-1)+'" aria-label="Down vote">▼</button>';
    });
  }
  function sortBar(view){
    const pills=Q(".lc39-pills",view);if(!pills||Q(".lc68-sort",view))return;
    const b=document.createElement("div");b.className="lc68-sort";b.setAttribute("role","group");b.setAttribute("aria-label","Sort posts");
    const s=sortNow();
    b.innerHTML=[["hot","🔥 Hot"],["top","⬆ Top"],["new","🕑 New"]].map(x=>'<button type="button" data-lc68-sort="'+x[0]+'" aria-pressed="'+(x[0]===s)+'">'+x[1]+'</button>').join("");
    pills.insertAdjacentElement("afterend",b);
  }

  /* ---------- composer: attach a board, the threshold ---------- */
  function composer(view){
    const f=Q("[data-c-form]",view);
    if(f&&!Q(".lc68-att",f)){
      const ta=Q("[data-c-text]",f),w=document.createElement("div");w.className="lc68-att";
      w.innerHTML='<details><summary>♟ Attach a position or game (FEN or PGN)</summary><textarea class="input" rows="3" maxlength="3800" data-lc68-att placeholder="Paste a FEN or a PGN. Readers get an interactive board."></textarea><p class="small muted" data-lc68-attmsg></p></details>';
      if(ta)ta.insertAdjacentElement("afterend",w);
      const draft=rd("lc68-draft",null);
      if(draft&&draft.board&&Date.now()-draft.at<10*60000){
        wr("lc68-draft",null);
        const open=Q("[data-c-open]",view);if(open)open.click();
        try{Q("[data-c-title]",f).value=draft.title||"";ta.value=draft.text||"";const sel=Q("[data-c-cat-sel]",f);if(sel&&draft.cat&&Q('option[value="'+draft.cat+'"]',sel))sel.value=draft.cat}catch(e){}
        Q("details",w).open=true;Q("[data-lc68-att]",w).value=draft.board;check(w);
      }
      if(!canPost()&&!Q(".lc68-gate",f)){const p=document.createElement("p");p.className="form-msg lc68-gate";p.textContent=gateText();f.insertBefore(p,f.firstChild)}
    }
    const sel=f&&Q("[data-c-cat-sel]",f);
    if(sel&&cats&&!isAdmin())QA("option",sel).forEach(o=>{const c=cats.filter(x=>x.slug===o.value)[0];if(c&&c.admin_only)o.remove()});
    QA(".lc39-cform",view).forEach(cf=>{
      if(Q(".lc68-catt",cf))return;
      const b=document.createElement("button");b.type="button";b.className="btn btn-ghost btn-sm lc68-catt";b.setAttribute("data-lc68","attach-pos");b.textContent="♟ Attach the position on the board";
      const row=Q(".btn-row",cf);if(row)row.appendChild(b);
    });
  }
  function check(w){
    const t=Q("[data-lc68-att]",w),m=Q("[data-lc68-attmsg]",w);if(!t||!m)return null;
    if(!t.value.trim()){m.textContent="";return null}
    const o=parseInput(t.value);
    m.textContent=o?(o.moves.length?"A game with "+o.moves.length+" moves. It will show as a board.":"A position. It will show as a board."):"This is not a FEN or PGN that chess.js can read.";
    m.className="small "+(o?"muted":"is-bad");return o;
  }

  /* ---------- render boards inside posts and comments ---------- */
  function paintBoards(view){
    cleanViews();
    /* feed previews: hide the marker, show a chip */
    QA(".lc39-pt p",view).forEach(p=>{
      if(p.__lc68)return;const t=p.textContent;if(t.indexOf("[[lcboard:")<0)return;p.__lc68=1;
      p.textContent=t.replace(MARKG,"").replace(/\[\[lcboard:[^\]]*$/,"").trim();
      const chip=document.createElement("span");chip.className="lc68-chip";chip.textContent="♟ Board inside";p.appendChild(chip);
    });
    /* full post */
    QA(".lc39-bodytxt",view).forEach(el=>{
      if(el.__lc68)return;el.__lc68=1;
      const t=el.textContent,m=t.match(MARK);if(!m)return;
      el.textContent=t.replace(MARKG,"").trim();
      const h=document.createElement("div");h.className="lc68-host";el.insertAdjacentElement("afterend",h);
      viewer(h,decode(m[1]),false);
    });
    /* comments: small boards and move links */
    QA(".lc39-cmt p",view).forEach(p=>{
      if(p.__lc68)return;p.__lc68=1;
      const t=p.textContent,m=t.match(MARK);
      let txt=t.replace(MARKG,"").trim();
      p.innerHTML=esc(txt).replace(/\b(\d{1,3}\.(?:\.\.)?\s?(?:[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|O-O(?:-O)?)[+#]?)/g,'<button type="button" class="lc68-mv" data-lc68-mv="$1">$1</button>');
      if(m){const h=document.createElement("div");h.className="lc68-host sm";p.insertAdjacentElement("afterend",h);viewer(h,decode(m[1]),true)}
    });
  }
  function jumpTo(tok){
    const v=views.filter(x=>x.host.isConnected&&!x.host.classList.contains("sm"))[0];if(!v)return;
    const i=v.find(String(tok).replace(/\s/g,""));
    if(i<0){say("That move is not in the game above.","");return}
    v.go(i);try{v.host.scrollIntoView({behavior:"smooth",block:"center"})}catch(e){}
  }

  /* ---------- Brilliant moves -> community ---------- */
  function brilliantButton(){
    if(route()!=="brilliant")return;
    const row=Q("#bm-show .btn-row");if(!row||Q("[data-lc68='share-brill']",row))return;
    const b=document.createElement("button");b.type="button";b.className="btn btn-ghost btn-sm";b.setAttribute("data-lc68","share-brill");b.textContent="Share in the community";
    row.insertBefore(b,row.lastElementChild);
  }
  function shareBrilliant(){
    try{
      const on=Q("#bm-list [aria-pressed='true']"),id=on&&on.getAttribute("data-bm-id");
      const x=Brill.all().filter(e=>e.id===id)[0];if(!x){say("Pick a move first.","bad");return}
      const g=new Chess();let moves=[],start=START;
      if(x.pgn&&g.load_pgn(x.pgn,{sloppy:true})){const h=g.header()||{};start=h.FEN||START;moves=g.history().slice(0,400)}
      const o={fen:start,moves:moves,ply:Math.max(0,(+x.ply||0)+1),title:(x.kind==="brilliant"?"!! ":"! ")+x.san};
      if(!moves.length){o.fen=x.fen;o.moves=[x.san];o.ply=1}
      wr("lc68-draft",{at:Date.now(),cat:"wins",title:(x.kind==="brilliant"?"Brilliant move: ":"Great move: ")+x.san,text:"Found this in my game"+(x.opening?" ("+x.opening+")":"")+". Can you see why it works?",board:encode(o).replace(/^\[\[lcboard:|\]\]$/g,"")});
      location.hash="#community";
    }catch(e){say("Could not share this move.","bad")}
  }

  /* ---------- owner: categories, channels, threshold ---------- */
  async function adminSheet(){
    let sh=null;try{sh=openSheet({title:"Community channels",cls:"lc36-sheet lc68-sheet",noFocus:true,html:'<p class="muted">Loading…</p>'})}catch(e){return}
    const host=sh.el||document;
    const paint=async()=>{
      const r=await rpc("lc68_admin_list",{});const d=r.data;
      if(!(r.status===200&&d&&d.ok)){host.innerHTML='<p class="form-msg is-bad">'+esc(r.status===404?"Run sql/20261110100000_lc68_lc69_community2_landing.sql first.":"Sign in as the owner first.")+'</p>';return}
      const row=(k,x,i,n)=>'<div class="lc68-ar" data-k="'+k+'" data-slug="'+esc(x.slug)+'"><input class="input" data-f="name" value="'+esc(x.name)+'" maxlength="40" aria-label="Name">'
        +(k==="chan"?'<input class="input" data-f="descr" value="'+esc(x.descr||"")+'" maxlength="120" aria-label="Description" placeholder="Description">':"")
        +'<label class="lc68-ck"><input type="checkbox" data-f="admin_only"'+(x.admin_only?" checked":"")+'> Owner only</label>'
        +'<div class="lc68-ab"><button type="button" class="btn btn-ghost btn-sm" data-a="up"'+(i===0?" disabled":"")+' aria-label="Move up">↑</button><button type="button" class="btn btn-ghost btn-sm" data-a="down"'+(i===n-1?" disabled":"")+' aria-label="Move down">↓</button><button type="button" class="btn btn-primary btn-sm" data-a="save">Save</button>'+(x.slug==="general"?"":'<button type="button" class="btn btn-ghost btn-sm" data-a="del">Delete</button>')+'</div></div>';
      host.innerHTML='<h3>Feed categories</h3><p class="small muted">The tabs of the community feed. Deleting one moves its posts to General.</p>'+d.cats.map((x,i)=>row("cat",x,i,d.cats.length)).join("")
        +'<div class="lc68-add"><input class="input" data-new="cat" maxlength="40" placeholder="New category name"><button type="button" class="btn btn-ghost btn-sm" data-a="add" data-k="cat">Add</button></div>'
        +'<h3>Chat channels</h3><p class="small muted">The live channels. Deleting one deletes its messages.</p>'+d.chans.map((x,i)=>row("chan",x,i,d.chans.length)).join("")
        +'<div class="lc68-add"><input class="input" data-new="chan" maxlength="40" placeholder="New channel name"><button type="button" class="btn btn-ghost btn-sm" data-a="add" data-k="chan">Add</button></div>'
        +'<h3>Posting threshold</h3><div class="lc68-cfg"><label>XP level needed (or an active streak) <input class="input" type="number" min="1" max="30" data-c="min_level" value="'+(+d.cfg.min_level||1)+'"></label><label>Account age in hours <input class="input" type="number" min="0" max="720" data-c="min_hours" value="'+(+d.cfg.min_hours||0)+'"></label><label>Hide a post from others at a score of <input class="input" type="number" min="-100" max="-1" data-c="hide_at" value="'+(+d.cfg.hide_at||-5)+'"></label><button type="button" class="btn btn-primary btn-sm" data-a="cfg">Save the threshold</button></div>';
    };
    host.addEventListener("click",async e=>{
      const b=e.target.closest("button[data-a]");if(!b)return;e.preventDefault();
      const a=b.getAttribute("data-a"),r0=b.closest(".lc68-ar");let r=null;
      if(a==="cfg"){const c={};QA("[data-c]",host).forEach(i=>{c[i.getAttribute("data-c")]=+i.value});r=await rpc("lc68_admin_cfg",{p_cfg:c})}
      else if(a==="add"){const k=b.getAttribute("data-k"),n=Q('[data-new="'+k+'"]',host).value.trim();if(!n)return;r=await rpc("lc68_admin_save",{p_kind:k,p_slug:"",p_a:{name:n}})}
      else if(r0){
        const k=r0.getAttribute("data-k"),slug=r0.getAttribute("data-slug");
        if(a==="save"){const o={};QA("[data-f]",r0).forEach(i=>{o[i.getAttribute("data-f")]=i.type==="checkbox"?i.checked:i.value});r=await rpc("lc68_admin_save",{p_kind:k,p_slug:slug,p_a:o})}
        else if(a==="del"){if(!confirm("Delete "+slug+"?"))return;r=await rpc("lc68_admin_delete",{p_kind:k,p_slug:slug})}
        else r=await rpc("lc68_admin_move",{p_kind:k,p_slug:slug,p_dir:a==="up"?-1:1});
      }
      if(r&&r.status===200&&r.data&&r.data.ok){say("Saved.","good");cats=null;await loadCats();paint()}else say(r&&r.data&&r.data.error==="exists"?"That name already exists.":"Could not save that.","bad");
    });
    await paint();
  }
  function ownerRow(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc68-admin]",m))return;
    const ref=Q("[data-lc65-admin]",m)||Q("[data-lc64-trim]",m);if(!ref)return;
    const b=document.createElement("button");b.type="button";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc68-admin","");
    b.innerHTML="<span><b>Community channels</b><small>Add, rename, reorder or delete categories and channels; the posting threshold</small></span>";
    ref.insertAdjacentElement("afterend",b);
  }

  /* ---------- wiring ---------- */
  function onDoc(e){
    const t=e.target;if(!t||!t.closest)return;
    if(t.closest("[data-lc68-admin]")){e.preventDefault();e.stopPropagation();try{const m=Q("#lc49-menu");if(m)m.remove()}catch(x){}adminSheet();return}
    const v=t.closest("[data-lc68-v]");if(v){e.preventDefault();e.stopPropagation();vote(+v.getAttribute("data-id"),+v.getAttribute("data-lc68-v"),v);return}
    const so=t.closest("[data-lc68-sort]");if(so){e.preventDefault();wr("lc68-sort",so.getAttribute("data-lc68-sort"));QA("[data-lc68-sort]").forEach(x=>x.setAttribute("aria-pressed",String(x===so)));const pill=Q(".lc39-pill.on");if(pill)pill.click();return}
    const mv=t.closest("[data-lc68-mv]");if(mv){e.preventDefault();jumpTo(mv.getAttribute("data-lc68-mv"));return}
    const a=t.closest("[data-lc68]");
    if(a&&a.getAttribute("data-lc68")==="share-brill"){e.preventDefault();shareBrilliant();return}
    if(a&&a.getAttribute("data-lc68")==="attach-pos"){
      e.preventDefault();const vw=views.filter(x=>x.host.isConnected&&!x.host.classList.contains("sm"))[0];
      const ta=Q("[data-c-ctext]",a.closest(".lc39-cform"));if(!vw||!ta){say("Open a post with a board first.","");return}
      ta.value=(ta.value.trim()+"\n"+encode({fen:vw.fen(),moves:[]})).trim();return;
    }
    /* sending a post: the attached board is added to the text first; the threshold is explained */
    if(t.closest("[data-c-send]")||t.closest("[data-c-csend]")){
      if(!canPost()&&t.closest("[data-c-send]")){e.preventDefault();e.stopPropagation();say(gateText(),"bad");return}
      const f=t.closest("[data-c-form]");if(!f)return;
      const w=Q(".lc68-att",f);if(!w)return;
      const att=Q("[data-lc68-att]",w);if(!att||!att.value.trim())return;
      const o=check(w);if(!o){e.preventDefault();e.stopPropagation();say("The attached position is not a valid FEN or PGN.","bad");return}
      const ta=Q("[data-c-text]",f);let body=ta.value.replace(MARKG,"").trim(),mk=encode(o);
      if(body.length+mk.length+1>4000){e.preventDefault();e.stopPropagation();say("The game is too long to attach. Attach the position instead (a FEN).","bad");return}
      ta.value=(body+"\n"+mk).trim();att.value="";
    }
  }
  function onInput(e){const t=e.target;if(t&&t.matches&&t.matches("[data-lc68-att]"))check(t.closest(".lc68-att"))}
  function css(){
    if(Q("#lc68-css"))return;const s=document.createElement("style");s.id="lc68-css";
    s.textContent=".lc68-sort{display:flex;gap:6px;margin:8px 0}.lc68-sort button{min-height:40px;padding:0 14px;border-radius:999px;border:1px solid #334155;background:#0f172a;color:#cbd5e1;font-weight:700}.lc68-sort button[aria-pressed=true]{background:#38bdf8;color:#04121c;border-color:#38bdf8}"
      +".lc68-vote{display:inline-flex;align-items:center;gap:2px;margin-right:6px;border:1px solid #334155;border-radius:999px;padding:0 4px}.lc68-vote b{min-width:24px;text-align:center}.lc68-vote button{min-width:40px;min-height:40px;background:none;border:0;color:#94a3b8;font-size:15px;cursor:pointer}.lc68-vote .lc68-up.on{color:#4ade80}.lc68-vote .lc68-dn.on{color:#fb7185}.lc68-hide{display:none!important}"
      +".lc68-chip{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:999px;background:rgba(56,189,248,.15);color:#38bdf8;font-size:12px}"
      +".lc68-host{margin:10px 0}.lc68-bv{max-width:420px}.lc68-bv.sm{max-width:220px}.lc68-b{width:100%;touch-action:none}.lc68-bt{font-weight:700;margin:0 0 6px}.lc68-nav{display:flex;gap:6px;margin:8px 0}.lc68-nav .btn{min-width:44px;min-height:44px}"
      +".lc68-ml{display:flex;flex-wrap:wrap;gap:4px;max-height:140px;overflow:auto;margin-bottom:8px}.lc68-ml button{min-height:32px;padding:0 8px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#cbd5e1;font-size:13px}.lc68-ml button.on{border-color:#38bdf8;color:#38bdf8}"
      +".lc68-mv{background:none;border:0;padding:0;color:#38bdf8;text-decoration:underline;cursor:pointer;font:inherit;min-height:24px}.lc68-att details{margin:8px 0}.lc68-att summary{cursor:pointer;min-height:40px;color:#38bdf8}.lc68-gate{margin-bottom:8px}"
      +".lc68-ar{display:grid;gap:6px;padding:10px;border:1px solid #334155;border-radius:12px;margin:6px 0}.lc68-ab{display:flex;gap:6px;flex-wrap:wrap}.lc68-ab .btn{min-height:40px}.lc68-ck{display:flex;gap:8px;align-items:center;font-size:14px;min-height:32px}.lc68-add{display:flex;gap:6px;margin:6px 0 14px}.lc68-cfg{display:grid;gap:8px}.lc68-cfg label{display:grid;gap:4px;font-size:14px}";
    document.head.appendChild(s);
  }
  let deb=0;
  function scan(){
    const r=route();
    if(r==="community"){const v=Q("#view");if(v){sortBar(v);composer(v);paintBoards(v);paintVotes()}}
    else if(r==="brilliant")brilliantButton();
    else if(r==="trim")trimLoad();
    ownerRow();
  }
  function afterRender(){clearTimeout(deb);deb=setTimeout(()=>{try{scan()}catch(e){}},250)}
  function init(){
    css();wrapQuota();loadCats();
    document.addEventListener("click",onDoc,true);document.addEventListener("input",onInput,true);
    new MutationObserver(()=>{clearTimeout(deb);deb=setTimeout(()=>{try{scan()}catch(e){}},200)}).observe(document.body,{childList:true,subtree:true});
  }
  return{init:init,afterRender:afterRender,encode:encode,decode:decode,parseInput:parseInput,viewer:viewer,canPost:canPost,loadCats:loadCats,adminSheet:adminSheet,feedData:feedData,_cfg:()=>cfg,version:"9.34.0"};
})(); /*@@end lc68*/
