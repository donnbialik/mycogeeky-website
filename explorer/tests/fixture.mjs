// A SYNTHETIC evidence release for tests (invented accessions and sequences). Real evidence never enters this
// public repository: it is uploaded by the owner into D1 behind Cloudflare Access.
import { canonical } from '../contract/release.js';
import crypto from 'node:crypto';
const h = t => crypto.createHash('sha256').update(t).digest('hex');

export function syntheticRelease(id = 'synthetic-v1') {
  const records = Array.from({ length: 6 }, (_, i) => ({
    accession: `TEST${String(i + 1).padStart(4, '0')}.1`, collection: `C${i}`, name_as_applied: i < 3 ? 'Testus alpha' : 'Testus beta',
    set: 'core', review_status: 'computationally curated, not human-reviewed', review_priority: i < 2 ? 'A' : 'C', flags: i === 0 ? ['RECOVERED-BOUNDARY'] : [],
    primary_regions: 'ITS1+5.8S+ITS2', reference_anchored_regions: 'ITS1+5.8S+ITS2', crosscheck: { ITS1_start: i === 1 ? 'conflicting' : 'concordant', ITS2_end: 'not checkable: insufficient reference support' },
    provenance: { country: 'Testland', publication: 'none (synthetic)' }, identification_basis: 'synthetic', sequences_in_collection: 1 }));
  const cases = [0, 1, 3].map((i, k) => ({ case_id: `${k < 2 ? 'A' : 'B'}-${records[i].accession}`, accession: records[i].accession, kind: 'reference identity',
    priority: k < 2 ? 'A' : 'B', name_as_applied: records[i].name_as_applied, review_status: records[i].review_status, why_this_case: 'synthetic test case',
    oriented_sequence: 'ACGT'.repeat(20), provenance: records[i].provenance, flags: records[i].flags, boundaries: {}, regions: {} }));
  const records_text = JSON.stringify(records, null, 1), cases_text = JSON.stringify(cases, null, 1);
  const manifest = {
    contract: 'bre-release/1', release: id, created_utc: '2026-11-11', engine: 'synthetic', records: records.length, cases: cases.length,
    files_sha256: { 'records.json': h(records_text), 'cases.json': h(cases_text) },
    human_review: { status: 'none', label: 'computationally curated, not human-reviewed' },
    safeguards: [{ name: 'ITSx anchoring cross-check', version: 'M6 H8', validation_status: 'experimental: did not meet its prespecified criteria (M6)' }],
    tiers: [{ id: 'primary', name: 'Directly anchored (primary)', validation_status: 'M4 go/no-go failed (unchanged)' }],
    interpretation_limits: ['Sequence similarity is not species identification.'], disclosures: ['Synthetic test release.'] };
  return { manifest, manifest_text: JSON.stringify(manifest, null, 1), records, cases, records_text, cases_text, canonical };
}
