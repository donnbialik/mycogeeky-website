import { PHOTO_KEY, PHOTO_STEPS, renderStepPhoto } from '../../../src/lib/field-guide-photos.js';

export async function onRequestGet({ env, next }) {
  const response = await next();
  if (!env.SITE || !response.ok || !response.headers.get('content-type')?.includes('text/html')) return response;
  let photos;
  try { photos = await env.SITE.get(PHOTO_KEY, 'json'); } catch { return response; }
  if (!photos) return response;
  const rewriter = new HTMLRewriter();
  for (const [step] of PHOTO_STEPS) {
    if (!photos[step]) continue;
    rewriter.on(`[data-step-photo="${step}"]`, {
      element(el) { el.setInnerContent(renderStepPhoto(step, photos[step]), { html: true }); },
    });
  }
  return rewriter.transform(response);
}
