// Client code of the genus working-set page (a data-free shell; records come only from the authenticated API).
import { api, post, esc, $, whoami, showError } from './common.js';
import { ROLES, NAME_KINDS } from '../../../explorer/contract/workingset.js';

let me = null, ws = null, tab = 'names', sel = new Set(), nameFilter = null;
const FULL = 'ITS1+5.8S+ITS2';
const gb = a => `<a href="https://www.ncbi.nlm.nih.gov/nuccore/${encodeURIComponent(a)}" target="_blank" rel="noopener">${esc(a)}</a>`;
const decisionLink = ref => { const [s, q] = String(ref).split('/'); return `<a href="/explorer/decision/?set=${encodeURIComponent(s)}&id=${encodeURIComponent(q)}">${esc(q)}</a>`; };
const ROLE_CLS = { type_reference: 'agree', working_reference: 'minor', included: '', held: 'insufficient', outgroup: 'notassessed', excluded: 'conflict' };
const rolePill = r => `<span class="pill ${ROLE_CLS[r.role] || ''}" title="${esc(r.changed.role ? r.changed.role.reason : r.role_reason || '')}">${esc(ROLES[r.role] || r.role)}</span>`;
const kindPill = k => k === 'named' ? '' : ` <span class="pill ${k === 'candidate' ? 'experimental' : k === 'unidentified' ? 'notassessed' : 'test'}">${esc(NAME_KINDS[k])}</span>`;
const synNote = n => { const m = String(n || '').match(/\(([^)]+)\)$/); return m ? ` · synonym (${esc(m[1])})` : ''; };
const reasonOf = r => { const t = r.changed.role ? r.changed.role.reason : r.role_reason; return t === 'kept by the genus run' ? '' : t || ''; };
const nm = s => `<em>${esc(s)}</em>`;
const country = c => (c || '').split(':')[0] || '';

function filtered() {
  const q = $('q').value.trim().toLowerCase(), role = $('role').value, kind = $('kind').value, ch = $('changed').value;
  return ws.records.filter(r => (!nameFilter || r.working_name === nameFilter) && (!role || r.role === role) && (!kind || r.name_kind === kind) && (!ch || Object.keys(r.changed).length)
    && (!q || [r.accession, r.working_name, r.name_as_deposited, r.voucher, r.country, r.type_material].some(v => String(v || '').toLowerCase().includes(q))));
}

function drawNames() {
  const by = {};
  for (const r of filtered()) if (r.role !== 'excluded') (by[r.working_name] ||= []).push(r);
  const rows = Object.entries(by).map(([n, rs]) => {
    const colls = new Set(rs.map(r => r.collection || r.accession)).size;
    const types = rs.filter(r => r.role === 'type_reference'), wref = rs.filter(r => r.role === 'working_reference');
    const ctry = {}; for (const r of rs) { const c = country(r.country) || 'not stated'; ctry[c] = (ctry[c] || 0) + 1; }
    return { n, rs, colls, types, wref, full: rs.filter(r => r.regions === FULL).length, us: rs.filter(r => /^USA/.test(r.country || '')).length,
      ctry: Object.entries(ctry).sort((a, b) => b[1] - a[1]).slice(0, 3), kind: rs[0].name_kind, changed: rs.filter(r => Object.keys(r.changed).length).length };
  }).sort((a, b) => (a.kind === 'unidentified') - (b.kind === 'unidentified') || b.rs.length - a.rs.length || a.n.localeCompare(b.n));
  // Sampling and type checks of the tree-set criteria (v1): 5 or more independent collections = met, 2-4 short, 1 flagged.
  const samp = c => c >= 5 ? '<span class="pill agree">5+ collections</span>' : c >= 2 ? `<span class="pill minor">${c} collections</span>` : '<span class="pill conflict">1 collection</span>';
  $('head').innerHTML = '<tr><th>Working name</th><th>Records</th><th title="Independent collections (records of one specimen counted once); 5 or more meets the tree-set criteria">Sampling</th><th>Type reference</th><th>Working reference</th><th title="Records with ITS1, 5.8S and ITS2">Full ITS</th><th>USA</th><th>Countries</th><th>Changed</th></tr>';
  $('rows').innerHTML = rows.map(x => `<tr><td><a href="#" data-name="${esc(x.n)}">${nm(x.n)}</a>${kindPill(x.kind)}</td><td>${x.rs.length}</td><td>${samp(x.colls)}</td>
    <td>${x.types.length ? x.types.slice(0, 3).map(r => gb(r.accession)).join(', ') + (x.types.length > 3 ? ` +${x.types.length - 3}` : '') : '<span class="pill conflict">none</span>'}</td>
    <td>${x.wref.length ? x.wref.map(r => gb(r.accession)).join(', ') : '<span class="muted">none</span>'}</td><td>${x.full}</td><td>${x.us}</td>
    <td class="small">${x.ctry.map(([c, n]) => `${esc(c)} ${n}`).join(', ')}</td><td>${x.changed || ''}</td></tr>`).join('') || '<tr><td colspan="9">No names match.</td></tr>';
  for (const a of $('rows').querySelectorAll('a[data-name]')) a.addEventListener('click', e => { e.preventDefault(); nameFilter = a.dataset.name; show('recs'); });
}

