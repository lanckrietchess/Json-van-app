import time,json,os
from ff import *
from selenium.webdriver.support.ui import Select
S=Suite('real-1')
def need(cond,msg):
    if not cond:raise AssertionError(msg)

def t_boot(b):
    b.fresh('#home');need(b.wait_js('typeof LC25!=="undefined"&&document.querySelector(".sheet-wrap")',25),'app did not boot to the welcome sheet')
    time.sleep(1)
    need(b.errors()==[],'console errors: '+str(b.errors()[:3]))
    need(b.js('return document.documentElement.getAttribute("data-lc25-theme")')=='tech','tech theme not on by default')
    fonts=b.js('return Array.from(document.fonts).filter(function(f){return f.status==="loaded"}).map(function(f){return f.family}).join(",")')
    need('Schibsted Grotesk' in fonts and 'Font Awesome 6 Free' in fonts,'fonts/icons not loaded: '+fonts)
    need(b.js('return document.documentElement.scrollWidth<=innerWidth+1'),'horizontal overflow on the welcome')
S.run('boot: zero errors, tech theme, real fonts and icons, no horizontal overflow',t_boot)

def onboard(b,upto='redemption'):
    b.fresh('#home');b.wait_js('document.querySelector("[data-lc25-start]")',25)
    b.click('[data-lc25-start]');time.sleep(.8)
    b.click('[data-p="youtube"]');b.click('[data-next]');time.sleep(.4)
    b.click('[data-next]');time.sleep(.4)
    b.click('[data-pain] [data-k="threats"]');b.click('[data-next]');time.sleep(.5)
    b.click('[data-mspc] [data-k="yes"]')          # a real tap: would fail if a popup covered it
    b.click('[data-next]');time.sleep(1.2)

def t_onboarding_taps(b):
    b.fresh('#home');b.wait_js('document.querySelector("[data-lc25-start]")',25)
    b.click('[data-lc25-start]');time.sleep(.8)
    b.click('[data-p="youtube"]');b.click('[data-next]');time.sleep(.4)
    b.click('[data-next]');time.sleep(.4)
    b.click('[data-pain] [data-k="threats"]');b.click('[data-next]');time.sleep(.2)
    # the OG badge popup fires around here: it must wait, and it must never block the answer buttons
    for _ in range(8):
        el=b.d.find_element(By.CSS_SELECTOR,'[data-mspc] [data-k="yes"]')
        top=b.js('var r=arguments[0].getBoundingClientRect();var e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return e?!!e.closest("[data-mspc]"):false',el)
        need(top,'something covers the MSPC answer button');time.sleep(.35)
    need(not b.exists('.cele'),'a celebration popup is on screen during the onboarding sheet')
    b.click('[data-mspc] [data-k="yes"]');b.click('[data-next]');time.sleep(1.2)
    need('redemption' in (b.text('.sheet-wrap h2,.sheet-wrap .sheet-title') or '').lower(),'redemption sheet did not open')
S.run('onboarding: no popup over the answers, every button tappable by a real click',t_onboarding_taps)

HOOK = """(function(){var o=LC80.scan.analyseGame;LC80.scan.analyseGame=async function(g){var r=await o.apply(this,arguments);var p=LC25.logic.pickRedemption(r);window.__pick=p?{num:p.num,san:p.san,best:p.best,bestSan:p.bestSan,cls:p.cls,loss:p.loss,fen:g.fens[p.i],color:p.color}:null;return r}})()"""
# a move that hangs a piece: after it, an enemy piece of LOWER value can capture the mover's piece
BAD = """var g=new Chess(arguments[0]);var V={p:1,n:3,b:3,r:5,q:9,k:0};var best=null;
g.moves({verbose:true}).forEach(function(m){var h=new Chess(arguments[0]);h.move(m);var loss=0;h.moves({verbose:true}).forEach(function(c){if(c.to===m.to&&c.captured){var l=V[m.piece]-V[c.piece];if(l>loss)loss=l}});if(loss>0&&(!best||loss>best.loss))best={from:m.from,to:m.to,loss:loss,san:m.san}}.bind(null));
return best"""
def t_redemption(b):
    onboard(b)
    Select(b.d.find_element(By.CSS_SELECTOR,'[data-site]')).select_by_value('li')
    b.js('window.eval(arguments[0])',HOOK)
    inp=b.d.find_element(By.CSS_SELECTOR,'[data-user]');inp.clear();inp.send_keys('Kyenzo');b.click('[data-go]')
    need(b.wait_js('document.querySelector("[data-q] [data-square]")',60),'no quiz: real Stockfish did not produce a move to redeem')
    time.sleep(.8)
    pick=b.js('return window.__pick');need(pick,'the app picked nothing to redeem')
    txt=b.text('[data-lc25-red]') or ''
    need(('Move %d: you played %s'%(pick['num'],pick['san'])) in txt,'the quiz is not about the move the app picked (%s): %s'%(pick['san'],txt[:160].replace('\n',' ')))
    print('       picked:',pick['num'],pick['san'],pick['cls'],round(pick['loss'],1),'-> best',pick['bestSan'])
    bad=b.js('var f=arguments[0];'+BAD.replace('arguments[0]','f'),pick['fen'])
    need(bad,'no hanging move found in the position (test setup)')
    play(b,bad['from'],bad['to'],scope='[data-q]');time.sleep(3)
    fb=b.text('[data-qf]') or ''
    need('works too' not in fb and 'That is the move' not in fb,'a move that hangs a piece was accepted: '+fb[:100])
    need(b.js('return window.eval("V6.state().total")')==0,'XP was awarded for a bad move')
    play(b,pick['best'][:2],pick['best'][2:4],scope='[data-q]');time.sleep(3)
    need('That is the move' in (b.text('[data-qf]') or ''),'the engine best move was not accepted: '+(b.text('[data-qf]') or '')[:100])
    need(b.js('return window.eval("V6.state().total")')==50,'XP is not exactly 50')
    b.click('[data-fin]');time.sleep(1.2)
    need(b.text('.sheet-wrap h2,.sheet-wrap .sheet-title')=='Level 2','no Level 2 popup')
    alpha=b.js('var s=document.querySelector(".sheet-wrap .sheet");var c=getComputedStyle(s).backgroundColor;var m=c.match(/rgba?\\(([^)]+)\\)/);var p=m[1].split(",").map(Number);return p.length>3?p[3]:1')
    need(alpha>=0.97,'the Level 2 sheet is see-through (alpha %s)'%alpha)
    need(b.errors()==[],'errors: '+str(b.errors()[:3]))
S.run('redemption: real Stockfish picks a move, a hanging move is refused, the engine best move gives +50 XP, opaque Level 2 popup',t_redemption)

def t_celebrate_queue(b):
    b.fresh('#home');b.wait_js('document.querySelector("[data-lc25-start]")',25);time.sleep(.5)
    b.js('window.eval("Celebrate.badge(\'Test badge\',\'queued while the welcome sheet is open\')")');time.sleep(.8)
    need(not b.exists('.cele'),'a popup appeared on top of the welcome sheet')
    b.js('window.eval("[].slice.call(document.querySelectorAll(\'.sheet-wrap\')).forEach(function(e){e.remove()})")')
    need(b.wait_js('document.querySelector(".cele")',6),'the queued popup never appeared after the sheet closed')
    need(b.js('return getComputedStyle(document.querySelector(".cele .cele-card")).pointerEvents')=='none','the popup card still intercepts taps')
S.run('popups wait for a sheet, then appear, and never intercept taps',t_celebrate_queue)
print(S.done())
