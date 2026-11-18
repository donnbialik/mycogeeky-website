/* MycoView genus workbook builder.
 *
 * Builds the genus research workbook (.xlsx) in the browser: Start here, Described species, Collections,
 * Site data, Measurements, Micro summary, Comparison, Type sequence check, GenBank queue. The same schema as
 * build_genus_workbook.py. Formulas use functions that Claude Sheets and Google Sheets support (ARRAYFORMULA,
 * FILTER, XLOOKUP, PERCENTILE...); older Excel versions do not know some of them.
 *
 * window.MVGenusWorkbook.build({ genus, collections: [{header: value}], siteData: [{header: value}],
 *   comparison: [{header: value}], project: {Genus, Family, ...} }) -> Uint8Array (.xlsx bytes)
 * window.MVGenusWorkbook.SITE_COLS: the Site data tab's headers, in order (for copy/paste exports).
 */
(function () {
  'use strict';

  /* ---------------- schema ---------------- */
  const CHARACTERS = [
    ['Macro', 'Growth habit'], ['Macro', 'Pileus size (mm)'], ['Macro', 'Pileus shape'], ['Macro', 'Pileus color'],
    ['Macro', 'Pileus surface'], ['Macro', 'Pileus margin'], ['Macro', 'Hygrophanous?'],
    ['Macro', 'Lamellae attachment'], ['Macro', 'Lamellae spacing'], ['Macro', 'Lamellae breadth'], ['Macro', 'Lamellae color'],
    ['Macro', 'Lamellulae'], ['Macro', 'Lamellae edge'], ['Macro', 'Interveining / anastomosing'],
    ['Macro', 'Stipe size (mm)'], ['Macro', 'Stipe shape'], ['Macro', 'Stipe surface'], ['Macro', 'Stipe interior'],
    ['Macro', 'Stipe color'], ['Macro', 'Stipe base / bulb'], ['Macro', 'Veil / annulus / cortina'],
    ['Macro', 'Context (flesh)'], ['Macro', 'Odor'], ['Macro', 'Taste'], ['Macro', 'Spore print'],
    ['Macro', 'KOH reaction'], ['Macro', 'UV reaction'], ['Macro', 'Other chemical reactions'],
    ['Micro', 'Spore size (L × W µm)'], ['Micro', 'Spore Q'], ['Micro', 'Spore shape'], ['Micro', 'Spore ornamentation'],
    ['Micro', 'Spore wall'], ['Micro', 'Germ pore'], ['Micro', 'Guttulate?'], ['Micro', 'Spore color (in KOH)'],
    ['Micro', "Amyloid / dextrinoid (Melzer's)"], ['Micro', 'Basidia size (µm)'], ['Micro', 'Sterigmata per basidium'],
    ['Micro', 'Cheilocystidia'], ['Micro', 'Cheilocystidia size (µm)'], ['Micro', 'Pleurocystidia'],
    ['Micro', 'Pleurocystidia size (µm)'], ['Micro', 'Caulocystidia'], ['Micro', 'Pileipellis'], ['Micro', 'Clamp connections'],
  ];
  const STRUCTURES = ['Basidiospores', 'Basidia', 'Cheilocystidia', 'Pleurocystidia', 'Caulocystidia', 'Pileipellis', 'Hyphae', 'Other'];
  const SUMMARY_ROWS = 300, COMPARISON_ROWS = 150;

  const DESCRIBED = [['Identity', 'Genus'], ['Identity', 'Species epithet'], ['Identity', 'Full name (auto)'], ['Identity', 'Authority'],
    ['Identity', 'Year'], ['Identity', 'Publication (protologue)'], ['Identity', 'Status'], ['Identity', 'Current name (if not accepted)'],
    ['Identity', 'Basionym'], ['Identity', 'Section / subgenus'], ['Identity', 'Relevant to project?'], ['Identity', 'Name record link'],
    ['Type', 'Type specimen (herbarium, number)'], ['Type', 'Type collection date'], ['Type', 'Continent'], ['Type', 'Country'],
    ['Type', 'State / province'], ['Type', 'County'], ['Type', 'Locality'], ['Type', 'Substrate'], ['Type', 'Host / associated species'], ['Type', 'Habitat'],
    ['Type sequences', 'Type ITS GenBank #'], ['Type sequences', 'ITS coverage'], ['Type sequences', 'Type ITS sequence'],
    ['Type sequences', 'ITS length (auto)'], ['Type sequences', 'Type LSU GenBank #'], ['Type sequences', 'Type LSU sequence'],
    ['Type sequences', 'Other loci'], ['Type sequences', 'FASTA (auto)'], ...CHARACTERS, ['Notes', 'Notes']];

  const COLLECTIONS = [['Identity', 'Collection ID (iNat #)'], ['Identity', 'Provisional / working name'], ['Identity', 'Current determination'],
    ['Identity', 'Collector'], ['Identity', 'Working on it'], ['Identity', 'Project / foray'], ['Identity', 'Date collected'],
    ['Identity', 'Voucher / herbarium catalog #'], ['Identity', 'iNat link (auto)'],
    ['Sequences', 'Sequencing technology'], ['Sequences', 'GenBank ITS #'], ['Sequences', 'GenBank status'],
    ['Sequences', 'ITS sequence'], ['Sequences', 'ITS length (auto)'], ['Sequences', 'Other loci (GenBank #)'], ['Sequences', 'FASTA (auto)'],
    ['Locality', 'Country'], ['Locality', 'State / province'], ['Locality', 'County'], ['Locality', 'Locality'],
    ['Locality', 'Latitude'], ['Locality', 'Longitude'], ['Locality', 'Location precision (m)'],
    ['Field ecology', 'Substrate'], ['Field ecology', 'Host / associated species'], ['Field ecology', 'Habitat'],
    ['Site data', 'Vegetation type (auto)'], ['Site data', 'Elevation, m (auto)'], ['Site data', 'Soil (auto)'],
    ['Site data', 'Trees nearby (auto)'], ['Site data', 'Rain 14 d before (auto)'],
    ['Micro progress', 'Spores measured (auto)'], ['Micro progress', 'Basidia measured (auto)'], ['Micro progress', 'Cheilocystidia measured (auto)'],
    ['Micro progress', 'Pleurocystidia measured (auto)'], ['Micro progress', 'Caulocystidia measured (auto)'],
    ['Micro progress', 'Spore size from Measurements (auto)'], ...CHARACTERS, ['Notes', 'Notes']];

  // What the Ecology Profile exports; pasted rows land here and Collections looks them up by Collection ID.
  const SITE = [['Key', 'Collection ID (iNat #)'], ['Site', 'Vegetation type (LANDFIRE)'], ['Site', 'Elevation (m)'], ['Site', 'Soil'],
    ['Site', 'Trees nearby (iNat)'], ['Weather', 'Rain 14 d before (mm)'], ['Weather', 'Rain 14 d, % of normal'], ['Weather', 'Days since ≥5 mm rain'],
    ['Weather', 'Mean high, prior week (°C)'], ['Weather', 'Mean low, prior week (°C)'], ['Notes', 'Site report'], ['Notes', 'Retrieved']];

  const MEASUREMENTS = [['Input', 'Collection ID (iNat #)'], ['Input', 'Structure'], ['Input', 'Length (µm)'], ['Input', 'Width (µm)'],
    ['Input', 'Mount / medium'], ['Input', 'Measured by'], ['Input', 'Date measured'], ['Input', 'Tool / source'], ['Input', 'Notes'],
    ['Auto', 'Q (auto)'], ['Auto', 'Working name (auto)']];

  const SUMMARY = [['Key', 'Collection ID'], ['Key', 'Structure'], ['Key', 'Working name'], ['Stats', 'n'],
    ['Stats', 'L min'], ['Stats', 'L 5th pct'], ['Stats', 'L mean'], ['Stats', 'L 95th pct'], ['Stats', 'L max'],
    ['Stats', 'W min'], ['Stats', 'W 5th pct'], ['Stats', 'W mean'], ['Stats', 'W 95th pct'], ['Stats', 'W max'],
    ['Stats', 'Q mean'], ['Stats', 'Q range'], ['Stats', 'As written for a description'], ['Key', 'Lookup key']];

  const COMPARISON = [['Taxon', 'Taxon'], ['Taxon', 'Group'], ['Taxon', 'Source'],
    ['Auto', 'Collections (auto)'], ['Auto', 'Spores measured (auto)'], ['Auto', 'Spore size from Measurements (auto)'],
    ['Spores', 'Spore size (L × W µm)'], ['Spores', 'Spore Q'], ['Spores', 'Spore shape / ornamentation'],
    ['Diagnostics', 'Pileus size (mm)'], ['Diagnostics', 'Pileus color'], ['Diagnostics', 'Lamellae attachment'],
    ['Diagnostics', 'Lamellae edge'], ['Diagnostics', 'Stipe'], ['Diagnostics', 'Veil / annulus / cortina'],
    ['Diagnostics', 'Cheilocystidia'], ['Diagnostics', 'Pleurocystidia'], ['Diagnostics', 'Other key character'],
    ['Ecology', 'Substrate / host'], ['Ecology', 'Habitat'], ['Ecology', 'Geography'], ['Ecology', 'Season'], ['Notes', 'Notes']];

  const TYPECHECK = [['Name', 'Similarity group'], ['Name', 'Name'], ['Name', 'Authority & year'], ['Name', 'Publication'],
    ['Name', 'Type locality'], ['Sequence', 'Type GenBank #'], ['Sequence', 'ITS coverage'],
    ['Sequence', 'Similarity within group'], ['Sequence', 'Clusters with (accessions)'],
    ['Evidence', 'Protologue spore size'], ['Evidence', 'Claimed differences'], ['Evidence', 'Comparison with related species'],
    ['Evidence', 'Modern collections that match'], ['Evidence', 'Links'], ['Verdict', 'Conclusion'], ['Verdict', 'Thoughts / next step']];

  const QUEUE = ['Collection ID (iNat #)', 'Provisional / working name', 'Collector', 'Date collected', 'Country', 'State / province', 'Locality',
    'Latitude', 'Longitude', 'Voucher / herbarium catalog #', 'Sequencing technology', 'ITS length (auto)', 'ITS sequence'];

  const HUE = { Identity: 'blue', Type: 'teal', 'Type sequences': 'purple', Sequences: 'purple', Locality: 'teal', 'Field ecology': 'yellow',
    'Site data': 'yellow', 'Micro progress': 'gray', Macro: 'orange', Micro: 'green', Notes: 'gray', Input: 'blue', Auto: 'gray', Key: 'blue',
    Stats: 'green', Taxon: 'blue', Spores: 'green', Diagnostics: 'orange', Ecology: 'yellow', Name: 'blue', Sequence: 'purple',
    Evidence: 'orange', Verdict: 'green', Site: 'yellow', Weather: 'teal', q: 'gray' };
  const HUES = ['blue', 'teal', 'purple', 'yellow', 'orange', 'green', 'gray'];
  const HEX = { blue: 'FFCFE2F3', teal: 'FFD0ECE7', purple: 'FFE1D5F0', yellow: 'FFFFF2CC', orange: 'FFFCE5CD', green: 'FFD9EAD3', gray: 'FFE7E7E7' };

  const DROPDOWNS = {
    status: ['Accepted', 'Synonym / moved', 'Doubtful', 'Needs comb. nov.', 'Excluded'],
    relevant: ['Yes', 'Maybe', 'No'],
    continent: ['North America', 'Central America & Caribbean', 'South America', 'Europe', 'Asia', 'Africa', 'Oceania'],
    coverage: ['Full ITS', 'ITS1 only', 'ITS2 only', 'Partial', 'None'],
    tech: ['Sanger', 'Nanopore (ONT)', 'Illumina', 'PacBio', 'Other'],
    gbstatus: ['Not sequenced', 'Sequence in hand', 'Submitted', 'Accessioned'],
    mount: ['Water', 'KOH 3%', "Melzer's", 'Congo red', 'Cotton blue', 'Other'],
    group: ['Described', 'Provisional', 'Newly described', 'Outgroup'],
    similarity: ['Identical', '≥99%', '97–99%', '<97%'],
    conclusion: ['Distinct', 'Possibly conspecific', 'Synonym candidate', 'Unresolved', 'Needs sequencing'],
  };

  /* ---------------- helpers ---------------- */
  const colL = n => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const index = cols => Object.fromEntries(cols.map(([, h], i) => [h, colL(i + 1)]));

  class Sheet {
    constructor(name) { this.name = name; this.cells = new Map(); this.widths = {}; this.freeze = null; this.validations = []; this.maxR = 0; this.maxC = 0; }
    set(r, c, v, style) { if (v === undefined || v === null || v === '') return; this.cells.set(`${r},${c}`, { r, c, v, style }); this.maxR = Math.max(this.maxR, r); this.maxC = Math.max(this.maxC, c); }
    headers(cols, row = 1) { cols.forEach(([sec, h], i) => this.set(row, i + 1, h, 'h_' + (HUE[sec] || 'gray'))); this.freeze = this.freeze || { row, col: 0 }; }
    width(cols, wide = {}, def = 15) { cols.forEach(([, h], i) => { this.widths[i + 1] = wide[h] || def; }); }
    list(range, options) { this.validations.push({ range, options }); }
  }

  /* ---------------- build ---------------- */
  function build(opts) {
    const genus = (opts.genus || 'Genus').trim();
    const project = opts.project || {};
    const D = index(DESCRIBED), C = index(COLLECTIONS), M = index(MEASUREMENTS), Sx = index(SUMMARY), X = index(COMPARISON), T = index(TYPECHECK), SD = index(SITE);
    const sheets = [];
    const add = name => { const s = new Sheet(name); sheets.push(s); return s; };
    const start = add('Start here');

    // Described species
    let ws = add('Described species'); ws.headers(DESCRIBED); ws.freeze = { row: 1, col: 3 };
    (opts.described || []).forEach((row, i) => { for (const [h, v] of Object.entries(row)) if (D[h]) ws.set(i + 2, colNum(D[h]), v); });
    const g = D['Genus'], sp = D['Species epithet'], its = D['Type ITS sequence'], acc = D['Type ITS GenBank #'], fn = D['Full name (auto)'];
    ws.set(2, colNum(fn), `=ARRAYFORMULA(IF(${sp}2:${sp}="","",TRIM(${g}2:${g}&" "&${sp}2:${sp})))`);
    ws.set(2, colNum(D['ITS length (auto)']), `=ARRAYFORMULA(IF(${its}2:${its}="","",LEN(REGEXREPLACE(${its}2:${its},"[^A-Za-z]",""))))`);
    ws.set(2, colNum(D['FASTA (auto)']), `=ARRAYFORMULA(IF(${its}2:${its}="","",">"&SUBSTITUTE(${fn}2:${fn}," ","_")&IF(${acc}2:${acc}="","","|"&${acc}2:${acc})&"|type"&CHAR(10)&REGEXREPLACE(${its}2:${its},"[^A-Za-z]","")))`);
    ws.width(DESCRIBED, { 'Publication (protologue)': 26, Habitat: 26, 'Type ITS sequence': 18, 'FASTA (auto)': 18, Notes: 40 });
    ws.list(`${D.Status}2:${D.Status}1000`, DROPDOWNS.status); ws.list(`${D['Relevant to project?']}2:${D['Relevant to project?']}1000`, DROPDOWNS.relevant);
    ws.list(`${D.Continent}2:${D.Continent}1000`, DROPDOWNS.continent); ws.list(`${D['ITS coverage']}2:${D['ITS coverage']}1000`, DROPDOWNS.coverage);

    // Collections
    ws = add('Collections'); ws.headers(COLLECTIONS); ws.freeze = { row: 1, col: 2 };
    (opts.collections || []).forEach((row, i) => { for (const [h, v] of Object.entries(row)) if (C[h]) ws.set(i + 2, colNum(C[h]), v, v instanceof Date ? 'date' : undefined); });
    const cid = C['Collection ID (iNat #)'], cits = C['ITS sequence'], cname = C['Provisional / working name'], cacc = C['GenBank ITS #'];
    ws.set(2, colNum(C['iNat link (auto)']), `=ARRAYFORMULA(IF(ISNUMBER(${cid}2:${cid}),"https://www.inaturalist.org/observations/"&${cid}2:${cid},""))`);
    ws.set(2, colNum(C['ITS length (auto)']), `=ARRAYFORMULA(IF(${cits}2:${cits}="","",LEN(REGEXREPLACE(${cits}2:${cits},"[^A-Za-z]",""))))`);
    ws.set(2, colNum(C['FASTA (auto)']), `=ARRAYFORMULA(IF(${cits}2:${cits}="","",">"&SUBSTITUTE(IF(${cname}2:${cname}="","${genus}_sp",${cname}2:${cname})," ","_")&"|iNat"&${cid}2:${cid}&IF(${cacc}2:${cacc}="","","|"&${cacc}2:${cacc})&CHAR(10)&REGEXREPLACE(${cits}2:${cits},"[^A-Za-z]","")))`);
    for (const [h, f] of siteFormulas(cid, SD)) ws.set(2, colNum(C[h]), f);
    for (const [h, st] of [['Spores measured (auto)', 'Basidiospores'], ['Basidia measured (auto)', 'Basidia'], ['Cheilocystidia measured (auto)', 'Cheilocystidia'],
      ['Pleurocystidia measured (auto)', 'Pleurocystidia'], ['Caulocystidia measured (auto)', 'Caulocystidia']])
      ws.set(2, colNum(C[h]), `=ARRAYFORMULA(IF(${cid}2:${cid}="","",COUNTIFS(Measurements!$A:$A,${cid}2:${cid},Measurements!$B:$B,"${st}")))`);
    const sk = `'Micro summary'!$${Sx['Lookup key']}:$${Sx['Lookup key']}`, sw = `'Micro summary'!$${Sx['As written for a description']}:$${Sx['As written for a description']}`;
    ws.set(2, colNum(C['Spore size from Measurements (auto)']), `=ARRAYFORMULA(IF(${cid}2:${cid}="","",IFERROR(XLOOKUP(${cid}2:${cid}&"|Basidiospores",${sk},${sw},""),"")))`);
    ws.width(COLLECTIONS, { 'Provisional / working name': 26, 'ITS sequence': 18, 'FASTA (auto)': 18, Habitat: 26, Substrate: 24, Notes: 40,
      'iNat link (auto)': 20, 'Spore size from Measurements (auto)': 34, 'Vegetation type (auto)': 28, 'Soil (auto)': 26, 'Trees nearby (auto)': 28, 'Rain 14 d before (auto)': 22 });
    ws.list(`${C['Sequencing technology']}2:${C['Sequencing technology']}1000`, DROPDOWNS.tech); ws.list(`${C['GenBank status']}2:${C['GenBank status']}1000`, DROPDOWNS.gbstatus);

    // Site data (pasted from the Ecology Profile)
    ws = add('Site data'); ws.headers(SITE); ws.freeze = { row: 1, col: 1 };
    (opts.siteData || []).forEach((row, i) => { for (const [h, v] of Object.entries(row)) if (SD[h]) ws.set(i + 2, colNum(SD[h]), v); });
    ws.width(SITE, { 'Vegetation type (LANDFIRE)': 34, Soil: 30, 'Trees nearby (iNat)': 34, 'Site report': 50, Retrieved: 24 });

    // Measurements
    ws = add('Measurements'); ws.headers(MEASUREMENTS);
    const mL = M['Length (µm)'], mW = M['Width (µm)'], mid = M['Collection ID (iNat #)'];
    ws.set(2, colNum(M['Q (auto)']), `=ARRAYFORMULA(IF(ISNUMBER(${mL}2:${mL})*ISNUMBER(${mW}2:${mW}),ROUND(${mL}2:${mL}/${mW}2:${mW},2),""))`);
    ws.set(2, colNum(M['Working name (auto)']), `=ARRAYFORMULA(IF(${mid}2:${mid}="","",IFERROR(XLOOKUP(${mid}2:${mid},Collections!$${cid}:$${cid},Collections!$${cname}:$${cname},"(not in Collections)"),"")))`);
    ws.width(MEASUREMENTS, { Notes: 30, 'Working name (auto)': 26, Structure: 16 });
    ws.list('B2:B5000', STRUCTURES); ws.list('E2:E5000', DROPDOWNS.mount);

    // Micro summary
    ws = add('Micro summary'); ws.headers(SUMMARY);
    ws.set(2, 1, `=IFERROR(SORT(UNIQUE(FILTER(HSTACK(Measurements!${mid}2:${mid},Measurements!B2:B),Measurements!${mid}2:${mid}<>"",Measurements!B2:B<>"")),1,TRUE),"")`);
    const q = M['Q (auto)'];
    const [E, F, G, H, I] = ['L min', 'L 5th pct', 'L mean', 'L 95th pct', 'L max'].map(k => Sx[k]);
    const [J, K, Lc, Mc, N] = ['W min', 'W 5th pct', 'W mean', 'W 95th pct', 'W max'].map(k => Sx[k]);
    const Qm = Sx['Q mean'], Dn = Sx.n, QR = Sx['Q range'];
    for (let r = 2; r <= SUMMARY_ROWS + 1; r++) {
      const c = `Measurements!$${mid}:$${mid}=$A${r},Measurements!$B:$B=$B${r}`;
      const stat = (fnc, col, extra = '') => `=IF($A${r}="","",IFERROR(${fnc}(FILTER(Measurements!$${col}:$${col},${c},ISNUMBER(Measurements!$${col}:$${col}))${extra}),""))`;
      const t = x => `TEXT(${x}${r},"0.0")`;
      const f = {
        'Working name': `=IF($A${r}="","",IFERROR(XLOOKUP($A${r},Collections!$${cid}:$${cid},Collections!$${cname}:$${cname},""),""))`,
        n: `=IF($A${r}="","",COUNTIFS(Measurements!$${mid}:$${mid},$A${r},Measurements!$B:$B,$B${r},Measurements!$${mL}:$${mL},">0"))`,
        'L min': stat('MIN', mL), 'L 5th pct': stat('PERCENTILE', mL, ',0.05'), 'L mean': stat('AVERAGE', mL), 'L 95th pct': stat('PERCENTILE', mL, ',0.95'), 'L max': stat('MAX', mL),
        'W min': stat('MIN', mW), 'W 5th pct': stat('PERCENTILE', mW, ',0.05'), 'W mean': stat('AVERAGE', mW), 'W 95th pct': stat('PERCENTILE', mW, ',0.95'), 'W max': stat('MAX', mW),
        'Q mean': stat('AVERAGE', q),
        'Q range': `=IF($A${r}="","",IFERROR(TEXT(MIN(FILTER(Measurements!$${q}:$${q},${c},ISNUMBER(Measurements!$${q}:$${q}))),"0.00")&"–"&TEXT(MAX(FILTER(Measurements!$${q}:$${q},${c},ISNUMBER(Measurements!$${q}:$${q}))),"0.00"),""))`,
        'As written for a description': `=IF(OR($A${r}="",${Dn}${r}=0),"",IF(${Dn}${r}<5,${t(E)}&"–"&${t(I)}&" × "&${t(J)}&"–"&${t(N)}&" µm","("&${t(E)}&"–)"&${t(F)}&"–"&${t(H)}&"(–"&${t(I)}&") × ("&${t(J)}&"–)"&${t(K)}&"–"&${t(Mc)}&"(–"&${t(N)}&") µm")&", mean "&${t(G)}&" × "&${t(Lc)}&" µm"&IF(${Qm}${r}="","",", Q = "&${QR}${r}&" (mean "&TEXT(${Qm}${r},"0.00")&")")&", n = "&${Dn}${r})`,
        'Lookup key': `=IF($A${r}="","",$A${r}&"|"&$B${r})`,
      };
      for (const [h, v] of Object.entries(f)) ws.set(r, colNum(Sx[h]), v);
    }
    ws.width(SUMMARY, { 'Working name': 26, 'As written for a description': 60, 'Lookup key': 22 });

    // Comparison
    ws = add('Comparison'); ws.headers(COMPARISON); ws.freeze = { row: 1, col: 1 };
    const tx = X.Taxon, wn = M['Working name (auto)'];
    (opts.comparison || []).forEach((row, i) => { for (const [h, v] of Object.entries(row)) if (X[h]) ws.set(i + 2, colNum(X[h]), v); });
    ws.set(2, colNum(X['Collections (auto)']), `=ARRAYFORMULA(IF(${tx}2:${tx}="","",COUNTIF(Collections!$${cname}:$${cname},${tx}2:${tx})))`);
    ws.set(2, colNum(X['Spores measured (auto)']), `=ARRAYFORMULA(IF(${tx}2:${tx}="","",COUNTIFS(Measurements!$${wn}:$${wn},${tx}2:${tx},Measurements!$B:$B,"Basidiospores")))`);
    for (let r = 2; r <= COMPARISON_ROWS + 1; r++) {
      const c = `Measurements!$${wn}:$${wn}=$${tx}${r},Measurements!$B:$B="Basidiospores"`;
      const P = (col, p) => `PERCENTILE(FILTER(Measurements!$${col}:$${col},${c},ISNUMBER(Measurements!$${col}:$${col})),${p})`;
      ws.set(r, colNum(X['Spore size from Measurements (auto)']), `=IF($${tx}${r}="","",IFERROR(TEXT(${P(mL, 0.05)},"0.0")&"–"&TEXT(${P(mL, 0.95)},"0.0")&" × "&TEXT(${P(mW, 0.05)},"0.0")&"–"&TEXT(${P(mW, 0.95)},"0.0")&" µm (5th–95th pct)",""))`);
    }
    ws.width(COMPARISON, { Taxon: 30, 'Spore size from Measurements (auto)': 34, Notes: 40, 'Other key character': 24 });
    ws.list(`${X.Group}2:${X.Group}500`, DROPDOWNS.group);

    // Type sequence check
    ws = add('Type sequence check'); ws.headers(TYPECHECK); ws.freeze = { row: 1, col: 2 };
    ws.width(TYPECHECK, { Name: 26, 'Claimed differences': 34, 'Comparison with related species': 34, 'Modern collections that match': 30,
      'Thoughts / next step': 40, Publication: 24, 'Clusters with (accessions)': 26 });
    ws.list(`${T['ITS coverage']}2:${T['ITS coverage']}500`, DROPDOWNS.coverage.slice(0, 4));
    ws.list(`${T['Similarity within group']}2:${T['Similarity within group']}500`, DROPDOWNS.similarity);
    ws.list(`${T.Conclusion}2:${T.Conclusion}500`, DROPDOWNS.conclusion);

    // GenBank queue
    ws = add('GenBank queue'); const Qc = QUEUE.map(h => ['q', h]); ws.headers(Qc);
    const ref = h => `Collections!${C[h]}2:${C[h]}`;
    ws.set(2, 1, `=IFERROR(FILTER(HSTACK(${QUEUE.map(ref).join(',')}),${ref('ITS sequence')}<>"",${ref('GenBank ITS #')}=""),"Nothing waiting: every collection with an ITS sequence has a GenBank number.")`);
    ws.width(Qc, { 'Provisional / working name': 26, Locality: 26, 'ITS sequence': 30 });

    startHere(start, genus, project, C, D);
    return writeXlsx(sheets);
  }

  // Collections' site columns look up the Site data tab by Collection ID.
  function siteFormulas(cid, SD) {
    const S = h => `'Site data'!$${SD[h]}:$${SD[h]}`, key = `'Site data'!$A:$A`, k = `${cid}2:${cid}`;
    const look = h => `XLOOKUP(${k},${key},${S(h)},"")`;
    const simple = h => `=ARRAYFORMULA(IF(${k}="","",IFERROR(${look(h)},"")))`;
    return [
      ['Vegetation type (auto)', simple('Vegetation type (LANDFIRE)')],
      ['Elevation, m (auto)', simple('Elevation (m)')],
      ['Soil (auto)', simple('Soil')],
      ['Trees nearby (auto)', simple('Trees nearby (iNat)')],
      ['Rain 14 d before (auto)', `=ARRAYFORMULA(IF(${k}="","",IFERROR(IF(${look('Rain 14 d before (mm)')}="","",${look('Rain 14 d before (mm)')}&" mm"&IF(${look('Rain 14 d, % of normal')}="",""," ("&${look('Rain 14 d, % of normal')}&"% of normal)")),"")))`],
    ];
  }

  function startHere(ws, genus, project, C, D) {
    ws.widths = { 1: 3, 2: 34, 3: 70 };
    ws.set(2, 2, `${genus}: genus workbook`, 'title');
    ws.set(3, 2, 'One file for a genus project: what is already named, what has been collected, what has been measured, and how they compare.');
    let r = 5; ws.set(r++, 2, 'Project', 'bold');
    for (const k of ['Genus', 'Family', 'Scope (region, group)', 'Lead', 'Collaborators', 'Started', 'Last updated']) { ws.set(r, 2, k); ws.set(r, 3, project[k] || (k === 'Genus' ? genus : null)); r++; }
    r++; ws.set(r++, 2, 'Where things stand', 'bold');
    const ds = "'Described species'";
    const stats = [
      ['Described species listed', `=COUNTA(${ds}!B2:B)`],
      ['…of them accepted', `=COUNTIF(${ds}!${D.Status}2:${D.Status},"Accepted")`],
      ['…with a type ITS sequence', `=COUNTA(${ds}!${D['Type ITS sequence']}2:${D['Type ITS sequence']})`],
      ['Collections', `=COUNTA(Collections!${C['Collection ID (iNat #)']}2:${C['Collection ID (iNat #)']})`],
      ['Provisional / working names', `=COUNTA(UNIQUE(FILTER(Collections!B2:B,Collections!B2:B<>"")))`],
      ['Collections with an ITS sequence', `=COUNTA(Collections!${C['ITS sequence']}2:${C['ITS sequence']})`],
      ['…waiting for a GenBank number', `=COUNTIFS(Collections!${C['ITS sequence']}2:${C['ITS sequence']},"<>",Collections!${C['GenBank ITS #']}2:${C['GenBank ITS #']},"")`],
      ['Collections vouchered', `=COUNTA(Collections!${C['Voucher / herbarium catalog #']}2:${C['Voucher / herbarium catalog #']})`],
      ['Collections with site data', `=SUMPRODUCT(((Collections!${C['Vegetation type (auto)']}2:${C['Vegetation type (auto)']}<>"")+(Collections!${C['Rain 14 d before (auto)']}2:${C['Rain 14 d before (auto)']}<>""))>0)`],
      ['Collections with spores measured', `=COUNTIF(Collections!${C['Spores measured (auto)']}2:${C['Spores measured (auto)']},">0")`],
      ['Measurements recorded', '=COUNT(Measurements!C2:C)'],
    ];
    for (const [k, f] of stats) { ws.set(r, 2, k); ws.set(r, 3, f, 'left'); r++; }
    r++; ws.set(r++, 2, 'The tabs', 'bold');
    const tabs = [
      ['Described species', 'Every name in the genus: authority, protologue, status, type specimen and locality, type sequences, and the protologue description in the shared character columns.'],
      ['Collections', 'One row per collection: identity, sequences, locality, field ecology, site data (looked up from the Site data tab), micro progress (counted automatically from Measurements), and the same character columns as Described species.'],
      ['Site data', 'Paste rows here from the MycoView Ecology Profile (“Copy rows for the genus workbook”). Collections picks them up by Collection ID. Derived from coordinates and public datasets, not field observations.'],
      ['Measurements', 'One row per spore, basidium or cystidium measured: collection, structure, length and width. Paste rows from Piximètre or the MycoView spore tool. Q is calculated.'],
      ['Micro summary', 'Calculated, do not type here. Every collection × structure with n, min, 5th–95th percentiles, mean and max, and the range written the way descriptions give it.'],
      ['Comparison', 'One row per taxon (described, provisional, outgroup) with the key diagnostic characters side by side. Spore ranges from Measurements fill in automatically for working names.'],
      ['Type sequence check', 'For checking whether names hold up: groups of types with identical or near-identical sequences, claimed differences, what modern collections cluster with, and a verdict.'],
      ['GenBank queue', 'Calculated. Collections that have an ITS sequence but no GenBank number yet, with the fields a submission needs.'],
    ];
    for (const [k, v] of tabs) { ws.set(r, 2, k, 'bold'); ws.set(r, 3, v, 'wrap'); r++; }
    r++; ws.set(r++, 2, 'Conventions', 'bold');
    const conv = [
      ['Columns marked (auto)', 'Hold formulas. Type in the other columns; these fill themselves for every row.'],
      ['Measurements', 'In µm, one structure per row. Q = length ÷ width.'],
      ['Ranges in descriptions', '(min–)5th–95th percentile(–max), then the mean, Q and n. With fewer than 5 measured, min–max only.'],
      ['Site data', 'Derived from coordinates by the MycoView Ecology Profile; not field observations. Obscured or imprecise locations get weather only.'],
      ['Character columns', 'Shared by Described species and Collections (agaric set). Hide or rename the ones your genus does not use; add your own after them.'],
      ['Links', 'MycoBank: mycobank.org · Index Fungorum: indexfungorum.org · MycoPortal: mycoportal.org · MycoMap: mycomap.com · iNaturalist: inaturalist.org · Ecology Profile: mycoview.com/investigate/ecology-profile/'],
    ];
    for (const [k, v] of conv) { ws.set(r, 2, k, 'bold'); ws.set(r, 3, v, 'wrap'); r++; }
  }

  function colNum(letters) { let n = 0; for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64; return n; }

  /* ---------------- xlsx writer ---------------- */
  const xmlEsc = s => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const STYLE = (() => { const m = { date: 1, bold: 2, title: 3, wrap: 4, left: 5 }; HUES.forEach((h, i) => { m['h_' + h] = 6 + i; }); return m; })();
  const excelDate = d => (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(1899, 11, 30)) / 86400000;

  function sheetXml(s) {
    const rows = new Map();
    for (const cell of s.cells.values()) { if (!rows.has(cell.r)) rows.set(cell.r, []); rows.get(cell.r).push(cell); }
    const rowXml = [...rows.keys()].sort((a, b) => a - b).map(r => {
      const cells = rows.get(r).sort((a, b) => a.c - b.c).map(({ c, v, style }) => {
        const ref = colL(c) + r, sAttr = style ? ` s="${STYLE[style] || 0}"` : '';
        if (typeof v === 'string' && v.startsWith('=')) return `<c r="${ref}"${sAttr}><f>${xmlEsc(v.slice(1))}</f></c>`;
        if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${sAttr}><v>${v}</v></c>`;
        if (v instanceof Date) return `<c r="${ref}" s="${STYLE.date}"><v>${excelDate(v)}</v></c>`;
        if (typeof v === 'boolean') return `<c r="${ref}"${sAttr} t="b"><v>${v ? 1 : 0}</v></c>`;
        return `<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(String(v).slice(0, 32767))}</t></is></c>`;
      }).join('');
      return `<row r="${r}">${cells}</row>`;
    }).join('');
    let view = '<sheetView workbookViewId="0"/>';
    if (s.freeze && (s.freeze.row || s.freeze.col)) {
      const { row, col } = s.freeze, tl = colL(col + 1) + (row + 1);
      const pane = col && row ? 'bottomRight' : row ? 'bottomLeft' : 'topRight';
      view = `<sheetView workbookViewId="0"><pane${col ? ` xSplit="${col}"` : ''}${row ? ` ySplit="${row}"` : ''} topLeftCell="${tl}" activePane="${pane}" state="frozen"/></sheetView>`;
    }
    const cols = Object.keys(s.widths).length ? `<cols>${Object.entries(s.widths).map(([c, w]) => `<col min="${c}" max="${c}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
    const dv = s.validations.length ? `<dataValidations count="${s.validations.length}">${s.validations.map(({ range, options }) => `<dataValidation type="list" allowBlank="1" showErrorMessage="0" sqref="${range}"><formula1>${xmlEsc('"' + options.join(',') + '"')}</formula1></dataValidation>`).join('')}</dataValidations>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews>${view}</sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rowXml}</sheetData>${dv}</worksheet>`;
  }

  function stylesXml() {
    const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>',
      ...HUES.map(h => `<fill><patternFill patternType="solid"><fgColor rgb="${HEX[h]}"/><bgColor indexed="64"/></patternFill></fill>`)];
    const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
      '<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>',
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>',
      '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>',
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>',
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left"/></xf>',
      ...HUES.map((_h, i) => `<xf numFmtId="0" fontId="1" fillId="${2 + i}" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="bottom"/></xf>`)];
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="16"/><name val="Calibri"/></font></fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  }

  function writeXlsx(sheets) {
    const files = [];
    const add = (name, text) => files.push({ name, data: new TextEncoder().encode(text) });
    add('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
    add('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    add('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xmlEsc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
    add('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    add('xl/styles.xml', stylesXml());
    sheets.forEach((s, i) => add(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)));
    return zipStore(files);
  }

  /* ---------------- zip (stored, no compression) ---------------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = d => { let c = 0xFFFFFFFF; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zipStore(files) {
    const parts = [], central = []; let offset = 0;
    for (const f of files) {
      const name = new TextEncoder().encode(f.name), crc = crc32(f.data), size = f.data.length;
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true); local.setUint16(8, 0, true);
      local.setUint16(10, 0, true); local.setUint16(12, 0x21, true); local.setUint32(14, crc, true); local.setUint32(18, size, true);
      local.setUint32(22, size, true); local.setUint16(26, name.length, true); local.setUint16(28, 0, true);
      parts.push(new Uint8Array(local.buffer), name, f.data);
      const cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
      cen.setUint16(10, 0, true); cen.setUint16(12, 0, true); cen.setUint16(14, 0x21, true); cen.setUint32(16, crc, true);
      cen.setUint32(20, size, true); cen.setUint32(24, size, true); cen.setUint16(28, name.length, true);
      cen.setUint32(42, offset, true);
      central.push(new Uint8Array(cen.buffer), name);
      offset += 30 + name.length + size;
    }
    const cenSize = central.reduce((a, p) => a + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cenSize, true); end.setUint32(16, offset, true);
    const all = [...parts, ...central, new Uint8Array(end.buffer)];
    const out = new Uint8Array(all.reduce((a, p) => a + p.length, 0)); let p = 0;
    for (const a of all) { out.set(a, p); p += a.length; }
    return out;
  }

  const api = { build, SITE_COLS: SITE.map(([, h]) => h), COLLECTION_COLS: COLLECTIONS.map(([, h]) => h), STRUCTURES };
  if (typeof window !== 'undefined') window.MVGenusWorkbook = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
