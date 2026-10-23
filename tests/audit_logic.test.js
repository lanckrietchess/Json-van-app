/* The audit tool (tools/mspc/puzzle-logic.mjs) and the app (LC25.logic.altVerdict, Engine.winPct) must judge a move identically. */
const assert=require('assert'),fs=require('fs'),path=require('path');const {make}=require('./harness');
(async()=>{
  const cand=[path.join(__dirname,'..','tools','mspc','puzzle-logic.mjs'),path.join(__dirname,'..','gen','puzzle-logic.mjs')];
  const tool=await import('file://'+cand.find(f=>fs.existsSync(f)));
  const {L}=make();let n=0,diff=0;
  const rnd=()=>Math.random();
  for(let i=0;i<20000;i++){
    const o={bestPct:rnd()*100,playedPct:rnd()*100,bestMate:rnd()<.3?1+Math.floor(rnd()*8):null,playedMate:rnd()<.3?1+Math.floor(rnd()*10):null};
    const a=tool.altVerdict(o),b=JSON.parse(JSON.stringify(L.logic.altVerdict(o)));n++;
    if(a.tier!==b.tier||a.why!==b.why||(a.loss==null?null:Math.round(a.loss*1e6))!==(b.loss==null?null:Math.round(b.loss*1e6))){diff++;if(diff<4)console.log('DIFF',JSON.stringify(o),JSON.stringify(a),JSON.stringify(b))}
  }
  assert.strictEqual(diff,0,diff+' of '+n+' verdicts differ');
  console.log('ok   altVerdict: the tool and the app agree on '+n+' random inputs (tiers, reasons and losses)');
  /* the app's winPct is the formula the tool uses */
  const appWin=cp=>50+50*(2/(1+Math.exp(-.00368208*Math.max(-1500,Math.min(1500,cp))))-1);
  for(const cp of [-3000,-1500,-300,-1,0,1,50,300,1500,9999])assert(Math.abs(tool.winPct(cp)-appWin(cp))<1e-12,'winPct at '+cp);
  console.log('ok   winPct: the tool and the app formula agree\n\n2 passed');
})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
