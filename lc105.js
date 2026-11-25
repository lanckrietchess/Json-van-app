/*@@module lc105*/
const LC105=(()=>{
  "use strict";
  /* LC105 (build 9.73.0): "Master one opening". Pick one of the four opening courses and see, in one place, everything that
     opening needs: 1. the opening course itself ("Train now" goes to the most popular line you do not know yet, LC81),
     2. the middlegame lessons that matter for it, each with the reason measured in Kyenzo's own games ("312 of my Caro-Kann
     games reach it at move 15: they have the isolated queen's pawn"), plus his own middlegame positions from that opening,
     3. the endgame lessons and drills, ordered by how often that opening reaches each kind of endgame in his games.
     The data is data/opening-paths.json (tools/opening_paths.py: his ~5,100 games, nothing invented; the lessons themselves are
     unchanged). Page #opening-path; a card "Crucial for your openings" on Theory > Middlegame and Endgame (the player's White
     choice from LC104 plus both Black courses); "Train these endgames" runs the Shuffle Trainer on that opening's endgame drills
     (filter lc105:eg:<course>); "My positions from this opening" opens LC95 with those positions (sessionStorage lc95-open {ids}). */
  const VERSION="9.73.0",URL_="data/opening-paths.json?v="+VERSION,FOCUS="lc105-focus";
  const COURSES=["Vienna & 1.e4","Colle-Koltanowski","Caro-Kann","Semi-Slav"];
  const SHORT={"Vienna & 1.e4":"1.e4 · Vienna","Colle-Koltanowski":"1.d4 · Colle","Caro-Kann":"Caro-Kann","Semi-Slav":"Semi-Slav"};
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.from((r||document).querySelectorAll(s));
  const H=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ic=n=>typeof icon==="function"?icon(n)+" ":"";
  let DATA=null,LOADING=null,cur="",pick="";
  function load(){
    if(DATA)return Promise.resolve(DATA);
    if(!LOADING)LOADING=fetch(URL_,{cache:"no-cache"}).then(r=>r.ok?r.json():null).then(d=>{DATA=d&&Array.isArray(d.courses)?d:{courses:[],titles:{}};return DATA}).catch(()=>(DATA={courses:[],titles:{}}));
    return LOADING;
  }
  const course=name=>(DATA&&DATA.courses||[]).find(c=>c.group===name)||null;
  const title=id=>{const t=DATA&&DATA.titles&&DATA.titles[id];if(t)return t;try{const all=(CONTENT.courses.middlegame||[]).concat(CONTENT.courses.endgame||[]);const x=all.find(l=>l.id===id);return x?x.title:id}catch(e){return id}};
  const lvlOf=id=>{try{const all=(CONTENT.courses.middlegame||[]).concat(CONTENT.courses.endgame||[]);const x=all.find(l=>l.id===id);return x?Levels.of(x):0}catch(e){return 0}};
  /* the player's openings: their White choice (LC104) and both Black courses */
  function mine(){
    let w=["Colle-Koltanowski"];try{if(typeof LC104!=="undefined")w=LC104.groups().filter(g=>COURSES.indexOf(g)>=0)}catch(e){}
    return w.concat(["Caro-Kann","Semi-Slav"]);
  }
  function rowHTML(x,kind){
    const lv=lvlOf(x.id);
    return '<li style="display:grid;gap:2px;padding:8px 0;border-top:1px solid var(--rule)"><button type="button" class="linklike" data-lc105-lesson="'+H(x.id)+'" data-lc105-kind="'+kind+'" style="text-align:left;font-weight:700;background:none;border:0;color:var(--chalk);padding:0;cursor:pointer">'+H(title(x.id))+(lv?' <span class="small muted">· Level '+lv+"</span>":"")+'</button><span class="small muted">'+H(x.why||"")+"</span></li>";
  }
  function pageHTML(name){
    const c=course(name);
    const chips=COURSES.map(g=>'<button type="button" class="btn btn-sm '+(g===name?"btn-primary":"btn-quiet")+'" data-lc105-pick="'+H(g)+'" aria-pressed="'+(g===name)+'">'+H(SHORT[g])+"</button>").join("");
    if(!c)return '<section class="section"><h1>Master one opening</h1><div class="btn-row" style="display:flex;flex-wrap:wrap;gap:6px">'+chips+'</div><p class="muted">Loading the plan…</p></section>';
    const st=(c.mgStructures||[]).slice(0,5).map(s=>H(s.name)+" ("+s.n+")").join(" · ");
    const et=(c.egTypes||[]).slice(0,4).map(s=>H(s.name)+" ("+s.n+")").join(" · ");
    return '<section class="section" data-lc105-page>'+
      '<h1 style="margin-bottom:4px">Master one opening</h1>'+
      '<p class="muted" style="margin-top:0">Learn the opening, then the middlegames and endgames it leads to. Nothing extra: every lesson here comes from what '+H(c.games)+" of my own "+H(name)+" games reached.</p>"+
      '<div class="btn-row" style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 14px">'+chips+"</div>"+
      '<div class="panel" style="padding:12px 14px;margin-bottom:12px"><h2 style="margin:0 0 4px">'+ic("book-open")+"1. The opening</h2>"+
        '<p class="small muted" style="margin:0 0 8px">The lines, most popular first. Train now opens the most popular line you do not know well yet.</p>'+
        '<div class="btn-row" style="display:flex;flex-wrap:wrap;gap:6px"><button type="button" class="btn btn-gold btn-sm" data-lc105-train="'+H(name)+'">'+ic("bolt")+"Train now</button>"+
        '<a class="btn btn-quiet btn-sm" href="#openings" data-lc105-open="'+H(name)+'">Open the course</a></div></div>'+
      '<div class="panel" style="padding:12px 14px;margin-bottom:12px"><h2 style="margin:0 0 4px">'+ic("chess-board")+"2. The middlegames you get</h2>"+
        (st?'<p class="small muted" style="margin:0 0 6px">Structures at move 15 in my games: '+st+".</p>":"")+
        '<ul style="list-style:none;margin:0;padding:0">'+(c.mg||[]).map(x=>rowHTML(x,"mg")).join("")+"</ul>"+
        ((c.mgIds||[]).length?'<div class="btn-row" style="margin-top:8px"><button type="button" class="btn btn-primary btn-sm" data-lc105-pos="mg">'+ic("chess-knight")+"My middlegame positions from this opening ("+c.mgIds.length+")</button></div>":"")+"</div>"+
      '<div class="panel" style="padding:12px 14px"><h2 style="margin:0 0 4px">'+ic("chess-pawn")+"3. The endgames you get</h2>"+
        (et?'<p class="small muted" style="margin:0 0 6px">First endgame of my games: '+et+".</p>":"")+
        '<ul style="list-style:none;margin:0;padding:0">'+(c.eg||[]).map(x=>rowHTML(x,"eg")).join("")+"</ul>"+
        '<div class="btn-row" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">'+((c.egDrills||[]).length?'<button type="button" class="btn btn-primary btn-sm" data-lc105-eg="'+H(name)+'">'+ic("shuffle")+"Train these endgames ("+c.egDrills.length+")</button>":"")+
        ((c.egIds||[]).length?'<button type="button" class="btn btn-quiet btn-sm" data-lc105-pos="eg">My endgame positions ('+c.egIds.length+")</button>":"")+"</div></div></section>";
  }
  function mount(view){
    cur="opening-path";
    if(!pick)pick=mine()[0];
    view.innerHTML=pageHTML(pick);
    load().then(()=>{if(cur==="opening-path"&&Q("#view")===view)view.innerHTML=pageHTML(pick)});
    return()=>{};
  }
  /* "Crucial for your openings" on Theory > Middlegame / Endgame */
  function cardHTML(kind){
    const rows=mine().map(g=>{const c=course(g);if(!c)return"";const top=(c[kind]||[]).filter(x=>!/Every opening/.test(x.why||"")).slice(0,2);if(!top.length)return"";
      return '<li style="padding:6px 0;border-top:1px solid var(--rule)"><b>'+H(SHORT[g])+":</b> "+top.map(x=>'<button type="button" data-lc105-lesson="'+H(x.id)+'" data-lc105-kind="'+kind+'" style="background:none;border:0;padding:0;color:var(--accent);cursor:pointer;text-decoration:underline">'+H(title(x.id))+"</button>").join(", ")+"</li>"}).join("");
    if(!rows)return"";
    return '<div class="panel" style="padding:12px 14px;display:grid;gap:4px"><p style="margin:0;font-weight:700">'+ic("route")+"Crucial for your openings</p>"+
      '<p class="small muted" style="margin:0">If you play these openings, you meet these '+(kind==="mg"?"middlegames":"endgames")+" most (measured in my own games).</p>"+
      '<ul style="list-style:none;margin:0;padding:0">'+rows+'</ul><a class="small" href="#opening-path">See the full plan per opening →</a></div>';
  }
  function paintCard(route){
    const view=Q("#view");if(!view)return;
    const kind=route==="middlegame"?"mg":route==="endgame"?"eg":null;if(!kind)return;
    let box=Q("[data-lc105-card]",view);
    const html=cardHTML(kind);if(!html){if(box)box.remove();return}
    if(!box){box=document.createElement("section");box.className="section";box.setAttribute("data-lc105-card","");box.style.marginBottom="12px";
      const after=Q('#theory-root [id^="metrics-"]',view)||Q(".lc56-instant-wrap",view);
      if(after&&after.parentNode)after.parentNode.insertBefore(box,after.nextSibling);else view.appendChild(box)}
    box.innerHTML=html;
  }
  /* after a jump to a lesson: open its level tab and put it in view */
  async function focusLesson(){
    let f=null;try{f=JSON.parse(sessionStorage.getItem(FOCUS)||"null")}catch(e){f=null}
    if(!f||!f.title)return;
    try{sessionStorage.removeItem(FOCUS)}catch(e){}
    const find=()=>QA("#view button, #view a, #view h3, #view h4, #view .card, #view li").filter(el=>(el.textContent||"").trim().indexOf(f.title)===0)[0];
    for(let i=0;i<25;i++){
      let el=find();
      if(!el&&i===2&&f.lvl){const t=Q('#view [data-eg-tab="'+f.lvl+'"], #view [data-mg-tab="'+f.lvl+'"], #view [data-tab="'+f.lvl+'"]');if(t)t.click()}
      if(el){el.scrollIntoView({block:"center"});el.style.outline="2px solid var(--accent)";el.style.outlineOffset="3px";setTimeout(()=>{el.style.outline=""},4000);return}
      await new Promise(r=>setTimeout(r,160));
    }
    try{toast("Open Level "+(f.lvl||"")+" of the course: "+f.title)}catch(e){}
  }
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    const p=t.closest("[data-lc105-pick]");if(p){pick=p.getAttribute("data-lc105-pick");const v=Q("#view");if(v&&cur==="opening-path")v.innerHTML=pageHTML(pick);return}
    const tr=t.closest("[data-lc105-train]");if(tr){try{LC81.train.run(tr.getAttribute("data-lc105-train"))}catch(x){location.hash="#openings"}return}
    const op=t.closest("[data-lc105-open]");if(op){try{App.ui.op=Object.assign({},App.ui.op||{},{tab:op.getAttribute("data-lc105-open")})}catch(x){}return}
    const ls=t.closest("[data-lc105-lesson]");
    if(ls){e.preventDefault();const id=ls.getAttribute("data-lc105-lesson"),kind=ls.getAttribute("data-lc105-kind");
      try{sessionStorage.setItem(FOCUS,JSON.stringify({id:id,title:title(id),lvl:lvlOf(id)}))}catch(x){}
      const to=kind==="eg"?"#endgame":"#middlegame";if(location.hash===to)focusLesson();else location.hash=to;return}
    const eg=t.closest("[data-lc105-eg]");
    if(eg){const g=eg.getAttribute("data-lc105-eg");try{App.settings.shuffle=Object.assign({},App.settings.shuffle||{},{scope:"endgame",side:"both",filter:"lc105:eg:"+g});App.ui.shuffleMod="endgame";App.save()}catch(x){}location.hash="#shuffle";return}
    const ps=t.closest("[data-lc105-pos]");
    if(ps){const c=course(pick);if(!c)return;const ids=(ps.getAttribute("data-lc105-pos")==="eg"?c.egIds:c.mgIds)||[];
      const ph=ps.getAttribute("data-lc105-pos")==="eg"?"endgame":"middlegame";
      try{sessionStorage.setItem("lc95-open",JSON.stringify({ids:ids.slice(0,40),label:"My "+ph+" positions from the "+pick}))}catch(x){}location.hash="#think";return}
  }
  /* the Shuffle Trainer asks this for its filter "lc105:eg:<course>" */
  function filter(f,open){
    const m=/^lc105:eg:(.+)$/.exec(String(f||""));if(!m)return null;
    const c=course(m[1]);if(!c)return open;
    const ids={};(c.egDrills||[]).forEach(i=>{ids[i]=1});
    const out=open.filter(x=>ids[x.id]);return out.length?out:open;
  }
  function afterRender(route){
    cur=String(route||"");
    if(cur==="middlegame"||cur==="endgame"){load().then(()=>{if(cur===route){paintCard(cur);focusLesson()}})}
  }
  function init(){
    try{
      document.addEventListener("click",onClick);
      load();
      let t=0;new MutationObserver(()=>{if(t||(cur!=="middlegame"&&cur!=="endgame"))return;t=setTimeout(()=>{t=0;const v=Q("#view");if(v&&DATA&&!Q("[data-lc105-card]",v))paintCard(cur)},350)}).observe(document.body,{childList:true,subtree:true});
    }catch(e){console.error("lc105",e)}
  }
  return{init:init,afterRender:afterRender,mount:mount,filter:filter,load:load,mine:mine,version:VERSION,_t:{pageHTML:pageHTML,cardHTML:cardHTML,course:course}};
})(); /*@@end lc105*/
