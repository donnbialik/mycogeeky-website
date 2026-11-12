// Client code of the Explorer admin page (a data-free shell; evidence comes only from the authenticated API).
import { api, apiText, post, esc, $, whoami, releaseStrip, showError } from './common.js';
import { validateManifest, validateEvidence, sha256 } from '../../../explorer/contract/release.js';
const say = (id, cls, html) => { $(id).className = 'xp-msg ' + cls; $(id).innerHTML = html; };
const list = xs => '<ul>' + xs.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>';
let files = null;
async function status() {
  const s = await api('admin/status');
  $('mig').innerHTML = s.migrations.map(m => `<p>${esc(m.id)}: <strong>${m.applied ? (m.changed_since_applied ? 'CHANGED AFTER BEING APPLIED' : 'applied') : 'not applied'}</strong></p>`).join('')
    + `<p class="muted small">Releases: ${s.releases.length ? s.releases.map(r => esc(r.id)).join(', ') : 'none yet'}</p>`;
  $('migrate').hidden = s.migrations.every(m => m.applied);
  return s;
}
async function loadAll() {
  const s = await status();
  if (!s.migrations.every(m => m.applied)) { $('xp-release').innerHTML = '<strong>Set-up needed.</strong> Apply the database schema, then import a release.'; return; }
  const me = await api('me'); whoami(me);
  const { releases } = await api('releases'); if (releases.length) releaseStrip(releases[releases.length - 1]);
  else $('xp-release').innerHTML = '<strong>No release imported yet.</strong> Import the evidence release below.';
  const { reviewers } = await api('reviewers');
  $('revs').innerHTML = reviewers.map(r => `<tr><td>${esc(r.display_name)}<div class="muted small">${esc(r.email)}</div></td><td>${esc(r.role)}</td>
    <td><input type="checkbox" data-id="${r.id}" data-k="formal" ${r.formal_reviews_enabled ? 'checked' : ''} aria-label="Formal reviews for ${esc(r.display_name)}" /></td>
    <td>${r.role === 'owner' ? 'yes' : `<input type="checkbox" data-id="${r.id}" data-k="active" ${r.active ? 'checked' : ''} aria-label="Account active for ${esc(r.display_name)}" />`}</td></tr>`).join('');
  const { events } = await api('audit');
  $('audit').innerHTML = events.slice(0, 100).map(e => `<tr><td class="small">${esc(e.at)}</td><td class="small">${esc(e.actor)}</td><td>${esc(e.action)}</td><td class="small">${esc(e.object)}</td></tr>`).join('');
}
$('migrate').addEventListener('click', async () => {
  try { const r = await post('admin/migrate', {}); say('migmsg', 'ok', `Applied: ${esc(r.applied.join(', ') || 'nothing new')}`); await loadAll(); }
  catch (e) { say('migmsg', 'bad', esc(e.message)); }
});
$('check').addEventListener('click', async () => {
  $('import').disabled = true; files = null;
  try {
    const read = id => { const f = $(id).files[0]; if (!f) throw new Error('choose all three files'); return f.text(); };
    const [manifest_text, records_text, cases_text] = await Promise.all([read('f-manifest'), read('f-records'), read('f-cases')]);
    const m = JSON.parse(manifest_text); const errs = validateManifest(m);
    if (!errs.length) {
      for (const [n, t] of [['records.json', records_text], ['cases.json', cases_text]]) { const h = await sha256(t); if (h !== m.files_sha256[n]) errs.push(`${n}: SHA-256 ${h.slice(0, 12)}… does not match the manifest`); }
      errs.push(...validateEvidence(m, JSON.parse(records_text), JSON.parse(cases_text)));
    }
    if (errs.length) return say('impmsg', 'bad', '<strong>These files cannot be imported.</strong>' + list(errs));
    files = { manifest_text, records_text, cases_text };
    say('impmsg', 'ok', `<strong>${esc(m.release)}</strong>: ${m.records} records, ${m.cases} cases; contract, counts and SHA-256 hashes check out. Human review status: ${esc(m.human_review.label)}.`);
    $('import').disabled = false;
  } catch (e) { say('impmsg', 'bad', esc(e.message)); }
});
$('import').addEventListener('click', async () => {
  try { $('import').disabled = true; const r = await post('admin/releases', files); say('impmsg', 'ok', `Imported <strong>${esc(r.release)}</strong> (${r.cases} review cases).`); await loadAll(); }
  catch (e) { say('impmsg', 'bad', `<strong>${esc(e.message)}</strong>` + (Array.isArray(e.detail) ? list(e.detail) : '')); }
});
$('r-add').addEventListener('click', async () => {
  try { await post('reviewers', { email: $('r-email').value, display_name: $('r-name').value, role: $('r-role').value }); say('rmsg', 'ok', 'Added.'); await loadAll(); }
  catch (e) { say('rmsg', 'bad', esc(e.message)); }
});
$('revs').addEventListener('change', async ev => {
  const t = ev.target; if (!t.dataset.id) return;
  try { await post(`reviewers/${t.dataset.id}/${t.dataset.k}`, { enabled: t.checked }); await loadAll(); } catch (e) { say('rmsg', 'bad', esc(e.message)); t.checked = !t.checked; }
});
$('selftest').addEventListener('click', async () => {
  const out = []; const ok = (name, pass, note = '') => out.push(`<li>${pass ? '✓' : '✗'} ${esc(name)}${note ? ` <span class="muted small">${esc(note)}</span>` : ''}</li>`);
  try {
    const anon = await fetch('/api/explorer/releases', { credentials: 'omit', redirect: 'manual' });
    ok('An unauthenticated request to the API is refused by Cloudflare Access or the API', anon.status !== 200, `status ${anon.status || anon.type}`);
    const anonPage = await fetch('/explorer/', { credentials: 'omit', redirect: 'manual' });
    ok('An unauthenticated request to an Explorer page is refused by Cloudflare Access', anonPage.status !== 200, `status ${anonPage.status || anonPage.type}`);
    const forged = await fetch('/api/explorer/me', { credentials: 'omit', headers: { 'Cf-Access-Jwt-Assertion': 'eyJhbGciOiJSUzI1NiJ9.e30.x' }, redirect: 'manual' });
    ok('A forged identity header is refused', forged.status !== 200, `status ${forged.status || forged.type}`);
    const me = await api('me'); ok('Your sign-in is verified server-side and you are the owner', me.role === 'owner');
    const s = await api('admin/status'); ok('All database migrations applied and unchanged', s.migrations.every(m => m.applied && !m.changed_since_applied));
    const { releases } = await api('releases'); ok('At least one evidence release is imported', releases.length > 0);
    for (const r of releases) for (const n of ['records.json', 'cases.json']) {
      const t = await apiText(`releases/${encodeURIComponent(r.id)}/${n}`); const h = await sha256(t);
      ok(`${r.id}/${n} matches its pinned SHA-256`, h === r.manifest.files_sha256[n], h.slice(0, 12) + '…');
    }
    for (const r of releases) ok(`${r.id} declares no human validation`, r.manifest.human_review.status === 'none' || r.manifest.human_review.status === 'partial', r.manifest.human_review.label);
    const xo = await fetch('/api/explorer/reviews', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' });
    ok('A non-JSON (cross-site style) write is refused', xo.status === 415 || xo.status === 403, `status ${xo.status}`);
    const st = await fetch('/data/laetiporus-v1/records.json', { credentials: 'omit', redirect: 'manual' });
    ok('Evidence is not published as a static file', st.type === 'opaqueredirect' || st.status === 404 || !(st.headers.get('content-type') || '').includes('json'), `status ${st.status || st.type}`);
    say('stmsg', out.some(x => x.includes('✗')) ? 'bad' : 'ok', '<ul>' + out.join('') + '</ul>');
  } catch (e) { say('stmsg', 'bad', '<ul>' + out.join('') + `</ul>Stopped: ${esc(e.message)}`); }
});
loadAll().catch(showError);
