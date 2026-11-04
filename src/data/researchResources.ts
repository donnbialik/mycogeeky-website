export type Resource = {name:string;url:string;purpose:string;note:string;source:'paper'|'expanded'};
export const groups:{id:string;title:string;intro:string;resources:[string,string,string,string,'paper'|'expanded'][]}[]=[
{id:'names',title:'Names, nomenclature & classification',intro:'Check whether a name exists, how it was published, which type anchors it, and how its classification is currently interpreted.',resources:[
['MycoBank','https://www.mycobank.org','Register and investigate fungal names','A registered name is not proof that the taxon is distinct.','paper'],
['Index Fungorum','https://www.indexfungorum.org','Search fungal names and nomenclatural records','Name records and taxonomic opinions should not be conflated.','paper'],
['Fungal Names','https://www.fungalnames.cn','Fungal nomenclatural registration and records','One of the recognized fungal name repositories discussed in the paper.','paper'],
['Species Fungorum','https://www.speciesfungorum.org','Explore fungal name and classification records','Taxonomic treatments can differ among databases.','expanded'],
['International Code of Nomenclature','https://www.iapt-taxon.org/nomen/main.php','Rules for publishing and applying names','Consult the current Code and fungal-specific Chapter F, not just the 2021 article.','paper'],
['The Code Decoded','https://ab.pensoft.net/article/38075/','Readable guide to nomenclatural rules','An explanatory guide, not a replacement for the current Code.','paper'],
['NCBI Taxonomy','https://www.ncbi.nlm.nih.gov/taxonomy','Browse taxonomy linked to sequence records','A database taxonomy is not itself a taxonomic revision.','expanded'],
['Catalogue of Life','https://www.catalogueoflife.org','Cross-kingdom taxonomic checklist','Coverage and opinions may vary across sources.','expanded']
]},
{id:'specimens',title:'Specimens, fungaria & culture collections',intro:'Trace an observation or sequence back to a physical voucher or preserved culture that can be reexamined.',resources:[
['MyCoPortal','https://www.mycoportal.org','Search digitized fungal specimens','Records vary in completeness and may need direct voucher verification.','paper'],
['iDigBio','https://www.idigbio.org','Explore digitized biodiversity collections','Aggregated records can contain transcription or identification errors.','paper'],
['Index Herbariorum','https://sweetgum.nybg.org/science/ih/','Find recognized herbaria and fungaria','Institution codes help connect specimen vouchers across databases.','paper'],
['Global Biodiversity Information Facility (GBIF)','https://www.gbif.org','Explore occurrence and specimen-linked records','Map points do not automatically represent independently verified identifications.','paper'],
['Atlas of Living Australia','https://www.ala.org.au','Australian biodiversity observations and collections','Check provenance and identification history.','paper'],
['speciesLink','https://specieslink.net','Biodiversity collection records, particularly Brazil','Coverage depends on participating collections.','paper'],
['World Federation for Culture Collections','https://www.wfcc.info','Locate culture collection resources','Collection availability and access rules vary.','paper'],
['Westerdijk Fungal Biodiversity Institute','https://wi.knaw.nl','Fungal reference strains and culture collection resources','Strain availability is distinct from nomenclatural type status.','paper'],
['ATCC','https://www.atcc.org','Biological reference materials and cultures','Many materials require institutional access or purchase.','paper'],
['Global Registry of Scientific Collections','https://www.gbif.org/grscicoll','Find collection institutions and identifiers','A registry record does not guarantee digitized holdings.','expanded']
]},
{id:'sequence',title:'DNA sequences, barcoding & phylogenetics',intro:'Find sequence evidence, inspect similarity, build alignments, and test evolutionary hypotheses.',resources:[
['NCBI GenBank','https://www.ncbi.nlm.nih.gov/genbank/','Search deposited nucleotide sequences','Check vouchers, loci, metadata and taxonomic reliability.','paper'],
['NCBI BLAST','https://blast.ncbi.nlm.nih.gov/Blast.cgi','Find similar sequences','A high percent identity alone is not species confirmation.','paper'],
['UNITE','https://unite.ut.ee','Curated fungal ITS reference sequences and species hypotheses','Species hypotheses are not automatically formally described species.','paper'],
['European Nucleotide Archive (ENA)','https://www.ebi.ac.uk/ena/browser/home','Access international nucleotide sequence records','Part of the INSDC exchange network.','paper'],
['DNA Data Bank of Japan (DDBJ)','https://www.ddbj.nig.ac.jp','Access international nucleotide sequence records','Part of the INSDC exchange network.','paper'],
['NCBI RefSeq','https://www.ncbi.nlm.nih.gov/refseq/','Curated reference sequence records','Reference status does not replace checking underlying evidence.','paper'],
['GlobalFungi','https://globalfungi.com','Explore fungal environmental sequence distributions','Environmental detections need careful ecological interpretation.','paper'],
['MAFFT','https://mafft.cbrc.jp/alignment/server/','Create multiple sequence alignments','Alignment quality and locus selection affect the tree.','expanded'],
['MUSCLE','https://www.ebi.ac.uk/jdispatcher/msa/muscle','Multiple sequence alignment','Review difficult and ambiguous regions.','expanded'],
['IQ-TREE','https://iqtree.github.io','Maximum-likelihood phylogenetic inference','Models, sampling and support affect interpretation.','expanded'],
['RAxML-NG','https://github.com/amkozlov/raxml-ng','Maximum-likelihood phylogenetic inference','Requires methodological choices and suitable sequence data.','expanded'],
['MrBayes','https://nbisweden.github.io/MrBayes/','Bayesian phylogenetic inference','Posterior probabilities depend on model and sampling.','expanded'],
['MEGA','https://www.megasoftware.net','Molecular evolutionary genetics analysis','An accessible interface does not remove methodological caveats.','expanded'],
['AliView','https://ormbunkar.se/aliview/','Inspect and edit sequence alignments','Manual edits should be documented.','expanded'],
['FigTree','https://github.com/rambaut/figtree','Visualize phylogenetic trees','Tree visualization does not validate the analysis.','expanded'],
['iTOL','https://itol.embl.de','Annotate and visualize phylogenetic trees','A visualization tool, not an inference engine.','expanded']
]},
{id:'field',title:'Field observations, ecology & distributions',intro:'Explore what has been observed, where fungi occur, and what ecological hypotheses those patterns suggest.',resources:[
['iNaturalist','https://www.inaturalist.org','Community observations and identification discussion','Photo IDs vary in certainty; examine evidence and disagreements.','paper'],
['Mushroom Observer','https://mushroomobserver.org','Fungal observations, specimens and community identification','Taxon concepts and evidence vary by observation.','paper'],
['FUNGuild','https://funguild.org','Assign ecological guilds from fungal taxonomy','Guild assignments are predictions with varying confidence.','paper'],
['GBIF occurrence search','https://www.gbif.org/occurrence/search','Filter and download biodiversity occurrences','Sampling effort and geolocation precision can distort apparent range.','paper'],
['OBIS','https://obis.org','Marine biodiversity occurrence data','Marine fungal coverage may be incomplete.','expanded'],
['WorldClim','https://www.worldclim.org','Climate surfaces for distribution research','Modeled climate layers are not microhabitat measurements.','expanded'],
['CHELSA','https://chelsa-climate.org','High-resolution climate data','Select appropriate period and spatial resolution.','expanded'],
['QGIS','https://qgis.org','Map and analyze spatial biodiversity data','Geospatial workflows require coordinate and bias checks.','expanded'],
['R Project','https://www.r-project.org','Statistical and reproducible ecological analysis','Methods and packages must be chosen for the question.','expanded'],
['R: rgbif','https://docs.ropensci.org/rgbif/','Programmatic GBIF access','Respect API limits and document query filters.','expanded']
]},
{id:'literature',title:'Scientific literature & publishing',intro:'Locate original descriptions, compare published interpretations, and prepare reproducible scientific work.',resources:[
['Google Scholar','https://scholar.google.com','Find scholarly articles and citations','Search results include material with different review standards.','expanded'],
['Crossref','https://search.crossref.org','Look up DOIs and publication metadata','Metadata records are not full-text verification.','expanded'],
['Biodiversity Heritage Library','https://www.biodiversitylibrary.org','Historical taxonomic literature','Older names and descriptions must be interpreted under the Code.','expanded'],
['Cyberliber','https://www.cybertruffle.org.uk/cyberliber/','Historical mycological literature and taxonomic resources','Coverage and link availability vary.','expanded'],
['MycoKeys','https://mycokeys.pensoft.net','Open-access mycological taxonomy journal','Review individual methods and supporting data.','expanded'],
['IMA Fungus','https://imafungus.biomedcentral.com','Fungal research and nomenclature literature','The supplied 2021 guide was published here.','paper'],
['Mycologia','https://www.tandfonline.com/journals/umyc20','Mycological research journal','Access depends on article and institution.','expanded'],
['Persoonia','https://www.ingentaconnect.com/content/nhn/pimj','Systematics and fungal taxonomy journal','Check individual publication access.','expanded'],
['Fungal Systematics and Evolution','https://fuse-journal.org','Fungal taxonomy and systematics journal','Journal coverage is not a complete literature search.','expanded'],
['Zenodo','https://zenodo.org','Archive datasets, scripts and research outputs','A DOI does not imply peer review.','expanded'],
['Dryad','https://datadryad.org','Publish and retrieve research datasets','Data reuse requires checking methods and licenses.','expanded'],
['GitHub','https://github.com','Version research code and workflows','Repositories vary in maintenance and validation.','expanded'],
['Zotero','https://www.zotero.org','Organize research literature and citations','Verify bibliographic metadata against original publications.','expanded']
]}
];
export const resources=groups.flatMap(g=>g.resources.map(([name,url,purpose,note,source])=>({name,url,purpose,note,source} as Resource)));
