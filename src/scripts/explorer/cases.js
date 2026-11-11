// Client code of the Explorer cases page (a data-free shell; evidence comes only from the authenticated API).
import { api, apiText, esc, $, whoami, releaseStrip, latestRelease, showError } from './common.js';
(async () => {
  const [me, rel, list] = await Promise.all([api('me'), latestRelease(), api('cases')]);
  whoami(me); releaseStrip(rel);
  const recs = Object.fromEntries(JSON.parse(await apiText(`releases/${encodeURIComponent(rel.id)}/records.json`)).map(r => [r.accession, r]));
  $('rows').innerHTML = list.cases.map(c => `<tr><td><a href="/explorer/case/?id=${encodeURIComponent(c.id)}">${esc(c.id)}</a><div class="muted small">${esc(c.release_id)}</div></td>
    <td>${esc(c.priority)}</td><td><em>${esc((recs[c.accession] || {}).name_as_applied || '')}</em></td><td><span class="pill">${esc(c.adjudication)}</span></td>
    <td>${c.my_current_review ? `${esc(c.my_current_review)} <span class="pill ${esc(c.my_mode)}">${esc(c.my_mode)}</span>` : '<span class="muted">none</span>'}</td></tr>`).join('') || '<tr><td colspan="5">No cases.</td></tr>';
})().catch(showError);
