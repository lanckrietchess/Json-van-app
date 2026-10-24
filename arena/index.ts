// Supabase Edge Function "arena": the Lanckrietchess Arena server (weekly tournament, tokens, leaderboards, Tier 3 auto-sync, Coach Lanckriet's voice).
// Deploy:  supabase functions deploy arena --no-verify-jwt      (the hub identifies players by device, not by a Supabase login)
import postgres from "npm:postgres@3.4.4";
import { makeHandler } from "./handler.js";
import { PG_TYPES } from "./db.js";

// SUPABASE_DB_URL is provided by Supabase to every Edge Function. If many players are online at once, point ARENA_DB_URL at the project's
// connection pooler (Project Settings > Database > Connection pooling, transaction mode) so the function never uses up the database's connections.
// prepare:false keeps it compatible with the pooler.
const dbUrl = Deno.env.get("ARENA_DB_URL") || Deno.env.get("SUPABASE_DB_URL");
if (!dbUrl) throw new Error("No database URL: SUPABASE_DB_URL is missing");
const sql = postgres(dbUrl, { max: 3, prepare: false, idle_timeout: 20, connect_timeout: 10, types: PG_TYPES });
const handle = makeHandler(sql, Deno.env.toObject());

Deno.serve((request: Request) =>
  handle(request, (p: Promise<unknown>) => {
    // @ts-ignore EdgeRuntime is provided by Supabase's runtime: lets background work finish after the response is sent
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(p);
  })
);
