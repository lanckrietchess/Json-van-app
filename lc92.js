/*@@module lc92*/
const LC92=(()=>{
  /* LC92 (9.56.0): the AI coach on the player's OWN key, or on the AI built into Chrome. It never costs the owner anything.
     - The standard coach (LC83.diagnose, the Coach Brain) always works without AI. This module only adds a deeper explanation.
     - Providers: Google Gemini (free tier), Groq (free tier), OpenRouter (free models), Anthropic, OpenAI (paid keys),
       and Chrome's built-in model (window.LanguageModel, the Prompt API: free, no key, desktop Chrome on strong hardware).
     - The key stays in this browser (localStorage "lc92-ai") and goes ONLY to the provider the player picked, straight from
       the browser. It never goes to our server or to the Arena.
     - The AI gets a fact sheet: the board, Stockfish's lines and the Coach Brain's diagnosis. It may only phrase and connect
       those facts. Every move, square and "piece on square" in its answer is checked against the board and Stockfish's lines
       (check()); an answer with an invented move is retried once, then dropped, and the standard coach stays on screen.
     - Answers are cached per position and move (lc92-cache), so opening the same mistake again costs no quota. */
  const VERSION="9.56.0",KEY="lc92-ai",CACHE="lc92-cache";
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
  const PROV={
    gemini:{name:"Google Gemini",tag:"free tier",kind:"gemini",keyUrl:"https://aistudio.google.com/apikey",model:"gemini-flash-latest",pref:[/^gemini-flash-latest$/,/flash(?!.*(image|tts|live|audio))/,/pro/],
      steps:["Open aistudio.google.com/apikey and sign in with a Google account.","Click “Create API key”. No credit card is needed for the free tier.","Copy the key (it starts with AIza) and paste it here."],
      note:"Free tier: a daily limit per Google project. Google may use free-tier requests to improve its products."},
    groq:{name:"Groq",tag:"free tier",kind:"openai",base:"https://api.groq.com/openai/v1",keyUrl:"https://console.groq.com/keys",model:"openai/gpt-oss-120b",pref:[/gpt-oss-120b/,/llama-3\.3-70b/,/70b/,/gpt-oss/],
      steps:["Open console.groq.com/keys and sign in.","Click “Create API Key”. The free plan needs no card.","Copy the key (it starts with gsk_) and paste it here."],
      note:"Free plan: limits per minute and per day, shown in your Groq console."},
    openrouter:{name:"OpenRouter",tag:"free models",kind:"openai",base:"https://openrouter.ai/api/v1",keyUrl:"https://openrouter.ai/settings/keys",model:"openrouter/free",pref:[/^openrouter\/free$/,/:free$/],
      steps:["Open openrouter.ai/settings/keys and sign in.","Click “Create Key”.","Copy the key (it starts with sk-or-) and paste it here. Models ending in :free cost nothing."],
      note:"Free models: about 50 requests a day (1,000 a day after a one-time $10 top-up), and they change over time."},
    anthropic:{name:"Anthropic Claude",tag:"paid",kind:"anthropic",keyUrl:"https://console.anthropic.com/settings/keys",model:"claude-haiku-5-5",pref:[/haiku/,/sonnet/],
      steps:["Open console.anthropic.com/settings/keys.","Create a key. This one is paid per use: a game review costs a fraction of a cent.","Paste it here."],note:"Paid per use, billed by Anthropic to you."},
    openai:{name:"OpenAI",tag:"paid",kind:"openai",base:"https://api.openai.com/v1",keyUrl:"https://platform.openai.com/api-keys",model:"",pref:[/mini/,/gpt/],
      steps:["Open platform.openai.com/api-keys.","Create a key. Paid per use.","Paste it here, then press Test to pick a model."],note:"Paid per use, billed by OpenAI to you."},
    chrome:{name:"Chrome built-in AI",tag:"free, no key",kind:"chrome",keyUrl:"",model:"",pref:[],
      steps:["Use Chrome on a computer (Chrome 148 or newer).","Press Test: Chrome downloads its own small model once (a few GB, Wi-Fi).","No key and no account. It runs on your computer."],
      note:"Needs a strong computer (about 16 GB of memory or a good graphics card). Not on phones. Smaller than the cloud models, so its answers are checked extra strictly."}
  };
  const cfg=()=>ls.get(KEY,{})||{};
  const on=()=>{const c=cfg();return !!(c.prov&&PROV[c.prov]&&(c.prov==="chrome"||c.key))};
  const say=(t,kind)=>{try{toast(t,kind||"",4200)}catch(e){}};

  /* ---------------- the fact sheet ---------------- */
  const NAME={p:"pawn",n:"knight",b:"bishop",r:"rook",q:"queen",k:"king"};
  function pieces(fen){
    const out={w:[],b:[]};try{const g=new Chess(fen);g.SQUARES.forEach(sq=>{const p=g.get(sq);if(p)out[p.color].push((p.type==="p"?"":p.type.toUpperCase())+sq)})}catch(e){}
    return"White: "+out.w.join(" ")+"; Black: "+out.b.join(" ");
  }
  function facts(d,o){
    const me=o.color==="b"?"Black":"White";
    return{
      student_plays:me,move_played:(o.num?o.num+(o.color==="b"?"...":". "):"")+(d.played||o.san||""),position_before_the_move:o.fen,pieces_before_the_move:pieces(o.fen),
      stockfish:{better_move:d.best||"",better_line:d.line&&d.line.best||"",what_the_better_line_wins:d.line&&d.line.won||"",
        their_best_answer:d.reply||"",line_after_the_mistake:d.line&&d.line.ref||"",what_the_mistake_costs:d.line&&d.line.lost||""},
      coach_brain_diagnosis:{cause:d.id,mspc_letter:d.k,what_went_wrong:d.error,their_last_move:d.why||"",alarm_signal:d.alarm?d.alarm.label+". "+d.alarm.say:"",
        working_point:d.wp?d.wp.text:"",action_step:d.action||"",how_a_human_finds_the_better_move:d.find||"",
        blind_spot:d.blind?d.blind.label+". "+d.blind.text:"",motifs_in_the_lines:(d.motifs||[]).map(m=>m.text).slice(0,4),recurring_pattern:d.pattern||""},
      student:{rating:o.rating||null}
    };
  }
  const SYS=["You are Coach Lanckriet: a certified chess coach (peak 2105) who trains players from 0 to 2000 with the MSPC system:",
    "M = Move: what did their last move change and threaten. S = Specifics: the features of this position and the plan. P = Priorities: checks, captures and attacks (CCA). C = Calculation: verify the line before you play it.",
    "You explain ONE mistake to the student who made it. You get a fact sheet built from the board and Stockfish. Rules:",
    "1. Use ONLY moves, squares and pieces that appear in the fact sheet. Never invent a move, a square, a piece position or an evaluation. If you are unsure, say less.",
    "2. Do not repeat the fact sheet. Explain the human side: why this move felt right, which question would have stopped it, and the one habit that fixes it.",
    "3. No generic advice that fits every position (never 'look at the pawn structure and make a plan' unless the fact sheet is about the pawn structure).",
    "4. Short, plain English, direct, warm, coach voice. Talk to the student as 'you'. Max 130 words in total.",
    "5. Answer with JSON only, no markdown: {\"headline\":\"one line\",\"why_it_felt_right\":\"...\",\"what_happened\":\"...\",\"alarm_signal\":\"...\",\"working_point\":\"...\",\"action_step\":\"...\",\"how_to_find_the_better_move\":\"...\",\"drill\":\"one concrete exercise for this week\"}"].join("\n");

  /* ---------------- the checker: nothing the board and Stockfish did not say ---------------- */
  const SAN_RE=/\b(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|[a-h]x[a-h][1-8](?:=[QRBN])?)[+#]?/g;
  const SQ_RE=/\b[a-h][1-8]\b/g,PIECE_RE=/\b(king|queen|rook|bishop|knight|pawn)\s+on\s+([a-h][1-8])\b/gi;
  function world(d,o){
    const fens=[o.fen],sans={},sqs={};
    const add=fen=>{try{const g=new Chess(fen);g.moves({verbose:true}).forEach(m=>{sans[m.san.replace(/[+#]/g,"")]=1})}catch(e){}};
    const play=(fen,list)=>{try{const g=new Chess(fen);(list||[]).forEach(u=>{const m=g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||"q"});if(m){sans[m.san.replace(/[+#]/g,"")]=1;fens.push(g.fen())}})}catch(e){}};
    add(o.fen);if(d.line){if(d.line.after){fens.push(d.line.after);add(d.line.after)}play(d.line.after||o.fen,d.line.refU);play(o.fen,d.line.bestU)}
    fens.forEach(f=>{try{const g=new Chess(f);g.SQUARES.forEach(q=>{if(g.get(q))sqs[q]=1})}catch(e){}});
    const text=JSON.stringify(facts(d,o));(text.match(SQ_RE)||[]).forEach(q=>{sqs[q]=1});(text.match(SAN_RE)||[]).forEach(s=>{sans[s.replace(/[+#]/g,"")]=1});
    return{fens:fens,sans:sans,sqs:sqs};
  }
  function check(ans,W){
    const bad=[];const txt=Object.keys(ans).map(k=>String(ans[k]||"")).join(" \n ");
    (txt.match(SAN_RE)||[]).forEach(s=>{const k=s.replace(/[+#]/g,"");if(!W.sans[k])bad.push(s)});
    (txt.match(SQ_RE)||[]).forEach(q=>{if(!W.sqs[q])bad.push(q)});
    let m;PIECE_RE.lastIndex=0;while((m=PIECE_RE.exec(txt))){const t={king:"k",queen:"q",rook:"r",bishop:"b",knight:"n",pawn:"p"}[m[1].toLowerCase()],q=m[2];
      const ok=W.fens.some(f=>{try{const p=new Chess(f).get(q);return p&&p.type===t}catch(e){return false}});if(!ok)bad.push(m[0])}
    return Array.from(new Set(bad));
  }
  function parseJSON(t){
    t=String(t||"").trim().replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();
    try{return JSON.parse(t)}catch(e){}
    const i=t.indexOf("{"),j=t.lastIndexOf("}");if(i>=0&&j>i){try{return JSON.parse(t.slice(i,j+1))}catch(e){}}
    return null;
  }

  /* ---------------- the providers ---------------- */
  async function http(url,init,ms){
    const ctl=typeof AbortController!=="undefined"?new AbortController():null,tm=setTimeout(()=>{try{ctl&&ctl.abort()}catch(e){}},ms||45000);
    let res;try{res=await fetch(url,Object.assign({},init,ctl?{signal:ctl.signal}:{}))}catch(e){clearTimeout(tm);const err=new Error(e&&e.name==="AbortError"?"The AI took too long to answer.":"The browser could not reach the provider ("+(e&&e.message||"network error")+"). Some providers block calls from web pages: test another one.");err.net=true;throw err}
    clearTimeout(tm);let body=null,raw="";try{raw=await res.text();body=JSON.parse(raw)}catch(e){}
    if(!res.ok){const msg=body&&(body.error&&(body.error.message||body.error)||body.message)||raw.slice(0,200)||res.statusText;
      const err=new Error(res.status===429?"Your quota at this provider is used up for now ("+msg+"). The standard coach keeps working.":res.status===401||res.status===403?"The provider refused the key ("+msg+").":"The provider answered "+res.status+": "+msg);err.status=res.status;throw err}
    return body;
  }
  async function complete(c,sys,user){
    const P=PROV[c.prov];if(!P)throw new Error("Pick a provider first.");
    if(P.kind==="gemini"){
      const b=await http("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(c.model||P.model)+":generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":c.key},
        body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:[{role:"user",parts:[{text:user}]}],generationConfig:{temperature:0.3,responseMimeType:"application/json",maxOutputTokens:4096}})});
      const parts=b&&b.candidates&&b.candidates[0]&&b.candidates[0].content&&b.candidates[0].content.parts||[];return parts.map(x=>x.text||"").join("");
    }
    if(P.kind==="anthropic"){
      const b=await http("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":c.key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:c.model||P.model,max_tokens:1200,system:sys,messages:[{role:"user",content:user}]})});
      return(b&&b.content||[]).filter(x=>x.type==="text").map(x=>x.text).join("");
    }
    if(P.kind==="openai"){
      if(!(c.model||P.model))throw new Error("Press Test first so the app can pick a model.");
      const h={"Content-Type":"application/json","Authorization":"Bearer "+c.key};if(c.prov==="openrouter"){h["X-Title"]="Lanckriet Chess"}
      const b=await http(P.base+"/chat/completions",{method:"POST",headers:h,body:JSON.stringify({model:c.model||P.model,temperature:0.3,messages:[{role:"system",content:sys},{role:"user",content:user}]})});
      return b&&b.choices&&b.choices[0]&&b.choices[0].message&&b.choices[0].message.content||"";
    }
    if(P.kind==="chrome"){
      if(typeof LanguageModel==="undefined")throw new Error("This browser has no built-in AI. It needs Chrome 148 or newer on a computer.");
      const s=await LanguageModel.create({initialPrompts:[{role:"system",content:sys}],expectedInputs:[{type:"text",languages:["en"]}],expectedOutputs:[{type:"text",languages:["en"]}]});
      try{return await s.prompt(user)}finally{try{s.destroy()}catch(e){}}
    }
    throw new Error("Unknown provider.");
  }
  async function models(c){
    const P=PROV[c.prov];
    if(P.kind==="gemini"){const b=await http("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",{headers:{"x-goog-api-key":c.key}},20000);
      return(b&&b.models||[]).filter(m=>(m.supportedGenerationMethods||[]).indexOf("generateContent")>=0).map(m=>String(m.name).replace(/^models\//,""))}
    if(P.kind==="openai"){const b=await http(P.base+"/models",{headers:{"Authorization":"Bearer "+c.key}},20000);return(b&&b.data||[]).map(m=>m.id)}
    if(P.kind==="anthropic"){const b=await http("https://api.anthropic.com/v1/models",{headers:{"x-api-key":c.key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"}},20000);return(b&&b.data||[]).map(m=>m.id)}
    return[];
  }
  function pickModel(list,P,cur){
    if(cur&&list.indexOf(cur)>=0)return cur;if(P.model&&list.indexOf(P.model)>=0)return P.model;
    for(const re of P.pref){const m=list.filter(x=>re.test(x))[0];if(m)return m}
    return list[0]||P.model||"";
  }
  async function test(c){
    const P=PROV[c.prov];
    if(P.kind==="chrome"){
      if(typeof LanguageModel==="undefined")throw new Error("No built-in AI in this browser. It needs Chrome 148 or newer on a computer; phones are not supported.");
      const a=await LanguageModel.availability({expectedInputs:[{type:"text",languages:["en"]}],expectedOutputs:[{type:"text",languages:["en"]}]});
      if(a==="unavailable")throw new Error("Chrome says this device cannot run its built-in AI (not enough memory, graphics or disk space).");
      const t=await complete(c,"Answer with one word.","Say ready.");return{model:"Gemini Nano (in Chrome)",note:a==="available"?"Ready.":"The model is downloaded and ready.",reply:t};
    }
    let list=[];try{list=await models(c)}catch(e){if(e.status===401||e.status===403)throw e}
    const model=pickModel(list,P,c.model);if(!model)throw new Error("No model found for this key.");
    const t=await complete(Object.assign({},c,{model:model}),"Answer with JSON only.",'Return {"ok":true}');
    return{model:model,reply:t,count:list.length};
  }

  /* ---------------- explain one mistake ---------------- */
  const cacheKey=(d,o)=>String(o.fen)+"|"+(d.played||o.san||"")+"|"+(cfg().prov||"");
  async function explain(d,o){
    const c=cfg();if(!on())throw new Error("No AI set up.");
    const ck=cacheKey(d,o),cache=ls.get(CACHE,{})||{};if(cache[ck])return Object.assign({cached:true},cache[ck]);
    const W=world(d,o),F=facts(d,o);let user="FACT SHEET (from the board and Stockfish, all true):\n"+JSON.stringify(F,null,1)+"\n\nExplain this mistake to the student. JSON only.";
    let ans=null,bad=[],tries=0;
    while(tries<2){tries++;
      const raw=await complete(c,SYS,user);ans=parseJSON(raw);
      if(!ans){bad=["not JSON"];user+="\n\nYour last answer was not valid JSON. Answer with the JSON object only.";continue}
      bad=check(ans,W);if(!bad.length)break;
      user+="\n\nYour last answer mentioned "+bad.slice(0,8).join(", ")+", which is NOT in the fact sheet or not on the board. Rewrite it using only the moves, squares and pieces in the fact sheet.";
    }
    if(!ans||bad.length){const e=new Error("The AI answer mentioned "+(bad.length?bad.slice(0,4).join(", "):"nothing usable")+", which does not match the board or Stockfish, so it is not shown. The standard coach above is correct.");e.rejected=true;throw e}
    const out={ans:ans,prov:c.prov,model:c.model||PROV[c.prov].model};
    cache[ck]=out;const ks=Object.keys(cache);if(ks.length>200)delete cache[ks[0]];ls.set(CACHE,cache);
    return out;
  }
  const LABELS=[["why_it_felt_right","Why it felt right"],["what_happened","What happened"],["alarm_signal","Alarm Signal"],["working_point","Working Point"],["action_step","Action Step"],["how_to_find_the_better_move","How to find the better move"],["drill","Your drill this week"]];
  function answerHTML(r){
    const a=r.ans||{};return'<div class="lc92-ans"><p class="lc92-h"><b>'+esc(a.headline||"Coach Lanckriet, deeper")+'</b> <span class="lc92-by">'+esc(PROV[r.prov]?PROV[r.prov].name:"AI")+(r.cached?" · saved":"")+' · checked against the board</span></p>'
      +LABELS.filter(x=>a[x[0]]).map(x=>'<p><b>'+x[1]+'.</b> '+esc(a[x[0]])+'</p>').join("")+'</div>';
  }
  const JOBS={};let jn=0;
  function block(d,o){
    if(!d||!o||!o.fen)return"";const id="j"+(++jn);JOBS[id]={d:d,o:o};
    return'<div class="lc92-box" data-lc92-box="'+id+'"><button type="button" class="btn btn-ghost btn-sm" data-lc92="explain" data-j="'+id+'">'+(on()?"✨ Deeper with your AI":"✨ Deeper with AI (free key)")+'</button><div data-lc92-out></div></div>';
  }
  const button=(d,o)=>block(d,o);
  async function run(id,btn){
    const j=JOBS[id];if(!j)return;const box=btn.closest("[data-lc92-box]"),out=box&&box.querySelector("[data-lc92-out]");if(!out)return;
    if(!on()){open();return}
    btn.disabled=true;out.innerHTML='<p class="small muted">Asking your AI. Every move it names is checked against the board…</p>';
    try{const r=await explain(j.d,j.o);out.innerHTML=answerHTML(r)}
    catch(e){out.innerHTML='<p class="small lc92-err">'+esc(e.message||String(e))+'</p>';try{(e.rejected?console.warn:console.error)("LC92",e.message)}catch(x){}}
    btn.disabled=false;
  }

  /* ---------------- the coach chat on the player's key ---------------- */
  async function chat(q,ctx){
    if(!on())return null;
    const fen=ctx.fen,it=ctx.item,last=ctx.last;let lines=[];
    try{if(typeof Engine!=="undefined"){const r=await Engine.analyse(fen,{depth:12,multipv:3});lines=(r.lines||[]).slice(0,3).map(l=>({eval:Engine.fmt(l),line:Engine.pvText(fen,l.pv,8)}))}}catch(e){}
    const F={position:fen,pieces:pieces(fen),side_to_move:String(fen).split(" ")[1]==="w"?"White":"Black",student_plays:ctx.user==="b"?"Black":"White",
      last_move:last?last.san:"",game_so_far:(ctx.moves||[]).map(m=>m.san).join(" ").slice(-600),stockfish_lines_here:lines,
      review_of_this_move:it&&it.diag?{what_went_wrong:it.diag.error,alarm:it.diag.alarm&&it.diag.alarm.label,action_step:it.diag.action,blind_spot:it.diag.blind&&it.diag.blind.text,line_after:it.diag.line&&it.diag.line.ref,better_line:it.diag.line&&it.diag.line.best}:it?{class:it.cls,text:it.text}:null};
    const W={fens:[fen].concat(ctx.before?[ctx.before]:[]),sans:{},sqs:{}};
    W.fens.forEach(f=>{try{const g=new Chess(f);g.moves({verbose:true}).forEach(m=>{W.sans[m.san.replace(/[+#]/g,"")]=1});g.SQUARES.forEach(s=>{if(g.get(s))W.sqs[s]=1})}catch(e){}});
    const ft=JSON.stringify(F);(ft.match(SAN_RE)||[]).forEach(s=>{W.sans[s.replace(/[+#]/g,"")]=1});(ft.match(SQ_RE)||[]).forEach(s=>{W.sqs[s]=1});
    const sys=SYS.split("\n").slice(0,4).join("\n")+"\nAnswer the student's question about this position in at most 110 words, plain text, no markdown. Use only moves and squares from the facts.";
    let user="FACTS (board + Stockfish, all true):\n"+JSON.stringify(F,null,1)+"\n\nSTUDENT: "+String(q).slice(0,600),txt="",bad=[];
    for(let t=0;t<2;t++){txt=String(await complete(cfg(),sys,user)||"").trim();bad=check({t:txt},W);if(!bad.length)break;user+="\n\nYou mentioned "+bad.slice(0,6).join(", ")+", which is not in the facts. Answer again using only the facts."}
    if(!txt||bad.length)return null;
    return{text:txt.slice(0,1500),ai:true};
  }

  /* ---------------- the set-up sheet ---------------- */
  function open(){
    close();const c=cfg(),sel=c.prov||"gemini";
    const w=document.createElement("div");w.className="lc92-wrap";w.setAttribute("role","dialog");w.setAttribute("aria-modal","true");w.setAttribute("aria-labelledby","lc92-t");
    w.innerHTML='<div class="lc92-sheet"><button type="button" class="lc92-x" data-lc92="close" aria-label="Close">×</button>'
      +'<h2 id="lc92-t">AI coach on your own key</h2>'
      +'<p class="small">The coach already explains every mistake from the board and Stockfish, for free. With an AI key it adds a deeper, personal explanation and answers your own questions in the coach chat. <b>Your key stays on this device</b> and goes only to the provider you pick. Lanckriet Chess never sees it and never pays for it, and you pay nothing with a free key.</p>'
      +'<label class="lc92-f"><span>Provider</span><select data-lc92-f="prov">'+Object.keys(PROV).map(k=>'<option value="'+k+'"'+(k===sel?" selected":"")+'>'+esc(PROV[k].name)+' ('+esc(PROV[k].tag)+')</option>').join("")+'</select></label>'
      +'<div data-lc92-steps></div>'
      +'<label class="lc92-f" data-lc92-keyrow><span>API key</span><input type="password" autocomplete="off" spellcheck="false" data-lc92-f="key" value="'+esc(c.prov===sel?c.key||"":"")+'" placeholder="Paste your key"></label>'
      +'<label class="lc92-f" data-lc92-modelrow><span>Model (filled in by Test)</span><input type="text" data-lc92-f="model" value="'+esc(c.prov===sel?c.model||"":"")+'" placeholder="automatic"></label>'
      +'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc92="save">Test and save</button>'+(on()?'<button type="button" class="btn btn-ghost" data-lc92="forget">Remove my key</button>':'')+'</div>'
      +'<p class="small" data-lc92-st aria-live="polite">'+(on()?"Active: "+esc(PROV[c.prov].name)+(c.model?" · "+esc(c.model):""):"Not set up yet.")+'</p></div>';
    document.body.appendChild(w);paintSteps(w);
    const s=w.querySelector('[data-lc92-f="prov"]');s.addEventListener("change",()=>{const cc=cfg();w.querySelector('[data-lc92-f="key"]').value=cc.prov===s.value?cc.key||"":"";w.querySelector('[data-lc92-f="model"]').value=cc.prov===s.value?cc.model||"":"";paintSteps(w)});
    setTimeout(()=>{try{s.focus()}catch(e){}},50);
  }
  function paintSteps(w){
    const k=w.querySelector('[data-lc92-f="prov"]').value,P=PROV[k];
    w.querySelector("[data-lc92-steps]").innerHTML='<ol class="lc92-steps">'+P.steps.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ol>'+(P.keyUrl?'<p class="small"><a href="'+esc(P.keyUrl)+'" target="_blank" rel="noopener noreferrer">Open '+esc(P.name)+' to get a key ↗</a></p>':'')+'<p class="small muted">'+esc(P.note)+'</p>';
    w.querySelector("[data-lc92-keyrow]").hidden=k==="chrome";w.querySelector("[data-lc92-modelrow]").hidden=k==="chrome";
  }
  function close(){document.querySelectorAll(".lc92-wrap").forEach(x=>x.remove())}
  async function save(w){
    const st=w.querySelector("[data-lc92-st]"),prov=w.querySelector('[data-lc92-f="prov"]').value,key=String(w.querySelector('[data-lc92-f="key"]').value||"").trim(),model=String(w.querySelector('[data-lc92-f="model"]').value||"").trim();
    if(prov!=="chrome"&&!key){st.textContent="Paste your key first.";return}
    st.textContent="Testing the connection…";
    try{const r=await test({prov:prov,key:key,model:model});ls.set(KEY,{prov:prov,key:prov==="chrome"?"":key,model:r.model,at:Date.now()});
      st.textContent="Works: "+PROV[prov].name+" · "+r.model+". The ✨ buttons and the coach chat now use it.";say("AI coach ready: "+PROV[prov].name,"good");
      try{w.querySelector('[data-lc92-f="model"]').value=r.model}catch(e){}}
    catch(e){st.textContent=e.message||String(e);try{console.error("LC92 test",e)}catch(x){}}
  }
  function forget(){ls.del(KEY);ls.del(CACHE);close();say("Your AI key is removed from this device.","good")}
  function onClick(e){
    const el=e.target.closest&&e.target.closest("[data-lc92]");if(!el)return;const a=el.getAttribute("data-lc92");
    if(a==="explain"){e.preventDefault();run(el.getAttribute("data-j"),el)}
    else if(a==="open"){e.preventDefault();open()}
    else if(a==="close"){e.preventDefault();close()}
    else if(a==="save"){e.preventDefault();save(el.closest(".lc92-wrap"))}
    else if(a==="forget"){e.preventDefault();forget()}
  }
  function css(){
    if(document.getElementById("lc92-css"))return;const s=document.createElement("style");s.id="lc92-css";
    s.textContent=".lc92-wrap{position:fixed;inset:0;z-index:2147483000;background:rgba(2,6,23,.72);display:flex;align-items:flex-end;justify-content:center}"
      +"@media(min-width:700px){.lc92-wrap{align-items:center}}"
      +".lc92-sheet{position:relative;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:18px 18px 0 0;width:100%;max-width:560px;max-height:92vh;overflow:auto;padding:18px 16px 22px;box-sizing:border-box}"
      +"@media(min-width:700px){.lc92-sheet{border-radius:18px}}.lc92-sheet h2{font-size:19px;margin:0 32px 8px 0}"
      +".lc92-x{position:absolute;top:8px;right:10px;background:none;border:0;color:#94a3b8;font-size:26px;line-height:1;cursor:pointer;min-width:44px;min-height:44px}"
      +".lc92-f{display:grid;gap:4px;margin:10px 0}.lc92-f span{font-size:13px;color:#94a3b8}.lc92-f input,.lc92-f select{background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:10px;padding:10px;font-size:15px;width:100%;box-sizing:border-box}"
      +".lc92-steps{margin:8px 0;padding-left:20px;font-size:14px}.lc92-steps li{margin:3px 0}.lc92-sheet a{color:#38bdf8}"
      +".lc92-box{margin-top:6px}.lc92-ans{border:1px solid rgba(56,189,248,.35);background:rgba(56,189,248,.07);border-radius:12px;padding:10px 12px;margin-top:8px}.lc92-ans p{margin:4px 0}"
      +".lc92-by{font-size:11px;color:#94a3b8;font-weight:400}.lc92-err{color:#fca5a5}";
    document.head.appendChild(s);
  }
  function init(){css();document.addEventListener("click",onClick);
    const go=()=>{if(String(location.hash||"").toLowerCase()==="#ai-coach"){open();try{history.replaceState(null,"",location.pathname+location.search+"#home")}catch(e){}}};
    window.addEventListener("hashchange",go);go()}
  if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init()}
  return{on:on,open:open,close:close,block:block,button:button,explain:explain,chat:chat,check:check,world:world,facts:facts,parseJSON:parseJSON,complete:complete,test:test,pickModel:pickModel,PROV:PROV,_cfg:cfg,version:VERSION};
})();
window.LC92=LC92;
/*@@end lc92*/
