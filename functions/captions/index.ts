// Supabase Edge Function: captions (build 9.37.0). Exact speech-to-text with word timings for the Creator Studio Edit tool (owner / admin only).
// Deploy:  supabase functions deploy captions --no-verify-jwt     (the function checks the member's token and admin rights itself)
// Secrets: supabase secrets set ELEVENLABS_API_KEY=...   optional: CAPTIONS_MODEL (default scribe_v1), CAPTIONS_ENABLED=0, ALLOWED_ORIGINS
// Needs sql/20261113100000_lc72_lc73_launch_funnels.sql (lc72_caption_allow: admin check + daily seconds cap, setting captions_daily_sec).
import { handle } from "./captions.js";
Deno.serve((req: Request) => handle(req, Deno.env.toObject(), { fetch }));
