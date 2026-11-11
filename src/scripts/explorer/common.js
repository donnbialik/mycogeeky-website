// Shared client code for the Explorer pages. Pages are data-free shells: every piece of evidence comes from the
// authenticated API (/api/explorer/), never from a static file.
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = id => document.getElementById(id);

export async function api(path, opts = {}) {
  const r = await fetch('/api/explorer/' + path, { credentials: 'same-origin', ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
  const text = await r.text(); let b = null; try { b = JSON.parse(text); } catch {}
  if (!r.ok) { const e = new Error((b && b.error) || `request failed (${r.status})`); e.detail = b && b.detail; e.status = r.status; throw e; }
  return b ?? text;
}
// A release file exactly as stored (byte-for-byte text), for display and for hash verification.
export async function apiText(path) {
  const r = await fetch('/api/explorer/' + path, { credentials: 'same-origin' });
  const text = await r.text();
  if (!r.ok) { let b = null; try { b = JSON.parse(text); } catch {} const e = new Error((b && b.error) || `request failed (${r.status})`); e.status = r.status; throw e; }
  return text;
}
export const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });

// The four evidence states of a boundary check, kept distinct (M8 decision). An uncheckable boundary is NOT an
// incorrect boundary.
export function outcome(o) {
  const s = String(o || '');
  if (s === 'concordant') return { cls: 'agree', label: 'Confirmed computational agreement', short: 'Agreement' };
  if (s === 'minor offset') return { cls: 'minor', label: 'Minor boundary disagreement', short: 'Minor disagreement' };
  if (s === 'conflicting') return { cls: 'conflict', label: 'Conflicting reference evidence', short: 'Conflicting' };
  if (s.startsWith('not checkable')) return { cls: 'insufficient', label: 'Insufficient evidence to check', short: 'Insufficient evidence',
    detail: s.includes('disagree') ? 'the supporting references disagree among themselves' : 'too few independent supporting references' };
  return { cls: 'notassessed', label: 'Not assessed', short: 'Not assessed', detail: 'the boundary was not directly located by ITSx, so there was nothing to check' };
}
export const pill = o => { const x = outcome(o); return `<span class="pill ${x.cls}" title="${esc(x.label + (x.detail ? ': ' + x.detail : ''))}">${esc(x.short)}</span>`; };

export function whoami(me) {
  const w = $('xp-who'); if (!w) return;
  w.textContent = `${me.display_name} · ${me.role}` + (me.formal_reviews_enabled ? ' · formal reviews enabled' : ' · test reviews only');
  if (me.role === 'owner') { const a = $('xp-admin-link'); if (a) a.hidden = false; }
}

// The release strip shown on every Explorer page: tier, review status, safeguard versions and limits.
export function releaseStrip(rel) {
  const m = rel.manifest; const el = $('xp-release'); if (!el) return;
  el.innerHTML = `<strong>Release ${esc(m.release)}</strong> · engine ${esc(m.engine)} · ${m.records} records · ${m.cases} review cases ·
    <strong>${esc(m.human_review.label)}</strong>
    <ul>${m.safeguards.map(s => `<li>${esc(s.name)} (${esc(s.version)}): <strong>${esc(s.validation_status)}</strong></li>`).join('')}
    ${m.tiers.map(t => `<li>${esc(t.name)}: ${esc(t.validation_status)}</li>`).join('')}
    ${m.interpretation_limits.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
}

export async function latestRelease(prefer) {
  const { releases } = await api('releases');
  if (!releases.length) { const e = new Error('No evidence release has been imported yet. The owner imports one from the set-up page.'); e.status = 0; throw e; }
  return releases.find(r => r.id === prefer) || releases[releases.length - 1];
}

export function showError(e) {
  const box = $('xp-error') || document.body;
  const msg = e.status === 401 ? 'Your sign-in could not be verified. Reload the page to sign in again.'
    : e.status === 403 ? 'This account is not an active reviewer. Ask the owner to add you.'
    : e.status === 503 ? 'The Explorer is not set up yet: ' + e.message
    : e.message;
  box.innerHTML = `<div class="xp-msg bad">${esc(msg)}</div>`; box.hidden = false;
}
