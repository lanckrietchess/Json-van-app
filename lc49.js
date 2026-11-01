const LC49=(()=>{
  "use strict";
  /* LC49 (build 9.20.8): owner tools.
     There are TWO admin systems in the hub:
       - LC30 "Admin" (the blue shield pill): you are signed in with the admin e-mail and the server confirms it (lc30_whoami). No extra code needed.
       - CMS admin mode (the "Admin" / "Preview" chip, content editing, Preview = view as a tier): needs the authenticator code.
     Until now everything of the owner's tools hung on the second one, so a signed-in owner was treated as a FREE player (locked content, locked
     Creator Studio) and had no switch. Now the server-confirmed owner (LC30) gets:
       1. full access by default (shown as VIP) and a "view the app as" switch: full access / free player / free member / Pro member
          (display only, on this device: it changes what you SEE, never what the server allows)
       2. the Creator Studio
       3. an "Admin" button in the top bar (next to the shield) that opens this switch, the admin dashboard, and the CMS admin sign-in (edit content). */
  const Q=(s,r)=>(r||document).querySelector(s);
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const on30=()=>{try{return !!(LC30.admin&&LC30.admin.on())}catch(e){return false}};
  const cms=()=>{try{return !!Admin.real()}catch(e){return false}};
  const owner=()=>on30()||cms();
  const VK="lc49-view",VIEWS=[["","Full access (admin)","Admin"],["free","A free player","Free"],["community","A free member","Member"],["vault","A Pro member","Pro"]];
  const view=()=>{const v=String(rd(VK,"")||"");return VIEWS.some(x=>x[0]===v)?v:""};
  const label=()=>(VIEWS.filter(x=>x[0]===view())[0]||VIEWS[0])[2];
  const refresh=()=>{try{refreshChip()}catch(e){}try{rerender()}catch(e){}};
  let sheet=null;

  /* Admin.preview() is what App.rank() reads. For the server-confirmed owner WITHOUT a CMS session it returns the chosen view (default: full access = "mentor"). */
  function wrapPreview(){
    try{
      const op=Admin.preview;if(typeof op!=="function"||op.__lc49)return;
      const f=function(){const r=op.apply(Admin,arguments);if(r)return r;if(!cms()&&on30())return view()||"mentor";return r};
      f.__lc49=true;Admin.preview=f;
    }catch(e){console.error("lc49",e)}
  }
  function setView(v){wr(VK,VIEWS.some(x=>x[0]===v)?v:"");paintBtn();refresh()}

  function sheetHTML(){
    const cur=view();
    return'<div class="lc49"><p class="small muted">You are signed in as the owner. This switch only changes what you see on this device. The server keeps its own rules.</p>'
      +'<h4>View the app as</h4><div class="lc49-views" role="group" aria-label="View the app as">'
      +VIEWS.map(v=>'<button type="button" class="btn '+(cur===v[0]?"btn-primary":"btn-ghost")+'" data-lc49-view="'+v[0]+'" aria-pressed="'+(cur===v[0])+'">'+v[1]+'</button>').join("")+'</div>'
      +'<div class="btn-row"><a class="btn btn-ghost" href="#admin-lc30" data-close>Admin dashboard</a><a class="btn btn-ghost" href="#studio" data-close>Creator Studio</a></div>'
      +'<p class="small muted">To edit texts, links and tiers you need the admin sign-in with your authenticator code.</p>'
      +'<div class="btn-row"><button type="button" class="btn btn-quiet" data-lc49-cms>Edit content (admin sign-in)</button></div></div>';
  }
  function open(){
    if(typeof openSheet!=="function")return;
    try{if(sheet)sheet.close()}catch(e){}
    sheet=openSheet({title:"Admin",cls:"lc49-sheet",noFocus:true,html:sheetHTML(),onMount(s){
      s.el.addEventListener("click",e=>{
        const b=e.target.closest&&e.target.closest("[data-lc49-view]");
        if(b){e.preventDefault();setView(b.getAttribute("data-lc49-view"));const body=Q(".lc49",s.el);if(body)body.outerHTML=sheetHTML();return}
        if(e.target.closest&&e.target.closest("[data-lc49-cms]")){e.preventDefault();s.close();setTimeout(()=>{try{CMS.gate()}catch(x){}},260)}
      });
    }});
  }

  /* the button in the top bar, next to the shield pill */
  function paintBtn(){
    try{
      let b=Q("#lc49-admin");
      if(!on30()||cms()){if(b)b.remove();return}                      /* with a CMS session the "Admin"/"Preview" chip does this job */
      const right=Q(".topbar-right");if(!right)return;
      if(!b){b=document.createElement("button");b.type="button";b.id="lc49-admin";b.className="lc49-admin";b.setAttribute("aria-haspopup","dialog");
        const slot=Q("#lc30-admin-slot");if(slot&&slot.parentNode===right)slot.insertAdjacentElement("afterend",b);else right.insertBefore(b,right.firstChild)}
      b.setAttribute("aria-label","Admin: view the app as ("+label()+")");
      b.innerHTML=(()=>{try{return icon("toggle-on")}catch(e){return""}})()+'<span>'+label()+'</span>';
    }catch(e){}
  }
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    if(t.closest("#lc49-admin")){e.preventDefault();e.stopPropagation();open();return}
    if(t.closest("[data-lc49-open]")){e.preventDefault();open()}
  }
  function afterRender(){setTimeout(paintBtn,200)}
  function css(){
    if(Q("#lc49-css"))return;const s=document.createElement("style");s.id="lc49-css";
    s.textContent='.lc49-admin{display:inline-flex;align-items:center;gap:6px;min-height:44px;min-width:44px;padding:0 10px;border-radius:999px;border:1px solid rgba(251,191,36,.6);background:rgba(251,191,36,.12);color:#fde68a;font-weight:800;font-size:.8rem;cursor:pointer}'
    +'.lc49{display:grid;gap:10px}.lc49 h4{margin:.2rem 0}.lc49-views{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.lc49 .btn,.lc49-sheet .btn{min-height:44px}'
    +'@media (max-width:480px){.lc49-admin span{display:none}}';
    document.head.appendChild(s);
  }
  function init(){
    try{
      css();wrapPreview();document.addEventListener("click",onClick,true);
      paintBtn();setTimeout(paintBtn,1500);setTimeout(()=>{paintBtn();if(on30())refresh()},4000);   /* the server's answer (lc30_whoami) arrives a moment after start */
    }catch(e){console.error("lc49",e)}
  }
  return{init:init,afterRender:afterRender,owner:owner,on30:on30,view:view,setView:setView,open:open,paintBtn:paintBtn,VIEWS:VIEWS};
})();
