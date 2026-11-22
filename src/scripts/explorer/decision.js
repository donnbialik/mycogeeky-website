// Client code of one genus decision question (a data-free shell; the question comes only from the authenticated API).
import { api, post, esc, $, whoami, showError } from './common.js';
import { needsDetail } from '../../../explorer/contract/questions.js';
const P = new URLSearchParams(location.search); const setId = P.get('set'), qid = P.get('id');
let v, order = [];
// Distances: one decimal at 1% and above, two below (small differences matter there).
const num = x => { const n = Number(x); return Number.isFinite(n) && String(x).trim() !== '' && /^-?[0-9.]+$/.test(String(x).trim()) && !Number.isInteger(n) ? (Math.abs(n) >= 1 ? n.toFixed(1) : n.toFixed(2)) : x; };
// GenBank accessions anywhere in the question or the evidence link to the GenBank record.
const ACC = /\b([A-Z]{1,2}_?\d{5,8}(?:\.\d{1,2})?)\b/g;
const gb = a => `<a href="https://www.ncbi.nlm.nih.gov/nuccore/${encodeURIComponent(a)}" target="_blank" rel="noopener noreferrer">${esc(a)}</a>`;
const linked = t => esc(t).replace(ACC, m => gb(m));
const ACC_KEYS = { accessions: 'GenBank records', type_sequences: 'Type sequences', reference_sequences: 'Reference sequences', records: null };
function accList(xs) {
  const N = 12; const head = xs.slice(0, N).map(gb).join(', ');
  return xs.length <= N ? head : `${head} <details style="display:inline"><summary>all ${xs.length}</summary>${xs.slice(N).map(gb).join(', ')}</details>`;
}
// Links to sources: only https addresses on these hosts are shown as links; anything else stays text.
const HOSTS = { 'pubmed.ncbi.nlm.nih.gov': 'PubMed', 'www.ncbi.nlm.nih.gov': 'GenBank', 'www.indexfungorum.org': 'Index Fungorum record', 'doi.org': 'DOI',
  'www.gbif.org': 'GBIF', 'mycomap.org': 'MycoMap', 'www.mycobank.org': 'MycoBank' };
const srcLink = u => { try { const x = new URL(u); return x.protocol === 'https:' && HOSTS[x.hostname] ? `<a href="${esc(x.href)}" target="_blank" rel="noopener noreferrer">${esc(HOSTS[x.hostname])}</a>` : null; } catch { return null; } };
const tidy = t => String(t).replace(/(\d+\.\d{2,})%/g, (m, d) => num(d) + '%');
const label = k => ({ basis: 'Basis', study: 'Study', records: 'Records', collections: 'Collections', us_records: 'US records', countries: 'Countries', regions_compared: 'Compared on',
  names_as_deposited: 'Names as deposited', us_states: 'US states', nearest_anchor: 'Nearest reference', nearest_anchor_distance_min: 'Distance to nearest reference (%)',
  spread_full_ITS_max: 'Largest distance within the group (%)', wider_group: 'Related group', voucher: 'Voucher', if_name: 'Index Fungorum name', if_status: 'Index Fungorum status',
  if_match: 'How the Index Fungorum entry was matched', index_fungorum: 'Index Fungorum', pubmed: 'Paper', authority: 'Authors of the name (Index Fungorum)',
  first_author: 'First author of the GenBank record', study: 'GenBank study title', reading: 'Reading', source: 'Source', names: 'Names', regions: 'Compared on', flags: 'Flags' }[k] || k.replace(/_/g, ' '));
const val = x => x == null || x === '' ? '<span class="muted">not recorded</span>'
  : Array.isArray(x) ? esc(x.join(', ')) : typeof x === 'object' ? esc(Object.entries(x).map(([a, b]) => `${a} (${typeof b === 'object' ? JSON.stringify(b) : num(b)})`).join(', ')) : esc(num(x));
