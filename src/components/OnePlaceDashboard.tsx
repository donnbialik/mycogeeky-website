import { useEffect, useState } from 'react';

const PROJECT = 'one-place-a-thousand-questions-my-home-biodiversity-inventory';
const API = 'https://api.inaturalist.org/v1';
type Stats = {
  fungalObservations: number | null;
  fungalSpecies: number | null;
  mushroomObservations: number | null;
  mushroomSpecies: number | null;
  ascomyceteSpecies: number | null;
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
  // species_counts can include subspecies and other ranks. Count only distinct
  // taxon IDs explicitly identified at species rank.
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
  for (let page=2; page<=pages; page++) collect(await get(url + '&page=' + page));
  return ids.size;
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
    const project = 'project_id=' + encodeURIComponent(PROJECT);
    const run = async (): Promise<Stats> => {
      const fungi = project + '&iconic_taxa=Fungi';
      const [fungalObservations, fungalSpecies, agaricomycetesId, ascomycotaId] = await Promise.all([
        optional(get('/observations?' + fungi + '&per_page=0').then(d => d.total_results as number)),
        optional(speciesCount(fungi)),
        optional(getTaxonId('Agaricomycetes', 'class')),
        optional(getTaxonId('Ascomycota', 'phylum'))
      ]);
      const [mushroomObservations, mushroomSpecies, ascomyceteSpecies] = await Promise.all([
        agaricomycetesId == null ? Promise.resolve(null) : optional(get('/observations?' + project + '&taxon_id=' + agaricomycetesId + '&per_page=0').then(d => d.total_results as number)),
        agaricomycetesId == null ? Promise.resolve(null) : optional(speciesCount(project + '&taxon_id=' + agaricomycetesId)),
        ascomycotaId == null ? Promise.resolve(null) : optional(speciesCount(project + '&taxon_id=' + ascomycotaId))
      ]);
      const warnings: string[] = [];
      if (fungalObservations == null) warnings.push('The fungal observation total could not be loaded.');
      if (fungalSpecies == null) warnings.push('The fungal species list could not be loaded.');
      if (mushroomObservations == null || mushroomSpecies == null) warnings.push('Some mushroom-class figures could not be loaded.');
      if (ascomyceteSpecies == null) warnings.push('The ascomycete breakdown could not be loaded.');
      const suspect = typeof fungalObservations === 'number' && fungalObservations > 50 &&
        typeof mushroomObservations === 'number' && mushroomObservations <= 1;
      if (suspect) warnings.push('The mushroom filter returned an implausibly small count; it has been hidden.');
      return { fungalObservations, fungalSpecies,
        mushroomObservations: suspect ? null : mushroomObservations,
        mushroomSpecies: suspect ? null : mushroomSpecies,
        ascomyceteSpecies,
        updated: new Date().toLocaleString(), warnings };
    };
    run().then(data => {
      if (!active) return;
      setStats(data);
      setError(data.fungalObservations == null && data.fungalSpecies == null && data.mushroomObservations == null);
      setLoading(false);
    }).catch(() => { if (active) { setError(true); setLoading(false); } });
    return () => { active = false; };
  }, [refresh]);

  return <section className="one-place-dashboard" aria-label="Home fungal biodiversity inventory dashboard">
    <div className="opd-top"><div><p className="opd-eyebrow">A LIVING EXAMPLE · INATURALIST DATA</p><h2>One property. An expanding record.</h2><p>My Northeast Ohio home fungal inventory, curated observation by observation.</p></div><span className="opd-live">LIVE DATA</span></div>
    <div className="opd-metrics">
      <div><span>Fungal observations</span><strong>{display(stats?.fungalObservations)}</strong><small>Fungal records currently returned by iNaturalist</small></div>
      <div><span>Documented fungal species</span><strong>{display(stats?.fungalSpecies)}</strong><small>Distinct species-ranked fungal identifications</small></div>
      <div><span>Mushroom-group observations</span><strong>{display(stats?.mushroomObservations)}</strong><small>Observations in the class Agaricomycetes</small></div>
    </div>
    <div className="opd-breakdown"><div><span className="opd-breakdown-title">A closer look at fungal diversity</span><p>Species-ranked identifications within two major fungal lineages:</p></div>
      <div className="opd-breakdown-values"><div><span>Agaricomycetes</span><strong>{display(stats?.mushroomSpecies)}</strong><small>Most familiar mushrooms, brackets and puffballs</small></div><div><span>Ascomycota</span><strong>{display(stats?.ascomyceteSpecies)}</strong><small>Includes many cup fungi, morels and lichen-forming fungi</small></div></div>
    </div>
    <div className="opd-foot" aria-live="polite" role="status"><p>{loading ? 'Loading iNaturalist statistics…' : error ? 'iNaturalist statistics are unavailable; retry to load current values.' : 'Retrieved ' + stats?.updated + '. ' + (stats?.warnings.length ? stats.warnings.join(' ') : 'Counts reflect the current public search data.')} Species-ranked names are not necessarily independently confirmed. Search totals may differ from the iNaturalist Traditional Project overview; these are not estimates of total biodiversity.</p>{!loading && (error || Boolean(stats?.warnings.length)) && <button type="button" onClick={() => setRefresh(n => n + 1)}>Retry loading ↻</button>}</div>
  </section>;
}
