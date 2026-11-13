/*@@module lc79*/ const LC79=(()=>{
  "use strict";
  /* LC79 (build 9.39.0): Creator Studio 2.0.
     1. Live captions: the speech captions of a take are tightened to the voice after recording (alignLive, uses the level per 0.1 s that every take
        already stores), and a live caption line shows on the stage while recording so you see the speech service works. Nothing new is sent anywhere.
     2. Edit Projects: several independent projects (each its own clips, trims, callouts and timeline), a timeline you can drag, per-clip start / end,
        a takes archive with Watch / Add / Delete (confirm), a preview player and one export per project (also kept as a new take).
     3. Game-to-Script AI: a PGN (paste, file, own or any player's recent games) is scanned by Stockfish ON THIS DEVICE (LC80.scan, no AI cost);
        the crucial mistake, the punishment, the tactical motif, the Alarm Signal, the Working Point and the Socratic MSPC questions are worked out,
        Lichess gives a similar puzzle with the same motif (+ cloud eval when it has one), and one button copies the master prompt for Claude.
        Claude's answer can be pasted back and used as the Studio script.
     4. Callouts: "2105 ELO Coach" in one tap (animated arrow to the camera + ping), a builder for own callouts (text, font, colours, size, place,
        arrow tip, duration, sound) and presets saved on this device. Sounds are synthesised with Web Audio (no files) and land in the export.
     5. "Show Landing Page (CTA)": the live landing page (snapshot of /?preview=1 through html2canvas, so no visit is counted) in a phone frame in the
        recorded picture, or a CTA card when the page cannot be captured. Key L toggles it in the Studio. */
  const VERSION="9.39.0";
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const say=(m,k,ms)=>{try{toast(m,k||"",ms||3200)}catch(e){}};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0];
  const fmt=s=>{s=Math.max(0,+s||0);const m=Math.floor(s/60),r=s-m*60;return m+":"+(r<10?"0":"")+r.toFixed(1)};
  const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
  const api=()=>{try{return window.LanckrietStudio||null}catch(e){return null}};
  const T=()=>{const a=api();return a&&a._t||null};
  const takes=()=>{const t=T();return t&&t.Takes?t.Takes.list:[]};
  const takeById=id=>{const t=T();return t&&t.Takes?t.Takes.get(id):null};
  const easeOut=p=>1-Math.pow(1-p,3);
  const easeBack=p=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2)};
  function rr(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function studioRoot(){
    const v=Q("#view");
    const host=((v?[v].concat(QA("*",v).slice(0,40)):[]).concat([].slice.call(document.body.children))).filter(e=>e.shadowRoot&&e.shadowRoot.querySelector("#lcs"))[0];
    return host?host.shadowRoot:null;
  }
  function dirty(){try{const B=api()&&api().board;if(B&&B.onChange)B.onChange()}catch(e){}}

  /* ---------- sounds (synthesised, nothing to download, no rights issue) ---------- */
  const SOUNDS=[["ping","Ping"],["brilliant","Brilliant move"],["blunder","Blunder"],["whoosh","Whoosh"],["none","No sound"]];
  function sfx(kind,ac,out,when){
    if(!ac||!out||!kind||kind==="none")return;
    const t0=Math.max(ac.currentTime,when||0)+.01;
    const tone=(type,f0,f1,st,dur,vol,dst)=>{const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f0,st);if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,st+dur);
      g.gain.setValueAtTime(.0001,st);g.gain.exponentialRampToValueAtTime(vol,st+.008);g.gain.exponentialRampToValueAtTime(.0001,st+dur);o.connect(g);g.connect(dst||out);o.start(st);o.stop(st+dur+.05)};
    if(kind==="ping"){tone("sine",1318.5,0,t0,.45,.22);tone("sine",2637,0,t0,.22,.06)}
    else if(kind==="brilliant"){[1046.5,1318.5,1568,2093].forEach((f,i)=>tone("triangle",f,0,t0+i*.065,.5-i*.05,.12));tone("sine",3136,0,t0+.26,.45,.04)}
    else if(kind==="blunder"){const lp=ac.createBiquadFilter();lp.type="lowpass";lp.frequency.value=900;lp.connect(out);tone("sawtooth",233,110,t0,.32,.11,lp);tone("sawtooth",196,82,t0+.16,.4,.1,lp)}
    else if(kind==="whoosh"){const n=Math.floor(ac.sampleRate*.5),b=ac.createBuffer(1,n,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
      const s=ac.createBufferSource(),bp=ac.createBiquadFilter(),g=ac.createGain();s.buffer=b;bp.type="bandpass";bp.Q.value=1.2;bp.frequency.setValueAtTime(300,t0);bp.frequency.exponentialRampToValueAtTime(3200,t0+.38);
      g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(.18,t0+.12);g.gain.exponentialRampToValueAtTime(.0001,t0+.45);s.connect(bp);bp.connect(g);g.connect(out);s.start(t0);s.stop(t0+.5)}
  }
  let pac=null;
  function hear(kind){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!pac)pac=new AC();if(pac.state==="suspended")pac.resume();sfx(kind,pac,pac.destination)}catch(e){}}

  /* ---------- callouts ---------- */
  const FONTS={sora:"800 {s}px Sora,system-ui,-apple-system,Segoe UI,sans-serif",impact:"400 {s}px Impact,'Haettenschweiler','Arial Narrow Bold',sans-serif",serif:"700 {s}px Georgia,'Times New Roman',serif",round:"700 {s}px 'Trebuchet MS','Arial Rounded MT Bold',sans-serif"};
  const FONT_NAMES=[["sora","Sora (clean)"],["impact","Impact (loud)"],["serif","Serif (classic)"],["round","Rounded (friendly)"]];
  const BUILT=[
    {pid:"authority",name:"2105 ELO Coach",text:"2105 ELO Coach",sub:"",font:"sora",bg:"#fbbf24",fg:"#0f172a",sound:"ping",arrow:true,aim:"camera",dur:2.6,scale:1},
    {pid:"blunder",name:"Blunder!",text:"Blunder!",sub:"",font:"impact",bg:"#ef4444",fg:"#ffffff",sound:"blunder",arrow:true,aim:"board",dur:2,scale:1.1},
    {pid:"alarm",name:"Alarm Signal",text:"Alarm Signal",sub:"",font:"sora",bg:"#f97316",fg:"#0f172a",sound:"ping",arrow:true,aim:"board",dur:2.4,scale:1},
    {pid:"brilliant",name:"Brilliant!",text:"Brilliant!",sub:"",font:"sora",bg:"#14b8a6",fg:"#ffffff",sound:"brilliant",arrow:true,aim:"board",dur:2,scale:1},
    {pid:"wp",name:"Working Point",text:"Working Point",sub:"",font:"sora",bg:"#38bdf8",fg:"#0f172a",sound:"whoosh",arrow:false,aim:"none",dur:2.6,scale:1}];
  const PK="lc79-presets";
  const myPresets=()=>(rd(PK,[])||[]).filter(p=>p&&p.pid&&p.text).slice(0,24);
  const allPresets=()=>BUILT.concat(myPresets());
  function aimPoint(aim){
    try{const L=T().LAYOUT().layers;
      if(aim==="camera"&&L.camera&&L.camera.on){const c=L.camera;if(c.fill==="full")return{x:.5,y:.32};return{x:clamp(c.x+c.w/2,.05,.95),y:clamp(c.y+c.h*.42,.05,.95)}}
      if(aim==="board"&&L.board&&L.board.on){const b=L.board;return{x:clamp(b.x+b.w/2,.05,.95),y:clamp(b.y+b.h/2,.05,.95)}}}catch(e){}
    return aim==="camera"?{x:.5,y:.3}:{x:.5,y:.45};
  }
  function makeCallout(pr,t){
    const c={id:uid(),t:Math.max(0,+t||0),dur:+pr.dur||2.4,text:String(pr.text||"").slice(0,40),sub:String(pr.sub||"").slice(0,50),font:pr.font||"sora",bg:pr.bg||"#00E5FF",fg:pr.fg||"#0A0B0E",
      sound:pr.sound||"ping",arrow:pr.arrow!==false,scale:+pr.scale||1,pid:pr.pid||""};
    if(c.arrow&&pr.aim!=="none"){const a=aimPoint(pr.aim||"board");c.ax=a.x;c.ay=a.y;c.x=clamp(a.x<.5?a.x+.27:a.x-.27,.2,.8);c.y=clamp(a.y-.15,.1,.88)}
    else{c.ax=.5;c.ay=.6;c.x=.5;c.y=.16}
    if(pr.x!=null&&pr.aim==="keep"){c.x=pr.x;c.y=pr.y;c.ax=pr.ax;c.ay=pr.ay}
    return c;
  }
  function drawCallout(g,W,H,c,lt){
    if(!c||!(lt>=0)||lt>c.dur)return;
    const out=lt>c.dur-.25?clamp((c.dur-lt)/.25,0,1):1,alpha=clamp(lt/.1,0,1)*out;if(alpha<=0)return;
    const fs=Math.round(Math.min(W,H)*.052*clamp(+c.scale||1,.5,2.2)),sfs=Math.round(fs*.5);
    g.save();g.globalAlpha=alpha;
    g.font=(FONTS[c.font]||FONTS.sora).replace("{s}",fs);const tw=g.measureText(c.text||" ").width;
    let sw=0;if(c.sub){g.font=FONTS.sora.replace("800","600").replace("{s}",sfs);sw=g.measureText(c.sub).width}
    const padX=fs*.6,padY=fs*.36,bw=Math.max(tw,sw)+padX*2,bh=padY*2+fs*1.02+(c.sub?sfs*1.3:0),cx=c.x*W,cy=c.y*H;
    if(c.arrow){
      const tx=c.ax*W,ty=c.ay*H,dx=tx-cx,dy=ty-cy,dist=Math.hypot(dx,dy);
      if(dist>Math.max(bw,bh)*.62){
        const k=Math.min((bw/2+fs*.2)/Math.max(1e-6,Math.abs(dx)),(bh/2+fs*.2)/Math.max(1e-6,Math.abs(dy))),sx=cx+dx*k,sy=cy+dy*k;
        const len=Math.hypot(tx-sx,ty-sy),ux=(tx-sx)/len,uy=(ty-sy)/len,p=easeOut(clamp((lt-.12)/.38,0,1)),bob=p>=1?Math.sin((lt-.5)*7)*fs*.16:0;
        const tip=Math.max(fs*.4,len*p+bob-fs*.15),ex=sx+ux*tip,ey=sy+uy*tip,head=fs*.62,nx=-uy,ny=ux,bx=ex-ux*head,by=ey-uy*head;
        g.lineCap="round";g.lineJoin="round";
        g.strokeStyle="rgba(5,7,10,.5)";g.lineWidth=fs*.3;g.beginPath();g.moveTo(sx,sy);g.lineTo(bx,by);g.stroke();
        g.strokeStyle=c.bg;g.lineWidth=fs*.19;g.beginPath();g.moveTo(sx,sy);g.lineTo(bx+ux*2,by+uy*2);g.stroke();
        g.beginPath();g.moveTo(ex,ey);g.lineTo(bx+nx*head*.55,by+ny*head*.55);g.lineTo(bx-nx*head*.55,by-ny*head*.55);g.closePath();
        g.fillStyle=c.bg;g.strokeStyle="rgba(5,7,10,.5)";g.lineWidth=fs*.06;g.fill();g.stroke();
      }
    }
    const s=easeBack(clamp(lt/.3,0,1));g.translate(cx,cy);g.scale(s,s);
    g.shadowColor="rgba(0,0,0,.45)";g.shadowBlur=fs*.5;g.shadowOffsetY=fs*.12;rr(g,-bw/2,-bh/2,bw,bh,bh*.3);g.fillStyle=c.bg;g.fill();
    g.shadowColor="transparent";g.shadowBlur=0;g.shadowOffsetY=0;
    g.fillStyle=c.fg;g.textAlign="center";g.textBaseline="middle";g.font=(FONTS[c.font]||FONTS.sora).replace("{s}",fs);
    g.fillText(c.text||"",0,c.sub?-bh/2+padY+fs*.52:fs*.04);
    if(c.sub){g.font=FONTS.sora.replace("800","600").replace("{s}",sfs);g.globalAlpha=alpha*.85;g.fillText(c.sub,0,bh/2-padY-sfs*.55)}
    g.restore();
  }

  /* ---------- projects ---------- */
  const PJ="lc79-projects";
  let P=null;
  function db(){if(P)return P;P=rd(PJ,null);if(!P||!Array.isArray(P.list))P={list:[],cur:""};return P}
  function persist(){wr(PJ,db())}
  function cur(){const d=db();let p=d.list.filter(x=>x.id===d.cur)[0];if(!p&&d.list.length){p=d.list[0];d.cur=p.id}return p||null}
  function newProject(name){const d=db();const p={id:uid(),name:String(name||("Reel "+(d.list.length+1))).slice(0,60),clips:[],callouts:[],size:"auto",useCuts:true,created:Date.now(),updated:Date.now()};d.list.unshift(p);d.cur=p.id;persist();return p}
  function save(p){if(p)p.updated=Date.now();persist()}
  function takeGone(id){const d=db();let n=0;d.list.forEach(p=>{const b=p.clips.length;p.clips=p.clips.filter(c=>c.take!==id);n+=b-p.clips.length});if(n)persist();try{if(ED.open)ED.paint()}catch(e){}}
  function clipRange(c,t){const D=Math.max(.1,(t.durationMs||0)/1e3);let a=c.in==null?(+t.trimIn||0):+c.in,b=c.out==null?(t.trimOut==null?D:+t.trimOut):+c.out;a=clamp(a,0,Math.max(0,D-.1));b=clamp(b,a+.1,D);return[a,b]}
  function segments(p){
    const out=[];let T0=0;const tt=T();
    ((p&&p.clips)||[]).forEach((c,ci)=>{const t=takeById(c.take);if(!t)return;const r=clipRange(c,t);let keep=[{s:r[0],e:r[1]}];
      if(p.useCuts!==false&&tt&&tt.buildKeep&&t.cuts&&t.cuts.length){try{const k=tt.buildKeep(Math.max(.1,t.durationMs/1e3),r[0],r[1],t.cuts);if(k&&k.length)keep=k}catch(e){}}
      keep.forEach(s=>{if(s.e-s.s<.05)return;out.push({ci:ci,clip:c,take:t,s:s.s,e:s.e,T0:T0});T0+=s.e-s.s})});
    out.total=T0;return out;
  }
  const SIZES=[["auto","Like the first clip"],["1080x1920","1080 × 1920 (Reel, Short)"],["1080x1080","1080 × 1080 (square)"],["1920x1080","1920 × 1080 (YouTube)"]];
  function outSize(p,segs){
    const m=/^(\d+)x(\d+)$/.exec(String(p&&p.size||""));if(m)return[+m[1],+m[2]];
    const t=segs&&segs[0]&&segs[0].take;const w=Math.round(t&&t.w||1080),h=Math.round(t&&t.h||1920);return[w-w%2,h-h%2];
  }
  function drawFrame(g,W,H,v,take,ct,p,Tp,noCallouts){
    g.fillStyle="#000";g.fillRect(0,0,W,H);
    if(v&&v.videoWidth){const vw=v.videoWidth,vh=v.videoHeight,k=Math.min(W/vw,H/vh),w=vw*k,h=vh*k;try{g.drawImage(v,(W-w)/2,(H-h)/2,w,h)}catch(e){}}
    try{const L=api()&&api().lc33;if(L&&L.drawCap&&take)L.drawCap(g,W,H,take,ct)}catch(e){}
    if(!noCallouts)((p&&p.callouts)||[]).forEach(c=>{try{drawCallout(g,W,H,c,Tp-c.t)}catch(e){}});
  }
  function mkVideo(src,muted){const v=document.createElement("video");v.playsInline=true;v.setAttribute("playsinline","");v.preload="auto";v.muted=!!muted;v.src=src;v.style.cssText="position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none";document.body.appendChild(v);return v}
  const once=(el,ev,ms)=>new Promise(r=>{let d=false;const f=()=>{if(d)return;d=true;el.removeEventListener(ev,f);r(true)};el.addEventListener(ev,f);if(ms)setTimeout(()=>{if(!d){d=true;el.removeEventListener(ev,f);r(false)}},ms)});
  async function loaded(v){
    if(v.readyState<1)await once(v,"loadedmetadata",9000);if(v.readyState<1)throw new Error("A take could not be opened on this device.");
    if(!isFinite(v.duration)){const p=once(v,"timeupdate",2500);try{v.currentTime=1e101}catch(e){}await p;try{v.currentTime=0}catch(e){}await once(v,"seeked",1500)}
  }
  async function seek(v,t){if(Math.abs(v.currentTime-t)<.015&&v.readyState>=2)return;const p=once(v,"seeked",4000);v.currentTime=t;await p}

  /* plays the project into a canvas: preview (speakers) or export (MediaRecorder). ctl.stopped ends it. */
  async function run(p,o){
    const segs=segments(p);if(!segs.length)throw new Error("Add at least one take to the timeline first.");
    const total=segs.total,sz=o.size||outSize(p,segs),W=sz[0],H=sz[1],cv=o.canvas,ctl=o.ctl||{};cv.width=W;cv.height=H;
    const g=cv.getContext("2d",{alpha:false});
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error("This browser has no Web Audio.");
    const ac=new AC();if(ac.state==="suspended"){try{await ac.resume()}catch(e){}}
    const master=ac.createGain();let dest=null;
    if(o.record){dest=ac.createMediaStreamDestination();master.connect(dest)}else master.connect(ac.destination);
    const vids={};let stream=null;
    try{
      for(const s of segs)if(!vids[s.take.id]){const v=mkVideo(s.take.url,false);await loaded(v);const node=ac.createMediaElementSource(v),gn=ac.createGain();gn.gain.value=0;node.connect(gn);gn.connect(master);vids[s.take.id]={v:v,gain:gn}}
      let mr=null;const chunks=[];let mime="";
      if(o.record){
        if(!window.MediaRecorder||!cv.captureStream)throw new Error("This browser cannot record video. Use Chrome or Edge on a computer.");
        try{mime=(T()&&T().pickMime&&T().pickMime())||""}catch(e){mime=""}
        stream=cv.captureStream(30);dest.stream.getAudioTracks().forEach(a=>stream.addTrack(a));
        const opts={videoBitsPerSecond:W*H>=19e5?12e6:8e6,audioBitsPerSecond:192e3};if(mime)opts.mimeType=mime;
        mr=new MediaRecorder(stream,opts);mr.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
      }
      let from=clamp(+o.from||0,0,Math.max(0,total-.05)),k=0;
      for(;k<segs.length-1;k++)if(from<segs[k].T0+(segs[k].e-segs[k].s))break;
      let prevT=from-1e-4;
      for(;k<segs.length&&!ctl.stopped;k++){
        const s=segs[k],V=vids[s.take.id],v=V.v,start=s.s+Math.max(0,from-s.T0);from=0;
        V.gain.gain.cancelScheduledValues(ac.currentTime);V.gain.gain.value=0;await seek(v,start);
        drawFrame(g,W,H,v,s.take,v.currentTime,p,s.T0+(v.currentTime-s.s));
        if(mr){if(mr.state==="inactive")mr.start(1000);else if(mr.state==="paused")mr.resume()}
        try{await v.play()}catch(e){throw new Error("The browser blocked playback. Press the button again.")}
        V.gain.gain.setTargetAtTime(1,ac.currentTime,.006);
        await new Promise(res=>{
          const step=()=>{
            if(ctl.stopped)return res();
            const ct=v.currentTime,Tp=s.T0+Math.max(0,ct-s.s);
            ((p.callouts)||[]).forEach(c=>{if(c.t>prevT&&c.t<=Tp+.001)sfx(c.sound,ac,master)});prevT=Tp;
            drawFrame(g,W,H,v,s.take,ct,p,Tp);
            if(o.onTime)try{o.onTime(Tp,total)}catch(e){}
            if(ct>=s.e-.035||v.ended)return res();
            requestAnimationFrame(step)};
          requestAnimationFrame(step)});
        V.gain.gain.setTargetAtTime(0,ac.currentTime,.004);try{v.pause()}catch(e){}
        if(mr&&mr.state==="recording")mr.pause();
      }
      let blob=null;
      if(mr&&mr.state!=="inactive"){if(mr.state==="paused")mr.resume();await new Promise(r=>setTimeout(r,150));const fin=new Promise(r=>{mr.onstop=r});mr.stop();await fin;if(!ctl.stopped)blob=new Blob(chunks,{type:(mime||"video/webm").split(";")[0]})}
      return{blob:blob,total:total,W:W,H:H,mime:mime};
    }finally{
      Object.keys(vids).forEach(id=>{try{vids[id].v.pause();vids[id].v.removeAttribute("src");vids[id].v.load();vids[id].v.remove()}catch(e){}});
      if(stream)stream.getTracks().forEach(t=>{try{t.stop()}catch(e){}});try{ac.close()}catch(e){}
    }
  }
  function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),6e4)}
  const slug=s=>String(s||"project").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"project";

  /* ---------- shared layer chrome (outside the Studio's shadow root, above everything) ---------- */
  function css(){
    if(Q("#lc79-css"))return;
    const st=document.createElement("style");st.id="lc79-css";st.textContent=[
      ".lc79-layer{position:fixed;inset:0;z-index:2147483000;background:#0A0B0E;color:#e5e7eb;font:14px/1.45 Sora,system-ui,-apple-system,Segoe UI,sans-serif;display:flex;flex-direction:column;overflow:hidden;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}",
      ".lc79-layer *{box-sizing:border-box}.lc79-layer button,.lc79-layer input,.lc79-layer select,.lc79-layer textarea{font:inherit;color:inherit}",
      ".lc79-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 12px;border-bottom:1px solid rgba(0,229,255,.18);background:#0d0f13}",
      ".lc79-top h2{margin:0 8px 0 4px;font-size:15px;font-weight:700;color:#fff;white-space:nowrap}",
      ".lc79-b{min-height:44px;min-width:44px;padding:0 14px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:#14171d;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-weight:600;white-space:nowrap}",
      ".lc79-b:hover{border-color:rgba(0,229,255,.55)}.lc79-b:focus-visible,.lc79-layer input:focus-visible,.lc79-layer select:focus-visible,.lc79-layer textarea:focus-visible{outline:2px solid #00E5FF;outline-offset:2px}",
      ".lc79-b[disabled]{opacity:.45;cursor:not-allowed}.lc79-b.pri{background:#00E5FF;color:#04141a;border-color:#00E5FF}.lc79-b.gold{background:#fbbf24;color:#0f172a;border-color:#fbbf24}.lc79-b.red{border-color:rgba(239,68,68,.6);color:#fca5a5}",
      ".lc79-b.sm{min-height:44px;padding:0 10px;font-size:13px}.lc79-grow{flex:1}",
      ".lc79-layer select,.lc79-layer input[type=text],.lc79-layer input[type=number],.lc79-layer textarea{background:#0f1217;border:1px solid rgba(255,255,255,.16);border-radius:10px;min-height:44px;padding:0 10px}",
      ".lc79-layer textarea{padding:10px;min-height:120px;width:100%;resize:vertical}.lc79-layer input[type=color]{width:52px;height:44px;border:1px solid rgba(255,255,255,.16);border-radius:10px;background:#0f1217;padding:3px}",
      ".lc79-layer input[type=range]{width:100%;min-height:32px;accent-color:#00E5FF}",
      ".lc79-body{flex:1;overflow:auto;-webkit-overflow-scrolling:touch}",
      ".lc79-hint{color:#94a3b8;font-size:12.5px}.lc79-err{color:#fca5a5}",
      /* projects editor */
      ".lc79-main{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:12px;padding:12px}",
      ".lc79-view{display:flex;flex-direction:column;gap:8px;min-width:0}",
      ".lc79-stagebox{position:relative;background:#000;border-radius:12px;display:flex;align-items:center;justify-content:center;height:min(56vh,640px);overflow:hidden;border:1px solid rgba(255,255,255,.08)}",
      ".lc79-stagebox canvas{max-width:100%;max-height:100%;display:block;touch-action:none}",
      ".lc79-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;color:#94a3b8}",
      ".lc79-trans{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lc79-time{font-variant-numeric:tabular-nums;color:#cbd5e1;min-width:110px}",
      ".lc79-insp{background:#0f1217;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px;align-self:start;max-height:calc(56vh + 60px);overflow:auto}",
      ".lc79-insp h3{margin:0;font-size:14px;color:#fff}.lc79-f{display:flex;flex-direction:column;gap:4px}.lc79-f>span{font-size:12px;color:#94a3b8}.lc79-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}",
      ".lc79-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".lc79-insp video{width:100%;max-height:220px;background:#000;border-radius:10px}",
      ".lc79-calls{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:0 12px 8px}",
      ".lc79-chip{min-height:44px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:#14171d;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px}",
      ".lc79-chip i{width:12px;height:12px;border-radius:50%;display:inline-block}.lc79-chip .x{min-width:28px;min-height:28px;border-radius:50%;border:0;background:rgba(255,255,255,.08);cursor:pointer;margin-right:-6px}",
      ".lc79-tl{margin:0 12px 12px;background:#0f1217;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;position:relative;user-select:none;-webkit-user-select:none}",
      ".lc79-track{position:relative;height:64px;border-radius:8px;background:rgba(255,255,255,.03);margin-top:6px;touch-action:pan-y}",
      ".lc79-track.co{height:40px}.lc79-tl-label{font-size:12px;color:#94a3b8;display:flex;justify-content:space-between}",
      ".lc79-clip{position:absolute;top:4px;bottom:4px;border-radius:8px;background:linear-gradient(#18323a,#11252b);border:1px solid rgba(0,229,255,.35);overflow:hidden;cursor:grab;display:flex;align-items:flex-end;padding:4px 6px;font-size:12px;font-weight:600;color:#e0f7fb;min-width:6px;background-size:cover;background-position:center}",
      ".lc79-clip span{background:rgba(5,7,10,.7);border-radius:6px;padding:1px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}",
      ".lc79-clip.sel{outline:2px solid #00E5FF;outline-offset:1px}.lc79-clip.drag{opacity:.55;cursor:grabbing}",
      ".lc79-co{position:absolute;top:5px;bottom:5px;border-radius:7px;cursor:grab;display:flex;align-items:center;padding:0 6px;font-size:11.5px;font-weight:700;overflow:hidden;white-space:nowrap;min-width:12px;color:#0f172a}",
      ".lc79-co.sel{outline:2px solid #fff;outline-offset:1px}",
      ".lc79-ph{position:absolute;top:22px;bottom:6px;width:2px;background:#ef4444;pointer-events:none;z-index:3}",
      ".lc79-ins{position:absolute;top:0;bottom:0;width:3px;background:#fbbf24;z-index:4;pointer-events:none}",
      ".lc79-arch{padding:0 12px 24px}.lc79-arch h3{font-size:14px;margin:4px 0 8px;color:#fff}",
      ".lc79-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}",
      ".lc79-card{background:#0f1217;border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}",
      ".lc79-card.used{border-color:rgba(0,229,255,.35)}.lc79-thumb{aspect-ratio:16/10;background:#05070a center/cover no-repeat;position:relative}",
      ".lc79-thumb b{position:absolute;left:6px;top:6px;font-size:11px;background:rgba(0,229,255,.9);color:#04141a;border-radius:6px;padding:1px 6px}",
      ".lc79-card .m{padding:6px 8px;font-size:12.5px}.lc79-card .m b{display:block;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".lc79-card .a{display:flex;gap:4px;padding:0 6px 6px}.lc79-card .a .lc79-b{flex:1;padding:0 6px}",
      ".lc79-busy{position:absolute;inset:0;background:rgba(5,7,10,.82);display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;z-index:9;text-align:center;padding:20px}",
      ".lc79-bar{width:min(420px,80%);height:8px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}.lc79-bar i{display:block;height:100%;background:#00E5FF;width:0}",
      /* Game-to-Script */
      ".lc79-ai{max-width:1080px;margin:0 auto;padding:12px;display:grid;gap:12px}",
      ".lc79-sec{background:#0f1217;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px}",
      ".lc79-sec h3{margin:0;font-size:15px;color:#fff}.lc79-sec h4{margin:0;font-size:13.5px;color:#e2e8f0}",
      ".lc79-games{display:grid;gap:6px}.lc79-game{display:flex;gap:8px;align-items:center;justify-content:space-between;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:6px 6px 6px 12px;font-size:13px}",
      ".lc79-case{display:grid;grid-template-columns:minmax(220px,320px) 1fr;gap:14px}.lc79-bd{width:100%;height:auto;border-radius:8px;display:block}",
      ".lc79-facts{display:grid;gap:8px}.lc79-fact{border-left:3px solid #00E5FF;padding:2px 0 2px 10px}.lc79-fact b{color:#fff}.lc79-fact.al{border-color:#f97316}.lc79-fact.wp{border-color:#38bdf8}.lc79-fact.mo{border-color:#ef4444}",
      ".lc79-q{display:grid;gap:6px;margin:0;padding:0;list-style:none}.lc79-q li{background:rgba(255,255,255,.03);border-radius:8px;padding:8px 10px}.lc79-q li b{color:#00E5FF;margin-right:6px}",
      ".lc79-alt{display:flex;gap:6px;flex-wrap:wrap}",
      ".lc79-pre{white-space:pre-wrap;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;background:#05070a;border-radius:10px;padding:10px;max-height:260px;overflow:auto;border:1px solid rgba(255,255,255,.08)}",
      "@media (max-width:900px){.lc79-main{grid-template-columns:1fr}.lc79-insp{max-height:none}.lc79-stagebox{height:46vh}.lc79-case{grid-template-columns:1fr}.lc79-top h2{width:100%}}",
      "@media (prefers-reduced-motion:reduce){.lc79-layer *{transition:none!important}}"
    ].join("\n");
    document.head.appendChild(st);
  }
  let layerStack=[];
  function openLayer(id,label,build){
    css();closeLayer(id,true);
    const el=document.createElement("div");el.id=id;el.className="lc79-layer";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label",label);
    document.body.appendChild(el);layerStack.push(id);
    try{history.pushState(Object.assign({},history.state||{},{lc79:id}),"")}catch(e){}
    document.documentElement.style.overflow="hidden";
    build(el);
    const f=Q("[data-autofocus]",el)||Q("button",el);if(f)try{f.focus({preventScroll:true})}catch(e){}
    return el;
  }
  function closeLayer(id,silent){
    const el=Q("#"+id);if(!el)return;
    try{if(el._close)el._close()}catch(e){}
    el.remove();layerStack=layerStack.filter(x=>x!==id);
    if(!layerStack.length)document.documentElement.style.overflow="";
    if(!silent){try{if(history.state&&history.state.lc79===id)history.back()}catch(e){}}
  }

  /* ---------- Edit Projects ---------- */
  const thumbs={};let thumbQ=Promise.resolve();
  function thumbOf(t,cb){
    if(thumbs[t.id])return cb(thumbs[t.id]);
    thumbQ=thumbQ.then(async()=>{if(thumbs[t.id])return cb(thumbs[t.id]);const v=mkVideo(t.url,true);
      try{await loaded(v);await seek(v,Math.min(Math.max(.2,+t.trimIn||0)+.6,Math.max(0,v.duration-.1)||.5));const c=document.createElement("canvas"),k=180/Math.max(v.videoWidth||16,v.videoHeight||9);c.width=Math.round((v.videoWidth||16)*k);c.height=Math.round((v.videoHeight||9)*k);c.getContext("2d").drawImage(v,0,0,c.width,c.height);thumbs[t.id]=c.toDataURL("image/jpeg",.7);cb(thumbs[t.id])}
      catch(e){}finally{v.remove()}});
  }
  const ED={open:false,el:null,T:0,playing:false,ctl:null,sel:null,busy:false,base:null,scrubTok:0,scrubV:{}};
  function openProjects(){
    if(!api()){say("Open the Creator Studio first.","err");return}
    if(!cur())newProject("Reel 1");
    ED.sel=null;ED.T=0;
    ED.el=openLayer("lc79-ed","Edit Studio projects",el=>{
      el.innerHTML='<header class="lc79-top"><button type="button" class="lc79-b" data-a="close" data-autofocus aria-label="Back to the Studio">← Studio</button><h2>Edit Studio · Projects</h2>'
        +'<select data-a="pick" aria-label="Project"></select><button type="button" class="lc79-b sm" data-a="new">New project</button><button type="button" class="lc79-b sm" data-a="rename">Rename</button><button type="button" class="lc79-b sm red" data-a="delproj">Delete project</button>'
        +'<span class="lc79-grow"></span><button type="button" class="lc79-b pri" data-a="export">Export video</button></header>'
        +'<div class="lc79-body"><div class="lc79-main"><div class="lc79-view"><div class="lc79-stagebox"><canvas aria-label="Project preview. When a callout is selected and the video is paused, drag it to place it."></canvas><div class="lc79-empty" hidden></div></div>'
        +'<div class="lc79-trans"><button type="button" class="lc79-b" data-a="home" aria-label="Back to the start">⏮</button><button type="button" class="lc79-b pri" data-a="play">▶ Play</button><span class="lc79-time" aria-live="off"></span><input type="range" data-a="scrub" min="0" max="1" step="0.01" value="0" aria-label="Project time" style="flex:1;min-width:140px"></div></div>'
        +'<aside class="lc79-insp" aria-label="Inspector"></aside></div>'
        +'<div class="lc79-calls" aria-label="Callouts"></div>'
        +'<div class="lc79-tl"><div class="lc79-tl-label"><span>Timeline: drag a clip to move it, tap to trim it</span><span data-tot></span></div><div class="lc79-track" data-track="clips" aria-label="Clips"></div><div class="lc79-tl-label" style="margin-top:6px"><span>Callouts</span></div><div class="lc79-track co" data-track="co" aria-label="Callouts on the timeline"></div><div class="lc79-ph"></div></div>'
        +'<div class="lc79-arch"><h3>Takes archive</h3><p class="lc79-hint" style="margin:0 0 8px">Every take on this device. Tap Add to put it at the end of the timeline, or drag it onto the timeline. Takes you do not use stay here.</p><div class="lc79-grid"></div></div></div>';
      el._close=()=>{stopPlay();ED.open=false;Object.keys(ED.scrubV).forEach(k=>{try{ED.scrubV[k].remove()}catch(e){}});ED.scrubV={}};
      el.addEventListener("click",onEdClick);el.addEventListener("change",onEdChange);el.addEventListener("input",onEdInput);
      bindTimeline(el);bindCanvas(el);
    });
    ED.open=true;ED.paint();
  }
  ED.paint=function(){if(!ED.el||!ED.el.isConnected)return;paintTop();paintCalls();paintTimeline();paintInsp();paintArchive();showFrame()};
  function paintTop(){
    const sel=Q('[data-a="pick"]',ED.el),d=db(),p=cur();
    sel.innerHTML=d.list.map(x=>'<option value="'+esc(x.id)+'"'+(p&&x.id===p.id?" selected":"")+'>'+esc(x.name)+'</option>').join("");
    const ex=Q('[data-a="export"]',ED.el);ex.disabled=!(p&&segments(p).length)||ED.busy;
  }
  function paintCalls(){
    const box=Q(".lc79-calls",ED.el);
    box.innerHTML='<button type="button" class="lc79-b gold" data-a="addco" data-pid="authority" title="Adds the authority callout at the playhead: an arrow to you and a ping">+ 2105 ELO Coach</button>'
      +allPresets().filter(x=>x.pid!=="authority").map(x=>'<span class="lc79-chip" role="group"><button type="button" class="lc79-chip" style="border:0;padding:0;min-height:44px;background:none" data-a="addco" data-pid="'+esc(x.pid)+'"><i style="background:'+esc(x.bg)+'"></i>+ '+esc(x.name)+'</button>'
        +(/^my-/.test(x.pid)?'<button type="button" class="x" data-a="delpreset" data-pid="'+esc(x.pid)+'" aria-label="Delete preset '+esc(x.name)+'">×</button>':'')+'</span>').join("")
      +'<button type="button" class="lc79-b sm" data-a="addco" data-pid="custom">+ Custom callout</button>';
  }
  function clipLens(p,segs){const L={};segs.forEach(s=>{L[s.ci]=(L[s.ci]||0)+(s.e-s.s)});return L}
  function paintTimeline(){
    const p=cur(),segs=segments(p),tot=segs.total||0,L=clipLens(p,segs),tr=Q('[data-track="clips"]',ED.el),co=Q('[data-track="co"]',ED.el);
    Q("[data-tot]",ED.el).textContent=tot?"Length "+fmt(tot):"";
    let x=0,html="";
    (p?p.clips:[]).forEach((c,ci)=>{const t=takeById(c.take);if(!t||!L[ci])return;const w=L[ci]/tot*100;
      html+='<div class="lc79-clip'+(ED.sel&&ED.sel.kind==="clip"&&ED.sel.id===c.id?" sel":"")+'" data-clip="'+esc(c.id)+'" role="button" tabindex="0" aria-label="Clip '+(ci+1)+': '+esc(t.name)+', '+fmt(L[ci])+'" style="left:'+x+'%;width:calc('+w+'% - 2px)'+(thumbs[t.id]?';background-image:url('+thumbs[t.id]+')':'')+'"><span>'+esc(t.name)+' · '+fmt(L[ci])+'</span></div>';
      x+=w;if(!thumbs[t.id])thumbOf(t,()=>{if(ED.open)paintTimeline()})});
    tr.innerHTML=html||'<div class="lc79-empty" style="position:static;height:100%">Add takes from the archive below.</div>';
    co.innerHTML=(p?p.callouts:[]).map(c=>{const l=tot?clamp(c.t/tot*100,0,100):0,w=tot?Math.max(1.5,c.dur/tot*100):10;
      return'<div class="lc79-co'+(ED.sel&&ED.sel.kind==="co"&&ED.sel.id===c.id?" sel":"")+'" data-co="'+esc(c.id)+'" role="button" tabindex="0" aria-label="Callout '+esc(c.text)+' at '+fmt(c.t)+'" style="left:'+l+'%;width:'+Math.min(w,100-l)+'%;background:'+esc(c.bg)+';color:'+esc(c.fg)+'">'+esc(c.text)+'</div>'}).join("");
    paintHead();
  }
  function paintHead(){
    const p=cur(),tot=segments(p).total||0,ph=Q(".lc79-ph",ED.el),tl=Q(".lc79-tl",ED.el),tr=Q('[data-track="clips"]',ED.el);
    if(ph&&tr&&tl){const r=tr.getBoundingClientRect(),r0=tl.getBoundingClientRect();ph.style.left=(r.left-r0.left+(tot?ED.T/tot:0)*r.width)+"px";ph.hidden=!tot}
    const tm=Q(".lc79-time",ED.el);if(tm)tm.textContent=fmt(ED.T)+" / "+fmt(tot);
    const sc=Q('[data-a="scrub"]',ED.el);if(sc){sc.max=String(Math.max(.01,tot));if(document.activeElement!==sc)sc.value=String(ED.T)}
    const pl=Q('[data-a="play"]',ED.el);if(pl)pl.textContent=ED.playing?"❚❚ Pause":"▶ Play";
  }
  function selected(){const p=cur();if(!p||!ED.sel)return null;if(ED.sel.kind==="clip")return p.clips.filter(c=>c.id===ED.sel.id)[0]||null;if(ED.sel.kind==="co")return p.callouts.filter(c=>c.id===ED.sel.id)[0]||null;if(ED.sel.kind==="take")return takeById(ED.sel.id);return null}
  const num=(f,v,step,min,max,lab)=>'<label class="lc79-f"><span>'+lab+'</span><input type="number" data-f="'+f+'" value="'+(+v).toFixed(2)+'" step="'+step+'" min="'+min+'"'+(max!=null?' max="'+max+'"':'')+'></label>';
  const rng=(f,v,min,max,step,lab)=>'<label class="lc79-f"><span>'+lab+'</span><input type="range" data-f="'+f+'" value="'+v+'" min="'+min+'" max="'+max+'" step="'+step+'"></label>';
  function paintInsp(){
    const box=Q(".lc79-insp",ED.el),p=cur(),it=selected();
    if(!p){box.innerHTML="";return}
    if(ED.sel&&ED.sel.kind==="clip"&&it){
      const t=takeById(it.take),r=clipRange(it,t),D=t.durationMs/1e3,i=p.clips.indexOf(it);
      box.innerHTML='<h3>Clip '+(i+1)+': '+esc(t.name)+'</h3><video controls playsinline preload="metadata" src="'+esc(t.url)+'" data-clipvid></video>'
        +'<div class="lc79-row"><button type="button" class="lc79-b sm" data-a="inhere">Start here</button><button type="button" class="lc79-b sm" data-a="outhere">End here</button></div>'
        +'<div class="lc79-two">'+num("in",r[0],.05,0,D,"Start (s)")+num("out",r[1],.05,0,D,"End (s)")+'</div>'
        +'<p class="lc79-hint" style="margin:0">Take length '+fmt(D)+'.'+(p.useCuts!==false&&t.cuts&&t.cuts.length?" The "+t.cuts.length+" cut"+(t.cuts.length===1?"":"s")+" you made in this take (silences, mistakes) are skipped.":"")+'</p>'
        +'<div class="lc79-row"><button type="button" class="lc79-b sm" data-a="mvl"'+(i<=0?" disabled":"")+'>← Earlier</button><button type="button" class="lc79-b sm" data-a="mvr"'+(i>=p.clips.length-1?" disabled":"")+'>Later →</button><button type="button" class="lc79-b sm" data-a="resetclip">Use the take’s trim</button><button type="button" class="lc79-b sm red" data-a="rmclip">Remove from timeline</button></div>';
      const v=Q("[data-clipvid]",box);v.addEventListener("loadedmetadata",()=>{try{v.currentTime=r[0]}catch(e){}},{once:true});
      return;
    }
    if(ED.sel&&ED.sel.kind==="co"&&it){
      const c=it;
      box.innerHTML='<h3>Callout</h3>'
        +'<label class="lc79-f"><span>Text</span><input type="text" data-f="text" maxlength="40" value="'+esc(c.text)+'"></label>'
        +'<label class="lc79-f"><span>Second line (optional)</span><input type="text" data-f="sub" maxlength="50" value="'+esc(c.sub||"")+'"></label>'
        +'<div class="lc79-two">'+num("t",c.t,.1,0,null,"Starts at (s)")+num("dur",c.dur,.1,.6,8,"Duration (s)")+'</div>'
        +'<div class="lc79-two"><label class="lc79-f"><span>Font</span><select data-f="font">'+FONT_NAMES.map(f=>'<option value="'+f[0]+'"'+(f[0]===c.font?" selected":"")+'>'+f[1]+'</option>').join("")+'</select></label>'
        +'<label class="lc79-f"><span>Sound</span><span class="lc79-row" style="flex-wrap:nowrap"><select data-f="sound" style="flex:1">'+SOUNDS.map(s=>'<option value="'+s[0]+'"'+(s[0]===c.sound?" selected":"")+'>'+s[1]+'</option>').join("")+'</select><button type="button" class="lc79-b sm" data-a="hear" aria-label="Play the sound">▶</button></span></label></div>'
        +'<div class="lc79-row"><label class="lc79-f"><span>Badge</span><input type="color" data-f="bg" value="'+esc(c.bg)+'"></label><label class="lc79-f"><span>Text</span><input type="color" data-f="fg" value="'+esc(c.fg)+'"></label><span class="lc79-grow">'+rng("scale",c.scale,.6,2,.05,"Size")+'</span></div>'
        +'<label class="lc79-row" style="min-height:44px"><input type="checkbox" data-f="arrow"'+(c.arrow?" checked":"")+' style="width:22px;height:22px"> Arrow</label>'
        +'<div class="lc79-row"><button type="button" class="lc79-b sm" data-a="aim" data-aim="camera">Point at me (camera)</button><button type="button" class="lc79-b sm" data-a="aim" data-aim="board">Point at the board</button></div>'
        +'<div class="lc79-two">'+rng("x",c.x,.05,.95,.01,"Badge left ↔ right")+rng("y",c.y,.05,.95,.01,"Badge top ↕ bottom")+rng("ax",c.ax,0,1,.01,"Arrow tip ↔")+rng("ay",c.ay,0,1,.01,"Arrow tip ↕")+'</div>'
        +'<p class="lc79-hint" style="margin:0">Paused? Drag the badge or the arrow tip on the preview.</p>'
        +'<div class="lc79-row"><button type="button" class="lc79-b sm" data-a="coat">Move to the playhead</button><button type="button" class="lc79-b sm" data-a="savepreset">Save as preset</button><button type="button" class="lc79-b sm red" data-a="rmco">Delete callout</button></div>';
      return;
    }
    if(ED.sel&&ED.sel.kind==="take"&&it){
      const used=p.clips.some(c=>c.take===it.id);
      box.innerHTML='<h3>'+esc(it.name)+'</h3><video controls playsinline preload="metadata" src="'+esc(it.url)+'"></video><p class="lc79-hint" style="margin:0">'+fmt(it.durationMs/1e3)+(it.captions&&it.captions.length?" · "+it.captions.length+" captions":"")+(used?" · in this project":"")+'</p>'
        +'<div class="lc79-row"><button type="button" class="lc79-b sm pri" data-a="addtake" data-take="'+esc(it.id)+'">Add to the timeline</button><button type="button" class="lc79-b sm red" data-a="deltake" data-take="'+esc(it.id)+'">Delete take</button></div>';
      return;
    }
    const segs=segments(p);
    box.innerHTML='<h3>Project</h3><label class="lc79-f"><span>Name</span><input type="text" data-f="pname" maxlength="60" value="'+esc(p.name)+'"></label>'
      +'<label class="lc79-f"><span>Video size</span><select data-f="size">'+SIZES.map(s=>'<option value="'+s[0]+'"'+(s[0]===(p.size||"auto")?" selected":"")+'>'+s[1]+'</option>').join("")+'</select></label>'
      +'<label class="lc79-row" style="min-height:44px"><input type="checkbox" data-f="useCuts"'+(p.useCuts!==false?" checked":"")+' style="width:22px;height:22px"> Skip the cuts made in each take (silences, marked mistakes)</label>'
      +'<p class="lc79-hint" style="margin:0">'+p.clips.length+' clip'+(p.clips.length===1?"":"s")+' · '+p.callouts.length+' callout'+(p.callouts.length===1?"":"s")+' · '+fmt(segs.total||0)+'</p>'
      +'<p class="lc79-hint" style="margin:0">Captions come from each take (Edit Studio: Write captions). The export plays the project once in real time, so it takes as long as the video. Keep this tab in front.</p>';
  }
  function paintArchive(){
    const g=Q(".lc79-grid",ED.el),p=cur(),list=takes();
    if(!list.length){g.innerHTML='<p class="lc79-hint">No takes on this device yet. Record one in the Studio (red button or R).</p>';return}
    g.innerHTML=list.map(t=>{const used=p&&p.clips.some(c=>c.take===t.id);
      return'<div class="lc79-card'+(used?" used":"")+'" draggable="true" data-take="'+esc(t.id)+'"><div class="lc79-thumb" data-th="'+esc(t.id)+'"'+(thumbs[t.id]?' style="background-image:url('+thumbs[t.id]+')"':'')+'>'+(used?"<b>In this project</b>":"")+'</div>'
        +'<div class="m"><b>'+esc(t.name)+'</b>'+fmt(t.durationMs/1e3)+(t.captions&&t.captions.length?" · captions":"")+'</div>'
        +'<div class="a"><button type="button" class="lc79-b sm" data-a="watch" data-take="'+esc(t.id)+'" aria-label="Watch '+esc(t.name)+'">▶</button><button type="button" class="lc79-b sm pri" data-a="addtake" data-take="'+esc(t.id)+'" aria-label="Add '+esc(t.name)+' to the timeline">+ Add</button><button type="button" class="lc79-b sm red" data-a="deltake" data-take="'+esc(t.id)+'" aria-label="Delete '+esc(t.name)+'">🗑</button></div></div>'}).join("");
    list.forEach(t=>{if(!thumbs[t.id])thumbOf(t,u=>{const el=Q('[data-th="'+t.id+'"]',ED.el);if(el)el.style.backgroundImage="url("+u+")"})});
  }
  function previewSize(p,segs){const s=outSize(p,segs),k=Math.min(1,720/Math.max(s[0],s[1]));return[Math.round(s[0]*k),Math.round(s[1]*k)]}
  /* a still frame at ED.T: the video + captions go to ED.base, the callouts are drawn on top (fast to redraw while dragging) */
  async function showFrame(){
    if(!ED.el||ED.playing)return;
    const p=cur(),segs=segments(p),cv=Q(".lc79-stagebox canvas",ED.el),em=Q(".lc79-empty",ED.el);
    if(!segs.length){const g=cv.getContext("2d");cv.width=360;cv.height=640;g.fillStyle="#000";g.fillRect(0,0,360,640);em.hidden=false;em.textContent="Your project is empty. Tap + Add on a take below.";return}
    em.hidden=true;ED.T=clamp(ED.T,0,segs.total);
    const s=segs.filter(x=>ED.T>=x.T0&&ED.T<x.T0+(x.e-x.s))[0]||segs[segs.length-1],ct=s.s+clamp(ED.T-s.T0,0,Math.max(0,s.e-s.s-.02));
    const tok=++ED.scrubTok;let v=ED.scrubV[s.take.id];
    try{if(!v){v=ED.scrubV[s.take.id]=mkVideo(s.take.url,true);await loaded(v)}await seek(v,ct)}catch(e){return}
    if(tok!==ED.scrubTok||ED.playing)return;
    const sz=previewSize(p,segs);if(!ED.base)ED.base=document.createElement("canvas");ED.base.width=sz[0];ED.base.height=sz[1];
    drawFrame(ED.base.getContext("2d"),sz[0],sz[1],v,s.take,ct,p,ED.T,true);compose();
  }
  function compose(){
    const cv=Q(".lc79-stagebox canvas",ED.el),p=cur();if(!cv||!ED.base||ED.playing)return;
    cv.width=ED.base.width;cv.height=ED.base.height;const g=cv.getContext("2d");g.drawImage(ED.base,0,0);
    (p.callouts||[]).forEach(c=>{let lt=ED.T-c.t;if(ED.sel&&ED.sel.kind==="co"&&ED.sel.id===c.id)lt=clamp(lt,.9,Math.max(.9,c.dur-.3));try{drawCallout(g,cv.width,cv.height,c,lt)}catch(e){}});
  }
  async function togglePlay(){
    if(ED.playing){stopPlay();return}
    const p=cur(),segs=segments(p);if(!segs.length){say("Add a take first.","err");return}
    if(ED.T>=segs.total-.05)ED.T=0;
    ED.playing=true;ED.ctl={stopped:false};paintHead();
    const cv=Q(".lc79-stagebox canvas",ED.el);
    try{await run(p,{canvas:cv,record:false,from:ED.T,size:previewSize(p,segs),ctl:ED.ctl,onTime:t=>{ED.T=t;paintHead()}})}
    catch(e){say(e.message||"Playback failed.","err",5000)}
    const ended=!ED.ctl.stopped;ED.playing=false;if(ended)ED.T=0;paintHead();showFrame();
  }
  function stopPlay(){if(ED.ctl)ED.ctl.stopped=true;ED.playing=false}
  async function exportProject(){
    const p=cur(),segs=segments(p);if(!segs.length||ED.busy)return;
    stopPlay();ED.busy=true;paintTop();
    const box=Q(".lc79-stagebox",ED.el),ov=document.createElement("div");ov.className="lc79-busy";ov.setAttribute("role","status");
    ov.innerHTML='<b style="color:#fff">Exporting “'+esc(p.name)+'”</b><div class="lc79-bar"><i></i></div><span class="lc79-hint">This plays the project once in real time ('+fmt(segs.total)+'). Keep this tab in front.</span><button type="button" class="lc79-b red">Cancel</button>';
    box.appendChild(ov);const bar=Q("i",ov),ctl={stopped:false};Q("button",ov).onclick=()=>{ctl.stopped=true};
    const off=document.createElement("canvas");
    try{
      const r=await run(p,{canvas:off,record:true,from:0,ctl:ctl,onTime:(t,tot)=>{bar.style.width=Math.round(t/tot*100)+"%"}});
      if(ctl.stopped||!r.blob){say("Export cancelled.","",2500)}
      else if(r.blob.size<2e3){say("The browser produced an empty video. Try Chrome or Edge on a computer.","err",6000)}
      else{
        const ext=/mp4/.test(r.blob.type)?"mp4":"webm";download(r.blob,slug(p.name)+"."+ext);
        try{const Tk=T().Takes;await Tk.add({id:"x"+uid(),name:p.name+" (export)",blob:r.blob,mime:r.blob.type||"video/webm",durationMs:r.total*1e3,w:r.W,h:r.H,fps:30,env:[],markers:[],cuts:[],trimIn:0,trimOut:r.total,createdAt:Date.now(),size:r.blob.size,onDisk:false,captions:[]})}catch(e){}
        say("Exported and downloaded. It is also in your takes archive.","ok",4500);
      }
    }catch(e){say(e.message||"Export failed.","err",6000)}
    off.width=off.height=1;ov.remove();ED.busy=false;ED.paint();
  }
  function addTake(id,at){
    const p=cur(),t=takeById(id);if(!p||!t)return;
    const c={id:uid(),take:id,in:null,out:null};
    if(at==null||at>=p.clips.length)p.clips.push(c);else p.clips.splice(Math.max(0,at),0,c);
    save(p);ED.sel={kind:"clip",id:c.id};ED.paint();
  }
  async function delTake(id){
    const t=takeById(id);if(!t)return;
    const n=db().list.filter(p=>p.clips.some(c=>c.take===id)).length;
    if(!confirm("Delete “"+t.name+"” for good?"+(n?" It is used in "+n+" project"+(n===1?"":"s")+" and will be removed there too.":"")+" This cannot be undone."))return;
    try{await T().Takes.remove(id)}catch(e){}
    delete thumbs[id];if(ED.scrubV[id]){try{ED.scrubV[id].remove()}catch(e){}delete ED.scrubV[id]}
    if(ED.sel&&ED.sel.id===id)ED.sel=null;takeGone(id);say("Take deleted.","",2000);
  }
  function addCallout(pid){
    const p=cur();if(!p)return;
    let pr=allPresets().filter(x=>x.pid===pid)[0];
    if(pid==="custom")pr={pid:"",text:"Your text",font:"sora",bg:"#00E5FF",fg:"#0A0B0E",sound:"ping",arrow:true,aim:"board",dur:2.4,scale:1};
    if(!pr)return;
    const tot=segments(p).total||0,t=tot?clamp(ED.T,0,Math.max(0,tot-.5)):0;
    const c=makeCallout(pr,t);p.callouts.push(c);p.callouts.sort((a,b)=>a.t-b.t);save(p);
    ED.sel={kind:"co",id:c.id};hear(c.sound);ED.paint();
  }
  function onEdClick(e){
    const b=e.target.closest("[data-a]");if(!b||b.tagName==="SELECT"||b.type==="range")return;
    const a=b.getAttribute("data-a"),p=cur(),it=selected();
    if(a==="close")return closeLayer("lc79-ed");
    if(a==="new"){const n=prompt("Name of the new project","Reel "+(db().list.length+1));if(n===null)return;newProject(n.trim()||null);ED.sel=null;ED.T=0;return ED.paint()}
    if(a==="rename"&&p){const n=prompt("Project name",p.name);if(n&&n.trim()){p.name=n.trim().slice(0,60);save(p);ED.paint()}return}
    if(a==="delproj"&&p){if(!confirm("Delete the project “"+p.name+"”? Your takes stay in the archive."))return;const d=db();d.list=d.list.filter(x=>x.id!==p.id);d.cur=d.list[0]?d.list[0].id:"";persist();if(!d.list.length)newProject("Reel 1");ED.sel=null;ED.T=0;return ED.paint()}
    if(a==="export")return exportProject();
    if(a==="play")return togglePlay();
    if(a==="home"){stopPlay();ED.T=0;paintHead();return showFrame()}
    if(a==="addtake")return addTake(b.getAttribute("data-take"));
    if(a==="deltake")return delTake(b.getAttribute("data-take"));
    if(a==="watch"){ED.sel={kind:"take",id:b.getAttribute("data-take")};paintInsp();const v=Q(".lc79-insp video",ED.el);if(v)try{v.focus()}catch(x){}return}
    if(a==="addco")return addCallout(b.getAttribute("data-pid"));
    if(a==="delpreset"){wr(PK,myPresets().filter(x=>x.pid!==b.getAttribute("data-pid")));return paintCalls()}
    if(!p||!it)return;
    if(ED.sel.kind==="clip"){
      const i=p.clips.indexOf(it),t=takeById(it.take),v=Q("[data-clipvid]",ED.el);
      if(a==="inhere"&&v){const r=clipRange(it,t);it.in=Math.min(v.currentTime,r[1]-.1)}
      else if(a==="outhere"&&v){const r=clipRange(it,t);it.out=Math.max(v.currentTime,r[0]+.1)}
      else if(a==="mvl"&&i>0)p.clips.splice(i-1,0,p.clips.splice(i,1)[0]);
      else if(a==="mvr"&&i<p.clips.length-1)p.clips.splice(i+1,0,p.clips.splice(i,1)[0]);
      else if(a==="resetclip"){it.in=null;it.out=null}
      else if(a==="rmclip"){p.clips.splice(i,1);ED.sel=null}
      else return;
      save(p);return ED.paint();
    }
    if(ED.sel.kind==="co"){
      if(a==="hear")return hear(it.sound);
      if(a==="aim"){const pt=aimPoint(b.getAttribute("data-aim"));it.arrow=true;it.ax=pt.x;it.ay=pt.y;it.x=clamp(pt.x<.5?pt.x+.27:pt.x-.27,.2,.8);it.y=clamp(pt.y-.15,.1,.88)}
      else if(a==="coat")it.t=+ED.T.toFixed(2);
      else if(a==="savepreset"){const n=prompt("Name of the preset",it.text);if(!n||!n.trim())return;const list=myPresets();list.push({pid:"my-"+uid(),name:n.trim().slice(0,30),text:it.text,sub:it.sub,font:it.font,bg:it.bg,fg:it.fg,sound:it.sound,arrow:it.arrow,aim:"keep",x:it.x,y:it.y,ax:it.ax,ay:it.ay,dur:it.dur,scale:it.scale});wr(PK,list.slice(-24));say("Preset saved. It is in the callout bar now.","ok",2500);return paintCalls()}
      else if(a==="rmco"){p.callouts=p.callouts.filter(c=>c!==it);ED.sel=null}
      else return;
      p.callouts.sort((x,y)=>x.t-y.t);save(p);return ED.paint();
    }
  }
  function onEdChange(e){
    const el=e.target,p=cur();
    if(el.matches('[data-a="pick"]')){stopPlay();db().cur=el.value;persist();ED.sel=null;ED.T=0;return ED.paint()}
    if(!p||!el.hasAttribute("data-f"))return;
    const f=el.getAttribute("data-f"),it=selected();
    if(f==="pname"){p.name=String(el.value||"").trim().slice(0,60)||p.name;save(p);return paintTop()}
    if(f==="size"){p.size=el.value;save(p);return showFrame()}
    if(f==="useCuts"){p.useCuts=el.checked;save(p);return ED.paint()}
    if(!it)return;
    if(ED.sel.kind==="clip"&&(f==="in"||f==="out")){const t=takeById(it.take),D=t.durationMs/1e3,r=clipRange(it,t),x=clamp(+el.value||0,0,D);if(f==="in")it.in=Math.min(x,r[1]-.1);else it.out=Math.max(x,r[0]+.1);save(p);return ED.paint()}
    if(ED.sel.kind==="co"){setCo(it,f,el);p.callouts.sort((a,b)=>a.t-b.t);save(p);paintTimeline();if(f==="t")return showFrame();return}
  }
  function setCo(c,f,el){
    if(f==="arrow")c.arrow=el.checked;
    else if(f==="text")c.text=String(el.value).slice(0,40);else if(f==="sub")c.sub=String(el.value).slice(0,50);
    else if(f==="font"||f==="sound"||f==="bg"||f==="fg")c[f]=el.value;
    else if(/^(t|dur|scale|x|y|ax|ay)$/.test(f)){const v=+el.value;if(Number.isFinite(v))c[f]=f==="t"?Math.max(0,v):f==="dur"?clamp(v,.6,8):f==="scale"?clamp(v,.5,2.2):clamp(v,0,1)}
  }
  let saveTo=0;
  function onEdInput(e){
    const el=e.target;
    if(el.matches('[data-a="scrub"]')){stopPlay();ED.T=+el.value||0;paintHead();return showFrame()}
    if(!el.hasAttribute("data-f")||!ED.sel||ED.sel.kind!=="co")return;
    const f=el.getAttribute("data-f");if(f==="t"||f==="dur")return;
    const c=selected();if(!c)return;setCo(c,f,el);compose();clearTimeout(saveTo);saveTo=setTimeout(()=>{save(cur());paintTimeline()},350);
  }
  function bindTimeline(el){
    const tl=Q(".lc79-tl",el);let d=null;
    const tTrack=()=>Q('[data-track="clips"]',el);
    tl.addEventListener("pointerdown",e=>{
      const p=cur(),tot=segments(p).total||0;if(!tot)return;
      const tr=tTrack(),r=tr.getBoundingClientRect(),clip=e.target.closest(".lc79-clip"),co=e.target.closest(".lc79-co");
      d={x0:e.clientX,moved:false,clip:clip,co:co,r:r,tot:tot,id:e.pointerId};
      if(co){const c=p.callouts.filter(x=>x.id===co.getAttribute("data-co"))[0];d.c=c;d.t0=c?c.t:0}
      try{tl.setPointerCapture(e.pointerId)}catch(x){}
    });
    tl.addEventListener("pointermove",e=>{
      if(!d)return;const dx=e.clientX-d.x0;if(!d.moved&&Math.abs(dx)<8)return;d.moved=true;
      if(d.clip){d.clip.classList.add("drag");let ins=Q(".lc79-ins",tl);if(!ins){ins=document.createElement("div");ins.className="lc79-ins";tl.appendChild(ins)}
        const idx=dropIndex(e.clientX);d.idx=idx;const bl=QA(".lc79-clip",tTrack()),r0=tl.getBoundingClientRect();
        const xx=idx>=bl.length?(bl.length?bl[bl.length-1].getBoundingClientRect().right:d.r.left):bl[idx].getBoundingClientRect().left;ins.style.left=(xx-r0.left-1)+"px"}
      else if(d.c){d.c.t=+clamp(d.t0+dx/d.r.width*d.tot,0,d.tot).toFixed(2);d.co.style.left=(d.c.t/d.tot*100)+"%"}
      else{ED.T=clamp((e.clientX-d.r.left)/d.r.width*d.tot,0,d.tot);paintHead()}
    });
    const end=e=>{
      if(!d)return;const p=cur(),dd=d;d=null;const ins=Q(".lc79-ins",tl);if(ins)ins.remove();
      if(dd.clip&&dd.moved&&dd.idx!=null){const id=dd.clip.getAttribute("data-clip"),i=p.clips.findIndex(c=>c.id===id);if(i>=0){let j=dd.idx;const c=p.clips.splice(i,1)[0];if(j>i)j--;p.clips.splice(j,0,c);save(p)}ED.sel={kind:"clip",id:id};return ED.paint()}
      if(dd.c&&dd.moved){p.callouts.sort((a,b)=>a.t-b.t);save(p);ED.sel={kind:"co",id:dd.c.id};ED.T=dd.c.t;paintTimeline();paintInsp();return showFrame()}
      if(dd.clip){const id=dd.clip.getAttribute("data-clip");ED.sel={kind:"clip",id:id};const s=segments(p).filter(x=>x.clip.id===id)[0];if(s){stopPlay();ED.T=s.T0}paintTimeline();paintInsp();return showFrame()}
      if(dd.co){ED.sel={kind:"co",id:dd.co.getAttribute("data-co")};const c=selected();if(c){stopPlay();ED.T=c.t}paintTimeline();paintInsp();return showFrame()}
      stopPlay();if(!dd.moved){ED.T=clamp((e.clientX-dd.r.left)/dd.r.width*dd.tot,0,dd.tot)}ED.sel=null;paintTimeline();paintInsp();showFrame();
    };
    tl.addEventListener("pointerup",end);tl.addEventListener("pointercancel",()=>{d=null;const ins=Q(".lc79-ins",tl);if(ins)ins.remove()});
    tl.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const c=e.target.closest(".lc79-clip,.lc79-co");if(!c)return;e.preventDefault();ED.sel=c.classList.contains("lc79-clip")?{kind:"clip",id:c.getAttribute("data-clip")}:{kind:"co",id:c.getAttribute("data-co")};paintTimeline();paintInsp()});
    function dropIndex(x){const bl=QA(".lc79-clip",tTrack());for(let i=0;i<bl.length;i++){const r=bl[i].getBoundingClientRect();if(x<r.left+r.width/2)return i}return bl.length}
    /* drag a take from the archive onto the timeline (mouse) */
    el.addEventListener("dragstart",e=>{const c=e.target.closest&&e.target.closest(".lc79-card");if(!c)return;try{e.dataTransfer.setData("text/plain","lc79:"+c.getAttribute("data-take"));e.dataTransfer.effectAllowed="copy"}catch(x){}});
    tl.addEventListener("dragover",e=>{e.preventDefault()});
    tl.addEventListener("drop",e=>{e.preventDefault();let v="";try{v=e.dataTransfer.getData("text/plain")}catch(x){}const m=/^lc79:(.+)$/.exec(v||"");if(m)addTake(m[1],dropIndex(e.clientX))});
  }
  function bindCanvas(el){
    const cv=Q(".lc79-stagebox canvas",el);let d=null;
    cv.addEventListener("pointerdown",e=>{
      if(ED.playing||!ED.sel||ED.sel.kind!=="co")return;const c=selected();if(!c)return;
      const r=cv.getBoundingClientRect(),fx=(e.clientX-r.left)/r.width,fy=(e.clientY-r.top)/r.height;
      const tip=c.arrow&&Math.hypot((fx-c.ax)*r.width,(fy-c.ay)*r.height)<36;d={c:c,tip:tip,r:r};try{cv.setPointerCapture(e.pointerId)}catch(x){}
      e.preventDefault();
    });
    cv.addEventListener("pointermove",e=>{if(!d)return;const fx=clamp((e.clientX-d.r.left)/d.r.width,0,1),fy=clamp((e.clientY-d.r.top)/d.r.height,0,1);if(d.tip){d.c.ax=fx;d.c.ay=fy}else{d.c.x=clamp(fx,.05,.95);d.c.y=clamp(fy,.05,.95)}compose()});
    const up=()=>{if(!d)return;d=null;save(cur());paintInsp()};cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);
  }

  /* ---------- Game-to-Script AI ---------- */
  const LN={M:"Move",S:"Specifics",P:"Priorities",C:"Calculation"};
  const WP={M:"Before every move, say what their last move changed and what it threatens.",S:"Name the pawn structure and the biggest weakness before you choose a plan.",P:"List your checks, captures and attacks, and theirs, before you choose a move.",C:"Calculate their best reply to your move before you play it."};
  const NAME={p:"pawn",n:"knight",b:"bishop",r:"rook",q:"queen",k:"king"},VAL={p:1,n:3,b:3,r:5,q:9,k:100};
  const THEME={mate:"mateIn2",fork:"fork",pin:"pin",skewer:"skewer",hanging:"hangingPiece",discovered:"discoveredAttack",capture:"hangingPiece",check:"exposedKing"};
  const FILES="abcdefgh";
  const uci=u=>({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||"q"});
  function withTurn(fen,c){const p=String(fen).split(" ");p[1]=c;p[3]="-";return p.join(" ")}
  function hitsFrom(fen,sq){
    try{const b=new Chess(fen),pc=b.get(sq);if(!pc)return[];const g=new Chess();if(!g.load(withTurn(fen,pc.color)))return[];
      return g.moves({square:sq,verbose:true}).filter(m=>m.captured).map(m=>({sq:m.to,type:m.captured}))}catch(e){return[]}
  }
  function lineBehind(fen,sq){ /* a slider on sq: the first and second piece on each of its lines (pin / skewer) */
    const b=new Chess(fen),pc=b.get(sq);if(!pc||!/[brq]/.test(pc.type))return null;
    const dirs=(pc.type==="b"?[]:[[1,0],[-1,0],[0,1],[0,-1]]).concat(pc.type==="r"?[]:[[1,1],[1,-1],[-1,1],[-1,-1]]);
    const f0=FILES.indexOf(sq[0]),r0=+sq[1];
    for(const d of dirs){let f=f0+d[0],r=r0+d[1],first=null;
      while(f>=0&&f<8&&r>=1&&r<=8){const s=FILES[f]+r,x=b.get(s);if(x){if(x.color===pc.color)break;if(!first)first={sq:s,type:x.type};else{return{a:first,b:{sq:s,type:x.type},kind:VAL[first.type]<VAL[x.type]?"pin":"skewer"}}}f+=d[0];r+=d[1]}
      }
    return null;
  }
  const list2=a=>a.length<2?a.join(""):a.slice(0,-1).join(", ")+" and "+a[a.length-1];
  function motifOf(g,it){
    const fen=g.fens[it.i];const mo=(id,label,txt)=>({id:id,label:label,text:txt,theme:THEME[id]||""});
    try{if(it.best){const a=new Chess(fen),m=a.move(uci(it.best));if(m&&a.in_checkmate())return mo("mate","Missed mate in 1",m.san+" was mate on the spot.")}}catch(e){}
    try{
      if(it.reply&&g.fens[it.i+1]){const b=new Chess(g.fens[it.i+1]),r=b.move(uci(it.reply));
        if(r){
          if(b.in_checkmate())return mo("mate","Allowed mate",r.san+" is checkmate.");
          const fr=b.fen(),check=b.in_check(),hits=hitsFrom(fr,r.to).filter(x=>VAL[x.type]>=3);
          if((check&&hits.length)||hits.length>=2)return mo("fork","Fork",r.san+" attacks "+list2(hits.filter(x=>!(check&&x.type==="k")).map(x=>"the "+NAME[x.type]+" on "+x.sq))+(check?" with check":"")+".");
          const lb=lineBehind(fr,r.to);if(lb&&VAL[lb.a.type]>=3&&(lb.b.type==="k"||VAL[lb.b.type]>=5||lb.kind==="skewer"))return mo(lb.kind,lb.kind==="pin"?"Pin":"Skewer",r.san+(lb.kind==="pin"?" pins the "+NAME[lb.a.type]+" on "+lb.a.sq+" to the "+NAME[lb.b.type]+".":" hits the "+NAME[lb.a.type]+" and wins the "+NAME[lb.b.type]+" behind it."));
          const moverHits=hitsFrom(fr,r.to).map(x=>x.sq),others=[];
          b.board().forEach((row,ri)=>row.forEach((x,fi)=>{if(x&&x.color===r.color&&FILES[fi]+(8-ri)!==r.to){hitsFrom(fr,FILES[fi]+(8-ri)).forEach(h=>{if(VAL[h.type]>=5&&moverHits.indexOf(h.sq)<0)others.push({from:FILES[fi]+(8-ri),h:h})})}}));
          if(others.length){const pre=new Chess(g.fens[it.i+1]);const before=hitsFrom(withTurn(pre.fen(),r.color),others[0].from).map(x=>x.sq);if(before.indexOf(others[0].h.sq)<0)return mo("discovered","Discovered attack",r.san+" opens a line: the "+NAME[(b.get(others[0].from)||{}).type||"q"]+" on "+others[0].from+" now hits the "+NAME[others[0].h.type]+" on "+others[0].h.sq+".")}
          if(r.captured&&VAL[r.captured]>=3){const back=b.moves({verbose:true}).some(m=>m.to===r.to);if(!back)return mo("hanging","Hanging piece",r.san+" takes the "+NAME[r.captured]+" and nothing can take back.")}
          if(check)return mo("check","Check with tempo",r.san+" is check and wins time.");
        }}
    }catch(e){}
    try{if(it.best){const a=new Chess(fen),m=a.move(uci(it.best));if(m){if(m.captured)return mo("capture","Missed a capture",m.san+" wins the "+NAME[m.captured]+".");const hs=hitsFrom(a.fen(),m.to).filter(x=>VAL[x.type]>=3);if((a.in_check()&&hs.length)||hs.length>=2)return mo("fork","Missed fork",m.san+" attacks "+list2(hs.map(x=>"the "+NAME[x.type]+" on "+x.sq))+".")}}}catch(e){}
    return mo("plan","Positional mistake","No direct tactic: the move gave up a key square, a plan or time.");
  }
  function pickAlarm(fen,color,letter){try{const al=LC61.detect(fen,color)||[];return al.filter(a=>a.letter===letter)[0]||al.filter(a=>a.id!=="loose")[0]||al[0]||null}catch(e){return null}}
  function hdr(pgn){const h={};String(pgn||"").replace(/\[(\w+)\s+"([^"]*)"\]/g,(m,k,v)=>{h[k]=v;return m});return h}
  function socratic(g,it,c){
    const fen=g.fens[it.i],prev=it.i>0?g.moves[it.i-1]:null,out=[];
    if(prev){const hs=hitsFrom(g.fens[it.i],prev.to);out.push(["M","What did "+prev.san+" change?",hs.length?"It attacks "+list2(hs.map(x=>"the "+NAME[x.type]+" on "+x.sq))+".":"It created no direct attack: look at what it allows next."])}
    out.push(["S","Which Alarm Signal is on the board?",c.alarm?c.alarm.label+": "+c.alarm.say:"No standard alarm: the danger was concrete, not structural."]);
    try{const b=new Chess(fen),ms=b.moves({verbose:true}),ck=ms.filter(m=>/\+|#/.test(m.san)).length,cp=ms.filter(m=>m.captured).length;out.push(["P","Which checks, captures and attacks did you have?",ck+" check"+(ck===1?"":"s")+" and "+cp+" capture"+(cp===1?"":"s")+"."+(it.bestSan?" The engine’s choice: "+it.bestSan+".":"")])}catch(e){}
    out.push(["C","What is their best reply to "+it.san+"?",it.replySan?it.replySan+". "+c.motif.text:"Check every forcing reply before you move."]);
    return out;
  }
  function trimmedPgn(g,it,plain){
    const h=g.headers||{},keep=["Event","Site","Date","White","Black","Result","WhiteElo","BlackElo"];
    let s=plain?"":keep.filter(k=>h[k]).map(k=>'['+k+' "'+String(h[k]).replace(/"/g,"'")+'"]').join("\n")+"\n\n";
    const last=Math.min(g.moves.length-1,it.i+1),parts=[];
    for(let i=0;i<=last;i++){const m=g.moves[i];let t=(m.color==="w"?m.num+". ":(i===0?m.num+"... ":""))+m.san;
      if(!plain&&i===it.i){t+=(it.cls==="blunder"?"??":"?");if(it.bestSan)t+=" ("+(m.color==="w"?m.num+". ":m.num+"... ")+it.bestSan+")";if(it.replySan)t+=" {Punished by "+it.replySan+"}"}
      parts.push(t)}
    return s+parts.join(" ")+(plain?"":" *");
  }
  function boardSVG(fen,orient,arrows){
    let b;try{b=new Chess(fen).board()}catch(e){return""}
    const L="#d9e2ec",D="#7b93a8",flip=orient==="b";let o='<svg class="lc79-bd" viewBox="0 0 8 8" role="img" aria-label="Chess position">';
    for(let r=0;r<8;r++)for(let f=0;f<8;f++){const x=flip?7-f:f,y=flip?7-r:r;o+='<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+((r+f)%2?D:L)+'"/>'}
    const xy=sq=>{const f=FILES.indexOf(sq[0]),r=8-(+sq[1]);return flip?[7-f+.5,7-r+.5]:[f+.5,r+.5]};
    for(let r=0;r<8;r++)for(let f=0;f<8;f++){const p=b[r][f];if(!p)continue;const x=flip?7-f:f,y=flip?7-r:r;let u="";try{u=pieceUrl(p.color+p.type.toUpperCase())}catch(e){}if(u)o+='<image href="'+esc(u)+'" x="'+x+'" y="'+y+'" width="1" height="1"/>'}
    (arrows||[]).forEach(a=>{if(!a||!a.from||!a.to)return;const s=xy(a.from),e=xy(a.to),dx=e[0]-s[0],dy=e[1]-s[1],l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l,hx=e[0]-ux*.42,hy=e[1]-uy*.42,nx=-uy,ny=ux;
      o+='<g opacity=".82"><line x1="'+s[0]+'" y1="'+s[1]+'" x2="'+hx+'" y2="'+hy+'" stroke="'+a.color+'" stroke-width=".17" stroke-linecap="round"/><polygon points="'+e[0]+","+e[1]+" "+(hx+nx*.28)+","+(hy+ny*.28)+" "+(hx-nx*.28)+","+(hy-ny*.28)+'" fill="'+a.color+'"/></g>'});
    return o+"</svg>";
  }
  async function fetchT(url,accept){const c=new AbortController(),t=setTimeout(()=>c.abort(),12e3);try{const r=await fetch(url,{headers:accept?{Accept:accept}:{},signal:c.signal});if(!r.ok)throw new Error("http "+r.status);return await r.text()}finally{clearTimeout(t)}}
  async function recentGames(site,user,n){
    user=String(user||"").trim();if(!/^[A-Za-z0-9_-]{2,30}$/.test(user))throw new Error("That name is not valid.");
    let pgns=[];
    if(site==="lichess"){const t=await fetchT("https://lichess.org/api/games/user/"+encodeURIComponent(user)+"?max="+n+"&clocks=false&opening=true","application/x-chess-pgn");pgns=LC80.scan.splitGames(t).pgns}
    else{const a=JSON.parse(await fetchT("https://api.chess.com/pub/player/"+encodeURIComponent(user.toLowerCase())+"/games/archives"));
      for(const mu of(a.archives||[]).slice(-3).reverse()){if(!/^https:\/\/api\.chess\.com\//.test(mu))continue;const j=JSON.parse(await fetchT(mu));(j.games||[]).slice().reverse().forEach(x=>{if(x&&x.pgn&&(!x.rules||x.rules==="chess")&&pgns.length<n)pgns.push(x.pgn)});if(pgns.length>=n)break}}
    return pgns.slice(0,n);
  }
  function ownAcct(){
    try{const c=Elo.acct("chesscom");if(c&&c.user)return{site:"chesscom",user:c.user}}catch(e){}
    try{const l=Elo.acct("lichess");if(l&&l.user)return{site:"lichess",user:l.user}}catch(e){}
    try{const u=App.profile&&(App.profile.chess_com_username||App.profile.cc);if(u)return{site:"chesscom",user:u}}catch(e){}
    return null;
  }
  const AI={pgn:"",side:"auto",g:null,items:null,list:[],ci:0,cs:null,sim:null,cloud:null,cancel:false,busy:false,who:"",games:[]};
  function openScript(){
    AI.cancel=false;
    openLayer("lc79-ai","Game-to-Script AI",el=>{
      el.innerHTML='<header class="lc79-top"><button type="button" class="lc79-b" data-a="close" data-autofocus aria-label="Back to the Studio">← Studio</button><h2>Game-to-Script AI</h2><span class="lc79-hint">PGN in, master prompt for Claude out. Stockfish runs on this device.</span></header><div class="lc79-body"><div class="lc79-ai"></div></div>';
      el._close=()=>{AI.cancel=true};
      el.addEventListener("click",onAiClick);el.addEventListener("change",onAiChange);
    });
    paintAi();
  }
  function aiBox(){return Q("#lc79-ai .lc79-ai")}
  function paintAi(){
    const box=aiBox();if(!box)return;const own=ownAcct();
    let h='<section class="lc79-sec" aria-labelledby="lc79-s1"><h3 id="lc79-s1">1. The game</h3>'
      +'<textarea data-f="pgn" aria-label="PGN" placeholder="Paste a PGN here: your own game or a student’s game.">'+esc(AI.pgn)+'</textarea>'
      +'<div class="lc79-row"><label class="lc79-b sm" style="position:relative;overflow:hidden">Open a .pgn file<input type="file" accept=".pgn,.txt,text/plain,application/x-chess-pgn" data-f="file" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>'
      +(own?'<button type="button" class="lc79-b sm" data-a="mine">My last games ('+esc(own.user)+')</button>':'')
      +'<select data-f="site" aria-label="Site"><option value="chesscom">Chess.com</option><option value="lichess">Lichess</option></select><input type="text" data-f="user" placeholder="Any player’s name" aria-label="Player name" style="width:170px"><button type="button" class="lc79-b sm" data-a="theirs">Their last games</button></div>'
      +'<div class="lc79-games" data-games>'+gamesHTML()+'</div>'
      +'<div class="lc79-row"><label class="lc79-f"><span>Whose mistakes?</span><select data-f="side"><option value="auto"'+(AI.side==="auto"?" selected":"")+'>Auto (my side, else the biggest mistake)</option><option value="w"'+(AI.side==="w"?" selected":"")+'>White</option><option value="b"'+(AI.side==="b"?" selected":"")+'>Black</option></select></label><span class="lc79-grow"></span><button type="button" class="lc79-b pri" data-a="analyse"'+(AI.busy?" disabled":"")+'>Find the crucial mistake</button></div><p class="lc79-hint" data-st aria-live="polite"></p></section>';
    if(AI.cs)h+=caseHTML();
    box.innerHTML=h;
  }
  function gamesHTML(){
    return(AI.games||[]).map((p,i)=>{const h=hdr(p);return'<div class="lc79-game"><span>'+esc((h.White||"?")+(h.WhiteElo?" ("+h.WhiteElo+")":"")+" vs "+(h.Black||"?")+(h.BlackElo?" ("+h.BlackElo+")":"")+" · "+(h.Result||"")+" · "+String(h.Date||h.UTCDate||"").replace(/\./g,"-"))+'</span><button type="button" class="lc79-b sm" data-a="usegame" data-i="'+i+'">Use this game</button></div>'}).join("");
  }
  function status(t,bad){const s=Q("#lc79-ai [data-st]");if(s){s.textContent=t||"";s.classList.toggle("lc79-err",!!bad)}}
  async function loadGames(site,user){
    status("Loading games…");
    try{AI.games=await recentGames(site,user,10);const g=Q("#lc79-ai [data-games]");if(g)g.innerHTML=gamesHTML();status(AI.games.length?"Pick a game.":"No games found for that name.",!AI.games.length)}
    catch(e){status("Could not load games ("+(e.message||"no connection")+"). Paste the PGN instead.",true)}
  }
  async function analyse(){
    const pgn=String(AI.pgn||"").trim();if(!pgn){status("Paste a PGN or pick a game first.",true);return}
    if(typeof LC80==="undefined"||!LC80.scan||typeof Engine==="undefined"){status("The analysis engine is not available in this build.",true);return}
    AI.busy=true;AI.cancel=false;AI.cs=null;AI.sim=null;AI.cloud=null;paintAi();status("Starting Stockfish…");
    try{
      const g=LC80.scan.parseGame(pgn);if(!g)throw new Error("That PGN could not be read, or it has fewer than 8 moves.");
      if(AI.side==="w"||AI.side==="b")g.color=AI.side;
      if(!(await Engine.load()))throw new Error("Stockfish could not start on this device.");
      const items=await LC80.scan.analyseGame(g,(k,t)=>status("Stockfish: move "+Math.ceil((k+1)/2)+" of "+Math.ceil(t/2)+"…"),()=>AI.cancel);
      let list=items.filter(it=>it.cls==="blunder"||it.cls==="mistake").sort((a,b)=>b.loss-a.loss);
      if(!list.length)list=items.filter(it=>it.cls==="inaccuracy").sort((a,b)=>b.loss-a.loss);
      if(!list.length)throw new Error("No mistake worth a video in this game. Try another one.");
      AI.g=g;AI.items=items;AI.list=list.slice(0,6);AI.ci=0;buildCase();
    }catch(e){if(!AI.cancel)status(e.message||"The analysis failed.",true);AI.busy=false;return}
    AI.busy=false;paintAi();status("");findSimilar();cloudEval();
  }
  function buildCase(){
    const g=AI.g,it=AI.list[AI.ci],fen=g.fens[it.i],color=it.color;
    const letter=it.k&&LN[it.k]?it.k:(it.cls==="blunder"?"M":"S"),al=pickAlarm(fen,color,letter),motif=motifOf(g,it);
    let action="";try{action=LC64.actionOf(al&&al.id,letter)}catch(e){action=WP[letter]}
    const h=g.headers||{},rating=+(color==="w"?h.WhiteElo:h.BlackElo)||0;
    const c={it:it,fen:fen,color:color,letter:letter,alarm:al,motif:motif,wp:WP[letter],action:action,rating:rating,student:color==="w"?(h.White||"White"):(h.Black||"Black"),
      opp:color==="w"?(h.Black||"Black"):(h.White||"White"),start:Math.max(1,(it.num||Math.ceil((it.i+1)/2))-3)};
    c.qs=socratic(g,it,c);c.pgn=trimmedPgn(g,it);
    const band=rating?Math.floor(rating/100)*100:0;
    if(!AI.who||AI.whoAuto)c.who=(band?"a player around "+band+" who":"a club player who")+" "+({fork:"keeps walking into forks",pin:"keeps getting pinned",skewer:"loses pieces to skewers",hanging:"leaves pieces hanging",discovered:"never sees discovered attacks",mate:"misses or allows mate",capture:"misses free material",check:"lets the opponent check with tempo",plan:"plays moves without a plan"}[motif.id]||"keeps losing the same way");
    if(c.who){AI.who=c.who;AI.whoAuto=true}
    AI.cs=c;
  }
  function caseHTML(){
    const c=AI.cs,it=c.it,arr=[{from:it.i!=null&&AI.g.moves[it.i].from,to:AI.g.moves[it.i].to,color:"#ef4444"}];
    if(it.best)arr.push({from:it.best.slice(0,2),to:it.best.slice(2,4),color:"#38bdf8"});
    const loss=Math.round(it.loss),mv=(c.color==="w"?it.num+". ":it.num+"... ");
    let h='<section class="lc79-sec" aria-labelledby="lc79-s2"><h3 id="lc79-s2">2. The crucial mistake</h3><div class="lc79-case"><div>'+boardSVG(c.fen,c.color,arr)+'<p class="lc79-hint" style="margin:6px 0 0">Red: the move played. Blue: the better move. '+esc(c.student)+' ('+(c.color==="w"?"White":"Black")+(c.rating?", "+c.rating:"")+').</p></div><div class="lc79-facts">'
      +'<div class="lc79-fact mo"><b>'+esc(mv+it.san)+(it.cls==="blunder"?"??":"?")+'</b>'+(it.bestSan?' Better: <b>'+esc(it.bestSan)+'</b>.':'')+' It cost about '+loss+'% win chance.</div>'
      +'<div class="lc79-fact mo"><b>Motif: '+esc(c.motif.label)+'.</b> '+esc(c.motif.text)+'</div>'
      +'<div class="lc79-fact al"><b>Alarm Signal:</b> '+(c.alarm?esc(c.alarm.label)+". "+esc(c.alarm.say):"none of the standard alarms; the error came from skipping an MSPC step.")+'</div>'
      +'<div class="lc79-fact wp"><b>Working Point ('+LN[c.letter]+'):</b> '+esc(c.wp)+'</div>'
      +'<div class="lc79-fact"><b>Action Step:</b> '+esc(c.action)+'</div>'
      +'<div class="lc79-fact" data-cloud>'+cloudHTML()+'</div></div></div>'
      +'<h4>The Socratic trim: the questions that would have saved the game</h4><ol class="lc79-q">'+c.qs.map(q=>'<li><b>'+q[0]+'</b>'+esc(q[1])+' <span class="lc79-hint">'+esc(q[2])+'</span></li>').join("")+'</ol>'
      +(AI.list.length>1?'<div class="lc79-row"><span class="lc79-hint">Other mistakes in this game:</span><div class="lc79-alt">'+AI.list.map((x,i)=>'<button type="button" class="lc79-b sm"'+(i===AI.ci?' aria-pressed="true" style="border-color:#00E5FF"':'')+' data-a="case" data-i="'+i+'">'+esc((x.color==="w"?x.num+". ":x.num+"... ")+x.san)+' · '+Math.round(x.loss)+'%</button>').join("")+'</div></div>':'')
      +'<h4>Trimmed game (the video starts at move '+c.start+')</h4><div class="lc79-pre" tabindex="0">'+esc(c.pgn)+'</div>'
      +'<div class="lc79-row"><button type="button" class="lc79-b sm" data-a="toboard">Load into the Studio board</button><button type="button" class="lc79-b sm" data-a="copypgn">Copy PGN</button></div></section>';
    h+='<section class="lc79-sec" aria-labelledby="lc79-s3"><h3 id="lc79-s3">3. A similar position for the re-hook</h3><div data-sim>'+simHTML()+'</div><div class="lc79-row"><button type="button" class="lc79-b sm" data-a="sim">Find another one</button></div></section>';
    h+='<section class="lc79-sec" aria-labelledby="lc79-s4"><h3 id="lc79-s4">4. Master prompt for Claude</h3><label class="lc79-f"><span>Who is the hook for? (one specific person)</span><input type="text" data-f="who" maxlength="140" value="'+esc(AI.who)+'"></label>'
      +'<div class="lc79-row"><button type="button" class="lc79-b pri" data-a="copyprompt">Copy master prompt for Claude</button><button type="button" class="lc79-b sm" data-a="showprompt">Show the prompt</button></div><div class="lc79-pre" data-prompt hidden tabindex="0"></div>'
      +'<label class="lc79-f"><span>Paste Claude’s script here</span><textarea data-f="answer" placeholder="Paste the script Claude wrote, then press Use as my script."></textarea></label><div class="lc79-row"><button type="button" class="lc79-b gold" data-a="usescript">Use as my script</button><span class="lc79-hint">It replaces the text in the Studio’s script panel and prompter.</span></div></section>';
    return h;
  }
  function cloudHTML(){const c=AI.cloud;if(!c)return'<span class="lc79-hint">Lichess cloud evaluation: checking…</span>';if(c.none)return'<span class="lc79-hint">Lichess cloud evaluation: this position is not in the Lichess cloud.</span>';return'<b>Lichess cloud agrees?</b> Best '+esc(c.san||c.uci)+', '+esc(c.ev)+' (depth '+c.depth+').'}
  function simHTML(){
    const s=AI.sim;if(!s)return'<p class="lc79-hint">Searching Lichess for a puzzle with the same motif…</p>';if(s.err)return'<p class="lc79-hint lc79-err">'+esc(s.err)+'</p>';
    return'<div class="lc79-case"><div>'+boardSVG(s.fen,s.side,s.last?[{from:s.last.from,to:s.last.to,color:"#ef4444"}]:[])+'</div><div class="lc79-facts"><div class="lc79-fact"><b>Lichess puzzle '+esc(s.id)+'</b>, rating '+s.rating+'. Themes: '+esc(s.themes.slice(0,5).join(", "))+'.</div><div class="lc79-fact">'+(s.side==="w"?"White":"Black")+' to move. Solution: <b>'+esc(s.solSan.join(" "))+'</b></div><div class="lc79-fact"><a href="https://lichess.org/training/'+esc(s.id)+'" target="_blank" rel="noopener" style="color:#38bdf8">Open on Lichess</a></div></div></div>';
  }
  async function findSimilar(){
    const c=AI.cs;if(!c)return;AI.sim=null;const box=Q("#lc79-ai [data-sim]");if(box)box.innerHTML=simHTML();
    try{
      const theme=c.motif.theme||LC64.themeFor(c.alarm&&c.alarm.id,c.letter),target=c.rating||((()=>{try{return LC64.rating()}catch(e){return 1500}})());
      const f=await LC64.liClosest(clamp(target,600,2800),theme),P=f&&LC64.puzzleFromJson(f.json);
      if(!P)throw new Error("none");
      const g=new Chess(P.fen),solSan=[];(P.solution||[]).slice(0,4).forEach(u=>{const m=g.move(uci(u));if(m)solSan.push(m.san)});
      AI.sim={id:P.id,rating:P.rating,themes:P.themes||[],fen:P.fen,side:P.side,last:P.last,solSan:solSan,theme:theme};
    }catch(e){AI.sim={err:"Lichess did not answer (or had no puzzle with this theme). Try again in a moment."}}
    const b2=Q("#lc79-ai [data-sim]");if(b2)b2.innerHTML=simHTML();
  }
  async function cloudEval(){
    const c=AI.cs;if(!c)return;
    try{const t=await fetchT("https://lichess.org/api/cloud-eval?fen="+encodeURIComponent(c.fen)+"&multiPv=1","application/json"),j=JSON.parse(t),pv=j.pvs&&j.pvs[0];
      if(!pv)throw new Error("none");const u=String(pv.moves||"").split(" ")[0];let san="";try{san=Engine.uciToSan(c.fen,u)}catch(e){}
      const ev=pv.mate!=null?"mate in "+Math.abs(pv.mate):((pv.cp>0?"+":"")+(pv.cp/100).toFixed(1)+" for White");AI.cloud={uci:u,san:san,ev:ev,depth:j.depth||0}}
    catch(e){AI.cloud={none:true}}
    const b=Q("#lc79-ai [data-cloud]");if(b)b.innerHTML=cloudHTML();
  }
  function buildPrompt(){
    const c=AI.cs,g=AI.g,it=c.it,h=g.headers||{},s=AI.sim&&!AI.sim.err?AI.sim:null,host=(location.host||"lanckrietchesstrainerhub.vercel.app");
    const mv=(c.color==="w"?it.num+". ":it.num+"... ")+it.san;
    return[
"You are my short-form video scriptwriter for Lanckriet Chess (YouTube Shorts, Instagram Reels, TikTok, Facebook Reels). Write ONE vertical video script of 30 to 45 seconds in spoken English, in my voice: direct, calm, coach-like. I am Kyenzo.",
"",
"FORMAT: for every beat give the spoken line, then [ON-SCREEN TEXT], [BOARD] and [CALLOUT] cues. Callouts I place in one tap in my editor: \"2105 ELO Coach\" (an arrow to me with a ping), \"Blunder!\", \"Alarm Signal\", \"Brilliant!\", \"Working Point\".",
"",
"AUTHORITY: do not spend a single word on who I am or on a greeting. At 0:00 write [CALLOUT: 2105 ELO Coach]: the screen carries the authority, the voice goes straight into the hook.",
"",
"FACTS YOU MAY USE (do not invent others):",
"- Kyenzo Lanckriet, certified chess coach, 2105 Rapid on Chess.com (top 0.1%), went from 355 to 2105 in 2 years and 10 months.",
"- A student gained +630 ELO in 6 weeks (585 to 1214).",
"- Method: MSPC (Move, Specifics, Priorities, Calculation) and Triple-T (Think, Theory, Trim). Alarm Signals tell you when to stop and run a Working Point.",
"",
"THE GAME (trimmed by Stockfish on my device):",
"- "+(h.White||"White")+(h.WhiteElo?" ("+h.WhiteElo+")":"")+" vs "+(h.Black||"Black")+(h.BlackElo?" ("+h.BlackElo+")":"")+(h.Result?", result "+h.Result:"")+(h.Site?", "+h.Site:"")+".",
"- The player we learn from: "+c.student+" ("+(c.color==="w"?"White":"Black")+(c.rating?", rated "+c.rating:"")+").",
"- The video starts at move "+c.start+". Trimmed PGN:",
c.pgn,
"- The crucial mistake: "+mv+(it.bestSan?" instead of "+it.bestSan:"")+", costing about "+Math.round(it.loss)+"% win chance. FEN before the mistake: "+c.fen,
"- The punishment: "+(it.replySan?it.replySan+". ":"")+c.motif.text,
"- Tactical motif: "+c.motif.label+".",
"- Alarm Signal on the board: "+(c.alarm?c.alarm.label+": "+c.alarm.say:"none of the standard alarms; the error came from skipping an MSPC step."),
"- Working Point ("+LN[c.letter]+"): "+c.wp,
"- Action Step for the next game: "+c.action,
"- The Socratic questions that would have saved the game:",
c.qs.map(q=>"  "+q[0]+": "+q[1]+" ("+q[2]+")").join("\n"),
(AI.cloud&&!AI.cloud.none?"- Lichess cloud evaluation: best "+(AI.cloud.san||AI.cloud.uci)+", "+AI.cloud.ev+" (depth "+AI.cloud.depth+").":""),
"- Similar position for the re-hook: "+(s?"Lichess puzzle "+s.id+" (rating "+s.rating+", themes "+s.themes.slice(0,5).join(", ")+"), "+(s.side==="w"?"White":"Black")+" to move, FEN "+s.fen+", solution "+s.solSan.join(" ")+", https://lichess.org/training/"+s.id:"(none found: use a position with the same motif, "+c.motif.label+")"),
"",
"TARGET VIEWER (the hook speaks to this one person): "+(AI.who||"a club player who keeps losing the same way"),
"",
"STRUCTURE (5 beats):",
"1. HOOK (0 to 3 s): talk to that ONE specific person, for example \"If you're around 1200 and you keep ...\". No greeting, no name, no channel intro. [CALLOUT: 2105 ELO Coach] runs on screen at the same time.",
"2. AHA MOMENT (3 to 15 s): show the position, ask the ONE Socratic question that would have saved the game, then reveal the Alarm Signal and the better move. [CALLOUT: Blunder!] on the mistake, [CALLOUT: Alarm Signal] when you name the alarm.",
"3. RE-HOOK (15 to 25 s): \"Now you try\" with the similar Lichess position: 2 seconds of silence on screen, then the answer.",
"4. YOUR NEXT GAME (25 to 35 s): the Working Point as one rule they can use in their very next game, plus the Action Step. [CALLOUT: Working Point].",
"5. CTA (35 to 45 s): one natural sentence inviting them to get their own last game analysed in the Lanckriet Chess app; the link in bio goes to the landing page ("+host+"). You may say \"no card needed\". Not salesy.",
"",
"Then give: 3 alternative hooks (each aimed at a specific person), a title of at most 60 characters, and 5 on-screen keywords.",
"",
"RULES: never use the words free, cheap, lifetime or forever; never promise a rating result; no comparisons with other chess sites, coaches or apps; use only the facts above; keep every spoken sentence short enough to read as a caption (about 8 words a line)."
    ].filter(x=>x!=="").join("\n");
  }
  async function copyText(t){
    try{await navigator.clipboard.writeText(t);return true}catch(e){}
    try{const a=document.createElement("textarea");a.value=t;a.style.cssText="position:fixed;left:-9999px";document.body.appendChild(a);a.select();const ok=document.execCommand("copy");a.remove();return ok}catch(e){return false}
  }
  async function onAiClick(e){
    const b=e.target.closest("[data-a]");if(!b||b.tagName==="SELECT")return;const a=b.getAttribute("data-a");
    if(a==="close")return closeLayer("lc79-ai");
    if(a==="mine"){const o=ownAcct();if(o)return loadGames(o.site,o.user)}
    if(a==="theirs"){const u=Q('#lc79-ai [data-f="user"]').value,s=Q('#lc79-ai [data-f="site"]').value;return loadGames(s,u)}
    if(a==="usegame"){AI.pgn=AI.games[+b.getAttribute("data-i")]||"";const t=Q('#lc79-ai [data-f="pgn"]');if(t)t.value=AI.pgn;return analyse()}
    if(a==="analyse"){const t=Q('#lc79-ai [data-f="pgn"]');AI.pgn=t?t.value:AI.pgn;return analyse()}
    if(a==="case"){AI.ci=+b.getAttribute("data-i")||0;AI.whoAuto=true;buildCase();AI.cloud=null;paintAi();findSimilar();cloudEval();return}
    if(a==="sim")return findSimilar();
    if(a==="copypgn"){const ok=await copyText(AI.cs.pgn);return say(ok?"PGN copied.":"Could not copy. Select the text and copy it.",ok?"ok":"err")}
    if(a==="toboard"){
      const B=api()&&api().board;if(!B){say("Open the Creator Studio first.","err");return}
      const r=B.loadPGN(trimmedPgn(AI.g,AI.cs.it,true));if(!r||!r.ok){say("The Studio board could not load this game.","err");return}
      try{B.goto(Math.max(0,AI.cs.it.i-(AI.cs.start>1?0:0)));if(B.orient!==AI.cs.color)B.flip()}catch(x){}
      say("Loaded: the Studio board shows the position before the mistake. Use the arrows on the board to step through.","ok",4500);return;
    }
    if(a==="showprompt"){const p=Q("#lc79-ai [data-prompt]");p.hidden=!p.hidden;if(!p.hidden)p.textContent=buildPrompt();b.textContent=p.hidden?"Show the prompt":"Hide the prompt";return}
    if(a==="copyprompt"){const t=buildPrompt(),ok=await copyText(t);const p=Q("#lc79-ai [data-prompt]");if(p&&!p.hidden)p.textContent=t;return say(ok?"Master prompt copied. Paste it into Claude.":"Could not copy. Press Show the prompt and copy it by hand.",ok?"ok":"err",3500)}
    if(a==="usescript"){const t=String((Q('#lc79-ai [data-f="answer"]')||{}).value||"").trim();if(!t){say("Paste Claude’s script first.","err");return}
      try{T().Script.set(t);say("Script set. Open Content Shooting to record with the prompter.","ok",4000)}catch(x){say("Open the Creator Studio first.","err")}return}
  }
  function onAiChange(e){
    const el=e.target,f=el.getAttribute("data-f");
    if(f==="pgn")AI.pgn=el.value;
    else if(f==="side")AI.side=el.value;
    else if(f==="who"){AI.who=String(el.value||"").slice(0,140);AI.whoAuto=false}
    else if(f==="file"&&el.files&&el.files[0]){const fl=el.files[0];if(fl.size>5e6){status("That file is too large (max 5 MB).",true);return}
      fl.text().then(t=>{let pg=[];try{pg=LC80.scan.splitGames(t).pgns}catch(x){pg=[t]}if(pg.length>1){AI.games=pg.slice(0,40);const g=Q("#lc79-ai [data-games]");if(g)g.innerHTML=gamesHTML();status(pg.length+" games in the file. Pick one.")}else{AI.pgn=pg[0]||t;const ta=Q('#lc79-ai [data-f="pgn"]');if(ta)ta.value=AI.pgn;status("Game loaded. Press Find the crucial mistake.")}})}
  }

  /* ---------- 5. Show Landing Page (CTA) ---------- */
  const CK="lc79-cta";
  const ctaS=()=>Object.assign({mode:"page",side:"right",scale:1,head:"Get your last game analysed",sub:"Lanckriet Chess",url:"",point:"Link in bio"},rd(CK,{})||{});
  let ctaOn=false,ctaAt=0,snap=null,snapAt=0,snapBusy=false,animUntil=0;
  function kick(ms){animUntil=performance.now()+(ms||450);const loop=()=>{dirty();if(performance.now()<animUntil)requestAnimationFrame(loop)};requestAnimationFrame(loop)}
  function ctaToggle(v){
    ctaOn=v==null?!ctaOn:!!v;ctaAt=performance.now();
    if(ctaOn&&ctaS().mode==="page"&&!snap)grabLanding();
    kick(500);paintCtaBtn();say(ctaOn?"Landing page on screen. Press L or the button to hide it.":"Landing page hidden.","",1800);
  }
  async function loadH2C(){
    if(window.html2canvas)return window.html2canvas;
    await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";s.crossOrigin="anonymous";s.referrerPolicy="no-referrer";s.onload=res;s.onerror=()=>rej(new Error("html2canvas"));document.head.appendChild(s)});
    if(!window.html2canvas)throw new Error("html2canvas");return window.html2canvas;
  }
  async function grabLanding(force){
    if(snapBusy)return;if(snap&&!force&&Date.now()-snapAt<15*6e4)return;
    snapBusy=true;paintCtaBtn();let fr=null;
    try{
      const h2c=await loadH2C();
      fr=document.createElement("iframe");fr.setAttribute("aria-hidden","true");fr.tabIndex=-1;fr.title="Landing page snapshot";
      fr.style.cssText="position:fixed;left:-10000px;top:0;width:390px;height:844px;border:0;opacity:0;pointer-events:none";
      const ld=new Promise((res,rej)=>{fr.onload=res;setTimeout(()=>rej(new Error("timeout")),15e3)});
      fr.src="/?preview=1&lc79=cta";document.body.appendChild(fr);await ld;
      await new Promise(r=>setTimeout(r,2600));
      const d=fr.contentDocument;if(!d||!d.body)throw new Error("blocked");
      try{QA(".lc72-edit",d).forEach(x=>x.remove())}catch(e){}
      const c=await h2c(d.body,{backgroundColor:"#0f172a",useCORS:true,allowTaint:false,scale:2,logging:false,width:390,height:844,windowWidth:390,windowHeight:844,x:0,y:0,scrollX:0,scrollY:0});
      if(!c||!c.width)throw new Error("empty");snap=c;snapAt=Date.now();
    }catch(e){snap=null;if(ctaOn)say("The landing page could not be captured, so the CTA card is shown. Check the connection and press Refresh in the CTA settings.","",5500)}
    finally{if(fr)fr.remove();snapBusy=false;paintCtaBtn();kick(300)}
  }
  function drawLive(ctx,W,H){
    if(!ctaOn||!(W>1&&H>1))return;
    const o=ctaS(),p=easeOut(clamp((performance.now()-ctaAt)/380,0,1)),port=H>=W,host=o.url||(location.host||"lanckrietchesstrainerhub.vercel.app");
    ctx.save();
    if(o.mode==="page"&&snap){
      const ph=H*(port?.58:.8)*clamp(+o.scale||1,.6,1.4),pw=ph*390/844,m=W*.05;
      let x=o.side==="left"?m:o.side==="center"?(W-pw)/2:W-pw-m;const y=(H-ph)/2-(port?H*.05:0);
      x+=(o.side==="left"?-1:1)*(1-p)*(pw+m*2);if(o.side==="center")x=(W-pw)/2;ctx.globalAlpha=o.side==="center"?p:1;
      const bz=pw*.04,rad=pw*.12;
      ctx.shadowColor="rgba(0,229,255,.35)";ctx.shadowBlur=pw*.12;rr(ctx,x-bz,y-bz,pw+bz*2,ph+bz*2,rad+bz);ctx.fillStyle="#05070a";ctx.fill();ctx.shadowBlur=0;ctx.shadowColor="transparent";
      ctx.lineWidth=Math.max(2,pw*.008);ctx.strokeStyle="rgba(255,255,255,.22)";ctx.stroke();
      ctx.save();rr(ctx,x,y,pw,ph,rad);ctx.clip();const sh=Math.min(snap.height,snap.width*844/390);ctx.drawImage(snap,0,0,snap.width,sh,x,y,pw,ph);ctx.restore();
      const fs=Math.round(pw*.075);ctx.font="700 "+fs+"px Sora,system-ui,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
      const lab=o.point||"",lw=ctx.measureText(lab).width+fs*1.4,ly=y+ph+bz+fs*1.3;
      if(lab){rr(ctx,x+pw/2-lw/2,ly-fs*.8,lw,fs*1.6,fs*.8);ctx.fillStyle="#fbbf24";ctx.fill();ctx.fillStyle="#0f172a";ctx.fillText(lab,x+pw/2,ly)}
      ctx.font="600 "+Math.round(fs*.7)+"px Sora,system-ui,sans-serif";ctx.fillStyle="#00E5FF";ctx.fillText(host,x+pw/2,ly+fs*1.55,Math.max(pw*1.5,W*.5));
    }else{
      const cw=Math.min(W*.86,port?W*.86:W*.42),fs=Math.round(cw*.07),pad=fs*.9,ch=pad*2+fs*1.25*2+fs*.9+fs*1.5,m=W*.05;
      let x=o.side==="left"?m:o.side==="center"?(W-cw)/2:W-cw-m;const y=port?H*.56:(H-ch)/2;ctx.globalAlpha=p;
      ctx.shadowColor="rgba(0,0,0,.5)";ctx.shadowBlur=fs;rr(ctx,x,y,cw,ch,fs*.6);ctx.fillStyle="rgba(10,11,14,.94)";ctx.fill();ctx.shadowBlur=0;ctx.shadowColor="transparent";
      ctx.lineWidth=Math.max(2,fs*.08);ctx.strokeStyle="#00E5FF";ctx.stroke();
      ctx.textAlign="left";ctx.textBaseline="top";ctx.fillStyle="#00E5FF";ctx.font="600 "+Math.round(fs*.62)+"px Sora,system-ui,sans-serif";ctx.fillText(o.sub||"Lanckriet Chess",x+pad,y+pad,cw-pad*2);
      ctx.fillStyle="#ffffff";ctx.font="800 "+fs+"px Sora,system-ui,sans-serif";ctx.fillText(o.head||"",x+pad,y+pad+fs*.95,cw-pad*2);
      ctx.fillStyle="#cbd5e1";ctx.font="600 "+Math.round(fs*.6)+"px Sora,system-ui,sans-serif";ctx.fillText(host,x+pad,y+pad+fs*2.25,cw-pad*2);
      if(o.point){ctx.font="700 "+Math.round(fs*.62)+"px Sora,system-ui,sans-serif";const lw=ctx.measureText(o.point).width+fs;rr(ctx,x+pad,y+ch-pad-fs*1.05,lw,fs*1.05,fs*.52);ctx.fillStyle="#fbbf24";ctx.fill();ctx.fillStyle="#0f172a";ctx.textBaseline="middle";ctx.fillText(o.point,x+pad+fs*.5,y+ch-pad-fs*.52)}
    }
    ctx.restore();
  }
  function paintCtaBtn(){
    const sr=studioRoot(),b=sr&&Q("#lc79-cta",sr);if(!b)return;
    b.setAttribute("aria-pressed",String(ctaOn));b.textContent=snapBusy&&ctaOn?"Capturing the landing page…":ctaOn?"Hide Landing Page (L)":"Show Landing Page (CTA)";
    b.classList.toggle("lc79-on",ctaOn);
  }
  function openCtaSettings(){
    openLayer("lc79-ctaset","Landing page CTA settings",el=>{
      const o=ctaS();
      el.innerHTML='<header class="lc79-top"><button type="button" class="lc79-b" data-a="close" data-autofocus aria-label="Back to the Studio">← Studio</button><h2>Landing page on screen</h2></header><div class="lc79-body"><div class="lc79-ai"><section class="lc79-sec">'
        +'<label class="lc79-f"><span>What to show</span><select data-f="mode"><option value="page"'+(o.mode==="page"?" selected":"")+'>The live landing page in a phone frame</option><option value="card"'+(o.mode==="card"?" selected":"")+'>A CTA card</option></select></label>'
        +'<label class="lc79-f"><span>Where</span><select data-f="side"><option value="right"'+(o.side==="right"?" selected":"")+'>Right (point to your left)</option><option value="left"'+(o.side==="left"?" selected":"")+'>Left</option><option value="center"'+(o.side==="center"?" selected":"")+'>Centre</option></select></label>'
        +'<label class="lc79-f"><span>Phone size</span><input type="range" data-f="scale" min="0.6" max="1.4" step="0.05" value="'+o.scale+'"></label>'
        +'<label class="lc79-f"><span>Label under it</span><input type="text" data-f="point" maxlength="30" value="'+esc(o.point)+'"></label>'
        +'<label class="lc79-f"><span>Card title</span><input type="text" data-f="head" maxlength="44" value="'+esc(o.head)+'"></label>'
        +'<label class="lc79-f"><span>Card top line</span><input type="text" data-f="sub" maxlength="40" value="'+esc(o.sub)+'"></label>'
        +'<label class="lc79-f"><span>Address shown (empty = this site)</span><input type="text" data-f="url" maxlength="60" value="'+esc(o.url)+'" placeholder="'+esc(location.host)+'"></label>'
        +'<div class="lc79-row"><button type="button" class="lc79-b sm" data-a="refresh">Refresh the landing page snapshot</button><span class="lc79-hint" data-snap>'+(snap?"Snapshot from "+new Date(snapAt).toLocaleTimeString():"No snapshot yet.")+'</span></div>'
        +'<p class="lc79-hint" style="margin:0">The snapshot is taken from your live landing page with “preview” on, so it does not count as a visit and your own Edit button is not in it. Never use the words free, cheap, lifetime or forever in these texts.</p></section></div></div>';
      el.addEventListener("click",async e=>{const b=e.target.closest("[data-a]");if(!b)return;if(b.getAttribute("data-a")==="close")return closeLayer("lc79-ctaset");if(b.getAttribute("data-a")==="refresh"){const s=Q("[data-snap]",el);s.textContent="Capturing…";await grabLanding(true);s.textContent=snap?"Snapshot from "+new Date(snapAt).toLocaleTimeString():"Could not capture the page. The CTA card is used."}});
      const upd=e=>{const f=e.target.getAttribute("data-f");if(!f)return;const o2=ctaS();o2[f]=f==="scale"?clamp(+e.target.value||1,.6,1.4):String(e.target.value||"").slice(0,60);if(/\b(free|cheap|lifetime|forever)\b/i.test(String(o2[f]))){say("Pick other words: free, cheap, lifetime and forever are not used.","err",3500);return}wr(CK,o2);kick(200)};
      el.addEventListener("input",upd);el.addEventListener("change",upd);
    });
  }

  /* ---------- 1. captions: tighten the live speech captions to the voice ---------- */
  function alignLive(caps,env,thr){
    if(!Array.isArray(caps)||!caps.length||!Array.isArray(env)||env.length<5)return caps;
    if(!Number.isFinite(thr)){try{thr=T().Trim.thr}catch(e){thr=-45}if(!Number.isFinite(thr))thr=-45}
    const dt=.1,n=env.length,D=n*dt,loud=env.map(d=>+d>=thr),on=[],off=[];
    for(let i=0;i<n;i++){if(loud[i]&&(i===0||!loud[i-1]))on.push(i*dt);if(!loud[i]&&i>0&&loud[i-1])off.push(i*dt)}
    if(loud[n-1])off.push(D);if(!on.length)return caps;
    const near=(arr,t,w)=>{let b=null,bd=w;arr.forEach(x=>{const d=Math.abs(x-t);if(d<=bd){bd=d;b=x}});return b};
    const isLoud=t=>{const i=Math.floor(t/dt+1e-6);return i>=0&&i<n&&loud[i]};
    const out=caps.map(c=>Object.assign({},c));
    out.forEach(c=>{const len=Math.max(.3,c.e-c.s);
      if(!isLoud(c.s+.05)){const o=near(on.filter(x=>x>=c.s-.6),c.s,.9);if(o!=null)c.s=o}
      const f=near(off,c.e,.6);if(f!=null&&f>c.s+.3)c.e=f+.08;
      if(c.e<c.s+.3)c.e=c.s+len;delete c.w});
    for(let i=1;i<out.length;i++){if(out[i].s<out[i-1].s+.2)out[i].s=out[i-1].s+.2;if(out[i-1].e>out[i].s-.02)out[i-1].e=Math.max(out[i-1].s+.2,out[i].s-.02)}
    out.forEach(c=>{c.s=+c.s.toFixed(2);c.e=+Math.max(c.s+.2,c.e).toFixed(2);if(c.e>D+.5)c.e=+Math.max(c.s+.2,D+.2).toFixed(2)});
    return out;
  }

  /* ---------- Studio wiring (shadow root) ---------- */
  const SR_CSS=".lc79-dockb{min-height:44px!important;padding:0 14px!important;border-radius:12px!important;font-weight:700!important}.lc79-dockb.lc79-on{background:#fbbf24!important;color:#0f172a!important;border-color:#fbbf24!important}"
    +".lc79-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px}.lc79-bar .btn{min-height:44px}.lc79-bar .lc79-go{background:#00E5FF;color:#04141a;border-color:#00E5FF;font-weight:700}"
    +".take-chip-w{display:inline-flex;align-items:stretch;gap:2px}.take-del{min-width:44px;min-height:44px;border-radius:10px;border:1px solid rgba(239,68,68,.45);background:rgba(239,68,68,.08);color:#fca5a5;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.take-del:hover{background:rgba(239,68,68,.2)}"
    +".lc79-opt{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;min-height:44px;padding:8px 12px;border:0;border-radius:8px;background:transparent;color:#e5e7eb;font:600 14px/1.2 inherit;text-align:left;cursor:pointer;border-top:1px solid rgba(255,255,255,.06)}.lc79-opt small{color:#94a3b8;font-weight:500;font-size:12px}.lc79-opt:hover,.lc79-opt:focus-visible{background:rgba(0,229,255,.1)}"
    +"#lc79-live{position:absolute;left:50%;transform:translateX(-50%);bottom:96px;z-index:70;max-width:min(680px,90%);padding:6px 14px;border-radius:10px;background:rgba(5,7,10,.82);color:#fff;font:600 15px/1.35 Sora,system-ui,sans-serif;pointer-events:none;text-align:center}#lc79-live small{display:block;color:#00E5FF;font-size:11px;font-weight:600}#lc79-live[hidden]{display:none}";
  function inject(){
    const sr=studioRoot();if(!sr)return;
    if(!Q("#lc79-srcss",sr)){const st=document.createElement("style");st.id="lc79-srcss";st.textContent=SR_CSS;sr.appendChild(st)}
    const dock=Q("#lc54-dock",sr);
    if(dock&&!Q("#lc79-cta",dock)){
      const b=document.createElement("button");b.type="button";b.id="lc79-cta";b.className="btn sm lc79-dockb";b.title="Show your landing page in the picture while you record the call to action (key L)";b.onclick=()=>ctaToggle();
      const s=document.createElement("button");s.type="button";s.className="btn sm lc79-dockb";s.textContent="⚙";s.setAttribute("aria-label","Landing page CTA settings");s.title="CTA settings";s.onclick=openCtaSettings;
      dock.appendChild(b);dock.appendChild(s);paintCtaBtn();
    }
    const tb=Q("#takes-body",sr);
    if(tb&&!Q(".lc79-bar",tb)){const bar=document.createElement("div");bar.className="lc79-bar";
      bar.innerHTML='<button type="button" class="btn lc79-go" data-lc79="projects">Open Projects: timeline, callouts, export</button><span class="hint">Put several takes after each other, add callouts and export one video per project.</span>';
      bar.querySelector("button").onclick=openProjects;tb.insertBefore(bar,tb.firstChild)}
    const sw=Q(".script-wrap",sr);
    if(sw&&!Q(".lc79-bar",sw)){const bar=document.createElement("div");bar.className="lc79-bar";
      bar.innerHTML='<button type="button" class="btn lc79-go">Game-to-Script AI</button><span class="hint">PGN in, crucial mistake, similar Lichess position and a master prompt for Claude.</span>';
      bar.querySelector("button").onclick=openScript;sw.insertBefore(bar,sw.firstChild)}
    const menu=Q(".lc66-menu",sr);
    if(menu&&!Q(".lc79-opt",menu)){
      [["projects","Edit Projects","Several reels, each with its own timeline, callouts and export",openProjects],["script","Game-to-Script AI","PGN to crucial mistake to master prompt for Claude",openScript]].forEach(o=>{
        const b=document.createElement("button");b.type="button";b.className="lc79-opt";b.setAttribute("role","menuitem");b.innerHTML=esc(o[1])+"<small>"+esc(o[2])+"</small>";
        b.onclick=e=>{e.stopPropagation();menu.hidden=true;const dd=Q(".lc66-dd",sr);if(dd)dd.setAttribute("aria-expanded","false");o[3]()};menu.appendChild(b)})}
    const lcs=Q("#lcs",sr);
    if(lcs&&!Q("#lc79-live",sr)){const d=document.createElement("div");d.id="lc79-live";d.hidden=true;d.setAttribute("aria-live","off");lcs.appendChild(d)}
  }
  function liveTick(){
    const sr=studioRoot(),d=sr&&Q("#lc79-live",sr);if(!d)return;
    let on=false,txt="";
    try{const a=api(),R=a.rec,L=a.lc33,S=L.settings();if(R&&(R.state==="recording")&&S.live&&L.live){on=true;const lv=L.live;txt=lv.pend&&lv.pend.t?lv.pend.t:(lv.lines.length?lv.lines[lv.lines.length-1].t:"")}}catch(e){}
    if(!on){d.hidden=true;return}
    d.hidden=false;const t=String(txt||"").split(" ").slice(-12).join(" ");d.innerHTML="<small>Live captions</small>"+esc(t||"Listening…");
  }
  let tickId=0,lastTick=0;
  function tick(){lastTick=Date.now();if(route()!=="studio"){clearInterval(tickId);tickId=0;return}try{inject()}catch(e){}try{liveTick()}catch(e){}}
  function afterRender(r){
    if(r!=="studio"){["lc79-ed","lc79-ai","lc79-ctaset"].forEach(id=>closeLayer(id,true));if(ctaOn){ctaOn=false}return}
    if(!tickId||Date.now()-lastTick>3000){clearInterval(tickId);tickId=setInterval(tick,400)}
    setTimeout(tick,60);
  }
  function init(){
    window.addEventListener("keydown",e=>{
      if(route()!=="studio"||e.ctrlKey||e.metaKey||e.altKey||layerStack.length)return;
      if(e.key!=="l"&&e.key!=="L")return;
      const t=(e.composedPath&&e.composedPath()[0])||e.target;if(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable))return;
      e.preventDefault();ctaToggle();
    });
    window.addEventListener("popstate",()=>{const top=layerStack[layerStack.length-1];if(top&&!(history.state&&history.state.lc79===top))closeLayer(top,true)});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&layerStack.length){const top=layerStack[layerStack.length-1];if(top==="lc79-ed"&&ED.busy)return;closeLayer(top)}});
    window.addEventListener("hashchange",()=>{if(route()!=="studio")["lc79-ed","lc79-ai","lc79-ctaset"].forEach(id=>closeLayer(id,true))});
  }
  return{init:init,afterRender:afterRender,drawLive:drawLive,alignLive:alignLive,takeGone:takeGone,openProjects:openProjects,openScript:openScript,openCtaSettings:openCtaSettings,ctaToggle:ctaToggle,
    segments:segments,run:run,drawCallout:drawCallout,makeCallout:makeCallout,motifOf:motifOf,socratic:socratic,trimmedPgn:trimmedPgn,buildPrompt:buildPrompt,boardSVG:boardSVG,sfx:sfx,
    BUILT:BUILT,db:db,newProject:newProject,_ai:AI,_ed:ED,grabLanding:grabLanding,state:()=>({ctaOn:ctaOn,snap:!!snap}),version:VERSION};
})(); /*@@end lc79*/
