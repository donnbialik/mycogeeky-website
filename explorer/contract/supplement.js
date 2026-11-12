// Data contract bre-supplement/1: an immutable, hash-pinned SUPPLEMENT to an evidence release, produced offline by
// the engine (harness/m8/corroborate.py). Kind 'corroboration': for each review case, independent public evidence a
// reviewer can weigh against the deposited name — same-sequence GenBank collections (with independence flags) and
// sequence-matched iNaturalist observations (photos, quality grade, identification timeline, voucher fields).
// Corroborators are LEADS for a human reviewer, never verdicts. No coordinates may appear anywhere in a supplement.
export const SUPPLEMENT_CONTRACT = 'bre-supplement/1';
export const SUPPLEMENT_KINDS = ['corroboration'];
const SID = /^[a-z0-9][a-z0-9.-]{1,79}$/;
const HEX = /^[0-9a-f]{64}$/;
// Location keys are refused at any depth (condition A: no specimen coordinates, even public ones).
export const FORBIDDEN_KEYS = ['latitude', 'longitude', 'lat', 'lng', 'location', 'geojson', 'place_guess', 'coordinates', 'private_location',
  'private_latitude', 'private_longitude', 'positional_accuracy', 'lat_lon', 'geoprivacy'];
export const PHOTO_HOSTS = /^https:\/\/(inaturalist-open-data\.s3\.amazonaws\.com|static\.inaturalist\.org)\/photos\/\d+\/[a-z]+\.(jpe?g|png)$/i;
export const OBS_URL = /^https:\/\/www\.inaturalist\.org\/observations\/\d+$/;
// External links the case page will render as links (everything else is shown as text).
export const LINK_HOSTS = /^https:\/\/((www\.)?inaturalist\.org|(www\.)?mushroomobserver\.org|(www\.)?mycomap\.com|www\.ncbi\.nlm\.nih\.gov)\//;
// A citation a reviewer may attach to a review: "GenBank <accession>" or "iNaturalist <observation id>".
export const CITATION = /^(GenBank [A-Z]{1,6}_?\d{4,12}\.\d{1,3}|iNaturalist \d{1,12})$/;
export const citationsOf = entry => [...(entry.genbank || []).map(g => `GenBank ${g.accession}`), ...(entry.inaturalist || []).map(o => `iNaturalist ${o.id}`)];

function scanKeys(x, path, e) {
  if (e.length > 20) return;
  if (Array.isArray(x)) x.forEach((v, i) => scanKeys(v, `${path}[${i}]`, e));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) {
    if (FORBIDDEN_KEYS.includes(k.toLowerCase())) e.push(`${path}.${k}: location fields are not allowed in a supplement`);
    scanKeys(v, `${path}.${k}`, e);
  }
}

// Structural checks (server, owner's browser, tests). `release` = the release manifest it supplements, if known.
export function validateSupplement(s, release) {
  const e = [];
  if (!s || typeof s !== 'object' || Array.isArray(s)) return ['the supplement is not a JSON object'];
  if (s.contract !== SUPPLEMENT_CONTRACT) e.push(`contract must be "${SUPPLEMENT_CONTRACT}"`);
  if (!SUPPLEMENT_KINDS.includes(s.kind)) e.push(`kind must be one of: ${SUPPLEMENT_KINDS.join(', ')}`);
  if (!SID.test(s.supplement || '')) e.push('supplement must be a short lowercase id such as "laetiporus-v1-corroboration-1"');
  if (typeof s.release !== 'string' || !s.release) e.push('release is required');
  if (typeof s.created_utc !== 'string') e.push('created_utc is required');
  const m = s.method || {};
  if (typeof m.not_decisive !== 'string' || !m.not_decisive) e.push('method.not_decisive (the statement that corroborators are not verdicts) is required');
  if (typeof m.max_distance_pct !== 'number') e.push('method.max_distance_pct is required');
  if (!s.cases || typeof s.cases !== 'object' || Array.isArray(s.cases) || !Object.keys(s.cases).length) e.push('cases must be a non-empty object keyed by case id');
  if (release) {
    if (s.release !== release.release) e.push(`this supplement is for release "${s.release}", not "${release.release}"`);
    for (const [f, h] of Object.entries(release.files_sha256 || {}))
      if ((s.release_files_sha256 || {})[f] !== h) e.push(`release_files_sha256["${f}"] does not match the imported release: the supplement was built from different evidence`);
  } else for (const h of Object.values(s.release_files_sha256 || {})) if (!HEX.test(h)) e.push('release_files_sha256 must hold SHA-256 hex digests');
  scanKeys(s, '$', e);
  for (const [cid, c] of Object.entries(s.cases || {})) {
    if (!Array.isArray(c.genbank) || !Array.isArray(c.inaturalist) || !c.summary) { e.push(`${cid}: needs genbank, inaturalist and summary`); continue; }
    for (const g of c.genbank) {
      if (!/^[A-Z]{1,6}_?\d{4,12}\.\d{1,3}$/.test(g.accession || '')) e.push(`${cid}: bad GenBank accession ${String(g.accession).slice(0, 20)}`);
      if (typeof g.independent !== 'boolean' || typeof g.distance_pct !== 'number') e.push(`${cid}: each GenBank entry needs independent and distance_pct`);
    }
    for (const o of c.inaturalist) {
      if (!Number.isInteger(o.id) || !OBS_URL.test(o.url || '')) e.push(`${cid}: bad iNaturalist observation ${String(o.id).slice(0, 20)}`);
      if (typeof o.distance_pct !== 'number' || typeof o.circularity !== 'string') e.push(`${cid}: iNaturalist ${o.id} needs distance_pct and circularity`);
      for (const p of o.photos || []) {
        if (!PHOTO_HOSTS.test(p.url || '')) e.push(`${cid}: iNaturalist ${o.id}: photo URL is not an iNaturalist photo`);
        if (!p.attribution) e.push(`${cid}: iNaturalist ${o.id}: every photo needs its attribution`);
      }
    }
    if (e.length > 40) { e.push('… stopped after 40 problems'); break; }
  }
  return e;
}
