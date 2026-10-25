import { start, sleep } from './rig.mjs';
import { prep, sql, mkArena, mkStripe, routes, closeMock } from './lib18.mjs';
let pass=0, fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)} };
await prep(); const log=[];
const rig = await start('/home/claude/build/index.html',{ external: routes(mkArena(), mkStripe(), log) });
const AND='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const PLAY='https://play.google.com/store/apps/details?id=com.lanckrietchess.app';
async function open(o){ const d=await rig.device({}, Object.assign({path:'/',w:390,h:844},o)); await sleep(4200); await d.page.evaluate(()=>{V5Doc.server=()=>({url:'https://stub.supabase.co/functions/v1/arena'})}); d.errs=()=>d.errors.filter(e=>!/404|fetching the script|Failed to load/.test(e)); return d }
const sheets=(p)=>p.evaluate(()=>[...document.querySelectorAll('.sheet-wrap')].map(s=>s.className+' | '+s.innerText.replace(/\s+/g,' ').slice(0,90)));
const closeFirstRun=(p)=>p.evaluate(()=>{document.querySelectorAll('.lc30-ask').forEach(e=>{let n=e;while(n.parentElement&&n.parentElement!==document.body)n=n.parentElement;n.remove()})});

console.log('1. Android in the browser');
let d=await open({ua:AND}); let p=d.page;
await p.evaluate((u)=>{CONFIG.links.playStore=u},PLAY);
ok(await p.evaluate(()=>!document.querySelector('.lc34-and')),'entering the app: no OS pop-up while the first-run questions are open');
ok(await p.evaluate(()=>LC34.dev.mode())==='android-web','detected as Android on the web');
await sleep(4000); ok(await p.evaluate(()=>!document.querySelector('.lc34-and')),'still nothing while the first-run questions are on screen');
await closeFirstRun(p); await sleep(3200);
let sh=await p.evaluate(()=>{const s=document.querySelector('.lc34-and');if(!s)return null;const a=s.querySelector('[data-lc34-play]');return {txt:s.innerText.replace(/\s+/g,' '),href:a&&a.href,target:a&&a.target,rel:a&&a.rel}});
console.log('    overlay:',JSON.stringify(sh));
ok(sh&&/Open Google Play/.test(sh.txt)&&/Not now/.test(sh.txt),'after login the Google Play overlay appears');
ok(sh&&sh.href===PLAY&&sh.target==='_blank'&&/noopener/.test(sh.rel),'the button opens the Play page in a new tab (noopener)');
await d.shot('t18-android');
await p.evaluate(()=>document.querySelector('.lc34-and [data-close]').click()); await sleep(400);
ok(await p.evaluate(()=>!document.querySelector('.lc34-and')),'Not now closes it');
await p.evaluate(()=>{LC34._t.androidOverlay()}); ok(await p.evaluate(()=>!document.querySelector('.lc34-and')),'and it stays away for a week');
ok(d.errs().length===0,'no page errors'); await d.ctx.close();

console.log('2. Android without a Play link set');
d=await open({ua:AND}); p=d.page; await closeFirstRun(p); await sleep(3500);
ok(await p.evaluate(()=>!document.querySelector('.lc34-and')),'no link in admin settings: no overlay and no dead button'); await d.ctx.close();

console.log('3. Android inside the Google Play app');
d=await open({ua:AND,init:()=>{Object.defineProperty(Document.prototype,'referrer',{get:()=>'android-app://com.lanckrietchess.app/'})}}); p=d.page;
await p.evaluate((u)=>{CONFIG.links.playStore=u},PLAY); await closeFirstRun(p); await sleep(3500);
ok(await p.evaluate(()=>LC34.dev.inPlay()&&LC34.dev.mode()==='play-app'),'recognised as the Play app (android-app:// referrer)');
ok(await p.evaluate(()=>!document.querySelector('.lc34-and')&&!document.querySelector('.lc34-ios')),'zero pop-ups: seamless');
await p.evaluate(()=>LC34.value('trim')); await sleep(2600);
ok(await p.evaluate(()=>!document.querySelector('.lc34-and')&&!document.querySelector('.lc34-ios')),'not even after the first value moment');
await p.reload({waitUntil:'domcontentloaded'}); await sleep(3500); await closeFirstRun(p);
ok(await p.evaluate(()=>LC34.dev.inPlay()),'a reload inside the app is still the app (the session keeps it)');
await d.ctx.close();
d=await open({ua:AND}); p=d.page; await p.evaluate(()=>{window.history.replaceState(null,'','/?src=play')}); 
ok(await p.evaluate(()=>LC34.dev.inPlay()),'?src=play on the start URL also marks the app'); await d.ctx.close();

