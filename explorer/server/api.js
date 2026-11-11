// Barcode Reliability Explorer API (Cloudflare Pages Function, catch-all under /api/explorer/).
//
// SECURITY MODEL (release 1, restricted reviewer release)
//  * Identity comes ONLY from a verified Cloudflare Access JWT (Cf-Access-Jwt-Assertion header): RS256 signature
//    against the Access team's keys, audience, expiry. No client-supplied identity is ever trusted.
//  * Every endpoint requires an identity, including every evidence endpoint. There are no public endpoints.
//  * env.OWNER_EMAIL (set in the Cloudflare dashboard, never in this public repository) names the owner. Anyone
//    else must be an active reviewer in D1, added by the owner.
//  * State-changing requests must be JSON with a same-origin Origin header (no cross-site form posts).
//  * The evidence release lives in D1, not in the static site, and is served only from here.
//  * Fails closed: without ACCESS_AUD and ACCESS_TEAM_DOMAIN (or test keys), nothing is served.
//
// Bindings: env.DB (D1). Variables: ACCESS_AUD, ACCESS_TEAM_DOMAIN, OWNER_EMAIL.
// Tests only: ACCESS_TEST_JWKS (public keys used instead of the Access team's) together with ALLOW_TEST_KEYS='1'.
import { MIGRATIONS } from './schema.js';
import { CONTRACT, FILES, validateManifest, canonical, sha256 } from '../contract/release.js';

const DECISIONS = ['accept name', 'other name', 'reject as reference', 'unresolved'];
const VOUCHER = ['yes', 'no', 'unknown'];
const now = () => new Date().toISOString();
const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow',
  'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin' };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: HEADERS });
const raw = (text, status = 200) => new Response(text, { status, headers: HEADERS });
const err = (status, message, detail) => json({ error: message, detail }, status);
const lower = s => String(s || '').trim().toLowerCase();

// ---------------------------------------------------------------- identity
const b64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
let certCache = { at: 0, domain: null, keys: null };
async function accessKeys(env) {
  if (env.ALLOW_TEST_KEYS === '1' && env.ACCESS_TEST_JWKS) return JSON.parse(env.ACCESS_TEST_JWKS).keys;
  if (!env.ACCESS_TEAM_DOMAIN) throw new Error('ACCESS_TEAM_DOMAIN is not configured');
  if (certCache.keys && certCache.domain === env.ACCESS_TEAM_DOMAIN && Date.now() - certCache.at < 600000) return certCache.keys;
  const r = await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error('could not fetch the Access signing keys');
  certCache = { at: Date.now(), domain: env.ACCESS_TEAM_DOMAIN, keys: (await r.json()).keys };
  return certCache.keys;
}
export async function verifyAccessJwt(token, env) {
  const [h, p, s] = String(token).split('.');
  if (!h || !p || !s) throw new Error('malformed token');
  const header = JSON.parse(new TextDecoder().decode(b64url(h)));
  const payload = JSON.parse(new TextDecoder().decode(b64url(p)));
  if (header.alg !== 'RS256') throw new Error('unexpected algorithm');
  const key = (await accessKeys(env)).find(k => k.kid === header.kid);
  if (!key) throw new Error('unknown signing key');
  const ck = await crypto.subtle.importKey('jwk', key, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', ck, b64url(s), new TextEncoder().encode(`${h}.${p}`))) throw new Error('bad signature');
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!env.ACCESS_AUD || !aud.includes(env.ACCESS_AUD)) throw new Error('wrong audience');
  const t = Date.now() / 1000;
  if (!payload.exp || payload.exp < t) throw new Error('token expired');
  if (payload.nbf && payload.nbf > t + 60) throw new Error('token not yet valid');
  if (env.ACCESS_TEAM_DOMAIN && payload.iss && payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) throw new Error('wrong issuer');
  if (!payload.email) throw new Error('no e-mail in token');
  return lower(payload.email);
}

async function migrated(env) {
  try { return (await env.DB.prepare("SELECT id, sha256 FROM schema_migrations").all()).results; } catch { return null; }
}

