import re,sys
src=open('index.v9.2.0.html',encoding='utf-8').read()
s=src
def once(a,b,label):
    global s
    n=s.count(a)
    if n!=1: sys.exit(f"PATCH FAILED [{label}]: anchor found {n}x")
    s=s.replace(a,b)
    print("ok",label)

# 1. StageRunner: engine-checked alternatives for puzzle stages
once('''if(first){App.score(section,false);results[at]=false;renderSteps()}board.mark(mv.to,"hl-bad");board.setInteractive(null);Sound.bad();part("feedback").innerHTML=feedbackHTML({v:bad?"bad":"off",label:bad?"Not here":"Not the move",san:mv.san,text:bad||"That is not the idea of this structure. Read the plan again and try another move."});later(()=>{board.unmark("hl-bad");board.setPosition(d.fen,{lastMove:lastMove});board.setInteractive(side)},1600)}function hint(){''',
'''const rej=()=>{if(first){App.score(section,false);results[at]=false;renderSteps()}board.mark(mv.to,"hl-bad");board.setInteractive(null);Sound.bad();part("feedback").innerHTML=feedbackHTML({v:bad?"bad":"off",label:bad?"Not here":"Not the move",san:mv.san,text:bad||"That is not the idea of this structure. Read the plan again and try another move."});later(()=>{board.unmark("hl-bad");board.setPosition(d.fen,{lastMove:lastMove});board.setInteractive(side)},1600)};if(!bad&&typeof LC25!=="undefined"&&LC25.alt.wants(section,s)){const stAt=at;board.setInteractive(null);part("feedback").innerHTML=feedbackHTML({v:"hint",label:"Checking",san:mv.san,text:"Asking the engine whether that also works."});LC25.alt.check({fen:d.fen,from:mv.from,to:mv.to,promotion:mv.promotion||"",san:mv.san}).then(r=>{if(at!==stAt||done[at])return;if(r&&(r.tier==="full"||r.tier==="mostly")){if(first)App.score(section,true);board.mark(mv.to,"hl-good");part("feedback").innerHTML=feedbackHTML({v:"alt",label:r.label||(r.tier==="full"?"Also good":"Playable, not the best"),san:mv.san,text:r.text});Sound.good();complete(first?true:results[at])}else rej()}).catch(()=>{if(at===stAt&&!done[at])rej()});return}rej()}function hint(){''','stage-alt')

# 2. Puzzle Runner (solution_moves puzzles): same check; an accepted alternative ends the puzzle like a mate does
once('''mistakes++;if(clean1){score(false);try{V33.miss(p.id,section,idx,mv.san);''',
'''const rej=()=>{locked=false;mistakes++;if(clean1){score(false);try{V33.miss(p.id,section,idx,mv.san);''','runner-open')
# find the end of that tail: it ends with "board.shake();emit()}function hint(){" right after the Not the move feedback
tail='''board.setPosition(g.fen(),{lastMove:lastOf()});board.shake();emit()}function hint(){if(finished||locked||idx>=sol.length||g.turn()!==side)return;const e=split(sol[idx]);'''
once(tail,'''board.setPosition(g.fen(),{lastMove:lastOf()});board.shake();emit()};if(typeof LC25!=="undefined"&&LC25.alt.wants(section||"endgame",null)){const at=idx;locked=true;board.setPosition(t.fen(),{lastMove:{from:mv.from,to:mv.to}});feedback={v:"hint",label:"Checking",san:mv.san,text:"Asking the engine whether that also works."};emit();LC25.alt.check({fen:pre,from:mv.from,to:mv.to,promotion:mv.promotion||"",san:mv.san}).then(r=>{if(finished||idx!==at)return;if(r&&(r.tier==="full"||r.tier==="mostly")){locked=false;if(clean1){clean++;score(true)}g=t;idx=sol.length;played.push({san:mv.san,color:mv.color,num:num,from:mv.from,to:mv.to,verdict:clean1?"good":"fixed"});feedback={v:"alt",label:r.label||(r.tier==="full"?"Also good":"Playable, not the best"),san:mv.san,text:r.text};Sound.good();board.setPosition(g.fen(),{lastMove:{from:mv.from,to:mv.to}});step(false);if(finished&&feedback){feedback=Object.assign({},feedback,{text:(feedback.text?feedback.text+" ":"")+((r.label||"Also good")+": ")+r.text});emit()}}else rej()}).catch(()=>{if(!finished&&idx===at)rej()});return}rej()}function hint(){if(finished||locked||idx>=sol.length||g.turn()!==side)return;const e=split(sol[idx]);''','runner-close')

# 3. onboarding: after the 4 steps, the redemption flow takes over (it falls back to the old scan itself)
once('later(()=>openGames({first:true}),320)','later(()=>{if(typeof LC25!=="undefined"&&LC25.onb.afterOnboarding({cc:S.cc,li:S.li}))return;openGames({first:true})},320)','onb-finish')

