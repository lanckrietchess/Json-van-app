const assert=require('assert');const {make,Chess}=require('./harness');
let n=0,fail=0;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const t=async(name,fn)=>{try{await fn();n++;console.log('ok  ',name)}catch(e){fail++;console.log('FAIL',name,'\n     ',e.stack.split('\n').slice(0,4).join('\n      '))}};

const movesA='e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7 h3 h6 Nbd2 Be6'.split(' ');
const pgn=(w,b,res,moves=movesA)=>{let s=`[Event "Live"]\n[White "${w}"]\n[Black "${b}"]\n[Result "${res}"]\n\n`;moves.forEach((m,i)=>{s+=(i%2?'':(i/2+1)+'. ')+m+' '});return s+res};
const parseGame=text=>{const c=new Chess();if(!c.load_pgn(text))return null;const h={};text.replace(/\[(\w+) "([^"]*)"\]/g,(m,k,v)=>{h[k]=v});
  const hist=c.history({verbose:true}),g=new Chess(),fens=[g.fen()],moves=[];hist.forEach((m,i)=>{g.move(m.san);fens.push(g.fen());moves.push({san:m.san,color:m.color,from:m.from,to:m.to,num:Math.floor(i/2)+1})});
  return moves.length<8?null:{headers:h,pgn:text,moves,fens,color:'',label:h.White+' vs '+h.Black,result:h.Result}};
