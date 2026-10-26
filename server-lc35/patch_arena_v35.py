"""LC35: arena.js gets the Content Hub actions (content_list, content_begin, content_commit, content_update, content_url, content_delete).
   python3 patch_arena_v35.py <in arena.js> <out arena.js>      every anchor must match exactly once.
   Access: the admin (secret) or a player in the 'creators' group, the same rule as the Creator Hub. Files: private bucket, signed URLs only.
   Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (both are provided to Edge Functions), CONTENT_BUCKET (creator-content), CONTENT_MAX_ITEMS (80),
        CONTENT_MAX_MB (900, per library), CONTENT_MAX_FILE_MB (50, keep at or below the bucket limit), CONTENT_URL_SECONDS (86400). STORAGE_API_BASE overrides the host (tests)."""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def once(a, b, label):
    global s
    c = s.count(a)
    if c != 1: sys.exit(f"PATCH FAILED [{label}]: anchor found {c}x")
    s = s.replace(a, b); print("ok", label)

once("  async carousel_voice(b, env) { return carouselVoice(b, env); },",
     "  async carousel_voice(b, env) { return carouselVoice(b, env); },\n"
     "  /* LC35: Creator Studio Content Hub. See the block above clientIp(). */\n"
     "  async content_list(b, env) { return lc35List(b, env); },\n"
     "  async content_begin(b, env) { return lc35Begin(b, env); },\n"
     "  async content_commit(b, env) { return lc35Commit(b, env); },\n"
     "  async content_update(b, env) { return lc35Update(b, env); },\n"
     "  async content_url(b, env) { return lc35Urls(b, env); },\n"
     "  async content_delete(b, env) { return lc35Delete(b, env); },", "action entries")