# 4. tilt: modal with 5 focus puzzles instead of the banner (banner stays as the fallback)
i=s.index('banner("tilt","warn","Are you tilted?"')
endm='["tilt-fine","I\\u2019m fine"]]);'
j=s.index(endm,i)+len(endm)
old=s[i:j]
new='if(!(typeof LC25!=="undefined"&&LC25.tilt.offer(t))){'+old+'}'
s=s[:i]+new+s[j:]
print("ok tilt")

# 5. Wrapped: audio recap button + click
once('''<button class="btn btn-ghost" type="button" data-w="save">Save image</button></div>':''','''<button class="btn btn-ghost" type="button" data-w="save">Save image</button><button class="btn btn-ghost" type="button" data-w="audio">Audio recap (45s)</button></div>':''','wrapped-btn')
once('''const b=e.target.closest("[data-w]");if(!b||!el._w)return;''','''const b=e.target.closest("[data-w]");if(!b||!el._w)return;if(b.getAttribute("data-w")==="audio"){if(typeof LC25!=="undefined")LC25.recap.play(el._w);return}''','wrapped-click')

# 5a. Pillar 2: the feedback box can carry an MSPC note; the drill runner attaches one after a correct move (Learn mode is wrapped in LC25.init)
once('(fb.text?"<p>"+esc(fb.text)+"</p>":"")+"</div>"}function debriefHTML(','(fb.text?"<p>"+esc(fb.text)+"</p>":"")+(fb.mspc&&typeof LC25!=="undefined"?LC25.notes.html(fb.mspc,fb.mspcOpen):"")+"</div>"}function debriefHTML(','feedback-mspc')
once('text:n.note||PRAISE[Math.floor(Math.random()*PRAISE.length)]};Sound.good();play(p,clean1?"good":"fixed");step(false);return}','text:n.note||PRAISE[Math.floor(Math.random()*PRAISE.length)]};if(typeof LC25!=="undefined")feedback=LC25.notes.attach(feedback,g.fen(),p.san,false);Sound.good();play(p,clean1?"good":"fixed");step(false);return}','drill-mspc')

# 5c. Pillar 2: the endgame/middlegame puzzle runner attaches the note after a correct solver move
once('text:n||PRAISE[Math.floor(Math.random()*PRAISE.length)]};Sound.good();if(mates&&!exact){','text:n||PRAISE[Math.floor(Math.random()*PRAISE.length)]};if(typeof LC25!=="undefined")feedback=LC25.notes.attach(feedback,pre,mv.san,false);Sound.good();if(mates&&!exact){','runner-mspc')

# 5d. Pillar 2: the "Line complete" / "Solved" summary keeps the note of the final move (it used to be replaced before anyone saw it)
once('function finish(){finished=true;locked=false;board.setInteractive(null);const acc=total?clean/total:1;if(learn){','function finish(){const _pm=feedback&&feedback.mspc?{mspc:feedback.mspc,mspcOpen:false}:null;finished=true;locked=false;board.setInteractive(null);const acc=total?clean/total:1;if(learn){','finish-line-open')
once('(lastNote||"")};Sound.done();emit();if(cfg.onFinish)cfg.onFinish({accuracy:acc,clean:clean,total:total})}','(lastNote||"")};if(_pm)feedback=Object.assign({},feedback,_pm);Sound.done();emit();if(cfg.onFinish)cfg.onFinish({accuracy:acc,clean:clean,total:total})}','finish-line-close')
once('function finish(){if(finished)return;finished=true;locked=false;board.setInteractive(null);const acc=total?clean/total:1,perfect=','function finish(){if(finished)return;const _pm=feedback&&feedback.mspc?{mspc:feedback.mspc,mspcOpen:false}:null;finished=true;locked=false;board.setInteractive(null);const acc=total?clean/total:1,perfect=','finish-eg-open')
once('(p.principle?" "+p.principle:"")};Sound.done();emit();if(cfg.onFinish)cfg.onFinish({accuracy:acc,clean:clean,total:total,perfect:perfect,elo:eloRes})}','(p.principle?" "+p.principle:"")};if(_pm)feedback=Object.assign({},feedback,_pm);Sound.done();emit();if(cfg.onFinish)cfg.onFinish({accuracy:acc,clean:clean,total:total,perfect:perfect,elo:eloRes})}','finish-eg-close')

