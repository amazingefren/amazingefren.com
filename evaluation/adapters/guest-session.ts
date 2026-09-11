import { createGuestEvaluationPort, emptyEvaluationState } from './guest.ts';
import {
  maxEvaluationStateBytes,
  type EvaluationPort,
} from '../contracts/index.ts';

export const guestEvaluationStorageKey = 'ae-evaluation-guest-v1';
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createGuestEvaluationSession(
  storage: StoragePort,
): EvaluationPort {
  return {
    async execute(command) {
      try {
        const previous = storage.getItem(guestEvaluationStorageKey);
        if (
          previous &&
          new TextEncoder().encode(previous).byteLength >
            maxEvaluationStateBytes
        )
          throw new Error();
        const port = createGuestEvaluationPort(
          previous ? JSON.parse(previous) : emptyEvaluationState(),
        );
        const result = await port.execute(command);
        if (
          !result.ok ||
          !('value' in result) ||
          command.operation === 'evaluation.read'
        )
          return result;
        const serialized = JSON.stringify(result.value);
        if (
          new TextEncoder().encode(serialized).byteLength >
          maxEvaluationStateBytes
        )
          throw new Error();
        if (storage.getItem(guestEvaluationStorageKey) !== previous)
          return {
            ok: false,
            error: {
              code: 'conflict',
              message: 'Benchmark data changed. Refresh and try again.',
            },
          };
        storage.setItem(guestEvaluationStorageKey, serialized);
        return result;
      } catch {
        return {
          ok: false,
          error: {
            code: 'unavailable',
            message:
              'Guest benchmark storage is unavailable or invalid. Saved data has not been replaced.',
          },
        };
      }
    },
  };
}

export function resetGuestEvaluation(storage: StoragePort) {
  storage.removeItem(guestEvaluationStorageKey);
}
