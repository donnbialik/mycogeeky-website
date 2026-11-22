// Homepage ("/"): if a featured observation has been saved on the admin page (/admin/feature/), swap it into the
// static page on the way out, so the change shows immediately, with no rebuild and no flicker.
// Without the SITE binding or a saved feature, the page is served exactly as built.
import { renderSheet, renderLede, renderJourney, renderJourneyLinks } from '../src/lib/feature-sheet.js';

export async function onRequestGet(context) {
  const res = await context.next();
  const { env } = context;
  if (!env.SITE || !(res.headers.get('content-type') || '').includes('text/html')) return res;
  let feature = null;
  try { feature = await env.SITE.get('feature', { type: 'json', cacheTtl: 60 }); } catch { return res; }
  if (!feature || !feature.photo) return res;
  let sheet, lede, journey, links;
  try { sheet = renderSheet(feature); lede = renderLede(feature); journey = renderJourney(feature); links = renderJourneyLinks(feature); }
  catch { return res; }
  const out = new HTMLRewriter()
    .on('#hp-sheet', { element(el) { el.setInnerContent(sheet, { html: true }); } })
    .on('#hp-lede', { element(el) { el.setInnerContent(lede, { html: true }); } })
    .on('#hp-journey', { element(el) { el.setInnerContent(journey, { html: true }); } })
    .on('#hp-journey-links', { element(el) { el.setInnerContent(links, { html: true }); } })
    .transform(res);
  const headers = new Headers(out.headers);
  headers.set('cache-control', 'public, max-age=60');
  return new Response(out.body, { status: out.status, headers });
}
