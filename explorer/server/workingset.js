// Genus working sets (contract bre-workingset/1). Called from api.js, which has already verified the caller.
//
// Rules
//  * A snapshot is immutable once imported. The newest snapshot of a genus is the current one.
//  * Changes are append-only and keyed by genus + accession + field, so they carry over to newer snapshots.
//    The effective value of a field is the newest change that has not been undone; otherwise the snapshot's value.
//  * A decided genus question changes the working set at once (effectsOf in the contract). If its outcome later
//    changes (a correction, a dispute), the changes it made are undone and the new outcome's changes are made.
//  * The owner can edit a record by hand (with a reason) and undo any change. An owner's undo of a decision's change
//    is final: later syncs leave that decision's changes alone.
import { WORKINGSET_CONTRACT, ROLES, NAME_KINDS, FIELDS, validateWorkingSet, effectsOf, defaultNameKind } from '../contract/workingset.js';
import { canonical, sha256 } from '../contract/release.js';
import { currentDecisions, adjudicateQuestion } from './decisions.js';

const now = () => new Date().toISOString();

export async function importWorkingSet(env, me, b, h) {
  const text = b && b.workingset_text;
  if (typeof text !== 'string' || !text.length) return h.err(400, 'workingset_text is missing');
  let s; try { s = JSON.parse(text); } catch { return h.err(400, 'the working set is not valid JSON'); }
  const errors = validateWorkingSet(s);
  if (errors.length) return h.err(400, 'the working set was not imported', errors);
  const digest = await sha256(text);
  if (await env.DB.prepare('SELECT id FROM ws_snapshots WHERE id = ? OR sha256 = ?').bind(s.snapshot, digest).first()) return h.err(409, `snapshot ${s.snapshot} already exists; snapshots are immutable`);
  const { records, ...header } = s;
  const st = [env.DB.prepare('INSERT INTO ws_snapshots (id, genus, contract, header_json, sha256, records, imported_at, imported_by) VALUES (?,?,?,?,?,?,?,?)')
    .bind(s.snapshot, s.genus, WORKINGSET_CONTRACT, canonical(header), digest, records.length, now(), me.email)];
  // 5 bound values per record; a statement holds at most 15 records and about 60 kB.
  let chunk = [], bytes = 0;
  const flush = () => { if (!chunk.length) return; st.push(env.DB.prepare(`INSERT INTO ws_records (snapshot_id, accession, role, working_name, record_json) VALUES ${chunk.map(() => '(?,?,?,?,?)').join(',')}`).bind(...chunk.flat())); chunk = []; bytes = 0; };
  for (const r of records) {
    const body = canonical(r); const n = new TextEncoder().encode(body).length;
    if (chunk.length && (chunk.length >= 15 || bytes + n > 60000)) flush();
    chunk.push([s.snapshot, r.accession, r.role, r.working_name, body]); bytes += n;
  }
  flush();
  st.push(await h.auditStmt(env, me.email, 'import working-set snapshot', s.snapshot, { sha256: digest, genus: s.genus, records: records.length }));
  await env.DB.batch(st);
  const sync = await syncGenus(env, s.genus, me.email, h);
  return h.json({ imported: true, snapshot: s.snapshot, genus: s.genus, records: records.length, sha256: digest, decisions_applied: sync }, 201);
}

async function latestSnapshot(env, genus) {
  return env.DB.prepare('SELECT * FROM ws_snapshots WHERE genus = ? ORDER BY imported_at DESC, id DESC LIMIT 1').bind(genus).first();
}
async function changesOf(env, genus) {
  return (await env.DB.prepare('SELECT * FROM ws_changes WHERE genus = ? ORDER BY id').bind(genus).all()).results;
}
// Active changes: not undo rows, and not undone.
export function activeChanges(changes) {
  const undone = new Set(changes.filter(c => c.undoes != null).map(c => c.undoes));
  return changes.filter(c => c.undoes == null && !undone.has(c.id));
}
// Effective value of each field for each accession: { accession: { field: change } } (the newest active change).
function effectiveMap(changes) {
  const m = {};
  for (const c of activeChanges(changes)) (m[c.accession] ||= {})[c.field] = c;
  return m;
}

