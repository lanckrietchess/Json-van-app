module.exports=async(w,errs)=>{
 const ev=s=>w.eval(s),chk=(n,ok,x)=>console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' '+JSON.stringify(x):''));
 chk('modules loaded',ev('typeof LC61+typeof LC62+typeof LC63')==='objectobjectobject');
 // hero journey
 const ch=ev('LC62.chapters({start:1000,peak:1180})');
 chk('chapters prefilled',/1000/.test(ch[1])&&/1180/.test(ch[4])&&/\+180/.test(ch[4]),ch[4]);
 const story=ev('LC62.stitch('+JSON.stringify(ch)+',0)'),story2=ev('LC62.stitch('+JSON.stringify(ch)+',1)');
 chk('story has 4 parts and differs per variant',story.split('\n\n').length===4&&story!==story2);
 chk('unlock rule',ev('LC62.unlocked({start:1000,peak:1150,status:""})')===true&&ev('LC62.unlocked({start:1000,peak:1149,status:""})')===false&&ev('LC62.unlocked({start:1000,peak:1300,status:"pending"})')===false);
 // wizard opens and walks 5 steps; submit calls RPC
 let called=null; ev('window.__calls=[]');
 ev('LC30.authed=async(n,a)=>{window.__calls.push([n,a]);return{ok:true}}');
 w.localStorage.setItem('lc62',JSON.stringify({at:Date.now(),status:'',elite:false,start:1000,peak:1200,seen:0}));
 ev('LC62.openWizard()');
 const d=w.document; await new Promise(r=>setTimeout(r,200));
 const clickAct=a=>{const b=d.querySelector('[data-lc62-body] [data-lc62="'+a+'"]');if(b)b.click();return !!b};
 for(let i=0;i<4;i++)clickAct('next');
 await new Promise(r=>setTimeout(r,100));
 chk('step 5 shows the story editor',!!d.querySelector('[data-lc62-story]'));
 clickAct('send'); await new Promise(r=>setTimeout(r,300));
 const c=ev('window.__calls');
 chk('submit RPC sent with 4 chapters',c.length&&c[0][0]==='lc62_journey_submit'&&c[0][1].p_ch['4'].includes('1200'),c[0]&&Object.keys(c[0][1]));
 // sparring
 chk('spar needs alarm and 8 plies',JSON.stringify(ev('LC63.sparTurn("rnbq1rk1/ppp2ppp/3p1n2/3Pp3/2P1P3/2N5/PP3PPP/R1BQKBNR w KQ - 0 6","w",4)'))==='null');
 ev('Store.set("lc61-al",{})');
 // simulate: mode spar via start with admin to skip tokens
 ev('Admin.active=true; document.body.insertAdjacentHTML("beforeend","<button data-bt=\\"new\\" id=\\"fakeNew\\"></button>"); LC63.start("spar")');
 const t1=ev('LC63.sparTurn("rnbq1rk1/ppp2ppp/3p1n2/3Pp3/2P1P3/2N5/PP3PPP/R1BQKBNR w KQ - 0 6","w",4)');
 const t2=ev('LC63.sparTurn("rnbq1rk1/ppp2ppp/3p1n2/3Pp3/2P1P3/2N5/PP3PPP/R1BQKBNR w KQ - 0 6","w",12)');
 const t3=ev('LC63.sparTurn("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1","w",12)');
 console.log('spar early',JSON.stringify(t1),'with alarm',JSON.stringify(t2),'quiet',JSON.stringify(t3));
 chk('solid early, err only when the alarm is on the board',t1&&t1.solid&&!t1.err&&t3&&!t3.err);
 ev('LC63.used(12)');
 chk('only one slip per game',!ev('LC63.sparTurn("rnbq1rk1/ppp2ppp/3p1n2/3Pp3/2P1P3/2N5/PP3PPP/R1BQKBNR w KQ - 0 6","w",14)').err);
 // token charge
 ev('Admin.active=false; App.credits.daily=0; App.credits.purchased=0');
 const before=ev('Credits.balance()'); ev('LC63.start("plain")'); chk('no token = no game start and nothing charged',ev('Credits.balance()')===before);
 ev('App.credits.purchased=3'); ev('LC63.start("plain")'); chk('one token is charged',ev('Credits.balance()')===2,ev('Credits.balance()'));
 // train level
 ev('App.profile.elo=2105'); chk('Instant Play level for ELO 2105 = 4',ev('LC61.trainLevel()')===4);
 const lines=[{id:'a',lvl:2},{id:'b',lvl:4},{id:'c',lvl:5}];
 chk('untrained student gets level-4 lines',JSON.stringify(ev('LC61.levelLines('+JSON.stringify(lines)+').map(x=>x.id)'))==='["b"]');
};
