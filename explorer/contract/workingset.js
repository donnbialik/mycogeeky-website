// Data contract between the engine and the website for genus working sets: bre-workingset/1.
// A working set is the curated record set of one genus: the records trees are built from. The engine exports a
// SNAPSHOT (harness/genus/workingset_export.py); the website keeps every change reviewers make separately, as an
// append-only list per genus and accession, and applies the changes on top of the newest snapshot. A newer snapshot
// therefore keeps every change made to the same accession. Used by the server, the admin page and the tests.

export const WORKINGSET_CONTRACT = 'bre-workingset/1';
export const ROLES = {
  type_reference: 'Type reference', working_reference: 'Working reference', included: 'Included', held: 'Held',
  outgroup: 'Outgroup', excluded: 'Excluded',
};
// name_kind: whether the working name is a published name, a provisional name, or a candidate undescribed taxon.
export const NAME_KINDS = { named: 'Published name', provisional: 'Provisional name', candidate: 'Candidate undescribed taxon', unidentified: 'Identified to genus only' };
export const FIELDS = ['role', 'working_name', 'name_kind'];
const SNAP = /^[a-z0-9][a-z0-9-]{1,63}$/;
const GENUS = /^[A-Z][a-z]+$/;
// GenBank accessions (MH827070.1) and iNaturalist observations with an ITS sequence (iNat407281883; engine fetch_inat.py).
// A second ITS field of one observation is iNat407281883-2 (ITS #2) or -A / -B (sequence variants); all link to the observation.
export const ACCESSION = /^(?:[A-Z]{1,2}_?\d{5,8}(\.\d+)?|iNat\d{5,10}(?:-[0-9A-Z])?)$/;
const ACC_IN_TEXT = /\b([A-Z]{1,2}_?\d{5,8}(?:\.\d+)?|iNat\d{5,10}(?:-[0-9A-Z])?)\b/g;
export const isInat = a => /^iNat\d+(?:-[0-9A-Z])?$/.test(String(a || ''));
export const recordUrl = a => isInat(a) ? `https://www.inaturalist.org/observations/${String(a).slice(4).split('-')[0]}` : `https://www.ncbi.nlm.nih.gov/nuccore/${encodeURIComponent(a)}`;
export const accessionsIn = s => [...new Set([...String(s || '').matchAll(ACC_IN_TEXT)].map(m => m[1]))];

