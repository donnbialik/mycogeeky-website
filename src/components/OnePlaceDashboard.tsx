import { useEffect, useState } from 'react';

const PROJECT = 'one-place-a-thousand-questions-my-home-biodiversity-inventory';
const API = 'https://api.inaturalist.org/v1';
type Stats = { observations:number|null; mushroomObservations:number|null; mushroomSpecies:number|null; fungalObservations:number|null; updated:string; warning:string|null };
const display=(n:number|null|undefined)=>n == null ? '—' : n.toLocaleString();

async function get(path:string) {
  const response=await fetch(API + path, {headers:{Accept:'application/json'}});
  if(!response.ok) throw new Error('iNaturalist request failed (' + response.status + ')');
  return response.json();
}
async function findMushroomClass():Promise<number> {
  const data=await get('/taxa?q=Agaricomycetes&rank=class&per_page=20');
  const taxon=data.results?.find((t:any)=>t.name==='Agaricomycetes' && t.rank==='class');
  if(typeof taxon?.id!=='number') throw new Error('Could not resolve Agaricomycetes in iNaturalist taxonomy');
  return taxon.id;
}
async function getMushroomSpecies(base:string,taxonId:number):Promise<number> {
  // The species_counts endpoint can include infraspecific and unresolved leaf taxa.
  // Fetch the list and count only distinct species-ranked names, rather than treating
  // its unfiltered total_results as an exact species tally.
  const ids=new Set<number>();
  const path='/observations/species_counts'+base+'&taxon_id='+taxonId+'&per_page=500';
  const first=await get(path+'&page=1');
  const collect=(data:any)=>{
    for(const row of data.results??[]) if(row.taxon?.rank==='species' && typeof row.taxon.id==='number') ids.add(row.taxon.id);
  };
  collect(first);
  const total=Number(first.total_results??0);
  if(!Number.isFinite(total)) throw new Error('Invalid taxa count response');
  const pages=Math.ceil(total/500);
  if(pages>20) throw new Error('Species list too large for this dashboard');
  for(let page=2;page<=pages;page++) collect(await get(path+'&page='+page));
  return ids.size;
}

export default function OnePlaceDashboard() {
  const [stats,setStats]=useState<Stats|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [refresh,setRefresh]=useState(0);
  useEffect(()=>{
    let active=true;
    setLoading(true);setError(false);
    // Use the project's own headline count rather than the broader observation
    // search, which can disagree with the Traditional Project overview.
    const base='?project_id='+encodeURIComponent(PROJECT);
    const run=async()=>{
      const [projectResult, fungusResult, classResult]=await Promise.allSettled([
        get('/projects/'+PROJECT),
        get('/observations'+base+'&iconic_taxa=Fungi&per_page=0'),
        findMushroomClass()
      ]);
      const project=projectResult.status==='fulfilled' ? projectResult.value.results?.[0] : null;
      const fungalObservations=fungusResult.status==='fulfilled' ? fungusResult.value.total_results??null : null;
      const taxonId=classResult.status==='fulfilled' ? classResult.value : null;
      const mushroomResult=taxonId==null ? null : await Promise.allSettled([
        get('/observations'+base+'&taxon_id='+taxonId+'&per_page=0'),
        getMushroomSpecies(base,taxonId)
      ]);
      const mushroomObservations=mushroomResult?.[0]?.status==='fulfilled' ? mushroomResult[0].value.total_results??null : null;
      const mushroomSpecies=mushroomResult?.[1]?.status==='fulfilled' ? mushroomResult[1].value : null;
      // Don't silently display an implausible near-zero mushroom tally for a
      // project dominated by fungi; flag it for review instead.
      const suspicious=typeof fungalObservations==='number' && fungalObservations>50 &&
        typeof mushroomObservations==='number' && mushroomObservations<=1;
      const officialCount=project?.project_observations_count ?? project?.observations_count ?? project?.observation_count ?? null;
      const warning=suspicious ? 'The mushroom-specific filter returned an unexpectedly low count. That figure has been withheld pending verification.' :
        taxonId==null ? 'Mushroom-group taxonomy could not be retrieved. Those counts are unavailable.' :
        !project ? 'Project summary could not be retrieved. Its headline observation count is unavailable.' : null;
      return {observations:typeof officialCount==='number'?officialCount:null,
        mushroomObservations:suspicious?null:mushroomObservations,
        mushroomSpecies:suspicious?null:mushroomSpecies,
        fungalObservations,updated:new Date().toLocaleString(),warning} as Stats;
    };
    run().then(next=>{if(active){setStats(next);setError(false);setLoading(false)}})
      .catch(()=>{if(active){setError(true);setLoading(false)}});
    return ()=>{active=false};
  },[refresh]);
  return <section className="one-place-dashboard" aria-label="Home biodiversity inventory statistics">
    <div className="opd-top"><div><p className="opd-eyebrow">A LIVING EXAMPLE · INATURALIST DATA</p><h2>One property. An expanding record.</h2><p>My own Northeast Ohio home inventory, curated observation by observation.</p></div><span className="opd-live">LIVE DATA</span></div>
    <div className="opd-metrics">
      <div><span>Project observations</span><strong>{display(stats?.observations)}</strong><small>Count reported by the iNaturalist project summary</small></div>
      <div><span>Mushroom-group species</span><strong>{display(stats?.mushroomSpecies)}</strong><small>Species-ranked taxa within Agaricomycetes</small></div>
      <div><span>Mushroom-group observations</span><strong>{display(stats?.mushroomObservations)}</strong><small>Observations in Agaricomycetes, including broader IDs</small></div>
      <div><span>Fungal observations</span><strong>{display(stats?.fungalObservations)}</strong><small>Fungi across the project, including lichens</small></div>
    </div>
    <div className="opd-foot" aria-live="polite" role="status"><p>{loading?'Loading iNaturalist project totals…':error?'Could not retrieve project statistics. Counts are unavailable.':'Retrieved '+stats?.updated+'. '+(stats?.warning??'Counts change as observations and identifications change.')} Mushroom-group figures cover Agaricomycetes, not every mushroom-forming lineage. Species-ranked names are not necessarily independently confirmed.</p>{!loading&&(error||stats?.warning)&&<button type="button" onClick={()=>setRefresh(n=>n+1)}>Retry loading ↻</button>}</div>
  </section>;
}
