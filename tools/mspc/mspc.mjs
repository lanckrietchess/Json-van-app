/* MSPC note composer. Pure functions: (position, move, engine numbers) -> short, factual coaching lines.
   Every sentence is derived from the board (chess.js) or from a Stockfish number, never invented.
   Fields: m (Move), s (Specifics), p (Priorities), c (Calculation), w (Why this move), r (Remember it).
   Notes are written for the player who makes the move ("you"). */
import {createRequire} from 'node:module';
const {Chess}=createRequire(import.meta.url)('chess.js');
export {Chess};

const NAME={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const VAL={p:1,n:3,b:3,r:5,q:9,k:0};
const FILES='abcdefgh';
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
export const cleanSan=s=>String(s||'').replace(/[+#!?]+$/g,'');
/* position key: placement, side to move, castling rights. The en-passant field is dropped on purpose: chess.js 0.10 writes it after
   every double push even when no capture exists, which would split one position into two keys. */
export const fenKey=f=>String(f).split(' ').slice(0,3).join(' ');
export const noteKey=(fen,san)=>fenKey(fen)+'|'+cleanSan(san);
const other=c=>c==='w'?'b':'w';
const wordCount=s=>String(s).trim().split(/\s+/).filter(Boolean).length;
const trim=(s,n)=>{const w=String(s).trim().split(/\s+/);return w.length<=n?w.join(' '):w.slice(0,n).join(' ').replace(/[,;:]$/,'')+'.'};

/* the same position with the other side to move (a "null move"); null when it would be illegal (side to move is in check) */
export function nullFen(fen){
  const g=new Chess();if(!g.load(fen)||g.in_check())return null;     /* chess.js does not reject a flipped position whose side not to move is in check */
  const p=fen.split(' ');p[1]=other(p[1]);p[3]='-';
  const f=p.join(' ');
  return new Chess().load(f)?f:null;
}
const startRank=c=>c==='w'?1:8;
const homeRank=(sq,c)=>+sq[1]===startRank(c);

function pieceCounts(g,c){
  const n={p:0,n:0,b:0,r:0,q:0,k:0};
  g.board().forEach(row=>row.forEach(x=>{if(x&&x.color===c)n[x.type]++}));
  return n;
}
function squaresOf(g,c,type){
  const out=[];g.board().forEach((row,r)=>row.forEach((x,f)=>{if(x&&x.color===c&&x.type===type)out.push(FILES[f]+(8-r))}));return out;
}
/* minors that have left their home squares */
function developed(g,c){
  const r=startRank(c);let n=0;
  g.board().forEach((row,ri)=>row.forEach((x,f)=>{if(x&&x.color===c&&(x.type==='n'||x.type==='b')&&(8-ri)!==r)n++}));
  return n;
}
const phaseOf=(g,fullmove)=>{
  const w=pieceCounts(g,'w'),b=pieceCounts(g,'b');
  const mat=c=>c.n*3+c.b*3+c.r*5+c.q*9;
  if((w.q===0&&b.q===0&&mat(w)+mat(b)<=26)||mat(w)+mat(b)<=14)return'endgame';
  return fullmove<=10?'opening':'middlegame';
};

/* ---------- M: what the opponent's last move did ---------- */
/* g: game at the position BEFORE the user's move (opponent just moved). last: verbose move object of the opponent's last move or null.
   threat: {san,gain} from the engine's null-move search, or null. */
const START_KEY='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq';
export function noteM(g,last,threat){
  if(!last){
    if(fenKey(g.fen())===START_KEY)return 'Nothing has changed yet. You choose the structure.';
    /* a puzzle or study position: there is no last move to read, so read the threats themselves */
    return trim('No last move to read, so ask what they threaten now.'+(threat&&threat.san&&threat.gain>=100?' Threat: '+threat.san+'.':' No direct threat.'),22);
  }
  const piece=NAME[last.piece],san=last.san;
  let what,head='Their '+san;
  if(last.flags.includes('k')||last.flags.includes('q')){head='They';what='castled: their king is safe'}
  else if(last.captured&&last.piece==='p'&&last.captured==='p')what='trades pawns on '+last.to;
  else if(last.captured)what='takes your '+NAME[last.captured]+' on '+last.to;
  else if(/[+#]/.test(san))what='gives check';
  else if(last.promotion)what='promotes';
  else {
    /* what does the moved piece now hit? (legal captures for the last mover from the flipped position) */
    const nf=nullFen(g.fen());let eyes=null;
    if(nf){
      const h=new Chess(nf);
      const hits=h.moves({verbose:true}).filter(m=>m.from===last.to&&m.captured).sort((a,b)=>VAL[b.captured]-VAL[a.captured]);
      if(hits.length)eyes=hits[0];
    }
    const dbl=last.piece==='p'&&Math.abs(+last.to[1]-+last.from[1])===2;
    if(eyes)what='now hits your '+NAME[eyes.captured]+' on '+eyes.to;
    else if(dbl&&'cdef'.includes(last.to[0]))what='grabs space in the centre';
    else if(last.piece==='p')what='pushes the '+last.from[0]+'-pawn';
    else if((last.piece==='n'||last.piece==='b')&&homeRank(last.from,last.color))what='develops the '+piece;
    else what='moves the '+piece+' to '+last.to;
  }
  let t='';
  if(threat&&threat.san&&threat.gain>=100)t=' Threat: '+threat.san+'.';
  else if(!/[+#]/.test(san))t=' No direct threat.';          /* after a check the check itself is the point */
  return trim(head+' '+what+'.'+t,22);
}

/* ---------- S: specifics of the position ---------- */
export function noteS(g,mover,fullmove){
  const feats=[];
  const ph=phaseOf(g,fullmove);
  const opp=other(mover);
  /* pawn tension: a pawn of the mover and a pawn of the opponent attack each other on the c-f files */
  const bd=g.board();const at=sq=>{const f=FILES.indexOf(sq[0]),r=8-(+sq[1]);return bd[r]&&bd[r][f]};
  let tension=null;
  for(let f=2;f<=5&&!tension;f++)for(let r=2;r<=7&&!tension;r++){
    const x=bd[8-r][f];if(!x||x.type!=='p'||x.color!==mover)continue;
    const dir=mover==='w'?1:-1;
    for(const df of[-1,1]){const ff=f+df,rr=r+dir;if(ff<0||ff>7||rr<1||rr>8)continue;const y=bd[8-rr][ff];if(y&&y.type==='p'&&y.color===opp){tension=FILES[ff]+rr;break}}
  }
  if(tension)feats.push('Pawn tension on '+tension+'.');
  /* king */
  const ks=squaresOf(g,mover,'k')[0];
  const rights=g.fen().split(' ')[2];
  const canCastle=mover==='w'?/[KQ]/.test(rights):/[kq]/.test(rights);
  const castled=['g1','c1','g8','c8'].includes(ks)&&!canCastle&&homeRank(ks,mover);
  if(ph!=='endgame'){
    if(castled)feats.push('Your king is castled.');
    else if(canCastle&&ks[0]==='e'&&fullmove>=5)feats.push('Your king is still in the centre.');
  }
  /* development */
  const dm=developed(g,mover),dopp=developed(g,opp);
  if(ph==='opening'){
    if(dm-dopp>=2)feats.push('You lead in development ('+dm+' v '+dopp+').');
    else if(dopp-dm>=2)feats.push('They lead in development ('+dopp+' v '+dm+').');
  }
  /* bishop pair, then files */
  const bm=pieceCounts(g,mover).b,bo=pieceCounts(g,opp).b;
  if(bm>=2&&bo<2)feats.push('You have the bishop pair.');
  else if(bo>=2&&bm<2)feats.push('They have the bishop pair.');
  const pawnsOn=(f,c)=>{let n=0;for(let r=0;r<8;r++){const x=bd[r][f];if(x&&x.type==='p'&&(!c||x.color===c))n++}return n};
  const rooksAround=pieceCounts(g,mover).r+pieceCounts(g,opp).r>0;
  if(ph!=='endgame'||rooksAround)for(let f=0;f<8;f++){
    if(pawnsOn(f)===0){feats.push('The '+FILES[f]+'-file is open.');break}
  }
  if(ph==='endgame'){
    const pc=c=>pieceCounts(g,c),a=pc(mover),b=pc(opp);
    const pieces=x=>x.n+x.b+x.r+x.q;
    const kind=pieces(a)+pieces(b)===0?'King and pawn endgame.':(a.r+b.r>0&&a.n+a.b+a.q+b.n+b.b+b.q===0)?'Rook endgame.':(a.b+b.b>0&&a.n+a.r+a.q+b.n+b.r+b.q===0)?'Bishop endgame.':null;
    /* a passed pawn has no enemy pawn in front of it on its own or an adjacent file */
    const passed=(c,o)=>{const out=[];for(let f=0;f<8;f++)for(let r=0;r<8;r++){const x=bd[r][f];if(!x||x.type!=='p'||x.color!==c)continue;
      let blocked=false;for(let ff=Math.max(0,f-1);ff<=Math.min(7,f+1)&&!blocked;ff++)for(let rr=0;rr<8;rr++){const y=bd[rr][ff];if(!y||y.type!=='p'||y.color!==o)continue;if(c==='w'?rr<r:rr>r){blocked=true;break}}
      if(!blocked)out.push({sq:FILES[f]+(8-r),adv:c==='w'?8-r:r+1})}return out.sort((x,y)=>y.adv-x.adv).map(x=>x.sq)};
    const pm=passed(mover,opp),po=passed(opp,mover);
    const lead=[];
    if(kind)lead.push(kind);
    const say=(who,l)=>l.length?(l.length===1?who+' a passed pawn on '+l[0]+'.':who+' '+l.length+' passed pawns, the most advanced on '+l[0]+'.'):'';
    if(pm.length)lead.push(say('You have',pm));
    if(po.length)lead.push(say('They have',po));
    const mat=(x)=>x.p+x.n*3+x.b*3+x.r*5+x.q*9;
    const diff=mat(a)-mat(b);
    if(!pm.length&&!po.length&&Math.abs(diff)>=2)lead.push(diff>0?'You are up material.':'You are down material.');
    return trim(lead.concat(feats).slice(0,3).join(' ')||'Endgame.',24);
  }
  const head=ph==='opening'?'Move '+fullmove+', opening.':'Middlegame.';
  return trim(head+' '+(feats.slice(0,2).join(' ')||'A quiet position.'),24);
}

/* ---------- P: checks, captures, attacks ---------- */
export function moveKind(g,mv){
  if(mv.flags.includes('k')||mv.flags.includes('q'))return'castle';
  if(mv.promotion)return'promotion';
  if(/[+#]/.test(mv.san))return'check';
  if(mv.captured)return'capture';
  if(mv.piece==='p'){
    const adv=Math.abs(+mv.to[1]-+mv.from[1]);
    if('cdef'.includes(mv.to[0])&&adv===2)return'centre-pawn';
    return'pawn-move';
  }
  if((mv.piece==='n'||mv.piece==='b')&&homeRank(mv.from,mv.color))return'develop';
  if(mv.piece==='q')return'queen';
  if(mv.piece==='r')return'rook';
  if(mv.piece==='k')return'king';
  return'piece-move';
}
const KIND_PHRASE={castle:'castling',promotion:'a promotion',check:'a check',capture:'a capture','centre-pawn':'a quiet pawn move','pawn-move':'a quiet pawn move',develop:'a quiet developing move',queen:'a quiet queen move',rook:'a quiet rook move',king:'a quiet king move','piece-move':'a quiet piece move'};
export function noteP(g,mv){
  const moves=g.moves({verbose:true});
  const checks=moves.filter(m=>/[+#]/.test(m.san)).map(m=>m.san);
  const caps=moves.filter(m=>m.captured).sort((a,b)=>VAL[b.captured]-VAL[a.captured]).map(m=>m.san);
  const list=(a,n)=>a.slice(0,n).join(', ');
  const parts=[];
  parts.push(checks.length?'Checks: '+list(checks,2)+'.':'No checks.');
  parts.push(caps.length?'Captures: '+list(caps,2)+'.':'No captures.');
  parts.push('Your '+mv.san+' is '+KIND_PHRASE[moveKind(g,mv)]+'.');
  return trim(parts.join(' '),24);
}

/* ---------- C: calculation ---------- */
const mate=(m)=>m!=null;
export function evalLabel(cp,mateIn){
  if(mateIn!=null&&mateIn!==0)return mateIn>0?'mate in '+mateIn+' for you':'mate in '+Math.abs(mateIn)+' for them';
  const a=Math.abs(cp);
  const side=cp>=0?'you':'them';
  if(a<50)return'about equal';
  if(a<150)return'roughly balanced';
  if(a<300)return'clearly better for '+side;
  return'winning for '+side;
}
/* ev: {after:{cp,mate}, drop}  (cp from the mover's side).  nextSan: the course's expected reply or null. */
export function noteC(mv,nextSan,ev){
  const parts=[];
  if(ev&&ev.drop!=null&&ev.drop>=150){
    parts.push('A course choice: the engine likes other moves here, so know this line.');
    if(nextSan)parts.push('Expect '+nextSan+'.');
  }else{
    if(nextSan)parts.push('Expect '+nextSan+'.');else parts.push('The line ends here.');
    if(ev&&ev.after)parts.push('After '+mv.san+' it is '+evalLabel(ev.after.cp,ev.after.mate)+'.');
  }
  return trim(parts.join(' '),24);
}

/* ---------- W (why) and R (remember) ---------- */
export function noteWR(g,mv){
  const kind=moveKind(g,mv);
  const piece=NAME[mv.piece];
  /* what does the moved piece attack afterwards? */
  const h=new Chess(g.fen());h.move(mv.san);
  let target=null;
  const nf=nullFen(h.fen());
  if(nf){
    const x=new Chess(nf);
    const hits=x.moves({verbose:true}).filter(m=>m.from===mv.to&&m.captured).sort((a,b)=>VAL[b.captured]-VAL[a.captured]);
    if(hits.length)target=hits[0];
  }
  const centre=['d4','e4','d5','e5'];
  let eyesCentre=false;
  if(mv.piece!=='p'&&mv.piece!=='k'){
    const y=nf?new Chess(nf):null;
    if(y){const att=y.moves({verbose:true}).filter(m=>m.from===mv.to);eyesCentre=att.some(m=>centre.includes(m.to))}
  }
  const tail=target?', attacking the '+NAME[target.captured]+' on '+target.to:eyesCentre?', eyeing the centre':'';
  switch(kind){
    case'castle':return{w:'Castles: the king gets safe and the rook joins the game.',r:'Safety first, then attack.'};
    case'promotion':return{w:'Promotes the pawn: it becomes a '+NAME[mv.promotion]+'.',r:'Pawns that run get rewarded.'};
    case'check':return{w:cap(piece)+' gives check: they must answer before anything else.',r:'A check is a free tempo, use it with a plan.'};
    case'capture':{
      const gain=VAL[mv.captured]-VAL[mv.piece];
      const w=mv.captured==='p'&&mv.piece==='p'?'Pawn trade: it opens lines and fixes the structure.':
        gain>0?'Wins material: your '+piece+' takes a '+NAME[mv.captured]+'.':
        gain===0?'Trades your '+piece+' for their '+NAME[mv.captured]+' on '+mv.to+'.':
        'Your '+piece+' takes the '+NAME[mv.captured]+' on '+mv.to+'; check the recapture first.';
      return{w:w,r:gain>0?'Count first, then take.':'Trade when it helps your plan.'};
    }
    case'centre-pawn':return{w:'Claims space in the centre with the '+mv.to[0]+'-pawn'+(target?' and hits the '+NAME[target.captured]+' on '+target.to:'')+'.',r:'Centre pawns give your pieces room.'};
    case'pawn-move':return{w:'Pawn to '+mv.to+(target?', hitting the '+NAME[target.captured]+' on '+target.to:': it gains space and shapes the structure')+'.',r:'Every pawn move changes the structure for good.'};
    case'develop':return{w:'Develops the '+piece+' to '+mv.to+tail+'.',r:'Develop with a purpose.'};
    case'queen':return{w:'Queen to '+mv.to+tail+'. Watch for attacks that cost you tempo.',r:'Queens come out late and with a reason.'};
    case'rook':return{w:'Rook to '+mv.to+tail+'.',r:'Rooks belong on open files.'};
    case'king':return phaseOf(g,+g.fen().split(' ')[5]||1)==='endgame'
      ?{w:'King to '+mv.to+': in the endgame the king is a fighting piece.',r:'Activate your king.'}
      :{w:'King to '+mv.to+': check that it is really safe there.',r:'Know where your king is safe.'};
    default:return{w:cap(piece)+' to '+mv.to+tail+'.',r:'Improve your worst piece.'};
  }
}

/* ---------- the whole note ---------- */
/* args: fenBefore, san (the user's move), lastSan (opponent's previous move, from the line) or null, nextSan (expected reply) or null,
   eng: {threat:{san,gain}|null, evalAfter:{cp,mate}|null, drop:number|null} */
export function composeNote({fenBefore,san,lastMove,nextSan,eng}){
  const g=new Chess(fenBefore);
  const mover=g.turn();
  const fullmove=+fenBefore.split(' ')[5]||1;
  const mv=g.moves({verbose:true}).find(m=>cleanSan(m.san)===cleanSan(san));
  if(!mv)return null;
  const wr=noteWR(g,mv);
  const note={
    m:noteM(g,lastMove,eng&&eng.threat),
    s:noteS(g,mover,fullmove),
    p:noteP(g,mv),
    c:noteC(mv,nextSan,{after:eng&&eng.evalAfter,drop:eng&&eng.drop}),
    w:trim(wr.w,24),
    r:wr.r
  };
  return note;
}
export const _t={phaseOf,developed,moveKind,evalLabel,trim,wordCount};
