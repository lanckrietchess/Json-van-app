import { boot } from './mountStudio.mjs'; import { sleep } from './rig.mjs';
let pass=0, fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)} };
const GAME=`[Event "Test"]\n[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5 6. Nxf7 Kxf7 7. Qf3+ Ke6 8. Nc3 Nb4 9. O-O c6 10. d4 Kd7 1-0`;
const calls=[];
const external=async(req,full,u,CORS)=>{ if(/api\.chess\.com/.test(full)){ calls.push(full);
  const J=async o=>{await req.respond({status:200,headers:{...CORS,'content-type':'application/json'},body:JSON.stringify(o)});return true};
  if(/archives$/.test(u.pathname)) return /nobody/.test(u.pathname)?req.respond({status:404,headers:CORS,body:'{}'}):J({archives:['https://api.chess.com/pub/player/tester/games/2026/09','https://api.chess.com/pub/player/tester/games/2026/10']});
  const mk=(i,res,acc)=>({url:'https://www.chess.com/game/live/'+i,pgn:`[Event "Live"]\n[White "tester"]\n[Black "opp${i}"]\n[Result "0-1"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 Nxe4 8. O-O Bxc3 0-1`,rules:'chess',time_class:'rapid',end_time:1760000000+i,white:{username:'tester',rating:1200,result:res},black:{username:'opp'+i,rating:1250,result:res==='win'?'checkmated':'win'},accuracies:acc?{white:acc,black:80}:undefined});
  if(/2026\/10/.test(u.pathname)) return J({games:[mk(1,'checkmated',61.5),mk(2,'win',88),{url:'x',rules:'chess960',pgn:'1. e4'}]});
  return J({games:[mk(3,'resigned',55)]});
 } };
