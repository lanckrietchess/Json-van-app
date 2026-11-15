# lc85 (9.45.0): the in-app funnel (LC85) and the Studio scenes (LC79 9.45.0). Real Chromium, 390x844 and 1280x800.
# Studio: the record bar is a bottom status bar and the stage is fitted ABOVE it (the board is never covered), the record button stays in reach
# after scrolling; Scene 1 (full camera), Scene 2 split / bubble with the board, the live landing page and the app as the input block; crop,
# zoom and pan for the camera and the input; the board as input keeps its squares (size and place only); Classic brings the old layout back.
# Funnel: the 💬 button next to the ?, the feedback sheet (permission unticked), the grace period, the soft and the full upgrade sheet,
# Stripe from the sheet, LC36.support.open stays in the app, the old /#gift link, the token wall with packs, V5Doc keeps v5.lc85.
# Landing: no checkout, no social links in the footer, old price links and Stripe returns go to the app's Upgrades page.
APP='http://127.0.0.1:8765/app.html';LAND='http://127.0.0.1:8765/index.html'
SR="(() => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot && e.shadowRoot.getElementById('stage')); return h ? h.shadowRoot : null; })()"
def st(pg,js): return pg.evaluate("(() => { const R = "+SR+"; if (!R) return 'no studio'; "+js+" })()")
errs=[]
with sync_playwright() as p:
    br=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'])
    for w,hh,mob,tag in [(390,844,True,'phone'),(1280,800,False,'desktop')]:
        c=mkctx(br,w,hh,mob)
        c.grant_permissions(['camera','microphone'],origin='http://127.0.0.1:8765')
        pg=c.new_page();watch(pg,'studio-'+tag)
        pg.goto('http://127.0.0.1:8765/version.json');pg.evaluate("localStorage.setItem('lc26-auth', JSON.stringify({ access_token: 'x', refresh_token: '', exp: Date.now() + 36e5, email: 'lanckrietchess@gmail.com' }))")
        pg.goto(APP+'#studio');pg.wait_for_function("!!("+SR+")",timeout=30000);pg.wait_for_timeout(2500)
        pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())")
        st(pg,"const b = [...R.querySelectorAll('*')].find(x => x.textContent.trim().startsWith('Short / Reel') && x.closest('button,[role=button]')); if (b) b.closest('button,[role=button]').click(); return 1");pg.wait_for_timeout(1800)
        st(pg,"try{LC66.setTab(R,'shoot')}catch(e){};return 1");pg.wait_for_timeout(1200)
        pg.evaluate("window.scrollTo(0,0)");pg.wait_for_timeout(600)
        print(tag+' top: [dock fixed, stage bottom <= dock top, board bottom <= dock top, scene row]:',st(pg,"const d=R.getElementById('lc54-dock').getBoundingClientRect(),s=R.getElementById('stage').getBoundingClientRect(),b=R.querySelector('.layer[data-layer=\"board\"]');const br=b?b.getBoundingClientRect():null;return [getComputedStyle(R.getElementById('lc54-dock')).position, s.bottom<=d.top+1, br?br.bottom<=d.top+1:'no board layer', !!R.getElementById('lc79-scn')]"),flush=True)
        pg.screenshot(path=SHOTS+'/lc85-studio-'+tag+'.png')
        pg.evaluate("window.scrollTo(0, document.body.scrollHeight)");pg.wait_for_timeout(400);pg.evaluate("document.querySelectorAll('.toast').forEach(t => t.remove())")
        print(tag+' record button after scroll [label,h,inside,nothing on top]:',st(pg,"const b = R.getElementById('lc54-rec'); const r = b.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [b.textContent, Math.round(r.height), r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, !!top && top.shadowRoot === R]"),flush=True)
        pg.evaluate("window.scrollTo(0,0)");pg.wait_for_timeout(300)
        def scene(v,src=None):
            if src is None: st(pg,"const s=R.querySelector('[data-s=scene]'); s.value='"+v+"'; s.dispatchEvent(new Event('change',{bubbles:true})); return 1")
            else: st(pg,"const s=R.querySelector('[data-s=src]'); s.value='"+src+"'; s.dispatchEvent(new Event('change',{bubbles:true})); return 1")
            pg.wait_for_timeout(900)
        L="(()=>{const L=window.LanckrietStudio.layout().layers;return [L.camera.on,L.camera.fill,L.camera.shape,L.board.on,+L.board.x.toFixed(3),+L.board.y.toFixed(3),+L.board.w.toFixed(3),+L.board.h.toFixed(3)]})()"
        scene('cam');print(tag+' scene 1 full camera [cam on, fill, shape, board on...]:',pg.evaluate(L),flush=True)
        scene('split');print(tag+' scene 2 split + board:',pg.evaluate(L), st(pg,"return !R.querySelector('[data-s=src]').closest('label').hidden"),flush=True)
        scene(None,'landing');pg.wait_for_timeout(2500)
        print(tag+' input landing [iframe, board off, in-state]:',st(pg,"const f=R.getElementById('lc79-in');const r=f&&f.getBoundingClientRect();return [!!f, !!r&&r.width>40&&r.height>40]"),pg.evaluate(L)[3],pg.evaluate("LC79.inState().kind"),flush=True)
        scene(None,'app');pg.wait_for_timeout(2500)
        print(tag+' input app [iframe src]:',st(pg,"const f=R.querySelector('#lc79-in iframe');return f?f.getAttribute('src').replace(location.origin,''):null"),pg.evaluate("LC79.inState().kind"),flush=True)
        scene('pip');print(tag+' scene 2 pip [camera shape, clip-path cut out]:',pg.evaluate(L)[:3],st(pg,"const f=R.getElementById('lc79-in');return f?f.style.clipPath.slice(0,22):null"),flush=True)
        st(pg,"R.querySelector('[data-s=xf]').click();return 1");pg.wait_for_timeout(400)
        st(pg,"{const p=R.querySelector('#lc79-xf [data-x=param]');p.value='z';p.dispatchEvent(new Event('change',{bubbles:true}));const z=R.querySelector('#lc79-xf [data-x=val]');z.value='200';z.dispatchEvent(new Event('input',{bubbles:true}));}{const p=R.querySelector('#lc79-xf [data-x=param]');p.value='l';p.dispatchEvent(new Event('change',{bubbles:true}));const z=R.querySelector('#lc79-xf [data-x=val]');z.value='10';z.dispatchEvent(new Event('input',{bubbles:true}));}return 1");pg.wait_for_timeout(500)
        print(tag+' crop & zoom on input [panel open, handle, xf, iframe transform]:',st(pg,"return [!R.getElementById('lc79-xf').hidden, !!R.getElementById('lc79-xfh')]"),pg.evaluate("LC79.scene().xf.in"),st(pg,"const f=R.querySelector('#lc79-in iframe');return f?/^translate\\(.*scale\\(/.test(f.style.transform):null"),flush=True)
        st(pg,"const t=R.querySelector('#lc79-xf [data-x=target]');t.value='cam';t.dispatchEvent(new Event('change',{bubbles:true}));{const p=R.querySelector('#lc79-xf [data-x=param]');p.value='z';p.dispatchEvent(new Event('change',{bubbles:true}));const z=R.querySelector('#lc79-xf [data-x=val]');z.value='150';z.dispatchEvent(new Event('input',{bubbles:true}));}return 1");pg.wait_for_timeout(300)
        print(tag+' camera crop/zoom [xf.cam.z, camSrc 1280x720 into 1:1]:',pg.evaluate("LC79.scene().xf.cam.z"),pg.evaluate("LC79.camSrc(1280,720,1,1)"),flush=True)
        scene('split');scene(None,'board');
        st(pg,"const t=R.querySelector('#lc79-xf [data-x=target]');t.value='in';t.dispatchEvent(new Event('change',{bubbles:true}));return 1")
        st(pg,"{const p=R.querySelector('#lc79-xf [data-x=param]');p.value='z';p.dispatchEvent(new Event('change',{bubbles:true}));const z=R.querySelector('#lc79-xf [data-x=val]');z.value='70';z.dispatchEvent(new Event('input',{bubbles:true}));}return 1");pg.wait_for_timeout(600)
        print(tag+' board as input, size 70% [board rect, target, xf.in]:',pg.evaluate(L),pg.evaluate('LC79.scene().target'),pg.evaluate('LC79.scene().xf.in'),flush=True)
        pg.screenshot(path=SHOTS+'/lc85-split-'+tag+'.png')
        scene('classic');print(tag+' classic restored:',pg.evaluate(L),flush=True)
        c.close()
    br.close()

