/* MycoView guided tours for the ITS Bin Comparator.
 * A website add-on, NOT part of the frozen Comparator (its-bin-comparator.2026-11-06.html). The overview tour only
 * reads the page (and switches the visible results tab). The real-example walkthrough can fill form fields and choose
 * groups when the user presses "Fill this in for me"; the user always presses Fetch / Run themselves, and the tour waits
 * until that work has finished. Nothing is sent anywhere by the tour itself.
 * First visit: offers the tours once (remembered in this browser only). Any time: the "Guided tour" button.
 * To add a walk-through video later, set VIDEO_URL below; a "Watch the walk-through" link then appears.
 */
(() => {
  'use strict';
  const VIDEO_URL = '';                       // e.g. 'https://www.youtube.com/watch?v=…' when the video exists
  const SEEN_KEY = 'mycoview-its-comparator-tour-seen-v1';
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
      body: 'After a run, a plain-language summary of how the two groups differ appears here. Read it before anything else. <b>Copy summary</b> puts it on your clipboard for notes or an iNaturalist comment.' },
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
      body: 'Try it with the example data: choose two groups and press <b>Run analysis</b>. Or take the <b>real example</b> walkthrough, which compares an iNaturalist provisional with type sequences from GenBank, step by step. Replay either from the <b>Guided tour</b> button.',
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

  /* ---------------- tour engine ---------------- */
  const css = `
  .mvt-shade{position:fixed;inset:0;z-index:9998;background:rgba(5,10,8,.55)}
  .mvt-spot{position:fixed;z-index:9999;border-radius:10px;box-shadow:0 0 0 9999px rgba(5,10,8,.55),0 0 0 3px var(--accent,#1D6B55);pointer-events:none;transition:all .25s ease}
  .mvt-spot.mvt-live{box-shadow:0 0 0 9999px rgba(5,10,8,.35),0 0 0 3px var(--accent,#1D6B55)}
  .mvt-pop{position:fixed;z-index:10000;width:min(420px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;background:var(--surface,#fff);color:var(--ink,#15201B);border:1px solid var(--line,#D2DCD7);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.28);padding:18px 18px 14px;font:14.5px/1.5 var(--f-body,system-ui,sans-serif)}
  .mvt-pop h2{margin:0 0 8px;font:600 18px/1.25 var(--f-display,system-ui,sans-serif);color:var(--ink,#15201B)}
  .mvt-pop p{margin:0 0 12px}
  .mvt-pop .mvt-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
  .mvt-pop .mvt-count{font:12px var(--f-mono,monospace);color:var(--muted,#56655E)}
  .mvt-pop .mvt-btns{display:flex;gap:8px;flex-wrap:wrap}
  .mvt-pop .mvt-choices{display:grid;gap:8px;margin:4px 0 12px}
  .mvt-pop .mvt-choices button{text-align:left;padding:10px 14px}
  .mvt-pop .mvt-choices small{display:block;font-weight:400;color:var(--muted,#56655E)}
  .mvt-pop button{font:600 13.5px var(--f-body,system-ui,sans-serif);padding:8px 14px;border-radius:8px;border:1px solid var(--line,#D2DCD7);background:transparent;color:var(--ink,#15201B);cursor:pointer;min-height:36px}
  .mvt-pop button.mvt-primary{background:var(--accent,#1D6B55);border-color:var(--accent,#1D6B55);color:var(--accent-ink,#fff)}
  .mvt-pop button:disabled{opacity:.5;cursor:default}
  .mvt-pop button:focus-visible{outline:3px solid var(--spore,#8A5A2B);outline-offset:2px}
  .mvt-pop .mvt-wait{display:block;margin:0 0 12px;font-size:13px;color:var(--warn,#A86E14)}
  .mvt-pop .mvt-done{display:block;margin:0 0 12px;font-size:13px;color:var(--good,#2E7D4F);font-weight:600}
  .mvt-pop .mvt-fill{margin:0 0 12px}
  .mvt-pop a{color:var(--accent,#1D6B55);font-weight:600}
  .mvt-pop .mvt-video{display:inline-block;margin:0 0 12px}
  .mvt-start{margin-left:8px}
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
    pop.innerHTML = `<h2 id="mvt-title">${st.title}</h2><p id="mvt-body">${st.body}</p>`
      + (st.fill && waiting !== false || st.fill && !st.wait ? `<button type="button" class="mvt-fill" data-act="fill">${st.fillLabel || 'Fill this in for me'}</button>` : '')
      + (st.wait ? (waiting ? `<span class="mvt-wait" role="status">${st.waitText || 'Waiting…'}</span>` : '<span class="mvt-done" role="status">✓ Done. Press Next.</span>') : '')
      + (last && VIDEO_URL ? `<a class="mvt-video" href="${VIDEO_URL}" target="_blank" rel="noopener">Watch the walk-through video →</a>` : '')
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
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
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
    if (e.key === 'Escape') { e.preventDefault(); end(); }
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
      if (act === 'next') show(i + 1); else if (act === 'back') show(i - 1); else if (act === 'end') end();
      else if (act === 'fill') { try { steps[i].fill(); } catch { /* ignore */ } setTimeout(() => render(), 50); }
      else if (act === 'overview') begin(OVERVIEW); else if (act === 'example') begin(EXAMPLE);
    });
    shade.addEventListener('click', end);
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
        ${VIDEO_URL ? `<a href="${VIDEO_URL}" target="_blank" rel="noopener">Watch the walk-through video →</a>` : ''}
      </div><div class="mvt-meta"><span></span><div class="mvt-btns"><button type="button" data-act="end">No thanks</button></div></div>`;
    place(); markSeen();
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
    btn.textContent = 'Guided tour'; btn.addEventListener('click', () => { if (pop) end(); menu(); });
    if (theme && theme.parentNode) theme.parentNode.insertBefore(btn, theme); else document.body.prepend(btn);
    if (!seen()) setTimeout(menu, 600);                    // offer the tours once, after the page has drawn
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
