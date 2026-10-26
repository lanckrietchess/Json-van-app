import postgres from 'postgres';
import http from 'node:http';
import { makeHandler } from '../out/handler.js';
import { PG_TYPES } from '../out/db.js';
const sql = postgres({ host: '127.0.0.1', username: 'postgres', database: 'lc26a', max: 4, types: PG_TYPES, onnotice: () => {} });
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };
/* a stand-in for Supabase Storage: the documented endpoints for signed upload, signed download, HEAD and delete */
const store = new Map(), tokens = new Map(); let failDelete = false, calls = [];
const SERVICE = 'service-role-key-service-role-key';
const mock = http.createServer((req, res) => { const chunks = []; req.on('data', (d) => chunks.push(d)); req.on('end', () => {
  const body = Buffer.concat(chunks), u = new URL(req.url, 'http://x'), p = decodeURIComponent(u.pathname); calls.push(req.method + ' ' + p);
  const send = (st, o, h) => { res.writeHead(st, Object.assign({ 'content-type': 'application/json' }, h || {})); res.end(typeof o === 'string' || Buffer.isBuffer(o) ? o : JSON.stringify(o)); };
  const authed = req.headers.authorization === 'Bearer ' + SERVICE && req.headers.apikey === SERVICE;
  let m;
  if ((m = /^\/storage\/v1\/object\/upload\/sign\/([^/]+)\/(.+)$/.exec(p))) {
    if (req.method === 'POST') { if (!authed) return send(401, { error: 'no' }); const t = 'up_' + Math.random().toString(36).slice(2); tokens.set(t, m[1] + '/' + m[2]); return send(200, { url: `/object/upload/sign/${m[1]}/${m[2].split('/').map(encodeURIComponent).join('/')}?token=${t}` }); }
    if (req.method === 'PUT') { const t = u.searchParams.get('token'); if (tokens.get(t) !== m[1] + '/' + m[2]) return send(403, { error: 'bad token' });
      let data = body; const ct = req.headers['content-type'] || ''; const bm = /boundary=(.+)$/.exec(ct);
      if (bm) { const s = body.toString('latin1'), parts = s.split('--' + bm[1]).filter((x) => /name=""/.test(x)); if (!parts.length) return send(400, { error: 'no file part' }); const seg = parts[0], start = seg.indexOf('\r\n\r\n') + 4; data = Buffer.from(seg.slice(start, seg.length - 2), 'latin1'); }
      store.set(m[1] + '/' + m[2], data); tokens.delete(t); return send(200, { Key: m[1] + '/' + m[2] }); } }
  if ((m = /^\/storage\/v1\/object\/authenticated\/([^/]+)\/(.+)$/.exec(p)) && req.method === 'HEAD') { if (!authed) return send(401, ''); const f = store.get(m[1] + '/' + m[2]); if (!f) return send(404, ''); return send(200, '', { 'content-length': String(f.length), 'content-type': 'video/mp4' }); }
  if ((m = /^\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/.exec(p))) {
    if (req.method === 'POST') { if (!authed) return send(401, { error: 'no' }); const k = m[1] + '/' + m[2]; if (!store.has(k)) return send(400, { error: 'not found' }); const j = JSON.parse(body.toString() || '{}'); return send(200, { signedURL: `/object/sign/${m[1]}/${m[2].split('/').map(encodeURIComponent).join('/')}?token=dl_${j.expiresIn}` }); }
    if (req.method === 'GET') { const f = store.get(m[1] + '/' + m[2]); return f ? send(200, f, { 'content-type': 'video/mp4' }) : send(404, { error: 'nf' }); } }
  if ((m = /^\/storage\/v1\/object\/([^/]+)$/.exec(p)) && req.method === 'DELETE') { if (!authed) return send(401, { error: 'no' }); if (failDelete) return send(500, { error: 'boom' }); const j = JSON.parse(body.toString() || '{}'); (j.prefixes || []).forEach((x) => store.delete(m[1] + '/' + x)); return send(200, []); }
  send(404, { error: 'nf ' + p }); }); }).listen(8805);
