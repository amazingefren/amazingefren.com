import { readCookie, sessionCookie } from '../../../auth/domain/sessions/index.ts';
import manifest from '../../web.manifest.ts';

export function protectedPath(path: string): boolean {
  return manifest.launchAccess.ownerPrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

export function canonicalPath(url: URL): string | null {
  try {
    const path = decodeURIComponent(url.pathname);
    if (path.includes('\\') || path.includes('%') || path.includes('//') || /[\u0000-\u0020\u007f]/.test(path)) return null;
    return path;
  } catch {
    return null;
  }
}

export function sessionCookieHeader(request: Request): string | null {
  const token = readCookie(request.headers.get('cookie'), sessionCookie);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? `${sessionCookie}=${token}` : null;
}

export async function guardLaunchRequest(request: Request, origin: string | undefined, hasOwnerSession: () => Promise<boolean>): Promise<Response | null> {
  const url = new URL(request.url);
  const path = canonicalPath(url);
  if (path === null) return new Response(null, { status: 400 });
  if (url.searchParams.has('__rsc_action_id')) return new Response(null, { status: 403 });
  if (!protectedPath(path)) return null;
  const headers = { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' };
  if (!origin || url.origin !== origin || url.protocol !== 'https:') return new Response('Owner access is unavailable.', { status: 503, headers });
  if (await hasOwnerSession()) return null;
  if (path.startsWith('/api/') || request.method !== 'GET') return Response.json({ ok: false, error: { code: 'denied', message: 'Owner authentication is required.' } }, { status: 401, headers });
  return new Response(null, { status: 303, headers: { ...headers, location: manifest.launchAccess.signInPath } });
}

export function secureResponse(response: Response, privateResponse: boolean): Response {
  const result = new Response(response.body, response);
  result.headers.set('x-content-type-options', 'nosniff');
  result.headers.set('referrer-policy', 'no-referrer');
  result.headers.set('x-frame-options', 'DENY');
  result.headers.append('content-security-policy', "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  result.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), publickey-credentials-get=(self), publickey-credentials-create=(self)');
  if (privateResponse) {
    result.headers.set('cache-control', 'private, no-store');
    result.headers.set('x-robots-tag', 'noindex, nofollow');
  }
  return result;
}
