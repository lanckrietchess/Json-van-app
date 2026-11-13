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
// ---- Studio 2.0 NLE: silences, split, trim, delete, ripple, captions ----
const TK={};global.LanckrietStudio={_t:{Takes:{list:[],get:id=>TK[id]||null,persistMeta(){}},Trim:{thr:-45}}};
// 20 s take: voice 0-2, silence 2-7 (5 s), voice 7-9, silence 9-11.5 (2.5 s), voice 11.5-14, silence 14-20 (6 s, trailing)
const envT=[];for(let i=0;i<200;i++){const t=i*.1;envT.push((t<2)||(t>=7&&t<9)||(t>=11.5&&t<14)?-18:-62)}
const thr=LC79.envThr(envT,-45);ok(thr>-62&&thr<-18,'adaptive threshold sits between floor and voice ('+thr+')');
ok(LC79.envThr([-50,-50,-50,-50,-50,-50,-50,-50,-50,-50,-50],-45)===-45,'flat level track falls back to the Trim threshold');
const q4=LC79.findQuiet(envT,thr,4,0,20);ok(q4.length===2&&Math.abs(q4[0].s-2)<.01&&Math.abs(q4[0].e-7)<.01&&Math.abs(q4[1].s-14)<.01,'silences over 4 s: 2-7 and the trailing 14-20 ('+JSON.stringify(q4)+')');
const k4=LC79.speechRanges(envT,0,20,4,thr);
ok(k4.length===2&&k4[0].s===0&&Math.abs(k4[0].e-2.2)<.01&&Math.abs(k4[1].s-6.8)<.01&&Math.abs(k4[1].e-14.2)<.01,'speech pieces at 4 s keep 0.2 s of air and cut the trailing silence ('+JSON.stringify(k4)+')');
const k15=LC79.speechRanges(envT,0,20,1.5,thr);ok(k15.length===3,'at 1.5 s the 2.5 s pause is cut too (3 pieces)');
ok(JSON.stringify(LC79.complement([{s:1,e:2},{s:3,e:4}],0,5))==='[{"s":0,"e":1},{"s":2,"e":3},{"s":4,"e":5}]','complement of keep ranges = cuts');
ok(JSON.stringify(LC79.minus([{s:0,e:10}],[{s:2,e:3},{s:2.5,e:4},{s:9,e:12}]))==='[{"s":0,"e":2},{"s":4,"e":9}]','ranges minus overlapping cuts');
TK.a={id:"a",name:"Take 1",url:"blob:a",durationMs:20000,env:envT.slice(),cuts:[],trimIn:0,trimOut:20,captions:[{s:7.2,e:8.6,t:"second piece"}]};
const sil=LC79.autoSilence(TK.a,4);ok(sil.n===2&&TK.a.cuts.length===2&&TK.a.cuts.every(c=>c.auto&&c.lc79),'after a take: 2 silences over 4 s become auto cuts ('+sil.sec+' s)');
ok(LC79.autoSilence(TK.a,4).n===0,'running it again adds nothing');
const P={id:"p",clips:[],callouts:[],useCuts:true};
P.clips=LC79.clipsFor(TK.a,P);ok(P.clips.length===2&&P.clips.every(c=>c.raw),'the take comes in as 2 blocks (its voice pieces)');
let segs=LC79.segments(P);ok(segs.length===2&&Math.abs(segs[1].T0-2.2)<.01,'ripple: block 2 starts right after block 1 (T0 '+segs[1].T0+')');
const tot0=segs.total;
const r15=LC79.cutSilences(P,1.5,-45);ok(r15.places===1&&P.clips.length===3&&Math.abs(r15.removed-2.1)<.05,'Cut silences 1.5 s: the 2.5 s pause goes, '+r15.removed+' s shorter');
ok(LC79.cutSilences(P,1.5,-45).places===0,'cutting again finds nothing');
const nb=LC79.splitAt(P,1.0);ok(nb&&P.clips.length===4&&Math.abs(P.clips[0].out-1)<.001&&Math.abs(P.clips[1].in-1)<.001,'blade at 1.0 s splits block 1 in two');
ok(LC79.splitAt(P,0)===null,'no split on an edge');
const before=LC79.segments(P).total;LC79.trimClip(P,P.clips[1].id,"r",1.5);segs=LC79.segments(P);
ok(Math.abs(before-segs.total-.7)<.01&&Math.abs(segs[2].T0-1.5)<.01,'trim the end: the next block moves up, no gap ('+segs[2].T0+')');
LC79.trimClip(P,P.clips[1].id,"l",5);ok(P.clips[1].in<=P.clips[1].out-.1+1e-9,'trim never makes a block shorter than 0.1 s');
const del=P.clips[2].id;ok(LC79.deleteClip(P,del)&&P.clips.length===3,'delete removes the block');
segs=LC79.segments(P);let gap=0;for(let i=1;i<segs.length;i++)gap=Math.max(gap,Math.abs(segs[i].T0-(segs[i-1].T0+segs[i-1].e-segs[i-1].s)));ok(gap<1e-9,'magnetic: no gap anywhere after split, trim and delete');
ok(LC79.capLine(TK.a,8).t==="second piece"&&LC79.capLine(TK.a,9)===null,'captions are timed on the take, so they follow the cut blocks');
const st=LC79.capStyle({cap:{x:.3,scale:1.5}},1080,1920);ok(st.x===.3&&st.scale===1.5&&st.y===.78&&st.box===true,'caption box style: own place and size, defaults for the rest');
// drawCaption on a stub canvas: box follows x/y and scale
const calls=[];const cg={save(){},restore(){},measureText:t=>({width:String(t).length*10}),fillText(){},strokeText(){},beginPath(){},moveTo(){},arcTo(){},closePath(){},fill(){calls.push('fill')},set font(v){},set textAlign(v){},set textBaseline(v){},set fillStyle(v){},set globalAlpha(v){},set shadowColor(v){},set shadowBlur(v){},set lineJoin(v){},set lineWidth(v){},set strokeStyle(v){}};
const b1=LC79.drawCaption(cg,1080,1920,{t:"hello there"},LC79.capStyle({cap:{x:.5,y:.5}},1080,1920),0),b2=LC79.drawCaption(cg,1080,1920,{t:"hello there"},LC79.capStyle({cap:{x:.5,y:.5,scale:2}},1080,1920),0);
ok(b1&&Math.abs(b1.y+b1.h/2-960)<1&&b2.h>b1.h*1.5&&calls.length===2,'caption box centred on its place, scale makes it bigger, background drawn');
ok(LC79.drawCaption(cg,1080,1920,{t:"x"},LC79.capStyle({cap:{box:false}},1080,1920),0)&&calls.length===2,'box off: no background');
const ev=LC79.envOf({numberOfChannels:1,length:4410,sampleRate:44100,getChannelData:()=>{const a=new Float32Array(4410);for(let i=0;i<2205;i++)a[i]=.5*Math.sin(i/5);return a}});ok(ev.length===1&&ev[0]<-6&&ev[0]>-20,'decoded audio gives an RMS level in dB per 0.1 s ('+ev[0]+')');
ok(LC79.envDt({env:new Array(95),durationMs:10000})>0.104&&LC79.envDt({env:new Array(100),durationMs:10000})===.1,'level timing stretches to the real take length when the timer drifted');
console.log('RESULT',pass,'passed',fail,'failed');process.exit(fail?1:0);
