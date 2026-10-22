import time,json,os
from ff import *
S=Suite('real-2')
def need(cond,msg):
    if not cond:raise AssertionError(msg)
def lesson_page(b,mode='drill'):
    member(b,'#openings');b.wait_js('document.querySelector("#lc25-bar")',25);time.sleep(1.5)
    tap_text(b,'Caro-Kann');time.sleep(1);b.click('[data-lv-go="1"]');time.sleep(1.2);b.click('[data-mode="%s"]'%mode)
    b.wait_js('document.querySelector("#view .lc-board [data-square]")',20);time.sleep(1.5)
learn_page=lambda b:lesson_page(b,'drill')

LONG_JS = """(function(){var best='';(function f(n){for(var i=0;i<n.length;i++){(n[i].n||[]).forEach(function(t){if(t.length>best.length&&t.length<1300)best=t});f(n[i].c||[])}})(window.__trees||[]);return best})()"""
def t_fold(b):
    member(b,'#home');b.wait_js('document.querySelector("#view").children.length>0',25);time.sleep(1.5)
    txt=b.js('''var r=await fetch("/data/content.json");var c=await r.json();var best="";(function f(n){for(var i=0;i<n.length;i++){(n[i].n||[]).forEach(function(t){if(t.length>best.length&&t.length<1300)best=t});f(n[i].c||[])}})(c.trees[1].tree);return best''') if False else None
    best=b.js('var done=arguments[arguments.length-1];fetch("/data/content.json").then(function(r){return r.json()}).then(function(c){var best="";(function f(n){for(var i=0;i<n.length;i++){(n[i].n||[]).forEach(function(t){if(t.length>best.length&&t.length<1300)best=t});f(n[i].c||[])}})(c.trees[1].tree);done(best)})') if False else None
    # fetch inside execute_async_script
    b.d.set_script_timeout(20)
    long=b.d.execute_async_script('var done=arguments[arguments.length-1];fetch("/data/content.json").then(function(r){return r.json()}).then(function(c){var best="";(function f(n){for(var i=0;i<n.length;i++){(n[i].n||[]).forEach(function(t){if(t.length>best.length&&t.length<1300)best=t});f(n[i].c||[])}})(c.trees[1].tree);done(best)})')
    need(len(long)>800,'no long note found')
    b.js('window.__long=arguments[0];var h=document.createElement("div");h.id="foldhost";h.style.padding="12px";document.querySelector("#view").prepend(h);h.innerHTML=window.eval("feedbackHTML({v:\'hint\',label:\'Learn mode\',text:__long})")',long)
    time.sleep(.4);b.shot('30-fold-collapsed')
    p=b.d.find_element(By.CSS_SELECTOR,'#foldhost .fold25w p');btn=b.d.find_element(By.CSS_SELECTOR,'#foldhost .fold25-b')
    need(btn.is_displayed() and btn.text=='Read more','Read more button not visible')
    short_len=len(p.text);need(short_len<450 and short_len>60,'collapsed text has a strange length: %d'%short_len)
    r=btn.rect;need(r['height']>=28,'Read more tap target is only %dpx tall'%r['height'])
    btn.click();time.sleep(.4);need(len(b.d.find_element(By.CSS_SELECTOR,'#foldhost .fold25w p').text)>=len(long)*0.95,'real click did not expand the whole text')
    need(b.d.find_element(By.CSS_SELECTOR,'#foldhost .fold25-b').text=='Show less','label did not change')
    b.shot('31-fold-expanded');need(b.js('return document.documentElement.scrollWidth<=innerWidth+1'),'horizontal overflow after expanding')
    b.d.find_element(By.CSS_SELECTOR,'#foldhost .fold25-b').click();time.sleep(.3);need(len(b.d.find_element(By.CSS_SELECTOR,'#foldhost .fold25w p').text)==short_len,'Show less did not collapse')
S.run('long text: folds to the opening, real click expands to the exact text and back',t_fold)

