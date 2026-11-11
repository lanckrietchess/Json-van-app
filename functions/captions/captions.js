/* captions (build 9.37.0): exact speech-to-text for the Creator Studio Edit tool, with a time for every word.
   The browser sends the take's audio (16 kHz mono WAV, made in the browser) with the member's Supabase token.
   Flow: token check (Supabase Auth) -> owner / admin check + daily seconds cap (RPC lc72_caption_allow, with the member's own token)
         -> ElevenLabs Speech to Text (model scribe_v1, word timestamps) -> {ok, lang, words:[{s,e,t}]}.
   Secrets: ELEVENLABS_API_KEY (required). Optional: CAPTIONS_MODEL (default scribe_v1), CAPTIONS_ENABLED=0 (switch off), ALLOWED_ORIGINS.
   SUPABASE_URL and SUPABASE_ANON_KEY are provided by Supabase. Pure logic, no Deno APIs: Node tests run exactly this file. */
export const DEFAULT_ORIGINS = ["https://lanckrietchesstrainerhub.vercel.app"];
const MAX_BYTES = 24 * 1024 * 1024;   // ~12 minutes of 16 kHz mono WAV
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
const LANGS = { en: "eng", nl: "nld", fr: "fra", de: "deu", es: "spa" };
/* ElevenLabs words -> [{s,e,t}]: only spoken words, punctuation stays on the word, times in seconds */
export function toWords(j) {
  const w = (j && Array.isArray(j.words) ? j.words : []).filter((x) => x && (x.type === "word" || x.type == null) && String(x.text || "").trim());
  return w.map((x) => ({ s: Math.max(0, +(+x.start || 0).toFixed(3)), e: Math.max(+(+x.start || 0).toFixed(3), +(+x.end || +x.start || 0).toFixed(3)), t: String(x.text).trim().slice(0, 60) }))
    .filter((x) => Number.isFinite(x.s) && Number.isFinite(x.e));
}
export async function handle(req, env, deps) {
  const f = (deps && deps.fetch) || fetch;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(env, req) });
  if (req.method !== "POST") return out(env, req, 405, { ok: false, reason: "method" });
  if (String(env.CAPTIONS_ENABLED || "1") === "0") return out(env, req, 503, { ok: false, reason: "off" });
  if (!env.ELEVENLABS_API_KEY) return out(env, req, 503, { ok: false, reason: "not_configured" });
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S{20,}/.test(auth) || !env.SUPABASE_URL) return out(env, req, 401, { ok: false, reason: "signin" });
  const base = String(env.SUPABASE_URL).replace(/\/+$/, "");
  const url = new URL(req.url), dur = Math.ceil(Math.max(1, Math.min(1200, +url.searchParams.get("dur") || 60)));
  const lang = String(url.searchParams.get("lang") || "").toLowerCase().slice(0, 2);
  // 1. a signed-in member
  try {
    const u = await f(base + "/auth/v1/user", { headers: { apikey: env.SUPABASE_ANON_KEY || "", Authorization: auth } });
    if (!u.ok) return out(env, req, 401, { ok: false, reason: "signin" });
  } catch (e) { return out(env, req, 502, { ok: false, reason: "auth_unreachable" }); }
  // 2. owner / admin only, daily cap in seconds (the database decides)
  try {
    const r = await f(base + "/rest/v1/rpc/lc72_caption_allow", { method: "POST", headers: { apikey: env.SUPABASE_ANON_KEY || "", Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ p_seconds: dur }) });
    const j = await r.json().catch(() => null);
    if (r.status === 404) return out(env, req, 503, { ok: false, reason: "sql_missing" });
    if (!j || !j.ok) return out(env, req, 403, { ok: false, reason: (j && j.error) || "forbidden" });
  } catch (e) { return out(env, req, 502, { ok: false, reason: "db_unreachable" }); }
  // 3. the audio
  const type = String(req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!/^(audio\/(wav|x-wav|webm|mpeg|mp4|ogg)|video\/(webm|mp4))$/.test(type)) return out(env, req, 415, { ok: false, reason: "type" });
  const buf = await req.arrayBuffer();
  if (!buf.byteLength) return out(env, req, 400, { ok: false, reason: "empty" });
  if (buf.byteLength > MAX_BYTES) return out(env, req, 413, { ok: false, reason: "too_long" });
  const fd = new FormData();
  fd.append("model_id", String(env.CAPTIONS_MODEL || "scribe_v1"));
  fd.append("file", new Blob([buf], { type }), "take." + (type.includes("wav") ? "wav" : type.split("/")[1]));
  fd.append("timestamps_granularity", "word");
  fd.append("tag_audio_events", "false");
  fd.append("diarize", "false");
  if (LANGS[lang]) fd.append("language_code", LANGS[lang]);
  let res, j;
  try { res = await f("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": env.ELEVENLABS_API_KEY }, body: fd }); j = await res.json().catch(() => null); }
  catch (e) { return out(env, req, 502, { ok: false, reason: "stt_unreachable" }); }
  if (!res.ok) return out(env, req, res.status === 401 ? 503 : 502, { ok: false, reason: res.status === 401 ? "bad_key" : res.status === 429 ? "stt_busy" : "stt_error" });
  const words = toWords(j);
  return out(env, req, 200, { ok: true, lang: (j && j.language_code) || lang || "", words, text: String((j && j.text) || "").slice(0, 20000) });
}
