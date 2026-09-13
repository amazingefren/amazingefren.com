import type {
  Command,
  Result,
  StudioDocument,
  StudioState,
} from '../../../contracts/writing/index.ts';
import { beginPublicationDraft } from '../revisions.ts';
import {
  appendDocumentRevision,
  conflict,
  documentById,
  invalid,
  missing,
  type GuestMutationContext,
  success,
} from './state.ts';

type CreateInput = Extract<
  Command,
  { operation: 'studio.notes.create' }
>['input'];
type SaveInput = Extract<Command, { operation: 'studio.notes.save' }>['input'];
type RestoreInput = Extract<
  Command,
  { operation: 'studio.notes.restore' }
>['input'];
type ArchiveInput = Extract<
  Command,
  { operation: 'studio.notes.archive' }
>['input'];

export function createDocument(
  state: StudioState,
  input: CreateInput,
  context: GuestMutationContext,
): Result<void> {
  const title = input.title.trim();
  if (!title) return invalid('Document title is required.');
  state.documents.push({
    id: context.createId('document'),
    kind: input.kind,
    title,
    body: input.body ?? '',
    tags: [],
    collection: input.collection ?? '',
    pinned: false,
    archived: false,
    revision: 0,
    updatedAt: context.changedAt,
    revisions: [],
  });
  return success<void>(undefined);
}

export function saveDocument(
  state: StudioState,
  input: SaveInput,
  context: GuestMutationContext,
): Result<void> {
  const document = documentById(state, input.id);
  if (!document) return missing('Document does not exist.');
  if (document.revision !== input.expectedRevision)
    return conflict('Document revision does not match.');
  if (!input.title.trim()) return invalid('Document title is required.');
  if (sameDocumentFields(document, input)) return success<void>(undefined);

  const revision = document.revision + 1;
  Object.assign(document, {
    title: input.title,
    body: input.body,
    tags: [...input.tags],
    collection: input.collection,
    pinned: input.pinned,
    revision,
    updatedAt: context.changedAt,
  });
  invalidatePublicationsForDocument(state, document.id, context.changedAt);
  appendDocumentRevision(document, revision, context.changedAt);
  return success<void>(undefined);
}

export function restoreDocument(
  state: StudioState,
  input: RestoreInput,
  context: GuestMutationContext,
): Result<void> {
  const document = documentById(state, input.id);
  if (!document) return missing('Document does not exist.');
  if (document.revision !== input.expectedRevision)
    return conflict('Document revision does not match.');
  const revision = document.revisions.find(
    (entry) => entry.number === input.revision,
  );
  if (!revision) return missing('Document revision does not exist.');
  if (document.source && !revision.source)
    return invalid('Org source cannot be replaced implicitly.');

  const number = document.revision + 1;
  Object.assign(document, {
    title: revision.title,
    body: revision.body,
    ...(revision.source ? { source: { ...revision.source } } : {}),
    revision: number,
    updatedAt: context.changedAt,
  });
  invalidatePublicationsForDocument(state, document.id, context.changedAt);
  appendDocumentRevision(document, number, context.changedAt);
  return success<void>(undefined);
}

export function archiveDocument(
  state: StudioState,
  input: ArchiveInput,
  changedAt: string,
): Result<void> {
  const document = documentById(state, input.id);
  if (!document) return missing('Document does not exist.');
  if (document.kind === 'manuscript')
    return invalid('Manuscripts cannot be archived as notes.');
  document.archived = input.archived;
  document.updatedAt = changedAt;
  return success<void>(undefined);
}

export function invalidatePublicationsForDocument(
  state: StudioState,
  documentId: string,
  changedAt: string,
): void {
  state.publications
    .filter((publication) => publication.chapterIds.includes(documentId))
    .forEach((publication) => invalidatePublication(publication, changedAt));
}

export function invalidatePublication(
  publication: StudioState['publications'][number],
  changedAt: string,
): void {
  publication.version++;
  beginPublicationDraft(publication);
  publication.updatedAt = changedAt;
  publication.scheduledAt = null;
}

function sameDocumentFields(
  document: StudioDocument,
  input: SaveInput,
): boolean {
  return (
    document.title === input.title &&
    document.body === input.body &&
    JSON.stringify(document.tags) === JSON.stringify(input.tags) &&
    document.collection === input.collection &&
    document.pinned === input.pinned
  );
}
