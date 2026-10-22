"""Offline: a REAL service worker, then the server is stopped and the app is reloaded with no network at all."""
import time,json,os,os,signal,subprocess
from ff import *
S=Suite('real-6-offline')
def need(cond,msg):
    if not cond:raise AssertionError(msg)
def stop_server():
    try:os.kill(int(open('/tmp/http.pid').read()),signal.SIGTERM)
    except Exception:pass
    time.sleep(1.5)
def start_server():
    p=subprocess.Popen(['python3',os.path.join(ROOT,'server.py')],stdout=open('/tmp/http.log','w'),stderr=subprocess.STDOUT,stdin=subprocess.DEVNULL,start_new_session=True)
    open('/tmp/http.pid','w').write(str(p.pid));time.sleep(1.5)
def caches_info(b):
    b.d.set_script_timeout(30)
    return b.d.execute_async_script("""var done=arguments[arguments.length-1];caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.open(k).then(function(c){return c.keys().then(function(r){return [k,r.map(function(x){return new URL(x.url).pathname})]})})}))}).then(done)""")
def t_offline(b):
    try:
        st=json.load(open(STATE));st['__real_sw']='1'
        b.d.get(BASE+'/t.html');b.js('localStorage.clear();var s=arguments[0];for(var k in s)localStorage.setItem(k,s[k])',st)
        b.d.get(BASE+'/index.html#openings');b.wait_js('document.querySelector("#lc25-bar")',25)
        b.d.set_script_timeout(40)
        state=b.d.execute_async_script("var done=arguments[arguments.length-1];navigator.serviceWorker.ready.then(function(r){done(r.active&&r.active.state)})")
        need(state in('activated','activating'),'the service worker did not activate: %s'%state)
        # Learn mode: loads Stockfish (cached by the worker) and the notes (cached by the page)
        tap_text(b,'Caro-Kann');time.sleep(1);b.click('[data-lv-go="1"]');time.sleep(1.2);b.click('[data-mode="learn"]')
        need(b.wait_js('document.querySelector("#view .fb .mspc25")',25),'online: no note in Learn mode')
        need(b.wait_js('window.eval("Engine.status()")==="ready"',30),'online: the engine did not get ready')
        time.sleep(2.5)
        ci={k:v for k,v in caches_info(b)}
        print('       caches:',{k:len(v) for k,v in ci.items()})
        shell=sum([v for k,v in ci.items() if k.startswith('lc-shell-')],[])
        need('/index.html' in shell,'the app shell is not cached: %s'%shell)
        need(any(p.endswith('.wasm') for p in ci.get('lc-lib-v1',[])),'the Stockfish engine is not cached by the worker (lc-lib-v1): %s'%ci.get('lc-lib-v1'))
        need('lc-notes-v1' in ci and len(ci['lc-notes-v1'])>=1,'the notes are not saved for offline use')
        # ---- the network goes away ----
        stop_server()
        b.d.get(BASE+'/index.html#openings')
        need(b.wait_js('typeof LC25!=="undefined"&&document.querySelector("#view")&&document.querySelector("#view").children.length>0',30),'offline: the app did not start from the service worker cache')
        b.shot('80-offline-home')
        need(b.exists('#lc25-bar'),'offline: the training screen did not render')
        tap_text(b,'Caro-Kann');time.sleep(1.2);b.click('[data-lv-go="1"]');time.sleep(1.2);b.click('[data-mode="learn"]')
        need(b.wait_js('document.querySelector("#view .lc-board [data-square]")',20),'offline: no board')
        ok=b.wait_js('document.querySelector("#view .fb .mspc25")',20)
        b.shot('81-offline-learn-note')
        need(ok,'offline: the "Why this move" note did not appear (notes should come from the saved copy)')
        need(b.wait_js('window.eval("Engine.status()")==="ready"',30),'offline: Stockfish did not start from the worker cache')
        txt=b.text('#view .fb .mspc25') or ''
        need('Pawn to c6' in txt,'offline: wrong note text: '+txt[:80])
    finally:
        start_server()
S.run('offline: real service worker caches shell, engine and notes; with the server stopped the app, Stockfish and the notes all still work',t_offline)
print(S.done())
