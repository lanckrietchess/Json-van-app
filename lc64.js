/*@@module lc64*/ const LC64=(()=>{
  "use strict";
  /* LC64 (build 9.33.0): three things.
     1. Ranked MSPC puzzle (+400): a Lichess puzzle about 400 points above the student's rating (Lichess has no public "rating +N" call, so up to 12 puzzles are
        fetched and the closest one is used; the sheet says so). 10-second sight test: find the move in 10 seconds. A wrong move or no move starts the
        MSPC interrogation (Move, Specifics, Priorities, Calculation) before the answer is shown. "Think first" mode asks the four questions BEFORE the move.
        `LC64.interrogate` is a reusable function; it is wired to this trainer only.
     2. Content Trim (owner / Admin menu): pick a game from the Game History (own account) or the Game Library of any public Chess.com / Lichess name
        (a student's), 1 token, the engine on the device scans it, and every serious error becomes a video concept: Alarm Signal, Working Point, Action Step,
        "Find a similar position" (Lichess puzzle on the matching theme) and ONE button that copies a ready prompt for the Shorts & Reels scriptwriter
        (5 parts, about 90 seconds).
     3. Action Steps everywhere: after a finished lesson "Go straight to the Drill", after a finished drill "Test this concept against Coach Lanckriet", and every
        Trim / MSPC summary ends with an order for the next 2 or 3 games. */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0];
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const rating=()=>{try{return LC61.WCFG&&(()=>{const e=Math.round(+(App.profile&&App.profile.elo));return e>=400&&e<=2800?e:1500})()}catch(e){return 1500}};

  /* ---------- Action Steps (text) ---------- */
  const ACT={
    tension:"Before every capture, count the attackers and defenders of that square, then choose the capture or the pawn break on purpose.",
    closed:"Name one pawn break for each side, then play for yours before you shuffle pieces.",
    outpost:"Within three moves, plan a trade or a pawn move that removes the support of their outpost.",
    loose:"Before you move, list your undefended pieces and theirs, then protect one of yours or attack one of theirs.",
    king:"Before you open any line, count the attackers near your king. Add pawn cover or castle first.",
    passed:"Put a piece in front of their passed pawn right away, or start a counter-attack that is faster.",
    opposite:"Count the tempi: your pawn storm against theirs. Then choose attack or defence for the next three moves."
  };
  const LNAME={M:"Move",S:"Specifics",P:"Priorities",C:"Calculation"};
  function actionOf(alarmId,letter){
    return ACT[alarmId]||({M:"Say out loud what their last move changed before you touch a piece.",S:"Name the pawn structure and the biggest weakness before you pick a plan.",P:"Write down your checks, captures and attacks first, then choose.",C:"Calculate their best reply to your move before you play it."})[letter]||"Run the four MSPC steps on every move.";
  }
  /* "In your next 2 or 3 games ..." : ends every coach summary */
  function nextGames(letter,alarmId){
    const a=alarmId&&LC61.ALARM[alarmId];
    return "In your next 2 to 3 games, run "+(LNAME[letter]||"Specifics")+" on every move; as soon as "+(a?"the alarm “"+a.label+"”":"an Alarm Signal")+" appears on the board, do this: "+actionOf(alarmId,letter);
  }
  function nextGamesHTML(letter,alarmId){
    const t=nextGames(letter,alarmId);
    return '<p class="lc64-next"><b>Your order for the next 2 to 3 games.</b> '+esc(t)+' '+(()=>{try{return LC61.vbtn(t)}catch(e){return""}})()+'</p>';
  }
  function topLetterAlarm(){
    let p=null;try{p=Framework.ranked()[0]}catch(e){}
    const letter=p&&p.cat&&LNAME[p.cat]?p.cat:"S";
    let id="";try{const m=rd("lc61-al",{})||{};if(p&&m[p.id])id=m[p.id]}catch(e){}
    if(!id)id=Object.keys(LC61.ALARM).filter(k=>k!=="loose"&&LC61.ALARM[k].letter===letter)[0]||"tension";
    return{letter:letter,alarm:id,point:p};
  }

  /* ---------- Lichess puzzles ---------- */
  const LI="https://lichess.org/api/puzzle/next";
  const THEME={tension:"capturingDefender",closed:"quietMove",outpost:"quietMove",loose:"hangingPiece",king:"exposedKing",passed:"advancedPawn",opposite:"kingsideAttack"};
  const themeFor=(alarmId,letter)=>THEME[alarmId]||(letter==="C"?"short":letter==="P"?"mateIn2":"middlegame");
  async function liOne(angle){
    const r=await fetch(LI+(angle?"?angle="+encodeURIComponent(angle):""),{headers:{Accept:"application/json"}});
    if(!r.ok)throw new Error("lichess "+r.status);
    return r.json();
  }
  /* up to `n` puzzles in two waves of 6; the one closest to `target` wins */
  async function liClosest(target,angle){
    let best=null,seen=0;
    for(let wave=0;wave<2;wave++){
      const got=await Promise.all(Array.from({length:6},()=>liOne(angle).catch(()=>null)));
      got.forEach(j=>{if(j&&j.puzzle&&j.game){seen++;if(!best||Math.abs(j.puzzle.rating-target)<Math.abs(best.puzzle.rating-target))best=j}});
      if(best&&Math.abs(best.puzzle.rating-target)<=150)break;
    }
    return best?{json:best,seen:seen}:null;
  }
  /* Lichess json -> {fen, solution:[uci], orient, rating, themes, id}. The solver moves first in the API's solution; if that move is not legal, the first move is theirs. */
  function puzzleFromJson(j){
    try{
      const g=new Chess();if(!g.load_pgn(String(j.game.pgn||""),{sloppy:true}))return null;
      let sol=(j.puzzle.solution||[]).slice(),last=null;
      const h=g.history({verbose:true});if(h.length)last={from:h[h.length-1].from,to:h[h.length-1].to};
      const legal=u=>{const t=new Chess(g.fen());return!!t.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||"q"})};
      if(sol.length&&!legal(sol[0])){const u=sol.shift();const m=g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||"q"});if(!m)return null;last={from:m.from,to:m.to};if(!sol.length||!legal(sol[0]))return null}
      return{fen:g.fen(),solution:sol,orient:g.turn()==="w"?"white":"black",side:g.turn(),rating:+j.puzzle.rating||0,themes:j.puzzle.themes||[],id:String(j.puzzle.id||""),last:last};
    }catch(e){return null}
  }

  /* ---------- MSPC interrogation ---------- */
  const QS=[
    ["M","Move","What did their last move change? What does it threaten?"],
    ["S","Specifics","Which structure or feature matters here (tension, a closed centre, an outpost, king safety, a loose piece)?"],
    ["P","Priorities","Which checks, captures and attacks does each side have?"],
    ["C","Calculation","Which line did you calculate to the end, and what is their best reply?"]];
  function interrogate(host,opts){
    opts=opts||{};let i=0;const ans=[];
    return new Promise(resolve=>{
      const paint=()=>{
        if(i>=QS.length){host.innerHTML="";resolve(ans);return}
        const q=QS[i];
        host.innerHTML='<div class="lc64-iq"><p class="small muted">'+esc(opts.lead||"Slow down. Answer the four MSPC questions.")+' · '+(i+1)+' of 4</p><h4>'+esc(q[1])+'</h4><p>'+esc(q[2])+' '+(()=>{try{return LC61.vbtn(q[2])}catch(e){return""}})()+'</p>'
          +'<label class="field"><textarea rows="2" maxlength="240" data-lc64-a placeholder="One sentence is enough"></textarea></label>'
          +'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc64="iq-next">'+(i===3?"Done":"Next")+'</button></div></div>';
        const b=Q('[data-lc64="iq-next"]',host);
        b.addEventListener("click",()=>{ans.push({k:q[0],t:String(Q("[data-lc64-a]",host).value||"").trim()});i++;paint()});
      };
      paint();
    });
  }

  /* ---------- the ranked trainer sheet ---------- */
  let cur=null;
  async function openRanked(mode){
    mode=mode==="think"?"think":"sight";
    const target=Math.min(2800,rating()+400);
    const sh=openSheet({title:"Ranked MSPC puzzle",cls:"lc36-sheet lc64-sheet",noFocus:true,html:'<p class="muted">Looking for a puzzle about <b>'+target+'</b> (your rating '+rating()+' + 400)…</p><div data-lc64-body></div>',onClose(){try{if(cur&&cur.board)cur.board.destroy()}catch(e){}cur=null}});
    const body=()=>Q("[data-lc64-body]",sh.el||document);
    let found=null;
    try{const t=topLetterAlarm();found=await liClosest(target,mode==="think"?"":themeFor(t.alarm,t.letter))}catch(e){found=null}
    const P=found&&puzzleFromJson(found.json);
    if(!P){body().innerHTML='<p class="form-msg is-bad">Could not get a puzzle from Lichess right now. Check your connection and try again.</p>';return}
    await play(body(),P,mode,target,found.seen,sh);
  }
  async function play(host,P,mode,target,seen,sh){
    host.innerHTML='<p class="small muted">Puzzle rating <b>'+P.rating+'</b> (asked for '+target+'; closest of '+seen+' Lichess puzzles). '+(mode==="think"?'Think first: answer the four questions, then move.':'Sight test: find the move in 10 seconds.')+'</p>'
      +'<div data-lc64-board class="lc64-board"></div><div class="lc64-bar" data-lc64-bar><i></i></div><p data-lc64-msg aria-live="polite"></p><div data-lc64-iq></div><div class="btn-row" data-lc64-act></div>';
    const bhost=Q("[data-lc64-board]",host),msg=Q("[data-lc64-msg]",host),iq=Q("[data-lc64-iq]",host),act=Q("[data-lc64-act]",host),bar=Q("[data-lc64-bar] i",host);
    const board=Board(bhost,{fen:P.fen,orientation:P.orient,onMove:m=>move(m)});
    cur={board:board,P:P};let step=0,done=false,timer=null,t0=0;
    const g=new Chess(P.fen);
    const uci=m=>m.from+m.to+(m.promotion||"");
    const stop=()=>{clearInterval(timer);timer=null};
    async function fail(why){
      if(done)return;done=true;stop();try{board.setInteractive(null)}catch(e){}
      msg.innerHTML=why;
      const ans=await interrogate(iq,{lead:"Not this time. Before you see the answer:"});
      reveal(ans,false);
    }
    function reveal(ans,ok){
      const t=new Chess(P.fen);const m=t.move({from:P.solution[0].slice(0,2),to:P.solution[0].slice(2,4),promotion:P.solution[0][4]||"q"});
      const al=LC61.detect(P.fen,P.side).filter(a=>a.id!=="loose");
      const tl=topLetterAlarm();
      try{board.setArrows([{from:P.solution[0].slice(0,2),to:P.solution[0].slice(2,4),kind:"best"}])}catch(e){}
      msg.innerHTML=(ok?"Correct. ":"")+'The move was <b>'+esc(m?m.san:P.solution[0])+'</b>.'+(al.length?' Alarm Signal on the board: <b>'+esc(al[0].label)+'</b>. '+esc(al[0].say):'')
        +'<p class="lc64-next"><b>Action Step.</b> '+esc(actionOf(al[0]?al[0].id:tl.alarm,al[0]?al[0].letter:tl.letter))+' '+(()=>{try{return LC61.vbtn(actionOf(al[0]?al[0].id:tl.alarm,al[0]?al[0].letter:tl.letter))}catch(e){return""}})()+'</p>';
      act.innerHTML='<button type="button" class="btn btn-primary" data-lc64="again">Another puzzle</button><a class="btn btn-ghost" target="_blank" rel="noopener" href="https://lichess.org/training/'+esc(P.id)+'">Open on Lichess</a>';
      if(ok){try{V6.addXp("think",15)}catch(e){}}
    }
    async function move(m){
      if(done)return;stop();
      const want=P.solution[step],got=uci(m);
      if(got===want||got.slice(0,4)===want.slice(0,4)){
        g.move({from:want.slice(0,2),to:want.slice(2,4),promotion:want[4]||"q"});step++;
        const reply=P.solution[step];
        if(!reply){done=true;board.setInteractive(null);board.setPosition(g.fen(),{lastMove:{from:want.slice(0,2),to:want.slice(2,4)}});reveal([],true);return}
        await sleep(350);g.move({from:reply.slice(0,2),to:reply.slice(2,4),promotion:reply[4]||"q"});step++;
        board.setPosition(g.fen(),{lastMove:{from:reply.slice(0,2),to:reply.slice(2,4)}});
        if(step>=P.solution.length){done=true;board.setInteractive(null);reveal([],true);return}
        msg.textContent="Right. Keep going.";return;
      }
      try{board.setPosition(g.fen())}catch(e){}
      fail("That is not the move.");
    }
    async function begin(){
      board.setInteractive(P.side);
      t0=Date.now();
      timer=setInterval(()=>{
        const f=Math.min(1,(Date.now()-t0)/10000);bar.style.width=(100-f*100)+"%";
        if(f>=1){stop();fail("Time is up.")}
      },100);
    }
    if(mode==="think"){
      const ans=await interrogate(iq,{lead:"Think first. Answer these before you move:"});
      iq.innerHTML="";msg.textContent="Now play your move. No clock.";board.setInteractive(P.side);bar.parentNode.style.display="none";
    }else begin();
    host.addEventListener("click",e=>{const a=e.target.closest("[data-lc64=\"again\"]");if(a){e.preventDefault();try{board.destroy()}catch(x){}openRankedInto(sh,mode)}});
  }
  async function openRankedInto(sh,mode){
    const target=Math.min(2800,rating()+400),host=Q("[data-lc64-body]",sh.el||document);if(!host)return;
    host.innerHTML='<p class="muted">Looking for the next puzzle…</p>';
    let found=null;try{const t=topLetterAlarm();found=await liClosest(target,mode==="think"?"":themeFor(t.alarm,t.letter))}catch(e){}
    const P=found&&puzzleFromJson(found.json);
    if(!P){host.innerHTML='<p class="form-msg is-bad">No puzzle right now.</p>';return}
    await play(host,P,mode,target,found.seen,sh);
  }


  /* ---------- Think case study: the student's OWN serious errors, saved by LC66 when Trim showed them ---------- */
  function casePick(){
    const list=(rd("lc66-cases",[])||[]).filter(c=>c&&c.fen&&c.best);
    if(!list.length)return null;
    list.sort((a,b)=>(a.solved||0)-(b.solved||0)||(b.ts||0)-(a.ts||0));
    return list[0];
  }
  function caseDone(fen,ok){
    const list=rd("lc66-cases",[])||[],c=list.filter(x=>x.fen===fen)[0];
    if(c){c.seen=(c.seen||0)+1;if(ok)c.solved=(c.solved||0)+1;wr("lc66-cases",list)}
  }
  async function openCase(){
    const c=casePick();
    if(!c){return openRanked("think")}                     /* no own errors saved yet: the Lichess case study */
    const sh=openSheet({title:"Think case study",cls:"lc36-sheet lc64-sheet",noFocus:true,html:'<p class="small muted">Your own mistake from move '+(+c.no||"?")+' of a game you reviewed. You played <b>'+esc(c.san||"?")+'</b>. First the process, then the move.</p><div data-lc64-body></div>'});
    const host=Q("[data-lc64-body]",sh.el||document);
    host.innerHTML='<div data-lc64-board class="lc64-board"></div><p data-lc64-msg aria-live="polite"></p><div data-lc64-iq></div><div class="btn-row" data-lc64-act></div>';
    const bhost=Q("[data-lc64-board]",host),msg=Q("[data-lc64-msg]",host),iq=Q("[data-lc64-iq]",host),act=Q("[data-lc64-act]",host);
    const side=c.color==="b"?"b":"w";let done=false;
    const board=Board(bhost,{fen:c.fen,orientation:side==="b"?"black":"white",onMove:m=>{
      if(done)return;done=true;try{board.setInteractive(null)}catch(e){}
      const ok=(m.from+m.to)===String(c.best).slice(0,4);caseDone(c.fen,ok);
      const al=LC61.detect(c.fen,side).filter(a=>a.id!=="loose")[0]||null;
      try{board.setArrows([{from:String(c.best).slice(0,2),to:String(c.best).slice(2,4),kind:"best"}])}catch(e){}
      msg.innerHTML=(ok?"Correct, and that is the move you missed in the game. ":"The better move was <b>"+esc(c.bestSan||c.best)+"</b>. ")+(al?'Alarm Signal on the board: <b>'+esc(al.label)+'</b>. '+esc(al.say)+' ':'')
        +'<p class="lc64-next"><b>Action Step.</b> '+esc(actionOf(al?al.id:"",c.k||"S"))+'</p>';
      act.innerHTML='<button type="button" class="btn btn-primary" data-lc64="case-again">Another case</button>';
    }});
    const ans=await interrogate(iq,{lead:"Think first. Answer these before you move:"});
    iq.innerHTML="";msg.textContent="Now play your move.";board.setInteractive(side);
    host.addEventListener("click",e=>{if(e.target.closest('[data-lc64="case-again"]')){e.preventDefault();try{board.destroy()}catch(x){}sh.close();openCase()}});
  }

  /* ---------- Content Trim ---------- */
  function charge(){
    try{if(Admin.active)return true}catch(e){}
    let bal=0;try{bal=Credits.balance()}catch(e){}
    if(!(bal>=1)){say("A Content Trim costs 1 token.","bad");return false}
    try{Credits.spend(1);App.save()}catch(e){return false}
    return true;
  }
  function ownAcct(){
    try{const c=Elo.acct("chesscom");if(c&&c.user)return{site:"chesscom",user:c.user}}catch(e){}
    try{const l=Elo.acct("lichess");if(l&&l.user)return{site:"lichess",user:l.user}}catch(e){}
    return null;
  }
  function pickAlarm(fen,color,letter){
    const al=LC61.detect(fen,color);
    return al.filter(a=>a.letter===letter)[0]||al.filter(a=>a.id!=="loose")[0]||al[0]||null;
  }
  function caseOf(g,it,gi){
    const fen=g.fens[it.i],color=it.color==="b"?"b":"w";
    const letter=it.k&&LNAME[it.k]?it.k:(it.cls==="blunder"?"M":"S");
    const al=pickAlarm(fen,color,letter);
    let wp=null;try{wp=LC61.linkedPoint(letter,al&&al.id)}catch(e){}
    return{no:Math.ceil((it.i+1)/2),san:it.san,best:it.bestSan||"",loss:Math.round(it.loss),cls:it.cls,fen:fen,color:color,letter:letter,
      alarm:al,wp:wp?String(wp.text||""):"",action:actionOf(al&&al.id,letter),theme:themeFor(al&&al.id,letter),reply:it.replySan||""};
  }
  async function runTrim(game,host){
    if(!charge())return;
    host.innerHTML='<p class="muted" data-lc64-st>Starting the engine…</p>';
    const st=Q("[data-lc64-st]",host);
    try{
      if(!(await Engine.load()))throw new Error("engine");
      const S=LC80.scan,g=S.parseGame(game.pgn);if(!g)throw new Error("pgn");
      g.color=game.color;
      const items=await S.analyseGame(g,(k,t)=>{if(st)st.textContent="Scanning move "+Math.ceil((k+1)/2)+" of "+Math.ceil(t/2)+"…"},()=>false);
      const bad=items.filter(it=>it.cls==="blunder"||it.cls==="mistake").sort((a,b)=>b.loss-a.loss).slice(0,6);
      const cases=bad.map(it=>caseOf(g,it));
      showCases(host,game,cases);
    }catch(e){host.innerHTML='<p class="form-msg is-bad">Could not scan that game ('+esc(e&&e.message||"error")+'). Your token was used; try another game.</p>'}
  }
  const siteName=s=>s==="lichess"?"Lichess":"Chess.com";
  function showCases(host,game,cases){
    host._cases=cases;host._game=game;
    if(!cases.length){host.innerHTML='<p class="muted">No serious errors in this game. Pick another one.</p>';return}
    host.innerHTML='<p class="small muted">'+cases.length+' video concepts from this game (vs '+esc(game.opp||"?")+'). Each error: Alarm Signal, Working Point, Action Step, a similar position for the Aha moment, and one button for the script prompt.</p>'
      +cases.map((c,i)=>'<article class="lc64-case" data-i="'+i+'"><h4>Move '+c.no+': '+esc(c.san)+(c.best?' (better: '+esc(c.best)+')':'')+' · cost '+c.loss+'%</h4>'
      +'<p><b>a) Alarm Signal:</b> '+(c.alarm?esc(c.alarm.label)+'. '+esc(c.alarm.say):'none of the standard alarms; the error came from the thinking order')+'</p>'
      +'<p><b>b) Working Point:</b> '+esc(c.wp||"none linked yet ("+LNAME[c.letter]+")")+'</p>'
      +'<p><b>c) Action Step:</b> '+esc(c.action)+'</p>'
      +'<div class="btn-row"><button type="button" class="btn btn-ghost" data-lc64="similar">Find a similar position</button><button type="button" class="btn btn-primary" data-lc64="prompt">Copy script prompt</button></div><p class="small" data-lc64-sim aria-live="polite"></p></article>').join("");
  }
  async function similar(card,host){
    const c=host._cases[+card.getAttribute("data-i")],out=Q("[data-lc64-sim]",card);
    out.textContent="Searching Lichess…";
    try{
      const found=await liClosest(Math.min(2800,rating()),c.theme);
      const P=found&&puzzleFromJson(found.json);
      if(!P){out.textContent="Nothing found right now.";return}
      c.sim={id:P.id,rating:P.rating,themes:P.themes.slice(0,4)};
      out.innerHTML='Lichess puzzle <b>'+esc(P.id)+'</b> · rating '+P.rating+' · '+esc(P.themes.slice(0,4).join(", "))+' · <a target="_blank" rel="noopener" href="https://lichess.org/training/'+esc(P.id)+'">open</a>';
    }catch(e){out.textContent="Lichess did not answer. Try again."}
  }
  function buildPrompt(c,game){
    const a=c.alarm?c.alarm.label+": "+c.alarm.say:"no standard alarm on the board (the error came from skipping an MSPC step)";
    return [
"You are my Shorts & Reels scriptwriter for Lanckriet Chess. Write ONE vertical video script of about 90 seconds in spoken English, in my voice (direct, calm, coach-like). Give the spoken words, then [on-screen text] and [visual] cues for every part. Use exactly these 5 parts and timings.",
"",
"FACTS YOU MAY USE (do not invent others):",
"- Kyenzo Lanckriet, certified chess coach, 2105 Rapid on Chess.com, top 0.1%. He went from 355 to 2105 in 2 years and 10 months.",
"- Proof: a student gained +630 ELO in 6 weeks (585 to 1214), confirmed.",
"- Private coaching costs about EUR 80 an hour. The Lanckriet Chess app is an AI coaching hub that is there 24/7.",
"- Method: MSPC (Move, Specifics, Priorities, Calculation) and Triple-T (Think, Theory, Trim). Alarm Signals tell you when to stop and run a Working Point.",
"- The app shows verified results and a Wall of Love with approved member messages.",
"",
"THE MISTAKE (the concept of this video):",
"- Game: "+(game&&game.opp?"vs "+game.opp+" ("+(game.oppR||"?")+")":"a student game")+", move "+c.no+", the student played "+c.san+(c.best?" instead of "+c.best:"")+", costing about "+c.loss+"% win chance.",
"- Position (FEN, before the move): "+c.fen,
"- Alarm Signal on the board: "+a,
"- Active Working Point: "+(c.wp||"(none yet)"),
"- Action Step: "+c.action,
"- Similar position for the Aha moment: "+(c.sim?"Lichess puzzle "+c.sim.id+" (rating "+c.sim.rating+", themes "+c.sim.themes.join(", ")+"), https://lichess.org/training/"+c.sim.id:"(search one on Lichess with the theme "+c.theme+")"),
"",
"STRUCTURE:",
"1. [HOOK, CONFIRM & AUTHORITY] 0-9s: a scroll-stopping opener about this exact mistake, confirm who it is for (players stuck at their rating), and one line of authority (2105 ELO, +630 ELO student proof).",
"2. [3x EXPLANATION + OPTIONAL ANALOGY] 9-35s: say the concept in as few words as possible, say it again with the details, and a third time as a rule of thumb. Add one kid-like analogy only if it makes it clearer.",
"3. [AHA MOMENT & ACTION STEP] 35-55s: show the mistake in the app, then the similar Lichess position. Show how the Action Step leads straight to the winning move and what the app did to find it.",
"4. [RE-HOOK, PAIN & CONTRAST] 55-75s: re-hook on the pain of a rating that does not move. Contrast private coaches (about EUR 80 an hour) with a coaching hub that is there 24/7.",
"5. [CTA & PROOF] 75-90s: the Wall of Love and verified results (+630 ELO in 6 weeks), then one direct call to action to open the Lanckriet Chess app (link in bio).",
"",
"RULES: never call the product free or cheap; never promise a rating result or say lifetime or forever; no named competitors; keep claims to the facts above; every part must end by pushing the viewer to the next part; give 3 hook variants for part 1."
    ].join("\n");
  }
  async function copy(text){
    try{await navigator.clipboard.writeText(text);return true}catch(e){}
    try{const t=document.createElement("textarea");t.value=text;t.style.cssText="position:fixed;left:-9999px";document.body.appendChild(t);t.select();const ok=document.execCommand("copy");t.remove();return ok}catch(e){return false}
  }
  async function openTrim(){
    const sh=openSheet({title:"Content Trim",cls:"lc36-sheet lc64-sheet lc64-trim",noFocus:true,html:
      '<p class="small muted">Pick a game from your own history or from a student\'s Game Library (any public Chess.com or Lichess name). A Content Trim costs 1 token (not charged in admin mode).</p>'
      +'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc64="own">My Game History</button></div>'
      +'<div class="lc64-other"><select data-lc64-site aria-label="Site"><option value="chesscom">Chess.com</option><option value="lichess">Lichess</option></select> <input data-lc64-user type="text" placeholder="student\'s username" maxlength="30" aria-label="Username"> <button type="button" class="btn btn-ghost" data-lc64="other">Student Game Library</button></div>'
      +'<div data-lc64-list></div><div data-lc64-out></div>'});
    const root=sh.el||document;
    async function list(site,user){
      const L=Q("[data-lc64-list]",root);L.innerHTML='<p class="muted">Loading games…</p>';
      let gs=[];try{gs=await LC39._t.games(site,user,10)}catch(e){gs=[]}
      if(!gs.length){L.innerHTML='<p class="muted">No games found for '+esc(user)+'.</p>';return}
      L._games=gs;
      L.innerHTML=gs.map((g,i)=>'<button type="button" class="btn btn-ghost lc64-g" data-lc64="pick" data-i="'+i+'">'+(g.res==="win"?"W":g.res==="draw"?"D":"L")+' vs '+esc(g.opp)+(g.oppR?" ("+esc(g.oppR)+")":"")+' · '+(g.color==="w"?"White":"Black")+' · '+esc(g.tc||"")+'</button>').join("");
    }
    root.addEventListener("click",async e=>{
      const b=e.target.closest("[data-lc64]");if(!b)return;const a=b.getAttribute("data-lc64");
      if(a==="own"){e.preventDefault();const o=ownAcct();if(!o){say("Connect your Chess.com or Lichess account first.");return}list(o.site,o.user)}
      else if(a==="other"){e.preventDefault();const u=String(Q("[data-lc64-user]",root).value||"").trim();if(!/^[A-Za-z0-9_-]{2,30}$/.test(u)){say("Type a valid username.");return}list(Q("[data-lc64-site]",root).value,u)}
      else if(a==="pick"){e.preventDefault();const L=Q("[data-lc64-list]",root),g=L._games[+b.getAttribute("data-i")];L.innerHTML="";runTrim(g,Q("[data-lc64-out]",root))}
      else if(a==="similar"){e.preventDefault();similar(b.closest(".lc64-case"),Q("[data-lc64-out]",root))}
      else if(a==="prompt"){e.preventDefault();const out=Q("[data-lc64-out]",root),c=out._cases[+b.closest(".lc64-case").getAttribute("data-i")];say(await copy(buildPrompt(c,out._game))?"Script prompt copied. Paste it into Claude.":"Could not copy. Select it from the box below.","good")}
    });
  }

  /* ---------- Action Steps in the lessons and drills ---------- */
  let lastTheme="",lastPart="";
  /* the last puzzle of a set: the kicker says "puzzle N of M" with N = M (a screen without that counter counts as finished) */
  function lastOfSet(view){
    const ks=QA(".st-kicker",view).map(k=>/puzzle\s+(\d+)\s+of\s+(\d+)/i.exec(k.textContent||"")).filter(Boolean);
    return!ks.length||ks.some(m=>+m[1]>=+m[2]);
  }
  function actionObserver(){
    const view=Q("#view");if(!view)return;
    const fbDone=QA(".fb-done strong",view).map(x=>String(x.textContent||"").trim());
    const kick=QA(".st-kicker",view).filter(k=>/Lesson complete/i.test(k.textContent))[0];
    const solved=fbDone.some(t=>/^Solved$/i.test(t))&&!!Q(".st-actions",view);   /* a finished exercise of the Endgame / Middlegame themes */
    /* a finished lesson (its last exercise, or the "Lesson complete" screen): straight to the drill of the same theme */
    const learnDone=!!kick||fbDone.some(t=>/Line learned/i.test(t))||(solved&&lastPart==="learn");
    if(learnDone){
      const acts=Q(".st-actions",view);
      if(acts&&!Q("[data-lc64-learn]",acts)&&lastTheme){
        const b=document.createElement("button");b.type="button";b.className="btn btn-gold";b.setAttribute("data-lc64-learn",lastTheme);
        b.textContent="Go straight to the Drill to anchor this knowledge";acts.insertBefore(b,acts.firstChild);
      }
    }
    /* a finished drill or line: test the concept against Coach Lanckriet */
    const txt=view.textContent||"";
    const drillDone=fbDone.some(t=>/Line complete|Drill complete/i.test(t))||/Drill complete\./i.test(txt)||(solved&&!!lastPart&&lastPart!=="learn"&&lastOfSet(view))||(lastPart!=="learn"&&QA(".fb strong",view).some(x=>/^\d+%\s+accuracy$/i.test(String(x.textContent||"").trim())));
    if(drillDone&&!learnDone&&!Q("[data-lc64-drill]",view)){
      const d=document.createElement("section");d.className="panel pad lc64-act";d.setAttribute("data-lc64-drill","");
      d.innerHTML='<b>Action Step</b><p>Test this concept now against Coach Lanckriet.</p><button type="button" class="btn btn-gold" data-lc64="spar">Play my Sparring Partner</button>';
      view.appendChild(d);
    }
    if(!drillDone){const old=Q("[data-lc64-drill]",view);if(old)old.remove()}
    missObserver(view);
  }
  /* after a wrong answer in any trainer: a compact MSPC interrogation under the feedback (Theory, Openings, Middlegame, Endgame, Think, Puzzles, Shuffle) */
  const MISS_ROUTES=/^(openings|middlegame|endgame|think|puzzles|shuffle|theory|drills)$/;
  function missObserver(view){
    if(!MISS_ROUTES.test(route()))return;
    QA(".fb-bad,.fb-miss",view).forEach(fb=>{
      if(fb.closest(".lc64-sheet,.sheet-wrap,[data-lc64-miss]"))return;
      const nx=fb.nextElementSibling;if(nx&&nx.hasAttribute&&nx.hasAttribute("data-lc64-miss"))return;
      const box=document.createElement("div");box.className="lc64-miss";box.setAttribute("data-lc64-miss","");
      box.innerHTML='<button type="button" class="btn btn-ghost btn-sm" data-lc64="miss-go">Run MSPC on this miss</button><div data-lc64-miss-body></div>';
      fb.insertAdjacentElement("afterend",box);
    });
  }
  async function missRun(btn){
    const box=btn.closest("[data-lc64-miss]"),body=Q("[data-lc64-miss-body]",box);btn.hidden=true;
    const ans=await interrogate(body,{lead:"Before you retry, slow down:"});
    let gap=ans.filter(a=>a.t.length<10)[0];const letter=gap?gap.k:"C";
    const t=topLetterAlarm(),id=Object.keys(LC61.ALARM).filter(k=>k!=="loose"&&LC61.ALARM[k].letter===letter)[0]||t.alarm;
    body.innerHTML='<div class="lc64-next"><b>Your thinking gap: '+esc(LNAME[letter])+'.</b> '+esc(gap?"You had no answer for this step.":"You answered every step; the gap is probably in the last one, the check of their best reply.")
      +'<p><b>Action Step.</b> '+esc(nextGames(letter,id))+'</p><button type="button" class="btn btn-ghost btn-sm" data-lc64="miss-wp" data-letter="'+esc(letter)+'" data-alarm="'+esc(id)+'">Add it as a Working Point</button></div>';
  }
  function onDoc(e){
    const o=e.target.closest&&e.target.closest("[data-eg-open]");
    if(o){const p=String(o.getAttribute("data-eg-open")).split("|");lastTheme=p[0];lastPart=p[1]||""}
    const l=e.target.closest&&e.target.closest("[data-lc64-learn]");
    if(l){
      e.preventDefault();e.stopPropagation();const th=l.getAttribute("data-lc64-learn");
      const back=Q('[data-act="back"]');if(back)back.click();
      let n=0;const t=setInterval(()=>{
        const b=Q('[data-eg-open^="'+th+'|"]:not([data-eg-open$="|learn"])');
        if(b){clearInterval(t);b.click()}else if(++n>20){clearInterval(t);say("Open the drills of this theme to continue.")}
      },150);
      return;
    }
    const mg=e.target.closest&&e.target.closest('[data-lc64="miss-go"]');if(mg){e.preventDefault();e.stopPropagation();missRun(mg);return}
    const mw=e.target.closest&&e.target.closest('[data-lc64="miss-wp"]');
    if(mw){e.preventDefault();e.stopPropagation();const l=mw.getAttribute("data-letter"),id=mw.getAttribute("data-alarm"),a=LC61.ALARM[id];
      let r=null;try{r=Framework.coachAdd(l,a?("When “"+a.label.toLowerCase()+"” is on the board: "+a.ask).slice(0,120):null,{sev:2,freq:2,pers:2})}catch(x){}
      if(r&&r.id){try{const m=rd("lc61-al",{})||{};m[r.id]=id;wr("lc61-al",m)}catch(x){}say("Added to your Working Points.","good");mw.disabled=true}else say("Your Working Point slots are full.","bad");return}
    if(e.target.closest&&e.target.closest('[data-lc64="spar"]')){e.preventDefault();e.stopPropagation();location.hash="#bot";say("Pick “Be My Sparring Partner” to test this concept.","good");return}
    if(e.target.closest&&e.target.closest("[data-lc64-ranked]")){e.preventDefault();e.stopPropagation();(()=>{const k=e.target.closest("[data-lc64-ranked]").getAttribute("data-lc64-ranked");return k==="think"?openCase():openRanked(k)})();return}
    if(e.target.closest&&e.target.closest("[data-lc64-trim]")){e.preventDefault();openTrim()}
  }
  function paintRanked(){
    const r=route();if(r!=="think"&&r!=="puzzles"&&r!=="system")return;
    const view=Q("#view");if(!view||Q("[data-lc64-rankbar]",view))return;
    const c=document.createElement("section");c.className="panel pad lc64-rank";c.setAttribute("data-lc64-rankbar","");
    c.innerHTML='<b>Ranked MSPC puzzle (+400)</b><p class="small muted">A Lichess puzzle about 400 points above your rating. Find the move in 10 seconds, or think first.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc64-ranked="sight">10-second sight test</button><button type="button" class="btn btn-ghost" data-lc64-ranked="think">Think case study (process first)</button></div>';
    const top=Q("[data-lc61-top]",view);
    if(top)top.insertAdjacentElement("afterend",c);else view.insertBefore(c,view.firstChild);
  }
  function addOwnerRow(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc64-trim]",m))return;
    const ref=Q("[data-lc62-admin]",m)||Q("[data-lc61-admin]",m)||Q("[data-lc59-admin]",m);if(!ref)return;
    const b=document.createElement("button");b.type="button";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc64-trim","");
    b.innerHTML="<span><b>Content Trim</b><small>Turn a game into video concepts and a script prompt (1 token)</small></span>";
    ref.insertAdjacentElement("afterend",b);
  }
  function wrapSummary(){
    try{
      if(Framework.__lc64)return;Framework.__lc64=true;
      const f=Framework.summaryHTML;
      Framework.summaryHTML=function(){
        const h=f.apply(this,arguments);
        try{const t=topLetterAlarm();return h+nextGamesHTML(t.letter,t.alarm)}catch(e){return h}
      };
    }catch(e){}
  }
  function css(){
    if(Q("#lc64-css"))return;
    const s=document.createElement("style");s.id="lc64-css";
    s.textContent=".lc64-board{max-width:420px;margin:8px auto}.lc64-bar{height:6px;border-radius:3px;background:#334155;margin:8px 0;overflow:hidden}.lc64-bar i{display:block;height:100%;width:100%;background:#38bdf8}.lc64-next{padding:10px;border-radius:10px;background:#0f172a;border:1px solid #334155}.lc64-case{padding:12px;border:1px solid #334155;border-radius:12px;margin:10px 0;background:#0f172a}.lc64-case h4{margin:0 0 6px}.lc64-g{display:block;width:100%;text-align:left;min-height:44px;margin:4px 0}.lc64-other{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.lc64-other input,.lc64-other select{min-height:44px}.lc64-rank,.lc64-act{display:grid;gap:8px;margin-bottom:12px;border:1px solid #38bdf8}.lc64-iq textarea{width:100%}.lc64-miss{margin:8px 0}";
    document.head.appendChild(s);
  }
  let timer=0;
  function afterRender(){clearTimeout(timer);timer=setTimeout(()=>{try{paintRanked();addOwnerRow();actionObserver()}catch(e){}},600)}
  function init(){
    css();wrapSummary();
    document.addEventListener("click",onDoc,true);
    let deb=0;new MutationObserver(()=>{clearTimeout(deb);deb=setTimeout(()=>{try{actionObserver();addOwnerRow()}catch(e){}},300)}).observe(document.body,{childList:true,subtree:true});
  }
  return{init:init,afterRender:afterRender,puzzleFromJson:puzzleFromJson,liClosest:liClosest,interrogate:interrogate,openRanked:openRanked,openTrim:openTrim,buildPrompt:buildPrompt,caseOf:caseOf,nextGames:nextGames,nextGamesHTML:nextGamesHTML,top:topLetterAlarm,actionOf:actionOf,themeFor:themeFor,openCase:openCase,casePick:casePick,ACT:ACT,QS:QS,LNAME:LNAME,version:"9.33.0"};
})(); /*@@end lc64*/
