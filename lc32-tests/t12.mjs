import { start, sleep } from './rig.mjs';
let pass=0, fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)} };
const rig = await start('/home/claude/build/index.html');
async function setup(w,h){
  const d = await rig.device({}, { path: '/', w, h });
  await sleep(4500);
  await d.page.evaluate(()=>{ document.querySelectorAll('.sheet-wrap,.sheet-scrim,[role=dialog]').forEach(e=>e.remove()); document.querySelectorAll('.lc30-ask').forEach(e=>{let n=e;while(n.parentElement&&n.parentElement!==document.body)n=n.parentElement;n.remove()}); });
  await d.page.evaluate(()=>{
    const view=document.querySelector('#view');
    view.innerHTML='<header class="page-head"><h1>Think</h1><p>'+'Intro text for the page. '.repeat(8)+'</p></header><div id="metrics">'+'<p>metrics row</p>'.repeat(3)+'</div><p class="track-label">Levels</p><div class="chips" id="chips"><button class="chip">Topic A</button><button class="chip">Topic B</button></div><div class="lv39" style="height:120px">levels</div>'+trainerShell("t-board","t-panel")+'<section class="section" id="below" style="height:1800px"><h2>More below</h2></section>';
    const board=Board(qs("#t-board",view),{});
    window.__runner=StageRunner({drill:{id:"lc32-t1",title:"Find the weakness",tag:"MSPC drill",brief:"Brief text that explains the position before you start.",fen:"r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
      stages:[{k:"M",type:"tap",prompt:"Move: which square does the black knight attack?",answer:["e4"],explain:"The knight on c6 eyes e5, d4 and b4."},
              {k:"S",type:"tap",prompt:"Specifics: which pawn is undefended?",answer:["e4"],explain:"e4 is defended by nothing but the knight."},
              {k:"P",type:"tap",prompt:"Priorities: where is the capture?",answer:["e5"],explain:"Nxe5."},
              {k:"C",type:"tap",prompt:"Calculation: which square ends the line?",answer:["e5"],explain:"Done."}]},board:board,host:qs("#t-panel",view),section:"think",mspc:true});
    window.__runner.start();
  });
  await sleep(700);
  return d;
}
const rect = (d,sel)=>d.page.evaluate((s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,h:r.height,w:r.width,left:r.left}},sel);
console.log('PHONE 390x844');
let d = await setup(390,844); let p=d.page;
const st = await p.evaluate(()=>({pos:getComputedStyle(document.querySelector('.trainer>.board-col')).position,order:getComputedStyle(document.querySelector('#view>.trainer')).order,view:getComputedStyle(document.querySelector('#view')).display,topvar:getComputedStyle(document.documentElement).getPropertyValue('--lc32-top'),tb:getComputedStyle(document.querySelector('#topbar')).position}));
console.log('   ',JSON.stringify(st));
ok(st.order==='-1'&&st.view==='flex','trainer is moved to the top of the page on a phone');
ok(st.pos==='sticky','board column is sticky');
let bc=await rect(d,'.trainer>.board-col'), head=await rect(d,'.page-head'), pr=await rect(d,'.st-prompt');
console.log('    board-col',JSON.stringify(bc),'header',head&&head.top,'prompt',JSON.stringify(pr));
const tb=await rect(d,'#topbar');
ok(bc.top < (tb?tb.bottom:0)+40, 'the board starts right under the top bar (no scrolling needed): top='+Math.round(bc.top));
ok(head.top>=bc.bottom-1,'page header, metrics and chips now sit below the trainer');
ok(pr&&pr.top>=bc.bottom-2&&pr.top<bc.bottom+140&&pr.bottom<=844,'the MSPC prompt is directly under the board and fully on screen without scrolling (prompt bottom '+Math.round(pr.bottom)+' of 844)');
ok(bc.w<=390&&Math.abs(bc.h-bc.w)<260,'board fits the width');
await d.shot('t12-phone-0');
// scroll down: board must stay
await p.evaluate(()=>window.scrollTo(0,500)); await sleep(300);
const bc2=await rect(d,'.trainer>.board-col'), tb2=await rect(d,'#topbar');
console.log('    after scroll: board top',Math.round(bc2.top),'topbar bottom',tb2?Math.round(tb2.bottom):null);
ok(bc2.top<=(tb2&&tb2.bottom>0?tb2.bottom:0)+2&&bc2.bottom>100,'board stays pinned while the page scrolls');
await p.evaluate(()=>window.scrollTo(0,0)); await sleep(200);
// step M: tap e4
const sq = await p.evaluate(()=>{const e=document.querySelector('#t-board [data-square=e4]');const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}});
console.log('    tap point',JSON.stringify(sq), await p.evaluate((q)=>{const e=document.elementFromPoint(q.x,q.y);return e?e.tagName+'.'+e.className+'#'+e.id:'none'},sq), 'scrollY',await p.evaluate(()=>scrollY));
await p.mouse.click(sq.x,sq.y); await sleep(600);
console.log('    feedback:', await p.evaluate(()=>document.querySelector('[data-part=feedback]')?.innerText.slice(0,80)), '| actions:', await p.evaluate(()=>document.querySelector('[data-part=actions]')?.innerText.slice(0,60)));
ok(await p.evaluate(()=>!!document.querySelector('[data-act=advance]')),'step M solved, Next button appears');
await p.evaluate(()=>document.querySelector('[data-act=advance]').click()); await sleep(1300);
const at = await p.evaluate(()=>document.querySelector('#t-panel').getAttribute('data-lc32-at'));
ok(at==='1','panel knows it is on step 2 (data-lc32-at=1)');
const brief = await p.evaluate(()=>{const b=document.querySelector('.st-brief');const k=document.querySelector('.st-kicker');return {briefH:b?b.getBoundingClientRect().height:null,kickH:k?k.getBoundingClientRect().height:null,titleSize:getComputedStyle(document.querySelector('.st-title')).fontSize}});
console.log('    after step 1:',JSON.stringify(brief));
ok(brief.briefH===0&&brief.kickH===0&&parseFloat(brief.titleSize)<=16,'brief and kicker fold away, title shrinks: the sequence moves up');
const bc3=await rect(d,'.trainer>.board-col'), stg=await rect(d,'.st-stage');
console.log('    board bottom',Math.round(bc3.bottom),'stage top',Math.round(stg.top));
ok(stg.top>=bc3.bottom-4&&stg.top<bc3.bottom+120,'the new prompt sits right under the board');
await d.shot('t12-phone-1');
// finish all steps
for(let i=0;i<3;i++){
  const ans=await p.evaluate(()=>({k:document.querySelector('.mspc-steps .is-now b')?.textContent}));
  const target = ans.k==='P'||ans.k==='C'?'e5':'e4';
  const q=await p.evaluate((t)=>{const e=document.querySelector('#t-board [data-square='+t+']');const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}},target);
  await p.mouse.click(q.x,q.y); await sleep(450);
  const adv=await p.evaluate(()=>{const b=document.querySelector('[data-act=advance]');if(b){b.click();return true}return false}); await sleep(900);
  if(!adv)break;
}
ok(await p.evaluate(()=>document.querySelector('#t-panel').getAttribute('data-lc32-at'))==='3','walked M -> S -> P -> C (at=3)');
await d.ctx.close();
console.log('LANDSCAPE PHONE 844x390 (short screen)');
d = await setup(844,390); p=d.page;
ok(await p.evaluate(()=>getComputedStyle(document.querySelector('.trainer>.board-col')).position)==='static','very short screens do not pin a board that would hide the prompt');
await d.ctx.close();
console.log('DESKTOP 1280x900');
d = await setup(1280,900); p=d.page;
const ds = await p.evaluate(()=>({pos:getComputedStyle(document.querySelector('.trainer>.board-col')).position,order:getComputedStyle(document.querySelector('#view>.trainer')).order,cols:getComputedStyle(document.querySelector('.trainer')).gridTemplateColumns}));
console.log('   ',JSON.stringify(ds));
ok(ds.pos!=='sticky'&&ds.order==='0'&&ds.cols.split(' ').length===2,'desktop keeps the two-column layout, nothing moved');
const hd=await rect(d,'.page-head'), tr=await rect(d,'.trainer'); ok(hd.top<tr.top,'desktop: header stays above the trainer');
await d.shot('t12-desktop');
const errs=d.errors.filter(e=>!/404|fetching the script|Failed to load/.test(e)); console.log('errors',errs.slice(0,4)); ok(errs.length===0,'no page errors');
console.log(`\n${pass} passed, ${fail} failed`);
await rig.close();
