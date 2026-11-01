const LC50=(()=>{
  "use strict";
  /* LC50 (build 9.24.0):
     1. batch: connecting Chess.com / Lichess no longer asks "Do you want to analyse your last 10 games?". The games are fetched silently (cached for the Trim library);
        the first-time path (LC42) does its own silent import: the first game is trimmed behind the quick win, "Analyze the whole game" opens it already loaded,
        and the other 9 games are fetched while that analysis runs.
     2. profile: what makes a guest "not new" travels with the account: onboarding done, the Chess.com / Lichess names, the first-time-path result and the achievements.
        It is stored in the member's own Supabase user record (user_metadata.lc, written with their own token), read right after sign-in on any device,
        and merged without ever overwriting what is on this device. A signed-in member on a new device is never put through the first-run questions again.
     3. metrics: the Admin dashboard (Data Briefing) can start fresh from now, filter by date range, and leaves test and owner accounts out. */
  const Q=(s,r)=>(r||document).querySelector(s),QA=(s,r)=>Array.prototype.slice.call((r||document).querySelectorAll(s));
  const E=s=>{try{return esc(s)}catch(e){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}};
  const rd=(k,d)=>{try{const v=Store.get(k,d);return v==null?d:v}catch(e){return d}},wr=(k,v)=>{try{Store.set(k,v)}catch(e){}};
  const sess=()=>{try{return LC26.sync.session()}catch(e){return null}};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  /* ---------- 1. silent import instead of the "analyse your last 10 games?" question ---------- */
  const BK="lc50-batch";
  async function silent(site,user){
    try{
      site=site==="lichess"||site==="li"?"lichess":"chesscom";user=String(user||"").trim();if(!user)return false;
      try{if(typeof LC42!=="undefined"&&LC42.owns())return false}catch(e){}       /* the first-time path imports by itself */
      const k=site+":"+user.toLowerCase(),b=rd(BK,{})||{};
      if(b[k]&&Date.now()-b[k]<6*36e5)return false;                               /* once per 6 hours per account */
      b[k]=Date.now();wr(BK,b);
      await LC39._t.games(site,user,10);                                          /* warms the cache the Trim library reads: it opens instantly */
      return true;
    }catch(e){return false}
  }

  /* ---------- 2. guest -> member: nothing restarts ---------- */
  const MK="lc50-meta";
  let adoptDone=false,saveBusy=false;
  const acct=site=>{try{const a=Elo.acct(site);return a&&a.user?String(a.user):""}catch(e){return""}};
  const profName=k=>{try{return String((App.profile&&App.profile[k])||"")}catch(e){return""}};
  const small=o=>{try{return JSON.stringify(o).length<=2500}catch(e){return false}};
  function collect(){
    const m={v:1,at:Date.now()};
    try{if(App.onboarded)m.onboarded=true}catch(e){}
    const cc=profName("chess_com_username")||acct("chesscom"),li=profName("lichess_username")||acct("lichess");
    if(cc)m.cc=cc;if(li)m.li=li;
    try{const o=rd("lc42-onb",{})||{};if(o.step==="done")m.l42="done"}catch(e){}
    /* achievements: the ones earned on this device, id -> moment (read through the Badges module, which keeps them in memory) */
    try{const g={};Badges.LIST.forEach(b=>{const t=Badges.got(b.id);if(t)g[b.id]=+t||1});if(Object.keys(g).length&&small(g))m.badges=g}catch(e){}
    return m;
  }
  const sig=m=>{const c=Object.assign({},m);delete c.at;try{return JSON.stringify(c)}catch(e){return""}};
  const mergeBag=(local,remote)=>{
    if(Array.isArray(local)||Array.isArray(remote)){const out=(Array.isArray(local)?local:[]).slice(),seen=new Set(out.map(x=>JSON.stringify(x)));(Array.isArray(remote)?remote:[]).forEach(x=>{const j=JSON.stringify(x);if(!seen.has(j)){seen.add(j);out.push(x)}});return out}
    return Object.assign({},remote&&typeof remote==="object"?remote:{},local&&typeof local==="object"?local:{});                    /* local wins on a clash */
  };
  /* apply what the account knows to this device (never lowers or overwrites anything) */
  function apply(meta){
    let changed=false;
    try{
      if(!meta||typeof meta!=="object")return false;
      if(meta.onboarded&&!App.onboarded){App.onboarded=true;changed=true}
      if(typeof App.profile==="object"&&App.profile){
        if(meta.cc&&/^[A-Za-z0-9_-]{2,30}$/.test(meta.cc)&&!App.profile.chess_com_username){App.profile.chess_com_username=meta.cc;changed=true}
        if(meta.li&&/^[A-Za-z0-9_-]{2,30}$/.test(meta.li)&&!App.profile.lichess_username){App.profile.lichess_username=meta.li;changed=true}
      }
      if(changed)try{App.save()}catch(e){}
      if(meta.l42==="done"){const o=rd("lc42-onb",{})||{};if(!/^(tease|first|sys|libq|second|done)$/.test(o.step||"")){wr("lc42-onb",Object.assign({},o,{step:"done",doneAt:Date.now(),from:"account"}));changed=true}}
      if(meta.badges&&typeof meta.badges==="object"&&typeof Badges.merge==="function"){if(Badges.merge(meta.badges)>0)changed=true}
    }catch(e){console.error("lc50",e)}
    return changed;
  }
  async function authHeaders(){const tok=await LC26.sync.token();return tok?{Authorization:"Bearer "+tok}:null}
  async function fetchMeta(){
    try{
      const h=await authHeaders();if(!h)return null;
      const r=await LC26.sync.http("/auth/v1/user",{method:"GET",headers:h});
      if(r.status!==200||!r.data)return null;
      const m=r.data.user_metadata&&r.data.user_metadata.lc;return m&&typeof m==="object"?m:{};
    }catch(e){return null}
  }
  async function save(force){
    try{
      if(!sess()||saveBusy)return false;
      const m=collect(),s=sig(m),last=rd(MK,{})||{};
      if(!force&&last.sig===s)return false;
      if(!m.onboarded&&!m.cc&&!m.li&&!m.l42&&!m.badges)return false;      /* nothing worth carrying yet */
      saveBusy=true;
      const h=await authHeaders();if(!h)return false;
      const r=await LC26.sync.http("/auth/v1/user",{method:"PUT",headers:h,body:JSON.stringify({data:{lc:m}})});
      if(r.status>=200&&r.status<300){wr(MK,{sig:s,t:Date.now()});return true}
      return false;
    }catch(e){return false}finally{saveBusy=false}
  }
  /* sign-in just happened (or the app just started signed in): take over what the account knows, then store what this device knows */
  let adoptP=null;
  function adoptNow(){
    if(adoptP)return adoptP;
    adoptP=(async()=>{
      try{
        if(!sess())return false;
        const meta=await fetchMeta();
        const ch=apply(meta);
        adoptDone=true;
        if(ch){try{refreshChip()}catch(e){}}
        await save(true);
        return ch;
      }catch(e){return false}finally{adoptDone=true;setTimeout(()=>{adoptP=null},3e4)}
    })();
    return adoptP;
  }
  /* the first-run questions wait (at most 4 s) for the account's answer when somebody is signed in on a device that has never been through them */
  function wrapGate(){
    try{
      const P=LC26.pop;if(!P||typeof P.firstRunGate!=="function"||P.firstRunGate.__lc50)return;
      const og=P.firstRunGate;
      const f=function(){
        try{
          if(sess()&&!App.onboarded&&!adoptDone){
            Promise.race([adoptNow(),sleep(4000)]).then(()=>{
              try{
                if(App.onboarded)return;                                             /* the account says: done before */
                if(og.apply(P,[]))return;                                            /* the normal rules still hold it back */
                if(!(window.LC80&&LC80.firstRun&&LC80.firstRun()))openOnboarding(true);
              }catch(e){console.error("lc50",e)}
            });
            return true;
          }
        }catch(e){}
        return og.apply(this,arguments);
      };
      f.__lc50=true;P.firstRunGate=f;
    }catch(e){console.error("lc50",e)}
  }
  function wrapFetchProfile(){
    try{
      const S=LC26.sync;if(!S||typeof S.FETCH_USER_PROFILE!=="function"||S.FETCH_USER_PROFILE.__lc50)return;
      const o=S.FETCH_USER_PROFILE;
      S.FETCH_USER_PROFILE=async function(){const r=await o.apply(this,arguments);try{if(r&&r.ok){adoptP=null;await adoptNow()}}catch(e){}return r};
      S.FETCH_USER_PROFILE.__lc50=true;
    }catch(e){}
  }
  let saveT=0;
  const soon=()=>{clearTimeout(saveT);saveT=setTimeout(()=>{save(false)},3000)};

  /* ---------- 3. admin dashboard: fresh start, date range, no test accounts ---------- */
  const day=d=>new Date(d).toISOString().slice(0,10);
  const authed=(n,a)=>{try{return LC30.authed(n,a||{})}catch(e){return Promise.resolve({ok:false,error:"server"})}};
  const missing=r=>!!r&&(r.error==="missing_function"||r.reason==="missing_function"||r.status===404);
  function stripTools(html){
    const a=html.indexOf("<h4>Tool usage</h4>"),b=html.indexOf('<div class="btn-row"><button type="button" class="btn btn-ghost" data-lc36="export">');
    if(a<0||b<0||b<a)return html;
    return html.slice(0,a)+'<p class="small muted">Tool usage (puzzles, drills, token spend) is left out here until it can be filtered by date.</p>'+html.slice(b);
  }
  async function mountMetrics(host,view,brief){
    let alive=true,st={mode:"baseline",from:"",to:"",excl:true,baseline:null,known:false},busyReset=false;
    const gone=()=>!alive||!document.body.contains(host);
    function bar(){
      const m=st.mode,b=(id,t)=>'<button type="button" class="btn btn-sm '+(m===id?"btn-primary":"btn-ghost")+'" data-lc50-mode="'+id+'" aria-pressed="'+(m===id)+'">'+t+'</button>';
      const status=st.baseline
        ?'<b>Counting from '+E(new Date(st.baseline).toLocaleString("en-GB"))+'.</b> Earlier sign-ups, sales and test data are hidden, not deleted.'
        :'<b>No fresh start yet.</b> Test and owner accounts are left out, but every earlier sign-up is counted. Press <i>Start fresh from now</i> when you are ready to count real members only.';
      return'<h3>Data Briefing</h3><div class="lc50-bar" role="group" aria-label="Date range">'
        +'<div class="lc50-presets">'+(st.baseline?b("baseline","Since fresh start"):"")+b("7","Last 7 days")+b("30","Last 30 days")+b("all","All time")+'</div>'
        +'<div class="lc50-range"><label class="small">From <input class="input" type="date" data-lc50-f="from" value="'+E(st.from)+'"></label><label class="small">To <input class="input" type="date" data-lc50-f="to" value="'+E(st.to)+'"></label>'
        +'<button type="button" class="btn btn-ghost btn-sm" data-lc50-act="apply">Apply range</button></div>'
        +'<label class="small lc50-check"><input type="checkbox" data-lc50-f="excl"'+(st.excl?" checked":"")+'> Leave out test and owner accounts</label>'
        +'<p class="small muted" data-lc50-status>'+status+'</p>'
        +'<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-lc50-act="fresh">Start fresh from now</button>'+(st.baseline?'<button type="button" class="btn btn-quiet btn-sm" data-lc50-act="all">Show everything again</button>':"")+'</div>'
        +'<form class="lc50-reset" data-lc50-resetform hidden><p class="small">This makes the dashboard count only from this moment. Nothing is deleted and you can undo it with <i>Show everything again</i>. Type <b>RESET</b> to confirm.</p>'
        +'<div class="lc50-row"><input class="input" name="w" autocomplete="off" aria-label="Type RESET" placeholder="RESET" style="max-width:140px"><button type="submit" class="btn btn-primary btn-sm">Confirm</button><button type="button" class="btn btn-quiet btn-sm" data-lc50-act="cancel">Cancel</button></div></form>'
        +'<p class="form-msg" data-lc50-msg aria-live="polite"></p></div><div data-lc50-body><p class="muted">Loading…</p></div>';
    }
    function range(){
      const now=Date.now();
      if(st.mode==="7")return{p_from:new Date(now-7*864e5).toISOString(),p_to:null};
      if(st.mode==="30")return{p_from:new Date(now-30*864e5).toISOString(),p_to:null};
      if(st.mode==="all")return{p_from:"1970-01-01T00:00:00Z",p_to:null};                       /* an explicit From overrides the fresh-start baseline */
      if(st.mode==="custom")return{p_from:st.from?new Date(st.from+"T00:00:00Z").toISOString():"1970-01-01T00:00:00Z",p_to:st.to?new Date(st.to+"T23:59:59Z").toISOString():null};
      return{p_from:null,p_to:null};                                                              /* "baseline": the server uses the fresh-start moment */
    }
    const body=()=>Q("[data-lc50-body]",host);
    const msg=t=>{const m=Q("[data-lc50-msg]",host);if(m)m.textContent=t||""};
    async function load(){
      if(gone())return;
      const bd=body();if(bd)bd.innerHTML='<p class="muted">Loading…</p>';
      const rg=range(),r=await authed("lc50_data_briefing",{p_from:rg.p_from,p_to:rg.p_to,p_exclude_test:!!st.excl});
      if(gone())return;
      const out=body();if(!out)return;
      if(r&&r.ok){
        st.baseline=r.range&&r.range.baseline||st.baseline;
        out.innerHTML=stripTools(brief.adminHTML(r));
        const stt=Q("[data-lc50-status]",host);if(stt&&!st.baseline&&r.range&&r.range.baseline)stt.textContent="Counting from "+new Date(r.range.baseline).toLocaleString("en-GB")+".";
        return;
      }
      if(r&&r.error==="not_admin"){out.innerHTML='<p class="muted">This account is not the admin.</p>';return}
      /* the LC50 SQL has not been run yet: the old numbers, with a clear warning instead of pretending */
      const old=await authed("lc36_data_briefing",{});
      if(gone())return;
      out.innerHTML='<p class="small lc50-warn"><b>Fresh start and date filters are not available yet.</b> Run <code>sql/20261101120000_lc50_admin_metrics.sql</code> in the Supabase SQL editor, then reopen this page. Until then these are the old counters: they include test sign-ups.</p>'
        +(old&&old.ok?brief.adminHTML(old):'<p class="muted">Could not load. Run the LC36 SQL migration, then reopen this page.</p>');
    }
    async function settings(){
      const r=await authed("lc50_admin_settings_get");
      if(r&&r.ok){st.baseline=r.baseline||null;st.known=true;if(!st.baseline&&st.mode==="baseline")st.mode="all"}
      else if(missing(r)||(r&&r.error)){st.known=false;st.mode="all"}
    }
    host.innerHTML='<h3>Data Briefing</h3><p class="muted">Loading…</p>';
    await settings();if(gone())return;
    host.innerHTML=bar();
    host.addEventListener("click",async e=>{
      const t=e.target&&e.target.closest?e.target:null;if(!t)return;
      const m=t.closest("[data-lc50-mode]");
      if(m){st.mode=m.getAttribute("data-lc50-mode");const g=QA("[data-lc50-f]",host);g.forEach(i=>{if(i.type!=="checkbox")i.value=""});st.from="";st.to="";host.innerHTML=bar();await load();return}
      const a=t.closest("[data-lc50-act]");if(!a)return;
      const act=a.getAttribute("data-lc50-act");
      if(act==="apply"){
        const f=Q('[data-lc50-f="from"]',host).value,to=Q('[data-lc50-f="to"]',host).value;
        if(f&&to&&f>to){msg("From must be before To.");return}
        st.from=f;st.to=to;st.mode="custom";host.innerHTML=bar();await load();return;
      }
      if(act==="fresh"){const fm=Q("[data-lc50-resetform]",host);if(fm){fm.hidden=false;const w=Q("input",fm);if(w)w.focus()}return}
      if(act==="cancel"){const fm=Q("[data-lc50-resetform]",host);if(fm)fm.hidden=true;return}
      if(act==="all"){
        const r=await authed("lc50_admin_reset",{p_mode:"all",p_confirm:""});
        if(r&&r.ok){st.baseline=null;st.mode="all";host.innerHTML=bar();await load()}else msg("That did not work. Try again.");
      }
    });
    host.addEventListener("change",e=>{const c=e.target&&e.target.closest?e.target.closest('[data-lc50-f="excl"]'):null;if(c){st.excl=!!c.checked;load()}});
    host.addEventListener("submit",async e=>{
      const f=e.target&&e.target.closest?e.target.closest("[data-lc50-resetform]"):null;if(!f)return;e.preventDefault();
      if(busyReset)return;
      if(String(f.elements.w.value||"").trim()!=="RESET"){msg("Type RESET (capitals) to confirm.");return}
      busyReset=true;msg("Starting fresh…");
      const r=await authed("lc50_admin_reset",{p_mode:"fresh",p_confirm:"RESET"});busyReset=false;
      if(r&&r.ok){st.baseline=r.baseline||new Date().toISOString();st.mode="baseline";host.innerHTML=bar();msg("Done. The dashboard now counts from this moment.");await load()}
      else msg(r&&r.error==="not_admin"?"This account is not the admin.":"That did not work. Is the LC50 SQL migration installed?");
    });
    await load();
    return()=>{alive=false};
  }

  function css(){
    if(Q("#lc50-css"))return;const s=document.createElement("style");s.id="lc50-css";
    s.textContent='.lc50-bar{display:grid;gap:10px;margin:6px 0 12px}.lc50-presets,.lc50-range,.lc50-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.lc50-bar .btn{min-height:44px}.lc50-bar .input{min-height:44px}.lc50-check{display:flex;gap:8px;align-items:center}.lc50-reset{border:1px solid var(--rule);border-radius:12px;padding:12px;background:var(--surface)}.lc50-warn{border:1px solid #fbbf24;border-radius:12px;padding:10px;color:#fde68a}';
    document.head.appendChild(s);
  }
  function afterRender(){soon()}
  function init(){
    try{
      css();wrapGate();wrapFetchProfile();
      if(sess())setTimeout(()=>{adoptNow()},1200);
      document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")save(false)});
      window.addEventListener("lc39-signed-in",()=>{adoptP=null;adoptNow()});
    }catch(e){console.error("lc50",e)}
  }
  return{init:init,afterRender:afterRender,batch:{silent:silent},profile:{collect:collect,apply:apply,save:save,adopt:adoptNow,fetchMeta:fetchMeta},metrics:{mount:mountMetrics},_t:{stripTools:stripTools,mergeBag:mergeBag,sig:sig}};
})();
