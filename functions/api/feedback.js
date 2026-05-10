// POST /api/feedback
// Authenticated by the standard middleware (no public allowlist entry).
// Proxies the request to the n8n webhook with a server-only secret header.
// Server-injects timestamp and the CF-Access-authenticated user email so the
// client can't forge those.

export async function onRequestPost({ request, env }) {
  if (!env.N8N_WEBHOOK_URL || !env.FEEDBACK_WEBHOOK_SECRET) {
    return json({ error: 'Server misconfigured' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const toolId = typeof body?.toolId === 'string' ? body.toolId.trim() : '';
  const toolName = typeof body?.toolName === 'string' ? body.toolName.trim() : '';
  const builderEmail = typeof body?.builderEmail === 'string' ? body.builderEmail.trim() : '';
  const rating = body?.rating;
  const feedback = typeof body?.feedback === 'string' ? body.feedback.trim() : '';

  if (!toolId || !toolName) return json({ error: 'Missing tool reference' }, 400);
  if (rating !== 'up' && rating !== 'down') return json({ error: 'Invalid rating' }, 400);
  if (feedback.length > 2000) return json({ error: 'Feedback too long' }, 400);

  const submittedBy = request.headers.get('Cf-Access-Authenticated-User-Email') || '';

  const payload = {
    timestamp: new Date().toISOString(),
    toolId,
    toolName,
    builderEmail,
    submittedBy,
    rating,
    feedback
  };

  let upstream;
  try {
    upstream = await fetch(env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Feedback-Secret': env.FEEDBACK_WEBHOOK_SECRET
      },
      body: JSON.stringify(payload)
    });
  } catch {
    return json({ error: 'Upstream unreachable' }, 502);
  }

  if (!upstream.ok) return json({ error: 'Upstream rejected' }, 502);
  return json({ ok: true });
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
