/**
 * Passcode gate for /internal. Works in both the Edge (middleware) and Node
 * runtimes, so it only uses Web Crypto.
 *
 * Set INTERNAL_PASSCODE in the environment. Without it, /internal is open in
 * development and returns 404 in production.
 */
export const INTERNAL_COOKIE = 'idw_internal';

export async function passcodeToken(passcode: string): Promise<string> {
  const data = new TextEncoder().encode('idw3d-internal:' + passcode);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
