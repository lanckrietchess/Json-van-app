const assert=require('assert');const fs=require('fs'),path=require('path'),vm=require('vm');
/* runs the real sw.js activate handler against a fake cache store */
const file=[path.join(__dirname,'..','sw.js'),path.join(__dirname,'..','..','sw.js')].find(f=>fs.existsSync(f));
const src=fs.readFileSync(file,'utf8');
(async()=>{
  const handlers={},deleted=[];let claimed=false;
  const keys=['lc-shell-9.3.0','lc-shell-9.2.0','lc-lib-v1','lc-coach-clips','lc-notes-v1','lc-old-junk','workbox-x'];
  const self={location:{href:'https://lanckrietchess-app.vercel.app/sw.js?v=9.3.0'},registration:{scope:'https://lanckrietchess-app.vercel.app/'},addEventListener:(t,f)=>{handlers[t]=f},skipWaiting(){},clients:{claim:async()=>{claimed=true}}};
  const caches={keys:async()=>keys.slice(),delete:async k=>{deleted.push(k);return true},open:async()=>({addAll:async()=>{},add:async()=>{},match:async()=>undefined,put:async()=>{}})};
  vm.runInNewContext(src,{self,caches,URL,Request,fetch:async()=>({}),Promise,console,Set,Response});
  let p;handlers.activate({waitUntil:x=>{p=x}});await p;
  assert.deepStrictEqual(deleted.sort(),['lc-old-junk','lc-shell-9.2.0','workbox-x'],'only unknown and stale caches are deleted');
  for(const keep of['lc-shell-9.3.0','lc-lib-v1','lc-coach-clips','lc-notes-v1'])assert(!deleted.includes(keep),keep+' must survive a release');
  assert(claimed,'clients claimed');
  console.log('ok   sw.js activate keeps the shell, libs, coach clips and the saved MSPC notes\n\n1 passed');
})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