// Returns { email, owner, reviewer (row or null) }.
async function identify(request, env) {
  const t = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!t) return null;
  const email = await verifyAccessJwt(t, env);
  const owner = !!env.OWNER_EMAIL && email === lower(env.OWNER_EMAIL);
  let reviewer = null;
  if (await migrated(env)) {
    reviewer = await env.DB.prepare('SELECT * FROM reviewers WHERE email = ?').bind(email).first();
    if (owner && !reviewer) {
      await env.DB.prepare("INSERT INTO reviewers (email, display_name, role, created_at) VALUES (?, 'Owner', 'owner', ?)").bind(email, now()).run();
      reviewer = await env.DB.prepare('SELECT * FROM reviewers WHERE email = ?').bind(email).first();
    }
    if (reviewer && owner && reviewer.role !== 'owner') reviewer = { ...reviewer, role: 'owner' };
    if (reviewer && !owner && reviewer.role === 'owner') reviewer = null;   // only OWNER_EMAIL is ever the owner
    if (reviewer && !reviewer.active) reviewer = null;
  }
  return { email, owner, reviewer };
}

async function audit(env, actor, action, object, payload) {
  await env.DB.prepare('INSERT INTO audit_events (actor, action, object, payload_sha256, at) VALUES (?, ?, ?, ?, ?)')
    .bind(actor, action, object, await sha256(canonical(payload ?? null)), now()).run();
}
const auditStmt = async (env, actor, action, object, payload) => env.DB.prepare('INSERT INTO audit_events (actor, action, object, payload_sha256, at) VALUES (?, ?, ?, ?, ?)')
  .bind(actor, action, object, await sha256(canonical(payload ?? null)), now());

// ---------------------------------------------------------------- reviews
function currentOf(rows) {
  const superseded = new Set(rows.filter(r => r.supersedes).map(r => r.supersedes));
  const cur = {};
  for (const r of rows) if (!superseded.has(r.id)) cur[r.reviewer_id] = r;
  return Object.values(cur);
}
// The outcome is DERIVED from current FORMAL reviews only; test reviews never count.
export function adjudicate(formal) {
  if (!formal.length) return { status: 'unreviewed', formal_reviewers: 0 };
  const key = r => r.decision + '|' + (r.decision === 'other name' ? lower(r.name_after_review) : '');
  if (formal.length === 1) return { status: 'single formal review', formal_reviewers: 1, decision: formal[0].decision };
  if (new Set(formal.map(key)).size > 1) return { status: 'disputed', formal_reviewers: formal.length };
  if (formal[0].decision === 'unresolved') return { status: 'unresolved', formal_reviewers: formal.length };
  return { status: 'agreed', formal_reviewers: formal.length, decision: formal[0].decision, name: formal[0].name_after_review || null };
}
const publicReview = r => ({ id: r.id, reviewer: r.display_name, mode: r.mode, decision: r.decision, name_after_review: r.name_after_review,
  voucher_confirmed: r.voucher_confirmed, identification_basis: r.identification_basis, boundary_interval: r.boundary_interval && JSON.parse(r.boundary_interval),
  notes: r.notes, supporting_references: r.supporting_references, evidence_sha256: r.evidence_sha256, supersedes: r.supersedes, created_at: r.created_at });

function validateReview(b, c) {
  const e = [];
  if (!DECISIONS.includes(b.decision)) e.push('decision must be one of: ' + DECISIONS.join(', '));
  if (b.decision === 'other name' && !String(b.name_after_review || '').trim()) e.push("give the name when the decision is 'other name'");
  if (!VOUCHER.includes(b.voucher_confirmed)) e.push('voucher_confirmed must be yes, no or unknown');
  if (!String(b.identification_basis || '').trim()) e.push('say what the identification rests on (identification_basis)');
  if (!String(b.notes || '').trim()) e.push('notes are required: record the evidence behind the decision');
  if (b.evidence_sha256 !== c.evidence_sha256) e.push('the evidence has changed since you opened this case; reload it before submitting');
  if (b.boundary_interval != null) {
    const iv = b.boundary_interval;
    if (!Array.isArray(iv) || iv.length !== 2 || !iv.every(Number.isInteger) || iv[0] > iv[1]) e.push('boundary_interval must be [start, end] with start <= end');
  }
  for (const k of ['notes', 'identification_basis', 'supporting_references', 'name_after_review']) if (String(b[k] || '').length > 8000) e.push(`${k} is too long`);
  return e;
}

