import { hashToken } from '../crypto/hash.ts';
import { readCookie, sessionCookie } from '../../domain/sessions/index.ts';
import { ownerId, type OwnerSession } from '../../contracts/index.ts';
import type { AuthSessionDatabase } from '../../ports/index.ts';
export type { AuthSessionDatabase } from '../../ports/index.ts';
export async function readOwnerSession(request: Request, database?: AuthSessionDatabase): Promise<OwnerSession | null> {
  const token = readCookie(request.headers.get('cookie'), sessionCookie);
  if (!token || !database) return null;
  try {
    const now = Date.now();
    const row = await database.prepare('SELECT owner_id AS ownerId, verified_at AS verifiedAt, expires_at AS expiresAt FROM auth_sessions WHERE token_hash = ? AND expires_at > ? AND verified_at <= ?').bind(await hashToken(token), now, now).first<OwnerSession>();
    return row?.ownerId === ownerId ? row : null;
  } catch { return null; }
}
