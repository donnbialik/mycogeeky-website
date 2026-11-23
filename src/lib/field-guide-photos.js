import { OWN_LOGINS, draftFromObservation, esc, photoUrl } from './feature-sheet.js';

export const PHOTO_STEPS = [
  ['in-place', 'In place'],
  ['cap', 'Top of the cap'],
  ['underside', 'Underside'],
  ['side', 'Side profile'],
  ['base', 'The whole base'],
  ['section', 'Cut in half'],
  ['scale', 'Scale and number'],
];
export const PHOTO_KEY = 'field-guide-photos:photography';
export const MAX_UPLOAD = 600_000;
const LICENSES = new Set(['cc0', 'cc-by', 'cc-by-nc', 'cc-by-sa', 'cc-by-nc-sa', 'cc-by-nd', 'cc-by-nc-nd']);
export const observationLink = id => `https://www.inaturalist.org/observations/${id}`;
export function observationId(input) {
  return String(input ?? '').trim().match(/^(?:https:\/\/(?:www\.)?inaturalist\.org\/observations\/)?([1-9]\d{0,11})(?:\/?(?:[?#].*)?)$/i)?.[1] ?? '';
}

export function observationPhotos(observation) {
  const { draft, photos } = draftFromObservation(observation);
  const own = Object.hasOwn(OWN_LOGINS, draft.observerLogin);
  return photos.map(photo => ({
    ...photo,
    usable: own || (LICENSES.has(photo.license) && Boolean(photo.attribution)),
    credit: photo.attribution || (own ? OWN_LOGINS[draft.observerLogin] : ''),
  }));
}

export async function loadObservation(id) {
  const response = await fetch(`https://api.inaturalist.org/v1/observations/${id}`, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`iNaturalist could not load observation ${id}.`);
  const observation = (await response.json()).results?.[0];
  if (String(observation?.id) !== id) throw new Error(`Observation ${id} was not found.`);
  return observation;
}

export function uploadBytes(data) {
  if (typeof data !== 'string' || !data.length || data.length > MAX_UPLOAD || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null;
  try {
    const raw = atob(data);
    if (raw.slice(0, 4) !== 'RIFF' || raw.slice(8, 12) !== 'WEBP') return null;
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  } catch { return null; }
}

export async function validatePhotos(input, fetchObservation = loadObservation) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected a set of step photos.');
  const output = {};
  const observations = new Map();
  for (const [step, label] of PHOTO_STEPS) {
    const entry = input[step];
    if (!entry) continue;
    const alt = typeof entry.alt === 'string' ? entry.alt.trim() : '';
    if (!alt || alt.length > 200) throw new Error(`${label}: enter a photo description of 1–200 characters.`);
    const id = observationId(entry.observation);
    if (entry.observation && !id) throw new Error(`${label}: enter a valid iNaturalist observation link or number.`);
    if (entry.kind === 'upload') {
      if (!uploadBytes(entry.data)) throw new Error(`${label}: the WebP upload is invalid or too large.`);
      if (entry.rights !== true) throw new Error(`${label}: confirm you have permission to publish this upload.`);
      output[step] = { kind: 'upload', data: entry.data, rights: true, observation: id, alt, credit: String(entry.credit || '').trim().slice(0, 250) };
      continue;
    }
    if (entry.kind !== 'inat' || !id) throw new Error(`${label}: choose a photo from an iNaturalist observation.`);
    if (!observations.has(id)) observations.set(id, observationPhotos(await fetchObservation(id)));
    const photo = observations.get(id).find(p => p.pid === Number(entry.pid));
    if (!photo?.usable) throw new Error(`${label}: that photo is unavailable or its reuse rights could not be confirmed.`);
    output[step] = { kind: 'inat', observation: id, pid: photo.pid, host: photo.host, ext: photo.ext, credit: photo.credit, alt };
  }
  return output;
}

export function renderStepPhoto(step, entry) {
  const url = entry.kind === 'inat' ? photoUrl(entry, 'large') : `/api/field-guide-photo?step=${step}`;
  const link = entry.observation ? `<a href="${observationLink(entry.observation)}">View iNaturalist observation</a>` : '';
  return `<figure class="mv-step-photo"><img src="${esc(url)}" alt="${esc(entry.alt)}" loading="lazy" decoding="async"><figcaption>${[link, esc(entry.credit)].filter(Boolean).join(' · ')}</figcaption></figure>`;
}
