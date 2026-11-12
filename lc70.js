/*@@module lc70*/ const LC70=(()=>{
  "use strict";
  /* LC70 (build 9.35.0): the Library.
     1. Books Vault (#books, Learn menu): on top "Kyenzo's Library" (his own books, book summaries and video courses on unlisted YouTube), pinned items first,
        then the classics summaries of LC69. Formats per item: digital (e-book / summary / course) for tokens and/or a euro price (Stripe Payment Link),
        paperback and hardcover (Stripe Payment Link that collects the shipping address).
     2. Guest Library (#guest-library, Learn menu): books and courses of outside coaches and authors, clearly labelled. A creator submits from the page;
        the owner approves before anything goes live and adds the payment link.
     3. Access is decided by the database (sql/20261111100000_lc70_library.sql): bought = in your library (one-time purchase, no subscription needed),
        active Pro = items flagged "e-book included with Pro" or "included with Pro" (all Kyenzo courses by default), active VIP = the same plus items
        flagged "included with VIP" and a free hardcover of books flagged for it (one per account, the owner ships it).
     4. Owner tools: add / edit / pin / publish / delete, grant access to an e-mail, "Book orders to ship" (paid paperbacks and hardcovers + VIP claims),
        sales per item (owner menu rows and buttons on the Books Vault).
     Token purchases are spent through the Arena (token_spend, 10 at a time, idempotent per day) and then recorded with lc70_buy_tokens: the database
     cannot see the Arena wallet, so that record is not cross-checked (see PROJECT_KNOWLEDGE section 9). Never the words lifetime / forever (rule 7). */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const route=()=>String(location.hash||"").replace(/^#/,"").split(/[?&\/]/)[0];
  const ic=(n,c)=>{try{return icon(n,c)}catch(e){return""}};
  const say=(t,k)=>{try{toast(t,k)}catch(e){}};
  const KIND={book:"Book",summary:"Book summary",course:"Video course"};
  const KICON={book:"book",summary:"file-lines",course:"circle-play"};
  const eur=c=>"€"+(Math.round(+c||0)/100).toFixed(2);
  const toCents=v=>{const t=String(v==null?"":v).trim().replace(/[€\s]/g,"").replace(",",".");if(!t)return"";const n=Math.round(parseFloat(t)*100);return Number.isFinite(n)&&n>0?n:""};
  const LINK=/^https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+$/;

  /* ---------- server ---------- */
  async function tok(){try{return await LC26.sync.token()}catch(e){return""}}
  const session=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const myEmail=()=>{const s=session();return s&&s.email?String(s.email).toLowerCase():""};
  async function rpc(fn,args,anonOk){
    const t=await tok();if(!t&&!anonOk)return{status:0,data:null,noauth:true};
    try{return await LC26.sync.http("/rest/v1/rpc/"+fn,{method:"POST",headers:t?{Authorization:"Bearer "+t}:{},body:JSON.stringify(args||{})})}catch(e){return{status:0,data:null}}
  }
  const missing=r=>r&&(r.status===404||(r.data&&/PGRST202|does not exist/i.test(String(r.data.code||"")+String(r.data.message||""))));
  const owner=()=>{try{return !!(LC49.owner()||Admin.active)}catch(e){return false}};
  const cache={};
  async function catalog(shelf,force){
    const c=cache[shelf];if(!force&&c&&Date.now()-c.at<60000)return c.data;
    const r=await rpc("lc70_catalog",{p_shelf:shelf},true);
    const d=r.data&&r.data.ok?r.data:{ok:false,error:missing(r)?"missing":r.status===0?"offline":"server",items:[],claims:{},me:{}};
    if(d.ok)cache[shelf]={at:Date.now(),data:d};
    return d;
  }
  const invalidate=()=>{Object.keys(cache).forEach(k=>delete cache[k])};

  /* ---------- small UI helpers ---------- */
  function sheet(title,html,onMount){try{openSheet({title:title,html:html,noFocus:true,cls:"lc70-sheet",onMount:onMount})}catch(e){console.error(e)}}
  function needSignIn(why){
    sheet("Sign in first",'<p>'+esc(why||"Everything in your library is tied to your e-mail address, so it follows you to every device.")+'</p><p class="small muted">Sign in with Google or an e-mail link on your Account page, then come back here.</p><div class="btn-row"><a class="btn btn-primary" href="#account" data-close>'+ic("right-to-bracket")+' Sign in</a><button type="button" class="btn btn-quiet" data-close>Not now</button></div>');
  }
  const withdrawalBox='<label class="lc70-check"><input type="checkbox" data-lc70-agree> <span>I want access to start right away. I understand that my 14-day right of withdrawal ends once access starts.</span></label>';
  function coverHTML(it){
    const k=it.kind||"book";
    if(/^(https:\/\/|\/assets\/)/.test(it.cover||""))return'<div class="lc70-cover is-'+k+'"><img src="'+esc(it.cover)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"></div>';
    return'<div class="lc70-cover is-'+k+' is-blank" aria-hidden="true">'+ic(KICON[k]||"book")+'<b>'+esc(String(it.title||"").slice(0,40))+'</b></div>';
  }
  function accessLabel(a){return{owned:"In your library",pro:"Included with your Pro plan",vip:"Included with your VIP plan",free:"Free",owner:"Owner view"}[a]||""}
  function openLabel(it){return it.kind==="course"?"Watch the course":it.kind==="summary"?"Read the summary":it.has_ebook?"Read the e-book":"Open"}

  /* ---------- a card ---------- */
  function cardHTML(it,d){
    const me=d.me||{},tier=+me.tier||0,claims=d.claims||{},a=it.access,guest=it.shelf==="guest",adm=!!me.admin||owner();
    const chips=[];
    if(it.tokens)chips.push(it.tokens+" tokens");
    if(it.price_cents)chips.push(eur(it.price_cents));
    if(it.pro_ebook||it.pro_included)chips.push("Included with Pro");
    else if(it.vip_included)chips.push("Included with VIP");
    if(!it.tokens&&!it.price_cents)chips.push("Free");
    const btn=[];
    if(a)btn.push('<button type="button" class="btn btn-primary" data-lc70="open" data-id="'+esc(it.id)+'">'+ic(KICON[it.kind]||"book-open")+" "+esc(openLabel(it))+"</button>");
    else{
      if(it.tokens)btn.push('<button type="button" class="btn btn-primary" data-lc70="tokens" data-id="'+esc(it.id)+'">'+ic("coins")+" Get it for "+it.tokens+" tokens</button>");
      if(it.price_cents&&LINK.test(it.buy_link||""))btn.push('<button type="button" class="btn '+(it.tokens?"btn-ghost":"btn-primary")+'" data-lc70="buy" data-id="'+esc(it.id)+'">'+ic("credit-card")+" Buy for "+eur(it.price_cents)+"</button>");
      if((it.pro_ebook||it.pro_included)&&tier<2)btn.push('<button type="button" class="btn btn-gold" data-lc70="pro" data-id="'+esc(it.id)+'">'+ic("crown")+" Included with Pro</button>");
      else if(it.vip_included&&tier<3)btn.push('<a class="btn btn-gold" href="#upgrades">'+ic("crown")+" Included with VIP</a>");
    }
    if(it.paperback_cents&&LINK.test(it.paperback_link||""))btn.push('<button type="button" class="btn btn-ghost" data-lc70="print" data-f="paperback" data-id="'+esc(it.id)+'">'+ic("book")+" Paperback "+eur(it.paperback_cents)+"</button>");
    if(it.hardcover_cents&&LINK.test(it.hardcover_link||""))btn.push('<button type="button" class="btn btn-ghost" data-lc70="print" data-f="hardcover" data-id="'+esc(it.id)+'">'+ic("book-bookmark")+" Hardcover "+eur(it.hardcover_cents)+"</button>");
    let vip="";
    if(it.vip_hardcover){
      const st=claims[it.id];
      if(st)vip='<p class="lc70-vipnote">'+ic("truck")+" Your free VIP hardcover: "+(st==="shipped"?"shipped":st==="cancelled"?"cancelled, send @lanckrietchess a DM":"requested, Kyenzo ships it by hand")+".</p>";
      else if(tier>=3)btn.push('<button type="button" class="btn btn-gold" data-lc70="claim" data-id="'+esc(it.id)+'">'+ic("gift")+" Claim your free hardcover</button>");
      else vip='<p class="lc70-vipnote">'+ic("gift")+" VIP members get the hardcover sent home for free while they are VIP.</p>";
    }
    const tools=adm?'<div class="lc70-tools">'+(it.status!=="live"?'<span class="lc70-st is-'+esc(it.status)+'">'+esc(it.status)+'</span>':"")
      +(guest&&it.status==="pending"?'<button type="button" class="btn btn-primary btn-sm" data-lc70="approve" data-id="'+esc(it.id)+'">Approve</button><button type="button" class="btn btn-quiet btn-sm" data-lc70="reject" data-id="'+esc(it.id)+'">Reject</button>':"")
      +'<button type="button" class="btn btn-ghost btn-sm" data-lc70="edit" data-id="'+esc(it.id)+'">'+ic("pen")+' Edit</button>'
      +'<button type="button" class="btn btn-ghost btn-sm" data-lc70="pin" data-id="'+esc(it.id)+'">'+ic("thumbtack")+(it.pinned?" Unpin":" Pin to top")+'</button>'
      +'<button type="button" class="btn btn-ghost btn-sm" data-lc70="live" data-id="'+esc(it.id)+'">'+(it.status==="live"?"Hide (draft)":"Publish")+'</button>'
      +'<button type="button" class="btn btn-ghost btn-sm" data-lc70="grant" data-id="'+esc(it.id)+'">'+ic("key")+' Give access</button>'
      +'<button type="button" class="btn btn-quiet btn-sm" data-lc70="del" data-id="'+esc(it.id)+'">'+ic("trash")+' Delete</button>'
      +(it.owner_note?'<p class="small muted">Note: '+esc(it.owner_note)+'</p>':"")+(guest&&it.creator_email?'<p class="small muted">Creator: '+esc(it.creator_email)+'</p>':"")+'</div>':"";
    return'<article class="panel lc70-card'+(it.pinned?" is-pinned":"")+(guest?" is-guest":"")+'" data-kind="'+esc(it.kind)+'" id="lib-'+esc(it.id)+'">'+coverHTML(it)
      +'<div class="lc70-body"><p class="lc70-kick">'+(it.pinned?'<span class="lc70-pin">'+ic("thumbtack")+" Pinned</span>":"")+esc(KIND[it.kind]||"Book")+(it.kind==="course"&&it.lessons?" · "+it.lessons+(it.lessons===1?" lesson":" lessons"):"")+'</p>'
      +(guest?'<p class="lc70-guest">'+ic("user-pen")+" Guest creator: <b>"+esc(it.creator||"Guest")+"</b></p>":"")
      +"<h3>"+esc(it.title)+"</h3>"+(it.subtitle?'<p class="lc70-sub">'+esc(it.subtitle)+"</p>":"")+(it.author?'<p class="small muted">'+esc(it.author)+"</p>":"")
      +(it.blurb?'<p class="lc70-blurb">'+esc(it.blurb)+"</p>":"")
      +(a?'<p class="lc70-have">'+ic("circle-check")+" "+esc(accessLabel(a))+"</p>":'<p class="lc70-chips">'+chips.map(c=>"<span>"+esc(c)+"</span>").join("")+"</p>")
      +'<div class="lc70-btns">'+btn.join("")+"</div>"+vip
      +(!a&&(it.tokens||it.price_cents)?'<p class="small muted lc70-once">One-time purchase: it stays in your library, no subscription needed.</p>':"")
      +tools+"</div></article>";
  }

  /* ---------- a shelf ---------- */
  const filt={kyenzo:"all",guest:"all"};
  async function paintShelf(host,shelf,force){
    if(!host)return;
    host.innerHTML='<p class="muted small">'+ic("spinner")+" Loading the library…</p>";
    const d=await catalog(shelf,force);if(!host.isConnected)return;
    host.__d=d;
    const adm=owner();
    if(!d.ok){
      host.innerHTML=d.error==="missing"?(adm?'<div class="panel pad"><b>The library database is not installed yet.</b><p class="small muted">Run sql/20261111100000_lc70_library.sql in the Supabase SQL editor (after the LC36 SQL). Until then members see "The library opens soon."</p></div>':'<p class="muted">The library opens soon.</p>')
        :'<p class="muted">The library could not load. Check your connection and try again. <button type="button" class="btn btn-ghost btn-sm" data-lc70="retry">Try again</button></p>';
      return;
    }
    const items=d.items||[],f=filt[shelf]||"all",kinds=["book","summary","course"].filter(k=>items.some(x=>x.kind===k));
    const list=f==="all"?items:items.filter(x=>x.kind===f);
    const bar=adm&&shelf==="kyenzo"?'<div class="btn-row lc70-owner">'+'<button type="button" class="btn btn-primary btn-sm" data-lc70="new">'+ic("plus")+' Add a book, summary or course</button><button type="button" class="btn btn-ghost btn-sm" data-lc70="orders">'+ic("truck")+' Book orders to ship</button><button type="button" class="btn btn-ghost btn-sm" data-lc70="sales">'+ic("chart-simple")+" Sales</button></div>"
      :adm&&shelf==="guest"?'<div class="btn-row lc70-owner"><button type="button" class="btn btn-ghost btn-sm" data-lc70="new-guest">'+ic("plus")+' Add a guest item yourself</button><button type="button" class="btn btn-ghost btn-sm" data-lc70="sales">'+ic("chart-simple")+" Sales per creator</button></div>":"";
    const chips=kinds.length>1?'<div class="lc70-filter" role="group" aria-label="Show">'+[["all","All"]].concat(kinds.map(k=>[k,KIND[k]+"s"])).map(x=>'<button type="button" class="lc70-f'+(f===x[0]?" is-on":"")+'" data-lc70="filter" data-f="'+x[0]+'" aria-pressed="'+(f===x[0])+'">'+esc(x[1])+"</button>").join("")+"</div>":"";
    const empty=shelf==="guest"?'<p class="muted">No guest items yet. Coaches and authors can submit theirs below.</p>':adm?'<p class="muted">Your shelf is empty. Add your first book, summary or video course.</p>':'<p class="muted">Kyenzo’s own books and courses appear here soon.</p>';
    if(shelf==="kyenzo"&&typeof LC72!=="undefined"&&LC72.paintShelf){try{await LC72.paintShelf(host,Object.assign({},d,{items:list}),{cardHTML:cardHTML});if(chips)host.insertAdjacentHTML("afterbegin",chips);return}catch(e){console.error("lc72",e)}}   /* 9.37.0: two-part book pages with the token lock */
    const sp=shelf==="kyenzo"&&typeof LC71!=="undefined"?LC71.spot(items,d,cardHTML,adm):{id:"",html:""},list2=sp.id?list.filter(x=>x.id!==sp.id):list;
    host.innerHTML=bar+sp.html+chips+(list2.length?'<div class="lc70-grid">'+list2.map(it=>cardHTML(it,d)).join("")+"</div>":(sp.id?"":empty));
  }
  function itemOf(id){
    let found=null;QA("[data-lc70-shelf]").forEach(h=>{const d=h.__d;if(!found&&d&&d.items)found=d.items.filter(x=>x.id===id)[0]||null});
    return found;
  }
  const repaintAll=force=>{if(force)invalidate();QA("[data-lc70-shelf]").forEach(h=>paintShelf(h,h.getAttribute("data-lc70-shelf"),force))};

  /* ---------- open an item ---------- */
  function ytId(u){const m=String(u||"").match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{6,20})/);return m?m[1]:""}
  async function openItem(it){
    const r=await rpc("lc70_open",{p_id:it.id},true);const d=r.data||{};
    if(!d.ok){if(d.error==="sign_in"){needSignIn();return}say(d.error==="no_access"?"This is not in your library yet.":"Could not open it. Try again.","bad");return}
    const vids=(d.videos||[]).filter(v=>ytId(v.url));
    let html='<p class="small muted">'+esc(KIND[it.kind]||"")+(it.shelf==="guest"?" by "+esc(it.creator||"a guest creator"):"")+" · "+esc(accessLabel(d.access))+"</p>";
    if(d.ebook_url)html+='<p><a class="btn btn-primary" href="'+esc(d.ebook_url)+'" target="_blank" rel="noopener noreferrer">'+ic("book-open")+" Open the e-book</a></p><p class=\"small muted\">Please keep the file for yourself: it is licensed to your account.</p>";
    if(vids.length)html+='<div class="lc70-player"><iframe title="'+esc(vids[0].title)+'" src="https://www.youtube-nocookie.com/embed/'+ytId(vids[0].url)+'?rel=0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'
      +(typeof LC71!=="undefined"?LC71.lessonsHTML(d.videos,ytId):"");
    else if(typeof LC71!=="undefined"&&LC71.hasPgn(d.videos))html+=LC71.lessonsHTML(d.videos,ytId);
    if(d.body)html+='<div class="lc70-text">'+String(d.body).split(/\n{2,}|\n/).filter(x=>x.trim()).map(p=>"<p>"+esc(p)+"</p>").join("")+"</div>";
    if(!d.ebook_url&&!vids.length&&!d.body&&!(typeof LC71!=="undefined"&&LC71.hasPgn(d.videos)))html+='<p class="muted">Nothing is uploaded for this item yet.</p>';
    sheet(it.title,html,s=>{s.el.addEventListener("click",e=>{const b=e.target.closest("[data-yt]");if(!b)return;const f=Q(".lc70-player iframe",s.el);if(f){f.src="https://www.youtube-nocookie.com/embed/"+b.getAttribute("data-yt")+"?rel=0&autoplay=1";f.title=b.getAttribute("data-t")}QA(".lc70-lesson",s.el).forEach(x=>x.classList.toggle("is-on",x===b))})});
  }

  /* ---------- buy with tokens (spent through the Arena, 10 at a time) ---------- */
  const day=()=>new Date().toISOString().slice(0,10);
  async function spendTokens(it){
    const n=+it.tokens||0,chunks=Math.ceil(n/10),p=rd("lc70-pay",{});
    let done=p.id===it.id&&p.day===day()?+p.done||0:0;
    for(let k=done;k<chunks;k++){
      const amount=Math.min(10,n-k*10);
      let r=null;try{r=await Quota.call("token_spend",{kind:"wallet",n:amount,ref:"lib-"+it.id+"-"+k})}catch(e){r=null}
      if(!r||r.status!==200||r.ok!==true){
        return{ok:false,paid:k*10,reason:r&&r.reason==="token_limit"?"limit":r&&r.status===0?"offline":"server"};
      }
      done=k+1;wr("lc70-pay",{id:it.id,day:day(),done:done});
    }
    return{ok:true};
  }
  function buyTokens(it){
    if(!myEmail()){needSignIn();return}
    let have=null;try{have=Quota.unlimited()?Infinity:(+Quota.leftNow()||0)+(+Quota.bonusNow()||0)}catch(e){have=null}
    const short=have!=null&&have!==Infinity&&have<it.tokens;
    sheet("Get “"+it.title+"”",'<p>Price: <b>'+it.tokens+' tokens</b>. Today’s tokens are used first, then your bonus tokens.'+(have!=null&&have!==Infinity?" You have <b>"+have+"</b> now.":"")+"</p>"
      +(short?'<p class="lc70-warn">You need '+(it.tokens-have)+' more tokens.</p><div class="btn-row"><button type="button" class="btn btn-gold" data-lc70-shop>'+ic("coins")+' Get more tokens</button><button type="button" class="btn btn-quiet" data-close>Not now</button></div>'
        :withdrawalBox+'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc70-go disabled>'+ic("coins")+" Pay "+it.tokens+' tokens</button><button type="button" class="btn btn-quiet" data-close>Cancel</button></div><p class="small muted" data-lc70-msg aria-live="polite"></p>'),
      s=>{
        const go=Q("[data-lc70-go]",s.el),ag=Q("[data-lc70-agree]",s.el),msg=Q("[data-lc70-msg]",s.el);
        if(ag&&go)ag.addEventListener("change",()=>{go.disabled=!ag.checked});
        const shop=Q("[data-lc70-shop]",s.el);if(shop)shop.addEventListener("click",()=>{s.close();setTimeout(()=>{try{LC44.shop()}catch(e){location.hash="#upgrades"}},250)});
        if(go)go.addEventListener("click",async()=>{
          go.disabled=true;msg.textContent="Paying…";
          const r=await spendTokens(it);
          if(!r.ok){msg.textContent=r.reason==="limit"?"Not enough tokens. "+(r.paid?r.paid+" tokens are reserved for this item until midnight (UTC): top up and try again today, they are not charged twice.":"Nothing was charged."):r.reason==="offline"?"No connection. "+(r.paid?r.paid+" tokens are reserved for this item today; try again today.":"Nothing was charged."):"The token server did not answer. "+(r.paid?r.paid+" tokens are reserved for this item today; try again today.":"Nothing was charged.");go.disabled=false;return}
          const g=await rpc("lc70_buy_tokens",{p_id:it.id,p_ref:"lib-"+it.id+"-"+day()});
          try{Quota.refresh()}catch(e){}
          if(!g.data||!g.data.ok){msg.textContent="The tokens were paid but the library did not answer. Try again in a minute: you will not be charged twice today. Still stuck? DM @lanckrietchess on Instagram.";go.disabled=false;return}
          wr("lc70-pay",{});s.close();say("“"+it.title+"” is in your library.","good");repaintAll(true);setTimeout(()=>openItem(it),400);
        });
      });
  }

  /* ---------- buy with euros (Stripe Payment Link) ---------- */
  function buyEuro(it,format){
    const em=myEmail();if(!em){needSignIn("Sign in first: your purchase is linked to the e-mail address you pay with.");return}
    const printed=format==="paperback"||format==="hardcover";
    const link=printed?it[format+"_link"]:it.buy_link,price=printed?it[format+"_cents"]:it.price_cents;
    if(!LINK.test(link||"")){say("This is not for sale yet.","bad");return}
    sheet((printed?(format==="paperback"?"Paperback":"Hardcover")+": ":"")+it.title,'<p>Price: <b>'+eur(price)+"</b>"+(printed?" plus shipping if Stripe shows it. Stripe asks for your shipping address; Kyenzo ships the book himself.":". Pay with the same e-mail you use here: <b>"+esc(em)+"</b>. The item appears in your library a moment after paying.")+"</p>"
      +(printed?"":withdrawalBox)+'<div class="btn-row"><button type="button" class="btn btn-primary" data-lc70-go'+(printed?"":" disabled")+">"+ic("lock")+' Secure checkout</button><button type="button" class="btn btn-quiet" data-close>Cancel</button></div><p class="small muted">Payment is handled by Stripe. We never see your card.</p>',
      s=>{const go=Q("[data-lc70-go]",s.el),ag=Q("[data-lc70-agree]",s.el);if(ag)ag.addEventListener("change",()=>{go.disabled=!ag.checked});
        go.addEventListener("click",()=>{wr("lc70-return",{id:it.id,at:Date.now()});location.href=link+"?prefilled_email="+encodeURIComponent(em)})});
  }

  /* ---------- VIP hardcover claim ---------- */
  function claim(it){
    if(!myEmail()){needSignIn();return}
    const f=(n,l,ph,auto,max)=>'<label class="field"><span class="field-label">'+l+'</span><input class="input" name="'+n+'" maxlength="'+max+'" autocomplete="'+auto+'" placeholder="'+esc(ph)+'"></label>';
    sheet("Your free hardcover",'<p>As a VIP member you get <b>'+esc(it.title)+'</b> as a hardcover, sent to your home. One copy per account. Kyenzo ships it by hand.</p><form class="stack" data-lc70-claim novalidate>'
      +f("name","Full name","Anna Peeters","name",80)+f("line1","Street and number","Zeedijk 1","address-line1",120)+f("line2","Extra address line (optional)","","address-line2",120)
      +'<div class="lc70-two">'+f("postal","Postal code","8430","postal-code",20)+f("city","City","Middelkerke","address-level2",80)+"</div>"
      +'<label class="field"><span class="field-label">Country (two letters)</span><input class="input" name="country" maxlength="2" value="BE" autocomplete="country" style="text-transform:uppercase"></label>'
      +'<p class="small muted">Your address is only used to send this book and is wiped 90 days after shipping. <a href="/privacy.html" target="_blank" rel="noopener">Privacy</a></p>'
      +'<div class="btn-row"><button class="btn btn-gold" type="submit">'+ic("gift")+' Send me the hardcover</button></div><p class="form-msg" aria-live="polite"></p></form>',
      s=>{const form=Q("[data-lc70-claim]",s.el),msg=Q(".form-msg",form);
        form.addEventListener("submit",async e=>{e.preventDefault();const v=k=>String(form.elements[k].value||"").trim();
          const r=await rpc("lc70_hardcover_claim",{p_id:it.id,p_addr:{name:v("name"),line1:v("line1"),line2:v("line2"),postal:v("postal"),city:v("city"),country:v("country").toUpperCase()}});
          const d=r.data||{};
          if(d.ok){s.close();say("Requested. Kyenzo ships your hardcover by hand.","good");repaintAll(true);return}
          msg.textContent={address:"Fill in your name, street, postal code, city and a two-letter country code (BE, NL, …).",vip_only:"The free hardcover is for active VIP members.",already:"You already requested this hardcover.",sign_in:"Sign in first."}[d.error]||"Could not send it. Try again.";msg.className="form-msg is-bad"})});
  }

  /* ---------- owner: editor ---------- */
  const val=(x,k)=>x&&x[k]!=null?x[k]:"";
  const centsIn=c=>c?(c/100).toFixed(2):"";
  function editor(id,shelf){
    if(!owner())return;
    const load=id?rpc("lc70_admin_get",{p_id:id}):Promise.resolve({data:{ok:true,item:{shelf:shelf||"kyenzo",kind:"book",status:"draft"}}});
    load.then(r=>{
      const d=r.data||{};if(!d.ok){say(missing(r)?"Run the LC70 SQL first.":"Could not load it (are you signed in as the owner?).","bad");return}
      const x=d.item,vids=(typeof LC71!=="undefined"?LC71.vidsText(x.videos):(x.videos||[]).map(v=>v.title+" | "+v.url).join("\n"));
      const inp=(n,l,v,ph,type)=>'<label class="field"><span class="field-label">'+l+'</span><input class="input" name="'+n+'" type="'+(type||"text")+'" value="'+esc(v)+'" placeholder="'+esc(ph||"")+'"></label>';
      const ta=(n,l,v,rows,ph)=>'<label class="field"><span class="field-label">'+l+'</span><textarea class="input" name="'+n+'" rows="'+rows+'" placeholder="'+esc(ph||"")+'">'+esc(v)+"</textarea></label>";
      const cb=(n,l,on)=>'<label class="lc70-check"><input type="checkbox" name="'+n+'"'+(on?" checked":"")+"> <span>"+l+"</span></label>";
      const sel=(n,l,opts,cur)=>'<label class="field"><span class="field-label">'+l+'</span><select class="input" name="'+n+'">'+opts.map(o=>'<option value="'+o[0]+'"'+(cur===o[0]?" selected":"")+">"+esc(o[1])+"</option>").join("")+"</select></label>";
      sheet(id?"Edit “"+x.title+"”":"Add to the library",'<form class="stack lc70-form" novalidate>'
        +'<div class="lc70-two">'+sel("shelf","Shelf",[["kyenzo","Kyenzo’s Library"],["guest","Guest Library"]],x.shelf)+sel("kind","Type",[["book","Book (e-book and/or print)"],["summary","Book summary"],["course","Video course"]],x.kind)+"</div>"
        +sel("status","Status",[["draft","Draft (only you see it)"],["live","Live (members see it)"],["pending","Pending (guest item waiting)"],["rejected","Rejected"]],x.status)
        +inp("title","Title",val(x,"title"),"The MSPC System")+inp("subtitle","Subtitle",val(x,"subtitle"))+inp("author","Author",val(x,"author"),"Kyenzo Lanckriet")
        +ta("blurb","Short description (shown on the card)",val(x,"blurb"),3)+inp("cover","Cover image address (https://… or /assets/…)",val(x,"cover"))
        +'<fieldset class="lc70-fs"><legend>Guest creator (Guest Library only)</legend>'+inp("creator","Creator name",val(x,"creator"))+ta("creator_bio","Creator bio",val(x,"creator_bio"),2)+inp("creator_email","Creator e-mail (private)",val(x,"creator_email"),"","email")+"</fieldset>"
        +'<fieldset class="lc70-fs"><legend>Digital version (e-book, summary or course)</legend><div class="lc70-two">'+inp("tokens","Price in tokens (empty = not for tokens)",val(x,"tokens"),"100","number")+inp("price","Price in euro (empty = none)",centsIn(x.price_cents),"49.00")+"</div>"
        +inp("buy_link","Stripe Payment Link for the euro price",val(x,"buy_link"),"https://buy.stripe.com/…")+"</fieldset>"
        +'<fieldset class="lc70-fs"><legend>Printed book (Stripe collects the address)</legend><div class="lc70-two">'+inp("pb","Paperback price €",centsIn(x.paperback_cents),"24.99")+inp("hc","Hardcover price €",centsIn(x.hardcover_cents),"39.99")+"</div>"
        +inp("paperback_link","Paperback Payment Link",val(x,"paperback_link"),"https://buy.stripe.com/…")+inp("hardcover_link","Hardcover Payment Link",val(x,"hardcover_link"),"https://buy.stripe.com/…")+"</fieldset>"
        +'<fieldset class="lc70-fs"><legend>Who gets it included</legend>'+cb("pinned","Pin to the top",x.pinned)+cb("pro_ebook","E-book included with Pro while Pro is active (your thinking-system book)",x.pro_ebook)
        +cb("pro_included","Included with Pro while Pro is active (default for your courses)",x.pro_included===undefined?x.kind==="course":x.pro_included)+cb("vip_included","Included with VIP while VIP is active (guest items: only when agreed with the creator)",x.vip_included)
        +cb("vip_hardcover","VIP members can claim a free hardcover (you ship it)",x.vip_hardcover)+"</fieldset>"
        +'<fieldset class="lc70-fs"><legend>Content (only for people with access)</legend>'+inp("ebook_url","E-book download address (https://…)",val(x,"ebook_url"))+ta("body","Summary text",val(x,"body"),5)
        +ta("videos","Lessons, one per line: Title | unlisted YouTube link. Start a folder with ## Folder name. An opening for the trainer: PGN: Name | 1.e4 c6 2.d4 d5 … (write PGN black: for a Black repertoire). A text lesson: Text: Title | first paragraph // second paragraph",vids,8,"## Chapter 1: the idea\nLesson 1 | https://youtu.be/…\nPGN black: Caro-Kann Advance | 1.e4 c6 2.d4 d5 3.e5 Bf5")+"</fieldset>"
        +'<p class="small muted">Stripe: give every Payment Link the metadata <b>lc_item</b> = <code data-lc70-idshow>'+esc(x.id||"(the id appears after saving)")+'</code>; for a printed book also <b>lc_format</b> = paperback or hardcover, and switch on “Collect customers’ addresses”. Prices here must match the links.</p>'
        +'<div class="btn-row"><button class="btn btn-primary" type="submit">Save</button></div><p class="form-msg" aria-live="polite"></p></form>',
        s=>{const form=Q(".lc70-form",s.el),msg=Q(".form-msg",form);
          form.addEventListener("submit",async e=>{e.preventDefault();const E=form.elements,v=k=>String(E[k].value||"").trim(),c=k=>!!E[k].checked;
            const links=["buy_link","paperback_link","hardcover_link"].filter(k=>v(k)&&!LINK.test(v(k)));
            if(!v("title")){msg.textContent="Give it a title.";return}
            if(links.length){msg.textContent="A Payment Link must look like https://buy.stripe.com/… ("+links.join(", ")+").";return}
            if(v("cover")&&!/^(https:\/\/|\/assets\/)/.test(v("cover"))){msg.textContent="The cover address must start with https:// or /assets/.";return}
            const videos=LC71.vidsParse(v("videos"));
      const bad=videos.filter(x=>!x.pgn&&!ytId(x.url));if(bad.length){msg.textContent="These are not YouTube links: "+bad.map(x=>x.title).join(", ");return}
            const p={id:x.id||"",shelf:v("shelf"),kind:v("kind"),status:v("status"),title:v("title"),subtitle:v("subtitle"),author:v("author"),blurb:v("blurb"),cover:v("cover"),
              creator:v("creator"),creator_bio:v("creator_bio"),creator_email:v("creator_email"),tokens:v("tokens"),price_cents:toCents(v("price")),buy_link:v("buy_link"),
              paperback_cents:toCents(v("pb")),paperback_link:v("paperback_link"),hardcover_cents:toCents(v("hc")),hardcover_link:v("hardcover_link"),
              pinned:c("pinned"),pro_ebook:c("pro_ebook"),pro_included:c("pro_included"),vip_included:c("vip_included"),vip_hardcover:c("vip_hardcover"),
              ebook_url:v("ebook_url"),body:E.body.value,videos:videos};
            const r=await rpc("lc70_admin_upsert",{p:p});const dd=r.data||{};
            if(!dd.ok){msg.textContent=dd.error==="invalid"?"Something does not fit (price, link or address format).":missing(r)?"Run the LC70 SQL first.":"Could not save (signed in as the owner?).";msg.className="form-msg is-bad";return}
            s.close();say("Saved. Stripe metadata: lc_item = "+dd.id,"good");repaintAll(true)})});
    });
  }
  async function setItem(id,patch,ok){const r=await rpc("lc70_admin_set",{p_id:id,p:patch});if(r.data&&r.data.ok){if(ok)say(ok,"good");repaintAll(true)}else say("Could not change it.","bad")}
  function grantSheet(it){
    sheet("Give access: "+it.title,'<p class="small muted">For a refund, a gift, a creator’s own copy or a sale outside Stripe. The person signs in with this e-mail.</p><form class="stack" data-lc70-gr novalidate><label class="field"><span class="field-label">E-mail</span><input class="input" type="email" name="em" autocomplete="off"></label><div class="btn-row"><button class="btn btn-primary" type="submit" name="on" value="1">Give access</button><button class="btn btn-quiet" type="button" data-lc70-off>Remove access</button></div><p class="form-msg" aria-live="polite"></p></form>',
      s=>{const f=Q("[data-lc70-gr]",s.el),msg=Q(".form-msg",f);const run=async on=>{const r=await rpc("lc70_admin_grant",{p_email:f.elements.em.value,p_id:it.id,p_on:on});msg.textContent=r.data&&r.data.ok?(on?"Access given.":"Access removed."):r.data&&r.data.error==="email"?"That e-mail does not look right.":"Could not change it."};
        f.addEventListener("submit",e=>{e.preventDefault();run(true)});Q("[data-lc70-off]",f).addEventListener("click",()=>run(false))});
  }
  async function ordersSheet(){
    const r=await rpc("lc70_admin_orders",{});const d=r.data||{};
    if(!d.ok){say(missing(r)?"Run the LC70 SQL first.":"Could not load the orders.","bad");return}
    const rows=d.orders||[];
    sheet("Book orders to ship",(rows.length?'<ul class="lc70-orders">'+rows.map(o=>'<li class="panel pad"><p><b>'+esc(o.title)+"</b> · "+esc(o.format)+" · "+(o.kind==="vip_claim"?'<span class="lc70-st is-vip">VIP, free</span>'+(o.tier>=3?"":' <span class="lc70-st is-rejected">VIP no longer active</span>'):"paid "+eur(o.amount_cents))+" · "+esc(String(o.at||"").slice(0,10))+'</p><p class="small">'+esc(o.email)+"<br>"+esc(o.name)+"<br>"+esc(o.line1)+(o.line2?"<br>"+esc(o.line2):"")+"<br>"+esc(o.postal)+" "+esc(o.city)+" · "+esc(o.country)+"</p>"
      +'<div class="btn-row"><input class="input" data-tr="'+o.id+'" placeholder="Tracking number (optional)" value="'+esc(o.tracking)+'" style="max-width:220px">'+'<button type="button" class="btn btn-primary btn-sm" data-ship="'+o.id+'" data-st="shipped">'+(o.status==="shipped"?"Shipped ✓ (update)":"Mark as shipped")+'</button><button type="button" class="btn btn-quiet btn-sm" data-ship="'+o.id+'" data-st="cancelled">Cancel</button><span class="small muted">'+esc(o.status)+"</span></div></li>").join("")+"</ul>":'<p class="muted">No book orders yet. Paid paperbacks and hardcovers (Stripe) and VIP hardcover requests appear here.</p>')
      +'<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-purge>'+ic("eraser")+' Wipe addresses of orders shipped 90+ days ago</button></div><p class="small muted">Paid orders appear once the stripe-links webhook has run. Check VIP requests before you ship: a member who cancels right after claiming keeps the request.</p>',
      s=>{s.el.addEventListener("click",async e=>{const b=e.target.closest("[data-ship]");
        if(b){const id=+b.getAttribute("data-ship"),tr=Q('[data-tr="'+id+'"]',s.el);const r2=await rpc("lc70_admin_order_set",{p_id:id,p_status:b.getAttribute("data-st"),p_tracking:tr?tr.value:""});say(r2.data&&r2.data.ok?"Saved.":"Could not save.",r2.data&&r2.data.ok?"good":"bad");if(r2.data&&r2.data.ok){s.close();setTimeout(ordersSheet,250)}return}
        if(e.target.closest("[data-purge]")){const r3=await rpc("lc70_admin_purge",{});say(r3.data&&r3.data.ok?r3.data.wiped+" old addresses wiped.":"Could not wipe.",r3.data&&r3.data.ok?"good":"bad")}})});
  }
  async function salesSheet(){
    const r=await rpc("lc70_admin_sales",{});const d=r.data||{};
    if(!d.ok){say(missing(r)?"Run the LC70 SQL first.":"Could not load the sales.","bad");return}
    const rows=d.rows||[];
    sheet("Library sales",rows.length?'<div class="lc70-tw"><table class="lc70-t"><thead><tr><th>Item</th><th>Tokens</th><th>Stripe</th><th>Print</th><th>VIP</th></tr></thead><tbody>'+rows.map(x=>"<tr><td>"+esc(x.title)+(x.shelf==="guest"?'<br><small class="muted">guest: '+esc(x.creator)+"</small>":"")+"</td><td>"+x.tokens_sales+" (" +x.tokens_total+" t)</td><td>"+x.stripe_sales+" · "+eur(x.stripe_cents)+"</td><td>"+x.print_orders+" · "+eur(x.print_cents)+"</td><td>"+x.vip_claims+"</td></tr>").join("")+'</tbody></table></div><p class="small muted">Amounts are before Stripe fees and VAT. Guest creators are paid by you, outside the app, as agreed with them.</p>':'<p class="muted">No items yet.</p>');
  }

  /* ---------- Guest Library: creator submissions ---------- */
  function creatorForm(x){
    if(!myEmail()){needSignIn("Sign in first: Kyenzo answers you on this e-mail address.");return}
    x=x||{kind:"course"};const vids=(x.videos||[]).map(v=>v.title+" | "+v.url).join("\n");
    const inp=(n,l,v,ph,type)=>'<label class="field"><span class="field-label">'+l+'</span><input class="input" name="'+n+'" type="'+(type||"text")+'" value="'+esc(v==null?"":v)+'" placeholder="'+esc(ph||"")+'"></label>';
    const ta=(n,l,v,rows,ph)=>'<label class="field"><span class="field-label">'+l+'</span><textarea class="input" name="'+n+'" rows="'+rows+'" placeholder="'+esc(ph||"")+'">'+esc(v||"")+"</textarea></label>";
    sheet(x.id?"Edit your item":"Offer your book or course",'<p class="small muted">Kyenzo checks every item before it goes live, agrees the price and your share with you by e-mail, and makes the payment link. An edit sends a live item back for a check.</p><form class="stack lc70-form" novalidate>'
      +'<label class="field"><span class="field-label">Type</span><select class="input" name="kind">'+[["course","Video course"],["book","Book (e-book)"],["summary","Book summary"]].map(o=>'<option value="'+o[0]+'"'+(x.kind===o[0]?" selected":"")+">"+o[1]+"</option>").join("")+"</select></label>"
      +inp("creator","Your name as a creator",x.creator,"Coach Jan")+ta("creator_bio","About you (2 or 3 sentences, titles and ratings you can prove)",x.creator_bio,2)
      +inp("title","Title",x.title)+inp("subtitle","Subtitle",x.subtitle)+inp("author","Author (if not you)",x.author)+ta("blurb","What the player learns",x.blurb,3)+inp("cover","Cover image address (https://…)",x.cover)
      +'<div class="lc70-two">'+inp("price","Your price proposal in euro",x.price_cents?(x.price_cents/100).toFixed(2):"","49.00")+inp("tokens","Or in tokens",x.tokens,"","number")+"</div>"
      +inp("ebook_url","E-book download address (https://…)",x.ebook_url)+ta("body","Summary text",x.body,4)+ta("videos","Video lessons, one per line: Title | unlisted YouTube link",vids,4)
      +'<label class="lc70-check"><input type="checkbox" name="rights"> <span>I own the rights to this content, and I agree that Lanckriet Chess shows it to its members once approved.</span></label>'
      +'<div class="btn-row"><button class="btn btn-primary" type="submit">Send for review</button></div><p class="form-msg" aria-live="polite"></p></form>',
      s=>{const form=Q(".lc70-form",s.el),msg=Q(".form-msg",form);
        form.addEventListener("submit",async e=>{e.preventDefault();const E=form.elements,v=k=>String(E[k].value||"").trim();
          if(!E.rights.checked){msg.textContent="Please confirm you own the rights.";return}
          if(!v("title")||!v("creator")){msg.textContent="Fill in your creator name and a title.";return}
          const videos=v("videos").split("\n").map(l=>l.trim()).filter(Boolean).map(l=>{const i=l.lastIndexOf("|");return i>0?{title:l.slice(0,i).trim(),url:l.slice(i+1).trim()}:{title:"Lesson",url:l}});
          const r=await rpc("lc70_creator_submit",{p:{id:x.id||"",kind:v("kind"),creator:v("creator"),creator_bio:v("creator_bio"),title:v("title"),subtitle:v("subtitle"),author:v("author"),blurb:v("blurb"),cover:v("cover"),price_cents:toCents(v("price")),tokens:v("tokens"),ebook_url:v("ebook_url"),body:E.body.value,videos:videos}});
          const d=r.data||{};
          if(d.ok){s.close();say("Sent. Kyenzo reviews it and answers by e-mail.","good");paintMine();return}
          msg.textContent={limit:"You can have 10 items at most.",rate_limited:"That was a lot of changes today. Try again tomorrow.",not_yours:"That item is not yours.",invalid:"A link or a price does not fit. Check the cover and e-book addresses (https://).",sign_in:"Sign in first."}[d.error]||(missing(r)?"The Guest Library opens soon.":"Could not send it. Try again.");msg.className="form-msg is-bad"})});
  }
  let mine=[];
  async function paintMine(){
    const host=Q("[data-lc70-mine]");if(!host)return;
    if(!myEmail()){host.innerHTML="";return}
    const r=await rpc("lc70_creator_mine",{});const d=r.data||{};mine=d.ok?d.items||[]:[];
    host.innerHTML=mine.length?'<h3>Your items</h3><ul class="lc70-mine">'+mine.map(x=>'<li><b>'+esc(x.title)+'</b> <span class="lc70-st is-'+esc(x.status)+'">'+esc(x.status)+"</span> · "+x.sales+(x.sales===1?" sale":" sales")+(x.owner_note?'<br><span class="small muted">Kyenzo: '+esc(x.owner_note)+"</span>":"")+' <button type="button" class="btn btn-ghost btn-sm" data-lc70="cedit" data-id="'+esc(x.id)+'">Edit</button></li>').join("")+"</ul>":"";
  }

  /* ---------- pages ---------- */
  function topHTML(){
    return'<div class="lc70-top"><p class="lc70-tag">Books Vault</p><h1>Kyenzo’s Library</h1><p class="muted">Kyenzo’s own books, book summaries and video courses. Pro members get the MSPC e-book and every course included while Pro is active; VIP members also get the hardcover sent home.</p>'
      +'<div class="lc70-jump"><a class="btn btn-ghost btn-sm" href="#lib-classics" data-lc70-scroll="lib-classics">'+ic("book-open")+' Book summaries: the classics</a><a class="btn btn-ghost btn-sm" href="#guest-library">'+ic("user-pen")+" Guest Library</a></div>"
      +'<div data-lc70-shelf="kyenzo"></div></div>';
  }
  function enhanceBooks(view){
    const sec=Q(".lc69-books",view)||view;if(Q(".lc70-top",sec))return;
    sec.insertAdjacentHTML("afterbegin",topHTML());
    const head=Q(".lc69-bh",sec);if(head)head.insertAdjacentHTML("beforebegin",'<h2 class="lc70-h2" id="lib-classics">Book summaries: the classics</h2>');
    paintShelf(Q('[data-lc70-shelf="kyenzo"]',sec),"kyenzo");
  }
  function mountGuest(view){
    view.innerHTML='<section class="lc70-page"><p class="lc70-tag">Learn</p><h1>Guest Library</h1><p class="muted">Books and courses by other coaches and authors. Every item is checked by Kyenzo before it goes live and is labelled with its creator. Guest items are not part of the Lanckriet system unless the item says so.</p>'
      +(typeof MOUNT!=="undefined"&&MOUNT.guest?'<a class="panel pad lc70-gr" href="#guest">'+ic("chess-board")+"<span><b>Interactive guest repertoires</b><small>Opening courses by creators, trained on the board (unlocked with a key)</small></span></a>":"")
      +'<div data-lc70-shelf="guest"></div>'
      +'<section class="panel pad lc70-creator"><h2>Are you a coach, author or creator?</h2><p class="muted">Offer your book, book summary or video course to Lanckriet Chess members. You keep the rights; Kyenzo checks it, agrees the price and your share with you, and publishes it here.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-lc70="submit">'+ic("upload")+' Offer my book or course</button></div><div data-lc70-mine></div></section></section>';
    paintShelf(Q('[data-lc70-shelf="guest"]',view),"guest");paintMine();
    return null;
  }

  /* ---------- events ---------- */
  async function onClick(e){
    const t=e.target;if(!t||!t.closest)return;
    const sc=t.closest("[data-lc70-scroll]");if(sc){e.preventDefault();const el=document.getElementById(sc.getAttribute("data-lc70-scroll"));if(el)el.scrollIntoView({behavior:"smooth",block:"start"});return}
    const ow=t.closest("[data-lc70-own]");if(ow){e.preventDefault();e.stopPropagation();try{const m=Q("#lc49-menu");if(m)m.remove()}catch(x){}const a=ow.getAttribute("data-lc70-own");if(a==="orders")ordersSheet();else salesSheet();return}
    const b=t.closest("[data-lc70]");if(!b)return;
    const a=b.getAttribute("data-lc70"),id=b.getAttribute("data-id"),it=id?itemOf(id):null;
    if(a==="retry"){repaintAll(true);return}
    if(a==="filter"){const host=b.closest("[data-lc70-shelf]");if(host){filt[host.getAttribute("data-lc70-shelf")]=b.getAttribute("data-f");paintShelf(host,host.getAttribute("data-lc70-shelf"))}return}
    if(a==="new"){editor("","kyenzo");return}
    if(a==="new-guest"){editor("","guest");return}
    if(a==="orders"){ordersSheet();return}
    if(a==="sales"){salesSheet();return}
    if(a==="submit"){creatorForm(null);return}
    if(a==="cedit"){creatorForm(mine.filter(x=>x.id===id)[0]||null);return}
    if(!it)return;
    if(a==="open")openItem(it);
    else if(a==="tokens")buyTokens(it);
    else if(a==="buy")buyEuro(it,"");
    else if(a==="print")buyEuro(it,b.getAttribute("data-f"));
    else if(a==="pro"){try{LC43.open(it.title,()=>{location.hash="#upgrades"})}catch(x){location.hash="#upgrades"}}
    else if(a==="claim")claim(it);
    else if(a==="edit")editor(it.id);
    else if(a==="pin")setItem(it.id,{pinned:!it.pinned},it.pinned?"Unpinned.":"Pinned to the top.");
    else if(a==="live")setItem(it.id,{status:it.status==="live"?"draft":"live"},it.status==="live"?"Hidden: only you see it.":"Live: members see it.");
    else if(a==="approve")setItem(it.id,{status:"live",note:""},"Approved and live.");
    else if(a==="reject"){const note=window.prompt("Why? The creator sees this note.","")||"";setItem(it.id,{status:"rejected",note:note},"Rejected.")}
    else if(a==="grant")grantSheet(it);
    else if(a==="del"){if(!window.confirm("Delete “"+it.title+"”? Items somebody bought are kept as a draft instead."))return;const r=await rpc("lc70_admin_delete",{p_id:it.id});say(r.data&&r.data.ok?(r.data.kept?"Somebody bought it, so it is kept as a hidden draft.":"Deleted."):"Could not delete it.",r.data&&r.data.ok?"good":"bad");repaintAll(true)}
  }
  function ownerRows(){
    const m=Q("#lc49-menu");if(!m||Q("[data-lc70-own]",m)||!owner())return;
    const ref=Q("[data-lc69-admin]",m)||Q("[data-lc59-admin]",m)||Q("[data-lc65-admin]",m);if(!ref)return;
    const mk=(k,t,s)=>{const b=document.createElement("button");b.type="button";b.className="lc49-mi lc49-tool";b.setAttribute("data-lc70-own",k);b.innerHTML="<span><b>"+t+"</b><small>"+s+"</small></span>";return b};
    ref.insertAdjacentElement("beforebegin",mk("orders","Library: book orders to ship","Paid paperbacks and hardcovers, VIP hardcover requests"));
    ref.insertAdjacentElement("beforebegin",mk("sales","Library: sales","Tokens, Stripe and print sales per book and course"));
  }
  function css(){
    if(Q("#lc70-css"))return;
    const s=document.createElement("style");s.id="lc70-css";
    s.textContent=".lc70-top,.lc70-page{max-width:980px;margin:0 auto 18px}.lc70-tag{margin:0;color:#38bdf8;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase}.lc70-top h1,.lc70-page h1{margin:2px 0 6px;font-size:clamp(24px,5.5vw,32px)}"
      +".lc70-jump{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px}.lc70-jump .btn,.lc70-btns .btn,.lc70-owner .btn,.lc70-f,.lc70-lesson{min-height:44px}.lc70-h2{margin:22px 0 10px;font-size:20px}"
      +".lc70-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}.lc70-card{display:flex;flex-direction:column;overflow:hidden;padding:0;border:1px solid rgba(148,163,184,.18)}.lc70-card.is-pinned{border-color:#fbbf24}.lc70-card.is-guest{border-style:dashed}"
      +".lc70-cover{background:linear-gradient(135deg,#0f172a,#1e3a5f);display:flex;align-items:center;justify-content:center;aspect-ratio:3/2;overflow:hidden}.lc70-cover.is-course{aspect-ratio:16/9}.lc70-cover img{width:100%;height:100%;object-fit:cover}.lc70-cover.is-blank{aspect-ratio:auto;min-height:96px;flex-direction:column;gap:8px;color:#e2e8f0;padding:14px;text-align:center}.lc70-cover.is-blank i,.lc70-cover.is-blank svg{font-size:28px;color:#38bdf8}.lc70-cover.is-blank b{font-size:15px;line-height:1.25}"
      +".lc70-body{padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px;flex:1}.lc70-body h3{margin:0;font-size:17px}.lc70-kick{margin:0;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.05em}.lc70-pin{color:#fbbf24;margin-right:8px}.lc70-sub{margin:0;color:#cbd5e1}.lc70-blurb{margin:0;color:#cbd5e1;font-size:14px}"
      +".lc70-guest{margin:0;font-size:13px;color:#a78bfa}.lc70-chips{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0}.lc70-chips span{border:1px solid rgba(56,189,248,.4);color:#7dd3fc;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700}.lc70-have{margin:0;color:#4ade80;font-weight:700}"
      +".lc70-btns{display:flex;flex-direction:column;gap:8px;margin-top:auto;padding-top:6px}.lc70-btns .btn{width:100%;justify-content:center}.lc70-vipnote{margin:0;font-size:13px;color:#fde68a}.lc70-once{margin:0}.lc70-tools{display:flex;flex-wrap:wrap;gap:6px;border-top:1px solid rgba(148,163,184,.18);padding-top:8px;margin-top:6px}"
      +".lc70-st{display:inline-block;border-radius:999px;padding:2px 9px;font-size:12px;font-weight:800;background:#334155;color:#e2e8f0}.lc70-st.is-pending{background:#78350f;color:#fde68a}.lc70-st.is-rejected{background:#7f1d1d;color:#fecaca}.lc70-st.is-live{background:#14532d;color:#bbf7d0}.lc70-st.is-vip{background:#1e3a8a;color:#bfdbfe}"
      +".lc70-filter{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}.lc70-f{border-radius:999px;border:1px solid rgba(148,163,184,.3);background:transparent;color:#e2e8f0;padding:0 14px;font-weight:700;cursor:pointer}.lc70-f.is-on{background:#38bdf8;color:#0f172a;border-color:#38bdf8}.lc70-owner{margin-bottom:12px}"
      +".lc70-check{display:flex;gap:10px;align-items:flex-start;margin:8px 0;min-height:44px;cursor:pointer}.lc70-check input{width:22px;height:22px;flex:none;margin-top:2px}.lc70-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media (max-width:520px){.lc70-two{grid-template-columns:1fr}}.lc70-fs{border:1px solid rgba(148,163,184,.25);border-radius:12px;padding:10px 12px;display:grid;gap:8px}.lc70-fs legend{padding:0 6px;font-weight:700;color:#cbd5e1}"
      +".lc70-player{position:relative;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;margin:8px 0}.lc70-player iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.lc70-lessons{list-style:none;padding:0;margin:8px 0;display:grid;gap:6px}.lc70-lesson{width:100%;text-align:left;border-radius:10px;border:1px solid rgba(148,163,184,.25);background:transparent;color:#e2e8f0;padding:8px 12px;cursor:pointer}.lc70-lesson.is-on{border-color:#38bdf8;color:#7dd3fc}"
      +".lc70-text p{margin:0 0 .7rem}.lc70-warn{color:#fca5a5;font-weight:700}.lc70-orders{list-style:none;padding:0;display:grid;gap:10px}.lc70-tw{overflow-x:auto}.lc70-t{width:100%;border-collapse:collapse;font-size:13px}.lc70-t th,.lc70-t td{text-align:left;padding:6px 8px;border-bottom:1px solid rgba(148,163,184,.2);white-space:nowrap}"
      +".lc70-gr{display:flex;gap:12px;align-items:center;margin:0 0 14px;text-decoration:none;color:inherit;min-height:44px}.lc70-gr small{display:block;color:#94a3b8}.lc70-creator{margin-top:18px}.lc70-mine{list-style:none;padding:0;display:grid;gap:8px}";
    document.head.appendChild(s);
  }
  let deb=0;
  function afterRender(r){
    try{if(r==="books"){const v=Q("#view");if(v)enhanceBooks(v)}}catch(e){console.error("lc70",e)}
    try{const back=rd("lc70-return",null);if(back&&Date.now()-back.at<36e5&&(r==="books"||r==="guest-library")){wr("lc70-return",null);setTimeout(()=>repaintAll(true),1500);setTimeout(()=>repaintAll(true),12000)}}catch(e){}
  }
  function init(){
    try{
      css();
      if(typeof MOUNT!=="undefined"){
        const orig=MOUNT.books;
        if(orig)MOUNT.books=function(view){const r=orig.apply(this,arguments);try{enhanceBooks(view)}catch(e){console.error("lc70",e)}return r};
        MOUNT["guest-library"]=mountGuest;
        try{DOC_TITLES["guest-library"]="Guest Library";ROUTE_TITLES["guest-library"]="the Guest Library";DOC_TITLES.books=DOC_TITLES.books||"Books Vault";ALIASES.library="books";ALIASES["books-vault"]="books";ALIASES["guest-books"]="guest-library"}catch(e){}
      }
      document.addEventListener("click",onClick,true);
      window.addEventListener("focus",()=>{const back=rd("lc70-return",null);if(back&&Date.now()-back.at<36e5&&/^(books|guest-library)$/.test(route()))repaintAll(true)});
      new MutationObserver(()=>{clearTimeout(deb);deb=setTimeout(()=>{try{ownerRows()}catch(e){}},120)}).observe(document.body,{childList:true});
    }catch(e){console.error("lc70",e)}
  }
  return{init:init,afterRender:afterRender,catalog:catalog,paintShelf:paintShelf,openItem:openItem,ytId:ytId,toCents:toCents,cardHTML:cardHTML,buyTokens:buyTokens,buyEuro:buyEuro,repaint:repaintAll,version:"9.38.0"};
})(); /*@@end lc70*/
