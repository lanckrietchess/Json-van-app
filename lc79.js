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
        recorded picture, or a CTA card when the page cannot be captured. Key L toggles it in the Studio.
     Studio 2.0 NLE (Edit Studio, 9.41.x):
     6. Zero-stutter playback: two video decks (A/B). While one plays, the other is already loaded and seeked to the next clip, so a cut
        is a deck swap, not a seek. Pieces of the same take that follow each other play on one deck without any seek. Two video elements
        per playback whatever the length (4+ minute takes included), and the playhead UI repaints at 10 fps instead of every frame.
     7. Silence detection: right after a take stops, its level track (Web Audio RMS in dB, every 0.1 s, stored with every take) is
        scanned and every silence longer than 4.0 s becomes a cut of the take (ripple: the speech pieces sit straight after each other).
        "Cut silences" in the timeline does the same for the whole project with any threshold (1.5, 2.5, 4 s, slider 0.5 to 8 s).
        Takes without a level track (imports, exports) are measured by decoding their audio once.
     8. NLE timeline: Split / blade at the playhead (S), trim handles on both edges of every block, Delete / Backspace removes the block,
        Undo (Ctrl+Z), zoom and a time ruler. The timeline is magnetic by construction: clips are a list, so it never holds a gap.
     9. Caption box: captions are written after each take (live captions first, else the same engines as Write captions), they follow
        the cut blocks (they are timed on the take), and the box on the preview can be dragged, resized (corner or mouse wheel) and
        styled (background on/off, colour, opacity, text colour, outline, all caps, highlight of the spoken word).
     Script modes (9.42.0):
    10. Game-to-Script has two prompt buttons. "Get Prompt: Full Script" = the 9.39.1 data package + its closing line (unchanged).
        "Get Prompt: Bullet Points" = the same data + a PAWN CHECK block (undefended pieces and pawns before and after the mistake, with their
        attacker) + the RELEASE GIVEAWAY block (LC82.giveawayLine) and a closing block asking for a 5-part freestyle skeleton: the exact hook,
        2 to 3 core points incl. the pawn check, the aha moment of the Lichess puzzle in one line, the bridge / re-hook to the app, the giveaway CTA.
     Studio menu, devices, take review, layers (9.54.0):
    11. One visible menu bar under the Studio's own top bar: the sections (Script Studio, Scene Builder, Content Shooting, Takes & captions,
        Content Library, Free layout) as labelled tabs, then the tools (Edit Studio timeline, Game-to-Script, Devices, Live engine, CTA settings,
        Recording flow). The old "☰ Script Studio ▾" dropdown in the corner of the canvas and the ⚙ / Edit Studio buttons in the record dock are gone.
    12. Devices: pick the camera and the microphone (an external USB mic instead of the webcam mic) with a live level meter; the choice is saved
        (id + device name, so it is found again when the browser renews the id) and used for every take.
    13. Take review: when a take stops, one choice: "Send to project" (into the chosen project's timeline) or "Delete this take" (gone at once,
        so the archive does not fill with a thousand bad takes). "Decide later" keeps it in the archive only. Can be switched off in the pop-up.
    14. Layers in the Edit Studio: every block, every callout and the captions can be hidden (eye) without deleting them. Hidden layers are left
        out of the preview and the export. "Versions" save a set of hidden layers under a name (Reel A: CTA 1, Reel B: CTA 2) and
        "Export every version" renders them one after the other, so one take with two CTAs gives two reels without recording again.
    15. Live engine: a small Stockfish monitor on the Studio board (eval bar, the best line, and what the last move did to the eval),
        on this device only, never drawn into the recording.
     Edit Studio as a track editor (9.55.0):
    16. DaVinci-style page: media pool | viewer | inspector on top, the timeline below with a header per track. V1 = the video blocks,
        T1 = the captions (one block per caption line, on the project's timeline, so they follow every cut), V2, V3… = overlay tracks for
        callouts and CTAs (+ Track; a callout moves to another track by dragging it up or down, or in its inspector). The eye on a track hides
        it in the viewer AND the export; a version saves the hidden tracks too, so CTA 1 on V2 and CTA 2 on V3 give two reels from one take.
    17. Captions live here: CC on T1 writes them for every take that has none (Rewrite all, From script); a caption is fixed by clicking it on T1
        (text, timing, split, delete) and placed by dragging it in the viewer. Every take shows its caption state (writing / done / failed with
        the engine's own reason). Before, a failure was swallowed, and every message in the Edit Studio sat under it (toasts at z-index 90):
        LC79's messages now show inside the open layer. T1's eye replaces the old "Burn captions into Render edit" switch for this editor.
    18. ⬇ Download on every take in the media pool and in the take inspector. */
  const VERSION="9.55.0";
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  /* 9.55.0: the app's toasts sit at z-index 90, under the full-screen Edit Studio: every message there was invisible. Inside a layer the message shows in the layer itself. */
  const say=(m,k,ms)=>{try{const top=typeof layerStack!=="undefined"&&layerStack.length?document.getElementById(layerStack[layerStack.length-1]):null;
    if(top){let box=top.querySelector(".lc79-toasts");if(!box){box=document.createElement("div");box.className="lc79-toasts";box.setAttribute("role","status");box.setAttribute("aria-live","polite");top.appendChild(box)}
      const t=document.createElement("div");t.className="lc79-toast"+(k==="err"?" err":k==="ok"?" ok":"");t.textContent=String(m||"");box.appendChild(t);while(box.children.length>3)box.firstChild.remove();setTimeout(()=>{try{t.remove()}catch(e){}},ms||3200);return}
    toast(m,k||"",ms||3200)}catch(e){}};
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
    const padX=fs*.6,padY=fs*.36,bw=Math.max(tw,sw)+padX*2,bh=padY*2+fs*1.02+(c.sub?sfs*1.3:0),cx=bw+8>=W?W/2:clamp(c.x*W,bw/2+4,W-bw/2-4),cy=clamp(c.y*H,bh/2+4,H-bh/2-4);   /* 9.55.0: the badge always stays inside the frame (9:16 cut it off) */
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
  function persist(){wr(PJ,db());try{paintDock()}catch(e){}}
  function cur(){const d=db();let p=d.list.filter(x=>x.id===d.cur)[0];if(!p&&d.list.length){p=d.list[0];d.cur=p.id}return p||null}
  function newProject(name){const d=db();const p={id:uid(),name:String(name||("Reel "+(d.list.length+1))).slice(0,60),clips:[],callouts:[],tracks:[DEF_TRACK()],size:"auto",useCuts:true,created:Date.now(),updated:Date.now()};d.list.unshift(p);d.cur=p.id;persist();return p}
  function save(p){if(p)p.updated=Date.now();persist()}
  /* ---------- 9.55.0: tracks (DaVinci style). V1 = the video blocks, T1 = the captions, V2, V3… = overlay tracks for callouts and CTAs.
     A hidden track leaves the preview and the export; every callout sits on one track; a higher track draws on top of a lower one. ---------- */
  const DEF_TRACK=()=>({id:"o1",name:"V2 · Callouts"});
  function tracksOf(p){
    if(!p)return[];if(!Array.isArray(p.tracks)||!p.tracks.length)p.tracks=[DEF_TRACK()];
    const ids={};p.tracks.forEach(t=>{ids[t.id]=1});(p.callouts||[]).forEach(c=>{if(!c.track||!ids[c.track])c.track=p.tracks[0].id});
    return p.tracks;
  }
  const trackOf=(p,id)=>tracksOf(p).filter(t=>t.id===id)[0]||null;
  const coOn=(p,c)=>!!c&&!c.hidden&&!((trackOf(p,c.track)||{}).hidden);
  function coOrder(p){const ix={};tracksOf(p).forEach((t,i)=>{ix[t.id]=i});return((p&&p.callouts)||[]).slice().sort((a,b)=>(ix[a.track]||0)-(ix[b.track]||0))}
  function takeGone(id){const d=db();let n=0;d.list.forEach(p=>{const b=p.clips.length;p.clips=p.clips.filter(c=>c.take!==id);n+=b-p.clips.length});if(n)persist();try{if(ED.open)ED.paint()}catch(e){}}
  function clipRange(c,t){const D=Math.max(.1,(t.durationMs||0)/1e3);let a=c.in==null?(+t.trimIn||0):+c.in,b=c.out==null?(t.trimOut==null?D:+t.trimOut):+c.out;a=clamp(a,0,Math.max(0,D-.1));b=clamp(b,a+.1,D);return[a,b]}
  const durOf=t=>Math.max(.1,(+(t&&t.durationMs)||0)/1e3);

  /* ---------- NLE core (pure, unit-tested). Clips are an ordered list, so every split, trim and delete closes up on its own (magnetic ripple). ---------- */
  const SIL_DT=.1,SIL_PAD=.2;
  const lvAt=(env,i)=>{const x=env[i];return x==null||!Number.isFinite(+x)?-100:+x};
  /* the line between silence and voice: 35% of the way from the noise floor (10th percentile) to the voice (90th); the Studio's Trim threshold when the take is flat */
  function envThr(env,fb){
    fb=Number.isFinite(fb)?fb:-45;const v=(env||[]).map((x,i)=>lvAt(env,i)).filter(x=>x>-120).sort((a,b)=>a-b);if(v.length<10)return fb;
    const q=f=>v[Math.min(v.length-1,Math.floor(f*(v.length-1)))],lo=q(.1),hi=q(.9);if(hi-lo<10)return fb;
    return +clamp(lo+(hi-lo)*.35,-60,-28).toFixed(1);
  }
  /* quiet runs of at least minSec inside [from,to] (seconds of the take) */
  function findQuiet(env,thr,minSec,from,to,dt){
    dt=dt>0?dt:SIL_DT;const out=[],n=(env||[]).length,lo=from||0,hi=to==null?n*dt:to;let s=-1;
    for(let i=0;i<=n;i++){const q=i<n&&lvAt(env,i)<thr;if(q&&s<0)s=i;if(!q&&s>=0){const a=Math.max(s*dt,lo),b=Math.min(i*dt,hi);if(b-a>=minSec-1e-6)out.push({s:+a.toFixed(2),e:+b.toFixed(2)});s=-1}}
    return out;
  }
  /* the voice pieces of [a,b]: every silence >= minSec is removed, keeping `pad` seconds of air next to the voice (none at the outer edges) */
  function speechRanges(env,a,b,minSec,thr,pad,dt){
    pad=pad==null?SIL_PAD:pad;const keep=[];let cur=a;
    findQuiet(env,thr,minSec,a,b,dt).forEach(q=>{const cs=q.s<=a+1e-6?a:q.s+pad,ce=q.e>=b-1e-6?b:q.e-pad;if(ce-cs<.05)return;if(cs>cur)keep.push({s:cur,e:cs});cur=Math.max(cur,ce)});
    if(b-cur>.05)keep.push({s:cur,e:b});
    return keep.map(k=>({s:+k.s.toFixed(2),e:+k.e.toFixed(2)})).filter(k=>k.e-k.s>=.1);
  }
  /* seconds per level value: 0.1 s, stretched to the real length of the take when the recorder's timer drifted (a throttled tab) */
  function envDt(t){const n=t&&Array.isArray(t.env)?t.env.length:0,D=durOf(t);if(!n)return SIL_DT;const d=D/n;return Math.abs(d/SIL_DT-1)>.02?clamp(d,.05,.25):SIL_DT}
  function mergeR(rs){const a=(rs||[]).filter(r=>r&&r.e>r.s).map(r=>({s:+r.s,e:+r.e})).sort((x,y)=>x.s-y.s),out=[];a.forEach(r=>{const l=out[out.length-1];if(l&&r.s<=l.e+1e-6)l.e=Math.max(l.e,r.e);else out.push(r)});return out}
  /* ranges minus cuts */
  function minus(ranges,cuts){const cs=mergeR(cuts),out=[];(ranges||[]).forEach(r=>{let cur=r.s;cs.forEach(c=>{if(c.e<=cur||c.s>=r.e)return;if(c.s>cur)out.push({s:cur,e:c.s});cur=Math.max(cur,c.e)});if(r.e-cur>1e-6)out.push({s:cur,e:r.e})});return out.filter(r=>r.e-r.s>=.05)}
  /* [a,b] minus the keep ranges = the cuts */
  function complement(keep,a,b){const out=[];let cur=a;mergeR(keep).forEach(k=>{if(k.s>cur+1e-6)out.push({s:+cur.toFixed(2),e:+k.s.toFixed(2)});cur=Math.max(cur,k.e)});if(b>cur+1e-6)out.push({s:+cur.toFixed(2),e:+b.toFixed(2)});return out}
  /* the pieces a take adds to a timeline: its trim, minus its cuts (silences, marked mistakes), each piece one block */
  function clipsFor(t,p){const D=durOf(t),a=clamp(+t.trimIn||0,0,D),b=t.trimOut==null?D:clamp(+t.trimOut,a,D);
    const ks=(p&&p.useCuts===false)?[{s:a,e:b}]:minus([{s:a,e:b}],t.cuts||[]);return(ks.length?ks:[{s:a,e:b}]).map(k=>({id:uid(),take:t.id,in:+k.s.toFixed(3),out:+k.e.toFixed(3),raw:true}))}
  /* blade: one block becomes two at `at` seconds of the take */
  function splitClip(p,id,at){
    const i=p.clips.findIndex(c=>c.id===id);if(i<0)return null;const c=p.clips[i],t=takeById(c.take);if(!t)return null;
    const r=clipRange(c,t);if(!(at>r[0]+.05&&at<r[1]-.05))return null;
    const A=Object.assign({},c,{in:r[0],out:+at.toFixed(3)}),B=Object.assign({},c,{id:uid(),in:+at.toFixed(3),out:r[1]});
    p.clips.splice(i,1,A,B);return B.id;
  }
  function segAt(segs,Tt){return segs.filter(x=>Tt>=x.T0&&Tt<x.T0+(x.e-x.s))[0]||null}
  function splitAt(p,Tt){const s=segAt(segments(p),Tt);if(!s)return null;return splitClip(p,s.clip.id,s.s+(Tt-s.T0))}
  /* trim handle: side "l" sets the start, "r" the end (seconds of the take); never shorter than 0.1 s, never past the take */
  function trimClip(p,id,side,v){
    const c=p.clips.filter(x=>x.id===id)[0],t=c&&takeById(c.take);if(!t)return false;const r=clipRange(c,t),D=durOf(t);
    if(side==="l")c.in=+clamp(+v||0,0,r[1]-.1).toFixed(3);else{c.out=+clamp(+v||0,r[0]+.1,D).toFixed(3);if(c.in==null)c.in=r[0]}
    if(c.out==null)c.out=r[1];return true;
  }
  function deleteClip(p,id){const n=p.clips.length;p.clips=p.clips.filter(c=>c.id!==id);return p.clips.length<n}
  /* ripple-delete every silence >= minSec in every block of the project. Takes need a level track (t.env); others are skipped. */
  function cutSilences(p,minSec,thrFb){
    const before=segments(p).total||0,out=[];let n=0,skipped=0;
    p.clips.forEach(c=>{const t=takeById(c.take);if(!t){return}
      if(!Array.isArray(t.env)||t.env.length<5){skipped++;out.push(c);return}
      const r=clipRange(c,t),base=(c.raw||p.useCuts===false)?[{s:r[0],e:r[1]}]:minus([{s:r[0],e:r[1]}],t.cuts||[]),thr=envThr(t.env,thrFb);
      const pieces=[];base.forEach(b=>speechRanges(t.env,b.s,b.e,minSec,thr,null,envDt(t)).forEach(k=>pieces.push(k)));
      if(pieces.length===1&&base.length===1&&Math.abs(pieces[0].s-r[0])<.01&&Math.abs(pieces[0].e-r[1])<.01){out.push(c);return}
      n+=Math.max(0,complement(pieces,r[0],r[1]).length-complement(base,r[0],r[1]).length);
      pieces.forEach((k,j)=>out.push(Object.assign({},c,{id:j?uid():c.id,in:k.s,out:k.e,raw:true})))});
    p.clips=out;const after=segments(p).total||0;
    return{removed:+Math.max(0,before-after).toFixed(2),places:n,skipped:skipped,total:after};
  }
  function segments(p){
    const out=[];let T0=0;const tt=T();
    ((p&&p.clips)||[]).forEach((c,ci)=>{if(c.hidden)return;const t=takeById(c.take);if(!t)return;const r=clipRange(c,t);let keep=[{s:r[0],e:r[1]}];
      if(!c.raw&&p.useCuts!==false&&t.cuts&&t.cuts.length){try{const k=tt&&tt.buildKeep?tt.buildKeep(durOf(t),r[0],r[1],t.cuts):minus([{s:r[0],e:r[1]}],t.cuts);if(k&&k.length)keep=k}catch(e){}}
      keep.forEach(s=>{if(s.e-s.s<.05)return;out.push({ci:ci,clip:c,take:t,s:s.s,e:s.e,T0:T0});T0+=s.e-s.s})});
    out.total=T0;return out;
  }
  const SIZES=[["auto","Like the first clip"],["1080x1920","1080 × 1920 (Reel, Short)"],["1080x1080","1080 × 1080 (square)"],["1920x1080","1920 × 1080 (YouTube)"]];
  function outSize(p,segs){
    const m=/^(\d+)x(\d+)$/.exec(String(p&&p.size||""));if(m)return[+m[1],+m[2]];
    const t=segs&&segs[0]&&segs[0].take;const w=Math.round(t&&t.w||1080),h=Math.round(t&&t.h||1920);return[w-w%2,h-h%2];
  }
  /* ---------- caption box (per project: place, size and style; the text and timing stay on the take, so captions follow every cut) ---------- */
  const CAP_DEF={x:.5,y:0,scale:1,w:.86,box:true,bg:"#05070a",bgA:.72,fg:"#ffffff",stroke:false,sc:"#000000",upper:false,font:"sora",karaoke:false,hl:"#fbbf24"};
  function capStyle(p,W,H){const s=Object.assign({},CAP_DEF,(p&&p.cap)||{});if(!(+s.y>0))s.y=W<H?.78:.86;return s}
  function capLine(take,ct){if(!take||!Array.isArray(take.captions))return null;   /* 9.55.0: T1's eye decides (capsOff), not the old Render-edit switch */return take.captions.filter(c=>ct>=c.s&&ct<c.e)[0]||null}
  /* draws one caption line in its box; returns the box (canvas pixels) for dragging */
  function drawCaption(g,W,H,line,st,ct){
    if(!line||!String(line.t||"").trim())return null;
    const size=Math.max(8,Math.round(Math.min(W,H)*(W<H?.052:.04)*clamp(+st.scale||1,.4,3)));
    g.save();g.font=(FONTS[st.font]||FONTS.sora).replace("{s}",size);g.textAlign="left";g.textBaseline="middle";
    let words=null;try{const L=api()&&api().lc33;if(st.karaoke&&L&&L.wordTimes&&line.s!=null)words=L.wordTimes(line)}catch(e){words=null}
    if(!Array.isArray(words)||!words.length)words=String(line.t).split(/\s+/).filter(Boolean).map(t=>({t:t}));
    words=words.map(x=>({t:x.t,s:x.s,e:x.e,d:st.upper?String(x.t).toUpperCase():String(x.t)}));
    const sp=g.measureText(" ").width,maxW=W*clamp(+st.w||.86,.3,.98),rows=[];let cur=[],cw=0;
    words.forEach(x=>{x.w=g.measureText(x.d).width;if(cur.length&&cw+sp+x.w>maxW){rows.push({ws:cur,w:cw});cur=[];cw=0}cw+=(cur.length?sp:0)+x.w;cur.push(x)});if(cur.length)rows.push({ws:cur,w:cw});
    const lh=size*1.28,bh=rows.length*lh+size*.5,bw=Math.min(W-4,Math.max.apply(null,rows.map(r=>r.w))+size*1.1);
    const x0=clamp(clamp(+st.x,0,1)*W-bw/2,2,Math.max(2,W-bw-2)),y0=clamp(clamp(+st.y,0,1)*H-bh/2,2,Math.max(2,H-bh-2)),cx=x0+bw/2;
    if(st.box){g.globalAlpha=clamp(+st.bgA,0,1);g.fillStyle=st.bg||"#05070a";rr(g,x0,y0,bw,bh,size*.4);g.fill();g.globalAlpha=1}
    else if(!st.stroke){g.shadowColor="rgba(0,0,0,.85)";g.shadowBlur=size*.35}
    rows.forEach((row,i)=>{let x=cx-row.w/2;const y=y0+size*.25+lh*(i+.5);
      row.ws.forEach(wd=>{if(st.stroke){g.lineJoin="round";g.lineWidth=Math.max(2,size*.16);g.strokeStyle=st.sc||"#000";g.strokeText(wd.d,x,y)}
        g.fillStyle=st.karaoke&&wd.s!=null&&ct>=wd.s&&ct<wd.e?(st.hl||"#fbbf24"):(st.fg||"#fff");g.fillText(wd.d,x,y);x+=wd.w+sp})});
    g.restore();return{x:x0,y:y0,w:bw,h:bh,size:size};
  }
  function drawFrame(g,W,H,v,take,ct,p,Tp,noOverlay){
    g.fillStyle="#000";g.fillRect(0,0,W,H);
    if(v&&v.videoWidth){const vw=v.videoWidth,vh=v.videoHeight,k=Math.min(W/vw,H/vh),w=vw*k,h=vh*k;try{g.drawImage(v,(W-w)/2,(H-h)/2,w,h)}catch(e){}}
    if(noOverlay)return;
    if(!(p&&p.capsOff))try{drawCaption(g,W,H,capLine(take,ct),capStyle(p,W,H),ct)}catch(e){}
    if(p)coOrder(p).forEach(c=>{if(!coOn(p,c))return;try{drawCallout(g,W,H,c,Tp-c.t)}catch(e){}});
  }
  function mkVideo(src,muted){const v=document.createElement("video");v.playsInline=true;v.setAttribute("playsinline","");v.preload="auto";v.muted=!!muted;if(src)v.src=src;v.style.cssText="position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none";document.body.appendChild(v);return v}
  const once=(el,ev,ms)=>new Promise(r=>{let d=false;const f=()=>{if(d)return;d=true;el.removeEventListener(ev,f);r(true)};el.addEventListener(ev,f);if(ms)setTimeout(()=>{if(!d){d=true;el.removeEventListener(ev,f);r(false)}},ms)});
  async function loaded(v){
    if(v.readyState<1)await once(v,"loadedmetadata",9000);if(v.readyState<1)throw new Error("A take could not be opened on this device.");
    if(!isFinite(v.duration)){const p=once(v,"timeupdate",2500);try{v.currentTime=1e101}catch(e){}await p;try{v.currentTime=0}catch(e){}await once(v,"seeked",1500)}
  }
  async function seek(v,t){if(Math.abs(v.currentTime-t)<.015&&v.readyState>=2)return;const p=once(v,"seeked",4000);v.currentTime=t;await p}

  /* plays the project into a canvas: preview (speakers) or export (MediaRecorder). ctl.stopped ends it.
     Two decks: the next clip is loaded and seeked on the idle deck while the current one plays, so a cut is a swap (no seek, no freeze).
     Blocks of one take that follow each other without a gap keep playing on the same deck. ctl.stalls counts swaps that had to wait. */
  async function run(p,o){
    const segs=segments(p);if(!segs.length)throw new Error("Add at least one take to the timeline first.");
    const total=segs.total,sz=o.size||outSize(p,segs),W=sz[0],H=sz[1],cv=o.canvas,ctl=o.ctl||{};cv.width=W;cv.height=H;ctl.stalls=0;ctl.swaps=0;
    const g=cv.getContext("2d",{alpha:false});
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error("This browser has no Web Audio.");
    const ac=new AC();if(ac.state==="suspended"){try{await ac.resume()}catch(e){}}
    const master=ac.createGain();let dest=null;
    if(o.record){dest=ac.createMediaStreamDestination();master.connect(dest)}else master.connect(ac.destination);
    const decks=[];let stream=null;
    const mkDeck=()=>{const v=mkVideo(null,false),node=ac.createMediaElementSource(v),gn=ac.createGain();gn.gain.value=0;node.connect(gn);gn.connect(master);const d={v:v,gain:gn,url:"",seg:-1,ready:false,job:null,err:null};decks.push(d);return d};
    const prep=(d,k,at)=>{const s=segs[k];d.seg=k;d.ready=false;d.err=null;
      const job=(async()=>{if(d.url!==s.take.url){d.url=s.take.url;d.v.src=s.take.url;await loaded(d.v)}await seek(d.v,at==null?s.s:at);if(d.v.readyState<2)await once(d.v,"canplay",1500)})()
        .then(()=>{if(d.job===job)d.ready=true},e=>{if(d.job===job)d.err=e});
      d.job=job;return job};
    const contig=k=>k+1<segs.length&&segs[k+1].take.id===segs[k].take.id&&Math.abs(segs[k+1].s-segs[k].e)<.04;
    const nextJump=k=>{let j=k;while(contig(j))j++;return j+1};
    const fade=(d,to,at,tc)=>{try{d.gain.gain.cancelScheduledValues(ac.currentTime);d.gain.gain.setTargetAtTime(to,Math.max(ac.currentTime,at||0),tc||.005)}catch(e){}};
    try{
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
      let prevT=from-1e-4,cur=mkDeck(),nxt=mkDeck();
      await prep(cur,k,segs[k].s+Math.max(0,from-segs[k].T0));if(cur.err)throw cur.err;
      let j=nextJump(k);if(j<segs.length)prep(nxt,j,null);
      drawFrame(g,W,H,cur.v,segs[k].take,cur.v.currentTime,p,segs[k].T0+(cur.v.currentTime-segs[k].s));
      if(mr)mr.start(1000);
      try{await cur.v.play()}catch(e){throw new Error("The browser blocked playback. Press the button again.")}
      fade(cur,1,0,.006);
      while(k<segs.length&&!ctl.stopped){
        const s=segs[k],v=cur.v,joined=contig(k);let fading=false;
        await new Promise(res=>{
          const step=()=>{
            if(ctl.stopped)return res();
            const ct=v.currentTime,Tp=s.T0+clamp(ct-s.s,0,s.e-s.s);
            ((p.callouts)||[]).forEach(c=>{if(coOn(p,c)&&c.t>prevT&&c.t<=Tp+.001)sfx(c.sound,ac,master)});prevT=Tp;
            drawFrame(g,W,H,v,s.take,ct,p,Tp);
            if(o.onTime)try{o.onTime(Tp,total)}catch(e){}
            const left=s.e-ct;
            if(!joined&&!fading&&left<.07){fading=true;fade(cur,0,ac.currentTime+Math.max(0,left-.015),.004)}
            if(left<=.02||v.ended)return res();
            requestAnimationFrame(step)};
          requestAnimationFrame(step)});
        if(ctl.stopped)break;
        if(joined&&!v.ended){k++;continue}      /* the next block starts where this one ends: same deck, no seek */
        k++;if(k>=segs.length)break;
        if(nxt.seg!==k)prep(nxt,k,null);
        if(!nxt.ready){ctl.stalls++;if(mr&&mr.state==="recording")mr.pause();try{v.pause()}catch(e){}await nxt.job;if(mr&&mr.state==="paused")mr.resume()}
        if(nxt.err)throw nxt.err;
        const pl=nxt.v.play();fade(nxt,1,0,.006);fade(cur,0,0,.004);try{v.pause()}catch(e){}
        const was=cur;cur=nxt;nxt=was;ctl.swaps++;
        drawFrame(g,W,H,cur.v,segs[k].take,cur.v.currentTime,p,segs[k].T0+Math.max(0,cur.v.currentTime-segs[k].s));
        try{await pl}catch(e){throw new Error("The browser blocked playback. Press the button again.")}
        j=nextJump(k);if(j<segs.length)prep(nxt,j,null);
      }
      try{cur.v.pause()}catch(e){}
      let blob=null;
      if(mr&&mr.state!=="inactive"){if(mr.state==="paused")mr.resume();await new Promise(r=>setTimeout(r,150));const fin=new Promise(r=>{mr.onstop=r});mr.stop();await fin;if(!ctl.stopped)blob=new Blob(chunks,{type:(mime||"video/webm").split(";")[0]})}
      return{blob:blob,total:total,W:W,H:H,mime:mime,stalls:ctl.stalls,swaps:ctl.swaps};
    }finally{
      decks.forEach(d=>{try{d.v.pause();d.v.removeAttribute("src");d.v.load();d.v.remove()}catch(e){}});
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
      ".lc79-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;color:#94a3b8}.lc79-empty[hidden]{display:none}",
      ".lc79-trans{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lc79-time{font-variant-numeric:tabular-nums;color:#cbd5e1;min-width:110px}",
      ".lc79-insp{background:#0f1217;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px;align-self:start;max-height:calc(56vh + 60px);overflow:auto}",
      ".lc79-insp h3{margin:0;font-size:14px;color:#fff}.lc79-f{display:flex;flex-direction:column;gap:4px}.lc79-f>span{font-size:12px;color:#94a3b8}.lc79-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}",
      ".lc79-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".lc79-insp video{width:100%;max-height:220px;background:#000;border-radius:10px}",
      ".lc79-calls{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:0 12px 8px}",
      ".lc79-chip{min-height:44px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:#14171d;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px}",
      ".lc79-chip i{width:12px;height:12px;border-radius:50%;display:inline-block}.lc79-chip .x{min-width:28px;min-height:28px;border-radius:50%;border:0;background:rgba(255,255,255,.08);cursor:pointer;margin-right:-6px}",
      ".lc79-tl{margin:0 12px 12px;background:#0f1217;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;position:relative;user-select:none;-webkit-user-select:none}",
      ".lc79-track{position:relative;height:64px;border-radius:8px;background:rgba(255,255,255,.03);margin-top:6px;touch-action:pan-y}.lc79-ins{top:18px}",
      ".lc79-track.co{height:40px}.lc79-tl-label{font-size:12px;color:#94a3b8;display:flex;justify-content:space-between}",
      ".lc79-clip{position:absolute;top:4px;bottom:4px;border-radius:8px;background:linear-gradient(#18323a,#11252b);border:1px solid rgba(0,229,255,.35);overflow:hidden;cursor:grab;display:flex;align-items:flex-end;padding:4px 6px;font-size:12px;font-weight:600;color:#e0f7fb;min-width:6px;background-size:cover;background-position:center}",
      ".lc79-clip span{background:rgba(5,7,10,.7);border-radius:6px;padding:1px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}",
      ".lc79-clip.sel{outline:2px solid #00E5FF;outline-offset:1px}.lc79-clip.drag{opacity:.55;cursor:grabbing}",
      ".lc79-co{position:absolute;top:5px;bottom:5px;border-radius:7px;cursor:grab;display:flex;align-items:center;padding:0 6px;font-size:11.5px;font-weight:700;overflow:hidden;white-space:nowrap;min-width:12px;color:#0f172a}",
      ".lc79-co.sel{outline:2px solid #fff;outline-offset:1px}",
      ".lc79-ph{position:absolute;left:0;top:0;bottom:0;width:2px;margin-left:-1px;background:#ef4444;pointer-events:none;z-index:3;will-change:transform}",
      ".lc79-tlbar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px}.lc79-sep{width:1px;height:28px;background:rgba(255,255,255,.12);margin:0 4px}",
      ".lc79-sil{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:#cbd5e1}.lc79-sil input[type=range]{width:120px}.lc79-sil output{min-width:44px;font-variant-numeric:tabular-nums;color:#fff;font-weight:700}",
      ".lc79-scroll{overflow-x:auto;overflow-y:hidden;margin-top:6px;border-radius:8px;scrollbar-color:#334155 transparent}.lc79-lane{position:relative;min-width:100%;padding-bottom:4px}",
      ".lc79-ruler{position:relative;height:18px;font-size:10.5px;color:#64748b;border-bottom:1px solid rgba(255,255,255,.08)}.lc79-ruler i{position:absolute;top:0;bottom:0;border-left:1px solid rgba(255,255,255,.15);padding-left:3px;font-style:normal;white-space:nowrap}",
      ".lc79-hd{position:absolute;top:0;bottom:0;width:12px;cursor:ew-resize;z-index:2;touch-action:none;background:transparent}.lc79-hd.l{left:0;border-left:3px solid rgba(0,229,255,.55)}.lc79-hd.r{right:0;border-right:3px solid rgba(0,229,255,.55)}",
      ".lc79-clip:hover .lc79-hd,.lc79-clip.sel .lc79-hd{background:rgba(0,229,255,.28)}.lc79-clip span{position:relative;z-index:1;margin:0 8px}",
      ".lc79-ins{position:absolute;top:0;bottom:0;width:3px;background:#fbbf24;z-index:4;pointer-events:none}",
      /* 9.55.0 DaVinci-style Edit Studio: media pool | viewer | inspector, then the timeline with track headers */
      ".lc79-dv{display:grid;grid-template-columns:230px minmax(0,1fr) 340px;gap:10px;padding:10px 12px}",
      ".lc79-pool{background:#0f1217;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;max-height:calc(52vh + 56px);overflow:auto}.lc79-pool h3{margin:0 0 4px;font-size:13px;color:#fff;text-transform:uppercase;letter-spacing:.04em}",
      ".lc79-pool .lc79-grid{grid-template-columns:1fr}.lc79-dv .lc79-stagebox{height:min(52vh,600px)}.lc79-dv .lc79-insp{max-height:calc(52vh + 56px)}",
      "@media (max-width:1100px){.lc79-dv{grid-template-columns:minmax(0,1fr) 320px}.lc79-pool{grid-column:1/-1;order:3;max-height:none}.lc79-pool .lc79-grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))}}",
      "@media (max-width:760px){.lc79-dv{grid-template-columns:1fr}.lc79-dv .lc79-stagebox{height:46vh}.lc79-dv .lc79-insp{max-height:none}}",
      ".lc79-tlbar .lc79-calls{padding:0;flex-wrap:nowrap}.lc79-tlbar .lc79-calls select{min-height:44px;max-width:260px}",
      ".lc79-capst{margin:0 0 6px;font-size:12.5px;color:#fbbf24}.lc79-capst[hidden]{display:none}.lc79-capst.lc79-err{color:#fca5a5}",
      ".lc79-tlwrap{display:flex;align-items:flex-start;gap:0}.lc79-heads{flex:0 0 172px;padding-right:6px;padding-bottom:4px}.lc79-tlwrap .lc79-scroll{flex:1;margin-top:0}",
      ".lc79-hspace{height:18px}.lc79-hrow{display:flex;align-items:center;gap:4px;margin-top:6px;height:44px;padding:0 4px;border-radius:8px;background:#14171d;border:1px solid rgba(255,255,255,.08)}",
      ".lc79-hrow.cap{background:#1c1a10;border-color:rgba(251,191,36,.3)}.lc79-hrow.vid{height:64px;background:#10232a;border-color:rgba(0,229,255,.25)}.lc79-hrow.tg{border-color:#00E5FF;box-shadow:0 0 0 1px #00E5FF inset}.lc79-hrow.off .lc79-tname{opacity:.5;text-decoration:line-through}",
      ".lc79-eye{min-width:34px;min-height:34px;border-radius:8px;border:0;background:transparent;cursor:pointer;font-size:15px;display:inline-flex;align-items:center;justify-content:center}.lc79-eye:hover{background:rgba(255,255,255,.08)}",
      ".lc79-tname{flex:1;min-width:0;min-height:34px;border:0;background:transparent;text-align:left;cursor:pointer;font-weight:700;font-size:12.5px;color:#e5e7eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 4px}.lc79-tname small{display:block;font-weight:500;font-size:10.5px;color:#94a3b8}",
      ".lc79-tx{min-width:30px;min-height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:#0A0B0E;color:#fca5a5;cursor:pointer;font-weight:700}.lc79-tx.cc{color:#fbbf24;border-color:rgba(251,191,36,.5);font-size:11px}",
      ".lc79-track{height:44px}.lc79-track.vid{height:64px}.lc79-track.co,.lc79-track.cap{height:44px}.lc79-track.co.tg{background:rgba(0,229,255,.06)}.lc79-track.off{opacity:.45;background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.04) 0 8px,transparent 8px 16px)}",
      ".lc79-track.cap{background:rgba(251,191,36,.05)}.lc79-cl{position:absolute;top:6px;bottom:6px;border-radius:6px;background:#fbbf24;color:#1c1a10;font-size:11px;font-weight:700;padding:0 5px;display:flex;align-items:center;overflow:hidden;white-space:nowrap;cursor:grab;min-width:4px;border:1px solid rgba(0,0,0,.35)}",
      ".lc79-cl.sel{outline:2px solid #fff;outline-offset:1px}.lc79-capempty{position:absolute;inset:0;display:flex;align-items:center;padding:0 10px;font-size:12px;color:#94a3b8}",
      ".lc79-toasts{position:fixed;left:50%;top:calc(66px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:30;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none;width:min(560px,92vw)}",
      ".lc79-toast{background:#0b1222;border:1px solid rgba(0,229,255,.45);color:#e5e7eb;padding:10px 14px;border-radius:12px;font-weight:600;font-size:13.5px;box-shadow:0 12px 30px rgba(0,0,0,.55);text-align:center}.lc79-toast.err{border-color:rgba(239,68,68,.7);color:#fecaca}.lc79-toast.ok{border-color:rgba(34,197,94,.6)}",
      /* 9.54.0 layers and versions */
      ".lc79-layers{padding:8px 12px;display:flex;flex-direction:column;gap:6px;border-top:1px solid rgba(255,255,255,.06)}.lc79-layhead{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.lc79-layhead b{color:#fff;font-size:13px}",
      ".lc79-laylist{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.lc79-vlab{color:#cbd5e1;font-size:12.5px;margin-right:4px}",
      ".lc79-lay{min-height:40px;padding:0 10px;border-radius:999px;border:1px solid rgba(0,229,255,.45);background:rgba(0,229,255,.08);color:#e5e7eb;font:600 12.5px/1 inherit;cursor:pointer;display:inline-flex;gap:6px;align-items:center}",
      ".lc79-lay.off{border-style:dashed;border-color:rgba(148,163,184,.5);background:transparent;color:#94a3b8;text-decoration:line-through}.lc79-lay b{font-weight:400;text-decoration:none}",
      ".lc79-ver{display:inline-flex;align-items:stretch;border:1px solid rgba(255,255,255,.18);border-radius:999px;overflow:hidden}.lc79-ver.on{border-color:#fbbf24;box-shadow:0 0 0 1px #fbbf24 inset}",
      ".lc79-ver button{min-height:40px;padding:0 12px;border:0;background:#14171d;color:#e5e7eb;font:600 12.5px/1 inherit;cursor:pointer}.lc79-ver .x{padding:0 10px;color:#fca5a5;border-left:1px solid rgba(255,255,255,.12)}.lc79-ver.on button:first-child{color:#fbbf24}",
      ".lc79-hidmark{position:absolute;top:10px;bottom:10px;width:26px;margin-left:-13px;z-index:3;border-radius:8px;border:1px dashed #94a3b8;background:#0A0B0E;color:#94a3b8;font-size:14px;cursor:pointer;padding:0}.lc79-hidmark:hover{color:#fff;border-color:#00E5FF}",
      ".lc79-co.hid{opacity:.35;background-image:repeating-linear-gradient(135deg,rgba(0,0,0,.35) 0 6px,transparent 6px 12px)!important;text-decoration:line-through}",
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
  const ED={target:"",capSt:{},open:false,el:null,T:0,tot:0,playing:false,ctl:null,sel:null,busy:false,base:null,baseInfo:null,capRect:null,scrubTok:0,scrubV:{},zoom:1,undo:[],lastHead:0,lastSnap:0};
  /* NLE settings on this device: silence cut after each take, captions after each take, the threshold of the Cut silences button */
  const NK="lc79-nle";
  const nle=()=>Object.assign({autoSil:true,silMin:4,autoCaps:true,cutMin:4},rd(NK,{})||{});
  const setNle=o=>wr(NK,Object.assign(nle(),o));
  const trThr=()=>{try{const v=T().Trim.thr;return Number.isFinite(v)?v:-45}catch(e){return-45}};
  /* undo: a copy of the project's timeline before every edit (Ctrl+Z) */
  function snapEd(p){if(!p)return;ED.undo.push({pid:p.id,clips:JSON.stringify(p.clips||[]),callouts:JSON.stringify(p.callouts||[]),cap:JSON.stringify(p.cap||null),tracks:JSON.stringify(p.tracks||null),capsOff:!!p.capsOff});if(ED.undo.length>60)ED.undo.shift();ED.lastSnap=Date.now()}
  const snapSoft=p=>{if(Date.now()-ED.lastSnap>1500)snapEd(p)};
  function undo(){
    const p=cur();if(!p)return;
    for(let i=ED.undo.length-1;i>=0;i--){if(ED.undo[i].pid!==p.id)continue;const u=ED.undo.splice(i,1)[0];stopPlay();
      p.clips=JSON.parse(u.clips);p.callouts=JSON.parse(u.callouts);const c=JSON.parse(u.cap);if(c)p.cap=c;else delete p.cap;
      if(u.tracks){const tr=JSON.parse(u.tracks);if(tr)p.tracks=tr}if(u.capsOff!=null)p.capsOff=u.capsOff;
      save(p);ED.sel=null;ED.paint();say("Undone.","",1200);return}
    say("Nothing to undo.","",1500);
  }
  /* a take without a level track (an import, an export): measure it once by decoding its audio, RMS in dB per 0.1 s */
  function envOf(ab){
    const n=ab.numberOfChannels,len=ab.length,step=Math.max(1,Math.round(ab.sampleRate*SIL_DT)),ch=[],out=[];for(let c=0;c<n;c++)ch.push(ab.getChannelData(c));
    for(let i=0;i<len;i+=step){let sum=0,m=0;const e=Math.min(len,i+step);for(let j=i;j<e;j+=4){let x=0;for(let c=0;c<n;c++)x+=ch[c][j];x/=n;sum+=x*x;m++}
      const rms=Math.sqrt(sum/Math.max(1,m));out.push(rms>0?Math.max(-100,Math.round(20*Math.log10(rms))):-100)}
    return out;
  }
  async function ensureEnv(t){
    if(!t)return false;if(Array.isArray(t.env)&&t.env.length>=5)return true;
    try{const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext,buf=await(await fetch(t.url)).arrayBuffer();
      const ctx=OAC?new OAC(1,22050,22050):new(window.AudioContext||window.webkitAudioContext)();
      const ab=await new Promise((res,rej)=>{const pr=ctx.decodeAudioData(buf,res,rej);if(pr&&pr.then)pr.then(res,rej)});
      t.env=envOf(ab);try{T().Takes.persistMeta(t)}catch(e){}return t.env.length>=5}catch(e){return false}
  }
  /* right after a take: every silence >= min seconds becomes a cut of the take (the Studio's Trim shows them too and can undo them) */
  function autoSilence(t,min){
    if(!t||!Array.isArray(t.env)||t.env.length<10)return null;
    const D=durOf(t),a=clamp(+t.trimIn||0,0,D),b=t.trimOut==null?D:clamp(+t.trimOut,a,D),thr=envThr(t.env,trThr()),keep=speechRanges(t.env,a,b,min,thr,null,envDt(t));
    if(!keep.length)return{n:0,sec:0,silent:true};
    const cuts=complement(keep,a,b).filter(c=>c.e-c.s>=.05&&!(t.cuts||[]).some(x=>x.s<=c.s+.01&&x.e>=c.e-.01));if(!cuts.length)return{n:0,sec:0};
    t.cuts=(t.cuts||[]).concat(cuts.map(c=>({s:c.s,e:c.e,auto:1,lc79:1}))).sort((x,y)=>x.s-y.s);
    try{T().Takes.persistMeta(t)}catch(e){}
    return{n:cuts.length,sec:+cuts.reduce((s,c)=>s+c.e-c.s,0).toFixed(1)};
  }
  /* captions right after a take when the live captions did not catch it (same engines as Write captions), one take at a time */
  let capQ=Promise.resolve();
  /* 9.55.0: captions are written in the background after a take is sent to a project, and from T1 (CC). Every take has a visible state
     (writing / done / failed with the engine's own reason); before, a failure was swallowed and the message landed under the Edit Studio. */
  function capDone(t,r,L){
    if(r&&r.ok&&r.lines&&r.lines.length){t.captions=r.lines.map(x=>Object.assign({},x,{t:L.fixText?L.fixText(x.t):x.t}));try{T().Takes.persistMeta(t)}catch(e){}
      ED.capSt[t.id]={state:"ok",msg:r.lines.length+" lines"+(r.note?" ("+r.note+")":"")};return true}
    ED.capSt[t.id]={state:"fail",msg:(r&&r.error)||"No speech engine answered."};return false;
  }
  function capTick(t){let last=0;return(c,d)=>{ED.capSt[t.id]={state:"busy",msg:d?Math.round(c||0)+" of "+Math.round(d)+" s":""};const n=Date.now();if(n-last>400){last=n;try{if(ED.open){paintCapStatus(cur());paintHeads(cur())}}catch(e){}}}}
  function autoCaptions(t){
    if(!nle().autoCaps||!t||(t.captions&&t.captions.length)||/\(export\)|\(edited\)/.test(t.name||""))return;
    ED.capSt[t.id]={state:"busy",msg:"waiting"};
    capQ=capQ.then(()=>new Promise(r=>setTimeout(r,1200))).then(async()=>{
      const L=api()&&api().lc33;if(!L||!L.autoSubs||(t.captions&&t.captions.length)||!takeById(t.id)){delete ED.capSt[t.id];return}
      if(ED.open)ED.paint();
      const r=await L.autoSubs(t,capTick(t));
      if(capDone(t,r,L))say("Captions written for “"+t.name+"”: they are on T1 in the Edit Studio.","ok",3500);
      else say("Captions for “"+t.name+"” failed: "+ED.capSt[t.id].msg+" Open the Edit Studio and tap CC to try again.","err",9000);
      if(ED.open&&!ED.playing)ED.paint();
    }).catch(e=>{ED.capSt[t.id]={state:"fail",msg:String(e&&e.message||e)};if(ED.open)ED.paint()});
  }
  async function genCaps(force){
    const p=cur();if(!p||ED.capBusy)return;const L=api()&&api().lc33;
    if(!L||!L.autoSubs){say("The caption engine is not loaded: open the Creator Studio once, then come back.","err",5000);return}
    const cs=capState(p),list=force?cs.list:cs.none;
    if(!list.length){say(cs.list.length?"Every take on V1 has captions. Use “Rewrite all” to write them again.":"Put a take on V1 first.","",3500);return}
    if(force&&cs.n&&!confirm("Write the captions of "+list.length+" take"+(list.length===1?"":"s")+" again? Your own edits to them are replaced."))return;
    stopPlay();ED.capBusy=true;let ok=0;const fail=[];
    list.forEach(t=>{ED.capSt[t.id]={state:"busy",msg:"waiting"}});ED.paint();
    for(const t of list){let r=null;try{r=await L.autoSubs(t,capTick(t))}catch(e){r={ok:false,error:String(e&&e.message||e)}}if(capDone(t,r,L))ok++;else fail.push(t)}
    ED.capBusy=false;if(ok&&p.capsOff){p.capsOff=false;save(p)}
    if(ED.open)ED.paint();
    say(ok?ok+" take"+(ok===1?"":"s")+" got captions: they are on T1 and in the viewer."+(fail.length?" Failed: "+fail[0].name+" ("+ED.capSt[fail[0].id].msg+")":""):"No captions: "+ED.capSt[fail[0].id].msg,ok?"ok":"err",8000);
  }
  function openProjects(){
    if(!api()){say("Open the Creator Studio first.","err");return}
    if(!cur())newProject("Reel 1");
    ED.sel=null;ED.T=0;
    const qs=[1.5,2.5,4].map(v=>'<button type="button" class="lc79-b sm" data-a="silq" data-v="'+v+'" aria-label="Silences over '+v+' seconds">'+v+' s</button>').join("");
    ED.el=openLayer("lc79-ed","Edit Studio",el=>{
      /* 9.55.0: a DaVinci-style page. Top: project and export. Middle: media pool | viewer | inspector. Bottom: the timeline with one row per track. */
      el.innerHTML='<header class="lc79-top"><button type="button" class="lc79-b" data-a="close" data-autofocus aria-label="Back to the Studio">← Studio</button><h2>Edit Studio</h2>'
        +'<select data-a="pick" aria-label="Project"></select><button type="button" class="lc79-b sm" data-a="new">New project</button><button type="button" class="lc79-b sm" data-a="rename">Rename</button><button type="button" class="lc79-b sm red" data-a="delproj">Delete project</button>'
        +'<span class="lc79-grow"></span><span class="lc79-hint" data-verlab></span><button type="button" class="lc79-b pri" data-a="export" title="Export what you see: hidden tracks and blocks stay out">Export video</button></header>'
        +'<div class="lc79-body"><div class="lc79-dv">'
        +'<aside class="lc79-pool" aria-label="Media pool"><h3>Media pool</h3><p class="lc79-hint" style="margin:0 0 6px">Every take on this device. + Add puts it at the end of V1, or drag it onto the timeline.</p><div class="lc79-grid"></div></aside>'
        +'<div class="lc79-view"><div class="lc79-stagebox"><canvas aria-label="Viewer. Drag the captions to move them, drag their corner or scroll on them to resize them. Pause and drag a selected callout to place it."></canvas><div class="lc79-empty" hidden></div></div>'
        +'<div class="lc79-trans"><button type="button" class="lc79-b" data-a="home" aria-label="Back to the start">⏮</button><button type="button" class="lc79-b pri" data-a="play">▶ Play</button><span class="lc79-time" aria-live="off"></span><input type="range" data-a="scrub" min="0" max="1" step="0.01" value="0" aria-label="Project time" style="flex:1;min-width:140px"></div></div>'
        +'<aside class="lc79-insp" aria-label="Inspector"></aside></div>'
        +'<div class="lc79-tl"><div class="lc79-tlbar" role="toolbar" aria-label="Timeline tools">'
        +'<button type="button" class="lc79-b sm" data-a="split" title="Cut the block under the playhead in two (S)">✂ Split</button><button type="button" class="lc79-b sm red" data-a="del" title="Remove the selected item; the rest closes up (Delete)">🗑 Delete</button><button type="button" class="lc79-b sm" data-a="hideit" title="Hide or show the selected block or callout (H)">⊘ Hide</button><button type="button" class="lc79-b sm" data-a="undo" title="Undo (Ctrl+Z)">↶ Undo</button>'
        +'<span class="lc79-sep" aria-hidden="true"></span><span class="lc79-calls" aria-label="Add a callout to the target track"></span>'
        +'<span class="lc79-sep" aria-hidden="true"></span><span class="lc79-sil"><span>Silences over</span><input type="range" data-a="silmin" min="0.5" max="8" step="0.5" aria-label="Shortest silence to cut, in seconds"><output data-silv></output></span>'+qs
        +'<button type="button" class="lc79-b sm" data-a="cutsil" title="Remove every silence over this length from the whole project; the speech closes up">✂ Cut silences</button>'
        +'<span class="lc79-sep" aria-hidden="true"></span><button type="button" class="lc79-b sm" data-a="zout" aria-label="Zoom out">−</button><button type="button" class="lc79-b sm" data-a="zin" aria-label="Zoom in">+</button><span class="lc79-grow"></span><span class="lc79-hint" data-tot></span></div>'
        +'<p class="lc79-capst" data-capst aria-live="polite" hidden></p>'
        +'<div class="lc79-tlwrap"><div class="lc79-heads" aria-label="Tracks"></div><div class="lc79-scroll"><div class="lc79-lane"><div class="lc79-ruler" aria-hidden="true"></div><div class="lc79-rows"></div><div class="lc79-ph"></div></div></div></div>'
        +'<div class="lc79-tl-label"><span>Tap a track name to make it the target for new callouts. Drag a callout up or down to move it to another track. Eye = hide the whole track. S split · Delete · H hide · Space play · Ctrl+Z undo.</span></div></div>'
        +'<section class="lc79-layers" aria-label="Versions"></section></div>';
      el._close=()=>{stopPlay();ED.open=false;Object.keys(ED.scrubV).forEach(k=>{try{ED.scrubV[k].removeAttribute("src");ED.scrubV[k].load();ED.scrubV[k].remove()}catch(e){}});ED.scrubV={};ED.base=null};
      el.addEventListener("click",onEdClick);el.addEventListener("change",onEdChange);el.addEventListener("input",onEdInput);
      bindTimeline(el);bindCanvas(el);
    });
    ED.open=true;ED.paint();
  }
  ED.paint=function(){if(!ED.el||!ED.el.isConnected)return;paintTop();paintCalls();paintTimeline();paintLayers();paintInsp();paintArchive();showFrame()};
  /* ---------- 9.54.0: layers (hide without deleting) and versions (named sets of hidden layers, exported one after the other) ---------- */
  const visOf=p=>({clips:(p.clips||[]).filter(c=>c.hidden).map(c=>c.id),co:(p.callouts||[]).filter(c=>c.hidden).map(c=>c.id),tracks:tracksOf(p).filter(t=>t.hidden).map(t=>t.id),capsOff:!!p.capsOff});
  function applyVis(p,v){const hc={},ho={};(v.clips||[]).forEach(id=>{hc[id]=1});(v.co||[]).forEach(id=>{ho[id]=1});
    (p.clips||[]).forEach(c=>{if(hc[c.id])c.hidden=true;else delete c.hidden});(p.callouts||[]).forEach(c=>{if(ho[c.id])c.hidden=true;else delete c.hidden});p.capsOff=!!v.capsOff;
    const ht={};(v.tracks||[]).forEach(id=>{ht[id]=1});tracksOf(p).forEach(t=>{if(ht[t.id])t.hidden=true;else delete t.hidden})}
  const sameVis=(a,b)=>{const k=v=>JSON.stringify([(v.clips||[]).slice().sort(),(v.co||[]).slice().sort(),(v.tracks||[]).slice().sort(),!!v.capsOff]);return k(a)===k(b)};
  function activeVersion(p){const v=visOf(p);return(p.variants||[]).filter(x=>sameVis(x,v))[0]||null}
  function toggleHidden(kind,id){
    const p=cur();if(!p)return;const list=kind==="clip"?p.clips:p.callouts,it=list.filter(c=>c.id===id)[0];if(!it)return;
    stopPlay();snapEd(p);if(it.hidden)delete it.hidden;else it.hidden=true;save(p);
    const segs=segments(p);ED.T=clamp(ED.T,0,segs.total||0);ED.paint();
    say((kind==="clip"?"Block":"Callout")+(it.hidden?" hidden: it is left out of the preview and the export. Nothing is deleted.":" is back in the video."),"",2600);
  }
  function paintLayers(){
    /* 9.55.0: the bar under the timeline: versions = named sets of hidden tracks / blocks / callouts / captions */
    const box=Q(".lc79-layers",ED.el),p=cur();if(!box)return;if(!p){box.innerHTML="";return}
    const av=activeVersion(p),vs=(p.variants||[]),lab=Q("[data-verlab]",ED.el);if(lab)lab.textContent=av?"Version: "+av.name:"";
    const hidN=tracksOf(p).filter(t=>t.hidden).length+(p.clips||[]).filter(c=>c.hidden).length+(p.callouts||[]).filter(c=>c.hidden).length+(p.capsOff?1:0);
    box.innerHTML='<div class="lc79-layhead"><b>Versions</b><span class="lc79-hint">One video, several endings: put CTA 1 on V2 and CTA 2 on V3. Hide V3 and save “Reel A”, then show V3, hide V2 and save “Reel B”. “Export every version” renders them one after the other. Now hidden: '+hidN+'.</span></div>'
      +'<div class="lc79-laylist" role="group" aria-label="Versions">'
      +vs.map(v=>'<span class="lc79-ver'+(av&&av.id===v.id?" on":"")+'"><button type="button" data-a="var-apply" data-id="'+esc(v.id)+'" title="Show and hide the tracks of this version" aria-pressed="'+!!(av&&av.id===v.id)+'">'+esc(v.name)+'</button><button type="button" class="x" data-a="var-del" data-id="'+esc(v.id)+'" aria-label="Delete the version '+esc(v.name)+'">×</button></span>').join("")
      +'<button type="button" class="lc79-b sm" data-a="var-save">+ Save what is shown as a version</button>'
      +(vs.length?'<button type="button" class="lc79-b sm pri" data-a="var-all"'+(ED.busy?" disabled":"")+'>Export every version ('+vs.length+')</button>':'')+'</div>';
  }
  async function exportVersions(){
    const p=cur();if(!p||ED.busy)return;const vs=(p.variants||[]).slice();if(!vs.length){say("Save a version first: hide the layers you do not want, then “Save these layers as a version”.","err",4500);return}
    const keep=visOf(p);let n=0;
    for(const v of vs){applyVis(p,v);save(p);ED.paint();if(!segments(p).length){say("“"+v.name+"” has no visible block: skipped.","err",3500);continue}
      const r=await exportProject({suffix:v.name,quiet:true});if(r==="cancel")break;if(r==="ok")n++}
    applyVis(p,keep);save(p);ED.paint();
    say(n+" of "+vs.length+" version"+(vs.length===1?"":"s")+" exported to your takes archive (“"+p.name+" – …(export)”). Use Share on each one.",n?"ok":"err",7000);
  }
  function paintTop(){
    const sel=Q('[data-a="pick"]',ED.el),d=db(),p=cur();
    sel.innerHTML=d.list.map(x=>'<option value="'+esc(x.id)+'"'+(p&&x.id===p.id?" selected":"")+'>'+esc(x.name)+'</option>').join("");
    const ex=Q('[data-a="export"]',ED.el);ex.disabled=!(p&&segments(p).length)||ED.busy;
    const cc=Q('[data-a="caps"]',ED.el);if(cc){const off=!!(p&&p.capsOff);cc.textContent=off?"CC Captions: hidden":"CC Captions: on";cc.setAttribute("aria-pressed",String(!off));cc.classList.toggle("gold",!off);cc.title=off?"Captions are hidden in the preview and the export. Press to show them.":"Captions are written automatically and burned into the export. Press to hide them."}
    const cs=Q('[data-a="capstyle"]',ED.el);if(cs)cs.classList.toggle("pri",!!(ED.sel&&ED.sel.kind==="cap"));
    const sm=Q('[data-a="silmin"]',ED.el),sv=Q("[data-silv]",ED.el),m=+nle().cutMin||4;if(sm&&document.activeElement!==sm)sm.value=String(m);if(sv)sv.textContent=m.toFixed(1)+" s";
    QA('[data-a="silq"]',ED.el).forEach(b=>b.classList.toggle("gold",+b.getAttribute("data-v")===m));
    const dl=Q('[data-a="del"]',ED.el);if(dl)dl.disabled=!(ED.sel&&(ED.sel.kind==="clip"||ED.sel.kind==="co"||ED.sel.kind==="cl"));
    const hi=Q('[data-a="hideit"]',ED.el);if(hi)hi.disabled=!(ED.sel&&(ED.sel.kind==="clip"||ED.sel.kind==="co"));
    const un=Q('[data-a="undo"]',ED.el);if(un)un.disabled=!(p&&ED.undo.some(u=>u.pid===p.id));
  }
  function paintCalls(){
    /* 9.55.0: one compact picker in the timeline bar: the callout lands on the target track at the playhead */
    const box=Q(".lc79-calls",ED.el),p=cur();if(!box)return;const tg=trackOf(p,ED.target)||tracksOf(p)[tracksOf(p).length-1];
    box.innerHTML='<select data-a="addco-sel" aria-label="Add a callout or CTA to '+esc(tg?tg.name:"the target track")+'"><option value="">+ Callout / CTA on '+esc(tg?tg.name:"V2")+'…</option>'
      +allPresets().map(x=>'<option value="'+esc(x.pid)+'">'+esc(x.name)+'</option>').join("")+'<option value="custom">Custom text…</option></select>'
      +'<button type="button" class="lc79-b sm" data-a="trk-add" title="A new overlay track on top (V3, V4…)">+ Track</button>';
  }
  function clipLens(p,segs){const L={};segs.forEach(s=>{L[s.ci]=(L[s.ci]||0)+(s.e-s.s)});return L}
  const laneEl=()=>Q(".lc79-lane",ED.el);
  const fmtR=s=>{s=Math.round(s);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
  /* the captions of the takes, placed on the project's timeline (they follow every cut and every hidden block) */
  function capItems(p,segs){
    const out=[];(segs||segments(p)).forEach(sg=>{const t=sg.take;if(!t||!Array.isArray(t.captions))return;
      t.captions.forEach((c,i)=>{const a=Math.max(c.s,sg.s),b=Math.min(c.e,sg.e);if(b-a<.05)return;out.push({take:t,i:i,c:c,T0:sg.T0+(a-sg.s),T1:sg.T0+(b-sg.s)})})});
    return out;
  }
  function capState(p){
    const ts={};(p.clips||[]).forEach(c=>{const t=takeById(c.take);if(t&&!c.hidden)ts[t.id]=t});const list=Object.keys(ts).map(k=>ts[k]);
    const busy=list.filter(t=>ED.capSt[t.id]&&ED.capSt[t.id].state==="busy"),fail=list.filter(t=>ED.capSt[t.id]&&ED.capSt[t.id].state==="fail"),none=list.filter(t=>!(t.captions&&t.captions.length));
    return{list:list,busy:busy,fail:fail,none:none,n:list.reduce((n,t)=>n+((t.captions||[]).length),0)};
  }
  function paintHeads(p){
    const hd=Q(".lc79-heads",ED.el);if(!hd)return;const tr=tracksOf(p),cs=p?capState(p):{busy:[],fail:[],none:[],n:0};
    const row=(cls,inner)=>'<div class="lc79-hrow '+cls+'">'+inner+'</div>';
    let h='<div class="lc79-hspace" aria-hidden="true"></div>';
    tr.slice().reverse().forEach(t=>{const tg=ED.target===t.id;
      h+=row("ov"+(tg?" tg":"")+(t.hidden?" off":""),'<button type="button" class="lc79-eye" data-a="trk-eye" data-id="'+esc(t.id)+'" aria-pressed="'+!t.hidden+'" title="'+(t.hidden?"Show":"Hide")+' this track in the preview and the export">'+(t.hidden?"⊘":"👁")+'</button>'
        +'<button type="button" class="lc79-tname" data-a="trk-target" data-id="'+esc(t.id)+'" aria-pressed="'+tg+'" title="Tap: this track gets the new callouts. Rename it in the inspector.">'+esc(t.name)+'</button>'
        +(tr.length>1?'<button type="button" class="lc79-tx" data-a="trk-del" data-id="'+esc(t.id)+'" aria-label="Delete the track '+esc(t.name)+'">×</button>':''))});
    const st=cs.busy.length?"writing…":cs.fail.length?"failed":cs.n?cs.n+" lines":"none yet";
    h+=row("cap"+(p&&p.capsOff?" off":""),'<button type="button" class="lc79-eye" data-a="lay-caps" aria-pressed="'+!(p&&p.capsOff)+'" title="'+(p&&p.capsOff?"Show":"Hide")+' the captions in the preview and the export">'+(p&&p.capsOff?"⊘":"👁")+'</button>'
      +'<button type="button" class="lc79-tname" data-a="capstyle" title="Caption style and place">T1 · Captions <small>'+esc(st)+'</small></button><button type="button" class="lc79-tx cc" data-a="cc-gen" title="Write the captions of every take that has none">CC</button>');
    h+=row("vid",'<span class="lc79-eye" aria-hidden="true">🎬</span><span class="lc79-tname">V1 · Video</span>');
    hd.innerHTML=h;
  }
  /* o.pps: keep this many pixels per second (while a trim handle is dragged, so the blocks do not jump under the finger) */
  function paintTimeline(o){
    o=o||{};const p=cur(),segs=segments(p),tot=segs.total||0,L=clipLens(p,segs),lane=laneEl(),rows=Q(".lc79-rows",ED.el);ED.tot=tot;if(!rows)return;
    if(p&&!trackOf(p,ED.target)){const tr=tracksOf(p);ED.target=tr[tr.length-1].id}
    if(lane)lane.style.width=o.pps&&tot?Math.max(1,Math.round(tot*o.pps))+"px":(ED.zoom*100)+"%";
    Q("[data-tot]",ED.el).textContent=tot?"Length "+fmt(tot)+" · "+(p?p.clips.length:0)+" block"+(p&&p.clips.length===1?"":"s"):"";
    let html="";
    /* overlay tracks, the highest on top */
    tracksOf(p).slice().reverse().forEach(tk=>{
      const items=(p?p.callouts:[]).filter(c=>c.track===tk.id).map(c=>{const l=tot?clamp(c.t/tot*100,0,100):0,w=tot?Math.max(1.5,c.dur/tot*100):10;
        return'<div class="lc79-co'+(ED.sel&&ED.sel.kind==="co"&&ED.sel.id===c.id?" sel":"")+(c.hidden?" hid":"")+'" data-co="'+esc(c.id)+'" role="button" tabindex="0" aria-label="Callout '+esc(c.text)+' at '+fmt(c.t)+' on '+esc(tk.name)+'" style="left:'+l+'%;width:'+Math.min(w,100-l)+'%;background:'+esc(c.bg)+';color:'+esc(c.fg)+'">'+esc(c.text)+'</div>'}).join("");
      html+='<div class="lc79-track co'+(tk.hidden?" off":"")+(ED.target===tk.id?" tg":"")+'" data-track="co" data-tid="'+esc(tk.id)+'" aria-label="'+esc(tk.name)+'">'+items+'</div>'});
    /* the captions track */
    const caps=p?capItems(p,segs):[];
    html+='<div class="lc79-track cap'+(p&&p.capsOff?" off":"")+'" data-track="cap" aria-label="Captions">'+(caps.length?caps.map(x=>{const l=tot?x.T0/tot*100:0,w=tot?Math.max(.8,(x.T1-x.T0)/tot*100):5,sel=ED.sel&&ED.sel.kind==="cl"&&ED.sel.take===x.take.id&&ED.sel.i===x.i;
      return'<div class="lc79-cl'+(sel?" sel":"")+'" data-cl="'+esc(x.take.id+"|"+x.i)+'" role="button" tabindex="0" style="left:'+l+'%;width:calc('+w+'% - 1px)" title="'+esc(x.c.t)+'">'+esc(x.c.t)+'</div>'}).join(""):'<div class="lc79-capempty">'+(p&&capState(p).busy.length?"Writing captions…":"No captions yet: tap CC on the left to write them.")+'</div>')+'</div>';
    /* V1: the video blocks */
    let x=0,vh="";
    (p?p.clips:[]).forEach((c,ci)=>{const t=takeById(c.take);if(t&&c.hidden){vh+='<button type="button" class="lc79-hidmark" data-a="lay-clip" data-id="'+esc(c.id)+'" style="left:'+x+'%" title="Block '+(ci+1)+' is hidden. Tap to show it again." aria-label="Show hidden block '+(ci+1)+': '+esc(t.name)+'">⊘</button>';return}if(!t||!L[ci])return;const w=L[ci]/tot*100,sel=ED.sel&&ED.sel.kind==="clip"&&ED.sel.id===c.id;
      vh+='<div class="lc79-clip'+(sel?" sel":"")+'" data-clip="'+esc(c.id)+'" role="button" tabindex="0" aria-pressed="'+!!sel+'" aria-label="Block '+(ci+1)+': '+esc(t.name)+', '+fmt(L[ci])+'" style="left:'+x+'%;width:calc('+w+'% - 2px)'+(thumbs[t.id]?';background-image:url('+thumbs[t.id]+')':'')+'">'
        +'<i class="lc79-hd l" data-h="l" aria-hidden="true" title="Drag to trim the start"></i><span>'+esc(t.name)+' · '+fmt(L[ci])+'</span><i class="lc79-hd r" data-h="r" aria-hidden="true" title="Drag to trim the end"></i></div>';
      x+=w;if(!thumbs[t.id])thumbOf(t,()=>{if(ED.open)paintTimeline()})});
    html+='<div class="lc79-track vid" data-track="clips" aria-label="V1 video">'+(vh||'<div class="lc79-empty" style="position:static;height:100%">Add takes from the media pool.</div>')+'</div>';
    rows.innerHTML=html;
    paintHeads(p);
    const ru=Q(".lc79-ruler",ED.el);
    if(ru){if(tot&&lane){const pps=lane.clientWidth/tot,stp=[.5,1,2,5,10,15,30,60,120,300,600].filter(v=>v*pps>=70)[0]||1200;let h="";for(let t=0;t<=tot+1e-6;t+=stp)h+='<i style="left:'+(t/tot*100)+'%">'+(stp<1?fmt(t):fmtR(t))+'</i>';ru.innerHTML=h}else ru.innerHTML=""}
    paintCapStatus(p);
    paintHead(true);
  }
  function paintCapStatus(p){
    const el=Q("[data-capst]",ED.el);if(!el||!p)return;const cs=capState(p);let t="",bad=false;
    if(cs.busy.length)t="Writing captions for "+cs.busy.map(x=>x.name).join(", ")+"… "+((ED.capSt[cs.busy[0].id]||{}).msg||"");
    else if(cs.fail.length){bad=true;const f=ED.capSt[cs.fail[0].id]||{};const kept=cs.fail.some(x=>x.captions&&x.captions.length);t="Captions failed for "+cs.fail.map(x=>x.name).join(", ")+": "+(f.msg||"no speech engine answered")+(kept?" The captions you had are kept.":"")+" Tap CC to try again, or “From script” in the caption inspector."}
    el.hidden=!t;el.textContent=t;el.classList.toggle("lc79-err",bad);
  }
  /* the playhead: at most 10 repaints a second while playing (no layout work every frame on long takes) */
  function paintHead(force){
    const now=performance.now();if(!force&&now-ED.lastHead<100)return;ED.lastHead=now;
    const tot=ED.tot||0,ph=Q(".lc79-ph",ED.el),lane=laneEl(),sc=Q(".lc79-scroll",ED.el);
    if(ph&&lane){const x=(tot?ED.T/tot:0)*lane.clientWidth;ph.style.transform="translateX("+x.toFixed(1)+"px)";ph.hidden=!tot;
      if(ED.playing&&sc&&(x<sc.scrollLeft||x>sc.scrollLeft+sc.clientWidth-30))sc.scrollLeft=Math.max(0,x-40)}
    const tm=Q(".lc79-time",ED.el);if(tm)tm.textContent=fmt(ED.T)+" / "+fmt(tot);
    const sc2=Q('[data-a="scrub"]',ED.el);if(sc2){sc2.max=String(Math.max(.01,tot));if(document.activeElement!==sc2)sc2.value=String(ED.T)}
    const pl=Q('[data-a="play"]',ED.el);if(pl)pl.textContent=ED.playing?"❚❚ Pause":"▶ Play";
  }
  function selected(){const p=cur();if(!p||!ED.sel)return null;if(ED.sel.kind==="clip")return p.clips.filter(c=>c.id===ED.sel.id)[0]||null;if(ED.sel.kind==="co")return p.callouts.filter(c=>c.id===ED.sel.id)[0]||null;if(ED.sel.kind==="take")return takeById(ED.sel.id);if(ED.sel.kind==="cap")return p;if(ED.sel.kind==="cl"){const t=takeById(ED.sel.take);return t&&t.captions&&t.captions[ED.sel.i]||null}if(ED.sel.kind==="trk")return trackOf(p,ED.sel.id);return null}
  const num=(f,v,step,min,max,lab)=>'<label class="lc79-f"><span>'+lab+'</span><input type="number" data-f="'+f+'" value="'+(+v).toFixed(2)+'" step="'+step+'" min="'+min+'"'+(max!=null?' max="'+max+'"':'')+'></label>';
  const rng=(f,v,min,max,step,lab)=>'<label class="lc79-f"><span>'+lab+'</span><input type="range" data-f="'+f+'" value="'+v+'" min="'+min+'" max="'+max+'" step="'+step+'"></label>';
  const chk=(f,on,lab)=>'<label class="lc79-row" style="min-height:44px"><input type="checkbox" data-f="'+f+'"'+(on?" checked":"")+' style="width:22px;height:22px"> '+lab+'</label>';
  const col=(f,v,lab)=>'<label class="lc79-f"><span>'+lab+'</span><input type="color" data-f="'+f+'" value="'+esc(/^#[0-9a-f]{6}$/i.test(v||"")?v:"#ffffff")+'"></label>';
  function paintInsp(){
    const box=Q(".lc79-insp",ED.el),p=cur(),it=selected();
    if(!p){box.innerHTML="";return}
    if(ED.sel&&ED.sel.kind==="cl"&&it){
      const t=takeById(ED.sel.take),n=(t.captions||[]).length,ix=capItems(p).filter(x=>x.take.id===t.id&&x.i===ED.sel.i)[0];
      box.innerHTML='<h3>Caption '+(ED.sel.i+1)+' of '+n+'</h3><p class="lc79-hint" style="margin:0">'+esc(t.name)+(ix?' · in the video at '+fmt(ix.T0):' · in a hidden or cut part of the take')+'</p>'
        +'<label class="lc79-f"><span>Text</span><textarea data-f="cl_t" maxlength="240" rows="3" style="min-height:80px">'+esc(it.t)+'</textarea></label>'
        +'<div class="lc79-two"><div class="lc79-f"><span>Start '+it.s.toFixed(2)+' s</span><span class="lc79-row"><button type="button" class="lc79-b sm" data-a="cl-nudge" data-k="s" data-d="-0.1">−0.1</button><button type="button" class="lc79-b sm" data-a="cl-nudge" data-k="s" data-d="0.1">+0.1</button></span></div>'
        +'<div class="lc79-f"><span>End '+it.e.toFixed(2)+' s</span><span class="lc79-row"><button type="button" class="lc79-b sm" data-a="cl-nudge" data-k="e" data-d="-0.1">−0.1</button><button type="button" class="lc79-b sm" data-a="cl-nudge" data-k="e" data-d="0.1">+0.1</button></span></div></div>'
        +'<div class="lc79-row"><button type="button" class="lc79-b sm" data-a="cl-split">Split at the playhead</button><button type="button" class="lc79-b sm" data-a="cl-add">+ Caption at the playhead</button><button type="button" class="lc79-b sm red" data-a="cl-del">Delete caption</button></div>'
        +'<p class="lc79-hint" style="margin:0">Drag the caption on T1 to move it in time. Drag it in the viewer to place it on the screen; the look is set in “T1 · Captions”.</p>';
      return;
    }
    if(ED.sel&&ED.sel.kind==="trk"&&it){
      const n=(p.callouts||[]).filter(c=>c.track===it.id).length;
      box.innerHTML='<h3>Track</h3><label class="lc79-f"><span>Name</span><input type="text" data-f="trk_name" maxlength="30" value="'+esc(it.name)+'"></label>'
        +'<p class="lc79-hint" style="margin:0">'+n+' callout'+(n===1?'':'s')+' on this track. New callouts land here while it is the target (highlighted). '+(it.hidden?'Hidden: left out of the viewer and the export.':'Shown in the viewer and the export.')+'</p>'
        +'<div class="lc79-row"><button type="button" class="lc79-b sm" data-a="trk-eye" data-id="'+esc(it.id)+'">'+(it.hidden?"👁 Show track":"⊘ Hide track")+'</button><button type="button" class="lc79-b sm red" data-a="trk-del" data-id="'+esc(it.id)+'">Delete track</button></div>';
      return;
    }
    if(ED.sel&&ED.sel.kind==="clip"&&it){
      const t=takeById(it.take),r=clipRange(it,t),D=t.durationMs/1e3,i=p.clips.indexOf(it);
      box.innerHTML='<h3>Block '+(i+1)+': '+esc(t.name)+'</h3><video controls playsinline preload="metadata" src="'+esc(t.url)+'" data-clipvid></video>'
        +'<div class="lc79-row"><button type="button" class="lc79-b sm" data-a="inhere">Start here</button><button type="button" class="lc79-b sm" data-a="outhere">End here</button><button type="button" class="lc79-b sm" data-a="split">✂ Split at the playhead</button></div>'
        +'<div class="lc79-two">'+num("in",r[0],.05,0,D,"Start (s)")+num("out",r[1],.05,0,D,"End (s)")+'</div>'
        +'<p class="lc79-hint" style="margin:0">Take length '+fmt(D)+'. Drag the edges of the block on the timeline to trim it.'+(!it.raw&&p.useCuts!==false&&t.cuts&&t.cuts.length?" The "+t.cuts.length+" cut"+(t.cuts.length===1?"":"s")+" you made in this take (silences, mistakes) are skipped.":"")+'</p>'
        +'<div class="lc79-row"><button type="button" class="lc79-b sm" data-a="mvl"'+(i<=0?" disabled":"")+'>← Earlier</button><button type="button" class="lc79-b sm" data-a="mvr"'+(i>=p.clips.length-1?" disabled":"")+'>Later →</button><button type="button" class="lc79-b sm" data-a="resetclip">Use the whole take</button><button type="button" class="lc79-b sm" data-a="hideit" title="Leave this block out of the preview and the export (H)">⊘ Hide block</button><button type="button" class="lc79-b sm red" data-a="rmclip">Delete block</button></div><button type="button" class="lc79-b sm" data-a="captions">Edit the captions of this take</button>';
      const v=Q("[data-clipvid]",box);v.addEventListener("loadedmetadata",()=>{try{v.currentTime=r[0]}catch(e){}},{once:true});
      return;
    }
    if(ED.sel&&ED.sel.kind==="cap"){
      const sz=previewSize(p,segments(p)),st=capStyle(p,sz[0],sz[1]);
      const cs=capState(p),under=segAt(segments(p),ED.T);
      box.innerHTML='<h3>T1 · Captions</h3>'
        +'<div class="lc79-sec" style="padding:10px;gap:8px"><b style="color:#fff">'+(cs.n?cs.n+' caption lines on the timeline':'No captions yet')+'</b>'
        +(cs.busy.length?'<span class="lc79-hint">Writing for '+esc(cs.busy.map(x=>x.name).join(", "))+'…</span>':'')
        +cs.list.map(t=>{const st=ED.capSt[t.id];return st&&st.state==="fail"?'<span class="lc79-hint lc79-err">'+esc(t.name)+': '+esc(st.msg)+'</span>':''}).join("")
        +'<div class="lc79-row"><button type="button" class="lc79-b sm pri" data-a="cc-gen"'+(ED.capBusy?" disabled":"")+'>CC Write missing captions ('+cs.none.length+')</button><button type="button" class="lc79-b sm" data-a="cc-regen"'+(ED.capBusy||!cs.list.length?" disabled":"")+'>Rewrite all</button>'
        +'<button type="button" class="lc79-b sm" data-a="cc-script"'+(under?'':' disabled')+' title="Spreads your Studio script over the spoken parts of the take under the playhead">From script</button></div>'
        +'<span class="lc79-hint">The speech engine listens to every take on V1. Exact captions need the “captions” server function; without it this device does it (the first time it downloads a model of about 80 MB). Click a caption on T1 to fix a word.</span></div>'
        +'<p class="lc79-hint" style="margin:0">Drag the captions in the viewer to move them. Drag the corner, or scroll on them, to resize them. One style for the whole project, burned into the export.</p>'
        +rng("c_scale",st.scale,.4,3,.05,"Size")+rng("c_w",st.w,.3,.98,.01,"Line width")
        +'<div class="lc79-two">'+rng("c_x",st.x,0,1,.01,"Left ↔ right")+rng("c_y",st.y,0,1,.01,"Top ↕ bottom")+'</div>'
        +chk("c_box",st.box,"Background box")
        +'<div class="lc79-row">'+col("c_bg",st.bg,"Box colour")+'<span class="lc79-grow">'+rng("c_bgA",st.bgA,0,1,.05,"Box opacity")+'</span></div>'
        +'<div class="lc79-row">'+col("c_fg",st.fg,"Text colour")+chk("c_stroke",st.stroke,"Outline")+col("c_sc",st.sc,"Outline colour")+'</div>'
        +'<div class="lc79-two"><label class="lc79-f"><span>Font</span><select data-f="c_font">'+FONT_NAMES.map(f=>'<option value="'+f[0]+'"'+(f[0]===st.font?" selected":"")+'>'+f[1]+'</option>').join("")+'</select></label>'+chk("c_upper",st.upper,"ALL CAPS")+'</div>'
        +'<div class="lc79-row">'+chk("c_karaoke",st.karaoke,"Highlight the spoken word")+col("c_hl",st.hl,"Highlight")+'</div>'
        +'<div class="lc79-row"><button type="button" class="lc79-b sm" data-a="capreset">Reset the box</button></div>'
        +(p.capsOff?'<p class="lc79-hint lc79-err" style="margin:0">T1 is hidden (eye): the export has no captions. Tap the eye to show them.</p>':'');
      return;
    }
    if(ED.sel&&ED.sel.kind==="co"&&it){
      const c=it;
      box.innerHTML='<h3>Callout</h3>'
        +'<label class="lc79-f"><span>Track</span><select data-f="track">'+tracksOf(p).slice().reverse().map(t=>'<option value="'+esc(t.id)+'"'+(t.id===c.track?" selected":"")+'>'+esc(t.name)+(t.hidden?" (hidden)":"")+'</option>').join("")+'</select></label>'
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
        +'<div class="lc79-row"><button type="button" class="lc79-b sm" data-a="coat">Move to the playhead</button><button type="button" class="lc79-b sm" data-a="hideit" title="Leave this callout out of the preview and the export (H)">'+(c.hidden?"👁 Show callout":"⊘ Hide callout")+'</button><button type="button" class="lc79-b sm" data-a="savepreset">Save as preset</button><button type="button" class="lc79-b sm red" data-a="rmco">Delete callout</button></div>';
      return;
    }
    if(ED.sel&&ED.sel.kind==="take"&&it){
      const used=p.clips.some(c=>c.take===it.id);
      box.innerHTML='<h3>'+esc(it.name)+'</h3><video controls playsinline preload="metadata" src="'+esc(it.url)+'"></video><p class="lc79-hint" style="margin:0">'+fmt(it.durationMs/1e3)+(it.captions&&it.captions.length?" · "+it.captions.length+" captions":"")+(used?" · in this project":"")+'</p>'
        +'<div class="lc79-row"><button type="button" class="lc79-b sm pri" data-a="addtake" data-take="'+esc(it.id)+'">Add to the timeline</button><button type="button" class="lc79-b sm" data-a="dl" data-take="'+esc(it.id)+'">⬇ Download</button><button type="button" class="lc79-b sm red" data-a="deltake" data-take="'+esc(it.id)+'">Delete take</button>'+(canShare()?'<button type="button" class="lc79-b sm" data-a="share" data-take="'+esc(it.id)+'">Share</button>':'')+'<button type="button" class="lc79-b sm" data-a="captions">Captions</button></div>';
      return;
    }
    const segs=segments(p),o=nle();
    box.innerHTML='<h3>Project</h3><label class="lc79-f"><span>Name</span><input type="text" data-f="pname" maxlength="60" value="'+esc(p.name)+'"></label>'
      +'<label class="lc79-f"><span>Video size</span><select data-f="size">'+SIZES.map(s=>'<option value="'+s[0]+'"'+(s[0]===(p.size||"auto")?" selected":"")+'>'+s[1]+'</option>').join("")+'</select></label>'
      +chk("useCuts",p.useCuts!==false,"Leave out the cuts of each take (silences, marked mistakes)")
      +'<p class="lc79-hint" style="margin:0">'+p.clips.length+' block'+(p.clips.length===1?"":"s")+' · '+p.callouts.length+' callout'+(p.callouts.length===1?"":"s")+' · '+fmt(segs.total||0)+'</p>'
      +'<div class="lc79-sec" style="padding:10px;gap:4px"><b style="color:#fff">After every take</b>'
      +'<label class="lc79-row" style="min-height:44px"><input type="checkbox" data-f="autoSil"'+(o.autoSil?" checked":"")+' style="width:22px;height:22px"> Cut silences longer than <select data-f="autoMin" aria-label="Silence length">'+[1.5,2.5,4,6].map(v=>'<option value="'+v+'"'+(v===+o.silMin?" selected":"")+'>'+v+' s</option>').join("")+'</select></label>'
      +chk("autoCaps",o.autoCaps,"Write captions when the live captions missed the take")+'</div>'
      +(p.src?'<div class="lc79-sec" style="padding:10px;gap:6px"><b style="color:#fff">Game: '+esc(p.src.label||"")+'</b><span class="lc79-hint">Motif: '+esc(p.src.motif||"")+(p.src.sim?' · Lichess position ready':'')+'</span><div class="lc79-row"><button type="button" class="lc79-b sm" data-a="srcopen">Open in Game-to-Script</button><button type="button" class="lc79-b sm" data-a="recthis">Record this project</button></div></div>':'<p class="lc79-hint" style="margin:0">Tip: make projects from a game in Game-to-Script, one per mistake. The recording flow then loads the board, the feedback card and the Lichess position for you.</p>')
      +'<div class="lc79-row"><button type="button" class="lc79-b sm" data-a="cc-gen">CC Write missing captions ('+capState(p).none.length+')</button><button type="button" class="lc79-b sm" data-a="capstyle">Caption style</button></div>'
      +'<p class="lc79-hint" style="margin:0">Tracks: V1 holds the video, T1 the captions, V2, V3… your callouts and CTAs. The export shows exactly what the viewer shows: hidden tracks stay out. It plays the project once in real time, so keep this tab in front.</p>';
  }
  function paintArchive(){
    const g=Q(".lc79-grid",ED.el),p=cur(),list=takes();
    if(!list.length){g.innerHTML='<p class="lc79-hint">No takes on this device yet. Record one in the Studio (red button or R).</p>';return}
    g.innerHTML=list.map(t=>{const used=p&&p.clips.some(c=>c.take===t.id);
      return'<div class="lc79-card'+(used?" used":"")+'" draggable="true" data-take="'+esc(t.id)+'"><div class="lc79-thumb" data-th="'+esc(t.id)+'"'+(thumbs[t.id]?' style="background-image:url('+thumbs[t.id]+')"':'')+'>'+(used?"<b>In this project</b>":"")+'</div>'
        +'<div class="m"><b>'+esc(t.name)+'</b>'+fmt(t.durationMs/1e3)+(t.captions&&t.captions.length?" · captions":"")+'</div>'
        +'<div class="a"><button type="button" class="lc79-b sm" data-a="watch" data-take="'+esc(t.id)+'" aria-label="Watch '+esc(t.name)+'">▶</button><button type="button" class="lc79-b sm pri" data-a="addtake" data-take="'+esc(t.id)+'" aria-label="Add '+esc(t.name)+' to the timeline">+ Add</button><button type="button" class="lc79-b sm" data-a="dl" data-take="'+esc(t.id)+'" aria-label="Download '+esc(t.name)+'">⬇</button><button type="button" class="lc79-b sm red" data-a="deltake" data-take="'+esc(t.id)+'" aria-label="Delete '+esc(t.name)+'">🗑</button></div>'+(canShare()?'<div class="a"><button type="button" class="lc79-b sm" data-a="share" data-take="'+esc(t.id)+'">Share</button></div>':'')+'</div>'}).join("");
    list.forEach(t=>{if(!thumbs[t.id])thumbOf(t,u=>{const el=Q('[data-th="'+t.id+'"]',ED.el);if(el)el.style.backgroundImage="url("+u+")"})});
  }
  function previewSize(p,segs){const s=outSize(p,segs),k=Math.min(1,720/Math.max(s[0],s[1]));return[Math.round(s[0]*k),Math.round(s[1]*k)]}
  /* a still frame at ED.T: the video goes to ED.base, the caption box and the callouts are drawn on top (fast to redraw while dragging) */
  async function showFrame(){
    if(!ED.el||ED.playing)return;
    const p=cur(),segs=segments(p),cv=Q(".lc79-stagebox canvas",ED.el),em=Q(".lc79-empty",ED.el);
    if(!segs.length){const g=cv.getContext("2d");cv.width=360;cv.height=640;g.fillStyle="#000";g.fillRect(0,0,360,640);em.hidden=false;em.textContent=p&&p.clips.some(c=>c.hidden)?"Every block is hidden. Tap an eye under Layers to show one again.":"Your project is empty. Tap + Add on a take below.";ED.capRect=null;return}
    em.hidden=true;ED.T=clamp(ED.T,0,segs.total);
    const s=segAt(segs,ED.T)||segs[segs.length-1],ct=s.s+clamp(ED.T-s.T0,0,Math.max(0,s.e-s.s-.02));
    const tok=++ED.scrubTok;let v=ED.scrubV[s.take.id];
    try{if(!v){v=ED.scrubV[s.take.id]=mkVideo(s.take.url,true);await loaded(v)}await seek(v,ct)}catch(e){return}
    if(tok!==ED.scrubTok||ED.playing)return;
    const sz=previewSize(p,segs);if(!ED.base)ED.base=document.createElement("canvas");ED.base.width=sz[0];ED.base.height=sz[1];
    drawFrame(ED.base.getContext("2d"),sz[0],sz[1],v,s.take,ct,p,ED.T,true);ED.baseInfo={take:s.take,ct:ct};compose();
  }
  function compose(){
    const cv=Q(".lc79-stagebox canvas",ED.el),p=cur();if(!cv||!ED.base||ED.playing||!p)return;
    cv.width=ED.base.width;cv.height=ED.base.height;const g=cv.getContext("2d");g.drawImage(ED.base,0,0);
    const capSel=!!(ED.sel&&ED.sel.kind==="cap"),bi=ED.baseInfo||{};ED.capRect=null;
    if(!p.capsOff||capSel){let line=capLine(bi.take,bi.ct);if(!line&&capSel)line={t:"Your captions appear here"};
      try{ED.capRect=drawCaption(g,cv.width,cv.height,line,capStyle(p,cv.width,cv.height),bi.ct)}catch(e){ED.capRect=null}
      if(capSel&&ED.capRect){const r=ED.capRect,k=Math.max(1,cv.width/540),hs=12*k;g.save();g.setLineDash([6*k,4*k]);g.strokeStyle="#00E5FF";g.lineWidth=2*k;g.strokeRect(r.x-3*k,r.y-3*k,r.w+6*k,r.h+6*k);g.setLineDash([]);g.fillStyle="#00E5FF";g.fillRect(r.x+r.w+3*k-hs/2,r.y+r.h+3*k-hs/2,hs,hs);g.restore()}}
    coOrder(p).forEach(c=>{if(!coOn(p,c))return;let lt=ED.T-c.t;if(ED.sel&&ED.sel.kind==="co"&&ED.sel.id===c.id)lt=clamp(lt,.9,Math.max(.9,c.dur-.3));try{drawCallout(g,cv.width,cv.height,c,lt)}catch(e){}});
  }
  async function togglePlay(){
    if(ED.playing){stopPlay();return}
    const p=cur(),segs=segments(p);if(!segs.length){say("Add a take first.","err");return}
    if(ED.T>=segs.total-.05)ED.T=0;
    ED.playing=true;ED.ctl={stopped:false};ED.tot=segs.total;paintHead(true);
    const cv=Q(".lc79-stagebox canvas",ED.el),ctl=ED.ctl;
    try{await run(p,{canvas:cv,record:false,from:ED.T,size:previewSize(p,segs),ctl:ctl,onTime:t=>{ED.T=t;paintHead()}})}
    catch(e){say(e.message||"Playback failed.","err",5000)}
    const ended=!ctl.stopped;if(ED.ctl===ctl){ED.playing=false;if(ended)ED.T=0;paintHead(true);showFrame()}
  }
  function stopPlay(){if(ED.ctl)ED.ctl.stopped=true;ED.playing=false}
  /* 9.41.0: every take of the project without captions gets them automatically (same engines as Write captions: exact server, then this device, then the browser) */
  const needsCaps=p=>{const seen={};return(p.clips||[]).map(c=>takeById(c.take)).filter(t=>t&&!seen[t.id]&&(seen[t.id]=1)&&!(t.captions&&t.captions.length)&&!/\(export\)|\(edited\)/.test(t.name))};
  async function writeCaps(p,onMsg){
    const list=needsCaps(p),L=api()&&api().lc33,Tk=T()&&T().Takes;let ok=0,fail=[];
    if(!list.length||!L||!L.autoSubs){if(!onMsg&&!list.length)say("Every take in this project already has captions.","",2500);return{ok:0,fail:[],n:0}}
    for(let i=0;i<list.length;i++){const t=list[i];
      const msg=(cur,dur)=>{const tx="Writing captions: take "+(i+1)+" of "+list.length+(dur?" ("+Math.round(cur||0)+" of "+Math.round(dur)+" s)":"…");if(onMsg)onMsg(tx);else say(tx,"",1500)};msg();
      try{const r=await L.autoSubs(t,msg);
        if(capDone(t,r,L))ok++;else fail.push(t.name+": "+ED.capSt[t.id].msg)}catch(e){ED.capSt[t.id]={state:"fail",msg:String(e&&e.message||e)};fail.push(t.name)}}
    if(!onMsg)say(ok+" take"+(ok===1?"":"s")+" got captions."+(fail.length?" Not possible for "+fail.length+": "+fail[0]:" Check them with Captions."),fail.length?"err":"ok",6000);
    return{ok:ok,fail:fail,n:list.length};
  }
  async function exportProject(o){
    o=o||{};const p=cur(),segs=segments(p);if(!segs.length||ED.busy)return"skip";let res="fail";const outName=p.name+(o.suffix?" – "+String(o.suffix).slice(0,40):"")+" (export)";
    stopPlay();ED.busy=true;paintTop();
    let capNote="";
    if(!p.capsOff&&needsCaps(p).length){const box0=Q(".lc79-stagebox",ED.el),ov0=document.createElement("div");ov0.className="lc79-busy";ov0.setAttribute("role","status");ov0.innerHTML='<b style="color:#fff">Writing captions first</b><span class="lc79-hint" data-m></span>';box0.appendChild(ov0);
      const r=await writeCaps(p,m=>{const e=Q("[data-m]",ov0);if(e)e.textContent=m});ov0.remove();
      capNote=r.ok?" Captions were written for "+r.ok+" take"+(r.ok===1?"":"s")+": you can still edit them (Captions) and export again.":"";
      if(r.fail.length)capNote+=" No captions for "+r.fail.length+" take"+(r.fail.length===1?"":"s")+" ("+r.fail[0]+").";}
    const box=Q(".lc79-stagebox",ED.el),ov=document.createElement("div");ov.className="lc79-busy";ov.setAttribute("role","status");
    ov.innerHTML='<b style="color:#fff">Exporting “'+esc(p.name+(o.suffix?" – "+o.suffix:""))+'”</b><div class="lc79-bar"><i></i></div><span class="lc79-hint">This plays the project once in real time ('+fmt(segs.total)+'). Keep this tab in front.</span><button type="button" class="lc79-b red">Cancel</button>';
    box.appendChild(ov);const bar=Q("i",ov),ctl={stopped:false};Q("button",ov).onclick=()=>{ctl.stopped=true};
    const off=document.createElement("canvas");let lastBar=0;
    try{
      const r=await run(p,{canvas:off,record:true,from:0,ctl:ctl,onTime:(t,tot)=>{const n=performance.now();if(n-lastBar<200)return;lastBar=n;bar.style.width=Math.round(t/tot*100)+"%"}});
      if(ctl.stopped||!r.blob){res="cancel";say("Export cancelled.","",2500)}
      else if(r.blob.size<2e3){say("The browser produced an empty video. Try Chrome or Edge on a computer.","err",6000)}
      else{
        let nid="x"+uid();
        try{const Tk=T().Takes;await Tk.add({id:nid,name:outName,blob:r.blob,mime:r.blob.type||"video/webm",durationMs:r.total*1e3,w:r.W,h:r.H,fps:30,env:[],markers:[],cuts:[],trimIn:0,trimOut:r.total,createdAt:Date.now(),size:r.blob.size,onDisk:false,captions:[]})}catch(e){}
        ED.sel={kind:"take",id:nid};res="ok";
        if(!o.quiet)say("Exported to your takes archive as “"+outName+"”. Use Share to send it to Instagram, TikTok or YouTube."+capNote,"ok",7000);
      }
    }catch(e){say(e.message||"Export failed.","err",6000)}
    off.width=off.height=1;ov.remove();ED.busy=false;ED.paint();
    return res;
  }
  /* a take comes in as its voice pieces (its trim minus its cuts), one block each, at the end or at a drop position */
  function addTake(id,at){
    const p=cur(),t=takeById(id);if(!p||!t)return;snapEd(p);
    const cs=clipsFor(t,p);
    if(at==null||at>=p.clips.length)p.clips=p.clips.concat(cs);else p.clips.splice.apply(p.clips,[Math.max(0,at),0].concat(cs));
    save(p);ED.sel={kind:"clip",id:cs[0].id};ED.paint();
    if(cs.length>1)say(t.name+" came in as "+cs.length+" blocks (its silences and cuts are left out).","",3000);
  }
  async function delTake(id){
    const t=takeById(id);if(!t)return;
    const n=db().list.filter(p=>p.clips.some(c=>c.take===id)).length;
    if(!confirm("Delete “"+t.name+"” for good?"+(n?" It is used in "+n+" project"+(n===1?"":"s")+" and will be removed there too.":"")+" This cannot be undone."))return;
    try{await T().Takes.remove(id)}catch(e){}
    delete thumbs[id];if(ED.scrubV[id]){try{ED.scrubV[id].remove()}catch(e){}delete ED.scrubV[id]}
    if(ED.sel&&ED.sel.id===id)ED.sel=null;ED.undo=ED.undo.filter(u=>u.clips.indexOf('"'+id+'"')<0);takeGone(id);say("Take deleted.","",2000);
  }
  function addCallout(pid){
    const p=cur();if(!p)return;
    let pr=allPresets().filter(x=>x.pid===pid)[0];
    if(pid==="custom")pr={pid:"",text:"Your text",font:"sora",bg:"#00E5FF",fg:"#0A0B0E",sound:"ping",arrow:true,aim:"board",dur:2.4,scale:1};
    if(!pr)return;snapEd(p);
    const tot=segments(p).total||0,t=tot?clamp(ED.T,0,Math.max(0,tot-.5)):0;
    const c=makeCallout(pr,t);const tr=tracksOf(p);c.track=trackOf(p,ED.target)?ED.target:tr[tr.length-1].id;p.callouts.push(c);p.callouts.sort((a,b)=>a.t-b.t);save(p);
    ED.sel={kind:"co",id:c.id};hear(c.sound);ED.paint();
  }
  /* ---------- NLE actions ---------- */
  function doSplit(){
    const p=cur();if(!p)return;stopPlay();snapEd(p);const id=splitAt(p,ED.T);
    if(!id){ED.undo.pop();say("Put the playhead inside a block (not on its edge) to split it.","",2500);return paintTop()}
    save(p);ED.sel={kind:"clip",id:id};ED.paint();
  }
  function doDelete(){
    const p=cur();if(!p)return;
    if(ED.sel&&ED.sel.kind==="cl"){const t=takeById(ED.sel.take);if(t&&t.captions&&t.captions[ED.sel.i]){t.captions.splice(ED.sel.i,1);try{T().Takes.persistMeta(t)}catch(x){}ED.sel={kind:"cap"};paintTimeline();paintInsp();return showFrame()}return}
    if(!ED.sel||(ED.sel.kind!=="clip"&&ED.sel.kind!=="co")){say("Tap a block on the timeline first.","",2000);return}
    stopPlay();snapEd(p);
    if(ED.sel.kind==="co"){p.callouts=p.callouts.filter(c=>c.id!==ED.sel.id);ED.sel=null;save(p);return ED.paint()}
    const s=segments(p).filter(x=>x.clip.id===ED.sel.id)[0];
    if(!deleteClip(p,ED.sel.id)){ED.undo.pop();return}
    if(s)ED.T=s.T0;ED.sel=null;save(p);ED.paint();say("Block deleted, the rest moved up. Ctrl+Z brings it back.","",2400);
  }
  async function doCutSilences(){
    const p=cur();if(!p||ED.busy)return;const min=+nle().cutMin||4;stopPlay();
    const seen={},list=p.clips.map(c=>takeById(c.take)).filter(t=>t&&!seen[t.id]&&(seen[t.id]=1));
    for(const t of list)if(!(Array.isArray(t.env)&&t.env.length>=5)){say("Measuring the audio of “"+t.name+"”…","",2000);await ensureEnv(t)}
    snapEd(p);const r=cutSilences(p,min,trThr());
    if(!r.places){ED.undo.pop();say("No silence longer than "+min+" s"+(r.skipped?" ("+r.skipped+" block"+(r.skipped===1?" has":"s have")+" no audio to measure)":"")+".","",3500);return ED.paint()}
    save(p);ED.sel=null;ED.T=clamp(ED.T,0,r.total);ED.paint();
    say("Cut "+r.places+" silence"+(r.places===1?"":"s")+" over "+min+" s: the video is "+r.removed.toFixed(1)+" s shorter. Ctrl+Z undoes it.","ok",4500);
  }
  function setZoom(z){
    const sc=Q(".lc79-scroll",ED.el),lane=laneEl(),old=lane?lane.clientWidth:1,frac=ED.tot?ED.T/ED.tot:0;
    ED.zoom=clamp(z,1,64);paintTimeline();
    if(sc&&lane){const x=frac*lane.clientWidth;sc.scrollLeft=Math.max(0,x-sc.clientWidth/2)}
  }
  function setCap(p,f,el){
    const sz=previewSize(p,segments(p));if(!p.cap)p.cap=capStyle(p,sz[0],sz[1]);const k=f.slice(2),c=p.cap;
    if(/^(box|stroke|upper|karaoke)$/.test(k))c[k]=!!el.checked;
    else if(/^(bg|fg|sc|hl)$/.test(k)){if(/^#[0-9a-f]{6}$/i.test(el.value))c[k]=el.value}
    else if(k==="font"){if(FONTS[el.value])c.font=el.value}
    else if(/^(scale|w|x|y|bgA)$/.test(k)){const v=+el.value;if(Number.isFinite(v))c[k]=k==="scale"?clamp(v,.4,3):k==="w"?clamp(v,.3,.98):clamp(v,0,1)}
  }
  function onEdClick(e){
    const b=e.target.closest("[data-a]");if(!b||b.tagName==="SELECT"||b.type==="range")return;
    const a=b.getAttribute("data-a"),p=cur(),it=selected();
    if(a==="close")return closeLayer("lc79-ed");
    if(a==="new"){const n=prompt("Name of the new project","Reel "+(db().list.length+1));if(n===null)return;stopPlay();newProject(n.trim()||null);ED.sel=null;ED.T=0;return ED.paint()}
    if(a==="rename"&&p){const n=prompt("Project name",p.name);if(n&&n.trim()){p.name=n.trim().slice(0,60);save(p);ED.paint()}return}
    if(a==="delproj"&&p){if(!confirm("Delete the project “"+p.name+"”? Your takes stay in the archive."))return;stopPlay();const d=db();d.list=d.list.filter(x=>x.id!==p.id);d.cur=d.list[0]?d.list[0].id:"";persist();if(!d.list.length)newProject("Reel 1");ED.sel=null;ED.T=0;return ED.paint()}
    if(a==="export")return exportProject();
    if(a==="caps"&&p){p.capsOff=!p.capsOff;save(p);paintTop();paintInsp();say(p.capsOff?"Captions hidden: the export has no captions.":"Captions on: missing captions are written automatically when you export.","",3000);return showFrame()}
    if(a==="capstyle"){stopPlay();ED.sel=ED.sel&&ED.sel.kind==="cap"?null:{kind:"cap"};paintTop();paintTimeline();paintInsp();return showFrame()}
    if(a==="capreset"&&p){snapEd(p);delete p.cap;save(p);paintInsp();return compose()}
    if(a==="writecaps"&&p)return writeCaps(p,null).then(()=>{ED.paint()});
    if(a==="captions"){stopPlay();ED.sel={kind:"cap"};paintTop();paintTimeline();paintInsp();return showFrame()}   /* 9.55.0: captions are edited here, on T1 */
    /* 9.55.0: tracks */
    if(a==="trk-eye"&&p){const t=trackOf(p,b.getAttribute("data-id"));if(!t)return;stopPlay();snapEd(p);if(t.hidden)delete t.hidden;else t.hidden=true;save(p);ED.paint();say(t.name+(t.hidden?" hidden: it is left out of the viewer and the export.":" is back in the video."),"",2400);return}
    if(a==="trk-target"&&p){const t=trackOf(p,b.getAttribute("data-id"));if(!t)return;ED.target=t.id;ED.sel={kind:"trk",id:t.id};paintCalls();paintTimeline();paintInsp();return}
    if(a==="trk-add"&&p){stopPlay();snapEd(p);const tr=tracksOf(p),n=tr.length+2,t={id:"o"+uid(),name:"V"+n+" · CTA "+(n-1)};tr.push(t);ED.target=t.id;ED.sel={kind:"trk",id:t.id};save(p);ED.paint();say(t.name+" added on top. New callouts land on it.","ok",2600);return}
    if(a==="trk-del"&&p){const tr=tracksOf(p),t=trackOf(p,b.getAttribute("data-id"));if(!t||tr.length<2)return;const n=p.callouts.filter(c=>c.track===t.id).length;if(n&&!confirm("Delete "+t.name+" and its "+n+" callout"+(n===1?"":"s")+"?"))return;
      stopPlay();snapEd(p);p.callouts=p.callouts.filter(c=>c.track!==t.id);p.tracks=tr.filter(x=>x!==t);if(ED.target===t.id)ED.target="";ED.sel=null;save(p);ED.paint();return}
    /* 9.55.0: captions on T1 */
    if(a==="cc-gen")return genCaps(false);
    if(a==="cc-regen")return genCaps(true);
    if(a==="cc-script"&&p){const sg=segAt(segments(p),ED.T),t=sg&&sg.take,L=api()&&api().lc33;if(!t||!L||!L.fromScript)return;const r=L.fromScript(t);if(!r||!r.ok){say((r&&r.error)||"Write a script in Script Studio first.","err",4500);return}
      if(t.captions&&t.captions.length&&!confirm("Replace the "+t.captions.length+" captions of “"+t.name+"” with your script?"))return;t.captions=r.lines;try{T().Takes.persistMeta(t)}catch(x){}ED.capSt[t.id]={state:"ok",msg:"from script"};p.capsOff=false;save(p);ED.paint();say(r.lines.length+" captions made from your script for “"+t.name+"”. Check the timing on T1.","ok",4000);return}
    if(/^cl-/.test(a)&&ED.sel&&ED.sel.kind==="cl"){const t=takeById(ED.sel.take);if(!t||!t.captions)return;const c=t.captions[ED.sel.i];
      const done=()=>{t.captions.sort((x,y)=>x.s-y.s);try{T().Takes.persistMeta(t)}catch(x){}paintTimeline();paintInsp();compose()};
      if(a==="cl-del"&&c){t.captions.splice(ED.sel.i,1);ED.sel={kind:"cap"};done();return showFrame()}
      if(a==="cl-nudge"&&c){const k=b.getAttribute("data-k"),dd=+b.getAttribute("data-d");if(k==="s")c.s=+clamp(c.s+dd,0,c.e-.15).toFixed(2);else c.e=+clamp(c.e+dd,c.s+.15,durOf(t)).toFixed(2);delete c.w;return done()}
      if(a==="cl-split"&&c){const sg=segAt(segments(p),ED.T),at=sg&&sg.take.id===t.id?sg.s+(ED.T-sg.T0):-1;if(!(at>c.s+.1&&at<c.e-.1)){say("Put the playhead inside this caption first.","",2500);return}
        const ws=String(c.t).split(" "),k=Math.max(1,Math.round(ws.length*(at-c.s)/(c.e-c.s))),A={s:c.s,e:+at.toFixed(2),t:ws.slice(0,k).join(" ")},B={s:+at.toFixed(2),e:c.e,t:ws.slice(k).join(" ")||"…"};t.captions.splice(ED.sel.i,1,A,B);return done()}
      if(a==="cl-add"){const sg=segAt(segments(p),ED.T);if(!sg){say("Put the playhead on a block first.","",2500);return}const at=+(sg.s+(ED.T-sg.T0)).toFixed(2),nt=sg.take;nt.captions=(nt.captions||[]).concat([{s:at,e:+Math.min(durOf(nt),at+2).toFixed(2),t:"New caption"}]).sort((x,y)=>x.s-y.s);
        ED.sel={kind:"cl",take:nt.id,i:nt.captions.findIndex(x=>x.s===at&&x.t==="New caption")};try{T().Takes.persistMeta(nt)}catch(x){}p.capsOff=false;save(p);paintTimeline();paintInsp();return showFrame()}
    }
    if(a==="dl"){const t=takeById(b.getAttribute("data-take"));if(t&&t.blob){download(t.blob,String(t.name||"take").replace(/[^\w\- ().–]+/g,"").replace(/\s+/g,"-")+(/mp4/.test(t.mime||t.blob.type||"")?".mp4":".webm"));say("Downloading “"+t.name+"”.","",2000)}return}
    if(a==="srcopen"&&p&&p.src)return openFromProject(p);
    if(a==="recthis"&&p){wr(RK,p.id);closeLayer("lc79-ed");try{LC66.setTab(studioRoot(),"shoot")}catch(e){}say("Recording into “"+p.name+"”. Keys 1 to 4 switch the flow: board, feedback card, Lichess, landing page.","ok",5000);paintDock();return}
    if(a==="share"){return shareTake(b.getAttribute("data-take"))}
    if(a==="play")return togglePlay();
    if(a==="home"){stopPlay();ED.T=0;paintHead(true);return showFrame()}
    if(a==="split")return doSplit();
    if(a==="del")return doDelete();
    if(a==="undo")return undo();
    if(a==="cutsil")return doCutSilences();
    if(a==="silq"){setNle({cutMin:+b.getAttribute("data-v")});return paintTop()}
    if(a==="zin")return setZoom(ED.zoom*1.6);
    if(a==="zout")return setZoom(ED.zoom/1.6);
    if(a==="addtake")return addTake(b.getAttribute("data-take"));
    if(a==="deltake")return delTake(b.getAttribute("data-take"));
    if(a==="watch"){ED.sel={kind:"take",id:b.getAttribute("data-take")};paintInsp();const v=Q(".lc79-insp video",ED.el);if(v)try{v.focus()}catch(x){}return}
    if(a==="addco")return addCallout(b.getAttribute("data-pid"));
    if(a==="delpreset"){wr(PK,myPresets().filter(x=>x.pid!==b.getAttribute("data-pid")));return paintCalls()}
    /* 9.54.0: layers and versions */
    if(a==="lay-clip")return toggleHidden("clip",b.getAttribute("data-id"));
    if(a==="lay-co")return toggleHidden("co",b.getAttribute("data-id"));
    if(a==="lay-caps"&&p){p.capsOff=!p.capsOff;save(p);ED.paint();return}
    if(a==="hideit"&&p&&ED.sel&&(ED.sel.kind==="clip"||ED.sel.kind==="co"))return toggleHidden(ED.sel.kind,ED.sel.id);
    if(a==="var-save"&&p){const n=prompt("Name of this version (for example: Reel A, CTA 1)","Reel "+String.fromCharCode(65+((p.variants||[]).length%26)));if(!n||!n.trim())return;
      const v=Object.assign({id:uid(),name:n.trim().slice(0,40)},visOf(p));p.variants=(p.variants||[]).filter(x=>!sameVis(x,v)).concat([v]).slice(-12);save(p);paintLayers();const hn=v.tracks.length+v.clips.length+v.co.length;say("Version “"+v.name+"” saved: "+(v.tracks.length?"hidden track"+(v.tracks.length===1?"":"s")+" "+v.tracks.map(id=>(trackOf(p,id)||{}).name).join(", "):hn?hn+" hidden item"+(hn===1?"":"s"):"everything shown")+(v.capsOff?", no captions":"")+".","ok",3600);return}
    if(a==="var-apply"&&p){const v=(p.variants||[]).filter(x=>x.id===b.getAttribute("data-id"))[0];if(!v)return;stopPlay();snapEd(p);applyVis(p,v);save(p);ED.T=0;ED.paint();say("Layers of “"+v.name+"” in use.","",2200);return}
    if(a==="var-del"&&p){const v=(p.variants||[]).filter(x=>x.id===b.getAttribute("data-id"))[0];if(!v||!confirm("Delete the version “"+v.name+"”? The blocks and callouts stay."))return;p.variants=(p.variants||[]).filter(x=>x!==v);save(p);return paintLayers()}
    if(a==="var-all")return exportVersions();
    if(!p||!it)return;
    if(ED.sel.kind==="clip"){
      const i=p.clips.indexOf(it),t=takeById(it.take),v=Q("[data-clipvid]",ED.el);
      if(!/^(inhere|outhere|mvl|mvr|resetclip|rmclip)$/.test(a))return;
      if(a==="rmclip")return doDelete();
      snapEd(p);
      if(a==="inhere"&&v){const r=clipRange(it,t);it.in=Math.min(v.currentTime,r[1]-.1);if(it.out==null)it.out=r[1]}
      else if(a==="outhere"&&v){const r=clipRange(it,t);it.out=Math.max(v.currentTime,r[0]+.1);if(it.in==null)it.in=r[0]}
      else if(a==="mvl"&&i>0)p.clips.splice(i-1,0,p.clips.splice(i,1)[0]);
      else if(a==="mvr"&&i<p.clips.length-1)p.clips.splice(i+1,0,p.clips.splice(i,1)[0]);
      else if(a==="resetclip"){it.in=null;it.out=null;it.raw=false}
      else{ED.undo.pop();return}
      save(p);return ED.paint();
    }
    if(ED.sel.kind==="co"){
      if(a==="hear")return hear(it.sound);
      if(a==="savepreset"){const n=prompt("Name of the preset",it.text);if(!n||!n.trim())return;const list=myPresets();list.push({pid:"my-"+uid(),name:n.trim().slice(0,30),text:it.text,sub:it.sub,font:it.font,bg:it.bg,fg:it.fg,sound:it.sound,arrow:it.arrow,aim:"keep",x:it.x,y:it.y,ax:it.ax,ay:it.ay,dur:it.dur,scale:it.scale});wr(PK,list.slice(-24));say("Preset saved. It is in the callout bar now.","ok",2500);return paintCalls()}
      if(a==="rmco")return doDelete();
      if(a!=="aim"&&a!=="coat")return;
      snapEd(p);
      if(a==="aim"){const pt=aimPoint(b.getAttribute("data-aim"));it.arrow=true;it.ax=pt.x;it.ay=pt.y;it.x=clamp(pt.x<.5?pt.x+.27:pt.x-.27,.2,.8);it.y=clamp(pt.y-.15,.1,.88)}
      else it.t=+ED.T.toFixed(2);
      p.callouts.sort((x,y)=>x.t-y.t);save(p);return ED.paint();
    }
  }
  function onEdChange(e){
    const el=e.target,p=cur();
    if(el.matches('[data-a="addco-sel"]')){const v=el.value;el.value="";if(v)addCallout(v);return}
    if(el.matches('[data-f="trk_name"]')&&p&&ED.sel&&ED.sel.kind==="trk"){const t=trackOf(p,ED.sel.id);if(t){t.name=String(el.value||"").trim().slice(0,30)||t.name;save(p);paintCalls();paintTimeline()}return}
    if(el.matches('[data-f="cl_t"]')&&ED.sel&&ED.sel.kind==="cl"){const t=takeById(ED.sel.take),c=t&&t.captions&&t.captions[ED.sel.i];if(c){const nt=String(el.value||"").replace(/\s+/g," ").trim().slice(0,240);if(c.w&&nt.split(" ").length!==c.w.length)delete c.w;c.t=nt;try{T().Takes.persistMeta(t)}catch(x){}paintTimeline();compose()}return}
    if(el.matches('[data-f="track"]')&&p&&ED.sel&&ED.sel.kind==="co"){const c=selected();if(c&&trackOf(p,el.value)){snapEd(p);c.track=el.value;save(p);paintTimeline();compose()}return}
    if(el.matches('[data-a="pick"]')){stopPlay();db().cur=el.value;persist();ED.sel=null;ED.T=0;return ED.paint()}
    if(el.matches('[data-a="silmin"]')){setNle({cutMin:clamp(+el.value||4,.5,8)});return paintTop()}
    if(!p||!el.hasAttribute("data-f"))return;
    const f=el.getAttribute("data-f"),it=selected();
    if(f==="autoSil"){setNle({autoSil:!!el.checked});return}
    if(f==="autoMin"){setNle({silMin:clamp(+el.value||4,.5,8)});return}
    if(f==="autoCaps"){setNle({autoCaps:!!el.checked});return}
    if(f==="pname"){p.name=String(el.value||"").trim().slice(0,60)||p.name;save(p);return paintTop()}
    if(f==="size"){p.size=el.value;save(p);return showFrame()}
    if(f==="useCuts"){p.useCuts=el.checked;save(p);return ED.paint()}
    if(/^c_/.test(f)&&ED.sel&&ED.sel.kind==="cap"){snapSoft(p);setCap(p,f,el);save(p);return compose()}
    if(!it)return;
    if(ED.sel.kind==="clip"&&(f==="in"||f==="out")){snapEd(p);const t=takeById(it.take),D=t.durationMs/1e3,x=clamp(+el.value||0,0,D);trimClip(p,it.id,f==="in"?"l":"r",x);save(p);return ED.paint()}
    if(ED.sel.kind==="co"){snapSoft(p);setCo(it,f,el);p.callouts.sort((a,b)=>a.t-b.t);save(p);paintTimeline();if(f==="t")return showFrame();return}
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
    if(el.matches('[data-f="cl_t"]')&&ED.sel&&ED.sel.kind==="cl"){const t=takeById(ED.sel.take),c=t&&t.captions&&t.captions[ED.sel.i];if(c){const nt=String(el.value||"").replace(/\s+/g," ").slice(0,240);if(c.w&&nt.trim().split(" ").length!==c.w.length)delete c.w;c.t=nt;compose();clearTimeout(saveTo);saveTo=setTimeout(()=>{c.t=c.t.trim();try{T().Takes.persistMeta(t)}catch(x){}paintTimeline()},500)}return}
    if(el.matches('[data-a="scrub"]')){stopPlay();ED.T=+el.value||0;paintHead(true);return showFrame()}
    if(el.matches('[data-a="silmin"]')){const v=clamp(+el.value||4,.5,8),o=Q("[data-silv]",ED.el);if(o)o.textContent=v.toFixed(1)+" s";return}
    if(!el.hasAttribute("data-f")||!ED.sel)return;
    const f=el.getAttribute("data-f"),p=cur();
    if(ED.sel.kind==="cap"&&/^c_/.test(f)&&p){snapSoft(p);setCap(p,f,el);compose();clearTimeout(saveTo);saveTo=setTimeout(()=>save(p),350);return}
    if(ED.sel.kind!=="co"||f==="t"||f==="dur")return;
    const c=selected();if(!c)return;snapSoft(p);setCo(c,f,el);compose();clearTimeout(saveTo);saveTo=setTimeout(()=>{save(cur());paintTimeline()},350);
  }
  /* keys inside the Edit Studio: S / B split, Delete / Backspace delete, Space play, arrows step (Shift: 1 s), Ctrl+Z undo */
  function onEdKey(e){
    if(ED.busy||e.altKey||e.defaultPrevented)return;
    const t=e.target,tag=t&&t.tagName||"",k=e.key;
    if(/^(TEXTAREA|SELECT)$/.test(tag)||(tag==="INPUT"&&!/^(range|checkbox|color|button)$/.test(t.type))||(t&&t.isContentEditable))return;
    const done=()=>{e.preventDefault();e.stopPropagation()};
    if((e.ctrlKey||e.metaKey)&&(k==="z"||k==="Z")&&!e.shiftKey){done();return undo()}
    if(e.ctrlKey||e.metaKey)return;
    if(/^[sSbB]$/.test(k)){done();return doSplit()}
    if(/^[hH]$/.test(k)&&ED.sel&&(ED.sel.kind==="clip"||ED.sel.kind==="co")){done();return toggleHidden(ED.sel.kind,ED.sel.id)}
    if(k==="Delete"||k==="Backspace"){if(tag==="INPUT")return;done();return doDelete()}
    if(k===" "&&!/^(BUTTON|INPUT|VIDEO)$/.test(tag)&&!(t.closest&&t.closest(".lc79-clip,.lc79-co"))){done();return togglePlay()}
    if((k==="ArrowLeft"||k==="ArrowRight")&&tag!=="INPUT"&&tag!=="VIDEO"){done();stopPlay();ED.T=clamp(ED.T+(k==="ArrowLeft"?-1:1)*(e.shiftKey?1:1/30),0,ED.tot||0);paintHead(true);return showFrame()}
  }
  function bindTimeline(el){
    const tl=Q(".lc79-tl",el);let d=null,frameTo=0;
    const tTrack=()=>Q('[data-track="clips"]',el);
    const edgesOf=p=>{const segs=segments(p),out=[0,segs.total||0,ED.T];let last="";segs.forEach(s=>{if(s.clip.id!==last){out.push(s.T0);last=s.clip.id}});return out};
    tl.addEventListener("pointerdown",e=>{
      if(!e.target.closest(".lc79-lane")||e.button>0||e.target.closest("button"))return;
      const p=cur(),tot=segments(p).total||0;if(!tot)return;
      const r=laneEl().getBoundingClientRect(),hd=e.target.closest(".lc79-hd"),clip=e.target.closest(".lc79-clip"),co=e.target.closest(".lc79-co"),cl=e.target.closest(".lc79-cl");
      d={x0:e.clientX,y0:e.clientY,moved:false,clip:clip,co:co,r:r,tot:tot,pps:r.width/tot,id:e.pointerId};
      if(cl){const k=cl.getAttribute("data-cl").split("|"),t=takeById(k[0]),c=t&&t.captions&&t.captions[+k[1]];if(c){d.cl={el:cl,take:t,i:+k[1],c:c,s0:c.s,e0:c.e,w0:c.w?JSON.parse(JSON.stringify(c.w)):null,l0:parseFloat(cl.style.left)||0}}}
      if(hd&&clip){const id=clip.getAttribute("data-clip"),c=p.clips.filter(x=>x.id===id)[0],t=c&&takeById(c.take);
        if(c&&t){stopPlay();snapEd(p);d.trim={side:hd.getAttribute("data-h"),id:id,r0:clipRange(c,t)};ED.sel={kind:"clip",id:id}}}
      if(co){const c=p.callouts.filter(x=>x.id===co.getAttribute("data-co"))[0];d.c=c;d.t0=c?c.t:0;d.edges=edgesOf(p);snapEd(p)}
      try{tl.setPointerCapture(e.pointerId)}catch(x){}
      if(d.trim)e.preventDefault();
    });
    tl.addEventListener("pointermove",e=>{
      if(!d)return;const dx=e.clientX-d.x0;if(!d.moved&&Math.abs(dx)<(d.trim?2:8))return;d.moved=true;
      if(d.trim){const p=cur(),tr=d.trim;trimClip(p,tr.id,tr.side,(tr.side==="l"?tr.r0[0]:tr.r0[1])+dx/d.pps);paintTimeline({pps:d.pps});
        const ss=segments(p).filter(x=>x.clip.id===tr.id);if(ss.length){const z=ss[ss.length-1];ED.T=tr.side==="l"?ss[0].T0:Math.max(ss[0].T0,z.T0+(z.e-z.s)-.04);paintHead(true);clearTimeout(frameTo);frameTo=setTimeout(showFrame,40)}
        return}
      if(d.cl){const dt=dx/d.pps,c=d.cl.c,D=durOf(d.cl.take),len=d.cl.e0-d.cl.s0,ns=clamp(d.cl.s0+dt,0,Math.max(0,D-len));c.s=+ns.toFixed(2);c.e=+(ns+len).toFixed(2);
        if(d.cl.w0)c.w=d.cl.w0.map(w=>({s:+(w.s+ns-d.cl.s0).toFixed(2),e:+(w.e+ns-d.cl.s0).toFixed(2)}));d.cl.el.style.left=(d.cl.l0+(ns-d.cl.s0)/d.tot*100)+"%";return}
      if(d.clip){d.clip.classList.add("drag");let ins=Q(".lc79-ins",tl);if(!ins){ins=document.createElement("div");ins.className="lc79-ins";laneEl().appendChild(ins)}
        const idx=dropIndex(e.clientX);d.idx=idx;const bl=QA(".lc79-clip",tTrack()),r0=laneEl().getBoundingClientRect();
        const xx=idx>=bl.length?(bl.length?bl[bl.length-1].getBoundingClientRect().right:d.r.left):bl[idx].getBoundingClientRect().left;ins.style.left=(xx-r0.left-1)+"px"}
      else if(d.c){let t=clamp(d.t0+dx/d.pps,0,d.tot);const th=8/d.pps;let bd=th;d.edges.forEach(x=>{const dd=Math.abs(x-t);if(dd<bd){bd=dd;t=x}});d.c.t=+t.toFixed(2);d.co.style.left=(d.c.t/d.tot*100)+"%";
        /* 9.55.0: up or down moves the callout to another overlay track */
        let row=null;try{const hit=document.elementFromPoint(e.clientX,e.clientY);row=hit&&hit.closest&&hit.closest(".lc79-track.co")}catch(x){}
        if(row&&row!==d.co.parentNode){row.appendChild(d.co);d.newTrack=row.getAttribute("data-tid")}}
      else{ED.T=clamp((e.clientX-d.r.left)/d.r.width*d.tot,0,d.tot);paintHead(true)}
    });
    const end=e=>{
      if(!d)return;const p=cur(),dd=d;d=null;const ins=Q(".lc79-ins",tl);if(ins)ins.remove();
      if(dd.trim){if(dd.moved){save(p);ED.paint();return}ED.undo.pop();const s=segments(p).filter(x=>x.clip.id===dd.trim.id)[0];if(s)ED.T=s.T0;paintTop();paintTimeline();paintInsp();return showFrame()}
      if(dd.clip&&dd.moved&&dd.idx!=null){const id=dd.clip.getAttribute("data-clip"),i=p.clips.findIndex(c=>c.id===id);if(i>=0){let j=dd.idx;if(j>i)j--;if(j!==i){snapEd(p);const c=p.clips.splice(i,1)[0];p.clips.splice(j,0,c);save(p)}}ED.sel={kind:"clip",id:id};return ED.paint()}
      if(dd.cl){ED.sel={kind:"cl",take:dd.cl.take.id,i:dd.cl.i};stopPlay();if(dd.moved){try{T().Takes.persistMeta(dd.cl.take)}catch(x){}}
        const it=capItems(p).filter(x=>x.take.id===dd.cl.take.id&&x.i===dd.cl.i)[0];if(it)ED.T=it.T0;paintTop();paintTimeline();paintInsp();return showFrame()}
      if(dd.c){if(dd.newTrack&&trackOf(p,dd.newTrack)){dd.c.track=dd.newTrack;dd.moved=true}if(!dd.moved)ED.undo.pop();else{p.callouts.sort((a,b)=>a.t-b.t);save(p);if(dd.newTrack)say("Moved to "+trackOf(p,dd.newTrack).name+".","",1600)}ED.sel={kind:"co",id:dd.c.id};stopPlay();ED.T=dd.c.t;paintTop();paintTimeline();paintInsp();return showFrame()}
      if(dd.clip){const id=dd.clip.getAttribute("data-clip");ED.sel={kind:"clip",id:id};stopPlay();const x=clamp((e.clientX-dd.r.left)/dd.r.width*dd.tot,0,dd.tot);ED.T=x;paintTop();paintTimeline();paintInsp();return showFrame()}
      stopPlay();if(!dd.moved){ED.T=clamp((e.clientX-dd.r.left)/dd.r.width*dd.tot,0,dd.tot)}ED.sel=null;paintTop();paintTimeline();paintInsp();showFrame();
    };
    tl.addEventListener("pointerup",end);tl.addEventListener("pointercancel",()=>{if(d&&d.trim&&d.moved)save(cur());d=null;const ins=Q(".lc79-ins",tl);if(ins)ins.remove()});
    tl.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const c=e.target.closest(".lc79-clip,.lc79-co,.lc79-cl");if(!c)return;e.preventDefault();
      if(c.classList.contains("lc79-cl")){const k=c.getAttribute("data-cl").split("|");ED.sel={kind:"cl",take:k[0],i:+k[1]}}else ED.sel=c.classList.contains("lc79-clip")?{kind:"clip",id:c.getAttribute("data-clip")}:{kind:"co",id:c.getAttribute("data-co")};paintTop();paintTimeline();paintInsp()});
    function dropIndex(x){const bl=QA(".lc79-clip",tTrack());for(let i=0;i<bl.length;i++){const r=bl[i].getBoundingClientRect();if(x<r.left+r.width/2)return i}return bl.length}
    /* drag a take from the archive onto the timeline (mouse) */
    el.addEventListener("dragstart",e=>{const c=e.target.closest&&e.target.closest(".lc79-card");if(!c)return;try{e.dataTransfer.setData("text/plain","lc79:"+c.getAttribute("data-take"));e.dataTransfer.effectAllowed="copy"}catch(x){}});
    tl.addEventListener("dragover",e=>{e.preventDefault()});
    tl.addEventListener("drop",e=>{e.preventDefault();let v="";try{v=e.dataTransfer.getData("text/plain")}catch(x){}const m=/^lc79:(.+)$/.exec(v||"");if(m)addTake(m[1],dropIndex(e.clientX))});
  }
  function bindCanvas(el){
    const cv=Q(".lc79-stagebox canvas",el);let d=null;
    const pt=e=>{const r=cv.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);return{r:r,fx:(e.clientX-r.left)/w,fy:(e.clientY-r.top)/h,px:(e.clientX-r.left)/w*cv.width,py:(e.clientY-r.top)/h*cv.height,k:cv.width/w}};
    /* 2 = the resize corner of the selected caption box, 1 = inside the box */
    const onCap=q=>{const c=ED.capRect;if(!c||ED.playing)return 0;const hs=18*q.k,pad=6*q.k;
      if(ED.sel&&ED.sel.kind==="cap"&&Math.abs(q.px-(c.x+c.w))<hs&&Math.abs(q.py-(c.y+c.h))<hs)return 2;
      return q.px>=c.x-pad&&q.px<=c.x+c.w+pad&&q.py>=c.y-pad&&q.py<=c.y+c.h+pad?1:0};
    cv.addEventListener("pointerdown",e=>{
      if(ED.playing)return;const q=pt(e),p=cur();if(!p)return;const hit=onCap(q);
      if(hit){snapEd(p);if(!p.cap)p.cap=capStyle(p,cv.width,cv.height);d={cap:true,resize:hit===2,st0:Object.assign({},p.cap),q0:q,cr:Object.assign({},ED.capRect),moved:false};
        if(!(ED.sel&&ED.sel.kind==="cap")){ED.sel={kind:"cap"};paintTop();paintTimeline();paintInsp();compose()}
        try{cv.setPointerCapture(e.pointerId)}catch(x){}e.preventDefault();return}
      if(!ED.sel||ED.sel.kind!=="co")return;const c=selected();if(!c)return;
      snapEd(p);const tip=c.arrow&&Math.hypot((q.fx-c.ax)*q.r.width,(q.fy-c.ay)*q.r.height)<36;d={c:c,tip:tip,r:q.r};try{cv.setPointerCapture(e.pointerId)}catch(x){}
      e.preventDefault();
    });
    cv.addEventListener("pointermove",e=>{
      const q=pt(e);
      if(!d){const h=onCap(q);cv.style.cursor=h===2?"nwse-resize":h?"move":"";return}
      if(d.cap){const c=cur().cap;d.moved=true;
        if(d.resize){const ratio=Math.max(.2,(q.px-d.cr.x)/Math.max(10,d.cr.w));c.scale=+clamp(d.st0.scale*ratio,.4,3).toFixed(3)}
        else{c.x=+clamp(d.st0.x+(q.px-d.q0.px)/cv.width,0,1).toFixed(4);c.y=+clamp(d.st0.y+(q.py-d.q0.py)/cv.height,0,1).toFixed(4)}
        return compose()}
      const fx=clamp((e.clientX-d.r.left)/d.r.width,0,1),fy=clamp((e.clientY-d.r.top)/d.r.height,0,1);if(d.tip){d.c.ax=fx;d.c.ay=fy}else{d.c.x=clamp(fx,.05,.95);d.c.y=clamp(fy,.05,.95)}compose();
    });
    const up=()=>{if(!d)return;const dd=d;d=null;if(dd.cap&&!dd.moved){ED.undo.pop();return}save(cur());paintInsp()};cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);
    cv.addEventListener("wheel",e=>{const q=pt(e);if(!onCap(q))return;e.preventDefault();const p=cur();snapSoft(p);if(!p.cap)p.cap=capStyle(p,cv.width,cv.height);
      p.cap.scale=+clamp((+p.cap.scale||1)*(e.deltaY<0?1.06:1/1.06),.4,3).toFixed(3);compose();clearTimeout(saveTo);saveTo=setTimeout(()=>{save(p);if(ED.sel&&ED.sel.kind==="cap")paintInsp()},300)},{passive:false});
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
  /* 9.39.1: what the mistake changed on the board, as plain facts (lost defence, new attacks, pieces left hanging) */
  function pieceList(fen,color,withKing){const out=[];try{new Chess(fen).board().forEach((row,ri)=>row.forEach((x,fi)=>{if(x&&x.color===color&&(withKing||x.type!=="k"))out.push({sq:FILES[fi]+(8-ri),type:x.type})}))}catch(e){}return out}
  function defends(fen,from,sq){
    try{const b=new Chess(fen),pc=b.get(from),t=b.get(sq);if(!pc||!t||t.type==="k"||t.color!==pc.color)return false;
      b.remove(sq);b.put({type:t.type,color:t.color==="w"?"b":"w"},sq);const g=new Chess();if(!g.load(withTurn(b.fen(),pc.color)))return false;
      return g.moves({square:from,verbose:true}).some(m=>m.to===sq)}catch(e){return false}
  }
  const defended=(fen,sq,color)=>pieceList(fen,color,true).some(q=>q.sq!==sq&&defends(fen,q.sq,sq));
  function attackers(fen,sq,byColor){return pieceList(fen,byColor,true).filter(q=>hitsFrom(fen,q.sq).some(h=>h.sq===sq))}
  const pn=(t,sq)=>"the "+NAME[t]+" on "+sq;
  const MACT={fork:"Before every move, check each square where their knight or queen could attack two of your pieces at once.",pin:"Before you move a piece, look along every line from their bishops, rooks and queen to your king and queen.",skewer:"Before you move a piece, look along every line from their bishops, rooks and queen to your king and queen.",
    hanging:"Before you move, list which of your pieces are undefended, and which of theirs you can take.",capture:"Before you move, list which of your pieces are undefended, and which of theirs you can take.",mate:"Before every move, list every check they have, and every check you have.",check:"Before every move, list every check they have, and every check you have.",
    discovered:"Before you move, look behind their pieces: which line opens if one of them moves?",plan:"Before every move, say the plan of this position in one sentence."};
  function boardChange(g,it){
    const before=g.fens[it.i],after=g.fens[it.i+1],m=g.moves[it.i];if(!before||!after||!m)return[];
    const us=it.color,them=us==="w"?"b":"w",out=[];let mt="";try{mt=(new Chess(before).get(m.from)||{}).type||""}catch(e){}
    const worth=(p,att,free)=>att.length&&(free||VAL[att[0].type]<VAL[p.type]);   /* only facts that cost material */
    try{
      const cap=(new Chess(before).get(m.to)||{}).type;if(cap&&cap!=="k")out.push(it.san+" took "+pn(cap,m.to)+".");
      /* the moved piece itself */
      const att0=attackers(after,m.to,them).sort((a,b)=>VAL[a.type]-VAL[b.type]),free0=!defended(after,m.to,us),mp={type:mt||"p",sq:m.to};
      if(worth(mp,att0,free0))out.push(free0?"The "+NAME[mp.type]+" on "+m.to+" now stands where "+pn(att0[0].type,att0[0].sq)+" attacks it and nothing defends it.":"The "+NAME[mp.type]+" on "+m.to+" can be taken by "+pn(att0[0].type,att0[0].sq)+", a piece of lower value.");
      /* defence the moved piece gave up */
      const lost=pieceList(before,us).filter(p=>p.sq!==m.from&&p.sq!==m.to&&defends(before,m.from,p.sq)&&!defends(after,m.to,p.sq)&&new Chess(after).get(p.sq));
      lost.forEach(p=>{const att=attackers(after,p.sq,them).sort((a,b)=>VAL[a.type]-VAL[b.type]),free=!defended(after,p.sq,us);
        if(worth(p,att,free))out.push("The "+NAME[mt||"p"]+" left "+m.from+", so it no longer defends "+pn(p.type,p.sq)+(free?", which is now attacked by "+pn(att[0].type,att[0].sq)+" and has no defender left.":"; "+pn(att[0].type,att[0].sq)+" can now win it."))});
      /* other pieces that came under attack (an opened line) */
      pieceList(after,us).forEach(p=>{
        if(p.sq===m.to||lost.some(l=>l.sq===p.sq))return;
        const att=attackers(after,p.sq,them).sort((a,b)=>VAL[a.type]-VAL[b.type]);if(!att.length||attackers(before,p.sq,them).length)return;
        const free=!defended(after,p.sq,us);if(worth(p,att,free))out.push("It opened an attack on "+pn(p.type,p.sq)+" by "+pn(att[0].type,att[0].sq)+(free?", and that piece has no defender.":"."))});
      try{const a=new Chess(after);if(a.in_check())out.push("It left the king in check.")}catch(e){}
    }catch(e){}
    return out.slice(0,4);
  }
  /* SAN with move numbers from a FEN, e.g. "23. Nxe5 Bxd1 24. Bxf7+" */
  function numbered(fen,ucis){
    const g=new Chess(fen),parts=[];let n=+(String(fen).split(" ")[5])||1;
    (ucis||[]).forEach((u,i)=>{const side=g.turn(),m=g.move(uci(u));if(!m)return;parts.push(side==="w"?n+". "+m.san:(i===0?n+"... "+m.san:m.san));if(side==="b")n++});
    return parts.join(" ");
  }
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
          if(r.captured&&VAL[r.captured]>=VAL[r.piece]+2&&r.piece!=="k")return mo("hanging","Piece lost for less",r.san+" wins the "+NAME[r.captured]+" for a "+NAME[r.piece]+".");if(r.captured&&VAL[r.captured]>=3){const back=b.moves({verbose:true}).some(m=>m.to===r.to);if(!back)return mo("hanging","Hanging piece",r.san+" takes the "+NAME[r.captured]+" and nothing can take back.")}
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
    if(c.diag){const d=c.diag;   /* 9.56.0: four questions answered for THIS position */
      if(prev)out.push(["M","Why did they play "+prev.san+"?",d.why]);
      out.push(["S","Which Alarm Signal should have gone off?",d.alarm.label+": "+d.alarm.say]);
      out.push(["P","How does a human find "+(it.bestSan||"the better move")+"?",d.find||"Compare your candidate moves on what they leave behind."]);
      out.push(["C","What does "+it.san+" allow?",d.error]);
      return out}
    if(prev){
      /* 9.43.0: only facts. A move "attacks" a piece only when that piece can be won (no defender, or a cheaper attacker): LC83 when loaded */
      let said="";
      try{if(typeof LC83!=="undefined"){const mf=LC83.moveFacts(g.fens[it.i-1],{from:prev.from,to:prev.to,promotion:prev.promotion||"q"},it.color);
        if(mf)said=mf.quiet?"A quiet move: it attacks nothing that can be won."+(mf.facts.length?" "+LC83.factText(mf,1):""):LC83.factText(mf,2)}}catch(e){said=""}
      if(!said){const pc=(new Chess(g.fens[it.i]).get(prev.to)||{}).type||"p";
        const hs=hitsFrom(g.fens[it.i],prev.to).filter(x=>x.type!=="k"&&(!defended(g.fens[it.i],x.sq,it.color)||VAL[pc]<VAL[x.type]));
        said=hs.length?"It attacks "+list2(hs.map(x=>"the "+NAME[x.type]+" on "+x.sq))+", which can be won.":"A quiet move: it attacks nothing that can be won. Look at what it prepares."}
      out.push(["M","What did "+prev.san+" change?",said]);
    }
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
      el.innerHTML='<header class="lc79-top"><button type="button" class="lc79-b" data-a="close" data-autofocus aria-label="Back to the Studio">← Studio</button><h2>Game-to-Script AI</h2><span class="lc79-grow"></span><button type="button" class="lc79-b sm" data-a="toprojects">Projects</button><button type="button" class="lc79-b sm" data-a="toedit">Edit Studio and captions</button></header><div class="lc79-body"><div class="lc79-ai"></div></div>';
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
      AI.g=g;AI.items=items;AI.list=list.slice(0,12);AI.ci=0;buildCase();
    }catch(e){if(!AI.cancel)status(e.message||"The analysis failed.",true);AI.busy=false;return}
    AI.busy=false;paintAi();status("");findSimilar();cloudEval();
  }
  /* 9.56.0: the diagnosis of THIS mistake (LC83.diagnose: the board, Stockfish's better move and refutation, their last move and threat) */
  function diagOf(g,it){
    try{if(typeof LC83==="undefined"||!LC83.diagnose)return null;const m=g.moves[it.i],pm=it.i>0?g.moves[it.i-1]:null;if(!m)return null;
      return LC83.diagnose({fen:g.fens[it.i],color:it.color,played:{from:m.from,to:m.to,promotion:m.promotion||"q",san:m.san},bestUci:it.best||"",replyUci:it.reply||"",
        prevFen:it.i>0?g.fens[it.i-1]:null,oppUci:pm&&pm.from?pm.from+pm.to+(pm.promotion||""):null,threatUci:it.threat&&it.threat.best||""})}catch(e){return null}
  }
  function makeCase(g,it){
    const fen=g.fens[it.i],color=it.color,dg=diagOf(g,it);
    const letter=dg?dg.k:it.k&&LN[it.k]?it.k:(it.cls==="blunder"?"M":"S"),al=dg?{id:dg.id,label:dg.alarm.label,say:dg.alarm.say}:pickAlarm(fen,color,letter),motif=motifOf(g,it);
    let action="";if(dg)action=dg.action;else{try{action=LC64.actionOf(al&&al.id,letter)}catch(e){action=""}if(!action||action===WP[letter])action=MACT[motif.id]||MACT.plan}
    const h=g.headers||{},rating=+(color==="w"?h.WhiteElo:h.BlackElo)||0;
    const c={it:it,fen:fen,color:color,letter:letter,alarm:al,motif:motif,wp:dg?dg.wp.text:WP[letter],action:action,diag:dg,error:dg?dg.error:"",rating:rating,student:color==="w"?(h.White||"White"):(h.Black||"Black"),
      opp:color==="w"?(h.Black||"Black"):(h.White||"White"),start:Math.max(1,(it.num||Math.ceil((it.i+1)/2))-3)};
    c.qs=socratic(g,it,c);c.pgn=trimmedPgn(g,it);c.change=boardChange(g,it);
    return c;
  }
  function buildCase(){AI.cs=makeCase(AI.g,AI.list[AI.ci])}
  const mvLabel=it=>(it.color==="w"?it.num+". ":it.num+"... ")+it.san+(it.cls==="blunder"?"??":it.cls==="mistake"?"?":"?!");
  const ITEM_KEYS=["i","color","san","num","loss","cls","best","bestSan","reply","replySan","k"];
  const slimItem=it=>{const o={};ITEM_KEYS.forEach(k=>{if(it[k]!=null)o[k]=it[k]});return o};
  function pgnKey(p){let h=0;const t=String(p||"").replace(/\s+/g," ");for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return"g"+(h>>>0).toString(36)}
  function projectFor(key,i){return db().list.filter(p=>p.src&&p.src.key===key&&p.src.item&&p.src.item.i===i)[0]||null}
  /* 9.40.0: one video project per mistake. The project keeps the game, so the recording flow and the master prompt can use it later. */
  function mkProject(idx,quiet){
    const it=AI.list[idx];if(!it||!AI.g)return null;const key=pgnKey(AI.pgn);
    const had=projectFor(key,it.i);if(had)return had;
    const c=makeCase(AI.g,it),p=newProject(("Reel · "+mvLabel(it)+" · "+c.student).slice(0,60));
    p.src={key:key,pgn:String(AI.pgn).slice(0,2e5),item:slimItem(it),label:mvLabel(it)+" ("+(AI.g.headers&&AI.g.headers.White||"White")+" vs "+(AI.g.headers&&AI.g.headers.Black||"Black")+")",motif:c.motif.label,sim:null};
    if(AI.cs&&AI.cs.it&&AI.cs.it.i===it.i&&AI.sim&&!AI.sim.err)p.src.sim=simSlim(AI.sim);
    save(p);if(!quiet)say("Project “"+p.name+"” made. Pick it in the record bar to record it.","ok",3500);return p;
  }
  const simSlim=s=>({id:s.id,rating:s.rating,themes:(s.themes||[]).slice(0,6),fen:s.fen,side:s.side,line:s.line||"",solSan:s.solSan||[]});
  function caseHTML(){
    const c=AI.cs,it=c.it,arr=[{from:it.i!=null&&AI.g.moves[it.i].from,to:AI.g.moves[it.i].to,color:"#ef4444"}];
    if(it.best)arr.push({from:it.best.slice(0,2),to:it.best.slice(2,4),color:"#38bdf8"});
    const loss=Math.round(it.loss),mv=(c.color==="w"?it.num+". ":it.num+"... ");
    const key=pgnKey(AI.pgn);
    let h='<section class="lc79-sec" aria-labelledby="lc79-sb"><h3 id="lc79-sb">2. Every crucial mistake in this game ('+AI.list.length+')</h3><p class="lc79-hint" style="margin:0">One game, several reels: make a video project for each mistake you want to film. Each project keeps the game for the recording flow and the master prompt.</p><div class="lc79-games">'
      +AI.list.map((x,i)=>{const pr=projectFor(key,x.i);let mo="";try{mo=motifOf(AI.g,x).label}catch(e){}
        return'<div class="lc79-game'+(i===AI.ci?'" style="border-color:#00E5FF':'')+'"><span><b>'+esc(mvLabel(x))+'</b> · '+(x.color==="w"?"White":"Black")+' · '+Math.round(x.loss)+'% · '+esc(mo)+'</span><span class="lc79-row">'
        +'<button type="button" class="lc79-b sm" data-a="case" data-i="'+i+'"'+(i===AI.ci?' aria-pressed="true"':'')+'>'+(i===AI.ci?"Shown":"Show")+'</button>'
        +(pr?'<button type="button" class="lc79-b sm" data-a="openproj" data-p="'+esc(pr.id)+'">Project made: open</button>':'<button type="button" class="lc79-b sm pri" data-a="mkproj" data-i="'+i+'">Make a video project</button>')+'</span></div>'}).join("")
      +'</div><div class="lc79-row"><button type="button" class="lc79-b gold" data-a="mkall">Make a project for every mistake ('+AI.list.filter(x=>!projectFor(key,x.i)).length+' new)</button><button type="button" class="lc79-b sm" data-a="toprojects">Open Projects</button></div></section>';
    h+='<section class="lc79-sec" aria-labelledby="lc79-s2"><h3 id="lc79-s2">3. '+esc(mvLabel(it))+' in detail</h3><div class="lc79-case"><div>'+boardSVG(c.fen,c.color,arr)+'<p class="lc79-hint" style="margin:6px 0 0">Red: the move played. Blue: the better move. '+esc(c.student)+' ('+(c.color==="w"?"White":"Black")+(c.rating?", "+c.rating:"")+').</p></div><div class="lc79-facts">'
      +'<div class="lc79-fact mo"><b>'+esc(mv+it.san)+(it.cls==="blunder"?"??":"?")+'</b>'+(it.bestSan?' Better: <b>'+esc(it.bestSan)+'</b>.':'')+' It cost about '+loss+'% win chance.</div>'
      +(c.error?'<div class="lc79-fact mo"><b>What went wrong:</b> '+esc(c.error)+'</div>':c.change&&c.change.length?'<div class="lc79-fact mo"><b>What it changed:</b> '+esc(c.change.join(" "))+'</div>':'')+'<div class="lc79-fact mo"><b>Motif: '+esc(c.motif.label)+'.</b> '+esc(c.motif.text)+'</div>'
      +(c.diag&&c.diag.why?'<div class="lc79-fact"><b>Their last move:</b> '+esc(c.diag.why)+'</div>':'')
      +'<div class="lc79-fact al"><b>Alarm Signal:</b> '+(c.alarm?esc(c.alarm.label)+". "+esc(c.alarm.say):"none of the standard alarms; the error came from skipping an MSPC step.")+'</div>'
      +'<div class="lc79-fact wp"><b>Working Point ('+LN[c.letter]+'):</b> '+esc(c.wp)+'</div>'
      +'<div class="lc79-fact"><b>Action Step:</b> '+esc(c.action)+'</div>'
      +'<div class="lc79-fact" data-cloud>'+cloudHTML()+'</div></div></div>'
      +'<h4>The Socratic trim: the questions that would have saved the game</h4><ol class="lc79-q">'+c.qs.map(q=>'<li><b>'+q[0]+'</b>'+esc(q[1])+' <span class="lc79-hint">'+esc(q[2])+'</span></li>').join("")+'</ol>'
      +'<h4>Trimmed game (the video starts at move '+c.start+')</h4><div class="lc79-pre" tabindex="0">'+esc(c.pgn)+'</div>'
      +'<div class="lc79-row"><button type="button" class="lc79-b sm" data-a="toboard">Load into the Studio board</button><button type="button" class="lc79-b sm" data-a="copypgn">Copy PGN</button></div></section>';
    h+='<section class="lc79-sec" aria-labelledby="lc79-s3"><h3 id="lc79-s3">4. A similar position for the re-hook</h3><div data-sim>'+simHTML()+'</div><div class="lc79-row"><button type="button" class="lc79-b sm" data-a="sim">Find another one</button></div></section>';
    h+='<section class="lc79-sec" aria-labelledby="lc79-s4"><h3 id="lc79-s4">5. Prompt for Claude</h3><p class="lc79-hint" style="margin:0">The game data goes out: game context, the MSPC diagnosis and the Lichess position (Bullet Points adds the pawn check and the Release Giveaway). The script style comes from your own Claude instructions.</p>'
      +'<div class="lc79-row"><button type="button" class="lc79-b pri" data-a="copyprompt">Get Prompt: Full Script</button><button type="button" class="lc79-b gold" data-a="copybullets">Get Prompt: Bullet Points</button><button type="button" class="lc79-b sm" data-a="showprompt">Show the prompt</button></div><p class="lc79-hint" style="margin:0"><b>Full Script</b>: Claude writes every word. <b>Bullet Points</b>: a freestyle skeleton (the exact hook, 2 to 3 core points with the pawn check, the aha moment, the bridge to the app, the Release Giveaway CTA) so you talk freely on camera.</p><div class="lc79-pre" data-prompt hidden tabindex="0"></div>'
      +'<label class="lc79-f"><span>Paste Claude’s script here</span><textarea data-f="answer" placeholder="Paste the script Claude wrote, then press Use as my script."></textarea></label><div class="lc79-row"><button type="button" class="lc79-b gold" data-a="usescript">Use as my script</button><span class="lc79-hint">It replaces the text in the Studio’s script panel and prompter.</span></div></section>';
    return h;
  }
  function cloudHTML(){const c=AI.cloud;if(!c)return'<span class="lc79-hint">Lichess cloud evaluation: checking…</span>';if(c.none)return'<span class="lc79-hint">Lichess cloud evaluation: this position is not in the Lichess cloud.</span>';return'<b>Lichess cloud agrees?</b> Best '+esc(c.san||c.uci)+', '+esc(c.ev)+' (depth '+c.depth+').'}
  function simHTML(){
    const s=AI.sim;if(!s)return'<p class="lc79-hint">Searching Lichess for a puzzle with the same motif…</p>';if(s.err)return'<p class="lc79-hint lc79-err">'+esc(s.err)+'</p>';
    return'<div class="lc79-case"><div>'+boardSVG(s.fen,s.side,s.last?[{from:s.last.from,to:s.last.to,color:"#ef4444"}]:[])+'</div><div class="lc79-facts"><div class="lc79-fact"><b>Lichess puzzle '+esc(s.id)+'</b>, rating '+s.rating+'. Themes: '+esc(s.themes.slice(0,5).join(", "))+'.</div><div class="lc79-fact">'+(s.side==="w"?"White":"Black")+' to move. Winning line: <b>'+esc(s.line||s.solSan.join(" "))+'</b></div><div class="lc79-fact"><a href="https://lichess.org/training/'+esc(s.id)+'" target="_blank" rel="noopener" style="color:#38bdf8">Open on Lichess</a></div></div></div>';
  }
  async function findSimilar(){
    const c=AI.cs;if(!c)return;AI.sim=null;const box=Q("#lc79-ai [data-sim]");if(box)box.innerHTML=simHTML();
    try{
      const theme=c.motif.theme||LC64.themeFor(c.alarm&&c.alarm.id,c.letter),target=c.rating||((()=>{try{return LC64.rating()}catch(e){return 1500}})());
      const f=await LC64.liClosest(clamp(target,600,2800),theme),P=f&&LC64.puzzleFromJson(f.json);
      if(!P)throw new Error("none");
      const g=new Chess(P.fen),solSan=[];(P.solution||[]).forEach(u=>{const m=g.move(uci(u));if(m)solSan.push(m.san)});
      AI.sim={id:P.id,rating:P.rating,themes:P.themes||[],fen:P.fen,side:P.side,last:P.last,solSan:solSan,line:numbered(P.fen,P.solution||[]),theme:theme};
      try{const pr=projectFor(pgnKey(AI.pgn),c.it.i);if(pr&&!pr.src.sim){pr.src.sim=simSlim(AI.sim);save(pr)}}catch(e){}
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
  /* 9.39.1: a pure data package. No beats, no timings, no script rules: the structure comes from the owner's own Claude instructions. */
  const CLOSE="Based on this game data, generate a ~90-second high-retention viral script strictly following your v2.5 Master System Instructions and Project Knowledge Library.";
  /* 9.42.0: Bullet Points mode. Same data, plus the pawn check and the Release Giveaway, and a closing block that asks for a freestyle skeleton
     (no written-out sentences except the hook and the bridge). The Full Script prompt is unchanged. */
  const BCLOSE=["Based on this game data, do NOT write a full script. Following your v2.5 Master System Instructions and Project Knowledge Library, give me a freestyle bullet-point skeleton for a ~60 to 90-second video that I talk through freely on camera, in exactly these 5 parts:",
"1. THE HOOK: the exact opening sentence, word for word.",
"2. CORE POINTS: 2 to 3 short chess anchor points I must touch (keywords, not sentences), one of them the pawn check: which pieces and pawns were undefended (use the PAWN CHECK block) and what that allowed.",
"3. AHA MOMENT: the core of the Lichess puzzle in one line.",
"4. BRIDGE / RE-HOOK (triangle): the one transition sentence from the lesson to the app, word for word.",
"5. CTA: the Release Giveaway call to action in one or two sentences (use the RELEASE GIVEAWAY block).",
"Rules: no guaranteed results and no rating promises (results differ per person), never call the app free or cheap, never say lifetime or forever, no named competitors."].join("\n");
  function pawnCheck(fen){
    const out=[];
    ["w","b"].forEach(col=>{
      const them=col==="w"?"b":"w",loose=[];
      pieceList(fen,col).forEach(p=>{if(defended(fen,p.sq,col))return;const att=attackers(fen,p.sq,them).sort((a,b)=>VAL[a.type]-VAL[b.type]);
        loose.push({p:p,att:att[0]||null})});
      loose.sort((a,b)=>(!!b.att-!!a.att)||(VAL[b.p.type]-VAL[a.p.type]));
      out.push((col==="w"?"White":"Black")+": "+(loose.length?loose.slice(0,8).map(x=>pn(x.p.type,x.p.sq)+(x.att?" (attacked by "+pn(x.att.type,x.att.sq)+")":"")).join(", "):"every piece and pawn is defended"));
    });
    return out;
  }
  function buildPrompt(mode){
    const c=AI.cs,g=AI.g,it=c.it,h=g.headers||{},s=AI.sim&&!AI.sim.err?AI.sim:null,bul=mode==="bullets";
    const mv=(c.color==="w"?it.num+". ":it.num+"... ")+it.san+(it.cls==="blunder"?"??":"?"),bm=it.bestSan?(c.color==="w"?it.num+". ":it.num+"... ")+it.bestSan:"";
    const elo=(n,e)=>n+(e?" ("+e+")":"");
    const q=k=>(c.qs.filter(x=>x[0]===k)[0]||[]);
    let feats=[];try{feats=(LC61.detect(c.fen,c.color)||[]).map(a=>a.label)}catch(e){}
    const L=[
"GAME CONTEXT",
"- White: "+elo(h.White||"White",h.WhiteElo),
"- Black: "+elo(h.Black||"Black",h.BlackElo),
(h.Result||h.Site||h.Date?"- Game: "+[h.Result?"result "+h.Result:"",h.Site||"",h.Date||h.UTCDate||""].filter(Boolean).join(", "):null),
"- Player with the mistake: "+c.student+" ("+(c.color==="w"?"White":"Black")+(c.rating?", "+c.rating:"")+")",
"- Moment: move "+it.num+", "+(c.color==="w"?"White":"Black")+" to move",
"- Crucial mistake: "+mv+(bm?" (better: "+bm+")":"")+", about "+Math.round(it.loss)+"% win chance lost",
"- What it changed on the board: "+(c.change&&c.change.length?c.change.join(" "):"no single piece lost its defender; the move changed the plan, not the material."),
(it.replySan?"- Their best reply: "+it.replySan:null),
"- Motif: "+c.motif.label+". "+c.motif.text,
"- FEN before the mistake: "+c.fen,
"- Moves up to the mistake and the reply (PGN): "+trimmedPgn(g,it,true),
"",
"MSPC DIAGNOSIS",
"- Move: "+(q("M")[1]?q("M")[1]+" "+q("M")[2]:"(first move of the game)"),
"- Specifics: "+c.motif.label+". "+(feats.length?"Board features: "+feats.join(", ")+".":"No standard structure feature on the board."),
"- Alarm Signal: "+(c.alarm?c.alarm.label+". "+c.alarm.say:"none of the standard alarms; the error came from skipping an MSPC step."),
"- Working Point ("+LN[c.letter]+"): "+c.wp,
"- Action Step: "+c.action,
(c.error?"- What went wrong: "+c.error:null),
(c.diag&&c.diag.find?"- How a human finds the better move: "+c.diag.find:null),
"",
"LICHESS SIMILAR POSITION",
(s?"- Puzzle: "+s.id+" (rating "+s.rating+", themes "+s.themes.slice(0,6).join(", ")+"), https://lichess.org/training/"+s.id:"- Puzzle: none found right now (same motif: "+c.motif.label+")"),
(s?"- FEN: "+s.fen:null),
(s?"- Side to move: "+(s.side==="w"?"White":"Black"):null),
(s?"- Winning line (to the end of the combination): "+(s.line||s.solSan.join(" ")):null),
"",
CLOSE];
    if(bul){
      let pc=[],pa=[];try{pc=pawnCheck(c.fen);pa=g.fens[it.i+1]?pawnCheck(g.fens[it.i+1]):[]}catch(e){}
      let gl="Release Giveaway: a 15-day ELO-gain challenge in the Lanckriet Chess app. Link your Chess.com or Lichess account, the app reads your public Rapid rating, and the top 5 ELO gainers win 1 month of Pro.";
      try{if(typeof LC82!=="undefined"&&LC82.giveawayLine)gl=LC82.giveawayLine()}catch(e){}
      L.splice(L.length-1,1,
"PAWN CHECK (undefended pieces and pawns, kings left out)",
"- Before the mistake: "+(pc.join(" | ")||"not available"),
"- After the mistake: "+(pa.join(" | ")||"not available"),
"",
"RELEASE GIVEAWAY (the CTA)",
"- "+gl,
"- Where: the Lanckriet Chess app, link in bio. Only the public rating counts; results differ per person.",
"",
BCLOSE);
    }
    return L.filter(x=>x!==null).join("\n");
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
    if(a==="showprompt"){const p=Q("#lc79-ai [data-prompt]");p.hidden=!p.hidden;if(!p.hidden)p.textContent=buildPrompt(AI.pmode);b.textContent=p.hidden?"Show the prompt":"Hide the prompt";return}
    if(a==="copyprompt"||a==="copybullets"){AI.pmode=a==="copybullets"?"bullets":"full";const t=buildPrompt(AI.pmode),ok=await copyText(t);const p=Q("#lc79-ai [data-prompt]");if(p&&!p.hidden)p.textContent=t;
      return say(ok?(AI.pmode==="bullets"?"Bullet Points prompt copied. Paste it into Claude.":"Full Script prompt copied. Paste it into Claude."):"Could not copy. Press Show the prompt and copy it by hand.",ok?"ok":"err",3500)}
    if(a==="mkproj"){mkProject(+b.getAttribute("data-i"));return paintAi()}
    if(a==="mkall"){let n=0;AI.list.forEach((x,i)=>{if(!projectFor(pgnKey(AI.pgn),x.i)){mkProject(i,true);n++}});say(n?n+" video project"+(n===1?"":"s")+" made. They are in Projects and in the record bar.":"Every mistake already has a project.","ok",4000);return paintAi()}
    if(a==="openproj"){db().cur=b.getAttribute("data-p");persist();closeLayer("lc79-ai");return openProjects()}
    if(a==="toprojects"){closeLayer("lc79-ai");return openProjects()}
    if(a==="toedit"){return gotoCaptions(null)}
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
  const ctaS=()=>{const o=Object.assign({mode:"live",fit:"stage",side:"right",scale:1,head:"Get your last game analysed",sub:"Lanckriet Chess",url:"",point:"Link in bio",v:2},rd(CK,{})||{});if(o.v!==2){if(o.mode==="page")o.mode="live";o.v=2;o.fit=o.fit||"stage"}return o};
  let ctaOn=false,ctaAt=0,snap=null,snapAt=0,snapBusy=false,animUntil=0;
  function kick(ms){animUntil=performance.now()+(ms||450);const loop=()=>{dirty();if(performance.now()<animUntil)requestAnimationFrame(loop)};requestAnimationFrame(loop)}
  function ctaToggle(v){
    ctaOn=v==null?!ctaOn:!!v;ctaAt=performance.now();if(ctaOn){FL.step=4;FL.card=null;FL.aha=false}else if(FL.step===4)FL.step=0;try{paintDock()}catch(e){}
    const md=ctaS().mode;
    if(ctaOn&&md==="page"&&!snap)grabLanding();
    if(md==="live"){if(ctaOn)liveOn();else liveOff()}else liveOff();
    kick(500);paintCtaBtn();if(md!=="live")say(ctaOn?"Landing page on screen. Press L or the button to hide it.":"Landing page hidden.","",1800);
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
    if(!(W>1&&H>1))return;
    /* 9.41.1: step 3 draws no prompt pill over the camera; only the board, scenes and chosen callouts show */
    try{if(FL.step===2&&FL.card)drawCard(ctx,W,H,FL.card)}catch(e){}
    if(!ctaOn)return;
    if(ctaS().mode==="live"){drawLiveFrame(ctx,W,H);return}
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
  /* ---------- 9.40.0: navigation, sharing, recording into a project, the 4-step recording flow ---------- */
  const RK="lc79-recto",SK="lc79-shots";
  const projById=id=>db().list.filter(p=>p.id===id)[0]||null;
  function gotoCaptions(takeId){
    ["lc79-ed","lc79-ai","lc79-ctaset"].forEach(id=>closeLayer(id,true));
    try{const Tk=T().Takes;if(takeId&&Tk.get(takeId)){Tk.cur=takeId;Tk.render()}}catch(e){}
    const sr=studioRoot();try{LC66.setTab(sr,"edit")}catch(e){}
    setTimeout(()=>{const c=sr&&(Q("#lc33-caps",sr)||Q("#takes-body",sr));if(c)try{c.scrollIntoView({block:"start",behavior:"smooth"})}catch(e){}},450);
  }
  function openFromProject(p){
    if(typeof LC80==="undefined"||!LC80.scan){say("The analysis module is not available.","err");return}
    const g=LC80.scan.parseGame(p.src.pgn);if(!g){say("The game of this project could not be read.","err");return}
    closeLayer("lc79-ed",true);openScript();
    AI.pgn=p.src.pgn;AI.g=g;AI.list=[Object.assign({},p.src.item)];AI.ci=0;AI.cloud=null;AI.sim=p.src.sim||null;buildCase();paintAi();
    if(!AI.sim)findSimilar();else{const b=Q("#lc79-ai [data-sim]");if(b)b.innerHTML=simHTML()}cloudEval();
  }
  function canShare(){try{return!!(navigator.canShare&&navigator.share&&navigator.canShare({files:[new File([new Blob(["x"])],"a.mp4",{type:"video/mp4"})]}))}catch(e){return false}}
  async function shareTake(id){
    const t=takeById(id);if(!t)return;const ext=/mp4/.test(t.mime||"")?"mp4":"webm";
    try{const f=new File([t.blob],slug(t.name)+"."+ext,{type:t.mime||"video/"+ext});if(!navigator.canShare({files:[f]}))throw new Error("type");await navigator.share({files:[f],title:t.name})}
    catch(e){if(e&&e.name==="AbortError")return;say("This device cannot share this video directly. Open the Content Library or try the Claude app on your phone.","err",5000)}
  }
  const FL={step:0,card:null,cardAt:0,aha:false,busy:false};
  const STEPS=[["1","Game board"],["2","Feedback card"],["3","Lichess position"],["4","Landing page"]];
  function cardData(p){
    try{const g=LC80.scan.parseGame(p.src.pgn),it=p.src.item,c=makeCase(g,it);
      return{mv:mvLabel(it),better:it.bestSan||"",loss:Math.round(it.loss||0),alarm:c.alarm?c.alarm.label:"No standard alarm",motif:c.motif.label,wp:c.wp,action:c.action,student:c.student}}catch(e){return null}
  }
  async function simFor(p){
    if(p.src.sim)return p.src.sim;
    try{const g=LC80.scan.parseGame(p.src.pgn),c=makeCase(g,p.src.item),theme=c.motif.theme||LC64.themeFor(c.alarm&&c.alarm.id,c.letter);
      const f=await LC64.liClosest(clamp(c.rating||1500,600,2800),theme),P=f&&LC64.puzzleFromJson(f.json);if(!P)return null;
      const gg=new Chess(P.fen),sol=[];(P.solution||[]).forEach(u=>{const m=gg.move(uci(u));if(m)sol.push(m.san)});
      p.src.sim={id:P.id,rating:P.rating,themes:(P.themes||[]).slice(0,6),fen:P.fen,side:P.side,line:numbered(P.fen,P.solution||[]),solSan:sol};save(p);return p.src.sim}catch(e){return null}
  }
  async function setStep(n){
    n=+n;if(!(n>=1&&n<=4))return;FL.step=n;const p=projById(rd(RK,"")),src=p&&p.src,B=api()&&api().board;
    const sc=(rd(SK,{})||{})[n];if(sc){try{api().lc54.load(sc)}catch(e){}}
    if(n===4){ctaOn=true;ctaAt=performance.now();if(ctaS().mode==="page"&&!snap)grabLanding();if(ctaS().mode==="live")liveOn()}else{ctaOn=false;liveOff()}
    FL.card=null;FL.aha=false;
    if(src&&B){
      /* while recording only a FEN is loaded: loading a whole PGN into the Studio board during a recording crashed Chromium in tests */
      try{if(n===1||n===2){const g=LC80.scan.parseGame(src.pgn),rec=api().rec&&api().rec.state!=="idle";
        if(rec){const r=B.loadFEN(g.fens[src.item.i]);if(r&&r.ok&&B.orient!==src.item.color)B.flip()}
        else{const r=B.loadPGN(trimmedPgn(g,src.item,true));if(r&&r.ok){B.goto(src.item.i);if(B.orient!==src.item.color)B.flip()}}}}catch(e){}
      if(n===2){FL.card=cardData(p);FL.cardAt=performance.now()}
      if(n===3){paintDock("Fetching the Lichess position…");const sim=await simFor(p);if(FL.step!==3)return;
        if(sim){try{B.loadFEN(sim.fen);if(B.orient!==sim.side)B.flip()}catch(e){}FL.aha=true;FL.cardAt=performance.now()}else say("No Lichess position yet (no connection or no puzzle with this motif). Try step 3 again.","err",4000)}
    }else if(n<=3&&!src)say("Pick a project made from a game in the record bar to load the board, the card and the Lichess position.","",4000);
    kick(500);paintDock();paintCtaBtn();
  }
  function wrapText(g,t,maxW){const w=String(t||"").split(" "),out=[];let cur="";w.forEach(x=>{const tt=cur?cur+" "+x:x;if(g.measureText(tt).width>maxW&&cur){out.push(cur);cur=x}else cur=tt});if(cur)out.push(cur);return out}
  /* the card is drawn once per size into a buffer; every frame only copies it (cheap while recording) */
  function drawCard(ctx,W,H,d){
    const port=H>=W,p=easeOut(clamp((performance.now()-FL.cardAt)/380,0,1)),key=W+"x"+H;
    if(!FL.buf||FL.bufKey!==key||FL.bufFor!==d){FL.buf=renderCard(W,H,d);FL.bufKey=key;FL.bufFor=d}
    const B=FL.buf;if(!B)return;ctx.save();ctx.globalAlpha=p;ctx.drawImage(B.c,B.x,B.y+(1-p)*H*.08);ctx.restore();
  }
  function renderCard(W,H,d){
    const port=H>=W,cw=port?W*.9:W*.44,fs=Math.round(cw*.05),pad=fs*1.1,cv=document.createElement("canvas"),ctx0=cv.getContext("2d");
    ctx0.font="600 "+Math.round(fs*.82)+"px Sora,system-ui,sans-serif";
    const rows0=[["Alarm Signal","#f97316",d.alarm],["Working Point","#38bdf8",d.wp],["Action Step","#00E5FF",d.action]].map(r=>({lines:wrapText(ctx0,r[2],cw-pad*2)}));
    const ch0=pad*2+fs*1.1+fs*1.6+rows0.reduce((a,r)=>a+fs*1.05+r.lines.length*fs*1.15+fs*.5,0),m=Math.ceil(fs*1.2);
    cv.width=Math.ceil(cw+m*2);cv.height=Math.ceil(ch0+m*2);
    const bx=port?(W-cw)/2:W-cw-W*.04,by=port?H-ch0-H*.06:(H-ch0)/2;
    const ctx=cv.getContext("2d");ctx.translate(m-bx,m-by);
    const p=1;
    ctx.save();ctx.font="600 "+Math.round(fs*.82)+"px Sora,system-ui,sans-serif";
    const rows=[["Alarm Signal","#f97316",d.alarm],["Working Point","#38bdf8",d.wp],["Action Step","#00E5FF",d.action]].map(r=>({l:r[0],c:r[1],lines:wrapText(ctx,r[2],cw-pad*2)}));
    const ch=pad*2+fs*1.1+fs*1.6+rows.reduce((a,r)=>a+fs*1.05+r.lines.length*fs*1.15+fs*.5,0);
    const x=bx,y=by;
    ctx.shadowColor="rgba(0,0,0,.55)";ctx.shadowBlur=fs;rr(ctx,x,y,cw,ch,fs*.7);ctx.fillStyle="rgba(15,23,42,.96)";ctx.fill();ctx.shadowBlur=0;ctx.shadowColor="transparent";
    ctx.lineWidth=Math.max(2,fs*.08);ctx.strokeStyle="rgba(56,189,248,.6)";ctx.stroke();
    let yy=y+pad;ctx.textBaseline="top";ctx.textAlign="left";
    ctx.fillStyle="#38bdf8";ctx.font="700 "+Math.round(fs*.72)+"px Sora,system-ui,sans-serif";ctx.fillText("Lanckriet Chess · Game review",x+pad,yy);yy+=fs*1.1;
    ctx.font="800 "+Math.round(fs*1.15)+"px Sora,system-ui,sans-serif";ctx.fillStyle="#f87171";ctx.fillText(d.mv,x+pad,yy);const mw=ctx.measureText(d.mv+"  ").width;
    if(d.better){ctx.fillStyle="#7dd3fc";ctx.font="700 "+Math.round(fs*.9)+"px Sora,system-ui,sans-serif";ctx.fillText("Better: "+d.better+"  ·  −"+d.loss+"%",x+pad+mw,yy+fs*.2,cw-pad*2-mw)}yy+=fs*1.6;
    rows.forEach(r=>{ctx.fillStyle=r.c;ctx.font="700 "+Math.round(fs*.75)+"px Sora,system-ui,sans-serif";ctx.fillText(r.l,x+pad,yy);yy+=fs*1.05;ctx.fillStyle="#e2e8f0";ctx.font="600 "+Math.round(fs*.82)+"px Sora,system-ui,sans-serif";r.lines.forEach(l=>{ctx.fillText(l,x+pad,yy);yy+=fs*1.15});yy+=fs*.5});
    ctx.restore();
    return{c:cv,x:bx-m,y:by-m};
  }
  /* right after a take: silences over the threshold are cut (ripple), the take goes to the recording project as its voice pieces, captions follow */
  function afterTake(t){
    if(!t||!t.id)return;const o=nle();let sil=null;
    if(o.autoSil)try{sil=autoSilence(t,clamp(+o.silMin||4,.5,8))}catch(e){sil=null}
    /* 9.54.0: one clear choice right after the take: send it to a project, or delete it */
    if(o.review!==false&&!/\((export|edited)\)/.test(String(t.name||""))&&showReview(t,sil))return;
    const p=projById(rd(RK,""));
    if(p){p.clips=p.clips.concat(clipsFor(t,p));save(p)}
    showPost(t,p,sil);
    if(sil&&sil.n)say("Cut "+sil.n+" silence"+(sil.n===1?"":"s")+" over "+(+o.silMin||4)+" s ("+sil.sec+" s) from “"+t.name+"”. Undo it in Trim.","ok",4500);
    try{autoCaptions(t)}catch(e){}
  }
  /* ---------- 9.54.0: take review: "Send to project" or "Delete this take" ---------- */
  function showReview(t,sil){
    const sr=studioRoot(),lcs=sr&&Q("#lcs",sr);if(!lcs)return false;
    const old=Q("#lc79-rv",sr);if(old)old.remove();
    const list=db().list,cur0=projById(rd(RK,""))||null,D=durOf(t);
    const opts=list.map(x=>'<option value="'+esc(x.id)+'"'+(cur0&&x.id===cur0.id?" selected":"")+'>'+esc(x.name)+' ('+x.clips.length+' block'+(x.clips.length===1?'':'s')+')</option>').join("")
      +'<option value="+"'+(cur0?"":" selected")+'>+ New project'+(list.length?"":": Reel 1")+'</option>';
    const el=document.createElement("div");el.id="lc79-rv";el.className="lc79-rv";
    el.innerHTML='<div class="rv-card" role="dialog" aria-modal="true" aria-labelledby="lc79-rv-h" tabindex="-1">'
      +'<h3 id="lc79-rv-h">Keep this take?</h3><p class="rv-meta"><b>'+esc(t.name||"Take")+'</b> · '+fmt(D)+(sil&&sil.n?' · '+sil.n+' silence'+(sil.n===1?'':'s')+' cut':'')+'</p>'
      +'<video src="'+esc(t.url||"")+'" controls playsinline preload="metadata" muted></video>'
      +'<label class="rv-f"><span>Send it to</span><select data-rv="pid" aria-label="Project">'+opts+'</select></label>'
      +'<div class="rv-act"><button type="button" class="rv-b rv-send" data-rv="send">✓ Send to project</button><button type="button" class="rv-b rv-del" data-rv="del">🗑 Delete this take</button></div>'
      +'<div class="rv-foot"><button type="button" class="rv-later" data-rv="later">Decide later (keep it in the takes archive)</button><label class="rv-ask"><input type="checkbox" data-rv="ask" checked> Ask after every take</label></div>'
      +'<p class="rv-keys">Enter: send · Delete: delete · Esc: decide later</p></div>';
    lcs.appendChild(el);
    let done=false;
    const close=()=>{done=true;try{const v=Q("video",el);if(v){v.pause();v.removeAttribute("src");v.load()}}catch(e){}el.remove()};
    const act=async a=>{
      if(done)return;
      const ask=Q('[data-rv="ask"]',el);if(ask&&!ask.checked)setNle({review:false});
      if(a==="send"){
        let pid=Q('[data-rv="pid"]',el).value,p=projById(pid);
        if(!p){p=newProject("Reel "+(db().list.length+1))}
        p.clips=p.clips.concat(clipsFor(t,p));save(p);wr(RK,p.id);try{paintDock()}catch(e){}close();
        showPost(t,p,sil);try{autoCaptions(t)}catch(e){}
        say("Sent to “"+p.name+"”. It is on the timeline of the Edit Studio.","ok",3200);
      }else if(a==="del"){
        close();try{await T().Takes.remove(t.id)}catch(e){}
        delete thumbs[t.id];takeGone(t.id);say("Take deleted. Ready for the next one.","",2400);
      }else{close();try{autoCaptions(t)}catch(e){}say("Kept in the takes archive. Add it to a project any time in the Edit Studio.","",3000)}
    };
    el.addEventListener("click",e=>{const b=e.target.closest("[data-rv]");if(!b||b.tagName==="SELECT"||b.tagName==="INPUT")return;e.preventDefault();act(b.getAttribute("data-rv"))});
    el.addEventListener("keydown",e=>{const tg=e.target&&e.target.tagName;if(e.key==="Escape"){e.preventDefault();e.stopPropagation();act("later")}else if(e.key==="Enter"&&tg!=="SELECT"&&tg!=="BUTTON"){e.preventDefault();e.stopPropagation();act("send")}else if((e.key==="Delete")&&tg!=="SELECT"){e.preventDefault();e.stopPropagation();act("del")}else e.stopPropagation()});
    setTimeout(()=>{try{Q(".rv-send",el).focus({preventScroll:true})}catch(e){}},30);
    return true;
  }
  function showPost(t,p,sil){
    const sr=studioRoot(),lcs=sr&&Q("#lcs",sr);if(!lcs)return;let bar=Q("#lc79-post",sr);if(bar)bar.remove();
    bar=document.createElement("div");bar.id="lc79-post";bar.setAttribute("role","status");
    const opts=db().list.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join("");
    bar.innerHTML='<b>'+esc(t.name)+' saved'+(p?' in “'+esc(p.name)+'” ('+p.clips.length+' blocks)':'')+'.'+(sil&&sil.n?' '+sil.n+' silence'+(sil.n===1?'':'s')+' cut.':'')+'</b>'
      +(p?'<button type="button" class="btn sm" data-p="open">Open the timeline</button>':'<select aria-label="Add this take to a project"><option value="">Add to a project…</option>'+opts+'<option value="+">+ New project</option></select>')
      +'<button type="button" class="btn sm" data-p="caps">Captions</button><button type="button" class="btn sm" data-p="x" aria-label="Close">×</button>';
    lcs.appendChild(bar);
    bar.addEventListener("click",e=>{const b=e.target.closest("[data-p]");if(!b)return;const a=b.getAttribute("data-p");if(a==="x")return bar.remove();if(a==="caps"){bar.remove();openProjects();ED.sel={kind:"cap"};return ED.paint()}if(a==="open"){bar.remove();if(p){db().cur=p.id;persist()}return openProjects()}});
    const sel=Q("select",bar);if(sel)sel.addEventListener("change",()=>{let pid=sel.value;if(!pid)return;if(pid==="+"){const n=prompt("Name of the new project","Reel "+(db().list.length+1));if(n===null)return;const np=newProject(n.trim()||null);pid=np.id}const pp=projById(pid);if(pp){pp.clips=pp.clips.concat(clipsFor(t,pp));save(pp);say(t.name+" added to “"+pp.name+"”.","ok",2500);showPost(t,pp);paintDock()}});
    clearTimeout(showPost.to);showPost.to=setTimeout(()=>{try{bar.remove()}catch(e){}},25e3);
  }
  function paintDock(note){
    const sr=studioRoot();if(!sr)return;const sel=Q("#lc79-recto",sr),cur=rd(RK,"");
    if(sel){const list=db().list;sel.innerHTML='<option value="">Save takes to: no project</option>'+list.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===cur?" selected":"")+'>Save to: '+esc(x.name)+'</option>').join("")+'<option value="+">+ New project</option>';if(cur&&!projById(cur))wr(RK,"")}
    const lab=Q("#lc79-step",sr);if(lab){const p=projById(cur),st=STEPS[FL.step-1];lab.textContent=note||(st?st[0]+" "+st[1]:"Flow: 1 board · 2 card · 3 Lichess · 4 landing")+(p&&!p.src&&FL.step&&FL.step<4?" (no game in this project)":"")}
  }
  function openFlowSettings(){
    openLayer("lc79-flowset","Recording flow",el=>{
      let names=[];try{names=(api().lc54.scenes()||[]).map(x=>x.name)}catch(e){}
      const cur=rd(SK,{})||{};
      el.innerHTML='<header class="lc79-top"><button type="button" class="lc79-b" data-a="close" data-autofocus aria-label="Back to the Studio">← Studio</button><h2>Recording flow</h2></header><div class="lc79-body"><div class="lc79-ai"><section class="lc79-sec">'
        +'<p class="lc79-hint" style="margin:0">While you record, keys 1 to 4 (or the arrows in the record bar) switch the picture. With a project made from a game, the app loads the board, the feedback card and the Lichess position for you. Each step can also load one of your saved scenes.</p>'
        +STEPS.map((s2,i)=>'<label class="lc79-f"><span>Step '+s2[0]+': '+s2[1]+' uses the scene</span><select data-step="'+(i+1)+'"><option value="">Keep the current layout</option>'+names.map(n=>'<option'+(cur[i+1]===n?" selected":"")+'>'+esc(n)+'</option>').join("")+'</select></label>').join("")
        +(names.length?'':'<p class="lc79-hint" style="margin:0">No saved scenes yet: build one in Scene Builder and press Scenes, then Save.</p>')+'</section></div></div>';
      el.addEventListener("click",e=>{if(e.target.closest('[data-a="close"]'))closeLayer("lc79-flowset")});
      el.addEventListener("change",e=>{const s3=e.target.getAttribute("data-step");if(!s3)return;const m=rd(SK,{})||{};m[s3]=e.target.value||"";wr(SK,m)});
    });
  }
  /* ---------- 9.41.0: the LIVE landing page over the stage (or the board), scrollable and clickable, filmed into the recording ---------- */
  const LV={el:null,fr:null,stream:null,video:null,how:"",rect:null,snap:null,snapBusy:false,snapTimer:0,raf:0,ptr:null,click:0,asked:false};
  const landingUrl=()=>location.origin+"/index.html?preview=1&lc79=live";
  function liveMount(){
    const sr=studioRoot(),st=sr&&Q("#stage",sr);if(!st)return false;
    if(!LV.el||!LV.el.isConnected){
      try{if(getComputedStyle(st).position==="static")st.style.position="relative"}catch(e){}
      const w=document.createElement("div");w.id="lc79-lp";w.setAttribute("role","region");w.setAttribute("aria-label","Your live landing page. Scroll and click it while you record.");
      w.style.cssText="position:absolute;z-index:40;isolation:isolate;overflow:hidden;background:#0f172a;display:none;box-shadow:0 0 0 2px rgba(0,229,255,.55)";
      const fr=document.createElement("iframe");fr.title="Lanckriet Chess landing page";fr.src=landingUrl();
      fr.setAttribute("sandbox","allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox");
      fr.style.cssText="display:block;width:100%;height:100%;border:0;background:#0f172a";
      fr.addEventListener("load",()=>wireFrame(fr));
      w.appendChild(fr);st.appendChild(w);LV.el=w;LV.fr=fr;
    }
    return true;
  }
  function wireFrame(fr){
    let wn=null;try{wn=fr.contentWindow;if(!wn||!wn.document)return}catch(e){return}
    try{if(/\/app\.html/.test(wn.location.pathname)){wn.location.replace(landingUrl());return}}catch(e){}
    const fwd=e=>{const t=e.target;if(t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName||""))return;
      if(/^[lL1-4rRpPmM]$/.test(e.key)||e.key==="Escape"){e.preventDefault();try{document.dispatchEvent(new KeyboardEvent("keydown",{key:e.key,code:e.code,bubbles:true,cancelable:true}))}catch(x){}}};
    wn.addEventListener("keydown",fwd,true);
    wn.addEventListener("mousemove",e=>{LV.ptr={x:e.clientX/Math.max(1,wn.innerWidth),y:e.clientY/Math.max(1,wn.innerHeight),t:performance.now()}},{passive:true});
    wn.addEventListener("mousedown",()=>{LV.click=performance.now()},{passive:true});
    wn.addEventListener("mouseleave",()=>{LV.ptr=null},{passive:true});
  }
  /* the frame sits exactly over the stage canvas (or the board) and LV.rect holds where that is inside the recorded frame */
  function livePlace(){
    const sr=studioRoot(),st=sr&&Q("#stage",sr),cv=sr&&Q("#stage-cv",sr);if(!st||!cv||!LV.el)return;
    const fit=ctaS().fit,bh=fit==="board"&&Q('.layer[data-layer="board"]',sr),tgt=bh&&bh.getBoundingClientRect().width>20?bh:cv;
    const c=cv.getBoundingClientRect(),r=tgt.getBoundingClientRect(),s=st.getBoundingClientRect();if(c.width<2||c.height<2)return;
    const l=Math.round(r.left-s.left)+"px",t=Math.round(r.top-s.top)+"px",w=Math.round(r.width)+"px",h=Math.round(r.height)+"px";
    const E=LV.el.style;if(E.left!==l)E.left=l;if(E.top!==t)E.top=t;if(E.width!==w)E.width=w;if(E.height!==h)E.height=h;
    LV.rect={x:(r.left-c.left)/c.width,y:(r.top-c.top)/c.height,w:r.width/c.width,h:r.height/c.height};
  }
  function liveLoop(){if(!ctaOn||ctaS().mode!=="live"){LV.raf=0;return}livePlace();LV.raf=requestAnimationFrame(liveLoop)}
  async function liveOn(){
    try{const sr=studioRoot(),cv=sr&&Q("#stage-cv",sr);if(!cv||cv.getBoundingClientRect().width<2){LC66.setTab(sr,"shoot");await new Promise(r=>setTimeout(r,350))}}catch(e){}
    if(!liveMount()){say("Open the stage first (Content Shooting).","err");return}
    LV.el.style.display="block";if(!LV.raf)LV.raf=requestAnimationFrame(liveLoop);livePlace();
    if(LV.stream&&LV.stream.active)return;
    const ok=await liveCapture();
    if(!ok){startSnaps();if(!LV.asked){LV.asked=true;say(LV.how==="denied"?"Recording keeps a picture of the page every second because the tab was not shared. Press L twice to try again and pick “This tab”.":"This browser cannot film a live page, so the recording gets a new picture every second. Chrome or Edge on a computer films it live.","",6500)}}
    else say("Live landing page on screen and in the recording. Scroll and click it. Press L to hide it.","ok",3500);
  }
  function liveOff(){if(LV.el)LV.el.style.display="none";stopSnaps();if(LV.raf){cancelAnimationFrame(LV.raf);LV.raf=0}}
  async function liveCapture(){
    const md=navigator.mediaDevices;if(!md||!md.getDisplayMedia||!(window.CropTarget||window.RestrictionTarget)){LV.how="unsupported";return false}
    let s=null;
    try{
      s=await md.getDisplayMedia({video:{displaySurface:"browser",frameRate:30},audio:false,preferCurrentTab:true,selfBrowserSurface:"include",surfaceSwitching:"exclude",monitorTypeSurfaces:"exclude"});
      const tr=s.getVideoTracks()[0];let done=false;
      if(window.RestrictionTarget&&tr.restrictTo){try{await tr.restrictTo(await RestrictionTarget.fromElement(LV.el));done=true;LV.how="element"}catch(e){}}
      if(!done){if(!(window.CropTarget&&tr.cropTo))throw new Error("crop");await tr.cropTo(await CropTarget.fromElement(LV.el));LV.how="region"}
      const v=document.createElement("video");v.muted=true;v.playsInline=true;v.srcObject=s;await v.play();
      LV.stream=s;LV.video=v;tr.addEventListener("ended",()=>{LV.stream=null;LV.video=null;if(ctaOn&&ctaS().mode==="live")startSnaps()});
      stopSnaps();return true;
    }catch(e){if(s)s.getTracks().forEach(t=>{try{t.stop()}catch(x){}});LV.how=e&&e.name==="NotAllowedError"?"denied":"failed";return false}
  }
  function startSnaps(){if(LV.snapTimer)return;const go=()=>{grabFrame();};go();LV.snapTimer=setInterval(go,1000)}
  function stopSnaps(){if(LV.snapTimer){clearInterval(LV.snapTimer);LV.snapTimer=0}}
  async function grabFrame(){
    if(LV.snapBusy||!LV.fr)return;LV.snapBusy=true;
    try{const h2c=await loadH2C(),wn=LV.fr.contentWindow,d=wn&&wn.document;if(!d||!d.body)return;
      const c=await h2c(d.body,{backgroundColor:"#0f172a",useCORS:true,allowTaint:false,logging:false,scale:Math.min(2,window.devicePixelRatio||1),x:wn.scrollX,y:wn.scrollY,width:wn.innerWidth,height:wn.innerHeight,windowWidth:wn.innerWidth,windowHeight:wn.innerHeight});
      if(c&&c.width)LV.snap=c}
    catch(e){}finally{LV.snapBusy=false}
  }
  function drawLiveFrame(ctx,W,H){
    const r=LV.rect||{x:0,y:0,w:1,h:1},x=r.x*W,y=r.y*H,w=r.w*W,h=r.h*H;
    const v=LV.video,src=v&&v.readyState>=2&&v.videoWidth?v:LV.snap;
    ctx.save();ctx.fillStyle="#0f172a";ctx.fillRect(x,y,w,h);
    if(src){try{ctx.drawImage(src,x,y,w,h)}catch(e){}}
    else{ctx.fillStyle="#94a3b8";ctx.font="600 "+Math.round(Math.min(w,h)*.04)+"px Sora,system-ui,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("Loading the landing page…",x+w/2,y+h/2)}
    const pt=LV.ptr,now=performance.now();
    if(pt&&now-pt.t<2500){const px=x+pt.x*w,py=y+pt.y*h,R=Math.max(10,Math.min(W,H)*.022),cl=now-LV.click;
      ctx.globalAlpha=clamp(1-(now-pt.t-1500)/1000,0,1);ctx.lineWidth=R*.28;ctx.strokeStyle="#fbbf24";ctx.fillStyle="rgba(251,191,36,.28)";ctx.beginPath();ctx.arc(px,py,R,0,6.2832);ctx.fill();ctx.stroke();
      if(cl<450){ctx.globalAlpha=1-cl/450;ctx.beginPath();ctx.arc(px,py,R*(1+cl/180),0,6.2832);ctx.stroke()}}
    ctx.restore();
  }
  function liveStop(){liveOff();if(LV.stream){LV.stream.getTracks().forEach(t=>{try{t.stop()}catch(e){}});LV.stream=null;LV.video=null}if(LV.el){try{LV.el.remove()}catch(e){}}LV.el=null;LV.fr=null;LV.snap=null;LV.asked=false}
  function paintCtaBtn(){
    const sr=studioRoot(),b=sr&&Q("#lc79-cta",sr);if(!b)return;
    b.setAttribute("aria-pressed",String(ctaOn));b.textContent=snapBusy&&ctaOn?"Capturing the landing page…":ctaOn?"Hide Landing Page (L)":"Show Landing Page (CTA)";
    b.classList.toggle("lc79-on",ctaOn);
  }
  function openCtaSettings(){
    openLayer("lc79-ctaset","Landing page CTA settings",el=>{
      const o=ctaS();
      el.innerHTML='<header class="lc79-top"><button type="button" class="lc79-b" data-a="close" data-autofocus aria-label="Back to the Studio">← Studio</button><h2>Landing page on screen</h2></header><div class="lc79-body"><div class="lc79-ai"><section class="lc79-sec">'
        +'<label class="lc79-f"><span>What to show</span><select data-f="mode"><option value="live"'+(o.mode==="live"?" selected":"")+'>The live landing page: scroll and click it while you record</option><option value="page"'+(o.mode==="page"?" selected":"")+'>A picture of the landing page in a phone frame</option><option value="card"'+(o.mode==="card"?" selected":"")+'>A CTA card</option></select></label>'
        +'<label class="lc79-f"><span>Size of the live page</span><select data-f="fit"><option value="stage"'+(o.fit!=="board"?" selected":"")+'>The whole stage (full size)</option><option value="board"'+(o.fit==="board"?" selected":"")+'>The board area (your camera stays visible)</option></select></label>'
        +'<label class="lc79-f"><span>Where</span><select data-f="side"><option value="right"'+(o.side==="right"?" selected":"")+'>Right (point to your left)</option><option value="left"'+(o.side==="left"?" selected":"")+'>Left</option><option value="center"'+(o.side==="center"?" selected":"")+'>Centre</option></select></label>'
        +'<label class="lc79-f"><span>Phone size</span><input type="range" data-f="scale" min="0.6" max="1.4" step="0.05" value="'+o.scale+'"></label>'
        +'<label class="lc79-f"><span>Label under it</span><input type="text" data-f="point" maxlength="30" value="'+esc(o.point)+'"></label>'
        +'<label class="lc79-f"><span>Card title</span><input type="text" data-f="head" maxlength="44" value="'+esc(o.head)+'"></label>'
        +'<label class="lc79-f"><span>Card top line</span><input type="text" data-f="sub" maxlength="40" value="'+esc(o.sub)+'"></label>'
        +'<label class="lc79-f"><span>Address shown (empty = this site)</span><input type="text" data-f="url" maxlength="60" value="'+esc(o.url)+'" placeholder="'+esc(location.host)+'"></label>'
        +'<div class="lc79-row"><button type="button" class="lc79-b sm" data-a="refresh">Refresh the landing page snapshot</button><span class="lc79-hint" data-snap>'+(snap?"Snapshot from "+new Date(snapAt).toLocaleTimeString():"No snapshot yet.")+'</span></div>'
        +'<p class="lc79-hint" style="margin:0">Live page: Chrome or Edge ask once to share “This tab”; pick it, then the page is filmed live (scrolling, clicks and a yellow pointer ring). Other browsers get a new picture every second. The picture modes use a snapshot taken from your live landing page with “preview” on, so it does not count as a visit and your own Edit button is not in it. Never use the words free, cheap, lifetime or forever in these texts.</p></section></div></div>';
      el.addEventListener("click",async e=>{const b=e.target.closest("[data-a]");if(!b)return;if(b.getAttribute("data-a")==="close")return closeLayer("lc79-ctaset");if(b.getAttribute("data-a")==="refresh"){const s=Q("[data-snap]",el);s.textContent="Capturing…";await grabLanding(true);s.textContent=snap?"Snapshot from "+new Date(snapAt).toLocaleTimeString():"Could not capture the page. The CTA card is used."}});
      const upd=e=>{const f=e.target.getAttribute("data-f");if(!f)return;const o2=ctaS();o2[f]=f==="scale"?clamp(+e.target.value||1,.6,1.4):String(e.target.value||"").slice(0,60);if(f==="mode"||f==="fit"){wr(CK,o2);if(ctaOn){if(o2.mode==="live")liveOn();else liveOff()}kick(200);return}if(/\b(free|cheap|lifetime|forever)\b/i.test(String(o2[f]))){say("Pick other words: free, cheap, lifetime and forever are not used.","err",3500);return}wr(CK,o2);kick(200)};
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

  /* ---------- 9.45.0: OBS-style scenes, flexible input block, crop / zoom / pan, and the record bar out of the board ----------
     Scenes: Classic (board and camera, your own arrangement), Scene 1 = full-screen camera, Scene 2 = camera + a big input block, as a split
     (input on top / left, camera under / right) or as a bubble (input fills the stage, camera in a circle). The input block takes one source:
     the interactive chessboard, the live landing page, the app itself, or a shared screen / window / tab. Switching a scene keeps the format, so it
     works while recording (changing the format waits until you stop).
     Crop & zoom: for the camera and for the input. Crop each edge (0 to 45 %), zoom (1x to 4x) and pan; drag on the stage to pan, the mouse wheel
     or two fingers to zoom. Only what is inside the frame is shown and recorded. The board keeps its exact squares (so you can still play on it):
     its zoom is its size inside the block and the pan moves it there.
     The record bar is no longer a pill floating over the stage: it is a status bar along the bottom and the stage is fitted above it, so the
     board is never covered. */
  const SCK="lc79-scene",XF0={l:0,t:0,r:0,b:0,z:1,px:0,py:0,bs:1};
  const SCENES=[["classic","Classic: board and camera"],["cam","Scene 1: full-screen camera"],["split","Scene 2: camera + input (split)"],["pip","Scene 2: input + camera bubble"]];
  const SOURCES=[["board","Interactive chessboard"],["landing","Landing page (live)"],["app","The app (live)"],["screen","Share screen / window / tab"]];
  const scS=()=>{const o=Object.assign({scene:"classic",src:"board",xf:{},xfOpen:false,target:"in",param:"z"},rd(SCK,{})||{});o.xf=Object.assign({},o.xf);o.xf.cam=Object.assign({},XF0,o.xf.cam||{});o.xf.in=Object.assign({},XF0,o.xf.in||{});return o};
  const scPut=o=>wr(SCK,Object.assign(scS(),o));
  const IN={el:null,fr:null,kind:"",stream:null,video:null,live:false,snap:null,snapBusy:false,snapTimer:0,raf:0,shot:null,shotV:null,handle:null,ptrs:{},drag:null};
  const LAY=()=>{try{return api().layout()}catch(e){return null}};
  const aspectA=L=>(L&&L.aspect==="9:16")?9/16:16/9;
  /* pure: the part of a source (vw x vh) that fills a target of aspect tr, after the crop (l,t,r,b: fractions cut off each edge), the zoom and the pan (-1..1) */
  function srcRect(vw,vh,tr,xf,z0){
    xf=Object.assign({},XF0,xf||{});vw=+vw||1;vh=+vh||1;tr=+tr>0?+tr:vw/vh;
    const l=clamp(+xf.l||0,0,.45),r=clamp(+xf.r||0,0,.45),t=clamp(+xf.t||0,0,.45),b=clamp(+xf.b||0,0,.45);
    const cx=l*vw,cy=t*vh,cw=Math.max(1,(1-l-r)*vw),ch=Math.max(1,(1-t-b)*vh),z=clamp((+xf.z||1)*(+z0||1),1,12);
    let sw,sh;if(cw/ch>tr){sh=ch/z;sw=sh*tr}else{sw=cw/z;sh=sw/tr}
    const px=clamp(+xf.px||0,-1,1),py=clamp(+xf.py||0,-1,1);
    return{sx:cx+(cw-sw)/2*(1+px),sy:cy+(ch-sh)/2*(1+py),sw:sw,sh:sh,cw:cw,ch:ch};
  }
  const xfActive=x=>!!x&&(x.l||x.t||x.r||x.b||(x.z||1)!==1||x.px||x.py);
  function camSrc(vw,vh,tr,z){const S=scS();if(!xfActive(S.xf.cam))return null;return srcRect(vw,vh,tr,S.xf.cam,z)}
  const sceneOn=()=>{const s=scS();return s.scene==="split"||s.scene==="pip"};
  const usesInput=()=>sceneOn()&&scS().src!=="board";
  /* pure: where the input block and the camera go for a scene, in stage fractions (A = width / height of the stage) */
  function sceneRects(scene,A){
    const port=A<1;
    if(scene==="split")return port?{inp:{x:0,y:0,w:1,h:.6},cam:{x:0,y:.6,w:1,h:.4}}:{inp:{x:0,y:0,w:.64,h:1},cam:{x:.64,y:0,w:.36,h:1}};
    if(scene==="pip"){const cw=port?.36:.2,chh=cw*A,m=.035;return{inp:{x:0,y:0,w:1,h:1},cam:{x:1-cw-m,y:1-chh-m*A*(port?1:1.6),w:cw,h:chh}}}
    return{inp:null,cam:null};
  }
  /* pure: the square board inside the block (bs = its size, 0.5..1; px/py move it inside the free room) */
  function boardIn(inp,A,xf){xf=Object.assign({},XF0,xf||{});const fit=Math.min(inp.w*A,inp.h),size=fit*clamp(+xf.bs||1,.5,1);
    const fx=(inp.w*A-size)/2,fy=(inp.h-size)/2;return{x:inp.x+fx*(1+clamp(+xf.px||0,-1,1))/A,y:inp.y+fy*(1+clamp(+xf.py||0,-1,1)),w:size/A,h:size}}
  function applyScene(o){
    const L=LAY(),api54=(()=>{try{return api().lc54}catch(e){return null}})();if(!L||!api54||!api54.apply)return false;
    const S=Object.assign(scS(),o||{}),prev=scS();
    const cam=JSON.parse(JSON.stringify(L.layers.camera)),board=JSON.parse(JSON.stringify(L.layers.board));
    let keep=prev.classic||null;
    if(prev.scene==="classic"&&S.scene!=="classic")keep={camera:cam,board:board};
    let layers;
    if(S.scene==="classic"){layers=keep?{camera:keep.camera,board:keep.board}:null}
    else if(S.scene==="cam"){layers={camera:Object.assign(cam,{on:true,fill:"full"}),board:Object.assign(board,{on:false})}}
    else{
      const A=aspectA(L),R=sceneRects(S.scene,A);
      const c2=S.scene==="split"?Object.assign(cam,{on:true,fill:"pip",shape:"rect",ratio:"free",radius:6},R.cam):Object.assign(cam,{on:true,fill:"pip",shape:"circle",ratio:"1:1",radius:100},R.cam);
      const b2=S.src==="board"?Object.assign(board,{on:true},boardIn(R.inp,A,S.xf.in)):Object.assign(board,{on:false});
      layers={camera:c2,board:b2};
    }
    scPut({scene:S.scene,src:S.src,classic:keep,aspect:L.aspect});
    if(layers&&!api54.apply({aspect:L.aspect,layers:layers})){scPut({scene:prev.scene,src:prev.src});return false}
    inputSync();paintScn();dirty();return true;
  }
  function inRect(){const S=scS(),L=LAY();if(!sceneOn()||!L)return null;return sceneRects(S.scene,aspectA(L)).inp}
  /* ----- the live page sources (landing page, the app): an iframe over the input block, clickable and scrollable ----- */
  const pageUrl=k=>k==="app"?location.origin+"/app.html?embed=studio#home":location.origin+"/index.html?preview=1&lc79=input";
  function inMount(kind){
    const sr=studioRoot(),st=sr&&Q("#stage",sr);if(!st)return false;
    if(IN.el&&IN.el.isConnected&&IN.kind===kind)return true;
    inUnmount();
    try{if(getComputedStyle(st).position==="static")st.style.position="relative"}catch(e){}
    const w=document.createElement("div");w.id="lc79-in";w.setAttribute("role","region");w.setAttribute("aria-label",(kind==="app"?"The app":"Your landing page")+", live in the input block. Scroll and click it while you record.");
    w.style.cssText="position:absolute;z-index:35;overflow:hidden;background:#0f172a;display:block;border-radius:6px";
    const fr=document.createElement("iframe");fr.title=kind==="app"?"Lanckriet Chess app":"Lanckriet Chess landing page";fr.src=pageUrl(kind);
    fr.setAttribute("sandbox","allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox");
    fr.style.cssText="display:block;position:absolute;left:0;top:0;border:0;background:#0f172a;transform-origin:0 0";
    w.appendChild(fr);st.appendChild(w);IN.el=w;IN.fr=fr;IN.kind=kind;
    fr.addEventListener("load",()=>{try{const wn=fr.contentWindow;wn.addEventListener("scroll",()=>{if(!IN.live)grabIn()},{passive:true})}catch(e){}setTimeout(grabIn,600)});
    startInSnaps();if(!IN.raf)IN.raf=requestAnimationFrame(inLoop);
    return true;
  }
  function inUnmount(){stopInSnaps();if(IN.stream){IN.stream.getTracks().forEach(t=>{try{t.stop()}catch(e){}})}IN.stream=null;IN.video=null;IN.live=false;if(IN.el){try{IN.el.remove()}catch(e){}}IN.el=null;IN.fr=null;IN.kind="";IN.snap=null}
  function startInSnaps(){if(IN.snapTimer)return;IN.snapTimer=setInterval(()=>{if(!IN.live)grabIn()},1000)}
  function stopInSnaps(){if(IN.snapTimer){clearInterval(IN.snapTimer);IN.snapTimer=0}}
  async function grabIn(){
    if(IN.snapBusy||!IN.fr)return;IN.snapBusy=true;
    try{const h2c=await loadH2C(),wn=IN.fr.contentWindow,d=wn&&wn.document;if(!d||!d.body)return;
      const c=await h2c(d.body,{backgroundColor:"#0f172a",useCORS:true,allowTaint:false,logging:false,scale:Math.min(2,window.devicePixelRatio||1),x:wn.scrollX,y:wn.scrollY,width:wn.innerWidth,height:wn.innerHeight,windowWidth:wn.innerWidth,windowHeight:wn.innerHeight});
      if(c&&c.width){IN.snap=c;dirty()}}
    catch(e){}finally{IN.snapBusy=false}
  }
  /* Chrome / Edge: film the block live (tab capture cropped to the element) instead of a picture every second */
  async function inFilmLive(){
    const md=navigator.mediaDevices;if(!IN.el)return false;
    if(!md||!md.getDisplayMedia||!(window.CropTarget||window.RestrictionTarget)){say("This browser cannot film a live page, so the recording gets a new picture every second. Chrome or Edge on a computer films it live.","",6000);return false}
    let s=null;
    try{s=await md.getDisplayMedia({video:{displaySurface:"browser",frameRate:30},audio:false,preferCurrentTab:true,selfBrowserSurface:"include",surfaceSwitching:"exclude",monitorTypeSurfaces:"exclude"});
      const tr=s.getVideoTracks()[0];let done=false;
      if(window.RestrictionTarget&&tr.restrictTo){try{await tr.restrictTo(await RestrictionTarget.fromElement(IN.el));done=true}catch(e){}}
      if(!done){if(!(window.CropTarget&&tr.cropTo))throw new Error("crop");await tr.cropTo(await CropTarget.fromElement(IN.el))}
      const v=document.createElement("video");v.muted=true;v.playsInline=true;v.srcObject=s;await v.play();
      IN.stream=s;IN.video=v;IN.live=true;stopInSnaps();tr.addEventListener("ended",()=>{IN.stream=null;IN.video=null;IN.live=false;startInSnaps();paintScn()});
      say("The input block is filmed live. Scroll and click it.","ok",3000);paintScn();return true;
    }catch(e){if(s)s.getTracks().forEach(t=>{try{t.stop()}catch(x){}});say(e&&e.name==="NotAllowedError"?"Not shared: the recording keeps a new picture every second. Pick “This tab” to film it live.":"Could not film the page live: the recording keeps a new picture every second.","",5000);return false}
  }
  /* ----- screen share ----- */
  async function shareScreen(){
    const md=navigator.mediaDevices;
    if(!md||!md.getDisplayMedia){say("Screen sharing works in Chrome, Edge, Firefox or Safari on a computer. This device cannot share its screen.","err",6000);return false}
    let s=null;
    try{s=await md.getDisplayMedia({video:{frameRate:30},audio:false,selfBrowserSurface:"exclude"});
      const v=document.createElement("video");v.muted=true;v.playsInline=true;v.srcObject=s;await v.play();
      shotStop();IN.shot=s;IN.shotV=v;s.getVideoTracks()[0].addEventListener("ended",()=>{IN.shot=null;IN.shotV=null;paintScn();dirty();say("Screen sharing stopped. Pick Share screen again to go on.","",4000)});
      if(!IN.raf)IN.raf=requestAnimationFrame(inLoop);paintScn();return true;
    }catch(e){if(s)s.getTracks().forEach(t=>{try{t.stop()}catch(x){}});say(e&&e.name==="NotAllowedError"?"Screen sharing was not allowed.":"Screen sharing did not start.","",4000);return false}
  }
  function shotStop(){if(IN.shot){IN.shot.getTracks().forEach(t=>{try{t.stop()}catch(e){}})}IN.shot=null;IN.shotV=null}
  /* place the iframe over the block, apply crop / zoom / pan to it, and cut out the camera bubble so the preview shows what the recording shows */
  function inPlace(){
    const sr=studioRoot(),st=sr&&Q("#stage",sr),cv=sr&&Q("#stage-cv",sr),r=inRect();if(!st||!cv||!IN.el||!r)return;
    const c=cv.getBoundingClientRect(),s=st.getBoundingClientRect();if(c.width<2||c.height<2)return;
    const x=c.left-s.left+r.x*c.width,y=c.top-s.top+r.y*c.height,w=r.w*c.width,h=r.h*c.height,E=IN.el.style;
    const set=(k,v)=>{if(E[k]!==v)E[k]=v};set("left",Math.round(x)+"px");set("top",Math.round(y)+"px");set("width",Math.round(w)+"px");set("height",Math.round(h)+"px");
    /* the page is laid out at a real width (390 px phone view for a tall block, 1280 px for a wide one) and scaled into the block */
    if(IN.fr){const F=IN.fr.style,LW=w/Math.max(1,h)<1?390:1280,LH=Math.round(LW*h/Math.max(1,w)),X=srcRect(LW,LH,w/Math.max(1,h),scS().xf.in),k=w/Math.max(1,X.sw);
      const fw=LW+"px",fh=LH+"px",tf="translate("+(-X.sx*k).toFixed(1)+"px,"+(-X.sy*k).toFixed(1)+"px) scale("+k.toFixed(4)+")";
      if(F.width!==fw)F.width=fw;if(F.height!==fh)F.height=fh;if(F.transform!==tf)F.transform=tf}
    let cp="none";
    try{const L=LAY(),cm=L&&L.layers.camera;if(cm&&cm.on&&cm.fill!=="full"){
      const sx=c.width,sy=c.height,cx=cm.x*sx-(x-(c.left-s.left)),cy=cm.y*sy-(y-(c.top-s.top)),cw=cm.w*sx,chh=cm.h*sy;
      if(cx<w&&cy<h&&cx+cw>0&&cy+chh>0){const rad=Math.min(cw,chh)/2*(cm.radius/100);const f=n=>n.toFixed(1);
        const hole="M"+f(cx+rad)+" "+f(cy)+"H"+f(cx+cw-rad)+"A"+f(rad)+" "+f(rad)+" 0 0 1 "+f(cx+cw)+" "+f(cy+rad)+"V"+f(cy+chh-rad)+"A"+f(rad)+" "+f(rad)+" 0 0 1 "+f(cx+cw-rad)+" "+f(cy+chh)+"H"+f(cx+rad)+"A"+f(rad)+" "+f(rad)+" 0 0 1 "+f(cx)+" "+f(cy+chh-rad)+"V"+f(cy+rad)+"A"+f(rad)+" "+f(rad)+" 0 0 1 "+f(cx+rad)+" "+f(cy)+"Z";
        cp='path(evenodd,"M0 0H'+f(w)+"V"+f(h)+'H0Z '+hole+'")'}}}catch(e){}
    if(E.clipPath!==cp)E.clipPath=cp;
  }
  function inLoop(){
    const S=scS(),need=usesInput()&&(S.src==="screen"?!!IN.shotV:!!IN.el);
    if(!need&&!(scS().xfOpen)){IN.raf=0;return}
    try{inPlace()}catch(e){}try{placeHandle()}catch(e){}
    if(IN.shotV||IN.live)dirty();
    IN.raf=requestAnimationFrame(inLoop);
  }
  function inputSync(){
    const S=scS(),u=usesInput();
    if(!u||S.src==="screen")inUnmount();
    if(!u||S.src!=="screen")shotStop();
    if(u&&(S.src==="landing"||S.src==="app"))inMount(S.src);
    if(!IN.raf&&(u||S.xfOpen))IN.raf=requestAnimationFrame(inLoop);
  }
  function drawUnder(ctx,W,H){
    if(!(W>1&&H>1)||!usesInput())return;
    const S=scS(),r=inRect();if(!r)return;
    const x=r.x*W,y=r.y*H,w=r.w*W,h=r.h*H;
    ctx.save();rr(ctx,x,y,w,h,Math.min(w,h)*.012);ctx.clip();ctx.fillStyle="#0f172a";ctx.fillRect(x,y,w,h);
    try{
      if(S.src==="screen"&&IN.shotV&&IN.shotV.videoWidth){const v=IN.shotV,X=srcRect(v.videoWidth,v.videoHeight,w/h,S.xf.in);ctx.drawImage(v,X.sx,X.sy,X.sw,X.sh,x,y,w,h)}
      else if(IN.live&&IN.video&&IN.video.videoWidth)ctx.drawImage(IN.video,x,y,w,h);
      else if(IN.snap&&IN.snap.width){const X=srcRect(IN.snap.width,IN.snap.height,w/h,S.xf.in);ctx.drawImage(IN.snap,X.sx,X.sy,X.sw,X.sh,x,y,w,h)}
      else{ctx.fillStyle="#94a3b8";ctx.font="600 "+Math.round(Math.max(12,Math.min(w,h)*.045))+"px Sora,system-ui,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillText(S.src==="screen"?"Pick “Share screen” to show your screen here":S.src==="app"?"Loading the app…":"Loading the landing page…",x+w/2,y+h/2,w*.9)}
    }catch(e){}
    ctx.restore();
  }
  /* ----- Crop & zoom: the panel and the drag / wheel / pinch handle ----- */
  function xfTarget(){const S=scS();return S.target==="cam"||!sceneOn()?"cam":"in"}
  function xfSet(patch,quiet){
    const S=scS(),tg=xfTarget(),xf=Object.assign({},S.xf[tg],patch);
    ["l","t","r","b"].forEach(k=>{xf[k]=clamp(+xf[k]||0,0,.45)});if(xf.l+xf.r>.8){xf.r=.8-xf.l}if(xf.t+xf.b>.8){xf.b=.8-xf.t}
    xf.z=clamp(+xf.z||1,1,4);xf.px=clamp(+xf.px||0,-1,1);xf.py=clamp(+xf.py||0,-1,1);xf.bs=clamp(+xf.bs||1,.5,1);
    const all=Object.assign({},S.xf);all[tg]=xf;scPut({xf:all});
    if(tg==="in"&&S.src==="board"&&sceneOn())applyScene({});
    dirty();if(!quiet)paintXf();
  }
  function placeHandle(){
    const sr=studioRoot(),st=sr&&Q("#stage",sr),cv=sr&&Q("#stage-cv",sr),S=scS();if(!st||!cv)return;
    let hd=Q("#lc79-xfh",sr);
    if(!S.xfOpen){if(hd)hd.remove();return}
    const tg=xfTarget(),L=LAY();let r=null;
    if(tg==="cam"){const cm=L&&L.layers.camera;if(cm&&cm.on)r=cm.fill==="full"?{x:0,y:0,w:1,h:1}:{x:cm.x,y:cm.y,w:cm.w,h:cm.h}}else r=inRect();
    if(!r){if(hd)hd.remove();return}
    if(!hd){hd=document.createElement("div");hd.id="lc79-xfh";hd.setAttribute("aria-hidden","true");hd.title="Drag to pan, wheel or two fingers to zoom";st.appendChild(hd);bindHandle(hd)}
    const c=cv.getBoundingClientRect(),s=st.getBoundingClientRect(),E=hd.style;
    E.left=Math.round(c.left-s.left+r.x*c.width)+"px";E.top=Math.round(c.top-s.top+r.y*c.height)+"px";E.width=Math.round(r.w*c.width)+"px";E.height=Math.round(r.h*c.height)+"px";
    hd.dataset.tg=tg;
  }
  function bindHandle(hd){
    const pts=new Map();let base=null;
    const start=()=>{const S=scS(),tg=xfTarget(),x=S.xf[tg],R=hd.getBoundingClientRect(),pp=[...pts.values()];
      base={x:Object.assign({},x),w:R.width,h:R.height,c:pp.length===1?{x:pp[0].x,y:pp[0].y}:null,d:pp.length>=2?Math.hypot(pp[0].x-pp[1].x,pp[0].y-pp[1].y):0,tg:tg}};
    hd.addEventListener("pointerdown",e=>{e.preventDefault();try{hd.setPointerCapture(e.pointerId)}catch(x){}pts.set(e.pointerId,{x:e.clientX,y:e.clientY});start()});
    hd.addEventListener("pointermove",e=>{if(!pts.has(e.pointerId)||!base)return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const pp=[...pts.values()];
      if(pp.length>=2&&base.d>0){const d=Math.hypot(pp[0].x-pp[1].x,pp[0].y-pp[1].y);if(base.tg==="in"&&scS().src==="board")xfSet({bs:base.x.bs*d/base.d},true);else xfSet({z:base.x.z*d/base.d},true);return}
      if(pp.length===1&&base.c){let dx=(e.clientX-base.c.x)/Math.max(1,base.w),dy=(e.clientY-base.c.y)/Math.max(1,base.h);
        const L=LAY();if(base.tg==="cam"&&L&&L.layers.camera.flip)dx=-dx;
        const k=base.tg==="in"&&scS().src==="board"?2:2*Math.max(1,base.x.z);   /* drag the picture with the finger */
        xfSet({px:base.x.px-dx*k,py:base.x.py-dy*k},true)}});
    const end=e=>{pts.delete(e.pointerId);if(pts.size)start();else{base=null;paintXf()}};
    hd.addEventListener("pointerup",end);hd.addEventListener("pointercancel",end);
    hd.addEventListener("wheel",e=>{e.preventDefault();const S=scS(),tg=xfTarget(),x=S.xf[tg],f=Math.exp(-e.deltaY*.0015);if(tg==="in"&&S.src==="board")xfSet({bs:x.bs*f});else xfSet({z:x.z*f})},{passive:false});
  }
  const PARAMS=[["z","Zoom",100,400],["px","Pan left / right",-100,100],["py","Pan up / down",-100,100],["l","Crop left",0,45],["r","Crop right",0,45],["t","Crop top",0,45],["b","Crop bottom",0,45]];
  function paintVal(){
    const sr=studioRoot(),p=sr&&Q("#lc79-xf",sr);if(!p)return;const S=scS(),tg=xfTarget(),x=S.xf[tg],brd=tg==="in"&&S.src==="board",k=S.param||"z";
    const v=Q("[data-xv]",p);if(v)v.textContent=k==="z"?(brd?Math.round(x.bs*100)+"%":(+x.z).toFixed(2)+"x"):(k==="px"||k==="py")?Math.round(x[k]*100):Math.round(x[k]*100)+"%";
  }
  function paintXf(){
    const sr=studioRoot(),p=sr&&Q("#lc79-xf",sr);if(!p)return;const S=scS();p.hidden=!S.xfOpen;if(!S.xfOpen)return;
    const tg=xfTarget(),x=S.xf[tg],brd=tg==="in"&&S.src==="board";
    const tsel=Q("[data-x=target]",p);if(tsel){tsel.value=tg;Q('option[value="in"]',tsel).disabled=!sceneOn()}
    let k=S.param||"z";const list=brd?PARAMS.slice(0,3):PARAMS;if(!list.some(o=>o[0]===k))k="z";
    const ps=Q("[data-x=param]",p);if(ps){const html=list.map(o=>'<option value="'+o[0]+'">'+esc(brd&&o[0]==="z"?"Board size":o[1])+"</option>").join("");if(ps.innerHTML!==html)ps.innerHTML=html;ps.value=k}
    const o=list.filter(z=>z[0]===k)[0],r=Q("[data-x=val]",p);
    if(r){r.min=String(brd&&k==="z"?50:o[2]);r.max=String(brd&&k==="z"?100:o[3]);if(sr.activeElement!==r)r.value=String(Math.round((k==="z"?(brd?x.bs:x.z):x[k])*100))}
    const lab=Q("[data-xl]",p);if(lab)lab.textContent=brd&&k==="z"?"Board size":o[1];
    paintVal();
    const n=Q(".lc79-xnote",p);if(n)n.textContent=brd?"The board keeps its exact squares so you can play on it: set its size in the block and drag it to place it.":"Drag on the "+(tg==="cam"?"camera":"input")+" on the stage to pan, use the wheel or two fingers to zoom. Only what is inside the frame is recorded.";
    const sh=Q("[data-x=shape]",p);if(sh){const L=LAY(),cm=L&&L.layers.camera;sh.closest("label").hidden=tg!=="cam"||!cm||cm.fill==="full";if(cm)sh.value=cm.shape==="circle"?"circle":(+cm.radius>=20?"rect":"free")}
  }
  function setCamShape(v){
    const L=LAY();if(!L)return;const cm=JSON.parse(JSON.stringify(L.layers.camera));
    if(v==="circle"){cm.shape="circle";cm.ratio="1:1";cm.radius=100;const s=Math.min(cm.w*aspectA(L),cm.h);cm.w=s/aspectA(L);cm.h=s}
    else if(v==="free"){cm.shape="rect";cm.ratio="free";cm.radius=6}else{cm.shape="rect";cm.ratio="free";cm.radius=24}
    try{api().lc54.apply({aspect:L.aspect,layers:{camera:cm}})}catch(e){}paintXf();dirty();
  }
  /* ----- the scene row (above the stage) ----- */
  function paintScn(){
    const sr=studioRoot(),row=sr&&Q("#lc79-scn",sr);if(!row)return;const S=scS();
    const sc=Q("[data-s=scene]",row);if(sc&&sc.value!==S.scene)sc.value=S.scene;
    const so=Q("[data-s=src]",row);if(so){if(so.value!==S.src)so.value=S.src;so.closest("label").hidden=!sceneOn()}
    const fl=Q("[data-s=film]",row);if(fl){fl.hidden=!(usesInput()&&(S.src==="landing"||S.src==="app"));fl.textContent=IN.live?"● Filming live":"Film it live"}
    const sh=Q("[data-s=share]",row);if(sh){sh.hidden=!(usesInput()&&S.src==="screen");sh.textContent=IN.shotV?"Change the shared screen":"Share screen"}
    const xb=Q("[data-s=xf]",row);if(xb){xb.setAttribute("aria-pressed",String(!!S.xfOpen));xb.classList.toggle("lc79-on",!!S.xfOpen)}
    paintXf();
  }
  function buildScn(sr){
    const col=Q("#stage",sr)&&Q("#stage",sr).closest(".stage-wrap");if(!col||Q("#lc79-scn",sr))return;
    const row=document.createElement("div");row.id="lc79-scn";row.className="lc79-scn";row.setAttribute("role","toolbar");row.setAttribute("aria-label","Scene and input");
    row.innerHTML='<label class="lc79-sl"><span>Scene</span><select class="lc79-dsel" data-s="scene">'+SCENES.map(o=>'<option value="'+o[0]+'">'+esc(o[1])+"</option>").join("")+'</select></label>'
      +'<label class="lc79-sl"><span>Input</span><select class="lc79-dsel" data-s="src">'+SOURCES.map(o=>'<option value="'+o[0]+'">'+esc(o[1])+"</option>").join("")+"</select></label>"
      +'<button type="button" class="btn sm lc79-dockb" data-s="share" hidden>Share screen</button><button type="button" class="btn sm lc79-dockb" data-s="film" hidden title="Chrome / Edge: film the page in the block live instead of one picture a second">Film it live</button>'
      +'<button type="button" class="btn sm lc79-dockb" data-s="xf" aria-controls="lc79-xf" aria-pressed="false">⤢ Crop & zoom</button>';
    const xf=document.createElement("div");xf.id="lc79-xf";xf.className="lc79-xf";xf.hidden=true;
    xf.innerHTML='<div class="lc79-xrow"><label class="lc79-sl"><span>Edit</span><select class="lc79-dsel" data-x="target"><option value="cam">The camera</option><option value="in">The input block</option></select></label>'
      +'<label class="lc79-sl"><span>Setting</span><select class="lc79-dsel" data-x="param"></select></label>'
      +'<label class="lc79-sl lc79-xs"><span><span data-xl>Zoom</span> <b data-xv></b></span><input type="range" data-x="val" min="100" max="400" step="1" aria-label="Value"></label>'
      +'<label class="lc79-sl"><span>Camera frame</span><select class="lc79-dsel" data-x="shape"><option value="free">Free rectangle</option><option value="rect">Rounded</option><option value="circle">Circle</option></select></label>'
      +'<button type="button" class="btn sm lc79-dockb" data-x="reset">Reset</button></div>'
      +'<p class="lc79-hint lc79-xnote"></p>';
    col.parentNode.insertBefore(row,col);col.parentNode.insertBefore(xf,col);
    row.addEventListener("change",e=>{const k=e.target.getAttribute("data-s");if(!k)return;const v=e.target.value;
      if(k==="scene"){if(!applyScene({scene:v}))paintScn();else say(SCENES.filter(o=>o[0]===v)[0][1]+".","ok",1600)}
      if(k==="src"){applyScene({src:v});if(v==="screen"&&!IN.shotV)shareScreen().then(()=>{paintScn();dirty()})}});
    row.addEventListener("click",e=>{const b=e.target.closest("[data-s]");if(!b||b.tagName==="SELECT")return;const k=b.getAttribute("data-s");
      if(k==="xf"){scPut({xfOpen:!scS().xfOpen});paintScn();inputSync();placeHandle()}
      if(k==="share")shareScreen().then(()=>{paintScn();dirty()});
      if(k==="film")inFilmLive()});
    xf.addEventListener("input",e=>{if(e.target.getAttribute("data-x")!=="val")return;const S=scS(),k=S.param||"z",brd=xfTarget()==="in"&&S.src==="board",v=+e.target.value;
      if(k==="z")xfSet(brd?{bs:v/100}:{z:v/100},true);else xfSet({[k]:v/100},true);paintVal()});
    xf.addEventListener("change",e=>{const k=e.target.getAttribute("data-x");if(k==="target"){scPut({target:e.target.value});paintXf();placeHandle()}else if(k==="param"){scPut({param:e.target.value});paintXf()}else if(k==="shape")setCamShape(e.target.value)});
    xf.addEventListener("click",e=>{if(e.target.closest('[data-x="reset"]')){xfSet(Object.assign({},XF0))}});
    paintScn();
  }
  /* the record bar: a fixed status bar along the bottom (always in reach, also after scrolling), and the stage is sized so it always ends
     ABOVE that bar: the board is never under it. The space under the stage is kept free so the panels below can scroll past the bar. */
  let fitAt=0;
  function dockFit(sr){
    const dock=Q("#lc54-dock",sr),st=Q("#stage",sr),wrap=st&&st.closest(".stage-wrap");if(!dock||!wrap)return;
    dock.classList.add("lc79-docked");
    const col=wrap.parentNode,row=Q("#lc79-scn",sr)||wrap;
    ["#lc79-post","#lc79-live"].forEach(id=>{const el=Q(id,sr);if(el&&el.parentNode!==col)col.insertBefore(el,row)});
    let rec="idle";try{rec=api().rec.state}catch(e){}
    if(rec!=="idle")return;                                             /* never resize the stage while a take is running */
    const dr=dock.getBoundingClientRect();if(dr.height<10)return;
    const L=LAY(),ar=L&&L.aspect==="9:16"?9/16:16/9,cs=getComputedStyle(wrap),pl=parseFloat(cs.paddingLeft)||0,pr=parseFloat(cs.paddingRight)||0,pt=parseFloat(cs.paddingTop)||0;
    const top0=wrap.getBoundingClientRect().top+(window.scrollY||0)+pt;  /* where the stage starts with the page at the top */
    const room=dr.top-8-top0,pad=Math.ceil(window.innerHeight-dr.top+10);
    let mw=0;if(room>=180&&wrap.getBoundingClientRect().width>0){const w=Math.floor(room*ar+pl+pr);if(w<col.clientWidth)mw=w}
    /* one style rule in the Studio's own shadow root: the Studio's layout code can rewrite the element styles, never this rule */
    let fs=Q("#lc79-fit",sr);if(!fs){fs=document.createElement("style");fs.id="lc79-fit";sr.appendChild(fs)}
    col.classList.add("lc79-fitcol");
    const css=".lc79-fitcol{padding-bottom:"+pad+"px!important}"+(mw?".lc79-fitcol>.stage-wrap{max-width:"+mw+"px!important;width:100%;margin-left:auto!important;margin-right:auto!important}":"");
    if(fs.textContent!==css&&Date.now()-fitAt>250){fitAt=Date.now();fs.textContent=css}
  }
  function sceneTick(sr){
    buildScn(sr);dockFit(sr);
    const S=scS(),L=LAY();if(L&&sceneOn()&&S.aspect&&S.aspect!==L.aspect)applyScene({});     /* the format changed: put the blocks back in place */
    if(usesInput()&&(S.src==="landing"||S.src==="app")&&!(IN.el&&IN.el.isConnected))inputSync();
    if(S.xfOpen&&!IN.raf)IN.raf=requestAnimationFrame(inLoop);
  }
  function sceneStop(){inUnmount();shotStop();if(IN.raf){cancelAnimationFrame(IN.raf);IN.raf=0}}

  /* ---------- 9.54.0: the Studio menu bar, the Devices panel and the Live engine monitor (all inside the Studio's shadow root) ---------- */
  const MB_TABS=[["script","Script"],["scenes","Scene Builder"],["shoot","Shoot"],["edit","Takes"],["library","Library"],["free","Free layout"]];
  const MB={eng:false,dev:false,devRaf:0};
  function curTab(){return String(rd("lc66-tab","script")||"script")}
  function menuBar(sr){
    const lcs=Q("#lcs",sr),canvas=Q("#canvas",sr)||Q("main.canvas",sr);if(!lcs||!canvas)return;
    let bar=Q("#lc79-menu",sr);
    if(!bar){
      const notes={};try{(LC66.TABS||[]).forEach(t=>{notes[t.id]=t.note})}catch(e){}
      bar=document.createElement("nav");bar.id="lc79-menu";bar.setAttribute("aria-label","Creator Studio menu");
      bar.innerHTML='<div class="mb-g" role="group" aria-label="Studio sections">'+MB_TABS.map(t=>'<button type="button" class="mb-t" data-mb-tab="'+t[0]+'" aria-pressed="false" title="'+esc(notes[t[0]]||t[1])+'">'+esc(t[1])+'</button>').join("")+'</div>'
        +'<span class="mb-sep" aria-hidden="true"></span>'
        +'<div class="mb-g" role="group" aria-label="Studio tools">'
        +'<button type="button" class="mb-b mb-pri" data-mb="projects" title="The timeline: cut, layers, versions, callouts and export">✂ Edit Studio</button>'
        +'<button type="button" class="mb-b" data-mb="script" title="PGN in: crucial mistake, similar Lichess position and a master prompt">Game-to-Script</button>'
        +'<button type="button" class="mb-b" data-mb="devices" aria-expanded="false" title="Choose your camera and microphone">🎙 Devices</button>'
        +'<button type="button" class="mb-b" data-mb="engine" aria-pressed="false" title="Stockfish checks the Studio board while you talk. Only you see it: it is not recorded.">♞ Live engine</button>'
        +'<button type="button" class="mb-b" data-mb="cta" title="Landing page in the picture: what it shows and where">CTA settings</button>'
        +'<button type="button" class="mb-b" data-mb="flow" title="Which scene each recording step uses">Recording flow</button></div>'
        +'<div class="mb-x" aria-label="Section options"></div>';
      lcs.insertBefore(bar,canvas);
      bar.addEventListener("click",e=>{
        const tb=e.target.closest("[data-mb-tab]");
        if(tb){try{LC66.setTab(sr,tb.getAttribute("data-mb-tab"))}catch(x){}paintMenu(sr);return}
        const b=e.target.closest("[data-mb]");if(!b)return;const a=b.getAttribute("data-mb");
        if(a==="projects")return openProjects();
        if(a==="script")return openScript();
        if(a==="devices")return toggleDevices(sr);
        if(a==="engine")return toggleEngine(sr);
        if(a==="cta")return openCtaSettings();
        if(a==="flow")return openFlowSettings();
      });
    }
    /* the section options of LC66 (watermark size, saved scene chips) live in the bar now, not in a corner of the canvas */
    const x=Q(".mb-x",bar);[".lc66-wm",".lc66-scn"].forEach(c=>{const el=Q(c,sr);if(el&&el.parentNode!==x)x.appendChild(el)});
    paintMenu(sr);
  }
  function paintMenu(sr){
    const bar=Q("#lc79-menu",sr);if(!bar)return;const t=curTab();
    QA("[data-mb-tab]",bar).forEach(b=>{const on=b.getAttribute("data-mb-tab")===t;if(b.getAttribute("aria-pressed")!==String(on))b.setAttribute("aria-pressed",String(on))});
    const e=Q('[data-mb="engine"]',bar);if(e)e.setAttribute("aria-pressed",String(MB.eng));
    const d=Q('[data-mb="devices"]',bar);if(d)d.setAttribute("aria-expanded",String(!!Q("#lc79-dev",sr)));
  }
  /* ----- Devices ----- */
  function toggleDevices(sr){const el=Q("#lc79-dev",sr);if(el){closeDevices(sr);return}openDevices(sr)}
  function closeDevices(sr){const el=sr&&Q("#lc79-dev",sr);if(el)el.remove();if(MB.devRaf){cancelAnimationFrame(MB.devRaf);MB.devRaf=0}MB.dev=false;if(sr)paintMenu(sr)}
  async function openDevices(sr){
    const lcs=Q("#lcs",sr),t=T();if(!lcs||!t)return;
    const el=document.createElement("div");el.id="lc79-dev";el.className="mb-pop";el.setAttribute("role","dialog");el.setAttribute("aria-label","Camera and microphone");
    el.innerHTML='<header><b>Camera &amp; microphone</b><button type="button" class="mb-b" data-dv="close" aria-label="Close">×</button></header>'
      +'<label class="dv-f"><span>Microphone (recorded sound)</span><select data-dv="mic"></select></label>'
      +'<div class="dv-meter" aria-hidden="true"><i></i></div><p class="dv-st" data-dv-st aria-live="polite"></p>'
      +'<label class="dv-f"><span>Camera</span><select data-dv="cam"></select></label>'
      +'<div class="dv-row"><button type="button" class="mb-b" data-dv="detect">Detect devices</button><button type="button" class="mb-b mb-pri" data-dv="test">Test the microphone</button></div>'
      +'<p class="dv-hint">Your choice is saved on this device and used for every take. Plugged in a USB microphone? Press Detect devices and pick it here. If it is unplugged, the default stands in until it is back.</p>';
    lcs.appendChild(el);MB.dev=true;paintMenu(sr);
    const bar=Q("#lc79-menu",sr);if(bar)el.style.top=(bar.offsetTop+bar.offsetHeight+6)+"px";
    try{await t.Cam.refresh()}catch(e){}
    paintDevices(sr);
    el.addEventListener("click",async e=>{const b=e.target.closest("[data-dv]");if(!b||b.tagName==="SELECT")return;const a=b.getAttribute("data-dv");
      if(a==="close")return closeDevices(sr);
      if(a==="detect"){try{await t.Hardware.detect()}catch(x){}try{await t.Cam.refresh()}catch(x){}return paintDevices(sr)}
      if(a==="test"){try{if(!t.Mic.active)await t.Mic.enable();else await t.Mic.enable()}catch(x){say("The microphone could not start: "+(x&&x.message||x),"err",4000)}return paintDevices(sr)}});
    el.addEventListener("change",async e=>{const s2=e.target.closest("select[data-dv]");if(!s2)return;
      const rec=(()=>{try{return api().rec.state}catch(x){return"idle"}})();if(rec!=="idle"){say("Stop recording before you switch devices.","err",3000);return paintDevices(sr)}
      const kind=s2.getAttribute("data-dv")==="cam"?"videoinput":"audioinput",v=s2.value;
      try{t.devRemember(kind,v)}catch(x){}
      const mirror=Q(kind==="videoinput"?"#cameraSelect":"#micSelect",sr);if(mirror){mirror.value=v}
      try{
        if(t.Hardware.live){await api().startCreatorStream()}
        else if(kind==="audioinput"){await t.Mic.enable()}
        else if(t.Cam.active){await t.Cam.enable()}
      }catch(x){say("That device could not start: "+(x&&x.message||x),"err",4000)}
      const lab=s2.options[s2.selectedIndex]?s2.options[s2.selectedIndex].text:"";
      say((kind==="videoinput"?"Camera":"Microphone")+" saved: "+lab+".","ok",2600);paintDevices(sr)});
    const meter=()=>{if(!el.isConnected){MB.devRaf=0;return}const i=Q(".dv-meter i",el);let db=-90;try{db=t.Mic.levelDb()}catch(x){}if(i)i.style.width=Math.round(clamp((db+70)/70,0,1)*100)+"%";MB.devRaf=requestAnimationFrame(meter)};
    MB.devRaf=requestAnimationFrame(meter);
  }
  function paintDevices(sr){
    const el=Q("#lc79-dev",sr),t=T();if(!el||!t)return;const list=t.Cam.devices||[];
    const fill=(sel,kind,def)=>{const want=(()=>{try{return t.devPick(kind)}catch(e){return""}})(),items=list.filter(d=>d.kind===kind);
      sel.innerHTML='<option value="">'+def+'</option>'+items.map((d,i)=>'<option value="'+esc(d.deviceId)+'">'+esc(d.label||(kind==="videoinput"?"Camera ":"Microphone ")+(i+1))+'</option>').join("");
      sel.value=items.some(d=>d.deviceId===want)?want:""};
    fill(Q('[data-dv="mic"]',el),"audioinput","Default microphone");fill(Q('[data-dv="cam"]',el),"videoinput","Default camera");
    const st=Q("[data-dv-st]",el),named=list.some(d=>d.label);let using="";
    try{const tr=t.Mic.active&&t.Mic.stream&&t.Mic.stream.getAudioTracks()[0];using=tr?tr.label||"a microphone":""}catch(e){}
    const saved=t.Cfg.micLabel||"";
    st.textContent=(using?"Listening to: "+using+". Speak: the bar moves.":"The microphone is off. Press Test the microphone to hear which one is used.")+(saved&&using&&using!==saved?" (Saved choice “"+saved+"” is not connected: the default stands in.)":"")+(named?"":" Press Detect devices so the browser shows the device names.");
    const rec=(()=>{try{return api().rec.state}catch(x){return"idle"}})();QA("select[data-dv]",el).forEach(s=>{s.disabled=rec!=="idle"});
  }
  /* ----- Live engine monitor: on this device only, never drawn into the recording ----- */
  const EG={timer:0,deb:0,fen:"",ver:-1,evals:{},res:null,prev:null,busy:false};
  function toggleEngine(sr){MB.eng=!MB.eng;wr("lc79-eng",MB.eng?1:0);if(MB.eng)engineOn(sr);else engineOff(sr);paintMenu(sr)}
  function engineOn(sr){
    const lcs=Q("#lcs",sr);if(!lcs)return;let el=Q("#lc79-eng",sr);
    if(!el){el=document.createElement("aside");el.id="lc79-eng";el.className="mb-pop mb-eng";el.setAttribute("aria-label","Live engine");el.setAttribute("aria-live","polite");
      el.innerHTML='<header><b>♞ Live engine</b><span class="eg-d" data-eg-d></span><button type="button" class="mb-b" data-eg="x" aria-label="Turn the live engine off">×</button></header><div class="eg-bar" aria-hidden="true"><i></i></div><p class="eg-ev" data-eg-ev>Starting Stockfish…</p><p class="eg-last" data-eg-last></p><ol class="eg-lines" data-eg-lines></ol><p class="dv-hint">Only you see this: it is not in the recording. Play moves on the Studio board and it checks every position.</p>';
      lcs.appendChild(el);el.addEventListener("click",e=>{if(e.target.closest('[data-eg="x"]'))toggleEngine(sr)})}
    const bar=Q("#lc79-menu",sr);if(bar)el.style.top=(bar.offsetTop+bar.offsetHeight+6)+"px";
    EG.ver=-1;EG.fen="";if(!EG.timer)EG.timer=setInterval(engineTick,350);engineTick();
  }
  function engineOff(sr){if(EG.timer){clearInterval(EG.timer);EG.timer=0}clearTimeout(EG.deb);const el=sr&&Q("#lc79-eng",sr);if(el)el.remove();try{if(EG.busy&&typeof Engine!=="undefined")Engine.stop()}catch(e){}EG.busy=false}
  const cpOf=l=>!l?0:l.mate!=null?(l.mate>0?1e4-l.mate*10:-1e4-l.mate*10):(l.cp||0);
  const evTxt=l=>!l?"…":l.mate!=null?(l.mate>0?"#":"-#")+Math.abs(l.mate):((l.cp||0)>0?"+":"")+((l.cp||0)/100).toFixed(2);
  function engineTick(){
    const sr=studioRoot();if(!sr||route()!=="studio"){engineOff(sr);return}
    if(layerStack.length)return;                                   /* Game-to-Script and the Edit Studio use the engine themselves */
    const B=api()&&api().board;if(!B)return;const fen=B.fen;if(!fen||(fen===EG.fen&&B.version===EG.ver))return;
    EG.ver=B.version;if(fen===EG.fen)return;
    const prevFen=EG.fen;EG.fen=fen;clearTimeout(EG.deb);
    EG.deb=setTimeout(()=>analyseNow(sr,fen,prevFen,B),250);
  }
  function analyseNow(sr,fen,prevFen,B){
    if(typeof Engine==="undefined"||!Engine.analyse){paintEngine(sr,{err:"Stockfish is not available on this device."});return}
    let rec="idle";try{rec=api().rec.state}catch(e){}
    EG.busy=true;
    Engine.analyse(fen,{movetime:rec==="idle"?1400:600,multipv:2},snap=>{if(EG.fen===fen)paintEngine(sr,{snap:snap,fen:fen,prevFen:prevFen,B:B})})
      .then(r=>{EG.busy=false;if(r&&r.lines&&r.lines[0])EG.evals[fen]=cpOf(r.lines[0]);if(EG.fen===fen)paintEngine(sr,{snap:r,fen:fen,prevFen:prevFen,B:B,done:true})})
      .catch(e=>{EG.busy=false;if(String(e&&e.message)!=="superseded"&&EG.fen===fen)paintEngine(sr,{err:"The engine stopped. Change the position to try again."})});
  }
  function paintEngine(sr,o){
    const el=sr&&Q("#lc79-eng",sr);if(!el)return;
    if(o.err){Q("[data-eg-ev]",el).textContent=o.err;return}
    const sn=o.snap,top=sn&&sn.lines&&sn.lines[0];if(!top)return;
    const cp=cpOf(top),wp=50+50*(2/(1+Math.exp(-.00368208*clamp(cp,-1500,1500)))-1);
    Q(".eg-bar i",el).style.width=wp.toFixed(1)+"%";
    const side=String(o.fen).split(" ")[1]==="b"?"Black":"White";
    Q("[data-eg-ev]",el).innerHTML='<b>'+esc(evTxt(top))+'</b> <span>'+(Math.abs(cp)<35?"about equal":cp>0?"White is better":"Black is better")+' · '+side+' to move</span>';
    Q("[data-eg-d]",el).textContent="depth "+(sn.depth||0);
    let pvt="";const lines=(sn.lines||[]).slice(0,2).map(l=>{try{pvt=Engine.pvText(o.fen,l.pv,6)}catch(e){pvt=(l.pv||[]).slice(0,6).join(" ")}return'<li><b>'+esc(evTxt(l))+'</b> '+esc(pvt)+'</li>'}).join("");
    Q("[data-eg-lines]",el).innerHTML=lines;
    /* what the last move on the Studio board did, compared with the position before it */
    const lm=Q("[data-eg-last]",el),pf=o.prevFen,before=pf&&EG.evals[pf];let txt="",cls="";
    try{const B=o.B,i=B.idx,mv=i>0&&B.moves[i-1];
      if(mv&&pf&&B.fens[i-1]===pf&&before!=null&&o.done){
        const mover=String(pf).split(" ")[1],loss=(mover==="w"?1:-1)*(before-cp);
        const cls0=loss>=300?["Blunder","bad"]:loss>=150?["Mistake","bad"]:loss>=70?["Inaccuracy","warn"]:["Fine","good"];
        txt=mv.san+": "+cls0[0]+(loss>=70?" (costs "+(loss>=5000?"the game":(loss/100).toFixed(1)+" pawns")+")":"")+". Best was "+(()=>{try{return Engine.uciToSan(pf,(EG.res&&EG.res[pf])||"")||"see above"}catch(e){return"see above"}})()+".";cls=cls0[1]}
    }catch(e){}
    if(o.done&&top.pv&&top.pv[0]){EG.res=EG.res||{};EG.res[o.fen]=top.pv[0]}
    if(txt){lm.textContent=txt;lm.className="eg-last "+cls}else if(o.done){lm.textContent="";lm.className="eg-last"}
  }
  /* ---------- Studio wiring (shadow root) ---------- */
  const SR_CSS=".lc79-dockb{min-height:44px!important;padding:0 14px!important;border-radius:12px!important;font-weight:700!important}#lc54-dock{flex-wrap:wrap;max-width:calc(100vw - 16px);row-gap:6px}#lc54-dock.lc79-docked{left:8px!important;right:8px!important;transform:none!important;max-width:none!important;width:auto!important;box-sizing:border-box;justify-content:flex-start;border-radius:14px!important}@media (max-width:700px){#lc54-dock.lc79-docked{flex-wrap:nowrap!important;overflow-x:auto;scrollbar-width:thin}#lc54-dock.lc79-docked>*{flex:none}}.lc79-scn{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin:0 0 8px}.lc79-sl{display:flex;flex-direction:column;gap:2px;font:600 11px Sora,system-ui,sans-serif;color:#94a3b8;letter-spacing:.02em}.lc79-sl[hidden]{display:none}.lc79-scn .lc79-dsel,.lc79-xf .lc79-dsel{max-width:min(300px,86vw)}.lc79-xf{margin:0 0 8px;padding:6px 10px;border-radius:14px;background:#0f141b;border:1px solid rgba(0,229,255,.3)}.lc79-xf[hidden]{display:none}.lc79-xrow{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}.lc79-xs{flex:1 1 160px;min-width:140px}.lc79-xs input{width:100%;min-height:44px}.lc79-xs b{color:#00E5FF}.lc79-xnote{margin:4px 0 0;font-size:12px}#lc79-xfh{position:absolute;z-index:45;cursor:grab;touch-action:none;outline:2px dashed #00E5FF;outline-offset:-2px;background:rgba(0,229,255,.06)}#lc79-xfh:active{cursor:grabbing}#lc54-dock .btn{min-height:44px}.lc79-dsel{min-height:44px;max-width:220px;border-radius:12px;background:#14171d;color:#e5e7eb;border:1px solid rgba(0,229,255,.45);padding:0 8px;font:600 13px Sora,system-ui,sans-serif}.lc79-flow{display:inline-flex;gap:4px;align-items:center}#lc79-step{max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
    +"#lc79-post{position:relative;left:auto;transform:none;bottom:auto;z-index:6;margin:0 auto 8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:min(720px,94%);padding:8px 12px;border-radius:12px;background:#0f172a;border:1px solid rgba(0,229,255,.5);color:#fff;font:600 13px Sora,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5)}#lc79-post .btn,#lc79-post select{min-height:44px}#lc79-post select{border-radius:10px;background:#14171d;color:#e5e7eb;border:1px solid rgba(255,255,255,.2);padding:0 8px}"
    +".lc79-dockb.lc79-on{background:#fbbf24!important;color:#0f172a!important;border-color:#fbbf24!important}"
    +".lc79-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px}.lc79-bar .btn{min-height:44px}.lc79-bar .lc79-go{background:#00E5FF;color:#04141a;border-color:#00E5FF;font-weight:700}"
    +".take-chip-w{display:inline-flex;align-items:stretch;gap:2px}.take-del{min-width:44px;min-height:44px;border-radius:10px;border:1px solid rgba(239,68,68,.45);background:rgba(239,68,68,.08);color:#fca5a5;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.take-del:hover{background:rgba(239,68,68,.2)}"
    +".lc79-opt{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;min-height:44px;padding:8px 12px;border:0;border-radius:8px;background:transparent;color:#e5e7eb;font:600 14px/1.2 inherit;text-align:left;cursor:pointer;border-top:1px solid rgba(255,255,255,.06)}.lc79-opt small{color:#94a3b8;font-weight:500;font-size:12px}.lc79-opt:hover,.lc79-opt:focus-visible{background:rgba(0,229,255,.1)}"
    +"#lc79-live{position:relative;left:auto;transform:none;bottom:auto;z-index:6;margin:0 auto 8px;max-width:min(680px,90%);padding:6px 14px;border-radius:10px;background:rgba(5,7,10,.82);color:#fff;font:600 15px/1.35 Sora,system-ui,sans-serif;pointer-events:none;text-align:center}#lc79-live small{display:block;color:#00E5FF;font-size:11px;font-weight:600}#lc79-live[hidden]{display:none}"
    /* 9.54.0: menu bar (the old corner dropdown is hidden; its watermark slider and scene chips sit in the bar) */
    +".lc66-bar{display:none!important}#lc79-menu{position:relative;z-index:40;display:flex;align-items:center;gap:6px;padding:6px 8px;margin:0;border-bottom:1px solid rgba(0,229,255,.18);background:rgba(10,11,14,.92);overflow-x:auto;scrollbar-width:thin;flex:none;font:600 13px/1 Sora,system-ui,sans-serif}"
    +"#lc79-menu .mb-g{display:flex;gap:4px;flex:none;align-items:center}#lc79-menu .mb-sep{width:1px;height:28px;background:rgba(255,255,255,.14);flex:none;margin:0 4px}"
    +".mb-t,.mb-b{min-height:40px;padding:0 11px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#14171d;color:#e5e7eb;font:600 13px/1 Sora,system-ui,sans-serif;cursor:pointer;white-space:nowrap}"
    +".mb-t:hover,.mb-b:hover{border-color:rgba(0,229,255,.55)}.mb-t:focus-visible,.mb-b:focus-visible{outline:2px solid #00E5FF;outline-offset:2px}"
    +".mb-t[aria-pressed=true]{background:rgba(0,229,255,.16);border-color:#00E5FF;color:#00E5FF}.mb-b.mb-pri{background:#00E5FF;color:#04141a;border-color:#00E5FF}.mb-b[aria-pressed=true],.mb-b[aria-expanded=true]{background:#fbbf24;color:#0f172a;border-color:#fbbf24}"
    +"#lc79-menu .mb-x{display:flex;gap:8px;align-items:center;flex:none}#lc79-menu .lc66-wm,#lc79-menu .lc66-scn{display:inline-flex}#lc79-menu .lc66-wm[hidden],#lc79-menu .lc66-scn[hidden]{display:none}"
    +".mb-pop{position:absolute;right:10px;top:110px;z-index:70;width:min(360px,calc(100% - 20px));padding:12px;border-radius:14px;background:rgba(10,11,14,.97);border:1px solid rgba(0,229,255,.35);box-shadow:0 18px 40px rgba(0,0,0,.55);color:#e5e7eb;font:13px/1.45 Sora,system-ui,sans-serif;display:flex;flex-direction:column;gap:8px;-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}"
    +".mb-pop header{display:flex;align-items:center;gap:8px}.mb-pop header b{flex:1;color:#fff;font-size:14px}.mb-pop header .mb-b{min-height:36px;padding:0 10px}"
    +".dv-f{display:flex;flex-direction:column;gap:4px;font-size:12px;color:#94a3b8}.dv-f select{min-height:44px;border-radius:10px;background:#14171d;color:#e5e7eb;border:1px solid rgba(255,255,255,.2);padding:0 8px;font:600 13px Sora,system-ui,sans-serif}"
    +".dv-meter{height:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}.dv-meter i{display:block;height:100%;width:0;background:linear-gradient(90deg,#22c55e,#fbbf24 75%,#ef4444)}"
    +".dv-st{margin:0;font-size:12px;color:#cbd5e1}.dv-row{display:flex;gap:6px;flex-wrap:wrap}.dv-hint{margin:0;font-size:11.5px;color:#94a3b8}"
    +".mb-eng{width:min(320px,calc(100% - 20px))}.eg-d{font-size:11px;color:#94a3b8}.eg-bar{height:10px;border-radius:99px;background:#1e293b;overflow:hidden;border:1px solid rgba(255,255,255,.2)}.eg-bar i{display:block;height:100%;width:50%;background:#f1f5f9;transition:width .25s}"
    +".eg-ev{margin:0;font-size:13px}.eg-ev b{font-size:18px;color:#fff;margin-right:4px}.eg-ev span{color:#94a3b8;font-size:12px}.eg-lines{margin:0;padding-left:18px;font-size:12.5px;display:flex;flex-direction:column;gap:2px}.eg-lines b{color:#00E5FF;margin-right:4px}"
    +".eg-last{margin:0;font-weight:700;font-size:12.5px}.eg-last:empty{display:none}.eg-last.bad{color:#fca5a5}.eg-last.warn{color:#fbbf24}.eg-last.good{color:#86efac}"
    /* 9.54.0: take review */
    +".lc79-rv{position:absolute;inset:0;z-index:90;background:rgba(5,7,10,.74);display:flex;align-items:center;justify-content:center;padding:12px;font:14px/1.45 Sora,system-ui,sans-serif;color:#e5e7eb}"
    +".rv-card{width:min(460px,100%);max-height:100%;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:16px;background:#0A0B0E;border:1px solid rgba(0,229,255,.45);box-shadow:0 20px 50px rgba(0,0,0,.6)}"
    +".rv-card h3{margin:0;font-size:18px;color:#fff}.rv-meta{margin:0;font-size:12.5px;color:#94a3b8}.rv-meta b{color:#e5e7eb}.rv-card video{width:100%;max-height:34vh;border-radius:10px;background:#000}"
    +".rv-f{display:flex;flex-direction:column;gap:4px;font-size:12px;color:#94a3b8}.rv-f select{min-height:44px;border-radius:10px;background:#14171d;color:#e5e7eb;border:1px solid rgba(255,255,255,.2);padding:0 8px;font:600 14px Sora,system-ui,sans-serif}"
    +".rv-act{display:grid;grid-template-columns:1fr 1fr;gap:8px}.rv-b{min-height:52px;border-radius:12px;font:700 15px Sora,system-ui,sans-serif;cursor:pointer;border:1px solid transparent}.rv-send{background:#00E5FF;color:#04141a}.rv-del{background:rgba(239,68,68,.12);color:#fca5a5;border-color:rgba(239,68,68,.6)}"
    +".rv-b:focus-visible,.rv-later:focus-visible{outline:2px solid #fff;outline-offset:2px}.rv-foot{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}"
    +".rv-later{min-height:40px;background:none;border:0;color:#cbd5e1;text-decoration:underline;cursor:pointer;font:600 12.5px Sora,system-ui,sans-serif;padding:0}.rv-ask{display:inline-flex;gap:6px;align-items:center;font-size:12px;color:#94a3b8}.rv-ask input{width:18px;height:18px}.rv-keys{margin:0;font-size:11px;color:#64748b}"
    +"@media (max-width:420px){.rv-act{grid-template-columns:1fr}}";
  function inject(){
    const sr=studioRoot();if(!sr)return;
    if(!Q("#lc79-srcss",sr)){const st=document.createElement("style");st.id="lc79-srcss";st.textContent=SR_CSS;sr.appendChild(st)}
    const dock=Q("#lc54-dock",sr);
    if(dock&&!Q("#lc79-cta",dock)){
      const b=document.createElement("button");b.type="button";b.id="lc79-cta";b.className="btn sm lc79-dockb";b.title="Show your landing page in the picture while you record the call to action (key L)";b.onclick=()=>ctaToggle();
      dock.appendChild(b);paintCtaBtn();                                 /* 9.54.0: CTA settings moved to the menu bar */
    }
    if(dock&&!Q("#lc79-recto",dock)){
      const sel=document.createElement("select");sel.id="lc79-recto";sel.className="lc79-dsel";sel.setAttribute("aria-label","Save new takes to a project");
      sel.addEventListener("change",()=>{let v=sel.value;if(v==="+"){const n=prompt("Name of the new project","Reel "+(db().list.length+1));if(n===null){paintDock();return}v=newProject(n.trim()||null).id}wr(RK,v);paintDock();const p=projById(v);say(p?"New takes go to “"+p.name+"”.":"New takes are not added to a project.","",2500)});
      const fl=document.createElement("span");fl.className="lc79-flow";
      fl.innerHTML='<button type="button" class="btn sm lc79-dockb" data-f="-" aria-label="Previous step">◀</button><button type="button" class="btn sm lc79-dockb" id="lc79-step" title="Recording flow settings"></button><button type="button" class="btn sm lc79-dockb" data-f="+" aria-label="Next step">▶</button>';
      fl.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.id==="lc79-step")return openFlowSettings();setStep(clamp((FL.step||0)+(b.getAttribute("data-f")==="+"?1:-1),1,4))});
      dock.appendChild(sel);dock.appendChild(fl);paintDock();            /* 9.54.0: Edit Studio moved to the menu bar */
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
    try{menuBar(sr)}catch(e){console.error("lc79 menu",e)}
    if(rd("lc79-eng",0)&&!MB.eng&&!Q("#lc79-eng",sr)){MB.eng=true;try{engineOn(sr)}catch(e){}paintMenu(sr)}
  }
  function liveTick(){
    const sr=studioRoot(),d=sr&&Q("#lc79-live",sr);if(!d)return;
    let on=false,txt="";
    try{const a=api(),R=a.rec,L=a.lc33,S=L.settings();if(R&&(R.state==="recording")&&S.live&&L.live){on=true;const lv=L.live;txt=lv.pend&&lv.pend.t?lv.pend.t:(lv.lines.length?lv.lines[lv.lines.length-1].t:"")}}catch(e){}
    if(!on){d.hidden=true;return}
    d.hidden=false;const t=String(txt||"").split(" ").slice(-12).join(" ");d.innerHTML="<small>Live captions</small>"+esc(t||"Listening…");
  }
  let tickId=0,lastTick=0;
  /* 9.45.0: a chain of timeouts instead of one interval: something in the app clears that interval id during boot, which stopped the Studio wiring */
  function loopTick(){clearTimeout(tickId);tickId=setTimeout(()=>{tickId=0;tick();if(route()==="studio")loopTick()},400)}
  function tick(){lastTick=Date.now();if(route()!=="studio")return;try{inject()}catch(e){}try{const sr=studioRoot();if(sr)sceneTick(sr)}catch(e){}try{liveTick()}catch(e){}}
  function afterRender(r){
    if(r!=="studio"){["lc79-ed","lc79-ai","lc79-ctaset","lc79-flowset"].forEach(id=>closeLayer(id,true));if(ctaOn){ctaOn=false}FL.step=0;FL.card=null;FL.aha=false;liveStop();sceneStop();engineOff(null);if(MB.devRaf){cancelAnimationFrame(MB.devRaf);MB.devRaf=0}MB.eng=false;return}
    if(!tickId||Date.now()-lastTick>1500)loopTick();
    setTimeout(tick,60);
  }
  function init(){
    window.addEventListener("keydown",e=>{
      if(route()!=="studio"||e.ctrlKey||e.metaKey||e.altKey||layerStack.length)return;
      if(!/^[lL1-4]$/.test(e.key))return;
      const t=(e.composedPath&&e.composedPath()[0])||e.target;if(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable))return;
      e.preventDefault();if(/[1-4]/.test(e.key))setStep(+e.key);else ctaToggle();
    });
    window.addEventListener("popstate",()=>{const top=layerStack[layerStack.length-1];if(top&&!(history.state&&history.state.lc79===top))closeLayer(top,true)});
    window.addEventListener("keydown",e=>{if(ED.open&&layerStack[layerStack.length-1]==="lc79-ed")onEdKey(e)},true);   /* capture: a repainted block loses focus to <body>, the keys still work */
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&layerStack.length){const top=layerStack[layerStack.length-1];if(top==="lc79-ed"&&ED.busy)return;closeLayer(top)}});
    window.addEventListener("hashchange",()=>{if(route()!=="studio")["lc79-ed","lc79-ai","lc79-ctaset"].forEach(id=>closeLayer(id,true))});
    window.addEventListener("pointerdown",()=>{if(route()==="studio"&&Date.now()-lastTick>1500)loopTick()},true);   /* watchdog */
  }
  return{camSrc:camSrc,drawUnder:drawUnder,applyScene:applyScene,scene:scS,srcRect:srcRect,sceneRects:sceneRects,boardIn:boardIn,shareScreen:shareScreen,inState:()=>({kind:IN.kind,live:IN.live,snap:!!IN.snap,shot:!!IN.shotV,el:!!IN.el}),writeCaps:writeCaps,needsCaps:needsCaps,live:()=>LV,liveOn:liveOn,liveOff:liveOff,afterTake:afterTake,setStep:setStep,mkProject:mkProject,makeCase:makeCase,gotoCaptions:gotoCaptions,openFromProject:openFromProject,flow:()=>FL,pgnKey:pgnKey,boardChange:boardChange,numbered:numbered,CLOSE:CLOSE,init:init,afterRender:afterRender,drawLive:drawLive,alignLive:alignLive,takeGone:takeGone,openProjects:openProjects,openScript:openScript,openCtaSettings:openCtaSettings,ctaToggle:ctaToggle,
    segments:segments,run:run,envThr:envThr,findQuiet:findQuiet,envDt:envDt,speechRanges:speechRanges,minus:minus,complement:complement,clipsFor:clipsFor,splitClip:splitClip,splitAt:splitAt,trimClip:trimClip,deleteClip:deleteClip,cutSilences:cutSilences,autoSilence:autoSilence,envOf:envOf,capStyle:capStyle,capLine:capLine,drawCaption:drawCaption,nle:nle,undo:undo,drawCallout:drawCallout,makeCallout:makeCallout,motifOf:motifOf,socratic:socratic,trimmedPgn:trimmedPgn,buildPrompt:buildPrompt,pawnCheck:pawnCheck,BCLOSE:BCLOSE,boardSVG:boardSVG,sfx:sfx,
    BUILT:BUILT,db:db,newProject:newProject,tracksOf:tracksOf,coOn:coOn,capItems:capItems,visOf:visOf,applyVis:applyVis,_ai:AI,_ed:ED,grabLanding:grabLanding,state:()=>({ctaOn:ctaOn,snap:!!snap}),version:VERSION};
})(); /*@@end lc79*/
