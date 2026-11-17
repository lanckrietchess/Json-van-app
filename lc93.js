/*@@module lc93*/
const LC93=(()=>{
  /* LC93 (9.57.0): "What the board says" in the MSPC trainer and the course drills.
     After a step of an MSPC case is answered, the app adds what the board itself shows for that letter, computed from the position
     and the case's own line with the Coach Brain (LC83), never a stock sentence:
       M  what their last move did (the piece moved back to see what it changed), and their threat now
       S  material, loose pieces on both sides, the kings' free squares, passed pawns
       P  your checks and captures, and where the line's first move sits in that list
       C  what the line does move by move (fork, pin, skewer, mate ...) and what it wins
     The case's own question and answers stay; this is the second opinion from the board. */
  const VERSION="9.57.0";
  const NAME={p:"pawn",n:"knight",b:"bishop",r:"rook",q:"queen",k:"king"},VAL={p:1,n:3,b:3,r:5,q:9,k:0};
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const other=c=>c==="w"?"b":"w";
  const list=a=>a.length<2?a.join(""):a.slice(0,-1).join(", ")+" and "+a[a.length-1];
  const ok=()=>typeof LC83!=="undefined"&&LC83.parse&&typeof Chess!=="undefined";
  const sideOf=fen=>String(fen).split(" ")[1]==="b"?"b":"w";
  const U=m=>m.from+m.to+(m.promotion||"");
  /* the position before the last move: the moved piece goes back (a captured piece is not known) */
  function prevFen(fen,lm){
    try{const from=lm&&(lm.from||lm[0]),to=lm&&(lm.to||lm[1]);if(!from||!to)return null;const g=new Chess(fen),p=g.get(to);if(!p)return null;
      g.remove(to);g.put(p,from);const parts=g.fen().split(" ");parts[1]=p.color;parts[3]="-";return parts.join(" ")}catch(e){return null}
  }
  function lineUcis(fen,pgn){
    const out=[];try{const g=new Chess(fen);String(pgn||"").replace(/\{[^}]*\}/g," ").replace(/\d+\.(\.\.)?/g," ").trim().split(/\s+/).filter(Boolean).forEach(t=>{const m=g.move(t,{sloppy:true});if(m)out.push(U(m))})}catch(e){}
    return out;
  }
  function material(fen,me){
    const B=LC83.parse(fen),sum=c=>Object.keys(B).reduce((t,q)=>t+(B[q].c===c&&B[q].t!=="k"?VAL[B[q].t]:0),0),d=sum(me)-sum(other(me));
    return d===0?"Material is level.":d>0?"You are "+(d===1?"a pawn":d+" pawns' worth")+" up.":"You are "+(d===-1?"a pawn":-d+" pawns' worth")+" down.";
  }
  function factsM(fen,lm,me){
    const out=[],them=other(me);
    const pf=prevFen(fen,lm);
    if(pf){const from=lm.from||lm[0],to=lm.to||lm[1];const f=LC83.moveFacts(pf,from+to,me);const t=f?LC83.factText(f,3):"";
      const B=LC83.parse(fen),p=B[to];out.push("Their "+(p?NAME[p.t]:"piece")+" went from "+from+" to "+to+(t?": "+t.replace(/^It /,"it ").replace(/\. It /g,"; it "):"."))}
    const th=LC83.threatOf(fen,them);
    out.push(th?"Their threat now: "+th.text+".":"They threaten nothing concrete right now: no mate and no capture that wins material.");
    return out;
  }
  function factsS(fen,me){
    const out=[material(fen,me)],B=LC83.parse(fen),them=other(me),cc=LC83.cca(fen);
    const L=a=>list(a.slice(0,3).map(x=>NAME[x.t]+" on "+x.sq));
    out.push(cc.theirLoose.length?"Loose on their side: "+L(cc.theirLoose)+".":"Nothing of theirs is loose.");
    if(cc.myLoose.length)out.push("Loose on your side: "+L(cc.myLoose)+".");
    const kr=c=>LC83.kingRoom?LC83.kingRoom(fen,c):null;
    if(kr){const a=kr(them),b=kr(me);out.push("Free squares for their king: "+a+"; for yours: "+b+".")}
    if(LC83.passed){const pp=Object.keys(B).filter(q=>B[q].t==="p"&&LC83.passed(B,q));const m=pp.filter(q=>B[q].c===me),t=pp.filter(q=>B[q].c===them);if(m.length||t.length)out.push("Passed pawns: "+(m.length?"yours on "+list(m):"none for you")+(t.length?", theirs on "+list(t):"")+".")}
    return out;
  }
  function factsP(fen,ucis){
    const out=[],g=new Chess(fen),ms=g.moves({verbose:true});
    const ch=ms.filter(m=>/[+#]/.test(m.san)).map(m=>m.san),cp=ms.filter(m=>m.captured).map(m=>m.san);
    out.push("Your checks: "+(ch.length?list(ch.slice(0,6))+(ch.length>6?" (+"+(ch.length-6)+")":""):"none")+".");
    out.push("Your captures: "+(cp.length?list(cp.slice(0,6))+(cp.length>6?" (+"+(cp.length-6)+")":""):"none")+".");
    if(ucis&&ucis[0]){const m=ms.find(x=>U(x)===ucis[0]||x.from+x.to===ucis[0].slice(0,4));if(m){
      const t=new Chess(fen);t.move(m);const th=!/[+#]/.test(m.san)&&!m.captured&&LC83.threatOf?LC83.threatOf(t.fen(),m.color):null;
      out.push("The move of this case, "+m.san+", is "+(/[+#]/.test(m.san)?"a check":m.captured?"a capture":th?"quiet, but it threatens "+th.san:"a quiet move")+(/[+#]/.test(m.san)||m.captured?": it is on the list above.":th?": an attack, the A of CCA.":": it only shows up when you compare candidates."))}}
    return out;
  }
  function factsC(fen,ucis,me){
    const out=[];if(!ucis||!ucis.length||!LC83.walk)return out;
    const st=LC83.walk(fen,ucis,24),mo=LC83.motifsOf(fen,st,me,me).filter(x=>x.id!=="quiet"),sw=LC83.swingOf?LC83.swingOf(fen,st,me):null;
    mo.slice(0,3).forEach(x=>out.push(x.text));
    const last=st[st.length-1];
    if(last&&last.mate&&last.m.color===me)out.push("The line ends in mate.");
    else if(sw&&sw.net>0){const w=sw.net>=9?"about a queen":sw.net>=5?"about a rook":sw.net>=3?"a piece":sw.net===1?"a pawn":sw.net+" pawns";out.push("The line wins "+w+".")}
    else if(sw&&sw.net<0)out.push("The line gives "+(-sw.net)+" pawn"+(sw.net===-1?"":"s")+"' worth of material: the point is the position, not the count.");
    return out;
  }
  function facts(k,o){
    if(!ok()||!o||!o.fen)return[];
    const me=o.side||sideOf(o.fen);
    try{
      if(k==="M")return factsM(o.fen,o.lastMove,me);
      if(k==="S")return factsS(o.fen,me);
      if(k==="P")return factsP(o.fen,o.ucis||lineUcis(o.fen,o.pgn));
      if(k==="C")return factsC(o.fen,o.ucis||lineUcis(o.fen,o.pgn),me);
    }catch(e){try{console.warn("LC93",e)}catch(x){}}
    return[];
  }
  const TITLE={M:"What their move did",S:"What the board shows",P:"Your forcing moves",C:"What the line does"};
  function html(k,o){
    const f=facts(k,o);if(!f.length)return"";
    return'<div class="lc93" data-lc93="'+esc(k)+'"><p class="lc93-h"><b>'+esc(TITLE[k]||"The board")+'</b> <span>· from the board</span></p><ul>'+f.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul></div>";
  }
  function css(){
    if(typeof document==="undefined"||document.getElementById("lc93-css"))return;const s=document.createElement("style");s.id="lc93-css";
    s.textContent=".lc93{margin-top:10px;border:1px solid rgba(56,189,248,.3);background:rgba(56,189,248,.06);border-radius:12px;padding:8px 12px}.lc93-h{margin:0 0 4px}.lc93-h span{font-size:11px;color:#94a3b8}.lc93 ul{margin:0;padding-left:18px}.lc93 li{margin:3px 0;font-size:14px}";
    document.head.appendChild(s);
  }
  if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",css);else css()}
  return{facts:facts,html:html,prevFen:prevFen,lineUcis:lineUcis,version:VERSION};
})();
window.LC93=LC93;
/*@@end lc93*/