with sync_playwright() as p:
    br=p.chromium.launch()
    c=mkctx(br,390,844,True);pg=c.new_page();watch(pg,'app')
    pg.goto(APP+'#think');pg.wait_for_timeout(3500)
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())");pg.wait_for_timeout(500)
    for r in ['think','trim','openings','system']:
        pg.evaluate("location.hash='#"+r+"'");pg.wait_for_timeout(1300)
        print('fb button on #'+r+' [💬 present, next to ?]:',str(pg.evaluate("(()=>{const b=document.querySelector('#view .lc85-fb');return [!!b, !!(b&&b.previousElementSibling&&b.previousElementSibling.classList.contains('lc29-q'))]})()")))
    pg.evaluate("document.querySelector('#view .lc85-fb').click()");pg.wait_for_timeout(500)
    print('fb sheet [open, title, consent unticked, 5 stars]:',pg.evaluate("(()=>{const s=document.querySelector('.lc85-fbsheet');return [!!s, s&&s.getAttribute('aria-label'), s&&!s.querySelector('input[name=ok]').checked, s&&s.querySelectorAll('[data-lc85-star]').length]})()"))
    pg.evaluate("window.__sub=[];const o=Feedback.submit;Feedback.submit=async x=>{window.__sub.push(x);return {ok:true}};const s=document.querySelector('.lc85-fbsheet');s.querySelector('[data-lc85-star=\"5\"]').click();s.querySelector('textarea[name=msg]').value='The MSPC drills finally made it click';s.querySelector('input[name=ok]').click();s.querySelector('input[name=who]').value='Anna';s.querySelector('form').requestSubmit()");pg.wait_for_timeout(800)
    print('fb sent [category, rating, showcase, message prefix, sheet closed]:',pg.evaluate("(()=>{const x=window.__sub[0]||{};return [x.category,x.rating,x.showcase,String(x.message).slice(0,24),!document.querySelector('.lc85-fbsheet')]})()"))
    # grace period
    print('grace [in grace on day 1, days left, master offer eligible]:',pg.evaluate("[LC85.grace(),LC85.graceLeft(),LC34.funnel.eligible()]"))
    pg.evaluate("window.__go=[];LC36.support.go=u=>window.__go.push(u)")
    pg.evaluate("location.hash='#upgrades'");pg.wait_for_timeout(1200)
    pg.evaluate("document.body.insertAdjacentHTML('beforeend', LC36.support.button('btn-gold'))");pg.evaluate("document.querySelector('body > .lc36-support').click()");pg.wait_for_timeout(2200)
    print('soft upgrade sheet [open, title, VIP folded, scarcity card absent, proof slot]:',pg.evaluate("(()=>{const s=document.querySelector('.lc85-upsheet');return [!!s, s&&s.getAttribute('aria-label'), !!(s&&s.querySelector('details.lc85-more .is-vip')), !(s&&s.querySelector('.lc34-card')), !!(s&&s.querySelector('[data-lc85-proof]'))]})()"))
    pg.evaluate("document.querySelector('.lc85-upsheet [data-lc85-plan=\"monthly\"][data-tier=\"2\"]').click()");pg.wait_for_timeout(2500)
    print('Pro monthly -> Stripe [url]:',pg.evaluate("window.__go.slice(-1)[0]||''"))
    pg.evaluate("Store.set('lc85-force','open')")
    pg.evaluate("document.querySelector('body > .lc36-support').click()");pg.wait_for_timeout(2200)
    print('full upgrade sheet after grace [title, VIP visible, Pro card]:',pg.evaluate("(()=>{const s=document.querySelector('.lc85-upsheet');return [s&&s.getAttribute('aria-label'), !!(s&&s.querySelector('.lc85-plan.is-vip:not(details .is-vip)')), !!(s&&s.querySelector('.lc34-card'))]})()"))
    print('grace switched off on this device:',pg.evaluate("LC85.grace()"))
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())");pg.wait_for_timeout(500)
    print('LC36.support.open(pricing) stays in the app [upgrade sheet, no new window]:',pg.evaluate("(()=>{let w=0;const o=window.open;window.open=()=>{w++};LC36.support.open('pricing');window.open=o;return new Promise(r=>setTimeout(()=>r([!!document.querySelector('.lc85-upsheet'),w]),2200))})()"))
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())");pg.wait_for_timeout(500)
    print('old /#gift link opens the in-app gift sheet:',pg.evaluate("(()=>{document.body.insertAdjacentHTML('beforeend','<a id=\"gx\" href=\"/#gift\">g</a>');document.getElementById('gx').click();return new Promise(r=>setTimeout(()=>r([!!document.querySelector('.lc85-giftsheet'),location.pathname]),600))})()"))
    pg.evaluate("document.querySelectorAll('.sheet-wrap [data-close]').forEach(b => b.click())");pg.wait_for_timeout(500)
    print('token wall [shown, packs inside]:',pg.evaluate("(()=>{Credits.balance=()=>0;const r=LC81.tokens.wall();return new Promise(res=>setTimeout(()=>res([r,document.querySelectorAll('.lc81-tok .lc85-pack').length]),300))})()"))
    pg.evaluate("document.querySelector('.lc81-tok .lc85-pack').click()");pg.wait_for_timeout(600)
    print('pack without a signed-in email opens the shop:',pg.evaluate("!!document.querySelector('.lc44-sheet')"))
    print('pure inGrace [day 1 of 3, day 4 of 3, off]:',pg.evaluate("[LC85._t.inGrace(0,864e5,3),LC85._t.inGrace(0,4*864e5,3),LC85._t.inGrace(0,1,0)]"))
    print('v5.lc85 survives V5Doc.clean:',pg.evaluate("JSON.stringify(V5Doc.clean({lc85:{graceDays:'5',fbOn:false,evil:1}}).lc85)"))
    c.close()
    # landing
    c=mkctx(br,390,844,True);pg=c.new_page();watch(pg,'landing')
    pg.goto(LAND);pg.wait_for_timeout(1500)
    print('landing [pricing section, plan buttons, pack buttons, social links in footer, install buttons, founding banner text]:',pg.evaluate("[!!document.getElementById('pricing'),document.querySelectorAll('[data-plan]').length,document.querySelectorAll('[data-pack]').length,document.querySelectorAll('footer a[href*=\"instagram\"],footer a[href*=\"youtube\"]').length,document.querySelectorAll('[data-install]').length,(document.getElementById('lock-guarantee')||{}).textContent.slice(0,26)]"))
    print('landing overflow-x:',pg.evaluate("Math.max(0,document.documentElement.scrollWidth-innerWidth)"))
    for u in ['/#pricing','/#tokens','/?paid=cancel','/?paid=cs_test_1234567890']:
        pg.goto('http://127.0.0.1:8765'+u);pg.wait_for_timeout(1500);print('redirect '+u+':',pg.url.replace('http://127.0.0.1:8765',''))
    c.close();br.close()
mod = open(REPO + '/lc85.js', encoding='utf-8').read().strip(); m79 = open(REPO + '/lc79.js', encoding='utf-8').read().strip(); app = open(REPO + '/app.html', encoding='utf-8').read()
print('LC85 [embedded copies equal lc85.js and lc79.js]:', [mod in app, m79 in app], flush=True)
bad = [e for e in errs if 'PAGEERROR' in e]
print('ERRORS', len(bad)); [print(' ', e[:300]) for e in bad][:8]