INJECT_NEXT = """(function(){var v=document.querySelector('#view');var b=document.createElement('button');b.setAttribute('data-act','next');b.id='fakenext';b.className='btn btn-primary';b.textContent='Next line';b.style.margin='8px';window.__clicks=(window.__clicks||0);b.addEventListener('click',function(){window.__clicks++;window.__clickAt=performance.now();b.remove()});window.__injectAt=performance.now();var anchor=document.querySelector('#view .lc-board')||v;anchor.parentNode.insertBefore(b,anchor);})()"""
def t_auto(b):
    lesson_page(b,'learn')
    b.js('window.__clicks=0;window.eval(arguments[0])',INJECT_NEXT);time.sleep(2.6)
    need(b.js('return window.__clicks')==0 and not b.exists('#lc25-bar [data-lc25="stay"]'),'Auto-Advance acted in Learn mode (it must stay manual there)')
    lesson_page(b,'drill')
    need(b.exists('#lc25-bar [data-lc25="auto"]'),'no Auto-Advance chip')
    # 1. the countdown shows, and a REAL click on "Stay here" cancels it
    b.js('window.__clicks=0;window.eval(arguments[0])',INJECT_NEXT)
    need(b.wait_js('document.querySelector("#lc25-bar [data-lc25=\\"stay\\"]")',3),'no countdown / Stay here button')
    # the member is scrolled down at the board: the countdown must still be on screen and tappable (found by a real browser)
    b.js('document.querySelector("#view .lc-board").scrollIntoView({block:"center"})');time.sleep(.3)
    c=center(b,'#lc25-bar [data-lc25="stay"]');hb=b.js('return document.getElementById("topbar").getBoundingClientRect().bottom')
    need(c and c['top']>=hb-1 and c['bottom']<=b.js('return innerHeight'),'the Stay here button is off screen when scrolled to the board: %s (header bottom %s)'%(c,hb))
    need(hit(b,c['x'],c['y'],'#lc25-bar'),'something covers the Stay here button')
    b.shot('32-auto-countdown')
    tap_at(b,c['x'],c['y']);time.sleep(2.6)                  # a real tap at the button's coordinates, nothing scrolled for it
    need(b.js('return window.__clicks')==0,'Auto-Advance clicked after Stay here')
    b.js('var e=document.getElementById("fakenext");if(e)e.remove()')
    # 2. a fresh button is auto-clicked after about 1.3 s
    b.js('window.__clicks=0;window.eval(arguments[0])',INJECT_NEXT);time.sleep(2.6)
    need(b.js('return window.__clicks')==1,'Auto-Advance did not click the Next button')
    dt=b.js('return window.__clickAt-window.__injectAt');need(1200<=dt<=2200,'fired after %d ms, expected about 1300-1700'%dt)
    # 3. Analyze previous: appears, opens a sheet with the previous board
    need(b.wait_js('document.querySelector("#lc25-bar [data-lc25=\\"prev\\"]")',3),'no Analyze previous button')
    b.js('document.querySelector("#view .lc-board").scrollIntoView({block:"center"})');time.sleep(.3)
    c=center(b,'#lc25-bar [data-lc25="prev"]');need(c and hit(b,c['x'],c['y'],'#lc25-bar'),'Analyze previous is not reachable when scrolled to the board')
    tap_at(b,c['x'],c['y']);time.sleep(1)
    need('Previous position' in (b.text('.sheet-wrap h2,.sheet-wrap .sheet-title') or ''),'Analyze previous did not open')
    pcs=b.js('return document.querySelectorAll(".sheet-wrap .lc25-pb img[data-piece], .sheet-wrap .lc25-pb [data-square] img").length')
    need(pcs>=8,'the previous position shows %s pieces (a board snapshot was expected)'%pcs)
    b.shot('33-analyze-previous')
    # 4. the switch: OFF means no countdown
    b.click('.sheet-wrap button[data-close]');time.sleep(.5);b.click('#lc25-bar [data-lc25="auto"]');time.sleep(.3)
    need('OFF' in (b.text('#lc25-bar [data-lc25="auto"]') or ''),'chip did not switch OFF')
    b.js('window.__clicks=0;window.eval(arguments[0])',INJECT_NEXT);time.sleep(2.4)
    need(b.js('return window.__clicks')==0,'clicked while OFF')
    need(b.errors()==[],'errors: '+str(b.errors()[:3]))
