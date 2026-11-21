// Genus review questions and the decision ledger (contract bre-questions/1). Called from api.js, which has already
// verified the caller's identity and that they are an active reviewer (or the owner).
//
// Rules
//  * A question set is immutable once imported; a new report is a new set.
//  * Decisions are append-only; a correction is a new decision that supersedes the reviewer's previous one.
//  * Every decision is a test decision until the owner enables formal reviews for that person (shared with cases).
//  * The outcome is derived from current FORMAL decisions only. Questions of the types in TWO_REVIEWER_TYPES need
//    two reviewers recording the same answer; different answers make the question disputed.
//  * Independence: other reviewers' answers stay hidden until you have answered (an owner reveal is audited).
//  * A reviewer limited to some genera (reviewer_genera) can read every set but answer only for those genera.
//  * Decisions are pinned to the SHA-256 of the question as shown.
import { QUESTIONS_CONTRACT, QUESTION_TYPES, validateQuestionSet, needsDetail } from '../contract/questions.js';
import { canonical, sha256 } from '../contract/release.js';

const lower = s => String(s || '').trim().toLowerCase();
const now = () => new Date().toISOString();

export function currentDecisions(rows) {
  const superseded = new Set(rows.filter(r => r.supersedes).map(r => r.supersedes));
  const cur = {};
  for (const r of rows) if (!superseded.has(r.id)) cur[r.reviewer_id] = r;
  return Object.values(cur);
}
const answerKey = r => r.choice + '|' + (needsDetail(r.choice) ? lower(r.detail) : '');
// Outcome from current formal decisions. need = reviewers_needed of the question (1 or 2).
export function adjudicateQuestion(formal, need) {
  if (!formal.length) return { status: 'open', formal_reviewers: 0, needed: need };
  if (new Set(formal.map(answerKey)).size > 1) return { status: 'disputed', formal_reviewers: formal.length, needed: need };
  if (formal.length < need) return { status: 'awaiting second reviewer', formal_reviewers: formal.length, needed: need };
  return { status: 'decided', formal_reviewers: formal.length, needed: need, choice: formal[0].choice, detail: formal[0].detail || null };
}
const pub = r => ({ id: r.id, reviewer: r.display_name, mode: r.mode, choice: r.choice, detail: r.detail, rationale: r.rationale, citation: r.citation,
  evidence_sha256: r.evidence_sha256, supersedes: r.supersedes, created_at: r.created_at });

async function scopeOf(env, me) {
  if (me.role === 'owner') return null;
  const rows = (await env.DB.prepare('SELECT genus FROM reviewer_genera WHERE reviewer_id = ?').bind(me.id).all()).results;
  return rows.length ? rows.map(r => r.genus) : null;        // null = every genus
}

