// Client code of the Explorer admin page (a data-free shell; evidence comes only from the authenticated API).
import { api, apiText, post, esc, $, whoami, releaseStrip, showError } from './common.js';
import { validateManifest, validateEvidence, sha256 } from '../../../explorer/contract/release.js';
import { validateSupplement } from '../../../explorer/contract/supplement.js';
import { validateQuestionSet } from '../../../explorer/contract/questions.js';
import { validateWorkingSet } from '../../../explorer/contract/workingset.js';
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
  if (!s.migrations.every(m => m.applied)) { $('xp-release').innerHTML = s.releases.length ? '<strong>Database update needed.</strong> Apply the database schema (section 1) to finish setting up the new features.' : '<strong>Set-up needed.</strong> Apply the database schema, then import a release.'; return; }
  const me = await api('me'); whoami(me);
  const { releases } = await api('releases'); if (releases.length) releaseStrip(releases[releases.length - 1]);
  else $('xp-release').innerHTML = '<strong>No release imported yet.</strong> Import the evidence release below.';
  const { reviewers } = await api('reviewers');
  $('revs').innerHTML = reviewers.map(r => `<tr><td>${esc(r.display_name)}<div class="muted small">${esc(r.email)}</div></td><td>${esc(r.role)}</td>
    <td><input type="checkbox" data-id="${r.id}" data-k="formal" ${r.formal_reviews_enabled ? 'checked' : ''} aria-label="Formal reviews for ${esc(r.display_name)}" /></td>
    <td>${r.role === 'owner' ? 'yes' : `<input type="checkbox" data-id="${r.id}" data-k="active" ${r.active ? 'checked' : ''} aria-label="Account active for ${esc(r.display_name)}" />`}</td>
    <td>${r.role === 'owner' ? 'all' : `<input type="text" data-genera="${r.id}" value="${esc((r.genera || []).join(', '))}" placeholder="all genera" aria-label="Genera ${esc(r.display_name)} may answer for" />`}</td></tr>`).join('');
  const { sets } = await api('question-sets?withdrawn=1');
  $('ledgers').innerHTML = sets.length ? '<ul>' + sets.map(x => `<li>${esc(x.genus)} · ${esc(x.id)} · ${x.withdrawn ? `<strong>withdrawn</strong>${x.withdrawn.replaced_by ? ' (replaced by ' + esc(x.withdrawn.replaced_by) + ')' : ''}` : Object.entries(x.status_counts).map(([k, n]) => `${n} ${esc(k)}`).join(', ')}
    <button class="secondary" type="button" data-ledger="${esc(x.id)}">Download the ledger</button>${x.withdrawn ? '' : ` <button class="secondary" type="button" data-withdraw="${esc(x.id)}">Withdraw</button>`}</li>`).join('') + '</ul>' : 'No question sets yet.';
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
let supp = null;
$('scheck').addEventListener('click', async () => {
  $('simport').disabled = true; supp = null;
  try {
    const f = $('f-supp').files[0]; if (!f) throw new Error('choose the supplement file');
    const text = await f.text(); const s = JSON.parse(text);
    const { releases } = await api('releases'); const rel = releases.find(r => r.id === s.release);
    const errs = rel ? validateSupplement(s, rel.manifest) : [`release "${s.release}" has not been imported yet`];
    if (errs.length) return say('smsg', 'bad', '<strong>This supplement cannot be imported.</strong>' + list(errs));
    supp = text; const n = Object.keys(s.cases).length; const m = s.method || {};
    say('smsg', 'ok', `<strong>${esc(s.supplement)}</strong> for ${esc(s.release)}: ${n} cases; ${m.inat_observations_with_its} iNaturalist observations searched; SHA-256 ${(await sha256(text)).slice(0, 12)}…; matches the release's pinned hashes; no location fields.`);
    $('simport').disabled = false;
  } catch (e) { say('smsg', 'bad', esc(e.message)); }
});
$('simport').addEventListener('click', async () => {
  try { $('simport').disabled = true; const r = await post('admin/supplements', { supplement_text: supp }); say('smsg', 'ok', `Imported <strong>${esc(r.supplement)}</strong> (${r.cases} cases, SHA-256 ${esc(r.sha256.slice(0, 12))}…).`); await loadAll(); }
  catch (e) { say('smsg', 'bad', `<strong>${esc(e.message)}</strong>` + (Array.isArray(e.detail) ? list(e.detail) : '')); }
});
$('r-add').addEventListener('click', async () => {
  try { const email = $('r-email').value.trim(), name = $('r-name').value.trim(), role = $('r-role').value;
    await post('reviewers', { email, display_name: name, role }); say('rmsg', 'ok', 'Added.'); await loadAll();
    $('inviteText').value = `Hello ${name},\n\nI have added you as a ${role} on the Barcode Reliability Explorer, where genus review reports raise questions about GenBank ITS records: which sequence fixes what a name means, which names ITS cannot tell apart, and which names are misapplied.\n\nOpen ${location.origin}/explorer/decisions/ and sign in with this e-mail address (${email}); you will receive a one-time code. Your answers are saved as test answers until I enable formal answers for you, and you see other reviewers' answers only after giving your own.\n\nThank you!`;
    $('invite').hidden = false; }
  catch (e) { say('rmsg', 'bad', esc(e.message)); }
});
$('inviteCopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('inviteText').value); say('rmsg', 'ok', 'Invitation copied.'); } catch { $('inviteText').select(); } });
$('revs').addEventListener('change', async ev => {
  const t = ev.target;
  if (t.dataset.genera) {
    const genera = t.value.split(',').map(x => x.trim()).filter(Boolean);
    try { await post(`reviewers/${t.dataset.genera}/genera`, { genera }); say('rmsg', 'ok', genera.length ? `May answer for ${esc(genera.join(', '))}.` : 'May answer for every genus.'); await loadAll(); }
    catch (e) { say('rmsg', 'bad', esc(e.message)); }
    return;
  }
  if (!t.dataset.id) return;
  try { await post(`reviewers/${t.dataset.id}/${t.dataset.k}`, { enabled: t.checked }); await loadAll(); } catch (e) { say('rmsg', 'bad', esc(e.message)); t.checked = !t.checked; }
});
let qtext = null;
$('qcheck').addEventListener('click', async () => {
  $('qimport').disabled = true; qtext = null;
  try {
    const f = $('f-qs').files[0]; if (!f) throw new Error('choose the questions.json file');
    const text = await f.text(); const s = JSON.parse(text); const errs = validateQuestionSet(s);
    if (errs.length) return say('qmsg', 'bad', '<strong>This question set cannot be imported.</strong>' + list(errs.slice(0, 30)));
    qtext = text; const by = {}; for (const q of s.questions) by[q.type] = (by[q.type] || 0) + 1;
    say('qmsg', 'ok', `<strong>${esc(s.set)}</strong>: ${esc(s.genus)}, GenBank snapshot ${esc(s.snapshot)}, ${s.questions.length} questions (${Object.entries(by).map(([k, n]) => `${n} ${esc(k)}`).join(', ')}); SHA-256 ${(await sha256(text)).slice(0, 12)}…`);
    $('qimport').disabled = false;
  } catch (e) { say('qmsg', 'bad', esc(e.message)); }
});
$('qimport').addEventListener('click', async () => {
  try { $('qimport').disabled = true; const r = await post('admin/question-sets', { questions_text: qtext });
    say('qmsg', 'ok', `Imported <strong>${esc(r.set)}</strong> (${r.questions} questions).${r.replaced.length ? ` It replaces ${esc(r.replaced.join(', '))}, which nobody had answered; that set is withdrawn.` : ''}${r.kept_as_older_versions.length ? ` ${esc(r.kept_as_older_versions.join(', '))} already had answers and stays as an older version.` : ''} <a href="/explorer/decisions/?set=${encodeURIComponent(r.set)}">Open it</a>.`); await loadAll(); }
  catch (e) { say('qmsg', 'bad', `<strong>${esc(e.message)}</strong>` + (Array.isArray(e.detail) ? list(e.detail) : '')); }
});
$('ledgers').addEventListener('click', async ev => {
  const w = ev.target.dataset && ev.target.dataset.withdraw;
  if (w) { try { await post(`admin/question-sets/${encodeURIComponent(w)}/withdraw`, { reason: 'withdrawn by the owner from the set-up page' }); say('qmsg', 'ok', `${esc(w)} is withdrawn: reviewers no longer see it.`); await loadAll(); }
    catch (e) { say('qmsg', 'bad', esc(e.message)); } return; }
  const id = ev.target.dataset && ev.target.dataset.ledger; if (!id) return;
  try { const l = await api(`question-sets/${encodeURIComponent(id)}/ledger`);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(l, null, 1)], { type: 'application/json' })); a.download = `${id}-ledger.json`; a.click(); URL.revokeObjectURL(a.href); }
  catch (e) { say('qmsg', 'bad', esc(e.message)); }
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

