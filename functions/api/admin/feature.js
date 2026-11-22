// Admin: read and save the homepage's featured observation. Owner only.
//
// Security (same model as the Explorer, explorer/README.md):
//  * Cloudflare Access must cover /admin/* and /api/admin/* (edge).
//  * Identity comes ONLY from a verified Access JWT; the e-mail must equal OWNER_EMAIL. Fails closed.
//  * Saves must be JSON from the same origin.
// Binding: env.SITE (Workers KV). Keys: "feature" (live), "feature:history" (last 20 saved, newest first).
import { verifyAccessJwt } from '../../../explorer/server/api.js';
import { normalizeFeature } from '../../../src/lib/feature-sheet.js';

const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff' };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: HEADERS });

async function owner(request, env) {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return null;
  let email;
  try { email = await verifyAccessJwt(token, env); } catch { return null; }
  return env.OWNER_EMAIL && email === String(env.OWNER_EMAIL).trim().toLowerCase() ? email : null;
}

export async function onRequest({ request, env }) {
  if (!env.SITE) return json({ error: 'Storage is not set up yet: add a Workers KV binding named SITE to the Pages project.' }, 503);
  const who = await owner(request, env);
  if (!who) return json({ error: 'Only the site owner can use this page. Sign in through Cloudflare Access with the owner e-mail.' }, 403);

  if (request.method === 'GET') {
    const [feature, history] = await Promise.all([env.SITE.get('feature', { type: 'json' }), env.SITE.get('feature:history', { type: 'json' })]);
    return json({ feature, history: history || [], email: who });
  }
  if (request.method === 'PUT') {
    const origin = request.headers.get('Origin');
    if (!origin || origin !== new URL(request.url).origin) return json({ error: 'Saves must come from this site.' }, 403);
    if (!(request.headers.get('content-type') || '').includes('application/json')) return json({ error: 'Expected JSON.' }, 415);
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Could not read the request.' }, 400); }
    const { feature, error } = normalizeFeature(body);
    if (error) return json({ error }, 400);
    feature.savedAt = new Date().toISOString();
    feature.savedBy = who;
    const previous = await env.SITE.get('feature', { type: 'json' });
    const history = (await env.SITE.get('feature:history', { type: 'json' })) || [];
    if (previous) history.unshift(previous);
    await env.SITE.put('feature', JSON.stringify(feature));
    await env.SITE.put('feature:history', JSON.stringify(history.slice(0, 20)));
    return json({ ok: true, feature });
  }
  if (request.method === 'DELETE') {
    // Back to the observation the site was built with (src/data/featuredObservation.ts).
    const origin = request.headers.get('Origin');
    if (!origin || origin !== new URL(request.url).origin) return json({ error: 'Changes must come from this site.' }, 403);
    const previous = await env.SITE.get('feature', { type: 'json' });
    if (previous) {
      const history = (await env.SITE.get('feature:history', { type: 'json' })) || [];
      history.unshift(previous);
      await env.SITE.put('feature:history', JSON.stringify(history.slice(0, 20)));
    }
    await env.SITE.delete('feature');
    return json({ ok: true, feature: null });
  }
  return json({ error: 'Method not allowed.' }, 405);
}