// The starting name kind when no change says otherwise: "Genus sp." alone is identified to genus only; a quoted
// epithet, or "sp."/"cf."/"aff." with a qualifier, is provisional.
export const defaultNameKind = n => {
  const s = String(n || '').trim();
  if (/^[A-Z][a-z]+ sp\.?$/.test(s)) return 'unidentified';
  return /['"‘’“”]|\bsp\.|\bcf\.|\baff\./.test(s) ? 'provisional' : 'named';
};

export function validateWorkingSet(s) {
  const e = [];
  if (!s || typeof s !== 'object') return ['the working set is not a JSON object'];
  if (s.contract !== WORKINGSET_CONTRACT) e.push(`contract must be "${WORKINGSET_CONTRACT}"`);
  if (!SNAP.test(s.snapshot || '')) e.push('snapshot must be a short lowercase id such as "galerina-2026-11-22"');
  if (!GENUS.test(s.genus || '')) e.push('genus must be a genus name such as "Galerina"');
  if (!s.engine || typeof s.engine !== 'string') e.push('engine version is required');
  if (!Array.isArray(s.records) || !s.records.length) { e.push('records must be a non-empty list'); return e; }
  const seen = new Set();
  for (const r of s.records) {
    const w = `record ${String(r && r.accession).slice(0, 20)}`;
    if (!r || typeof r !== 'object') { e.push('each record must be an object'); continue; }
    if (!ACCESSION.test(r.accession || '')) e.push(`${w}: accession must look like MH827070.1, iNat407281883 or iNat407281883-2`);
    if (seen.has(r.accession)) e.push(`${w}: duplicate accession`); seen.add(r.accession);
    if (!ROLES[r.role]) e.push(`${w}: unknown role ${r.role}`);
    if (typeof r.working_name !== 'string' || !r.working_name) e.push(`${w}: working_name is required`);
    if (typeof r.sequence !== 'string' || !/^[ACGTRYSWKMBDHVN-]+$/i.test(r.sequence)) e.push(`${w}: sequence must be DNA letters`);
    if (JSON.stringify(r).length > 60000) e.push(`${w}: too large`);
    if (e.length > 50) { e.push('more problems not listed'); break; }
  }
  return e;
}

// What a DECIDED genus question does to the working set: a list of { accession, field, value, reason }.
// q is the question body (bre-questions/1), a the adjudication ({ status, choice, detail }). Nothing unless decided.
export function effectsOf(q, a) {
  if (!a || a.status !== 'decided') return [];
  const choice = String(a.choice || ''), detail = String(a.detail || '').trim();
  const recs = (q.evidence && q.evidence.records) || [];
  const withRole = role => recs.filter(r => String(r.role).startsWith(role)).map(r => r.accession);
  const why = `${q.id} (${q.type}) decided: ${choice}${detail ? ` — ${detail}` : ''}`;
  const set = (accs, field, value) => accs.map(accession => ({ accession, field, value, reason: why }));
  const given = () => accessionsIn(detail);
  switch (q.type) {
    case 'D1':
      return choice === 'reject' ? set(withRole('reference sequence'), 'role', 'included') : [];
    case 'D2':
      if (/^(literature|curator|use a ranked candidate)/.test(choice)) {
        const accs = given();
        const role = /^literature/.test(choice) && /epitype|neotype/i.test(choice + ' ' + detail) ? 'type_reference' : 'working_reference';
        return [...set(accs, 'role', role), ...set(accs, 'working_name', q.subject)];
      }
      return [];
    case 'D4': {
      const target = String(q.subject).split('->').pop().trim();
      if (/^misapplied name/.test(choice) || /^synonym of /.test(choice)) return set(withRole('record'), 'working_name', target);
      return [];
    }
    case 'D5': {
      const accs = withRole('record');
      if (/^an existing provisional name/.test(choice) && detail) return [...set(accs, 'working_name', detail), ...set(accs, 'name_kind', 'provisional')];
      if (/^a named species with no reference/.test(choice) && detail) return [...set(accs, 'working_name', detail), ...set(accs, 'name_kind', 'named')];
      if (/^candidate undescribed taxon/.test(choice)) return set(accs, 'name_kind', 'candidate');
      return [];
    }
    case 'D6':
      return /^exclude/.test(choice) ? set([q.subject], 'role', 'excluded') : [];
    case 'D8': {
      const dep = (recs.find(r => r.accession === q.subject) || {}).name_as_deposited;
      const typeName = (String(q.question).match(/herbarium type of (.+?) \(/) || [])[1];
      if (/^synonym: use as the reference sequence for the deposited name/.test(choice) && dep) return [...set([q.subject], 'role', 'type_reference'), ...set([q.subject], 'working_name', dep)];
      if (/^use as the reference sequence for the type name/.test(choice) && typeName) return [...set([q.subject], 'role', 'type_reference'), ...set([q.subject], 'working_name', typeName)];
      return [];
    }
    case 'D9': {
      const name = (String(q.options[0] || '').match(/use as the reference for (.+)$/) || [])[1];
      if ((/^belongs in /.test(choice) || /^NCBI misfiled it/.test(choice)) && name) return [...set([q.subject], 'role', 'type_reference'), ...set([q.subject], 'working_name', name)];
      return [];
    }
    case 'D10': {
      if (/^a type sequence is wrong/.test(choice)) return set(given(), 'role', 'excluded');
      if (/^a synonym is a distinct species/.test(choice) && detail) {
        const d = detail.toLowerCase();
        const types = recs.filter(r => String(r.role).startsWith('type sequence') && r.name_as_deposited &&
          (r.name_as_deposited.toLowerCase().includes(d) || d.includes(r.name_as_deposited.toLowerCase())));
        return types.flatMap(r => set([r.accession], 'working_name', r.name_as_deposited));
      }
      return [];
    }
    default:
      return [];
  }
}
