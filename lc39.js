/* lc39.js: walkthrough video address (set in admin mode, read by the app and the landing page) and a Skool-style community
   (feed, comments, likes, pinned posts, points and levels, leaderboard). Wired into arena.js with two lines (see put-live notes).
   Every table is arena.lc39_*; no player id is ever sent to a client. */
const C = {
  CATS: ['general', 'wins', 'questions', 'games', 'announcements'],
  MAX_TITLE: 120, MAX_BODY: 4000, MAX_COMMENT: 1500, PAGE: 20, POSTS_DAY: 10, COMMENTS_DAY: 60, LIKES_DAY: 300,
  LEVELS: [0, 5, 20, 65, 155, 515, 2015, 8015, 33015]            // points needed for level 1..9 (same ladder Skool uses)
};
const levelOf = (pts) => { let l = 1; for (let i = 0; i < C.LEVELS.length; i++) if (pts >= C.LEVELS[i]) l = i + 1; return l; };
const nextAt = (pts) => { const l = levelOf(pts); return l >= C.LEVELS.length ? null : C.LEVELS[l]; };
const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, n);
const URL_RE = /^https:\/\/[^\s"'<>\\]{4,490}$/i;

export function makeLC39({ touch, err, str, now, isAdmin, quota }) {
  const admin = async (b, env) => { if (!(await isAdmin(env, { token: b.secret }))) throw err('forbidden', 403); };
  const comm = async (env, v) => {
    const c = String(v == null || v === '' ? 'main' : v).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40) || 'main';
    if (c === 'main') return c;
    const row = await env.DB.prepare('SELECT code FROM arena.lc27_creators WHERE code = ?').bind(c).first();
    if (!row) throw err('not_found', 404);
    return c;
  };
  const card = (r) => ({ id: r.id, title: r.title, preview: String(r.body || '').slice(0, 220), category: r.category, pinned: !!r.pinned, likes: r.likes, comments: r.comments,
    name: r.name, created: r.created, last: r.last_act, mine: !!r.mine, liked: !!r.liked, level: levelOf(r.pts || 0) });
  const addPts = async (env, community, pid, d) => {
    if (!pid) return;
    if (d > 0) await env.DB.prepare('INSERT INTO arena.lc39_pts (community, pid, pts) VALUES (?, ?, ?) ON CONFLICT (community, pid) DO UPDATE SET pts = arena.lc39_pts.pts + ?').bind(community, pid, d, d).run();
    else await env.DB.prepare('UPDATE arena.lc39_pts SET pts = GREATEST(pts + ?, 0) WHERE community = ? AND pid = ?').bind(d, community, pid).run();
  };
  const who = async (b, env) => { const me = await touch(env, b); if (me.banned) throw err('revoked', 403); return me; };

  return {
    /* ---- walkthrough video address ---- */
    async video_get(b, env) {
      const r = await env.DB.prepare("SELECT val, updated FROM arena.lc39_cfg WHERE key = 'walkthrough_url'").first();
      return { ok: true, url: r ? String(r.val || '') : '', updated: r ? Number(r.updated) || 0 : 0 };
    },
    async video_set(b, env) {
      await admin(b, env);
      const url = String(b.url == null ? '' : b.url).trim();
      if (url && !URL_RE.test(url)) throw err('bad_url', 400);
      await env.DB.prepare("INSERT INTO arena.lc39_cfg (key, val, updated) VALUES ('walkthrough_url', ?, ?) ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val, updated = EXCLUDED.updated").bind(url, now()).run();
      return { ok: true, url };
    },

    /* ---- community ---- */
    async c39_list(b, env) {
      await who(b, env);
      const rows = (await env.DB.prepare("SELECT code, name, partner_code FROM arena.lc27_creators WHERE COALESCE(status, 'active') NOT IN ('banned','disabled','revoked','pending','rejected') ORDER BY name").all()).results;
      return { ok: true, communities: [{ code: 'main', name: 'Lanckriet Chess' }].concat(rows.filter((r) => r.code !== 'main').map((r) => ({ code: r.code, name: r.name || r.code, partner: r.partner_code || "" }))) };
    },
    async c39_feed(b, env) {
      const me = await who(b, env), c = await comm(env, b.community);
      const cat = C.CATS.indexOf(b.category) >= 0 ? b.category : '';
      const page = Math.max(0, Math.min(200, Math.floor(+b.page || 0)));
      const base = 'SELECT p.id, p.title, p.body, p.category, p.pinned, p.likes, p.comments, p.name, p.created, p.last_act, (p.pid = ?) AS mine, ' +
        "EXISTS(SELECT 1 FROM arena.lc39_like l WHERE l.kind = 'p' AND l.ref = p.id AND l.pid = ?) AS liked, COALESCE(m.pts, 0) AS pts " +
        "FROM arena.lc39_post p LEFT JOIN arena.lc39_pts m ON m.community = p.community AND m.pid = p.pid WHERE p.community = ? AND p.state = 'ok'";
      const rows = cat
        ? (await env.DB.prepare(base + ' AND p.category = ? ORDER BY p.pinned DESC, p.last_act DESC LIMIT ? OFFSET ?').bind(me.pid, me.pid, c, cat, C.PAGE + 1, page * C.PAGE).all()).results
        : (await env.DB.prepare(base + ' ORDER BY p.pinned DESC, p.last_act DESC LIMIT ? OFFSET ?').bind(me.pid, me.pid, c, C.PAGE + 1, page * C.PAGE).all()).results;
      return { ok: true, community: c, posts: rows.slice(0, C.PAGE).map(card), more: rows.length > C.PAGE };
    },
    async c39_post_get(b, env) {
      const me = await who(b, env), id = Math.floor(+b.id);
      if (!(id > 0)) throw err('bad_input');
      const p = await env.DB.prepare('SELECT p.id, p.community, p.title, p.body, p.category, p.pinned, p.likes, p.comments, p.name, p.created, p.last_act, (p.pid = ?) AS mine, ' +
        "EXISTS(SELECT 1 FROM arena.lc39_like l WHERE l.kind = 'p' AND l.ref = p.id AND l.pid = ?) AS liked, COALESCE(m.pts, 0) AS pts " +
        "FROM arena.lc39_post p LEFT JOIN arena.lc39_pts m ON m.community = p.community AND m.pid = p.pid WHERE p.id = ? AND p.state = 'ok'").bind(me.pid, me.pid, id).first();
      if (!p) throw err('not_found', 404);
      const cs = (await env.DB.prepare('SELECT k.id, k.body, k.name, k.created, k.likes, (k.pid = ?) AS mine, ' +
        "EXISTS(SELECT 1 FROM arena.lc39_like l WHERE l.kind = 'c' AND l.ref = k.id AND l.pid = ?) AS liked, COALESCE(m.pts, 0) AS pts " +
        "FROM arena.lc39_comment k LEFT JOIN arena.lc39_pts m ON m.community = ? AND m.pid = k.pid WHERE k.post = ? AND k.state = 'ok' ORDER BY k.created ASC LIMIT 200").bind(me.pid, me.pid, p.community, id).all()).results;
      return { ok: true, post: Object.assign(card(p), { body: p.body, community: p.community }),
        comments: cs.map((k) => ({ id: k.id, body: k.body, name: k.name, created: k.created, likes: k.likes, mine: !!k.mine, liked: !!k.liked, level: levelOf(k.pts || 0) })) };
    },
    async c39_post(b, env) {
      const me = await who(b, env), c = await comm(env, b.community);
      const category = C.CATS.indexOf(b.category) >= 0 ? b.category : 'general';
      if (category === 'announcements' && !(await isAdmin(env, { token: b.secret }))) throw err('forbidden', 403);
      const title = clean(b.title, C.MAX_TITLE), body = clean(b.body, C.MAX_BODY);
      if (!title || !body) throw err('bad_input');
      await quota(env, me.pid, 'c39post', 1, C.POSTS_DAY);
      const t = now();
      const r = await env.DB.prepare('INSERT INTO arena.lc39_post (community, pid, name, category, title, body, pinned, created, last_act, likes, comments, state) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0, 0, ?) RETURNING id')
        .bind(c, me.pid, str(me.name, 40), category, title, body, t, t, 'ok').first();
      return { ok: true, id: r.id };
    },
    async c39_comment(b, env) {
      const me = await who(b, env), id = Math.floor(+b.post), body = clean(b.body, C.MAX_COMMENT);
      if (!(id > 0) || !body) throw err('bad_input');
      const p = await env.DB.prepare("SELECT id FROM arena.lc39_post WHERE id = ? AND state = 'ok'").bind(id).first();
      if (!p) throw err('not_found', 404);
      await quota(env, me.pid, 'c39comment', 1, C.COMMENTS_DAY);
      const t = now();
      const r = await env.DB.prepare('INSERT INTO arena.lc39_comment (post, pid, name, body, created, likes, state) VALUES (?, ?, ?, ?, ?, 0, ?) RETURNING id').bind(id, me.pid, str(me.name, 40), body, t, 'ok').first();
      await env.DB.prepare('UPDATE arena.lc39_post SET comments = comments + 1, last_act = ? WHERE id = ?').bind(t, id).run();
      return { ok: true, id: r.id };
    },
    async c39_like(b, env) {                                  // toggles; the author earns 1 point for a like from someone else
      const me = await who(b, env), kind = b.kind === 'c' ? 'c' : 'p', ref = Math.floor(+b.ref);
      if (!(ref > 0)) throw err('bad_input');
      const tbl = kind === 'p' ? 'arena.lc39_post' : 'arena.lc39_comment';
      const row = kind === 'p'
        ? await env.DB.prepare("SELECT pid, community FROM arena.lc39_post WHERE id = ? AND state = 'ok'").bind(ref).first()
        : await env.DB.prepare("SELECT k.pid, p.community FROM arena.lc39_comment k JOIN arena.lc39_post p ON p.id = k.post WHERE k.id = ? AND k.state = 'ok'").bind(ref).first();
      if (!row) throw err('not_found', 404);
      await quota(env, me.pid, 'c39like', 1, C.LIKES_DAY);
      const ins = await env.DB.prepare('INSERT INTO arena.lc39_like (kind, ref, pid) VALUES (?, ?, ?) ON CONFLICT DO NOTHING RETURNING ref').bind(kind, ref, me.pid).first();
      let liked;
      if (ins) { liked = true; await env.DB.prepare('UPDATE ' + tbl + ' SET likes = likes + 1 WHERE id = ?').bind(ref).run(); if (row.pid !== me.pid) await addPts(env, row.community, row.pid, 1); }
      else { liked = false; await env.DB.prepare('DELETE FROM arena.lc39_like WHERE kind = ? AND ref = ? AND pid = ?').bind(kind, ref, me.pid).run(); await env.DB.prepare('UPDATE ' + tbl + ' SET likes = GREATEST(likes - 1, 0) WHERE id = ?').bind(ref).run(); if (row.pid !== me.pid) await addPts(env, row.community, row.pid, -1); }
      const n = await env.DB.prepare('SELECT likes FROM ' + tbl + ' WHERE id = ?').bind(ref).first();
      return { ok: true, liked, likes: n ? n.likes : 0 };
    },
    async c39_pin(b, env) {
      await admin(b, env);
      const id = Math.floor(+b.id); if (!(id > 0)) throw err('bad_input');
      await env.DB.prepare('UPDATE arena.lc39_post SET pinned = ? WHERE id = ?').bind(b.pinned ? 1 : 0, id).run();
      return { ok: true };
    },
    async c39_delete(b, env) {                                // the author or the admin; the row stays hidden, never shown
      const me = await who(b, env), kind = b.kind === 'c' ? 'c' : 'p', id = Math.floor(+b.id);
      if (!(id > 0)) throw err('bad_input');
      const adm = await isAdmin(env, { token: b.secret });
      if (kind === 'p') {
        const r = await env.DB.prepare("UPDATE arena.lc39_post SET state = 'hidden' WHERE id = ? AND state = 'ok' AND (pid = ? OR ? = 1)").bind(id, me.pid, adm ? 1 : 0).run();
        if (!r.meta.changes) throw err('forbidden', 403);
      } else {
        const k = await env.DB.prepare("UPDATE arena.lc39_comment SET state = 'hidden' WHERE id = ? AND state = 'ok' AND (pid = ? OR ? = 1) RETURNING post").bind(id, me.pid, adm ? 1 : 0).first();
        if (!k) throw err('forbidden', 403);
        await env.DB.prepare('UPDATE arena.lc39_post SET comments = GREATEST(comments - 1, 0) WHERE id = ?').bind(k.post).run();
      }
      return { ok: true };
    },
    async c39_board(b, env) {
      const me = await who(b, env), c = await comm(env, b.community);
      const rows = (await env.DB.prepare('SELECT pl.name, m.pts FROM arena.lc39_pts m JOIN arena.players pl ON pl.pid = m.pid WHERE m.community = ? AND m.pts > 0 ORDER BY m.pts DESC, pl.name ASC LIMIT 25').bind(c).all()).results;
      const mine = await env.DB.prepare('SELECT pts FROM arena.lc39_pts WHERE community = ? AND pid = ?').bind(c, me.pid).first();
      const pts = mine ? mine.pts : 0;
      return { ok: true, board: rows.map((r) => ({ name: r.name, pts: r.pts, level: levelOf(r.pts) })), me: { pts, level: levelOf(pts), next: nextAt(pts) } };
    }
  };
}
export { levelOf, nextAt, C as LC39_RULES };
