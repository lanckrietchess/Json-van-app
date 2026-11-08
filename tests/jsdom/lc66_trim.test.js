module.exports=async(w,errs)=>{
 const ev=s=>w.eval(s),d=w.document,chk=(n,ok,x)=>console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' '+JSON.stringify(x):''));
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 chk('LC66 loaded',ev('typeof LC66')==='object');
 const css=ev('LC66.tabCss()');
 chk('tab CSS hides other panels and places the tab panels',/#lcs\.lc66-t1:not\(\.compact\) \.panel\{display:none!important\}/.test(css)&&/\[data-id="script"\]\{display:flex!important/.test(css)&&/\.lc66-t4/.test(css));
 chk('4 tabs + free layout',ev('LC66.TABS.length')===5);
 // Trim jump: fake report with three "Show" buttons; the earliest error is clicked
 w.location.hash='#trim'; await wait(1200);
 const view=d.querySelector('#view'); let clicked=null;
 view.insertAdjacentHTML('beforeend','<div id="an-report"><button data-act="goto" data-i="30">a</button><button data-act="goto" data-i="8">b</button><button data-act="goto" data-i="20">c</button></div>');
 d.querySelectorAll('#an-report [data-act="goto"]').forEach(b=>b.addEventListener('click',()=>{clicked=b.getAttribute('data-i')}));
 await wait(1200);
 chk('Trim jumps to the EARLIEST error',clicked==='8',clicked);
 // coach card, Free
 view.insertAdjacentHTML('beforeend','<div class="board-shell"></div>');
 const it={color:'w',k:'S',text:'Be2 did not fit.',san:'Be2',cls:'blunder'};
 ev('App.rank=()=>0');
 ev('LC66.onGoto("r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 8",'+JSON.stringify(it)+',"w")');
 let c=d.querySelector('#lc66-coach');
 chk('Free coach: a) b) c), next-games order, MSPC framework as a button, no AI button',c&&/a\) Thinking error/.test(c.textContent)&&/b\) Alarm Signal/.test(c.textContent)&&/c\) Working Point/.test(c.textContent)&&/next 2 to 3 games/.test(c.textContent)&&!!c.querySelector('[data-lc66="mspc"]')&&!c.querySelector('[data-lc66="ask"]'));
 c.querySelector('[data-lc66="mspc"]').click(); await wait(50);
 chk('MSPC framework opens on request',c.querySelector('[data-lc66-mspc]').hidden===false);
 ev('App.rank=()=>2'); ev('LC66.onGoto("r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 8",'+JSON.stringify(it)+',"w")');
 c=d.querySelector('#lc66-coach');
 chk('Pro coach: has the "Ask Coach Lanckriet" button',!!c.querySelector('[data-lc66="ask"]')&&/Pro coach/.test(c.textContent));
 let asked=false; view.insertAdjacentHTML('beforeend','<button data-act="ask-leaks" id="al"></button>'); d.querySelector('#al').addEventListener('click',()=>{asked=true}); c.querySelector('[data-lc66="ask"]').click(); await wait(50);
 chk('Pro button opens the existing AI chat',asked);
};
