import type { WorkspaceResult, WorkspaceState } from '../contracts/index.ts';
import {
  parseWorkspaceCommand,
  type ParsedWorkspaceCommand,
} from './commands.ts';
import { execute } from './execution.ts';
import {
  copyState,
  createSyntheticWorkspaceState,
  isWorkspaceState,
} from './state.ts';
import {
  timestamp,
  unavailable,
  type WorkspaceDependencies,
} from './support.ts';

export function executeWorkspaceCommand(
  state: WorkspaceState,
  command: unknown,
  dependencies: WorkspaceDependencies,
): WorkspaceResult<WorkspaceState> {
  const parsed = parseWorkspaceCommand(command);
  if (!parsed.ok) return parsed;
  if (!isWorkspaceState(state))
    return unavailable('Workspace state is unavailable');
  const now = timestamp(dependencies.now());
  if (!now) return unavailable('Workspace clock is unavailable');
  return execute(state, parsed.value, now, dependencies.nextId);
}

export {
  copyState,
  createSyntheticWorkspaceState,
  isWorkspaceState,
  parseWorkspaceCommand,
};
export type { ParsedWorkspaceCommand, WorkspaceDependencies };
export {
  MAX_ACTIVITY,
  MAX_BODY_LENGTH,
  MAX_DOCUMENTS,
  MAX_EXPERIMENTS,
  MAX_HYPOTHESIS_LENGTH,
  MAX_LABEL_LENGTH,
  MAX_OBSERVATIONS_LENGTH,
  MAX_RELATIONSHIPS,
  MAX_REVISIONS_PER_DOCUMENT,
  MAX_TASKS,
  MAX_TITLE_LENGTH,
  conflict,
  denied,
  missing,
  unavailable,
  workspaceError,
} from './support.ts';
