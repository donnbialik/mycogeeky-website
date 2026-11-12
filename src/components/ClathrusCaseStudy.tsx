import {useState} from 'react';
import {clathrusStudy as study} from '../data/caseStudies';
type Stage=0|1|2|3|4|5|6;
const stages=['The mystery','First hypothesis','Evaluate the record','Compare sources','The finding','Interpret the evidence','Continue investigating'];
function PaperLinks({compact=false}:{compact?:boolean}){
 return <div className={compact?'mv-case-links mv-case-links-mini':'mv-case-links'}>
  <a href={study.article.doi} target="_blank" rel="noopener noreferrer">Read the published paper ↗</a>
  <a href={study.article.figures} target="_blank" rel="noopener noreferrer">See original Figure 2d ↗</a>
  <a href={study.article.archive} target="_blank" rel="noopener noreferrer">Original data & R code ↗</a>
 </div>;
}
export default function ClathrusCaseStudy(){
 const [stage,setStage]=useState<Stage>(0);
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [reflection,setReflection]=useState('');
 const [showMethods,setShowMethods]=useState(false);
 const answer=(id:string,value:string)=>setAnswers(current=>({...current,[id]:value}));
 const move=(next:number)=>{setStage(Math.max(0,Math.min(6,next)) as Stage)};
 const visualLabels={
  supported:{title:'Well supported by the evidence',short:'Well supported',symbol:'✓'},
  uncertain:{title:'Plausible, but not established',short:'Needs more evidence',symbol:'?'},
  unsupported:{title:'Not supported by this evidence',short:'Unsupported inference',symbol:'!'}
 } as const;
 const card=(index:number)=>{
  const q=study.questions[index];
  const chosen=q.choices.find(c=>c.id===answers[q.id]);
  return <section className="mv-case-activity">
   <p className="mv-case-eyebrow">YOUR TURN · THINK LIKE AN INVESTIGATOR</p><h3>{q.title}</h3><p>{q.prompt}</p>
   <div className="mv-case-options">{q.choices.map(choice=>{
    const selected=answers[q.id]===choice.id;
    const assessment=visualLabels[choice.assessment];
    return <button type="button" key={choice.id} aria-pressed={selected} className={selected?'is-selected is-'+choice.assessment:''} onClick={()=>answer(q.id,choice.id)}>
     <span className="mv-case-option-label">{choice.label}</span>
     {selected&&<span className="mv-case-option-status"><span aria-hidden="true">{assessment.symbol}</span> {assessment.short}</span>}
    </button>;
   })}</div>
   {chosen&&<div className={'mv-case-feedback is-'+chosen.assessment} role="status" aria-live="polite">
    <span className="mv-case-feedback-heading"><span aria-hidden="true" className="mv-case-feedback-icon">{visualLabels[chosen.assessment].symbol}</span><strong>{visualLabels[chosen.assessment].title}</strong></span>
    <p>{chosen.response}</p>
    <div className="mv-case-reasoning" aria-label="Explore the reasoning">
     <p className="mv-case-reasoning-label">LOOK CLOSER AT THE REASONING</p>
     <p><strong>{chosen.assessment==='supported'?'Why this interpretation holds up':'Why this answer is tempting'}</strong><br/>{chosen.reasoning[0]}</p>
     <p><strong>{chosen.assessment==='supported'?'What still needs checking':'The assumption to examine'}</strong><br/>{chosen.reasoning[1]}</p>
     <p><strong>How to investigate further</strong><br/>{chosen.reasoning[2]}</p>
     <p className="mv-case-thinking-habit"><strong>TAKEAWAY · </strong>{chosen.reasoning[3]}</p>
    </div>
    <small>This evaluates an interpretation, not you. Try another choice to compare the reasoning.</small>
   </div>}
  </section>;
 };
 return <div className="mv-case" aria-label="Clathrus archeri guided research case study">
  <header className="mv-case-progress"><span>CASE STUDY 001 · BIO-01</span><span>{stage+1} / 7</span><div className="mv-case-progress-track"><span style={{width:`${(stage+1)/7*100}%`}}/></div></header>
  <nav className="mv-case-chapters" aria-label="Case study chapters">{stages.map((title,i)=><button key={title} type="button" aria-current={stage===i?'step':undefined} className={stage===i?'is-current':''} onClick={()=>move(i)}><span>{String(i+1).padStart(2,'0')}</span>{title}</button>)}</nav>
  <div className="mv-case-content">
   {stage===0&&<section className="mv-case-section"><p className="mv-case-eyebrow">THE MYSTERY / A REAL PUBLISHED STUDY</p><h2>What if the fungus was already there—and nobody had noticed?</h2>
    <p className="mv-case-lead"><i>Clathrus archeri</i>, the devil's fingers fungus, is difficult to overlook once it's fruiting. But an unmistakable mushroom can still be missing from scientific distribution records.</p>
    <div className="mv-case-columns"><div><h3>The investigators' question</h3><p>Can photos and observations shared through iNaturalist improve our picture of where fungi have been documented, compared with traditional sources?</p><p>In 2024, Oleh Prylutskyi and Nadiia Kapets published a broader investigation of Ukrainian fungal biodiversity data. Their <i>Clathrus archeri</i> example provides a particularly striking illustration.</p></div><div className="mv-case-info"><span>THE PUBLISHED STUDY</span><strong>{study.article.title}</strong><p>{study.article.authors} · {study.article.year}</p><p><b>{study.article.count.toLocaleString('en-US')}</b> verifiable Ukrainian fungal observations in the authors' data snapshot</p><p>Cutoff: {study.article.datasetDate}</p></div></div>
    <p className="mv-case-callout"><strong>The guiding question:</strong> When a citizen scientist records a fungus beyond its previously documented localities, what has science actually discovered?</p>
   </section>}
   {stage===1&&<section className="mv-case-section"><p className="mv-case-eyebrow">CHAPTER 02 / START WITH A HYPOTHESIS</p><h2>A remarkable photograph appears outside the known records.</h2><p>Consider the claim before you see the paper's result. There is an important difference between the organism's history and our history of documenting it.</p>{card(0)}
    <div className="mv-case-takeaway"><strong>A working principle</strong><p>A distribution database describes what has been recorded. It cannot automatically reveal every place an organism was present in the past.</p></div>
   </section>}
   {stage===2&&<section className="mv-case-section"><p className="mv-case-eyebrow">CHAPTER 03 / EXAMINE THE RECORD</p><h2>Before drawing a dot on a map, check what the dot represents.</h2><p>An occurrence needs more than a plausible species label. The date, geographic uncertainty, original evidence, and identification history all affect how confidently it can be used.</p>{card(1)}
    <div className="mv-case-audit"><h3>Try a miniature observation audit</h3><div className="mv-case-audit-grid"><span>01 · Can you see diagnostic features?</span><span>02 · Is the observation date credible?</span><span>03 · Is the location specific and reliable?</span><span>04 · Has the taxon identity been independently assessed?</span></div><p>For this learning activity, we're examining the *questions to ask*; we are not pretending to have reverified the individual Ukrainian record ourselves.</p></div>
   </section>}
   {stage===3&&<section className="mv-case-section"><p className="mv-case-eyebrow">CHAPTER 04 / CHECK THE OLD RECORDS</p><h2>Novel to iNaturalist isn't necessarily novel to science.</h2><p>The paper compared iNaturalist occurrences with professional sources, including published reports and collections, rather than accepting an unfamiliar map point as a newly arrived organism.</p>{card(2)}
    <div className="mv-case-takeaway"><strong>Why source comparison matters</strong><p>If a specimen was recorded decades ago in a herbarium or a regional paper, a new iNaturalist upload might make that occurrence more visible without extending the previously documented range.</p></div>
   </section>}
   {stage===4&&<section className="mv-case-section"><p className="mv-case-eyebrow">CHAPTER 05 / REVEAL THE FINDING</p><h2>A record near Kyiv changed the documented picture.</h2><p>In their comparison, Prylutskyi and Kapets reported that iNaturalist data showed an easternmost occurrence of <i>Clathrus archeri</i> near Kyiv, approximately <strong>350 kilometers</strong> from the nearest previously documented occurrence in the sources they considered.</p>
    <div className="mv-case-metric"><strong>≈ 350 km</strong><span>Separation between the reported outlying record and the nearest previously documented comparison record—not a measured migration distance.</span></div>
    <p>The authors presented these spatial comparisons in <strong>Figure 2d</strong> of their paper. Rather than fabricate a map or reconstruct the underlying coordinates, the case study links directly to that original figure.</p><PaperLinks/>
    <div className="mv-case-takeaway"><strong>What the authors did not establish</strong><p>The observation does not establish a date of colonization, the route of spread, or whether undocumented populations occur between known records.</p></div>
   </section>}
   {stage===5&&<section className="mv-case-section"><p className="mv-case-eyebrow">CHAPTER 06 / PROTECT THE CONCLUSION</p><h2>How far should the evidence take us?</h2><p>It's tempting to turn an exciting distribution record into an exciting story about how an organism moved. But the difference between those claims is the heart of good scientific reasoning.</p>{card(3)}
    <div className="mv-case-two"><div><strong>SUPPORTED BY THE STUDY</strong><p>Relative to the original comparison sources, the researchers documented an outlying occurrence near Kyiv using iNaturalist records.</p></div><div><strong>NOT DEMONSTRATED</strong><p>That the fungus arrived recently, traveled 350 km during the observation period, or occupied every intervening habitat.</p></div></div>
    <button type="button" className="mv-case-subtle-button" onClick={()=>setShowMethods(v=>!v)} aria-expanded={showMethods}>{showMethods?'Hide':'Show'} the actual study design ↗</button>
    {showMethods&&<div className="mv-case-methods"><h3>What the published researchers actually did</h3><p>They analyzed verifiable Ukrainian fungal observations available on iNaturalist as of June 1, 2024, investigated geographic patterns and observer activity, and compared distributions of selected conspicuous fungal taxa—including <i>Clathrus archeri</i>—against published and curated occurrence information.</p><p>This was an observational biodiversity-data study. It was not an experiment tracking fungus dispersal, and this case walkthrough is a teaching adaptation of one part of the larger paper.</p><PaperLinks compact/></div>}
   </section>}
   {stage===6&&<section className="mv-case-section"><p className="mv-case-eyebrow">CHAPTER 07 / TAKE THE METHOD HOME</p><h2>Now apply the same scientific habit to your own question.</h2><p>You don't need to discover a 350 km record to contribute. You might find a missing locality, a doubtful identification, or a region where nobody has looked carefully yet.</p>{card(4)}
    <label className="mv-case-reflection"><strong>Optional: What's a fungus or locality you'd like to investigate?</strong><textarea rows={3} value={reflection} onChange={e=>setReflection(e.target.value)} placeholder="I want to compare records for..." /></label>
    <div className="mv-case-continue"><span>NEXT · BIO-01 / OCCURRENCE MAPPING & SAMPLING GAPS</span><h3>Explore your own research pathway</h3><p>Carry the same distinction forward: documented occurrence, plausible absence, observer effort, and alternative explanations.</p><a className="mv-case-main-link" href="/investigate/study-designer/?framework=BIO-01&case=clathrus-archeri">Open BIO-01 in the Research Navigator →</a><a href="https://www.inaturalist.org/observations?taxon_name=Clathrus%20archeri" target="_blank" rel="noopener noreferrer">Explore today's iNaturalist observations ↗</a><small>Today's observations are a separate, changing dataset—not the authors' June 2024 snapshot.</small></div>
   </section>}
   <footer className="mv-case-footer"><div><button type="button" className="mv-case-back" onClick={()=>move(stage-1)} disabled={stage===0}>← Previous</button>{stage<6&&<button type="button" className="mv-case-next" onClick={()=>move(stage+1)}>Continue investigation →</button>}{stage===6&&<button type="button" className="mv-case-back" onClick={()=>{move(0);setAnswers({});setReflection('');setShowMethods(false)}}>Start again ↺</button>}</div><p>Explore freely. There are no grades or leaderboards; your interpretations are yours to revisit.</p></footer>
  </div>
 </div>;
}

<style>{`
.mv-case-reasoning{border-top:1px solid currentColor;margin-top:20px;padding-top:16px}
.mv-case-reasoning-label{font-size:.72rem!important;letter-spacing:.09em;font-weight:800;opacity:.8;margin:0 0 16px!important}
.mv-case-reasoning p{margin:0 0 14px;line-height:1.6}
.mv-case-reasoning p strong{font-weight:750}
.mv-case-thinking-habit{padding:13px 16px;background:rgba(20,60,46,.07);border-left:3px solid #6b8e52}
`}</style>