// ---------------------------------------------------------------- releases
async function importRelease(env, me, b) {
  const errors = [];
  let manifest;
  try { manifest = JSON.parse(b.manifest_text); } catch { return err(400, 'the manifest is not valid JSON'); }
  errors.push(...validateManifest(manifest));
  const texts = { 'records.json': b.records_text, 'cases.json': b.cases_text };
  const digests = {};
  for (const f of FILES) {
    if (typeof texts[f] !== 'string' || !texts[f].length) { errors.push(`${f} is missing`); continue; }
    digests[f] = await sha256(texts[f]);
    if (manifest.files_sha256 && digests[f] !== manifest.files_sha256[f]) errors.push(`${f}: SHA-256 ${digests[f].slice(0, 12)}… does not match the manifest (${String(manifest.files_sha256[f]).slice(0, 12)}…)`);
  }
  if (errors.length) return err(400, 'the release was not imported', errors);
  if (await env.DB.prepare('SELECT id FROM releases WHERE id = ?').bind(manifest.release).first()) return err(409, `release ${manifest.release} already exists; releases are immutable`);
  let cases;
  try { cases = JSON.parse(texts['cases.json']); } catch { return err(400, 'cases.json is not valid JSON'); }
  if (!Array.isArray(cases) || cases.length !== manifest.cases) return err(400, 'cases.json does not match the manifest');
  const clash = cases.length ? (await env.DB.prepare(`SELECT id FROM review_cases WHERE id IN (${cases.map(() => '?').join(',')})`).bind(...cases.map(c => c.case_id)).all()).results : [];
  if (clash.length) return err(409, 'some case ids already exist in an earlier release; case ids must be unique', clash.map(x => x.id));
  const t = now();
  const st = [env.DB.prepare('INSERT INTO releases (id, contract, manifest_json, sha256_manifest, imported_at, imported_by) VALUES (?,?,?,?,?,?)')
    .bind(manifest.release, CONTRACT, b.manifest_text, await sha256(b.manifest_text), t, me.email)];
  for (const f of FILES) st.push(env.DB.prepare('INSERT INTO release_files (release_id, name, sha256, bytes, content) VALUES (?,?,?,?,?)')
    .bind(manifest.release, f, digests[f], new TextEncoder().encode(texts[f]).length, texts[f]));
  for (let i = 0; i < cases.length; i += 12) {          // 7 bound values per case; D1 allows 100 per statement
    const chunk = cases.slice(i, i + 12); const vals = [];
    for (const c of chunk) { const ev = canonical(c); vals.push(c.case_id, manifest.release, c.accession, c.kind, String(c.priority), ev, await sha256(ev)); }
    st.push(env.DB.prepare(`INSERT INTO review_cases (id, release_id, accession, kind, priority, evidence_json, evidence_sha256) VALUES ${chunk.map(() => '(?,?,?,?,?,?,?)').join(',')}`).bind(...vals));
  }
  st.push(await auditStmt(env, me.email, 'import release', manifest.release, { manifest_sha256: await sha256(b.manifest_text), files: digests }));
  await env.DB.batch(st);                                // one transaction: all or nothing
  return json({ imported: true, release: manifest.release, files_sha256: digests, cases: cases.length }, 201);
}

async function releaseList(env) {
  const rows = (await env.DB.prepare('SELECT id, manifest_json, sha256_manifest, imported_at FROM releases ORDER BY imported_at').all()).results;
  return rows.map(r => ({ id: r.id, manifest: JSON.parse(r.manifest_json), sha256_manifest: r.sha256_manifest, imported_at: r.imported_at }));
}

