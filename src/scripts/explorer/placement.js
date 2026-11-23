// Placement of one pasted ITS sequence among the records of a genus working set, computed in the browser.
// This is not an identification: no threshold is applied and no name is chosen. It shows which records and which
// working names the sequence is nearest to, how far, and over how much of the sequence, so a reviewer can see where
// it falls. The pasted sequence never leaves the page.
//
// Method (stated on the page):
//   candidates  every type reference and working reference, plus the MAX_OTHERS other records sharing the most
//               8-mers with the query (best strand; similarity = shared 8-mers / 8-mers of the shorter sequence)
//   alignment   global alignment with free end gaps (affine gaps: match 2, mismatch -3, gap open -6, extend -1),
//               the query on the strand that shares more 8-mers with the working set
//   distance    over the columns where both sequences are present: a substitution counts 1; a run of gap columns
//               counts 1 whatever its length; an ambiguity code compatible with the other base is not a difference;
//               a column with N is skipped. distance = differences / (aligned base pairs + gap runs).
//   coverage    share of the query's bases inside that overlap. References covering under half of the query
//               rank after all others, whatever their distance.
// Plain pairwise distances; the engine's figures (region-aware, with alignment uncertainty) can differ slightly.

export const MAX_OTHERS = 40;
export const MAX_QUERY = 5000;
export const SHORT = 0.5;      // references covering less of the query than this rank after the rest
const K = 8;
const IUPAC = { A: 'A', C: 'C', G: 'G', T: 'T', R: 'AG', Y: 'CT', S: 'CG', W: 'AT', K: 'GT', M: 'AC', B: 'CGT', D: 'AGT', H: 'ACT', V: 'ACG', N: 'ACGT' };
const COMP = { A: 'T', C: 'G', G: 'C', T: 'A', R: 'Y', Y: 'R', S: 'S', W: 'W', K: 'M', M: 'K', B: 'V', V: 'B', D: 'H', H: 'D', N: 'N' };

export const revcomp = s => [...s].reverse().map(c => COMP[c] || 'N').join('');

// Pasted text (raw or FASTA, one sequence) -> { seq } or { error }.
export function parseQuery(text) {
  const lines = String(text || '').split(/\r?\n/);
  const heads = lines.filter(l => l.startsWith('>')).length;
  if (heads > 1) return { error: 'Paste one sequence at a time.' };
  const seq = lines.filter(l => !l.startsWith('>')).join('').replace(/[\s\d]/g, '').toUpperCase().replace(/U/g, 'T');
  if (!seq) return { error: 'No sequence found.' };
  const bad = seq.replace(/[ACGTRYSWKMBDHVN-]/g, '');
  if (bad) return { error: `Not DNA letters: ${[...new Set(bad)].slice(0, 8).join(' ')}` };
  const s = seq.replace(/-/g, '');
  if (s.length < 100) return { error: `Only ${s.length} bases; paste at least 100.` };
  if (s.length > MAX_QUERY) return { error: `${s.length} bases; the limit is ${MAX_QUERY}.` };
  const n = (s.match(/N/g) || []).length;
  return { seq: s, warning: n / s.length >= 0.05 ? `${n} of ${s.length} bases are N; distances skip them.` : null };
}

// FASTA text from the working-set download -> Map(accession -> sequence). The label's first word is the accession.
export function parseFasta(text) {
  const out = new Map(); let acc = null, buf = [];
  const flush = () => { if (acc) out.set(acc, buf.join('').toUpperCase()); };
  for (const l of String(text || '').split(/\r?\n/)) {
    if (l.startsWith('>')) { flush(); acc = l.slice(1).trim().split(/\s+/)[0]; buf = []; } else buf.push(l.trim());
  }
  flush(); return out;
}

