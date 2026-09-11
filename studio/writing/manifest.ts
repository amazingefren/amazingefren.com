import type { Operation } from '../../manifests/schema/operation.schema.ts';

export const studioWritingOperationIds = [
  'studio.writing.read',
  'studio.notes.create',
  'studio.notes.save',
  'studio.notes.restore',
  'studio.notes.archive',
  'studio.assets.add',
  'studio.assets.update',
  'studio.writing.reset',
] as const;
export type StudioWritingOperationId =
  (typeof studioWritingOperationIds)[number];

const operation = (
  id: StudioWritingOperationId,
  readOnly: boolean,
): Operation => ({
  id,
  dataScope: 'synthetic',
  access: { kind: 'public' },
  bindings: [
    {
      id: `${id}.http`,
      surface: { kind: 'http', method: 'POST', path: '/api/writing/operation' },
      scope: 'required',
      status: 'implemented',
      directory: 'studio/writing',
      testsDirectory: 'studio/tests/writing',
      implementation: 'studio/writing/adapters.ts',
      tests: [],
    },
    {
      id: `${id}.mcp-tool`,
      surface: {
        kind: 'mcp-tool',
        name: id.replaceAll('.', '_').replaceAll('-', '_'),
        description: `Invoke ${id} through the authorized writing port.`,
        readOnly,
      },
      scope: 'required',
      status: 'implemented',
      directory: 'studio/writing',
      testsDirectory: 'studio/tests/writing',
      implementation: 'studio/writing/adapters.ts',
      tests: [],
    },
    {
      id: `${id}.cli`,
      surface: {
        kind: 'cli',
        command: `ae writing ${id.replace('studio.', '')}`,
        output: 'json',
      },
      scope: 'required',
      status: 'implemented',
      directory: 'studio/writing',
      testsDirectory: 'studio/tests/writing',
      implementation: 'studio/writing/adapters.ts',
      tests: [],
    },
  ],
  status: 'implemented',
  input: 'contracts/writing/index.ts',
  output: 'contracts/writing/index.ts',
  errors: 'contracts/writing/index.ts',
  directory: `studio/writing/operations/${id}`,
  testsDirectory: `studio/tests/writing/${id}`,
  implementation: 'studio/writing/guest.ts',
  verification: [
    {
      id: `${id}.contract`,
      category: 'contract',
      expectation: 'The command and result use contracts/writing/index.ts.',
      tests: [],
    },
    {
      id: `${id}.access`,
      category: 'access',
      expectation:
        'The injected port authorizes before protected operations; guest state is synthetic only.',
      tests: [],
    },
    {
      id: `${id}.behavior`,
      category: 'behavior',
      expectation:
        'Guest operations persist only in the isolated guest storage key.',
      tests: [],
    },
    {
      id: `${id}.failure`,
      category: 'failure',
      expectation:
        'Invalid state and revision conflicts return typed failures without fallback data.',
      tests: [],
    },
  ],
});

export const studioWritingOperations: readonly Operation[] =
  studioWritingOperationIds.map((id) =>
    operation(id, id === 'studio.writing.read'),
  );