function drawRecs() {
  const rs = filtered(); const owner = me.role === 'owner'; const max = 800;
  $('head').innerHTML = `<tr>${owner ? '<th><input type="checkbox" id="selall" aria-label="Select all shown" /></th>' : ''}<th>Accession</th><th>Working name</th><th>Role</th><th>Type</th><th>Voucher</th><th>Country</th><th>ITS</th><th>Engine match</th><th>Changed by</th></tr>`;
  $('rows').innerHTML = (nameFilter ? `<tr><td colspan="${owner ? 10 : 9}" class="small">Showing ${nm(nameFilter)} only. <a href="#" id="clearname">Show every name</a></td></tr>` : '') +
    rs.slice(0, max).map(r => `<tr>${owner ? `<td><input type="checkbox" data-acc="${esc(r.accession)}" ${sel.has(r.accession) ? 'checked' : ''} aria-label="Select ${esc(r.accession)}" /></td>` : ''}
    <td>${gb(r.accession)}</td>
    <td>${nm(r.working_name)}${kindPill(r.name_kind)}${r.name_as_deposited && r.name_as_deposited !== r.working_name ? `<div class="muted small">deposited as ${nm(r.name_as_deposited)}${synNote(r.name_note)}</div>` : ''}</td>
    <td>${rolePill(r)}${reasonOf(r) ? `<div class="muted small">${esc(reasonOf(r).slice(0, 120))}</div>` : ''}</td>
    <td class="small">${esc(r.type_material || '')}</td><td class="small">${esc(r.voucher || '')}</td><td class="small">${esc(r.country || '')}</td>
    <td class="small">${esc(r.regions || 'not located')}${r.length ? `<div class="muted">${r.length} bp</div>` : ''}</td>
    <td class="small">${esc(r.engine_match || '')}</td>
    <td class="small">${Object.entries(r.changed).map(([f, c]) => `${esc(f.replace('_', ' '))}: ${c.source === 'decision' ? decisionLink(c.decision_ref) : 'by hand'}`).join('<br>')}</td></tr>`).join('')
    + (rs.length > max ? `<tr><td colspan="10" class="muted">${rs.length - max} more records; narrow the search to see them.</td></tr>` : '') + (rs.length ? '' : '<tr><td colspan="10">No records match.</td></tr>');
  const cl = $('clearname'); if (cl) cl.addEventListener('click', e => { e.preventDefault(); nameFilter = null; draw(); });
  if (owner) {
    for (const c of $('rows').querySelectorAll('input[data-acc]')) c.addEventListener('change', () => { c.checked ? sel.add(c.dataset.acc) : sel.delete(c.dataset.acc); bulkBar(); });
    $('selall').addEventListener('change', e => { for (const r of rs.slice(0, max)) e.target.checked ? sel.add(r.accession) : sel.delete(r.accession); drawRecs(); bulkBar(); });
  }
}

