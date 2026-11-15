/*@@module lc83*/
const LC83=(()=>{
  "use strict";
  /* LC83 (build 9.43.0): the honest MSPC engine, the calm guide and the mobile shell.
     1. TRUTH: every coach sentence about a move is built from facts read off the board (geometry + chess.js), never from a guess.
        A move "attacks" something only when that piece can really be won: it has no defender, or the attacker is worth less.
        A quiet move (h5, a3, Kh1) is called quiet: "it attacks nothing you can lose", with what it really changed (a pawn in front of
        its own king, a line it opened, a defence it gave up, a passed pawn, pressure on the king). Used by the marathon onboarding
        (LC42), the MSPC lens and the ranked entry gate (LC67) and Game-to-Script (LC79).
     2. CALM GUIDE: while the first-time marathon (LC42) is on screen, every other pop-up waits in a short queue and comes after it,
        one at a time, only when the screen is calm. Nothing pulls a person away to courses or stats in the middle of their analysis.
     3. MOBILE SHELL: the on-screen keyboard never covers a field or a sheet (visualViewport: sheets fit the visible part, the focused
        field scrolls into view, fixed bottom bars step aside), no zoom-on-focus on iPhone, no double-tap delay on buttons.
        Inside Instagram / TikTok / Facebook / Snapchat in-app browsers (which cannot install an app) a quiet bar shows how to open the
        Hub in the real browser and install it as a standalone app. */
  const VERSION="9.43.0";
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};

  /* ======================= 1. TRUTH ======================= */
  const FILES="abcdefgh",VAL={p:1,n:3,b:3,r:5,q:9,k:100},NAME={p:"pawn",n:"knight",b:"bishop",r:"rook",q:"queen",k:"king"};
  const other=c=>c==="w"?"b":"w";
  function parse(fen){
    const B={},rows=String(fen||"").split(" ")[0].split("/");
    rows.forEach((row,ri)=>{let f=0;for(const ch of row){if(/\d/.test(ch))f+=+ch;else{if(f<8)B[FILES[f]+(8-ri)]={t:ch.toLowerCase(),c:ch===ch.toUpperCase()?"w":"b"};f++}}});
    return B;
  }
  const on=(f,r)=>f>=0&&f<8&&r>=1&&r<=8;
  /* the squares a piece attacks (geometry: sliders stop at the first piece, that square included) */
  function attacksFrom(B,sq){
    const p=B[sq];if(!p)return[];const f0=FILES.indexOf(sq[0]),r0=+sq[1],out=[];
    const add=(f,r)=>{if(on(f,r))out.push(FILES[f]+r)};
    if(p.t==="p"){const d=p.c==="w"?1:-1;add(f0-1,r0+d);add(f0+1,r0+d);return out}
    if(p.t==="n"){[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]].forEach(d=>add(f0+d[0],r0+d[1]));return out}
    if(p.t==="k"){for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)if(x||y)add(f0+x,r0+y);return out}
    const dirs=(p.t==="b"?[]:[[1,0],[-1,0],[0,1],[0,-1]]).concat(p.t==="r"?[]:[[1,1],[1,-1],[-1,1],[-1,-1]]);
    dirs.forEach(d=>{let f=f0+d[0],r=r0+d[1];while(on(f,r)){const s=FILES[f]+r;out.push(s);if(B[s])break;f+=d[0];r+=d[1]}});
    return out;
  }
  const attackers=(B,sq,color)=>Object.keys(B).filter(s=>B[s].c===color&&attacksFrom(B,s).indexOf(sq)>=0);
  const defended=(B,sq)=>{const p=B[sq];return !!p&&attackers(B,sq,p.c).length>0};
  /* pieces of `color` that can really be won right now: attacked, and either undefended or attacked by something cheaper */
  function loose(B,color){
    const out=[];
    Object.keys(B).forEach(sq=>{const p=B[sq];if(p.c!==color||p.t==="k")return;
      const att=attackers(B,sq,other(color)).sort((a,b)=>VAL[B[a].t]-VAL[B[b].t]);if(!att.length)return;
      const free=!defended(B,sq),cheap=VAL[B[att[0]].t]<VAL[p.t];
      if(free||cheap)out.push({sq:sq,t:p.t,by:att[0],byT:B[att[0]].t,free:free})});
    return out.sort((a,b)=>VAL[b.t]-VAL[a.t]);
  }
  const kingSq=(B,c)=>Object.keys(B).filter(s=>B[s].c===c&&B[s].t==="k")[0]||"";
  function zone(sq){if(!sq)return[];const f0=FILES.indexOf(sq[0]),r0=+sq[1],z=[];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)if(on(f0+x,r0+y))z.push(FILES[f0+x]+(r0+y));return z}
  function zoneHits(B,color){   /* squares around the enemy king that `color` attacks */
    const z=zone(kingSq(B,other(color))),hit={};
    Object.keys(B).forEach(s=>{if(B[s].c!==color)return;attacksFrom(B,s).forEach(x=>{if(z.indexOf(x)>=0)hit[x]=1})});
    return Object.keys(hit).length;
  }
  function passed(B,sq){
    const p=B[sq];if(!p||p.t!=="p")return false;const f0=FILES.indexOf(sq[0]),r0=+sq[1],d=p.c==="w"?1:-1;
    for(let f=f0-1;f<=f0+1;f++)for(let r=r0+d;on(f,r);r+=d){const x=B[FILES[f]+r];if(x&&x.t==="p"&&x.c!==p.c)return false}
    return true;
  }
  const uciMove=u=>{u=String(u||"");return{from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||undefined}};
  /* facts about one move. pov = the colour of the person reading ("your" / "their"). Only facts, never a guess. */
  function moveFacts(fenBefore,mv,pov){
    let g,m;
    try{g=new Chess(fenBefore);m=g.move(typeof mv==="string"&&/^[a-h][1-8][a-h][1-8]/.test(mv)?uciMove(mv):mv)}catch(e){m=null}
    if(!m)return null;
    const after=g.fen(),B0=parse(fenBefore),B1=parse(after),me=m.color,them=other(me),mine=pov?me===pov:true;
    const own=mine?"your":"their",opp=mine?"their":"your",pn=(w,t,s)=>w+" "+NAME[t]+" on "+s;
    const F=[];
    if(m.captured)F.push({k:"capture",t:"It took "+pn(opp,m.captured,m.to)+"."});
    if(g.in_checkmate())F.push({k:"mate",t:"It is checkmate."});
    else if(g.in_check())F.push({k:"check",t:"It gives check: the king has to be dealt with first."});
    /* new real threats against the other side (by the moved piece, or through a line it opened) */
    const was={};loose(B0,them).forEach(x=>{was[x.sq]=1});
    loose(B1,them).filter(x=>!was[x.sq]).slice(0,2).forEach(x=>{
      const why=x.free?"which has no defender":"with a piece worth less";
      if(x.by===m.to)F.push({k:"threat",t:"It attacks "+pn(opp,x.t,x.sq)+", "+why+"."});
      else F.push({k:"line",t:"It opened a line: "+pn(own,x.byT,x.by)+" now attacks "+pn(opp,x.t,x.sq)+", "+why+"."});
    });
    /* defence it gave up / its own piece left hanging */
    const was2={};loose(B0,me).forEach(x=>{was2[x.sq]=1});
    loose(B1,me).filter(x=>!was2[x.sq]).slice(0,2).forEach(x=>{
      if(x.sq===m.to){if(m.captured&&VAL[m.captured]>=VAL[m.piece])return;   /* a capture that can be recaptured is a trade, not a loss */
        F.push({k:"hang",t:"The "+NAME[x.t]+" on "+x.sq+" now stands where "+pn(opp,x.byT,x.by)+" can win it."})}
      else{
        const gaveUp=attacksFrom(B0,m.from).indexOf(x.sq)>=0&&attacksFrom(B1,m.to).indexOf(x.sq)<0;
        F.push({k:"undefend",t:(gaveUp?"It stopped defending ":"It left ")+pn(own,x.t,x.sq)+(gaveUp?": that piece is now loose.":" loose.")});
      }
    });
    /* pawn facts */
    if(m.piece==="p"){
      const ks=kingSq(B1,me),kf=FILES.indexOf(ks[0]),pf=FILES.indexOf(m.to[0]),homeR=me==="w"?1:8,fromR=+m.from[1];
      if(ks&&+ks[1]===homeR&&Math.abs(kf-pf)<=1&&(me==="w"?fromR<=3:fromR>=6))F.push({k:"shield",t:"It pushed a pawn in front of "+own+" own king: the squares around that king are weaker now."});
      if(passed(B1,m.to)&&!passed(B0,m.from))F.push({k:"passed",t:"It is now a passed pawn: no enemy pawn can stop it."});
      if(m.captured&&!Object.keys(B1).some(s=>s[0]===m.from[0]&&B1[s].t==="p"&&B1[s].c===me))F.push({k:"file",t:"It opened the "+m.from[0]+"-file."});
    }
    /* a line that opened for one of its own long-range pieces (no threat yet) */
    if(!F.some(x=>x.k==="line"))Object.keys(B1).forEach(s=>{
      const p=B1[s];if(F.some(x=>x.k==="opened")||p.c!==me||s===m.to||!/[bqr]/.test(p.t))return;
      const a0=B0[s]?attacksFrom(B0,s).length:0,a1=attacksFrom(B1,s).length;
      if(a1-a0>=3&&attacksFrom(B1,s).indexOf(m.from)>=0)F.push({k:"opened",t:"It opened the "+(p.t==="r"?"file":p.t==="b"?"diagonal":"line")+" for "+pn(own,p.t,s)+"."});
    });
    /* pressure on the king */
    const z0=zoneHits(B0,me),z1=zoneHits(B1,me);
    if(!g.in_check()&&z1-z0>=2)F.push({k:"king",t:"It aims at the king: "+(mine?"you":"they")+" now hit "+z1+" squares around "+opp+" king."});
    /* development (opening only) */
    const full=+String(fenBefore).split(" ")[5]||1,back=me==="w"?"1":"8";
    if(full<=12&&/[nb]/.test(m.piece)&&m.from[1]===back&&!F.length)F.push({k:"develop",t:"It develops the "+NAME[m.piece]+"."});
    return{san:m.san,from:m.from,to:m.to,piece:m.piece,color:me,captured:m.captured||null,after:after,facts:F,quiet:!F.length||F.every(x=>x.k==="develop")};
  }
  function factText(r,max,kinds){if(!r)return"";return r.facts.filter(x=>!kinds||kinds.test(x.k)).slice(0,max||3).map(x=>x.t).join(" ")}
  /* what the side to move can do right now: checks, captures that win something, pieces of theirs that are loose */
  function cca(fen){
    const out={checks:[],wins:[],theirLoose:[],myLoose:[]};
    try{
      const g=new Chess(fen),me=g.turn(),B=parse(fen);
      g.moves({verbose:true}).forEach(m=>{
        if(/[+#]/.test(m.san))out.checks.push(m.san);
        if(m.captured){const t=B[m.to];if(t&&(!defended(B,m.to)||VAL[m.captured]>VAL[m.piece]))out.wins.push(m.san)}
      });
      out.theirLoose=loose(B,other(me));out.myLoose=loose(B,me);
    }catch(e){}
    return out;
  }
  /* the pure MSPC breakdown of one mistake.
     r: {fen (before your move), color, played:{from,to,promotion,san}, bestUci, bestSan, replyUci, replySan, prevFen, oppUci, oppSan} */
  const NEXT={
    M:"Before you touch a piece, say out loud what their last move changed. Only a real threat counts: a piece of yours that can now be won.",
    S:"Before every move, find your loose pieces (no defender, or attacked by something cheaper) and protect one, or move it.",
    P:"Before a quiet move, list your checks, your captures that win something and your real threats. The strongest move is often one of them.",
    C:"Before you play it, look one move further: what is their best reply, and does your move still work after it?"};
  const NEXT_PLAN="Before every quiet move, name the pawn structure and your worst-placed piece, then pick the move that improves that piece.";
  function explain(r){
    const me=r.color||(String(r.fen).split(" ")[1]||"w"),out={k:"S",M:"",S:"",P:"",C:"",next:""};
    try{
      const opp=r.prevFen&&r.oppUci?moveFacts(r.prevFen,r.oppUci,me):null;
      const mine=moveFacts(r.fen,r.played&&r.played.from?{from:r.played.from,to:r.played.to,promotion:r.played.promotion||"q"}:r.playedUci,me);
      const best=r.bestUci?moveFacts(r.fen,r.bestUci,me):null;
      const reply=mine&&r.replyUci?moveFacts(mine.after,r.replyUci,me):null;
      const B=parse(r.fen),myLoose=loose(B,me),c=cca(r.fen);
      const ps=(mine&&mine.san)||(r.played&&r.played.san)||"your move",bs=(best&&best.san)||r.bestSan||"",rs=(reply&&reply.san)||r.replySan||"";
      /* M: what their last move really changed */
      if(opp){
        const real=opp.facts.filter(x=>/capture|mate|check|threat|line|undefend|hang|king/.test(x.k));
        out.M=opp.quiet||!opp.facts.length
          ?"Their last move "+opp.san+" was quiet: it attacks nothing you can lose."+(opp.facts.length?" "+factText(opp,1):"")+" So the M step says: no danger here, it is your turn to choose a plan."
          :"Their last move "+opp.san+": "+factText(opp,2)+(real.length?"":" No piece of yours can be won because of it.");
      }else out.M="Their last move gave you nothing to answer: no check, no threat on your pieces.";
      /* S: the facts of the position (loose pieces, alarm signals) */
      let al=[];try{al=(LC61.detect(r.fen,me)||[]).filter(a=>a.id!=="loose").slice(0,1)}catch(e){}
      const ls=myLoose.slice(0,2).map(x=>"your "+NAME[x.t]+" on "+x.sq+(x.free?" (no defender)":" (attacked by a cheaper piece)"));
      const tl=c.theirLoose.slice(0,2).map(x=>"their "+NAME[x.t]+" on "+x.sq);
      out.S=(ls.length?"Loose right now: "+ls.join(" and ")+". ":"None of your pieces is loose. ")+(tl.length?"Loose on their side: "+tl.join(" and ")+". ":"")+(al.length?"On the board: "+al[0].label.toLowerCase()+". "+al[0].say:"");out.S=out.S.trim();
      /* P: the better move, in facts */
      const bf=best?best.facts.filter(x=>x.k!=="develop"):[];
      out.P=bs?("The better move was "+bs+". "+(bf.length?factText(best,2):(best&&best.facts.length?factText(best,1)+" ":"")+"It wins nothing by force: it simply keeps your position healthier than "+ps+" did.")).replace(/\s+$/,""):"The engine preferred another move here.";
      if(c.checks.length||c.wins.length)out.P+=" Your forcing moves here: "+(c.checks.length?"checks "+c.checks.slice(0,3).join(", "):"no checks")+(c.wins.length?"; captures that win something "+c.wins.slice(0,3).join(", "):"")+".";
      /* C: what your move allowed */
      const rf=reply?reply.facts.filter(x=>/capture|mate|check|threat|line|king|passed/.test(x.k)):[];
      out.C=rs?("After "+ps+", their best answer is "+rs+". "+(rf.length?factText(reply,2,/capture|mate|check|threat|line|king|passed/):"It is a quiet move, but it keeps their advantage."))+(mine&&mine.facts.some(x=>x.k==="hang"||x.k==="undefend")&&!(reply&&reply.captured&&mine.facts.some(x=>x.t.indexOf(" on "+reply.to)>=0))?" "+mine.facts.filter(x=>x.k==="hang"||x.k==="undefend")[0].t:""):"Calculate their best reply before you play.";
      /* where it went wrong (one letter, from facts only) */
      const threatened=opp&&opp.facts.filter(x=>/threat|line|check/.test(x.k)).length;
      const replyWins=reply&&reply.captured&&rf.some(x=>x.k==="capture");
      const replyTookThreat=threatened&&reply&&reply.captured&&opp.facts.some(x=>x.t.indexOf(" on "+reply.to)>=0);
      if(replyTookThreat)out.k="M";
      else if(replyWins&&(mine&&mine.facts.some(x=>x.k==="hang"||x.k==="undefend")||myLoose.some(x=>x.sq===reply.to)))out.k="S";
      else if(best&&(best.captured||best.facts.some(x=>/mate|check|threat|line/.test(x.k))))out.k="P";
      else if(mine&&(mine.captured||mine.facts.some(x=>x.k==="check")))out.k="C";
      else if(replyWins)out.k="C";
      else{out.k="S";out.plan=true}
      out.next=NEXT[out.k];
      if(out.plan){   /* nothing tactical went wrong: it was the plan, so say that and nothing more */
        if(!myLoose.length&&!al.length)out.S="None of your pieces is loose and nothing tactical was hanging. This was a plan question: which pawn structure is on the board, and which of your pieces stands worst?";
        out.next=NEXT_PLAN;
      }
    }catch(e){out.M=out.M||"Look at what their last move changed.";out.next=NEXT[out.k]}
    return out;
  }
  /* one sentence about a move for the "M" step when only the position after it is known (no fen before it) */
  function threatsBy(fenAfter,sq,pov){
    try{
      const B=parse(fenAfter),p=B[sq];if(!p)return{list:[],text:""};
      const own=pov&&p.c===pov?"your":"their",opp=pov&&p.c===pov?"their":"your";
      const list=loose(B,other(p.c)).filter(x=>x.by===sq||attacksFrom(B,sq).indexOf(x.sq)>=0);
      return{list:list,text:list.length?"That "+NAME[p.t]+" now attacks "+list.slice(0,2).map(x=>opp+" "+NAME[x.t]+" on "+x.sq+(x.free?" (no defender)":"")).join(" and ")+".":"It attacks nothing you can lose: ask what it prepares and what it stopped defending."};
    }catch(e){return{list:[],text:""}}
  }

  /* ======================= 2. CALM GUIDE ======================= */
  const ALLOW=/lc42|lc40-auth|lc53|lc39|lc26/;
  let held=[],relT=0,busyAt=0,lvl=null;
  const marathon=()=>!!Q(".lc42-sheet");   /* the marathon itself and the Level sheet that ends it */
  const busy=()=>{if(marathon())busyAt=Date.now();return Date.now()-busyAt<4000};
  function wrapSheets(){
    try{
      if(typeof openSheet!=="function"||openSheet.__lc83)return;
      const prev=openSheet;
      const f=function(o){
        try{
          const ti=String(o&&o.title||""),lm=ti.match(/^Level (\d+)$/),dm=ti.match(/^Level (\d+) unlocked$/);
          if(lm&&/lc42/.test(String(o&&o.cls||"")))lvl={n:lm[1],t:Date.now()};
          if(dm&&lvl&&lvl.n===dm[1]&&Date.now()-lvl.t<18e4)return{el:document.createElement("div"),close(){},deferred:true};   /* the same level-up twice: once is enough */
          if(busy()&&!ALLOW.test(String(o&&o.cls||""))){
            held=held.filter(x=>x.o.title!==(o&&o.title)).concat([{o:o,t:Date.now()}]).slice(-3);
            schedule();
            return{el:document.createElement("div"),close(){},deferred:true};
          }
        }catch(e){}
        return prev.apply(this,arguments);
      };
      f.__lc83=true;openSheet=f;
    }catch(e){}
  }
  function schedule(){clearTimeout(relT);relT=setTimeout(release,2500)}
  function release(){
    if(!held.length)return;
    if(busy()||Q(".sheet-wrap")||(document.activeElement&&/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))){schedule();return}
    held=held.filter(x=>Date.now()-x.t<15*6e4);
    const x=held.shift();if(x){try{openSheet(x.o)}catch(e){}}
    if(held.length)relT=setTimeout(release,3500);
  }

  /* ======================= 3. MOBILE SHELL ======================= */
  const UA=()=>String(navigator.userAgent||"");
  const isIOS=()=>/iPhone|iPad|iPod/i.test(UA())||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const isAndroid=()=>/Android/i.test(UA());
  function inApp(){const u=UA();return/FBAN|FBAV|FB_IAB|Instagram|TikTok|musical_ly|BytedanceWebview|Bytedance|Snapchat|Twitter|LinkedInApp|Line\//i.test(u)}
  const appName=()=>{const u=UA();return/Instagram/i.test(u)?"Instagram":/TikTok|musical_ly|Bytedance/i.test(u)?"TikTok":/FBAN|FBAV|FB_IAB/i.test(u)?"Facebook":/Snapchat/i.test(u)?"Snapchat":/Twitter/i.test(u)?"X":/LinkedIn/i.test(u)?"LinkedIn":"this app"};
  const standalone=()=>{try{return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}catch(e){return false}};
  function intentUrl(){
    const u=location.origin+location.pathname+location.search;
    return"intent://"+location.host+location.pathname+location.search+"#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url="+encodeURIComponent(u)+";end";
  }
  function iabBar(){
    if(!inApp()||standalone()||Q(".lc83-iab"))return;
    if(Date.now()-(+rd("lc83-iab",0)||0)<864e5)return;
    const b=document.createElement("div");b.className="lc83-iab";b.setAttribute("role","note");
    const steps=isIOS()?"Tap <b>⋯</b> (top right), then <b>Open in browser</b>. In Safari: <b>Share</b> → <b>Add to Home Screen</b>."
      :"Open it in Chrome, then tap <b>Install app</b>. It runs full screen, like any app.";
    b.innerHTML='<p><b>You are inside '+esc(appName())+'.</b> Its browser cannot install apps. '+steps+' Your progress moves with your account once you sign in.</p>'
      +'<div class="lc83-iab-row">'+(isAndroid()?'<a class="btn btn-primary" href="'+esc(intentUrl())+'">Open in Chrome</a>':"")+'<button type="button" class="btn btn-ghost" data-lc83-copy>Copy link</button><button type="button" class="lc83-x" data-lc83-iabx aria-label="Hide for today">×</button></div>';
    document.body.appendChild(b);document.documentElement.classList.add("lc83-has-iab");
  }
  const field=t=>t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)&&!/^(checkbox|radio|range|button|submit|file|color)$/i.test(t.type||"");
  function keyboard(){
    try{
      const m=Q('meta[name="viewport"]');if(m&&!/interactive-widget/.test(m.content))m.content=m.content+",interactive-widget=resizes-content";
    }catch(e){}
    const vv=window.visualViewport;if(!vv)return;
    const H=document.documentElement;
    const upd=()=>{
      const open=field(document.activeElement)&&vv.height<window.innerHeight*0.8;
      H.classList.toggle("lc-kb",!!open);
      H.style.setProperty("--lc-vvh",Math.round(vv.height)+"px");H.style.setProperty("--lc-vvt",Math.round(vv.offsetTop)+"px");
    };
    vv.addEventListener("resize",upd);vv.addEventListener("scroll",upd);
    document.addEventListener("focusin",e=>{if(!field(e.target))return;upd();setTimeout(()=>{upd();try{e.target.scrollIntoView({block:"center",behavior:"smooth"})}catch(x){}},350)});
    document.addEventListener("focusout",()=>setTimeout(upd,120));
  }
  function css(){
    if(Q("#lc83-css"))return;const s=document.createElement("style");s.id="lc83-css";
    s.textContent="@media (pointer:coarse){input:not([type=checkbox]):not([type=radio]):not([type=range]),select,textarea{font-size:max(16px,1em)!important}"
      +"button,a,.btn,[role=button],label,summary,select{touch-action:manipulation}}"
      +"html.lc-kb #lc49-float,html.lc-kb .lc49-float,html.lc-kb .lc42-claim,html.lc-kb .lc45-pill,html.lc-kb .lc72-note,html.lc-kb .lc69-bubble,html.lc-kb .lc67-simbar,html.lc-kb .lc25-wait,html.lc-kb .lc30-note,html.lc-kb .data-banner,html.lc-kb .cbar,html.lc-kb .lc83-iab,html.lc-kb .lc54-dock{display:none!important}"
      +"html.lc-kb .sheet-wrap{top:var(--lc-vvt,0px);bottom:auto;height:var(--lc-vvh,100%);align-items:flex-end}html.lc-kb .sheet{max-height:calc(var(--lc-vvh,90vh) - 8px)}"
      +".lc83-iab{position:fixed;left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));z-index:95;padding:10px 12px;border-radius:16px;background:#1e293b;border:1px solid #38bdf8;box-shadow:0 14px 40px rgba(0,0,0,.55);font-size:14px;line-height:1.4;max-width:560px;margin:0 auto}"
      +".lc83-iab p{margin:0 0 8px}.lc83-iab-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lc83-iab .btn{min-height:44px}.lc83-x{margin-left:auto;width:44px;height:44px;border:0;background:transparent;color:#94a3b8;font-size:22px;cursor:pointer}";
    document.head.appendChild(s);
  }
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    if(t.closest("[data-lc83-iabx]")){wr("lc83-iab",Date.now());const b=Q(".lc83-iab");if(b)b.remove();document.documentElement.classList.remove("lc83-has-iab");return}
    if(t.closest("[data-lc83-copy]")){const u=location.origin+"/app.html";(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>{try{toast("Link copied. Paste it in Safari or Chrome.","good")}catch(x){}},()=>{try{prompt("Copy this link:",u)}catch(x){}});return}
  }
  function afterRender(){if(held.length)schedule()}
  function init(){
    css();wrapSheets();keyboard();
    document.addEventListener("click",onClick,true);
    setTimeout(iabBar,1500);
  }
  return{init:init,afterRender:afterRender,moveFacts:moveFacts,factText:factText,explain:explain,cca:cca,threatsBy:threatsBy,loose:loose,parse:parse,attacksFrom:attacksFrom,
    NEXT:NEXT,inApp:inApp,intentUrl:intentUrl,_t:{held:()=>held,release:release,iabBar:iabBar},version:VERSION};
})(); /*@@end lc83*/
