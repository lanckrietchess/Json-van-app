import time,json,os
from ff import *
b=FF()
try:
    b.fresh('#home')
    b.wait_js('document.querySelector("[data-lc25-start]")',20)
    b.click('[data-lc25-start]');time.sleep(0.8)
    b.click('[data-p="youtube"]');b.click('[data-next]');time.sleep(0.4)
    b.click('[data-next]');time.sleep(0.4)
    b.click('[data-pain] [data-k="threats"]');b.click('[data-next]');time.sleep(0.5)
    b.click('[data-mspc] [data-k="yes"]');b.click('[data-next]');time.sleep(1.2)
    b.click('[data-skip]');time.sleep(1.5)
    # close whatever scan sheet the old flow opened
    for _ in range(3):
        if b.exists('.sheet-wrap [data-close], .sheet-wrap .sheet-close, .sheet-wrap [aria-label="Close"]'):
            try:b.click('.sheet-wrap [data-close], .sheet-wrap .sheet-close, .sheet-wrap [aria-label="Close"]')
            except Exception:pass
            time.sleep(.6)
    st=b.js('var o={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);o[k]=localStorage.getItem(k)}return o')
    print('keys:',sorted(st.keys()))
    st['lc19-sw']=json.dumps({"on":False,"level":4,"base":0,"t0":0})
    json.dump(st,open(STATE,'w'))
    print('saved',len(json.dumps(st)),'bytes; onboarded flag in app state:',[k for k,v in st.items() if '"onboarded":true' in v or 'onboarded' in v][:3])
finally:b.quit()
