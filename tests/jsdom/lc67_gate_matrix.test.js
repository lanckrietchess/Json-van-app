module.exports=async(w,errs)=>{
 const ev=s=>w.eval(s),d=w.document,chk=(n,ok,x)=>console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' '+JSON.stringify(x).slice(0,300):''));
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 let pid=0;global.FETCH=async(u)=>{if(/lichess\.org\/api\/puzzle\/next/.test(u)){pid++;const j={game:{pgn:"e4 e5 Bc4 Nc6 Qh5 Nf6"},puzzle:{id:"P"+pid,rating:1400+pid*10,solution:["h5f7"],themes:["mateIn1"]}};return{ok:true,status:200,json:async()=>j,text:async()=>JSON.stringify(j)}}return null};
 ev('App.access&&(App.access.tier="pro")');
 w.location.hash='#shuffle';await wait(2500);
 const v=d.querySelector('#view');
 chk('Shuffle opens with the pre-game MSPC puzzle first',!!v.querySelector('.lc67-gate')&&!v.querySelector('.sh-setup'),v.textContent.slice(0,140));
 chk('the puzzle board is there with 4 MSPC steps',!!v.querySelector('.lc67-pz .board-host, .lc67-pz [data-lc67-board] *')&&v.querySelectorAll('.lc67-steps li').length===4);
 chk('step M names the opponent last move (the red arrow is checked in Chromium: jsdom has no layout)',/Nf6/.test(v.querySelector('[data-lc67-step]').textContent+v.querySelector('.lc67-hint').textContent),v.querySelector('[data-lc67-step]').textContent.slice(0,200));
 chk('the coach view names facts from the position',/attacks|checks|captures|Alarm/i.test(v.querySelector('.lc67-hint').textContent));
 chk('pool warms while the puzzle is shown',ev('LC67.pool._s.fast')===true);
 const run=ev('LC67.gate._last.run()');
 // live board during thinking: play a move for white then go back
 run._move({from:'d2',to:'d3'});await wait(50);
 chk('board is live while thinking (move played on the analysis board)',run.board.fen().split(' ')[0]!=='r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR' && !v.querySelector('[data-lc67="home"]').hidden);
 v.querySelector('[data-lc67="home"]').click();await wait(30);
 chk('Back to the position restores it',run.board.fen().startsWith('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR'));
 for(let i=0;i<4;i++){v.querySelector('[data-lc67="step"]').click();await wait(30)}
 chk('after the four steps: play your move',/Now play your move/.test(v.querySelector('[data-lc67-step]').textContent));
 run._move({from:'h5',to:'f7'});await wait(100);
 chk('correct move: solved, ritual marked',/Correct/.test(v.textContent)&&ev('LC67.ritual.done()')&&ev('LC67.ritual.get().streak')===1);
 // pool might not be ready: finish it, then the trainer appears
 while(ev('LC67.pool.left()')>0)ev('LC67.pool.slice(80)');
 await wait(2200);
 chk('the Shuffle Trainer follows by itself',!!v.querySelector('.sh-setup')&&!v.querySelector('.lc67-gate'));
 // 2x2 matrix
 const sc=[...v.querySelectorAll('.sh-matrix .sh-scopes .sh-scope')].map(b=>b.getAttribute('data-scope'));
 const al=[...v.querySelectorAll('.sh-matrix .sh-allrow .sh-scope')].map(b=>b.getAttribute('data-scope'));
 chk('2x2 matrix: Openings, Middlegame, Endgames, MSPC System',JSON.stringify(sc)==='["openings","middlegame","endgame","mspc"]',sc);
 chk('Shuffle all is ONE bar under the matrix',JSON.stringify(al)==='["all"]',al);
 chk('the matrix shows even while the options are folded',(()=>{const m=v.querySelector('.sh-matrix');return m&&w.getComputedStyle(m).display!=='none'})());
 chk('matrix sits above the Start button (CSS order)',/\.sh-setup>\.sh-matrix\{order:-2\}/.test(d.querySelector('#lc67-css').textContent));
 const mspcBtn=v.querySelector('.sh-scope[data-scope="mspc"]');
 chk('MSPC System has its own count',/\d/.test(mspcBtn.textContent),mspcBtn.textContent);
 mspcBtn.click();await wait(300);
 chk('choosing MSPC System narrows the pool to MSPC positions',ev('JSON.stringify(shuffleScope(shufflePool(),"mspc","both").map(x=>x.course).filter((c,i,a)=>a.indexOf(c)===i))')==='["c:mspc"]'&&ev('App.settings.shuffle.scope')==='mspc');
 chk('Middlegame no longer contains the MSPC positions',ev('shuffleScope(shufflePool(),"middlegame","both").some(x=>x.course==="c:mspc")')===false);
 // second visit today: no puzzle
 w.location.hash='#home';await wait(600);w.location.hash='#shuffle';await wait(1200);
 chk('second visit the same day: straight to the trainer',!!d.querySelector('#view .sh-setup')&&!d.querySelector('#view .lc67-gate'));
 console.log('ERRS',errs.length,errs.slice(0,3));
};
