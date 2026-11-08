module.exports=async(w,errs)=>{
 const ev=s=>w.eval(s),d=w.document,chk=(n,ok,x)=>console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' '+JSON.stringify(x):''));
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 w.location.hash='#quests'; await wait(1200);
 const view=d.querySelector('#view'); view.insertAdjacentHTML('beforeend','<div class="board-shell"></div>');
 // 1. Trim shows a serious error of the student: it is saved as a case study
 const FEN='r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 b - - 0 8';
 ev('LC66.onGoto('+JSON.stringify(FEN)+',{color:"b",k:"S",text:"x",san:"dxc4",cls:"mistake",best:"d5c4",bestSan:"dxc4",num:8},"b",[])');
 ev('LC66.onGoto('+JSON.stringify(FEN)+',{color:"b",k:"S",text:"x",san:"dxc4",cls:"mistake",best:"d5c4",bestSan:"dxc4",num:8},"b",[])');
 ev('LC66.onGoto("8/8/8/8/8/8/8/K1k5 w - - 0 1",{color:"b",k:"M",text:"x",san:"Kb2",cls:"blunder",best:"a1b1",num:3},"w",[])');
 ev('LC66.onGoto("8/8/8/8/8/8/8/K1k5 w - - 0 1",{color:"w",k:"M",text:"x",san:"Kb2",cls:"inaccuracy",best:"a1b1",num:3},"w",[])');
 const cases=ev('Store.get("lc66-cases",[])');
 chk('one case saved (no duplicates, no opponent errors, no inaccuracies)',cases.length===1&&cases[0].best==='d5c4',cases.length);
 // 2. the "Think case study" button opens it: the process first, then the board is interactive
 ev('LC64.openCase()'); await wait(500);
 chk('the case study shows the student\'s own move and asks the 4 questions first',/You played/.test(d.body.textContent)&&/1 of 4/.test((d.querySelector('[data-lc64-iq]')||{}).textContent||''));
 for(let i=0;i<4;i++){const b=d.querySelector('[data-lc64="iq-next"]');if(b)b.click();await wait(60)}
 await wait(200);
 chk('after the questions the move is asked for',/Now play your move/.test((d.querySelector('[data-lc64-msg]')||{}).textContent||''));
 // fallback: without own cases the Lichess case study is used (no throw)
 ev('Store.set("lc66-cases",[])'); let ok=true; try{await w.eval('LC64.openCase()')}catch(e){ok=false} chk('no own errors yet falls back to the Lichess case study without throwing',ok);
 // 3. stars on the opening list
 w.location.hash='#openings'; await wait(1500);
 const v2=d.querySelector('#view'); v2.insertAdjacentHTML('beforeend','<div id="rows"><button data-line="caro1">Line 1</button><button data-line="caro2">Line 2</button></div>');
 ev('LC66.flag("caro1")'); ev('LC66.afterRender()'); await wait(1000);
 const r1=d.querySelector('[data-line="caro1"]'),r2=d.querySelector('[data-line="caro2"]');
 chk('the flagged line gets a ★, the other does not',!!r1.querySelector('.lc66-star')&&!r2.querySelector('.lc66-star'));
 ev('App.progress.caro1={best:.95,runs:1,last:Date.now()+9999}'); ev('LC66.afterRender()'); await wait(1000);
 chk('the star disappears after a clean drill',!r1.querySelector('.lc66-star'));
 // 4. Trim jump goes to the deviation when it comes before the first error
 w.location.hash='#trim'; await wait(1500);
 ev('CONTENT.openings=[{id:"caro1",title:"Caro",pgn:"1.e4 c6 2.d4 d5 3.e5 Bf5 4.Nf3 e6 5.Be2",group:"g",side:"b",lvl:1}]');
 const sans='e4 c6 d4 d5 e5 Bf5 Nf3 Nd7 Be2 e6'.split(' ');
 d.querySelectorAll('#an-side,#an-moves,#an-report').forEach(x=>x.remove()); const mv=d.querySelector('#view'); mv.insertAdjacentHTML('beforeend','<div id="an-side"><button data-side="w">w</button><button data-side="b" aria-pressed="true">b</button></div><div id="an-moves"><button data-i="0">Start</button>'+sans.map((s,i)=>'<button data-i="'+(i+1)+'">'+s+'</button>').join('')+'</div><div id="an-report"><button data-act="goto" data-i="9">err</button></div>');
 let clicked=null; d.querySelectorAll('#an-moves [data-i]').forEach(b=>b.addEventListener('click',()=>{clicked=b.getAttribute('data-i')})); d.querySelector('#an-report button').addEventListener('click',()=>{clicked='error'});
 await wait(1500);
 chk('Trim jumps to the position BEFORE the deviating move (list button 7) before the later error',clicked==='7',clicked);
};
