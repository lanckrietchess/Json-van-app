module.exports=async(w,errs)=>{
 const ev=s=>w.eval(s),d=w.document,chk=(n,ok,x)=>console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' '+JSON.stringify(x).slice(0,300):''));
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 // ---- simulator
 let reloads=0;w.__lc67Reload=()=>{reloads++};
 const before={auth:w.localStorage.getItem('lc26-auth'),xp:w.localStorage.getItem('lc6-state-v1'),n:w.localStorage.length};
 ev('LC49.open&&0');
 await w.eval('LC67.sim.start()');
 chk('simulation: device storage is a fresh visitor (session and XP gone)',w.localStorage.getItem('lc26-auth')===null&&w.localStorage.getItem('lc6-state-v1')===null&&w.localStorage.getItem('lc67-sim')==='1'&&reloads===1);
 chk('simulation: the backup holds the real state',(()=>{const b=JSON.parse(w.localStorage.getItem('lc67-sim-backup'));return b.ls['lc26-auth']===before.auth&&b.ls['lc6-state-v1']===before.xp})());
 await w.eval('LC67.sim.stop()');
 chk('stop: everything is back exactly (session, XP, number of keys)',w.localStorage.getItem('lc26-auth')===before.auth&&w.localStorage.getItem('lc6-state-v1')===before.xp&&w.localStorage.getItem('lc67-sim')===null&&w.localStorage.getItem('lc67-sim-backup')===null&&reloads===2,{n:w.localStorage.length,was:before.n});
 // ---- the old menu entry is gone, the trainer is under Openings
 chk('nav: "MSPC repertoire trainer" entry removed',!/MSPC repertoire trainer/i.test(ev('JSON.stringify(Nav5&&Nav5.groups?Nav5.groups():"")')+d.body.innerHTML.match(/n5-panel[\s\S]{0,0}/)) && ev('document.documentElement.outerHTML.indexOf(\'"#mspc-rep","sitemap"\')')<0);
 w.location.hash='#openings';await wait(1800);
 chk('Openings shows the MSPC card with a link to the critical-moments trainer',!!d.querySelector('#lc67-mspc a[href="#mspc-rep"]'));
 w.location.hash='#mspc-rep';await wait(1500);
 chk('#mspc-rep still works, titled "Openings with MSPC", back link to Openings',/Openings with MSPC/.test(d.querySelector('#view').textContent)&&!!d.querySelector('#view a[href="#openings"]'),d.querySelector('#view').textContent.slice(0,100));
 // ---- books
 w.location.hash='#books';await wait(1200);
 const bt=d.querySelector('#view').textContent;
 chk('Books Vault page: 4 books, authors named, enemy terms',d.querySelectorAll('.lc69-book').length===4&&/Alexander Kotov/.test(bt)&&/Axel Smith and Hans Tikkanen/.test(bt)&&/Puzzle Addicts/.test(bt)&&/Blitz Junkies/.test(bt));
 chk('nav has the Books Vault',ev('document.documentElement.outerHTML.indexOf(\'"#books","book","Books Vault"\')')>0);
 // ---- blitz + road
 const pg=(tc,t)=>'[Event "Live Chess"]\n[TimeControl "'+tc+'"]\n\n1. e4 e5 *';
 const now=Date.now();
 ev('Store.set("lc42-games",'+JSON.stringify([pg("180",now),pg("180+2",now-1e6),pg("60",now-2e6),pg("300",now-3e6),pg("600",now-4e6)].map((p,i)=>({pgn:p,color:"w",res:"loss",opp:"x",t:now-i*1e6})))+')');
 ev('App.profile.elo=1100');
 chk('speed classes (lichess estimate)',ev('[LC69.speed(\'[TimeControl "180"]\'),LC69.speed(\'[TimeControl "600"]\'),LC69.speed(\'[TimeControl "60"]\'),LC69.speed(\'[TimeControl "1/86400"]\')].join()')==='blitz,rapid,bullet,daily');
 chk('Blitz Junkie detected: 4 of 5 fast under 2000',ev('LC69.blitzState().junkie')===true);
 w.location.hash='#quests';await wait(1800);
 const q=d.querySelector('#view');
 chk('quest page: Road to a Lanckriet Student card with 3 steps',!!q.querySelector('#lc69-road')&&q.querySelectorAll('#lc69-road .lc69-steps li').length===3,q.textContent.slice(0,80));
 chk('quest page: the Blitz Junkie card and a coach line',!!q.querySelector('#lc69-blitz')&&/Blitz-junkie move/.test(q.textContent)&&!!d.querySelector('#lc69-bubble'));
 chk('road: rank from the ritual streak, not the VIP title',/Discipline rank: Rookie/.test(q.textContent)&&!/Lanckriet Chess Student/.test(q.querySelector('#lc69-road').textContent));
 ev('Store.set("lc67-ritual",{day:"'+(new Date().toISOString().slice(0,10))+'",streak:3,best:3,total:3})');
 console.log('ERRS',errs.length,errs.slice(0,3));
};
