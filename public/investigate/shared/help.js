/* MycoView help popups. Any element <button class="mv-i" data-help="key"> shows the text for that key
   on hover (mouse), keyboard focus or tap, and closes on Esc, a second tap or a tap elsewhere.
   Usage: MVHelp.init({ key: 'HTML text', ... }); MVHelp.tip('key', 'Label') returns the button HTML for templates. */
(function (g) {
  'use strict';
  let dict = {}, pop, cur = null, pinned = false, hideT = 0;
  const css = `
.mv-i{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;margin:0 0 0 4px;padding:0;border:1px solid currentColor;border-radius:50%;
  background:transparent;color:var(--muted,#667);font:600 10.5px/1 Georgia,'Times New Roman',serif;font-style:italic;cursor:help;vertical-align:1px;opacity:.85;flex:none}
.mv-i:hover,.mv-i:focus-visible,.mv-i[aria-expanded=true]{opacity:1;color:var(--accent,#1f5f4a);outline:none;box-shadow:0 0 0 2px color-mix(in srgb,var(--accent,#1f5f4a) 25%,transparent)}
th .mv-i{margin-left:3px}
#mv-pop{position:fixed;z-index:9999;max-width:min(320px,calc(100vw - 16px));padding:9px 11px;border:1px solid var(--line,#ccd);border-radius:7px;
  background:var(--surface,#fff);color:var(--ink,#222);font:400 13px/1.45 var(--f-body,system-ui,sans-serif);text-align:left;text-transform:none;letter-spacing:normal;white-space:normal;
  box-shadow:0 6px 24px rgba(0,0,0,.16);pointer-events:auto}
#mv-pop[hidden]{display:none}
#mv-pop b{font-weight:600}#mv-pop .eg{display:block;margin-top:5px;color:var(--muted,#667);font-size:12.5px}`;
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function tip(key, label) { return `<button type="button" class="mv-i" data-help="${esc(key)}" aria-label="What does ${esc(label || key)} mean?" aria-expanded="false" aria-controls="mv-pop">i</button>`; }
  function place(btn) {
    const r = btn.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
    pop.style.left = '0px'; pop.style.top = '0px'; const w = pop.offsetWidth, h = pop.offsetHeight;
    let x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8), y = r.bottom + 6;
    if (y + h > vh - 8 && r.top - h - 6 > 8) y = r.top - h - 6;
    pop.style.left = x + 'px'; pop.style.top = Math.max(8, y) + 'px';
  }
  function show(btn, pin) {
    const html = dict[btn.dataset.help]; if (!html) return;
    clearTimeout(hideT); if (cur && cur !== btn) cur.setAttribute('aria-expanded', 'false');
    cur = btn; pinned = !!pin; pop.innerHTML = html; pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-describedby', 'mv-pop'); place(btn);
  }
  function hide() { if (!cur) return; cur.setAttribute('aria-expanded', 'false'); cur.removeAttribute('aria-describedby'); cur = null; pinned = false; pop.hidden = true; }
  function init(d) {
    Object.assign(dict, d || {}); if (pop) return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    pop = document.createElement('div'); pop.id = 'mv-pop'; pop.setAttribute('role', 'tooltip'); pop.hidden = true; document.body.appendChild(pop);
    const isTip = e => e.target.closest && e.target.closest('.mv-i');
    // Capture phase, so a help button inside a sortable heading or a label doesn't also sort or focus.
    document.addEventListener('click', e => { const b = isTip(e);
      if (b) { e.preventDefault(); e.stopPropagation(); if (cur === b && pinned) hide(); else show(b, true); return; }
      if (cur && !pop.contains(e.target)) hide(); }, true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && cur) { const b = cur; hide(); b.focus(); } else if (isTip(e) && (e.key === 'Enter' || e.key === ' ')) e.stopPropagation(); }, true);
    document.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const b = isTip(e); if (b && !pinned) show(b, false); else if (cur && !pinned && pop.contains(e.target)) clearTimeout(hideT); });
    document.addEventListener('pointerout', e => { if (e.pointerType !== 'mouse' || pinned || !cur) return; const to = e.relatedTarget;
      if (to && (to === cur || cur.contains(to) || pop.contains(to))) return; hideT = setTimeout(hide, 120); });
    document.addEventListener('focusin', e => { const b = isTip(e); if (b) { if (cur !== b) show(b, false); } else if (cur && !pinned && !pop.contains(e.target)) hide(); });
    addEventListener('scroll', () => { if (cur) { if (pinned) place(cur); else hide(); } }, true);
    addEventListener('resize', () => cur && place(cur));
  }
  g.MVHelp = { init, tip };
})(globalThis);
