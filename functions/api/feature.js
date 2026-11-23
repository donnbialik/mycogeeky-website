// Public: the featured observation currently on the homepage (saved from /admin/feature/), or null.
export async function onRequestGet({ env }) {
  const feature = env.SITE ? await env.SITE.get('feature', { type: 'json' }) : null;
  return new Response(JSON.stringify({ feature }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' } });
}
