// In-process run of the shared suite (node:sqlite stands in for D1). Run: npm run explorer:test
import test from 'node:test';
import { onRequest } from '../server/api.js';
import { D1 } from './d1shim.mjs';
import { makeKeys, AUD } from './keys.mjs';
import { suite, OWNER } from './suite.mjs';

const keys = await makeKeys();
const db = new D1();
const env = { DB: db, ACCESS_AUD: AUD, ALLOW_TEST_KEYS: '1', ACCESS_TEST_JWKS: keys.jwks, OWNER_EMAIL: OWNER };
const ORIGIN = 'https://explorer.test';
async function req(method, path, { token, body, origin = ORIGIN, contentType = 'application/json' } = {}) {
  const headers = {};
  if (token) headers['Cf-Access-Jwt-Assertion'] = token;
  if (method !== 'GET') { if (origin) headers.Origin = origin; headers['content-type'] = contentType; }
  const r = await onRequest({ request: new Request(`${ORIGIN}/api/explorer/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env });
  const text = await r.text(); let b = null; try { b = JSON.parse(text); } catch {}
  return { status: r.status, body: b, text, headers: r.headers };
}
suite(test, { req, keys, db: sql => db.prepare(sql).run() });
