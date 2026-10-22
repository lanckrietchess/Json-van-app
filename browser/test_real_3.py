import time,json,os,os
from ff import *
S=Suite('real-3')
def need(cond,msg):
    if not cond:raise AssertionError(msg)
ALTS=json.load(open(os.environ.get('ALTS',os.path.join(APP,'puzzle-alts.json'))))['positions']
def vis_text(b,css):return (b.text(css) or '')

def t_alt_puzzle(b):
    member(b,'#endgame');b.wait_js('document.querySelector("#view").children.length>2',25);time.sleep(2)
    b.click('[data-eg-open="egt-square-l1|simple"]');time.sleep(2.5)
    target=None
    for n in range(1,8):
        b.wait_js('document.querySelector("#view .lc-board [data-square]")',15);time.sleep(.8)
        p=find_puzzle(b,board_placement(b));need(p,'the puzzle on screen is not in the content')
        key=' '.join(p['fen'].split(' ')[:3])
        if key in ALTS:target=(p,ALTS[key]);break
        for i,u in enumerate(p['solution']):
            if i%2==0:play(b,u[:2],u[2:4]);time.sleep(1.0)
        time.sleep(4.0)
    need(target,'no audited puzzle reached in the real UI')
    p,e=target;print('       puzzle',p['id'],'| solution',p['solution'][0],'| audited alternatives',[a['s'] for a in e['alts']])
    b.click('#lc25-bar [data-lc25="auto"]');time.sleep(.3)           # hold the screen still so the feedback can be read
    main_uci=p['solution'][0]
    alt=[a for a in e['alts'] if a['t']=='full' and a['s'].replace('+','').replace('#','')!=e['main'].replace('+','').replace('#','')][0]
    mv=san_to_move(b,p['fen'],alt['s']);need(mv,'cannot find the alternative %s in the position'%alt['s'])
    # an unlisted move: it must be accepted INSTANTLY (precomputed, no engine) with an honest explanation
    b.js('window.eval("Engine.analyse=function(){throw new Error(\'engine used for a precomputed alternative\')}")')
    play(b,mv[0],mv[1]);t0=time.time()
    got=None
    while time.time()-t0<4:
        txt=b.js('var f=document.querySelector("#view .fb");return f?f.innerText:""')
        if 'Also' in txt:got=txt;break
        time.sleep(.1)
    need(got,'the alternative %s was not accepted: %s'%(alt['s'],(b.text('#view .fb') or '')[:140].replace('\n',' | ')))
    need(time.time()-t0<2.5,'acceptance took %.1fs: it should be instant (precomputed)'%(time.time()-t0))
    need('Also winning' in got,'label: '+got[:80])
    need('Other good moves here' in got or 'just like' in got or 'keeps the same winning edge' in got,'no explanation: '+got[:200].replace('\n',' | '))
    b.js('document.querySelector("#view .fb").scrollIntoView({block:"center"})');time.sleep(.4);b.shot('44-alt-accepted')
S.run('endgame puzzle: an audited alternative is accepted instantly with real taps, labelled and explained',t_alt_puzzle)

def tilt_state(minutes_ago=(8,28,51)):
    now=int(time.time()*1000)
    nd=[]
    for i,m in enumerate(minutes_ago):
        nd.append(json.dumps({"id":"t%d"%i,"variant":"standard","status":"mate","createdAt":now-(m+9)*60000,"lastMoveAt":now-m*60000,"winner":"white","players":{"white":{"user":{"name":"Rival","id":"rival"}},"black":{"user":{"name":"Kyenzo","id":"kyenzo"}}}}))
    st=json.load(open(STATE))
    app=json.loads(st['lc-hub-v2']);app.setdefault('profile',{})['lichess_username']='Kyenzo';st['lc-hub-v2']=json.dumps(app)
    st['__test_ndjson']='\n'.join(nd);return st
def t_tilt(b):
    st=tilt_state();json.dump(st,open('/tmp/tilt-state.json','w'))
    member(b,'#home',state='/tmp/tilt-state.json')
    need(b.wait_js('document.querySelector(".sheet-wrap")',30),'no tilt modal within 30 s of opening the app (the check runs about 9 s after start)')
    txt=b.text('.sheet-wrap') or ''
    need('dropped 3 games in a row' in txt and 'looked at your last games on Lichess' in txt,'modal text: '+txt[:200].replace('\n',' '))
    b.shot('45-tilt-polled')
    b.click('[data-pb="stop"]');time.sleep(.8)
    need(b.js('return window.eval("App.settings.lc25Tilt")')==False,'Stop checking did not switch the setting off')
    need(not b.exists('.sheet-wrap'),'sheet still open')
    # the choice survives a reload: no modal, no more polling
    b.d.get(BASE+'/index.html#home');time.sleep(14)
    need(not b.exists('.sheet-wrap'),'the modal came back after Stop checking')
S.run('tilt check: app opens, real timer, three recent losses -> modal; Stop checking sticks across a reload',t_tilt)

def open_settings(b):
    b.wait_js('document.querySelector("#view").children.length>2',25);time.sleep(2)
    b.click('#profile-chip');time.sleep(.8)
    need(tap_text(b,'Settings',tag='button|a'),'no Settings entry in the profile menu');time.sleep(1.5)
