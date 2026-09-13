import type {
  Publication,
  Result,
  StudioDocument,
  StudioState,
} from '../../../contracts/writing/index.ts';

export const emptyGuestState = (): StudioState => ({
  schemaVersion: 1,
  synthetic: true,
  version: 0,
  documents: [],
  publications: [],
  assets: [],
});

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const success = <T>(value: T): Result<T> => ({ ok: true, value });

export const unavailable = <T>(message: string): Result<T> => ({
  ok: false,
  error: { code: 'unavailable', message },
});

export const invalid = <T>(message: string): Result<T> => ({
  ok: false,
  error: { code: 'invalid', message },
});

export const missing = <T>(message: string): Result<T> => ({
  ok: false,
  error: { code: 'missing', message },
});

export const conflict = <T>(message: string): Result<T> => ({
  ok: false,
  error: { code: 'conflict', message },
});

export function documentById(state: StudioState, documentId: string) {
  return state.documents.find((item) => item.id === documentId);
}

export function publicationById(state: StudioState, publicationId: string) {
  return state.publications.find((item) => item.id === publicationId);
}

export function requirePublication(
  state: StudioState,
  publicationId: string,
  expectedVersion: number,
): Result<Publication> {
  const publication = publicationById(state, publicationId);
  if (!publication) return missing('Publication project does not exist.');
  if (publication.version !== expectedVersion)
    return conflict('Publication project version does not match.');
  return success(publication);
}

export function transitionState(
  state: StudioState,
  change: (draft: StudioState) => Result<void>,
): Result<StudioState> {
  const draft = clone(state);
  const result = change(draft);
  if (!result.ok) return result;
  draft.version += 1;
  return success(draft);
}

export function createId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function slugify(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'untitled'
  );
}

export type GuestMutationContext = {
  changedAt: string;
  createId(prefix: string): string;
};

export function appendDocumentRevision(
  document: StudioDocument,
  number: number,
  savedAt: string,
): void {
  if (document.kind === 'manuscript') return;
  document.revisions.push({
    number,
    title: document.title,
    body: document.body,
    savedAt,
  });
}
