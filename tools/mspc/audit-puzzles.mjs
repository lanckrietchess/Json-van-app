/* Audits every puzzle line (endgame, middlegame ...): are the solutions really best, which first moves are ALSO good, what is the start worth?
   Writes puzzle-alts.json (loaded by the app: alternatives are accepted instantly, even offline) and puzzle-audit-report.md.
   usage: node audit-puzzles.mjs <content.json> [--out ./out] [--depth 14] [--multipv 5] [--dry] [--limit N]
   The course data is only READ. */
import fs from 'node:fs';
import path from 'node:path';
import {Chess,fenKey,cleanSan,nullFen} from './mspc.mjs';
import {startEngine} from './sf.mjs';
import {altVerdict,winPct,imbalance,startLabel} from './puzzle-logic.mjs';

const args=process.argv.slice(2);
const file=args[0];if(!file||file.startsWith('--')){console.error('usage: node audit-puzzles.mjs <content.json> [--out dir] [--depth 14] [--multipv 5] [--dry] [--limit N]');process.exit(1)}
const opt=(k,d)=>{const i=args.indexOf(k);return i<0?d:(args[i+1]===undefined||args[i+1].startsWith('--')?true:args[i+1])};
const OUT=opt('--out','./out'),DEPTH=+opt('--depth',14),MPV=+opt('--multipv',5),DRY=args.includes('--dry'),LIMIT=+opt('--limit',0);
const content=JSON.parse(fs.readFileSync(file,'utf8'));
fs.mkdirSync(OUT,{recursive:true});

/* ---------- 1. every solver move of every puzzle line ---------- */
const steps=[];                       // {pid,list,idx,fenBefore,san,uci,color,first}
let puzzles=0;
for(const [name,L] of Object.entries(content.lists||{})){
  for(const p of Array.isArray(L)?L:[]){
    if(!p||!p.puzzle_fen||!Array.isArray(p.solution_moves)||!p.solution_moves.length)continue;
    const g=new Chess();if(!g.load(p.puzzle_fen))continue;
    const solver=(p.side==='w'||p.side==='b')?p.side:(g.turn()==='w'?'b':'w');
    puzzles++;let first=true;
    p.solution_moves.filter(m=>typeof m==='string').forEach((u,i)=>{
      const fenBefore=g.fen(),mv=g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||undefined});
      if(!mv)return;
      if(mv.color===solver){steps.push({pid:p.id||name+'#'+puzzles,list:name,title:p.title||'',idx:i,fenBefore,san:mv.san,uci:u,color:mv.color,first,rating:p.rating||null});first=false}
    });
  }
}
let list=steps;if(LIMIT)list=list.slice(0,LIMIT);
const uniq=[...new Set(list.map(s=>s.fenBefore))];
console.log(`puzzles ${puzzles} | solver moves ${steps.length} | unique positions to search ${uniq.length} at depth ${DEPTH}, multipv ${MPV}, about ${Math.round(uniq.length*0.5/60)} min`);
if(DRY)process.exit(0);

/* ---------- 2. engine: top moves at every position, plus the solution move when it is outside the top ---------- */
const cacheFile=path.join(OUT,'puzzle-audit.cache.json');
const cache=fs.existsSync(cacheFile)?JSON.parse(fs.readFileSync(cacheFile,'utf8')):{};
const ck=(f,extra)=>'d'+DEPTH+'m'+MPV+'|'+(extra||'')+f;
const eng=startEngine();await eng.ready();
const toSolver=(l,turn)=>({cp:l.cp==null?null:l.cp,mate:l.mate==null?null:l.mate});    // engine numbers are already from the side to move = the solver
let done=0;const t0=Date.now();
for(const f of uniq){
  if(!cache[ck(f)]){
    const g=new Chess(f);
    if(g.game_over()){cache[ck(f)]={lines:[]}}
    else{const a=await eng.analyse(f,{depth:DEPTH,multipv:MPV});cache[ck(f)]={lines:a.lines.map(l=>({uci:l.pv[0],cp:l.cp,mate:l.mate,pv:l.pv.slice(0,6)}))}}
  }
  if(++done%50===0){fs.writeFileSync(cacheFile,JSON.stringify(cache));const el=(Date.now()-t0)/1000;console.log(`  ${done}/${uniq.length}  ${Math.round(el)}s`)}
}
/* solution moves that are not among the top lines need their own search of the position after the move */
for(const s of list){
  const top=cache[ck(s.fenBefore)].lines;
  if(top.some(l=>l.uci&&l.uci.slice(0,4)===s.uci.slice(0,4)))continue;
  const g=new Chess(s.fenBefore);g.move({from:s.uci.slice(0,2),to:s.uci.slice(2,4),promotion:s.uci[4]||undefined});
  const k=ck(g.fen(),'after|');
  if(!cache[k]){if(g.game_over())cache[k]={cp:g.in_checkmate()?10000:0,mate:g.in_checkmate()?0:null,over:true};else{const a=await eng.analyse(g.fen(),{depth:DEPTH,multipv:1});const l=a.lines[0]||{};cache[k]={cp:l.cp,mate:l.mate}}}
}
fs.writeFileSync(cacheFile,JSON.stringify(cache));eng.quit();

