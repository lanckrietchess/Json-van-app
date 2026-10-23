/* Builds mspc-notes.json from content.json (the course trees) with a local Stockfish. Offline, resumable, zero API cost.
   usage: node build-notes.mjs <content.json> [--depth 10] [--out ../notes] [--dry] [--limit N]
   The course data is only READ. Nothing in content.json changes. */
import fs from 'node:fs';
import path from 'node:path';
import {Chess,composeNote,noteKey,cleanSan,nullFen,fenKey} from './mspc.mjs';
import {startEngine} from './sf.mjs';

const args=process.argv.slice(2);
const file=args[0];if(!file){console.error('usage: node build-notes.mjs <content.json> [--depth 10] [--out dir] [--dry] [--limit N]');process.exit(1)}
const opt=(k,d)=>{const i=args.indexOf(k);return i<0?d:(args[i+1]===undefined||args[i+1].startsWith('--')?true:args[i+1])};
const DEPTH=+opt('--depth',10),OUT=opt('--out','./out'),DRY=args.includes('--dry'),LIMIT=+opt('--limit',0);
const content=JSON.parse(fs.readFileSync(file,'utf8'));
fs.mkdirSync(OUT,{recursive:true});

/* ---------- 1. collect every move the player makes, with its position ---------- */
const entries=new Map();            // noteKey -> entry
let nodesTotal=0,userNodes=0,withHuman=0;
function walk(tree,nodes,g,last){
  for(const n of nodes){
    nodesTotal++;
    const fenBefore=g.fen();
    const mv=g.move(n.m,{sloppy:true});
    if(!mv){console.warn('  skip: illegal move',n.m,'in',tree.id);continue}
    const mine=mv.color===tree.side;
    const kids=(n.c||[]);
    if(mine){
      userNodes++;
      const key=noteKey(fenBefore,mv.san);
      if(n.n&&n.n.length)withHuman++;
      if(!entries.has(key))entries.set(key,{key,fenBefore,fenAfter:g.fen(),san:mv.san,lastMove:last,nextSan:kids.slice(0,2).map(k=>k.m).join(' or ')||null,color:mv.color,trees:new Set(),human:!!(n.n&&n.n.length)});
      const e=entries.get(key);e.trees.add(tree.id);e.human=e.human||!!(n.n&&n.n.length);
    }
    walk(tree,kids,g,mv);
    g.undo();
  }
}
for(const t of content.trees||[])walk(t,t.tree||[],new Chess(),null);

/* puzzle-style lists (endgame, middlegame): the solver's moves along solution_moves, same rule as the app's plan(): side tells who solves */
let puzzleLines=0,puzzleMoves=0;
for(const [name,L] of Object.entries(content.lists||{})){
  for(const p of Array.isArray(L)?L:[]){
    if(!p||typeof p!=='object'||!p.puzzle_fen||!Array.isArray(p.solution_moves)||!p.solution_moves.length)continue;
    const g=new Chess();if(!g.load(p.puzzle_fen)){console.warn('  skip: bad puzzle_fen',p.id);continue}
    const solver=(p.side==='w'||p.side==='b')?p.side:(g.turn()==='w'?'b':'w');
    const sol=p.solution_moves.filter(m=>typeof m==='string');
    puzzleLines++;let last=null;
    for(let i=0;i<sol.length;i++){
      const u=sol[i],fenBefore=g.fen();
      const mv=g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||undefined});
      if(!mv){console.warn('  skip: illegal solution move',u,'in',p.id);break}
      if(mv.color===solver){
        puzzleMoves++;
        let next=null;
        if(sol[i+1]){const h=new Chess(g.fen()),m2=h.move({from:sol[i+1].slice(0,2),to:sol[i+1].slice(2,4),promotion:sol[i+1][4]||undefined});if(m2)next=m2.san}
        const key=noteKey(fenBefore,mv.san);
        if(!entries.has(key))entries.set(key,{key,fenBefore,fenAfter:g.fen(),san:mv.san,lastMove:last,nextSan:next,color:mv.color,trees:new Set(['list:'+name+':'+p.id]),human:false});
        else entries.get(key).trees.add('list:'+name+':'+p.id);
      }
      last=mv;
    }
  }
}
console.log(`puzzle lines ${puzzleLines} | the solver's moves in them ${puzzleMoves}`);
let list=[...entries.values()];if(LIMIT)list=list.slice(0,LIMIT);
console.log(`trees ${content.trees.length} | moves in the trees ${nodesTotal} | the player's moves ${userNodes} | unique positions+moves ${entries.size} | with a note from the coach ${withHuman}`);

