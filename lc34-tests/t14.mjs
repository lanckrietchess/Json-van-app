import { start, sleep } from './rig.mjs';
import postgres from '/home/claude/arena/node_modules/postgres/src/index.js';
import { makeHandler } from '/home/claude/arena/out/handler.js';
import { PG_TYPES } from '/home/claude/arena/out/db.js';
let pass=0, fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)} };
/* ---- real Arena on real Postgres; only ElevenLabs is faked (a short valid WAV) ---- */
const sql = postgres({ host: '127.0.0.1', username: 'postgres', database: 'lc26a', max: 3, types: PG_TYPES, onnotice: () => {} });
await sql.unsafe('truncate arena.players, arena.quota, arena.token_ledger, arena.token_bonus, arena.token_spend, arena.voice_cache');
const wav=()=>{const sr=22050,n=Math.floor(sr*.9),b=Buffer.alloc(44+n*2);b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(8000*Math.sin(i/12)),44+i*2);return b};
const realFetch=globalThis.fetch; let eleven=0, elevenFail=false;
globalThis.fetch=async(u,i)=>{ if(String(u).includes('api.elevenlabs.io')){eleven++;if(elevenFail)return new Response('x',{status:500});return new Response(wav(),{status:200})} return realFetch(u,i)};
const S='admin-token-admin-token';
const handle=makeHandler(sql,{PID_SALT:'salt-salt-salt-salt',TOKENS_FREE_BOOST_DAYS:'0',TOKENS_FREE:'1',ADMIN_TOKEN:S,ELEVENLABS_API_KEY:'k'.repeat(24),ELEVENLABS_VOICE_ID:'VoiceId1234567'});
const arenaCalls=[];
const external=async(req,full,u,CORS)=>{
  if(/functions\/v1\/arena/.test(full)){
    if(req.method()==='OPTIONS'){await req.respond({status:204,headers:{...CORS}});return true}
    const body=req.postData()||'{}';try{arenaCalls.push(JSON.parse(body).action)}catch(e){}
    const r=await handle(new Request(full,{method:'POST',headers:{Origin:'https://lanckrietchess-app.vercel.app','content-type':'application/json'},body}));
    await req.respond({status:r.status,headers:{...CORS,'content-type':'application/json'},body:await r.text()});return true}
  return undefined; };