# 5e. Pillar 2: long texts fold to their first sentences (or a short rewrite) with Read more; one choke point for feedback, three for debriefs
once('(fb.text?"<p>"+esc(fb.text)+"</p>":"")+(fb.mspc&&typeof LC25','(fb.text?(typeof LC25!=="undefined"?LC25.fold.p(fb.text):"<p>"+esc(fb.text)+"</p>"):"")+(fb.mspc&&typeof LC25','fold-feedback')
once('if(typeof debrief==="string")return\'<p class="muted">\'+esc(debrief)+"</p>";','if(typeof debrief==="string")return typeof LC25!=="undefined"?LC25.fold.p(debrief,"muted"):\'<p class="muted">\'+esc(debrief)+"</p>";','fold-debrief-string')
once('"<div><b>"+icon("check")+"</b><p>"+esc(d)+"</p></div>"','"<div><b>"+icon("check")+"</b>"+(typeof LC25!=="undefined"?LC25.fold.p(d):"<p>"+esc(d)+"</p>")+"</div>"','fold-debrief-line')
once('"<div><b>"+esc(d.k||"\u2022")+"</b><p>"+esc(d.t||d.text||"")+"</p></div>"','"<div><b>"+esc(d.k||"\u2022")+"</b>"+(typeof LC25!=="undefined"?LC25.fold.p(d.t||d.text||""):"<p>"+esc(d.t||d.text||"")+"</p>")+"</div>"','fold-debrief-item')

# 5f. Pillar 5: members can switch the tilt check off and on in Settings
once('+sw("srs","Spaced repetition"','+sw("lc25Tilt","Tilt check after losses","When you open the app, I look at your last games on the Chess.com or Lichess username you linked. After 3 losses in a row I offer 5 quick puzzles to clear your head. Nothing is stored.")+sw("srs","Spaced repetition"','settings-tilt-toggle')

# 5g. Pillar 2/7: one coach face (LC19's avatar), the coach on every celebration popup
once('return{start:start,say:say,stop:stop,pause:pause,resume:resume,state:function(){return Object.assign({},st)}','return{avatar:avatarSVG,start:start,say:say,stop:stop,pause:pause,resume:resume,state:function(){return Object.assign({},st)}','coach-avatar-export')
once('<div class="cele-card"><span class="cele-glyph">\'+glyph+"</span>','<div class="cele-card">\'+(typeof LC25!=="undefined"?\'<span class="cele-av lc19-avwrap">\'+LC25.avatarHtml(34)+"</span>":"")+\'<span class="cele-glyph">\'+glyph+"</span>','celebrate-avatar')
# 5h. Settings: the tech theme switch
once('+sw("lc25Tilt","Tilt check after losses"','+sw("lc25Theme","Tech theme","A deeper dark background with sharper blue and gold accents. Off: the classic slate look.")+sw("lc25Tilt","Tilt check after losses"','settings-theme-toggle')

# 5i. ALL ENGLISH: dates and times name an English locale (they used the phone's), the privacy phrase, no page translation
once('new Date(x.last).toLocaleDateString()','new Date(x.last).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})','locale-last-seen')
once('new Date(x.since).toLocaleDateString()','new Date(x.since).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})','locale-since')
once('new Date(l.created_at).toLocaleDateString()','new Date(l.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})','locale-created')
once('new Date(s.lastSync).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})','new Date(s.lastSync).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})','locale-lastsync')
once('new Date(fresh.ends_at).toLocaleString()','new Date(fresh.ends_at).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})','locale-ends')
once('function tok(s){const map={peak:CONFIG.peakRating,start:CONFIG.startRating,percentile:CONFIG.percentile,coach:CONFIG.coach,fasttrack:CONFIG.fastTrack};return String(s==null?"":s).replace(','function tok(s){const map={peak:CONFIG.peakRating,start:CONFIG.startRating,percentile:CONFIG.percentile,coach:CONFIG.coach,fasttrack:CONFIG.fastTrack};const out=String(s==null?"":s).replace(','tok-open')
once('(m,k)=>String(map[k]==null?"":map[k]))}function rawCopy(key)','(m,k)=>String(map[k]==null?"":map[k]));return window.LC25&&window.LC25.english?window.LC25.english.fix(out):out}function rawCopy(key)','tok-close')
once('<html lang="en">','<html lang="en" translate="no">','html-notranslate')
once('<meta charset="utf-8">','<meta charset="utf-8"><meta name="google" content="notranslate">','meta-notranslate')

once('(Gegevensbeschermingsautoriteit / Autorit\u00e9 de protection des donn\u00e9es, www.dataprotectionauthority.be)'.encode().decode('unicode_escape') if False else '(Gegevensbeschermingsautoriteit / Autorité de protection des données, www.dataprotectionauthority.be)','(www.dataprotectionauthority.be)','privacy-authority-default')
# 5j. any locale-less date call that is left (event dates, a coach-note date) also names an English locale; none of them is a storage key
_n0=len(re.findall(r'toLocale(?:Date|Time)?String\(\s*(?:\)|\[\s*\])',s))
s=re.sub(r'toLocaleDateString\(\s*\)','toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})',s)
s=re.sub(r'toLocaleTimeString\(\s*(?:\[\s*\])?\s*\)','toLocaleTimeString("en-GB")',s)
s=re.sub(r'toLocaleString\(\s*\)','toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})',s)
_n1=len(re.findall(r'toLocale(?:Date|Time)?String\(\s*(?:\)|\[\s*\])',s))
assert _n1==0,'locale-less calls remain: %d'%_n1
print("ok locale-generic (%d left over after the specific patches, now 0)"%_n0)

