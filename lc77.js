/*@@module lc77*/
const LC77=(()=>{
  "use strict";
  /* LC77 (build 9.38.3): making books and courses in the app, for the owner.
     1. "New e-book": title, cover, description, price and the PDF file (written in Word or Google Docs, exported as PDF). The PDF is uploaded
        to the Storage bucket lc78-books and opens in the reader (LC75, PDF.js). "E-book (PDF)" on an item replaces the file.
        (9.38.2 had an in-app text editor; 9.38.3 replaced it with PDF only, at the owner's request: lighter and simpler.)
     2. "New video course" and the Course builder: photo, title, description, token price (the lock), modules and lessons with an unlisted
        YouTube link (the thumbnail shows when the link is right), text lessons; up / down / delete; saved automatically.
     3. Settings: the video course shown next to a book (left the book, right the course). SQL: sql/20261113180000_lc78_pdf_books.sql. */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const ic=n=>{try{return icon(n)}catch(e){return""}};
  const say=(t,k)=>{try{toast(t,k||"")}catch(e){}};
  const owner=()=>{try{return !!(LC49.owner()||Admin.active)}catch(e){return false}};
  async function tok(){try{return await LC26.sync.token()}catch(e){return""}}
  async function rpc(fn,args){const t=await tok();if(!t)return{status:0,data:null};try{return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:{Authorization:"Bearer "+t},body:JSON.stringify(args||{})})}catch(e){return{status:0,data:null}}}
  const missing=r=>r&&(r.status===404||(r.data&&/PGRST202|does not exist/i.test(String(r.data.code||"")+String(r.data.message||""))));
  const ytId=u=>{try{return LC70.ytId(u)}catch(e){const m=/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/.exec(String(u||""));return m?m[1]:""}};
  const repaint=()=>{try{LC70.repaint(true)}catch(e){}};

  /* ---------- clean HTML: only document tags, no styles or scripts ---------- */
  const OK={H1:1,H2:1,H3:1,P:1,STRONG:1,EM:1,U:1,UL:1,OL:1,LI:1,BLOCKQUOTE:1,HR:1,BR:1,A:1};
  const MAP={B:"STRONG",I:"EM",H4:"H3",H5:"H3",H6:"H3",DIV:"P",SECTION:"P",ARTICLE:"P"};
  function clean(html){
    const doc=new DOMParser().parseFromString("<body>"+String(html||"")+"</body>","text/html"),out=document.createElement("div");
    const walk=(src,dst)=>{[].slice.call(src.childNodes).forEach(n=>{
      if(n.nodeType===3){dst.appendChild(document.createTextNode(n.nodeValue));return}
      if(n.nodeType!==1)return;let tag=n.tagName.toUpperCase();
      if(/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|META|LINK|TITLE|HEAD|O:P|XML)$/.test(tag))return;
      const cls=(n.getAttribute("class")||"")+" "+(n.getAttribute("style")||"");
      if(tag==="P"&&/MsoTitle/i.test(cls))tag="H1";else if(tag==="P"&&/MsoHeading1|mso-outline-level:\s*1/i.test(cls))tag="H2";else if(tag==="P"&&/MsoHeading[23]|mso-outline-level:\s*[23]/i.test(cls))tag="H3";
      else if(tag==="P"&&/MsoListParagraph/i.test(cls))tag="P";
      if(tag==="SPAN"&&/font-weight:\s*(bold|[6-9]00)/i.test(cls)){const s=document.createElement("strong");walk(n,s);dst.appendChild(s);return}
      if(tag==="SPAN"&&/font-style:\s*italic/i.test(cls)){const s=document.createElement("em");walk(n,s);dst.appendChild(s);return}
      tag=MAP[tag]||tag;
      if(!OK[tag]){walk(n,dst);return}
      const el=document.createElement(tag);
      if(tag==="A"){const h=n.getAttribute("href")||"";if(/^https:\/\//i.test(h)){el.setAttribute("href",h);el.setAttribute("target","_blank");el.setAttribute("rel","noopener noreferrer")}else{walk(n,dst);return}}
      walk(n,el);
      if(/^(P|H1|H2|H3|LI|BLOCKQUOTE)$/.test(tag)&&!el.textContent.trim()&&!el.querySelector("br"))return;
      dst.appendChild(el);
    })};
    walk(doc.body,out);
    /* loose text at the top level becomes a paragraph */
    [].slice.call(out.childNodes).forEach(n=>{if(n.nodeType===3&&n.nodeValue.trim()){const p=document.createElement("p");p.textContent=n.nodeValue.trim();out.replaceChild(p,n)}else if(n.nodeType===3)out.removeChild(n)});
    return out.innerHTML;
  }
  /* ---------- the PDF upload (owner only, Storage bucket lc78-books) ---------- */
  async function uploadPdf(file,id){
    if(!file)return{error:"Choose a PDF file."};
    if(!/pdf$/i.test(file.type||"")&&!/\.pdf$/i.test(file.name||""))return{error:"That is not a PDF. Export your document as PDF first (File > Download > PDF)."};
    if(file.size>50*1024*1024)return{error:"The PDF is larger than 50 MB. Export it with smaller pictures."};
    let c={};try{c=LC26.sync.cfg()}catch(e){}const t=await tok();if(!c.url||!t)return{error:"Sign in as the owner first."};
    const path=String(id||"book").replace(/[^a-z0-9-]/g,"")+"/"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10)+".pdf";
    try{const r=await fetch(c.url+"/storage/v1/object/lc78-books/"+path,{method:"POST",headers:{Authorization:"Bearer "+t,apikey:c.key,"Content-Type":"application/pdf","x-upsert":"true"},body:file});
      if(!r.ok)return{error:r.status===404||r.status===400?"Run sql/20261113180000_lc78_pdf_books.sql first (it makes the storage place for books).":"Upload failed ("+r.status+"). Try again."};
      return{url:c.url+"/storage/v1/object/public/lc78-books/"+path}}catch(e){return{error:"No connection. Try again."}}
  }
  const pdfField='<label class="field"><span class="field-label">The e-book as a PDF file</span><input class="input" type="file" accept="application/pdf,.pdf" data-lc77-pdf></label><label class="field"><span class="field-label">Or the address of a PDF you already uploaded</span><input class="input" name="ebook_url" maxlength="600" placeholder="https://…/book.pdf"></label>';

  /* ---------- items ---------- */
  async function getItem(id){const r=await rpc("lc70_admin_get",{p_id:id});return r.data&&r.data.ok?r.data.item:null}
  async function saveItem(id,changes){
    const it=id?await getItem(id):{};if(id&&!it)return{ok:false,error:"not_found"};
    const p=Object.assign({},it||{},changes);if(!id)delete p.id;
    const r=await rpc("lc70_admin_upsert",{p:p});return r.data||{ok:false};
  }

  /* ---------- 1. new e-book (PDF) ---------- */
  function newItemSheet(kind){
    const course=kind==="course";
    try{openSheet({title:course?"New video course":"New e-book",noFocus:true,cls:"lc77-sheet",html:
      '<form class="stack" data-lc77-new novalidate><label class="field"><span class="field-label">Title</span><input class="input" name="title" maxlength="120" required placeholder="'+(course?"The Caro-Kann in 7 lessons":"The 2000+ Blueprint")+'"></label>'
      +'<label class="field"><span class="field-label">Subtitle (optional)</span><input class="input" name="subtitle" maxlength="200"></label>'
      +'<label class="field"><span class="field-label">'+(course?"Photo":"Cover")+' (address of a picture, or upload)</span><input class="input" name="cover" maxlength="300" placeholder="https://…"></label><label class="btn btn-ghost btn-sm lc77-up">'+ic("upload")+' Upload a picture<input type="file" accept="image/*" hidden data-lc77-up></label>'
      +'<label class="field"><span class="field-label">Description (everybody sees it)</span><textarea class="input" name="blurb" rows="3" maxlength="2000"></textarea></label>'
      +(course?"":pdfField)
      +'<div class="lc77-two"><label class="field"><span class="field-label">Price in tokens (empty = no token price)</span><input class="input" name="tokens" type="number" min="0" inputmode="numeric"></label>'
      +'<label class="lc70-check"><input type="checkbox" name="pro" checked> <span>Included with Pro</span></label></div>'
      +'<p class="small muted">It starts as a draft: only you see it until you publish it.</p><div class="btn-row"><button class="btn btn-primary" type="submit">'+(course?"Create and open the Course builder":"Create the e-book")+'</button></div><p class="form-msg" aria-live="polite"></p></form>',
      onMount:s=>{const f=Q("[data-lc77-new]",s.el),msg=Q(".form-msg",f);
        Q("[data-lc77-up]",f).addEventListener("change",async e=>{const file=e.target.files&&e.target.files[0];if(!file)return;msg.textContent="Uploading…";let u="";try{u=await LC72.upload(file,"gallery")}catch(x){}if(u){f.elements.cover.value=u;msg.textContent="Picture uploaded."}else msg.textContent="Upload failed: paste a picture address instead."});
        f.addEventListener("submit",async e=>{e.preventDefault();const E=f.elements;if(!E.title.value.trim()){msg.textContent="Give it a title.";return}
          const r=await saveItem("",{shelf:"kyenzo",kind:course?"course":"book",status:"draft",title:E.title.value.trim(),subtitle:E.subtitle.value.trim(),author:"Kyenzo Lanckriet",cover:E.cover.value.trim(),blurb:E.blurb.value.trim(),tokens:E.tokens.value?+E.tokens.value:null,pro_included:E.pro.checked,pro_ebook:!course&&E.pro.checked,videos:[]});
          if(!r.ok||!r.id){msg.textContent=r.error==="title"?"Give it a title.":"Could not create it (run the 9.35.0 library SQL?).";return}
          if(!course){const fi=Q("[data-lc77-pdf]",f),file=fi&&fi.files&&fi.files[0];let url=(E.ebook_url.value||"").trim();
            if(file){msg.textContent="Uploading the PDF… (a big file takes a moment)";const u=await uploadPdf(file,r.id);if(u.error){msg.textContent="The e-book was made, but: "+u.error+" Add the PDF later with “E-book (PDF)”.";repaint();return}url=u.url}
            if(url){if(!/^https:\/\//.test(url)){msg.textContent="The PDF address must start with https://";return}await saveItem(r.id,{ebook_url:url})}}
          s.close();repaint();if(course)setTimeout(()=>builder(r.id),250);else say("Your e-book is made as a draft. Check it with Read the book, then publish it with “E-book (PDF)”.","good")})}})}catch(e){}
  }
  /* the e-book (PDF) of an item: replace the file, test it in the reader, publish */
  async function pdfSheet(id){
    const it=await getItem(id);if(!it){say("Could not open this item.","bad");return}
    try{openSheet({title:"E-book (PDF): "+it.title,noFocus:true,cls:"lc77-sheet",html:'<form class="stack" data-lc77-pdfform novalidate>'
      +(it.ebook_url?'<p class="small">Current file: <a href="'+esc(it.ebook_url)+'" target="_blank" rel="noopener noreferrer">open the PDF</a></p>':'<p class="small muted">No PDF yet.</p>')
      +pdfField.replace('name="ebook_url" ','name="ebook_url" value="'+esc(it.ebook_url||"")+'" ')
      +'<p class="small muted">Write the book in Word or Google Docs and export it as PDF. Readers see it page by page in the app and can download it.</p>'
      +'<div class="btn-row"><button class="btn btn-primary" type="submit">Save the PDF</button><button type="button" class="btn btn-ghost" data-lc77-try>Read it in the app</button><button type="button" class="btn '+(it.status==="live"?"btn-ghost":"btn-gold")+'" data-lc77-pub>'+(it.status==="live"?"Unpublish":"Publish")+'</button></div><p class="form-msg" aria-live="polite"></p></form>',
      onMount:s=>{const f=Q("[data-lc77-pdfform]",s.el),msg=Q(".form-msg",f);
        f.addEventListener("submit",async e=>{e.preventDefault();const fi=Q("[data-lc77-pdf]",f),file=fi&&fi.files&&fi.files[0];let url=(f.elements.ebook_url.value||"").trim();
          if(file){msg.textContent="Uploading the PDF… (a big file takes a moment)";const u=await uploadPdf(file,id);if(u.error){msg.textContent=u.error;return}url=u.url}
          if(url&&!/^https:\/\//.test(url)){msg.textContent="The PDF address must start with https://";return}
          const r=await saveItem(id,{ebook_url:url});msg.textContent=r.ok?"Saved.":"Could not save.";if(r.ok){repaint();say("PDF saved.","good")}});
        f.addEventListener("click",async e=>{
          if(e.target.closest("[data-lc77-try]")){s.close();setTimeout(()=>{try{LC75.reader(id)}catch(x){}},250);return}
          const b=e.target.closest("[data-lc77-pub]");if(b){const live=it.status==="live";const r=await rpc("lc70_admin_set",{p_id:id,p:{status:live?"draft":"live"}});if(r.data&&r.data.ok){it.status=live?"draft":"live";b.textContent=live?"Publish":"Unpublish";say(live?"Back to draft.":"Published in the Books Vault.","good");repaint()}}})}})}catch(e){}
  }
  function close(){const o=Q("#lc77-cb");if(o)o.remove();document.body.classList.remove("lc75-noscroll");CB=null;repaint()}
  async function settings(id){
    const it=await getItem(id);if(!it)return;let ex={};try{ex=((await LC72.extras(true)).extras||{})[id]||{}}catch(e){}
    const courses=[];QA("[data-lc70-shelf]").forEach(h=>((h.__d||{}).items||[]).forEach(x=>{if(x.id!==id&&x.kind==="course"&&courses.every(c=>c.id!==x.id))courses.push(x)}));
    try{openSheet({title:"Settings: "+it.title,noFocus:true,cls:"lc77-sheet",html:'<form class="stack" data-lc77-set novalidate>'
      +'<label class="field"><span class="field-label">Subtitle</span><input class="input" name="subtitle" maxlength="200" value="'+esc(it.subtitle)+'"></label>'
      +'<label class="field"><span class="field-label">Cover (picture address)</span><input class="input" name="cover" maxlength="300" value="'+esc(it.cover)+'"></label><label class="btn btn-ghost btn-sm lc77-up">'+ic("upload")+' Upload a cover<input type="file" accept="image/*" hidden data-lc77-up></label>'
      +'<label class="field"><span class="field-label">Description (everybody sees it)</span><textarea class="input" name="blurb" rows="3" maxlength="2000">'+esc(it.blurb)+'</textarea></label>'
      +'<div class="lc77-two"><label class="field"><span class="field-label">Price in tokens</span><input class="input" name="tokens" type="number" min="0" value="'+esc(it.tokens==null?"":it.tokens)+'"></label><label class="lc70-check"><input type="checkbox" name="pro"'+(it.pro_included||it.pro_ebook?" checked":"")+'> <span>Included with Pro</span></label></div>'
      +'<label class="field"><span class="field-label">The video course next to this book (right side)</span><select class="input" name="course"><option value="">None</option>'+courses.map(c=>'<option value="'+esc(c.id)+'"'+(ex.course_id===c.id?" selected":"")+">"+esc(c.title)+"</option>").join("")+"</select></label>"
      +'<div class="btn-row"><button class="btn btn-primary" type="submit">Save</button></div><p class="form-msg" aria-live="polite"></p></form>',
      onMount:s=>{const f=Q("[data-lc77-set]",s.el),msg=Q(".form-msg",f);
        Q("[data-lc77-up]",f).addEventListener("change",async e=>{const file=e.target.files&&e.target.files[0];if(!file)return;msg.textContent="Uploading…";let u="";try{u=await LC72.upload(file,"gallery")}catch(x){}if(u){f.elements.cover.value=u;msg.textContent="Uploaded."}else msg.textContent="Upload failed."});
        f.addEventListener("submit",async e=>{e.preventDefault();const E=f.elements;
          const r=await saveItem(id,{subtitle:E.subtitle.value.trim(),cover:E.cover.value.trim(),blurb:E.blurb.value.trim(),tokens:E.tokens.value?+E.tokens.value:null,pro_included:E.pro.checked,pro_ebook:E.pro.checked});
          await rpc("lc72_lib_extra_set",{p_id:id,p:Object.assign({},ex,{course_id:E.course.value})});
          if(r.ok){s.close();say("Saved.","good");try{await LC72.extras(true)}catch(x){}repaint()}else msg.textContent="Could not save."})}})}catch(e){}
  }

  /* ---------- 2. the Course builder ---------- */
  let CB=null;
  async function builder(id){
    const it=await getItem(id);if(!it){say("Could not open this course.","bad");return}
    close();CB={id:id,it:it,list:(Array.isArray(it.videos)?it.videos:[]).map(v=>Object.assign({},v)),timer:0};
    const ov=document.createElement("div");ov.id="lc77-cb";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");ov.setAttribute("aria-label","Course builder");
    document.body.appendChild(ov);document.body.classList.add("lc75-noscroll");paintBuilder();
  }
  function paintBuilder(){
    const ov=Q("#lc77-cb");if(!ov||!CB)return;const it=CB.it,list=CB.list;
    const mods=[];list.forEach((v,i)=>{const f=v.folder||"Module 1";let m=mods.filter(x=>x.f===f)[0];if(!m){m={f:f,l:[]};mods.push(m)}m.l.push(i)});if(!mods.length)mods.push({f:"Module 1",l:[]});
    const yt=v=>{const y=ytId(v.url);return y?'<img class="lc77-th" src="https://i.ytimg.com/vi/'+y+'/mqdefault.jpg" alt="" loading="lazy">':'<span class="lc77-th is-empty">'+(v.text?"Text":v.pgn?"PGN":"No video yet")+"</span>"};
    ov.innerHTML='<header class="lc77-top"><button type="button" class="lc77-back" data-cb="close">← Library</button><b class="lc77-ttl">Course builder</b><span class="lc77-st" data-cb="st">Saved</span><button type="button" class="btn btn-sm '+(it.status==="live"?"btn-ghost":"btn-gold")+'" data-cb="pub">'+(it.status==="live"?"Unpublish":"Publish")+"</button></header>"
      +'<div class="lc77-cbw"><aside class="lc77-cset"><div class="lc77-cov">'+(it.cover?'<img src="'+esc(it.cover)+'" alt="">':'<span>'+ic("image")+" Photo</span>")+'</div><label class="btn btn-ghost btn-sm lc77-up">'+ic("upload")+' Upload a photo<input type="file" accept="image/*" hidden data-lc77-cbup></label>'
        +'<label class="field"><span class="field-label">Title</span><input class="input" data-cbf="title" maxlength="120" value="'+esc(it.title)+'"></label><label class="field"><span class="field-label">Description</span><textarea class="input" data-cbf="blurb" rows="4" maxlength="2000">'+esc(it.blurb)+'</textarea></label>'
        +'<label class="field"><span class="field-label">'+ic("lock")+' Price in tokens (the lock)</span><input class="input" data-cbf="tokens" type="number" min="0" value="'+esc(it.tokens==null?"":it.tokens)+'" placeholder="e.g. 100"></label><label class="lc70-check"><input type="checkbox" data-cbf="pro_included"'+(it.pro_included?" checked":"")+'> <span>Included with Pro</span></label>'
        +'<p class="small muted">'+list.length+" lessons in "+mods.length+" modules.</p></aside>"
        +'<section class="lc77-cur">'+mods.map(m=>'<div class="lc77-mod"><div class="lc77-modh"><input class="input" data-mod="'+esc(m.f)+'" value="'+esc(m.f)+'" aria-label="Module name"><button type="button" class="btn btn-ghost btn-sm" data-cb="add" data-f="'+esc(m.f)+'">'+ic("plus")+' Lesson</button><button type="button" class="btn btn-ghost btn-sm" data-cb="addtext" data-f="'+esc(m.f)+'">'+ic("file-lines")+" Text lesson</button></div>"
          +(m.l.length?m.l.map(i=>{const v=list[i];return'<div class="lc77-les">'+yt(v)+'<div class="lc77-lf"><input class="input" data-lf="title" data-i="'+i+'" value="'+esc(v.title)+'" placeholder="Lesson title" aria-label="Lesson title">'
            +(v.text!=null?'<textarea class="input" data-lf="text" data-i="'+i+'" rows="3" placeholder="The lesson text">'+esc(v.text)+"</textarea>":v.pgn?'<small class="muted">PGN opening (edit it in the item editor)</small>':'<input class="input" data-lf="url" data-i="'+i+'" value="'+esc(v.url||"")+'" placeholder="Unlisted YouTube link: https://youtu.be/…" inputmode="url" aria-label="YouTube link">'
            +(v.url&&!ytId(v.url)?'<small class="lc77-bad">This is not a YouTube link.</small>':""))
            +'</div><div class="lc77-ord"><button type="button" data-cb="up" data-i="'+i+'" aria-label="Move up">↑</button><button type="button" data-cb="down" data-i="'+i+'" aria-label="Move down">↓</button><button type="button" data-cb="del" data-i="'+i+'" aria-label="Delete the lesson">✕</button></div></div>'}).join(""):'<p class="small muted">No lessons in this module yet.</p>')+"</div>").join("")
        +'<button type="button" class="btn btn-primary" data-cb="addmod">'+ic("folder-plus")+" Add a module</button></section></div>";
  }
  function cbSave(changes){
    if(!CB)return;const st=Q('[data-cb="st"]');if(st)st.textContent="Editing…";Object.assign(CB.it,changes||{});clearTimeout(CB.timer);
    CB.timer=setTimeout(async()=>{if(!CB)return;const r=await saveItem(CB.id,{title:CB.it.title,blurb:CB.it.blurb,cover:CB.it.cover,tokens:CB.it.tokens,pro_included:CB.it.pro_included,videos:CB.list});
      const s2=Q('[data-cb="st"]');if(s2){s2.textContent=r.ok?"Saved":"Not saved";s2.classList.toggle("is-bad",!r.ok)}},900);
  }
  function cbClick(e){
    const b=e.target.closest("[data-cb]");if(!b||!CB)return;const a=b.getAttribute("data-cb"),i=+b.getAttribute("data-i"),L=CB.list;
    if(a==="close"){clearTimeout(CB.timer);saveItem(CB.id,{title:CB.it.title,blurb:CB.it.blurb,cover:CB.it.cover,tokens:CB.it.tokens,pro_included:CB.it.pro_included,videos:L}).then(()=>repaint());close();return}
    if(a==="add"||a==="addtext"){L.push(a==="add"?{title:"New lesson",url:"",folder:b.getAttribute("data-f")}:{title:"New text lesson",text:"",folder:b.getAttribute("data-f")});paintBuilder();cbSave();return}
    if(a==="addmod"){const n="Module "+(new Set(L.map(v=>v.folder||"Module 1")).size+1);L.push({title:"New lesson",url:"",folder:n});paintBuilder();cbSave();return}
    if(a==="up"&&i>0){[L[i-1],L[i]]=[L[i],L[i-1]];if(L[i-1].folder!==L[i].folder)L[i-1].folder=L[i].folder;paintBuilder();cbSave();return}
    if(a==="down"&&i<L.length-1){[L[i+1],L[i]]=[L[i],L[i+1]];paintBuilder();cbSave();return}
    if(a==="del"){if(!window.confirm("Delete this lesson?"))return;L.splice(i,1);paintBuilder();cbSave();return}
    if(a==="pub"){const live=CB.it.status==="live";rpc("lc70_admin_set",{p_id:CB.id,p:{status:live?"draft":"live"}}).then(r=>{if(r.data&&r.data.ok){CB.it.status=live?"draft":"live";paintBuilder();say(live?"Back to draft.":"Published.","good");repaint()}});return}
  }
  function cbInput(e){
    if(!CB)return;const t=e.target;
    if(t.hasAttribute("data-lf")){const i=+t.getAttribute("data-i"),k=t.getAttribute("data-lf");CB.list[i][k]=t.value;
      if(k==="url"&&e.type==="change")paintBuilder();cbSave();return}
    if(t.hasAttribute("data-mod")&&e.type==="change"){const old=t.getAttribute("data-mod"),nv=t.value.trim()||old;CB.list.forEach(v=>{if((v.folder||"Module 1")===old)v.folder=nv});paintBuilder();cbSave();return}
    if(t.hasAttribute("data-cbf")){const k=t.getAttribute("data-cbf");CB.it[k]=t.type==="checkbox"?t.checked:k==="tokens"?(t.value?+t.value:null):t.value;cbSave()}
  }

  /* ---------- owner buttons in the Books Vault ---------- */
  function ownerButtons(){
    if(!owner())return;
    const bar=Q(".lc70-owner");if(bar&&!Q("[data-lc77-new]",bar)){bar.insertAdjacentHTML("afterbegin",'<button type="button" class="btn btn-gold btn-sm" data-lc77-new="book">'+ic("file-pdf")+' New e-book (PDF)</button><button type="button" class="btn btn-gold btn-sm" data-lc77-new="course">'+ic("circle-play")+" New video course</button>")}
    QA(".lc72-row").forEach(row=>{const tools=Q(".lc70-tools",row);if(!tools||Q("[data-lc77-open]",tools))return;const id=String(row.id||"").replace(/^lib-/,"");
      const it=(()=>{let f=null;QA("[data-lc70-shelf]").forEach(h=>{const d=h.__d;if(!f&&d&&d.items)f=d.items.filter(x=>x.id===id)[0]||null});return f||{}})();
      tools.insertAdjacentHTML("afterbegin",(it.kind!=="course"?'<button type="button" class="btn btn-primary btn-sm" data-lc77-open="pdf" data-id="'+esc(id)+'">'+ic("file-pdf")+" E-book (PDF)</button>":"")+'<button type="button" class="btn btn-primary btn-sm" data-lc77-open="builder" data-id="'+esc(id)+'">'+ic("circle-play")+' Course builder</button><button type="button" class="btn btn-ghost btn-sm" data-lc77-open="settings" data-id="'+esc(id)+'">'+ic("gear")+" Settings</button>")});
  }
  function css(){
    if(Q("#lc77-css"))return;const s=document.createElement("style");s.id="lc77-css";
    s.textContent="#lc77-cb{position:fixed;inset:0;z-index:2147482400;background:#0b1222;display:flex;flex-direction:column;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}"
      +".lc77-top{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 12px;background:#0f172a;border-bottom:1px solid #334155}.lc77-top .btn,.lc77-back{min-height:44px}.lc77-back{border:0;background:none;color:#7dd3fc;font-weight:700;cursor:pointer;padding:0 8px}.lc77-ttl{flex:1}.lc77-st{font-size:12px;color:#94a3b8}.lc77-st.is-bad{color:#fca5a5}"
      +".lc77-cbw{flex:1;overflow:auto;display:grid;grid-template-columns:minmax(240px,320px) minmax(0,1fr);gap:16px;padding:16px;align-items:start}@media (max-width:760px){.lc77-cbw{grid-template-columns:1fr}}"
      +".lc77-cset{display:grid;gap:10px;background:#1e293b;border:1px solid #334155;border-radius:16px;padding:14px}.lc77-cov{aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#0f172a;display:grid;place-items:center;color:#94a3b8}.lc77-cov img{width:100%;height:100%;object-fit:cover}"
      +".lc77-cur{display:grid;gap:12px}.lc77-mod{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:12px;display:grid;gap:8px}.lc77-modh{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.lc77-modh .input{flex:1 1 180px;font-weight:800;min-height:44px}.lc77-modh .btn{min-height:44px}"
      +".lc77-les{display:grid;grid-template-columns:120px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px;border-radius:12px;background:#0f172a;border:1px solid #334155}.lc77-lf{display:grid;gap:6px}.lc77-lf .input{min-height:42px}.lc77-th{width:120px;aspect-ratio:16/9;object-fit:cover;border-radius:8px;display:grid;place-items:center;background:#111c33;color:#94a3b8;font-size:12px}"
      +".lc77-ord{display:flex;flex-direction:column;gap:4px}.lc77-ord button{min-width:44px;min-height:36px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;cursor:pointer}.lc77-bad{color:#fca5a5}@media (max-width:520px){.lc77-les{grid-template-columns:1fr auto}.lc77-th{display:none}}"
      +".lc77-two{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:end}@media (max-width:520px){.lc77-two{grid-template-columns:1fr}}.lc77-up{min-height:44px;display:inline-flex;align-items:center;gap:6px;cursor:pointer}";
    document.head.appendChild(s);
  }
  let deb=0;
  function afterRender(){clearTimeout(deb);deb=setTimeout(()=>{try{ownerButtons()}catch(e){}},400)}
  function init(){
    css();
    document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest)return;
      const n=t.closest("[data-lc77-new]");if(n&&n.tagName==="BUTTON"){e.preventDefault();newItemSheet(n.getAttribute("data-lc77-new"));return}
      const o=t.closest("[data-lc77-open]");if(o){e.preventDefault();const k=o.getAttribute("data-lc77-open"),oid=o.getAttribute("data-id");if(k==="pdf")pdfSheet(oid);else if(k==="settings")settings(oid);else builder(oid);return}
      if(t.closest("#lc77-cb"))cbClick(e)},true);
    document.addEventListener("input",e=>{if(e.target.closest&&e.target.closest("#lc77-cb"))cbInput(e)},true);
    document.addEventListener("change",async e=>{const t=e.target;if(!t||!t.closest)return;if(t.closest("#lc77-cb")){if(t.hasAttribute("data-lc77-cbup")){const f=t.files&&t.files[0];if(!f)return;let u="";try{u=await LC72.upload(f,"gallery")}catch(x){}if(u&&CB){CB.it.cover=u;paintBuilder();cbSave()}else say("Upload failed.","bad");return}cbInput(e)}},true);
    new MutationObserver(()=>{clearTimeout(deb);deb=setTimeout(()=>{try{ownerButtons()}catch(e){}},300)}).observe(document.body,{childList:true,subtree:true});
  }
  return{init:init,afterRender:afterRender,builder:builder,pdf:pdfSheet,settings:settings,newItem:newItemSheet,uploadPdf:uploadPdf,clean:clean,version:"9.38.3"};
})(); /*@@end lc77*/
