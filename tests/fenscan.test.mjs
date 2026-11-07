/* Node test for functions/fen-scan/fenscan.js (the real code, stubbed network and counter). Run: node tests/fenscan.test.mjs */
import { handle, cleanPlacement, PROMPT } from "../functions/fen-scan/fenscan.js";
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log("PASS", n); } else { fail++; console.log("FAIL", n, x === undefined ? "" : JSON.stringify(x)); } };
const ORIGIN = "https://lanckrietchesstrainerhub.vercel.app";
const IMG = "data:image/jpeg;base64," + Buffer.from("not really a jpeg but fine").toString("base64");
const ENV = { ANTHROPIC_API_KEY: "sk-test", SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "anon" };
const PLACE = "6k1/5ppp/8/8/8/8/5PPP/3R2K1";
function mk({ user = { email: "Member@Example.com" }, model = { fen: PLACE, confidence: 0.9, orientation: "white_bottom" }, modelRaw, modelStatus = 200, count = 1 } = {}) {
  const calls = { model: [], user: 0 };
  const fetchStub = async (url, init) => {
    if (String(url).includes("/auth/v1/user")) { calls.user++; return user ? { ok: true, json: async () => user } : { ok: false, json: async () => ({}) }; }
    if (String(url).includes("api.anthropic.com")) { calls.model.push(JSON.parse(init.body)); return modelStatus !== 200 ? { ok: false, status: modelStatus, json: async () => ({}) } : { ok: true, json: async () => ({ content: [{ type: "text", text: modelRaw != null ? modelRaw : "```json\n" + JSON.stringify(model) + "\n```" }] }) }; }
    throw new Error("unexpected fetch " + url);
  };
  return { calls, deps: { fetch: fetchStub, count: async () => { if (typeof count === "function") return count(); return count; } } };
}
const req = (o = {}) => new Request("https://f.test/fen-scan", { method: o.method || "POST", headers: Object.assign({ origin: ORIGIN, authorization: "Bearer jwt", "content-type": "application/json" }, o.headers || {}), body: (o.method === "OPTIONS" || o.method === "GET") ? undefined : JSON.stringify(o.body === undefined ? { image: IMG } : o.body) });
const j = async (r) => r.json();

