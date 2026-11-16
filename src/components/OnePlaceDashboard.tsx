import { useEffect, useState } from 'react';
import './OnePlaceDashboard.css';

const PROJECT = 'one-place-a-thousand-questions-my-home-biodiversity-inventory';
const API = 'https://api.inaturalist.org/v1';
const BASE = 'project_id=' + encodeURIComponent(PROJECT);
type GenusCount = { name: string; count: number };
type Stats = {
  fungalObservations: number | null;
  fungalSpecies: number | null;
  mushroomObservations: number | null;
  mushroomSpecies: number | null;
  ascomyceteSpecies: number | null;
  topGenera: GenusCount[] | null;
  updated: string;
  warnings: string[];
};
const display = (n: number | null | undefined) => n == null ? '—' : n.toLocaleString();

async function get(path: string) {
  const response = await fetch(API + path, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('iNaturalist request failed (' + response.status + ')');
  return response.json();
}
async function getTaxonId(name: string, rank: string): Promise<number> {
  const data = await get('/taxa?q=' + encodeURIComponent(name) + '&rank=' + rank + '&per_page=30');
  const taxon = data.results?.find((t: {name?: string; rank?: string; id?: number}) => t.name === name && t.rank === rank);
  if (typeof taxon?.id !== 'number') throw new Error('Could not resolve taxon: ' + name);
  return taxon.id;
}
async function speciesCount(query: string): Promise<number> {
  const url = '/observations/species_counts?' + query + '&per_page=500';
  const ids = new Set<number>();
  const collect = (data: {results?: Array<{taxon?: {id?: number; rank?: string}}>}) => {
    for (const entry of data.results ?? []) {
      if (entry.taxon?.rank === 'species' && typeof entry.taxon.id === 'number') ids.add(entry.taxon.id);
    }
  };
  const first = await get(url + '&page=1');
  const total = first.total_results;
  if (typeof total !== 'number' || total < 0) throw new Error('Invalid species count response');
  collect(first);
  const pages = Math.ceil(total / 500);
  if (pages > 20) throw new Error('Species list exceeds dashboard limit');
  for (let page = 2; page <= pages; page++) collect(await get(url + '&page=' + page));
  return ids.size;
}
async function topGenera(query: string): Promise<GenusCount[]> {
  // Rank genera by unique species-ranked taxon IDs, not observation counts.
  // Each species contributes at most one to its genus, regardless of how
  // many times it was observed. Higher-rank identifications are excluded.
  const url = '/observations/species_counts?' + query + '&per_page=500';
  const first = await get(url + '&page=1');
  const total = first.total_results;
  if (!Number.isInteger(total) || total < 0) throw new Error('Invalid species list response');
  const pages = Math.ceil(total / 500);
  if (pages > 20) throw new Error('Species list exceeds dashboard ranking limit');
  const seen = new Set<number>();
  const genera = new Map<string, number>();
  const collect = (data: {results?: Array<{taxon?: {id?: number; rank?: string; name?: string}}>}) => {
    for (const entry of data.results ?? []) {
      const taxon = entry.taxon;
      if (taxon?.rank !== 'species' || typeof taxon.id !== 'number' || !taxon.name || seen.has(taxon.id)) continue;
      // Species-ranked iNaturalist scientific names are binomials; the
      // first word identifies the genus without assigning unknown taxa.
      const parts = taxon.name.trim().split(/\\s+/);
      if (parts.length < 2 || !/^[A-Z][a-zA-Z-]+$/.test(parts[0])) continue;
      seen.add(taxon.id);
      genera.set(parts[0], (genera.get(parts[0]) ?? 0) + 1);
    }
  };
  collect(first);
  for (let page=2; page<=pages; page++) collect(await get(url + '&page=' + page));
  return [...genera].map(([name,count]) => ({name,count}))
    .sort((a,b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0,5);
}
async function optional<T>(promise: Promise<T>): Promise<T | null> {
  try { return await promise; } catch { return null; }
}

export default function OnePlaceDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(false); setStats(null);
    const run = async (): Promise<Stats> => {
      const fungi = BASE + '&iconic_taxa=Fungi';
      const [fungalObservations, fungalSpecies, agaricomycetesId, ascomycotaId, genera] = await Promise.all([
        optional(get('/observations?' + fungi + '&per_page=0').then(d => d.total_results as number)),
        optional(speciesCount(fungi)),
        optional(getTaxonId('Agaricomycetes', 'class')),
        optional(getTaxonId('Ascomycota', 'phylum')),
        optional(topGenera(fungi))
      ]);
      const [mushroomObservations, mushroomSpecies, ascomyceteSpecies] = await Promise.all([
        agaricomycetesId == null ? Promise.resolve(null) : optional(get('/observations?' + BASE + '&taxon_id=' + agaricomycetesId + '&per_page=0').then(d => d.total_results as number)),
        agaricomycetesId == null ? Promise.resolve(null) : optional(speciesCount(BASE + '&taxon_id=' + agaricomycetesId)),
        ascomycotaId == null ? Promise.resolve(null) : optional(speciesCount(BASE + '&taxon_id=' + ascomycotaId))
      ]);
      const warnings: string[] = [];
      if (fungalObservations == null) warnings.push('Fungal observation total unavailable.');
      if (fungalSpecies == null) warnings.push('Fungal species total unavailable.');
      if (mushroomObservations == null || mushroomSpecies == null) warnings.push('Some mushroom-group figures unavailable.');
      if (ascomyceteSpecies == null) warnings.push('Ascomycete count unavailable.');
      if (genera == null) warnings.push('Genus ranking unavailable.');
      const suspicious = typeof fungalObservations === 'number' && fungalObservations > 50 &&
        typeof mushroomObservations === 'number' && mushroomObservations <= 1;
      if (suspicious) warnings.push('Mushroom filter returned implausibly few observations; figure withheld.');
      return {
        fungalObservations, fungalSpecies,
        mushroomObservations: suspicious ? null : mushroomObservations,
        mushroomSpecies: suspicious ? null : mushroomSpecies,
        ascomyceteSpecies,
        topGenera: genera,
        updated: new Date().toLocaleString(), warnings
      };
    };
    run().then(data => {
      if (!active) return;
      setStats(data);
      setError(data.fungalObservations == null && data.fungalSpecies == null && data.mushroomObservations == null);
      setLoading(false);
    }).catch(() => { if (active) { setError(true); setLoading(false); } });
    return () => { active = false; };
  }, [refresh]);

  const maxGenusCount = stats?.topGenera?.[0]?.count ?? 0;
  return <section className="one-place-dashboard" aria-label="Home fungal biodiversity inventory dashboard">
    <div className="opd-header">
      <div><p className="opd-eyebrow">A LIVING EXAMPLE · INATURALIST DATA</p>
        <h3>One property. An expanding record.</h3>
        <p>My Northeast Ohio home fungal inventory, curated observation by observation.</p></div>
      <span className="opd-live">LIVE DATA</span>
    </div>
    <div className="opd-stat-grid">
      <div className="opd-stat"><span>Fungal observations</span><strong>{display(stats?.fungalObservations)}</strong><small>Fungal records returned by iNaturalist</small></div>
      <div className="opd-stat"><span>Documented fungal species</span><strong>{display(stats?.fungalSpecies)}</strong><small>Distinct species-ranked identifications</small></div>
      <div className="opd-stat"><span>Mushroom-group observations</span><strong>{display(stats?.mushroomObservations)}</strong><small>Observations in Agaricomycetes</small></div>
    </div>
    <div className="opd-detail-grid">
      <div className="opd-panel">
        <p className="opd-panel-kicker">TAXONOMIC SNAPSHOT</p>
        <h4>A closer look at diversity</h4>
        <p className="opd-panel-lead">Documented species within two major fungal lineages.</p>
        <div className="opd-lineage"><div><em>Agaricomycetes</em><small>Most familiar mushrooms, brackets &amp; puffballs</small></div><strong>{display(stats?.mushroomSpecies)}</strong></div>
        <div className="opd-lineage"><div><em>Ascomycota</em><small>Includes morels, cup fungi &amp; many lichens</small></div><strong>{display(stats?.ascomyceteSpecies)}</strong></div>
      </div>
      <div className="opd-panel">
        <p className="opd-panel-kicker">MOST SPECIES-RICH GENERA</p>
        <h4>Top five genera</h4>
        <p className="opd-panel-lead">Distinct species-ranked identifications per genus; repeated sightings count once.</p>
        {stats?.topGenera?.length ? <ol className="opd-genera">
          {stats.topGenera.map((g, index) => <li key={g.name}>
            <span className="opd-rank">{String(index+1).padStart(2,'0')}</span>
            <span className="opd-genus-main"><em>{g.name}</em><span className="opd-bar-track" aria-hidden="true"><span className="opd-bar-fill" style={{width: maxGenusCount ? (100*g.count/maxGenusCount)+'%' : '0%'}} /></span></span>
            <strong>{g.count}</strong>
          </li>)}
        </ol> : <p className="opd-empty">{loading ? 'Calculating genus rankings…' : stats?.topGenera ? 'No genus-level identifications available yet.' : 'Genus ranking temporarily unavailable.'}</p>}
      </div>
    </div>
    <div className="opd-footer" aria-live="polite" role="status">
      <p>{loading ? 'Loading current iNaturalist records…' : error ? 'Unable to load current statistics.' : 'Updated ' + stats?.updated + '. ' + (stats?.warnings.length ? stats.warnings.join(' ') : 'Data retrieved successfully.')} Species-level names may be provisional. Genus ranking counts distinct species-ranked names, excluding observations without species-level identifications. Search counts can differ from the Traditional Project overview and do not measure total site biodiversity.</p>
      {!loading && (error || Boolean(stats?.warnings.length)) && <button type="button" onClick={() => setRefresh(n=>n+1)}>Retry ↻</button>}
    </div>
  </section>;
}
