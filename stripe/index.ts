// Supabase Edge Function "stripe": Stripe Connect for the creator marketplace.
// Deploy:  supabase functions deploy stripe --no-verify-jwt      (viewers are identified by Stripe Checkout, Stripe calls /webhook with its own signature)
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_... ADMIN_TOKEN=<same as the arena function>
import postgres from "npm:postgres@3.4.4";
import { makeStripeHandler } from "./stripe.js";
import { PG_TYPES } from "./db.js";

const dbUrl = Deno.env.get("ARENA_DB_URL") || Deno.env.get("SUPABASE_DB_URL");
if (!dbUrl) throw new Error("No database URL: SUPABASE_DB_URL is missing");
const sql = postgres(dbUrl, { max: 2, prepare: false, idle_timeout: 20, connect_timeout: 10, types: PG_TYPES });
Deno.serve(makeStripeHandler(sql, Deno.env.toObject()));
