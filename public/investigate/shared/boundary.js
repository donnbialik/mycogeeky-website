/* MycoView boundary helper: read a site boundary from KML, KMZ or GeoJSON, entirely in the browser,
   and test whether records fall inside it. Nothing is uploaded anywhere.
   Exposes globalThis.MVBoundary = { readFile, parseText, contains, edgeDistanceM, classify, toGeoJSON, bboxParams, summary }. */
(function (g) {
  'use strict';
  const R = 6371008.8, rad = Math.PI / 180;

  /* ---------- parsing ---------- */
  function ringFromCoordText(t) {
    const pts = t.trim().split(/\s+/).map(s => s.split(',').map(Number)).filter(a => a.length >= 2 && isFinite(a[0]) && isFinite(a[1])).map(a => [a[0], a[1]]);
    if (pts.length && (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1])) pts.push(pts[0].slice());
    return pts.length >= 4 ? pts : null;
  }
  const tag = n => `(?:[\\w-]+:)?${n}`;
  function parseKml(text) {
    const polys = [], names = [];
    const pm = new RegExp(`<${tag('Placemark')}\\b[^>]*>([\\s\\S]*?)</${tag('Placemark')}>`, 'g');
    const scan = (chunk, name) => {
      const pg = new RegExp(`<${tag('Polygon')}\\b[^>]*>([\\s\\S]*?)</${tag('Polygon')}>`, 'g'); let m, found = 0;
      while ((m = pg.exec(chunk))) {
        const body = m[1], ob = new RegExp(`<${tag('outerBoundaryIs')}\\b[^>]*>([\\s\\S]*?)</${tag('outerBoundaryIs')}>`).exec(body);
        const co = t => { const c = new RegExp(`<${tag('coordinates')}\\b[^>]*>([\\s\\S]*?)</${tag('coordinates')}>`).exec(t); return c ? ringFromCoordText(c[1]) : null; };
        const outer = co(ob ? ob[1] : body); if (!outer) continue;
        const holes = []; const ib = new RegExp(`<${tag('innerBoundaryIs')}\\b[^>]*>([\\s\\S]*?)</${tag('innerBoundaryIs')}>`, 'g'); let h;
        while ((h = ib.exec(body))) { const r = co(h[1]); if (r) holes.push(r); }
        polys.push([outer, ...holes]); found++;
      }
      if (found && name) names.push(name);
    };
    let m, any = false;
    while ((m = pm.exec(text))) { any = true; const nm = new RegExp(`<${tag('name')}\\b[^>]*>([\\s\\S]*?)</${tag('name')}>`).exec(m[1]); scan(m[1], nm ? clean(nm[1]) : ''); }
    if (!any) scan(text, '');
    const doc = new RegExp(`<${tag('Document')}\\b[^>]*>[\\s\\S]*?<${tag('name')}\\b[^>]*>([\\s\\S]*?)</${tag('name')}>`).exec(text);
    return { polys, name: names.length === 1 ? names[0] : (doc ? clean(doc[1]) : names[0] || '') , parts: names };
  }
  function clean(s) { return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim(); }
  function parseGeoJson(obj) {
    const polys = [], names = [];
    const geom = (gm, name) => { if (!gm) return;
      const add = rings => { const rr = rings.map(r => ringFromCoordText(r.map(p => `${p[0]},${p[1]}`).join(' '))).filter(Boolean); if (rr.length) { polys.push(rr); if (name) names.push(name); } };
      if (gm.type === 'Polygon') add(gm.coordinates);
      else if (gm.type === 'MultiPolygon') gm.coordinates.forEach(add);
      else if (gm.type === 'GeometryCollection') gm.geometries.forEach(x => geom(x, name)); };
    const feat = f => geom(f.geometry, f.properties && (f.properties.name || f.properties.Name || f.properties.NAME) || '');
    if (obj.type === 'FeatureCollection') obj.features.forEach(feat); else if (obj.type === 'Feature') feat(obj); else geom(obj, '');
    const uniq = [...new Set(names)];
    return { polys, name: uniq.length === 1 ? uniq[0] : (obj.name || uniq[0] || ''), parts: uniq };
  }
  async function unzipFirstKml(buf) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf);
    let eocd = -1; for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('This KMZ is not a readable zip file.');
    const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true); const entries = [];
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      entries.push({ name: new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl)), method, csize, off }); p += 46 + nl + xl + cl; }
    const kmls = entries.filter(e => /\.kml$/i.test(e.name)); if (!kmls.length) throw new Error('No .kml file inside this KMZ.');
    const e = kmls.find(x => /(^|\/)doc\.kml$/i.test(x.name)) || kmls[0];
    const start = e.off + 30 + dv.getUint16(e.off + 26, true) + dv.getUint16(e.off + 28, true), data = u8.subarray(start, start + e.csize);
    if (e.method === 0) return new TextDecoder().decode(data);
    if (e.method !== 8 || typeof DecompressionStream === 'undefined') throw new Error('This KMZ uses a compression this browser can’t read; export it as KML instead.');
    const out = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    return new TextDecoder().decode(out);
  }
  function finish(r, fileName) {
    if (!r.polys.length) throw new Error('No polygon found. The file needs at least one area (a polygon), not just points or lines.');
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180, verts = 0;
    for (const poly of r.polys) for (const [x, y] of poly[0]) { minLat = Math.min(minLat, y); maxLat = Math.max(maxLat, y); minLon = Math.min(minLon, x); maxLon = Math.max(maxLon, x); verts++; }
    if (minLat < -90 || maxLat > 90 || minLon < -180 || maxLon > 180) throw new Error('Coordinates are outside latitude/longitude range; the file must use WGS84 degrees.');
    const lat0 = (minLat + maxLat) / 2, kx = Math.cos(lat0 * rad) * rad * R, ky = rad * R;
    const ringArea = ring => { let s = 0; for (let i = 0; i < ring.length - 1; i++) s += ring[i][0] * kx * ring[i + 1][1] * ky - ring[i + 1][0] * kx * ring[i][1] * ky; return Math.abs(s) / 2; };
    const area = r.polys.reduce((a, poly) => a + ringArea(poly[0]) - poly.slice(1).reduce((b, h) => b + ringArea(h), 0), 0);
    const b = { name: r.name || (fileName || 'Uploaded boundary').replace(/\.(kml|kmz|geojson|json)$/i, ''), fileName: fileName || '', parts: r.parts, polys: r.polys,
      bbox: [minLon, minLat, maxLon, maxLat], areaKm2: area / 1e6, vertices: verts, centroid: { lat: lat0, lon: (minLon + maxLon) / 2 } };
    // Area-weighted centroid of the largest polygon is a better weather point than the box centre.
    const big = r.polys.map(p => p[0]).sort((a, c) => ringArea(c) - ringArea(a))[0]; let cx = 0, cy = 0, A = 0;
    for (let i = 0; i < big.length - 1; i++) { const x0 = big[i][0], y0 = big[i][1], x1 = big[i + 1][0], y1 = big[i + 1][1], f = x0 * y1 - x1 * y0; A += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f; }
    const c = A ? { lon: cx / (3 * A), lat: cy / (3 * A) } : null;
    if (c && contains(b, c.lat, c.lon)) b.centroid = c;
    else { // centre falls outside (a ring, a C shape, a hole): use the inside grid point farthest from any edge
      let bx0 = 180, by0 = 90, bx1 = -180, by1 = -90; for (const [x, y] of big) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
      let best = null, bd = -1; for (let i = 1; i < 30; i++) for (let j = 1; j < 30; j++) { const lon = bx0 + (bx1 - bx0) * i / 30, lat = by0 + (by1 - by0) * j / 30;
        if (contains(b, lat, lon)) { const d = edgeDistanceM(b, lat, lon); if (d > bd) { bd = d; best = { lat, lon }; } } }
      if (best) b.centroid = best; }
    return b;
  }
  function parseText(text, fileName) {
    const t = text.replace(/^﻿/, '').trim();
    if (t.startsWith('{')) { let o; try { o = JSON.parse(t); } catch (e) { throw new Error('This file looks like GeoJSON but isn’t valid JSON.'); } return finish(parseGeoJson(o), fileName); }
    if (t.startsWith('<')) return finish(parseKml(t), fileName);
    throw new Error('Not a KML, KMZ or GeoJSON file.');
  }
  async function readFile(file) {
    if (file.size > 25e6) throw new Error('That file is over 25 MB; simplify the boundary first.');
    const buf = await file.arrayBuffer(), head = new Uint8Array(buf.slice(0, 4));
    const text = head[0] === 0x50 && head[1] === 0x4b ? await unzipFirstKml(buf) : new TextDecoder().decode(buf);
    return parseText(text, file.name);
  }

  /* ---------- geometry ---------- */
  function inRing(ring, x, y) { let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; }
    return inside; }
  function contains(b, lat, lon) {
    if (lat == null || lon == null || lon < b.bbox[0] || lon > b.bbox[2] || lat < b.bbox[1] || lat > b.bbox[3]) return false;
    return b.polys.some(poly => inRing(poly[0], lon, lat) && !poly.slice(1).some(h => inRing(h, lon, lat)));
  }
  function edgeDistanceM(b, lat, lon) { // shortest distance from the point to any boundary edge, metres
    const kx = Math.cos(lat * rad) * rad * R, ky = rad * R; let best = Infinity;
    for (const poly of b.polys) for (const ring of poly) for (let i = 0; i < ring.length - 1; i++) {
      const ax = (ring[i][0] - lon) * kx, ay = (ring[i][1] - lat) * ky, bx = (ring[i + 1][0] - lon) * kx, by = (ring[i + 1][1] - lat) * ky;
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
      best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy)); }
    return best;
  }
  /* classify a record: 'in', 'out', 'edge' (inside, but its stated accuracy reaches past the boundary), 'obscured' (true location hidden) */
  function classify(b, rec) {
    if (rec.obscured) return 'obscured';
    if (!contains(b, rec.lat, rec.lon)) return 'out';
    if (rec.acc != null && rec.acc > 0 && rec.acc > edgeDistanceM(b, rec.lat, rec.lon)) return 'edge';
    return 'in';
  }
  function bboxParams(b, padDeg = 0.0005) { const [w, s, e, n] = b.bbox; return `swlat=${(s - padDeg).toFixed(5)}&swlng=${(w - padDeg).toFixed(5)}&nelat=${(n + padDeg).toFixed(5)}&nelng=${(e + padDeg).toFixed(5)}`; }
  function toGeoJSON(b) { return { type: 'FeatureCollection', features: b.polys.map(p => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: p } })) }; }
  function summary(b) { const a = b.areaKm2; return `${b.name}: ${b.polys.length} polygon${b.polys.length === 1 ? '' : 's'}, ${a >= 10 ? a.toFixed(0) : a >= 1 ? a.toFixed(1) : (a * 100).toFixed(1) + ' ha'}${a >= 1 ? ' km²' : ''}`; }

  g.MVBoundary = { readFile, parseText, contains, edgeDistanceM, classify, toGeoJSON, bboxParams, summary };
})(globalThis);
