import type {
  WorkspacePort,
  WorkspaceResult,
  WorkspaceState,
} from '../../contracts/index.ts';

export function executeWorkspaceMcp(
  port: WorkspacePort,
  input: unknown,
): Promise<WorkspaceResult<WorkspaceState>> {
  return port.execute(input as never);
}
