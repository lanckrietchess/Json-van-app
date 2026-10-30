/*@@module lc41*/
const LC41=(()=>{
  "use strict";
  /* LC41: the upgrade page answers "What do I get with Pro / VIP?" with fixed text and the questions people ask before they join. No bot, no AI cost. */
  const Q=(s,r)=>(r||document).querySelector(s);
  const PRO=[
    "The whole library: every repertoire (Colle-Koltanowski, Caro-Kann, Semi-Slav), the Middlegame Foundations and Masterclass, the Opening Vault and the endgames",
    "The Blunder Bootcamp and the MSPC training engine",
    "The full Trim report on your own games",
    "The 24/7 AI coach",
    "10 tokens a day (about 300 a month). They refresh every day: use them or lose them",
    "No ads"];
  const VIP=[
    "Everything in Pro",
    "Your tokens upfront: 500 for every paid month, or 7,000 at once for every paid year. They do not expire",
    "The Lanckriet Chess Student title and a blue profile border, for as long as your subscription is active",
    "Priority in live streams and the community"];
  const FAQ=[
    ["Which one should I pick, Pro or VIP?","Pro is the right start for most players: the whole library, the coach and 10 tokens a day cover regular training. Pick VIP if you want to analyse many games in one go, for example after a tournament weekend, because your tokens arrive upfront and never expire, and you want the Student title and the priority."],
    ["What is a token?","A token pays for a deep game analysis or a question to the AI coach. Free gives you 1 a day (3 a day in your first week), Pro gives you 10 a day, and you can add more any time with token packs, starting at 3 tokens for €1."],
    ["I am not sure this works for my level.","The app is built for players from beginner to 2000 ELO, and every course has levels, so you start where you are. The method comes from Kyenzo, who went from 355 to 2105 Rapid on Chess.com in 2 years and 10 months. One of his students gained 630 rating points in 2 months."],
    ["Can I try it before I pay?","Yes. The Free plan includes the MSPC drills, a first game review and level 1 of every course. Use them, see what the app finds in your own games, then decide."],
    ["How is this different from videos and puzzle apps?","Videos show you how a strong player thinks. Puzzle apps give you positions. This app looks at your own games, shows the exact move where you lose, and trains the habit that stops it: MSPC (Move, Specifics, Priorities, Calculation)."],
    ["Is it worth it next to a private coach?","A private coach costs around €80 an hour and is not there at 2 a.m. after a painful loss. Pro is €39 a month, works 24/7 and works on your own games. It does not replace a coach who watches you live: it gives you guided practice every single day."],
    ["Can I cancel?","Yes, any time, with the subscription link in your membership. Your plan stays active until the end of the period you paid for."],
    ["Does the price go up later?","A yearly launch price stays the same for as long as your subscription stays active. If you cancel, the launch price ends. Monthly plans have no launch discount."],
    ["How do I get access after I pay?","Sign in with the same email you used at checkout. Your membership switches on by itself, and VIP tokens appear in your wallet when you sign in."],
    ["Can I give it to a friend?","Yes: one year of Pro as a gift, €399, paid once with no renewal. Your friend signs in with their email and Pro switches on."],
    ["My question is not here.","Send a message to @lanckrietchess on Instagram. Kyenzo reads them himself."]];
  const E=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const li=a=>"<ul>"+a.map(x=>"<li>"+E(x)+"</li>").join("")+"</ul>";
  function css(){
    if(Q("#lc41-css"))return;const s=document.createElement("style");s.id="lc41-css";
    s.textContent='.lc41-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin:12px 0}'
    +'.lc41-card{border:1px solid rgba(148,163,184,.25);border-radius:14px;padding:14px;background:rgba(15,23,42,.35)}.lc41-card.vip{border-color:rgba(251,191,36,.55)}'
    +'.lc41-card h4{margin:0 0 4px}.lc41-card .lc41-price{margin:0 0 8px;font-size:.9rem;opacity:.85}.lc41-card ul{margin:0;padding-left:1.1rem;display:grid;gap:6px}'
    +'.lc41-note{font-size:.85rem;opacity:.8;margin:6px 0 14px}.lc41 details{border-top:1px solid rgba(148,163,184,.2)}.lc41 summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:700}'
    +'.lc41 details p{margin:0 0 12px}.lc41 .btn-row{margin-top:14px}';
    document.head.appendChild(s);
  }
  function body(inSheet){
    return'<div class="lc41"><h3>What do I get with Pro and VIP?</h3>'
      +'<div class="lc41-grid"><article class="lc41-card"><h4>Pro</h4><p class="lc41-price">€39 a month or €399 a year</p>'+li(PRO)+'</article>'
      +'<article class="lc41-card vip"><h4>VIP</h4><p class="lc41-price">€59 a month or €599 a year</p>'+li(VIP)+'</article></div>'
      +'<p class="lc41-note">Yearly launch prices are lower while places last. The plan cards show today’s price, and it stays the same for as long as your subscription stays active.</p>'
      +'<h3>Questions people ask before they join</h3>'
      +FAQ.map(x=>"<details><summary>"+E(x[0])+"</summary><p>"+E(x[1])+"</p></details>").join("")
      +'<div class="btn-row">'+(inSheet?'<a class="btn btn-primary" href="#upgrades" data-close>See the plans</a>':'<button type="button" class="btn btn-primary" data-scroll="up-paths">See the plans</button>')+'</div></div>';
  }
  function html(){css();return'<section class="section" id="up-bot"><div class="panel pad">'+body(false)+'</div></section>'}
  function sheet(){css();if(typeof openSheet==="function")openSheet({title:"Pro and VIP",cls:"lc41-sheet",noFocus:true,html:body(true)})}
  return{html:html,sheet:sheet,_t:{FAQ:FAQ}};
})();
/*@@end lc41*/
