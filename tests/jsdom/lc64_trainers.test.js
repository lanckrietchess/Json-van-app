module.exports=async(w,errs)=>{
 const ev=s=>w.eval(s),d=w.document,chk=(n,ok,x)=>console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' '+JSON.stringify(x):''));
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 ev('Admin.active=true'); w.location.hash='#openings'; await wait(1800);
 const view=d.querySelector('#view');
 view.insertAdjacentHTML('beforeend','<div class="fb fb-bad" id="f1"><div class="fb-head"><strong>Not quite</strong></div><p>Try again</p></div>');
 await wait(900);
 chk('a wrong answer gets a "Run MSPC on this miss" button',!!d.querySelector('[data-lc64="miss-go"]'));
 d.querySelector('[data-lc64="miss-go"]').click(); await wait(200);
 chk('interrogation opens inline (1 of 4)',/1 of 4/.test(d.querySelector('[data-lc64-miss-body]').textContent));
 // answer M and S, leave P empty
 const ta=()=>d.querySelector('[data-lc64-miss-body] textarea');
 ta().value='They attacked my knight with the pawn on e5.'; d.querySelector('[data-lc64="iq-next"]').click(); await wait(50);
 ta().value='The centre was closed and my bishop was bad.'; d.querySelector('[data-lc64="iq-next"]').click(); await wait(50);
 d.querySelector('[data-lc64="iq-next"]').click(); await wait(50);
 d.querySelector('[data-lc64="iq-next"]').click(); await wait(200);
 const t=d.querySelector('[data-lc64-miss-body]').textContent;
 chk('summary names the gap (Priorities) and ends with the order for the next games',/thinking gap: Priorities/.test(t)&&/next 2 to 3 games/.test(t),t.slice(0,140));
 d.querySelector('[data-lc64="miss-wp"]').click(); await wait(200);
 chk('"Add it as a Working Point" adds a point',ev('Framework.active().length')>=1,ev('Framework.active().map(p=>p.cat+":"+p.text)'));
 // drill / learn completion
 view.insertAdjacentHTML('beforeend','<div class="fb fb-done"><div class="fb-head"><strong>Line learned</strong></div></div>'); await wait(900);
 chk('"Line learned" does NOT offer sparring',!d.querySelector('[data-lc64-drill]'));
 d.querySelectorAll('.fb-done').forEach(x=>x.remove()); view.insertAdjacentHTML('beforeend','<div class="fb fb-done"><div class="fb-head"><strong>Line complete</strong></div></div>'); await wait(900);
 chk('"Line complete" offers the sparring step',!!d.querySelector('[data-lc64-drill]'));
 d.querySelector('[data-lc64="spar"]').click(); await wait(200);
 chk('sparring step goes to #bot',w.location.hash==='#bot',w.location.hash);
 // not on trim
 w.location.hash='#trim'; await wait(1500); d.querySelector('#view').insertAdjacentHTML('beforeend','<div class="fb fb-bad"><div class="fb-head"><strong>x</strong></div></div>'); await wait(800);
 chk('no extra interrogation button on Trim (it has its own)',!d.querySelector('[data-lc64="miss-go"]'));
};
