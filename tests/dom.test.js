const assert=require('assert');const {make,Chess}=require('./harness');
let n=0,fail=0;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const t=async(name,fn)=>{try{await fn();n++;console.log('ok  ',name)}catch(e){fail++;console.log('FAIL',name,'\n     ',e.stack.split('\n').slice(0,3).join('\n      '))}};
const setHash=(dom,h)=>{dom.reconfigure({url:'https://lanckrietchess-app.vercel.app/'+h})};
const pgnLine='e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7 h3 h6 Nbd2 Be6'.split(' ');
const fens=(()=>{const g=new Chess,out=[g.fen()];pgnLine.forEach(m=>{g.move(m);out.push(g.fen())});return out})();

(async()=>{
/* ---------- Auto-Advance ---------- */
await t('Auto-Advance clicks a success-only Next button after the delay',async()=>{
  const {w,dom,L}=make();setHash(dom,'#puzzles');L.init();await sleep(1400);
  const v=w.document.querySelector('#view');let clicks=0;
  v.innerHTML='<h2 class="st-title">Fork</h2><p class="st-feedback">Correct, Nxe5 wins a piece.</p><button data-pzx="next">Next puzzle</button>';
  v.querySelector('[data-pzx="next"]').addEventListener('click',()=>clicks++);
  await sleep(300);assert(w.document.querySelector('#lc25-bar'),'bar mounted');
  await sleep(300);assert.strictEqual(clicks,0,'not before the delay');
  await sleep(1600);assert.strictEqual(clicks,1,'fired once');
  await sleep(1500);assert.strictEqual(clicks,1,'never twice on the same button');
});
await t('Auto-Advance OFF does nothing and the chip shows OFF',async()=>{
  const {w,dom,L}=make();setHash(dom,'#puzzles');L.init();await sleep(1400);
  w.document.querySelector('[data-lc25="auto"]').click();
  assert.strictEqual(L.auto.on(),false);
  assert(/OFF/.test(w.document.querySelector('#lc25-bar').textContent));
  const v=w.document.querySelector('#view');let clicks=0;
  v.insertAdjacentHTML('beforeend','<button data-pzx="next">Next puzzle</button>');v.querySelector('[data-pzx="next"]').addEventListener('click',()=>clicks++);
  await sleep(2400);assert.strictEqual(clicks,0);
});
await t('Auto-Advance never fires in Learn mode, on Shuffle, or for score/level buttons',async()=>{
  for(const [hash,html] of [['#openings','<span class="learn36">Learn mode</span><button data-act="next">Next line</button>'],['#shuffle','<button data-act="next">Next line</button>'],['#puzzles','<button data-vt="next">See my score</button>'],['#openings','<button data-act="next">Next level: Beginner</button>']]){
    const {w,dom,L}=make();setHash(dom,hash);L.init();await sleep(1400);
    const v=w.document.querySelector('#view');let clicks=0;v.insertAdjacentHTML('beforeend',html);v.querySelector('button').addEventListener('click',()=>clicks++);
    await sleep(2300);assert.strictEqual(clicks,0,hash+' '+html);
  }
});
await t('Auto-Advance does not fire while a sheet is open, and a click in the trainer cancels the countdown',async()=>{
  const {w,dom,L}=make();setHash(dom,'#puzzles');L.init();await sleep(1400);
  const v=w.document.querySelector('#view');let clicks=0;
  v.insertAdjacentHTML('beforeend','<div id="b">board</div><button data-pzx="next">Next puzzle</button>');v.querySelector('button').addEventListener('click',()=>clicks++);
  await sleep(300);assert(/coming up/.test(w.document.querySelector('#lc25-bar').textContent),'countdown visible');
  w.document.querySelector('#b').click();await sleep(1800);assert.strictEqual(clicks,0,'user touched the board: cancelled');
});
await t('"Stay here" cancels and the same button is never auto-clicked afterwards',async()=>{
  const {w,dom,L}=make();setHash(dom,'#puzzles');L.init();await sleep(1400);
  const v=w.document.querySelector('#view');let clicks=0;v.insertAdjacentHTML('beforeend','<button data-pzx="next">Next puzzle</button>');v.querySelector('button').addEventListener('click',()=>clicks++);
  await sleep(300);w.document.querySelector('[data-lc25="stay"]').click();await sleep(2600);assert.strictEqual(clicks,0);
});
await t('Analyze previous shows the last item after an auto-advance',async()=>{
  const {w,dom,L,sheets}=make();setHash(dom,'#puzzles');L.init();await sleep(1400);
  const v=w.document.querySelector('#view');
  v.innerHTML='<h2 class="st-title">Pin to the king</h2><p class="st-feedback">Correct: Bb5 pins the knight.</p><button data-pzx="next">Next puzzle</button>';
  await sleep(2100);
  const prev=w.document.querySelector('[data-lc25="prev"]');assert(prev,'button visible');
  prev.click();const sh=sheets[sheets.length-1];assert(/Previous position/.test(sh.o.title));
  assert(/Pin to the king/.test(sh.s.el.textContent)&&/Bb5 pins the knight/.test(sh.s.el.textContent));
});
await t('posFromDom rebuilds a position from chessboard.js squares',()=>{
  const {w,L}=make();const d=w.document.createElement('div');
  d.innerHTML='<div data-square="e1"><img data-piece="wK"></div><div data-square="e8"><img data-piece="bK"></div><div data-square="a2"><img data-piece="wP"></div><div data-square="h5"></div>';
  const pos=L._t.posFromDom(d);assert.deepStrictEqual(JSON.parse(JSON.stringify(pos)),{e1:'wK',e8:'bK',a2:'wP'});
  assert.strictEqual(L.logic.fenFromPosition(pos),'4k3/8/8/8/8/8/P7/4K3 w - - 0 1');
});

await t('Regression: a route that keeps touching the DOM cannot starve the bar (throttle, not debounce)',async()=>{
  const {w,dom,L}=make();setHash(dom,'#middlegame');L.init();await sleep(1400);
  const v=w.document.querySelector('#view');v.innerHTML='<div id="roadmap"></div>';
  let i=0;const iv=setInterval(()=>{const d=w.document.createElement('span');d.textContent=String(++i);w.document.querySelector('#roadmap').appendChild(d)},40);   // a mutation every 40ms, forever
  await sleep(900);clearInterval(iv);
  assert(w.document.querySelector('#lc25-bar'),'bar mounted despite constant mutations');
});

/* ---------- Flashcards ---------- */
await t('Flashcard opens on every 4th auto-advance in the opening trainer and holds the advance until answered',async()=>{
  const log=[];
  const {w,dom,L,sheets}=make(w=>{w.V36={srsHit(){log.push('hit')},srsMiss(){log.push('miss')}}});
  setHash(dom,'#openings');L.init();await sleep(1400);
  [1,2,3,4].forEach(i=>w.V36.srsHit({}, {san:'e4',color:'w',from:'e'+i,to:'e'+(i+1)}, fens[i]));
  assert.strictEqual(log.length,4,'original hook still runs');
  const v=w.document.querySelector('#view');let clicks=0;
  for(let i=1;i<=4;i++){
    v.innerHTML='<div class="st-title">Line '+i+'</div><button data-act="next">Next line</button>';
    v.querySelector('button').addEventListener('click',()=>clicks++);
    await sleep(i<4?1800:1700);
    if(i<4)assert.strictEqual(clicks,i,'advance '+i);
  }
  assert.strictEqual(clicks,3,'4th is held by a flashcard');
  const fc=sheets[sheets.length-1];assert(/Flashcard/.test(fc.o.title));
  const card=fc.s.el.querySelector('[data-lc25-fc]').__board;assert(card,'board mounted');
  card.opts.onMove({from:'a1',to:'a2'});assert(/Not that one/.test(fc.s.el.textContent));
  const right=L.flash.load().find(c=>c.fen===card.opts.fen);card.opts.onMove({from:right.from,to:right.to});
  assert(/Correct/.test(fc.s.el.textContent));
  fc.s.el.querySelector('[data-lc25-go]').click();await sleep(50);
  assert.strictEqual(clicks,4,'advance goes through after the flashcard');
});
await t('Flashcard reveals the answer after two misses',async()=>{
  const {w,dom,L,sheets}=make(w=>{w.V36={srsHit(){},srsMiss(){}}});setHash(dom,'#openings');L.init();
  [1,2,3].forEach(i=>w.V36.srsMiss({}, {san:'Nf3',color:'w',from:'g1',to:'f3'}, fens[i]));
  const done=[];L.flash.open(L.flash.load()[0],()=>done.push(1));
  const fc=sheets[sheets.length-1],b=fc.s.el.querySelector('[data-lc25-fc]').__board;
  b.opts.onMove({from:'a1',to:'a2'});b.opts.onMove({from:'a1',to:'a3'});
  assert(/It was/.test(fc.s.el.textContent)&&b.arrows.length===1);
  fc.s.close();assert.strictEqual(done.length,1,'continues exactly once');
});

/* ---------- Alternative answers ---------- */
const eng=(map)=>w=>{w.Engine={load:async()=>true,toCp:l=>l.cp,winPct:cp=>50+50*(2/(1+Math.exp(-.00368208*Math.max(-1500,Math.min(1500,cp))))-1),
  uciToSan:(fen,u)=>{try{const g=new Chess(fen);const m=g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||'q'});return m?m.san:null}catch(e){return null}},
  analyse:async(fen,o)=>{const r=map[fen];if(!r)throw new Error('no stub for '+fen);return{fen,lines:r,best:r[0].pv[0]}}}};
