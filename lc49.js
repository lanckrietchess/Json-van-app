const LC49=(()=>{
  "use strict";
  /* LC49 (build 9.25.0): owner admin mode.
     Sign in with the admin e-mail and the app is in admin mode by itself ("soft" admin: the same Admin machinery the authenticator sign-in uses, without
     content editing). It is display only: every real admin action is still checked by the server, and publishing content still needs the authenticator
     sign-in (button "Edit content" in the sheet).
     A small fixed widget in the bottom-right corner (the size of the walkthrough button, always on screen in admin mode) shows the active mode and opens the same menu upwards;
     the top-bar button does the same. The menu has the four modes with the four modes: Admin Mode, Creator Studio, Business Partner Mode, Standard user view.
     Switching never reloads and never leaves the page you are on (except: the Studio mode opens the Studio, and a mode that has no Studio takes you back from it).
     "All views..." opens the full list:
       ADMIN VIEW  everything, or limited like a Free player / Free member / Pro / VIP, with the admin tools and the Creator Studio still on
       POV         exactly what that person sees, admin tools hidden: Free player, Free member, Pro, VIP, Business partner (Free / Mid / High tier)
     The Creator Studio is open in every admin view and follows the subscription in a POV (a business partner has it, a free player does not). */
  const ADMIN_EMAIL="lanckrietchess@gmail.com";
  const Q=(s,r)=>(r||document).querySelector(s);
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const email=()=>{try{const s=LC26.sync.session();return String(s&&s.email||"").toLowerCase()}catch(e){return""}};
  const on30=()=>{try{return !!(LC30.admin&&LC30.admin.on())}catch(e){return false}};
  const soft=()=>{try{return !!Admin.soft()}catch(e){return false}};
  const hard=()=>{try{return !!Admin.real()&&!Admin.soft()}catch(e){return false}};
  /* 9.26.0: Gmail ignores dots and +tags, so l.anckrietchess+x@gmail.com is the same owner mailbox (display only: the server still checks every admin action) */
  const gmail=e=>{e=String(e||"").trim().toLowerCase();const m=e.match(/^([^@+]+)(?:\+[^@]*)?@(?:gmail|googlemail)\.com$/);return m?m[1].replace(/\./g,"")+"@gmail.com":e};
  const ownerAccount=()=>(!!email()&&gmail(email())===gmail(ADMIN_EMAIL))||on30();
  const pov=()=>{try{return Admin.viewingAs()||""}catch(e){return""}};
  const active=()=>soft()||hard();
  const owner=()=>!pov()&&(ownerAccount()||hard());   /* "may use the owner's tools right now": false while looking through someone else's eyes */

  const ADMIN_VIEWS=[["all","Everything (full admin)","Admin"],["adm:free","A Free player","Admin · Free"],["adm:community","A Free member","Admin · Member"],["adm:vault","A Pro member","Admin · Pro"],["adm:mentor","A VIP member","Admin · VIP"]];
  const POV_VIEWS=[["pov:b2c-free","Free player","POV · Free"],["pov:b2c-member","Free member","POV · Member"],["pov:b2c-paid","Pro member","POV · Pro"],["pov:b2c-vip","VIP member","POV · VIP"],["pov:b2b-free","Business partner, Free tier","POV · Biz Free"],["pov:b2b-mid","Business partner, Mid-tier (paying)","POV · Biz Mid"],["pov:b2b-high","Business partner, High-tier (paying)","POV · Biz High"]];
  const ALL=ADMIN_VIEWS.concat(POV_VIEWS);
  function cur(){
    try{const r=Admin.viewingAs();if(r)return"pov:"+r;const p=Admin.prefs().preview;return p&&TIERS[p]?"adm:"+p:"all"}catch(e){return"all"}
  }
  const hashNow=()=>{let h="";try{h=decodeURIComponent((location.hash||"").replace(/^#/,"")).toLowerCase()}catch(e){h=""}return h.split("/")[0].split("?")[0]};
  /* the four modes of the menu */
  const modeNow=()=>{const c=cur();if(c.indexOf("pov:b2b-")===0)return"partner";if(c.indexOf("pov:")===0)return"user";if(c==="all"&&hashNow()==="studio")return"studio";return"admin"};
  const MODE_LABEL={admin:"Admin",studio:"Studio",partner:"Partner",user:"User"};
  const FULL_LABEL={admin:"Admin Mode",studio:"Creator Studio",partner:"Business Partner",user:"Standard User"};
  const floatLabel=()=>{const m=modeNow(),c=cur();if(m==="admin"&&c!=="all"){const x=ALL.filter(v=>v[0]===c)[0];return"Admin Mode · "+(x?x[1].replace(/^An? /,""):"view")}if((m==="partner"||m==="user")){const x=ALL.filter(v=>v[0]===c)[0];if(m==="partner"&&x)return"Business Partner · "+x[1].replace(/^Business partner, /,"").split(" (")[0];if(m==="user"&&x&&c!=="pov:b2c-free")return"Standard User · "+x[1].split(" ")[0]}return FULL_LABEL[m]};
  const label=()=>{const m=modeNow(),c=cur();if(m==="admin"&&c!=="all")return(ALL.filter(v=>v[0]===c)[0]||ALL[0])[2];if(m==="partner"||m==="user"){const x=ALL.filter(v=>v[0]===c)[0];return x?x[2]:"POV"}return MODE_LABEL[m]};
  const lastBiz=()=>{const v=String(rd("lc50-biz","")||"");return/^pov:b2b-(free|mid|high)$/.test(v)?v:"pov:b2b-mid"};
  const lastUser=()=>{const v=String(rd("lc50-usr","")||"");return/^pov:b2c-(free|member|paid|vip)$/.test(v)?v:"pov:b2c-free"};
  const studioOpen=()=>{try{return !!(Admin.active||owner()||V71.studio().business)}catch(e){return false}};
  const RET="lc49-ret";
  const rememberRoute=()=>{const h=hashNow();if(h&&h!=="studio")wr(RET,location.hash||"#home")};
  const backFromStudio=()=>{if(hashNow()==="studio"&&!studioOpen()){const r=String(rd(RET,"")||"");location.hash=r&&r!=="#studio"?r:"#home"}};
  const refresh=()=>{try{Site.apply()}catch(e){}try{refreshChip()}catch(e){}try{rerender()}catch(e){}};
  let sheet=null;

  /* App.rank() reads Admin.preview(). In soft admin with no view chosen the owner has everything ("mentor"); a chosen view wins. */
  function wrapPreview(){
    try{
      const op=Admin.preview;if(typeof op!=="function"||op.__lc49)return;
      const f=function(){const r=op.apply(Admin,arguments);if(r)return r;if(soft()&&!pov())return"mentor";return r};
      f.__lc49=true;Admin.preview=f;
    }catch(e){console.error("lc49",e)}
  }
  /* the owner's account turns admin mode on by itself, and any other account turns it off */
  function auto(){
    try{
      if(typeof Admin.softOn!=="function")return;
      if(ownerAccount()&&!Admin.real()){if(Admin.softOn(true)){try{Admin.setRole("");Admin.setPref("preview","")}catch(x){}document.body.classList.add("lc49-on");refresh();paintBtn();try{toast("Admin mode is on (signed in as the owner).","good")}catch(e){}}}
      else if(!ownerAccount()&&soft()){Admin.softOn(false);document.body.classList.remove("lc49-on");refresh();paintBtn()}
    }catch(e){console.error("lc49",e)}
  }
  function choose(k){
    try{
      rememberRoute();
      if(k==="all"){Admin.setRole("");Admin.setPref("preview","")}
      else if(k.indexOf("adm:")===0){Admin.setRole("");Admin.setPref("preview",k.slice(4))}
      else if(k.indexOf("pov:")===0){Admin.setRole(k.slice(4));if(k.indexOf("pov:b2b-")===0)wr("lc50-biz",k);else wr("lc50-usr",k)}
      backFromStudio();                       /* a mode without the Studio never leaves you on its locked page */
      refresh();paintBtn();
    }catch(e){console.error("lc49",e)}
  }
  /* the four modes: instant, same page, same state */
  const MODES=[
    {id:"admin",title:"Admin Mode",sub:"Everything on, with the admin tools",icon:"shield-halved",go(){choose("all");if(hashNow()==="studio"){const r=String(rd(RET,"")||"");location.hash=r&&r!=="#studio"?r:"#home"}}},
    {id:"studio",title:"Creator Studio",sub:"Record, edit and export your reels",icon:"video",go(){choose("all");rememberRoute();location.hash="#studio"}},
    {id:"partner",title:"Business Partner Mode",sub:"What a business partner sees",icon:"handshake",go(){choose(lastBiz())}},
    {id:"user",title:"Standard user view",sub:"What a member sees",icon:"user",go(){choose(lastUser())}}];
  function setMode(id){const m=MODES.filter(x=>x.id===id)[0];if(m)m.go();closeMenu();paintBtn()}
  /* the dropdown under the button */
  let menu=null;
  let menuFor="";
  const howMode=()=>rd("lc49-how","pov")==="adm"?"adm":"pov";
  function closeMenu(){if(menu){menu.remove();menu=null}menuFor="";["#lc49-admin","#lc49-float"].forEach(id=>{const b=Q(id);if(b)b.setAttribute("aria-expanded","false")})}
  function openMenu(anchor){
    const b=anchor&&anchor.getBoundingClientRect?anchor:(Q("#lc49-float")||Q("#lc49-admin"));if(!b)return;
    if(menu){const same=menuFor===b.id;closeMenu();if(same)return}
    const cur_=modeNow(),r=b.getBoundingClientRect();menuFor=b.id;
    menu=document.createElement("div");menu.id="lc49-menu";menu.className="lc49-menu";menu.setAttribute("role","menu");menu.setAttribute("aria-label","Switch mode");
    const sel=cur();
    const SUBS=[["free","Free player","b2c-free","free"],["member","Free member","b2c-member","community"],["pro","Pro member","b2c-paid","vault"],["vip","VIP member","b2c-vip","mentor"],["bfree","Business partner · Free tier","b2b-free",""],["bmid","Business partner · Mid-tier","b2b-mid",""],["bhigh","Business partner · High-tier","b2b-high",""]];
    const how=howMode();
    const subBtn=x=>{const key=how==="adm"?(x[3]?"adm:"+x[3]:""):"pov:"+x[2],on=key&&sel===key,dis=!key;
      return'<button type="button" class="lc49-sub'+(on?" is-on":"")+'" data-lc49-sub="'+(key||"")+'"'+(dis?' disabled title="A business partner has no admin view: use POV"':"")+' aria-pressed="'+(!!on)+'">'+x[1]+'</button>'};
    menu.innerHTML=MODES.map(m=>'<button type="button" role="menuitemradio" aria-checked="'+(m.id===cur_)+'" class="lc49-mi'+(m.id===cur_?" is-on":"")+'" data-lc49-mode="'+m.id+'">'+(()=>{try{return icon(m.icon)}catch(e){return""}})()+'<span><b>'+m.title+'</b><small>'+m.sub+'</small></span>'+(m.id===cur_?'<i class="lc49-tick" aria-hidden="true">✓</i>':"")+'</button>').join("")
      +'<div class="lc49-h">Look at the app as one subscription</div>'
      +'<div class="lc49-seg" role="group" aria-label="How to look"><button type="button" data-lc49-how="pov" aria-pressed="'+(how==="pov")+'">POV (exactly what they see)</button><button type="button" data-lc49-how="adm" aria-pressed="'+(how==="adm")+'">Admin view (tools stay on)</button></div>'
      +'<div class="lc49-subs">'+SUBS.map(subBtn).join("")+'</div>'
      +'<div class="lc49-h">Tools</div>'
      +'<button type="button" class="lc49-mi lc49-tool" data-lc52-replay><span><b>Replay the onboarding</b><small>Start the first-run road again as a new member</small></span></button>'
      +'<button type="button" class="lc49-mi lc49-tool" data-lc52-update><span><b>Which build is this?</b><small>Build '+(()=>{try{return CONFIG.assetVersion}catch(e){return"?"}})()+' · check for a newer one</small></span></button>';
    document.body.appendChild(menu);
    const up=r.top>window.innerHeight/2;                         /* the bottom-right widget opens upwards, the top-bar button downwards */
    if(up)menu.style.bottom=Math.max(8,Math.round(window.innerHeight-r.top+6))+"px";else menu.style.top=Math.round(r.bottom+6)+"px";
    menu.style.right=Math.max(8,Math.round(window.innerWidth-r.right))+"px";
    b.setAttribute("aria-expanded","true");
    const f=Q("[aria-checked=true]",menu);if(f&&f.focus)try{f.focus({preventScroll:true})}catch(e){}
  }

  function sheetHTML(){
    const c=cur(),btn=v=>'<button type="button" class="btn '+(c===v[0]?"btn-primary":"btn-ghost")+'" data-lc49-view="'+v[0]+'" aria-pressed="'+(c===v[0])+'">'+v[1]+'</button>';
    return'<div class="lc49">'
      +'<p class="small muted">'+(soft()?"Admin mode is on because you are signed in as the owner. ":"")+'This only changes what you see on this device. The server keeps its own rules.</p>'
      +'<h4>Admin view <small>(admin tools and the Creator Studio stay on)</small></h4><div class="lc49-views">'+ADMIN_VIEWS.map(btn).join("")+'</div>'
      +'<h4>POV <small>(exactly what that person sees)</small></h4><div class="lc49-views">'+POV_VIEWS.map(btn).join("")+'</div>'
      +'<div class="btn-row"><a class="btn btn-ghost" href="#studio" data-close>Creator Studio</a><a class="btn btn-ghost" href="#admin-lc30" data-close>Admin dashboard</a></div>'
      +(soft()?'<div class="btn-row"><button type="button" class="btn btn-quiet" data-lc49-cms>Edit content (admin sign-in with authenticator)</button></div>':'<div class="btn-row"><button type="button" class="btn btn-quiet" data-lc49-menu>Admin menu (edit content)</button></div>')
      +'</div>';
  }
  function open(){
    if(typeof openSheet!=="function")return;
    try{if(sheet)sheet.close()}catch(e){}
    sheet=openSheet({title:"Admin: view the app as",cls:"lc49-sheet",noFocus:true,html:sheetHTML(),onMount(s){
      s.el.addEventListener("click",e=>{
        const b=e.target.closest&&e.target.closest("[data-lc49-view]");
        if(b){e.preventDefault();choose(b.getAttribute("data-lc49-view"));const body=Q(".lc49",s.el);if(body)body.outerHTML=sheetHTML();return}
        if(e.target.closest&&e.target.closest("[data-lc49-cms],[data-lc49-menu]")){e.preventDefault();s.close();setTimeout(()=>{try{CMS.gate()}catch(x){}},260)}
      });
    }});
  }

  /* the button in the top bar: always there in admin mode, also inside a POV (it is the way back) */
  /* the floating widget: bottom-right, the size of the walkthrough button (.ta-btn: 28 px high, 12.5 px bold, pill); the hit area is 44 px */
  function placeFloat(){
    try{
      const f=Q("#lc49-float");if(!f)return;let b=12;
      [".lc30-note",".cbar",".data-banner",".lc19-coachbar"].forEach(sel=>{const el=Q(sel);if(!el)return;const cs=getComputedStyle(el);if(cs.display==="none"||cs.visibility==="hidden"||!el.offsetHeight)return;
        const r=el.getBoundingClientRect();if(r.bottom>window.innerHeight-4&&r.top>window.innerHeight/2&&r.right>window.innerWidth-160)b=Math.max(b,Math.round(window.innerHeight-r.top+8))});
      f.style.setProperty("--lc49-b",b+"px");
    }catch(e){}
  }
  function paintFloat(){
    try{
      let f=Q("#lc49-float");
      if(!active()){if(f)f.remove();return}
      if(!f){f=document.createElement("button");f.type="button";f.id="lc49-float";f.className="lc49-float";f.setAttribute("aria-haspopup","menu");f.setAttribute("aria-expanded","false");document.body.appendChild(f)}
      const pv=!!pov(),t=floatLabel();f.classList.toggle("is-pov",pv);
      f.setAttribute("aria-label","Switch mode (now: "+t+")");
      if(f.getAttribute("data-t")!==t+"|"+pv){f.setAttribute("data-t",t+"|"+pv);f.innerHTML=(()=>{try{return icon(pv?"eye":"toggle-on")}catch(e){return""}})()+'<span>'+t+'</span><i class="lc49-caret" aria-hidden="true">▾</i>'}
      placeFloat();
    }catch(e){}
  }
  function paintBtn(){paintFloat();paintTop()}
  function paintTop(){
    try{
      let b=Q("#lc49-admin");
      if(!active()){if(b)b.remove();document.body.classList.remove("lc49-on");return}
      document.body.classList.add("lc49-on");
      const right=Q(".topbar-right");if(!right)return;
      if(Q("#admin-chip")){if(b)b.remove();return}                /* the app's own Admin / Preview pill is on screen: it opens this menu, one pill only */
      if(!b){b=document.createElement("button");b.type="button";b.id="lc49-admin";b.className="admin-chip lc49-admin";b.setAttribute("aria-haspopup","menu");
        const slot=Q("#lc30-admin-slot");if(slot&&slot.parentNode===right)slot.insertAdjacentElement("afterend",b);else right.insertBefore(b,right.firstChild)}
      const pv=!!pov();b.classList.toggle("is-pov",pv);
      b.setAttribute("aria-label","Admin: view the app as ("+label()+")");
      const t=label(),ic=(()=>{try{return icon(pv?"eye":"toggle-on")}catch(e){return""}})();
      b.setAttribute("aria-haspopup","menu");if(!b.hasAttribute("aria-expanded"))b.setAttribute("aria-expanded","false");
      if(b.getAttribute("data-t")!==t+"|"+pv){b.setAttribute("data-t",t+"|"+pv);b.innerHTML=ic+'<span>'+t+'</span><i class="lc49-caret" aria-hidden="true">▾</i>'}
    }catch(e){}
  }
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    const hw=t.closest("[data-lc49-how]");
    if(hw){e.preventDefault();e.stopPropagation();wr("lc49-how",hw.getAttribute("data-lc49-how"));const a=menuFor?Q("#"+menuFor):null;closeMenu();if(a)openMenu(a);return}
    const sb=t.closest("[data-lc49-sub]");
    if(sb&&sb.getAttribute("data-lc49-sub")){e.preventDefault();e.stopPropagation();choose(sb.getAttribute("data-lc49-sub"));closeMenu();paintBtn();return}
    if(t.closest("[data-lc52-replay]")){e.preventDefault();e.stopPropagation();closeMenu();try{LC52.replay()}catch(x){console.error(x)}return}
    if(t.closest("[data-lc52-update]")){e.preventDefault();e.stopPropagation();closeMenu();try{LC52.checkUpdate()}catch(x){console.error(x)}return}
    const mi=t.closest("[data-lc49-mode]");
    if(mi){e.preventDefault();e.stopPropagation();setMode(mi.getAttribute("data-lc49-mode"));return}
    if(t.closest("#lc49-admin")){e.preventDefault();e.stopPropagation();openMenu(t.closest("#lc49-admin"));return}
    if(t.closest("#lc49-float")){e.preventDefault();e.stopPropagation();openMenu(t.closest("#lc49-float"));return}
    if(t.closest("[data-lc49-open]")){e.preventDefault();e.stopPropagation();closeMenu();open();return}
    if(menu&&!t.closest("#lc49-menu"))closeMenu();
    if(soft()&&t.closest("#admin-chip")){e.preventDefault();e.stopImmediatePropagation();openMenu(t.closest("#admin-chip"));return}   /* the old Admin chip would open the editing menu, which needs the authenticator */
  }
  /* the recording workflow: silences are removed automatically after each recording (set once; the switch in the Studio still works) */
  function studioDefaults(){
    try{if(rd("lc49-autosil",0))return;wr("lc49-autosil",1);const c=rd("lc33-cap",{})||{};if(c.autoSil!==true)wr("lc33-cap",Object.assign({live:true,lang:"en-US"},c,{autoSil:true}))}catch(e){}
  }
  function afterRender(){setTimeout(()=>{auto();paintBtn()},150)}
  function css(){
    if(Q("#lc49-css"))return;const s=document.createElement("style");s.id="lc49-css";
    s.textContent='.lc49-admin{display:inline-flex;align-items:center;gap:6px;min-height:44px;min-width:44px;padding:0 10px;border-radius:999px;border:1px solid rgba(251,191,36,.6);background:rgba(251,191,36,.12);color:#fde68a;font-weight:800;font-size:.78rem;cursor:pointer;white-space:nowrap}'
    +'.lc49-admin.is-pov{background:#fbbf24;color:#1c1400;border-color:#fbbf24}'
    +'.lc49{display:grid;gap:10px}.lc49 h4{margin:.4rem 0 0}.lc49 h4 small{font-weight:600;color:var(--fog)}.lc49-views{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.lc49 .btn,.lc49-sheet .btn{min-height:44px}'
    +'.lc49-caret{font-style:normal;font-size:.9em;opacity:.85}'
    +'.lc49-h{padding:10px 12px 4px;font-size:11.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--fog)}.lc49-seg{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 6px}.lc49-seg button{min-height:44px;border-radius:10px;border:1px solid var(--rule);background:transparent;color:var(--chalk);font-size:12.5px;font-weight:700;cursor:pointer}.lc49-seg button[aria-pressed=true]{background:rgba(56,189,248,.16);border-color:#38bdf8;color:#7dd3fc}'
    +'.lc49-subs{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:6px}.lc49-sub{min-height:44px;padding:6px 8px;border-radius:10px;border:1px solid var(--rule);background:transparent;color:var(--chalk);font-size:12.5px;font-weight:700;cursor:pointer;text-align:left}.lc49-sub.is-on{border-color:rgba(251,191,36,.7);background:rgba(251,191,36,.14);color:#fde68a}.lc49-sub:disabled{opacity:.4;cursor:not-allowed}.lc49-tool small{color:var(--fog)}'
    +'.lc49-menu{max-height:min(86vh,640px);overflow:auto}'
    +'.lc49-float{position:fixed;right:12px;bottom:calc(var(--lc49-b,12px) + env(safe-area-inset-bottom,0px));z-index:55;display:inline-flex;align-items:center;justify-content:center;gap:7px;min-width:0;height:28px;padding:0 12px;border-radius:999px;border:1px solid rgba(251,191,36,.6);background:#2a2208;color:#fde68a;font:inherit;font-size:12.5px;font-weight:800;line-height:1;cursor:pointer;white-space:nowrap;box-shadow:0 6px 18px rgba(2,6,23,.5)}'
    +'.lc49-float::before{content:"";position:absolute;inset:-8px}'
    +'.lc49-float.is-pov{background:#fbbf24;color:#1c1400;border-color:#fbbf24}'
    +'.lc49-float:focus-visible{outline:2px solid #fde68a;outline-offset:2px}'
    +'.lc49-menu{position:fixed;z-index:1300;width:min(320px,calc(100vw - 16px));background:var(--surface);border:1px solid var(--rule);border-radius:14px;padding:6px;box-shadow:0 18px 44px rgba(2,6,23,.6);display:grid;gap:2px}'
    +'.lc49-mi{display:flex;align-items:center;gap:12px;width:100%;min-height:52px;padding:8px 12px;border-radius:10px;border:1px solid transparent;background:transparent;color:var(--chalk);text-align:left;cursor:pointer}.lc49-mi:hover,.lc49-mi:focus-visible{background:var(--raised)}'
    +'.lc49-mi span{display:grid;gap:1px;flex:1}.lc49-mi small{color:var(--fog);font-size:12px}.lc49-mi.is-on{border-color:rgba(251,191,36,.6);background:rgba(251,191,36,.12)}.lc49-mi.is-on b{color:#fde68a}.lc49-tick{font-style:normal;color:#fbbf24;font-weight:800}.lc49-more{border-top:1px solid var(--hair);border-radius:0 0 10px 10px;margin-top:2px}'
    +'body.lc49-on .rp{display:none!important}'
    +'@media (max-width:520px){.lc49-admin{padding:0 8px;font-size:.72rem}}';
    document.head.appendChild(s);
  }
  function init(){
    try{
      css();wrapPreview();studioDefaults();document.addEventListener("click",onClick,true);
      document.addEventListener("keydown",e=>{if(e.key==="Escape"&&menu){closeMenu();const b=Q(menuFor?"#"+menuFor:"#lc49-float")||Q("#lc49-admin");if(b)b.focus()}});
      auto();paintBtn();[300,1500,4000].forEach(ms=>setTimeout(()=>{auto();paintBtn()},ms));
      window.addEventListener("resize",placeFloat);setInterval(placeFloat,1500);
      window.addEventListener("hashchange",()=>{closeMenu();setTimeout(()=>{auto();paintBtn();backFromStudio()},200)});
    }catch(e){console.error("lc49",e)}
  }
  return{init:init,afterRender:afterRender,paintFloat:paintFloat,placeFloat:placeFloat,floatLabel:floatLabel,owner:owner,active:active,modeNow:modeNow,setMode:setMode,MODES:MODES,studioOpen:studioOpen,openMenu:openMenu,closeMenu:closeMenu,soft:soft,on30:on30,ownerAccount:ownerAccount,hard:hard,cur:cur,choose:choose,open:open,paintBtn:paintBtn,auto:auto,ADMIN_VIEWS:ADMIN_VIEWS,POV_VIEWS:POV_VIEWS};
})();
