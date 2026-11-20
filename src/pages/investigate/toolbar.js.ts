// Builds /investigate/toolbar.js: the slim MycoView bar at the top of every standalone tool
// (public/investigate/<tool>/index.html). It is generated from src/data/tools.ts, so the
// "Step 3 of 8" position and the previous/next links always match the paths on the Toolbox.
// Without JavaScript the tools keep their own "← MycoView Research Workbench" link.
import type { APIRoute } from 'astro';
import { researchPaths, tools } from '../../data/tools';

export const GET: APIRoute = () => {
  const toolData = tools
    .filter((t) => t.lifecycle !== 'archived')
    .map((t) => ({ id: t.id, name: t.name, href: t.href || '' }));
  const pathData = researchPaths.map((p) => ({
    id: p.id,
    audience: p.audience,
    steps: p.steps.map((s) => ({ toolId: s.toolId, label: s.label, href: s.href || '' })),
  }));
  const js = `/* MycoView tool bar. Generated from src/data/tools.ts at build time; do not edit by hand. */
(function () {
  'use strict';
  var TOOLS = ${JSON.stringify(toolData)};
  var PATHS = ${JSON.stringify(pathData)};
  // Links to iNaturalist (observations, taxa, people) open in a new tab, so a report's results aren't lost.
  // Delegated, so it also covers links the tools add to the page after it loads.
  if (!window.__mvInatTabs) { window.__mvInatTabs = true;
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null; if (!a || a.target) return;
      if (!/^https?:\\/\\/([a-z0-9-]+\\.)*inaturalist\\.(org|ca|nz|[a-z]{2,3}(\\.[a-z]{2})?)\\//i.test(a.href)) return;
      a.target = '_blank'; a.rel = 'noopener';
    }, true);
  }
  // Copy buttons beside identifiers (observation numbers, names, accessions…) in every tool's results.
  if (!window.__mvCopyIds && !document.querySelector('script[src$="/shared/copy-ids.js"]')) {
    var cp = document.createElement('script'); cp.src = '/investigate/shared/copy-ids.js'; cp.defer = true; document.head.appendChild(cp);
  }
  if (document.querySelector('.mvtb')) return;
  var here = location.pathname.replace(/index\\.html$/, '');
  var tool = TOOLS.filter(function (t) { return t.href && here === t.href; })[0];
  if (!tool) return;
  var byId = {}; TOOLS.forEach(function (t) { byId[t.id] = t; });
  var onPaths = PATHS.filter(function (p) { return p.steps.some(function (s) { return s.toolId === tool.id; }); });
  var saved = null; try { saved = localStorage.getItem('mv.path'); } catch (e) { /* storage unavailable */ }
  var path = onPaths.filter(function (p) { return p.id === saved; })[0] || onPaths[0] || null;

  var css = '.mvtb{background:#10382c;color:#e1e9d8;font:500 13px/1.3 "IBM Plex Sans",system-ui,sans-serif;position:relative;z-index:50}'
    + '.mvtb-in{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;padding:8px max(16px,env(safe-area-inset-left)) 8px max(16px,env(safe-area-inset-right))}'
    + '.mvtb a{color:#f4f3db;text-decoration:none}.mvtb a:hover{text-decoration:underline;text-underline-offset:3px}'
    + '.mvtb a:focus-visible,.mvtb button:focus-visible{outline:2px solid #d8ed43;outline-offset:2px}'
    + '.mvtb-home{display:flex;align-items:center;gap:7px;font-weight:600}.mvtb-mark{color:#d8ed43;font-size:15px;line-height:1}'
    + '.mvtb-sep{color:#8fae97}.mvtb-crumbs{display:flex;align-items:center;gap:8px}'
    + '.mvtb-path{display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;margin-left:auto}'
    + '.mvtb-step{color:#c5dba4;font:500 11px/1.3 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase}'
    + '.mvtb-step b{color:#f4f3db;font-weight:600}.mvtb-nav{display:flex;gap:14px}.mvtb-planned{color:#9fb5a5}'
    + '.mvtb button{font:inherit;color:#c5dba4;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:3px}'
    + '.has-mvtb .site-home{display:none!important}'
    + '@media(max-width:700px){.mvtb-path{margin-left:0;width:100%}.mvtb-nav{width:100%;justify-content:space-between}}';
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function stepLink(step, dir) {
    var t = byId[step.toolId], href = step.href || (t && t.href) || '';
    if (href && href.charAt(0) === '#') href = '/investigate/' + href;
    var text = dir < 0 ? '← ' + esc(step.label) : esc(step.label) + ' →';
    return href ? '<a href="' + esc(href) + '">' + text + '</a>' : '<span class="mvtb-planned">' + text + ' (planned)</span>';
  }
  function render() {
    var html = '<div class="mvtb-in"><nav class="mvtb-crumbs" aria-label="MycoView"><a class="mvtb-home" href="/"><span class="mvtb-mark" aria-hidden="true">◉</span>MycoView</a>'
      + '<span class="mvtb-sep" aria-hidden="true">/</span><a href="/investigate/#workbench">Toolbox</a></nav>';
    if (path) {
      // A tool can cover several consecutive steps (e.g. Habitat Profiler on the forager path).
      var i = -1; path.steps.some(function (s, k) { if (s.toolId === tool.id) { i = k; return true; } return false; });
      var j = i; while (path.steps[j + 1] && path.steps[j + 1].toolId === tool.id) j++;
      var prev = path.steps[i - 1], next = path.steps[j + 1];
      var labels = path.steps.slice(i, j + 1).map(function (s) { return esc(s.label); }).join(' · ');
      var where = i === j ? 'Step <b>' + (i + 1) + '</b>' : 'Steps <b>' + (i + 1) + '–' + (j + 1) + '</b>';
      var other = onPaths.filter(function (p) { return p.id !== path.id; })[0];
      html += '<div class="mvtb-path"><span class="mvtb-step"><a href="/investigate/#path-' + esc(path.id) + '">' + esc(path.audience) + '</a> · ' + where + ' of ' + path.steps.length + ': ' + labels + '</span>'
        + (other ? '<button type="button" data-mvtb-path="' + esc(other.id) + '">Switch to ' + esc(other.audience.toLowerCase()) + '</button>' : '')
        + '<nav class="mvtb-nav" aria-label="Suggested path">' + (prev ? stepLink(prev, -1) : '') + (next ? stepLink(next, 1) : '') + '</nav></div>';
    }
    bar.innerHTML = html + '</div>';
    var sw = bar.querySelector('[data-mvtb-path]');
    if (sw) sw.addEventListener('click', function () {
      var id = sw.getAttribute('data-mvtb-path'); path = onPaths.filter(function (p) { return p.id === id; })[0];
      try { localStorage.setItem('mv.path', id); } catch (e) { /* storage unavailable */ }
      render(); var b = bar.querySelector('[data-mvtb-path]'); if (b) b.focus();
    });
  }
  var bar = document.createElement('div'); bar.className = 'mvtb';
  render();
  document.body.insertBefore(bar, document.body.firstChild);
  document.documentElement.classList.add('has-mvtb');
})();
`;
  return new Response(js, { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
};
