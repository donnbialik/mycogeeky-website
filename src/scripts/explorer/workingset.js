// Client code of the genus working-set page (a data-free shell; records come only from the authenticated API).
import { api, post, esc, $, whoami, showError } from './common.js';
import { ROLES, NAME_KINDS, recordUrl, isInat } from '../../../explorer/contract/workingset.js';
import { parseQuery, parseFasta, place, MAX_OTHERS, SHORT } from './placement.js';

let me = null, ws = null, tab = 'names', sel = new Set(), nameFilter = null, seqs = null, placing = false;
const FULL = 'ITS1+5.8S+ITS2';
const gb = a => `<a href="${recordUrl(a)}" target="_blank" rel="noopener">${esc(a)}</a>`;
// An iNaturalist record: say so, and say when its name may have been inferred from this very sequence.
const inatField = a => { const m = /-(\w)$/.exec(a); return !m ? '' : /\d/.test(m[1]) ? ` · ITS #${m[1]}` : ` · variant ${m[1]}`; };
const inatNote = r => !isInat(r.accession) ? '' : ` <span class="pill test" title="${esc(r.inat_names && r.inat_names.may_come_from_sequence
  ? 'iNaturalist observation; its name may have been inferred from this sequence (Species Name Override or Barcode Inferred Species field)' : 'iNaturalist observation')}">iNat${inatField(r.accession)}${r.inat_names && r.inat_names.may_come_from_sequence ? ' · name from sequence?' : ''}</span>`;
const decisionLink = ref => { const [s, q] = String(ref).split('/'); return `<a href="/explorer/decision/?set=${encodeURIComponent(s)}&id=${encodeURIComponent(q)}">${esc(q)}</a>`; };
const ROLE_CLS = { type_reference: 'agree', working_reference: 'minor', included: '', held: 'insufficient', outgroup: 'notassessed', excluded: 'conflict' };
const rolePill = r => `<span class="pill ${ROLE_CLS[r.role] || ''}" title="${esc(r.changed.role ? r.changed.role.reason : r.role_reason || '')}">${esc(ROLES[r.role] || r.role)}</span>`;
const kindPill = k => k === 'named' ? '' : ` <span class="pill ${k === 'candidate' ? 'experimental' : k === 'unidentified' ? 'notassessed' : 'test'}">${esc(NAME_KINDS[k])}</span>`;
const synNote = n => { const m = String(n || '').match(/\(([^)]+)\)$/); return m ? ` · synonym (${esc(m[1])})` : ''; };
// A long reason shows its first words and opens to the full text (it was cut at 120 characters with no sign of it).
const CLIP = 110;
const clipped = t => t.length <= CLIP + 10 ? esc(t)
  : `<details class="xp-more"><summary><span class="xp-clip">${esc(t.slice(0, CLIP).replace(/\s+\S*$/, ''))}…</span> <span class="xp-more-link"></span></summary>${esc(t)}</details>`;
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
    <td>${gb(r.accession)}${inatNote(r)}</td>
    <td>${nm(r.working_name)}${kindPill(r.name_kind)}${r.name_as_deposited && r.name_as_deposited !== r.working_name ? `<div class="muted small">deposited as ${nm(r.name_as_deposited)}${synNote(r.name_note)}</div>` : ''}</td>
    <td>${rolePill(r)}${reasonOf(r) ? `<div class="muted small">${clipped(reasonOf(r))}</div>` : ''}</td>
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
  $('filters').style.display = tab === 'hist' || tab === 'place' ? 'none' : '';
  $('table-wrap').hidden = tab === 'place'; $('place-panel').hidden = tab !== 'place';
  for (const t of ['names', 'recs', 'hist', 'place']) $('tab-' + t).setAttribute('aria-selected', String(t === tab));
  if (tab === 'names') drawNames(); else if (tab === 'recs') drawRecs(); else if (tab === 'hist') drawHist().catch(showError);
  bulkBar();
}

// ---- Place a sequence (placement.js; computed in the browser, the pasted sequence is not sent anywhere) ----
const pct = v => v == null ? '' : v < 1 ? v.toFixed(2) : v.toFixed(1);
const partial = x => x.coverage < SHORT ? ' <span class="pill minor" title="This reference covers under half of the pasted sequence; it ranks after the others">partial</span>' : '';
const cov = x => `${Math.round(100 * x.coverage)}%${partial(x)}`;
// When a record was deposited under another name (a synonym, a variety), say so: the nearest "type reference" of
// G. marginata can be a type of G. venenata, and it must not read as marginata's own type.
const depAs = r => r.name_as_deposited && r.name_as_deposited !== r.working_name
  ? ` <span class="muted small">(${r.role === 'type_reference' ? 'type of' : 'deposited as'} ${nm(r.name_as_deposited)})</span>` : '';