await t('alt.check: another mating move is "full" and lists the other winning moves',async()=>{
  const fen='6k1/5ppp/8/8/8/8/5PPP/R3R1K1 w - - 0 1';
  const after=(()=>{const g=new Chess(fen);g.move('Ra8+');return g.fen()})();
  const {L}=make(eng({[fen]:[{cp:99999,mate:1,pv:['e1e8']},{cp:99999,mate:1,pv:['a1a8']}],[after]:[{cp:-99999,mate:-0,pv:[]}]}));
  const r=await L.alt.check({fen,from:'a1',to:'a8',san:'Ra8#'});
  assert.strictEqual(r.tier,'full',JSON.stringify(r));assert(/Ra8/.test(r.text)||/also forces mate/.test(r.text));
});
await t('alt.check: a quiet move that throws the win away is rejected',async()=>{
  const fen='6k1/5ppp/8/8/8/8/5PPP/R3R1K1 w - - 0 1';const g=new Chess(fen);g.move('h3');const after=g.fen();
  const {L}=make(eng({[fen]:[{cp:99999,mate:1,pv:['e1e8']},{cp:99999,mate:1,pv:['a1a8']}],[after]:[{cp:-20,mate:null,pv:['g8f8']}]}));
  const r=await L.alt.check({fen,from:'h2',to:'h3',san:'h3'});assert.strictEqual(r.tier,'no');
});
await t('alt.check: slightly worse winning move is "mostly"',async()=>{
  const fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';const g=new Chess(fen);g.move('e4');const after=g.fen();
  const {L}=make(eng({[fen]:[{cp:300,mate:null,pv:['d2d4']}],[after]:[{cp:215,mate:null,pv:['e7e5']}]}));
  const r=await L.alt.check({fen,from:'e2',to:'e4',san:'e4'});assert(['mostly','full'].includes(r.tier),r.tier);
});
await t('alt.check: a played move found in the multipv list does not need a second search',async()=>{
  const fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';let calls=0;
  const {L}=make(w=>{eng({[fen]:[{cp:100,mate:null,pv:['e2e4']},{cp:98,mate:null,pv:['d2d4']}]})(w);const a=w.Engine.analyse;w.Engine.analyse=async(...x)=>{calls++;return a(...x)}});
  const r=await L.alt.check({fen,from:'d2',to:'d4',san:'d4'});assert.strictEqual(r.tier,'full');assert.strictEqual(calls,1);
});
await t('alt.check returns null when the engine is unavailable (the original wrong-move path then runs)',async()=>{
  const {L}=make(w=>{w.Engine={load:async()=>false}});assert.strictEqual(await L.alt.check({fen:fens[0],from:'e2',to:'e4',san:'e4'}),null);
});
await t('alt.wants respects sections and the settings switch',()=>{
  const {w,L}=make(eng({}));assert.strictEqual(L.alt.wants('endgame',null),true);assert.strictEqual(L.alt.wants('openings',null),false);
  w.Store.set('lc25-flex',false);assert.strictEqual(L.alt.wants('endgame',null),false);
  assert.strictEqual(L.alt.wants('think',{engineAlt:false}),false);
});

/* ---------- Penalty Box ---------- */
await t('Penalty Box: modal text, 5 puzzles, WhatsApp share, cooldown marker',async()=>{
  const sols=[];
  const mk=i=>{const g=new Chess('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1');return{id:'p'+i,fen:g.fen(),solution:['a1a8']}};
  const {w,L,sheets,store}=make(w=>{let i=0;w.PuzzleFeed={next:async()=>mk(++i)};w.Engine={uciToSan:()=> 'Ra8#'}});
  assert.strictEqual(L.tilt.offer({tilted:true}),true);
  const m=sheets[sheets.length-1];assert(/dropped 3 games in a row/.test(m.s.el.textContent)&&/5 quick focus puzzles/.test(m.s.el.textContent));
  m.s.el.querySelector('[data-pb="go"]').click();assert(store['lc19-tilt-at'],'LC19 banner cooldown set');
  for(let k=1;k<=5;k++){
    await sleep(60);const host=m.s.el.querySelector('[data-pbb]');assert(host,'puzzle '+k);
    const b=host.__board;
    if(k===3){b.opts.onMove({from:'a1',to:'a2'});b.opts.onMove({from:'a1',to:'a3'});await sleep(1900);continue}   // fail puzzle 3
    b.opts.onMove({from:'a1',to:'a8'});await sleep(1000);
  }
  await sleep(100);const txt=m.s.el.textContent;assert(/4 of 5/.test(txt),txt.slice(0,200));
  const wa=m.s.el.querySelector('a[href^="https://wa.me/"]');assert(wa,'whatsapp link');assert(/ref%3Dsam123/.test(wa.href));
  const inner=decodeURIComponent(wa.href.split('text=')[1]).match(/https:\/\/\S+/)[0];       // what WhatsApp hands to the friend's browser
  assert.deepStrictEqual(JSON.parse(JSON.stringify(L.logic.parseChallenge(new URL(inner).search))),{kind:'pb',val:'4'});
  assert.strictEqual(L.logic.refOf(inner),'sam123');
});
await t('Penalty Box falls back to the old banner when it cannot run',()=>{
  const {L}=make();assert.strictEqual(L.tilt.offer({tilted:true}),false);   // no PuzzleFeed in this window
});
await t('Penalty Box "Analyze those games" goes to My Mistakes, "I\u2019m fine" just closes',()=>{
  const {w,dom,L,sheets}=make(w=>{w.PuzzleFeed={next:async()=>null}});
  L.tilt.offer({tilted:true});let m=sheets[sheets.length-1];m.s.el.querySelector('[data-pb="review"]').click();assert(/#my-mistakes/.test(w.location.hash));
  L.tilt.offer({tilted:true});m=sheets[sheets.length-1];m.s.el.querySelector('[data-pb="no"]').click();assert(m.s.closed);
});

/* ---------- Ghost rival ---------- */
await t('Ghost: created for a brand-new account, claims exactly once when the goal is reached',async()=>{
  const {w,dom,L,sheets}=make();setHash(dom,'#home');w.__total=0;L.init();await sleep(1400);
  const st=w.Store.get('lc25-ghost',null);assert(st&&st.goal===600&&st.base===0);
  assert(w.document.querySelector('[data-lc25-ghost]'),'card on the home route');
  const html=w.document.querySelector('[data-lc25-ghost]').outerHTML;assert(/Lanckriet-student ghost/.test(html)&&/skool\.com\/lanckriet-chess-1924/.test(html)&&/wa\.me/.test(html));
  w.__total=650;await L.ghost.tick();await L.ghost.tick();
  assert.strictEqual((w.__rpc||[]).filter(r=>r[0]==='lc25_ghost_claim').length,1);
  assert.strictEqual(sheets.filter(s=>/Ghost Slayer/.test(s.o.title)).length,1);
});
await t('Ghost: not created for an existing account or an admin',()=>{
  let r=make();r.w.__total=5000;r.L.ghost.init();assert.strictEqual(r.w.Store.get('lc25-ghost',null).off,true);
  r=make();r.w.__total=0;r.w.Admin.active=true;r.L.ghost.init();assert.strictEqual(r.w.Store.get('lc25-ghost',null).off,true);
});
await t('Ghost: after the week the card says the ghost won and no claim is made',async()=>{
  const {w,L}=make();w.__total=0;L.ghost.init();const st=w.Store.get('lc25-ghost',null);st.t0=Date.now()-9*864e5;w.Store.set('lc25-ghost',st);w.__total=900;
  await L.ghost.tick();assert.strictEqual((w.__rpc||[]).length,0);assert(/The ghost won this week/.test(L.ghost.html()));
});

/* ---------- Rival link + ghost goal are admin settings ---------- */
const COMM='https://www.skool.com/lanckriet-chess-1924';
const withCfg=cfg=>w=>{w.CONFIG=cfg;w.skoolCanon=u=>u};
await t('Rival link: default is the Skool community (setting missing, empty, or only the default value)',()=>{
  for(const cfg of [{},{links:{}},{links:{rival:'',skool:COMM}},{links:{rival:COMM,skool:COMM}}]){const {L}=make(withCfg(cfg));assert.strictEqual(L.share.rivalUrl(),COMM,JSON.stringify(cfg))}
  assert.strictEqual(make().L.share.rivalUrl(),COMM,'no CONFIG at all');
});
await t('Rival link: an admin-set channel link wins, and reaches the ghost card button',()=>{
  const chan=COMM+'?c=looking-for-a-rival';const {w,L}=make(withCfg({links:{rival:chan,skool:COMM}}));
  assert.strictEqual(L.share.rivalUrl(),chan);w.__total=0;L.ghost.init();assert(L.ghost.html().includes(chan.replace(/&/g,'&amp;')),'card uses the channel link');
  assert(/target="_blank" rel="noopener noreferrer" href="[^"]*skool\.com/.test(L.ghost.html()),'opens in a new tab safely');
});
await t('Rival link: junk values (javascript:, http:, spaces, too short) fall back instead of breaking the button',()=>{
  for(const bad of ['javascript:alert(1)','http://insecure.example/x','https://a b','https://','data:text/html,x','   ']){
    const {L}=make(withCfg({links:{rival:bad,skool:COMM}}));assert.strictEqual(L.share.rivalUrl(),COMM,bad);
  }
  assert.strictEqual(make(withCfg({links:{rival:'javascript:1',skool:'also bad'}})).L.share.rivalUrl(),COMM);
});
await t('Ghost goal: admin value is used for new members; bad values fall back to 600; existing ghosts keep their goal',()=>{
  let r=make(withCfg({v25:{ghostGoal:900}}));r.w.__total=0;r.L.ghost.init();assert.strictEqual(r.w.Store.get('lc25-ghost',null).goal,900);
  r.w.CONFIG.v25.ghostGoal=300;r.L.ghost.init();assert.strictEqual(r.w.Store.get('lc25-ghost',null).goal,900,'mid-week changes do not move the goal');
  for(const g of [null,'',0,50,99999,'abc']){r=make(withCfg({v25:{ghostGoal:g}}));r.w.__total=0;r.L.ghost.init();assert.strictEqual(r.w.Store.get('lc25-ghost',null).goal,600,String(g))}
});

