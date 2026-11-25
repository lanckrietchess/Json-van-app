/*@@module lc103*/
const LC103=(()=>{
  "use strict";
  /* LC103 (build 9.69.0): the Moment Finder and the Showbar of the Creator Studio. One strong game, many clips.
     1. Moment Finder (Studio menu > ◆ Moments, or Game-to-Script > "Find every moment"): any PGN (paste, .pgn file, the game on the Studio
        board, the Game-to-Script game, the Student Game Library, your own or any player's recent Chess.com / Lichess games) is scanned by
        Stockfish ON THIS DEVICE, every position of the whole game, both sides (or one side). No cap on how many moments are kept.
     2. Per position: Stockfish's best lines (MultiPV) plus a probe of the moves a human or blitz player would play first ("instinct" ranking:
        recaptures, captures, checks, saving an attacked piece, development, castling, threats; giving material, retreats and king walks rank
        low). That gives seven kinds of moments, all read off the engine and the board, never invented:
          Blunder ?? / Mistake ? / Inaccuracy ?!   win chance lost (30 / 20 / 10 points, the Trim thresholds; "still crushing" is not flagged)
          Great !          the only move: the next best move drops 15+ points (not a trivial recapture), or it punishes their mistake
          Brilliant !!     a sound sacrifice: material stays down after their reply and your next move, the eval holds, not already won
          Top Engine ★     Stockfish's first choice that instinct ranks low (a quiet move, a retreat, a backward knight…)
          Minefield ◆      several natural-looking moves lose 15+ points and only one or two hold, whatever was played
     3. Every moment gets a clip score (0-100): contrast (how big the gap between the instinct and the right move), the instinct trap
        (how natural the wrong move looks, or how hard the right one is to see), the payoff (material, mate, a result that flips) and clarity
        (a forcing, short refutation). The full list stays available; "Best clips first" sorts by that score. Mistakes are explained by
        LC83.diagnose (the honest coach); the one-line reason names the instinct trap and the better, MSPC-style continuation.
     4. Showbar: a compact strip at the bottom of the Studio, in the free band under the record bar. It never moves the record bar and never
        changes the stage size, and it is page UI, never drawn into the recording. Each item: move number, side, badge, clip score and the
        one-line reason. Click (or [ and ]) jumps the Studio board to the moment (before or after the move). Type toggles filter it;
        it folds to one small pill. On a phone the toggles sit in the ⚙ panel.
     5. From any moment: Deep dive (Game-to-Script with this mistake), Make video project (mistakes; the recording flow keys 1-4 then use it),
        Copy clip brief, and "Copy clip plan" for the whole list (one video per line, Short under 60 s or Mid 1-3 min).
     6. The last scans (up to 6) stay on this device (localStorage lc103-scans), so the Showbar is back after a reload. */
  const VERSION="9.69.0";
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0];
  const say=(m,k,ms)=>{try{const box=Q("#lc103-ui .m-toasts");if(box){const t=document.createElement("div");t.className="m-toast"+(k==="err"?" err":k==="ok"?" ok":"");t.textContent=m;box.appendChild(t);setTimeout(()=>{try{t.remove()}catch(e){}},ms||3200);return}toast(m,k==="err"?"err":k==="ok"?"good":"")}catch(e){}};
  const api=()=>{try{return window.LanckrietStudio||null}catch(e){return null}};
  const VAL={p:1,n:3,b:3,r:5,q:9,k:0},NAME={p:"pawn",n:"knight",b:"bishop",r:"rook",q:"queen",k:"king"};
  const LN={M:"Move",S:"Specifics",P:"Priorities",C:"Calculation"};
  const CUE={M:"ask what their last move changed",S:"check loose pieces and the structure first",P:"list checks, captures and attacks first",C:"calculate one reply deeper"};
  /* the filter order follows the brief: Minefield, Blunder, Mistake, Great, Brilliant, Top Engine (+ Inaccuracy) */
  const TYPES=[
    {id:"minefield",label:"Minefield",sym:"◆",color:"#f59e0b"},
    {id:"blunder",label:"Blunder",sym:"??",color:"#ef4444"},
    {id:"mistake",label:"Mistake",sym:"?",color:"#fb923c"},
    {id:"great",label:"Great",sym:"!",color:"#38bdf8"},
    {id:"brilliant",label:"Brilliant",sym:"!!",color:"#2dd4bf"},
    {id:"top",label:"Top Engine",sym:"★",color:"#a78bfa"},
    {id:"inaccuracy",label:"Inaccuracy",sym:"?!",color:"#facc15"}];
  const TY={};TYPES.forEach(t=>{TY[t.id]=t});
  const PRIO=["brilliant","blunder","great","minefield","mistake","top","inaccuracy"];
  const DEPTH={fast:{t1:150,k:3,t2:100,nat:4,v1:500,v2:350,label:"Fast"},deep:{t1:340,k:4,t2:230,nat:6,v1:1000,v2:700,label:"Thorough"}};
  const UK="lc103-ui",SK="lc103-scans",MAXS=6;
  const UI0={filters:{minefield:true,blunder:true,mistake:true,great:true,brilliant:true,top:true,inaccuracy:true},order:"game",collapsed:false,hidden:false,jump:"before",orient:"mover",depth:"deep",side:"both",lorder:"score"};
  let UI=Object.assign({},UI0,rd(UK,{})||{});UI.filters=Object.assign({},UI0.filters,UI.filters||{});
  const saveUI=()=>wr(UK,UI);

  /* ---------- board helpers (chess.js) ---------- */
  const other=c=>c==="w"?"b":"w";
  function withTurn(fen,c){const p=String(fen).split(" ");p[1]=c;p[3]="-";return p.join(" ")}
  const fenKey=f=>String(f||"").split(" ").slice(0,4).join(" ");
  function material(fen){const o={w:0,b:0};String(fen).split(" ")[0].replace(/[pnbrqPNBRQ]/g,ch=>{const lo=ch.toLowerCase();o[ch===lo?"b":"w"]+=VAL[lo];return ch});return o}
  function capsBy(fen,by){try{const g=new Chess(withTurn(fen,by));return g.moves({verbose:true}).filter(m=>m.captured)}catch(e){return[]}}
  function defended(fen,sq,color){
    try{const g=new Chess(fen),pc=g.get(sq);if(!pc||pc.type==="k")return false;g.remove(sq);g.put({type:pc.type,color:other(pc.color)},sq);
      const h=new Chess(withTurn(g.fen(),color));return h.moves({verbose:true}).some(m=>m.to===sq)}catch(e){return false}
  }
  function minAttacker(caps,sq){let v=99;caps.forEach(m=>{if(m.to===sq)v=Math.min(v,VAL[m.piece]||0)});return v===99?null:v}
  const uciOf=m=>m.from+m.to+(m.promotion||"");
  /* how a human (or a blitz player) ranks the moves of a position: high = the move that jumps out first */
  function instinct(fen,prev){
    let g;try{g=new Chess(fen)}catch(e){return[]}
    const me=g.turn(),them=other(me),full=+(String(fen).split(" ")[5])||1,ms=g.moves({verbose:true});
    const theirCaps=capsBy(fen,them),threatened={};
    theirCaps.forEach(m=>{const t=m.captured;if(!t||t==="k")return;const a=minAttacker(theirCaps,m.to);if(threatened[m.to]!=null)return;threatened[m.to]=(a!=null&&a<VAL[t])||!defended(fen,m.to,me)});
    const pieces=String(fen).split(" ")[0].replace(/[^a-zA-Z]/g,"").length;
    const out=ms.map(m=>{
      let s=0;const tags=[];const pv=VAL[m.piece]||0,cv=m.captured?VAL[m.captured]:0,fwd=me==="w"?(+m.to[1]-+m.from[1]):(+m.from[1]-+m.to[1]);
      const after=(()=>{try{const a=new Chess(fen);a.move({from:m.from,to:m.to,promotion:m.promotion||"q"});return a}catch(e){return null}})();
      const af=after?after.fen():fen,check=/[+#]/.test(m.san);
      if(prev&&prev.captured&&prev.to===m.to&&m.captured){s+=4;tags.push("recapture")}
      if(m.captured){if(cv>=pv&&m.piece!=="k"){s+=3;tags.push("capture")}else if(!defended(fen,m.to,them)){s+=2.6;tags.push("free piece")}else{s+=1.2;tags.push("capture")}}
      if(check){s+=2.2;tags.push("check");if(/#/.test(m.san))s+=4}
      if(threatened[m.from]){s+=2.6;tags.push(m.piece==="p"?"saves a pawn":"saves a piece")}
      if(/[kq]/.test(m.flags)){s+=full<=25?1.8:.6;tags.push("castles")}
      if(/[nb]/.test(m.piece)&&full<=14&&m.from[1]===(me==="w"?"1":"8")){s+=1.4;tags.push("develops")}
      if(m.piece==="p"&&/^[de]/.test(m.from)&&full<=8&&fwd>0){s+=1;tags.push("centre pawn")}
      if(m.promotion){s+=3;tags.push("promotes")}
      /* the piece now stands where it can be taken for less (or for free): instinct avoids that */
      if(after&&m.piece!=="k"){const tc=after.moves({verbose:true}).filter(x=>x.captured&&x.to===m.to);
        if(tc.length){const a=Math.min.apply(null,tc.map(x=>VAL[x.piece]||0)),def=defended(af,m.to,me);
          if((!def&&pv-cv>=2)||(a<pv&&pv-cv>=2)){s-=2.6;tags.push("gives material")}}}
      if(!m.captured&&!check&&after&&!tags.length){const mine=capsBy(af,me).filter(x=>x.from===m.to&&x.captured&&x.captured!=="k"&&(VAL[x.captured]>pv||!defended(af,x.to,them)));if(mine.length){s+=1.3;tags.push("threat")}}
      if(m.piece==="k"&&!/[kq]/.test(m.flags)&&pieces>12){s-=1.6;tags.push("king walk")}
      if(fwd<0&&m.piece!=="k"&&!threatened[m.from]&&!m.captured){s-=m.piece==="n"?1.1:.8;tags.push("retreat")}
      if(m.piece==="q"&&full<8&&!m.captured&&!check)s-=.5;
      if(m.piece==="p"&&/^[ah]/.test(m.from)&&!m.captured)s-=.5;
      if(!m.captured&&!check&&!tags.length)tags.push("quiet");
      s+=Math.max(0,fwd)*.15;
      return{uci:uciOf(m),san:m.san,s:Math.round(s*100)/100,tags:tags,piece:m.piece,cap:m.captured||"",check:check,from:m.from,to:m.to}});
    out.sort((a,b)=>b.s-a.s);
    return out;
  }
  /* material for the mover along a line: the lowest point that lasts past the mover's next move = a sacrifice */
  function sacOf(fen,pv,me){
    try{const g=new Chess(fen),m0=material(fen),base=m0[me]-m0[other(me)],d=[0];
      for(let k=0;k<Math.min(8,(pv||[]).length);k++){const u=pv[k];if(!g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||"q"}))break;const m=material(g.fen());d.push(m[me]-m[other(me)]-base)}
      for(const k of[2,4])if(d.length>k&&d[k]<=-2&&(d.length<=k+1||d[k+1]<=-1))return{down:-d[k],at:k,net:d.length>k+1?-d[k+1]:-d[k]};
      return null}catch(e){return null}
  }
  function sanLine(fen,pv,n){try{const g=new Chess(fen),out=[];let num=+(String(fen).split(" ")[5])||1;(pv||[]).slice(0,n||6).forEach((u,i)=>{const side=g.turn(),m=g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||"q"});if(!m)return;out.push(side==="w"?num+". "+m.san:(i===0?num+"... "+m.san:m.san));if(side==="b")num++});return out.join(" ")}catch(e){return""}}
  const label=m=>(m.color==="w"?m.num+". ":m.num+"… ")+m.san;

  /* ---------- the engine ---------- */
  let RUN=null;
  async function ask(fen,o){
    for(let t=0;t<5;t++){
      if(RUN&&RUN.stop)throw new Error("stopped");
      try{return await Engine.analyse(fen,o)}catch(e){const s=String(e&&e.message||e);if(/superseded/.test(s)){await sleep(250+t*200);continue}throw e}}
    throw new Error("The engine stayed busy (another tool kept asking it). Switch the Live engine off and scan again.");
  }
  async function evalAt(fen,P,cands){
    let g;try{g=new Chess(fen)}catch(e){return null}
    if(g.game_over()){const cp=g.in_checkmate()?(g.turn()==="w"?-1e4:1e4):0;return{term:true,cp:cp,order:[],map:{},legal:0}}
    const legal=g.moves().length;
    const r=await ask(fen,{movetime:P.t1,multipv:Math.min(P.k,legal)});
    const map={},order=[];
    (r.lines||[]).forEach(l=>{const u=l.pv&&l.pv[0];if(!u||map[u])return;map[u]={cp:Engine.toCp(l),pv:l.pv,mate:l.mate};order.push(u)});
    if(!order.length&&r.best){map[r.best]={cp:0,pv:[r.best],mate:null};order.push(r.best)}
    const miss=(cands||[]).filter(u=>!map[u]).slice(0,P.nat);
    if(miss.length&&legal>1){
      try{const r2=await ask(fen,{movetime:P.t2,multipv:miss.length,searchmoves:miss.join(" ")});
        (r2.lines||[]).forEach(l=>{const u=l.pv&&l.pv[0];if(u&&!map[u])map[u]={cp:Engine.toCp(l),pv:l.pv,mate:l.mate,probe:true}})}
      catch(e){if(/stopped/.test(String(e&&e.message)))throw e}}
    return{term:false,cp:map[order[0]].cp,order:order,map:map,legal:legal};
  }

  /* ---------- judging one move (pure: all inputs are data, so it is unit-tested) ---------- */
  function judge(S,i){
    const g=S.g,m=g.moves[i],fen=g.fens[i],E0=S.E[i],E1=S.E[i+1],R=S.R[i]||[];if(!m||!E0||!E1||E0.term)return null;
    const me=m.color,pov=me==="w"?1:-1,W=cp=>Engine.winPct(cp*pov),played=uciOf(m);
    const bestU=E0.order[0],wBest=W(E0.cp),pl=E0.map[played],cpPlayed=pl?pl.cp:E1.cp,wPlayed=W(cpPlayed),loss=Math.max(0,wBest-wPlayed);
    const isBest=played===bestU,sec=E0.order[1]?E0.map[E0.order[1]]:null,gap=isBest&&sec?Math.max(0,wBest-W(sec.cp)):0;
    const ri=R.findIndex(x=>x.uci===played),rank=ri<0?R.length:ri+1,inst=R[ri]||{tags:[]};
    let pc=inst.piece||"";if(!pc){try{pc=(new Chess(fen).get(m.from)||{}).type||""}catch(e){}}
    const full=m.num||1,out={i:i,num:m.num,color:me,san:m.san,uci:played,fen:fen,types:[],loss:Math.round(loss*10)/10,gap:Math.round(gap*10)/10,rank:rank,legal:E0.legal,
      tags:inst.tags||[],wBefore:Math.round(wBest),wAfter:Math.round(wPlayed),best:bestU,bestSan:bestU?sanOf(fen,bestU):"",bestLine:bestU?sanLine(fen,(E0.map[bestU]||{}).pv,6):"",
      bestPv:bestU&&E0.map[bestU]?(E0.map[bestU].pv||[]).slice(0,12):null,replyPv:E1.order[0]&&E1.map[E1.order[0]]?(E1.map[E1.order[0]].pv||[]).slice(0,12):null,replyMate:E1.order[0]&&E1.map[E1.order[0]]?E1.map[E1.order[0]].mate:null,
      reply:E1.order[0]||"",replySan:E1.order[0]?sanOf(g.fens[i+1],E1.order[0]):"",replyLine:E1.order[0]?sanLine(g.fens[i+1],(E1.map[E1.order[0]]||{}).pv,6):""};
    const crushing=E0.cp*pov>900&&cpPlayed*pov>500,lostAlready=wBest<6&&!(E1.map[E1.order[0]]&&E1.map[E1.order[0]].mate!=null);
    /* 1. the move itself: a mistake, or a good move that was hard to find */
    if(!crushing&&!lostAlready){if(loss>=30)out.types.push("blunder");else if(loss>=20)out.types.push("mistake");else if(loss>=10)out.types.push("inaccuracy")}
    const prev=i>0&&S.J?S.J[i-1]:null,punish=!!(prev&&prev.loss>=20&&prev.color!==me);
    if(isBest&&E0.legal>=3&&loss<=1.5){
      const trivial=rank===1&&(/#/.test(m.san)||inst.tags.some(t=>/recapture|saves a|free piece/.test(t)));
      const sac=sacOf(fen,(E0.map[played]||{}).pv,me)||(inst.tags.indexOf("gives material")>=0?{down:(VAL[pc]||0)-(VAL[inst.cap]||0),offer:true}:null),mateLine=(E0.map[played]||{}).mate!=null&&((E0.map[played].mate>0)===(me==="w"));
      if(sac&&wPlayed>=45&&(wBest<96||(mateLine&&rank>=3))&&(VAL[pc]||0)>=3&&i>=6){out.types.push("brilliant");out.sac=sac}
      else if((gap>=15&&!trivial&&(rank>=2||gap>=30))||(punish&&gap>=8&&!trivial))out.types.push("great");
      else if(i>=8&&rank>=4&&gap>=4&&wBest>=10&&wBest<=95&&!trivial)out.types.push("top");
      if(punish)out.punish=prev.san;
    }
    /* 2. the position: a minefield of natural moves that lose */
    /* only moves with a real pull count as "natural" (a capture, check, recapture, saving a piece, development, a threat…), plus the
       first instinct move itself. A minefield needs that first instinct to fail: when the obvious move (a recapture, the free piece)
       is also the right one, instinct finds it and nothing is deceptive. */
    const nat=R.slice(0,S.P.nat).filter((x,k)=>E0.map[x.uci]&&(k===0||x.s>=.9));
    if(i>=3&&nat.length>=2&&R[0]&&nat[0]===R[0]&&E0.legal>=4&&wBest>=12&&wBest<=96){
      const ev=nat.map(x=>({san:x.san,uci:x.uci,tag:(x.tags||[])[0]||"",loss:Math.max(0,wBest-W(E0.map[x.uci].cp))}));
      const traps=ev.filter(e=>e.loss>=15),safeAll=Object.keys(E0.map).filter(u=>wBest-W(E0.map[u].cp)<=6),top=ev[0];
      if(top.loss>=15&&safeAll.length<=2&&(traps.length>=2||(top.loss>=25&&safeAll.length<=1))){
        out.types.push("minefield");out.traps=traps.map(t=>({san:t.san,tag:t.tag,loss:Math.round(t.loss)}));out.natural=ev.length;out.safe=safeAll.map(u=>sanOf(fen,u)).filter(Boolean);
        out.fell=traps.some(t=>t.uci===played)||loss>=15;out.topTrap=true;
      }
    }
    if(!out.types.length)return out;   /* kept for the next move's "punish" check; not a moment */
    out.types.sort((a,b)=>PRIO.indexOf(a)-PRIO.indexOf(b));
    out.primary=out.types[0];
    return out;
  }
  function sanOf(fen,u){try{return Engine.uciToSan(fen,u)||""}catch(e){return""}}
  /* the honest coach (LC83) for a mistake; motifs of the best line for a good move */
  function explain(S,j){
    const g=S.g,i=j.i,m=g.moves[i],E0=S.E[i],E1=S.E[i+1],pm=i>0?g.moves[i-1]:null;
    if(/blunder|mistake|inaccuracy/.test(j.types.join(" "))||j.fell){
      try{if(typeof LC83!=="undefined"&&LC83.diagnose){const rU=E1.order[0];
        j.diag=LC83.diagnose({fen:j.fen,color:j.color,played:{from:m.from,to:m.to,promotion:m.promotion||"q",san:m.san},bestUci:j.best||"",replyUci:rU||"",bestPv:(E0.map[j.best]||{}).pv,replyPv:(E1.map[rU]||{}).pv,replyMate:(E1.map[rU]||{}).mate,prevFen:i>0?g.fens[i-1]:null,oppUci:pm?uciOf(pm):null})}}catch(e){j.diag=null}
    }
    try{if(typeof LC83!=="undefined"&&LC83.walk&&LC83.motifsOf&&j.best){const st=LC83.walk(j.fen,(E0.map[j.best]||{}).pv||[j.best],8);const mo=LC83.motifsOf(j.fen,st,j.color,j.color)||[];j.bestMotif=(mo.filter(x=>/^(fork|pin|skewer|discovered|removal|deflection|trapped|promotion|backRank|smothered|quiet)$/.test(x.id))[0]||mo[0]||null);if(j.bestMotif)j.bestMotif={id:j.bestMotif.id,label:j.bestMotif.label}}}catch(e){}
    const sw=(()=>{try{if(typeof LC83!=="undefined"&&LC83.swingOf&&LC83.walk){const st=LC83.walk(j.fen,(E0.map[j.best]||{}).pv||[],8);return LC83.swingOf(j.fen,st,j.color)}}catch(e){}return null})();
    if(sw)j.swing={net:sw.net,mate:sw.mate||""};
    j.letter=j.diag&&j.diag.k&&LN[j.diag.k]?j.diag.k:(/[+#x]/.test(j.bestSan)?"P":j.types.indexOf("minefield")>=0?"C":"S");
    j.reason=reasonOf(j);j.score=scoreOf(j);j.form=formOf(j);
    return j;
  }
  function trapWord(j){const t=j.tags||[];if(j.rank===1&&t.indexOf("recapture")>=0)return"The automatic recapture";if(t.indexOf("check")>=0&&j.rank<=3)return"The tempting check";if(t.indexOf("free piece")>=0||(t.indexOf("capture")>=0&&j.rank<=3))return"The greedy capture";if(t.indexOf("saves a piece")>=0)return"Saving the piece";if(j.rank<=2)return"The natural";return""}
  function reasonOf(j){
    const p=j.primary,cue=CUE[j.letter]||CUE.C,mv=j.san;
    const motif=j.diag&&((j.diag.motifs||[]).filter(x=>/^(fork|pin|skewer|discovered|removal|deflection|trapped|counter|backRank|smothered)$/.test(x.id))[0]);
    const mot=motif?motif.label.toLowerCase():j.diag&&j.diag.id==="allowedMate"?"a forced mate":"";
    if(p==="blunder"||p==="mistake"||p==="inaccuracy"){
      const tw=trapWord(j);
      return(tw?tw+" "+mv:mv)+(j.replySan?(p==="inaccuracy"&&!mot?" is met by ":" runs into ")+j.replySan+(mot?" ("+mot+")":""):" loses the thread")+"."+(j.bestSan?" Better "+j.bestSan+": "+cue+".":"")+(j.types.indexOf("minefield")>=0?" A minefield: "+j.traps.length+" natural moves lose here.":"");
    }
    if(p==="minefield"){
      const tl=(j.traps||[]).slice(0,3).map(t=>t.san+(t.tag&&t.tag!=="quiet"?" ("+t.tag+")":"")).join(", ");
      return"Instinct says "+j.traps[0].san+", but "+j.traps.length+" of "+j.natural+" natural moves lose ("+tl+"). Only "+(j.safe.slice(0,2).join(" / ")||j.bestSan)+" hold"+(j.safe.length===1?"s":"")+"."+(j.fell?" "+mv+" fell in.":j.loss<=6?" "+mv+" found the path.":" "+mv+" avoided the traps but drifted.");
    }
    if(p==="brilliant")return"Sacrifice: "+mv+" gives up "+(j.sac&&j.sac.down>=5?"big material":j.sac&&j.sac.down>=3?"a piece":"material")+" and it works: "+(j.bestLine||mv)+"."+(j.types.indexOf("minefield")>=0?" Natural moves lose here.":"");
    if(p==="great")return(j.punish?"Punishes "+j.punish+": ":"Only move: ")+mv+" holds"+(j.gap?"; the next best drops "+Math.round(j.gap)+" points":"")+"."+(j.bestMotif&&j.bestMotif.id!=="quiet"?" "+j.bestMotif.label+".":"")+(j.types.indexOf("minefield")>=0?" Natural moves lose here.":"");
    if(p==="top"){const tr=(j.tags||[]).filter(t=>/retreat|quiet|king walk|gives material/.test(t))[0]||"not the obvious move";return"Hard to find: "+mv+" ("+tr+") is Stockfish's first choice; instinct ranks it #"+j.rank+" of "+j.legal+"."}
    return mv;
  }
  /* clip score: contrast 35 + instinct trap 30 + payoff 25 + clarity 10 */
  function scoreOf(j){
    let best=0;
    const flip=(j.wBefore>=50&&j.wAfter<30)||(j.wBefore>=70&&j.wAfter<50)||(j.wBefore<=50&&j.wAfter>=70);
    const forcing=/[+#x]/.test(j.replySan||""),bestForcing=/[+#x]/.test(j.bestSan||"");
    if(/blunder|mistake|inaccuracy/.test(j.types.join(" "))){
      const c=clamp(j.loss/50,0,1)*35,t=j.rank<=1?30:j.rank<=2?24:j.rank<=3?18:j.rank<=6?10:4;
      const strong=j.diag&&(j.diag.motifs||[]).some(x=>/^(fork|pin|skewer|discovered|removal|deflection|trapped|counter|backRank|smothered)$/.test(x.id));
      const net=j.diag&&j.diag.line?j.diag.line.net:0,mate=j.diag&&/allowedMate|missedMate/.test(j.diag.id||"");
      const p=Math.min(25,(mate?20:strong?18:net<=-3?14:net<=-1?8:4)+(flip?8:0));
      best=Math.max(best,c+t+p+(forcing?10:5));
    }
    if(/great|brilliant|top/.test(j.types.join(" "))){
      const c=clamp(j.gap/40,0,1)*35+(j.types.indexOf("brilliant")>=0?10:0),t=Math.min(30,(j.rank>=8?30:j.rank>=5?22:j.rank>=3?14:6)+(j.sac?8:0));
      const sw=j.swing||{net:0,mate:""},p=Math.min(25,(sw.mate==="me"?20:sw.net>=3?16:sw.net>=1?9:5)+(j.punish?6:0)+(j.wAfter>=80?4:0));
      best=Math.max(best,c+t+p+(bestForcing?10:6));
    }
    if(j.types.indexOf("minefield")>=0){
      const mx=Math.max.apply(null,(j.traps||[{loss:0}]).map(t=>t.loss)),c=clamp(mx/50,0,1)*30,t=Math.min(30,(j.traps||[]).length*6+(j.topTrap?6:0));
      const p=j.fell?20:15,cl=(j.safe||[]).length<=1?10:6;
      best=Math.max(best,c+t+p+cl+(j.types.length>1?6:0));
    }
    return Math.round(clamp(best,0,100));
  }
  function formOf(j){const long=(j.types.indexOf("minefield")>=0&&(j.traps||[]).length>=3)||j.types.length>=2||(j.bestLine||"").split(" ").length>=8||j.sac;return long&&j.score>=55?"mid":"short"}
  const FORM={short:"Short (under 60 s)",mid:"Mid (1–3 min)"};

  /* ---------- the scan ---------- */
  function slimG(g){return{headers:g.headers||{},color:g.color||"",label:g.label||"",result:g.result||""}}
  function plainPgn(g){
    const h=g.headers||{},start=g.fens[0],std="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    let s=fenKey(start)!==fenKey(std)?'[SetUp "1"]\n[FEN "'+start+'"]\n\n':"";
    const parts=[];g.moves.forEach((m,i)=>{parts.push((m.color==="w"?m.num+". ":(i===0?m.num+"... ":""))+m.san)});
    return s+parts.join(" ")+" "+(h.Result||"*");
  }
  function pgnKey(p){let h=0;const t=String(p||"").replace(/\s+/g," ");for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return"m"+(h>>>0).toString(36)}
  let LAST=null;
  let CUR=null;   /* the scan on the Showbar: {key,label,pgn,g,moments,series,at,opts,done} */
  async function scan(pgn,o){
    o=o||{};const P=DEPTH[o.depth||UI.depth]||DEPTH.deep,side=o.side||UI.side||"both";
    if(typeof LC80==="undefined"||!LC80.scan||typeof Engine==="undefined")throw new Error("The analysis engine is not available in this build.");
    const g=LC80.scan.parseGame(String(pgn||"").trim());if(!g)throw new Error("That PGN could not be read, or it has fewer than 8 moves.");
    if(!(await Engine.load()))throw new Error("Stockfish could not start on this device.");
    const run={stop:false};RUN=run;
    const n=g.moves.length,S={g:g,P:P,E:[],R:[],J:[],moments:[]};LAST=S;
    const key=pgnKey(pgn),h=g.headers||{};
    CUR={key:key,label:(h.White||"White")+(h.WhiteElo?" ("+h.WhiteElo+")":"")+" vs "+(h.Black||"Black")+(h.BlackElo?" ("+h.BlackElo+")":"")+(h.Result?" · "+h.Result:""),pgn:String(pgn).slice(0,6e4),plain:plainPgn(g),g:slimG(g),fens:g.fens,moments:[],series:[],at:Date.now(),opts:{depth:o.depth||UI.depth,side:side},done:false,ply:0,n:n};
    const t0=Date.now();
    try{
      /* 9.73.0: o.only = move indexes to judge (Game-to-Script's "instructive moment"): only those positions, the one
         before and the one after are analysed, so one moment takes a few seconds instead of the whole game */
      const ONLY=Array.isArray(o.only)&&o.only.length?o.only.reduce((m,k)=>{m[k]=1;return m},{}):null;
      const NEED=ONLY?Object.keys(ONLY).reduce((m,k)=>{k=+k;m[k-1]=m[k]=m[k+1]=1;return m},{}):null;
      for(let i=0;i<=n;i++){
        if(run.stop)throw new Error("stopped");
        if(NEED&&!NEED[i]){S.R[i]=[];S.E[i]=null;CUR.series[i]=0;continue}
        S.R[i]=i<n?instinct(g.fens[i],i>0?g.moves[i-1]&&{to:g.moves[i-1].to,captured:new Chess(g.fens[i-1]).get(g.moves[i-1].to)?"x":""}:null):[];
        S.E[i]=await evalAt(g.fens[i],P,S.R[i].slice(0,P.nat).map(x=>x.uci));
        CUR.series[i]=S.E[i]?clamp(Math.round(S.E[i].cp),-900,900):0;CUR.ply=i;
        if(i>0&&(!ONLY||ONLY[i-1])){const j=judge(S,i-1);S.J[i-1]=j;
          if(j&&j.types.length&&(side==="both"||side===j.color)){explain(S,j);const slim=slimMoment(j);S.moments.push(slim);CUR.moments.push(slim);if(o.onMoment)try{o.onMoment(slim)}catch(e){}}}
        if(o.onTick)try{o.onTick(i,n,Date.now()-t0)}catch(e){}
      }
      /* verify: every flagged move gets a deeper look (shallow engine noise is the main source of false moments), then all moves are judged again */
      const flagged=[];S.J.forEach((j,i)=>{if(j&&j.types.length&&(side==="both"||side===j.color))flagged.push(i)});
      const deep={t1:P.v1,k:P.k,t2:P.t2,nat:P.nat},pos={};flagged.forEach(i=>{pos[i]=1;pos[i+1]=1});
      const todo=Object.keys(pos).map(Number).sort((a,b)=>a-b);
      for(let q=0;q<todo.length;q++){if(run.stop)throw new Error("stopped");const i=todo[q];
        if(o.onVerify)try{o.onVerify(q,todo.length)}catch(e){}
        const E=await evalAt(g.fens[i],Object.assign({},deep,{t1:flagged.indexOf(i)>=0?P.v1:P.v2}),i<n?S.R[i].slice(0,P.nat).map(x=>x.uci):[]);
        if(E&&!E.term&&S.E[i]&&!S.E[i].term)Object.keys(S.E[i].map).forEach(u=>{if(!E.map[u])E.map[u]=S.E[i].map[u]});
        if(E)S.E[i]=E;CUR.series[i]=E?clamp(Math.round(E.cp),-900,900):CUR.series[i]}
      S.J=[];S.moments=[];CUR.moments=[];
      for(let i=0;i<n;i++){if(ONLY&&!ONLY[i])continue;const j=judge(S,i);S.J[i]=j;if(j&&j.types.length&&(side==="both"||side===j.color)){explain(S,j);const slim=slimMoment(j);S.moments.push(slim);CUR.moments.push(slim)}}
      CUR.done=true;
    }finally{RUN=null}
    remember(CUR);return CUR;
  }
  function stop(){if(RUN){RUN.stop=true;try{Engine.stop()}catch(e){}}}
  const MKEYS=["bestPv","replyPv","replyMate","topTrap","i","num","color","san","uci","fen","types","primary","loss","gap","rank","legal","tags","wBefore","wAfter","best","bestSan","bestLine","reply","replySan","replyLine","traps","natural","safe","fell","sac","punish","letter","reason","score","form","bestMotif","swing"];
  function slimMoment(j){const o={};MKEYS.forEach(k=>{if(j[k]!=null)o[k]=j[k]});
    if(j.diag)o.diag={id:j.diag.id,k:j.diag.k,error:j.diag.error,alarm:j.diag.alarm,why:j.diag.why,find:j.diag.find,blind:j.diag.blind?{label:j.diag.blind.label,text:j.diag.blind.text}:null,line:j.diag.line?{ref:j.diag.line.ref,best:j.diag.line.best,lost:j.diag.line.lost,won:j.diag.line.won}:null,action:j.diag.action,train:j.diag.train||null};
    return o}
  function remember(sc){
    const list=(rd(SK,[])||[]).filter(x=>x&&x.key!==sc.key);
    list.unshift({key:sc.key,label:sc.label,pgn:sc.pgn,plain:sc.plain,g:sc.g,fens:sc.fens,moments:sc.moments,series:sc.series,at:sc.at,opts:sc.opts,done:sc.done,n:sc.n});
    while(list.length>MAXS)list.pop();
    for(let k=list.length;k>0;k--){try{localStorage.setItem(SK,JSON.stringify(list.slice(0,k)));return}catch(e){}}
  }
  function scans(){return(rd(SK,[])||[]).filter(x=>x&&x.key&&Array.isArray(x.moments))}
  function useScan(key){const s=scans().filter(x=>x.key===key)[0];if(s){CUR=Object.assign({},s);UI.hidden=false;saveUI();paintBar(true)}return!!s}

  /* ---------- the list (shared by the Showbar and the Moment Finder) ---------- */
  const passes=m=>(m.types||[]).some(t=>UI.filters[t]);
  function visible(order){
    const L=(CUR&&CUR.moments||[]).filter(passes).slice();
    if((order||UI.order)==="score")L.sort((a,b)=>b.score-a.score||a.i-b.i);else L.sort((a,b)=>a.i-b.i);
    return L;
  }
  function counts(){const c={};TYPES.forEach(t=>{c[t.id]=0});(CUR&&CUR.moments||[]).forEach(m=>(m.types||[]).forEach(t=>{c[t]=(c[t]||0)+1}));return c}
  function topKeys(){return(CUR&&CUR.moments||[]).slice().sort((a,b)=>b.score-a.score).slice(0,5).map(m=>m.i)}
  function badgeHTML(t,small){const T=TY[t];if(!T)return"";return'<i class="lc103-bd'+(small?" s":"")+'" style="--c:'+T.color+'">'+esc(T.sym+" "+T.label)+'</i>'}
  function brief(m,idx){
    const g=CUR&&CUR.g||{},h=g.headers||{};
    const L=["CLIP "+(idx!=null?"#"+(idx+1)+" ":"")+"· "+(m.types||[]).map(t=>TY[t].label).join(" + ")+" · clip score "+m.score+" · "+FORM[m.form||"short"],
      "Game: "+(CUR?CUR.label:"")+(h.Date?" ("+h.Date+")":""),
      "Moment: "+label(m)+" ("+(m.color==="w"?"White":"Black")+" to move)","FEN: "+m.fen,
      "Why it matters: "+m.reason];
    if(m.diag&&m.diag.error)L.push("What went wrong: "+m.diag.error);
    if(m.diag&&m.diag.blind)L.push("Why a human misses it ("+m.diag.blind.label+"): "+m.diag.blind.text);
    if(m.traps&&m.traps.length)L.push("Natural moves that lose: "+m.traps.map(t=>t.san+" (−"+t.loss+")").join(", ")+(m.safe&&m.safe.length?"; only "+m.safe.join(" / ")+" hold.":""));
    if(m.bestSan)L.push("Better / Stockfish's line: "+(m.bestLine||m.bestSan));
    if(m.replyLine&&/blunder|mistake|inaccuracy/.test((m.types||[]).join(" ")))L.push("The refutation after "+m.san+": "+m.replyLine);
    L.push("MSPC: "+LN[m.letter||"C"]+": "+(CUE[m.letter||"C"])+".");
    return L.join("\n");
  }
  function plan(){const L=visible("score");return["CLIP PLAN · "+(CUR?CUR.label:"")+" · "+L.length+" moments","Results differ per person; nothing here is a promise of a rating.",""].concat(L.map((m,i)=>"#"+(i+1)+" · "+m.score+" · "+(m.types||[]).map(t=>TY[t].label).join(" + ")+" · "+label(m)+" · "+FORM[m.form||"short"]+"\n   "+m.reason+(m.bestLine?"\n   Line: "+m.bestLine:"")+"\n   FEN: "+m.fen)).join("\n")}
  async function copy(t){try{await navigator.clipboard.writeText(t);return true}catch(e){}try{const a=document.createElement("textarea");a.value=t;a.style.cssText="position:fixed;left:-9999px";document.body.appendChild(a);a.select();const ok=document.execCommand("copy");a.remove();return ok}catch(e){return false}}

  /* ---------- jumping the Studio board ---------- */
  let curI=null;
  function boardHas(B){if(!CUR||!B||!B.fens||!CUR.fens)return false;if(B.fens.length!==CUR.fens.length)return false;return fenKey(B.fens[0])===fenKey(CUR.fens[0])&&fenKey(B.fens[B.fens.length-1])===fenKey(CUR.fens[CUR.fens.length-1])}
  function jump(m){
    const B=api()&&api().board;if(!B){say("Open the Creator Studio first.","err");return false}
    if(!boardHas(B)){const r=B.loadPGN(CUR.plain);if(!r||!r.ok){say("The Studio board could not load this game.","err");return false}}
    try{B.goto(UI.jump==="after"?m.i+1:m.i)}catch(e){}
    try{const want=UI.orient==="mover"?m.color:UI.orient==="player"?(CUR.g&&CUR.g.color)||"w":null;if(want&&B.orient!==want)B.flip()}catch(e){}
    curI=m.i;paintBar();paintList();return true;
  }
  function step(d){const L=visible();if(!L.length)return;let k=L.findIndex(m=>m.i===curI);k=k<0?(d>0?0:L.length-1):clamp(k+d,0,L.length-1);jump(L[k]);scrollChip()}
  function syncCur(){   /* the board moved by hand: follow it */
    try{const B=api()&&api().board;if(!B||!CUR||!boardHas(B))return;const ix=B.idx;const L=CUR.moments;const hit=L.filter(m=>m.i===ix||(UI.jump==="after"&&m.i+1===ix))[0];if(hit&&hit.i!==curI){curI=hit.i;paintBar();scrollChip()}}catch(e){}
  }

  /* ---------- the Showbar (inside the Studio's shadow root) ---------- */
  function studioRoot(){
    const v=Q("#view");
    const host=((v?[v].concat(QA("*",v).slice(0,40)):[]).concat([].slice.call(document.body.children))).filter(e=>e.shadowRoot&&e.shadowRoot.querySelector("#lcs"))[0];
    return host?host.shadowRoot:null;
  }
  const BAR_CSS="#lc103-sb{position:fixed;left:8px;right:var(--lc103-r,8px);bottom:calc(6px + env(safe-area-inset-bottom,0px));z-index:49;height:62px;box-sizing:border-box;display:flex;align-items:center;gap:6px;padding:5px 6px 4px;border-radius:14px;background:rgba(10,11,14,.95);border:1px solid rgba(0,229,255,.28);box-shadow:0 8px 24px rgba(0,0,0,.5);font:600 12px Sora,system-ui,-apple-system,Segoe UI,sans-serif;color:#e5e7eb;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}"
    +"#lc103-sb[hidden]{display:none!important}#lc103-sb.fold{right:auto;max-width:calc(100vw - 16px)}#lc103-sb *{box-sizing:border-box}"
    +"#lc103-sb button{font:inherit;color:inherit;cursor:pointer}"
    +"#lc103-sb .sb-k{flex:none;width:44px;height:44px;border-radius:11px;background:#14171d;border:1px solid rgba(0,229,255,.35);display:grid;place-items:center;font-size:15px;line-height:1}"
    +"#lc103-sb .sb-k:hover{background:#1b2029}#lc103-sb .sb-k:disabled{opacity:.4;cursor:default}"
    +"#lc103-sb .sb-n{flex:none;min-width:44px;text-align:center;font-size:11px;color:#94a3b8;line-height:1.2}"
    +"#lc103-sb .sb-f{flex:none;display:flex;gap:4px}#lc103-sb .sb-p{min-width:40px;height:44px;padding:0 6px;border-radius:10px;background:transparent;border:1px solid color-mix(in srgb,var(--c) 55%,transparent);color:var(--c);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-weight:800;line-height:1}"
    +"#lc103-sb .sb-p small{font-size:10px;color:#cbd5e1;font-weight:600}#lc103-sb .sb-p[aria-pressed=false]{opacity:.38;border-style:dashed}#lc103-sb .sb-p[aria-pressed=true]{background:color-mix(in srgb,var(--c) 14%,transparent)}"
    +"#lc103-sb .sb-c{flex:1 1 auto;min-width:0;height:100%;display:flex;gap:6px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x proximity;scrollbar-width:thin;padding-top:3px;overscroll-behavior-x:contain}"
    +"#lc103-sb .sb-i{flex:none;width:232px;height:48px;scroll-snap-align:start;text-align:left;border-radius:10px;background:#11151c;border:1px solid rgba(255,255,255,.1);border-left:3px solid var(--c);padding:4px 8px;display:flex;flex-direction:column;justify-content:center;gap:2px;overflow:hidden}"
    +"#lc103-sb .sb-i:hover{background:#161b24}#lc103-sb .sb-i.on{width:360px;border-color:#00E5FF;border-left-color:var(--c);background:rgba(0,229,255,.1);box-shadow:0 0 0 1px rgba(0,229,255,.35) inset}"
    +"#lc103-sb .sb-l1{display:flex;align-items:center;gap:6px;white-space:nowrap;min-width:0}#lc103-sb .sb-l1 b{color:#fff;font-size:13px}#lc103-sb .sb-sd{width:9px;height:9px;border-radius:50%;flex:none;border:1px solid #64748b}#lc103-sb .sb-sd.w{background:#f8fafc}#lc103-sb .sb-sd.b{background:#0b0d12}"
    +"#lc103-sb .sb-l1 em{margin-left:auto;font-style:normal;font-size:11px;color:#00E5FF;font-weight:800}#lc103-sb .sb-l1 .star{color:#fbbf24}"
    +"#lc103-sb .sb-l2{font-size:11px;font-weight:500;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
    +".lc103-bd{font-style:normal;font-size:10px;font-weight:800;padding:1px 6px;border-radius:999px;color:var(--c);background:color-mix(in srgb,var(--c) 16%,transparent);border:1px solid color-mix(in srgb,var(--c) 50%,transparent);white-space:nowrap}"
    +"#lc103-sb .sb-tr{position:absolute;left:14px;right:14px;top:1px;height:3px;border-radius:2px;background:rgba(255,255,255,.06);pointer-events:none}#lc103-sb .sb-tr i{position:absolute;top:-1px;width:3px;height:5px;border-radius:1px;background:var(--c)}#lc103-sb .sb-tr i.on{width:5px;height:7px;top:-2px;box-shadow:0 0 6px var(--c)}#lc103-sb .sb-tr b{position:absolute;top:-1px;height:5px;width:2px;background:#fff;opacity:.7}"
    +"#lc103-sb .sb-e{flex:1 1 auto;min-width:0;color:#94a3b8;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
    +"#lc103-sb .sb-prog{position:absolute;left:0;bottom:0;height:2px;background:#00E5FF;border-radius:2px;transition:width .3s}"
    +"#lc103-pop{position:fixed;left:8px;bottom:calc(74px + env(safe-area-inset-bottom,0px));z-index:60;width:min(340px,calc(100vw - 16px));max-height:min(70vh,520px);overflow:auto;padding:12px;border-radius:14px;background:rgba(10,11,14,.97);border:1px solid rgba(0,229,255,.35);box-shadow:0 14px 34px rgba(0,0,0,.6);font:600 13px Sora,system-ui,sans-serif;color:#e5e7eb}"
    +"#lc103-pop[hidden]{display:none}#lc103-pop h4{margin:0 0 8px;font-size:13px;color:#fff}#lc103-pop .pp-g{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:0 0 10px}"
    +"#lc103-pop .pp-t{min-height:44px;border-radius:10px;border:1px solid color-mix(in srgb,var(--c) 55%,transparent);background:transparent;color:#e5e7eb;font:inherit;text-align:left;padding:0 10px;display:flex;align-items:center;gap:6px;cursor:pointer}#lc103-pop .pp-t b{color:var(--c);min-width:20px}#lc103-pop .pp-t small{margin-left:auto;color:#94a3b8}#lc103-pop .pp-t[aria-pressed=false]{opacity:.45;border-style:dashed}"
    +"#lc103-pop label{display:flex;flex-direction:column;gap:4px;margin:0 0 8px;font-size:11px;color:#94a3b8}#lc103-pop select{min-height:44px;border-radius:10px;background:#14171d;color:#e5e7eb;border:1px solid rgba(0,229,255,.4);padding:0 8px;font:600 13px Sora,system-ui,sans-serif}"
    +"#lc103-pop .pp-r{display:flex;flex-wrap:wrap;gap:6px}#lc103-pop .pp-b{min-height:44px;border-radius:10px;background:#14171d;border:1px solid rgba(0,229,255,.4);color:#e5e7eb;font:inherit;padding:0 12px;cursor:pointer}#lc103-pop .pp-b.pri{background:#00E5FF;color:#0A0B0E;border-color:#00E5FF}"
    +"#lc103-sb .sb-c{padding-right:var(--lc103-pad,0px);scroll-padding-right:var(--lc103-pad,0px)}"
    +"@media (max-width:760px){#lc103-sb .sb-f,#lc103-sb .sb-n{display:none}#lc103-sb .sb-i{width:200px}#lc103-sb .sb-i.on{width:270px}#lc103-sb [data-sb=set]{order:-1}#lc103-sb [data-sb=fold]{order:-1}#lc103-sb [data-sb=prev],#lc103-sb [data-sb=next]{order:-2}}";
  function barEl(){const sr=studioRoot();return sr?Q("#lc103-sb",sr):null}
  function ensureBar(sr){
    let bar=Q("#lc103-sb",sr);if(bar)return bar;
    if(!Q("#lc103-css",sr)){const st=document.createElement("style");st.id="lc103-css";st.textContent=BAR_CSS;sr.appendChild(st)}
    bar=document.createElement("div");bar.id="lc103-sb";bar.setAttribute("role","region");bar.setAttribute("aria-label","Showbar: the critical moments of this game");bar.hidden=true;
    (Q("#lcs",sr)||sr).appendChild(bar);
    const pop=document.createElement("div");pop.id="lc103-pop";pop.hidden=true;pop.setAttribute("role","dialog");pop.setAttribute("aria-label","Showbar settings");(Q("#lcs",sr)||sr).appendChild(pop);
    bar.addEventListener("click",onBarClick);pop.addEventListener("click",onPopClick);pop.addEventListener("change",onPopChange);
    return bar;
  }
  let barSig="";
  function recState(){try{return api().rec.state||"idle"}catch(e){return"idle"}}
  function paintBar(force){
    const sr=studioRoot();if(!sr)return;const bar=ensureBar(sr);
    const dock=Q("#lc54-dock",sr),dr=dock?dock.getBoundingClientRect():null;
    const show=!!(CUR&&(CUR.moments.length||RUN)&&!UI.hidden&&dr&&dr.height>10&&route()==="studio");
    stripRule(sr,show);
    if(!show){if(!bar.hidden)bar.hidden=true;const pp=Q("#lc103-pop",sr);if(pp)pp.hidden=true;return}
    /* keep clear of the owner's floating switcher in the same band (bottom right) */
    /* on a narrow screen there is no room beside it: the bar keeps its full width, its buttons move to the left (CSS) and the chip strip
       gets end padding, so only scrollable chips run under the switcher and the last chip can still be scrolled clear */
    try{const f=document.getElementById("lc49-float");let r=8,pad=0;if(f){const fr=f.getBoundingClientRect();if(fr.width&&fr.bottom>innerHeight-82&&fr.top<innerHeight)r=Math.max(8,Math.round(innerWidth-fr.left+8))}
      if(innerWidth-r<300){pad=r>8?r:0;r=8}const v=r+"px",pv=pad+"px";if(bar.style.getPropertyValue("--lc103-r")!==v)bar.style.setProperty("--lc103-r",v);if(bar.style.getPropertyValue("--lc103-pad")!==pv)bar.style.setProperty("--lc103-pad",pv)}catch(e){}
    const L=visible(),c=counts(),tops=topKeys();
    const sig=[CUR.key,CUR.moments.length,L.map(m=>m.i).join(","),curI,UI.collapsed,UI.order,JSON.stringify(UI.filters),RUN?Math.round(CUR.ply/Math.max(1,CUR.n)*50):"d"].join("|");
    bar.hidden=false;
    if(sig===barSig&&!force){paintTrack(bar);return}
    barSig=sig;bar.classList.toggle("fold",!!UI.collapsed);
    const k=L.findIndex(m=>m.i===curI),cm=k>=0?L[k]:null;
    const nav='<button type="button" class="sb-k" data-sb="prev" aria-label="Previous moment ( [ )" title="Previous moment ( [ )"'+(L.length?"":" disabled")+'>◀</button><button type="button" class="sb-k" data-sb="next" aria-label="Next moment ( ] )" title="Next moment ( ] )"'+(L.length?"":" disabled")+'>▶</button>';
    const prog=RUN?'<i class="sb-prog" style="width:'+Math.round(CUR.ply/Math.max(1,CUR.n)*100)+'%"></i>':"";
    if(UI.collapsed){
      bar.innerHTML=nav+(cm?'<button type="button" class="sb-i on" data-sb="go" data-i="'+cm.i+'" style="--c:'+TY[cm.primary].color+'">'+chipInner(cm,tops)+'</button>':'<span class="sb-e">'+(L.length?L.length+" moments · press ▶":RUN?"Scanning…":"No moment matches the filters")+'</span>')
        +'<button type="button" class="sb-k" data-sb="unfold" aria-label="Open the Showbar" title="Open the Showbar">▴</button>'+prog;
      return}
    bar.innerHTML='<div class="sb-tr" aria-hidden="true"></div>'+nav+'<span class="sb-n" aria-live="polite">'+(k>=0?(k+1)+" / "+L.length:L.length+(L.length===1?" moment":" moments"))+(RUN?"<br>scanning…":"")+'</span>'
      +'<div class="sb-f" role="group" aria-label="Filter by type">'+TYPES.map(t=>'<button type="button" class="sb-p" data-sb="flt" data-t="'+t.id+'" style="--c:'+t.color+'" aria-pressed="'+!!UI.filters[t.id]+'" aria-label="'+esc(t.label+": "+(c[t.id]||0))+'" title="'+esc(t.label)+'">'+esc(t.sym)+'<small>'+(c[t.id]||0)+'</small></button>').join("")+'</div>'
      +'<div class="sb-c" role="listbox" aria-label="Moments">'+(L.length?L.map(m=>'<button type="button" role="option" class="sb-i'+(m.i===curI?" on":"")+'" aria-selected="'+(m.i===curI)+'" data-sb="go" data-i="'+m.i+'" style="--c:'+TY[m.primary].color+'" title="'+esc(label(m)+" · "+m.reason)+'">'+chipInner(m,tops)+'</button>').join(""):'<span class="sb-e">'+(RUN?"Scanning the game… moments appear here as they are found.":"No moment matches the filters. Turn a type back on.")+'</span>')+'</div>'
      +'<button type="button" class="sb-k" data-sb="set" aria-label="Showbar settings, filters and the full list" title="Filters, order, clip plan">⚙</button><button type="button" class="sb-k" data-sb="fold" aria-label="Fold the Showbar" title="Fold">▾</button>'+prog;
    paintTrack(bar);
  }
  /* the older game strip of the Studio (lc31: "White vs Black · Find critical moments") appears above the stage as soon as a game is on the
     board, and pushed the stage down by a row. While the Showbar is on screen it replaces that strip, so the stage keeps its size (also when
     a jump loads the game in the middle of a take, when the Studio never resizes the stage). Hidden Showbar = the strip is back. */
  function stripRule(sr,on){let r=Q("#lc103-strip",sr);if(on&&!r){r=document.createElement("style");r.id="lc103-strip";r.textContent="#lc31-game{display:none!important}";sr.appendChild(r)}else if(!on&&r)r.remove()}
  function saveGame(){try{const L=api()._t.Libs,h=CUR.g&&CUR.g.headers||{},pgn=String(CUR.pgn||"").slice(0,2e4),norm=x=>String(x||"").replace(/\s+/g," ").trim();
    if(L.mine("games").some(x=>norm(x.pgn)===norm(pgn)))return"Already in the Student Game Library.";
    L.add("games",{name:((h.White||"White")+" vs "+(h.Black||"Black")).slice(0,80),pgn:pgn,note:CUR.moments.length+" moments (Moment Finder)"});return"Saved to the Student Game Library."}catch(e){console.error("[Moment Finder] save game",e);return"Could not save the game: "+(e&&e.message||e)}}
  function chipInner(m,tops){return'<span class="sb-l1"><span class="sb-sd '+m.color+'" aria-label="'+(m.color==="w"?"White":"Black")+'"></span><b>'+esc(label(m))+'</b>'+badgeHTML(m.primary,true)+(m.types.length>1?badgeHTML(m.types[1],true):"")+'<em>'+(tops.indexOf(m.i)>=0?'<span class="star" aria-label="top clip">★</span> ':"")+m.score+'</em></span><span class="sb-l2">'+esc(m.reason)+'</span>'}
  function paintTrack(bar){
    const tr=Q(".sb-tr",bar);if(!tr||!CUR)return;const n=Math.max(1,CUR.n||CUR.fens.length-1);let ix=null;try{const B=api().board;if(boardHas(B))ix=B.idx}catch(e){}
    const sig=n+"|"+curI+"|"+ix+"|"+visible().map(m=>m.i).join(",");if(tr.dataset.sig===sig)return;tr.dataset.sig=sig;
    tr.innerHTML=visible().map(m=>'<i class="'+(m.i===curI?"on":"")+'" style="left:'+(m.i/n*100).toFixed(2)+'%;--c:'+TY[m.primary].color+'"></i>').join("")+(ix!=null?'<b style="left:'+(ix/n*100).toFixed(2)+'%"></b>':"");
  }
  function scrollChip(){const bar=barEl();if(!bar)return;const on=Q(".sb-i.on",bar),c=Q(".sb-c",bar);if(on&&c){const l=on.offsetLeft-c.offsetLeft-40;c.scrollTo({left:Math.max(0,l),behavior:"smooth"})}}
  function onBarClick(e){
    const b=e.target.closest("[data-sb]");if(!b)return;const a=b.getAttribute("data-sb");
    if(a==="prev")return step(-1);if(a==="next")return step(1);
    if(a==="go"){const m=(CUR.moments||[]).filter(x=>x.i===+b.getAttribute("data-i"))[0];if(m)jump(m);return}
    if(a==="flt"){const t=b.getAttribute("data-t");UI.filters[t]=!UI.filters[t];saveUI();paintBar(true);paintList();return}
    if(a==="fold"){UI.collapsed=true;saveUI();closePop();return paintBar(true)}
    if(a==="unfold"){UI.collapsed=false;saveUI();paintBar(true);return scrollChip()}
    if(a==="set")return togglePop();
  }
  function closePop(){const sr=studioRoot(),p=sr&&Q("#lc103-pop",sr);if(p)p.hidden=true}
  function togglePop(){
    const sr=studioRoot(),p=sr&&Q("#lc103-pop",sr);if(!p)return;if(!p.hidden){p.hidden=true;return}
    const c=counts();
    p.innerHTML='<h4>Show these moments</h4><div class="pp-g">'+TYPES.map(t=>'<button type="button" class="pp-t" data-pp="flt" data-t="'+t.id+'" style="--c:'+t.color+'" aria-pressed="'+!!UI.filters[t.id]+'"><b>'+esc(t.sym)+'</b>'+esc(t.label)+'<small>'+(c[t.id]||0)+'</small></button>').join("")+'</div>'
      +'<div class="pp-r" style="margin:0 0 10px"><button type="button" class="pp-b" data-pp="all">All</button><button type="button" class="pp-b" data-pp="bad">Mistakes only</button><button type="button" class="pp-b" data-pp="good">Good moves only</button></div>'
      +'<label>Order<select data-pp="order"><option value="game"'+(UI.order==="game"?" selected":"")+'>Game order</option><option value="score"'+(UI.order==="score"?" selected":"")+'>Best clips first</option></select></label>'
      +'<label>A jump shows<select data-pp="jump"><option value="before"'+(UI.jump==="before"?" selected":"")+'>The position before the move</option><option value="after"'+(UI.jump==="after"?" selected":"")+'>The position after the move</option></select></label>'
      +'<label>Board side on a jump<select data-pp="orient"><option value="mover"'+(UI.orient==="mover"?" selected":"")+'>The side to move</option><option value="player"'+(UI.orient==="player"?" selected":"")+'>The player of this game</option><option value="keep"'+(UI.orient==="keep"?" selected":"")+'>Keep as it is</option></select></label>'
      +'<div class="pp-r"><button type="button" class="pp-b pri" data-pp="finder">Full list &amp; scan</button><button type="button" class="pp-b" data-pp="plan">Copy clip plan</button><button type="button" class="pp-b" data-pp="save">Save game to Student Games</button><button type="button" class="pp-b" data-pp="hide">Hide the Showbar</button></div>';
    p.hidden=false;
  }
  function onPopClick(e){
    const b=e.target.closest("[data-pp]");if(!b||b.tagName==="SELECT")return;const a=b.getAttribute("data-pp");
    if(a==="flt"){const t=b.getAttribute("data-t");UI.filters[t]=!UI.filters[t];b.setAttribute("aria-pressed",String(!!UI.filters[t]))}
    else if(a==="all"||a==="bad"||a==="good"){TYPES.forEach(t=>{UI.filters[t.id]=a==="all"||(a==="bad"?/blunder|mistake|inaccuracy|minefield/.test(t.id):/great|brilliant|top|minefield/.test(t.id))});closePop();togglePop()}
    else if(a==="finder"){closePop();return open()}
    else if(a==="plan"){copy(plan()).then(ok=>toast(ok?"Clip plan copied: one line per video.":"Could not copy the clip plan.",ok?"good":"err"));return}
    else if(a==="save"){toast(saveGame(),"");return}
    else if(a==="hide"){UI.hidden=true;saveUI();closePop();toast("Showbar hidden. Studio menu > ◆ Moments brings it back.","");}
    saveUI();paintBar(true);paintList();
  }
  function onPopChange(e){const s=e.target.closest("select[data-pp]");if(!s)return;UI[s.getAttribute("data-pp")]=s.value;saveUI();paintBar(true);paintList()}

  /* ---------- the Moment Finder (full-screen layer) ---------- */
  const LAYER_CSS="#lc103-ui{position:fixed;inset:0;z-index:2147483000;background:radial-gradient(1200px 500px at 20% -10%,rgba(0,229,255,.10),transparent 60%),#0A0B0E;color:#e5e7eb;font:500 14px Sora,system-ui,-apple-system,Segoe UI,sans-serif;overflow:auto;-webkit-overflow-scrolling:touch}"
    +"#lc103-ui *{box-sizing:border-box}#lc103-ui .m-top{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(10,11,14,.92);border-bottom:1px solid rgba(0,229,255,.2);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}"
    +"#lc103-ui h2{margin:0;font-size:16px;color:#fff}#lc103-ui h3{margin:0 0 8px;font-size:15px;color:#fff}#lc103-ui .m-grow{flex:1}"
    +"#lc103-ui .m-body{max-width:1100px;margin:0 auto;padding:14px;display:flex;flex-direction:column;gap:12px}"
    +"#lc103-ui .m-sec{padding:14px;border-radius:16px;background:rgba(20,23,29,.72);border:1px solid rgba(0,229,255,.2);display:flex;flex-direction:column;gap:10px;min-width:0}"
    +"#lc103-ui .m-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}"
    +"#lc103-ui .m-b{min-height:44px;padding:0 14px;border-radius:12px;background:#14171d;color:#e5e7eb;border:1px solid rgba(0,229,255,.4);font:600 13px Sora,system-ui,sans-serif;cursor:pointer;position:relative;overflow:hidden}#lc103-ui .m-b:hover{background:#1b2029}#lc103-ui .m-b.pri{background:#00E5FF;color:#0A0B0E;border-color:#00E5FF}#lc103-ui .m-b.gold{background:#fbbf24;color:#0A0B0E;border-color:#fbbf24}#lc103-ui .m-b:disabled{opacity:.5;cursor:default}#lc103-ui .m-b.sm{min-height:44px;padding:0 10px;font-size:12px}"
    +"#lc103-ui textarea{width:100%;min-height:110px;border-radius:12px;background:#0f141b;color:#e5e7eb;border:1px solid rgba(255,255,255,.14);padding:10px;font:500 13px ui-monospace,Menlo,Consolas,monospace;resize:vertical}"
    +"#lc103-ui input[type=text],#lc103-ui select{min-height:44px;border-radius:12px;background:#14171d;color:#e5e7eb;border:1px solid rgba(0,229,255,.4);padding:0 10px;font:600 13px Sora,system-ui,sans-serif;max-width:100%}"
    +"#lc103-ui .m-f{display:flex;flex-direction:column;gap:4px;font-size:12px;color:#94a3b8;min-width:0}"
    +"#lc103-ui .m-hint{margin:0;color:#94a3b8;font-size:12.5px}#lc103-ui .m-err{color:#fca5a5}"
    +"#lc103-ui .m-games{display:flex;flex-direction:column;gap:6px;max-height:300px;overflow:auto}#lc103-ui .m-game{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:6px 10px;border-radius:12px;background:#0f141b;border:1px solid rgba(255,255,255,.08);min-width:0}#lc103-ui .m-game>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px}"
    +"#lc103-ui .m-bar{height:8px;border-radius:6px;background:#1f2937;overflow:hidden}#lc103-ui .m-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#00E5FF,#38bdf8);transition:width .3s}"
    +"#lc103-ui .m-sum{display:flex;flex-wrap:wrap;gap:6px}#lc103-ui .m-t{min-height:44px;padding:0 10px;border-radius:12px;border:1px solid color-mix(in srgb,var(--c) 55%,transparent);background:color-mix(in srgb,var(--c) 12%,transparent);color:#e5e7eb;font:600 13px Sora,system-ui,sans-serif;display:flex;align-items:center;gap:6px;cursor:pointer}#lc103-ui .m-t b{color:var(--c)}#lc103-ui .m-t[aria-pressed=false]{opacity:.42;background:transparent;border-style:dashed}"
    +"#lc103-ui .m-list{display:flex;flex-direction:column;gap:8px}#lc103-ui .m-it{border-radius:14px;background:#0f141b;border:1px solid rgba(255,255,255,.09);border-left:4px solid var(--c);padding:10px 12px;display:flex;flex-direction:column;gap:6px;min-width:0}#lc103-ui .m-it.on{border-color:#00E5FF;border-left-color:var(--c);box-shadow:0 0 0 1px rgba(0,229,255,.3) inset}"
    +"#lc103-ui .m-h{display:flex;flex-wrap:wrap;align-items:center;gap:6px}#lc103-ui .m-h b{color:#fff;font-size:14px}#lc103-ui .m-rk{min-width:28px;height:28px;border-radius:8px;background:#14171d;display:grid;place-items:center;font-size:12px;color:#94a3b8}#lc103-ui .m-sc{margin-left:auto;font-weight:800;color:#00E5FF}#lc103-ui .m-form{font-size:11px;color:#94a3b8;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:1px 8px}"
    +"#lc103-ui .m-r{margin:0;color:#e2e8f0;font-size:13.5px;overflow-wrap:anywhere}#lc103-ui details{font-size:12.5px;color:#cbd5e1}#lc103-ui details summary{cursor:pointer;color:#94a3b8;min-height:32px;display:flex;align-items:center}#lc103-ui details p{margin:4px 0;overflow-wrap:anywhere}"
    +"#lc103-ui .m-toasts{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:5;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none}#lc103-ui .m-toast{padding:10px 14px;border-radius:12px;background:#111827;border:1px solid rgba(0,229,255,.4);color:#e5e7eb;font-size:13px;max-width:min(520px,90vw)}#lc103-ui .m-toast.err{border-color:#ef4444}#lc103-ui .m-toast.ok{border-color:#22c55e}"
    +"#lc103-ui .m-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px}"
    +".lc103-bd{font-style:normal;font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;color:var(--c);background:color-mix(in srgb,var(--c) 16%,transparent);border:1px solid color-mix(in srgb,var(--c) 50%,transparent);white-space:nowrap}"
    +"@media (max-width:600px){#lc103-ui .m-body{padding:10px}#lc103-ui .m-sec{padding:12px}}";
  const F={pgn:"",games:[],busy:false,err:"",prog:"",pct:0};
  function own(){
    try{const c=Elo.acct("chesscom");if(c&&c.user)return{site:"chesscom",user:c.user}}catch(e){}
    try{const l=Elo.acct("lichess");if(l&&l.user)return{site:"lichess",user:l.user}}catch(e){}
    try{const u=App.profile&&(App.profile.chess_com_username||App.profile.cc);if(u)return{site:"chesscom",user:u}}catch(e){}
    return null;
  }
  async function fetchT(url,accept){const c=new AbortController(),t=setTimeout(()=>c.abort(),12e3);try{const r=await fetch(url,{headers:accept?{Accept:accept}:{},signal:c.signal});if(!r.ok)throw new Error("HTTP "+r.status);return await r.text()}finally{clearTimeout(t)}}
  async function recent(site,user,n){
    user=String(user||"").trim();if(!/^[A-Za-z0-9_-]{2,30}$/.test(user))throw new Error("That name is not valid.");
    let pgns=[];
    if(site==="lichess"){const t=await fetchT("https://lichess.org/api/games/user/"+encodeURIComponent(user)+"?max="+n+"&clocks=false&opening=true","application/x-chess-pgn");pgns=LC80.scan.splitGames(t).pgns}
    else{const a=JSON.parse(await fetchT("https://api.chess.com/pub/player/"+encodeURIComponent(user.toLowerCase())+"/games/archives"));
      for(const mu of(a.archives||[]).slice(-3).reverse()){if(!/^https:\/\/api\.chess\.com\//.test(mu))continue;const j=JSON.parse(await fetchT(mu));(j.games||[]).slice().reverse().forEach(x=>{if(x&&x.pgn&&(!x.rules||x.rules==="chess")&&pgns.length<n)pgns.push(x.pgn)});if(pgns.length>=n)break}}
    return pgns.slice(0,n);
  }
  function hdr(p){const h={};String(p||"").replace(/\[(\w+)\s+"([^"]*)"\]/g,(m,k,v)=>{h[k]=v;return m});return h}
  function studentGames(){try{const L=api()._t.Libs.list("games")||[];return L.filter(x=>x&&x.pgn&&/\d+\.\s*\S/.test(x.pgn)).slice(0,40)}catch(e){return[]}}
  function boardGame(){try{const B=api()&&api().board;if(!B||!B.moves||B.moves.length<8)return"";const st=B.fens[0],std="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",m=B.meta||{};
    let s='[White "'+String(m.white||"White").replace(/"/g,"'")+'"]\n[Black "'+String(m.black||"Black").replace(/"/g,"'")+'"]\n[Result "'+(m.result||"*")+'"]\n'+(fenKey(st)!==fenKey(std)?'[SetUp "1"]\n[FEN "'+st+'"]\n':"")+"\n";
    const n0=+(String(st).split(" ")[5])||1,w0=String(st).split(" ")[1]!=="b";let n=n0,side=w0?"w":"b";const parts=[];
    B.moves.forEach((x,i)=>{parts.push(side==="w"?n+". "+x.san:(i===0?n+"... "+x.san:x.san));if(side==="b")n++;side=other(side)});return s+parts.join(" ")+" "+(m.result||"*")}catch(e){return""}}
  function g2sGame(){try{return typeof LC79!=="undefined"&&LC79._ai&&LC79._ai.pgn?String(LC79._ai.pgn):""}catch(e){return""}}
  function open(o){
    o=o||{};css();close(true);
    const el=document.createElement("div");el.id="lc103-ui";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label","Moment Finder");
    el.innerHTML='<header class="m-top"><button type="button" class="m-b" data-m="close" aria-label="Back to the Studio">← Studio</button><h2>◆ Moment Finder</h2><span class="m-grow"></span><button type="button" class="m-b sm" data-m="showbar">Show on the Showbar</button></header><div class="m-body"></div><div class="m-toasts" role="status" aria-live="polite"></div>';
    document.body.appendChild(el);document.documentElement.classList.add("lc103-lock");
    el.addEventListener("click",onUiClick);el.addEventListener("change",onUiChange);el.addEventListener("input",e=>{if(e.target.matches('[data-f="pgn"]'))F.pgn=e.target.value});
    if(o.pgn)F.pgn=String(o.pgn);else if(!F.pgn){F.pgn=boardGame()||g2sGame()||""}
    if(o.side&&/^(w|b)$/.test(o.side)){UI.side=o.side;saveUI()}
    paintUi();
    try{Q('[data-m="close"]',el).focus({preventScroll:true})}catch(e){}
    if(o.auto&&F.pgn)run();
    return el;
  }
  function close(silent){const el=Q("#lc103-ui");if(!el)return;el.remove();document.documentElement.classList.remove("lc103-lock");if(!silent)paintBar(true)}
  function css(){if(Q("#lc103-ui-css"))return;const s=document.createElement("style");s.id="lc103-ui-css";s.textContent=LAYER_CSS+"html.lc103-lock{overflow:hidden}";document.head.appendChild(s)}
  function srcHTML(){
    const me=own(),sg=studentGames(),bg=boardGame(),g2=g2sGame();
    return'<section class="m-sec" aria-labelledby="lc103-s1"><h3 id="lc103-s1">1. The game</h3>'
      +'<textarea data-f="pgn" aria-label="PGN" placeholder="Paste a PGN: your own game, a student’s game or any game.">'+esc(F.pgn)+'</textarea>'
      +'<div class="m-row"><label class="m-b sm" style="display:inline-flex;align-items:center">Open a .pgn file<input type="file" accept=".pgn,.txt,text/plain,application/x-chess-pgn" data-f="file" style="position:absolute;inset:0;opacity:0;cursor:pointer" aria-label="Open a .pgn file"></label>'
      +(bg?'<button type="button" class="m-b sm" data-m="board">The game on the Studio board</button>':'')
      +(g2&&g2!==bg?'<button type="button" class="m-b sm" data-m="g2s">The Game-to-Script game</button>':'')
      +(me?'<button type="button" class="m-b sm" data-m="mine">My last games ('+esc(me.user)+')</button>':'')
      +(sg.length?'<button type="button" class="m-b sm" data-m="lib">Student Game Library ('+sg.length+')</button>':'')+'</div>'
      +'<div class="m-row"><select data-f="site" aria-label="Site"><option value="chesscom">Chess.com</option><option value="lichess">Lichess</option></select><input type="text" data-f="user" placeholder="Any player’s name" aria-label="Player name" style="width:190px"><button type="button" class="m-b sm" data-m="theirs">Their last games</button></div>'
      +'<div class="m-games" data-games>'+gamesHTML()+'</div>'
      +'<div class="m-cols"><label class="m-f"><span>Whose moves</span><select data-f="side"><option value="both"'+(UI.side==="both"?" selected":"")+'>Both sides</option><option value="w"'+(UI.side==="w"?" selected":"")+'>White only</option><option value="b"'+(UI.side==="b"?" selected":"")+'>Black only</option></select></label>'
      +'<label class="m-f"><span>Depth</span><select data-f="depth"><option value="deep"'+(UI.depth==="deep"?" selected":"")+'>Thorough (about 1 s a move)</option><option value="fast"'+(UI.depth==="fast"?" selected":"")+'>Fast (about 0.4 s a move)</option></select></label></div>'
      +'<div class="m-row"><button type="button" class="m-b pri" data-m="run"'+(F.busy?" disabled":"")+'>Find every moment</button>'+(F.busy?'<button type="button" class="m-b" data-m="stop">Stop</button>':'')+'<span class="m-hint">Stockfish on this device, every move of the game. Nothing is sent anywhere.</span></div>'
      +(F.busy||F.pct?'<div class="m-bar" aria-hidden="true"><i style="width:'+F.pct+'%"></i></div>':'')
      +'<p class="m-hint'+(F.err?" m-err":"")+'" data-st aria-live="polite">'+esc(F.err||F.prog)+'</p></section>';
  }
  function gamesHTML(){return(F.games||[]).map((p,i)=>{const h=hdr(p.pgn||p);return'<div class="m-game"><span>'+esc(p.name?p.name:((h.White||"?")+(h.WhiteElo?" ("+h.WhiteElo+")":"")+" vs "+(h.Black||"?")+(h.BlackElo?" ("+h.BlackElo+")":"")+" · "+(h.Result||"")+" · "+String(h.Date||h.UTCDate||"").replace(/\./g,"-")))+'</span><button type="button" class="m-b sm" data-m="use" data-i="'+i+'">Scan this game</button></div>'}).join("")}
  function listHTML(){
    if(!CUR)return'<section class="m-sec"><h3>2. The moments</h3><p class="m-hint">Scan a game: every blunder, mistake, minefield, great, brilliant and hard-to-find engine move lands here and on the Showbar.</p>'+historyHTML()+'</section>';
    const c=counts(),L=visible(UI.lorder),tops=topKeys();
    let h='<section class="m-sec" aria-labelledby="lc103-s2"><h3 id="lc103-s2">2. '+esc(CUR.label)+' · '+CUR.moments.length+' moments'+(RUN?" (scanning…)":"")+'</h3>'
      +'<div class="m-sum" role="group" aria-label="Filter by type">'+TYPES.map(t=>'<button type="button" class="m-t" data-m="flt" data-t="'+t.id+'" style="--c:'+t.color+'" aria-pressed="'+!!UI.filters[t.id]+'"><b>'+esc(t.sym)+'</b>'+esc(t.label)+' '+(c[t.id]||0)+'</button>').join("")+'</div>'
      +'<div class="m-row"><label class="m-f"><span>Order</span><select data-f="lorder"><option value="score"'+(UI.lorder==="score"?" selected":"")+'>Best clips first</option><option value="game"'+(UI.lorder==="game"?" selected":"")+'>Game order</option></select></label><span class="m-grow"></span><button type="button" class="m-b gold" data-m="plan">Copy clip plan ('+L.length+')</button><button type="button" class="m-b" data-m="showbar">Show on the Showbar</button></div>'
      +'<p class="m-hint">Clip score: contrast between the instinct and the right move, how natural the trap looks (or how hard the good move is to see), the payoff and a clear, forcing line. One game, several videos: each line of the clip plan is one video.</p>'
      +'<div class="m-list">'+(L.length?L.map((m,ix)=>itemHTML(m,ix,tops)).join(""):'<p class="m-hint">No moment matches the filters.</p>')+'</div>'+historyHTML()+'</section>';
    return h;
  }
  function itemHTML(m,ix,tops){
    const bad=/blunder|mistake|inaccuracy/.test(m.types.join(" "))||m.fell,d=m.diag;
    return'<article class="m-it'+(m.i===curI?" on":"")+'" style="--c:'+TY[m.primary].color+'" data-it="'+m.i+'"><div class="m-h"><span class="m-rk">'+(ix+1)+'</span><b>'+esc(label(m))+'</b><span class="m-hint">'+(m.color==="w"?"White":"Black")+'</span>'+m.types.map(t=>badgeHTML(t)).join("")+'<span class="m-form">'+esc(FORM[m.form||"short"])+'</span><span class="m-sc">'+(tops.indexOf(m.i)>=0?"★ ":"")+m.score+'</span></div>'
      +'<p class="m-r">'+esc(m.reason)+'</p>'
      +'<details><summary>The facts</summary>'
        +(d&&d.error?'<p><b>What went wrong:</b> '+esc(d.error)+'</p>':'')
        +(d&&d.blind?'<p><b>Why a human misses it ('+esc(d.blind.label)+'):</b> '+esc(d.blind.text)+'</p>':'')
        +(m.traps&&m.traps.length?'<p><b>Natural moves that lose:</b> '+esc(m.traps.map(t=>t.san+" (−"+t.loss+")").join(", "))+(m.safe&&m.safe.length?'. <b>Only these hold:</b> '+esc(m.safe.join(" / ")):'')+'.</p>':'')
        +(m.bestSan?'<p><b>'+(bad?"Better":"Stockfish")+':</b> '+esc(m.bestLine||m.bestSan)+'</p>':'')
        +(bad&&m.replyLine?'<p><b>The refutation after '+esc(m.san)+':</b> '+esc(m.replyLine)+'</p>':'')
        +'<p><b>Instinct rank of '+esc(m.san)+':</b> #'+m.rank+' of '+m.legal+(m.tags&&m.tags.length?' ('+esc(m.tags.join(", "))+')':'')+'. Win chance '+m.wBefore+' → '+m.wAfter+'.</p>'
        +'<p><b>MSPC:</b> '+esc(LN[m.letter||"C"]+": "+CUE[m.letter||"C"])+'.</p></details>'
      +'<div class="m-row"><button type="button" class="m-b sm pri" data-m="jump" data-i="'+m.i+'">Show on the Studio board</button>'
      +(bad?'<button type="button" class="m-b sm" data-m="deep" data-i="'+m.i+'">Deep dive in Game-to-Script</button><button type="button" class="m-b sm" data-m="proj" data-i="'+m.i+'">Make a video project</button>':'')
      +'<button type="button" class="m-b sm" data-m="brief" data-i="'+m.i+'" data-ix="'+ix+'">Copy clip brief</button></div></article>';
  }
  function historyHTML(){const L=scans().filter(s=>!CUR||s.key!==CUR.key);if(!L.length)return"";return'<details><summary>Earlier scans on this device ('+L.length+')</summary><div class="m-games">'+L.map(s=>'<div class="m-game"><span>'+esc(s.label+" · "+s.moments.length+" moments · "+new Date(s.at).toLocaleDateString())+'</span><button type="button" class="m-b sm" data-m="reopen" data-k="'+esc(s.key)+'">Open</button></div>').join("")+'</div></details>'}
  function paintUi(){const b=Q("#lc103-ui .m-body");if(!b)return;b.innerHTML=srcHTML()+listHTML()}
  let listT=0;
  function paintList(){const el=Q("#lc103-ui .m-body");if(!el)return;const secs=QA(".m-sec",el);if(secs[1]){const tmp=document.createElement("div");tmp.innerHTML=listHTML();secs[1].replaceWith(tmp.firstChild)}}
  function status(t,bad){F.err=bad?t:"";F.prog=bad?"":t;const s=Q("#lc103-ui [data-st]");if(s){s.textContent=t||"";s.classList.toggle("m-err",!!bad)}}
  async function loadGames(site,user){status("Loading games…");try{F.games=(await recent(site,user,12)).map(p=>({pgn:p}));const g=Q("#lc103-ui [data-games]");if(g)g.innerHTML=gamesHTML();status(F.games.length?"Pick a game.":"No games found for that name.",!F.games.length)}catch(e){console.error("[Moment Finder] games",e);status("Could not load the games: "+(e&&e.message||String(e))+". Paste the PGN instead.",true)}}
  async function run(){
    const t=Q('#lc103-ui [data-f="pgn"]');if(t)F.pgn=t.value;
    if(!String(F.pgn||"").trim()){status("Paste a PGN or pick a game first.",true);return}
    if(F.busy)return;F.busy=true;F.pct=0;F.err="";curI=null;UI.hidden=false;saveUI();paintUi();status("Starting Stockfish…");
    let lastPaint=0;
    try{
      await scan(F.pgn,{depth:UI.depth,side:UI.side,
        onVerify:(q,tot)=>{F.pct=80+Math.round(q/Math.max(1,tot)*20);status("Checking the "+(CUR?CUR.moments.length:0)+" moments deeper ("+(q+1)+" of "+tot+" positions)…");const bar=Q("#lc103-ui .m-bar i");if(bar)bar.style.width=F.pct+"%"},
        onTick:(i,n,ms)=>{F.pct=Math.round(i/Math.max(1,n)*80);const left=i>2?Math.round(ms/i*(n-i)/1000):null;
          status("Stockfish: move "+Math.ceil((i+1)/2)+" of "+Math.ceil(n/2)+" · "+(CUR?CUR.moments.length:0)+" moments so far"+(left!=null?" · about "+left+" s left":"")+"…");
          const bar=Q("#lc103-ui .m-bar i");if(bar)bar.style.width=F.pct+"%";
          if(Date.now()-lastPaint>1500){lastPaint=Date.now();paintList();paintBar(true)}}});
      F.busy=false;F.pct=100;paintUi();status(CUR.moments.length+" moments found. They are on the Showbar too.");paintBar(true);
    }catch(e){
      F.busy=false;const m=String(e&&e.message||e);
      if(/stopped/.test(m)){if(CUR){CUR.done=false;remember(CUR)}paintUi();status("Stopped. "+(CUR?CUR.moments.length:0)+" moments up to move "+Math.ceil(((CUR&&CUR.ply)||0)/2)+" are kept.")}
      else{console.error("[Moment Finder] scan",e);paintUi();status(m,true)}
      paintBar(true);
    }
  }
  function momentAt(i){return(CUR&&CUR.moments||[]).filter(m=>m.i===+i)[0]||null}
  function asItem(m){const cls=m.types.indexOf("blunder")>=0?"blunder":m.types.indexOf("mistake")>=0?"mistake":"inaccuracy";
    return{i:m.i,color:m.color,san:m.san,num:m.num,loss:m.loss,cls:cls,best:m.best,bestSan:m.bestSan,reply:m.reply,replySan:m.replySan,k:m.letter}}
  function makeProject(m){
    try{if(typeof LC79==="undefined"||!LC79.newProject||!LC79.db)throw new Error("Studio projects are not available.");
      const key=LC79.pgnKey?LC79.pgnKey(CUR.pgn):pgnKey(CUR.pgn),it=asItem(m);
      const had=LC79.db().list.filter(p=>p.src&&p.src.key===key&&p.src.item&&p.src.item.i===m.i)[0];if(had)return{p:had,had:true};
      const h=CUR.g&&CUR.g.headers||{},who=m.color==="w"?(h.White||"White"):(h.Black||"Black");
      const p=LC79.newProject(("Reel · "+label(m)+(it.cls==="blunder"?"??":it.cls==="mistake"?"?":"?!")+" · "+who).slice(0,60));
      p.src={key:key,pgn:String(CUR.pgn).slice(0,2e5),item:it,label:label(m)+" ("+(h.White||"White")+" vs "+(h.Black||"Black")+")",motif:m.diag&&m.diag.alarm?m.diag.alarm.label:TY[m.primary].label,sim:null,moment:{types:m.types,score:m.score,reason:m.reason}};
      p.updated=Date.now();Store.set("lc79-projects",LC79.db());return{p:p,had:false}}
    catch(e){console.error("[Moment Finder] project",e);return{err:e&&e.message||String(e)}}
  }
  async function onUiClick(e){
    const b=e.target.closest("[data-m]");if(!b||b.tagName==="SELECT"||b.tagName==="INPUT")return;const a=b.getAttribute("data-m");
    if(a==="close")return close();
    if(a==="showbar"){UI.hidden=false;saveUI();close();if(!CUR)toast("Scan a game first.","");return}
    if(a==="board"){F.pgn=boardGame();return paintUi()}
    if(a==="g2s"){F.pgn=g2sGame();return paintUi()}
    if(a==="mine"){const o=own();if(o)return loadGames(o.site,o.user)}
    if(a==="theirs"){const u=Q('#lc103-ui [data-f="user"]').value,s=Q('#lc103-ui [data-f="site"]').value;return loadGames(s,u)}
    if(a==="lib"){F.games=studentGames().map(x=>({pgn:x.pgn,name:x.name||""}));const g=Q("#lc103-ui [data-games]");if(g)g.innerHTML=gamesHTML();return status("Pick a game from the Student Game Library.")}
    if(a==="use"){const x=F.games[+b.getAttribute("data-i")];if(!x)return;F.pgn=x.pgn||"";const t=Q('#lc103-ui [data-f="pgn"]');if(t)t.value=F.pgn;return run()}
    if(a==="run")return run();
    if(a==="stop"){stop();return}
    if(a==="flt"){const t=b.getAttribute("data-t");UI.filters[t]=!UI.filters[t];saveUI();paintList();return paintBar(true)}
    if(a==="plan"){const ok=await copy(plan());return say(ok?"Clip plan copied: one line per video.":"Could not copy. Select the text in a brief and copy it by hand.",ok?"ok":"err")}
    if(a==="reopen"){useScan(b.getAttribute("data-k"));curI=null;return paintUi()}
    const m=momentAt(b.getAttribute("data-i"));if(!m)return;
    if(a==="jump"){if(jump(m)){close();scrollChip()}return}
    if(a==="brief"){const ok=await copy(brief(m,+b.getAttribute("data-ix")));return say(ok?"Clip brief copied.":"Could not copy.",ok?"ok":"err")}
    if(a==="deep"){if(typeof LC79==="undefined"||!LC79.openFromProject)return say("Game-to-Script is not available.","err");close(true);try{LC79.openFromProject({src:{pgn:CUR.pgn,item:asItem(m),sim:null}})}catch(x){console.error(x);say("Game-to-Script could not open this moment.","err")}return}
    if(a==="proj"){const r=makeProject(m);if(r.err)return say("Could not make the project: "+r.err,"err",5000);return say(r.had?"This moment already has a project: “"+r.p.name+"”.":"Project “"+r.p.name+"” made. Pick it in the record bar; keys 1–4 run the recording flow.","ok",4500)}
  }
  function onUiChange(e){
    const el=e.target,f=el.getAttribute("data-f");
    if(f==="side"||f==="depth"||f==="lorder"){UI[f]=el.value;saveUI();if(f==="lorder")paintList();return}
    if(f==="file"&&el.files&&el.files[0]){const fl=el.files[0];if(fl.size>5e6){status("That file is too large (max 5 MB).",true);return}
      fl.text().then(t=>{let pg=[];try{pg=LC80.scan.splitGames(t).pgns}catch(x){pg=[t]}if(pg.length>1){F.games=pg.slice(0,60).map(p=>({pgn:p}));const g=Q("#lc103-ui [data-games]");if(g)g.innerHTML=gamesHTML();status(pg.length+" games in the file. Pick one.")}else{F.pgn=pg[0]||t;const ta=Q('#lc103-ui [data-f="pgn"]');if(ta)ta.value=F.pgn;status("Game loaded. Press Find every moment.")}})}
  }

  /* ---------- life cycle ---------- */
  let tickT=0;
  function tick(){
    tickT=0;if(route()!=="studio"){const b=barEl();if(b&&!b.hidden)b.hidden=true;return}
    paintBar();syncCur();tickT=setTimeout(tick,700);
  }
  function afterRender(r){if(String(r||route())==="studio"){if(!CUR){const s=scans()[0];if(s)CUR=Object.assign({},s)}clearTimeout(tickT);tickT=setTimeout(tick,400)}}
  function init(){
    window.addEventListener("keydown",e=>{
      if(e.key==="Escape"&&Q("#lc103-ui")){e.stopPropagation();close();return}
      if(route()!=="studio"||e.ctrlKey||e.metaKey||e.altKey||Q("#lc103-ui"))return;if(e.key!=="["&&e.key!=="]")return;
      const t=(e.composedPath&&e.composedPath()[0])||e.target;if(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable))return;
      if(!CUR||!CUR.moments.length)return;e.preventDefault();step(e.key==="]"?1:-1);
    },true);
    window.addEventListener("hashchange",()=>{if(route()!=="studio"){close(true);clearTimeout(tickT);tickT=0;const b=barEl();if(b)b.hidden=true}else afterRender("studio")});
    if(route()==="studio")afterRender("studio");
  }
  return{init:init,afterRender:afterRender,open:open,close:close,scan:scan,stop:stop,jump:jump,step:step,visible:visible,counts:counts,useScan:useScan,scans:scans,plan:plan,brief:brief,
    paint:()=>paintBar(true),cur:()=>CUR,ui:()=>UI,setUI(p){Object.assign(UI,p||{});saveUI();paintBar(true)},
    _t:{last:()=>LAST,instinct:instinct,judge:judge,explain:explain,scoreOf:scoreOf,reasonOf:reasonOf,sacOf:sacOf,material:material,defended:defended,pgnKey:pgnKey,plainPgn:plainPgn,TYPES:TYPES,DEPTH:DEPTH,setCur(c){CUR=c},curI:()=>curI},version:VERSION};
})(); /*@@end lc103*/
