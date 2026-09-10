import type {
  WorkspaceCommand,
  WorkspaceDocument,
  WorkspaceError,
  WorkspaceResult,
  WorkspaceState
} from "../contracts/index.ts";

export const MAX_DOCUMENTS = 64;
export const MAX_TASKS = 128;
export const MAX_EXPERIMENTS = 64;
export const MAX_RELATIONSHIPS = 128;
export const MAX_ACTIVITY = 128;
export const MAX_REVISIONS_PER_DOCUMENT = 32;
export const MAX_TITLE_LENGTH = 160;
export const MAX_BODY_LENGTH = 200_000;
export const MAX_HYPOTHESIS_LENGTH = 4_000;
export const MAX_OBSERVATIONS_LENGTH = 20_000;
export const MAX_LABEL_LENGTH = 160;

export interface WorkspaceDependencies {
  now: () => number;
  nextId: () => string;
}

export type ParsedWorkspaceCommand = WorkspaceCommand;

export function executeWorkspaceCommand(
  state: WorkspaceState,
  command: unknown,
  dependencies: WorkspaceDependencies
): WorkspaceResult<WorkspaceState> {
  const parsed = parseWorkspaceCommand(command);
  if (!parsed.ok) return parsed;
  if (!isWorkspaceState(state)) return unavailable("Workspace state is unavailable");
  const now = timestamp(dependencies.now());
  if (!now) return unavailable("Workspace clock is unavailable");
  return execute(state, parsed.value, now, dependencies.nextId);
}

export function parseWorkspaceCommand(command: unknown): WorkspaceResult<ParsedWorkspaceCommand> {
  if (!isRecord(command) || !hasOnly(command, ["operation", "input"]) || typeof command.operation !== "string" || !Object.hasOwn(command, "input")) {
    return invalid("Workspace commands require operation and input");
  }
  const input = command.input;
  switch (command.operation) {
    case "workspace.read":
    case "workspace.reset":
      return emptyInput(input) ? success({ operation: command.operation, input: {} }) : invalid("This operation accepts no input");
    case "workspace.create-document":
      return isRecord(input) && hasOnly(input, ["title", "body"]) && validText(input.title, MAX_TITLE_LENGTH) && optionalText(input.body, MAX_BODY_LENGTH)
        ? success({ operation: command.operation, input: { title: input.title, ...(typeof input.body === "string" ? { body: input.body } : {}) } })
        : invalid("Document title or body is invalid");
    case "workspace.save-document":
      return isRecord(input) && hasOnly(input, ["id", "title", "body", "revision"]) && validId(input.id) && validText(input.title, MAX_TITLE_LENGTH) && validBoundedText(input.body, MAX_BODY_LENGTH) && validRevision(input.revision)
        ? success({ operation: command.operation, input: { id: input.id, title: input.title, body: input.body, revision: input.revision } })
        : invalid("Document save input is invalid");
    case "workspace.restore-document":
      return isRecord(input) && hasOnly(input, ["id", "sourceRevision", "revision"]) && validId(input.id) && validRevision(input.sourceRevision) && validRevision(input.revision)
        ? success({ operation: command.operation, input: { id: input.id, sourceRevision: input.sourceRevision, revision: input.revision } })
        : invalid("Document restore input is invalid");
    case "workspace.create-task":
      return isRecord(input) && hasOnly(input, ["title", "documentId"]) && validText(input.title, MAX_TITLE_LENGTH) && optionalId(input.documentId)
        ? success({ operation: command.operation, input: { title: input.title, ...(typeof input.documentId === "string" ? { documentId: input.documentId } : {}) } })
        : invalid("Task input is invalid");
    case "workspace.complete-task":
      return isRecord(input) && hasOnly(input, ["id", "done"]) && validId(input.id) && typeof input.done === "boolean"
        ? success({ operation: command.operation, input: { id: input.id, done: input.done } })
        : invalid("Task completion input is invalid");
    case "workspace.create-experiment":
      return isRecord(input) && hasOnly(input, ["title", "hypothesis"]) && validText(input.title, MAX_TITLE_LENGTH) && validText(input.hypothesis, MAX_HYPOTHESIS_LENGTH)
        ? success({ operation: command.operation, input: { title: input.title, hypothesis: input.hypothesis } })
        : invalid("Experiment input is invalid");
    case "workspace.update-experiment":
      return isRecord(input) && hasOnly(input, ["id", "status", "observations"]) && validId(input.id) && validExperimentStatus(input.status) && validBoundedText(input.observations, MAX_OBSERVATIONS_LENGTH)
        ? success({ operation: command.operation, input: { id: input.id, status: input.status, observations: input.observations } })
        : invalid("Experiment update input is invalid");
    case "workspace.link-documents":
      return isRecord(input) && hasOnly(input, ["from", "to", "label"]) && validId(input.from) && validId(input.to) && input.from !== input.to && validText(input.label, MAX_LABEL_LENGTH)
        ? success({ operation: command.operation, input: { from: input.from, to: input.to, label: input.label } })
        : invalid("Document link input is invalid");
    case "workspace.unlink-documents":
    case "workspace.withdraw":
      return isRecord(input) && hasOnly(input, ["id"]) && validId(input.id)
        ? success({ operation: command.operation, input: { id: input.id } })
        : invalid("Identifier input is invalid");
    case "workspace.publish":
      return isRecord(input) && hasOnly(input, ["id", "revision"]) && validId(input.id) && validRevision(input.revision)
        ? success({ operation: command.operation, input: { id: input.id, revision: input.revision } })
        : invalid("Publish input is invalid");
    default:
      return denied("Workspace operation is undeclared");
  }
}

