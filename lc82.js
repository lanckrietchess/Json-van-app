/*@@module lc82*/
const LC82=(()=>{
  "use strict";
  /* LC82 (build 9.42.0): the Release Giveaway, its public Proof Queue board and the social-proof counters.
     1. #giveaway (Social menu, a slim banner on the calm pages): a 15-day ELO-gain challenge. Sign in, link Chess.com / Lichess (the Edge Function
        elo-verify reads the PUBLIC Rapid rating, the browser never sends one), join with one tap. Start = the verified rating at that moment, gain =
        latest verified rating minus start (the owner can switch to peak). The top 5 win 1 month of Pro. Showing the first name and the gain on the
        public board is a separate tick, OFF by default (GDPR opt-in).
     2. Social proof: total verified ELO gained by members, the number of 5-star reviews (in-app feedback) and the players in the challenge, on the
        giveaway page and on the landing page (index.html reads lc82_social_proof and lc82_board_public, no sign-in).
     3. #giveaway-admin (owner menu > Release Giveaway & reviews): the dates and prize, every entry ranked with e-mail and profile link, disqualify /
        awarded / note, the SQL that grants the winners 1 month of Pro (copy, paste into the Supabase SQL editor: the app never creates a licence),
        the highest verified gains of all members and every 5-star review.
     Server: sql/20261115100000_lc82_release_giveaway.sql (needs the LC59 SQL). Without it the page says so and nothing else changes. */
  const VERSION="9.42.0";
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const say=(t,k)=>{try{toast(t,k||"")}catch(e){}};
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0].toLowerCase();
  const owner=()=>{try{return !!(LC49.owner()||Admin.active)}catch(e){return false}};
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const SITE={chesscom:"Chess.com",lichess:"Lichess"};
  const prof=(site,u)=>site==="lichess"?"https://lichess.org/@/"+encodeURIComponent(u):"https://www.chess.com/member/"+encodeURIComponent(u);
  const sgn=n=>(+n>0?"+":(+n<0?"−":""))+Math.abs(+n||0);
  const num=n=>{try{return(+n||0).toLocaleString("en-US")}catch(e){return String(+n||0)}};
  const day=d=>{try{return new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}catch(e){return""}};
  const when=d=>{try{return new Date(d).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}catch(e){return""}};
  const NOSQL="The giveaway is not switched on yet. Run sql/20261115100000_lc82_release_giveaway.sql in the Supabase SQL editor.";
  async function tok(){try{return await LC26.sync.token()}catch(e){return""}}
  /* signed-in call (anon=true: the public functions, no token needed) */
  async function rpc(fn,args,anon){
    try{
      const h={};if(!anon){const t=await tok();if(!t)return{status:401,data:null};h.Authorization="Bearer "+t}
      return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:h,body:JSON.stringify(args||{})});
    }catch(e){return{status:0,data:null}}
  }
  const okData=r=>r&&r.status===200&&r.data&&r.data.ok?r.data:null;

  /* ---------- public data (cached: landing-style counters, the board, the line for the script prompts) ---------- */
  let proofAt=0,proofP=null;
  async function proof(force){
    const c=rd("lc82-proof",null);
    if(!force&&c&&Date.now()-(c.at||0)<5*6e4)return c.d;
    if(proofP)return proofP;
    proofP=(async()=>{const r=await rpc("lc82_social_proof",{},true),d=okData(r);if(d){wr("lc82-proof",{at:Date.now(),d:d});proofAt=Date.now()}return d||(c&&c.d)||null})();
    try{return await proofP}finally{proofP=null}
  }
  async function board(){const r=await rpc("lc82_board_public",{},true);return okData(r)}
  const G=()=>{const c=rd("lc82-proof",null);return c&&c.d&&c.d.giveaway||null};
  /* one line for the script prompts (LC79 Bullet Points mode, LC64 Content Trim) */
  function giveawayLine(){
    const g=G(),n=g&&g.winners||5,prize=g&&g.prize||"1 month of Pro";
    return"Release Giveaway: a 15-day ELO-gain challenge in the Lanckriet Chess app. Link your Chess.com or Lichess account, the app reads your public Rapid rating, and the top "+n+" ELO gainers win "+prize+"."
      +(g&&g.ends_at&&!g.ended?" It ends on "+day(g.ends_at)+".":"");
  }
  function left(g){
    if(!g)return"";const t=Date.now(),s=+new Date(g.starts_at),e=+new Date(g.ends_at);
    if(t<s)return"Starts on "+day(g.starts_at);if(t>e)return"Ended on "+day(g.ends_at);
    const d=Math.ceil((e-t)/864e5);return d<=1?"Last day":d+" days left";
  }
  function proofHTML(p){
    if(!p)return"";const rv=p.reviews||{},chips=[];
    if(+p.elo_gained>0)chips.push('<div class="lc82-stat"><b>+'+num(p.elo_gained)+'</b><span>ELO gained by members, verified on their public profiles</span></div>');
    if(+rv.five_star>0)chips.push('<div class="lc82-stat"><b>'+num(rv.five_star)+' <i aria-hidden="true">★★★★★</i></b><span>five-star reviews'+(rv.avg?" · average "+(+rv.avg).toFixed(1)+" / 5":"")+'</span></div>');
    if(+p.giveaway_entries>0)chips.push('<div class="lc82-stat"><b>'+num(p.giveaway_entries)+'</b><span>players in the Release Giveaway</span></div>');
    return chips.length?'<div class="lc82-stats">'+chips.join("")+'</div>':"";
  }
  function boardHTML(b,mine){
    const rows=b&&b.rows||[];
    if(!rows.length)return'<p class="small muted">No public entries yet. Tick “Show my first name and gain” to appear here.</p>';
    return'<ol class="lc82-board">'+rows.map(r=>'<li class="'+(r.rank<=((b.giveaway||{}).winners||5)?"is-top":"")+(mine&&mine.rank===r.rank?" is-me":"")+'"><span class="lc82-rk">#'+r.rank+'</span><span class="lc82-nm">'+esc(r.first_name)+' <small>'+esc(SITE[r.site]||"")+'</small></span><span class="lc82-rt">'+r.start+' → '+r.now+'</span><b class="lc82-gn'+(r.gain<0?" is-neg":"")+'">'+sgn(r.gain)+'</b></li>').join("")+'</ol>';
  }

  /* ---------- the member page #giveaway ---------- */
  let ST=null,busy=false;
  async function load(){
    const s=sess(),p=await proof(true);
    if(!s){ST={signed_in:false,giveaway:p&&p.giveaway||null};return}
    const r=await rpc("lc82_status");
    if(r.status===404){ST={missing:true};return}
    ST=okData(r)||{err:true,giveaway:p&&p.giveaway||null};
    if(ST&&ST.entry)wr("lc82-me",{gain:ST.entry.gain,rank:ST.entry.rank,id:(ST.giveaway||{}).id,at:Date.now()});
  }
  async function mountPage(view){
    view.innerHTML='<div class="lc82 lc82-page"><p class="lc82-tag">Release Giveaway</p><h1>Gain the most ELO in 15 days</h1><p class="lead">Play your normal games and train the way you train. Your verified Rapid rating on Chess.com or Lichess does the talking. The top 5 ELO gainers win 1 month of Pro.</p><div data-lc82-body><p class="small muted">Loading…</p></div></div>';
    await load();paint();
  }
  function paint(){
    const host=Q("[data-lc82-body]");if(!host)return;
    if(ST&&ST.missing){host.innerHTML='<div class="panel pad"><p>'+(owner()?esc(NOSQL):"The Release Giveaway opens soon. Check back later.")+'</p></div>';return}
    const g=ST&&ST.giveaway,p=rd("lc82-proof",null);
    let h=proofHTML(p&&p.d);
    if(!g){host.innerHTML=h+'<div class="panel pad"><p>There is no giveaway running right now. Check back soon.</p></div>';return}
    h+='<div class="lc82-when"><b>'+esc(g.title||"Release Giveaway")+'</b> · '+esc(day(g.starts_at))+' to '+esc(day(g.ends_at))+' · <span class="lc82-left">'+esc(left(g))+'</span> · Prize: '+esc(g.prize||"1 month of Pro")+' for the top '+(+g.winners||5)+'</div>';
    h+='<div class="panel pad lc82-card">'+stepHTML(g)+'</div>';
    h+='<h2 class="lc82-h2">The board</h2><div data-lc82-board><p class="small muted">Loading the board…</p></div>';
    h+='<details class="lc82-rules"><summary>How it works and the rules</summary><ul>'
      +'<li>Only your <b>public Rapid rating</b> on Chess.com or Lichess counts. Our server reads it from your public profile; nobody types a number.</li>'
      +'<li>Your <b>start</b> is your verified rating the moment you join. Your <b>gain</b> is your latest verified rating minus that start'+(g.rank_by==="peak"?" (for this giveaway: your highest verified rating)":"")+'. Open the app now and then, or press “Refresh my rating”, so we read it.</li>'
      +'<li>One chess account per member. Shared, bought or boosted accounts are disqualified.</li>'
      +'<li>At the end, the top '+(+g.winners||5)+' get '+esc(g.prize||"1 month of Pro")+' on the e-mail you are signed in with. Kyenzo checks every winner’s public profile first.</li>'
      +'<li>Your first name and gain appear on the public board (app and website) only if you tick that box. You can untick it any time.</li>'
      +'<li>Results differ per person. Nothing here is a promise of a rating.</li></ul></details>';
    host.innerHTML=h;
    board().then(b=>{const x=Q("[data-lc82-board]");if(x)x.innerHTML=b?boardHTML(b,ST&&ST.entry):'<p class="small muted">The board could not load right now.</p>'});
  }
  function stepHTML(g){
    if(!ST||ST.signed_in===false)return'<p class="lc82-step">Step 1 of 3</p><h3>Sign in with your e-mail</h3><p>Your entry and the prize are tied to your e-mail address.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc82="signin">Sign in to join</button></div>';
    if(ST.err)return'<p>Could not load your entry. Check your connection and try again.</p><div class="btn-row"><button type="button" class="btn btn-ghost" data-lc82="reload">Try again</button></div>';
    const e=ST.entry;
    if(e)return'<p class="lc82-step">You are in</p><div class="lc82-me"><div><small>Start</small><b>'+e.start+'</b></div><div><small>Now</small><b>'+e.last+'</b></div><div><small>Gain</small><b class="lc82-gn'+(e.gain<0?" is-neg":"")+'">'+sgn(e.gain)+'</b></div><div><small>Rank</small><b>#'+(e.rank||"–")+'<small> of '+(+ST.entries||1)+'</small></b></div></div>'
      +'<p class="small muted">'+esc(SITE[e.site]||"")+' · '+esc(e.uname)+' · last read '+esc(when(e.last_at))+'</p>'
      +'<label class="lc82-sw"><input type="checkbox" data-lc82-pub'+(e.show_public?" checked":"")+'><span><b>Show my first name and gain on the public board</b><small>App and website. Never your e-mail or username.</small></span></label>'
      +'<label class="field lc82-fn"'+(e.show_public?"":" hidden")+'><span class="field-label">First name on the board</span><input class="input" data-lc82-first maxlength="24" value="'+esc(ST.first_name||"")+'" autocomplete="given-name"></label>'
      +'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc82="refresh"'+(g.running?"":" disabled")+'>Refresh my rating</button><button type="button" class="btn btn-ghost" data-lc82="savepub">Save</button><a class="btn btn-ghost" href="#trim">Trim a game</a></div>';
    if(!ST.linked)return'<p class="lc82-step">Step 2 of 3</p><h3>Link your chess account</h3><p>We read your public Rapid rating. Pick the site you play Rapid on most.</p>'
      +'<form class="lc82-link" data-lc82-link><label class="field"><span class="field-label">Site</span><select class="input" name="site"><option value="chesscom">Chess.com</option><option value="lichess">Lichess</option></select></label>'
      +'<label class="field"><span class="field-label">Username</span><input class="input" name="u" maxlength="30" autocomplete="username" required></label><button type="submit" class="btn btn-primary">Link and read my rating</button></form><p class="small" data-lc82-msg role="status" aria-live="polite"></p>';
    if(g.upcoming)return'<p class="lc82-step">Almost there</p><h3>The challenge starts on '+esc(day(g.starts_at))+'</h3><p>Your account is linked ('+esc(SITE[ST.site]||"")+' · '+esc(ST.uname)+', '+(ST.rating||"?")+'). Come back on the start day to join: your start rating is read that day.</p>';
    if(g.ended)return'<p class="lc82-step">Ended</p><h3>This giveaway has ended</h3><p>The winners are being checked. The next challenge is announced in the app.</p>';
    return'<p class="lc82-step">Step 3 of 3</p><h3>Join the Release Giveaway</h3><p>Your start rating is your verified Rapid rating right now: <b>'+(ST.rating||"?")+'</b> ('+esc(SITE[ST.site]||"")+' · '+esc(ST.uname)+').</p>'
      +'<label class="lc82-sw"><input type="checkbox" data-lc82-pub><span><b>Show my first name and gain on the public board</b><small>App and website. Never your e-mail or username. Optional.</small></span></label>'
      +'<label class="field lc82-fn" hidden><span class="field-label">First name on the board</span><input class="input" data-lc82-first maxlength="24" value="'+esc(ST.first_name||"")+'" autocomplete="given-name"></label>'
      +'<div class="btn-row"><button type="button" class="btn btn-primary lc82-go" data-lc82="join">Join the Release Giveaway</button></div><p class="small" data-lc82-msg role="status" aria-live="polite"></p>';
  }
  const ERR={link_first:"Link your chess account first.",first_name:"Write your first name (letters only, 2 to 24) to appear on the public board.",ended:"This giveaway has ended.",
    not_started:"The challenge has not started yet.",account_taken:"That chess account is already in the giveaway with another member.",no_giveaway:"There is no giveaway running.",sign_in:"Sign in first."};
  const msg=(t,bad)=>{const m=Q("[data-lc82-msg]");if(m){m.textContent=t;m.style.color=bad?"#fca5a5":"#86efac"}else say(t,bad?"bad":"good")};
  async function verifyNow(){
    try{if(typeof LC59!=="undefined"&&LC59.verify){const j=await LC59.verify(true);return j}}catch(e){}
    return null;
  }
  async function onClick(e){
    const b=e.target.closest&&e.target.closest("[data-lc82]");if(!b)return;
    const a=b.getAttribute("data-lc82");e.preventDefault();
    if(a==="x"){wr("lc82-ban",Date.now());const w=b.closest(".lc82-ban");if(w)w.remove();return}
    if(a==="signin"){try{LC40._t.openAuth();return}catch(x){}location.hash="#account";return}
    if(a==="reload"){await load();return paint()}
    if(busy)return;busy=true;b.disabled=true;
    try{
      if(a==="join"){
        const pub=!!(Q("[data-lc82-pub]")||{}).checked,first=String((Q("[data-lc82-first]")||{}).value||"").trim();
        await verifyNow();   /* read the rating once more, so the start is fresh */
        const r=await rpc("lc82_join",{p_first:first||null,p_public:pub});
        if(r.status===404){msg(NOSQL,true);return}
        const d=r.data||{};if(!d.ok){msg(ERR[d.error]||"Could not join right now. Try again in a moment.",true);return}
        ST=d;say("You are in the Release Giveaway. Your start: "+(d.entry&&d.entry.start)+".","good");wr("lc82-me",{gain:d.entry?d.entry.gain:0,rank:d.entry&&d.entry.rank,id:(d.giveaway||{}).id,at:Date.now()});proof(true);paint();return;
      }
      if(a==="refresh"){
        const j=await verifyNow();await load();paint();
        say(j&&j.ok?"Rating read: "+j.last+".":"Your rating was read recently. It is read again within the next hours.",j&&j.ok?"good":"");return;
      }
      if(a==="savepub"){
        const pub=!!(Q("[data-lc82-pub]")||{}).checked,first=String((Q("[data-lc82-first]")||{}).value||"").trim();
        const r=await rpc("lc82_public_set",{p_public:pub,p_first:first||null}),d=r.data||{};
        if(!d.ok){say(ERR[d.error]||"Could not save.","bad");return}ST=d;say(pub?"You are on the public board.":"You are off the public board.","good");paint();return;
      }
    }finally{busy=false;try{b.disabled=false}catch(x){}}
  }
  async function onSubmit(e){
    const f=e.target.closest&&e.target.closest("[data-lc82-link]");if(!f)return;e.preventDefault();
    const site=f.elements.site.value,u=String(f.elements.u.value||"").trim();
    if(!/^[A-Za-z0-9_-]{2,30}$/.test(u)){msg("A username only has letters, numbers, - and _.",true);return}
    let ok=false;try{ok=!!Elo.start(site,u)}catch(x){}
    try{App.profile=App.profile||{};App.profile[site==="lichess"?"lichess_username":"chess_com_username"]=u}catch(x){}
    if(!ok){msg("Could not save that username on this device.",true);return}
    msg("Reading your public Rapid rating…");
    const j=await verifyNow();
    await load();
    if(ST&&ST.linked){paint();say("Linked: "+(ST.rating||"")+" Rapid.","good");return}
    msg(j===null?"We could not read a Rapid rating for “"+u+"” yet. Check the spelling, play one Rapid game if you have none, and try again in a minute.":"Could not link this account.",true);
  }
  function onChange(e){
    const c=e.target;if(!c||!c.matches||!c.matches("[data-lc82-pub]"))return;
    const f=Q(".lc82-fn");if(f)f.hidden=!c.checked;if(c.checked){const i=Q("[data-lc82-first]");if(i&&!i.value)i.focus()}
  }

  /* ---------- banner on the calm pages ---------- */
  const BANNER=/^(quests|home|account|system|insights|ratings|trophies|profile|leaderboard)$/;
  async function banner(r){
    QA(".lc82-ban").forEach(x=>x.remove());
    if(!BANNER.test(r))return;
    try{if(typeof LC42!=="undefined"&&LC42.owns&&LC42.owns())return}catch(e){}
    if(Date.now()-(+rd("lc82-ban",0)||0)<3*864e5)return;
    const p=await proof(false),g=p&&p.giveaway;if(!g||g.ended||route()!==r)return;
    const v=Q("#view");if(!v||Q(".lc82-ban",v))return;
    const me=rd("lc82-me",null),mine=me&&me.id===g.id;
    const d=document.createElement("div");d.className="lc82-ban";d.setAttribute("role","note");
    d.innerHTML='<span class="lc82-ic" aria-hidden="true">🎁</span><p><b>'+(mine?"Release Giveaway: you are in":"Release Giveaway")+'</b> '
      +(mine?"Your gain: <b>"+sgn(me.gain)+"</b>"+(me.rank?" · rank #"+me.rank:"")+" · "+esc(left(g)):"Gain the most ELO in 15 days: the top "+(+g.winners||5)+" win "+esc(g.prize||"1 month of Pro")+". "+esc(left(g))+".")
      +'</p><a class="btn btn-primary btn-sm" href="#giveaway">'+(mine?"See the board":"Join")+'</a><button type="button" class="lc82-x" data-lc82="x" aria-label="Hide for 3 days">×</button>';
    v.insertAdjacentElement("afterbegin",d);
  }

  /* ---------- the owner page #giveaway-admin ---------- */
  let AD=null;
  async function mountAdmin(view){
    if(!owner()){view.innerHTML='<div class="panel pad"><p>This page is for the owner.</p></div>';return}
    view.innerHTML='<div class="lc82 lc82-admin"><p class="lc82-tag">Owner</p><h1>Release Giveaway & reviews</h1><div data-lc82-ad><p class="small muted">Loading…</p></div></div>';
    await loadAdmin();paintAdmin();
  }
  async function loadAdmin(id){
    const r=await rpc("lc82_admin_board",{p_id:id||null});
    AD=r.status===404?{missing:true}:(okData(r)||{err:(r.data&&(r.data.message||r.data.error))||"Sign in with lanckrietchess@gmail.com (Admin sign-in) to read the entries."});
  }
  function winnersSQL(){
    const g=AD&&AD.giveaway;if(!g)return"";
    const w=(AD.entries||[]).filter(e=>!e.disqualified).slice(0,+g.winners||5).filter(e=>!e.awarded_at);
    if(!w.length)return"-- Every winner is already marked as awarded.";
    const q=s=>"'"+String(s).replace(/'/g,"''")+"'";
    return"-- Release Giveaway "+g.id+": "+(g.prize||"1 month of Pro")+" for the top "+(+g.winners||5)+". Check each public profile first, then run this in the Supabase SQL editor.\n"
      +"-- The licence is claimed automatically when the winner signs in with this e-mail.\n"
      +w.map(e=>"select license_key from public._lc_create_license("+q(e.email)+", 'giveaway', 'Pro (Release Giveaway, 1 month)', 2, false, now() + interval '30 days', 10, "
        +q(JSON.stringify({source:"giveaway",giveaway:g.id,rank:e.rank}))+"::jsonb, 3);  -- #"+e.rank+" "+(e.first_name||"")+" "+sgn(e.gain)).join("\n")
      +"\nupdate public.lc82_entries set awarded_at = now() where giveaway_id = "+q(g.id)+" and user_id in ("+w.map(e=>q(e.user_id)).join(", ")+");";
  }
  const dl=d=>{try{const x=new Date(d),p=n=>String(n).padStart(2,"0");return x.getFullYear()+"-"+p(x.getMonth()+1)+"-"+p(x.getDate())+"T"+p(x.getHours())+":"+p(x.getMinutes())}catch(e){return""}};
  function paintAdmin(){
    const host=Q("[data-lc82-ad]");if(!host)return;
    if(AD&&AD.missing){host.innerHTML='<div class="panel pad"><p>'+esc(NOSQL)+'</p></div>';return}
    if(!AD||AD.err){host.innerHTML='<div class="panel pad"><p>'+esc((AD&&AD.err)||"Could not load.")+'</p><div class="btn-row"><button type="button" class="btn btn-ghost" data-lc82a="reload">Try again</button></div></div>';return}
    const g=AD.giveaway||{},E=AD.entries||[],P=AD.proof||{},rv=(P.reviews||{});
    let h='<div class="lc82-stats"><div class="lc82-stat"><b>'+E.length+'</b><span>entries</span></div><div class="lc82-stat"><b>'+(E[0]?sgn(E[0].gain):"–")+'</b><span>best gain in the giveaway</span></div>'
      +'<div class="lc82-stat"><b>+'+num(P.elo_gained)+'</b><span>verified ELO gained by all members ('+num(P.members_gained)+' members)</span></div><div class="lc82-stat"><b>'+num(rv.five_star)+' ★</b><span>five-star reviews of '+num(rv.rated)+' rated'+(rv.avg?" · avg "+(+rv.avg).toFixed(2):"")+'</span></div></div>';
    h+='<p class="small muted">The landing page and the giveaway page show the total ELO gained, the number of five-star reviews and the players in the giveaway (only when above 0).</p>';
    h+='<details class="panel pad lc82-cfg"><summary><b>Dates and prize</b> · '+esc(g.id||"none")+' · '+esc(left(g))+'</summary><form data-lc82-cfg class="lc82-grid">'
      +'<label class="field"><span class="field-label">Id (letters, digits, -)</span><input class="input" name="id" value="'+esc(g.id||"release-2026")+'" pattern="[a-z0-9-]{3,40}"></label>'
      +'<label class="field"><span class="field-label">Title</span><input class="input" name="title" value="'+esc(g.title||"Release Giveaway")+'"></label>'
      +'<label class="field"><span class="field-label">Starts</span><input class="input" type="datetime-local" name="starts_at" value="'+esc(dl(g.starts_at||Date.now()))+'"></label>'
      +'<label class="field"><span class="field-label">Ends</span><input class="input" type="datetime-local" name="ends_at" value="'+esc(dl(g.ends_at||Date.now()+15*864e5))+'"></label>'
      +'<label class="field"><span class="field-label">Winners</span><input class="input" type="number" min="1" max="50" name="winners" value="'+(+g.winners||5)+'"></label>'
      +'<label class="field"><span class="field-label">Prize</span><input class="input" name="prize" value="'+esc(g.prize||"1 month of Pro")+'"></label>'
      +'<label class="field"><span class="field-label">Gain counts</span><select class="input" name="rank_by"><option value="last"'+(g.rank_by!=="peak"?" selected":"")+'>Latest rating minus start</option><option value="peak"'+(g.rank_by==="peak"?" selected":"")+'>Highest rating minus start</option></select></label>'
      +'<label class="lc82-sw"><input type="checkbox" name="active"'+(g.active===false?"":" checked")+'><span><b>Active</b><small>Off hides it everywhere</small></span></label>'
      +'<div class="btn-row"><button type="submit" class="btn btn-primary">Save</button><button type="button" class="btn btn-ghost" data-lc82a="new">New giveaway (15 days from now)</button></div></form></details>';
    h+='<h2 class="lc82-h2">Entries, ranked</h2>';
    h+=E.length?'<div class="lc82-tw"><table class="lc82-t"><thead><tr><th>#</th><th>Member</th><th>Account</th><th>Start</th><th>Now</th><th>Peak</th><th>Gain</th><th>Public</th><th></th></tr></thead><tbody>'
      +E.map(e=>'<tr class="'+(e.disqualified?"is-dq":(e.rank<=(+g.winners||5)?"is-top":""))+'"><td>'+e.rank+'</td><td><b>'+esc(e.first_name||"–")+'</b><br><small>'+esc(e.email)+'</small>'+(e.note?'<br><small class="lc82-note">'+esc(e.note)+'</small>':"")+'</td>'
        +'<td><a href="'+esc(prof(e.site,e.uname))+'" target="_blank" rel="noopener noreferrer">'+esc(SITE[e.site]||e.site)+' · '+esc(e.uname)+'</a><br><small>joined '+esc(when(e.joined_at))+' · read '+esc(when(e.last_at))+'</small></td>'
        +'<td>'+e.start+'</td><td>'+e.now+'</td><td>'+e.peak+'</td><td><b class="lc82-gn'+(e.gain<0?" is-neg":"")+'">'+sgn(e.gain)+'</b></td><td>'+(e.show_public?"yes":"no")+'</td>'
        +'<td class="lc82-act"><button type="button" class="btn btn-ghost btn-sm" data-lc82a="award" data-u="'+esc(e.user_id)+'" data-v="'+(e.awarded_at?"0":"1")+'">'+(e.awarded_at?"✓ Awarded":"Mark awarded")+'</button>'
        +'<button type="button" class="btn btn-ghost btn-sm" data-lc82a="dq" data-u="'+esc(e.user_id)+'" data-v="'+(e.disqualified?"0":"1")+'">'+(e.disqualified?"Reinstate":"Disqualify")+'</button>'
        +'<button type="button" class="btn btn-ghost btn-sm" data-lc82a="note" data-u="'+esc(e.user_id)+'">Note</button></td></tr>').join("")+'</tbody></table></div>'
      :'<p class="small muted">No entries yet.</p>';
    h+='<h2 class="lc82-h2">Grant the prize (manual)</h2><p class="small muted">The app never creates a licence. Copy this, check the winners’ public profiles, then paste it into the Supabase SQL editor and run it.</p><textarea class="input lc82-sql" readonly data-lc82-sql>'+esc(winnersSQL())+'</textarea><div class="btn-row"><button type="button" class="btn btn-primary" data-lc82a="copy">Copy the SQL</button></div>';
    const T=AD.top_gains||[];
    h+='<h2 class="lc82-h2">Highest verified gains (all members, since they linked)</h2>'+(T.length?'<ol class="lc82-list">'+T.map(t=>'<li><b>'+sgn(t.gain)+'</b> <span>'+t.start+' → '+t.peak+'</span> <a href="'+esc(prof(t.site,t.uname))+'" target="_blank" rel="noopener noreferrer">'+esc(SITE[t.site]||"")+' · '+esc(t.uname)+'</a> <small>'+esc(t.email)+'</small></li>').join("")+'</ol>':'<p class="small muted">No verified gains yet.</p>');
    const R=AD.five_star||[];
    h+='<h2 class="lc82-h2">Five-star reviews</h2>'+(R.length?'<ul class="lc82-rev">'+R.map(x=>'<li><span class="lc82-stars" aria-label="5 stars">★★★★★</span> <small>'+esc(when(x.at))+' · '+esc(x.email||"no e-mail")+(String(x.showcase)==="true"?' · <b>may be shown</b>':"")+'</small><p>'+esc(x.message||"")+'</p>'+(x.elo?'<p class="small"><b>Result:</b> '+esc(x.elo)+'</p>':"")+'</li>').join("")+'</ul><p class="small muted">To show one on the landing page: Landing page editor > Wall of Love (only when the member allowed it).</p>':'<p class="small muted">No five-star reviews yet.</p>');
    host.innerHTML=h;
  }
  async function onAdminClick(e){
    const b=e.target.closest&&e.target.closest("[data-lc82a]");if(!b)return;e.preventDefault();
    const a=b.getAttribute("data-lc82a"),g=AD&&AD.giveaway||{};
    if(a==="reload"){await loadAdmin();return paintAdmin()}
    if(a==="copy"){const t=(Q("[data-lc82-sql]")||{}).value||"";let ok=false;try{await navigator.clipboard.writeText(t);ok=true}catch(x){try{Q("[data-lc82-sql]").select();ok=document.execCommand("copy")}catch(y){}}say(ok?"SQL copied. Paste it into the Supabase SQL editor.":"Select the text and copy it.",ok?"good":"bad");return}
    if(a==="new"){const f=Q("[data-lc82-cfg]");if(!f)return;const d=new Date();f.elements.id.value="giveaway-"+d.toISOString().slice(0,10);f.elements.starts_at.value=dl(d);f.elements.ends_at.value=dl(+d+15*864e5);say("Check the fields and press Save.","");return}
    const u=b.getAttribute("data-u");if(!u)return;
    let args={p_id:g.id,p_user:u,p_awarded:null,p_disq:null,p_note:null};
    if(a==="award")args.p_awarded=b.getAttribute("data-v")==="1";
    if(a==="dq"){if(b.getAttribute("data-v")==="1"&&!confirm("Disqualify this entry? It moves to the bottom and leaves the public board."))return;args.p_disq=b.getAttribute("data-v")==="1"}
    if(a==="note"){const n=prompt("Note for this entry (only you see it):","");if(n===null)return;args.p_note=n}
    const r=await rpc("lc82_admin_mark",args),d=okData(r);if(!d){say("Could not save.","bad");return}AD=d;paintAdmin();
  }
  async function onAdminSubmit(e){
    const f=e.target.closest&&e.target.closest("[data-lc82-cfg]");if(!f)return;e.preventDefault();
    const iso=v=>{try{return new Date(v).toISOString()}catch(x){return null}};
    const p={id:f.elements.id.value.trim().toLowerCase(),title:f.elements.title.value,starts_at:iso(f.elements.starts_at.value),ends_at:iso(f.elements.ends_at.value),
      winners:+f.elements.winners.value||5,prize:f.elements.prize.value,rank_by:f.elements.rank_by.value,active:f.elements.active.checked};
    const r=await rpc("lc82_admin_cfg",{p:p}),d=r.data||{};
    if(!d.ok){say({bad_id:"The id uses lowercase letters, digits and - (3 to 40).",bad_date:"The end must be after the start.",bad_value:"A value is out of range (winners 1 to 50)."}[d.error]||"Could not save.","bad");return}
    AD=d;proof(true);say("Saved.","good");paintAdmin();
  }

  /* ---------- wiring ---------- */
  function ownerRow(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc82-own]",m)||!owner())return;
    const ref=Q("[data-lc74-own]",m)||Q("[data-lc73-own]",m)||Q("[data-lc72-own]",m)||Q("[data-lc59-admin]",m);if(!ref)return;
    const b=document.createElement("a");b.href="#giveaway-admin";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc82-own","1");
    b.innerHTML="<span><b>Release Giveaway & reviews</b><small>Entries ranked by verified gain, the winners’ SQL, top gains, five-star reviews</small></span>";
    b.addEventListener("click",()=>{try{const mm=Q("#lc49-menu");if(mm)mm.remove()}catch(x){}});
    ref.insertAdjacentElement("beforebegin",b);
  }
  function css(){
    if(Q("#lc82-css"))return;const s=document.createElement("style");s.id="lc82-css";
    s.textContent=".lc82{max-width:900px;margin:0 auto}.lc82 h1{margin:2px 0 6px;font-size:clamp(24px,5.4vw,34px)}.lc82-tag{margin:0;color:#fbbf24;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase}"
      +".lc82-h2{font-size:18px;margin:22px 0 8px}.lc82-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:14px 0}.lc82-stat{background:#1e293b;border:1px solid rgba(148,163,184,.2);border-radius:14px;padding:12px}"
      +".lc82-stat b{display:block;font-size:24px;color:#e2e8f0}.lc82-stat b i{font-style:normal;color:#fbbf24;font-size:14px;letter-spacing:1px}.lc82-stat span{font-size:12.5px;color:#94a3b8}"
      +".lc82-when{margin:6px 0 12px;font-size:14px;color:#cbd5e1}.lc82-left{color:#fbbf24;font-weight:800}.lc82-card{border:1px solid rgba(56,189,248,.35)}.lc82-card h3{margin:2px 0 6px;font-size:20px}"
      +".lc82-step{margin:0;color:#38bdf8;font-weight:800;font-size:12px;letter-spacing:.06em;text-transform:uppercase}.lc82-card .btn,.lc82-admin .btn{min-height:44px}.lc82-go{font-size:16px}"
      +".lc82-link{display:grid;grid-template-columns:150px 1fr auto;gap:8px;align-items:end}@media (max-width:620px){.lc82-link{grid-template-columns:1fr}}"
      +".lc82-sw{display:flex;gap:12px;align-items:flex-start;min-height:44px;cursor:pointer;margin:10px 0}.lc82-sw input{width:22px;height:22px;margin-top:3px;flex:none}.lc82-sw small{display:block;color:#94a3b8}"
      +".lc82-me{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px 0}.lc82-me div{background:#0f172a;border:1px solid #334155;border-radius:12px;padding:10px;text-align:center}.lc82-me small{display:block;color:#94a3b8;font-size:11px}.lc82-me b{font-size:22px}"
      +"@media (max-width:420px){.lc82-me{grid-template-columns:repeat(2,1fr)}}.lc82-gn{color:#4ade80}.lc82-gn.is-neg{color:#f87171}"
      +".lc82-board{list-style:none;padding:0;margin:0;display:grid;gap:6px}.lc82-board li{display:grid;grid-template-columns:44px minmax(0,1fr) auto auto;gap:10px;align-items:center;min-height:48px;padding:6px 12px;border-radius:12px;background:#1e293b;border:1px solid rgba(148,163,184,.18)}"
      +".lc82-board li.is-top{border-color:rgba(251,191,36,.55)}.lc82-board li.is-me{outline:2px solid #38bdf8}.lc82-rk{font-weight:800;color:#fbbf24}.lc82-nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lc82-nm small,.lc82-rt{color:#94a3b8;font-size:12px}"
      +"@media (max-width:420px){.lc82-board li{grid-template-columns:40px minmax(0,1fr) auto}.lc82-rt{display:none}}"
      +".lc82-rules{margin:18px 0;padding:10px 14px;border-radius:14px;background:#1e293b;border:1px solid rgba(148,163,184,.18)}.lc82-rules summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:700}.lc82-rules li{margin:6px 0;color:#cbd5e1;font-size:14px}"
      +".lc82-ban{display:flex;gap:10px;align-items:center;margin:0 0 12px;padding:8px 8px 8px 12px;border-radius:14px;border:1px solid rgba(251,191,36,.5);background:linear-gradient(90deg,rgba(251,191,36,.10),rgba(56,189,248,.06))}"
      +".lc82-ban p{margin:0;flex:1;font-size:14px;line-height:1.35}.lc82-ban .btn{min-height:44px;white-space:nowrap}.lc82-ic{font-size:20px}.lc82-x{width:44px;height:44px;border:0;background:transparent;color:#94a3b8;font-size:22px;cursor:pointer;flex:none}"
      +".lc82-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:10px}.lc82-grid .btn-row{grid-column:1/-1}.lc82-cfg summary{min-height:44px;display:flex;align-items:center;gap:6px;cursor:pointer}"
      +".lc82-tw{overflow-x:auto;border-radius:12px;border:1px solid #334155}.lc82-t{width:100%;border-collapse:collapse;font-size:13px}.lc82-t th,.lc82-t td{padding:8px;border-bottom:1px solid #1e293b;text-align:left;vertical-align:top}.lc82-t th{background:#0f172a;color:#94a3b8;font-size:11px;text-transform:uppercase}"
      +".lc82-t tr.is-top td{background:rgba(251,191,36,.07)}.lc82-t tr.is-dq td{opacity:.5;text-decoration:line-through}.lc82-act{display:flex;flex-wrap:wrap;gap:4px;min-width:150px}.lc82-act .btn{min-height:44px;font-size:12px}.lc82-note{color:#fbbf24}"
      +".lc82-sql{width:100%;min-height:160px;font-family:ui-monospace,Menlo,monospace;font-size:12px}.lc82-list{padding-left:20px}.lc82-list li{margin:6px 0}.lc82-list small{color:#94a3b8}"
      +".lc82-rev{list-style:none;padding:0;display:grid;gap:8px}.lc82-rev li{background:#1e293b;border:1px solid rgba(148,163,184,.18);border-radius:12px;padding:10px 12px}.lc82-rev p{margin:6px 0 0}.lc82-stars{color:#fbbf24;letter-spacing:1px}";
    document.head.appendChild(s);
  }
  let deb=0,deb2=0;
  function afterRender(r){r=r||route();clearTimeout(deb);deb=setTimeout(()=>{try{ownerRow();banner(r)}catch(e){}},350)}
  function init(){
    css();
    try{if(typeof MOUNT!=="undefined"){MOUNT.giveaway=mountPage;MOUNT["giveaway-admin"]=mountAdmin;
      try{DOC_TITLES.giveaway="Release Giveaway";ROUTE_TITLES.giveaway="the Release Giveaway";DOC_TITLES["giveaway-admin"]="Release Giveaway & reviews";ROUTE_TITLES["giveaway-admin"]="the giveaway overview";ALIASES["release-giveaway"]="giveaway";ALIASES.challenge="giveaway"}catch(e){}}}catch(e){}
    try{const lv=LC26.levels,o=lv.minLevel;if(!lv.__lc82){lv.__lc82=1;lv.minLevel=r=>/^(giveaway|giveaway-admin)$/.test(r)?1:o(r)}}catch(e){}   /* nobody waits for a quest level to join */
    document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("[data-lc82a]"))return onAdminClick(e);onClick(e)},true);
    document.addEventListener("submit",e=>{if(e.target.closest&&e.target.closest("[data-lc82-cfg]"))return onAdminSubmit(e);onSubmit(e)},true);
    document.addEventListener("change",onChange,true);
    new MutationObserver(()=>{clearTimeout(deb2);deb2=setTimeout(()=>{try{ownerRow()}catch(e){}},200)}).observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>{proof(false).catch(()=>{})},5000);
  }
  return{init:init,afterRender:afterRender,proof:proof,board:board,giveawayLine:giveawayLine,proofHTML:proofHTML,winnersSQL:winnersSQL,_t:{st:()=>ST,ad:()=>AD,setAd:x=>{AD=x},load:load,paint:paint,paintAdmin:paintAdmin,left:left},version:VERSION};
})(); /*@@end lc82*/
