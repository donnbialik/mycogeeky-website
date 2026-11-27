// Client code of the genus decisions list (a data-free shell; questions come only from the authenticated API).
import { offerTour } from './tour.js';
import { api, esc, $, whoami, showError } from './common.js';
import { QUESTION_TYPES } from '../../../explorer/contract/questions.js';
let sets = [], view = null;
const outcomePill = o => `<span class="pill ${o === 'decided' ? 'agree' : o === 'disputed' ? 'conflict' : o === 'open' ? '' : 'minor'}">${esc(o)}</span>`;
function strip(s) {
  $('xp-release').innerHTML = s ? `<strong>${esc(s.genus)} report ${esc(s.id)}</strong> · GenBank snapshot ${esc(s.snapshot)} · engine ${esc(s.header.engine)} · ${s.questions} questions ·
    <strong>computationally generated; answers are recorded separately and nothing here renames a record</strong>` : '<strong>No genus question set has been imported yet.</strong> The owner imports one from the set-up page.';
}
function draw() {
  const k = $('kind').value, o = $('outcome').value, m = $('mine').value, u = $('queue').value;
  const rows = view.questions.filter(q => (!k || q.type === k) && (!o || q.outcome === o) && (!m || (m === 'none' ? !q.my_choice && !q.my_pass : m === 'pass' ? q.my_pass : !!q.my_choice)) && (!u || q.queue === u))
    .sort((a, b) => (a.queue === 'first' ? 0 : 1) - (b.queue === 'first' ? 0 : 1));
  $('rows').innerHTML = rows.map(q => `<tr><td><a href="/explorer/decision/?set=${encodeURIComponent(view.set.id)}&id=${encodeURIComponent(q.id)}">${esc(q.id)}</a>${q.queue === 'first' ? ' <span class="pill test">first queue</span>' : ''}<div class="muted small">${esc(q.question.slice(0, 140))}${q.question.length > 140 ? '…' : ''}</div>${q.queue === 'first' && q.queue_reason ? `<div class="small">Why first: ${esc(q.queue_reason.replace(/^Q-[A-Z]+:\s*/, ''))}</div>` : ''}</td>
    <td>${outcomePill(q.outcome)}${q.passes ? `<div class="muted small" title="Reviewers who marked it as beyond their expertise">${q.passes} passed</div>` : ''}</td><td>${q.my_choice ? `${esc(q.my_choice)} <span class="pill ${esc(q.my_mode)}">${esc(q.my_mode)}</span>` : q.my_pass ? '<span class="muted">beyond my expertise</span>' : '<span class="muted">none</span>'}</td>
    <td>${esc(q.kind)}</td><td>${/^unnamed group:/i.test(q.subject) ? `unnamed group: <em>${esc(q.subject.replace(/^unnamed group:\s*/i, ''))}</em>` : `<em>${esc(q.subject)}</em>`}</td><td>${q.reviewers_needed}</td><td>${q.records_affected}</td></tr>`).join('') || '<tr><td colspan="7">No questions match.</td></tr>';
}
async function load(id) {
  view = await api('question-sets/' + encodeURIComponent(id)); strip(view.set);
  $('scope').textContent = view.scope ? `You can answer questions for ${view.scope.join(', ')}; other genera are read-only for you.` : '';
  const types = [...new Set(view.questions.map(q => q.type))].sort();
  $('kind').innerHTML = '<option value="">all</option>' + types.map(t => `<option value="${t}">${esc(QUESTION_TYPES[t])}</option>`).join('');
  // A set with a first review queue opens on it; older sets without one show everything.
  const queued = view.questions.some(q => q.queue);
  $('queue').disabled = !queued; $('queue').value = queued ? 'first' : '';
  history.replaceState(null, '', '?set=' + encodeURIComponent(id)); draw();
}
(async () => {
  const [me, l] = await Promise.all([api('me'), api('question-sets')]); whoami(me); sets = l.sets;
  if (!sets.length) { strip(null); $('rows').innerHTML = '<tr><td colspan="7">No questions yet.</td></tr>'; return; }
  const want = new URLSearchParams(location.search).get('set');
  // The newest set of each genus is the current report; earlier sets stay readable, with their answers, but are marked.
  const latest = {}; for (const s of sets) if (!latest[s.genus] || s.imported_at > latest[s.genus].imported_at) latest[s.genus] = s;
  const current = sets.filter(s => latest[s.genus] === s), older = sets.filter(s => latest[s.genus] !== s);
  const opt = (s, old) => `<option value="${esc(s.id)}">${esc(s.genus)} · ${esc(s.snapshot)} · ${esc(s.id)}${old ? ' · older version' : ''} (${Object.entries(s.status_counts).map(([k, v]) => `${v} ${k}`).join(', ')})</option>`;
  $('set').innerHTML = current.map(s => opt(s, false)).join('') + (older.length ? `<optgroup label="Older versions">${older.map(s => opt(s, true)).join('')}</optgroup>` : '');
  $('set').value = sets.some(s => s.id === want) ? want : current[0].id;
  await load($('set').value);
  $('set').addEventListener('change', () => load($('set').value).catch(showError));
  for (const id of ['kind', 'outcome', 'mine', 'queue']) $(id).addEventListener('change', draw);
  offerTour('decisions', () => [
    { title: 'Welcome to Genus decisions', text: 'Each genus review report raises questions that need a taxonomist’s judgement. This short tour shows where things are. You can replay it any time with “Take the tour”.' },
    { title: 'Choose a report', text: 'One report per genus. The newest is the current one; older versions stay readable with their answers.', target: '#set' },
    { title: 'Start with the first queue', text: 'The first queue holds the few questions whose answers could change a species’ barcode gap or set a reference sequence. Choose “all” to see every question.', target: '#queue' },
    { title: 'What is left for you', text: '“Not answered yet” hides the questions you have answered or marked as beyond your expertise.', target: '#mine' },
    { title: 'The questions', text: 'Open a question to see its evidence and records and to answer it. First-queue questions say why they are first.', target: '#listBox' },
    { title: 'How answers count', text: 'Questions that move records between names need two reviewers giving the same formal answer; the others need one. Test answers never count.', target: '#howCount' },
  ], $('tourBtn'));
})().catch(showError);
