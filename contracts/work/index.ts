export type Kind = 'feature' | 'bug' | 'publication';
export type Space = { id: string; title: string; agents: boolean };
export type Item = {
  id: string;
  spaceId: string;
  title: string;
  kind: Kind;
  system: string;
  outcome: string;
  next: string;
  acceptance: string;
  blocker: string;
  dependencies: string[];
  agentAllowed: boolean;
  assignee: 'me' | 'agent' | null;
  phase: 'open' | 'active' | 'review' | 'done';
  evidence: string;
  focus: boolean;
  revision: number;
  history: string[];
};
export type State = {
  schemaVersion: 1;
  version: number;
  synthetic: boolean;
  spaces: Space[];
  items: Item[];
};
export type Fields = Pick<
  Item,
  | 'title'
  | 'system'
  | 'outcome'
  | 'next'
  | 'acceptance'
  | 'blocker'
  | 'dependencies'
  | 'agentAllowed'
  | 'evidence'
>;
export type Command =
  | { operation: 'work.read' }
  | {
      operation: 'work.create-space';
      id: string;
      title: string;
      agents: boolean;
    }
  | {
      operation: 'work.create-item';
      id: string;
      spaceId: string;
      title: string;
      kind: Kind;
    }
  | { operation: 'work.edit'; id: string; revision: number; fields: Fields }
  | {
      operation:
        | 'work.focus'
        | 'work.start'
        | 'work.submit'
        | 'work.accept'
        | 'work.return'
        | 'work.reopen';
      id: string;
      revision: number;
    };
export type Result =
  | { ok: true; state: State }
  | {
      ok: false;
      error: 'invalid' | 'denied' | 'conflict' | 'unavailable';
      message: string;
    };
export type WorkPort = { execute(command: Command): Promise<Result> };
export type WorkProps = {
  state: State;
  busy: boolean;
  execute: WorkPort['execute'];
  onDirtyChange?(dirty: boolean): void;
  audience: 'owner' | 'guest';
};
export type WorkStorage = {
  read(ownerId: string): Promise<State | null>;
  compareAndSwap(
    ownerId: string,
    expectedVersion: number,
    state: State,
  ): Promise<boolean>;
};
export type WorkActor = {
  kind: 'owner' | 'agent';
  ownerId: string;
  subject: string;
  spaceIds: readonly string[];
};

export const maxWorkStateBytes = 1_500_000;
export type WorkGuestResetEvent = { type: 'work:guest-reset' };
export const maxWorkCommandBytes = 131_072;