/* ---------- 2. engine data: before, null-move (threat), after ---------- */
const need=new Set();
for(const e of list){need.add(e.fenBefore);need.add(e.fenAfter);const nf=nullFen(e.fenBefore);if(nf)need.add(nf)}
const cacheFile=path.join(OUT,'engine-cache.json');
const cache=fs.existsSync(cacheFile)?JSON.parse(fs.readFileSync(cacheFile,'utf8')):{};
const todo=[...need].filter(f=>!cache[fenKey(f)+'|'+f.split(' ')[3]]&&!cache[f]);
console.log(`positions to search ${need.size} (${need.size-todo.length} cached) -> ${todo.length} searches at depth ${DEPTH}, about ${Math.round(todo.length*0.17/60)} min`);
if(DRY)process.exit(0);

if(todo.length){
  const eng=startEngine();await eng.ready();
  let done=0;const t0=Date.now();
  for(const f of todo){
    const g=new Chess(f);
    let r;
    if(g.game_over()){r={cp:g.in_checkmate()?(g.turn()==='w'?-10000:10000):0,mate:null,best:null}}
    else{
      const a=await eng.analyse(f,{depth:DEPTH});const l=a.lines[0]||{};
      /* engine numbers are from the side to move: store them from White's side */
      const flip=g.turn()==='w'?1:-1;
      r={cp:l.cp==null?null:l.cp*flip,mate:l.mate==null?null:l.mate*flip,best:a.best};
    }
    cache[f]=r;done++;
    if(done%100===0){fs.writeFileSync(cacheFile,JSON.stringify(cache));const el=(Date.now()-t0)/1000;console.log(`  ${done}/${todo.length}  ${Math.round(el)}s  eta ${Math.round(el/done*(todo.length-done)/60)} min`)}
  }
  fs.writeFileSync(cacheFile,JSON.stringify(cache));eng.quit();
}

