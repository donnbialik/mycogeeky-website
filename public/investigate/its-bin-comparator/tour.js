/* MycoView guided tour for the ITS Bin Comparator.
 * A website add-on, NOT part of the frozen Comparator (its-bin-comparator.2026-11-06.html): it only reads the page and
 * highlights parts of it; it never changes data, settings or results.
 * First visit: offers the tour once (remembered in this browser only). Any time: the "Guided tour" button in the header.
 * To add a walk-through video later, set VIDEO_URL below; a "Watch the walk-through" link then appears in the tour.
 */
(() => {
  'use strict';
  const VIDEO_URL = '';                       // e.g. 'https://www.youtube.com/watch?v=…' when the video exists
  const SEEN_KEY = 'mycoview-its-comparator-tour-seen-v1';
  const $ = (s) => document.querySelector(s);
  const seen = () => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; } };
  const markSeen = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage unavailable: fine */ } };
  const visible = (el) => !!el && !el.closest('[hidden]') && el.getClientRects().length > 0;
  const cardOf = (sel) => { const el = $(sel); return el ? (el.closest('.card') || el) : null; };

  // Each step: target() returns the element to spotlight (or null for a centred message); skip() hides a step that
  // does not apply right now. Wording describes what the page shows; it makes no claims beyond the tool's own labels.
  const STEPS = [
    { title: 'Welcome to the ITS Bin Comparator',
      body: 'This tool compares ITS barcode sequences between two groups, for example an iNaturalist provisional bin and the described species it might belong to. It shows how different the groups are and how variable each group is inside. It informs your judgement; it does not identify a species.',
      target: () => null },
    { title: 'The workflow in four steps',
      body: 'This bar is the whole method. The numbered cards below follow the same order: add sequences, check them, choose two groups and run, then read the takeaway.',
      target: () => $('nav.steps') },
    { title: '1 · Add sequences',
      body: 'Three ways in: <b>iNaturalist</b> (observations that carry an ITS sequence), <b>GenBank</b> (search by name; tick “Type material only” for sequences from type specimens), or <b>Paste or file</b> for FASTA from UNITE, MyCoMap, BOLD or your own sequencing.',
      target: () => cardOf('#srcTabs') },
    { title: 'Fetching from iNaturalist',
      body: 'Choose what to search by, enter the name, and decide which group the results go into, then press <b>Fetch from iNaturalist</b>. Progress appears under <b>Activity</b>. Each fetch can fill a separate group, so you can build Group A and Group B one after the other.',
      target: () => $('#tab-inat'), skip: () => !visible($('#tab-inat')) },
    { title: 'Practise with the example data',
      body: 'The page starts with <b>synthetic example sequences</b> so you can try every step safely. They are not real observations. Press <b>Clear examples</b> when you are ready to load your own.',
      target: () => $('#exampleBanner'), skip: () => !visible($('#exampleBanner')) },
    { title: '2 · Check your sequences',
      body: 'Every sequence you added is listed here. Edit a group name to move a sequence to another group. Untick a sequence to leave it out of the analysis, and note why. Very short or unusual sequences deserve a second look before you run.',
      target: () => cardOf('#seqFilter') },
    { title: '3 · Choose two groups and run',
      body: 'Pick <b>Group A</b> (e.g. the provisional bin) and <b>Group B</b> (e.g. the sister taxon), then press <b>Run analysis</b>. The <b>Advanced settings</b> (ambiguity codes, indels, cutoff) can stay at their defaults the first time.',
      target: () => cardOf('#groupA') },
    { title: '4 · Read the quick takeaway first',
      body: 'After a run, a plain-language summary appears here. Read it before anything else. <b>Copy summary</b> puts it on your clipboard for notes or an iNaturalist comment.',
      target: () => $('#takeawayCard') },
    { title: 'Detailed results, when you need them',
      body: 'The tabs hold the full <b>Report</b>, every <b>Pair</b>, the <b>Distance matrix</b>, the <b>Alignment</b> (click any base to see which sequences carry it), the <b>Variable sites</b>, and <b>Export and session</b>, where you can save the whole session as a file and load it again later.',
      target: () => $('#resultsTabsCard') },
    { title: 'Extra tools',
      body: 'These fold-out cards answer bigger questions: a <b>Provisional profile</b>, a <b>Genus ITS standard</b>, <b>Find type sequences</b>, and <b>Genus type coverage</b>. Open them when your question goes beyond comparing two groups.',
      target: () => $('#profCard') },
    { title: 'You are ready',
      body: 'Try it now with the example data: choose two groups and press <b>Run analysis</b>. You can replay this tour any time with the <b>Guided tour</b> button at the top of the page.',
      target: () => null },
  ];

  const css = `
  .mvt-shade{position:fixed;inset:0;z-index:9998;background:rgba(5,10,8,.55)}
  .mvt-spot{position:fixed;z-index:9999;border-radius:10px;box-shadow:0 0 0 9999px rgba(5,10,8,.55),0 0 0 3px var(--accent,#1D6B55);pointer-events:none;transition:all .25s ease}
  .mvt-pop{position:fixed;z-index:10000;width:min(400px,calc(100vw - 32px));background:var(--surface,#fff);color:var(--ink,#15201B);border:1px solid var(--line,#D2DCD7);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.28);padding:18px 18px 14px;font:14.5px/1.5 var(--f-body,system-ui,sans-serif)}
  .mvt-pop h2{margin:0 0 8px;font:600 18px/1.25 var(--f-display,system-ui,sans-serif);color:var(--ink,#15201B)}
  .mvt-pop p{margin:0 0 12px}
  .mvt-pop .mvt-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
  .mvt-pop .mvt-count{font:12px var(--f-mono,monospace);color:var(--muted,#56655E)}
  .mvt-pop .mvt-btns{display:flex;gap:8px;flex-wrap:wrap}
  .mvt-pop button{font:600 13.5px var(--f-body,system-ui,sans-serif);padding:8px 14px;border-radius:8px;border:1px solid var(--line,#D2DCD7);background:transparent;color:var(--ink,#15201B);cursor:pointer;min-height:36px}
  .mvt-pop button.mvt-primary{background:var(--accent,#1D6B55);border-color:var(--accent,#1D6B55);color:var(--accent-ink,#fff)}
  .mvt-pop button:focus-visible{outline:3px solid var(--spore,#8A5A2B);outline-offset:2px}
  .mvt-pop a{color:var(--accent,#1D6B55);font-weight:600}
  .mvt-pop .mvt-video{display:inline-block;margin:0 0 12px}
  .mvt-start{margin-left:8px}
  @media (max-width:640px){.mvt-pop{left:16px!important;right:16px;width:auto;bottom:16px;top:auto!important}}
  @media (prefers-reduced-motion:reduce){.mvt-spot{transition:none}}`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  let i = 0, shade = null, spot = null, pop = null, lastFocus = null, active = [];

  function place() {
    if (!pop) return;
    const st = active[i]; const el = st.target && st.target();
    const small = window.matchMedia('(max-width:640px)').matches;
    if (!el || !visible(el)) {
      spot.style.display = 'none'; shade.style.display = 'block';
      if (!small) { pop.style.left = `${Math.max(16, (innerWidth - pop.offsetWidth) / 2)}px`; pop.style.top = `${Math.max(16, (innerHeight - pop.offsetHeight) / 2)}px`; }
      return;
    }
    shade.style.display = 'none'; spot.style.display = 'block';
    const r = el.getBoundingClientRect(), pad = 6;
    Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + 2 * pad}px`, height: `${r.height + 2 * pad}px` });
    if (small) return;                                   // bottom sheet on phones (CSS)
    const pw = pop.offsetWidth, ph = pop.offsetHeight, gap = 14;
    const clampTop = (t) => Math.min(innerHeight - ph - 16, Math.max(16, t));
    const clampLeft = (l) => Math.min(innerWidth - pw - 16, Math.max(16, l));
    let left, top;
    if (r.bottom + gap + ph <= innerHeight - 16) { top = r.bottom + gap; left = clampLeft(r.left); }          // below
    else if (r.top - gap - ph >= 16) { top = r.top - gap - ph; left = clampLeft(r.left); }                     // above
    else if (r.right + gap + pw <= innerWidth - 16) { left = r.right + gap; top = clampTop(r.top); }          // right of a tall target
    else if (r.left - gap - pw >= 16) { left = r.left - gap - pw; top = clampTop(r.top); }                    // left of it
    else { left = clampLeft(r.right - pw - 16); top = clampTop(r.bottom - ph - 16); }                         // inside, bottom corner
    pop.style.left = `${left}px`; pop.style.top = `${top}px`;
  }

  function show(n) {
    i = Math.max(0, Math.min(active.length - 1, n));
    const st = active[i]; const el = st.target && st.target();
    const last = i === active.length - 1;
    pop.innerHTML = `<h2 id="mvt-title">${st.title}</h2><p id="mvt-body">${st.body}</p>`
      + (last && VIDEO_URL ? `<a class="mvt-video" href="${VIDEO_URL}" target="_blank" rel="noopener">Watch the walk-through video →</a>` : '')
      + `<div class="mvt-meta"><span class="mvt-count">${i + 1} of ${active.length}</span><div class="mvt-btns">`
      + (i > 0 ? '<button type="button" data-act="back">Back</button>' : '<button type="button" data-act="end">Skip tour</button>')
      + `<button type="button" class="mvt-primary" data-act="${last ? 'end' : 'next'}">${last ? 'Finish' : 'Next'}</button></div></div>`;
    if (el && visible(el)) {
      const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      setTimeout(place, reduce ? 0 : 380);
    }
    place();
    pop.querySelector('.mvt-primary').focus({ preventScroll: true });
  }

  function onKey(e) {
    if (!pop) return;
    if (e.key === 'Escape') { e.preventDefault(); end(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); if (i < active.length - 1) show(i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (i > 0) show(i - 1); }
    else if (e.key === 'Tab') {                          // keep focus inside the tour card
      const b = [...pop.querySelectorAll('button, a')]; if (!b.length) return;
      const f = b[0], l = b[b.length - 1];
      if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); }
      else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); }
    }
  }

  function start() {
    if (pop) return;
    active = STEPS.filter((s) => !(s.skip && s.skip()));
    lastFocus = document.activeElement;
    shade = document.createElement('div'); shade.className = 'mvt-shade';
    spot = document.createElement('div'); spot.className = 'mvt-spot';
    pop = document.createElement('div'); pop.className = 'mvt-pop';
    pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'true');
    pop.setAttribute('aria-labelledby', 'mvt-title'); pop.setAttribute('aria-describedby', 'mvt-body');
    pop.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'next') show(i + 1); else if (a.dataset.act === 'back') show(i - 1); else end();
    });
    shade.addEventListener('click', end);
    document.body.append(shade, spot, pop);
    document.addEventListener('keydown', onKey, true);
    addEventListener('resize', place); addEventListener('scroll', place, true);
    markSeen(); show(0);
  }

  function end() {
    if (!pop) return;
    document.removeEventListener('keydown', onKey, true);
    removeEventListener('resize', place); removeEventListener('scroll', place, true);
    shade.remove(); spot.remove(); pop.remove(); shade = spot = pop = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function init() {
    // A "Guided tour" button beside the theme switch, styled like the page's own ghost buttons.
    const theme = $('#themeBtn');
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = (theme ? theme.className + ' ' : '') + 'mvt-start'; btn.id = 'tourBtn';
    btn.textContent = 'Guided tour'; btn.addEventListener('click', start);
    if (theme && theme.parentNode) theme.parentNode.insertBefore(btn, theme); else document.body.prepend(btn);
    if (VIDEO_URL) {
      const v = document.createElement('a'); v.href = VIDEO_URL; v.target = '_blank'; v.rel = 'noopener';
      v.className = btn.className; v.textContent = 'Watch video'; btn.after(v);
    }
    if (!seen()) setTimeout(start, 600);               // offer the tour once, after the page has drawn
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
