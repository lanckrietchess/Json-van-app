/* Node test for functions/welcome-mail/welcome.js (the real code; stubbed Supabase Auth, Resend and database). Run: node tests/welcome.test.mjs */
import { handle, mailBody, SUBJECT } from "../functions/welcome-mail/welcome.js";
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log("PASS", n); } else { fail++; console.log("FAIL", n, x === undefined ? "" : JSON.stringify(x)); } };
const ORIGIN = "https://lanckrietchesstrainerhub.vercel.app";
const ENV = { RESEND_API_KEY: "re_test", WELCOME_FROM: "Lanckriet Chess <hello@example.com>", SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "anon" };
function mk({ user = { email: "Member@Example.com" }, consent = true, row = { key: "WELCOME-TOKEN-2026", sent_at: null, attempts: 0 }, resend = 200, dbDown = false } = {}) {
  const log = { mail: [], marks: [] };
  return { log, deps: {
    fetch: async (url, init) => {
      if (String(url).includes("/auth/v1/user")) return user ? { ok: true, json: async () => user } : { ok: false, json: async () => ({}) };
      if (String(url).includes("api.resend.com")) { log.mail.push({ headers: init.headers, body: JSON.parse(init.body) }); return { ok: resend === 200, status: resend, json: async () => ({}) }; }
      throw new Error("unexpected " + url);
    },
    consent: async () => { if (dbDown) throw new Error("db"); return consent; },
    queue: async () => row, mark: async (e, s) => { log.marks.push([e, s]); } } };
}
const req = (o = {}) => new Request("https://f.test/welcome-mail", { method: o.method || "POST", headers: Object.assign({ origin: ORIGIN, authorization: "Bearer jwt" }, o.headers || {}), body: o.method === "GET" || o.method === "OPTIONS" ? undefined : "{}" });
let m = mk(), r = await handle(req(), ENV, m.deps), b = await r.json();
ok("the mail goes out: 200 sent", r.status === 200 && b.sent === true, b);
ok("sent to the member's own address (lower-cased), from the configured sender", m.log.mail[0].body.to[0] === "member@example.com" && m.log.mail[0].body.from === ENV.WELCOME_FROM);
ok("the mail contains the key, the how-to and the unsubscribe note", /WELCOME-TOKEN-2026/.test(m.log.mail[0].body.text) && /Redeem/.test(m.log.mail[0].body.text) && /unsubscribe/i.test(m.log.mail[0].body.text) && /Middelkerke/.test(m.log.mail[0].body.html) && m.log.mail[0].body.subject === SUBJECT);
ok("Resend gets an idempotency key, so a repeat can never send twice", m.log.mail[0].headers["Idempotency-Key"] === "welcome-member@example.com");
ok("the row is marked sent", JSON.stringify(m.log.marks) === JSON.stringify([["member@example.com", true]]));
m = mk({ row: { key: "WELCOME-TOKEN-2026", sent_at: "2026-11-06", attempts: 1 } }); r = await handle(req(), ENV, m.deps); b = await r.json();
ok("already sent: 200 already, NO second mail", r.status === 200 && b.already === true && m.log.mail.length === 0, b);
m = mk({ consent: false }); r = await handle(req(), ENV, m.deps); b = await r.json();
ok("box not ticked: 403 and no mail", r.status === 403 && b.reason === "consent" && m.log.mail.length === 0, b);
m = mk({ row: null }); r = await handle(req(), ENV, m.deps); b = await r.json();
ok("nothing queued: 404 and no mail", r.status === 404 && b.reason === "not_queued" && m.log.mail.length === 0, b);
m = mk({ row: { key: "K", sent_at: null, attempts: 5 } }); r = await handle(req(), ENV, m.deps); b = await r.json();
ok("five failed tries: 429, no more mail", r.status === 429 && b.reason === "tries" && m.log.mail.length === 0, b);
m = mk({ resend: 500 }); r = await handle(req(), ENV, m.deps); b = await r.json();
ok("Resend fails: 502 mail, the try is counted, the row is NOT marked sent", r.status === 502 && b.reason === "mail" && JSON.stringify(m.log.marks) === JSON.stringify([["member@example.com", false]]), [b, m.log.marks]);
m = mk(); r = await handle(req({ headers: { authorization: "" } }), ENV, m.deps); b = await r.json();
ok("no token: 401 signin", r.status === 401 && b.reason === "signin" && m.log.mail.length === 0, b);
m = mk({ user: null }); r = await handle(req(), ENV, m.deps); b = await r.json();
ok("a token Supabase rejects: 401", r.status === 401 && m.log.mail.length === 0, b);
m = mk(); r = await handle(req(), { SUPABASE_URL: ENV.SUPABASE_URL }, m.deps); b = await r.json();
ok("no Resend secrets: 503 not_configured (the app then shows the key on screen)", r.status === 503 && b.reason === "not_configured", b);
m = mk({ dbDown: true }); r = await handle(req(), ENV, m.deps); b = await r.json();
ok("database down: 503, no mail", r.status === 503 && b.reason === "database" && m.log.mail.length === 0, b);
r = await handle(req({ method: "OPTIONS" }), ENV, mk().deps);
ok("preflight from the live address", r.status === 204 && r.headers.get("access-control-allow-origin") === ORIGIN);
r = await handle(req({ headers: { origin: "https://evil.example" } }), ENV, mk().deps);
ok("a foreign origin gets no allow-origin header", !r.headers.get("access-control-allow-origin"));
r = await handle(req({ method: "GET" }), ENV, mk().deps);
ok("GET is refused", r.status === 405);
ok("the key is HTML-escaped in the mail", /&lt;b&gt;/.test(mailBody("<b>").html) && !/<b>/.test(mailBody("<b>").html.split("font-weight:800")[1].split("</p>")[0]));
console.log("\nRESULT", pass, "passed", fail, "failed");
process.exit(fail ? 1 : 0);