async function drawHist() {
  const { changes } = await api(`working-sets/${encodeURIComponent(ws.genus)}/changes`); const owner = me.role === 'owner';
  $('head').innerHTML = '<tr><th>#</th><th>When</th><th>Record</th><th>Change</th><th>Why</th><th>From</th><th>Who</th><th></th></tr>';
  $('rows').innerHTML = changes.map(c => `<tr><td>${c.id}</td><td class="small">${esc(c.created_at.slice(0, 16).replace('T', ' '))}</td><td>${gb(c.accession)}</td>
    <td>${c.undoes != null ? `undo of #${c.undoes}` : `${esc(c.field.replace('_', ' '))} → <strong>${esc(c.field === 'role' ? ROLES[c.value] || c.value : c.field === 'name_kind' ? NAME_KINDS[c.value] || c.value : c.value)}</strong>`}</td>
    <td class="small">${esc(c.reason)}</td><td class="small">${c.source === 'decision' ? decisionLink(c.decision_ref) : 'by hand'}</td><td class="small">${esc(c.actor)}</td>
    <td>${c.undone_by ? `<span class="muted small">undone (#${c.undone_by.id})</span>` : c.undoes == null && owner ? `<button type="button" class="secondary" data-undo="${c.id}">Undo</button>` : ''}</td></tr>`).join('')
    || '<tr><td colspan="8">No changes yet. Decided genus questions and hand edits appear here.</td></tr>';
  for (const b of $('rows').querySelectorAll('button[data-undo]')) b.addEventListener('click', async () => {
    const reason = prompt('Why undo this change? (required)'); if (!reason) return;
    try { await post(`working-sets/${encodeURIComponent(ws.genus)}/changes/${b.dataset.undo}/undo`, { reason }); await reload(); }
    catch (e) { showError(e); }
  });
}

function bulkBar() {
  $('bulk').hidden = !(me.role === 'owner' && tab === 'recs' && sel.size); $('nsel').textContent = sel.size;
}
function valueInput() {
  const f = $('b-field').value;
  $('b-value-wrap').innerHTML = '<label for="b-value">New value</label>' + (f === 'working_name' ? '<input type="text" id="b-value" />'
    : `<select id="b-value">${Object.entries(f === 'role' ? ROLES : NAME_KINDS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select>`);
}

function draw() {
  $('filters').style.display = tab === 'hist' ? 'none' : '';
  for (const t of ['names', 'recs', 'hist']) $('tab-' + t).setAttribute('aria-selected', String(t === tab));
  if (tab === 'names') drawNames(); else if (tab === 'recs') drawRecs(); else drawHist().catch(showError);
  bulkBar();
}
function show(t) { tab = t; draw(); }

function summary() {
  const roles = {}; for (const r of ws.records) roles[r.role] = (roles[r.role] || 0) + 1;
  const changed = ws.records.filter(r => Object.keys(r.changed).length).length;
  $('ws-title').innerHTML = `Working set: <em>${esc(ws.genus)}</em>`;
  $('xp-release').innerHTML = `<strong>${esc(ws.genus)} working set</strong> · snapshot ${esc(ws.snapshot.id)} (imported ${esc(ws.snapshot.imported_at.slice(0, 10))}) · ${ws.records.length} records · ${changed} changed since the snapshot ·
    <strong>computationally assembled from GenBank and type sources; changes are reviewers' decisions</strong>`;
  $('summary').innerHTML = Object.entries(ROLES).filter(([k]) => roles[k]).map(([k, v]) => `${esc(v)}: <strong>${roles[k]}</strong>`).join(' · ') +
    (ws.changes_not_in_snapshot.length ? ` · <span title="Changes to accessions that are not in this snapshot">${ws.changes_not_in_snapshot.length} change(s) to records not in this snapshot</span>` : '');
  const base = `/api/explorer/working-sets/${encodeURIComponent(ws.genus)}`;
  $('dl-fasta').href = `${base}/fasta`; $('dl-types').href = `${base}/fasta?roles=type_reference`;
  $('dl-csv').href = `${base}/csv?roles=${Object.keys(ROLES).join(',')}`;
}

async function load(genus) {
  ws = await api('working-sets/' + encodeURIComponent(genus)); sel.clear(); nameFilter = null;
  history.replaceState(null, '', '?genus=' + encodeURIComponent(genus)); summary(); draw();
}
async function reload() { const n = nameFilter; ws = await api('working-sets/' + encodeURIComponent(ws.genus)); nameFilter = n; summary(); draw(); }

(async () => {
  const [m, l] = await Promise.all([api('me'), api('working-sets')]); me = m; whoami(me);
  $('role').innerHTML = '<option value="">all</option>' + Object.entries(ROLES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  $('kind').innerHTML = '<option value="">all</option>' + Object.entries(NAME_KINDS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  if (!l.working_sets.length) {
    $('xp-release').innerHTML = '<strong>No working set has been imported yet.</strong> The owner imports one from the set-up page.';
    $('rows').innerHTML = '<tr><td>No working sets yet.</td></tr>'; return;
  }
  $('genus').innerHTML = l.working_sets.map(w => `<option value="${esc(w.genus)}">${esc(w.genus)} (${w.records} records, ${w.active_changes} changes)</option>`).join('');
  const want = new URLSearchParams(location.search).get('genus');
  $('genus').value = l.working_sets.some(w => w.genus === want) ? want : l.working_sets[0].genus;
  await load($('genus').value);
  $('genus').addEventListener('change', () => load($('genus').value).catch(showError));
  $('tab-names').addEventListener('click', () => show('names'));
  $('tab-recs').addEventListener('click', () => show('recs'));
  $('tab-hist').addEventListener('click', () => show('hist'));
  for (const id of ['q', 'role', 'kind', 'changed']) $(id).addEventListener(id === 'q' ? 'input' : 'change', draw);
  valueInput(); $('b-field').addEventListener('change', valueInput);
  $('b-clear').addEventListener('click', () => { sel.clear(); drawRecs(); bulkBar(); });
  $('b-save').addEventListener('click', async () => {
    try {
      const r = await post(`working-sets/${encodeURIComponent(ws.genus)}/changes`, { accessions: [...sel], field: $('b-field').value, value: $('b-value').value, reason: $('b-reason').value });
      $('bmsg').className = 'xp-msg ok'; $('bmsg').textContent = `Saved: ${r.changes} record${r.changes === 1 ? '' : 's'} changed.`;
      sel.clear(); $('b-reason').value = ''; await reload();
    } catch (e) { $('bmsg').className = 'xp-msg bad'; $('bmsg').innerHTML = esc(e.message) + (Array.isArray(e.detail) ? '<ul>' + e.detail.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : ''); }
  });
})().catch(showError);
