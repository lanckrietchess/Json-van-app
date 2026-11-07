// Supabase Edge Function: elo-verify (build 9.32.0). Deploy with:  supabase functions deploy elo-verify --no-verify-jwt
// It checks the member's token itself, so --no-verify-jwt is right (the browser also sends the anon key). No extra secrets are needed.
// Run sql/20261107100000_lc59_milestones_proof.sql first. Without this function the app simply shows no milestone pop-up (nothing breaks).
import postgres from "npm:postgres@3.4.4";
import { handle } from "./eloverify.js";

const dbUrl = Deno.env.get("SUPABASE_DB_URL");
const sql = dbUrl ? postgres(dbUrl, { max: 1, prepare: false }) : null;

const deps = {
  fetch,
  async current(uid: string) {
    if (!sql) throw new Error("no database");
    const r = await sql`select site, uname, start_rating, last_rating, peak_rating, last_at from public.lc59_links where user_id = ${uid}::uuid`;
    return r[0] || null;
  },
  async record(uid: string, email: string, site: string, uname: string, rating: number) {
    if (!sql) throw new Error("no database");
    const r = await sql`select public.lc59_link_record(${uid}::uuid, ${email}, ${site}, ${uname}, ${rating}::int) as r`;
    return r[0].r;
  },
};

Deno.serve((req: Request) => handle(req, Deno.env.toObject(), deps));
