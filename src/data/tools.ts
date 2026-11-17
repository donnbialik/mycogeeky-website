export type Lifecycle = 'experimental' | 'beta' | 'stable' | 'archived';
export type Validation = 'not-evaluated' | 'under-review' | 'validated-for-scope';
/** open: anyone can use it. invitation: linked, but entry is restricted (e.g. Cloudflare Access sign-in). */
export type Access = 'open' | 'invitation';
export type ResearchTool = { id:string; access?:Access; name:string; description:string; category:'molecular'|'ecology'|'field'|'learning'; lifecycle:Lifecycle; validation:Validation; version:string; href?:string; sourceUrl?:string; requirements?:string[]; limitations:string[]; };
// Entries are examples, NOT claims that applications have been deployed or validated.
// Order = the order cards appear on the Workbench. It follows the provisional-taxonomist path below; tools that aren't available yet come last.
export const tools:ResearchTool[] = [
 {id:'study-designer',name:'Research Navigator',description:'Explore five research areas and 15 guided frameworks with evidence checks, method explanations, curated resources, and a shareable research brief.',category:'learning',lifecycle:'experimental',validation:'not-evaluated',version:'framework draft 1.0',href:'/investigate/research-navigator/',limitations:['Framework guidance is educational, unreviewed, and not a validated experimental protocol.']},
 {id:'provisional-finder',name:'Provisional Finder',description:'Find iNaturalist provisional names worth researching: rank ITS-backed provisionals by rarity and see who else has collected them, vouchers, photos, fruiting season and warning flags.',category:'molecular',lifecycle:'experimental',validation:'not-evaluated',version:'prototype, 17 Nov 2026',href:'/investigate/provisional-finder/',limitations:['Counts reflect what has been posted to iNaturalist, not how rare a fungus is in nature.','A provisional name marks a DNA-distinct group; it does not establish that the fungus is an undescribed species.','Flags and sequence checks are simple screens, not verdicts on an identification or a sequence.','Runs in your browser: only usernames and provisional names are sent to the public iNaturalist API; saved results stay on your device.']},
 {id:'its-comparison',name:'ITS Bin Comparator',description:'Explore sequence similarity and inspect molecular evidence: compare two groups of ITS sequences and see their within- and between-group differences.',category:'molecular',lifecycle:'experimental',validation:'not-evaluated',version:'ITS Bin Comparator, 15 Nov 2026',href:'/investigate/its-bin-comparator/',limitations:['Sequence similarity alone does not establish species identity.','Runs in your browser: pasted sequences stay on your device; lookups send only names and accession numbers to public services (iNaturalist, NCBI, GBIF).']},
 {id:'barcode-reliability-explorer',access:'invitation',name:'Barcode Reliability Explorer',description:'Examine how reliable ITS reference sequences are: region boundaries, reference disagreement and barcode gaps, with the uncertainty shown.',category:'molecular',lifecycle:'experimental',validation:'not-evaluated',version:'release 1 (restricted)',href:'/investigate/explorer/',limitations:['Not a species-identification service; no identification threshold is used.','Reference records are computationally curated, not human-reviewed.','Its boundary safeguards are experimental and did not pass their validation criteria.']},
 {id:'seasonality-explorer',name:'iNat Seasonality Explorer',description:'See when a species is actually being found where you hunt: seasonality graphs from iNaturalist observations that you can narrow by place, observer, years and DNA-barcoded records, with the uncertainty shown.',category:'ecology',lifecycle:'experimental',validation:'not-evaluated',version:'prototype, 17 Nov 2026',href:'/investigate/seasonality-explorer/',limitations:['It counts observations, not mushrooms: the graphs show when people photographed a species, which is not the same as when it fruited.','Identifications on iNaturalist can be wrong. The DNA filter checks that a barcode field is filled in, not that the sequence was reviewed or matches the name.','The confidence rating, uncertainty ranges and two-flush detection are rules of thumb, not validated statistics.','Runs in your browser and sends your search filters directly to the public iNaturalist API; results change as observations are added and re-identified.']},
 {id:'field-research',name:'Mushroom Field Research Toolkit',description:'Future tools for specimen documentation and research exports.',category:'field',lifecycle:'experimental',validation:'not-evaluated',version:'planned',limitations:['Planned concept; not yet available.']},
 {id:'ecological-intelligence',name:'Fungal Ecological Intelligence',description:'Explore occurrence evidence, habitat and environmental context.',category:'ecology',lifecycle:'experimental',validation:'not-evaluated',version:'prototype',limitations:['External data sources and scientific calculations require independent verification.']}
];
export const activeTools = tools.filter(t => t.lifecycle !== 'archived');

/** A suggested route through the Workbench for one kind of visitor. Steps point at tools by id, so a second path
 *  (e.g. for foragers) can reuse the same tools in a different order without duplicating their details. */
export type ResearchPath = { id:string; audience:string; title:string; intro:string; steps:{toolId:string; label:string; question:string}[] };
export const provisionalTaxonomistPath:ResearchPath = {
 id:'provisional-taxonomist',
 audience:'Provisional taxonomists',
 title:'Have a provisional name on iNaturalist? A suggested path',
 intro:'One route from a provisional name toward a described species. Each tool also works on its own; start wherever your question is.',
 steps:[
  {toolId:'study-designer',label:'Understand it',question:'What does a provisional name mean, and what would it take to describe it?'},
  {toolId:'provisional-finder',label:'Size it up',question:'How rare is it, who else has it, are there vouchers, and is it likely already described?'},
  {toolId:'its-comparison',label:'Test the DNA',question:'Does your sequence sit inside the group, and is the group distinct from its nearest relatives?'},
  {toolId:'barcode-reliability-explorer',label:'Check the references',question:'Can you trust the reference sequences you are comparing against?'},
  {toolId:'seasonality-explorer',label:'Find more material',question:'When and where does it fruit, so you can collect fresh specimens?'},
  {toolId:'field-research',label:'Document specimens',question:'Microscopy, measurements and vouchering.'},
  {toolId:'ecological-intelligence',label:'Characterize its ecology',question:'Habitat, hosts and substrate.'},
 ]
};
export const stepFor = (path:ResearchPath, toolId:string) => { const i = path.steps.findIndex(s => s.toolId === toolId); return i < 0 ? undefined : i + 1; };

