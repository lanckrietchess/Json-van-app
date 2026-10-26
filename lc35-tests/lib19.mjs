import postgres from '/home/claude/arena/node_modules/postgres/src/index.js';
import http from 'node:http';
import { makeHandler } from '/home/claude/arena/out/handler.js';
import { PG_TYPES } from '/home/claude/arena/out/db.js';
export const ORIGIN = 'https://lanckrietchess-app.vercel.app';
export const SERVICE = 'service-role-key-service-role-key', ADMIN = 'admin-token-admin-token';
export const sql = postgres({ host: '127.0.0.1', username: 'postgres', database: 'lc26a', max: 6, types: PG_TYPES, onnotice: () => {} });
export const store = new Map(), tokens = new Map(); export const st = { failDelete: false, puts: 0 };
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,PUT,POST,DELETE,HEAD,OPTIONS', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-length' };
const mock = http.createServer((req, res) => { const chunks = []; req.on('data', (d) => chunks.push(d)); req.on('end', () => {
  const body = Buffer.concat(chunks), u = new URL(req.url, 'http://x'), p = decodeURIComponent(u.pathname);
  const send = (s, o, h) => { res.writeHead(s, Object.assign({ 'content-type': 'application/json' }, CORS, h || {})); res.end(typeof o === 'string' || Buffer.isBuffer(o) ? o : JSON.stringify(o)); };
  if (req.method === 'OPTIONS') return send(204, '');
  const authed = req.headers.authorization === 'Bearer ' + SERVICE; let m;
  if ((m = /^\/storage\/v1\/object\/upload\/sign\/([^/]+)\/(.+)$/.exec(p))) {
    if (req.method === 'POST') { if (!authed) return send(401, {}); const t = 'up_' + Math.random().toString(36).slice(2); tokens.set(t, m[1] + '/' + m[2]); return send(200, { url: `/object/upload/sign/${m[1]}/${m[2].split('/').map(encodeURIComponent).join('/')}?token=${t}` }); }
    if (req.method === 'PUT') { const t = u.searchParams.get('token'); if (tokens.get(t) !== m[1] + '/' + m[2]) return send(403, {});
      const bm = /boundary=(.+)$/.exec(req.headers['content-type'] || ''); let data = body;
      if (bm) { const b = Buffer.from('--' + bm[1]); let i = body.indexOf(b), parts = []; while (i >= 0) { const j = body.indexOf(b, i + b.length); if (j < 0) break; parts.push(body.subarray(i + b.length, j)); i = j; }
        const fp = parts.find((x) => x.toString('latin1', 0, 200).includes('name=""')); if (!fp) return send(400, {}); const s = fp.indexOf('\r\n\r\n') + 4; data = fp.subarray(s, fp.length - 2); }
      st.puts++; store.set(m[1] + '/' + m[2], data); tokens.delete(t); return send(200, { Key: m[1] + '/' + m[2] }); } }
  if ((m = /^\/storage\/v1\/object\/authenticated\/([^/]+)\/(.+)$/.exec(p)) && req.method === 'HEAD') { const f = store.get(m[1] + '/' + m[2]); return f ? send(200, '', { 'content-length': String(f.length) }) : send(404, ''); }
  if ((m = /^\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/.exec(p))) {
    if (req.method === 'POST') { if (!authed) return send(401, {}); if (!store.has(m[1] + '/' + m[2])) return send(400, {}); return send(200, { signedURL: `/object/sign/${m[1]}/${m[2].split('/').map(encodeURIComponent).join('/')}?token=dl` }); }
    if (req.method === 'GET') { const f = store.get(m[1] + '/' + m[2]); return f ? send(200, f, { 'content-type': 'video/webm', 'content-length': String(f.length) }) : send(404, {}); } }
  if ((m = /^\/storage\/v1\/object\/([^/]+)$/.exec(p)) && req.method === 'DELETE') { if (st.failDelete) return send(500, {}); (JSON.parse(body.toString() || '{}').prefixes || []).forEach((x) => store.delete(m[1] + '/' + x)); return send(200, []); }
  send(404, {}); }); }).listen(8805);
export const closeMock = () => mock.close();
export const arena = (extra) => makeHandler(sql, Object.assign({ PID_SALT: 'salt-salt-salt-salt', ADMIN_TOKEN: ADMIN, TOKENS_FREE_BOOST_DAYS: '0', STORAGE_API_BASE: 'http://127.0.0.1:8805', SUPABASE_SERVICE_ROLE_KEY: SERVICE }, extra || {}));
export function routes(handler, log) {
  return async (req, full, u, C) => {
    if (full.startsWith('http://127.0.0.1:8805/')) { await req.continue(); return true; }          // straight to the mock storage, like a signed URL
    if (/functions\/v1\/arena/.test(full)) {
      if (req.method() === 'OPTIONS') { await req.respond({ status: 204, headers: C }); return true; }
      const body = req.postData() || '{}'; try { log.push(JSON.parse(body).action); } catch (e) {}
      const r = await handler(new Request(full, { method: 'POST', headers: { Origin: ORIGIN, 'content-type': 'application/json' }, body }));
      await req.respond({ status: r.status, headers: Object.assign({}, C, Object.fromEntries(r.headers)), body: await r.text() }); return true; }
    return undefined;
  };
}
export async function prep() { await sql.unsafe('truncate arena.players, arena.quota, arena.lc27_groups, arena.lc35_content cascade'); store.clear(); tokens.clear(); }
export async function makeCreator(h, device) { const r = await h(new Request('https://x.test/', { method: 'POST', headers: { Origin: ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'hello', device }) })); const pid = (await r.json()).pid; await sql.unsafe("insert into arena.lc27_groups (pid, grp) values ($1,'creators') on conflict do nothing", [pid]); return pid; }
