import { verifySessionCookie } from './utils/cookie.js';

// Paths that don't require the shared-password layer.
// Cloudflare Access still gates the whole domain at the edge.
// Cloudflare Pages canonicalizes /foo.html -> /foo (308), so we accept both forms.
const PUBLIC_PATHS = new Set([
  '/login',
  '/login.html',
  '/api/login',
  '/favicon.ico'
]);

const PUBLIC_PREFIXES = ['/css/', '/js/'];

function isPublic(pathname) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p));
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);

  if (isPublic(url.pathname)) return next();

  const ok = await verifySessionCookie(request.headers.get('Cookie'), env.SESSION_SECRET);
  if (ok) return next();

  // For HTML/document requests, send to the login page with ?next=… so we
  // can bounce back after sign-in. Use the canonical (no-.html) form so CF
  // doesn't 308 on the redirect target. For everything else (e.g. data/*.json
  // fetched by the dashboard), 401 — these are fired from already-authed
  // pages, so a redirect would just produce CORS noise.
  const accept = request.headers.get('Accept') || '';
  if (request.method === 'GET' && accept.includes('text/html')) {
    const nextParam = encodeURIComponent(url.pathname + url.search);
    return Response.redirect(`${url.origin}/login?next=${nextParam}`, 302);
  }
  return new Response('Unauthorized', { status: 401 });
}
