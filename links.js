/* stripe-links (build 9.20.5): fulfilment for Stripe PAYMENT LINKS.
   A second webhook endpoint, separate from the `stripe` function (so nothing of the live checkout code is touched).
   - verifies the Stripe signature (HMAC-SHA256, 5 minute tolerance)
   - only handles sessions that come from a Payment Link (payment_link is set); sessions made by the stripe function are ignored here
   - email = customer_details.email, else customer_email (that is what ?prefilled_email= fills), else metadata.email
   - token packs  -> a row in public.lc36_token_credits (the member claims it at sign-in with tokens_claim_email, exactly like the old flow)
   - Pro / VIP    -> public.lc45_grant_membership(...) (calls the live public._lc_create_license) + the VIP token credit
   - renewals     -> invoice.paid with billing_reason subscription_cycle grants again and credits the VIP tokens again
   - every event is written to public.lc45_payment_events (idempotent on the session / invoice id); anything that cannot be fulfilled is stored with
     status needs_attention and the reason, never lost.  The function still answers 200 so Stripe does not retry for days. */

export const AMOUNTS = {
  /* amount_subtotal in cents -> what was bought (the owner's Payment Link prices) */
  payment: {100:{kind:"pack",pack:"t3",tokens:3},1000:{kind:"pack",pack:"t100",tokens:100},1999:{kind:"pack",pack:"t300",tokens:300},4999:{kind:"pack",pack:"t1000",tokens:1000}},
  subscription: {19950:{kind:"plan",tier:2,plan:"yearly",name:"pro_yearly"},3900:{kind:"plan",tier:2,plan:"monthly",name:"pro_monthly"},
                 29950:{kind:"plan",tier:3,plan:"yearly",name:"vip_yearly"},5900:{kind:"plan",tier:3,plan:"monthly",name:"vip_monthly"}}
};
const EMAIL=/^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,24}$/;
const enc=new TextEncoder();
const hex=b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");
const J=(o,s)=>new Response(JSON.stringify(o),{status:s||200,headers:{"Content-Type":"application/json"}});

export async function hmac(secret,msg){
  const k=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return hex(await crypto.subtle.sign("HMAC",k,enc.encode(msg)));
}
const same=(a,b)=>{if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0};
/* Stripe-Signature: t=1700000000,v1=abc...,v1=def... ; several secrets may be given, separated by commas */
export async function verify(raw,header,secrets,nowSec,tol){
  if(!header||!secrets)return false;
  const parts=String(header).split(",").map(x=>x.trim().split("=")),t=(parts.find(p=>p[0]==="t")||[])[1],sigs=parts.filter(p=>p[0]==="v1").map(p=>p[1]);
  if(!t||!sigs.length)return false;
  if(Math.abs((nowSec||Math.floor(Date.now()/1e3))-Number(t))>(tol||300))return false;
  for(const s of String(secrets).split(",").map(x=>x.trim()).filter(Boolean)){
    const want=await hmac(s,t+"."+raw);
    if(sigs.some(g=>same(g,want)))return true;
  }
  return false;
}
export function emailOf(s){
  const c=[s&&s.customer_details&&s.customer_details.email,s&&s.customer_email,s&&s.metadata&&s.metadata.email,s&&s.metadata&&s.metadata.prefilled_email];
  for(const x of c){const e=String(x||"").trim().toLowerCase();if(EMAIL.test(e))return e}
  return "";
}
/* what was bought: the owner's own metadata first (lc_plan / lc_pack on the Payment Link), then the amount */
export function productFor(s,env){
  const m=(s&&s.metadata)||{};
  const mp=String(m.lc_plan||"").toLowerCase(),mk=String(m.lc_pack||"").toLowerCase();
  const byName={pro_yearly:AMOUNTS.subscription[19950],pro_monthly:AMOUNTS.subscription[3900],vip_yearly:AMOUNTS.subscription[29950],vip_monthly:AMOUNTS.subscription[5900]};
  if(byName[mp])return byName[mp];
  for(const k of Object.keys(AMOUNTS.payment)){const p=AMOUNTS.payment[k];if(p.pack===mk)return p}
  let extra={};try{extra=JSON.parse((env&&env.LINK_MAP)||"{}")}catch(e){}   /* optional: {"plink_...":"pro_yearly"} */
  if(s&&s.payment_link&&extra[s.payment_link]){const n=extra[s.payment_link];if(byName[n])return byName[n];for(const k of Object.keys(AMOUNTS.payment))if(AMOUNTS.payment[k].pack===n)return AMOUNTS.payment[k]}
  const sub=Number(s&&s.amount_subtotal!=null?s.amount_subtotal:s&&s.amount_total);
  if(s&&s.mode==="subscription")return AMOUNTS.subscription[sub]||null;
  if(s&&s.mode==="payment")return AMOUNTS.payment[sub]||null;
  return null;
}
const vipTokens=(plan,env)=>plan==="yearly"?Number((env&&env.VIP_YEAR_TOKENS)||7000):Number((env&&env.TOKENS_VIP_MONTH)||500);

