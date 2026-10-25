import { boot } from './mountStudio.mjs'; import { sleep } from './rig.mjs';
let pass=0, fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)} };
const { rig, d } = await boot({ w: 1440, h: 1000 });
const p = d.page;
const ev = (code) => p.evaluate(`(()=>{const R=document.getElementById('harness').shadowRoot;const q=s=>R.querySelector(s);const qa=s=>[...R.querySelectorAll(s)];${code}})()`);
await sleep(800);
// first run: format picker is forced
ok(await ev(`return !!q('.lc31-fmts')`), 'format picker opens on a fresh project');
ok(await ev(`return qa('.lc31-fmt').length`)===8, '8 formats offered');
ok(await ev(`return !qa('.lc31-modal button').some(b=>b.textContent==='Close')`), 'picker has no Close while required');
await d.shot('t6-picker');
// pick Short
await ev(`q('.lc31-fmt[data-fmt=short]').click();return 1`); await sleep(600);
ok(await ev(`return !q('.lc31-modal')`), 'picker closes after choosing');
ok(await p.evaluate(()=>LanckrietStudio.layout().aspect)==='9:16', 'Short sets 9:16');
const sc = await p.evaluate(()=>LanckrietStudio._t.Script.text);
ok(/## Hook/.test(sc)&&/## MSPC/.test(sc), 'script outline is in the script editor');
const lay = await p.evaluate(()=>{const L=LanckrietStudio.layout();return {s:L.panels.script,st:L.panels.stage}});
ok(lay.s.y<lay.st.y && lay.s.w>.9, 'script panel sits on top, full width');
ok(await p.evaluate(()=>LanckrietStudio.layout().layers.camera.shape)==='circle', 'Short uses circular camera');
// look switching
for (const lk of ['rounded','square','wide','tall','full','circle']) {
  await ev(`const s=q('#lc31-look');s.value='${lk}';s.dispatchEvent(new Event('change'));return 1`); await sleep(120);
  const c = await p.evaluate(()=>{const c=LanckrietStudio.layout().layers.camera;return {shape:c.shape,ratio:c.ratio,fill:c.fill,w:c.w,h:c.h,x:c.x,y:c.y,radius:c.radius}});
  const a = await p.evaluate(()=>LanckrietStudio.layout().aspect==='9:16'?9/16:16/9);
  const px = c.w*a/c.h*1; // pixel aspect = (w*W)/(h*H)  with W/H=a
  console.log('   ',lk, JSON.stringify({shape:c.shape,ratio:c.ratio,fill:c.fill,px:+px.toFixed(3),inFrame:c.x>=-1e-6&&c.y>=-1e-6&&c.x+c.w<=1+1e-6&&c.y+c.h<=1+1e-6}));
  const want={circle:1,rounded:4/3,square:1,wide:16/9,tall:3/4}[lk];
  if(lk==='full') ok(c.fill==='full'&&c.w===1&&c.h===1,'full frame covers the whole frame');
  else ok(Math.abs(px-want)<0.02 && c.fill==='pip' && c.x>=-1e-6 && c.x+c.w<=1+1e-6 && c.y+c.h<=1+1e-6, lk+' keeps its pixel ratio and stays inside the frame');
}
ok(await ev(`return q('#lc31-look').value`)==='circle','shape select reflects state');
// persistence via sanitize
const san = await p.evaluate(()=>{const L=LanckrietStudio._t.sanitizeLayout(JSON.parse(JSON.stringify(LanckrietStudio.layout())));return [L.layers.camera.ratio,L.layers.camera.fill]});
ok(san[0]==='1:1'&&san[1]==='pip','shape survives a save/load (sanitize)');
const san2 = await p.evaluate(()=>{const o=JSON.parse(JSON.stringify(LanckrietStudio.layout()));o.layers.camera.fill='full';o.layers.camera.ratio='free';const L=LanckrietStudio._t.sanitizeLayout(o);return [L.layers.camera.ratio,L.layers.camera.fill]});
ok(san2[0]==='free'&&san2[1]==='full','full-frame survives sanitize');
const san3 = await p.evaluate(()=>{const o=JSON.parse(JSON.stringify(LanckrietStudio.layout()));o.layers.camera.ratio='<script>';o.layers.camera.fill='evil';const L=LanckrietStudio._t.sanitizeLayout(o);return [L.layers.camera.ratio,L.layers.camera.fill]});
ok(san3[1]==='pip'&&['1:1','free'].includes(san3[0]),'hand-edited bad values are cleaned');
console.log('errors', d.errors.filter(e=>!/404|fetching the script/.test(e)).slice(0,6));
ok(d.errors.filter(e=>!/404|fetching the script|Failed to load/.test(e)).length===0,'no page errors');
console.log(`\n${pass} passed, ${fail} failed`);
await rig.close();
