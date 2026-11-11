import {useEffect,useMemo,useState} from 'react';
import ResearchJourney from './ResearchJourney';
import {lessons,learningEvidence} from '../data/researchLessons';
import {areas,evidenceLabels,frameworkById,frameworksForArea,frameworks,resourceLibrary,type AreaId,type EvidenceId,type Framework} from '../data/researchFrameworks';

type Stage=0|1|2|3|4;
type Goal='understand'|'audit'|'survey'|'collaborate';
type Effort='unknown'|'opportunistic'|'repeated'|'standardized';
type Comparison='none'|'available'|'matched';
const goals:{id:Goal;label:string;desc:string}[]=[
 {id:'understand',label:'Understand the question',desc:'Learn concepts and find a useful starting point.'},
 {id:'audit',label:'Explore existing records',desc:'Review observations, literature, or sequence evidence.'},
 {id:'survey',label:'Plan a field investigation',desc:'Consider repeatable observational study design.'},
 {id:'collaborate',label:'Find collaborators',desc:'Prepare a clear research brief for others to critique.'}
];
const readableEffort:Record<Effort,string>={unknown:'Not sure yet',opportunistic:'Casual observations / presence only',repeated:'Repeated visits without fixed effort',standardized:'Repeatable surveys with documented effort'};
const readableComparison:Record<Comparison,string>={none:'No comparison evidence yet',available:'Some comparison records, with uneven effort',matched:'Comparable groups or sites with effort documented'};
function unique(values:string[]){return Array.from(new Set(values))}
function safe(value:string){return value.trim().replace(/\s+/g,' ')}
export default function ResearchNavigator(){
 const [stage,setStage]=useState<Stage>(0);
 const [area,setArea]=useState<AreaId>('ecology');
 const [frameworkId,setFrameworkId]=useState('ECO-01');
 const [choice,setChoice]=useState('proximity');
 const [question,setQuestion]=useState('');
 const [refinedQuestion,setRefinedQuestion]=useState('');
 const [resultView,setResultView]=useState<'journey'|'brief'>('journey');
 const [evidence,setEvidence]=useState<EvidenceId[]>([]);
 const [effort,setEffort]=useState<Effort>('unknown');
 const [comparison,setComparison]=useState<Comparison>('none');
 const [goal,setGoal]=useState<Goal>('understand');
 const [location,setLocation]=useState('');
 const [notes,setNotes]=useState('');
 const [feedback,setFeedback]=useState('');
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  const target=params.get('framework');
  if(target&&frameworkById[target]){
   const f=frameworkById[target];
   setArea(f.area);setFrameworkId(f.id);setChoice(f.choices[0].id);setStage(1);
  }
 },[]);

 const chosen=frameworkById[frameworkId]??frameworks[0];
 const selectedChoice=chosen.choices.find(c=>c.id===choice)??chosen.choices[0];
 const lesson=lessons[chosen.id];
 const tiers=learningEvidence(chosen.id,selectedChoice.id);
 const proposedQuestion=chosen.id==='ECO-01'&&choice==='fruiting'?'Does the focal fungus fruit disproportionately near the proposed tree species compared with other available trees in the study area?':chosen.id==='ECO-01'&&choice==='proximity'?'Is the focal fungus observed near the proposed tree species more often than expected from tree availability and observation effort?':chosen.id==='MOL-03'&&choice==='host'?'Does host-associated genetic variation remain after accounting for geographic population structure?':chosen.question;
 const usableQuestion=safe(refinedQuestion)||proposedQuestion;
 const learningSteps=goal==='understand'?lesson.explore:goal==='audit'?lesson.audit:goal==='survey'?lesson.survey:lesson.collaborate;
 const resources=chosen.resourceIds.map(id=>resourceLibrary[id]).filter(Boolean);
 const noStructuredEffort=effort!=='standardized';
 const missingComparison=comparison!=='matched';
 const status=effort==='standardized'&&comparison==='matched'&&evidence.length>0?'Foundational evidence described; scientific review still needed':'Exploratory: more evidence or design detail is needed';
 const caveats=useMemo(()=>{
  const items=[...chosen.pitfalls];
  if(evidence.length===0)items.unshift('No existing evidence has been specified; begin with reputable literature and traceable examples.');
  if(evidence.includes('occurrence')&&noStructuredEffort)items.unshift('Opportunistic occurrence records usually lack documented nondetections and sampling effort.');
  if(noStructuredEffort&&goal==='survey')items.push('Choose fixed sites, observation intervals, and effort-recording methods before comparing counts.');
  if(missingComparison)items.push('A defensible comparative inference requires relevant comparison groups and attention to effort and confounders.');
  if(evidence.includes('dna'))items.push('Trace each sequence to its specimen and evaluate marker resolution and reference identifications.');
  return unique(items);
 },[chosen,evidence,noStructuredEffort,missingComparison,goal]);
 const suggested=useMemo(()=>{
  const tasks=[selectedChoice.methodNote,...chosen.next];
  if(evidence.includes('occurrence'))tasks.unshift('Audit original occurrence records: identity, coordinates, date, duplication, and useful metadata.');
  if(evidence.length===0)tasks.unshift('Start with primary literature and a small set of carefully documented examples.');
  if(missingComparison&&goal!=='understand')tasks.push('Define a meaningful comparison or baseline before inferring preference, difference or change.');
  if(goal==='collaborate')tasks.push('Share the question, proposed outcome, evidence gaps, and limitations with collaborators before adopting a protocol.');
  if(goal==='survey'&&noStructuredEffort)tasks.push('Specify search duration, search area, sampling dates, observers, and defensible nondetection rules.');
  return unique(tasks);
 },[selectedChoice,chosen,evidence,missingComparison,goal,noStructuredEffort]);
 const report=useMemo(()=>[
  'MYCOVIEW RESEARCH NAVIGATOR — EXPLORATORY BRIEF',
  'Framework library version: draft-1.0 | Independent scientific review: pending',
  'Not a validated experiment or automatic biological conclusion.',
  '',
  'RESEARCH AREA',areas.find(a=>a.id===area)?.title??area,
  'FRAMEWORK',chosen.id+' · '+chosen.title,
  'ORIGINAL QUESTION',safe(question)||'Not provided',
  'PROPOSED RESEARCHABLE QUESTION',usableQuestion,
  'SPECIFIC INVESTIGATION',selectedChoice.meaning,
  'WHY THIS DIRECTION',selectedChoice.methodNote,
  'REGION OR SCOPE',safe(location)||'Not specified',
  'GOAL',goals.find(g=>g.id===goal)?.label??goal,
  'EVIDENCE AVAILABLE',evidence.length?evidence.map(e=>evidenceLabels[e]).join('; '):'Not yet specified',
  'OBSERVATION EFFORT',readableEffort[effort],
  'COMPARISON INFORMATION',readableComparison[comparison],
  'NOTES',safe(notes)||'None',
  '',
  'READINESS',status,
  'STARTING EVIDENCE',...tiers.starting.map(x=>'- '+evidenceLabels[x]),
  'EVIDENCE TO STRENGTHEN THE INVESTIGATION',...tiers.strengthening.map(x=>'- '+evidenceLabels[x]),
  'ADVANCED EVIDENCE — NOT REQUIRED TO BEGIN',...tiers.advanced.map(x=>'- '+evidenceLabels[x]),
  '',
  'SCIENTIFIC PRINCIPLE',lesson.concept,lesson.explanation,
  'ILLUSTRATIVE HYPOTHETICAL EXAMPLE',lesson.example,
  '',
  'RECOMMENDED METHODS AND WHY',
  ...chosen.methods.flatMap(m=>['- '+m.name,'  Why: '+m.why,'  Needs: '+m.requires.join('; '),'  Cannot show: '+m.cannot]),
  '',
  'IMPORTANT LIMITATIONS',...caveats.map(x=>'- '+x),
  '',
  'GOAL-SPECIFIC NEXT STEPS',...learningSteps.map((x,i)=>`${i+1}. ${x}`),
  'ADDITIONAL METHODOLOGICAL TASKS',...suggested.map((x,i)=>`${i+1}. ${x}`),
  '',
  'CURATED RESOURCES',...resources.map(r=>`${r.title}: ${r.url}\n  Purpose: ${r.purpose}\n  Caution: ${r.limits}`),
  '',
  'Review substantive methods with qualified collaborators before attempting interventions or publication.'
 ].join('\n'),[area,chosen,question,usableQuestion,selectedChoice,location,goal,evidence,effort,comparison,notes,status,caveats,suggested,learningSteps,lesson,tiers,resources]);
 const setAreaAndFramework=(id:AreaId)=>{setRefinedQuestion('');const first=frameworksForArea(id)[0];setArea(id);setFrameworkId(first.id);setChoice(first.choices[0].id);setFeedback('')};
 const setFramework=(id:string)=>{setRefinedQuestion('');const f=frameworkById[id];if(!f)return;setFrameworkId(id);setArea(f.area);setChoice(f.choices[0].id);setFeedback('')};
 const next=()=>{setFeedback('');setStage(s=>Math.min(4,s+1) as Stage)};
 const back=()=>{setFeedback('');setStage(s=>Math.max(0,s-1) as Stage)};
 const restart=()=>{setStage(0);setFeedback('')};
 const copy=async()=>{try{await navigator.clipboard.writeText(report);setFeedback('Research brief copied.')}catch{setFeedback('Clipboard unavailable; expand the text brief and copy manually.')}};
 const download=()=>{const blob=new Blob([report],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='mycoview-research-brief.txt';document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);setFeedback('Text brief download requested.')};
 const toggleEvidence=(id:EvidenceId)=>setEvidence(old=>old.includes(id)?old.filter(v=>v!==id):[...old,id]);
 return <div className="mv-nav" aria-label="MycoView Research Navigator">
  <header className="mv-nav-progress"><div><strong>RESEARCH NAVIGATOR</strong><span>Five areas · fifteen pathways · no AI or account needed</span></div><span>STEP {stage+1} OF 5</span><div className="mv-nav-meter"><span style={{width:`${(stage+1)*20}%`}} /></div></header>
  <div className="mv-nav-body">
   {stage===0&&<section className="mv-nav-step">
    <p className="mv-kicker">01 / FOLLOW YOUR CURIOSITY</p>
    <h2>What kind of fungal mystery are you exploring?</h2>
    <p>Choose the question that feels closest. You can change your mind as you learn more.</p>
    <div className="mv-nav-area-grid">
     {areas.map(a=><button key={a.id} type="button" className={`mv-nav-area ${a.id===area?'is-selected':''}`} aria-pressed={a.id===area} onClick={()=>setAreaAndFramework(a.id)}><span aria-hidden="true">{a.icon}</span><strong>{a.title}</strong><small>{a.description}</small></button>)}
    </div>
    <label className="mv-nav-field">Optional: describe your curiosity in your own words<textarea rows={3} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="I keep finding this fungus near certain trees, and I want to know why..." /></label>
   </section>}
   {stage===1&&<section className="mv-nav-step">
    <p className="mv-kicker">02 / CHOOSE A RESEARCH FRAMEWORK</p>
    <h2>Which question would you like to investigate?</h2>
    <p>These paths lead to different kinds of evidence and methods. Select one to explore first; related questions remain available in your final brief.</p>
    <div className="mv-nav-frameworks">
     {frameworksForArea(area).map(f=><button key={f.id} type="button" className={`mv-nav-framework ${f.id===frameworkId?'is-selected':''}`} aria-pressed={f.id===frameworkId} onClick={()=>setFramework(f.id)}><span>{f.id}</span><strong>{f.title}</strong><small>{f.question}</small></button>)}
    </div>
    <div className="mv-nav-choice-box">
     <h3>Let's be precise. What do you mean?</h3>
     <div className="mv-nav-choices">{chosen.choices.map(o=><label className={choice===o.id?'is-selected':''} key={o.id}><input type="radio" name="specific-question" value={o.id} checked={choice===o.id} onChange={()=>{setChoice(o.id);setRefinedQuestion('')}}/><span>{o.label}</span></label>)}</div>
     <p className="mv-nav-explain"><strong>Why this matters:</strong> {selectedChoice.methodNote}</p>
     <label className="mv-nav-field">A more researchable question (edit this to name your fungus, comparison, and location)<textarea rows={3} value={refinedQuestion||proposedQuestion} onChange={e=>setRefinedQuestion(e.target.value)} /></label>
     <p className="mv-nav-explain">This is a transparent suggestion based on your menu choices, not an AI interpretation of your original wording.</p>
    </div>
   </section>}
   {stage===2&&<section className="mv-nav-step">
    <p className="mv-kicker">03 / WHAT EVIDENCE EXISTS?</p>
    <h2>What do you have to work with?</h2>
    <p>Choose as many evidence types as apply. “Nothing yet” is a perfectly useful starting point—just leave everything unchecked.</p>
    <div className="mv-nav-evidence">{(Object.keys(evidenceLabels) as EvidenceId[]).filter(k=>k!=='none').map(id=><label key={id} className={evidence.includes(id)?'is-selected':''}><input type="checkbox" checked={evidence.includes(id)} onChange={()=>toggleEvidence(id)}/><span>{evidenceLabels[id]}</span></label>)}</div>
    <div className="mv-nav-info"><strong>Evidence is not all equivalent.</strong><p>Photographs, sequences and biodiversity observations can support different claims. We will distinguish useful starting material from evidence needed for stronger comparisons.</p></div>
   </section>}
   {stage===3&&<section className="mv-nav-step">
    <p className="mv-kicker">04 / UNDERSTAND THE LIMITS</p>
    <h2>How was the evidence collected?</h2>
    <p>We won't pretend casual observations are the same as a systematic survey. Your answers change which methods and conclusions the Navigator recommends.</p>
    <div className="mv-nav-two-col">
     <fieldset><legend>What is known about search effort?</legend>{(Object.keys(readableEffort) as Effort[]).map(id=><label key={id}><input type="radio" name="effort" checked={effort===id} onChange={()=>setEffort(id)}/>{readableEffort[id]}</label>)}</fieldset>
     <fieldset><legend>Do you have comparison information?</legend>{(Object.keys(readableComparison) as Comparison[]).map(id=><label key={id}><input type="radio" name="comparison" checked={comparison===id} onChange={()=>setComparison(id)}/>{readableComparison[id]}</label>)}</fieldset>
    </div>
    <label className="mv-nav-field">Where do you hope to investigate?<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Northeast Ohio, a specific preserve, or not sure" /></label>
    <label className="mv-nav-field">What would you like to do next?<select value={goal} onChange={e=>setGoal(e.target.value as Goal)}>{goals.map(g=><option key={g.id} value={g.id}>{g.label} — {g.desc}</option>)}</select></label>
    <label className="mv-nav-field">Optional: sources, observations, or a second hypothesis<textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Record IDs, alternative explanations, open questions..." /></label>
   </section>}
   {stage===4&&<section className="mv-nav-step mv-nav-results">
    <p className="mv-kicker">05 / FOLLOW THE EVIDENCE</p>
    <div className="mv-nav-view-tabs" role="group" aria-label="Result view"><button type="button" className={resultView==='journey'?'is-selected':''} aria-pressed={resultView==='journey'} onClick={()=>setResultView('journey')}>My Research Journey</button><button type="button" className={resultView==='brief'?'is-selected':''} aria-pressed={resultView==='brief'} onClick={()=>setResultView('brief')}>Technical Research Brief</button></div>
    {resultView==='journey'?<ResearchJourney framework={chosen} area={area} choiceId={selectedChoice.id} original={question} refined={usableQuestion} location={location} goal={goal} evidence={evidence} caveats={caveats} onTechnical={()=>setResultView('brief')} onEdit={()=>setStage(1)}/>:<>
    <h2>Technical research brief</h2><p className="mv-nav-context">A shareable summary of methodology and evidence limitations, not a validated protocol.</p>
    <div className="mv-nav-result-intro"><span>{chosen.id} · {areas.find(a=>a.id===area)?.title}</span><strong>{status}</strong><p><b>Researchable question:</b> {usableQuestion}</p><p><b>Specific focus:</b> {selectedChoice.meaning}</p></div>
    <div className="mv-nav-result-grid"><section><h3>Evidence by purpose</h3>{[{name:'To begin',ids:tiers.starting},{name:'To strengthen',ids:tiers.strengthening},{name:'Advanced or separate questions',ids:tiers.advanced}].filter(t=>t.ids.length).map(t=><div key={t.name}><h4>{t.name}</h4><ul>{t.ids.map(id=><li key={id}>{evidenceLabels[id]}{evidence.includes(id)?<small> · Available</small>:null}</li>)}</ul></div>)}</section><section><h3>Methods: why, evidence, limits</h3>{chosen.methods.map(m=><article key={m.name}><h4>{m.name}</h4><p><b>Why:</b> {m.why}</p><p><b>Requires:</b> {m.requires.join('; ')}.</p><p><b>What this method cannot demonstrate:</b> {m.cannot}</p></article>)}</section></div>
    <section className="mv-nav-result-section"><h3>Important methodological cautions</h3><ul>{caveats.map(x=><li key={x}>{x}</li>)}</ul></section>
    <section className="mv-nav-result-section"><h3>Additional planning considerations</h3><ol>{suggested.map((x,i)=><li key={i}>{x}</li>)}</ol></section>
    <section className="mv-nav-result-section"><h3>Curated research sources</h3><div className="mv-nav-resource-grid">{resources.map(r=><a key={r.id} href={r.url} target={r.url.startsWith('http')?'_blank':undefined} rel={r.url.startsWith('http')?'noopener noreferrer':undefined}><strong>{r.title} ↗</strong><span>{r.purpose}</span><small>Limit: {r.limits}</small></a>)}</div></section>
    </>}
    <section className="mv-nav-related"><h3>Related questions worth exploring</h3><div>{chosen.related.map(id=>frameworkById[id]).filter(Boolean).map(f=><button type="button" key={f.id} onClick={()=>{setFramework(f.id);setStage(1)}}>{f.id} · {f.title} ↗</button>)}</div></section>
    <div className="mv-nav-export"><button type="button" onClick={copy}>Copy technical research brief</button><button type="button" onClick={download}>Download technical brief (.txt)</button><p role="status">{feedback}</p></div>
    <details className="mv-nav-full"><summary>View full, shareable technical brief</summary><pre tabIndex={0}>{report}</pre></details>
    <p className="mv-nav-disclaimer">Framework draft 1.1 · Not independently scientifically reviewed. This guide does not access data sources, verify your claims, certify protocols, or authorize ecological interventions.</p>
   </section>}
   <nav className="mv-nav-actions" aria-label="Research Navigator steps">
    {stage>0&&<button type="button" onClick={back} className="mv-nav-back">← Previous</button>}
    {stage<4?<button type="button" onClick={next} className="mv-primary">{stage===3?'Build my research pathway →':'Continue →'}</button>:<button type="button" className="mv-nav-back" onClick={restart}>Explore another question ↶</button>}
   </nav>
  </div>
 </div>;
}
