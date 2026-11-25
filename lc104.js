/*@@module lc104*/
const LC104=(()=>{
  "use strict";
  /* LC104 (build 9.72.0): the player's White repertoire, and a Ranked Openings rank that only tests what they play.
     The hub now has two White courses: the Colle-Koltanowski (1.d4) and Vienna & 1.e4 (Kyenzo's own 1.e4 repertoire, the one he took
     to 2105). The player picks "1.d4", "1.e4" or "Both" in a card at the top of Theory > Openings and of Ranked. The Shuffle Trainer
     and Ranked (shufflePool) then only draw White lines from the chosen course(s), so a 1.e4 player is never ranked down for not
     knowing the Colle, and the other way round. Black lines (Caro-Kann and Semi-Slav) always count: every player answers 1.e4 and
     1.d4 with 1...c6.
     Default until the player picks: the profile's "What do you play with White?" answer (1.e4 -> e4), otherwise 1.d4, which is what
     Ranked tested before 9.72.0, so nobody's rank changes by itself. No pop-up (LC88: one guide at a time): the card itself asks. */
  const VERSION="9.72.0",KEY="lc104-rep";
  const WHITE={d4:["Colle-Koltanowski","Colle Model Games"],e4:["Vienna & 1.e4"]};
  const LABEL={d4:"1.d4 · Colle-Koltanowski",e4:"1.e4 · Vienna",both:"Both"};
  const LONG={d4:"the Colle-Koltanowski (1.d4)",e4:"Vienna & 1.e4",both:"both White courses"};
  const ROUTES={openings:1,ranked:1};
  const Q=(s,r)=>(r||document).querySelector(s);
  const ok=v=>v==="d4"||v==="e4"||v==="both";
  const H=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function saved(){
    try{const s=App.settings&&App.settings.repWhite;if(ok(s))return s}catch(e){}
    try{const v=localStorage.getItem(KEY);if(ok(v))return v}catch(e){}
    return "";
  }
  function fallback(){try{const w=App.profile&&App.profile.rep&&App.profile.rep.w;if(w==="e4")return"e4"}catch(e){}return"d4"}
  const choice=()=>saved()||fallback();
  const picked=()=>!!saved();
  function set(v){
    if(!ok(v))return false;
    try{App.settings.repWhite=v;App.save()}catch(e){}
    try{localStorage.setItem(KEY,v)}catch(e){}
    return true;
  }
  const allWhite=()=>WHITE.d4.concat(WHITE.e4);
  function groups(v){v=ok(v)?v:choice();return v==="both"?allWhite():WHITE[v].slice()}
  /* shufflePool asks this for every course line: false = leave it out of the Shuffle Trainer and Ranked. */
  function inPool(o){
    if(!o||o.side==="b")return true;
    const g=String(o.group||"");
    if(allWhite().indexOf(g)<0)return true;
    return groups().indexOf(g)>=0;
  }
  function cardHTML(route){
    const v=choice(),p=picked();
    const btn=k=>'<button type="button" class="btn btn-sm '+(v===k?"btn-primary":"btn-quiet")+'" data-lc104-pick="'+k+'" aria-pressed="'+(v===k)+'">'+H(LABEL[k])+"</button>";
    const lead=route==="ranked"?"Your Openings rank only tests the White repertoire you play.":"Pick the White repertoire you play. Ranked and the Shuffle Trainer test only that one.";
    return '<div class="panel" style="display:grid;gap:8px;padding:12px 14px;border-color:'+(p?"var(--rule)":"var(--accent-line)")+'">'+
      '<p style="margin:0;font-weight:700">'+(typeof icon==="function"?icon("chess-pawn")+" ":"")+"Your White repertoire</p>"+
      '<p class="small muted" style="margin:0">'+H(lead)+" Your Black repertoire (Caro-Kann and Semi-Slav) always counts.</p>"+
      '<div class="btn-row" style="display:flex;flex-wrap:wrap;gap:6px">'+btn("d4")+btn("e4")+btn("both")+"</div>"+
      '<p class="small muted" style="margin:0" data-lc104-note>'+(p?"Now testing: "+H(LONG[v])+".":"Not picked yet, so Ranked tests "+H(LONG[v])+". One tap changes it.")+"</p></div>";
  }
  function paint(route){
    const view=Q("#view");if(!view||!ROUTES[route])return;
    let box=Q("[data-lc104]",view);
    if(!box){
      box=document.createElement("section");box.className="section";box.setAttribute("data-lc104","");box.style.marginBottom="12px";
      /* Theory > Openings: under Instant Play and the stats (the board-first layout of LC56 keeps Instant Play near the top);
         Ranked: under the page title */
      const after=route==="openings"?(Q('#theory-root [id^="metrics-"]',view)||Q(".lc56-instant",view)):null;
      const h=Q("h1",view),anchor=after||(h?h.closest("header,section,div")||h:null);
      if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(box,anchor.nextSibling);
      else view.insertBefore(box,view.firstChild);
    }
    box.innerHTML=cardHTML(route);
  }
  let cur="";
  function afterRender(route){cur=String(route||"");if(ROUTES[cur])try{paint(cur)}catch(e){console.error("lc104",e)}}
  function onClick(e){
    const b=e.target&&e.target.closest&&e.target.closest("[data-lc104-pick]");if(!b)return;
    const v=b.getAttribute("data-lc104-pick");if(!set(v))return;
    paint(cur);
    try{toast("Ranked now tests "+LONG[v]+" with White.","good")}catch(e){}
  }
  function init(){
    try{
      document.addEventListener("click",onClick);
      /* the Ranked page renders part of itself later: put the card back when it was wiped (a throttle, see LC100) */
      let t=0;new MutationObserver(()=>{if(t||!ROUTES[cur])return;t=setTimeout(()=>{t=0;const v=Q("#view");if(v&&!Q("[data-lc104]",v))paint(cur)},300)}).observe(document.body,{childList:true,subtree:true});
    }catch(e){console.error("lc104",e)}
  }
  return{init:init,afterRender:afterRender,version:VERSION,choice:choice,picked:picked,set:set,groups:groups,inPool:inPool,
    _t:{WHITE:WHITE,cardHTML:cardHTML,fallback:fallback}};
})(); /*@@end lc104*/
