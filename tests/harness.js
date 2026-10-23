/* Loads lc25.js into a jsdom window with stand-ins for the app's globals. */
const {JSDOM}=require('jsdom');
const fs=require('fs'),path=require('path');
const {Chess}=require('chess.js');
function make(extra){
  const dom=new JSDOM('<!doctype html><body><div id="view"></div></body>',{url:'https://lanckrietchess-app.vercel.app/#openings',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  const store={};
  const toasts=[],sheets=[],xp=[];
  Object.assign(w,{
    Chess,
    Store:{get:(k,d)=>k in store?store[k]:d,set:(k,v)=>{store[k]=v},del:k=>{delete store[k]}},
    toast:(m,k)=>toasts.push([m,k]),
    icon:n=>'',
    esc:s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    V6:{state:()=>({total:w.__total||0}),addXp:(m,n,o)=>{xp.push([m,n,o]);w.__total=(w.__total||0)+n}},
    V34:{myRating:()=>1000},
    Admin:{active:false},
    App:{onboarded:false,profile:{name:'Sam'},save(){}},
    openSheet:o=>{
      const el=w.document.createElement('div');el.className='sheet-wrap';el.innerHTML='<div class="sheet"><div class="sheet-body">'+(o.html||'')+'</div></div>';
      w.document.body.appendChild(el);
      const s={el,close(){if(s.closed)return;s.closed=true;el.remove();o.onClose&&o.onClose()}};
      el.addEventListener('click',e=>{if(e.target.closest('[data-close]'))s.close()});
      sheets.push({o,s});o.onMount&&o.onMount(s);return s;
    },
    Board:(host,opts)=>{const api={opts,fen:opts.fen,interactive:null,arrows:[],shakes:0,setPosition(f){api.fen=f},setInteractive(c){api.interactive=c},setArrows(a){api.arrows=a},shake(){api.shakes++},fenNow:()=>api.fen};host.__board=api;host.innerHTML='<div class="lc-board"></div>';return api},
    V71:{me:()=>({ref_link:'https://lanckrietchess-app.vercel.app/?ref=sam123'}),member:async(n,x)=>{w.__rpc=(w.__rpc||[]).concat([[n,x]]);return{ok:true}}},
    SKOOL_URLS:{community:'https://www.skool.com/lanckriet-chess-1924'},
    fetchWithTimeout:(...a)=>w.fetch(...a),
    sanitizeProfile:x=>x,
  });
  if(extra)extra(w,{store,toasts,sheets,xp});
  const cand=[path.join(__dirname,'..','src','v25','lc25.js'),path.join(__dirname,'..','lc25.js')];const src=fs.readFileSync(cand.find(f=>fs.existsSync(f)),'utf8');
  w.eval(src);
  return{w,dom,store,toasts,sheets,xp,L:w.LC25};
}
module.exports={make,Chess};
