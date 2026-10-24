/* db.js: the Worker was written against Cloudflare D1 (prepare / bind / first / all / run / batch). This gives the same shape on Postgres,
   so the Arena's logic did not have to be rewritten. `sql` is a postgres.js client. Used by index.ts (Deno) and by the Node tests. */
export const TABLES = ['players', 'quota', 'scores', 'results', 'settled', 'activations', 'member_pids', 'puzzles', 'ai_usage', 'lb_players', 'lb_attempts',
  'lb_scores', 'lb_vol', 'ev_events', 'vb_items', 'tr_games', 'tr_solved', 'elo_accounts', 'pz_players', 'v6_cfg', 'v6_arena_log', 'v6_bench', 'v6_events',
  'token_ledger', 'token_bonus', 'token_spend', 'token_grant_log', 'sync_accounts', 'sync_games', 'voice_cache'];
const TABLE_RE = new RegExp('\\b(FROM|JOIN|INTO|UPDATE)(\\s+)(' + TABLES.join('|') + ')\\b', 'gi');

/* ? -> $1.. ; table names -> arena.<table> ; INSERT OR IGNORE -> ON CONFLICT DO NOTHING */
export function translate(query) {
  let s = String(query), ignore = false;
  s = s.replace(/INSERT\s+OR\s+IGNORE\s+INTO/i, () => { ignore = true; return 'INSERT INTO'; });
  s = s.replace(TABLE_RE, (m, kw, sp, t) => kw + sp + 'arena.' + t.toLowerCase());
  if (ignore) s = /\bRETURNING\b/i.test(s) ? s.replace(/\s+RETURNING\b/i, ' ON CONFLICT DO NOTHING RETURNING') : s.replace(/\s*;?\s*$/, ' ON CONFLICT DO NOTHING');
  let i = 0;
  return s.replace(/\?/g, () => '$' + (++i));
}
const clean = (a) => a.map((v) => (v === undefined ? null : v === true ? 1 : v === false ? 0 : v));

/* Options that make postgres.js return plain numbers for BIGINT / NUMERIC (COUNT, SUM), like D1 did. */
export const PG_TYPES = {
  bigint: { to: 20, from: [20, 1700], serialize: (x) => String(x), parse: (x) => Number(x) }
};

class Stmt {
  constructor(sql, query) { this.sql = sql; this.q = translate(query); this.a = []; }
  bind(...a) { this.a = clean(a); return this; }
  async run() { const r = await this.sql.unsafe(this.q, this.a); return { meta: { changes: r.count } }; }
  async first() { const r = await this.sql.unsafe(this.q, this.a); return r.length ? r[0] : null; }
  async all() { const r = await this.sql.unsafe(this.q, this.a); return { results: Array.from(r) }; }
}
export function makeDB(sql) {
  return {
    prepare: (query) => new Stmt(sql, query),
    async batch(list) {                                  // all or nothing, like D1's batch
      return sql.begin(async (tx) => {
        const out = [];
        for (const s of list) { const r = await tx.unsafe(s.q, s.a); out.push({ meta: { changes: r.count }, results: Array.from(r) }); }   // D1's result shape
        return out;
      });
    }
  };
}
