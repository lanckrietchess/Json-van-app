import { boot } from './mountStudio.mjs'; import { sleep } from './rig.mjs';
let pass=0, fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)} };
const { rig, d } = await boot({ w: 1440, h: 1000 });
const p = d.page;
const ev = (code) => p.evaluate(`(()=>{const R=document.getElementById('harness').shadowRoot;const q=s=>R.querySelector(s);const qa=s=>[...R.querySelectorAll(s)];${code}})()`);
await sleep(700);
await ev(`q('.lc31-fmt[data-fmt=long]').click();return 1`); await sleep(500);
ok(await ev(`return !!q('#lc31-cta')`), 'camera slot shows a Connect camera call-to-action before connecting');
// 1 click connect
await ev(`q('#lc31-connect').click();return 1`); await sleep(2800);
ok(await p.evaluate(()=>LanckrietStudio._t.Cam.active&&LanckrietStudio._t.Mic.active&&LanckrietStudio._t.Hardware.live), 'one click starts camera and microphone');
ok(await ev(`return !q('#lc31-cta')`), 'call-to-action disappears when the camera is live');
ok(await ev(`return /Reconnect/.test(q('#lc31-connect').textContent)`), 'button switches to Reconnect');
ok(await ev(`return !!q('#lc31-banner').hidden`), 'no error banner on success');
// meter moves (fake mic beeps)
let maxW=0, maxPanel=0, sawDb=false;
await ev(`const b=qa('button').find(b=>/Camera & devices/.test(b.textContent));b.click();return 1`); await sleep(400);
ok(await ev(`return !!q('#lc31-vu-panel .lc31-vu')`), 'VU meter is next to the microphone selector');
for(let i=0;i<40;i++){ const r=await ev(`const c=q('#lc31-row .lc31-vu-cover');const m=q('#mic-meter');const t=q('#lc31-row .lc31-vu-db').textContent;return [parseFloat(c.style.width),parseFloat(m.style.width)||0,t]`); maxW=Math.max(maxW,100-r[0]); maxPanel=Math.max(maxPanel,r[1]); if(/-?\d+ dB/.test(r[2])) sawDb=true; await sleep(100); }
console.log('    peak level shown: stage',maxW.toFixed(0)+'%','panel old bar',maxPanel.toFixed(0)+'%');
ok(maxW>20, 'stage VU meter moves with the microphone');
ok(maxPanel>20, 'old #mic-meter bar now moves too');
ok(sawDb, 'meter shows a dB readout');
await d.shot('t7-live');
// camera pixels reach the canvas, and full-frame draws behind board
await ev(`const s=q('#lc31-look');s.value='full';s.dispatchEvent(new Event('change'));return 1`); await sleep(500);
const px = await ev(`const cv=q('#stage-cv');const g=cv.getContext('2d');const W=cv.width,H=cv.height;const a=g.getImageData(5,5,1,1).data;const b=g.getImageData(W-6,H-6,1,1).data;return {W,H,corner:[...a],corner2:[...b]}`);
console.log('    full-frame corner pixels',JSON.stringify(px));
ok(px.corner.slice(0,3).some(v=>v>40)||px.corner2.slice(0,3).some(v=>v>40), 'full-frame camera paints the whole frame');
await d.shot('t7-full');
await ev(`const s=q('#lc31-look');s.value='circle';s.dispatchEvent(new Event('change'));return 1`);
// failure path: permission denied
await p.evaluate(()=>{ navigator.mediaDevices.getUserMedia=()=>Promise.reject(Object.assign(new Error('Permission denied'),{name:'NotAllowedError'})); });
await ev(`q('#lc31-connect').click();return 1`); await sleep(900);
const ban = await ev(`const b=q('#lc31-banner');return [b.hidden,b.textContent]`);
console.log('    banner:',ban[1].slice(0,140));
ok(ban[0]===false && /blocked|Allow|allow/i.test(ban[1]), 'blocked permission shows a visible banner with the fix');
ok(await ev(`return qa('.toast').some(t=>/blocked|Access/i.test(t.textContent))`), 'and a toast');
await d.shot('t7-blocked');
// silence hint: mic active but silent source
await p.evaluate(()=>{ LanckrietStudio._t.Mic.levelDb=()=>-90; });
await sleep(4200);
ok(await ev(`return qa('.lc31-vu-hint').some(e=>!e.hidden)`), 'silent microphone shows the "no sound yet" hint');
console.log('errors', d.errors.filter(e=>!/404|fetching the script|Failed to load|Permission denied/.test(e)).slice(0,6));
ok(d.errors.filter(e=>!/404|fetching the script|Failed to load|Permission denied/.test(e)).length===0,'no page errors');
console.log(`\n${pass} passed, ${fail} failed`);
await rig.close();