const S = 'admin-token-admin-token';
const env = { PID_SALT: 'salt-salt-salt-salt', ADMIN_TOKEN: S, TOKENS_FREE_BOOST_DAYS: '0', STORAGE_API_BASE: 'http://127.0.0.1:8805', SUPABASE_SERVICE_ROLE_KEY: SERVICE };
const mk = (e) => { const h = makeHandler(sql, Object.assign({}, env, e || {})); return async (action, body) => { const r = await h(new Request('https://x.test/', { method: 'POST', headers: { Origin: 'https://lanckrietchess-app.vercel.app', 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ action }, body)) })); return Object.assign({ status: r.status }, await r.json()); }; };
const call = mk();
await sql.unsafe('truncate arena.players, arena.quota, arena.lc27_groups, arena.lc35_content cascade');
const bytes = Buffer.from('FAKEVIDEO'.repeat(500));
const upload = async (u, data) => { const fd = new FormData(); fd.append('cacheControl', '3600'); fd.append('', new Blob([data])); const r = await fetch(u.url, { method: 'PUT', body: fd }); return r.status; };
const A = { device: 'creator-device-aaaa-1' }, B = { device: 'creator-device-bbbb-2' }, ADM1 = { device: 'admin-device-cccc-3', secret: S }, ADM2 = { device: 'admin-device-dddd-4', secret: S }, X = { device: 'stranger-device-eeee-5' };
const pidOf = async (d) => (await call('hello', d)).pid;

console.log('A. who may use it');
let r = await call('content_list', X); ok(r.status === 403 && r.reason === 'forbidden', 'a stranger is refused (403)');
r = await call('content_begin', Object.assign({ title: 'x', mime: 'video/mp4', bytes: 10 }, X)); ok(r.status === 403, 'and cannot start an upload');
await sql.unsafe("insert into arena.lc27_groups (pid, grp) values ($1, 'creators'), ($2, 'creators')", [await pidOf(A), await pidOf(B)]);
r = await call('content_list', A); ok(r.ok && r.items.length === 0 && r.usage.maxItems === 80 && r.usage.maxBytes === 900 * 1048576, 'a creator (group "creators") gets an empty library with the limits (80 items, 900 MB)');
r = await call('content_list', ADM1); ok(r.ok && r.admin === true, 'the admin gets in with the secret');
r = await call('content_list', Object.assign({ device: 'x-device-ffff-6', secret: 'wrong-secret-wrong-secret' }, {})); ok(r.status === 403, 'a wrong admin secret is just a stranger');