export function createSyntheticWorkspaceState(dependencies: WorkspaceDependencies): WorkspaceResult<WorkspaceState> {
  const now = timestamp(dependencies.now());
  if (!now) return unavailable("Workspace clock is unavailable");
  const ids = [safeId(dependencies.nextId()), safeId(dependencies.nextId()), safeId(dependencies.nextId()), safeId(dependencies.nextId())];
  if (ids.some((id) => !id)) return unavailable("Workspace identifier service is unavailable");
  const [documentId, taskId, experimentId, activityId] = ids as [string, string, string, string];
  const document = { id: documentId, title: "Welcome", body: "This guest workspace uses synthetic records.", revision: 1, updatedAt: now, revisions: [{ revision: 1, title: "Welcome", body: "This guest workspace uses synthetic records.", savedAt: now }] };
  return success({
    version: 1,
    synthetic: true,
    documents: [document],
    tasks: [{ id: taskId, title: "Explore the workspace", done: false, documentId }],
    experiments: [{ id: experimentId, title: "Guest workflow", hypothesis: "Synthetic work can demonstrate the workflow safely.", status: "planned", observations: "" }],
    relationships: [],
    publications: [],
    activity: [{ id: activityId, label: "Guest workspace started", at: now }]
  });
}

function execute(state: WorkspaceState, command: ParsedWorkspaceCommand, now: string, nextId: () => string): WorkspaceResult<WorkspaceState> {
  if (command.operation === "workspace.read") return success(copyState(state));
  if (command.operation === "workspace.reset") return createSyntheticWorkspaceState({ now: () => Date.parse(now), nextId });
  const next = copyState(state);
  switch (command.operation) {
    case "workspace.create-document": {
      if (next.documents.length >= MAX_DOCUMENTS) return unavailable("Document limit reached");
      const id = safeId(nextId());
      if (!id || hasId(next, id)) return unavailable("Workspace identifier service is unavailable");
      const title = command.input.title;
      const body = command.input.body ?? "";
      next.documents.push({ id, title, body, revision: 1, updatedAt: now, revisions: [{ revision: 1, title, body, savedAt: now }] });
      return changed(next, id, "created document", now, nextId);
    }
    case "workspace.save-document": {
      const document = next.documents.find((item) => item.id === command.input.id);
      if (!document) return missing("Document was not found");
      if (document.revision !== command.input.revision) return conflict("Document revision does not match");
      document.title = command.input.title;
      document.body = command.input.body;
      document.revision += 1;
      document.updatedAt = now;
      document.revisions = [...document.revisions, { revision: document.revision, title: document.title, body: document.body, savedAt: now }].slice(-MAX_REVISIONS_PER_DOCUMENT);
      return changed(next, document.id, "saved document", now, nextId);
    }
    case "workspace.restore-document": {
      const document = next.documents.find((item) => item.id === command.input.id);
      if (!document) return missing("Document was not found");
      if (document.revision !== command.input.revision) return conflict("Document revision does not match");
      const source = document.revisions.find((item) => item.revision === command.input.sourceRevision);
      if (!source) return missing("Document revision was not found");
      document.title = source.title;
      document.body = source.body;
      document.revision += 1;
      document.updatedAt = now;
      document.revisions = [...document.revisions, { revision: document.revision, title: document.title, body: document.body, savedAt: now }].slice(-MAX_REVISIONS_PER_DOCUMENT);
      return changed(next, document.id, "restored document", now, nextId);
    }
    case "workspace.create-task": {
      if (next.tasks.length >= MAX_TASKS) return unavailable("Task limit reached");
      if (command.input.documentId && !next.documents.some((item) => item.id === command.input.documentId)) return missing("Task document was not found");
      const id = safeId(nextId());
      if (!id || hasId(next, id)) return unavailable("Workspace identifier service is unavailable");
      next.tasks.push({ id, title: command.input.title, done: false, documentId: command.input.documentId ?? null });
      return changed(next, id, "created task", now, nextId);
    }
    case "workspace.complete-task": {
      const task = next.tasks.find((item) => item.id === command.input.id);
      if (!task) return missing("Task was not found");
      task.done = command.input.done;
      return changed(next, task.id, command.input.done ? "completed task" : "reopened task", now, nextId);
    }
    case "workspace.create-experiment": {
      if (next.experiments.length >= MAX_EXPERIMENTS) return unavailable("Experiment limit reached");
      const id = safeId(nextId());
      if (!id || hasId(next, id)) return unavailable("Workspace identifier service is unavailable");
      next.experiments.push({ id, title: command.input.title, hypothesis: command.input.hypothesis, status: "planned", observations: "" });
      return changed(next, id, "created experiment", now, nextId);
    }
    case "workspace.update-experiment": {
      const experiment = next.experiments.find((item) => item.id === command.input.id);
      if (!experiment) return missing("Experiment was not found");
      experiment.status = command.input.status;
      experiment.observations = command.input.observations;
      return changed(next, experiment.id, "updated experiment", now, nextId);
    }
    case "workspace.link-documents": {
      if (next.relationships.length >= MAX_RELATIONSHIPS) return unavailable("Relationship limit reached");
      if (!next.documents.some((item) => item.id === command.input.from) || !next.documents.some((item) => item.id === command.input.to)) return missing("Linked document was not found");
      const id = safeId(nextId());
      if (!id || hasId(next, id)) return unavailable("Workspace identifier service is unavailable");
      next.relationships.push({ id, ...command.input });
      return changed(next, id, "linked documents", now, nextId);
    }
    case "workspace.unlink-documents": {
      const index = next.relationships.findIndex((item) => item.id === command.input.id);
      if (index < 0) return missing("Document link was not found");
      next.relationships.splice(index, 1);
      return changed(next, command.input.id, "unlinked documents", now, nextId);
    }
    case "workspace.publish": {
      const document = next.documents.find((item) => item.id === command.input.id);
      if (!document) return missing("Document was not found");
      const revision = document.revisions.find((item) => item.revision === command.input.revision);
      if (!revision) return missing("Document revision was not found");
      const publication = { documentId: document.id, title: revision.title, body: revision.body, revision: revision.revision, publishedAt: now };
      const index = next.publications.findIndex((item) => item.documentId === document.id);
      if (index < 0) next.publications.push(publication); else next.publications[index] = publication;
      return changed(next, document.id, "published document revision", now, nextId);
    }
    case "workspace.withdraw": {
      const index = next.publications.findIndex((item) => item.documentId === command.input.id);
      if (index < 0) return missing("Publication was not found");
      next.publications.splice(index, 1);
      return changed(next, command.input.id, "withdrew publication", now, nextId);
    }
  }
}