/* ---------- MSPC notes (Pillar 2) ---------- */
const NOTE={m:'Their e4 grabs space in the centre. No direct threat.',s:'Move 1, opening. A quiet position.',p:'No checks. No captures. Your c6 is a quiet pawn move.',c:'Expect d4. After c6 it is about equal.',w:'Pawn to c6: it gains space.',r:'Every pawn move changes the structure for good.'};
const FEN1='rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',KEY1='rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq|c6';
const notesFetch=(payload,ok=true,log)=>w=>{w.fetchWithTimeout=async(u)=>{(log||[]).push(String(u));return{ok,json:async()=>payload}}};
await t('Notes: key ignores ep square, counters and annotations (transpositions match)',()=>{
  const {L}=make();const k=L.notes.key;
  assert.strictEqual(k(FEN1,'c6'),KEY1);assert.strictEqual(k(FEN1.replace(' e3 0 1',' - 4 9'),'c6+'),KEY1);assert.strictEqual(k(FEN1,'c6?!'),KEY1);
  const a=new Chess();['Nf3','Nf6','c4'].forEach(m=>a.move(m));const b=new Chess();['c4','Nf6','Nf3'].forEach(m=>b.move(m));
  assert.strictEqual(k(a.fen(),'g6'),k(b.fen(),'g6'));
});
await t('Notes: URL is the sibling of the course file (named json, content.json, with or without a query), or the admin override',async()=>{
  const u=raw=>make(w=>{w.Feed={rawUrl:()=>raw}}).L.notes.url();
  assert.strictEqual(u('https://raw.githubusercontent.com/lanckrietchess/Json-van-app/main/json'),'https://raw.githubusercontent.com/lanckrietchess/Json-van-app/main/mspc-notes.json');
  assert.strictEqual(u('https://raw.githubusercontent.com/lanckrietchess/Json-van-app/main/content.json?t=123'),'https://raw.githubusercontent.com/lanckrietchess/Json-van-app/main/mspc-notes.json');
  assert.strictEqual(u(''),'https://raw.githubusercontent.com/lanckrietchess/Json-van-app/main/mspc-notes.json','no Feed value: the default repo');
  assert.strictEqual(u('http://insecure/x/json'),'https://raw.githubusercontent.com/lanckrietchess/Json-van-app/main/mspc-notes.json','non-https raw url is ignored');
  const own=make(w=>{w.CONFIG={v25:{notesUrl:'https://example.org/notes/mspc-notes.json'}};w.Feed={rawUrl:()=>'https://x/y/json'}}).L.notes.url();assert.strictEqual(own,'https://example.org/notes/mspc-notes.json');
  assert(/mspc-notes\.json$/.test(make(w=>{w.CONFIG={v25:{notesUrl:'javascript:alert(1)'}}}).L.notes.url()),'a junk override is ignored');
});
await t('Notes: loads once from the sibling file and serves lookups',async()=>{
  const log=[];const {L}=make(w=>{notesFetch({version:1,notes:{[KEY1]:NOTE}},true,log)(w);w.Feed={rawUrl:()=>'https://raw.githubusercontent.com/lanckrietchess/Json-van-app/main/json'}});
  assert.strictEqual(L.notes.get(FEN1,'c6'),null,'not loaded yet: no note, no throw');
  await sleep(30);assert.strictEqual(log.length,1);assert.strictEqual(log[0],'https://raw.githubusercontent.com/lanckrietchess/Json-van-app/main/mspc-notes.json');
  assert.strictEqual(L.notes.get(FEN1,'c6').w,NOTE.w);await L.notes.ensure();assert.strictEqual(log.length,1,'one fetch only');
});
await t('Notes: bad data is rejected and a failure is retried at most every 5 minutes',async()=>{
  for(const bad of [{},{notes:[]},{notes:'x'},null]){const {L}=make(notesFetch(bad));await L.notes.ensure();assert.strictEqual(L.notes.map,null,JSON.stringify(bad));assert.strictEqual(L.notes.get(FEN1,'c6'),null)}
  const log=[];const r=make(notesFetch({},false,log));await r.L.notes.ensure();await r.L.notes.ensure();await sleep(20);r.L.notes.get(FEN1,'c6');await sleep(20);assert.strictEqual(log.length,1,'no retry storm');
  const net=make(w=>{w.fetchWithTimeout=async()=>{throw new Error('offline')}});await net.L.notes.ensure();assert.strictEqual(net.L.notes.map,null);
});
await t('Notes: attach does not mutate the feedback, respects the switch, ignores unknown positions',async()=>{
  const {w,L}=make(notesFetch({notes:{[KEY1]:NOTE}}));await L.notes.ensure();
  const fb=Object.freeze({v:'hint',label:'Learn mode',text:'Play the arrow'});
  const x=L.notes.attach(fb,FEN1,'c6',true);assert.notStrictEqual(x,fb);assert.strictEqual(x.mspc.w,NOTE.w);assert.strictEqual(x.mspcOpen,true);assert.strictEqual(fb.mspc,undefined);
  assert.strictEqual(L.notes.attach(fb,FEN1,'d5',true),fb,'unknown move: same object back');
  assert.strictEqual(L.notes.attach(null,FEN1,'c6'),null);assert.strictEqual(L.notes.attach('x',FEN1,'c6'),'x');
  w.Store.set('lc25-notes',false);assert.strictEqual(L.notes.attach(fb,FEN1,'c6',true),fb,'switched off');
});
await t('Notes: html escapes everything, uses one <p> per line (so the coach voice reads it) and honours open/closed',()=>{
  const {L,w}=make();const evil={...NOTE,w:'<img src=x onerror=alert(1)>',m:'a & b "q"'};
  const h=L.notes.html(evil,true);assert(!/<img/.test(h)&&/&lt;img/.test(h)&&/a &amp; b &quot;q&quot;/.test(h));
  const d=w.document.createElement('div');d.innerHTML=h;const det=d.querySelector('details.mspc25');assert(det&&det.hasAttribute('open'));
  assert.strictEqual(d.querySelectorAll('p').length,5,'why + move + specifics + priorities + calculation');
  assert.deepStrictEqual([...d.querySelectorAll('.mspc25-row b')].map(b=>b.textContent),['Move.','Specifics.','Priorities.','Calculation.']);
  assert(!w.document.createElement('div').appendChild(w.document.createElement('div')).innerHTML&&!/ open/.test(L.notes.html(NOTE,false).split('>')[0]),'closed by default for drills');
  assert.strictEqual(L.notes.html(null),'');assert.strictEqual(L.notes.html({w:'only why'},false).includes('Move.'),false);
});
await t('Notes: Learn mode wrapper adds the note to every feedback update, leaves the original behaviour alone',async()=>{
  const seen=[];let origCalls=0;
  const {w,L}=make(w=>{notesFetch({notes:{[KEY1]:NOTE}})(w);w.V36={learnStep(board,fen,p,n,update){origCalls++;update({v:'hint',label:'Learn mode',text:'first'});setTimeout(()=>update({v:'hint',label:'Learn mode',text:'engine says'}),10);return 'orig-return'},srsHit(){},srsMiss(){}}});
  L.init();await L.notes.ensure();
  const ret=w.V36.learnStep({}, FEN1,{san:'c6',color:'b',num:1,from:'c7',to:'c6'},{note:'x'},fb=>seen.push(fb));
  await sleep(40);assert.strictEqual(ret,'orig-return');assert.strictEqual(origCalls,1);assert.strictEqual(seen.length,2);
  assert(seen.every(fb=>fb.mspc&&fb.mspc.w===NOTE.w&&fb.mspcOpen===true),'both updates carry the note, open');assert.deepStrictEqual([seen[0].text,seen[1].text],['first','engine says']);
  const un=[];w.V36.learnStep({}, FEN1.replace('b KQkq','w KQkq'),{san:'d4'},null,fb=>un.push(fb));await sleep(30);assert(un.every(fb=>!fb.mspc),'no note for an unknown position');
  const r2=make(w=>{w.V36={learnStep(board,fen,p,n,update){return typeof update},srsHit(){},srsMiss(){}}});r2.L.init();
  assert.strictEqual(r2.w.V36.learnStep({},FEN1,{san:'c6'},null,undefined),'undefined','a missing callback is passed through untouched');
});

/* ---------- Notes offline cache + Ghost Slayer badge ---------- */
const cacheStub=()=>{const store=new Map();return{store,caches:{open:async()=>({put:async(k,r)=>{store.set(k,await r.json())},match:async k=>store.has(k)?{json:async()=>JSON.parse(JSON.stringify(store.get(k)))}:undefined})},Response:class{constructor(b){this.b=b}async json(){return JSON.parse(this.b)}}}};
await t('Notes offline: a successful load is saved, and the saved copy serves notes when the network is gone',async()=>{
  const c=cacheStub();const first=make(w=>{notesFetch({version:1,notes:{[KEY1]:NOTE}})(w);w.caches=c.caches;w.Response=c.Response});
  await first.L.notes.ensure();await sleep(20);assert(c.store.size===1&&[...c.store.values()][0].notes[KEY1].w===NOTE.w,'saved');
  const off=make(w=>{w.fetchWithTimeout=async()=>{throw new Error('offline')};w.caches=c.caches;w.Response=c.Response});
  await off.L.notes.ensure();assert.strictEqual(off.L.notes.get(FEN1,'c6').w,NOTE.w,'served from the saved copy');
});
await t('Notes offline: the saved copy is available at once, before a slow network answers; a newer copy replaces it',async()=>{
  const c=cacheStub();c.store.set('https://lc-notes.invalid/mspc-notes.json',{notes:{[KEY1]:{...NOTE,w:'OLD'}}});
  let release;const gate=new Promise(r=>{release=r});
  const {L}=make(w=>{w.caches=c.caches;w.Response=c.Response;w.fetchWithTimeout=async()=>{await gate;return{ok:true,json:async()=>({notes:{[KEY1]:{...NOTE,w:'NEW'}}})}}});
  const p=L.notes.ensure();await sleep(30);assert.strictEqual(L.notes.get(FEN1,'c6').w,'OLD','instant from the saved copy');
  release();await p;await sleep(20);assert.strictEqual(L.notes.get(FEN1,'c6').w,'NEW','refreshed in the background');assert.strictEqual([...c.store.values()][0].notes[KEY1].w,'NEW','and saved again');
});
await t('Notes offline: a corrupt saved copy is ignored, a missing Cache API is fine',async()=>{
  const c=cacheStub();c.store.set('https://lc-notes.invalid/mspc-notes.json',{notes:[1,2,3]});
  const a=make(w=>{w.fetchWithTimeout=async()=>{throw new Error('offline')};w.caches=c.caches;w.Response=c.Response});await a.L.notes.ensure();assert.strictEqual(a.L.notes.map,null);
  const b=make(w=>{notesFetch({notes:{[KEY1]:NOTE}})(w);delete w.caches});await b.L.notes.ensure();assert.strictEqual(b.L.notes.get(FEN1,'c6').w,NOTE.w,'works without caches');
  const d=make(w=>{notesFetch({notes:{[KEY1]:NOTE}})(w);w.caches={open:async()=>{throw new Error('quota')}};w.Response=c.Response});await d.L.notes.ensure();assert.strictEqual(d.L.notes.get(FEN1,'c6').w,NOTE.w,'a failing cache never breaks loading');
});
const badgeEnv=extra=>w=>{w.SysBadges={LIST:[{id:'test'},{id:'og'}]};w.fmtDate=d=>'14 Oct 2026';w.V71=Object.assign({me:()=>({badges:[]}),member:async()=>({ok:true})},extra||{})};
await t('Ghost Slayer: joins the status badges once, only counts when earned, remembers the date',()=>{
  const {w,L}=make(badgeEnv());L.init();L.init();
  const list=w.SysBadges.LIST;assert.strictEqual(list.filter(b=>b.id==='ghost').length,1);const b=list.find(x=>x.id==='ghost');
  assert.strictEqual(b.got(),0,'not earned yet');w.__total=0;L.ghost.init();assert.strictEqual(b.got(),0,'a started ghost race is not a badge');
  w.Store.set('lc25-ghost',{...w.Store.get('lc25-ghost',{}),won:true,wonAt:Date.UTC(2026,9,14)});
  assert.strictEqual(b.got(),Date.UTC(2026,9,14));assert(/14 Oct 2026/.test(b.note())&&/Ghost Slayer/.test(b.name));
});
await t('Ghost Slayer: also earned when only the server knows (new phone, cleared storage)',()=>{
  const {w,L}=make(badgeEnv({me:()=>({badges:[{code:'ref_5'},{code:'ghost_slayer',awarded_at:'2026-10-12T08:00:00Z'}]})}));L.init();
  const b=w.SysBadges.LIST.find(x=>x.id==='ghost');assert.strictEqual(b.got(),Date.UTC(2026,9,12,8));
  const r2=make(badgeEnv({me:()=>({badges:[{code:'ghost_slayer'}]})}));r2.L.init();assert.strictEqual(r2.w.SysBadges.LIST.find(x=>x.id==='ghost').got(),1,'no date: still earned');
  const r3=make(badgeEnv({me:()=>{throw new Error('offline')}}));r3.L.init();assert.strictEqual(r3.w.SysBadges.LIST.find(x=>x.id==='ghost').got(),0,'no server, no badge, no crash');
});

