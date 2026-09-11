import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse, type AuthenticationResponseJSON, type RegistrationResponseJSON, type AuthenticatorTransport } from '@simplewebauthn/server';
import { ownerId } from '../../contracts/index.ts';
import type { Passkeys } from '../../ports/index.ts';
import { decode, encode } from '../crypto/index.ts';
function validClientContext(response: unknown): boolean {
  if (!response || typeof response !== 'object' || !('response' in response)) return false;
  const payload = response.response;
  if (!payload || typeof payload !== 'object' || !('clientDataJSON' in payload) || typeof payload.clientDataJSON !== 'string') return false;
  const client: unknown = JSON.parse(new TextDecoder().decode(decode(payload.clientDataJSON)));
  if (!client || typeof client !== 'object') return false;
  return (!('crossOrigin' in client) || client.crossOrigin === false) && !('topOrigin' in client);
}
export function createPasskeys(origin: string): Passkeys {
  const rpID = new URL(origin).hostname;
  return {
    registrationOptions: (credentials) => generateRegistrationOptions({
      rpName: 'AE Workspace', rpID, userID: new TextEncoder().encode(ownerId), userName: ownerId,
      attestationType: 'none', timeout: 300000, supportedAlgorithmIDs: [-7, -257, -8],
      excludeCredentials: credentials.map(({ id, transports }) => ({ id, transports: transports as AuthenticatorTransport[] })),
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    }),
    authenticationOptions: () => generateAuthenticationOptions({ rpID, timeout: 300000, userVerification: 'required' }),
    async verifyRegistration(response, challenge) {
      try {
        if (!validClientContext(response)) return null;
        const result = await verifyRegistrationResponse({ response: response as RegistrationResponseJSON, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true, supportedAlgorithmIDs: [-7, -257, -8] });
        if (!result.verified || !result.registrationInfo) return null;
        const credential = result.registrationInfo.credential;
        return { id: credential.id, publicKey: encode(credential.publicKey), counter: credential.counter, transports: credential.transports ?? [] };
      } catch { return null; }
    },
    async verifyAuthentication(response, challenge, credential) {
      try {
        if (!validClientContext(response)) return null;
        const assertion = response as AuthenticationResponseJSON;
        if (assertion.response.userHandle && assertion.response.userHandle !== encode(new TextEncoder().encode(ownerId))) return null;
        const result = await verifyAuthenticationResponse({ response: assertion, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true, credential: { id: credential.id, publicKey: decode(credential.publicKey), counter: credential.counter, transports: credential.transports as AuthenticatorTransport[] } });
        return result.verified ? result.authenticationInfo.newCounter : null;
      } catch { return null; }
    },
  };
}
