// Unit tests of the working-set placement (src/scripts/explorer/placement.js) and of iNaturalist record ids in the
// working-set contract. Run: npm run explorer:test
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuery, parseFasta, align, distance, place, revcomp, SHORT } from '../../src/scripts/explorer/placement.js';
import { validateWorkingSet, accessionsIn, recordUrl, isInat } from '../contract/workingset.js';

// A deterministic pseudo-random ITS-like sequence, and controlled variants of it.
function rnd(n, seed) { let x = seed; let s = ''; for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) % 2147483648; s += 'ACGT'[x % 4]; } return s; }
const BASE = rnd(600, 7);
const sub = (s, positions) => [...s].map((c, i) => positions.includes(i) ? (c === 'A' ? 'C' : 'A') : c).join('');

test('parseQuery accepts raw and FASTA, rejects junk', () => {
  assert.equal(parseQuery(`>q1 my seq\n${BASE.slice(0, 300)}\n${BASE.slice(300)}`).seq, BASE);
  assert.equal(parseQuery(BASE.toLowerCase().replace(/t/g, 'u')).seq, BASE);
  assert.match(parseQuery(`>a\n${BASE}\n>b\n${BASE}`).error, /one sequence/);
  assert.match(parseQuery('ACGTXZ' + BASE).error, /Not DNA/);
  assert.match(parseQuery('ACGT').error, /at least 100/);
  assert.ok(parseQuery('N'.repeat(40) + BASE).warning);
});

test('parseFasta keys records by the first word of the label', () => {
  const m = parseFasta('>MH827070.1 Clitocybula oculus | USA\nACGT\nAC\n>iNat407281883 Clitocybula oculus\nGG\n');
  assert.deepEqual([...m.entries()], [['MH827070.1', 'ACGTAC'], ['iNat407281883', 'GG']]);
});

test('distance: identical, substitutions, a gap run counts once, ambiguity and N are not differences', () => {
  let a = align(BASE, BASE); assert.equal(distance(a.a, a.b).diffs, 0);
  a = align(BASE, sub(BASE, [100, 200, 300])); let d = distance(a.a, a.b);
  assert.equal(d.subs, 3); assert.equal(d.indels, 0); assert.ok(Math.abs(d.pct - 0.5) < 1e-9);
  a = align(BASE, BASE.slice(0, 250) + BASE.slice(256)); d = distance(a.a, a.b);   // a 6-base deletion
  assert.equal(d.indels, 1); assert.equal(d.subs, 0);
  const amb = [...BASE].map((c, i) => i === 50 ? ({ A: 'R', G: 'R', C: 'Y', T: 'Y' })[c] : i === 60 ? 'N' : c).join('');
  a = align(BASE, amb); d = distance(a.a, a.b); assert.equal(d.diffs, 0);
});

test('distance is over the overlap only; coverage reports how much of the query it includes', () => {
  const a = align(BASE, BASE.slice(300)); const d = distance(a.a, a.b);
  assert.equal(d.diffs, 0); assert.ok(Math.abs(d.coverage - 0.5) < 0.01);
});

test('place: nearest record first, reverse complement handled, partial references ranked after full ones', async () => {
  const recs = [
    { accession: 'AB000001.1', working_name: 'Genus alpha', role: 'type_reference', sequence: sub(BASE, [10, 20, 30, 40, 50, 60]) },
    { accession: 'AB000002.1', working_name: 'Genus beta', role: 'included', sequence: sub(BASE, [100]) },
    { accession: 'AB000003.1', working_name: 'Genus gamma', role: 'type_reference', sequence: BASE.slice(450) },   // short fragment, identical
    { accession: 'iNat12345678', working_name: 'Genus beta', role: 'included', sequence: sub(BASE, [100, 101]) },
    { accession: 'AB000004.1', working_name: 'Genus delta', role: 'excluded', sequence: BASE },
  ];
  for (const query of [BASE, revcomp(BASE)]) {
    const r = await place(query, recs);
    assert.equal(r.reversed, query !== BASE);
    assert.equal(r.nearest[0].record.accession, 'AB000002.1');
    assert.ok(!r.nearest.some(x => x.record.accession === 'AB000004.1'), 'excluded records are never compared');
    const g = r.nearest.findIndex(x => x.record.accession === 'AB000003.1');
    assert.equal(g, r.nearest.length - 1, 'the identical but short fragment ranks last');
    assert.ok(r.nearest[g].coverage < SHORT);
    const beta = r.byName.find(n => n.name === 'Genus beta');
    assert.equal(beta.aligned, 2); assert.equal(beta.nearestType, null);
    assert.equal(r.byName.find(n => n.name === 'Genus alpha').nearestType.record.accession, 'AB000001.1');
  }
});

test('working-set contract accepts iNaturalist record ids and links them to iNaturalist', () => {
  const base = { contract: 'bre-workingset/1', snapshot: 'clitocybula-2026-11-23', genus: 'Clitocybula', engine: 'test' };
  const rec = acc => ({ accession: acc, role: 'included', working_name: 'Clitocybula oculus', sequence: 'ACGT' });
  assert.deepEqual(validateWorkingSet({ ...base, records: [rec('MH827070.1'), rec('iNat407281883')] }), []);
  assert.equal(validateWorkingSet({ ...base, records: [rec('inat407281883')] }).length, 1);
  assert.equal(validateWorkingSet({ ...base, records: [rec('iNat12')] }).length, 1);
  assert.deepEqual(accessionsIn('use iNat407281883 and MH827070.1'), ['iNat407281883', 'MH827070.1']);
  assert.ok(isInat('iNat407281883') && !isInat('MH827070.1'));
  assert.equal(recordUrl('iNat407281883'), 'https://www.inaturalist.org/observations/407281883');
  assert.equal(recordUrl('MH827070.1'), 'https://www.ncbi.nlm.nih.gov/nuccore/MH827070.1');
});