let wsText = null;
$('wcheck').addEventListener('click', async () => {
  $('wimport').disabled = true; wsText = null;
  try {
    const f = $('f-ws').files[0]; if (!f) throw new Error('choose the workingset.json file');
    const t = await f.text(); const w = JSON.parse(t); const errs = validateWorkingSet(w);
    if (errs.length) return say('wmsg', 'bad', '<strong>This file cannot be imported.</strong>' + list(errs));
    const roles = {}; for (const r of w.records) roles[r.role] = (roles[r.role] || 0) + 1;
    wsText = t;
    say('wmsg', 'ok', `<strong>${esc(w.genus)} · ${esc(w.snapshot)}</strong>: ${w.records.length} records (${Object.entries(roles).map(([k, n]) => `${n} ${esc(k.replace('_', ' '))}`).join(', ')}). The file checks out.`);
    $('wimport').disabled = false;
  } catch (e) { say('wmsg', 'bad', esc(e.message)); }
});
$('wimport').addEventListener('click', async () => {
  try {
    $('wimport').disabled = true; const r = await post('admin/working-sets', { workingset_text: wsText });
    const d = r.decisions_applied;
    say('wmsg', 'ok', `Imported <strong>${esc(r.genus)} · ${esc(r.snapshot)}</strong> (${r.records} records).` + (d ? ` Decided questions applied: ${d.made} change${d.made === 1 ? '' : 's'} made.` : '') +
      ` <a href="/explorer/working-set/?genus=${encodeURIComponent(r.genus)}">Open the working set</a>`);
    await loadAll();
  } catch (e) { say('wmsg', 'bad', `<strong>${esc(e.message)}</strong>` + (Array.isArray(e.detail) ? list(e.detail) : '')); }
});
