import type { Result, StudioState } from '../../../contracts/writing/index.ts';
import { isStudioState } from '../validation.ts';
import { emptyGuestState, success, unavailable } from './state.ts';

export type GuestStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function createGuestStorage(
  storage: GuestStorage,
  storageKey: string,
): {
  read(): Result<StudioState>;
  write(state: StudioState): Result<StudioState>;
  reset(): Result<StudioState>;
} {
  return {
    read() {
      let raw: string | null;
      try {
        raw = storage.getItem(storageKey);
      } catch {
        return unavailable('Guest writing storage is unavailable.');
      }
      if (raw === null) return success(emptyGuestState());
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!isStudioState(parsed) || !parsed.synthetic)
          return unavailable('Guest writing storage is corrupt.');
        normalizeManuscripts(parsed);
        return success(parsed);
      } catch {
        return unavailable('Guest writing storage is corrupt.');
      }
    },
    write(state) {
      if (!isStudioState(state) || !state.synthetic)
        return unavailable('Guest writing state is invalid.');
      try {
        storage.setItem(storageKey, JSON.stringify(state));
        return success(state);
      } catch {
        return unavailable('Guest writing storage cannot save changes.');
      }
    },
    reset() {
      try {
        storage.removeItem(storageKey);
        return success(emptyGuestState());
      } catch {
        return unavailable('Guest writing storage cannot reset.');
      }
    },
  };
}

function normalizeManuscripts(state: StudioState): void {
  const manuscriptIds = new Set(
    state.publications.flatMap((publication) => publication.chapterIds),
  );
  state.documents.forEach((document) => {
    if (manuscriptIds.has(document.id)) document.kind = 'manuscript';
  });
}
