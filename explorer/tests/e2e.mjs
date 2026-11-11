// End-to-end run of the shared suite over HTTP against the REAL Cloudflare runtime: `wrangler pages dev`
// (workerd + a fresh local D1), serving the built site and the Pages Function exactly as Pages will.
// Real RS256 tokens are verified by the real code path; only the signing keys are test keys.
// Run: npm run build && npm run explorer:e2e
import test from 'node:test';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { makeKeys, AUD } from './keys.mjs';
import { suite, OWNER } from './suite.mjs';

const keys = await makeKeys();
const PORT = 8790 + Math.floor(Math.random() * 100);
const state = fs.mkdtempSync(path.join(os.tmpdir(), 'explorer-e2e-'));
const vars = { ACCESS_AUD: AUD, ALLOW_TEST_KEYS: '1', ACCESS_TEST_JWKS: keys.jwks, OWNER_EMAIL: OWNER };
const args = ['pages', 'dev', 'dist', '--port', String(PORT), '--d1', 'DB', '--persist-to', state, '--compatibility-date', '2026-01-01',
  ...Object.entries(vars).flatMap(([k, v]) => ['--binding', `${k}=${v}`])];
const proc = spawn('node_modules/.bin/wrangler', args, { detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NO_PROXY: 'localhost,127.0.0.1', no_proxy: 'localhost,127.0.0.1', WRANGLER_SEND_METRICS: 'false' } });
let log = ''; proc.stdout.on('data', d => log += d); proc.stderr.on('data', d => log += d);
const BASE = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 120; i++) { try { await fetch(BASE + '/'); break; } catch { await new Promise(r => setTimeout(r, 500)); } if (i === 119) { console.error(log); process.exit(1); } }
const stop = () => { try { process.kill(-proc.pid, 'SIGTERM'); } catch {} };
process.on('exit', stop);
test.after(() => { stop(); if (!process.env.KEEP_STATE) fs.rmSync(state, { recursive: true, force: true }); else console.log('state', state); });

async function req(method, p, { token, body, origin = BASE, contentType = 'application/json' } = {}) {
  const headers = {};
  if (token) headers['Cf-Access-Jwt-Assertion'] = token;
  if (method !== 'GET') { if (origin) headers.Origin = origin; headers['content-type'] = contentType; }
  const r = await fetch(`${BASE}/api/explorer/${p}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); let b = null; try { b = JSON.parse(text); } catch {}
  return { status: r.status, body: b, text, headers: r.headers };
}
suite(test, { req, keys });
test('static pages are served and carry no evidence; security headers are set on Explorer pages', async () => {
  for (const p of ['/explorer/', '/explorer/record/', '/explorer/cases/', '/explorer/case/', '/explorer/admin/', '/investigate/explorer/']) {
    const r = await fetch(BASE + p); const t = await r.text();
    if (r.status !== 200) throw new Error(`${p}: ${r.status}`);
    if (/TEST0001|oriented_sequence|review_priority/.test(t)) throw new Error(`${p} contains evidence`);
    if (p.startsWith('/explorer/') && !/noindex/.test(r.headers.get('x-robots-tag') || '')) throw new Error(`${p}: missing noindex header`);
  }
});
test('on the real D1 engine, the database itself refuses edits and deletes (triggers)', async () => {
  const { execFileSync } = await import('node:child_process');
  const cfg = path.join(state, 'wrangler.toml');
  fs.writeFileSync(cfg, 'name = "e2e"\ncompatibility_date = "2026-01-01"\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "DB"\ndatabase_id = "DB"\n');
  const run = sql => execFileSync('node_modules/.bin/wrangler', ['d1', 'execute', 'DB', '--local', '--persist-to', state, '--config', cfg, '--json', '--command', sql],
    { env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  const runQ = sql => { try { return run(sql); } catch (e) { throw new Error(String(e.stdout) + String(e.stderr)); } };
  const n = JSON.parse(runQ("SELECT count(*) AS n FROM reviews"))[0].results[0].n;
  if (!(n > 0)) throw new Error('expected the suite to have written reviews to the local D1');
  for (const sql of ["UPDATE reviews SET decision = 'accept name'", 'DELETE FROM reviews', 'DELETE FROM audit_events', "UPDATE release_files SET content = 'x'",
    'DELETE FROM releases', "UPDATE review_cases SET priority = 'C'", 'DELETE FROM acceptances', 'DELETE FROM schema_migrations']) {
    let refused = false; try { run(sql); } catch { refused = true; }
    if (!refused) throw new Error('D1 accepted: ' + sql);
  }
  if (JSON.parse(runQ("SELECT count(*) AS n FROM reviews"))[0].results[0].n !== n) throw new Error('reviews changed');
});
