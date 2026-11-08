// Supabase Edge Function. Deploy: supabase functions deploy community-check --no-verify-jwt
// Secrets: ANTHROPIC_API_KEY (needed), optional COMMUNITY_CHECK_MODEL, COMMUNITY_CHECK_ENABLED=0 (kill switch), ALLOWED_ORIGINS.
import { handle } from "./check.js";
const LIVE = "https://lanckrietchesstrainerhub.vercel.app";
Deno.serve(async (req: Request) => {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean).concat([LIVE]);
  const origin = req.headers.get("origin") || "";
  const cors = { "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : LIVE, "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response("{}", { status: 405, headers: cors });
  let body: unknown = {}; try { body = await req.json(); } catch (_) { /* empty */ }
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const out = await handle({ token, body }, Deno.env.toObject(), { fetch });
  return new Response(JSON.stringify(out.body), { status: out.status, headers: { ...cors, "Content-Type": "application/json" } });
});
