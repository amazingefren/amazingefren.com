import type { Operation } from '../manifests/schema/operation.schema.ts';
import type { SystemManifest } from '../manifests/schema/system.schema.ts';

const contract = 'evaluation/contracts/index.ts';
const tests = [
  'evaluation/tests/transports.test.ts',
  'evaluation/tests/gateway.test.ts',
];
const ids = [
  'evaluation.read',
  'evaluation.create-definition',
  'evaluation.update-definition',
  'evaluation.freeze-definition',
  'evaluation.create-run',
  'evaluation.execute-run',
  'evaluation.cancel-run',
  'evaluation.import-attempts',
  'evaluation.score-manual',
  'evaluation.export-report',
] as const;
function operation(id: (typeof ids)[number]): Operation {
  const execute =
    id === 'evaluation.execute-run' || id === 'evaluation.cancel-run';
  const permission =
    id === 'evaluation.read' || id === 'evaluation.export-report'
      ? 'evaluation.read'
      : execute
        ? 'evaluation.execute'
        : 'evaluation.write';
  const suffix = id.slice('evaluation.'.length);
  return {
    id,
    dataScope: 'owner',
    access: {
      kind: 'authenticated',
      permissions: [permission],
      ownership: 'caller',
    },
    status: 'implemented',
    input: contract,
    output: contract,
    errors: contract,
    directory: 'evaluation',
    testsDirectory: 'evaluation/tests',
    implementation: 'evaluation/adapters/owner.ts',
    bindings: [
      {
        id: `${id}.http`,
        surface: {
          kind: 'http',
          method: 'POST',
          path: `/api/evaluation/operations/${id}`,
        },
        scope: 'required',
        status: 'implemented',
        directory: 'evaluation/adapters',
        testsDirectory: 'evaluation/tests',
        implementation: 'evaluation/adapters/owner.ts',
        tests,
      },
      {
        id: `${id}.mcp`,
        surface: {
          kind: 'mcp-tool',
          name: id.replaceAll('.', '_').replaceAll('-', '_'),
          description: suffix.replaceAll('-', ' '),
          readOnly: permission === 'evaluation.read',
        },
        scope: 'required',
        status: 'implemented',
        directory: 'evaluation/adapters',
        testsDirectory: 'evaluation/tests',
        implementation: 'evaluation/adapters/transports.ts',
        tests,
      },
      {
        id: `${id}.cli`,
        surface: {
          kind: 'cli',
          command: `ae evaluation ${suffix}`,
          output: 'json',
        },
        scope: 'required',
        status: 'implemented',
        directory: 'evaluation/adapters',
        testsDirectory: 'evaluation/tests',
        implementation: 'evaluation/adapters/transports.ts',
        tests,
      },
    ],
    verification: [
      {
        id: `${id}.contract`,
        category: 'contract',
        expectation:
          'Declared commands reject malformed and unknown fields before execution.',
        tests,
      },
      {
        id: `${id}.access`,
        category: 'access',
        expectation:
          'Owner identity is authorized before private storage reads or writes.',
        tests,
      },
      {
        id: `${id}.behavior`,
        category: 'behavior',
        expectation:
          'Frozen definitions, attempts, and measurements remain inspectable.',
        tests,
      },
      {
        id: `${id}.failure`,
        category: 'failure',
        expectation:
          'Conflicts, unavailable storage, and invalid provider data return typed errors.',
        tests,
      },
    ],
  };
}
export default {
  kind: 'system',
  id: 'evaluation',
  name: 'AE Evaluation',
  purpose:
    'Define, run, score, document, and compare bounded text and model benchmarks.',
  owner: 'amazingefren',
  status: 'implemented',
  scope: 'required',
  visibility: 'public',
  schemaVersion: 5,
  context: {
    decisions: [
      'Definitions freeze before runs. Revisions and failed attempts remain visible.',
      'Execution accepts text and model subjects through a private injected port. It does not execute arbitrary code.',
      'Missing provider usage is null. Aggregates expose scheduled and unknown denominators.',
      'Public contracts and synthetic fixtures do not import the private engine.',
      'Guest benchmark state persists through workspace navigation in session storage. Invalid or owner state is rejected and concurrent changes return a conflict.',
      'Selected-run reports can be saved to private Notes or recorded as draft observations in Evidence with their run reference. Review and publication remain explicit owner actions.',
      'MCP and CLI owner adapters require an injected authorized port; the public MCP endpoint does not expose owner operations.',
    ],
    openQuestions: [
      'Provider selection and D1 deployment configuration remain private service work.',
    ],
  },
  capabilities: [
    'benchmark-definitions',
    'bounded-execution',
    'result-import',
    'manual-scoring',
  ],
  governance: {
    permissionsDefined: [
      'evaluation.read',
      'evaluation.write',
      'evaluation.execute',
    ],
    dataClassification: 'private',
  },
  risks: [],
  dependencies: ['workspace', 'auth'],
  views: [
    {
      id: 'owner',
      path: '/workspace/benchmarks',
      status: 'implemented',
      directory: 'evaluation/ui',
      testsDirectory: 'evaluation/tests',
      implementation: 'evaluation/ui/index.tsx',
      operations: ids,
      audience: 'owner',
      access: {
        kind: 'authenticated',
        permissions: [
          'evaluation.read',
          'evaluation.write',
          'evaluation.execute',
        ],
        ownership: 'caller',
      },
      data: 'owner',
      verification: [
        {
          expectation: 'Owner access is enforced before evaluation storage.',
          tests,
        },
      ],
    },
    {
      id: 'guest',
      path: '/guest/benchmarks',
      status: 'implemented',
      directory: 'evaluation/ui',
      testsDirectory: 'evaluation/tests',
      implementation: 'evaluation/ui/index.tsx',
      operations: ['evaluation.guest-execute'],
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
          expectation: 'Guest benchmarks use isolated synthetic state.',
          tests: [
            'evaluation/tests/guest.test.ts',
            'evaluation/tests/guest-session.test.ts',
          ],
        },
      ],
    },
  ],
  contracts: [contract, 'evaluation/contracts/result.ts'],
  operations: [
    ...ids.map(operation),
    {
      id: 'evaluation.guest-execute',
      dataScope: 'synthetic',
      access: { kind: 'public' },
      bindings: [],
      status: 'implemented',
      input: contract,
      output: contract,
      errors: contract,
      directory: 'evaluation/adapters',
      testsDirectory: 'evaluation/tests',
      implementation: 'evaluation/adapters/guest.ts',
      verification: [
        {
          id: 'evaluation.guest-execute.behavior',
          category: 'behavior',
          expectation: 'Guest benchmarks use only synthetic isolated state.',
          tests: [
            'evaluation/tests/guest.test.ts',
            'evaluation/tests/guest-session.test.ts',
          ],
        },
      ],
    },
  ],
  events: [],
  capabilityPaths: {
    'benchmark-definitions': 'evaluation/contracts',
    'bounded-execution': 'evaluation/adapters',
    'result-import': 'evaluation/contracts',
    'manual-scoring': 'evaluation/contracts',
  },
  structure: {
    contracts: 'evaluation/contracts',
    adapters: 'evaluation/adapters',
    fixtures: 'evaluation/fixtures',
    ui: 'evaluation/ui',
    tests: 'evaluation/tests',
  },
  entrypoints: [
    'evaluation/contracts/index.ts',
    'evaluation/adapters/owner.ts',
    'evaluation/adapters/transports.ts',
    'evaluation/ui/index.tsx',
    'evaluation/domain/report.ts',
  ],
} as const satisfies SystemManifest;