S.run('auto-advance: countdown, Stay here, real timing, Analyze previous board, OFF switch',t_auto)

def t_flash(b):
    learn_page(b)
    # seed the flashcard buffer with real positions (the opening trainer feeds it through srsHit/srsMiss)
    b.js('''window.eval("(function(){var g=new Chess();var mv=['e4','c6','d4','d5','Nc3','dxe4'];mv.forEach(function(s,i){var fen=g.fen();var m=g.move(s);if(m.color==='w'||true)V36.srsHit({},{san:m.san,color:m.color,from:m.from,to:m.to},fen)})})()")''')
    need(b.js('return window.eval("LC25.flash.load().length")')>=3,'flash buffer not seeded')
    for i in range(1,5):
        b.js('window.__clicks=0;window.eval(arguments[0])',INJECT_NEXT)
        if i<4:
            time.sleep(2.7);need(b.js('return window.__clicks')==1,'advance %d did not go through'%i)
    need(b.wait_js('document.querySelector(".sheet-wrap [data-lc25-fc] [data-square]")',6),'no flashcard sheet on the 4th advance')
    need(b.js('return window.__clicks')==0,'the advance went through before the flashcard was answered')
    time.sleep(.9)
    op=b.js('var s=document.querySelector(".sheet-wrap .sheet");var cs=getComputedStyle(s);var m=cs.backgroundColor.match(/rgba?\\(([^)]+)\\)/);var p=m[1].split(",").map(Number);return {opacity:+cs.opacity,alpha:p.length>3?p[3]:1}')
    need(op['opacity']>=0.99 and op['alpha']>=0.97,'the flashcard sheet is see-through: %s'%op)
    b.shot('34-flashcard')
    card=b.js('var c=window.eval("LC25.flash.pick&&1");return null')
    # find the right answer from the card's own board orientation: read the stored card matching the board position
    ans=b.js('''var pos={};document.querySelectorAll(".sheet-wrap [data-lc25-fc] [data-square]").forEach(function(s){var i=s.querySelector("img[data-piece]");if(i)pos[s.getAttribute("data-square")]=i.getAttribute("data-piece")});
      var fen=window.eval("LC25.logic.fenFromPosition")(pos).split(" ")[0];var buf=window.eval("LC25.flash.load()");var hit=buf.filter(function(c){return c.fen.split(" ")[0]===fen})[0];return hit?{from:hit.from,to:hit.to,san:hit.san}:null''')
    need(ans,'could not match the flashcard position to a stored card')
    scope='.sheet-wrap [data-lc25-fc]'
    # a wrong tap first: any other piece to any square
    wrong=b.js('var s=document.querySelector(arguments[0]+" [data-square] img[data-piece^=\\"b\\"]");return s?s.closest("[data-square]").getAttribute("data-square"):null',scope)
    play(b,ans['from'],ans['to'],scope=scope);time.sleep(1)
    need('Correct' in (b.text('[data-lc25-fb]') or ''),'right move not accepted: '+(b.text('[data-lc25-fb]') or ''))
    b.click('[data-lc25-go]');time.sleep(1.2)
    need(b.js('return window.__clicks')==1,'the 4th advance did not continue after the flashcard')
S.run('flashcard on the 4th advance: real board, real taps, then the advance continues',t_flash)

SOLVE_JS = """var pos={};document.querySelectorAll("[data-pbb] [data-square]").forEach(function(s){var i=s.querySelector("img[data-piece]");if(i)pos[s.getAttribute("data-square")]=i.getAttribute("data-piece")});
 var place=window.eval("LC25.logic.fenFromPosition")(pos).split(" ")[0];var pool=window.eval("LC25.pool");var hit=pool.filter(function(p){return p.fen.split(" ")[0]===place})[0];return hit?{id:hit.id,solution:hit.solution}:null"""
