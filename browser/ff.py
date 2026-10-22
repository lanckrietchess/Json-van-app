import os,time,json,sys
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
ROOT=os.path.dirname(os.path.abspath(__file__))
BASE=os.environ.get('LC_BASE','http://127.0.0.1:8765')
SHOTS=os.environ.get('SHOTS',ROOT+'/shots')
APP=os.environ.get('APP_DIR',os.path.abspath(os.path.join(ROOT,'..')))      # the folder with index.html, sw.js, mspc-notes.json, puzzle-alts.json
CONTENT=os.environ.get('CONTENT','/mnt/project/content.json')                # your course JSON (the file published as 'json')
FIREFOX=os.environ.get('FIREFOX','/opt/mf/bin/firefox');GECKO=os.environ.get('GECKODRIVER','/opt/mf/bin/geckodriver')
os.makedirs(SHOTS,exist_ok=True)
class FF:
    def __init__(self,w=390,h=844,headless=True,locale=None,scale=None):
        o=Options()
        if headless:o.add_argument('-headless')
        o.binary_location=FIREFOX
        o.set_preference('network.proxy.type',0)
        if scale:                                        # CSS px = device px / scale: 500 / 1.4 = a 357 px wide phone
            o.set_preference('layout.css.devPixelsPerPx',str(scale))
        if locale:                                       # emulate a phone set to Dutch (Belgium)
            o.set_preference('intl.accept_languages',locale+',nl')
            o.set_preference('intl.locale.requested',locale)
            o.set_preference('intl.regional_prefs.use_os_locales',False)
            o.set_preference('javascript.use_us_english_locale',False)
        o.set_preference('dom.webnotifications.enabled',False)
        o.set_preference('media.autoplay.default',0)
        self.d=webdriver.Firefox(options=o,service=Service(GECKO,log_output='/tmp/gecko.log'))
        self.d.set_window_size(w,h)
        self.w,self.h=w,h
    def js(self,code,*a):return self.d.execute_script(code,*a)
    def get(self,path='/'):self.d.get(BASE+path)
    def fresh(self,path='/#home'):
        """open the app with empty storage, like a new member"""
        self.d.get(BASE+'/t.html') if False else None
        self.d.get(BASE+'/index.html#home')
        self.js('try{localStorage.clear();sessionStorage.clear()}catch(e){}')
        self.d.get(BASE+'/index.html'+path.replace('/',''))
    def shot(self,name):
        p=f'{SHOTS}/{name}.png';self.d.save_screenshot(p);return p
    def wait_js(self,expr,timeout=15,every=.25):
        t0=time.time()
        while time.time()-t0<timeout:
            try:
                v=self.js('return ('+expr+')')
                if v:return v
            except Exception:pass
            time.sleep(every)
        return None
    def errors(self):
        try:return self.js('return window.__errors||[]')
        except Exception:return ['(no page)']
    def click(self,css):
        e=self.d.find_element(By.CSS_SELECTOR,css);self.js('arguments[0].scrollIntoView({block:"center"})',e);e.click();return e
    def exists(self,css):return bool(self.d.find_elements(By.CSS_SELECTOR,css))
    def text(self,css):
        e=self.d.find_elements(By.CSS_SELECTOR,css);return e[0].text if e else None
    def quit(self):
        try:self.d.quit()
        except Exception:pass

STATE=os.environ.get('STATE',ROOT+'/member-state.json')
def member(b,route='#home',state=None,tweaks=None):
    """open the app as a returning member: storage restored from a real onboarding run, quest guide switched off"""
    st=json.load(open(state or STATE))
    st.update(tweaks or {})
    b.d.get(BASE+'/t.html')
    b.js('localStorage.clear();var s=arguments[0];for(var k in s)localStorage.setItem(k,s[k])',st)
    b.d.get(BASE+'/index.html'+route)