function changed(state: WorkspaceState, subject: string, action: string, at: string, nextId: () => string): WorkspaceResult<WorkspaceState> {
  const activityId = safeId(nextId());
  if (!activityId || hasId(state, activityId)) return unavailable("Workspace identifier service is unavailable");
  state.version += 1;
  state.activity = [...state.activity, { id: activityId, label: `${action}: ${subject}`, at }].slice(-MAX_ACTIVITY);
  return success(state);
}

export function copyState(state: WorkspaceState): WorkspaceState {
  return structuredClone(state);
}

export function isWorkspaceState(value: unknown): value is WorkspaceState {
  if (!isRecord(value) || !hasOnly(value, ["version", "synthetic", "documents", "tasks", "experiments", "relationships", "publications", "activity"]) || !validRevision(value.version) || typeof value.synthetic !== "boolean") return false;
  const valid = Array.isArray(value.documents) && value.documents.length <= MAX_DOCUMENTS && value.documents.every(isDocument)
    && Array.isArray(value.tasks) && value.tasks.length <= MAX_TASKS && value.tasks.every((item) => isRecord(item) && hasOnly(item, ["id", "title", "done", "documentId"]) && validId(item.id) && validText(item.title, MAX_TITLE_LENGTH) && typeof item.done === "boolean" && (item.documentId === null || validId(item.documentId)))
    && Array.isArray(value.experiments) && value.experiments.length <= MAX_EXPERIMENTS && value.experiments.every((item) => isRecord(item) && hasOnly(item, ["id", "title", "hypothesis", "status", "observations"]) && validId(item.id) && validText(item.title, MAX_TITLE_LENGTH) && validText(item.hypothesis, MAX_HYPOTHESIS_LENGTH) && validExperimentStatus(item.status) && validBoundedText(item.observations, MAX_OBSERVATIONS_LENGTH))
    && Array.isArray(value.relationships) && value.relationships.length <= MAX_RELATIONSHIPS && value.relationships.every((item) => isRecord(item) && hasOnly(item, ["id", "from", "to", "label"]) && validId(item.id) && validId(item.from) && validId(item.to) && item.from !== item.to && validText(item.label, MAX_LABEL_LENGTH))
    && Array.isArray(value.publications) && value.publications.length <= MAX_DOCUMENTS && value.publications.every((item) => isRecord(item) && hasOnly(item, ["documentId", "title", "body", "revision", "publishedAt"]) && validId(item.documentId) && validText(item.title, MAX_TITLE_LENGTH) && validBoundedText(item.body, MAX_BODY_LENGTH) && validRevision(item.revision) && validTimestamp(item.publishedAt))
    && Array.isArray(value.activity) && value.activity.length <= MAX_ACTIVITY && value.activity.every((item) => isRecord(item) && hasOnly(item, ["id", "label", "at"]) && validId(item.id) && validText(item.label, MAX_LABEL_LENGTH + 128) && validTimestamp(item.at));
  return valid && consistentState(value as WorkspaceState);
}

