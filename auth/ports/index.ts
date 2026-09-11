import type { Challenge, Credential, PasskeyOptions, StoredSession } from '../contracts/index.ts';
export type AuthValue = string | number | null;
export interface AuthSessionStatement {
  bind(...values: AuthValue[]): AuthSessionStatement;
  first<T>(): Promise<T | null>;
}
export interface AuthSessionDatabase { prepare(query: string): AuthSessionStatement }
export interface AuthStatement extends AuthSessionStatement {
  bind(...values: AuthValue[]): AuthStatement;
  run(): Promise<{ meta: { changes?: number } }>;
  all<T>(): Promise<{ results: T[] }>;
}
export interface AuthDatabase extends AuthSessionDatabase {
  prepare(query: string): AuthStatement;
  batch(statements: AuthStatement[]): Promise<{ meta: { changes?: number } }[]>;
}
export interface AuthStore {
  enrolled(): Promise<boolean>;
  credentials(): Promise<Credential[]>;
  credential(id: string): Promise<Credential | null>;
  saveCredential(credential: Credential, authorization: Challenge, now: number): Promise<boolean>;
  updateCounter(id: string, previous: number, next: number): Promise<boolean>;
  saveChallenge(challenge: Challenge, now: number): Promise<boolean>;
  consumeChallenge(hash: string, kind: Challenge['kind'], now: number): Promise<Challenge | null>;
  session(hash: string, now: number): Promise<StoredSession | null>;
  saveSession(session: StoredSession, previousHash: string | null, now: number): Promise<void>;
  deleteSession(hash: string): Promise<void>;
  allowAttempt(key: string, now: number): Promise<boolean>;
}
export interface AuthCrypto {
  token(): string;
  hash(value: string): Promise<string>;
  matchesSecret(candidate: string, secret: string): Promise<boolean>;
}
export interface Passkeys {
  registrationOptions(credentials: Credential[]): Promise<PasskeyOptions>;
  authenticationOptions(): Promise<PasskeyOptions>;
  verifyRegistration(response: unknown, challenge: string): Promise<Credential | null>;
  verifyAuthentication(response: unknown, challenge: string, credential: Credential): Promise<number | null>;
}
export type AuthDependencies = { store: AuthStore; crypto: AuthCrypto; passkeys: Passkeys; now: () => number; origin: string; bootstrapToken?: string };
