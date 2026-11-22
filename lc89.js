/*@@module lc89*/
/* LC89 (build 9.52.0): the inline editor ON the landing page (index.html). The readable source of the script between the lc89 markers in index.html.
   1. Hard admin gate. The yellow "Edit this page" button is in the HTML but hidden by CSS. It only shows after the SERVER confirmed that the
      signed-in session is an admin (lc89_whoami: public.is_admin(), the admin_users table). An e-mail typed into localStorage is not enough,
      and every write is checked again on the server (RLS + security definer functions), so nothing can be saved from DevTools.
   2. The editor, right on the page. Every text with a data-cms key (headings, paragraphs, list items, buttons, chips, FAQ) becomes editable in
      place; sections can be hidden or moved; blocks with data-cms-box (the Founder cards, the price cards, the FAQ) can be hidden. The Wall of
      Love cards (lc86_wall_people: name, result tag, avatar, screenshots, chat, order, add, delete) and your own Proof Queue cards
      (lc72_land_items) are edited inline too. One "Save & Publish" sends it all: texts and sections to lc89_cfg 'landing', cards to their tables.
      Every visitor sees it at once, without a code push. The previous 30 versions can be restored (History).
   3. For visitors: the published texts are applied on load (a cached copy first, then the live one). Texts are sanitised before they render:
      only b, strong, i, em, u, s, small, span, br, sup, sub and links (https, / or #) survive; the story block also keeps paragraphs.
   Open: the button (admin only), or /?edit=1. SQL: sql/20261116100000_lc89_lc90_inline_cms_founding_paywall.sql (the owner runs it). */
