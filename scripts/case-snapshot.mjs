#!/usr/bin/env node
/**
 * Provisional taxonomist case pages: take a dated snapshot of every iNaturalist observation carrying one
 * provisional name, and write the summary a case page renders.
 *
 *   node scripts/case-snapshot.mjs "Russula sp. 'QUE01'" russula-que01
 *
 * Writes src/data/cases/<slug>.json. Reads only public iNaturalist data, about one request a second.
 * Photos without an open licence ("all rights reserved") are left out, as on the Provisional Finder.
 * Re-run it to refresh a case page; the page shows the date of the pull.
 */
import { writeFile, mkdir } from 'node:fs/promises';

const [name, slug] = process.argv.slice(2);
if (!name || !slug) { console.error('Usage: node scripts/case-snapshot.mjs "<exact provisional name>" <slug>'); process.exit(1); }

const API = 'https://api.inaturalist.org/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (url) => { const r = await fetch(url, { headers: { 'User-Agent': 'MycoView case snapshot (mycoview.com)' } }); if (!r.ok) throw new Error(`${r.status} ${url}`); await sleep(1000); return r.json(); };

// 1. Every observation with this exact Provisional Species Name value.
const obs = [];
for (let page = 1; ; page++) {
  const q = new URLSearchParams({ 'field:Provisional Species Name': name, per_page: '200', page: String(page), order_by: 'observed_on', order: 'desc' });
  const d = await get(`${API}/observations?${q}`);
  obs.push(...d.results);
  if (obs.length >= d.total_results || d.results.length === 0) break;
}

const field = (o, ...names) => { for (const n of names) { const f = (o.ofvs || []).find((x) => x.name === n); if (f && f.value) return f.value; } return null; };

// 2. State or province for each observation, from iNaturalist's place records (admin level 10).
const placeIds = [...new Set(obs.flatMap((o) => o.place_ids || []))];
const states = new Map();
for (let i = 0; i < placeIds.length; i += 100) {
  const d = await get(`${API}/places/${placeIds.slice(i, i + 100).join(',')}?per_page=100`);
  for (const p of d.results) if (p.admin_level === 10) states.set(p.id, p.name);
}
const regionOf = (o) => (o.place_ids || []).map((id) => states.get(id)).find(Boolean) || 'Unknown';

const count = (arr) => arr.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
const sorted = (m) => Object.entries(m).sort((a, b) => b[1] - a[1]);

const sequenced = obs.filter((o) => field(o, 'DNA Barcode ITS'));
const rics = obs.map((o) => parseInt(field(o, 'Reads in Consensus (RiC)'), 10)).filter(Number.isFinite).sort((a, b) => a - b);
const groups = count(obs.map((o) => `${o.user.login}|${o.observed_on}|${o.geojson ? o.geojson.coordinates[1].toFixed(2) : ''}`));
const notes = obs.map((o) => (o.description || '').toLowerCase());
const mentions = (re) => notes.filter((t) => re.test(t)).length;

const summary = {
  name, slug,
  pulledAt: new Date().toISOString().slice(0, 10),
  searchUrl: `https://www.inaturalist.org/observations?${new URLSearchParams({ 'field:Provisional Species Name': name })}`,
  observations: obs.length,
  sequenced: sequenced.length,
  observers: new Set(obs.map((o) => o.user.login)).size,
  observerList: sorted(count(obs.map((o) => o.user.login))),
  collectorDateSite: Object.keys(groups).length,
  sharedCollectorDateSite: Object.values(groups).filter((n) => n > 1).length,
  ric: rics.length ? { n: rics.length, min: rics[0], median: rics[Math.floor(rics.length / 2)], max: rics[rics.length - 1], under30: rics.filter((r) => r < 30).length } : null,
  voucherRecorded: obs.filter((o) => field(o, 'Voucher Number(s)', 'Voucher Number', 'Herbarium Catalog Number') || field(o, 'Voucher Specimen Taken') === 'Yes').length,
  herbarium: sorted(count(obs.map((o) => field(o, 'Herbarium Name')).filter(Boolean))),
  genbank: obs.map((o) => field(o, 'Genbank Accession Number', 'GenBank number (URL)')).filter(Boolean),
  months: count(obs.filter((o) => o.observed_on).map((o) => Number(o.observed_on.slice(5, 7)))),
  years: count(obs.filter((o) => o.observed_on).map((o) => o.observed_on.slice(0, 4))),
  regions: sorted(count(obs.map(regionOf))),
  // Keyword screens of the observation notes: a rough count of what collectors wrote down, not a full audit.
  notesWritten: notes.filter((t) => t.trim()).length,
  characters: {
    sporePrint: mentions(/spore ?print/),
    odor: mentions(/odou?r|smell/),
    taste: mentions(/taste|acrid|peppery/),
    chemicalTests: mentions(/\bkoh\b|feso4|iron salts|guaiac/),
    trees: mentions(/\boak|quercus|beech|fagus|hemlock|tsuga|pine|pinus|birch|betula|maple|acer|hickory|carya/),
    substrate: mentions(/soil|moss|ground|litter|duff/),
  },
  photos: sequenced
    .filter((o) => o.photos?.[0]?.license_code)
    .map((o) => ({
      id: o.id, date: o.observed_on, region: regionOf(o), user: o.user.login,
      url: o.photos[0].url.replace('/square.', '/medium.'),
      attribution: o.photos[0].attribution, license: o.photos[0].license_code,
    })),
};

await mkdir('src/data/cases', { recursive: true });
await writeFile(`src/data/cases/${slug}.json`, JSON.stringify(summary, null, 1) + '\n');
console.log(`${name}: ${summary.observations} observations, ${summary.sequenced} sequenced, ${summary.observers} observers → src/data/cases/${slug}.json`);
