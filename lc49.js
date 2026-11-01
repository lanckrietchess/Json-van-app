const LC49=(()=>{
  "use strict";
  /* LC49 (build 9.20.9): owner admin mode.
     Sign in with the admin e-mail and the app is in admin mode by itself ("soft" admin: the same Admin machinery the authenticator sign-in uses, without
     content editing). It is display only: every real admin action is still checked by the server, and publishing content still needs the authenticator
     sign-in (button "Edit content" in the sheet).
     One control (the gold button in the top bar) chooses how you look at the app:
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
  const ownerAccount=()=>email()===ADMIN_EMAIL||on30();
  const pov=()=>{try{return Admin.viewingAs()||""}catch(e){return""}};
  const active=()=>soft()||hard();
  const owner=()=>!pov()&&(ownerAccount()||hard());   /* "may use the owner's tools right now": false while looking through someone else's eyes */

  const ADMIN_VIEWS=[["all","Everything (full admin)","Admin"],["adm:free","A Free player","Admin · Free"],["adm:community","A Free member","Admin · Member"],["adm:vault","A Pro member","Admin · Pro"],["adm:mentor","A VIP member","Admin · VIP"]];
  const POV_VIEWS=[["pov:b2c-free","Free player","POV · Free"],["pov:b2c-member","Free member","POV · Member"],["pov:b2c-paid","Pro member","POV · Pro"],["pov:b2c-vip","VIP member","POV · VIP"],["pov:b2b-free","Business partner, Free tier","POV · Biz Free"],["pov:b2b-mid","Business partner, Mid-tier (paying)","POV · Biz Mid"],["pov:b2b-high","Business partner, High-tier (paying)","POV · Biz High"]];
  const ALL=ADMIN_VIEWS.concat(POV_VIEWS);
  function cur(){
    try{const r=Admin.viewingAs();if(r)return"pov:"+r;const p=Admin.prefs().preview;return p&&TIERS[p]?"adm:"+p:"all"}catch(e){return"all"}
  }
  const label=()=>(ALL.filter(v=>v[0]===cur())[0]||ALL[0])[2];
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
      if(ownerAccount()&&!Admin.real()){if(Admin.softOn(true)){document.body.classList.add("lc49-on");refresh();paintBtn();try{toast("Admin mode is on (signed in as the owner).","good")}catch(e){}}}
      else if(!ownerAccount()&&soft()){Admin.softOn(false);document.body.classList.remove("lc49-on");refresh();paintBtn()}
    }catch(e){console.error("lc49",e)}
  }
  function choose(k){
    try{
      if(k==="all"){Admin.setRole("");Admin.setPref("preview","")}
      else if(k.indexOf("adm:")===0){Admin.setRole("");Admin.setPref("preview",k.slice(4))}
      else if(k.indexOf("pov:")===0){Admin.setRole(k.slice(4))}
      refresh();paintBtn();
    }catch(e){console.error("lc49",e)}
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
  function paintBtn(){
    try{
      let b=Q("#lc49-admin");
      if(!active()){if(b)b.remove();document.body.classList.remove("lc49-on");return}
      document.body.classList.add("lc49-on");
      const right=Q(".topbar-right");if(!right)return;
      if(!b){b=document.createElement("button");b.type="button";b.id="lc49-admin";b.className="lc49-admin";b.setAttribute("aria-haspopup","dialog");
        const slot=Q("#lc30-admin-slot");if(slot&&slot.parentNode===right)slot.insertAdjacentElement("afterend",b);else right.insertBefore(b,right.firstChild)}
      const pv=!!pov();b.classList.toggle("is-pov",pv);
      b.setAttribute("aria-label","Admin: view the app as ("+label()+")");
      const t=label(),ic=(()=>{try{return icon(pv?"eye":"toggle-on")}catch(e){return""}})();
      if(b.getAttribute("data-t")!==t+"|"+pv){b.setAttribute("data-t",t+"|"+pv);b.innerHTML=ic+'<span>'+t+'</span>'}
    }catch(e){}
  }
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    if(t.closest("#lc49-admin")||t.closest("[data-lc49-open]")){e.preventDefault();e.stopPropagation();open();return}
    if(soft()&&t.closest("#admin-chip")){e.preventDefault();e.stopImmediatePropagation();open()}   /* the old Admin chip would open the editing menu, which needs the authenticator */
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
    +'body.lc49-on .rp{display:none!important}'
    +'@media (max-width:520px){.lc49-admin{padding:0 8px;font-size:.72rem}}';
    document.head.appendChild(s);
  }
  function init(){
    try{
      css();wrapPreview();studioDefaults();document.addEventListener("click",onClick,true);
      auto();paintBtn();[300,1500,4000].forEach(ms=>setTimeout(()=>{auto();paintBtn()},ms));
      window.addEventListener("hashchange",()=>setTimeout(()=>{auto();paintBtn()},200));
    }catch(e){console.error("lc49",e)}
  }
  return{init:init,afterRender:afterRender,owner:owner,active:active,soft:soft,on30:on30,ownerAccount:ownerAccount,hard:hard,cur:cur,choose:choose,open:open,paintBtn:paintBtn,auto:auto,ADMIN_VIEWS:ADMIN_VIEWS,POV_VIEWS:POV_VIEWS};
})();
