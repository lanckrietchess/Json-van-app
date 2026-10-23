import assert from 'node:assert';
import {Chess,composeNote,noteM,noteS,noteP,noteC,noteWR,nullFen,moveKind,noteKey,cleanSan,evalLabel,_t} from './mspc.mjs';
const NAME_OF=t=>({p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'}[t]);
let n=0;const t=(name,fn)=>{try{fn();n++;console.log('ok  ',name)}catch(e){console.log('FAIL',name,'\n     ',e.message);process.exitCode=1}};
const play=(sans,from)=>{const g=from?new Chess(from):new Chess();const hist=[];for(const s of sans){const m=g.move(s);assert(m,'illegal '+s);hist.push(m)}return{g,hist}};

t('noteKey is the same for transpositions and ignores move numbers / counters',()=>{
  const a=play(['Nf3','Nf6','c4']).g.fen(),b=play(['c4','Nf6','Nf3']).g.fen();
  assert.strictEqual(noteKey(a,'Nc3+'),noteKey(b,'Nc3'));assert.notStrictEqual(a,b,'raw FENs differ (ep square and counters)');
  assert.strictEqual(noteKey(a,'e5!?'),noteKey(b,'e5'));
});
t('nullFen: legal normally, null when the side to move is in check',()=>{
  assert(nullFen(new Chess().fen()).split(' ')[1]==='b');
  const {g}=play(['e4','f5','Qh5+']);                    // black is in check, black to move: flipping would leave black in check with white to move
  assert.strictEqual(nullFen(g.fen()),null);
});
t('M: opening position has no previous move',()=>assert(/Nothing has changed yet/.test(noteM(new Chess(),null,null))));
t('M: a pawn that now hits something names the target',()=>{
  const {g,hist}=play(['e4','c6','d4','d5','e5','c5']);
  const m=noteM(g,hist[hist.length-1],null);assert(/Their c5 now hits your pawn on d4/.test(m),m);assert(/No direct threat/.test(m));
});
t('M: engine threat is named only when it gains at least a pawn',()=>{
  const {g,hist}=play(['e4','e5','Nf3','Nc6']);
  assert(/Threat: Nxe4\./.test(noteM(g,hist[hist.length-1],{san:'Nxe4',gain:150})));
  assert(/No direct threat/.test(noteM(g,hist[hist.length-1],{san:'Nxe4',gain:40})));
});
t('M: castles, captures, checks and development are described correctly',()=>{
  let r=play(['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d3','O-O'].slice(0,9).concat([]));
  // black castles needs a legal route: use a known sequence
  r=play(['e4','e5','Nf3','Nf6','Nxe5','d6','Nf3','Nxe4','d3','Nf6','Be2','Be7','O-O','O-O']);
  assert(/^They castled: their king is safe\./.test(noteM(r.g,r.hist[r.hist.length-1],null)),noteM(r.g,r.hist[r.hist.length-1],null));
  r=play(['e4','d5','exd5']);assert(/takes your pawn on d5|trades pawns on d5/.test(noteM(r.g,r.hist[2],null)));
  r=play(['e4','e5','Qh5','Nc6','Bc4','Nf6','Qxf7']);assert(/takes your pawn on f7/.test(noteM(r.g,r.hist[6],null)));
  r=play(['e4','f5','Qh5']);assert(/gives check/.test(noteM(r.g,r.hist[2],null))&&!/No direct threat/.test(noteM(r.g,r.hist[2],null)),noteM(r.g,r.hist[2],null));
  r=play(['d4','Nf6']);assert(/Their Nf6 develops the knight/.test(noteM(r.g,r.hist[1],null)),noteM(r.g,r.hist[1],null));r=play(['e4']);assert(/Their e4 grabs space in the centre/.test(noteM(r.g,r.hist[0],null)),noteM(r.g,r.hist[0],null));
});
t('S: king in the centre and development count in the opening',()=>{
  const {g}=play(['e4','e5','Nf3','Nc6']);const s=noteS(g,'w',6);
  assert(/Move 6, opening\./.test(s)&&/king is still in the centre/.test(s),s);
  assert(!/still in the centre/.test(noteS(new Chess(),'w',1)),'not on move 1');
});
t('S: pawn tension, castled king and bishop pair are detected',()=>{
  let {g}=play(['e4','d5']);assert(/Pawn tension on d5/.test(noteS(g,'w',2)),noteS(g,'w',2));
  ({g}=play(['e4','e5','Nf3','Nf6','Be2','Be7','O-O','O-O']));assert(/Your king is castled/.test(noteS(g,'w',5)),noteS(g,'w',5));
  g=new Chess('4k3/8/8/8/8/8/PPP2PPP/2B1KB2 w - - 0 30');const s=noteS(g,'w',30);assert(/Endgame|endgame/.test(s)&&/bishop pair|up material/.test(s),s);
});
t('S: open file is named',()=>{const g=new Chess('r3k2r/ppp2ppp/8/8/8/8/PPP2PPP/R3K2R w KQkq - 0 12');assert(/The [de]-file is open/.test(noteS(g,'w',12)),noteS(g,'w',12))});
t('P: lists the checks and captures that exist, and calls the move what it is',()=>{
  const {g}=play(['e4','f5']);const mv=g.moves({verbose:true}).find(m=>m.san==='Qh5+');
  const p=noteP(g,mv);assert(/Checks: Qh5\+/.test(p)&&/Captures: exf5/.test(p)&&/is a check/.test(p),p);
  const g2=new Chess();const mv2=g2.moves({verbose:true}).find(m=>m.san==='Nf3');const p2=noteP(g2,mv2);assert(/No checks\. No captures\./.test(p2)&&/quiet developing move/.test(p2),p2);
});
t('moveKind',()=>{
  const g=new Chess();const k=s=>moveKind(g,g.moves({verbose:true}).find(m=>m.san===s));
  assert.strictEqual(k('e4'),'centre-pawn');assert.strictEqual(k('a3'),'pawn-move');assert.strictEqual(k('Nf3'),'develop');
  const c=new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');assert.strictEqual(moveKind(c,c.moves({verbose:true}).find(m=>m.san==='O-O')),'castle');
});
t('C: eval labels and the engine-disagrees wording',()=>{
  assert.strictEqual(evalLabel(10,null),'about equal');assert.strictEqual(evalLabel(80,null),'roughly balanced');assert.strictEqual(evalLabel(-120,null),'roughly balanced');assert.strictEqual(evalLabel(-200,null),'clearly better for them');assert.strictEqual(evalLabel(500,null),'winning for you');
  assert.strictEqual(evalLabel(0,3),'mate in 3 for you');assert.strictEqual(evalLabel(0,-2),'mate in 2 for them');
  const g=new Chess();const mv=g.moves({verbose:true}).find(m=>m.san==='e4');
  assert(/A course choice/.test(noteC(mv,'e5',{after:{cp:-300},drop:260})));
  assert(/Expect e5\./.test(noteC(mv,'e5',{after:{cp:20},drop:5}))&&/about equal/.test(noteC(mv,'e5',{after:{cp:20},drop:5})));
  assert(/line ends here/.test(noteC(mv,null,null)));
});
t('W/R: develop + attack tail only when true',()=>{
  const {g}=play(['e4','e5']);const mv=g.moves({verbose:true}).find(m=>m.san==='Nf3');
  const x=noteWR(g,mv);assert(/Develops the knight to f3, attacking the pawn on e5/.test(x.w),x.w);
  const g2=new Chess();const mv2=g2.moves({verbose:true}).find(m=>m.san==='Nc3');assert(/Develops the knight to c3/.test(noteWR(g2,mv2).w));
  assert(!/attacks the/.test(noteWR(g2,mv2).w),'Nc3 attacks nothing on move 1');
});
t('composeNote: first move of a line',()=>{
  const x=composeNote({fenBefore:new Chess().fen(),san:'e4',lastMove:null,nextSan:'c6',eng:{threat:null,evalAfter:{cp:25,mate:null},drop:0}});
  assert(/Nothing has changed/.test(x.m)&&/Move 1, opening/.test(x.s)&&/Claims space in the centre/.test(x.w)&&/Expect c6/.test(x.c),JSON.stringify(x));
});
t('composeNote returns null for an illegal move instead of inventing text',()=>assert.strictEqual(composeNote({fenBefore:new Chess().fen(),san:'Qh5',lastMove:null}),null));

t('S (endgame): piece type, passed pawns and material are named correctly',()=>{
  let g=new Chess('7k/8/8/8/1p3K2/8/8/8 w - - 0 1');let s=noteS(g,'w',1);assert(/King and pawn endgame\./.test(s)&&/They have a passed pawn on b4\./.test(s)&&!/You have a passed/.test(s),s);
  g=new Chess('8/5ppp/8/8/8/8/P4PPP/R3K2R w - - 0 30');s=noteS(g,'w',30);assert(/Rook endgame/.test(s),s);
  g=new Chess('4k3/8/8/3P4/8/8/8/4K3 w - - 0 40');s=noteS(g,'w',40);assert(/You have a passed pawn on d5/.test(s),s);
  g=new Chess('4k3/p7/8/3P4/8/8/P7/4K3 w - - 0 40');s=noteS(g,'w',40);assert(/passed pawn on d5/.test(s)&&!/You have a passed pawn on a/.test(s),s);
  g=new Chess('4k3/8/8/8/3P4/8/PPP5/4K3 w - - 0 40');s=noteS(g,'w',40);assert(/You have 4 passed pawns, the most advanced on d4\./.test(s),s);
});
t('M: a puzzle position has no last move: it says so and still reports a threat',()=>{
  const g=new Chess('7k/8/8/8/1p3K2/8/8/8 w - - 0 1');
  assert(/No last move to read/.test(noteM(g,null,null))&&/No direct threat/.test(noteM(g,null,null)));
  assert(/Threat: b3\./.test(noteM(g,null,{san:'b3',gain:900})));
  assert(/Nothing has changed yet/.test(noteM(new Chess(),null,null)),'the real start position keeps the first-move text');
});
t('endgame wording: no "develops" for a piece that was already out, no file noise without rooks, king is a fighter',()=>{
  let r=play(['e4','e5','Nf3','Nc6','Nc3','Nf6','Nd5']);assert(/Their Nf6 develops the knight/.test(noteM(r.g,r.hist[5],null)));
  const g=new Chess('8/8/8/8/5n2/8/8/4K2k b - - 0 1');const last={san:'Nf4',piece:'n',from:'e6',to:'f4',color:'w',flags:'n',captured:undefined};
  assert(!/develops/.test(noteM(g,last,null)),noteM(g,last,null));
  assert(!/file is open/.test(noteS(new Chess('4k3/8/8/8/8/8/P7/4K3 w - - 0 40'),'w',40)),'K+P: no open-file remark');
  assert(/The b-file is open/.test(noteS(new Chess('4k3/8/8/8/8/8/P7/R3K3 w - - 0 40'),'w',40)),'with a rook on the board the file remark stays: '+noteS(new Chess('4k3/8/8/8/8/8/P7/R3K3 w - - 0 40'),'w',40));
  const k=new Chess('6k1/8/4K3/8/4P3/8/8/8 w - - 0 1');const mv=k.moves({verbose:true}).find(m=>m.san==='Kd7');
  const x=noteWR(k,mv);assert(/fighting piece/.test(x.w)&&!/safer/.test(x.w)&&x.r==='Activate your king.',x.w);
  const m2=new Chess('r1bq1rk1/ppp2ppp/2n2n2/3pp3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8');const k2=m2.moves({verbose:true}).find(m=>m.san==='Kh1');
  assert(/check that it is really safe/.test(noteWR(m2,k2).w));
});
/* fuzz: 300 random positions, every field present, short, clean, and the factual M claims match the board */
t('fuzz: all fields present, <=26 words, no junk, M claims are true',()=>{
  let seed=7;const rnd=()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296};
  let count=0,bad=[];
  for(let game=0;game<30;game++){
    const g=new Chess();const hist=[];
    for(let ply=0;ply<40&&!g.game_over();ply++){
      const mv=g.moves({verbose:true});const pick=mv[Math.floor(rnd()*mv.length)];
      const fenBefore=g.fen(),last=hist[hist.length-1]||null;
      const note=composeNote({fenBefore,san:pick.san,lastMove:last,nextSan:'e5',eng:{threat:null,evalAfter:{cp:Math.round(rnd()*400-200),mate:null},drop:0}});
      count++;
      if(!note){bad.push('null '+fenBefore+' '+pick.san);}
      else for(const k of['m','s','p','c','w','r']){
        const v=note[k];
        if(typeof v!=='string'||!v.trim())bad.push(k+' empty '+fenBefore);
        else if(_t.wordCount(v)>26)bad.push(k+' long('+_t.wordCount(v)+'): '+v);
        else if(/undefined|NaN|\bnull\b|\[object/.test(v))bad.push(k+' junk: '+v);
      }
      if(note&&last){
        const m=note.m;
        const cm=/takes your (\w+) on (\w\d)/.exec(m);
        if(cm&&!(last.captured&&last.to===cm[2]))bad.push('false capture claim: '+m);
        if(/gives check/.test(m)&&!/[+#]/.test(last.san))bad.push('false check claim: '+m);
        if(/castles/.test(m)&&!(last.flags.includes('k')||last.flags.includes('q')))bad.push('false castle claim: '+m);
        const hm=/now hits your (\w+) on (\w\d)/.exec(m);
        if(hm){const tgt=new Chess(fenBefore).get(hm[2]);if(!tgt||tgt.color===last.color||NAME_OF(tgt.type)!==hm[1])bad.push('false hit claim: '+m)}
      }
      hist.push(g.move(pick.san)&&pick);
      hist[hist.length-1]=g.history({verbose:true}).slice(-1)[0];
    }
  }
  assert(count>1000,'sampled '+count);assert.strictEqual(bad.length,0,bad.slice(0,5).join('\n'));
});
console.log('\n'+n+' passed');
