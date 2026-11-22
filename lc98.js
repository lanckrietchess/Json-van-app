/*@@module lc98*/
const LC98=(()=>{
  "use strict";
  /* LC98 (build 9.63.0): the landing page's Elo segment videos and the owner's traffic lanes.
     1. #seg-videos (owner menu > Landing videos per Elo): one video per Elo segment of the landing page's right-hand player
        (0 - 800, 800 - 1200, 1200 - 1600, 1600 - 2000, 2000+ Elo). Per segment: the video address (YouTube, Vimeo or an .mp4 / .webm),
        the YouTube visibility Kyenzo notes for himself (Public / Unlisted / Private, not ready) and "Live on the landing page". One
        Publish writes lc89_cfg 'segvideo' (lc89_cfg_save: admin only on the server, 30 versions of history). The landing page shows the
        segment bar only when at least one segment is live; a segment that is not live shows the walkthrough or "coming soon".
     2. Sources & lanes (in the Funnel Command Center under #analytics, and on its own page #lanes): every source row (the lanes Kyenzo made
        plus every ?src= the funnel saw, lc94_report) with its landing visits, app opens, first reviews, sign-ins and payments, and a Copy
        button for the exact landing page link (/?src=<slug>) and the app link. "New source / lane": a name and a slug (the same rule both
        trackers keep: [a-z0-9-], 2 to 24), where it lands (landing page, the app, or the ManyChat deep link) and an optional Elo segment
        for the landing video (&elo=<segment>); saved in lc98_lanes (admin only) and copied at once.
     SQL: sql/20261121100000_lc98_segment_videos_lanes.sql. Links always point at the production address, never a preview deployment. */
  const VERSION="9.63.0",LIVE="https://lanckrietchesstrainerhub.vercel.app";
  const SEGS=[["0-800","0 - 800 Elo"],["800-1200","800 - 1200 Elo"],["1200-1600","1200 - 1600 Elo"],["1600-2000","1600 - 2000 Elo"],["2000-plus","2000+ Elo"]];
  const YT=[["public","Public"],["unlisted","Unlisted"],["private","Private (not ready)"]];
  const DEST=[["landing","Landing page"],["app","The app"],["deeplink","ManyChat deep link (the app, first review at once)"]];
  const STEPS=[["landing","Landing visits"],["first_open","App opens"],["first_review_done","First reviews"],["signed_in","Sign-ins"],["paid","Paid"]];
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.prototype.slice.call((r||document).querySelectorAll(s));
  const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const say=(m,k,ms)=>{try{toast(m,k||"",ms)}catch(e){}};
  const route=()=>{let h="";try{h=decodeURIComponent(String(location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){h=""}return h.split(/[\/?&]/)[0]};
  const owner=()=>{try{return !!(LC49.owner()||Admin.active)}catch(e){return false}};
  async function tok(){try{return await LC26.sync.token()}catch(e){return""}}
  async function rpc(fn,args,anon){
    try{const t=await tok();if(!t&&!anon)return{status:401,data:null};
      return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:t?{Authorization:"Bearer "+t}:{},body:JSON.stringify(args||{})})}catch(e){return{status:0,data:null,error:String(e&&e.message||e)}}
  }
  const missing=r=>!!(r&&(r.status===404||(r.data&&/PGRST202|does not exist|42883|42P01/i.test(String(r.data.code||"")+String(r.data.message||"")))));
  const SQLF="sql/20261121100000_lc98_segment_videos_lanes.sql";

  /* ---------- pure helpers (also used by the tests) ---------- */
  function parseVideo(u){let x;try{x=new URL(String(u||""))}catch(e){return null}if(x.protocol!=="https:")return null;
    const h=x.hostname.replace(/^www\./,"").toLowerCase(),p=x.pathname;let id="",m;
    if(h==="youtu.be")id=p.slice(1);else if(h==="youtube.com"||h==="m.youtube.com"||h==="youtube-nocookie.com")id=p==="/watch"?(x.searchParams.get("v")||""):((m=/^\/(?:embed|shorts|live)\/([\w-]{11})/.exec(p))?m[1]:"");
    if(/^[\w-]{11}$/.test(id))return{t:"yt",id:id};
    if(h==="vimeo.com"||h==="player.vimeo.com"){m=/(\d{6,12})/.exec(p);if(m)return{t:"vm",id:m[1]}}
    if(/\.(mp4|webm)$/i.test(p))return{t:"file"};return null}
  const slugify=s=>String(s||"").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,24).replace(/-+$/,"");
  const slugOk=s=>/^[a-z0-9][a-z0-9-]{1,23}$/.test(String(s||""));
  function origin(){try{const h=location.hostname;if(h==="lanckrietchesstrainerhub.vercel.app"||(!/\.vercel\.app$/.test(h)&&!/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(h)&&/^https:$/.test(location.protocol)))return location.origin}catch(e){}return LIVE}
  /* the exact address Kyenzo pastes into ManyChat, TikTok or a DM */
  function landingLink(src,seg){const s=String(src||"").toLowerCase(),q=[];if(s&&s!=="direct"&&s!=="(none)"&&/^[a-z0-9._-]{1,40}$/.test(s))q.push("src="+encodeURIComponent(s));if(seg&&SEGS.some(x=>x[0]===seg))q.push("elo="+seg);return origin()+"/"+(q.length?"?"+q.join("&"):"")}
  function appLink(src,dest){const s=String(src||"").toLowerCase(),ok=s&&s!=="direct"&&s!=="(none)"&&/^[a-z0-9._-]{1,40}$/.test(s);
    if(dest==="deeplink")return origin()+"/app.html?u=USERNAME&site=chesscom"+(ok?"&src="+encodeURIComponent(s):"");
    return origin()+"/app.html"+(ok?"?src="+encodeURIComponent(s):"")}
  function linkFor(l){return l&&l.dest&&l.dest!=="landing"?appLink(l.slug,l.dest):landingLink(l&&l.slug,l&&l.seg)}
  /* lc94_report rows (step, src, players) + the lanes -> one row per source, lanes first */
  function pivot(report,lanes){
    const by={},order=[];
    (lanes||[]).forEach(l=>{by[l.slug]={slug:l.slug,lane:l,n:{}};order.push(l.slug)});
    (report||[]).forEach(r=>{const s=String(r.src||"(none)").toLowerCase();if(!by[s]){by[s]={slug:s,lane:null,n:{}};order.push(s)}by[s].n[r.step]=(by[s].n[r.step]||0)+(+r.players||0)});
    const rows=order.map(k=>by[k]);
    return rows.filter(x=>x.lane).concat(rows.filter(x=>!x.lane&&x.slug!=="(none)").sort((a,b)=>(b.n.landing||0)-(a.n.landing||0)),rows.filter(x=>!x.lane&&x.slug==="(none)"));
  }
  function segDoc(form){
    const d={v:1,on:!!(form.elements.on&&form.elements.on.checked),label:String(form.elements.label&&form.elements.label.value||"").trim().slice(0,80)||"Pick your rating",def:String(form.elements.def&&form.elements.def.value||""),segs:{}};
    SEGS.forEach(s=>{const u=String((form.elements["u-"+s[0]]||{}).value||"").trim(),y=String((form.elements["y-"+s[0]]||{}).value||""),lv=!!(form.elements["l-"+s[0]]&&form.elements["l-"+s[0]].checked);d.segs[s[0]]={url:u,yt:y,live:lv&&!!u}});
    return d;
  }
  function segProblems(d){
    const p=[];SEGS.forEach(s=>{const x=d.segs[s[0]]||{};if(x.url&&!parseVideo(x.url))p.push(s[1]+": the link is not a YouTube, Vimeo or .mp4 / .webm address (https).");
      if(x.live&&x.yt==="private")p.push(s[1]+": a Private YouTube video does not play for visitors. Make it Unlisted or Public on YouTube first.")});
    return p;
  }
  function csv(rows){
    const c=v=>{v=String(v==null?"":v);return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
    return["Source,Slug,Lands on,Elo video,Landing link,App link,"+STEPS.map(s=>s[1]).join(",")].concat(rows.map(r=>{const l=r.lane||{slug:r.slug,dest:"landing"};
      return[r.lane?r.lane.name:r.slug==="(none)"?"Direct / no source":r.slug,r.slug,(DEST.filter(x=>x[0]===(l.dest||"landing"))[0]||DEST[0])[1].split(" (")[0],l.seg||"",landingLink(r.slug,l.seg),appLink(r.slug,l.dest)].concat(STEPS.map(s=>r.n[s[0]]||0)).map(c).join(",")})).join("\n")+"\n";
  }

  /* ---------- copy ---------- */
  async function copy(u){
    let done=false;try{await navigator.clipboard.writeText(u);done=true}catch(e){}
    if(!done){try{const t=document.createElement("textarea");t.value=u;t.setAttribute("readonly","");t.style.cssText="position:fixed;left:-9999px;top:0";document.body.appendChild(t);t.select();done=document.execCommand("copy");t.remove()}catch(e){}}
    say(done?"Copied: "+u:"Select and copy: "+u,done?"good":"",done?2600:9000);return done;
  }

  /* ---------- 1. the segment videos page ---------- */
  let SEG={doc:null,at:null,hist:[]};
  function statusOf(x){
    if(!x||!x.url)return["none","No video yet: visitors see the walkthrough or “coming soon”"];
    if(!parseVideo(x.url))return["bad","Link not recognised"];
    if(x.live&&x.yt==="private")return["warn","Live, but Private on YouTube: it will not play"];
    return x.live?["live","Live on the landing page"]:["ready","Ready, not shown yet"];
  }
  function thumb(u){const v=parseVideo(u);return v&&v.t==="yt"?'<img class="lc98-th" alt="" loading="lazy" src="https://i.ytimg.com/vi/'+E(v.id)+'/mqdefault.jpg">':'<span class="lc98-th lc98-th0" aria-hidden="true">▶</span>'}
  function segRow(s,x){
    x=x||{};const st=statusOf(x),id=s[0];
    return'<fieldset class="lc98-seg" data-lc98-row="'+id+'"><legend>'+E(s[1])+'</legend>'
      +'<div class="lc98-sg">'+thumb(x.url)+'<div class="lc98-sf"><label class="field"><span class="field-label">Video link</span><input class="input" type="url" inputmode="url" name="u-'+id+'" value="'+E(x.url||"")+'" placeholder="https://youtu.be/…" maxlength="400"></label>'
      +'<div class="lc98-sr"><label class="field"><span class="field-label">YouTube visibility</span><select class="input" name="y-'+id+'">'+YT.map(y=>'<option value="'+y[0]+'"'+((x.yt||"unlisted")===y[0]?" selected":"")+">"+E(y[1])+"</option>").join("")+'</select></label>'
      +'<label class="lc98-tg"><input type="checkbox" name="l-'+id+'"'+(x.live?" checked":"")+'> <span>Live on the landing page</span></label></div>'
      +'<p class="lc98-st is-'+st[0]+'" data-lc98-st>'+E(st[1])+'</p>'
      +'<div class="btn-row">'+(x.url&&parseVideo(x.url)?'<a class="btn btn-ghost btn-sm" href="'+E(x.url)+'" target="_blank" rel="noopener noreferrer">Open the video</a>':"")
      +(x.live?'<a class="btn btn-ghost btn-sm" href="'+E(landingLink("",id))+'" target="_blank" rel="noopener">Test on the landing page</a>':"")
      +'<button type="button" class="btn btn-quiet btn-sm" data-lc98="seg-copy" data-seg="'+id+'">Copy landing link for this Elo</button></div></div></div></fieldset>';
  }
  function segHTML(){
    const d=SEG.doc||{},segs=d.segs||{},live=SEGS.filter(s=>{const x=segs[s[0]];return x&&x.live&&parseVideo(x.url)}).length;
    return'<form class="lc98-form" data-lc98-segform novalidate>'
      +'<div class="panel pad stack"><label class="lc98-tg"><input type="checkbox" name="on"'+(d.on===false?"":" checked")+'> <span><b>Show the Elo selector on the landing page</b><small>The bar appears above the right-hand video as soon as one segment is live. Now: '+live+' of 5 live.</small></span></label>'
      +'<div class="lc98-sr"><label class="field"><span class="field-label">Line above the bar</span><input class="input" name="label" maxlength="80" value="'+E(d.label||"Pick your rating")+'"></label>'
      +'<label class="field"><span class="field-label">Open on (when the visitor did not pick one)</span><select class="input" name="def"><option value="">The first live segment</option>'+SEGS.map(s=>'<option value="'+s[0]+'"'+(d.def===s[0]?" selected":"")+">"+E(s[1])+"</option>").join("")+"</select></label></div></div>"
      +SEGS.map(s=>segRow(s,segs[s[0]])).join("")
      +'<div class="lc98-bar"><p class="form-msg" data-lc98-msg aria-live="polite">'+(SEG.at?"Last published "+E(new Date(SEG.at).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})):"Not published yet.")+'</p><button class="btn btn-primary" type="submit">Save &amp; Publish</button></div></form>'
      +'<details class="panel pad lc98-hist" data-lc98-hist><summary><b>History</b> <small class="muted">(the last 30 versions)</small></summary><div data-lc98-histlist><p class="small muted">Open to load.</p></div></details>';
  }
  async function loadSeg(){
    const r=await rpc("lc89_cfg_public",{p_k:"segvideo"},true);
    if(missing(r))return"missing";
    if(r&&r.status===200&&r.data&&r.data.ok){SEG.doc=r.data.v&&typeof r.data.v==="object"?r.data.v:{};SEG.at=r.data.updated_at||null;return"ok"}
    SEG.doc=SEG.doc||{};return"error";
  }
  async function mountSeg(view){
    if(!owner()){view.innerHTML='<section class="panel pad"><h1>Landing videos per Elo</h1><p class="muted">This page is for the owner.</p></section>';return null}
    view.innerHTML='<section class="lc98"><p class="lc98-kick">Owner · landing page</p><h1>Landing videos per Elo</h1><p class="muted">One video per rating group for the player on the right of the landing page. Paste the link, set the YouTube visibility you chose, and switch a segment live when its video is finished. The story and the install button on the left stay as they are.</p><div data-lc98-seg><p class="muted">Loading…</p></div></section>';
    const st=await loadSeg(),h=Q("[data-lc98-seg]",view);if(!h)return null;
    if(st==="missing"){h.innerHTML='<div class="panel pad"><b>Run '+SQLF+' first.</b></div>';return null}
    h.innerHTML=segHTML();return null;
  }
  async function saveSeg(f){
    const msg=Q("[data-lc98-msg]",f),d=segDoc(f),probs=segProblems(d);
    QA("[data-lc98-row]",f).forEach(row=>{const id=row.getAttribute("data-lc98-row"),st=statusOf(d.segs[id]),p=Q("[data-lc98-st]",row);if(p){p.className="lc98-st is-"+st[0];p.textContent=st[1]}});
    if(probs.some(x=>/not a YouTube/.test(x))){msg.textContent=probs.join(" ");msg.className="form-msg is-bad";return}
    msg.textContent="Publishing…";msg.className="form-msg";
    const r=await rpc("lc89_cfg_save",{p_k:"segvideo",p_v:d});
    if(missing(r)){msg.textContent="Run "+SQLF+" first.";msg.className="form-msg is-bad";return}
    const ok=r&&r.status===200&&r.data&&r.data.ok;
    if(!ok){const e=r&&r.data&&(r.data.error||r.data.message)||("HTTP "+(r&&r.status));msg.textContent="Not published: "+({url:"a link must start with https:// and have no spaces.",live_without_url:"a live segment needs a link.",unsafe:"remove the HTML from the text.",not_admin:"sign in as the owner.",key:"run "+SQLF+" first (the server does not know this setting yet)."}[e]||e);msg.className="form-msg is-bad";return}
    SEG.doc=d;SEG.at=r.data.updated_at||new Date().toISOString();
    const live=SEGS.filter(s=>d.segs[s[0]].live).length;
    say("Published: "+live+" of 5 Elo videos live.","good");
    const h=Q("[data-lc98-seg]");if(h){h.innerHTML=segHTML();const m2=Q("[data-lc98-msg]",h);if(m2){m2.textContent="Published. "+(probs.length?probs.join(" "):live?"Visitors see it on their next visit.":"No segment is live: the landing page keeps its usual video.");m2.className="form-msg "+(probs.length?"is-bad":"is-good")}}
  }
  async function loadHist(box){
    const r=await rpc("lc89_cfg_history",{p_k:"segvideo"}),l=r&&r.data&&r.data.rows||[];
    box.innerHTML=l.length?'<ul class="lc98-hl">'+l.map(x=>"<li><span>"+E(new Date(x.saved_at).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))+" · "+E(x.saved_by||"")+'</span><button type="button" class="btn btn-quiet btn-sm" data-lc98="restore" data-id="'+(+x.id)+'">Restore</button></li>').join("")+"</ul>":'<p class="small muted">No earlier versions yet.</p>';
  }

  /* ---------- 2. sources & lanes ---------- */
  let SRC={days:+rd("lc98-days",30)||30,lanes:[],short:[],report:[],state:"",at:0,made:null};
  async function loadSources(force){
    if(!force&&SRC.at&&Date.now()-SRC.at<20000)return SRC.state;
    const [a,b]=await Promise.all([rpc("lc98_lanes",{}),rpc("lc94_report",{p_days:SRC.days})]);
    SRC.state=missing(a)?"missing":(a&&a.status===200&&a.data&&a.data.ok)?"ok":(a&&a.status===401?"signin":"error");
    SRC.lanes=SRC.state==="ok"?(a.data.rows||[]):[];SRC.short=SRC.state==="ok"?(a.data.short_links||[]):[];
    SRC.report=b&&b.status===200&&Array.isArray(b.data)?b.data:[];SRC.at=Date.now();return SRC.state;
  }
  function rowHTML(r){
    const l=r.lane,name=l?l.name:r.slug==="(none)"?"Direct / no source":r.slug,dest=l?l.dest:"landing",seg=l?l.seg:"";
    const main=l?linkFor(l):landingLink(r.slug,""),segName=(SEGS.filter(x=>x[0]===seg)[0]||[])[1];
    return'<tr class="'+(l&&!l.active?"is-off":"")+'" data-lc98-src-row="'+E(r.slug)+'"><th scope="row"><b>'+E(name)+'</b><small><code>'+E(r.slug==="(none)"?"no ?src=":"?src="+r.slug)+"</code>"
      +(l?" · "+E((DEST.filter(x=>x[0]===dest)[0]||DEST[0])[1].split(" (")[0])+(segName?" · "+E(segName)+" video":"")+(l.active?"":" · archived"):" · seen in the data")+(SRC.short.indexOf(r.slug)>=0?" · also a /l/ short link":"")+"</small></th>"
      +STEPS.map(s=>"<td>"+(+r.n[s[0]]||0)+"</td>").join("")
      +'<td class="lc98-act"><button type="button" class="btn btn-primary btn-sm" data-lc98="copy" data-u="'+E(main)+'">Copy link</button>'
      +(dest!=="landing"?'<button type="button" class="btn btn-ghost btn-sm" data-lc98="copy" data-u="'+E(landingLink(r.slug,seg))+'">Landing link</button>':'<button type="button" class="btn btn-ghost btn-sm" data-lc98="copy" data-u="'+E(appLink(r.slug,"app"))+'">App link</button>')
      +(l?'<button type="button" class="btn btn-quiet btn-sm" data-lc98="lane-arch" data-s="'+E(l.slug)+'" data-on="'+(l.active?"0":"1")+'">'+(l.active?"Archive":"Restore")+"</button>"
        :(slugOk(r.slug)?'<button type="button" class="btn btn-quiet btn-sm" data-lc98="lane-adopt" data-s="'+E(r.slug)+'">Make it a lane</button>':""))+"</td></tr>";
  }
  function sourcesHTML(){
    if(SRC.state==="missing")return'<div class="panel pad"><b>Run '+SQLF+' first.</b> <span class="small muted">The source table below still works.</span></div>';
    if(SRC.state==="signin")return'<div class="panel pad"><p>Sign in as the owner to see the sources.</p></div>';
    if(SRC.state==="error")return'<div class="panel pad"><p>Could not load the lanes.</p><button type="button" class="btn btn-ghost btn-sm" data-lc98="src-reload">Try again</button></div>';
    const rows=pivot(SRC.report,SRC.lanes),made=SRC.made;
    return'<div class="lc98-src">'
      +'<div class="lc98-srch"><p class="small muted">Every row is a ?src= source: your lanes first, then the sources the funnel saw. Copy link = the exact address to paste into ManyChat, TikTok, a DM or an ad. Counts are players (devices) in the last</p><div class="lc70-filter">'+[7,14,30,90].map(d=>'<button type="button" class="lc70-f'+(SRC.days===d?" is-on":"")+'" data-lc98="days" data-d="'+d+'">'+d+" days</button>").join("")+'</div><button type="button" class="btn btn-ghost btn-sm" data-lc98="csv">Export CSV</button></div>'
      +(made?'<div class="lc98-made" role="status"><b>Lane “'+E(made.name)+'” is ready.</b><div class="lc98-mr"><input class="input" readonly value="'+E(linkFor(made))+'" data-lc98-made aria-label="The new link"><button type="button" class="btn btn-primary btn-sm" data-lc98="copy" data-u="'+E(linkFor(made))+'">Copy link</button></div>'+(made.dest==="deeplink"?'<p class="small muted">In ManyChat, replace USERNAME with the subscriber’s Chess.com username field. Use site=lichess for Lichess names.</p>':"")+"</div>":"")
      +'<div class="lc98-tw"><table class="lc98-t"><thead><tr><th scope="col">Source</th>'+STEPS.map(s=>'<th scope="col">'+E(s[1])+"</th>").join("")+'<th scope="col"><span class="sr-only">Links</span></th></tr></thead><tbody>'
      +(rows.length?rows.map(rowHTML).join(""):'<tr><td colspan="'+(STEPS.length+2)+'" class="muted">No sources yet. Make your first lane below.</td></tr>')+"</tbody></table></div>"
      +'<form class="panel pad lc98-new" data-lc98-lane novalidate><h3>New source / lane</h3><p class="small muted">For a new channel or campaign (Facebook ads, a new ManyChat flow, a cold-DM batch). Everyone who arrives through its link is counted under its slug.</p>'
      +'<div class="lc98-nr"><label class="field"><span class="field-label">Name</span><input class="input" name="name" maxlength="60" required placeholder="Facebook ads – November"></label>'
      +'<label class="field"><span class="field-label">Slug (in the link)</span><input class="input" name="slug" maxlength="24" required pattern="[a-z0-9][a-z0-9-]{1,23}" placeholder="fb-ads-nov" autocapitalize="off" spellcheck="false"></label>'
      +'<label class="field"><span class="field-label">Lands on</span><select class="input" name="dest">'+DEST.map(d=>'<option value="'+d[0]+'">'+E(d[1])+"</option>").join("")+"</select></label>"
      +'<label class="field"><span class="field-label">Elo video on the landing page (optional)</span><select class="input" name="seg"><option value="">The visitor picks</option>'+SEGS.map(s=>'<option value="'+s[0]+'">'+E(s[1])+"</option>").join("")+"</select></label>"
      +'<label class="field lc98-wide"><span class="field-label">Note (optional)</span><input class="input" name="note" maxlength="200" placeholder="Budget €5 a day, video 3"></label></div>'
      +'<p class="small muted">Link: <code data-lc98-preview>'+E(landingLink("your-slug",""))+'</code></p><p class="form-msg" data-lc98-lmsg aria-live="polite"></p>'
      +'<div class="btn-row"><button class="btn btn-primary" type="submit">Create lane &amp; copy link</button></div></form></div>';
  }
  async function paintSources(force){
    const hosts=QA("[data-lc98-src]");if(!hosts.length)return;
    if(!owner()){hosts.forEach(h=>{h.innerHTML=""});return}
    hosts.forEach(h=>{if(!h.innerHTML.trim())h.innerHTML='<p class="small muted">Loading the sources…</p>'});
    await loadSources(force);const html=sourcesHTML();QA("[data-lc98-src]").forEach(h=>{h.innerHTML=html});
  }
  function mountLanes(view){
    if(!owner()){view.innerHTML='<section class="panel pad"><h1>Sources &amp; lanes</h1><p class="muted">This page is for the owner.</p></section>';return null}
    view.innerHTML='<section class="lc98"><p class="lc98-kick">Owner · traffic</p><h1>Sources &amp; lanes</h1><p class="muted">Copy the landing page link of any source, or make a new lane for a new channel. The full funnel is in the <a href="#analytics">Funnel Command Center</a>.</p><section data-lc98-src></section></section>';
    paintSources(true);return null;
  }
  function preview(f){const p=Q("[data-lc98-preview]",f);if(!p)return;const s=f.elements.slug.value||"your-slug";p.textContent=linkFor({slug:s,dest:f.elements.dest.value,seg:f.elements.seg.value})}
  async function createLane(f){
    const msg=Q("[data-lc98-lmsg]",f),E2=f.elements,slug=String(E2.slug.value||"").trim().toLowerCase(),name=String(E2.name.value||"").trim();
    if(!name){msg.textContent="Give the lane a name.";msg.className="form-msg is-bad";return}
    if(!slugOk(slug)){msg.textContent="The slug: 2 to 24 characters, small letters, digits and dashes (no spaces or underscores), not starting with a dash.";msg.className="form-msg is-bad";return}
    const lane={slug:slug,name:name,dest:E2.dest.value,seg:E2.seg.value,note:String(E2.note.value||"").trim(),active:true};
    const link=linkFor(lane);let copied=false;try{await navigator.clipboard.writeText(link);copied=true}catch(e){}   /* copy inside the click, before the round trip */
    msg.textContent="Saving…";msg.className="form-msg";
    const r=await rpc("lc98_lane_save",{p:lane});
    if(missing(r)){msg.textContent="Run "+SQLF+" first.";msg.className="form-msg is-bad";return}
    const d=r&&r.data||{};
    if(!(r&&r.status===200&&d.ok)){msg.textContent=({taken:"That slug is already a lane: pick another one.",slug:"That slug is not allowed.",name:"Give the lane a name (up to 60 characters).",unsafe:"Remove the HTML from the name or note."}[d.error])||"Could not save ("+(d.error||d.message||"HTTP "+(r&&r.status))+").";msg.className="form-msg is-bad";return}
    SRC.made=lane;SRC.at=0;
    say(copied?"Lane created. Link copied: "+link:"Lane created: "+link,"good",4000);
    await paintSources(true);const inp=Q("[data-lc98-made]");if(inp&&!copied){try{inp.focus();inp.select()}catch(e){}}
  }

  /* ---------- events ---------- */
  let armed="";
  async function onClick(e){
    const b=e.target&&e.target.closest&&e.target.closest("[data-lc98]");if(!b||!owner())return;const a=b.getAttribute("data-lc98");e.preventDefault();
    if(a==="copy"){copy(b.getAttribute("data-u"));return}
    if(a==="seg-copy"){copy(landingLink("",b.getAttribute("data-seg")));return}
    if(a==="days"){SRC.days=+b.getAttribute("data-d")||30;wr("lc98-days",SRC.days);paintSources(true);return}
    if(a==="src-reload"){paintSources(true);return}
    if(a==="csv"){const rows=pivot(SRC.report,SRC.lanes),blob=new Blob([csv(rows)],{type:"text/csv"}),u=URL.createObjectURL(blob),x=document.createElement("a");x.href=u;x.download="lanckriet-sources-"+new Date().toISOString().slice(0,10)+".csv";document.body.appendChild(x);x.click();x.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);return}
    if(a==="lane-adopt"){const f=Q("[data-lc98-lane]");if(!f)return;f.elements.slug.value=b.getAttribute("data-s");f.elements.name.value=b.getAttribute("data-s");preview(f);f.scrollIntoView({block:"center"});f.elements.name.focus();f.elements.name.select();return}
    if(a==="lane-arch"){const s=b.getAttribute("data-s"),l=SRC.lanes.filter(x=>x.slug===s)[0];if(!l)return;
      const r=await rpc("lc98_lane_save",{p:Object.assign({},l,{update:true,active:b.getAttribute("data-on")==="1"})});say(r&&r.data&&r.data.ok?(b.getAttribute("data-on")==="1"?"Lane restored.":"Lane archived. Its link keeps counting."):"Could not save.",r&&r.data&&r.data.ok?"good":"bad");SRC.made=null;paintSources(true);return}
    if(a==="restore"){const id=b.getAttribute("data-id");if(armed!==id){armed=id;b.textContent="Tap again to restore";setTimeout(()=>{if(armed===id)armed=""},5000);return}armed="";
      const r=await rpc("lc89_cfg_restore",{p_id:+id});if(r&&r.data&&r.data.ok){say("Restored and published.","good");const v=Q("#view");if(v)mountSeg(v)}else say("Could not restore.","bad");return}
  }
  function onSubmit(e){
    const f=e.target;if(!f||!f.matches)return;
    if(f.matches("[data-lc98-segform]")){e.preventDefault();if(owner())saveSeg(f);return}
    if(f.matches("[data-lc98-lane]")){e.preventDefault();if(owner())createLane(f);return}
  }
  function onInput(e){
    const t=e.target;if(!t||!t.closest)return;const f=t.closest("[data-lc98-lane]");
    if(f){if(t.name==="name"&&!f.__slugTouched){f.elements.slug.value=slugify(t.value)}if(t.name==="slug"){f.__slugTouched=!!t.value;const v=t.value.toLowerCase().replace(/[^a-z0-9-]/g,"-").slice(0,24);if(v!==t.value)t.value=v}preview(f);return}
    const row=t.closest("[data-lc98-row]");
    if(row&&/^(u|y|l)-/.test(t.name||"")){const id=row.getAttribute("data-lc98-row"),fm=row.closest("form"),x={url:fm.elements["u-"+id].value.trim(),yt:fm.elements["y-"+id].value,live:fm.elements["l-"+id].checked},st=statusOf(x),p=Q("[data-lc98-st]",row);if(p){p.className="lc98-st is-"+st[0];p.textContent=st[1]}
      if(t.name==="u-"+id){const th=Q(".lc98-th",row);if(th)th.outerHTML=thumb(x.url)}}
  }
  function onToggle(e){const d=e.target;if(d&&d.matches&&d.matches("[data-lc98-hist]")&&d.open){const l=Q("[data-lc98-histlist]",d);if(l)loadHist(l)}}

  function ownerRows(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc98-own]",m)||!owner())return;
    const ref=Q("[data-lc90-own]",m)||Q("[data-lc86-own]",m)||Q("[data-lc73-own]",m);if(!ref)return;
    const mk=(href,t,s)=>{const b=document.createElement("a");b.href=href;b.className="lc49-mi lc49-tool";b.setAttribute("data-lc98-own","");b.innerHTML="<span><b>"+t+"</b><small>"+s+"</small></span>";b.addEventListener("click",()=>{try{const mm=Q("#lc49-menu");if(mm)mm.remove()}catch(x){}});return b};
    const a=mk("#seg-videos","Landing videos per Elo","One video per rating group above the landing page player"),b=mk("#lanes","Sources &amp; lanes (?src= links)","Copy a source’s landing link, make a new lane");
    ref.insertAdjacentElement("beforebegin",a);a.insertAdjacentElement("afterend",b);
  }
  function css(){
    if(Q("#lc98-css"))return;const s=document.createElement("style");s.id="lc98-css";
    s.textContent=".lc98{max-width:980px;margin:0 auto;display:grid;gap:12px}.lc98 h1{margin:0}.lc98-kick{margin:0;color:#fbbf24;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase}"
      +".lc98-form{display:grid;gap:12px}.lc98-seg{margin:0;padding:14px;border:1px solid #334155;border-radius:16px;background:#1e293b;min-width:0}.lc98-seg legend{padding:0 6px;font-weight:800;color:#fff}"
      +".lc98-sg{display:grid;grid-template-columns:150px minmax(0,1fr);gap:14px;align-items:start}.lc98-sf{display:grid;gap:8px;min-width:0}.lc98-th{width:150px;aspect-ratio:16/9;object-fit:cover;border-radius:10px;background:#0f172a;display:block}"
      +".lc98-th0{display:grid;place-items:center;color:#475569;font-size:26px}.lc98-sr{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;align-items:end}"
      +".lc98-tg{display:flex;gap:10px;align-items:flex-start;min-height:44px;cursor:pointer}.lc98-tg input{width:22px;height:22px;margin-top:2px;flex:none;accent-color:#38bdf8}.lc98-tg span{display:grid;gap:2px}.lc98-tg small{color:#94a3b8}"
      +".lc98-st{margin:0;font-size:13px;font-weight:700;padding:6px 10px;border-radius:10px;justify-self:start}.lc98-st.is-live{background:rgba(74,222,128,.12);color:#4ade80}.lc98-st.is-ready{background:rgba(56,189,248,.12);color:#38bdf8}"
      +".lc98-st.is-none{background:#0f172a;color:#94a3b8}.lc98-st.is-bad{background:rgba(248,113,113,.14);color:#fca5a5}.lc98-st.is-warn{background:rgba(251,191,36,.14);color:#fbbf24}"
      +".lc98-bar{position:sticky;bottom:0;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:12px 14px;border-radius:14px;background:#0f172a;border:1px solid #334155;z-index:2}.lc98-bar .form-msg{margin:0;flex:1 1 220px}"
      +".form-msg.is-bad{color:#fca5a5}.form-msg.is-good{color:#4ade80}.lc98 .btn,.lc98-src .btn{min-height:44px}.lc98-hl{list-style:none;margin:0;padding:0;display:grid;gap:6px}.lc98-hl li{display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap}"
      +".lc98-src{display:grid;gap:12px;min-width:0}.lc98-srch{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.lc98-srch p{margin:0;flex:1 1 260px}"
      +".lc98-tw{overflow-x:auto;border:1px solid #334155;border-radius:14px;max-width:100%}.lc98-t{width:100%;border-collapse:collapse;font-size:14px}.lc98-t th,.lc98-t td{padding:10px;border-bottom:1px solid #1e293b;text-align:right;vertical-align:middle}"
      +".lc98-t thead th{color:#94a3b8;font-size:12px;font-weight:700;white-space:nowrap}.lc98-t thead th:first-child{text-align:left}.lc98-t tbody th{text-align:left;min-width:190px}.lc98-t tbody th b{display:block}.lc98-t small{color:#94a3b8;font-weight:400}.lc98-t code{color:#38bdf8}"
      +".lc98-t tr.is-off{opacity:.55}.lc98-act{white-space:nowrap}.lc98-act .btn{margin:2px}.lc98-made{padding:12px 14px;border-radius:14px;border:2px solid #4ade80;background:rgba(74,222,128,.08);display:grid;gap:8px}"
      +".lc98-mr{display:flex;gap:8px;flex-wrap:wrap}.lc98-mr .input{flex:1 1 260px;min-width:0}.lc98-new{display:grid;gap:10px}.lc98-new h3{margin:0}.lc98-nr{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.lc98-wide{grid-column:1/-1}"
      +".lc98-new code{overflow-wrap:anywhere;color:#38bdf8}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}"
      +"@media (max-width:620px){.lc98-sg{grid-template-columns:1fr}.lc98-th{width:100%;max-width:320px}.lc98-t{font-size:13px}.lc98-t thead{display:none}.lc98-t,.lc98-t tbody,.lc98-t tr,.lc98-t th,.lc98-t td{display:block;width:100%}"
      +".lc98-t tr{padding:10px;border-bottom:1px solid #334155}.lc98-t td,.lc98-t tbody th{padding:3px 0;border:0;text-align:left}.lc98-t td:not(.lc98-act){display:inline-block;width:auto;margin-right:12px}.lc98-t td:not(.lc98-act)::before{color:#94a3b8;font-size:12px;margin-right:4px}"
      +STEPS.map((s,i)=>".lc98-t td:nth-of-type("+(i+1)+")::before{content:'"+s[1]+"'}").join("")+".lc98-act{white-space:normal}}";
    document.head.appendChild(s);
  }
  let deb=0;
  function afterRender(r){clearTimeout(deb);deb=setTimeout(()=>{ownerRows();if(QA("[data-lc98-src]").length&&!QA("[data-lc98-src] .lc98-src").length)paintSources()},400)}
  function init(){
    try{
      css();
      if(typeof MOUNT!=="undefined"){MOUNT["seg-videos"]=mountSeg;MOUNT.lanes=mountLanes;
        try{DOC_TITLES["seg-videos"]="Landing videos per Elo";DOC_TITLES.lanes="Sources & lanes";ROUTE_TITLES["seg-videos"]="the landing videos";ROUTE_TITLES.lanes="the sources"}catch(e){}}
      try{const lv=LC26.levels,o=lv.minLevel;if(lv&&!lv.__lc98){lv.__lc98=1;lv.minLevel=r=>r==="seg-videos"||r==="lanes"?1:o(r)}}catch(e){}
      document.addEventListener("click",onClick);document.addEventListener("submit",onSubmit,true);document.addEventListener("input",onInput);document.addEventListener("change",onInput);document.addEventListener("toggle",onToggle,true);
      /* 9.65.0: a throttle, not a debounce: the page never stops changing, so a reset timer never fired and the owner menu missed its rows */
      let d2=0;new MutationObserver(()=>{if(d2)return;d2=setTimeout(()=>{d2=0;ownerRows()},250)}).observe(document.body,{childList:true,subtree:true});
    }catch(e){console.error("lc98",e)}
  }
  return{init:init,afterRender:afterRender,version:VERSION,paintSources:paintSources,landingLink:landingLink,appLink:appLink,
    _t:{parseVideo:parseVideo,slugify:slugify,slugOk:slugOk,landingLink:landingLink,appLink:appLink,linkFor:linkFor,pivot:pivot,csv:csv,segProblems:segProblems,statusOf:statusOf,SEGS:SEGS,origin:origin}};
})(); /*@@end lc98*/
