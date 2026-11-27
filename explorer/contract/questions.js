// Data contract between the engine and the website for genus review questions: bre-questions/1.
// A question set is the decision queue of one genus review report (one GenBank snapshot). It is immutable once
// imported. Reviewers answer the questions on the website; the answers form the decision ledger, which the engine
// reads back on its next run. Used by the server (import checks), the admin page (checks before upload) and the tests.

export const QUESTIONS_CONTRACT = 'bre-questions/1';
// Question types (engine harness/genus/genus_report.py). TWO_REVIEWER types change which name records belong to.
export const QUESTION_TYPES = {
  D1: 'Accept a reference sequence', D2: 'Add a reference sequence', D3: 'Types ITS cannot tell apart', D4: 'Possible misapplied name',
  D5: 'Unnamed group', D6: 'Record problem', D7: 'Type sequences too short', D8: 'Herbarium type under another name', D9: 'Type filed under another genus',
  D10: 'Synonym types disagree',
};
export const QUEUES = ['first', 'later'];
export const TWO_REVIEWER_TYPES = ['D3', 'D4', 'D5', 'D8', 'D9', 'D10'];
const SET_ID = /^[a-z0-9][a-z0-9-]{1,63}$/;
const Q_ID = /^[A-Z]{2,4}-D(?:[1-9]|1\d)-\d{3,4}$/;
const GENUS = /^[A-Z][a-z]+$/;
// An option that asks for a name or an accession needs the reviewer to give it; its text is then part of the answer.
export const needsDetail = option => /\(give|^other$/i.test(String(option));

export function validateQuestionSet(s) {
  const e = [];
  if (!s || typeof s !== 'object') return ['the question set is not a JSON object'];
  if (s.contract !== QUESTIONS_CONTRACT) e.push(`contract must be "${QUESTIONS_CONTRACT}"`);
  if (!SET_ID.test(s.set || '')) e.push('set must be a short lowercase id such as "galerina-2026-11-21"');
  if (!GENUS.test(s.genus || '')) e.push('genus must be a genus name such as "Galerina"');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.snapshot || '')) e.push('snapshot must be the GenBank retrieval date, YYYY-MM-DD');
  if (!s.engine || typeof s.engine !== 'string') e.push('engine version is required');
  if (s.status !== 'computationally generated') e.push('status must be "computationally generated"');
  if (!Array.isArray(s.questions) || !s.questions.length) { e.push('questions must be a non-empty list'); return e; }
  const seen = new Set();
  for (const q of s.questions) {
    const w = `question ${String(q && q.id).slice(0, 20)}`;
    if (!q || typeof q !== 'object') { e.push('each question must be an object'); continue; }
    if (!Q_ID.test(q.id || '')) e.push(`${w}: id must look like GAL-D2-002`);
    if (seen.has(q.id)) e.push(`${w}: duplicate id`); seen.add(q.id);
    if (!QUESTION_TYPES[q.type]) e.push(`${w}: unknown type ${q.type}`);
    if (q.id && q.type && !q.id.includes(`-${q.type}-`)) e.push(`${w}: id and type disagree`);
    if (typeof q.subject !== 'string' || !q.subject) e.push(`${w}: subject is required`);
    if (typeof q.question !== 'string' || !q.question) e.push(`${w}: question text is required`);
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.some(o => typeof o !== 'string' || !o)) e.push(`${w}: at least two options are required`);
    if (q.reviewers_needed !== (TWO_REVIEWER_TYPES.includes(q.type) ? 2 : 1)) e.push(`${w}: reviewers_needed must be ${TWO_REVIEWER_TYPES.includes(q.type) ? 2 : 1} for ${q.type}`);
    if (!Number.isInteger(q.records_affected) || q.records_affected < 0) e.push(`${w}: records_affected must be a whole number`);
    if (q.evidence == null || typeof q.evidence !== 'object') e.push(`${w}: evidence must be an object`);
    // Optional review queue (engine review_queue.py): 'first' questions could change a barcode gap or set a reference.
    if (q.queue !== undefined && !QUEUES.includes(q.queue)) e.push(`${w}: queue must be ${QUEUES.join(' or ')}`);
    if (q.queue_reason !== undefined && (typeof q.queue_reason !== 'string' || q.queue_reason.length > 500)) e.push(`${w}: queue_reason must be a short text`);
    if (JSON.stringify(q).length > 200000) e.push(`${w}: too large`);
  }
  return e;
}
