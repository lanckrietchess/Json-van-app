import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
/* Minimal UCI driver around the Stockfish.js 16 wasm build (Node). One search at a time. */
export function startEngine(opts={}){
  const file=path.join(here,'node_modules/stockfish/src/stockfish-nnue-16-no-simd.js');
  const p=spawn('node',[file],{stdio:['pipe','pipe','inherit']});
  let buf='',waiter=null,lines=[];
  p.stdout.on('data',d=>{buf+=d;const a=buf.split('\n');buf=a.pop();for(const l of a){if(waiter)waiter(l)}});
  const send=c=>p.stdin.write(c+'\n');
  const until=(re)=>new Promise(res=>{const got=[];waiter=l=>{got.push(l);if(re.test(l)){waiter=null;res(got)}}});
  const ready=async()=>{send('uci');await until(/^uciok/);send('setoption name Threads value 1');send('setoption name Hash value 32');send('isready');await until(/^readyok/)};
  const parse=(got)=>{ /* last info line per multipv + bestmove */
    const lines={};let best=null;
    for(const l of got){
      if(l.startsWith('bestmove')){best=l.split(' ')[1];continue}
      if(!l.startsWith('info')||!/ score /.test(l)||!/ pv /.test(l))continue;
      const t=l.split(/\s+/);const o={multipv:1,cp:null,mate:null,pv:[],depth:0};
      for(let i=1;i<t.length;i++){const k=t[i];if(k==='depth')o.depth=+t[++i];else if(k==='multipv')o.multipv=+t[++i];else if(k==='score'){const kind=t[++i],v=+t[++i];if(kind==='cp')o.cp=v;else o.mate=v}else if(k==='pv'){o.pv=t.slice(i+1);break}}
      lines[o.multipv]=o;
    }
    return{best,lines:Object.values(lines).sort((a,b)=>a.multipv-b.multipv)};
  };
  return{
    ready,
    async analyse(fen,{depth=10,multipv=1}={}){send('setoption name MultiPV value '+multipv);send('position fen '+fen);const w=until(/^bestmove/);send('go depth '+depth);return parse(await w)},
    quit(){try{send('quit')}catch(e){}p.kill()}
  };
}
