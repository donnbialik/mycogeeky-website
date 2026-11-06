import { useEffect, useState } from 'react';

const PROJECT = 'crane-hollow-fungal-diversity-survey';
const URL = 'https://www.inaturalist.org/projects/' + PROJECT;
const API = 'https://api.inaturalist.org/v1';
type Summary = { observations:number|null; taxa:number|null; contributors:number|null; created:string|null; monthly:{month:string;count:number}[]; updated:string };
const number = (n:number|null) => n === null ? '—' : n.toLocaleString();
async function get(path:string) {
  const response = await fetch(API + path, { headers:{ Accept:'application/json' } });
  if (!response.ok) throw new Error('iNaturalist API unavailable');
  return response.json();
}
export default function SurveyDashboard() {
  const [data,setData] = useState<Summary|null>(null);
  const [error,setError] = useState(false);
  const [expanded,setExpanded] = useState(false);
  useEffect(() => {
    let active=true;
    const query = '?project_id=' + encodeURIComponent(PROJECT);
    Promise.allSettled([
      get('/projects/' + PROJECT),
      get('/observations' + query + '&per_page=0'),
      get('/observations/species_counts' + query + '&per_page=0'),
      get('/observations/observers' + query + '&per_page=0'),
      get('/observations/histogram' + query + '&date_field=observed&interval=month')
    ]).then(results => {
      if (!active) return;
      const value=(i:number) => results[i].status==='fulfilled' ? results[i].value : null;
      const project=value(0)?.results?.[0];
      const histogram=value(4)?.results?.month ?? {};
      const monthly=Object.entries(histogram).map(([month,count])=>({month,count:Number(count)})).filter(p=>Number.isFinite(p.count)).sort((a,b)=>a.month.localeCompare(b.month));
      const next:Summary={observations:value(1)?.total_results ?? null,taxa:value(2)?.total_results ?? null,contributors:value(3)?.total_results ?? null,created:project?.created_at ?? null,monthly,updated:new Date().toLocaleString()};
      setData(next);
      setError(results.every(r=>r.status==='rejected'));
    }).catch(()=>setError(true));
    return ()=>{active=false};
  },[]);
  const recent=data?.monthly.slice(-12) ?? [];
  const max=Math.max(1,...recent.map(m=>m.count));
  return <section className="survey-dashboard" aria-label="Crane Hollow project dashboard">
    <div className="survey-dashboard-heading"><div><span className="eyebrow">PROJECT SNAPSHOT · iNATURALIST</span><h3>Crane Hollow Fungal Diversity Survey</h3><p>A growing record of fungal observations from Crane Hollow Nature Preserve.</p></div><a href={URL} target="_blank" rel="noopener noreferrer">View iNaturalist project ↗</a></div>
    <div className="survey-metrics">
      <div><span>Observations</span><strong>{data?number(data.observations):'—'}</strong></div>
      <div><span>Recorded taxa</span><strong>{data?number(data.taxa):'—'}</strong></div>
      <div><span>Contributors</span><strong>{data?number(data.contributors):'—'}</strong></div>
      <div><span>Project created</span><strong className="survey-date">{data?.created?new Date(data.created).toLocaleDateString(undefined,{month:'short',year:'numeric'}):'—'}</strong></div>
    </div>
    <button className="story-open" type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Hide survey activity ↑':'Explore survey activity ↓'}</button>
    {expanded && <div className="survey-chart-wrap"><h4>Observations by month</h4>{recent.length ? <div className="survey-chart" role="img" aria-label={'Monthly observation counts: '+recent.map(p=>p.month+': '+p.count).join(', ')}>{recent.map(p=><div className="survey-chart-col" key={p.month}><span className="survey-chart-count">{p.count}</span><div className="survey-chart-bar" style={{height:Math.max(2,p.count/max*140)+'px'}}/><span className="survey-chart-month">{p.month.slice(5)}</span></div>)}</div>:<p>Monthly activity data is not available yet.</p>}<p className="survey-data-note">Monthly bars show observations by date observed, not formal sampling visits. They do not measure effort or species richness directly.</p></div>}
    <p className="survey-data-note">{error?'Live data could not be loaded. Use the iNaturalist project link for current records.':data?'Live iNaturalist snapshot retrieved '+data.updated+'.':'Loading live iNaturalist statistics…'} Recorded taxa are not necessarily confirmed species. Formal sampling visits are tracked separately and are not yet available.</p>
  </section>;
}
