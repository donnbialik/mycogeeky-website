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
  const [expanded,setExpanded] = useState(false);
  useEffect(() => {
    let active=true;
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
    }).catch(()=>setError(true));
    return ()=>{active=false};
  },[]);
  return <section className="survey-dashboard" aria-label="Crane Hollow project dashboard">
    <div className="survey-dashboard-heading"><div><span className="eyebrow">PROJECT SNAPSHOT · iNATURALIST</span><h3>Crane Hollow Fungal Diversity Survey</h3><p>A growing record of fungal observations from Crane Hollow Nature Preserve.</p></div><a href={URL} target="_blank" rel="noopener noreferrer">View iNaturalist project ↗</a></div>
    <div className="survey-metrics">
      <div><span>Observations</span><strong>{data?number(data.observations):'—'}</strong></div>
      <div><span>Recorded taxa</span><strong>{data?number(data.taxa):'—'}</strong></div>
      <div><span>Contributors</span><strong>{data?number(data.contributors):'—'}</strong></div>
      <div><span>Project created</span><strong className="survey-date">{data?.created?new Date(data.created).toLocaleDateString(undefined,{month:'short',year:'numeric'}):'—'}</strong></div>
    </div>
    <button className="story-open" type="button" aria-expanded={expanded} aria-controls="crane-provisional-details" onClick={()=>setExpanded(!expanded)}>{expanded?'Hide provisional taxa ↑':'Explore provisional taxa ↓'}</button>
    {expanded && <div className="survey-chart-wrap" id="crane-provisional-details">
      <h4>Provisional taxa: questions worth investigating</h4>
      <p>DNA barcoding can reveal fungal lineages that don't yet have a confidently established species name. Researchers sometimes use provisional labels while comparing sequences, collections, morphology, and published descriptions.</p>
      <p>A provisional name does <strong>not</strong> automatically mean a new species has been discovered. Some lineages may correspond to already-described taxa; others may need more evidence or formal taxonomic work.</p>
      <p><strong>Crane Hollow provisional taxa list:</strong> A verified project-specific list is being prepared. We won't publish a count or names until the supporting observations and sequence evidence have been reviewed.</p>
      <a href={URL} target="_blank" rel="noopener noreferrer">Explore the survey observations on iNaturalist ↗</a>
    </div>}
    <p className="survey-data-note">{error?'Live data could not be loaded. Use the iNaturalist project link for current records.':data?'Live iNaturalist snapshot retrieved '+data.updated+'.':'Loading live iNaturalist statistics…'} Recorded taxa are not necessarily confirmed species. Formal sampling visits are tracked separately and are not yet available.</p>
  </section>;
}
