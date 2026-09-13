import type { Item, State } from '../../contracts/work/index.ts';

export function seed(): State {
  const item = (id: string, title: string, fields: Partial<Item>): Item => ({
    id,
    title,
    spaceId: 'ae',
    kind: 'feature',
    system: 'workspace',
    outcome: '',
    next: 'Implement the declared behavior',
    acceptance: 'Behavior, access denial, and failure checks pass.',
    blocker: '',
    dependencies: [],
    agentAllowed: false,
    assignee: null,
    phase: 'open',
    evidence: '',
    focus: false,
    revision: 1,
    history: ['Sample item; not an audit of AE'],
    ...fields,
  });
  return {
    schemaVersion: 1,
    synthetic: true,
    version: 1,
    spaces: [
      { id: 'writing', title: 'Publications', agents: false },
      { id: 'ae', title: 'AE development', agents: true },
      { id: 'bugs', title: 'Bugs', agents: true },
    ],
    items: [
      item('essay', 'Essay draft', {
        spaceId: 'writing',
        kind: 'publication',
        system: '',
        outcome: 'A publication written and approved by me.',
        next: 'Write the opening in my manuscript',
        acceptance: 'I have edited and approved the complete manuscript.',
        phase: 'active',
        assignee: 'me',
        focus: true,
      }),
      item('scope', 'Decide the owner access rules', {
        system: 'auth',
        outcome: 'Owner data has explicit access rules.',
        next: 'Review which operations agents may use',
        acceptance: 'Every protected operation names the required permission.',
        focus: true,
      }),
      item('auth', 'Implement owner access checks', {
        system: 'auth',
        outcome: 'Protected reads fail closed.',
        dependencies: ['scope'],
        agentAllowed: true,
      }),
      item('release', 'Connect publication releases', {
        system: 'publishing',
        outcome: 'Only an approved revision can become public.',
        next: 'Wire the approved release operation',
        dependencies: ['auth'],
        agentAllowed: true,
      }),
      item('focus', 'Restore keyboard focus after closing details', {
        spaceId: 'bugs',
        kind: 'bug',
        outcome: 'Keyboard navigation resumes at the opened item.',
        next: 'Reproduce focus loss and fix the return target',
        agentAllowed: true,
        focus: true,
      }),
      item('export', 'Review the catalog export', {
        system: 'system-explorer',
        outcome: 'The catalog contains approved public fields only.',
        next: 'Inspect the exported fields and denial checks',
        phase: 'review',
        assignee: 'agent',
        agentAllowed: true,
        evidence:
          'Sample review evidence: allowlisted fields and denied private entries. Replace with a real check result.',
      }),
      item('reading', 'Reading notes', {
        spaceId: 'writing',
        kind: 'publication',
        system: '',
        next: 'Read source material and collect my own notes',
        acceptance: 'My source notes are complete.',
        blocker: 'Waiting for source material',
      }),
      item('retry', 'Handle a failed save without losing text', {
        spaceId: 'bugs',
        kind: 'bug',
        system: 'studio',
        next: 'Exercise a failed save and retry',
        agentAllowed: true,
      }),
      item('tokens', 'Use the shared theme controls', {
        system: 'design',
        phase: 'done',
        evidence:
          'Synthetic accepted result; not live implementation evidence.',
      }),
    ],
  };
}
