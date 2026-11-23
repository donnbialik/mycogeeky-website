import { PHOTO_KEY, PHOTO_STEPS, uploadBytes } from '../../src/lib/field-guide-photos.js';

export async function onRequestGet({ request, env }) {
  const step = new URL(request.url).searchParams.get('step');
  if (!env.SITE || !PHOTO_STEPS.some(([key]) => key === step)) return new Response(null, { status: 404 });
  const entry = (await env.SITE.get(PHOTO_KEY, 'json'))?.[step];
  const bytes = entry?.kind === 'upload' && uploadBytes(entry.data);
  if (!bytes) return new Response(null, { status: 404 });
  return new Response(bytes, { headers: {
    'content-type': 'image/webp',
    'x-content-type-options': 'nosniff',
    'cache-control': 'public, max-age=60',
  } });
}