function render() {
  const q = v.question, s = v.set;
  document.title = q.id + ' · Explorer';
  $('back').href = '/explorer/decisions/?set=' + encodeURIComponent(s.id);
  $('qid').textContent = `${s.genus} · report ${s.id} · question ${q.id} · ${v.evidence_sha256.slice(0, 12)}`;
  $('title').innerHTML = `${esc(q.kind)}: <em>${linked(String(q.subject).replace(/^unnamed group:\s*/i, ''))}</em>`;
  $('backList').href = '/explorer/decisions/?set=' + encodeURIComponent(s.id);
  $('kind').textContent = `${q.records_affected} records affected · needs ${q.reviewers_needed} reviewer${q.reviewers_needed > 1 ? 's' : ''} giving the same answer`;
  $('xp-release').innerHTML = `<strong>${esc(s.genus)} report ${esc(s.id)}</strong> · GenBank snapshot ${esc(s.snapshot)} · engine ${esc(s.header.engine)} · <strong>computationally generated question</strong>`;
  $('question').innerHTML = linked(tidy(q.question));
  const ev = Object.entries(q.evidence || {});
  $('evidence').innerHTML = (ev.filter(([k, x]) => !(k in ACC_KEYS) && x != null && x !== '').map(([k, x]) => `<dt>${esc(label(k))}</dt><dd>${typeof x === 'string' ? (srcLink(x) || linked(num(x))) : val(x)}</dd>`).join('')
    + ev.filter(([k, x]) => ACC_KEYS[k] && Array.isArray(x) && x.length).map(([k, x]) => `<dt>${ACC_KEYS[k]} (${x.length})</dt><dd>${accList(x)}</dd>`).join(''))
    || '<dt>Evidence</dt><dd class="muted">none beyond the question</dd>';
  const rs = Array.isArray((q.evidence || {}).records) ? q.evidence.records : [];
  $('recordsBox').hidden = !rs.length;
  $('recordsHead').textContent = `The records (${rs.length})`;
  $('records').innerHTML = rs.map(r => `<tr><td>${gb(r.accession)}</td><td>${esc(r.role === 'record' ? '' : r.role)}${r.type_material ? `<div class="small">${esc(r.type_material)}</div>` : ''}</td>
    <td><em>${esc(r.name_as_deposited || '')}</em></td><td>${esc(r.country || '')}</td><td class="small">${esc(r.voucher || '')}</td><td class="gr-n">${r.length ?? ''}</td><td class="small">${esc(r.first_author || '')}${r.study && r.study !== r.first_author ? `<div class="muted">${esc(r.study)}</div>` : ''}${r.pubmed && srcLink(r.pubmed) ? `<div>${srcLink(r.pubmed)}</div>` : ''}</td></tr>`).join('');
  const o = v.outcome;
  $('outcome').textContent = o.status === 'decided' ? `decided: ${o.choice}${o.detail ? ' (' + o.detail + ')' : ''}` : o.status;
  $('rule').textContent = q.reviewers_needed === 2 ? `This question needs two reviewers giving the same answer (${o.formal_reviewers} formal so far).` : 'One formal answer decides this question.';
  $('prior').innerHTML = v.prior ? `<div class="xp-msg ${v.prior.evidence_changed ? 'bad' : 'ok'} small"><strong>Earlier report ${esc(v.prior.set)} (${esc(v.prior.snapshot)}) decided:</strong> ${esc(v.prior.choice)}${v.prior.detail ? ' (' + esc(v.prior.detail) + ')' : ''}. ${v.prior.evidence_changed ? 'The evidence has changed since, so the question is asked again.' : 'The evidence is the same.'}</div>` : '';
  $('options').innerHTML = q.options.map((x, i) => `<label style="display:block;margin:6px 0"><input type="radio" name="choice" value="${esc(x)}" id="opt${i}" /> ${esc(x)}</label>`).join('');
  const mp = v.my_previous;
  $('myPrev').innerHTML = mp && !v.my_decisions.length ? `<div class="xp-msg info small"><strong>Your answer on ${esc(mp.set)}:</strong> ${esc(mp.choice)}${mp.detail ? ': ' + esc(mp.detail) : ''} <span class="pill ${esc(mp.mode)}">${esc(mp.mode)}</span>
    <div>${esc(mp.rationale)}</div>${mp.evidence_changed ? '<div>The evidence has changed since; check it before reusing the answer.</div>' : ''}
    <button type="button" class="secondary" id="reuse">Use this answer again</button></div>` : '';
  const may = v.may_decide; for (const el of $('f').querySelectorAll('input,textarea,button')) el.disabled = !may;
  if (!may) $('msg').innerHTML = '<div class="xp-msg info">You can read this question but not answer it (observer, or a reviewer for other genera).</div>';
}
function renderAnswers() {
  const sup = new Set(v.my_decisions.filter(d => d.supersedes).map(d => d.supersedes));
  $('hist').innerHTML = v.my_decisions.length ? v.my_decisions.slice().reverse().map(d => `<li class="${sup.has(d.id) ? 'sup' : ''}"><span class="pill ${d.mode}">${d.mode}</span> <strong>${esc(d.choice)}</strong>${d.detail ? ': ' + esc(d.detail) : ''}
      <div class="muted small">#${d.id} · ${esc(d.created_at)}${d.supersedes ? ' · corrects #' + d.supersedes : ''}${sup.has(d.id) ? ' · corrected' : ''}</div><div>${esc(d.rationale)}</div>${d.citation ? `<div class="muted small">${esc(d.citation)}</div>` : ''}</li>`).join('')
    : '<li class="muted">You have not answered this question yet.</li>';
  $('others').innerHTML = v.others_hidden
    ? `<p class="muted small">${v.others_count} other reviewer${v.others_count === 1 ? ' has' : 's have'} answered. Their answers stay hidden until you give yours, so that answers are independent.</p>`
    : (v.others.length ? '<h3>Other reviewers</h3><ul class="xp-history">' + v.others.map(d => `<li><span class="pill ${d.mode}">${d.mode}</span> <strong>${esc(d.reviewer)}</strong>: ${esc(d.choice)}${d.detail ? ': ' + esc(d.detail) : ''}<div>${esc(d.rationale)}</div>${d.citation ? `<div class="muted small">${esc(d.citation)}</div>` : ''}</li>`).join('') + '</ul>' : '');
  const cur = v.my_decisions.filter(d => !sup.has(d.id)).pop();
  const i = order.findIndex(x => x.id === qid);
  const next = order.slice(i + 1).concat(order.slice(0, Math.max(0, i))).find(x => !x.my_choice && x.id !== qid);
  $('nextQ').hidden = !next; if (next) $('nextQ').href = `/explorer/decision/?set=${encodeURIComponent(setId)}&id=${encodeURIComponent(next.id)}`;
  $('supNote').textContent = cur ? `Saving now records a correction of your answer #${cur.id}. The earlier answer stays in the history.` : '';
}
$('myPrev').addEventListener('click', ev => {
  if (ev.target.id !== 'reuse' || !v.my_previous) return; const mp = v.my_previous;
  const r = [...document.querySelectorAll('input[name=choice]')].find(x => x.value === mp.choice); if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
  $('detail').value = mp.detail || ''; $('rationale').value = mp.rationale || ''; $('citation').value = mp.citation || '';
  const f = document.querySelector(`input[name=mode][value=${mp.mode}]`); if (f && !f.disabled) f.checked = true;
  $('msg').className = 'xp-msg info'; $('msg').textContent = 'Your earlier answer is filled in. Check it against the evidence, then save.';
});
$('options').addEventListener('change', () => { const c = (document.querySelector('input[name=choice]:checked') || {}).value; const need = c && needsDetail(c);
  $('detailBox').hidden = !need; $('detailHint').textContent = need ? `(${c})` : ''; });
