const LC44=(()=>{
  "use strict";
  /* LC44: Stripe Payment Links (build 9.20.4). One place for every payment link of the app.
     - Pro and VIP, yearly (Founding Member rate) and monthly -> the owner's Payment Links, with ?prefilled_email= when the email is known.
     - The yearly links carry the FOUNDING price. When the live pricing says that tier is no longer open (or sold out) the app uses the old
       per-checkout price instead (the 25% and 10% steps and the full price have no link), so nobody is charged the wrong amount.
     - Token Refill Shop: 4 packs, each its own Payment Link. */
  const Q=(s,r)=>(r||document).querySelector(s);
  const E=s=>{try{return esc(s)}catch(e){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}};
  const EMAIL=/^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,24}$/;
  const LINKS={
    pro:{yearly:"https://buy.stripe.com/28EaEX99TaUccZqe5N28800",monthly:"https://buy.stripe.com/cNi3cv99T6DW0cE6Dl28801"},
    vip:{yearly:"https://buy.stripe.com/dRmeVdeud8M44sU0eX28803",monthly:"https://buy.stripe.com/4gMcN5dq94vO5wY2n528804"}
  };
  const PACKS=[
    {id:"t3",tokens:3,price:"€1.00",url:"https://buy.stripe.com/14A28reud9Q80cE9Px28805"},
    {id:"t100",tokens:100,price:"€10.00",url:"https://buy.stripe.com/eVq8wPbi16DW9Ne7Hp28806"},
    {id:"t300",tokens:300,price:"€19.99",url:"https://buy.stripe.com/bJe8wP99TfasbVmaTB28807"},
    {id:"t1000",tokens:1000,price:"€49.99",url:"https://buy.stripe.com/9B67sLcm5e6o8JaaTB28808"}
  ];
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const mail=()=>{const s=sess();return s&&s.email&&EMAIL.test(String(s.email))?String(s.email).toLowerCase():""};
  const ok=u=>/^https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+$/.test(String(u||""));
  const withMail=(u,em)=>u+(em&&EMAIL.test(em)?"?prefilled_email="+encodeURIComponent(em):"");
  const go=u=>{try{LC36.support.go(u)}catch(e){location.href=u}};
  const toast2=(m,k)=>{try{toast(m,k||"")}catch(e){}};

  /* is the Founding Member price still the live price of this tier? (unknown = yes: the owner's links are the default) */
  async function foundingOpen(tier){
    let p=null;try{p=await LC43._t.pricing()}catch(e){}
    const x=p?(Number(tier)===3?p.vip:p):null;
    if(!x)return true;
    const l=x.left&&x.left[0];
    return (x.tranche||4)<=1&&(l==null||l>0);
  }
  /* the link for a plan, or "" when the old per-checkout price must be used */
  async function urlFor(plan,tier,email){
    plan=plan==="monthly"?"monthly":"yearly";tier=Number(tier)===3?"vip":"pro";
    const u=LINKS[tier][plan];if(!ok(u))return"";
    if(plan==="yearly"&&!(await foundingOpen(tier==="vip"?3:2)))return"";
    return withMail(u,email||mail());
  }
  /* LC36.support.checkout(plan,tier) and LC34 buy() end up here */
  let orig=null;
  async function checkout(plan,tier){
    toast2("Opening secure checkout…");
    const u=await urlFor(plan,tier,mail());
    if(u){if(!mail())toast2("Use the email you sign in with, so your membership switches on.");go(u);return true}
    return orig?orig(plan,tier):false;
  }
  function buy(plan,btn,msgEl){
    const p=plan==="monthly"?"monthly":"yearly";
    urlFor(p,2,mail()).then(u=>{if(u)go(u);else if(msgEl)msgEl.textContent="Opening secure checkout…"});
    return true;
  }

  /* ---------- Token Refill Shop ---------- */
  let sheet=null,after=null;
  function packHTML(){
    return PACKS.map(k=>'<button type="button" class="btn lc44-pack" data-lc44-pack="'+k.id+'"><b>'+k.tokens.toLocaleString("en-GB")+' tokens</b><span>'+k.price+'</span></button>').join("");
  }
  function shopHTML(){
    const em=mail();
    return'<div class="lc44"><p>Tokens pay for deep game analyses and the coach. Bought once, no subscription. Secure checkout with Stripe.</p>'
      +'<div class="lc44-packs">'+packHTML()+'</div>'
      +(em?'<p class="small muted">Tokens are added to <b>'+E(em)+'</b>.</p>':'<label class="lc44-em"><span class="small">Your email (the tokens are added to that account when you sign in)</span><input class="input" name="email" type="email" autocomplete="email" placeholder="you@example.com" aria-label="Email address"></label>')
      +'<p class="form-msg lc44-msg" data-lc44-msg aria-live="polite"></p>'
      +'<div class="btn-row"><button type="button" class="btn btn-quiet" data-close>Not now</button></div></div>';
  }
  function shop(done){
    if(typeof openSheet!=="function"){try{LC36.support.open("tokens")}catch(e){}return}
    after=typeof done==="function"?done:null;
    sheet=openSheet({title:"Token Refill Shop",cls:"lc44-sheet",noFocus:true,html:shopHTML(),onMount(s){
      s.el.addEventListener("click",e=>{
        const b=e.target.closest&&e.target.closest("[data-lc44-pack]");if(!b)return;
        e.preventDefault();
        const k=PACKS.filter(x=>x.id===b.getAttribute("data-lc44-pack"))[0];if(!k||!ok(k.url))return;
        let em=mail();
        if(!em){const i=Q("input[name=email]",s.el);em=i?String(i.value||"").trim().toLowerCase():"";
          if(!EMAIL.test(em)){const m=Q("[data-lc44-msg]",s.el);if(m){m.textContent="Enter your email first: the tokens are added to that account when you sign in.";m.className="form-msg lc44-msg is-bad"}if(i)i.focus();return}}
        go(withMail(k.url,em));
      });
    }});
  }
  /* the shop also sits at the bottom of the Upgrades page */
  function paintShop(route){
    try{
      if(route!=="upgrades")return;
      const v=Q("#view");if(!v||Q("#lc44-shop",v))return;
      const a=document.createElement("section");a.id="lc44-shop";a.className="panel lc44-card";
      a.innerHTML='<h3>Token Refill Shop</h3><p class="small muted">Out of tokens? 3 for €1.00, 100 for €10.00, 300 for €19.99, 1,000 for €49.99. Bought once, no subscription.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc44-open>Open the Token Refill Shop</button></div>';
      v.appendChild(a);
    }catch(e){}
  }
  function onClick(e){const t=e.target&&e.target.closest?e.target:null;if(t&&t.closest("[data-lc44-open]")){e.preventDefault();shop()}}
  let obs=null;
  function afterRender(route){
    try{
      if(obs){try{obs.disconnect()}catch(e){}obs=null}
      if(route!=="upgrades"&&String(location.hash).replace(/^#/,"").split(/[/?]/)[0]!=="upgrades")return;
      const run=()=>paintShop("upgrades");setTimeout(run,200);
      if(typeof MutationObserver==="function"){let b=false;const m=obs=new MutationObserver(()=>{if(b)return;b=true;setTimeout(()=>{b=false;run()},200)});m.observe(document.body,{childList:true,subtree:true});setTimeout(()=>{try{m.disconnect()}catch(x){}if(obs===m)obs=null},12000)}
    }catch(e){}
  }
  function css(){
    if(Q("#lc44-css"))return;const s=document.createElement("style");s.id="lc44-css";
    s.textContent='.lc44{display:grid;gap:10px}.lc44-packs{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}'
    +'.lc44-pack{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:64px;padding:10px 14px;text-align:left}.lc44-pack b{font-size:1.05rem}.lc44-pack span{color:#fbbf24;font-weight:800}'
    +'.lc44-em{display:grid;gap:4px}.lc44-em .input{min-height:44px}.lc44-msg{min-height:1.2em;margin:0}.lc44-msg.is-bad{color:#fca5a5}.lc44-card{margin-top:14px}.lc44-card .btn{min-height:44px}';
    document.head.appendChild(s);
  }
  function init(){
    try{
      css();document.addEventListener("click",onClick,true);
      if(typeof LC36!=="undefined"&&LC36.support&&!LC36.support.__lc44){orig=LC36.support.checkout.bind(LC36.support);LC36.support.checkout=checkout;LC36.support.__lc44=true}
      if(typeof window.openBuyCredits==="function"&&!window.openBuyCredits.__lc44){const f=function(done){shop(done)};f.__lc44=true;window.openBuyCredits=f}
    }catch(e){console.error("lc44",e)}
  }
  return{init:init,afterRender:afterRender,urlFor:urlFor,checkout:checkout,buy:buy,shop:shop,LINKS:LINKS,PACKS:PACKS,_t:{foundingOpen:foundingOpen,withMail:withMail,ok:ok}};
})();