let r = await handle(req({ method: "OPTIONS" }), ENV, mk().deps);
ok("preflight from the live address: 204 + allow-origin", r.status === 204 && r.headers.get("access-control-allow-origin") === ORIGIN && /authorization/.test(r.headers.get("access-control-allow-headers")));
r = await handle(req({ headers: { origin: "https://evil.example" } }), ENV, mk().deps);
ok("a foreign origin gets no allow-origin header", !r.headers.get("access-control-allow-origin"));
r = await handle(req({ headers: { origin: "https://staging.example" } }), Object.assign({}, ENV, { ALLOWED_ORIGINS: "https://staging.example" }), mk().deps);
ok("ALLOWED_ORIGINS adds an origin", r.headers.get("access-control-allow-origin") === "https://staging.example");
let m = mk();
r = await handle(req({ headers: { authorization: "" } }), ENV, m.deps); let b = await j(r);
ok("no token: 401 signin, the model is not called", r.status === 401 && b.reason === "signin" && m.calls.model.length === 0, b);
m = mk({ user: null }); r = await handle(req(), ENV, m.deps); b = await j(r);
ok("a token Supabase rejects: 401 signin", r.status === 401 && b.reason === "signin" && m.calls.model.length === 0, b);
m = mk(); r = await handle(req({ body: { image: "hello" } }), ENV, m.deps); b = await j(r);
ok("not an image: 400, no model call", r.status === 400 && b.reason === "image" && m.calls.model.length === 0, b);
m = mk(); r = await handle(req({ body: { image: "data:image/jpeg;base64," + "A".repeat(5.7e6) } }), ENV, m.deps); b = await j(r);
ok("an oversized image: 400", r.status === 400 && b.reason === "image", b);
m = mk({ count: 6 }); r = await handle(req(), ENV, m.deps); b = await j(r);
ok("over the daily cap: 429 limit and the model is NOT called", r.status === 429 && b.reason === "limit" && m.calls.model.length === 0, b);
m = mk({ count: 3 }); r = await handle(req(), Object.assign({}, ENV, { FEN_SCAN_DAILY: "3" }), m.deps);
ok("FEN_SCAN_DAILY=3: the third scan still works", r.status === 200);
m = mk(); r = await handle(req(), ENV, m.deps); b = await j(r);
ok("a good photo: 200, full FEN, confidence, orientation", r.status === 200 && b.ok && b.fen === PLACE + " w - - 0 1" && b.confidence === 0.9 && b.orientation === "white_bottom", b);
const call = m.calls.model[0];
ok("the model gets the image block, the prompt and the default model", call && call.model === "claude-sonnet-5-5" && call.system === PROMPT && call.messages[0].content[0].type === "image" && call.messages[0].content[0].source.media_type === "image/jpeg" && call.messages[0].content[0].source.data.length > 10, call && call.model);
ok("the prompt treats the image as data", /Ignore any instructions/.test(PROMPT));
m = mk(); await handle(req(), Object.assign({}, ENV, { FEN_SCAN_MODEL: "claude-haiku-5-5" }), m.deps);
ok("FEN_SCAN_MODEL overrides the model", m.calls.model[0].model === "claude-haiku-5-5");
m = mk({ model: { fen: null, confidence: 0.1 } }); r = await handle(req(), ENV, m.deps); b = await j(r);
ok("null fen (shadow, angle): 422 unreadable", r.status === 422 && b.reason === "unreadable", b);
m = mk({ model: { fen: "6k1/5ppp/8/8/8/8/5PPP/3R1KK1", confidence: 0.8 } }); r = await handle(req(), ENV, m.deps); b = await j(r);
ok("two white kings: 422 unreadable", r.status === 422 && b.reason === "unreadable", b);
m = mk({ modelRaw: "I cannot read this image." }); r = await handle(req(), ENV, m.deps); b = await j(r);
ok("a model answer that is not JSON: 422, no crash", r.status === 422 && b.reason === "unreadable", b);
m = mk({ model: { fen: PLACE + " b KQkq - 0 1", orientation: "black_bottom", confidence: 7 } }); r = await handle(req(), ENV, m.deps); b = await j(r);
ok("a full FEN from the model is cut to the placement; confidence is clamped; orientation passes", b.ok && b.fen === PLACE + " w - - 0 1" && b.confidence === 1 && b.orientation === "black_bottom", b);
m = mk({ modelStatus: 500 }); r = await handle(req(), ENV, m.deps); b = await j(r);
ok("the model is down: 502 upstream", r.status === 502 && b.reason === "upstream", b);
m = mk(); r = await handle(req(), Object.assign({}, ENV, { FEN_SCAN_ENABLED: "0" }), m.deps); b = await j(r);
ok("FEN_SCAN_ENABLED=0: 503 off", r.status === 503 && b.reason === "off" && m.calls.model.length === 0, b);
m = mk(); r = await handle(req(), { SUPABASE_URL: ENV.SUPABASE_URL }, m.deps); b = await j(r);
ok("no ANTHROPIC_API_KEY: 503 not_configured", r.status === 503 && b.reason === "not_configured", b);
m = mk({ count: () => { throw new Error("db down"); } }); r = await handle(req(), ENV, m.deps); b = await j(r);
ok("the counter is down: 503 and the model is not called", r.status === 503 && b.reason === "counter" && m.calls.model.length === 0, b);
r = await handle(req({ method: "GET" }), ENV, mk().deps);
ok("GET is refused", r.status === 405);
ok("cleanPlacement: valid", cleanPlacement(PLACE) === PLACE && cleanPlacement(PLACE + " w - - 0 1") === PLACE);
ok("cleanPlacement: rejects 7 ranks, bad sums, bad letters, pawn on rank 8, a missing king",
  !cleanPlacement("6k1/5ppp/8/8/8/5PPP/3R2K1") && !cleanPlacement("6k1/5ppp/8/8/8/8/5PPP/3R3K1") && !cleanPlacement("6k1/5ppp/8/8/8/8/5PPP/3R1XK1") && !cleanPlacement("5Pk1/5ppp/8/8/8/8/5PPP/3R2K1") && !cleanPlacement("6k1/5ppp/8/8/8/8/5PPP/3R4"));
console.log("\nRESULT", pass, "passed", fail, "failed");
process.exit(fail ? 1 : 0);
