/*@@module lc87*/
(function(){
  "use strict";
  /* LC87 (build 9.47.0): the in-app browser gate. Instagram, TikTok, Facebook, Messenger, Snapchat, X, LinkedIn, Pinterest and LINE open links
     in their own browser, and those browsers cannot install a web app. This script runs first, in the <head> of BOTH the landing page
     (index.html) and the app (app.html), with the same text. In such a browser it covers the whole page with one screen: "Open this page in
     Google Chrome or Safari to install the app." and one big button:
       - Android: "Open in Chrome" (an intent link; Chrome opens this same page). On Instagram and Facebook it is also tried once by itself.
       - iPhone / iPad, iOS 17 and newer: "Open in Safari" (x-safari-https link).
       - Everything else: "Copy link", plus the two taps of that app's own menu (⋯ / ⋮ → Open in browser).
     Nothing behind it can be used: the page under it is hidden, and the app does not start (window.__lcIab, read by the boot line of app.html).
     Not shown in an installed app (standalone) or in a normal browser. ?lc_iab=0 switches it off for this tab (owner testing only). */
  var W=window,D=document,UA=String(navigator.userAgent||""),VERSION="9.47.0";
  var RE=/FBAN|FBAV|FB_IAB|FBIOS|FB4A|Instagram|TikTok|musical_ly|BytedanceWebview|Bytedance|trill_|Snapchat|Twitter|LinkedInApp|Pinterest|Line\//i;
  function isIab(ua){return RE.test(String(ua||""))}
  function appOf(ua){ua=String(ua||"");return/Instagram/i.test(ua)?"Instagram":/TikTok|musical_ly|Bytedance|trill_/i.test(ua)?"TikTok":/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i.test(ua)?"Facebook":/Snapchat/i.test(ua)?"Snapchat":/Twitter/i.test(ua)?"X":/LinkedIn/i.test(ua)?"LinkedIn":/Pinterest/i.test(ua)?"Pinterest":/Line\//i.test(ua)?"LINE":"this app"}
  var ios=/iPhone|iPad|iPod/i.test(UA)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1),android=/Android/i.test(UA);
  var iosV=(function(){var m=/OS (\d+)_/.exec(UA);return m?+m[1]:0})();
  function standalone(){try{return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}catch(e){return false}}
  var off=false;try{if(/[?&]lc_iab=0(&|$)/.test(location.search))sessionStorage.setItem("lc87-off","1");off=sessionStorage.getItem("lc87-off")==="1"}catch(e){}
  /* the address to open outside: this same page, marked as coming from the in-app browser */
  function target(){var u;try{u=new URL(location.href);u.searchParams.delete("lc_iab");u.searchParams.set("source","iab");return u.href}catch(e){return location.href}}
  function intentUrl(){var u;try{u=new URL(target())}catch(e){return target()}
    return"intent://"+u.host+u.pathname+u.search+"#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url="+encodeURIComponent(u.href)+";end"}
  function safariUrl(){return"x-safari-"+target()}
  var app=appOf(UA),on=isIab(UA)&&!standalone()&&!off;
  W.LC87={on:on,app:app,ios:ios,android:android,isIab:isIab,appOf:appOf,target:target,intentUrl:intentUrl,safariUrl:safariUrl,version:VERSION};
  if(!on)return;
  W.__lcIab=true;
  var H=D.documentElement;H.classList.add("lc-iab");
  var css="html.lc-iab,html.lc-iab body{overflow:hidden!important;height:100%!important;background:#0f172a!important}"
    +"html.lc-iab body>*:not(#lc87){display:none!important}"
    +"#lc87{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:max(20px,env(safe-area-inset-top)) 20px max(20px,env(safe-area-inset-bottom));background:radial-gradient(120% 80% at 50% 0%,#14304a 0%,#0f172a 55%);color:#e2e8f0;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;overflow-y:auto}"
    +"#lc87 .b{width:100%;max-width:420px;display:flex;flex-direction:column;align-items:center;gap:14px}"
    +"#lc87 img{width:76px;height:76px;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,.45)}"
    +"#lc87 h1{margin:4px 0 0;font-size:1.55rem;line-height:1.2;color:#fff;font-weight:800}"
    +"#lc87 p{margin:0;color:#cbd5e1}#lc87 p b{color:#fff}"
    +"#lc87 .go{display:flex;align-items:center;justify-content:center;width:100%;min-height:58px;border-radius:16px;border:0;background:#38bdf8;color:#04121c;font-family:inherit;font-weight:800;font-size:1.15rem;line-height:1;text-decoration:none;cursor:pointer;box-shadow:0 10px 30px rgba(56,189,248,.35)}"
    +"#lc87 .go:focus-visible,#lc87 .cp:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}"
    +"#lc87 .cp{display:flex;align-items:center;justify-content:center;width:100%;min-height:50px;border-radius:14px;border:1px solid rgba(148,163,184,.45);background:transparent;color:#e2e8f0;font-family:inherit;font-weight:700;font-size:1rem;line-height:1;cursor:pointer}"
    +"#lc87 ol{margin:4px 0 0;padding:12px 14px 12px 34px;text-align:left;border-radius:14px;background:rgba(30,41,59,.85);border:1px solid rgba(148,163,184,.22);width:100%;box-sizing:border-box}"
    +"#lc87 li{margin:4px 0}#lc87 .lk{width:100%;box-sizing:border-box;min-height:44px;padding:0 12px;border-radius:12px;border:1px solid rgba(148,163,184,.4);background:#0b1222;color:#e2e8f0;font:14px ui-monospace,Menlo,monospace}"
    +"#lc87 .ok{color:#4ade80;font-weight:700;min-height:1.5em}";
  var st=D.createElement("style");st.id="lc87-css";st.textContent=css;(D.head||H).appendChild(st);
  var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
  function html(){
    var big=android?'<a class="go" id="lc87-go" href="'+esc(intentUrl())+'">Open in Chrome</a>'
      :(ios&&iosV>=17)?'<a class="go" id="lc87-go" href="'+esc(safariUrl())+'">Open in Safari</a>'
      :'<button type="button" class="go" id="lc87-go" data-lc87-copy>Copy the link</button>';
    var steps=ios?"<li>Tap <b>⋯</b> (top right) in "+esc(app)+".</li><li>Choose <b>Open in browser</b> (or <b>Open in Safari</b>).</li><li>In Safari: <b>Share</b> → <b>Add to Home Screen</b>.</li>"
      :"<li>Tap <b>⋮</b> (top right) in "+esc(app)+".</li><li>Choose <b>Open in Chrome</b> (or <b>Open in browser</b>).</li><li>In Chrome: tap <b>Install app</b>.</li>";
    return'<div class="b" role="dialog" aria-modal="true" aria-labelledby="lc87-h"><img src="/icons/icon-192.png" alt="Lanckriet Chess" width="76" height="76">'
      +'<h1 id="lc87-h">Open in Chrome or Safari</h1>'
      +'<p><b>Open this page in Google Chrome or Safari to install the app.</b> The built-in browser of '+esc(app)+' cannot install apps.</p>'
      +big+(android||(ios&&iosV>=17)?'<button type="button" class="cp" data-lc87-copy>Copy the link</button>':"")
      +'<p class="ok" id="lc87-ok" role="status" aria-live="polite"></p>'
      +'<ol>'+steps+"</ol></div>";
  }
  function copy(btn){
    var u=target(),ok=D.getElementById("lc87-ok");
    var done=function(){if(ok)ok.textContent="Link copied. Paste it in Chrome or Safari.";if(btn)btn.textContent="Copied ✓"};
    var manual=function(){if(!ok)return;ok.innerHTML='<input class="lk" readonly aria-label="The link to open in your browser" value="'+esc(u)+'">';var i=ok.querySelector("input");try{i.focus();i.select()}catch(e){}};
    try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(u).then(done,manual);return}}catch(e){}
    try{var t=D.createElement("textarea");t.value=u;t.setAttribute("readonly","");t.style.cssText="position:fixed;left:-9999px;top:0";D.body.appendChild(t);t.select();var r=D.execCommand("copy");t.remove();if(r){done();return}}catch(e){}
    manual();
  }
  var box=null;
  function mount(){
    if(!D.body)return;
    if(!box){box=D.createElement("div");box.id="lc87";box.innerHTML=html();
      box.addEventListener("click",function(e){var c=e.target.closest&&e.target.closest("[data-lc87-copy]");if(c){e.preventDefault();copy(c)}});}
    if(box.parentNode!==D.body||D.body.lastElementChild!==box)D.body.appendChild(box);
    try{var g=D.getElementById("lc87-go");if(g&&!g.__f){g.__f=1;setTimeout(function(){try{g.focus()}catch(e){}},50)}}catch(e){}
  }
  if(D.body)mount();else D.addEventListener("DOMContentLoaded",mount);
  W.addEventListener("load",mount);
  try{new MutationObserver(function(){if(box&&(box.parentNode!==D.body))mount()}).observe(H,{childList:true,subtree:false})}catch(e){}
  setInterval(mount,1500);                                         /* nothing the page adds later can cover it */
  /* Android, Instagram and Facebook: try Chrome once by itself (they hand intent links to Chrome); the button stays for a second try */
  try{if(android&&/Instagram|FBAN|FBAV|FB_IAB|FB4A/i.test(UA)&&!sessionStorage.getItem("lc87-auto")){sessionStorage.setItem("lc87-auto","1");
    setTimeout(function(){var nav=W.__lcNav||function(x){location.href=x};nav(intentUrl())},600)}}catch(e){}
})(); /*@@end lc87*/
