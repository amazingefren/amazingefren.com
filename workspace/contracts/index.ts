export type WorkspaceAudience = 'guest' | 'owner';
export type WorkspacePage =
  | 'dashboard'
  | 'work'
  | 'documents'
  | 'tasks'
  | 'experiments'
  | 'relationships'
  | 'publishing'
  | 'systems'
  | 'connections'
  | 'access';
export type DocumentRevision = {
  revision: number;
  title: string;
  body: string;
  savedAt: string;
};
export type WorkspaceDocument = {
  id: string;
  title: string;
  body: string;
  revision: number;
  updatedAt: string;
  revisions: DocumentRevision[];
};
export type WorkspaceTask = {
  id: string;
  title: string;
  done: boolean;
  documentId: string | null;
};
export type WorkspaceExperiment = {
  id: string;
  title: string;
  hypothesis: string;
  status: 'planned' | 'running' | 'complete';
  observations: string;
};
export type WorkspaceRelationship = {
  id: string;
  from: string;
  to: string;
  label: string;
};
export type WorkspacePublication = {
  documentId: string;
  title: string;
  body: string;
  revision: number;
  publishedAt: string;
};
export type WorkspaceActivity = { id: string; label: string; at: string };
export type WorkspaceState = {
  version: number;
  synthetic: boolean;
  documents: WorkspaceDocument[];
  tasks: WorkspaceTask[];
  experiments: WorkspaceExperiment[];
  relationships: WorkspaceRelationship[];
  publications: WorkspacePublication[];
  activity: WorkspaceActivity[];
};
export type WorkspaceError = {
  code: 'invalid' | 'denied' | 'missing' | 'conflict' | 'unavailable';
  message: string;
};
export type WorkspaceResult<T> =
  { ok: true; value: T } | { ok: false; error: WorkspaceError };
export type WorkspaceCommand =
  | { operation: 'workspace.read'; input: Record<string, never> }
  | { operation: 'workspace.reset'; input: Record<string, never> }
  | {
      operation: 'workspace.create-document';
      input: { title: string; body?: string };
    }
  | {
      operation: 'workspace.save-document';
      input: { id: string; title: string; body: string; revision: number };
    }
  | {
      operation: 'workspace.restore-document';
      input: { id: string; sourceRevision: number; revision: number };
    }
  | {
      operation: 'workspace.create-task';
      input: { title: string; documentId?: string };
    }
  | {
      operation: 'workspace.complete-task';
      input: { id: string; done: boolean };
    }
  | {
      operation: 'workspace.create-experiment';
      input: { title: string; hypothesis: string };
    }
  | {
      operation: 'workspace.update-experiment';
      input: {
        id: string;
        status: WorkspaceExperiment['status'];
        observations: string;
      };
    }
  | {
      operation: 'workspace.link-documents';
      input: { from: string; to: string; label: string };
    }
  | { operation: 'workspace.unlink-documents'; input: { id: string } }
  | { operation: 'workspace.publish'; input: { id: string; revision: number } }
  | { operation: 'workspace.withdraw'; input: { id: string } };
export type WorkspacePort = {
  execute(command: WorkspaceCommand): Promise<WorkspaceResult<WorkspaceState>>;
};
export type WorkspacePageProps = {
  state: WorkspaceState;
  audience: WorkspaceAudience;
  execute: WorkspacePort['execute'];
  busy: boolean;
  navigate(page: WorkspacePage, recordId?: string): void;
  recordId?: string;
  onDirtyChange?(dirty: boolean): void;
};
export type CatalogEntry = {
  id: string;
  name: string;
  purpose: string;
  status: string;
  capabilities: string[];
  dependencies: string[];
  contracts: string[];
  operations: {
    id: string;
    access: string;
    permissions: string[];
    bindings: { kind: string; label: string }[];
  }[];
};
export const workspacePages: readonly WorkspacePage[] = [
  'dashboard',
  'work',
  'documents',
  'tasks',
  'experiments',
  'relationships',
  'publishing',
  'systems',
  'connections',
  'access',
];
