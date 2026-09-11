import { timingSafeEqual } from 'node:crypto';
import type { AuthCrypto } from '../../ports/index.ts';
import { encode, hashToken } from './hash.ts';
export { encode, decode, hashToken } from './hash.ts';
export const authCrypto: AuthCrypto = {
  token: () => encode(crypto.getRandomValues(new Uint8Array(32))),
  hash: hashToken,
  async matchesSecret(candidate, secret) {
    const [left, right] = await Promise.all([hashToken(candidate), hashToken(secret)]);
    return timingSafeEqual(new TextEncoder().encode(left), new TextEncoder().encode(right));
  },
};
