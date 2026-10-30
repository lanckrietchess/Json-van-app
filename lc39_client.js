/*@@module lc39*/
const LC39=(()=>{
  "use strict";
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.prototype.slice.call((r||document).querySelectorAll(s));
  const E=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ic=(n,c)=>{try{return icon(n,c||"")}catch(e){return""}};
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const api=(a,b)=>{try{return Promise.resolve(Quota.call(a,b||{}))}catch(e){return Promise.resolve({ok:false,status:0,reason:"error"})}};
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const admin=()=>{try{return !!Admin.active}catch(e){return false}};
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const hashNow=()=>{let h="";try{h=decodeURIComponent((location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){h=""}return h.split("/")[0].split("?")[0]};
  const ago=t=>{const d=Math.max(0,(Date.now()-(+t||0))/1e3);if(d<60)return"now";if(d<3600)return Math.floor(d/60)+"m";if(d<86400)return Math.floor(d/3600)+"h";return Math.floor(d/86400)+"d"};
  const WHY={slow_down:"Slow down a little and try again in a minute.",forbidden:"You are not allowed to do that.",bad_input:"Please fill in everything first.",not_found:"That is gone.",revoked:"This account cannot post.",network:"No connection. Try again.",off:"The community is not connected yet.",offline:"You are offline.",bad_url:"That link must start with https://"};
  const why=r=>WHY[r&&r.reason]||"Something went wrong. Try again.";

  /* ================= 1. Walkthrough video: one address, set in admin mode, used everywhere ================= */
  const VK="lc39-video";
  const https=u=>{u=String(u==null?"":u).trim();return/^https:\/\/[^\s"'<>\\]{4,490}$/i.test(u)?u:""};
  const videoUrl=()=>https(rd(VK,""));
  function embed(u){
    let x;try{x=new URL(u)}catch(e){return null}
    const h=x.hostname.replace(/^www\./,"").toLowerCase(),p=x.pathname;let id="",m;
    if(h==="youtu.be")id=p.slice(1);
    else if(h==="youtube.com"||h==="m.youtube.com"||h==="youtube-nocookie.com")id=p==="/watch"?(x.searchParams.get("v")||""):((m=/^\/(?:embed|shorts|live)\/([\w-]{11})/.exec(p))?m[1]:"");
    if(/^[\w-]{11}$/.test(id))return{type:"frame",src:"https://www.youtube-nocookie.com/embed/"+id+"?rel=0&modestbranding=1&playsinline=1&autoplay=1"};
    if(h==="vimeo.com"||h==="player.vimeo.com"){m=/(\d{6,12})/.exec(p);if(m)return{type:"frame",src:"https://player.vimeo.com/video/"+m[1]+"?autoplay=1&playsinline=1"}}
    if(/\.(mp4|webm|m3u8)$/i.test(p))return{type:"file",src:u};
    return null;
  }
  function applyVideo(u){
    u=https(u);wr(VK,u);
    try{if(CONFIG.links)CONFIG.links.walkthrough=u}catch(e){}
    try{if(CONFIG.onboarding&&u)CONFIG.onboarding.videoUrl=u}catch(e){}
    return u;
  }
  function loadVideo(){return api("video_get").then(r=>{if(r&&r.ok===true&&typeof r.url==="string")applyVideo(r.url)}).catch(()=>{})}
  function adminForm(){
    return'<div class="lc39-adm"><b>'+ic("shield-halved")+' Admin: walkthrough video link</b><p class="small muted">Paste a YouTube, Vimeo or .mp4 link. It starts working everywhere as soon as you save: this pop-up, the Quick Tour card and the landing page.</p>'
      +'<input class="input" data-lc39-vurl type="url" inputmode="url" autocomplete="off" placeholder="https://youtu.be/..." value="'+E(videoUrl())+'" aria-label="Walkthrough video link">'
      +'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc39-vsave>Save and use everywhere</button><button type="button" class="btn btn-ghost" data-lc39-vclear>Remove video</button></div><p class="form-msg" data-lc39-vmsg aria-live="polite"></p></div>';
  }
  function openVideo(){
    const u=videoUrl();
    if(!u&&!admin()){say("The walkthrough video is coming soon.");return}
    const em=u?embed(u):null;let body;
    if(!u)body='<p class="muted">There is no walkthrough video yet.</p>';
    else if(!em)body='<p><a class="btn btn-primary" href="'+E(u)+'" target="_blank" rel="noopener noreferrer">Watch the walkthrough</a></p>';
    else if(em.type==="frame")body='<div class="lc39-vid"><iframe src="'+E(em.src)+'" title="App walkthrough" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
    else body='<div class="lc39-vid"><video src="'+E(em.src)+'" controls playsinline autoplay></video></div>';
    try{openSheet({title:"App walkthrough",cls:"lc39-sheet",html:body+(admin()?adminForm():"")})}catch(e){}
  }
  async function saveVideo(box,clear){
    const inp=Q("[data-lc39-vurl]",box),msg=Q("[data-lc39-vmsg]",box);if(!inp)return;
    const url=clear?"":String(inp.value||"").trim();
    if(msg){msg.className="form-msg";msg.textContent="Saving…"}
    const r=await api("video_set",{url:url});
    if(r&&r.ok===true){applyVideo(r.url||"");if(clear)inp.value="";if(msg){msg.className="form-msg is-good";msg.textContent=r.url?"Saved. It is live everywhere now.":"Removed."}}
    else if(msg){msg.className="form-msg is-bad";msg.textContent=r&&r.reason==="forbidden"?"Admin mode is not active on this device.":why(r)}
  }
  function paintAdminCard(route,view){
    if(route!=="home"||!admin()||Q("#lc39-admcard",view))return;
    const c=document.createElement("section");c.id="lc39-admcard";c.className="panel pad lc39-admcard";c.innerHTML=adminForm();
    view.insertBefore(c,view.firstChild);
  }

  /* ================= 2. Routes ================= */
  function routeGuard(){if(/^#learn\/?$/i.test(location.hash||""))location.replace("#system")}

  /* ================= 3. Social needs a connected email (guests are gated), Google or email code ================= */
  const SOC=["friends","refer","community","hall","live","peer"];
  function gateHTML(){
    return'<section class="panel pad lc39-gate"><span class="eyebrow">Social</span><h2>Connect your email to unlock Social</h2>'
      +'<p>Friends, the community, live streams and referrals need an account, so nobody can post under your name and your progress stays safe. It takes about 20 seconds.</p>'
      +'<button type="button" class="btn btn-primary lc39-google" data-lc39-google>Continue with Google</button>'
      +'<p class="small muted lc39-or">or get a 6-digit code by email</p>'
      +'<form data-lc39-mail class="lc39-row"><input class="input" name="email" type="email" required autocomplete="email" placeholder="you@example.com" aria-label="Email address"><button type="submit" class="btn btn-ghost">Send me a code</button></form>'
      +'<form data-lc39-code class="lc39-row" hidden><input class="input" name="code" inputmode="numeric" maxlength="8" autocomplete="one-time-code" placeholder="6-digit code" aria-label="Code from your email"><button type="submit" class="btn btn-primary">Confirm</button></form>'
      +'<p class="form-msg" data-lc39-gmsg aria-live="polite"></p></section>';
  }
  function gate(route,view){
    try{if(sess()||admin())return false}catch(e){return false}
    view.innerHTML=gateHTML();return true;
  }
  function googleStart(){
    try{
      const c=LC26.sync.cfg();if(!c.url){say("Google sign-in is not connected yet.","bad");return}
      location.href=c.url+"/auth/v1/authorize?provider=google&redirect_to="+encodeURIComponent(location.origin+location.pathname);
    }catch(e){say("Google sign-in is not available right now.","bad")}
  }
  async function afterSignIn(email){
    try{await LC26.sync.FETCH_USER_PROFILE(email)}catch(e){}
    try{window.dispatchEvent(new Event("lc39-signed-in"))}catch(e){}
    say("Signed in. Your progress is synced.","good");
    try{rerender()}catch(e){}
    setTimeout(()=>{try{askMail(false)}catch(e){}},1800);
  }
  async function captureOauth(){
    let h="";try{h=sessionStorage.getItem("lc39-oauth")||"";sessionStorage.removeItem("lc39-oauth")}catch(e){}
    if(!h)return;
    const p=new URLSearchParams(h.replace(/^#/,""));
    if(p.get("error_description")){say("Google sign-in did not finish. Try again or use an email code.","bad");return}
    const at=p.get("access_token");if(!at)return;
    try{
      const r=await LC26.sync.http("/auth/v1/user",{method:"GET",headers:{Authorization:"Bearer "+at}});
      const em=r&&r.status===200&&r.data&&r.data.email?String(r.data.email).toLowerCase():"";
      if(!em){say("Google sign-in did not finish. Try again or use an email code.","bad");return}
      wr("lc26-auth",{access_token:at,refresh_token:p.get("refresh_token")||"",exp:Date.now()+(+p.get("expires_in")||3600)*1e3,email:em});
      await afterSignIn(em);
    }catch(e){say("Google sign-in did not finish. Try again or use an email code.","bad")}
  }

  /* ================= 4. "May we email you about events?" (explicit, two buttons, stored by the server) ================= */
  const MK="lc39-mail";
  async function setMail(v,src){
    let r=null;try{r=await LC30.authed("lc36_consent_set",{p_marketing:!!v,p_source:src||"account"})}catch(e){}
    if(r&&r.ok){wr(MK,{v:!!v,at:Date.now()});wr("lc36-consent",Date.now());return true}
    return false;
  }
  function askMail(force){
    try{
      if(!sess()||typeof openSheet!=="function"||Q(".lc39-mailsheet"))return;
      if(!force&&(rd(MK,null)||rd("lc36-consent",0)))return;
      openSheet({title:"Email updates?",cls:"lc39-sheet lc39-mailsheet",noFocus:true,html:'<p>May we use your email to send you invitations to live events, new lessons and Hub news? You can change this at any time in your account.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc39-mail-yes data-close>Yes, keep me posted</button><button type="button" class="btn btn-ghost" data-lc39-mail-no data-close>No thanks</button></div><p class="form-msg" data-lc39-mmsg aria-live="polite"></p>'});
    }catch(e){}
  }
  function paintAccount(view){
    const f=Q("form[data-lc26-mail]",view);
    if(f&&!Q("[data-lc39-google]",view)){const b=document.createElement("div");b.className="lc39-accg";b.innerHTML='<button type="button" class="btn btn-primary lc39-google" data-lc39-google>Continue with Google</button><p class="small muted lc39-or">or use an email code</p>';f.parentNode.insertBefore(b,f)}
    if(sess()&&!Q(".lc39-mailcard",view)){
      const m=rd(MK,null),c=document.createElement("section");c.className="panel pad lc39-mailcard";
      c.innerHTML='<h3>Email updates</h3><p class="small muted">Events, new lessons and Hub news. '+(m?(m.v?"You said yes.":"You said no."):"You have not answered yet.")+'</p><div class="btn-row"><button type="button" class="btn '+(m&&m.v?"btn-primary":"btn-ghost")+'" data-lc39-mail-yes aria-pressed="'+!!(m&&m.v)+'">Yes, email me</button><button type="button" class="btn '+(m&&m.v===false?"btn-primary":"btn-ghost")+'" data-lc39-mail-no aria-pressed="'+!!(m&&m.v===false)+'">No emails</button></div><p class="form-msg" data-lc39-mmsg aria-live="polite"></p>';
      view.insertBefore(c,view.children[1]||null);
    }
  }

  /* ================= 5. Trim your library (imported Chess.com / Lichess games) ================= */
  const libCache={};
  const nameOf=s=>s==="lichess"?"Lichess":"Chess.com";
  async function ccGames(u,n){
    const base="https://api.chess.com/pub/player/"+encodeURIComponent(String(u).toLowerCase());
    const a=await(await fetch(base+"/games/archives")).json();let out=[];
    const urls=(a.archives||[]).slice(-3).reverse();
    for(const url of urls){const g=await(await fetch(url)).json();(g.games||[]).slice().reverse().forEach(x=>out.push(x));if(out.length>=n)break}
    return out.slice(0,n).map(x=>{
      const white=String(x.white&&x.white.username||"").toLowerCase()===String(u).toLowerCase(),me=white?x.white:x.black,op=white?x.black:x.white;
      const draw=["agreed","repetition","stalemate","insufficient","50move","timevsinsufficient"].indexOf(me.result)>=0;
      return{site:"chesscom",pgn:x.pgn||"",color:white?"w":"b",opp:op.username,oppR:op.rating,res:me.result==="win"?"win":draw?"draw":"loss",tc:x.time_class,t:(x.end_time||0)*1e3};
    }).filter(g=>g.pgn);
  }
  async function liGames(u,n){
    const r=await fetch("https://lichess.org/api/games/user/"+encodeURIComponent(u)+"?max="+n+"&pgnInJson=true&clocks=false&opening=false",{headers:{Accept:"application/x-ndjson"}});
    const txt=await r.text();const out=[];
    txt.split("\n").forEach(l=>{l=l.trim();if(!l)return;try{
      const x=JSON.parse(l),w=x.players&&x.players.white,b=x.players&&x.players.black;
      const white=String(w&&w.user&&w.user.name||"").toLowerCase()===String(u).toLowerCase(),op=white?b:w;
      const res=!x.winner?"draw":((x.winner==="white")===white?"win":"loss");
      if(x.pgn)out.push({site:"lichess",pgn:x.pgn,color:white?"w":"b",opp:op&&op.user&&op.user.name||"Anonymous",oppR:op&&op.rating,res:res,tc:x.speed,t:x.createdAt||0});
    }catch(e){}});
    return out;
  }
  async function games(site,user,n){
    const k=site+":"+String(user).toLowerCase()+":"+n,c=libCache[k];
    if(c&&Date.now()-c.t<3e5)return c.g;
    const g=site==="lichess"?await liGames(user,n):await ccGames(user,n);
    libCache[k]={t:Date.now(),g:g};return g;
  }
  const acct=site=>{try{return Elo.acct(site)}catch(e){return null}};
  function libRows(list){
    return list.map((g,i)=>'<button type="button" class="lc39-g is-'+g.res+'" data-lc39-game="'+i+'"><span class="lc39-gr">'+(g.res==="win"?"W":g.res==="draw"?"D":"L")+'</span><span class="lc39-gm"><b>vs '+E(g.opp)+(g.oppR?' ('+E(g.oppR)+')':'')+'</b><small>'+(g.color==="w"?"White":"Black")+' · '+E(g.tc||"")+' · '+new Date(g.t).toLocaleDateString()+'</small></span><span class="lc39-gt">Trim</span></button>').join("");
  }
  function paintLibrary(route,view){
    if(route!=="trim")return;
    const imp=Q("#an-import",view);if(!imp)return;
    const j=rd("lc39-jump",null);
    if(!Q("#lc39-lib",view)){
      const card=document.createElement("section");card.id="lc39-lib";card.className="panel pad lc39-lib";
      imp.parentNode.insertBefore(card,imp);imp.open=false;
      const sm=Q("summary > span",imp);if(sm)sm.innerHTML=ic("file-import")+" Review one game (paste a PGN)";
      const sites=["chesscom","lichess"].filter(s=>acct(s));
      if(!sites.length){card.innerHTML='<h2 class="lc39-hl">Trim your library</h2><p class="muted">Connect Chess.com or Lichess and your games appear here, ready to review with one tap.</p><a class="btn btn-primary" href="#ratings">Connect my account</a>';}
      else{
        let cur=sites[0],list=[];
        const paint=async force=>{
          const a=acct(cur),box=Q("[data-lc39-list]",card);if(!a||!box)return;
          box.innerHTML='<p class="muted small">Loading your latest games…</p>';
          try{if(force)delete libCache[cur+":"+String(a.user).toLowerCase()+":20"];list=await games(cur,a.user,20);box.innerHTML=list.length?libRows(list):'<p class="muted">No games found for '+E(a.user)+' yet.</p>'}
          catch(e){box.innerHTML='<p class="form-msg is-bad">Could not load your games right now. Check your connection and try again.</p>'}
        };
        card.innerHTML='<div class="lc39-libhead"><h2 class="lc39-hl">Trim your library</h2><div class="seg" role="group" aria-label="Game source">'+sites.map(s=>'<button type="button" data-lc39-site="'+s+'" aria-pressed="'+(s===cur)+'">'+nameOf(s)+'</button>').join("")+'</div></div><p class="muted small">Pick a game. Your Hub loads it into the review below.</p><div data-lc39-list></div><div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-lc39-refresh>Refresh</button></div>';
        card.addEventListener("click",e=>{
          const s=e.target.closest("[data-lc39-site]");if(s){cur=s.getAttribute("data-lc39-site");QA("[data-lc39-site]",card).forEach(b=>b.setAttribute("aria-pressed",String(b===s)));paint(false);return}
          if(e.target.closest("[data-lc39-refresh]")){paint(true);return}
          const g=e.target.closest("[data-lc39-game]");if(g){const it=list[+g.getAttribute("data-lc39-game")];if(it)loadIntoTrim(view,it)}
        });
        paint(false);
      }
    }
    if(j&&j.pgn){wr("lc39-jump",null);setTimeout(()=>loadIntoTrim(view,{pgn:j.pgn,color:j.color},j.ply),60)}
  }
  function loadIntoTrim(view,g,steps){
    try{
      const ta=Q("#an-pgn",view),ld=Q('[data-act="load"]',view);if(!ta||!ld)return;
      ta.value=g.pgn;const sd=Q('[data-side="'+(g.color==="b"?"b":"w")+'"]',view);if(sd)sd.click();
      ld.click();
      if(steps>0)setTimeout(()=>{const nx=Q('[data-act="next"]',view);if(nx)for(let i=0;i<steps;i++)nx.click()},700);
      const b=Q("#an-board",view);if(b)setTimeout(()=>b.scrollIntoView({behavior:"smooth",block:"center"}),150);
    }catch(e){}
  }

  /* ================= 6. Instant quick win: the biggest blunder of the latest game ================= */
  const PIECE={p:"♟",n:"♞",b:"♝",r:"♜",q:"♛",k:"♚",P:"♙",N:"♘",B:"♗",R:"♖",Q:"♕",K:"♔"};
  function boardHTML(fen,mark,flip){
    const rows=fen.split(" ")[0].split("/").map(r=>{const o=[];r.split("").forEach(c=>{if(/\d/.test(c))for(let i=0;i<+c;i++)o.push("");else o.push(c)});return o});
    let out="";
    for(let r=0;r<8;r++)for(let f=0;f<8;f++){
      const rr=flip?7-r:r,ff=flip?7-f:f,sq="abcdefgh"[ff]+(8-rr),p=rows[rr][ff];
      out+='<i class="lc39-sq '+((rr+ff)%2?"d":"l")+(mark&&mark.indexOf(sq)>=0?" m":"")+'">'+(p?(PIECE[p]||""):"")+"</i>";
    }
    return'<div class="lc39-bd" role="img" aria-label="Position before your blunder">'+out+"</div>";
  }
  const evTxt=cp=>Math.abs(cp)>=9000?(cp>0?"+M":"-M"):((cp>0?"+":"")+(cp/100).toFixed(1));
  async function findBlunder(g,onProg,alive){
    const ch=new Chess();if(!ch.load_pgn(g.pgn))return null;
    const hist=ch.history({verbose:true}),b=new Chess(),fens=[b.fen()];
    hist.forEach(m=>{b.move(m.san);fens.push(b.fen())});
    const cap=Math.min(hist.length,90),ev=[],best=[];
    for(let i=0;i<=cap;i++){
      if(!alive())return null;
      const r=await Engine.analyse(fens[i],{depth:10,multipv:1});
      const l=r&&r.lines&&r.lines[0];ev[i]=l?Engine.toCp(l):0;best[i]=r&&r.best||null;onProg(i/cap);
    }
    const w=g.color==="w";let top=null;
    for(let i=w?0:1;i<cap;i+=2){
      const before=w?ev[i]:-ev[i],after=w?ev[i+1]:-ev[i+1],loss=before-after;
      if(i>=6&&loss>=150&&before>-500&&(!top||loss>top.loss))top={ply:i,loss:loss,before:before,after:after,played:hist[i],fen:fens[i],bestUci:best[i]};
    }
    if(!top)return{none:true};
    top.bestSan=top.bestUci?(Engine.uciToSan(top.fen,top.bestUci)||top.bestUci):"";
    top.no=Math.floor(top.ply/2)+1;return top;
  }
  async function quickWin(site,user,done){
    let alive=true,sh=null;
    const end=()=>{alive=false;try{done&&done()}catch(e){}};
    try{
      const key="lc39-qw:"+site+":"+String(user).toLowerCase();
      const gs=await games(site==="lichess"||site==="li"?"lichess":"chesscom",user,1);
      const g=gs&&gs[0];if(!g){end();return}
      if(rd(key,"")===g.pgn.length+":"+g.t){end();return}
      sh=openSheet({title:"Your quick win",cls:"lc39-sheet lc39-qw",noFocus:true,html:'<p>Reading your latest game with Stockfish on this device…</p><div class="lc39-prog"><span data-lc39-prog></span></div><p class="small muted" data-lc39-qwmsg></p>',onClose:()=>{alive=false}});
      const el=sh&&sh.el;
      const r=await findBlunder(g,p=>{const s=el&&Q("[data-lc39-prog]",el);if(s)s.style.width=Math.round(p*100)+"%"},()=>alive&&!!(el&&el.isConnected));
      if(!alive||!el||!el.isConnected){end();return}
      wr(key,g.pgn.length+":"+g.t);
      if(!r||r.none){el.innerHTML='<p><b>Clean game.</b> No big blunder in your latest game. Nice work. Your Hub will now look for patterns across more games.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-close>Continue</button></div>';el.addEventListener("click",e=>{if(e.target.closest("[data-close]")){try{sh.close()}catch(x){}end()}});return}
      const mv=r.played;let shown=false;
      el.innerHTML='<p class="lc39-qwh">Your biggest turning point: move '+r.no+'.</p>'+boardHTML(r.fen,[mv.from],g.color==="b")+'<p><b>You played '+E(mv.san)+'</b> and the evaluation fell from '+E(evTxt(r.before))+' to '+E(evTxt(r.after))+'.</p><p class="lc39-hint">Hint: before you moved, what was your opponent threatening, and what changed on the board? That is the M in MSPC.</p><p data-lc39-ans hidden><b>A stronger move was '+E(r.bestSan)+'.</b> Try to see why before you explore it.</p><div class="btn-row"><button type="button" class="btn btn-ghost" data-lc39-show>Show me the better move</button><button type="button" class="btn btn-primary" data-lc39-fix>Explore the fix</button></div>';
      el.addEventListener("click",e=>{
        if(e.target.closest("[data-lc39-show]")&&!shown){shown=true;const a=Q("[data-lc39-ans]",el);if(a)a.hidden=false;e.target.closest("[data-lc39-show]").hidden=true}
        if(e.target.closest("[data-lc39-fix]")){wr("lc39-jump",{pgn:g.pgn,color:g.color,ply:r.ply});try{sh.close()}catch(x){}end();location.hash="#trim"}
      });
    }catch(e){try{sh&&sh.close()}catch(x){}end()}
  }
  function wrapMicro(){
    try{
      if(typeof LC36==="undefined"||!LC36.micro||typeof LC36.micro.offer!=="function"||LC36.micro.__lc39)return;
      const o=LC36.micro.offer;
      LC36.micro.offer=function(site,user){
        const self=this,args=arguments;
        if(!user)return o.apply(self,args);
        try{quickWin(site,user,()=>setTimeout(()=>{try{o.apply(self,args)}catch(e){}},400))}catch(e){return o.apply(self,args)}
      };
      LC36.micro.__lc39=true;
    }catch(e){}
  }

  /* ================= 7. Drip-fed quests: one step at a time ================= */
  const QUESTS=[
    {id:"mspc",label:"MSPC Wizard",route:"think",href:"#think",grp:"3t",do:"Answer one position: Move, Specifics, Priorities, Calculation.",auto:true},
    {id:"system",label:"Your MSPC System",route:"system",href:"#system",grp:"learn",do:"Look through your personal framework and its working points."},
    {id:"trim",label:"Trim a game",route:"trim",href:"#trim",grp:"3t",do:"Pick a game from your library and open the review."},
    {id:"bot",label:"Framework vs the bot",route:"bot",href:"#bot",grp:"learn",do:"Start a game and think before you move."},
    {id:"openings",label:"Opening repertoire",route:"openings",href:"#openings",grp:"3t",do:"Open a course and look at its first lesson."},
    {id:"middlegame",label:"Middlegame plans",route:"middlegame",href:"#middlegame",grp:"3t",do:"Open the first plan."},
    {id:"endgame",label:"Endgame technique",route:"endgame",href:"#endgame",grp:"3t",do:"Open the first endgame lesson."},
    {id:"shuffle",label:"Shuffle Trainer",route:"shuffle",href:"#shuffle",grp:"learn",do:"Play one random line from memory.",auto:true},
    {id:"arena",label:"Arena and Leaderboard",route:"leaderboard",href:"#leaderboard",grp:"ranked",do:"See this week’s tournament and your place."},
    {id:"dex",label:"Chess Decks",route:"dex",href:"#dex",grp:"ranked",do:"Open your deck and see what you can collect."}
  ];
  const doneMap=()=>{try{return(rd("lc-feature-checklist-v1",{})||{}).done||{}}catch(e){return{}}};
  const qst=()=>Object.assign({id:"",s:1,t3:0,skip:{},off:false},rd("lc39-q",{})||{});
  const lvlNow=()=>{try{return LC19.quest.level()}catch(e){return 5}};
  const minLv=r=>{try{return LC19.quest._t.minLevel(r)||1}catch(e){return 1}};
  function nextQuest(){const d=doneMap(),st=qst();let locked=false;
    for(const q of QUESTS){if(d[q.id]||st.skip[q.id])continue;if(minLv(q.route)>lvlNow()){locked=true;continue}return{q:q,locked:false,n:QUESTS.indexOf(q)+1}}
    return{q:null,locked:locked}}
  const onRoute=q=>hashNow()===q.route||(q.route==="think"&&hashNow()==="think");
  function drip(){return!qst().off&&!(CONFIG.lc39&&CONFIG.lc39.drip===false)}
  const NOSTRIP=/^(admin|privacy|upgrades|level0|account)/;
  function paintStrip(route,view){
    const old=Q("#lc39-q",view)||Q("#lc39-q");if(old)old.remove();
    document.documentElement.removeAttribute("data-lc39-grp");
    if(!drip()||NOSTRIP.test(hashNow()))return;
    const nx=nextQuest(),st=qst();
    if(!nx.q){if(nx.locked){const d=document.createElement("div");d.id="lc39-q";d.className="lc39-q";d.innerHTML='<b>Next quest unlocks at your next level.</b><span class="small muted"> Keep training to level up.</span>';view.insertBefore(d,view.firstChild)}return}
    const q=nx.q;
    if(st.id!==q.id){st.id=q.id;st.s=1;st.t3=0;wr("lc39-q",st)}
    if(onRoute(q)&&st.s===1){st.s=2;wr("lc39-q",st)}
    if(!onRoute(q)&&st.s>1){st.s=1;wr("lc39-q",st)}
    const d=document.createElement("div");d.id="lc39-q";d.className="lc39-q";
    const head='<span class="lc39-qn">Quest '+nx.n+' of '+QUESTS.length+'</span> <b>'+E(q.label)+'</b>';
    let body="";
    if(st.s===1){body='<span class="small">Step 1: open it.</span> <a class="btn btn-primary btn-sm" href="'+q.href+'" data-lc39-qgo>Open '+E(q.label)+'</a>';document.documentElement.setAttribute("data-lc39-grp",q.grp)}
    else if(st.s===2){body='<span class="small">Step 2: tap the <b class="lc39-qm">?</b> next to the page title. Coach Lanckriet explains why this matters and how to use it.</span> <button type="button" class="btn btn-ghost btn-sm" data-lc39-qhelp>Show me the ?</button> <button type="button" class="btn btn-ghost btn-sm" data-lc39-qnext>Continue</button>'}
    else{const ready=!q.auto&&Date.now()-(+st.t3||0)>8e3;body='<span class="small">Step 3: '+E(q.do)+'</span> '+(q.auto?'<span class="small muted">You earn XP the moment you finish one.</span>':'<button type="button" class="btn btn-primary btn-sm" data-lc39-qclaim '+(ready?"":"disabled")+'>'+(ready?"I did it: claim XP":"Explore for a few seconds…")+'</button>')}
    d.innerHTML=head+'<div class="lc39-qb">'+body+'</div><button type="button" class="lc39-qskip" data-lc39-qskip aria-label="Skip this quest">Skip</button>';
    view.insertBefore(d,view.firstChild);
  }
  function qClaim(){const nx=nextQuest();if(!nx.q)return;try{FeatureChecklist.mark(nx.q.id)}catch(e){}const st=qst();st.id="";st.s=1;wr("lc39-q",st);try{paintStrip(hashNow(),Q("#view"))}catch(e){}}
  function qSkip(){const nx=nextQuest();if(!nx.q)return;const st=qst();st.skip[nx.q.id]=1;st.id="";wr("lc39-q",st);paintStrip(hashNow(),Q("#view"))}
  function highlightItems(){
    const nx=nextQuest(),st=qst();if(!nx.q||st.s!==1)return;
    QA(".n5-item").forEach(a=>a.classList.toggle("lc39-hl",a.getAttribute("href")===nx.q.href));
  }

  /* ================= 8. Ranked Shuffle holds the rated puzzles; account menu; community ================= */
  function paintShuffle(route,view){
    if(route!=="shuffle"||Q("#lc39-rp",view))return;
    let from="";try{from=App.ui.shuffleFrom}catch(e){}
    if(hashNow()!=="ranked-shuffle"&&from!=="ranked")return;
    const c=document.createElement("section");c.id="lc39-rp";c.className="panel pad lc39-rp";
    c.innerHTML='<b>Rated puzzles live here too.</b> <span class="small muted">Your puzzle rating counts toward the same ranks.</span> <a class="btn btn-primary btn-sm" href="#puzzles">Play rated puzzles</a>';
    view.insertBefore(c,view.firstChild);
  }
  function decoratePM(){
    const p=Q("#pm-panel");if(!p||p.hidden||Q(".lc39-pmav",p))return;
    const head=Q(".lc30-pmhead",p);
    if(head){let nm="";try{nm=(App.profile&&App.profile.name)||""}catch(e){}
      const av=document.createElement("div");av.className="lc39-pmav";av.innerHTML='<span class="lc39-bubble" aria-hidden="true">'+E((nm||"Y").slice(0,1).toUpperCase())+'</span><span class="lc39-pmlv">Level '+lvlNow()+'</span>';
      head.insertBefore(av,head.firstChild)}
    if(admin()&&!Q("[data-lc39-video]",p)){const b=document.createElement("button");b.type="button";b.setAttribute("role","menuitem");b.className="pm-item";b.setAttribute("data-lc39-video","");b.innerHTML=ic("video")+"<span>Walkthrough video link (admin)</span>";p.appendChild(b)}
    const items=QA("a.pm-item",p).filter(a=>!a.hasAttribute("data-lc39-keep"));
    if(items.length>5&&!Q(".lc39-more",p)){
      const d=document.createElement("details");d.className="lc39-more";d.innerHTML="<summary>More</summary>";
      items.slice(4).forEach(a=>d.appendChild(a));
      const last=items[3];last.parentNode.insertBefore(d,last.nextSibling);
    }
  }

  /* --- Skool-style community --- */
  const CATS=[["","All"],["general","General"],["wins","Wins"],["questions","Questions"],["games","Games to review"],["announcements","Announcements"]];
  const CATN={general:"General",wins:"Wins",questions:"Questions",games:"Games to review",announcements:"Announcements"};
  function refCode(){const a=rd("lc-v71-ref","")||rd("lc36-ref","");return String(a||"").toLowerCase()}
  function postCard(p){
    return'<article class="lc39-post'+(p.pinned?" is-pin":"")+'"><div class="lc39-pr"><span class="lc39-av">'+E((p.name||"?").slice(0,1).toUpperCase())+'<i class="lc39-lv" title="Level '+p.level+'">'+p.level+'</i></span><div><b>'+E(p.name)+'</b><small> · '+ago(p.created)+' · '+E(CATN[p.category]||p.category)+(p.pinned?" · 📌 Pinned":"")+'</small></div></div>'
      +'<button type="button" class="lc39-pt" data-open="'+p.id+'"><h3>'+E(p.title)+'</h3><p>'+E(p.preview)+(p.preview.length>=220?"…":"")+'</p></button>'
      +'<div class="lc39-act"><button type="button" class="lc39-like'+(p.liked?" on":"")+'" data-like="'+p.id+'" aria-pressed="'+!!p.liked+'" aria-label="Like">👍 <span>'+p.likes+'</span></button><button type="button" class="lc39-cm" data-open="'+p.id+'" aria-label="Comments">💬 '+p.comments+'</button></div></article>';
  }
  function mountCommunity(view){
    if(gate("community",view))return;
    const S={comm:rd("lc39-comm",""),cat:"",page:0,posts:[],more:false,comms:[],thread:null,busy:false};
    view.innerHTML='<div class="lc39-comm"><header class="lc39-ch"><div><h1>Community</h1><p class="muted small">Ask questions, share wins and post games to review. Earn points when members like your posts.</p></div><div class="lc39-chb"><select class="input" data-c-sw aria-label="Choose community"></select><button type="button" class="btn btn-ghost btn-sm" data-c-board>Leaderboard</button></div></header><div data-c-body><p class="muted">Loading…</p></div></div>';
    const body=()=>Q("[data-c-body]",view),alive=()=>view.isConnected;
    const err=(el,r)=>{const m=Q("[data-c-msg]",el||view);if(m){m.className="form-msg is-bad";m.textContent=why(r)}else say(why(r),"bad")};
    function paintSwitch(){
      const sw=Q("[data-c-sw]",view);if(!sw)return;
      sw.innerHTML=S.comms.map(c=>'<option value="'+E(c.code)+'"'+(c.code===S.comm?" selected":"")+">"+E(c.name)+"</option>").join("");sw.hidden=S.comms.length<2;
    }
    function feedHTML(){
      return'<div class="lc39-pills" role="tablist" aria-label="Categories">'+CATS.map(c=>'<button type="button" role="tab" class="lc39-pill'+(S.cat===c[0]?" on":"")+'" data-c-cat="'+c[0]+'" aria-selected="'+(S.cat===c[0])+'">'+c[1]+"</button>").join("")+'</div>'
        +'<section class="panel pad lc39-comp"><button type="button" class="lc39-compbtn" data-c-open>Write something…</button><div data-c-form hidden><select class="input" data-c-cat-sel aria-label="Category">'+CATS.slice(1).filter(c=>c[0]!=="announcements"||admin()).map(c=>'<option value="'+c[0]+'">'+c[1]+"</option>").join("")+'</select><input class="input" data-c-title maxlength="120" placeholder="Title" aria-label="Title"><textarea class="input" data-c-text rows="5" maxlength="4000" placeholder="What do you want to share or ask?" aria-label="Your post"></textarea><div class="btn-row"><button type="button" class="btn btn-primary" data-c-send>Post</button><button type="button" class="btn btn-ghost" data-c-cancel>Cancel</button></div><p class="form-msg" data-c-msg aria-live="polite"></p></div></section>'
        +'<div data-c-feed>'+(S.posts.length?S.posts.map(postCard).join(""):'<p class="muted lc39-empty">No posts here yet. Be the first to share a win or ask a question.</p>')+'</div>'+(S.more?'<div class="btn-row"><button type="button" class="btn btn-ghost" data-c-more>Show more</button></div>':"");
    }
    async function loadFeed(reset){
      if(S.busy)return;S.busy=true;if(reset){S.page=0;S.posts=[]}
      const r=await api("c39_feed",{community:S.comm||"main",category:S.cat,page:S.page});S.busy=false;if(!alive())return;
      if(r&&r.ok===true){S.posts=S.posts.concat(r.posts||[]);S.more=!!r.more;S.thread=null;body().innerHTML=feedHTML()}
      else body().innerHTML='<p class="form-msg is-bad">'+E(why(r))+'</p>';
    }
    async function openThread(id){
      const r=await api("c39_post_get",{id:id});if(!alive())return;
      if(!(r&&r.ok===true)){say(why(r),"bad");return}
      S.thread=r;const p=r.post;
      body().innerHTML='<button type="button" class="btn btn-ghost btn-sm" data-c-back>← Back to the feed</button><article class="panel pad lc39-post lc39-full"><div class="lc39-pr"><span class="lc39-av">'+E((p.name||"?").slice(0,1).toUpperCase())+'<i class="lc39-lv">'+p.level+'</i></span><div><b>'+E(p.name)+'</b><small> · '+ago(p.created)+' · '+E(CATN[p.category]||p.category)+(p.pinned?" · 📌 Pinned":"")+'</small></div></div><h2>'+E(p.title)+'</h2><p class="lc39-bodytxt">'+E(p.body)+'</p><div class="lc39-act"><button type="button" class="lc39-like'+(p.liked?" on":"")+'" data-like="'+p.id+'" aria-pressed="'+!!p.liked+'">👍 <span>'+p.likes+'</span></button>'+(admin()?'<button type="button" class="btn btn-ghost btn-sm" data-c-pin="'+p.id+'" data-v="'+(p.pinned?0:1)+'">'+(p.pinned?"Unpin":"Pin to top")+'</button>':"")+((p.mine||admin())?'<button type="button" class="btn btn-ghost btn-sm" data-c-del="'+p.id+'" data-k="p">Delete</button>':"")+'</div></article>'
        +'<h3 class="lc39-ct">'+r.comments.length+(r.comments.length===1?" comment":" comments")+'</h3><div class="lc39-cl">'+r.comments.map(c=>'<div class="lc39-cmt"><span class="lc39-av sm">'+E((c.name||"?").slice(0,1).toUpperCase())+'<i class="lc39-lv">'+c.level+'</i></span><div><b>'+E(c.name)+'</b><small> · '+ago(c.created)+'</small><p>'+E(c.body)+'</p><div class="lc39-act"><button type="button" class="lc39-like'+(c.liked?" on":"")+'" data-like="'+c.id+'" data-k="c" aria-pressed="'+!!c.liked+'">👍 <span>'+c.likes+'</span></button>'+((c.mine||admin())?'<button type="button" class="lc39-lnk" data-c-del="'+c.id+'" data-k="c">Delete</button>':"")+'</div></div></div>').join("")+'</div>'
        +'<div class="lc39-cform"><textarea class="input" data-c-ctext rows="3" maxlength="1500" placeholder="Write a comment…" aria-label="Your comment"></textarea><div class="btn-row"><button type="button" class="btn btn-primary" data-c-csend="'+p.id+'">Comment</button></div><p class="form-msg" data-c-msg aria-live="polite"></p></div>';
    }
    async function board(){
      const r=await api("c39_board",{community:S.comm||"main"});
      if(!(r&&r.ok===true)){say(why(r),"bad");return}
      const m=r.me,need=m.next?(m.next-m.pts)+" more points to Level "+(m.level+1):"Top level reached";
      try{openSheet({title:"Leaderboard",cls:"lc39-sheet",html:'<p><b>You: Level '+m.level+'</b> · '+m.pts+' points<br><small class="muted">'+E(need)+'. Members like your posts and comments: each like is 1 point.</small></p><ol class="lc39-bd-list">'+(r.board.length?r.board.map((b,i)=>'<li><span>'+(i+1)+'</span><b>'+E(b.name)+'</b><i>Lv '+b.level+'</i><em>'+b.pts+'</em></li>').join(""):'<li class="muted">No points yet. Post something and earn the first ones.</li>')+'</ol>'})}catch(e){}
    }
    view.addEventListener("change",e=>{const sw=e.target.closest("[data-c-sw]");if(sw){S.comm=sw.value;wr("lc39-comm",S.comm);S.cat="";loadFeed(true)}});
    view.addEventListener("click",async e=>{
      const t=e.target.closest("button");if(!t||!view.contains(t))return;
      if(t.hasAttribute("data-c-cat")){S.cat=t.getAttribute("data-c-cat");loadFeed(true);return}
      if(t.hasAttribute("data-c-open")){t.hidden=true;Q("[data-c-form]",view).hidden=false;const ti=Q("[data-c-title]",view);if(ti)ti.focus();return}
      if(t.hasAttribute("data-c-cancel")){Q("[data-c-form]",view).hidden=true;Q("[data-c-open]",view).hidden=false;return}
      if(t.hasAttribute("data-c-more")){S.page++;loadFeed(false);return}
      if(t.hasAttribute("data-c-board")){board();return}
      if(t.hasAttribute("data-c-back")){loadFeed(true);return}
      if(t.hasAttribute("data-c-send")){
        const f=Q("[data-c-form]",view),title=Q("[data-c-title]",f).value.trim(),text=Q("[data-c-text]",f).value.trim(),cat=Q("[data-c-cat-sel]",f).value;
        if(!title||!text){err(f,{reason:"bad_input"});return}
        t.disabled=true;const r=await api("c39_post",{community:S.comm||"main",category:cat,title:title,body:text});t.disabled=false;
        if(r&&r.ok===true){say("Posted.","good");S.cat="";loadFeed(true)}else err(f,r);return}
      if(t.hasAttribute("data-c-csend")){
        const box=t.closest(".lc39-cform"),txt=Q("[data-c-ctext]",box).value.trim();if(!txt){err(box,{reason:"bad_input"});return}
        t.disabled=true;const r=await api("c39_comment",{post:+t.getAttribute("data-c-csend"),body:txt});t.disabled=false;
        if(r&&r.ok===true)openThread(+t.getAttribute("data-c-csend"));else err(box,r);return}
      if(t.hasAttribute("data-like")){
        const id=+t.getAttribute("data-like"),k=t.getAttribute("data-k")==="c"?"c":"p";
        const r=await api("c39_like",{kind:k,ref:id});
        if(r&&r.ok===true){t.classList.toggle("on",!!r.liked);t.setAttribute("aria-pressed",String(!!r.liked));const sp=Q("span",t);if(sp)sp.textContent=r.likes}else say(why(r),"bad");return}
      if(t.hasAttribute("data-open")){openThread(+t.getAttribute("data-open"));return}
      if(t.hasAttribute("data-c-pin")){const r=await api("c39_pin",{id:+t.getAttribute("data-c-pin"),pinned:t.getAttribute("data-v")==="1"});if(r&&r.ok===true)openThread(+t.getAttribute("data-c-pin"));else say(why(r),"bad");return}
      if(t.hasAttribute("data-c-del")){
        if(!confirm("Delete this?"))return;
        const k=t.getAttribute("data-k"),id=+t.getAttribute("data-c-del"),r=await api("c39_delete",{kind:k,id:id});
        if(r&&r.ok===true){if(k==="p")loadFeed(true);else openThread(S.thread.post.id)}else say(why(r),"bad")}
    });
    (async()=>{
      const r=await api("c39_list");if(!alive())return;
      if(r&&r.ok===true){
        S.comms=r.communities||[];
        const ref=refCode(),mine=S.comms.filter(c=>c.code!=="main"&&ref&&(String(c.code).toLowerCase()===ref||String(c.partner||"").toLowerCase()===ref))[0];
        if(!S.comm||!S.comms.some(c=>c.code===S.comm))S.comm=mine?mine.code:"main";
        paintSwitch();loadFeed(true);
      }else body().innerHTML='<p class="form-msg is-bad">'+E(why(r))+'</p>';
    })();
    return()=>{};
  }

  /* ================= wiring ================= */
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    const vs=t.closest("[data-lc39-vsave]");if(vs){e.preventDefault();saveVideo(vs.closest(".lc39-adm"),false);return}
    const vc=t.closest("[data-lc39-vclear]");if(vc){e.preventDefault();saveVideo(vc.closest(".lc39-adm"),true);return}
    if(t.closest("[data-lc39-google]")){e.preventDefault();googleStart();return}
    const my=t.closest("[data-lc39-mail-yes]"),mn=t.closest("[data-lc39-mail-no]");
    if(my||mn){e.preventDefault();const host=(my||mn).closest(".lc39-mailsheet,.lc39-mailcard"),inSheet=!!(host&&host.classList.contains("lc39-mailsheet"));setMail(!!my,"account").then(ok=>{const m=host&&Q("[data-lc39-mmsg]",host);if(ok){say(my?"Thanks. We will keep you posted.":"Okay. No emails.","good");if(!inSheet){try{rerender()}catch(x){}}}else if(m){m.className="form-msg is-bad";m.textContent="Could not save that. Try again later."}else say("Could not save that. Try again later.","bad")});return}
    const vid=t.closest("[data-lc39-video],a.bm-walk,a.onb-acct");
    const u=videoUrl(),a=t.closest("a[href]");
    if(vid||(a&&u&&a.getAttribute("href")===u)){e.preventDefault();e.stopPropagation();try{ProfileMenu.close()}catch(x){}openVideo();return}
    if(t.closest("[data-lc39-qhelp]")){const q=Q(".lc29-q");if(q){q.scrollIntoView({behavior:"smooth",block:"center"});q.classList.add("lc39-pulse")}return}
    if(t.closest("[data-lc39-qnext]")){const nx=nextQuest(),st=qst();if(nx.q){st.id=nx.q.id;st.s=3;st.t3=Date.now();wr("lc39-q",st);paintStrip(hashNow(),Q("#view"));setTimeout(()=>{try{paintStrip(hashNow(),Q("#view"))}catch(x){}},8200)}return}
    if(t.closest("[data-lc39-qclaim]")){qClaim();return}
    if(t.closest("[data-lc39-qskip]")){qSkip();return}
    const lq=t.closest("[data-lc29-open]");
    if(lq){const nx=nextQuest(),st=qst();if(nx.q&&st.id===nx.q.id&&onRoute(nx.q)&&st.s<3){st.s=3;st.t3=Date.now();wr("lc39-q",st);setTimeout(()=>{try{paintStrip(hashNow(),Q("#view"));setTimeout(()=>paintStrip(hashNow(),Q("#view")),8200)}catch(x){}},500)}}
    if(t.closest("[data-n5]"))setTimeout(highlightItems,30);
    if(t.closest("#profile-chip"))setTimeout(decoratePM,60);
  }
  async function onSubmit(e){
    const fm=e.target.closest&&e.target.closest("[data-lc39-mail]"),fc=e.target.closest&&e.target.closest("[data-lc39-code]");
    if(!fm&&!fc)return;e.preventDefault();e.stopPropagation();
    const box=(fm||fc).closest(".lc39-gate"),msg=Q("[data-lc39-gmsg]",box);const say2=t=>{if(msg)msg.textContent=t||""};
    try{
      if(fm){const em=String(fm.elements.email.value||"").trim().toLowerCase();say2("Sending…");const r=await LC26.sync.otp(em);say2(r.ok?"Check your email for the 6-digit code.":r.error);if(r.ok){box.dataset.mail=em;const c=Q("[data-lc39-code]",box);if(c){c.hidden=false;c.elements.code.focus()}}}
      else{say2("Signing in…");const em=box.dataset.mail||"",r=await LC26.sync.verify(em,String(fc.elements.code.value||"").trim());if(r.ok){say2("");afterSignIn(em)}else say2(r.error)}
    }catch(x){say2("Something went wrong. Try again.")}
  }
  function wrapMount(){
    const make=(r,o,match)=>{if(typeof o!=="function"||o.__lc39)return o;const f=function(v){try{if(match()&&gate(r,v))return}catch(e){}return o.apply(this,arguments)};f.__lc39=true;return f};
    const w=(r,match)=>{
      try{
        if(typeof MOUNT[r]==="function"){MOUNT[r]=make(r,MOUNT[r],match);return}
        let val=MOUNT[r];                                           /* assigned later by another module: wrap it the moment it arrives */
        Object.defineProperty(MOUNT,r,{configurable:true,enumerable:true,get(){return val},set(v){val=make(r,v,match)}});
      }catch(e){}
    };
    ["refer","hall","live","peer"].forEach(r=>w(r,()=>hashNow()===r));
    w("account",()=>hashNow()==="friends");
    try{MOUNT.community=function(v){return mountCommunity(v)}}catch(e){}
  }
  function css(){
    if(Q("#lc39-css"))return;const s=document.createElement("style");s.id="lc39-css";
    s.textContent='.lc39-vid{position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden}.lc39-vid iframe,.lc39-vid video{position:absolute;inset:0;width:100%;height:100%;border:0}'
    +'.lc39-adm{margin-top:14px;padding:12px;border:1px dashed rgba(56,189,248,.5);border-radius:12px;display:grid;gap:8px}.lc39-admcard{margin-bottom:14px}'
    +'.lc39-gate{max-width:520px;margin:24px auto;display:grid;gap:12px}.lc39-row{display:flex;gap:8px;flex-wrap:wrap}.lc39-row .input{flex:1;min-width:180px}.lc39-or{text-align:center;margin:0}'
    +'.lc39-google,.lc39-gate .btn,.lc39-comm .btn,.lc39-q .btn{min-height:44px}.lc39-accg{display:grid;gap:8px;margin-bottom:12px}'
    +'.lc39-hl{color:#38bdf8}.lc39-lib{margin-bottom:14px;border:1px solid rgba(56,189,248,.45)}.lc39-libhead{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}'
    +'.lc39-g{display:flex;align-items:center;gap:12px;width:100%;min-height:52px;padding:8px 12px;margin:6px 0;border-radius:12px;border:1px solid rgba(148,163,184,.25);background:#0f172a;color:#e2e8f0;font:inherit;text-align:left;cursor:pointer}.lc39-g:hover{border-color:#38bdf8}'
    +'.lc39-gr{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:800;background:#334155}.lc39-g.is-win .lc39-gr{background:#16a34a}.lc39-g.is-loss .lc39-gr{background:#dc2626}.lc39-gm{display:grid;flex:1}.lc39-gm small{color:#94a3b8}.lc39-gt{color:#38bdf8;font-weight:700}'
    +'.lc39-bd{display:grid;grid-template-columns:repeat(8,1fr);width:min(100%,320px);margin:10px auto;border-radius:8px;overflow:hidden}.lc39-sq{aspect-ratio:1;display:grid;place-items:center;font-style:normal;font-size:clamp(18px,6vw,28px);line-height:1}.lc39-sq.l{background:#e2e8f0;color:#0f172a}.lc39-sq.d{background:#64748b;color:#0f172a}.lc39-sq.m{box-shadow:inset 0 0 0 3px #fbbf24}'
    +'.lc39-prog{height:8px;border-radius:4px;background:#1e293b;overflow:hidden}.lc39-prog span{display:block;height:100%;width:0;background:#38bdf8;transition:width .2s}.lc39-hint{color:#fbbf24}'
    +'.lc39-q{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;margin:0 0 12px;border-radius:12px;background:#1e293b;border:1px solid rgba(56,189,248,.5)}.lc39-qn{font-size:12px;color:#38bdf8;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.lc39-qb{display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:1}.lc39-qm{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#38bdf8;color:#06202e}.lc39-qskip{background:none;border:0;color:#94a3b8;min-height:44px;padding:0 8px;cursor:pointer;font:inherit}'
    +'.lc29-q.lc39-pulse,.lc29-q.is-new{animation:lc39p 1.4s ease-in-out infinite}.n5-item.lc39-hl{background:rgba(56,189,248,.18);box-shadow:inset 0 0 0 2px #38bdf8;animation:lc39p 1.4s ease-in-out infinite}'
    +'@keyframes lc39p{0%,100%{box-shadow:0 0 0 0 rgba(56,189,248,.55)}50%{box-shadow:0 0 0 7px rgba(56,189,248,0)}}'
    +['3t','ranked','learn','social'].map(g=>'html[data-lc39-grp="'+g+'"] .n5-tab[data-n5="'+g+'"]').join(",")+'{box-shadow:0 0 0 2px #38bdf8;animation:lc39p 1.4s ease-in-out infinite}'
    +'.n5-item.is-featured{background:rgba(56,189,248,.14)!important;box-shadow:inset 0 0 0 1px rgba(56,189,248,.6)}.n5-item.is-featured b{color:#38bdf8}'
    +'#fc-home,.pm-fc{display:none!important}.lc39-rp{margin-bottom:12px}'
    +'.lc39-pmav{display:flex;align-items:center;gap:10px;margin-bottom:8px}.lc39-bubble{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#38bdf8;color:#06202e;font-weight:900;font-size:20px}.lc39-pmlv{font-weight:700;color:#e2e8f0}.lc39-more summary{min-height:44px;display:flex;align-items:center;padding:0 12px;cursor:pointer;color:#94a3b8}'
    +'.lc39-comm{max-width:760px;margin:0 auto}.lc39-ch{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;margin-bottom:12px}.lc39-chb{display:flex;gap:8px;align-items:center;flex-wrap:wrap}'
    +'.lc39-pills{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px}.lc39-pill{min-height:44px;padding:0 14px;border-radius:999px;border:1px solid rgba(148,163,184,.3);background:#0f172a;color:#cbd5e1;font:inherit;white-space:nowrap;cursor:pointer}.lc39-pill.on{background:#38bdf8;color:#06202e;border-color:#38bdf8;font-weight:800}'
    +'.lc39-comp{margin-bottom:12px;display:grid;gap:8px}.lc39-compbtn{min-height:48px;text-align:left;padding:0 14px;border-radius:12px;border:1px solid rgba(148,163,184,.3);background:#0f172a;color:#94a3b8;font:inherit;cursor:pointer}.lc39-comp [data-c-form]{display:grid;gap:8px}'
    +'.lc39-post{background:#1e293b;border-radius:14px;padding:14px;margin-bottom:10px;border:1px solid rgba(148,163,184,.15)}.lc39-post.is-pin{border-color:#fbbf24}.lc39-pr{display:flex;gap:10px;align-items:center}.lc39-pr small{color:#94a3b8}'
    +'.lc39-av{position:relative;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#334155;color:#e2e8f0;font-weight:800;flex:none}.lc39-av.sm{width:32px;height:32px;font-size:13px}.lc39-lv{position:absolute;right:-4px;bottom:-4px;min-width:18px;height:18px;border-radius:9px;background:#fbbf24;color:#1e293b;font:800 11px/18px sans-serif;text-align:center;font-style:normal;padding:0 3px}'
    +'.lc39-pt{display:block;width:100%;text-align:left;background:none;border:0;color:inherit;font:inherit;padding:8px 0;cursor:pointer}.lc39-pt h3{margin:0 0 4px}.lc39-pt p{margin:0;color:#cbd5e1}.lc39-bodytxt{white-space:pre-wrap}'
    +'.lc39-act{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lc39-like,.lc39-cm{min-height:44px;min-width:44px;padding:0 14px;border-radius:999px;border:1px solid rgba(148,163,184,.3);background:#0f172a;color:#e2e8f0;font:inherit;cursor:pointer}.lc39-like.on{background:rgba(56,189,248,.2);border-color:#38bdf8;color:#38bdf8}.lc39-lnk{background:none;border:0;color:#94a3b8;min-height:44px;cursor:pointer;font:inherit}'
    +'.lc39-cmt{display:flex;gap:10px;margin:10px 0}.lc39-cmt p{margin:2px 0;white-space:pre-wrap}.lc39-cform{display:grid;gap:8px;margin-top:12px}.lc39-empty{text-align:center;padding:24px 0}'
    +'.lc39-bd-list{list-style:none;padding:0;margin:8px 0;display:grid;gap:6px}.lc39-bd-list li{display:flex;gap:10px;align-items:center;min-height:44px}.lc39-bd-list li span{width:24px;color:#94a3b8}.lc39-bd-list li b{flex:1}.lc39-bd-list li i{color:#fbbf24;font-style:normal}.lc39-bd-list li em{font-style:normal;color:#38bdf8;font-weight:800}';
    document.head.appendChild(s);
  }
  let obs=null;
  function afterRender(route){
    try{
      const view=Q("#view");if(!view)return;
      setTimeout(()=>{try{paintStrip(route,view)}catch(e){console.error(e)}},60);
      /* some pages build their content a moment after render: paint now, then again whenever the page changes (every paint is idempotent) */
      const run=()=>{try{if(hashNow()===""&&route!=="home")return;const v=Q("#view");if(!v)return;if(!Q("#lc39-q",v))paintStrip(route,v);paintAdminCard(route,v);paintLibrary(route,v);paintShuffle(route,v);if(route==="account")paintAccount(v)}catch(e){console.error(e)}};
      if(obs){try{obs.disconnect()}catch(e){}obs=null}
      let busy=false;
      if(typeof MutationObserver==="function"){
        const mine=obs=new MutationObserver(()=>{if(busy)return;busy=true;setTimeout(()=>{busy=false;run()},50)});
        mine.observe(document.body,{childList:true,subtree:true});
        setTimeout(()=>{try{mine.disconnect()}catch(e){}if(obs===mine)obs=null},20000);
      }
      setTimeout(run,60);
    }catch(e){}
  }
  function init(){
    try{
      css();routeGuard();window.addEventListener("hashchange",routeGuard);
      document.addEventListener("click",onClick,true);document.addEventListener("submit",onSubmit,true);
      wrapMount();wrapMicro();loadVideo();captureOauth();
      setInterval(()=>{try{if(document.visibilityState!=="visible"||!drip())return;const v=Q("#view"),d=doneMap(),st=qst();const nx=nextQuest();const on=Q("#lc39-q");if(v&&(!on&&nx.q&&!NOSTRIP.test(hashNow())||on&&nx.q&&st.id&&st.id!==nx.q.id))paintStrip(hashNow(),v)}catch(e){}},2500);
    }catch(e){console.error("lc39",e)}
  }
  return{init:init,afterRender:afterRender,gate:gate,drip:drip,openVideo:openVideo,mountCommunity:mountCommunity,_t:{paintLibrary:paintLibrary,embed:embed,https:https,nextQuest:nextQuest,findBlunder:findBlunder,quickWin:quickWin,boardHTML:boardHTML,libRows:libRows,videoUrl:videoUrl,applyVideo:applyVideo,saveVideo:saveVideo,paintStrip:paintStrip}};
})();
/*@@end lc39*/
