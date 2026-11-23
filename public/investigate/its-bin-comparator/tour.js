/* MycoView guided tours for the ITS Bin Comparator.
 * A website add-on, NOT part of the frozen Comparator (its-bin-comparator.2026-11-06.html). The overview tour only
 * reads the page (and switches the visible results tab). The real-example walkthrough can fill form fields and choose
 * groups when the user presses "Fill this in for me"; the user always presses Fetch / Run themselves, and the tour waits
 * until that work has finished. Nothing is sent anywhere by the tour itself.
 * Tours never open by themselves. First visit: a "New here?" prompt in the how-to bar. Any time: the "Take the tour" button.
 * To add a walk-through video later, set VIDEO_URL below; a "Watch the walk-through" link then appears.
 */
(() => {
  'use strict';
  const VIDEO_URL = '';                       // e.g. 'https://www.youtube.com/watch?v=…' when the video exists
  const SEEN_KEY = 'mycoview-its-comparator-tour-seen-v2';   // v2: everyone sees the new start menu once
  const EX = { prov: "Boletus sp. 'variipes-IN02'", species: 'Boletus variipes', genus: 'Boletus' };

  const $ = (s) => document.querySelector(s);
  const seen = () => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; } };
  const markSeen = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage unavailable: fine */ } };
  const visible = (el) => !!el && !el.closest('[hidden]') && el.getClientRects().length > 0;
  const cardOf = (sel) => { const el = $(sel); return el ? (el.closest('.card') || el) : null; };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const setVal = (sel, v) => { const el = $(sel); if (!el) return; if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const clickTab = (bar, name) => { const b = $(`${bar} [data-tab="${name}"]`); if (b && b.getAttribute('aria-selected') !== 'true') b.click(); };
  const groupNames = () => [...(($('#groupA') || {}).options || [])].map((o) => o.textContent);
  const hasGroup = (pred) => groupNames().some(pred);
  const idle = (sel) => { const b = $(sel); return !!b && !b.disabled; };
  const resultsTab = (name, title, body) => ({ title, body, prep: () => clickTab('#resTabs', name), target: () => $('#resultsTabsCard') });

  /* ---------------- overview tour: every part of the page ---------------- */
  const OVERVIEW = [
    { title: 'Welcome to the ITS Bin Comparator',
      body: 'This tool compares ITS barcode sequences between two groups, for example an iNaturalist provisional bin and the described species it might belong to. It shows how different the groups are and how variable each group is inside. It informs your judgement; it does not identify a species.' },
    { title: 'The workflow in four steps', target: () => $('nav.steps'),
      body: 'This bar is the whole method. The numbered cards below follow the same order: add sequences, check them, choose two groups and run, then read the takeaway.' },
    { title: '1 · Add sequences', target: () => cardOf('#srcTabs'),
      body: 'Three ways in: <b>iNaturalist</b> (observations that carry an ITS sequence), <b>GenBank</b> (search by name; tick “Type material only” for sequences from type specimens), or <b>Paste or file</b> for FASTA from UNITE, MyCoMap, BOLD or your own sequencing.' },
    { title: 'Fetching from iNaturalist', prep: () => clickTab('#srcTabs', 'inat'), target: () => $('#tab-inat'),
      body: 'Choose what to search by, enter the name, and decide which group the results go into, then press <b>Fetch from iNaturalist</b>. Progress appears under <b>Activity</b>. Each fetch can fill its own group, so you can build Group A and Group B one after the other.' },
    { title: 'Practise with the example data', target: () => $('#exampleBanner'), skip: () => !visible($('#exampleBanner')),
      body: 'The page starts with <b>synthetic example sequences</b> so you can try every step safely. They are not real observations. Press <b>Clear examples</b> when you are ready to load your own.' },
    { title: '2 · Check your sequences', target: () => cardOf('#seqFilter'),
      body: 'Every sequence you added is listed here. Edit a group name to move a sequence to another group. Untick a sequence to leave it out of the analysis, and note why. Very short or unusual sequences deserve a second look before you run.' },
    { title: 'Identical sequences within a group', target: () => $('.hap') || cardOf('#hapGroup'),
      body: 'Use this when one group may hold more than one sequence type, which is common in provisional bins built from many collectors. It sorts the group into <b>haplotypes</b> (sets of identical sequences) and splits it: the <b>main haplotype vs the rest</b>, or <b>each shared haplotype separately</b>. Then compare the pieces: if the outliers sit as close to another group as to the main haplotype, the bin may be mixed. <b>Undo haplotype split</b> restores the group. It needs at least 3 sequences in the group.' },
    { title: '3 · Choose two groups and run', target: () => cardOf('#groupA'),
      body: 'Pick <b>Group A</b> (e.g. the provisional bin) and <b>Group B</b> (e.g. the sister taxon), then press <b>Run analysis</b>. The <b>Advanced settings</b> (ambiguity codes, how indels count, the distance shown, the species cutoff) can stay at their defaults the first time.' },
    { title: '4 · Read the quick takeaway first', target: () => $('#takeawayCard'),
      body: 'After a run, a plain-language summary of how the two groups differ appears here. Read it before anything else. <b>Copy summary</b> puts it on your clipboard for notes or an iNaturalist comment. To learn how to read its graphs, press <b>Explain the graphs</b> on this card.' },
    { title: 'Provisional profile', target: () => $('#profCard'),
      body: 'A short, pasteable summary of a provisional name’s range, distribution and season from its iNaturalist records. Optionally compare it with another provisional in the same genus, or place your own observation in that context. Useful when writing up or commenting on a provisional.' },
    { title: 'Genus ITS standard', target: () => $('#calCard'),
      body: 'Answers “is this difference big or small <i>for this genus</i>?” It collects good, named, vouchered ITS for many species of a genus, measures how much each species varies inside and how far it is from its closest relative, and finds the cutoff that best separates the two. The quick takeaway then judges your comparison against that genus standard instead of one number for all fungi. Large genera can take several minutes.' },
    { title: 'Find type sequences', target: () => $('#typeCard'),
      body: 'Finds ITS from holotypes, isotypes and other type specimens on GenBank and GBIF for the names you give. Use it to anchor a comparison to the sequence that defines a name. <b>Use names of loaded groups</b> fills in your groups’ names; the options add record-text searches, GBIF voucher matching, synonyms and iNaturalist.' },
    { title: 'Genus type coverage', target: () => $('#gsCard'),
      body: 'Counts how many species in a genus (optionally in one region or country) have ITS from their holotype or isotype. Use it to judge how much a missing type match means: where coverage is low, “no type sequence matches” says little. You can add type accessions you already know.' },
    resultsTab('report', 'Detailed results · Report', 'The full written report of the comparison, ready to read, print or save. Open the detailed results only when the quick takeaway leaves a question.'),
    resultsTab('pairs', 'Detailed results · Pairs', 'Every pairwise comparison, with filters: which pairs (within a group or between A and B), sequencing technology, region, and ranges of % difference, substitutions and indel events. Good for finding the closest A–B pair or an outlier.'),
    resultsTab('matrix', 'Detailed results · Distance matrix', 'The % distance between every pair of sequences, ordered by group, using the distance chosen in Advanced settings. Blocks of small numbers show tight groups.'),
    resultsTab('aln', 'Detailed results · Alignment', 'The multiple alignment. Show <b>variable sites only</b> or <b>groups A and B only</b>, and click any base to see which sequences carry which state at that position.'),
    resultsTab('sites', 'Detailed results · Variable sites', 'Every position that varies, classified: <b>fixed A–B differences</b> (consistent between the groups), <b>polymorphic within A or B</b>, or variation in other groups only. Fixed differences are the strongest evidence that two groups differ.'),
    resultsTab('export', 'Detailed results · Export and session', 'Download the observation list, pairs, matrix and variable sites as CSV, FASTA (aligned or not) and the report. <b>Save session</b> stores every sequence, group, exclusion, note and setting in one file you can load again later.'),
    { title: 'You are ready',
      body: 'Try it with the example data: choose two groups and press <b>Run analysis</b>. Or take the <b>real example</b> walkthrough, which compares an iNaturalist provisional with type sequences from GenBank, step by step. To learn how to read the barcode gap graphs, choose <b>How to read the barcode gap graphs</b>. Replay any of them from the <b>Take the tour</b> button.',
      end: true },
  ];

  /* ---------------- real-example walkthrough: live data ---------------- */
  let runMark = '';
  const EXAMPLE = [
    { title: 'Real example: a provisional vs its type',
      body: `We will compare the iNaturalist provisional <b>${esc(EX.prov)}</b> (about 20 sequenced observations) with ITS from <b>type specimens</b> that GenBank files under <b>${esc(EX.species)}</b>, then read what the tool says. When this tour was written, those type sequences were all from the variety <i>fagicola</i>. It uses live data, so you need an internet connection; it takes about five minutes. Sequences you already loaded stay in the list.` },
    { title: 'Clear the example data', target: () => $('#exampleBanner'), skip: () => !visible($('#exampleBanner')),
      body: 'First remove the synthetic examples so only real data is compared. Press <b>Clear examples</b>.',
      fill: () => { const b = $('#clearExamples'); if (b) b.click(); }, fillLabel: 'Clear them for me',
      wait: () => !visible($('#exampleBanner')), waitText: 'Waiting for you to press Clear examples…' },
    { title: 'Fetch the provisional from iNaturalist', prep: () => clickTab('#srcTabs', 'inat'), target: () => $('#tab-inat'),
      body: `Set <b>Search by</b> to “Provisional name (exact)”, type <b>${esc(EX.prov)}</b> as the provisional name, and leave <b>Put results in</b> on “Group by provisional name, else taxon”. Then press <b>Fetch from iNaturalist</b>. It usually takes well under a minute; the tool pauses between requests to be polite to iNaturalist.`,
      fill: () => { setVal('#inatMode', 'prov_exact'); setVal('#inatQuery', EX.prov); setVal('#inatGroupBy', 'auto'); setVal('#inatHap', false); },
      wait: () => idle('#inatGo') && hasGroup((g) => g.includes('variipes-IN02')), waitText: 'Waiting for the iNaturalist fetch to finish…' },
    { title: 'Fetch the type sequences from GenBank', prep: () => clickTab('#srcTabs', 'gb'), target: () => $('#tab-gb'),
      body: `Type <b>${esc(EX.species)}</b> as the species name, tick <b>Type material only</b>, leave “Search the whole genus” unticked and <b>Put results in</b> on “Group by organism name”. Then press <b>Fetch from GenBank</b>. You should get a few sequences from type specimens; GenBank names the group after their organism, here <i>${esc(EX.species)}</i> var. <i>fagicola</i>.`,
      fill: () => { setVal('#gbName', EX.species); setVal('#gbType', true); setVal('#gbGenus', false); setVal('#gbGroupBy', 'organism'); },
      wait: () => idle('#gbGo') && hasGroup((g) => /^Boletus variipes\b/.test(g)), waitText: 'Waiting for the GenBank fetch to finish…' },
    { title: 'Check the sequences', target: () => cardOf('#seqFilter'),
      body: 'Here are the real sequences, each with its source, sequencing technology and length. Scan for anything very short, unusually long, or flagged in the QC column, and untick it with a note if it looks wrong. For this example everything can stay ticked.' },
    { title: 'Choose the two groups and run', target: () => cardOf('#groupA'),
      body: `Set <b>Group A</b> to <b>${esc(EX.prov)}</b> and <b>Group B</b> to the <b>${esc(EX.species)}</b> group the GenBank fetch created (its name may include the variety), then press <b>Run analysis</b>.`,
      prep: () => { runMark = ($('#runInfo') || {}).textContent || ''; },
      fill: () => { const a = groupNames().find((g) => g.includes('variipes-IN02')); const b = groupNames().find((g) => /^Boletus variipes\b/.test(g));
        if (a) setVal('#groupA', a); if (b) setVal('#groupB', b); }, fillLabel: 'Choose them for me',
      wait: () => idle('#runBtn') && /pairs/.test(($('#runInfo') || {}).textContent || '') && (($('#runInfo') || {}).textContent || '') !== runMark,
      waitText: 'Waiting for you to press Run analysis…' },
    { title: 'Read the takeaway', target: () => $('#takeawayCard'),
      body: 'This is the answer in plain language: how far the provisional is from the type sequences, compared with how much each group varies inside, and the tool’s call. When this tour was written, the call here was <b>“ITS alone cannot settle this”</b>: the groups differ by about one base, overlap, and have only a few consistent differences. That is a real result, not a failure. It tells you what to do next: check a second gene such as TEF1 or RPB2, or the morphology. Read every takeaway as evidence about a name, never as an identification.' },
    { title: 'See exactly where they differ', prep: () => clickTab('#resTabs', 'sites'), target: () => $('#resultsTabsCard'),
      body: 'The <b>Variable sites</b> tab lists every position that varies. Choose <b>Fixed A–B differences</b> in the Show menu: those are positions where every provisional sequence differs from every type sequence, the strongest evidence of a real difference. Then open <b>Alignment</b> and click a base to see who carries it.' },
    { title: 'Is the provisional one thing? (optional)', target: () => $('.hap') || cardOf('#hapGroup'),
      body: `Choose <b>${esc(EX.prov)}</b> as the group and press <b>Find haplotypes and compare</b>. The tool splits the provisional into its main haplotype and the rest and compares them, which shows whether the bin is uniform. Press <b>Undo haplotype split</b> afterwards to put it back.`,
      fill: () => { const a = [...(($('#hapGroup') || {}).options || [])].map((o) => o.value || o.textContent).find((g) => g.includes('variipes-IN02')); if (a) setVal('#hapGroup', a); setVal('#hapMode', 'core'); } },
    { title: 'Is that gap big for Boletus? (optional)', target: () => $('#calCard'),
      body: `To judge the distance against <i>${EX.genus}</i> in particular, enter <b>${EX.genus}</b> as the genus and press <b>Build genus standard</b>. ${EX.genus} is a large genus, so this takes several minutes; the quick takeaway then uses the ${EX.genus} standard instead of one number for all fungi. (The takeaway also offers a <b>Build the ${EX.genus} standard</b> button.) You can skip this step.`,
      fill: () => { const d = $('#calCard'); if (d && d.tagName === 'DETAILS') d.open = true; setVal('#calGenus', EX.genus); } },
    { title: 'Keep your work', prep: () => clickTab('#resTabs', 'export'), target: () => $('#resultsTabsCard'),
      body: 'Press <b>Save session</b> to keep this comparison as a file you can load again later, or download the report and tables. That completes the walkthrough.',
      end: true },
  ];


  /* ---------------- section tours: one per optional section ---------------- */
  const openCard = (sel) => { const d = $(sel); if (d && d.tagName === 'DETAILS' && !d.open) d.open = true; };
  const firstOption = (sel, pred) => { const o = [...(($(sel) || {}).options || [])].find((x) => pred(x.value || x.textContent)); return o ? (o.value || o.textContent) : ''; };
  const hasText = (sel, re) => { const e = $(sel); return !!e && re.test(e.innerText || ''); };
  const LT = 'Laetiporus';

  /* ---------------- barcode-gap graphs: how to read them ---------------- */
  // A small schematic for the first step: the same two kinds of bar the tool draws, once with a gap and once overlapping.
  const GAP_SKETCH = (() => {
    const W = 384, x = (v) => 92 + v * 27;                  // 0–10 differences across the plot
    const bar = (y, lo, hi, md, col) => `<rect x="${x(lo) - 3}" y="${y - 6}" width="${x(hi) - x(lo) + 6}" height="12" rx="6" fill="${col}" opacity=".85"/><line x1="${x(md)}" x2="${x(md)}" y1="${y - 9}" y2="${y + 9}" stroke="var(--ink,var(--ink,#111418))" stroke-width="2"/>`;
    const panel = (y0, title, a, b, note) => `<text x="0" y="${y0}" font-weight="600">${title}</text>`
      + `<text x="84" y="${y0 + 20}" text-anchor="end">Within</text>${bar(y0 + 16, ...a, 'var(--accent,var(--accent,#111418))')}`
      + `<text x="84" y="${y0 + 42}" text-anchor="end">Between</text>${bar(y0 + 38, ...b, 'var(--spore,var(--spore,#8A5A2B))')}`
      + note;
    const gapNote = `<line x1="${x(2)}" x2="${x(2)}" y1="14" y2="66" stroke="var(--ink,var(--ink,#111418))" stroke-dasharray="3 3"/><line x1="${x(6)}" x2="${x(6)}" y1="14" y2="66" stroke="var(--ink,var(--ink,#111418))" stroke-dasharray="3 3"/><text x="${(x(2) + x(6)) / 2}" y="${71}" text-anchor="middle" font-weight="600">gap</text>`;
    const ovNote = `<rect x="${x(3) - 3}" y="94" width="${x(5) - x(3) + 6}" height="54" fill="var(--warn,var(--warn,#7A4E00))" opacity=".18"/><text x="${(x(3) + x(5)) / 2}" y="${158}" text-anchor="middle" font-weight="600">overlap</text>`;
    let ticks = ''; for (let t = 0; t <= 10; t += 2) ticks += `<text x="${x(t)}" y="178" text-anchor="middle">${t}</text>`;
    return `<svg viewBox="0 0 ${W} 192" width="100%" role="img" aria-label="Sketch: two groups with a barcode gap, and two groups that overlap" style="display:block;margin:4px 0 10px;font:11.5px var(--f-body,system-ui,sans-serif);fill:var(--ink,var(--ink,#111418))">`
      + panel(10, 'Clear gap', [0, 2, 1], [6, 9, 7], gapNote)
      + panel(92, 'Overlap', [0, 5, 2], [3, 8, 5], ovNote)
      + ticks + `<text x="${x(5)}" y="191" text-anchor="middle" style="fill:var(--muted,var(--muted,#4A505A))">differences per pair</text></svg>`;
  })();
  const takeawayGraph = () => $('#takeaway svg[aria-label^="Number of differences"]');
  const takeawayGauge = () => $('#takeaway .tk-std svg');
  const reportHist = () => $('#resultsTabsCard svg[aria-label="Barcode gap histogram"]');
  const calGauge = () => $('#calResult svg');
  const GAP = { label: 'Reading the barcode gap graphs', btn: 'Explain the graphs', where: () => $('#takeawayCard'), steps: [
    { title: 'What a barcode gap is',
      body: `The tool compares every pair of sequences and counts the bases where they differ. There are two kinds of pair. <b>Within a group</b>: both sequences come from the same group (both from A, or both from B). These show how much the sequences in a group vary among themselves. <b>Between groups</b>: one sequence from A and one from B. These show how far apart the two groups are.<br><br>The question is: <b>are the two groups further apart than the sequences inside each group are from each other?</b>${GAP_SKETCH}<b>Barcode gap (top):</b> yes. Even the two most similar A–B sequences differ more than the two most different sequences inside either group. The bars do not touch. This suggests A and B are different species.<br><br><b>Overlap (bottom):</b> no. Some A–B pairs are as similar as sequences inside a group, so ITS alone cannot tell the groups apart. This does <i>not</i> mean they are the same species: closely related species often have nearly identical ITS.<br><br>The tool shows this in three graphs. The next steps explain each one.` },
    { title: 'First, get some results', target: () => cardOf('#groupA'), skip: () => !!takeawayGraph(),
      body: 'The graphs appear after a run. Choose two groups (the example data has “Example provisional bin” and “Example described species”) and press <b>Run analysis</b>.',
      fill: () => { const n = groupNames(); const a = n.find((g) => g === 'Example provisional bin'), b = n.find((g) => g === 'Example described species');
        if (a && b) { setVal('#groupA', a); setVal('#groupB', b); } }, fillLabel: 'Choose the example groups for me',
      wait: () => !!takeawayGraph(), waitText: 'Waiting for you to press Run analysis…' },
    { title: 'Graph 1 · Differences within and between', top: true, target: () => takeawayGraph() || $('#takeawayCard'),
      body: 'This is the graph in the quick takeaway. The <b>green bar</b> runs from the fewest to the most differences found between two sequences in the <i>same</i> group (A and B together). The <b>brown bar</b> does the same for A-against-B pairs. The <b>dark line</b> on each bar is the typical (median) pair. The scale counts <b>bases that differ</b>, not percent. Hover a bar for its exact numbers.' },
    { title: 'Graph 1 · How to read it', top: true, target: () => takeawayGraph() || $('#takeawayCard'),
      body: `<b>Bars apart</b>, with the word “gap” between them: no A–B pair is as close as two sequences inside a group. Check how wide the space is, too. A gap of one or two bases can come from a single misread base, so look at the fixed differences and the homopolymer setting before you trust it.<br><br><b>Bars overlapping</b>: some A–B pairs are as similar as sequences inside a group. ITS alone cannot separate the groups.<br><br><b>A long green bar</b>, especially one with its dark line near the left end, usually means one or two outlying sequences. Find them in the Pairs tab. The haplotype split can show whether the group is mixed.` },
    { title: 'Graph 2 · Against the genus standard', top: true, target: () => takeawayGauge() || ($('#takeaway .tk-std') || $('#takeawayCard')),
      body: () => `${takeawayGauge() ? 'Below Graph 1 is the comparison with the genus standard.' : 'This graph appears here once a genus standard exists for your groups’ genus (the takeaway offers a <b>Build the … standard</b> button). Until then you see fixed reference points instead.'} It uses <b>percent difference</b>, not bases. It has three rows. <b>Within a species</b> (green) is how much named species in the genus usually vary: from 0 to the 95th percentile, with the median marked. <b>Closest species</b> (brown) is the usual distance from each species to its nearest relative: the middle 90%, with the median marked. The <b>dashed line</b> is the cutoff that best separates the two rows. <b>This pair</b> is your A–B range, with a triangle at the typical pair.` },
    { title: 'Graph 2 · How to read it', top: true, target: () => takeawayGauge() || ($('#takeaway .tk-std') || $('#takeawayCard')),
      body: `Look at where the <b>This pair</b> bar falls. <b>Entirely right of the dashed cutoff</b> and past the green row: a species-level difference for this genus. <b>Inside the green row</b>: normal variation within one species. <b>Anywhere else</b> (across the cutoff, or reaching back into the green row): the grey zone, where ITS cannot decide. Also check how far the green and brown rows overlap each other. Where they overlap a lot, ITS separates species poorly in this genus, and no single cutoff will be very reliable. The standard is only as good as the sequences it was built from.` },
    { title: 'Graph 3 · Distance distribution', top: true, prep: () => clickTab('#resTabs', 'report'), target: () => reportHist() || $('#resultsTabsCard'),
      body: 'In the <b>Report</b> tab, the histogram shows every pair instead of a range. Each column counts pairs at that distance (in steps of 0.25%, or 0.5% when distances are large). <b>Green columns</b> are pairs within A and within B. <b>Brown columns</b> are A vs B pairs. The horizontal axis is <b>% distance</b>, using the distance chosen in Advanced settings. Hover a column for its range and count.' },
    { title: 'Graph 3 · How to read it', top: true, prep: () => clickTab('#resTabs', 'report'), target: () => reportHist() || $('#resultsTabsCard'),
      body: `<b>Two humps with empty space between them</b> is a barcode gap. <b>Brown on top of green</b> is overlap.<br><br>Look at the stragglers. A few <b>brown columns far to the left</b> mean a few A–B pairs are nearly identical: one sequence may be in the wrong group or misidentified. A few <b>green columns far to the right</b> point to an outlier inside a group.<br><br>Compare the <b>positions</b> of the columns, not their heights. Pairs grow fast with group size (10 sequences make 45 within-pairs), so a bigger group makes taller columns without being any more variable. The <b>Barcode gap</b> figure above the histogram gives the same answer as a number: the closest A–B pair minus the most different within-group pair. A plus sign means a gap; a minus sign means overlap.` },
    { title: 'The genus standard’s own graph', top: true, prep: () => openCard('#calCard'), target: () => calGauge(), skip: () => !calGauge(),
      body: 'The genus standard you built shows the same graph without a <b>This pair</b> row. Here it describes the genus itself. Species listed below it as <b>without a gap</b> vary inside about as much as they differ from their nearest relative. Be cautious with ITS results in those species.' },
    { title: 'Before you trust a gap', end: true,
      body: 'Check four things. <b>How many sequences?</b> With only one or two per group, the within-group spread is unknown or too small, so a gap appears easily. <b>Are the sequences sound?</b> One poor read can open or close a gap. <b>Are there fixed differences?</b> A gap together with consistent A–B differences is much stronger than either alone. <b>What does the genus usually show?</b> Build the genus standard where you can. A gap is evidence about a name, never an identification. Morphology, ecology and a second gene still decide.' } ] };

  const SECTIONS = {
    gap: GAP,
    hap: { label: 'Identical sequences within a group', where: () => $('.hap'), steps: [
      { title: 'Identical sequences within a group', target: () => $('.hap'),
        body: 'This splits one group by <b>haplotype</b>: sequences that are identical to each other. Use it when a group may hold more than one sequence type, for example a provisional bin assembled from many collectors, or when you want to know whether a few odd sequences are pulling the comparison. It needs at least 3 sequences in the group.' },
      { title: 'Choose the group and how to split it', target: () => $('.hap'),
        body: '<b>Group</b>: the group to split. <b>Split into</b>: <b>Main haplotype vs the rest</b> (the largest set of identical sequences against everything else) or <b>Each shared haplotype separately</b>. <b>Exact match only</b> (on) keeps haplotypes strictly identical. With the example data, choose “Example provisional bin”.',
        fill: () => { const g = firstOption('#hapGroup', (v) => !/\[/.test(v)); if (g) setVal('#hapGroup', g); setVal('#hapMode', 'core'); setVal('#hapStrict', true); } },
      { title: 'Run the split', target: () => $('.hap'),
        prep: () => { runMark = ($('#hapResult') || {}).innerText || ''; },
        body: 'Press <b>Find haplotypes and compare</b>. The tool splits the group, sets the two pieces as Group A and Group B, and runs the analysis for you.',
        wait: () => idle('#hapGo') && hasText('#hapResult', /haplotype/i) && (($('#hapResult') || {}).innerText || '') !== runMark, waitText: 'Waiting for you to press Find haplotypes and compare…' },
      { title: 'Read the split', target: () => $('#hapResult') && visible($('#hapResult')) ? $('.hap') : $('.hap'),
        body: 'The result says how many haplotypes the group holds, which sequences share the main one, and how many are unique. The groups now include “<i>[main haplotype]</i>” and “<i>[other haplotypes]</i>”, and the takeaway compares them. If the other haplotypes differ from the main one by about as much as the group differs from another species, the group may be mixed. Press <b>Undo haplotype split</b> to put the group back.' },
      { title: 'See it in the takeaway', target: () => $('#takeawayCard'), end: true,
        body: 'The quick takeaway now compares the main haplotype with the rest. Small differences (a base or two) usually mean ordinary variation within one species; a gap similar to the one between species is a warning sign worth following up with more genes or morphology.' } ] },

    prof: { label: 'Provisional profile', where: () => $('#profCard'), steps: [
      { title: 'Provisional profile', prep: () => openCard('#profCard'), target: () => $('#profCard'),
        body: 'Builds a short report about one provisional name from its iNaturalist records: how many records and observers, range, season, habitat from the notes, how variable its ITS is, a good reference sequence, and suggested next steps. It is written to paste into an observation or a discussion.' },
      { title: 'Enter the provisional name', prep: () => openCard('#profCard'), target: () => $('#profCard'),
        body: `Type the provisional name exactly as it appears on iNaturalist, for example <b>${esc(EX.prov)}</b>. Optionally add a second provisional in the same genus to <b>Compare with</b>; <b>List other provisionals in this genus</b> shows the names in use, with counts, and clicking one fills it in. <b>Your observation</b> (an iNat number or link) places one record in context.`,
        fill: () => { openCard('#profCard'); setVal('#profA', EX.prov); } },
      { title: 'Build the profile', prep: () => { openCard('#profCard'); runMark = ($('#profOut') || {}).innerText || ''; }, target: () => $('#profCard'),
        body: 'Press <b>Build profile</b>. It reads the provisional’s iNaturalist records and usually takes well under a minute.',
        wait: () => idle('#profGo') && hasText('#profOut', /Records|Range|Season/) && (($('#profOut') || {}).innerText || '') !== runMark, waitText: 'Waiting for the profile to finish…' },
      { title: 'Read and copy the report', target: () => $('#profOut'), end: true,
        body: `The report opens with a headline judgement, then the key facts: records, range, season, habitat, ITS variation (largest and typical difference, number of haplotypes), a reference sequence chosen for quality, and next steps. <b>Details</b> adds sequencing technologies, current iNaturalist identifications and the full distribution. Choose a <b>Format</b> (Markdown for iNaturalist, or plain text) and <b>Length</b>, then <b>Copy report</b>. When this tour was written, ${esc(EX.prov)} came out as “Possibly more than one species”: its sequences differ by up to 13 bases (1.8%), above the common 1.5% yardstick.` } ] },

    cal: { label: 'Genus ITS standard', where: () => $('#calCard'), steps: [
      { title: 'Genus ITS standard', prep: () => openCard('#calCard'), target: () => $('#calCard'),
        body: 'One cutoff does not fit every genus: some species differ by many bases, others by one or two. This builds a yardstick for one genus from good, named, vouchered ITS: how much each species varies inside, how far each is from its closest relative, and the cutoff that best separates the two. The quick takeaway then judges comparisons in that genus against it.' },
      { title: 'Choose the genus and limits', prep: () => openCard('#calCard'), target: () => $('#calCard'),
        body: `<b>Genus</b>: we will use <b>${LT}</b>, which builds in about half a minute (large genera such as <i>${EX.genus}</i> take several minutes). <b>Sequences per species</b> (5) and <b>Species</b> (80) cap the download. Keep <b>Vouchered or type sequences only</b> on for a cleaner standard; <b>Add iNaturalist research-grade sequences</b> adds more data of mixed quality.`,
        fill: () => { openCard('#calCard'); setVal('#calGenus', LT); setVal('#calPer', '5'); setVal('#calMaxSp', '80'); setVal('#calVoucher', true); setVal('#calINat', false); } },
      { title: 'Build it', prep: () => { openCard('#calCard'); runMark = ($('#calResult') || {}).innerText || ''; }, target: () => $('#calCard'),
        body: 'Press <b>Build genus standard</b>. Progress shows in the bar below and under Activity.',
        wait: () => idle('#calGo') && hasText('#calResult', /standard built/i) && (($('#calResult') || {}).innerText || '') !== runMark, waitText: 'Waiting for the genus standard to finish…' },
      { title: 'Read the standard', target: () => $('#calResult'),
        body: `The chart compares variation <b>within a species</b> with the distance to the <b>closest species</b>, and marks the best <b>cutoff</b>. The sentences give the typical distance between neighbouring species, how much one species usually varies (95th percentile), the cutoff and how often it misplaces comparisons, and how many species show a clear <b>barcode gap</b>. When this tour was written, ${LT} gave 14 species, a cutoff of 0.55% (about 3 bases), and 7 of 13 species with a clear gap.` },
      { title: 'Species without a gap', target: () => $('#calResult'), end: true,
        body: 'Species listed <b>without a gap</b> vary inside about as much as they differ from a neighbour. They may be species complexes, contain misidentified sequences, or be genuinely hard to separate on ITS, so treat ITS results in them with extra caution. The <b>Species table</b> and <b>Export species table (CSV)</b> give the numbers per species. The standard is saved in this browser and the quick takeaway uses it whenever your groups are in that genus; <b>Delete this standard</b> removes it.' } ] },

    type: { label: 'Find type sequences', where: () => $('#typeCard'), steps: [
      { title: 'Find type sequences', prep: () => openCard('#typeCard'), target: () => $('#typeCard'),
        body: 'A species name is defined by its <b>type specimen</b>. An ITS sequence from the holotype (or an isotype, epitype, neotype…) is the strongest anchor for a comparison. This searches GenBank and GBIF for type-specimen ITS for the names you give.' },
      { title: 'Enter the names', prep: () => openCard('#typeCard'), target: () => $('#typeCard'),
        body: `Enter species names, one per line or separated by commas, for example <b>${esc(EX.species)}</b>. <b>Use names of loaded groups</b> fills in the names of your current groups. The options (all on) also search record wording for type words, look up type specimens on GBIF and match their catalogue numbers to GenBank vouchers, search synonyms, and check iNaturalist. Turning options off makes the search faster but less thorough.`,
        fill: () => { openCard('#typeCard'); setVal('#tfNames', EX.species); } },
      { title: 'Search', prep: () => { openCard('#typeCard'); runMark = ($('#tfResults') || {}).innerText || ''; }, target: () => $('#typeCard'),
        body: 'Press <b>Find type material</b>. It runs several searches per name and usually takes under a minute.',
        wait: () => idle('#tfGo') && hasText('#tfResults', /Found|No |type/i) && (($('#tfResults') || {}).innerText || '') !== runMark, waitText: 'Waiting for the type search to finish…' },
      { title: 'Read the result', target: () => $('#tfResults'), end: true,
        body: `Each name gets a one-line verdict, then a table of candidates: accession, kind of type (holotype, isotype…), the <b>evidence</b> (NCBI-verified or a matching herbarium type record on GBIF are strong; a record’s own wording or an iNaturalist note is weaker and worth checking against the publication), voucher, country, length and publication. Tick rows and press <b>Add selected sequences</b> to put them in a group for comparison. <b>Search details</b> shows every search and how many records it found. When this tour was written, ${esc(EX.species)} returned its holotype ITS (MICH 10063), verified by NCBI and filed under var. <i>fagicola</i>.` } ] },

    cov: { label: 'Genus type coverage', where: () => $('#gsCard'), steps: [
      { title: 'Genus type coverage', prep: () => openCard('#gsCard'), target: () => $('#gsCard'),
        body: 'How many species in a genus have ITS from their holotype or isotype? This matters when you read a comparison: in a genus where few species have type sequences, “no type sequence matches” says very little, because the right species may simply never have been sequenced from its type.' },
      { title: 'Choose the genus and scope', prep: () => openCard('#gsCard'), target: () => $('#gsCard'),
        body: `<b>Genus</b>: we will use <b>${LT}</b> (about one to two minutes). <b>Region</b> and <b>Country code</b> limit the species list to those recorded there. The options match GenBank vouchers to herbarium type specimens on GBIF, search synonyms filed in other genera, count records whose wording names a type, and check iNaturalist. If you already know type accessions, list them (e.g. “MK123456 isotype”).`,
        fill: () => { openCard('#gsCard'); setVal('#gsGenus', LT); const r = $('#gsRegion'); if (r && r.options.length) setVal('#gsRegion', r.options[0].value); } },
      { title: 'Survey the genus', prep: () => { openCard('#gsCard'); runMark = ($('#gsResults') || {}).innerText || ''; }, target: () => $('#gsCard'),
        body: 'Press <b>Survey genus</b>. It searches GenBank, GBIF and iNaturalist; progress shows under Activity.',
        wait: () => idle('#gsGo') && hasText('#gsResults', /species/i) && (($('#gsResults') || {}).innerText || '') !== runMark, waitText: 'Waiting for the survey to finish…' },
      { title: 'Read the coverage', target: () => $('#gsResults'), end: true,
        body: `The headline gives the share of species with holotype or isotype ITS, then the breakdown (holotype, isotype only, other type only, none) with the species in each list. <b>How sure are these?</b> separates NCBI’s own type tags and herbarium matches (strong) from records that rely on their wording (check them). The species with no type ITS are a ready list of what still needs sequencing from types; <b>Send species without type ITS to the type finder</b> passes them to Find type sequences for a deeper search. When this tour was written, ${LT} had 4 of 17 accepted species (24%) with holotype ITS.` } ] },
  };

  /* ---------------- tour engine ---------------- */
  const css = `
  .mvt-shade{position:fixed;inset:0;z-index:9998;background:rgba(5,10,8,.55)}
  .mvt-spot{position:fixed;z-index:9999;border-radius:10px;box-shadow:0 0 0 9999px rgba(5,10,8,.55),0 0 0 3px var(--accent,var(--accent,#111418));pointer-events:none;transition:all .25s ease}
  .mvt-spot.mvt-live{box-shadow:0 0 0 9999px rgba(5,10,8,.35),0 0 0 3px var(--accent,var(--accent,#111418))}
  .mvt-pop{position:fixed;z-index:10000;width:min(420px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;background:var(--surface,#fff);color:var(--ink,var(--ink,#111418));border:1px solid var(--line,var(--line,#DADDE3));border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.28);padding:18px 18px 14px;font:14.5px/1.5 var(--f-body,system-ui,sans-serif)}
  .mvt-pop h2{margin:0 0 8px;font:600 18px/1.25 var(--f-display,system-ui,sans-serif);color:var(--ink,var(--ink,#111418))}
  .mvt-pop p{margin:0 0 12px}
  .mvt-pop .mvt-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
  .mvt-pop .mvt-count{font:12px var(--f-mono,monospace);color:var(--muted,var(--muted,#4A505A))}
  .mvt-pop .mvt-btns{display:flex;gap:8px;flex-wrap:wrap}
  .mvt-pop .mvt-choices{display:grid;gap:8px;margin:4px 0 12px}
  .mvt-pop .mvt-choices button{text-align:left;padding:10px 14px}
  .mvt-pop .mvt-choices small{display:block;font-weight:400;color:var(--muted,var(--muted,#4A505A))}
  .mvt-pop button{font:600 13.5px var(--f-body,system-ui,sans-serif);padding:8px 14px;border-radius:8px;border:1px solid var(--line,var(--line,#DADDE3));background:transparent;color:var(--ink,var(--ink,#111418));cursor:pointer;min-height:36px}
  .mvt-pop button.mvt-primary{background:var(--accent,var(--accent,#111418));border-color:var(--accent,var(--accent,#111418));color:var(--accent-ink,#fff)}
  .mvt-pop button:disabled{opacity:.5;cursor:default}
  .mvt-pop button:focus-visible{outline:3px solid var(--spore,var(--spore,#8A5A2B));outline-offset:2px}
  .mvt-pop .mvt-wait{display:block;margin:0 0 12px;font-size:13px;color:var(--warn,var(--warn,#7A4E00))}
  .mvt-pop .mvt-done{display:block;margin:0 0 12px;font-size:13px;color:var(--good,var(--good,#1E6B3A));font-weight:600}
  .mvt-pop .mvt-fill{margin:0 0 12px}
  .mvt-pop a{color:var(--accent,var(--accent,#111418));font-weight:600}
  .mvt-pop .mvt-video{display:inline-block;margin:0 0 12px}
  .mvt-start{margin-left:8px}
  .mvt-pop .mvt-sub{margin:0 0 6px;font-size:13px;color:var(--muted,var(--muted,#4A505A))}
  .mvt-pop .mvt-secs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
  .mvt-pop .mvt-secs button{font-size:12.5px;padding:6px 10px;min-height:30px}
  .mvt-sec-btn{font:600 12.5px var(--f-body,system-ui,sans-serif);margin-left:10px;padding:4px 10px;border-radius:999px;border:1px solid var(--accent,var(--accent,#111418));background:transparent;color:var(--accent,var(--accent,#111418));cursor:pointer;vertical-align:middle;white-space:nowrap}
  .mvt-sec-btn:hover{background:var(--accent,var(--accent,#111418));color:var(--accent-ink,#fff)}
  .mvt-sec-btn:focus-visible{outline:3px solid var(--spore,var(--spore,#8A5A2B));outline-offset:2px}
  #tourBtn.mvt-start{background:var(--accent,var(--accent,#111418))!important;border-color:var(--accent,var(--accent,#111418))!important;color:var(--accent-ink,#fff)!important;font-weight:600}
  .mvt-hint{margin:8px 0 0;font:600 14px var(--f-body,system-ui,sans-serif)}
  .mvt-hint button{font:inherit;color:var(--accent,var(--accent,#111418));background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
  @media (max-width:640px){.mvt-pop{left:16px!important;right:16px;width:auto;bottom:16px;top:auto!important;max-height:55vh}}
  @media (prefers-reduced-motion:reduce){.mvt-spot{transition:none}}`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  let i = 0, shade = null, spot = null, pop = null, lastFocus = null, steps = [], poll = null;

  function place() {
    if (!pop) return;
    const st = steps[i]; const el = st && st.target && st.target();
    const small = window.matchMedia('(max-width:640px)').matches;
    const live = !!(st && (st.wait || st.fill));            // the user must reach the highlighted controls
    if (!el || !visible(el)) {
      spot.style.display = 'none'; shade.style.display = 'block';
      if (!small) { pop.style.left = `${Math.max(16, (innerWidth - pop.offsetWidth) / 2)}px`; pop.style.top = `${Math.max(16, (innerHeight - pop.offsetHeight) / 2)}px`; }
      return;
    }
    shade.style.display = 'none'; spot.style.display = 'block'; spot.classList.toggle('mvt-live', live);
    const r = el.getBoundingClientRect(), pad = 6;
    Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + 2 * pad}px`, height: `${r.height + 2 * pad}px` });
    if (small) return;                                      // bottom sheet on phones (CSS)
    const pw = pop.offsetWidth, ph = pop.offsetHeight, gap = 14;
    const clampTop = (t) => Math.min(innerHeight - ph - 16, Math.max(16, t));
    const clampLeft = (l) => Math.min(innerWidth - pw - 16, Math.max(16, l));
    let left, top;
    if (r.right + gap + pw <= innerWidth - 16 && (live || r.height > innerHeight * 0.45)) { left = r.right + gap; top = clampTop(r.top); }  // beside, keeps controls free
    else if (r.bottom + gap + ph <= innerHeight - 16) { top = r.bottom + gap; left = clampLeft(r.left); }
    else if (r.top - gap - ph >= 16) { top = r.top - gap - ph; left = clampLeft(r.left); }
    else if (r.right + gap + pw <= innerWidth - 16) { left = r.right + gap; top = clampTop(r.top); }
    else if (r.left - gap - pw >= 16) { left = r.left - gap - pw; top = clampTop(r.top); }
    else { left = clampLeft(r.right - pw - 16); top = clampTop(r.bottom - ph - 16); }
    pop.style.left = `${left}px`; pop.style.top = `${top}px`;
  }

  function buttons(last, waiting) {
    return `<div class="mvt-meta"><span class="mvt-count">${i + 1} of ${steps.length}</span><div class="mvt-btns">`
      + (i > 0 ? '<button type="button" data-act="back">Back</button>' : '<button type="button" data-act="end">Close</button>')
      + (waiting ? '<button type="button" data-act="next">Skip step</button>' : '')
      + `<button type="button" class="mvt-primary" data-act="${last ? 'end' : 'next'}"${waiting ? ' disabled' : ''}>${last ? 'Finish' : 'Next'}</button></div></div>`;
  }

  function render() {
    const st = steps[i]; const last = i === steps.length - 1 || !!st.end;
    const waiting = !!(st.wait && !st.wait());
    pop.innerHTML = `<h2 id="mvt-title">${st.title}</h2><p id="mvt-body">${typeof st.body === 'function' ? st.body() : st.body}</p>`
      + (st.fill && waiting !== false || st.fill && !st.wait ? `<button type="button" class="mvt-fill" data-act="fill">${st.fillLabel || 'Fill this in for me'}</button>` : '')
      + (st.wait ? (waiting ? `<span class="mvt-wait" role="status">${st.waitText || 'Waiting…'}</span>` : '<span class="mvt-done" role="status">Done. Press Next.</span>') : '')
      + (last && VIDEO_URL ? `<a class="mvt-video" href="${VIDEO_URL}" target="_blank" rel="noopener">Watch the walk-through video</a>` : '')
      + buttons(last, waiting);
    place();
    return waiting;
  }

  function show(n) {
    clearInterval(poll); poll = null;
    i = Math.max(0, Math.min(steps.length - 1, n));
    const st = steps[i];
    if (st.prep) { try { st.prep(); } catch { /* page changed: show anyway */ } }
    const el = st.target && st.target();
    const waiting = render();
    if (el && visible(el)) {
      const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
      const tall = el.getBoundingClientRect().height > innerHeight * 0.7;   // long results: show their top, where the headline is
      if (st.top) scrollTo({ top: Math.max(0, scrollY + el.getBoundingClientRect().top - 24), behavior: reduce ? 'auto' : 'smooth' });   // graphs: chart at the top, explanation below it
      else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: tall ? 'start' : 'center' });
      setTimeout(place, reduce ? 0 : 380);
    }
    const focusBtn = pop.querySelector('.mvt-primary:not([disabled])') || pop.querySelector('[data-act="fill"]') || pop.querySelector('button');
    if (focusBtn) focusBtn.focus({ preventScroll: true });
    if (waiting) poll = setInterval(() => { if (!pop) return clearInterval(poll); if (st.wait()) { clearInterval(poll); poll = null; render(); const b = pop.querySelector('.mvt-primary'); if (b) b.focus({ preventScroll: true }); } }, 500);
  }

  function onKey(e) {
    if (!pop) return;
    const st = steps[i]; const blocked = !!(st && st.wait && !st.wait());
    const inForm = e.target && e.target.closest && !e.target.closest('.mvt-pop') && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
    if (e.key === 'Escape') { e.preventDefault(); markSeen(); end(); }
    else if (inForm) return;                                // let people type into the page's fields
    else if (e.key === 'ArrowRight' && !blocked && steps.length) { e.preventDefault(); if (i < steps.length - 1) show(i + 1); }
    else if (e.key === 'ArrowLeft' && steps.length) { e.preventDefault(); if (i > 0) show(i - 1); }
  }

  function open() {
    lastFocus = document.activeElement;
    shade = document.createElement('div'); shade.className = 'mvt-shade';
    spot = document.createElement('div'); spot.className = 'mvt-spot';
    pop = document.createElement('div'); pop.className = 'mvt-pop';
    pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-labelledby', 'mvt-title'); pop.setAttribute('aria-describedby', 'mvt-body');
    pop.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]'); if (!a || a.disabled) return;
      const act = a.dataset.act;
      if (act === 'overview' || act === 'example' || act === 'sec' || act === 'end') markSeen();
      if (act === 'next') show(i + 1); else if (act === 'back') show(i - 1); else if (act === 'end') end();
      else if (act === 'fill') { try { steps[i].fill(); } catch { /* ignore */ } setTimeout(() => render(), 50); }
      else if (act === 'overview') begin(OVERVIEW); else if (act === 'example') begin(EXAMPLE);
      else if (act === 'sec' && SECTIONS[a.dataset.sec]) begin(SECTIONS[a.dataset.sec].steps);
    });
    shade.addEventListener('click', () => { markSeen(); end(); });
    document.body.append(shade, spot, pop);
    document.addEventListener('keydown', onKey, true);
    addEventListener('resize', place); addEventListener('scroll', place, true);
  }

  function menu() {                                          // the start menu
    if (!pop) open();
    steps = []; spot.style.display = 'none'; shade.style.display = 'block';
    pop.innerHTML = `<h2 id="mvt-title">New to the ITS Bin Comparator?</h2><p id="mvt-body">Choose how you would like to start.</p>
      <div class="mvt-choices">
        <button type="button" class="mvt-primary" data-act="overview">Quick tour<small style="color:inherit;opacity:.85">About 3 minutes: what each part of the page does and when to use it.</small></button>
        <button type="button" data-act="example">Walk through a real example<small>About 5 minutes, live data: compare ${esc(EX.prov)} with the type sequences of ${esc(EX.species)}.</small></button>
        <button type="button" data-act="sec" data-sec="gap">How to read the barcode gap graphs<small>About 4 minutes: what each graph shows, what a gap or an overlap means, and when not to trust one.</small></button>
        ${VIDEO_URL ? `<a href="${VIDEO_URL}" target="_blank" rel="noopener">Watch the walk-through video</a>` : ''}
      </div><p class="mvt-sub">Or learn one section:</p><div class="mvt-secs">${Object.entries(SECTIONS).filter(([k]) => k !== 'gap').map(([k, v]) => `<button type="button" data-act="sec" data-sec="${k}">${esc(v.label)}</button>`).join('')}</div><div class="mvt-meta"><span></span><div class="mvt-btns"><button type="button" data-act="end">No thanks</button></div></div>`;
    place();
    pop.querySelector('[data-act="overview"]').focus({ preventScroll: true });
  }

  function begin(list) { steps = list.filter((s) => !(s.skip && s.skip())); show(0); }

  function end() {
    if (!pop) return;
    clearInterval(poll); poll = null;
    document.removeEventListener('keydown', onKey, true);
    removeEventListener('resize', place); removeEventListener('scroll', place, true);
    shade.remove(); spot.remove(); pop.remove(); shade = spot = pop = null; steps = [];
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function init() {
    const theme = $('#themeBtn');
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = (theme ? theme.className + ' ' : '') + 'mvt-start'; btn.id = 'tourBtn';
    btn.textContent = 'Take the tour'; btn.setAttribute('aria-label', 'Take the guided tour'); btn.addEventListener('click', () => { if (pop) end(); menu(); });
    if (theme && theme.parentNode) theme.parentNode.insertBefore(btn, theme); else document.body.prepend(btn);
    const stepsBar = $("nav.steps");
    if (stepsBar && !seen()) { const h = document.createElement('p'); h.className = 'mvt-hint'; h.innerHTML = 'New here? <button type="button">Take the guided tour or walk through a real example</button>';
      h.querySelector('button').addEventListener('click', () => { if (pop) end(); menu(); }); stepsBar.appendChild(h); }
    for (const [, v] of Object.entries(SECTIONS)) {
      const host = v.where(); if (!host) continue;
      const head = host.matches('details') ? host.querySelector('summary h2') : host.querySelector('h3, h2');
      if (!head) continue;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mvt-sec-btn'; b.textContent = v.btn || 'Tour this section';
      b.setAttribute('aria-label', `Guided tour of ${v.label}`);
      b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (pop) end(); markSeen(); if (!pop) open(); begin(v.steps); });
      head.appendChild(b);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
