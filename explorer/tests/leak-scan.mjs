// Scans the BUILT site (dist/) for evidence that must never be published as static files (condition A).
//   node explorer/tests/leak-scan.mjs dist                    generic checks (CI): evidence field names, release files
//   node explorer/tests/leak-scan.mjs dist <release-dir>      also checks every accession and sequence of a real release
import fs from 'node:fs'; import path from 'node:path';
const [dist, releaseDir] = process.argv.slice(2);
const files = []; const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : files.push(p); } }; walk(dist);
const FIELDS = ['oriented_sequence', 'review_priority', 'reference_anchored_regions', 'name_status_note', 'species_context'];
let needles = [];
if (releaseDir) {
  const recs = JSON.parse(fs.readFileSync(path.join(releaseDir, 'records.json'), 'utf8')); const cases = JSON.parse(fs.readFileSync(path.join(releaseDir, 'cases.json'), 'utf8'));
  needles = [...recs.map(r => r.accession), ...cases.map(c => (c.oriented_sequence || '').slice(40, 100)).filter(Boolean)];
}
const bad = [];
for (const f of files) {
  const rel = path.relative(dist, f);
  if (/(^|\/)(records|cases|release)\.json$/.test(rel) || /laetiporus/i.test(rel)) bad.push(`${rel}: release file published statically`);
  if (!/\.(html|js|css|json|txt|xml|svg|map)$/.test(f)) continue;
  const t = fs.readFileSync(f, 'utf8');
  for (const k of FIELDS) if (t.includes(`"${k}"`)) bad.push(`${rel}: contains evidence field "${k}"`);
  for (const n of needles) if (t.includes(n)) { bad.push(`${rel}: contains release content "${n.slice(0, 20)}"`); break; }
}
console.log(`scanned ${files.length} files${releaseDir ? ` against ${needles.length} accessions and sequences` : ''}: ${bad.length ? bad.length + ' problems' : 'no evidence published'}`);
if (bad.length) { console.log(bad.join('\n')); process.exit(1); }