def tap_text(b,text,tag='button|a',nth=0,timeout=8):
    xp='|'.join(f'//{t}[contains(normalize-space(.),"{text}")]' for t in tag.split('|'))
    t0=time.time()
    while time.time()-t0<timeout:
        els=[e for e in b.d.find_elements(By.XPATH,xp) if e.is_displayed()]
        if len(els)>nth:
            e=els[nth];b.js('arguments[0].scrollIntoView({block:"center"})',e);e.click();return True
        time.sleep(.3)
    return False

def play(b,frm,to,scope='#view .lc-board',pause=.35):
    """two real clicks on the board squares (tap piece, tap target)"""
    for s in (frm,to):
        e=b.d.find_element(By.CSS_SELECTOR,f'{scope} [data-square="{s}"]')
        b.js('arguments[0].scrollIntoView({block:"center"})',e);time.sleep(.15);e.click();time.sleep(pause)
def san_to_move(b,fen,san):
    """legal move (from,to) for a SAN in a FEN, via the page's own chess.js"""
    return b.js('var san=arguments[1].replace(/[+#]/g,"");var g=new Chess(arguments[0]);var m=g.moves({verbose:true}).filter(function(x){return x.san.replace(/[+#]/g,"")===san})[0];return m?[m.from,m.to]:null',fen,san)
class Suite:
    def __init__(s,name):s.name=name;s.results=[]
    def run(s,title,fn,**kw):
        only=os.environ.get('ONLY')
        if only and only.lower() not in title.lower():return
        b=None
        try:
            b=FF(**kw);fn(b);s.results.append((title,True,''));print('ok   '+title)
        except Exception as e:
            import traceback
            msg=(str(e).split('\n')[0] or e.__class__.__name__)[:300];s.results.append((title,False,msg));print('FAIL '+title+'\n     '+msg)
            try:
                if b:b.shot('FAIL-'+title[:30].replace(' ','_').replace('/','-'))
            except Exception:pass
        finally:
            if b:b.quit()
    def done(s):
        ok=sum(1 for r in s.results if r[1]);print(f'\n{ok} passed, {len(s.results)-ok} failed');return ok==len(s.results)

from selenium.webdriver.common.actions.action_builder import ActionBuilder
def tap_at(b,x,y):
    """a real tap at viewport coordinates: no scrolling, no JS, exactly what a thumb does"""
    ab=ActionBuilder(b.d);ab.pointer_action.move_to_location(int(x),int(y));ab.pointer_action.click();ab.perform()
def center(b,css):
    return b.js('var e=document.querySelector(arguments[0]);if(!e)return null;var r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,top:r.top,bottom:r.bottom,w:r.width,h:r.height}',css)
def hit(b,x,y,within):
    """is the topmost element at this point inside `within`?"""
    return b.js('var e=document.elementFromPoint(arguments[0],arguments[1]);return e?!!e.closest(arguments[2]):false',x,y,within)

FIND_PUZZLE_JS = """var done=arguments[arguments.length-1],pl=arguments[0];
fetch('/data/content.json').then(function(r){return r.json()}).then(function(c){
  var out=null;(c.lists.endgame||[]).concat(c.lists.middlegame||[]).forEach(function(p){
    if(out||!p.puzzle_fen||!p.solution_moves)return;var g=new Chess(p.puzzle_fen),sol=p.solution_moves.slice();
    if(p.setup){var u=sol.shift();g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||undefined})}
    if(g.fen().split(' ')[0]===pl)out={id:p.id,setup:!!p.setup,fen:g.fen(),solution:sol,title:p.title}});
  done(out)})"""
def find_puzzle(b,placement):
    b.d.set_script_timeout(20);return b.d.execute_async_script(FIND_PUZZLE_JS,placement)
def board_placement(b,scope='#view .lc-board'):
    return b.js('var pos={};document.querySelectorAll(arguments[0]+" [data-square]").forEach(function(s){var i=s.querySelector("img[data-piece]");if(i)pos[s.getAttribute("data-square")]=i.getAttribute("data-piece")});return window.eval("LC25.logic.fenFromPosition")(pos).split(" ")[0]',scope)
