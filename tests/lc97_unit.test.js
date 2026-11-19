// 9.62.0: the pure parts of LC97 (trial lifecycle + post-trial downsell): decide(), the day-by-day simulate(), the prices and the pop-up HTML.
// Run: node tests/lc97_unit.test.js (no npm install needed).
const fs=require('fs'),path=require('path');
global.Store={m:{},get(k,d){return k in this.m?this.m[k]:d},set(k,v){this.m[k]=v}};global.toast=()=>{};global.icon=()=>"";
global.window=global;global.location={hash:"",search:"",href:"https://x.test/app.html"};global.history={replaceState(){}};global.sessionStorage={getItem:()=>null,setItem(){},removeItem(){}};
global.document={querySelector:()=>null,querySelectorAll:()=>[]};
const src=fs.readFileSync(path.join(__dirname,'..','lc97.js'),'utf8');
const LC97=new Function(src.replace('/*@@module lc97*/','').replace('/*@@end lc97*/','')+';return LC97;')();
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+m)};
const D=LC97._t.decide;
const srv=(o)=>Object.assign({ok:true,signed_in:true,sub_status:'free',trial_eligible:true,trial:{used:false},discount:{used:false},post_trial:{offer_open:false,popup_due:false}},o||{});

// decide: tokens and phases
let r=D({srv:srv(),intro:{on:true,left:4}});ok(r.phase==='intro'&&r.perDay===3&&r.trialEligible===true&&r.popup==='none','intro week: 3 a day, trial open, no pop-up');
r=D({srv:srv(),intro:{on:false}});ok(r.phase==='free'&&r.perDay===1,'day 8: Free, 1 a day');
r=D({srv:srv({sub_status:'trialing',trial_eligible:false,trial:{used:true}}),intro:{on:false}});ok(r.phase==='trial'&&r.perDay===10&&r.trialEligible===false&&r.popup==='none'&&r.why==='paid','trial: Pro, 10 a day, no second trial, no pop-up');
r=D({srv:srv({sub_status:'trial_cancelled',trial_eligible:false,trial:{used:true}})});ok(r.phase==='trial','cancelled trial keeps Pro until the end');
r=D({srv:srv({sub_status:'trial_ended',trial_eligible:false,trial:{used:true},post_trial:{offer_open:true,popup_due:true}})});ok(r.phase==='free'&&r.perDay===1&&r.popup==='downsell','trial over: Free, the post-trial pop-up is due');
r=D({srv:srv({sub_status:'trial_ended',trial_eligible:false,trial:{used:true},post_trial:{offer_open:true,popup_due:false,shown_at:'x'}})});ok(r.popup==='none'&&r.why==='already_shown','shown once: never again by itself (no loop)');
r=D({srv:srv({sub_status:'trial_ended',trial_eligible:false,trial:{used:true},post_trial:{offer_open:true,popup_due:false,shown_at:'x'}}),reopen:true});ok(r.popup==='downsell','back from a cancelled checkout: the pop-up comes back once while the offer is open');
r=D({srv:srv({sub_status:'trial_ended',trial_eligible:false,trial:{used:true},post_trial:{offer_open:false,popup_due:false,shown_at:'x',dismissed_at:'y'}}),reopen:true});ok(r.popup==='none'&&r.why==='dismissed','dismissed (Free / closed): not even after a checkout return');
r=D({srv:srv({sub_status:'downsell_month',trial_eligible:false,trial:{used:true},discount:{used:true}})});ok(r.phase==='pro'&&r.popup==='none','the one-time month: Pro, no pop-up');
r=D({srv:srv({sub_status:'trial_ended',trial_eligible:false,trial:{used:true},discount:{used:true},post_trial:{offer_open:false,popup_due:false,shown_at:'x',dismissed_at:'y'}})});ok(r.popup==='none'&&r.why==='discount_used','after the month: the offer stays locked');
r=D({srv:srv({sub_status:'trial_ended',trial_eligible:false,trial:{used:true},post_trial:{offer_open:true,popup_due:true}}),owner:true});ok(r.popup==='none'&&r.why==='owner','the owner never gets it by itself');
r=D({srv:srv({sub_status:'trial_ended',trial_eligible:false,trial:{used:true},post_trial:{offer_open:true,popup_due:true}}),paid:true});ok(r.popup==='none','a paying member (app tier) never gets it');
r=D({srv:{ok:true,signed_in:false},intro:{on:true}});ok(r.trialEligible===null&&r.popup==='none'&&r.why==='signed_out','signed out: trial unknown (the server decides at checkout), no pop-up');
r=D({srv:{ok:false,missing:true}});ok(r.popup==='none'&&r.why==='no_state','SQL not run: nothing opens (fails closed)');
r=D({srv:srv({sub_status:'active',trial_eligible:false}),vip:true});ok(r.phase==='vip'&&r.perDay===10,'VIP member');

