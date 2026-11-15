// LC83 truth engine: facts only, no invented attacks. Run: node tests/lc83_truth.test.js (needs chess.js@0.10.3 next to it)
const fs=require('fs');const {Chess}=require('chess.js');global.Chess=Chess;
global.Store={m:{},get(k,d){return k in this.m?this.m[k]:d},set(k,v){this.m[k]=v}};global.window=global;global.document={querySelector:()=>null,querySelectorAll:()=>[]};
const L=new Function(fs.readFileSync(require('path').join(__dirname,'..','lc83.js'),'utf8').replace('/*@@module lc83*/','').replace('/*@@end lc83*/','')+';return LC83;')();
let P=0,F=0;const ok=(c,m)=>{c?P++:F++;console.log((c?'PASS ':'FAIL ')+m)};
// 1. a quiet h5: it "hits" g4, but g4 is defended by h3 and a pawn for a pawn wins nothing
let f=L.moveFacts("rnbqkbnr/pppppppp/8/8/6P1/7P/PPPPPP2/RNBQKBNR b KQkq - 0 2","h7h5","w");
ok(f&&f.san==="h5"&&f.quiet&&!f.facts.some(x=>/attacks/.test(x.t)),'h5 next to a defended g4 pawn is quiet, no "attack" claimed: '+JSON.stringify(f&&f.facts));
// 2. the same push when g4 has NO defender: a real threat
f=L.moveFacts("rnbqkbnr/pppppppp/8/8/6P1/8/PPPPPP1P/RNBQKBNR b KQkq - 0 1","h7h5","w");
ok(f.facts.some(x=>x.k==="threat"&&/your pawn on g4, which has no defender/.test(x.t)),'h5 against an undefended g4 is a real threat: '+f.facts.map(x=>x.t).join(' | '));
// 3. Be3 in the Qxh3 game: hits a7 (defended bishop, equal value) and h6 (defended pawn): quiet, NOT "it attacks the bishop on a7 and the pawn on h6"
const pgn='1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. h3 h6 8. Re1 a6 9. Nbd2 Ba7 10. Nf1 Qe7 11. Ng3 Qd7';
const c=new Chess();c.load_pgn(pgn);const before=c.fen();
f=L.moveFacts(before,"c1e3","b");
ok(f.san==="Be3"&&!f.facts.some(x=>/attacks (their|your) (bishop|pawn)/.test(x.t)),'Be3 (defended a7 and h6) claims no attack: '+JSON.stringify(f.facts.map(x=>x.t)));
// 4. a knight that attacks an undefended queen-side rook and a defended pawn: only the rook counts
f=L.moveFacts("r3k3/8/8/8/8/8/8/4K1N1 w - - 0 1","g1f3","b");
ok(!f.facts.some(x=>/rook/.test(x.t)),'a knight that does not reach a8 claims nothing about it');
f=L.moveFacts("4k3/8/8/2r5/8/8/4N3/4K3 w - - 0 1","e2d4","b");ok(!f.facts.some(x=>/rook/.test(x.t)),'Nd4 does not reach c5: no claim');
f=L.moveFacts("4k3/8/8/2r5/8/8/8/3NK3 w - - 0 1","d1b2","b");f=L.moveFacts("4k3/8/8/2r5/8/8/1N6/4K3 w - - 0 1","b2d3","b");
ok(f.facts.some(x=>x.k==="threat"&&/your rook on c5/.test(x.t)),'Nd3 hits the undefended rook on c5 (from Black\'s point of view: "your rook"): '+f.facts.map(x=>x.t));
// 5. lost defence: the rook leaves b1 and the b2 pawn is now loose against Rb5
f=L.moveFacts("4k3/8/8/1r6/8/8/1P6/1R2K3 w - - 0 1","b1c1","w");
ok(f.facts.some(x=>x.k==="undefend"&&/stopped defending your pawn on b2/.test(x.t)),'lost defence named: '+f.facts.map(x=>x.t));
// 6. king shield, opened line, passed pawn
f=L.moveFacts("r4rk1/ppp2ppp/8/8/8/8/PPP2PPP/R4RK1 w - - 0 1","g2g4","w");
ok(f.facts.some(x=>x.k==="shield"),'g4 in front of the castled king is named');
f=L.moveFacts("4k3/8/8/8/8/8/1P6/B3K3 w - - 0 1","b2b4","w");
ok(f.facts.some(x=>x.k==="opened"&&/diagonal for your bishop on a1/.test(x.t))&&!f.facts.some(x=>x.k==="passed"),'opened diagonal; the pawn was already passed, so no "now passed" claim: '+f.facts.map(x=>x.t));
f=L.moveFacts("4k3/2p5/8/1P6/8/8/8/4K3 w - - 0 1","b5b6","w");ok(!f.facts.some(x=>x.k==="passed"),'b6 next to the c7 pawn is not passed');
f=L.moveFacts("4k3/8/2p5/1P6/8/8/8/4K3 w - - 0 1","b5c6","w");ok(f.facts.some(x=>x.k==="passed")&&f.facts.some(x=>x.k==="capture"),'bxc6 creates a passed pawn: '+f.facts.map(x=>x.t));
// 7. explain(): Qxh3?? gxh3 is S (the queen was left to be taken by a cheaper piece), the M of Be3 is quiet, the C names gxh3 taking the queen
const c2=new Chess();c2.load_pgn(pgn+' 12. Be3');const fen=c2.fen();const prev=before;
const E=L.explain({fen:fen,color:"b",played:{from:"d7",to:"h3",san:"Qxh3"},bestUci:"a7e3",replyUci:"g2h3",prevFen:prev,oppUci:"c1e3"});
console.log('  ',JSON.stringify(E,null,1).slice(0,1200));
ok(/Their last move Be3 was quiet: it attacks nothing you can lose/.test(E.M),'M: Be3 is quiet (no invented attack)');
ok(/better move was Bxe3/.test(E.P)&&/took their bishop on e3/.test(E.P),'P: the better move Bxe3 with its fact');
ok(/their best answer is gxh3/.test(E.C)&&/took your queen on h3/.test(E.C),'C: gxh3 takes the queen');
ok(E.k==="S"||E.k==="P",'letter is S or P, not M (the opponent made no threat): '+E.k);
// 8. a real M: their knight attacks the undefended rook, you ignore it, they take it
const fenM="r3k3/8/8/8/8/5n2/8/R3K3 w - - 0 1"; // white to move; black knight f3 just came from g5? build prev
const E2=L.explain({fen:"4k3/8/8/2r5/8/3N4/8/4K3 b - - 1 1",color:"b",played:{from:"e8",to:"e7",san:"Ke7"},bestUci:"c5c1",replyUci:"d3c5",prevFen:"4k3/8/8/2r5/8/8/1N6/4K3 w - - 0 1",oppUci:"b2d3"});
ok(/Their last move Nd3: It attacks your rook on c5, which has no defender/.test(E2.M)&&E2.k==="M",'M names the real threat and is the leak: '+E2.M);
ok(/better move was Rc1/.test(E2.P)&&!/took/.test(E2.P),'P for a quiet escape: no invented capture: '+E2.P);
const E3=L.explain({fen:"4k3/8/8/2r5/8/4N3/8/4K3 b - - 1 1",color:"b",played:{from:"e8",to:"e7",san:"Ke7"},bestUci:"c5c1",replyUci:"e3c4".replace("c4","c4"),prevFen:"4k3/8/8/2r5/8/8/8/3NK3 w - - 0 1",oppUci:"d1e3"});
// reply that takes the rook: Nxc... knight e3 does not reach c5; use a bishop instead
const E4=L.explain({fen:"4k3/8/8/2r5/8/4B3/8/4K3 b - - 1 1",color:"b",played:{from:"e8",to:"e7",san:"Ke7"},bestUci:"c5c1",replyUci:"e3c5",prevFen:"4k3/8/8/2r5/8/8/8/2B1K3 w - - 0 1",oppUci:"c1e3"});
ok(E4.k==="M"&&/attacks your rook on c5/.test(E4.M)&&/took your rook on c5/.test(E4.C),'ignored threat, then taken = M: '+E4.k+' / '+E4.C);
ok(Object.keys(L.NEXT).every(k=>!/promise|guarantee/i.test(L.NEXT[k])),'next-game orders make no promise');
// 9. threatsBy (only the position after the move is known)
ok(/attacks nothing you can lose/.test(L.threatsBy("rnbqkbnr/ppppppp1/8/7p/6P1/7P/PPPPPP2/RNBQKBNR w KQkq h6 0 3","h5","w").text),'threatsBy: pawn h5 vs defended g4 = nothing to lose');
ok(/your rook on c5 \(no defender\)/.test(L.threatsBy("4k3/8/8/2r5/8/4N3/8/4K3 b - - 1 1","e3","b").text)===false&&/attacks nothing/.test(L.threatsBy("4k3/8/8/2r5/8/4N3/8/4K3 b - - 1 1","e3","b").text),'threatsBy: a knight on e3 does not reach c5');
ok(/your rook on c5 \(no defender\)/.test(L.threatsBy("4k3/8/8/2r5/8/4B3/8/4K3 b - - 1 1","e3","b").text),'threatsBy: bishop e3 hits the undefended rook c5');
console.log('RESULT',P,'passed',F,'failed');
