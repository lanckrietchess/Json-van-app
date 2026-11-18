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
  /* ======================= 1c. COACH BRAIN (9.56.0): Stockfish's lines read move by move =======================
     No AI and no stock sentence: every line below is computed from THIS game.
       walk     plays a principal variation and keeps every board on the way
       motifs   what the line really does: fork, pin, skewer, discovered attack, removing the defender, deflection,
                in-between move, trapped piece, promotion, back-rank / smothered mate, a quiet killer
       blind    why a human misses it: hope chess, greed, a backward or long move, a quiet move, the point came later,
                the other wing, the expected recapture
       swing    what the line wins or loses, in pieces
       train    the puzzle theme that trains exactly this pattern
       pattern  how often the same cause or blind spot came back in this player's reviewed games */
  const PV=(a,u)=>(Array.isArray(a)&&a.length?a:u?[u]:[]).filter(x=>/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(String(x)));
  function walk(fen,pv,max){
    const steps=[];let g=null;try{g=new Chess(fen)}catch(e){return steps}
    for(const u of PV(pv).slice(0,max||8)){
      const fb=g.fen();let m=null;try{m=g.move(uciMove(u))}catch(e){m=null}if(!m)break;
      steps.push({m:m,before:fb,after:g.fen(),check:g.in_check(),mate:g.in_checkmate(),B0:parse(fb),B1:parse(g.fen())});
      if(g.game_over())break;
    }
    return steps;
  }
  function sanLine(steps,n){
    return steps.slice(0,n||6).map((s,i)=>{const no=+String(s.before).split(" ")[5]||1;return(s.m.color==="w"?no+".":i===0?no+"...":"")+s.m.san}).join(" ");
  }
  const mat=(B,c)=>Object.keys(B).reduce((t,q)=>t+(B[q].c===c&&B[q].t!=="k"?VAL[B[q].t]:0),0);
  const bal=(B,me)=>mat(B,me)-mat(B,other(me));
  /* material change for `me` over the line, with one look at a capture that is still hanging at the end */
  function swingOf(fen,steps,me){
    if(!steps.length)return{net:0,mate:false,lost:[],won:[]};
    const B0=parse(fen),last=steps[steps.length-1];let net=bal(last.B1,me)-bal(B0,me);
    const lost=[],won=[];steps.forEach(s=>{if(s.m.captured){(s.m.color===me?won:lost).push(NAME[s.m.captured])}if(s.m.promotion)(s.m.color===me?won:lost).push("a new "+NAME[s.m.promotion])});
    if(last.m.captured&&!last.mate){const B=last.B1,sq=last.m.to,p=B[sq];if(p){const att=attackers(B,sq,other(p.c)),def=attackers(B,sq,p.c).length;
      if(att.length){const cheapest=Math.min.apply(null,att.map(a=>VAL[B[a].t]));const back=!def?VAL[p.t]:Math.max(0,VAL[p.t]-cheapest);net+=(p.c===me?-1:1)*back}}}
    return{net:net,mate:last.mate&&last.m.color!==me?"them":last.mate?"me":false,lost:lost,won:won};
  }
  const SLIDE={b:[[1,1],[1,-1],[-1,1],[-1,-1]],r:[[1,0],[-1,0],[0,1],[0,-1]]};SLIDE.q=SLIDE.b.concat(SLIDE.r);
  /* pins and skewers that side `s` has on the board B */
  function lineTricks(B,s){
    const out=[];
    Object.keys(B).forEach(sq=>{const p=B[sq];if(p.c!==s||!SLIDE[p.t])return;const f0=FILES.indexOf(sq[0]),r0=+sq[1];
      SLIDE[p.t].forEach(d=>{let f=f0+d[0],r=r0+d[1],first=null;
        while(on(f,r)){const q=FILES[f]+r,x=B[q];if(x){if(x.c===s)break;if(!first)first=q;else{
          const a=B[first],b=x;
          if(b.t==="k"&&a.t!=="p")out.push({id:"pin",by:sq,front:first,behind:q,abs:true});
          else if(a.t!=="p"&&a.t!=="k"&&VAL[b.t]>=5&&VAL[b.t]>VAL[a.t]&&VAL[a.t]>=VAL[p.t]-2)out.push({id:"pin",by:sq,front:first,behind:q,abs:false});
          else if((a.t==="k"||(VAL[a.t]>=5&&VAL[a.t]>VAL[b.t]))&&VAL[b.t]>=3&&b.t!=="k"&&VAL[b.t]>=VAL[p.t]-2)out.push({id:"skewer",by:sq,front:first,behind:q});
          break}}f+=d[0];r+=d[1]}})});
    return out;
  }
  const key=t=>t.id+t.by+t.front+t.behind;
  /* the targets one piece hits that are worth more than it, undefended, or the king */
  const targetsOf=(B,sq)=>{const p=B[sq];if(!p)return[];return attacksFrom(B,sq).filter(t=>B[t]&&B[t].c!==p.c&&(B[t].t==="k"||(B[t].t!=="p"&&(VAL[B[t].t]>VAL[p.t]||!attackers(B,t,B[t].c).length))))};
  const nm=(B,sq,own)=>(B[sq]&&B[sq].t==="k"?own+" king":own+" "+(B[sq]?NAME[B[sq].t]:"piece"))+" on "+sq;
  function motifsOf(fen,steps,s,pov){
    const M=[],own=s===pov?"your":"their",vic=s===pov?"their":"your";
    steps.forEach((st,i)=>{if(st.m.color!==s)return;const B0=st.B0,B1=st.B1,m=st.m;
      if(st.mate){const ks=m.to,kk=kingSq(B1,other(s)),home=other(s)==="w"?"1":"8",nb=zone(kk).filter(q=>q!==kk);
        if(m.piece==="n"&&nb.every(q=>(B1[q]&&B1[q].c===other(s))||attacksFrom(B1,ks).indexOf(q)>=0))M.push({id:"smothered",ply:i,label:"Smothered mate",text:m.san+" is a smothered mate: the king on "+kk+" is boxed in by its own pieces."});
        else if(kk[1]===home&&/[rq]/.test(m.piece)&&m.to[1]===home)M.push({id:"backRank",ply:i,label:"Back-rank mate",text:m.san+" mates on the back rank: the pawns in front of the king on "+kk+" took away its escape squares."});
        else M.push({id:"mateNet",ply:i,label:"Mating net",text:m.san+" is checkmate."});return}
      if(m.promotion){M.push({id:"promotion",ply:i,label:"Promotion",text:"The pawn promotes with "+m.san+"."});}
      const tg=targetsOf(B1,m.to);
      /* a real fork: they cannot just take the forking piece (a defended piece that only something bigger can take is fine) */
      const fa=attackers(B1,m.to,other(s)),safe=!fa.length||(defended(B1,m.to)&&fa.every(a=>VAL[B1[a].t]>VAL[m.piece]));
      if(safe&&tg.length>=2&&tg.some(q=>B1[q].t==="k"||VAL[B1[q].t]>=3))M.push({id:"fork",ply:i,label:m.piece==="n"?"Knight fork":m.piece==="p"?"Pawn fork":"Fork",text:m.san+" forks "+list(tg.map(q=>nm(B1,q,vic)))+"."});
      /* discovered attack: another long-range piece of `s` now hits something big */
      Object.keys(B1).forEach(q=>{const x=B1[q];if(x.c!==s||q===m.to||!SLIDE[x.t])return;const a0=B0[q]&&B0[q].t===x.t?attacksFrom(B0,q):[];
        attacksFrom(B1,q).filter(t=>a0.indexOf(t)<0&&B1[t]&&B1[t].c!==s&&(B1[t].t==="k"||VAL[B1[t].t]>=3)).slice(0,1).forEach(t=>{
          if(!M.some(z=>z.id==="discovered"&&z.ply===i))M.push({id:"discovered",ply:i,label:B1[t].t==="k"?"Discovered check":"Discovered attack",text:m.san+" moves out of the way: "+nm(B1,q,own)+" now hits "+nm(B1,t,vic)+"."})})});
      /* new pins and skewers */
      const before={};lineTricks(B0,s).forEach(t=>{before[key(t)]=1});
      lineTricks(B1,s).filter(t=>!before[key(t)]&&(t.by===m.to||t.front===m.to||t.behind===m.to||i===0)).slice(0,1).forEach(t=>{
        M.push(t.id==="pin"?{id:"pin",ply:i,label:"Pin",text:m.san+" pins "+nm(B1,t.front,vic)+" to "+nm(B1,t.behind,vic)+(t.abs?": it cannot move at all.":".")}
          :{id:"skewer",ply:i,label:"Skewer",text:m.san+" skewers "+nm(B1,t.front,vic)+": when it moves, "+nm(B1,t.behind,vic)+" falls."})});
      /* removing the defender / deflection: this capture or check takes away the guard of what is won later */
      const later=steps.slice(i+1).filter(z=>z.m.color===s&&z.m.captured)[0];
      if(later&&(m.captured||st.check)){
        const tsq=later.m.to;
        if(m.captured&&B0[m.to]&&attacksFrom(B0,m.to).indexOf(tsq)>=0&&B0[tsq]&&B0[tsq].c!==s&&!attackers(later.B1,tsq,other(s)).length)M.push({id:"removal",ply:i,label:"Removing the defender",text:m.san+" takes the "+NAME[m.captured]+" that guarded "+tsq+"; then "+later.m.san+" wins on "+tsq+"."});
        else{const ans=steps[i+1];if(ans&&ans.m.color!==s&&ans.m.from!==tsq&&ans.m.to!==tsq&&attacksFrom(B0,ans.m.from).indexOf(tsq)>=0&&attacksFrom(ans.B1,ans.m.to).indexOf(tsq)<0)
          M.push({id:"deflection",ply:i,label:"Deflection",text:m.san+" drags the "+NAME[ans.m.piece]+" away from "+ans.m.from+", where it guarded "+tsq+"; "+later.m.san+" follows."})}}
    });
    return M;
  }
  function trappedIn(B,fen,me){
    let g=null;try{g=new Chess();if(!g.load(withSide(fen,me)))return null}catch(e){return null}
    const ms=g.moves({verbose:true});
    for(const sq of Object.keys(B)){const p=B[sq];if(p.c!==me||p.t==="k"||p.t==="p"||VAL[p.t]<3)continue;
      const att=attackers(B,sq,other(me));if(!att.length)continue;
      if(!(att.some(a=>VAL[B[a].t]<VAL[p.t])||!defended(B,sq)))continue;
      const safe=ms.filter(m=>m.from===sq).filter(m=>{const t=new Chess(g.fen());t.move(m);const B2=parse(t.fen());const a=attackers(B2,m.to,other(me));return !a.length||(m.captured&&VAL[m.captured]>=VAL[p.t])});
      if(!safe.length)return{sq:sq,t:p.t};
    }
    return null;
  }
  const dist=(a,b)=>Math.max(Math.abs(FILES.indexOf(a[0])-FILES.indexOf(b[0])),Math.abs(+a[1]-+b[1]));
  const backward=m=>m.piece!=="p"&&(m.color==="w"?+m.to[1]<+m.from[1]:+m.to[1]>+m.from[1]);
  /* why a human misses it: one blind spot, the first that is true */
  function blindOf(r,P,refSteps,refSwing,pfx,bestSteps,punished){
    const R=refSteps[0],B=bestSteps&&bestSteps[0];
    if(!punished){
      if(!B)return null;const bm=B.m,bs=bm.san;
      if(B.mate)return{id:"ownMate",label:"Your own checks",text:bs+" was mate. When you are attacking, play through every check first, even the ones that look silly.",habit:"Start every move with your own checks, the most forcing first."};
      if(bm.piece==="n"&&(B.check||bestSteps.length>2))return{id:"knight",label:"A knight jump",text:bs+" is a knight move. Knights jump instead of sliding along a line, so the eye does not follow them.",habit:"For every knight, picture its jumps before you choose a move."};
      if(backward(bm))return{id:"ownBackward",label:"A backward move of your own",text:bs+" goes backwards. Our candidate moves usually go forward, so it never got checked.",habit:"Include backward moves in your candidate list."};
      const B1=B.B1;if(!bm.captured&&attackers(B1,bm.to,other(bm.color)).length&&!defended(B1,bm.to)&&bm.piece!=="p")return{id:"sacrifice",label:"A move that gives material",text:bs+" puts the "+NAME[bm.piece]+" where it can be taken. Humans skip moves that seem to give material away; this one works.",habit:"Look at moves that give material when your opponent's king or a piece is exposed."};
      const bf=moveFacts(B.before,bm,bm.color);
      if(!B.check&&!bm.captured&&bf&&bf.facts.some(x=>(x.k==="threat"||x.k==="line")&&/(knight|bishop|rook|queen|king) on/.test(x.t)))return{id:"ownThreat",label:"An attack, not a capture",text:bs+" is no check and no capture, but it attacks: "+factText(bf,1,/threat|line/).replace(/^It /,"it ")+" A scan of only checks and captures skips it.",habit:"In the CCA scan, the A counts: after checks and captures, list the moves that attack something."};
      if(!B.check&&!bm.captured)return{id:"ownQuiet",label:"A quiet move",text:bs+" is no check and no capture. A quiet move that improves your position is found by comparing, not by scanning.",habit:"In quiet positions, compare two candidate moves on one question: which piece improves?"};
      return null}
    if(!R)return null;const rm=R.m,ps=P.m.san,rs=rm.san;
    const forcing=st=>st.check||st.m.captured;
    const gainAt=(()=>{let i=refSteps.findIndex(st=>st.m.color!==P.m.color&&(st.m.captured||st.mate));return i})();
    if(P.m.captured&&rm.to!==P.m.to&&(R.check||(rm.captured&&VAL[rm.captured]>=3)))
      return{id:"intermezzo",label:"The expected recapture never came",text:"After "+ps+" you expected them to take back. "+rs+" comes first"+(R.check?", with check":"")+".",habit:"After every capture, ask: do they have to take back, or is there a check or a bigger capture first?"};
    const fp=lineTricks(R.B0,P.m.color).filter(t=>t.id==="pin"&&!t.abs&&t.front===rm.from)[0];
    if(fp)return{id:"fakePin",label:"A pin that was not a real pin",text:"You counted on the pin of their "+NAME[rm.piece]+" on "+rm.from+". It was pinned to the "+NAME[R.B0[fp.behind].t]+" on "+fp.behind+", not to the king, so it could still move: "+rs+".",habit:"Before you rely on a pin, ask: is it pinned to the king? If not, check what happens when it moves anyway."};
    if(pfx&&pfx.facts.some(x=>/threat|line|check|king/.test(x.k))&&(forcing(R)||refSwing.net<=-2||refSwing.mate))
      return{id:"hope",label:"Looking at your own threat",text:ps+" made a threat of its own, and that is where your attention went. Their answer "+rs+" is stronger than your threat.",habit:"When a move makes a threat, look first at their most forcing reply, then at your threat."};
    if(P.m.captured&&refSwing.net<=-(VAL[P.m.captured]+1))
      return{id:"greed",label:"Material that was not free",text:ps+" took the "+NAME[P.m.captured]+", but the line costs you more than it gave.",habit:"Before you take, ask what the capture gives them: a check, an open line or a loose piece."};
    if(backward(rm))return{id:"backward",label:"A backward move",text:rs+" moves backwards. Our eyes look forward; backward moves are the ones we do not see.",habit:"When you check their replies, include the moves that go backwards."};
    if(/[bqr]/.test(rm.piece)&&dist(rm.from,rm.to)>=4)return{id:"long",label:"A long-range move",text:"Their "+NAME[rm.piece]+" comes from "+rm.from+", "+dist(rm.from,rm.to)+" squares away. Long moves from the other side of the board are easy to miss.",habit:"Before you move, follow every open line of their bishops, rooks and queen to the end."};
    if(!forcing(R)&&(refSwing.net<=-2||refSwing.mate))return{id:"quiet",label:"A quiet move",text:rs+" is no check and no capture, so a quick scan of their checks and captures misses it. It still wins.",habit:"After the checks and captures, ask one more question: which quiet move of theirs makes a new threat?"};
    if(gainAt>=2)return{id:"late",label:"The point came later",text:"Nothing is lost on their first move. The damage comes "+Math.ceil(gainAt/2)+" move"+(gainAt>=4?"s":"")+" later in the line: "+sanLine(refSteps,gainAt+1)+".",habit:"When their reply is forcing, calculate one move further than feels necessary."};
    if(Math.abs(FILES.indexOf(P.m.to[0])-FILES.indexOf(rm.to[0]))>=4)return{id:"wing",label:"The other side of the board",text:ps+" was played on the "+(FILES.indexOf(P.m.to[0])<4?"queenside":"kingside")+"; the punishment comes on the "+(FILES.indexOf(rm.to[0])<4?"queenside":"kingside")+".",habit:"Before you move, look once at the other side of the board."};
    return null;
  }
  const TRAIN={fork:"fork",pin:"pin",skewer:"skewer",discovered:"discoveredAttack",removal:"capturingDefender",deflection:"deflection",intermezzo:"intermezzo",
    trapped:"trappedPiece",promotion:"promotion",backRank:"backRankMate",smothered:"smotheredMate",mateNet:"mateIn1",quiet:"quietMove",
    counter:"intermezzo",allowedMate:"mateIn1",missedMate:"mateIn1",blocker:"xRayAttack",hanging:"hangingPiece",leftDefence:"hangingPiece",doubleAttack:"fork",missedTactic:"hangingPiece"};
  const TRAIN_LABEL={fork:"Fork",pin:"Pin",skewer:"Skewer",discoveredAttack:"Discovered attack",capturingDefender:"Capturing the defender",deflection:"Deflection",
    intermezzo:"In-between move",counter:"In-between move",trappedPiece:"Trapped piece",promotion:"Promotion",backRankMate:"Back-rank mate",smotheredMate:"Smothered mate",mateIn1:"Mate in 1",
    quietMove:"Quiet move",xRayAttack:"X-ray attack",hangingPiece:"Hanging piece",pawnEndgame:"Pawn endgame",rookEndgame:"Rook endgame",advancedPawn:"Advanced pawn",opening:"Opening",castling:"Castling"};
  /* this player's own history of causes (Trim reviews of their own games only) */
  const MEM="lc83-brain";
  function remember(d,id){
    if(!d||!id)return;const m=rd(MEM,{})||{},it=m.items||{};if(it[id])return;
    it[id]={t:Date.now(),c:d.id,b:d.blind?d.blind.id:"",m:(d.motifs||[]).map(x=>x.id).slice(0,3)};
    const ks=Object.keys(it).sort((a,b)=>it[a].t-it[b].t);while(ks.length>300)delete it[ks.shift()];
    m.items=it;wr(MEM,m);
  }
  function patternOf(d,id){
    try{const it=(rd(MEM,{})||{}).items||{},ks=Object.keys(it).filter(k=>k!==id&&Date.now()-it[k].t<60*864e5);if(ks.length<3)return"";
      const same=f=>ks.filter(k=>f(it[k])).length;
      if(d.blind){const n=same(x=>x.b===d.blind.id);if(n>=2)return"This blind spot (“"+d.blind.label.toLowerCase()+"”) cost you "+(n+1)+" times in your last "+(ks.length+1)+" reviewed mistakes. It is your pattern, so it is your training.";}
      const n=same(x=>x.c===d.id);if(n>=2)return"The same kind of mistake (“"+d.alarm.label.toLowerCase()+"”) came back "+(n+1)+" times in your last "+(ks.length+1)+" reviewed mistakes.";
      const mo=(d.motifs||[])[0];if(mo){const k=same(x=>(x.m||[]).indexOf(mo.id)>=0);if(k>=2)return"The "+mo.label.toLowerCase()+" hit you "+(k+1)+" times in your last "+(ks.length+1)+" reviewed mistakes.";}
    }catch(e){}
    return"";
  }
  /* quiet positions: pawn structure, opening and endgame facts, only when they are true */
  function quietFacts(fen,pu,bestUci,me){
    const F=[];try{
      const P=playOn(fen,pu),Bm=bestUci?playOn(fen,bestUci):null;if(!P)return F;
      const B0=parse(fen),B1=parse(P.after),full=+String(fen).split(" ")[5]||1;
      const pf=(B,c)=>{const o={};Object.keys(B).forEach(q=>{if(B[q].t==="p"&&B[q].c===c)o[q[0]]=(o[q[0]]||0)+1});return o};
      const p0=pf(B0,me),p1=pf(B1,me);
      Object.keys(p1).forEach(f=>{const i=FILES.indexOf(f),iso=B=>!(B[FILES[i-1]]||B[FILES[i+1]]);
        if(p1[f]>=2&&!(p0[f]>=2))F.push({k:"doubled",t:P.m.san+" doubles your pawns on the "+f+"-file."});
        if(iso(p1)&&!(p0[f]&&iso(p0)))F.push({k:"isolated",t:P.m.san+" leaves your "+f+"-pawn isolated: no pawn next to it can ever defend it."})});
      const nonPawn=c=>Object.keys(B0).filter(q=>B0[q].c===c&&/[nbrq]/.test(B0[q].t)).reduce((t,q)=>t+VAL[B0[q].t],0);
      const endgame=nonPawn("w")+nonPawn("b")<=26;
      const cen=q=>Math.max(Math.abs(FILES.indexOf(q[0])-3.5),Math.abs(+q[1]-4.5));
      if(Bm&&endgame&&Bm.m.piece==="k"&&P.m.piece==="k"&&cen(Bm.m.to)<cen(P.m.to))F.push({k:"kingact",t:Bm.m.san+" walks the king toward the centre and the pawns; "+P.m.san+" walks it toward the edge. In the endgame every king step counts."});
      if(Bm&&endgame&&Bm.m.piece==="k"&&P.m.piece!=="k")F.push({k:"kingact",t:"In the endgame the king is a fighting piece: "+Bm.m.san+" brings it closer to the action, "+P.m.san+" leaves it waiting."});
      if(Bm&&endgame&&Bm.m.piece==="r"){const B2=parse(Bm.after);const pp=Object.keys(B2).filter(q=>B2[q].t==="p"&&passed(B2,q)&&q[0]===Bm.m.to[0]);if(pp.length)F.push({k:"rookpass",t:Bm.m.san+" puts the rook on the file of the passed pawn on "+pp[0]+": rooks belong behind passed pawns."})}
      if(Bm&&Bm.m.piece==="p"&&passed(parse(Bm.after),Bm.m.to))F.push({k:"passer",t:Bm.m.san+" pushes a passed pawn: every step forward ties up one of their pieces."});
      if(full<=12){
        const home=me==="w"?"1":"8",undev=Object.keys(B0).filter(q=>B0[q].c===me&&/[nb]/.test(B0[q].t)&&q[1]===home).length;
        if(P.m.piece==="q"&&undev>=2)F.push({k:"earlyq",t:P.m.san+" moves the queen while "+undev+" of your minor pieces are still at home."});
        if(Bm&&/O-O/.test(Bm.m.san)&&!/O-O/.test(P.m.san))F.push({k:"castle",t:Bm.m.san+" was the move: your king was still in the centre."});
        if(Bm&&/[nb]/.test(Bm.m.piece)&&Bm.m.from[1]===home&&!(/[nb]/.test(P.m.piece)&&P.m.from[1]===home)&&undev>=2)F.push({k:"develop",t:Bm.m.san+" develops a piece; "+P.m.san+" does not, with "+undev+" minor pieces still at home."});
      }
      if(Bm){const m0=mobility(fen,Bm.m.from),m1=mobility(Bm.after,Bm.m.to);if(m1>=m0+3)F.push({k:"activate",t:Bm.m.san+" brings your "+NAME[Bm.m.piece]+" from "+m0+" to "+m1+" squares."})}
    }catch(e){}
    return F;
  }
  function diagnose(r){
    const d=diagnoseCore(r);if(!d)return d;
    try{brain(r,d)}catch(e){}
    return d;
  }
  /* adds the line reading to a diagnosis, and replaces a weak cause (missed tactic / positional) when the refutation line shows a motif */
  function brain(r,d){
    const fen=r.fen,me=r.color||(String(fen).split(" ")[1]||"w"),them=other(me);
    const pu=r.played&&r.played.from?{from:r.played.from,to:r.played.to,promotion:r.played.promotion||"q"}:r.playedUci;
    const P=playOn(fen,pu);if(!P)return d;
    const ref=walk(P.after,PV(r.replyPv,r.replyUci),10),best=walk(fen,PV(r.bestPv,r.bestUci),8);
    const rs=swingOf(P.after,ref,me),bsw=swingOf(fen,best,me);
    const pfx=moveFacts(fen,pu,me);
    const mot=motifsOf(P.after,ref,them,me),bmot=motifsOf(fen,best,me,me);
    for(let i=0;i<ref.length&&i<7;i++){const st=ref[i];if(st.m.color!==them||st.check||st.mate)continue;const tr=trappedIn(st.B1,st.after,me);
      if(tr){mot.push({id:"trapped",ply:i,label:"Trapped piece",text:"After "+sanLine(ref,i+1)+" your "+NAME[tr.t]+" on "+tr.sq+" is attacked and has no safe square left."});break}}
    for(let i=2;i<ref.length;i++){const st=ref[i],prev=ref[i-1];
      if(st.m.color===them&&st.check&&prev.m.color===me&&prev.m.captured&&VAL[prev.m.captured]>=3&&st.m.to!==prev.m.to){
        mot.push({id:"counter",ply:i,label:"Their in-between check",text:sanLine(ref,i)+" looks like it wins for you, but "+st.m.san+" comes first, with check."});break}}
    if(ref.length&&!ref[0].check&&!ref[0].m.captured&&(rs.net<=-2||rs.mate==="them")&&!mot.some(x=>x.id==="quiet"))mot.push({id:"quiet",ply:0,label:"Quiet move",text:ref[0].m.san+" is a quiet move, and it still wins."});
    d.motifs=mot;d.bestMotifs=bmot;
    const forced=r.replyMate!=null&&r.replyMate!==""?(me==="w"?+r.replyMate<0:+r.replyMate>0):ref.length<=3;
    const lost=rs.mate==="them"&&forced?"it ends in mate":rs.net<=-1?"you lose "+(rs.net<=-9?"about a queen":rs.net<=-5?"about a rook":rs.net<=-3?"a piece":rs.net===-1?"a pawn":(-rs.net)+" pawns"):"",
      won=bsw.mate==="me"?"it mates":bsw.net>=1?"you win "+(bsw.net>=9?"about a queen":bsw.net>=5?"about a rook":bsw.net>=3?"a piece":bsw.net===1?"a pawn":bsw.net+" pawns"):"";
    d.line={ref:sanLine(ref,6),best:sanLine(best,6),lost:lost,won:won,net:rs.net,bestNet:bsw.net,refU:ref.map(x=>x.m.from+x.m.to+(x.m.promotion||"")),bestU:best.map(x=>x.m.from+x.m.to+(x.m.promotion||"")),after:P.after};
    const punished=/^(missedTactic|missedMate)$/.test(d.id)?rs.net<=-2||rs.mate==="them":rs.net<=-1||rs.mate==="them"||!/^(positional|missedTactic|missedMate)$/.test(d.id);
    d.blind=blindOf(r,P,ref,rs,pfx,best,punished);
    /* a stronger cause from the line itself */
    /* a forced mate in their line beats every other cause */
    if(rs.mate==="them"&&forced&&d.id!=="allowedMate"){const ps=P.m.san,bs=best[0]?best[0].m.san:"",n=Math.ceil(ref.length/2),last=ref[ref.length-1].m.san;
      Object.assign(d,{id:"allowedMate",k:"C",error:ps+" allows a forced mate: "+sanLine(ref,ref.length)+". "+(ref[0].check?"It starts with a check: a forcing line you can calculate to the end.":"It starts with a quiet move, the hardest kind to see."),
        alarm:{label:"A forced mate on the board",say:"After "+ps+" they mate in "+n+" with "+ref[0].m.san+" and "+last+"."},wp:{k:"C",text:"After my move, list every check they have and follow each one to the end."},
        action:"Before "+ps+", play their checks one by one: "+ref[0].m.san+" leads to mate."+(bs?" "+bs+" stops it.":""),find:bs?bs+" is Stockfish's move. It is found by asking first: which checks do they have after my move?":""})}
    const ctr=mot.filter(x=>x.id==="counter")[0];
    if(ctr&&d.id!=="allowedMate"&&rs.net<=-2&&/^(hanging|missedTactic|positional|doubleAttack|leftDefence)$/.test(d.id)){const ps=P.m.san,bs=best[0]?best[0].m.san:"";
      Object.assign(d,{id:"counter",k:"C",error:ps+" sets up a trade that looks good: "+ctr.text+" Stockfish's line: "+d.line.ref+", and "+lost+".",
        alarm:{label:"Their in-between check",say:ctr.text},wp:{k:"C",text:"When I plan a capture, check whether they have a check first."},
        action:"Before "+ps+", play the trade to the end and ask at every step: do they have to take back, or is there a check first?"+(bs?" "+bs+" keeps it simple.":""),
        find:bs?bs+" is Stockfish's move: no trade that depends on them taking back.":""})}
    const gainPly=ref.findIndex(st=>st.m.color===them&&(st.m.captured||st.mate||st.m.promotion));
    const strong=(rs.net<=-1||rs.mate==="them")?mot.filter(x=>/^(fork|pin|skewer|discovered|removal|deflection|trapped|promotion|backRank|smothered)$/.test(x.id)&&(x.id==="trapped"||x.ply===0||x.ply===gainPly||x.ply===gainPly-2))[0]:null;
    if(strong&&/^(missedTactic|positional)$/.test(d.id)){
      const ps=P.m.san,bs=best[0]?best[0].m.san:"";
      const WP={fork:"After my move, check every square from which one of their pieces hits two of mine.",pin:"Before I move, check which of my pieces stand on one line with something bigger behind them.",
        skewer:"Before I move, check which of my big pieces stand on one line with a smaller piece behind them.",discovered:"When their piece stands in front of their own long-range piece, ask what happens when it moves.",
        removal:"Before I move, name which of my pieces does the defending, and what happens if it is taken.",deflection:"Before I move, name which of my pieces does two jobs at once.",
        trapped:"Before I put a piece on a square, count its way back out.",promotion:"Count how many moves their passed pawn needs, and who stops it.",
        backRank:"Give my king air before the back rank becomes a target.",smothered:"Keep a square free next to my king when their knight comes close."}[strong.id];
      const k=/^(pin|skewer|discovered|removal|deflection|backRank|smothered)$/.test(strong.id)?"C":strong.id==="trapped"?"S":strong.id==="promotion"?"S":"C";
      Object.assign(d,{id:strong.id,k:k,error:(/^After /.test(strong.text)?ps+" walks into it. ":"After "+ps+": ")+strong.text+(lost?" In Stockfish's line ("+d.line.ref+") "+lost+".":""),
        alarm:{label:strong.label,say:strong.text},wp:{k:k,text:WP},
        action:"Before "+ps+", play their most forcing replies in your head. "+(ref[0]?ref[0].m.san+" leads to the "+strong.label.toLowerCase()+". ":"")+(bs?bs+" avoids it.":""),
        find:bs?bs+" is Stockfish's move"+(won?" ("+won+")":"")+". "+(best[0]&&(best[0].check||best[0].m.captured)?"It is a check or capture, so a CCA scan finds it.":"A human finds it by asking first what their best reply to "+ps+" would be."):""});
    }
    /* positional: replace the generic comparison with the first true structure / opening / endgame fact */
    if(d.id==="positional"){const qf=quietFacts(fen,pu,r.bestUci,me);
      if(qf.length){const f=qf[0];d.quiet=f.k;d.error=f.t+(qf[1]?" "+qf[1].t:"")+(d.line.best?" Stockfish's line: "+d.line.best+".":"");
        const L={doubled:"Doubled pawns",isolated:"An isolated pawn",kingact:"The king belongs in the game",rookpass:"Rooks behind passed pawns",passer:"A passed pawn to push",earlyq:"The queen out too early",castle:"The king still in the centre",develop:"Pieces still at home",activate:"A passive piece"}[f.k]||d.alarm.label;
        d.alarm={label:L,say:f.t};
        const A={doubled:"Before a capture with a pawn, ask what it does to your pawn structure, and whether a piece can take instead.",isolated:"Before a pawn trade, check which of your pawns will stand alone afterwards.",
          kingact:"Once the queens are off, ask every move: can my king come closer?",rookpass:"In rook endgames, put the rook behind the passed pawn first.",passer:"With a passed pawn, push it whenever it is safe: passed pawns must be pushed.",
          earlyq:"In the first ten moves, develop a knight or bishop before the queen moves twice.",castle:"In the opening, castle before you start an action in the centre.",develop:"In the opening, count your pieces still at home before every move.",
          activate:"In quiet positions, find the piece with the fewest squares and improve it."}[f.k];
        if(A){d.action=A;d.wp={k:"S",text:A}}
      }else if(d.line.best)d.error+=" Stockfish's line: "+d.line.best+".";}
    const m0=mot.filter(x=>x.ply===0&&/^(fork|pin|skewer|discovered|removal|deflection)$/.test(x.id))[0];
    if(m0&&/^(ignoredThreat|hanging|leftDefence)$/.test(d.id)&&d.error.indexOf(m0.text)<0)d.error=d.error.replace(/ came anyway\./," came anyway.")+" "+m0.text;
    /* the line itself, said once, only when it adds something */
    if(lost&&d.line.ref&&d.error.indexOf(d.line.ref)<0&&/^(blocker|hanging|leftDefence|doubleAttack|ignoredThreat)$/.test(d.id))d.error+=" Stockfish's line: "+d.line.ref+", and "+lost+".";
    if(d.blind&&d.action.indexOf(d.blind.habit)<0)d.action+=" "+d.blind.habit;
    const spec=x=>x&&/^(fork|pin|skewer|discovered|removal|deflection|trapped|promotion|backRank|smothered)$/.test(x.id);
    const mine=/^(missedTactic|missedMate)$/.test(d.id)?bmot.filter(spec)[0]:mot.filter(spec)[0];
    const own=/^(counter|blocker|hanging|leftDefence|doubleAttack|fork|pin|skewer|discovered|removal|deflection|trapped|promotion|backRank|smothered)$/.test(d.id)?TRAIN[d.id]:"";
    const QT={kingact:"pawnEndgame",rookpass:"rookEndgame",passer:"advancedPawn",earlyq:"opening",castle:"castling",develop:"opening"};
    const theme=own||(mine&&TRAIN[mine.id])||TRAIN[d.id]||(d.quiet&&QT[d.quiet])||"";
    if(d.id==="missedTactic"&&mine){d.alarm={label:mine.label+" was there",say:mine.text};if(d.error.indexOf(mine.text)<0&&!/two targets/.test(d.error))d.error=d.error.replace(/ ([^ ]+) is quieter/," "+mine.text+" $1 is quieter")}
    let th2=theme;if(d.id==="allowedMate"){const n=Math.max(1,Math.ceil(ref.length/2));th2=mot.some(x=>x.id==="backRank")?"backRankMate":mot.some(x=>x.id==="smothered")?"smotheredMate":n===1?"mateIn1":n===2?"mateIn2":"mate"}
    d.train=th2?{theme:th2,label:TRAIN_LABEL[th2]||({mateIn2:"Mate in 2",mate:"Checkmate"})[th2]||th2}:null;
    d.pattern=patternOf(d,r.memKey||"");
    return d;
  }
  function diagnoseCore(r){
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
      if(R&&R.mate){
        let sq=[];try{const g=new Chess();if(g.load(withSide(P.after,me)))sq=g.moves({verbose:true}).filter(m=>m.piece==="k").map(m=>m.to)}catch(e){}
        const Bx=Object.assign({},B2);delete Bx[ksq];const covered=sq.filter(q=>attackers(Bx,q,them).length),home=me==="w"?"1":"8",rank=ksq[1]===home&&R.m.to[1]===home;
        const air=!sq.length?"had no free square at all":covered.length===sq.length?"could only go to "+list(sq)+(rank?", on the same back rank":"")+", and "+(sq.length===1?"that square is":"those squares are")+" covered too":"had "+list(sq);
        return set("allowedMate","C",ps+" allows "+rs+": checkmate. Your king on "+ksq+" "+air+".",
          {label:rank?"A back rank with no air":"A king with no air",say:rank?"Your king on "+ksq+" had no square off the back rank, and their "+NAME[R.m.piece]+" could reach "+R.m.to+".":"Your king on "+ksq+" had no safe square once their "+NAME[R.m.piece]+" reached "+R.m.to+"."},
          "After my move, list every check they have before I let go of the piece.","Before "+ps+", look at their checks: "+rs+" was one of them, and it mates. Make room for the king or cover "+R.m.to+" first.",
          bs?"Count their checks after your candidate move. "+bs+" keeps "+R.m.to+" covered or gives the king air.":"Count their checks after your candidate move.")}
      /* 2. missed mate */
      if(Bm&&Bm.mate){const ek=kingSq(B0,them),room=kingRoom(fen,them);
        return set("missedMate","P","You had mate: "+bs+". Their king on "+ek+" had "+(room||"no")+" escape square"+(room===1?"":"s")+".",
          {label:"Their king has no escape",say:"Their king on "+ek+" had "+(room?"only "+room:"no")+" free square"+(room===1?"":"s")+": every check is a mate candidate."},
          "Start every move with my own checks, most forcing first.","When their king has no air, play through every check before anything else: "+bs+" was mate.",
          "List your checks first ("+bs+" is one), then ask for each one: where can the king go?")}
      /* 3. a blocker left its line: the refutation runs through the square the moved piece left */
      if(R&&/[brq]/.test(R.m.piece)&&R.m.to!==P.m.to){
        let tgt=null;
        const path=between(R.m.from,R.m.to);if(path&&path.indexOf(P.m.from)>=0)tgt={sq:R.m.to,how:"path"};
        if(!tgt){attacksFrom(B2,R.m.to).forEach(s=>{if(tgt||!B2[s]||B2[s].c!==me||(B2[s].t!=="k"&&VAL[B2[s].t]<3))return;const bt=between(R.m.to,s);if(bt&&bt.indexOf(P.m.from)>=0)tgt={sq:s,how:"line"}})}
        if(tgt){
          const hits=attacksFrom(B2,R.m.to).filter(s=>B2[s]&&B2[s].c===me&&(B2[s].t==="k"||VAL[B2[s].t]>=3)).map(s=>(B2[s].t==="k"?"your king":"your "+NAME[B2[s].t])+" on "+s);
          const la=tgt.how==="path"?R.m.from:R.m.to,lb=tgt.how==="path"?R.m.to:tgt.sq;
          const lineName=la[0]===lb[0]?"the "+la[0]+"-file":la[1]===lb[1]?"rank "+la[1]:"the "+la+"–"+lb+" diagonal";
          return set("blocker","C","Your "+mover+" on "+P.m.from+" was the piece blocking "+lineName+" between their "+NAME[R.m.piece]+" on "+(tgt.how==="path"?R.m.from:R.m.to)+" and "+(tgt.how==="path"&&B1[R.m.to]?"your "+NAME[B1[R.m.to].t]+" on "+R.m.to:B2[tgt.sq]?nm(B2,tgt.sq,"your"):tgt.sq)+". "+ps+" moved it away, so "+rs+(R.check?" comes with check":"")+(hits.length?", hitting "+list(hits):"")+".",
            {label:"A blocker on a line",say:"Your "+mover+" on "+P.m.from+" stood between their "+NAME[R.m.piece]+" on "+R.m.from+" and your camp. A blocker may only leave when nothing behind it can be hit."},
            "Before a piece leaves its square, check what it was shielding.","Before "+ps+", look along "+lineName+" through "+P.m.from+": their "+NAME[R.m.piece]+" on "+R.m.from+" is waiting behind your "+mover+". Keep the "+mover+" there, or move the targets first"+(bs?" ("+bs+" does that)":"")+".",
            "Ask of every candidate move: which line does this piece open when it leaves? Then calculate their capture or check down that line."+(bs?" "+bs+" passes that test.":""))}
      }
      /* 4. their threat was already there and the move ignored it */
      if(R&&!(th&&String(th.uci).slice(0,4)===R.m.from+R.m.to)&&R.m.captured&&(!attackers(B1,R.m.to,me).length||VAL[R.m.captured]>VAL[R.m.piece])&&R.m.to!==P.m.to&&B0[R.m.from]&&B0[R.m.from].c===them&&(!R.m.captured||(B0[R.m.to]&&B0[R.m.to].t===R.m.captured))){
        const t0=playOn(withSide(fen,them),R.m.from+R.m.to+(R.m.promotion||""));
        if(t0&&t0.m.san.replace(/[+#]/,"")===rs.replace(/[+#]/,""))th={uci:R.m.from+R.m.to,san:t0.m.san,kind:"win",text:t0.m.san+(R.m.captured?" would take the "+NAME[R.m.captured]+" on "+R.m.to:" would give check")};
      }
      if(R&&th&&String(th.uci).slice(0,4)===R.m.from+R.m.to)
      {let was=false;try{if(r.prevFen){const t1=playOn(r.prevFen,th.uci);was=!!t1&&t1.m.san.replace(/[+#]/,"")===th.san.replace(/[+#]/,"")}}catch(e){}
        return set("ignoredThreat","M",(opp&&!was?opp.san+" set up "+th.san+". ":th.san+" was already on the board. ")+ps+" did nothing about it, and "+rs+" came anyway.",
          {label:opp&&!was?"Their last move made a threat":"A threat still on the board",say:"Their threat: "+th.text+"."},
          "After every move of theirs, name their threat before I think about my own plan.","When they moved, ask “what do they want to play next?” Here the answer was "+th.san+". Stop it first"+(bs?" ("+bs+")":"")+", then go on with your plan.",
          (bs?bs+" deals with "+th.san+". ":"")+"A human finds it by asking the M question first: what does their last move threaten?")}
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
        const cheap=attackers(B1,P.m.to,them).map(a=>B1[a]).filter(x=>x&&VAL[x.t]<VAL[P.m.piece]);
        return set("hanging","C",ps+" put the "+mover+" on "+P.m.to+", where "+(!def?"it has no defender":cheap.length?"a "+NAME[cheap[0].t]+" can take it, and a defender does not help when the attacker is worth less":"it is attacked "+att+" time"+(att===1?"":"s")+" and defended only "+def+" time"+(def===1?"":"s"))+". "+rs+" takes it.",
          {label:"A square they control",say:cheap.length&&def?"Their "+NAME[cheap[0].t]+" covers "+P.m.to+": a defender does not help when the attacker is cheaper.":P.m.to+" was covered by "+att+" of their piece"+(att===1?"":"s")+(def?" and only "+def+" of yours":" and none of yours")+"."},
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
        const realThreat=bf&&bf.facts.some(x=>(x.k==="threat"||x.k==="line")&&/(knight|bishop|rook|queen|king) on/.test(x.t));
        if(win||Bm.check||(sf&&sf.motif==="double attack")||realThreat){
          const what=sf&&sf.motif==="double attack"?sf.text:bs+": "+(factText(bf,2,/capture|check|mate|threat|line|king|passed|file/)||"a forcing move");
          const cc=cca(fen);
          return set("missedTactic","P","You had a forcing move: "+what+" "+ps+" is quieter and lets them off the hook.",
            {label:win?"A loose piece on their side":"A forcing move is available",say:win?"Their "+NAME[Bm.m.captured]+" on "+Bm.m.to+" could be won.":Bm.check?bs+" was one of your "+cc.checks.length+" check"+(cc.checks.length===1?"":"s")+".":(factText(bf,1)||bs+" made a threat.").replace(/^It /,bs+" ")},
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
    if(window.__lcIab==="soft")return;   /* 9.59.0: in LC87's soft mode the player first gets the review here; LC94's "Keep this review" step sends them to Chrome / Safari after it */
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
  return{init:init,afterRender:afterRender,moveFacts:moveFacts,factText:factText,solutionFacts:solutionFacts,diagnose:diagnose,threatOf:threatOf,walk:walk,motifsOf:motifsOf,swingOf:swingOf,sanLine:sanLine,lineTricks:lineTricks,trappedIn:trappedIn,attackers:attackers,kingRoom:kingRoom,passed:passed,playOn:playOn,withSide:withSide,kingSq:kingSq,remember:remember,patternOf:patternOf,quietFacts:quietFacts,explain:explain,cca:cca,threatsBy:threatsBy,loose:loose,parse:parse,attacksFrom:attacksFrom,
    NEXT:NEXT,inApp:inApp,intentUrl:intentUrl,allow:allow,keepBoard:keepBoard,_t:{held:()=>held,release:release,iabBar:iabBar,blocked:blocked,gap:()=>autoAt,touch:t=>{gestAt=t==null?Date.now():t},reset:()=>{autoAt=0;held=[];clearTimeout(relT)}},version:VERSION};
})(); /*@@end lc83*/
