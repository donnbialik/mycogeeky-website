#!/usr/bin/env node
/**
 * MycoView Workers AI research-companion benchmark.
 * Dry-run (no network, no credentials): node scripts/benchmark-workers-ai.mjs
 * Real run: CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... node scripts/benchmark-workers-ai.mjs --live
 * Add --model=gemma (or glm, gpt20) to limit to one model.
 * NEVER commit credentials or paste them in a chat.
 */
const MODELS = {
  gemma: {id:'@cf/google/gemma-4-26b-a4b-it', inputRate:9091, outputRate:27273},
  glm: {id:'@cf/zai-org/glm-4.7-flash', inputRate:5500, outputRate:36400},
  gpt20: {id:'@cf/openai/gpt-oss-20b', inputRate:18182, outputRate:27273}
};
const tests = [
  {
    id:'oak-association',
    question:'Why does hen of the woods (Grifola frondosa) seem to occur near white oaks (Quercus alba)? Maybe it evolved a preference, or perhaps competitors are absent during its fruiting window. I have iNaturalist observations and wonder whether haplotypes differ by host.',
    checks:['distinguish tree proximity from colonization','ask what preference means and what comparison would test it','identify observation-effort and host-abundance bias','separate competition/phenology from host association','recognize haplotype question and geographic population structure']
  },
  {
    id:'species-delimitation',
    question:'I have ITS sequences for a cluster of similar-looking Cortinarius mushrooms. BLAST gives 99% similarity to a named species. Have I proved they are the same species?',
    checks:['reject a universal percent identity cutoff','question reference sequence and voucher provenance','ask about type material and taxonomic concepts','recognize ITS alone may be insufficient','recommend further evidence rather than definitive ID']
  },
  {
    id:'ecology-confounding',
    question:'My iNaturalist map shows more morels near old apple orchards than in forests. Can I conclude morels prefer apple trees? What field study should I do?',
    checks:['distinguish observational association from causal preference','account for detectability and sampling effort','propose controls or matched sites','recognize orchard age/disturbance and environment','ask at least one useful targeted follow-up']
  },
  {
    id:'morphological-test',
    question:'Two mushroom collections seem different because one has strongly striate pilei. How can I tell whether this is a diagnostic species character?',
    checks:['consider maturity and weather','require replicated collections','suggest standardized morphology and photographs','compare with other taxa','avoid claiming new species from one trait']
  }
];
const system = `You are an exploratory mycology research mentor for MycoView. Help a visitor formulate a defensible question; do not automatically write a full study. Respond in 220 words or fewer. Identify independent hypotheses, concrete uncertainty, useful missing evidence, and ask the ONE highest-value follow-up question. Do not fabricate citations or pretend you fetched data. Distinguish established evidence from conjecture. If your knowledge is insufficient, explicitly say so.`;
const budgetNeurons=10000;
const live=process.argv.includes('--live');
const onlyArg=process.argv.find(a=>a.startsWith('--model='));
const key=onlyArg?.split('=')[1];
if(key&&!MODELS[key]){console.error('Unknown model. Choose gemma, glm, or gpt20.');process.exit(1)}
const selected=key?[[key,MODELS[key]]]:Object.entries(MODELS);
const estimate=(model,inputTokens,outputTokens)=>(model.inputRate*inputTokens+model.outputRate*outputTokens)/1e6;
const format=(value)=>Number(value).toFixed(1);
console.log('MycoView Workers AI benchmark');
console.log('Free allocation: 10,000 neurons/day SHARED across all Workers AI requests on account.');
console.log('Illustrative session: 3 model calls, total 6,000 input tokens + 1,200 output tokens.');
for(const [name,model] of selected){
 const neurons=estimate(model,6000,1200);
 console.log(`${name}: ~${format(neurons)} neurons/session; max ~${Math.floor(budgetNeurons/neurons)} sessions/day, conservative 70% budget ~${Math.floor(7000/neurons)}.`);
}
if(!live){
 console.log('\nDRY RUN ONLY. No API calls have been made.');
 console.log('To test model quality, set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your private shell environment and rerun with --live.');
 console.log('4 prompts per model; inspect scientific accuracy manually against the checklists below.');
 for(const t of tests)console.log(`\n${t.id}: ${t.question}\nCheck: ${t.checks.join('; ')}`);
 process.exit(0);
}
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!account||!token){console.error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN. Set environment variables privately; never put tokens in repo.');process.exit(1)}
const results=[];
for(const [name,model] of selected){
 for(const t of tests){
  const url=`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/${model.id}`;
  const started=Date.now();
  try{
   const res=await fetch(url,{method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:system},{role:'user',content:t.question}],max_tokens:450,temperature:0.2})});
   const data=await res.json();
   if(!res.ok||data.success===false)throw new Error(`HTTP ${res.status}: ${JSON.stringify(data.errors??data).slice(0,400)}`);
   const answer=data.result?.response??'NO TEXT RETURNED';
   const usage=data.result?.usage??data.usage??{};
   const n=usage.prompt_tokens!=null&&usage.completion_tokens!=null?estimate(model,usage.prompt_tokens,usage.completion_tokens):null;
   console.log(`\n=== ${name} / ${t.id} ===\n${answer}\n`);
   console.log('EXPECTED SCIENTIFIC CHECKS (score manually, do not treat keyword matching as validation):');
   t.checks.forEach((c,i)=>console.log(`  ${i+1}. ${c}`));
   console.log(`Usage: input=${usage.prompt_tokens??'unknown'} output=${usage.completion_tokens??'unknown'} neurons~${n==null?'unknown':format(n)} duration=${Date.now()-started}ms`);
   results.push({model:name,test:t.id,promptTokens:usage.prompt_tokens??null,completionTokens:usage.completion_tokens??null,estimatedNeurons:n,latencyMs:Date.now()-started});
  }catch(err){console.error(`FAILED ${name}/${t.id}: ${String(err.message??err)}`)}
 }
}
console.log('\nSUMMARY (not a scientific quality score)\n'+JSON.stringify(results,null,2));
console.log('Check Cloudflare dashboard for actual neuron use; pricing estimates may not include every model-specific charge.');
