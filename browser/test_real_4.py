"""The app must be all English even when the phone is set to Dutch (Belgium). Real Firefox, navigator.language = nl-BE."""
import time,json,os,re,os
from ff import *
from langdetect import detect_langs,DetectorFactory
DetectorFactory.seed=0
S=Suite('real-4-english')
def need(cond,msg):
    if not cond:raise AssertionError(msg)
STRONG=set('niet zijn wordt worden maar ook deze jouw jij wij onze hebben heeft kunnen moet willen geen zich omdat toch zeer nieuwe speel schaak stukken beurt gebruiker wachtwoord opslaan verwijderen annuleren volgende vorige sluiten openen instellingen gegevens leren oefenen mijn bestand kiezen gekozen vul veld'.split())
def dutch_in(text):
    """lines that are Dutch: 2+ strong Dutch words, or the language detector says Dutch with high confidence"""
    bad=[]
    for line in [l.strip() for l in text.split('\n') if len(l.strip())>=30]:
        w={x for x in re.findall(r"[a-zà-ÿ]+",line.lower()) if x in STRONG}
        lang=None
        try:
            d=detect_langs(line)[0];lang=(d.lang,d.prob)
        except Exception:pass
        # a short line with a Flemish surname ("Lanckriet-student ghost") fools the detector: short lines also need a real Dutch word
        detected=bool(lang and lang[0]=='nl' and lang[1]>0.9 and (len(line)>=60 or len(w)>=1))
        if len(w)>=2 or detected:bad.append((line[:90],sorted(w),lang))
    return bad

def t_active(b):
    member(b,'#home');b.wait_js('document.querySelector("#view").children.length>0',25);time.sleep(2)
    need(b.js('return navigator.language')=='nl-BE','the browser is not set to Dutch (Belgium): '+str(b.js('return navigator.language')))
    need(b.js('return window.eval("LC25.english.need()")')==True,'the English module did not switch on for a Dutch phone')
    need(b.js('return document.documentElement.getAttribute("translate")')=='no' and b.js('return document.documentElement.lang')=='en','page is not marked English / no-translate')
    need(b.exists('meta[name="google"][content="notranslate"]'),'no notranslate meta')
S.run('dutch phone: English module on, page marked English and not translatable',t_active,locale='nl-BE')

ROUTES=['#home','#openings','#themes','#puzzles','#think','#endgame','#theory','#profile','#trophies','#rivals','#friends','#leaderboard','#bot','#trim','#upgrades','#about','#refer','#hall','#srs','#studio','#survival','#shuffle','#ranked','#privacy']
def t_text(b):
    member(b,'#home');time.sleep(2);found=[];words=0
    for r in ROUTES:
        b.d.get(BASE+'/index.html'+r);time.sleep(2.2)
        txt=b.js('return document.body.innerText')or'';words+=len(txt.split())
        for x in dutch_in(txt):found.append((r,)+x)
    print('       scanned %d routes, %d words'%(len(ROUTES),words))
    need(not found,'Dutch text on screen: '+'; '.join('%s: "%s" %s'%(f[0],f[1],f[2]) for f in found[:4]))
S.run('dutch phone: no Dutch text on any of %d screens (word list + language detector)'%len(ROUTES),t_text,locale='nl-BE')

def t_privacy(b):
    member(b,'#privacy');time.sleep(2.5)
    txt=b.js('return document.body.innerText')
    need('Belgian Data Protection Authority' in txt,'the privacy page does not mention the authority')
    need('Gegevensbeschermings' not in txt and 'Autorit' not in txt,'the Dutch/French regulator name is still on the privacy page')
    need('www.dataprotectionauthority.be' in txt,'the authority URL is missing')
S.run('privacy page: only the English authority name and its URL (also with your published content)',t_privacy,locale='nl-BE')