// ---------------------------------------------------------------- handler
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/explorer\/?/, '').replace(/\/$/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const M = request.method;
  if (!env.DB) return err(503, 'the Explorer database is not bound (D1 binding "DB")');
  let who;
  try { who = await identify(request, env); } catch (e) { return err(401, 'sign-in could not be verified', String(e.message || e)); }
  if (!who) return err(401, 'sign-in required (Cloudflare Access)');
  if (M !== 'GET') {
    const origin = request.headers.get('Origin');
    if (!origin || origin !== url.origin) return err(403, 'cross-origin requests are refused');
    if (!(request.headers.get('content-type') || '').startsWith('application/json')) return err(415, 'requests must be JSON');
  }
  const applied = await migrated(env);
  try {
    // ---- owner set-up (works before the schema exists)
    if (parts[0] === 'admin' && parts[1] === 'status' && M === 'GET') {
      if (!who.owner) return err(403, 'only the owner can see the set-up status');
      const have = Object.fromEntries((applied || []).map(r => [r.id, r.sha256]));
      const mig = [];
      for (const m of MIGRATIONS) { const h = await sha256(m.statements.join(';\n')); mig.push({ id: m.id, applied: !!have[m.id], changed_since_applied: !!have[m.id] && have[m.id] !== h }); }
      return json({ owner: who.email, migrations: mig, releases: applied ? (await releaseList(env)).map(r => ({ id: r.id, imported_at: r.imported_at })) : [] });
    }
    if (parts[0] === 'admin' && parts[1] === 'migrate' && M === 'POST') {
      if (!who.owner) return err(403, 'only the owner can change the database schema');
      const have = Object.fromEntries((applied || []).map(r => [r.id, r.sha256]));
      const done = [];
      for (const m of MIGRATIONS) {
        const h = await sha256(m.statements.join(';\n'));
        if (have[m.id]) { if (have[m.id] !== h) return err(409, `migration ${m.id} was changed after it was applied; refusing to continue`); continue; }
        await env.DB.batch([...m.statements.map(s => env.DB.prepare(s)),
          env.DB.prepare('INSERT INTO schema_migrations (id, sha256, applied_at, applied_by) VALUES (?,?,?,?)').bind(m.id, h, now(), who.email)]);
        done.push(m.id);
      }
      if (done.length) await audit(env, who.email, 'apply migrations', done.join(','), { done });
      return json({ applied: done });
    }
    if (!applied) return err(503, 'the Explorer is not set up yet; the owner must apply the database schema first');
    const me = who.reviewer;
    if (!me) return err(403, 'this account is not an active reviewer');

    if (M === 'GET' && parts[0] === 'me') return json({ display_name: me.display_name, role: me.role, formal_reviews_enabled: !!me.formal_reviews_enabled });

    // ---- evidence (restricted: served only here, never as static files)
    if (M === 'GET' && parts[0] === 'releases' && parts.length === 1) return json({ releases: await releaseList(env) });
    if (M === 'GET' && parts[0] === 'releases' && parts.length === 2) {
      const r = (await releaseList(env)).find(x => x.id === parts[1]);
      return r ? json(r) : err(404, 'no such release');
    }
    if (M === 'GET' && parts[0] === 'releases' && parts.length === 3 && FILES.includes(parts[2])) {
      const f = await env.DB.prepare('SELECT content, sha256 FROM release_files WHERE release_id = ? AND name = ?').bind(parts[1], parts[2]).first();
      if (!f) return err(404, 'no such release file');
      const res = raw(f.content); res.headers.set('x-content-sha256', f.sha256); return res;   // byte-for-byte as exported
    }

    // ---- review cases
    if (M === 'GET' && parts[0] === 'cases' && parts.length === 1) {
      const cs = (await env.DB.prepare('SELECT id, release_id, accession, kind, priority, evidence_sha256 FROM review_cases ORDER BY release_id, priority, id').all()).results;
      const rv = (await env.DB.prepare('SELECT id, case_id, reviewer_id, mode, decision, name_after_review, supersedes FROM reviews ORDER BY id').all()).results;
      const by = {}; for (const r of rv) (by[r.case_id] ||= []).push(r);
      return json({ cases: cs.map(c => { const cur = currentOf(by[c.id] || []); const mine = cur.find(r => r.reviewer_id === me.id);
        return { ...c, adjudication: adjudicate(cur.filter(r => r.mode === 'formal')).status, my_current_review: mine ? mine.decision : null, my_mode: mine ? mine.mode : null }; }) });
    }
    if (M === 'GET' && parts[0] === 'cases' && parts.length === 2) {
      const c = await env.DB.prepare('SELECT * FROM review_cases WHERE id = ?').bind(parts[1]).first();
      if (!c) return err(404, 'no such case');
      const all = (await env.DB.prepare('SELECT r.*, v.display_name FROM reviews r JOIN reviewers v ON v.id = r.reviewer_id WHERE case_id = ? ORDER BY r.id').bind(c.id).all()).results;
      const cur = currentOf(all); const mine = all.filter(r => r.reviewer_id === me.id);
      const reviewed = cur.some(r => r.reviewer_id === me.id);
      const reveal = url.searchParams.get('reveal') === '1' && me.role === 'owner';
      // Independence: other reviewers' decisions stay hidden until you have submitted your own review of this case.
      if (reveal && !reviewed) await audit(env, me.email, 'reveal reviews before own review', c.id, { case: c.id });
      const show = reviewed || reveal;
      const { evidence_json, ...meta } = c;
      return json({ case: meta, evidence: JSON.parse(evidence_json), adjudication: adjudicate(cur.filter(r => r.mode === 'formal')),
        my_reviews: mine.map(publicReview), others: show ? all.filter(r => r.reviewer_id !== me.id).map(publicReview) : null, others_hidden: !show,
        others_count: new Set(all.filter(r => r.reviewer_id !== me.id).map(r => r.reviewer_id)).size,
        acceptances: (await env.DB.prepare('SELECT id, target_release, decision, name_accepted, created_at FROM acceptances WHERE case_id = ?').bind(c.id).all()).results });
    }
    if (M === 'POST' && parts[0] === 'reviews' && parts.length === 1) {
      if (me.role === 'observer') return err(403, 'observers cannot submit reviews');
      const b = await request.json();
      const c = await env.DB.prepare('SELECT id, evidence_sha256 FROM review_cases WHERE id = ?').bind(b.case_id).first();
      if (!c) return err(404, 'no such case');
      const errors = validateReview(b, c);
      const mode = b.mode === 'formal' ? 'formal' : 'test';
      if (mode === 'formal' && !me.formal_reviews_enabled) errors.push('formal reviews are not enabled for your account yet; this review can be submitted as a test review');
      if (b.supersedes != null) {
        const prev = await env.DB.prepare('SELECT r.*, (SELECT id FROM reviews WHERE supersedes = r.id) AS superseded_by FROM reviews r WHERE r.id = ?').bind(b.supersedes).first();
        if (!prev || prev.reviewer_id !== me.id || prev.case_id !== c.id) errors.push('you can only supersede your own review of this case');
        else if (prev.superseded_by) errors.push('that review has already been superseded');
        else if (prev.mode === 'formal' && mode === 'test') errors.push('a formal review cannot be superseded by a test review');
      }
      if (errors.length) return err(400, 'the review was not saved', errors);
      const r = await env.DB.prepare(`INSERT INTO reviews (case_id, reviewer_id, mode, decision, name_after_review, voucher_confirmed, identification_basis,
          boundary_interval, notes, supporting_references, evidence_sha256, supersedes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`)
        .bind(c.id, me.id, mode, b.decision, b.decision === 'other name' ? String(b.name_after_review).trim() : null, b.voucher_confirmed, String(b.identification_basis).trim(),
          b.boundary_interval != null ? JSON.stringify(b.boundary_interval) : null, String(b.notes).trim(), String(b.supporting_references || '').trim() || null,
          b.evidence_sha256, b.supersedes ?? null, now()).first();
      await audit(env, me.email, mode === 'formal' ? 'submit formal review' : 'submit test review', c.id, { review_id: r.id, ...b });
      return json({ saved: true, review_id: r.id, mode }, 201);
    }

    // ---- owner only
    if (me.role !== 'owner') return err(403, 'only the owner can do this');
    if (M === 'POST' && parts[0] === 'admin' && parts[1] === 'releases') return importRelease(env, me, await request.json());
    if (M === 'POST' && parts[0] === 'acceptances') {
      const b = await request.json();
      const c = await env.DB.prepare('SELECT id, release_id, priority FROM review_cases WHERE id = ?').bind(b.case_id).first();
      if (!c) return err(404, 'no such case');
      if (!b.target_release || b.target_release === c.release_id) return err(400, 'an acceptance must target a FUTURE release, never the one the case belongs to');
      if (await env.DB.prepare('SELECT id FROM releases WHERE id = ?').bind(b.target_release).first()) return err(400, 'that release already exists; an acceptance can only target a future release');
      const all = (await env.DB.prepare('SELECT * FROM reviews WHERE case_id = ? ORDER BY id').bind(c.id).all()).results;
      const formal = currentOf(all).filter(r => r.mode === 'formal'); const a = adjudicate(formal);
      const need = c.priority === 'A' ? 2 : 1;
      if (formal.length < need) return err(409, `priority ${c.priority} cases need ${need} independent formal review${need > 1 ? 's' : ''}`, { adjudication: a });
      if (!(a.status === 'agreed' || (need === 1 && a.status === 'single formal review' && formal[0].decision !== 'unresolved')))
        return err(409, 'this case has no agreed formal outcome to accept', { adjudication: a });
      const res = await env.DB.prepare('INSERT INTO acceptances (case_id, target_release, accepted_by, basis_review_ids, decision, name_accepted, created_at) VALUES (?,?,?,?,?,?,?) RETURNING id')
        .bind(c.id, b.target_release, me.id, JSON.stringify(formal.map(r => r.id)), formal[0].decision, formal[0].name_after_review || null, now()).first();
      await audit(env, me.email, 'accept outcome into a future release', c.id, { acceptance_id: res.id, target_release: b.target_release, basis: formal.map(r => r.id) });
      return json({ accepted: true, acceptance_id: res.id, target_release: b.target_release, note: 'recorded for a future release; the current release is unchanged' }, 201);
    }
    if (M === 'GET' && parts[0] === 'reviewers') return json({ reviewers: (await env.DB.prepare('SELECT id, email, display_name, role, formal_reviews_enabled, active, created_at FROM reviewers ORDER BY id').all()).results });
    if (M === 'POST' && parts[0] === 'reviewers' && parts.length === 1) {
      const b = await request.json();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email || '') || !['reviewer', 'observer'].includes(b.role) || !String(b.display_name || '').trim())
        return err(400, 'give an e-mail, a display name and a role (reviewer or observer)');
      if (await env.DB.prepare('SELECT id FROM reviewers WHERE email = ?').bind(lower(b.email)).first()) return err(409, 'that reviewer already exists');
      await env.DB.prepare('INSERT INTO reviewers (email, display_name, role, created_at) VALUES (?,?,?,?)').bind(lower(b.email), String(b.display_name).trim(), b.role, now()).run();
      await audit(env, me.email, 'add reviewer', lower(b.email), { role: b.role });
      return json({ added: true }, 201);
    }
    if (M === 'POST' && parts[0] === 'reviewers' && parts.length === 3 && ['formal', 'active'].includes(parts[2])) {
      const b = await request.json(); const id = Number(parts[1]);
      const r = await env.DB.prepare('SELECT * FROM reviewers WHERE id = ?').bind(id).first();
      if (!r) return err(404, 'no such reviewer');
      if (r.role === 'owner' && parts[2] === 'active') return err(400, 'the owner account cannot be deactivated here');
      await env.DB.prepare(`UPDATE reviewers SET ${parts[2] === 'formal' ? 'formal_reviews_enabled' : 'active'} = ? WHERE id = ?`).bind(b.enabled ? 1 : 0, id).run();
      await audit(env, me.email, `${b.enabled ? 'enable' : 'disable'} ${parts[2] === 'formal' ? 'formal reviews' : 'account'}`, r.email, { enabled: !!b.enabled });
      return json({ updated: true });
    }
    if (M === 'GET' && parts[0] === 'audit') return json({ events: (await env.DB.prepare('SELECT * FROM audit_events ORDER BY id DESC LIMIT 500').all()).results });
    return err(404, 'no such endpoint');
  } catch (e) {
    return err(500, 'the server could not complete this request', String(e.message || e));
  }
}
