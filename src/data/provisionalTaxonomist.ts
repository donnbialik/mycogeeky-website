/** Provisional taxonomist section: shared navigation, rubric, statuses and curriculum.
 *  Rubric cutoffs are working proposals (Nov 2026), in use until reviewed with Mycota Lab. */

export const ptNav: string[][] = [
  ['hub', 'Overview', '/investigate/provisional-taxonomist/'],
  ['guide', 'Beginner guide', '/investigate/provisional-taxonomist/guide/'],
  ['difficulty', 'Difficulty rubric', '/investigate/provisional-taxonomist/difficulty/'],
  ['cases', 'Cases', '/investigate/provisional-taxonomist/cases/'],
  ['finder', 'Provisional Finder', '/investigate/provisional-finder/'],
  ['comparator', 'ITS Bin Comparator', '/investigate/its-bin-comparator/'],
  ['dikarya', 'Dikarya Tree Builder ↗', 'https://dikarya.us/tree'],
];

export const pdfHref = '/downloads/provisional-taxonomist-beginner-guide.pdf';

/** Each factor scores 0 (easier), 1 or 2 (harder). Rate by the code's section or clade, not its genus. */
export const rubric: [string, string, string, string][] = [
  ['Described species in the section (regional)', 'Few (under about 10)', 'Some', 'Many (over about 30)'],
  ['Share of those with type sequences', 'Most', 'About half', 'Few'],
  ['Modern revision or phylogeny of the section', 'Recent, covers the region', 'Older or partial', 'None'],
  ['Old unsequenced regional names that could apply', '0–2', '3–10', 'More than 10'],
  ['Bin cohesion', 'Tight, clear gap to neighbors', 'Some spread', 'Messy, or close to neighbors'],
  ['Sequenced collections in the code', '5 or more', '3–4', '1–2'],
  ['Vouchered collections', '3 or more', '1–2', 'None'],
  ['Characters that separate species', 'Field characters, basic microscopy', 'Detailed microscopy', 'Fine microscopy, chemistry, or a second gene'],
];

export const levels: [string, string, string][] = [
  ['0–5', 'Beginner', 'A new provisional taxonomist, with a club or mentor as backup'],
  ['6–10', 'Intermediate', 'Someone with a microscope and some literature experience, or a pair working together'],
  ['11–16', 'Advanced', 'Experienced amateurs or professionals; everyone else contributes records'],
];

export const statuses: [string, string, string][] = [
  ['Open', 'The code has no accepted name.', 'Code assigned by Mycota Lab; at least one sequenced, vouchered collection.'],
  ['Matched to existing name', 'The code is the same species as an already-published name.', 'A type sequence (or a sequenced collection accepted as representing the name) falls within the code’s own ITS variation, over a reported overlap length, and the original description fits.'],
  ['Split', 'The code contains more than one species.', 'Consistent subgroups backed by a second gene or by characters that track them. Each part becomes its own case, linked from the original.'],
  ['Described', 'A new name has been validly published for the code.', 'Citation of the publication and the holotype.'],
];

/** Concept pages, in the order the guide needs them. `href` only where a page already exists. */
export const curriculum: { title: string; outcome: string; level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All levels'; href?: string }[] = [
  { title: 'What is a species, and what is a code?', outcome: 'Explain why a code is a hypothesis that can be matched, split or described.', level: 'Beginner', href: '/investigate/provisional-taxonomist/#what' },
  { title: 'DNA barcoding and ITS', outcome: 'Say what ITS is, why it’s used, and that some genera barely vary in it.', level: 'Beginner' },
  { title: 'Reading a sequence result', outcome: 'Interpret RIC, full or partial ITS, and spot a result that doesn’t fit the photos.', level: 'Beginner', href: '/investigate/provisional-taxonomist/guide/#step-1' },
  { title: 'Reading a phylogenetic tree', outcome: 'Find clades, sister groups and support values; know that rotating branches changes nothing.', level: 'Beginner' },
  { title: 'Vouchers and fungaria', outcome: 'Dry, label and store a specimen, and explain why it matters.', level: 'Beginner', href: '/investigate/field/drying/' },
  { title: 'iNaturalist data quality', outcome: 'Tell sequenced records from photo IDs; know that Research Grade doesn’t mean correct.', level: 'Beginner', href: '/investigate/field/identifying/' },
  { title: 'Similarity, distance and the barcode gap', outcome: 'Explain why 97% isn’t a species rule, and compare variation within a bin to the distance between bins.', level: 'Intermediate' },
  { title: 'GenBank, UNITE and BLAST', outcome: 'Read a BLAST result; know that GenBank names can be wrong and why type sequences matter most.', level: 'Intermediate' },
  { title: 'How a genus is organized', outcome: 'Use subgenus, section and stirps to find a code’s neighborhood.', level: 'Intermediate' },
  { title: 'Sampling bias', outcome: 'Read a map or season chart as collecting effort, not true range.', level: 'Intermediate' },
  { title: 'Finding and reading old descriptions', outcome: 'Find an original description (MycoBank, Index Fungorum, Biodiversity Heritage Library) and compare it to a code.', level: 'Intermediate' },
  { title: 'Names, types and priority', outcome: 'Explain holotype, epitype, synonymy and why the oldest applicable name wins.', level: 'Advanced' },
  { title: 'Microscopy for species work', outcome: 'Measure spores and describe cystidia and the cap cuticle to a standard.', level: 'Advanced' },
  { title: 'From case to description', outcome: 'Outline what a species description needs, from vouchers to publication.', level: 'Advanced' },
  { title: 'Working together', outcome: 'Credit contributors, coordinate with labs, and respect unpublished data and permits.', level: 'All levels', href: '/investigate/provisional-taxonomist/cases/#citing' },
];