/* ---------- Long texts: fold + short-text overlay ---------- */
const LONG=('Before every move, find out what your opponent\u2019s last move did. '+'Then check what your own move allows. '+'Most games at this level end with one unforced error: a piece left where it could be taken. '+'This chapter makes the check automatic, so the rest of the course has a safe floor to stand on. '+'Practise it on every move for a week and it becomes a habit that stays with you for years to come, whatever the opening is.');
await t('Fold: sentence splitting survives move numbers, abbreviations, newlines and annotations',()=>{
  const {L}=make();const S=L.fold.sentences;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(S('Play 2. Nf3 Nc6 and then 3. Bb5. Now the pin works.'))),['Play 2. Nf3 Nc6 and then 3. Bb5.','Now the pin works.']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(S('Use e.g. Nf3 here. Then d4.'))),['Use e.g. Nf3 here.','Then d4.']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(S('Line one.\n- Bullet two.\n- Bullet three.'))),['Line one.','- Bullet two.','- Bullet three.']);
  assert.strictEqual(S('1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4.').length,1);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(S('Wait! Really? Yes.'))),['Wait!','Really?','Yes.']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(S('You play Nxe5!? Black answers ...c6.'))),['You play Nxe5!?','Black answers ...c6.']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(S(''))),[]);
});
await t('Fold: short texts and tiny leftovers are never folded; long ones get at most 3 sentences within the limit',()=>{
  const {L}=make();const F=L.fold.parts;
  assert.strictEqual(F('Short note.',280),null);assert.strictEqual(F(LONG,0),null);
  const f=F(LONG,280);assert(f&&f.head.length<=280&&L.fold.sentences(f.head).length<=3&&f.full===LONG.replace(/\s+/g,' ').trim(),JSON.stringify(f));
  assert(LONG.startsWith(f.head.slice(0,40)),'the head is the real opening');
  const tiny='A'.repeat(0)+'First sentence is here and it is rather long indeed, about this long. '.repeat(1)+'Second one fills the space to almost the whole limit of the text, yes it does, really. '.repeat(1)+'Tail.';
  assert.strictEqual(F(tiny,tiny.length-3),null,'a few words left over: not worth a button');const big=F(tiny,tiny.length-3+0);assert.strictEqual(big,null);assert(F(tiny,100)&&F(tiny,100).head.length<=100,'with a tighter limit the leftover is large, so it folds');
  const one='word '.repeat(200).trim()+'.';const o=F(one,280);assert(o&&/\u2026$/.test(o.head)&&o.head.length<=281&&!/\s\u2026$/.test(o.head),'one endless sentence is cut at a word boundary: '+(o&&o.head.length));
});
await t('Fold: paragraph output is plain when short, a wrapper with a Read more button when long, and always escaped',()=>{
  const {w,L}=make();
  assert.strictEqual(L.fold.p('Nice move.'),'<p>Nice move.</p>');assert.strictEqual(L.fold.p('Nice <b>move</b>.','muted'),'<p class="muted">Nice &lt;b&gt;move&lt;/b&gt;.</p>');assert.strictEqual(L.fold.p(null),'<p></p>');
  const d=w.document.createElement('div');d.innerHTML=L.fold.p(LONG+' <img src=x onerror=alert(1)>');
  assert(d.querySelector('.fold25w p')&&d.querySelector('button[data-fold25]')&&!d.querySelector('img'),'structure, and no injected element');
  const b=d.querySelector('button');assert.strictEqual(b.getAttribute('data-full'),(LONG+' <img src=x onerror=alert(1)>'),'the full original is kept byte for byte');
  assert.strictEqual(d.querySelector('p').textContent,b.getAttribute('data-short'));assert(d.querySelector('p').textContent.length<LONG.length);
  assert.strictEqual(b.textContent,'Read more');assert.strictEqual(b.getAttribute('aria-expanded'),'false');
});
await t('Fold: switches (storage, admin setting) and the threshold',()=>{
  const a=make();a.w.Store.set('lc25-fold',false);assert(!/fold25/.test(a.L.fold.p(LONG)),'off by the member switch');
  assert(!/fold25/.test(make(w=>{w.CONFIG={v25:{foldChars:0}}}).L.fold.p(LONG)),'0 = never');
  assert(/fold25/.test(make(w=>{w.CONFIG={v25:{foldChars:150}}}).L.fold.p(LONG)),'a lower limit folds sooner');
  assert(!/fold25/.test(make(w=>{w.CONFIG={v25:{foldChars:2000}}}).L.fold.p(LONG)),'a higher limit folds later');
  assert(/fold25/.test(make(w=>{w.CONFIG={v25:{foldChars:'abc'}}}).L.fold.p(LONG)),'junk falls back to 280');assert(/fold25/.test(make(w=>{w.CONFIG={v25:{foldChars:5}}}).L.fold.p(LONG)),'out of range falls back to 280');
});
await t('Fold: Read more expands to the full text and Show less returns, through a real click',async()=>{
  const {w,dom,L}=make();setHash(dom,'#home');L.init();await sleep(1400);
  const v=w.document.querySelector('#view');v.innerHTML=L.fold.p(LONG);
  const b=v.querySelector('[data-fold25]'),p=v.querySelector('p');const head=p.textContent;
  b.click();assert.strictEqual(p.textContent,LONG);assert.strictEqual(b.textContent,'Show less');assert.strictEqual(b.getAttribute('aria-expanded'),'true');
  b.click();assert.strictEqual(p.textContent,head);assert.strictEqual(b.textContent,'Read more');
});
await t('Fold: FNV-1a hash matches the published test vectors, and the key ignores whitespace',()=>{
  const {L}=make();assert.strictEqual(L.fold.hash(''),'811c9dc5');assert.strictEqual(L.fold.hash('a'),'e40c292c');assert.strictEqual(L.fold.hash('foobar'),'bf9cf968');
  assert.strictEqual(L.fold.key('a  b\n c'),L.fold.key(' a b c '));assert.notStrictEqual(L.fold.key('a b c'),L.fold.key('a b d'));assert(/^[0-9a-f]{8}:\d+$/.test(L.fold.key('x')));
});
await t('Short texts: loaded from the sibling file, used only for the exact original, labelled, and never longer than the original',async()=>{
  const SHORT='Check their last move, then check yours. One unforced error ends most games.';
  const log=[];const k=make(w=>{w.Feed={rawUrl:()=>'https://raw.githubusercontent.com/lanckrietchess/Json-van-app/main/json'};w.fetchWithTimeout=async u=>{log.push(String(u));return{ok:true,json:async()=>({texts:{}})}}});
  await k.L.fold.short.ensure();assert.strictEqual(log[0],'https://raw.githubusercontent.com/lanckrietchess/Json-van-app/main/short-texts.json');
  const {w,L}=make(w=>{w.Feed={rawUrl:()=>'https://x/y/json'}});
  const key=L.fold.key(LONG);L.fold.short.map={[key]:SHORT,[L.fold.key('other text '+LONG)]:'x'.repeat(5000)};L.fold.short.fresh=true;
  const d=w.document.createElement('div');d.innerHTML=L.fold.p(LONG);
  assert.strictEqual(d.querySelector('p').textContent,SHORT);const b=d.querySelector('button');assert.strictEqual(b.textContent,'Show full text');assert.strictEqual(b.getAttribute('data-full'),LONG,'the original stays one click away');
  const edited=LONG.replace('Practise','Practice');d.innerHTML=L.fold.p(edited);assert.notStrictEqual(d.querySelector('p').textContent,SHORT,'an edited original retires its old rewrite');assert(/Read more/.test(d.innerHTML),'falls back to the plain fold');
  d.innerHTML=L.fold.p('other text '+LONG);assert(!/xxxx/.test(d.innerHTML),'a "short" that is longer than the original is ignored');
  const tiny='A short note under the limit.';L.fold.short.map[L.fold.key(tiny)]='Short.';assert.strictEqual(L.fold.p(tiny),'<p>A short note under the limit.</p>','texts under the limit are never replaced');
  const own=make(w=>{w.CONFIG={v25:{shortTextsUrl:'https://example.org/s.json'}}}).L.fold.short.url();assert.strictEqual(own,'https://example.org/s.json');
  assert(/short-texts\.json$/.test(make(w=>{w.CONFIG={v25:{shortTextsUrl:'javascript:1'}}}).L.fold.short.url()));
});

