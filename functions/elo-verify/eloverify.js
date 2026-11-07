/* elo-verify (build 9.32.0): reads a member's PUBLIC Rapid rating from Chess.com or Lichess on the server, so the browser cannot fake it, and records it
   (first read = start rating, highest read = peak) through public.lc59_link_record. Milestones, the Catch-Up Bonus and the Peak Gain on the landing page
   all rest on this. Pure logic (no Deno APIs): Node tests exactly this code; index.ts only wires the database and the real fetch.
   The browser sends {site, username} with the member's Supabase token. It never sends a rating, and if it did, the rating would be ignored.
   Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_DB_URL (all provided by Supabase), optional ALLOWED_ORIGINS. */
export const DEFAULT_ORIGINS = ["https://lanckrietchesstrainerhub.vercel.app"];
const UA = "LanckrietChess-Hub/9.32 (rating check for the member who linked this account)";
const MIN_GAP_MS = 10 * 60 * 1000;
export function allowedOrigin(env, origin) {
  const list = DEFAULT_ORIGINS.concat(String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean));
  return list.includes("*") ? (origin || "*") : (list.includes(origin) ? origin : "");
}
const headers = (env, req) => {
  const o = allowedOrigin(env, req.headers.get("origin") || ""), h = { "Content-Type": "application/json", "Vary": "Origin", "Cache-Control": "no-store" };
  if (o) { h["Access-Control-Allow-Origin"] = o; h["Access-Control-Allow-Headers"] = "authorization, apikey, content-type, x-client-info"; h["Access-Control-Allow-Methods"] = "POST, OPTIONS"; }
  return h;
};
const out = (env, req, status, body) => new Response(JSON.stringify(body), { status, headers: headers(env, req) });

/* the rating the member's public profile shows right now; null with a reason when there is none */
export async function readRating(f, site, user) {
  if (site === "chesscom") {
    const r = await f("https://api.chess.com/pub/player/" + encodeURIComponent(user.toLowerCase()) + "/stats", { headers: { "User-Agent": UA, "Accept": "application/json" } });
    if (r.status === 404) return { error: "not_found" };
    if (!r.ok) return { error: "upstream" };
    const j = await r.json(), x = j && j.chess_rapid && j.chess_rapid.last && +j.chess_rapid.last.rating;
    return x ? { rating: Math.round(x) } : { error: "no_rapid" };
  }
  const r = await f("https://lichess.org/api/user/" + encodeURIComponent(user), { headers: { "User-Agent": UA, "Accept": "application/json" } });
  if (r.status === 404) return { error: "not_found" };
  if (!r.ok) return { error: "upstream" };
  const j = await r.json(), p = j && j.perfs && j.perfs.rapid;
  if (!p || !p.rating || p.prov || (+p.games || 0) < 10) return { error: "no_rapid" };   // a provisional rating is not a rating yet
  return { rating: Math.round(+p.rating) };
}
const STATUS = { not_found: 404, no_rapid: 422, upstream: 502, account_taken: 409, already_linked: 409, bad_input: 400 };

export async function handle(req, env, deps) {
  const f = (deps && deps.fetch) || fetch;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(env, req) });
  if (req.method !== "POST") return out(env, req, 405, { ok: false, reason: "method" });
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/.test(auth) || !env.SUPABASE_URL) return out(env, req, 401, { ok: false, reason: "signin" });
  let uid = "", email = "";
  try {
    const u = await f(String(env.SUPABASE_URL).replace(/\/+$/, "") + "/auth/v1/user", { headers: { apikey: env.SUPABASE_ANON_KEY || "", Authorization: auth } });
    if (u.ok) { const j = await u.json(); uid = String(j && j.id || ""); email = String(j && j.email || "").toLowerCase(); }
  } catch (e) { uid = ""; }
  if (!uid || !email) return out(env, req, 401, { ok: false, reason: "signin" });
  let body = null;
  try { body = await req.json(); } catch (e) { body = null; }
  const site = body && body.site, user = body && typeof body.username === "string" ? body.username.trim() : "";
  if ((site !== "chesscom" && site !== "lichess") || !/^[A-Za-z0-9_-]{2,30}$/.test(user)) return out(env, req, 400, { ok: false, reason: "bad_input" });
  // at most one read every 10 minutes per member: answer from what is stored
  let cur = null;
  try { cur = await deps.current(uid); } catch (e) { return out(env, req, 503, { ok: false, reason: "database" }); }
  if (cur && cur.last_at && Date.now() - new Date(cur.last_at).getTime() < MIN_GAP_MS && String(cur.site) === site && String(cur.uname).toLowerCase() === user.toLowerCase()) {
    return out(env, req, 200, { ok: true, cached: true, first: false, site: cur.site, uname: cur.uname, start: cur.start_rating, last: cur.last_rating, peak: cur.peak_rating, catchup: 0 });
  }
  let got;
  try { got = await readRating(f, site, user); } catch (e) { got = { error: "upstream" }; }
  if (got.error) return out(env, req, STATUS[got.error] || 502, { ok: false, reason: got.error });
  let rec;
  try { rec = await deps.record(uid, email, site, user, got.rating); } catch (e) { return out(env, req, 503, { ok: false, reason: "database" }); }
  if (!rec || !rec.ok) return out(env, req, STATUS[rec && rec.error] || 400, { ok: false, reason: (rec && rec.error) || "bad_input" });
  return out(env, req, 200, Object.assign({ cached: false }, rec));
}
