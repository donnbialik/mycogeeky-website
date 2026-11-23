/* MycoView copy buttons for identifiers in tool results.
 * Hover an iNaturalist observation number, a scientific or provisional name, a GenBank accession, an iNat username,
 * a UNITE SH code, a BOLD process ID, a GBIF occurrence key, a voucher/catalogue number or a plate well, and a small copy icon
 * appears beside it. One click puts just that identifier on the clipboard (observation links copy the number only).
 * Loaded on every tool by /investigate/toolbar.js. It watches the page, so results a tool adds later get buttons too.
 * The icons hold no text, can't be selected, and are hidden when printing, so they never end up in copied text or prints.
 * To keep an area free of buttons, give it data-nocopy.
 */
(() => {
  'use strict';
  if (window.__mvCopyIds) return; window.__mvCopyIds = true;

  /* ---------- what counts as an identifier ---------- */
  const Q = "(?:'[^'\\n]{1,40}'|‘[^’\\n]{1,40}’|\"[^\"\\n]{1,40}\"|“[^”\\n]{1,40}”)";
  // Genus · Genus sp. · Genus species · Genus cf. species · Genus species var. x · Genus sp. 'x-IN01' · Genus species 'x' (no common names)
  const NAME = new RegExp(`^[A-Z][a-z]{2,}(?: (?:(?:cf|aff)\\. )?[a-z][a-z-]{2,}(?: (?:var|subsp|ssp|f)\\. [a-z][a-z-]{2,})?)?(?: spp?\\.)?(?: (?:(?:sp|cf|aff)\\. )?${Q})?(?: s\\.(?:l|str)\\.)?$`);
  const PROV = /\b[A-Z][a-z]{2,} (?:sp|cf|aff)\. ['‘"“][^'’"”\n]{1,40}['’"”]/g;    // provisional names in running text
  const ACC = /\b(?:[A-Z]{2}_?\d{6,9}|[A-Z]\d{5}|[A-Z]{2}\d{6}|[A-Z]{4,6}\d{6,8})(?:\.\d{1,2})?\b/g;   // GenBank / RefSeq / WGS accessions
  const SH = /\bSH\d{6,10}\.\d{2}FU\b/g;                                         // UNITE species hypotheses
  const BOLD = /\b[A-Z]{3,6}\d{3,6}-\d{2}\b/g;                                    // BOLD process IDs
  const TEXT_RES = [PROV, SH, BOLD, ACC];

  // Table columns whose cells are identifiers, by header text.
  const COLS = [
    [/^(observation|obs\.?|inat(uralist)?( (id|#|obs(ervation)?|no\.?|number))?|observation (id|#|number)|record)$/i, 'obs'],
    [/observer|user ?name|login|^user$|recorded by|identifier$/i, 'username'],
    [/accession|genbank|^acc\.?$/i, 'accession'],
    [/^(sh|unite( sh)?|species hypothesis)/i, 'SH code'],
    [/bold/i, 'process ID'],
    [/gbif/i, 'GBIF key'],
    [/^voucher(?!ed)|catalog|catalogue|herbarium|fungarium|specimen|collection (no|#|number|code)|field (no|#|number)|sample/i, 'voucher number'],
    [/^(plate )?well$|^position$/i, 'well'],
    [/^plate( (no\.?|#|number|id))?$/i, 'plate number'],
    [/species|taxon|scientific|organism|provisional|^name$|current (id|identification|name)|closest|^genus$|identification/i, 'name'],
  ];

  // Areas that never get buttons: forms, page chrome, headings, help, tours, raw sequence views.
  const SKIP = 'input,textarea,select,option,button,label,script,style,svg,code,pre,header,nav,footer,summary,h1,'
    + '.mvtb,.mvt-pop,.mvg-card,[role="tooltip"],#tip,#mv-pop,#toast,.mvcp-w,.mvcp-a,[data-nocopy],[contenteditable=""],[contenteditable="true"],#aln,#matrix';

  const linkId = (a) => {
    let u; try { u = new URL(a.href, location.href); } catch { return null; }
    const h = u.hostname.replace(/^www\./, ''), p = u.pathname, q = u.searchParams;
    let m;
    if (/(^|\.)inaturalist\./.test(h)) {
      if ((m = p.match(/^\/observations\/(\d+)\/?$/))) return { v: m[1], what: 'observation number' };
      if ((m = p.match(/^\/(?:people|users)\/([A-Za-z][\w-]{1,39})\/?$/)) && m[1] !== 'api_token') return { v: m[1], what: 'username' };
      if ((m = p.match(/^\/taxa\/(\d+)/))) { const t = a.textContent.trim(); return NAME.test(t) ? { v: t, what: 'name' } : { v: m[1], what: 'taxon ID' }; }
      if (p === '/observations' && /^[A-Za-z][\w-]{1,39}$/.test(q.get('user_id') || '') && !q.get('taxon_id') && !q.get('taxon_name')) {
        const t = a.textContent.trim(); if (t === q.get('user_id')) return { v: t, what: 'username' };
      }
      return nameOf(a);
    }
    if (/ncbi\.nlm\.nih\.gov$/.test(h) && (m = p.match(/\/(?:nuccore|nucleotide)\/([A-Z]{1,6}_?\d{5,9}(?:\.\d+)?)/))) return { v: m[1], what: 'accession' };
    if (/gbif\.org$/.test(h) && (m = p.match(/^\/occurrence\/(\d+)\/?$/))) return { v: m[1], what: 'GBIF occurrence key' };
    if (/unite\.ut\.ee$/.test(h)) { const t = a.textContent.match(/SH\d{6,10}\.\d{2}FU/); if (t) return { v: t[0], what: 'SH code' }; }
    if (/boldsystems\.org$/.test(h)) { const t = a.textContent.match(/[A-Z]{3,6}\d{3,6}-\d{2}/); if (t) return { v: t[0], what: 'process ID' }; }
    if (/mycomap\.org$/.test(h)) { const t = a.textContent.trim(); if (t && t.length <= 40 && !/\s{2}/.test(t)) return { v: t, what: 'MycoMap ID' }; }
    return nameOf(a);
  };
  // A link whose text is a scientific name (two or more words, or shown in italics) copies the name.
  function nameOf(a) {
    const t = a.textContent.replace(/\s+/g, ' ').trim();
    if (t.length < 4 || t.length > 80 || !NAME.test(t)) return null;
    const italic = a.querySelector('em,i') || a.closest('em,i') || /italic/.test(getComputedStyle(a).fontStyle);
    return (t.includes(' ') || italic) ? { v: t, what: 'name' } : null;
  }

  /* ---------- the button ---------- */
  const ICON = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><rect x="5" y="5" width="9" height="9" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 3.2V2.6A1.6 1.6 0 0 0 9.4 1H2.6A1.6 1.6 0 0 0 1 2.6v6.8A1.6 1.6 0 0 0 2.6 11h.6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const TICK = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const css = `
  .mvcp-w{position:relative}
  .mvcp-a{display:inline;position:relative;user-select:none;-webkit-user-select:none}
  .mvcp{position:relative;left:2px;top:-1px;margin:0 -22px 0 0!important;vertical-align:middle;display:inline-block;text-align:center;line-height:18px;width:22px;height:22px;box-sizing:border-box;padding:0;border:1px solid var(--line,var(--wb-line,#D2DCD7));border-radius:6px;background:var(--surface,var(--wb-surface,#fff));color:var(--accent,var(--wb-accent,#111418));cursor:pointer;opacity:0;pointer-events:none;transition:opacity .12s;z-index:5;box-shadow:0 1px 3px rgba(0,0,0,.12);user-select:none;-webkit-user-select:none}
  .mvcp-w:hover>.mvcp-a>.mvcp,.mvcp-w:hover>.mvcp-a .mvcp,.mvcp:focus-visible,.mvcp.mvcp-done{opacity:1;pointer-events:auto}
  .mvcp svg{display:inline!important;vertical-align:middle!important;width:13px!important;height:13px!important;max-width:none!important;margin:0!important}
  .mvcp:hover{background:var(--accent,var(--wb-accent,#111418));color:var(--accent-ink,#fff);border-color:var(--accent,var(--wb-accent,#111418))}
  .mvcp:focus-visible{outline:2px solid var(--spore,#8A5A2B);outline-offset:1px}
  .mvcp.mvcp-done{background:var(--good,#2E7D4F);color:#fff;border-color:var(--good,#2E7D4F)}
  .mvcp[data-tip]::after{content:attr(data-tip);position:absolute;left:26px;top:50%;transform:translateY(-58%);white-space:nowrap;font:600 11.5px/1.2 var(--f-body,system-ui,sans-serif);color:var(--ink,var(--wb-ink,#15201B));background:var(--surface,var(--wb-surface,#fff));border:1px solid var(--line,var(--wb-line,#D2DCD7));border-radius:5px;padding:2px 6px;pointer-events:none;z-index:6;transform:none;top:2px}
  @media (hover:none){.mvcp{opacity:.5;pointer-events:auto}}
  @media print{.mvcp-a{display:none!important}}`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  const anchor = (value, what) => {
    const s = document.createElement('span'); s.className = 'mvcp-a';
    s.innerHTML = `<button type="button" class="mvcp" tabindex="-1" data-mvcp="${value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}" aria-label="Copy ${what}: ${value.replace(/"/g, '&quot;').replace(/</g, '&lt;')}" title="Copy ${what}">${ICON}</button>`;
    return s;
  };
  const wrap = (node, value, what) => {          // wrap an element or text node so hovering it reveals its button
    const w = document.createElement('span'); w.className = 'mvcp-w';
    node.parentNode.insertBefore(w, node); w.appendChild(node); w.appendChild(anchor(value, what));
    return w;
  };
  const tagCell = (td, value, what) => { td.classList.add('mvcp-w'); td.dataset.mvcpDone = '1'; td.appendChild(anchor(value, what)); };

  /* ---------- finding identifiers ---------- */
  const skipped = (el) => !el || !!el.closest(SKIP);
  const done = (el) => !!el.closest('.mvcp-w,[data-mvcp-done]');

  function scanTables(root) {
    const tables = root.matches && root.matches('table') ? [root] : [...root.querySelectorAll('table')];
    for (const t of tables) {
      if (skipped(t)) continue;
      const head = t.tHead && t.tHead.rows[t.tHead.rows.length - 1]; if (!head) continue;
      const kinds = [...head.cells].map((th) => { const txt = th.textContent.replace(/\s+/g, ' ').trim(); const c = COLS.find(([re]) => re.test(txt)); return c ? c[1] : null; });
      if (!kinds.some(Boolean)) continue;
      // In a column where names are shown in italics, a plain cell is a row label (e.g. “Survey days”), not a name.
      const italicCol = kinds.map((k, c) => k === 'name' && [...t.tBodies].some((b) => [...b.rows].some((r) => r.cells[c] && r.cells[c].querySelector('em,i'))));
      for (const body of t.tBodies) for (const tr of body.rows) {
        let col = 0;
        for (const td of tr.cells) {
          const kind = kinds[col]; col += td.colSpan || 1;
          const ci = col - (td.colSpan || 1);
          if (!kind || td.dataset.mvcpDone || td.querySelector('.mvcp-w,.mvcp-a') || td.querySelector('input,select,textarea,button')) continue;
          let txt = td.textContent.replace(/\s+/g, ' ').trim();
          const lab = txt.match(/^[A-Za-z][^:;]{2,40}: ([^:;]{1,40})$/); if (lab && kind !== 'name') txt = lab[1].trim();   // “Herbarium Catalog Number: KE-F567”
          if (td.innerText.trim().includes('\n')) continue;                     // several lines: let the link and text scans pick out the IDs
          if (kind === 'accession' && !/^[A-Z]{1,6}_?\d{5,9}(\.\d{1,2})?$/.test(txt)) continue;
          if (!txt || txt === '–' || txt === '-' || txt === '?' || txt.length > 80) continue;
          if (kind === 'obs') { const m = txt.match(/^#?(\d{4,12})$/); if (m) tagCell(td, m[1], 'observation number'); }
          else if (kind === 'name') { if (!td.querySelector('em,i') && !italicCol[ci] && NAME.test(txt)) tagCell(td, txt, 'name'); }   // italic names are handled by scanNames
          else if (kind === 'username') { if (/^[A-Za-z][\w-]{1,39}$/.test(txt)) tagCell(td, txt, kind); }
          else if (/\d/.test(txt) && /^[\w.:#\/ -]{2,40}$/.test(txt) && !/^\d+ (of|\/) \d+$/.test(txt) && !/%$|^\d+\.\d+$/.test(txt)) tagCell(td, txt, kind);   // must look like an ID: has a digit; not a count, share or measurement
        }
      }
    }
  }

  function scanLinks(root) {
    for (const a of root.querySelectorAll('a[href]')) {
      if (skipped(a) || done(a)) continue;
      const id = linkId(a); if (id) wrap(a, id.v, id.what);
    }
  }

  function scanNames(root) {
    for (const el of root.querySelectorAll('em,i')) {
      if (skipped(el) || done(el) || el.closest('a')) continue;
      const t = el.textContent.replace(/\s+/g, ' ').trim();
      if (t.length >= 4 && t.length <= 80 && NAME.test(t) && !el.querySelector('em,i')) wrap(el, t, 'name');
    }
  }

  function scanText(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue.length < 6 || !/[A-Z]/.test(n.nodeValue) || skipped(n.parentElement) || done(n.parentElement) || n.parentElement.closest('a,em,i'))
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const s = n.nodeValue, hits = [];
      for (const re of TEXT_RES) { re.lastIndex = 0; let m; while ((m = re.exec(s))) hits.push([m.index, m.index + m[0].length, m[0], re]); }
      if (!hits.length) continue;
      hits.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
      const keep = []; let end = -1; for (const h of hits) if (h[0] >= end) { keep.push(h); end = h[1]; }
      let node = n, offset = 0;
      for (const [a, b, v, re] of keep) {
        const mid = node.splitText(a - offset), rest = mid.splitText(b - a);
        wrap(mid, v, re === PROV ? 'name' : re === SH ? 'SH code' : re === BOLD ? 'process ID' : 'accession');
        node = rest; offset = b;
      }
    }
  }

  function scan(root) {
    if (!root || root.nodeType !== 1 || skipped(root)) return;
    try { scanTables(root); scanLinks(root); scanNames(root); scanText(root); } catch (e) { /* never break a tool */ }
  }

  /* ---------- copying ---------- */
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back */ }
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch { /* ignore */ } ta.remove(); return ok;
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest && e.target.closest('.mvcp'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const ok = await copy(b.dataset.mvcp);
    b.innerHTML = ok ? TICK : ICON; b.classList.toggle('mvcp-done', ok);
    b.dataset.tip = ok ? 'Copied' : 'Copy failed';            // shown with CSS, so it never becomes part of the page's text
    setTimeout(() => { b.innerHTML = ICON; b.classList.remove('mvcp-done'); delete b.dataset.tip; }, 1400);
  }, true);

  /* ---------- watch for results ---------- */
  let pending = new Set(), queued = false;
  const flush = () => { queued = false; const roots = [...pending]; pending = new Set();
    for (const r of roots) if (r.isConnected && !roots.some((o) => o !== r && o.contains(r))) scan(r); };
  const mo = new MutationObserver((list) => {
    for (const m of list) {
      const t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      if (!t || t.closest('.mvcp-a')) continue;
      if ([...m.addedNodes].every((n) => n.nodeType === 1 && (n.classList.contains('mvcp-a') || n.classList.contains('mvcp-w')))) continue;
      pending.add(t.closest('table') || t);
    }
    if (pending.size && !queued) { queued = true; requestAnimationFrame(flush); }
  });
  const start = () => { scan(document.body); mo.observe(document.body, { childList: true, subtree: true, characterData: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