console.log('B. upload: begin, send the file, commit');
r = await call('content_begin', Object.assign({ title: 'Caro-Kann trap', fmt: '9:16', variant: 'Variant A', mime: 'video/mp4', bytes: bytes.length, platforms: { tiktok: 'orange', instagram: 'red', facebook: 'red', youtube: 'orange' }, meta: { cta: 'TikTok bio link' } }, A));
ok(r.ok && /^ct_[0-9a-f]{12}$/.test(r.id) && /\/object\/upload\/sign\/creator-content\//.test(r.upload.url) && /\?token=up_/.test(r.upload.url), 'begin returns an item id and a signed upload URL for the private bucket');
ok(/caro-kann-trap-variant-a\.mp4$/.test(r.upload.path) && r.upload.path.startsWith((await pidOf(A)) + '/' + r.id + '/'), 'the file lives under owner/id/ with a safe name');
const id1 = r.id, up1 = r.upload;
r = await call('content_list', A); ok(r.items.length === 0, 'an upload that is not finished is not in the library');
r = await call('content_commit', Object.assign({ id: id1 }, A)); ok(r.status === 409 && r.reason === 'upload_missing', 'commit before the file arrived: upload_missing');
ok((await upload({ url: up1.url.replace('token=up_', 'token=bad_') }, bytes)) === 403, 'the storage refuses a wrong token');
ok((await upload(up1, bytes)) === 200, 'the browser sends the file straight to the signed URL');
r = await call('content_commit', Object.assign({ id: id1 }, A));
ok(r.ok && r.item.state === 'ready' && r.item.bytes === bytes.length && r.item.variant === 'Variant A' && r.item.meta.cta === 'TikTok bio link', 'commit confirms the real size from storage (' + (r.item && r.item.bytes) + ' bytes) and keeps the metadata');
ok(r.item.platforms.tiktok === 'orange' && r.item.platforms.instagram === 'red', 'platform statuses were stored (TikTok to do, Instagram skip)');
r = await call('content_list', A); ok(r.items.length === 1 && r.usage.items === 1 && r.usage.bytes === bytes.length, 'now it is in the library and counted in the usage');
r = await call('content_list', B); ok(r.items.length === 0, 'another creator does not see it');
r = await call('content_commit', Object.assign({ id: id1 }, B)); ok(r.status === 404, 'and cannot touch it (404, not 403: no hint it exists)');

console.log('C. validation and limits');
const bad = async (o, st, why) => { const x = await call('content_begin', Object.assign({ title: 'T', mime: 'video/mp4', bytes: 100 }, o, A)); ok(x.status === st, why + ' (' + x.status + (x.reason ? ' ' + x.reason : '') + ')'); };
await bad({ title: '' }, 400, 'no title'); await bad({ mime: 'image/png' }, 400, 'only video files'); await bad({ mime: 'application/x-msdownload' }, 400, 'no executables'); await bad({ bytes: 0 }, 400, 'zero bytes');
await bad({ bytes: 60 * 1048576 }, 413, 'over the 50 MB file limit');
const small = mk({ CONTENT_MAX_ITEMS: '2', CONTENT_MAX_MB: '10' });
r = await small('content_begin', Object.assign({ title: 'Big', mime: 'video/mp4', bytes: 11 * 1048576 }, A)); ok(r.status === 409 && r.reason === 'limit_bytes' || r.status === 413, 'a library over its size limit is refused');
const two = mk({ CONTENT_MAX_ITEMS: '2' });
const b2 = await two('content_begin', Object.assign({ title: 'Second', mime: 'video/webm', bytes: 100 }, A)); ok(b2.ok, 'second item (limit 2)');
r = await two('content_begin', Object.assign({ title: 'Third', mime: 'video/mp4', bytes: 100 }, A)); ok(r.status === 409 && r.reason === 'limit_items', 'third item: limit_items');
await sql.unsafe("delete from arena.lc35_content where id = $1", [b2.id]);

console.log('D. status updates');
r = await call('content_update', Object.assign({ id: id1, platforms: { tiktok: 'green', youtube: 'purple', facebook: 'green' } }, A));
ok(r.ok && r.item.platforms.tiktok === 'green' && r.item.platforms.facebook === 'green' && r.item.platforms.youtube === 'orange' && r.item.platforms.instagram === 'red', 'valid statuses are saved; an invalid one keeps its old value; the rest are untouched');
r = await call('content_update', Object.assign({ id: id1, platforms: { youtube: 'green' } }, B)); ok(r.status === 404, 'another creator cannot change them');
r = await call('content_update', Object.assign({ id: 'nope' }, A)); ok(r.status === 400, 'a bad id is a 400');

console.log('E. download links');
r = await call('content_url', Object.assign({ ids: [id1, 'ct_000000000000', 'junk'] }, A));
ok(r.ok && Object.keys(r.urls).join() === id1 && /\/storage\/v1\/object\/sign\/creator-content\/.+\?token=dl_86400$/.test(r.urls[id1].url) && r.urls[id1].exp > Date.now() + 80000e3 - 1e9, 'a signed URL valid for 24 h, only for my own existing item');
const got = await fetch(r.urls[id1].url); ok(got.status === 200 && (await got.arrayBuffer()).byteLength === bytes.length, 'the URL serves the file');
r = await call('content_url', Object.assign({ ids: [id1] }, B)); ok(Object.keys(r.urls).length === 0, 'another creator gets no URL for it');

console.log('F. the Trash rule is enforced by the server');
r = await call('content_delete', Object.assign({ id: id1 }, A)); ok(r.status === 409 && r.reason === 'not_resolved' && r.pending.join() === 'youtube', 'YouTube is still orange: delete refused (pending: youtube)');
ok(store.size === 1, 'and the file is untouched');
await call('content_update', Object.assign({ id: id1, platforms: { youtube: 'red' } }, A));
failDelete = true; r = await call('content_delete', Object.assign({ id: id1 }, A)); ok(r.status === 502 && r.reason === 'storage_error', 'if the storage fails, the delete is reported and the project is kept');
ok((await call('content_list', A)).items.length === 1 && store.size === 1, 'nothing was half-deleted (row and file both still there)');
failDelete = false; r = await call('content_delete', Object.assign({ id: id1 }, A));
ok(r.ok && store.size === 0 && (await call('content_list', A)).items.length === 0 && r.usage.items === 0, 'all statuses red or green: the file and the row are gone, usage back to 0');
r = await call('content_delete', Object.assign({ id: id1 }, A)); ok(r.status === 404, 'deleting twice: 404');
const g = await call('content_begin', Object.assign({ title: 'All skipped', mime: 'video/mp4', bytes: 50, platforms: { tiktok: 'red', instagram: 'red', facebook: 'red', youtube: 'red' } }, A)); await upload(g.upload, Buffer.from('x'.repeat(50))); await call('content_commit', Object.assign({ id: g.id }, A));
r = await call('content_delete', Object.assign({ id: g.id }, A)); ok(r.ok, 'a project with every platform on "do not post" can be cleared');

console.log('G. unfinished uploads and the shared admin library');
const u = await call('content_begin', Object.assign({ title: 'Half', mime: 'video/mp4', bytes: 100 }, A));
r = await call('content_delete', Object.assign({ id: u.id }, A)); ok(r.ok, 'an unfinished upload can always be cancelled (no status rule)');
const u2 = await call('content_begin', Object.assign({ title: 'Stale', mime: 'video/mp4', bytes: 100 }, A)); await upload(u2.upload, Buffer.from('y'.repeat(100)));
await sql.unsafe("update arena.lc35_content set created = $1 where id = $2", [Date.now() - 2 * 36e5, u2.id]);
await call('content_list', A); ok((await sql.unsafe('select count(*)::int c from arena.lc35_content where id = $1', [u2.id]))[0].c === 0 && ![...store.keys()].some((k) => k.includes(u2.id)), 'an upload nobody finished within an hour is swept away, file included');
const ad = await call('content_begin', Object.assign({ title: 'Admin short', mime: 'video/mp4', bytes: 20, platforms: { tiktok: 'green', instagram: 'green', facebook: 'green', youtube: 'green' } }, ADM1)); await upload(ad.upload, Buffer.from('z'.repeat(20))); await call('content_commit', Object.assign({ id: ad.id }, ADM1));
r = await call('content_list', ADM2); ok(r.items.length === 1 && r.items[0].title === 'Admin short', 'the admin sees the same library from a second device');
r = await call('content_list', A); ok(r.items.length === 0, 'creators never see the admin library');
const off = mk({ SUPABASE_SERVICE_ROLE_KEY: '' }); r = await off('content_begin', Object.assign({ title: 'T', mime: 'video/mp4', bytes: 10 }, ADM1)); ok(r.status === 503 && r.reason === 'storage_off', 'without storage keys: storage_off, and no row is left behind');
ok((await sql.unsafe("select count(*)::int c from arena.lc35_content where title = 'T'"))[0].c === 0, 'checked: no orphan row');
console.log(`\n${pass} passed, ${fail} failed`); mock.close(); await sql.end();