const { rig, d } = await boot({ w: 1440, h: 1000, external });
const p = d.page; await p.evaluate(()=>{window.__ccUser='tester'});
const ev = (code) => p.evaluate(`(()=>{const R=document.getElementById('harness').shadowRoot;const q=s=>R.querySelector(s);const qa=s=>[...R.querySelectorAll(s)];${code}})()`);
await sleep(700);
await ev(`q('.lc31-fmt[data-fmt=review]').click();return 1`); await sleep(500);
// --- PGN: paste (Ctrl+V path) while the focus is on the stage
await p.evaluate((g)=>{const dt=new DataTransfer();dt.setData('text/plain',g);document.getElementById('harness').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true,composed:true}))},GAME); await sleep(500);
ok(await p.evaluate(()=>LanckrietStudio.board.moves.length)===20, 'pasting a PGN anywhere in the Studio loads the game (20 plies)');
ok(await ev(`return !q('#lc31-game').hidden && /Alice vs Bob/.test(q('#lc31-game').textContent)`), 'game strip shows players');
// --- drop a file
await p.evaluate(()=>LanckrietStudio.board.reset());
await p.evaluate((g)=>{const dt=new DataTransfer();dt.items.add(new File([g],'game.pgn',{type:'text/plain'}));const r=document.getElementById('harness').shadowRoot.querySelector('#lcs');r.dispatchEvent(new DragEvent('dragenter',{dataTransfer:dt,bubbles:true,cancelable:true}));r.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}))},GAME); await sleep(700);
ok(await p.evaluate(()=>LanckrietStudio.board.moves.length)===20, 'dropping a .pgn file loads the game');
// --- typed in the modal, multi game chooser
await p.evaluate(()=>LanckrietStudio.board.reset());
await ev(`q('#lc31-pgn-btn').click();return 1`); await sleep(300);
await ev(`const t=q('#lc31-pgn-ta');t.value=${JSON.stringify(GAME+'\n\n'+GAME.replace('Alice','Carol'))};q('#lc31-pgn-load').click();return 1`); await sleep(400);
ok(await ev(`return qa('.lc31-modal .lc31-moment').length`)===2, 'two games pasted -> chooser lists both');
await ev(`qa('.lc31-modal .lc31-moment button')[1].click();return 1`); await sleep(400);
ok(await ev(`return /Carol vs Bob/.test(q('#lc31-game').textContent)`), 'choosing the second loads Carol vs Bob');
// garbage
await p.evaluate(()=>LanckrietStudio.board.reset());
await p.evaluate(()=>LanckrietStudio.lc31.importText('hello world',{}));
ok(await ev(`return qa('.toast').some(t=>/No readable game/.test(t.textContent))`), 'garbage text gives a clear error, no crash');
const BL=`[Event "T"]\n[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;
await p.evaluate((g)=>LanckrietStudio.lc31.importText(g,{}),BL); await sleep(300);
// --- real Stockfish analysis
const t0=Date.now();
await ev(`q('#lc31-an').click();return 1`);
for(let i=0;i<120;i++){ await sleep(500); if(await ev(`return !!q('.lc31-moment')`)) break; }
console.log('    analysis took',((Date.now()-t0)/1000).toFixed(1),'s');
const mo = await p.evaluate(()=>LanckrietStudio.lc31.state.moments);
console.log('    moments:',JSON.stringify((mo||[]).map(m=>m.ply+' '+m.san+m.mark+' -'+Math.round(m.drop)+'% best '+m.bestSan)));
ok(mo&&mo.length>0,'real Stockfish found critical moments');
ok(mo&&mo.some(m=>m.san==='Nf6'&&m.ply===6&&m.drop>=20&&m.mark==='??'),'flags 3...Nf6?? (allows mate) as a blunder');
ok(mo&&mo.every(m=>m.bestSan!==m.san),'never suggests the played move as better');
await d.shot('t8-moments');
// --- save to library
await ev(`qa('#lc31-game button').find(b=>/Save to Student Games/.test(b.textContent)).click();return 1`);
ok(await p.evaluate(()=>LanckrietStudio._t.Libs.mine('games').some(x=>/Alice vs Bob/.test(x.name))),'game saved to the Student Game Library');
// --- carousel
await ev(`qa('#lc31-game button').find(b=>/Carousel from game/.test(b.textContent)).click();return 1`); await sleep(600);
const cs = await p.evaluate(()=>LanckrietStudio.lc31.carousel().slides.map(s=>s.kind));
console.log('    slides:',cs.join(','));
ok(cs[0]==='cover'&&cs[cs.length-1]==='cta'&&cs.filter(k=>k==='position').length>=2,'auto-build makes cover, positions, CTA');
ok(await ev(`return qa('.lc31-thumb').length`)===cs.length,'thumbnail per slide');
await d.shot('t8-carousel');
// export PNGs through the real pipeline
const exp = await p.evaluate(async()=>{const L=LanckrietStudio.lc31;const files=[];const orig=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){files.push(this.download)};await L.exportCarousel(false);HTMLAnchorElement.prototype.click=orig;const cv=L.renderSlide(L.carousel().slides[1],1080,1350,false);const g=cv.getContext('2d');const px=g.getImageData(540,700,1,1).data;return {files,w:cv.width,h:cv.height,mid:[...px]}});
console.log('    export:',JSON.stringify(exp));
ok(exp.files.length===cs.length&&/lanckrietchess-carousel-01\.png/.test(exp.files[0]),'export downloads one PNG per slide');
ok(exp.w===1080&&exp.h===1350,'slides are 1080x1350');
// watermark present for Free tier: compare with noMark render
const wm = await p.evaluate(()=>{const L=LanckrietStudio.lc31,s=L.carousel().slides[0];const a=L.renderSlide(s,1080,1350,false).getContext('2d').getImageData(0,0,1080,200).data,b=L.renderSlide(s,1080,1350,true).getContext('2d').getImageData(0,0,1080,200).data;let diff=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1])diff++;return diff});
ok(wm>500,'Free-tier watermark is drawn on exported slides ('+wm+' px differ)');
await d.shot('t8-carousel2');
console.log('errors', d.errors.filter(e=>!/404|fetching the script|Failed to load/.test(e)).slice(0,6));
ok(d.errors.filter(e=>!/404|fetching the script|Failed to load/.test(e)).length===0,'no page errors');
console.log(`\n${pass} passed, ${fail} failed`);
await rig.close();
