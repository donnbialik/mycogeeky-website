// The featured-observation specimen sheet: one renderer used by the site build (SpecimenSheet.astro),
// the live homepage (functions/index.js swaps in the saved feature) and the admin preview (/admin/feature/).
// Plain JavaScript on purpose, so Astro, the browser and Cloudflare Functions can all import it.
//
// Honesty rules (MycoView Design System): everything comes from a real iNaturalist observation; cards filled in
// from data are typed, never imitation handwriting; a missing value is left out. The drawn scale bar and colour card
// are placeholders until a photo of the real ones is supplied, and are not calibrated to the specimen photo.

/** iNaturalist logins that belong to MycoView, shown by their site name. Their photos need no licence check. */
export const OWN_LOGINS = { mycogeekyohio: 'MycoGeeky' };

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');
const num = (v, lo, hi, dflt) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; };

/** iNaturalist photo URL → { host, pid, ext } (only iNaturalist's own photo hosts are accepted). */
export function parsePhotoUrl(url) {
  const m = String(url || '').match(/^https:\/\/(inaturalist-open-data\.s3\.amazonaws\.com|static\.inaturalist\.org)\/photos\/(\d{1,12})\/(?:square|small|medium|large|original)\.(jpe?g|png)(?:\?.*)?$/i);
  return m ? { host: m[1].startsWith('static') ? 'static' : 'open-data', pid: Number(m[2]), ext: m[3].toLowerCase() } : null;
}
export function photoUrl(photo, size) {
  const host = photo.host === 'static' ? 'static.inaturalist.org' : 'inaturalist-open-data.s3.amazonaws.com';
  return `https://${host}/photos/${photo.pid}/${size}.${photo.ext}`;
}

/** Cleans and checks a feature object (used by the admin page before saving and by the server before storing).
 *  Returns { feature } or { error }. */
