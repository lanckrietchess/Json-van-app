/*@@module lc83*/
const LC83=(()=>{
  "use strict";
  /* LC83 (build 9.43.0, 9.44.0): the honest MSPC engine, the calm guide and the mobile shell.
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
        Hub in the real browser and install it as a standalone app.
     9.44.0: ONE calm message at a time, everywhere. A pop-up the person did not ask for (no tap in the last 3 s) waits while another
        pop-up is open and never lands on the Trim analysis; an install / upgrade / promo pop-up also keeps 20 s away from the previous
        pop-up and never lands on an exercise: it comes when the person leaves. The road (LC42, LC84) and the sign-in sheets always pass.
        Trim on a phone: no sticky board that the page slides under, the title and its ? at the top, then board, move buttons, the moves and
        the review button, the coach, the report; engine lines, the library and the PGN box under that. A finished review keeps the board in
        view instead of jumping to the report. */
  const VERSION="9.44.0";
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
  /* 9.54.0: what a puzzle's WINNING LINE really does, read off the board move by move (chess.js + geometry, no engine, no AI).
     Used for puzzle feedback so it always matches the move that was played: the first move's facts, a double attack when the moved
     piece hits two or more valuable targets (king included), and the result of the whole line (mate, promotion or the material won).
     Returns {san, line, motif, mate, net, text} or null. */
  function solutionFacts(fen,sol,pov){
    try{
      const g=new Chess(fen),me=g.turn();pov=pov||me;
      const list=(Array.isArray(sol)?sol:[]).map(uciMove);if(!list.length)return null;
      const first=moveFacts(fen,list[0],pov);if(!first)return null;
      const sans=[];let net=0,promo=false,mate=false;
      for(const u of list){let m=null;try{m=g.move(u)}catch(e){m=null}if(!m)break;sans.push(m.san);
        if(m.captured)net+=(m.color===me?1:-1)*VAL[m.captured];if(m.promotion&&m.color===me){promo=true;net+=VAL[m.promotion]-1}
        if(g.in_checkmate())mate=true}
      const B1=parse(first.after),targets=attacksFrom(B1,first.to).filter(s=>B1[s]&&B1[s].c!==me&&(B1[s].t==="k"||VAL[B1[s].t]>=3||VAL[B1[s].t]>VAL[first.piece]));
      const dbl=targets.length>=2,motif=mate?"mate":dbl?"double attack":promo?"promotion":first.captured?"capture":first.facts.some(x=>x.k==="check")?"check":first.facts.some(x=>x.k==="line")?"discovered attack":first.facts.some(x=>x.k==="threat")?"threat":"quiet move";
      const own=pov===me?"you":"they",tgt=dbl?targets.slice(0,3).map(s=>(B1[s].t==="k"?"the king":"the "+NAME[B1[s].t])+" on "+s).join(" and "):"";
      let text=first.san+": "+(dbl?"one move, two targets: it hits "+tgt+" at the same time. ":"")+(factText(first,2,dbl?/capture|mate|check|line|passed|file/:null)||(first.quiet?"a quiet move that prepares the blow.":""));
      if(mate&&!first.facts.some(x=>x.k==="mate"))text+=" The line ends in checkmate.";
      else if(net>=2)text+=" The whole line wins material: "+own+" come out "+net+" point"+(net===1?"":"s")+" up.";
      else if(promo)text+=" The pawn promotes.";
      text=text.replace(/\s+/g," ").trim().replace(/^([^:]+: )([A-Z])(?=[a-z])/,(m0,a,b)=>a+b.toLowerCase());
      return{san:first.san,line:sans,motif:motif,mate:mate,net:net,text:text};
    }catch(e){return null}
  }
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
  /* ======================= 1b. DIAGNOSE (9.56.0): the human error behind an engine mistake =======================
     Input: the position before the mistake (fen), the move played, Stockfish's better move (bestUci), Stockfish's refutation (replyUci),
     and when known the opponent's last move (prevFen + oppUci) and their threat (threatUci, Stockfish's best move for them with a null move).
     It answers the four coaching questions with facts from THIS position, never a stock sentence:
       why     why the opponent played their last move (what it changed, what it threatened)
       error   what the human missed (one concrete cause, with squares)
       alarm   which Alarm Signal should have gone off, worded for this position
       wp      the Working Point (MSPC letter + a rule that fits this cause)
       action  the Action Step that would have prevented exactly this mistake
       find    how a human finds the better move
     The causes are checked in a fixed order, the first that is TRUE on the board wins:
       allowed mate · missed mate · a blocker that left its line · their threat was ignored · a defender walked away ·
       the moved piece was left en prise · the reply hits two things · a forcing move was missed · otherwise a positional comparison. */
  function playOn(fen,u){try{const g=new Chess(fen),m=g.move(typeof u==="string"?uciMove(u):u);return m?{m:m,after:g.fen(),mate:g.in_checkmate(),check:g.in_check()}:null}catch(e){return null}}
  function withSide(fen,c){const p=String(fen).split(" ");p[1]=c;p[3]="-";return p.join(" ")}
  function between(a,b){
    const f0=FILES.indexOf(a[0]),r0=+a[1],f1=FILES.indexOf(b[0]),r1=+b[1],df=Math.sign(f1-f0),dr=Math.sign(r1-r0);
    if(!(f0===f1||r0===r1||Math.abs(f1-f0)===Math.abs(r1-r0)))return null;
    const out=[];let f=f0+df,r=r0+dr;while(f!==f1||r!==r1){out.push(FILES[f]+r);f+=df;r+=dr}return out;
  }
  const PN=(B,sq,own)=>(own?own+" ":"the ")+(B[sq]?NAME[B[sq].t]:"piece")+" on "+sq;
  const list=a=>a.length<2?a.join(""):a.slice(0,-1).join(", ")+" and "+a[a.length-1];
  /* what side `c` would win if it could move again right now (1 ply, facts only): mate, or a capture that wins material */
  function threatOf(fen,c){
    let g=null;try{g=new Chess();if(!g.load(withSide(fen,c)))return null}catch(e){return null}
    const B=parse(fen),ms=g.moves({verbose:true});
    for(const m of ms){const t=new Chess(g.fen());t.move(m);if(t.in_checkmate())return{uci:m.from+m.to,san:m.san,kind:"mate",text:m.san+" would be checkmate"}}
    let best=null;
    ms.filter(m=>m.captured&&m.captured!=="k").forEach(m=>{const def=attackers(B,m.to,other(c)).length,gain=def?VAL[m.captured]-VAL[m.piece]:VAL[m.captured];
      if(gain>=2&&(!best||gain>best.gain))best={uci:m.from+m.to,san:m.san,kind:"win",gain:gain,text:m.san+" would win the "+NAME[m.captured]+" on "+m.to+(def?" for a "+NAME[m.piece]:", which has no defender")}});
    return best;
  }
  function kingRoom(fen,c){try{const g=new Chess();if(!g.load(withSide(fen,c)))return 0;return g.moves({verbose:true}).filter(m=>m.piece==="k").length}catch(e){return 0}}
  function mobility(fen,sq){try{const B=new Chess(fen),p=B.get(sq);if(!p)return 0;const g=new Chess();if(!g.load(withSide(fen,p.color)))return 0;return g.moves({square:sq,verbose:true}).length}catch(e){return 0}}
  function diagnose(r){
    try{
      const fen=r.fen,me=r.color||(String(fen).split(" ")[1]||"w"),them=other(me);
      const pu=r.played&&r.played.from?{from:r.played.from,to:r.played.to,promotion:r.played.promotion||"q"}:r.playedUci;
      const P=pu?playOn(fen,pu):null;if(!P)return null;
      const R=r.replyUci?playOn(P.after,r.replyUci):null,Bm=r.bestUci?playOn(fen,r.bestUci):null;
      const ps=P.m.san,rs=R?R.m.san:"",bs=Bm?Bm.m.san:"";
      const B0=parse(fen),B1=parse(P.after),B2=R?parse(R.after):null;
      const mover=NAME[P.m.piece],ksq=kingSq(B1,me);
      const out={k:"S",id:"positional",why:"",error:"",alarm:null,wp:null,action:"",find:"",refute:"",played:ps,best:bs,reply:rs};
      /* why: their last move */
      const opp=r.prevFen&&r.oppUci?moveFacts(r.prevFen,r.oppUci,me):null;
      let th=null;
      if(r.threatUci){const t=playOn(withSide(fen,them),r.threatUci);if(t&&(t.mate||t.m.captured||t.check))th={uci:String(r.threatUci).slice(0,4),san:t.m.san,kind:t.mate?"mate":"win",text:t.m.san+(t.mate?" would be checkmate":t.m.captured?" would take the "+NAME[t.m.captured]+" on "+t.m.to:" would give check")}}
      if(!th)th=threatOf(fen,them);
      if(opp)out.why=opp.san+": "+(opp.quiet?"a quiet move that attacks nothing you can lose at once.":factText(opp,2).replace(/^It /,"it "))+(th?" Its point: "+th.text+" if you let it.":" It threatens nothing concrete, so you had time for your own idea.");
      else out.why=th?"Their threat in this position: "+th.text+".":"No direct threat from their side here.";
      out.refute=rs?(R.mate?rs+" is checkmate.":"After "+ps+", "+rs+" is their best answer."):"";
      const set=(id,k,error,alarm,wp,action,find)=>Object.assign(out,{id:id,k:k,error:error,alarm:alarm,wp:{k:k,text:wp},action:action,find:find});
      /* 1. allowed mate */
      if(R&&R.mate){const room=kingRoom(P.after,me);
        return set("allowedMate","C",ps+" allows "+rs+": checkmate. Your king on "+ksq+" had "+(room?room+" free square"+(room===1?"":"s"):"no free square")+" and their "+NAME[R.m.piece]+" could reach a checking square.",
          {label:"A king with no air",say:"Your king on "+ksq+" had "+(room?"only "+room:"no")+" escape square"+(room===1?"":"s")+" while their "+NAME[R.m.piece]+" could give check."},
          "After my move, list every check they have before I let go of the piece.","Before "+ps+", look at their checks: "+rs+" was one of them, and it mates. Make room for the king or cover "+R.m.to+" first.",
          bs?"Count their checks after your candidate move. "+bs+" keeps "+R.m.to+" covered or gives the king air.":"Count their checks after your candidate move.")}
      /* 2. missed mate */
      if(Bm&&Bm.mate){const ek=kingSq(B0,them),room=kingRoom(fen,them);
        return set("missedMate","P","You had mate: "+bs+". Their king on "+ek+" had "+(room||"no")+" escape square"+(room===1?"":"s")+".",
          {label:"Their king has no escape",say:"Their king on "+ek+" had "+(room?"only "+room:"no")+" free square"+(room===1?"":"s")+": every check is a mate candidate."},
          "Start every move with my own checks, most forcing first.","When their king has no air, play through every check before anything else: "+bs+" was mate.",
          "List your checks first ("+bs+" is one), then ask for each one: where can the king go?")}
      /* 3. a blocker left its line: the refutation runs through the square the moved piece left */
      if(R&&/[brq]/.test(R.m.piece)){
        let tgt=null;
        const path=between(R.m.from,R.m.to);if(path&&path.indexOf(P.m.from)>=0)tgt={sq:R.m.to,how:"path"};
        if(!tgt){attacksFrom(B2,R.m.to).forEach(s=>{if(tgt||!B2[s]||B2[s].c!==me||(B2[s].t!=="k"&&VAL[B2[s].t]<3))return;const bt=between(R.m.to,s);if(bt&&bt.indexOf(P.m.from)>=0)tgt={sq:s,how:"line"}})}
        if(tgt){
          const hits=attacksFrom(B2,R.m.to).filter(s=>B2[s]&&B2[s].c===me&&(B2[s].t==="k"||VAL[B2[s].t]>=3)).map(s=>(B2[s].t==="k"?"your king":"your "+NAME[B2[s].t])+" on "+s);
          const lineName=R.m.from[0]===R.m.to[0]?"the "+R.m.from[0]+"-file":R.m.from[1]===R.m.to[1]?"rank "+R.m.from[1]:"the diagonal";
          return set("blocker","C","Your "+mover+" on "+P.m.from+" was the piece blocking "+lineName+" between their "+NAME[R.m.piece]+" on "+R.m.from+" and "+(tgt.how==="path"&&B1[R.m.to]?"your "+NAME[B1[R.m.to].t]+" on "+R.m.to:tgt.sq)+". "+ps+" moved it away, so "+rs+(R.check?" comes with check":"")+(hits.length?" and hits "+list(hits):"")+".",
            {label:"A blocker on a line",say:"Your "+mover+" on "+P.m.from+" stood between their "+NAME[R.m.piece]+" on "+R.m.from+" and your camp. A blocker may only leave when nothing behind it can be hit."},
            "Before a piece leaves its square, check what it was shielding.","Before "+ps+", look along "+lineName+" through "+P.m.from+": their "+NAME[R.m.piece]+" on "+R.m.from+" is waiting behind your "+mover+". Keep the "+mover+" there, or move the targets first"+(bs?" ("+bs+" does that)":"")+".",
            "Ask of every candidate move: which line does this piece open when it leaves? Then calculate their capture or check down that line."+(bs?" "+bs+" passes that test.":""))}
      }
      /* 4. their threat was already there and the move ignored it */
      if(R&&th&&String(th.uci).slice(0,4)===R.m.from+R.m.to)
        return set("ignoredThreat","M",(opp?opp.san+" set up "+th.san+". ":"Their threat was "+th.san+". ")+ps+" did nothing about it, and "+rs+" came anyway.",
          {label:"Their last move made a threat",say:(opp?opp.san+" ":"Their position ")+"aimed at "+th.text.replace(/^\S+ would /,"")+"."},
          "After every move of theirs, name their threat before I think about my own plan.","When they moved, ask “what do they want to play next?” Here the answer was "+th.san+". Stop it first"+(bs?" ("+bs+")":"")+", then go on with your plan.",
          (bs?bs+" deals with "+th.san+". ":"")+"A human finds it by asking the M question first: what does their last move threaten?")
      /* 5. a defender walked away */
      if(R&&R.m.captured&&B0[R.m.to]&&B0[R.m.to].c===me&&attacksFrom(B0,P.m.from).indexOf(R.m.to)>=0&&attacksFrom(B1,P.m.to).indexOf(R.m.to)<0){
        const left=attackers(B1,R.m.to,me).length;
        return set("leftDefence","S","Your "+mover+" on "+P.m.from+" was "+(left?"one of the defenders":"the only defender")+" of your "+NAME[R.m.captured]+" on "+R.m.to+". "+ps+" took it away, and "+rs+" wins it.",
          {label:"A defender with a job",say:"The "+mover+" on "+P.m.from+" was guarding the "+NAME[R.m.captured]+" on "+R.m.to+". A piece with a job cannot just leave."},
          "Before I move a piece, name what it defends.","Before "+ps+", ask: what does my "+mover+" defend right now? The "+NAME[R.m.captured]+" on "+R.m.to+". Who defends it after my move? "+(left?"Not enough.":"Nobody.")+" Then pick another move"+(bs?" ("+bs+")":"")+".",
          "Make a quick list of your loose pieces after each candidate move."+(bs?" After "+bs+" nothing of yours hangs.":""))}
      /* 6. the moved piece itself was left en prise */
      if(R&&R.m.captured&&R.m.to===P.m.to){
        const att=attackers(B1,P.m.to,them).length,def=attackers(B1,P.m.to,me).length;
        return set("hanging","C",ps+" put the "+mover+" on "+P.m.to+", where "+(def?"it is attacked "+att+" time"+(att===1?"":"s")+" and defended "+def+" time"+(def===1?"":"s")+" by more valuable pieces":"it has no defender")+". "+rs+" takes it.",
          {label:"A square they control",say:P.m.to+" was covered by "+att+" of their piece"+(att===1?"":"s")+(def?" and only "+def+" of yours":" and none of yours")+"."},
          "Before I put a piece on a square, count its attackers and defenders.","Before "+ps+", count on "+P.m.to+": "+att+" attacker"+(att===1?"":"s")+" against "+def+" defender"+(def===1?"":"s")+". With fewer defenders, choose another square"+(bs?" ("+bs+")":"")+".",
          "Count attackers and defenders on the target square of every candidate move.")}
      /* 7. the reply hits two things at once */
      if(R&&B2){
        const hits=attacksFrom(B2,R.m.to).filter(s=>B2[s]&&B2[s].c===me&&(B2[s].t==="k"||VAL[B2[s].t]>VAL[R.m.piece]||!attackers(B2,s,me).length));
        if(hits.length>=2&&hits.some(s=>B2[s].t==="k"||VAL[B2[s].t]>=3)){const names=hits.map(s=>(B2[s].t==="k"?"your king":"your "+NAME[B2[s].t])+" on "+s);
          return set("doubleAttack","C","After "+ps+", "+rs+" hits "+list(names)+" at once"+(R.check?" (with check)":"")+". One of them falls.",
            {label:"Two targets for one piece",say:list(names.map(x=>x.replace(/^your /,"")))+" stood where one "+NAME[R.m.piece]+" on "+R.m.to+" could reach both."},
            "After my move, check every square from which one of their pieces hits two of mine.","Before "+ps+", ask what their most forcing reply is: "+rs+" hits two of your pieces at once. Move one of the targets, or take control of "+R.m.to+" first"+(bs?" ("+bs+")":"")+".",
            "For each candidate move, look one move deeper at their checks, captures and attacks on two pieces."+(bs?" After "+bs+" no such double attack exists.":""))}
      }
      /* 8. a forcing move was missed */
      if(Bm){const bf=moveFacts(fen,r.bestUci,me),sf=solutionFacts(fen,[r.bestUci],me);
        const win=Bm.m.captured&&(!attackers(B0,Bm.m.to,them).length||VAL[Bm.m.captured]>VAL[Bm.m.piece]);
        if(win||Bm.check||(sf&&sf.motif==="double attack")||(bf&&bf.facts.some(x=>x.k==="threat"||x.k==="line"))){
          const what=sf&&sf.motif==="double attack"?sf.text:bs+": "+(factText(bf,2)||"a forcing move");
          const cc=cca(fen);
          return set("missedTactic","P","You had a forcing move: "+what+" "+ps+" is quieter and lets them off the hook.",
            {label:win?"A loose piece on their side":"A forcing move is available",say:win?"Their "+NAME[Bm.m.captured]+" on "+Bm.m.to+" could be won.":"You had "+cc.checks.length+" check"+(cc.checks.length===1?"":"s")+" and "+cc.wins.length+" winning capture"+(cc.wins.length===1?"":"s")+" here."},
            "Before a quiet move, list my checks, captures and threats.","Before "+ps+", go through your checks and captures one by one: "+bs+" was among them"+(win?" and it wins material":"")+".",
            "Scan forcing moves first: "+(cc.checks.length?"checks "+cc.checks.slice(0,3).join(", ")+"; ":"")+(cc.wins.length?"captures "+cc.wins.slice(0,3).join(", "):"captures that win something")+". "+bs+" is the one that works.")}
      }
      /* 9. positional: compare what the better move does with what the played move does */
      const bfx=Bm?moveFacts(fen,r.bestUci,me):null,pfx=moveFacts(fen,pu,me);
      const kf=bfx&&bfx.facts.filter(x=>/king|file|opened|passed|threat|capture/.test(x.k))[0];
      let mob="";if(Bm){const m0=mobility(fen,Bm.m.from),m1=mobility(Bm.after,Bm.m.to);if(m1>=m0+3)mob="It brings the "+NAME[Bm.m.piece]+" from "+m0+" to "+m1+" squares."}
      const shield=pfx&&pfx.facts.filter(x=>x.k==="shield"||x.k==="undefend"||x.k==="hang")[0];
      const lc=t=>String(t||"").replace(/^It /,"it ");
      const reason=shield?shield.t:kf?bs+" was better: "+lc(kf.t):mob?bs+" was better. "+mob:bs?bs+" was better: "+(lc(factText(bfx,1))||"it keeps your pieces working together."):"Another move was better.";
      return set("positional","S","No tactic punishes "+ps+" at once, but it gives something away. "+reason+(rs?" After "+ps+", "+rs+" improves their position.":""),
        shield?{label:"A move that weakens your camp",say:shield.t}:kf?{label:"Where the play is",say:kf.t}:mob?{label:"A passive piece",say:"Your "+NAME[Bm.m.piece]+" on "+Bm.m.from+" had only "+mobility(fen,Bm.m.from)+" squares."}:{label:"No forcing move on either side",say:"Nothing hangs and no check works: the game is about improving pieces."},
        shield?"Before a pawn or piece move near my king, ask what it weakens.":mob?"In quiet positions, improve my worst piece first.":"In quiet positions, compare two candidate moves before I play.",
        shield?"Before "+ps+", ask what it gives up: "+shield.t.replace(/^It /,"it ")+(bs?" "+bs+" keeps everything protected.":""):mob?"Ask “which piece is doing the least?”. Here: the "+NAME[Bm.m.piece]+" on "+Bm.m.from+". "+bs+" activates it.":"Pick two candidate moves and compare them on one question: which piece improves?"+(bs?" "+bs+" wins that comparison.":""),
        bs?"Compare "+ps+" with "+bs+": "+(kf?lc(kf.t):mob?lc(mob):lc(factText(bfx,1))||"which one improves a piece without giving anything away?"):"");
    }catch(e){return null}
  }
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
      let al=[];try{al=((r.bestUci&&LC61.relevant?LC61.relevant(r.fen,me,[r.bestUci],[]):LC61.detect(r.fen,me))||[]).filter(a=>a.id!=="loose").slice(0,1)}catch(e){}   /* 9.54.0: only an alarm the better move really uses */
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
    /* 9.56.0: the concrete diagnosis wins over the stock lines (letter, alarm, how to find the move, the next-game step) */
    try{const d=diagnose(r);if(d){out.diag=d;out.k=d.k;if(d.why)out.M=d.why;out.S=d.alarm.label+": "+d.alarm.say;if(d.find)out.P=d.find;if(d.error)out.C=d.error;out.next=d.action;out.plan=d.id==="positional"}}catch(e){}
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
  const ALLOW=/lc42|lc84|lc40-auth|lc53|lc39|lc26/;
  const PROMO=/lc34|lc43|lc45|lc72|lc82|upsell|promo|install/;
  const TASKR=/^(trim|think|bot|shuffle|ranked-shuffle|themes|puzzles|mspc-rep|vision|survival|clinic)$/;
  const GAP=20000,USER_MS=3000;
  let held=[],relT=0,busyAt=0,lvl=null,gestAt=0,autoAt=0,allowTill=0;
  const hashNow=()=>{let h="";try{h=decodeURIComponent((location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){h=""}return h.split("/")[0].split("?")[0]};
  const marathon=()=>!!Q(".lc42-sheet");   /* the marathon itself and the Level sheet that ends it */
  const busy=()=>{if(marathon())busyAt=Date.now();return Date.now()-busyAt<4000};
  const reviewing=()=>{const b=Q("#an-review-bar");return !!b&&!b.hidden};
  const userish=()=>Date.now()-gestAt<USER_MS||Date.now()<allowTill;
  /* should this pop-up wait? auto = nobody tapped for it */
  function blocked(o,auto){
    const cls=String(o&&o.cls||"");
    if(ALLOW.test(cls))return false;
    if(busy())return true;
    if(!auto)return false;
    if(Q(".sheet-wrap"))return true;
    if(PROMO.test(cls)&&(TASKR.test(hashNow())||Date.now()-autoAt<GAP))return true;
    if(hashNow()==="trim")return true;   /* nothing pops up by itself on top of an analysis: it comes when the person leaves Trim */
    return false;
  }
  /* a caller that opens a pop-up on purpose without a tap (the landing page's ?install=1) */
  function allow(ms){allowTill=Date.now()+(+ms||2500)}
  function wrapSheets(){
    try{
      if(typeof openSheet!=="function"||openSheet.__lc83)return;
      const prev=openSheet;
      const f=function(o){
        try{
          const ti=String(o&&o.title||""),lm=ti.match(/^Level (\d+)$/),dm=ti.match(/^Level (\d+) unlocked$/);
          if(lm&&/lc42/.test(String(o&&o.cls||"")))lvl={n:lm[1],t:Date.now()};
          if(dm&&lvl&&lvl.n===dm[1]&&Date.now()-lvl.t<18e4)return{el:document.createElement("div"),close(){},deferred:true};   /* the same level-up twice: once is enough */
          const auto=!userish();
          if(blocked(o,auto)){
            held=held.filter(x=>x.o.title!==(o&&o.title)).concat([{o:o,t:Date.now()}]).slice(-3);
            schedule();
            return{el:document.createElement("div"),close(){},deferred:true};
          }
          if(auto&&!ALLOW.test(String(o&&o.cls||"")))autoAt=Date.now();
        }catch(e){}
        return prev.apply(this,arguments);
      };
      f.__lc83=true;openSheet=f;
    }catch(e){}
  }
  function schedule(){clearTimeout(relT);relT=setTimeout(release,2500)}
  function release(){
    if(!held.length)return;
    held=held.filter(x=>Date.now()-x.t<15*6e4);
    if(!held.length)return;
    if(blocked(held[0].o,true)||(document.activeElement&&/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))){schedule();return}
    const x=held.shift();if(x){gestAt=0;try{openSheet(x.o)}catch(e){}}
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
      +".lc83-iab p{margin:0 0 8px}.lc83-iab-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lc83-iab .btn{min-height:44px}.lc83-x{margin-left:auto;width:44px;height:44px;border:0;background:transparent;color:#94a3b8;font-size:22px;cursor:pointer}"
      /* Trim on a phone: one column in reading order, nothing sticky for the page to slide under */
      +"@media (max-width:959px){#view:has(.an-grid){display:flex;flex-direction:column;overflow-x:clip}"
      +"#view:has(.an-grid)>.page-head{order:-30!important;margin:0 0 8px;padding:0}#view:has(.an-grid)>.page-head h1{font-size:22px!important;line-height:1.25;margin:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap}#view:has(.an-grid)>.page-head>p,#view:has(.an-grid)>.page-head .lead{display:none}"
      +"#view:has(.an-grid)>.an-grid{order:-10!important;min-width:0}#view:has(.an-grid)>#lc73-pga{order:40}"
      +".an-grid .an-main{display:flex!important;flex-direction:column;min-width:0}"
      +".an-main>.board-shell,.an-main>.nav-row{position:static!important;top:auto!important;max-width:100%!important}"
      +".an-main>#an-meta{order:-4!important}.an-main>.board-shell{order:-3!important}.an-main>.nav-row{order:-2!important}.an-main>#an-interro{order:-1!important}"
      +".an-main>.panel.pad{order:1!important}.an-main>#coach{order:2!important}.an-main>#an-report{order:3!important}.an-main>.cp{order:4!important}.an-main>#an-var{order:5!important}"
      +".an-main:has(#an-moves>*)>#lc39-lib{order:6!important}.an-main>#an-import{order:7!important}.an-main:not(:has(#an-moves>*))>#lc39-lib{order:-6!important}"
      +".an-main>*{min-width:0;max-width:100%}.an-main pre,.an-main .cp,#coach{overflow-wrap:anywhere}}";
    document.head.appendChild(s);
  }
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    if(t.closest("[data-lc83-iabx]")){wr("lc83-iab",Date.now());const b=Q(".lc83-iab");if(b)b.remove();document.documentElement.classList.remove("lc83-has-iab");return}
    if(t.closest("[data-lc83-copy]")){const u=location.origin+"/app.html";(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>{try{toast("Link copied. Paste it in Safari or Chrome.","good")}catch(x){}},()=>{try{prompt("Copy this link:",u)}catch(x){}});return}
  }
  function afterRender(){if(held.length)schedule()}
  /* a finished Trim review on a phone: keep the board in view (the old code jumped to the report at the bottom) */
  function keepBoard(){
    try{
      if(window.innerWidth>=960||hashNow()!=="trim")return false;
      const b=Q(".an-main>.board-shell")||Q("#an-board");if(!b)return false;
      const r=b.getBoundingClientRect();
      if(r.top<-40||r.top>window.innerHeight*0.45)b.scrollIntoView({behavior:"smooth",block:"start"});
      return true;
    }catch(e){return false}
  }
  function init(){
    css();wrapSheets();keyboard();
    document.addEventListener("click",onClick,true);
    ["pointerdown","keydown","touchstart"].forEach(n=>document.addEventListener(n,()=>{gestAt=Date.now()},true));
    setTimeout(iabBar,1500);
  }
  return{init:init,afterRender:afterRender,moveFacts:moveFacts,factText:factText,solutionFacts:solutionFacts,diagnose:diagnose,threatOf:threatOf,explain:explain,cca:cca,threatsBy:threatsBy,loose:loose,parse:parse,attacksFrom:attacksFrom,
    NEXT:NEXT,inApp:inApp,intentUrl:intentUrl,allow:allow,keepBoard:keepBoard,_t:{held:()=>held,release:release,iabBar:iabBar,blocked:blocked,gap:()=>autoAt,touch:t=>{gestAt=t==null?Date.now():t},reset:()=>{autoAt=0;held=[];clearTimeout(relT)}},version:VERSION};
})(); /*@@end lc83*/
