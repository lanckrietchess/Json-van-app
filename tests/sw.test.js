const assert=require('assert');const fs=require('fs'),path=require('path'),vm=require('vm');
/* runs the real sw.js (9.26.0, network-first) against a fake cache store and a fake network */
const file=[path.join(__dirname,'..','sw.js'),path.join(__dirname,'..','..','sw.js')].find(f=>fs.existsSync(f));
const src=fs.readFileSync(file,'utf8');
let pass=0;const ok=(c,m)=>{assert(c,m);pass++;console.log('ok   '+m)};
function boot(ver,net,stores){
  const handlers={};let claimed=false;stores=stores||{};
  const mk=n=>(stores[n]=stores[n]||new Map());
  const key=r=>typeof r==='string'?new URL(r,'https://app.test/').pathname.replace(/^\//,''):new URL(r.url).pathname.replace(/^\//,'')+new URL(r.url).search;
  const caches={keys:async()=>Object.keys(stores),delete:async k=>delete stores[k],open:async n=>{const m=mk(n);return{add:async()=>{},match:async r=>m.get(key(r)),put:async(r,res)=>{m.set(key(r),res)}}}};
  const fetchFn=async(r,o)=>{net.calls=(net.calls||0)+1;net.last=o;if(net.down)throw new TypeError('offline');if(net.slow)await new Promise(x=>setTimeout(x,net.slow));const res=new Response(net.body||'',{status:net.status||200});Object.defineProperty(res,'type',{value:'basic'});return res};
  const self={location:new URL('https://app.test/sw.js?v='+ver),registration:{scope:'https://app.test/'},addEventListener:(t,f)=>{handlers[t]=f},skipWaiting(){},clients:{claim:async()=>{claimed=true}}};
  const ctx={self,caches,URL,Request,Response,Headers,fetch:fetchFn,Promise,console,Set,setTimeout,clearTimeout};
  vm.createContext(ctx);vm.runInContext(src,ctx);
  return{handlers,stores,mk,claimed:()=>claimed,ev(url,extra){let out;const waits=[];const x=extra||{};const req={url:url,method:'GET',mode:x.mode||'cors',headers:x.headers||new Headers()};handlers.fetch({request:req,respondWith:p=>{out=p},waitUntil:p=>waits.push(p)});return{out,waits}}};
}
(async()=>{
  /* 1. activate: every old shell cache goes (also the 9.25.0 stale-while-revalidate one), user data and libraries stay */
  const stores={'lc-shell-9.25.0':new Map(),'lc-shell-9.3.0':new Map(),'lc-lib-v1':new Map(),'lc-assets-v1':new Map(),'lc-coach-clips':new Map(),'lc-notes-v1':new Map(),'lc-old-junk':new Map(),'workbox-x':new Map(),'lc-shell-nf1-9.26.0':new Map()};
  const w=boot('9.26.0',{body:'NEW'},stores);
  let p;w.handlers.activate({waitUntil:x=>{p=x}});await p;
  ok(!stores['lc-shell-9.25.0']&&!stores['lc-shell-9.3.0']&&!stores['lc-old-junk']&&!stores['workbox-x'],'activate deletes every old shell cache and unknown caches');
  ok(stores['lc-lib-v1']&&stores['lc-assets-v1']&&stores['lc-coach-clips']&&stores['lc-notes-v1']&&stores['lc-shell-nf1-9.26.0'],'activate keeps this build, the libraries, the assets, coach clips and saved notes');
  ok(w.claimed(),'activate claims the open pages');
  /* 2. network-first: an old copy in the cache never wins while online */
  w.mk('lc-shell-nf1-9.26.0').set('app.html',new Response('OLD'));
  let r=w.ev('https://app.test/app.html?fresh=1793615024470',{mode:'navigate'});
  ok(!!r.out,'the worker answers navigations to /app.html (with any query)');
  let res=await r.out;ok((await res.text())==='NEW','online: the newest build from the network is served, not the cached one');
  await Promise.all(r.waits);ok((await w.mk('lc-shell-nf1-9.26.0').get('app.html').clone().text())==='NEW','and the fresh copy replaces the cached one');
  /* 3. offline: the cached copy keeps the app working */
  const off=boot('9.26.0',{down:true},{'lc-shell-nf1-9.26.0':new Map([['app.html',new Response('CACHED')]])});
  res=await off.ev('https://app.test/app.html?source=pwa',{mode:'navigate'}).out;ok((await res.text())==='CACHED','offline: the cached app opens');
  const empty=boot('9.26.0',{down:true},{});
  res=await empty.ev('https://app.test/app.html',{mode:'navigate'}).out;ok(res.status===503,'offline and never opened: a clear offline page (503)');
  /* 4. untouched */
  ok(w.ev('https://app.test/',{mode:'navigate'}).out===undefined,'the landing page "/" is never answered by the worker');
  ok(w.ev('https://app.test/content.json').out===undefined,'content.json goes straight to the network');
  ok(w.ev('https://app.test/version.json').out===undefined,'version.json goes straight to the network');
  ok(w.ev('https://app.test/reset.html',{mode:'navigate'}).out===undefined,'reset.html goes straight to the network');
  ok(w.ev('https://app.test/assets/audio/help/a.mp3',{headers:new Headers({range:'bytes=0-'})}).out===undefined,'range requests go straight to the network');
  ok(!/v17|17\.0\.0/.test(src),'no hardcoded old version in sw.js');
  console.log('\n'+pass+' passed');
})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
