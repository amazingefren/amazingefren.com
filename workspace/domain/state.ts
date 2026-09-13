import type {
  WorkspaceActivity,
  WorkspaceDocument,
  WorkspaceExperiment,
  WorkspacePublication,
  WorkspaceRelationship,
  WorkspaceResult,
  WorkspaceState,
  WorkspaceTask,
} from '../contracts/index.ts';
import {
  hasOnly,
  isRecord,
  safeId,
  success,
  timestamp,
  unavailable,
  validBoundedText,
  validExperimentStatus,
  validId,
  validRevision,
  validText,
  validTimestamp,
  MAX_ACTIVITY,
  MAX_BODY_LENGTH,
  MAX_DOCUMENTS,
  MAX_HYPOTHESIS_LENGTH,
  MAX_LABEL_LENGTH,
  MAX_OBSERVATIONS_LENGTH,
  MAX_RELATIONSHIPS,
  MAX_REVISIONS_PER_DOCUMENT,
  MAX_TASKS,
  MAX_TITLE_LENGTH,
  MAX_EXPERIMENTS,
} from './support.ts';
import type { WorkspaceDependencies } from './support.ts';

export function createSyntheticWorkspaceState(
  dependencies: WorkspaceDependencies,
): WorkspaceResult<WorkspaceState> {
  const now = timestamp(dependencies.now());
  if (!now) return unavailable('Workspace clock is unavailable');
  const ids = [
    safeId(dependencies.nextId()),
    safeId(dependencies.nextId()),
    safeId(dependencies.nextId()),
    safeId(dependencies.nextId()),
  ];
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length)
    return unavailable('Workspace identifier service is unavailable');
  const [documentId, taskId, experimentId, activityId] = ids as [
    string,
    string,
    string,
    string,
  ];
  const document = {
    id: documentId,
    title: 'Welcome',
    body: 'This guest workspace uses synthetic records.',
    revision: 1,
    updatedAt: now,
    revisions: [
      {
        revision: 1,
        title: 'Welcome',
        body: 'This guest workspace uses synthetic records.',
        savedAt: now,
      },
    ],
  };
  return success({
    version: 1,
    synthetic: true,
    documents: [document],
    tasks: [
      { id: taskId, title: 'Explore the workspace', done: false, documentId },
    ],
    experiments: [
      {
        id: experimentId,
        title: 'Guest workflow',
        hypothesis: 'Synthetic work can demonstrate the workflow safely.',
        status: 'planned',
        observations: '',
      },
    ],
    relationships: [],
    publications: [],
    activity: [{ id: activityId, label: 'Guest workspace started', at: now }],
  });
}

export function copyState(state: WorkspaceState): WorkspaceState {
  return structuredClone(state);
}

export function isWorkspaceState(value: unknown): value is WorkspaceState {
  if (
    !isRecord(value) ||
    !hasOnly(value, [
      'version',
      'synthetic',
      'documents',
      'tasks',
      'experiments',
      'relationships',
      'publications',
      'activity',
    ]) ||
    !validRevision(value.version) ||
    typeof value.synthetic !== 'boolean'
  )
    return false;
  const valid =
    Array.isArray(value.documents) &&
    value.documents.length <= MAX_DOCUMENTS &&
    value.documents.every(isDocument) &&
    Array.isArray(value.tasks) &&
    value.tasks.length <= MAX_TASKS &&
    value.tasks.every(isTask) &&
    Array.isArray(value.experiments) &&
    value.experiments.length <= MAX_EXPERIMENTS &&
    value.experiments.every(isExperiment) &&
    Array.isArray(value.relationships) &&
    value.relationships.length <= MAX_RELATIONSHIPS &&
    value.relationships.every(isRelationship) &&
    Array.isArray(value.publications) &&
    value.publications.length <= MAX_DOCUMENTS &&
    value.publications.every(isPublication) &&
    Array.isArray(value.activity) &&
    value.activity.length <= MAX_ACTIVITY &&
    value.activity.every(isActivity);
  return valid && consistentState(value as WorkspaceState);
}

