const assert=require('assert');const {make}=require('./harness');
const {L}=make();const g=L.logic;const J=x=>JSON.parse(JSON.stringify(x));let n=0;const t=(name,fn)=>{try{fn();n++;console.log('ok  ',name)}catch(e){console.log('FAIL',name,'\n     ',e.message);process.exitCode=1}};

t('altVerdict: same mate speed is full',()=>assert.strictEqual(g.altVerdict({bestPct:100,playedPct:100,bestMate:3,playedMate:3}).tier,'full'));
t('altVerdict: mate one move slower is still full',()=>assert.strictEqual(g.altVerdict({bestPct:100,playedPct:100,bestMate:3,playedMate:4}).tier,'full'));
t('altVerdict: much slower mate is mostly',()=>assert.strictEqual(g.altVerdict({bestPct:100,playedPct:100,bestMate:2,playedMate:6}).tier,'mostly'));
t('altVerdict: missing a forced mate is no',()=>assert.strictEqual(g.altVerdict({bestPct:100,playedPct:60,bestMate:2,playedMate:null}).tier,'no'));
t('altVerdict: 4 points lost is full',()=>assert.strictEqual(g.altVerdict({bestPct:80,playedPct:76,bestMate:null,playedMate:null}).tier,'full'));
t('altVerdict: 8 points lost is mostly',()=>assert.strictEqual(g.altVerdict({bestPct:80,playedPct:72}).tier,'mostly'));
t('altVerdict: 15 points lost is no',()=>assert.strictEqual(g.altVerdict({bestPct:80,playedPct:65}).tier,'no'));
t('altVerdict: better than best never negative',()=>assert.strictEqual(g.altVerdict({bestPct:70,playedPct:75}).loss,0));
t('altReason names the alternative and the others',()=>{const r=g.altReason({tier:'full',why:'mate'},'Qh5#','Qxf7#',[{san:'Rd8#',mate:1,cp:0}]);assert(/Qh5#/.test(r)&&/Qxf7#/.test(r)&&/Rd8#/.test(r)&&/mate in 1/.test(r))});
t('altReason mostly mentions points',()=>assert(/7 points/.test(g.altReason({tier:'mostly',why:'eval',loss:7.2},'Nf3','Nxe5',[]))));

const card=i=>({fen:'f'+i,san:'m'+i,from:'a2',to:'a3'});
t('flashPick needs a minimum buffer',()=>assert.strictEqual(g.flashPick([card(1),card(2)]),null));
t('flashPick skips the two newest when it can',()=>{const buf=[1,2,3,4,5,6].map(card);for(let i=0;i<60;i++){const c=g.flashPick(buf,()=>Math.random());assert(!['f5','f6'].includes(c.fen))}});
t('flashPick works with a small buffer',()=>assert(g.flashPick([1,2,3].map(card))));
t('flashDue every 4th',()=>assert.deepStrictEqual([1,2,3,4,5,8].map(c=>g.flashDue(c)),[false,false,false,true,false,true]));
t('flashPush dedupes and caps',()=>{let b=[];for(let i=0;i<30;i++)b=g.flashPush(b,card(i%20));assert(b.length<=16);assert.strictEqual(new Set(b.map(c=>c.fen+c.san)).size,b.length)});

t('ghostXp is 0 at start, goal at the end, monotonic',()=>{const t0=0;assert.strictEqual(g.ghostXp(t0,0,600),0);assert.strictEqual(g.ghostXp(t0,7*864e5,600),600);let p=-1;for(let d=0;d<=7;d+=.5){const v=g.ghostXp(t0,d*864e5,600);assert(v>=p);p=v}});
t('ghostState: ahead / won / over',()=>{const st={t0:0,base:100,goal:600};const D=864e5;
  assert.strictEqual(g.ghostState(st,250,1*D).ahead,true);assert.strictEqual(g.ghostState(st,150,1*D).ahead,false);
  assert.strictEqual(g.ghostState(st,700,2*D).won,true);
  const late=g.ghostState(st,300,9*D);assert.strictEqual(late.over,true);assert.strictEqual(late.won,false);
  assert.strictEqual(g.ghostState({...st,won:true},0,9*D).over,false);
  assert.strictEqual(g.ghostState(st,900,9*D).won,false,'XP after the week does not win it retroactively');
  assert.strictEqual(g.ghostState(st,900,9*D).over,true);
  assert.strictEqual(g.ghostState(st,900,7.5*D).won,true,'grace day for the claim')});

t('challengeUrl keeps the ref and adds a clean ch',()=>{const u=new URL(g.challengeUrl('https://x.app/?ref=sam123','xp','480'));assert.strictEqual(u.searchParams.get('ref'),'sam123');assert.strictEqual(u.searchParams.get('ch'),'xp:480')});
t('challengeUrl strips junk from the value',()=>assert.strictEqual(new URL(g.challengeUrl('https://x.app/','xp','<b>9</b>')).searchParams.get('ch'),'xp:b9b'));
t('whatsappLink encodes text and url',()=>{const l=g.whatsappLink('Hi & bye','https://x.app/?ref=a&ch=xp:1');assert(l.startsWith('https://wa.me/?text='));assert(!l.includes('&ch=')&&l.includes('%26ch%3Dxp%3A1'))});
t('parseChallenge round trip',()=>{assert.deepStrictEqual(J(g.parseChallenge('?ref=a&ch=xp:480')),{kind:'xp',val:'480'});assert.strictEqual(g.parseChallenge('?ch=<script>'),null);assert.strictEqual(g.parseChallenge(''),null)});

const w={kind:'week',games:12,wins:7,losses:4,draws:1,acc:81.4,blunders:5,mistakes:9,brilliant:2,eloFrom:1010,eloTo:1058,bestOpening:{name:'Caro-Kann'},worstOpening:{name:'Colle System'},xp:420,puzzles:36};
t('recapScript: ~45 seconds (<=135 words) and says the key numbers',()=>{const r=g.recapScript(w,'Sam');const wc=r.split(/\s+/).length;assert(wc<=135,'words='+wc);assert(wc>=60,'words='+wc);assert(/12 games/.test(r)&&/81 percent/.test(r)&&/48 points/.test(r)&&/Caro-Kann/.test(r))});
t('recapScript: empty when no games',()=>assert.strictEqual(g.recapScript({games:0}),''));
t('recapScript: handles a month and a rating drop',()=>{const r=g.recapScript({...w,kind:'month',eloFrom:1100,eloTo:1080});assert(/this month/.test(r)&&/dipped 20/.test(r))});

t('questAfterRedemption: level 1 -> 2, base after the XP, others untouched',()=>{
  assert.deepStrictEqual(J(g.questAfterRedemption({on:true,level:1,base:0},50)),{on:true,level:2,base:50});
  assert.deepStrictEqual(J(g.questAfterRedemption({on:true,level:3,base:9},50)),{on:true,level:3,base:9});
  assert.strictEqual(g.questAfterRedemption({on:false,level:1},50).level,1)});
t('lossOf: only a real loss for the user',()=>{
  assert.strictEqual(g.lossOf({White:'Sam',Black:'X',Result:'0-1'},'sam'),'w');
  assert.strictEqual(g.lossOf({White:'X',Black:'Sam',Result:'1-0'},'SAM'),'b');
  assert.strictEqual(g.lossOf({White:'Sam',Black:'X',Result:'1-0'},'sam'),'');
  assert.strictEqual(g.lossOf({White:'A',Black:'B',Result:'0-1'},'sam'),'')});
t('fenFromPosition matches chess.js for the start position',()=>{
  const pos={};const start=new (require('chess.js').Chess)().board();
  start.forEach((row,r)=>row.forEach((p,f)=>{if(p)pos['abcdefgh'[f]+(8-r)]=p.color+p.type.toUpperCase()}));
  assert.strictEqual(g.fenFromPosition(pos).split(' ')[0],'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')});

/* ---- which move to redeem: built from the classifier output of a REAL game (Morphy v Duke, Black), captured in a real browser ---- */
const real=[[4,'Bxf3','good',9.1],[5,'dxe5','best',0],[6,'Nf6','good',9.3],[7,'Qe7','good',2.1],[8,'c6','best',1.8],[9,'b5','inaccuracy',13.9],[10,'cxb5','good',5.5],[11,'Nbd7','good',.6],[12,'Rd8','good',0],[13,'Rxd7','good',.6],[14,'Qe6','best',4.1],[15,'Nxd7','best',24.6],[16,'Nxb8','best',0]].map(([num,san,cls,loss])=>({num,san,cls,loss,i:2*num-1,color:'b'}));
t('pickRedemption: a real lost game with no "mistake" class still gets its instructive move (9...b5), not "clean game"',()=>{
  const p=g.pickRedemption(real);assert.strictEqual(p.san,'b5');assert.strictEqual(p.cls,'inaccuracy');
  assert.strictEqual(g.pickRedemption(real.filter(x=>x.cls==='best'||x.cls==='good')).san,'Nf6','without any error class: the biggest non-forced loss (9.3 beats 9.1)');
});
t('pickRedemption: class beats size, size breaks ties, forced "best" moves are never chosen, nothing qualifies -> null',()=>{
  assert.strictEqual(g.pickRedemption([{i:1,cls:'inaccuracy',loss:19,san:'a'},{i:3,cls:'mistake',loss:11,san:'b'},{i:5,cls:'blunder',loss:6,san:'c'}]).san,'c','a blunder beats a bigger inaccuracy');
  assert.strictEqual(g.pickRedemption([{i:1,cls:'mistake',loss:11,san:'a'},{i:3,cls:'mistake',loss:25,san:'b'}]).san,'b');
  assert.strictEqual(g.pickRedemption([{i:1,cls:'best',loss:40,san:'a'},{i:3,cls:'good',loss:3,san:'b'}]),null,'a "best" move with a big swing is forced play, a 3-point loss is noise');assert.strictEqual(g.pickRedemption([{i:1,cls:'good',loss:4.5,san:'a'}]).san,'a','4+ points is worth a lesson in a lost game');
  assert.strictEqual(g.pickRedemption([]),null);assert.strictEqual(g.pickRedemption(null),null);assert.strictEqual(g.pickRedemption([{cls:'blunder',loss:30}]),null,'items without a position are ignored');
  assert.deepStrictEqual(['blunder','mistake','inaccuracy','good'].map(g.markOf),['??','?','?!','?!']);
});
console.log('\n'+n+' passed');