def t_settings(b):
    member(b,'#home');open_settings(b)
    need(b.exists('input[data-p36="lc25Theme"]') and b.exists('input[data-p36="lc25Tilt"]'),'the two new switches are missing in Settings; headings: '+str(b.js('return Array.from(document.querySelectorAll(".sheet-wrap h2,.sheet-wrap h3,#view h2,#view h3")).map(function(e){return e.innerText}).slice(0,10)')))
    row=b.js('var i=document.querySelector("input[data-p36=\\"lc25Theme\\"]");return i.closest("label").innerText.replace(/\\s+/g," ")')
    need('Tech theme' in row and 'slate' in row,'row text: '+row)
    b.js('document.querySelector("input[data-p36=\\"lc25Theme\\"]").scrollIntoView({block:"center"})');time.sleep(.4);b.shot('46-settings')
    lab=b.d.find_element(By.XPATH,'//input[@data-p36="lc25Theme"]/ancestor::label[1]')
    c=lab.rect;need(c['height']>=36,'the row is only %dpx tall: hard to tap'%c['height'])
    lab.click();time.sleep(.6)
    need(b.js('return document.documentElement.getAttribute("data-lc25-theme")') is None,'switching the Tech theme off did not remove the theme')
    b.shot('47-settings-theme-off')
    b.d.get(BASE+'/index.html#home');time.sleep(2.5)
    need(b.js('return document.documentElement.getAttribute("data-lc25-theme")') is None,'the choice did not survive a reload')
    b.shot('48-home-classic-theme')
S.run('settings: the new Tech theme and Tilt switches are there, tappable, and the theme choice persists',t_settings)

def t_trophy(b):
    st=json.load(open(STATE));now=int(time.time()*1000)
    st['lc25-ghost']=json.dumps({"t0":now-2*864e5,"base":0,"goal":600,"won":True,"wonAt":now-3600000})
    json.dump(st,open('/tmp/ghost-state.json','w'))
    member(b,'#trophies',state='/tmp/ghost-state.json');b.wait_js('document.querySelector("#view").children.length>2',25);time.sleep(2)
    txt=b.js('return document.querySelector("#view").innerText')
    need('Ghost Slayer' in txt,'Ghost Slayer is not shown in the trophy room')
    need('Status badges' in txt or 'Status' in txt,'no status-badge section')
    b.js('var e=Array.from(document.querySelectorAll("#view *")).filter(function(x){return x.children.length===0&&/Ghost Slayer/.test(x.textContent)})[0];e.scrollIntoView({block:"center"})');time.sleep(.5)
    b.shot('49-trophy-ghost')
S.run('trophy room: the Ghost Slayer status badge is shown once earned',t_trophy)

def t_drill_note(b):
    member(b,'#openings');b.wait_js('document.querySelector("#lc25-bar")',25);time.sleep(1.5)
    tap_text(b,'Caro-Kann');time.sleep(1);b.click('[data-lv-go="1"]');time.sleep(1.2);b.click('[data-mode="drill"]')
    b.wait_js('document.querySelector("#view .lc-board [data-square]")',20);time.sleep(1.5)
    b.js('document.querySelector("#lc25-bar [data-lc25=\\"auto\\"]").click()')       # Auto-Advance off, keep the screen still
    # drill as Black: the app plays 1.e4, we play 1...c6 by real taps
    play(b,'c7','c6');time.sleep(2)
    need(b.wait_js('document.querySelector("#view .fb .mspc25")',8),'no Why-this-move note after a correct drill move')
    closed=b.js('var d=document.querySelector("#view .fb .mspc25");return !d.open')
    need(closed,'in a drill the note must start collapsed')
    sm=b.d.find_element(By.CSS_SELECTOR,'#view .fb .mspc25 summary');b.js('arguments[0].scrollIntoView({block:"center"})',sm);time.sleep(.3)
    sm.click();time.sleep(.5)
    need(b.js('return document.querySelector("#view .fb .mspc25").open'),'a real tap on the summary did not open the note')
    need('Pawn to c6' in (b.text('#view .fb .mspc25') or ''),'note text: '+(b.text('#view .fb .mspc25') or '')[:100])
    b.shot('50-drill-note-open')
S.run('drill: the note is collapsed after a correct move and opens with a real tap',t_drill_note)

ROUTES=['#home','#openings','#themes','#puzzles','#think','#endgame','#theory','#profile','#trophies','#rivals','#friends','#leaderboard','#bot','#trim','#upgrades','#about','#refer','#hall','#srs','#review-queue','#studio','#survival','#shuffle','#ranked']
def t_overflow(b):
    bad=[];errs=[]
    member(b,'#home');time.sleep(2)
    for r in ROUTES:
        b.d.get(BASE+'/index.html'+r);time.sleep(2.2)
        w=b.js('return [document.documentElement.scrollWidth,innerWidth,document.getElementById("view").children.length]')
        if w[0]>w[1]+1:bad.append('%s scrollWidth %d > %d'%(r,w[0],w[1]))
        e=b.errors()
        if e:errs.append(r+': '+e[0][:100])
        b.js('window.__errors=[]')
    need(not bad,'horizontal overflow on: '+'; '.join(bad))
    need(not errs,'console errors on: '+'; '.join(errs))
S.run('layout audit: no horizontal overflow and no console errors on %d routes'%len(ROUTES),t_overflow)
print(S.done())
