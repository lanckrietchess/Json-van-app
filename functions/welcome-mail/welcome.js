/* welcome-mail (build 9.31.0): sends the welcome mail with the bonus key to a member who ticked the e-mail box.
   Pure logic (no Deno APIs) so Node can test exactly this code; index.ts wires the database and the real fetch.
   Flow: the app calls this right after `lc57_welcome_start` queued the mail -> the member's token is checked against Supabase Auth ->
         the box must be ticked (server truth) -> the queued row is read -> mail goes out through Resend -> the row is marked sent.
   A repeated call never sends a second mail (sent_at is set, and Resend gets an Idempotency-Key).
   Secrets: RESEND_API_KEY and WELCOME_FROM (for example  Lanckriet Chess <hello@your-verified-domain>)  (both required), optional ALLOWED_ORIGINS,
            WELCOME_REPLY_TO. SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_DB_URL come from Supabase. */
export const DEFAULT_ORIGINS = ["https://lanckrietchesstrainerhub.vercel.app"];
export const SUBJECT = "Your bonus token is inside";
export const SITE = "https://lanckrietchesstrainerhub.vercel.app";
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
export function mailBody(key) {
  const text = [
    "Hi,", "",
    "Thanks for saying yes to coaching tips and offers from Lanckriet Chess. Here is your bonus key, worth 1 token:", "",
    "    " + key, "",
    "How to use it: open the app, go to Account, find \"Bonus key\", type the key and press Redeem. The key works once per account.", "",
    "You get this mail because you ticked the e-mail box in the Lanckriet Chess app. You can unsubscribe at any time in the app under Account > Email updates.", "",
    "Kyenzo Lanckriet, Lanckriet Chess, Middelkerke, Belgium", SITE
  ].join("\n");
  const html = "<div style=\"font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a;line-height:1.5\">" +
    "<p>Hi,</p><p>Thanks for saying yes to coaching tips and offers from Lanckriet Chess. Here is your bonus key, worth <b>1 token</b>:</p>" +
    "<p style=\"font-size:20px;font-weight:800;letter-spacing:.04em;background:#f1f5f9;border-radius:10px;padding:14px 16px;text-align:center\">" + esc(key) + "</p>" +
    "<p>How to use it: open the app, go to <b>Account</b>, find <b>Bonus key</b>, type the key and press <b>Redeem</b>. The key works once per account.</p>" +
    "<p style=\"font-size:12px;color:#64748b\">You get this mail because you ticked the e-mail box in the Lanckriet Chess app. You can unsubscribe at any time in the app under Account &gt; Email updates.<br>Kyenzo Lanckriet, Lanckriet Chess, Middelkerke, Belgium<br><a href=\"" + SITE + "\">" + SITE + "</a></p></div>";
  return { text, html };
}
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

export async function handle(req, env, deps) {
  const f = (deps && deps.fetch) || fetch;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(env, req) });
  if (req.method !== "POST") return out(env, req, 405, { ok: false, reason: "method" });
  if (!env.RESEND_API_KEY || !env.WELCOME_FROM) return out(env, req, 503, { ok: false, reason: "not_configured" });
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/.test(auth) || !env.SUPABASE_URL) return out(env, req, 401, { ok: false, reason: "signin" });
  let email = "";
  try {
    const u = await f(String(env.SUPABASE_URL).replace(/\/+$/, "") + "/auth/v1/user", { headers: { apikey: env.SUPABASE_ANON_KEY || "", Authorization: auth } });
    if (u.ok) { const j = await u.json(); email = String(j && j.email || "").toLowerCase(); }
  } catch (e) { email = ""; }
  if (!email) return out(env, req, 401, { ok: false, reason: "signin" });
  let consent = false, row = null;
  try { consent = !!(await deps.consent(email)); row = await deps.queue(email); } catch (e) { return out(env, req, 503, { ok: false, reason: "database" }); }
  if (!consent) return out(env, req, 403, { ok: false, reason: "consent" });
  if (!row) return out(env, req, 404, { ok: false, reason: "not_queued" });
  if (row.sent_at) return out(env, req, 200, { ok: true, sent: true, already: true });
  if ((+row.attempts || 0) >= 5) return out(env, req, 429, { ok: false, reason: "tries" });
  const m = mailBody(row.key);
  try {
    const r = await f("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json", "Idempotency-Key": "welcome-" + email },
      body: JSON.stringify({ from: env.WELCOME_FROM, to: [email], subject: SUBJECT, text: m.text, html: m.html, reply_to: env.WELCOME_REPLY_TO || undefined })
    });
    if (!r.ok) { try { await deps.mark(email, false); } catch (e) { /* ignore */ } return out(env, req, 502, { ok: false, reason: "mail" }); }
  } catch (e) { try { await deps.mark(email, false); } catch (x) { /* ignore */ } return out(env, req, 502, { ok: false, reason: "mail" }); }
  try { await deps.mark(email, true); } catch (e) { /* the mail is out; a repeat is stopped by Resend's idempotency key */ }
  return out(env, req, 200, { ok: true, sent: true });
}