(function(){
  "use strict";
  var VERSION="9.52.0",W=window,D=document,CACHE="lc89-landing",AUTH="lc26-auth";
  function meta(n){var e=D.querySelector('meta[name="'+n+'"]');return e?e.getAttribute("content")||"":""}
  var SB=meta("lc-sb-url").replace(/\/+$/,""),KEY=meta("lc-sb-key");
  function $$(s,r){return Array.prototype.slice.call((r||D).querySelectorAll(s))}
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function has(o,k){return Object.prototype.hasOwnProperty.call(o,k)}

  /* ---------- 1. the sanitiser (pure: the same rules for the editor and for every visitor) ---------- */
  var INLINE={B:1,STRONG:1,I:1,EM:1,U:1,S:1,SMALL:1,BR:1,SPAN:1,A:1,SUP:1,SUB:1},BLOCK={P:1,UL:1,OL:1,LI:1};
  var DROP=/^(SCRIPT|STYLE|TEMPLATE|IFRAME|OBJECT|EMBED|SVG|MATH|NOSCRIPT|TEXTAREA|SELECT|OPTION|BUTTON|INPUT|IMG|VIDEO|AUDIO|CANVAS|FORM|LINK|META|HEAD|TITLE)$/;
  function safeHref(u){
    u=String(u==null?"":u).trim();
    if(/^https:\/\/[^\s"'<>\\]{3,400}$/i.test(u))return u;
    if(/^\/(?!\/)[^\s"'<>\\]{0,300}$/.test(u))return u;
    if(/^#[A-Za-z0-9_-]{0,60}$/.test(u))return u;
    if(/^mailto:[^\s"'<>@\\]{1,64}@[^\s"'<>\\]{3,120}$/i.test(u))return u;
    return"";
  }
  function external(h){return/^https:/i.test(h)&&h.indexOf(location.origin+"/")!==0}
  function clean(html,block){
    var tpl=D.createElement("template");tpl.innerHTML=String(html==null?"":html).slice(0,8000);
    var out=D.createElement("div");
    (function copy(src,dst){
      for(var n=src.firstChild;n;n=n.nextSibling){
        if(n.nodeType===3){dst.appendChild(D.createTextNode(n.nodeValue));continue}
        if(n.nodeType!==1)continue;
        var t=String(n.tagName).toUpperCase();
        if(DROP.test(t))continue;
        if(block&&t==="DIV")t="P";                                    /* Enter in a story paragraph makes a div: keep it as a paragraph */
        if(INLINE[t]||(block&&BLOCK[t])){
          var e=D.createElement(t.toLowerCase());
          if(t==="A"){var h=safeHref(n.getAttribute("href"));if(h){e.setAttribute("href",h);if(external(h)){e.setAttribute("target","_blank");e.setAttribute("rel","noopener noreferrer")}}}
          if(t==="SPAN"||t==="B"||t==="SMALL"||t==="STRONG"){
            var c=n.getAttribute("class");if(c&&/^[a-z0-9 _-]{1,60}$/i.test(c))e.setAttribute("class",c);
            var st=n.getAttribute("style");if(st&&/^\s*color\s*:\s*var\(--[a-z0-9-]{1,20}\)\s*;?\s*$/i.test(st))e.setAttribute("style",st.trim().replace(/;$/,""));
          }
          copy(n,e);dst.appendChild(e);
        }else copy(n,dst);                                             /* an unknown wrapper: keep its text and its allowed children */
      }
    })(tpl.content,out);
    return out.innerHTML.replace(/​/g,"").replace(/^(\s|&nbsp;|<br>)+|(\s|&nbsp;|<br>)+$/g,"");
  }
  function norm(d){
    var o={v:1,text:{},href:{},hide:{},box:{},order:[]};if(!d||typeof d!=="object")return o;
    ["text","href"].forEach(function(f){var s=d[f];if(s&&typeof s==="object")Object.keys(s).slice(0,600).forEach(function(k){if(/^[a-z0-9]{1,20}\.[a-z0-9]{1,8}$/.test(k)&&typeof s[k]==="string")o[f][k]=s[k].slice(0,8000)})});
    ["hide","box"].forEach(function(f){var s=d[f];if(s&&typeof s==="object")Object.keys(s).slice(0,200).forEach(function(k){if(/^[a-z0-9.-]{1,40}$/.test(k)&&s[k]===true)o[f][k]=true})});
    if(Array.isArray(d.order))d.order.forEach(function(k){if(typeof k==="string"&&/^[a-z0-9-]{1,20}$/.test(k)&&o.order.indexOf(k)<0)o.order.push(k)});
    return o;
  }

  /* ---------- 2. the published page (every visitor) ---------- */
  var ORIG={},ORDER0=[],DOC=norm(null),EDIT=false;
  var keyOf=function(el){return el.getAttribute("data-cms")},isBlock=function(el){return/\.body$/.test(keyOf(el)||"")};
  var hrefEditable=function(el){return el.tagName==="A"&&!el.hasAttribute("data-install")&&!el.hasAttribute("data-app")};
  function snapshot(){
    $$("[data-cms]").forEach(function(el){var k=keyOf(el);if(!has(ORIG,k))ORIG[k]={html:el.innerHTML,href:el.getAttribute("href")}});
    if(!ORDER0.length)ORDER0=$$("[data-cms-sec]").map(function(s){return s.getAttribute("data-cms-sec")});
  }
  function rebase(el){var k=el&&keyOf(el);if(k&&!has(DOC.text,k)&&ORIG[k])ORIG[k].html=el.innerHTML}   /* the LC69 texts become the base */
  function main(){return D.getElementById("main")}
  function secOf(k){return D.querySelector('[data-cms-sec="'+k+'"]')}
  function order(list){
    var m=main();if(!m)return;var want=list.filter(function(k){return ORDER0.indexOf(k)>=0}).concat(ORDER0.filter(function(k){return list.indexOf(k)<0}));
    var now=$$("[data-cms-sec]",m).map(function(s){return s.getAttribute("data-cms-sec")});
    if(now.join()===want.join())return;
    want.forEach(function(k){var s=secOf(k);if(s)m.appendChild(s)});
  }
  function apply(doc){
    DOC=norm(doc);
    $$("[data-cms]").forEach(function(el){
      var k=keyOf(el),o=ORIG[k];if(!o)return;
      if(EDIT&&el===D.activeElement)return;
      var want=has(DOC.text,k)?clean(DOC.text[k],isBlock(el)):o.html;
      if(el.innerHTML!==want)el.innerHTML=want;
      if(hrefEditable(el)){var h=has(DOC.href,k)?safeHref(DOC.href[k]):"";el.setAttribute("href",h||o.href||"#")}
    });
    $$("[data-cms-box]").forEach(function(el){if(DOC.box[el.getAttribute("data-cms-box")])el.setAttribute("data-lc89-off","");else el.removeAttribute("data-lc89-off")});
    $$("[data-cms-sec]").forEach(function(el){if(DOC.hide[el.getAttribute("data-cms-sec")])el.setAttribute("data-lc89-off","");else el.removeAttribute("data-lc89-off")});
    order(DOC.order);
  }
  function rpc(fn,args,token){
    if(!SB||!KEY)return Promise.resolve({status:0,data:null});
    return fetch(SB+"/rest/v1/rpc/"+fn,{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json",apikey:KEY,Authorization:"Bearer "+(token||KEY)},body:JSON.stringify(args||{})})
      .then(function(r){return r.json().catch(function(){return null}).then(function(d){return{status:r.status,data:d}})}).catch(function(){return{status:0,data:null}});
  }
  function missing(r){return!!(r&&(r.status===404||(r.data&&/PGRST202|does not exist|42883|42P01/i.test(String(r.data.code||"")+String(r.data.message||"")))))}
  function load(){
    try{var c=JSON.parse(localStorage.getItem(CACHE)||"null");if(c&&c.v===1)apply(c)}catch(e){}
    rpc("lc89_cfg_public",{p_k:"landing"}).then(function(r){
      if(!r||r.status!==200||!r.data||!r.data.ok)return;var d=norm(r.data.v);
      try{localStorage.setItem(CACHE,JSON.stringify(d))}catch(e){}
      if(!(EDIT&&dirty))apply(d);
    });
  }

  /* ---------- 3. the admin gate: the server decides ---------- */
  function sess(){try{var a=JSON.parse(localStorage.getItem(AUTH)||"null");return a&&a.access_token?a:null}catch(e){return null}}
  function bearer(){
    var a=sess();if(!a||!SB||!KEY)return Promise.resolve("");
    if((+a.exp||0)-6e4>Date.now())return Promise.resolve(a.access_token);
    if(!a.refresh_token)return Promise.resolve("");
    return fetch(SB+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify({refresh_token:a.refresh_token})})
      .then(function(r){return r.ok?r.json():null}).then(function(d){
        if(!d||!d.access_token)return"";
        try{localStorage.setItem(AUTH,JSON.stringify({access_token:d.access_token,refresh_token:d.refresh_token||a.refresh_token,exp:Date.now()+(+d.expires_in||3600)*1e3,email:a.email}))}catch(e){}
        return d.access_token;
      }).catch(function(){return""});
  }
  var ADMIN=false;
  function verify(){
    if(/[?&]preview=/.test(location.search)||!sess())return Promise.resolve(false);
    return bearer().then(function(t){if(!t)return false;return rpc("lc89_whoami",{},t).then(function(r){return!!(r&&r.status===200&&r.data&&r.data.ok&&r.data.admin===true)})});
  }
  function gate(){
    verify().then(function(ok){
      ADMIN=ok;var b=D.getElementById("lc89-edit");
      if(!ok){if(b){b.classList.remove("is-on");b.hidden=true}return}
      try{if(W.__lcWall)W.__lcWall.admin(true)}catch(e){}
      try{if(W.__lcSegAdmin)W.__lcSegAdmin()}catch(e){}   /* 9.65.0: the link to the Elo videos editor under the segment bar */
      if(b){b.hidden=false;b.classList.add("is-on");b.addEventListener("click",function(){enter()})}
      if(/[?&]edit=1(&|$)/.test(location.search))enter();
    });
  }

  /* ---------- 4. the editor ---------- */
  var dirty=false,HIDE={},BOX={},bar=null,fmt=null,WALL=null,WALLDEL=[],PROOF=null,PROOFDEL=[],WALLSTATE="",PROOFSTATE="",unhid=[];
  function css(){
    if(D.getElementById("lc89-css"))return;var s=D.createElement("style");s.id="lc89-css";
    s.textContent="[data-lc89-off]{display:none!important}"
      +".lc89-editing [data-lc89-off]{display:block!important;opacity:.38}.lc89-editing [data-cms-sec][data-lc89-off]{display:block!important}"
      +".lc89-editing body{padding-bottom:150px}.lc89-editing .lc72-edit,.lc89-editing #wl-admin{display:none!important}"
      +".lc89-editing:not(.lc89-preview) #proof-list [data-kind=own]{display:none!important}"
      +".lc89-editing [data-cms-sec]{position:relative;outline:1px dashed rgba(251,191,36,.35);outline-offset:-4px}"
      +".lc89-editing [data-cms]{outline:1px dashed rgba(56,189,248,.45);outline-offset:2px;border-radius:4px;cursor:text;min-width:1ch}"
      +".lc89-editing [data-cms]:hover{outline-color:#38bdf8}.lc89-editing [data-cms]:focus{outline:2px solid #fbbf24;background:rgba(251,191,36,.07)}"
      +".lc89-editing [data-cms].lc89-changed{box-shadow:inset 3px 0 0 #fbbf24}"
      +".lc89-preview [data-cms]{outline:none!important;box-shadow:none!important}.lc89-preview [data-cms-sec]{outline:none!important}.lc89-preview [data-lc89-off]{display:none!important}"
      +".lc89-preview .lc89-secbar,.lc89-preview .lc89-boxbtn,.lc89-preview .lc89-cardbar,.lc89-preview .lc89-add,.lc89-preview .lc89-own{display:none!important}"
      +".lc89-bar{position:fixed;left:0;right:0;bottom:0;z-index:400;background:rgba(2,6,23,.97);border-top:2px solid #fbbf24;padding:10px 12px calc(10px + env(safe-area-inset-bottom));display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;font:14px/1.3 system-ui,sans-serif;color:#e2e8f0}"
      +".lc89-bar .lc89-st{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 180px}.lc89-bar .lc89-st b{color:#fbbf24}.lc89-bar .lc89-st small{color:#94a3b8}"
      +".lc89-bar .lc89-btns{display:flex;flex-wrap:wrap;gap:6px}"
      +".lc89-b{min-height:44px;padding:0 14px;border-radius:999px;border:1px solid rgba(148,163,184,.35);background:#1e293b;color:#e2e8f0;font-weight:700;cursor:pointer;font-size:14px}"
      +".lc89-b.is-gold{background:#fbbf24;color:#241a00;border-color:#fbbf24}.lc89-b.is-gold[disabled]{opacity:.55;cursor:default}.lc89-b.is-sm{min-height:36px;min-width:36px;padding:0 10px;font-size:13px}"
      +".lc89-secbar{position:absolute;top:6px;right:6px;z-index:5;display:flex;gap:4px;align-items:center;background:rgba(2,6,23,.92);border:1px solid #fbbf24;border-radius:999px;padding:3px 4px 3px 10px;font:12px system-ui,sans-serif;color:#fbbf24}"
      +".lc89-secbar span{font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-right:2px}"
      +".lc89-boxbtn{position:absolute;top:4px;right:4px;z-index:5}.lc89-editing [data-cms-box]{position:relative}"
      +"[data-lc89-ui][hidden],.lc89-fmt [hidden]{display:none!important}"
      +".lc89-fmt{position:fixed;z-index:410;display:flex;gap:4px;background:#020617;border:1px solid #fbbf24;border-radius:12px;padding:4px;box-shadow:0 10px 30px rgba(0,0,0,.5)}"
      +".lc89-cardbar{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;width:100%}.lc89-wl{cursor:default!important;display:flex;flex-wrap:wrap;align-items:center;gap:10px}"
      +".lc89-wl.is-off{opacity:.45}.lc89-wl [data-f]{outline:1px dashed rgba(56,189,248,.5);border-radius:4px;min-width:2ch}.lc89-wl [data-f]:focus{outline:2px solid #fbbf24}"
      +".lc89-add{display:grid;place-items:center;min-height:96px;border:2px dashed #fbbf24;border-radius:16px;color:#fbbf24;font-weight:800;background:transparent;cursor:pointer;font-size:15px}"
      +".lc89-own{display:grid;gap:12px;margin:0 0 16px;padding:12px;border:1px dashed #fbbf24;border-radius:16px}.lc89-own h3{margin:0;color:#fbbf24;font-size:15px}"
      +".lc89-own .lc89-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}"
      +".lc89-pc{display:grid;gap:6px;padding:12px;border-radius:14px;background:#1e293b;border:1px solid rgba(148,163,184,.25)}.lc89-pc.is-off{opacity:.45}"
      +".lc89-pc label{display:grid;gap:2px;font-size:12px;color:#94a3b8}.lc89-pc input,.lc89-pc textarea,.lc89-pc select,.lc89-dlg input,.lc89-dlg textarea,.lc89-dlg select{width:100%;box-sizing:border-box;min-height:40px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;padding:8px;font:14px system-ui,sans-serif}"
      +".lc89-pc .lc89-3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.lc89-pc img{max-width:100%;border-radius:8px}"
      +".lc89-ov{position:fixed;inset:0;z-index:420;background:rgba(2,6,23,.8);display:grid;place-items:center;padding:12px}"
      +".lc89-dlg{width:90%;max-width:560px;max-height:88vh;overflow:auto;background:#0f172a;border:1px solid #fbbf24;border-radius:18px;padding:16px;display:grid;gap:10px;color:#e2e8f0;font:14px/1.4 system-ui,sans-serif}"
      +".lc89-dlg h3{margin:0}.lc89-dlg .lc89-it{display:grid;grid-template-columns:64px 1fr auto;gap:8px;align-items:center;padding:8px;border:1px solid #334155;border-radius:12px}"
      +".lc89-dlg .lc89-it img{width:64px;height:64px;object-fit:cover;border-radius:8px}.lc89-dlg .lc89-row{display:flex;flex-wrap:wrap;gap:6px}"
      +".lc89-dlg .lc89-hist li{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #1e293b}"
      +".lc89-msg{min-height:1.2em}";
    D.head.appendChild(s);
  }
  function say(t,bad){var m=bar&&bar.querySelector("[data-lc89-msg]");if(m){m.textContent=t||"";m.style.color=bad?"#f87171":"#94a3b8"}}
  function count(){
    var n=0;$$("[data-cms]").forEach(function(el){var k=keyOf(el),o=ORIG[k];if(!o)return;var bl=isBlock(el),pub=has(DOC.text,k)?clean(DOC.text[k],bl):clean(o.html,bl),ph=(has(DOC.href,k)?safeHref(DOC.href[k]):"")||o.href||"";   /* changed = differs from what is live now */
      var ch=clean(el.innerHTML,bl)!==pub||(hrefEditable(el)&&(el.getAttribute("href")||"")!==ph);el.classList.toggle("lc89-changed",ch);if(ch)n++});
    return n;
  }
  function touch(){dirty=true;paintBar()}
  function paintBar(){
    if(!bar)return;var n=count(),w=(WALL||[]).filter(function(x){return x._d}).length+WALLDEL.length,p=(PROOF||[]).filter(function(x){return x._d}).length+PROOFDEL.length;
    var parts=[];if(n)parts.push(n+(n===1?" text":" texts"));if(w)parts.push(w+(w===1?" Wall card":" Wall cards"));if(p)parts.push(p+(p===1?" proof card":" proof cards"));
    var s=bar.querySelector("[data-lc89-count]");if(s)s.textContent=dirty?(parts.length?parts.join(", ")+" changed":"Sections changed")+" · not published yet":"Everything is published";
    var g=bar.querySelector('[data-lc89="publish"]');if(g)g.disabled=!dirty;
  }
  function enter(){
    if(EDIT||!ADMIN)return;EDIT=true;css();
    D.documentElement.classList.add("lc89-editing");
    HIDE=JSON.parse(JSON.stringify(DOC.hide));BOX=JSON.parse(JSON.stringify(DOC.box));
    /* sections that only show with live content (walkthrough, giveaway, ...) open up so their texts can be edited */
    $$("[data-cms-sec].hide").forEach(function(s){s.classList.remove("hide");unhid.push(s)});
    $$("[data-cms]").forEach(function(el){el.setAttribute("contenteditable","true");el.setAttribute("spellcheck","true")});
    $$("details").forEach(function(d){d.open=true});                                   /* every FAQ answer and every device tab can be edited */
    $$('[role="tabpanel"][hidden]').forEach(function(p){p.hidden=false});
    $$("[data-cms-sec]").forEach(function(s){
      var k=s.getAttribute("data-cms-sec"),b=D.createElement("div");b.className="lc89-secbar";b.setAttribute("data-lc89-ui","");
      b.innerHTML='<span>'+esc(k)+'</span><button type="button" class="lc89-b is-sm" data-lc89="up" data-s="'+k+'" aria-label="Move the '+k+' section up">↑</button><button type="button" class="lc89-b is-sm" data-lc89="down" data-s="'+k+'" aria-label="Move the '+k+' section down">↓</button><button type="button" class="lc89-b is-sm" data-lc89="sec" data-s="'+k+'" aria-pressed="'+!HIDE[k]+'">'+(HIDE[k]?"Hidden":"Shown")+'</button>';
      s.insertBefore(b,s.firstChild);
    });
    $$("[data-cms-box]").forEach(function(x){
      var k=x.getAttribute("data-cms-box"),b=D.createElement("button");b.type="button";b.className="lc89-b is-sm lc89-boxbtn";b.setAttribute("data-lc89","box");b.setAttribute("data-s",k);b.setAttribute("data-lc89-ui","");
      b.textContent=BOX[k]?"Hidden: show":"Hide this";var sm=x.tagName==="DETAILS"&&x.querySelector("summary");if(sm)sm.insertAdjacentElement("afterend",b);else x.insertBefore(b,x.firstChild);
    });
    bar=D.createElement("div");bar.className="lc89-bar";bar.setAttribute("role","region");bar.setAttribute("aria-label","Landing page editor");bar.setAttribute("data-lc89-ui","");
    bar.innerHTML='<div class="lc89-st"><b>✎ Editing the landing page</b><small data-lc89-count>Everything is published</small><small class="lc89-msg" data-lc89-msg aria-live="polite"></small></div>'
      +'<div class="lc89-btns"><button type="button" class="lc89-b" data-lc89="preview" aria-pressed="false">Preview</button><button type="button" class="lc89-b" data-lc89="history">History</button>'
      +'<a class="lc89-b" style="display:inline-flex;align-items:center;text-decoration:none" href="/app.html#landing-editor">Screenshots &amp; video</a>'
      +'<button type="button" class="lc89-b" data-lc89="exit">Exit</button><button type="button" class="lc89-b is-gold" data-lc89="publish" disabled>Save &amp; Publish</button></div>';
    D.body.appendChild(bar);
    fmt=D.createElement("div");fmt.className="lc89-fmt";fmt.hidden=true;fmt.setAttribute("data-lc89-ui","");
    fmt.innerHTML='<button type="button" class="lc89-b is-sm" data-fmt="bold" aria-label="Bold"><b>B</b></button><button type="button" class="lc89-b is-sm" data-fmt="italic" aria-label="Italic"><i>I</i></button><button type="button" class="lc89-b is-sm" data-fmt="link">Link</button><button type="button" class="lc89-b is-sm" data-fmt="href" hidden>Button link</button><button type="button" class="lc89-b is-sm" data-fmt="reset">Original</button>';
    D.body.appendChild(fmt);
    D.addEventListener("click",onClick,true);D.addEventListener("input",onInput,true);D.addEventListener("paste",onPaste,true);D.addEventListener("keydown",onKey,true);
    D.addEventListener("focusin",onFocus,true);D.addEventListener("focusout",function(){setTimeout(function(){var a=D.activeElement;if(fmt&&!(a&&(a.closest("[data-cms]")||a.closest(".lc89-fmt"))))fmt.hidden=true},150)},true);
    W.addEventListener("beforeunload",function(e){if(dirty){e.preventDefault();e.returnValue=""}});
    W.addEventListener("scroll",placeFmt,{passive:true});
    loadCards();paintBar();say("Tap any text to change it. Nothing is live until you press Save & Publish.");
  }
  /* clicks inside the page: edit, never navigate or flip while editing */
  function onClick(e){
    var t=e.target;if(!t||!t.closest)return;
    var ui=t.closest("[data-lc89],[data-fmt],[data-wl-a],[data-pc-a]");
    if(ui){e.preventDefault();e.stopPropagation();act(ui);return}
    if(t.closest(".lc89-ov,.lc89-bar,.lc89-own input,.lc89-own textarea,.lc89-own select,.lc89-own label"))return;
    if(D.documentElement.classList.contains("lc89-preview"))return;
    if(t.closest("[data-cms],.lc89-wl,#wl-grid"))  {var a=t.closest("a,summary,button,.flip,[data-wl],[data-detail]");if(a||t.closest("[data-cms]")){e.preventDefault();e.stopPropagation()}}
  }
  function onInput(e){var t=e.target;if(!t||!t.closest)return;
    var f=t.closest(".lc89-wl [data-f]");if(f){var r=WALL[+f.closest(".lc89-wl").getAttribute("data-i")];if(r){r[f.getAttribute("data-f")]=f.textContent.replace(/\s+/g," ").trim();mark(r,"wall")}return}
    var pc=t.closest(".lc89-pc [name]");if(pc&&!t.closest(".lc89-ov")){var row=PROOF[+pc.closest(".lc89-pc").getAttribute("data-i")];if(row){row[pc.name]=pc.type==="checkbox"?pc.checked:pc.value;mark(row,"proof")}return}
    if(t.closest("[data-cms]"))touch();
  }
  function onPaste(e){var t=e.target&&e.target.closest&&e.target.closest("[data-cms],.lc89-wl [data-f]");if(!t)return;e.preventDefault();
    var txt=(e.clipboardData||W.clipboardData).getData("text/plain")||"";try{D.execCommand("insertText",false,txt)}catch(x){}}
  function onKey(e){var t=e.target&&e.target.closest&&e.target.closest("[data-cms],.lc89-wl [data-f]");if(!t||e.key!=="Enter")return;
    if(t.hasAttribute("data-f")||!(isBlock(t)||e.shiftKey)){e.preventDefault();if(e.shiftKey&&!t.hasAttribute("data-f")){try{D.execCommand("insertLineBreak")}catch(x){}}}}
  var focusEl=null;
  function onFocus(e){var t=e.target&&e.target.closest&&e.target.closest("[data-cms]");if(!t||!EDIT||D.documentElement.classList.contains("lc89-preview"))return;focusEl=t;
    fmt.querySelector('[data-fmt="href"]').hidden=!hrefEditable(t);fmt.hidden=false;placeFmt()}
  function placeFmt(){if(!fmt||fmt.hidden||!focusEl)return;var r=focusEl.getBoundingClientRect(),h=fmt.offsetHeight||44;
    fmt.style.top=Math.max(6,r.top-h-8<6?r.bottom+8:r.top-h-8)+"px";fmt.style.left=Math.max(6,Math.min(innerWidth-(fmt.offsetWidth||260)-6,r.left))+"px"}
  function act(b){
    var a=b.getAttribute("data-lc89")||"",k=b.getAttribute("data-s")||"";
    if(b.hasAttribute("data-fmt"))return doFmt(b.getAttribute("data-fmt"));
    if(b.hasAttribute("data-wl-a"))return wallAct(b);
    if(b.hasAttribute("data-pc-a"))return proofAct(b);
    if(a==="sec"){HIDE[k]=!HIDE[k];var s=secOf(k);if(HIDE[k])s.setAttribute("data-lc89-off","");else s.removeAttribute("data-lc89-off");b.textContent=HIDE[k]?"Hidden":"Shown";b.setAttribute("aria-pressed",String(!HIDE[k]));touch();return}
    if(a==="box"){BOX[k]=!BOX[k];var x=D.querySelector('[data-cms-box="'+k+'"]');if(BOX[k])x.setAttribute("data-lc89-off","");else x.removeAttribute("data-lc89-off");b.textContent=BOX[k]?"Hidden: show":"Hide this";touch();return}
    if(a==="up"||a==="down"){var m=main(),s2=secOf(k),list=$$("[data-cms-sec]",m),i=list.indexOf(s2),j=a==="up"?i-1:i+1;if(j<0||j>=list.length)return;
      if(a==="up")m.insertBefore(s2,list[j]);else m.insertBefore(list[j],s2);s2.scrollIntoView({block:"start"});touch();return}
    if(a==="preview"){var on=!D.documentElement.classList.contains("lc89-preview");D.documentElement.classList.toggle("lc89-preview",on);b.setAttribute("aria-pressed",String(on));b.textContent=on?"Back to editing":"Preview";
      $$("[data-cms],.lc89-wl [data-f]").forEach(function(el){el.setAttribute("contenteditable",on?"false":"true")});if(fmt)fmt.hidden=true;return}
    if(a==="history")return history();
    if(a==="exit"){if(dirty&&!W.confirm("Leave without publishing? Your changes are lost."))return;dirty=false;location.href=location.pathname+location.hash;return}
    if(a==="publish")return publish();
  }
  function doFmt(f){
    var el=focusEl;if(!el)return;el.focus();
    if(f==="bold"||f==="italic"){try{D.execCommand(f)}catch(e){}touch();return}
    if(f==="link"){var u=safeHref(W.prompt("Link address (https://…, /page or #section):","https://"));if(!u){say("That link is not allowed: use https://, a /page or a #section.",true);return}try{D.execCommand("createLink",false,u)}catch(e){}touch();return}
    if(f==="href"){var cur=el.getAttribute("href")||"",h=W.prompt("Where does this button go? (https://…, /page or #section)",cur);if(h==null)return;h=safeHref(h);if(!h){say("That link is not allowed: use https://, a /page or a #section.",true);return}
      el.setAttribute("href",h);if(h!==(ORIG[keyOf(el)]||{}).href)el.setAttribute("data-lc89-href",h);else el.removeAttribute("data-lc89-href");touch();return}
    if(f==="reset"){var o=ORIG[keyOf(el)];if(o){el.innerHTML=o.html;if(hrefEditable(el)){el.setAttribute("href",o.href||"#");el.setAttribute("data-lc89-href",o.href||"")}}touch();return}
  }
  function collect(){
    var doc={v:1,text:{},href:{},hide:{},box:{},order:[]};
    $$("[data-cms]").forEach(function(el){var k=keyOf(el),o=ORIG[k];if(!o)return;var b=isBlock(el),cur=clean(el.innerHTML,b);
      if(cur!==clean(o.html,b))doc.text[k]=cur;
      if(hrefEditable(el)){var h=el.hasAttribute("data-lc89-href")?safeHref(el.getAttribute("data-lc89-href")):(has(DOC.href,k)?safeHref(DOC.href[k]):"");if(h&&h!==o.href)doc.href[k]=h}});
    Object.keys(HIDE).forEach(function(k){if(HIDE[k])doc.hide[k]=true});Object.keys(BOX).forEach(function(k){if(BOX[k])doc.box[k]=true});
    var now=$$("[data-cms-sec]",main()).map(function(s){return s.getAttribute("data-cms-sec")});if(now.join()!==ORDER0.join())doc.order=now;
    return doc;
  }
  var ERR={unsafe:"Something in a text looks like code (a script or an on…= handler). Remove it and try again.",too_big:"The page is too big to save (over 300 kB of text).",shape:"The page could not be read.",key:"Unknown setting."};
  function publish(){
    var g=bar.querySelector('[data-lc89="publish"]');g.disabled=true;say("Publishing…");
    var doc=collect();
    bearer().then(function(t){
      if(!t){say("Your sign-in has expired. Open the app, sign in again, then come back.",true);g.disabled=false;return}
      return rpc("lc89_cfg_save",{p_k:"landing",p_v:doc},t).then(function(r){
        if(missing(r)){say("Run sql/20261116100000_lc89_lc90_inline_cms_founding_paywall.sql in the Supabase SQL editor first.",true);g.disabled=false;return}
        if(!(r&&r.status===200&&r.data&&r.data.ok)){say(r&&r.data&&ERR[r.data.error]||(r&&(r.status===401||r.status===403)?"Only an admin can publish. Sign in with the owner account.":"Could not publish. Nothing changed. Try again."),true);g.disabled=false;return}
        DOC=norm(doc);try{localStorage.setItem(CACHE,JSON.stringify(DOC))}catch(e){}
        return saveCards(t).then(function(fails){
          dirty=fails.length>0;paintBar();
          say(fails.length?"Texts published. Not saved: "+fails.join(" · "):"Published. Every visitor sees it now.",!!fails.length);
          if(!fails.length){$$("[data-lc89-href]").forEach(function(el){el.removeAttribute("data-lc89-href")})}
        });
      });
    });
  }
  function overlay(html,onMount){
    var ov=D.createElement("div");ov.className="lc89-ov";ov.setAttribute("data-lc89-ui","");
    ov.innerHTML='<div class="lc89-dlg" role="dialog" aria-modal="true">'+html+"</div>";D.body.appendChild(ov);
    var close=function(){ov.remove()};ov.addEventListener("click",function(e){if(e.target===ov||(e.target.closest&&e.target.closest("[data-close]")))close()});
    D.addEventListener("keydown",function k(e){if(e.key==="Escape"&&D.body.contains(ov)){close();D.removeEventListener("keydown",k)}});
    if(onMount)onMount(ov.firstChild,close);var f=ov.querySelector("input,textarea,button");if(f)f.focus();return close;
  }
  function history(){
    bearer().then(function(t){return rpc("lc89_cfg_history",{p_k:"landing"},t)}).then(function(r){
      var rows=r&&r.data&&r.data.ok?r.data.rows:null;
      overlay("<h3>Earlier versions</h3>"+(rows&&rows.length?'<ul class="lc89-hist" style="list-style:none;margin:0;padding:0">'+rows.map(function(x){return"<li><span>"+esc(new Date(x.saved_at).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))+'</span><button type="button" class="lc89-b is-sm" data-restore="'+(+x.id)+'">Restore</button></li>'}).join("")+"</ul>":"<p>"+(rows?"No earlier versions yet. Every publish keeps the one before it.":"The history could not load.")+"</p>")
        +'<p style="color:#94a3b8;font-size:13px;margin:0">Restoring publishes that version right away. The Wall of Love and proof cards are not part of it.</p><div class="lc89-row"><button type="button" class="lc89-b" data-close>Close</button></div>',function(box,close){
        box.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-restore]");if(!b)return;if(!W.confirm("Publish this earlier version now?"))return;b.disabled=true;
          bearer().then(function(t){return rpc("lc89_cfg_restore",{p_id:+b.getAttribute("data-restore")},t)}).then(function(r){if(r&&r.data&&r.data.ok){dirty=false;try{localStorage.removeItem(CACHE)}catch(x){}location.reload()}else{b.disabled=false;say("Could not restore that version.",true);close()}})});
      });
    });
  }

  /* ---------- 5. Wall of Love and Proof Queue cards, inline ---------- */
  var HTTPS=/^https:\/\/[^\s"'<>]{3,400}$/;
  function initials(n){return String(n||"?").trim().split(/\s+/).map(function(w){return w.replace(/[^A-Za-z0-9À-ɏ]/g,"").charAt(0)}).filter(Boolean).slice(0,2).join("").toUpperCase()||"?"}
  function mark(r,kind){r._d=true;if(kind==="wall"&&r._seed)(WALL||[]).forEach(function(x){if(x._seed)x._d=true});touch()}   /* a starter card edited: all starters become real rows */
  function loadCards(){
    bearer().then(function(t){return Promise.all([rpc("lc86_wall_admin",{},t),rpc("lc72_land_admin",{},t)])}).then(function(a){
      var w=a[0],l=a[1];
      if(w&&w.status===200&&w.data&&w.data.ok){WALL=(w.data.rows||[]).map(function(r){return{id:r.id,name:r.name,tag:r.tag||"",avatar:r.avatar||"",items:Array.isArray(r.items)?r.items:[],visible:r.visible!==false,sort:+r.sort||0}});WALLSTATE="ok"}
      else WALLSTATE=missing(w)?"nosql":"error";
      if(WALLSTATE==="ok"&&!WALL.length){var sd={};try{sd=W.__lcWall?W.__lcWall.seeds():{}}catch(e){sd={}}WALL=Object.keys(sd).map(function(k,i){var p=sd[k];return{id:null,name:p.name,tag:p.tag,avatar:p.avatar||"",items:(p.items||[]).slice(),visible:true,sort:i*10,_seed:true}})}
      if(l&&l.status===200&&l.data&&l.data.ok){PROOF=(l.data.items||[]).filter(function(x){return x.kind==="proof"}).map(function(x){return{id:x.id,name:x.name||"",role:x.role||"",site:x.site||"",start:x.start_r==null?"":String(x.start_r),peak:x.peak_r==null?"":String(x.peak_r),days:x.days==null?"":String(x.days),body:x.body||"",shot:x.shot||"",link:x.link||"",pinned:!!x.pinned,visible:x.visible!==false,sort:+x.sort||0}});PROOFSTATE="ok"}
      else PROOFSTATE=missing(l)?"nosql":"error";
      paintWall();paintProof();
    });
  }
  function paintWall(){
    var g=D.getElementById("wl-grid");if(!g||!EDIT)return;
    if(WALLSTATE!=="ok"){g.insertAdjacentHTML("beforebegin",'<p class="lc89-own" data-lc89-ui>'+(WALLSTATE==="nosql"?"The Wall of Love table is not set up: run sql/20261115140000_lc86_wall_people.sql.":"The Wall of Love could not load for editing. Reload the page.")+"</p>");return}
    g.innerHTML=WALL.map(function(r,i){
      var n=(r.items||[]).filter(function(x){return x.t==="img"}).length,m=(r.items||[]).filter(function(x){return x.t==="msg"}).length;
      return'<div class="card wl-card lc89-wl'+(r.visible?"":" is-off")+'" role="listitem" data-i="'+i+'">'+(HTTPS.test(r.avatar||"")?'<img class="wl-av" src="'+esc(r.avatar)+'" alt="" loading="lazy">':'<span class="wl-av" aria-hidden="true">'+esc(initials(r.name))+"</span>")
        +'<span class="wl-who"><b class="wl-name" contenteditable="true" data-f="name" aria-label="First name">'+esc(r.name)+'</b><span class="wl-tag" contenteditable="true" data-f="tag" aria-label="Result tag">'+esc(r.tag)+"</span></span>"
        +'<div class="lc89-cardbar"><button type="button" class="lc89-b is-sm" data-wl-a="proof" data-i="'+i+'">Proof: '+n+" "+(n===1?"screenshot":"screenshots")+", "+m+" chat</button>"
        +'<button type="button" class="lc89-b is-sm" data-wl-a="up" data-i="'+i+'" aria-label="Move left">↑</button><button type="button" class="lc89-b is-sm" data-wl-a="down" data-i="'+i+'" aria-label="Move right">↓</button>'
        +'<button type="button" class="lc89-b is-sm" data-wl-a="vis" data-i="'+i+'">'+(r.visible?"Shown":"Hidden")+'</button><button type="button" class="lc89-b is-sm" data-wl-a="del" data-i="'+i+'" aria-label="Delete '+esc(r.name)+'">Delete</button></div></div>';
    }).join("")+'<button type="button" class="lc89-add" data-wl-a="add">+ Add a person</button>';
  }
  function wallAct(b){
    var a=b.getAttribute("data-wl-a"),i=+b.getAttribute("data-i"),r=WALL&&WALL[i];
    if(a==="add"){WALL.push({id:null,name:"New member",tag:"+0 Elo",avatar:"",items:[],visible:true,sort:WALL.length*10});mark(WALL[WALL.length-1],"wall");paintWall();var c=D.querySelector('.lc89-wl[data-i="'+(WALL.length-1)+'"] [data-f="name"]');if(c){c.focus();try{D.execCommand("selectAll")}catch(e){}}return}
    if(!r)return;
    if(a==="up"||a==="down"){var j=a==="up"?i-1:i+1;if(j<0||j>=WALL.length)return;var x=WALL[j];WALL[j]=r;WALL[i]=x;WALL.forEach(function(w,n){if(w.sort!==n*10){w.sort=n*10;mark(w,"wall")}});paintWall();return}
    if(a==="vis"){r.visible=!r.visible;mark(r,"wall");paintWall();return}
    if(a==="del"){if(!W.confirm("Delete "+(r.name||"this person")+" from the Wall of Love? This happens when you publish."))return;if(r.id)WALLDEL.push(r.id);WALL.splice(i,1);if(r._seed)WALL.forEach(function(w){if(w._seed)w._d=true});touch();paintWall();return}
    if(a==="proof")return wallDialog(r);
  }
  function upload(file,dir){
    return bearer().then(function(t){
      if(!t)return"";
      return new Promise(function(res){
        try{createImageBitmap(file).then(function(bm){var k=Math.min(1,1600/Math.max(bm.width,bm.height)),cv=D.createElement("canvas");cv.width=Math.round(bm.width*k);cv.height=Math.round(bm.height*k);cv.getContext("2d").drawImage(bm,0,0,cv.width,cv.height);cv.toBlob(function(b){res(b||file)},"image/webp",.85)},function(){res(file)})}catch(e){res(file)}
      }).then(function(blob){
        var ext=/webp/.test(blob.type||"")?"webp":/png/.test(blob.type||"")?"png":"jpg",path=dir+"/"+Date.now()+"-"+Math.random().toString(36).slice(2,8)+"."+ext;
        return fetch(SB+"/storage/v1/object/lc72-landing/"+path,{method:"POST",headers:{Authorization:"Bearer "+t,apikey:KEY,"Content-Type":blob.type||"image/jpeg","x-upsert":"true"},body:blob})
          .then(function(r){return r.ok?SB+"/storage/v1/object/public/lc72-landing/"+path:""}).catch(function(){return""});
      });
    });
  }
  function wallDialog(r){
    var it=JSON.parse(JSON.stringify(r.items||[])),av=r.avatar||"";
    function list(){return it.map(function(x,i){
      var tools='<span class="lc89-row"><button type="button" class="lc89-b is-sm" data-it="up" data-n="'+i+'" aria-label="Up">↑</button><button type="button" class="lc89-b is-sm" data-it="down" data-n="'+i+'" aria-label="Down">↓</button><button type="button" class="lc89-b is-sm" data-it="del" data-n="'+i+'" aria-label="Remove">✕</button></span>';
      if(x.t==="img")return'<div class="lc89-it"><img src="'+esc(x.url)+'" alt=""><input data-cap="'+i+'" placeholder="Caption (optional)" maxlength="140" value="'+esc(x.cap||"")+'">'+tools+"</div>";
      return'<div class="lc89-it"><select data-from="'+i+'"><option value="member"'+(x.from!=="coach"?" selected":"")+'>Member</option><option value="coach"'+(x.from==="coach"?" selected":"")+'>Kyenzo</option></select><textarea data-text="'+i+'" rows="2" maxlength="1000">'+esc(x.text||"")+"</textarea>"+tools+"</div>";
    }).join("")||'<p style="color:#94a3b8">No proof yet: add screenshots or chat lines.</p>'}
    overlay("<h3>Proof for "+esc(r.name)+'</h3><label>Avatar (https:// address, or upload; empty = initials)<input data-av value="'+esc(av)+'" inputmode="url" placeholder="https://…"></label>'
      +'<div class="lc89-row"><label class="lc89-b is-sm" style="display:inline-flex;align-items:center;cursor:pointer">Upload avatar<input type="file" accept="image/*" data-up="av" hidden></label></div>'
      +'<div data-items>'+list()+'</div><div class="lc89-row"><label class="lc89-b is-sm" style="display:inline-flex;align-items:center;cursor:pointer">+ Screenshots<input type="file" accept="image/*" multiple data-up="img" hidden></label><button type="button" class="lc89-b is-sm" data-add="url">+ Screenshot by URL</button><button type="button" class="lc89-b is-sm" data-add="msg">+ Chat line</button></div>'
      +'<p class="lc89-msg" data-dmsg aria-live="polite" style="color:#94a3b8"></p><div class="lc89-row"><button type="button" class="lc89-b is-gold" data-done>Done</button><button type="button" class="lc89-b" data-close>Cancel</button></div>',function(box,close){
      var paint=function(){box.querySelector("[data-items]").innerHTML=list()},dm=function(t){box.querySelector("[data-dmsg]").textContent=t||""};
      var sync=function(){$$("[data-cap]",box).forEach(function(x){it[+x.getAttribute("data-cap")].cap=x.value});$$("[data-text]",box).forEach(function(x){it[+x.getAttribute("data-text")].text=x.value});$$("[data-from]",box).forEach(function(x){it[+x.getAttribute("data-from")].from=x.value})};
      box.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-it],[data-add],[data-done]");if(!b)return;sync();
        if(b.hasAttribute("data-it")){var n=+b.getAttribute("data-n"),k=b.getAttribute("data-it");if(k==="del")it.splice(n,1);else{var j=k==="up"?n-1:n+1;if(j>=0&&j<it.length){var x=it[j];it[j]=it[n];it[n]=x}}paint();return}
        if(b.getAttribute("data-add")==="msg"){if(it.length>=24){dm("24 items is the maximum.");return}it.push({t:"msg",from:"member",text:""});paint();return}
        if(b.getAttribute("data-add")==="url"){var u=W.prompt("Screenshot address (https://…)","https://");if(u&&HTTPS.test(u.trim())&&it.length<24){it.push({t:"img",url:u.trim(),cap:""});paint()}else if(u)dm("Use an https:// address.");return}
        if(b.hasAttribute("data-done")){var a=box.querySelector("[data-av]").value.trim();if(a&&!HTTPS.test(a)){dm("The avatar must be an https:// address.");return}
          r.avatar=a;r.items=it.filter(function(x){return x.t==="img"?HTTPS.test(x.url||""):String(x.text||"").trim()}).slice(0,24).map(function(x){return x.t==="img"?{t:"img",url:x.url,cap:String(x.cap||"").replace(/[<>]/g,"").slice(0,140)}:{t:"msg",from:x.from==="coach"?"coach":"member",text:String(x.text).replace(/[<>]/g,"").trim().slice(0,1000)}});
          mark(r,"wall");paintWall();close()}
      });
      box.addEventListener("change",function(e){var f=e.target;if(!f||!f.getAttribute||!f.getAttribute("data-up"))return;var files=Array.prototype.slice.call(f.files||[]);if(!files.length)return;sync();dm("Uploading…");
        if(f.getAttribute("data-up")==="av")upload(files[0],"wall").then(function(u){if(u){box.querySelector("[data-av]").value=u;dm("Avatar uploaded.")}else dm("The upload failed. Try again or paste an https:// address.")});
        else files.slice(0,24-it.length).reduce(function(p,file){return p.then(function(){return upload(file,"wall").then(function(u){if(u)it.push({t:"img",url:u,cap:""})})})},Promise.resolve()).then(function(){paint();dm("Uploaded.")});
        f.value=""});
    });
  }
  function paintProof(){
    var pl=D.getElementById("proof-list");if(!pl||!EDIT)return;var host=D.getElementById("lc89-proof-own");
    if(!host){host=D.createElement("div");host.id="lc89-proof-own";host.className="lc89-own";host.setAttribute("data-lc89-ui","");pl.parentNode.insertBefore(host,pl)}
    if(PROOFSTATE!=="ok"){host.innerHTML="<p>"+(PROOFSTATE==="nosql"?"The proof cards table is not set up: run sql/20261113100000_lc72_lc73_launch_funnels.sql.":"Your proof cards could not load for editing. Reload the page.")+"</p>";return}
    var I=function(r,i,n,l,t,x){return"<label>"+l+'<input name="'+n+'" '+(t||"")+' value="'+esc(r[n])+'" '+(x||"")+"></label>"};
    host.innerHTML="<h3>Your proof cards</h3><p style=\"margin:0;color:#94a3b8;font-size:13px\">Cards you add yourself (“Shared by Kyenzo”). Member results come from the members and are approved in the app (Admin, Proof Queue).</p><div class=\"lc89-grid\">"+PROOF.map(function(r,i){
      return'<div class="lc89-pc'+(r.visible?"":" is-off")+'" data-i="'+i+'">'+I(r,i,"name","First name",'maxlength="60"')+I(r,i,"role","Line under the name (optional)",'maxlength="120"')
        +'<label>Site<select name="site"><option value=""'+(r.site?"":" selected")+'>None</option><option value="chesscom"'+(r.site==="chesscom"?" selected":"")+'>Chess.com</option><option value="lichess"'+(r.site==="lichess"?" selected":"")+'>Lichess</option><option value="other"'+(r.site==="other"?" selected":"")+">Other</option></select></label>"
        +'<div class="lc89-3">'+I(r,i,"start","Start Elo",'inputmode="numeric"')+I(r,i,"peak","Peak Elo",'inputmode="numeric"')+I(r,i,"days","Days",'inputmode="numeric"')+"</div>"
        +'<label>Quote (optional)<textarea name="body" rows="3" maxlength="1200">'+esc(r.body)+"</textarea></label>"+I(r,i,"link","Public profile link (https://, optional)",'inputmode="url"')
        +(HTTPS.test(r.shot||"")?'<img src="'+esc(r.shot)+'" alt="">':"")+'<div class="lc89-row" style="display:flex;flex-wrap:wrap;gap:6px"><label class="lc89-b is-sm" style="display:inline-flex;align-items:center;cursor:pointer">'+(r.shot?"Change screenshot":"Add screenshot")+'<input type="file" accept="image/*" data-pc-up="'+i+'" hidden></label>'
        +(r.shot?'<button type="button" class="lc89-b is-sm" data-pc-a="noshot" data-i="'+i+'">Remove screenshot</button>':"")
        +'<button type="button" class="lc89-b is-sm" data-pc-a="pin" data-i="'+i+'" aria-pressed="'+r.pinned+'">'+(r.pinned?"Pinned first":"Pin first")+'</button><button type="button" class="lc89-b is-sm" data-pc-a="up" data-i="'+i+'" aria-label="Move up">↑</button><button type="button" class="lc89-b is-sm" data-pc-a="down" data-i="'+i+'" aria-label="Move down">↓</button>'
        +'<button type="button" class="lc89-b is-sm" data-pc-a="vis" data-i="'+i+'">'+(r.visible?"Shown":"Hidden")+'</button><button type="button" class="lc89-b is-sm" data-pc-a="del" data-i="'+i+'">Delete</button></div></div>';
    }).join("")+'<button type="button" class="lc89-add" data-pc-a="add">+ Add a proof card</button></div>';
    if(!host.__up){host.__up=1;host.addEventListener("change",function(e){var f=e.target;if(!f||!f.getAttribute)return;var i=f.getAttribute("data-pc-up");if(i==null||!f.files||!f.files[0])return;var r=PROOF[+i];say("Uploading…");
      upload(f.files[0],"proof").then(function(u){if(u){r.shot=u;mark(r,"proof");paintProof();say("Screenshot uploaded. Publish to make it live.")}else say("The upload failed. Try again.",true)});f.value=""})}
  }
  function proofAct(b){
    var a=b.getAttribute("data-pc-a"),i=+b.getAttribute("data-i"),r=PROOF&&PROOF[i];
    if(a==="add"){PROOF.push({id:null,name:"",role:"",site:"",start:"",peak:"",days:"",body:"",shot:"",link:"",pinned:false,visible:true,sort:PROOF.length*10});mark(PROOF[PROOF.length-1],"proof");paintProof();var c=D.querySelector('.lc89-pc[data-i="'+(PROOF.length-1)+'"] [name="name"]');if(c)c.focus();return}
    if(!r)return;
    if(a==="up"||a==="down"){var j=a==="up"?i-1:i+1;if(j<0||j>=PROOF.length)return;var x=PROOF[j];PROOF[j]=r;PROOF[i]=x;PROOF.forEach(function(w,n){if(w.sort!==n*10){w.sort=n*10;mark(w,"proof")}});paintProof();return}
    if(a==="vis"){r.visible=!r.visible;mark(r,"proof");paintProof();return}
    if(a==="pin"){r.pinned=!r.pinned;mark(r,"proof");paintProof();return}
    if(a==="noshot"){r.shot="";mark(r,"proof");paintProof();return}
    if(a==="del"){if(!W.confirm("Delete this proof card? This happens when you publish."))return;if(r.id)PROOFDEL.push(r.id);PROOF.splice(i,1);touch();paintProof();return}
  }
  var WERR={name:"a first name is missing",avatar:"an avatar is not https://",wording:"no “lifetime”, “forever” or “guaranteed”",full:"the maximum is reached",invalid:"something is not valid"};
  function saveCards(t){
    var fails=[],p=Promise.resolve();
    WALLDEL.slice().forEach(function(id){p=p.then(function(){return rpc("lc86_wall_del",{p_id:id},t).then(function(r){if(r&&r.data&&r.data.ok!==undefined){WALLDEL.splice(WALLDEL.indexOf(id),1)}else fails.push("a Wall delete")})})});
    (WALL||[]).forEach(function(r,i){if(!r._d)return;p=p.then(function(){
      var body={id:r.id||null,name:String(r.name||"").trim(),tag:String(r.tag||"").trim(),avatar:String(r.avatar||"").trim(),items:r.items||[],visible:r.visible!==false,sort:i*10};
      return rpc("lc86_wall_save",{p:body},t).then(function(x){if(x&&x.data&&x.data.ok){r.id=x.data.id;r._d=false;r._seed=false}else fails.push((r.name||"a Wall card")+": "+(WERR[x&&x.data&&x.data.error]||"not saved"))});
    })});
    PROOFDEL.slice().forEach(function(id){p=p.then(function(){return rpc("lc72_land_del",{p_id:id},t).then(function(r){if(r&&r.data&&r.data.ok!==undefined)PROOFDEL.splice(PROOFDEL.indexOf(id),1);else fails.push("a proof delete")})})});
    (PROOF||[]).forEach(function(r,i){if(!r._d)return;p=p.then(function(){
      var num=function(v){v=String(v||"").replace(/[^0-9]/g,"");return v?String(Math.min(+v,4000)):""};
      var body={id:r.id||null,kind:"proof",visible:r.visible!==false,pinned:!!r.pinned,sort:i*10,name:r.name,role:r.role,site:r.site,start:num(r.start),peak:num(r.peak),days:num(r.days),body:r.body,shot:HTTPS.test(r.shot||"")?r.shot:"",link:HTTPS.test(r.link||"")?r.link:""};
      return rpc("lc72_land_save",{p:body},t).then(function(x){if(x&&x.data&&x.data.ok){r.id=x.data.id;r._d=false}else fails.push((r.name||"a proof card")+": "+(WERR[x&&x.data&&x.data.error]||"not saved"))});
    })});
    return p.then(function(){try{if(W.__lcWall&&!fails.length)W.__lcWall.saved()}catch(e){}paintWall();paintProof();return fails});
  }

  /* ---------- boot ---------- */
  snapshot();load();
  W.__lc89={version:VERSION,has:function(el){var k=el&&el.getAttribute&&el.getAttribute("data-cms");return!!(k&&has(DOC.text,k))},rebase:rebase,editing:function(){return EDIT},
    _t:{clean:clean,safeHref:safeHref,norm:norm,collect:collect,apply:apply,orig:function(){return ORIG}}};
  if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",gate);else setTimeout(gate,0);
})();
/*@@end lc89*/
