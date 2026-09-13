import type {
  WorkspaceError,
  WorkspaceResult,
  WorkspaceState,
} from '../contracts/index.ts';

export const MAX_DOCUMENTS = 64;
export const MAX_TASKS = 128;
export const MAX_EXPERIMENTS = 64;
export const MAX_RELATIONSHIPS = 128;
export const MAX_ACTIVITY = 128;
export const MAX_REVISIONS_PER_DOCUMENT = 32;
export const MAX_TITLE_LENGTH = 160;
export const MAX_BODY_LENGTH = 200_000;
export const MAX_HYPOTHESIS_LENGTH = 4_000;
export const MAX_OBSERVATIONS_LENGTH = 20_000;
export const MAX_LABEL_LENGTH = 160;

export interface WorkspaceDependencies {
  now: () => number;
  nextId: () => string;
}

export function timestamp(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function validTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 40 &&
    Number.isFinite(Date.parse(value))
  );
}

export function safeId(value: unknown): string | null {
  return validId(value) ? value : null;
}

export function validId(value: unknown): value is string {
  return (
    typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value)
  );
}

export function validRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}

export function validText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

export function validBoundedText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max;
}

export function optionalText(value: unknown, max: number): boolean {
  return value === undefined || validText(value, max) || value === '';
}

export function optionalId(value: unknown): boolean {
  return value === undefined || validId(value);
}

export function validExperimentStatus(
  value: unknown,
): value is 'planned' | 'running' | 'complete' {
  return value === 'planned' || value === 'running' || value === 'complete';
}

export function emptyInput(value: unknown): boolean {
  return isRecord(value) && Object.keys(value).length === 0;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function hasOnly(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

export function hasId(state: WorkspaceState, id: string): boolean {
  return (
    state.documents.some((item) => item.id === id) ||
    state.tasks.some((item) => item.id === id) ||
    state.experiments.some((item) => item.id === id) ||
    state.relationships.some((item) => item.id === id) ||
    state.activity.some((item) => item.id === id)
  );
}

export function success<T>(value: T): WorkspaceResult<T> {
  return { ok: true, value };
}

export function invalid(message: string): WorkspaceResult<never> {
  return { ok: false, error: { code: 'invalid', message } };
}

export function denied(message: string): WorkspaceResult<never> {
  return { ok: false, error: { code: 'denied', message } };
}

export function missing(message: string): WorkspaceResult<never> {
  return { ok: false, error: { code: 'missing', message } };
}

export function conflict(message: string): WorkspaceResult<never> {
  return { ok: false, error: { code: 'conflict', message } };
}

export function unavailable(message: string): WorkspaceResult<never> {
  return { ok: false, error: { code: 'unavailable', message } };
}

export function workspaceError(
  code: WorkspaceError['code'],
  message: string,
): WorkspaceResult<never> {
  return { ok: false, error: { code, message } };
}
