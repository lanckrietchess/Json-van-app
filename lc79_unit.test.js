const fs=require('fs');const {Chess}=require('chess.js');global.Chess=Chess;
global.Store={m:{},get(k,d){return k in this.m?this.m[k]:d},set(k,v){this.m[k]=v}};global.toast=()=>{};
global.window=global;global.location={hash:"",host:"lanckrietchesstrainerhub.vercel.app"};global.document={querySelector:()=>null,querySelectorAll:()=>[]};
const src=fs.readFileSync(require('path').join(__dirname,'..','lc79.js'),'utf8');const LC79=new Function(src.replace('/*@@module lc79*/','').replace('/*@@end lc79*/','')+';return LC79;')();
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+m)};
// alignLive: speech 1.0-2.5s and 3.0-4.0s; captions start in silence
const env=[];for(let i=0;i<50;i++){const t=i*.1;env.push((t>=1&&t<2.5)||(t>=3&&t<4)?-20:-60)}
const out=LC79.alignLive([{s:.5,e:2.2,t:"hello there my friend"},{s:2.6,e:3.6,t:"second line"}],env,-45);
ok(Math.abs(out[0].s-1.0)<.01,'caption 1 snapped to voice onset 1.0 (got '+out[0].s+')');
ok(Math.abs(out[0].e-2.58)<.05,'caption 1 ends at voice end (got '+out[0].e+')');
ok(Math.abs(out[1].s-3.0)<.01,'caption 2 snapped to 3.0 (got '+out[1].s+')');
ok(out[0].e<=out[1].s,'no overlap');
const keepLoud=LC79.alignLive([{s:1.5,e:2.0,t:"mid speech"}],env,-45);ok(keepLoud[0].s===1.5,'start inside speech is untouched');
ok(LC79.alignLive([],env).length===0&&LC79.alignLive([{s:0,e:1,t:"x"}],[]).length===1,'empty input safe');
// motif: fork. White plays 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?? ... construct: knight fork Nc7+ style
function G(pgn){const g=new Chess();g.load_pgn(pgn);const h=g.history({verbose:true});const r=new Chess();const fens=[r.fen()],moves=[];h.forEach(m=>{r.move(m.san);moves.push({san:m.san,color:m.color,from:m.from,to:m.to,num:Math.ceil((moves.length+1)/2)});fens.push(r.fen())});return{moves,fens,headers:{White:"A",Black:"B",WhiteElo:"1210",BlackElo:"1190"}}}
// Black blunders 3...Qe7?? allowing ... simpler: classic fork: 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6?? 5.Nxe5 (Legal's) ; use knight fork: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4 4.Nxe5 Qg5 5.Nxf7?? Qxg2
let g=G("1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4 4.Nxe5 Qg5 5.Nxf7 Qxg2");
let it={i:8,color:"w",san:"Nxf7",num:5,best:"e5f3",reply:"g5g2",replySan:"Qxg2",loss:40,cls:"blunder",bestSan:"Nf3"};
let mo=LC79.motifOf(g,it);ok(!!mo&&!!mo.id,'motif found: '+mo.id+' / '+mo.text);
// fork test: position where reply Nc2+ forks king and rook
g=G("1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4 4.Nxe5 Qg5 5.Bxf7+ Ke7 6.d4 Qxg2 7.Rf1 Qxe4+ 8.Be2 Nf3#");
// simpler: craft by FEN-free: White Ke1 Ra1, Black knight can go to c2. Use direct fens
const f1="r3k2r/8/8/8/3n4/8/8/R3K2R w KQkq - 0 1";const a=new Chess(f1);const m1=a.move("Rh2");
const g2={moves:[{san:"Rh2",color:"w",from:"h1",to:"h2",num:1}],fens:[f1,a.fen()],headers:{}};
mo=LC79.motifOf(g2,{i:0,color:"w",san:"Rh2",num:1,best:null,reply:"d4c2",replySan:"Nc2+"});
ok(mo.id==="fork",'knight check+attack recognised: '+mo.id+' / '+mo.text);
// hanging piece
const f3="4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1";const b3=new Chess(f3);b3.move("Qd4");
mo=LC79.motifOf({moves:[{san:"Qd4",color:"w",from:"d1",to:"d4",num:1}],fens:[f3,b3.fen()],headers:{}},{i:0,color:"w",san:"Qd4",num:1,reply:"d5d4",replySan:"Qxd4"});
ok(mo.id==="hanging",'hanging piece: '+mo.id);
// mate missed
const f4="6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1";const b4=new Chess(f4);b4.move("Kf1");
mo=LC79.motifOf({moves:[{san:"Kf1",color:"w",from:"g1",to:"f1",num:1}],fens:[f4,b4.fen()],headers:{}},{i:0,color:"w",san:"Kf1",num:1,best:"a1a8",reply:null});
ok(mo.id==="mate",'missed mate in 1: '+mo.label);
// trimmed pgn
g=G("1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4 4.Nxe5 Qg5 5.Nxf7 Qxg2 6.Rf1");
const tp=LC79.trimmedPgn(g,{i:8,color:"w",san:"Nxf7",num:5,cls:"blunder",bestSan:"Nf3",replySan:"Qxg2"});
ok(/5\. Nxf7\?\? \(5\. Nf3\) \{Punished by Qxg2\} Qxg2/.test(tp),'trimmed PGN marks the mistake: '+tp.split('\n').pop());
const plain=LC79.trimmedPgn(g,{i:8,color:"w",san:"Nxf7",num:5},true);const cc=new Chess();ok(cc.load_pgn(plain),'plain trimmed PGN loads in chess.js: '+plain);
// callout
const c=LC79.makeCallout(LC79.BUILT[0],1.2);ok(c.text==="2105 ELO Coach"&&c.sound==="ping"&&c.arrow&&c.t===1.2,'authority preset callout');
console.log('RESULT',pass,'passed',fail,'failed');process.exit(0);