/* ---------- Tilt check from the public game APIs (members without Auto-Sync) ---------- */
const NOW=Date.now(),MIN=60e3;
const liGame=(id,color,winner,minsAgo,extra)=>JSON.stringify(Object.assign({id,variant:'standard',status:winner?'mate':'draw',createdAt:NOW-(minsAgo+8)*MIN,lastMoveAt:NOW-minsAgo*MIN,players:{white:{user:{name:color==='white'?'Kyenzo':'Opp',id:color==='white'?'kyenzo':'opp'}},black:{user:{name:color==='black'?'Kyenzo':'Opp',id:color==='black'?'kyenzo':'opp'}}}},winner?{winner}:{},extra||{}));
const ccGame=(id,color,res,minsAgo,extra)=>Object.assign({uuid:id,rules:'chess',end_time:Math.floor((NOW-minsAgo*MIN)/1000),white:{username:color==='white'?'Kyenzo':'Opp',result:color==='white'?res:'win'},black:{username:color==='black'?'Kyenzo':'Opp',result:color==='black'?res:'win'}},extra||{});
await t('Tilt rows: Lichess ndjson becomes win/loss/draw for the user, skips aborted games, other variants and junk lines',()=>{
  const {L}=make();
  const nd=[liGame('a','white','black',5),liGame('b','black','white',20),liGame('c','white',null,40),liGame('d','white','white',60),liGame('e','white','black',70,{status:'aborted'}),liGame('f','white','black',80,{variant:'chess960'}),'not json','',liGame('g','black','white',100,{players:{white:{user:{name:'X',id:'x'}},black:{user:{name:'Y',id:'y'}}}})].join('\n');
  const r=JSON.parse(JSON.stringify(L.logic.lichessRows(nd,'KYENZO')));
  assert.deepStrictEqual(r.map(x=>[x.gid,x.result]),[['a','loss'],['b','loss'],['c','draw'],['d','win']]);assert(r.every(x=>x.t>0));
  assert.strictEqual(L.logic.lichessRows(nd,'').length,0);assert.strictEqual(L.logic.lichessRows(undefined,'x').length,0);
});
await t('Tilt rows: Chess.com month archive maps every result code correctly',()=>{
  const {L}=make();const res={win:'win',checkmated:'loss',resigned:'loss',timeout:'loss',abandoned:'loss',lose:'loss',agreed:'draw',repetition:'draw',stalemate:'draw',insufficient:'draw','50move':'draw',timevsinsufficient:'draw'};
  const games=Object.keys(res).map((r,i)=>ccGame('g'+i,i%2?'black':'white',r,10+i));
  games.push(ccGame('v','white','win',5,{rules:'chess960'}));games.push(ccGame('o','white','win',6,{white:{username:'A',result:'win'},black:{username:'B',result:'resigned'}}));games.push({uuid:'bad'});games.push(ccGame('nt','white','win',7,{end_time:0}));
  const r=L.logic.chesscomRows({games},'kyenzo');
  assert.strictEqual(r.length,Object.keys(res).length);Object.keys(res).forEach((k,i)=>assert.strictEqual(r[i].result,res[k],k));
  assert.strictEqual(L.logic.chesscomRows(null,'x').length,0);
});
await t('Tilt rule: 3 losses in a row, close together and recent; draws, wins, gaps and old streaks do not count',()=>{
  const {L}=make();const R=(a,b)=>L.logic.tiltRule(a,NOW,b);const g=(mins,res)=>({gid:'g'+mins,t:NOW-mins*MIN,result:res});
  assert.strictEqual(R([g(5,'loss'),g(30,'loss'),g(60,'loss')]).tilted,true);
  assert.strictEqual(R([g(60,'loss'),g(5,'loss'),g(30,'loss')]).tilted,true,'order of input does not matter');
  assert.strictEqual(R([g(5,'loss'),g(30,'draw'),g(60,'loss')]).tilted,false);assert.strictEqual(R([g(5,'win'),g(30,'loss'),g(60,'loss'),g(90,'loss')]).tilted,false,'the newest game was a win');
  assert.strictEqual(R([g(5,'loss'),g(30,'loss')]).tilted,false,'only two games');
  assert.strictEqual(R([g(5,'loss'),g(100,'loss'),g(200,'loss')]).tilted,false,'spread over more than 3 hours');
  assert.strictEqual(R([g(250,'loss'),g(270,'loss'),g(280,'loss')]).tilted,false,'an old streak is old news');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(R([g(5,'loss'),g(30,'loss'),g(60,'loss'),g(90,'win')]).gids)),['g5','g30','g60']);
  assert.strictEqual(R([g(5,'loss'),g(30,'loss'),g(60,'loss')],{losses:4,windowMs:3*3600e3}).tilted,false);
});
const tiltEnv=(o={})=>w=>{
  w.App.profile=Object.assign({name:'Sam'},o.profile||{});w.App.settings=o.settings||{};w.App.save=()=>{w.__saved=(w.__saved||0)+1};
  w.PuzzleFeed={next:async()=>null};w.LC19={CFG:{tilt:{losses:3,windowMs:3*3600e3,cooldownMs:6*3600e3}}};
  w.__urls=[];
  w.fetchWithTimeout=async(u,init)=>{w.__urls.push([String(u),init&&init.headers&&init.headers.Accept]);
    if(o.fail)throw new Error('offline');
    if(/lichess\.org\/api\/games\/user/.test(u))return{ok:true,text:async()=>o.li||''};
    if(/games\/archives$/.test(u))return{ok:true,json:async()=>({archives:o.archives||['https://api.chess.com/pub/player/kyenzo/games/2026/09','https://api.chess.com/pub/player/kyenzo/games/2026/10']})};
    if(/^https:\/\/api\.chess\.com\/pub\/player\/kyenzo\/games\/2026\/10$/.test(u))return{ok:true,json:async()=>({games:o.ccNow||[]})};
    if(/games\/2026\/09$/.test(u))return{ok:true,json:async()=>({games:o.ccPrev||[]})};
    return{ok:false}};
  if(o.config)w.CONFIG=o.config;
};
const threeLossesLi=[liGame('a','white','black',5),liGame('b','black','white',25),liGame('c','white','black',50),liGame('d','white','white',200)].join('\n');
await t('Tilt poll: three fresh Lichess losses open the modal with where the data came from and a Stop button',async()=>{
  const {w,L,sheets,store}=make(tiltEnv({profile:{lichess_username:'Kyenzo'},li:threeLossesLi}));
  const r=await L.tilt.poll.check();assert(r&&r.tilted&&r.shown,JSON.stringify(r));
  assert.strictEqual(w.__urls.length,1);assert(/^https:\/\/lichess\.org\/api\/games\/user\/Kyenzo\?max=4&finished=true&ongoing=false$/.test(w.__urls[0][0]),w.__urls[0][0]);assert.strictEqual(w.__urls[0][1],'application/x-ndjson');
  const m=sheets[sheets.length-1];assert(/dropped 3 games in a row/.test(m.s.el.textContent)&&/I looked at your last games on Lichess/.test(m.s.el.textContent)&&m.s.el.querySelector('[data-pb="stop"]'));
  m.s.el.querySelector('[data-pb="stop"]').click();assert.strictEqual(w.App.settings.lc25Tilt,false);assert.strictEqual(w.__saved,1);assert(m.s.closed);
  assert.strictEqual(await L.tilt.poll.check(true),null,'after Stop checking it never polls again');
});
await t('Tilt poll: not tilted means silence; a streak is only offered once (shared 6-hour cooldown with Auto-Sync)',async()=>{
  const calm=make(tiltEnv({profile:{lichess_username:'Kyenzo'},li:[liGame('a','white','white',5),liGame('b','white','black',25),liGame('c','white','black',50)].join('\n')}));
  const r=await calm.L.tilt.poll.check();assert(r&&r.tilted===false);assert.strictEqual(calm.sheets.length,0);
  const {w,L,sheets}=make(tiltEnv({profile:{lichess_username:'Kyenzo'},li:threeLossesLi}));
  await L.tilt.poll.check();assert.strictEqual(sheets.length,1);sheets[0].s.close();                 /* closing marks lc19-tilt-at */
  const before=w.__urls.length;assert.strictEqual(await L.tilt.poll.check(true),null,'inside the cooldown');assert.strictEqual(w.__urls.length,before,'and it did not even fetch');
  const vip=make(tiltEnv({profile:{lichess_username:'Kyenzo'},li:threeLossesLi}));vip.w.Store.set('lc19-tilt-at',Date.now()-3600e3);
  assert.strictEqual(await vip.L.tilt.poll.check(),null,'LC19 (Auto-Sync) already offered it an hour ago');assert.strictEqual(vip.w.__urls.length,0);
});
await t('Tilt poll: guards (no username, every off switch, throttle, bad usernames) fetch nothing',async()=>{
  let r=make(tiltEnv({li:threeLossesLi}));assert.strictEqual(await r.L.tilt.poll.check(),null);assert.strictEqual(r.w.__urls.length,0,'no username linked');
  r=make(tiltEnv({profile:{lichess_username:'Kyenzo'},settings:{lc25Tilt:false},li:threeLossesLi}));assert.strictEqual(await r.L.tilt.poll.check(),null);assert.strictEqual(r.w.__urls.length,0,'member switch');
  r=make(tiltEnv({profile:{lichess_username:'Kyenzo'},config:{v25:{tiltCheck:false}},li:threeLossesLi}));assert.strictEqual(await r.L.tilt.poll.check(),null);assert.strictEqual(r.w.__urls.length,0,'admin master switch');
  r=make(tiltEnv({profile:{lichess_username:'Kyenzo'},li:threeLossesLi}));r.w.Store.set('lc25-tilt',{off:true});assert.strictEqual(await r.L.tilt.poll.check(),null);assert.strictEqual(r.w.__urls.length,0,'stored off');
  r=make(tiltEnv({profile:{lichess_username:'bad name!',chess_com_username:'x'},li:threeLossesLi}));assert.strictEqual(await r.L.tilt.poll.check(),null);assert.strictEqual(r.w.__urls.length,0,'unsafe usernames are ignored');
  r=make(tiltEnv({profile:{lichess_username:'Kyenzo'},li:''}));await r.L.tilt.poll.check();const n=r.w.__urls.length;assert.strictEqual(await r.L.tilt.poll.check(),null);assert.strictEqual(r.w.__urls.length,n,'throttled: at most one check every 20 minutes');
  assert.notStrictEqual(await r.L.tilt.poll.check(true),null,'unless forced');
});
await t('Tilt poll: Chess.com (this month, then last month when it is early) and both sites together',async()=>{
  const cc=[ccGame('1','white','resigned',5),ccGame('2','black','checkmated',25)];
  const {w,L,sheets}=make(tiltEnv({profile:{chess_com_username:'Kyenzo',lichess_username:'Kyenzo'},ccNow:cc,ccPrev:[ccGame('3','white','timeout',50)],li:liGame('x','white','white',300)}));
  const r=await L.tilt.poll.check();assert(r&&r.tilted&&r.shown,JSON.stringify(r&&{t:r.tilted,e:r.error,n:(r.rows||[]).length}));
  const urls=w.__urls.map(x=>x[0]);assert(urls.some(u=>/lichess/.test(u))&&urls.some(u=>/games\/archives$/.test(u))&&urls.some(u=>/2026\/10$/.test(u))&&urls.some(u=>/2026\/09$/.test(u)),urls.join('\n'));
  assert(/Lichess and Chess\.com/.test(sheets[0].s.el.textContent));
  const full=make(tiltEnv({profile:{chess_com_username:'Kyenzo'},ccNow:[1,2,3,4].map(i=>ccGame('n'+i,'white','win',i*10))}));await full.L.tilt.poll.check();assert(!full.w.__urls.some(u=>/2026\/09$/.test(u[0])),'enough games this month: last month is not fetched');
  const evil=make(tiltEnv({profile:{chess_com_username:'Kyenzo'},archives:['https://evil.example/x','https://api.chess.com/pub/player/kyenzo/games/2026/10'],ccNow:cc}));await evil.L.tilt.poll.check();assert(!evil.w.__urls.some(u=>/evil/.test(u[0])),'only api.chess.com archive links are followed');
});
await t('Tilt poll: network failure is silent and recoverable; an open sheet is never interrupted',async()=>{
  const bad=make(tiltEnv({profile:{lichess_username:'Kyenzo'},fail:true}));const r=await bad.L.tilt.poll.check();assert(r&&!r.tilted&&!r.shown);assert.strictEqual(bad.sheets.length,0);assert.strictEqual(bad.L.tilt.poll.busy,false);
  const {w,L,sheets}=make(tiltEnv({profile:{lichess_username:'Kyenzo'},li:threeLossesLi}));
  const other=w.document.createElement('div');other.className='sheet-wrap';w.document.body.appendChild(other);
  const d=await L.tilt.poll.check();assert(d&&d.tilted&&d.deferred&&!d.shown);assert.strictEqual(sheets.length,0,'did not open on top of another sheet');assert.strictEqual(L.tilt.poll.busy,false);
});