async function load() {
  const [me, x] = await Promise.all([api('me'), api(`question-sets/${encodeURIComponent(setId)}/questions/${encodeURIComponent(qid)}`)]);
  v = x; whoami(me); order = (await api('question-sets/' + encodeURIComponent(setId))).questions; render(); renderAnswers();
  $('formalRadio').disabled = !me.formal_reviews_enabled || !v.may_decide;
  $('modeNote').textContent = me.formal_reviews_enabled ? 'Formal answers count toward the outcome.' : 'Formal answers are not enabled for your account yet. Test answers are saved and shown, but never count.';
}
$('f').addEventListener('submit', async ev => {
  ev.preventDefault();
  const sup = new Set(v.my_decisions.filter(d => d.supersedes).map(d => d.supersedes)); const cur = v.my_decisions.filter(d => !sup.has(d.id)).pop();
  const body = { set_id: setId, question_id: qid, choice: (document.querySelector('input[name=choice]:checked') || {}).value, detail: $('detail').value, rationale: $('rationale').value,
    citation: $('citation').value, evidence_sha256: v.evidence_sha256, mode: document.querySelector('input[name=mode]:checked').value, supersedes: cur ? cur.id : null };
  const m = $('msg');
  try { const r = await post('decisions', body);
    [v, { questions: order }] = await Promise.all([api(`question-sets/${encodeURIComponent(setId)}/questions/${encodeURIComponent(qid)}`), api('question-sets/' + encodeURIComponent(setId))]);
    render(); renderAnswers(); ev.target.reset(); $('detailBox').hidden = true;
    m.className = 'xp-msg ok'; m.innerHTML = `Saved as ${esc(r.mode)} answer #${r.decision_id}. Outcome now: <strong>${esc(v.outcome.status)}</strong>. <a href="${esc($('backList').href)}">Back to all questions</a>${$('nextQ').hidden ? '' : ` · <a href="${esc($('nextQ').href)}">Next question you haven't answered</a>`}`; }
  catch (e) { m.className = 'xp-msg bad'; m.innerHTML = '<strong>The answer was not saved.</strong><ul>' + (e.detail || [e.message]).map(x => `<li>${esc(x)}</li>`).join('') + '</ul>'; }
});
load().catch(showError);
