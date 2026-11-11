// 9.37.0 smoke test: LC72/LC73/LC74 boot, routes mount, the lock popup, the Congratulations pop-up, the voice guard, the Studio hub back button code.
module.exports=async(w,errs)=>{
  const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
  const ev=s=>w.eval(s);
  ok('modules defined',ev('typeof LC72!=="undefined"&&typeof LC73!=="undefined"&&typeof LC74!=="undefined"'));
  ok('no init errors from lc72-74',!errs.some(e=>/lc7[234]|LC7[234]/.test(e)));
  for(const r of ['coach-chat','rivals','analytics','landing-editor']){
    w.location.hash='#'+r;await new Promise(x=>setTimeout(x,700));
    const v=w.document.querySelector('#view');ok('route #'+r+' mounts ('+(v&&v.textContent.trim().slice(0,40))+')',!!(v&&v.textContent.trim().length>5));
  }
  ok('nav has Coach Kyenzo + Rivals',/coach-chat/.test(w.document.documentElement.innerHTML)&&/#rivals/.test(w.document.documentElement.innerHTML));
  // the browser's own speech is replaced
  ok('speech guard installed',ev('!("speechSynthesis" in window)||!!window.speechSynthesis.__lc74'));
  // Congratulations pop-up with the share question
  ev('LC74._t.pop({kind:"level",title:"Level 7 reached",line:"You climbed to level 7."})');await new Promise(x=>setTimeout(x,300));
  const sh=w.document.querySelector('.lc74-sheet');ok('Congratulations pop-up shows the share question',!!sh&&/Share this achievement to the Community Wall of Love \/ Feed\?/.test(sh.textContent)&&!!sh.querySelector('[data-lc74-yes]'));
  ok('share is opt-in (nothing pre-ticked)',!sh||!sh.querySelector('input[type=checkbox]:checked'));
  // titles marker decoration
  const d=w.document.createElement('div');d.textContent=ev('LC72.mark("Vera","S")');w.document.body.appendChild(d);ev('LC72.decorate(document.body)');
  ok('title badge from the marker',/Vera/.test(d.textContent)&&!!d.querySelector('.lc72-t.is-S'));
  // Studio content hub: back button + router back in the source
  const src=w.document.documentElement.innerHTML;
  ok('content hub has Back and Main menu',src.includes('id:"lc35-back"')&&src.includes('id:"lc35-home"')&&src.includes('lc35hub:1'));
  ok('LC66.back exists',ev('typeof LC66.back==="function"'));
  // LC33S caption engine helpers inside the Studio closure: group words into captions
  ok('no browser speech call left in LC61',!/speechSynthesis\.speak\(u\)/.test(src));
};