/* ---------- 3. engine numbers per move, then a deeper second look at anything that disagrees with the course ---------- */
const cpOf=r=>r.mate!=null?(r.mate>0?10000-Math.abs(r.mate):-10000+Math.abs(r.mate)):(r.cp||0);   // White's side
const DEEP=+opt('--verify-depth',18);
const rule=(cb,ca)=>(ca>=300)?0:cb-ca;                 // still clearly winning after the move: not a disagreement
const engOf=new Map();let nullTried=0;
for(const e of list){
  const mover=e.color,pov=mover==='w'?1:-1;
  const before=cache[e.fenBefore],after=cache[e.fenAfter];
  const eng={threat:null,evalAfter:null,drop:null,pov};
  if(before&&after){
    const cb=cpOf(before)*pov,ca=cpOf(after)*pov;
    eng.evalAfter={cp:ca,mate:after.mate!=null?after.mate*pov:null};eng.cb=cb;eng.ca=ca;eng.drop=rule(cb,ca);
  }
  const nf=nullFen(e.fenBefore);
  if(nf&&before&&cache[nf]){
    nullTried++;
    const opp=-pov;
    const gain=cpOf(cache[nf])*opp-cpOf(before)*opp;                // what the opponent would win if it were their move
    const best=cache[nf].best;
    if(best&&gain>=100){
      try{const h=new Chess(nf);const m=h.move({from:best.slice(0,2),to:best.slice(2,4),promotion:best[4]||undefined});if(m)eng.threat={san:m.san,gain:Math.round(gain)}}catch(x){}
    }
  }
  engOf.set(e.key,eng);
}
const suspects=list.filter(e=>(engOf.get(e.key).drop||0)>=150);
const flags=[];let cleared=0;
if(suspects.length){
  console.log(`${suspects.length} moves look worse than the engine's choice at depth ${DEPTH}; re-checking them at depth ${DEEP}`);
  const eng2=startEngine();await eng2.ready();
  for(const e of suspects){
    const eng=engOf.get(e.key),pov=eng.pov;
    const deep=async f=>{const dk='d'+DEEP+'|'+f;if(cache[dk])return cache[dk];const g=new Chess(f);let r;if(g.game_over())r={cp:g.in_checkmate()?(g.turn()==='w'?-10000:10000):0,mate:null};else{const a=await eng2.analyse(f,{depth:DEEP});const l=a.lines[0]||{};const flip=g.turn()==='w'?1:-1;r={cp:l.cp==null?null:l.cp*flip,mate:l.mate==null?null:l.mate*flip}}cache[dk]=r;return r};
    const b2=await deep(e.fenBefore),a2=await deep(e.fenAfter);
    const cb=cpOf(b2)*pov,ca=cpOf(a2)*pov,drop=rule(cb,ca);
    eng.cb=cb;eng.ca=ca;eng.drop=drop;eng.evalAfter={cp:ca,mate:a2.mate!=null?a2.mate*pov:null};
    if(drop>=150)flags.push({key:e.key,san:e.san,drop:Math.round(drop),before:Math.round(cb),after:Math.round(ca),trees:[...e.trees]});else cleared++;
  }
  fs.writeFileSync(cacheFile,JSON.stringify(cache));eng2.quit();
  console.log(`  ${cleared} were only shallow-search noise; ${flags.length} still disagree at depth ${DEEP}`);
}
const notes={};
for(const e of list){
  const eng=engOf.get(e.key);
  const note=composeNote({fenBefore:e.fenBefore,san:e.san,lastMove:e.lastMove,nextSan:e.nextSan,eng});
  if(note)notes[e.key]=note;else console.warn('no note for',e.key);
}
const out={version:1,generated:new Date().toISOString().slice(0,10),engine:'Stockfish 16, depth '+DEPTH,count:Object.keys(notes).length,notes};
fs.writeFileSync(path.join(OUT,'mspc-notes.json'),JSON.stringify(out));
const mb=(fs.statSync(path.join(OUT,'mspc-notes.json')).size/1e6).toFixed(2);
console.log(`wrote ${out.count} notes (${mb} MB) to ${OUT}/mspc-notes.json | threats found ${Object.values(notes).filter(n=>/Threat:/.test(n.m)).length} of ${nullTried}`);

/* ---------- 4. review report for the coach ---------- */
const rep=['# MSPC notes: review report','',`Generated ${out.generated} from content.json. ${out.count} notes: the player's moves in ${content.trees.length} course trees (${userNodes} move slots) and the solver's moves in ${puzzleLines} puzzle lines (${puzzleMoves} moves).`,'',
 `Written from the board and Stockfish 16 (depth ${DEPTH}, flagged moves re-checked at depth ${DEEP}). They explain what changed, the structure, the forcing moves and the likely reply. They do not know your plans. Moves you already explained yourself (${withHuman}) keep your note; the MSPC lines come under it.`,'',
 `## Moves where the engine disagrees with the course (${flags.length})`,'','These notes say "A course choice" instead of an evaluation. Check each: a gambit or trap is fine, a typo in the line is not.','',
 '| Move | Position | Eval before | Eval after | Tree |','|---|---|---|---|---|',
 ...flags.sort((a,b)=>b.drop-a.drop).slice(0,200).map(f=>`| ${f.san} | \`${f.key.split('|')[0]}\` | ${(f.before/100).toFixed(1)} | ${(f.after/100).toFixed(1)} | ${f.trees[0]} |`)];
fs.writeFileSync(path.join(OUT,'mspc-report.md'),rep.join('\n'));
console.log(`report: ${flags.length} moves flagged for review`);
