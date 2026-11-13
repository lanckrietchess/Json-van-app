/*@@module lc75*/
const LC75=(()=>{
  "use strict";
  /* LC75 (build 9.38.0):
     1. Funnel Command Center (#command, also #analytics): opens from the Admin pill top right. Today / 7 days / 30 days / 6 months / this year /
        Lifetime; nine levels (views, clicks + CTR, landing visits, downloads + registrations, card or lead magnet, paying, churn + repeat,
        upsells, referrals) with "All channels" on the left and one column per channel; KPI targets with orange / red bottleneck colours;
        revenue, average spend and LTV; daily views per channel; the short links, sources and partners below (LC73). Partners see the same
        page for their own links only (lc75_funnel).
     2. Admin shortcuts: "Open Landing Page Editor / Preview" and "Funnel Command Center" at the top of the owner menu and on the dashboard.
     3. Library: the left side opens a full e-book reader (PDF pages through PDF.js, or the text of the item), with pages, swipe, zoom and
        download; the right side is a school-style course: modules, video, text and PGN lessons, progress, Continue. Locked lessons open the
        token price list (LC72.unlock).
     4. Refer a Friend: the member's own 10% link (friend 10% off the first purchase, the member 10% off the next one when the friend buys).
     SQL: sql/20261113120000_lc75_command_center.sql. */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0].toLowerCase();
  const ic=n=>{try{return icon(n)}catch(e){return""}};
  const say=(t,k)=>{try{toast(t,k||"")}catch(e){}};
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const owner=()=>{try{return !!(LC49.owner()||Admin.active)}catch(e){return false}};
  async function tok(){try{return await LC26.sync.token()}catch(e){return""}}
  async function rpc(fn,args,anon){const t=await tok();if(!t&&!anon)return{status:0,data:null};
    try{return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:t?{Authorization:"Bearer "+t}:{},body:JSON.stringify(args||{})})}catch(e){return{status:0,data:null}}}
  const missing=r=>r&&(r.status===404||(r.data&&/PGRST202|does not exist/i.test(String(r.data.code||"")+String(r.data.message||""))));
  const fmt=n=>(Math.round(+n||0)).toLocaleString("en-GB"),eur=c=>"€"+((+c||0)/100).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});
  const pct=(a,b)=>+b>0?Math.round(+a/+b*1000)/10:null;

  /* ============ 1. Funnel Command Center ============ */
  const RANGES=[["today","Today"],["7","Last 7 days"],["30","Last 30 days"],["180","Last 6 months"],["year","This year"],["all","Lifetime"]];
  let rg=rd("lc75-range","30");
  function rangeP(){const d=new Date(),iso=x=>x.toISOString().slice(0,10);
    if(rg==="all")return{all:true};if(rg==="today")return{from:iso(d),to:iso(d)};if(rg==="7")return{from:iso(new Date(Date.now()-6*864e5)),to:iso(d)};
    if(rg==="180")return{from:iso(new Date(Date.now()-179*864e5)),to:iso(d)};if(rg==="year")return{from:iso(new Date(d.getFullYear(),0,1,12)),to:iso(d)};
    return{from:iso(new Date(Date.now()-29*864e5)),to:iso(d)}}
  function status(v,k){if(v==null||!k)return"";const t=+k.target;if(!(t>0))return"";
    if(k.kind==="max")return v>t*1.3?"is-red":v>t?"is-orange":"is-green";return v<t*.7?"is-red":v<t?"is-orange":"is-green"}
  const CHIP=(label,v,k,unit)=>v==null?'<small class="lc75-c">'+esc(label)+": –</small>":'<small class="lc75-c '+status(v,k)+'">'+esc(label)+": "+(unit==="%"?v+"%":fmt(v))+(k?" <i>/ "+(k.kind==="max"?"≤ ":"")+(unit==="%"?k.target+"%":fmt(k.target))+"</i>":"")+"</small>";
  function levels(K,days){
    return[
      {n:1,t:"Views",s:"Top of the funnel: typed in per day and channel",v:r=>r.views,c:r=>[["per day",Math.round(r.views/days),K.l1_views_day,""]]},
      {n:2,t:"Short-link clicks",s:"/l/ codes in bios, descriptions, pinned comments, outreach",v:r=>r.clicks,c:r=>[["CTR",pct(r.clicks,r.views),K.l2_ctr,"%"]]},
      {n:3,t:"Landing page visitors",s:"Unique visitors",v:r=>r.visits,c:r=>[["from clicks",pct(r.visits,r.clicks),K.l3_click_visit,"%"]]},
      {n:4,t:"Downloads and registrations",s:"Accounts (and app installs / opens)",v:r=>r.signups,c:r=>[["of visitors",pct(r.signups,r.visits),K.l4_visit_signup,"%"],["installs",r.installs,null,""]]},
      {n:5,t:"Card or free product",s:"7-day trial with a card, or a lead magnet",v:r=>r.cards,c:r=>[["of registrations",pct(r.cards,r.signups),K.l5_signup_card,"%"]]},
      {n:6,t:"Paying customers",s:"Card holders who pay, and the whole app",v:r=>r.paying,c:r=>[["card to paid",pct(r.card_paid,r.cards),K.l6_card_paid,"%"],["app conversion",pct(r.paying,r.signups),K.l6_app_conv,"%"],["sales / 30 days",Math.round(r.sales/days*30),K.l6_sales_month,""]]},
      {n:7,t:"Churn and repeat purchases",s:"Pro / VIP that lapsed, buyers who bought again",v:r=>r.renewals,vl:"renewals",c:r=>[["churn",pct(r.lapsed,(+r.active||0)+(+r.lapsed||0)),K.l7_churn,"%"],["repeat buyers",pct(r.repeat,r.buyers_all),K.l7_repeat,"%"]]},
      {n:8,t:"Upsells",s:"Tokens to a course, Pro to VIP, the Oops yearly switch",v:r=>r.upsell,c:r=>[["of buyers",pct(r.upsell,r.buyers_all),K.l8_upsell,"%"],["tokens→course",r.up_tok_course,null,""],["Pro→VIP",r.up_pro_vip,null,""],["Oops yearly",r.up_rescue,null,""]]},
      {n:9,t:"Referrals and advocacy",s:"Members who refer, buyers who bring buyers, 10% discounts used",v:r=>r.referred,vl:"referred",c:r=>[["members who referred",pct(r.referrers,r.members_all),K.l9_referrers,"%"],["buyer → buyer",pct(r.buyer_buyer,r.buyers_all),K.l9_buyer_buyer,"%"],["10% used",(+r.disc_invitee||0)+(+r.disc_referrer||0),null,""]]}];
  }
  const HINT={1:"Post more: one short every day per channel, same hook style as your best video.",2:"Put the /l/ link in the bio, the pinned comment and the first line of every description, with ONE clear reason to click.",
    3:"Clicks that never reach the page: check that every short link still works and opens fast on a phone.",4:"Visitors who leave: make the first screen promise one result and show the Proof Queue sooner.",
    5:"Few cards / lead magnets: put one strong lead magnet (Woodpecker summary) right under the hero and in the welcome flow.",6:"Card holders who do not pay: use the coach chat in the trial week and the reminder; show one clear Pro benefit per day.",
    7:"Churn: send a coach message in week 3 and push the yearly plan; give buyers a reason to come back (next course).",8:"Upsells: offer the next course right after a lesson is finished and VIP to active Pro members.",
    9:"Referrals: show the 10% link after every milestone pop-up and in the coach chat."};
  /* ---------- the Master Funnel Table: Step | TOTAL (live) | GOAL (editable) | Status; a channel filter on top ---------- */
  const PCT=(a,b)=>pct(a,b);
  function metricRows(R,days,ltv){
    const avg=+R.paying?Math.round(+R.revenue/+R.paying):0;
    return[
      {lv:1,t:"Top-of-funnel views",s:"Typed in per day and channel",m:[
        {id:"1.1",l:"Views",v:+R.views||0,g:"l1_views_day",u:"/day",scale:days,unit:""}]},
      {lv:2,t:"Landing page clicks and CTR",s:"Through the /l/ short links",m:[
        {id:"2.1",l:"Short-link clicks",v:+R.clicks||0},{id:"2.2",l:"CTR (clicks / views)",v:PCT(R.clicks,R.views),g:"l2_ctr",unit:"%"}]},
      {lv:3,t:"Landing page visits",s:"Unique visitors",m:[
        {id:"3.1",l:"Unique visitors",v:+R.visits||0},{id:"3.2",l:"Clicks that arrive",v:PCT(R.visits,R.clicks),g:"l3_click_visit",unit:"%"}]},
      {lv:4,t:"App downloads and registrations",s:"Visitors who install and register",m:[
        {id:"4.1",l:"Registrations",v:+R.signups||0},{id:"4.2",l:"App installs / opens",v:+R.installs||0},{id:"4.3",l:"Visitors who register",v:PCT(R.signups,R.visits),g:"l4_visit_signup",unit:"%"}]},
      {lv:5,t:"Card capture / free products",s:"€0 trial with a card, or a lead magnet (Woodpecker…)",m:[
        {id:"5.1",l:"Card or lead magnet",v:+R.cards||0},{id:"5.2",l:"Registrations that take it",v:PCT(R.cards,R.signups),g:"l5_signup_card",unit:"%"}]},
      {lv:6,t:"Paying customers",s:"Card holders who pay, and the whole app",m:[
        {id:"6.1",l:"Paying customers",v:+R.paying||0},{id:"6.2",l:"Card holders who pay",v:PCT(R.card_paid,R.cards),g:"l6_card_paid",unit:"%"},
        {id:"6.3",l:"App conversion (paying / registrations)",v:PCT(R.paying,R.signups),g:"l6_app_conv",unit:"%"},
        {id:"6.4",l:"Sales",v:+R.sales||0,g:"l6_sales_month",u:"/30 days",scale:days/30,unit:""},
        {id:"6.5",l:"Revenue",v:+R.revenue||0,money:true},{id:"6.6",l:"Average spend per customer",v:avg,money:true},{id:"6.7",l:"LTV (all-time revenue / unique buyers)",v:ltv,money:true}]},
      {lv:7,t:"Churn and repeat purchases",s:"Renewals against cancellations, 2nd and 3rd purchases",m:[
        {id:"7.1",l:"Renewals",v:+R.renewals||0},{id:"7.2",l:"Lapsed (cancelled or not renewed)",v:+R.lapsed||0},
        {id:"7.3",l:"Churn",v:PCT(R.lapsed,(+R.active||0)+(+R.lapsed||0)),g:"l7_churn",unit:"%"},{id:"7.4",l:"Buyers who bought again",v:PCT(R.repeat,R.buyers_all),g:"l7_repeat",unit:"%"}]},
      {lv:8,t:"Upsells",s:"To a bigger plan, a course, or the Oops yearly switch",m:[
        {id:"8.1",l:"Customers with an upsell",v:+R.upsell||0},{id:"8.2",l:"Upsell rate",v:PCT(R.upsell,R.buyers_all),g:"l8_upsell",unit:"%"},
        {id:"8.3",l:"Tokens → course",v:+R.up_tok_course||0},{id:"8.4",l:"Pro → VIP",v:+R.up_pro_vip||0},{id:"8.5",l:"Oops yearly switch",v:+R.up_rescue||0}]},
      {lv:9,t:"Referrals and advocacy",s:"Through the 10% link",m:[
        {id:"9.1",l:"Registrations through a friend",v:+R.referred||0},{id:"9.2",l:"Members who referred someone",v:PCT(R.referrers,R.members_all),g:"l9_referrers",unit:"%"},
        {id:"9.3",l:"Buyers who brought a buyer",v:PCT(R.buyer_buyer,R.buyers_all),g:"l9_buyer_buyer",unit:"%"},{id:"9.4",l:"10% discounts used",v:(+R.disc_invitee||0)+(+R.disc_referrer||0)}]}];
  }
  let CC={d:null,chan:rd("lc75-chan","all")};
  function mountCC(view){view.innerHTML='<section class="lc75-cc" data-lc75-cc><p class="muted">Loading…</p></section>';paintCC();return null}
  async function paintCC(){
    const host=Q("[data-lc75-cc]");if(!host)return;
    if(!sess()){host.innerHTML='<div class="panel pad"><h1>Funnel Command Center</h1><p>Sign in first.</p></div>';return}
    host.innerHTML='<p class="muted">Loading the funnel…</p>';
    const r=await rpc("lc75_funnel",{p:rangeP()});const d=r.data||{};
    if(missing(r)){host.innerHTML='<div class="panel pad"><b>Run sql/20261113120000_lc75_command_center.sql (after the 9.37.0 file) first.</b></div>';return}
    if(!d.ok){host.innerHTML='<div class="panel pad"><h1>Funnel Command Center</h1><p class="muted">For the owner and business partners only.</p></div>';return}
    CC.d=d;renderCC();
  }
  function renderCC(){
    const host=Q("[data-lc75-cc]"),d=CC.d;if(!host||!d)return;
    const K=d.kpis||{},days=Math.max(1,+(d.range||{}).days||1),rows=d.rows||{},base=["tiktok","instagram","youtube","reddit","facebook","x","direct"];
    const chans=["all"].concat(base.filter(c=>(d.channels||[]).indexOf(c)>=0||rows[c])).concat((d.channels||[]).filter(c=>c!=="all"&&base.indexOf(c)<0).sort());
    if(chans.indexOf(CC.chan)<0)CC.chan="all";
    const A=rows.all||{},ltv=+A.ltv_buyers?Math.round(+A.ltv_rev/+A.ltv_buyers):0,R=rows[CC.chan]||{},Rltv=+R.ltv_buyers?Math.round(+R.ltv_rev/+R.ltv_buyers):0;
    const L=metricRows(R,days,Rltv);
    /* status of every metric with a goal; the worst one is the bottleneck */
    let worst=null;
    L.forEach(l=>l.m.forEach(m=>{if(!m.g||!K[m.g]||m.v==null)return;const k=K[m.g],t=(+k.target)*(m.scale||1);if(!(t>0))return;
      m.goal=t;m.st=k.kind==="max"?(m.v>t*1.3?"is-red":m.v>t?"is-orange":"is-green"):(m.v<t*.7?"is-red":m.v<t?"is-orange":"is-green");
      const ratio=k.kind==="max"?t/Math.max(.1,m.v):m.v/t;if(ratio<1&&(!worst||ratio<worst.ratio))worst={ratio:ratio,m:m,l:l}}));
    const val=m=>m.v==null?"–":m.money?eur(m.v):m.unit==="%"?m.v+"%":fmt(m.v);
    const goalCell=m=>{if(!m.g||!K[m.g])return'<td class="lc75-g">–</td>';const k=K[m.g],ed=d.admin;
      return'<td class="lc75-g">'+(k.kind==="max"?"≤ ":"")+(ed?'<input class="input lc75-gi" type="number" min="0" step="'+(m.unit==="%"?"0.1":"1")+'" value="'+esc(k.target)+'" data-lc75-goal="'+esc(m.g)+'" aria-label="Goal for '+esc(m.l)+'">':"<b>"+esc(k.target)+"</b>")+"<small>"+(m.unit==="%"?"%":esc(m.u||""))+"</small>"
        +(m.scale&&m.scale!==1?'<small class="lc75-gp">= '+fmt(m.goal)+" in this period"+(m.g==="l1_views_day"?" · ≈ "+fmt(k.target*30)+" a month":"")+"</small>":"")+"</td>"};
    const stCell=m=>!m.st?'<td class="lc75-s">–</td>':'<td class="lc75-s"><span class="lc75-pill '+m.st+'">'+(m.st==="is-green"?"✓ On target":worst&&worst.m===m?"⚠ Biggest bottleneck":m.st==="is-red"?"Bottleneck":"Below goal")+"</span></td>";
    host.innerHTML='<header class="lc75-h"><div><p class="lc75-tag">'+(d.admin?"Owner":"Business partner")+'</p><h1>Funnel Command Center</h1></div><div class="btn-row">'
      +(d.admin?'<a class="btn btn-gold" href="#landing-editor">'+ic("pen-to-square")+' Open Landing Page Editor / Preview</a>':"")+'<a class="btn btn-ghost" href="/" target="_blank" rel="noopener">'+ic("arrow-up-right-from-square")+" Live landing page</a></div></header>"
      +'<div class="lc75-rg" role="tablist" aria-label="Period">'+RANGES.map(x=>'<button type="button" role="tab" class="lc75-r'+(rg===x[0]?" is-on":"")+(x[0]==="all"?" is-life":"")+'" data-lc75="rg" data-r="'+x[0]+'" aria-selected="'+(rg===x[0])+'">'+x[1]+"</button>").join("")+"</div>"
      +'<div class="lc75-rg lc75-ch" role="tablist" aria-label="Channel">'+chans.map(c=>'<button type="button" role="tab" class="lc75-r'+(CC.chan===c?" is-on":"")+'" data-lc75="ch" data-c="'+esc(c)+'" aria-selected="'+(CC.chan===c)+'">'+(c==="all"?"All channels (total)":esc(c.charAt(0).toUpperCase()+c.slice(1)))+"</button>").join("")+"</div>"
      +(worst?'<p class="lc75-bn is-'+(worst.ratio<.7?"red":"orange")+'"><b>Biggest bottleneck: '+esc(worst.m.id+" "+worst.m.l)+" — "+val(worst.m)+" against a goal of "+(worst.m.unit==="%"?worst.m.goal+"%":fmt(worst.m.goal))+"</b><span>"+esc(HINT[worst.l.lv])+"</span></p>":'<p class="lc75-bn is-green"><b>Every goal is met in this period'+(CC.chan==="all"?"":" for "+esc(CC.chan))+".</b></p>")
      +'<div class="lc75-tw"><table class="lc75-mt"><thead><tr><th scope="col">Step</th><th scope="col">TOTAL <small>live</small></th><th scope="col">GOAL'+(d.admin?" <small>tap to edit</small>":"")+'</th><th scope="col">Status</th></tr></thead><tbody>'
      +L.map(l=>'<tr class="lc75-lv"><th colspan="4" scope="rowgroup"><span class="lc75-n">'+l.lv+"</span>"+esc(l.t)+"<small>"+esc(l.s)+"</small></th></tr>"
        +l.m.map(m=>'<tr class="'+(m.st&&m.st!=="is-green"?m.st:"")+'"><th scope="row"><span class="lc75-id">'+m.id+"</span> "+esc(m.l)+"</th><td class=\"lc75-v\">"+val(m)+"</td>"+goalCell(m)+stCell(m)+"</tr>").join("")).join("")+"</tbody></table></div>"
      +'<p class="small muted">'+(rg==="all"?"Lifetime":"This period: "+Math.round(days)+" day"+(Math.round(days)===1?"":"s"))+". Percentages are between consecutive steps. Goals per day or per 30 days are scaled to the period. Orange = under the goal, red = under 70% of it (churn: above the maximum). "+(CC.chan==="all"?"":"Channel = where the person first came from (short link or utm_source). ")+"Revenue: API checkouts, token packs, library sales, renewals and the Payment-Link sales logged in lc45_payment_events. All-time LTV over all channels: "+eur(ltv)+".</p>"
      +'<details class="panel pad lc75-in"'+(+A.views?"":" open")+'><summary><b>Views per day and channel</b> <small class="muted">(type them in; an API job can fill the same table later)</small></summary><form data-lc75-views class="lc75-vf"><label class="field"><span class="field-label">Day</span><input class="input" type="date" name="day" value="'+new Date().toISOString().slice(0,10)+'"></label>'
        +["tiktok","instagram","youtube","facebook","reddit","x","other"].map(c=>'<label class="field"><span class="field-label">'+c+'</span><input class="input" type="number" min="0" name="'+c+'" inputmode="numeric"></label>').join("")
        +'<button class="btn btn-primary" type="submit">Save the day</button></form><label class="field"><span class="field-label">Or paste a CSV export: date,channel,views (one per line)</span><textarea class="input" rows="3" data-lc75-csv placeholder="2026-11-12,tiktok,5400"></textarea></label><button type="button" class="btn btn-ghost btn-sm" data-lc75="csv">Import the CSV</button></details>'
      +'<h2>Short links, sources and partners</h2><section data-lc73-dash data-lc73-lite></section>';
    wr("lc73-range",rg==="all"?"30":rg);wr("lc73-all",rg==="all");
    try{LC73.paintDash()}catch(e){}
  }
  async function saveGoal(inp){
    const k=inp.getAttribute("data-lc75-goal"),v=+inp.value;if(!(v>=0)||!CC.d)return;
    const r=await rpc("lc75_kpi_set",{p:{[k]:v}});
    if(r.data&&r.data.ok){if(CC.d.kpis&&CC.d.kpis[k])CC.d.kpis[k].target=v;say("Goal saved.","good");renderCC()}else say("Could not save the goal.","bad");
  }

  /* the Data Briefing in Admin Mode: the Master Funnel Table at the top of the Admin dashboard; the older member counters fold under it */
  function adminBriefing(){
    if(route()!=="admin-lc30")return;const v=Q("#view");if(!v)return;
    let host=Q("#lc75-brief",v);
    if(!host){host=document.createElement("section");host.id="lc75-brief";host.className="lc75-adm";host.innerHTML='<p class="lc75-tag">Admin Mode · Data Briefing</p><div data-lc75-cc><p class="muted">Loading the funnel…</p></div>';
      const head=Q(".page-head",v);if(head)head.insertAdjacentElement("afterend",host);else v.insertAdjacentElement("afterbegin",host);paintCC()}
    const old=Q("#lc36-brief",v);if(old&&!old.closest(".lc75-old")){const d=document.createElement("details");d.className="panel pad lc75-old";d.innerHTML="<summary><b>Members, tools and partners (counters)</b></summary>";host.insertAdjacentElement("afterend",d);d.appendChild(old)}
  }

  /* ============ 2. admin shortcuts ============ */
  function menuButtons(){
    const m=Q("#lc49-menu");if(!m||Q(".lc75-top",m)||!owner())return;
    const box=document.createElement("div");box.className="lc75-top";
    box.innerHTML='<a class="btn btn-gold lc75-big" href="#landing-editor" data-lc75-go>'+ic("pen-to-square")+' Open Landing Page Editor / Preview</a><a class="btn btn-primary lc75-big" href="#command" data-lc75-go>'+ic("chart-line")+" Funnel Command Center</a>";
    const kids=[].slice.call(m.children),testAs=kids.filter(x=>/Test as/i.test(x.textContent||""))[0];
    if(testAs)testAs.insertAdjacentElement("afterend",box);else m.insertAdjacentElement("afterbegin",box);
  }

  /* ============ 3. library: school course + e-book reader ============ */
  let openC={},outC={};
  async function courseData(id,access){
    if(access){if(openC[id]&&Date.now()-openC[id].at<300000)return openC[id].d;const r=await rpc("lc70_open",{p_id:id},true);const d=r.data&&r.data.ok?r.data:null;openC[id]={at:Date.now(),d:d};return d}
    if(outC[id]&&Date.now()-outC[id].at<300000)return outC[id].d;const r=await rpc("lc75_outlines",{p_ids:[id]},true);const l=r.data&&r.data.ok&&r.data.outlines?r.data.outlines[id]:null;
    const d=l?{videos:l,outline:true}:null;outC[id]={at:Date.now(),d:d};return d;
  }
  const doneOf=id=>{const m=rd("lc75-done",{})||{};return Array.isArray(m[id])?m[id]:[]};
  function setDone(id,i,on){const m=rd("lc75-done",{})||{},l=Array.isArray(m[id])?m[id]:[];const k=l.indexOf(i);if(on&&k<0)l.push(i);if(!on&&k>=0)l.splice(k,1);m[id]=l;wr("lc75-done",m)}
  const TYPE=v=>v.type||(v.pgn?"pgn":v.text?"text":"video"),TIC={video:"circle-play",text:"file-lines",pgn:"chess-board"},TLB={video:"Video",text:"Text lesson",pgn:"Opening (PGN)"};
  function schoolHTML(id,title,list,access,price){
    const done=doneOf(id),n=list.length,dn=access?list.filter((v,i)=>done.indexOf(i)>=0).length:0,nextI=list.findIndex((v,i)=>done.indexOf(i)<0);
    const mods=[];list.forEach((v,i)=>{const f=String(v.folder||"Lessons");let m=mods[mods.length-1];if(!m||m.f!==f){m={f:f,l:[]};mods.push(m)}m.l.push([v,i])});
    return'<div class="lc75-school"><header><p class="lc72-ck">'+ic("graduation-cap")+' Video course</p><h4>'+esc(title)+"</h4>"
      +(access?'<div class="lc75-prog" role="progressbar" aria-valuemin="0" aria-valuemax="'+n+'" aria-valuenow="'+dn+'"><i style="width:'+(n?Math.round(dn/n*100):0)+'%"></i></div><small>'+dn+" of "+n+" lessons done</small>"
        :'<small>'+n+(n===1?" lesson":" lessons")+" in "+mods.length+(mods.length===1?" module":" modules")+(price?" · "+esc(price):"")+"</small>")+"</header>"
      +mods.map((m,mi)=>'<details class="lc75-mod"'+(mi===0||mods.length<3?" open":"")+'><summary><b>'+esc(m.f)+"</b><small>"+(access?m.l.filter(x=>done.indexOf(x[1])>=0).length+"/":"")+m.l.length+"</small></summary><ol>"
        +m.l.map(x=>{const v=x[0],i=x[1],ty=TYPE(v),dd=access&&done.indexOf(i)>=0;return'<li><button type="button" class="lc75-les'+(dd?" is-done":"")+(access?"":" is-locked")+'" data-lc75-les="'+esc(id)+'" data-i="'+i+'"><span class="lc75-ic">'+(access?(dd?"✓":ic(TIC[ty])):ic("lock"))+'</span><span class="lc75-lt">'+esc(v.title)+"<small>"+TLB[ty]+"</small></span></button></li>"}).join("")+"</ol></details>").join("")
      +(access?(nextI>=0?'<button type="button" class="btn btn-primary lc75-cont" data-lc75-les="'+esc(id)+'" data-i="'+nextI+'">'+ic("play")+(dn?" Continue":" Start the course")+"</button>":'<p class="lc75-fin">'+ic("trophy")+" Course finished</p>")
        :'<button type="button" class="btn btn-gold lc75-cont" data-lc72="unlock" data-id="'+esc(id)+'">'+ic("lock-open")+" Unlock the course</button>")+"</div>";
  }
  async function enhanceLib(){
    if(route()!=="books")return;
    for(const row of QA(".lc72-row")){
      const right=Q(".lc72-right",row);if(!right||right.__lc75)continue;
      const op=Q('[data-lc70="open"]',right),lk=Q('[data-lc72="unlock"]',right),id=(op||lk||{getAttribute:()=>""}).getAttribute("data-id");if(!id)continue;
      right.__lc75=1;const access=!!op,it=itemOf(id)||{},d=await courseData(id,access);const list=(d&&d.videos)||[];
      if(!list.length)continue;   /* an e-book or a summary without lessons keeps its normal panel */
      const price=it.tokens?it.tokens+" tokens":it.price_cents?"€"+(it.price_cents/100).toFixed(2):"";
      right.innerHTML=schoolHTML(id,it.title||"The course",list,access,price);
    }
    const docs=await docMeta();
    for(const row of QA(".lc72-row")){
      const cov=Q(".lc72-cover",row);if(!cov||cov.__lc75)continue;cov.__lc75=1;const id=String(row.id||"").replace(/^lib-/,""),it=itemOf(id)||{},doc=docs[id];
      const left=Q(".lc72-left",row),right=Q(".lc72-right",row);
      if(left&&!Q(".lc75-side",left))left.insertAdjacentHTML("afterbegin",'<p class="lc75-side">'+(it.kind==="course"?ic("graduation-cap")+" The course":ic("book")+" The book")+"</p>");
      if(right&&!Q(".lc75-side",right)&&it.kind!=="course")right.insertAdjacentHTML("afterbegin",'<p class="lc75-side is-r">'+ic("circle-play")+" Video course</p>");
      if(!(it.has_ebook||it.has_body||doc))continue;
      const info=Q(".lc72-info h3",row);if(info&&!Q(".lc75-readbtn",row))info.insertAdjacentHTML("afterend",'<button type="button" class="btn '+(it.access?"btn-primary":"btn-ghost")+' btn-sm lc75-readbtn" data-lc75-read="'+esc(id)+'">'+ic(it.access?"book-open":"lock")+(it.access?" Read the book":" Unlock the book")+(doc?" · "+doc.pages+(doc.pages===1?" page":" pages"):"")+"</button>");
      cov.setAttribute("role","button");cov.tabIndex=0;cov.setAttribute("data-lc75-read",id);cov.setAttribute("aria-label","Read "+(it.title||"the e-book"));
      cov.insertAdjacentHTML("beforeend",'<span class="lc75-readtag">'+ic(it.access?"book-open":"lock")+(it.access?" Read":" Preview locked")+"</span>");
    }
  }
  let dmC={at:0,d:{}};
  async function docMeta(){return dmC.d}   /* 9.38.3: e-books are PDF files (has_ebook); no written-in-the-app books any more */
  function itemOf(id){let f=null;QA("[data-lc70-shelf]").forEach(h=>{const d=h.__d;if(!f&&d&&d.items)f=d.items.filter(x=>x.id===id)[0]||null});return f}
  async function openLesson(id,i){
    const it=itemOf(id)||{};if(!it.access){try{LC72.unlock(id)}catch(e){}return}
    const d=await courseData(id,true);const list=(d&&d.videos)||[],v=list[i];if(!v)return;const ty=TYPE(v);
    const yt=u=>{try{return LC70.ytId(u)}catch(e){return""}};
    let body="";
    if(ty==="video"){const y=yt(v.url);body=y?'<div class="lc70-player"><iframe title="'+esc(v.title)+'" src="https://www.youtube-nocookie.com/embed/'+y+'?rel=0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>':'<p class="muted">This video link does not work.</p>'}
    else if(ty==="text")body='<div class="lc75-text">'+String(v.text||"").split(/\n+/).filter(x=>x.trim()).map(p=>"<p>"+esc(p)+"</p>").join("")+"</div>";
    else body='<p class="small muted">An opening for your trainer.</p><pre class="lc75-pgn">'+esc(String(v.pgn||"").slice(0,1200))+'</pre><div class="btn-row"><button type="button" class="btn btn-primary" data-lc75-imp>'+ic("chess-board")+" Import into my opening trainer</button></div>";
    const done=doneOf(id).indexOf(i)>=0;
    try{openSheet({title:v.title,noFocus:true,cls:"lc75-sheet",html:'<p class="lc70-kick">'+esc(v.folder||it.title||"")+" · lesson "+(i+1)+" of "+list.length+"</p>"+body
      +'<div class="btn-row lc75-nav">'+(i>0?'<button type="button" class="btn btn-ghost" data-lc75-go-l="'+(i-1)+'">← Previous</button>':"")+'<button type="button" class="btn btn-gold" data-lc75-done>'+(done?"✓ Done":"Mark as done")+(i<list.length-1?" & next →":"")+"</button></div>",
      onMount:s=>{s.el.addEventListener("click",e=>{
        if(e.target.closest("[data-lc75-imp]")){try{LC71.importPgn(v)}catch(x){say("Could not import it.","bad")}return}
        const g=e.target.closest("[data-lc75-go-l]");if(g){s.close();setTimeout(()=>openLesson(id,+g.getAttribute("data-lc75-go-l")),250);return}
        if(e.target.closest("[data-lc75-done]")){setDone(id,i,true);s.close();QA(".lc72-right").forEach(x=>x.__lc75=0);enhanceLib();if(i<list.length-1)setTimeout(()=>openLesson(id,i+1),300);else say("Course finished. Strong work!","good")}
      })}})}catch(e){}
  }
  /* the e-book reader: PDF.js for PDF files, the item's own text otherwise */
  let pdfLib=null;
  function loadPdfJs(){if(pdfLib)return pdfLib;pdfLib=new Promise((res,rej)=>{if(window.pdfjsLib){res(window.pdfjsLib);return}const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";s.crossOrigin="anonymous";
    s.onload=()=>{try{window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";res(window.pdfjsLib)}catch(e){rej(e)}};s.onerror=()=>{pdfLib=null;rej(new Error("pdf.js"))};document.head.appendChild(s)});return pdfLib}
  function paginate(text){const paras=String(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean),pages=[];let cur=[],len=0;
    paras.forEach(p=>{if(len+p.length>1500&&cur.length){pages.push(cur);cur=[];len=0}cur.push(p);len+=p.length});if(cur.length)pages.push(cur);return pages.length?pages:[["(empty)"]]}
  function htmlPages(html){   /* a written book: cut between blocks, a new page at every title and after about 1,800 characters */
    let clean="";try{clean=LC77.clean(html)}catch(e){clean=""}
    const box=document.createElement("div");box.innerHTML=clean;const pages=[];let cur=[],len=0;
    [].slice.call(box.children).forEach(el=>{const n=(el.textContent||"").length;if(cur.length&&(el.tagName==="H1"||len+n>1800)){pages.push(cur.join(""));cur=[];len=0}cur.push(el.outerHTML);len+=n});
    if(cur.length)pages.push(cur.join(""));return pages.length?pages:["<p>(empty)</p>"];
  }
  async function reader(id,opts){
    opts=opts||{};const it=itemOf(id)||{};if(!it.access&&!opts.preview){try{LC72.unlock(id)}catch(e){}return}
    let d={ok:true,ebook_url:"",body:""};
    if(!opts.preview){const r=await rpc("lc70_open",{p_id:id},true);d=r.data||{};if(!d.ok){say(d.error==="sign_in"?"Sign in first.":"This is not in your library yet.","bad");return}
    }else d.html=opts.html||"";
    const url=String(d.ebook_url||""),isPdf=/\.pdf(\?|#|$)/i.test(url)||/\/pdf/i.test(url);
    let ov=Q("#lc75-reader");if(ov)ov.remove();ov=document.createElement("div");ov.id="lc75-reader";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");ov.setAttribute("aria-label",it.title||"E-book");
    ov.innerHTML='<header><button type="button" class="lc75-x" data-r="close" aria-label="Close the reader">✕</button><b>'+(opts.preview?"Preview: ":"")+esc(it.title||"E-book")+'</b><span data-r="pg">…</span><span class="lc75-rt"><button type="button" data-r="zo" aria-label="Smaller">−</button><button type="button" data-r="zi" aria-label="Bigger">+</button>'
      +(url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" download aria-label="Download">'+ic("download")+"</a>":"")+'</span></header><main data-r="page"></main><footer><button type="button" data-r="prev" aria-label="Previous page">←</button><input type="range" min="1" value="1" data-r="slider" aria-label="Page"><button type="button" data-r="next" aria-label="Next page">→</button></footer><p class="lc75-lic">Licensed to your account: please keep the file for yourself.</p>';
    document.body.appendChild(ov);document.body.classList.add("lc75-noscroll");
    const main=Q('[data-r="page"]',ov),lab=Q('[data-r="pg"]',ov),sl=Q('[data-r="slider"]',ov),key="lc75-pg-"+id;
    let n=1,pg=Math.max(1,+rd(key,1)||1),zoom=+rd("lc75-zoom",1)||1,pdf=null,pages=null,hp=null,busy=0;if(opts.preview)pg=1;
    const close=()=>{ov.remove();document.body.classList.remove("lc75-noscroll");document.removeEventListener("keydown",kd)};
    async function show(){
      pg=Math.max(1,Math.min(n,pg));wr(key,pg);lab.textContent="Page "+pg+" of "+n;sl.max=String(n);sl.value=String(pg);
      if(pdf){const run=++busy,page=await pdf.getPage(pg);if(run!==busy)return;const w=Math.min(main.clientWidth-16,900)*zoom,vp0=page.getViewport({scale:1}),sc=w/vp0.width,dpr=Math.min(2,window.devicePixelRatio||1),vp=page.getViewport({scale:sc*dpr});
        const cv=document.createElement("canvas");cv.width=vp.width;cv.height=vp.height;cv.style.width=Math.round(vp.width/dpr)+"px";cv.style.height=Math.round(vp.height/dpr)+"px";await page.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise;if(run!==busy)return;main.innerHTML="";main.appendChild(cv)}
      else if(hp){main.innerHTML='<article class="lc75-tp lc75-doc" style="font-size:'+Math.round(17*zoom)+'px">'+hp[pg-1]+"</article>"}
      else if(pages){main.innerHTML='<article class="lc75-tp" style="font-size:'+Math.round(17*zoom)+'px">'+pages[pg-1].map(p=>"<p>"+esc(p)+"</p>").join("")+"</article>"}
      main.scrollTop=0;
    }
    const kd=e=>{if(e.key==="Escape")close();else if(e.key==="ArrowRight"){pg++;show()}else if(e.key==="ArrowLeft"){pg--;show()}};document.addEventListener("keydown",kd);
    ov.addEventListener("click",e=>{const b=e.target.closest("[data-r]");if(!b)return;const a=b.getAttribute("data-r");
      if(a==="close")close();if(a==="prev"){pg--;show()}if(a==="next"){pg++;show()}if(a==="zi"){zoom=Math.min(2.2,zoom+.15);wr("lc75-zoom",zoom);show()}if(a==="zo"){zoom=Math.max(.6,zoom-.15);wr("lc75-zoom",zoom);show()}});
    sl.addEventListener("change",()=>{pg=+sl.value;show()});
    let sx=null;main.addEventListener("pointerdown",e=>{sx=e.clientX});main.addEventListener("pointerup",e=>{if(sx==null)return;const dx=e.clientX-sx;sx=null;if(Math.abs(dx)>60){pg+=dx<0?1:-1;show()}});
    if(d.html){hp=htmlPages(d.html);n=hp.length;await show();return}
    if(url&&isPdf){main.innerHTML='<p class="lc75-load">Opening the book…</p>';
      try{const lib=await loadPdfJs();pdf=await lib.getDocument({url:url,withCredentials:false}).promise;n=pdf.numPages;await show();return}
      catch(e){pdf=null;main.innerHTML='<div class="lc75-load"><p>This file cannot be shown inside the app (the server that holds it does not allow it).</p><a class="btn btn-primary" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Open the e-book</a></div>';lab.textContent="";if(!d.body)return}}
    if(d.body){pages=paginate(d.body);n=pages.length;await show();return}
    if(url&&!isPdf){main.innerHTML='<div class="lc75-load"><p>This e-book is not a PDF.</p><a class="btn btn-primary" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Open the e-book</a></div>';lab.textContent=""}
  }

  /* ============ 4. Refer a Friend: the 10% link ============ */
  async function referCard(){
    if(route()!=="refer"||!sess())return;const v=Q("#view");if(!v||Q("#lc75-ref",v))return;
    const box=document.createElement("section");box.id="lc75-ref";box.className="panel pad lc75-ref";v.insertAdjacentElement("afterbegin",box);
    const r=await rpc("lc75_my_refcode",{});const d=r.data||{};if(!d.ok){box.remove();return}
    const link=location.origin+"/?ref="+d.code;
    box.innerHTML='<p class="lc75-tag">Your 10% link</p><h2>Your friend gets 10% off. You get 10% off.</h2><p class="small">Your friend gets 10% off their first purchase. When they buy, you get 10% off your next purchase.</p><div class="lc75-link"><code>'+esc(link)+'</code><button type="button" class="btn btn-primary btn-sm" data-lc75="copy" data-u="'+esc(link)+'">Copy</button>'+(navigator.share?'<button type="button" class="btn btn-ghost btn-sm" data-lc75="share" data-u="'+esc(link)+'">Share</button>':"")+'</div><p class="small muted">'+(+d.invited||0)+" joined through your link"+(+d.rewards>0?" · "+d.rewards+" × 10% waiting for your next purchase":"")+". The discount works in the app’s own checkout.</p>";
  }

  /* ============ events and wiring ============ */
  async function onClick(e){
    const t=e.target;if(!t||!t.closest)return;
    const g=t.closest("[data-lc75-go]");if(g){try{const m=Q("#lc49-menu");if(m)m.remove()}catch(x){}return}
    const les=t.closest("[data-lc75-les]");if(les){e.preventDefault();openLesson(les.getAttribute("data-lc75-les"),+les.getAttribute("data-i"));return}
    const rdr=t.closest("[data-lc75-read]");if(rdr){e.preventDefault();reader(rdr.getAttribute("data-lc75-read"));return}
    const b=t.closest("[data-lc75]");if(!b)return;const a=b.getAttribute("data-lc75");
    if(a==="rg"){rg=b.getAttribute("data-r");wr("lc75-range",rg);paintCC();return}
    if(a==="ch"){CC.chan=b.getAttribute("data-c");wr("lc75-chan",CC.chan);renderCC();return}
    if(a==="copy"){const u=b.getAttribute("data-u");try{await navigator.clipboard.writeText(u);say("Copied.","good")}catch(x){window.prompt("Copy the link:",u)}return}
    if(a==="share"){try{await navigator.share({title:"Lanckriet Chess",text:"Train with the MSPC system: 10% off your first purchase with my link.",url:b.getAttribute("data-u")})}catch(x){}return}
    if(a==="csv"){const ta=Q("[data-lc75-csv]");const by={};String(ta&&ta.value||"").split("\n").forEach(l=>{const p=l.split(/[,;\t]/).map(x=>x.trim());if(p.length>=3&&/^\d{4}-\d{2}-\d{2}$/.test(p[0])&&/^\d+$/.test(p[2])){(by[p[0]]=by[p[0]]||{})[p[1].toLowerCase()]=+p[2]}});
      let n=0;for(const day of Object.keys(by)){const r=await rpc("lc75_views_day",{p_day:day,p:by[day]});if(r.data&&r.data.ok)n+=+r.data.saved||0}say(n+" rows imported.",n?"good":"bad");paintCC();return}
  }
  function onChange(e){const i=e.target;if(i&&i.matches&&i.matches("[data-lc75-goal]"))saveGoal(i)}
  async function onKey(e){if((e.key==="Enter"||e.key===" ")&&e.target&&e.target.matches&&e.target.matches("[data-lc75-read]")){e.preventDefault();reader(e.target.getAttribute("data-lc75-read"))}}
  async function onSubmit(e){
    const f=e.target;if(!f||!f.matches)return;
    if(f.matches("[data-lc75-views]")){e.preventDefault();const p={};["tiktok","instagram","youtube","facebook","reddit","x","other"].forEach(c=>{const v=f.elements[c].value;if(v!=="")p[c]=+v});
      const r=await rpc("lc75_views_day",{p_day:f.elements.day.value,p:p});say(r.data&&r.data.ok?"Saved "+r.data.saved+" channels.":"Could not save.",r.data&&r.data.ok?"good":"bad");paintCC();return}
    if(f.matches("[data-lc75-kpi]")){e.preventDefault();const p={};QA("input",f).forEach(i=>{if(i.value!=="")p[i.name]=+i.value});const r=await rpc("lc75_kpi_set",{p:p});say(r.data&&r.data.ok?"Targets saved.":"Could not save.",r.data&&r.data.ok?"good":"bad");paintCC();return}
  }
  function css(){
    if(Q("#lc75-css"))return;const s=document.createElement("style");s.id="lc75-css";
    s.textContent=".lc75-cc{max-width:1200px;margin:0 auto}.lc75-h{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;justify-content:space-between}.lc75-h h1{margin:0}.lc75-h .btn{min-height:44px}.lc75-tag{margin:0;color:#fbbf24;font-weight:800;font-size:12px;letter-spacing:.06em;text-transform:uppercase}"
      +".lc75-rg{display:flex;gap:6px;overflow-x:auto;margin:12px 0}.lc75-r{min-height:44px;padding:0 14px;border-radius:999px;border:1px solid rgba(148,163,184,.3);background:transparent;color:#e2e8f0;font-weight:700;white-space:nowrap;cursor:pointer}.lc75-r.is-on{background:#38bdf8;color:#0f172a;border-color:#38bdf8}.lc75-r.is-life.is-on{background:#fbbf24;border-color:#fbbf24}"
      +".lc75-life{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;padding:14px;border-radius:18px;background:#1e293b;border:1px solid #334155;margin-bottom:12px}.lc75-life.is-all{background:radial-gradient(600px 220px at 0 0,rgba(251,191,36,.2),transparent 60%),#1e293b;border-color:rgba(251,191,36,.6)}.lc75-life div{display:grid}.lc75-life b{font-size:clamp(20px,4vw,30px)}.lc75-life.is-all b{color:#fbbf24}.lc75-life span{font-size:12.5px;color:#cbd5e1}"
      +".lc75-bn{display:grid;gap:4px;padding:12px 14px;border-radius:14px;margin-bottom:12px;border:1px solid}.lc75-bn.is-red{border-color:#ef4444;background:rgba(239,68,68,.1)}.lc75-bn.is-orange{border-color:#fb923c;background:rgba(251,146,60,.1)}.lc75-bn.is-green{border-color:#22c55e;background:rgba(34,197,94,.08)}.lc75-bn span{color:#cbd5e1;font-size:14px}"
      +".lc75-tw{overflow-x:auto;border:1px solid #334155;border-radius:14px;-webkit-overflow-scrolling:touch}.lc75-t{border-collapse:separate;border-spacing:0;min-width:100%;font-size:13px}.lc75-t th,.lc75-t td{padding:10px;border-bottom:1px solid #334155;vertical-align:top;text-align:left;min-width:150px}"
      +".lc75-t thead th{position:sticky;top:0;background:#0f172a;z-index:1;font-size:12px;text-transform:capitalize}.lc75-t tbody th{position:sticky;left:0;background:#0f172a;z-index:2;min-width:180px;max-width:220px}.lc75-t td:nth-child(2),.lc75-t th:nth-child(2){background:#16213a}.lc75-t thead th:first-child{left:0;z-index:3}"
      +".lc75-t tbody th b{display:block}.lc75-t tbody th small{display:block;color:#94a3b8;font-weight:400}.lc75-n{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#38bdf8;color:#0f172a;font-weight:800;font-size:12px;margin-bottom:4px}"
      +".lc75-t td b{font-size:18px;display:block}.lc75-c{display:block;margin-top:3px;padding:2px 6px;border-radius:6px;color:#cbd5e1}.lc75-c i{font-style:normal;color:#94a3b8}.lc75-c.is-red{background:rgba(239,68,68,.18);color:#fecaca}.lc75-c.is-orange{background:rgba(251,146,60,.18);color:#fed7aa}.lc75-c.is-green{background:rgba(34,197,94,.12);color:#bbf7d0}"
      +".lc75-mt{width:100%;border-collapse:collapse;font-size:14px;min-width:560px}.lc75-mt thead th{position:sticky;top:0;background:#0f172a;text-align:left;padding:10px;border-bottom:2px solid #38bdf8;font-size:12px;text-transform:uppercase;letter-spacing:.05em;z-index:1}.lc75-mt thead small{text-transform:none;color:#94a3b8;font-weight:400;letter-spacing:0}"
      +".lc75-mt td,.lc75-mt tbody th{padding:8px 10px;border-bottom:1px solid #334155;text-align:left;vertical-align:middle}.lc75-mt tbody th{font-weight:600}.lc75-id{display:inline-block;min-width:30px;color:#94a3b8;font-variant-numeric:tabular-nums}"
      +".lc75-lv th{background:#16213a;font-size:15px;padding-top:14px!important}.lc75-lv small{display:block;color:#94a3b8;font-weight:400;font-size:12px}.lc75-v{font-size:18px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}"
      +".lc75-g{white-space:nowrap}.lc75-g small{margin-left:4px;color:#94a3b8}.lc75-gp{display:block;margin:2px 0 0!important}.lc75-gi{width:96px;min-height:40px;display:inline-block}.lc75-mt tr.is-orange td,.lc75-mt tr.is-orange th{background:rgba(251,146,60,.1)}.lc75-mt tr.is-red td,.lc75-mt tr.is-red th{background:rgba(239,68,68,.13)}"
      +".lc75-pill{display:inline-block;padding:3px 9px;border-radius:999px;font-size:12px;font-weight:800;white-space:nowrap}.lc75-pill.is-green{background:rgba(34,197,94,.15);color:#86efac}.lc75-pill.is-orange{background:rgba(251,146,60,.2);color:#fdba74}.lc75-pill.is-red{background:rgba(239,68,68,.22);color:#fca5a5}.lc75-ch .lc75-r{text-transform:none}"
      +".lc75-in{margin:12px 0}.lc75-in summary{min-height:44px;display:flex;gap:8px;align-items:center;cursor:pointer;flex-wrap:wrap}.lc75-vf{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin:8px 0}.lc75-vf .field{flex:1 1 120px}.lc75-vf .btn{min-height:44px}"
      +".lc75-top{display:grid;gap:8px;padding:8px 10px;border-bottom:1px solid #334155}.lc75-big{min-height:48px;justify-content:center;font-weight:800}"
      +".lc75-school{flex:1;display:flex;flex-direction:column;gap:8px;padding:14px}.lc75-school h4{margin:2px 0}.lc75-prog{height:8px;border-radius:999px;background:#334155;overflow:hidden}.lc75-prog i{display:block;height:100%;background:linear-gradient(90deg,#38bdf8,#fbbf24)}"
      +".lc75-mod{border:1px solid #334155;border-radius:12px;background:#1e293b}.lc75-mod summary{min-height:44px;display:flex;justify-content:space-between;align-items:center;padding:0 12px;cursor:pointer}.lc75-mod ol{list-style:none;margin:0;padding:0 6px 6px}"
      +".lc75-les{width:100%;min-height:48px;display:flex;gap:10px;align-items:center;text-align:left;padding:6px 8px;border:0;border-top:1px solid #334155;background:transparent;color:inherit;cursor:pointer;border-radius:8px}.lc75-les:hover{background:rgba(56,189,248,.08)}.lc75-les small{display:block;color:#94a3b8}.lc75-les.is-done .lc75-ic{background:#22c55e;color:#0f172a}.lc75-les.is-locked{opacity:.85}"
      +".lc75-ic{flex:0 0 30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#0f172a;color:#38bdf8}.lc75-les.is-locked .lc75-ic{color:#fbbf24}.lc75-cont{min-height:48px}.lc75-fin{color:#4ade80;font-weight:700}"
      +".lc72-cover[data-lc75-read]{cursor:pointer;position:relative}.lc75-readtag{position:absolute;left:6px;bottom:6px;font-size:11px;font-weight:800;padding:3px 8px;border-radius:999px;background:rgba(15,23,42,.9);color:#fbbf24;border:1px solid #fbbf24}"
      +"#lc75-reader{position:fixed;inset:0;z-index:2147482500;background:#0b1222;display:flex;flex-direction:column;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}#lc75-reader header,#lc75-reader footer{display:flex;gap:8px;align-items:center;padding:6px 10px;background:#0f172a;border-bottom:1px solid #334155}#lc75-reader footer{border-top:1px solid #334155;border-bottom:0}"
      +"#lc75-reader header b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#lc75-reader button,#lc75-reader header a{min-width:44px;min-height:44px;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;font-size:18px;display:inline-grid;place-items:center;cursor:pointer;text-decoration:none}#lc75-reader footer input{flex:1}"
      +"#lc75-reader main{flex:1;overflow:auto;display:flex;justify-content:center;padding:8px;touch-action:pan-y}#lc75-reader canvas{background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.5);max-width:none}.lc75-tp{max-width:720px;background:#f8fafc;color:#0f172a;padding:28px 26px;border-radius:8px;line-height:1.65;font-family:'Iowan Old Style','Palatino Linotype',Georgia,serif}"
      +".lc75-side{margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#fbbf24;grid-column:1/-1}.lc75-side.is-r{color:#38bdf8;padding:14px 14px 0}.lc72-right{flex-direction:column}.lc75-readbtn{min-height:44px;margin:6px 0}"
      +".lc75-adm{margin:0 0 16px}.lc75-adm .lc75-cc{max-width:none}.lc75-old{margin:0 0 16px}.lc75-old summary{min-height:44px;display:flex;align-items:center;cursor:pointer}"
      +".lc75-doc h1{font-size:1.9em;line-height:1.15;margin:.2em 0 .5em}.lc75-doc h2{font-size:1.4em;margin:1.2em 0 .4em}.lc75-doc h3{font-size:1.12em;margin:1em 0 .3em}.lc75-doc blockquote{border-left:4px solid #fbbf24;margin:1em 0;padding:.2em 1em;font-style:italic}.lc75-doc hr{border:0;border-top:1px solid #cbd5e1;margin:2em 0}"
      +".lc75-lic{margin:0;padding:4px;text-align:center;font-size:11px;color:#64748b}.lc75-load{text-align:center;padding:30px;display:grid;gap:12px;justify-items:center}body.lc75-noscroll{overflow:hidden}.lc75-pgn{white-space:pre-wrap;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:10px;font-size:13px}.lc75-text p{line-height:1.6}"
      +".lc75-ref{border:1px solid rgba(251,191,36,.6);margin-bottom:12px}.lc75-ref h2{margin:4px 0}.lc75-link{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.lc75-link code{flex:1 1 220px;overflow-wrap:anywhere;padding:10px;border-radius:10px;background:#0f172a;border:1px solid #334155}.lc75-link .btn{min-height:44px}";
    document.head.appendChild(s);
  }
  let deb=0;
  function scan(){menuButtons();enhanceLib();referCard();adminBriefing()}
  function afterRender(){clearTimeout(deb);deb=setTimeout(()=>{try{scan()}catch(e){}},300)}
  function init(){
    css();
    try{if(typeof MOUNT!=="undefined"){MOUNT.command=mountCC;MOUNT.analytics=mountCC;try{DOC_TITLES.command="Funnel Command Center";DOC_TITLES.analytics="Funnel Command Center";ALIASES.dashboard="command";ALIASES.funnel="command"}catch(e){}}}catch(e){}
    try{const lv=LC26.levels,o=lv.minLevel;if(!lv.__lc75){lv.__lc75=1;lv.minLevel=r=>r==="command"?1:o(r)}}catch(e){}
    window.addEventListener("click",onClick,true);document.addEventListener("submit",onSubmit,true);document.addEventListener("keydown",onKey,true);document.addEventListener("change",onChange,true);
    new MutationObserver(()=>{clearTimeout(deb);deb=setTimeout(()=>{try{scan()}catch(e){}},250)}).observe(document.body,{childList:true,subtree:true});
  }
  return{init:init,afterRender:afterRender,paint:paintCC,render:renderCC,metricRows:metricRows,_cc:CC,reader:reader,openLesson:openLesson,schoolHTML:schoolHTML,paginate:paginate,levels:levels,status:status,version:"9.38.3"};
})(); /*@@end lc75*/
