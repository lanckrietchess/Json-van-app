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
     - Answers are cached per position and move (lc92-cache), so opening the same mistake again costs no quota.
     9.82.0: bring your own key everywhere. AI.chat (every bot in the app) and Make My Own call complete() here; the Arena no longer
     answers AI questions. #ai-keys "Power the app with AI" (Account menu) explains the providers, free versus paid and the set-up. */
  const VERSION="9.82.0",KEY="lc92-ai",CACHE="lc92-cache";
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
  const PROV={
    gemini:{name:"Google Gemini",tag:"free tier",kind:"gemini",keyUrl:"https://aistudio.google.com/apikey",model:"gemini-flash-latest",pref:[/^gemini-flash-latest$/,/flash(?!.*(image|tts|live|audio))/,/pro/],
      steps:["Open aistudio.google.com/apikey and sign in with a Google account.","Click “Create API key”. No credit card is needed for the free tier.","Copy the key (it starts with AIza) and paste it here."],
      note:"Free within a daily limit per Google project (your limits are shown in AI Studio). In the EU, the UK and Switzerland Google applies its paid-service data terms to the free quota too; elsewhere free-tier requests may be used to improve Google’s products."},
    groq:{name:"Groq",tag:"free tier",kind:"openai",base:"https://api.groq.com/openai/v1",keyUrl:"https://console.groq.com/keys",model:"openai/gpt-oss-120b",pref:[/gpt-oss-120b/,/llama-3\.3-70b/,/70b/,/gpt-oss/],
      steps:["Open console.groq.com/keys and sign in.","Click “Create API Key”. The free plan needs no card.","Copy the key (it starts with gsk_) and paste it here."],
      note:"Free plan: you are never charged. Over the limit (per minute and per day, shown in your Groq console) it simply stops until the limit resets."},
    openrouter:{name:"OpenRouter",tag:"free models",kind:"openai",base:"https://openrouter.ai/api/v1",keyUrl:"https://openrouter.ai/settings/keys",model:"openrouter/free",pref:[/^openrouter\/free$/,/:free$/],
      steps:["Open openrouter.ai/settings/keys and sign in.","Click “Create Key”.","Copy the key (it starts with sk-or-) and paste it here. Models ending in :free cost nothing."],
      note:"Free models: 20 requests a minute and 50 a day (1,000 a day after a one-time $10 top-up). The free models change over time."},
    anthropic:{name:"Anthropic Claude",tag:"paid",kind:"anthropic",keyUrl:"https://console.anthropic.com/settings/keys",model:"claude-haiku-5-5",pref:[/haiku/,/sonnet/],
      steps:["Open console.anthropic.com and add a little credit under Billing (set a spend limit there too).","Open Settings > API keys and create a key.","Paste it here and press Test and save. The app picks Claude Haiku: the cheapest, and strong at chess explanations."],note:"Paid per use, billed by Anthropic to you. Claude Haiku 5.5: $0.10 per million input tokens and $0.50 per million output tokens, so one explanation of a mistake costs a small fraction of a cent."},
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
  /* o.text: a plain-text answer (the coach chat, the bots, scripts); otherwise Gemini is asked for JSON (the ✨ explanation). o.max: output tokens */
  async function complete(c,sys,user,o){
    o=o||{};const P=PROV[c.prov];if(!P)throw new Error("Pick a provider first.");
    if(P.kind==="gemini"){
      const b=await http("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(c.model||P.model)+":generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":c.key},
        body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:[{role:"user",parts:[{text:user}]}],generationConfig:Object.assign({temperature:0.3,maxOutputTokens:Math.max(4096,o.max||0)},o.text?{}:{responseMimeType:"application/json"})})});
      const parts=b&&b.candidates&&b.candidates[0]&&b.candidates[0].content&&b.candidates[0].content.parts||[];return parts.map(x=>x.text||"").join("");
    }
    if(P.kind==="anthropic"){
      const b=await http("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":c.key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:c.model||P.model,max_tokens:o.max||1200,system:sys,messages:[{role:"user",content:user}]})});
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
    for(let t=0;t<2;t++){txt=String(await complete(cfg(),sys,user,{text:true})||"").trim();bad=check({t:txt},W);if(!bad.length)break;user+="\n\nYou mentioned "+bad.slice(0,6).join(", ")+", which is not in the facts. Answer again using only the facts."}
    if(!txt||bad.length)return null;
    return{text:txt.slice(0,1500),ai:true};
  }


  /* ---------------- 9.82.0: the page "Power the app with AI" (#ai-keys, Account menu) ---------------- */
  const ROUTE="ai-keys";
  const isOwner=()=>{try{return !!(Admin.active||(typeof LC49!=="undefined"&&LC49.owner()))}catch(e){return false}};
  const PICK=[
    {k:"gemini",badge:"Free · recommended",why:"The best free start: strong models, a generous daily limit, no card.",cost:"Free within a daily limit per Google project. Over the limit the coach simply falls back to its standard explanation until the limit resets."},
    {k:"anthropic",badge:"Paid · recommended",why:"The most careful explanations. Pay only for what you use, billed by Anthropic to you.",cost:"Claude Haiku 5.5 costs $0.10 per million input tokens and $0.50 per million output tokens: one explanation of a mistake is a small fraction of a cent. Set a spend limit in your Anthropic console."},
    {k:"groq",badge:"Free",why:"Very fast answers on open models. Never charged on the free plan.",cost:"Over the free limit it stops until the limit resets; you are never billed."},
    {k:"openrouter",badge:"Free models",why:"One key for many free models.",cost:"20 requests a minute and 50 a day on free models (1,000 a day after a one-time $10 top-up). The free models change over time."},
    {k:"openai",badge:"Paid",why:"If you already have an OpenAI account.",cost:"Paid per use, billed by OpenAI to you."},
    {k:"chrome",badge:"Free, no key",why:"Chrome's own small model, on your computer. No account, no key.",cost:"Needs Chrome on a strong computer; not on phones. Its answers are checked extra strictly."}];
  function pageHTML(){
    const c=cfg(),act=on(),P=act?PROV[c.prov]:null;
    const card=x=>{const P2=PROV[x.k];return'<li class="lc92-pk'+(act&&c.prov===x.k?" is-on":"")+'"><div class="lc92-pkh"><b>'+esc(P2.name)+'</b><span class="lc92-tag">'+esc(x.badge)+'</span></div><p>'+esc(x.why)+'</p><p class="small">'+esc(x.cost)+'</p>'
      +'<details><summary>How to get the key</summary><ol class="lc92-steps">'+P2.steps.map(t=>'<li>'+esc(t)+'</li>').join("")+'</ol>'+(P2.note?'<p class="small">'+esc(P2.note)+'</p>':'')+'</details>'
      +'<div class="btn-row">'+(P2.keyUrl?'<a class="btn btn-quiet btn-sm" href="'+esc(P2.keyUrl)+'" target="_blank" rel="noopener noreferrer">Get a '+esc(P2.name)+' key</a>':'')+'<button type="button" class="btn btn-primary btn-sm" data-lc92="open" data-p="'+esc(x.k)+'">'+(act&&c.prov===x.k?"Change":"Use "+esc(P2.name))+'</button></div></li>'};
    return'<div class="lc92-page" data-lc92-page><header><p class="lc92-k">Account</p><h1>Power the app with AI</h1>'
      +'<p>Everything in the Hub works without AI: Stockfish runs on your device and the coach explains every mistake from the board, for free. Add your own AI key and the coach thinks along with you.</p></header>'
      +'<section class="lc92-card lc92-status" data-lc92-status>'+(act?'<p><b>Active on this device:</b> '+esc(P.name)+(c.model?' · '+esc(c.model):'')+'</p><div class="btn-row"><button type="button" class="btn btn-quiet btn-sm" data-lc92="open">Change or test</button><button type="button" class="btn btn-ghost btn-sm" data-lc92="forget">Remove my key</button></div>'
        :'<p><b>No AI key on this device yet.</b> The standard coach is on.</p><div class="btn-row"><button type="button" class="btn btn-primary btn-sm" data-lc92="open" data-p="gemini">Set up a free key (2 minutes)</button></div>')+'</section>'
      +'<section class="lc92-card"><h2>What a key adds</h2><ul class="lc92-list">'
      +'<li><b>Game reviews:</b> every key moment gets a deeper explanation (✨) that connects the board, Stockfish’s line and the habit behind your move.</li>'
      +'<li><b>The coach chat:</b> ask your own questions about a position and get an answer about that position.</li>'
      +'<li><b>The Pro coach:</b> ask it about your mistakes and the course chapter that fixes them, and it talks you through it.</li>'
      +'<li><b>Creators:</b> Make My Own scripts, hooks and thumbnail ideas in the Creator Studio.</li></ul>'
      +'<p class="small">Every move, square and piece the AI names is checked against the board and Stockfish. An answer with an invented move is thrown away and the standard coach stays on screen.</p></section>'
      +'<section class="lc92-card"><h2>Which key should I use?</h2><ul class="lc92-pks">'+PICK.map(card).join("")+'</ul></section>'
      +'<section class="lc92-card"><h2>Free or paid: the difference</h2><ul class="lc92-list">'
      +'<li><b>Limits:</b> a free key has a daily (and per-minute) cap. When you hit it, the coach falls back to its standard explanation. A paid key has no practical cap: you pay per use.</li>'
      +'<li><b>Quality:</b> the paid models reason more carefully about a position and its plans. The free routes are good for most explanations.</li>'
      +'<li><b>Your data:</b> each provider has its own terms. Google, for example, may use free-tier requests to improve its products outside the EU, the UK and Switzerland, but not paid requests.</li>'
      +'<li><b>Age:</b> providers set their own rules for who may use their API; Google’s terms ask API users to be 18 or older.</li>'
      +'<li><b>Cost for Lanckriet Chess:</b> none. It is your key and your account, free or paid.</li></ul></section>'
      +'<section class="lc92-card"><h2>How it works</h2><ol class="lc92-steps"><li>Pick a provider above and open its key page.</li><li>Create a key and copy it.</li><li>Press “Use …”, paste the key and press Test and save.</li><li>Done. The ✨ buttons, the coach chat and the Pro coach use it on this device.</li></ol>'
      +'<p class="small"><b>Your key stays on this device.</b> It is stored in this browser only and goes only to the provider you picked, straight from your device. It never goes to our server. On a new phone or computer, set it up again. Remove it here any time.</p></section>'
      +(isOwner()?'<section class="lc92-card lc92-own"><h2>Owner: your own key</h2><p>Put your Claude key in here (Use Anthropic Claude). It powers your own pages on this device: your reviews, the coach chat, Game-to-Script’s “Write the script with my key” and Make My Own. It is never shared with members: a key inside the page would be readable by anyone who opens the app, so every member uses their own key (or the standard coach).</p></section>':'')
      +'</div>';
  }
  function paintPage(){const h=document.querySelector("[data-lc92-host]");if(h)h.innerHTML=pageHTML()}
  function mount(view){css();const v=view||document.getElementById("view");if(!v)return;v.innerHTML='<div data-lc92-host>'+pageHTML()+'</div>'}
  /* ---------------- the set-up sheet ---------------- */
  function open(pick){
    close();const c=cfg(),sel=(pick&&PROV[pick])?pick:(c.prov||"gemini");
    const w=document.createElement("div");w.className="lc92-wrap";w.setAttribute("role","dialog");w.setAttribute("aria-modal","true");w.setAttribute("aria-labelledby","lc92-t");
    w.innerHTML='<div class="lc92-sheet"><button type="button" class="lc92-x" data-lc92="close" aria-label="Close">×</button>'
      +'<h2 id="lc92-t">Power the app with AI</h2>'
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
      try{w.querySelector('[data-lc92-f="model"]').value=r.model}catch(e){}try{paintPage()}catch(e){}}
    catch(e){st.textContent=e.message||String(e);try{console.error("LC92 test",e)}catch(x){}}
  }
  function forget(){ls.del(KEY);ls.del(CACHE);close();say("Your AI key is removed from this device.","good");try{paintPage()}catch(e){}}
  function onClick(e){
    const el=e.target.closest&&e.target.closest("[data-lc92]");if(!el)return;const a=el.getAttribute("data-lc92");
    if(a==="explain"){e.preventDefault();run(el.getAttribute("data-j"),el)}
    else if(a==="open"){e.preventDefault();open(el.getAttribute("data-p")||"")}
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
      +".lc92-by{font-size:11px;color:#94a3b8;font-weight:400}.lc92-err{color:#fca5a5}"
      +".lc92-page{max-width:760px;margin:0 auto;display:grid;gap:14px}.lc92-page h1{margin:2px 0 6px}.lc92-k{margin:0;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#38bdf8}"
      +".lc92-card{background:#1e293b;border:1px solid #334155;border-radius:14px;padding:14px 16px;display:grid;gap:8px;min-width:0}.lc92-card h2{margin:0;font-size:17px}.lc92-card p{margin:0;line-height:1.5}"
      +".lc92-status{border-color:rgba(56,189,248,.45)}.lc92-list{margin:0;padding-left:18px;display:grid;gap:6px}.lc92-pks{list-style:none;margin:0;padding:0;display:grid;gap:8px}"
      +".lc92-pk{border:1px solid #334155;border-radius:12px;background:#0f172a;padding:10px 12px;display:grid;gap:6px;min-width:0}.lc92-pk.is-on{border-color:#38bdf8}.lc92-pkh{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}"
      +".lc92-tag{font-size:11px;font-weight:700;color:#38bdf8;border:1px solid rgba(56,189,248,.5);border-radius:999px;padding:1px 8px}.lc92-pk summary{cursor:pointer;min-height:40px;display:flex;align-items:center;color:#cbd5e1}"
      +".lc92-page .btn-row{display:flex;flex-wrap:wrap;gap:8px}.lc92-page .btn{min-height:44px}.lc92-page a{color:#38bdf8;overflow-wrap:anywhere}.lc92-own{border-color:rgba(251,191,36,.5)}";
    document.head.appendChild(s);
  }
  function init(){css();document.addEventListener("click",onClick);
    try{if(typeof MOUNT!=="undefined"){MOUNT[ROUTE]=mount;try{DOC_TITLES[ROUTE]="Power the app with AI";ROUTE_TITLES[ROUTE]="power the app with AI"}catch(e){}}}catch(e){}
    try{const lv=LC26.levels,o=lv.minLevel;if(lv&&!lv.__lc92){lv.__lc92=1;lv.minLevel=r=>r===ROUTE?1:o(r)}}catch(e){}
    try{if(typeof PM_ITEMS!=="undefined"&&!PM_ITEMS.some(x=>x[0]==="#"+ROUTE)){const i=PM_ITEMS.findIndex(x=>x[0]==="#upgrades");PM_ITEMS.splice(i>=0?i+1:PM_ITEMS.length,0,["#"+ROUTE,"wand-magic-sparkles","Power the app with AI"])}}catch(e){}
    const go=()=>{if(String(location.hash||"").toLowerCase()==="#ai-coach"){open();try{history.replaceState(null,"",location.pathname+location.search+"#home")}catch(e){}}};
    window.addEventListener("hashchange",go);go()}
  if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init()}
  return{on:on,open:open,close:close,mount:mount,pageHTML:pageHTML,block:block,button:button,explain:explain,chat:chat,check:check,world:world,facts:facts,parseJSON:parseJSON,complete:complete,test:test,pickModel:pickModel,PROV:PROV,_cfg:cfg,version:VERSION};
})();
window.LC92=LC92;
/*@@end lc92*/