// simulate: the whole road
const S=LC97._t.simulate;
const at=(rows,d)=>rows.find(x=>x.day===d);
let rows=S({trialDay:8,trialLen:7,cancel:true,choice:'discount',days:50});
ok(at(rows,1).perDay===3&&at(rows,7).perDay===3,'sim: days 1-7 have 3 tokens');
ok(at(rows,8).events.some(e=>/Day-7 pop-up/.test(e))&&at(rows,8).events.some(e=>/starts the 7-day trial/.test(e)),'sim: day 8 shows the Day-7 pop-up and the trial starts');
ok(at(rows,8).perDay===10&&at(rows,14).perDay===10,'sim: the trial days have 10 tokens');
ok(at(rows,15).popup==='downsell'&&at(rows,15).events.some(e=>/post-trial pop-up opens/.test(e)),'sim: day 15 (trial over) opens the post-trial pop-up');
ok(rows.filter(x=>x.popup==='downsell').length===1,'sim: the post-trial pop-up opens exactly once');
ok(at(rows,16).status==='downsell_month'&&at(rows,16).perDay===10,'sim: the one-time month gives Pro');
ok(at(rows,45).events.some(e=>/month ends/.test(e))&&at(rows,46).perDay===1&&at(rows,46).events.length===0&&rows.slice(45).every(x=>x.popup==='none'),'sim: after the month: Free, the offer never returns');
ok(at(rows,9).trialEligible===false,'sim: no second trial');
rows=S({trialDay:8,cancel:true,choice:'free',days:30});ok(rows.filter(x=>x.popup==='downsell').length===1&&at(rows,16).perDay===1&&!at(rows,16).offer,'sim: Free picked: 1 token a day, offer gone');
rows=S({trialDay:8,cancel:true,choice:'closed',days:30});ok(rows.filter(x=>x.popup==='downsell').length===1&&!at(rows,20).offer,'sim: closed = dismissed');
rows=S({trialDay:8,cancel:true,choice:'yearly',days:30});ok(at(rows,16).status==='active'&&at(rows,16).perDay===10,'sim: yearly picked: Pro');
rows=S({trialDay:8,cancel:false,convert:true,days:30});ok(rows.every(x=>x.popup==='none')&&at(rows,20).status==='active','sim: a converted trial never sees the downsell');
rows=S({trialDay:0,days:30});ok(rows.every(x=>x.popup==='none')&&at(rows,20).perDay===1&&at(rows,20).trialEligible===true,'sim: no trial: Free with the trial still open');
rows=S({trialDay:3,cancel:true,choice:'discount',days:40});ok(!at(rows,8).events.some(e=>/Day-7/.test(e))&&at(rows,10).popup==='downsell','sim: trial from Upgrades on day 3: no Day-7 pop-up, post-trial pop-up on day 10');

// prices and the pop-up
const N=LC97._t.numbers;
let n=N({ok:true,tranche:1,yearly:[19950,29925,35910,39900],base:39900,monthly:3900,downsell:{cents:2500,anchor_cents:3900,days:30}});
ok(n.month==='€16.63'&&n.yearlyTxt==='€199.50'&&n.rate==='Founding Member','yearly: the live Founding rate as a month price (199.50 / 12 = €16.63)');
ok(n.dl==='€25'&&n.dlAnchor==='€39'&&n.dlDays===30,'one-time month: €25 with €39 struck through, 30 days');
n=N({ok:true,tranche:2,yearly:[19950,29925,35910,39900],base:39900,monthly:3900});ok(n.month==='€24.94'&&n.rate==='Early Adopter','after the Founding 100: the Early Adopter rate is shown (never a sold-out price)');
n=N(null);ok(n.month==='€16.63'&&n.dl==='€25','no pricing answer: the built-in numbers (same as the server defaults)');
const h=LC97._t.dsHTML(N({ok:true,tranche:1,yearly:[19950,29925,35910,39900],base:39900,monthly:3900}),null,false);
const order=['Keep Pro and unlock all courses for 1 year','/month billed yearly','Get 1 month of full Pro for an exclusive discount','<s>€39/month</s>','€25/month','data-lc97="free"'].map(t=>h.indexOf(t));
ok(order.every((x,i)=>x>0&&(i===0||x>order[i-1])),'pop-up: yearly first (main), then the discount with the struck price, then Free');
ok(/lc97-main/.test(h)&&/lc97-disc/.test(h)&&/class="lc97-free"/.test(h),'pop-up: blue main option, discount card, small Free link');
ok(!/lifetime|for life|forever/i.test(h),'pop-up: no "lifetime / for life / forever"');
const st=LC97._t.statusHTML;
ok(/2 days left/.test(st({ok:true,signed_in:true,sub_status:'trialing',trial:{days_left:2,ends_at:'2026-11-21T10:00:00Z'}})),'Upgrades status: trial days left');
ok(/trial is cancelled/.test(st({ok:true,signed_in:true,sub_status:'trial_cancelled',trial:{ends_at:'2026-11-21T10:00:00Z'}})),'Upgrades status: cancelled trial');
ok(st({ok:true,signed_in:true,sub_status:'free'})==='','Upgrades status: nothing for a plain free account');

console.log('\n'+pass+' passed, '+fail+' failed');process.exit(fail?1:0);
