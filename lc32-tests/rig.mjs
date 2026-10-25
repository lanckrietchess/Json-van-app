import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const nm = (p) => fs.readFileSync(new URL('./node_modules/' + p, import.meta.url));
export const ORIGIN = 'https://lanckrietchess-app.vercel.app';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function start(htmlPath, opts = {}) {
  const html = fs.readFileSync(htmlPath);
  const sw = fs.readFileSync(opts.sw || '/home/claude/build/sw.v9.8.0.js');
  const browser = await puppeteer.launch({
    args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required','--hide-scrollbars'],
    executablePath: await chromium.executablePath(), headless: 'shell' });
  const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  const ok = (req, body, type) => req.respond({ status: 200, headers: { ...CORS, 'content-type': type }, body });
  const net = [];
  async function route(req) {
    const u = new URL(req.url()), full = req.url();
    try {
      if (u.origin === ORIGIN) {
        if (['/', '/index.html', '/studio'].includes(u.pathname)) return ok(req, html, 'text/html; charset=utf-8');
        if (u.pathname === '/sw.js') return req.respond({ status: 404, body: '' });
        if (u.pathname === '/content.json' || u.pathname === '/json') return ok(req, opts.content || '{}', 'application/json');
        if (u.pathname.startsWith('/engine/')) { const f = u.pathname.slice(8); return ok(req, nm('stockfish/bin/' + f), f.endsWith('.wasm') ? 'application/wasm' : 'text/javascript'); }
        return req.respond({ status: 404, headers: CORS, body: 'nf' });
      }
      if (/cdn\.jsdelivr\.net\/npm\/stockfish@19/.test(full)) { const f = u.pathname.split('/').pop(); return ok(req, nm('stockfish/bin/' + f), f.endsWith('.wasm') ? 'application/wasm' : 'text/javascript'); }
      if (/jquery/.test(full)) return ok(req, nm('jquery/dist/jquery.min.js'), 'text/javascript');
      if (/chess\.js\/0\.10\.3/.test(full)) return ok(req, nm('chess.js/chess.js'), 'text/javascript');
      if (/chessboard-js.*\.js/.test(full)) return ok(req, nm('@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js'), 'text/javascript');
      if (/chessboard-js.*\.css/.test(full)) return ok(req, nm('@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.css'), 'text/css');
      if (opts.external) { const r = await opts.external(req, full, u, CORS); if (r !== undefined) return r; }
      if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: CORS });
      net.push(full.slice(0, 100));
      if (/supabase\.co/.test(full)) return req.respond({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: '[]' });
      return req.respond({ status: 404, headers: CORS, body: '' });
    } catch (e) { try { await req.respond({ status: 500, headers: CORS, body: 'err' }); } catch (x) {} }
  }
  const rig = { browser, net };
  rig.device = async (seed = {}, o = {}) => {
    const ctx = await browser.createBrowserContext();
    await ctx.overridePermissions(ORIGIN, ['camera', 'microphone']);
    const page = await ctx.newPage();
    await page.setViewport({ width: o.w || 1280, height: o.h || 900, deviceScaleFactor: 1 });
    const errors = [];
    page.on('dialog', (d) => d.dismiss().catch(() => {}));
    page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.message).slice(0, 240)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 240)); });
    await page.setRequestInterception(true); page.on('request', route);
    await page.evaluateOnNewDocument((s) => { if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); for (const k of Object.keys(s)) localStorage.setItem(k, typeof s[k] === 'string' ? s[k] : JSON.stringify(s[k])); } }, seed);
    await page.goto(ORIGIN + (o.path || '/'), { waitUntil: 'domcontentloaded' });
    return { page, ctx, errors, shot: (n) => page.screenshot({ path: '/tmp/shots/' + n + '.png' }) };
  };
  rig.close = () => browser.close();
  return rig;
}
