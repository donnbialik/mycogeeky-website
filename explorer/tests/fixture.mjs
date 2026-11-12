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

// A SYNTHETIC corroboration supplement (bre-supplement/1) for the synthetic release: invented accessions and
// observation ids; photo URLs have the iNaturalist shape but point at nothing real.
export function syntheticSupplement(rel, x = {}) {
  const c0 = rel.cases[0];
  const obs = (id, name, same) => ({ source: 'iNaturalist', id, url: `https://www.inaturalist.org/observations/${id}`, field: 'DNA Barcode ITS', name, quality_grade: 'research',
    observed_on: '2020-07-01', posted: '2020-07-02', observer: 'synthetic', distance_pct: 0, photo_count: 1, same_name: same, species_level: true,
    photos: [{ url: `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/small.jpg`, attribution: '(c) synthetic, some rights reserved (CC BY)', license: 'cc-by' }],
    identifications: [{ name, rank: 'species', by: 'synthetic', on: '2020-07-02', current: true, category: 'improving' }], first_species_id: '2020-07-02',
    days_from_posting_to_species_id: 0, circularity: 'likely named before sequencing (species ID within 7 days of posting)', fields: { 'Voucher Number(s)': 'S-1' } });
  const s = { contract: 'bre-supplement/1', kind: 'corroboration', release: rel.manifest.release, supplement: `${rel.manifest.release}-corroboration-1`, created_utc: '2026-11-11T00:00:00+00:00',
    release_files_sha256: rel.manifest.files_sha256, sources: {},
    method: { max_distance_pct: 1, not_decisive: 'Corroborators are leads for a human reviewer.', inat_genus: 'Testus', inat_observations_with_its: 2 },
    cases: { [c0.case_id]: { accession: c0.accession, deposited_name: c0.name_as_applied, max_distance_pct: 1,
      genbank: [{ source: 'GenBank', accession: 'TEST0002.1', name: 'Testus alpha', distance_pct: 0, independent: true, not_independent_because: [], same_name: true }],
      inaturalist: [obs(9000001, 'Testus alpha', true), obs(9000002, 'Testus beta', false)],
      summary: { genbank_independent_same_name: 1, genbank_other_name: 0, inat_same_name: 1, inat_same_name_research_grade: 1, inat_same_name_likely_named_before_sequencing: 1,
        inat_other_species: 1, inat_genus_only: 0, contradictions: ['iNaturalist 9000002: Testus beta at 0 points'] } } }, ...x };
  return { supplement: s, text: JSON.stringify(s, null, 1) };
}
