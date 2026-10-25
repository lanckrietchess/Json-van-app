"""LC34: arena.js free tier gets 3 tokens a day for the first 7 days (per player, from players.created).
   python3 patch_arena_v34.py <in arena.js> <out arena.js>      every anchor must match exactly once (limitsOf calls: 4).
   Env: TOKENS_FREE (1, the normal free limit), TOKENS_FREE_BOOST (3), TOKENS_FREE_BOOST_DAYS (7; 0 switches the boost off)."""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def once(a, b, label, n=1):
    global s
    c = s.count(a)
    if c != n: sys.exit(f"PATCH FAILED [{label}]: anchor found {c}x, expected {n}")
    s = s.replace(a, b); print("ok", label)

once("  const row = await env.DB.prepare('SELECT name, banned FROM players WHERE pid = ?').bind(pid).first();\n  return { pid, name: (row && row.name) || name, banned: !!(row && row.banned) };",
     "  const row = await env.DB.prepare('SELECT name, banned, created FROM players WHERE pid = ?').bind(pid).first();\n  return { pid, name: (row && row.name) || name, banned: !!(row && row.banned), created: row && row.created ? +row.created : t };", "touch returns created")
once("return { id: 'free', name: 'free', owner: me.pid, keyPresented: presented, reason };",
     "return { id: 'free', name: 'free', owner: me.pid, keyPresented: presented, reason, created: me.created };", "tierOf carries created")
once("""function limitsOf(env, name) {
  if (name === 'vip') return { limit: envInt(env.TOKENS_VIP_CAP, 1, 100000, 500), unlimited: true };
  if (name === 'pro') return { limit: envInt(env.TOKENS_PRO, 1, 1000, 10), unlimited: false };
  return { limit: envInt(env.TOKENS_FREE, 0, 100, 1), unlimited: false };
}""", """function limitsOf(env, name, created) {
  if (name === 'vip') return { limit: envInt(env.TOKENS_VIP_CAP, 1, 100000, 500), unlimited: true };
  if (name === 'pro') return { limit: envInt(env.TOKENS_PRO, 1, 1000, 10), unlimited: false };
  const base = envInt(env.TOKENS_FREE, 0, 100, 1), days = envInt(env.TOKENS_FREE_BOOST_DAYS, 0, 60, 7), boost = envInt(env.TOKENS_FREE_BOOST, 0, 100, 3);
  /* the habit week: a new free player gets TOKENS_FREE_BOOST a day for TOKENS_FREE_BOOST_DAYS days, counted from the first time this device reached the server */
  if (days > 0 && created && boost > base && now() - created < days * 864e5) return { limit: boost, unlimited: false, boosted: true, boostEnds: created + days * 864e5 };
  return { limit: base, unlimited: false };
}""", "limitsOf first week")
once("limitsOf(env, t.name)", "limitsOf(env, t.name, t.created)", "limitsOf call sites", 4)
once("verified: !(t.keyPresented && t.name === 'free'),", "week1: !!L.boosted, week1Ends: L.boosted ? L.boostEnds : 0, verified: !(t.keyPresented && t.name === 'free'),", "token view exposes the habit week")
open(dst, 'w', encoding='utf-8').write(s)
