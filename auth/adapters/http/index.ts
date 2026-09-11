import { challengeLifetime, sessionLifetime, type AuthInput } from '../../contracts/index.ts';
import { validOrigin } from '../../domain/authorization/index.ts';
import { challengeCookie, readCookie, sessionCookie, writeCookie } from '../../domain/sessions/index.ts';
import { executeAuth, type AuthOperation } from '../../operations/passkeys/index.ts';
import type { AuthDependencies } from '../../ports/index.ts';
const operations = new Set<AuthOperation>(['registration-options', 'registration-verify', 'authentication-options', 'authentication-verify', 'logout']);
export function authResponse(body: object, status: number, cookies: string[] = []): Response {
  const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers });
}
async function readInput(request: Request): Promise<AuthInput | null> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json' || !request.body) return null;
  const reader = request.body.getReader();
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.length;
    if (length > 16384) { await reader.cancel(); return null; }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    return body as AuthInput;
  } catch { return null; }
}
export async function handleAuthHttp(request: Request, dependencies: AuthDependencies): Promise<Response> {
  const path = new URL(request.url).pathname;
  const operation = path.slice('/api/auth/'.length) as AuthOperation;
  if (!path.startsWith('/api/auth/') || !operations.has(operation)) return authResponse({ error: 'not_found' }, 404);
  if (request.method !== 'POST') {
    const response = authResponse({ error: 'invalid_request' }, 405);
    response.headers.set('Allow', 'POST');
    return response;
  }
  if (!validOrigin(dependencies.origin) || new URL(request.url).origin !== dependencies.origin || request.headers.get('origin') !== dependencies.origin || ![null, 'same-origin'].includes(request.headers.get('sec-fetch-site'))) return authResponse({ error: 'forbidden' }, 403);
  try {
    const key = await dependencies.crypto.hash(request.headers.get('cf-connecting-ip') ?? 'unidentified');
    if (!await dependencies.store.allowAttempt(key, dependencies.now())) return authResponse({ error: 'rate_limited' }, 429);
    const input = await readInput(request);
    if (!input) return authResponse({ error: 'invalid_request' }, 400);
    const allowedKeys = operation === 'registration-options' ? ['bootstrapToken'] : operation.endsWith('-verify') ? ['response'] : [];
    if (Object.keys(input).some((key) => !allowedKeys.includes(key))) return authResponse({ error: 'invalid_request' }, 400);
    if (operation.endsWith('-verify') && (!input.response || typeof input.response !== 'object' || Array.isArray(input.response))) return authResponse({ error: 'invalid_request' }, 400);
    if (input.bootstrapToken !== undefined && typeof input.bootstrapToken !== 'string') return authResponse({ error: 'invalid_request' }, 400);
    const result = await executeAuth(operation, input, { session: readCookie(request.headers.get('cookie'), sessionCookie), challenge: readCookie(request.headers.get('cookie'), challengeCookie) }, dependencies);
    const cookies: string[] = [];
    if (result.sessionToken) cookies.push(writeCookie(sessionCookie, result.sessionToken, sessionLifetime / 1000));
    if (result.challengeToken) cookies.push(writeCookie(challengeCookie, result.challengeToken, challengeLifetime / 1000));
    if (result.clearSession) cookies.push(writeCookie(sessionCookie, '', 0));
    if (result.clearChallenge) cookies.push(writeCookie(challengeCookie, '', 0));
    return authResponse(result.body, result.status, cookies);
  } catch { return authResponse({ error: 'unavailable' }, 503); }
}
