/* ==========================================================================
   LC32 (hub 9.9.0 / 9.10.0): two token balances in the profile menu, board-first trainer layout, B2B Carousel Builder with
   libraries, annotations, pasted screenshots and a token-priced ElevenLabs voice-over (server action carousel_voice).
   Additive layer: every hook in the old code is wrapped in typeof LC32 !== "undefined" or try/catch. Everything shown is English.
   ========================================================================== */
const LC32=(()=>{
  "use strict";
  const VERSION="32.0.0";
  const E=s=>{try{return typeof esc==="function"?esc(s):String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}catch(e){return""}};
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.from((r||document).querySelectorAll(s));
  const ic=n=>{try{return typeof icon==="function"?icon(n):""}catch(e){return""}};
  const rd=(k,d)=>{try{return Store.get(k,d)}catch(e){return d}};
  const wr=(k,v)=>{try{return Store.set(k,v)}catch(e){return false}};
  const say=(m,k,ms)=>{try{toast(m,k,ms)}catch(e){}};
  const clampN=(v,a,b)=>Math.min(b,Math.max(a,v));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
  const mobile=()=>window.innerWidth<960;

  /* ======================= A. profile menu: two token balances ======================= */
  const pm={
    resetText(){
      let ms=0;try{ms=Quota.resetsAt()-Date.now()}catch(e){}
      if(!(ms>0))return"resets 00:00 UTC";
      const h=Math.floor(ms/36e5),m=Math.floor(ms%36e5/6e4);
      return"resets in "+(h?h+"h ":"")+m+"m";
    },
    tokens(){
      let unl=false,left=0,lim=0,bonus=0;
      try{unl=!!Quota.unlimited();left=Quota.leftNow();lim=Quota.limit();bonus=Quota.bonusNow()}catch(e){return""}
      const infinite=unl||left===Infinity;
      return'<div class="lc32-tok" data-lc32-tok role="group" aria-label="Your token balances">'+
        '<div class="lc32-tok-c is-daily"><span class="lc32-tok-l">Free daily</span>'+
          '<b>'+(infinite?"Unlimited":(Math.max(0,left|0)+'<small> / '+(lim===Infinity?"":lim|0)+'</small>'))+'</b>'+
          '<small>'+(infinite?"no daily limit":pm.resetText())+'</small></div>'+
        '<div class="lc32-tok-c is-paid"><span class="lc32-tok-l">Purchased</span><b>'+(Math.max(0,bonus|0))+'</b><small>never expire</small></div>'+
      '</div><p class="lc32-tok-n">Free daily tokens are used first, then purchased ones.</p>';
    },
    watch(){
      setInterval(()=>{
        const panel=Q("#pm-panel");if(!panel||panel.hidden)return;
        const cur=Q("[data-lc32-tok]",panel);if(!cur)return;
        const tmp=document.createElement("div");tmp.innerHTML=pm.tokens();
        const next=tmp.firstElementChild;
        if(next&&next.innerHTML!==cur.innerHTML)cur.innerHTML=next.innerHTML;
      },1500);
      document.addEventListener("click",e=>{
        if(e.target.closest&&e.target.closest("#profile-chip")){try{Quota.refresh(true)}catch(x){}}
      },true);
    }
  };

  /* ======================= B. trainers: the board first, the prompt right under it ======================= */
  const layout={
    top(){
      const tb=Q("#topbar");if(!tb)return 0;
      let cs=null;try{cs=getComputedStyle(tb)}catch(e){}
      return cs&&(cs.position==="fixed"||cs.position==="sticky")?Math.round(tb.getBoundingClientRect().bottom):0;
    },
    measure(){
      const root=document.documentElement,top=layout.top();
      root.style.setProperty("--lc32-top",top+"px");
      const bc=Q(".trainer>.board-col");
      const bh=bc&&mobile()?Math.round(bc.getBoundingClientRect().height):0;
      root.style.setProperty("--lc32-sticky",(top+bh+10)+"px");
      const ab=Q(".an-main>.board-shell");root.style.setProperty("--lc32-an-board",ab&&mobile()?Math.round(ab.getBoundingClientRect().height)+"px":"0px");
    },
    init(){
      let raf=0;const go=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(layout.measure)};
      window.addEventListener("resize",go);window.addEventListener("orientationchange",go);window.addEventListener("hashchange",()=>setTimeout(go,120));
      const view=Q("#view");
      if(view&&window.MutationObserver)new MutationObserver(go).observe(view,{childList:true,subtree:true});
      if(window.ResizeObserver){
        const ro=new ResizeObserver(go);let seen=null;
        setInterval(()=>{const bc=Q(".trainer>.board-col");if(bc!==seen){if(seen)ro.unobserve(seen);seen=bc;if(bc)ro.observe(bc)}},700);
      }
      go();
    },
    /* StageRunner calls this on every M, S, P, C step: completed steps fold away and the new prompt slides up under the board. */
    step(host,at){
      if(!host)return;
      host.setAttribute("data-lc32-at",String(at));
      if(!mobile()||!(at>0))return;
      requestAnimationFrame(()=>{
        const st=Q('[data-part="stage"]',host);
        if(st&&st.scrollIntoView){try{st.scrollIntoView({block:"start",behavior:"smooth"})}catch(e){st.scrollIntoView()}}
      });
    }
  };

  /* ======================= C. Carousel Builder: seeds, brands ======================= */
  const BRANDS=[
    {id:"midnight",name:"Midnight Cyan",bg:["#0A0B0E","#0d2330"],accent:"#00E5FF",text:"#FFFFFF",muted:"#8DA2B3",glow:"#00E5FF"},
    {id:"slate",name:"Slate Sky",bg:["#0f172a","#1e293b"],accent:"#38bdf8",text:"#F1F5F9",muted:"#94A3B8",glow:"#38bdf8"},
    {id:"gold",name:"Grandmaster Gold",bg:["#14110A","#2b2108"],accent:"#F5C451",text:"#FFF8E6",muted:"#BFA76A",glow:"#F5C451"},
    {id:"alert",name:"Blunder Alert",bg:["#150A0C","#33121a"],accent:"#FB7185",text:"#FFF1F2",muted:"#C99AA2",glow:"#FB7185"},
    {id:"mint",name:"Endgame Mint",bg:["#06130F","#0b2a22"],accent:"#34D399",text:"#ECFDF5",muted:"#8FBFAE",glow:"#34D399"},
    {id:"paper",name:"Clean Paper",bg:["#F8FAFC","#E2E8F0"],accent:"#0369A1",text:"#0F172A",muted:"#475569",glow:"#0369A1"}
  ];
  const brandOf=id=>BRANDS.filter(b=>b.id===id)[0]||BRANDS[0];
  const STICKERS=["♟","♞","♝","♜","♛","♚","!!","!","?","??","?!","⚠️","✅","❌","🔥","👀","⏱","💡","🧠","🎯","➡️","⬆️","+1","#1"];
  const COLORS=[["#FF3D5A","Red"],["#22C55E","Green"],["#FACC15","Yellow"],["#00E5FF","Cyan"],["#FFFFFF","White"]];
  const SEED={
    hooks:[
      ["viral","Stop playing this move at 800 ELO. It loses a piece in 3 moves."],
      ["viral","I peaked at 2105 on Chess.com. This is the mistake I still see in almost every 800 game."],
      ["viral","You don't lose games because you're bad at tactics. You lose them in this one moment."],
      ["viral","Pause. What is your opponent threatening here?"],
      ["viral","This free habit gained a student +630 ELO in 2 months."],
      ["viral","3 things strong players check before every move (you skip step 1)."],
      ["viral","Nobody told me this opening trap until I was 1500."],
      ["formula","Stop doing [mistake] if you want to reach [rating]."],
      ["formula","The [number] [piece] mistakes that keep you stuck at [rating]."],
      ["formula","Why you keep losing from winning positions (and the 4-step fix)."],
      ["formula","I analysed [number] games at [rating]. Here is what every loss had in common."],
      ["formula","Can you find the best move? 90% of [rating] players miss it."],
      ["prompt","Write 5 hooks about the most common hanging-piece blunder at [rating] ELO."],
      ["prompt","Turn this position into a 3-slide carousel: hook, the mistake, the MSPC fix."],
      ["prompt","Give me 10 headline formulas for chess improvement posts aimed at [rating] players."],
      ["idea","Move-by-move: how one careless move 12 changed the whole game."],
      ["idea","Puzzle ladder: 5 positions from easy to hard, same theme."],
      ["idea","Before and after: the same position played at 800 vs 1800."]
    ],
    ctas:[
      ["price","1-on-1 private coaching costs €80+/hr. A 24/7 AI personal coach in your pocket? Comment 'APP' to get started."],
      ["price","A chess coach is €80 an hour. This app coaches you every day, for a fraction of one lesson. Comment 'APP' and I'll send the link."],
      ["app","Train this free in the Lanckriet Chess Training Hub: [REFERRAL_LINK]"],
      ["app","Get the app (works in your browser, installs like an app): [REFERRAL_LINK]"],
      ["app","Link in bio. Open the Hub and try your first review free."],
      ["engage","Which move would you play? Comment your answer and I'll reply to every one."],
      ["engage","Save this for your next game and send it to a friend who hangs pieces."],
      ["engage","Follow for one MSPC lesson every day."],
      ["price","Skip the €80/hr coach. Get an AI coach built on a 2105-rated method. Comment 'APP'."]
    ],
    assets:[
      ["background","midnight"],["background","slate"],["background","gold"],["background","alert"],["background","mint"],["background","paper"],
      ["prompt","Dark navy chess background, a single glowing cyan knight silhouette, shallow depth of field, empty space in the centre for text, 4:5 vertical, no text, no watermark"],
      ["prompt","Close-up of a chessboard in dramatic side light, one white queen in focus, deep blue shadows, cinematic, empty top third for a headline, 4:5 vertical, no text"],
      ["prompt","Abstract slate and sky-blue gradient with faint chessboard grid pattern, soft glow, minimal, 4:5 vertical, no text"],
      ["prompt","Red warning glow behind a chess piece falling over, dark background, high contrast, thumbnail style, room for big text on the left, no text"],
      ["prompt","Golden light on a chess king, black background, luxury feel, subtle dust particles, 4:5 vertical, empty lower third, no text"],
      ["prompt","Minimal top-down chessboard mid-game, flat vector style, brand colours cyan and navy, lots of negative space, no text"]
    ]
  };
  const PROMPT_STYLES=[
    ["cinematic","cinematic lighting, shallow depth of field, high contrast"],
    ["minimal","flat vector, minimal, lots of negative space"],
    ["dramatic","dramatic rim light, dark moody background, glowing accent"],
    ["clean","clean studio look, soft shadows, premium feel"]
  ];

  /* ---------- libraries: built-in seeds + content.json (carouselLibs) + this partner's own items ---------- */
  const KLIB="lc32-lib",KPROJ="lc32-project",KIDB="lc32-img";
  const libOwn=()=>{const o=rd(KLIB,null);return o&&typeof o==="object"&&!Array.isArray(o)?o:{hooks:[],assets:[],ctas:[]}};
  function libAll(kind){
    const base=SEED[kind].map((x,i)=>({id:"seed-"+kind+"-"+i,cat:x[0],text:x[1],seed:true}));
    let remote=[];
    try{const c=(typeof CONTENT!=="undefined"&&CONTENT&&CONTENT.carouselLibs)||null;if(c&&Array.isArray(c[kind]))remote=c[kind].filter(x=>x&&typeof x.text==="string").map((x,i)=>({id:"cms-"+kind+"-"+i,cat:String(x.cat||"other").slice(0,20),text:String(x.text).slice(0,600),cms:true}))}catch(e){}
    const own=(libOwn()[kind]||[]).map(x=>Object.assign({own:true},x));
    return base.concat(remote,own);
  }
  function libAdd(kind,cat,text){
    text=String(text||"").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g," ").trim().slice(0,600);if(text.length<4)return false;
    const o=libOwn();(o[kind]=o[kind]||[]).unshift({id:uid(),cat:String(cat||"other").slice(0,20),text:text});wr(KLIB,o);return true;
  }
  function libDel(kind,id){const o=libOwn();o[kind]=(o[kind]||[]).filter(x=>x.id!==id);wr(KLIB,o)}
  const refInfo=()=>{try{return LC77.refInfo()}catch(e){return{code:"",link:location.origin+location.pathname,short:location.host}}};
  function mergeText(t){
    const r=refInfo(),link=String(r.link||"").trim()||location.origin+location.pathname;
    let name="";try{name=String(App.profile&&App.profile.name||"")}catch(e){}
    return String(t==null?"":t).replace(/\[\s*(REFERRAL[_ ]?LINK|LINK)\s*\]/gi,link.replace(/^https?:\/\//i,"").replace(/\/$/,"")).replace(/\[\s*STUDENT[_ ]?NAME\s*\]/gi,name||"a student");
  }

  /* ---------- images: kept in memory, saved in IndexedDB so they survive a reload (localStorage is too small) ---------- */
  const IMG={};
  const idb=()=>new Promise((res,rej)=>{
    if(!window.indexedDB)return rej(new Error("no idb"));
    const r=indexedDB.open(KIDB,1);r.onupgradeneeded=()=>r.result.createObjectStore("i");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
  });
  async function idbPut(k,blob){try{const d=await idb();await new Promise((res,rej)=>{const t=d.transaction("i","readwrite");t.objectStore("i").put(blob,k);t.oncomplete=res;t.onerror=()=>rej(t.error)});d.close()}catch(e){}}
  async function idbGet(k){try{const d=await idb();const v=await new Promise((res,rej)=>{const q=d.transaction("i").objectStore("i").get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});d.close();return v||null}catch(e){return null}}
  async function idbDel(k){try{const d=await idb();await new Promise(res=>{const t=d.transaction("i","readwrite");t.objectStore("i").delete(k);t.oncomplete=res;t.onerror=res});d.close()}catch(e){}}
  async function bitmapOf(blob){
    if(window.createImageBitmap){try{return await createImageBitmap(blob)}catch(e){}}
    return await new Promise((res,rej)=>{const u=URL.createObjectURL(blob),im=new Image();im.onload=()=>{res(im)};im.onerror=()=>rej(new Error("bad image"));im.src=u});
  }
  /* Downscale to at most 1600 px on the long side and store as PNG (chess diagrams stay sharp). */
  async function ingestImage(slide,blob){
    if(!blob||!/^image\//.test(blob.type||""))throw new Error("That is not an image.");
    if(blob.size>25e6)throw new Error("That image is too large (25 MB max).");
    const bm=await bitmapOf(blob),w0=bm.width||bm.naturalWidth,h0=bm.height||bm.naturalHeight,k=Math.min(1,1600/Math.max(w0,h0));
    const cv=document.createElement("canvas");cv.width=Math.max(1,Math.round(w0*k));cv.height=Math.max(1,Math.round(h0*k));
    cv.getContext("2d").drawImage(bm,0,0,cv.width,cv.height);
    const out=await new Promise(r=>cv.toBlob(r,"image/png"));
    IMG[slide.id]=cv;await idbPut(slide.id,out);slide.hasImg=true;slide.fen="";
    return cv;
  }
  async function restoreImages(P){
    for(const s of P.slides){if(s.hasImg&&!IMG[s.id]){const b=await idbGet(s.id);if(b){try{const bm=await bitmapOf(b),cv=document.createElement("canvas");cv.width=bm.width||bm.naturalWidth;cv.height=bm.height||bm.naturalHeight;cv.getContext("2d").drawImage(bm,0,0);IMG[s.id]=cv}catch(e){}}else s.hasImg=false}}
  }

  /* ---------- project model ---------- */
  const SIZES={"4:5":[1080,1350],"1:1":[1080,1080],"9:16":[1080,1920]};
  const mkSlide=(stage,o)=>Object.assign({id:uid(),stage:stage,title:"",text:"",brand:"",fen:"",flip:false,last:null,hasImg:false,fit:"contain",notes:[],narration:"",btn:""},o||{});
  function newProject(){
    return{v:1,title:"",size:"4:5",brand:"midnight",secPer:4,audio:{mode:"none",musicUrl:"",musicName:"",vol:.25},
      slides:[mkSlide("hook",{title:"Stop playing this move",text:"at 800 ELO"}),mkSlide("content",{title:"The position",text:""}),mkSlide("cta",{title:"Train this free",text:"1-on-1 private coaching costs €80+/hr. A 24/7 AI personal coach in your pocket? Comment 'APP' to get started."})]};
  }
  function cleanProject(o){
    const d=newProject();if(!o||typeof o!=="object"||!Array.isArray(o.slides)||!o.slides.length)return d;
    const P={v:1,title:String(o.title||"").slice(0,120),size:SIZES[o.size]?o.size:"4:5",brand:brandOf(o.brand).id,secPer:clampN(+o.secPer||4,2,12),
      audio:{mode:["none","music","voice"].indexOf(o.audio&&o.audio.mode)>=0?o.audio.mode:"none",musicUrl:"",musicName:String(o.audio&&o.audio.musicName||"").slice(0,80),vol:clampN(+(o.audio&&o.audio.vol)||.25,0,1)},slides:[]};
    o.slides.slice(0,30).forEach(s=>{
      if(!s||typeof s!=="object")return;
      const t=s.stage==="hook"||s.stage==="cta"?s.stage:"content";
      P.slides.push(mkSlide(t,{id:/^[a-z0-9]{6,20}$/.test(String(s.id||""))?s.id:uid(),title:String(s.title||"").slice(0,160),text:String(s.text||"").slice(0,700),brand:s.brand&&BRANDS.some(b=>b.id===s.brand)?s.brand:"",
        fen:typeof s.fen==="string"&&s.fen.length<120?s.fen:"",flip:!!s.flip,last:s.last&&/^[a-h][1-8]$/.test(s.last.from||"")&&/^[a-h][1-8]$/.test(s.last.to||"")?{from:s.last.from,to:s.last.to}:null,
        hasImg:!!s.hasImg,fit:s.fit==="cover"?"cover":"contain",narration:String(s.narration||"").slice(0,1100),btn:String(s.btn||"").slice(0,40),
        notes:(Array.isArray(s.notes)?s.notes:[]).slice(0,40).map(n=>{
          if(!n||typeof n!=="object")return null;const f=v=>clampN(+v||0,0,1);
          if(n.t==="a")return{t:"a",x1:f(n.x1),y1:f(n.y1),x2:f(n.x2),y2:f(n.y2),c:String(n.c||"#FF3D5A").slice(0,9)};
          if(n.t==="o")return{t:"o",x:f(n.x),y:f(n.y),r:clampN(+n.r||.05,.01,.5),c:String(n.c||"#FF3D5A").slice(0,9)};
          if(n.t==="t"||n.t==="s")return{t:n.t,x:f(n.x),y:f(n.y),g:String(n.g||"").slice(0,40),size:clampN(+n.size||.05,.02,.2),c:String(n.c||"#FFFFFF").slice(0,9)};
          return null}).filter(Boolean)}));
    });
    if(!P.slides.length)return d;
    if(P.slides[0].stage!=="hook")P.slides.unshift(mkSlide("hook",{title:"Your hook"}));
    if(P.slides[P.slides.length-1].stage!=="cta")P.slides.push(mkSlide("cta",{title:"Train this free"}));
    return P;
  }
  const saveProj=(()=>{let t=0;return P=>{clearTimeout(t);t=setTimeout(()=>wr(KPROJ,P),250)}})();

  /* ---------- rendering ---------- */
  const Studio_=()=>{try{return window.LanckrietStudio&&window.LanckrietStudio._t||null}catch(e){return null}};
  function fitLines(g,text,maxW,maxH,fontPx,weight,min){
    let size=fontPx;
    for(;size>=min;size-=2){
      g.font=weight+" "+size+"px Sora,system-ui,-apple-system,Segoe UI,sans-serif";
      const lines=wrap(g,text,maxW);
      if(lines.length*size*1.2<=maxH)return{size,lines};
    }
    g.font=weight+" "+min+"px Sora,system-ui,sans-serif";
    return{size:min,lines:wrap(g,text,maxW).slice(0,Math.max(1,Math.floor(maxH/(min*1.2))))};
  }
  function wrap(g,text,maxW){
    const out=[];String(text||"").split("\n").forEach(par=>{let line="";par.split(/\s+/).filter(Boolean).forEach(w=>{const t=line?line+" "+w:w;if(g.measureText(t).width>maxW&&line){out.push(line);line=w}else line=t});out.push(line)});
    return out;
  }
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function bg(g,W,H,b){
    const gr=g.createLinearGradient(0,0,W*.4,H);gr.addColorStop(0,b.bg[0]);gr.addColorStop(1,b.bg[1]);g.fillStyle=gr;g.fillRect(0,0,W,H);
    const rg=g.createRadialGradient(W*.85,H*.12,10,W*.85,H*.12,W*.8);rg.addColorStop(0,b.glow+"33");rg.addColorStop(1,b.glow+"00");g.fillStyle=rg;g.fillRect(0,0,W,H);
    g.save();g.globalAlpha=b.id==="paper"?.05:.07;g.fillStyle=b.accent;const s=W/16;for(let r=0;r<Math.ceil(H/s);r++)for(let c=0;c<17;c++)if((r+c)%2===0&&r>H/s-5)g.fillRect(c*s,r*s,s,s);g.restore();
  }
  function arrow(g,x1,y1,x2,y2,c,w){
    const a=Math.atan2(y2-y1,x2-x1),head=w*3.4;
    g.save();g.strokeStyle=c;g.fillStyle=c;g.lineWidth=w;g.lineCap="round";
    g.beginPath();g.moveTo(x1,y1);g.lineTo(x2-Math.cos(a)*head*.6,y2-Math.sin(a)*head*.6);g.stroke();
    g.beginPath();g.moveTo(x2,y2);g.lineTo(x2-Math.cos(a-.45)*head,y2-Math.sin(a-.45)*head);g.lineTo(x2-Math.cos(a+.45)*head,y2-Math.sin(a+.45)*head);g.closePath();g.fill();g.restore();
  }
  function drawNotes(g,W,H,notes){
    (notes||[]).forEach(n=>{
      if(n.t==="a")arrow(g,n.x1*W,n.y1*H,n.x2*W,n.y2*H,n.c,Math.max(6,W*.009));
      else if(n.t==="o"){g.save();g.strokeStyle=n.c;g.lineWidth=Math.max(5,W*.008);g.beginPath();g.arc(n.x*W,n.y*H,n.r*W,0,6.2832);g.stroke();g.restore()}
      else{
        g.save();g.textAlign="center";g.textBaseline="middle";const px=Math.round(n.size*W);
        g.font=(n.t==="s"?"700 ":"700 ")+px+'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",Sora,system-ui,sans-serif';
        if(n.t==="t"){g.lineWidth=Math.max(4,px*.16);g.strokeStyle="rgba(0,0,0,.75)";g.strokeText(n.g,n.x*W,n.y*H)}
        g.fillStyle=n.c;g.fillText(n.g,n.x*W,n.y*H);g.restore();
      }
    });
  }
  let guardWait=false;
  /* Exports must never show a course position: finish the course-library scan first. */
  function settleGuard(){try{if(typeof Studio!=="undefined"&&Studio._t&&Studio._t.Guard){Studio._t.Guard.hurry();Studio._t.Guard._sync(1e9)}}catch(e){}}
  function boardCanvas(slide,size){
    const T=Studio_();if(!T||!T.BoardModel||!T.renderBoard||!slide.fen)return null;
    let st="ok";
    try{if(typeof Studio!=="undefined"&&Studio._t&&Studio._t.Guard)st=Studio._t.Guard.state(slide.fen)}catch(e){st="lock"}
    const locked=st!=="ok";if(st==="wait")guardWait=true;
    const cv=document.createElement("canvas");cv.width=cv.height=size;const g=cv.getContext("2d");
    try{
      const bm=new T.BoardModel();bm.reset(slide.fen);bm.orient=slide.flip?"b":"w";bm.last=slide.last||null;bm.clearUI&&bm.clearUI();
      T.renderBoard(g,size,bm);
    }catch(e){return null}
    if(locked){g.fillStyle="rgba(10,11,14,.82)";g.fillRect(0,0,size,size);g.fillStyle="#00E5FF";g.textAlign="center";g.textBaseline="middle";g.font="700 "+size*.05+"px Sora,system-ui,sans-serif";g.fillText(st==="wait"?"Checking position…":"Premium position",size/2,size/2-size*.03);g.fillStyle="#8DA2B3";g.font="400 "+size*.035+"px Sora,system-ui,sans-serif";g.fillText(st==="wait"?"Course library check in progress.":"Members see it in the Hub.",size/2,size/2+size*.04)}
    return cv;
  }
  /* Draws one slide. o.noMark: previews and thumbnails; every export draws the tier watermark last. */
  function renderSlide(P,idx,W,H,o){
    o=o||{};const s=P.slides[idx],b=brandOf(s.brand||P.brand);
    const cv=o.canvas||document.createElement("canvas");cv.width=W;cv.height=H;const g=cv.getContext("2d");
    bg(g,W,H,b);
    const pad=W*.075,topSafe=H*.105;
    g.textAlign="left";g.textBaseline="top";
    const title=mergeText(s.title),text=mergeText(s.text);
    if(s.stage==="hook"){
      g.fillStyle=b.accent;g.font="700 "+Math.round(W*.03)+"px Sora,system-ui,sans-serif";g.fillText("LANCKRIET CHESS",pad,H*.2);
      const r1=fitLines(g,title||"Your hook",W-pad*2,H*.34,Math.round(W*.115),700,Math.round(W*.05));
      g.fillStyle=b.text;g.font="700 "+r1.size+"px Sora,system-ui,sans-serif";r1.lines.forEach((l,i)=>g.fillText(l,pad,H*.27+i*r1.size*1.2));
      let y=H*.27+r1.lines.length*r1.size*1.2+H*.025;
      if(text){const r2=fitLines(g,text,W-pad*2,H*.2,Math.round(W*.055),500,Math.round(W*.032));g.fillStyle=b.accent;g.font="500 "+r2.size+"px Sora,system-ui,sans-serif";r2.lines.forEach((l,i)=>g.fillText(l,pad,y+i*r2.size*1.3))}
      g.fillStyle=b.muted;g.font="500 "+Math.round(W*.032)+"px Sora,system-ui,sans-serif";g.fillText("Swipe \u2192",pad,H*.86);
    }else if(s.stage==="cta"){
      g.fillStyle=b.accent;g.font="700 "+Math.round(W*.03)+"px Sora,system-ui,sans-serif";g.fillText("YOUR MOVE",pad,H*.2);
      const r1=fitLines(g,title||"Train this free",W-pad*2,H*.22,Math.round(W*.1),700,Math.round(W*.05));
      g.fillStyle=b.text;g.font="700 "+r1.size+"px Sora,system-ui,sans-serif";r1.lines.forEach((l,i)=>g.fillText(l,pad,H*.26+i*r1.size*1.2));
      let y=H*.26+r1.lines.length*r1.size*1.2+H*.03;
      if(text){const r2=fitLines(g,text,W-pad*2,H*.3,Math.round(W*.05),400,Math.round(W*.032));g.fillStyle=b.text;g.globalAlpha=.9;g.font="400 "+r2.size+"px Sora,system-ui,sans-serif";r2.lines.forEach((l,i)=>g.fillText(l,pad,y+i*r2.size*1.35));g.globalAlpha=1;y+=r2.lines.length*r2.size*1.35+H*.03}
      if(s.btn){const bh=H*.07;g.font="700 "+Math.round(W*.04)+"px Sora,system-ui,sans-serif";const bw=Math.min(W-pad*2,g.measureText(s.btn).width+W*.1);g.fillStyle=b.accent;rr(g,pad,Math.min(y,H*.78),bw,bh,bh/2);g.fill();g.fillStyle=b.id==="paper"?"#fff":"#06101a";g.textBaseline="middle";g.fillText(s.btn,pad+W*.05,Math.min(y,H*.78)+bh/2);g.textBaseline="top"}
    }else{
      let y=topSafe;
      if(title){const r1=fitLines(g,title,W-pad*2,H*.12,Math.round(W*.06),700,Math.round(W*.034));g.fillStyle=b.text;g.font="700 "+r1.size+"px Sora,system-ui,sans-serif";r1.lines.forEach((l,i)=>g.fillText(l,pad,y+i*r1.size*1.2));y+=r1.lines.length*r1.size*1.2+H*.015}
      const capH=text?H*.16:0,mh=H-y-capH-H*.075,mw=W-pad*2;
      const media=IMG[s.id]&&s.hasImg?IMG[s.id]:null;
      if(media){
        const k=s.fit==="cover"?Math.max(mw/media.width,mh/media.height):Math.min(mw/media.width,mh/media.height),dw=media.width*k,dh=media.height*k,dx=pad+(mw-dw)/2,dy=y+(mh-dh)/2;
        g.save();rr(g,pad,y,mw,mh,W*.02);g.clip();g.fillStyle="rgba(0,0,0,.25)";g.fillRect(pad,y,mw,mh);g.drawImage(media,dx,dy,dw,dh);g.restore();
      }else if(s.fen){
        const size=Math.min(mw,mh),bc=boardCanvas(s,Math.round(size));
        if(bc){g.save();rr(g,pad+(mw-size)/2,y+(mh-size)/2,size,size,W*.012);g.clip();g.drawImage(bc,pad+(mw-size)/2,y+(mh-size)/2,size,size);g.restore()}
      }else{
        g.save();g.strokeStyle=b.accent;g.globalAlpha=.5;g.setLineDash([14,10]);g.lineWidth=3;rr(g,pad,y,mw,mh,W*.02);g.stroke();g.restore();
        g.fillStyle=b.muted;g.textAlign="center";g.textBaseline="middle";g.font="500 "+Math.round(W*.036)+"px Sora,system-ui,sans-serif";g.fillText("Paste a screenshot (Ctrl+V) or load a position",W/2,y+mh/2);g.textAlign="left";g.textBaseline="top";
      }
      if(text){const r2=fitLines(g,text,W-pad*2,capH,Math.round(W*.045),400,Math.round(W*.03));g.fillStyle=b.text;g.font="400 "+r2.size+"px Sora,system-ui,sans-serif";r2.lines.forEach((l,i)=>g.fillText(l,pad,y+mh+H*.02+i*r2.size*1.3))}
    }
    drawNotes(g,W,H,s.notes);
    g.fillStyle=b.muted;g.font="500 "+Math.round(W*.024)+"px 'JetBrains Mono',monospace";g.textAlign="left";g.textBaseline="alphabetic";
    g.fillText(String(idx+1).padStart(2,"0")+" / "+String(P.slides.length).padStart(2,"0"),pad,H-H*.03);
    if(!o.noMark)watermark(g,W,H);
    return cv;
  }
  /* The Studio's watermark rules apply to every export: Free = the unremovable bar, Pro Creator = a small logo, Enterprise = optional. */
  function watermark(g,W,H){
    const T=Studio_();if(!T||!T.drawWatermark||!T.Tier)return;
    try{
      if(window.LanckrietStudio&&window.LanckrietStudio.host)window.LanckrietStudio.host({tier:()=>{try{return V71.studio().tier||"free"}catch(e){return"free"}}});
      T.drawWatermark(g,W,H,T.Tier.wm());
    }catch(e){console.error(e)}
  }

  /* ---------- voice-over: one server call per job, priced in tokens ---------- */
  async function voiceCall(body){
    try{if(!V5Net.on())return{ok:false,reason:"off",status:0}}catch(e){return{ok:false,reason:"off",status:0}}
    if(navigator.onLine===false)return{ok:false,reason:"offline",status:0};
    let res,data;
    try{
      res=await fetchWithTimeout(V5Net.url(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.assign({action:"carousel_voice",app:"lanckrietchess-hub",version:CONFIG.version,device:deviceId()},Quota.creds(),body))},12e4);
      data=await res.json();
    }catch(e){return{ok:false,reason:"network",status:0}}
    return Object.assign({status:res.status},data&&typeof data==="object"?data:{ok:false,reason:"server"});
  }
  function voiceWhy(r){
    const s=r&&r.state||{};
    switch(r&&r.reason){
      case"token_limit":return"Not enough tokens: this voice-over needs "+(r.needed||"more")+". You have "+(s.unlimited?"unlimited":(s.left|0))+" free daily and "+(s.bonus|0)+" purchased.";
      case"voice_off":return"The voice service is not switched on for this hub yet.";
      case"voice_busy":return"The voice service has reached its daily limit. Try again tomorrow.";
      case"voice_unavailable":return"The voice service did not answer. Nothing was charged.";
      case"too_long":return"That is too long for one voice-over. Keep each slide under 1,100 characters and the whole carousel under 5,000.";
      case"empty":case"bad_input":return"There is no text to read yet. Write a narration or fill in the slide text.";
      case"off":return"The server is not connected, so voice-overs are not available here.";
      case"offline":return"You are offline.";
      case"network":return"Could not reach the server. Nothing was charged.";
      default:return"The voice-over could not be made. Nothing was charged.";
    }
  }
  const b64buf=b=>{const s=atob(b),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u.buffer};
  const narrOf=(s)=>{const n=String(s.narration||"").trim();if(n)return mergeText(n).slice(0,1100);return[mergeText(s.title),mergeText(s.text)].map(x=>x.trim()).filter(Boolean).join(". ").slice(0,1100)};

  /* ======================= D. the builder ======================= */
  let live=null;
  function builder(host){
    let P=cleanProject(rd(KPROJ,null)),sel=0,tab="slide",libTab="hooks",libCat="all",libQ="",busy="";
    const T={mode:"select",color:COLORS[0][0],sticker:STICKERS[0],text:"Look here",draft:null};
    const V={clips:{},quote:null,actx:null,playing:false,stop:false,music:null};
    let prev=null,pid=0,alive=true,statusMsg="";
    const slide=()=>P.slides[sel];
    const dims=()=>SIZES[P.size];
    const save=()=>saveProj(P);
    const status=(m,k)=>{statusMsg=m||"";const el=Q("[data-lc32-status]",host);if(el){el.textContent=statusMsg;el.className="small "+(k==="err"?"lc32-err":"muted")}};
    const el=(t,a,...kids)=>{const n=document.createElement(t);if(a)for(const k in a){const v=a[k];if(v==null||v===false)continue;if(k==="class")n.className=v;else if(k==="text")n.textContent=v;else if(k==="html")n.innerHTML=v;else if(k.slice(0,2)==="on")n.addEventListener(k.slice(2),v);else n.setAttribute(k,v===true?"":v)}kids.forEach(c=>{if(c!=null)n.append(c)});return n};

    host.innerHTML='<div class="lc32-cb">'+
      '<div class="lc32-bar" data-bar></div>'+
      '<div class="lc32-main"><div class="lc32-strip" data-strip aria-label="Slides"></div>'+
      '<div class="lc32-stage"><div class="lc32-prev"><canvas data-prev aria-label="Slide preview"></canvas></div><p class="small muted lc32-hint" data-hint></p></div>'+
      '<div class="lc32-side"><div class="seg lc32-tabs" role="tablist" data-tabs></div><div class="lc32-panel" data-panel></div></div></div>'+
      '<p class="small muted" data-lc32-status role="status"></p></div>';
    const Qh=s=>Q(s,host);

    /* ----- drawing ----- */
    function draw(){
      const cv=Qh("[data-prev]");if(!cv||!alive)return;
      const [W,H]=dims(),pw=720,ph=Math.round(pw*H/W);
      const s=slide(),keep=s.notes;
      if(T.draft)s.notes=keep.concat([T.draft]);
      try{renderSlide(P,sel,pw,ph,{canvas:cv})}finally{s.notes=keep}
      cv.style.aspectRatio=W+"/"+H;
      if(guardWait){guardWait=false;setTimeout(()=>{if(alive){thumbs();draw()}},700)}
    }
    function thumbs(){
      const box=Qh("[data-strip]");if(!box)return;box.textContent="";
      const [W,H]=dims();
      P.slides.forEach((s,i)=>{
        const b=el("button",{type:"button",class:"lc32-th","aria-pressed":String(i===sel),"aria-label":"Slide "+(i+1)+", "+s.stage,onclick:()=>{sel=i;refresh()}});
        const c=document.createElement("canvas");try{renderSlide(P,i,180,Math.round(180*H/W),{canvas:c,noMark:true})}catch(e){}
        b.append(c,el("i",{text:String(i+1)}),el("span",{text:s.stage==="hook"?"Hook":s.stage==="cta"?"CTA":"Content"}));box.append(b);
      });
    }
    function bar(){
      const b=Qh("[data-bar]");b.textContent="";
      const sizeSel=el("select",{"aria-label":"Format",id:"lc32-size",onchange:e=>{P.size=e.target.value;save();refresh()}});
      [["4:5","4:5 post"],["1:1","1:1 square"],["9:16","9:16 story / reel"]].forEach(o=>sizeSel.append(el("option",{value:o[0],text:o[1],selected:o[0]===P.size||null})));
      const brandSel=el("select",{"aria-label":"Brand style",id:"lc32-brand",onchange:e=>{P.brand=e.target.value;save();refresh()}});
      BRANDS.forEach(o=>brandSel.append(el("option",{value:o.id,text:o.name,selected:o.id===P.brand||null})));
      b.append(el("input",{type:"text",id:"lc32-title",placeholder:"Project title",maxlength:"120",value:P.title,"aria-label":"Project title",oninput:e=>{P.title=e.target.value;save()}}),sizeSel,brandSel,
        el("button",{type:"button",class:"btn btn-primary btn-sm",id:"lc32-png",html:ic("download")+" PNG slides",disabled:busy?true:null,onclick:()=>exportPng(false)}),
        el("button",{type:"button",class:"btn btn-ghost btn-sm",id:"lc32-video",html:ic("video")+" Video (WebM)",disabled:busy?true:null,onclick:()=>exportVideo()}),
        el("button",{type:"button",class:"btn btn-quiet btn-sm",id:"lc32-reset",text:"New carousel",onclick:()=>{if(!confirmTwice())return;resetAll()}}));
    }
    let resetArm=0;
    const confirmTwice=()=>{if(Date.now()-resetArm<4000){resetArm=0;return true}resetArm=Date.now();say("Press New carousel again to clear everything.","",2600);return false};
    async function resetAll(){for(const s of P.slides)if(s.hasImg)idbDel(s.id);Object.keys(IMG).forEach(k=>delete IMG[k]);V.clips={};V.quote=null;P=newProject();sel=0;save();refresh()}
    function tabs(){
      const t=Qh("[data-tabs]");t.textContent="";
      [["slide","Slide"],["annotate","Annotate"],["library","Library"],["ai","AI prompts"],["audio","Audio"]].forEach(x=>t.append(el("button",{type:"button",role:"tab","data-tab":x[0],"aria-pressed":String(tab===x[0]),text:x[1],onclick:()=>{tab=x[0];T.mode=tab==="annotate"?(T.mode==="select"?"arrow":T.mode):"select";refresh(true)}})));
    }
    function hint(){
      const h=Qh("[data-hint]");const s=slide();
      h.textContent=T.mode!=="select"&&tab==="annotate"?(T.mode==="arrow"?"Drag on the slide to draw an arrow.":T.mode==="circle"?"Drag from the centre outwards to draw a circle.":T.mode==="text"?"Click on the slide to place your text.":"Click on the slide to place the sticker."):
        (s.stage==="content"?"Tip: copy a board screenshot and press Ctrl+V here.":s.stage==="hook"?"Slide 1 stops the scroll. Keep it under 12 words.":"Last slide: one clear action.");
    }
    function refresh(panelOnly){
      if(!alive)return;
      if(!panelOnly){bar();}
      tabs();thumbs();draw();hint();panel();
    }

    /* ----- slide management ----- */
    const ctaIndex=()=>P.slides.length-1;
    function addContent(o){
      if(P.slides.length>=30){say("A carousel can have up to 30 slides.","err");return null}
      const at=sel>0&&sel<ctaIndex()?sel+1:ctaIndex();
      const s=mkSlide("content",o||{});P.slides.splice(at,0,s);sel=at;save();return s;
    }
    function dupSlide(){const s=slide();if(s.stage!=="content")return;const c=JSON.parse(JSON.stringify(s));c.id=uid();c.hasImg=false;if(IMG[s.id]&&s.hasImg){IMG[c.id]=IMG[s.id];c.hasImg=true;IMG[s.id].toBlob(b=>idbPut(c.id,b))}P.slides.splice(sel+1,0,c);sel++;save();refresh()}
    function moveSlide(d){const s=slide();if(s.stage!=="content")return;const j=sel+d;if(j<1||j>=ctaIndex())return;P.slides.splice(sel,1);P.slides.splice(j,0,s);sel=j;save();refresh()}
    function delSlide(){const s=slide();if(s.stage!=="content")return;if(s.hasImg)idbDel(s.id);delete IMG[s.id];delete V.clips[s.id];P.slides.splice(sel,1);sel=Math.min(sel,ctaIndex()-0);if(sel>=P.slides.length)sel=P.slides.length-1;save();refresh()}

    /* ----- images: paste, upload, drop ----- */
    async function putImage(blob){
      let s=slide();if(s.stage!=="content"){s=addContent();if(!s)return}
      try{await ingestImage(s,blob);save();refresh();status("Image added to slide "+(sel+1)+".")}
      catch(e){status(e.message||"That image could not be read.","err");say(e.message||"That image could not be read.","err")}
    }
    function onPaste(e){
      if(!alive)return;if(!host.isConnected){dispose();return}
      const t=e.target;if(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable))return;
      const cd=e.clipboardData;if(!cd)return;
      const item=Array.from(cd.items||[]).filter(i=>i.kind==="file"&&/^image\//.test(i.type))[0];
      if(item){e.preventDefault();putImage(item.getAsFile());return}
      const txt=cd.getData("text/plain");
      if(txt){const f=fenFrom(txt);if(f){e.preventDefault();useFen(f);return}}
    }
    async function pasteButton(){
      if(!navigator.clipboard||!navigator.clipboard.read){status("Your browser cannot read the clipboard here. Click the slide area and press Ctrl+V instead.","err");return}
      try{
        const items=await navigator.clipboard.read();
        for(const it of items){const ty=it.types.filter(x=>/^image\//.test(x))[0];if(ty){await putImage(await it.getType(ty));return}}
        status("No image on the clipboard. Copy a screenshot first.","err");
      }catch(e){status("The browser blocked clipboard access. Click the slide area and press Ctrl+V instead.","err")}
    }
    function fenFrom(txt){
      const t=String(txt||"").trim().split("\n")[0].trim();
      if(!/^[rnbqkpRNBQKP1-8\/]{15,80}(\s+[wb]\s+\S+(\s+\S+){0,3})?$/.test(t))return"";
      let fen=t;if(!/\s/.test(fen))fen+=" w - - 0 1";
      try{const c=new Chess();if(c.validate_fen(fen).valid)return fen}catch(e){}
      return"";
    }
    function useFen(fen){
      let s=slide();if(s.stage!=="content"){s=addContent();if(!s)return}
      if(s.hasImg){idbDel(s.id);delete IMG[s.id];s.hasImg=false}
      s.fen=fen;s.last=null;save();refresh();
    }
    function movesToSlides(pgn,from,to,every){
      const c=new Chess();let ok=false;try{ok=c.load_pgn(String(pgn||"").trim(),{sloppy:true})}catch(e){}
      if(!ok)return{ok:false,error:"Could not read this PGN. Paste the full game including the moves."};
      const hist=c.history({verbose:true}),hd=c.header(),start=hd.FEN&&c.validate_fen(hd.FEN).valid?hd.FEN:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      if(!hist.length)return{ok:false,error:"No moves found in this PGN."};
      const g=new Chess(start),fens=[start],mv=[];
      for(const m of hist){const r=g.move({from:m.from,to:m.to,promotion:m.promotion});if(!r)break;mv.push(r);fens.push(g.fen())}
      from=clampN(Math.round(+from)||1,1,mv.length);to=clampN(Math.round(+to)||mv.length,from,mv.length);every=clampN(Math.round(+every)||1,1,20);
      const plies=[];for(let p=from;p<=to;p+=every)plies.push(p);if(plies[plies.length-1]!==to&&plies.length<12)plies.push(to);
      if(plies.length>12)return{ok:false,error:"That would make "+plies.length+" slides. Narrow the range or raise 'every' (12 slides max)."};
      return{ok:true,slides:plies.map(p=>({fen:fens[p],last:{from:mv[p-1].from,to:mv[p-1].to},title:"Move "+Math.ceil(p/2)+(p%2?"":" (Black)"),text:mv[p-1].san,flip:false})),meta:hd};
    }
    function addSlidesFrom(list){
      const room=30-P.slides.length;if(room<list.length){say("Only "+room+" more slides fit in a carousel.","err");list=list.slice(0,Math.max(0,room))}
      list.forEach(o=>{const at=ctaIndex();P.slides.splice(at,0,mkSlide("content",o));sel=at});save();refresh();
    }

    /* ----- annotate on the preview ----- */
    function pt(e){const r=Qh("[data-prev]").getBoundingClientRect();return{x:clampN((e.clientX-r.left)/r.width,0,1),y:clampN((e.clientY-r.top)/r.height,0,1)}}
    function bindPreview(){
      const cv=Qh("[data-prev]");let start=null;
      cv.addEventListener("pointerdown",e=>{
        if(tab!=="annotate"||T.mode==="select")return;e.preventDefault();const p=pt(e),s=slide();
        if(T.mode==="text"||T.mode==="sticker"){
          const g=T.mode==="text"?String(T.text||"").slice(0,40):T.sticker;if(!g)return;
          s.notes.push({t:T.mode==="text"?"t":"s",x:p.x,y:p.y,g:g,size:T.mode==="text"?.06:.09,c:T.color});save();refresh(true);return;
        }
        start=p;try{cv.setPointerCapture(e.pointerId)}catch(x){}
      });
      cv.addEventListener("pointermove",e=>{
        if(!start)return;const p=pt(e);
        T.draft=T.mode==="arrow"?{t:"a",x1:start.x,y1:start.y,x2:p.x,y2:p.y,c:T.color}:{t:"o",x:start.x,y:start.y,r:Math.hypot(p.x-start.x,(p.y-start.y)*dims()[1]/dims()[0]),c:T.color};
        draw();
      });
      const end=e=>{
        if(!start)return;const d=T.draft;start=null;T.draft=null;
        if(d){const big=d.t==="a"?Math.hypot(d.x2-d.x1,d.y2-d.y1)>.02:d.r>.012;if(big){slide().notes.push(d);save()}}
        refresh(true);
      };
      cv.addEventListener("pointerup",end);cv.addEventListener("pointercancel",end);
      cv.addEventListener("dragover",e=>{if(e.dataTransfer&&Array.from(e.dataTransfer.types||[]).indexOf("Files")>=0)e.preventDefault()});
      cv.addEventListener("drop",e=>{const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f&&/^image\//.test(f.type)){e.preventDefault();putImage(f)}});
    }

    /* ----- panels ----- */
    const field=(label,node,id)=>{const w=el("div",{class:"lc32-f"});w.append(el("label",{text:label,for:id||null}),node);return w};
    const inp=(id,val,max,on,ph)=>el("input",{type:"text",id:id,value:val,maxlength:String(max),placeholder:ph||"",oninput:e=>on(e.target.value)});
    const area=(id,val,max,on,rows,ph)=>{const a=el("textarea",{id:id,maxlength:String(max),rows:String(rows||3),placeholder:ph||"",oninput:e=>on(e.target.value)});a.value=val;return a};
    const btn=(text,cls,on,id,dis)=>el("button",{type:"button",class:"btn "+(cls||"btn-ghost")+" btn-sm",id:id||null,text:text,disabled:dis?true:null,onclick:on});
    const live_=()=>{draw();clearTimeout(live_.t);live_.t=setTimeout(thumbs,160)};

    function panel(){
      const p=Qh("[data-panel]");const keepScroll=p.scrollTop;p.textContent="";
      if(tab==="slide")slidePanel(p);else if(tab==="annotate")annotatePanel(p);else if(tab==="library")libraryPanel(p);else if(tab==="ai")aiPanel(p);else audioPanel(p);
      p.scrollTop=keepScroll;
    }
    function slidePanel(p){
      const s=slide(),isC=s.stage==="content";
      const brandSel=el("select",{id:"lc32-sbrand","aria-label":"Slide brand style",onchange:e=>{s.brand=e.target.value;save();refresh(true)}},el("option",{value:"",text:"Same as carousel"}));
      BRANDS.forEach(o=>brandSel.append(el("option",{value:o.id,text:o.name,selected:o.id===s.brand||null})));
      p.append(el("h4",{class:"lc32-h",text:s.stage==="hook"?"Slide 1: the hook":s.stage==="cta"?"Final slide: the call to action":"Content slide "+sel}),
        field(s.stage==="hook"?"Hook text":"Title",area("lc32-t",s.title,160,v=>{s.title=v;save();live_()},2),"lc32-t"),
        field(s.stage==="hook"?"Second line (optional)":s.stage==="cta"?"Message":"Caption",area("lc32-x",s.text,700,v=>{s.text=v;save();live_()},s.stage==="cta"?4:3),"lc32-x"));
      if(s.stage==="cta")p.append(field("Button text (optional)",inp("lc32-b",s.btn,40,v=>{s.btn=v;save();live_()},"Comment 'APP'"),"lc32-b"));
      p.append(field("Look",brandSel,"lc32-sbrand"));
      if(s.stage==="hook")p.append(el("p",{class:"small muted",text:"Open Library to pick a hook from the Hook & Idea Library, or write your own."}));
      if(s.stage==="cta")p.append(el("p",{class:"small muted",text:"Open Library for ready-made CTAs. [REFERRAL_LINK] is replaced with your tracking link."}));
      if(isC){
        const file=el("input",{type:"file",accept:"image/*",id:"lc32-file","aria-label":"Choose an image",onchange:async e=>{const f=e.target.files&&e.target.files[0];if(f)await putImage(f);e.target.value=""}});
        p.append(el("h4",{class:"lc32-h",text:"Board or screenshot"}),
          el("div",{class:"lc32-row"},btn("Paste from clipboard","btn-primary",pasteButton,"lc32-pastebtn"),file),
          el("p",{class:"small muted",text:"Copy a diagram from Chess.com, Lichess or your phone, click here and press Ctrl+V. You can also drop a file on the slide."}));
        if(s.hasImg){
          const fit=el("select",{id:"lc32-fit","aria-label":"Image fit",onchange:e=>{s.fit=e.target.value;save();refresh(true)}});
          [["contain","Fit whole image"],["cover","Fill the frame"]].forEach(o=>fit.append(el("option",{value:o[0],text:o[1],selected:o[0]===s.fit||null})));
          p.append(el("div",{class:"lc32-row"},fit,btn("Remove image","btn-quiet",()=>{idbDel(s.id);delete IMG[s.id];s.hasImg=false;save();refresh()},"lc32-rmimg")));
        }
        const fen=inp("lc32-fen",s.fen,100,()=>{}, "Paste a FEN to draw the board");
        p.append(field("Or load a position (FEN)",el("div",{class:"lc32-row"},fen,btn("Load","btn-ghost",()=>{const f=fenFrom(fen.value);if(!f){status("That FEN is not valid.","err");return}useFen(f)},"lc32-loadfen"))),
          el("label",{class:"lc32-chk"},el("input",{type:"checkbox",id:"lc32-flip",checked:s.flip||null,onchange:e=>{s.flip=e.target.checked;save();refresh(true)}}),"Black at the bottom"));
        const pgn=area("lc32-pgn","",20000,()=>{},4,"Paste a PGN to build a move-by-move progression");
        const n1=el("input",{type:"number",id:"lc32-from",min:"1",value:"1","aria-label":"From ply"}),n2=el("input",{type:"number",id:"lc32-to",min:"1",placeholder:"end","aria-label":"To ply"}),n3=el("input",{type:"number",id:"lc32-every",min:"1",value:"2","aria-label":"Every n plies"});
        p.append(el("h4",{class:"lc32-h",text:"Progressions"}),pgn,
          el("div",{class:"lc32-row lc32-nums"},el("span",{class:"small muted",text:"from ply"}),n1,el("span",{class:"small muted",text:"to"}),n2,el("span",{class:"small muted",text:"every"}),n3),
          el("div",{class:"lc32-row"},btn("Add move-by-move slides","btn-primary",()=>{const r=movesToSlides(pgn.value,n1.value,n2.value,n3.value);if(!r.ok){status(r.error,"err");return}addSlidesFrom(r.slides);status(r.slides.length+" slides added before the call to action.")},"lc32-addmoves")));
        const list=area("lc32-puz","",4000,()=>{},3,"One FEN per line. Add a caption after a | sign.");
        p.append(list,el("div",{class:"lc32-row"},btn("Add puzzle slides","btn-ghost",()=>{
          const out=[];String(list.value).split("\n").forEach(ln=>{const [a,b]=ln.split("|"),f=fenFrom(a||"");if(f)out.push({fen:f,title:"Puzzle "+(out.length+1),text:(b||"").trim().slice(0,200)})});
          if(!out.length){status("No valid FEN found. Put one position on each line.","err");return}addSlidesFrom(out.slice(0,12));status(out.length+" puzzle slides added.")},"lc32-addpuz")));
        p.append(el("div",{class:"lc32-row"},btn("Duplicate","btn-quiet",dupSlide,"lc32-dup"),btn("Move up","btn-quiet",()=>moveSlide(-1),"lc32-up",sel<=1),btn("Move down","btn-quiet",()=>moveSlide(1),"lc32-down",sel>=ctaIndex()-1),btn("Delete slide","btn-quiet",delSlide,"lc32-del")));
      }else p.append(el("div",{class:"lc32-row"},btn("+ Add content slide","btn-primary",()=>{addContent();refresh()},"lc32-addc")));
      if(isC)p.append(el("div",{class:"lc32-row"},btn("+ Add content slide","btn-ghost",()=>{addContent();refresh()},"lc32-addc")));
    }
    function annotatePanel(p){
      const s=slide();
      const tools=el("div",{class:"seg",role:"group","aria-label":"Annotation tool"});
      [["arrow","Arrow"],["circle","Circle"],["text","Text"],["sticker","Sticker"]].forEach(x=>tools.append(el("button",{type:"button","data-tool":x[0],"aria-pressed":String(T.mode===x[0]),text:x[1],onclick:()=>{T.mode=x[0];refresh(true)}})));
      const cols=el("div",{class:"lc32-cols",role:"group","aria-label":"Colour"});
      COLORS.forEach(c=>cols.append(el("button",{type:"button",class:"lc32-sw","data-color":c[0],"aria-label":c[1],"aria-pressed":String(T.color===c[0]),style:"background:"+c[0],onclick:()=>{T.color=c[0];refresh(true)}})));
      p.append(el("h4",{class:"lc32-h",text:"Annotate slide "+(sel+1)}),tools,cols);
      if(T.mode==="text")p.append(field("Text to place",inp("lc32-ntext",T.text,40,v=>{T.text=v}),"lc32-ntext"));
      if(T.mode==="sticker"){const g=el("div",{class:"lc32-stk"});STICKERS.forEach(x=>g.append(el("button",{type:"button","data-sticker":x,"aria-pressed":String(T.sticker===x),text:x,onclick:()=>{T.sticker=x;refresh(true)}})));p.append(g)}
      p.append(el("div",{class:"lc32-row"},btn("Undo","btn-ghost",()=>{s.notes.pop();save();refresh(true)},"lc32-undo",!s.notes.length),btn("Clear all","btn-quiet",()=>{s.notes=[];save();refresh(true)},"lc32-clear",!s.notes.length)),
        el("p",{class:"small muted",text:s.notes.length+(s.notes.length===1?" annotation":" annotations")+" on this slide."}));
    }
    function libraryPanel(p){
      const sub=el("div",{class:"seg",role:"tablist"});
      [["hooks","Hooks & Ideas"],["assets","Content & Assets"],["ctas","CTAs"]].forEach(x=>sub.append(el("button",{type:"button","data-lib":x[0],"aria-pressed":String(libTab===x[0]),text:x[1],onclick:()=>{libTab=x[0];libCat="all";refresh(true)}})));
      const all=libAll(libTab),cats=["all"].concat(Array.from(new Set(all.map(x=>x.cat))));
      const chips=el("div",{class:"lc32-chips"});cats.forEach(c=>chips.append(el("button",{type:"button",class:"chip","data-cat":c,"aria-pressed":String(libCat===c),text:c==="all"?"All":c,onclick:()=>{libCat=c;refresh(true)}})));
      const search=el("input",{type:"search",id:"lc32-lq",placeholder:"Search",value:libQ,"aria-label":"Search the library",oninput:e=>{libQ=e.target.value;listFill()}});
      const list=el("div",{class:"lc32-lib"});
      function listFill(){
        list.textContent="";const q=libQ.toLowerCase();
        all.filter(x=>(libCat==="all"||x.cat===libCat)&&(!q||x.text.toLowerCase().indexOf(q)>=0||x.cat.indexOf(q)>=0)).forEach(x=>{
          const row=el("div",{class:"lc32-li","data-id":x.id});
          if(libTab==="assets"&&x.cat==="background"){
            const b=brandOf(x.text);row.append(el("span",{class:"lc32-bgsw",style:"background:linear-gradient(135deg,"+b.bg[0]+","+b.bg[1]+");border-color:"+b.accent}),el("b",{text:b.name}),btn("Use on this slide","btn-ghost",()=>{slide().brand=b.id;save();refresh(true)}),btn("Use on all","btn-quiet",()=>{P.brand=b.id;P.slides.forEach(s=>s.brand="");save();refresh()}));
          }else{
            row.append(el("span",{class:"pill",text:x.cat}),el("span",{class:"lc32-lt",text:mergeText(x.text)}));
            const acts=el("div",{class:"lc32-la"});
            if(libTab==="hooks")acts.append(btn("Use as hook","btn-primary",()=>{P.slides[0].title=x.text;sel=0;save();tab="slide";refresh()},null));
            else if(libTab==="ctas")acts.append(btn("Use as CTA","btn-primary",()=>{const c=P.slides[ctaIndex()];c.text=x.text;sel=ctaIndex();save();tab="slide";refresh()},null));
            else acts.append(btn("Open in AI prompts","btn-primary",()=>{aiSeed=x.text;tab="ai";refresh()},null));
            acts.append(btn("Copy","btn-quiet",()=>copy(mergeText(x.text)),null));
            if(x.own)acts.append(btn("Delete","btn-quiet",()=>{libDel(libTab,x.id);refresh(true)},null));
            row.append(acts);
          }
          list.append(row);
        });
        if(!list.children.length)list.append(el("p",{class:"small muted",text:"Nothing matches."}));
      }
      listFill();
      const addT=el("textarea",{id:"lc32-ladd",rows:"2",maxlength:"600",placeholder:"Add your own to this library"}),addC=el("input",{type:"text",id:"lc32-lcat",placeholder:"category",maxlength:"20",value:libTab==="hooks"?"mine":libTab==="ctas"?"mine":"prompt"});
      p.append(sub,chips,search,list,el("div",{class:"lc32-add"},addT,addC,btn("Save to library","btn-ghost",()=>{if(!libAdd(libTab,addC.value||"mine",addT.value)){status("Write at least a few words first.","err");return}refresh(true)},"lc32-lsave")),
        el("p",{class:"small muted",text:"Your own items stay on this device. The admin can add shared items to the library through content.json (key carouselLibs)."}));
    }
    let aiSeed="",aiOut=[];
    function aiPanel(p){
      const topic=el("input",{type:"text",id:"lc32-aitopic",placeholder:"What is the slide about? e.g. hanging queen on move 12",maxlength:"140",value:aiSeed&&aiSeed.length<140?"":""}),style=el("select",{id:"lc32-aistyle","aria-label":"Style"});
      PROMPT_STYLES.forEach(o=>style.append(el("option",{value:o[0],text:o[0][0].toUpperCase()+o[0].slice(1)})));
      const out=el("div",{class:"lc32-lib"});
      const paintOut=()=>{out.textContent="";aiOut.forEach((t,i)=>out.append(el("div",{class:"lc32-li"},el("span",{class:"lc32-lt",text:t}),el("div",{class:"lc32-la"},btn("Copy","btn-primary",()=>copy(t),null),btn("Save to library","btn-quiet",()=>{libAdd("assets","prompt",t)?say("Saved to Content & Assets","ok",1600):0},null)))))};
      const gen=()=>{
        const sd=PROMPT_STYLES.filter(x=>x[0]===style.value)[0][1],t=(topic.value||"a chess position").trim().slice(0,140),ar=P.size==="9:16"?"9:16 vertical":P.size==="1:1"?"1:1 square":"4:5 vertical",b=brandOf(slide().brand||P.brand);
        aiOut=[
          "Background for a chess carousel slide about "+t+": "+sd+", palette "+b.bg[0]+" and "+b.accent+", empty space in the centre for text and a board screenshot, "+ar+", no text, no watermark",
          "Hero illustration for the hook slide: "+t+", one dramatic chess piece, "+sd+", room for a big headline at the top, "+ar+", no text",
          "Subtle textured backdrop (chessboard grid, soft glow in "+b.accent+") for a caption slide about "+t+", "+sd+", "+ar+", no text"
        ];paintOut();
      };
      if(aiSeed){aiOut=[aiSeed];paintOut()}
      p.append(el("h4",{class:"lc32-h",text:"AI image prompt generator"}),field("Topic",topic,"lc32-aitopic"),field("Style",style,"lc32-aistyle"),
        el("div",{class:"lc32-row"},btn("Generate prompts","btn-primary",gen,"lc32-aigen")),out,
        el("p",{class:"small muted",text:"These are prompts for your image tool (Midjourney, DALL·E, Canva and so on). Nothing is generated here. Paste the picture back into a slide with Ctrl+V."}));
    }
    function copy(t){
      const done=()=>say("Copied","ok",1200);
      try{navigator.clipboard.writeText(String(t)).then(done,()=>fallbackCopy(t,done))}catch(e){fallbackCopy(t,done)}
    }
    function fallbackCopy(t,done){const a=document.createElement("textarea");a.value=t;a.style.cssText="position:fixed;left:-9999px";document.body.append(a);a.select();try{document.execCommand("copy");done()}catch(e){}a.remove()}

    /* ----- audio: music or the Coach Lanckriet voice ----- */
    const ctx=()=>{if(!V.actx){const AC=window.AudioContext||window.webkitAudioContext;V.actx=new AC()}if(V.actx.state==="suspended")V.actx.resume().catch(()=>{});return V.actx};
    const texts=()=>P.slides.map(narrOf);
    const clipOf=s=>{const c=V.clips[s.id];return c&&c.text===narrOf(s)?c:null};
    const durOf=s=>{const c=P.audio.mode==="voice"?clipOf(s):null;return c?Math.max(2.5,c.dur+.7):P.secPer};
    async function quote(){
      const t=texts();if(!t.some(x=>x.length>=2)){V.quote=null;status("There is no text to read yet.","err");panel();return null}
      busy="quote";panel();
      const r=await voiceCall({texts:t,dry:true});busy="";
      if(r&&r.ok){V.quote=r;try{Quota._t.apply(r.state)}catch(e){}status("");panel();return r}
      V.quote=null;status(voiceWhy(r),"err");panel();return null;
    }
    async function generate(){
      const t=texts();let q=V.quote;
      if(!q||q.sig!==t.join("\u0001")){V.arm=false;q=await quote();if(!q)return;q.sig=t.join("\u0001")}
      let have=Infinity,st=q.state||{};
      try{if(Quota.unlimited())have=Infinity;else{have=Quota.leftNow()+Quota.bonusNow();st={left:Quota.leftNow(),bonus:Quota.bonusNow()}}}catch(e){have=st.unlimited?Infinity:(st.left|0)+(st.bonus|0)}
      if(q.cost>0&&q.cost>have){V.arm=false;status(voiceWhy({reason:"token_limit",needed:q.cost,state:st}),"err");panel();return}
      if(q.cost>0&&!V.arm){V.arm=true;panel();status("This will use "+q.cost+" token"+(q.cost===1?"":"s")+": free daily tokens first, then purchased. Press Confirm.");return}
      V.arm=false;busy="voice";panel();status("Making the voice-over…");
      V.ref=V.ref||"cv"+uid();
      const r=await voiceCall({texts:t,ref:V.ref});
      if(!(r&&r.ok&&Array.isArray(r.clips))){busy="";status(voiceWhy(r),"err");try{if(r&&r.state)Quota._t.apply(r.state)}catch(e){}panel();return}
      try{
        const c=ctx();
        for(const cl of r.clips){
          const s=P.slides[cl.i];if(!s||!cl.audio)continue;
          const buf=await c.decodeAudioData(b64buf(cl.audio));
          V.clips[s.id]={buf:buf,dur:buf.duration,text:t[cl.i]};
        }
        V.ref="";try{Quota._t.apply(r.state)}catch(e){}
        busy="";V.quote=null;
        status(r.cost>0?"Voice-over ready. "+r.cost+" token"+(r.cost===1?"":"s")+" used ("+(r.fromDaily|0)+" daily, "+(r.fromBonus|0)+" purchased).":"Voice-over ready. Nothing was charged: that text was already made.");
        say("Voice-over ready","ok",1800);
      }catch(e){busy="";status("The audio came back but could not be decoded: "+(e&&e.message||"unknown error")+". Your tokens are safe: try again, the same text is not charged twice.","err")}
      refresh();
    }
    function stopPlay(){V.stop=true;V.playing=false;try{(V.srcs||[]).forEach(s=>{try{s.stop()}catch(e){}})}catch(e){}V.srcs=[];if(V.musicEl){V.musicEl.pause()}panel()}
    async function play(){
      if(V.playing){stopPlay();return}
      V.stop=false;V.playing=true;V.srcs=[];panel();const c=ctx();
      if(P.audio.mode==="music"&&V.music&&V.music.url){if(!V.musicEl){V.musicEl=new Audio();V.musicEl.loop=true}V.musicEl.src=V.music.url;V.musicEl.volume=P.audio.vol;try{await V.musicEl.play()}catch(e){}}
      for(let i=0;i<P.slides.length&&!V.stop;i++){
        sel=i;thumbs();draw();hint();
        const s=P.slides[i],cl=P.audio.mode==="voice"?clipOf(s):null;
        if(cl){const src=c.createBufferSource();src.buffer=cl.buf;src.connect(c.destination);src.start();V.srcs.push(src)}
        await sleep(durOf(s)*1000);
      }
      if(V.musicEl)V.musicEl.pause();V.playing=false;V.stop=false;panel();
    }
    function audioPanel(p){
      const A=P.audio;
      const radios=el("div",{class:"seg",role:"group","aria-label":"Audio"});
      [["none","No audio"],["music","Background music"],["voice","AI voice-over"]].forEach(x=>radios.append(el("button",{type:"button","data-audio":x[0],"aria-pressed":String(A.mode===x[0]),text:x[1],onclick:()=>{A.mode=x[0];save();refresh(true)}})));
      p.append(el("h4",{class:"lc32-h",text:"Audio for this carousel"}),radios);
      p.append(field("Seconds per slide (video)",el("input",{type:"range",id:"lc32-sec",min:"2",max:"12",step:"1",value:String(P.secPer),oninput:e=>{P.secPer=+e.target.value;save();const o=Qh("#lc32-sec-o");if(o)o.textContent=P.secPer+" s"}}),"lc32-sec"),el("span",{class:"small muted",id:"lc32-sec-o",text:P.secPer+" s"}));
      if(A.mode==="music"){
        const f=el("input",{type:"file",accept:"audio/*",id:"lc32-music","aria-label":"Choose a music file",onchange:e=>{const file=e.target.files&&e.target.files[0];if(!file)return;if(file.size>40e6){status("That file is larger than 40 MB.","err");return}if(V.music&&V.music.url)URL.revokeObjectURL(V.music.url);V.music={url:URL.createObjectURL(file),name:file.name.slice(0,80),file:file};A.musicName=V.music.name;save();refresh(true)}});
        p.append(f,el("p",{class:"small",text:V.music?"Loaded: "+V.music.name:(A.musicName?"Choose "+A.musicName+" again: audio files are not kept between visits.":"Choose a music file from your device.")}),
          field("Music volume",el("input",{type:"range",id:"lc32-vol",min:"0",max:"1",step:"0.05",value:String(A.vol),oninput:e=>{A.vol=+e.target.value;save();if(V.musicEl)V.musicEl.volume=A.vol}}),"lc32-vol"),
          el("p",{class:"small muted",text:"Use music you own or have a licence for. The hub does not clear rights for you."}));
      }
      if(A.mode==="voice"){
        const total=texts().reduce((n,x)=>n+x.length,0);
        p.append(el("p",{class:"small",html:"<b>Coach Lanckriet AI voice.</b> Price: <b>1 token per 1,000 characters</b> of new audio. Text that was already made is free. Free daily tokens are used first, then purchased tokens."}));
        P.slides.forEach((s,i)=>{
          const ta=el("textarea",{rows:"2",maxlength:"1100","data-narr":String(i),"aria-label":"Narration for slide "+(i+1),placeholder:"Read: "+[s.title,s.text].filter(Boolean).join(". ").slice(0,90),oninput:e=>{s.narration=e.target.value;save();const c=Qh('[data-nc="'+i+'"]');if(c)c.textContent=narrOf(s).length+" characters"}});ta.value=s.narration||"";
          p.append(el("div",{class:"lc32-nv"},el("div",{class:"lc32-nh"},el("b",{text:"Slide "+(i+1)}),el("span",{class:"small muted","data-nc":String(i),text:narrOf(s).length+" characters"}),el("span",{class:"pill",text:clipOf(s)?"Ready "+clipOf(s).dur.toFixed(1)+" s":"No audio yet"})),ta));
        });
        const q=V.quote;
        p.append(el("div",{class:"lc32-quote",id:"lc32-quote",role:"status"},q?"Needs "+q.chars+" characters ("+q.newChars+" new): "+q.cost+" token"+(q.cost===1?"":"s")+". You have "+(q.state.unlimited?"unlimited":(q.state.left|0))+" free daily and "+(q.state.bonus|0)+" purchased.":"Total "+total+" characters. Press Check price."));
        p.append(el("div",{class:"lc32-row"},btn("Check price","btn-ghost",()=>quote(),"lc32-quote-btn",!!busy),
          btn(V.arm&&V.quote?"Confirm: use "+V.quote.cost+" token"+(V.quote.cost===1?"":"s"):(V.quote&&V.quote.cost===0?"Make voice-over (free)":"Make voice-over"),"btn-primary",()=>generate(),"lc32-gen",!!busy)));
      }
      if(A.mode!=="none")p.append(el("div",{class:"lc32-row"},btn(V.playing?"Stop preview":"Play preview","btn-ghost",()=>play(),"lc32-play")));
    }

    /* ----- exports: PNG slides and a WebM video with the audio mixed in ----- */
    const blobOf=cv=>new Promise(r=>cv.toBlob(r,"image/png"));
    async function exportPng(share){
      const [W,H]=dims();busy="png";bar();status("Rendering slides…");settleGuard();
      try{
        const files=[];
        for(let i=0;i<P.slides.length;i++){const b=await blobOf(renderSlide(P,i,W,H));files.push(new File([b],"lanckrietchess-carousel-"+String(i+1).padStart(2,"0")+".png",{type:"image/png"}))}
        if(share&&navigator.canShare&&navigator.canShare({files:files})){try{await navigator.share({files:files,title:P.title||"Carousel"});return}catch(e){if(e&&e.name==="AbortError")return}}
        for(const f of files){const a=document.createElement("a");a.href=URL.createObjectURL(f);a.download=f.name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4e3);await sleep(260)}
        status(files.length+" slides downloaded.");say(files.length+" slides downloaded","ok",2200);
        return files.map(f=>f.name);
      }finally{busy="";bar()}
    }
    const pickMime=()=>{const c=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"];if(!window.MediaRecorder)return"";return c.filter(m=>{try{return MediaRecorder.isTypeSupported(m)}catch(e){return false}})[0]||""};
    async function exportVideo(opts){
      opts=opts||{};
      if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){status("This browser cannot record video. Download the PNG slides instead.","err");return null}
      const [W0,H0]=dims(),k=opts.scale||1,W=Math.round(W0*k),H=Math.round(H0*k);
      const mode=P.audio.mode;
      if(mode==="voice"&&!P.slides.some(s=>clipOf(s))){status("Make the voice-over first (Audio tab), or switch audio off.","err");return null}
      if(mode==="music"&&!(V.music&&V.music.file)){status("Choose a music file first (Audio tab), or switch audio off.","err");return null}
      busy="video";bar();V.cancel=false;settleGuard();
      const cv=document.createElement("canvas");cv.width=W;cv.height=H;const g=cv.getContext("2d");
      const stream=cv.captureStream(30);
      let c=null,dest=null,musicSrc=null;
      try{
        if(mode!=="none"){c=ctx();dest=c.createMediaStreamDestination();dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t))}
        const durs=P.slides.map(s=>mode==="voice"?(clipOf(s)?Math.max(2.5,clipOf(s).dur+.7):P.secPer):P.secPer).map(d=>opts.fast?Math.min(d,opts.fast):d);
        const total=durs.reduce((a,b)=>a+b,0);
        const frames=P.slides.map((s,i)=>renderSlide(P,i,W,H));
        const mime=pickMime(),rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:5e6}:{}),chunks=[];
        rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
        const done=new Promise(r=>{rec.onstop=r});
        g.drawImage(frames[0],0,0);rec.start(400);
        const t0=c?c.currentTime+.15:0;let off=0;
        if(c){
          if(mode==="voice")P.slides.forEach((s,i)=>{const cl=clipOf(s);if(cl){const src=c.createBufferSource();src.buffer=cl.buf;src.connect(dest);src.start(t0+off+.2)}off+=durs[i]});
          if(mode==="music"){const buf=await c.decodeAudioData(await V.music.file.arrayBuffer());musicSrc=c.createBufferSource();musicSrc.buffer=buf;musicSrc.loop=true;const gn=c.createGain();gn.gain.value=P.audio.vol;musicSrc.connect(gn);gn.connect(dest);musicSrc.start(t0)}
        }
        const start=performance.now();let shown=-1;
        await new Promise(res=>{
          const tick=()=>{
            if(V.cancel){res();return}
            const el_=(performance.now()-start)/1000;let acc=0,idx=0;for(;idx<durs.length;idx++){if(el_<acc+durs[idx])break;acc+=durs[idx]}
            if(idx>=durs.length){res();return}
            if(idx!==shown){shown=idx;g.drawImage(frames[idx],0,0);status("Recording slide "+(idx+1)+" of "+durs.length+"…")}
            else g.drawImage(frames[idx],0,0,1,1,0,0,1,1);   // keeps the stream producing frames
            setTimeout(tick,60);
          };tick();
        });
        rec.stop();await done;
        try{if(musicSrc)musicSrc.stop()}catch(e){}
        if(V.cancel){status("Video cancelled.");return null}
        const blob=new Blob(chunks,{type:mime||"video/webm"});
        if(blob.size<1000){status("The video came out empty. Try the PNG slides.","err");return null}
        const name="lanckrietchess-carousel.webm";
        if(!opts.noDownload){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4e3)}
        status("Video saved ("+(blob.size/1048576).toFixed(1)+" MB, "+Math.round(total)+" s).");say("Video saved","ok",2200);
        return{blob:blob,seconds:total,hasAudio:mode!=="none",name:name};
      }catch(e){console.error(e);status("The video could not be made: "+(e&&e.message||"unknown error"),"err");return null}
      finally{busy="";bar()}
    }

    /* ----- boot ----- */
    function dispose(){
      if(!alive)return;alive=false;document.removeEventListener("paste",onPaste);
      try{stopPlay()}catch(e){}try{V.cancel=true}catch(e){}
      if(live&&live.host===host)live=null;
    }
    document.addEventListener("paste",onPaste);
    try{if(typeof Studio!=="undefined"&&Studio._t&&Studio._t.Guard)Studio._t.Guard.warm()}catch(e){}
    bindPreview();refresh();
    restoreImages(P).then(()=>{if(alive){thumbs();draw()}});
    const api={host:host,dispose:dispose,project:()=>P,select:i=>{sel=clampN(i,0,P.slides.length-1);refresh()},tab:t=>{tab=t;T.mode=t==="annotate"?(T.mode==="select"?"arrow":T.mode):"select";refresh(true)},render:(i,W,H,o)=>renderSlide(P,i,W,H,o),
      exportPng:exportPng,exportVideo:exportVideo,quote:quote,generate:generate,voice:V,putImage:putImage,addSlidesFrom:addSlidesFrom,movesToSlides:movesToSlides,refresh:refresh,cancel:()=>{V.cancel=true},
      selected:()=>sel};
    return api;
  }
  function mountCarousel(host){
    if(!host)return null;
    if(live&&live.host===host&&host.isConnected&&host.querySelector(".lc32-cb"))return live;
    if(live)live.dispose();
    live=builder(host);return live;
  }
  function afterPartner(view,pTab){
    const host=Q("[data-lc32-host]",view);
    if(pTab==="carousel"&&host)mountCarousel(host);
    else if(live&&!live.host.isConnected)live.dispose();
  }
  let started=false;
  function init(){if(started)return;started=true;layout.init();pm.watch()}
  return{VERSION:VERSION,init:init,pm:pm,layout:layout,step:layout.step,afterPartner:afterPartner,mountCarousel:mountCarousel,builder:()=>live,
    _t:{renderSlide:renderSlide,libAll:libAll,libAdd:libAdd,mergeText:mergeText,cleanProject:cleanProject,newProject:newProject,voiceWhy:voiceWhy,narrOf:narrOf,BRANDS:BRANDS,brandOf:brandOf,SEED:SEED,ingestImage:ingestImage,IMG:IMG}};
})();
