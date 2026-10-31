// Supabase Edge Function: stripe-links (build 9.20.5). Deploy with:  supabase functions deploy stripe-links --no-verify-jwt
// Secrets: STRIPE_LINKS_WEBHOOK_SECRET (the signing secret of the NEW webhook endpoint), optional LINK_MAP, VIP_YEAR_TOKENS, TOKENS_VIP_MONTH.
import postgres from "npm:postgres@3.4.4";
import { handle } from "./links.js";
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
Deno.serve((req: Request) => handle(req, { sql, env: Deno.env.toObject() }));
