import type {
  Command,
  Result,
  StudioState,
} from '../../../contracts/writing/index.ts';
import { addAsset, updateAsset } from './assets.ts';
import {
  archiveDocument,
  createDocument,
  restoreDocument,
  saveDocument,
} from './documents.ts';
import {
  addChapter,
  cancelPublicationSchedule,
  createPublication,
  createPublicationRevision,
  publishPublication,
  reorderChapters,
  reviewPublication,
  schedulePublication,
  updatePublication,
  withdrawPublication,
} from './publications.ts';
import {
  invalid,
  transitionState,
  type GuestMutationContext,
} from './state.ts';

export function transitionGuestState(
  state: StudioState,
  command: Command,
  context: GuestMutationContext,
): Result<StudioState> {
  return transitionState(state, (draft) =>
    applyCommand(draft, command, context),
  );
}

function applyCommand(
  state: StudioState,
  command: Command,
  context: GuestMutationContext,
): Result<void> {
  switch (command.operation) {
    case 'studio.notes.create':
      return createDocument(state, command.input, context);
    case 'studio.notes.save':
      return saveDocument(state, command.input, context);
    case 'studio.notes.restore':
      return restoreDocument(state, command.input, context);
    case 'studio.notes.archive':
      return archiveDocument(state, command.input, context.changedAt);
    case 'studio.assets.add':
      return addAsset(state, command.input, context);
    case 'studio.assets.update':
      return updateAsset(state, command.input, context.changedAt);
    case 'publishing.projects.create':
      return createPublication(state, command.input, context);
    case 'publishing.projects.update':
      return updatePublication(state, command.input, context.changedAt);
    case 'publishing.projects.add-chapter':
      return addChapter(
        state,
        command.input,
        context.changedAt,
        context.createId,
      );
    case 'publishing.projects.reorder':
      return reorderChapters(state, command.input, context.changedAt);
    case 'publishing.projects.review':
      return reviewPublication(state, command.input, context);
    case 'publishing.projects.create-revision':
      return createPublicationRevision(state, command.input, context.changedAt);
    case 'publishing.projects.publish':
      return publishPublication(state, command.input, context);
    case 'publishing.projects.schedule':
      return schedulePublication(state, command.input, context.changedAt);
    case 'publishing.projects.cancel-schedule':
      return cancelPublicationSchedule(state, command.input, context.changedAt);
    case 'publishing.projects.withdraw':
      return withdrawPublication(state, command.input, context.changedAt);
    case 'studio.writing.read':
    case 'studio.writing.reset':
      return invalid('The guest command is invalid.');
  }
}
