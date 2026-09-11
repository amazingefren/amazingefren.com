import type {
  WorkspaceCommand,
  WorkspacePort,
  WorkspaceResult,
  WorkspaceState,
} from '../contracts/index.ts';
import type { WorkspaceDependencies } from '../domain/index.ts';

export type { WorkspaceDependencies } from '../domain/index.ts';

export interface WorkspaceIdentity {
  kind: 'owner' | 'guest' | 'service';
  subjectId: string;
  ownerId: string | null;
}

export interface WorkspaceIdentityPort {
  resolve(): Promise<WorkspaceIdentity | null>;
}

export interface WorkspaceAuthorizationPort {
  authorize(request: {
    operation: WorkspaceCommand['operation'];
    permission: 'workspace.read' | 'workspace.write' | 'workspace.publish';
    identity: WorkspaceIdentity;
    ownerId: string;
  }): Promise<
    { allowed: true; ownerId: string } | { allowed: false; reason: string }
  >;
}

export interface OwnerWorkspaceStoragePort {
  read(request: { ownerId: string }): Promise<WorkspaceState | null>;
  write(request: {
    ownerId: string;
    expectedVersion: number;
    state: WorkspaceState;
  }): Promise<{ ok: true } | { ok: false; reason: 'conflict' | 'unavailable' }>;
}

export interface OwnerWorkspaceDependencies extends WorkspaceDependencies {
  identity: WorkspaceIdentityPort;
  authorization: WorkspaceAuthorizationPort;
  storage: OwnerWorkspaceStoragePort;
}

export interface WorkspaceOperation {
  execute(command: unknown): Promise<WorkspaceResult<WorkspaceState>>;
}

export type { WorkspacePort };
