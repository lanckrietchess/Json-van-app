const fs=require('fs');const {Chess}=require('chess.js');global.Chess=Chess;
global.Store={m:{},get(k,d){return k in this.m?this.m[k]:d},set(k,v){this.m[k]=v}};global.toast=()=>{};global.window=global;global.location={hash:"",host:"x"};global.document={querySelector:()=>null,querySelectorAll:()=>[]};
global.LC61={detect:()=>[{id:"king",label:"Exposed king",say:"No pawn cover.",letter:"P"}]};global.LC64={actionOf:()=>"Count attackers before you grab a pawn."};
const LC79=new Function(fs.readFileSync(require('path').join(__dirname,'..','lc79.js'),'utf8').replace('/*@@module lc79*/','').replace('/*@@end lc79*/','')+';return LC79;')();
let P=0,F=0;const ok=(c,m)=>{c?P++:F++;console.log((c?'PASS ':'FAIL ')+m)};
const pgn='1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. h3 h6 8. Re1 a6 9. Nbd2 Ba7 10. Nf1 Qe7 11. Ng3 Qd7 12. Be3 Qxh3 13. gxh3';
const c=new Chess();c.load_pgn(pgn);const h=c.history({verbose:true}),r=new Chess(),fens=[r.fen()],moves=[];h.forEach(m=>{const n=+r.fen().split(' ')[5];r.move(m.san);moves.push({san:m.san,color:m.color,from:m.from,to:m.to,num:n});fens.push(r.fen())});
const g={moves,fens,headers:{White:"Kyenzo",Black:"Student",WhiteElo:"1500",BlackElo:"1210",Result:"1-0"}};
const it={i:23,color:"b",san:"Qxh3",num:12,cls:"blunder",best:"a7e3",bestSan:"Bxe3",reply:"g2h3",replySan:"gxh3",loss:40,k:"M"};
const ch=LC79.boardChange(g,it);console.log('  change:',ch);
ok(ch.some(x=>/took the pawn on h3/.test(x)),'mentions the captured pawn');ok(!ch.some(x=>/pawn on c7|pawn on f7/.test(x)),'no noise about pawns nobody can win');
ok(ch.some(x=>/queen on h3 can be taken by the pawn on g2, a piece of lower value/.test(x)),'mentions the queen is attacked by g2 and undefended');
// lost defence: bishop moves away from defending a pawn
const f2="4k3/8/8/8/8/5p2/4B3/4K3 w - - 0 1";// Be2 defends nothing relevant; build: white pawn f2 defended by Ke1... use rook
const f3="4k3/8/8/1r6/8/8/1P6/1R2K3 w - - 0 1";const b3=new Chess(f3);b3.move("Rc1");
const g3={moves:[{san:"Rc1",color:"w",from:"b1",to:"c1",num:1}],fens:[f3,b3.fen()],headers:{}};
const ch3=LC79.boardChange(g3,{i:0,color:"w",san:"Rc1",num:1});console.log('  change3:',ch3);
ok(ch3.some(x=>/no longer defends the pawn on b2, which is now attacked by the rook on b5 and has no defender left/.test(x)),'lost defence of a pawn is described');
ok(LC79.numbered("4k3/8/8/8/8/8/8/R3K3 b - - 0 23",["e8d8","a1a8"])==="23... Kd8 24. Ra8+",'winning line with move numbers: '+LC79.numbered("4k3/8/8/8/8/8/8/R3K3 b - - 0 23",["e8d8","a1a8"]));
// prompt
const A=LC79._ai;A.g=g;A.list=[it];A.ci=0;
A.cs={it,fen:fens[23],color:"b",letter:"M",alarm:{label:"Exposed king",say:"No pawn cover."},motif:LC79.motifOf(g,it),wp:"Before every move, say what their last move changed.",action:"Count attackers.",rating:1210,student:"Student",qs:LC79.socratic(g,it,{alarm:{label:"Exposed king",say:"x"},motif:LC79.motifOf(g,it)}),change:ch};
A.sim={id:"abc12",rating:1300,themes:["fork","middlegame"],fen:"4k3/8/8/8/8/8/8/R3K3 b - - 0 23",side:"b",solSan:["Kd8","Ra8#"],line:"23... Kd8 24. Ra8#"};
const p=LC79.buildPrompt();fs.writeFileSync(require('path').join(require('os').tmpdir(),'lc79_prompt.txt'),p);
ok(/^GAME CONTEXT\n/.test(p)&&/\nMSPC DIAGNOSIS\n/.test(p)&&/\nLICHESS SIMILAR POSITION\n/.test(p),'three data sections');
ok(!/\b(seconds?|beat|HOOK|CTA|STRUCTURE|RULES|0:00|\d+ to \d+ s)\b/.test(p.replace(LC79.CLOSE,"")),'no structure, beats, timings or rules in the data');
ok(p.trim().endsWith(LC79.CLOSE)&&LC79.CLOSE==="Based on this game data, generate a ~90-second high-retention viral script strictly following your v2.5 Master System Instructions and Project Knowledge Library.",'ends with exactly the closing line');
ok(/- Move: .+\n- Specifics: .+\n- Alarm Signal: .+\n- Working Point \(Move\): .+\n- Action Step: .+/.test(p),'MSPC diagnosis fields in order');
ok(/- FEN: 4k3\/8\/8\/8\/8\/8\/8\/R3K3 b - - 0 23\n- Side to move: Black\n- Winning line \(to the end of the combination\): 23\.\.\. Kd8 24\. Ra8#/.test(p),'Lichess FEN and full winning line');
ok(/What it changed on the board: .*queen on h3/.test(p),'board change in game context');
ok(!/\n\n\n/.test(p),'no empty gaps');
const mq=LC79.motifOf(g,it);ok(mq.id==='hanging'&&/gxh3 wins the queen for a pawn/.test(mq.text),'Qxh3?? gxh3 = queen lost for a pawn: '+mq.text);
console.log('RESULT',P,'passed',F,'failed');
