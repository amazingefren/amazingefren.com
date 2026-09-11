import { createGuestEvidencePort } from './guest.ts';
import {
  isEvidenceState,
  maxEvidenceStateBytes,
  type EvidencePort,
} from '../contracts/index.ts';

export const guestEvidenceStorageKey = 'ae-evidence-guest-v1';
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createGuestEvidenceSession(storage: StoragePort): EvidencePort {
  return {
    async execute(command) {
      try {
        const previous = storage.getItem(guestEvidenceStorageKey);
        if (
          previous &&
          new TextEncoder().encode(previous).byteLength > maxEvidenceStateBytes
        )
          throw new Error();
        const initial = previous ? JSON.parse(previous) : undefined;
        if (
          previous !== null &&
          (!isEvidenceState(initial) || !initial.synthetic)
        )
          throw new Error();
        const result = await createGuestEvidencePort(initial).execute(command);
        if (
          !result.ok ||
          !('value' in result) ||
          command.operation === 'evidence.read'
        )
          return result;
        if (!isEvidenceState(result.value) || !result.value.synthetic)
          throw new Error();
        const serialized = JSON.stringify(result.value);
        if (
          new TextEncoder().encode(serialized).byteLength >
          maxEvidenceStateBytes
        )
          throw new Error();
        if (storage.getItem(guestEvidenceStorageKey) !== previous)
          return {
            ok: false,
            error: {
              code: 'conflict',
              message: 'Evidence changed. Refresh and try again.',
            },
          };
        storage.setItem(guestEvidenceStorageKey, serialized);
        return result;
      } catch {
        return {
          ok: false,
          error: {
            code: 'unavailable',
            message: 'Guest evidence storage is unavailable or invalid.',
          },
        };
      }
    },
  };
}
export function resetGuestEvidence(storage: StoragePort) {
  storage.removeItem(guestEvidenceStorageKey);
}
