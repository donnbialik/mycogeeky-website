// The Explorer's security and scientific-integrity checks, written once and run two ways:
//   unit.test.mjs  in-process, against node:sqlite (fast; every push)
//   e2e.mjs        over HTTP against the real Cloudflare runtime (wrangler pages dev: workerd + local D1)
// `req(method, path, {token, body, origin, contentType})` -> {status, body, text, headers}.
import assert from 'node:assert/strict';
import { syntheticRelease, syntheticSupplement } from './fixture.mjs';

export const OWNER = 'owner@example.org', R1 = 'r1@example.org', R2 = 'r2@example.org', OBS = 'observer@example.org';

export function suite(test, ctx) {
  const { req, keys } = ctx;
  const as = (email, method, path, body, extra = {}) => req(method, path, { token: keys.sign(email), body, ...extra });
  const REL = syntheticRelease('synthetic-v1');
  const importBody = r => ({ manifest_text: r.manifest_text, records_text: r.records_text, cases_text: r.cases_text });
  const review = (case_id, evidence_sha256, x = {}) => ({ case_id, evidence_sha256, decision: 'accept name', voucher_confirmed: 'unknown',
    identification_basis: 'published morphology and host', notes: 'checked the publication', ...x });
  const hash = async (email, id) => (await as(email, 'GET', 'cases/' + id)).body.case.evidence_sha256;
  const A = REL.cases[0].case_id, A2 = REL.cases[1].case_id, B = REL.cases[2].case_id;

  test('no token: every endpoint refuses (401), including every evidence URL', async () => {
    for (const p of ['me', 'releases', 'releases/synthetic-v1', 'releases/synthetic-v1/records.json', 'releases/synthetic-v1/cases.json', 'cases', `cases/${A}`, 'audit', 'reviewers', 'admin/status'])
      assert.equal((await req('GET', p, {})).status, 401, p);
    assert.equal((await req('POST', 'reviews', { body: {} })).status, 401);
    assert.equal((await req('POST', 'admin/migrate', { body: {} })).status, 401);
  });
  test('forged, expired and wrong-audience tokens are refused', async () => {
    assert.equal((await req('GET', 'me', { token: keys.forge(OWNER) })).status, 401);
    assert.equal((await req('GET', 'me', { token: keys.sign(OWNER, { exp: 1 }) })).status, 401);
    assert.equal((await req('GET', 'me', { token: keys.sign(OWNER, { aud: ['someone-else'] }) })).status, 401);
    assert.equal((await req('GET', 'me', { token: 'not.a.token' })).status, 401);
  });
  test('before set-up: nothing is served; only the owner may apply the schema', async () => {
    assert.equal((await as(OWNER, 'GET', 'cases')).status, 503);
    assert.equal((await as(R1, 'POST', 'admin/migrate', {})).status, 403);
    const s = await as(OWNER, 'GET', 'admin/status');
    assert.equal(s.status, 200); assert.ok(s.body.migrations.every(m => !m.applied));
  });
  test('state-changing requests need a same-origin JSON request', async () => {
    assert.equal((await as(OWNER, 'POST', 'admin/migrate', {}, { origin: 'https://evil.example' })).status, 403);
    assert.equal((await as(OWNER, 'POST', 'admin/migrate', {}, { origin: null })).status, 403);
    assert.equal((await as(OWNER, 'POST', 'admin/migrate', {}, { contentType: 'text/plain' })).status, 415);
  });
  test('owner applies the schema once; it is recorded and audited', async () => {
    const m = await as(OWNER, 'POST', 'admin/migrate', {});
    assert.equal(m.status, 200, JSON.stringify(m.body)); assert.deepEqual(m.body.applied, ['0001_release1', '0002_supplements']);
    assert.deepEqual((await as(OWNER, 'POST', 'admin/migrate', {})).body.applied, []);
    assert.ok((await as(OWNER, 'GET', 'admin/status')).body.migrations.every(x => x.applied && !x.changed_since_applied));
  });
  test('an unknown account is refused even with a valid sign-in', async () => {
    assert.equal((await as('stranger@example.org', 'GET', 'releases/synthetic-v1/records.json')).status, 403);
    assert.equal((await as('stranger@example.org', 'GET', 'cases')).status, 403);
  });
  test('release import: refused on a hash mismatch, a bad contract or by a non-owner', async () => {
    const bad = importBody(REL); bad.records_text = bad.records_text.replace('Testus alpha', 'Testus gamma');
    const r = await as(OWNER, 'POST', 'admin/releases', bad); assert.equal(r.status, 400); assert.match(r.body.detail.join(' '), /does not match the manifest/);
    const m = { ...REL.manifest, human_review: { status: 'complete', label: 'validated' } };
    const r2 = await as(OWNER, 'POST', 'admin/releases', { ...importBody(REL), manifest_text: JSON.stringify(m) });
    assert.equal(r2.status, 400); assert.match(r2.body.detail.join(' '), /human_review/);
    assert.equal((await as(R1, 'POST', 'admin/releases', importBody(REL))).status, 403);
  });
  test('release import: accepted once, byte-for-byte, then immutable', async () => {
    const r = await as(OWNER, 'POST', 'admin/releases', importBody(REL));
    assert.equal(r.status, 201, JSON.stringify(r.body)); assert.equal(r.body.cases, REL.cases.length);
    assert.equal((await as(OWNER, 'POST', 'admin/releases', importBody(REL))).status, 409);
    const f = await as(OWNER, 'GET', 'releases/synthetic-v1/records.json');
    assert.equal(f.status, 200); assert.equal(f.text, REL.records_text); assert.equal(f.headers.get('x-content-sha256'), REL.manifest.files_sha256['records.json']);
    assert.equal(f.headers.get('cache-control'), 'no-store');
    const l = await as(OWNER, 'GET', 'releases'); assert.equal(l.body.releases[0].manifest.human_review.status, 'none');
  });
  test('owner adds reviewers and an observer; formal reviews start disabled', async () => {
    for (const [e, n, role] of [[R1, 'Reviewer One', 'reviewer'], [R2, 'Reviewer Two', 'reviewer'], [OBS, 'Observer', 'observer']])
      assert.equal((await as(OWNER, 'POST', 'reviewers', { email: e, display_name: n, role })).status, 201);
    assert.equal((await as(R1, 'POST', 'reviewers', { email: 'x@example.org', display_name: 'X', role: 'reviewer' })).status, 403);
    assert.equal((await as(OWNER, 'POST', 'reviewers', { email: 'y@example.org', display_name: 'Y', role: 'owner' })).status, 400, 'nobody can be made owner');
    const me = await as(R1, 'GET', 'me'); assert.equal(me.status, 200); assert.equal(me.body.formal_reviews_enabled, false);
    assert.equal(me.body.email, undefined, 'the API does not echo e-mail addresses to pages');
  });
  test('every case is loaded and unreviewed; reviewers can read the evidence', async () => {
    const r = await as(R1, 'GET', 'cases'); assert.equal(r.body.cases.length, REL.cases.length);
    assert.ok(r.body.cases.every(c => c.adjudication === 'unreviewed'));
    const c = await as(R1, 'GET', 'cases/' + A); assert.equal(c.body.evidence.accession, REL.cases[0].accession);
  });
  test('reviews default to test mode; test reviews never count; formal is refused until enabled', async () => {
    const h = await hash(OWNER, A);
    assert.equal((await as(OWNER, 'POST', 'reviews', review(A, h, { mode: 'formal' }))).status, 400);
    const t = await as(OWNER, 'POST', 'reviews', review(A, h)); assert.equal(t.status, 201); assert.equal(t.body.mode, 'test');
    assert.equal((await as(OWNER, 'GET', 'cases/' + A)).body.adjudication.status, 'unreviewed');
  });
  test('observers cannot review; incomplete or stale reviews are refused with reasons', async () => {
    const h = await hash(R1, A);
    assert.equal((await as(OBS, 'POST', 'reviews', review(A, h))).status, 403);
    const r = await as(R1, 'POST', 'reviews', review(A, 'stale', { decision: 'other name', notes: '' }));
    assert.equal(r.status, 400); assert.equal(r.body.detail.length, 3);
  });
  test('corrections supersede (once, own reviews only); history keeps both', async () => {
    const h = await hash(R1, B);
    const a = (await as(R1, 'POST', 'reviews', review(B, h))).body.review_id;
    const b = await as(R1, 'POST', 'reviews', review(B, h, { decision: 'unresolved', supersedes: a })); assert.equal(b.status, 201);
    assert.equal((await as(R1, 'POST', 'reviews', review(B, h, { supersedes: a }))).status, 400, 'cannot supersede twice');
    assert.equal((await as(R2, 'POST', 'reviews', review(B, h, { supersedes: b.body.review_id }))).status, 400, "cannot supersede another reviewer's review");
    assert.equal((await as(R1, 'GET', 'cases/' + B)).body.my_reviews.length, 2);
  });
  test('independence: others hidden until you review; an owner reveal is audited', async () => {
    const v = await as(R2, 'GET', 'cases/' + B); assert.equal(v.body.others_hidden, true); assert.equal(v.body.others, null); assert.equal(v.body.others_count, 1);
    await as(R2, 'POST', 'reviews', review(B, await hash(R2, B)));
    const w = await as(R2, 'GET', 'cases/' + B); assert.equal(w.body.others_hidden, false); assert.equal(w.body.others.length, 2);
    const o = await as(OWNER, 'GET', 'cases/' + A2 + '?reveal=1'); assert.equal(o.body.others_hidden, false);
    const au = await as(OWNER, 'GET', 'audit'); assert.ok(au.body.events.some(e => e.action === 'reveal reviews before own review'));
    assert.equal((await as(R1, 'GET', 'audit')).status, 403);
  });
  test('formal outcome needs two agreeing formal reviews for priority A; acceptance only into a FUTURE release', async () => {
    const ids = Object.fromEntries((await as(OWNER, 'GET', 'reviewers')).body.reviewers.map(r => [r.email, r.id]));
    for (const e of [R1, R2]) assert.equal((await as(OWNER, 'POST', `reviewers/${ids[e]}/formal`, { enabled: true })).status, 200);
    const h = await hash(R1, A2);
    assert.equal((await as(R1, 'POST', 'reviews', review(A2, h, { mode: 'formal' }))).status, 201);
    assert.equal((await as(OWNER, 'POST', 'acceptances', { case_id: A2, target_release: 'synthetic-v2' })).status, 409, 'one formal review is not enough for A');
    assert.equal((await as(R2, 'POST', 'reviews', review(A2, h, { mode: 'formal' }))).status, 201);
    assert.equal((await as(R1, 'GET', 'cases/' + A2)).body.adjudication.status, 'agreed');
    assert.equal((await as(OWNER, 'POST', 'acceptances', { case_id: A2, target_release: 'synthetic-v1' })).status, 400, 'never into the current release');
    assert.equal((await as(R1, 'POST', 'acceptances', { case_id: A2, target_release: 'synthetic-v2' })).status, 403, 'only the owner accepts');
    const ok = await as(OWNER, 'POST', 'acceptances', { case_id: A2, target_release: 'synthetic-v2' }); assert.equal(ok.status, 201);
    const f = await as(R1, 'GET', 'releases/synthetic-v1/records.json'); assert.equal(f.text, REL.records_text, 'the current release is unchanged');
  });
  test('supplement import: owner only; refused with location fields, wrong release hashes or unknown cases', async () => {
    const S = syntheticSupplement(REL);
    assert.equal((await as(R1, 'POST', 'admin/supplements', { supplement_text: S.text })).status, 403);
    const loc = JSON.parse(S.text); loc.cases[A].inaturalist[0].location = '45.1,-89.2';
    const r1 = await as(OWNER, 'POST', 'admin/supplements', { supplement_text: JSON.stringify(loc) }); assert.equal(r1.status, 400); assert.match(r1.body.detail.join(' '), /location fields/);
    const geo = JSON.parse(S.text); geo.cases[A].inaturalist[0].geojson = { coordinates: [1, 2] };
    assert.equal((await as(OWNER, 'POST', 'admin/supplements', { supplement_text: JSON.stringify(geo) })).status, 400);
    const other = syntheticSupplement(REL, { release_files_sha256: { 'records.json': '0'.repeat(64), 'cases.json': '0'.repeat(64) } });
    const r2 = await as(OWNER, 'POST', 'admin/supplements', { supplement_text: other.text }); assert.equal(r2.status, 400); assert.match(r2.body.detail.join(' '), /different evidence/);
    const bad = JSON.parse(S.text); bad.cases['A-NOPE.1'] = bad.cases[A];
    assert.equal((await as(OWNER, 'POST', 'admin/supplements', { supplement_text: JSON.stringify(bad) })).status, 400);
    const ph = JSON.parse(S.text); ph.cases[A].inaturalist[0].photos[0].url = 'https://evil.example/x.jpg';
    assert.equal((await as(OWNER, 'POST', 'admin/supplements', { supplement_text: JSON.stringify(ph) })).status, 400, 'photos only from iNaturalist hosts');
  });
  test('supplement import: accepted once, pinned by hash, shown with the case, immutable', async () => {
    const S = syntheticSupplement(REL);
    const r = await as(OWNER, 'POST', 'admin/supplements', { supplement_text: S.text }); assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal((await as(OWNER, 'POST', 'admin/supplements', { supplement_text: S.text })).status, 409);
    const v = await as(R1, 'GET', 'cases/' + A); assert.equal(v.body.supplements.length, 1);
    assert.equal(v.body.supplements[0].sha256, r.body.sha256); assert.equal(v.body.supplements[0].entry.inaturalist.length, 2);
    assert.equal(v.body.supplements[0].header.cases, undefined);
    assert.equal((await as(R1, 'GET', 'cases/' + B)).body.supplements.length, 0);
  });
  test('reviews cite corroborators only from the case supplement; citations are stored', async () => {
    const v = await as(R2, 'GET', 'cases/' + A); const sh = v.body.supplements[0].sha256; const h = v.body.case.evidence_sha256;
    const bad = await as(R2, 'POST', 'reviews', review(A, h, { supplement_sha256: sh, cited: ['iNaturalist 123', 'GenBank TEST0002.1'] }));
    assert.equal(bad.status, 400); assert.match(bad.body.detail.join(' '), /not a corroborator/);
    assert.equal((await as(R2, 'POST', 'reviews', review(A, h, { supplement_sha256: 'f'.repeat(64), cited: [] }))).status, 400);
    const ok = await as(R2, 'POST', 'reviews', review(A, h, { supplement_sha256: sh, cited: ['iNaturalist 9000001', 'GenBank TEST0002.1'] })); assert.equal(ok.status, 201);
    const mine = (await as(R2, 'GET', 'cases/' + A)).body.my_reviews.at(-1);
    assert.deepEqual(mine.cited, ['GenBank TEST0002.1', 'iNaturalist 9000001']); assert.equal(mine.supplement_sha256, sh);
  });
  test('a formal review cannot be superseded by a test review', async () => {
    const v = await as(R1, 'GET', 'cases/' + A2); const mine = v.body.my_reviews.at(-1);
    assert.equal((await as(R1, 'POST', 'reviews', review(A2, mine.evidence_sha256, { supersedes: mine.id }))).status, 400);
  });
  test('deactivated reviewers lose access immediately', async () => {
    const ids = Object.fromEntries((await as(OWNER, 'GET', 'reviewers')).body.reviewers.map(r => [r.email, r.id]));
    assert.equal((await as(OWNER, 'POST', `reviewers/${ids[OBS]}/active`, { enabled: false })).status, 200);
    assert.equal((await as(OBS, 'GET', 'cases')).status, 403);
  });
  if (ctx.db) test('the database itself refuses edits and deletes of evidence, reviews and the audit log', async () => {
    for (const sql of ["UPDATE reviews SET decision = 'accept name'", 'DELETE FROM reviews', 'DELETE FROM audit_events', "UPDATE release_files SET content = 'x'",
      'DELETE FROM releases', "UPDATE review_cases SET priority = 'C'", 'DELETE FROM acceptances', 'DELETE FROM schema_migrations',
      "UPDATE supplement_cases SET content_json = '{}'", 'DELETE FROM supplements'])
      await assert.rejects(ctx.db(sql), undefined, sql);
  });
}
