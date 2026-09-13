import type { WorkspaceCommand, WorkspaceResult } from '../contracts/index.ts';
import {
  denied,
  emptyInput,
  hasOnly,
  invalid,
  isRecord,
  optionalId,
  optionalText,
  success,
  validBoundedText,
  validExperimentStatus,
  validId,
  validRevision,
  validText,
  MAX_BODY_LENGTH,
  MAX_HYPOTHESIS_LENGTH,
  MAX_LABEL_LENGTH,
  MAX_OBSERVATIONS_LENGTH,
  MAX_TITLE_LENGTH,
} from './support.ts';

export type ParsedWorkspaceCommand = WorkspaceCommand;

export function parseWorkspaceCommand(
  command: unknown,
): WorkspaceResult<ParsedWorkspaceCommand> {
  if (
    !isRecord(command) ||
    !hasOnly(command, ['operation', 'input']) ||
    typeof command.operation !== 'string' ||
    !Object.hasOwn(command, 'input')
  ) {
    return invalid('Workspace commands require operation and input');
  }
  const input = command.input;
  switch (command.operation) {
    case 'workspace.read':
    case 'workspace.reset':
      return emptyInput(input)
        ? success({ operation: command.operation, input: {} })
        : invalid('This operation accepts no input');
    case 'workspace.create-document':
      return isRecord(input) &&
        hasOnly(input, ['title', 'body']) &&
        validText(input.title, MAX_TITLE_LENGTH) &&
        optionalText(input.body, MAX_BODY_LENGTH)
        ? success({
            operation: command.operation,
            input: {
              title: input.title,
              ...(typeof input.body === 'string' ? { body: input.body } : {}),
            },
          })
        : invalid('Document title or body is invalid');
    case 'workspace.save-document':
      return isRecord(input) &&
        hasOnly(input, ['id', 'title', 'body', 'revision']) &&
        validId(input.id) &&
        validText(input.title, MAX_TITLE_LENGTH) &&
        validBoundedText(input.body, MAX_BODY_LENGTH) &&
        validRevision(input.revision)
        ? success({
            operation: command.operation,
            input: {
              id: input.id,
              title: input.title,
              body: input.body,
              revision: input.revision,
            },
          })
        : invalid('Document save input is invalid');
    case 'workspace.restore-document':
      return isRecord(input) &&
        hasOnly(input, ['id', 'sourceRevision', 'revision']) &&
        validId(input.id) &&
        validRevision(input.sourceRevision) &&
        validRevision(input.revision)
        ? success({
            operation: command.operation,
            input: {
              id: input.id,
              sourceRevision: input.sourceRevision,
              revision: input.revision,
            },
          })
        : invalid('Document restore input is invalid');
    case 'workspace.create-task':
      return isRecord(input) &&
        hasOnly(input, ['title', 'documentId']) &&
        validText(input.title, MAX_TITLE_LENGTH) &&
        optionalId(input.documentId)
        ? success({
            operation: command.operation,
            input: {
              title: input.title,
              ...(typeof input.documentId === 'string'
                ? { documentId: input.documentId }
                : {}),
            },
          })
        : invalid('Task input is invalid');
    case 'workspace.complete-task':
      return isRecord(input) &&
        hasOnly(input, ['id', 'done']) &&
        validId(input.id) &&
        typeof input.done === 'boolean'
        ? success({
            operation: command.operation,
            input: { id: input.id, done: input.done },
          })
        : invalid('Task completion input is invalid');
    case 'workspace.create-experiment':
      return isRecord(input) &&
        hasOnly(input, ['title', 'hypothesis']) &&
        validText(input.title, MAX_TITLE_LENGTH) &&
        validText(input.hypothesis, MAX_HYPOTHESIS_LENGTH)
        ? success({
            operation: command.operation,
            input: { title: input.title, hypothesis: input.hypothesis },
          })
        : invalid('Experiment input is invalid');
    case 'workspace.update-experiment':
      return isRecord(input) &&
        hasOnly(input, ['id', 'status', 'observations']) &&
        validId(input.id) &&
        validExperimentStatus(input.status) &&
        validBoundedText(input.observations, MAX_OBSERVATIONS_LENGTH)
        ? success({
            operation: command.operation,
            input: {
              id: input.id,
              status: input.status,
              observations: input.observations,
            },
          })
        : invalid('Experiment update input is invalid');
    case 'workspace.link-documents':
      return isRecord(input) &&
        hasOnly(input, ['from', 'to', 'label']) &&
        validId(input.from) &&
        validId(input.to) &&
        input.from !== input.to &&
        validText(input.label, MAX_LABEL_LENGTH)
        ? success({
            operation: command.operation,
            input: { from: input.from, to: input.to, label: input.label },
          })
        : invalid('Document link input is invalid');
    case 'workspace.unlink-documents':
    case 'workspace.withdraw':
      return isRecord(input) && hasOnly(input, ['id']) && validId(input.id)
        ? success({ operation: command.operation, input: { id: input.id } })
        : invalid('Identifier input is invalid');
    case 'workspace.publish':
      return isRecord(input) &&
        hasOnly(input, ['id', 'revision']) &&
        validId(input.id) &&
        validRevision(input.revision)
        ? success({
            operation: command.operation,
            input: { id: input.id, revision: input.revision },
          })
        : invalid('Publish input is invalid');
    default:
      return denied('Workspace operation is undeclared');
  }
}
