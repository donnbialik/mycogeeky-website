// Minimal Cloudflare D1 interface over node:sqlite, for unit tests only. The end-to-end tests (e2e.mjs) run
// against the real Cloudflare runtime (wrangler pages dev, workerd + local D1) instead.
import { DatabaseSync } from 'node:sqlite';
class Stmt {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...a) { return new Stmt(this.db, this.sql, a); }
  async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args), success: true }; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { success: true, meta: { changes: r.changes } }; }
  _exec() { const s = this.db.prepare(this.sql); return /^\s*(select|insert[\s\S]*returning)/i.test(this.sql) ? s.all(...this.args) : s.run(...this.args); }
}
export class D1 {
  constructor(path = ':memory:') { this.db = new DatabaseSync(path); this.db.exec('PRAGMA foreign_keys = ON'); }
  prepare(sql) { return new Stmt(this.db, sql); }
  async batch(stmts) {
    this.db.exec('BEGIN');
    try { const out = stmts.map(s => s._exec()); this.db.exec('COMMIT'); return out; } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
}
