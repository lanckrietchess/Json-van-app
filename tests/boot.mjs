import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
const nm = (p) => fs.readFileSync(new URL('./node_modules/' + p, import.meta.url), 'utf8');
export async function boot(htmlPath, opts = {}) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  const libs = {
    jquery: nm('jquery/dist/jquery.min.js'),
    chess: nm('chess.js/chess.js'),
    board: nm('@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js'),
  };
  html = html.replace(/<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/jquery[^>]*><\/script>/, () => '<script>' + libs.jquery + '</script>')
             .replace(/<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/chess\.js[^>]*><\/script>/, () => '<script>' + libs.chess + '</script>')
             .replace(/<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/chessboard-js[^>]*><\/script>/, () => '<script>' + libs.board + '</script>')
             .replace(/<link[^>]*rel="stylesheet"[^>]*>/g, '');
  const errors = [], logs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail && e.detail.message || e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ').slice(0, 300)));
  vc.on('log', (...a) => logs.push(a.map(String).join(' ').slice(0, 200)));
  const content = opts.content || '{}';
  const calls = [];
  const dom = new JSDOM(html, {
    url: opts.url || 'https://lanckrietchess-app.vercel.app/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.crypto.getRandomValues = (a) => webcrypto.getRandomValues(a);
      try { Object.defineProperty(w.crypto, 'subtle', { value: webcrypto.subtle, configurable: true }); } catch (e) {}
      w.matchMedia = w.matchMedia || ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
      w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
      w.ResizeObserver = w.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
      w.IntersectionObserver = w.IntersectionObserver || class { observe() {} unobserve() {} disconnect() {} };
      w.fetch = async (url, init) => {
        const u = String(url); calls.push({ url: u, init });
        if (opts.fetch) { const r = await opts.fetch(u, init); if (r) return r; }
        if ((/raw\.githubusercontent\.com/.test(u) || /\/(content\.json|json)(\?|$)/.test(u)) && !/notes|alts|short/.test(u)) return new Response(content, { status: 200, headers: { 'content-type': 'application/json' } });
        return new Response('{}', { status: 404 });
      };
      if (opts.pre) opts.pre(w);
    },
  });
  await new Promise((r) => setTimeout(r, opts.wait || 2500));
  return { dom, w: dom.window, errors, logs, calls, ev: (code) => dom.window.eval(code) };
}
