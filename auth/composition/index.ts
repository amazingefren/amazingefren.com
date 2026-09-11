import { authCrypto } from '../adapters/crypto/index.ts';
import { createAuthStore } from '../adapters/d1/index.ts';
import { authResponse, handleAuthHttp } from '../adapters/http/index.ts';
import { createPasskeys } from '../adapters/webauthn/index.ts';
import { validOrigin } from '../domain/authorization/index.ts';
import type { AuthDatabase } from '../ports/index.ts';
export { readOwnerSession } from '../adapters/d1/session.ts';
export type { AuthDatabase } from '../ports/index.ts';
export type AuthEnvironment = { AUTH_DB?: AuthDatabase; AUTH_ORIGIN?: string; AUTH_BOOTSTRAP_TOKEN?: string };
export async function handleAuthRequest(request: Request, environment: AuthEnvironment): Promise<Response> {
  if (!environment.AUTH_DB || !validOrigin(environment.AUTH_ORIGIN)) return authResponse({ error: 'unavailable' }, 503);
  return handleAuthHttp(request, { store: createAuthStore(environment.AUTH_DB), crypto: authCrypto, passkeys: createPasskeys(environment.AUTH_ORIGIN), now: Date.now, origin: environment.AUTH_ORIGIN, bootstrapToken: environment.AUTH_BOOTSTRAP_TOKEN });
}
