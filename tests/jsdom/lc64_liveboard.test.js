module.exports=async(w,errs)=>{
 const ev=s=>w.eval(s),d=w.document,chk=(n,ok,x)=>console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' '+JSON.stringify(x).slice(0,300):''));
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 let pid=0;global.FETCH=async(u)=>{if(/lichess\.org\/api\/puzzle\/next/.test(u)){pid++;const j={game:{pgn:"e4 e5 Bc4 Nc6 Qh5 Nf6"},puzzle:{id:"P"+pid,rating:1400,solution:["h5f7"],themes:["mateIn1"]}};return{ok:true,status:200,json:async()=>j}}return null};
 d.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());
 // spy on Board to see arrows / interactivity
 ev('window.__arr=[];window.__int=[];const _B=Board;window.Board=function(h,o){const b=_B(h,o);const sa=b.setArrows,si=b.setInteractive;b.setArrows=function(l){window.__arr.push(JSON.stringify(l||[]));return sa.apply(b,arguments)};b.setInteractive=function(c){window.__int.push(c);return si.apply(b,arguments)};window.__b=b;return b}');
 // Board is a function declaration: reassigning the global binding works in sloppy global scope only if declared with function; test whether LC64 sees it
 ev('LC64.openRanked("think")');await wait(2500);
 const sh=d.querySelector('.lc64-sheet');
 chk('ranked "Think first" opens with the board and the four questions',!!sh&&!!sh.querySelector('.lc64-iq'),sh&&sh.textContent.slice(0,200));
 const live=sh.querySelector('.lc64-live');
 chk('step M says the last move is marked, names it (Nf6)',!!live&&/Nf6/.test(live.textContent)&&/marked in red/.test(live.textContent),live&&live.textContent);
 const arr=ev('window.__arr'),ints=ev('window.__int');
 chk('the board gets the red arrow g8-f6 at step M',arr.some(a=>/"from":"g8","to":"f6","kind":"bad"/.test(a)),arr.slice(-3));
 chk('the board is interactive during the questions',ints.includes('w'),ints);
 for(let i=0;i<4;i++){const b=sh.querySelector('[data-lc64="iq-next"]');if(b)b.click();await wait(40)}
 chk('after the questions: "Now play your move"',/Now play your move/.test(sh.textContent));
 console.log('ERRS',errs.length,errs.slice(0,3));
};