const hit = x => x ? `${gb(x.record.accession)}${depAs(x.record)} · <strong>${pct(x.pct)}%</strong> <span class="muted small">(${x.diffs}/${x.compared}, covers ${Math.round(100 * x.coverage)}%)</span>${partial(x)}` : '<span class="muted">none aligned</span>';
async function sequences() {
  if (seqs && seqs.genus === ws.genus && seqs.snapshot === ws.snapshot.id) return seqs.map;
  const roles = Object.keys(ROLES).filter(k => k !== 'excluded').join(',');
  const res = await fetch(`/api/explorer/working-sets/${encodeURIComponent(ws.genus)}/fasta?roles=${roles}`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Could not load the working set's sequences (${res.status}).`);
  seqs = { genus: ws.genus, snapshot: ws.snapshot.id, map: parseFasta(await res.text()) };
  return seqs.map;
}
async function runPlacement() {
  if (placing) return;
  const q = parseQuery($('pq').value); const out = $('pout');
  if (q.error) { out.innerHTML = `<p class="xp-msg bad">${esc(q.error)}</p>`; return; }
  placing = true; $('pgo').disabled = true; out.innerHTML = '';
  try {
    $('pstat').textContent = 'Loading the working set’s sequences…';
    const map = await sequences();
    const recs = ws.records.filter(r => r.role !== 'excluded' && map.has(r.accession)).map(r => ({ ...r, sequence: map.get(r.accession) }));
    const res = await place(q.seq, recs, async (d, n) => { if (d % 5 === 0 || d === n) { $('pstat').textContent = `Aligning ${d} of ${n}…`; await new Promise(r => setTimeout(r, 0)); } });
    $('pstat').textContent = '';
    const top = res.nearest.filter(x => x.coverage >= SHORT);
    const names = res.byName.filter(n => n.nearest.coverage >= SHORT).slice(0, 8);
    // Only names that could be told apart: not 'Genus sp.' alone, not cf. or aff. qualified names.
    const [n1, n2] = names.filter(n => n.nearest.record.name_kind !== 'unidentified' && !/^\S+ sp\.?$/.test(n.name) && !/\b(cf|aff)\./.test(n.name));
    const close = n1 && n2 ? n2.nearest.pct - n1.nearest.pct : null;
    out.innerHTML = `${q.warning ? `<p class="xp-msg info small">${esc(q.warning)}</p>` : ''}
      <p class="small">Compared with <strong>${res.aligned}</strong> of the ${res.candidatesScreened} records in this working set: every type and working reference, and the ${MAX_OTHERS} other records most similar to the sequence${res.reversed ? '. The sequence was reverse-complemented to match the working set' : ''}.</p>
      ${!top.length ? '<p class="xp-msg bad">No record covers half of the sequence. It may not be ITS, or not this genus.</p>' : ''}
      ${close != null && close < 0.5 ? `<p class="xp-msg info small">The two nearest names, ${nm(n1.name)} (${pct(n1.nearest.pct)}%) and ${nm(n2.name)} (${pct(n2.nearest.pct)}%), are within ${pct(close)} percentage points of each other here.</p>` : ''}
      <h3>Nearest working names</h3>
      <div class="xp-scroll"><table><thead><tr><th>Working name</th><th>Nearest record</th><th>Nearest type reference</th><th title="Records of this name that were aligned">Aligned</th></tr></thead><tbody>
      ${names.map(n => `<tr><td>${nm(n.name)}</td><td>${hit(n.nearest)}</td><td>${hit(n.nearestType)}</td><td>${n.aligned}</td></tr>`).join('') || '<tr><td colspan="4">None.</td></tr>'}
      </tbody></table></div>
      <h3>Nearest records</h3>
      <div class="xp-scroll"><table><thead><tr><th>Record</th><th>Working name</th><th>Role</th><th>Distance</th><th title="Substitutions plus gap runs, over the compared columns">Differences</th><th>Covers</th><th>Country</th></tr></thead><tbody>
      ${res.nearest.slice(0, 15).map(x => `<tr><td>${gb(x.record.accession)}${inatNote(x.record)}</td><td>${nm(x.record.working_name)}${depAs(x.record)}</td><td>${rolePill(x.record)}</td>
        <td><strong>${pct(x.pct)}%</strong></td><td class="small">${x.subs} sub${x.subs === 1 ? '' : 's'} + ${x.indels} gap run${x.indels === 1 ? '' : 's'} / ${x.compared}</td><td class="small">${cov(x)}</td><td class="small">${esc(country(x.record.country))}</td></tr>`).join('')}
      </tbody></table></div>`;
  } catch (e) { $('pstat').textContent = ''; showError(e); }
  finally { placing = false; $('pgo').disabled = false; }
}
function show(t) { tab = t; draw(); }

function summary() {
  const roles = {}; for (const r of ws.records) roles[r.role] = (roles[r.role] || 0) + 1;
  const changed = ws.records.filter(r => Object.keys(r.changed).length).length;
  $('ws-title').innerHTML = `Working set: <em>${esc(ws.genus)}</em>`;
  $('xp-release').innerHTML = `<strong>${esc(ws.genus)} working set</strong> · snapshot ${esc(ws.snapshot.id)} (imported ${esc(ws.snapshot.imported_at.slice(0, 10))}) · ${ws.records.length} records · ${changed} changed since the snapshot ·
    <strong>computationally assembled from GenBank${ws.records.some(r => isInat(r.accession)) ? ', iNaturalist' : ''} and type sources; changes are reviewers' decisions</strong>`;
  $('summary').innerHTML = Object.entries(ROLES).filter(([k]) => roles[k]).map(([k, v]) => `${esc(v)}: <strong>${roles[k]}</strong>`).join(' · ') +
    (ws.changes_not_in_snapshot.length ? ` · <span title="Changes to accessions that are not in this snapshot">${ws.changes_not_in_snapshot.length} change(s) to records not in this snapshot</span>` : '');
  const base = `/api/explorer/working-sets/${encodeURIComponent(ws.genus)}`;
  $('dl-fasta').href = `${base}/fasta`; $('dl-types').href = `${base}/fasta?roles=type_reference`;
  $('dl-csv').href = `${base}/csv?roles=${Object.keys(ROLES).join(',')}`;
}

async function load(genus) {
  ws = await api('working-sets/' + encodeURIComponent(genus)); sel.clear(); nameFilter = null; $('pout').innerHTML = '';
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
  $('tab-place').addEventListener('click', () => show('place'));
  $('pgo').addEventListener('click', () => runPlacement());
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
