module.exports=async(w,errs)=>{
 const ev=s=>w.eval(s),d=w.document,chk=(n,ok,x)=>console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' '+JSON.stringify(x):''));
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const view=d.querySelector('#view'); const host=d.createElement('div'); view.appendChild(host); const sr=host.attachShadow({mode:'open'});
 sr.innerHTML='<div id="lcs" class="lcs"><main class="canvas" id="canvas"></main></div>';
 ev('window.__opened=[];window.LanckrietStudio=window.LanckrietStudio||{};window.LanckrietStudio._t=Object.assign(window.LanckrietStudio._t||{},{Layout:{compact:false,isOpen:()=>false,setOpen(id,b){window.__opened.push(id)}},Tier:{id:()=>"pro"}});window.LanckrietStudio.board={onChange(){window.__redraw=1}}');
 ev('LC66.afterRender()'); await wait(1000);
 chk('Studio tab bar is added to the canvas',!!sr.querySelector('.lc66-tabs')&&sr.querySelectorAll('.lc66-tab').length===5);
 chk('first tab is on and its panels are opened',sr.querySelector('#lcs').classList.contains('lc66-t1')&&ev('window.__opened.includes("script")'),ev('window.__opened'));
 sr.querySelector('[data-tab="t2"]').click(); await wait(50);
 chk('tab 2 shows the watermark slider',sr.querySelector('.lc66-wm').hidden===false&&sr.querySelector('#lcs').classList.contains('lc66-t2')&&!sr.querySelector('#lcs').classList.contains('lc66-t1'));
 const inp=sr.querySelector('.lc66-wm input'); inp.value='150'; inp.dispatchEvent(new w.Event('input',{bubbles:true})); await wait(50);
 chk('slider stores the size and redraws',+ev('Store.get("lc66-wm-scale",1)')===1.5&&ev('window.__redraw')===1);
 sr.querySelector('[data-tab="t4"]').click(); await wait(50);
 chk('tab 4 opens the takes panel',sr.querySelector('#lcs').classList.contains('lc66-t4')&&ev('window.__opened.includes("takes")'));
 chk('tab choice is remembered',ev('Store.get("lc66-tab","")')==='t4');
};