INJECT = """var h=document.createElement('div');h.id='eng-host';h.style.cssText='padding:14px;max-width:460px';
h.innerHTML='<form id="eng-form" onsubmit="return false"><label class="field"><span class="field-label">PGN file</span><input id="eng-file" class="input" type="file" accept=".pgn"></label>'+
 '<div style="margin-top:10px"><input id="eng-img" type="file" accept="image/*"></div>'+
 '<label class="field"><span class="field-label">Email</span><input id="eng-email" class="input" type="email" required value="not-an-email"></label>'+
 '<label class="field"><span class="field-label">Starts</span><input id="eng-date" class="input" type="date" value="2026-10-21"></label>'+
 '<button id="eng-submit" type="submit" class="btn btn-primary">Submit</button></form>';
document.querySelector('#view').prepend(h);"""
def t_controls(b):
    member(b,'#home');b.wait_js('document.querySelector("#view").children.length>0',25);time.sleep(2)
    b.js(INJECT);time.sleep(.8)                                   # the app's observer converts controls that appear later
    b.js('document.getElementById("eng-host").scrollIntoView({block:"start"});window.scrollBy(0,-150)');time.sleep(.3)
    # file pickers
    need(b.js('return document.querySelectorAll("#eng-host .lc25-fileui").length')==2,'file pickers were not replaced')
    txt=b.text('#eng-host') or ''
    need('Choose a PGN file' in txt and 'Choose an image' in txt and txt.count('No file chosen')==2,'English picker text missing: '+txt[:160].replace('\n',' | '))
    need('Bestand' not in txt and 'Geen bestand' not in txt,'Dutch picker text visible')
    r=b.js('var r=document.getElementById("eng-file").getBoundingClientRect();return [r.width,r.height]');need(r[0]<=2 and r[1]<=2,'the native picker is still visible: %s'%r)
    b.shot('60-english-controls')
    # a real tap on the English button reaches the real file input (focus moves to it / a chooser is requested)
    b.js('window.__fileClick=0;document.getElementById("eng-file").addEventListener("click",function(e){window.__fileClick++;e.preventDefault()},true)')
    ui=center(b,'#eng-host .lc25-fileui .lc25-filebtn');tap_at(b,ui['x'],ui['y']);time.sleep(.4)
    need(b.js('return window.__fileClick')==1,'tapping "Choose a PGN file" did not open the picker exactly once (got %s)'%b.js('return window.__fileClick'))
    # date picker -> ISO text input
    d=b.js('var e=document.getElementById("eng-date");return [e.type,e.value,e.placeholder]');need(d==['text','2026-10-21','YYYY-MM-DD'],'date input: %s'%d)
    # validation text: a real click on Submit triggers the browser's own validation, which must now speak English
    b.click('#eng-submit');time.sleep(.5)
    msg=b.js('return document.getElementById("eng-email").validationMessage')
    need(msg=='Please enter a valid email address.','validation message is "%s"'%msg)
    # fixing the field clears it (the form can submit again)
    em=b.d.find_element(By.CSS_SELECTOR,'#eng-email');em.clear();em.send_keys('a@b.co');time.sleep(.3)
    need(b.js('return document.getElementById("eng-email").validationMessage')=='','the English message stayed after the field was fixed')
    need(b.errors()==[],'errors: '+str(b.errors()[:3]))
S.run('dutch phone: English file pickers (real tap opens the picker once), ISO date input, English validation text',t_controls,locale='nl-BE')

def t_english_phone(b):
    member(b,'#home');b.wait_js('document.querySelector("#view").children.length>0',25);time.sleep(2)
    need(b.js('return window.eval("LC25.english.need()")')==False,'the module switched on for an English phone')
    b.js(INJECT);time.sleep(.8)
    need(b.js('return document.querySelectorAll("#eng-host .lc25-fileui").length')==0 and b.js('return document.getElementById("eng-date").type')=='date','English phones must keep their native controls')
S.run('english phone: native controls untouched (no regression for English users)',t_english_phone,locale='en-GB')
print(S.done())
