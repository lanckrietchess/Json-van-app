// Supabase Edge Function: fen-scan (build 9.30.0). Deploy with:  supabase functions deploy fen-scan --no-verify-jwt
// The function checks the member's token itself (a signed-in member only), so --no-verify-jwt is right: the browser also sends the anon key.
// Secrets: supabase secrets set ANTHROPIC_API_KEY=... (required)   optional: FEN_SCAN_MODEL, FEN_SCAN_DAILY (default 5), FEN_SCAN_ENABLED=0 (switch off), ALLOWED_ORIGINS
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_DB_URL are provided by Supabase. Run sql/20261106120000_lc56_fen_scan.sql first (daily counter).
import postgres from "npm:postgres@3.4.4";
import { handle } from "./fenscan.js";

const dbUrl = Deno.env.get("SUPABASE_DB_URL");
const sql = dbUrl ? postgres(dbUrl, { max: 1, prepare: false }) : null;

async function count(email: string): Promise<number> {
  if (!sql) throw new Error("no database");
  const r = await sql`insert into public.lc56_fen_scans (email, day, n) values (${email}, current_date, 1)
                      on conflict (email, day) do update set n = public.lc56_fen_scans.n + 1 returning n`;
  return Number(r[0].n);
}

Deno.serve((req: Request) => handle(req, Deno.env.toObject(), { fetch, count }));
