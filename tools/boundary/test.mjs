// Checks the boundary reader (KML, KMZ, GeoJSON) and point-in-polygon rules. Run: node tools/boundary/test.mjs
import fs from 'node:fs'; import assert from 'node:assert';
const here = new URL('.', import.meta.url).pathname; process.chdir(here);
await import('../../public/investigate/shared/boundary.js');
const B = globalThis.MVBoundary;
const file = p => ({ name: p, size: fs.statSync(p).size, arrayBuffer: async () => { const b = fs.readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); } });
for (const f of ['sq.kml', 'sq.kmz']) {
  const b = await B.readFile(file(f));
  console.log(f, B.summary(b), b.polys.length, b.polys[0].length, b.centroid);
  assert.equal(b.polys.length, 2); assert.equal(b.polys[0].length, 2);
  assert.ok(B.contains(b, 41.125, -81.555)); assert.ok(!B.contains(b, 41.13, -81.55), 'hole'); assert.ok(B.contains(b, 41.105, -81.495)); assert.ok(!B.contains(b, 41.15, -81.55));
  assert.equal(B.classify(b, { lat: 41.1205, lon: -81.555, acc: 200 }), 'edge'); assert.equal(B.classify(b, { lat: 41.1205, lon: -81.555, acc: 20 }), 'in');
  assert.equal(B.classify(b, { lat: 41.125, lon: -81.555, obscured: true }), 'obscured');
  // expected area: 0.02°x0.02° minus 0.004x0.004 plus 0.01x0.01
  const kx = Math.cos(41.115 * Math.PI / 180) * 111195, ky = 111195;
  console.log(' area', b.areaKm2.toFixed(3), 'expected ~', ((0.0004 - 0.000016 + 0.0001) * kx * ky / 1e6).toFixed(3), 'edgeDist', B.edgeDistanceM(b, 41.1205, -81.555).toFixed(1));
}
const gj = B.parseText(JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: 'GJ site' }, geometry: { type: 'Polygon', coordinates: [[[-81.56, 41.12], [-81.54, 41.12], [-81.54, 41.14], [-81.56, 41.14], [-81.56, 41.12]]] } }] }), 'x.geojson');
console.log(B.summary(gj), B.bboxParams(gj)); assert.ok(B.contains(gj, 41.13, -81.55));
for (const bad of ['<kml><Placemark><Point><coordinates>-81,41</coordinates></Point></Placemark></kml>', 'hello', '{bad']) { try { B.parseText(bad, 'b.kml'); console.log('NO ERROR?!'); } catch (e) { console.log('ok error:', e.message); } }
