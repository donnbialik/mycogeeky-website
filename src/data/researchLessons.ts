// Educational, human-authored explanations for Research Navigator.
 // These explain how to reason about a framework, not the outcome of a particular user's data.
import type {EvidenceId} from './researchFrameworks';
export type Lesson={
 concept:string;explanation:string;example:string;exampleLabel:string;
 explore:string[];audit:string[];survey:string[];collaborate:string[];
 startingEvidence:EvidenceId[];strengtheningEvidence:EvidenceId[];advancedEvidence:EvidenceId[];
 sourceHelp:string;
};
const basic=(concept:string,explanation:string,example:string,explore:string[],audit:string[],survey:string[],startingEvidence:EvidenceId[],strengtheningEvidence:EvidenceId[],advancedEvidence:EvidenceId[]=[]):Lesson=>({
 concept,explanation,example,exampleLabel:'Illustrative example — not a finding about your fungus',
 explore,audit,survey,collaborate:['Identify a collaborator who can evaluate this specific methodological question.','Share your original question, possible alternative explanations, and evidence gaps.','Decide what claims are currently defensible before agreeing on a study design.'],
 startingEvidence,strengtheningEvidence,advancedEvidence,
 sourceHelp:'Start with the original record or published paper, and inspect the evidence behind its interpretation. A link alone is not scientific confirmation.'
});
export const lessons:Record<string,Lesson>={
'ECO-01':basic(
 'An association is not necessarily a preference.',
 'First determine whether the apparent pattern exists. A fungus fruiting near a tree is not proof that it colonizes that tree. If the tree is common, an apparent association may simply reflect availability.',
 'Imagine white oaks are 70% of eligible trees at a site and account for 70% of documented fruiting associations: that alone suggests no excess relative to availability. If they are 15% of available trees but account for 70% of associations, the pattern deserves closer study—but tree size, survey effort, habitat and actual substrate still matter.',
 ['Look up documented tree and substrate associations for your fungus; distinguish confirmed host records from casual proximity descriptions.','Examine a few original occurrence records. Is the neighboring tree identified confidently, and is a direct substrate connection visible?','Write down two plausible explanations besides the assumed preference.'],
 ['Inspect 10–20 traceable observations in a defined area. Record tree identity only where supported by photographs or reliable notes.','Record how often tree species, substrate, location accuracy, and identification evidence are missing.','Summarize what the existing records can support before calculating apparent association frequencies.'],
 ['Choose identified trees in comparable conditions as sampling units and document which species are available.','Use repeated standardized visits, including visits with no detected fruiting, and record search area and effort.','Plan comparisons for tree size, health, habitat and the possibility of several nearby hosts.'],
 ['photo','literature'],['occurrence','survey','measurements'],['voucher','dna']
),
'ECO-02':basic(
 'A fruiting date is an observation, not necessarily the beginning of the season.',
 'Fungi may be present without visible fruiting bodies; visitor activity, weather and effort alter reported first sightings.',
 'A surge of autumn photographs could reflect more fruiting, more observers, or both. Daily rainfall and fruiting occurring together would still not establish a trigger.',
 ['Review known seasonal records for the species and locality.','Ask whether the question is about first fruiting, peak fruiting, or length of the season.','List factors besides temperature or rainfall that might influence reported observations.'],
 ['Chart dated records by month and year, noting missing years and uneven observer coverage.','Compare records from recurring locations where available.'],['Define a fixed survey schedule and document nondetections.','Record the same fruiting measure and relevant weather at each visit.'],['literature','photo'],['occurrence','survey','measurements']
),
'ECO-03':basic(
 'Living on a substrate is not the same as causing every change to it.',
 'Several decomposers may act sequentially or simultaneously. Visible fruiting can follow substantial earlier decay.',
 'One mushroom on a fallen log does not tell us whether it initiated the decay or which enzymes caused it.',
 ['Learn what is established about the organism’s substrate and nutritional role.','Distinguish presence, substrate use, and measured ecological function.'],['Audit records for identified substrate and documented decay stage.','Compare published work on substrates and decay processes.'],['Use consistent decay-stage descriptions across independently sampled substrates.','For process measurement, seek a reviewed specialist method rather than improvising inoculation.'],['photo','literature'],['survey','voucher','measurements']
),
'ECO-04':basic(
 'Sharing space—or avoiding it—does not prove biological interaction.',
 'Competition, facilitation and parasitism are mechanisms. Similar habitat needs or different fruiting periods can imitate direct interactions.',
 'Two fungi found in different seasons may appear to exclude each other even if they occupy the same substrate.',
 ['Describe the organisms and what you actually observed.','List environmental alternatives to the proposed interaction.'],['Review repeat observations or published studies of the relevant organisms.','Look for data on shared habitat and observation timing.'],['Plan replicated non-invasive observations across comparable sites.','Leave manipulative studies to ethically reviewed specialist protocols.'],['photo','literature'],['survey','measurements','voucher']
),
'ECO-05':basic(
 'Habitat maps describe conditions at a particular scale.',
 'Broad environmental layers can miss the moisture, substrate and canopy conditions immediately around a mushroom.',
 'An elevation association might really follow changes in tree composition or temperature; several variables may move together.',
 ['Clarify whether you mean soil, moisture, canopy, elevation or another measurable variable.','Check the scale and reliability of available habitat data.'],['Audit location uncertainty and whether environmental layers fit that precision.','Compare alternatives that covary with the apparent pattern.'],['Define habitat strata and visit them with comparable effort.','Record microhabitat conditions consistently, not just map classes.'],['occurrence','literature'],['survey','measurements','voucher']
),
'TAX-01':basic(
 'The most defensible name may be a genus or species complex.',
 'Identification depends on whether the available evidence actually distinguishes plausible alternatives.',
 'A photograph with no view of the gills cannot support a character that requires seeing the gills.',
 ['Find the diagnostic characters reported for relevant alternatives.','Ask what evidence a reliable species-level identification would require.'],['Compare original observations and reference specimens rather than just copying labels.','Inspect sequence provenance before relying on reference names.'],['Collect permitted, well-documented comparative material where useful.','Record the features needed to exclude plausible alternatives.'],['photo','literature'],['voucher','measurements'],['dna']
),
'TAX-02':basic(
 'A distinct lineage is a hypothesis about species boundaries, not a species description.',
 'Delimitation requires comparisons with already-named taxa, appropriate phylogenetic evidence and independent specimens.',
 'An ITS branch that appears unique may disappear when a missing close relative is added.',
 ['Find the original descriptions and closest named comparators.','Learn which data support alternative species concepts in your group.'],['Audit type-linked references, vouchers and sampling gaps.','Identify what morphology and molecular evidence actually agree on.'],['Plan independent collections and comparative character documentation.','Review marker and nomenclatural requirements with specialists.'],['literature','voucher'],['measurements','dna']
),
'MOR-01':basic(
 'A useful specimen record documents evidence others can revisit.',
 'Different views, scales and habitat notes often matter more than an attractive single photograph.',
 'A dorsal cap photograph might show color beautifully while hiding the diagnostic underside.',
 ['Learn a small repeatable field-description checklist.','Identify which structures matter for the group.'],['Review prior observations for missing views, scale and substrate details.','Link photographs to consistent collection identifiers.'],['Document multiple views and developmental stages without unnecessary collection.','Link permitted vouchers, notes and metadata consistently.'],['photo'],['voucher','measurements','literature']
),
'MOR-02':basic(
 'Variation within a species can overlap variation between species.',
 'Measurements depend on specimen maturity, preparation and calibration. A single collection rarely establishes a stable diagnostic range.',
 'If spores differ slightly between two collections, that difference could be sampling noise or preparation rather than taxonomy.',
 ['Find published measurement protocols and relevant characters.','Distinguish observed measurements from interpreted diagnoses.'],['Compare character ranges and original descriptions across collections.','Note preparation and maturity differences.'],['Calibrate equipment and define per-collection sampling.','Compare independent collections rather than many measurements from one specimen alone.'],['voucher','literature'],['measurements','photo']
),
'MOL-01':basic(
 'An ITS match is evidence whose strength depends on its references.',
 'Marker resolution, alignment coverage and database labels vary by fungal group. There is no universally valid fungal species identity threshold.',
 'A 99% match to a mislabeled reference can be less informative than a lower match to a verified, type-linked specimen.',
 ['Learn what ITS captures and what it may fail to resolve.','Find published marker-resolution studies for the taxon.'],['Inspect accessions, coverage, provenance and plausible alternative matches.','Record the narrowest identification supported by the reference set.'],['Link any newly collected sequences to reliable vouchers and quality checks.','Consult specialists about additional markers where ITS is unresolved.'],['literature'],['dna','voucher']
),
'MOL-02':basic(
 'A gene tree is a model-supported hypothesis, not an exhaustive species history.',
 'Taxon sampling, alignment decisions, marker choice and missing data can alter inferred relationships.',
 'Two sequences can appear to form a sister group only because closer relatives were not sampled.',
 ['Learn the difference between gene trees, species trees and nomenclature.','Find phylogenies covering the relevant group.'],['Audit sequence alignment, reference taxa and branch support.','Identify alternative plausible topologies and missing taxa.'],['Define the exact relationship question and suitable independent collections.','Seek specialist advice on marker selection and analysis.'],['literature'],['dna','voucher']
),
'MOL-03':basic(
 'Genetic association does not establish adaptation.',
 'Geographic population structure and host distribution can covary. ITS may not resolve individual fungal genets or variation within a species.',
 'If one haplotype occurs mostly in northern sites and white oak is also more common there, the association may be geographic rather than host-driven.',
 ['Distinguish host association, population structure and evolutionary adaptation.','Check whether published markers vary enough within your species.'],['Examine sequence provenance, independence and geographic sampling.','Ask whether host groups occur together within sampled regions.'],['Define voucher-linked independent sampling across replicated host and geographic strata.','Consult a population geneticist before treating marker clusters as adaptive.'],['literature','dna'],['voucher','survey','measurements']
),
'BIO-01':basic(
 'An empty map is not necessarily an empty forest.',
 'Species maps show where organisms have been recorded, not all the places they were searched for unsuccessfully.',
 'An apparent gap between two regions might reflect fewer observers or different identification practices.',
 ['Explore a regional occurrence map and identify likely gaps in observer coverage.','Consider taxonomic uncertainty and location privacy.'],['Audit date, identification, geoprivacy and duplicate records.','Compare platform participation and habitat coverage among regions.'],['Choose under-sampled places for repeatable surveys.','Record effort and genuine nondetections carefully.'],['occurrence','literature'],['survey','photo','voucher']
),
'BIO-02':basic(
 'More species reported does not automatically mean greater biodiversity.',
 'Survey duration, observer count, season and identifiability determine how many species are detected.',
 'A ten-person foray may record more names than a one-person walk even if the sites have similar fungal diversity.',
 ['Learn why effort and detection matter in biodiversity comparisons.','Review examples of repeatable survey events.'],['Inspect prior survey logs for observer numbers and survey conditions.','Separate well-supported taxa from unresolved observations.'],['Define repeatable survey units and standardize effort as feasible.','Document observers, dates, search time, species determinations and vouchers.'],['photo','literature'],['survey','voucher','occurrence']
),
'BIO-03':basic(
 'A before-and-after difference is not automatically caused by the event between them.',
 'Season, observer effort and background environmental change can produce apparent disturbance responses.',
 'More fungi reported after logging might reflect easier visibility, a rainy year, or actual ecological change.',
 ['Choose a measurable response and learn its natural variation.','Identify environmental and observer-related alternatives.'],['Evaluate the comparability of historical records, taxonomic concepts and methods.','Look for reference-site data rather than assuming causation.'],['Plan repeat monitoring with suitable reference sites and explicit effort.','Seek specialist review for strong causal inference.'],['literature','occurrence'],['survey','measurements','voucher']
)
};
export function learningEvidence(id:string,focus:string){
 const base=lessons[id];
 if(id==='ECO-01'&&(focus==='genetic'||focus==='mechanism'||focus==='colonization')){
  return {starting:base.startingEvidence,strengthening:['voucher','literature'] as EvidenceId[],advanced:['dna','survey','measurements'] as EvidenceId[]};
 }
 return {starting:base.startingEvidence,strengthening:base.strengtheningEvidence,advanced:base.advancedEvidence};
}
