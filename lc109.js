/*@@module lc109*/
const LC109=(()=>{
  "use strict";
  /* LC109 (build 9.79.0): the book's 30-day accountability check, an easter egg for readers of "The 2000+ Blueprint".
     1. Secret page #blueprint30 (also #b30 and ?book=blueprint). It opens only from the link (or QR code) in the book. The first open
        unlocks it on this device, and from then on it sits in Learn > Kyenzo's books (Nav5 item with a `when`).
     2. The page is the book's "Your First 30 Days" plan: the daily dose, the three trim questions, today's task with a link to the
        part of the app it needs, the tracker of the book (days 1-7: MSPC on every move + the bot game; days 8-30: MSPC, game 1 trimmed,
        game 2 trimmed, Alarm Signal noticed in a game), notes for day 7 / 14 / 25 / 30, and a summary for Coach Kyenzo on day 30.
     3. The accountability check: when yesterday has nothing ticked and nothing said, the page (and one LC88 step) asks "Did you do
        yesterday's dose?" Yes = tick it now; "I skipped it" = an honest skip. Two empty days in a row = the book's rule, said once:
        don't skip two. The LC88 step only shows while the 30 days run, once a day, and never on Day 0 of a new player (LC88 rules).
     Everything stays on this device (localStorage "lc109-b30"). No AI, no server, no cost. Course content is not touched. */
  const VERSION="9.79.0",W=window,D=document,K="lc109-b30",ROUTE="blueprint30",DAY=864e5,LEN=30;
  const Q=(s,r)=>(r||D).querySelector(s),QA=(s,r)=>[].slice.call((r||D).querySelectorAll(s));
  const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ic=n=>{try{return typeof icon==="function"?icon(n)+" ":""}catch(e){return""}};
  const say=(m,k)=>{try{toast(m,k||"")}catch(e){}};
  const ls={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

  /* ---------- the plan (the book, "Your First 30 Days") ---------- */
  const BOXES={m:"MSPC on every move",g1:"Game 1 Trimmed",g2:"Game 2 Trimmed",a:"Alarm Signal noticed in a game"};
  const BOT={m:"MSPC on every move",g1:"Bot game played and looked back at"};
  const WEEKS=[
    {n:1,from:1,to:7,title:"Week 1: Think",goal:"Run M-S-P-C on every move without looking at your notes."},
    {n:2,from:8,to:14,title:"Week 2: First Real Games",goal:"Your first Alarm Signal and your first Working Point."},
    {n:3,from:15,to:21,title:"Week 3: Theory",goal:"Level 1 of your repertoire, without breaking the 1:1 rule."},
    {n:4,from:22,to:30,title:"Week 4: The Audit Loop",goal:"See proof that your training works."}];
  function task(d){
    if(d===1)return{t:"Read the MSPC System page in the app. Then reread Chapter 3 of the book. Yes, again.",go:[["#learn-mspc","The MSPC System"]]};
    if(d>=2&&d<=6)return{t:"One game in the Bot Deep-Thinking Trainer. Five to ten minutes per move. No rapid. No blitz. Lose terribly, and smile about it.",go:[["#bot","Play the bot"]]};
    if(d===7)return{t:"Look back at your bot games. Which letter did you skip most often? That is your first active thought for next week.",go:[["#bot","Play the bot"]],note:"d7",ask:"The letter I skipped most often, and my active thought:"};
    if(d>=8&&d<=13)return{t:"Two games, rapid or longer. MSPC on every move. After every game: Trim it, then tap Interrogate my mistakes. Walk through each mistake yourself before the engine tells you anything.",go:[["#trim","Trim my games"]]};
    if(d===14)return{t:"Write down your first Alarm Signal and your first Working Point, and add them to your MSPC system in the app. Make it funny if you can. Funny signals stick.",go:[["#trim","Trim my games"],["#system","My MSPC system"]],note:"d14",ask:"My first Alarm Signal → my first Working Point:"};
    if(d>=15&&d<=20)return{t:"One lesson in the opening trainer, then two games where you play that exact opening. The 1:1 rule: one lesson, one Alarm Signal, tested in a real game before the next lesson. Pick your family: the Colle with White, the Caro-Kann against 1.e4, the Semi-Slav against 1.d4.",go:[["#openings","Opening trainer"]]};
    if(d===21)return{t:"One lesson in the opening trainer and two games with that opening. Bonus: open the Endgame Suite and do the first level of Win Conditions.",go:[["#openings","Opening trainer"],["#endgame","Endgame Suite"]]};
    if(d===25)return{t:"Two games, Trimmed. Then check the severity of your Working Points. Is one of them turning green? Good. That path is hardening.",go:[["#trim","Trim my games"],["#system","My Working Points"]],note:"d25",ask:"One mistake I did NOT make because of my training:"};
    if(d===28)return{t:"Two games, Trimmed. Then test yourself with Be My Sparring Partner. The bot waits for your Alarm Signal, then slips once. Do you catch it?",go:[["#bot","Be My Sparring Partner"]],note:"d28",ask:"Did you catch the slip? What happened:"};
    if(d===30)return{t:"Look back at the month. Pick your next one to three Working Points. Then start again at Week 2. And tell me how it went.",go:[["#system","My Working Points"]],note:"d30",ask:"My next one to three Working Points:"};
    return{t:"Two games, Trimmed. Write down one mistake you didn't make because of your training. Proof keeps you watering the tree.",go:[["#trim","Trim my games"]],note:"d"+d,ask:"One mistake I did NOT make because of my training:"};
  }
  const weekOf=d=>WEEKS.filter(w=>d>=w.from&&d<=w.to)[0]||WEEKS[0];
  const boxesOf=d=>d<=7?["m","g1"]:["m","g1","g2","a"];
  const labelOf=(d,k)=>(d<=7?BOT:BOXES)[k];

  /* ---------- pure (tested) ---------- */
  function ymd(t){const x=new Date(t);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")}
  function dayNo(start,now){if(!start)return 0;const a=new Date(start+"T12:00:00"),b=new Date(ymd(now)+"T12:00:00");return Math.floor((b-a)/DAY)+1}
  function filled(s,d){const r=s&&s.days&&s.days[d];return r?boxesOf(d).filter(k=>r[k]).length:0}
  function complete(s,d){return filled(s,d)===boxesOf(d).length}
  function touched(s,d){const r=s&&s.days&&s.days[d];return !!(r&&(r.skip||filled(s,d)>0))}
  /* the accountability check: which day needs an answer (yesterday, nothing ticked, nothing said), and are two days in a row empty */
  function check(s,now){
    const d=dayNo(s&&s.start,now);if(!s||!s.start||d<2)return{ask:0,two:false,day:d};
    const y=Math.min(d-1,LEN);
    const empty=n=>!!(n>=1&&(!touched(s,n)||(s.days[n]&&s.days[n].skip&&!filled(s,n))));
    const ask=(y>=1&&!touched(s,y)&&!(s.answered&&s.answered[y]))?y:0;
    const two=!!(d<=LEN+1&&y>=2&&empty(y)&&empty(y-1));
    return{ask:ask,two:two,day:d};
  }
  function streak(s,now){
    const d=Math.min(dayNo(s&&s.start,now),LEN);let n=0;
    let i=complete(s,d)?d:d-1;
    for(;i>=1;i--){if(complete(s,i))n++;else break}
    return n;
  }
  function stats(s,now){
    const d=Math.min(dayNo(s&&s.start,now),LEN);let full=0,any=0,skips=0,boxes=0,max=0;
    for(let i=1;i<=d;i++){const f=filled(s,i);boxes+=f;max+=boxesOf(i).length;if(f===boxesOf(i).length)full++;if(f)any++;if(s.days&&s.days[i]&&s.days[i].skip&&!f)skips++}
    return{day:d,full:full,any:any,skips:skips,boxes:boxes,max:max,streak:streak(s,now)};
  }
  function summary(s,now){
    const st=stats(s,now),n=s.notes||{};
    const L=["My first 30 days with The 2000+ Blueprint:",
      "Days done: "+st.full+" of "+st.day+(st.skips?" ("+st.skips+" skipped, honestly)":""),
      "Boxes ticked: "+st.boxes+" of "+st.max,
      "Best streak right now: "+st.streak+" day"+(st.streak===1?"":"s")];
    if(n.d7)L.push("Week 1, the letter I skipped most: "+n.d7);
    if(n.d14)L.push("My first Alarm Signal and Working Point: "+n.d14);
    if(n.d30)L.push("My next Working Points: "+n.d30);
    return L.join("\n");
  }

  /* ---------- state ---------- */
  const blank=()=>({v:1,unlocked:0,src:"",start:null,round:1,days:{},notes:{},answered:{},seen2:"",dism:""});
  const st=()=>Object.assign(blank(),ls.get(K,{}));
  const save=s=>ls.set(K,s);
  const unlocked=()=>!!st().unlocked;
  function unlock(src){const s=st();if(s.unlocked)return false;s.unlocked=Date.now();s.src=src||"link";save(s);return true}
  const today=()=>Math.min(Math.max(dayNo(st().start,Date.now()),0),LEN+1);

  /* ---------- page ---------- */
  const CSS=".lc109{max-width:760px;margin:0 auto}.lc109 .lc109-card{border:1px solid rgba(56,189,248,.35);border-radius:14px;background:#1e293b;padding:14px;margin:12px 0}"
    +".lc109-egg{border-color:rgba(251,191,36,.55)!important;background:rgba(251,191,36,.07)!important}.lc109-warn{border-color:rgba(248,113,113,.6)!important;background:rgba(248,113,113,.08)!important}"
    +".lc109 h2{font-size:1.05rem;margin:0 0 6px}.lc109 p{margin:6px 0}.lc109 ol{margin:6px 0 6px 20px;padding:0}.lc109 .lc109-k{color:#38bdf8;font-weight:700}"
    +".lc109-box{display:flex;gap:10px;align-items:center;min-height:44px;padding:6px 2px;cursor:pointer}.lc109-box input{width:22px;height:22px;flex:0 0 22px;accent-color:#38bdf8}"
    +".lc109-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}.lc109-day{min-height:44px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-weight:700;font-size:.85rem;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:2px}"
    +".lc109-day small{font-weight:400;font-size:.65rem;color:#94a3b8}.lc109-day.is-full{background:rgba(34,197,94,.18);border-color:rgba(34,197,94,.6)}.lc109-day.is-part{background:rgba(56,189,248,.12);border-color:rgba(56,189,248,.5)}"
    +".lc109-day.is-skip{background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.5)}.lc109-day.is-now{outline:2px solid #fbbf24}.lc109-day[disabled]{opacity:.35}"
    +".lc109-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.lc109 textarea{width:100%;min-height:64px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;padding:8px;font-size:16px;box-sizing:border-box}"
    +".lc109-bar{height:8px;border-radius:6px;background:#0f172a;overflow:hidden;margin:6px 0}.lc109-bar i{display:block;height:100%;background:#38bdf8}.lc109-wk{margin:10px 0 4px;font-size:.8rem;color:#94a3b8}";
  function css(){if(Q("#lc109-css"))return;const x=D.createElement("style");x.id="lc109-css";x.textContent=CSS;D.head.appendChild(x)}
  let EDIT=0,FRESH=false;
  function head(){return'<header class="page-head"><h1>'+ic("book-open")+"Your First 30 Days</h1></header>"}
  function introHTML(){
    return'<section class="lc109-card lc109-egg"><h2>'+ic("key")+"You found the secret page.</h2>"
      +"<p>This page only opens from <b>The 2000+ Blueprint</b>. From now on it sits in <b>Learn › Kyenzo’s books</b>, so you can find it every day.</p></section>";
  }
  function rulesHTML(){
    return'<section class="lc109-card"><h2>Your daily dose</h2><p><b>About one hour of training, plus two serious games.</b> Both games need your full focus. A tired game is a blitz game: if you’re exhausted, play one game properly instead of two badly.</p>'
      +"<p>The three trim questions, after every serious game, without exception:</p><ol><li><b>What should I have thought here?</b></li><li><b>What will I think next time?</b></li><li><b>What will alarm me to think it?</b></li></ol>"
      +"<p class=\"muted\">One rule: tick off every box. Don’t skip days. And if you do skip one, don’t skip two.</p></section>";
  }
  function startHTML(){
    let opts="";for(let i=1;i<=LEN;i++)opts+='<option value="'+i+'">Day '+i+"</option>";
    return'<section class="lc109-card"><h2>Ready?</h2><p>Same system as the whole book: Think, Theory, Trim. In that order. One path at a time.</p>'
      +'<div class="lc109-row"><button type="button" class="btn btn-primary" data-lc109="start">'+ic("play")+'Start my 30 days today</button></div>'
      +'<p class="muted" style="margin-top:10px">Already started on the paper tracker? Pick your day, and this page follows you from there.</p>'
      +'<div class="lc109-row"><select data-lc109-from aria-label="I am on day" style="min-height:44px;border-radius:10px;background:#0f172a;color:#e2e8f0;border:1px solid #334155;padding:0 10px">'+opts+'</select><button type="button" class="btn btn-quiet" data-lc109="startat">I am on this day</button></div></section>';
  }
  function checkHTML(s){
    const c=check(s,Date.now());let h="";
    if(c.ask)h+='<section class="lc109-card lc109-egg" data-lc109-check="'+c.ask+'"><h2>'+ic("clipboard-check")+"Accountability check: day "+c.ask+"</h2><p>Yesterday has no ticks yet. Did you do your daily dose?</p>"
      +'<div class="lc109-row"><button type="button" class="btn btn-primary btn-sm" data-lc109="did">Yes, let me tick it</button><button type="button" class="btn btn-quiet btn-sm" data-lc109="skipped">I skipped it</button></div></section>';
    if(c.two)h+='<section class="lc109-card lc109-warn" data-lc109-two><h2>Two days without your dose.</h2><p>That’s the one rule of the book: if you skip one, don’t skip two. No guilt, no drama. Start small today: one game, MSPC on every move, one trim question. That’s enough to keep the path open.</p></section>';
    return h;
  }
  function todayHTML(s){
    const d=Math.min(dayNo(s.start,Date.now()),LEN),wk=weekOf(d),tk=task(d),r=(s.days[d]||{});
    let boxes="";boxesOf(d).forEach(k=>{boxes+='<label class="lc109-box"><input type="checkbox" data-lc109-box="'+k+'" data-day="'+d+'"'+(r[k]?" checked":"")+"> <span>"+E(labelOf(d,k))+"</span></label>"});
    let go="";(tk.go||[]).forEach(g=>{go+='<a class="btn btn-quiet btn-sm" href="'+g[0]+'">'+E(g[1])+" →</a>"});
    const note=tk.note?'<p class="muted" style="margin-bottom:4px">'+E(tk.ask)+'</p><textarea data-lc109-note="'+tk.note+'" maxlength="400" placeholder="Write it down. Make it funny if you can.">'+E((s.notes||{})[tk.note]||"")+"</textarea>":"";
    const fin=d===LEN?'<div class="lc109-row"><button type="button" class="btn btn-primary btn-sm" data-lc109="tell">'+ic("comments")+'Tell Coach Kyenzo how it went</button><button type="button" class="btn btn-quiet btn-sm" data-lc109="again">Start again at Week 2</button></div>':"";
    return'<section class="lc109-card" data-lc109-today="'+d+'"><p class="lc109-k">'+E(wk.title)+" · Day "+d+" of "+LEN+"</p><p><b>Goal:</b> "+E(wk.goal)+"</p><p>"+E(tk.t)+"</p>"
      +'<div class="lc109-row">'+go+"</div>"+boxes+note+fin+"</section>";
  }
  function editHTML(s,d){
    if(!d)return"";const r=s.days[d]||{};let boxes="";
    boxesOf(d).forEach(k=>{boxes+='<label class="lc109-box"><input type="checkbox" data-lc109-box="'+k+'" data-day="'+d+'"'+(r[k]?" checked":"")+"> <span>"+E(labelOf(d,k))+"</span></label>"});
    return'<section class="lc109-card" data-lc109-edit="'+d+'"><h2>Day '+d+"</h2><p class=\"muted\">"+E(task(d).t)+"</p>"+boxes
      +'<div class="lc109-row"><button type="button" class="btn btn-quiet btn-sm" data-lc109="skipday" data-day="'+d+'">'+(r.skip?"Not skipped after all":"I skipped this day")+'</button><button type="button" class="btn btn-quiet btn-sm" data-lc109="close">Close</button></div></section>';
  }
  function gridHTML(s){
    const now=Math.min(dayNo(s.start,Date.now()),LEN),sx=stats(s,Date.now());let h="";
    WEEKS.forEach(w=>{
      h+='<p class="lc109-wk">'+E(w.title)+'</p><div class="lc109-grid">';
      for(let i=w.from;i<=w.to;i++){
        const f=filled(s,i),n=boxesOf(i).length,r=s.days[i]||{};
        const cls=f===n?"is-full":f?"is-part":(r.skip?"is-skip":"");
        h+='<button type="button" class="lc109-day '+cls+(i===now?" is-now":"")+'" data-lc109-day="'+i+'"'+(i>now?" disabled":"")+' aria-label="Day '+i+", "+f+" of "+n+' boxes">'+i+"<small>"+(r.skip&&!f?"skip":f+"/"+n)+"</small></button>";
      }
      h+="</div>";
    });
    const pct=sx.max?Math.round(100*sx.boxes/sx.max):0;
    return'<section class="lc109-card"><h2>Your tracker</h2><p><b>'+sx.full+"</b> full day"+(sx.full===1?"":"s")+" · streak <b>"+sx.streak+"</b> · "+sx.boxes+" of "+sx.max+" boxes</p>"
      +'<div class="lc109-bar"><i style="width:'+pct+'%"></i></div>'+h+'<p class="muted" style="margin-top:8px">Tap a past day to fix its boxes. Days ahead stay locked.</p></section>';
  }
  function render(host){
    const v=host||Q("[data-lc109-page]");if(!v)return;const s=st();css();
    let h=head();
    if(FRESH){h+=introHTML()}
    if(!s.start){h+=rulesHTML()+startHTML()}
    else{
      const d=dayNo(s.start,Date.now());
      if(d>LEN)h+='<section class="lc109-card lc109-egg"><h2>Your 30 days are done.</h2><p>Look back at the month, pick your next one to three Working Points, then start again at Week 2.</p><div class="lc109-row"><button type="button" class="btn btn-primary btn-sm" data-lc109="tell">'+ic("comments")+'Tell Coach Kyenzo how it went</button><button type="button" class="btn btn-quiet btn-sm" data-lc109="again">Start again at Week 2</button></div></section>';
      h+=checkHTML(s);
      if(d<=LEN)h+=todayHTML(s);
      h+=editHTML(s,EDIT);
      h+=gridHTML(s)+rulesHTML();
      h+='<p class="muted" style="text-align:center"><button type="button" class="btn btn-quiet btn-sm" data-lc109="reset">Start over from day 1</button></p>';
    }
    v.innerHTML='<div class="lc109" data-lc109-page>'+h+"</div>";
  }
  function mount(v){
    const host=v||Q("#view");if(!host)return;css();
    FRESH=unlock("link")||FRESH;
    host.innerHTML='<div data-lc109-page></div>';
    render(Q("[data-lc109-page]",host));
    if(FRESH)say("Secret page unlocked: it is now in Learn › Kyenzo’s books.","good");
  }

  /* ---------- actions ---------- */
  function setBox(d,k,on){const s=st();const r=s.days[d]||{};r[k]=on?1:0;if(on)r.skip=0;s.days[d]=r;s.answered[d]=1;save(s);
    try{if(on&&complete(s,d)&&typeof V6!=="undefined"&&V6.addXp)V6.addXp("think",10,{noBench:true,noFw:true})}catch(e){}}
  function onClick(e){
    const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    const dayBtn=t.closest("[data-lc109-day]");
    if(dayBtn&&!dayBtn.disabled){e.preventDefault();EDIT=+dayBtn.getAttribute("data-lc109-day");render();const x=Q("[data-lc109-edit]");if(x)x.scrollIntoView({block:"center",behavior:"smooth"});return}
    const b=t.closest("[data-lc109]");if(!b)return;
    const a=b.getAttribute("data-lc109"),s=st();e.preventDefault();
    if(a==="start"){s.start=ymd(Date.now());s.days={};s.answered={};save(s);FRESH=false;render();say("Day 1. Let’s go.","good")}
    else if(a==="startat"){const sel=Q("[data-lc109-from]"),n=Math.max(1,Math.min(LEN,+(sel&&sel.value)||1));s.start=ymd(Date.now()-(n-1)*DAY);for(let i=1;i<n;i++)s.answered[i]=1;save(s);FRESH=false;render()}
    else if(a==="did"){const c=check(s,Date.now());EDIT=c.ask||0;render();const x=Q("[data-lc109-edit]");if(x)x.scrollIntoView({block:"center",behavior:"smooth"})}
    else if(a==="skipped"){const c=check(s,Date.now());if(c.ask){const r=s.days[c.ask]||{};r.skip=1;s.days[c.ask]=r;s.answered[c.ask]=1;save(s)}render();say("Honest. Today counts.","")}
    else if(a==="skipday"){const d=+b.getAttribute("data-day");const r=s.days[d]||{};r.skip=r.skip?0:1;if(r.skip)boxesOf(d).forEach(k=>{r[k]=0});s.days[d]=r;s.answered[d]=1;save(s);render()}
    else if(a==="close"){EDIT=0;render()}
    else if(a==="again"){s.start=ymd(Date.now()-7*DAY);for(let i=1;i<=7;i++){s.days[i]={m:1,g1:1};s.answered[i]=1}for(let i=8;i<=LEN;i++){delete s.days[i];delete s.answered[i]}s.round=(+s.round||1)+1;save(s);EDIT=0;render();say("Round "+s.round+": back to Week 2.","good")}
    else if(a==="reset"){if(!b.hasAttribute("data-sure")){b.setAttribute("data-sure","1");b.textContent="Tap again to wipe your 30 days";return}s.start=null;s.days={};s.answered={};s.notes={};save(s);EDIT=0;render()}
    else if(a==="tell"){const txt=summary(s,Date.now());let ok=false;try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt);ok=true}}catch(x){}
      say(ok?"Your summary is copied. Paste it in the chat with Coach Kyenzo.":"Open Coach Kyenzo and tell me how it went.","good");location.hash="#coach-chat"}
  }
  function onChange(e){
    const t=e.target;if(!t||!t.getAttribute)return;
    if(t.hasAttribute("data-lc109-box")){setBox(+t.getAttribute("data-day"),t.getAttribute("data-lc109-box"),t.checked);setTimeout(()=>render(),0);return}
    if(t.hasAttribute("data-lc109-note")){const s=st();s.notes[t.getAttribute("data-lc109-note")]=String(t.value||"").slice(0,400);save(s)}
  }
  /* LC88: one step a day while the 30 days run: the check when yesterday is empty, otherwise today's dose */
  function guide(){
    try{
      const s=st();if(!s.unlocked||!s.start)return null;
      if(/^#(blueprint30|b30)\b/i.test(location.hash||""))return null;
      const d=dayNo(s.start,Date.now());if(d<1||d>LEN)return null;
      const t=ymd(Date.now());if(s.dism===t)return null;
      const c=check(s,Date.now());
      if(c.ask)return{html:"<b>Accountability check.</b> <span class=\"lc88-s\">Day "+c.ask+" of your 30 days has no ticks. Did you do your daily dose?</span>",
        acts:[{label:"Check in",run:()=>{location.hash="#"+ROUTE},primary:true},{label:"×",dismiss:true,run:()=>{const x=st();x.dism=t;save(x)}}],sig:"b30-check-"+c.ask};
      if(filled(s,d))return null;
      return{html:"<b>Blueprint, day "+d+".</b> <span class=\"lc88-s\">"+E(weekOf(d).title)+": your daily dose is waiting.</span>",
        acts:[{label:"Open my 30 days",run:()=>{location.hash="#"+ROUTE},primary:true},{label:"×",dismiss:true,run:()=>{const x=st();x.dism=t;save(x)}}],sig:"b30-day-"+d};
    }catch(e){return null}
  }
  function fromUrl(){
    try{
      const q=new URLSearchParams(location.search),h=String(location.hash||"").replace(/^#/,"").toLowerCase().split(/[?&/]/)[0];
      if(/^blueprint/i.test(q.get("book")||"")){FRESH=unlock("link")||FRESH;if(h!==ROUTE)location.hash="#"+ROUTE}
      else if(h==="b30"){location.replace("#"+ROUTE)}
    }catch(e){}
  }
  /* Learn > Kyenzo's books: once unlocked, a card on top of #books (next to LC107's roadmap card) */
  let cur="";
  function libraryCard(){
    const v=Q("#view");if(!v||cur!=="books"||!unlocked()||Q("[data-lc109-lib]",v))return;
    const s=st(),d=s.start?Math.min(dayNo(s.start,Date.now()),LEN):0;
    const x=D.createElement("section");x.className="section";x.setAttribute("data-lc109-lib","");x.style.marginBottom="12px";
    x.innerHTML='<a class="panel lc107-libcard" href="#'+ROUTE+'">'+ic("book-open")+"<span><b>Your First 30 Days</b><small>The 2000+ Blueprint · "+(d?"day "+Math.min(d,LEN)+" of "+LEN:"your 30-day tracker")+"</small></span></a>";
    const h=Q("h1",v),a=h?h.closest("header,section,div")||h:null;
    if(a&&a.parentNode)a.parentNode.insertBefore(x,a.nextSibling);else v.insertBefore(x,v.firstChild);
  }
  function afterRender(route){cur=String(route||"");css();if(cur==="books")setTimeout(libraryCard,80)}
  function init(){
    try{
      css();D.addEventListener("click",onClick);D.addEventListener("change",onChange);
      try{const lv=LC26.levels,o=lv.minLevel;if(lv&&!lv.__lc109){lv.__lc109=1;lv.minLevel=r=>(r===ROUTE||r==="b30")?1:o(r)}}catch(e){}
      fromUrl();
    }catch(e){console.error("lc109",e)}
  }
  return{init:init,afterRender:afterRender,mount:mount,guide:guide,unlocked:unlocked,version:VERSION,
    _t:{ymd:ymd,dayNo:dayNo,filled:filled,complete:complete,check:check,streak:streak,stats:stats,summary:summary,task:task,boxesOf:boxesOf,st:st,save:save,blank:blank,K:K}};
})(); /*@@end lc109*/
