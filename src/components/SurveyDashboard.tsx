import { useEffect, useState } from 'react';

const PROJECT = 'crane-hollow-fungal-diversity-survey';
const URL = 'https://www.inaturalist.org/projects/' + PROJECT;
const API = 'https://api.inaturalist.org/v1';

type Summary = { observations:number|null; taxa:number|null; contributors:number|null; created:string|null; updated:string };
const number = (n:number|null) => n === null ? '—' : n.toLocaleString();
async function get(path:string) {
  const response = await fetch(API + path, { headers:{ Accept:'application/json' } });
  if (!response.ok) throw new Error('iNaturalist API unavailable');
  return response.json();
}
export default function SurveyDashboard() {
  const [data,setData] = useState<Summary|null>(null);
  const [error,setError] = useState(false);
  const [partial,setPartial] = useState(false);
  const [loading,setLoading] = useState(true);
  const [refresh,setRefresh] = useState(0);
  useEffect(() => {
    let active=true;
    setLoading(true);setError(false);setPartial(false);
    const query = '?project_id=' + encodeURIComponent(PROJECT);
    Promise.allSettled([
      get('/projects/' + PROJECT),
      get('/observations' + query + '&per_page=0'),
      get('/observations/species_counts' + query + '&per_page=0'),
      get('/observations/observers' + query + '&per_page=0')
    ]).then(results => {
      if (!active) return;
      const value=(i:number) => results[i].status==='fulfilled' ? results[i].value : null;
      const project=value(0)?.results?.[0];
      const next:Summary={observations:value(1)?.total_results ?? null,taxa:value(2)?.total_results ?? null,contributors:value(3)?.total_results ?? null,created:project?.created_at ?? null,updated:new Date().toLocaleString()};
      setData(next);
      setError(results.every(r=>r.status==='rejected'));
      setPartial(results.some(r=>r.status==='rejected')&&results.some(r=>r.status==='fulfilled'));
      setLoading(false);
    }).catch(()=>{if(active){setError(true);setLoading(false)}});
    return ()=>{active=false};
  },[refresh]);
  return <section className="survey-dashboard" style={{color:"#1b3029",backgroundColor:"#fffefa"}} aria-label="Crane Hollow project dashboard">
    <div className="survey-dashboard-heading"><div><span className="eyebrow">PROJECT SNAPSHOT · iNATURALIST</span><h3 style={{color:"#1b3029"}}>Crane Hollow Fungal Diversity Survey</h3><p>A growing record of fungal observations from Crane Hollow Nature Preserve.</p></div><a href={URL} style={{color:"#1b3029"}} target="_blank" rel="noopener noreferrer">View iNaturalist project ↗</a></div>
    <div className="survey-metrics">
      <div><span>Observations</span><strong style={{color:"#1b3029"}}>{data?number(data.observations):'—'}</strong></div>
      <div><span>Recorded taxa</span><strong style={{color:"#1b3029"}}>{data?number(data.taxa):'—'}</strong></div>
      <div><span>Contributors</span><strong style={{color:"#1b3029"}}>{data?number(data.contributors):'—'}</strong></div>
      <div><span>Project created</span><strong className="survey-date" style={{color:"#1b3029"}}>{data?.created?new Date(data.created).toLocaleDateString(undefined,{month:'short',year:'numeric'}):'—'}</strong></div>
    </div>
    <div className="mv-survey-feedback" data-state={loading?'loading':error?'error':partial?'partial':'ready'} role="status" aria-live="polite">
      <span aria-hidden="true">{loading?'◷':error?'!':partial?'!':'✓'}</span>
      <p>{loading?'Loading live iNaturalist statistics…':error?'Live data could not be loaded; the values above are not current.':partial?'Some iNaturalist figures could not be retrieved. Missing values are shown as dashes.':'Live snapshot retrieved '+data?.updated+'.'} Recorded taxa are not necessarily confirmed species. Formal sampling visits are tracked separately.</p>
      {!loading&&(error||partial)&&<button type="button" onClick={()=>setRefresh(n=>n+1)}>Try again ↻</button>}
    </div>
  </section>;
}
