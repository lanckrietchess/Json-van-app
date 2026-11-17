// Supabase Edge Function "arena": hardcoded CORS & bulletproof error handling
import postgres from "npm:postgres@3.4.4";
import { makeHandler } from "./handler.js";
import { PG_TYPES } from "./db.js";
import { guard } from "./guard.js";

const env = Deno.env.toObject();
const dbUrl = env.ARENA_DB_URL || env.SUPABASE_DB_URL || "";
let sql: any = null, handle: any = null, bootError = "";

try {
  if (!dbUrl) throw new Error("No database URL: SUPABASE_DB_URL is missing");
  sql = postgres(dbUrl, { max: 3, prepare: false, idle_timeout: 20, connect_timeout: 10, types: PG_TYPES });
  handle = makeHandler(sql, env);
} catch (e) {
  bootError = String((e && (e as Error).message) || e).slice(0, 300);
  console.error("arena boot failed:", bootError);
}

const waitUntil = (p: Promise<unknown>) => {
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(p);
};

const rawHandler = guard({ sql, handle, env, bootError, waitUntil });

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "*";
  
  const headers = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json"
  };

  // Preflight OPTIONS verzoeken direct 204 OK teruggeven
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const res = await rawHandler(req);
    
    // Als de interne handler toch een 400 geeft, stuur een schone JSON response terug zodat de frontend niet crasht
    if (res.status >= 400) {
      const errBody = await res.text();
      console.warn("Arena request payload error:", errBody);
      // 9.50.0: keep the server's own answer (reason, limit, ...) at the top level plus the real HTTP status, so the app can show the exact error
      let parsed: any = null;
      try { parsed = JSON.parse(errBody); } catch (_e) { parsed = null; }
      const body = Object.assign({}, parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}, { ok: false, error: "Bad request payload", details: errBody.slice(0, 500), httpStatus: res.status });
      return new Response(JSON.stringify(body), {
        status: 200,
        headers
      });
    }

    const newHeaders = new Headers(res.headers);
    newHeaders.set("Access-Control-Allow-Origin", origin);
    newHeaders.set("Access-Control-Allow-Credentials", "true");

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders
    });
  } catch (err) {
    // Vang runtime crashes op en geef status 200 met een fout-object terug om de browser console schoon te houden
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers
    });
  }
});