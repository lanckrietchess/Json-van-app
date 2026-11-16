/* CORS for the Lanckriet Chess Edge Functions (build 9.24.0). One place decides which web addresses may call a function from a browser.
   Allowed: the production domains, the Vercel address of the app, every Vercel PREVIEW deployment of this team (https://<project>-<hash>-lanckrietchess.vercel.app),
   plus anything in the secret ALLOWED_ORIGINS (comma separated; "*" allows every origin). Localhost only when ALLOW_LOCALHOST=1.
   The answer always names the ONE origin that asked (never a list, never a wrong default), with Vary: Origin, so browsers and CDNs cache it correctly.
   A request from an address that is not allowed gets no Access-Control-Allow-Origin header (the browser then blocks it, which is correct) and the header
   x-lc-cors: blocked, so you can see the reason in the Network tab. */
export const DEFAULT_ORIGINS = ['https://www.lanckrietchess.com', 'https://lanckrietchess.com', 'https://lanckrietchess-app.vercel.app'];
export const PREVIEW_RE = /^https:\/\/[a-z0-9-]+-lanckrietchess\.vercel\.app$/;
const LOCAL_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;
const BASE_HEADERS = ['authorization', 'apikey', 'content-type', 'x-client-info', 'x-health-token'];

export function configuredOrigins(env) {
  return String((env && env.ALLOWED_ORIGINS) || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
}
/* "" = not allowed; "*" = everything; otherwise the origin itself */
export function allowedOrigin(env, origin) {
  env = env || {};
  const o = String(origin || '').trim().replace(/\/+$/, '');
  if (!o) return '';
  const list = configuredOrigins(env);
  if (list.indexOf('*') >= 0) return '*';
  if (DEFAULT_ORIGINS.indexOf(o) >= 0 || list.indexOf(o) >= 0) return o;
  if (String(env.ALLOW_VERCEL_PREVIEWS || '1') !== '0' && PREVIEW_RE.test(o)) return o;
  if (String(env.ALLOW_LOCALHOST || '0') === '1' && LOCAL_RE.test(o)) return o;
  return '';
}
function requestedHeaders(request) {
  const raw = request && request.headers ? request.headers.get('Access-Control-Request-Headers') : '';
  const asked = String(raw || '').split(',').map((s) => s.trim().toLowerCase()).filter((s) => /^[a-z0-9-]{1,40}$/.test(s));
  return Array.from(new Set(BASE_HEADERS.concat(asked))).join(', ');
}
export function corsHeaders(env, request) {
  const origin = request && request.headers ? request.headers.get('Origin') || '' : '';
  const h = { Vary: 'Origin' };
  if (!origin) return h;                                  /* not a browser cross-origin call: nothing to add */
  const a = allowedOrigin(env, origin);
  if (!a) { h['x-lc-cors'] = 'blocked'; return h; }
  h['Access-Control-Allow-Origin'] = a;
  h['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS';
  h['Access-Control-Allow-Headers'] = requestedHeaders(request);
  h['Access-Control-Max-Age'] = '86400';
  return h;
}
/* the final say: whatever CORS headers the wrapped handler set are replaced by ours */
export function applyCors(res, env, request) {
  const h = corsHeaders(env, request);
  const nh = new Headers(res && res.headers ? res.headers : undefined);
  ['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers', 'access-control-max-age', 'access-control-allow-credentials', 'x-lc-cors'].forEach((k) => nh.delete(k));
  const v = nh.get('Vary'); nh.delete('Vary');
  nh.set('Vary', v && !/\borigin\b/i.test(v) ? v + ', Origin' : v || 'Origin');
  Object.keys(h).forEach((k) => { if (k !== 'Vary') nh.set(k, h[k]); });
  return new Response(res ? res.body : null, { status: res ? res.status : 204, statusText: res ? res.statusText : '', headers: nh });
}
export function preflight(env, request) {
  return applyCors(new Response(null, { status: 204 }), env, request);
}
/* drop-in wrapper for any Deno.serve handler (the stripe function): Deno.serve(withCors(handler)) */
export function withCors(handler, envIn) {
  const env = envIn || (typeof Deno !== 'undefined' ? Deno.env.toObject() : {});
  return async function (request) {
    if (request.method === 'OPTIONS') return preflight(env, request);
    let res;
    try { res = await handler(request); }
    catch (e) { console.error('handler threw', e && e.message); res = new Response(JSON.stringify({ ok: false, reason: 'server' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
    return applyCors(res, env, request);
  };
}
