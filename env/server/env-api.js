// Environment lookups for the Ecology Profile tool (/investigate/ecology-profile/).
// Cloudflare Pages Functions under /api/env/ call these. They exist only because the upstream
// government services do not allow cross-site browser requests (CORS); everything else the tool
// needs is fetched directly by the visitor's browser.
//
// Safety: each endpoint accepts only a latitude and longitude, validates them, and builds its own
// fixed upstream request. No client-supplied SQL or URLs are ever forwarded. Responses are cached
// at the edge (the underlying maps change at most yearly), which also keeps load on the public
// services low.
import { EVT } from './evt-lookup.js';

const CACHE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const UA = 'MycoView-EcologyProfile/1.0 (+https://mycoview.com/investigate/ecology-profile/)';

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? `public, max-age=${CACHE_SECONDS}` : 'no-store',
      'x-content-type-options': 'nosniff',
      // Public, read-only reference data: other sites (and local copies of the tool) may call it.
      'access-control-allow-origin': '*',
      ...extra,
    },
  });
}

/** Parse and validate ?lat=&lon=. Coordinates are rounded to 5 decimals (~1 m) for caching. */
function point(request) {
  const u = new URL(request.url);
  const lat = Number(u.searchParams.get('lat'));
  const lon = Number(u.searchParams.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat: Math.round(lat * 1e5) / 1e5, lon: Math.round(lon * 1e5) / 1e5 };
}

/** Serve from the edge cache when possible; otherwise compute, and cache successful answers. */
async function cached(request, ctx, key, compute) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(new URL(key, new URL(request.url).origin).toString());
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }
  const res = await compute();
  if (cache && res.status === 200) {
    const p = cache.put(cacheKey, res.clone());
    if (ctx && ctx.waitUntil) ctx.waitUntil(p); else await p;
  }
  return res;
}

// ---------- Vegetation type: LANDFIRE 2024 Existing Vegetation Type ----------
// Image services per region; a point is sent to the region whose box contains it.
const LF_BASE = 'https://lfps.usgs.gov/arcgis/rest/services/Landfire_LF2024';
const LF_REGIONS = [
  { id: 'CONUS', box: [-125.0, 24.0, -66.5, 49.6] },
  { id: 'AK', box: [-180.0, 51.0, -129.0, 71.6] },
  { id: 'HI', box: [-160.6, 18.8, -154.7, 22.4] },
  { id: 'PRVI', box: [-67.5, 17.6, -64.4, 18.6] },
];

export async function vegetation(context) {
  const { request } = context;
  const p = point(request);
  if (!p) return json({ error: 'lat and lon are required' }, 400);
  const region = LF_REGIONS.find(r => p.lon >= r.box[0] && p.lon <= r.box[2] && p.lat >= r.box[1] && p.lat <= r.box[3]);
  if (!region) return json({ available: false, reason: 'outside-coverage', note: 'LANDFIRE covers the United States only.' });
  return cached(request, context, `/__env-cache/veg/${region.id}/${p.lat},${p.lon}`, async () => {
    const geom = JSON.stringify({ x: p.lon, y: p.lat, spatialReference: { wkid: 4326 } });
    const url = `${LF_BASE}/LF2024_EVT_${region.id}/ImageServer/identify?` + new URLSearchParams({
      geometry: geom, geometryType: 'esriGeometryPoint', returnGeometry: 'false', returnCatalogItems: 'false', f: 'json',
    });
    let r;
    try { r = await fetch(url, { headers: { 'user-agent': UA } }); } catch (e) { return json({ available: false, reason: 'upstream-unreachable' }, 502); }
    if (!r.ok) return json({ available: false, reason: `upstream-${r.status}` }, 502);
    const d = await r.json().catch(() => null);
    const value = d && d.value != null && d.value !== 'NoData' ? Number(d.value) : null;
    if (value == null || !Number.isFinite(value) || value < 0) return json({ available: true, value: null, name: null, source: `LANDFIRE LF2024 EVT ${region.id}` });
    const [name, physiognomy, group] = EVT[value] || [null, null, null];
    return json({ available: true, value, name, physiognomy, group, source: `LANDFIRE LF2024 EVT ${region.id}` });
  });
}

// ---------- Soils: USDA NRCS SSURGO via Soil Data Access ----------
const SDA_URL = 'https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest';

export async function soil(context) {
  const { request } = context;
  const p = point(request);
  if (!p) return json({ error: 'lat and lon are required' }, 400);
  return cached(request, context, `/__env-cache/soil/${p.lat},${p.lon}`, async () => {
    // Fixed query; only the validated numeric coordinates are inserted.
    const sql = `SELECT TOP 3 mu.mukey, mu.muname, c.compname, c.comppct_r, c.drainagecl, c.taxsubgrp, c.taxorder,
 (SELECT TOP 1 h.ph1to1h2o_r FROM chorizon h WHERE h.cokey=c.cokey AND h.ph1to1h2o_r IS NOT NULL ORDER BY h.hzdept_r) AS ph_surface,
 (SELECT TOP 1 tg.texdesc FROM chorizon h JOIN chtexturegrp tg ON tg.chkey=h.chkey AND tg.rvindicator='Yes' WHERE h.cokey=c.cokey ORDER BY h.hzdept_r) AS texture_surface
FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('point(${p.lon} ${p.lat})') AS k
JOIN mapunit mu ON mu.mukey=k.mukey
JOIN component c ON c.mukey=mu.mukey AND c.majcompflag='Yes'
ORDER BY c.comppct_r DESC`;
    let r;
    try {
      r = await fetch(SDA_URL, { method: 'POST', headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ query: sql, format: 'JSON+COLUMNNAME' }) });
    } catch (e) { return json({ available: false, reason: 'upstream-unreachable' }, 502); }
    if (!r.ok) return json({ available: false, reason: `upstream-${r.status}` }, 502);
    const d = await r.json().catch(() => null);
    const table = d && Array.isArray(d.Table) ? d.Table : [];
    if (table.length < 2) return json({ available: true, components: [], source: 'USDA NRCS SSURGO (Soil Data Access)' });
    const cols = table[0];
    const components = table.slice(1).map(row => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
    const num = v => (v == null || v === '' ? null : Number(v));
    return json({
      available: true,
      source: 'USDA NRCS SSURGO (Soil Data Access)',
      mapunit: components[0] ? components[0].muname : null,
      components: components.map(c => ({
        name: c.compname, percent: num(c.comppct_r), drainage: c.drainagecl || null,
        subgroup: c.taxsubgrp || null, order: c.taxorder || null,
        phSurface: num(c.ph_surface), textureSurface: c.texture_surface || null,
      })),
    });
  });
}
