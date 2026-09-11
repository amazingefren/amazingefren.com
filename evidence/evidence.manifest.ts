import type { Operation } from '../manifests/schema/operation.schema.ts';
import type { SystemManifest } from '../manifests/schema/system.schema.ts';

const contract = 'evidence/contracts/index.ts';
const tests = [
  'evidence/tests/contracts.test.ts',
  'evidence/tests/gateway.test.ts',
  'evidence/tests/transports.test.ts',
];
const ids = [
  'evidence.read',
  'evidence.create',
  'evidence.update',
  'evidence.review',
  'evidence.export-reviewed',
] as const;
function operation(id: (typeof ids)[number]): Operation {
  const permission =
    id === 'evidence.review'
      ? 'evidence.review'
      : id === 'evidence.export-reviewed'
        ? 'evidence.export'
        : id === 'evidence.read'
          ? 'evidence.read'
          : 'evidence.write';
  return {
    id,
    dataScope: 'owner',
    access: {
      kind: 'authenticated',
      permissions: [permission],
      ownership: 'caller',
    },
    bindings: [
      {
        id: `${id}.http`,
        surface: {
          kind: 'http',
          method: 'POST',
          path: `/api/evidence/operations/${id}`,
        },
        scope: 'required',
        status: 'implemented',
        directory: 'evidence/adapters',
        testsDirectory: 'evidence/tests',
        implementation: 'evidence/adapters/owner.ts',
        tests,
      },
      {
        id: `${id}.mcp`,
        surface: {
          kind: 'mcp-tool',
          name: id.replaceAll('.', '_').replaceAll('-', '_'),
          description: id.slice('evidence.'.length).replaceAll('-', ' '),
          readOnly: id === 'evidence.read' || id === 'evidence.export-reviewed',
        },
        scope: 'required',
        status: 'implemented',
        directory: 'evidence/adapters',
        testsDirectory: 'evidence/tests',
        implementation: 'evidence/adapters/transports.ts',
        tests,
      },
      {
        id: `${id}.cli`,
        surface: {
          kind: 'cli',
          command: `ae evidence ${id.slice('evidence.'.length)}`,
          output: 'json',
        },
        scope: 'required',
        status: 'implemented',
        directory: 'evidence/adapters',
        testsDirectory: 'evidence/tests',
        implementation: 'evidence/adapters/transports.ts',
        tests,
      },
    ],
    status: 'implemented',
    input: contract,
    output: contract,
    errors: contract,
    directory: 'evidence/adapters',
    testsDirectory: 'evidence/tests',
    implementation: 'evidence/adapters/owner.ts',
    verification: [
      {
        id: `${id}.contract`,
        category: 'contract',
        expectation:
          'Evidence commands validate typed input before storage access.',
        tests,
      },
      {
        id: `${id}.access`,
        category: 'access',
        expectation:
          'Owner authorization occurs before evidence storage reads.',
        tests,
      },
      {
        id: `${id}.failure`,
        category: 'failure',
        expectation:
          'Invalid input and revision conflicts return typed failures.',
        tests,
      },
    ],
  };
}
export default {
  kind: 'system',
  id: 'evidence',
  name: 'AE Evidence',
  purpose: 'Track claims and observations with sources and explicit review.',
  owner: 'amazingefren',
  status: 'implemented',
  scope: 'required',
  visibility: 'public',
  schemaVersion: 5,
  context: {
    decisions: [
      'Claims and observations remain distinct records with explicit sources and review state.',
      'Only reviewed owner selections can export. Export does not publish.',
      'Guest evidence uses isolated synthetic state and never reads private research.',
      'Approved public evidence delivery remains deferred.',
      'CLI and MCP adapters are injected owner library entrypoints and are not public remote MCP tools.',
    ],
    openQuestions: ['Approved public evidence export contract.'],
  },
  capabilities: ['hypothesis-tracking', 'source-ledger', 'reviewed-export'],
  governance: {
    permissionsDefined: [
      'evidence.read',
      'evidence.write',
      'evidence.review',
      'evidence.export',
    ],
    dataClassification: 'private',
  },
  risks: [],
  dependencies: ['auth', 'workspace'],
  contracts: [contract],
  operations: [
    ...ids.map(operation),
    {
      id: 'evidence.guest-execute',
      dataScope: 'synthetic',
      access: { kind: 'public' },
      bindings: [],
      status: 'implemented',
      input: contract,
      output: contract,
      errors: contract,
      directory: 'evidence/adapters',
      testsDirectory: 'evidence/tests',
      implementation: 'evidence/adapters/guest.ts',
      verification: [
        {
          id: 'evidence.guest-execute.behavior',
          category: 'behavior',
          expectation: 'Guest evidence is isolated synthetic state.',
          tests: ['evidence/tests/guest.test.ts'],
        },
      ],
    },
  ],
  events: [],
  views: [
    {
      id: 'owner',
      path: '/workspace/evidence',
      status: 'implemented',
      directory: 'evidence/ui',
      testsDirectory: 'evidence/tests',
      implementation: 'evidence/ui/index.tsx',
      operations: ids,
      audience: 'owner',
      access: {
        kind: 'authenticated',
        permissions: [
          'evidence.read',
          'evidence.write',
          'evidence.review',
          'evidence.export',
        ],
        ownership: 'caller',
      },
      data: 'owner',
      verification: [
        {
          expectation:
            'Owner evidence remains private until a separate publication operation.',
          tests,
        },
      ],
    },
    {
      id: 'guest',
      path: '/guest/evidence',
      status: 'implemented',
      directory: 'evidence/ui',
      testsDirectory: 'evidence/tests',
      implementation: 'evidence/ui/index.tsx',
      operations: ['evidence.guest-execute'],
      audience: 'guest',
      access: { kind: 'public' },
      data: 'synthetic',
      replicaOf: 'owner',
      isolation: 'session',
      sideEffects: 'sandbox-only',
      productionAccess: 'denied',
      fallback: 'fail-closed',
      verification: [
        {
          expectation: 'Guest evidence has isolated synthetic session state.',
          tests: ['evidence/tests/guest.test.ts'],
        },
      ],
    },
  ],
  capabilityPaths: {
    'hypothesis-tracking': 'evidence/contracts',
    'source-ledger': 'evidence/adapters',
    'reviewed-export': 'evidence/contracts',
  },
  structure: {
    contracts: 'evidence/contracts',
    adapters: 'evidence/adapters',
    ui: 'evidence/ui',
    tests: 'evidence/tests',
  },
  entrypoints: [
    'evidence/contracts/index.ts',
    'evidence/adapters/owner.ts',
    'evidence/adapters/guest-session.ts',
    'evidence/adapters/transports.ts',
    'evidence/ui/index.tsx',
  ],
} as const satisfies SystemManifest;