export function normalizeFeature(input) {
  const f = input && typeof input === 'object' ? input : {};
  const id = Math.trunc(Number(f.id));
  if (!(id > 0 && id < 1e12)) return { error: 'Observation number is missing or not a number.' };
  const name = str(f.name, 140);
  if (!name) return { error: 'Name is missing.' };
  const its = f.its && Number(f.its.length) > 0 ? {
    length: Math.trunc(num(f.its.length, 1, 5000, 0)),
    tech: str(f.its.tech, 40), reads: str(f.its.reads, 12), plate: str(f.its.plate, 40),
  } : null;
  const p = f.photo || {};
  if (!(Number(p.pid) > 0) || !['static', 'open-data'].includes(p.host) || !/^(jpe?g|png)$/.test(p.ext || '')) return { error: 'Choose a photo from the observation.' };
  const photo = {
    host: p.host, pid: Math.trunc(Number(p.pid)), ext: p.ext,
    x: num(p.x, 0, 100, 50), y: num(p.y, 0, 100, 50), zoom: num(p.zoom, 1, 3, 1),
    license: str(p.license, 20), credit: str(p.credit, 140), alt: str(p.alt, 200),
  };
  const observerLogin = str(f.observerLogin, 60).toLowerCase();
  const own = !!OWN_LOGINS[observerLogin];
  if (!own && !photo.license) return { error: 'This photo is "all rights reserved", so MycoView can\'t show it. Choose a photo with a Creative Commons licence.' };
  if (!own && !photo.credit) return { error: 'Photos by other people need a credit line.' };
  let questionUrl = str(f.questionUrl, 300);
  if (questionUrl && !/^\/(?!\/)[\w\-./#?=&%]*$/.test(questionUrl) && !/^https:\/\/[\w.-]+\.[a-z]{2,}(\/[\w\-./#?=&%~+]*)?$/i.test(questionUrl)) return { error: 'The question link must start with / (a page on this site) or https://.' };
  return {
    feature: {
      v: 1, id, name, provisional: !!f.provisional,
      observed: str(f.observed, 40), locality: str(f.locality, 140), habitat: str(f.habitat, 240),
      collector: str(f.collector, 60), observerLogin, its, photo,
      question: str(f.question, 140), questionUrl,
    },
  };
}

// ---------------------------------------------------------------- pieces

/** The paper voucher slip laid on the photo: ruled boxes over "MG-<iNat number>", like the slips Donn photographs with collections. */
export const voucherNumber = (id) => `MG-${id}`;
function voucherSlipSvg(id) {
  const x0 = 16, cw = 41.6, top = 12, bot = 62, n = 5, k = `vs${id}`;
  const paper = 'M5 3 L238 1 L238 111 L3 110 L6 96 L2 84 L6 70 L3 57 L6 44 L2 30 L6 17 Z';
  let ink = `<rect x="${x0}" y="${top}" width="${cw * n}" height="${bot - top}" fill="none" stroke="#1d1d1d" stroke-width="2.6"/>`;
  for (let c = 1; c < n; c++) ink += `<line x1="${x0 + c * cw}" y1="${top}" x2="${x0 + c * cw}" y2="${bot}" stroke="#1d1d1d" stroke-width="2.6"/>`;
  for (let c = 0; c < n; c++) ink += `<line x1="${x0 + c * cw + cw / 2}" y1="${top}" x2="${x0 + c * cw + cw / 2}" y2="${top + 22}" stroke="#1d1d1d" stroke-width="2"/>`;
  ink += `<text x="120" y="96" text-anchor="middle" fill="#4a4a4a" font-family="Work Sans, Arial, sans-serif" font-size="24" font-weight="500" letter-spacing="0.5">${voucherNumber(id)}</text>`;
  // Paper: fibre grain, a faint fold-shadow gradient, rough cut edges, and ink that sits slightly into the paper.
  return `<svg viewBox="0 0 240 112" aria-hidden="true"><defs>
<linearGradient id="${k}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FDFCF7"/><stop offset=".65" stop-color="#F8F6EE"/><stop offset="1" stop-color="#EEEADF"/></linearGradient>
<filter id="${k}e" x="-3%" y="-6%" width="106%" height="112%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="2.6" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="${k}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.35" numOctaves="3" seed="11"/><feColorMatrix values="0 0 0 0 .45 0 0 0 0 .41 0 0 0 0 .33 1.05 0 0 0 -.4"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="${k}i"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="2"/><feDisplacementMap in="SourceGraphic" scale="0.9"/></filter>
</defs><g filter="url(#${k}e)"><path d="${paper}" fill="url(#${k}g)"/><path d="${paper}" fill="#000" filter="url(#${k}n)"/></g><g filter="url(#${k}i)" opacity=".88">${ink}</g></svg>`;
}

function scaleSvg() {
  const cm = 56, x0 = 14, W = x0 * 2 + cm * 5;
  let s = `<svg viewBox="0 0 ${W} 74" aria-hidden="true"><rect width="${W}" height="74" fill="#111"/><rect x="${x0}" y="8" width="${cm * 5}" height="34" fill="none" stroke="#fff" stroke-width="1.5"/>`;
  for (let i = 1; i < 10; i++) s += `<line x1="${x0 + i * cm / 10}" y1="8" x2="${x0 + i * cm / 10}" y2="30" stroke="#fff" stroke-width="1.2"/>`;
  s += `<line x1="${x0}" y1="30" x2="${x0 + cm * 5}" y2="30" stroke="#fff" stroke-width="1.2"/><rect x="${x0}" y="30" width="${cm / 2}" height="12" fill="#fff"/>`;
  for (let c = 1; c < 5; c++) s += c % 2 ? `<rect x="${x0 + c * cm}" y="8" width="${cm}" height="22" fill="#fff"/>` : `<rect x="${x0 + c * cm}" y="30" width="${cm}" height="12" fill="#fff"/>`;
  for (let c = 0; c <= 5; c++) s += `<text x="${x0 + c * cm}" y="60" fill="#fff" text-anchor="middle" font-family="Work Sans, sans-serif" font-size="14" font-weight="600">${c}</text>`;
  return s + `<text x="${x0}" y="71" fill="#fff" font-family="Work Sans, sans-serif" font-size="9">cm</text></svg>`;
}

const CC = ['#735244', '#C29682', '#627A9D', '#576C43', '#8580B1', '#67BDAA', '#D67E2C', '#505BA6', '#C15A63', '#5E3C6C', '#9DBC40', '#E0A32E', '#383D96', '#469449', '#AF363C', '#E7C71F', '#BB5695', '#0885A1', '#F3F3F2', '#C8C8C8', '#A0A0A0', '#7A7A79', '#555555', '#343434'];
function colourCardSvg() {
  const s = 18, g = 4, pad = 8, w = pad * 2 + 6 * s + 5 * g, h = pad * 2 + 4 * s + 3 * g;
  let out = `<svg viewBox="0 0 ${w} ${h}" width="${Math.round(w * 1.25)}" aria-hidden="true"><rect width="${w}" height="${h}" rx="3" fill="#141414"/>`;
  CC.forEach((c, i) => { const r = Math.floor(i / 6), k = i % 6; out += `<rect x="${pad + k * (s + g)}" y="${pad + r * (s + g)}" width="${s}" height="${s}" rx="1.5" fill="${c}"/>`; });
  // A soft sheen so the card reads as a laminated object, not a flat graphic.
  return out + `<defs><linearGradient id="ccg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".45" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient></defs><rect width="${w}" height="${h}" rx="3" fill="url(#ccg)"/><rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="2.6" fill="none" stroke="#fff" stroke-opacity=".12"/></svg>`;
}

/** <img> for a feature photo straight from iNaturalist, cropped by the saved focus point and zoom. */
export function featurePhotoHtml(f) {
  const p = f.photo;
  const pos = `${p.x}% ${p.y}%`;
  const alt = p.alt || `${f.name}, photographed for iNaturalist observation ${f.id}`;
  return `<img src="${esc(photoUrl(p, 'large'))}" srcset="${esc(photoUrl(p, 'medium'))} 500w, ${esc(photoUrl(p, 'large'))} 1024w, ${esc(photoUrl(p, 'original'))} 2048w" sizes="(max-width: 760px) 92vw, 34vw" alt="${esc(alt)}" style="object-position:${pos};transform:scale(${p.zoom});transform-origin:${pos}" loading="eager" decoding="async">`;
}

/** "88 Nanopore Reads in Consensus (RiC)"; just the technology if the read count is missing. */
export const readsLine = (its) => {
  if (!its) return '';
  const tech = its.tech ? `${its.tech} ` : '';
  return its.reads ? `${its.reads} ${tech}Reads in Consensus (RiC)` : (its.tech || '');
};

const splitName = (name) => { const m = String(name).match(/^(\S+)\s+(.*)$/); return m ? [m[1], m[2]] : [String(name), '']; };

/** The whole sheet. opts.photoHtml overrides the photo (the build uses an optimised local image);
 *  opts.scaleHtml replaces the drawn scale bar and colour card with a real photo of them. */
export function renderSheet(f, opts = {}) {
  const [genus, rest] = splitName(f.name);
  const restTyped = rest.split(/('[^']+')/).filter(Boolean).map((part) => (part.startsWith("'") ? `<u>${esc(part)}</u>` : esc(part))).join('');
  const inat = `https://www.inaturalist.org/observations/${f.id}`;
  const its = f.its;
  const itsLine = readsLine(its);
  const stamp = f.provisional ? '<p class="sheet-stamp" role="note"><b>PROVISIONAL</b><span>not yet formally described</span></p>' : '';
  const credit = f.photo && f.photo.credit ? `<figcaption class="sheet-credit">${esc(f.photo.credit)}</figcaption>` : '';
  const scale = opts.scaleHtml
    ? `<div class="sheet-scale">${opts.scaleHtml}</div>`
    : `<div class="sheet-scale"><div class="sheet-ruler"><div class="sheet-ruler-bar">${scaleSvg()}</div><span class="sheet-code">MYCOVIEW</span></div><div class="sheet-cc">${colourCardSvg()}</div></div>`;
  return `<figure class="sheet" aria-label="Specimen sheet for ${esc(f.name)}">
${scale}
<div class="sheet-body">
  <figure class="sheet-print"><div class="sheet-crop">${opts.photoHtml || featurePhotoHtml(f)}</div>${credit}
    <a class="sheet-voucher" href="${inat}" target="_blank" rel="noopener noreferrer" aria-label="Voucher ${voucherNumber(f.id)}: iNaturalist observation ${f.id}, opens in a new tab">${voucherSlipSvg(f.id)}</a></figure>
  <div class="sheet-labels">
    ${its ? `<div class="sheet-card sheet-typed">
      <p class="sheet-card-head">MYCOVIEW FIELD STATION · DNA BARCODE</p><hr>
      <p><u>${esc(genus.toUpperCase())}</u> ${restTyped}</p>
      <p class="ind">ITS, ${its.length} bp.</p>
      ${itsLine ? `<p class="ind">${esc(itsLine)}.</p>` : ''}
      ${its.plate ? `<p class="ind">Mycota Lab plate ${esc(its.plate)}.</p>` : ''}
      ${stamp}
    </div>` : ''}
    <div class="sheet-slip">
      <div class="slip-head"><p class="slip-title">FIELD DATA SLIP</p><p class="slip-org">MycoView Field Station · NE Ohio</p></div>
      <div class="slip-id"><b>iNat#</b><a href="${inat}" target="_blank" rel="noopener noreferrer" aria-label="iNaturalist observation ${f.id}, opens in a new tab">${f.id}</a></div>
      ${its ? '' : `<p class="slip-species"><b>Species</b><span><i>${esc(genus)}</i> ${esc(rest)}</span></p>`}
      <dl class="slip-rows">
        ${f.observed ? `<div><dt>Date</dt><dd>${esc(f.observed)}</dd></div>` : ''}
        ${f.locality ? `<div><dt>Locality</dt><dd>${esc(f.locality)}</dd></div>` : ''}
        ${f.collector ? `<div><dt>Collected By</dt><dd>${esc(f.collector)}</dd></div>` : ''}
        ${its ? '<div><dt>Evidence</dt><dd>ITS DNA barcode</dd></div>' : '<div><dt>ID By</dt><dd>iNaturalist community</dd></div>'}
        ${f.habitat ? `<div class="slip-notes"><dt>Field notes</dt><dd>${esc(f.habitat)}</dd></div>` : ''}
      </dl>
      ${its ? '' : stamp}
    </div>
  </div>
</div>
</figure>`;
}

/** Town for the headline: the second-to-last part of the locality ("Ranchwood Rd, Ghent, Ohio" → "Ghent"). */
export function townOf(f) {
  const parts = String(f.locality || '').split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0] || '';
}

export function renderLede(f) {
  const town = townOf(f);
  const from = town ? ` from ${esc(town)}` : '';
  return f.provisional
    ? `Every discovery starts with a collection. These mushrooms${from} carry only a provisional name: their DNA isn't yet matched to a described species.`
    : `Every discovery starts with a collection. This one comes${from || ' from the field'}.`;
}

export function renderJourney(f) {
  const its = f.its;
  const rows = [[f.observed || 'Observed', `Photographed and posted to iNaturalist, #${f.id}`]];
  const seq = [its && its.plate && `Mycota Lab, plate ${its.plate}`, its && readsLine(its)].filter(Boolean);
  if (seq.length) rows.push(['Sequenced', seq.join(' · ')]);
  if (its) rows.push(['Read', `${its.length} letters of the ITS barcode region`]);
  if (f.provisional) rows.push(['Named', `${splitName(f.name)[1].replace(/^sp\.\s*/, '')}, a provisional name until the species is formally described`]);
  return rows.map(([k, v]) => `<li><span class="hp-key">${esc(k)}</span><span>${esc(v)}</span></li>`).join('');
}

export function renderJourneyLinks(f) {
  const inat = `https://www.inaturalist.org/observations/${f.id}`;
  return `<a href="${inat}" target="_blank" rel="noopener noreferrer">See the iNaturalist record</a>${f.question && f.questionUrl ? `<a href="${esc(f.questionUrl)}">${esc(f.question)}</a>` : ''}`;
}

/** Turns an iNaturalist API observation into a draft feature, for the admin page. */
export function draftFromObservation(o) {
  const field = (re) => o.ofvs?.find((x) => re.test(x.name))?.value;
  const provisionalName = field(/^provisional species name$/i);
  const name = provisionalName || o.taxon?.name || 'Unidentified';
  const seq = String(field(/dna barcode its/i) || '').replace(/[^ACGTNRYKMSWBDHV]/gi, '');
  const login = o.user?.login || '';
  const observed = o.observed_on ? new Date(o.observed_on + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
  const photos = (o.observation_photos || o.photos?.map((p) => ({ photo: p })) || []).map((op) => op.photo || op).map((p) => {
    const parsed = parsePhotoUrl(String(p.url || '').replace('/square.', '/large.'));
    return parsed ? { ...parsed, license: p.license_code || '', attribution: p.attribution || '' } : null;
  }).filter(Boolean);
  return {
    draft: {
      id: o.id, name, provisional: !!provisionalName || /['‘’]/.test(name), observed,
      locality: String(o.place_guess || '').replace(/,\s*US$/, '').replace(/,\s*OH$/, ', Ohio'),
      habitat: '', collector: OWN_LOGINS[login] || (login ? `@${login}` : ''), observerLogin: login,
      its: seq.length ? { length: seq.length, tech: (field(/sequencing technology/i) || '').replace(/\s*\(.*\)$/, ''), reads: field(/reads in consensus/i) || '', plate: field(/mycota lab plate/i) || '' } : null,
      photo: null, question: '', questionUrl: '',
    },
    photos,
  };
}
