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


const B=(sel)=>`q('${sel}')`;
console.log('D. drag out, download, share');
let d=await boot({creator:true}); let p=d.page; await openTakes(d); await sleep(400);
await p.evaluate(()=>{window.__shared=null;navigator.canShare=()=>true;navigator.share=async(x)=>{window.__shared={name:x.files[0].name,type:x.files[0].type,size:x.files[0].size,title:x.title}};window.__dl=[];const o=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){window.__dl.push({d:this.download,h:String(this.href).slice(0,5)});return o.apply(this,arguments)}});
const t1=await mkTake(p,'Italian game trap','#c0392b',1.3); await sleep(500);
await d.ev(`q('#lc35-st1').click();return 1`); for(let i=0;i<40;i++){await sleep(300);if(await d.ev(`return /Saved to the Content hub/.test(q('#lc35-msg').textContent)`))break}
await d.ev(`q('#lc35-hubopen').click();return 1`); await sleep(1800);
ok(await d.ev(`return q('.lc35-drag').getAttribute('aria-disabled')`)==='false'&&await d.ev(`return q('.lc35-drag').draggable`),'the drag handle is ready once the signed link has loaded');
const dr=await p.evaluate(()=>{const R=document.getElementById('harness').shadowRoot;const el=R.querySelector('.lc35-drag');const dt=new DataTransfer();const ev=new DragEvent('dragstart',{dataTransfer:dt,bubbles:true,cancelable:true});el.dispatchEvent(ev);return {dl:dt.getData('DownloadURL'),uri:dt.getData('text/uri-list'),txt:dt.getData('text/plain'),eff:dt.effectAllowed,prevented:ev.defaultPrevented}});
console.log('    DownloadURL:',dr.dl.slice(0,140));
const m=/^(video\/[a-z0-9]+):([a-z0-9._-]+):(https?:\/\/.+)$/.exec(dr.dl);
ok(m&&m[1]==='video/webm'&&/^italian-game-trap-single-take\.webm$/.test(m[2])&&/\/storage\/v1\/object\/sign\//.test(m[3]),'dragstart sets the DownloadURL (mime:filename:cloud URL) with a clean file name');
ok(dr.uri===m[3]&&dr.txt===m[3]&&!dr.prevented,'and the link as text/uri-list and plain text (the drag is not cancelled)');
const fz=await p.evaluate(async(u)=>(await (await fetch(u)).arrayBuffer()).byteLength,m[3]); ok(fz===t1.size,'the dragged URL downloads the exact video ('+fz+' bytes)');
await d.ev(`qa('.lc35-act button').find(b=>b.textContent==='Download').click();return 1`); await sleep(1500);
const dl=await p.evaluate(()=>window.__dl.filter(x=>x.h==='blob:'));
ok(dl.length===1&&/italian-game-trap-single-take\.webm$/.test(dl[0].d),'Download saves the file from the cloud copy under the same name');
await d.ev(`qa('.lc35-act button').find(b=>b.textContent==='Share to app').click();return 1`); await sleep(1500);
const sh=await p.evaluate(()=>window.__shared); ok(sh&&sh.type==='video/webm'&&sh.size===t1.size&&sh.name===m[2]&&sh.title==='Italian game trap','Share to app hands the real video file to the phone\'s share sheet');
await d.ev(`qa('.lc35-act button').find(b=>b.textContent==='Preview').click();return 1`); await sleep(700);
ok(await d.ev(`const v=q('.lc35-card video');return !!v&&v.src.includes('/storage/v1/object/sign/')`),'Preview plays it straight from the cloud URL');
const ups=await d.ev(`return qa('.lc35-pl a').map(a=>a.href+'|'+a.target+'|'+a.rel)`);
ok(ups.length===4&&ups.every(x=>/^https:\/\//.test(x)&&/_blank\|noopener noreferrer$/.test(x)),'four "Open uploader" links (TikTok, Instagram, Facebook, YouTube), new tab, noopener');
await d.ev(`q('#lc35-close').click();return 1`); await d.ctx.close();
await sql.unsafe('truncate arena.lc35_content'); store.clear();

console.log('E. Clip Archiver and variants');
d=await boot({creator:true}); p=d.page; await openTakes(d); await sleep(400);
const COL={hookA:'#e11d48',hookB:'#f59e0b',body:'#16a34a',ctaT:'#2563eb',ctaI:'#9333ea'};
const mk={}; for(const [k,n,c,s] of [['hookA','Hook A',COL.hookA,1.2],['hookB','Hook B alt',COL.hookB,1.2],['body','Body',COL.body,1.4],['ctaT','CTA TikTok',COL.ctaT,1.2],['ctaI','CTA Instagram',COL.ctaI,1.2]]){ mk[k]=await mkTake(p,n,c,s); }
await sleep(500);
for(const k of ['hookA','hookB','body','ctaT','ctaI']){ await p.evaluate((id)=>{LanckrietStudio.takes.cur=id;LanckrietStudio.takes.render()},mk[k].id); await sleep(700); await d.ev(`q('#lc35-add').click();return 1`); await sleep(500); }
ok(await d.ev(`return qa('.lc35-clip').length`)===5,'five clips on the timeline');
const roles={hookA:'Hook',hookB:'Hook',body:'Body',ctaT:'CTA',ctaI:'CTA'}; let idx=0;
for(const k of ['hookA','hookB','body','ctaT','ctaI']){ await d.ev(`const s=qa('.lc35-clip select')[${idx}];s.value='${roles[k]}';s.dispatchEvent(new Event('change'));return 1`); await sleep(350); idx++; }
ok(await d.ev(`return qa('.lc35-clip select').map(s=>s.value).join()`)==='Hook,Hook,Body,CTA,CTA','roles set: Hook, Hook (alternate), Body, CTA, CTA (alternate)');
ok(await d.ev(`return qa('.lc35-arch').length`)===5,'Clip Archiver is on: every clip has an Archive button');
await d.ev(`const c=q('#lc35-archiver');c.checked=false;c.dispatchEvent(new Event('change'));return 1`); await sleep(700);
ok(await d.ev(`return qa('.lc35-arch').length`)===0,'switch Clip Archiver off: the Archive buttons are hidden');
await d.ev(`const c=q('#lc35-archiver');c.checked=true;c.dispatchEvent(new Event('change'));return 1`); await sleep(700);
const flags=()=>p.evaluate(()=>LanckrietStudio.lc35.pj().clips.map(c=>c.label+':'+(c.off?'off':'on')).join('|'));
await d.ev(`qa('.lc35-arch')[1].click();return 1`); await sleep(500); await d.ev(`qa('.lc35-arch')[4].click();return 1`); await sleep(500);
console.log('    ',await flags());
ok(await d.ev(`return qa('.lc35-clip.off').length`)===2&&await d.ev(`return q('#lc35-proj .h b').textContent`).then(x=>/5 clips, 3 active/.test(x)),'Hook B and CTA Instagram archived: 5 clips stay on the timeline, 3 are active');
ok(await p.evaluate(()=>LanckrietStudio.takes.list.length)===5,'archiving deleted nothing: all five takes still exist');
await d.shot('t19-timeline');
// Variant A: TikTok bio link
await d.ev(`q('#lc35-vname').value='Variant A';q('#lc35-vcta').value='TikTok bio link';qa('[data-tg]').forEach(c=>{c.checked=c.dataset.tg==='tiktok'});q('#lc35-vsave').click();return 1`); await sleep(500);
// Variant B: swap the CTA
await d.ev(`qa('.lc35-arch')[3].click();return 1`); await sleep(400); await d.ev(`qa('.lc35-arch')[4].click();return 1`); await sleep(400);
await d.ev(`q('#lc35-vname').value='Variant B';q('#lc35-vcta').value='Instagram ManyChat';qa('[data-tg]').forEach(c=>{c.checked=c.dataset.tg==='instagram'});q('#lc35-vsave').click();return 1`); await sleep(500);
ok(await d.ev(`return qa('.lc35-var').map(b=>b.textContent).join()`)==='Variant A,Variant B','two variants saved from one master project');
await d.ev(`qa('.lc35-var')[0].click();return 1`); await sleep(400); const fa=await flags();
await d.ev(`qa('.lc35-var')[1].click();return 1`); await sleep(400); const fb=await flags();
console.log('    A:',fa); console.log('    B:',fb);
ok(fa==='Hook A:on|Hook B alt:off|Body:on|CTA TikTok:on|CTA Instagram:off','Variant A switches on Hook A + Body + CTA TikTok and archives the alternates');
ok(fb==='Hook A:on|Hook B alt:off|Body:on|CTA TikTok:off|CTA Instagram:on','Variant B swaps the CTA (CTA Instagram on, CTA TikTok archived)');
await d.ev(`qa('#lc35-clips .lc35-clip')[1].querySelectorAll('.bt button')[4].click();return 1`); await sleep(500);
ok(await d.ev(`return qa('.lc35-clip').length`)===4&&await p.evaluate(()=>LanckrietStudio.takes.list.length)===5,'removing a clip from the timeline keeps the take itself');
await p.evaluate((id)=>{LanckrietStudio.takes.cur=id;LanckrietStudio.takes.render()},mk.hookB.id); await sleep(600); await d.ev(`q('#lc35-add').click();return 1`); await sleep(500);
ok(await d.ev(`return qa('.lc35-clip').length`)===5,'and it can be added back');
await d.ev(`qa('.lc35-var')[1].click();return 1`); await sleep(400);
const before=await flags();

console.log('F. render every variant into the cloud, and check the pictures');
await d.ev(`q('#lc35-ra').click();return 1`);
for(let i=0;i<120;i++){await sleep(1000);if(await d.ev(`return /variants saved to the Content hub/.test(q('#lc35-msg').textContent)`))break}
const m2=await d.ev(`return q('#lc35-msg').textContent`); console.log('    ',m2);
ok(/2 of 2 variants saved/.test(m2),'"2 of 2 variants saved to the Content hub."');
const rows=await sql.unsafe("select variant, platforms, meta, state, bytes, mime from arena.lc35_content order by variant");
console.log('    rows:',rows.map(r=>r.variant+' '+r.platforms+' '+r.meta).join('\n          '));
ok(rows.length===2&&rows.every(r=>r.state==='ready'&&+r.bytes>1000),'two projects in the cloud, both complete');
const pa=JSON.parse(rows[0].platforms),pb=JSON.parse(rows[1].platforms),ma=JSON.parse(rows[0].meta),mb2=JSON.parse(rows[1].meta);
ok(pa.tiktok==='orange'&&pa.instagram==='red'&&pa.facebook==='red'&&pa.youtube==='red'&&ma.cta==='TikTok bio link','Variant A: TikTok to do, everything else "do not post", CTA label saved');
ok(pb.instagram==='orange'&&pb.tiktok==='red'&&mb2.cta==='Instagram ManyChat','Variant B: Instagram to do, everything else red');
ok(ma.clips.join()==='Hook: Hook A,Body: Body,CTA: CTA TikTok'&&mb2.clips.join()==='Hook: Hook A,Body: Body,CTA: CTA Instagram','the project note lists the exact clips used in each variant');
ok(ma.seconds>=3&&ma.seconds<=5,'Variant A is about 3.8 seconds (1.2 + 1.4 + 1.2): '+ma.seconds+' s');
ok(await flags()===before,'after "render all" the timeline is back exactly as it was');
// look at the frames of what was uploaded
const colors={red:[225,29,72],amber:[245,158,11],green:[22,163,74],blue:[37,99,235],purple:[147,51,234]};
const seq=async(variant)=>{ const path=[...store.keys()].find(k=>k.includes('/'+rows.find(r=>r.variant===variant)&&''))||null;
  const key=[...store.keys()][variant==='Variant A'?0:1]; const all=[...store.keys()]; const paths=(await sql.unsafe("select path from arena.lc35_content where variant=$1",[variant]))[0].path; const bytes=store.get('creator-content/'+paths);
  return p.evaluate(async({b64,colors})=>{const bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);const v=document.createElement('video');v.muted=true;v.playsInline=true;v.src=URL.createObjectURL(new Blob([u],{type:'video/webm'}));document.body.append(v);const c=document.createElement('canvas');c.width=c.height=16;const g=c.getContext('2d');const out=[];await new Promise(r=>v.onloadeddata=r);await v.play();
    await new Promise(res=>{const iv=setInterval(()=>{g.drawImage(v,v.videoWidth/2-8,v.videoHeight*.6,16,16,0,0,16,16);const d=g.getImageData(8,8,1,1).data;let best='',bd=1e9;for(const k in colors){const e=colors[k],dd=(d[0]-e[0])**2+(d[1]-e[1])**2+(d[2]-e[2])**2;if(dd<bd){bd=dd;best=k}}out.push(bd<9000?best:'?');if(v.ended||v.paused&&out.length>20){clearInterval(iv);res()}},60);setTimeout(()=>{clearInterval(iv);res()},12000)});v.remove();
    const runs=[];out.forEach(x=>{const l=runs[runs.length-1];if(l&&l.c===x)l.n++;else runs.push({c:x,n:1})});return runs.filter(r=>r.n>=4&&r.c!=='?').map(r=>r.c)},{b64:Buffer.from(bytes).toString('base64'),colors}); };
const sa=await seq('Variant A'), sb=await seq('Variant B'); console.log('    colours over time A:',sa.join(' > '),'| B:',sb.join(' > '));
ok(sa.join()==='red,green,blue','Variant A really plays: Hook A (red) > Body (green) > CTA TikTok (blue)');
ok(sb.join()==='red,green,purple','Variant B really plays: Hook A (red) > Body (green) > CTA Instagram (purple)');
ok(!sa.includes('amber')&&!sb.includes('amber'),'the archived alternate hook (amber) is in neither video');

console.log('G. when the cloud cannot take it');
await d.ev(`q('#lc35-hubopen').click();return 1`); await sleep(1500);
const nCards=await d.ev(`return qa('.lc35-card').length`); ok(nCards===2,'the hub now holds both variants'); await d.ev(`q('#lc35-close').click();return 1`);
await p.evaluate(()=>{window.__dl=[];const oc=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){window.__dl.push({d:this.download,h:String(this.href).slice(0,5)});return oc.apply(this,arguments)};const o=Quota.call;window.__origCall=o;Quota.call=async(a,b)=>a==='content_begin'?{ok:false,reason:'storage_off',status:503}:o.call(Quota,a,b)});
await d.ev(`q('#lc35-rv').click();return 1`);
for(let i=0;i<60;i++){await sleep(1000);if(await d.ev(`return /download instead/.test(q('#lc35-msg').textContent)`))break}
const m3=await d.ev(`return q('#lc35-msg').textContent`); console.log('    ',m3);
ok(/not connected on the server yet/.test(m3)&&/saved as a download instead/.test(m3),'cloud off: a clear message, and the video is saved as a download instead (nothing is lost)');
ok(await p.evaluate(()=>window.__dl.some(x=>x.h==='blob:'&&/\.(webm|mp4)$/.test(x.d))),'the fallback download happened');
await p.evaluate(()=>{Quota.call=window.__origCall;LanckrietStudio.lc35.state.usage.maxFile=1000});
await d.ev(`q('#lc35-rv').click();return 1`);
for(let i=0;i<60;i++){await sleep(1000);if(await d.ev(`return /cloud file limit/.test(q('#lc35-msg').textContent)`))break}
ok(/cloud file limit/.test(await d.ev(`return q('#lc35-msg').textContent`)),'a video over the cloud file limit: the message names the limit and suggests a lower resolution');
await p.evaluate(()=>{LanckrietStudio.lc35.state.usage.maxFile=5e7});
console.log('H. everything archived');
const allOff=await p.evaluate(async()=>{const P=LanckrietStudio.lc35.pj();LanckrietStudio.lc35.state.items.length;const s=JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>/lc35-project/.test(k))));return s.clips.length});
for(let i=0;i<5;i++){ await d.ev(`const b=qa('.lc35-arch').find(b=>b.textContent==='Archive');b&&b.click();return 1`); await sleep(350); }
ok(await d.ev(`return q('#lc35-rv').disabled&&q('#lc35-rt').disabled`),'with every clip archived the render buttons are disabled');
await p.evaluate(()=>LanckrietStudio.lc35.renderVariant('master')); await sleep(800);
ok(/Every clip is archived/.test(await d.ev(`return q('#lc35-msg').textContent`)),'and a forced render says "Every clip is archived. Restore at least one."');
console.log('    page errors:',JSON.stringify(d.errs().slice(0,3)));
ok(d.errs().length===0,'no page errors');
console.log(`\nPART 2: ${pass} passed, ${fail} failed`);
await rig.close(); await sql.end(); closeMock();