async function loadWorkingSet(env, genus, withSequence) {
  const snap = await latestSnapshot(env, genus);
  if (!snap) return null;
  const rows = (await env.DB.prepare('SELECT accession, record_json FROM ws_records WHERE snapshot_id = ?').bind(snap.id).all()).results;
  const changes = await changesOf(env, genus); const eff = effectiveMap(changes);
  const inSnap = new Set(rows.map(r => r.accession));
  const records = rows.map(r => {
    const x = JSON.parse(r.record_json); const e = eff[r.accession] || {};
    const base = { role: x.role, working_name: x.working_name, name_kind: defaultNameKind(x.working_name) };
    const out = { ...x, role: e.role ? e.role.value : base.role, working_name: e.working_name ? e.working_name.value : base.working_name,
      name_kind: e.name_kind ? e.name_kind.value : (e.working_name ? defaultNameKind(e.working_name.value) : base.name_kind),
      snapshot_values: base, changed: Object.fromEntries(Object.entries(e).map(([f, c]) => [f, { id: c.id, value: c.value, reason: c.reason, source: c.source, decision_ref: c.decision_ref, actor: c.actor, at: c.created_at }])) };
    if (!withSequence) delete out.sequence;
    return out;
  });
  const orphan = activeChanges(changes).filter(c => !inSnap.has(c.accession));
  return { snap, records, changes, orphan };
}

export async function listWorkingSets(env, h) {
  const gs = (await env.DB.prepare('SELECT DISTINCT genus FROM ws_snapshots ORDER BY genus').all()).results;
  const out = [];
  for (const { genus } of gs) {
    const w = await loadWorkingSet(env, genus, false);
    const roles = {}; for (const r of w.records) roles[r.role] = (roles[r.role] || 0) + 1;
    out.push({ genus, snapshot: w.snap.id, imported_at: w.snap.imported_at, records: w.records.length, roles, active_changes: activeChanges(w.changes).length });
  }
  return h.json({ working_sets: out });
}

export async function getWorkingSet(env, genus, h) {
  const w = await loadWorkingSet(env, genus, false);
  if (!w) return h.err(404, `no working set for ${genus}; the owner imports one on the set-up page`);
  return h.json({ genus, snapshot: { id: w.snap.id, imported_at: w.snap.imported_at, header: JSON.parse(w.snap.header_json), sha256: w.snap.sha256 },
    roles: ROLES, name_kinds: NAME_KINDS, records: w.records,
    changes_not_in_snapshot: w.orphan.map(c => ({ id: c.id, accession: c.accession, field: c.field, value: c.value, reason: c.reason })) });
}

export async function getChanges(env, genus, h) {
  const changes = await changesOf(env, genus); const undone = new Map(changes.filter(c => c.undoes != null).map(c => [c.undoes, c]));
  return h.json({ genus, changes: changes.slice().reverse().map(c => ({ ...c, undone_by: undone.get(c.id) ? { id: undone.get(c.id).id, reason: undone.get(c.id).reason, actor: undone.get(c.id).actor, at: undone.get(c.id).created_at } : null })) });
}

