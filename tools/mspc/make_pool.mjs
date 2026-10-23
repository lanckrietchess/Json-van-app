/* Builds the built-in mini-puzzle pool: positions with EXACTLY ONE checkmating move (so the answer is never ambiguous), both colours to move,
   a mix of mating patterns. Reproducible (seeded). Every entry is verified with chess.js. */
import {Chess} from './mspc.mjs';
let seed=20261021;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const files='abcdefgh';
const sq=()=>files[Math.floor(rnd()*8)]+(1+Math.floor(rnd()*8));
function mates(fen){const g=new Chess(fen);return g.moves({verbose:true}).filter(m=>{const h=new Chess(fen);h.move(m);return h.in_checkmate()})}
const hand=[ /* classic patterns, verified below */
 ['6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1','back rank'],
 ['r5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1','back rank'],
 ['6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1','smothered'],
 ['7k/R7/1R6/8/8/8/8/6K1 w - - 0 1','rook ladder'],
 ['6k1/8/8/8/8/8/r7/1r4K1 b - - 0 1','rook ladder'],
 ['7k/8/5NK1/8/8/8/8/6R1 w - - 0 1','knight and rook'],
];
const out=[];const seen=new Set();
for(const [fen,tag] of hand){const m=mates(fen);if(m.length===1&&!seen.has(fen)){seen.add(fen);out.push({fen,tag,solution:[m[0].from+m[0].to+(m[0].promotion||'')]})}else console.error('hand position rejected (',m.length,'mates):',fen)}
/* random: K + 2..3 attacking pieces vs K (+ up to 3 pawns); keep unique mate-in-1, not in check, legal, not stalemate-trivial */
let tries=0;
while(out.length<16&&tries<400000){
  tries++;
  const pieces={};const put=(p)=>{let s;do{s=sq()}while(pieces[s]);pieces[s]=p};
  const white=rnd()<.5;
  const A=white?'':'';  // attacker colour letter handled below
  const att=white?'w':'b',def=white?'b':'w';
  const mk=(c,t)=>c==='w'?t.toUpperCase():t;
  put(mk(att,'k'));put(mk(def,'k'));
  const kinds=['q','r','r','b','n'];
  const n=2+Math.floor(rnd()*2);for(let i=0;i<n;i++)put(mk(att,kinds[Math.floor(rnd()*kinds.length)]));
  const dp=Math.floor(rnd()*4);for(let i=0;i<dp;i++){let s;do{s=sq()}while(pieces[s]||s[1]==='1'||s[1]==='8');pieces[s]=mk(def,'p')}
  let rows=[];for(let r=8;r>=1;r--){let row='',e=0;for(const f of files){const p=pieces[f+r];if(!p)e++;else{if(e){row+=e;e=0}row+=p}}if(e)row+=e;rows.push(row)}
  const fen=rows.join('/')+' '+att+' - - 0 1';
  const g=new Chess();if(!g.load(fen))continue;
  if(g.in_check()||g.in_checkmate()||g.in_stalemate()||g.game_over())continue;
  // the side NOT to move must not be in check
  const f2=fen.replace(' '+att+' ',' '+def+' ');const g2=new Chess();if(g2.load(f2)&&g2.in_check())continue;
  const m=mates(fen);if(m.length!==1)continue;
  const mv=m[0];if(mv.captured)continue;                       // a capture-mate is too easy to spot by accident
  if(seen.has(fen))continue;
  // variety: at most 3 per mating piece
  const cnt=out.filter(o=>o.piece===mv.piece).length;if(cnt>=4)continue;
  seen.add(fen);out.push({fen,tag:'mate in one',piece:mv.piece,solution:[mv.from+mv.to+(mv.promotion||'')]});
}
const final=out.slice(0,16).map((o,i)=>({id:'lc25-m1-'+String(i+1).padStart(2,'0'),fen:o.fen,tag:o.tag,solution:o.solution}));
console.error('pool:',final.length,'| white to move:',final.filter(p=>p.fen.split(' ')[1]==='w').length,'| tries',tries);
console.log(JSON.stringify(final));
