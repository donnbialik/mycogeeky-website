// Client code of the Explorer case page (a data-free shell; evidence comes only from the authenticated API).
import { api, post, esc, $, outcome, whoami, releaseStrip, latestRelease, showError } from './common.js';
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
function renderReviews() {
  const a = view.adjudication;
  $('adj').innerHTML = `Outcome from formal reviews: <span class="pill">${esc(a.status)}</span> · ${a.formal_reviewers} formal reviewer${a.formal_reviewers === 1 ? '' : 's'}`;
  const sup = new Set(view.my_reviews.filter(r => r.supersedes).map(r => r.supersedes));
  $('hist').innerHTML = view.my_reviews.length ? view.my_reviews.slice().reverse().map(r => `<li class="${sup.has(r.id) ? 'sup' : ''}">
      <span class="pill ${r.mode}">${r.mode}</span> <strong>${esc(r.decision)}</strong>${r.name_after_review ? ' → <em>' + esc(r.name_after_review) + '</em>' : ''} · voucher ${esc(r.voucher_confirmed)}
      <div class="muted small">#${r.id} · ${esc(r.created_at)}${r.supersedes ? ' · corrects #' + r.supersedes : ''}${sup.has(r.id) ? ' · superseded' : ''}</div>
      <div>${esc(r.notes)}</div></li>`).join('') : '<li class="muted">You have not reviewed this case yet.</li>';
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
    mode: document.querySelector('input[name=mode]:checked').value, supersedes: current ? current.id : null };
  const m = $('msg');
  try { const r = await post('reviews', body);
    m.className = 'xp-msg ok'; m.textContent = `Saved as ${r.mode} review #${r.review_id}.`; view = await api('cases/' + encodeURIComponent(id)); renderReviews(); ev.target.reset(); }
  catch (e) { m.className = 'xp-msg bad'; m.innerHTML = '<strong>The review was not saved.</strong><ul>' + (e.detail || [e.message]).map(x => `<li>${esc(x)}</li>`).join('') + '</ul>'; }
});
load().catch(showError);
