/*@@module lc72*/
const LC72=(()=>{
  "use strict";
  /* LC72 (build 9.37.0, launch polish):
     1. Landing page editor (#landing-editor, owner only): sections on/off, Wall of Love and Proof Queue cards, screenshots per place (uploaded to the
        public Storage bucket lc72-landing), the texts (LC69) and a live preview. index.html reads lc72_landing_public().
     2. Library: every item is a two-part page: left the cover, the credentials and the free summary; right the video course behind a token lock.
        Tapping the lock opens the token price list. The 2000+ Blueprint gets the luxury spotlight. The 4 classic summaries can be moved into the
        editable shelf, so everything can be edited and deleted.
     3. Titles: Pro and library buyers are "Lanckriet Chess Apprentice", VIP is "Lanckriet Chess Student" (the database decides, lc72_titles / lc72_me).
     4. Coach chat (#coach-chat): Kyenzo talks with paying members and buyers; members can pin a message to the top for tokens; automated welcome
        messages after a trial, Pro, VIP or a purchase (lc72_auto_check). SQL: sql/20261113100000_lc72_lc73_launch_funnels.sql. */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0].toLowerCase();
  const ic=(n)=>{try{return icon(n)}catch(e){return""}};
  const say=(t,k)=>{try{toast(t,k||"")}catch(e){}};
  const face=(e,s)=>{try{return LC67.face(e,s)}catch(x){return'<span aria-hidden="true">♞</span>'}};
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const owner=()=>{try{return !!(LC49.owner()||Admin.active)}catch(e){return false}};
  const cfg=()=>{try{return LC26.sync.cfg()}catch(e){return{url:"",key:""}}};
  async function tok(){try{return await LC26.sync.token()}catch(e){return""}}
  async function rpc(fn,args,anon){const t=await tok();if(!t&&!anon)return{status:0,data:null,noauth:true};
    try{return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:t?{Authorization:"Bearer "+t}:{},body:JSON.stringify(args||{})})}catch(e){return{status:0,data:null}}}
  const missing=r=>r&&(r.status===404||(r.data&&/PGRST202|does not exist/i.test(String(r.data.code||"")+String(r.data.message||""))));
  const sheet=(title,html,onMount,cls)=>{try{return openSheet({title:title,html:html,noFocus:true,cls:"lc72-sheet "+(cls||""),onMount:onMount})}catch(e){console.error(e);return null}};
  const myName=()=>{try{const p=App.profile||{};return String(p.name||p.first||"").split(" ")[0]||String((sess()||{}).email||"").split("@")[0]||"Member"}catch(e){return"Member"}};
  const TITLE={S:"Lanckriet Chess Student",A:"Lanckriet Chess Apprentice",C:"Coach"},SHORT={S:"Student",A:"Apprentice",C:"Coach"};
  const MARK={S:"\u200B",A:"\u200C",C:"\u200D"},SEP="\u2063";

  /* ============ me ============ */
  let meC={at:0,d:null};
  async function me(force){if(!sess())return null;if(!force&&meC.d&&Date.now()-meC.at<300000)return meC.d;const r=await rpc("lc72_me",{});const d=r.data&&r.data.ok?r.data:null;meC={at:Date.now(),d:d};return d}

  /* ============ 1. landing editor ============ */
  let land=null,tab=rd("lc72-tab","sections");
  const SLOTS=[["hero","Hero, right column (when there is no intro video)"],["think","Method card 1: Think (MSPC)"],["theory","Method card 2: Theory"],["trim","Method card 3: Trim"],["gallery","“Inside the app” gallery (several)"]];
  async function loadLand(){const r=await rpc("lc72_land_admin",{});land=r.data&&r.data.ok?r.data:{error:missing(r)?"missing":"auth"};return land}
  function mountEditor(view){
    if(!owner()){view.innerHTML='<section class="panel pad"><h1>Landing page editor</h1><p class="muted">Only the owner can edit the landing page.</p></section>';return null}
    view.innerHTML='<section class="lc72-le"><p class="lc72-tag">Owner</p><h1>Landing page editor</h1><p class="muted">Everything you save here is live on <a href="/" target="_blank" rel="noopener">the landing page</a> within a minute. Only real messages and results you can show.</p>'
      +'<div class="lc72-tabs" role="tablist">'+[["sections","Sections"],["love","Wall of Love"],["proof","Proof Queue"],["shots","Screenshots"],["texts","Texts and video"],["preview","Preview"]].map(x=>'<button type="button" role="tab" class="lc72-tab'+(tab===x[0]?" is-on":"")+'" data-lc72="tab" data-t="'+x[0]+'" aria-selected="'+(tab===x[0])+'">'+x[1]+"</button>").join("")+'</div><div data-lc72-body><p class="muted">Loading…</p></div></section>';
    loadLand().then(()=>paintTab(view));return null;
  }
  function paintTab(view){
    const b=Q("[data-lc72-body]",view||document);if(!b)return;
    if(!land||land.error){b.innerHTML='<div class="panel pad"><b>'+(land&&land.error==="missing"?"Run sql/20261113100000_lc72_lc73_launch_funnels.sql in the Supabase SQL editor first.":"Sign in as the owner first.")+"</b></div>";return}
    const c=land.cfg||{};
    if(tab==="sections"){
      const sw=(k,l,d)=>'<label class="lc72-sw"><input type="checkbox" data-k="'+k+'"'+(c[k]!==false?" checked":"")+'><span><b>'+l+"</b><small>"+d+"</small></span></label>";
      b.innerHTML='<div class="panel pad stack">'+sw("love_on","Wall of Love","Approved member messages plus the cards you add")+sw("proof_on","Proof Queue","Verified member results plus the results you add")+sw("builtin_on","Your Founder and proof-of-concept cards","355 → 2105 and +630 in 6 weeks, at the end of the Proof Queue")+sw("shots_on","Screenshots","The pictures you upload under Screenshots")
        +'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc72="cfg-save">Save and publish</button></div><p class="small muted">Member messages and verified results are approved in the owner menu: Student proofs and messages.</p></div>';
      return;
    }
    if(tab==="love"||tab==="proof"){
      const list=(land.items||[]).filter(x=>x.kind===tab);
      if(tab==="love")setTimeout(paintShares,0);
      b.innerHTML='<div class="btn-row"><button type="button" class="btn btn-primary" data-lc72="item-new" data-k="'+tab+'">'+ic("plus")+(tab==="love"?" Add a message":" Add a result")+'</button></div>'
        +(list.length?'<div class="lc72-items">'+list.map(x=>'<article class="panel lc72-it'+(x.visible?"":" is-off")+'">'+(x.shot?'<img src="'+esc(x.shot)+'" alt="" loading="lazy">':"")+'<div><b>'+esc(x.name||"(no name)")+'</b>'+(x.pinned?' <span class="lc72-pill">Pinned</span>':"")+(x.visible?"":' <span class="lc72-pill">Hidden</span>')
          +(tab==="proof"?'<p class="small">'+(x.start_r||"?")+" → "+(x.peak_r||"?")+(x.days?" in "+x.days+" days":"")+"</p>":"")+'<p class="small muted">'+esc(x.body||x.role||"")+'</p><div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-lc72="item-edit" data-id="'+x.id+'">Edit</button><button type="button" class="btn btn-ghost btn-sm" data-lc72="item-vis" data-id="'+x.id+'">'+(x.visible?"Hide":"Show")+'</button><button type="button" class="btn btn-quiet btn-sm" data-lc72="item-del" data-id="'+x.id+'">Delete</button></div></div></article>').join("")+"</div>"
          :'<p class="muted">Nothing added yet.'+(tab==="proof"?" Results of members who allowed it appear by themselves after your approval.":"")+"</p>")
        +(tab==="love"?'<section class="panel pad" data-lc72-shares><h3>Achievements members chose to share</h3><p class="small muted">From the Congratulations pop-up (they ticked Share). One tap puts it on the Wall of Love.</p><div data-lc72-sharelist><p class="small muted">Loading…</p></div></section>':"");
      return;
    }
    if(tab==="shots"){
      b.innerHTML=SLOTS.map(s=>{const l=(land.shots||[]).filter(x=>x.slot===s[0]);
        return'<section class="panel pad lc72-slot"><h3>'+esc(s[1])+'</h3><div class="lc72-thumbs">'+l.map(x=>'<figure class="'+(x.visible?"":"is-off")+'"><img src="'+esc(x.url)+'" alt="" loading="lazy"><figcaption><input class="input" maxlength="160" value="'+esc(x.caption)+'" placeholder="Caption (optional)" data-lc72-cap="'+x.id+'"><span class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-lc72="shot-vis" data-id="'+x.id+'">'+(x.visible?"Hide":"Show")+'</button><button type="button" class="btn btn-quiet btn-sm" data-lc72="shot-del" data-id="'+x.id+'">Delete</button></span></figcaption></figure>').join("")
          +'</div><label class="btn btn-primary btn-sm lc72-up">'+ic("upload")+' Upload a screenshot<input type="file" accept="image/*" hidden data-lc72-up="'+s[0]+'"></label></section>'}).join("")+'<p class="small muted">Pictures are made smaller in your browser (max 1600 px) and stored in the public bucket lc72-landing.</p>';
      return;
    }
    if(tab==="texts"){b.innerHTML='<div class="panel pad"><p>Hero title, your story and the intro video.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc72="texts">Edit the texts</button></div></div>';return}
    if(tab==="preview"){b.innerHTML='<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-lc72="reload">Reload</button><a class="btn btn-ghost btn-sm" href="/" target="_blank" rel="noopener">Open the live page</a></div><iframe class="lc72-prev" title="Landing page preview" src="/?preview='+Date.now()+'"></iframe>'}
  }
  function itemForm(kind,x){
    x=x||{kind:kind,visible:true};const v=k=>esc(x[k]==null?"":x[k]);
    const inp=(k,l,ph,t)=>'<label class="field"><span class="field-label">'+l+'</span><input class="input" name="'+k+'" type="'+(t||"text")+'" value="'+v(k)+'" placeholder="'+esc(ph||"")+'"></label>';
    sheet(kind==="love"?"Wall of Love card":"Proof Queue card",'<form class="stack" data-lc72-form novalidate>'+inp("name","First name","Anna")+inp("role",kind==="love"?"Under the name (optional)":"Label (optional)",kind==="love"?"Pro member":"Student since September")
      +(kind==="proof"?'<div class="lc72-two">'+'<label class="field"><span class="field-label">Site</span><select class="input" name="site"><option value="chesscom"'+(x.site==="chesscom"?" selected":"")+'>Chess.com</option><option value="lichess"'+(x.site==="lichess"?" selected":"")+'>Lichess</option><option value="other"'+(x.site==="other"?" selected":"")+'>Other</option></select></label>'+inp("days","Days","42","number")+inp("start_r","Start rating","585","number")+inp("peak_r","Peak rating","1214","number")+"</div>"+inp("link","Public profile link (so anybody can check it)","https://www.chess.com/member/…"):"")
      +'<label class="field"><span class="field-label">'+(kind==="love"?"The message (their words)":"Message (optional)")+'</span><textarea class="input" name="body" rows="4" maxlength="1200">'+v("body")+'</textarea></label>'
      +inp("shot","Screenshot address (or upload one below)","https://…")+'<label class="btn btn-ghost btn-sm lc72-up">'+ic("upload")+' Upload a screenshot<input type="file" accept="image/*" hidden data-lc72-up-form></label>'
      +'<label class="lc70-check"><input type="checkbox" name="pinned"'+(x.pinned?" checked":"")+'> <span>Pin to the top</span></label><label class="lc70-check"><input type="checkbox" name="visible"'+(x.visible!==false?" checked":"")+'> <span>Visible on the landing page</span></label>'
      +'<p class="small muted">Only real words and results, with the person’s permission. Never promise a rating or “lifetime”.</p><div class="btn-row"><button class="btn btn-primary" type="submit">Save and publish</button></div><p class="form-msg" aria-live="polite"></p></form>',
      s=>{const f=Q("[data-lc72-form]",s.el),msg=Q(".form-msg",f);
        Q("[data-lc72-up-form]",f).addEventListener("change",async e=>{const file=e.target.files&&e.target.files[0];if(!file)return;msg.textContent="Uploading…";const u=await upload(file,kind);if(u){f.elements.shot.value=u;msg.textContent="Uploaded."}else msg.textContent="Upload failed (run the SQL file, or create the public bucket lc72-landing)."});
        f.addEventListener("submit",async e=>{e.preventDefault();const E=f.elements,g=k=>E[k]?String(E[k].value||"").trim():"";
          const p={id:x.id||"",kind:kind,name:g("name"),role:g("role"),site:g("site"),start:g("start_r"),peak:g("peak_r"),days:g("days"),link:g("link"),body:g("body"),shot:g("shot"),pinned:E.pinned.checked,visible:E.visible.checked};
          if(p.link&&!/^https:\/\//.test(p.link)){msg.textContent="The profile link must start with https://";return}
          if(p.shot&&!/^https:\/\//.test(p.shot)){msg.textContent="The screenshot address must start with https://";return}
          const r=await rpc("lc72_land_save",{p:p});const d=r.data||{};
          if(!d.ok){msg.textContent=d.error==="wording"?"Remove “lifetime” / “forever”.":"Could not save.";return}
          s.close();say("Saved: live on the landing page.","good");await loadLand();paintTab()})});
  }
  async function paintShares(){
    const box=Q("[data-lc72-sharelist]");if(!box)return;const r=await rpc("lc74_shares_admin",{});const l=(r.data&&r.data.rows)||[];
    box.innerHTML=l.length?'<ul class="lc72-inbox">'+l.map(x=>'<li><div class="panel pad lc72-share"><span><b>'+esc(x.name)+"</b> · "+esc(x.title)+(x.body?"<small>“"+esc(x.body)+"”</small>":"")+"</span>"+(x.promoted?'<span class="lc72-pill">On the Wall</span>':'<button type="button" class="btn btn-primary btn-sm" data-lc72="promote" data-id="'+x.id+'">Add to the Wall of Love</button>')+"</div></li>").join("")+"</ul>":'<p class="small muted">Nothing shared yet.</p>';
  }
  async function upload(file,slot){
    const c=cfg(),t=await tok();if(!c.url||!t)return"";
    let blob=file;
    try{const bm=await createImageBitmap(file),k=Math.min(1,1600/Math.max(bm.width,bm.height)),cv=document.createElement("canvas");cv.width=Math.round(bm.width*k);cv.height=Math.round(bm.height*k);cv.getContext("2d").drawImage(bm,0,0,cv.width,cv.height);
      blob=await new Promise(res=>cv.toBlob(b=>res(b||file),"image/webp",.85));}catch(e){blob=file}
    const ext=(blob.type||"").includes("webp")?"webp":(blob.type||"").includes("png")?"png":"jpg",path=String(slot||"misc").replace(/[^a-z]/g,"")+"/"+Date.now()+"-"+Math.random().toString(36).slice(2,8)+"."+ext;
    try{const r=await fetch(c.url+"/storage/v1/object/lc72-landing/"+path,{method:"POST",headers:{Authorization:"Bearer "+t,apikey:c.key,"Content-Type":blob.type||"image/jpeg","x-upsert":"true"},body:blob});
      if(!r.ok)return"";return c.url+"/storage/v1/object/public/lc72-landing/"+path}catch(e){return""}
  }

  /* ============ 2. library: two-part pages, the token lock, the spotlight, the classics ============ */
  let extC={at:0,d:null};
  async function extras(force){if(!force&&extC.d&&Date.now()-extC.at<60000)return extC.d;const r=await rpc("lc72_lib_extras",{},true);const d=r.data&&r.data.ok?r.data:{extras:{},classics_hidden:false};extC={at:Date.now(),d:d};return d}
  const eur=c=>"€"+(Math.round(+c||0)/100).toFixed(2);
  function isSpot(it){return/2000\+\s*blueprint/i.test(it.title||"")}
  function coursePane(it,course,d,lead){
    const c=course||it,a=c.access,lessons=+c.lessons||0,tier=+((d.me||{}).tier)||0;
    if(a)return'<div class="lc72-course is-open"><p class="lc72-ck">'+ic("circle-play")+" "+(course?"The video course":"Inside")+'</p><h4>'+esc(c.title)+'</h4><p class="small muted">'+(lessons?lessons+(lessons===1?" lesson":" lessons"):"")+'</p><button type="button" class="btn btn-primary" data-lc70="open" data-id="'+esc(c.id)+'">'+ic("play")+" "+(c.kind==="course"?"Watch the course":c.kind==="summary"?"Read it":"Open")+"</button></div>";
    const price=lead?"No card, no tokens":c.tokens?c.tokens+" tokens":c.price_cents?eur(c.price_cents):(c.pro_included||c.pro_ebook)?"Included with Pro":"";
    return'<button type="button" class="lc72-course is-locked" data-lc72="unlock" data-id="'+esc(c.id)+'" aria-label="Unlock '+esc(c.title)+'"><span class="lc72-blur" aria-hidden="true">'+Array.from({length:Math.max(3,Math.min(6,lessons||4))},(x,i)=>'<i>Lesson '+(i+1)+"</i>").join("")+'</span><span class="lc72-lock"><span class="lc72-lockic">'+ic("lock")+'</span><b>'+esc(course?"The video course":c.kind==="course"?"The lessons":"The full content")+'</b><small>'+(lessons?lessons+(lessons===1?" lesson · ":" lessons · "):"")+esc(price||"Locked")+'</small><span class="btn btn-gold btn-sm">'+(lead?ic("unlock")+" Open it with your account":ic("coins")+" Unlock")+"</span></span></button>";
  }
  function rowHTML(it,d,ex,byId,cardHTML,spot){
    const e=ex[it.id]||{},course=e.course_id&&byId[e.course_id]?byId[e.course_id]:null,adm=owner();
    const card=cardHTML(it,d),tools=(card.match(/<div class="lc70-tools">[\s\S]*?<\/div>(?=<\/div><\/article>)/)||[""])[0];
    const btns=(card.match(/<div class="lc70-btns">([\s\S]*?)<\/div>/)||["",""])[1],vip=(card.match(/<p class="lc70-vipnote">[\s\S]*?<\/p>/)||[""])[0];
    const kind={book:"Book",summary:"Book summary",course:"Video course"}[it.kind]||"Book";
    const cover=/^(https:\/\/|\/assets\/)/.test(it.cover||"")?'<img src="'+esc(it.cover)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span class="lc72-blank">'+esc(it.title)+"</span>";
    const sum=e.summary?'<details class="lc72-sum"'+(spot?" open":"")+'><summary>Read the free summary</summary>'+String(e.summary).split(/\n+/).filter(x=>x.trim()).map(p=>"<p>"+esc(p)+"</p>").join("")+"</details>":"";
    return'<article class="lc72-row'+(spot?" is-spot":"")+(it.pinned?" is-pinned":"")+'" id="lib-'+esc(it.id)+'"><div class="lc72-left"><div class="lc72-cover'+(spot?" is-3d":"")+'">'+cover+'</div><div class="lc72-info">'
      +(spot?'<p class="lc72-spot-tag">'+ic("crown")+" Kyenzo’s own book</p>":'<p class="lc70-kick">'+esc(kind)+"</p>")+"<h3>"+esc(it.title)+"</h3>"+(it.subtitle?'<p class="lc70-sub">'+esc(it.subtitle)+"</p>":"")+(it.author?'<p class="small muted">'+esc(it.author)+"</p>":"")
      +(e.credentials?'<ul class="lc72-cred">'+String(e.credentials).split(/\n|·|\|/).map(x=>x.trim()).filter(Boolean).slice(0,5).map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"")
      +(it.blurb?'<p class="lc70-blurb">'+esc(it.blurb)+"</p>":"")+sum+'<div class="lc70-btns">'+btns+"</div>"+vip+"</div></div>"
      +'<div class="lc72-right">'+(course||it.kind==="course"||+it.lessons>0||it.has_ebook||it.has_body?coursePane(it,course,d,!!e.lead):'<p class="small muted">The content of this item appears here once it is uploaded.</p>')+"</div>"
      +(adm?'<div class="lc72-own">'+tools.replace('<div class="lc70-tools">','<div class="lc70-tools"><button type="button" class="btn btn-ghost btn-sm" data-lc72="page" data-id="'+esc(it.id)+'">'+ic("pen")+" Page: credentials, summary, course</button>")+"</div>":"")+"</article>";
  }
  async function paintShelf(host,d,api){
    const ex=(await extras()).extras||{},items=d.items||[],byId={};items.forEach(x=>byId[x.id]=x);
    const linked={};Object.keys(ex).forEach(k=>{if(ex[k].course_id)linked[ex[k].course_id]=k});
    const adm=owner(),shown=items.filter(x=>adm||!linked[x.id]);
    const spot=shown.filter(isSpot)[0]||shown.filter(x=>x.pinned&&x.kind==="book")[0]||null;
    const rest=shown.filter(x=>x!==spot);
    const bar=adm?'<div class="btn-row lc70-owner"><button type="button" class="btn btn-primary btn-sm" data-lc70="new">'+ic("plus")+' Add a book, summary or course</button><button type="button" class="btn btn-ghost btn-sm" data-lc70="orders">'+ic("truck")+' Book orders to ship</button><button type="button" class="btn btn-ghost btn-sm" data-lc70="sales">'+ic("chart-simple")+" Sales</button>"+((await extras()).classics_hidden?"":'<button type="button" class="btn btn-ghost btn-sm" data-lc72="classics">'+ic("pen")+" Make the 4 classic summaries editable</button>")+"</div>":"";
    const sp=spot?'<section class="lc72-spot" aria-label="Featured book">'+rowHTML(spot,d,ex,byId,api.cardHTML,true)+"</section>":adm?'<section class="lc72-spot is-empty"><p class="lc72-spot-tag">'+ic("crown")+' Featured spotlight</p><h3>The 2000+ Blueprint</h3><p class="small muted">Owner: add your book with “2000+ Blueprint” in the title and it takes this place. Members do not see this box.</p><div class="btn-row"><button type="button" class="btn btn-primary btn-sm" data-lc70="new">'+ic("plus")+" Add The 2000+ Blueprint</button></div></section>":"";
    host.innerHTML=bar+sp+(rest.length?'<div class="lc72-rows">'+rest.map(it=>rowHTML(it,d,ex,byId,api.cardHTML,false)).join("")+"</div>":(spot?"":'<p class="muted">'+(adm?"Your shelf is empty. Add your first book, summary or video course.":"Kyenzo’s own books and courses appear here soon.")+"</p>"));
    if((await extras()).classics_hidden){QA(".lc69-bh,.lc69-book,#lib-classics").forEach(x=>x.hidden=true);const j=Q('[data-lc70-scroll="lib-classics"]');if(j)j.hidden=true}
  }
  async function leadOpen(it){
    if(!sess()){sheet("Open “"+it.title+"”",'<p>Sign in with your account and it opens at once. No card, no tokens.</p><div class="btn-row"><a class="btn btn-primary" href="#account" data-close>Sign in</a></div>');return}
    const r=await rpc("lc72_lead_claim",{p_id:it.id});const d=r.data||{};
    if(!d.ok){say(missing(r)?"This opens once the 9.37.0 SQL file has run.":"Could not open it. Try again.","bad");return}
    say("“"+it.title+"” is in your library.","good");try{LC70.repaint(true)}catch(e){}setTimeout(()=>{try{const x=itemOfAny(it.id);LC70.openItem(Object.assign({},x||it,{access:"owned"}))}catch(e){}},600);
  }
  function unlock(id){
    const it=itemOfAny(id);if(!it)return;
    const ex=(extC.d&&extC.d.extras)||{},lead=Object.keys(ex).some(k=>ex[k].lead&&(k===id||ex[k].course_id===id));
    if(lead){leadOpen(it);return}
    let have=null;try{have=Quota.unlimited()?Infinity:(+Quota.leftNow()||0)+(+Quota.bonusNow()||0)}catch(e){}
    const em=String((sess()||{}).email||"").toLowerCase(),short=it.tokens&&have!=null&&have!==Infinity&&have<it.tokens;
    let packs="";try{packs=LC44.PACKS.map(k=>'<button type="button" class="btn lc44-pack" data-lc72-pack="'+k.id+'"><b>'+k.tokens.toLocaleString("en-GB")+" tokens</b><span>"+k.price+"</span></button>").join("")}catch(e){}
    sheet("Unlock “"+it.title+"”",
      (it.tokens?'<p class="lc72-price"><b>'+it.tokens+' tokens</b>'+(have!=null&&have!==Infinity?" · you have <b>"+have+"</b>":"")+"</p>"+(short?'<p class="lc70-warn">You need '+(it.tokens-have)+" more tokens.</p>":'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc72-buy>'+ic("coins")+" Unlock for "+it.tokens+" tokens</button></div>"):"")
      +((it.pro_included||it.pro_ebook)&&!(+(((extC.d||{}).me)||{}).tier>=2)?'<div class="btn-row"><button type="button" class="btn btn-gold" data-lc70="pro" data-id="'+esc(it.id)+'">'+ic("crown")+" Included with Pro</button></div>":"")
      +(it.price_cents&&/^https:\/\/buy\.stripe\.com\//.test(it.buy_link||"")?'<div class="btn-row"><button type="button" class="btn btn-ghost" data-lc70="buy" data-id="'+esc(it.id)+'">'+ic("credit-card")+" Buy for "+eur(it.price_cents)+"</button></div>":"")
      +'<h4 class="lc72-h4">Token price list</h4><div class="lc44-packs">'+packs+'</div>'+(em?'<p class="small muted">Tokens are added to <b>'+esc(em)+"</b>. Bought once, no subscription. Secure checkout with Stripe.</p>":'<p class="small muted">Sign in first: tokens are added to your account.</p>')
      +'<p class="small muted">One-time purchase: it stays in your library, no subscription needed.</p>',
      s=>{s.el.addEventListener("click",e=>{
        const p=e.target.closest&&e.target.closest("[data-lc72-pack]");
        if(p){e.preventDefault();if(!em){say("Sign in first: tokens are added to your account.","bad");return}const k=LC44.PACKS.filter(x=>x.id===p.getAttribute("data-lc72-pack"))[0];if(!k)return;
          try{if(typeof LC73!=="undefined"&&LC73.packCheckout&&LC73.packCheckout(k.id))return}catch(x){}try{LC36.support.go(LC44._t.withMail(k.url,em))}catch(x){location.href=k.url}return}
        if(e.target.closest("[data-lc72-buy]")){s.close();setTimeout(()=>{try{LC70.buyTokens(it)}catch(x){}},200);return}
        if(e.target.closest("[data-lc72-trial]")){s.close();try{LC73.startTrial()}catch(x){location.hash="#upgrades"}}
      })});
  }
  function itemOfAny(id){let f=null;QA("[data-lc70-shelf]").forEach(h=>{const d=h.__d;if(!f&&d&&d.items)f=d.items.filter(x=>x.id===id)[0]||null});return f}
  async function pageSheet(id){
    const it=itemOfAny(id);if(!it)return;const ex=((await extras(true)).extras||{})[id]||{};
    const courses=[];QA("[data-lc70-shelf]").forEach(h=>{((h.__d||{}).items||[]).forEach(x=>{if(x.id!==id)courses.push(x)})});
    sheet("Page: "+it.title,'<form class="stack" data-lc72-page novalidate><label class="field"><span class="field-label">Credentials (one per line, max 5)</span><textarea class="input" name="credentials" rows="4" maxlength="600" placeholder="355 → 2105 Rapid in 2 years and 10 months\nTop 0.1% on Chess.com\nCertified chess coach">'+esc(ex.credentials||"")+'</textarea></label>'
      +'<label class="field"><span class="field-label">Free summary (everybody can read it; one paragraph per line)</span><textarea class="input" name="summary" rows="8" maxlength="6000">'+esc(ex.summary||"")+'</textarea></label>'
      +'<label class="field"><span class="field-label">The video course behind the lock (right side)</span><select class="input" name="course_id"><option value="">This item itself</option>'+courses.map(c=>'<option value="'+esc(c.id)+'"'+(ex.course_id===c.id?" selected":"")+">"+esc(c.title)+" ("+esc(c.kind)+")</option>").join("")+"</select></label>"
      +'<label class="lc70-check"><input type="checkbox" name="lead"'+(ex.lead?" checked":"")+'> <span>Lead magnet: any signed-in account opens it with one tap (no card, no tokens). Publish it in Edit.</span></label>'
      +'<div class="btn-row"><button class="btn btn-primary" type="submit">Save</button></div><p class="form-msg" aria-live="polite"></p></form>',
      s=>{const f=Q("[data-lc72-page]",s.el);f.addEventListener("submit",async e=>{e.preventDefault();const r=await rpc("lc72_lib_extra_set",{p_id:id,p:{credentials:f.elements.credentials.value,summary:f.elements.summary.value,course_id:f.elements.course_id.value,lead:f.elements.lead.checked}});
        if(r.data&&r.data.ok){s.close();say("Saved.","good");await extras(true);try{LC70.repaint(true)}catch(x){}}else Q(".form-msg",f).textContent=missing(r)?"Run the 9.37.0 SQL file first.":"Could not save."})});
  }
  async function classics(){
    if(!window.confirm("Move the 4 classic summaries into your shelf? After that you can edit, hide or delete each of them like your own items."))return;
    let ok=0;
    for(const b of (LC69.BOOKS||[])){
      const body=["What it teaches. "+b.what,"What it gets right. "+b.good,"The lazy-school trap. "+b.lazy,"Kyenzo’s take. "+b.ours].join("\n\n");
      const r=await rpc("lc70_admin_upsert",{p:{id:"classic-"+b.id,shelf:"kyenzo",kind:"summary",status:"live",title:b.title,author:b.author+" ("+b.year+")",blurb:b.what,body:body}});
      if(r.data&&r.data.ok){ok++;await rpc("lc72_lib_extra_set",{p_id:"classic-"+b.id,p:{credentials:b.author+" ("+b.year+")",summary:b.what+"\n"+b.good}})}
    }
    if(ok)await rpc("lc72_cfg_set",{p_key:"classics_hidden",p_val:true});
    say(ok+" classics moved. Edit or delete them like any item.",ok?"good":"bad");await extras(true);try{LC70.repaint(true)}catch(x){}
  }

  /* ============ 3. titles in the community, chats and the profile ============ */
  const TRE=/^(c39_feed|c39_post_get|c46_msgs|c46_dm_threads|c46_dm_get)$/;
  const mark=(n,c)=>c&&MARK[c]?String(n||"Member")+SEP+MARK[c]:n;
  async function titled(action,body,r){
    try{
      if(!r||!r.ok)return r;const p=[],c=[],m=[],d=[];
      if(action==="c39_feed")(r.posts||[]).forEach(x=>p.push(x.id));
      if(action==="c39_post_get"){if(r.post)p.push(r.post.id);(r.comments||[]).forEach(x=>c.push(x.id))}
      if(action==="c46_msgs")(r.msgs||[]).forEach(x=>m.push(x.id));
      if(action==="c46_dm_threads")(r.threads||[]).forEach(x=>d.push(x.with));
      if(action==="c46_dm_get"&&body&&body.with)d.push(body.with);
      if(!p.length&&!c.length&&!m.length&&!d.length)return r;
      const t=await rpc("lc72_titles",{p:{p:p,c:c,m:m,d:d}});const T=t.data||{};if(!t.data)return r;
      if(action==="c39_feed")(r.posts||[]).forEach(x=>x.name=mark(x.name,(T.p||{})[x.id]));
      if(action==="c39_post_get"){if(r.post)r.post.name=mark(r.post.name,(T.p||{})[r.post.id]);(r.comments||[]).forEach(x=>x.name=mark(x.name,(T.c||{})[x.id]))}
      if(action==="c46_msgs")(r.msgs||[]).forEach(x=>x.name=mark(x.name,(T.m||{})[x.id]));
      if(action==="c46_dm_threads")(r.threads||[]).forEach(x=>x.name=mark(x.name,(T.d||{})[x.with]));
      if(action==="c46_dm_get"&&r.name)r.name=mark(r.name,(T.d||{})[body.with]);
    }catch(e){}
    return r;
  }
  function decorate(root){
    if(!root)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.nodeValue.indexOf(SEP)>=0?1:3});const hits=[];let n;while((n=w.nextNode()))hits.push(n);
    hits.forEach(t=>{const v=t.nodeValue,i=v.indexOf(SEP),code=Object.keys(MARK).filter(k=>MARK[k]===v.charAt(i+1))[0];
      const frag=document.createDocumentFragment();frag.append(document.createTextNode(v.slice(0,i)));
      if(code){const b=document.createElement("span");b.className="lc72-t is-"+code;b.title=TITLE[code];b.textContent=SHORT[code];frag.append(" ",b)}
      frag.append(document.createTextNode(v.slice(i+2)));t.parentNode.replaceChild(frag,t)});
  }
  async function profileTitle(){
    const d=await me();if(!d||!d.title)return;
    QA(".lc30-pmhead").forEach(h=>{if(!Q(".lc72-mine",h)){const b=document.createElement("span");b.className="lc72-mine is-"+d.code;b.textContent=d.title;h.appendChild(b)}});
  }

  /* ============ 4. Coach chat ============ */
  let poll=0,ownerSel=null,ownerFilter="all",chatTab="inbox";
  const bubble=(m,mineSide)=>'<div class="lc72-msg'+(mineSide?" is-me":"")+(m.kind==="auto"?" is-auto":"")+(m.kind==="priority"?" is-prio":"")+'"><p>'+esc(m.body).replace(/\n/g,"<br>")+"</p>"+(m.cta&&m.cta.href?'<a class="btn btn-gold btn-sm" href="'+esc(m.cta.href)+'"'+(/^https:/.test(m.cta.href)?' target="_blank" rel="noopener noreferrer"':"")+">"+esc(m.cta.label||"Open")+"</a>":"")+'<small>'+esc(new Date(m.t).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))+"</small></div>";
  function mountChat(view){
    view.innerHTML='<section class="lc72-chat" data-lc72-chat><p class="muted">Loading…</p></section>';
    paintChat();clearInterval(poll);poll=setInterval(()=>{if(route()==="coach-chat"&&!document.hidden)paintChat(true);else clearInterval(poll)},15000);return null;
  }
  async function paintChat(quiet){
    const host=Q("[data-lc72-chat]");if(!host)return;
    if(!sess()){host.innerHTML='<div class="panel pad"><h1>Coach Kyenzo</h1><p>Sign in first: your messages with Kyenzo are tied to your account.</p><a class="btn btn-primary" href="#account">Sign in</a></div>';return}
    const m=await me(true);if(!m){host.innerHTML='<div class="panel pad"><p>'+esc("The chat could not load. Run the 9.37.0 SQL file, or try again.")+"</p></div>";return}
    if(m.owner)return paintInbox(host,quiet);
    const r=await rpc("lc72_chat_get",{});const d=r.data||{};
    const head='<header class="lc72-ch"><span class="lc69-face">'+face(["calm","neutral"],48)+'</span><div><h1>Coach Kyenzo</h1><p class="small muted">'+(m.title?'<span class="lc72-mine is-'+m.code+'">'+esc(m.title)+"</span> ":"")+"Direct messages with Kyenzo. He reads every message himself.</p></div></header>";
    if(!d.allowed){host.innerHTML=head+'<div class="panel pad lc72-up"><h2>Talk to Kyenzo directly</h2><p>The coach chat opens with Pro, VIP, the 7-day trial or any book or course from the Books Vault. Ask about your games, your Working Points or your plan.</p><div class="btn-row"><button type="button" class="btn btn-gold" data-lc72="trial">Start the 7-day trial</button><a class="btn btn-primary" href="#upgrades">See Pro and VIP</a><a class="btn btn-ghost" href="#books">Books Vault</a></div><p class="small muted">The trial: €0 today, then €39 a month until you cancel.</p></div>';return}
    const msgs=d.msgs||[],list=Q(".lc72-msgs",host),atBottom=!list||list.scrollTop+list.clientHeight>=list.scrollHeight-40,draft=Q("[data-lc72-draft]",host);const keep=draft?draft.value:"";
    if(quiet&&list&&list.getAttribute("data-n")==String(msgs.length))return;
    host.innerHTML=head+'<div class="lc72-msgs" data-n="'+msgs.length+'">'+(msgs.length?msgs.map(x=>bubble(x,!x.owner)).join(""):'<p class="muted small">No messages yet. Say hi and tell Kyenzo what you want to improve.</p>')+"</div>"
      +'<form class="lc72-send" data-lc72-send><textarea class="input" rows="2" maxlength="2000" placeholder="Write to Kyenzo…" data-lc72-draft aria-label="Message to Kyenzo"></textarea><button class="btn btn-primary" type="submit">'+ic("paper-plane")+' Send</button></form>'
      +'<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-lc72="prio"'+(d.priority?" disabled":"")+'>'+ic("thumbtack")+(d.priority?" Pinned on top of Kyenzo’s inbox":" Pin my message to the top · "+m.priority_tokens+" tokens")+'</button><a class="btn btn-ghost btn-sm" href="#trim">'+ic("chess-board")+" Priority Game Review</a></div>";
    const d2=Q("[data-lc72-draft]",host);if(d2)d2.value=keep;
    const l2=Q(".lc72-msgs",host);if(l2&&atBottom)l2.scrollTop=l2.scrollHeight;
  }
  async function paintInbox(host,quiet){
    if(quiet&&ownerSel)return;
    if(chatTab==="auto")return paintAuto(host);
    if(ownerSel){
      const r=await rpc("lc72_owner_thread",{p_uid:ownerSel.uid});const d=r.data||{};
      host.innerHTML='<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-lc72="back">← Inbox</button></div><h2>'+esc(ownerSel.name)+(d.code?' <span class="lc72-t is-'+d.code+'">'+SHORT[d.code]+"</span>":"")+'</h2><p class="small muted">'+esc(d.email||"")+"</p>"
        +'<div class="lc72-msgs">'+(d.msgs||[]).map(x=>bubble(x,x.owner)).join("")+"</div>"
        +'<form class="lc72-send stack" data-lc72-osend><textarea class="input" rows="3" maxlength="2000" placeholder="Your answer…"></textarea><div class="lc72-two"><input class="input" name="cl" maxlength="40" placeholder="Button text (optional)"><input class="input" name="ch" maxlength="300" placeholder="Button link: #books, #upgrades or https://…"></div><button class="btn btn-primary" type="submit">Send</button></form>';
      const l=Q(".lc72-msgs",host);if(l)l.scrollTop=l.scrollHeight;return;
    }
    const r=await rpc("lc72_inbox",{p_filter:ownerFilter});const d=r.data||{};
    host.innerHTML='<header class="lc72-ch"><span class="lc69-face">'+face(["calm"],48)+'</span><div><h1>Coach inbox</h1><p class="small muted">Paying members, trials and buyers. Pinned messages (paid with tokens) stay on top until you answer. '+(+d.unread||0)+' unread.</p></div></header>'
      +'<div class="lc72-tabs">'+[["inbox","Inbox"],["auto","Automated messages"]].map(x=>'<button type="button" class="lc72-tab'+(chatTab===x[0]?" is-on":"")+'" data-lc72="ctab" data-t="'+x[0]+'">'+x[1]+"</button>").join("")+"</div>"
      +'<div class="lc70-filter">'+[["all","All"],["unread","Unread"],["priority","Pinned"],["vip","VIP"],["pro","Pro"],["trial","Trial"],["buyers","Buyers"]].map(x=>'<button type="button" class="lc70-f'+(ownerFilter===x[0]?" is-on":"")+'" data-lc72="filter" data-f="'+x[0]+'">'+x[1]+"</button>").join("")+"</div>"
      +(missing(r)?'<p class="lc70-warn">Run the 9.37.0 SQL file first.</p>':(d.rows||[]).length?'<ul class="lc72-inbox">'+d.rows.map(x=>'<li><button type="button" data-lc72="open" data-uid="'+esc(x.uid)+'" data-name="'+esc(x.name)+'" class="'+(x.priority?"is-prio":"")+'"><b>'+(x.priority?"📌 ":"")+esc(x.name)+'</b>'+(x.code?' <span class="lc72-t is-'+x.code+'">'+SHORT[x.code]+"</span>":"")+(x.trial?' <span class="lc72-pill">Trial</span>':"")+(+x.unread?' <span class="lc72-badge">'+x.unread+"</span>":"")+'<small>'+esc(x.last||"No messages yet: start the conversation")+"</small></button></li>").join("")+"</ul>":'<p class="muted">Nobody here yet.</p>');
  }
  async function paintAuto(host){
    const r=await rpc("lc72_auto_get",{}),d=r.data||{},m=await me();
    const L={trial:"After the 7-day trial starts",pro:"After Pro starts",vip:"After VIP starts",buyer:"After a book or course purchase"};
    host.innerHTML='<div class="lc72-tabs">'+[["inbox","Inbox"],["auto","Automated messages"]].map(x=>'<button type="button" class="lc72-tab'+(chatTab===x[0]?" is-on":"")+'" data-lc72="ctab" data-t="'+x[0]+'">'+x[1]+"</button>").join("")+"</div>"
      +'<p class="small muted">Sent once per member, in the app, from you. {name} = first name, {item} = what they bought. A button can point to #books, #upgrades or a https link.</p>'
      +(d.rows||[]).map(a=>'<form class="panel pad stack lc72-auto" data-lc72-auto="'+a.event+'"><h3>'+esc(L[a.event]||a.event)+' <small class="muted">sent '+((d.sent||{})[a.event]||0)+"×</small></h3><label class=\"lc70-check\"><input type=\"checkbox\" name=\"enabled\""+(a.enabled?" checked":"")+'> <span>On</span></label><textarea class="input" name="body" rows="5" maxlength="1500">'+esc(a.body)+'</textarea><div class="lc72-two"><input class="input" name="cta_label" maxlength="40" value="'+esc(a.cta_label)+'" placeholder="Button text"><input class="input" name="cta_href" maxlength="300" value="'+esc(a.cta_href)+'" placeholder="#upgrades"></div><button class="btn btn-primary btn-sm" type="submit">Save</button></form>').join("")
      +'<form class="panel pad stack" data-lc72-prices><h3>Token prices</h3><div class="lc72-two"><label class="field"><span class="field-label">Pin a message to the top</span><input class="input" name="pt" type="number" min="1" value="'+((m&&m.priority_tokens)||5)+'"></label><label class="field"><span class="field-label">Priority Game Review</span><input class="input" name="rt" type="number" min="1" value="'+((m&&m.review_tokens)||20)+'"></label></div><button class="btn btn-primary btn-sm" type="submit">Save prices</button></form>';
  }
  async function spend(n,refBase){
    for(let k=0;k*10<n;k++){const amount=Math.min(10,n-k*10);let r=null;try{r=await Quota.call("token_spend",{kind:"wallet",n:amount,ref:refBase+"-"+k})}catch(e){}
      if(!r||r.status!==200||r.ok!==true)return{ok:false,reason:r&&r.reason==="token_limit"?"limit":"server",paid:k*10}}
    try{Quota.refresh()}catch(e){}return{ok:true};
  }
  async function autoCheck(){
    if(!sess())return;const last=+rd("lc72-auto-at",0)||0;if(Date.now()-last<600000&&!/paid=/.test(location.hash))return;wr("lc72-auto-at",Date.now());
    const r=await rpc("lc72_auto_check",{p_name:myName()});const d=r.data||{};
    if(d.ok&&d.sent&&d.sent.length)notice(true);else notice(false);
  }
  async function notice(force){
    if(route()==="coach-chat"||Q("#lc72-note"))return;const m=await me(force);if(!m||!(+m.unread>0))return;
    const n=document.createElement("div");n.id="lc72-note";n.className="lc72-note";n.setAttribute("role","status");
    n.innerHTML='<span class="lc69-face sm">'+face(["calm"],30)+'</span><p><b>Kyenzo sent you a message</b></p><a class="btn btn-primary btn-sm" href="#coach-chat">Open</a><button type="button" class="lc72-x" aria-label="Close" data-lc72="note-x">×</button>';
    document.body.appendChild(n);
  }

  /* ============ events ============ */
  async function onClick(e){
    const t=e.target;if(!t||!t.closest)return;
    const own=t.closest("[data-lc72-own]");if(own){e.preventDefault();e.stopPropagation();try{const mm=Q("#lc49-menu");if(mm)mm.remove()}catch(x){}location.hash="#"+own.getAttribute("data-lc72-own");return}
    const b=t.closest("[data-lc72]");if(!b)return;const a=b.getAttribute("data-lc72"),id=b.getAttribute("data-id");
    if(a==="tab"){e.preventDefault();tab=b.getAttribute("data-t");wr("lc72-tab",tab);QA(".lc72-le .lc72-tab").forEach(x=>{x.classList.toggle("is-on",x===b);x.setAttribute("aria-selected",String(x===b))});paintTab();return}
    if(a==="cfg-save"){const c={};QA("[data-k]",b.closest(".panel")).forEach(i=>c[i.getAttribute("data-k")]=i.checked);const r=await rpc("lc72_cfg_set",{p_key:"landing",p_val:c});say(r.data&&r.data.ok?"Saved: live on the landing page.":"Could not save.",r.data&&r.data.ok?"good":"bad");await loadLand();return}
    if(a==="item-new"){itemForm(b.getAttribute("data-k"));return}
    if(a==="item-edit"||a==="item-vis"||a==="item-del"){const x=(land.items||[]).filter(z=>String(z.id)===id)[0];if(!x)return;
      if(a==="item-edit"){itemForm(x.kind,x);return}
      if(a==="item-del"){if(!window.confirm("Delete this card from the landing page?"))return;await rpc("lc72_land_del",{p_id:+id})}
      else await rpc("lc72_land_save",{p:Object.assign({},x,{start:x.start_r,peak:x.peak_r,visible:!x.visible})});
      await loadLand();paintTab();return}
    if(a==="shot-vis"||a==="shot-del"){const x=(land.shots||[]).filter(z=>String(z.id)===id)[0];if(!x)return;
      if(a==="shot-del"){if(!window.confirm("Delete this screenshot?"))return;const r=await rpc("lc72_shot_del",{p_id:+id});const u=r.data&&r.data.url;if(u){const c=cfg(),tk=await tok(),path=String(u).split("/lc72-landing/")[1];if(path)try{await fetch(c.url+"/storage/v1/object/lc72-landing/"+path,{method:"DELETE",headers:{Authorization:"Bearer "+tk,apikey:c.key}})}catch(x){}}}
      else await rpc("lc72_shot_save",{p:Object.assign({},x,{visible:!x.visible})});
      await loadLand();paintTab();return}
    if(a==="texts"){try{LC69.landingSheet()}catch(x){}return}
    if(a==="promote"){const r=await rpc("lc74_share_promote",{p_id:+id});say(r.data&&r.data.ok?"On the Wall of Love.":"Could not add it.",r.data&&r.data.ok?"good":"bad");await loadLand();paintTab();return}
    if(a==="reload"){const f=Q(".lc72-prev");if(f)f.src="/?preview="+Date.now();return}
    if(a==="unlock"){e.preventDefault();unlock(id);return}
    if(a==="page"){pageSheet(id);return}
    if(a==="classics"){classics();return}
    if(a==="trial"){try{LC73.startTrial()}catch(x){location.hash="#upgrades"}return}
    if(a==="note-x"){const n=Q("#lc72-note");if(n)n.remove();return}
    if(a==="prio"){const m=await me();if(!m)return;const n=+m.priority_tokens||5;if(!window.confirm("Pin your messages to the top of Kyenzo’s inbox until he answers, for "+n+" tokens?"))return;
      b.disabled=true;const ref="lc72-prio-"+Date.now(),s=await spend(n,ref);if(!s.ok){b.disabled=false;say(s.reason==="limit"?"Not enough tokens.":"The token server did not answer. Nothing was pinned.","bad");return}
      const r=await rpc("lc72_chat_priority",{p_ref:ref});say(r.data&&r.data.ok?"Pinned: Kyenzo sees your message first.":r.data&&r.data.error==="no_thread"?"Write a message first, then pin it.":"Could not pin it.",r.data&&r.data.ok?"good":"bad");paintChat();return}
    if(a==="filter"){ownerFilter=b.getAttribute("data-f");ownerSel=null;paintChat();return}
    if(a==="ctab"){chatTab=b.getAttribute("data-t");ownerSel=null;paintChat();return}
    if(a==="open"){ownerSel={uid:b.getAttribute("data-uid"),name:b.getAttribute("data-name")};paintChat();return}
    if(a==="back"){ownerSel=null;paintChat();return}
  }
  async function onSubmit(e){
    const f=e.target;if(!f||!f.matches)return;
    if(f.matches("[data-lc72-send]")){e.preventDefault();const ta=Q("textarea",f),v=String(ta.value||"").trim();if(!v)return;const r=await rpc("lc72_chat_send",{p_body:v,p_name:myName()});
      if(r.data&&r.data.ok){ta.value="";paintChat()}else say(r.data&&r.data.error==="slow_down"?"Slow down a little: try again in a few minutes.":"Could not send.","bad");return}
    if(f.matches("[data-lc72-osend]")){e.preventDefault();const ta=Q("textarea",f),v=String(ta.value||"").trim();if(!v||!ownerSel)return;const ch=f.elements.ch.value.trim(),cl=f.elements.cl.value.trim();
      const r=await rpc("lc72_owner_send",{p_uid:ownerSel.uid,p_body:v,p_cta:ch?{label:cl||"Open",href:ch}:null});if(r.data&&r.data.ok){ta.value="";paintChat()}else say("Could not send.","bad");return}
    if(f.matches("[data-lc72-auto]")){e.preventDefault();const E=f.elements;if(/\blifetime\b|\bforever\b/i.test(E.body.value)){say("Remove “lifetime” / “forever”.","bad");return}
      const r=await rpc("lc72_auto_set",{p_event:f.getAttribute("data-lc72-auto"),p:{enabled:E.enabled.checked,body:E.body.value,cta_label:E.cta_label.value,cta_href:E.cta_href.value}});say(r.data&&r.data.ok?"Saved.":"Could not save (a button link must start with # or https://).",r.data&&r.data.ok?"good":"bad");return}
    if(f.matches("[data-lc72-prices]")){e.preventDefault();const a1=await rpc("lc72_cfg_set",{p_key:"priority_tokens",p_val:+f.elements.pt.value}),a2=await rpc("lc72_cfg_set",{p_key:"review_tokens",p_val:+f.elements.rt.value});meC.at=0;say(a1.data&&a1.data.ok&&a2.data&&a2.data.ok?"Prices saved.":"Could not save.","good");return}
  }
  async function onChange(e){
    const i=e.target;if(!i||!i.matches)return;
    if(i.matches("[data-lc72-up]")){const f=i.files&&i.files[0];if(!f)return;say("Uploading…","");const u=await upload(f,i.getAttribute("data-lc72-up"));if(!u){say("Upload failed: run the 9.37.0 SQL file (it creates the public bucket lc72-landing) and sign in as the owner.","bad");return}
      const r=await rpc("lc72_shot_save",{p:{slot:i.getAttribute("data-lc72-up"),url:u}});say(r.data&&r.data.ok?"Screenshot live on the landing page.":"Uploaded, but could not save it.",r.data&&r.data.ok?"good":"bad");await loadLand();paintTab();return}
    if(i.matches("[data-lc72-cap]")){const x=(land.shots||[]).filter(z=>String(z.id)===i.getAttribute("data-lc72-cap"))[0];if(x)await rpc("lc72_shot_save",{p:Object.assign({},x,{caption:i.value})});}
  }
  function ownerRows(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc72-own]",m)||!owner())return;
    const ref=Q("[data-lc69-admin]",m)||Q("[data-lc59-admin]",m);if(!ref)return;
    const mk=(k,t,s)=>{const b=document.createElement("button");b.type="button";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc72-own",k);b.innerHTML="<span><b>"+t+"</b><small>"+s+"</small></span>";return b};
    ref.insertAdjacentElement("beforebegin",mk("landing-editor","Landing page editor","Wall of Love, Proof Queue, screenshots, sections, texts"));
    ref.insertAdjacentElement("beforebegin",mk("coach-chat","Coach inbox","Messages from members and buyers, automated messages"));
    if(ref.hasAttribute("data-lc69-admin"))ref.hidden=true;
  }
  function css(){
    if(Q("#lc72-css"))return;const s=document.createElement("style");s.id="lc72-css";
    s.textContent=".lc72-le,.lc72-chat{max-width:900px;margin:0 auto}.lc72-tag{margin:0;color:#fbbf24;font-weight:800;font-size:12px;letter-spacing:.06em}.lc72-le h1,.lc72-chat h1{margin:2px 0 6px;font-size:clamp(22px,5vw,30px)}"
      +".lc72-tabs{display:flex;gap:6px;overflow-x:auto;margin:12px 0}.lc72-tab{min-height:44px;padding:0 14px;border-radius:999px;border:1px solid rgba(148,163,184,.3);background:transparent;color:#e2e8f0;font-weight:700;white-space:nowrap;cursor:pointer}.lc72-tab.is-on{background:#38bdf8;color:#0f172a;border-color:#38bdf8}"
      +".lc72-sw{display:flex;gap:12px;align-items:flex-start;min-height:44px;cursor:pointer}.lc72-sw input{width:22px;height:22px;margin-top:3px}.lc72-sw small{display:block;color:#94a3b8}"
      +".lc72-items{display:grid;gap:10px}.lc72-it{display:flex;gap:12px;padding:12px}.lc72-it img{width:84px;height:84px;object-fit:cover;border-radius:10px}.lc72-it.is-off{opacity:.55}.lc72-it p{margin:4px 0}.lc72-pill{font-size:11px;font-weight:800;border-radius:999px;padding:1px 8px;background:#334155;color:#e2e8f0}"
      +".lc72-slot{margin-bottom:12px}.lc72-slot h3{margin:0 0 8px;font-size:16px}.lc72-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:10px}.lc72-thumbs figure{margin:0;display:grid;gap:6px}.lc72-thumbs figure.is-off{opacity:.5}.lc72-thumbs img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:10px;border:1px solid #334155}.lc72-up{min-height:44px;display:inline-flex;align-items:center;gap:6px;cursor:pointer}"
      +".lc72-prev{width:100%;height:75vh;border:1px solid #334155;border-radius:12px;background:#0f172a;margin-top:8px}.lc72-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media (max-width:520px){.lc72-two{grid-template-columns:1fr}}"
      /* library: two-part pages */
      +".lc72-rows{display:grid;gap:16px}.lc72-row{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:0;border-radius:18px;overflow:hidden;border:1px solid rgba(148,163,184,.2);background:#1e293b}.lc72-row.is-pinned{border-color:rgba(251,191,36,.6)}"
      +".lc72-left{display:grid;grid-template-columns:120px minmax(0,1fr);gap:14px;padding:16px}.lc72-cover{align-self:start;border-radius:8px;overflow:hidden;background:linear-gradient(135deg,#0f172a,#1e3a5f);aspect-ratio:2/3;display:grid;place-items:center;box-shadow:0 10px 24px rgba(0,0,0,.45)}.lc72-cover img{width:100%;height:100%;object-fit:cover}.lc72-blank{padding:10px;text-align:center;font-weight:800;color:#e2e8f0;font-size:13px}"
      +".lc72-info h3{margin:2px 0 4px;font-size:19px}.lc72-cred{list-style:none;padding:0;margin:8px 0;display:grid;gap:4px}.lc72-cred li{font-size:13px;color:#cbd5e1;padding-left:18px;position:relative}.lc72-cred li::before{content:'✓';position:absolute;left:0;color:#38bdf8;font-weight:800}"
      +".lc72-sum{margin:8px 0;border-top:1px solid #334155;padding-top:6px}.lc72-sum summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:700;color:#7dd3fc}.lc72-sum p{margin:0 0 .6rem;font-size:14px;color:#cbd5e1;line-height:1.55}"
      +".lc72-right{border-left:1px solid #334155;background:#0f172a;display:flex}.lc72-course{flex:1;margin:0;padding:16px;border:0;background:transparent;color:inherit;text-align:left;display:flex;flex-direction:column;gap:8px;justify-content:center}.lc72-course h4{margin:0}.lc72-ck{margin:0;color:#38bdf8;font-weight:800;font-size:12px}"
      +".lc72-course.is-locked{position:relative;cursor:pointer;min-height:220px;overflow:hidden}.lc72-blur{display:grid;gap:8px;filter:blur(3px);opacity:.45}.lc72-blur i{font-style:normal;padding:10px 12px;border-radius:10px;border:1px solid #334155;background:#1e293b}"
      +".lc72-lock{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;background:radial-gradient(closest-side,rgba(15,23,42,.92),rgba(15,23,42,.6));padding:12px}.lc72-lockic{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:#fbbf24;color:#0f172a;font-size:22px;box-shadow:0 0 0 6px rgba(251,191,36,.18)}.lc72-lock small{color:#cbd5e1}.lc72-lock .btn{min-height:44px;pointer-events:none}"
      +".lc72-course.is-locked:focus-visible{outline:2px solid #fbbf24;outline-offset:-4px}.lc72-own{grid-column:1/-1;padding:0 16px 12px}"
      +"@media (max-width:760px){.lc72-row{grid-template-columns:1fr}.lc72-right{border-left:0;border-top:1px solid #334155}.lc72-left{grid-template-columns:96px minmax(0,1fr)}}"
      /* the spotlight */
      +".lc72-spot{margin:0 0 20px;padding:3px;border-radius:24px;background:linear-gradient(135deg,#fbbf24,#b45309 40%,#38bdf8 100%);box-shadow:0 24px 70px rgba(0,0,0,.5)}.lc72-spot>.lc72-row{border:0;border-radius:21px;background:radial-gradient(700px 300px at 10% -10%,rgba(251,191,36,.16),transparent 60%),linear-gradient(160deg,#1e293b,#0b1222)}"
      +".lc72-spot .lc72-left{grid-template-columns:minmax(150px,210px) minmax(0,1fr);gap:22px;padding:24px}.lc72-spot h3{font-family:'Iowan Old Style','Palatino Linotype',Georgia,serif;font-size:clamp(26px,5vw,38px);line-height:1.05;letter-spacing:-.01em}"
      +".lc72-spot-tag{margin:0 0 6px;color:#fbbf24;font-weight:800;font-size:13px}.lc72-cover.is-3d{transform:perspective(900px) rotateY(-14deg);border-radius:4px 10px 10px 4px;box-shadow:16px 22px 40px rgba(0,0,0,.6),inset 6px 0 10px rgba(0,0,0,.35)}"
      +".lc72-spot.is-empty{padding:18px;background:#1e293b;border:1px dashed #fbbf24}@media (max-width:760px){.lc72-spot .lc72-left{grid-template-columns:1fr;justify-items:center;text-align:center}.lc72-spot .lc72-cover{width:min(220px,70%)}.lc72-spot .lc72-cred{justify-items:start;text-align:left}}"
      +"@media (prefers-reduced-motion:no-preference){.lc72-cover.is-3d{transition:transform .5s}.lc72-spot:hover .lc72-cover.is-3d{transform:perspective(900px) rotateY(-4deg)}}"
      +".lc72-price{font-size:18px}.lc72-h4{margin:16px 0 8px}.lc72-trialbox{border:1px solid #fbbf24;border-radius:14px;padding:12px;margin-bottom:12px;background:rgba(251,191,36,.08)}.lc72-trialbox p{margin:4px 0 8px}"
      /* titles */
      +".lc72-t{display:inline-block;vertical-align:middle;font-size:10.5px;font-weight:800;line-height:1.6;border-radius:999px;padding:0 7px;margin-left:4px;border:1px solid}.lc72-t.is-S{color:#7dd3fc;border-color:#38bdf8;background:rgba(56,189,248,.12)}.lc72-t.is-A{color:#fde68a;border-color:#b45309;background:rgba(251,191,36,.1)}.lc72-t.is-C{color:#0f172a;background:#fbbf24;border-color:#fbbf24}"
      +".lc72-mine{display:inline-block;font-size:12px;font-weight:800;border-radius:999px;padding:2px 10px;border:1px solid #38bdf8;color:#7dd3fc}.lc72-mine.is-A{border-color:#b45309;color:#fde68a}"
      /* chat */
      +".lc72-ch{display:flex;gap:12px;align-items:center;margin-bottom:10px}.lc72-msgs{display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow:auto;padding:8px;border-radius:14px;background:#0f172a;border:1px solid #334155}"
      +".lc72-msg{max-width:85%;align-self:flex-start;background:#1e293b;border:1px solid #334155;border-radius:14px 14px 14px 4px;padding:8px 12px}.lc72-msg p{margin:0 0 4px;line-height:1.45}.lc72-msg small{color:#94a3b8;font-size:11px}.lc72-msg .btn{margin:4px 0;min-height:40px}"
      +".lc72-msg.is-me{align-self:flex-end;background:#0c4a6e;border-color:#38bdf8;border-radius:14px 14px 4px 14px}.lc72-msg.is-auto{border-color:#fbbf24}.lc72-msg.is-prio{border-style:dashed;opacity:.8}"
      +".lc72-send{display:grid;grid-template-columns:1fr auto;gap:8px;margin:10px 0}.lc72-send.stack{grid-template-columns:1fr}.lc72-send .btn{min-height:44px}"
      +".lc72-inbox{list-style:none;padding:0;display:grid;gap:6px}.lc72-inbox button{width:100%;min-height:52px;text-align:left;padding:8px 12px;border-radius:12px;border:1px solid #334155;background:#1e293b;color:inherit;cursor:pointer}.lc72-inbox button.is-prio{border-color:#fbbf24}.lc72-inbox small{display:block;color:#94a3b8}.lc72-badge{background:#ef4444;color:#fff;border-radius:999px;padding:0 7px;font-size:12px;font-weight:800}"
      +".lc72-note{position:fixed;left:10px;right:10px;bottom:76px;z-index:91;max-width:420px;display:flex;gap:10px;align-items:center;padding:10px 44px 10px 12px;border-radius:16px;background:#1e293b;border:1px solid #fbbf24;box-shadow:0 12px 36px rgba(0,0,0,.5)}.lc72-note p{margin:0;flex:1}.lc72-share{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.lc72-share>span{flex:1}.lc72-share small{display:block;color:#94a3b8}.lc72-share .btn{min-height:44px}.lc72-x{position:absolute;top:2px;right:2px;width:44px;height:44px;background:none;border:0;color:#94a3b8;font-size:22px;cursor:pointer}";
    document.head.appendChild(s);
  }
  let deb=0;
  function scan(){ownerRows();if(/^(community|coach-chat)$/.test(route())||Q(".sheet-wrap"))decorate(Q("#view"));QA(".sheet-wrap").forEach(decorate);if(Q(".lc30-pmhead"))profileTitle()}
  function afterRender(r){clearTimeout(deb);deb=setTimeout(()=>{try{scan()}catch(e){}},200);if(r!=="coach-chat")clearInterval(poll);if(r==="upgrades"||r==="home"||r==="quests")autoCheck()}
  function init(){
    css();
    try{if(typeof MOUNT!=="undefined"){MOUNT["landing-editor"]=mountEditor;MOUNT["coach-chat"]=mountChat;try{DOC_TITLES["coach-chat"]="Coach Kyenzo";ROUTE_TITLES["coach-chat"]="the coach chat";DOC_TITLES["landing-editor"]="Landing page editor";ALIASES.coach="coach-chat";ALIASES.inbox="coach-chat"}catch(e){}}}catch(e){}
    try{const lv=LC26.levels,o=lv.minLevel;if(!lv.__lc72){lv.__lc72=1;lv.minLevel=r=>/^(coach-chat|landing-editor|analytics)$/.test(r)?1:o(r)}}catch(e){}   /* paying members, the owner and partners never wait for a quest level */
    try{if(!Quota.__lc72){Quota.__lc72=true;const orig=Quota.call;Quota.call=async function(action,body){const r=await orig.apply(this,arguments);return TRE.test(String(action))?titled(String(action),body,r):r}}}catch(e){}
    document.addEventListener("click",onClick,true);document.addEventListener("submit",onSubmit,true);document.addEventListener("change",onChange,true);
    new MutationObserver(()=>{clearTimeout(deb);deb=setTimeout(()=>{try{scan()}catch(e){}},150)}).observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>{autoCheck();notice(false)},6000);
  }
  return{init:init,afterRender:afterRender,paintShelf:paintShelf,extras:extras,me:me,unlock:unlock,upload:upload,decorate:decorate,titled:titled,mark:mark,TITLE:TITLE,version:"9.37.0"};
})(); /*@@end lc72*/
