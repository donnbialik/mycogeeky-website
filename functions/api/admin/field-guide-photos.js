import { verifyAccessJwt } from '../../../explorer/server/api.js';
import { PHOTO_KEY, validatePhotos } from '../../../src/lib/field-guide-photos.js';

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff' } });
}

export async function onRequest({ request, env }) {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  let email;
  try { if (token) email = await verifyAccessJwt(token, env); } catch { /* Reject unverifiable sign-ins. */ }
  if (!email || email !== String(env.OWNER_EMAIL || '').trim().toLowerCase()) return json({ error: 'Sign in as the site owner.' }, 403);
  if (!env.SITE) return json({ error: 'The SITE storage binding is unavailable.' }, 503);
  if (request.method === 'GET') return json({ photos: await env.SITE.get(PHOTO_KEY, 'json') || {} });
  if (request.method !== 'PUT') return json({ error: 'Method not allowed.' }, 405);
  if (request.headers.get('Origin') !== new URL(request.url).origin) return json({ error: 'Saves must come from this site.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Expected JSON.' }, 415);
  if (Number(request.headers.get('content-length')) > 4_300_000) return json({ error: 'The selected photos exceed the total size limit.' }, 413);
  let photos;
  try {
    const body = await request.text();
    if (body.length > 4_300_000) return json({ error: 'The selected photos exceed the total size limit.' }, 413);
    photos = await validatePhotos(JSON.parse(body));
  } catch (error) { return json({ error: error.message }, 400); }
  await env.SITE.put(PHOTO_KEY, JSON.stringify(photos));
  return json({ photos });
}
