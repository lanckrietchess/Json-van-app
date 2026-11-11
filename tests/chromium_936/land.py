EXTRA={'rpc/lc69_member_count':'{"ok":true,"members":1234}','rpc/lc69_landing_public':'{"ok":true,"values":{}}'}
async def run(pg,ctx,chk):
    await pg.goto('http://localhost:8765/index.html');await pg.wait_for_timeout(2500)
    await pg.screenshot(path='/home/claude/w/shots/land_top.png',full_page=False)
    el=await pg.query_selector('#price-contrast'); await el.screenshot(path='/home/claude/w/shots/land_contrast.png')
    t=await pg.evaluate("document.querySelector('#price-contrast').innerText")
    chk('contrast has no 199.50','199.50' not in t and '199,50' not in t)
    chk('contrast shows 16.63 per month (billed yearly)','€16.63 per month (billed yearly)' in t.replace('\n',' '))
    chk('hero hook gone',await pg.evaluate("!document.querySelector('#h-hook')&&!/Stop guessing/.test(document.querySelector('.hero').innerText)"))
    chk('story h2 present',await pg.evaluate("document.querySelector('.hero h2').textContent"))
    chk('story no box',await pg.evaluate("getComputedStyle(document.querySelector('#story-t')).borderTopWidth+' '+getComputedStyle(document.querySelector('#story-t')).backgroundColor"))
    sw=await pg.evaluate("document.documentElement.scrollWidth");chk('no hscroll',sw<=pg.viewport_size['width'],sw)
