/* ---------- LC31 (9.9.0): Creator Studio layer. Lives inside the Studio closure (it needs Cam, Mic, LAYOUT, Board, Libs ...).
   Hoisted helpers first: sanitizeLayout runs before this block is evaluated, so these must be function declarations. ---------- */
function LC31_RATIO(c){const r=c&&c.ratio;return["1:1","4:3","3:4","16:9","9:16","4:5","free"].indexOf(r)>=0?r:(c&&c.shape==="circle"?"1:1":"free")}
function LC31_PXA(c){if(!c||c.fill==="full")return 0;if(c.shape==="circle")return 1;const r=LC31_RATIO(c);if(r==="free")return 0;const p=r.split(":");return(+p[0])/(+p[1])}
function LC31_SHAPEHOOK(s){const c=LAYOUT.layers.camera;c.fill="pip";c.ratio=s==="circle"?"1:1":"free"}
const LC31_CSS=`
.lc31-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid rgba(0,229,255,.12)}
.lc31-row .btn.busy{opacity:.6;pointer-events:none}
.lc31-row select{width:auto;height:28px}
.lc31-vu{display:flex;align-items:center;gap:8px;margin:6px 0 2px;min-width:140px}
.lc31-row .lc31-vu{flex:0 0 190px;margin:0}
.lc31-vu-bar{position:relative;flex:1;height:10px;border-radius:6px;overflow:hidden;background:linear-gradient(90deg,#22c55e 0,#22c55e 60%,#f59e0b 60%,#f59e0b 85%,#ef4444 85%,#ef4444 100%)}
.lc31-vu-cover{position:absolute;right:0;top:0;bottom:0;width:100%;background:#12151c}
.lc31-vu-peak{position:absolute;top:0;bottom:0;width:2px;background:#fff;left:0;opacity:.9}
.lc31-vu-db{font:500 11px/1 'JetBrains Mono',monospace;color:var(--fog,#8DA2B3);min-width:48px;text-align:right}
.lc31-vu-hint{font-size:12px;color:#f59e0b;margin:2px 0 6px}
.lc31-banner{margin:8px 12px 0;padding:10px 12px;border-radius:10px;border:1px solid rgba(239,68,68,.45);background:rgba(239,68,68,.1);color:#fecaca;font-size:13px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.lc31-banner[hidden]{display:none}
.lc31-banner span{flex:1 1 220px}
.lc31-cta{position:absolute;z-index:6;display:flex;align-items:center;justify-content:center;border:1.5px dashed rgba(0,229,255,.55);border-radius:12px;background:rgba(10,11,14,.55);pointer-events:none}
.lc31-cta button{pointer-events:auto}
.lc31-game{margin:8px 12px 0;padding:8px 10px;border-radius:10px;border:1px solid rgba(0,229,255,.2);background:rgba(10,11,14,.5);font-size:12.5px}
.lc31-game[hidden]{display:none}
.lc31-game .t{font-weight:600;color:var(--chalk,#e5edf5)}
.lc31-moments{max-height:132px;overflow:auto;margin-top:6px;display:flex;flex-direction:column;gap:4px}
.lc31-moment{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.lc31-moment b{min-width:150px}
.lc31-prog{height:4px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:6px}
.lc31-prog i{display:block;height:100%;width:0;background:#00E5FF}
.lc31-scrim{position:absolute;inset:0;z-index:60;background:rgba(5,6,9,.72);display:flex;align-items:center;justify-content:center;padding:14px;backdrop-filter:blur(6px)}
.lc31-modal{width:min(94vw,860px);max-height:92%;overflow:auto;border-radius:16px;border:1px solid rgba(0,229,255,.25);background:#0d1017;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.6)}
.lc31-modal.wide{width:min(96vw,1060px)}
.lc31-modal h3{margin:0 0 4px;font-size:18px}
.lc31-modal .sub{color:var(--fog,#8DA2B3);font-size:13px;margin-bottom:12px}
.lc31-fmts{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.lc31-fmt{text-align:left;border:1px solid rgba(0,229,255,.18);background:rgba(255,255,255,.03);color:inherit;border-radius:12px;padding:12px;cursor:pointer;display:flex;flex-direction:column;gap:4px}
.lc31-fmt:hover,.lc31-fmt:focus-visible,.lc31-fmt[aria-pressed=true]{border-color:#00E5FF;background:rgba(0,229,255,.08);outline:none}
.lc31-fmt b{font-size:14px}.lc31-fmt small{color:var(--fog,#8DA2B3);font-size:12px;line-height:1.35}
.lc31-fmt .tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.lc31-fmt .tags span{font-size:10.5px;padding:2px 7px;border-radius:99px;border:1px solid rgba(0,229,255,.3);color:#7ee9ff}
.lc31-drop{position:absolute;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:rgba(0,229,255,.12);border:3px dashed #00E5FF;font-size:20px;font-weight:600;color:#e6fcff;pointer-events:none}
.lc31-drop[hidden]{display:none}
.lc31-dz{border:2px dashed rgba(0,229,255,.4);border-radius:12px;padding:12px;text-align:center;color:var(--fog,#8DA2B3);font-size:13px}
.lc31-dz textarea{width:100%;min-height:150px;margin:8px 0}
.lc31-car{display:grid;grid-template-columns:130px 1fr 280px;gap:14px}
@media(max-width:820px){.lc31-car{grid-template-columns:1fr}}
.lc31-thumbs{display:flex;flex-direction:column;gap:8px;max-height:560px;overflow:auto}
.lc31-thumb{border:2px solid transparent;border-radius:8px;padding:0;background:none;cursor:pointer;position:relative}
.lc31-thumb[aria-pressed=true]{border-color:#00E5FF}
.lc31-thumb canvas{width:100%;display:block;border-radius:6px}
.lc31-thumb i{position:absolute;left:6px;top:4px;font:600 11px 'JetBrains Mono',monospace;color:#fff;text-shadow:0 1px 3px #000;font-style:normal}
.lc31-prev canvas{width:100%;max-height:560px;object-fit:contain;border-radius:10px;border:1px solid rgba(0,229,255,.2);background:#000}
.lc31-form{display:flex;flex-direction:column;gap:8px}
.lc31-form label{font-size:12px;color:var(--fog,#8DA2B3)}
.lc31-form input,.lc31-form textarea,.lc31-form select{width:100%}
.lc31-form textarea{min-height:80px}
.lc31-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}
.lc31-bar select{width:auto;min-width:150px}
.lc31-gbar{display:flex;flex-direction:column;gap:6px;margin:0 0 10px;padding:8px;border-radius:10px;border:1px solid rgba(0,229,255,.18);background:rgba(255,255,255,.02)}
.lc31-gbar .r{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.lc31-gbar input,.lc31-gbar select{width:auto;flex:1 1 120px;height:28px}
.layer.lc31-full{pointer-events:none!important;z-index:0!important;border-style:dashed}
.layer.lc31-full .h,.layer.lc31-full .tag{display:none!important}
`;
const LC31=(()=>{
  const FMT={
    short:{id:"short",label:"Short / Reel",desc:"Vertical 9:16 for YouTube Shorts, Reels and TikTok. Hook in the first 2 seconds.",aspect:"9:16",scene:"board",look:"circle",tags:["9:16","under 60 s"],
      tpl:"## Hook (0:00-0:03)\n[One sentence that names the mistake or the surprise]\n\n## Position (0:03-0:15)\n[Show the board. What does the viewer see?]\n\n## MSPC (0:15-0:40)\nMove: what is the opponent threatening?\nSpecifics: what is special about this position?\nPriorities: checks, captures, attacks.\nCalculation: the line, move by move.\n\n## Call to action (0:40-0:50)\nTrain this free in the Hub. Link in bio."},
    aishort:{id:"aishort",label:"AI-Generated Short",desc:"Vertical 9:16. Your script is read aloud by the AI voice through the render queue.",aspect:"9:16",scene:"board",look:"circle",ai:"short",tags:["9:16","AI voice","25 tokens"],
      tpl:"## Hook\n[One spoken sentence]\n\n## Story\n[Write the narration exactly as it should be spoken. Headings and timecodes are removed before the voice reads it.]\n\n## Call to action\nTrain this free in the Hub. Link in bio."},
    long:{id:"long",label:"Long-Form Video",desc:"Horizontal 16:9 for YouTube. Camera beside the board, script above.",aspect:"16:9",scene:"script",look:"wide",tags:["16:9","8-15 min"],
      tpl:"## Hook (0:00-0:20)\n[The promise of the video]\n\n## Why this matters (0:20-1:00)\n[The rating leak this fixes]\n\n## Part 1\n[Position and idea]\n\n## Part 2\n[Position and idea]\n\n## Part 3\n[Position and idea]\n\n## Recap and call to action\n[Three takeaways. Where to train this.]"},
    ailong:{id:"ailong",label:"AI-Generated Long-Form Video",desc:"Horizontal 16:9 with an AI voice-over from your script (render queue).",aspect:"16:9",scene:"script",look:"wide",ai:"long",tags:["16:9","AI voice","100 tokens"],
      tpl:"## Intro\n[Narration]\n\n## Main part\n[Narration, one idea per paragraph]\n\n## Outro\n[Narration and call to action]"},
    carousel:{id:"carousel",label:"Carousel / Slide Deck",desc:"Multi-slide post for Instagram and LinkedIn. Cover, positions from a real game, call to action. Exports PNG.",aspect:"4:5",carousel:true,tags:["4:5","PNG slides"]},
    puzzle:{id:"puzzle",label:"Community Puzzle Breakdown",desc:"Show a student puzzle, give the viewer time to think, then walk through it with MSPC.",aspect:"9:16",scene:"board",look:"circle",tags:["9:16","community"],
      tpl:"## Hook\nCan you find the winning move? Pause now.\n\n## The position\n[Who sent it. Whose move. What is at stake.]\n\n## Think time (5 seconds)\n\n## MSPC reveal\nMove / Specifics / Priorities / Calculation.\n\n## Call to action\nSend me your position in the comments."},
    review:{id:"review",label:"Live Game Review",desc:"Horizontal 16:9. Camera large, board beside it, step through a real game and talk.",aspect:"16:9",scene:"streamer",look:"wide",tags:["16:9","real games"],
      tpl:"## Intro\nWho played, rating, why this game.\n\n## Opening\n[Where did the game leave theory?]\n\n## The critical moment\n[Pause on the biggest swing. MSPC it.]\n\n## Lessons\n[Two habits to fix]"},
    trap:{id:"trap",label:"Opening Trap Breakdown",desc:"Vertical 9:16. One trap, the bait, the punishment, how to avoid it.",aspect:"9:16",scene:"board",look:"circle",tags:["9:16","openings"],
      tpl:"## Hook\nThis trap wins a queen in 7 moves.\n\n## The bait\n[Moves and why they look natural]\n\n## The punishment\n[The refutation]\n\n## How to avoid it\n[One rule]\n\n## Call to action\nFull repertoire in the Hub."}
  };
  const FMT_ORDER=["short","aishort","long","ailong","carousel","puzzle","review","trap"];
  const LOOKS=[["circle","Circle"],["rounded","Rounded"],["square","Square"],["wide","Wide 16:9"],["tall","Portrait 3:4"],["full","Full frame"]];
  const RATIOS=[["1:1","1:1 square"],["4:3","4:3"],["3:4","3:4 portrait"],["16:9","16:9 wide"],["9:16","9:16 tall"],["4:5","4:5"],["free","Free"]];
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let on=false,raf=0,vuT0=0,lastSound=0,metaKey="",gameToken=0,timer1=0,timer2=0,hooked=false;
  const VU={lvl:0,peak:0,peakT:0};
  const S={moments:null,busy:false,gf:{student:"",res:""},aiKind:"",carSel:0};
  const stage=()=>$("#stage");
  /* ---------- hardware: connect, banner, meter ---------- */
  function showBanner(msg){
    let b=$("#lc31-banner");if(!b)return;
    const embedded=(()=>{try{return window.top!==window.self}catch(e){return true}})();
    b.hidden=false;
    $("span",b).textContent=msg+(embedded&&/block|denied|allow|permission/i.test(msg)?" This page is embedded in another page. Open the Hub in its own browser tab: embedded pages need permission to use the camera.":"");
  }
  function hideBanner(){const b=$("#lc31-banner");if(b)b.hidden=true}
  async function connectAV(){
    const b=$("#lc31-connect");
    if(b){b.classList.add("busy");b.setAttribute("aria-busy","true")}
    hideBanner();
    let perm="";
    try{if(navigator.permissions&&navigator.permissions.query){const p=await navigator.permissions.query({name:"camera"});perm=p.state}}catch(e){}
    let s=null;
    if(perm==="denied"){
      showBanner("Camera access is blocked for this site. Click the lock or camera icon in the address bar, set Camera and Microphone to Allow, then press Try again.");
    }else{
      try{s=await startCreatorStream()}catch(e){showBanner(Hardware.explain(e))}
      if(!s){const bn=$("#lc31-banner");if(bn&&bn.hidden)showBanner(Hardware.lastMsg||"The camera and microphone could not start.")}
    }
    if(b){b.classList.remove("busy");b.removeAttribute("aria-busy")}
    if(s){
      const c=LAYOUT.layers.camera;
      if(!c.on){c.on=true;saveLayout();syncStageUI();markDirty()}
      const vt=s.getVideoTracks()[0],at=s.getAudioTracks()[0];
      toast("Connected: "+(vt?vt.label||"camera":"no camera")+(at?" + "+(at.label||"microphone"):" (no microphone)"),"ok",2800);
      hideBanner();
    }
    syncConnectBtn();
    return s;
  }
  function syncConnectBtn(){
    const b=$("#lc31-connect");if(!b)return;
    const live=Hardware.live||Cam.active||Mic.active;
    b.classList.toggle("on",!!live);
    const sp=$("span",b);if(sp)sp.textContent=live?"Reconnect camera & mic":"Connect camera & mic";
  }
  function vuEl(){
    return h("div",{class:"lc31-vu",role:"meter","aria-label":"Microphone level","aria-valuemin":"-60","aria-valuemax":"0"},
      h("div",{class:"lc31-vu-bar"},h("i",{class:"lc31-vu-cover"}),h("b",{class:"lc31-vu-peak"})),
      h("span",{class:"lc31-vu-db",text:"Mic off"}));
  }
  function vuTick(){
    if(!on)return;
    raf=requestAnimationFrame(vuTick);
    const now=performance.now(),active=!!Mic.active;
    let db=-90;
    if(active){try{db=Mic.levelDb()}catch(e){db=-90}}
    const target=active?clamp((db+60)/60,0,1):0;
    VU.lvl=target>VU.lvl?target:VU.lvl+(target-VU.lvl)*.14;
    if(VU.lvl>=VU.peak){VU.peak=VU.lvl;VU.peakT=now}else if(now-VU.peakT>800)VU.peak=Math.max(VU.lvl,VU.peak-.012);
    if(!active){vuT0=0;lastSound=0}
    else{if(!vuT0){vuT0=now;lastSound=now}if(db>-52)lastSound=now}
    const txt=!active?"Mic off":db>-89?Math.round(db)+" dB":"silent";
    $$(".lc31-vu").forEach(v=>{
      const c=$(".lc31-vu-cover",v),p=$(".lc31-vu-peak",v),t=$(".lc31-vu-db",v);
      if(c)c.style.width=(100-VU.lvl*100).toFixed(1)+"%";
      if(p)p.style.left="calc("+(VU.peak*100).toFixed(1)+"% - 2px)";
      if(t&&t.textContent!==txt)t.textContent=txt;
      v.setAttribute("aria-valuenow",String(Math.round(db>-90?db:-60)));
    });
    const mm=$("#mic-meter");if(mm)mm.style.width=(VU.lvl*100).toFixed(1)+"%";
    const quiet=active&&now-lastSound>3500&&now-vuT0>3500;
    $$(".lc31-vu-hint").forEach(e=>{e.hidden=!quiet});
    placeCta();
    const mk=(Board.meta?(Board.meta.white||"")+"|"+(Board.meta.black||"")+"|"+Board.meta.plies:"")+"#"+Board.moves.length;
    if(mk!==metaKey){metaKey=mk;paintGame()}
  }
  function placeCta(){
    const st=stage();if(!st)return;
    let c=$("#lc31-cta");
    const l=LAYOUT.layers.camera,need=l.on&&!Cam.active&&!Cam.ready()&&!Scene.arrange;
    if(!need){if(c)c.remove();return}
    if(!c){
      c=h("div",{class:"lc31-cta",id:"lc31-cta"},h("button",{type:"button",class:"btn sm pri",html:icon("camera","",14)+"<span>Connect camera</span>",onclick:()=>connectAV()}));
      st.append(c);
    }
    const Sw=st.clientWidth,Sh=st.clientHeight;
    c.style.left=l.x*Sw+"px";c.style.top=l.y*Sh+"px";c.style.width=l.w*Sw+"px";c.style.height=l.h*Sh+"px";
    c.style.borderRadius=(l.shape==="circle"?"50%":Math.max(6,l.radius/100*Math.min(l.w*Sw,l.h*Sh)/2)+"px");
  }
  /* ---------- camera look ---------- */
  function lookOf(c){
    if(c.fill==="full")return"full";
    if(c.shape==="circle")return"circle";
    const r=LC31_RATIO(c);
    if(r==="1:1")return"square";
    if(r==="16:9")return"wide";
    if(r==="3:4"||r==="9:16"||r==="4:5")return"tall";
    return"rounded";
  }
  function applyLook(look){
    const c=LAYOUT.layers.camera,ar=LAYOUT.aspect==="9:16"?9/16:16/9;
    const cx=c.x+c.w/2,cy=c.y+c.h/2;
    let w=c.fill==="full"?.28:c.w;
    const set=(ratio,shape,radius)=>{
      c.fill="pip";c.ratio=ratio;c.shape=shape;c.radius=radius;
      const p=ratio.split(":"),px=(+p[0])/(+p[1]);
      let hh=w*ar/px;
      if(hh>.92){hh=.92;w=hh*px/ar}
      w=Math.min(w,1);
      c.w=w;c.h=hh;c.x=clamp(cx-w/2,0,1-w);c.y=clamp(cy-hh/2,0,1-hh);
    };
    if(look==="circle")set("1:1","circle",100);
    else if(look==="rounded")set("4:3","rect",30);
    else if(look==="square")set("1:1","rect",8);
    else if(look==="wide")set("16:9","rect",24);
    else if(look==="tall")set("3:4","rect",24);
    else if(look==="full"){c.fill="full";c.ratio="free";c.shape="rect";c.radius=0;c.ring=false;c.x=0;c.y=0;c.w=1;c.h=1}
    saveLayout();positionLayers();markDirty();syncStageUI();syncLookUI();
    try{syncCameraPanel()}catch(e){}
  }
  function setRatio(r){
    const c=LAYOUT.layers.camera;
    if(c.shape==="circle"||c.fill==="full")return;
    const ar=LAYOUT.aspect==="9:16"?9/16:16/9;
    c.ratio=r;
    if(r!=="free"){const p=r.split(":"),px=(+p[0])/(+p[1]);let hh=c.w*ar/px,w=c.w;if(hh>.92){hh=.92;w=hh*px/ar}c.w=w;c.h=hh;c.x=clamp(c.x,0,1-c.w);c.y=clamp(c.y,0,1-c.h)}
    saveLayout();positionLayers();markDirty();syncLookUI();
  }
  function syncLookUI(){
    const c=LAYOUT.layers.camera,lk=lookOf(c);
    const sel=$("#lc31-look");if(sel)sel.value=lk;
    $$("[data-lc31-look]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.lc31Look===lk)));
    const rs=$("#lc31-ratio");if(rs){rs.value=LC31_RATIO(c);rs.disabled=c.shape==="circle"||c.fill==="full"}
    const el=Scene.layerEls&&Scene.layerEls.camera;if(el)el.classList.toggle("lc31-full",c.fill==="full");
  }
  function decorateCameraPanel(){
    const old=$("#shape-circle");
    if(old&&!$("#lc31-looks")){
      const seg=old.parentElement;seg.style.display="none";
      const row=h("div",{id:"lc31-looks"});
      const bs=h("div",{class:"seg",role:"group","aria-label":"Camera shape",style:{flexWrap:"wrap"}});
      LOOKS.forEach(l=>bs.append(h("button",{type:"button",text:l[1],dataset:{lc31Look:l[0]},"aria-pressed":"false",onclick:()=>applyLook(l[0])})));
      const rs=h("select",{id:"lc31-ratio","aria-label":"Camera aspect ratio",onchange:e=>setRatio(e.target.value),style:{marginTop:"8px"}});
      RATIOS.forEach(r=>rs.append(h("option",{value:r[0],text:"Ratio: "+r[1]})));
      row.append(bs,rs);seg.after(row);
    }
    const ms=$("#micSelect");
    if(ms&&!$("#lc31-vu-panel")){
      const wrap=h("div",{id:"lc31-vu-panel"},vuEl(),h("div",{class:"lc31-vu-hint",hidden:true,text:"Connected, but no sound yet. Say something. If the bar stays flat, check that the microphone is not muted or pick another microphone."}));
      ms.after(wrap);
    }
    syncLookUI();
  }
  function buildStageRow(){
    if($("#lc31-row"))return;
    const first=$(".stage-tools");if(!first)return;
    const sel=h("select",{id:"lc31-look","aria-label":"Camera shape",onchange:e=>applyLook(e.target.value)});
    LOOKS.forEach(l=>sel.append(h("option",{value:l[0],text:"Camera: "+l[1]})));
    const row=h("div",{class:"lc31-row",id:"lc31-row"},
      h("button",{type:"button",class:"btn sm pri",id:"lc31-connect",html:icon("camera","",14)+"<span>Connect camera & mic</span>",onclick:()=>connectAV()}),
      vuEl(),sel,
      h("button",{type:"button",class:"btn sm",id:"lc31-pgn-btn",html:icon("up","",14)+"<span>Import PGN</span>",title:"Paste or drop a PGN (Ctrl+V works too)",onclick:()=>openPgnModal()}),
      h("button",{type:"button",class:"btn sm",id:"lc31-fmt-btn",html:icon("film","",14)+"<span>Format</span>",onclick:()=>openFormatPicker({})}),
      h("button",{type:"button",class:"btn sm",id:"lc31-car-btn",html:icon("image","",14)+"<span>Carousel</span>",onclick:()=>openCarousel()}),
      h("button",{type:"button",class:"btn sm",id:"lc31-ai-btn",hidden:true,html:icon("zap","",14)+"<span>AI render</span>",onclick:e=>openAi(e.currentTarget)}));
    const hint=h("div",{class:"lc31-vu-hint",hidden:true,style:{margin:"0 12px"},text:"Connected, but no sound yet. Say something. If the bar stays flat, check that the microphone is not muted or pick another microphone."});
    const banner=h("div",{class:"lc31-banner",id:"lc31-banner",hidden:true,role:"alert"},h("span"),
      h("button",{type:"button",class:"btn sm pri",text:"Try again",onclick:()=>connectAV()}),
      h("button",{type:"button",class:"btn sm",text:"Dismiss",onclick:()=>hideBanner()}));
    const game=h("div",{class:"lc31-game",id:"lc31-game",hidden:true});
    first.after(row);row.after(hint,banner,game);
    syncLookUI();
  }
  /* ---------- PGN: drop, paste, modal ---------- */
  const looksPgn=t=>{t=String(t||"");return/\[Event\s+"/.test(t)||/(^|\s)1\.\s*(?:[a-h][1-8]|[NBRQK][a-h1-8x]|O-O)/.test(t)};
  const splitGames=t=>{t=String(t||"").replace(/\r/g,"").trim();const p=t.split(/\n(?=\[Event\s+")/).map(x=>x.trim()).filter(Boolean);return p.length?p:[t]};
  function importText(text,opts){
    opts=opts||{};
    if(validFen(String(text||"").trim())){const r=Board.loadFEN(text);if(r.ok){Spar.stop();Layout.setOpen("stage",true);toast("Position loaded","ok",1600);return true}}
    const games=splitGames(text).map(g=>({g:g,r:parsePGN(g)})).filter(x=>x.r.ok);
    if(!games.length){toast("No readable game found. Paste a full PGN including the moves.","err",3600);return false}
    if(games.length>1&&!opts.first){openChooser(games);return true}
    const r=Board.loadPGN(games[0].g);
    if(!r.ok){toast(r.error,"err");return false}
    Spar.stop();Layout.setOpen("stage",true);S.moments=null;
    toast("Game loaded: "+r.meta.plies+" moves. Use the arrow keys to step.","ok",2600);
    closeModal();
    if(opts.analyse)analyse();
    return true;
  }
  function openChooser(games){
    const body=h("div",{},h("h3",{text:games.length+" games found"}),h("div",{class:"sub",text:"Pick one to load on the board. You can save all of them to the Student Game Library."}));
    games.slice(0,40).forEach((x,i)=>body.append(h("div",{class:"lc31-moment",style:{marginBottom:"6px"}},
      h("b",{text:(x.r.meta.white||"White")+" vs "+(x.r.meta.black||"Black")+"  "+(x.r.meta.result||"")}),
      h("span",{class:"hint",text:x.r.meta.plies+" moves"}),
      h("button",{type:"button",class:"btn sm pri",text:"Load",onclick:()=>importText(x.g,{first:true})}))));
    body.append(h("div",{class:"lc31-bar"},
      h("button",{type:"button",class:"btn sm",text:"Save all to Student Games",onclick:()=>{let n=0;games.forEach(x=>{if(addGame({name:(x.r.meta.white||"White")+" vs "+(x.r.meta.black||"Black"),pgn:x.g.slice(0,2e4),note:"Imported PGN"}))n++});toast(n+" games saved to the Student Game Library","ok",2400);closeModal()}}),
      h("button",{type:"button",class:"btn sm",text:"Close",onclick:()=>closeModal()})));
    openModal(body,{});
  }
  function openPgnModal(){
    const ta=h("textarea",{id:"lc31-pgn-ta",placeholder:"Paste a PGN here, or drop a .pgn file anywhere in the Studio",spellcheck:"false"});
    const file=h("input",{type:"file",accept:".pgn,.txt,text/plain",id:"lc31-pgn-file","aria-label":"Choose a PGN file",onchange:async e=>{const f=e.target.files&&e.target.files[0];if(f){ta.value=await f.text()}}});
    const body=h("div",{},h("h3",{text:"Import a game"}),h("div",{class:"sub",text:"Paste any standard PGN (several games are fine) or choose a file. The game opens on the stage board."}),
      h("div",{class:"lc31-dz"},ta,file),
      h("div",{class:"lc31-bar"},
        h("button",{type:"button",class:"btn pri",id:"lc31-pgn-load",text:"Load on board",onclick:()=>importText(ta.value,{})}),
        h("button",{type:"button",class:"btn",id:"lc31-pgn-load-an",text:"Load and find critical moments",onclick:()=>importText(ta.value,{analyse:true})}),
        h("button",{type:"button",class:"btn",text:"Save to Student Games",onclick:()=>{if(!looksPgn(ta.value))return toast("Paste a PGN first","err");let n=0;splitGames(ta.value).forEach(g=>{const r=parsePGN(g);if(r.ok&&addGame({name:(r.meta.white||"White")+" vs "+(r.meta.black||"Black"),pgn:g.slice(0,2e4),note:"Imported PGN"}))n++});toast(n+" saved","ok",1800)}}),
        h("button",{type:"button",class:"btn",text:"Close",onclick:()=>closeModal()})));
    openModal(body,{});
    setTimeout(()=>ta.focus(),30);
  }
  function bindDrop(){
    const root=$("#lcs");if(!root||root.dataset.lc31drop)return;root.dataset.lc31drop="1";
    const ov=h("div",{class:"lc31-drop",id:"lc31-drop",hidden:true,text:"Drop a PGN file or text to load the game"});root.append(ov);
    let depth=0;
    const hasData=e=>{const t=e.dataTransfer&&e.dataTransfer.types;return t&&(Array.prototype.indexOf.call(t,"Files")>=0||Array.prototype.indexOf.call(t,"text/plain")>=0)};
    root.addEventListener("dragenter",e=>{if(!hasData(e))return;e.preventDefault();depth++;ov.hidden=false});
    root.addEventListener("dragover",e=>{if(!hasData(e))return;e.preventDefault();e.dataTransfer.dropEffect="copy"});
    root.addEventListener("dragleave",()=>{depth=Math.max(0,depth-1);if(!depth)ov.hidden=true});
    root.addEventListener("drop",async e=>{
      if(!hasData(e))return;e.preventDefault();depth=0;ov.hidden=true;
      const f=e.dataTransfer.files&&e.dataTransfer.files[0];
      let txt="";
      if(f){if(f.size>3e6)return toast("That file is too large for a PGN.","err");txt=await f.text()}
      else txt=e.dataTransfer.getData("text/plain");
      importText(txt,{});
    });
  }
  function onPaste(e){
    if(!on)return;
    const t=e.composedPath&&e.composedPath()[0];
    if(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable))return;
    const txt=e.clipboardData&&e.clipboardData.getData("text/plain");
    if(txt&&(looksPgn(txt)||validFen(txt.trim()))){e.preventDefault();importText(txt,{})}
  }
  /* ---------- modal helper ---------- */
  let modal=null,modalReq=false;
  function openModal(body,o){
    closeModal(true);
    o=o||{};modalReq=!!o.required;
    const scrim=h("div",{class:"lc31-scrim",onpointerdown:e=>{if(e.target===scrim&&!modalReq)closeModal()}},h("div",{class:"lc31-modal"+(o.wide?" wide":""),role:"dialog","aria-modal":"true"},body));
    $("#lcs").append(scrim);modal=scrim;
    return scrim;
  }
  function closeModal(){if(modal){modal.remove();modal=null;modalReq=false}}
  function onKey(e){if(on&&modal&&e.key==="Escape"&&!modalReq)closeModal()}
  /* ---------- game strip, analysis ---------- */
  function boardPgn(){
    const m=Board.meta||{},hd=[["Event","Lanckriet Chess Studio"],["White",m.white||"White"],["Black",m.black||"Black"],["Result",m.result||"*"]];
    if(Board.fens[0]&&Board.fens[0]!==START_FEN){hd.push(["SetUp","1"]);hd.push(["FEN",Board.fens[0]])}
    let mv="";Board.moves.forEach((x,i)=>{mv+=(i%2===0?(i/2+1)+". ":"")+x.san+" "});
    return hd.map(x=>'['+x[0]+' "'+String(x[1]).replace(/"/g,"'")+'"]').join("\n")+"\n\n"+mv.trim()+" "+(m.result||"*");
  }
  function addGame(item){
    const have=Libs.mine("games").some(x=>x.pgn&&item.pgn&&x.pgn.replace(/\s+/g," ").trim()===item.pgn.replace(/\s+/g," ").trim()||(item.url&&x.url===item.url));
    if(have)return null;
    return Libs.add("games",item);
  }
  function paintGame(){
    const g=$("#lc31-game");if(!g)return;
    if(!Board.moves.length||!Board.meta){g.hidden=true;return}
    g.hidden=false;g.textContent="";
    const m=Board.meta;
    g.append(h("div",{class:"row wrap",style:{gap:"8px"}},
      h("span",{class:"t grow",text:(m.white||"White")+" vs "+(m.black||"Black")+(m.result?"  "+m.result:"")+"  ·  "+Board.moves.length+" moves"}),
      h("button",{type:"button",class:"btn sm pri",id:"lc31-an",disabled:S.busy||null,text:S.busy?"Analysing…":(S.moments?"Re-analyse":"Find critical moments"),onclick:()=>analyse()}),
      h("button",{type:"button",class:"btn sm",text:"Save to Student Games",onclick:()=>{const it=addGame({name:((m.white||"White")+" vs "+(m.black||"Black")).slice(0,80),pgn:boardPgn(),note:S.moments?S.moments.length+" critical moments":""});toast(it?"Saved to the Student Game Library":"Already in the library","ok",1800)}}),
      h("button",{type:"button",class:"btn sm",text:"Carousel from game",onclick:()=>{autoBuild();openCarousel()}})));
    if(S.busy)g.append(h("div",{class:"lc31-prog"},h("i",{id:"lc31-prog-i"})));
    if(S.moments){
      const list=h("div",{class:"lc31-moments"});
      if(!S.moments.length)list.append(h("span",{class:"hint",text:"No big swings found. This game was played cleanly."}));
      S.moments.forEach(mo=>list.append(h("div",{class:"lc31-moment"},
        h("b",{text:"Move "+Math.ceil(mo.ply/2)+(mo.color==="w"?". ":"... ")+mo.san+mo.mark}),
        h("span",{class:"hint",text:"-"+Math.round(mo.drop)+"% win chance"+(mo.bestSan?" · better: "+mo.bestSan:"")}),
        h("button",{type:"button",class:"btn sm",text:"Show",onclick:()=>{Board.goto(mo.ply-1)}}),
        h("button",{type:"button",class:"btn sm",text:"+ Slide",onclick:()=>{addMomentSlides(mo);toast("Slide added to the carousel","ok",1400)}}))));
      g.append(list);
    }
  }
  async function analyse(){
    if(S.busy)return;
    const E=Host.stockfish&&Host.stockfish();
    if(!E){toast("The Stockfish engine is not available in this view.","err",3200);return}
    if(!Board.moves.length){toast("Load a game first (Import PGN).","err");return}
    const my=++gameToken,fens=Board.fens.slice(),moves=Board.moves.slice();
    S.busy=true;S.moments=null;paintGame();
    const ev=[],bestU=[];
    try{
      for(let i=0;i<fens.length;i++){
        if(my!==gameToken||!on)return;
        const bar=$("#lc31-prog-i");if(bar)bar.style.width=Math.round(i/fens.length*100)+"%";
        const t=new Chess(fens[i]);
        if(t.game_over()){ev.push(t.in_checkmate()?(t.turn()==="w"?-1e4:1e4):0);bestU.push(null);continue}
        let r=null;
        for(let tries=0;tries<3&&!r;tries++){try{r=await E.analyse(fens[i],{movetime:110,depthCap:14})}catch(e){if(String(e&&e.message).indexOf("superseded")>=0)await sleep(120);else throw e}}
        if(!r)throw new Error("engine-busy");
        ev.push(E.toCp(r.lines[0]));bestU.push(r.best||null);
      }
      const win=ev.map(c=>E.winPct(c)),out=[];
      for(let i=0;i<moves.length;i++){
        const white=/ w /.test(fens[i]);
        const drop=white?win[i]-win[i+1]:win[i+1]-win[i];
        if(drop>=6){
          let bestSan="";try{const bs=bestU[i]&&E.uciToSan(fens[i],bestU[i]);bestSan=typeof bs==="string"?bs:(bs&&bs.san)||""}catch(e){}
          if(bestSan===moves[i].san)continue;
          out.push({ply:i+1,san:moves[i].san,color:white?"w":"b",drop:drop,mark:drop>=20?"??":drop>=12?"?":"?!",fen:fens[i],after:fens[i+1],bestUci:bestU[i],bestSan:bestSan,from:moves[i].from,to:moves[i].to});
        }
      }
      S.moments=out.filter(o=>o.drop>=12).concat(out.filter(o=>o.drop<12)).slice(0,60).sort((a,b)=>a.ply-b.ply);
    }catch(e){
      console.error(e);toast("Analysis stopped: "+((e&&e.message)||"engine error"),"err",3600);
    }finally{S.busy=false;paintGame()}
  }
  /* ---------- formats ---------- */
  function openFormatPicker(o){
    o=o||{};
    const cur=Store.get("lc31-format",null);
    const title=h("input",{type:"text",id:"lc31-proj-title",placeholder:"Project title (optional)",maxlength:"120",value:Project.title||""});
    const grid=h("div",{class:"lc31-fmts"});
    FMT_ORDER.forEach(id=>{const f=FMT[id];
      grid.append(h("button",{type:"button",class:"lc31-fmt",dataset:{fmt:id},"aria-pressed":String(!!cur&&cur.id===id),onclick:()=>applyFormat(id,title.value.trim())},
        h("b",{text:f.label}),h("small",{text:f.desc}),h("div",{class:"tags"},...f.tags.map(t=>h("span",{text:t})))));
    });
    const body=h("div",{},h("h3",{text:"What are you making?"}),h("div",{class:"sub",text:"Pick a format. The studio sets the frame, camera, layout and a script outline for it. You can change this any time from the Format button."}),
      h("div",{class:"field",style:{marginBottom:"10px"}},title),grid);
    if(!o.required)body.append(h("div",{class:"lc31-bar"},h("button",{type:"button",class:"btn sm",text:"Close",onclick:()=>closeModal()})));
    openModal(body,{required:!!o.required,wide:true});
  }
  function applyFormat(id,title){
    const f=FMT[id];if(!f)return;
    Store.set("lc31-format",{id:id,at:Date.now()});
    Project.format=id;if(title)Project.title=title;saveProject();
    closeModal(true);
    if(f.carousel){openCarousel();return}
    const preset={id:"lc31-"+id,name:f.label,scene:f.scene,panels:{script:[.012,.02,.976,.26],stage:[.012,.29,.6,.69],library:[.62,.29,.368,.69]}};
    Layout.setLayout(presetToLayout(preset,f.aspect));
    applyLook(f.look);
    if(!Script.text.trim()&&f.tpl)Script.set(f.tpl);
    S.aiKind=f.ai||"";
    const ai=$("#lc31-ai-btn");if(ai){ai.hidden=!f.ai;const sp=$("span",ai);if(sp)sp.textContent="AI render ("+(f.ai==="long"?"100":"25")+" tokens)"}
    fitStage();syncStageUI();markDirty();
    toast(f.label+" ready. "+(f.ai?"Write the narration, then press AI render.":"Script outline added above the stage."),"ok",3400);
  }
  function openAi(anchor){
    if(!Host.render){toast("The render server is not connected in this view.","err",3200);return}
    openRenders(anchor);
  }
  function seedRender(St){
    if(S.aiKind)St.kind=S.aiKind;
    const t=narration(Script.text);
    if(t){St.script="__own";St.scriptText=t.slice(0,4000)}
    if(Board.moves.length){const pgn=boardPgn();let it=Libs.list("games").filter(x=>x&&x.pgn&&x.pgn.replace(/\s+/g," ").trim()===pgn.replace(/\s+/g," ").trim())[0];
      if(!it)it=Libs.add("games",{name:((Board.meta&&Board.meta.white)||"White")+" vs "+((Board.meta&&Board.meta.black)||"Black"),pgn:pgn,note:"Used for a render"});
      St.game=it.id}
  }
  /* ---------- carousel ---------- */
  const SIZES_C={"4:5":[1080,1350],"1:1":[1080,1080],"9:16":[1080,1920]};
  let CS=Store.get("lc31-carousel",null);
  if(!CS||!Array.isArray(CS.slides))CS={size:"4:5",slides:[]};
  const saveCS=debounce(()=>Store.set("lc31-carousel",CS),300);
  const newSlide=(kind,o)=>Object.assign({id:uid(),kind:kind,title:"",text:"",fen:"",flip:false,from:"",to:""},o||{});
  function fenModel(fen,flip,from,to,arrows){
    const game=new Chess(fen);
    return{orient:flip?"b":"w",last:from&&to?{from:from,to:to}:null,sel:null,marks:{},arrows:arrows||[],drag:null,targets:[],game:game,pieceAt:sq=>game.get(sq),
      inCheckSquare(){if(!game.in_check())return null;const t=game.turn(),b=game.board();for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=b[r][c];if(p&&p.type==="k"&&p.color===t)return FILES[c]+(8-r)}return null}};
  }
  function wrapText(g,text,maxW){
    const out=[];String(text||"").split("\n").forEach(par=>{let line="";par.split(/\s+/).forEach(w=>{const t=line?line+" "+w:w;if(g.measureText(t).width>maxW&&line){out.push(line);line=w}else line=t});out.push(line)});
    return out;
  }
  function renderSlide(sl,W,H,noMark){
    const cv=document.createElement("canvas");cv.width=W;cv.height=H;const g=cv.getContext("2d");
    drawBackground(g,W,H,"mesh");
    const pad=W*.07,top=H*.115;
    g.textAlign="left";g.textBaseline="top";
    const title=(txt,y,size,color)=>{g.font="700 "+size+"px Sora,system-ui,sans-serif";g.fillStyle=color||"#fff";const ls=wrapText(g,txt,W-pad*2);ls.forEach((l,i)=>g.fillText(l,pad,y+i*size*1.18));return y+ls.length*size*1.18};
    const body=(txt,y,size)=>{g.font="400 "+size+"px Sora,system-ui,sans-serif";g.fillStyle="#C9D6E2";const ls=wrapText(g,txt,W-pad*2);ls.forEach((l,i)=>g.fillText(l,pad,y+i*size*1.38));return y+ls.length*size*1.38};
    if(sl.kind==="cover"){
      g.fillStyle="#00E5FF";g.font="600 "+W*.032+"px Sora,system-ui,sans-serif";g.fillText("LANCKRIET CHESS",pad,H*.3);
      const y=title(sl.title||"Your title",H*.36,W*.098);body(sl.text,y+H*.02,W*.042);
      g.fillStyle="#8DA2B3";g.font="500 "+W*.032+"px Sora,system-ui,sans-serif";g.fillText("Swipe  \u2192",pad,H*.88);
    }else if(sl.kind==="position"){
      let y=top;if(sl.title)y=title(sl.title,y,W*.058)+H*.012;
      const size=Math.min(W*.86,H*.5),x=(W-size)/2,by=Math.max(y,H*.2);
      let locked=false;try{locked=!!(Host.isLocked&&sl.fen&&Host.isLocked(sl.fen))}catch(e){locked=true}
      if(!sl.fen||!validFen(sl.fen)){g.fillStyle="rgba(255,255,255,.06)";g.fillRect(x,by,size,size);g.fillStyle="#8DA2B3";g.font="500 "+W*.036+"px Sora,system-ui,sans-serif";g.textAlign="center";g.fillText("Set a position",W/2,by+size/2);g.textAlign="left"}
      else{
        const ar=sl.from&&sl.to&&sl.arrow?[{a:sl.from,b:sl.to,c:"c"}]:[];
        g.save();g.translate(x,by);renderBoard(g,size,fenModel(sl.fen,sl.flip,null,null,ar));g.restore();
        if(locked){g.fillStyle="rgba(10,11,14,.78)";g.fillRect(x,by,size,size);g.fillStyle="#00E5FF";g.textAlign="center";g.font="600 "+size*.05+"px Sora,system-ui,sans-serif";g.fillText("Premium position",W/2,by+size/2-size*.03);g.fillStyle="#8DA2B3";g.font="400 "+size*.035+"px Sora,system-ui,sans-serif";g.fillText("Members see it in the Hub.",W/2,by+size/2+size*.04);g.textAlign="left"}
      }
      if(sl.text)body(sl.text,by+size+H*.025,W*.04);
    }else if(sl.kind==="cta"){
      g.fillStyle="#00E5FF";g.font="600 "+W*.032+"px Sora,system-ui,sans-serif";g.fillText("YOUR MOVE",pad,H*.3);
      const y=title(sl.title||"Train this for free",H*.36,W*.09);body(sl.text||"Open the Lanckriet Chess Training Hub. Link in bio.",y+H*.02,W*.045);
    }else{
      const y=title(sl.title||"Heading",top+H*.04,W*.075);body(sl.text,y+H*.025,W*.047);
    }
    g.fillStyle="#8DA2B3";g.font="500 "+W*.026+"px 'JetBrains Mono',monospace";g.textBaseline="alphabetic";
    g.fillText(String(CS.slides.indexOf(sl)+1).padStart(2,"0")+" / "+String(CS.slides.length).padStart(2,"0"),pad,H-H*.035);
    if(!noMark){try{drawWatermark(g,W,H,Tier.wm())}catch(e){console.error(e)}}
    return cv;
  }
  function addMomentSlides(mo){
    const flip=false;
    CS.slides.push(newSlide("position",{title:"Move "+Math.ceil(mo.ply/2)+": what would you play?",fen:mo.fen,flip:flip,text:"Pause and think with MSPC."}));
    CS.slides.push(newSlide("position",{title:"What happened",fen:mo.fen,from:mo.from,to:mo.to,arrow:true,text:"I played "+mo.san+mo.mark+" and lost about "+Math.round(mo.drop)+"% win chance."+(mo.bestSan?" Better was "+mo.bestSan+".":"")}));
    saveCS();
  }
  function autoBuild(){
    if(!Board.moves.length)return;
    const m=Board.meta||{};
    const slides=[newSlide("cover",{title:Project.title||((m.white||"White")+" vs "+(m.black||"Black")),text:"A real game, one lesson."})];
    const picks=(S.moments||[]).filter(x=>x.drop>=12).slice(0,3);
    if(picks.length){picks.forEach(mo=>{slides.push(newSlide("position",{title:"Move "+Math.ceil(mo.ply/2)+": what would you play?",fen:mo.fen,text:"Pause and think with MSPC."}));slides.push(newSlide("position",{title:"What happened",fen:mo.fen,from:mo.from,to:mo.to,arrow:true,text:"I played "+mo.san+mo.mark+" and lost about "+Math.round(mo.drop)+"% win chance."+(mo.bestSan?" Better was "+mo.bestSan+".":"")}))})}
    else{[Math.min(10,Board.moves.length),Math.round(Board.moves.length/2),Board.moves.length].filter((v,i,a)=>v>0&&a.indexOf(v)===i).forEach(p=>slides.push(newSlide("position",{title:"Move "+Math.ceil(p/2),fen:Board.fens[p],text:""})))}
    slides.push(newSlide("cta",{title:"Train this for free",text:"Find the full MSPC training in the Lanckriet Chess Training Hub. Link in bio."}));
    CS.slides=slides;S.carSel=0;saveCS();
  }
  function openCarousel(){
    if(!CS.slides.length)CS.slides=[newSlide("cover",{title:Project.title||"Your title",text:"Subtitle"}),newSlide("cta",{title:"Train this for free",text:"Open the Lanckriet Chess Training Hub. Link in bio."})];
    const wrap=h("div",{});
    function paint(){
      wrap.textContent="";
      S.carSel=clamp(S.carSel,0,CS.slides.length-1);
      const sl=CS.slides[S.carSel],[W,H]=SIZES_C[CS.size]||SIZES_C["4:5"];
      const thumbs=h("div",{class:"lc31-thumbs"});
      CS.slides.forEach((s,i)=>{const c=renderSlide(s,W,H,true);thumbs.append(h("button",{type:"button",class:"lc31-thumb","aria-pressed":String(i===S.carSel),"aria-label":"Slide "+(i+1),onclick:()=>{S.carSel=i;paint()}},c,h("i",{text:String(i+1)})))});
      const prev=h("div",{class:"lc31-prev"},renderSlide(sl,W,H,false));
      const set=(k,v)=>{sl[k]=v;saveCS()};
      const live=()=>{const c=renderSlide(sl,W,H,false);prev.textContent="";prev.append(c)};
      const kind=h("select",{id:"lc31-s-kind",onchange:e=>{set("kind",e.target.value);paint()}});
      [["cover","Cover"],["position","Position"],["text","Text"],["cta","Call to action"]].forEach(k=>kind.append(h("option",{value:k[0],text:k[1],selected:k[0]===sl.kind||null})));
      const form=h("div",{class:"lc31-form"},
        h("label",{text:"Slide type"}),kind,
        h("label",{text:"Title"}),h("input",{type:"text",id:"lc31-s-title",value:sl.title,maxlength:"140",oninput:e=>{set("title",e.target.value);live()}}),
        h("label",{text:"Text"}),h("textarea",{id:"lc31-s-text",oninput:e=>{set("text",e.target.value);live()}}));
      $("textarea",form).value=sl.text;
      if(sl.kind==="position"){
        form.append(h("label",{text:"Position (FEN)"}),h("input",{type:"text",id:"lc31-s-fen",value:sl.fen,placeholder:"Paste a FEN or use the board",oninput:e=>{set("fen",e.target.value.trim());live()}}),
          h("div",{class:"row wrap",style:{gap:"6px"}},
            h("button",{type:"button",class:"btn sm",id:"lc31-s-use",text:"Use stage board",onclick:()=>{sl.fen=Board.fen;sl.from=Board.last?Board.last.from:"";sl.to=Board.last?Board.last.to:"";sl.arrow=false;saveCS();paint()}}),
            h("label",{class:"row",style:{gap:"6px"}},h("input",{type:"checkbox",checked:sl.flip||null,onchange:e=>{set("flip",e.target.checked);live()}}),"Black at the bottom"),
            h("label",{class:"row",style:{gap:"6px"}},h("input",{type:"checkbox",checked:(sl.arrow&&sl.from)||null,onchange:e=>{set("arrow",e.target.checked);live()}}),"Arrow for last move")));
      }
      const add=(k,o)=>{CS.slides.splice(S.carSel+1,0,newSlide(k,o));S.carSel++;saveCS();paint()};
      const sizeSel=h("select",{id:"lc31-size","aria-label":"Slide size",onchange:e=>{CS.size=e.target.value;saveCS();paint()}});
      [["4:5","4:5 (1080x1350)"],["1:1","1:1 (1080x1080)"],["9:16","9:16 (1080x1920)"]].forEach(o=>sizeSel.append(h("option",{value:o[0],text:o[1],selected:o[0]===CS.size||null})));
      const bar=h("div",{class:"lc31-bar"},
        h("button",{type:"button",class:"btn sm",id:"lc31-add-pos",text:"+ Position",onclick:()=>add("position",{fen:Board.fen,title:"",text:""})}),
        h("button",{type:"button",class:"btn sm",text:"+ Text",onclick:()=>add("text",{title:"",text:""})}),
        h("button",{type:"button",class:"btn sm",text:"+ CTA",onclick:()=>add("cta",{})}),
        h("button",{type:"button",class:"btn sm",id:"lc31-auto",text:"Auto-build from game",disabled:Board.moves.length?null:true,onclick:()=>{autoBuild();paint()}}),
        h("button",{type:"button",class:"btn sm",text:"Up",disabled:S.carSel?null:true,onclick:()=>{const i=S.carSel;[CS.slides[i-1],CS.slides[i]]=[CS.slides[i],CS.slides[i-1]];S.carSel--;saveCS();paint()}}),
        h("button",{type:"button",class:"btn sm",text:"Down",disabled:S.carSel<CS.slides.length-1?null:true,onclick:()=>{const i=S.carSel;[CS.slides[i+1],CS.slides[i]]=[CS.slides[i],CS.slides[i+1]];S.carSel++;saveCS();paint()}}),
        h("button",{type:"button",class:"btn sm danger",text:"Delete slide",disabled:CS.slides.length>1?null:true,onclick:()=>{CS.slides.splice(S.carSel,1);saveCS();paint()}}),
        h("span",{class:"grow"}),sizeSel,
        h("button",{type:"button",class:"btn sm pri",id:"lc31-export",text:"Download all PNG",onclick:()=>exportCarousel()}),
        h("button",{type:"button",class:"btn sm",id:"lc31-share",text:"Share",onclick:()=>exportCarousel(true)}),
        h("button",{type:"button",class:"btn sm",text:"Close",onclick:()=>closeModal()}));
      wrap.append(h("h3",{text:"Carousel builder"}),h("div",{class:"sub",text:"Slides export as PNG. Free accounts keep the Lanckriet Chess watermark on every slide."}),h("div",{class:"lc31-car"},thumbs,prev,form),bar);
    }
    paint();openModal(wrap,{wide:true});
  }
  const blobOf=cv=>new Promise(r=>cv.toBlob(r,"image/png"));
  async function exportCarousel(share){
    const [W,H]=SIZES_C[CS.size]||SIZES_C["4:5"];
    const files=[];
    for(let i=0;i<CS.slides.length;i++){const b=await blobOf(renderSlide(CS.slides[i],W,H,false));files.push(new File([b],"lanckrietchess-carousel-"+String(i+1).padStart(2,"0")+".png",{type:"image/png"}))}
    S.lastExport=files.map(f=>({name:f.name,size:f.size}));
    if(share&&navigator.canShare&&navigator.canShare({files:files})){try{await navigator.share({files:files,title:Project.title||"Carousel"});return}catch(e){if(e&&e.name==="AbortError")return}}
    if(share)toast("Sharing files is not supported here. Downloading instead.","",2400);
    for(const f of files){const a=document.createElement("a");a.href=URL.createObjectURL(f);a.download=f.name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4e3);await sleep(280)}
    toast(files.length+" slides downloaded","ok",2400);
  }
  /* ---------- Chess.com sync into the Student Game Library ---------- */
  const CC="https://api.chess.com/pub/player/";
  const students=()=>{let a=Store.get("lc31-students",null);if(!Array.isArray(a))a=[];
    let me="";try{me=String(Host.chessUser&&Host.chessUser()||"").trim()}catch(e){}
    if(me&&!a.some(x=>x.user.toLowerCase()===me.toLowerCase())){a.unshift({id:uid(),label:"Me",user:me,last:0,count:0,auto:true});Store.set("lc31-students",a)}
    return a};
  const saveStudents=a=>Store.set("lc31-students",a);
  async function jget(url){
    const r=await fetch(url,{headers:{accept:"application/json"}});
    if(r.status===404){const e=new Error("Player not found on Chess.com");e.code="nf";throw e}
    if(r.status===429){const e=new Error("Chess.com asks for a short break. Try again in a minute.");e.code="rate";throw e}
    if(!r.ok)throw new Error("Chess.com answered "+r.status);
    return r.json();
  }
  function gameItem(g,user,label){
    if(!g||!g.pgn||(g.rules&&g.rules!=="chess"))return null;
    const w=g.white||{},b=g.black||{},white=String(w.username||"").toLowerCase()===user.toLowerCase(),me=white?w:b;
    const dr=["agreed","repetition","stalemate","insufficient","50move","timevsinsufficient"];
    const res=me.result==="win"?"Win":dr.indexOf(me.result)>=0?"Draw":"Loss";
    const acc=g.accuracies?(white?g.accuracies.white:g.accuracies.black):null;
    let date="";try{date=new Date((g.end_time||0)*1000).toISOString().slice(0,10)}catch(e){}
    return{name:((w.username||"White")+" ("+(w.rating||"?")+") vs "+(b.username||"Black")+" ("+(b.rating||"?")+") · "+res+" · "+(g.time_class||"")+" · "+date).slice(0,140),
      pgn:String(g.pgn).slice(0,2e4),note:(label?label+" · ":"")+res+(acc?" · accuracy "+acc+"%":""),src:"chesscom",url:g.url||"",user:user,label:label||"",res:res,acc:acc,end:g.end_time||0};
  }
  async function syncOne(st,months){
    const u=encodeURIComponent(st.user.toLowerCase());
    const arch=await jget(CC+u+"/games/archives");
    const urls=(arch.archives||[]).slice(-months).reverse();
    let added=0;
    for(const url of urls){
      const m=await jget(url),gs=(m.games||[]).slice().sort((a,b)=>(b.end_time||0)-(a.end_time||0));
      for(const g of gs){const it=gameItem(g,st.user,st.label);if(it&&addGame(it))added++;if(added>=60)break}
      if(added>=60)break;
    }
    const mine=Libs.mine("games").filter(x=>x.src==="chesscom");
    if(mine.length>300){mine.sort((a,b)=>(a.end||0)-(b.end||0)).slice(0,mine.length-300).forEach(x=>Libs.remove("games",x.id))}
    return added;
  }
  let syncing=false;
  async function syncAll(o){
    o=o||{};if(syncing)return 0;
    const list=students().filter(s=>o.force||s.auto!==false);
    if(!list.length){if(o.force)toast("Add a Chess.com username first.","err",2600);return 0}
    syncing=true;let total=0;paintStatus("Syncing…");
    try{
      for(const st of list){
        if(!o.force&&Date.now()-(st.last||0)<30*6e4)continue;
        try{const n=await syncOne(st,st.last?1:2);st.last=Date.now();st.count=(st.count||0)+n;st.err="";total+=n;if(n&&!o.quiet)toast("Chess.com: "+n+" new games from "+(st.label||st.user),"ok",2600)}
        catch(e){st.err=(e&&e.message)||"Sync failed";if(o.force)toast(st.label+": "+st.err,"err",3600)}
      }
      saveStudents(students().map(s=>list.find(x=>x.id===s.id)||s));
    }finally{syncing=false;paintStatus()}
    return total;
  }
  let repaintGames=null;
  function paintStatus(msg,quiet){
    const e=$("#lc31-gstatus");
    if(e){const a=students();const last=Math.max(0,...a.map(s=>s.last||0));const err=a.filter(s=>s.err).map(s=>s.label+": "+s.err)[0];
      e.textContent=msg||(err?err:a.length?(last?"Last sync "+Math.max(1,Math.round((Date.now()-last)/6e4))+" min ago.":"Not synced yet."):"No Chess.com account linked yet.")}
    if(!msg&&!quiet&&repaintGames)repaintGames();
  }
  function gamesBar(box,repaint){
    repaintGames=()=>{if(box.isConnected)repaint()};
    const a=students();
    const sel=h("select",{"aria-label":"Student",id:"lc31-gstudent",onchange:e=>{S.gf.student=e.target.value;repaint()}},h("option",{value:"",text:"All students"}));
    a.forEach(s=>sel.append(h("option",{value:s.label,text:s.label+" ("+s.user+")",selected:s.label===S.gf.student||null})));
    const res=h("select",{"aria-label":"Result",id:"lc31-gres",onchange:e=>{S.gf.res=e.target.value;repaint()}});
    [["","Any result"],["Loss","Losses"],["Win","Wins"],["Draw","Draws"]].forEach(o=>res.append(h("option",{value:o[0],text:o[1],selected:o[0]===S.gf.res||null})));
    const lab=h("input",{type:"text",id:"lc31-sname",placeholder:"Student name",maxlength:"30"}),usr=h("input",{type:"text",id:"lc31-suser",placeholder:"Chess.com username",maxlength:"40"});
    const form=h("div",{class:"r",hidden:true},lab,usr,h("button",{type:"button",class:"btn sm pri",id:"lc31-sadd",text:"Add and sync",onclick:async()=>{
      const u=usr.value.trim().replace(/^.*chess\.com\/member\//i,"").replace(/[^A-Za-z0-9_-]/g,"");
      if(!u)return toast("Enter a Chess.com username","err");
      const list=students();if(list.some(s=>s.user.toLowerCase()===u.toLowerCase()))return toast("That student is already linked","err");
      list.push({id:uid(),label:(lab.value.trim()||u).slice(0,30),user:u,last:0,count:0,auto:true});saveStudents(list);
      form.hidden=true;repaint();await syncAll({force:true});}}));
    const bar=h("div",{class:"lc31-gbar",id:"lc31-gbar"},
      h("div",{class:"r"},sel,res,
        h("button",{type:"button",class:"btn sm pri",id:"lc31-sync",html:icon("down","",13)+"<span>Sync Chess.com</span>",onclick:()=>syncAll({force:true})}),
        h("button",{type:"button",class:"btn sm",id:"lc31-sadd-btn",text:"+ Student",onclick:()=>{form.hidden=!form.hidden}})),
      form,h("div",{class:"hint",id:"lc31-gstatus"}));
    box.append(bar);paintStatus("",true);
  }
  const gameFilter=i=>{if(S.gf.student&&(!i||i.label!==S.gf.student))return false;if(S.gf.res&&(!i||i.res!==S.gf.res))return false;return true};
  async function analyseItem(it){Act.loadGame(it);await sleep(60);analyse()}
  async function carouselFromItem(it){Act.loadGame(it);S.moments=null;await analyse();autoBuild();openCarousel()}
  /* ---------- lifecycle ---------- */
  function onMount(){
    if(on)return;on=true;
    if(!hooked){hooked=true;const say=Hardware.say.bind(Hardware);Hardware.say=function(m,bad){Hardware.lastMsg=m;say(m,bad);if(bad&&m){showBanner(m);toast(m,"err",5200)}else if(m&&/^Live:/.test(m))hideBanner();syncConnectBtn()}}
    buildStageRow();decorateCameraPanel();bindDrop();
    document.addEventListener("paste",onPaste,true);document.addEventListener("keydown",onKey,true);
    raf=requestAnimationFrame(vuTick);
    const el=Scene.layerEls&&Scene.layerEls.camera;if(el)el.classList.toggle("lc31-full",LAYOUT.layers.camera.fill==="full");
    const fm=Store.get("lc31-format",null);
    if(!fm&&!(Script.text||"").trim()&&!Project.title&&!(Project.format)){setTimeout(()=>{if(on&&!modal)openFormatPicker({required:true})},350)}
    else if(fm&&FMT[fm.id]&&FMT[fm.id].ai){S.aiKind=FMT[fm.id].ai;const ai=$("#lc31-ai-btn");if(ai)ai.hidden=false}
    timer1=setTimeout(()=>{syncAll({quiet:false}).catch(()=>{})},2500);
    timer2=setInterval(()=>{syncAll({quiet:false}).catch(()=>{})},10*6e4);
    syncConnectBtn();
  }
  function onUnmount(){
    on=false;cancelAnimationFrame(raf);clearTimeout(timer1);clearInterval(timer2);gameToken++;
    document.removeEventListener("paste",onPaste,true);document.removeEventListener("keydown",onKey,true);
    modal=null;
  }
  return{onMount,onUnmount,connectAV,applyLook,setRatio,lookOf,importText,openPgnModal,analyse,openFormatPicker,applyFormat,openCarousel,autoBuild,renderSlide,exportCarousel,
    gamesBar,gameFilter,analyseItem,carouselFromItem,seedRender,syncAll,FMT,state:S,carousel:()=>CS,students,boardPgn,gameItem,looksPgn,splitGames};
})();