const rig = await start('/home/claude/build/index.html',{external});
const d = await rig.device({}, { path: '/', w: 1280, h: 1000 }); const p=d.page;
await sleep(4500);
await p.evaluate(()=>{document.querySelectorAll('.sheet-wrap,.sheet-scrim,[role=dialog]').forEach(e=>e.remove());document.querySelectorAll('.lc30-ask').forEach(e=>{let n=e;while(n.parentElement&&n.parentElement!==document.body)n=n.parentElement;n.remove()})});
const R=(code)=>p.evaluate(`(()=>{const q=s=>document.querySelector(s);const qa=s=>[...document.querySelectorAll(s)];${code}})()`);
/* ---- open the real Partner page (admin preview of a partner dashboard) ---- */
const opened=await p.evaluate(async()=>{try{Store.set('lc19-sw',{on:false});Admin.viewingAs=()=>"b2b-mid";location.hash='#about';await new Promise(r=>setTimeout(r,500));location.hash='#partner';await new Promise(r=>setTimeout(r,1500));return 'ok'}catch(e){return 'ERR '+e.message}});
const tabs=await R(`return qa('[data-v71-ptab]').map(b=>b.textContent)`);
console.log('    partner tabs:',JSON.stringify(tabs));
ok(opened==='ok'&&tabs.indexOf('Carousel')>=0,'Business / Partner page has a Carousel tab');
await R(`q('[data-v71-ptab=carousel]').click();return 1`); await sleep(900);
ok(await R(`return !!q('.lc32-cb')`),'clicking the tab opens the Carousel Builder');
ok(await R(`return qa('.lc32-th').length`)===3,'it starts with 3 slides: hook, content, CTA');
ok(await R(`return qa('.lc32-th span').map(e=>e.textContent).join(',')`)==='Hook,Content,CTA','slide stages are labelled Hook, Content, CTA');
await d.shot('t14-builder');
const B=()=>p.evaluate(()=>LC32.builder().project());
/* ---- hook library + templates ---- */
await R(`qa('.lc32-tabs button').find(b=>b.textContent==='Library').click();return 1`); await sleep(200);
const nHooks=await R(`return qa('.lc32-li').length`);
ok(nHooks>=15,'Hook & Idea Library lists '+nHooks+' items');
ok(await R(`return qa('[data-cat]').map(b=>b.textContent).join(',')`).then(t=>/viral/.test(t)&&/formula/.test(t)&&/prompt/.test(t)&&/idea/.test(t)),'hooks are categorised (viral, formula, prompt, idea)');
const firstHook=await R(`return q('.lc32-li .lc32-lt').textContent`);
await R(`qa('.lc32-li button').find(b=>b.textContent==='Use as hook').click();return 1`); await sleep(200);
ok((await B()).slides[0].title===firstHook,'"Use as hook" fills slide 1');
const openLib=async()=>{await R(`qa('.lc32-tabs button').find(b=>b.textContent==='Library').click();return 1`);await sleep(150)};
await openLib();
await R(`qa('[data-lib=ctas]')[0].click();return 1`); await sleep(200);
const ctaTexts=await R(`return qa('.lc32-li .lc32-lt').map(e=>e.textContent)`);
ok(ctaTexts.some(t=>/€80\+\/hr/.test(t)&&/24\/7 AI personal coach/.test(t)&&/APP/.test(t)),'CTA library has the price-anchoring hook (€80+/hr vs 24/7 AI coach, comment APP)');
ok(ctaTexts.some(t=>/lanckrietchess|\//.test(t)&&!/\[REFERRAL_LINK\]/.test(t)),'[REFERRAL_LINK] is merged into app-download CTAs');
await R(`qa('.lc32-li button').find(b=>b.textContent==='Use as CTA').click();return 1`); await sleep(200);
ok((await B()).slides[2].text.length>20&&(await B()).slides[2].stage==='cta','"Use as CTA" fills the last slide');
await openLib();await R(`qa('[data-lib=assets]')[0].click();return 1`); await sleep(200);
ok(await R(`return qa('.lc32-bgsw').length`)===6,'6 branded background templates in Content & Assets');
await R(`qa('.lc32-li').find(e=>/Blunder Alert/.test(e.textContent)).querySelector('button').click();return 1`); await sleep(200);
ok((await B()).slides[2].brand==='alert'||(await B()).slides[0].brand==='alert'||(await B()).slides[(await p.evaluate(()=>LC32.builder().selected()))].brand==='alert','a background template applies to the slide');
// own item + CMS items
await openLib();await R(`qa('[data-lib=hooks]')[0].click();return 1`);await sleep(100);
await R(`const t=q('#lc32-ladd');t.value='Always lead with the mistake, not the lesson';q('#lc32-lcat').value='mine';q('#lc32-lsave').click();return 1`); await sleep(150);
await R(`qa('[data-lib=hooks]')[0].click();return 1`); await sleep(150);
ok(await R(`return qa('.lc32-lt').some(e=>/lead with the mistake/.test(e.textContent))`),'a partner can add their own library item');
await p.evaluate(()=>{CONTENT.carouselLibs={hooks:[{cat:'cms',text:'Shared from content.json: the 3-second rule'}]}});
await R(`qa('[data-lib=ctas]')[0].click();qa('[data-lib=hooks]')[0].click();return 1`); await sleep(150);
ok(await R(`return qa('.lc32-lt').some(e=>/Shared from content.json/.test(e.textContent))`),'items from content.json (carouselLibs) appear without a rebuild');
/* ---- paste a screenshot (clipboard image) ---- */
await R(`qa('.lc32-th')[1].click();return 1`); await sleep(150);
await R(`qa('.lc32-tabs button').find(b=>b.textContent==='Slide').click();return 1`); await sleep(150);
await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=400;c.height=300;const g=c.getContext('2d');g.fillStyle='#ff00aa';g.fillRect(0,0,400,300);const b=await new Promise(r=>c.toBlob(r,'image/png'));const dt=new DataTransfer();dt.items.add(new File([b],'shot.png',{type:'image/png'}));document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))});
await sleep(700);
let pr=await B();
ok(pr.slides[1].hasImg===true,'Ctrl+V of an image puts it on the selected content slide');
const px=await p.evaluate(()=>{const c=LC32.builder().render(1,1080,1350,{noMark:true});const g=c.getContext('2d');return [...g.getImageData(540,700,1,1).data]});
console.log('    centre pixel',JSON.stringify(px));
ok(px[0]>200&&px[1]<40&&px[2]>120,'the pasted picture is drawn in the slide');
// paste while on the hook slide: a new content slide is created, not a broken hook
await R(`qa('.lc32-th')[0].click();return 1`); await sleep(100);
await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=200;c.height=200;c.getContext('2d').fillRect(0,0,200,200);const b=await new Promise(r=>c.toBlob(r,'image/png'));const dt=new DataTransfer();dt.items.add(new File([b],'s2.png',{type:'image/png'}));document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))});
await sleep(600); pr=await B();
ok(pr.slides.length===4&&pr.slides[1].stage==='content'&&pr.slides[2].hasImg===true||pr.slides.filter(s=>s.stage==='content').length===2,'pasting while on the hook slide makes a new content slide');
ok(await p.evaluate(()=>{let t=document.createElement('textarea');document.body.append(t);t.focus();const dt=new DataTransfer();dt.setData('text/plain','x');const n=LC32.builder().project().slides.length;t.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true}));t.remove();return LC32.builder().project().slides.length===n}),'pasting text into a text box does not trigger the image handler');
await p.evaluate(()=>LC32.builder().select(1)); await sleep(100);
/* ---- persistence: reload keeps slides and images (IndexedDB) ---- */
await p.evaluate(()=>{LC32.builder().dispose()}); await sleep(100);
await p.evaluate(async()=>{location.hash='#about';await new Promise(r=>setTimeout(r,500));location.hash='#partner'}); await sleep(1500);
await R(`q('[data-v71-ptab=carousel]').click();return 1`); await sleep(1000);
pr=await B();
ok(pr.slides.length===4&&pr.slides[1].hasImg,'closing and reopening the builder keeps the slides');
ok(await p.evaluate(()=>!!LC32._t.IMG[LC32.builder().project().slides[1].id]),'and the pasted image comes back from storage');
/* ---- positions ---- */
await p.evaluate(()=>LC32.builder().select(1)); await sleep(100);
await R(`qa('.lc32-tabs button').find(b=>b.textContent==='Slide').click();return 1`); await sleep(100);
await R(`q('#lc32-fen').value='bad fen';q('#lc32-loadfen').click();return 1`); await sleep(100);
ok(await R(`return /not valid/.test(q('[data-lc32-status]').textContent)`),'a bad FEN gives a clear message');
await R(`q('#lc32-fen').value='r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';q('#lc32-loadfen').click();return 1`); await sleep(500);
pr=await B(); ok(pr.slides[1].fen.startsWith('r1bqkbnr')&&!pr.slides[1].hasImg,'a FEN replaces the image with a board');
const brd=await p.evaluate(()=>{const g=LC32.builder().render(1,1080,1350,{noMark:true}).getContext('2d');const a=new Set();for(let x=120;x<960;x+=60)a.add(g.getImageData(x,520,1,1).data.join());return a.size});
ok(brd>=2,'the board is drawn (not the premium placeholder) for an ordinary position ('+brd+' colours)');
const pgn='[Event "T"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 1-0';
const before=pr.slides.length;
await R(`q('#lc32-pgn').value=${JSON.stringify(pgn)};q('#lc32-from').value='2';q('#lc32-to').value='10';q('#lc32-every').value='2';q('#lc32-addmoves').click();return 1`); await sleep(500);
pr=await B(); const added=pr.slides.length-before;
console.log('    move-by-move slides added:',added,pr.slides.slice(before-1,before-1+added).map(s=>s.text).join(' '));
ok(added===5,'PGN plies 2..10 every 2 gives 5 position slides');
ok(pr.slides[pr.slides.length-1].stage==='cta'&&pr.slides[before-1].last&&/^Move/.test(pr.slides[before-1].title),'they sit before the CTA, with the last move marked');
await R(`q('#lc32-pgn').value='not a pgn at all';q('#lc32-addmoves').click();return 1`); await sleep(100);
ok(await R(`return /Could not read this PGN/.test(q('[data-lc32-status]').textContent)`),'an unreadable PGN gives a clear message and adds nothing');
await R(`q('#lc32-puz').value='8/8/8/8/8/5k2/8/4K2R w - - 0 1 | Rook endgame\\nnot a fen\\n4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';q('#lc32-addpuz').click();return 1`); await sleep(300);
ok((await B()).slides.length===before+added+2,'puzzle list adds 2 slides and skips the invalid line');
/* ---- annotate with the real mouse ---- */
await p.evaluate(()=>{const b=LC32.builder();b.select(1);b.tab('annotate')}); await sleep(250);
await R(`q('[data-prev]').scrollIntoView({block:'center'});return 1`);await sleep(200);
const box=await R(`const r=q('[data-prev]').getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height}`);
console.log('    preview box',JSON.stringify(box));
await p.mouse.move(box.x+box.w*.2,box.y+box.h*.3); await p.mouse.down(); await p.mouse.move(box.x+box.w*.6,box.y+box.h*.5,{steps:6}); await p.mouse.up(); await sleep(150);
let notes=(await B()).slides[1].notes; ok(notes.length===1&&notes[0].t==='a','dragging draws an arrow');
await R(`q('[data-tool=circle]').click();return 1`); await sleep(100);
await p.mouse.move(box.x+box.w*.5,box.y+box.h*.7); await p.mouse.down(); await p.mouse.move(box.x+box.w*.58,box.y+box.h*.7,{steps:5}); await p.mouse.up(); await sleep(150);
notes=(await B()).slides[1].notes; ok(notes.length===2&&notes[1].t==='o'&&notes[1].r>.03,'dragging outwards draws a circle');
await R(`q('[data-tool=sticker]').click();return 1`); await sleep(100); await R(`q('[data-sticker="⚠️"]').click();return 1`); await sleep(100);
await p.mouse.click(box.x+box.w*.8,box.y+box.h*.2); await sleep(150);
await R(`q('[data-tool=text]').click();return 1`); await sleep(100); await R(`const t=q('#lc32-ntext');t.value='Look here!';t.dispatchEvent(new Event('input'));q('.lc32-sw[data-color="#22C55E"]').click();return 1`); await sleep(100);
await p.mouse.click(box.x+box.w*.3,box.y+box.h*.85); await sleep(150);
notes=(await B()).slides[1].notes; console.log('    notes:',notes.map(n=>n.t+(n.g?':'+n.g:'')).join(' '));
ok(notes.length===4&&notes[2].t==='s'&&notes[3].t==='t'&&notes[3].g==='Look here!'&&notes[3].c==='#22C55E','sticker and coloured text are placed where you click');
const red=await p.evaluate(()=>{const c=LC32.builder().render(1,540,675,{noMark:true});const g=c.getContext('2d').getImageData(0,0,540,675).data;let n=0;for(let i=0;i<g.length;i+=4)if(g[i]>230&&g[i+1]<90&&g[i+2]<110)n++;return n});
ok(red>150,'the red arrow and circle are in the rendered slide ('+red+' px)');
await R(`q('#lc32-undo').click();return 1`); await sleep(100); ok((await B()).slides[1].notes.length===3,'Undo removes the last annotation');
await R(`q('#lc32-clear').click();return 1`); await sleep(100); ok((await B()).slides[1].notes.length===0,'Clear removes all');
await d.shot('t14-annotated');
/* ---- AI prompt generator ---- */
await R(`qa('.lc32-tabs button').find(b=>b.textContent==='AI prompts').click();return 1`); await sleep(150);
await R(`q('#lc32-aitopic').value='hanging queen on move 12';q('#lc32-aigen').click();return 1`); await sleep(150);
const prompts=await R(`return qa('.lc32-lt').map(e=>e.textContent)`);
ok(prompts.length===3&&prompts.every(t=>/hanging queen on move 12/.test(t)&&/no text/.test(t)),'AI prompt generator returns 3 prompts about the topic');
console.log(`\n--- part 1: ${pass} passed, ${fail} failed`);
globalThis.__state={p,d,rig,sql,handle,S,arenaCalls,R,B,ev:()=>eleven};
export {};
const g=globalThis.__state;
/* ---- voice-over through the real Arena ---- */
await p.evaluate(()=>{V5Doc.server=()=>({url:'https://stub.supabase.co/functions/v1/arena'})});
console.log('    V5Net.on():',await p.evaluate(()=>V5Net.on()));
// small, known texts
await p.evaluate(()=>{const b=LC32.builder();const P=b.project();P.slides=P.slides.filter(s=>s.stage!=='content'||s===P.slides[1]);P.slides[0].title='Stop playing this move';P.slides[0].text='';P.slides[1].title='The position';P.slides[1].text='Black just hung the knight on e4.';P.slides[1].narration='';P.slides[P.slides.length-1].title='Train this free';P.slides[P.slides.length-1].text='Comment APP to get the link.';b.select(0);b.tab('audio')});
await sleep(300);
await R(`qa('[data-audio=voice]')[0].click();return 1`); await sleep(300);
ok(await R(`return qa('[data-narr]').length`)===3,'voice mode shows one narration box per slide');
await R(`q('#lc32-quote-btn').click();return 1`); await sleep(1200);
const qt=await R(`return q('#lc32-quote').textContent`);
console.log('    quote:',qt);
ok(/\d+ new\)/.test(qt)&&/1 token/.test(qt)&&/1 free daily/.test(qt)&&/0 purchased/.test(qt),'price check shows characters, 1 token, and both balances');
ok((await p.evaluate(()=>Quota.leftNow()))===1,'the price check charged nothing (daily token still 1)');
// need more than the daily token: top up the purchased pocket for this browser's player
const dev=await p.evaluate(()=>deviceId());
const pid=(await (await handle(new Request('https://x.test/',{method:'POST',headers:{Origin:'https://lanckrietchess-app.vercel.app','content-type':'application/json'},body:JSON.stringify({action:'hello',device:dev})}))).json()).pid;
console.log('    browser player id:',pid);
await R(`q('#lc32-gen').click();return 1`); await sleep(500);
const armTxt=await R(`return q('#lc32-gen').textContent`);
ok(/Confirm: use 1 token/.test(armTxt),'first press asks for confirmation before spending ('+armTxt+')');
ok(eleven===0,'nothing generated or charged before the confirm');
await R(`q('#lc32-gen').click();return 1`);
for(let i=0;i<40;i++){await sleep(250);if(await R(`return qa('.pill').some(e=>/^Ready/.test(e.textContent))`))break}
const stTxt=await R(`return q('[data-lc32-status]').textContent`);
console.log('    status:',stTxt,'| ElevenLabs calls:',eleven);
ok(/Voice-over ready/.test(stTxt)&&/1 token/.test(stTxt)&&/1 daily, 0 purchased/.test(stTxt),'voice-over made; the free daily token was used');
ok(eleven===3,'3 clips generated, one per slide');
const ready=await R(`return qa('.pill').filter(e=>/^Ready/.test(e.textContent)).map(e=>e.textContent)`);
ok(ready.length===3&&ready.every(t=>/Ready 0\.9 s/.test(t)),'each slide shows its audio length ('+ready.join(' | ')+')');
ok((await p.evaluate(()=>[Quota.leftNow(),Quota.bonusNow()])).join()==='0,0','balances now 0 daily / 0 purchased in the app');
const dbState=await sql.unsafe("select (select coalesce(sum(n),0) from arena.token_ledger) used, (select count(*) from arena.token_spend where kind='voice') jobs");
ok(+dbState[0].used===1&&+dbState[0].jobs===1,'server recorded 1 daily token used and 1 voice job');
// same text again = free; changed text with no tokens = refused with a clear message
await R(`q('#lc32-quote-btn').click();return 1`); await sleep(1000);
ok(/0 new\)/.test(await R(`return q('#lc32-quote').textContent`))&&/0 token/.test(await R(`return q('#lc32-quote').textContent`)),'asking again for the same text prices at 0 tokens (already made)');
await p.evaluate(()=>{const P=LC32.builder().project();P.slides[1].narration='A brand new narration for this slide that has not been generated yet.'});
await R(`const t=qa('[data-narr]')[1];t.value='A brand new narration for this slide that has not been generated yet.';t.dispatchEvent(new Event('input'));return 1`); await sleep(200);
await R(`q('#lc32-gen').click();return 1`); await sleep(1500);
let msg=await R(`return q('[data-lc32-status]').textContent`);
console.log('    out-of-tokens message:',msg);
ok(/Not enough tokens/.test(msg)&&/needs 1/.test(msg),'with no tokens left the user gets a clear "Not enough tokens" message');
ok(eleven===3,'and nothing was generated');
// grant purchased tokens: daily first is already empty, so this spends from purchased
await handle(new Request('https://x.test/',{method:'POST',headers:{Origin:'https://lanckrietchess-app.vercel.app','content-type':'application/json'},body:JSON.stringify({action:'a5_token_grant',device:'admin-dev-1',token:S,pid,n:2})}));
await p.evaluate(()=>Quota.refresh(true)); await sleep(800);
ok((await p.evaluate(()=>Quota.bonusNow()))===2,'2 purchased tokens appear after a top-up');
await R(`q('#lc32-gen').click();return 1`); await sleep(500);
ok(/Confirm: use 1 token/.test(await R(`return q('#lc32-gen').textContent`)),'confirm step shown again for the changed text');
await R(`q('#lc32-gen').click();return 1`);
for(let i=0;i<40;i++){await sleep(250);if(/Voice-over ready/.test(await R(`return q('[data-lc32-status]').textContent`)))break}
const st2=await R(`return q('[data-lc32-status]').textContent`);
console.log('    status:',st2);
ok(/0 daily, 1 purchased/.test(st2),'with the daily token gone, the purchased token pays');
ok((await p.evaluate(()=>[Quota.leftNow(),Quota.bonusNow()])).join()==='0,1','balances now 0 daily / 1 purchased');
// upstream failure: tokens come back
elevenFail=true;
await p.evaluate(()=>{const P=LC32.builder().project();P.slides[1].narration='Yet another line of narration that will fail upstream.'});
await R(`const t=qa('[data-narr]')[1];t.value='Yet another line of narration that will fail upstream.';t.dispatchEvent(new Event('input'));q('#lc32-gen').click();return 1`); await sleep(500);
await R(`q('#lc32-gen').click();return 1`); await sleep(2000);
elevenFail=false;
msg=await R(`return q('[data-lc32-status]').textContent`);
console.log('    failure message:',msg);
ok(/did not answer/.test(msg)&&/Nothing was charged/.test(msg),'if the voice service fails, the user is told nothing was charged');
await p.evaluate(()=>Quota.refresh(true)); await sleep(700);
ok((await p.evaluate(()=>Quota.bonusNow()))===1,'and the purchased token is still there (1)');
console.log(`\n--- part 2 (cumulative): ${pass} passed, ${fail} failed`);
/* ---- exports ---- */
await R(`qa('[data-audio=voice]')[0].click();return 1`);
// make sure every slide has a current clip (re-make with the remaining purchased token is not needed: restore the old narration so cache hits)
await p.evaluate(()=>{const P=LC32.builder().project();P.slides[1].narration=''}); await sleep(100);
await R(`q('#lc32-gen').click();return 1`); await sleep(400);
const needConfirm=await R(`return /Confirm/.test(q('#lc32-gen').textContent)`);
if(needConfirm){await R(`q('#lc32-gen').click();return 1`);}
for(let i=0;i<40;i++){await sleep(250);if(/Voice-over ready/.test(await R(`return q('[data-lc32-status]').textContent`)))break}
const files=await p.evaluate(async()=>{const names=[];const orig=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){names.push(this.download)};const r=await LC32.builder().exportPng(false);HTMLAnchorElement.prototype.click=orig;return names});
console.log('    PNG files:',files.join(', '));
const nSlides=(await B()).slides.length;
ok(files.length===nSlides&&files[0]==='lanckrietchess-carousel-01.png','PNG export downloads one file per slide ('+files.length+')');
const wmDiff=await p.evaluate(()=>{const b=LC32.builder();const a=b.render(0,1080,1350,{}).getContext('2d').getImageData(0,0,1080,220).data,c=b.render(0,1080,1350,{noMark:true}).getContext('2d').getImageData(0,0,1080,220).data;let n=0;for(let i=0;i<a.length;i+=4)if(a[i]!==c[i]||a[i+1]!==c[i+1])n++;return n});
ok(wmDiff>3000,'every exported slide carries the tier watermark ('+wmDiff+' px)');
// video with voice: short slides for the test
const vid=await p.evaluate(async()=>{const r=await LC32.builder().exportVideo({fast:1.2,noDownload:true,scale:.4});if(!r)return null;const url=URL.createObjectURL(r.blob);const v=document.createElement('video');v.src=url;v.muted=false;v.volume=0.01;await new Promise(res=>{v.onloadedmetadata=res;setTimeout(res,3000)});return {size:r.blob.size,type:r.blob.type,secs:r.seconds,hasAudio:r.hasAudio,dur:v.duration,w:v.videoWidth,h:v.videoHeight}});
console.log('    video:',JSON.stringify(vid));
ok(vid&&vid.size>5000&&/webm/.test(vid.type)&&vid.hasAudio,'video export makes a WebM with the voice-over mixed in');
ok(vid&&vid.w>0&&Math.abs(vid.w/vid.h-0.8)<0.02,'video has the 4:5 shape ('+(vid&&vid.w)+'x'+(vid&&vid.h)+')');
// no audio without a clip
await R(`qa('[data-audio=none]')[0].click();return 1`);
const vid2=await p.evaluate(async()=>{const r=await LC32.builder().exportVideo({fast:.8,noDownload:true,scale:.3});return r&&{size:r.blob.size,hasAudio:r.hasAudio}});
ok(vid2&&vid2.size>2000&&vid2.hasAudio===false,'video without audio also works');
// music mode needs a file
await R(`qa('[data-audio=music]')[0].click();return 1`);
const noMusic=await p.evaluate(async()=>{const r=await LC32.builder().exportVideo({fast:1,noDownload:true,scale:.3});return r===null});
ok(noMusic&&/music file/i.test(await R(`return q('[data-lc32-status]').textContent`)),'music mode without a file explains what to do');
console.log('arena actions seen:',[...new Set(arenaCalls)].join(','));
const errs=d.errors.filter(e=>!/404|fetching the script|Failed to load/.test(e)); console.log('errors',errs.slice(0,5));
ok(errs.length===0,'no page errors');
console.log(`\nTOTAL ${pass} passed, ${fail} failed`);
await rig.close(); await sql.end();
