/* A small stand-in for Cloudflare D1 on Node's built-in SQLite (Node 22.5+), for local tests. */
import { DatabaseSync } from 'node:sqlite';
export function makeD1(file) {
  const db = new DatabaseSync(file || ':memory:');
  const norm = (a) => a.map((x) => (x === undefined ? null : typeof x === 'boolean' ? (x ? 1 : 0) : x));
  const plain = (r) => (r ? Object.assign({}, r) : null);
  class Stmt {
    constructor(sql, args) { this.sql = sql; this.args = args || []; }
    bind(...a) { return new Stmt(this.sql, a); }
    async first(col) { const r = plain(db.prepare(this.sql).get(...norm(this.args))); return r && col ? r[col] : r; }
    async all() { return { results: db.prepare(this.sql).all(...norm(this.args)).map(plain), success: true, meta: {} }; }
    async run() {
      const s = db.prepare(this.sql);
      if (/\bRETURNING\b/i.test(this.sql)) { const rows = s.all(...norm(this.args)).map(plain); return { results: rows, success: true, meta: { changes: rows.length } }; }
      const r = s.run(...norm(this.args));
      return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
    }
  }
  return {
    prepare: (sql) => new Stmt(sql),
    async batch(list) { db.exec('BEGIN'); try { const out = []; for (const s of list) out.push(await s.run()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; } },
    async exec(sql) { db.exec(sql); return { count: 1 }; }
  };
}
