import { useEffect, useState } from 'react';

const PROJECT = 'one-place-a-thousand-questions-my-home-biodiversity-inventory';
const API = 'https://api.inaturalist.org/v1';
type Stats = { observations: number | null; mushroomObservations: number | null; mushroomSpecies: number | null; fungalObservations: number | null; updated: string };
const display = (n:number|null|undefined) => n == null ? '—' : n.toLocaleString();
async function get(path:string) {
  const response = await fetch(API + path, { headers: { Accept:'application/json' } });
  if (!response.ok) throw new Error('iNaturalist request failed (' + response.status + ')');
  return response.json();
}
export default function OnePlaceDashboard() {
  const [stats,setStats] = useState<Stats|null>(null);
  const [error,setError] = useState(false);
  const [loading,setLoading] = useState(true);
  const [refresh,setRefresh] = useState(0);
  useEffect(()=>{
    let active = true;
    setLoading(true);setError(false);
    const base = '?project_id=' + encodeURIComponent(PROJECT) + '&per_page=0';
    // Agaricomycetes is the broad mushroom / bracket-fungus / puffball group on iNaturalist.
    // Count only species-ranked identifications for the species metric, not genera or provisional labels.
    Promise.allSettled([
      get('/observations' + base),
      get('/observations' + base + '&taxon_name=Agaricomycetes'),
      get('/observations/species_counts' + base + '&taxon_name=Agaricomycetes&rank=species'),
      get('/observations' + base + '&iconic_taxa=Fungi')
    ]).then(results=>{
      if(!active) return;
      const v=(i:number)=>results[i].status==='fulfilled' ? results[i].value : null;
      const next:Stats={observations:v(0)?.total_results ?? null,
        mushroomObservations:v(1)?.total_results ?? null,
        mushroomSpecies:v(2)?.total_results ?? null,
        fungalObservations:v(3)?.total_results ?? null,
        updated:new Date().toLocaleString()};
      setStats(next);
      setError(results.every(r=>r.status==='rejected'));
      setLoading(false);
    }).catch(()=>{if(active){setError(true);setLoading(false)}});
    return ()=>{active=false};
  },[refresh]);
  return <section className="one-place-dashboard" aria-label="Home biodiversity inventory live statistics">
    <div className="opd-top"><div><p className="opd-eyebrow">A LIVING EXAMPLE · INATURALIST DATA</p><h2>One property. An expanding record.</h2><p>My own Northeast Ohio home inventory, curated observation by observation.</p></div><span className="opd-live">LIVE DATA</span></div>
    <div className="opd-metrics">
      <div><span>Total observations</span><strong>{display(stats?.observations)}</strong><small>All organisms added to the project</small></div>
      <div><span>Mushroom-group species</span><strong>{display(stats?.mushroomSpecies)}</strong><small>Species-level identifications in Agaricomycetes</small></div>
      <div><span>Mushroom-group observations</span><strong>{display(stats?.mushroomObservations)}</strong><small>Includes observations identified only to broader groups</small></div>
      <div><span>Fungal observations</span><strong>{display(stats?.fungalObservations)}</strong><small>Fungi throughout the project, including lichens</small></div>
    </div>
    <div className="opd-foot" aria-live="polite" role="status"><p>{loading?'Retrieving current project totals from iNaturalist…':error?'iNaturalist data could not be retrieved. Counts are unavailable.':stats?.observations===null?'No observation total was returned. The project may be empty or unavailable.':'Retrieved '+stats?.updated+'. Counts change as observations are added and identifications are refined.'} “Mushroom-group species” is a practical taxonomic proxy, not a complete inventory of every mushroom-forming lineage. Species-level IDs are not necessarily independently confirmed.</p>{!loading&&(error||stats?.observations===null)&&<button type="button" onClick={()=>setRefresh(n=>n+1)}>Retry loading ↻</button>}</div>
  </section>;
}