export function kmers(s) {
  const out = new Set();
  for (let i = 0; i + K <= s.length; i++) { const k = s.slice(i, i + K); if (/^[ACGT]+$/.test(k)) out.add(k); }
  return out;
}
export function kmerSim(a, b) {
  if (!a.size || !b.size) return 0;
  const [x, y] = a.size < b.size ? [a, b] : [b, a]; let n = 0;
  for (const k of x) if (y.has(k)) n++;
  return n / x.size;
}

// Affine-gap alignment with free end gaps (Gotoh). Returns the two aligned strings.
const MATCH = 2, MIS = -3, GO = -6, GE = -1, NEG = -1e9;
const compatible = (x, y) => { const a = IUPAC[x] || 'ACGT', b = IUPAC[y] || 'ACGT'; for (const c of a) if (b.includes(c)) return true; return false; };
const sc = (x, y) => x === y && 'ACGT'.includes(x) ? MATCH : x === 'N' || y === 'N' ? 0 : compatible(x, y) && !('ACGT'.includes(x) && 'ACGT'.includes(y)) ? 1 : MIS;
export function align(a, b) {
  const n = a.length, m = b.length, W = m + 1, tb = new Uint8Array((n + 1) * W);
  let pM = new Float64Array(W), pX = new Float64Array(W), pY = new Float64Array(W), cM = new Float64Array(W), cX = new Float64Array(W), cY = new Float64Array(W);
  pM[0] = 0; pX[0] = NEG; pY[0] = NEG;
  for (let j = 1; j <= m; j++) { pM[j] = NEG; pX[j] = NEG; pY[j] = 0; }
  let best = NEG, bi = 0, bj = 0;
  for (let i = 1; i <= n; i++) {
    cM[0] = NEG; cX[0] = 0; cY[0] = NEG; const ai = a[i - 1], row = i * W;
    for (let j = 1; j <= m; j++) {
      let mm = pM[j - 1], src = 0; if (pX[j - 1] > mm) { mm = pX[j - 1]; src = 1; } if (pY[j - 1] > mm) { mm = pY[j - 1]; src = 2; }
      cM[j] = mm + sc(ai, b[j - 1]);
      let xx = pM[j] + GO, xs = 0; if (pX[j] + GE > xx) { xx = pX[j] + GE; xs = 1; } if (pY[j] + GO > xx) { xx = pY[j] + GO; xs = 2; }
      cX[j] = xx;
      let yy = cM[j - 1] + GO, ys = 0; if (cY[j - 1] + GE > yy) { yy = cY[j - 1] + GE; ys = 2; } if (cX[j - 1] + GO > yy) { yy = cX[j - 1] + GO; ys = 1; }
      cY[j] = yy; tb[row + j] = src | (xs << 2) | (ys << 4);
    }
    if (cM[m] > best) { best = cM[m]; bi = i; bj = m; }
    [pM, cM] = [cM, pM]; [pX, cX] = [cX, pX]; [pY, cY] = [cY, pY];
  }
  for (let j = 1; j <= m; j++) if (pM[j] > best) { best = pM[j]; bi = n; bj = j; }
  const ra = [], rb = []; let i = bi, j = bj, st = 0;
  for (let k = n; k > i; k--) { ra.push(a[k - 1]); rb.push('-'); }
  for (let k = m; k > j; k--) { ra.push('-'); rb.push(b[k - 1]); }
  while (i > 0 && j > 0) {
    const t = tb[i * W + j];
    if (st === 0) { ra.push(a[i - 1]); rb.push(b[j - 1]); st = t & 3; i--; j--; }
    else if (st === 1) { ra.push(a[i - 1]); rb.push('-'); st = (t >> 2) & 3; i--; }
    else { ra.push('-'); rb.push(b[j - 1]); st = (t >> 4) & 3; j--; }
  }
  while (i > 0) { ra.push(a[i - 1]); rb.push('-'); i--; }
  while (j > 0) { ra.push('-'); rb.push(b[j - 1]); j--; }
  return { a: ra.reverse().join(''), b: rb.reverse().join('') };
}

