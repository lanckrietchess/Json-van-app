import { start, sleep } from './rig.mjs';
import { sql, store, st, arena, routes, prep, makeCreator, closeMock, ADMIN } from './lib19.mjs';
let pass=0, fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)} };
await prep(); const log=[]; const h=arena();
const rig = await start('/home/claude/build/index.html',{ external: routes(h, log) });
async function boot(o){ o=o||{}; const d=await rig.device({}, {path:'/',w:1440,h:1000}); const p=d.page; await sleep(4200);
  await p.evaluate(()=>{V5Doc.server=()=>({url:'https://stub.supabase.co/functions/v1/arena'});document.querySelectorAll('.lc30-ask').forEach(e=>e.remove());LanckrietStudio._t.Cfg.res='720p';LanckrietStudio._t.Cfg.fps=15});
  if(o.admin)await p.evaluate((s)=>sessionStorage.setItem('lc-hub-worker-secret',s),ADMIN);
  const dev=await p.evaluate(()=>deviceId()); if(o.creator)await makeCreator(h,dev);
  await p.evaluate((o)=>{const host=document.createElement('div');host.id='harness';host.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#0A0B0E;overflow:auto';document.body.append(host);LanckrietStudio.mount(host,{isLocked:()=>false,isAdmin:()=>!!o.admin,tier:()=>'free',isCreator:()=>!!o.creator,upgrade(){},stockfish:()=>Engine,chessUser:()=>''},{embedded:true})},{admin:!!o.admin,creator:!!o.creator});
  await sleep(900); d.ev=(code)=>p.evaluate(`(()=>{const R=document.getElementById('harness').shadowRoot;const q=s=>R.querySelector(s);const qa=s=>[...R.querySelectorAll(s)];${code}})()`);
  d.errs=()=>d.errors.filter(e=>!/404|fetching the script|Failed to load/.test(e)); return d }
/* record a short coloured clip in the page and add it as a take */
const mkTake=(p,name,color,sec)=>p.evaluate(async({name,color,sec})=>{
  const c=document.createElement('canvas');c.width=180;c.height=320;const g=c.getContext('2d');const s=c.captureStream(15);const mr=new MediaRecorder(s,{mimeType:'video/webm;codecs=vp8'});const ch=[];mr.ondataavailable=e=>e.data.size&&ch.push(e.data);const done=new Promise(r=>mr.onstop=r);mr.start(200);
  const t0=performance.now();await new Promise(res=>{const f=()=>{g.fillStyle=color;g.fillRect(0,0,180,320);g.fillStyle='#fff';g.font='20px sans-serif';g.fillText(name,10,30);if(performance.now()-t0<sec*1000)requestAnimationFrame(f);else res()};f()});
  mr.stop();await done;const blob=new Blob(ch,{type:'video/webm'});
  const t={id:'t'+Math.random().toString(36).slice(2,8),name:name,blob:blob,mime:'video/webm',durationMs:sec*1000,w:180,h:320,fps:15,env:[],markers:[],cuts:[],trimIn:0,trimOut:sec,createdAt:Date.now(),size:blob.size,onDisk:false,captions:[]};
  await LanckrietStudio.takes.add(t);return {id:t.id,size:blob.size}},{name,color,sec});
const openTakes=(d)=>d.ev(`const b=qa('button').find(b=>/Takes & trim/.test(b.textContent));b&&b.click();return 1`);

console.log('A. who can open the hub');
let d=await boot({creator:false}); let p=d.page;
await d.ev(`q('#lc35-open').click();return 1`); await sleep(900);
ok(await d.ev(`return /creator and admin accounts/.test(q('#lc35-hub').innerText)`),'a normal member sees "The Content Hub is for creator and admin accounts."');
ok(await d.ev(`return !q('#lc35-hub .lc35-card')`),'and no projects'); await d.ctx.close();

console.log('B. save a take to the cloud');
d=await boot({creator:true}); p=d.page; await openTakes(d); await sleep(500);
const t1=await mkTake(p,'Caro-Kann trap','#c0392b',1.4); await sleep(600);
ok(await d.ev(`return !!q('#lc35-st1')&&!q('#lc35-st1').disabled`),'the take editor has "Save this take to Content hub"');
await d.ev(`q('#lc35-st1').click();return 1`);
for(let i=0;i<40;i++){await sleep(300);if(await d.ev(`return /Saved to the Content hub/.test(q('#lc35-msg').textContent)`))break}
const msg=await d.ev(`return q('#lc35-msg').textContent`); console.log('    ',msg);
ok(/Saved to the Content hub: Caro-Kann trap/.test(msg),'upload finished with a clear message');
const row=(await sql.unsafe("select * from arena.lc35_content"))[0];
ok(row&&row.state==='ready'&&+row.bytes===t1.size&&store.size===1,'exactly one project in the cloud; its size equals the video ('+(row&&row.bytes)+' bytes)');
ok(row&&[...store.values()][0].length===t1.size,'the storage holds the same number of bytes the browser sent (no corruption in the multipart upload)');
await d.ev(`q('#lc35-hubopen').click();return 1`); await sleep(1600);
let cards=await d.ev(`return qa('.lc35-card').map(c=>({t:c.querySelector('h3').textContent,sts:[...c.querySelectorAll('.lc35-st')].map(b=>b.dataset.pl+':'+b.dataset.st+':'+b.querySelector('em').textContent),trash:c.querySelector('.lc35-trash').disabled,hint:c.querySelector('.lc35-hint')?.textContent}))`);
console.log('    card:',JSON.stringify(cards[0]));
ok(cards.length===1&&cards[0].t==='Caro-Kann trap','the hub lists the project');
ok(cards[0].sts.join()==='tiktok:orange:To do,instagram:orange:To do,facebook:orange:To do,youtube:orange:To do','all four platforms start orange ("To do")');
ok(cards[0].trash===true&&/Waiting for: TikTok, Instagram, Facebook, YouTube/.test(cards[0].hint),'Trash / Archive is disabled and says what it is waiting for');
await d.shot('t19-hub');

console.log('C. the three statuses and the Trash rule');
await d.ev(`q('.lc35-st[data-pl=tiktok]').click();return 1`); await sleep(600);
ok(await d.ev(`return q('.lc35-st[data-pl=tiktok]').dataset.st`)==='green','one click on an orange platform: green (Posted)');
await d.ev(`q('.lc35-st[data-pl=instagram]').click();return 1`); await sleep(500); await d.ev(`q('.lc35-st[data-pl=instagram]').click();return 1`); await sleep(600);
ok(await d.ev(`return q('.lc35-st[data-pl=instagram]').dataset.st`)==='red','two clicks: red (Skip)');
ok(await d.ev(`return q('.lc35-st[data-pl=instagram]').getAttribute('aria-label')`).then(x=>/Instagram: Do not post here/.test(x)),'every chip has a text label and an aria-label, not just a colour');
const srv=(await sql.unsafe("select platforms from arena.lc35_content"))[0].platforms; ok(JSON.parse(srv).tiktok==='green'&&JSON.parse(srv).instagram==='red','the statuses are saved in the cloud');
ok(await d.ev(`return q('.lc35-trash').disabled`)===true,'two platforms still orange: Trash stays disabled');
await d.ev(`q('.lc35-st[data-pl=facebook]').click();return 1`); await sleep(500); await d.ev(`q('.lc35-st[data-pl=facebook]').click();return 1`); await sleep(500);
ok(await d.ev(`return q('.lc35-trash').disabled`)===true,'three of four resolved: still disabled');
await d.ev(`q('.lc35-st[data-pl=youtube]').click();return 1`); await sleep(700);
ok(await d.ev(`return q('.lc35-trash').disabled`)===false,'all four are green or red: Trash / Archive becomes active');
await d.shot('t19-resolved');
// the arming step
await d.ev(`q('.lc35-trash').click();return 1`); await sleep(400);
ok(await d.ev(`return q('.lc35-trash').textContent`)==='Press again to delete'&&store.size===1,'first press only arms it ("Press again to delete"); nothing is deleted');
await sleep(4400); ok(await d.ev(`return q('.lc35-trash').textContent`)==='Trash / Archive','after 4 seconds it disarms by itself');
// a stale second device flips a platform back to orange: the server still protects the files
await sql.unsafe("update arena.lc35_content set platforms = $1", [JSON.stringify({tiktok:'green',instagram:'red',facebook:'orange',youtube:'green'})]);
const dr=await p.evaluate(async()=>{const it=LanckrietStudio.lc35.state.items[0];const r=await Quota.call('content_delete',{id:it.id});return {status:r.status,reason:r.reason,pending:r.pending}});
ok(dr.status===409&&dr.reason==='not_resolved'&&dr.pending.join()==='facebook'&&store.size===1,'even if the screen is out of date, the server refuses to delete while a platform is orange');
await sql.unsafe("update arena.lc35_content set platforms = $1", [JSON.stringify({tiktok:'green',instagram:'red',facebook:'red',youtube:'green'})]);
await d.ev(`q('#lc35-refresh').click();return 1`); await sleep(1500);
await d.ev(`q('.lc35-trash').click();return 1`); await sleep(300); await d.ev(`q('.lc35-trash').click();return 1`); await sleep(1500);
ok(store.size===0&&(await sql.unsafe("select count(*)::int c from arena.lc35_content"))[0].c===0,'second press: the file and the project are gone from the cloud');
ok(await d.ev(`return /No projects yet/.test(q('#lc35-hub').innerText)`),'the library is clean again');
ok(d.errs().length===0,'no page errors '+JSON.stringify(d.errs().slice(0,2))); await d.ctx.close();

console.log(`\nPART 1: ${pass} passed, ${fail} failed`);
await rig.close(); await sql.end(); closeMock();
