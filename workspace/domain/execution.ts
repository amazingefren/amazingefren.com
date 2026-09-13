import type { WorkspaceResult, WorkspaceState } from '../contracts/index.ts';
import type { ParsedWorkspaceCommand } from './commands.ts';
import {
  conflict,
  hasId,
  missing,
  safeId,
  success,
  unavailable,
  MAX_ACTIVITY,
  MAX_DOCUMENTS,
  MAX_EXPERIMENTS,
  MAX_RELATIONSHIPS,
  MAX_REVISIONS_PER_DOCUMENT,
  MAX_TASKS,
} from './support.ts';
import { copyState, createSyntheticWorkspaceState } from './state.ts';

export function execute(
  state: WorkspaceState,
  command: ParsedWorkspaceCommand,
  now: string,
  nextId: () => string,
): WorkspaceResult<WorkspaceState> {
  if (command.operation === 'workspace.read') return success(copyState(state));
  if (command.operation === 'workspace.reset')
    return createSyntheticWorkspaceState({
      now: () => Date.parse(now),
      nextId,
    });
  const next = copyState(state);
  switch (command.operation) {
    case 'workspace.create-document': {
      if (next.documents.length >= MAX_DOCUMENTS)
        return unavailable('Document limit reached');
      const id = safeId(nextId());
      if (!id || hasId(next, id))
        return unavailable('Workspace identifier service is unavailable');
      const title = command.input.title;
      const body = command.input.body ?? '';
      next.documents.push({
        id,
        title,
        body,
        revision: 1,
        updatedAt: now,
        revisions: [{ revision: 1, title, body, savedAt: now }],
      });
      return changed(next, id, 'created document', now, nextId);
    }
    case 'workspace.save-document': {
      const document = next.documents.find(
        (item) => item.id === command.input.id,
      );
      if (!document) return missing('Document was not found');
      if (document.revision !== command.input.revision)
        return conflict('Document revision does not match');
      document.title = command.input.title;
      document.body = command.input.body;
      document.revision += 1;
      document.updatedAt = now;
      document.revisions = [
        ...document.revisions,
        {
          revision: document.revision,
          title: document.title,
          body: document.body,
          savedAt: now,
        },
      ].slice(-MAX_REVISIONS_PER_DOCUMENT);
      return changed(next, document.id, 'saved document', now, nextId);
    }
    case 'workspace.restore-document': {
      const document = next.documents.find(
        (item) => item.id === command.input.id,
      );
      if (!document) return missing('Document was not found');
      if (document.revision !== command.input.revision)
        return conflict('Document revision does not match');
      const source = document.revisions.find(
        (item) => item.revision === command.input.sourceRevision,
      );
      if (!source) return missing('Document revision was not found');
      document.title = source.title;
      document.body = source.body;
      document.revision += 1;
      document.updatedAt = now;
      document.revisions = [
        ...document.revisions,
        {
          revision: document.revision,
          title: document.title,
          body: document.body,
          savedAt: now,
        },
      ].slice(-MAX_REVISIONS_PER_DOCUMENT);
      return changed(next, document.id, 'restored document', now, nextId);
    }
    case 'workspace.create-task': {
      if (next.tasks.length >= MAX_TASKS)
        return unavailable('Task limit reached');
      if (
        command.input.documentId &&
        !next.documents.some((item) => item.id === command.input.documentId)
      )
        return missing('Task document was not found');
      const id = safeId(nextId());
      if (!id || hasId(next, id))
        return unavailable('Workspace identifier service is unavailable');
      next.tasks.push({
        id,
        title: command.input.title,
        done: false,
        documentId: command.input.documentId ?? null,
      });
      return changed(next, id, 'created task', now, nextId);
    }
    case 'workspace.complete-task': {
      const task = next.tasks.find((item) => item.id === command.input.id);
      if (!task) return missing('Task was not found');
      task.done = command.input.done;
      return changed(
        next,
        task.id,
        command.input.done ? 'completed task' : 'reopened task',
        now,
        nextId,
      );
    }
    case 'workspace.create-experiment': {
      if (next.experiments.length >= MAX_EXPERIMENTS)
        return unavailable('Experiment limit reached');
      const id = safeId(nextId());
      if (!id || hasId(next, id))
        return unavailable('Workspace identifier service is unavailable');
      next.experiments.push({
        id,
        title: command.input.title,
        hypothesis: command.input.hypothesis,
        status: 'planned',
        observations: '',
      });
      return changed(next, id, 'created experiment', now, nextId);
    }
    case 'workspace.update-experiment': {
      const experiment = next.experiments.find(
        (item) => item.id === command.input.id,
      );
      if (!experiment) return missing('Experiment was not found');
      experiment.status = command.input.status;
      experiment.observations = command.input.observations;
      return changed(next, experiment.id, 'updated experiment', now, nextId);
    }
    case 'workspace.link-documents': {
      if (next.relationships.length >= MAX_RELATIONSHIPS)
        return unavailable('Relationship limit reached');
      if (
        !next.documents.some((item) => item.id === command.input.from) ||
        !next.documents.some((item) => item.id === command.input.to)
      )
        return missing('Linked document was not found');
      const id = safeId(nextId());
      if (!id || hasId(next, id))
        return unavailable('Workspace identifier service is unavailable');
      next.relationships.push({ id, ...command.input });
      return changed(next, id, 'linked documents', now, nextId);
    }
    case 'workspace.unlink-documents': {
      const index = next.relationships.findIndex(
        (item) => item.id === command.input.id,
      );
      if (index < 0) return missing('Document link was not found');
      next.relationships.splice(index, 1);
      return changed(next, command.input.id, 'unlinked documents', now, nextId);
    }
    case 'workspace.publish': {
      const document = next.documents.find(
        (item) => item.id === command.input.id,
      );
      if (!document) return missing('Document was not found');
      const revision = document.revisions.find(
        (item) => item.revision === command.input.revision,
      );
      if (!revision) return missing('Document revision was not found');
      const publication = {
        documentId: document.id,
        title: revision.title,
        body: revision.body,
        revision: revision.revision,
        publishedAt: now,
      };
      const index = next.publications.findIndex(
        (item) => item.documentId === document.id,
      );
      if (index < 0) next.publications.push(publication);
      else next.publications[index] = publication;
      return changed(
        next,
        document.id,
        'published document revision',
        now,
        nextId,
      );
    }
    case 'workspace.withdraw': {
      const index = next.publications.findIndex(
        (item) => item.documentId === command.input.id,
      );
      if (index < 0) return missing('Publication was not found');
      next.publications.splice(index, 1);
      return changed(
        next,
        command.input.id,
        'withdrew publication',
        now,
        nextId,
      );
    }
  }
}

function changed(
  state: WorkspaceState,
  subject: string,
  action: string,
  at: string,
  nextId: () => string,
): WorkspaceResult<WorkspaceState> {
  const activityId = safeId(nextId());
  if (!activityId || hasId(state, activityId))
    return unavailable('Workspace identifier service is unavailable');
  state.version += 1;
  state.activity = [
    ...state.activity,
    { id: activityId, label: `${action}: ${subject}`, at },
  ].slice(-MAX_ACTIVITY);
  return success(state);
}
