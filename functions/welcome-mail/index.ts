// Supabase Edge Function: welcome-mail (build 9.31.0). Deploy with:  supabase functions deploy welcome-mail --no-verify-jwt
// The function checks the member's token itself, so --no-verify-jwt is right (the browser also sends the anon key).
// Secrets: supabase secrets set RESEND_API_KEY=... WELCOME_FROM="Lanckriet Chess <hello@your-verified-domain>"   (optional: WELCOME_REPLY_TO, ALLOWED_ORIGINS)
// Run sql/20261106130000_lc57_welcome_bonus.sql first. Without the two secrets the app shows the bonus key on screen instead of mailing it.
import postgres from "npm:postgres@3.4.4";
import { handle } from "./welcome.js";

const dbUrl = Deno.env.get("SUPABASE_DB_URL");
const sql = dbUrl ? postgres(dbUrl, { max: 1, prepare: false }) : null;

const deps = {
  fetch,
  async consent(email: string): Promise<boolean> {
    if (!sql) throw new Error("no database");
    const r = await sql`select marketing from public.lc36_email_consent where email = ${email}`;
    return !!(r[0] && r[0].marketing);
  },
  async queue(email: string) {
    if (!sql) throw new Error("no database");
    const r = await sql`select key, sent_at, attempts from public.lc57_welcome_queue where email = ${email}`;
    return r[0] || null;
  },
  async mark(email: string, sent: boolean) {
    if (!sql) throw new Error("no database");
    if (sent) await sql`update public.lc57_welcome_queue set sent_at = now(), attempts = attempts + 1 where email = ${email}`;
    else await sql`update public.lc57_welcome_queue set attempts = attempts + 1 where email = ${email}`;
  },
};

Deno.serve((req: Request) => handle(req, Deno.env.toObject(), deps));
