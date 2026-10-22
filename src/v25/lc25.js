/* ==========================================================================
   v25 LAYER (additive), hub 9.3.0: "Master Evolution".
   Sits next to LC19 and LC80. Nothing here replaces an existing system; every
   entry point is wrapped in try/catch so a failure here can never break a trainer.

   1. Coach Lanckriet welcome + First Blunder Redemption (+50 XP, Level 2 popup, +100 XP quest)
   2. Auto-Advance toggle, "Analyze previous", opening flashcards
   3. Engine-checked alternative answers in puzzles (full / mostly correct + other winning moves)
   4. Tilt "Penalty Box": 5 optional focus puzzles
   5. Ghost rival (first week), "Get a rival", WhatsApp challenge links
   6. 45-second audio recap script (spoken through the existing coach voice)
   Tuning knobs: LC25.CFG.  Pure functions: LC25.logic (unit-tested).
   ========================================================================== */
const LC25=(()=>{
  "use strict";
  const VERSION="25.0.0";
  const DAY=864e5;
  const CFG={
    auto:{
      key:"lc25-auto",delay:1300,undoMs:12000,minGap:900,
      /* buttons that only exist once an item is solved or finished */
      sel:['[data-act="next"]','[data-act="next-in-level"]','[data-pzx="next"]','[data-ppx="next"]','[data-v9="next"]','[data-mr="new"]','[data-vt="next"]'],
      skipLabel:/score|result|chapter|level|unlock|upgrade|membership/i,
      skipRoutes:["shuffle"],                                   /* Shuffle has its own "keep playing" switch */
      trainRoutes:["openings","themes","puzzles","think","middlegame","endgame","clinic","mspc-rep","learn","vision","survival","theory","ranked","bridge"]
    },
    flash:{key:"lc25-flash",every:4,keep:16,minBuf:3,routes:["openings","theory","learn","mspc-rep"]},
    alt:{fullLoss:5,okLoss:9,ms:320,multipv:3,sections:["think","middlegame","endgame","bridge"]},
    tilt:{key:"lc25-tilt",puzzles:5,easier:250,pollMs:20*60e3,games:4,losses:3,windowMs:3*3600e3,cooldownMs:6*3600e3},   /* the last three numbers are LC19's, read live when LC19 is there */
    ghost:{key:"lc25-ghost",days:7,goal:600,badge:"ghost_slayer",minTotalForNew:300},
    share:{base:"https://lanckrietchess-app.vercel.app/"},
    rival:{label:"Get a rival",channel:"#looking-for-a-rival",url:""},   /* the link itself: admin setting links.rival (empty = Skool community) */
    quest:{redeemXp:50,analysisXp:100,key:"lc19-sw"},
    onb:{key:"lc25-onb",maxScan:20,minPlies:16},
    recap:{words:110}
  };

  /* ---------- tiny helpers (the app's own are used when present) ---------- */
  const E=s=>{try{return typeof esc==="function"?esc(s):String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}catch(e){return""}};
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.from((r||document).querySelectorAll(s));
  const ic=n=>{try{return typeof icon==="function"?icon(n):""}catch(e){return""}};
  const say$=(m,k)=>{try{toast(m,k)}catch(e){}};
  const rd=(k,d)=>{try{return Store.get(k,d)}catch(e){return d}};
  const wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const route=()=>{let h="";try{h=decodeURIComponent((location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){}return h.split(/[?&/]/)[0]};
  const totalXp=()=>{try{return +V6.state().total||0}catch(e){return null}};
  const myElo=()=>{try{return V34.myRating()||null}catch(e){return null}};
  const isAdmin=()=>{try{return!!Admin.active}catch(e){return false}};

  /* ======================================================================
     A. PURE LOGIC (no DOM, unit-tested)
     ====================================================================== */
  /* How good is a move the content did not list? bestPct / playedPct are win percentages from the mover's side,
     bestMate / playedMate are mate distances in moves from the mover's side (positive = the mover mates), or null. */
  function altVerdict(o,cfg){
    cfg=cfg||CFG.alt;
    const bm=o.bestMate,pm=o.playedMate;
    if(bm!=null&&bm>0){
      if(pm!=null&&pm>0&&pm<=bm+1)return{tier:"full",loss:0,why:"mate"};
      if(pm!=null&&pm>0)return{tier:"mostly",loss:null,why:"slower-mate"};
      return{tier:"no",loss:Math.max(0,(+o.bestPct||0)-(+o.playedPct||0)),why:"missed-mate"};
    }
    const loss=Math.max(0,(+o.bestPct||0)-(+o.playedPct||0));
    if(loss<=cfg.fullLoss)return{tier:"full",loss:loss,why:"eval"};
    if(loss<=cfg.okLoss)return{tier:"mostly",loss:loss,why:"eval"};
    return{tier:"no",loss:loss,why:"eval"};
  }
  const evalLabel=l=>l.mate!=null&&l.mate>0?"mate in "+l.mate:(l.cp>=0?"+":"")+(l.cp/100).toFixed(1);
  /* how good is the position for the mover, in a word. ctx: {cp, mate} of the best move, from the mover's side. */
  function quality(ctx){
    if(!ctx)return"unknown";
    if(ctx.mate!=null&&ctx.mate>0)return"mate";
    const cp=+ctx.cp||0;
    return cp>=150?"winning":cp>-60&&cp<60?"balanced":cp>=60?"better":"worse";
  }
  /* the label on the feedback box. "Also winning" is only said when the position really is winning. */
  function altLabel(v,ctx){
    if(v.tier==="full"){const q=quality(ctx);return q==="mate"||q==="winning"?"Also winning":"Also good"}
    return"Playable, not the best";
  }
  /* A human sentence for the "why does this also work" panel. others = [{san,mate,cp}] other strong moves. */
  function altReason(v,san,mainSan,others,ctx){
    const list=(others||[]).slice(0,3).map(o=>o.san+" ("+evalLabel(o)+")").join(", ");
    const more=list?" Other good moves here: "+list+".":"";
    const main=mainSan||"the main line";
    if(v.tier==="full"){
      if(v.why==="mate")return san+" also forces mate"+(mainSan&&mainSan!==san?", just like "+mainSan:"")+". In a position like this several moves can work, so check which one is the cleanest."+more;
      const q=quality(ctx);
      if(q==="winning")return san+" keeps the same winning edge as "+main+"."+more;
      if(q==="balanced")return san+" holds the balance just as well as "+main+"."+more;
      return san+" is as good as "+main+" here."+more;
    }
    if(v.tier==="mostly"){
      if(v.why==="slower-mate")return san+" still wins, but the mate takes longer than with "+main+". Always look for the fastest forcing line."+more;
      return san+" is playable: you keep most of the advantage, only "+Math.round(v.loss||0)+" points of winning chances less than "+(mainSan||"the best move")+"."+more;
    }
    return"";
  }
  /* Pick a flashcard from the recent buffer. Skips the newest 2 positions (too fresh to be a test) unless the buffer is small. */
  function flashPick(buf,rnd,cfg){
    cfg=cfg||CFG.flash;
    const list=(buf||[]).filter(c=>c&&c.fen&&c.from&&c.to);
    if(list.length<cfg.minBuf)return null;
    const pool=list.length>cfg.minBuf+1?list.slice(0,list.length-2):list;
    return pool[Math.floor((rnd?rnd():Math.random())*pool.length)]||null;
  }
  const flashDue=(count,cfg)=>{cfg=cfg||CFG.flash;return count>0&&count%cfg.every===0};
  function flashPush(buf,card,cfg){
    cfg=cfg||CFG.flash;
    const out=(buf||[]).filter(c=>!(c.fen===card.fen&&c.san===card.san));
    out.push(card);
    return out.slice(-cfg.keep);
  }
  /* Ghost rival: a smooth curve to the weekly goal. Deterministic, so it never "teleports" between sessions. */
  function ghostXp(t0,now,goal,days){
    days=days||CFG.ghost.days;
    const f=clamp((now-t0)/(days*DAY),0,1);
    return Math.round(goal*Math.pow(f,.85));
  }
  function ghostState(st,total,now){
    if(!st)return null;
    const gain=Math.max(0,(+total||0)-(+st.base||0)),ghost=ghostXp(st.t0,now,st.goal);
    const left=Math.max(0,Math.ceil((st.t0+CFG.ghost.days*DAY-now)/DAY));
    /* a win only counts inside the week (plus one day of grace for the claim); later XP never wins it retroactively */
    const won=!!st.won||(gain>=st.goal&&now<=st.t0+(CFG.ghost.days+1)*DAY);
    const over=now>=st.t0+CFG.ghost.days*DAY&&!won;
    return{gain:gain,ghost:ghost,goal:st.goal,over:over,won:won,left:left,ahead:gain>=ghost,pct:clamp(Math.round(gain/st.goal*100),0,100),gpct:clamp(Math.round(ghost/st.goal*100),0,100)};
  }
  const refOf=u=>{try{const m=new URL(u,"https://x.invalid/");return m.searchParams.get("ref")||""}catch(e){return""}};
  function challengeUrl(base,kind,val){
    let u;try{u=new URL(base)}catch(e){u=new URL(CFG.share.base)}
    u.searchParams.set("ch",kind+":"+String(val).replace(/[^a-z0-9_-]/gi,"").slice(0,12));
    return u.toString();
  }
  const whatsappLink=(text,url)=>"https://wa.me/?text="+encodeURIComponent(String(text).trim()+" "+url);
  function challengeText(kind,val,name){
    const who=name?name+" here. ":"";
    if(kind==="xp")return who+"I just earned "+val+" XP in my first week of chess training. Think you can beat that?";
    if(kind==="ghost")return who+"I beat the Lanckriet-student ghost in week one. Try to beat it too.";
    if(kind==="lvl")return who+"I just reached level "+val+" in the Lanckrietchess Training Hub. Come and rival me.";
    if(kind==="pb")return who+"I solved "+val+"/5 focus puzzles after a bad run. Join me and train smarter.";
    return who+"I train with the Lanckrietchess Training Hub. Come and try it.";
  }
  const parseChallenge=search=>{
    try{const v=new URLSearchParams(search||"").get("ch")||"";const m=/^([a-z]{2,6}):([a-z0-9_-]{1,12})$/i.exec(v);return m?{kind:m[1].toLowerCase(),val:m[2]}:null}catch(e){return null}
  };
  /* ~110 words = about 45 seconds spoken. Built from the Wrapped numbers, no API call. */
  function recapScript(w,name,cfg){
    cfg=cfg||CFG.recap;
    if(!w||!w.games)return"";
    const p=[];
    const per=w.kind==="month"?"this month":"this week";
    p.push((name?"Hi "+name+". ":"")+"Here is your chess "+(w.kind==="month"?"month":"week")+" in forty five seconds.");
    p.push("You played "+w.games+(w.games===1?" game":" games")+" "+per+": "+w.wins+" won, "+w.losses+" lost"+(w.draws?", "+w.draws+" drawn":"")+".");
    if(w.acc!=null)p.push("Your accuracy was "+Math.round(w.acc)+" percent.");
    if(w.eloFrom!=null&&w.eloTo!=null){const d=w.eloTo-w.eloFrom;p.push(d>0?"Your rating climbed "+d+" points.":d<0?"Your rating dipped "+Math.abs(d)+" points, which is normal while you work on a leak.":"Your rating held steady.")}
    if(w.blunders!=null)p.push("You made "+w.blunders+(w.blunders===1?" blunder":" blunders")+" and "+(w.mistakes||0)+" mistakes.");
    if(w.brilliant)p.push("And "+w.brilliant+" brilliant or great "+(w.brilliant===1?"move":"moves")+". Well played.");
    if(w.bestOpening)p.push("Your best opening was "+w.bestOpening.name+".");
    if(w.worstOpening&&w.worstOpening.name!==(w.bestOpening&&w.bestOpening.name))p.push("Work on "+w.worstOpening.name+" next.");
    if(w.xp!=null)p.push("You earned "+w.xp+" XP"+(w.puzzles!=null?" and solved "+w.puzzles+" puzzles":"")+".");
    p.push("Before every move, ask M, S, P, C. See you in the hub.");
    let words=p.join(" ").split(/\s+/);
    if(words.length>cfg.words+25){
      /* too long: drop the optional middle sentences until it fits */
      while(p.length>4&&p.join(" ").split(/\s+/).length>cfg.words+25)p.splice(p.length-2,1);
    }
    return p.join(" ");
  }
  /* Quest hand-off after the redemption: Level 1 -> 2 with base set after the +50 XP, so the +100 XP quest is the way to Level 3. */
  function questAfterRedemption(st,total){
    if(!st||!st.on)return st;
    if(st.level>1)return st;
    return Object.assign({},st,{level:2,base:+total||0});
  }
  function lossOf(headers,user,site){
    const u=String(user||"").toLowerCase(),w=String(headers.White||"").toLowerCase(),b=String(headers.Black||"").toLowerCase(),r=String(headers.Result||"");
    if(u&&u===w)return r==="0-1"?"w":"";
    if(u&&u===b)return r==="1-0"?"b":"";
    return"";
  }
  function fenFromPosition(pos){
    const files="abcdefgh";const rows=[];
    for(let r=8;r>=1;r--){let row="",empty=0;
      for(let f=0;f<8;f++){
        const p=pos[files[f]+r];
        if(!p){empty++;continue}
        if(empty){row+=empty;empty=0}
        const c=p[1];row+=p[0]==="w"?c.toUpperCase():c.toLowerCase();
      }
      if(empty)row+=empty;rows.push(row);
    }
    return rows.join("/")+" w - - 0 1";
  }
  /* ---- tilt from the public game APIs (members without server-side Auto-Sync) ---- */
  const CC_LOSS=["checkmated","resigned","timeout","abandoned","lose"];
  const tiltCfg=()=>{try{const t=LC19.CFG.tilt;if(t&&t.losses>0&&t.windowMs>0)return{losses:t.losses,windowMs:t.windowMs,cooldownMs:t.cooldownMs||CFG.tilt.cooldownMs}}catch(e){}return{losses:CFG.tilt.losses,windowMs:CFG.tilt.windowMs,cooldownMs:CFG.tilt.cooldownMs}};
  /* the same rule as LC19: the newest N games are all losses, close together, and recent. rows: [{gid,t(ms),result:"win"|"loss"|"draw"}] */
  function tiltRule(rows,now,cfg){
    cfg=cfg||tiltCfg();now=now||Date.now();
    const list=(rows||[]).filter(r=>r&&r.t>0&&r.result).sort((a,b)=>b.t-a.t);
    const last=list.slice(0,cfg.losses);
    if(last.length<cfg.losses||!last.every(r=>r.result==="loss"))return{tilted:false};
    if(last[0].t-last[last.length-1].t>cfg.windowMs)return{tilted:false};
    if(now-last[0].t>cfg.windowMs)return{tilted:false};
    return{tilted:true,gids:last.map(r=>r.gid),newest:last[0].t};
  }
  /* Lichess: application/x-ndjson, one game per line */
  function lichessRows(text,user){
    const u=String(user||"").toLowerCase(),out=[];if(!u)return out;
    String(text||"").split("\n").forEach(line=>{
      line=line.trim();if(!line)return;let g;try{g=JSON.parse(line)}catch(e){return}
      if(!g||typeof g!=="object"||(g.variant&&g.variant!=="standard"))return;
      if(["aborted","noStart","started","created"].includes(g.status))return;
      const pl=g.players||{},nm=c=>{const x=pl[c]&&pl[c].user;return x?String(x.id||x.name||"").toLowerCase():""};
      const color=nm("white")===u?"white":nm("black")===u?"black":"";if(!color)return;
      const t=+g.lastMoveAt||+g.createdAt;if(!(t>0))return;
      out.push({gid:String(g.id||t),t:t,result:g.winner?(g.winner===color?"win":"loss"):"draw"});
    });
    return out;
  }
  /* Chess.com: one monthly archive, {games:[...]} */
  function chesscomRows(json,user){
    const u=String(user||"").toLowerCase(),out=[];if(!u)return out;
    ((json&&json.games)||[]).forEach(g=>{
      if(!g||typeof g!=="object"||(g.rules&&g.rules!=="chess"))return;
      const w=g.white||{},b=g.black||{};
      const me=String(w.username||"").toLowerCase()===u?w:String(b.username||"").toLowerCase()===u?b:null;if(!me)return;
      const t=(+g.end_time||0)*1000;if(!(t>0))return;
      const r=String(me.result||"");
      out.push({gid:String(g.uuid||g.url||t),t:t,result:r==="win"?"win":CC_LOSS.includes(r)?"loss":"draw"});
    });
    return out;
  }
  /* Which move of the member's lost game to redeem: the worst by class (blunder, mistake, inaccuracy), then by points lost; when the engine
     calls nothing an error, a move that still gave away 4+ points that was not a forced best move (the measured loss of one move varies by a few
     points from run to run, so the line must sit below that noise). null when the loss was not one move. */
  const RANK={blunder:3,mistake:2,inaccuracy:1};
  function pickRedemption(items){
    const list=(items||[]).filter(it=>it&&it.loss!=null&&it.i!=null);
    const err=list.filter(it=>RANK[it.cls]).sort((a,b)=>RANK[b.cls]-RANK[a.cls]||b.loss-a.loss)[0];
    if(err)return err;
    return list.filter(it=>it.cls!=="best"&&it.loss>=4).sort((a,b)=>b.loss-a.loss)[0]||null;
  }
  const markOf=cls=>cls==="blunder"?"??":cls==="mistake"?"?":"?!";
  const logic={pickRedemption,markOf,quality,altLabel,tiltRule,lichessRows,chesscomRows,altVerdict,altReason,flashPick,flashDue,flashPush,ghostXp,ghostState,challengeUrl,whatsappLink,challengeText,parseChallenge,recapScript,questAfterRedemption,lossOf,fenFromPosition,evalLabel,refOf};

  /* ======================================================================
     B. ENGINE-CHECKED ALTERNATIVES  (Pillar 4)
     ====================================================================== */
  /* puzzle-alts.json (built by tools/mspc/audit-puzzles.mjs): for every solver move in your puzzle lines, the other moves that are also good.
     Checked first: instant, no engine, works offline. A move that is not listed there still goes to the live engine. */
  const palts=remote({file:"puzzle-alts.json",cfg:"puzzleAltsUrl",field:"positions"});
  const sanClean=x=>String(x||"").replace(/[+#!?]+$/g,"");
  const pctOf=(k,v)=>k==="mate"?(v>0?100:0):50+50*(2/(1+Math.exp(-.00368208*Math.max(-1500,Math.min(1500,+v||0))))-1);
  function precomputed(o){
    try{
      const m=palts.map;if(!m){palts.ensure();return null}
      const e=m[String(o.fen||"").split(" ").slice(0,3).join(" ")];if(!e||!Array.isArray(e.alts))return null;
      const a=e.alts.find(x=>x&&sanClean(x.s)===sanClean(o.san));if(!a||(a.t!=="full"&&a.t!=="mostly"))return null;
      const ctx=e.e?{cp:e.e.k==="cp"?e.e.v:0,mate:e.e.k==="mate"?e.e.v:null}:null;
      const best=e.e?pctOf(e.e.k,e.e.v):null,mine=pctOf(a.k,a.v);
      const v={tier:a.t,why:a.k==="mate"?"mate":(a.t==="mostly"&&a.k==="mate"?"slower-mate":"eval"),loss:best==null?0:Math.max(0,best-mine)};
      if(a.t==="mostly"&&e.e&&e.e.k==="mate"&&a.k==="mate")v.why="slower-mate";
      const others=e.alts.filter(x=>x&&sanClean(x.s)!==sanClean(o.san)&&x.t==="full").map(x=>({san:x.s,mate:x.k==="mate"?x.v:null,cp:x.k==="cp"?x.v:0}));
      return{tier:a.t,loss:v.loss,why:v.why,mainSan:e.main,others:others,text:altReason(v,o.san,e.main,others,ctx),label:altLabel(v,ctx),pre:true};
    }catch(err){return null}
  }
  const alt={
    wants(section,stage){
      try{
        if(rd("lc25-flex",true)===false)return false;
        if(!CFG.alt.sections.includes(section))return false;
        if(stage&&stage.engineAlt===false)return false;
        return typeof Engine!=="undefined";
      }catch(e){return false}
    },
    async check(o){
      try{
        const pre=precomputed(o);if(pre)return pre;
        if(!(await Engine.load()))return null;
        const cfg=CFG.alt;
        const side=String(o.fen).split(" ")[1]==="b"?"b":"w",pov=side==="w"?1:-1;
        const play=(o.from+o.to).toLowerCase();
        const run=async(fen,n)=>{
          for(let t=0;t<3;t++){
            try{return await Engine.analyse(fen,{movetime:cfg.ms,multipv:n})}
            catch(e){if(!/superseded/.test(String(e&&e.message)))throw e;await sleep(400)}
          }
          throw new Error("busy");
        };
        const top=await run(o.fen,cfg.multipv);
        if(!top||!top.lines||!top.lines.length)return null;
        const val=l=>({pct:Engine.winPct(Engine.toCp(l)*pov),mate:l.mate!=null?l.mate*pov:null,cp:Engine.toCp(l)*pov});
        const best=val(top.lines[0]);
        let pv=null;
        const hit=top.lines.find(l=>l.pv&&l.pv[0]&&l.pv[0].slice(0,4)===play);
        if(hit)pv=val(hit);
        else{
          const g=new Chess(o.fen),mv=g.move({from:o.from,to:o.to,promotion:o.promotion||"q"});
          if(!mv)return null;
          if(g.game_over())pv=g.in_checkmate()?{pct:100,mate:1,cp:9999}:{pct:50,mate:null,cp:0};
          else{
            const r=await run(g.fen(),1),l=r.lines[0];
            pv=val(l);
            if(pv.mate!=null&&pv.mate>0)pv.mate+=1;       /* counted from the position before the move */
            else if(pv.mate!=null&&pv.mate<=0)pv.mate=null;
          }
        }
        const v=altVerdict({bestPct:best.pct,playedPct:pv.pct,bestMate:best.mate,playedMate:pv.mate});
        const mainSan=Engine.uciToSan(o.fen,top.lines[0].pv[0]);
        const others=top.lines.filter(l=>l.pv&&l.pv[0]&&l.pv[0].slice(0,4)!==play).map(l=>{const x=val(l);return{san:Engine.uciToSan(o.fen,l.pv[0]),mate:x.mate,cp:Math.round(x.cp),pct:x.pct}})
          .filter(x=>x.san&&x.pct>=best.pct-cfg.fullLoss);
        const ctx={cp:best.cp,mate:best.mate};
        return{tier:v.tier,loss:v.loss,why:v.why,mainSan:mainSan,others:others,text:altReason(v,o.san,mainSan,others,ctx),label:altLabel(v,ctx)};
      }catch(e){console.error("lc25 alt",e);return null}
    }
  };

  /* ======================================================================
     C. AUTO-ADVANCE, ANALYZE PREVIOUS, FLASHCARDS  (Pillar 3)
     ====================================================================== */
  const A={on:null,timer:null,armed:null,fired:new WeakSet(),lastFire:0,prev:null,count:0,obs:null,wait:0,undoT:0};
  const autoOn=()=>{if(A.on==null){const v=rd(CFG.auto.key,null);A.on=v==null?true:!!(v&&v.on!==false)}return A.on};
  const setAuto=v=>{A.on=!!v;wr(CFG.auto.key,{on:A.on});if(!A.on)disarm();paintBar()};
  const trainRoute=()=>CFG.auto.trainRoutes.includes(route());

  function nextButton(){
    const root=Q("#view");if(!root)return null;
    if(Q(".sheet-wrap")||Q(".learn36",root))return null;           /* a sheet is open, or Learn mode: never auto-advance */
    if(CFG.auto.skipRoutes.includes(route()))return null;
    for(const sel of CFG.auto.sel){
      const b=Q(sel,root);
      if(!b||b.disabled||b.hidden||b.closest("[hidden]")||b.getAttribute("aria-disabled")==="true")continue;
      const label=(b.textContent||"").trim();
      if(CFG.auto.skipLabel.test(label))continue;
      return b;
    }
    return null;
  }
  function posFromDom(root){
    const pos={};
    QA("[data-square]",root||document).forEach(sq=>{const im=Q("img[data-piece]",sq);if(im)pos[sq.getAttribute("data-square")]=im.getAttribute("data-piece")});
    return Object.keys(pos).length?pos:null;
  }
  function snapshot(){
    const v=Q("#view");if(!v)return null;
    const t=s=>{const e=Q(s,v);return e?(e.textContent||"").replace(/\s+/g," ").trim().slice(0,600):""};
    const pos=posFromDom(Q(".lc-board",v));
    return{title:t(".st-title")||t("h2"),brief:t(".st-brief"),fb:t(".st-feedback"),played:t(".st-played"),fen:pos?fenFromPosition(pos):"",at:Date.now()};
  }
  function ensureBar(){
    const v=Q("#view");if(!v)return null;
    let b=Q("#lc25-bar");
    if(!trainRoute()){if(b)b.remove();return null}
    if(!b){b=document.createElement("div");b.id="lc25-bar";b.className="lc25-bar";b.setAttribute("role","group");b.setAttribute("aria-label","Training flow");v.insertBefore(b,v.firstChild)}
    else if(b.parentNode!==v)v.insertBefore(b,v.firstChild);
    return b;
  }
  function paintBar(){
    const b=ensureBar();if(!b)return;
    const on=autoOn(),counting=!!A.armed,hasPrev=!!A.prev&&Date.now()-A.prev.at<CFG.auto.undoMs*5;
    const html='<button type="button" class="chip lc25-chip" data-lc25="auto" aria-pressed="'+on+'" title="Load the next item by itself once you solve one">'+ic("bolt")+'<span>Auto-Advance: <b>'+(on?"ON":"OFF")+'</b></span></button>'+
      (counting?'<span class="lc25-count" aria-live="polite">'+ic("forward")+' Next coming up…</span><button type="button" class="btn btn-quiet btn-sm" data-lc25="stay">Stay here</button>':"")+
      (hasPrev?'<button type="button" class="btn btn-ghost btn-sm" data-lc25="prev">'+ic("rotate-left")+' Analyze previous</button>':"");
    if(b._h!==html){b._h=html;b.innerHTML=html}
  }
  function disarm(){clearTimeout(A.timer);A.timer=null;if(A.armed){A.armed=null;paintBar()}}
  function arm(btn){
    clearTimeout(A.timer);
    A.armed={btn:btn,snap:snapshot()};
    paintBar();
    A.timer=setTimeout(fire,CFG.auto.delay);
  }
  function fire(){
    const a=A.armed;A.timer=null;A.armed=null;
    if(!a||!autoOn()){paintBar();return}
    if(!document.body.contains(a.btn)||a.btn.disabled){paintBar();return}
    if(Date.now()-A.lastFire<CFG.auto.minGap){paintBar();return}
    if(A.fired.has(a.btn)){paintBar();return}
    const onFlash=CFG.flash.routes.includes(route());
    if(onFlash)A.count++;
    const card=onFlash&&flashDue(A.count)?flash.pick():null;
    const go=()=>{
      if(!document.body.contains(a.btn)||a.btn.disabled){paintBar();return}
      A.fired.add(a.btn);A.lastFire=Date.now();A.prev=a.snap;
      try{a.btn.click()}catch(e){console.error(e)}
      paintBar();
    };
    if(card){flash.open(card,go);return}
    go();
  }
  function scan(){
    try{
      ensureBar();
      if(!autoOn()||!trainRoute()){if(A.armed)disarm();return}
      const b=nextButton();
      if(!b){if(A.armed)disarm();return}
      if(A.armed&&A.armed.btn===b)return;
      if(A.fired.has(b))return;
      arm(b);
    }catch(e){console.error("lc25 auto",e)}
  }
  /* throttle, not debounce: a route that keeps touching the DOM must not be able to starve the scan */
  let scanT=0;const later=()=>{if(scanT)return;scanT=setTimeout(()=>{scanT=0;scan()},140)};

  function openPrevious(){
    const p=A.prev;
    if(!p){say$("Nothing to look back at yet.");return}
    let board=null;
    openSheet({title:"Previous position",cls:"lc25-sheet",noFocus:true,
      html:(p.fen?'<div data-lc25-pb class="lc25-pb"></div>':"")+'<h3 class="lc25-h">'+E(p.title||"The last item")+"</h3>"+(p.brief?'<p class="muted">'+E(p.brief)+"</p>":"")+(p.fb?'<p><b>Feedback:</b> '+E(p.fb)+"</p>":"")+(p.played?'<p class="small muted">'+E(p.played)+"</p>":"")+
        '<div class="btn-row">'+(p.fen?'<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer" href="https://lichess.org/analysis/'+encodeURIComponent(p.fen.replace(/ /g,"_"))+'">'+ic("magnifying-glass")+" Open on Lichess</a>":"")+'<button type="button" class="btn btn-primary" data-close>Back to training</button></div>',
      onMount(s){const h=Q("[data-lc25-pb]",s.el);if(h&&p.fen){try{board=Board(h,{fen:p.fen});board.setInteractive(null)}catch(e){h.remove()}}}});
  }

  /* flashcards: remember the last positions the user drilled (from the SRS hooks), then test one now and then */
  const flash={
    buf:null,
    load(){if(!flash.buf){const b=rd(CFG.flash.key,[]);flash.buf=Array.isArray(b)?b:[]}return flash.buf},
    note(ok,move,fen){
      try{
        if(!move||!fen||!move.from||!move.to)return;
        const c={fen:String(fen),san:String(move.san||""),from:move.from,to:move.to,color:move.color==="b"?"b":"w",t:Date.now()};
        flash.buf=flashPush(flash.load(),c);wr(CFG.flash.key,flash.buf);
      }catch(e){}
    },
    pick(){try{return flashPick(flash.load())}catch(e){return null}},
    open(card,done){
      let finished=false,tries=0,board=null;
      const finish=()=>{if(finished)return;finished=true;try{done()}catch(e){console.error(e)}};
      openSheet({title:"Flashcard: find the move",cls:"lc25-sheet",noFocus:true,
        html:'<p class="muted small">'+ic("bolt")+" You drilled this position a moment ago. Play the move from memory.</p>"+
          '<div data-lc25-fc class="lc25-pb"></div><p data-lc25-fb aria-live="polite" class="lc25-fb"></p><div class="btn-row" data-lc25-act><button type="button" class="btn btn-quiet btn-sm" data-lc25-reveal>Show me</button></div>',
        onClose(){finish()},
        onMount(s){
          const host=Q("[data-lc25-fc]",s.el),fb=Q("[data-lc25-fb]",s.el),act=Q("[data-lc25-act]",s.el);
          const win=()=>{fb.innerHTML='<b class="lc25-ok">'+ic("check")+" Correct.</b> "+E(card.san);say$("Flashcard cleared.","good");act.innerHTML='<button type="button" class="btn btn-primary" data-lc25-go>Continue</button>';try{board.setInteractive(null)}catch(e){}};
          const reveal=()=>{fb.innerHTML="It was <b>"+E(card.san)+"</b>. You will see this one again.";try{board.setArrows([{from:card.from,to:card.to,kind:"best"}]);board.setInteractive(null)}catch(e){}act.innerHTML='<button type="button" class="btn btn-primary" data-lc25-go>Continue</button>'};
          const choices=()=>{
            /* fallback when the board cannot start: four move choices */
            try{
              const g=new Chess(card.fen),all=g.moves();
              const right=card.san,pool=all.filter(m=>m!==right).sort(()=>Math.random()-.5).slice(0,3);
              const opts=pool.concat([right]).sort(()=>Math.random()-.5);
              host.innerHTML='<div class="lc25-opts">'+opts.map(o=>'<button type="button" class="btn btn-ghost" data-lc25-opt="'+E(o)+'">'+E(o)+"</button>").join("")+"</div>";
            }catch(e){finish();s.close()}
          };
          try{
            board=Board(host,{fen:card.fen,orientation:card.color==="b"?"black":"white",onMove(m){
              if(finished)return;
              const u=(m.from+m.to).toLowerCase();
              if(u===(card.from+card.to).toLowerCase()){board.setPosition(card.fen);win();return}
              tries++;try{board.setPosition(card.fen);board.shake&&board.shake()}catch(e){}
              if(tries>=2)reveal();else fb.textContent="Not that one. Try once more.";
            }});
            board.setInteractive(card.color);
          }catch(e){choices()}
          s.el.addEventListener("click",ev=>{
            const o=ev.target.closest("[data-lc25-opt]");
            if(o){if(o.getAttribute("data-lc25-opt")===card.san)win();else{tries++;if(tries>=2)reveal();else fb.textContent="Not that one. Try once more."}return}
            if(ev.target.closest("[data-lc25-reveal]")){reveal();return}
            if(ev.target.closest("[data-lc25-go]")){s.close()}
          });
        }});
    }
  };

  /* ======================================================================
     D. TILT PENALTY BOX  (Pillar 5)
     ====================================================================== */
  const tilt={
    offer(t){
      try{
        if(rd(CFG.tilt.key,{}).off)return false;
        if(typeof PuzzleFeed==="undefined"||typeof openSheet!=="function")return false;
        tilt.open(!!t);
        return true;
      }catch(e){console.error("lc25 tilt",e);return false}
    },
    open(auto,info){
      const mark=()=>wr("lc19-tilt-at",Date.now());
      const siteTxt=info&&info.sites&&info.sites.length?info.sites.join(" and "):"";
      openSheet({title:"Quick reset",cls:"lc25-sheet",noFocus:true,
        html:'<div data-pb-root>'+coachHead("I noticed you dropped 3 games in a row. Let\u2019s clear your head with these "+CFG.tilt.puzzles+" quick focus puzzles before jumping back in.")+
          '<p class="small muted">Optional, about two minutes. Easy ones, so you finish on a win.</p>'+(info&&info.polled?'<p class="small muted">I looked at your last games on '+E(siteTxt||"your linked account")+' when you opened the app. <button type="button" class="btn btn-quiet btn-sm" data-pb="stop">Stop checking</button></p>':"")+'<div class="btn-row"><button type="button" class="btn btn-primary" data-pb="go">'+ic("bolt")+" Start "+CFG.tilt.puzzles+' focus puzzles</button><button type="button" class="btn btn-ghost" data-pb="review">Analyze those games</button><button type="button" class="btn btn-quiet" data-pb="no">I\u2019m fine</button></div></div>',
        onClose(){mark()},
        onMount(s){
          s.el.addEventListener("click",ev=>{
            const b=ev.target.closest("[data-pb]");if(!b)return;
            const a=b.getAttribute("data-pb");mark();
            if(a==="go")tilt.run(s);
            else if(a==="review"){s.close();location.hash="#my-mistakes"}
            else if(a==="stop"){try{App.settings.lc25Tilt=false;App.save()}catch(e){}say$("Tilt check is off. You can turn it back on in Settings.");s.close()}
            else s.close();
          });
        }});
    },
    /* For members without server-side Auto-Sync: when the app opens, look at the last few games on the linked username (public APIs, no key).
       At most every 20 minutes, only when a username is linked, never while a sheet is open, and never twice inside LC19's cooldown. */
    poll:{
      at:0,busy:false,defers:0,
      enabled(){
        try{if(CONFIG.v25&&CONFIG.v25.tiltCheck===false)return false}catch(e){}
        try{if(App.settings.lc25Tilt===false)return false}catch(e){}
        return!(rd(CFG.tilt.key,{})||{}).off;
      },
      handles(){const p=(typeof App!=="undefined"&&App.profile)||{},ok=x=>/^[A-Za-z0-9_-]{2,30}$/.test(x)?x:"";return{cc:ok(String(p.chess_com_username||"").trim()),li:ok(String(p.lichess_username||"").trim())}},
      async rows(h){
        const out=[],jobs=[];
        if(h.li)jobs.push((async()=>{
          const r=await fetchWithTimeout("https://lichess.org/api/games/user/"+encodeURIComponent(h.li)+"?max="+CFG.tilt.games+"&finished=true&ongoing=false",{headers:{Accept:"application/x-ndjson"}},1e4);
          if(r&&r.ok)lichessRows(await r.text(),h.li).forEach(x=>out.push(x));
        })());
        if(h.cc)jobs.push((async()=>{
          const user=h.cc.toLowerCase();
          const ra=await fetchWithTimeout("https://api.chess.com/pub/player/"+encodeURIComponent(user)+"/games/archives",{},1e4);
          if(!ra||!ra.ok)return;
          const arch=(((await ra.json())||{}).archives||[]).filter(u=>/^https:\/\/api\.chess\.com\//.test(u));
          let got=0;
          for(const mu of arch.slice(-2).reverse()){                    /* this month, then last month if it is early in the month */
            const rm=await fetchWithTimeout(mu,{},1e4);if(!rm||!rm.ok)continue;
            const rows=chesscomRows(await rm.json(),user);rows.forEach(x=>out.push(x));got+=rows.length;
            if(got>=CFG.tilt.games)break;
          }
        })());
        await Promise.allSettled(jobs);
        return out;
      },
      async check(force){
        const P=tilt.poll;
        try{
          if(P.busy||!P.enabled())return null;
          const now=Date.now();
          if(!force&&now-P.at<CFG.tilt.pollMs)return null;
          const h=P.handles();if(!h.cc&&!h.li)return null;
          if(now-(+rd("lc19-tilt-at",0)||0)<tiltCfg().cooldownMs)return null;      /* already offered (by either check) */
          if(typeof PuzzleFeed==="undefined"||typeof openSheet!=="function")return null;
          P.busy=true;P.at=now;
          const rows=await P.rows(h);
          const t=tiltRule(rows,Date.now());
          if(!t.tilted)return{rows:rows,tilted:false};
          if(Q(".sheet-wrap")){                                                       /* do not interrupt: try again soon, a few times */
            if(P.defers++<5)setTimeout(()=>{try{P.check(true)}catch(e){}},6e4);
            return{rows:rows,tilted:true,deferred:true};
          }
          P.defers=0;
          tilt.open(true,{polled:true,sites:[h.li?"Lichess":"",h.cc?"Chess.com":""].filter(Boolean)});
          return{rows:rows,tilted:true,shown:true};
        }catch(e){return{error:String(e&&e.message||e)}}
        finally{tilt.poll.busy=false}
      }
    },
    run(s){
      const body=Q("[data-pb-root]",s.el),total=CFG.tilt.puzzles;
      if(!body)return;
      let n=0,solved=0,board=null,cur=null,g=null,idx=0,tries=0,busy=false,dead=false;const usedPool=new Set();
      const host=document.createElement("div");host.className="lc25-run";
      body.innerHTML="";body.appendChild(host);
      const done=(why)=>{
        dead=true;
        host.innerHTML=coachHead(solved>=Math.ceil(total*.6)?"Nice. "+solved+" of "+total+". Your head is clear, go and play your next game.":"You got "+solved+" of "+total+". That is fine, the point was to slow down. Take a breath before the next game.")+
          (why==="offline"?'<p class="small muted">The puzzle server was not reachable, so this was a short set.</p>':"")+
          '<div class="btn-row"><a class="btn btn-ghost" target="_blank" rel="noopener noreferrer" href="'+E(whatsappLink(challengeText("pb",solved),shareLink("pb",solved)))+'">'+ic("forward")+' Share on WhatsApp</a><button type="button" class="btn btn-primary" data-pbx="close">Back to the hub</button></div>';
      };
      const side=()=>String(cur.fen).split(" ")[1]==="b"?"b":"w";
      async function nextP(){
        if(dead)return;
        if(n>=total){done();return}
        host.innerHTML='<p class="muted">Finding puzzle '+(n+1)+" of "+total+"…</p>";
        let p=null;
        const target=clamp((myElo()||900)-CFG.tilt.easier,400,2000);
        try{p=await PuzzleFeed.next(target)}catch(e){p=null}
        if(dead)return;
        if(!p||!p.solution||!p.fen){p=poolPick(usedPool);usedPool.add(p.id)}          /* offline, rate limited or an empty bank: the built-in easy puzzles */
        cur=p;g=new Chess(p.fen);idx=0;tries=0;busy=false;n++;
        host.innerHTML='<p class="small muted lc25-pn">Puzzle '+n+" of "+total+" · "+E(side()==="w"?"White":"Black")+' to move</p><div data-pbb class="lc25-pb"></div><p data-pbf aria-live="polite" class="lc25-fb"></p><div class="btn-row"><button type="button" class="btn btn-quiet btn-sm" data-pbx="skip">Skip</button></div>';
        try{
          board=Board(Q("[data-pbb]",host),{fen:p.fen,orientation:side()==="b"?"black":"white",onMove:onMove});
          board.setInteractive(side());
        }catch(e){done("offline")}
      }
      const fb=t=>{const e=Q("[data-pbf]",host);if(e)e.innerHTML=t};
      function onMove(m){
        if(busy||dead)return;
        const want=cur.solution[idx];
        const mv=g.move({from:m.from,to:m.to,promotion:m.promotion||"q"});
        if(!mv){board.setPosition(g.fen());return}
        const u=mv.from+mv.to+(mv.promotion||"");
        const last=idx>=cur.solution.length-1;
        if(u.slice(0,4)===want.slice(0,4)||(last&&g.in_checkmate())){
          board.setPosition(g.fen(),{lastMove:{from:mv.from,to:mv.to}});idx++;
          if(idx>=cur.solution.length)return win();
          busy=true;
          setTimeout(()=>{
            if(dead)return;
            const r=cur.solution[idx],rm=g.move({from:r.slice(0,2),to:r.slice(2,4),promotion:r[4]||"q"});
            if(rm)board.setPosition(g.fen(),{lastMove:{from:rm.from,to:rm.to}});
            idx++;busy=false;
            if(idx>=cur.solution.length)return win();
          },380);
          return;
        }
        g.undo();tries++;
        try{board.setPosition(g.fen());board.shake&&board.shake()}catch(e){}
        if(tries>=2){
          busy=true;
          try{board.setArrows([{from:want.slice(0,2),to:want.slice(2,4),kind:"best"}])}catch(e){}
          fb("It was <b>"+E(Engine.uciToSan(g.fen(),want)||want)+"</b>. On to the next one.");
          setTimeout(()=>{if(!dead)nextP()},1700);
        }else fb("Not that one. Look for the forcing move.");
      }
      function win(){solved++;busy=true;fb('<b class="lc25-ok">'+ic("check")+" Solved.</b>");say$("Solved.","good");setTimeout(()=>{if(!dead)nextP()},900)}
      host.addEventListener("click",ev=>{
        const x=ev.target.closest("[data-pbx]");if(!x)return;
        if(x.getAttribute("data-pbx")==="close")s.close();
        else if(x.getAttribute("data-pbx")==="skip"&&!busy)nextP();
      });
      nextP();
    }
  };

  /* ======================================================================
     E. COACH CARD, SHARING, GHOST RIVAL  (Pillars 2, 6)
     ====================================================================== */
  /* the coach's face: LC19's avatar (monogram, or the photo set in admin as coachAvatar) so there is one coach everywhere; ours only as a fallback */
  const ownAvatar=z=>'<svg viewBox="0 0 48 48" width="'+z+'" height="'+z+'" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/><text x="24" y="31.5" text-anchor="middle" font-size="24" fill="#38bdf8">\u265e</text></svg>';
  function avatarHtml(z){try{const h=LC19.coach.avatar(z);if(h)return h}catch(e){}return ownAvatar(z)}
  function coachHead(text,extra){
    return'<div class="lc25-coach"><span class="lc25-av lc19-avwrap">'+avatarHtml(44)+'</span><div class="lc25-say"><b>Coach Lanckriet</b><p data-lc25-say>'+E(text)+"</p>"+(canSpeak()?'<button type="button" class="btn btn-quiet btn-sm" data-lc25-listen="'+E(text)+'">'+ic("volume-high")+" Listen</button>":"")+(extra||"")+"</div></div>";
  }
  function canSpeak(){try{return typeof LC19!=="undefined"&&LC19.coach&&LC19.coach._t.info().enabled===true}catch(e){return false}}
  function listen(text){try{LC19.coach.say(text,{title:"Coach Lanckriet"})}catch(e){}}
  function myLink(){
    try{const m=V71.me();if(m&&m.ref_link)return m.ref_link}catch(e){}
    try{const s=V71.studio();if(s&&s.refLink)return s.refLink}catch(e){}
    return CFG.share.base;
  }
  function shareLink(kind,val){return challengeUrl(myLink(),kind,val)}
  function waButton(kind,val,label){
    const url=whatsappLink(challengeText(kind,val,(typeof App!=="undefined"&&App.profile&&App.profile.name)||""),shareLink(kind,val));
    return'<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer" href="'+E(url)+'">'+ic("forward")+" "+E(label||"Challenge a friend on WhatsApp")+"</a>";
  }
  /* The rival link is an admin setting (Admin > Numbers and links > Links: "Rival channel in Skool"). Empty or invalid means the
     Skool community. Only https links are accepted, and Skool links go through skoolCanon like every other Skool link in the hub. */
  const COMMUNITY="https://www.skool.com/lanckriet-chess-1924";
  const cfgVal=(a,b)=>{try{return String(CONFIG[a][b]==null?"":CONFIG[a][b]).trim()}catch(e){return""}};
  const okLink=u=>/^https:\/\/\S{4,2000}$/i.test(String(u||""));
  function rivalUrl(){
    let u=[CFG.rival.url,cfgVal("links","rival"),cfgVal("links","skool"),typeof SKOOL_URLS!=="undefined"?SKOOL_URLS.community:"",COMMUNITY].find(okLink)||COMMUNITY;
    try{if(typeof skoolCanon==="function")u=skoolCanon(u)||u}catch(e){}
    return u;
  }
  function ghostGoal(){
    try{const n=Math.round(+CONFIG.v25.ghostGoal);if(n>=100&&n<=5000)return n}catch(e){}
    return CFG.ghost.goal;
  }

  const ghost={
    st(){return rd(CFG.ghost.key,null)},
    init(){
      if(ghost.st())return;
      const t=totalXp();if(t==null)return;
      if(isAdmin()||t>CFG.ghost.minTotalForNew){wr(CFG.ghost.key,{off:true});return}
      wr(CFG.ghost.key,{t0:Date.now(),base:t,goal:ghostGoal(),won:false});
    },
    state(){const s=ghost.st();if(!s||s.off)return null;return ghostState(s,totalXp(),Date.now())},
    /* when the badge was earned: from this device, or from the server's badge list (a new phone, a cleared cache) */
    wonAt(){
      const s=ghost.st();if(s&&s.wonAt)return +s.wonAt;
      try{const b=((V71.me()||{}).badges||[]).find(x=>x&&x.code==="ghost_slayer");if(b){const t=+new Date(b.awarded_at||b.at||0);return t>0?t:1}}catch(e){}
      return 0;
    },
    html(){
      const s=ghost.state();if(!s)return"";
      const head=s.won?"You beat the ghost":s.over?"The ghost won this week":s.gain>s.ghost?"You are ahead of the ghost":s.gain===s.ghost?"Level with the ghost":"The ghost is ahead";
      const sub=s.won?"The Ghost Slayer badge is yours. It cannot be earned again.":s.over?"The badge was only available in week one.":s.left+" day"+(s.left===1?"":"s")+" left. Reach "+s.goal+" XP to win an exclusive badge.";
      return'<section class="panel pad stack lc25-card" data-lc25-ghost><span class="ar5-kicker">'+ic("ghost")+" Week-one rival</span><h2>"+E(head)+"</h2><p class=\"muted\">"+E(sub)+"</p>"+
        '<div class="lc25-race"><div><span class="small">You · '+s.gain+' XP</span><div class="lc19-bar"><i style="width:'+s.pct+'%"></i></div></div><div><span class="small">Lanckriet-student ghost · '+s.ghost+' XP</span><div class="lc19-bar lc25-gbar"><i style="width:'+s.gpct+'%"></i></div></div></div>'+
        '<div class="btn-row"><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer" href="'+E(rivalUrl())+'">'+ic("user-group")+" "+E(CFG.rival.label)+"</a>"+waButton(s.won?"ghost":"xp",s.won?"1":s.gain)+"</div></section>";
    },
    async tick(){
      try{
        const s=ghost.st();if(!s||s.off||s.won)return;
        const v=ghost.state();if(!v||!v.won)return;
        if(Date.now()>s.t0+CFG.ghost.days*DAY+DAY)return;
        wr(CFG.ghost.key,Object.assign({},s,{won:true,wonAt:Date.now()}));
        try{await V71.member("lc25_ghost_claim",{p_xp:v.gain})}catch(e){}
        openSheet({title:"Ghost Slayer",cls:"lc25-sheet",noFocus:true,html:coachHead("You did it. You out-trained the ghost in week one. That badge is yours for good.")+'<div class="btn-row">'+waButton("ghost","1","Show your friends")+'<button type="button" class="btn btn-primary" data-close>Nice</button></div>'});
      }catch(e){console.error(e)}
    },
    mount(){
      const v=Q("#view");if(!v)return;
      const r=route();
      if(r!=="home"&&r!=="quests"&&r!==""){QA("[data-lc25-ghost]",v).forEach(n=>n.remove());return}
      const html=ghost.html();
      let el=Q("[data-lc25-ghost]",v);
      if(!html){if(el)el.remove();return}
      if(el){if(el._h!==html){el._h=html;const t=document.createElement("div");t.innerHTML=html;const n=t.firstChild;n._h=html;el.replaceWith(n)}return}
      const t=document.createElement("div");t.innerHTML=html;const n=t.firstChild;n._h=html;
      const bar=Q("#lc25-bar");
      v.insertBefore(n,bar&&bar.parentNode===v?bar.nextSibling:v.firstChild);
    }
  };

  /* a friend's challenge link: show it once */
  function incomingChallenge(){
    try{
      const c=parseChallenge(location.search);if(!c)return;
      wr("lc25-incoming",c);
      const p=new URLSearchParams(location.search);p.delete("ch");const rest=p.toString();
      history.replaceState(null,"",location.pathname+(rest?"?"+rest:"")+location.hash);
    }catch(e){}
  }
  const incomingLine=()=>{
    const c=rd("lc25-incoming",null);if(!c)return"";
    if(c.kind==="xp")return"A friend challenged you to beat "+c.val+" XP in your first week.";
    if(c.kind==="ghost")return"A friend beat the Lanckriet-student ghost in week one. Can you?";
    if(c.kind==="pb")return"A friend just cleared their head with 5 focus puzzles.";
    return"A friend invited you to rival them.";
  };

  /* ======================================================================
     F. COACH WELCOME + FIRST BLUNDER REDEMPTION  (Pillar 1)
     ====================================================================== */
  const MSPC_ASK={M:"What did their last move change? What does it threaten now?",S:"Which of my pieces is loose, and what does the position ask for?",P:"What are all the checks, captures and attacks, theirs and mine?",C:"Did I calculate their best reply to the end of the line?"};
  const MSPC_NAME={M:"Move",S:"Specifics",P:"Priorities",C:"Calculation",T:"Clock"};
  const onb={
    welcome(next){
      const line=incomingLine();
      openSheet({title:"Welcome",cls:"lc25-sheet lc25-welcome",noFocus:true,locked:true,
        html:coachHead("Hey, I\u2019m Coach Lanckriet. In the next five minutes I\u2019ll show you the exact move that cost you your last game, and how to never play it again. First, two quick questions so I can help the right way.")+
          (line?'<p class="lc25-friend">'+E(line)+"</p>":"")+'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc25-start>Let\u2019s go '+ic("arrow-right")+"</button></div>",
        onClose(){},
        onMount(s){s.el.addEventListener("click",ev=>{if(ev.target.closest("[data-lc25-start]")){s.close();setTimeout(()=>{try{next()}catch(e){console.error(e)}},260)}})}});
    },
    /* after the 4-step onboarding: connect, find the last lost game, redeem it */
    afterOnboarding(h){
      try{
        if(typeof LC80==="undefined"||!LC80.scan||typeof Engine==="undefined")return false;
        const st=rd(CFG.onb.key,{});if(st.done)return false;
        redemption.open(h||{});
        return true;
      }catch(e){console.error("lc25 onb",e);return false}
    }
  };

  async function fetchLastLoss(site,user,max){
    user=String(user||"").trim();
    if(!/^[A-Za-z0-9_-]{2,30}$/.test(user))throw new Error("name");
    const S=LC80.scan,out=[];
    const accept=g=>{
      if(!g||!g.moves||g.moves.length<CFG.onb.minPlies)return null;
      const c=lossOf(g.headers||{},user,site);if(!c)return null;
      g.color=c;return g;
    };
    if(site==="li"){
      const r=await fetchWithTimeout("https://lichess.org/api/games/user/"+encodeURIComponent(user)+"?max="+max+"&moves=true&tags=true&opening=true&finished=true",{headers:{Accept:"application/x-chess-pgn"}},12e3);
      if(!r||!r.ok)throw new Error("http");
      const pg=S.splitGames(await r.text()).pgns;
      for(const p of pg){const g=accept(S.parseGame(p));if(g)return g}
      return null;
    }
    const ra=await fetchWithTimeout("https://api.chess.com/pub/player/"+encodeURIComponent(user.toLowerCase())+"/games/archives",{},12e3);
    if(!ra||!ra.ok)throw new Error("http");
    const arch=(await ra.json()).archives||[];
    let seen=0;
    for(const mu of arch.slice(-3).reverse()){
      if(!/^https:\/\/api\.chess\.com\//.test(mu))continue;
      const rm=await fetchWithTimeout(mu,{},12e3);if(!rm||!rm.ok)continue;
      const games=((await rm.json()).games||[]).slice().reverse();
      for(const x of games){
        if(seen++>=max)return null;
        if(!x||!x.pgn||(x.rules&&x.rules!=="chess"))continue;
        const g=S.parseGame(x.pgn);if(!g)continue;
        const hit=accept(g);if(hit)return hit;
      }
    }
    return null;
  }

  const redemption={
    open(h){
      const handles={cc:h.cc||(App.profile&&App.profile.chess_com_username)||"",li:h.li||(App.profile&&App.profile.lichess_username)||""};
      let cancel=false,mini=null;
      openSheet({title:"Your first blunder redemption",cls:"lc25-sheet",noFocus:true,html:'<div data-lc25-red></div>',
        onClose(){cancel=true;try{Engine.stop()}catch(e){}},
        onMount(s){
          const root=Q("[data-lc25-red]",s.el);
          let cur=null;                                    /* the game being redeemed, for the Level 2 popup */
          const skip=()=>{s.close();try{LC80.openGames({first:true})}catch(e){}};
          const ask=(msg)=>{
            root.innerHTML=coachHead(msg||"Type your Chess.com or Lichess username and I\u2019ll find your most recent lost game. One tap, no password.")+
              '<div class="uc-btn-row"><label class="field"><span class="field-label">Site</span><select class="input" data-site><option value="cc"'+(handles.cc||!handles.li?" selected":"")+'>Chess.com</option><option value="li"'+(!handles.cc&&handles.li?" selected":"")+'>Lichess</option></select></label>'+
              '<label class="field"><span class="field-label">Username</span><input class="input" data-user maxlength="30" autocapitalize="off" spellcheck="false" value="'+E(handles.cc||handles.li||"")+'"></label></div>'+
              '<p class="cms-err" data-err aria-live="polite"></p><div class="btn-row"><button type="button" class="btn btn-primary" data-go>'+ic("bolt")+' Find my last loss</button><button type="button" class="btn btn-quiet" data-skip>Skip for now</button></div>';
          };
          async function run(site,user){
            root.innerHTML=coachHead("Looking for your latest lost game…")+'<p class="muted" data-status>Fetching games…</p><div class="lc80-bar"><span data-fill style="width:0%"></span></div><p class="small muted">While I work, here is a quick one:</p><div data-mini class="lc25-pb"></div>';
            mini=miniPuzzle(Q("[data-mini]",root));
            const status=Q("[data-status]",root),fill=Q("[data-fill]",root);
            let g=null;
            try{g=await fetchLastLoss(site,user,CFG.onb.maxScan)}
            catch(e){if(cancel)return;ask(/name/.test(String(e&&e.message))?"That username doesn\u2019t look right. Check the spelling.":"I couldn\u2019t reach "+(site==="li"?"Lichess":"Chess.com")+" right now. Try again in a moment.");return}
            if(cancel)return;
            if(!g){ask("I couldn\u2019t find a recent lost game there. Check the username, or skip and review a game later.");return}
            status.textContent="Found it: "+g.label+". Starting Stockfish…";
            let items=null;
            try{
              if(!(await Engine.load()))throw new Error("engine");
              items=await LC80.scan.analyseGame(g,(k,tot)=>{status.textContent="Move "+Math.ceil((k+1)/2)+" of "+Math.ceil(tot/2)+"…";fill.style.width=Math.round((k+1)/tot*100)+"%"},()=>cancel);
            }catch(e){if(cancel||/cancelled/.test(String(e&&e.message)))return;root.innerHTML=coachHead("Stockfish couldn\u2019t start on this device, so I can\u2019t scan right now. You can still review a game in Trim later.")+'<div class="btn-row"><button type="button" class="btn btn-primary" data-skip>Continue</button></div>';return}
            if(cancel)return;
            const bad=pickRedemption(items);
            cur=g;
            if(!bad){root.innerHTML=coachHead("No single blunder lost this one: it slipped away over several moves. That is common, and the full review in Trim shows exactly where. Here is your first +"+CFG.quest.redeemXp+" XP anyway.")+'<div class="btn-row"><button type="button" class="btn btn-primary" data-fin>Continue</button></div>';award(g);return}
            quiz(g,bad);
          }

          function quiz(g,it){
            const fen=g.fens[it.i],side=it.color,k=it.k||"S";
            let tries=0,finished=false,board=null;
            root.innerHTML=coachHead("Move "+it.num+": you played "+it.san+markOf(it.cls)+" It cost you about "+Math.round(it.loss)+" points of winning chances. Can you find something better from here?")+
              '<p class="small muted"><b>Leak: '+E(MSPC_NAME[k])+".</b> "+E(it.detail||"")+'</p><div data-q class="lc25-pb"></div><p data-qf aria-live="polite" class="lc25-fb"></p><div class="btn-row" data-qa><button type="button" class="btn btn-quiet btn-sm" data-show>Show me</button></div>';
            const fb=t=>{Q("[data-qf]",root).innerHTML=t},qa=Q("[data-qa]",root);
            const end=(msg)=>{if(finished)return;finished=true;try{board.setInteractive(null)}catch(e){}fb(msg);qa.innerHTML='<button type="button" class="btn btn-primary" data-fin>Continue</button>';award(g,it)};
            const best=it.bestSan||"the best move";
            const reveal=()=>{try{board.setArrows([{from:it.best.slice(0,2),to:it.best.slice(2,4),kind:"best"}])}catch(e){}end("The move was <b>"+E(best)+"</b>. Ask yourself <i>"+E(MSPC_ASK[k]||MSPC_ASK.S)+"</i> before every move and you save this game.")};
            try{
              board=Board(Q("[data-q]",root),{fen:fen,orientation:side==="b"?"black":"white",onMove:async m=>{
                if(finished)return;
                const u=(m.from+m.to).toLowerCase();
                if(it.best&&u===it.best.slice(0,4).toLowerCase()){board.setPosition(new Chess(fen).fen());end("<b class=\"lc25-ok\">"+ic("check")+" That is the move.</b> "+E(best));return}
                const gg=new Chess(fen),mv=gg.move({from:m.from,to:m.to,promotion:m.promotion||"q"});
                try{board.setPosition(fen)}catch(e){}
                if(!mv)return;
                fb("Checking with the engine…");
                const r=await alt.check({fen:fen,from:m.from,to:m.to,promotion:m.promotion,san:mv.san});
                if(finished)return;
                if(r&&r.tier==="full"){end("<b class=\"lc25-ok\">"+ic("check")+" "+E(mv.san)+" works too.</b> "+E(r.text));return}
                tries++;try{board.shake&&board.shake()}catch(e){}
                if(r&&r.tier==="mostly"){if(tries>=3)reveal();else fb("<b>Close.</b> "+E(mv.san)+" is playable, but this position has a better move. Run M, S, P, C and try again ("+(3-tries)+" left).");return}
                if(tries>=3)reveal();else fb("That still loses ground. Run M, S, P, C and try again ("+(3-tries)+" left).");
              }});
              board.setInteractive(side);
            }catch(e){reveal()}
            qa.addEventListener("click",ev=>{if(ev.target.closest("[data-show]"))reveal()});
          }
          root.addEventListener("click",ev=>{
            if(ev.target.closest("[data-skip]")){skip();return}
            if(ev.target.closest("[data-fin]")){celebrate(s,cur);return}
            if(ev.target.closest("[data-go]")){
              const user=Q("[data-user]",root).value.trim(),site=Q("[data-site]",root).value;
              const e=Q("[data-err]",root);
              if(!/^[A-Za-z0-9_-]{2,30}$/.test(user)){e.textContent="Enter your username (letters, numbers, - and _).";return}
              try{App.profile=sanitizeProfile(Object.assign({},App.profile,site==="li"?{lichess_username:user}:{chess_com_username:user}));App.save()}catch(x){}
              run(site,user);
            }
          });
          const first=handles.cc?["cc",handles.cc]:handles.li?["li",handles.li]:null;
          if(first)run(first[0],first[1]);else ask();
        }});
    }
  };
  let awarded=false;
  function award(g,it){
    if(awarded)return;awarded=true;
    const st=rd(CFG.onb.key,{});
    if(!st.xp){
      try{V6.addXp("think",CFG.quest.redeemXp,{noBench:true,noFw:true})}catch(e){}
      wr(CFG.onb.key,Object.assign({},st,{xp:true,t:Date.now(),pgn:g&&g.pgn?String(g.pgn).slice(0,60000):"",user:g&&g.color||"w"}));
    }
    try{const q=rd(CFG.quest.key,null);if(q&&q.on&&q.level===1)wr(CFG.quest.key,questAfterRedemption(q,totalXp()))}catch(e){}
  }
  function celebrate(sheet,g){
    sheet.close();
    setTimeout(()=>{
      openSheet({title:"Level 2",cls:"lc25-sheet lc25-level",noFocus:true,
        html:'<div class="lc25-pop">'+ic("trophy")+"<h2>Level 2 unlocked</h2><p><b>+"+CFG.quest.redeemXp+" XP</b></p></div>"+coachHead("That is how a blunder gets fixed: you saw the leak and found the better move. Next quest: run the full analysis on this same game and I\u2019ll open the core roadmap for you.")+
          '<div class="btn-row"><button type="button" class="btn btn-primary" data-lc25-q>'+ic("scissors")+" Full game analysis (+"+CFG.quest.analysisXp+' XP)</button>'+waButton("lvl","2","Challenge a friend")+'<button type="button" class="btn btn-quiet" data-close>Later</button></div>',
        onMount(s){s.el.addEventListener("click",ev=>{if(ev.target.closest("[data-lc25-q]")){s.close();startAnalysisQuest(g)}})}});
    },280);
  }
  /* Level 2 -> 3: run the full review (Trim) on the same game; the XP lands when the review is stored */
  const trimCount=()=>{try{const s=Store.get("lc-hub-trim-stats-v1",{})||{};return Object.keys(s.games||{}).length}catch(e){return 0}};
  const mistakeCount=()=>{try{return MistakeLog.all().length}catch(e){return 0}};
  function startAnalysisQuest(g){
    const st=rd(CFG.onb.key,{});
    if(st.analysis)return say$("You already finished this quest.");
    const base={t:trimCount(),m:mistakeCount()};
    wr(CFG.onb.key,Object.assign({},st,{wait:base,waitAt:Date.now()}));
    try{App.ui.trimLoad={pgn:(g&&g.pgn)||st.pgn,id:null,user:(g&&g.color)||st.user||"w",review:false}}catch(e){}
    location.hash="#trim";
    watchAnalysis();
  }
  function watchAnalysis(){
    const t=setInterval(()=>{
      const st=rd(CFG.onb.key,{});
      if(!st.wait||st.analysis){clearInterval(t);return}
      if(Date.now()-(st.waitAt||0)>30*60*1e3){clearInterval(t);return}
      if(trimCount()>st.wait.t||mistakeCount()>st.wait.m){
        clearInterval(t);
        wr(CFG.onb.key,Object.assign({},st,{analysis:true,done:true,doneAt:Date.now()}));
        try{V6.addXp("think",CFG.quest.analysisXp,{noBench:true,noFw:true})}catch(e){}
        setTimeout(()=>openSheet({title:"Level 3",cls:"lc25-sheet lc25-level",noFocus:true,html:'<div class="lc25-pop">'+ic("trophy")+"<h2>Level 3 unlocked</h2><p><b>+"+CFG.quest.analysisXp+" XP</b></p></div>"+coachHead("Full game analysis done. The core roadmap is open: openings, puzzles, drills. Start with whatever your leak told you.")+'<div class="btn-row">'+waButton("lvl","3","Challenge a friend")+'<button type="button" class="btn btn-primary" data-close>Open the hub</button></div>'}),400);
      }
    },3000);
  }

  /* Built-in mate-in-one puzzles (gen/make_pool.mjs: each has exactly ONE mating move, both colours to move). The app's own offline bank
     (PUZZLE_BANK) is filled by the admin and was empty in the published content, which made the wait puzzle and an offline Penalty Box do
     nothing, so these are the fallback. */
  const POOL=[{"id":"lc25-m1-01","fen":"6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1","solution":["a1a8"]},{"id":"lc25-m1-02","fen":"r5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1","solution":["a8a1"]},{"id":"lc25-m1-03","fen":"6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1","solution":["g5f7"]},{"id":"lc25-m1-04","fen":"7k/R7/1R6/8/8/8/8/6K1 w - - 0 1","solution":["b6b8"]},{"id":"lc25-m1-05","fen":"7k/8/5NK1/8/8/8/8/6R1 w - - 0 1","solution":["g1h1"]},{"id":"lc25-m1-06","fen":"3Q4/8/1p6/7k/8/K3B3/8/2B5 w - - 0 1","solution":["d8g5"]},{"id":"lc25-m1-07","fen":"3K4/5r2/8/3P1P2/8/6k1/5n2/1q6 b - - 0 1","solution":["b1b8"]},{"id":"lc25-m1-08","fen":"8/n4r2/P7/8/7r/1K6/8/1k6 b - - 0 1","solution":["f7f3"]},{"id":"lc25-m1-09","fen":"K3k3/8/5Q2/5R2/8/B7/8/8 w - - 0 1","solution":["f6e7"]},{"id":"lc25-m1-10","fen":"8/4Q3/8/1K1p4/3k4/5p2/8/3N4 w - - 0 1","solution":["e7e3"]},{"id":"lc25-m1-11","fen":"8/8/8/8/2P5/5n2/r7/1k5K b - - 0 1","solution":["a2h2"]},{"id":"lc25-m1-12","fen":"K7/4qk2/8/2r5/2P5/8/8/8 b - - 0 1","solution":["c5c8"]},{"id":"lc25-m1-13","fen":"8/8/8/8/5n2/3k4/5K2/4r1r1 b - - 0 1","solution":["e1f1"]},{"id":"lc25-m1-14","fen":"8/3p2p1/8/8/4N2p/7k/7B/7K w - - 0 1","solution":["e4f2"]}];
  let poolLast="";
  function poolPick(skip){
    const free=POOL.filter(p=>!(skip&&skip.has(p.id))&&p.id!==poolLast);const list=free.length?free:POOL;
    const p=list[Math.floor(Math.random()*list.length)];poolLast=p.id;return p;
  }

  /* loading-screen mini puzzle: one move, from the app's bank when it has puzzles, else the built-in pool. No network. */
  function miniPuzzle(host){
    try{
      const bank=typeof PUZZLE_BANK!=="undefined"&&Array.isArray(PUZZLE_BANK)?PUZZLE_BANK:[];
      let p=null;
      if(bank.length&&typeof PuzzleFeed!=="undefined"){
        try{const pick=bank.filter(b=>b.rating<=1400);const b=(pick.length?pick:bank)[Math.floor(Math.random()*(pick.length||bank.length))];p=PuzzleFeed.fromBank(b)}catch(e){p=null}
      }
      if(!p||!p.fen||!p.solution)p=poolPick();
      const side=String(p.fen).split(" ")[1]==="b"?"b":"w",want=p.solution[0];
      host.innerHTML='<p class="small muted lc25-pn">Mini puzzle · '+(side==="w"?"White":"Black")+' to move</p><div data-mp class="lc25-pb lc25-mini"></div><p data-mf class="lc25-fb" aria-live="polite"></p>';
      const bd=Board(Q("[data-mp]",host),{fen:p.fen,orientation:side==="b"?"black":"white",onMove(m){
        const u=(m.from+m.to).toLowerCase(),f=Q("[data-mf]",host);
        if(u===want.slice(0,4)){f.innerHTML='<b class="lc25-ok">'+ic("check")+" Correct.</b>";bd.setInteractive(null)}
        else{f.textContent="Not that one.";try{bd.setPosition(p.fen);bd.shake&&bd.shake()}catch(e){}}
      }});
      bd.setInteractive(side);
      return bd;
    }catch(e){return null}
  }

  /* ======================================================================
     F2. A MINI PUZZLE WHILE STOCKFISH WARMS UP  (Pillar 7: "mini-puzzles on loading screens")
     The first Engine.load() of a session can take several seconds on a phone. If it is still pending after 1.5 s a small card appears at the
     top of the page with a one-move puzzle from the local bank (no network), and goes away by itself when the engine is ready.
     ====================================================================== */
  const wait={
    el:null,
    watch(p){
      try{
        if(!p||typeof p.then!=="function")return p;
        wait.dismissed=false;
        const tm=setTimeout(()=>wait.show(),1500);
        const stop=()=>{clearTimeout(tm);wait.hide()};
        p.then(stop,stop);
      }catch(e){}
      return p;
    },
    show(){
      try{
        if(wait.el||wait.dismissed||Q(".sheet-wrap")||rd("lc25-wait",true)===false)return;
        const el=document.createElement("section");el.className="panel pad stack lc25-card lc25-wait";el.setAttribute("aria-live","polite");
        el.innerHTML='<button type="button" class="btn btn-quiet btn-sm lc25-wait-x" data-lc25-wait-close aria-label="Hide this puzzle">'+ic("xmark")+'</button><span class="ar5-kicker">'+ic("bolt")+' Stockfish is warming up</span><p class="small muted">One quick puzzle while you wait.</p><div data-lc25-wait class="lc25-pb"></div>';
        document.body.appendChild(el);                             /* fixed to the screen: visible wherever the member has scrolled to */
        const cb=Q(".cbar");const off=cb&&cb.getClientRects().length?Math.round(cb.getBoundingClientRect().height)+8:0;   /* above the Continue bar when it is showing */
        el.style.bottom="calc("+(10+off)+"px + env(safe-area-inset-bottom,0px))";
        wait.el=el;
        if(!miniPuzzle(Q("[data-lc25-wait]",el)))wait.hide();
      }catch(e){wait.hide()}
    },
    hide(){try{if(wait.el){wait.el.remove();wait.el=null}}catch(e){wait.el=null}},
    dismissed:false
  };

  /* ======================================================================
     F3. CELEBRATION POPUPS WAIT FOR MODAL SHEETS
     Found in a real browser: the "Status unlocked: OG" popup fired in the middle of the onboarding question and covered its answer buttons.
     While any modal sheet is open, popups are queued (at most 3, no duplicates) and shown one by one once the sheets are closed.
     ====================================================================== */
  const cele={
    q:[],t:0,orig:{},
    wrap(){
      try{
        if(typeof Celebrate==="undefined"||!Celebrate||Celebrate._lc25)return;
        Object.keys(Celebrate).forEach(k=>{
          const f=Celebrate[k];if(typeof f!=="function")return;
          cele.orig[k]=f;
          Celebrate[k]=function(){
            if(!Q(".sheet-wrap"))return f.apply(this,arguments);
            const args=[].slice.call(arguments),sig=k+"|"+JSON.stringify(args);
            if(cele.q.length<3&&!cele.q.some(x=>x.sig===sig))cele.q.push({k:k,args:args,sig:sig});
            cele.arm();
          };
        });
        Celebrate._lc25=1;
      }catch(e){console.error("lc25 celebrate",e)}
    },
    arm(){
      if(cele.t)return;
      cele.t=setInterval(()=>{
        if(Q(".sheet-wrap"))return;
        const it=cele.q.shift();
        if(!it){clearInterval(cele.t);cele.t=0;return}
        try{cele.orig[it.k].apply(Celebrate,it.args)}catch(e){}
      },1500);
    }
  };

  /* ======================================================================
     G. AUDIO RECAP  (Pillar 7)
     ====================================================================== */
  const recap={
    script:recapScript,
    play(w){
      try{
        const name=(typeof App!=="undefined"&&App.profile&&App.profile.name)||"";
        const text=recapScript(w,name);
        if(!text){say$("No games to recap yet.");return false}
        if(!canSpeak()){say$("The coach voice is not available right now.");return false}
        LC19.coach.say(text,{title:"Your "+w.kind+" recap"});
        return true;
      }catch(e){console.error(e);return false}
    }
  };

  /* ======================================================================
     I. MOVE-BY-MOVE MSPC NOTES  (Pillar 2)
     mspc-notes.json sits next to content.json (built offline by gen/build-notes.mjs). Keyed by position + move, so it never touches the
     course data and survives transpositions. Shown under the move in Learn mode and after a correct drill move. The coach voice reads the
     paragraphs like any other text (its Listen button picks up every #view paragraph).
     ====================================================================== */
  /* One loader for the two JSON files that sit next to the course JSON in your GitHub repo (mspc-notes.json, short-texts.json).
     URL: an admin override (Settings > Training flow), else the sibling of the course file. The course file is published as
     .../Json-van-app/main/json, so a sibling is .../main/<file>: swap the last path segment, whatever it is called.
     A saved copy (Cache API) is served at once, then refreshed from the network in the background. The service worker keeps caches
     named lc-notes-* (see sw.js), so the copy survives app updates and everything works offline.
     fetchWithTimeout adds its own cache-buster, so a fresh copy is fetched each time. */
  function remote(o){
    const r={map:null,loading:null,failAt:0,fresh:false,CACHE:"lc-notes-v1",CKEY:"https://lc-notes.invalid/"+o.file};
    r.url=function(){
      const own=cfgVal("v25",o.cfg);
      if(okLink(own))return own;
      let u="";
      try{u=String(Feed.rawUrl()||"")}catch(e){}
      if(!/^https:\/\//.test(u))u="https://raw.githubusercontent.com/lanckrietchess/Json-van-app/main/json";
      return u.replace(/[^\/?#]*(\?.*)?$/,o.file);
    };
    r.valid=j=>!!j&&typeof j==="object"&&!!j[o.field]&&typeof j[o.field]==="object"&&!Array.isArray(j[o.field]);
    r.restore=async function(){
      try{if(typeof caches==="undefined")return null;const c=await caches.open(r.CACHE),x=await c.match(r.CKEY);const j=x?await x.json():null;return r.valid(j)?j:null}catch(e){return null}
    };
    r.save=async function(j){
      try{if(typeof caches==="undefined"||typeof Response==="undefined")return;const c=await caches.open(r.CACHE);await c.put(r.CKEY,new Response(JSON.stringify(j),{headers:{"Content-Type":"application/json"}}))}catch(e){}
    };
    r.ensure=function(){
      if(r.fresh||r.loading||Date.now()-r.failAt<3e5)return r.loading||Promise.resolve(r.map);
      r.loading=(async()=>{
        if(!r.map){const c=await r.restore();if(c)r.map=c[o.field]}                     /* instant, works offline */
        try{
          const x=await fetchWithTimeout(r.url(),{cache:"no-store",credentials:"omit"},15e3);
          if(!x||!x.ok)throw new Error("http");
          const j=await x.json();
          if(!r.valid(j))throw new Error("shape");
          r.map=j[o.field];r.fresh=true;r.save(j);
        }catch(e){r.failAt=Date.now()}                                                  /* keep the saved copy if there is one */
        r.loading=null;
        return r.map;
      })();
      return r.loading;
    };
    return r;
  }

  const notes=Object.assign(remote({file:"mspc-notes.json",cfg:"notesUrl",field:"notes"}),{
    key(fen,san){return String(fen||"").split(" ").slice(0,3).join(" ")+"|"+String(san||"").replace(/[+#!?]+$/g,"")},
    get(fen,san){
      const m=notes.map;if(!m){notes.ensure();return null}
      const n=m[notes.key(fen,san)];
      return n&&typeof n==="object"&&typeof n.w==="string"?n:null;
    },
    /* feedback object in, same object (plus .mspc) out. Never throws, never changes the original. */
    attach(fb,fen,san,open){
      try{
        if(!fb||typeof fb!=="object"||rd("lc25-notes",true)===false)return fb;
        const n=notes.get(fen,san);if(!n)return fb;
        return Object.assign({},fb,{mspc:n,mspcOpen:!!open});
      }catch(e){return fb}
    },
    html(n,open){
      if(!n||typeof n!=="object")return"";
      const row=(k,t)=>t?'<p class="mspc25-row"><b>'+k+'.</b> '+E(t)+"</p>":"";
      return'<details class="mspc25"'+(open?" open":"")+"><summary>"+ic("lightbulb")+"<b>Why this move</b>"+(n.r?'<span class="mspc25-r">'+E(n.r)+"</span>":"")+"</summary>"+
        (n.w?'<p class="mspc25-w">'+E(n.w)+"</p>":"")+row("Move",n.m)+row("Specifics",n.s)+row("Priorities",n.p)+row("Calculation",n.c)+"</details>";
    }
  });

  /* ======================================================================
     J. LONG TEXTS: FOLD + OPTIONAL SHORT VERSIONS  (Pillar 2: "short, punchy, human")
     Every long course text goes through feedbackHTML or debriefHTML. Over foldChars (default 280) it shows its first sentences with
     "Read more". If short-texts.json has a rewrite for that exact text it is shown instead, with "Show full text". The key is a hash
     of the exact original, so editing a course text silently retires its old rewrite. The original is never changed or lost.
     ====================================================================== */
  const fnv=str=>{let h=0x811c9dc5;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,"0")};
  const normText=t=>String(t==null?"":t).replace(/\s+/g," ").trim();
  const textKey=t=>{const n=normText(t);return fnv(n)+":"+n.length};
  const ABBR=/^(vs|e\.g|i\.e|etc|no|approx|ca|cf|fig|st|dr|mr|mrs|ms|prof|jr|sr)$/i;
  /* sentences and lines, without cutting after a move number ("2. Nf3") or an abbreviation ("e.g. Nf3") */
  function sentences(text){
    const units=[];
    String(text).replace(/\r/g,"").split(/\n+/).forEach(line=>{
      line=line.trim();if(!line)return;
      let start=0,m;const re=/([.!?]+["\u201d\u2019')\]]*)\s+(?=["\u201c\u2018('\[]?[A-Z0-9])/g;
      while((m=re.exec(line))){
        const before=line.slice(start,m.index+m[1].length);
        const word=(before.match(/(\S+?)[.!?]+["\u201d\u2019')\]]*$/)||[])[1]||"";
        if(/^\d+$/.test(word)||ABBR.test(word))continue;
        units.push(before.trim());start=m.index+m[0].length;
      }
      const rest=line.slice(start).trim();if(rest)units.push(rest);
    });
    return units;
  }
  /* {head} when the text is worth folding, else null. At most 3 sentences, at most `limit` characters, never a tiny leftover. */
  function foldParts(text,limit){
    const full=normText(text);
    if(!(limit>0)||full.length<=limit)return null;
    let head="",n=0;
    for(const u of sentences(text)){
      if(n>=3)break;
      const next=head?head+" "+u:u;
      if(n>=1&&next.length>limit)break;
      head=next;n++;
    }
    if(!head)return null;
    if(head.length>limit*1.5){                       /* one endless sentence: cut at a word boundary */
      const cut=head.slice(0,limit).replace(/\s+\S*$/,"").replace(/[,;:\-\u2013]$/,"");
      head=cut+"\u2026";
    }
    if(full.length-head.length<Math.max(80,limit*0.3))return null;
    return{head:head,full:full};
  }
  const foldChars=()=>{try{const v=CONFIG.v25&&CONFIG.v25.foldChars;if(v===0||v==="0")return 0;const n=Math.round(+v);if(n>=120&&n<=2000)return n}catch(e){}return 280};
  const shorts=remote({file:"short-texts.json",cfg:"shortTextsUrl",field:"texts"});
  const AT=s=>E(s);
  const fold={
    key:textKey,parts:foldParts,sentences:sentences,hash:fnv,short:shorts,
    /* a rewrite for this exact text, or null */
    shortOf(text){
      const m=shorts.map;if(!m){shorts.ensure();return null}
      const v=m[textKey(text)];
      return typeof v==="string"&&v.trim()?v.trim():null;
    },
    /* the paragraph for a text: plain when short, otherwise a wrapper with the opening and a Read more button. Never throws. */
    p(text,cls){
      const raw=String(text==null?"":text),c=cls?' class="'+E(cls)+'"':"";
      const plain='<p'+c+'>'+E(raw)+"</p>";
      try{
        if(rd("lc25-fold",true)===false)return plain;
        const lim=foldChars();if(!(lim>0))return plain;
        const full=normText(raw);if(full.length<=lim)return plain;
        let head=null,label="Read more";
        const sh=fold.shortOf(raw);
        if(sh&&sh.length<full.length){head=sh;label="Show full text"}
        else{const f=foldParts(raw,lim);if(f)head=f.head}
        if(!head)return plain;
        return'<div class="fold25w"><p'+c+'>'+E(head)+'</p><button type="button" class="fold25-b" data-fold25 data-full="'+AT(raw)+'" data-short="'+AT(head)+'" data-more="'+AT(label)+'" aria-expanded="false">'+E(label)+"</button></div>";
      }catch(e){return plain}
    },
    toggle(btn){
      const p=btn.previousElementSibling;if(!p)return;
      const open=btn.getAttribute("aria-expanded")==="true";
      p.textContent=open?btn.getAttribute("data-short"):btn.getAttribute("data-full");
      btn.setAttribute("aria-expanded",open?"false":"true");
      btn.textContent=open?btn.getAttribute("data-more"):"Show less";
    }
  };


  /* ======================================================================
     K. TECH THEME  (Pillar 7: dark #0a0e17, electric blue, gold)
     Only CSS variables change (see lc25.css, html[data-lc25-theme="tech"]), so every screen keeps its layout. On by default; members switch it off
     in Settings ("Tech theme"), and the admin setting v25.techTheme switches it off for everyone.
     ====================================================================== */
  const theme={
    on(){
      try{if(CONFIG.v25&&CONFIG.v25.techTheme===false)return false}catch(e){}
      try{if(App.settings.lc25Theme===false)return false}catch(e){}
      return true;
    },
    apply(){
      try{
        const on=theme.on(),h=document.documentElement;
        if(on)h.setAttribute("data-lc25-theme","tech");else h.removeAttribute("data-lc25-theme");
        const m=Q('meta[name="theme-color"]');if(m){if(on&&!m.hasAttribute("data-lc25-was"))m.setAttribute("data-lc25-was",m.getAttribute("content")||"");m.setAttribute("content",on?"#0a0e17":(m.getAttribute("data-lc25-was")||m.getAttribute("content")))}
      }catch(e){}
    }
  };

  /* ======================================================================
     L. THE APP IS ALL ENGLISH, ON ANY PHONE
     The app's own text is English. What the *browser* draws is in the phone's language, which would make a Dutch phone show a half-Dutch app:
     the native file picker ("Bestand kiezen"), form-validation bubbles ("Vul dit veld in"), date pickers, and Chrome's offer to translate the page.
     When the browser language is not English this module replaces those with English ones. English phones keep their native controls.
     (Date and time formatting is fixed in the app code itself: every toLocale call names an English locale.) Off switch: localStorage["lc25-english"]=false.
     ====================================================================== */
  const english={
    need(){
      try{const o=rd("lc25-english",null);if(o===true)return true;if(o===false)return false}catch(e){}
      const l=String((typeof navigator!=="undefined"&&(navigator.language||(navigator.languages&&navigator.languages[0])))||"en");
      return!/^en([-_]|$)/i.test(l);
    },
    /* a phrase in the published privacy text names the Belgian regulator in Dutch and French; the English name is already in the sentence */
    fix(t){return String(t).replace(/\(Gegevensbeschermingsautoriteit \/ Autorit\u00e9 de protection des donn\u00e9es,\s*/g,"(")},
    fileLabel(inp){
      const a=String(inp.getAttribute("accept")||"").toLowerCase(),m=inp.multiple;
      return a.indexOf("image")>=0?(m?"Choose images":"Choose an image"):a.indexOf(".pgn")>=0?"Choose a PGN file":a.indexOf("json")>=0?"Choose a JSON file":(m?"Choose files":"Choose a file");
    },
    fileUi(root){
      QA('input[type="file"]:not([data-lc25-file])',root).forEach(inp=>{
        inp.setAttribute("data-lc25-file","1");
        if(inp.matches("[hidden],.sr-only,.visually-hidden,.hidden")||inp.closest("[hidden]"))return;     /* the app already draws its own control */
        inp.classList.add("lc25-file-native");
        const ui=document.createElement("span");ui.className="lc25-fileui";
        ui.innerHTML='<span class="btn btn-ghost btn-sm lc25-filebtn">'+E(english.fileLabel(inp))+'</span><span class="small muted lc25-filename">No file chosen</span>';
        inp.insertAdjacentElement("afterend",ui);
        inp.addEventListener("change",()=>{const f=inp.files,n=f?f.length:0;ui.querySelector(".lc25-filename").textContent=n?f[0].name+(n>1?" +"+(n-1)+" more":""):"No file chosen"});
        if(!inp.closest("label"))ui.addEventListener("click",()=>inp.click());        /* inside a label the browser already opens the picker */
      });
    },
    DT:{date:["YYYY-MM-DD","\\d{4}-\\d{2}-\\d{2}"],time:["HH:MM","([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?"],"datetime-local":["YYYY-MM-DD HH:MM","\\d{4}-\\d{2}-\\d{2}[T ]([01]\\d|2[0-3]):[0-5]\\d"],month:["YYYY-MM","\\d{4}-(0[1-9]|1[0-2])"],week:["YYYY-Www","\\d{4}-W(0[1-9]|[1-4]\\d|5[0-3])"]},
    dateInputs(root){
      QA('input[type="date"],input[type="time"],input[type="datetime-local"],input[type="month"],input[type="week"]',root).forEach(inp=>{
        const t=inp.type,d=english.DT[t];if(!d||inp.hasAttribute("data-lc25-was"))return;
        inp.setAttribute("data-lc25-was",t);const v=inp.value;
        inp.type="text";inp.value=v;inp.placeholder=d[0];inp.setAttribute("pattern",d[1]);inp.setAttribute("inputmode","numeric");inp.setAttribute("autocomplete","off");
        if(!inp.title)inp.title="Format: "+d[0];
        if(t==="datetime-local")inp.addEventListener("input",()=>{if(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(inp.value))inp.value=inp.value.replace(" ","T")});
      });
    },
    /* the text of a failed native validation, in English */
    message(el){
      const v=el.validity||{},t=String(el.type||"").toLowerCase();
      if(v.valueMissing)return t==="checkbox"?"Please check this box if you want to proceed.":t==="radio"?"Please select one of these options.":el.tagName==="SELECT"?"Please select an item in the list.":t==="file"?"Please select a file.":"Please fill out this field.";
      if(v.typeMismatch)return t==="email"?"Please enter a valid email address.":t==="url"?"Please enter a valid URL.":"Please enter a valid value.";
      if(v.patternMismatch)return el.title?"Please match the requested format: "+el.title:"Please match the requested format.";
      if(v.tooShort)return"Please use at least "+el.minLength+" characters.";
      if(v.tooLong)return"Please use at most "+el.maxLength+" characters.";
      if(v.rangeUnderflow)return"Value must be at least "+el.min+".";
      if(v.rangeOverflow)return"Value must be at most "+el.max+".";
      if(v.stepMismatch||v.badInput)return"Please enter a valid value.";
      return"Please check this field.";
    },
    validity(){
      if(english._v)return;english._v=1;
      document.addEventListener("invalid",e=>{try{const el=e.target;if(el&&el.setCustomValidity&&english.need()){el.setCustomValidity(english.message(el));el._lc25v=1}}catch(x){}},true);
      const clear=e=>{try{const el=e.target;if(el&&el._lc25v){el._lc25v=0;el.setCustomValidity("")}}catch(x){}};
      document.addEventListener("input",clear,true);document.addEventListener("change",clear,true);
    },
    apply(root){
      try{if(!english.need())return;english.validity();english.fileUi(root||document);english.dateInputs(root||document)}catch(e){console.error("lc25 english",e)}
    },
    watch(){
      if(english._o||!english.need())return;
      let t=0;english.apply(document);
      english._o=new MutationObserver(()=>{if(t)return;t=setTimeout(()=>{t=0;english.apply(document)},180)});
      english._o.observe(document.body,{childList:true,subtree:true});
    }
  };

  /* ======================================================================
     H. WIRING
     ====================================================================== */
  let started=false;
  function init(){
    if(started)return;started=true;
    incomingChallenge();
    /* Pillar 3: feed the flashcard buffer from the opening trainer's spaced-repetition hooks */
    try{
      if(typeof V36!=="undefined"&&V36&&!V36._lc25){
        const hit=V36.srsHit,miss=V36.srsMiss;
        if(typeof hit==="function")V36.srsHit=function(cfg,move,fen){try{flash.note(true,move,fen)}catch(e){}return hit.apply(this,arguments)};
        if(typeof miss==="function")V36.srsMiss=function(cfg,move,fen){try{flash.note(false,move,fen)}catch(e){}return miss.apply(this,arguments)};
        V36._lc25=1;
      }
    }catch(e){console.error("lc25 srs",e)}
    /* Pillar 2: attach the MSPC note to Learn mode's per-move feedback */
    try{
      if(typeof V36!=="undefined"&&V36&&!V36._lc25n&&typeof V36.learnStep==="function"){
        const ls=V36.learnStep;
        V36.learnStep=function(board,fen,p,n,update){
          const up=typeof update==="function"?function(fb){let x=fb;try{x=notes.attach(fb,fen,p&&p.san,true)}catch(e){}return update(x)}:update;
          return ls.call(this,board,fen,p,n,up);
        };
        V36._lc25n=1;
      }
    }catch(e){console.error("lc25 notes",e)}
    cele.wrap();
    /* Pillar 7: a mini puzzle while the engine loads slowly */
    try{
      if(typeof Engine!=="undefined"&&Engine&&!Engine._lc25&&typeof Engine.load==="function"){
        const ol=Engine.load;
        Engine.load=function(){return wait.watch(ol.apply(this,arguments))};
        Engine._lc25=1;
      }
    }catch(e){console.error("lc25 wait",e)}
    theme.apply();
    document.addEventListener("change",e=>{try{if(e.target&&e.target.matches&&e.target.matches('[data-p36="lc25Theme"]'))setTimeout(theme.apply,0)}catch(x){}});
    /* Pillar 6: the Ghost Slayer badge shows with the other status badges in the trophy room */
    try{
      if(typeof SysBadges!=="undefined"&&SysBadges&&Array.isArray(SysBadges.LIST)&&!SysBadges.LIST.some(b=>b.id==="ghost")){
        SysBadges.LIST.push({id:"ghost",ico:"trophy",name:"Ghost Slayer",how:"You out-trained the Lanckriet-student ghost in your first week. It can never be earned again.",
          got:()=>ghost.wonAt(),note:()=>{const t=ghost.wonAt();return icon("check")+" "+(t>1e6?esc(fmtDate(new Date(t).toISOString())):"Earned")}});
      }
    }catch(e){console.error("lc25 badge",e)}
    /* Pillar 1: Coach welcome in front of the existing first-run onboarding */
    try{
      if(typeof LC80!=="undefined"&&LC80&&typeof LC80.firstRun==="function"&&!LC80._lc25){
        const orig=LC80.firstRun;
        LC80.firstRun=function(){
          try{
            if(typeof App!=="undefined"&&App.onboarded)return false;
            if(rd("lc25-welcomed",false))return orig.apply(this,arguments);
            wr("lc25-welcomed",true);
            onb.welcome(()=>{try{orig.call(LC80)}catch(e){console.error(e)}});
            return true;
          }catch(e){return orig.apply(this,arguments)}
        };
        LC80._lc25=1;
      }
    }catch(e){console.error("lc25 onb",e)}
    /* resume the analysis-quest watcher after a reload */
    try{const st=rd(CFG.onb.key,{});if(st.wait&&!st.analysis)watchAnalysis()}catch(e){}
    /* UI observers */
    const go=()=>{
      try{
        ghost.init();
        document.addEventListener("click",onClick,true);
        window.addEventListener("hashchange",()=>{disarm();later();setTimeout(()=>{ghost.mount();paintBar()},120);if(CFG.flash.routes.includes(route()))notes.ensure()});
        if(CFG.flash.routes.includes(route()))notes.ensure();
        setTimeout(()=>{try{shorts.ensure();palts.ensure()}catch(e){}},2500);
        setTimeout(()=>{try{tilt.poll.check()}catch(e){}},9e3);
        setInterval(()=>{if(document.visibilityState==="visible")try{tilt.poll.check()}catch(e){}},CFG.tilt.pollMs);
        document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")try{tilt.poll.check()}catch(e){}});
        const v=Q("#view");
        A.obs=new MutationObserver(ms=>{
          if(ms.every(m=>{const t=m.target;return t&&t.closest&&(t.closest("#lc25-bar")||t.closest("[data-lc25-ghost]"))}))return;
          later();if(!A.wait)A.wait=setTimeout(()=>{A.wait=0;ghost.mount()},200);
        });
        A.obs.observe(v||document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["disabled","hidden"]});
        setInterval(()=>{if(document.visibilityState==="visible")ghost.tick()},15e3);
        paintBar();ghost.mount();later();english.watch();
      }catch(e){console.error("lc25 ui",e)}
    };
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(go,1200));else setTimeout(go,1200);
  }
  function onClick(e){
    const t=e.target;if(!t||!t.closest)return;
    const b=t.closest("[data-lc25]");
    if(b){
      const a=b.getAttribute("data-lc25");
      if(a==="auto"){setAuto(!autoOn());say$("Auto-Advance "+(A.on?"on":"off")+".")}
      else if(a==="stay"){const btn=A.armed&&A.armed.btn;if(btn)A.fired.add(btn);disarm()}
      else if(a==="prev")openPrevious();
      return;
    }
    if(t.closest("[data-lc25-wait-close]")){wait.dismissed=true;wait.hide();return}
    const fb=t.closest("[data-fold25]");
    if(fb){e.preventDefault();fold.toggle(fb);return}
    const l=t.closest("[data-lc25-listen]");
    if(l){listen(l.getAttribute("data-lc25-listen"));return}
    /* the user touched something in the trainer while the countdown ran: they are not done yet */
    if(A.armed&&t.closest("#view")&&!t.closest("#lc25-bar"))disarm();
  }
  return{VERSION:VERSION,CFG:CFG,init:init,logic:logic,alt:alt,flash:flash,tilt:tilt,ghost:ghost,onb:onb,recap:recap,
    auto:{on:autoOn,set:setAuto,scan:scan,state:()=>A,snapshot:snapshot,openPrevious:openPrevious,nextButton:nextButton},
    english:english,pool:POOL,cele:cele,theme:theme,wait:wait,avatarHtml:avatarHtml,notes:notes,fold:fold,palts:palts,share:{link:shareLink,whatsapp:whatsappLink,button:waButton,rivalUrl:rivalUrl},ghostGoal:ghostGoal,fetchLastLoss:fetchLastLoss,coachHead:coachHead,_t:{award:award,posFromDom:posFromDom}};
})();
window.LC25=LC25;