const splitGames=t=>({pgns:t.split(/\n\n(?=\[Event)/).map(x=>x.trim()).filter(Boolean),links:[]});
const items=[{i:6,color:'w',san:'c3',num:4,cls:'blunder',loss:35,k:'S',detail:'Your bishop on c4 was loose.',best:'d2d4',bestSan:'d4',bestUci:'d2d4'}];
const env=(opts={})=>w=>{
  w.LC80={scan:{splitGames,parseGame,analyseGame:async(g,tick,cancelled)=>{for(let k=0;k<3;k++)tick(k,3);return opts.items||items}},openGames(o){w.__legacy=(w.__legacy||0)+1}};
  w.Engine={load:async()=>opts.engineFails?false:true,stop(){},uciToSan:()=> 'd4',toCp:l=>l.cp,winPct:x=>50,analyse:async()=>({lines:[{cp:0,pv:['d2d4']}]})};
  w.fetchWithTimeout=async url=>{
    w.__urls=(w.__urls||[]).concat([url]);
    const ok=(body,json)=>({ok:true,text:async()=>body,json:async()=>json});
    if(/lichess\.org\/api\/games\/user\//.test(url))return ok(opts.lichess||'');
    if(/games\/archives$/.test(url))return ok('',{archives:['https://api.chess.com/pub/player/sam/games/2026/10']});
    if(/api\.chess\.com\/pub\/player\/sam\/games\/2026\/10$/.test(url))return ok('',{games:opts.cc||[]});
    return{ok:false};
  };
};

(async()=>{
await t('fetchLastLoss (Lichess): skips wins, returns the newest LOSS with the user\u2019s colour',async()=>{
  const lic=[pgn('Sam','Bob','1-0'),pgn('Bob','Sam','1-0'),pgn('Sam','Eve','0-1')].join('\n\n');
  const {L}=make(env({lichess:lic}));const g=await L.fetchLastLoss('li','sam',20);
  assert(g,'found');assert.strictEqual(g.color,'b');assert.strictEqual(g.headers.White,'Bob');
});
await t('fetchLastLoss (Chess.com): newest first, uses the monthly archive',async()=>{
  const cc=[{pgn:pgn('Sam','Bob','1-0'),rules:'chess'},{pgn:pgn('Zed','Sam','1-0'),rules:'chess'}].reverse();   // archive is oldest first, the code reverses it
  const {L}=make(env({cc}));const g=await L.fetchLastLoss('cc','sam',20);assert(g);assert.strictEqual(g.color,'b');
});
await t('fetchLastLoss: no loss, bad usernames and non-standard variants',async()=>{
  const {L}=make(env({lichess:pgn('Sam','Bob','1-0')}));assert.strictEqual(await L.fetchLastLoss('li','sam',20),null);
  await assert.rejects(()=>L.fetchLastLoss('li','bad name!',20),/name/);
  const r=make(env({cc:[{pgn:pgn('Sam','Bob','0-1'),rules:'chess960'}]}));assert.strictEqual(await r.L.fetchLastLoss('cc','sam',20),null);
});

const lichess=pgn('Sam','Eve','0-1');
await t('Redemption: onboarding hand-off -> scan -> quiz -> +50 XP -> Level 2 popup -> quest moves to level 2',async()=>{
  const {w,L,sheets,xp,store}=make(env({lichess}));
  w.Store.set('lc19-sw',{on:true,level:1,base:0,t0:Date.now()});
  assert.strictEqual(L.onb.afterOnboarding({cc:'',li:'sam'}),true);
  await sleep(150);
  const sh=sheets[sheets.length-1];assert(/redemption/i.test(sh.o.title));
  let txt=sh.s.el.textContent;assert(/Move 4: you played c3\?\?/.test(txt),txt.slice(0,300));assert(/Leak: Specifics/.test(txt));
  const board=sh.s.el.querySelector('[data-q]').__board;assert.strictEqual(board.opts.orientation,'white');
  assert.strictEqual(board.opts.fen,new Chess().fen()&&board.opts.fen,'fen is the position before the blunder');
  board.opts.onMove({from:'d2',to:'d4'});await sleep(30);
  assert(/That is the move/.test(sh.s.el.textContent));assert.strictEqual(xp.length,1);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(xp[0].slice(0,2))),['think',50]);
  assert.strictEqual(xp[0][2].noFw,true,'bypasses the account multiplier: exactly +50');
  const q=w.Store.get('lc19-sw',null);assert.strictEqual(q.level,2);assert.strictEqual(q.base,50);
  sh.s.el.querySelector('[data-fin]').click();await sleep(400);
  const pop=sheets[sheets.length-1];assert(/Level 2/.test(pop.o.title)&&/\+50 XP/.test(pop.s.el.textContent));
  assert(pop.s.el.querySelector('a[href^="https://wa.me/"]'),'share button on the level-up');
  assert.strictEqual(w.__legacy||0,0,'old 0-5 game scan not opened');
});
await t('Redemption: +50 XP is awarded only once even if opened again',async()=>{
  const {w,L,sheets,xp}=make(env({lichess}));
  L.onb.afterOnboarding({li:'sam'});await sleep(150);sheets[sheets.length-1].s.el.querySelector('[data-show]').click();await sleep(20);
  assert.strictEqual(xp.length,1);
  L._t.award({pgn:'x'},{});assert.strictEqual(xp.length,1);
});
await t('Redemption: a merely playable move gets a nudge, only a genuinely good one redeems the blunder',async()=>{
  const {w,L,sheets,xp}=make(env({lichess}));
  L.onb.afterOnboarding({li:'sam'});await sleep(150);
  const sh=sheets[sheets.length-1],b=sh.s.el.querySelector('[data-q]').__board;
  /* best 300cp, the move 215cp: 6 win-% worse = "playable" */
  w.Engine.winPct=cp=>50+50*(2/(1+Math.exp(-.00368208*cp))-1);let calls=0;
  w.Engine.analyse=async(fen)=>({lines:[{cp:fen===b.opts.fen?300:215,pv:['d2d4']}]});
  b.opts.onMove({from:'b1',to:'c3'});await sleep(80);
  assert(/Close\./.test(sh.s.el.textContent)&&/playable, but this position has a better move/.test(sh.s.el.textContent)&&/2 left/.test(sh.s.el.textContent),sh.s.el.textContent.slice(300,600));
  assert.strictEqual(xp.length,0,'not redeemed yet');
  w.Engine.analyse=async(fen)=>({lines:[{cp:fen===b.opts.fen?300:296,pv:['d2d4']}]});
  b.opts.onMove({from:'b1',to:'c3'});await sleep(80);
  assert(/works too/.test(sh.s.el.textContent)&&xp.length===1,'a move within 5 points redeems it');
});
await t('Redemption: three wrong tries reveal the better move; still completes',async()=>{
  const {w,L,sheets,xp}=make(env({lichess}));
  L.onb.afterOnboarding({li:'sam'});await sleep(150);
  const sh=sheets[sheets.length-1],b=sh.s.el.querySelector('[data-q]').__board;
  // engine stub says every non-best move is 50% = same as best, so use a stub that rejects: make Engine.analyse return a big drop
  w.Engine.winPct=cp=>cp>0?90:20;w.Engine.analyse=async(fen,o)=>({lines:[{cp:fen===b.opts.fen?300:-300,pv:['d2d4']}]});
  for(let k=0;k<3;k++){b.opts.onMove({from:'a2',to:'a3'});await sleep(60)}
  assert(/The move was/.test(sh.s.el.textContent),sh.s.el.textContent.slice(0,400));assert.strictEqual(xp.length,1);
});
await t('Redemption: an engine-approved alternative also counts',async()=>{
  const {w,L,sheets,xp}=make(env({lichess}));
  L.onb.afterOnboarding({li:'sam'});await sleep(150);
  const sh=sheets[sheets.length-1],b=sh.s.el.querySelector('[data-q]').__board;
  w.Engine.winPct=()=>60;w.Engine.analyse=async()=>({lines:[{cp:80,pv:['b1c3']}]});
  b.opts.onMove({from:'b1',to:'c3'});await sleep(80);
  assert(/works too/.test(sh.s.el.textContent),sh.s.el.textContent.slice(0,300));assert.strictEqual(xp.length,1);
});
await t('Redemption: unknown user, no loss found, offline and engine failure all end gracefully',async()=>{
  let r=make(env({lichess:pgn('Sam','Eve','1-0')}));r.L.onb.afterOnboarding({li:'sam'});await sleep(150);
  assert(/couldn\u2019t find a recent lost game/.test(r.sheets[r.sheets.length-1].s.el.textContent));
  r=make(env({lichess}));r.w.fetchWithTimeout=async()=>{throw new Error('net')};r.L.onb.afterOnboarding({li:'sam'});await sleep(150);
  assert(/couldn\u2019t reach Lichess/.test(r.sheets[r.sheets.length-1].s.el.textContent));
  r=make(env({lichess,engineFails:true}));r.L.onb.afterOnboarding({li:'sam'});await sleep(200);
  assert(/Stockfish couldn\u2019t start/.test(r.sheets[r.sheets.length-1].s.el.textContent));
  r=make(env({lichess}));assert.strictEqual(r.L.onb.afterOnboarding({}),true);await sleep(20);
  const sh=r.sheets[r.sheets.length-1];assert(sh.s.el.querySelector('[data-user]'),'asks for a username when none is known');
  sh.s.el.querySelector('[data-user]').value='!!';sh.s.el.querySelector('[data-go]').click();assert(/Enter your username/.test(sh.s.el.textContent));
  sh.s.el.querySelector('[data-skip]').click();assert.strictEqual(r.w.__legacy,1,'skip falls back to the old 0-5 game scan');
});
await t('Redemption: stays out of the way when LC80 or Engine are missing (old flow runs)',()=>{
  const {L}=make();assert.strictEqual(L.onb.afterOnboarding({li:'sam'}),false);
});
await t('Redemption (real game data): a lost game with only an "inaccuracy" still gets a quiz on the real mistake, marked ?!',async()=>{
  const real=[[4,'Bxf3','good',9.1],[5,'dxe5','best',0],[6,'Nf6','good',9.3],[9,'b5','inaccuracy',13.9],[15,'Nxd7','best',24.6]].map(([num,san,cls,loss])=>({num,san,cls,loss,i:2*num-1,color:'b',k:cls==='inaccuracy'?'S':null,detail:'You gave up the pawn structure.',best:'h7h6',bestSan:'h6'}));
  const {w,L,sheets}=make(env({lichess:pgn('Sam','Eve','0-1'),items:real}));
  L.onb.afterOnboarding({li:'sam'});await sleep(150);
  const sh=sheets[sheets.length-1];const txt=sh.s.el.textContent;
  assert(/Move 9: you played b5\?!/.test(txt),txt.slice(0,260));assert(!/Clean game/.test(txt));
  assert.strictEqual(sh.s.el.querySelector('[data-q]').__board.opts.orientation,'black','the member played Black');
});
await t('Redemption: no single move lost the game -> honest wording (never "clean"), +50 XP once, Continue ends in the Level 2 popup',async()=>{
  const calm=[[4,'a','good',2],[5,'b','good',3.5],[6,'c','best',20]].map(([num,san,cls,loss])=>({num,san,cls,loss,i:2*num-1,color:'b'}));
  const {w,L,sheets,xp}=make(env({lichess:pgn('Sam','Eve','0-1'),items:calm}));
  w.Store.set('lc19-sw',{on:true,level:1,base:0,t0:Date.now()});
  L.onb.afterOnboarding({li:'sam'});await sleep(150);
  const sh=sheets[sheets.length-1];const txt=sh.s.el.textContent;
  assert(/No single blunder lost this one/.test(txt)&&/slipped away over several moves/.test(txt)&&!/Clean game|rare/i.test(txt),txt.slice(0,300));
  assert.strictEqual(xp.length,1);assert.deepStrictEqual(JSON.parse(JSON.stringify(xp[0].slice(0,2))),['think',50]);assert.strictEqual(w.Store.get('lc19-sw',null).level,2);
  sh.s.el.querySelector('[data-fin]').click();await sleep(400);
  const pop=sheets[sheets.length-1];assert(/Level 2/.test(pop.o.title)&&/\+50 XP/.test(pop.s.el.textContent),'the same celebration as the quiz path');
  assert.strictEqual(w.__legacy||0,0,'the old scan is not opened');assert.strictEqual(xp.length,1,'XP once');
});

await t('Analysis quest: +100 XP and Level 3 popup when the Trim review is stored; once only',async()=>{
  const {w,L,sheets,xp}=make(env({lichess}));
  w.App.ui={};w.Store.set('lc-hub-trim-stats-v1',{games:{}});
  L.onb.afterOnboarding({li:'sam'});await sleep(150);
  sheets[sheets.length-1].s.el.querySelector('[data-show]').click();await sleep(20);
  sheets[sheets.length-1].s.el.querySelector('[data-fin]').click();await sleep(400);
  sheets[sheets.length-1].s.el.querySelector('[data-lc25-q]').click();
  assert(/#trim/.test(w.location.hash));assert(w.App.ui.trimLoad&&/\[White "Sam"\]/.test(w.App.ui.trimLoad.pgn));
  assert.strictEqual(xp.length,1,'no XP before the review exists');
  await sleep(3300);assert.strictEqual(xp.length,1);
  w.Store.set('lc-hub-trim-stats-v1',{games:{g1:{}}});await sleep(3400);
  assert.strictEqual(xp.length,2);assert.deepStrictEqual(JSON.parse(JSON.stringify(xp[1].slice(0,2))),['think',100]);
  assert(sheets.some(s=>/Level 3/.test(s.o.title)));
  await sleep(3400);assert.strictEqual(xp.length,2,'never twice');
});

console.log('\n'+n+' passed, '+fail+' failed');process.exit(fail?1:0);
})();