/* ---------- Truthful alt wording, precomputed alternatives, coach face, wait puzzle, theme ---------- */
await t('Alt wording follows how good the position really is (winning, balanced, worse) and never says "winning" when it is not',()=>{
  const {L}=make();const g=L.logic;const full={tier:'full',why:'eval',loss:1};
  assert.strictEqual(g.quality({cp:300}),'winning');assert.strictEqual(g.quality({cp:100}),'better');assert.strictEqual(g.quality({cp:20}),'balanced');assert.strictEqual(g.quality({cp:-190}),'worse');assert.strictEqual(g.quality({cp:0,mate:2}),'mate');assert.strictEqual(g.quality(null),'unknown');
  assert(/keeps the same winning edge as Qh5/.test(g.altReason(full,'Nf3','Qh5',[],{cp:300})));
  assert(/holds the balance just as well as Qh5/.test(g.altReason(full,'Nf3','Qh5',[],{cp:10})));
  const worse=g.altReason(full,'Kf1','h3',[],{cp:-190});assert(/is as good as h3 here/.test(worse)&&!/winning/.test(worse),worse);
  assert(!/winning edge/.test(g.altReason(full,'Kf1','h3',[],null)),'unknown quality: no winning claim');
  assert.strictEqual(g.altLabel(full,{cp:300}),'Also winning');assert.strictEqual(g.altLabel(full,{cp:10}),'Also good');assert.strictEqual(g.altLabel(full,{cp:-190}),'Also good');assert.strictEqual(g.altLabel({tier:'full',why:'mate'},{cp:0,mate:1}),'Also winning');assert.strictEqual(g.altLabel({tier:'mostly',why:'eval',loss:7},{cp:300}),'Playable, not the best');
});
const PA_FEN='6k1/5ppp/8/8/8/8/5PPP/R3R1K1 w - - 0 1';
const palts=(map)=>w=>{w.Engine={load:async()=>{throw new Error('the engine must not be used')},analyse:async()=>{throw new Error('the engine must not be used')},winPct:x=>50,toCp:l=>l.cp,uciToSan:()=>null};w.fetchWithTimeout=async()=>({ok:false});};
await t('Precomputed alternatives: accepted instantly with no engine, correct label and text, from the file',async()=>{
  const {L}=make(palts());
  L.palts.map={'6k1/5ppp/8/8/8/8/5PPP/R3R1K1 w -':{main:'Ra8#',best:'Ra8#',e:{k:'mate',v:1},alts:[{s:'Ra8#',t:'full',k:'mate',v:1},{s:'Re8#',t:'full',k:'mate',v:1}]},
    'q5k1/5ppp/8/8/8/8/5PPP/4R1K1 w -':{main:'Re8+',best:'h3',e:{k:'cp',v:-191},alts:[{s:'Re8+',t:'mostly',k:'cp',v:-396},{s:'h3',t:'full',k:'cp',v:-191},{s:'Kf1',t:'full',k:'cp',v:-195}]},
    '4k3/8/8/8/8/8/8/R3K2R w KQ':{main:'O-O',best:'Ra8+',e:{k:'mate',v:2},alts:[{s:'Ra8+',t:'full',k:'mate',v:2},{s:'Rh8+',t:'mostly',k:'mate',v:5}]}};L.palts.fresh=true;
  let r=await L.alt.check({fen:PA_FEN,from:'e1',to:'e8',san:'Re8#'});
  assert(r&&r.pre&&r.tier==='full'&&r.label==='Also winning'&&/also forces mate, just like Ra8#/.test(r.text),JSON.stringify(r));
  r=await L.alt.check({fen:'q5k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',from:'h2',to:'h3',san:'h3'});
  assert(r&&r.tier==='full'&&r.label==='Also good'&&/as good as Re8\+ here/.test(r.text)&&!/winning/.test(r.text)&&/Kf1/.test(r.text),JSON.stringify(r));
  r=await L.alt.check({fen:'4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1',from:'h1',to:'h8',san:'Rh8+'});
  assert(r&&r.tier==='mostly'&&r.label==='Playable, not the best'&&/mate takes longer/.test(r.text),JSON.stringify(r));
  assert.strictEqual(await L.alt.check({fen:PA_FEN,from:'g2',to:'g3',san:'g3'}),null,'a move that is not listed is not accepted by the file: the engine decides (here it throws, so null)');
  assert.strictEqual(await L.alt.check({fen:'8/8/8/8/8/8/8/K6k w - - 0 1',from:'a1',to:'a2',san:'Ka2'}),null,'an unknown position falls through to the engine');
  r=await L.alt.check({fen:PA_FEN.replace(' 0 1',' 7 40'),from:'e1',to:'e8',san:'Re8'});assert(r&&r.tier==='full','move counters in the FEN and a missing + are ignored');
});
await t('Precomputed alternatives: the file location is the sibling of the course file, or the admin override; junk is ignored',()=>{
  const u=raw=>make(w=>{w.Feed={rawUrl:()=>raw}}).L.palts.url();
  assert.strictEqual(u('https://raw.githubusercontent.com/lanckrietchess/Json-van-app/main/json'),'https://raw.githubusercontent.com/lanckrietchess/Json-van-app/main/puzzle-alts.json');
  assert.strictEqual(make(w=>{w.CONFIG={v25:{puzzleAltsUrl:'https://example.org/p.json'}}}).L.palts.url(),'https://example.org/p.json');
  assert(/puzzle-alts\.json$/.test(make(w=>{w.CONFIG={v25:{puzzleAltsUrl:'javascript:1'}}}).L.palts.url()));
});
await t('Live engine check now carries a truthful label too',async()=>{
  const fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';const g=new Chess(fen);g.move('e4');const after=g.fen();
  const {L}=make(eng({[fen]:[{cp:20,mate:null,pv:['d2d4']}],[after]:[{cp:18,mate:null,pv:['e7e5']}]}));
  const r=await L.alt.check({fen,from:'e2',to:'e4',san:'e4'});assert.strictEqual(r.label,'Also good');assert(/holds the balance/.test(r.text),r.text);
});
await t('Coach face: one avatar everywhere (LC19\u2019s, including a photo set in admin), ours only as a fallback',()=>{
  const a=make(w=>{w.LC19={coach:{avatar:z=>'<img class="lc19-av-img" width="'+z+'" height="'+z+'">',_t:{info:()=>({enabled:false})}}}});
  assert(/lc19-av-img/.test(a.L.avatarHtml(30))&&/lc19-av-img/.test(a.L.coachHead('Hi')),'uses the coach avatar');assert(/lc25-av lc19-avwrap/.test(a.L.coachHead('Hi')));
  const b=make();assert(/<svg/.test(b.L.avatarHtml(30))&&/width="30"/.test(b.L.avatarHtml(30)),'fallback');
  const c=make(w=>{w.LC19={coach:{avatar(){throw new Error('x')}}}});assert(/<svg/.test(c.L.avatarHtml(20)),'a failing avatar never breaks a card');
});
await t('Wait puzzle: appears only when Stockfish is still loading after 1.5 s, passes the result through, never double-wraps',async()=>{
  const bank=[{id:'b1',rating:900,fen:PA_FEN,moves:['g8h8','a1a8']}];
  const env=load=>w=>{w.PUZZLE_BANK=bank;w.PuzzleFeed={next:async()=>null,fromBank:b=>({id:b.id,fen:PA_FEN,solution:['a1a8']})};w.Engine={load};};
  const slow=make(env(()=>new Promise(r=>setTimeout(()=>r('READY'),2300))));slow.L.init();slow.L.init();await sleep(1300);
  assert(slow.w.Engine._lc25===1);const v=slow.w.document.querySelector('#view');
  const p=slow.w.Engine.load();assert.strictEqual(typeof p.then,'function');
  await sleep(1700);assert(slow.w.document.querySelector('.lc25-wait [data-lc25-wait]'),'card is up after 1.5 s');assert.strictEqual(slow.w.document.querySelector('.lc25-wait').parentNode,slow.w.document.body,'fixed to the screen (a child of body), not buried in the page');
  assert.strictEqual(await p,'READY','the engine result is passed through');await sleep(20);assert(!slow.w.document.querySelector('.lc25-wait'),'gone when the engine is ready');
  const dis=make(env(()=>new Promise(r=>setTimeout(()=>r(true),3300))));dis.L.init();await sleep(1300);dis.w.Engine.load();await sleep(1700);
  const x=dis.w.document.querySelector('[data-lc25-wait-close]');assert(x,'a close button');x.click();assert(!dis.w.document.querySelector('.lc25-wait'),'closed');
  await sleep(300);assert(!dis.w.document.querySelector('.lc25-wait'),'and it does not come back during the same load');
  const fast=make(env(()=>new Promise(r=>setTimeout(()=>r(true),300))));fast.L.init();await sleep(1300);fast.w.Engine.load();await sleep(1900);assert(!fast.w.document.querySelector('.lc25-wait'),'a quick load never shows it');
  const rej=make(env(()=>Promise.reject(new Error('no wasm'))));rej.L.init();await sleep(1300);await assert.rejects(()=>rej.w.Engine.load(),/no wasm/);
  const off=make(env(()=>new Promise(r=>setTimeout(r,1900))));off.L.init();await sleep(1300);off.w.Store.set('lc25-wait',false);off.w.Engine.load();await sleep(1700);assert(!off.w.document.querySelector('.lc25-wait'),'the switch works');
  const sheet=make(env(()=>new Promise(r=>setTimeout(r,1900))));sheet.L.init();await sleep(1300);const o=sheet.w.document.createElement('div');o.className='sheet-wrap';sheet.w.document.body.appendChild(o);sheet.w.Engine.load();await sleep(1700);assert(!sheet.w.document.querySelector('.lc25-wait'),'never on top of a sheet');
});
await t('Tech theme: on by default, off by the member switch or the admin switch, theme-color follows and is restored',()=>{
  const {w,L}=make(w=>{const m=w.document.createElement('meta');m.name='theme-color';m.content='#0f172a';w.document.head.appendChild(m)});
  L.theme.apply();assert.strictEqual(w.document.documentElement.getAttribute('data-lc25-theme'),'tech');assert.strictEqual(w.document.querySelector('meta[name="theme-color"]').content,'#0a0e17');
  w.App.settings={lc25Theme:false};L.theme.apply();assert.strictEqual(w.document.documentElement.getAttribute('data-lc25-theme'),null);assert.strictEqual(w.document.querySelector('meta[name="theme-color"]').content,'#0f172a');
  w.App.settings={};w.CONFIG={v25:{techTheme:false}};L.theme.apply();assert.strictEqual(w.document.documentElement.getAttribute('data-lc25-theme'),null,'admin master switch');
  w.CONFIG={};L.theme.apply();assert.strictEqual(w.document.documentElement.getAttribute('data-lc25-theme'),'tech');
  assert.doesNotThrow(()=>make(w=>{delete w.App}).L.theme.apply(),'no App yet: still fine');
});
await t('Tech theme: the Settings switch re-applies it straight away',async()=>{
  const {w,L}=make();L.init();await sleep(1300);L.theme.apply();assert.strictEqual(w.document.documentElement.getAttribute('data-lc25-theme'),'tech');
  const cb=w.document.createElement('input');cb.type='checkbox';cb.setAttribute('data-p36','lc25Theme');w.document.body.appendChild(cb);
  w.App.settings={lc25Theme:false};cb.dispatchEvent(new w.Event('change',{bubbles:true}));await sleep(30);assert.strictEqual(w.document.documentElement.getAttribute('data-lc25-theme'),null);
});

/* ---------- Celebration popups wait for modal sheets (found in a real browser) ---------- */
await t('Celebrate: shown at once when no sheet is open; queued (max 3, no duplicates) while one is open; replayed in order afterwards',async()=>{
  const log=[];const {w,L}=make(w=>{w.Celebrate={brilliant:t=>log.push(['brilliant',t]),badge:(a,b)=>log.push(['badge',a,b]),streak:n=>log.push(['streak',n]),rank:t=>log.push(['rank',t]),VERSION:'x'}});
  L.cele.wrap();L.cele.wrap();assert.strictEqual(w.Celebrate._lc25,1);assert.strictEqual(w.Celebrate.VERSION,'x','non-function properties are untouched');
  w.Celebrate.badge('OG','first year');assert.deepStrictEqual(JSON.parse(JSON.stringify(log)),[['badge','OG','first year']],'no sheet: immediate');
  log.length=0;const sh=w.document.createElement('div');sh.className='sheet-wrap';w.document.body.appendChild(sh);
  w.Celebrate.badge('OG','first year');w.Celebrate.badge('OG','first year');w.Celebrate.streak(3);w.Celebrate.rank('top');w.Celebrate.brilliant('!!');
  assert.strictEqual(log.length,0,'nothing while the sheet is open');assert.strictEqual(L.cele.q.length,3,'at most 3 queued, duplicates dropped');
  await sleep(1700);assert.strictEqual(log.length,0,'still nothing: the sheet is still open');
  sh.remove();await sleep(1700);assert.strictEqual(log.length,1,'one popup per 1.5 s, not a burst');await sleep(1600);await sleep(1600);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(log)),[['badge','OG','first year'],['streak',3],['rank','top']],'in the order they were raised');
  await sleep(1700);assert.strictEqual(L.cele.t,0,'the timer stops when the queue is empty');
});
await t('Celebrate: a popup raised while a sheet is open is held back even if the sheet closes quickly, and a missing Celebrate is fine',async()=>{
  const log=[];const {w,L}=make(w=>{w.Celebrate={badge:(a)=>log.push(a)}});L.cele.wrap();
  const sh=w.document.createElement('div');sh.className='sheet-wrap';w.document.body.appendChild(sh);w.Celebrate.badge('A');sh.remove();assert.strictEqual(log.length,0);await sleep(1700);assert.deepStrictEqual(log,['A']);
  assert.doesNotThrow(()=>make().L.cele.wrap());
});
await t('Ghost card wording: level at the start, ahead only when really ahead, behind otherwise',()=>{
  const {w,L}=make();w.__total=0;L.ghost.init();
  assert(/Level with the ghost/.test(L.ghost.html()),'0 v 0');
  w.__total=40;assert(/You are ahead of the ghost/.test(L.ghost.html()),'ahead');
  const st=w.Store.get('lc25-ghost',null);st.t0=Date.now()-5*864e5;w.Store.set('lc25-ghost',st);w.__total=10;assert(/The ghost is ahead/.test(L.ghost.html()),'behind on day 5');
});

