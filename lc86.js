/*@@module lc86*/
const LC86=(()=>{
  "use strict";
  /* LC86 (build 9.46.0): the person-by-person Wall of Love, managed in the app.
     #wall-cms (owner menu > Wall of Love: people): add a person in a few taps. Per person: first name, result tag ("+630 Elo in 6 weeks"),
     avatar (upload or https URL, empty = initials), and an ordered list of proof items: screenshots (upload several at once, or a URL, each
     with an optional caption) and chat lines (from the member or from Kyenzo). Show / hide, order, delete.
     Saved in Supabase (lc86_wall_people, sql/20261115140000_lc86_wall_people.sql); screenshots go to the public bucket lc72-landing.
     The landing page (index.html) reads lc86_wall_public() and shows one card per person directly above the Proof Queue; a tap opens that
     person's screenshots and chat in a gallery. Until the first person is saved, the landing page shows its two starter cards.
     "Open the landing page (admin mode)" opens /?admin=1#love: the owner sees an Add button and an Edit link on every card, which come back here.
     Only the owner can save: every write goes through _lc_require_admin() on the server; the admin buttons on the landing page are links only. */
  const VERSION="9.46.0";
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.prototype.slice.call((r||document).querySelectorAll(s));
  const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const say=(m,k,ms)=>{try{toast(m,k||"",ms)}catch(e){}};
  const ic=n=>{try{return icon(n)}catch(e){return""}};
  const route=()=>{let h="";try{h=decodeURIComponent(String(location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){h=""}return h.split(/[\/?&]/)[0]};
  /* the landing page links here as /app.html?lc86=edit-<id> | seed-<key> | new#wall-cms (the app's router reads the hash as the route) */
  function intent(){let v="";try{v=new URLSearchParams(location.search).get("lc86")||""}catch(e){v=""}
    if(v){try{const u=new URL(location.href);u.searchParams.delete("lc86");history.replaceState(history.state,"",u.pathname+u.search+u.hash)}catch(e){}}
    const m=/^(edit|seed|new)(?:-([a-z0-9]{1,20}))?$/.exec(v);return m?{k:m[1],v:m[2]||""}:null}
  const owner=()=>{try{return !!(LC49.owner()||Admin.active)}catch(e){return false}};
  const cfg=()=>{try{return LC26.sync.cfg()}catch(e){return{url:"",key:""}}};
  async function tok(){try{return await LC26.sync.token()}catch(e){return""}}
  async function rpc(fn,args,anon){
    try{const h={};if(!anon){const t=await tok();if(!t)return{status:401,data:null};h.Authorization="Bearer "+t}
      return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:h,body:JSON.stringify(args||{})})}catch(e){return{status:0,data:null}}
  }
  const missing=r=>!!(r&&(r.status===404||(r.data&&/PGRST202|does not exist|42883|42P01/i.test(String(r.data.code||"")+String(r.data.message||"")))));
  const NOSQL="The person-by-person Wall of Love is not switched on yet. Run sql/20261115140000_lc86_wall_people.sql in the Supabase SQL editor, then reload.";
  const HTTPS=/^https:\/\/[^\s"'<>]{3,400}$/;
  const MAXI=24;
  /* the two starter cards the landing page shows until the first person is saved (the same text as in index.html) */
  const SEED={
    mathijs:{name:"Mathijs",tag:"+630 Elo in 6 weeks",avatar:"",items:[{t:"msg",from:"coach",text:"585 → 1214 Elo in 6 weeks. The first student to run the full MSPC system, move by move."}]},
    igor:{name:"Igor P.",tag:"Hit 1500 Elo",avatar:"",items:[]}
  };
  const initials=n=>String(n||"?").trim().split(/\s+/).map(w=>w.replace(/[^\p{L}\p{N}]/gu,"").charAt(0)).filter(Boolean).slice(0,2).join("").toUpperCase()||"?";
  /* pure: keep only the item shapes the server accepts (the server cleans again) */
  function cleanItems(list){
    const out=[];(Array.isArray(list)?list:[]).forEach(x=>{if(out.length>=MAXI||!x||typeof x!=="object")return;
      if(x.t==="img"&&HTTPS.test(String(x.url||"").trim()))out.push({t:"img",url:String(x.url).trim(),cap:String(x.cap||"").replace(/[<>]/g,"").trim().slice(0,140)});
      else if(x.t==="msg"){const t=String(x.text||"").replace(/[<>]/g,"").trim().slice(0,1000);if(t)out.push({t:"msg",from:x.from==="coach"?"coach":"member",text:t})}});
    return out;
  }
  function avatarHTML(p,size){
    size=size||44;const s='style="width:'+size+'px;height:'+size+'px"';
    return HTTPS.test(String(p.avatar||""))?'<img class="lc86-av" '+s+' src="'+E(p.avatar)+'" alt="" loading="lazy">':'<span class="lc86-av lc86-ini" '+s+' aria-hidden="true">'+E(initials(p.name))+"</span>";
  }

  /* ---------- data ---------- */
  let ROWS=null,STATE="";
  async function load(){
    const r=await rpc("lc86_wall_admin",{});
    if(missing(r)){ROWS=null;STATE="nosql";return}
    if(!(r&&r.status===200&&r.data&&r.data.ok)){ROWS=null;STATE=r&&r.status===401?"auth":"error";return}
    ROWS=Array.isArray(r.data.rows)?r.data.rows:[];STATE="ok";
  }
  async function save(p){
    const body={id:p.id||null,name:String(p.name||"").trim(),tag:String(p.tag||"").trim(),avatar:String(p.avatar||"").trim(),items:cleanItems(p.items),visible:p.visible!==false,sort:+p.sort||0};
    const r=await rpc("lc86_wall_save",{p:body});
    if(missing(r))return{ok:false,why:NOSQL};
    const d=r&&r.data||{};if(d.ok)return{ok:true,id:d.id};
    return{ok:false,why:{name:"Add a first name.",avatar:"The avatar must be an https:// address.",wording:"Pick other words for the result: no “lifetime”, “forever” or “guaranteed”.",full:"100 people is the maximum.",invalid:"Something in the form is not valid."}[d.error]||(r&&r.status===401?"Sign in with the owner account first.":"Could not save. Try again.")};
  }
  async function upload(file){
    const c=cfg(),t=await tok();if(!c.url||!t)return"";
    let blob=file;
    try{const bm=await createImageBitmap(file),k=Math.min(1,1600/Math.max(bm.width,bm.height)),cv=document.createElement("canvas");cv.width=Math.round(bm.width*k);cv.height=Math.round(bm.height*k);cv.getContext("2d").drawImage(bm,0,0,cv.width,cv.height);
      blob=await new Promise(res=>cv.toBlob(b=>res(b||file),"image/webp",.85))}catch(e){blob=file}
    const ext=(blob.type||"").includes("webp")?"webp":(blob.type||"").includes("png")?"png":"jpg",path="wall/"+Date.now()+"-"+Math.random().toString(36).slice(2,8)+"."+ext;
    try{const r=await fetch(c.url+"/storage/v1/object/lc72-landing/"+path,{method:"POST",headers:{Authorization:"Bearer "+t,apikey:c.key,"Content-Type":blob.type||"image/jpeg","x-upsert":"true"},body:blob});
      if(!r.ok)return"";return c.url+"/storage/v1/object/public/lc72-landing/"+path}catch(e){return""}
  }
  const landingAdmin=()=>location.origin+"/?admin=1#love";
  function openLanding(){const w=window.open(landingAdmin(),"_blank","noopener");if(!w)location.href=landingAdmin()}

  /* ---------- the page ---------- */
  async function mount(view){
    if(!owner()){view.innerHTML='<div class="panel pad"><p>This page is for the owner.</p></div>';return}
    view.innerHTML='<div class="lc86"><p class="lc86-tag">Owner · Admin mode</p><h1>Wall of Love: people</h1>'
      +'<p class="small muted">One card per person on the landing page, directly above the Proof Queue. A tap on a card opens that person’s screenshots and chat. Only add what the person agreed to show.</p>'
      +'<div class="btn-row lc86-top"><button type="button" class="btn btn-primary" data-lc86="add">'+ic("plus")+' Add a person</button><button type="button" class="btn btn-ghost" data-lc86="landing">'+ic("arrow-up-right-from-square")+' Open the landing page (admin mode)</button></div>'
      +'<div data-lc86-list><p class="small muted">Loading…</p></div></div>';
    await load();paint();
    const it=intent();
    if(it&&it.k==="edit"&&ROWS){const p=ROWS.filter(x=>String(x.id)===it.v)[0];if(p)editor(p)}
    else if(it&&it.k==="seed"&&SEED[it.v])editor(Object.assign({},SEED[it.v],{items:SEED[it.v].items.slice()}));
    else if(it&&it.k==="new")editor({});
  }
  function paint(){
    const host=Q("[data-lc86-list]");if(!host)return;
    if(STATE==="nosql"){host.innerHTML='<p class="form-msg is-bad">'+E(NOSQL)+"</p>";return}
    if(STATE==="auth"){host.innerHTML='<p class="form-msg is-bad">Sign in with the owner account (lanckrietchess@gmail.com) to manage the Wall of Love.</p>';return}
    if(STATE!=="ok"){host.innerHTML='<p class="form-msg is-bad">Could not load the list. Check the connection and reload.</p>';return}
    if(!ROWS.length){host.innerHTML='<div class="panel pad"><p>No people yet. The landing page shows its two starter cards (Mathijs and Igor P.) until you save the first person.</p><div class="btn-row"><button type="button" class="btn btn-ghost" data-lc86="seed" data-k="igor">Start from “Igor P.”</button><button type="button" class="btn btn-ghost" data-lc86="seed" data-k="mathijs">Start from “Mathijs”</button></div></div>';return}
    host.innerHTML='<ul class="lc86-list">'+ROWS.map((p,i)=>{const n=(p.items||[]).length,shots=(p.items||[]).filter(x=>x.t==="img").length;
      return'<li class="'+(p.visible?"":"is-off")+'">'+avatarHTML(p)+'<div class="lc86-who"><b>'+E(p.name)+"</b>"+(p.tag?'<span class="lc86-pill">'+E(p.tag)+"</span>":"")+'<small class="muted">'+shots+(shots===1?" screenshot":" screenshots")+" · "+(n-shots)+(n-shots===1?" chat line":" chat lines")+(p.visible?"":" · hidden")+"</small></div>"
        +'<div class="lc86-act"><button type="button" class="btn btn-quiet btn-sm" data-lc86="up" data-i="'+i+'" aria-label="Move up"'+(i?"":" disabled")+">"+ic("arrow-up")+'</button><button type="button" class="btn btn-quiet btn-sm" data-lc86="down" data-i="'+i+'" aria-label="Move down"'+(i<ROWS.length-1?"":" disabled")+">"+ic("arrow-down")+"</button>"
        +'<button type="button" class="btn btn-quiet btn-sm" data-lc86="vis" data-i="'+i+'">'+(p.visible?"Hide":"Show")+'</button><button type="button" class="btn btn-ghost btn-sm" data-lc86="edit" data-i="'+i+'">'+ic("pen")+' Edit</button><button type="button" class="btn btn-quiet btn-sm" data-lc86="del" data-i="'+i+'" aria-label="Delete '+E(p.name)+'">'+ic("trash")+"</button></div></li>"}).join("")+"</ul>";
  }
  async function reorder(i,d){
    const j=i+d;if(!ROWS||!ROWS[i]||!ROWS[j])return;const a=ROWS[i];ROWS[i]=ROWS[j];ROWS[j]=a;
    const jobs=ROWS.map((p,k)=>p.sort===k*10?null:save(Object.assign({},p,{sort:k*10}))).filter(Boolean);
    paint();const res=await Promise.all(jobs);if(res.some(r=>!r.ok))say("The new order could not be saved everywhere. Reload and try again.","bad");
    await load();paint();
  }

  /* ---------- the editor ---------- */
  function itemHTML(x,i,n){
    const tools='<div class="lc86-it-tools"><button type="button" class="btn btn-quiet btn-sm" data-it="up" data-i="'+i+'" aria-label="Move up"'+(i?"":" disabled")+">"+ic("arrow-up")+'</button><button type="button" class="btn btn-quiet btn-sm" data-it="down" data-i="'+i+'" aria-label="Move down"'+(i<n-1?"":" disabled")+">"+ic("arrow-down")+'</button><button type="button" class="btn btn-quiet btn-sm" data-it="del" data-i="'+i+'" aria-label="Remove">'+ic("xmark")+"</button></div>";
    if(x.t==="img")return'<li class="lc86-it is-img"><img src="'+E(x.url)+'" alt="" loading="lazy"><input class="input" data-cap="'+i+'" maxlength="140" placeholder="Caption (optional)" value="'+E(x.cap||"")+'">'+tools+"</li>";
    return'<li class="lc86-it is-msg"><select class="input" data-from="'+i+'"><option value="member"'+(x.from!=="coach"?" selected":"")+'>The member</option><option value="coach"'+(x.from==="coach"?" selected":"")+'>Kyenzo</option></select><textarea class="input" data-text="'+i+'" rows="2" maxlength="1000" placeholder="What was said">'+E(x.text||"")+"</textarea>"+tools+"</li>";
  }
  function editor(p0){
    const S={id:p0.id||null,name:p0.name||"",tag:p0.tag||"",avatar:p0.avatar||"",visible:p0.visible!==false,sort:p0.sort!=null?p0.sort:((ROWS||[]).length*10),items:cleanItems(p0.items)};
    openSheet({title:S.id?"Edit "+S.name:"Add a person",cls:"lc86-sheet",noFocus:true,html:'<form class="stack lc86-ed" data-lc86-ed novalidate autocomplete="off">'
      +'<div class="lc86-two"><label class="field"><span class="field-label">First name <small class="muted">(e.g. “Igor P.”)</small></span><input class="input" name="name" maxlength="40" required></label>'
      +'<label class="field"><span class="field-label">Result tag <small class="muted">(e.g. “+630 Elo in 6 weeks”)</small></span><input class="input" name="tag" maxlength="60"></label></div>'
      +'<div class="lc86-avrow"><span data-avprev></span><label class="field"><span class="field-label">Avatar <small class="muted">(https:// address, or upload; empty = initials)</small></span><input class="input" name="avatar" inputmode="url" placeholder="https://…"></label><label class="btn btn-ghost btn-sm lc86-upl">'+ic("upload")+' Upload<input type="file" accept="image/*" hidden data-up="avatar"></label></div>'
      +'<label class="lc86-sw"><input type="checkbox" name="visible"><span>Show on the landing page</span></label>'
      +'<h3 class="lc86-h3">Screenshots and chat <small class="muted" data-cnt></small></h3><ul class="lc86-items" data-items></ul>'
      +'<div class="btn-row"><label class="btn btn-ghost btn-sm lc86-upl">'+ic("images")+' Upload screenshots<input type="file" accept="image/*" multiple hidden data-up="shots"></label><button type="button" class="btn btn-ghost btn-sm" data-add="url">'+ic("link")+' Screenshot by URL</button><button type="button" class="btn btn-ghost btn-sm" data-add="msg">'+ic("comment")+' Chat line</button></div>'
      +'<p class="form-msg" data-msg aria-live="polite"></p><div class="btn-row"><button class="btn btn-primary" type="submit">'+ic("check")+' Save: live on the landing page</button></div></form>',
      onMount(s){
        const f=Q("[data-lc86-ed]",s.el),msg=Q("[data-msg]",f);
        f.elements.name.value=S.name;f.elements.tag.value=S.tag;f.elements.avatar.value=S.avatar;f.elements.visible.checked=S.visible;
        const sync=()=>{QA("[data-cap]",f).forEach(el=>{const x=S.items[+el.getAttribute("data-cap")];if(x)x.cap=el.value});QA("[data-text]",f).forEach(el=>{const x=S.items[+el.getAttribute("data-text")];if(x)x.text=el.value});QA("[data-from]",f).forEach(el=>{const x=S.items[+el.getAttribute("data-from")];if(x)x.from=el.value})};
        const paintAv=()=>{Q("[data-avprev]",f).innerHTML=avatarHTML({name:f.elements.name.value,avatar:f.elements.avatar.value.trim()},52)};
        const paintItems=()=>{Q("[data-items]",f).innerHTML=S.items.map((x,i)=>itemHTML(x,i,S.items.length)).join("")||'<li class="small muted">Nothing yet. Upload the chat screenshots or add the lines that were said.</li>';Q("[data-cnt]",f).textContent="("+S.items.length+" of "+MAXI+")"};
        const note=(t,bad)=>{msg.textContent=t||"";msg.className="form-msg"+(bad?" is-bad":"")};
        paintAv();paintItems();
        f.addEventListener("input",e=>{if(e.target.name==="avatar"||e.target.name==="name")paintAv()});
        f.addEventListener("click",e=>{
          const a=e.target.closest("[data-add]"),it=e.target.closest("[data-it]");
          if(a){sync();if(S.items.length>=MAXI){note("24 items is the maximum per person.",true);return}
            if(a.getAttribute("data-add")==="msg")S.items.push({t:"msg",from:"member",text:""});
            else{const u=String(prompt("Screenshot address (https://…)")||"").trim();if(!u)return;if(!HTTPS.test(u)){note("A screenshot address must start with https://",true);return}S.items.push({t:"img",url:u,cap:""})}
            paintItems();return}
          if(it){sync();const i=+it.getAttribute("data-i"),k=it.getAttribute("data-it");
            if(k==="del")S.items.splice(i,1);else{const j=i+(k==="up"?-1:1);if(S.items[j]){const t=S.items[i];S.items[i]=S.items[j];S.items[j]=t}}
            paintItems()}
        });
        f.addEventListener("change",async e=>{const up=e.target.getAttribute&&e.target.getAttribute("data-up");if(!up)return;
          const files=[].slice.call(e.target.files||[]);e.target.value="";if(!files.length)return;
          if(up==="avatar"){note("Uploading…");const u=await upload(files[0]);if(!u){note("Upload failed. Sign in with the owner account; the 9.37.0 SQL creates the bucket lc72-landing.",true);return}f.elements.avatar.value=u;paintAv();note("Avatar uploaded. Save to publish it.");return}
          sync();const room=MAXI-S.items.length;if(room<=0){note("24 items is the maximum per person.",true);return}
          let ok=0,bad=0;for(const file of files.slice(0,room)){note("Uploading "+(ok+bad+1)+" of "+Math.min(files.length,room)+"…");const u=await upload(file);if(u){S.items.push({t:"img",url:u,cap:""});ok++;paintItems()}else bad++}
          note(bad?ok+" uploaded, "+bad+" failed. Sign in with the owner account and try again.":ok+(ok===1?" screenshot":" screenshots")+" uploaded. Save to publish.",!!bad)});
        f.addEventListener("submit",async e=>{
          e.preventDefault();sync();
          S.name=f.elements.name.value.trim();S.tag=f.elements.tag.value.trim();S.avatar=f.elements.avatar.value.trim();S.visible=f.elements.visible.checked;
          if(!S.name){note("Add a first name.",true);f.elements.name.focus();return}
          if(S.avatar&&!HTTPS.test(S.avatar)){note("The avatar must be an https:// address.",true);return}
          const b=Q('button[type="submit"]',f);b.disabled=true;note("Saving…");
          const r=await save(S);b.disabled=false;
          if(!r.ok){note(r.why,true);return}
          s.close();say("Saved: live on the landing page.","good");await load();paint();
        });
      }});
  }
  async function onClick(e){
    const b=e.target.closest&&e.target.closest("[data-lc86]");if(!b)return;e.preventDefault();
    const a=b.getAttribute("data-lc86"),i=+b.getAttribute("data-i"),p=ROWS&&ROWS[i];
    if(a==="add")return editor({});
    if(a==="landing")return openLanding();
    if(a==="seed"){const k=b.getAttribute("data-k");return editor(Object.assign({},SEED[k],{items:SEED[k].items.slice()}))}
    if(!p)return;
    if(a==="edit")return editor(p);
    if(a==="up"||a==="down")return reorder(i,a==="up"?-1:1);
    if(a==="vis"){b.disabled=true;const r=await save(Object.assign({},p,{visible:!p.visible}));if(!r.ok)say(r.why,"bad");await load();paint();return}
    if(a==="del"){if(!window.confirm("Delete "+p.name+" from the Wall of Love? The screenshots stay in Storage."))return;const r=await rpc("lc86_wall_del",{p_id:+p.id});if(!(r&&r.data&&r.data.ok))say(missing(r)?NOSQL:"Could not delete.","bad");await load();paint()}
  }
  function ownerRows(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc86-own]",m)||!owner())return;
    const ref=Q("[data-lc85-own]",m)||Q("[data-lc82-own]",m)||Q("[data-lc74-own]",m)||Q("[data-lc73-own]",m)||Q("[data-lc59-admin]",m);if(!ref)return;
    const mk=(href,title,sub,attr)=>{const b=document.createElement("a");b.href=href;b.className="lc49-mi lc49-tool";b.setAttribute("data-lc86-own",attr);b.innerHTML="<span><b>"+title+"</b><small>"+sub+"</small></span>";
      b.addEventListener("click",ev=>{try{const mm=Q("#lc49-menu");if(mm)mm.remove()}catch(x){}if(attr==="land"){ev.preventDefault();openLanding()}});return b};
    ref.insertAdjacentElement("beforebegin",mk("#wall-cms","Wall of Love: people","Add a person: name, result, avatar, screenshots and chat","cms"));
    ref.insertAdjacentElement("beforebegin",mk(landingAdmin(),"Landing page (admin mode)","Opens the landing page with Add and Edit on the Wall of Love","land"));
  }
  function css(){
    if(Q("#lc86-css"))return;const s=document.createElement("style");s.id="lc86-css";
    s.textContent=".lc86{max-width:900px;margin:0 auto;display:grid;gap:12px}.lc86 h1{margin:0}.lc86-tag{margin:0;color:#fbbf24;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase}.lc86 .btn{min-height:44px}"
      +".lc86-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}.lc86-list li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 12px;border-radius:14px;background:#1e293b;border:1px solid rgba(148,163,184,.2)}.lc86-list li.is-off{opacity:.55}"
      +".lc86-who{display:flex;flex-direction:column;gap:3px;min-width:0}.lc86-who b{font-size:16px}.lc86-pill{align-self:flex-start;padding:2px 10px;border-radius:999px;background:rgba(251,191,36,.16);color:#fbbf24;font-weight:800;font-size:12.5px}"
      +".lc86-act{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end}.lc86-act .btn{min-height:44px}@media (max-width:600px){.lc86-list li{grid-template-columns:auto minmax(0,1fr)}.lc86-act{grid-column:1/-1;justify-content:flex-start}}"
      +".lc86-av{border-radius:50%;object-fit:cover;flex:none;display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#38bdf8,#6366f1);color:#0f172a;font-weight:900;font-size:15px;letter-spacing:.02em}"
      +".lc86-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media (max-width:600px){.lc86-two{grid-template-columns:1fr}}.lc86-avrow{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:end}"
      +".lc86-sw{display:flex;gap:10px;align-items:center;min-height:44px;cursor:pointer}.lc86-sw input{width:22px;height:22px}.lc86-h3{margin:6px 0 0;font-size:16px}.lc86-upl{cursor:pointer}"
      +".lc86-items{list-style:none;margin:0;padding:0;display:grid;gap:8px}.lc86-it{display:grid;gap:6px;padding:8px;border-radius:12px;background:#0f172a;border:1px solid #334155}.lc86-it.is-img{grid-template-columns:72px 1fr}.lc86-it img{width:72px;height:72px;object-fit:cover;border-radius:8px;grid-row:span 2}"
      +".lc86-it-tools{display:flex;gap:4px;justify-content:flex-end}.lc86-it-tools .btn{min-height:44px;min-width:44px}.lc86-it.is-msg select{max-width:200px}";
    document.head.appendChild(s);
  }
  let deb=0;
  function afterRender(r){clearTimeout(deb);deb=setTimeout(ownerRows,350)}
  function init(){
    try{
      css();
      if(typeof MOUNT!=="undefined"){MOUNT["wall-cms"]=mount;try{DOC_TITLES["wall-cms"]="Wall of Love: people";ROUTE_TITLES["wall-cms"]="the Wall of Love editor"}catch(e){}}
      try{const lv=LC26.levels,o=lv.minLevel;if(lv&&!lv.__lc86){lv.__lc86=1;lv.minLevel=r=>r==="wall-cms"?1:o(r)}}catch(e){}
      document.addEventListener("click",onClick);
      let d2=0;new MutationObserver(()=>{clearTimeout(d2);d2=setTimeout(ownerRows,200)}).observe(document.body,{childList:true,subtree:true});
    }catch(e){console.error("lc86",e)}
  }
  return{init:init,afterRender:afterRender,mount:mount,version:VERSION,_t:{cleanItems:cleanItems,initials:initials,avatarHTML:avatarHTML,SEED:SEED,load:load,rows:()=>ROWS,state:()=>STATE,editor:editor}};
})(); /*@@end lc86*/
