/*@@module lc66*/ const LC66=(()=>{
  "use strict";
  /* LC66 (build 9.33.0): Creator Studio in 4 tabs, and the Trim jump with the Free / Pro coach card.
     A. Studio tabs (no Studio code is moved): 1 Script & Ideas, 2 Scene Builder, 3 Record, 4 Edit & Export, plus "Free layout" (the old panel arrangement).
        A tab shows the right panels in a fixed arrangement through CSS inside the Studio's shadow root (nothing is saved to the member's own layout),
        and opens the panels that tab needs. On a phone (compact mode) the tab just opens the matching panel. Tab 2 has a watermark size slider
        (Store lc66-wm-scale, read by wmGeom; the Free bar can grow but never shrink below its normal size).
     B. Trim: when a review finishes, the page jumps to the EARLIEST serious error and Coach Lanckriet shows it: a) the thinking error b) the Alarm Signal c) the Working Point
        and the order for the next games. The Free coach is hard-coded and to the point (the MSPC framework is a button); the Pro coach adds "Ask Coach Lanckriet", which opens the
        live AI chat that already exists for paid members. (The opening deviation is NOT detected: the jump goes to the first error.) */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0];

  /* ---------- A. Studio tabs ---------- */
  const TABS=[
    {id:"t1",label:"1 Script & Ideas",open:["script","library"]},
    {id:"t2",label:"2 Scene Builder",open:["stage","camera","board"]},
    {id:"t3",label:"3 Record",open:["stage","script"]},
    {id:"t4",label:"4 Edit & Export",open:["takes"]},
    {id:"free",label:"Free layout",open:[]}];
  const TOP="46px",H="calc(100% - 52px)";
  const R={ /* panel rectangles per tab: left, width, top, height */
    t1:{script:["1%","57%",TOP,H],library:["60%","39%",TOP,H]},
    t2:{stage:["1%","57%",TOP,H],camera:["60%","39%",TOP,"calc(50% - 28px)"],board:["60%","39%","calc(50% + 24px)","calc(50% - 30px)"]},
    t3:{stage:["1%","72%",TOP,H],script:["75%","24%",TOP,H]},
    t4:{takes:["1%","98%",TOP,H]}};
  function tabCss(){
    let c=".lc66-tabs{position:absolute;top:6px;left:6px;right:6px;z-index:60;display:flex;gap:6px;flex-wrap:wrap;align-items:center}.lc66-tab{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(7,9,12,.9);color:#e5e7eb;font:700 13px/1 inherit;cursor:pointer}.lc66-tab[aria-selected=true]{background:#00E5FF;color:#001014;border-color:#00E5FF}.lc66-wm{display:inline-flex;gap:6px;align-items:center;color:#cbd5e1;font-size:12px;margin-left:8px}.lc66-wm input{width:120px}";
    TABS.forEach(t=>{
      if(!R[t.id])return;
      c+="#lcs.lc66-"+t.id+":not(.compact) .panel{display:none!important}";
      Object.keys(R[t.id]).forEach(p=>{const r=R[t.id][p];
        c+="#lcs.lc66-"+t.id+":not(.compact) .panel[data-id=\""+p+"\"]{display:flex!important;flex-direction:column;left:"+r[0]+"!important;width:"+r[1]+"!important;top:"+r[2]+"!important;height:"+r[3]+"!important}"});
    });
    return c;
  }
  function studioRoot(){
    const v=Q("#view");
    const host=((v?[v].concat(QA("*",v).slice(0,40)):[]).concat([].slice.call(document.body.children))).filter(e=>e.shadowRoot&&e.shadowRoot.querySelector("#lcs"))[0];
    return host?host.shadowRoot:null;
  }
  function studioApi(){try{return window.LanckrietStudio||null}catch(e){return null}}
  function setTab(sr,id){
    const t=TABS.filter(x=>x.id===id)[0]||TABS[0],lcs=Q("#lcs",sr);if(!lcs)return;
    TABS.forEach(x=>lcs.classList.remove("lc66-"+x.id));
    if(R[t.id])lcs.classList.add("lc66-"+t.id);
    QA(".lc66-tab",sr).forEach(b=>b.setAttribute("aria-selected",String(b.getAttribute("data-tab")===t.id)));
    const wm=Q(".lc66-wm",sr);if(wm)wm.hidden=t.id!=="t2";
    wr("lc66-tab",t.id);
    const api=studioApi(),L=api&&api._t&&api._t.Layout;
    try{
      if(L&&!L.compact)t.open.forEach(p=>{if(!L.isOpen(p))L.setOpen(p,true)});
      else if(L&&L.compact&&t.open[0]){const b=Q('.dock-btn[data-panel="'+t.open[0]+'"]',sr);if(b&&b.getAttribute("aria-pressed")!=="true")b.click()}
    }catch(e){}
    try{window.dispatchEvent(new Event("resize"))}catch(e){}
  }
  function inject(){
    const sr=studioRoot();if(!sr)return;
    const canvas=Q("#canvas",sr)||Q("main.canvas",sr);if(!canvas||Q(".lc66-tabs",sr))return;
    if(!Q("#lc66-css",sr)){const st=document.createElement("style");st.id="lc66-css";st.textContent=tabCss();sr.appendChild(st)}
    const bar=document.createElement("div");bar.className="lc66-tabs";bar.setAttribute("role","tablist");
    let free=false;try{free=studioApi()._t.Tier.id()==="free"}catch(e){}
    bar.innerHTML=TABS.map(t=>'<button type="button" role="tab" class="lc66-tab" data-tab="'+t.id+'" aria-selected="false">'+esc(t.label)+'</button>').join("")
      +'<label class="lc66-wm" hidden>Watermark size <input type="range" min="'+(free?100:60)+'" max="180" value="'+Math.round(100*(+rd("lc66-wm-scale",1)||1))+'" aria-label="Watermark size"></label>';
    canvas.appendChild(bar);
    bar.addEventListener("click",e=>{const b=e.target.closest(".lc66-tab");if(b)setTab(sr,b.getAttribute("data-tab"))});
    bar.addEventListener("input",e=>{
      const r=e.target.closest("input[type=range]");if(!r)return;
      wr("lc66-wm-scale",Math.max(.6,Math.min(1.8,(+r.value||100)/100)));
      try{const B=studioApi().board;if(B&&B.onChange)B.onChange()}catch(x){}
    });
    setTab(sr,rd("lc66-tab","t1"));
  }

  /* ---------- B. Trim: jump to the first error, coach card ---------- */
  let lastKey="";
  function jumpFirst(){
    if(route()!=="trim")return;
    const btns=QA('#an-report [data-act="goto"]');if(!btns.length)return;
    const ids=btns.map(b=>+b.getAttribute("data-i")).filter(n=>Number.isFinite(n));if(!ids.length)return;
    const key=ids.join(",");if(key===lastKey)return;lastKey=key;
    let target=btns.filter(b=>+b.getAttribute("data-i")===Math.min.apply(null,ids))[0];
    /* an opening deviation of the student earlier than the first error: jump there (the moves list buttons carry the move index) */
    try{
      /* the list has a "Start" button (data-i 0), then one button per move (data-i k+1 = after move k); go(i) shows the position BEFORE move i, like the error buttons do */
      const all=QA("#an-moves [data-i]").filter(b=>+b.getAttribute("data-i")>=0),mvs=all.filter(b=>+b.getAttribute("data-i")>=1).sort((a,b)=>+a.getAttribute("data-i")-+b.getAttribute("data-i"));
      const sans=mvs.map(b=>b.textContent.replace(/[+#!?]/g,"").replace(/^\d+\.+/,"").trim()),pr=QA("[data-side][aria-pressed=true]").filter(b=>b.closest("#an-side"))[0];
      const user=pr&&pr.getAttribute("data-side")==="b"?"b":"w",dv=deviation(sans,user);
      if(dv&&dv.mine&&dv.ply<Math.min.apply(null,ids)){const b=all.filter(x=>+x.getAttribute("data-i")===dv.ply)[0];if(b)target=b}
    }catch(e){}
    setTimeout(()=>{try{target.click()}catch(e){}},250);
  }
  function isPro(){try{return App.rank()>=2}catch(e){return false}}
  /* the first move where the student's game left a repertoire line (the longest line that matches the game for at least 4 plies) */
  function deviation(sans,user){
    try{
      const g=(sans||[]).map(x=>cleanSan(x));let best=null;
      (CONTENT.openings||[]).forEach(l=>{
        if(!l||!l.pgn)return;const t=pgnTokens(l.pgn).map(cleanSan);let n=0;
        while(n<t.length&&n<g.length&&t[n]===g[n])n++;
        if(!best||n>best.n)best={n:n,line:l,t:t};
      });
      if(!best||best.n<4||best.n>=best.t.length||best.n>=g.length)return null;
      const mine=(best.n%2===0?"w":"b")===(user==="b"?"b":"w");
      return{ply:best.n,mine:mine,line:best.line,played:sans[best.n],expected:best.t[best.n],no:Math.floor(best.n/2)+1};
    }catch(e){return null}
  }
  /* every serious error of the student's own colour that Trim shows is kept as a case study (40 at most, newest first) */
  function saveCase(fen,it,user,moves){
    if(!fen||!it||!it.best||!(it.cls==="blunder"||it.cls==="mistake"))return;
    if(it.color!==(user==="b"?"b":"w"))return;
    const list=rd("lc66-cases",[])||[];if(list.some(c=>c.fen===fen))return;
    list.unshift({fen:fen,san:it.san,best:it.best,bestSan:it.bestSan||"",color:it.color,k:it.k||"S",no:it.num||0,text:String(it.text||"").slice(0,200),ts:Date.now(),solved:0,seen:0});
    wr("lc66-cases",list.slice(0,40));
  }
  const DK="lc66-dev";
  function flag(id){const m=rd(DK,{})||{};m[id]=Date.now();wr(DK,m)}
  function flagged(id){
    try{const m=rd(DK,{})||{},t=+m[id];if(!t)return false;const pr=(App.progress&&App.progress[id])||{};return!(+pr.last>t&&+pr.best>=.8)}catch(e){return false}
  }
  function onGoto(fen,it,user,moves){
    try{
      const host=Q(".board-shell",Q("#view"))||Q(".board-shell");if(!host||!fen||!it)return;
      let c=Q("#lc66-coach");if(!c){c=document.createElement("section");c.id="lc66-coach";c.className="panel pad lc66-card";host.insertAdjacentElement("afterend",c)}
      const color=it.color==="b"?"b":"w";
      const tail=LC61.tail({fen:fen,color:color,k:it.k||"S",why:String(it.text||""),ps:it.san});
      try{saveCase(fen,it,user,moves)}catch(e){}
      let dev=null;try{dev=deviation((moves||[]).map(m=>m.san),user)}catch(e){}
      let devHTML="";
      if(dev&&dev.mine){try{flag(dev.line.id)}catch(e){}devHTML='<p class="lc66-dev"><b>★ Opening deviation.</b> In “'+esc(dev.line.title||"your repertoire")+'” you played '+esc(dev.played)+' at move '+dev.no+' where the line continues with '+esc(dev.expected)+'. This line now comes first in “Train My Repertoire”.</p>'}
      else if(dev){devHTML='<p class="lc66-dev"><b>Your opponent left the book</b> at move '+dev.no+' with '+esc(dev.played)+' (the line has '+esc(dev.expected)+'). Think about what that move changed.</p>'}
      let pic="";try{pic=LC61.coachImg(["thinking","focused","calm","happy"],44)}catch(e){}
      c.innerHTML='<div class="lc66-head">'+pic+'<b>Coach Lanckriet · '+(isPro()?'Pro coach':'Free coach')+'</b></div>'+devHTML+tail
        +(isPro()?'<div class="btn-row"><button type="button" class="btn btn-primary btn-sm" data-lc66="ask">Ask Coach Lanckriet about this game</button></div>'
                 :'<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-lc66="mspc">Show the MSPC framework</button></div><div data-lc66-mspc hidden><p><b>M</b> Move: what did their last move change? <b>S</b> Specifics: structure and features, then a plan. <b>P</b> Priorities: checks, captures, attacks. <b>C</b> Calculation: verify the line.</p></div>');
    }catch(e){}
  }
  function onClick(e){
    const b=e.target.closest&&e.target.closest("[data-lc66]");if(!b)return;
    const a=b.getAttribute("data-lc66");
    if(a==="mspc"){e.preventDefault();const d=Q("[data-lc66-mspc]");if(d)d.hidden=!d.hidden}
    else if(a==="ask"){e.preventDefault();const t=Q('[data-act="ask-leaks"]');if(t)t.click()}
  }
  function paintStars(){
    if(route()!=="openings")return;
    const trees={};
    try{const m=rd(DK,{})||{};(CONTENT.openings||[]).forEach(o=>{if(o&&o.id&&m[o.id]&&flagged(o.id)){trees[o.tree||o.id]=1}})}catch(e){}
    const rows=QA("[data-lv-card]").map(c=>({el:c,key:c.getAttribute("data-lv-card")})).concat(QA("[data-line]").map(r=>({el:r,key:r.getAttribute("data-line"),line:true})));
    rows.forEach(x=>{
      const want=x.line?flagged(x.key):!!trees[x.key],has=!!Q(".lc66-star",x.el);
      if(want&&!has){const b=document.createElement("span");b.className="lc66-star";b.title="You left a line of this chapter in a game: it is first in Train My Repertoire";b.setAttribute("aria-label","Deviation: train this chapter");b.textContent="★";x.el.insertBefore(b,x.el.firstChild)}
      else if(!want&&has)Q(".lc66-star",x.el).remove();
    });
  }
  function css(){
    if(Q("#lc66-page-css"))return;
    const s=document.createElement("style");s.id="lc66-page-css";
    s.textContent=".lc66-card{margin-top:10px;border:1px solid #38bdf8}.lc66-head{display:flex;gap:10px;align-items:center;margin-bottom:6px}.lc66-star{color:#fbbf24;font-weight:900;margin-right:6px}.lc66-dev{padding:8px 10px;border-radius:10px;background:#0f172a;border:1px solid #fbbf24}";document.head.appendChild(s);
  }
  let timer=0;
  function afterRender(){clearTimeout(timer);timer=setTimeout(()=>{try{inject()}catch(e){}try{jumpFirst()}catch(e){}try{paintStars()}catch(e){}},500)}
  function init(){
    css();document.addEventListener("click",onClick,true);
    let deb=0;new MutationObserver(()=>{clearTimeout(deb);deb=setTimeout(()=>{try{if(route()==="trim")jumpFirst();else{inject();paintStars()}}catch(e){}},300)}).observe(document.body,{childList:true,subtree:true});
  }
  return{init:init,afterRender:afterRender,onGoto:onGoto,deviation:deviation,saveCase:saveCase,flagged:flagged,flag:flag,setTab:setTab,TABS:TABS,tabCss:tabCss,version:"9.33.0"};
})(); /*@@end lc66*/
