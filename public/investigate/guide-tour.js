/* MycoView pop-up walkthrough for guide pages and Field Research Toolkit tools.
 * A page lists its steps in <script type="application/json" id="mv-tour">{"key":"…","steps":[…]}</script>.
 * Each step: { "sel": "#css-selector" (optional; no selector = centred card), "title": "…", "body": "… (HTML allowed)" }.
 * Any element with [data-tour-start] starts the tour. Elements with [data-tour-hint] are shown only until the tour
 * has been seen once (remembered in this browser under "mv-tour-seen:<key>"). The tour never opens by itself.
 */
(function () {
  'use strict';
  var cfgEl = document.getElementById('mv-tour');
  if (!cfgEl) return;
  var cfg; try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { return; }
  var steps = (cfg.steps || []).filter(function (s) { return s && s.title; });
  if (!steps.length) return;
  var KEY = 'mv-tour-seen:' + (cfg.key || location.pathname);
  function seen() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function markSeen() { try { localStorage.setItem(KEY, '1'); } catch (e) { /* storage unavailable */ } hints(); }
  function hints() { var s = seen(); [].forEach.call(document.querySelectorAll('[data-tour-hint]'), function (h) { h.hidden = s; }); }

  var css = '.mvg-shade{position:fixed;inset:0;z-index:1000;background:transparent}'
    + '.mvg-spot{position:fixed;z-index:1001;border-radius:10px;pointer-events:none;box-shadow:0 0 0 9999px rgba(8,20,15,.62),0 0 0 3px #d8ed43;transition:all .2s ease}'
    + '.mvg-spot.mvg-none{width:0;height:0;left:50%;top:50%;box-shadow:0 0 0 9999px rgba(8,20,15,.62)}'
    + '.mvg-card{position:fixed;z-index:1002;width:min(390px,calc(100vw - 24px));background:#fffefa;color:#17372e;border-radius:10px;padding:16px 18px 14px;box-shadow:0 12px 40px rgba(0,0,0,.28);font:15px/1.5 "IBM Plex Sans",system-ui,sans-serif}'
    + '.mvg-card h2{font:600 1.15rem/1.25 "Source Serif 4",Georgia,serif;margin:2px 0 6px;color:#17372e}'
    + '.mvg-card p{margin:0 0 8px}.mvg-card a{color:#1c4837}'
    + '.mvg-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px}'
    + '.mvg-count{font:500 11px "IBM Plex Mono",monospace;letter-spacing:.06em;color:#46624d}'
    + '.mvg-btns{display:flex;gap:8px}'
    + '.mvg-card button{font:600 13.5px "IBM Plex Sans",system-ui,sans-serif;padding:7px 14px;border-radius:6px;border:1px solid #c9d4c4;background:transparent;color:#17372e;cursor:pointer}'
    + '.mvg-card button.mvg-primary{background:#173d30;border-color:#173d30;color:#f7f7eb}'
    + '.mvg-card button:focus-visible{outline:3px solid #b08a1e;outline-offset:2px}'
    + '@media (prefers-reduced-motion:reduce){.mvg-spot{transition:none}}';
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  var i = 0, shade, spot, card, lastFocus;
  function target(s) { if (!s.sel) return null; var el = document.querySelector(s.sel); return el && el.getClientRects().length ? el : null; }
  function place() {
    if (!card) return;
    var el = target(steps[i]);
    if (!el) { spot.className = 'mvg-spot mvg-none'; spot.removeAttribute('style'); card.style.left = Math.max(12, (innerWidth - card.offsetWidth) / 2) + 'px'; card.style.top = Math.max(12, (innerHeight - card.offsetHeight) / 2) + 'px'; return; }
    var r = el.getBoundingClientRect(), pad = 8;
    spot.className = 'mvg-spot';
    spot.style.left = (r.left - pad) + 'px'; spot.style.top = (r.top - pad) + 'px';
    spot.style.width = (r.width + pad * 2) + 'px'; spot.style.height = (r.height + pad * 2) + 'px';
    var ch = card.offsetHeight, cw = card.offsetWidth, top = r.bottom + pad + 12;
    if (top + ch > innerHeight - 12) top = r.top - pad - 12 - ch;
    if (top < 12) top = Math.max(12, innerHeight - ch - 12);
    card.style.top = top + 'px';
    card.style.left = Math.min(Math.max(12, r.left), innerWidth - cw - 12) + 'px';
  }
  function show(n) {
    i = Math.max(0, Math.min(steps.length - 1, n));
    var s = steps[i], last = i === steps.length - 1;
    card.innerHTML = '<h2 id="mvg-title">' + s.title + '</h2><div id="mvg-body">' + (s.body || '') + '</div>'
      + '<div class="mvg-meta"><span class="mvg-count">' + (i + 1) + ' of ' + steps.length + '</span><div class="mvg-btns">'
      + (i > 0 ? '<button type="button" data-act="back">Back</button>' : '<button type="button" data-act="end">Close</button>')
      + '<button type="button" class="mvg-primary" data-act="' + (last ? 'end' : 'next') + '">' + (last ? 'Finish' : 'Next') + '</button></div></div>';
    var el = target(s);
    if (el) el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    setTimeout(place, 260); place();
    var b = card.querySelector('.mvg-primary'); if (b) b.focus();
  }
  function end() {
    markSeen();
    [shade, spot, card].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
    shade = spot = card = null;
    removeEventListener('resize', place); removeEventListener('scroll', place, true); document.removeEventListener('keydown', onKey, true);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); end(); }
    else if (e.key === 'ArrowRight' && i < steps.length - 1) { e.preventDefault(); show(i + 1); }
    else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); show(i - 1); }
    else if (e.key === 'Tab' && card) { var f = card.querySelectorAll('button,a[href]'); if (!f.length) return; var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
  }
  function start() {
    if (card) end();
    lastFocus = document.activeElement;
    shade = document.createElement('div'); shade.className = 'mvg-shade'; shade.addEventListener('click', end);
    spot = document.createElement('div'); spot.className = 'mvg-spot';
    card = document.createElement('div'); card.className = 'mvg-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'mvg-title'); card.setAttribute('aria-describedby', 'mvg-body');
    card.addEventListener('click', function (e) { var b = e.target.closest('button[data-act]'); if (!b) return; var a = b.getAttribute('data-act'); if (a === 'next') show(i + 1); else if (a === 'back') show(i - 1); else end(); });
    document.body.appendChild(shade); document.body.appendChild(spot); document.body.appendChild(card);
    addEventListener('resize', place); addEventListener('scroll', place, true); document.addEventListener('keydown', onKey, true);
    show(0);
  }
  [].forEach.call(document.querySelectorAll('[data-tour-start]'), function (b) { b.addEventListener('click', function (e) { e.preventDefault(); start(); }); });
  hints();
})();
