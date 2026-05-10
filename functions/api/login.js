import { createSessionCookie, checkPassword } from '../utils/cookie.js';

export async function onRequestPost({ request, env }) {
  if (!env.SHARED_PASSWORD || !env.SESSION_SECRET) {
    return json({ error: 'Server misconfigured' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const submitted = (body && typeof body.password === 'string') ? body.password : '';
  const ok = await checkPassword(submitted, env.SHARED_PASSWORD);
  if (!ok) {
    return json({ error: 'Invalid password' }, 401);
  }

  const cookie = await createSessionCookie(env.SESSION_SECRET);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie
    }
  });
}

export function onRequest() {
  return new Response('Method Not Allowed', { status: 405, headers: { 'Allow': 'POST' } });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
