// Client code of the Explorer records page (a data-free shell; evidence comes only from the authenticated API).
import { api, apiText, esc, $, pill, outcome, whoami, releaseStrip, latestRelease, showError } from './common.js';
(async () => {
  const [me, rel] = await Promise.all([api('me'), latestRelease()]);
  whoami(me); releaseStrip(rel);
  const recs = JSON.parse(await apiText(`releases/${encodeURIComponent(rel.id)}/records.json`));
  const opts = (id, vals) => $(id).insertAdjacentHTML('beforeend', [...new Set(vals)].filter(Boolean).sort().map(v => `<option>${esc(v)}</option>`).join(''));
  opts('f-set', recs.map(r => r.set)); opts('f-name', recs.map(r => r.name_as_applied)); opts('f-pri', recs.map(r => r.review_priority));
  const cls = r => [outcome(r.crosscheck?.ITS1_start).cls, outcome(r.crosscheck?.ITS2_end).cls];
  const hay = r => [r.accession, r.name_as_applied, r.collection, r.set, ...(r.flags || []), ...Object.values(r.provenance || {})].join(' ').toLowerCase();
  const draw = () => {
    const q = $('q').value.trim().toLowerCase(), s = $('f-set').value, n = $('f-name').value, c = $('f-check').value, p = $('f-pri').value;
    const out = recs.filter(r => (!q || hay(r).includes(q)) && (!s || r.set === s) && (!n || r.name_as_applied === n) && (!p || r.review_priority === p)
      && (!c || (c === 'agree' ? cls(r).every(x => x === 'agree') : cls(r).includes(c))));
    $('count').textContent = `${out.length} of ${recs.length} records`;
    $('rows').innerHTML = out.slice(0, 400).map(r => `<tr><td><a href="/explorer/record/?release=${encodeURIComponent(rel.id)}&id=${encodeURIComponent(r.accession)}">${esc(r.accession)}</a></td>
      <td><em>${esc(r.name_as_applied)}</em></td><td>${esc(r.set)}</td><td>${esc(r.primary_regions || '—')}</td><td>${esc(r.reference_anchored_regions || '—')}</td>
      <td>${pill(r.crosscheck?.ITS1_start)}</td><td>${pill(r.crosscheck?.ITS2_end)}</td><td>${esc(r.review_priority || '')}</td>
      <td>${(r.flags || []).map(f => `<span class="pill flag">${esc(f)}</span>`).join(' ')}</td></tr>`).join('')
      + (out.length > 400 ? `<tr><td colspan="9" class="muted">Showing the first 400. Narrow the filters to see the rest.</td></tr>` : '');
  };
  for (const id of ['q', 'f-set', 'f-name', 'f-check', 'f-pri']) $(id).addEventListener('input', draw);
  draw();
})().catch(showError);
