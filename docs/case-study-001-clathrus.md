# Research Case Study 001 — The Case of the Wandering Devil's Fingers

## Purpose
An engaging seven-chapter, no-grades investigation of a *published* citizen-science result, tied to MycoView’s BIO-01 occurrence and sampling-gaps framework. A visitor makes predictions, checks evidence concepts, compares source types, sees the authors' result, examines inferential limits, and opens the Research Navigator to plan their own question. No AI, account or external API is required.

**Source of scientific truth**
Prylutskyi, O. and Kapets, N. (2024), "State-of-the-Art of iNaturalist as a Source of Data on Ukrainian Fungi", *Citizen Science: Theory and Practice*, 9(1):25. DOI: https://doi.org/10.5334/cstp.717

- Full paper: https://reference-global.com/article/10.5334/cstp.717?tab=article
- Original figures: https://reference-global.com/article/10.5334/cstp.717?tab=figures-and-tables (Figure 2d for Clathrus)
- Author code and archived data: https://github.com/olehprylutskyi/inaturalist_ua_paper
- Published paper: Creative Commons Attribution 4.0.

## Confirmed facts from source
- Original analysis downloaded 69,211 photo-backed, verifiable Fungi observations in Ukraine available on iNaturalist as of June 1, 2024.
- The paper is a broader analysis of taxonomic, spatial, identification and social dimensions of Ukrainian iNaturalist fungal observations, **not** a dedicated Clathrus experiment.
- The authors compared species distributions in iNaturalist with scientific publications and other records, including collections and other reports.
- For Clathrus archeri, the authors reported an easternmost iNaturalist occurrence near Kyiv, about 350 km from the nearest previously documented occurrence in their comparison sources.
- This is *not* a measured migration distance, an arrival date, demonstrated continuous range or proof of recent colonization.

## Editorial boundaries
- The walkthrough is MycoView's original educational framing; it does not reproduce the paper's full text or pretend the visitor independently reran the R analysis.
- The photo is illustrative (Matteo Marcandella; documented specimen photographed outside Ukraine), not the Kyiv occurrence. Original: https://commons.wikimedia.org/wiki/File:Clathrus_archeri_100906693.jpg — CC BY 4.0, with visible credit near every use.
- The original paper's Figure 2d is linked, not redrawn from invented coordinates or used as a fake map. Future licensed hosting requires exact image and attribution verification.
- The optional current iNaturalist link is not the 2024 study snapshot. Any future live data feature must be explicitly separated from historical source claims.
- The R repository's GPL-3.0 license applies to its code; merely linking is different from redistributing or adapting code.

## Experience
0. The mystery and published paper introduction
1. Make an initial hypothesis about an outlying observation
2. Identify essential evidence in an occurrence record
3. Compare sources to establish whether the observation adds knowledge
4. Reveal the finding, nearest documented record comparison and original Figure 2d
5. Judge which claims are scientifically supportable; optional methods reveal
6. Choose a responsible next investigation and jump to BIO-01

Answers may be revised; no scoring, no account, no backend writes.

## Files
- src/data/caseStudies.ts — reference details, accepted published facts, and checkpoint questions.
- src/components/ClathrusCaseStudy.tsx — interactive chapter/choice interface.
- src/pages/investigate/case-studies/clathrus-archeri.astro — editorial article and attribution.
- src/pages/investigate/case-studies/index.astro — expandable case-study directory.
- src/styles/mycoview.css — image, chapters, controls, response cards, mobile presentation.
- src/components/ResearchNavigator.tsx — query parameter preselection for BIO-01.
- src/pages/investigate/index.astro — entry point.

## Acceptance checks
- [ ] Run npm install, npm run check and npm run build in the actual development checkout.
- [ ] Open index and case route in Cloudflare preview and test on desktop/tablet/mobile.
- [ ] Check image loads; author credit, CC BY link and photo-is-not-from-Ukraine label are visible.
- [ ] Test every chapter, selecting each answer and changing it. Explanations must update and must never grade the visitor.
- [ ] Test keyboard and screen-reader landmarks and focus visibility.
- [ ] Confirm no claim that the fungus migrated 350 km, that the species is newly invasive in Kyiv, or that empty areas indicate true biological absence.
- [ ] Open all primary-source links and inspect original Figure 2d; do not invent geographic locations to fill in missing data.
- [ ] Verify the authors' June 2024 snapshot is separated from any current iNaturalist search.
- [ ] Follow BIO-01 button and ensure the Research Navigator opens the Biodiversity / Occurrence mapping framework as the first selected step.
- [ ] Test the page from the Investigate feature and case-studies listing.
- [ ] Independently review interpretation of the 2024 paper before describing the teaching narrative as scientifically reviewed.

## Planned future additions
- ECO-02: citizen-science winter chanterelle phenology study, after verifying the primary publication, license and available data.
- A reusable case-study library could later store standardized citations, figures with licenses and per-claim source traceability. Avoid speculative live maps.
