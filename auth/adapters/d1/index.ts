import { freshVerificationLifetime, type Challenge, type Credential, type StoredSession } from '../../contracts/index.ts';
import type { AuthDatabase, AuthStore } from '../../ports/index.ts';
type CredentialRow = Omit<Credential, 'transports'> & { transports: string };
const credentialColumns = 'id, public_key AS publicKey, counter, transports';
const challengeColumns = 'token_hash AS tokenHash, challenge, kind, authorization, session_hash AS sessionHash, expires_at AS expiresAt';
function credentialFromRow(row: CredentialRow): Credential {
  return { ...row, transports: JSON.parse(row.transports) as string[] };
}
export function createAuthStore(database: AuthDatabase): AuthStore {
  return {
    async enrolled() {
      return Boolean(await database.prepare('SELECT id FROM auth_owner WHERE id = ?').bind('amazingefren').first());
    },
    async credentials() {
      const result = await database.prepare(`SELECT ${credentialColumns} FROM auth_credentials ORDER BY created_at`).all<CredentialRow>();
      return result.results.map(credentialFromRow);
    },
    async credential(id) {
      const row = await database.prepare(`SELECT ${credentialColumns} FROM auth_credentials WHERE id = ?`).bind(id).first<CredentialRow>();
      return row ? credentialFromRow(row) : null;
    },
    async saveCredential(credential, authorization, now) {
      const values = [credential.id, credential.publicKey, credential.counter, JSON.stringify(credential.transports), now];
      if (authorization.authorization === 'bootstrap') {
        const results = await database.batch([
          database.prepare('INSERT INTO auth_credentials (id, public_key, counter, transports, created_at) SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM auth_owner)').bind(...values),
          database.prepare('INSERT INTO auth_owner (id, enrolled_at) SELECT ?, ? WHERE EXISTS (SELECT 1 FROM auth_credentials WHERE id = ?) AND NOT EXISTS (SELECT 1 FROM auth_owner)').bind('amazingefren', now, credential.id),
        ]);
        return results[0].meta.changes === 1 && results[1].meta.changes === 1;
      }
      if (authorization.authorization !== 'owner' || !authorization.sessionHash) return false;
      const result = await database.prepare('INSERT INTO auth_credentials (id, public_key, counter, transports, created_at) SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM auth_sessions WHERE token_hash = ? AND owner_id = ? AND expires_at > ? AND verified_at > ? AND verified_at <= ?) AND (SELECT count(*) FROM auth_credentials) < 10').bind(...values, authorization.sessionHash, 'amazingefren', now, now - freshVerificationLifetime, now).run();
      return result.meta.changes === 1;
    },
    async updateCounter(id, previous, next) {
      const result = await database.prepare('UPDATE auth_credentials SET counter = ? WHERE id = ? AND counter = ?').bind(next, id, previous).run();
      return result.meta.changes === 1;
    },
    async saveChallenge(challenge, now) {
      const result = await database.batch([
        database.prepare('DELETE FROM auth_challenges WHERE expires_at <= ?').bind(now),
        database.prepare('INSERT INTO auth_challenges (token_hash, challenge, kind, authorization, session_hash, expires_at) SELECT ?, ?, ?, ?, ?, ? WHERE (SELECT count(*) FROM auth_challenges) < 1024').bind(challenge.tokenHash, challenge.challenge, challenge.kind, challenge.authorization, challenge.sessionHash, challenge.expiresAt),
      ]);
      return result[1].meta.changes === 1;
    },
    consumeChallenge(hash, kind, now) {
      return database.prepare(`DELETE FROM auth_challenges WHERE token_hash = ? AND kind = ? AND expires_at > ? RETURNING ${challengeColumns}`).bind(hash, kind, now).first<Challenge>();
    },
    session(hash, now) {
      return database.prepare('SELECT token_hash AS tokenHash, owner_id AS ownerId, verified_at AS verifiedAt, expires_at AS expiresAt FROM auth_sessions WHERE token_hash = ? AND expires_at > ? AND verified_at <= ?').bind(hash, now, now).first<StoredSession>();
    },
    async saveSession(session, previousHash, now) {
      await database.batch([
        database.prepare('DELETE FROM auth_sessions WHERE expires_at <= ? OR token_hash = ?').bind(now, previousHash),
        database.prepare('DELETE FROM auth_sessions WHERE token_hash IN (SELECT token_hash FROM auth_sessions ORDER BY verified_at DESC LIMIT -1 OFFSET 19)'),
        database.prepare('INSERT INTO auth_sessions (token_hash, owner_id, verified_at, expires_at) VALUES (?, ?, ?, ?)').bind(session.tokenHash, session.ownerId, session.verifiedAt, session.expiresAt),
      ]);
    },
    async deleteSession(hash) {
      await database.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(hash).run();
    },
    async allowAttempt(key, now) {
      const bucket = `${key}:${Math.floor(now / 60000)}`;
      const result = await database.batch([
        database.prepare('DELETE FROM auth_attempts WHERE expires_at <= ?').bind(now),
        database.prepare('INSERT INTO auth_attempts (key, count, expires_at) SELECT ?, 1, ? WHERE (SELECT count(*) FROM auth_attempts) < 4096 ON CONFLICT(key) DO UPDATE SET count = count + 1').bind(bucket, now + 120000),
      ]);
      if (result[1].meta.changes !== 1) return false;
      const row = await database.prepare('SELECT count FROM auth_attempts WHERE key = ?').bind(bucket).first<{ count: number }>();
      return row !== null && row.count <= 20;
    },
  };
}
