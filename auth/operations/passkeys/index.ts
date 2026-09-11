import {
  challengeLifetime,
  ownerId,
  sessionLifetime,
  type AuthInput,
  type Challenge,
} from '../../contracts/index.ts';
import { isFreshOwner } from '../../domain/authorization/index.ts';
import type { AuthDependencies } from '../../ports/index.ts';
export type AuthOperation =
  | 'registration-options'
  | 'registration-verify'
  | 'authentication-options'
  | 'authentication-verify'
  | 'logout';
export type OperationResult = {
  status: number;
  body: object;
  sessionToken?: string;
  challengeToken?: string;
  clearChallenge?: boolean;
  clearSession?: boolean;
};
const denied: OperationResult = { status: 403, body: { error: 'forbidden' } };
export async function executeAuth(
  operation: AuthOperation,
  input: AuthInput,
  cookies: { session: string | null; challenge: string | null },
  dependencies: AuthDependencies,
): Promise<OperationResult> {
  const { store, crypto, passkeys } = dependencies;
  const now = dependencies.now();
  const sessionHash = cookies.session
    ? await crypto.hash(cookies.session)
    : null;
  if (operation === 'logout') {
    if (sessionHash) await store.deleteSession(sessionHash);
    return {
      status: 200,
      body: { ok: true },
      clearSession: true,
      clearChallenge: true,
    };
  }
  if (operation.endsWith('-options')) {
    let authorization: Challenge['authorization'] = 'public';
    const kind =
      operation === 'registration-options' ? 'registration' : 'authentication';
    if (kind === 'registration') {
      if (await store.enrolled()) {
        const session = sessionHash
          ? await store.session(sessionHash, now)
          : null;
        if (!isFreshOwner(session, now)) return denied;
        authorization = 'owner';
      } else {
        const secret = dependencies.bootstrapToken;
        if (
          !secret ||
          secret.length < 43 ||
          secret.length > 256 ||
          typeof input.bootstrapToken !== 'string' ||
          input.bootstrapToken.length < 43 ||
          input.bootstrapToken.length > 256 ||
          !(await crypto.matchesSecret(input.bootstrapToken, secret))
        )
          return denied;
        authorization = 'bootstrap';
      }
    }
    const options =
      kind === 'registration'
        ? await passkeys.registrationOptions(await store.credentials())
        : await passkeys.authenticationOptions();
    const challengeToken = crypto.token();
    const saved = await store.saveChallenge(
      {
        tokenHash: await crypto.hash(challengeToken),
        challenge: options.challenge,
        kind,
        authorization,
        sessionHash: authorization === 'owner' ? sessionHash : null,
        expiresAt: now + challengeLifetime,
      },
      now,
    );
    return saved
      ? { status: 200, body: options, challengeToken }
      : { status: 429, body: { error: 'rate_limited' } };
  }
  if (!cookies.challenge) return denied;
  const kind =
    operation === 'registration-verify' ? 'registration' : 'authentication';
  const challenge = await store.consumeChallenge(
    await crypto.hash(cookies.challenge),
    kind,
    now,
  );
  if (!challenge) return { ...denied, clearChallenge: true };
  if (kind === 'registration') {
    if (
      challenge.authorization === 'owner' &&
      (challenge.sessionHash !== sessionHash ||
        !isFreshOwner(
          sessionHash ? await store.session(sessionHash, now) : null,
          now,
        ))
    )
      return { ...denied, clearChallenge: true };
    const credential = await passkeys.verifyRegistration(
      input.response,
      challenge.challenge,
    );
    if (
      !credential ||
      !(await store.saveCredential(credential, challenge, dependencies.now()))
    )
      return { ...denied, clearChallenge: true };
  } else {
    if (
      typeof input.response !== 'object' ||
      !input.response ||
      !('id' in input.response) ||
      typeof input.response.id !== 'string'
    )
      return { ...denied, clearChallenge: true };
    const credential = await store.credential(input.response.id);
    if (!credential) return { ...denied, clearChallenge: true };
    const counter = await passkeys.verifyAuthentication(
      input.response,
      challenge.challenge,
      credential,
    );
    if (
      counter === null ||
      !(await store.updateCounter(credential.id, credential.counter, counter))
    )
      return { ...denied, clearChallenge: true };
  }
  const verifiedAt = dependencies.now();
  const sessionToken = crypto.token();
  await store.saveSession(
    {
      tokenHash: await crypto.hash(sessionToken),
      ownerId,
      verifiedAt,
      expiresAt: verifiedAt + sessionLifetime,
    },
    sessionHash,
    verifiedAt,
  );
  return {
    status: 200,
    body: { ok: true },
    sessionToken,
    clearChallenge: true,
  };
}
