import { boot } from './mountStudio.mjs'; import { sleep } from './rig.mjs';
let pass=0, fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)} };
const calls=[];
const external=async(req,full,u,CORS)=>{ if(/api\.chess\.com/.test(full)){ calls.push(u.pathname);
  const J=async o=>{await req.respond({status:200,headers:{...CORS,'content-type':'application/json'},body:JSON.stringify(o)});return true};
  const NF=async()=>{await req.respond({status:404,headers:CORS,body:'{}'});return true};
  if(/nobody\/games\/archives/.test(u.pathname)) return NF();
  if(/archives$/.test(u.pathname)){const who=u.pathname.split('/')[3];return J({archives:['https://api.chess.com/pub/player/'+who+'/games/2026/09','https://api.chess.com/pub/player/'+who+'/games/2026/10']})}
  const who=u.pathname.split('/')[3];
  const mk=(i,res,acc)=>({url:'https://www.chess.com/game/live/'+who+i,pgn:`[Event "Live"]\n[White "${who}"]\n[Black "opp${i}"]\n[Result "0-1"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 Nxe4 8. O-O Bxc3 0-1`,rules:'chess',time_class:'rapid',end_time:1760000000+i,white:{username:who,rating:1200,result:res},black:{username:'opp'+i,rating:1250,result:res==='win'?'checkmated':'win'},accuracies:acc?{white:acc,black:80}:undefined});
  if(/2026\/10/.test(u.pathname)) return J({games:[mk(1,'checkmated',61.5),mk(2,'win',88),{url:'x',rules:'chess960',pgn:'1. e4'}]});
  return J({games:[mk(3,'resigned',55)]});
 } return undefined; };
const { rig, d } = await boot({ w: 1440, h: 1000, external });
const p = d.page;
const ev = (code) => p.evaluate(`(()=>{const R=document.getElementById('harness').shadowRoot;const q=s=>R.querySelector(s);const qa=s=>[...R.querySelectorAll(s)];${code}})()`);
await sleep(600);
await ev(`q('.lc31-fmt[data-fmt=aishort]').click();return 1`); await sleep(400);
// --- Games library tab
await ev(`qa("button").find(b=>/Student Game/.test(b.textContent)).click();return 1`); await sleep(600);
ok(await ev(`return !!q('#lc31-gbar')`),'Student Game Library shows the sync bar');
ok(await ev(`return /No Chess.com account linked/.test(q('#lc31-gstatus').textContent)`),'status says no account is linked yet');
// add a student
await ev(`q('#lc31-sadd-btn').click();return 1`);
await ev(`q('#lc31-sname').value='Emma';q('#lc31-suser').value='https://www.chess.com/member/Emma_Chess';q('#lc31-sadd').click();return 1`); await sleep(1500);
console.log('    api calls:',calls.join(' | '));
ok(calls.some(c=>/emma_chess\/games\/archives/.test(c)),'username is cleaned from a pasted profile link and lower-cased for the API');
const g = await p.evaluate(()=>LanckrietStudio._t.Libs.mine('games').filter(x=>x.src==='chesscom'));
console.log('    synced:',g.map(x=>x.name+' | '+x.note).join('\n            '));
ok(g.length===3,'3 standard games added (the chess960 game is skipped)');
ok(g.some(x=>x.res==='Loss'&&x.acc===61.5)&&g.some(x=>x.res==='Win'),'result and accuracy are read from the API fields');
ok(g.every(x=>x.label==='Emma'),'games are tagged with the student');
ok(await ev(`return qa('.pop .lib-item').length`)===3,'games appear in the library list');
// dedupe
const n0=g.length; await ev(`q('#lc31-sync').click();return 1`); await sleep(1500);
ok((await p.evaluate(()=>LanckrietStudio._t.Libs.mine('games').filter(x=>x.src==='chesscom').length))===n0,'syncing again does not duplicate games');
// filter
await ev(`const s=q('#lc31-gres');s.value='Loss';s.dispatchEvent(new Event('change'));return 1`); await sleep(300);
const shown = await ev(`return qa('.pop .lib-item .t').map(e=>e.textContent)`);
console.log('    filtered to losses:',shown.length, JSON.stringify(shown.slice(0,6)), await ev(`return [q('#lc31-gres').value, qa('.pop .lib-item').length]`));
ok(shown.length===2&&shown.every(t=>/Loss/.test(t)),'result filter shows only losses');
await ev(`const s=q('#lc31-gres');s.value='';s.dispatchEvent(new Event('change'));return 1`);
// unknown player
await ev(`q('#lc31-sadd-btn').click();q('#lc31-sname').value='Ghost';q('#lc31-suser').value='nobody';q('#lc31-sadd').click();return 1`); await sleep(1200);
ok(await ev(`return qa('.toast').some(t=>/Player not found/.test(t.textContent))`),'unknown username gives a clear message');
// load on board + library actions present
ok(await ev(`return qa('.pop .lib-item button').some(b=>b.textContent==='Find critical moments')&&qa('.pop .lib-item button').some(b=>b.textContent==='Make carousel')`),'each game offers Load, Find critical moments, Make carousel');
await ev(`qa('.pop .lib-item button').find(b=>b.textContent==='Load on board').click();return 1`); await sleep(500);
ok(await p.evaluate(()=>LanckrietStudio.board.moves.length)===16,'Load on board opens the synced game');
await d.shot('t9-games');
// --- automatic sync on mount for the linked account
await p.evaluate(()=>{LanckrietStudio.unmount();});
await p.evaluate(()=>{window.__ccUser='autouser';});
const before=calls.length;
await p.evaluate(()=>{const host=document.getElementById('harness');LanckrietStudio.mount(host,{isLocked:()=>false,isAdmin:()=>true,tier:()=>'free',isCreator:()=>true,upgrade(){},stockfish:()=>Engine,chessUser:()=>window.__ccUser},{embedded:true})});
await sleep(4500);
ok(calls.slice(before).some(c=>/autouser\/games\/archives/.test(c)),'opening the Studio auto-syncs the linked Chess.com account');
ok(await p.evaluate(()=>LanckrietStudio.lc31.students().some(s=>s.label==='Me'&&s.user==='autouser')),'linked account becomes the "Me" student');
// --- AI render hand-off: script + game prefilled
await p.evaluate(()=>{LanckrietStudio._t.Script.set('## Hook\nStop playing this move.\n\n## Story\nHere is what happened.');LanckrietStudio.lc31.state.aiKind='long'});
const seed = await p.evaluate(()=>{const S={kind:'short',hook:'',script:'',game:'',scriptText:''};LanckrietStudio.lc31.seedRender(S);return S});
console.log('    seed:',JSON.stringify(seed).slice(0,200));
ok(seed.kind==='long'&&seed.script==='__own'&&/Stop playing this move/.test(seed.scriptText)&&!/## Hook/.test(seed.scriptText),'AI render is seeded with the narration (headings stripped) and long kind');
console.log('errors', d.errors.filter(e=>!/404|fetching the script|Failed to load/.test(e)).slice(0,6));
ok(d.errors.filter(e=>!/404|fetching the script|Failed to load/.test(e)).length===0,'no page errors');
console.log(`\n${pass} passed, ${fail} failed`);
await rig.close();
