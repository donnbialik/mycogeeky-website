// Client code of the Explorer case page (a data-free shell; evidence comes only from the authenticated API).
import { api, post, esc, $, outcome, whoami, releaseStrip, latestRelease, showError } from './common.js';
import { LINK_HOSTS, PHOTO_HOSTS } from '../../../explorer/contract/supplement.js';
const id = new URLSearchParams(location.search).get('id');
let view;
const fmt = v => v == null || v === '' ? '<span class="muted">not recorded</span>' : esc(v);
function seqHtml(c) {
  const s = c.oriented_sequence || c.sequence || ''; const R = c.regions || {};
  const tierOf = n => { const r = R[n] || {}; if (r.primary && r.primary.eligible) return { ...r.primary, inferred: false };
    if (r.reference_anchored && r.reference_anchored.eligible) return { ...r.reference_anchored, inferred: true }; return null; };
  const spans = [['ITS1', 'its1'], ['5.8S', 's58'], ['ITS2', 'its2']].map(([n, cls]) => ({ n, cls, t: tierOf(n) })).filter(x => x.t && x.t.start != null);
  let out = '', pos = 0;
  for (const x of spans.sort((a, b) => a.t.start - b.t.start)) {
    if (x.t.start > pos) out += `<span class="flank">${esc(s.slice(pos, x.t.start))}</span>`;
    out += `<span class="${x.cls}${x.t.inferred ? ' inferred' : ''}" title="${x.n}: ${x.t.start}–${x.t.end}${x.t.inferred ? ' (reference-inferred end)' : ''}">${esc(s.slice(x.t.start, x.t.end))}</span>`; pos = x.t.end;
  }
  if (pos < s.length) out += `<span class="flank">${esc(s.slice(pos))}</span>`;
  return out + `<div class="muted small" style="margin-top:6px">${s.length} bases (oriented)</div>`;
}
function render(c) {
  document.title = c.case_id + ' · Explorer';
  $('cid').textContent = c.case_id + ' · ' + view.case.release_id + ' · evidence ' + view.case.evidence_sha256.slice(0, 12);
  $('title').innerHTML = `<em>${esc(c.name_as_applied)}</em> · ${esc(c.accession)}`;
  $('why').textContent = c.why_this_case;
  $('rstatus').textContent = view.adjudication.status === 'agreed' ? 'formal reviews agree (not accepted into any release yet)' : c.review_status;
  const p = c.provenance || {};
  $('prov').innerHTML = [['Accession', c.accession], ['Name as deposited', c.name_as_applied], ['Collection', c.collection ? `${c.collection.id} (${c.collection.sequences} sequence${c.collection.sequences > 1 ? 's' : ''})` : null],
    ['Voucher', p.specimen_voucher], ['Culture', p.culture_collection], ['Strain / isolate', p.strain_or_isolate], ['Clone', p.clone], ['Collected by', p.collected_by], ['Date', p.collection_date],
    ['Country', p.country], ['Host', p.host], ['Publication', p.publication], ['Study', p.study], ['Identification basis', c.identification_basis], ['Identified by', p.identified_by],
    ['Type relationship', c.type_relationship], ['Name status', c.name_status_note]].map(([k, v]) => `<dt>${k}</dt><dd>${fmt(v)}</dd>`).join('')
    + `<dt>Flags</dt><dd>${(c.flags || []).map(f => `<span class="pill flag">${esc(f)}</span>`).join(' ') || 'none'}</dd>`;
  $('seq').innerHTML = seqHtml(c);
  $('regions').innerHTML = Object.entries(c.regions || {}).map(([n, r]) => `<tr><td>${esc(n)}</td>
    <td>${r.primary.eligible ? `eligible · ${r.primary.start}–${r.primary.end}` : 'not eligible' + (r.primary.reasons.length ? ' · ' + esc(r.primary.reasons.join(', ')) : '')}</td>
    <td>${r.reference_anchored ? (r.reference_anchored.eligible ? `eligible · ${r.reference_anchored.start}–${r.reference_anchored.end}<div class="muted small">${esc(r.reference_anchored.basis)}</div>` : 'not eligible') : '—'}</td></tr>`).join('');
  const lab = { its1Start: 'ITS1 start', s58Start: '5.8S start', its2Start: 'ITS2 start', its2End: 'ITS2 end' };
  $('bounds').innerHTML = Object.entries(c.boundaries || {}).map(([k, b]) => { const o = b.crosscheck ? outcome(b.crosscheck.outcome) : null;
    return `<tr><td>${lab[k] || esc(k)}</td>
    <td>${b.itsx_position == null ? '<span class="muted">not located</span>' : b.itsx_position} <div class="muted small">${esc(b.method_agreement)}</div></td>
    <td>${o ? `<span class="pill ${o.cls}">${esc(o.label)}</span>${b.crosscheck.rationale ? `<div class="muted small">${esc(b.crosscheck.rationale)}</div>` : o.detail ? `<div class="muted small">${esc(o.detail)}</div>` : ''}` : '—'}</td>
    <td>${b.reference_inference ? `${esc(b.reference_inference.outcome)}${b.reference_inference.accepted ? ` · position ${b.reference_inference.position} (interval ${esc(JSON.stringify(b.reference_inference.position_interval))})` : ''}<div class="muted small">${esc(b.reference_inference.rationale)}</div><div class="muted small">references: ${esc((b.reference_inference.supporting_references || []).join(', '))}</div>` : '—'}</td></tr>`; }).join('');
  const n = c.nearest_neighbour || {}; const sc = c.species_context || {}; const gu = sc.gap_uncertainty || {};
  $('nn').innerHTML = [['Nearest core taxon', n.nearest_taxon ? `${esc(n.nearest_taxon)} at ${n.nearest_pct} points` : null],
    ['Runner-up taxon', n.runner_up_taxon ? `${esc(n.runner_up_taxon)} at ${n.runner_up_pct} points` : null],
    ['Nearest-neighbour stability', n.unstable === undefined ? null : (n.unstable ? 'UNSTABLE under alignment or boundary uncertainty' : 'stable under co-optimal alignments, 3 alignment models and boundary shifts (stability is not proof of identity)')],
    [`${esc(sc.species || 'Species')}: barcode gap`, sc.gap == null ? null : `${sc.gap} points (max within ${sc.within_max}, min between ${sc.between_min}; nearest taxon ${esc(sc.nearest_taxon)})`],
    ['Gap under uncertainty', gu.gap_lower_bound_co_optimal == null ? null : `co-optimal lower bound ${gu.gap_lower_bound_co_optimal}; minimum under boundary shifts ${gu['gap_min_under_boundary_shifts (determining pairs)']}; by alignment model ${Object.values(gu.gap_by_alignment_model || {}).join(' / ')}`],
    ['Pairs that set the gap', sc.determining_within_pair ? `within: ${esc(sc.determining_within_pair.join(' – '))}; between: ${esc((sc.determining_between_pair || []).join(' – '))}` : null],
    ['Note', 'A barcode gap describes this reference set. It is not a species boundary or an identification threshold.']]
    .map(([k, v]) => `<dt>${k}</dt><dd>${k === 'Note' ? esc(v) : fmt(v)}</dd>`).join('');
}
// ---------------------------------------------------------------- independent corroboration (bre-supplement/1)
const cited = new Set(); let sup = null, tab = 'same', showAll = false;
const link = (u, t) => LINK_HOSTS.test(String(u || '')) ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t ?? u)}</a>` : esc(t ?? u);
const valOrLink = v => /^https:\/\//.test(String(v)) ? link(v, String(v).replace(/^https:\/\/(www\.)?/, '').slice(0, 48) + (String(v).length > 60 ? '…' : '')) : esc(v);
const circ = c => c.startsWith('likely') ? ['agree', 'species ID at posting'] : c.startsWith('possibly') ? ['minor', 'species ID added later'] : ['na', 'no species ID'];
function inatCard(o) {
  const key = `iNaturalist ${o.id}`; const [cc, cl] = circ(o.circularity);
  const photos = (o.photos || []).filter(p => PHOTO_HOSTS.test(p.url));
  const ids = (o.identifications || []).map(i => `<li>${esc(i.on)} · <em>${esc(i.name)}</em> (${esc(i.rank)}) by ${esc(i.by)}${i.current === false ? ' · withdrawn' : ''}${i.category ? ' · ' + esc(i.category) : ''}</li>`).join('');
  const f = Object.entries(o.fields || {}).map(([k, v]) => `<div><span class="muted">${esc(k)}:</span> ${valOrLink(v)}</div>`).join('');
  return `<article class="xp-card${cited.has(key) ? ' cited' : ''}">
    ${photos.length ? `<div class="xp-thumbs">${photos.slice(0, 3).map((p, i) => `<button type="button" data-photo="${esc(p.url)}" data-cap="${esc(`${p.attribution} · ${p.license || 'licence not stated'} · observation ${o.id}`)}" aria-label="Enlarge photo ${i + 1} of observation ${o.id}"><img loading="lazy" referrerpolicy="no-referrer" src="${esc(p.url)}" alt="Photo ${i + 1} of iNaturalist observation ${o.id}, ${esc(p.attribution)}" /></button>`).join('')}</div>` : '<p class="muted small">No photos.</p>'}
    <div><strong><em>${esc(o.name || 'unnamed')}</em></strong> · ${link(o.url, '#' + o.id)}</div>
    <div class="row"><span class="pill ${o.quality_grade === 'research' ? 'rg' : 'na'}">${esc(o.quality_grade || 'grade unknown')}</span><span class="pill ${cc}" title="${esc(o.circularity)}">${esc(cl)}</span><span class="pill">${o.distance_pct} points</span></div>
    <div class="muted small">Observed ${esc(o.observed_on || '?')} · posted ${esc(o.posted || '?')}${o.days_from_posting_to_species_id != null ? ` · species ID after ${o.days_from_posting_to_species_id} d` : ''} · ${esc(o.observer || '')} · ${o.photo_count} photo${o.photo_count === 1 ? '' : 's'}</div>
    ${f ? `<div class="small" style="margin-top:6px">${f}</div>` : ''}
    <details><summary>Identification timeline (${(o.identifications || []).length})</summary><ol class="small">${ids}</ol></details>
    <label class="cite"><input type="checkbox" data-cite="${esc(key)}" ${cited.has(key) ? 'checked' : ''} /> Cite in my review</label></article>`;
}
function gbTable(rows) {
  if (!rows.length) return '<p class="muted">No GenBank collection within the distance.</p>';
  return `<div class="xp-scroll"><table><thead><tr><th>Cite</th><th>Accession</th><th>Name</th><th>Points</th><th>Independent</th><th>Voucher / culture</th><th>Identified by · date</th><th>Cross-links</th></tr></thead><tbody>${rows.map(g => {
    const key = `GenBank ${g.accession}`;
    return `<tr><td><input type="checkbox" data-cite="${esc(key)}" ${cited.has(key) ? 'checked' : ''} aria-label="Cite ${esc(g.accession)}" /></td>
      <td>${link(`https://www.ncbi.nlm.nih.gov/nuccore/${g.accession}`, g.accession)}<div class="muted small">${esc(g.first_author || '')} ${esc(g.country || '')}</div></td>
      <td><em>${esc(g.name)}</em>${g.same_name ? '' : ' <span class="pill conflict">other name</span>'}</td><td>${g.distance_pct}</td>
      <td>${g.independent ? '<span class="pill agree">yes</span>' : `<span class="pill minor">no</span><div class="muted small">${esc(g.not_independent_because.join('; '))}</div>`}</td>
      <td class="small">${esc(g.voucher || '')}${g.culture ? `<div>${esc(g.culture)}</div>` : ''}</td>
      <td class="small">${esc(g.identified_by || '')}${g.collection_date ? ` · ${esc(g.collection_date)}` : ''}</td>
      <td class="small">${(g.mushroom_observer || []).map(n => link(`https://mushroomobserver.org/${n}`, 'MO ' + n)).join(' ')} ${(g.inaturalist || []).map(n => link(`https://www.inaturalist.org/observations/${n}`, 'iNat ' + n)).join(' ')}</td></tr>`; }).join('')}</tbody></table></div>`;
}
function renderCorr() {
  if (!sup) return;
  const e = sup.entry, s = e.summary, h = sup.header, m = h.method || {};
  const groups = { same: e.inaturalist.filter(o => o.same_name), other: e.inaturalist.filter(o => !o.same_name && o.species_level !== false && (o.name || '').split(' ').length > 1),
    genus: e.inaturalist.filter(o => (o.name || '').split(' ').length < 2), gb: e.genbank };
  const labels = { same: `iNaturalist, same name (${groups.same.length})`, other: `iNaturalist, other species (${groups.other.length})`, genus: `iNaturalist, genus only (${groups.genus.length})`, gb: `GenBank (${groups.gb.length})` };
  $('corrHead').textContent = `Supplement ${sup.id} · SHA-256 ${sup.sha256.slice(0, 12)}… · sources retrieved ${String(h.created_utc).slice(0, 10)} · sequences within ${e.max_distance_pct} points of this case (full ITS; ${m.inat_observations_with_its} ${m.inat_genus} observations with an ITS field searched)`;
  $('corrSum').innerHTML = `<strong>${s.genbank_independent_same_name}</strong> independent GenBank collections under the same name · <strong>${s.inat_same_name}</strong> iNaturalist observations under the same name (${s.inat_same_name_research_grade} research grade; ${s.inat_same_name_likely_named_before_sequencing} named at posting) · <strong>${s.inat_other_species ?? 0}</strong> under another species`
    + (s.contradictions.length ? `<div class="xp-msg bad small"><strong>Same or near-identical ITS under another species name:</strong><ul>${s.contradictions.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '');
  $('corrTabs').innerHTML = Object.entries(labels).map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === tab}">${esc(l)}</button>`).join('');
  const rows = groups[tab]; const N = 24;
  $('corrBody').innerHTML = tab === 'gb' ? gbTable(rows)
    : rows.length ? `<div class="xp-cards">${(showAll ? rows : rows.slice(0, N)).map(inatCard).join('')}</div>${rows.length > N && !showAll ? `<button type="button" class="secondary" id="corrMore">Show all ${rows.length}</button>` : ''}`
    : '<p class="muted">None.</p>';
  $('citedNote').innerHTML = cited.size ? `Citing ${cited.size} corroborator${cited.size === 1 ? '' : 's'} from supplement ${esc(sup.id)}: ${[...cited].map(esc).join(', ')}` : 'Corroborators you cite from the panel are saved with the review.';
}
$('corrTabs').addEventListener('click', ev => { const t = ev.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; showAll = false; renderCorr(); } });
$('corrBody').addEventListener('click', ev => {
  if (ev.target.id === 'corrMore') { showAll = true; renderCorr(); return; }
  const b = ev.target.closest('[data-photo]'); if (!b) return;
  $('viewerImg').src = b.dataset.photo.replace('/small.', '/medium.'); $('viewerImg').alt = b.querySelector('img').alt; $('viewerCap').textContent = b.dataset.cap;
  $('viewer').hidden = false; $('viewer').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
$('corrBody').addEventListener('change', ev => { const k = ev.target.dataset && ev.target.dataset.cite; if (!k) return; ev.target.checked ? cited.add(k) : cited.delete(k); renderCorr(); });

function renderReviews() {
  const a = view.adjudication;
  $('adj').innerHTML = `Outcome from formal reviews: <span class="pill">${esc(a.status)}</span> · ${a.formal_reviewers} formal reviewer${a.formal_reviewers === 1 ? '' : 's'}`;
  const sup = new Set(view.my_reviews.filter(r => r.supersedes).map(r => r.supersedes));
  $('hist').innerHTML = view.my_reviews.length ? view.my_reviews.slice().reverse().map(r => `<li class="${sup.has(r.id) ? 'sup' : ''}">
      <span class="pill ${r.mode}">${r.mode}</span> <strong>${esc(r.decision)}</strong>${r.name_after_review ? ' → <em>' + esc(r.name_after_review) + '</em>' : ''} · voucher ${esc(r.voucher_confirmed)}
      <div class="muted small">#${r.id} · ${esc(r.created_at)}${r.supersedes ? ' · corrects #' + r.supersedes : ''}${sup.has(r.id) ? ' · superseded' : ''}</div>
      <div>${esc(r.notes)}</div>${r.cited && r.cited.length ? `<div class="muted small">Cited: ${r.cited.map(esc).join(', ')}</div>` : ''}</li>`).join('') : '<li class="muted">You have not reviewed this case yet.</li>';
  $('others').innerHTML = view.others_hidden
    ? `<p class="muted small">${view.others_count} other reviewer${view.others_count === 1 ? ' has' : 's have'} reviewed this case. Their decisions stay hidden until you submit your own, so that reviews are independent.</p>`
    : (view.others.length ? '<h3>Other reviewers</h3><ul class="xp-history">' + view.others.map(r => `<li><span class="pill ${r.mode}">${r.mode}</span> <strong>${esc(r.reviewer)}</strong>: ${esc(r.decision)}${r.name_after_review ? ' → <em>' + esc(r.name_after_review) + '</em>' : ''}<div>${esc(r.notes)}</div></li>`).join('') + '</ul>' : '');
  $('acc').innerHTML = view.acceptances.length ? '<h3>Accepted for a future release</h3><ul>' + view.acceptances.map(x => `<li>${esc(x.decision)} → ${esc(x.target_release)} (${esc(x.created_at)})</li>`).join('') + '</ul>' : '';
  const current = view.my_reviews.filter(r => !sup.has(r.id)).pop();
  $('supNote').textContent = current ? `Saving now records a correction of your review #${current.id}. The earlier review stays in the history.` : '';
}
async function load() {
  const [me, rel, v] = await Promise.all([api('me'), latestRelease(), api('cases/' + encodeURIComponent(id))]);
  view = v; whoami(me); releaseStrip(rel); render(view.evidence);
  sup = (view.supplements || []).filter(x => x.kind === 'corroboration').pop() || null;
  if (sup) { $('corr').hidden = false; renderCorr(); }
  $('formalRadio').disabled = !me.formal_reviews_enabled;
  $('modeNote').textContent = me.formal_reviews_enabled
    ? 'Formal reviews count toward the case outcome. Nothing becomes an accepted reference until the owner accepts an agreed outcome into a future release.'
    : 'Formal reviews are not enabled for your account yet. Test reviews are saved and shown, but never count toward an outcome.';
  renderReviews();
}
$('f').addEventListener('submit', async ev => {
  ev.preventDefault(); const g = k => $(k).value;
  const sup = new Set(view.my_reviews.filter(r => r.supersedes).map(r => r.supersedes)); const current = view.my_reviews.filter(r => !sup.has(r.id)).pop();
  const body = { case_id: id, decision: g('decision'), name_after_review: g('name_after_review'), voucher_confirmed: g('voucher_confirmed'), identification_basis: g('identification_basis'),
    notes: g('notes'), supporting_references: g('supporting_references'), evidence_sha256: view.case.evidence_sha256,
    mode: document.querySelector('input[name=mode]:checked').value, supersedes: current ? current.id : null,
    ...(sup ? { supplement_sha256: sup.sha256, cited: [...cited] } : {}) };
  const m = $('msg');
  try { const r = await post('reviews', body);
    m.className = 'xp-msg ok'; m.textContent = `Saved as ${r.mode} review #${r.review_id}.`; view = await api('cases/' + encodeURIComponent(id)); renderReviews(); ev.target.reset(); cited.clear(); renderCorr(); }
  catch (e) { m.className = 'xp-msg bad'; m.innerHTML = '<strong>The review was not saved.</strong><ul>' + (e.detail || [e.message]).map(x => `<li>${esc(x)}</li>`).join('') + '</ul>'; }
});
load().catch(showError);
