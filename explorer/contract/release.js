// Data contract between the engine (barcode-reliability-explorer) and the website: bre-release/1.
// The website displays an immutable evidence release WITHOUT the engine source or a Python runtime.
// See explorer/contract/README.md. Used by the server (manifest checks), the admin page (full checks in the
// owner's browser before upload) and the tests.

export const CONTRACT = 'bre-release/1';
export const FILES = ['records.json', 'cases.json'];
export const CASE_KINDS = ['reference identity', 'boundary'];
const ID = /^[a-z0-9][a-z0-9-]{1,63}$/;
const HEX = /^[0-9a-f]{64}$/;

// Manifest fields that the interface must show (scientific disclosures, condition B of the M8 authorization).
export function validateManifest(m) {
  const e = [];
  if (!m || typeof m !== 'object') return ['the manifest is not a JSON object'];
  if (m.contract !== CONTRACT) e.push(`contract must be "${CONTRACT}"`);
  if (!ID.test(m.release || '')) e.push('release must be a short lowercase id such as "laetiporus-v1"');
  if (!m.engine || typeof m.engine !== 'string') e.push('engine version is required');
  for (const f of FILES) if (!HEX.test((m.files_sha256 || {})[f] || '')) e.push(`files_sha256["${f}"] must be a SHA-256 hex digest`);
  if (!Number.isInteger(m.records) || m.records < 1) e.push('records must be a positive integer');
  if (!Number.isInteger(m.cases) || m.cases < 0) e.push('cases must be a non-negative integer');
  if (!Array.isArray(m.disclosures) || !m.disclosures.length) e.push('disclosures are required');
  const hr = m.human_review || {};
  if (!['none', 'partial'].includes(hr.status)) e.push('human_review.status must be "none" or "partial" (a release can never claim full human validation by itself)');
  if (typeof hr.label !== 'string' || !hr.label) e.push('human_review.label is required');
  if (!Array.isArray(m.safeguards)) e.push('safeguards must be a list (name, version, validation_status)');
  else for (const s of m.safeguards) if (!s.name || !s.version || !s.validation_status) e.push('each safeguard needs name, version and validation_status');
  if (!Array.isArray(m.tiers)) e.push('tiers must be a list (id, name, validation_status)');
  else for (const t of m.tiers) if (!t.id || !t.name || !t.validation_status) e.push('each tier needs id, name and validation_status');
  if (!m.interpretation_limits || !Array.isArray(m.interpretation_limits) || !m.interpretation_limits.length) e.push('interpretation_limits are required');
  return e;
}

// Full structural checks of the evidence files (run in the owner's browser before upload, and in tests).
export function validateEvidence(m, records, cases) {
  const e = [];
  if (!Array.isArray(records)) return ['records.json must be a list'];
  if (!Array.isArray(cases)) return ['cases.json must be a list'];
  if (records.length !== m.records) e.push(`the manifest says ${m.records} records; records.json has ${records.length}`);
  if (cases.length !== m.cases) e.push(`the manifest says ${m.cases} cases; cases.json has ${cases.length}`);
  const acc = new Set();
  for (const r of records) {
    if (!r.accession) { e.push('a record has no accession'); continue; }
    if (acc.has(r.accession)) e.push(`duplicate record ${r.accession}`);
    acc.add(r.accession);
    if (!r.review_status) e.push(`${r.accession}: review_status is required`);
    if (/human[- ]validated|accepted reference/i.test(r.review_status || '') && m.human_review.status === 'none') e.push(`${r.accession}: review_status claims human review, but the release has none`);
  }
  const ids = new Set();
  for (const c of cases) {
    if (!c.case_id) { e.push('a case has no case_id'); continue; }
    if (ids.has(c.case_id)) e.push(`duplicate case ${c.case_id}`);
    ids.add(c.case_id);
    if (!acc.has(c.accession)) e.push(`${c.case_id}: accession ${c.accession} is not a record of the release`);
    if (!CASE_KINDS.includes(c.kind)) e.push(`${c.case_id}: kind must be one of ${CASE_KINDS.join(', ')}`);
    if (!c.priority) e.push(`${c.case_id}: priority is required`);
  }
  return e.slice(0, 50);
}

// Canonical JSON (all object keys sorted, at every depth): the review evidence hash is SHA-256 of this text.
export function canonical(o) {
  if (Array.isArray(o)) return '[' + o.map(canonical).join(',') + ']';
  if (o && typeof o === 'object') return '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
  return JSON.stringify(o);
}

export async function sha256(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
