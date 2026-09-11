export const ownerId = 'amazingefren' as const;
export const sessionLifetime = 12 * 60 * 60 * 1000;
export const challengeLifetime = 5 * 60 * 1000;
export const freshVerificationLifetime = 5 * 60 * 1000;
export type OwnerSession = {
  ownerId: typeof ownerId;
  verifiedAt: number;
  expiresAt: number;
};
export type StoredSession = OwnerSession & { tokenHash: string };
export type Credential = {
  id: string;
  publicKey: string;
  counter: number;
  transports: string[];
};
export type Challenge = {
  tokenHash: string;
  challenge: string;
  kind: 'registration' | 'authentication';
  authorization: 'bootstrap' | 'owner' | 'public';
  sessionHash: string | null;
  expiresAt: number;
};
export type AuthInput = { bootstrapToken?: string; response?: unknown };
export type AuthError =
  | 'invalid_request'
  | 'forbidden'
  | 'unauthorized'
  | 'rate_limited'
  | 'unavailable'
  | 'not_found';
export type AuthResult = { ok: true } | { error: AuthError };
export type PasskeyOptions = { challenge: string } & object;
