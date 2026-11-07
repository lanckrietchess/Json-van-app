/* Node test for functions/elo-verify/eloverify.js (the real code; stubbed Supabase Auth, Chess.com, Lichess and database). Run: node tests/eloverify.test.mjs */
import { handle } from "../functions/elo-verify/eloverify.js";
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log("PASS", n); } else { fail++; console.log("FAIL", n, x === undefined ? "" : JSON.stringify(x)); } };
const ORIGIN = "https://lanckrietchesstrainerhub.vercel.app", ENV = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "anon" };
function mk({ user = { id: "11111111-1111-1111-1111-111111111111", email: "Member@Example.com" }, chesscom, lichess, cur = null, rec } = {}) {
  const log = { urls: [], uas: [], rec: [] };
  return { log, deps: {
    fetch: async (url, init) => {
      log.urls.push(String(url)); if (init && init.headers && init.headers["User-Agent"]) log.uas.push(init.headers["User-Agent"]);
      if (String(url).includes("/auth/v1/user")) return user ? { ok: true, json: async () => user } : { ok: false, json: async () => ({}) };
      if (String(url).includes("api.chess.com")) { const r = chesscom === undefined ? { status: 200, body: { chess_rapid: { last: { rating: 1437 } } } } : chesscom; return { ok: r.status === 200, status: r.status, json: async () => r.body || {} }; }
      if (String(url).includes("lichess.org")) { const r = lichess === undefined ? { status: 200, body: { perfs: { rapid: { rating: 1620, games: 54, prov: false } } } } : lichess; return { ok: r.status === 200, status: r.status, json: async () => r.body || {} }; }
      throw new Error("unexpected " + url);
    },
    current: async () => cur,
    record: async (...a) => { log.rec.push(a); return rec ? rec : { ok: true, first: true, site: a[2], uname: a[3], start: a[4], last: a[4], peak: a[4], catchup: 6 }; } } };
}
const req = (body, o = {}) => new Request("https://f.test/elo-verify", { method: o.method || "POST", headers: Object.assign({ origin: ORIGIN, authorization: "Bearer jwt" }, o.headers || {}), body: o.method === "GET" || o.method === "OPTIONS" ? undefined : JSON.stringify(body) });
let m = mk(), r = await handle(req({ site: "chesscom", username: "PlayerA" }), ENV, m.deps), b = await r.json();
ok("Chess.com: the server reads the Rapid rating itself and records it", r.status === 200 && b.ok && m.log.rec[0][4] === 1437 && b.catchup === 6, b);
ok("the Chess.com URL uses the lower-cased name, and the request identifies itself", m.log.urls.some((u) => u === "https://api.chess.com/pub/player/playera/stats") && /LanckrietChess/.test(m.log.uas[0] || ""), m.log.urls);
ok("the member id and the lower-cased e-mail come from Supabase Auth, not from the browser", m.log.rec[0][0] === "11111111-1111-1111-1111-111111111111" && m.log.rec[0][1] === "member@example.com", m.log.rec[0]);
m = mk(); r = await handle(req({ site: "chesscom", username: "PlayerA", rating: 3200, email: "boss@x.com", user_id: "x" }), ENV, m.deps);
ok("a rating, e-mail or id sent by the browser is ignored", m.log.rec[0][4] === 1437 && m.log.rec[0][1] === "member@example.com");
m = mk(); r = await handle(req({ site: "lichess", username: "Player_B" }), ENV, m.deps); b = await r.json();
ok("Lichess: reads perfs.rapid", r.status === 200 && m.log.rec[0][4] === 1620 && m.log.urls.includes("https://lichess.org/api/user/Player_B"), [b, m.log.urls]);
m = mk({ lichess: { status: 200, body: { perfs: { rapid: { rating: 1500, games: 4, prov: true } } } } }); r = await handle(req({ site: "lichess", username: "NewBie" }), ENV, m.deps); b = await r.json();
ok("Lichess provisional / too few games: 422 no_rapid, nothing recorded", r.status === 422 && b.reason === "no_rapid" && m.log.rec.length === 0, b);
m = mk({ chesscom: { status: 200, body: { chess_blitz: { last: { rating: 900 } } } } }); r = await handle(req({ site: "chesscom", username: "BlitzOnly" }), ENV, m.deps); b = await r.json();
ok("no Rapid rating at all: 422 no_rapid", r.status === 422 && b.reason === "no_rapid", b);
m = mk({ chesscom: { status: 404 } }); r = await handle(req({ site: "chesscom", username: "Nobody" }), ENV, m.deps); b = await r.json();
ok("unknown user: 404 not_found", r.status === 404 && b.reason === "not_found" && m.log.rec.length === 0, b);
m = mk({ chesscom: { status: 500 } }); r = await handle(req({ site: "chesscom", username: "PlayerA" }), ENV, m.deps); b = await r.json();
ok("the chess site is down: 502 upstream, nothing recorded", r.status === 502 && b.reason === "upstream" && m.log.rec.length === 0, b);
for (const bad of [{ site: "chesscom", username: "bad name!" }, { site: "chesscom", username: "a" }, { site: "chesscom", username: "../etc/passwd" }, { site: "yahoo", username: "PlayerA" }, { site: "chesscom" }, null]) {
  m = mk(); r = await handle(req(bad), ENV, m.deps); b = await r.json();
  ok("bad input " + JSON.stringify(bad) + ": 400 and NO outside request", r.status === 400 && b.reason === "bad_input" && !m.log.urls.some((u) => /chess\.com|lichess/.test(u)), b);
}
m = mk({ cur: { site: "chesscom", uname: "PlayerA", start_rating: 1400, last_rating: 1450, peak_rating: 1460, last_at: new Date().toISOString() } });
r = await handle(req({ site: "chesscom", username: "playera" }), ENV, m.deps); b = await r.json();
ok("a second read within 10 minutes is answered from the database: no outside request", r.status === 200 && b.cached === true && b.peak === 1460 && !m.log.urls.some((u) => /chess\.com|lichess/.test(u)), b);
m = mk({ cur: { site: "chesscom", uname: "PlayerA", start_rating: 1400, last_rating: 1450, peak_rating: 1460, last_at: new Date(Date.now() - 3600e3).toISOString() } });
r = await handle(req({ site: "chesscom", username: "PlayerA" }), ENV, m.deps); b = await r.json();
ok("after 10 minutes it reads again", r.status === 200 && b.cached === false && m.log.rec.length === 1, b);
m = mk({ rec: { ok: false, error: "account_taken" } }); r = await handle(req({ site: "chesscom", username: "Taken" }), ENV, m.deps); b = await r.json();
ok("an account that belongs to another member: 409 account_taken", r.status === 409 && b.reason === "account_taken", b);
m = mk({ rec: { ok: false, error: "already_linked" } }); r = await handle(req({ site: "lichess", username: "Other" }), ENV, m.deps); b = await r.json();
ok("a member who already linked another account: 409 already_linked", r.status === 409 && b.reason === "already_linked", b);
m = mk(); r = await handle(req({ site: "chesscom", username: "PlayerA" }, { headers: { authorization: "" } }), ENV, m.deps); b = await r.json();
ok("no token: 401 and no outside request", r.status === 401 && b.reason === "signin" && !m.log.urls.some((u) => /chess\.com/.test(u)), b);
m = mk({ user: null }); r = await handle(req({ site: "chesscom", username: "PlayerA" }), ENV, m.deps);
ok("a token Supabase rejects: 401", r.status === 401);
r = await handle(req({}, { method: "OPTIONS" }), ENV, mk().deps); ok("preflight from the live address", r.status === 204 && r.headers.get("access-control-allow-origin") === ORIGIN);
r = await handle(req({ site: "chesscom", username: "PlayerA" }, { headers: { origin: "https://evil.example" } }), ENV, mk().deps); ok("a foreign origin gets no allow-origin header", !r.headers.get("access-control-allow-origin"));
r = await handle(req({}, { method: "GET" }), ENV, mk().deps); ok("GET is refused", r.status === 405);
console.log("\nRESULT", pass, "passed", fail, "failed"); process.exit(fail ? 1 : 0);
