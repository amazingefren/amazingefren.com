import type {
  WorkspaceCommand,
  WorkspaceResult,
  WorkspaceState,
} from '../contracts/index.ts';
import {
  executeWorkspaceCommand,
  type WorkspaceDependencies,
} from '../domain/index.ts';

export interface ExecuteWorkspaceDependencies extends WorkspaceDependencies {}

export function executeWorkspace(
  dependencies: ExecuteWorkspaceDependencies,
  state: WorkspaceState,
  command: unknown,
): WorkspaceResult<WorkspaceState> {
  return executeWorkspaceCommand(state, command, dependencies);
}

export function workspacePermission(
  operation: WorkspaceCommand['operation'],
): 'workspace.read' | 'workspace.write' | 'workspace.publish' {
  if (operation === 'workspace.read') return 'workspace.read';
  if (operation === 'workspace.publish' || operation === 'workspace.withdraw')
    return 'workspace.publish';
  return 'workspace.write';
}
