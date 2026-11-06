import { useEffect, useState } from 'react';

const PROJECT = 'crane-hollow-fungal-diversity-survey';
const URL = 'https://www.inaturalist.org/projects/' + PROJECT;
const API = 'https://api.inaturalist.org/v1';
type Provisional = { name:string; ids:number[]; barcodeCount:number };
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
  const [provisionals,setProvisionals] = useState<Provisional[]>([]);
  const [provisionalStatus,setProvisionalStatus] = useState<'idle'|'loading'|'ready'|'error'|'limited'>('idle');
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
  useEffect(() => {
    if (!expanded || provisionalStatus !== 'idle') return;
    let active=true;
    const load=async()=>{
      setProvisionalStatus('loading');
      const grouped=new Map<string,Set<number>>();
      const barcoded=new Map<string,Set<number>>();
      try {
        // Read observation field values (ofvs) directly; never infer provisional status from taxon IDs.
        const pageSize=200;
        let page=1;
        let total=0;
        while (page<=50) {
          const payload=await get('/observations?project_id='+encodeURIComponent(PROJECT)+'&per_page='+pageSize+'&page='+page);
          total=Number(payload.total_results ?? 0);
          for (const observation of payload.results ?? []) {
            const fields=(observation.ofvs ?? []).map((entry:{name?:string;value?:string;observation_field?:{name?:string}})=>({
              name:String(entry.name ?? entry.observation_field?.name ?? '').trim().replace(/:$/, '').trim().toLowerCase(),
              value:String(entry.value ?? '').trim()
            }));
            const provisional=fields.find((field:{name:string;value:string})=>field.name==='provisional species name' && field.value);
            if (!provisional || !Number.isFinite(observation.id)) continue;
            const key=provisional.value.toLowerCase();
            if (!grouped.has(key)) grouped.set(key,new Set());
            grouped.get(key)!.add(Number(observation.id));
            if (!names.has(key)) names.set(key,provisional.value);
            if (fields.some((field:{name:string;value:string})=>field.name==='dna barcode its' && field.value)) {
              if (!barcoded.has(key)) barcoded.set(key,new Set());
              barcoded.get(key)!.add(Number(observation.id));
            }
          }
          if (page*pageSize>=total || !(payload.results ?? []).length) break;
          page++;
        }
        if (!active) return;
        setProvisionals([...grouped].map(([key,ids])=>({name:names.get(key)??key,ids:[...ids],barcodeCount:barcoded.get(key)?.size??0})).sort((a,b)=>b.ids.length-a.ids.length||a.name.localeCompare(b.name)));
        setProvisionalStatus(page*pageSize<total?'limited':'ready');
      } catch {
        if (active) setProvisionalStatus('error');
      }
    };
    const names=new Map<string,string>();
    void load();
    return ()=>{active=false};
  },[expanded]);
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
      <p>DNA barcoding can reveal fungal lineages that don't yet have a confidently established species name. Researchers sometimes use provisional labels while comparing sequences, collections, morphology, and published descriptions. Here we look for observations with the “Provisional Species Name:” field and check whether the “DNA Barcode ITS:” field is populated.</p>
      <p>A provisional name does <strong>not</strong> automatically mean a new species has been discovered. Some lineages may correspond to already-described taxa; others may need more evidence or formal taxonomic work.</p>
      {provisionalStatus==='loading' && <p>Checking project observation fields for provisional names…</p>}
      {provisionalStatus==='error' && <p>Provisional-name records could not be retrieved right now. You can still explore the observations on iNaturalist.</p>}
      {(provisionalStatus==='ready'||provisionalStatus==='limited') && <div>
        <p><strong>{provisionals.length} distinct provisional name{provisionals.length===1?'':'s'} recorded</strong> in the observation fields scanned.</p>
        {provisionals.length ? <ul className="survey-provisional-list">{provisionals.map(item=><li key={item.name}><span><strong>{item.name}</strong><small>{item.ids.length} observation{item.ids.length===1?'':'s'} · {item.barcodeCount} with DNA Barcode ITS field populated</small></span><a href={'https://www.inaturalist.org/observations?id='+item.ids.join(',')} target="_blank" rel="noopener noreferrer">View records ↗</a></li>)}</ul> : <p>No observations with a populated “Provisional Species Name:” observation field were found in the scanned records. Other field names or records outside this project may exist.</p>}
        {provisionalStatus==='limited' && <p className="survey-data-note">Only the first 10,000 observations were scanned; these counts may be incomplete.</p>}
      </div>}
      <a href={URL} target="_blank" rel="noopener noreferrer">Explore the survey observations on iNaturalist ↗</a>
    </div>}
    <p className="survey-data-note">{error?'Live data could not be loaded. Use the iNaturalist project link for current records.':data?'Live iNaturalist snapshot retrieved '+data.updated+'.':'Loading live iNaturalist statistics…'} Recorded taxa are not necessarily confirmed species. Formal sampling visits are tracked separately and are not yet available.</p>
  </section>;
}
