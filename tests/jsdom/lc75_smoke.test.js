// 9.38.0: Funnel Command Center rendering (stubbed lc75_funnel), the school course, the e-book pager, the admin shortcuts.
module.exports=async(w,errs)=>{
  const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);const ev=s=>w.eval(s);
  ok('LC75 defined, no init errors',ev('typeof LC75!=="undefined"')&&!errs.some(e=>/lc75|LC75/.test(e)));
  ok('#command and #analytics use the Command Center',ev('MOUNT.command===MOUNT.analytics'));
  // stub a signed-in owner and the funnel RPC
  const row={views:30000,clicks:240,visits:200,installs:60,signups:40,cards:6,paying:2,card_paid:2,sales:3,revenue:23850,buyers_all:3,repeat:1,upsell:1,up_tok_course:1,up_pro_vip:0,up_rescue:0,renewals:0,lapsed:0,active:2,referred:2,referrers:1,members_all:40,buyer_buyer:0,disc_invitee:1,disc_referrer:0,ltv_rev:23850,ltv_buyers:3};
  w.__row=row;
  ev(`LC26.sync.session=()=>({email:"lanckrietchess@gmail.com"});LC26.sync.token=async()=>"tok";
    LC26.sync.http=async(path,o)=>{if(/lc75_funnel/.test(path))return{status:200,data:{ok:true,admin:true,range:{days:30},channels:["tiktok","instagram"],rows:{all:window.__row,tiktok:Object.assign({},window.__row,{views:20000}),instagram:window.__row},
      kpis:{l1_views_day:{target:6000,kind:"abs",label:"Views per day"},l2_ctr:{target:1,kind:"pct",label:"CTR"},l4_visit_signup:{target:20,kind:"pct",label:"x"},l6_app_conv:{target:1,kind:"pct",label:"x"},l7_churn:{target:10,kind:"max",label:"x"}}}};
      return{status:200,data:{ok:true,rows:[],links:[],funnel:{},paid:{},retention:{},lifetime:{},kpis:{}}}};`);
  const d=w.document.createElement('div');w.document.body.appendChild(d);ev('MOUNT.command')(d);await new Promise(x=>setTimeout(x,600));
  ok('9 levels with All channels first',d.querySelectorAll('.lc75-t tbody tr').length===9&&/All channels/.test(d.querySelector('.lc75-t thead').textContent));
  ok('one column per channel',/tiktok/.test(d.querySelector('.lc75-t thead').textContent)&&/instagram/.test(d.querySelector('.lc75-t thead').textContent));
  ok('views per day under target is red (1000/day vs 6000)',!!d.querySelector('.lc75-c.is-red'));
  ok('bottleneck box',!!d.querySelector('.lc75-bn'));
  ok('Lifetime filter + Landing Page Editor button',/Lifetime/.test(d.textContent)&&/Open Landing Page Editor \/ Preview/.test(d.textContent));
  ok('LTV shown',/LTV/.test(d.textContent)&&/€79\.50/.test(d.textContent));
  // school course
  const h=ev('LC75.schoolHTML("c1","Blueprint course",[{title:"Intro",url:"https://youtu.be/x",folder:"Module 1"},{title:"Read",text:"Hi",folder:"Module 1"},{title:"Caro",pgn:"1. e4 c6",folder:"Module 2"}],false,"100 tokens")');
  ok('locked course: modules, lock icons, unlock button opens the price list',/Module 1/.test(h)&&/Module 2/.test(h)&&/data-lc72="unlock"/.test(h)&&(h.match(/is-locked/g)||[]).length===3);
  const h2=ev('LC75.schoolHTML("c1","Blueprint course",[{title:"Intro",url:"https://youtu.be/x",folder:"Module 1"}],true,"")');
  ok('open course: progress + Start',/progressbar/.test(h2)&&/Start the course/.test(h2));
  ok("e-book text pages (1500 characters a page)",ev(`LC75.paginate("a\\n"+"b".repeat(1600)+"\\nc").length`)===3);
  ok('KPI colours: churn above max is orange',ev('LC75.status(12,{target:10,kind:"max"})')==='is-orange'&&ev('LC75.status(1.2,{target:1,kind:"pct"})')==='is-green');
};
