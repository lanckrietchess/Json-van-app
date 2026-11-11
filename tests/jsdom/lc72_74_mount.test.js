module.exports=async(w,errs)=>{
  const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);const ev=s=>w.eval(s);
  for(const r of ['coach-chat','rivals','analytics','landing-editor']){
    const d=w.document.createElement('div');w.document.body.appendChild(d);
    try{ev('MOUNT')[r](d)}catch(e){console.log('ERR',r,e.message)}
    await new Promise(x=>setTimeout(x,400));
    ok('MOUNT '+r+': '+d.textContent.trim().replace(/\s+/g,' ').slice(0,70),d.textContent.trim().length>5);
    let ml='?';try{ml=ev('LC19.quest._t.minLevel("'+r+'")')}catch(e){}console.log('   minLevel',r,ml);
  }
  console.log('hash now',w.location.hash, 'wizard?', !!w.document.querySelector('.lc80, [data-lc80]'));
};
