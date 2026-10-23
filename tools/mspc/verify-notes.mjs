/* Independent check of mspc-notes.json against the course trees AND the puzzle lines: coverage and every factual claim re-derived from
   the board. usage: node verify-notes.mjs <content.json> <mspc-notes.json>   (exit code 1 on any failure) */
import fs from 'node:fs';
import {Chess,noteKey,nullFen,cleanSan} from './mspc.mjs';
const [cf,nf]=process.argv.slice(2);
const content=JSON.parse(fs.readFileSync(cf,'utf8')),db=JSON.parse(fs.readFileSync(nf,'utf8'));
const N={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const bad=[],stat={slots:0,treeMoves:0,puzzleMoves:0,mClaims:0,wClaims:0,threats:0,expect:0,maxWords:0};
const seen=new Set(),checked=new Set();

/* every claim a note makes, re-derived. last = the opponent's previous move (verbose) or null; nextSans = replies the source really has */
function claims(note,key,fenBefore,mv,last,nextSans,src){
  for(const k of['m','s','p','c','w','r']){
    const v=note[k];
    if(typeof v!=='string'||!v.trim()){bad.push(k+' empty '+key);continue}
    const wc=v.trim().split(/\s+/).length;stat.maxWords=Math.max(stat.maxWords,wc);
    if(wc>26)bad.push(k+' too long ('+wc+') '+key);
    if(/undefined|NaN|\bnull\b|\[object/.test(v))bad.push(k+' junk '+key);
  }
  let x;
  if(last){
    if((x=/takes your (\w+) on (\w\d)/.exec(note.m))){stat.mClaims++;if(!(last.captured&&last.to===x[2]&&N[last.captured]===x[1]))bad.push('M false capture: '+note.m+' | '+last.san+' '+key)}
    if(/gives check/.test(note.m)){stat.mClaims++;if(!/[+#]/.test(last.san))bad.push('M false check: '+note.m)}
    if(/^They castled/.test(note.m)){stat.mClaims++;if(!(last.flags.includes('k')||last.flags.includes('q')))bad.push('M false castle: '+note.m)}
    if((x=/now hits your (\w+) on (\w\d)/.exec(note.m))){stat.mClaims++;const t=new Chess(fenBefore).get(x[2]);if(!t||t.color===last.color||N[t.type]!==x[1])bad.push('M false hit: '+note.m+' | '+key)}
    if((x=/^Their (\S+) /.exec(note.m))&&cleanSan(x[1])!==cleanSan(last.san))bad.push('M wrong move named: '+note.m+' vs '+last.san)
  }else if(!/Nothing has changed|No last move to read/.test(note.m))bad.push('M should say there is no last move: '+note.m);
  if((x=/Threat: (\S+?)\./.exec(note.m))){stat.threats++;const f=nullFen(fenBefore);if(!(f&&new Chess(f).moves().some(s=>cleanSan(s)===cleanSan(x[1]))))bad.push('M threat not legal for them: '+note.m+' | '+key)}
  if((x=/Expect (.+?)\./.exec(note.c))){stat.expect++;const got=x[1].split(' or ').map(cleanSan);if(!got.every(m=>nextSans.map(cleanSan).includes(m)))bad.push('C unknown reply ('+src+'): '+note.c+' vs '+nextSans.join(','))}
  else if(/line ends here/.test(note.c)&&nextSans.length)bad.push('C says the line ends but it continues ('+src+'): '+key);
  if((x=/attacking the (\w+) on (\w\d)/.exec(note.w))){
    stat.wClaims++;const h=new Chess(fenBefore);h.move(mv.san);const f=nullFen(h.fen());
    if(!(f&&new Chess(f).moves({verbose:true}).some(m=>m.from===mv.to&&m.captured&&N[m.captured]===x[1]&&m.to===x[2])))bad.push('W false attack: '+note.w+' | '+key);
  }
  if((x=/Develops the (\w+) to (\w\d)/.exec(note.w))&&(N[mv.piece]!==x[1]||mv.to!==x[2]))bad.push('W wrong develop: '+note.w+' | '+mv.san);
  if(/^Castles/.test(note.w)&&!(mv.flags.includes('k')||mv.flags.includes('q')))bad.push('W false castle '+key);
}
function cover(key,kind){
  stat.slots++;stat[kind]++;
  const note=db.notes[key];if(!note){bad.push('MISSING '+key);return null}
  seen.add(key);return note;
}

/* ---- the course trees ---- */
function walk(tree,nodes,g,last){
  for(const n of nodes){
    const fenBefore=g.fen(),mv=g.move(n.m,{sloppy:true});if(!mv)continue;
    if(mv.color===tree.side){
      const key=noteKey(fenBefore,mv.san),note=cover(key,'treeMoves');
      if(note&&!checked.has(key)){checked.add(key);claims(note,key,fenBefore,mv,last,(n.c||[]).map(k=>k.m),tree.id)}
    }
    walk(tree,n.c||[],g,mv);g.undo();
  }
}
for(const t of content.trees)walk(t,t.tree||[],new Chess(),null);

/* ---- the puzzle lines: the solver's moves along solution_moves ---- */
for(const [name,L] of Object.entries(content.lists||{})){
  for(const p of Array.isArray(L)?L:[]){
    if(!p||!p.puzzle_fen||!Array.isArray(p.solution_moves)||!p.solution_moves.length)continue;
    const g=new Chess();if(!g.load(p.puzzle_fen))continue;
    const solver=(p.side==='w'||p.side==='b')?p.side:(g.turn()==='w'?'b':'w');
    const sol=p.solution_moves.filter(m=>typeof m==='string');let last=null;
    for(let i=0;i<sol.length;i++){
      const u=sol[i],fenBefore=g.fen(),mv=g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||undefined});if(!mv)break;
      if(mv.color===solver){
        const key=noteKey(fenBefore,mv.san),note=cover(key,'puzzleMoves');
        if(note&&!checked.has(key)){
          checked.add(key);
          let next=[];if(sol[i+1]){const h=new Chess(g.fen()),m2=h.move({from:sol[i+1].slice(0,2),to:sol[i+1].slice(2,4),promotion:sol[i+1][4]||undefined});if(m2)next=[m2.san]}
          claims(note,key,fenBefore,mv,last,next,name+':'+p.id);
        }
      }
      last=mv;
    }
  }
}
const extra=Object.keys(db.notes).filter(k=>!seen.has(k));
console.log(JSON.stringify(stat),'| notes in file',Object.keys(db.notes).length,'| unused notes',extra.length);
if(extra.length)bad.push(extra.length+' notes in the file belong to no move in the content');
if(bad.length){console.log('FAILURES',bad.length);bad.slice(0,15).forEach(b=>console.log(' -',b));process.exit(1)}
console.log('verify: OK, every move is covered and every factual claim holds');
