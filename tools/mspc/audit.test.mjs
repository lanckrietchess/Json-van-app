import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {altVerdict,winPct,imbalance,startLabel} from './puzzle-logic.mjs';
let n=0;const t=(name,fn)=>{try{fn();n++;console.log('ok  ',name)}catch(e){console.log('FAIL',name,'\n     ',e.message);process.exitCode=1}};

t('verdict: same rules as the app (mate speed, 5 and 9 win-% bands)',()=>{
  assert.strictEqual(altVerdict({bestPct:100,playedPct:100,bestMate:1,playedMate:1}).tier,'full');
  assert.strictEqual(altVerdict({bestPct:100,playedPct:100,bestMate:1,playedMate:2}).tier,'full');
  assert.strictEqual(altVerdict({bestPct:100,playedPct:100,bestMate:2,playedMate:6}).tier,'mostly');
  assert.strictEqual(altVerdict({bestPct:100,playedPct:60,bestMate:2,playedMate:null}).tier,'no');
  assert.strictEqual(altVerdict({bestPct:80,playedPct:76}).tier,'full');assert.strictEqual(altVerdict({bestPct:80,playedPct:72}).tier,'mostly');assert.strictEqual(altVerdict({bestPct:80,playedPct:65}).tier,'no');
  assert(Math.abs(winPct(0)-50)<1e-9&&winPct(1500)>95&&winPct(-1500)<5);
});
t('imbalance and start labels in plain words',()=>{
  assert.strictEqual(imbalance({p:5,n:0,b:0,r:1,q:0},{p:5,n:0,b:0,r:0,q:1}),'down a queen (some compensation)');
  assert.strictEqual(imbalance({p:5,n:1,b:1,r:2,q:1},{p:5,n:1,b:1,r:2,q:0}),'up a queen');assert.strictEqual(imbalance({p:5,n:1,b:1,r:2,q:1},{p:5,n:1,b:1,r:2,q:1}),'');
  assert.strictEqual(imbalance({p:6,n:0,b:0,r:1,q:0},{p:3,n:0,b:0,r:1,q:0}),'up material (+3)');
  assert.strictEqual(startLabel(400,null),'winning');assert.strictEqual(startLabel(-300,null),'losing');assert.strictEqual(startLabel(20,null),'level');assert.strictEqual(startLabel(0,2),'forced win');assert.strictEqual(startLabel(0,-3),'forced loss');assert.strictEqual(startLabel(120,null),'better');
});

/* the real engine on a tiny fixture */
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'audit-'));const cf=path.join(dir,'content.json'),out=path.join(dir,'out');
fs.writeFileSync(cf,JSON.stringify({lists:{endgame:[
  {id:'two-mates',title:'Back rank',puzzle_fen:'6k1/5ppp/8/8/8/8/5PPP/R3R1K1 w - - 0 1',solution_moves:['a1a8'],side:'w'},
  {id:'bad-solution',title:'Blunders the mate',puzzle_fen:'6k1/5ppp/8/8/8/8/5PPP/R3R1K1 w - - 0 1',solution_moves:['g2g3'],side:'w'},
  {id:'lost-start',title:'Hopeless',puzzle_fen:'8/8/8/8/8/5k2/q7/7K w - - 0 1',solution_moves:['h1g1'],side:'w'},
  {id:'down-queen',title:'Down a queen',puzzle_fen:'q5k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',solution_moves:['e1e8'],side:'w'},
  {id:'not-a-puzzle',title:'x',puzzle_fen:'bad fen',solution_moves:['a1a2'],side:'w'}]}}));
const r=spawnSync('node',['audit-puzzles.mjs',cf,'--out',out,'--depth','10','--multipv','5'],{encoding:'utf8',cwd:path.dirname(new URL(import.meta.url).pathname),timeout:120000});
t('tool runs on the fixture and ignores a bad puzzle',()=>{assert.strictEqual(r.status,0,r.stdout+r.stderr);assert(/puzzles 4 \| solver moves 4/.test(r.stdout),r.stdout)});
const alts=JSON.parse(fs.existsSync(path.join(out,'puzzle-alts.json'))?fs.readFileSync(path.join(out,'puzzle-alts.json'),'utf8'):'{"positions":{}}');
const rep=fs.existsSync(path.join(out,'puzzle-audit-report.md'))?fs.readFileSync(path.join(out,'puzzle-audit-report.md'),'utf8'):'';
t('finds the second mating move as an alternative (and keeps the solution as the main line)',()=>{
  const e=alts.positions['6k1/5ppp/8/8/8/8/5PPP/R3R1K1 w -'];assert(e,JSON.stringify(Object.keys(alts.positions)));
  assert.strictEqual(e.main,'Ra8#');assert(e.alts.some(a=>a.s==='Re8#'&&a.t==='full'&&a.k==='mate'&&a.v===1),JSON.stringify(e));assert(e.alts.some(a=>a.s==='Ra8#'),'the solution is in the list too');
});
t('flags a solution that throws the mate away, and one that hangs a rook',()=>{const sec=rep.split('## Playable but not best')[0];assert(/Solutions to check first \(2\)/.test(rep)&&/Still/.test(rep)&&/bad-solution/.test(sec)&&/down-queen/.test(sec)&&/Engine prefers/.test(rep),rep.slice(0,900))});
t('the overlay records how good the best move is, so the app can word the explanation truthfully',()=>{for(const e of Object.values(alts.positions))assert(e.e&&['mate','cp'].includes(e.e.k)&&typeof e.e.v==='number');assert.strictEqual(alts.positions['6k1/5ppp/8/8/8/8/5PPP/R3R1K1 w -'].e.k,'mate')});
t('flags a lost start and a material imbalance',()=>{assert(/Puzzles that start lost \((1|2)\)/.test(rep)&&/lost-start/.test(rep),rep);assert(/down-queen/.test(rep)&&/down a queen/.test(rep),rep)});
t('the overlay file has the shape the app loads',()=>{assert(alts.positions&&typeof alts.positions==='object');for(const [k,v] of Object.entries(alts.positions)){assert(/ [wb] /.test(k+' ')&&typeof v.main==='string'&&Array.isArray(v.alts)&&v.alts.every(a=>typeof a.s==='string'&&['full','mostly'].includes(a.t)&&['mate','cp'].includes(a.k)&&typeof a.v==='number'))}});
console.log('\n'+n+' passed');