/* ---------- Built-in puzzle pool: the fallback when the app's own bank is empty (found with a real browser) ---------- */
await t('Pool: every built-in puzzle is legal and has EXACTLY ONE mating move (so no answer is ever ambiguous); both colours, unique',()=>{
  const {L}=make();assert(L.pool.length>=10);let w=0;const ids=new Set(),fens=new Set();
  for(const p of L.pool){
    const g=new Chess();assert(g.load(p.fen),'legal fen '+p.id);assert(!g.in_check()&&!g.game_over(),'not already over '+p.id);
    const mates=g.moves({verbose:true}).filter(m=>{const h=new Chess(p.fen);h.move(m);return h.in_checkmate()}).map(m=>m.from+m.to+(m.promotion||''));
    assert.deepStrictEqual(mates,[p.solution[0]],'exactly one mate: '+p.id);ids.add(p.id);fens.add(p.fen);if(p.fen.split(' ')[1]==='w')w++;
  }
  assert.strictEqual(ids.size,L.pool.length);assert.strictEqual(fens.size,L.pool.length);assert(w>0&&w<L.pool.length,'both colours to move');
});
await t('Wait puzzle: still shows a puzzle when the app\u2019s bank is EMPTY (as in the published content), and solving it works',async()=>{
  const {w,L}=make(w=>{w.PUZZLE_BANK=[];w.PuzzleFeed={next:async()=>null,fromBank:()=>{throw new Error('no bank')}};w.Engine={load:()=>new Promise(r=>setTimeout(()=>r(true),1900))}});
  L.init();await sleep(1300);w.Engine.load();await sleep(1700);
  const host=w.document.querySelector('.lc25-wait [data-lc25-wait]');assert(host,'the card is up');const bd=host.querySelector('[data-mp]').__board;assert(bd,'with a real board');
  const fen=bd.opts.fen,hit=L.pool.find(p=>p.fen===fen);assert(hit,'it is one of the built-in puzzles');
  bd.opts.onMove({from:'a1',to:'a1'});assert(/Not that one/.test(host.textContent));
  bd.opts.onMove({from:hit.solution[0].slice(0,2),to:hit.solution[0].slice(2,4)});assert(/Correct/.test(host.textContent));
});
await t('Penalty Box: with no puzzle service and an empty bank, five built-in puzzles are served (no repeats) and the set can be finished',async()=>{
  const {w,L,sheets}=make(w=>{w.PuzzleFeed={next:async()=>{throw new Error('offline')}};w.Engine={uciToSan:()=>'x'}});
  L.tilt.offer({tilted:true});const m=sheets[sheets.length-1];m.s.el.querySelector('[data-pb="go"]').click();
  const seen=[];
  for(let k=1;k<=5;k++){
    await sleep(80);const host=m.s.el.querySelector('[data-pbb]');assert(host,'puzzle '+k);const bd=host.__board;const hit=L.pool.find(p=>p.fen===bd.opts.fen);assert(hit,'built-in puzzle '+k);seen.push(hit.id);
    bd.opts.onMove({from:hit.solution[0].slice(0,2),to:hit.solution[0].slice(2,4)});await sleep(1100);
  }
  assert.strictEqual(new Set(seen).size,5,'no repeats: '+seen.join(','));
  await sleep(100);const txt=m.s.el.textContent;assert(/5 of 5/.test(txt)&&!/not reachable/.test(txt),txt.slice(0,200));
});

