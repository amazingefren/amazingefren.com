import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthStore } from '../adapters/d1/index.ts';
import { readOwnerSession } from '../adapters/d1/session.ts';
import { authCrypto } from '../adapters/crypto/index.ts';
import { createPasskeys } from '../adapters/webauthn/index.ts';
import { handleAuthHttp } from '../adapters/http/index.ts';
import { executeAuth } from '../operations/passkeys/index.ts';
import { readCookie } from '../domain/sessions/index.ts';
import { ownerId, sessionLifetime } from '../contracts/index.ts';
import { authenticator, testDatabase } from './support.ts';
function setup() {
  const database = testDatabase();
  let now = Date.now();
  const dependencies = { store: createAuthStore(database), crypto: authCrypto, passkeys: createPasskeys('https://example.com'), now: () => now, origin: 'https://example.com', bootstrapToken: 'A'.repeat(43) };
  const device = authenticator();
  return { database, dependencies, device, advance: (ms: number) => { now += ms; } };
}
const noCookies = { session: null, challenge: null };
async function enroll(context: ReturnType<typeof setup>) {
  const { dependencies, device } = context;
  const options = await executeAuth('registration-options', { bootstrapToken: dependencies.bootstrapToken }, noCookies, dependencies);
  const challenge = (options.body as { challenge: string }).challenge;
  const response = device.registration(challenge);
  const result = await executeAuth('registration-verify', { response }, { session: null, challenge: options.challengeToken! }, dependencies);
  assert.equal(result.status, 200);
  return result.sessionToken!;
}
test('bootstrap requires secret and remains disabled after deleting every passkey', async () => {
  const context = setup();
  for (const bootstrapToken of [undefined, '', 'wrong'.repeat(20)]) {
    assert.equal((await executeAuth('registration-options', { bootstrapToken }, noCookies, context.dependencies)).status, 403);
  }
  await enroll(context);
  context.database.sql.exec('DELETE FROM auth_credentials');
  assert.equal((await executeAuth('registration-options', { bootstrapToken: context.dependencies.bootstrapToken }, noCookies, context.dependencies)).status, 403);
});
test('two bootstrap ceremonies can only create one owner credential', async () => {
  const context = setup();
  const input = { bootstrapToken: context.dependencies.bootstrapToken };
  const first = await executeAuth('registration-options', input, noCookies, context.dependencies);
  const second = await executeAuth('registration-options', input, noCookies, context.dependencies);
  const device2 = authenticator();
  const results = await Promise.all([first, second].map((options, i) => executeAuth('registration-verify', { response: (i ? device2 : context.device).registration((options.body as { challenge: string }).challenge) }, { session: null, challenge: options.challengeToken! }, context.dependencies)));
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 403]);
  assert.equal(context.database.sql.prepare('SELECT count(*) AS n FROM auth_credentials').get()!.n, 1);
});
test('challenge cookie binding, expiry, single use, and invalid verification consume attempts', async () => {
  const context = setup();
  await enroll(context);
  const options = await executeAuth('authentication-options', {}, noCookies, context.dependencies);
  const response = context.device.authentication((options.body as { challenge: string }).challenge);
  assert.equal((await executeAuth('authentication-verify', { response }, noCookies, context.dependencies)).status, 403);
  const cookies = { session: null, challenge: options.challengeToken! };
  const results = await Promise.all([executeAuth('authentication-verify', { response }, cookies, context.dependencies), executeAuth('authentication-verify', { response }, cookies, context.dependencies)]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 403]);
  const expired = await executeAuth('authentication-options', {}, noCookies, context.dependencies);
  context.advance(300001);
  assert.equal((await executeAuth('authentication-verify', { response }, { session: null, challenge: expired.challengeToken! }, context.dependencies)).status, 403);
  const invalid = await executeAuth('authentication-options', {}, noCookies, context.dependencies);
  assert.equal((await executeAuth('authentication-verify', { response: {} }, { session: null, challenge: invalid.challengeToken! }, context.dependencies)).status, 403);
  assert.equal(await context.dependencies.store.consumeChallenge(await authCrypto.hash(invalid.challengeToken!), 'authentication', context.dependencies.now()), null);
});
test('session stores only hashes, rejects forged or duplicate cookies, expires, and logs out', async () => {
  const context = setup();
  const token = await enroll(context);
  const request = (cookie: string) => new Request('https://example.com/workspace', { headers: { cookie, 'cf-access-jwt-assertion': 'forged' } });
  const row = context.database.sql.prepare('SELECT token_hash, expires_at, verified_at FROM auth_sessions').get()!;
  assert.notEqual(row.token_hash, token);
  assert.equal(Number(row.expires_at) - Number(row.verified_at), sessionLifetime);
  assert.equal((await readOwnerSession(request(`__Host-ae-session=${token}`), context.database))?.ownerId, ownerId);
  assert.equal(await readOwnerSession(request(`__Host-ae-session=${'X'.repeat(43)}`), context.database), null);
  assert.equal(await readOwnerSession(request(`__Host-ae-session=${token}; __Host-ae-session=${token}`), context.database), null);
  assert.equal(await readOwnerSession(request(`__Host-ae-session=${token}`)), null);
  await executeAuth('logout', {}, { session: token, challenge: null }, context.dependencies);
  assert.equal(await readOwnerSession(request(`__Host-ae-session=${token}`), context.database), null);
  const token2 = await enrollExisting(context);
  context.database.sql.prepare('UPDATE auth_sessions SET expires_at = 0').run();
  assert.equal(await readOwnerSession(request(`__Host-ae-session=${token2}`), context.database), null);
});
async function enrollExisting(context: ReturnType<typeof setup>) {
  const options = await executeAuth('authentication-options', {}, noCookies, context.dependencies);
  const result = await executeAuth('authentication-verify', { response: context.device.authentication((options.body as { challenge: string }).challenge) }, { session: null, challenge: options.challengeToken! }, context.dependencies);
  assert.equal(result.status, 200);
  return result.sessionToken!;
}
test('later enrollment needs fresh session, same session at verify, and checks revocation atomically', async () => {
  const context = setup();
  const token = await enroll(context);
  const cookies = { session: token, challenge: null };
  const options = await executeAuth('registration-options', {}, cookies, context.dependencies);
  assert.equal(options.status, 200);
  await executeAuth('logout', {}, cookies, context.dependencies);
  assert.equal((await executeAuth('registration-verify', { response: authenticator().registration((options.body as { challenge: string }).challenge) }, { session: token, challenge: options.challengeToken! }, context.dependencies)).status, 403);
  const replacement = await enrollExisting(context);
  context.advance(300001);
  assert.equal((await executeAuth('registration-options', {}, { session: replacement, challenge: null }, context.dependencies)).status, 403);
});
test('HTTP rejects cross-site, missing origin, bad method, unknown routes, and oversized bodies', async () => {
  const { dependencies } = setup();
  const make = (origin = dependencies.origin, body = '{}', method = 'POST', path = 'authentication-options') => new Request(`${dependencies.origin}/api/auth/${path}`, { method, headers: { origin, 'content-type': 'application/json' }, ...(method === 'POST' ? { body } : {}) });
  for (const request of [make('https://evil.example'), make('')]) assert.equal((await handleAuthHttp(request, dependencies)).status, 403);
  const methodDenied = await handleAuthHttp(make(dependencies.origin, '{}', 'GET'), dependencies);
  assert.equal(methodDenied.status, 405);
  assert.equal(methodDenied.headers.get('allow'), 'POST');
  assert.equal((await handleAuthHttp(make(dependencies.origin, JSON.stringify({ role: 'owner' })), dependencies)).status, 400);
  assert.equal((await handleAuthHttp(make(dependencies.origin, '{}', 'POST', 'undeclared'), dependencies)).status, 404);
  assert.equal((await handleAuthHttp(make(dependencies.origin, ' '.repeat(16385)), dependencies)).status, 400);
  const result = await handleAuthHttp(make(), dependencies);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.match(result.headers.get('set-cookie')!, /__Host-ae-challenge=[A-Za-z0-9_-]{43}; Path=\/; Secure; HttpOnly; SameSite=Strict; Max-Age=300/);
  assert.equal(readCookie(result.headers.get('set-cookie'), '__Host-ae-challenge')?.length, 43);
});
test('attempt and challenge storage enforce limits and clean expired state', async () => {
  const { dependencies, database, advance } = setup();
  for (let i = 0; i < 20; i++) assert.equal(await dependencies.store.allowAttempt('ip', dependencies.now()), true);
  assert.equal(await dependencies.store.allowAttempt('ip', dependencies.now()), false);
  const insert = database.sql.prepare("INSERT INTO auth_challenges VALUES (?, 'challenge', 'authentication', 'public', NULL, ?)");
  for (let i = 0; i < 1024; i++) insert.run(String(i), dependencies.now() + 300000);
  assert.equal((await executeAuth('authentication-options', {}, noCookies, dependencies)).status, 429);
  advance(300001);
  assert.equal((await executeAuth('authentication-options', {}, noCookies, dependencies)).status, 200);
  assert.equal(database.sql.prepare('SELECT count(*) AS n FROM auth_challenges').get()!.n, 1);
});
test('backup passkey enrollment succeeds and its session works independently', async () => {
  const context = setup();
  const original = await enroll(context);
  const options = await executeAuth('registration-options', {}, { session: original, challenge: null }, context.dependencies);
  const backup = authenticator();
  const result = await executeAuth('registration-verify', { response: backup.registration((options.body as { challenge: string }).challenge) }, { session: original, challenge: options.challengeToken! }, context.dependencies);
  assert.equal(result.status, 200);
  assert.equal(context.database.sql.prepare('SELECT count(*) AS n FROM auth_credentials').get()!.n, 2);
  assert.equal(await context.dependencies.store.session(await authCrypto.hash(original), context.dependencies.now()), null);
  const challenge = await executeAuth('authentication-options', {}, noCookies, context.dependencies);
  const signedIn = await executeAuth('authentication-verify', { response: backup.authentication((challenge.body as { challenge: string }).challenge) }, { session: null, challenge: challenge.challengeToken! }, context.dependencies);
  assert.equal(signedIn.status, 200);
});
test('credential persistence rejects revoked owner authorization even after earlier validation', async () => {
  const context = setup();
  const token = await enroll(context);
  const hash = await authCrypto.hash(token);
  const challenge = { tokenHash: 'unused', challenge: 'unused', kind: 'registration' as const, authorization: 'owner' as const, sessionHash: hash, expiresAt: context.dependencies.now() + 300000 };
  assert.ok(await context.dependencies.store.session(hash, context.dependencies.now()));
  await context.dependencies.store.deleteSession(hash);
  assert.equal(await context.dependencies.store.saveCredential(authenticator().credential, challenge, context.dependencies.now()), false);
});
