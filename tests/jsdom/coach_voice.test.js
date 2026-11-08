module.exports=async(w,errs)=>{
 const fs=require('fs'),ev=s=>w.eval(s),chk=(n,ok,x)=>console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' '+JSON.stringify(x):''));
 const py=JSON.parse(fs.readFileSync('/tmp/pyhash.json','utf8')),texts=Object.keys(py);
 let bad=0;for(const t of texts){const h=await w.eval('LC60.hashOf(LC60.clean('+JSON.stringify(t)+'))');if(h!==py[t])bad++}
 chk('Python and the app compute the same clip hash for all '+texts.length+' texts',bad===0,bad);
 // every text the app can show in the coach tail is in the voiced list
 const set=new Set(texts),miss=[];
 const ids=ev('Object.keys(LC61.ALARM)').concat(['']);
 for(const l of ['M','S','P','C'])for(const id of ids){const t=ev('LC64.nextGames('+JSON.stringify(l)+','+JSON.stringify(id)+')');if(!set.has(t))miss.push(t.slice(0,60))}
 ev('Object.values(LC61.ALARM)').forEach(a=>{if(!set.has(a.say))miss.push(a.say.slice(0,40))});
 ev('Object.values(LC64.ACT)').forEach(a=>{if(!set.has(a))miss.push(a.slice(0,40))});
 ev('LC64.QS').forEach(q=>{if(!set.has(q[2]))miss.push(q[2].slice(0,40))});
 chk('every fixed coach text the app shows has a place in the voice list',miss.length===0,miss.slice(0,3));
 // buttons appear only when a clip exists
 const view=w.document.querySelector('#view');
 const tail=ev('LC61.tail({fen:"r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 8",color:"w",k:"S",why:"x",ps:"Be2"})');
 view.insertAdjacentHTML('beforeend','<div id="tt">'+tail+'</div>');
 const btn=[...w.document.querySelectorAll('#tt [data-lc61="voice"]')];
 chk('voice buttons are in the tail but hidden without clips',btn.length>=2&&btn.every(b=>b.hidden));
 // now publish an index with the clips of the first button
 const t0=btn[0].getAttribute('data-text'),h0=py[t0]||await w.eval('LC60.hashOf(LC60.clean('+JSON.stringify(t0)+'))');
 global.FETCH=async(u)=>/audio\/coach\/index\.json/.test(u)?{ok:true,status:200,json:async()=>({clips:{[h0]:{file:h0+'.mp3'}}}),text:async()=>''}:null;
 w.document.body.appendChild(w.document.createElement('i')); await new Promise(r=>setTimeout(r,1500));
 chk('with a clip in the index the matching button shows, the others stay hidden',!btn[0].hidden&&btn.slice(1).some(b=>b.hidden),btn.map(b=>b.hidden));
};
