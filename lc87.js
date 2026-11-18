/*@@module lc87*/
(function(){
  "use strict";
  /* LC87 (build 9.47.0, soft since 9.58.0, 9.59.0: no Google button in an in-app browser): the in-app browser helper. Instagram, TikTok, Facebook, Messenger, Snapchat, X, LinkedIn, Pinterest
     and LINE open links in their own browser, and those browsers cannot install a web app. This script runs first, in the <head> of BOTH the
     landing page (index.html) and the app (app.html), with the same text.
     9.58.0, value first: nothing is blocked any more. In such a browser the landing page and the app work as normal (window.__lcIab = "soft",
     so the app boots and the first game review runs right here, Stockfish on the device). The "Open in Chrome / Safari" screen only shows
     when it helps:
       - on the landing page, a tap on an Install button: "Open in Chrome" (Android intent) / "Open in Safari" (iOS 17+, x-safari-https) /
         "Copy the link", plus "Review my last game here" (the app in this same browser) and a close button
       - LC87.out(url): opens url in the real browser (the app's "Keep this review" step, LC94); where no app link exists it shows the copy screen
       - Android Instagram and Facebook still try Chrome once by themselves (they hand intent links to Chrome); if that does not happen the page simply works here.
     Not used in an installed app (standalone) or in a normal browser. ?lc_iab=0 switches it off for this tab (owner testing only).
     9.49.0, the install state (every browser, also when the helper is off): this script runs before anything else, so it catches Chrome's
     install prompt (beforeinstallprompt) the moment Chrome offers it and keeps it in window.__lcBip for the Install buttons. It also
     remembers that the app is installed (localStorage "lc-pwa-installed": set when the app runs standalone or after appinstalled, cleared
     as soon as Chrome offers its prompt again, which Chrome only does when the app is NOT installed; it also runs out after 60 days without a launch). Android and desktop Chrome share
     that storage between the browser and the installed app, so the landing page can say "Open the app" instead of a dead Install button.
     LC87.installed(), LC87.bip(), LC87.standalone(), LC87.gate(), LC87.out(url). */
  var W=window,D=document,UA=String(navigator.userAgent||""),VERSION="9.59.0";
  var RE=/FBAN|FBAV|FB_IAB|FBIOS|FB4A|Instagram|TikTok|musical_ly|BytedanceWebview|Bytedance|trill_|Snapchat|Twitter|LinkedInApp|Pinterest|Line\//i;
  function isIab(ua){return RE.test(String(ua||""))}
  function appOf(ua){ua=String(ua||"");return/Instagram/i.test(ua)?"Instagram":/TikTok|musical_ly|Bytedance|trill_/i.test(ua)?"TikTok":/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i.test(ua)?"Facebook":/Snapchat/i.test(ua)?"Snapchat":/Twitter/i.test(ua)?"X":/LinkedIn/i.test(ua)?"LinkedIn":/Pinterest/i.test(ua)?"Pinterest":/Line\//i.test(ua)?"LINE":"this app"}
  var ios=/iPhone|iPad|iPod/i.test(UA)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1),android=/Android/i.test(UA);
  var iosV=(function(){var m=/OS (\d+)_/.exec(UA);return m?+m[1]:0})();
  function standalone(){try{return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}catch(e){return false}}
  var off=false;try{if(/[?&]lc_iab=0(&|$)/.test(location.search))sessionStorage.setItem("lc87-off","1");off=sessionStorage.getItem("lc87-off")==="1"}catch(e){}
  /* the address to open outside: this same page, marked as coming from the in-app browser */
  function target(x){var u;try{u=new URL(x||location.href,location.href);u.searchParams.delete("lc_iab");u.searchParams.set("source","iab");return u.href}catch(e){return x||location.href}}
  function intentUrl(x){var t=target(x),u;try{u=new URL(t)}catch(e){return t}
    return"intent://"+u.host+u.pathname+u.search+u.hash+"#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url="+encodeURIComponent(u.href)+";end"}
  function safariUrl(x){return"x-safari-"+target(x)}
  var app=appOf(UA),on=isIab(UA)&&!standalone()&&!off;
  /* 9.49.0: the install state (see the header) */
  var IK="lc-pwa-installed";
  function setInstalled(v){try{if(v)localStorage.setItem(IK,String(Date.now()));else localStorage.removeItem(IK)}catch(e){}}
  function installed(){if(standalone())return true;try{var t=+localStorage.getItem(IK)||0;return t>0&&Date.now()-t<5184e6}catch(e){return false}}   /* 60 days since the app last ran */
  if(standalone())setInstalled(true);
  if(!("__lcBip" in W))W.__lcBip=null;
  try{W.addEventListener("beforeinstallprompt",function(e){try{e.preventDefault()}catch(x){}W.__lcBip=e;setInstalled(false)});
    W.addEventListener("appinstalled",function(){W.__lcBip=null;setInstalled(true)})}catch(e){}
  var landing=!/\/app(\.html)?$/.test(location.pathname);
  var nav=function(x){(W.__lcNav||function(y){location.href=y})(x)};
  W.LC87={on:on,app:app,ios:ios,android:android,iosV:iosV,isIab:isIab,appOf:appOf,target:target,intentUrl:intentUrl,safariUrl:safariUrl,version:VERSION,
    standalone:standalone,installed:installed,setInstalled:setInstalled,bip:function(){return W.__lcBip||null},
    gate:function(){},out:function(x){location.href=x||location.href}};
  if(!on)return;
  W.__lcIab="soft";
  var H=D.documentElement;H.classList.add("lc-iab");
  /* 9.59.0: Google refuses sign-in inside in-app browsers ("disallowed_useragent"), so its button is hidden here; the e-mail code works */
  var css="html.lc-iab [data-lc39-google],html.lc-iab .lc39-or{display:none!important}"
    +"#lc87{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:max(20px,env(safe-area-inset-top)) 20px max(20px,env(safe-area-inset-bottom));background:rgba(15,23,42,.96);color:#e2e8f0;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;overflow-y:auto}"
    +"#lc87[hidden]{display:none}"
    +"#lc87 .b{position:relative;width:100%;max-width:420px;display:flex;flex-direction:column;align-items:center;gap:14px;padding:22px 18px;border-radius:20px;background:radial-gradient(120% 80% at 50% 0%,#14304a 0%,#0f172a 60%);border:1px solid rgba(148,163,184,.22);box-sizing:border-box}"
    +"#lc87 img{width:64px;height:64px;border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.45)}"
    +"#lc87 h1{margin:2px 0 0;font-size:1.4rem;line-height:1.2;color:#fff;font-weight:800}"
    +"#lc87 p{margin:0;color:#cbd5e1}#lc87 p b{color:#fff}"
    +"#lc87 .go{display:flex;align-items:center;justify-content:center;width:100%;min-height:56px;border-radius:16px;border:0;background:#38bdf8;color:#04121c;font-family:inherit;font-weight:800;font-size:1.1rem;line-height:1;text-decoration:none;cursor:pointer;box-shadow:0 10px 30px rgba(56,189,248,.35)}"
    +"#lc87 .go:focus-visible,#lc87 .cp:focus-visible,#lc87 .x:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}"
    +"#lc87 .cp{display:flex;align-items:center;justify-content:center;width:100%;min-height:50px;border-radius:14px;border:1px solid rgba(148,163,184,.45);background:transparent;color:#e2e8f0;font-family:inherit;font-weight:700;font-size:1rem;line-height:1;cursor:pointer;text-decoration:none}"
    +"#lc87 .x{position:absolute;top:8px;right:8px;width:44px;height:44px;border:0;border-radius:12px;background:transparent;color:#cbd5e1;font-size:1.6rem;line-height:1;cursor:pointer}"
    +"#lc87 ol{margin:4px 0 0;padding:12px 14px 12px 34px;text-align:left;border-radius:14px;background:rgba(30,41,59,.85);border:1px solid rgba(148,163,184,.22);width:100%;box-sizing:border-box}"
    +"#lc87 li{margin:4px 0}#lc87 .lk{width:100%;box-sizing:border-box;min-height:44px;padding:0 12px;border-radius:12px;border:1px solid rgba(148,163,184,.4);background:#0b1222;color:#e2e8f0;font:14px ui-monospace,Menlo,monospace}"
    +"#lc87 .ok{color:#4ade80;font-weight:700;min-height:1.5em}";
  var st=D.createElement("style");st.id="lc87-css";st.textContent=css;(D.head||H).appendChild(st);
  var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
  var cur={url:"",here:false};
  function html(o){
    var big=android?'<a class="go" id="lc87-go" href="'+esc(intentUrl(o.url))+'">Open in Chrome</a>'
      :(ios&&iosV>=17)?'<a class="go" id="lc87-go" href="'+esc(safariUrl(o.url))+'">Open in Safari</a>'
      :'<button type="button" class="go" id="lc87-go" data-lc87-copy>Copy the link</button>';
    var steps=ios?"<li>Tap <b>⋯</b> (top right) in "+esc(app)+".</li><li>Choose <b>Open in browser</b> (or <b>Open in Safari</b>).</li><li>In Safari: <b>Share</b> → <b>Add to Home Screen</b>.</li>"
      :"<li>Tap <b>⋮</b> (top right) in "+esc(app)+".</li><li>Choose <b>Open in Chrome</b> (or <b>Open in browser</b>).</li><li>In Chrome: tap <b>Install app</b>.</li>";
    var here=o.here?'<a class="cp" id="lc87-here" href="'+esc(o.hereUrl)+'">Review my last game here</a>':"";
    return'<div class="b" role="dialog" aria-modal="true" aria-labelledby="lc87-h"><button type="button" class="x" data-lc87-x aria-label="Close">×</button><img src="/icons/icon-192.png" alt="Lanckriet Chess" width="64" height="64">'
      +'<h1 id="lc87-h">'+(o.here?"Install from Chrome or Safari":"Open in Chrome or Safari")+'</h1>'
      +'<p><b>The built-in browser of '+esc(app)+' cannot install apps.</b> '+(o.here?"Open this page in Chrome or Safari to install it, or try it right here first.":"Open the app in Chrome or Safari: your game comes along.")+'</p>'
      +big+(android||(ios&&iosV>=17)?'<button type="button" class="cp" data-lc87-copy>Copy the link</button>':"")+here
      +'<p class="ok" id="lc87-ok" role="status" aria-live="polite"></p>'
      +'<ol>'+steps+"</ol></div>";
  }
  function copy(btn){
    var u=target(cur.url),ok=D.getElementById("lc87-ok");
    var done=function(){if(ok)ok.textContent="Link copied. Paste it in Chrome or Safari.";if(btn)btn.textContent="Copied ✓"};
    var manual=function(){if(!ok)return;ok.innerHTML='<input class="lk" readonly aria-label="The link to open in your browser" value="'+esc(u)+'">';var i=ok.querySelector("input");try{i.focus();i.select()}catch(e){}};
    try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(u).then(done,manual);return}}catch(e){}
    try{var t=D.createElement("textarea");t.value=u;t.setAttribute("readonly","");t.style.cssText="position:fixed;left:-9999px;top:0";D.body.appendChild(t);t.select();var r=D.execCommand("copy");t.remove();if(r){done();return}}catch(e){}
    manual();
  }
  var box=null;
  function close(){if(box){box.hidden=true;try{box.remove()}catch(e){}}}
  /* the "Open in Chrome / Safari" screen, on demand. o.url = the address to open (default: this page), o.here = offer "Review my last game here" */
  function gate(o){
    if(!D.body)return;
    o=o||{};cur={url:o.url||"",here:!!o.here};
    var hereUrl="/app.html"+location.search;
    if(!box){box=D.createElement("div");box.id="lc87";
      box.addEventListener("click",function(e){var c=e.target.closest&&e.target.closest("[data-lc87-copy]");if(c){e.preventDefault();copy(c);return}
        if(e.target===box||(e.target.closest&&e.target.closest("[data-lc87-x]"))){e.preventDefault();close()}});
      D.addEventListener("keydown",function(e){if(e.key==="Escape"&&box&&box.isConnected)close()});}
    box.innerHTML=html({url:o.url,here:cur.here,hereUrl:hereUrl});box.hidden=false;
    if(box.parentNode!==D.body)D.body.appendChild(box);
    try{var g=D.getElementById("lc87-go");setTimeout(function(){try{g.focus()}catch(e){}},50)}catch(e){}
  }
  /* open an address in the real browser: Chrome (Android intent), Safari (iOS 17+), otherwise the copy screen */
  function out(x){var u=x||location.href;if(android)return nav(intentUrl(u));if(ios&&iosV>=17)return nav(safariUrl(u));gate({url:u})}
  W.LC87.gate=gate;W.LC87.out=out;W.LC87.close=close;
  /* the landing page: an Install button opens the screen (with "Review my last game here") instead of steps that cannot work in this browser */
  if(landing)D.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("[data-install]");if(!a)return;e.preventDefault();e.stopImmediatePropagation();gate({here:true})},true);
  /* Android, Instagram and Facebook: try Chrome once by itself (they hand intent links to Chrome); when nothing happens, the page works here */
  try{if(android&&/Instagram|FBAN|FBAV|FB_IAB|FB4A/i.test(UA)&&!sessionStorage.getItem("lc87-auto")){sessionStorage.setItem("lc87-auto","1");
    setTimeout(function(){nav(intentUrl())},600)}}catch(e){}
})(); /*@@end lc87*/
