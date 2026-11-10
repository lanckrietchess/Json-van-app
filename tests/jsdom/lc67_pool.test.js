module.exports=async(w,errs)=>{
 const ev=s=>w.eval(s),d=w.document,chk=(n,ok,x)=>console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' '+JSON.stringify(x).slice(0,300):''));
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 chk('boot without page errors',errs.length===0,errs.slice(0,4));
 chk('LC67/68/69 loaded',['LC67','LC68','LC69'].every(n=>ev('typeof '+n)==='object'));
 chk('version 9.34.0',ev('CONFIG.version')==='9.34.0'&&ev('CONFIG.assetVersion')==='9.34.0');
 // pool warm-up in slices
 ev('LC67.pool.seed()');const left0=ev('LC67.pool.left()');
 let t=Date.now();ev('LC67.pool.slice(20)');const dt=Date.now()-t;
 chk('pool slice is short (main thread stays free)',dt<200,{left0,dt});
 t=Date.now();while(ev('LC67.pool.left()')>0&&Date.now()-t<60000){ev('LC67.pool.slice(50)');await wait(1)}
 chk('pool finishes in slices and is stored',ev('LC67.pool.ready()')&&(ev('Store.get("lc67-poolok",[]).length')>500),ev('Store.get("lc67-poolok",[]).length'));
 t=Date.now();const n=ev('shufflePool().length');chk('shufflePool is instant after warm-up',Date.now()-t<400&&n>600,{ms:Date.now()-t,n});
 console.log('ERRS',errs.length,errs.slice(0,3));
};
