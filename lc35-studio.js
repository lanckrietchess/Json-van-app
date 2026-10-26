/* ---------- LC35 (9.13.0): Creator Studio Content Hub, cloud export, Clip Archiver and variant remixer. Inside the Studio closure. ---------- */
const LC35S_CSS=`
#lc35-hub{position:absolute;inset:0;z-index:80;display:flex;flex-direction:column;background:rgba(7,9,12,.97);backdrop-filter:blur(10px)}
#lc35-hub[hidden]{display:none}
.lc35-top{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:12px 16px;border-bottom:1px solid rgba(0,229,255,.2)}
.lc35-top h2{margin:0;font-size:18px;margin-right:auto}
.lc35-use{display:flex;flex-direction:column;gap:3px;min-width:190px;font-size:12px;color:var(--fog,#8DA2B3)}
.lc35-use i{display:block;height:6px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}
.lc35-use b{display:block;height:100%;background:#00E5FF;border-radius:99px}
.lc35-body{flex:1;overflow:auto;padding:14px 16px;display:grid;gap:12px;align-content:start;grid-template-columns:repeat(auto-fill,minmax(330px,1fr))}
.lc35-empty{grid-column:1/-1;text-align:center;color:var(--fog,#8DA2B3);padding:40px 10px}
.lc35-card{border:1px solid rgba(0,229,255,.2);border-radius:14px;padding:12px;background:rgba(255,255,255,.03);display:grid;gap:9px;min-width:0}
.lc35-card h3{margin:0;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lc35-meta{display:flex;flex-wrap:wrap;gap:6px;font-size:12px;color:var(--fog,#8DA2B3)}
.lc35-meta span{padding:2px 8px;border-radius:99px;border:1px solid rgba(255,255,255,.14)}
.lc35-sts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;align-items:stretch}
.lc35-pl{display:grid;gap:4px;justify-items:stretch}
.lc35-st{display:grid;gap:2px;justify-items:center;align-content:center;height:100%;padding:7px 4px;border-radius:10px;border:1.5px solid;background:rgba(0,0,0,.25);cursor:pointer;color:inherit;font:inherit;font-size:12px}
.lc35-st .d{width:12px;height:12px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}
.lc35-st b{font-weight:600}.lc35-st em{font-style:normal;font-size:11px;opacity:.9}
.lc35-st[data-st=red]{color:#fb7185;border-color:rgba(251,113,133,.6)}
.lc35-st[data-st=orange]{color:#fb923c;border-color:rgba(251,146,60,.7)}
.lc35-st[data-st=green]{color:#22c55e;border-color:rgba(34,197,94,.7)}
.lc35-st:focus-visible{outline:2px solid #00E5FF;outline-offset:2px}
.lc35-pl a{font-size:11px;text-align:center;color:var(--fog,#8DA2B3)}
.lc35-act{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.lc35-drag{cursor:grab;display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:10px;border:1px dashed rgba(0,229,255,.6);color:#7ee9ff;font-size:12px;user-select:none}
.lc35-drag[aria-disabled=true]{opacity:.45;cursor:not-allowed}
.lc35-card video{width:100%;max-height:260px;border-radius:10px;background:#000}
.lc35-trash{margin-left:auto;font-weight:700;border:1.5px solid #ef4444;color:#fecaca;background:rgba(239,68,68,.12)}
.lc35-trash:not([disabled]):hover{background:rgba(239,68,68,.3)}
.lc35-trash[disabled]{opacity:.4;cursor:not-allowed;border-color:rgba(255,255,255,.2);color:inherit;background:transparent}
.lc35-trash.arm{background:#b91c1c;color:#fff;border-color:#fecaca}
.lc35-hint{font-size:12px;color:var(--fog,#8DA2B3);margin:0}
#lc35-proj{margin:10px 0 6px;border-top:1px solid rgba(0,229,255,.18);padding-top:10px}
#lc35-proj .h{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:6px}
#lc35-proj .h b{font-size:13px;margin-right:auto}
.lc35-sw{display:inline-flex;gap:6px;align-items:center;font-size:12.5px}
.lc35-clips{display:flex;gap:8px;overflow:auto;padding:4px 2px 8px}
.lc35-clip{flex:0 0 190px;border:1px solid rgba(0,229,255,.25);border-radius:10px;padding:8px;display:grid;gap:5px;background:rgba(255,255,255,.03)}
.lc35-clip.off{opacity:.45;border-style:dashed}
.lc35-clip.off .nm{text-decoration:line-through}
.lc35-clip .nm{font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lc35-clip .sm{font-size:11px;color:var(--fog,#8DA2B3)}
.lc35-clip select{width:100%;height:26px}
.lc35-clip .bt{display:flex;gap:4px;flex-wrap:wrap}
.lc35-clip .bt button{height:26px;padding:0 8px;font-size:12px}
.lc35-vars{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0}
.lc35-vars button[aria-pressed=true]{background:rgba(0,229,255,.18);border-color:#00E5FF}
.lc35-vform{display:grid;gap:6px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:6px 0}
.lc35-vform input[type=text]{width:100%}
.lc35-prog{height:6px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:6px}
.lc35-prog i{display:block;height:100%;width:0;background:#00E5FF}
`;
const LC35S=(()=>{
  const PL=[["tiktok","TikTok","https://www.tiktok.com/upload"],["instagram","Instagram","https://www.instagram.com/"],["facebook","Facebook","https://www.facebook.com/reels/create"],["youtube","YouTube","https://studio.youtube.com/"]];
  const ST={red:{label:"Skip",long:"Do not post here"},orange:{label:"To do",long:"Still to post or check"},green:{label:"Posted",long:"Published"}};
  const NEXT={orange:"green",green:"red",red:"orange"};
  const PJ_KEY="lc35-project";
  const H={items:[],usage:null,urls:{},loading:false,err:"",open:false,view:{},busy:{},arm:{},denied:false};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const mb=n=>(n/1048576).toFixed(n>=1.05e8?0:1)+" MB";
  const can=()=>{try{return!!((Host.isCreator&&Host.isCreator())||(Host.isAdmin&&Host.isAdmin()))}catch(e){return false}};
  const secret=()=>{try{return String(sessionStorage.getItem("lc-hub-worker-secret")||"")}catch(e){return""}};
  const api=(a,b)=>Quota.call(a,Object.assign({secret:secret()},b||{}));
  const WHY={forbidden:"The Content Hub is for creator and admin accounts.",not_resolved:"Set every platform to Posted or Skip first.",limit_items:"Your library is full. Clear a finished project first.",limit_bytes:"Your cloud space is full. Clear a finished project first.",too_large:"This video is larger than the cloud file limit.",storage_off:"Cloud storage is not connected on the server yet.",storage_error:"The cloud storage did not answer. Nothing was changed.",upload_missing:"The upload did not arrive. Try again.",not_found:"That project no longer exists.",slow_down:"Too many requests. Wait a moment.",network:"No connection. Check your internet.",off:"The server is not connected."};
  const why=r=>WHY[r&&r.reason]||"Something went wrong. Nothing was changed.";
  const fmtOf=(w,hh)=>{const r=(+w||1)/(+hh||1);return Math.abs(r-9/16)<.06?"9:16":Math.abs(r-16/9)<.1?"16:9":Math.abs(r-.8)<.05?"4:5":Math.abs(r-1)<.05?"1:1":""};
  const fileName=it=>{const ext=/webm/.test(it.mime)?"webm":/quicktime/.test(it.mime)?"mov":"mp4";return(String(it.title+(it.variant?"-"+it.variant:"")).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60)||"short")+"."+ext};

  /* ======================= cloud library ======================= */
  async function load(){
    if(!can()){H.denied=true;paint();return}
    H.loading=true;H.err="";H.denied=false;paint();
    const r=await api("content_list",{});
    H.loading=false;
    if(r&&r.ok!==false&&Array.isArray(r.items)){H.items=r.items;H.usage=r.usage}
    else{H.err=why(r);if(r&&r.reason==="forbidden")H.denied=true}
    paint();
    refreshUrls();
  }
  async function refreshUrls(){
    const need=H.items.filter(i=>!H.urls[i.id]||H.urls[i.id].exp<Date.now()+10*6e4).map(i=>i.id).slice(0,30);
    if(!need.length)return;
    const r=await api("content_url",{ids:need});
    if(r&&r.ok&&r.urls){Object.assign(H.urls,r.urls);paint()}
  }
  function putFile(url,blob,onProg){
    return new Promise((res,rej)=>{
      const x=new XMLHttpRequest();x.open("PUT",url);
      const fd=new FormData();fd.append("cacheControl","3600");fd.append("",blob);          /* same body the official client sends to a signed upload URL */
      x.upload.onprogress=e=>{if(e.lengthComputable&&onProg)onProg(e.loaded/e.total)};
      x.onload=()=>x.status>=200&&x.status<300?res():rej(new Error("upload_"+x.status));
      x.onerror=()=>rej(new Error("network"));x.ontimeout=()=>rej(new Error("network"));x.timeout=30*6e4;
      x.send(fd);
    });
  }
  /* blob -> cloud. Returns {ok,item} or {ok:false,reason}. Never throws. */
  async function saveToCloud(blob,o,onProg){
    if(!can())return{ok:false,reason:"forbidden"};
    const mime=String(blob.type||o.mime||"video/mp4").split(";")[0];
    if(H.usage&&blob.size>H.usage.maxFile)return{ok:false,reason:"too_large",limit:H.usage.maxFile};
    const b=await api("content_begin",{title:o.title,fmt:o.fmt||"",variant:o.variant||"",mime:mime,bytes:blob.size,platforms:o.platforms,meta:o.meta});
    if(!(b&&b.ok&&b.upload))return{ok:false,reason:(b&&b.reason)||"network",limit:b&&b.max};
    try{await putFile(b.upload.url,blob,onProg)}
    catch(e){await api("content_delete",{id:b.id});return{ok:false,reason:"network"}}
    const c=await api("content_commit",{id:b.id});
    if(!(c&&c.ok&&c.item)){return{ok:false,reason:(c&&c.reason)||"upload_missing"}}
    H.items.unshift(c.item);if(c.usage)H.usage=c.usage;
    refreshUrls();paint();
    return{ok:true,item:c.item};
  }
  async function setStatus(it,p,state){
    const old=it.platforms[p];it.platforms[p]=state;paint();
    const r=await api("content_update",{id:it.id,platforms:{[p]:state}});
    if(r&&r.ok&&r.item){it.platforms=r.item.platforms}else{it.platforms[p]=old;toast(why(r),"err",3000)}
    paint();
  }
  const resolved=it=>PL.every(p=>it.platforms[p[0]]!=="orange");
  const armed=it=>!!(H.arm[it.id]&&Date.now()-H.arm[it.id]<4e3);
  async function trash(it,btn){
    if(!resolved(it))return;
    if(!armed(it)){H.arm[it.id]=Date.now();paint();setTimeout(paint,4100);return}
    delete H.arm[it.id];H.busy[it.id]=true;paint();
    const r=await api("content_delete",{id:it.id});
    delete H.busy[it.id];
    if(r&&r.ok){H.items=H.items.filter(x=>x.id!==it.id);delete H.urls[it.id];if(r.usage)H.usage=r.usage;toast("Project and files deleted","ok",2200)}
    else toast(why(r),"err",3500);
    paint();
  }
  const urlFor=it=>{const u=H.urls[it.id];return u&&u.exp>Date.now()+6e4?u.url:""};
  async function blobFor(it){const u=urlFor(it);if(!u)throw new Error("link");const r=await fetch(u);if(!r.ok)throw new Error("fetch");return r.blob()}

  /* ======================= the Content Hub view ======================= */
  function ensureView(){
    let v=$("#lc35-hub");if(v)return v;
    v=h("div",{id:"lc35-hub",hidden:true,role:"dialog","aria-modal":"true","aria-label":"Content hub"});$("#lcs").append(v);return v;
  }
  function openHub(){H.open=true;const v=ensureView();v.hidden=false;paint();load()}
  function closeHub(){H.open=false;const v=$("#lc35-hub");if(v)v.hidden=true}
  function chip(it,p){
    const st=it.platforms[p[0]]||"orange";
    return h("div",{class:"lc35-pl"},
      h("button",{type:"button",class:"lc35-st","data-st":st,"data-pl":p[0],"aria-label":p[1]+": "+ST[st].long+". Press to change.",title:ST[st].long,onclick:()=>setStatus(it,p[0],NEXT[st])},
        h("span",{class:"d"}),h("b",{text:p[1]}),h("em",{text:ST[st].label})),
      h("a",{href:p[2],target:"_blank",rel:"noopener noreferrer",text:"Open uploader"}));
  }
  function card(it){
    const url=urlFor(it),v=H.view[it.id],done=resolved(it),open=PL.filter(p=>it.platforms[p[0]]==="orange").map(p=>p[1]);
    const c=h("article",{class:"lc35-card","data-id":it.id});
    c.append(h("h3",{text:it.title,title:it.title}),
      h("div",{class:"lc35-meta"},it.variant?h("span",{text:it.variant}):null,it.fmt?h("span",{text:it.fmt}):null,h("span",{text:mb(it.bytes)}),h("span",{text:new Date(it.created).toLocaleDateString()}),it.meta&&it.meta.cta?h("span",{text:"CTA: "+it.meta.cta}):null),
      h("div",{class:"lc35-sts"},...PL.map(p=>chip(it,p))));
    if(v&&url)c.append(h("video",{src:url,controls:true,playsinline:true,preload:"metadata"}));
    const drag=h("span",{class:"lc35-drag",draggable:url?"true":"false","aria-disabled":url?"false":"true",title:"Drag this into the upload area of TikTok, Instagram, Facebook or YouTube (desktop Chrome or Edge)",text:"⠿ Drag to upload"});
    drag.addEventListener("dragstart",e=>{
      const u=urlFor(it);if(!u){e.preventDefault();toast("Preparing the link. Try again in a second.","",1800);refreshUrls();return}
      const name=fileName(it);
      e.dataTransfer.effectAllowed="copy";
      e.dataTransfer.setData("DownloadURL",it.mime+":"+name+":"+u);       /* Chromium turns this into a real file when it is dropped on another page or the desktop */
      e.dataTransfer.setData("text/uri-list",u);e.dataTransfer.setData("text/plain",u);
    });
    c.append(h("div",{class:"lc35-act"},drag,
      h("button",{type:"button",class:"btn sm",text:v?"Hide":"Preview",disabled:url?null:true,onclick:()=>{H.view[it.id]=!v;paint()}}),
      h("button",{type:"button",class:"btn sm",text:"Copy link",disabled:url?null:true,onclick:async()=>{try{await copyText(urlFor(it));toast("Link copied. It works for 24 hours.","ok",2200)}catch(e){toast("Copy failed","err")}}}),
      h("button",{type:"button",class:"btn sm",text:"Download",disabled:url?null:true,onclick:async()=>{try{download(await blobFor(it),fileName(it))}catch(e){toast("The download could not start. Try again.","err",3000)}}}),
      navigator.canShare?h("button",{type:"button",class:"btn sm",text:"Share to app",disabled:url?null:true,title:"Opens your phone's share sheet (TikTok, Instagram, WhatsApp...)",onclick:async()=>{try{const f=new File([await blobFor(it)],fileName(it),{type:it.mime});if(navigator.canShare({files:[f]}))await navigator.share({files:[f],title:it.title});else toast("Sharing files is not supported here.","err",3000)}catch(e){if(!e||e.name!=="AbortError")toast("Sharing failed.","err",3000)}}}):null,
      h("button",{type:"button",class:"btn sm danger lc35-trash"+(armed(it)?" arm":""),id:"lc35-trash-"+it.id,disabled:!done||H.busy[it.id]?true:null,title:done?"Deletes the project and its cloud files":"Set "+open.join(", ")+" to Posted or Skip first",
        text:H.busy[it.id]?"Deleting…":armed(it)?"Press again to delete":"Trash / Archive",onclick:e=>trash(it,e.currentTarget)})));
    if(!done)c.append(h("p",{class:"lc35-hint",text:"Waiting for: "+open.join(", ")+". Mark each one Posted (green) or Skip (red) to unlock Trash."}));
    return c;
  }
  function paint(){
    const v=$("#lc35-hub");if(!v||v.hidden)return;
    v.textContent="";
    const u=H.usage,todo=H.items.reduce((n,i)=>n+PL.filter(p=>i.platforms[p[0]]==="orange").length,0);
    v.append(h("div",{class:"lc35-top"},h("h2",{text:"Content hub"}),
      u?h("div",{class:"lc35-use","aria-label":"Cloud space used"},h("span",{text:u.items+" of "+u.maxItems+" projects · "+mb(u.bytes)+" of "+mb(u.maxBytes)}),h("i",{},h("b",{style:{width:Math.min(100,u.bytes/u.maxBytes*100)+"%"}}))):null,
      h("span",{class:"lc35-hint",text:todo?todo+" post"+(todo===1?"":"s")+" still to do":(H.items.length?"Everything is posted or skipped":"")}),
      h("button",{type:"button",class:"btn sm",id:"lc35-refresh",text:"Refresh",onclick:()=>load()}),
      h("button",{type:"button",class:"btn sm",id:"lc35-close",text:"Close",onclick:closeHub})));
    const body=h("div",{class:"lc35-body",id:"lc35-body"});
    if(H.denied)body.append(h("div",{class:"lc35-empty",text:WHY.forbidden}));
    else if(H.loading&&!H.items.length)body.append(h("div",{class:"lc35-empty",text:"Loading your projects…"}));
    else if(H.err&&!H.items.length)body.append(h("div",{class:"lc35-empty",text:H.err}));
    else if(!H.items.length)body.append(h("div",{class:"lc35-empty",html:"No projects yet.<br>Open a take, then press <b>Save to Content hub</b>, or render a variant from the Project timeline."}));
    else H.items.forEach(it=>body.append(card(it)));
    v.append(body);
  }

  /* ======================= project timeline: Clip Archiver and variants ======================= */
  const ROLES=["Hook","Body","CTA","Other"];
  const blank=()=>({clips:[],variants:[],active:"master",archiver:true,title:""});
  function pj(){
    let o=Store.get(PJ_KEY,null);
    if(!o||typeof o!=="object")o=blank();
    o.clips=(Array.isArray(o.clips)?o.clips:[]).filter(c=>c&&Takes.get(c.take)).slice(0,40);
    o.variants=(Array.isArray(o.variants)?o.variants:[]).slice(0,12);
    return o;
  }
  const savePj=p=>Store.set(PJ_KEY,p);
  const clipTake=c=>Takes.get(c.take);
  const clipLen=c=>{const t=clipTake(c);return t?keepLen(Trim.keep(t)):0};
  const fmtSec=s=>{s=Math.round(s);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
  const live=p=>p.clips.filter(c=>!c.off);
  const proj={
    addCurrent(){
      const t=Trim.take();if(!t){toast("Open a take first.","err",2200);return}
      const p=pj();if(p.clips.some(c=>c.take===t.id)){toast("That take is already on the timeline.","",1800);return}
      p.clips.push({id:uid(),take:t.id,role:p.clips.length?"Body":"Hook",label:t.name.slice(0,40),off:false});
      savePj(p);ui.force();
    },
    setOff(id,off){const p=pj(),c=p.clips.filter(x=>x.id===id)[0];if(!c)return;c.off=!!off;p.active="master";savePj(p);ui.force()},
    move(id,d){const p=pj(),i=p.clips.findIndex(x=>x.id===id),j=i+d;if(i<0||j<0||j>=p.clips.length)return;const c=p.clips.splice(i,1)[0];p.clips.splice(j,0,c);savePj(p);ui.force()},
    remove(id){const p=pj();p.clips=p.clips.filter(c=>c.id!==id);savePj(p);ui.force()}      /* variants remember their switches per take, so a clip that comes back keeps its old state */,
    role(id,r){const p=pj(),c=p.clips.filter(x=>x.id===id)[0];if(c&&ROLES.indexOf(r)>=0){c.role=r;savePj(p);ui.force()}},
    saveVariant(name,cta,targets){
      name=String(name||"").trim().slice(0,40);if(!name){toast("Name the variant first (for example: Variant A, TikTok bio link).","err",2800);return null}
      const p=pj();let v=p.variants.filter(x=>x.name.toLowerCase()===name.toLowerCase())[0];
      if(!v){if(p.variants.length>=12){toast("12 variants is the maximum.","err",2400);return null}v={id:uid(),name:name,on:{},targets:[],cta:""};p.variants.push(v)}
      v.on=Object.assign({},v.on);p.clips.forEach(c=>{v.on[c.take]=!c.off});v.cta=String(cta||"").trim().slice(0,60);v.targets=PL.map(x=>x[0]).filter(x=>(targets||[]).indexOf(x)>=0);
      p.active=v.id;savePj(p);ui.force();return v;
    },
    apply(id){
      const p=pj();
      if(id==="master"){p.active="master";savePj(p);ui.force();return}
      const v=p.variants.filter(x=>x.id===id)[0];if(!v)return;
      p.clips.forEach(c=>{c.off=v.on[c.take]===false});p.active=v.id;savePj(p);ui.force();
    },
    removeVariant(id){const p=pj();p.variants=p.variants.filter(v=>v.id!==id);if(p.active===id)p.active="master";savePj(p);ui.force()}
  };
  /* Joins the enabled clips into one video: every clip with its own cuts and captions, one recording. */
  async function renderClips(list,onProg){
    const takes=list.map(c=>Takes.get(c.take)).filter(Boolean);
    if(!takes.length)throw new Error("There are no enabled clips to render. Restore at least one clip.");
    if(!window.MediaRecorder)throw new Error("This browser cannot record video.");
    const first=takes[0],W=first.w||1280,Hh=first.h||720,fps=first.fps||30;
    const v=h("video",{playsinline:true,preload:"auto",style:{position:"fixed",left:"-9999px",width:"2px",height:"2px"}});document.body.append(v);
    const cv=h("canvas");cv.width=W;cv.height=Hh;const g=cv.getContext("2d",{alpha:false});
    const AC=window.AudioContext||window.webkitAudioContext,ac=new AC;if(ac.state==="suspended")await ac.resume();
    const src=ac.createMediaElementSource(v),gain=ac.createGain(),dest=ac.createMediaStreamDestination();src.connect(gain);gain.connect(dest);
    const stream=cv.captureStream(fps);dest.stream.getAudioTracks().forEach(a=>stream.addTrack(a));
    const mime=pickMime(),chunks=[],opts={videoBitsPerSecond:(BITRATE[Cfg.res]||BITRATE["1080p"])[fps]||8e6,audioBitsPerSecond:192e3};if(mime)opts.mimeType=mime;
    const mr=new MediaRecorder(stream,opts);mr.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
    const finished=new Promise(r=>{mr.onstop=r});
    const total=takes.reduce((n,t)=>n+keepLen(Trim.keep(t)),0);let done=0,started=false;
    const draw=(t)=>{
      const vw=v.videoWidth||W,vh=v.videoHeight||Hh,k=Math.min(W/vw,Hh/vh),dw=vw*k,dh=vh*k;
      g.fillStyle="#000";g.fillRect(0,0,W,Hh);g.drawImage(v,(W-dw)/2,(Hh-dh)/2,dw,dh);
      try{LC33S.cap.draw(g,W,Hh,t,v.currentTime)}catch(e){}
    };
    try{
      for(const t of takes){
        v.src=t.url;await new Promise((res,rej)=>{v.onloadedmetadata=res;v.onerror=()=>rej(new Error("Could not open the take "+t.name+"."))});await fixDuration(v);
        for(const seg of Trim.keep(t)){
          v.currentTime=seg.s;await new Promise(r=>{const f=()=>{v.removeEventListener("seeked",f);r()};v.addEventListener("seeked",f)});
          draw(t);if(!started){mr.start(1e3);started=true}
          gain.gain.setTargetAtTime(1,ac.currentTime,.004);await v.play();
          await new Promise(res=>{const step=()=>{draw(t);const ct=v.currentTime;if(onProg)onProg(clamp((done+Math.max(0,ct-seg.s))/total,0,1));if(ct>=seg.e-.03||v.ended){res();return}requestAnimationFrame(step)};requestAnimationFrame(step)});
          v.pause();gain.gain.setTargetAtTime(0,ac.currentTime,.004);done+=seg.e-seg.s;
        }
      }
      setTimeout(()=>{try{mr.stop()}catch(e){}},250);await finished;
    }finally{try{stream.getTracks().forEach(x=>x.stop())}catch(e){}try{ac.close()}catch(e){}v.remove()}
    const blob=new Blob(chunks,{type:mime||"video/webm"});
    if(blob.size<1000)throw new Error("The video came out empty. Try again.");
    return{blob:blob,w:W,h:Hh,fps:fps,seconds:total,mime:(blob.type||mime||"video/webm").split(";")[0]};
  }
  let job=null;
  const say=(m,bad)=>{const e=$("#lc35-msg");if(e){e.textContent=m||"";e.className="hint"+(bad?" bad":"")}};
  const prog=f=>{const b=$("#lc35-prog i");if(b)b.style.width=Math.round(f*100)+"%"};
  function platformsFor(targets){const o={};PL.forEach(p=>{o[p[0]]=!targets||!targets.length||targets.indexOf(p[0])>=0?"orange":"red"});return o}
  async function renderAndSave(label,variant){
    const p=pj(),clips=live(p);
    if(!clips.length)throw new Error("Every clip is archived. Restore at least one.");
    say("Rendering "+label+"… keep this tab open.");prog(0);
    const r=await renderClips(clips,f=>prog(f*.6));
    if(!can()){download(r.blob,(p.title||"project")+"-"+label+"."+(/webm/.test(r.mime)?"webm":"mp4"));say("Saved as a download (the Content hub is for creator accounts).");return null}
    say("Uploading "+label+" to the cloud…");
    const out=await saveToCloud(r.blob,{title:p.title||clips[0].label||"Short",fmt:fmtOf(r.w,r.h),variant:variant?variant.name:"Master",mime:r.mime,
      platforms:platformsFor(variant&&variant.targets),meta:{cta:variant?variant.cta:"",clips:clips.map(c=>c.role+": "+c.label),seconds:Math.round(r.seconds)}},f=>prog(.6+f*.4));
    if(!out.ok){
      const fn=(p.title||"project")+"-"+label+"."+(/webm/.test(r.mime)?"webm":"mp4");
      say(out.reason==="too_large"?"This video is "+mb(r.blob.size)+" but the cloud file limit is "+mb(out.limit||(H.usage&&H.usage.maxFile)||0)+". Lower the resolution in Settings or shorten it. It was saved as a download instead.":why({reason:out.reason})+" It was saved as a download instead.",true);
      download(r.blob,fn);return null;
    }
    prog(1);return out.item;
  }
  async function renderVariant(id){
    if(job)return;job=true;ui.force();
    try{
      const p=pj(),v=id==="master"?null:p.variants.filter(x=>x.id===id)[0];if(id!=="master"&&!v)return;
      if(v)proj.apply(v.id);
      const it=await renderAndSave(v?v.name:"Master",v);
      if(it)say("Saved to the Content hub: "+it.title+(it.variant?" ("+it.variant+")":"")+". Open the Content hub to post it.");
    }catch(e){say(e.message||"Rendering failed.",true)}
    finally{job=null;ui.force()}
  }
  async function renderAll(){
    if(job)return;const p0=pj();if(!p0.variants.length){say("Save at least one variant first.",true);return}
    job=true;ui.force();const keep={active:p0.active,off:p0.clips.map(c=>[c.id,!!c.off])};let n=0;
    try{
      for(let i=0;i<p0.variants.length;i++){
        const v=p0.variants[i];proj.apply(v.id);say("Variant "+(i+1)+" of "+p0.variants.length+": "+v.name);
        const it=await renderAndSave(v.name,v);if(it)n++;
      }
      say(n+" of "+p0.variants.length+" variants saved to the Content hub.",n!==p0.variants.length);
    }catch(e){say(e.message||"Rendering failed.",true)}
    finally{const p=pj();keep.off.forEach(([id,off])=>{const c=p.clips.filter(x=>x.id===id)[0];if(c)c.off=off});p.active=keep.active;savePj(p);job=null;ui.force()}
  }
  async function saveTakeToHub(){
    const t=Trim.take();if(!t){say("Open a take first.",true);return}
    if(job)return;job=true;ui.force();
    try{
      say("Uploading "+t.name+"…");prog(0);
      const out=await saveToCloud(t.blob,{title:t.name,fmt:fmtOf(t.w,t.h),variant:"Single take",mime:t.mime,platforms:platformsFor(null),meta:{seconds:Math.round(t.durationMs/1e3)}},prog);
      say(out.ok?"Saved to the Content hub: "+out.item.title+".":why({reason:out.reason}),!out.ok);
    }catch(e){say("Upload failed.",true)}finally{job=null;ui.force()}
  }
  async function renderToTake(){
    if(job)return;job=true;ui.force();
    try{const p=pj(),clips=live(p);if(!clips.length)throw new Error("Every clip is archived. Restore at least one.");say("Rendering…");prog(0);
      const r=await renderClips(clips,prog);const nt={id:uid(),name:(p.title||"Project")+" ("+(p.active==="master"?"master":(p.variants.filter(v=>v.id===p.active)[0]||{name:"variant"}).name)+")",blob:r.blob,mime:r.mime,durationMs:r.seconds*1e3,w:r.w,h:r.h,fps:r.fps,env:[],markers:[],cuts:[],trimIn:0,trimOut:r.seconds,createdAt:Date.now(),size:r.blob.size,onDisk:false,captions:[]};
      await Takes.add(nt);say("Rendered to a new take: "+nt.name+".");
    }catch(e){say(e.message||"Rendering failed.",true)}finally{job=null;ui.force()}
  }

  /* ----- timeline UI in the take editor ----- */
  let lastKey="";
  const ui={
    build(editor){if($("#lc35-proj"))return;editor.append(h("div",{id:"lc35-proj"}));ui.force()},
    force(){lastKey="";ui.paint()},
    paint(){
      const w=$("#lc35-proj");if(!w)return;
      const p=pj(),cur=Trim.take(),key=JSON.stringify([p,cur&&cur.id,!!job,Takes.list.map(t=>t.id)]);
      if(key===lastKey&&w.firstChild)return;lastKey=key;
      const keepMsg=$("#lc35-msg")?$("#lc35-msg").textContent:"",keepBad=$("#lc35-msg")&&$("#lc35-msg").classList.contains("bad");
      w.textContent="";
      w.append(h("div",{class:"h"},h("b",{text:"Project timeline ("+p.clips.length+" clips, "+live(p).length+" active)"}),
        h("label",{class:"lc35-sw"},h("input",{type:"checkbox",id:"lc35-archiver",checked:p.archiver!==false||null,onchange:e=>{const q=pj();q.archiver=e.target.checked;savePj(q);ui.force()}}),"Clip Archiver"),
        h("button",{type:"button",class:"btn sm",id:"lc35-add",text:"Add this take",disabled:cur?null:true,onclick:proj.addCurrent}),
        h("button",{type:"button",class:"btn sm",id:"lc35-hubopen",text:"Content hub",onclick:openHub})));
      w.append(h("input",{type:"text",id:"lc35-title",placeholder:"Project title (used for the cloud files)",maxlength:"120",value:p.title||"","aria-label":"Project title",style:{width:"100%",marginBottom:"6px"},oninput:e=>{const q=pj();q.title=e.target.value;savePj(q)}}));
      if(!p.clips.length)w.append(h("p",{class:"lc35-hint",text:"Open a take and press Add this take. Add your hook, body and CTA versions as separate takes, then switch clips on and off to build variants."}));
      const strip=h("div",{class:"lc35-clips",id:"lc35-clips"});
      p.clips.forEach((c,i)=>{
        const sel=h("select",{"aria-label":"Role of "+c.label,onchange:e=>proj.role(c.id,e.target.value)});ROLES.forEach(r=>sel.append(h("option",{value:r,text:r,selected:r===c.role||null})));
        strip.append(h("div",{class:"lc35-clip"+(c.off?" off":""),dataset:{id:c.id}},
          h("div",{class:"nm",text:(i+1)+". "+c.label,title:c.label}),h("div",{class:"sm",text:fmtSec(clipLen(c))+(c.off?" · archived (skipped in renders)":"")}),sel,
          h("div",{class:"bt"},
            h("button",{type:"button",class:"btn sm","aria-label":"Move earlier",text:"◀",disabled:i?null:true,onclick:()=>proj.move(c.id,-1)}),
            h("button",{type:"button",class:"btn sm","aria-label":"Move later",text:"▶",disabled:i<p.clips.length-1?null:true,onclick:()=>proj.move(c.id,1)}),
            p.archiver!==false?h("button",{type:"button",class:"btn sm lc35-arch","aria-pressed":String(!!c.off),text:c.off?"Restore":"Archive",title:c.off?"Put this clip back into renders":"Skip this clip in renders without deleting it",onclick:()=>proj.setOff(c.id,!c.off)}):null,
            h("button",{type:"button",class:"btn sm",text:"Edit",title:"Open this take in the editor",onclick:()=>{Takes.cur=c.take;Takes.render()}}),
            h("button",{type:"button",class:"btn sm danger",text:"✕","aria-label":"Remove from timeline (the take is kept)",title:"Remove from the timeline (the take itself is kept)",onclick:()=>proj.remove(c.id)}))));
      });
      w.append(strip);
      const vars=h("div",{class:"lc35-vars",id:"lc35-vars"},h("span",{class:"lc35-hint",text:"Variants:"}),
        h("button",{type:"button",class:"btn sm","aria-pressed":String(p.active==="master"),text:"Master (current)",onclick:()=>proj.apply("master")}));
      p.variants.forEach(v=>vars.append(h("button",{type:"button",class:"btn sm lc35-var","aria-pressed":String(p.active===v.id),dataset:{id:v.id},text:v.name,title:(v.cta?"CTA: "+v.cta+". ":"")+"Targets: "+(v.targets.length?v.targets.join(", "):"all platforms"),onclick:()=>proj.apply(v.id)})));
      w.append(vars);
      const nm=h("input",{type:"text",id:"lc35-vname",placeholder:"Variant name, e.g. Variant A",maxlength:"40","aria-label":"Variant name"}),cta=h("input",{type:"text",id:"lc35-vcta",placeholder:"CTA label, e.g. TikTok bio link",maxlength:"60","aria-label":"CTA label"});
      const tg=h("div",{class:"lc35-opts",style:{display:"flex",gap:"10px",flexWrap:"wrap",fontSize:"12.5px"}});
      PL.forEach(x=>tg.append(h("label",{class:"lc35-sw"},h("input",{type:"checkbox",dataset:{tg:x[0]},checked:true}),x[1])));
      w.append(h("div",{class:"lc35-vform"},nm,cta),tg,
        h("div",{class:"h",style:{marginTop:"6px"}},
          h("button",{type:"button",class:"btn sm",id:"lc35-vsave",text:"Save current clips as variant",disabled:p.clips.length?null:true,onclick:()=>{const t=PL.map(x=>x[0]).filter(x=>{const e=$('[data-tg="'+x+'"]',w);return e&&e.checked});proj.saveVariant(nm.value,cta.value,t)}}),
          p.active!=="master"?h("button",{type:"button",class:"btn sm danger",id:"lc35-vdel",text:"Delete this variant",onclick:()=>proj.removeVariant(p.active)}):null));
      w.append(h("div",{class:"h",style:{marginTop:"8px"}},
        h("button",{type:"button",class:"btn pri sm",id:"lc35-rv",text:p.active==="master"?"Render master → Content hub":"Render this variant → Content hub",disabled:job||!live(p).length?true:null,onclick:()=>renderVariant(p.active)}),
        h("button",{type:"button",class:"btn sm",id:"lc35-ra",text:"Render all variants → Content hub",disabled:job||!p.variants.length?true:null,onclick:renderAll}),
        h("button",{type:"button",class:"btn sm",id:"lc35-rt",text:"Render to a take",disabled:job||!live(p).length?true:null,onclick:renderToTake}),
        h("button",{type:"button",class:"btn sm",id:"lc35-st1",text:"Save this take to Content hub",disabled:job||!cur?true:null,onclick:saveTakeToHub})));
      w.append(h("div",{class:"lc35-prog",id:"lc35-prog"},h("i")),h("p",{class:"hint"+(keepBad?" bad":""),id:"lc35-msg",text:keepMsg}));
    }
  };
  let timer=0;
  function stageButton(){
    const row=$("#lc31-row");if(!row||$("#lc35-open"))return;
    const b=h("button",{type:"button",class:"btn sm",id:"lc35-open",html:icon("grid","",14)+"<span>Content hub</span>",onclick:openHub});
    const a=$("#lc31-fmt-btn");a?a.before(b):row.append(b);
  }
  function onMount(){stageButton();clearInterval(timer);timer=setInterval(ui.paint,500);ensureView()}
  function onUnmount(){clearInterval(timer);const v=$("#lc35-hub");if(v)v.remove();H.open=false}
  return{onMount:onMount,onUnmount:onUnmount,ui:ui,openHub:openHub,closeHub:closeHub,load:load,state:H,proj:proj,pj:pj,renderClips:renderClips,renderVariant:renderVariant,renderAll:renderAll,saveToCloud:saveToCloud,setStatus:setStatus,trash:trash,resolved:resolved,urlFor:urlFor,fileName:fileName,fmtOf:fmtOf,refreshUrls:refreshUrls,platformsFor:platformsFor,live:live};
})();
