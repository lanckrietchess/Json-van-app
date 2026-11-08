/*@@module lc61*/ const LC61=(()=>{
  "use strict";
  /* LC61 (build 9.33.0): the cognitive gym core.
     1. ONE level helper, getUserLevel(): the topbar bar, the profile card and the XP tiles all read the XP level through it.
        (9.32.0 showed "Lv 6" in the topbar, which is the XP level, and "Level 5" in the profile card, which was the QUEST level.)
     2. Session hydration: a signed-in member's Chess.com / Lichess names are read from the account (user_metadata.lc, and the profiles table when it exists)
        and written into App.profile, Elo and the device, so the "Connect my account" banners never come back on a new device or after a reset.
     3. LCWDL: a light win / draw / loss model. Move accuracy is measured in expected points (win + half a draw) and the game accuracy blends a weighted mean
        with a harmonic mean, so a few big mistakes in a won game weigh through. It is a calibrated model of mine, not Chess.com's private formula.
     4. Alarm Signals: positional triggers read from the board (high tension, closed centre, enemy outpost, loose piece, exposed king, passed pawn,
        opposite castling). Every error overview ends with a) the thinking error, b) the Alarm Signal on the board, c) the Working Point that activates it.
        Members can type what should have warned them; it goes to the owner's queue (SQL lc61_*).
     5. Most Recent Star: the course suggestion that was starred last comes first in the urgency order and behind "Train now".
     6. "Make My Training Schedule": Coach Lanckriet with a 3-step plan and a "Go to this course" button; the MSPC page opens with ELO, Alarm Signals and Working Points. */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const authed=(n,a)=>{try{return LC30.authed(n,a||{})}catch(e){return Promise.resolve({ok:false,error:"server"})}};
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0];
  const NAME_RE=/^[A-Za-z0-9_-]{2,30}$/;
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};

  /* ---------- 1. one level for everybody ---------- */
  function getUserLevel(){
    let L=null;try{L=V6.level()}catch(e){}
    if(!L||!Number.isFinite(+L.level)){
      let xp=0;try{xp=+V6.state().total||0}catch(e){}
      const lv=1+Math.floor(Math.sqrt(Math.max(0,xp)/60)),lo=60*(lv-1)*(lv-1),hi=60*lv*lv;
      L={level:lv,xp:xp,lo:lo,hi:hi,pct:Math.max(0,Math.min(1,(xp-lo)/(hi-lo))),toNext:Math.max(0,Math.ceil(hi-xp))};
    }
    return{level:+L.level,xp:+L.xp||0,pct:+L.pct||0,toNext:+L.toNext||0,label:"Lv "+L.level,long:"Level "+L.level};
  }

  /* ---------- 2. session hydration ---------- */
  const NK="lc61-names",HK="lc61-hyd";
  function localNames(){
    const o=Object.assign({cc:"",li:"",gone:{}},rd(NK,{}));
    try{const p=App.profile||{};if(NAME_RE.test(p.chess_com_username||""))o.cc=o.cc||String(p.chess_com_username);if(NAME_RE.test(p.lichess_username||""))o.li=o.li||String(p.lichess_username)}catch(e){}
    try{const a=Elo.acct("chesscom"),b=Elo.acct("lichess");if(a&&a.user&&NAME_RE.test(a.user))o.cc=String(a.user);if(b&&b.user&&NAME_RE.test(b.user))o.li=String(b.user)}catch(e){}
    return o;
  }
  /* write the names into App.profile, Elo (so every "is it connected" test passes) and the device. Never removes anything. */
  function applyNames(n){
    let changed=false;
    const gone=(rd(NK,{})||{}).gone||{};
    const put=(site,field,val)=>{
      if(!val||!NAME_RE.test(val)||gone[site])return;
      try{if(App.profile&&!App.profile[field]){App.profile[field]=val;changed=true}}catch(e){}
      try{if(!Elo.acct(site)){Elo.start(site,val);changed=true}}catch(e){}
    };
    put("chesscom","chess_com_username",n.cc);put("lichess","lichess_username",n.li);
    if(changed)try{App.save()}catch(e){}
    const cur=rd(NK,{})||{};
    if(n.cc!==cur.cc||n.li!==cur.li)wr(NK,Object.assign({},cur,{cc:n.cc||cur.cc||"",li:n.li||cur.li||"",gone:gone}));
    return changed;
  }
  let hydrating=false;
  async function hydrate(force){
    if(hydrating)return false;
    const s=sess();
    const loc=localNames();
    let changed=applyNames(loc);                                        /* the device itself already knows names: make Elo agree */
    if(!s||!s.access_token)return changed;
    const h=rd(HK,{});
    if(!force&&h.uid===(s.email||"")&&Date.now()-(+h.at||0)<10*60*1000)return changed;
    hydrating=true;
    try{
      const tok=await LC26.sync.token();if(!tok)return changed;
      const hd={Authorization:"Bearer "+tok};
      const u=await LC26.sync.http("/auth/v1/user",{method:"GET",headers:hd});
      const uid=u&&u.data&&u.data.id||"";
      const m=u&&u.status===200&&u.data&&u.data.user_metadata&&u.data.user_metadata.lc||{};
      let cc=NAME_RE.test(m.cc||"")?m.cc:"",li=NAME_RE.test(m.li||"")?m.li:"",prof=null;
      if(uid){
        const r=await LC26.sync.http("/rest/v1/profiles?select=chess_username,lichess_username&id=eq."+encodeURIComponent(uid),{method:"GET",headers:hd});
        if(r&&r.status===200&&Array.isArray(r.data)&&r.data[0]){
          prof=r.data[0];
          if(NAME_RE.test(prof.chess_username||""))cc=cc||prof.chess_username;
          if(NAME_RE.test(prof.lichess_username||""))li=li||prof.lichess_username;
        }
      }
      const merged={cc:loc.cc||cc,li:loc.li||li};
      if(applyNames(merged))changed=true;
      /* the account learns what the device knows (best effort, never throws) */
      if(uid&&((merged.cc&&merged.cc!==(prof&&prof.chess_username))||(merged.li&&merged.li!==(prof&&prof.lichess_username)))){
        try{await LC26.sync.http("/rest/v1/profiles?on_conflict=id",{method:"POST",headers:Object.assign({Prefer:"resolution=merge-duplicates,return=minimal"},hd),body:JSON.stringify({id:uid,chess_username:merged.cc||null,lichess_username:merged.li||null})})}catch(e){}
      }
      wr(HK,{uid:s.email||"",at:Date.now()});
    }catch(e){console.error("lc61 hydrate",e)}finally{hydrating=false}
    if(changed)softRefresh();
    return changed;
  }
  function softRefresh(){
    try{if(Q(".sheet-wrap")||Q(".trainer")||Q(".an-grid"))return;if(typeof rerender==="function")rerender()}catch(e){}
  }
  /* the member removed a link on purpose: do not put it back */
  function guardForget(){
    try{
      if(Elo.__lc61)return;Elo.__lc61=true;
      const f=Elo.forget;
      Elo.forget=function(site){const r=f.apply(this,arguments);try{const o=rd(NK,{})||{};o.gone=Object.assign({},o.gone);o.gone[site]=Date.now();if(site==="chesscom")o.cc="";if(site==="lichess")o.li="";wr(NK,o)}catch(e){}return r};
      const st=Elo.start;
      Elo.start=function(site,user){const r=st.apply(this,arguments);try{const o=rd(NK,{})||{};if(o.gone&&o.gone[site]){o.gone=Object.assign({},o.gone);delete o.gone[site];wr(NK,o)}if(r&&user){o[site==="lichess"?"li":"cc"]=String(user);wr(NK,o)}}catch(e){}return r};
    }catch(e){}
  }

  /* ---------- 3. LCWDL: win / draw / loss model and accuracy ---------- */
  const WCFG={
    a:92,            /* centipawns where a win is as likely as not, at the start of a game */
    aEnd:60,         /* ... and in a long game: decisions come faster */
    b:62,            /* spread of the curve */
    conv:{lo:1000,hi:2200,minF:.72},   /* below 2200 a clearly better position is converted less often: scale cp down by up to 28% */
    k:.0455,         /* steepness of the accuracy curve */
    harmonic:.5      /* share of the harmonic mean in the game accuracy */
  };
  const clampN=(x,a,b)=>Math.max(a,Math.min(b,x));
  function wdl(cp,ply,rating){
    let x=clampN(+cp||0,-1500,1500);
    const r=+rating>0?+rating:1500,c=WCFG.conv;
    const f=r>=c.hi?1:c.minF+(1-c.minF)*clampN((r-c.lo)/(c.hi-c.lo),0,1);
    x*=f;
    const t=clampN((+ply||40)/160,0,1),a=WCFG.a+(WCFG.aEnd-WCFG.a)*t,b=WCFG.b;
    const w=1/(1+Math.exp((a-x)/b)),l=1/(1+Math.exp((a+x)/b)),d=Math.max(0,1-w-l);
    return{w:w,d:d,l:l,ep:w+d/2};
  }
  /* expected-points loss (0..100) of one move, from the mover's point of view in centipawns */
  function epLoss(beforePov,afterPov,ply,rating){
    return Math.max(0,100*(wdl(beforePov,ply,rating).ep-wdl(afterPov,ply,rating).ep));
  }
  function moveAcc(beforePov,afterPov,ply,rating){
    const loss=epLoss(beforePov,afterPov,ply,rating);
    return clampN(103.1668*Math.exp(-WCFG.k*loss)-3.1669,0,100);
  }
  /* game accuracy: weighted mean blended with the harmonic mean (a few bad moves pull it down) */
  function gameAcc(accs,weights){
    const n=accs.length;if(!n)return 0;
    let s=0,w=0,h=0;
    for(let i=0;i<n;i++){const wt=weights&&weights[i]>0?weights[i]:1,a=Math.max(1,accs[i]);s+=a*wt;w+=wt;h+=wt/a}
    const mean=s/w,harm=w/h,k=WCFG.harmonic;
    return Math.round(((1-k)*mean+k*harm)*10)/10;
  }
  function playerRating(){try{const e=Math.round(+(App.profile&&App.profile.elo));return e>=400&&e<=2800?e:1500}catch(e){return 1500}}
  /* what the Trim review calls (see the patch of moveAcc): pov values in centipawns */
  function reviewMoveAcc(loss,b,a,ply){
    if(!Number.isFinite(+b)||!Number.isFinite(+a))return clampN(103.1668*Math.exp(-.04354*loss)-3.1669,0,100);
    return moveAcc(b,a,ply,playerRating());
  }

  /* ---------- 4. Alarm Signals ---------- */
  const VAL={p:1,n:3,b:3,r:5,q:9,k:100};
  const ALARM={
    tension:{label:"High tension",say:"Many pieces and pawns attack each other. One capture, pin or fork can change everything.",ask:"Which capture or pawn break is available to both sides right now?",letter:"M"},
    closed:{label:"Closed centre",say:"The centre pawns are locked, so the game is decided on the wings by manoeuvres and pawn breaks.",ask:"Which pawn break opens the position for me, and which for them?",letter:"S"},
    outpost:{label:"Enemy outpost",say:"An enemy knight or bishop sits on a square that none of your pawns can ever attack.",ask:"How can I trade it or take away its support?",letter:"S"},
    loose:{label:"Loose piece",say:"A piece has no defender or can be won by a smaller piece.",ask:"Which of my pieces is undefended, and which of theirs?",letter:"S"},
    king:{label:"Exposed king",say:"There is no pawn cover in front of a king while heavy pieces are still on the board.",ask:"What check or open line can they use against my king?",letter:"P"},
    passed:{label:"Advanced passed pawn",say:"A pawn with no opposing pawn in front or beside it is close to promotion.",ask:"Can I stop it with a piece in front of it, or is it faster to attack?",letter:"P"},
    opposite:{label:"Opposite-side castling",say:"The kings sit on opposite wings: both sides attack, and every tempo counts.",ask:"Who is faster: my pawn storm or theirs?",letter:"C"}
  };
  const FILES="abcdefgh";
  function parse(fen){
    const rows=String(fen||"").split(" ")[0].split("/");if(rows.length!==8)return null;
    const b=[];
    for(let r=0;r<8;r++){const row=[];for(const ch of rows[r]){if(/\d/.test(ch)){for(let k=0;k<+ch;k++)row.push(null)}else row.push({t:ch.toLowerCase(),c:ch===ch.toLowerCase()?"b":"w"})}if(row.length!==8)return null;b.push(row)}
    return b;                      /* b[0] = rank 8 ... b[7] = rank 1; b[r][f] */
  }
  /* squares (r,f) a piece attacks */
  function targets(b,r,f){
    const p=b[r][f],out=[];if(!p)return out;
    const on=(rr,ff)=>rr>=0&&rr<8&&ff>=0&&ff<8;
    const step=(dr,df,slide)=>{let rr=r+dr,ff=f+df;while(on(rr,ff)){out.push([rr,ff]);if(b[rr][ff]||!slide)break;rr+=dr;ff+=df}};
    if(p.t==="p"){const d=p.c==="w"?-1:1;[-1,1].forEach(df=>{if(on(r+d,f+df))out.push([r+d,f+df])})}
    else if(p.t==="n")[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]].forEach(m=>{if(on(r+m[0],f+m[1]))out.push([r+m[0],f+m[1]])});
    else if(p.t==="k")for(let dr=-1;dr<=1;dr++)for(let df=-1;df<=1;df++)if(dr||df)step(dr,df,false);
    else{
      if(p.t!=="b")[[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>step(d[0],d[1],true));
      if(p.t!=="r")[[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d=>step(d[0],d[1],true));
    }
    return out;
  }
  function attackMap(b){
    const A={w:[],b:[]};for(let r=0;r<8;r++){A.w.push(new Array(8).fill(0));A.b.push(new Array(8).fill(0))}
    const lo={w:[],b:[]};for(let r=0;r<8;r++){lo.w.push(new Array(8).fill(99));lo.b.push(new Array(8).fill(99))}
    for(let r=0;r<8;r++)for(let f=0;f<8;f++){const p=b[r][f];if(!p)continue;targets(b,r,f).forEach(t=>{A[p.c][t[0]][t[1]]++;lo[p.c][t[0]][t[1]]=Math.min(lo[p.c][t[0]][t[1]],VAL[p.t])})}
    return{A:A,lo:lo};
  }
  const sq=(r,f)=>FILES[f]+(8-r);
  const other=c=>c==="w"?"b":"w";
  /* detect every alarm that is on the board for the side `me` ("w" or "b"); returns [{id,label,say,ask,letter,squares}] */
  function detect(fen,me){
    const b=parse(fen);if(!b)return[];
    me=me==="b"?"b":"w";const op=other(me),am=attackMap(b),out=[];
    const add=(id,squares)=>out.push(Object.assign({id:id,squares:squares||[]},ALARM[id]));
    /* loose pieces (never the king); a piece attacked by a cheaper piece or attacked and undefended */
    const loose=[];
    for(let r=0;r<8;r++)for(let f=0;f<8;f++){
      const p=b[r][f];if(!p||p.t==="k")continue;
      const att=am.A[other(p.c)][r][f],def=am.A[p.c][r][f];
      if(p.t!=="p"&&att>0&&(def===0||am.lo[other(p.c)][r][f]<VAL[p.t]))loose.push({c:p.c,s:sq(r,f),t:p.t});
    }
    const lm=loose.filter(x=>x.c===me).map(x=>x.s),lo=loose.filter(x=>x.c===op).map(x=>x.s);
    if(lm.length||lo.length)add("loose",lm.concat(lo));
    /* tension: pawn pairs that attack each other, plus piece-vs-piece attacks */
    let pawnT=0,pieceT=0;
    for(let r=0;r<8;r++)for(let f=0;f<8;f++){
      const p=b[r][f];if(!p||p.c!=="w")continue;
      targets(b,r,f).forEach(t=>{const q=b[t[0]][t[1]];if(q&&q.c==="b"){if(p.t==="p"&&q.t==="p")pawnT++;else if(p.t!=="p"&&q.t!=="p"&&p.t!=="k"&&q.t!=="k")pieceT++}});
    }
    if(pawnT>=2||pawnT+pieceT>=4||(pawnT>=1&&pieceT>=2))add("tension",[]);
    /* closed centre: pawn pairs head to head on c, d, e, f */
    let locked=0,dlock=false;
    for(let f=2;f<=5;f++)for(let r=1;r<7;r++){const a=b[r][f],c=b[r+1][f];if(a&&c&&a.t==="p"&&c.t==="p"&&a.c==="b"&&c.c==="w"){locked++;if(f===3||f===4)dlock=true}}
    if(locked>=2&&dlock&&pawnT===0)add("closed",[]);
    /* enemy outpost: knight / bishop on its 5th-7th rank, supported by a pawn, no pawn of mine can attack the square */
    for(let r=0;r<8;r++)for(let f=0;f<8;f++){
      const p=b[r][f];if(!p||p.c!==op||(p.t!=="n"&&p.t!=="b"))continue;
      const rankFromOp=op==="w"?8-r:r+1;if(rankFromOp<5||rankFromOp>7)continue;
      let sup=false;const d=op==="w"?1:-1;[-1,1].forEach(df=>{const rr=r+d,ff=f+df;if(rr>=0&&rr<8&&ff>=0&&ff<8){const q=b[rr][ff];if(q&&q.t==="p"&&q.c===op)sup=true}});
      if(!sup)continue;
      let canHit=false;
      for(let ff=f-1;ff<=f+1;ff+=2){if(ff<0||ff>7)continue;for(let rr=0;rr<8;rr++){const q=b[rr][ff];if(q&&q.t==="p"&&q.c===me){const behind=me==="w"?rr<r?false:true:rr>r?false:true;if(behind)canHit=true}}}
      if(!canHit)add("outpost",[sq(r,f)]);
    }
    /* exposed king: own king, fewer than 2 of the 3 files in front have an own pawn, enemy queen + a rook or two minors still there */
    let kr=-1,kf=-1;for(let r=0;r<8;r++)for(let f=0;f<8;f++){const p=b[r][f];if(p&&p.t==="k"&&p.c===me){kr=r;kf=f}}
    if(kr>=0){
      let cover=0,files=0;
      for(let f=Math.max(0,kf-1);f<=Math.min(7,kf+1);f++){files++;for(let r=0;r<8;r++){const p=b[r][f];if(p&&p.t==="p"&&p.c===me&&(me==="w"?r<kr:r>kr)){cover++;break}}}
      let q=false,rk=0,mn=0;for(let r=0;r<8;r++)for(let f=0;f<8;f++){const p=b[r][f];if(p&&p.c===op){if(p.t==="q")q=true;if(p.t==="r")rk++;if(p.t==="b"||p.t==="n")mn++}}
      if(q&&(rk>=1||mn>=2)&&cover<=files-2)add("king",[sq(kr,kf)]);
    }
    /* passed pawn of the opponent on its 5th rank or further */
    for(let r=0;r<8;r++)for(let f=0;f<8;f++){
      const p=b[r][f];if(!p||p.t!=="p"||p.c!==op)continue;
      const rankFrom=op==="w"?8-r:r+1;if(rankFrom<5)continue;
      let blocked=false;
      for(let ff=Math.max(0,f-1);ff<=Math.min(7,f+1)&&!blocked;ff++)for(let rr=0;rr<8;rr++){const q=b[rr][ff];if(q&&q.t==="p"&&q.c===me&&(op==="w"?rr<r:rr>r)){blocked=true;break}}
      if(!blocked)add("passed",[sq(r,f)]);
    }
    /* opposite-side castling */
    const kw=findKing(b,"w"),kb=findKing(b,"b");
    if(kw&&kb&&((kw.f<=2&&kb.f>=5)||(kw.f>=5&&kb.f<=2)))add("opposite",[]);
    return out;
  }
  function findKing(b,c){for(let r=0;r<8;r++)for(let f=0;f<8;f++){const p=b[r][f];if(p&&p.t==="k"&&p.c===c)return{r:r,f:f}}return null}

  /* ---------- recorded voice (optional): assets/audio/coach/index.json + <hash>.mp3, made with tools/make_coach_audio.py in the owner's voice.
     The hash is the first 16 hex characters of the SHA-1 of the cleaned text (same cleaning as LC60). No clip = no button. ---------- */
  const VDIR="assets/audio/coach/";let vidx=null,vloading=null,voff=0,vaudio=null;
  async function voiceIndex(){
    if(vidx)return vidx;if(Date.now()<voff)return null;
    if(!vloading)vloading=(async()=>{
      try{const r=await fetch(VDIR+"index.json",{cache:"no-cache"});if(!r.ok)throw new Error("none");const j=await r.json(),c=j&&j.clips;
        if(!c||typeof c!=="object"||!Object.keys(c).length)throw new Error("empty");vidx=c;return vidx}
      catch(e){voff=Date.now()+6*3600*1000;return null}finally{vloading=null}
    })();
    return vloading;
  }
  async function clipOf(text){
    const idx=await voiceIndex();if(!idx||typeof LC60==="undefined")return null;
    const h=await LC60.hashOf(LC60.clean(text));return idx[h]&&idx[h].file?VDIR+idx[h].file:null;
  }
  async function sayClip(text){
    const url=await clipOf(text);if(!url)return false;
    try{if(!vaudio)vaudio=new Audio();vaudio.pause();vaudio.src=url;const pr=vaudio.play();if(pr&&pr.catch)pr.catch(()=>{});return true}catch(e){return false}
  }
  function vbtn(text){return'<button type="button" class="lc61-say" data-lc61="voice" data-text="'+esc(text)+'" aria-label="Listen to Coach Lanckriet" hidden>&#128266;</button>'}
  let vdeb=0;
  function paintVoice(){
    clearTimeout(vdeb);vdeb=setTimeout(async()=>{
      const bs=QA('[data-lc61="voice"][hidden]');if(!bs.length)return;
      for(const b of bs){try{if(await clipOf(b.getAttribute("data-text")))b.hidden=false}catch(e){}}
    },400);
  }

  /* the three lines every error overview ends with */
  const AK="lc61-al";
  const LETTER_NAME={M:"Move: what changed",S:"Specifics: structure and features",P:"Priorities: checks, captures, attacks",C:"Calculation: the strict check"};
  function linkedPoint(letter,alarmId){
    let pts=[];try{pts=Framework.ranked()}catch(e){pts=[]}
    const map=rd(AK,{})||{};
    let p=pts.filter(x=>map[x.id]===alarmId)[0]||pts.filter(x=>x.cat===letter)[0]||null;
    return p;
  }
  function tail(o){
    try{
      const color=o.color==="b"?"b":"w";
      const al=detect(o.fen,color);
      const letter=o.k||"S";
      /* the alarm that belongs to the thinking error first, then the first one on the board */
      const pick=al.filter(a=>a.letter===letter)[0]||al.filter(a=>a.id!=="loose")[0]||al[0]||null;
      let h='<div class="lc61-tail">';
      h+='<p><b>a) Thinking error.</b> '+esc(LETTER_NAME[letter]||letter)+'. '+esc(o.why||"")+'</p>';
      if(pick){
        const sqs=pick.squares&&pick.squares.length?' ('+esc(pick.squares.slice(0,3).join(", "))+')':'';
        h+='<p><b>b) Alarm Signal on the board.</b> '+esc(pick.label)+sqs+'. '+esc(pick.say)+' '+vbtn(pick.say)+'</p>';
        const p=linkedPoint(letter,pick.id);
        if(p){
          let sc=0;try{sc=Framework.score?Framework.score(p):0}catch(e){}
          h+='<p><b>c) Working Point that activates it.</b> “'+esc(p.text)+'”'+(sc?' · urgency '+sc+' of 100':'')+'. When you see this alarm, stop and run it before you move.</p>';
        }else{
          h+='<p><b>c) Working Point that activates it.</b> You do not have one for this yet. <button type="button" class="btn btn-ghost btn-sm" data-lc61="wp-add" data-alarm="'+esc(pick.id)+'" data-letter="'+esc(letter)+'">Add it as a Working Point</button></p>';
        }
        h+='<p class="small muted">'+esc(pick.ask)+'</p>';
      }else{
        h+='<p><b>b) Alarm Signal on the board.</b> None of the standard alarms was on the board here, so the error came from the thinking order, not from a feature. Check the working point for this letter.</p>';
      }
      try{h+=LC64.nextGamesHTML(letter,pick?pick.id:"")}catch(e){}
      h+=crowdHTML(o,pick);
      return h+'</div>';
    }catch(e){return""}
  }
  function crowdHTML(o,pick){
    if(!o||!o.fen)return"";
    return'<details class="lc61-crowd"><summary>What should have warned you here?</summary>'
      +'<p class="small muted">Type the sign you missed, in one sentence. It goes to the coach\'s queue and the best ones join the library.</p>'
      +'<label class="field"><textarea rows="2" maxlength="280" data-lc61-warn placeholder="e.g. Their knight was on e5 and I had no pawn left to chase it."></textarea></label>'
      +'<button type="button" class="btn btn-ghost btn-sm" data-lc61="warn-send" data-fen="'+esc(o.fen)+'" data-san="'+esc(o.ps||"")+'" data-letter="'+esc(o.k||"")+'" data-alarm="'+esc(pick?pick.id:"")+'">Send to the queue</button>'
      +'<span class="small" data-lc61-warn-out aria-live="polite"></span></details>';
  }
  async function sendWarn(btn){
    const box=btn.closest("details"),ta=Q("[data-lc61-warn]",box),out=Q("[data-lc61-warn-out]",box);
    const text=String(ta&&ta.value||"").trim();
    if(text.length<12){if(out)out.textContent=" Write one real sentence first.";return}
    if(!sess()){if(out)out.textContent=" Sign in first so we can credit you.";return}
    btn.disabled=true;
    const r=await authed("lc61_warn_submit",{p_fen:btn.getAttribute("data-fen"),p_san:btn.getAttribute("data-san"),p_letter:btn.getAttribute("data-letter"),p_alarm:btn.getAttribute("data-alarm"),p_text:text});
    btn.disabled=false;
    if(r&&r.ok){if(out)out.textContent=" Thank you. The coach reads every one.";if(ta)ta.value="";say("Sent to the coach's queue.","good")}
    else if(out)out.textContent=r&&r.error==="rate"?" That is enough for today. Try again tomorrow.":" Could not send that now.";
  }
  function addWp(btn){
    const letter=btn.getAttribute("data-letter")||"S",id=btn.getAttribute("data-alarm")||"";
    const a=ALARM[id];const text=a?("When “"+a.label.toLowerCase()+"” is on the board: "+a.ask):"";
    let r=null;
    try{r=Framework.coachAdd(letter,text.slice(0,120),{sev:2,freq:2,pers:2})}catch(e){r=null}
    if(r&&r.id){const m=rd(AK,{})||{};m[r.id]=id;wr(AK,m);say("Added to your Working Points.","good");btn.replaceWith(document.createTextNode("Added."))}
    else say("Your Working Point slots are full. Archive one first.","bad");
  }

  /* ---------- 5. Most Recent Star ---------- */
  function recItems(){try{return(LC81.recs&&LC81.recs.items&&LC81.recs.items())||[]}catch(e){return[]}}
  function latestStar(){
    const its=recItems().filter(x=>x&&x.ts);if(!its.length)return null;
    its.sort((a,b)=>b.ts-a.ts);return its[0];
  }
  function starCourse(it){
    if(!it)return null;
    try{const m=LC81.CFG&&LC81.CFG.rec&&LC81.CFG.rec.map[it.cat];if(m)return{label:m.free[0],href:m.free[1],paid:m.paid[0],paidHref:m.paid[1]}}catch(e){}
    return null;
  }
  function guardRanked(){
    try{
      if(Framework.__lc61)return;Framework.__lc61=true;
      const r=Framework.ranked;
      Framework.ranked=function(){
        const list=r.apply(this,arguments);
        try{
          const st=latestStar();if(!st||!Array.isArray(list)||list.length<2)return list;
          const i=list.findIndex(p=>p&&p.cat===st.cat);
          if(i>0){const c=list.slice();const x=c.splice(i,1)[0];c.unshift(x);return c}
        }catch(e){}
        return list;
      };
    }catch(e){}
  }

  /* ---------- 6. MSPC page: ELO, Alarm Signals, Working Points on top; the training schedule ---------- */
  function activeElo(){
    try{const b=Elo.best&&Elo.best();if(b&&b.rating)return{rating:b.rating,label:b.label}}catch(e){}
    try{const e=Math.round(+(App.profile&&App.profile.elo));if(e>=400&&e<=2800)return{rating:e,label:"Your rating"}}catch(e){}
    return null;
  }
  function topBlock(){
    const e=activeElo();
    let pts=[];try{pts=Framework.ranked().slice(0,3)}catch(er){pts=[]}
    const map=rd(AK,{})||{};
    const sev=n=>n>=3?"High":n===2?"Medium":"Low";
    const alarmIds={};pts.forEach(p=>{if(map[p.id])alarmIds[map[p.id]]=1});
    const letters={};pts.forEach(p=>{letters[p.cat]=1});
    Object.keys(ALARM).forEach(id=>{if(letters[ALARM[id].letter]&&Object.keys(alarmIds).length<3)alarmIds[id]=1});
    const al=Object.keys(alarmIds).slice(0,4);
    const st=latestStar();
    let h='<section class="lc61-top panel pad" data-lc61-top>';
    h+='<div class="lc61-elo"><small>Active ELO</small><b>'+(e?esc(e.rating):"–")+'</b><span>'+(e?esc(e.label):"Connect your account in My Rating")+'</span></div>';
    h+='<div class="lc61-col"><h3>Alarm Signals</h3>'+(al.length?'<ul>'+al.map(id=>'<li><b>'+esc(ALARM[id].label)+'</b><span>'+esc(ALARM[id].ask)+'</span></li>').join(""):'<p class="muted small">Your alarms appear after your first reviewed game.</p>')+(al.length?'</ul>':'')+'</div>';
    h+='<div class="lc61-col"><h3>Personal Working Points</h3>'+(pts.length?'<ul>'+pts.map((p,i)=>{let sc=0;try{sc=Framework.score(p)}catch(er){}return'<li><b>'+(i===0&&st&&p.cat===st.cat?'★ ':'')+esc(p.text)+'</b><span>Urgency '+sc+' · severity '+sev(p.sev||2)+'</span></li>'}).join("")+'</ul>':'<p class="muted small">No personal points yet. Review a game and they fill themselves.</p>')+'</div>';
    h+='<div class="btn-row"><button type="button" class="btn btn-primary" data-lc61="schedule">Make My Training Schedule</button></div></section>';
    return h;
  }
  function paintTop(){
    const r=route();if(r!=="system"&&r!=="mspc-system"&&r!=="working-points")return;
    const view=Q("#view")||Q("main");if(!view)return;
    const old=Q("[data-lc61-top]",view);
    const html=topBlock();
    if(old){const t=document.createElement("div");t.innerHTML=html;if(old.innerHTML!==t.firstChild.innerHTML)old.innerHTML=t.firstChild.innerHTML;return}
    const host=document.createElement("div");host.innerHTML=html;
    view.insertBefore(host.firstChild,view.firstChild);
    tidyMspc(view);
  }
  /* quiet the top of the page: e-mail marketing cards, the manual rating box and the back-up buttons move out of the way (nothing is deleted) */
  function tidyMspc(view){
    try{
      QA(".lc39-mailcard,.lc57-mail,[data-lc57-card],[data-lc39-mail]",view).forEach(n=>{n.classList.add("lc61-below")});
      QA("[data-lc81=\"backup\"],.lc81-backup,.lc81-sync,[data-lc81=\"sync\"]",view).forEach(n=>{n.classList.add("lc61-below")});
      QA("form[data-elo-manual],.fw-elo-box,[data-fw=\"elo\"]",view).forEach(n=>{n.classList.add("lc61-below")});
    }catch(e){}
  }
  function schedule(){
    const st=latestStar(),course=starCourse(st);
    let pts=[];try{pts=Framework.ranked()}catch(e){pts=[]}
    const p=pts[0];
    const steps=[];
    if(p)steps.push("Open the course below and finish its first lesson. Your most urgent Working Point is “"+p.text+"”.");
    else steps.push("Review one of your own games in Trim so the app can find your first Working Point.");
    steps.push("Play ONE sparring game with “Be My Sparring Partner”: I will wait for the alarm signal on the board and test whether you punish it.");
    steps.push("Trim that game and write down, in one sentence, what should have warned you. That sentence is your next Working Point.");
    const sheet=openSheet({title:"Your training schedule",cls:"lc61-sheet",noFocus:true,html:
      '<div class="lc61-coach"><span class="lc61-face" data-lc61-face></span><p><b>Coach Lanckriet:</b> three steps, nothing more. Do them in this order.</p><button type="button" class="btn btn-ghost btn-sm" data-lc61="coach-say" aria-label="Listen to the plan">Listen</button></div>'
      +'<ol class="lc61-steps">'+steps.map(t=>'<li>'+esc(t)+'</li>').join("")+'</ol>'
      +(course?'<p class="small muted">★ Newest star: '+esc(course.label)+'</p><div class="btn-row"><a class="btn btn-primary" data-close href="'+esc(course.href)+'">Go to this course</a></div>':'<div class="btn-row"><a class="btn btn-primary" data-close href="#theory">Go to this course</a></div>')});
    try{faceInto(Q("[data-lc61-face]",sheet.el||document))}catch(e){}
    wr("lc61-plan",{at:Date.now(),text:steps.join(" ")});
  }
  /* Coach Lanckriet's official pictures (LC48): the emotion that fits, else the first one the folder has */
  function coachImg(want,size){
    try{
      if(typeof LC48==="undefined"||!LC48.coach||!LC48.coach.available())return"";
      const em=LC48.coach.emotions(),pick=(want||[]).filter(w=>em.indexOf(w)>=0)[0]||em[0];
      return pick?LC48.coach.img(pick,5,size||56,"lc48-coach lc61-pic"):"";
    }catch(e){return""}
  }
  function faceInto(el){
    if(!el)return;
    const h=coachImg(["happy","smile","proud","calm"],56);
    if(h){el.innerHTML=h;el.style.background="none"}else el.textContent="♞";
  }
  /* "learn every line about twice": the opening trainer treats a line as learned after TWO finished learn runs (older, already learned lines count as done) */
  const LK="lc61-learn";
  function learnPass(id){try{const m=rd(LK,{})||{};m[id]=(+m[id]||0)+1;wr(LK,m)}catch(e){}}
  function learnPasses(id){
    try{const m=rd(LK,{})||{};if(m[id]!==undefined)return+m[id]||0;return SmartSkip.done(id,"learn")?2:0}catch(e){return 2}
  }
  async function coachSay(){
    const t=(rd("lc61-plan",{})||{}).text;if(!t)return;
    if(await sayClip(t))return;
    try{if("speechSynthesis" in window){const u=new SpeechSynthesisUtterance(t);u.lang="en-GB";speechSynthesis.cancel();speechSynthesis.speak(u)}}catch(e){}
  }

  /* ---------- 7. the openings trainer: Instant Play one level under the rating, Auto-advance on ---------- */
  function trainLevel(){
    const e=playerRating(),n=e<800?1:e<1200?2:e<1600?3:e<2000?4:5;
    return Math.max(1,n-1);                                  /* one step under the rating: ELO 2105 = Level 4 */
  }
  function untrained(lines){
    try{return!lines.some(l=>SmartSkip.done(l.id,"learn"))}catch(e){return true}
  }
  /* Auto-advance is ON by default in LC25 (autoOn: no stored choice = on). Nothing to do here; the member's own switch is respected. */
  function levelLines(lines){
    try{
      if(!lines||lines.length<2||!untrained(lines))return lines;
      const tgt=trainLevel(),have=Array.from(new Set(lines.map(l=>+l.lvl||1))).sort((x,y)=>x-y);
      const le=have.filter(n=>n<=tgt),pick=le.length?le[le.length-1]:have[0];
      const sub=lines.filter(l=>(+l.lvl||1)===pick);
      return sub.length?sub:lines;
    }catch(e){return lines}
  }

  /* ---------- wiring ---------- */
  function css(){
    if(Q("#lc61-css"))return;
    const s=document.createElement("style");s.id="lc61-css";
    s.textContent=".lc61-say{min-width:44px;min-height:44px;border:0;background:transparent;color:#38bdf8;font-size:18px;cursor:pointer}.lc61-tail{margin-top:10px;padding:12px;border:1px solid #334155;border-radius:12px;background:#0f172a}.lc61-tail p{margin:0 0 8px}.lc61-crowd,.lc61-tail details{margin-top:8px}.lc61-tail summary{min-height:44px;display:flex;align-items:center;cursor:pointer;color:#38bdf8}"
    +".lc61-top{display:grid;gap:14px;margin-bottom:14px}.lc61-elo{display:grid;gap:2px}.lc61-elo small{color:#94a3b8}.lc61-elo b{font-size:34px;color:#38bdf8;line-height:1}.lc61-elo span{color:#94a3b8;font-size:13px}.lc61-col h3{margin:0 0 6px;font-size:15px}.lc61-col ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}.lc61-col li{display:grid;gap:2px;padding:8px 10px;border-radius:10px;background:#1e293b}.lc61-col li span{color:#94a3b8;font-size:13px}"
    +".lc61-below{order:99}.lc61-steps{padding-left:20px;display:grid;gap:10px}.lc61-coach{display:flex;gap:10px;align-items:center}.lc61-face{width:56px;height:56px;border-radius:50%;background:#1e293b center/cover;display:grid;place-items:center;font-size:26px;flex:none}"
    +".lc39-g .lc39-gr{display:none}.lc39-g{border-left:3px solid #334155}.lc39-g.is-win{border-left-color:#4ade80}.lc39-g.is-loss{border-left-color:#fb7185}.lc39-g.is-win .lc39-gm b{color:#4ade80}.lc39-g.is-loss .lc39-gm b{color:#fb7185}"
    +"@media(min-width:760px){.lc61-top{grid-template-columns:140px 1fr 1fr}.lc61-top .btn-row{grid-column:1/-1}}";
    document.head.appendChild(s);
  }
  function onClick(e){
    const el=e.target.closest&&e.target.closest("[data-lc61]");if(!el)return;
    const a=el.getAttribute("data-lc61");
    if(a==="warn-send"){e.preventDefault();sendWarn(el)}
    else if(a==="wp-add"){e.preventDefault();addWp(el)}
    else if(a==="schedule"){e.preventDefault();schedule()}
    else if(a==="coach-say"){e.preventDefault();coachSay()}
    else if(a==="voice"){e.preventDefault();sayClip(el.getAttribute("data-text"))}
  }
  async function openQueue(){
    try{
      const sh=openSheet({title:"Crowdsourced warnings",cls:"lc36-sheet lc61-sheet lc61-admin",noFocus:true,html:'<p class="muted">Loading…</p>'});
      await queuePaint(sh.el);
    }catch(e){say("Could not open that.","bad")}
  }
  async function queuePaint(el){
    const r=await authed("lc61_admin_queue");
    if(!r||!r.ok){el.innerHTML='<p class="form-msg is-bad">'+esc(r&&r.error==="forbidden"?"Sign in as the owner first.":"Not ready: run the LC61 SQL.")+'</p>';return}
    const rows=r.rows||[];
    if(!rows.length){el.innerHTML='<p class="muted">Nothing waiting.</p>';return}
    el.innerHTML=rows.map(x=>'<div class="lc59-row" data-id="'+esc(x.id)+'"><p><b>'+esc(x.first_name||"?")+'</b> · '+esc(x.letter||"")+' · '+esc(x.alarm||"no alarm")+' · '+esc(x.san||"")+'</p><blockquote>“'+esc(x.text)+'”</blockquote><p class="small muted">'+esc(x.fen)+'</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc61-q="approved">✓ Add to the library</button><button type="button" class="btn btn-ghost" data-lc61-q="rejected">Reject</button></div></div>').join("");
  }
  async function onQueueClick(e){
    const b=e.target.closest&&e.target.closest("[data-lc61-q]");if(!b)return;
    e.preventDefault();const row=b.closest("[data-id]"),host=b.closest(".lc61-admin");
    const r=await authed("lc61_admin_set",{p_id:row.getAttribute("data-id"),p_status:b.getAttribute("data-lc61-q")});
    if(r&&r.ok){say("Saved.","good");queuePaint(host)}else say("Could not save that.","bad");
  }
  function addOwnerRows(){
    const m=Q(".lc49-menu,#lc49-menu");if(!m||Q("[data-lc61-admin]",m))return;
    const ref=Q("[data-lc59-admin]",m);if(!ref)return;
    const b=document.createElement("button");b.type="button";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc61-admin","");
    b.innerHTML="<span><b>Crowdsourced warnings</b><small>What students say should have warned them</small></span>";
    ref.insertAdjacentElement("afterend",b);
  }
  let timer=0;
  function afterRender(r){
    clearTimeout(timer);
    timer=setTimeout(()=>{try{paintTop()}catch(e){}try{hydrate(false)}catch(e){}try{addOwnerRows()}catch(e){}},350);
  }
  function init(){
    css();guardForget();guardRanked();
    document.addEventListener("click",onClick,true);
    document.addEventListener("click",onQueueClick,true);
    document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("[data-lc61-admin]")){e.preventDefault();openQueue()}},true);
    setTimeout(()=>{try{hydrate(true)}catch(e){}},1500);
    window.addEventListener("storage",ev=>{if(ev.key&&/lc26-auth/.test(ev.key))setTimeout(()=>hydrate(true),500)});
    new MutationObserver(()=>{try{addOwnerRows();paintVoice()}catch(e){}}).observe(document.body,{childList:true,subtree:true});
  }
  return{init:init,afterRender:afterRender,getUserLevel:getUserLevel,hydrate:hydrate,wdl:wdl,moveAcc:moveAcc,gameAcc:gameAcc,reviewMoveAcc:reviewMoveAcc,epLoss:epLoss,detect:detect,tail:tail,ALARM:ALARM,latestStar:latestStar,linkedPoint:linkedPoint,schedule:schedule,trainLevel:trainLevel,vbtn:vbtn,sayClip:sayClip,paintVoice:paintVoice,learnPass:learnPass,learnPasses:learnPasses,coachImg:coachImg,untrained:untrained,levelLines:levelLines,WCFG:WCFG,applyNames:applyNames,version:"9.33.0"};
})(); /*@@end lc61*/