export async function importQuestionSet(env, me, b, h) {
  const text = b && b.questions_text;
  if (typeof text !== 'string' || !text.length) return h.err(400, 'questions_text is missing');
  let s; try { s = JSON.parse(text); } catch { return h.err(400, 'the question set is not valid JSON'); }
  const errors = validateQuestionSet(s);
  if (errors.length) return h.err(400, 'the question set was not imported', errors);
  const digest = await sha256(text);
  if (await env.DB.prepare('SELECT id FROM question_sets WHERE id = ? OR sha256 = ?').bind(s.set, digest).first()) return h.err(409, `question set ${s.set} already exists; question sets are immutable`);
  const { questions, ...header } = s;
  const st = [env.DB.prepare('INSERT INTO question_sets (id, genus, snapshot, contract, header_json, sha256, questions, imported_at, imported_by) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(s.set, s.genus, s.snapshot, QUESTIONS_CONTRACT, canonical(header), digest, questions.length, now(), me.email)];
  for (let i = 0; i < questions.length; i += 12) {          // 8 bound values per question; D1 allows 100 per statement
    const chunk = questions.slice(i, i + 12); const vals = [];
    for (const q of chunk) { const body = canonical(q); vals.push(s.set, q.id, q.type, q.subject, q.reviewers_needed, q.records_affected, body, await sha256(body)); }
    st.push(env.DB.prepare(`INSERT INTO questions (set_id, id, type, subject, reviewers_needed, records_affected, body_json, evidence_sha256) VALUES ${chunk.map(() => '(?,?,?,?,?,?,?,?)').join(',')}`).bind(...vals));
  }
  st.push(await h.auditStmt(env, me.email, 'import question set', s.set, { sha256: digest, genus: s.genus, questions: questions.length }));
  // A corrected set replaces earlier sets of the same genus that nobody has answered yet; answered sets stay, as older versions.
  const earlier = (await env.DB.prepare(`SELECT s.id, (SELECT COUNT(*) FROM decisions d WHERE d.set_id = s.id) AS n FROM question_sets s
      WHERE s.genus = ? AND s.id NOT IN (SELECT set_id FROM question_set_withdrawals)`).bind(s.genus).all()).results;
  const replaced = earlier.filter(x => x.n === 0).map(x => x.id), kept = earlier.filter(x => x.n > 0).map(x => x.id);
  for (const id of replaced) {
    st.push(env.DB.prepare('INSERT INTO question_set_withdrawals (set_id, replaced_by, reason, withdrawn_by, at) VALUES (?,?,?,?,?)').bind(id, s.set, 'replaced by a corrected set before any answer', me.email, now()));
    st.push(await h.auditStmt(env, me.email, 'withdraw question set', id, { replaced_by: s.set }));
  }
  await env.DB.batch(st);
  return h.json({ imported: true, set: s.set, genus: s.genus, questions: questions.length, sha256: digest, replaced, kept_as_older_versions: kept }, 201);
}

async function setRow(env, id) {
  const r = await env.DB.prepare(`SELECT s.id, s.genus, s.snapshot, s.header_json, s.sha256, s.questions, s.imported_at, w.replaced_by, w.reason AS withdrawn_reason, w.at AS withdrawn_at
      FROM question_sets s LEFT JOIN question_set_withdrawals w ON w.set_id = s.id WHERE s.id = ?`).bind(id).first();
  return r && { id: r.id, genus: r.genus, snapshot: r.snapshot, header: JSON.parse(r.header_json), sha256: r.sha256, questions: r.questions, imported_at: r.imported_at,
    withdrawn: r.withdrawn_at ? { at: r.withdrawn_at, reason: r.withdrawn_reason, replaced_by: r.replaced_by } : null };
}
async function decisionsOf(env, setId, qid) {
  const sql = 'SELECT d.*, v.display_name FROM decisions d JOIN reviewers v ON v.id = d.reviewer_id WHERE d.set_id = ?' + (qid ? ' AND d.question_id = ?' : '') + ' ORDER BY d.id';
  return (await (qid ? env.DB.prepare(sql).bind(setId, qid) : env.DB.prepare(sql).bind(setId)).all()).results;
}

export async function listSets(env, me, h, withdrawnToo = false) {
  const sets = (await env.DB.prepare(`SELECT id FROM question_sets WHERE ${withdrawnToo ? '1' : "id NOT IN (SELECT set_id FROM question_set_withdrawals)"} ORDER BY genus, imported_at`).all()).results;
  const out = [];
  for (const { id } of sets) {
    const s = await setRow(env, id);
    const qs = (await env.DB.prepare('SELECT id, reviewers_needed FROM questions WHERE set_id = ?').bind(id).all()).results;
    const by = {}; for (const d of await decisionsOf(env, id)) (by[d.question_id] ||= []).push(d);
    const counts = {};
    for (const q of qs) { const st = adjudicateQuestion(currentDecisions(by[q.id] || []).filter(d => d.mode === 'formal'), q.reviewers_needed).status; counts[st] = (counts[st] || 0) + 1; }
    out.push({ ...s, status_counts: counts });
  }
  return h.json({ sets: out, scope: await scopeOf(env, me) });
}

export async function getSet(env, me, setId, h) {
  const s = await setRow(env, setId);
  if (!s) return h.err(404, 'no such question set');
  const qs = (await env.DB.prepare('SELECT set_id, id, type, subject, reviewers_needed, records_affected, body_json FROM questions WHERE set_id = ? ORDER BY type, records_affected DESC, id').bind(setId).all()).results;
  const by = {}; for (const d of await decisionsOf(env, setId)) (by[d.question_id] ||= []).push(d);
  return h.json({ set: s, scope: await scopeOf(env, me), questions: qs.map(q => {
    const cur = currentDecisions(by[q.id] || []); const mine = cur.find(d => d.reviewer_id === me.id); const body = JSON.parse(q.body_json);
    return { id: q.id, type: q.type, kind: QUESTION_TYPES[q.type], subject: q.subject, question: body.question, reviewers_needed: q.reviewers_needed,
      records_affected: q.records_affected, outcome: adjudicateQuestion(cur.filter(d => d.mode === 'formal'), q.reviewers_needed).status,
      my_choice: mine ? mine.choice : null, my_mode: mine ? mine.mode : null };
  }) });
}

export async function getQuestion(env, me, setId, qid, reveal, h) {
  const s = await setRow(env, setId);
  const q = s && await env.DB.prepare('SELECT * FROM questions WHERE set_id = ? AND id = ?').bind(setId, qid).first();
  if (!q) return h.err(404, 'no such question');
  const all = await decisionsOf(env, setId, qid); const cur = currentDecisions(all);
  const mine = all.filter(d => d.reviewer_id === me.id); const answered = cur.some(d => d.reviewer_id === me.id);
  const doReveal = reveal && me.role === 'owner';
  if (doReveal && !answered) await h.audit(env, me.email, 'reveal decisions before own decision', `${setId}/${qid}`, { set: setId, question: qid });
  const show = answered || doReveal;
  // The latest decided outcome for the same question (type and subject) in an earlier set of this genus.
  let prior = null;
  const earlier = (await env.DB.prepare(`SELECT q.set_id, q.evidence_sha256, q.reviewers_needed, s.snapshot FROM questions q JOIN question_sets s ON s.id = q.set_id
      WHERE s.genus = ? AND q.type = ? AND q.subject = ? AND q.set_id <> ? AND s.imported_at < (SELECT imported_at FROM question_sets WHERE id = ?) ORDER BY s.imported_at DESC`)
    .bind(s.genus, q.type, q.subject, setId, setId).all()).results;
  for (const e of earlier) {
    const qq = await env.DB.prepare('SELECT id FROM questions WHERE set_id = ? AND type = ? AND subject = ?').bind(e.set_id, q.type, q.subject).first();
    const a = adjudicateQuestion(currentDecisions(await decisionsOf(env, e.set_id, qq.id)).filter(d => d.mode === 'formal'), e.reviewers_needed);
    if (a.status === 'decided') { prior = { set: e.set_id, snapshot: e.snapshot, question: qq.id, choice: a.choice, detail: a.detail, evidence_changed: e.evidence_sha256 !== q.evidence_sha256 }; break; }
  }
  const scope = await scopeOf(env, me);
  return h.json({ set: s, question: { ...JSON.parse(q.body_json), kind: QUESTION_TYPES[q.type] }, evidence_sha256: q.evidence_sha256,
    outcome: adjudicateQuestion(cur.filter(d => d.mode === 'formal'), q.reviewers_needed), prior,
    may_decide: !s.withdrawn && me.role !== 'observer' && (!scope || scope.includes(s.genus)),
    my_decisions: mine.map(pub), others: show ? all.filter(d => d.reviewer_id !== me.id).map(pub) : null, others_hidden: !show,
    others_count: new Set(all.filter(d => d.reviewer_id !== me.id).map(d => d.reviewer_id)).size });
}

export async function postDecision(env, me, b, h) {
  if (me.role === 'observer') return h.err(403, 'observers cannot record decisions');
  const q = await env.DB.prepare('SELECT q.*, s.genus FROM questions q JOIN question_sets s ON s.id = q.set_id WHERE q.set_id = ? AND q.id = ?').bind(b.set_id, b.question_id).first();
  if (!q) return h.err(404, 'no such question');
  if (await env.DB.prepare('SELECT set_id FROM question_set_withdrawals WHERE set_id = ?').bind(q.set_id).first()) return h.err(409, 'this question set has been withdrawn; answer the current set of this genus');
  const scope = await scopeOf(env, me);
  if (scope && !scope.includes(q.genus)) return h.err(403, `you are a reviewer for ${scope.join(', ')}, not ${q.genus}`);
  const body = JSON.parse(q.body_json); const errors = [];
  if (!body.options.includes(b.choice)) errors.push('choose one of the options shown');
  if (needsDetail(b.choice) && !String(b.detail || '').trim()) errors.push(`this answer needs the detail it asks for (${b.choice})`);
  if (!String(b.rationale || '').trim()) errors.push('give the reasoning behind the decision');
  if (b.evidence_sha256 !== q.evidence_sha256) errors.push('the question has changed since you opened it; reload it before submitting');
  for (const k of ['detail', 'rationale', 'citation']) if (String(b[k] || '').length > 8000) errors.push(`${k} is too long`);
  const mode = b.mode === 'formal' ? 'formal' : 'test';
  if (mode === 'formal' && !me.formal_reviews_enabled) errors.push('formal decisions are not enabled for your account yet; this one can be saved as a test decision');
  if (b.supersedes != null) {
    const prev = await env.DB.prepare('SELECT d.*, (SELECT id FROM decisions WHERE supersedes = d.id) AS superseded_by FROM decisions d WHERE d.id = ?').bind(b.supersedes).first();
    if (!prev || prev.reviewer_id !== me.id || prev.set_id !== q.set_id || prev.question_id !== q.id) errors.push('you can only correct your own decision on this question');
    else if (prev.superseded_by) errors.push('that decision has already been corrected');
    else if (prev.mode === 'formal' && mode === 'test') errors.push('a formal decision cannot be corrected by a test decision');
  } else {
    const open = currentDecisions(await decisionsOf(env, q.set_id, q.id)).find(d => d.reviewer_id === me.id);
    if (open) errors.push(`you have already answered this question (decision #${open.id}); save a correction instead`);
  }
  if (errors.length) return h.err(400, 'the decision was not saved', errors);
  const r = await env.DB.prepare(`INSERT INTO decisions (set_id, question_id, reviewer_id, mode, choice, detail, rationale, citation, evidence_sha256, supersedes, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?) RETURNING id`)
    .bind(q.set_id, q.id, me.id, mode, b.choice, String(b.detail || '').trim() || null, String(b.rationale).trim(), String(b.citation || '').trim() || null,
      b.evidence_sha256, b.supersedes ?? null, now()).first();
  await h.audit(env, me.email, mode === 'formal' ? 'record formal decision' : 'record test decision', `${q.set_id}/${q.id}`, { decision_id: r.id, ...b });
  return h.json({ saved: true, decision_id: r.id, mode }, 201);
}

// The decision ledger of one set, for the engine's next run (owner only): every question with its outcome and the
// current formal decisions behind it.
export async function ledger(env, me, setId, h) {
  const s = await setRow(env, setId);
  if (!s) return h.err(404, 'no such question set');
  const qs = (await env.DB.prepare('SELECT * FROM questions WHERE set_id = ? ORDER BY id').bind(setId).all()).results;
  const by = {}; for (const d of await decisionsOf(env, setId)) (by[d.question_id] ||= []).push(d);
  const entries = qs.map(q => { const formal = currentDecisions(by[q.id] || []).filter(d => d.mode === 'formal'); const a = adjudicateQuestion(formal, q.reviewers_needed);
    return { question: q.id, type: q.type, subject: q.subject, evidence_sha256: q.evidence_sha256, reviewers_needed: q.reviewers_needed, outcome: a.status,
      choice: a.choice ?? null, detail: a.detail ?? null,
      decisions: formal.map(d => ({ id: d.id, reviewer: d.display_name, choice: d.choice, detail: d.detail, rationale: d.rationale, citation: d.citation, at: d.created_at })) }; });
  const body = { contract: 'bre-ledger/1', set: s.id, genus: s.genus, snapshot: s.snapshot, question_set_sha256: s.sha256, exported_at: now(), exported_by: me.email, entries };
  await h.audit(env, me.email, 'export decision ledger', s.id, { decided: entries.filter(e => e.outcome === 'decided').length });
  return h.json(body);
}

export async function getGenera(env, id, h) {
  return h.json({ genera: (await env.DB.prepare('SELECT genus FROM reviewer_genera WHERE reviewer_id = ? ORDER BY genus').bind(id).all()).results.map(r => r.genus) });
}
export async function setGenera(env, me, id, b, h) {
  const r = await env.DB.prepare('SELECT * FROM reviewers WHERE id = ?').bind(id).first();
  if (!r) return h.err(404, 'no such reviewer');
  const genera = Array.isArray(b.genera) ? [...new Set(b.genera.map(g => String(g).trim()).filter(Boolean))] : null;
  if (!genera || genera.some(g => !/^[A-Z][a-z]+$/.test(g))) return h.err(400, 'genera must be a list of genus names (an empty list means every genus)');
  await env.DB.batch([env.DB.prepare('DELETE FROM reviewer_genera WHERE reviewer_id = ?').bind(id),
    ...genera.map(g => env.DB.prepare('INSERT INTO reviewer_genera (reviewer_id, genus) VALUES (?, ?)').bind(id, g)),
    await h.auditStmt(env, me.email, 'set reviewer genera', r.email, { genera })]);
  return h.json({ updated: true, genera });
}

// The owner withdraws a set by hand (for example one imported before this rule existed), if no formal answer exists on it.
export async function withdrawSet(env, me, setId, b, h) {
  const s = await setRow(env, setId);
  if (!s) return h.err(404, 'no such question set');
  if (s.withdrawn) return h.err(409, 'this question set is already withdrawn');
  const n = (await env.DB.prepare("SELECT COUNT(*) AS n FROM decisions WHERE set_id = ? AND mode = 'formal'").bind(setId).first()).n;
  if (n > 0) return h.err(409, `this set has ${n} formal answer${n === 1 ? '' : 's'}; it stays as an older version so that those answers keep their context`);
  const reason = String((b && b.reason) || '').trim() || 'withdrawn by the owner';
  await env.DB.batch([env.DB.prepare('INSERT INTO question_set_withdrawals (set_id, replaced_by, reason, withdrawn_by, at) VALUES (?,?,?,?,?)').bind(setId, (b && b.replaced_by) || null, reason, me.email, now()),
    await h.auditStmt(env, me.email, 'withdraw question set', setId, { reason })]);
  return h.json({ withdrawn: true, set: setId });
}
