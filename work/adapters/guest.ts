import { maxWorkStateBytes } from '../../contracts/work/index.ts';
import type { WorkPort, Result } from '../../contracts/work/index.ts';
import { execute, seed } from '../domain/index.ts';
import { isState, parseCommand } from '../operations/validation.ts';
const key = 'ae.work.guest.v1';
export function resetGuestWork(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(key);
}
export function createGuestWorkPort(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
): WorkPort {
  return {
    async execute(command): Promise<Result> {
      if (!parseCommand(command))
        return {
          ok: false,
          error: 'invalid',
          message: 'Invalid work command.',
        };
      try {
        const raw = storage.getItem(key);
        if (
          raw !== null &&
          new TextEncoder().encode(raw).byteLength > maxWorkStateBytes
        )
          return {
            ok: false,
            error: 'unavailable',
            message: 'Saved work exceeds the session limit.',
          };
        const state: unknown = raw === null ? seed() : JSON.parse(raw);
        if (!isState(state) || !state.synthetic)
          return {
            ok: false,
            error: 'unavailable',
            message: 'Saved guest work is invalid.',
          };
        const result = execute(state, command);
        if (!result.ok || command.operation === 'work.read') return result;
        const serialized = JSON.stringify(result.state);
        if (new TextEncoder().encode(serialized).byteLength > maxWorkStateBytes)
          return {
            ok: false,
            error: 'unavailable',
            message: 'Session storage is full.',
          };
        storage.setItem(key, serialized);
        return result;
      } catch {
        return {
          ok: false,
          error: 'unavailable',
          message: 'Could not save or load guest work. Retry.',
        };
      }
    },
  };
}