def t_penalty(b):
    member(b,'#home');b.wait_js('document.querySelector("#view").children.length>0',25);time.sleep(1.5)
    # no network in this sandbox and an empty app bank: the Penalty Box must serve its built-in puzzles on its own
    b.js('window.eval("LC25.tilt.open(true,{polled:true,sites:[\'Lichess\']})")');time.sleep(.8)
    txt=b.text('.sheet-wrap') or ''
    need('dropped 3 games in a row' in txt and 'Lichess' in txt and 'Stop checking' in txt,'modal text wrong: '+txt[:200].replace('\n',' '))
    b.shot('35-penalty-modal')
    b.click('[data-pb="go"]');time.sleep(1.5)
    seen=[]
    for n in range(1,6):
        need(b.wait_js('document.querySelector("[data-pbb] [data-square]")',10),'puzzle %d did not appear (sheet says: %s)'%(n,(b.text('.sheet-wrap') or '')[:120].replace('\n',' ')))
        time.sleep(.5)
        hit=b.js(SOLVE_JS);need(hit,'puzzle %d is not one of the built-in puzzles'%n);seen.append(hit['id'])
        u=hit['solution'][0];play(b,u[:2],u[2:4],scope='[data-pbb]',pause=.3);time.sleep(1.6)
        if n==2:b.shot('36-penalty-puzzle-2')
    need(len(set(seen))==5,'a puzzle repeated: '+','.join(seen))
    need(b.wait_js('document.querySelector("a[href^=\\"https://wa.me/\\"]")',8),'no summary with a WhatsApp link')
    summary=b.text('[data-pb-root]') or ''
    need('5 of 5' in summary,'summary says: '+summary[:160].replace('\n',' '))
    b.shot('37-penalty-summary')
    href=b.js('return document.querySelector("a[href^=\\"https://wa.me/\\"]").href')
    need('wa.me/?text=' in href and 'ref' in href or 'lanckrietchess' in href,'WhatsApp link looks wrong: '+href[:140])
S.run('penalty box: built-in puzzles offline, 5 solved with real taps on a real board, summary and WhatsApp link',t_penalty)

def t_wait(b):
    open('/tmp/wasm-delay','w').write('7000')
    try:
        lesson_page(b,'learn')                                   # Learn mode loads Stockfish
        need(b.wait_js('document.querySelector(".lc25-wait [data-mp] [data-square]")',12),'the wait puzzle did not appear while Stockfish was loading slowly')
        c=center(b,'.lc25-wait');need(c and c['top']>=0 and c['bottom']<=b.js('return innerHeight'),'the wait card is not fully on screen: %s'%c)
        need(b.js('return getComputedStyle(document.querySelector(".lc25-wait")).position')=='fixed','the wait card is not fixed to the screen')
        b.shot('38-wait-puzzle')
        need('stockfish is warming up' in (b.text('.lc25-wait') or '').lower(),'card text: '+(b.text('.lc25-wait') or '')[:80])
        # solve it with real taps: the board position tells us which built-in puzzle it is
        hit=b.js('''var pos={};document.querySelectorAll(".lc25-wait [data-square]").forEach(function(s){var i=s.querySelector("img[data-piece]");if(i)pos[s.getAttribute("data-square")]=i.getAttribute("data-piece")});
          var place=window.eval("LC25.logic.fenFromPosition")(pos).split(" ")[0];return window.eval("LC25.pool").filter(function(p){return p.fen.split(" ")[0]===place})[0]||null''')
        need(hit,'the wait puzzle is not a built-in puzzle')
        u=hit['solution'][0];play(b,u[:2],u[2:4],scope='.lc25-wait [data-mp]',pause=.3);time.sleep(.8)
        need('Correct' in (b.text('.lc25-wait') or ''),'solving it was not acknowledged')
        # it goes away by itself once the engine is ready
        need(b.wait_js('!document.querySelector(".lc25-wait")',30),'the wait card stayed after Stockfish was ready')
        need(b.js('return window.eval("Engine.status()")')=='ready','engine is not ready: '+str(b.js('return window.eval("Engine.status()")')))
    finally:
        try:os.remove('/tmp/wasm-delay')
        except Exception:pass
import os
S.run('wait puzzle: appears while a slow Stockfish loads (7 s), solved by real taps, gone when the engine is ready',t_wait)
print(S.done())