async function credit(sql,email,tokens,pack,amount,sessionId){
  const r=await sql`insert into public.lc36_token_credits (email,tokens,pack,amount_cents,session_id)
    select ${email},${tokens},${pack},${amount},${sessionId}
    where not exists (select 1 from public.lc36_token_credits where session_id=${sessionId}) returning 1 as n`;
  return r.length>0;
}
async function record(sql,row){
  const r=await sql`insert into public.lc45_payment_events (session_id,event_id,kind,product,email,amount_cents,subscription_id,customer_id,status)
    values (${row.session_id},${row.event_id},${row.kind},${row.product},${row.email},${row.amount},${row.sub},${row.customer},'received')
    on conflict (session_id) do nothing returning session_id`;
  return r.length>0;     /* false = we have seen it already */
}
const mark=(sql,id,status,err)=>sql`update public.lc45_payment_events set status=${status},error=${err||null},updated_at=now() where session_id=${id}`;

/* fulfil one purchase (a Payment Link checkout, or a renewal invoice) */
export async function fulfil(sql,env,o){
  const {id,email,prod,amount,sub,customer,eventId,renewal}=o;
  const fresh=await record(sql,{session_id:id,event_id:eventId,kind:prod.kind+(renewal?"_renewal":""),product:prod.pack||prod.name,email:email,amount:amount,sub:sub||null,customer:customer||null});
  if(!fresh){
    const st=await sql`select status from public.lc45_payment_events where session_id=${id}`;
    if(st[0]&&st[0].status==="done")return{ok:true,duplicate:true};
    /* received or needs_attention from an earlier try: run it again (the steps below are idempotent) */
  }
  try{
    if(prod.kind==="pack"){
      await credit(sql,email,prod.tokens,prod.pack,amount,id);
    }else{
      const g=await sql`select public.lc45_grant_membership(${email},${prod.tier},${prod.plan},${id},${sub||null},${customer||null},${amount}) as r`;
      const r=g[0]&&g[0].r;
      if(!r||r.ok!==true){await mark(sql,id,"needs_attention","grant: "+JSON.stringify(r||{}).slice(0,400));return{ok:false,error:"grant_failed",detail:r}}
      if(prod.tier===3)await credit(sql,email,vipTokens(prod.plan,env),"vip_"+(prod.plan==="yearly"?"year":"month"),0,id+":vip");
    }
    await mark(sql,id,"done",null);
    return{ok:true};
  }catch(e){
    await mark(sql,id,"needs_attention",String(e&&e.message||e).slice(0,400));
    return{ok:false,error:"exception"};
  }
}

export async function handle(req,ctx){
  const {sql,env,nowSec}=ctx;
  if(req.method==="OPTIONS")return new Response(null,{status:204});
  if(req.method!=="POST")return J({ok:false,error:"method"},405);
  const raw=await req.text();
  if(!(await verify(raw,req.headers.get("stripe-signature"),env.STRIPE_LINKS_WEBHOOK_SECRET,nowSec)))return J({ok:false,error:"bad_signature"},400);
  let ev;try{ev=JSON.parse(raw)}catch(e){return J({ok:false,error:"bad_json"},400)}
  const type=ev&&ev.type,obj=ev&&ev.data&&ev.data.object;
  try{
    if(type==="checkout.session.completed"||type==="checkout.session.async_payment_succeeded"){
      const s=obj;
      if(!s||!s.payment_link)return J({ok:true,ignored:"not_a_payment_link"});
      if(s.payment_status!=="paid"&&s.payment_status!=="no_payment_required")return J({ok:true,ignored:"unpaid"});
      const email=emailOf(s),prod=productFor(s,env);
      if(!prod||!email){
        await record(sql,{session_id:s.id,event_id:ev.id,kind:"unmatched",product:null,email:email||null,amount:Number(s.amount_subtotal||s.amount_total||0),sub:s.subscription||null,customer:s.customer||null});
        await mark(sql,s.id,"needs_attention",!prod?"unknown product (amount "+(s.amount_subtotal||s.amount_total)+" "+s.mode+")":"no email on the session");
        return J({ok:true,needs_attention:true});
      }
      const r=await fulfil(sql,env,{id:s.id,email:email,prod:prod,amount:Number(s.amount_subtotal||s.amount_total||0),sub:s.subscription,customer:s.customer,eventId:ev.id});
      return J(Object.assign({ok:true},r));
    }
    if(type==="invoice.paid"){
      const inv=obj;
      if(!inv||inv.billing_reason!=="subscription_cycle"||!inv.subscription)return J({ok:true,ignored:"not_a_renewal"});
      const known=await sql`select email,product from public.lc45_payment_events where subscription_id=${inv.subscription} and kind in ('plan') order by created_at limit 1`;
      if(!known.length)return J({ok:true,ignored:"unknown_subscription"});
      const name=known[0].product,prod={pro_yearly:AMOUNTS.subscription[19950],pro_monthly:AMOUNTS.subscription[3900],vip_yearly:AMOUNTS.subscription[29950],vip_monthly:AMOUNTS.subscription[5900]}[name];
      if(!prod)return J({ok:true,ignored:"unknown_product"});
      const r=await fulfil(sql,env,{id:"inv_"+inv.id,email:known[0].email,prod:prod,amount:Number(inv.amount_paid||0),sub:inv.subscription,customer:inv.customer,eventId:ev.id,renewal:true});
      return J(Object.assign({ok:true},r));
    }
    return J({ok:true,ignored:type||"none"});
  }catch(e){
    console.error("stripe-links",e);
    return J({ok:false,error:"server"},500);         /* a database problem: let Stripe retry */
  }
}
