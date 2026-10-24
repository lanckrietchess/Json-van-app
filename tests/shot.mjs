import fs from 'node:fs'; import puppeteer from 'puppeteer-core'; import chromium from '@sparticuz/chromium';
const nm = (p) => fs.readFileSync('./node_modules/' + p);
const APP = fs.readFileSync('/home/claude/lc29/src/index.html'); const CONTENT = fs.readFileSync('/mnt/user-data/uploads/content__35_.json');
const HELP = fs.readFileSync('/home/claude/lc29/out/help.json');
const manifest = JSON.stringify({ categories: { neutral: ['neutral_1.png'], happy: ['happy_1.png', 'happy_2.png'], thinking: [], serious: [], skeptical: [], tough_love: [] } });
const exe = await chromium.executablePath();
const br = await puppeteer.launch({ executablePath: exe, headless: 'shell', args: ['--no-sandbox', '--disable-gpu', '--no-zygote', '--disable-dev-shm-usage'] });
const pg = await br.newPage(); await pg.setViewport({ width: 390, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; pg.on('pageerror', (e) => errs.push(String(e).slice(0, 200))); pg.on('dialog', (d) => d.dismiss());
await pg.setRequestInterception(true);
pg.on('request', (r) => {
  const u = new URL(r.url()), p = u.pathname, ok = (body, type) => r.respond({ status: 200, contentType: type, body, headers: { 'access-control-allow-origin': '*' } });
  if (u.hostname === 'lanckrietchess-app.vercel.app') {
    if (p === '/' || p === '/index.html') return ok(APP, 'text/html');
    if (p === '/assets/help/help.json') return ok(HELP, 'application/json');
    if (p === '/assets/images/coach/manifest.json') return ok(manifest, 'application/json');
    const m = /\/assets\/images\/coach\/\w+\/(\w+)\.png$/.exec(p); if (m && fs.existsSync('./fake/' + m[1] + '.png')) return ok(fs.readFileSync('./fake/' + m[1] + '.png'), 'image/png');
    if (/content\.json|\/json$/.test(p)) return ok(CONTENT, 'application/json');
    return r.respond({ status: 404, body: '' });
  }
  if (/jquery/.test(u.href)) return ok(nm('jquery/dist/jquery.min.js'), 'application/javascript');
  if (/chess\.js/.test(u.href)) return ok(nm('chess.js/chess.js'), 'application/javascript');
  if (/chessboard/.test(u.href)) return ok(nm('@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js'), /css/.test(u.href) ? 'text/css' : 'application/javascript');
  if (/raw\.githubusercontent/.test(u.href)) return ok(CONTENT, 'application/json');
  r.abort();
});
await pg.goto('https://lanckrietchess-app.vercel.app/#about', { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 4500));
const info = await pg.evaluate(() => { const q = document.querySelector('#view .lc29-q'); if (!q) return null; const r = q.getBoundingClientRect(), h = q.closest('h1,h2').getBoundingClientRect(); return { feature: q.dataset.lc29Open, w: r.width, h: r.height, x: Math.round(r.x), y: Math.round(r.y), headingRight: Math.round(h.right), overflowX: document.documentElement.scrollWidth > innerWidth + 1 }; });
console.log('button:', JSON.stringify(info));
await pg.screenshot({ path: 'shot1.png' });
await pg.evaluate(() => document.querySelector('#view .lc29-q').click());
await new Promise((r) => setTimeout(r, 1200));
const sheet = await pg.evaluate(() => { const s = document.querySelector('.lc29-sheet'); if (!s) return null; const r = s.getBoundingClientRect(), im = s.querySelector('.lc29-av-img'); return { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), img: im && im.src.split('/').slice(-2).join('/'), imgW: im && im.naturalWidth, secs: s.querySelectorAll('.lc29-sec').length, overflowX: s.scrollWidth > s.clientWidth + 1 }; });
console.log('sheet:', JSON.stringify(sheet));
await pg.screenshot({ path: 'shot2.png' }); const vis = await pg.evaluate(() => { const b = document.querySelector('[data-lc29-listen]').getBoundingClientRect(); return { listenTop: Math.round(b.top), listenBottom: Math.round(b.bottom), viewport: innerHeight }; }); console.log('listen button:', JSON.stringify(vis));
console.log('page errors:', errs.length ? errs.join(' | ') : 'none');
await br.close();
