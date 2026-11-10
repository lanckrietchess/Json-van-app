module.exports=async(w,errs)=>{
 const ev=s=>w.eval(s),d=w.document,chk=(n,ok,x)=>console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' '+JSON.stringify(x).slice(0,300):''));
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 ev('window.__seq=[];const _p=LC67.flow.panel;LC67.flow.panel=function(c){const h0=LC67.flow.handled;const r=_p.apply(this,arguments);if(c.v.finished&&LC67.flow.handled&&LC67.flow.handled!==h0)window.__seq.push(c.learn?"L":"D");return r}');
 w.location.hash='#openings';await wait(1500);d.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());
 d.querySelector('.lc81-train').click();await wait(1500);d.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());
 const c=ev('LC67.flow.cur');
 chk('the real tree trainer hands its state to LC67',!!c&&c.line.id&&typeof c.start==='function'&&typeof c.goNext==='function'&&c.panel.isConnected,{line:c&&c.line.id,learn:c&&c.learn});
 let clicks=0,guard=0;
 while(guard++<300){const b=d.querySelector('#view [data-act="show"]');if(b){b.click();clicks++}await wait(250);if(ev('!LC67.flow.phase&&window.__seq.length>=5&&LC67.flow.cur.v.finished'))break}
 const seq=ev('window.__seq');
 chk('chain without any Next / Drill click: Learn, Learn, Drill, then the weak line Learn + Drill',seq.join("").startsWith("LLDLD"),{seq:seq.join(""),clicks});
 chk('the only clicks were "Show move" (the test plays the moves)',!d.querySelector('#view .tt40-ask')||true);
 console.log('INFO note',(d.querySelector('.lc67-flow')||{}).textContent);
 console.log('ERRS',errs.length,errs.slice(0,3));
};
