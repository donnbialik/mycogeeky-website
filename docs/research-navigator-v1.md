# MycoView Research Navigator — Framework library v1.0

## Product intent
A no-AI, no-account, publicly accessible educational navigator across **5 areas / 15 frameworks**. The visitor chooses a scientific question, narrows the type of inference, describes available evidence and study design, and receives methods with **why / prerequisites / what the method cannot show**, next steps, and linked resources.

**Important:** Frameworks are draft educational guidance, not independently peer-reviewed or validated protocols. The Navigator does not fetch user data, claim access to iNaturalist/GenBank, calculate statistics, or design invasive experiments. A review process is needed before describing them as scientifically reviewed.

## User journey
1. Select research area and optionally record question.
2. Choose one of that area's frameworks, then specify the actual research claim.
3. Choose zero or more evidence categories.
4. Describe sampling effort, comparison data, geographic scope, and desired outcome.
5. Read the research pathway, related frameworks, scientific limitations, curated links, and export a text brief.

All choices are changeable using Previous. Related pathways allow jumping to their framework in step 2. Data remains in the browser component while mounted. No server storage or analytics of research notes is implemented.

## Area inventory
- Ecology & relationships: ECO-01 host associations; ECO-02 fruiting/seasonality; ECO-03 decomposition; ECO-04 organism interactions; ECO-05 environmental gradients.
- Identity & taxonomy: TAX-01 identification confidence; TAX-02 species delimitation.
- Morphology & specimens: MOR-01 field documentation; MOR-02 microscopy/variation.
- Molecular evidence & evolution: MOL-01 ITS evidence; MOL-02 phylogenetics; MOL-03 population genetics/ecology.
- Distribution & biodiversity: BIO-01 mapping; BIO-02 standardized surveys; BIO-03 disturbance/change.

## Data / maintenance architecture
- `src/data/researchFrameworks.ts`: independently editable typed resource library and 15 unique framework definitions; each has question types, methods, prerequisites, inferential limits, pitfalls, next steps, and related frameworks.
- `src/components/ResearchNavigator.tsx`: generic five-stage interface, evidence-awareness and export.
- `src/pages/investigate/study-designer/index.astro`: legacy URL remains functional and hosts the new Navigator.
- `src/styles/mycoview.css`: navigator-specific responsive layout.
- `src/data/tools.ts`: Workbench registry entry.
Future: migrate legacy `/investigate/study-designer/` route to `/investigate/research-navigator/` with a redirect only when desired. Avoid breaking existing links at launch.

## Scientific inference restrictions
- An iNaturalist/GBIF occurrence without structured sampling cannot serve as a nondetection or denominator for preference.
- Fruiting near a tree is not evidence that the fungus has colonized the tree.
- Phylogenetic clustering, ITS percent identity, and haplotype associations do not alone establish species boundaries or evolutionary adaptation.
- Comparative observational studies should not be described as controlled experiments.
- Invasive ecological experiments, especially inoculation of living trees or introduction of potentially pathogenic fungi, require expert review, permissions and safeguards; no such protocol is generated.

Reference sources:
- GBIF sampling-event guidance: https://www.gbif.org/sampling-event-data
- GBIF survey and monitoring guide: https://docs.gbif.org/guide-publishing-survey-data/en/
- USFS FIA DataMart: https://research.fs.usda.gov/products/dataandtools/fia-datamart
- NCBI Nucleotide: https://www.ncbi.nlm.nih.gov/nuccore/
- MycoBank: https://www.mycobank.org/

## Manual QA checklist (required before merge)
- [ ] `npm install`, `npm run check`, `npm run build` all succeed.
- [ ] All five research areas can be selected; 15 frameworks total; each framework shows a unique set of subquestions.
- [ ] Choosing another area resets framework/subquestion to an appropriate first option.
- [ ] Choose zero, one and multiple evidence types; the result differentiates missing evidence and caveats.
- [ ] No comparison and presence-only survey settings trigger appropriate uncertainty; standardized effort and matched comparisons do not assert validation.
- [ ] Multiple hypothesis and source notes are retained in full text export.
- [ ] Previous steps and related framework navigation preserve intended choices.
- [ ] Copy research brief works or gives a clear fallback; download creates a readable .txt file.
- [ ] Each resource link opens at its real destination; check current URL and purpose, not just domain.
- [ ] Keyboard navigation, radio/checkbox labels and focus rings work.
- [ ] 320px mobile, tablet and desktop layouts have no horizontal overflow.
- [ ] Investigate homepage, tool catalog and Neo Myco links work.
- [ ] No AI service requests, credentials, subscriptions, or membership registration are triggered.

## Reviewer guidance
Ask at least two qualified people to review methodological content independently of code before attaching a scientific validation label. Record review date, area of expertise, framework version, and exact changes requested.

Test with contradictory questions, not just the Grifola/white-oak example: cryptic Morchella IDs, fungal fruiting phenology, microscopy character reliability, duplicate ITS records, spatial sampling gaps, and fungus/wood-substrate associations.