# 5k. Pillar 2: the opening trainer's own Drill mode (a third code path) attaches the note after a correct move too
once('Sound.good();feedback=fb;play(hit,clean1?"good":"fixed");step(false);return}','Sound.good();feedback=typeof LC25!=="undefined"?LC25.notes.attach(fb,cur.fen,hit.san,false):fb;play(hit,clean1?"good":"fixed");step(false);return}','tree-drill-mspc')

# 5b. Admin: the rival link and the ghost goal are editable settings (the existing "Numbers and links" sheet, saved with the content)
once('links:{skool:"https://www.skool.com/lanckriet-chess-1924",mspcCourse:','links:{skool:"https://www.skool.com/lanckriet-chess-1924",rival:"https://www.skool.com/lanckriet-chess-1924",mspcCourse:','cfg-links-rival')
once('["links.skool","Skool community","url"],','["links.skool","Skool community","url"],["links.rival","Rival channel in Skool: where the Get a rival button goes (empty: the Skool community)","url"],','settings-rival')
once('["systemBadges.months","OG window in months after launch (default 12)","num"]]','["systemBadges.months","OG window in months after launch (default 12)","num"],["v25.ghostGoal","Week-one ghost: XP goal for new members (default 600, between 100 and 5000)","num"],["v25.notesUrl","MSPC move notes file (empty: mspc-notes.json next to the course JSON in your GitHub repo)","url"]]','settings-ghost')
once('["System badges",p=>p.indexOf("systemBadges.")===0]','["System badges",p=>p.indexOf("systemBadges.")===0],["Training flow",p=>p.indexOf("v25.")===0]','settings-group')
once('["v25.notesUrl",','["v25.techTheme","Tech theme (deeper dark background, blue and gold accents) for all members; members can still switch it off in Settings","bool"],["v25.puzzleAltsUrl","Puzzle alternatives file (empty: puzzle-alts.json next to the course JSON in your GitHub repo)","url"],["v25.tiltCheck","Tilt check for members with a linked username: look at their last games when they open the app (switch off to stop it for everyone)","bool"],["v25.foldChars","Long course texts: fold after this many characters (default 280, between 120 and 2000; 0 turns folding off)","num"],["v25.shortTextsUrl","Short versions of long texts file (empty: short-texts.json next to the course JSON in your GitHub repo)","url"],["v25.notesUrl",','settings-fold')

# 6. CSS + module + init, then versions
css=open('lc25.css',encoding='utf-8').read().strip()
once('</style>\n<script>"use strict";const SKOOL_URLS','</style>\n<style id="lc25-css">\n'+css+'\n</style>\n<script>"use strict";const SKOOL_URLS','css')
mod=open('lc25.js',encoding='utf-8').read().strip()
once('\n\n(window.LC81&&LC81.cloud&&LC81.cloud.gateBoot?LC81.cloud.gateBoot(boot):boot())</script>','\n\n'+mod+'\ntry{LC25.init()}catch(e){console.error(e)}\n\n(window.LC81&&LC81.cloud&&LC81.cloud.gateBoot?LC81.cloud.gateBoot(boot):boot())</script>','module')

n=s.count('9.2.0'); print('9.2.0 occurrences',n)
s=s.replace('9.2.0','9.3.0')
open('index.html','w',encoding='utf-8').write(s)
sw=open('sw.orig.js',encoding='utf-8').read()
old="filter((k) => !keep.has(k) && !k.startsWith('lc-coach-'))"
assert sw.count(old)==1,'sw anchor'
sw=sw.replace(old,"filter((k) => !keep.has(k) && !k.startsWith('lc-coach-') && !k.startsWith('lc-notes-'))")
sw=sw.replace("They survive releases so a clip is never paid for twice. */","They survive releases so a clip is never paid for twice.\n       lc-notes-*: the saved MSPC move notes (written by the page) so they work offline and survive releases. */")
open('sw.js','w',encoding='utf-8').write(sw)
print('sw.js patched')
import os
if os.path.exists('manifest.webmanifest'):      # the shipped manifest already says 9.3.0; this only matters when starting from the 9.2.0 one
    m=open('manifest.webmanifest',encoding='utf-8').read().replace('9.2.0','9.3.0')
    open('manifest.webmanifest','w',encoding='utf-8').write(m)
print("written",len(src),"->",len(s))
