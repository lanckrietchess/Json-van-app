import { start, sleep } from './rig.mjs';
let pass=0, fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)} };
const rig = await start('/home/claude/build/index.html');
const d = await rig.device({}, { path: '/', w: 390, h: 844 }); const p=d.page;
await sleep(4500);
const clean=()=>p.evaluate(()=>{document.querySelectorAll('.sheet-wrap,.sheet-scrim,[role=dialog]').forEach(e=>e.remove());document.querySelectorAll('.lc30-ask').forEach(e=>{let n=e;while(n.parentElement&&n.parentElement!==document.body)n=n.parentElement;n.remove()})});
await clean();
const apply=(st)=>p.evaluate((s)=>Quota._t.apply(s),st);
const future=Date.now()+4*3600e3+12*60e3;
await apply({tier:'free',unlimited:false,limit:1,used:0,left:1,bonus:3,resetsAt:future,verified:true});
await p.evaluate(()=>document.querySelector('#profile-chip').click()); await sleep(500);
let tok=await p.evaluate(()=>{const t=document.querySelector('#pm-panel [data-lc32-tok]');return t?{txt:t.innerText.replace(/\s+/g,' '),cells:t.querySelectorAll('.lc32-tok-c').length,note:document.querySelector('#pm-panel .lc32-tok-n')?.innerText}:null});
console.log('   ',JSON.stringify(tok));
ok(tok&&tok.cells===2,'two separate balance cards in the profile menu');
ok(/Free daily\s*1\s*\/\s*1/i.test(tok.txt)&&/Purchased\s*3/i.test(tok.txt),'Free daily 1 / 1 and Purchased 3');
ok(/resets in 4h/.test(tok.txt),'daily card shows a reset countdown');
ok(/used first/.test(tok.note),'the menu says daily tokens are used first');
const lay=await p.evaluate(()=>{const c=[...document.querySelectorAll('#pm-panel .lc32-tok-c')].map(e=>e.getBoundingClientRect());return {sameRow:Math.abs(c[0].top-c[1].top)<2,sideBySide:c[0].right<=c[1].left+1,inView:c[1].right<=innerWidth}});
ok(lay.sameRow&&lay.sideBySide&&lay.inView,'cards sit side by side inside the screen');
await d.shot('t13-menu');
// live update while open (daily token spent)
await apply({tier:'free',unlimited:false,limit:1,used:1,left:0,bonus:3,resetsAt:future,verified:true}); await sleep(1900);
ok(await p.evaluate(()=>/Free daily\s*0/i.test(document.querySelector('#pm-panel [data-lc32-tok]').innerText)),'open menu updates by itself when a token is spent');
// unlimited tier
await apply({tier:'vip',unlimited:true,limit:null,used:0,left:null,bonus:7,resetsAt:future,verified:true}); await sleep(1900);
const unl=await p.evaluate(()=>document.querySelector('#pm-panel [data-lc32-tok]').innerText.replace(/\s+/g,' '));
ok(/Unlimited/.test(unl)&&/Purchased\s*7/i.test(unl),'VIP: daily shows Unlimited, purchased still counted ('+unl+')');
// client spend order
const sp=await p.evaluate(()=>{App.credits.daily=1;App.credits.purchased=3;App.credits.lastReset=dayKey(new Date);Credits.spend(2);return [App.credits.daily,App.credits.purchased]});
ok(sp[0]===0&&sp[1]===2,'on-device spend order: daily first (1 -> 0), then purchased (3 -> 2)');
console.log('errors',d.errors.filter(e=>!/404|fetching the script|Failed to load/.test(e)).slice(0,4));
ok(d.errors.filter(e=>!/404|fetching the script|Failed to load/.test(e)).length===0,'no page errors');
console.log(`\n${pass} passed, ${fail} failed`);
await rig.close();