// Distance between aligned query (qa) and reference (ra), over the overlap only.
export function distance(qa, ra) {
  let fq = -1, lq = -1, fr = -1, lr = -1;
  for (let c = 0; c < qa.length; c++) { if (qa[c] !== '-') { if (fq < 0) fq = c; lq = c; } if (ra[c] !== '-') { if (fr < 0) fr = c; lr = c; } }
  const st = Math.max(fq, fr), en = Math.min(lq, lr);
  const qlen = [...qa].filter(c => c !== '-').length;
  if (fq < 0 || fr < 0 || en < st) return { overlap: 0, compared: 0, subs: 0, indels: 0, diffs: 0, pct: null, coverage: 0 };
  let pairs = 0, subs = 0, indels = 0, inGap = null, qIn = 0;
  for (let c = st; c <= en; c++) {
    const x = qa[c], y = ra[c];
    if (x !== '-') qIn++;
    if (x === '-' || y === '-') { const g = x === '-' ? 'q' : 'r'; if (inGap !== g) { indels++; inGap = g; } continue; }
    inGap = null;
    if (x === 'N' || y === 'N') continue;
    pairs++;
    if (x !== y && !compatible(x, y)) subs++;
  }
  const compared = pairs + indels, diffs = subs + indels;
  return { overlap: en - st + 1, compared, subs, indels, diffs, pct: compared ? 100 * diffs / compared : null, coverage: qlen ? qIn / qlen : 0 };
}

// Place a query among reference records [{ accession, working_name, role, sequence, ... }].
// onProgress(done, total) is called between alignments; the caller can await a tick there to keep the page responsive.
export async function place(query, records, onProgress = () => {}) {
  const refs = records.filter(r => r.sequence && r.role !== 'excluded');
  const kf = kmers(query), kr = kmers(revcomp(query));
  const K2 = new Map(refs.map(r => [r.accession, kmers(r.sequence)]));
  let f = 0, rv = 0; for (const r of refs) { f += kmerSim(kf, K2.get(r.accession)); rv += kmerSim(kr, K2.get(r.accession)); }
  const reversed = rv > f, q = reversed ? revcomp(query) : query, kq = reversed ? kr : kf;
  const sim = new Map(refs.map(r => [r.accession, kmerSim(kq, K2.get(r.accession))]));
  const isRef = r => r.role === 'type_reference' || r.role === 'working_reference';
  const others = refs.filter(r => !isRef(r)).sort((a, b) => sim.get(b.accession) - sim.get(a.accession) || a.accession.localeCompare(b.accession)).slice(0, MAX_OTHERS);
  const todo = [...refs.filter(isRef), ...others];
  const results = [];
  for (let i = 0; i < todo.length; i++) {
    const r = todo[i], al = align(q, r.sequence), d = distance(al.a, al.b);
    results.push({ record: r, kmer: sim.get(r.accession), ...d });
    await onProgress(i + 1, todo.length);
  }
  const usable = results.filter(x => x.pct != null);
  // A reference that covers under half of the query (e.g. an ITS2-only type fragment) ranks after every one that
  // covers more: a short overlap can look identical while saying little about the rest of the sequence.
  const short = x => x.coverage < SHORT ? 1 : 0;
  usable.sort((a, b) => short(a) - short(b) || a.pct - b.pct || b.coverage - a.coverage || a.record.accession.localeCompare(b.record.accession));
  const names = new Map();
  for (const x of usable) {
    const n = x.record.working_name; const e = names.get(n) || { name: n, nearest: null, nearestType: null, nearestRef: null, aligned: 0 };
    e.aligned++; if (!e.nearest) e.nearest = x;
    if (x.record.role === 'type_reference' && !e.nearestType) e.nearestType = x;
    if (isRef(x.record) && !e.nearestRef) e.nearestRef = x;
    names.set(n, e);
  }
  return { reversed, queryLength: query.length, aligned: results.length, candidatesScreened: refs.length, nearest: usable, byName: [...names.values()] };
}
