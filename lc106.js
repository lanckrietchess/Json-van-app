/*@@module lc106*/
const LC106=(()=>{
  "use strict";
  /* LC106 (build 9.74.0): the 2-Week Rating Sprint, the onboarding storyline.
     A player who linked a Chess.com / Lichess account starts a Sprint of 14 days (sql/20261125100000_lc106_sprint_funnel_referrals.sql).
       Start rating: the verified rating now (elo-verify on the server) or, when higher, the player's own highest rating of the last 7 days
       in the games the app reviewed (a higher start only makes it harder; the server ignores a lower one and anything 400+ higher).
       Rating goal by start rating (owner-editable): under 1000 +100, under 1400 +75, under 1800 +50, higher +30. Reached = the
       verified rating (lc59_links) shows it: the member can tell Kyenzo, who puts the result on the Wall of Love.
       Process goal: 1,500 XP in the 14 days (V6's XP, at most 2,500 counted a day on the server). Reached = the Sprint price:
       20 % off the first Pro or VIP payment (monthly or yearly), until 14 days after the Sprint, once (the stripe route "sprint" and the
       trial both read it from the database; the browser never sends a percentage).
     Home (and the quest board, where Home leads while the quest levels run): one card (the Sprint, its two bars, from day 6 "What changed so far": the best TRUE numbers from the reviewed games, never a
     made-up one). Page #sprint: the whole Sprint, the Sprint price checkout (with the same consent step as LC99) and, for the owner,
     every Sprint and the settings. LC88 gets one step ("Start your Sprint") after the first review; no pop-up of its own.
     LC90's Day-7 pop-up shows "What changed so far" and frames the trial as the rest of the Sprint (popupHTML).
     9.75.0 (sql/20261126100000_lc107_sprint_month_week1.sql): the reward is a 13th month on the yearly plan (Pro or VIP: 13 months
     for the price of 12), unlocked by EITHER goal (XP or rating), open until 48 hours after the later of the Sprint's end and the
     trial's end (a live countdown in the LC88 step, on the card and in LC97's post-trial pop-up); the owner can switch back to a
     percentage. Week 1: 500 XP in the first 7 days of the Sprint = 14 bonus tokens (the 3 a day kept for one more week), claimed at
     once. Somebody who missed both goals never sees a "you missed it" message. */
  const VERSION="9.75.0",W=window,D=document;
  const Q=(s,r)=>(r||D).querySelector(s),QA=(s,r)=>[].slice.call((r||D).querySelectorAll(s));
  const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ic=n=>{try{return typeof icon==="function"?icon(n)+" ":""}catch(e){return""}};
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const DAY=864e5,KEY="lc106",KX="lc106-x",HOME={home:1,quests:1};
  const ls={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  const owner=()=>{try{return !!(LC49.owner()||Admin.active)}catch(e){return false}};
  const signed=()=>{try{const s=LC26.sync.session();return !!(s&&s.access_token)}catch(e){return false}};
  const authed=(n,a)=>{try{return LC30.authed(n,a||{})}catch(e){return Promise.resolve({ok:false,error:"server"})}};
  const xpNow=()=>{try{return Math.max(0,Math.round(+V6.state().total||0))}catch(e){return 0}};
  const nf=n=>Number(n||0).toLocaleString("en-GB");
  const month=s=>!s||(s.reward_kind||"month")==="month";
  const rewardTxt=s=>month(s)?"13 months for the price of 12 on the yearly Pro or VIP plan":(+(s&&s.pct)||20)+" % off your first Pro or VIP payment";
  /* a live countdown: any element with data-lc106-cd="<ms>" shows the time left (ticks every second) */
  function left(ms){const d=Math.max(0,ms-Date.now()),h=Math.floor(d/36e5),m=Math.floor(d%36e5/6e4),x=Math.floor(d%6e4/1e3);return(h?h+"h ":"")+String(m).padStart(2,"0")+"m "+String(x).padStart(2,"0")+"s"}
  const cd=until=>'<b class="lc106-cd" data-lc106-cd="'+Date.parse(until)+'">'+left(Date.parse(until))+"</b>";
  function tickCd(){QA("[data-lc106-cd]").forEach(el=>{const t=+el.getAttribute("data-lc106-cd");if(t)el.textContent=left(t)})}
  const active=s=>!!(s&&s.joined&&s.reward_active&&!s.reward_used&&s.reward_until&&Date.parse(s.reward_until)>Date.now());

  /* ---------- pure (tested) ---------- */
  const TARGETS=[[1000,100],[1400,75],[1800,50],[100000,30]];
  function targetFor(r,t){t=Array.isArray(t)&&t.length?t:TARGETS;for(const x of t)if(+r<+x[0])return+x[1];return 30}
  /* the player's highest rating in the games of the last 7 days (null when there is none) */
  function weekPeak(rows,now){
    now=now||Date.now();let best=null;
    (rows||[]).forEach(x=>{const r=+x.rating;if(x&&x.t>=now-7*DAY&&x.t<=now+DAY&&Number.isFinite(r)&&r>=100&&r<=3500&&(best==null||r>best))best=r});
    return best;
  }
  const avg=(l,f)=>{const v=l.map(x=>+x[f]).filter(Number.isFinite);return v.length?v.reduce((s,x)=>s+x,0)/v.length:null};
  const per=(l,f)=>l.length?l.reduce((s,x)=>s+(+x[f]||0),0)/l.length:null;
  const r1=v=>Math.round(v*10)/10;
  /* What changed since the Sprint started: only numbers that are true and better, the strongest first; usage when nothing improved yet */
  function changes(rows,from,now,x){
    x=x||{};now=now||Date.now();
    const list=(rows||[]).filter(r=>r&&Number.isFinite(+r.t)).sort((a,b)=>a.t-b.t);
    const before=list.filter(r=>r.t<from).slice(-20),during=list.filter(r=>r.t>=from&&r.t<=now);
    const out=[];
    if(+x.gain>0)out.push({k:"rating",s:100+ +x.gain,text:"+"+x.gain+" rating since your Sprint started ("+x.start+" → "+x.now+")."});
    if(before.length>=3&&during.length>=3){
      const b0=per(before,"bl"),b1=per(during,"bl");
      if(b0>0&&b1<b0-.05){const p=Math.round((1-b1/b0)*100);if(p>=5)out.push({k:"blunders",s:40+p,text:"Blunders per game: "+r1(b0)+" → "+r1(b1)+" ("+p+" % fewer)."})}
      const a0=avg(before,"acc"),a1=avg(during,"acc");
      if(a0!=null&&a1!=null&&a1>=a0+.5)out.push({k:"accuracy",s:30+Math.round((a1-a0)*4),text:"Average accuracy: "+r1(a0)+" % → "+r1(a1)+" %."});
      const m0=per(before,"mi"),m1=per(during,"mi");
      if(m0>0&&m1<m0-.1){const p=Math.round((1-m1/m0)*100);if(p>=10)out.push({k:"mistakes",s:25+p/2,text:"Mistakes per game: "+r1(m0)+" → "+r1(m1)+"."})}
    }
    const good=during.reduce((s,r)=>s+(+r.br||0)+(+r.gr||0),0);
    if(good>0)out.push({k:"good",s:20+good,text:good+(good===1?" great or brilliant move":" great or brilliant moves")+" found in your own games."});
    if(during.length)out.push({k:"games",s:10+during.length,text:during.length+(during.length===1?" game":" games")+" reviewed with the coach."});
    if(+x.xp>0)out.push({k:"xp",s:5+Math.min(+x.xp/200,20),text:nf(x.xp)+" XP of training"+(x.xp_goal?" ("+Math.min(100,Math.round(x.xp/x.xp_goal*100))+" % of your Sprint goal).":".")});
    const days=new Set(during.map(r=>new Date(r.t).toISOString().slice(0,10))).size;
    if(days>=2)out.push({k:"days",s:4+days,text:"You trained on "+days+" different days."});
    return out.sort((a,b)=>b.s-a.s).slice(0,3);
  }
  const dayOf=(s,now)=>s&&s.started_at?Math.floor(((now||Date.now())-Date.parse(s.started_at))/DAY)+1:0;
  const bar=(v,max,cls)=>'<span class="lc106-bar'+(cls?" "+cls:"")+'"><i style="width:'+Math.max(0,Math.min(100,max>0?v/max*100:0)).toFixed(1)+'%"></i></span>';

  /* ---------- state ---------- */
  let S=ls.get(KEY,null),rows=null,busy=false,lastSync=0,cur="",ACH=[];
  async function loadRows(){if(rows)return rows;try{rows=await LC19.ui._t.load()||[]}catch(e){rows=[]}return rows}
  function remember(v){if(v&&v.ok){S=Object.assign({},v,{at:Date.now()});ls.set(KEY,S)}return S}
  async function refreshAch(){
    if(!S||!S.joined)return(ACH=[]);
    const r=await loadRows();
    ACH=changes(r,Date.parse(S.started_at),Date.now(),{gain:S.gain,start:S.start,now:S.now,xp:S.xp,xp_goal:S.xp_goal});
    return ACH;
  }
  async function sync(force){
    if(busy||!signed())return S;
    if(!force&&Date.now()-lastSync<5*60e3)return S;
    busy=true;lastSync=Date.now();
    try{
      let v=await authed("lc106_state");
      if(v&&v.ok&&v.joined&&!v.over)v=await authed("lc106_progress",{p_xp:xpNow()});
      if(v&&v.ok)remember(v);else if(v&&v.reason==="off"){S={ok:false,reason:"off"};ls.set(KEY,S)}
      if(v&&v.week1_new){try{LC36.tokens.claim(true)}catch(e){}say("Week 1 done: you keep 3 tokens a day for one more week. "+(+v.week1_tokens||14)+" bonus tokens are in your wallet.","good")}
      await refreshAch();
    }catch(e){console.error("lc106",e)}
    busy=false;paintAll();return S;
  }
  async function start(){
    if(!signed()){say("Sign in first: your Sprint is kept on your account.");try{LC40._t.openAuth()}catch(e){location.hash="#account"}return}
    say("Reading your rating…");
    try{if(typeof LC59!=="undefined"&&LC59.verify)await LC59.verify(true)}catch(e){}
    const peak=weekPeak(await loadRows());
    const v=await authed("lc106_join",{p_xp:xpNow(),p_peak:peak});
    if(v&&v.ok){remember(v);await refreshAch();say("Your Sprint started. 14 days: +"+v.target+" rating and "+nf(v.xp_goal)+" XP.","good");try{Telemetry.log({e:"lc106",x:"join"})}catch(e){}}
    else say(v&&v.reason==="link"?"Link your Chess.com or Lichess account first (Account > your chess accounts), then start again.":v&&v.reason==="account_used"?"That chess account already ran a Sprint.":"The Sprint could not start ("+((v&&(v.reason||v.error))||"no answer")+").","bad");
    paintAll();
  }

  /* ---------- the card (Home) and the page (#sprint) ---------- */
  function inviteHTML(s){
    const t=s&&s.target,rt=s&&s.rating,xg=nf(s&&s.xp_goal||1500),pct=s&&s.pct||20;
    return'<p class="lc106-k">'+ic("flag-checkered")+"2-Week Rating Sprint</p>"
      +'<p class="lc106-t">'+(t?"From "+rt+" to "+(rt+t)+" in 14 days.":"Two weeks, one clear target for your rating.")+"</p>"
      +'<p class="small muted">Two goals: your rating '+(t?"+"+t:"(a target that fits your level)")+', or '+xg+' XP of training. Reach either one and you get '+E(rewardTxt(s))+'. Reach the rating goal and your result can go on the Wall of Love. Bonus: '+nf(s&&s.week1_xp||500)+' XP in your first week keeps your 3 tokens a day for one more week.</p>'
      +'<div class="btn-row"><button type="button" class="btn btn-primary btn-sm" data-lc106="start">'+ic("play")+"Start my Sprint</button>"+(cur!=="sprint"?'<a class="btn btn-quiet btn-sm" href="#sprint">How it works</a>':"")+"</div>";
  }
  function achHTML(list,title){
    if(!list||!list.length)return"";
    return'<div class="lc106-ach"><p class="lc106-k">'+ic("chart-line")+E(title||"What changed so far")+"</p><ul>"+list.map(a=>"<li>"+E(a.text)+"</li>").join("")+"</ul></div>";
  }
  function progressHTML(s,full){
    const d=dayOf(s),left=s.days_left,over=s.over,gain=+s.gain||0,need=+s.target||0;
    const head=over?"Your Sprint is over.":"Day "+Math.min(d,14)+" of 14 · "+left+(left===1?" day":" days")+" left";
    let h='<p class="lc106-k">'+ic("flag-checkered")+"2-Week Rating Sprint · "+E(head)+"</p>"
      +'<div class="lc106-row"><span><b>Rating</b> '+E(s.start)+" → "+E(s.now)+" ("+(gain>=0?"+":"")+gain+" of +"+need+")</span>"+bar(Math.max(0,gain),need,s.rating_done?"is-done":"")+"</div>"
      +'<div class="lc106-row"><span><b>Training</b> '+nf(s.xp)+" / "+nf(s.xp_goal)+" XP</span>"+bar(s.xp,s.xp_goal,s.xp_done?"is-done":"")+"</div>";
    const w1end=Date.parse(s.week1_until||0);
    if(!s.week1_done&&w1end>Date.now())h+='<div class="lc106-row"><span><b>Week 1</b> '+nf(Math.min(s.xp,s.week1_xp||500))+" / "+nf(s.week1_xp||500)+" XP · keep your 3 tokens a day for one more week</span>"+bar(s.xp,s.week1_xp||500)+"</div>";
    else if(s.week1_done&&!over)h+='<p class="small muted">'+ic("check")+"Week 1 done: your 3 tokens a day stay for one more week ("+nf(s.week1_tokens||14)+" bonus tokens).</p>";
    if(active(s)){
      const plans=month(s)?[["yearly",2,"Pro, 13 months"],["yearly",3,"VIP, 13 months"]]:[["monthly",2,"Pro, monthly"],["yearly",2,"Pro, yearly"],["monthly",3,"VIP, monthly"],["yearly",3,"VIP, yearly"]];
      h+='<p class="lc106-win">'+ic("gift")+"Goal reached. Your Sprint bonus: <b>"+E(rewardTxt(s))+"</b>. It ends in "+cd(s.reward_until)+".</p>"
        +(full?'<div class="btn-row">'+plans.map((b,i)=>'<button type="button" class="btn btn-sm '+(i===0?"btn-primary":"btn-ghost")+'" data-lc106-buy="'+b[0]+'" data-lc106-tier="'+b[1]+'">'+E(b[2])+"</button>").join("")+"</div>":'<div class="btn-row"><a class="btn btn-primary btn-sm" href="#sprint">Claim my bonus</a></div>');
    }
    else if(s.reward_used)h+='<p class="small muted">'+ic("check")+"You used your Sprint bonus. Thank you.</p>";
    else if(!over&&!s.reward_at)h+='<p class="small muted">'+nf(Math.max(0,s.xp_goal-s.xp))+" XP or +"+Math.max(0,need-gain)+" rating to go for "+E(rewardTxt(s))+". Every drill, puzzle and game review counts.</p>";
    if(s.rating_done)h+='<p class="lc106-win">'+ic("trophy")+"Rating goal reached: +"+gain+'. Tell Kyenzo: your result can go on the Wall of Love.</p><div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-lc106="proof">Tell Kyenzo</button></div>';
    if(d>=6||over||full)h+=achHTML(ACH,over?"What changed in your Sprint":"What changed so far");
    if(!full)h+='<p class="small"><a href="#sprint">Open my Sprint →</a></p>';
    return h;
  }
  function cardHTML(full){
    if(!S||S.ok===false&&S.reason==="off")return"";
    return'<div class="panel lc106" data-lc106-card>'+(S.joined?progressHTML(S,full):inviteHTML(S))+"</div>";
  }
  const CSS=".lc106{display:grid;gap:8px;padding:12px 14px;border-color:var(--accent-line,#38bdf8)}.lc106 p{margin:0}.lc106-k{font-weight:700;font-size:.92rem}.lc106-t{font-size:1.05rem;font-weight:700}"
    +".lc106-row{display:grid;gap:4px;font-size:.9rem}.lc106-bar{display:block;height:8px;border-radius:6px;background:rgba(148,163,184,.25);overflow:hidden}.lc106-bar i{display:block;height:100%;background:#38bdf8;border-radius:6px}"
    +".lc106-bar.is-done i{background:#22c55e}.lc106-cd{font-variant-numeric:tabular-nums;color:#38bdf8}.lc106-win{font-size:.9rem}.lc106-ach ul{margin:4px 0 0;padding-left:18px;font-size:.9rem}.lc106-ach li{margin:2px 0}.lc106-tbl{width:100%;font-size:.8rem;border-collapse:collapse}"
    +".lc106-tbl td,.lc106-tbl th{padding:4px 6px;border-bottom:1px solid rgba(148,163,184,.2);text-align:left}.lc106-cfg{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}";
  function css(){if(Q("#lc106-css"))return;const st=D.createElement("style");st.id="lc106-css";st.textContent=CSS;D.head.appendChild(st)}
  function paintHome(){
    const v=Q("#view");if(!v||!HOME[cur])return;
    let box=Q("[data-lc106-home]",v);const h=cardHTML(false);
    if(!h){if(box)box.remove();return}
    if(!box){box=D.createElement("section");box.className="section";box.setAttribute("data-lc106-home","");box.style.marginBottom="12px";
      /* Home: right under the guide banner; the quest board (#quests, where Home leads while the quest levels run): under the board */
      const g=Q("#lc88",v);if(cur==="quests")v.appendChild(box);else if(g&&g.parentNode===v)v.insertBefore(box,g.nextSibling);else v.insertBefore(box,v.firstChild)}
    box.innerHTML=h;
  }
  function paintAll(){try{paintHome()}catch(e){}try{const p=Q("[data-lc106-page]");if(p)paintPage(p)}catch(e){}}
  function paintPage(host){
    const s=S||{};
    let h='<header class="page-head"><h1>'+ic("flag-checkered")+"2-Week Rating Sprint</h1></header>";
    h+=signed()?(!S?'<p class="muted">Loading your Sprint…</p>':cardHTML(true)||'<p class="muted">The Sprint is switched off right now.</p>')
      :'<div class="panel lc106">'+inviteHTML(null)+"</div>";
    h+='<div class="panel lc106" style="margin-top:12px"><p class="lc106-k">How the Sprint works</p><ul class="small" style="margin:0;padding-left:18px">'
      +"<li>Link your Chess.com or Lichess account. Your start is your rating now, or your highest rating of the last 7 days when that is higher.</li>"
      +"<li>Your rating target depends on where you start: under 1000 +100, under 1400 +75, under 1800 +50, above that +30. The server reads your public rating, so nobody can fake it.</li>"
      +"<li>Your training target: "+nf(s.xp_goal||1500)+" XP in 14 days. That is the part you control.</li>"
      +"<li>Reach either target and you get "+E(rewardTxt(s.joined?s:null))+". The bonus stays open until 48 hours after your Sprint and your free trial end.</li>"
      +"<li>Week 1: "+nf(s.week1_xp||500)+" XP in your first 7 days keeps your 3 tokens a day for one more week.</li>"
      +"<li>Reach your rating target and Kyenzo can put your result on the Wall of Love.</li>"
      +"<li>One Sprint per account and per chess account.</li></ul></div>";
    if(owner())h+='<div class="panel lc106" style="margin-top:12px" data-lc106-admin><p class="lc106-k">Owner: every Sprint and the settings</p><p class="small muted">Loading…</p></div>';
    host.innerHTML=h;
    if(owner())paintAdmin(Q("[data-lc106-admin]",host));
  }
  async function paintAdmin(box){
    if(!box)return;
    const v=await authed("lc106_admin");
    if(!v||!v.ok){box.innerHTML='<p class="lc106-k">Owner</p><p class="small muted">Not available ('+E(v&&(v.reason||v.error)||"no answer")+'). Run sql/20261125100000_lc106_sprint_funnel_referrals.sql.</p>';return}
    const c=v.cfg||{},rowsA=v.rows||[],dt=t=>t?new Date(t).toLocaleDateString("en-GB",{day:"numeric",month:"short"}):"";
    const f=(k,l,val)=>'<label class="field"><span class="field-label">'+E(l)+'</span><input class="input" type="number" data-lc106-cfg="'+k+'" value="'+E(val)+'"></label>';
    box.innerHTML='<p class="lc106-k">Owner: every Sprint ('+rowsA.length+")</p>"
      +(rowsA.length?'<div style="overflow-x:auto"><table class="lc106-tbl"><tr><th>Member</th><th>Start</th><th>Rating</th><th>XP</th><th>Price</th><th>Wall</th></tr>'
        +rowsA.map(r=>"<tr><td>"+E(r.email)+"<br><small>"+E(r.site)+" "+E(r.uname)+"</small></td><td>"+dt(r.started_at)+"</td><td>"+E(r.start)+" → "+E(r.now==null?"?":r.now)+" / +"+E(r.target)+(r.rating_done?" ✓":"")+"</td><td>"+nf(r.xp)+" / "+nf(r.xp_goal)+(r.xp_done?" ✓":"")+"</td><td>"+(r.xp_done?E(r.pct)+" %"+(r.reward_used?" used":""):"")+"</td><td>"+(r.proof_ok?"asked":"")+"</td></tr>").join("")+"</table></div>":'<p class="small muted">Nobody started a Sprint yet.</p>')
      +'<div class="lc106-cfg"><label class="field"><span class="field-label">Reward</span><select class="input" data-lc106-cfg="reward"><option value="month"'+((c.reward||"month")==="month"?" selected":"")+'>13th month on the yearly plan</option><option value="pct"'+(c.reward==="pct"?" selected":"")+'>% off the first payment</option></select></label>'
      +f("pct","If %: how much off",c.pct)+f("reward_hours","Bonus open (hours after Sprint / trial end)",c.reward_hours||48)+f("xp_goal","XP goal (14 days)",c.xp_goal)+f("days","Sprint days",c.days)+f("xp_day_max","XP counted a day (max)",c.xp_day_max)
      +f("week1_xp","Week 1: XP goal",c.week1_xp||500)+f("week1_tokens","Week 1: bonus tokens",c.week1_tokens||14)+"</div>"
      +'<label class="switch-row"><span>Sprint on</span><input type="checkbox" data-lc106-cfg="on"'+(c.on!==false?" checked":"")+'></label><div class="btn-row"><button type="button" class="btn btn-primary btn-sm" data-lc106="save">Save</button></div><p class="small muted">Targets per start rating stay in lc106_cfg (targets). Paying with the Sprint price needs the stripe function of 9.74.0.</p>';
  }
  async function saveCfg(box){
    const o={};QA("[data-lc106-cfg]",box).forEach(i=>{const k=i.getAttribute("data-lc106-cfg");o[k]=i.type==="checkbox"?i.checked:i.tagName==="SELECT"?i.value:+i.value});
    const v=await authed("lc106_cfg_save",{p_v:o});say(v&&v.ok?"Saved.":"Not saved ("+E(v&&(v.reason||v.error)||"no answer")+").",v&&v.ok?"good":"bad");if(v&&v.ok)paintAdmin(box);
  }

  /* ---------- the Sprint price checkout: the same consent step as every paid step (LC99), then the stripe route "sprint" ---------- */
  const KEEP14="I can still withdraw within 14 days with “Withdraw from contract here” (Account); I then pay only for the days I used and get the rest back.";
  function wordsFor(plan,tier){
    const nm=tier===3?"VIP":"Pro",pct=+(S&&S.pct)||0;
    if(month(S))return"I ask for "+nm+" to start right away. Today I pay the yearly price; with my Sprint bonus the first period is 13 months, then the yearly price every year until I cancel. "+KEEP14;
    return"I ask for my plan to start right away. Today I pay the first payment with my Sprint price ("+pct+" % off), then the normal price of the plan I picked until I cancel. "+KEEP14;
  }
  function buy(plan,tier){
    const nm=(tier===3?"VIP":"Pro")+", "+(month(S)?"13 months":plan),pct=+(S&&S.pct)||0,words=wordsFor(plan,tier);
    const terms=month(S)?["Today: the yearly price of "+(tier===3?"VIP":"Pro")+" (Stripe shows the exact amount before you pay).","Your first period is 13 months instead of 12: the first renewal comes one month later.",
        "Then the yearly price every year until you cancel (Account > Manage subscription).","Changed your mind? Within 14 days, “Withdraw from contract here” in Account: you pay only for the days you used and get the rest back."]
      :["Today: the first "+(plan==="yearly"?"year":"month")+" of "+nm+" with "+pct+" % off. Stripe shows the exact amount before you pay.",
      "Then the normal price every "+(plan==="yearly"?"year":"month")+" until you cancel (Account > Manage subscription).",
      "Changed your mind? Within 14 days, “Withdraw from contract here” in Account: you pay only for the days you used and get the rest back."];
    if(typeof openSheet!=="function")return;
    openSheet({title:"Before you pay: "+nm,cls:"lc99-sheet lc106-sheet",noFocus:true,
      html:'<div class="lc99"><ul class="lc99-terms">'+terms.map(x=>"<li>"+E(x)+"</li>").join("")+'</ul><label class="lc99-ok"><input type="checkbox" data-lc106-ok> <span>'+E(words)+'</span></label><div class="lc99-btns"><button type="button" class="btn btn-primary" data-lc106-pay disabled>'+ic("lock")+'Continue to secure checkout</button><button type="button" class="btn btn-quiet" data-close>Back</button></div><p class="form-msg" data-lc106-msg aria-live="polite"></p></div>',
      onMount(sh){const el=sh.el,ok=Q("[data-lc106-ok]",el),pay=Q("[data-lc106-pay]",el),msg=Q("[data-lc106-msg]",el);
        ok.addEventListener("change",()=>{pay.disabled=!ok.checked});
        pay.addEventListener("click",async()=>{if(!ok.checked)return;pay.disabled=true;msg.textContent="Opening secure checkout…";
          const r=await post("sprint",{plan:plan,tier:tier,consent:true,consent_v:(typeof LC99!=="undefined"&&LC99.CONSENT_V)||"w2-2026-11-23",consent_text:words});
          if(r&&r.ok&&r.url){try{if(typeof LC36!=="undefined"&&LC36.support&&LC36.support.go)LC36.support.go(r.url);else location.href=r.url}catch(e){location.href=r.url}return}
          pay.disabled=false;msg.textContent=why(r);});
      }});
  }
  const why=r=>r&&r.reason==="no_sprint_price"?"Your Sprint bonus is not active (used, past its deadline, or no goal reached yet).":r&&r.reason==="yearly_only"?"The 13th month comes with the yearly plan.":r&&r.reason==="sign_in"?"Sign in again first.":"The checkout did not open ("+((r&&(r.reason||r.status))||"no connection")+").";
  /* LC97's post-trial pop-up pays the yearly plan through here while the bonus is open (its own consent step already ran) */
  async function pay(plan,tier,words){
    const r=await post("sprint",{plan:plan==="monthly"?"monthly":"yearly",tier:tier===3?3:2,consent:true,consent_v:(typeof LC99!=="undefined"&&LC99.CONSENT_V)||"w2-2026-11-23",consent_text:String(words||wordsFor(plan,tier))});
    if(r&&r.ok&&r.url){try{if(typeof LC36!=="undefined"&&LC36.support&&LC36.support.go)LC36.support.go(r.url);else location.href=r.url}catch(e){location.href=r.url}return{ok:true}}
    return{ok:false,msg:why(r)};
  }
  function bonus(){return active(S)?{kind:S.reward_kind||"month",pct:S.pct,until:S.reward_until,text:rewardTxt(S),cd:cd(S.reward_until)}:null}
  async function post(path,body){
    try{const c=LC26.sync.cfg(),s=LC26.sync.session(),dv=(()=>{try{return deviceId()}catch(e){return""}})();
      const r=await fetch(String(c.url).replace(/\/+$/,"")+"/functions/v1/stripe/"+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.assign({token:s&&s.access_token||"",device:dv},body))});
      const j=await r.json().catch(()=>({}));j.status=r.status;return j}catch(e){return{ok:false,reason:"network",status:0}}
  }

  /* ---------- LC88 (one guide at a time): one step after the first review, until the Sprint started or was waved away ---------- */
  function guide(){
    try{
      if(active(S))return{html:"<b>Your Sprint bonus: "+E(rewardTxt(S))+".</b> <span class=\"lc88-s\">Ends in "+cd(S.reward_until)+".</span>",
        acts:[{label:"Claim it",href:"#sprint",primary:true}],sig:"sprint-bonus"};
      if(!S||S.joined||S.ok===false&&S.reason==="off")return null;
      const x=+ls.get(KX,0)||0;if(x&&Date.now()-x<4*DAY)return null;
      const done=ls.get("lc94-done",{})||{};if(!done.first_review_done)return null;
      return{html:"<b>Start your 2-Week Rating Sprint.</b> <span class=\"lc88-s\">One rating target that fits your level, one training target you control. Hit either one and you get "+E(rewardTxt(S))+".</span>",
        acts:[{label:"See my target",href:"#sprint",primary:true},{label:"×",dismiss:true,run:()=>ls.set(KX,Date.now())}],sig:"sprint"};
    }catch(e){return null}
  }
  /* LC90's Day-7 pop-up: what changed, and the trial as the rest of the Sprint */
  function popupHTML(){
    try{
      if(!S||!S.joined)return"";
      const left=+S.days_left||0,d=achHTML(ACH,"What changed in your first "+Math.min(dayOf(S),14)+" days");
      const line=S.over?"":'<p class="lc90-trial">'+ic("flag-checkered")+"Your Sprint has "+left+(left===1?" day":" days")+" left: Pro gives you every course and the full coach for the rest of it."+(active(S)?" Your Sprint bonus ("+E(rewardTxt(S))+") is waiting.":"")+"</p>";
      return d||line?'<div class="lc106-pop">'+d+line+"</div>":"";
    }catch(e){return""}
  }

  /* ---------- the page and wiring ---------- */
  function mount(v){
    css();const host=v||Q("#view");if(!host)return;
    host.innerHTML='<div data-lc106-page></div>';
    paintPage(Q("[data-lc106-page]",host));
    sync(true);
  }
  async function proof(){
    const v=await authed("lc106_proof",{p_ok:true});
    say(v&&v.ok?"Thank you. Write Kyenzo a line about what changed: it can go on the Wall of Love.":"Not sent.",v&&v.ok?"good":"bad");
    location.hash="#coach-chat";
  }
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    const b=t.closest("[data-lc106]");
    if(b){e.preventDefault();const a=b.getAttribute("data-lc106");if(a==="start")start();else if(a==="proof")proof();else if(a==="save")saveCfg(b.closest("[data-lc106-admin]"));return}
    const p=t.closest("[data-lc106-buy]");
    if(p){e.preventDefault();buy(p.getAttribute("data-lc106-buy")==="yearly"?"yearly":"monthly",+p.getAttribute("data-lc106-tier")===3?3:2)}
  }
  function ownerRow(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc106-own]",m)||!owner())return;
    const ref=Q("[data-lc100-own]",m)||Q("[data-lc99-own]",m)||Q("[data-lc97-own]",m);if(!ref)return;
    const a=D.createElement("a");a.href="#sprint";a.className="lc49-mi lc49-tool";a.setAttribute("data-lc106-own","");
    a.innerHTML="<span><b>2-Week Rating Sprint</b><small>Every Sprint, the XP goal and the Sprint price</small></span>";
    a.addEventListener("click",()=>{try{const mm=Q("#lc49-menu");if(mm)mm.remove()}catch(x){}});
    ref.insertAdjacentElement("afterend",a);
  }
  function afterRender(route){
    cur=String(route||"");
    if(HOME[cur]){css();paintHome();sync(false)}
  }
  function init(){
    try{
      css();D.addEventListener("click",onClick);setInterval(tickCd,1000);
      /* the Sprint is the onboarding storyline: its page opens from quest level 1 */
      try{const lv=LC26.levels,o=lv.minLevel;if(lv&&!lv.__lc106){lv.__lc106=1;lv.minLevel=r=>r==="sprint"?1:o(r)}}catch(e){}
      W.addEventListener("lc39-signed-in",()=>sync(true));
      let t=0;new MutationObserver(()=>{if(t)return;t=setTimeout(()=>{t=0;ownerRow();if(HOME[cur]&&!Q("[data-lc106-home]"))paintHome()},300)}).observe(D.body,{childList:true,subtree:true});
      if(S&&S.joined)refreshAch();
    }catch(e){console.error("lc106",e)}
  }
  return{init:init,afterRender:afterRender,mount:mount,sync:sync,start:start,guide:guide,popupHTML:popupHTML,bonus:bonus,pay:pay,version:VERSION,state:()=>S,
    _t:{left:left,rewardTxt:rewardTxt,wordsFor:wordsFor,targetFor:targetFor,weekPeak:weekPeak,changes:changes,dayOf:dayOf,cardHTML:cardHTML,set:v=>{S=v;ls.set(KEY,v)},setAch:a=>{ACH=a||[]}}};
})(); /*@@end lc106*/