function isTask(value: unknown): value is WorkspaceTask {
  return (
    isRecord(value) &&
    hasOnly(value, ['id', 'title', 'done', 'documentId']) &&
    validId(value.id) &&
    validText(value.title, MAX_TITLE_LENGTH) &&
    typeof value.done === 'boolean' &&
    (value.documentId === null || validId(value.documentId))
  );
}

function isExperiment(value: unknown): value is WorkspaceExperiment {
  return (
    isRecord(value) &&
    hasOnly(value, ['id', 'title', 'hypothesis', 'status', 'observations']) &&
    validId(value.id) &&
    validText(value.title, MAX_TITLE_LENGTH) &&
    validText(value.hypothesis, MAX_HYPOTHESIS_LENGTH) &&
    validExperimentStatus(value.status) &&
    validBoundedText(value.observations, MAX_OBSERVATIONS_LENGTH)
  );
}

function isRelationship(value: unknown): value is WorkspaceRelationship {
  return (
    isRecord(value) &&
    hasOnly(value, ['id', 'from', 'to', 'label']) &&
    validId(value.id) &&
    validId(value.from) &&
    validId(value.to) &&
    value.from !== value.to &&
    validText(value.label, MAX_LABEL_LENGTH)
  );
}

function isPublication(value: unknown): value is WorkspacePublication {
  return (
    isRecord(value) &&
    hasOnly(value, [
      'documentId',
      'title',
      'body',
      'revision',
      'publishedAt',
    ]) &&
    validId(value.documentId) &&
    validText(value.title, MAX_TITLE_LENGTH) &&
    validBoundedText(value.body, MAX_BODY_LENGTH) &&
    validRevision(value.revision) &&
    validTimestamp(value.publishedAt)
  );
}

function isActivity(value: unknown): value is WorkspaceActivity {
  return (
    isRecord(value) &&
    hasOnly(value, ['id', 'label', 'at']) &&
    validId(value.id) &&
    validText(value.label, MAX_LABEL_LENGTH + 128) &&
    validTimestamp(value.at)
  );
}

function consistentState(state: WorkspaceState): boolean {
  const recordIds = [
    ...state.documents,
    ...state.tasks,
    ...state.experiments,
    ...state.relationships,
    ...state.activity,
  ].map((item) => item.id);
  if (new Set(recordIds).size !== recordIds.length) return false;
  const documents = new Map(
    state.documents.map((document) => [document.id, document]),
  );
  if (
    state.tasks.some(
      (task) => task.documentId !== null && !documents.has(task.documentId),
    )
  )
    return false;
  if (
    state.relationships.some(
      (relationship) =>
        !documents.has(relationship.from) || !documents.has(relationship.to),
    )
  )
    return false;
  if (
    new Set(state.publications.map((publication) => publication.documentId))
      .size !== state.publications.length
  )
    return false;
  return (
    state.documents.every((document) => {
      const revisions = new Set(
        document.revisions.map((revision) => revision.revision),
      );
      return (
        revisions.size === document.revisions.length &&
        revisions.has(document.revision)
      );
    }) &&
    state.publications.every((publication) =>
      documents
        .get(publication.documentId)
        ?.revisions.some(
          (revision) =>
            revision.revision === publication.revision &&
            revision.title === publication.title &&
            revision.body === publication.body,
        ),
    )
  );
}

function isDocument(value: unknown): value is WorkspaceDocument {
  return (
    isRecord(value) &&
    hasOnly(value, [
      'id',
      'title',
      'body',
      'revision',
      'updatedAt',
      'revisions',
    ]) &&
    validId(value.id) &&
    validText(value.title, MAX_TITLE_LENGTH) &&
    validBoundedText(value.body, MAX_BODY_LENGTH) &&
    validRevision(value.revision) &&
    validTimestamp(value.updatedAt) &&
    Array.isArray(value.revisions) &&
    value.revisions.length > 0 &&
    value.revisions.length <= MAX_REVISIONS_PER_DOCUMENT &&
    value.revisions.every(isDocumentRevision)
  );
}

function isDocumentRevision(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnly(value, ['revision', 'title', 'body', 'savedAt']) &&
    validRevision(value.revision) &&
    validText(value.title, MAX_TITLE_LENGTH) &&
    validBoundedText(value.body, MAX_BODY_LENGTH) &&
    validTimestamp(value.savedAt)
  );
}