function consistentState(state: WorkspaceState): boolean {
  const recordIds = [...state.documents, ...state.tasks, ...state.experiments, ...state.relationships, ...state.activity].map((item) => item.id);
  if (new Set(recordIds).size !== recordIds.length) return false;
  const documents = new Map(state.documents.map((document) => [document.id, document]));
  if (state.tasks.some((task) => task.documentId !== null && !documents.has(task.documentId))) return false;
  if (state.relationships.some((relationship) => !documents.has(relationship.from) || !documents.has(relationship.to))) return false;
  if (new Set(state.publications.map((publication) => publication.documentId)).size !== state.publications.length) return false;
  return state.documents.every((document) => {
    const revisions = new Set(document.revisions.map((revision) => revision.revision));
    return revisions.size === document.revisions.length && revisions.has(document.revision);
  }) && state.publications.every((publication) => documents.get(publication.documentId)?.revisions.some((revision) => revision.revision === publication.revision && revision.title === publication.title && revision.body === publication.body));
}

function isDocument(value: unknown): value is WorkspaceDocument {
  return isRecord(value) && hasOnly(value, ["id", "title", "body", "revision", "updatedAt", "revisions"]) && validId(value.id) && validText(value.title, MAX_TITLE_LENGTH) && validBoundedText(value.body, MAX_BODY_LENGTH) && validRevision(value.revision) && validTimestamp(value.updatedAt) && Array.isArray(value.revisions) && value.revisions.length > 0 && value.revisions.length <= MAX_REVISIONS_PER_DOCUMENT && value.revisions.every((item) => isRecord(item) && hasOnly(item, ["revision", "title", "body", "savedAt"]) && validRevision(item.revision) && validText(item.title, MAX_TITLE_LENGTH) && validBoundedText(item.body, MAX_BODY_LENGTH) && validTimestamp(item.savedAt));
}

function hasId(state: WorkspaceState, id: string): boolean {
  return state.documents.some((item) => item.id === id) || state.tasks.some((item) => item.id === id) || state.experiments.some((item) => item.id === id) || state.relationships.some((item) => item.id === id) || state.activity.some((item) => item.id === id);
}

function timestamp(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40 && Number.isFinite(Date.parse(value));
}

function safeId(value: unknown): string | null {
  return validId(value) ? value : null;
}

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value);
}

function validRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
}

function validText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

function validBoundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

function optionalText(value: unknown, max: number): boolean {
  return value === undefined || validText(value, max) || value === "";
}

function optionalId(value: unknown): boolean {
  return value === undefined || validId(value);
}

function validExperimentStatus(value: unknown): value is "planned" | "running" | "complete" {
  return value === "planned" || value === "running" || value === "complete";
}

function emptyInput(value: unknown): boolean {
  return isRecord(value) && Object.keys(value).length === 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnly(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function success<T>(value: T): WorkspaceResult<T> {
  return { ok: true, value };
}

function invalid(message: string): WorkspaceResult<never> {
  return { ok: false, error: { code: "invalid", message } };
}

export function denied(message: string): WorkspaceResult<never> {
  return { ok: false, error: { code: "denied", message } };
}

export function missing(message: string): WorkspaceResult<never> {
  return { ok: false, error: { code: "missing", message } };
}

export function conflict(message: string): WorkspaceResult<never> {
  return { ok: false, error: { code: "conflict", message } };
}

export function unavailable(message: string): WorkspaceResult<never> {
  return { ok: false, error: { code: "unavailable", message } };
}

export function workspaceError(code: WorkspaceError["code"], message: string): WorkspaceResult<never> {
  return { ok: false, error: { code, message } };
}
