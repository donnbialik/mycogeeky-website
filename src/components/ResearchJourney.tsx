import {lessons,learningEvidence} from '../data/researchLessons';
import {areas,evidenceLabels,resourceLibrary,type AreaId,type EvidenceId,type Framework} from '../data/researchFrameworks';
type Goal='understand'|'audit'|'survey'|'collaborate';
type Props={framework:Framework;area:AreaId;choiceId:string;original:string;refined:string;location:string;goal:Goal;evidence:EvidenceId[];caveats:string[];onTechnical:()=>void;onEdit:()=>void};
const labels:Record<Goal,string>={understand:'Understand the question',audit:'Explore existing records',survey:'Plan a field investigation',collaborate:'Find collaborators'};
export default function ResearchJourney({framework,area,choiceId,original,refined,location,goal,evidence,caveats,onTechnical,onEdit}:Props){
 const lesson=lessons[framework.id];
 const tiers=learningEvidence(framework.id,choiceId);
 const next=goal==='understand'?lesson.explore:goal==='audit'?lesson.audit:goal==='survey'?lesson.survey:lesson.collaborate;
 const resources=framework.resourceIds.map(id=>resourceLibrary[id]).filter(Boolean).slice(0,4);
 return <div className="mv-nav-journey">
  <p className="mv-nav-journey-eyebrow">{framework.id} · {areas.find(a=>a.id===area)?.title}{location.trim()?' · '+location.trim():''}</p>
  <h2>Your curiosity has somewhere to go.</h2>
  {!!original.trim()&&<div className="mv-nav-original"><span>YOU STARTED WITH</span><p>{original.trim()}</p></div>}
  <section className="mv-nav-question"><span>LET'S MAKE THAT QUESTION INVESTIGABLE</span><h3>{refined}</h3><p>This is an editable template suggested by your menu selections, not an automatic interpretation of your words.</p><button type="button" onClick={onEdit}>Revise my question ↗</button></section>
  <section className="mv-nav-lesson"><span className="mv-nav-section-label">THE SCIENTIFIC IDEA</span><h3>{lesson.concept}</h3><p>{lesson.explanation}</p><div className="mv-nav-example"><span>IMAGINE THIS</span><p>{lesson.example}</p><small>{lesson.exampleLabel}</small></div></section>
  <section className="mv-nav-journey-section"><span className="mv-nav-section-label">EVIDENCE, AT YOUR OWN PACE</span><h3>You don't need every kind of evidence to get started.</h3><div className="mv-nav-tier-grid">
    {([{label:'Start here',caption:'Useful for learning and framing the question',ids:tiers.starting},{label:'To investigate more rigorously',caption:'Strengthens your evidence or comparisons',ids:tiers.strengthening},{label:'Advanced or separate investigations',caption:'Not required to begin this question',ids:tiers.advanced}]).filter(x=>x.ids.length).map(t=><div key={t.label}><strong>{t.label}</strong><p>{t.caption}</p><ul>{t.ids.map(id=><li key={id}>{evidenceLabels[id]}{evidence.includes(id)?<em> · Available</em>:null}</li>)}</ul></div>)}
  </div></section>
  <section className="mv-nav-journey-section"><span className="mv-nav-section-label">YOUR NEXT DISCOVERIES</span><h3>{labels[goal]}: what to try next</h3><ol className="mv-nav-jsteps">{next.map((item,i)=><li key={i}><span>{String(i+1).padStart(2,'0')}</span><p>{item}</p></li>)}</ol></section>
  <section className="mv-nav-journey-section"><span className="mv-nav-section-label">FOLLOW THE EVIDENCE</span><h3>Resources to explore</h3><p className="mv-nav-source-help">{lesson.sourceHelp}</p><div className="mv-nav-resource-grid">{resources.map(r=><a key={r.id} href={r.url} target={r.url.startsWith('http')?'_blank':undefined} rel={r.url.startsWith('http')?'noopener noreferrer':undefined}><strong>{r.title} ↗</strong><span>{r.purpose}</span><small>Keep in mind: {r.limits}</small></a>)}</div></section>
  <section className="mv-nav-journey-section mv-nav-boundaries"><span className="mv-nav-section-label">WHAT WE CAN'T CONCLUDE YET</span><h3>Good science includes uncertainty.</h3><ul>{caveats.slice(0,4).map(x=><li key={x}>{x}</li>)}</ul><button type="button" onClick={onTechnical}>See all methods and limitations →</button></section>
 </div>;
}
