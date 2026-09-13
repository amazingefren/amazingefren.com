import type {
  Command,
  Result,
  StudioPort,
  StudioState,
} from '../../../contracts/writing/index.ts';
import { transitionGuestState } from './commands.ts';
import { createId, invalid } from './state.ts';
import { createGuestStorage } from './storage.ts';

const storageKey = 'ae-writing-guest-v1';

export const createGuestWritingPort = (
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
): StudioPort => {
  const guestStorage = createGuestStorage(storage, storageKey);
  const read = async (): Promise<Result<StudioState>> => guestStorage.read();
  const execute = async (command: Command): Promise<Result<StudioState>> => {
    try {
      if (command.operation === 'studio.writing.reset')
        return guestStorage.reset();

      const current = await read();
      if (!current.ok) return current;
      if (command.operation === 'studio.writing.read') return current;

      const next = transitionGuestState(current.value, command, {
        changedAt: new Date().toISOString(),
        createId,
      });
      return next.ok ? guestStorage.write(next.value) : next;
    } catch {
      return invalid('The guest command is invalid.');
    }
  };

  return { read, execute };
};
