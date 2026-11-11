import { useMemo, useState, type FormEvent } from 'react';

type Topic = 'ecology' | 'taxonomy' | 'morphology' | 'distribution';
const templates: Record<Topic, { label: string; alternative: string; methods: string[]; confounders: string[]; evidence: string[] }> = {
  ecology: {
    label: 'Habitat or ecological association',
    alternative: 'The pattern may reflect sampling effort, habitat availability, or an unmeasured ecological factor rather than a true association.',
    methods: ['Define the focal fungus, study area, habitat categories, and repeatable sampling units.', 'Sample comparable areas with and without the proposed associated organism or habitat.', 'Record observation effort, nondetections where justified, substrate, season and site conditions.', 'Compare frequencies with an analysis that accounts for effort and site differences.'],
    confounders: ['Unequal observation effort', 'Seasonality and fruiting conditions', 'Differences in habitat availability', 'Identification uncertainty'],
    evidence: ['Verifiable observations and vouchers where possible', 'Site and environmental metadata', 'Sampling protocol and effort log']
  },
  taxonomy: {
    label: 'Species boundaries or identifications',
    alternative: 'Observed differences may reflect within-species variation, incomplete reference sampling, sequencing artifacts, or misidentified records.',
    methods: ['Specify the competing taxonomic hypotheses and their diagnostic predictions.', 'Audit reference identifications, type-linked material, voucher metadata and sequence quality.', 'Compare multiple independent collections, morphological characters and ecological context.', 'Evaluate phylogenetic support and whether additional loci or samples are needed.'],
    confounders: ['Unreliable reference labels', 'Limited ITS resolution', 'Intraspecific variation', 'Poor geographic or type-material coverage'],
    evidence: ['Voucher-linked sequences with provenance', 'Morphological descriptions and measurements', 'Published taxonomic treatments and type information']
  },
  morphology: {
    label: 'Morphological character variation',
    alternative: 'The proposed character may change with maturity, preservation, environment, lighting, or sampling technique.',
    methods: ['Define the character and a repeatable measurement protocol.', 'Document specimen maturity, environmental conditions and photographic or microscopy settings.', 'Collect replicated measurements across independent specimens.', 'Compare within-collection and between-collection variation before calling a character diagnostic.'],
    confounders: ['Specimen maturity', 'Observer or instrument bias', 'Preparation and preservation', 'Small sample sizes'],
    evidence: ['Calibrated photographs or micrographs', 'Raw measurements and protocol', 'Voucher and collection details']
  },
  distribution: {
    label: 'Distribution or range hypothesis',
    alternative: 'Apparent geographic differences may reflect uneven reporting, identification errors or inconsistent survey timing.',
    methods: ['Define the geographic scope, taxon concept and temporal window.', 'Separate verified records from unverified photographic identifications.', 'Quantify reporting effort and compare across places and seasons.', 'Identify under-sampled regions and design targeted field surveys.'],
    confounders: ['Geographic sampling bias', 'Taxonomic concept changes', 'Geoprivacy and imprecise coordinates', 'Seasonal detectability'],
    evidence: ['Traceable occurrence records', 'Verification and sequence support where available', 'Geographic survey-effort information']
  }
};
const clean = (value: string) => value.trim().replace(/\s+/g, ' ');
export default function StudyDesigner() {
  const [topic, setTopic] = useState<Topic>('ecology');
  const [question, setQuestion] = useState('');
  const [prediction, setPrediction] = useState('');
  const [location, setLocation] = useState('');
  const [observations, setObservations] = useState('');
  const [generated, setGenerated] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const data = templates[topic];
  const documentText = useMemo(() => {
    const lines = [
      'MYCOVIEW — EXPLORATORY STUDY PLAN',
      'Draft worksheet — not a validated research protocol',
      '',
      'RESEARCH QUESTION',
      clean(question) || '[Question not provided]',
      '',
      'STUDY FOCUS',
      data.label,
      '',
      'FOCAL PLACE / SCOPE',
      clean(location) || '[Define your geographic or sampling scope]',
      '',
      'WORKING HYPOTHESIS / PREDICTION',
      clean(prediction) || '[State what you would expect to observe if the hypothesis is correct]',
      '',
      'ALTERNATIVE EXPLANATION',
      data.alternative,
      '',
      'EXISTING EVIDENCE / STARTING OBSERVATIONS',
      clean(observations) || '[Summarize starting evidence and link original records]',
      '',
      'POSSIBLE INVESTIGATION STEPS',
      ...data.methods.map((m, i) => `${i+1}. ${m}`),
      '',
      'POTENTIAL CONFOUNDERS',
      ...data.confounders.map(c => `- ${c}`),
      '',
      'EVIDENCE TO DOCUMENT',
      ...data.evidence.map(e => `- ${e}`),
      '',
      'OPEN QUESTIONS / REVIEW',
      '- What result could weaken or falsify this hypothesis?',
      '- What information is missing, and whose expertise might help?',
      '- Is the sampling design feasible, ethical and legally permitted?',
      '',
      'This is a structured starting point, not an automatically designed or statistically powered study. Seek domain-specific review before fieldwork or publication.'
    ];
    return lines.join('\n');
  }, [topic, question, prediction, location, observations]);
  const create = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!clean(question)) return; setGenerated(true); setCopyStatus(''); };
  const copy = async () => { try { await navigator.clipboard.writeText(documentText); setCopyStatus('Copied to clipboard.'); } catch { setCopyStatus('Clipboard unavailable; select and copy the plan below.'); } };
  return <div className="mv-designer">
    <form onSubmit={create} className="mv-designer-form">
      <div className="mv-designer-form-header"><span>01 / DEFINE YOUR QUESTION</span><p>No account required. Your draft stays in this browser session and is not submitted to MycoView.</p></div>
      <label>What would you like to investigate?<textarea required value={question} onChange={e => setQuestion(e.target.value)} placeholder="Example: Do fruiting records of this species show a consistent association with eastern hemlock?" rows={3}/></label>
      <div className="mv-designer-two">
        <label>Research theme<select value={topic} onChange={e => { setTopic(e.target.value as Topic); setGenerated(false); }}>{Object.entries(templates).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
        <label>Study area or scope<input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Northeast Ohio, 2027–2028"/></label>
      </div>
      <label>What pattern or result do you predict?<textarea value={prediction} onChange={e => setPrediction(e.target.value)} rows={2} placeholder="State a prediction that could turn out to be wrong."/></label>
      <label>What observations or evidence do you already have?<textarea value={observations} onChange={e => setObservations(e.target.value)} rows={2} placeholder="Link observations, specimens, literature, or note what is missing."/></label>
      <button className="mv-primary" type="submit">Build a preliminary study outline →</button>
    </form>
    <aside className="mv-designer-guidance" aria-label="Research design guidance">
      <span>02 / THINK CRITICALLY</span>
      <h2>Before you collect more data, ask what could prove you wrong.</h2>
      <p>Most research questions admit several plausible explanations. Your first job isn't to confirm your favorite one—it's to work out how to distinguish them.</p>
      <h3>For this research theme, consider:</h3>
      <ul>{data.confounders.map(item => <li key={item}>{item}</li>)}</ul>
      <p className="mv-designer-disclaimer">This prototype provides reproducible, prewritten research prompts. It does not analyze observations, estimate statistical power, or certify a methodology.</p>
    </aside>
    {generated && <section className="mv-designer-result" aria-live="polite">
      <div className="mv-designer-result-head"><div><span>03 / YOUR RESEARCH OUTLINE</span><h2>A question worth testing.</h2></div><button type="button" onClick={copy} className="mv-copy-plan">Copy study outline</button></div>
      <p>{copyStatus}</p>
      <pre tabIndex={0}>{documentText}</pre>
      <p className="mv-designer-disclaimer">Next step: discuss this outline with a knowledgeable collaborator and refine the sampling design before collecting data.</p>
    </section>}
  </div>;
}
