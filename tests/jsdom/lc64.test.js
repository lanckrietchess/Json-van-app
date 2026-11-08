module.exports=async(w,errs)=>{
 const ev=s=>w.eval(s),d=w.document,chk=(n,ok,x)=>console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' '+JSON.stringify(x):''));
 chk('LC64 loaded',ev('typeof LC64')==='object');
 // puzzle json: after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5, black to move; solution begins with the solver
 const J={game:{pgn:'1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5'},puzzle:{id:'abc12',rating:1500,themes:['opening','short'],solution:['d7d5','e4d5','f6d5']}};
 const P=ev('LC64.puzzleFromJson('+JSON.stringify(J)+')');
 chk('puzzle parsed: black to move, solver first',P&&P.side==='b'&&P.orient==='black'&&P.solution.length===3,P&&P.fen);
 const J2=JSON.parse(JSON.stringify(J)); J2.game.pgn='1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6'; J2.puzzle.solution=['d7d5','e4d5','f6d5'];
 const P2=ev('LC64.puzzleFromJson('+JSON.stringify(J2)+')');
 chk('an unusable puzzle (solution does not fit the side to move) is skipped, not crashed',P2===null);
 // closest-of-N selection with a stubbed fetch
 const ratings=[1200,2450,2100,2600,1900,2380,1500,2500,1700,2200,2350,2420];let n=0;
 global.FETCH=async(u)=>{ if(/puzzle\/next/.test(u)){const r=ratings[n++%ratings.length];return{ok:true,status:200,json:async()=>({game:J.game,puzzle:Object.assign({},J.puzzle,{rating:r,id:'p'+r})})}} return null};
 const best=await w.eval('LC64.liClosest(2500)');
 chk('closest puzzle to the target is chosen',best&&best.json.puzzle.rating===2450,best&&best.json.puzzle.rating);
 // the ranked sheet end to end: wrong move -> interrogation -> reveal
 n=0; ev('App.profile.elo=2100'); ev('LC64.openRanked("sight")');
 await new Promise(r=>setTimeout(r,1500));
 chk('ranked sheet shows a board',!!d.querySelector('[data-lc64-board] .lc-board,[data-lc64-board] [id^="lcb-"]'));
 // wrong move: black plays a7a6
 ev('window.__mv=null');
 const hostEl=d.querySelector('[data-lc64-board]');
 chk('timer bar exists',!!d.querySelector('[data-lc64-bar] i'));
 // force failure by waiting out the 10 s timer would be slow: call move through board API
 const cb=ev('LC64'); 
 // find the Board instance: use the module-private cur via a DOM-free trick: dispatch onMove through setInteractive callback is private, so check interrogation after the time runs out
 await new Promise(r=>setTimeout(r,10600));
 chk('time up starts the MSPC interrogation',/Move/.test((d.querySelector('[data-lc64-iq]')||{}).textContent||'')&&/1 of 4/.test((d.querySelector('[data-lc64-iq]')||{}).textContent||''));
 for(let i=0;i<4;i++){const b=d.querySelector('[data-lc64="iq-next"]');if(b)b.click();await new Promise(r=>setTimeout(r,60))}
 await new Promise(r=>setTimeout(r,200));
 const m=(d.querySelector('[data-lc64-msg]')||{}).textContent||'';
 chk('answer is revealed with an Action Step',/The move was/.test(m)&&/Action Step/.test(m),m.slice(0,160));
 chk('"Another puzzle" button',!!d.querySelector('[data-lc64="again"]'));
 // Action steps
 const nxt=ev('LC64.nextGames("S","tension")');
 chk('next-games order',/next 2 to 3 games/.test(nxt)&&/Tension/i.test(nxt),nxt.slice(0,120));
 const tail=ev('LC61.tail({fen:"r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 8",color:"w",k:"S",why:"x",ps:"Be2"})');
 chk('coach tail ends with the next-games order',/next 2 to 3 games/.test(tail));
 chk('Framework.summaryHTML is wrapped',ev('!!Framework.__lc64'));
 // Content Trim with stub engine and stub analysis
 ev('Admin.active=true');
 ev(`Engine.load=async()=>true; LC80.scan.parseGame=()=>({moves:[],fens:Array(40).fill("r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 8"),color:"w"}); LC80.scan.analyseGame=async()=>[{i:10,color:"w",san:"Be2",bestSan:"cxd5",loss:34,cls:"blunder"},{i:20,color:"w",san:"h3",bestSan:"Nxd5",loss:22,cls:"mistake"},{i:4,color:"w",san:"a3",loss:3,cls:"good"}]`);
 ev('LC39._t.games=async()=>[{site:"chesscom",pgn:"1. e4 e5",color:"w",opp:"rival",oppR:1500,res:"loss",tc:"rapid"}]');
 ev('Elo.start("chesscom","Kyenzo99")');
 ev('LC64.openTrim()'); await new Promise(r=>setTimeout(r,300));
 d.querySelector('[data-lc64="own"]').click(); await new Promise(r=>setTimeout(r,300));
 d.querySelector('[data-lc64="pick"]').click(); await new Promise(r=>setTimeout(r,500));
 const cards=d.querySelectorAll('.lc64-case');
 chk('two serious errors become two video concepts',cards.length===2,cards.length);
 chk('card has alarm, working point, action step, similar + prompt buttons',/a\) Alarm Signal/.test(cards[0].textContent)&&/b\) Working Point/.test(cards[0].textContent)&&/c\) Action Step/.test(cards[0].textContent)&&!!cards[0].querySelector('[data-lc64="similar"]')&&!!cards[0].querySelector('[data-lc64="prompt"]'));
 n=0; cards[0].querySelector('[data-lc64="similar"]').click(); await new Promise(r=>setTimeout(r,800));
 chk('similar position is fetched',/Lichess puzzle/.test(cards[0].textContent),cards[0].querySelector('[data-lc64-sim]').textContent.slice(0,80));
 const pr=ev('(()=>{const c=LC64.caseOf({fens:Array(40).fill("r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 8")},{i:10,color:"w",san:"Be2",bestSan:"cxd5",loss:34,cls:"blunder"});c.sim={id:"p1",rating:2000,themes:["fork"]};return LC64.buildPrompt(c,{opp:"rival",oppR:1500})})()');
 chk('prompt has the 5 parts, timings and facts',[1,2,3,4,5].every(k=>pr.includes('\n'+k+'. [')) && /0-9s/.test(pr)&&/75-90s/.test(pr)&&/2105/.test(pr)&&/\+630/.test(pr)&&/80 an hour/.test(pr)&&/Lichess puzzle p1/.test(pr));
 chk('prompt keeps the wording rules (no "lifetime"/"free"/"cheap" as claims)',!/lifetime 50|is free|very cheap/i.test(pr));
 // lesson-complete action step
 d.querySelector('#view').insertAdjacentHTML('beforeend','<div class="st-kicker">Lesson complete</div><div class="st-actions"><button data-act="back">Back</button></div>');
 ev('document.dispatchEvent(new MouseEvent("click",{bubbles:true}))');
 w.eval('(()=>{const b=document.createElement("button");b.setAttribute("data-eg-open","th1|learn");document.body.appendChild(b);b.click()})()');
 await new Promise(r=>setTimeout(r,900));
 chk('lesson complete gets a "Go straight to the Drill" button',!!d.querySelector('[data-lc64-learn]'),(d.querySelector('[data-lc64-learn]')||{}).textContent);
 d.querySelectorAll('.st-kicker').forEach(x=>x.remove());d.querySelectorAll('[data-lc64-learn]').forEach(x=>x.remove());d.querySelector('#view').insertAdjacentHTML('beforeend','<p>Drill complete.</p>');
 await new Promise(r=>setTimeout(r,900));
 chk('finished drill gets the sparring action step',!!d.querySelector('[data-lc64-drill]'));
};
