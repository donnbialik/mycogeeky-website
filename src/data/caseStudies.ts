// Research Case Study 001 — anchored to Prylutskyi & Kapets (2024).
// Published facts are distinguished from the new educational prompts below.
export const clathrusStudy={
 id:'CASE-001',
 version:'draft-1.0',
 framework:'BIO-01',
 article:{
  title:'State-of-the-Art of iNaturalist as a Source of Data on Ukrainian Fungi',
  authors:'Oleh Prylutskyi and Nadiia Kapets',
  year:2024,
  journal:'Citizen Science: Theory and Practice 9(1):25',
  doi:'https://doi.org/10.5334/cstp.717',
  fullText:'https://reference-global.com/article/10.5334/cstp.717?tab=article',
  figures:'https://reference-global.com/article/10.5334/cstp.717?tab=figures-and-tables',
  archive:'https://github.com/olehprylutskyi/inaturalist_ua_paper',
  datasetDate:'1 June 2024',
  count:69211
 },
 limits:[
  'The case study concerns historical records and the authors’ comparison sources, not a real-time species range map.',
  'An observation far from previously published records is not proof of recent arrival or of an uninterrupted distribution.',
  'Photos and community identifications should be evaluated; a conspicuous fruiting body is not automatically a verified specimen.',
  'Inaccessible areas and uneven observer participation can create substantial apparent distribution gaps.',
  'The published paper is a broad evaluation of iNaturalist fungal data, not a controlled experiment focused solely on Clathrus archeri.'
 ],
 credits:'Educational adaptation and commentary by MycoView, based on Prylutskyi & Kapets (2024). Original paper CC BY 4.0; archived data and code in the authors’ repository (see repository license).',
 questions:[
  {id:'first',title:'What would a distant observation mean?',prompt:'Someone photographs a distinctive fungus beyond the region where you know it has been recorded. What can you say now?',choices:[
    {id:'arrived',assessment:'uncertain',label:'The fungus must have recently spread there.',response:'Possible, but not established. A new record is not a documented arrival date.'},
    {id:'record',assessment:'supported',label:'The known occurrence record may need updating.',response:'Exactly the cautious interpretation: verify identity, place, date and prior sources before revising the documented range.'},
    {id:'adapted',assessment:'unsupported',label:'The fungus evolved to tolerate a different climate.',response:'That would require independent evidence about adaptation and environmental tolerance.'}
  ]},
  {id:'evidence',title:'What would you want to check first?',prompt:'You find a promising iNaturalist photograph. Which evidence matters most for a geographic claim?',choices:[
    {id:'photo',assessment:'supported',label:'A convincing species identification, observation date and credible location.',response:'These directly support whether the record is a plausible documented occurrence at that place and time.'},
    {id:'likes',assessment:'unsupported',label:'The number of favorites and reactions on the photograph.',response:'Popular observations can draw attention, but engagement does not validate a distribution record.'},
    {id:'grade',assessment:'uncertain',label:'Research Grade alone, without checking what was observed.',response:'Community agreement helps, but reviewing original evidence and taxon-specific identification limits is still important.'}
  ]},
  {id:'sources',title:'What should we compare the record against?',prompt:'An outlying iNaturalist observation looks plausible. How do we tell whether it adds information?',choices:[
    {id:'only',assessment:'uncertain',label:'Compare it with other iNaturalist photographs only.',response:'Useful as a first pass, but previous records may be in museums, checklists, papers or other datasets.'},
    {id:'multiple',assessment:'supported',label:'Check independent published records, collections and other occurrence sources.',response:'This is the kind of source comparison the researchers used to evaluate the geographic contribution of iNaturalist.'},
    {id:'none',assessment:'unsupported',label:'No comparison is needed if the photograph is distinctive.',response:'Identity and novelty are separate questions. A correct photo could still be from a previously documented locality.'}
  ]},
  {id:'interpret',title:'What does a 350 km difference establish?',prompt:'A verified record appears roughly 350 km from the closest occurrence in the comparison sources. What follows?',choices:[
    {id:'distance',assessment:'supported',label:'The known documented occurrence extends to the new locality.',response:'Yes, with the qualifications of the date, identity and completeness of the reference sources.'},
    {id:'migration',assessment:'unsupported',label:'The fungus traveled 350 km during the study.',response:'The researchers compared record locations; they did not track an individual fungus moving that distance.'},
    {id:'continuous',assessment:'unsupported',label:'The species occupies every suitable habitat between the two points.',response:'A record gap cannot establish either continuous presence or true absence between locations.'}
  ]},
  {id:'next',title:'How would you investigate a similar mystery yourself?',prompt:'What would you do after noticing a possible distribution gap for a fungus in your region?',choices:[
    {id:'map',assessment:'unsupported',label:'Plot all observations and treat empty areas as absences.',response:'Mapping is an excellent start, but empty areas often lack observers or repeated surveys.'},
    {id:'audit',assessment:'supported',label:'Audit identifications and coordinates, compare prior records, then target gaps with surveys.',response:'A strong next step. It separates historical record review from new fieldwork with documented effort.'},
    {id:'conclude',assessment:'unsupported',label:'Announce a newly invasive species from one photograph.',response:'Invasion status and recent colonization require evidence well beyond a single outlying record.'}
  ]}
 ]
} as const;
