// Client code of the Explorer record page (a data-free shell; evidence comes only from the authenticated API).
import { api, apiText, esc, $, outcome, whoami, releaseStrip, latestRelease, showError } from './common.js';
const FLAG = { 'NAME-STATUS': 'the deposited name needs a nomenclature check', 'RECOVERED-BOUNDARY': 'at least one region end was inferred from reference records (reference-anchored tier only)',
  'NAME-ORIGIN': 'the basis of the deposited name is not documented', 'MULTI-SEQ-COLLECTION': 'several sequences come from one biological collection (counted once)',
  'SAME-SEQ-OTHER-NAME': 'an identical sequence is deposited under another name', 'GAP-DETERMINING': 'this record sets a barcode-gap value for its species',
  'BOUNDARY-MINOR-OFFSET': 'references place a boundary 3-12 bases from ITSx', 'BOUNDARY-CONFLICT': 'references place a boundary more than 12 bases from ITSx' };
const fmt = v => v == null || v === '' ? '<span class="muted">not recorded</span>' : esc(v);
(async () => {
  const p = new URLSearchParams(location.search); const id = p.get('id');
  const [me, rel] = await Promise.all([api('me'), latestRelease(p.get('release'))]);
  whoami(me); releaseStrip(rel);
  const [recsText, cases] = await Promise.all([apiText(`releases/${encodeURIComponent(rel.id)}/records.json`), api('cases')]);
  const r = JSON.parse(recsText).find(x => x.accession === id);
  if (!r) throw new Error(`No record ${id} in release ${rel.id}.`);
  document.title = `${r.accession} · Explorer`;
  $('crumb').textContent = `${rel.id} · ${r.accession}`;
  $('title').innerHTML = `<em>${esc(r.name_as_applied)}</em> · ${esc(r.accession)}`;
  $('status').innerHTML = `<strong>Status: ${esc(r.review_status)}.</strong> The name is as deposited, not accepted taxonomy. No person has reviewed this record.`;
  $('tiers').innerHTML = [['Set', r.set], ['Primary tier (directly anchored)', r.primary_regions || 'no eligible region'],
    ['Reference-anchored tier (separate research tier)', r.reference_anchored_regions || 'no eligible region'], ['Collection', `${r.collection} (${r.sequences_in_collection} sequence${r.sequences_in_collection > 1 ? 's' : ''})`],
    ['Barcode-gap role', r.gap_role || 'none'], ['Review priority', r.review_priority]].map(([k, v]) => `<dt>${esc(k)}</dt><dd>${fmt(v)}</dd>`).join('');
  $('checks').innerHTML = [['ITS1 start', r.crosscheck?.ITS1_start], ['ITS2 end', r.crosscheck?.ITS2_end]].map(([k, v]) => { const o = outcome(v);
    return `<tr><td>${k}</td><td><span class="pill ${o.cls}">${esc(o.label)}</span></td><td class="muted">${esc(o.detail || (o.cls === 'agree' ? 'independent references place the boundary within 2 bases of ITSx' : o.cls === 'minor' ? 'kept as explicit boundary uncertainty; the region stays eligible' : 'region withheld from the primary tier until reviewed; the ITSx position is kept'))}</td></tr>`; }).join('');
  $('flags').innerHTML = r.flags.length ? '<ul>' + r.flags.map(f => `<li><span class="pill flag">${esc(f)}</span> ${esc(FLAG[f] || '')}</li>`).join('') + '</ul>' : '<p class="muted">No flags.</p>';
  const v = r.provenance || {};
  $('prov').innerHTML = [['Voucher', v.specimen_voucher], ['Culture', v.culture_collection], ['Strain / isolate', v.strain_or_isolate], ['Clone', v.clone], ['Collected by', v.collected_by],
    ['Date', v.collection_date], ['Country', v.country], ['Region', v.origin], ['Host', v.host], ['Publication', v.publication], ['Study', v.study], ['Identified by', v.identified_by],
    ['Identification basis', r.identification_basis], ['Type relationship', r.type_relationship], ['Name status', r.name_status_note]].map(([k, x]) => `<dt>${esc(k)}</dt><dd>${fmt(x)}</dd>`).join('');
  const c = cases.cases.find(x => x.accession === r.accession && x.release_id === rel.id);
  if (c) { $('casebox').hidden = false; $('caselink').innerHTML = `Priority ${esc(c.priority)} case <a href="/explorer/case/?id=${encodeURIComponent(c.id)}">${esc(c.id)}</a> · outcome from formal reviews: ${esc(c.adjudication)}`; }
})().catch(showError);
