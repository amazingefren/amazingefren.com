import type { Operation } from '../../manifests/schema/operation.schema.ts';

const draft = (
  id: string,
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  readOnly: boolean,
): Operation => ({
  id,
  dataScope: 'owner',
  access: {
    kind: 'authenticated',
    permissions: [readOnly ? 'studio.draft.read' : 'studio.draft.write'],
    ownership: 'caller',
  },
  bindings: [
    {
      id: `${id}.http`,
      surface: { kind: 'http', method, path },
      scope: 'required',
      status: 'implemented',
      directory: 'studio/external',
      testsDirectory: 'studio/tests/external',
      implementation: 'studio/external/adapters.ts',
      tests: ['studio/tests/external/adapters.test.ts'],
    },
    {
      id: `${id}.mcp`,
      surface: {
        kind: 'mcp-tool',
        name: id.replaceAll('.', '_').replaceAll('-', '_'),
        description: `Invoke ${id} through an authorized draft port.`,
        readOnly,
      },
      scope: 'required',
      status: 'implemented',
      directory: 'studio/external',
      testsDirectory: 'studio/tests/external',
      implementation: 'studio/external/adapters.ts',
      tests: ['studio/tests/external/adapters.test.ts'],
    },
    {
      id: `${id}.cli`,
      surface: {
        kind: 'cli',
        command: `ae ${id.replaceAll('.', ' ')}`,
        output: 'json',
      },
      scope: 'required',
      status: 'implemented',
      directory: 'studio/external',
      testsDirectory: 'studio/tests/external',
      implementation: 'studio/external/adapters.ts',
      tests: ['studio/tests/external/adapters.test.ts'],
    },
  ],
  status: 'implemented',
  input: 'contracts/writing/external.ts',
  output: 'contracts/writing/external.ts',
  errors: 'contracts/writing/external.ts',
  directory: 'studio/external',
  testsDirectory: 'studio/tests/external',
  implementation: 'studio/external/adapters.ts',
  verification: [
    {
      id: `${id}.contract`,
      category: 'contract',
      expectation:
        'The adapter preserves the revision-1 external draft contract envelope.',
      tests: ['studio/tests/external/adapters.test.ts'],
    },
  ],
});

const clients = (id: string, method: 'GET' | 'POST' | 'DELETE'): Operation => ({
  id,
  dataScope: 'owner',
  access: {
    kind: 'authenticated',
    permissions: ['studio.clients.manage'],
    ownership: 'caller',
  },
  bindings: [
    {
      id: `${id}.http`,
      surface: { kind: 'http', method, path: '/api/v1/studio/clients' },
      scope: 'required',
      status: 'implemented',
      directory: 'studio/external',
      testsDirectory: 'studio/tests/external',
      implementation: 'studio/external/adapters.ts',
      tests: ['studio/tests/external/adapters.test.ts'],
    },
  ],
  status: 'implemented',
  input: 'contracts/writing/external.ts',
  output: 'contracts/writing/external.ts',
  errors: 'contracts/writing/external.ts',
  directory: 'studio/external',
  testsDirectory: 'studio/tests/external',
  implementation: 'studio/external/adapters.ts',
  verification: [
    {
      id: `${id}.access`,
      category: 'access',
      expectation:
        'The public adapter delegates client management to the injected authorized port.',
      tests: ['studio/tests/external/adapters.test.ts'],
    },
  ],
});

export const studioExternalOperations: readonly Operation[] = [
  draft(
    'studio.external-drafts.list',
    'GET',
    '/api/v1/studio/publications',
    true,
  ),
  draft(
    'studio.external-drafts.read',
    'GET',
    '/api/v1/studio/publications/{projectId}',
    true,
  ),
  draft(
    'studio.external-drafts.create',
    'POST',
    '/api/v1/studio/publications',
    false,
  ),
  draft(
    'studio.external-drafts.save',
    'PUT',
    '/api/v1/studio/publications/{projectId}/draft',
    false,
  ),
  draft(
    'studio.external-drafts.upload-asset',
    'POST',
    '/api/v1/studio/publications/{projectId}/assets',
    false,
  ),
  draft(
    'studio.external-drafts.read-asset',
    'GET',
    '/api/v1/studio/publications/{projectId}/assets/{assetId}',
    true,
  ),
  clients('studio.external-clients.list', 'GET'),
  clients('studio.external-clients.issue', 'POST'),
  clients('studio.external-clients.revoke', 'DELETE'),
];
