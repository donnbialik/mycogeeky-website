import { useMemo, useState } from 'react';
type Topic = 'ecology' | 'taxonomy' | 'morphology' | 'distribution';
type Evidence = 'none' | 'observations' | 'specimens' | 'sequences' | 'mixed';
type Goal = 'explore' | 'study' | 'share';
type Scope = 'unknown' | 'local' | 'regional' | 'national';
type Definition = 'occurrence' | 'fruiting' | 'host' | 'substrate' | 'mechanism' | 'other';
type Comparison = 'none' | 'presence' | 'matched' | 'repeat';
type Resource = {label: string; url: string; why: string};
const topicDetails: Record<Topic,{label:string;interpretation:string;alternative:string;methods:string[];links:Resource[]}> = {
  ecology:{label:'Ecology & habitat',interpretation:'Is this an association, a habitat effect, or an observation-effort pattern?',alternative:'An apparent association may reflect tree availability, sampling effort, habitat, substrate, fruiting conditions, or identification error.',methods:['Define the fungus, suspected associate and measurable outcome.','Choose comparable sampling units across locations and conditions.','Document observation effort, identifications, substrate and environmental context.'],links:[{label:'iNaturalist observations',url:'https://www.inaturalist.org/observations',why:'Inspect individual records and their available evidence.'},{label:'GBIF occurrence explorer',url:'https://www.gbif.org/occurrence/search',why:'Assess broader occurrence evidence, remembering sampling bias.'},{label:'MycoView research directory',url:'/investigate/resources/#field',why:'Find ecological and biodiversity research resources.'}]},
  taxonomy:{label:'Identification & species limits',interpretation:'Does the available evidence distinguish taxa or only suggest a lineage?',alternative:'Differences may reflect identification errors, incomplete reference sampling, intraspecific variation, or the limits of a single molecular locus.',methods:['Review published descriptions and competing identifications.','Trace vouchers, references, type-linked material and sequencing provenance.','Determine whether independent collections and additional characters or loci are needed.'],links:[{label:'MycoBank',url:'https://www.mycobank.org/',why:'Review fungal nomenclature and original references.'},{label:'NCBI Nucleotide',url:'https://www.ncbi.nlm.nih.gov/nuccore/',why:'Locate source sequences and inspect provenance.'},{label:'Research resources',url:'/investigate/resources/#names',why:'Compare taxonomic and nomenclatural resources.'}]},
  morphology:{label:'Morphological variation',interpretation:'Is the observed trait consistently measurable and distinct?',alternative:'Differences may be caused by specimen maturity, environment, handling, preparation or observer effects.',methods:['Define the character and measurement protocol.','Document maturity, environmental conditions, preparation and calibration.','Measure independent specimens and evaluate within-group variation.'],links:[{label:'Biodiversity Heritage Library',url:'https://www.biodiversitylibrary.org/',why:'Locate historical descriptions and illustrations.'},{label:'MycoView methods',url:'/investigate/learn/',why:'Review specimen documentation and research practices.'}]},
  distribution:{label:'Distribution & occurrence',interpretation:'Is this a real range pattern or a consequence of how observations were collected?',alternative:'Unequal geographic sampling and changing taxon concepts may create apparent range limits.',methods:['Define the taxon concept, spatial scale and time interval.','Separate well-supported observations from unresolved identifications.','Compare reporting effort across regions and seasons.'],links:[{label:'iNaturalist',url:'https://www.inaturalist.org/observations',why:'Inspect spatial and temporal occurrence records.'},{label:'GBIF',url:'https://www.gbif.org/occurrence/search',why:'Compare additional occurrence sources.'},{label:'MycoView research directory',url:'/investigate/resources/#field',why:'Locate context for ecological and distribution research.'}]}
};
const meaning:Record<Definition,string>={occurrence:'Observation frequency',fruiting:'Fruiting frequency',host:'Host or tree association',substrate:'Substrate colonization',mechanism:'Biological mechanism',other:'Another measurable relationship'};
const clean=(s:string)=>s.trim().replace(/\s+/g,' ');
export default function StudyDesigner(){
  const [step,setStep]=useState(0);
  const [question,setQuestion]=useState('');
  const [topic,setTopic]=useState<Topic>('ecology');
  const [definition,setDefinition]=useState<Definition>('occurrence');
  const [definitionOther,setDefinitionOther]=useState('');
  const [evidence,setEvidence]=useState<Evidence>('observations');
  const [comparison,setComparison]=useState<Comparison>('none');
  const [scope,setScope]=useState<Scope>('unknown');
  const [location,setLocation]=useState('');
  const [goal,setGoal]=useState<Goal>('explore');
  const [prediction,setPrediction]=useState('');
  const [notes,setNotes]=useState('');
  const [copyStatus,setCopyStatus]=useState('');
  // Explicit, limited signal detection. These prompts do not assert that free text was scientifically interpreted.
  const textInput=(question+' '+prediction+' '+notes).toLowerCase();
  const hostQuestion=topic==='ecology'&&(definition==='host'||/\\b(oak|quercus|tree|host|hemlock|pine|beech)\\b/.test(textInput));
  const lineageQuestion=/\\b(haplotyp|genotyp|population genetic|lineage|snp|microsatellite|allele|its sequence)\\b/.test(textInput);
  const competitionQuestion=/\\b(competi|competitor|fruiting window|seasonal niche|seasonality)\\b/.test(textInput);
  const whiteOakQuestion=/\\b(white oak|quercus alba)\\b/.test(textInput);
  const data=topicDetails[topic];
  const comparisonMissing=comparison==='none'||comparison==='presence';
  const broad=scope==='unknown'||scope==='national';
  const preliminary=evidence==='none'||comparisonMissing||broad;
  const outcome=topic==='ecology'?(definition==='other'?clean(definitionOther)||'the proposed measurable relationship':meaning[definition]):data.interpretation;
  const issues=useMemo(()=>{
    const next:string[]=[];
    if(hostQuestion)next.push('Host association must distinguish fruiting near a tree from confirmed colonization or direct use of that tree.');
    if(whiteOakQuestion)next.push('Documented associations with oaks do not by themselves establish a preference for white oak over other oak species.');
    if(lineageQuestion)next.push('A host-by-haplotype question requires independent, voucher-linked genetic samples and enough informative genetic variation; ITS alone may be insufficient.');
    if(competitionQuestion)next.push('Competition and seasonal fruiting are mechanistic explanations that require different measurements from host-occurrence comparisons.');
    if(topic==='ecology'&&definition==='mechanism')next.push('A proposed biological mechanism requires different evidence from a pattern of photographed fruiting bodies.');
    if(evidence==='none')next.push('No evidence records are available yet. Begin with source literature and well-documented observations.');
    if(evidence==='observations'||evidence==='mixed')next.push('Opportunistic observation records generally establish presence, not absence or preference.');
    if(comparisonMissing)next.push('A comparison group and a measure of sampling effort have not been established.');
    if(broad)next.push('The geographic scope may conceal variation in habitats, available host trees, and observation effort.');
    if(topic==='taxonomy'&&evidence==='sequences')next.push('Sequence similarity alone may not resolve species limits; assess reference provenance and marker resolution.');
    return next;
  },[topic,definition,evidence,comparison,broad,hostQuestion,whiteOakQuestion,lineageQuestion,competitionQuestion]);
  const researchPath=useMemo(()=>{
    const steps:string[]=[];
    if(evidence==='none')steps.push('Gather and evaluate existing literature and traceable records before designing a field study.');
    if(topic==='ecology'){
      steps.push('Translate “preference” into an explicit measurable outcome: '+outcome+'.');
      steps.push('Compare the focal association against other available habitats, hosts, or substrates rather than only counting positive observations.');
    }
    if(hostQuestion)steps.push('Verify the proposed host or tree species at each location, record other trees and possible buried roots, and distinguish proximity from colonization.');
    if(whiteOakQuestion)steps.push('Compare white oak with other oak species in matched habitats, accounting for tree abundance and detection effort; do not assume white-oak specificity.');
    if(competitionQuestion)steps.push('Treat competitive release or seasonal niche separation as a separate mechanism: record fruiting phenology and plausible competitors, then determine what evidence could discriminate competition from climate and host effects.');
    if(lineageQuestion)steps.push('Frame a separate population-genetics question: collect independent, legally permitted voucher-linked specimens with host and location metadata; assess whether available ITS haplotypes are informative or additional polymorphic markers are needed.');
    if(lineageQuestion)steps.push('Test geographic population structure as a confounder before interpreting host–genotype associations.');
    if(comparisonMissing)steps.push('Create a comparison strategy: matched sites or repeated standardized surveys, recording effort and appropriately interpreted nondetections.');
    if(broad)steps.push('Narrow the initial sampling region to a feasible area before extrapolating to larger regions.');
    steps.push(...data.methods);
    if(evidence==='sequences'||evidence==='mixed')steps.push('Audit molecular data provenance and reference identifications; avoid equating ITS similarity with conclusive species identity.');
    if(goal==='share')steps.push('Identify collaborators who can review the methods and evidence before presenting scientific conclusions.');
    return Array.from(new Set(steps));
  },[topic,outcome,evidence,comparison,broad,goal,data,hostQuestion,whiteOakQuestion,lineageQuestion,competitionQuestion]);
  const contextualResources:Resource[]=[
    ...(hostQuestion?[{label:'UMass: Grifola host and decay biology',url:'https://www.umass.edu/agriculture-food-environment/landscape/fact-sheets/root-butt-rot-caused-by-grifola-frondosa-hen-of-woods',why:'Background on documented oak hosts, not a claim of white-oak specificity.'}]:[]),
    ...(lineageQuestion?[{label:'Grifola population SNP study (2024)',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC11340509/',why:'An example of population-genetic analysis; it did not test your proposed host association.'}]:[])
  ];
  const recommendedResources=[...data.links,...contextualResources];
  const report=useMemo(()=>[
    'MYCOVIEW — ADAPTIVE RESEARCH PATH (EXPLORATORY)',
    'This is decision-guided guidance, not an evaluated or statistically powered protocol.',
    '', 'YOUR QUESTION', clean(question)||'[Not supplied]',
    'FOCUS',data.label,
    'WHAT IS BEING MEASURED',outcome,
    'SCOPE',scope+(clean(location)?' — '+clean(location):''),
    'AVAILABLE EVIDENCE',evidence,
    'COMPARISON DESIGN',comparison,
    'RESEARCH GOAL',goal,
    'PREDICTION OR MECHANISM TO EVALUATE',clean(prediction)||'[Not yet formulated]',
    'STARTING SOURCES OR NOTES',clean(notes)||'[Not supplied]',
    '', 'READINESS ASSESSMENT',
    preliminary?'Exploratory: essential design decisions remain unresolved. Do not infer preference or causation from these inputs.':'Potential starting design: review methods, assumptions and adequate sampling before collecting or interpreting data.',
    '', 'QUESTIONS TO RESOLVE',...(issues.length?issues.map(x=>'- '+x):['- What observation would weaken the favored explanation?']),
    '', 'POSSIBLE NEXT STEPS',...researchPath.map((x,i)=>`${i+1}. ${x}`),
    '', 'ALTERNATIVE EXPLANATION',data.alternative,
    '', 'SOURCE LINKS',...recommendedResources.map(x=>`${x.label}: ${x.url} — ${x.why}`),
    '', 'Review with a subject-matter expert before carrying out, publishing or relying on this study.'
  ].join('\n'),[question,data,outcome,scope,location,evidence,comparison,goal,prediction,notes,preliminary,issues,researchPath,recommendedResources]);
  const next=()=>{if(step===0&&!clean(question))return;setCopyStatus('');setStep(v=>Math.min(4,v+1))};
  const copy=async()=>{try{await navigator.clipboard.writeText(report);setCopyStatus('Copied to clipboard.')}catch{setCopyStatus('Clipboard access unavailable; select the report text to copy it.')}};
  return <div className="mv-wizard">
    <div className="mv-wizard-progress"><span>GUIDED RESEARCH PATH</span><span>{step<4?`STEP ${step+1} OF 4`:'YOUR NEXT STEPS'}</span><div className="mv-wizard-track"><span style={{width:`${(step+1)*20}%`}}/></div></div>
    <div className="mv-wizard-main">
      <div className="mv-wizard-panel">
        {step===0&&<><p className="mv-kicker">START WITH CURIOSITY</p><h2>What are you trying to understand?</h2><p>Describe what you noticed in your own words. You don't need a formal hypothesis yet.</p><label>My research question<textarea value={question} rows={4} onChange={e=>setQuestion(e.target.value)} placeholder="I keep finding a fungus near a particular tree. Is that a real ecological relationship?"/></label><label>What sort of investigation is this?<select value={topic} onChange={e=>setTopic(e.target.value as Topic)}>{Object.entries(topicDetails).map(([k,v])=><option value={k} key={k}>{v.label}</option>)}</select></label></>}
        {step===1&&<><p className="mv-kicker">CLARIFY THE CLAIM</p><h2>What would count as evidence?</h2><p>Different claims require different comparisons. Choose what you actually want to measure.</p>{topic==='ecology'?<><label>What do you mean by the proposed relationship?<select value={definition} onChange={e=>setDefinition(e.target.value as Definition)}>{Object.entries(meaning).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></label>{definition==='other'&&<label>Describe the outcome<input value={definitionOther} onChange={e=>setDefinitionOther(e.target.value)}/></label>}</>:<p className="mv-wizard-context">{data.interpretation}</p>}<label>What is your tentative prediction or explanation?<textarea rows={3} value={prediction} onChange={e=>setPrediction(e.target.value)} placeholder="What outcome would you expect, and what could show you are wrong?"/></label></>}
        {step===2&&<><p className="mv-kicker">EVALUATE YOUR STARTING EVIDENCE</p><h2>What do you already know?</h2><label>What evidence is available?<select value={evidence} onChange={e=>setEvidence(e.target.value as Evidence)}><option value="none">Only an idea so far</option><option value="observations">Photographs or online observations</option><option value="specimens">Collected specimens / morphology</option><option value="sequences">DNA sequence records</option><option value="mixed">Several kinds of evidence</option></select></label><label>What comparison or sampling information do you have?<select value={comparison} onChange={e=>setComparison(e.target.value as Comparison)}><option value="none">No comparison records yet</option><option value="presence">Mostly presence records</option><option value="matched">Comparable habitats/sites or groups</option><option value="repeat">Repeatable, effort-documented surveys</option></select></label><label>Sources, iNaturalist links, or other notes (optional)<textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="List record IDs or links; the tool does not fetch them yet."/></label></>}
        {step===3&&<><p className="mv-kicker">MAKE IT FEASIBLE</p><h2>Where and how far will you go?</h2><label>Initial research scope<select value={scope} onChange={e=>setScope(e.target.value as Scope)}><option value="unknown">Not decided</option><option value="local">Single forest, preserve or locality</option><option value="regional">Multiple sites in one region</option><option value="national">Countrywide or broader</option></select></label><label>Location / geographic boundaries<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Northeast Ohio, selected forest preserves"/></label><label>What do you want to accomplish next?<select value={goal} onChange={e=>setGoal(e.target.value as Goal)}><option value="explore">Explore whether the idea is worth studying</option><option value="study">Plan a repeatable comparison or survey</option><option value="share">Prepare a proposal to discuss with collaborators</option></select></label></>}
        {step===4&&<><p className="mv-kicker">YOUR NEXT RESEARCH STEPS</p><h2>{preliminary?'First, strengthen the question.':'Now, critically review the design.'}</h2><p>{preliminary?'Your inputs are a useful starting point, but key evidence or comparisons are still missing. A full study protocol would be premature.':'You have a promising starting structure. Its feasibility and scientific adequacy still need expert review.'}</p><div className="mv-wizard-summary"><strong>Your question</strong><p>{question}</p><strong>What to measure</strong><p>{outcome}</p></div><h3>What needs attention</h3><ul>{(issues.length?issues:['Consider what could falsify your explanation, and whether sample size is adequate.']).map(x=><li key={x}>{x}</li>)}</ul><h3>Recommended steps</h3><ol>{researchPath.map((x,i)=><li key={i}>{x}</li>)}</ol><h3>Useful resources</h3><div className="mv-wizard-resources">{recommendedResources.map(r=><a key={r.url} href={r.url} target={r.url.startsWith('http')?'_blank':undefined} rel={r.url.startsWith('http')?'noopener noreferrer':undefined}><strong>{r.label} ↗</strong><span>{r.why}</span></a>)}</div><div className="mv-wizard-export"><button type="button" onClick={copy}>Copy research path</button><span role="status">{copyStatus}</span></div><details className="mv-wizard-full-report"><summary>View full text outline</summary><pre tabIndex={0}>{report}</pre></details><p className="mv-designer-disclaimer">Guidance is based on transparent topic and evidence rules, not on analysis of the linked records. It is not scientific validation.</p></>}
        <div className="mv-wizard-actions">{step>0&&<button type="button" className="mv-wizard-back" onClick={()=>setStep(v=>Math.max(0,v-1))}>← Back</button>}{step<4&&<button type="button" className="mv-primary" disabled={step===0&&!clean(question)} onClick={next}>{step===3?'See my research path →':'Continue →'}</button>}{step===4&&<button type="button" className="mv-wizard-back" onClick={()=>setStep(0)}>Revise my question ↶</button>}</div>
      </div>
      {step<4&&<aside className="mv-wizard-side"><p className="mv-kicker">THINK LIKE A RESEARCHER</p><h3>{step===0?'Good questions come before good methods.':step===1?'Be precise about what you mean.':step===2?'Presence is not preference.':'Start with a feasible study.'}</h3><p>{step===0?'A question can begin with uncertainty. The goal is to make it investigable, not to manufacture confidence.':step===1?'A fruiting record, a host relationship and a biochemical mechanism represent different claims—and require different tests.':step===2?'Online sightings can reveal interesting patterns, but observer effort and the absence of records must be evaluated separately.':'A tightly defined field site can teach you more than a vast collection of incomparable observations.'}</p><div className="mv-wizard-tip"><strong>Remember</strong><p>{data.alternative}</p></div></aside>}
    </div>
  </div>
}
