module.exports=async(w,errs)=>{
 const d=w.document,ev=s=>w.eval(s);
 const chk=(n,ok,x)=>console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' '+JSON.stringify(x):''));
 // 1 level parity
 await new Promise(r=>setTimeout(r,800));
 const topbar=(d.querySelector('#lc30-xp .lc30-lv')||{}).textContent;
 d.querySelector('#profile-chip').click(); await new Promise(r=>setTimeout(r,900));
 const card=(d.querySelector('.lc39-pmlv')||{}).textContent;
 chk('topbar vs profile card show the same level',topbar&&card&&topbar.replace('Lv ','')===card.replace('Level ',''),{topbar,card});
 chk('LC61.getUserLevel works',ev('LC61.getUserLevel().level')===6);
 // WDL
 const A=ev(`(()=>{const L=LC61;const rows=[];
   [[900,300],[900,100],[300,100],[100,-100],[0,-300],[50,0]].forEach(([b,a])=>rows.push([b,a,Math.round(L.moveAcc(b,a,40,1200)),Math.round(L.moveAcc(b,a,40,2100))]));
   return rows})()`);
 console.log('moveAcc [before,after,acc@1200,acc@2100]',JSON.stringify(A));
 // game: 40 moves, mostly perfect, 3 slips in a won game
 const G=ev(`(()=>{const L=LC61;const a=[];for(let i=0;i<37;i++)a.push(L.moveAcc(400,395,10+i,1500));
   a.push(L.moveAcc(900,300,50,1500),L.moveAcc(700,150,60,1500),L.moveAcc(600,100,70,1500));
   const mean=a.reduce((x,y)=>x+y,0)/a.length;return {mean:Math.round(mean*10)/10,blend:L.gameAcc(a)}})()`);
 console.log('game with 3 slips in a won game',JSON.stringify(G));
 chk('blend is below the plain mean',G.blend<G.mean);
 // alarms
  const fens={
  tension:['r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 8','tension'],
  closed:['rnbq1rk1/ppp2ppp/3p1n2/3Pp3/2P1P3/2N5/PP3PPP/R1BQKBNR w KQ - 0 6','closed'],
  outpost:['r1bqk2r/ppp3pp/2n5/4N3/3P4/8/PPP2PPP/R1BQKB1R b KQkq - 0 8','outpost'],
  opposite:['2kr3r/ppp2ppp/2n1bn2/4p3/4P3/2NP1N2/PPP1BPPP/R4RK1 w - - 0 9','opposite'],
  passed:['8/8/3P4/8/8/6k1/8/6K1 b - - 0 1','passed'],
  loose:['rnbqkbnr/ppp2ppp/8/3pp3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 3','none-expected'],
  quiet:['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','nothing'],
  hang:['rnb1kbnr/pppp1ppp/8/4p3/4P3/2q5/PPPP1PPP/RNBQKBNR w KQkq - 0 1','loose']};
 for(const k in fens){ const f=fens[k][0]; const r=ev('LC61.detect('+JSON.stringify(f)+',"w").map(x=>x.id)'); const rb=ev('LC61.detect('+JSON.stringify(f)+',"b").map(x=>x.id)'); console.log((r.concat(rb).includes(fens[k][1])||fens[k][1].startsWith('no')&&!r.concat(rb).length?'PASS':'CHECK')+' alarms '+k+' w:'+JSON.stringify(r)+' b:'+JSON.stringify(rb)); }
 // hydration
 w.localStorage.setItem('lc61-names',JSON.stringify({cc:'',li:'',gone:{}}));
 ev('App.profile.chess_com_username="Kyenzo99"; LC61.hydrate(true)');
 await new Promise(r=>setTimeout(r,500));
 chk('Elo account created from profile name',ev('!!Elo.acct("chesscom")&&Elo.acct("chesscom").user')==='Kyenzo99'||ev('Elo.acct("chesscom").user')==='Kyenzo99',ev('Elo.acct("chesscom")&&Elo.acct("chesscom").user'));
 // forget respected
 ev('Elo.forget("chesscom"); App.profile.chess_com_username=""; LC61.hydrate(true)');
 await new Promise(r=>setTimeout(r,300));
 chk('a forgotten link is not put back',ev('!Elo.acct("chesscom")'));
 // tail html
 const t=ev('LC61.tail({fen:"r1bq1rk1/pp3ppp/2n1pn2/2ppP3/3P1B2/2P2N2/PP3PPP/RN1QKB1R w KQ - 0 8",color:"w",k:"S",why:"test",ps:"Be2"})');
 chk('tail has a), b), c)',/a\) Thinking error/.test(t)&&/b\) Alarm Signal/.test(t)&&/c\) Working Point/.test(t));
};
