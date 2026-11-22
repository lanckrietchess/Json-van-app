#!/usr/bin/env python3
"""Keeps the inline modules equal to their readable root files (9.65.0).
  python3 tools/modsync.py check lc99 lc100     report which inline copies differ from lc99.js / lc100.js
  python3 tools/modsync.py write lc99 lc100     copy the root files into app.html (and index.html for lc87 / lc89 / lc94)
A root file without the /*@@module lcNN*/ markers is wrapped in them. Run it from the repository root."""
import sys
mode=sys.argv[1]; names=sys.argv[2:]
targets={'lc87':['app.html','index.html'],'lc89':['index.html'],'lc94':['app.html','index.html']}
bad=0
for n in names:
    src=open(n+'.js').read().rstrip('\n')
    if not src.startswith('/*@@module'): src='/*@@module '+n+'*/\n'+src+'\n/*@@end '+n+'*/'
    for f in targets.get(n,['app.html']):
        s=open(f).read()
        a=s.find('/*@@module '+n+'*/'); b=s.find('/*@@end '+n+'*/',a)
        if a<0 or b<0: print('MISSING',n,f); bad+=1; continue
        b+=len('/*@@end '+n+'*/')
        cur=s[a:b]
        if cur!=src:
            if mode=='write':
                s=s[:a]+src+s[b:]; open(f,'w').write(s); print('synced',n,'->',f)
            else: print('DIFF',n,f); bad+=1
        else: print('same',n,f)
sys.exit(1 if bad and mode=='check' else 0)
