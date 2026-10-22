"""A narrow phone (357 CSS px, the common 360 dp Android width): nothing may spill sideways, in pages or in sheets."""
import time,json,os
from ff import *
S=Suite('real-5-narrow')
def need(cond,msg):
    if not cond:raise AssertionError(msg)
OFFENDERS = """var W=innerWidth,out=[];
function clipped(e){for(var p=e.parentElement;p&&p!==document.body&&p!==document.documentElement;p=p.parentElement){var cs=getComputedStyle(p);if(cs.overflowX!=='visible'&&p.getBoundingClientRect().right<=W+1)return true}return false}
document.querySelectorAll('body *').forEach(function(e){var r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)return;var cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none')return;
  if(r.right>W+1&&!clipped(e)&&!e.closest('.cele-burst,svg'))out.push((e.tagName+'.'+String(e.className&&e.className.baseVal!==undefined?e.className.baseVal:e.className).split(' ')[0]+' '+Math.round(r.right)+'>'+W+' | '+(e.innerText||'').replace(/\\s+/g,' ').slice(0,30)))});
return {w:W,sw:document.documentElement.scrollWidth,n:out.length,first:out.slice(0,6)}"""
def narrow(b,route,fresh=False):
    b.d.switch_to.default_content()
    b.d.get(BASE+'/t.html')
    if not fresh:
        st=json.load(open(STATE));b.js('localStorage.clear();var s=arguments[0];for(var k in s)localStorage.setItem(k,s[k])',st)
    else:b.js('localStorage.clear()')
    b.d.get(BASE+'/narrow.html');b.js('document.getElementById("f").src="/index.html'+route+'"');time.sleep(3.5)
    b.d.switch_to.frame('f')
def goto(b,route):
    b.js('location.hash=arguments[0]',route);time.sleep(2.3)
def check(b,label):
    r=b.js(OFFENDERS)
    need(r['sw']<=r['w']+1 and r['n']==0,'%s: scrollWidth %d vs %d, %d elements spill: %s'%(label,r['sw'],r['w'],r['n'],r['first']))
def t_pages(b):
    narrow(b,'#home');need(b.js('return innerWidth')==360,'the app sees a %s px viewport, not 360'%b.js('return innerWidth'))
    b.wait_js('document.querySelector("#view").children.length>0',25);time.sleep(1.5)
    for r in ['#home','#openings','#themes','#endgame','#profile','#trophies','#rivals','#upgrades','#refer','#trim','#puzzles','#leaderboard']:
        goto(b,r);check(b,r)
    goto(b,'#home');b.d.switch_to.default_content();b.shot('70-narrow-home');b.d.switch_to.frame('f')
S.run('narrow phone (360px): no horizontal spill on 12 pages',t_pages)

JS_TILT = """LC25.tilt.open(true,{polled:true,sites:['Lichess','Chess.com']})"""
JS_FLASH = """(function(){var g=new Chess();['e4','c6','d4','d5','Nc3','dxe4'].forEach(function(s){var f=g.fen();var m=g.move(s);V36.srsHit({},{san:m.san,color:m.color,from:m.from,to:m.to},f)});LC25.flash.open(LC25.flash.load()[0],function(){})})()"""
JS_BADGE = """Celebrate.badge('Status unlocked: OG','You joined in the first year of the app. This badge is yours for good.')"""
CLOSE = """var e=document.querySelector('.sheet-wrap button[data-close]');if(e)e.click()"""
def shot(b,name):
    b.d.switch_to.default_content();b.shot(name);b.d.switch_to.frame('f')
def t_sheets(b):
    narrow(b,'#home');b.wait_js('document.querySelector("#view").children.length>0',25);time.sleep(2)
    b.js('window.eval(arguments[0])',JS_TILT);time.sleep(1.2);check(b,'penalty box modal');shot(b,'71-narrow-penalty');b.js(CLOSE);time.sleep(.6)
    b.js('window.eval(arguments[0])',JS_FLASH);time.sleep(1.2);check(b,'flashcard sheet');shot(b,'72-narrow-flashcard');b.js(CLOSE);time.sleep(.6)
    b.js('window.eval(arguments[0])',JS_BADGE);time.sleep(.8);check(b,'celebration popup');shot(b,'73-narrow-popup')
    b.js('document.querySelectorAll(".sheet-wrap").forEach(function(e){e.remove()})');time.sleep(2.6)
    goto(b,'#openings');tap_text(b,'Caro-Kann');time.sleep(1);b.click('[data-lv-go="1"]');time.sleep(1.2);b.click('[data-mode="learn"]')
    b.wait_js('document.querySelector("#view .fb .mspc25")',20);time.sleep(1.5);check(b,'learn mode with the open MSPC note')
    b.js('document.querySelector("#view .fb").scrollIntoView({block:"center"})');time.sleep(.5);shot(b,'74-narrow-learn-note')
S.run('narrow phone (360px): v25 sheets, popup and the Learn note fit the screen',t_sheets)

def t_onboarding(b):
    narrow(b,'#home',fresh=True);b.wait_js('document.querySelector("[data-lc25-start]")',25);time.sleep(1);check(b,'welcome sheet');shot(b,'75-narrow-welcome')
    b.click('[data-lc25-start]');time.sleep(.8);check(b,'onboarding step 1');shot(b,'76-narrow-onboarding')
S.run('narrow phone (360px): welcome and onboarding fit the screen',t_onboarding)
print(S.done())
