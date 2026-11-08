module.exports=async(w,errs)=>{
 const ev=s=>w.eval(s),d=w.document,chk=(n,ok,x)=>console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' '+JSON.stringify(x):''));
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 ev('CONTENT.openings=[{id:"caro1",title:"Caro-Kann Advance",pgn:"1.e4 c6 2.d4 d5 3.e5 Bf5 4.Nf3 e6 5.Be2",group:"Caro-Kann",side:"b",lvl:1},{id:"caro2",title:"Caro-Kann Exchange",pgn:"1.e4 c6 2.d4 d5 3.exd5 cxd5",group:"Caro-Kann",side:"b",lvl:1}]');
 const mv=s=>s.split(' ').map(x=>({san:x}));
 // black follows caro1 for 8 plies then plays 4...Nd7 instead of 4...e6? (index 7 = black ply)
 let dv=ev('LC66.deviation("e4 c6 d4 d5 e5 Bf5 Nf3 Nd7 Be2".split(" "),"b")');
 chk('student (Black) leaves the line at move 4 with Nd7',dv&&dv.mine&&dv.no===4&&dv.expected==='e6'&&dv.played==='Nd7',dv&&[dv.no,dv.played,dv.expected,dv.mine]);
 dv=ev('LC66.deviation("e4 c6 d4 d5 e5 Bf5 Nf3 e6 Bd3 h6".split(" "),"b")');
 chk('White leaving the line is not the student\'s fault',dv&&!dv.mine&&dv.played==='Bd3',dv&&[dv.played,dv.mine]);
 chk('a game that never entered a line gives no deviation',ev('LC66.deviation("d4 Nf6 c4 e6".split(" "),"b")')===null);
 // card + flag
 w.location.hash='#quests'; await wait(1200);
 const view=d.querySelector('#view'); view.insertAdjacentHTML('beforeend','<div class="board-shell"></div>');
 ev('LC66.onGoto("r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 b - - 0 8",{color:"b",k:"S",text:"x",san:"Nd7",cls:"mistake"},"b",'+JSON.stringify(mv('e4 c6 d4 d5 e5 Bf5 Nf3 Nd7 Be2'))+')');
 const c=d.querySelector('#lc66-coach');
 chk('the coach card names the deviation and the ★ line',c&&/Opening deviation/.test(c.textContent)&&/Nd7/.test(c.textContent)&&/e6/.test(c.textContent));
 chk('the line is flagged',ev('LC66.flagged("caro1")')===true);
 chk('the other line is not flagged',ev('LC66.flagged("caro2")')===false);
 // train.pick prefers the flagged line
 const pick=ev('LC81.train.pick({lines:CONTENT.openings})');
 chk('Train My Repertoire starts with the deviation line',pick.line&&pick.line.id==='caro1'&&pick.why==='deviation',pick.why);
 // a clean drill clears the flag
 ev('App.progress.caro1={best:.9,runs:1,last:Date.now()+5000}');
 chk('a clean drill after the deviation clears the star',ev('LC66.flagged("caro1")')===false);
 // learn twice
 ev('SmartSkip.mark("caro2","learn",1)');
 chk('legacy learned line counts as learned twice',ev('LC61.learnPasses("caro2")')===2);
 ev('Store.set("lc61-learn",{}); SmartSkip.mark("caro1","learn",1); LC61.learnPass("caro1")');
 let p1=ev('LC81.train.pick({lines:[CONTENT.openings[0]]})'); 
 chk('after ONE learn run the line is learned again',p1.mode==='learn'&&ev('LC61.learnPasses("caro1")')===1,[p1.mode,p1.why]);
 ev('LC61.learnPass("caro1")');
 let p2=ev('LC81.train.pick({lines:[CONTENT.openings[0]]})');
 chk('after TWO learn runs the line moves on to drilling',p2.mode==='drill',[p2.mode,p2.why]);
 // coach picture helper falls back quietly
 chk('coach picture helper never throws',typeof ev('LC61.coachImg(["happy"],40)')==='string');
 // bot accuracy uses the blend
 chk('LC61.gameAcc is below the plain mean for a game with slips',ev('LC61.gameAcc([100,100,100,100,100,100,100,100,20])')<ev('(100*8+20)/9'));
};