console.log('4. iPhone in Safari: the shortcut comes AFTER the first value');
d=await open({ua:IOS}); p=d.page; await closeFirstRun(p); await sleep(3500);
ok(await p.evaluate(()=>LC34.dev.mode())==='ios'&&await p.evaluate(()=>!document.querySelector('.lc34-ios')),'on entering and after login: nothing for iOS');
await sleep(2500); ok(await p.evaluate(()=>!document.querySelector('.lc34-ios')),'and nothing a few seconds later');
// a real server-charged token = first value moment
const sp=await p.evaluate(async()=>{const r=await Quota.spend('coach','first-value-1');return {ok:r.ok,offline:!!r.offline,left:r.left}});
console.log('    token spend:',JSON.stringify(sp));
await sleep(1200); ok(await p.evaluate(()=>!document.querySelector('.lc34-ios')),'right after the spend the reward is allowed to land first');
await sleep(1400);
const ios=await p.evaluate(()=>{const s=document.querySelector('.lc34-ios');return s?s.innerText.replace(/\s+/g,' '):null});
console.log('    overlay:',ios);
ok(ios&&/Tap Share in Safari/.test(ios)&&/Tap Add to Home Screen/.test(ios)&&/Launch from your home screen/.test(ios)&&/1\./.test(ios)&&/3\./.test(ios),'then the three-step Add to Home Screen overlay');
ok(await p.evaluate(()=>document.querySelectorAll('.lc34-ios .lc34-stepico svg').length)===3,'with three step icons');
await d.shot('t18-ios');
await p.evaluate(()=>document.querySelector('.lc34-ios [data-close]').click()); await sleep(400);
await p.evaluate(()=>LC34.value('trim')); await sleep(2500);
ok(await p.evaluate(()=>!document.querySelector('.lc34-ios')),'a second value moment does not show it again');
ok(d.errs().length===0,'no page errors'); await d.ctx.close();

console.log('5. iPhone that is not a good place for it');
d=await open({ua:IOS,init:()=>{Object.defineProperty(navigator,'standalone',{get:()=>true})}}); p=d.page; await closeFirstRun(p);
await p.evaluate(()=>LC34.value('trim')); await sleep(3000);
ok(await p.evaluate(()=>!document.querySelector('.lc34-ios')),'already on the home screen (standalone): nothing'); await d.ctx.close();
d=await open({ua:IOS+' Instagram 300.0.0.0'}); p=d.page; await closeFirstRun(p);
await p.evaluate(()=>LC34.value('trim')); await sleep(3000);
ok(await p.evaluate(()=>!document.querySelector('.lc34-ios')),'inside the Instagram browser (cannot add to home screen): nothing'); await d.ctx.close();
d=await open({w:1280,h:900}); p=d.page; await closeFirstRun(p); await p.evaluate((u)=>{CONFIG.links.playStore=u},PLAY);
await p.evaluate(()=>LC34.value('trim')); await sleep(3000);
ok(await p.evaluate(()=>!document.querySelector('.lc34-ios')&&!document.querySelector('.lc34-and')),'desktop: nothing at all'); await d.ctx.close();

console.log('6. the habit week');
d=await open({w:1280,h:900}); p=d.page; await closeFirstRun(p);
await p.evaluate(()=>Quota.refresh(true)); await sleep(1200);
const q=await p.evaluate(()=>({limit:Quota.limit(),left:Quota.leftNow(),st:Quota.state()}));
console.log('    state:',JSON.stringify({limit:q.limit,left:q.left,week1:q.st.week1,ends:Math.round((q.st.week1Ends-Date.now())/864e5*10)/10}));
ok(q.limit===3&&q.left===3&&q.st.week1===true,'a new player: limit 3, left 3, habit week on (from the server)');
await p.evaluate(()=>document.querySelector('#profile-chip').click()); await sleep(600);
const menu=await p.evaluate(()=>{const m=document.querySelector('#pm-panel');return {habit:m.querySelector('.lc34-habit')?.innerText.replace(/\s+/g,' '),tok:m.querySelector('[data-lc32-tok]')?.innerText.replace(/\s+/g,' ')}});
console.log('    menu:',JSON.stringify(menu));
ok(/Habit week: 3 free tokens a day/.test(menu.habit||'')&&/7 days left|6 days left/.test(menu.habit||''),'the profile menu says: Habit week, 3 free tokens a day, 7 days left');
ok(/FREE DAILY 3 \/ 3/i.test(menu.tok||''),'and the daily card shows 3 / 3');
for(let i=1;i<=3;i++){const r=await p.evaluate(async(i)=>{const r=await Quota.spend('coach','habit-'+i);return {ok:r.ok,blocked:!!r.blocked}},i); if(i<=3)ok(r.ok&&!r.blocked,'coaching action '+i+' of 3 goes through')}
const r4=await p.evaluate(async()=>{const r=await Quota.spend('coach','habit-4');return {ok:r.ok,blocked:!!r.blocked}}); ok(r4.blocked&&!r4.ok,'the 4th is blocked for today');
// week over: simulate server answer
await p.evaluate(()=>Quota._t.apply({tier:'free',unlimited:false,limit:1,used:0,left:1,bonus:0,resetsAt:Date.now()+3e6,verified:true,week1:false,week1Ends:0}));
ok(await p.evaluate(()=>{LC34.tokens.first();return LC34.tokens.info().on}) ===false,'when the server says the week is over, the habit line goes away');
// offline fallback
const off=await p.evaluate(()=>({week:LC34.tokens.limitFor('free',{free:1,pro:10}),pro:LC34.tokens.limitFor('pro',{free:1,pro:10})}));
ok(off.week===3&&off.pro===10,'offline fallback inside the first 7 days: free 3, Pro unchanged');
await p.evaluate(()=>{Store.set('lc34-first',Date.now()-8*864e5)});
ok(await p.evaluate(()=>LC34.tokens.limitFor('free',{free:1,pro:10}))===1,'offline fallback after 7 days: back to 1');
ok(d.errs().length===0,'no page errors'); 
console.log(`\n${pass} passed, ${fail} failed`);
await rig.close(); await sql.end(); closeMock();
