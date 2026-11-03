export type Lifecycle = 'experimental' | 'beta' | 'stable' | 'archived';
export type Validation = 'not-evaluated' | 'under-review' | 'validated-for-scope';
export type ResearchTool = { id:string; name:string; description:string; category:'molecular'|'ecology'|'field'|'learning'; lifecycle:Lifecycle; validation:Validation; version:string; href?:string; sourceUrl?:string; requirements?:string[]; limitations:string[]; };
// Entries are examples, NOT claims that applications have been deployed or validated.
export const tools:ResearchTool[] = [
 {id:'ecological-intelligence',name:'Fungal Ecological Intelligence',description:'Explore occurrence evidence, habitat and environmental context.',category:'ecology',lifecycle:'experimental',validation:'not-evaluated',version:'prototype',limitations:['External data sources and scientific calculations require independent verification.']},
 {id:'its-comparison',name:'ITS Comparison Workbench',description:'Explore sequence similarity and inspect molecular evidence.',category:'molecular',lifecycle:'experimental',validation:'not-evaluated',version:'prototype',limitations:['Sequence similarity alone does not establish species identity.']},
 {id:'field-research',name:'Mushroom Field Research Toolkit',description:'Future tools for specimen documentation and research exports.',category:'field',lifecycle:'experimental',validation:'not-evaluated',version:'planned',limitations:['Planned concept; not yet available.']}
];
export const activeTools = tools.filter(t => t.lifecycle !== 'archived');
