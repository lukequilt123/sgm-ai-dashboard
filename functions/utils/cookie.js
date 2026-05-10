// Signed-cookie helpers for the SGM AI Dashboard.
// The cookie value is `${payload}.${hmac}`, where:
//   - payload is base64url(JSON({ exp: <unix-seconds> }))
//   - hmac is base64url(HMAC-SHA-256(payload, SESSION_SECRET))
// The middleware accepts the cookie iff the HMAC verifies *and* exp > now.

const COOKIE_NAME = 'sgm_session';
const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24h

function bytesToBase64Url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function importKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function hmac(secret, data) {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return bytesToBase64Url(new Uint8Array(sig));
}

// Constant-time string compare for the HMAC values (both base64url ASCII).
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionCookie(secret, ttlSeconds = SESSION_TTL_SECONDS) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ exp })));
  const sig = await hmac(secret, payload);
  const value = `${payload}.${sig}`;
  const maxAge = ttlSeconds;
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export async function verifySessionCookie(cookieHeader, secret) {
  if (!cookieHeader) return false;
  const match = cookieHeader.split(/;\s*/).find(c => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return false;
  const value = match.slice(COOKIE_NAME.length + 1);
  const dot = value.indexOf('.');
  if (dot < 1) return false;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = await hmac(secret, payload);
  if (!safeEqual(sig, expected)) return false;

  try {
    const decoded = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    if (typeof decoded.exp !== 'number') return false;
    if (decoded.exp <= Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

// Constant-time compare of plaintext password vs env-stored password.
// Returns false if either side is missing/empty.
export async function checkPassword(submitted, expected) {
  if (typeof submitted !== 'string' || typeof expected !== 'string') return false;
  if (!submitted || !expected) return false;
  // Hash both sides so the compare runs over fixed-length values regardless
  // of password length — avoids leaking length via timing.
  const enc = new TextEncoder();
  const a = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(submitted)));
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(expected)));
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