/* ---------- The app is all English on any phone (a Dutch phone must not make it half Dutch) ---------- */
const lang=(l)=>w=>{Object.defineProperty(w.navigator,'language',{get:()=>l,configurable:true});Object.defineProperty(w.navigator,'languages',{get:()=>[l],configurable:true})};
await t('English: the module is active only when the browser language is not English (or forced)',()=>{
  for(const [l,want] of [['nl-BE',true],['nl',true],['fr-BE',true],['de-DE',true],['en',false],['en-GB',false],['en-US',false],['EN-ie',false]])assert.strictEqual(make(lang(l)).L.english.need(),want,l);
  let r=make(lang('nl-BE'));r.w.Store.set('lc25-english',false);assert.strictEqual(r.L.english.need(),false,'forced off');
  r=make(lang('en-GB'));r.w.Store.set('lc25-english',true);assert.strictEqual(r.L.english.need(),true,'forced on');
});
await t('English: the Dutch and French regulator names are removed from copy, nothing else is touched',()=>{
  const {L}=make();const f=L.english.fix;
  const orig='You can also lodge a complaint with the Belgian Data Protection Authority (Gegevensbeschermingsautoriteit / Autorit\u00e9 de protection des donn\u00e9es, www.dataprotectionauthority.be) or with the supervisory authority in your own EU country.';
  assert.strictEqual(f(orig),'You can also lodge a complaint with the Belgian Data Protection Authority (www.dataprotectionauthority.be) or with the supervisory authority in your own EU country.');
  assert.strictEqual(f(f(orig)),f(orig),'idempotent');assert.strictEqual(f('Plain English (with brackets, and commas).'),'Plain English (with brackets, and commas).');assert.strictEqual(f(null),'null');
});
const domWith=(html,l)=>{const r=make(lang(l||'nl-BE'));r.w.document.body.insertAdjacentHTML('beforeend','<div id="lc25-test-wrap">'+html+'</div>');return r};
await t('English: native file pickers get an English control (labels by file type), updated filename, no double dialogs',()=>{
  const {w,L}=domWith('<label class="field"><span class="field-label">PGN</span><input id="a" class="input" type="file" accept=".pgn"></label><div><input id="b" type="file" accept="image/*"></div><div><input id="c" type="file" multiple></div><input id="h" type="file" hidden>');
  L.english.apply(document=w.document);
  const q=id=>w.document.getElementById(id);const ui=el=>el.nextElementSibling;
  assert(q('a').classList.contains('lc25-file-native')&&/Choose a PGN file/.test(ui(q('a')).textContent)&&/No file chosen/.test(ui(q('a')).textContent));
  assert(/Choose an image/.test(ui(q('b')).textContent));assert(/Choose files/.test(ui(q('c')).textContent));assert(!q('h').classList.contains('lc25-file-native')&&!ui(q('h')),'a hidden input (the app draws its own control) is left alone');
  L.english.apply(w.document);L.english.apply(w.document);assert.strictEqual(w.document.querySelectorAll('.lc25-fileui').length,3,'idempotent: no duplicate controls');
  let clicks=0;q('b').click=()=>clicks++;ui(q('b')).click();assert.strictEqual(clicks,1,'outside a label the control opens the picker once');
  let lc=0;q('a').click=()=>lc++;ui(q('a')).dispatchEvent(new w.Event('click'));assert.strictEqual(lc,0,'inside a label the browser does it: no second dialog');
  Object.defineProperty(q('c'),'files',{value:[{name:'one.pgn'},{name:'two.pgn'},{name:'three.pgn'}],configurable:true});q('c').dispatchEvent(new w.Event('change'));assert.strictEqual(ui(q('c')).querySelector('.lc25-filename').textContent,'one.pgn +2 more');
  Object.defineProperty(q('c'),'files',{value:[],configurable:true});q('c').dispatchEvent(new w.Event('change'));assert.strictEqual(ui(q('c')).querySelector('.lc25-filename').textContent,'No file chosen');
});
await t('English: native date and time pickers become ISO text inputs (value kept), only on a non-English phone',()=>{
  const html='<input id="d" type="date" value="2026-10-21"><input id="t" type="time" value="14:30"><input id="l" type="datetime-local" value="2026-10-21T14:30"><input id="m" type="month"><input id="x" type="text">';
  const {w,L}=domWith(html);L.english.apply(w.document);const q=id=>w.document.getElementById(id);
  assert.deepStrictEqual(['d','t','l','m'].map(i=>q(i).type),['text','text','text','text']);assert.deepStrictEqual(['d','t','l'].map(i=>q(i).value),['2026-10-21','14:30','2026-10-21T14:30']);
  assert.deepStrictEqual(['d','t','l','m'].map(i=>q(i).placeholder),['YYYY-MM-DD','HH:MM','YYYY-MM-DD HH:MM','YYYY-MM']);
  const re=i=>new RegExp('^(?:'+q(i).getAttribute('pattern')+')$');assert(re('d').test('2026-10-21')&&!re('d').test('21/10/2026')&&re('t').test('09:05')&&!re('t').test('25:00')&&re('l').test('2026-10-21 14:30')&&re('l').test('2026-10-21T14:30'));
  q('l').value='2026-11-02 09:15';q('l').dispatchEvent(new w.Event('input'));assert.strictEqual(q('l').value,'2026-11-02T09:15','a space becomes the T that the app expects');
  const en=domWith(html,'en-GB');en.L.english.apply(en.w.document);assert.strictEqual(en.w.document.getElementById('d').type,'date','English phones keep the native picker');
});
await t('English: browser validation messages are English (missing, email, url, pattern, length, range), and clear once fixed',()=>{
  const {w,L}=domWith('<form><input id="r" required><input id="e" type="email" value="x"><input id="u" type="url" value="x"><input id="p" pattern="[a-z]+" title="letters only" value="ABC"><input id="n" type="number" min="3" max="9" value="1"><input id="n2" type="number" max="9" value="11"><select id="sel" required><option value="">-</option></select><input id="cb" type="checkbox" required></form>');
  L.english.apply(w.document);const q=id=>w.document.getElementById(id);
  const msg=id=>{q(id).checkValidity();return q(id).validationMessage};
  assert.strictEqual(msg('r'),'Please fill out this field.');assert.strictEqual(msg('e'),'Please enter a valid email address.');assert.strictEqual(msg('u'),'Please enter a valid URL.');
  assert.strictEqual(msg('p'),'Please match the requested format: letters only');assert.strictEqual(L.english.message({validity:{tooShort:true},minLength:5,type:'text'}),'Please use at least 5 characters.');assert.strictEqual(L.english.message({validity:{tooLong:true},maxLength:8,type:'text'}),'Please use at most 8 characters.');assert.strictEqual(L.english.message({validity:{badInput:true},type:'number'}),'Please enter a valid value.');assert.strictEqual(L.english.message({validity:{}}),'Please check this field.');assert.strictEqual(msg('n'),'Value must be at least 3.');assert.strictEqual(msg('n2'),'Value must be at most 9.');
  assert.strictEqual(msg('sel'),'Please select an item in the list.');assert.strictEqual(msg('cb'),'Please check this box if you want to proceed.');
  q('r').value='ok';q('r').dispatchEvent(new w.Event('input',{bubbles:true}));assert.strictEqual(q('r').validationMessage,'','fixing the field clears the message (the form can submit)');assert.strictEqual(q('r').checkValidity(),true);
  const en=domWith('<input id="r" required>','en-GB');en.L.english.apply(en.w.document);en.w.document.getElementById('r').checkValidity();assert.notStrictEqual(en.w.document.getElementById('r').validationMessage,'Please fill out this field.','English phones keep their native text (untouched)');
});
await t('English: inputs the app adds later (a sheet, a new view) are converted too',async()=>{
  const {w,L}=make(lang('nl-BE'));L.english.watch();w.document.body.insertAdjacentHTML('beforeend','<label><input id="late" type="file" accept=".json"></label><input id="latedate" type="date">');
  await sleep(320);assert(w.document.getElementById('late').classList.contains('lc25-file-native')&&w.document.getElementById('latedate').type==='text');
});

/* ---------- Welcome wrapper + incoming challenge ---------- */
await t('Coach welcome appears once before the old onboarding; the old one still runs',async()=>{
  let called=0;const {w,L,sheets}=make(w=>{w.LC80={firstRun(){called++;return true}}});
  L.init();assert.strictEqual(w.LC80.firstRun(),true);assert(/Welcome/.test(sheets[0].o.title)&&/Coach Lanckriet/.test(sheets[0].s.el.textContent));assert.strictEqual(called,0);
  sheets[0].s.el.querySelector('[data-lc25-start]').click();await sleep(400);assert.strictEqual(called,1);
  assert.strictEqual(w.LC80.firstRun(),true);assert.strictEqual(called,2,'second time straight to the old flow');
  w.App.onboarded=true;assert.strictEqual(w.LC80.firstRun(),false);
});
await t('Incoming WhatsApp challenge is stored once and removed from the address bar',()=>{
  const {w,dom,L}=make();dom.reconfigure({url:'https://lanckrietchess-app.vercel.app/?ref=sam123&ch=xp:480#home'});L.init();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(w.Store.get('lc25-incoming',null))),{kind:'xp',val:'480'});
  assert(!/ch=/.test(w.location.search)&&/ref=sam123/.test(w.location.search));
});

/* ---------- Recap ---------- */
await t('Recap plays through the coach voice and refuses politely when the voice is off',()=>{
  const said=[];const {w,L,toasts}=make(w=>{w.LC19={coach:{say:(t,o)=>said.push([t,o]),_t:{info:()=>({enabled:true})}}}});
  const wk={kind:'week',games:5,wins:3,losses:2,draws:0,acc:77,blunders:3,mistakes:4};
  assert.strictEqual(L.recap.play(wk),true);assert(/5 games/.test(said[0][0])&&/Hi Sam/.test(said[0][0]));
  assert.strictEqual(L.recap.play({games:0}),false);
  const r2=make();assert.strictEqual(r2.L.recap.play(wk),false);
});

console.log('\n'+n+' passed, '+fail+' failed');process.exit(fail?1:0);
})();