/* ---------- 3. judge ---------- */
const pct=(cp,mate)=>mate!=null?(mate>0?100:0):winPct(cp||0);
const labelOf=(cp,mate)=>mate!=null&&mate>0?{k:'mate',v:mate}:{k:'cp',v:Math.round(cp||0)};
const positions={},findings={notBest:[],failing:[],alts:[],imbal:[],startBad:[]};
const seen=new Set();
for(const s of list){
  const top=cache[ck(s.fenBefore)].lines;if(!top.length)continue;
  const g=new Chess(s.fenBefore);
  const best=top[0],bestPct=pct(best.cp,best.mate),bestMate=best.mate;
  const san=u=>{try{const h=new Chess(s.fenBefore);const m=h.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||undefined});return m?m.san:null}catch(e){return null}};
  const judged=top.map(l=>{
    const v=altVerdict({bestPct,playedPct:pct(l.cp,l.mate),bestMate,playedMate:l.mate!=null&&l.mate>0?l.mate:null});
    return{uci:l.uci,san:san(l.uci),tier:v.tier,label:labelOf(l.cp,l.mate),loss:v.loss};
  });
  /* the solution move itself */
  let sol=judged.find(j=>j.uci&&j.uci.slice(0,4)===s.uci.slice(0,4));
  if(!sol){
    const h=new Chess(s.fenBefore);h.move({from:s.uci.slice(0,2),to:s.uci.slice(2,4),promotion:s.uci[4]||undefined});
    const a=cache[ck(h.fen(),'after|')]||{};
    const pcp=a.over?(a.cp>=10000?10000:0):(a.cp==null?0:-a.cp),pm=a.over?(a.mate===0?1:null):(a.mate==null?null:-a.mate);
    const v=altVerdict({bestPct,playedPct:pct(pcp,pm),bestMate,playedMate:pm!=null&&pm>0?pm+1:null});
    sol={uci:s.uci,san:s.san,tier:v.tier,label:labelOf(pcp,pm!=null&&pm>0?pm+1:null),loss:v.loss,outsideTop:true};
  }
  const rec={pid:s.pid,list:s.list,title:s.title,san:s.san,fen:s.fenBefore,best:judged[0],sol,ok:judged.filter(j=>j.tier!=='no'&&j.san)};
  if(sol.tier==='no')findings.failing.push(rec);
  else if(sol.tier==='mostly'||(sol.loss!=null&&sol.loss>2&&judged[0].san!==s.san&&sol.tier==='full'&&false))findings.notBest.push(rec);
  /* alternatives: other moves that are also good (the solution itself is listed as the main line) */
  const alts=judged.filter(j=>j.san&&j.tier!=='no'&&cleanSan(j.san)!==cleanSan(s.san));
  if(alts.length){
    findings.alts.push({...rec,alts});
    const key=fenKey(s.fenBefore);
    if(!positions[key])positions[key]={main:s.san,best:judged[0].san,e:{k:judged[0].label.k,v:judged[0].label.v},alts:[{s:s.san,t:sol.tier==='no'?'mostly':sol.tier,k:sol.label.k,v:sol.label.v}].concat(alts.map(a=>({s:a.san,t:a.tier,k:a.label.k,v:a.label.v})))};
  }
  /* the start of the puzzle */
  if(s.first){
    const cnt=c=>{const o={p:0,n:0,b:0,r:0,q:0};g.board().forEach(r=>r.forEach(x=>{if(x&&x.color===c&&o[x.type]!=null)o[x.type]++}));return o};
    const imb=imbalance(cnt(s.color),cnt(s.color==='w'?'b':'w'));
    const lab=startLabel(best.cp,best.mate);
    if(imb)findings.imbal.push({pid:s.pid,title:s.title,imb,start:lab,fen:s.fenBefore});
    if(lab==='losing'||lab==='forced loss')findings.startBad.push({pid:s.pid,title:s.title,start:lab,cp:best.cp,mate:best.mate,fen:s.fenBefore});
  }
}
const nPos=new Set(list.map(s=>s.fenBefore)).size;
fs.writeFileSync(path.join(OUT,'puzzle-alts.json'),JSON.stringify({version:1,generated:new Date().toISOString().slice(0,10),engine:'Stockfish 16, depth '+DEPTH+', multipv '+MPV,count:Object.keys(positions).length,positions}));
const f=s=>String(s).replace(/\|/g,'\\|');
const stillWins=l=>l&&(l.k==='mate'?l.v>0:l.v>=150);
const stillLabel=l=>!l?'':l.k==='mate'?(l.v>0?'winning':'losing'):l.v>=150?'winning':l.v>-60?'level':'worse';
const ev=l=>l?(l.k==='mate'?'mate in '+l.v:(l.v>=0?'+':'')+(l.v/100).toFixed(1)):'';
const rep=['# Puzzle audit','',`Generated ${new Date().toISOString().slice(0,10)} from content.json with Stockfish 16 (depth ${DEPTH}, ${MPV} lines). ${puzzles} puzzle lines, ${list.length} solver moves, ${nPos} positions. Nothing in your content changed.`,'',
 '## Summary','',`- Positions where the solver has **another good move** besides your solution: **${new Set(findings.alts.map(a=>fenKey(a.fen))).size}** of ${nPos}. The app now accepts these instantly (they are in puzzle-alts.json) and explains why.`,
 `- Solutions that are **playable but not the engine's best**: ${findings.notBest.length}`,`- Solutions the engine ranks **well below its best move**: ${findings.failing.length} (${findings.failing.filter(r=>stillWins(r.sol.label)).length} of them still win or hold; textbook technique is often not the engine's fastest, so check these by eye)`,
 `- Puzzles that **start in a clearly lost position** for the solver: ${findings.startBad.length}`,`- Puzzles that start with a **big material imbalance**: ${findings.imbal.length}`,'',
 `## Solutions to check first (${findings.failing.length})`,'','The engine ranks these well below its best move. Two readings: a **textbook method** that is slower than the engine\'s line (fine, the "Still" column says winning), or a **mislabelled puzzle or a typo** (the "Still" column says level or worse: fix these).','',
 '| Puzzle | Your move | Engine prefers | Your move is | Still | Position |','|---|---|---|---|---|---|',
 ...findings.failing.slice(0,120).map(r=>`| ${f(r.pid)} ${f(r.title)} | ${r.san} | ${r.best.san} (${ev(r.best.label)}) | ${ev(r.sol.label)} | ${stillLabel(r.sol.label)} | \`${r.fen.split(' ').slice(0,2).join(' ')}\` |`),'',
 `## Playable but not best (${findings.notBest.length})`,'','| Puzzle | Your move | Engine prefers | Your move is |','|---|---|---|---|',
 ...findings.notBest.slice(0,120).map(r=>`| ${f(r.pid)} ${f(r.title)} | ${r.san} | ${r.best.san} (${ev(r.best.label)}) | ${ev(r.sol.label)} |`),'',
 `## Puzzles that start lost (${findings.startBad.length})`,'','| Puzzle | Start |','|---|---|',...findings.startBad.slice(0,80).map(r=>`| ${f(r.pid)} ${f(r.title)} | ${r.start} (${r.mate!=null?'mate in '+Math.abs(r.mate):((r.cp||0)/100).toFixed(1)}) |`),'',
 `## Material imbalances at the start (${findings.imbal.length})`,'','These are the "down a queen, find the mating net" puzzles. They feel human; keep them.','','| Puzzle | You are | Start |','|---|---|---|',...findings.imbal.slice(0,80).map(r=>`| ${f(r.pid)} ${f(r.title)} | ${r.imb} | ${r.start} |`),'',
 `## Positions with several good first moves (${new Set(findings.alts.map(a=>fenKey(a.fen))).size})`,'','| Puzzle | Your move | Also good |','|---|---|---|',
 ...findings.alts.slice(0,150).map(r=>`| ${f(r.pid)} ${f(r.title)} | ${r.san} | ${r.alts.map(a=>a.san+' ('+ev(a.label)+')').join(', ')} |`)];
fs.writeFileSync(path.join(OUT,'puzzle-audit-report.md'),rep.join('\n'));
console.log(`positions with alternatives ${Object.keys(positions).length} | weak solutions ${findings.failing.length} | playable-not-best ${findings.notBest.length} | start lost ${findings.startBad.length} | imbalances ${findings.imbal.length}`);
console.log(`wrote ${OUT}/puzzle-alts.json and ${OUT}/puzzle-audit-report.md`);