FN = r'''
/* ======================= LC35: Creator Studio Content Hub =======================
   One row per exported short. The video sits in a PRIVATE Storage bucket; only this function (service role) signs the upload and download URLs.
   Platform status per project: red = do not post there, orange = still to do, green = published. A project can only be deleted when no platform is
   orange: the rule is enforced here, not only on the button. */
const LC35_PLATFORMS = ['tiktok', 'instagram', 'facebook', 'youtube'], LC35_STATES = ['red', 'orange', 'green'], LC35_FMT = ['9:16', '16:9', '4:5', '1:1', ''];
const LC35_MIME = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
function lc35Cfg(env) {
  return { bucket: String(env.CONTENT_BUCKET || 'creator-content').replace(/[^a-z0-9_-]/gi, '').slice(0, 60) || 'creator-content', maxItems: envInt(env.CONTENT_MAX_ITEMS, 1, 2000, 80),
    maxBytes: envInt(env.CONTENT_MAX_MB, 10, 200000, 900) * 1048576, maxFile: envInt(env.CONTENT_MAX_FILE_MB, 1, 5000, 50) * 1048576, ttl: envInt(env.CONTENT_URL_SECONDS, 60, 604800, 86400) };
}
async function lc35Who(b, env) {
  const me = await touch(env, b); if (me.banned) throw err('revoked', 403);
  const admin = isAdmin(env, { token: b.secret });
  if (!admin) { const g = (await env.DB.prepare("SELECT COUNT(*) AS n FROM arena.lc27_groups WHERE pid = ? AND grp = 'creators'").bind(me.pid).first()).n; if (!g) throw err('forbidden', 403); }
  await quota(env, me.pid, 'content', 1, 900);
  return { me, admin, owner: admin ? 'admin' : me.pid };     /* the admin shares one library across devices; creators have one per device, like their Creator Hub access */
}
const lc35Platforms = (raw, base) => {
  let o = {}; try { o = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw && typeof raw === 'object' ? raw : {}); } catch (e) { o = {}; }
  const out = {}; LC35_PLATFORMS.forEach((p) => { const v = o && o[p], d = base && base[p]; out[p] = LC35_STATES.indexOf(v) >= 0 ? v : (LC35_STATES.indexOf(d) >= 0 ? d : 'orange'); });
  return out;
};
const lc35Item = (r) => ({ id: r.id, title: r.title, fmt: r.fmt, variant: r.variant, state: r.state, platforms: lc35Platforms(r.platforms), meta: (() => { try { return JSON.parse(r.meta || '{}'); } catch (e) { return {}; } })(), mime: r.mime, bytes: +r.bytes || 0, created: +r.created, updated: +r.updated });
const lc35Enc = (p) => String(p).split('/').map(encodeURIComponent).join('/');
async function lc35Storage(env, method, path, body, raw) {
  const base = String(env.STORAGE_API_BASE || env.SUPABASE_URL || '').trim().replace(/\/+$/, ''), key = String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!/^https?:\/\/[a-z0-9.:-]+$/i.test(base) || !key) throw err('storage_off', 503);
  let res;
  try {
    res = await fetch(base + '/storage/v1' + path, { method, headers: Object.assign({ apikey: key, Authorization: 'Bearer ' + key }, body ? { 'content-type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
  } catch (e) { throw err('storage_error', 502); }
  if (raw) return res;
  const j = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, json: j, base };
}
const lc35Abs = (base, rel) => /^https?:\/\//i.test(rel) ? rel : base + '/storage/v1' + (String(rel).startsWith('/storage/v1') ? String(rel).slice(11) : rel);
async function lc35Remove(env, cfg, path) {            /* a missing object counts as removed; anything else must not leave an orphan behind */
  const r = await lc35Storage(env, 'DELETE', '/object/' + cfg.bucket, { prefixes: [path] });
  if (!r.ok && r.status !== 404) throw err('storage_error', 502);
}
async function lc35Sweep(env, cfg, owner) {            /* uploads that were started and never finished */
  const stale = (await env.DB.prepare("SELECT id, path FROM arena.lc35_content WHERE owner = ? AND state = 'uploading' AND created < ?").bind(owner, now() - 36e5).all()).results;
  for (const r of stale) { try { await lc35Remove(env, cfg, r.path); await env.DB.prepare('DELETE FROM arena.lc35_content WHERE id = ?').bind(r.id).run(); } catch (e) { /* tried again next time */ } }
}
async function lc35Usage(env, cfg, owner) {
  const u = await env.DB.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN state = 'ready' THEN bytes ELSE 0 END), 0) AS b FROM arena.lc35_content WHERE owner = ?").bind(owner).first();
  return { items: +u.n, bytes: +u.b, maxItems: cfg.maxItems, maxBytes: cfg.maxBytes, maxFile: cfg.maxFile };
}
async function lc35List(b, env) {
  const w = await lc35Who(b, env), cfg = lc35Cfg(env);
  await lc35Sweep(env, cfg, w.owner);
  const rows = (await env.DB.prepare("SELECT * FROM arena.lc35_content WHERE owner = ? AND state = 'ready' ORDER BY updated DESC LIMIT 500").bind(w.owner).all()).results;
  return { items: rows.map(lc35Item), usage: await lc35Usage(env, cfg, w.owner), admin: w.admin };
}
async function lc35Begin(b, env) {
  const w = await lc35Who(b, env), cfg = lc35Cfg(env);
  const title = str(b.title, 120).trim(), fmt = LC35_FMT.indexOf(String(b.fmt || '')) >= 0 ? String(b.fmt || '') : '', variant = str(b.variant, 60).trim(), mime = String(b.mime || '').split(';')[0].trim().toLowerCase(), bytes = Math.floor(+b.bytes);
  if (!title || !LC35_MIME[mime] || !Number.isFinite(bytes) || bytes < 1) throw err('bad_input');   /* a real size is required: no clamping */
  if (bytes > cfg.maxFile) throw err('too_large', 413, { max: cfg.maxFile });
  await lc35Sweep(env, cfg, w.owner);
  const u = await lc35Usage(env, cfg, w.owner);
  if (u.items >= cfg.maxItems) throw err('limit_items', 409, { usage: u });
  if (u.bytes + bytes > cfg.maxBytes) throw err('limit_bytes', 409, { usage: u });
  let meta = '{}'; try { meta = JSON.stringify(b.meta && typeof b.meta === 'object' ? b.meta : {}); } catch (e) { meta = '{}'; } if (meta.length > 4000) meta = '{}';
  const id = 'ct_' + Array.from(globalThis.crypto.getRandomValues(new Uint8Array(6)), (x) => x.toString(16).padStart(2, '0')).join('');
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'short', name = slug + (variant ? '-' + variant.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20) : '') + '.' + LC35_MIME[mime];
  const path = w.owner + '/' + id + '/' + name, t = now(), platforms = JSON.stringify(lc35Platforms(b.platforms));
  await env.DB.prepare("INSERT INTO arena.lc35_content (id, owner, title, fmt, variant, state, platforms, meta, path, mime, bytes, created, updated) VALUES (?, ?, ?, ?, ?, 'uploading', ?, ?, ?, ?, ?, ?, ?)").bind(id, w.owner, title, fmt, variant, platforms, meta, path, mime, bytes, t, t).run();
  let sg;
  try { sg = await lc35Storage(env, 'POST', '/object/upload/sign/' + cfg.bucket + '/' + lc35Enc(path), {}); if (!sg.ok || !sg.json || !sg.json.url) throw err('storage_error', 502); }
  catch (e) { await env.DB.prepare('DELETE FROM arena.lc35_content WHERE id = ?').bind(id).run(); throw e; }
  return { ok: true, id, name, upload: { url: lc35Abs(sg.base, sg.json.url), path, mime, bytes }, usage: u };
}
async function lc35Mine(env, owner, id) {
  if (!/^ct_[0-9a-f]{12}$/.test(String(id || ''))) throw err('bad_input');
  const r = await env.DB.prepare('SELECT * FROM arena.lc35_content WHERE id = ? AND owner = ?').bind(id, owner).first();
  if (!r) throw err('not_found', 404);
  return r;
}
async function lc35Commit(b, env) {
  const w = await lc35Who(b, env), cfg = lc35Cfg(env), r = await lc35Mine(env, w.owner, b.id);
  if (r.state === 'ready') return { ok: true, item: lc35Item(r) };
  const head = await lc35Storage(env, 'HEAD', '/object/authenticated/' + cfg.bucket + '/' + lc35Enc(r.path), null, true);
  if (!head.ok) throw err('upload_missing', 409);
  const size = +head.headers.get('content-length') || 0;
  if (!size || size > cfg.maxFile) { await lc35Remove(env, cfg, r.path); await env.DB.prepare('DELETE FROM arena.lc35_content WHERE id = ?').bind(r.id).run(); throw err(size ? 'too_large' : 'upload_missing', size ? 413 : 409); }
  await env.DB.prepare("UPDATE arena.lc35_content SET state = 'ready', bytes = ?, updated = ? WHERE id = ?").bind(size, now(), r.id).run();
  return { ok: true, item: lc35Item(Object.assign({}, r, { state: 'ready', bytes: size, updated: now() })), usage: await lc35Usage(env, cfg, w.owner) };
}
async function lc35Update(b, env) {
  const w = await lc35Who(b, env), r = await lc35Mine(env, w.owner, b.id);
  if (r.state !== 'ready') throw err('not_found', 404);
  const platforms = b.platforms && typeof b.platforms === 'object' ? JSON.stringify(lc35Platforms(b.platforms, lc35Platforms(r.platforms))) : r.platforms;
  const title = b.title != null ? str(b.title, 120).trim() || r.title : r.title;
  await env.DB.prepare('UPDATE arena.lc35_content SET platforms = ?, title = ?, updated = ? WHERE id = ?').bind(platforms, title, now(), r.id).run();
  return { ok: true, item: lc35Item(Object.assign({}, r, { platforms, title, updated: now() })) };
}
async function lc35Urls(b, env) {
  const w = await lc35Who(b, env), cfg = lc35Cfg(env), ids = (Array.isArray(b.ids) ? b.ids : [b.id]).filter((x) => /^ct_[0-9a-f]{12}$/.test(String(x || ''))).slice(0, 30), urls = {};
  for (const id of ids) {
    const r = await env.DB.prepare("SELECT path FROM arena.lc35_content WHERE id = ? AND owner = ? AND state = 'ready'").bind(id, w.owner).first();
    if (!r) continue;
    const sg = await lc35Storage(env, 'POST', '/object/sign/' + cfg.bucket + '/' + lc35Enc(r.path), { expiresIn: cfg.ttl });
    if (sg.ok && sg.json && sg.json.signedURL) urls[id] = { url: lc35Abs(sg.base, sg.json.signedURL), exp: now() + cfg.ttl * 1000 };
  }
  return { ok: true, urls };
}
async function lc35Delete(b, env) {
  const w = await lc35Who(b, env), cfg = lc35Cfg(env), r = await lc35Mine(env, w.owner, b.id);
  if (r.state === 'ready') {
    const open = LC35_PLATFORMS.filter((p) => lc35Platforms(r.platforms)[p] === 'orange');
    if (open.length) throw err('not_resolved', 409, { pending: open });      /* every platform must be red or green first */
  }
  await lc35Remove(env, cfg, r.path);
  await env.DB.prepare('DELETE FROM arena.lc35_content WHERE id = ?').bind(r.id).run();
  return { ok: true, usage: await lc35Usage(env, cfg, w.owner) };
}
'''
once("/* The caller's network address. Supabase's edge sits behind Cloudflare", FN + "/* The caller's network address. Supabase's edge sits behind Cloudflare", "functions")
open(dst, 'w', encoding='utf-8').write(s)
