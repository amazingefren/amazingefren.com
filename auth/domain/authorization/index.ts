import { freshVerificationLifetime, ownerId, type OwnerSession } from '../../contracts/index.ts';
export function isFreshOwner(session: OwnerSession | null, now: number): boolean {
  return session !== null && session.ownerId === ownerId && session.expiresAt > now && session.verifiedAt <= now && session.verifiedAt > now - freshVerificationLifetime;
}
export function validOrigin(origin: string | undefined): origin is string {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && url.origin === origin && !url.username && !url.password;
  } catch { return false; }
}
