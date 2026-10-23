/* The same verdict rules the app uses for "is this unlisted move also good?" (LC25.logic.altVerdict, Engine.winPct).
   tests/audit_logic.test.js checks that both give identical answers on thousands of random inputs. */
export const winPct=cp=>50+50*(2/(1+Math.exp(-.00368208*Math.max(-1500,Math.min(1500,cp))))-1);
export const CFG={fullLoss:5,okLoss:9};
/* bestPct/playedPct: win percentages for the mover. bestMate/playedMate: mate distance in moves for the mover (positive = mover mates) or null. */
export function altVerdict(o,cfg){
  cfg=cfg||CFG;
  const bm=o.bestMate,pm=o.playedMate;
  if(bm!=null&&bm>0){
    if(pm!=null&&pm>0&&pm<=bm+1)return{tier:'full',loss:0,why:'mate'};
    if(pm!=null&&pm>0)return{tier:'mostly',loss:null,why:'slower-mate'};
    return{tier:'no',loss:Math.max(0,(+o.bestPct||0)-(+o.playedPct||0)),why:'missed-mate'};
  }
  const loss=Math.max(0,(+o.bestPct||0)-(+o.playedPct||0));
  if(loss<=cfg.fullLoss)return{tier:'full',loss,why:'eval'};
  if(loss<=cfg.okLoss)return{tier:'mostly',loss,why:'eval'};
  return{tier:'no',loss,why:'eval'};
}
const VAL={p:1,n:3,b:3,r:5,q:9};
const NAME={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen'};
/* a plain-words material imbalance for the mover, or '' when roughly level. counts: {p,n,b,r,q} per side */
export function imbalance(mine,theirs){
  const mat=c=>Object.keys(VAL).reduce((a,k)=>a+VAL[k]*(c[k]||0),0);
  const d=mat(mine)-mat(theirs);
  const qd=(mine.q||0)-(theirs.q||0);
  if(qd<=-1&&d<=-3)return'down a queen'+(d>-7?' (some compensation)':'');
  if(qd>=1&&d>=3)return'up a queen';
  if(Math.abs(d)<2)return'';
  const big=Object.keys(NAME).reverse().find(k=>(mine[k]||0)!==(theirs[k]||0)&&k!=='p');
  return d>0?'up material (+'+d+')':'down material ('+d+')';
}
/* what is the start position worth to the solver, in words */
export function startLabel(cp,mate){
  if(mate!=null)return mate>0?'forced win':'forced loss';
  if(cp>=200)return'winning';
  if(cp<=-200)return'losing';
  if(Math.abs(cp)<=60)return'level';
  return cp>0?'better':'worse';
}
