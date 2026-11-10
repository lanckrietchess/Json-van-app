module.exports=async(w,errs)=>{
 const ev=s=>w.eval(s),d=w.document,chk=(n,ok,x)=>console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' '+JSON.stringify(x).slice(0,300):''));
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 w.location.hash='#openings';await wait(1500);
 d.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());const view=d.querySelector('#view');
 const mk=()=>{const p=d.createElement('div');p.className='lc67-testpanel';p.innerHTML='<div class="st-feedback"></div><button data-act="next-in-level">next</button>';view.appendChild(p);return p};
 const calls=[];w.__calls=calls;
 ev('window.__mkc=(o)=>Object.assign({v:{finished:true,total:6,clean:6,plies:[],idx:0},learn:false,topic:{title:"T"},only:false,group:{name:"G"},si:0,start:(l,learn)=>window.__calls.push(["start",l.id,learn]),next:()=>window.__nx},o)');
 const set='[{id:"a"},{id:"b"},{id:"c"}]';
 ev('Store.set("lc61-learn",{a:1,b:2,c:2});Store.set("lc67-weak",{})');
 // 1. learn pass 1 -> learn again
 let p=mk();w.__p=p;ev('LC67.flow.panel(__mkc({line:{id:"a"},learn:true,set:'+set+',panel:__p}))');await wait(600);
 chk('learn pass 1 of 2: the line is learned again by itself',JSON.stringify(calls.pop())==='["start","a",true]'&&/1 of 2/.test(p.textContent));
 // 2. learn pass 2 -> drill
 ev(`Store.set("lc61-learn",{a:2,b:2,c:2});LC67.flow.handled=""`);p=mk();w.__p=p;ev('LC67.flow.panel(__mkc({line:{id:"a"},learn:true,set:'+set+',panel:__p}))');await wait(600);
 chk('learned twice: the drill starts by itself (no button)',JSON.stringify(calls.pop())==='["start","a",false]');
 // 3. drill with a mistake, more lines -> next line, line marked weak
 let nextClicked=0;p=mk();p.querySelector('[data-act="next-in-level"]').addEventListener('click',()=>nextClicked++);w.__p=p;
 ev('window.__nx={i:1,wrapped:false}');ev('LC67.flow.panel(__mkc({v:{finished:true,total:6,clean:4,plies:[],idx:0},line:{id:"a"},set:'+set+',panel:__p}))');await wait(600);
 chk('a drill with a mistake: next line starts by itself, the line goes to the back',nextClicked===1&&ev('Store.get("lc67-weak",{}).a')===1&&/comes back/.test(p.textContent));
 // 4. clean drills for b and c, end of level -> weak line a is learned again, then drilled
 p=mk();w.__p=p;ev('window.__nx={i:2,wrapped:false}');ev('LC67.flow.panel(__mkc({line:{id:"b"},set:'+set+',panel:__p}))');await wait(600);
 p=mk();w.__p=p;ev('window.__nx=null');ev('LC67.flow.panel(__mkc({line:{id:"c"},set:'+set+',panel:__p}))');await wait(600);
 chk('end of the level: the weak line comes back in LEARN mode',JSON.stringify(calls.pop())==='["start","a",true]'&&/Re-learning a weak line/.test(p.textContent));
 p=mk();w.__p=p;ev('LC67.flow.panel(__mkc({line:{id:"a"},learn:true,set:'+set+',panel:__p}))');await wait(600);
 chk('after re-learning: the weak line is drilled',JSON.stringify(calls.pop())==='["start","a",false]');
 p=mk();w.__p=p;ev('LC67.flow.panel(__mkc({line:{id:"a"},set:'+set+',panel:__p}))');await wait(600);
 chk('clean now: the queue is empty and the level is clean',/This level is clean/.test(p.textContent)&&!ev('Store.get("lc67-weak",{}).a'));
 // 5. Auto-next OFF: nothing happens by itself
 ev('Store.set("lc25-auto",{on:false})');calls.length=0;p=mk();w.__p=p;ev('LC67.flow.panel(__mkc({line:{id:"a"},learn:true,set:'+set+',panel:__p}))');await wait(600);
 chk('Auto-next OFF: the old manual buttons, nothing starts by itself',calls.length===0);
 ev('Store.set("lc25-auto",{on:true})');
 // 6. MSPC lens on the student's move
 const g=new w.Chess();g.move('e4');const f1=g.fen();g.move('d5');const f2=g.fen();
 p=mk();w.__p=p;ev('LC67.flow.panel(__mkc({v:{finished:false,yourTurn:true,replay:false,idx:2,plies:[{san:"e4",from:"e2",to:"e4",fen:'+JSON.stringify(f1)+'},{san:"d5",from:"d7",to:"d5",fen:'+JSON.stringify(f2)+'},{san:"exd5"}]},line:{id:"a"},set:'+set+',panel:__p}))');
 const lens=p.querySelector('.lc67-lens');
 chk('MSPC lens on the student move, with facts from the position',!!lens&&/d5/.test(lens.textContent)&&/attacks your pawn on e4/.test(lens.textContent)&&/1 capture/.test(lens.textContent),lens&&lens.textContent.slice(0,260));
 chk('LC25 stands down while LC67 runs the flow',ev('LC67.flow.owns()')===true);
 console.log('ERRS',errs.length,errs.slice(0,3));
};