const csvCell = v => { const s = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const label = r => `${r.accession} ${r.working_name}${r.type_material ? ' [' + r.type_material + ']' : ''}${r.country ? ' | ' + r.country.split(':')[0] : ''}`.replace(/\s+/g, ' ');
// FASTA or CSV of the effective working set. roles: the roles to include (default: references, included, outgroup).
export async function exportWorkingSet(env, me, genus, format, roles, h) {
  const w = await loadWorkingSet(env, genus, true);
  if (!w) return h.err(404, `no working set for ${genus}`);
  const keep = roles && roles.length ? new Set(roles) : new Set(['type_reference', 'working_reference', 'included', 'outgroup']);
  const recs = w.records.filter(r => keep.has(r.role)).sort((a, b) => a.working_name.localeCompare(b.working_name) || a.accession.localeCompare(b.accession));
  const stamp = `${genus.toLowerCase()}-${w.snap.id}-${activeChanges(w.changes).length}changes`;
  let body, type, ext;
  if (format === 'csv') {
    const cols = ['accession', 'working_name', 'name_kind', 'role', 'name_as_deposited', 'type_material', 'voucher', 'country', 'lat_lon', 'collection_date', 'collection', 'regions', 'length', 'first_author', 'study', 'publication', 'pubmed', 'engine_match', 'role_reason', 'changed_by'];
    body = cols.join(',') + '\n' + recs.map(r => cols.map(c => csvCell(c === 'changed_by' ? Object.values(r.changed).map(x => x.source === 'decision' ? x.decision_ref : 'manual: ' + x.reason).join('; ') : r[c])).join(',')).join('\n') + '\n';
    type = 'text/csv; charset=utf-8'; ext = 'csv';
  } else {
    body = recs.map(r => `>${label(r)}\n${r.sequence.replace(/(.{80})/g, '$1\n').replace(/\n$/, '')}`).join('\n') + '\n';
    type = 'text/plain; charset=utf-8'; ext = 'fasta';
  }
  await h.audit(env, me.email, `export working set (${ext})`, genus, { snapshot: w.snap.id, records: recs.length, roles: [...keep] });
  return new Response(body, { status: 200, headers: { 'content-type': type, 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow',
    'x-content-type-options': 'nosniff', 'content-disposition': `attachment; filename="${stamp}.${ext}"` } });
}

function checkValue(field, value) {
  if (!FIELDS.includes(field)) return `field must be one of ${FIELDS.join(', ')}`;
  if (field === 'role' && !ROLES[value]) return `role must be one of ${Object.keys(ROLES).join(', ')}`;
  if (field === 'name_kind' && !NAME_KINDS[value]) return `name_kind must be one of ${Object.keys(NAME_KINDS).join(', ')}`;
  if (field === 'working_name' && !(typeof value === 'string' && value.trim().length > 2 && value.length <= 200)) return 'give a working name (3–200 characters)';
  return null;
}

export async function postChange(env, me, genus, b, h) {
  const snap = await latestSnapshot(env, genus);
  if (!snap) return h.err(404, `no working set for ${genus}`);
  const accs = Array.isArray(b.accessions) ? [...new Set(b.accessions.map(String))] : [String(b.accession || '')];
  const errors = [];
  const e = checkValue(b.field, b.value); if (e) errors.push(e);
  if (!String(b.reason || '').trim()) errors.push('give the reason for the change');
  if (String(b.reason || '').length > 4000) errors.push('the reason is too long');
  if (!accs.length || accs.length > 500) errors.push('give between 1 and 500 accessions');
  const have = new Set((await env.DB.prepare('SELECT accession FROM ws_records WHERE snapshot_id = ?').bind(snap.id).all()).results.map(r => r.accession));
  const missing = accs.filter(a => !have.has(a)); if (missing.length) errors.push(`not in the current snapshot: ${missing.slice(0, 10).join(', ')}`);
  if (errors.length) return h.err(400, 'the change was not saved', errors);
  const value = b.field === 'working_name' ? String(b.value).trim() : b.value; const t = now();
  const st = accs.map(a => env.DB.prepare('INSERT INTO ws_changes (genus, accession, field, value, reason, source, decision_ref, undoes, actor, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(genus, a, b.field, value, String(b.reason).trim(), 'manual', null, null, me.email, t));
  st.push(await h.auditStmt(env, me.email, 'change working set', genus, { accessions: accs, field: b.field, value, reason: b.reason }));
  await env.DB.batch(st);
  return h.json({ saved: true, changes: accs.length }, 201);
}

export async function undoChange(env, me, genus, id, b, h) {
  const c = await env.DB.prepare('SELECT * FROM ws_changes WHERE id = ? AND genus = ?').bind(id, genus).first();
  if (!c) return h.err(404, 'no such change');
  if (c.undoes != null) return h.err(400, 'an undo cannot itself be undone; make a new change instead');
  if (await env.DB.prepare('SELECT id FROM ws_changes WHERE undoes = ?').bind(id).first()) return h.err(409, 'this change has already been undone');
  const reason = String((b && b.reason) || '').trim();
  if (!reason) return h.err(400, 'give the reason for undoing the change');
  await env.DB.batch([env.DB.prepare('INSERT INTO ws_changes (genus, accession, field, value, reason, source, decision_ref, undoes, actor, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(genus, c.accession, c.field, null, reason, 'manual', c.decision_ref, id, me.email, now()),
    await h.auditStmt(env, me.email, 'undo working-set change', `${genus}/${id}`, { reason })]);
  return h.json({ undone: true, change: id });
}

// Bring the working set in line with the current outcomes of a genus's questions (all of them, or one question).
export async function syncGenus(env, genus, actor, h, only) {
  const ready = (await env.DB.prepare("SELECT id FROM schema_migrations WHERE id = '0005_working_sets'").first());
  if (!ready) return null;
  const qs = only
    ? (await env.DB.prepare('SELECT q.set_id, q.id, q.type, q.reviewers_needed, q.body_json FROM questions q WHERE q.set_id = ? AND q.id = ?').bind(only.set_id, only.question_id).all()).results
    : (await env.DB.prepare(`SELECT q.set_id, q.id, q.type, q.reviewers_needed, q.body_json FROM questions q JOIN question_sets s ON s.id = q.set_id WHERE s.genus = ? ORDER BY s.imported_at, q.id`).bind(genus).all()).results;
  if (!qs.length) return { questions: 0, made: 0, undone: 0 };
  const dec = only
    ? (await env.DB.prepare('SELECT * FROM decisions WHERE set_id = ? AND question_id = ? ORDER BY id').bind(only.set_id, only.question_id).all()).results
    : (await env.DB.prepare('SELECT d.* FROM decisions d JOIN question_sets s ON s.id = d.set_id WHERE s.genus = ? ORDER BY d.id').bind(genus).all()).results;
  const by = {}; for (const d of dec) (by[`${d.set_id}/${d.question_id}`] ||= []).push(d);
  const changes = await changesOf(env, genus); const active = activeChanges(changes);
  const manualUndo = new Set(changes.filter(c => c.undoes != null && c.source === 'manual' && c.decision_ref).map(c => c.decision_ref));
  const st = []; let made = 0, undone = 0; const t = now();
  for (const q of qs) {
    const ref = `${q.set_id}/${q.id}`;
    if (manualUndo.has(ref)) continue;
    const a = adjudicateQuestion(currentDecisions(by[ref] || []).filter(d => d.mode === 'formal'), q.reviewers_needed);
    const want = effectsOf(JSON.parse(q.body_json), a);
    const key = e => `${e.accession}|${e.field}|${e.value}`;
    const have = active.filter(c => c.source === 'decision' && c.decision_ref === ref);
    const wantKeys = new Set(want.map(key)), haveKeys = new Set(have.map(key));
    for (const c of have) if (!wantKeys.has(key(c))) {
      st.push(env.DB.prepare('INSERT INTO ws_changes (genus, accession, field, value, reason, source, decision_ref, undoes, actor, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .bind(genus, c.accession, c.field, null, `${q.id}: the outcome changed (${a.status})`, 'decision', ref, c.id, actor, t)); undone++;
    }
    for (const e of want) if (!haveKeys.has(key(e))) {
      st.push(env.DB.prepare('INSERT INTO ws_changes (genus, accession, field, value, reason, source, decision_ref, undoes, actor, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .bind(genus, e.accession, e.field, e.value, e.reason, 'decision', ref, null, actor, t)); made++;
    }
  }
  if (st.length) {
    st.push(await h.auditStmt(env, actor, 'apply decisions to working set', genus, { made, undone, only: only || null }));
    for (let i = 0; i < st.length; i += 50) await env.DB.batch(st.slice(i, i + 50));
  }
  return { questions: qs.length, made, undone };
}
