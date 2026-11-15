/* Arena guard (LC47, build 9.20.6): wraps the arena handler so that the function can never go down without an explanation.
   - no crash at start-up when the database address is missing: the function answers 503 JSON (with CORS) instead of "BOOT_ERROR" / a bare 500
   - an exception that escapes the handler becomes a JSON 500 with CORS headers (the real error is in the logs)
   - OPTIONS always works, and every answer carries CORS headers for the origin that asked (cors.js: production domains, Vercel previews of this team, ALLOWED_ORIGINS),
     whatever the wrapped handler set: the guard has the final say
   - GET ?health=1 with the header  x-health-token: <ADMIN_TOKEN>  returns a diagnosis: which secrets are set (true/false only), whether the database answers,
     which arena tables are missing and which Supabase functions the arena depends on are missing. No secret value is ever returned. */
export const REQUIRED_TABLES = ['activations', 'ai_usage', 'elo_accounts', 'ev_events', 'lb_attempts', 'lb_players', 'lb_scores', 'lb_vol', 'lc26_first_trim', 'lc27_ad_rules', 'lc27_chat', 'lc27_creators', 'lc27_flags', 'lc27_groups', 'lc27_mod', 'lc27_streams', 'lc27_strikes', 'lc28_assets', 'lc28_settings', 'lc28_tracks', 'member_pids', 'players', 'puzzles', 'pz_players', 'quota', 'results', 'scores', 'settled', 'sync_accounts', 'sync_games', 'token_bonus', 'token_grant_log', 'token_ledger', 'token_spend', 'tr_games', 'tr_solved', 'v6_arena_log', 'v6_bench', 'v6_cfg', 'v6_events', 'vb_items', 'voice_cache'];
export const REQUIRED_RPCS = ['lc_license_status', 'lc7_auth', 'lc19_group_roster'];
const SECRETS = ['ADMIN_TOKEN', 'PID_SALT', 'ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'ALLOWED_ORIGINS', 'CONTENT_URL', 'ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID', 'CRON_SECRET', 'TOKENS_FREE', 'TOKENS_PRO', 'TOKENS_VIP_CAP'];

import { corsHeaders, applyCors, preflight, allowedOrigin, configuredOrigins, DEFAULT_ORIGINS, PREVIEW_RE } from './cors.js';
export { corsHeaders, applyCors, allowedOrigin };
const json = (o, status, h) => new Response(JSON.stringify(o), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, h) });
function same(a, b) { if (!a || !b || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

export async function health(sql, env, bootError, request) {
  const out = { ok: true, service: 'lanckriet-arena', guard: 'lc47', boot: bootError ? { ok: false, error: bootError } : { ok: true },
    secrets: {}, db: { ok: false }, tables: { missing: [] }, rpc: { missing: [] },
    cors: { allowed: DEFAULT_ORIGINS.concat(configuredOrigins(env)), vercel_previews: String(env.ALLOW_VERCEL_PREVIEWS || '1') !== '0', preview_pattern: String(PREVIEW_RE), request_origin: (request && request.headers && request.headers.get('Origin')) || '', request_origin_allowed: !!allowedOrigin(env, request && request.headers && request.headers.get('Origin')) } };
  SECRETS.forEach((k) => { out.secrets[k] = !!String(env[k] || '').length; });
  out.secrets.DB_URL = !!(env.ARENA_DB_URL || env.SUPABASE_DB_URL);
  if (!sql) { out.ok = false; return out; }
  const t0 = Date.now();
  try {
    await sql.unsafe('select 1');
    out.db = { ok: true, ms: Date.now() - t0 };
    const have = new Set((await sql.unsafe("select table_name from information_schema.tables where table_schema = 'arena'")).map((r) => r.table_name));
    out.tables.missing = REQUIRED_TABLES.filter((t) => !have.has(t));
    const fns = new Set((await sql.unsafe("select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'")).map((r) => r.proname));
    out.rpc.missing = REQUIRED_RPCS.filter((f) => !fns.has(f));
    if (out.tables.missing.length) out.hint = 'Run sql/20261031200000_lc47_arena_schema.sql in the Supabase SQL editor.';
  } catch (e) {
    out.ok = false; out.db = { ok: false, error: String(e && e.message || e).slice(0, 200) };
  }
  if (out.tables.missing.length || out.rpc.missing.length || !out.db.ok) out.ok = false;
  return out;
}

export function guard({ sql, handle, env, bootError, waitUntil }) {
  return async function (request) {
    if (request.method === 'OPTIONS') return preflight(env, request);
    const fin = (res) => applyCors(res, env, request);
    try {
      if (request.method === 'GET') {
        const u = new URL(request.url);
        if (u.searchParams.has('health') && same(String(env.ADMIN_TOKEN || ''), request.headers.get('x-health-token') || '') && String(env.ADMIN_TOKEN || '').length >= 16)
          return fin(json(await health(sql, env, bootError, request), 200, {}));
      }
      if (!handle) return fin(json({ ok: false, reason: 'server', boot: true }, 503, {}));
      return fin(await handle(request, waitUntil));
    } catch (e) {
      console.error('arena handler threw', e && e.code, e && e.message);
      return fin(json({ ok: false, reason: 'server' }, 500, {}));
    }
  };
}