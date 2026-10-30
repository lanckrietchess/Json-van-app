/* handler.js: the part of the Edge Function that is not the Arena itself: settings, the cron entry, and the database wiring.
   No Deno-only APIs here, so the Node tests run exactly this code. index.ts only creates the database client and starts the server. */
import worker from './arena.js';
import { makeDB } from './db.js';

/* The settings the Cloudflare version kept in wrangler.toml [vars]. Override any of them with `supabase secrets set NAME=value`.
   SUPABASE_URL and SUPABASE_ANON_KEY are provided by Supabase to every Edge Function. Secrets (never put these in a file):
   PID_SALT, ADMIN_TOKEN, ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, CRON_SECRET, MEMBER_KEYS (optional).
   VOICE_CHARS_TOTAL is the daily fuse on NEW audio for everybody. Clips are stored in the database (about 0.8 MB per 1,100 characters at this
   format), so the worst case per day is TOTAL / 1100 * 0.8 MB: 100,000 characters is at most about 73 MB a day. Raise it only with the database size in mind. */
export const DEFAULTS = {
  ALLOWED_ORIGINS: 'https://www.lanckrietchess.com,https://lanckrietchess-app.vercel.app',   // the live site and the Vercel address; a Supabase secret named ALLOWED_ORIGINS overrides this, so keep the two in step
  CONTENT_URL: 'https://raw.githubusercontent.com/lanckrietchess/Json-van-app/main/content.json',
  MAX_PUZZLES: '3000', MODEL: 'claude-haiku-4-5-20251001', MAX_TOKENS: '700', AI_DAILY: '60', AI_DAILY_MENTOR: '150', AI_DAILY_TOTAL: '2000', MAX_DEVICES: '3',
  TOKENS_FREE: '1', TOKENS_PRO: '10', TOKENS_VIP_MONTH: '500', TOKENS_VIP_CAP: '500', TOKENS_FREE_IP_CAP: '20', TOKENS_EARN_DAY_CAP: '20', TOKENS_EARN_IP_CAP: '60', SYNC_BACKFILL_DAYS: '30',
  VOICE_MODEL: 'eleven_flash_v2_5', VOICE_FORMAT: 'mp3_44100_64', VOICE_CHARS_FREE: '1500', VOICE_CHARS_PRO: '20000', VOICE_CHARS_VIP: '60000', VOICE_CHARS_FREE_IP: '6000', VOICE_CHARS_TOTAL: '100000'
};

const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const reply = (o, status) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/* sql: a postgres.js client. vars: the environment (Deno.env.toObject()). Returns handle(request, waitUntil). */
export function makeHandler(sql, vars) {
  const env = Object.assign({}, DEFAULTS, vars || {}, { DB: makeDB(sql) });
  return async function handle(request, waitUntil) {
    /* The 6-hourly job: pg_cron calls this with the CRON_SECRET header (see the cron migration). Nobody else can. */
    const given = request.headers.get('x-cron-secret');
    if (given !== null) {
      const want = String(env.CRON_SECRET || '');
      if (request.method !== 'POST' || want.length < 16 || !same(given, want)) return reply({ ok: false, reason: 'forbidden' }, 403);
      let pending = Promise.resolve();
      await worker.scheduled({}, env, { waitUntil: (p) => { pending = p; } });
      try { await pending; } catch (e) { console.error('cron failed', e && e.message); return reply({ ok: false, reason: 'cron_failed' }, 500); }
      return reply({ ok: true, cron: true }, 200);
    }
    return worker.fetch(request, env, { waitUntil: waitUntil || ((p) => p) });
  };
}
