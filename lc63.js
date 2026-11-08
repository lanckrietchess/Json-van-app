/*@@module lc63*/ const LC63=(()=>{
  "use strict";
  /* LC63 (build 9.33.0): the two sparring modes on the bot page (#bot) and their token price.
     a) "Spot My Weaknesses": a normal game at the chosen level, 1 token. Afterwards Trim sharpens your Alarm Signals and Working Points.
     b) "Be My Sparring Partner", 1 token: reads your most urgent Working Point and the Alarm Signal that belongs to it. The bot plays a solid game
        with NO random slips until that alarm is on the board (LC61.detect). Then, once, it plays its second-best move (a subtle slip) to see
        whether you punish it. The bot's move choice is patched in botTurn (LC63.sparTurn / LC63.used).
     The token is taken on the device (Credits.spend, never in admin mode); the server is not asked. */
  const Q=(s,r)=>(r||document).querySelector(s);
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0];
  const COST=1;
  let mode="plain",target=null,errAt=0,fromPanel=false;

  function topAlarm(){
    let p=null;try{p=Framework.ranked()[0]}catch(e){}
    const A=LC61.ALARM;let id="";
    try{const map=Store.get("lc61-al",{})||{};if(p&&map[p.id]&&A[map[p.id]])id=map[p.id]}catch(e){}
    if(!id&&p){id=Object.keys(A).filter(k=>k!=="loose"&&A[k].letter===p.cat)[0]||""}
    if(!id)id="tension";
    return{id:id,label:A[id].label,point:p?String(p.text||""):""};
  }
  /* called by the bot before every bot move: {solid:true} = no random slips, {err:true} = play the subtle slip now */
  function sparTurn(fen,studentSide,plies){
    if(mode!=="spar"||!target)return null;
    const out={solid:true};
    if(errAt)return out;
    if(plies<8)return out;                                           /* never in the first moves: the game must be solid and equal first */
    let al=[];try{al=LC61.detect(fen,studentSide)}catch(e){}
    if(al.some(a=>a.id===target.id))out.err=true;
    return out;
  }
  function used(plies){errAt=plies||1;say("Sparring: your alarm “"+(target&&target.label||"")+"” is on the board. I just gave you a chance. Did you see it?","")}

  function charge(){
    try{if(Admin.active)return true}catch(e){}
    let bal=0;try{bal=Credits.balance()}catch(e){bal=0}
    if(!(bal>=COST)){say("You need "+COST+" token for a sparring game.","bad");try{location.hash="#upgrades"}catch(e){}return false}
    try{Credits.spend(COST);App.save()}catch(e){return false}
    return true;
  }
  function start(m){
    if(!charge())return;
    mode=m;errAt=0;target=m==="spar"?topAlarm():null;
    const b=Q('[data-bt="new"]');if(!b){say("Open the bot page first.");return}
    fromPanel=true;b.click();fromPanel=false;
    say(m==="spar"?"Sparring started. Watch for the alarm: “"+target.label+"”. 1 token.":"Game started. Play your normal game. I will find your weak spots afterwards. 1 token.","good");
    paint();
  }
  function paint(){
    if(route()!=="bot")return;
    const bt=Q("#bt");if(!bt)return;                                   /* inside the bot page's own column: the page orders its children board-first on phones */
    let c=Q("[data-lc63-modes]");
    const t=topAlarm();
    const html='<div class="lc63-row"><button type="button" class="btn btn-primary" data-lc63="plain">Spot My Weaknesses</button><button type="button" class="btn btn-ghost" data-lc63="spar">Be My Sparring Partner</button></div>'
      +'<p class="small muted">'+COST+' token each. Sparring tests '+(t.point?'your top Working Point “'+esc(t.point)+'”':'your Alarm Signals')+': a solid game until “'+esc(t.label)+'” is on the board, then one small slip.'+(mode==="spar"?' <b>Active now.</b>':'')+'</p>';
    if(c&&c.parentNode!==bt){c.remove();c=null}
    if(!c){c=document.createElement("section");c.className="panel pad lc63-modes";c.setAttribute("data-lc63-modes","");const ref=bt.firstElementChild;if(ref)ref.insertAdjacentElement("afterend",c);else bt.appendChild(c)}
    if(c.innerHTML!==html)c.innerHTML=html;
  }
  function css(){
    if(Q("#lc63-css"))return;
    const s=document.createElement("style");s.id="lc63-css";
    s.textContent=".lc63-modes{order:-1;display:grid;gap:6px;padding:10px 12px}.lc63-modes .btn{min-height:44px;flex:1 1 140px;white-space:normal;text-align:center;line-height:1.2}.lc63-row{display:flex;gap:8px;flex-wrap:wrap}.lc63-modes p{margin:0}";
    document.head.appendChild(s);
  }
  let timer=0;
  function afterRender(){clearTimeout(timer);timer=setTimeout(()=>{try{paint()}catch(e){}},500)}
  function init(){
    css();
    let deb=0;new MutationObserver(()=>{clearTimeout(deb);deb=setTimeout(()=>{try{paint()}catch(e){}},300)}).observe(document.body,{childList:true,subtree:true});
    document.addEventListener("click",e=>{
      const b=e.target.closest&&e.target.closest("[data-lc63]");
      if(b){e.preventDefault();e.stopPropagation();start(b.getAttribute("data-lc63"));return}
      const n=e.target.closest&&e.target.closest('[data-bt="new"]');
      if(n&&!fromPanel){mode="plain";target=null}
    },true);
  }
  return{init:init,afterRender:afterRender,sparTurn:sparTurn,used:used,start:start,mode:()=>mode,COST:COST,version:"9.33.0"};
})(); /*@@end lc63*/
