import type { SystemManifest } from '../manifests/schema/system.schema.ts';
import type { Operation } from '../manifests/schema/operation.schema.ts';
import { operationIds } from './operations/index.ts';

const contract = 'contracts/work/index.ts';
const tests = ['work/tests/work.test.ts'];
const operations: Operation[] = operationIds.map((id) => ({
  id,
  access: {
    kind: 'authenticated',
    permissions: [id === 'work.read' ? 'work.read' : 'work.write'],
    ownership: 'caller',
  },
  dataScope: 'owner',
  bindings: [
    {
      id: `${id}.http`,
      surface: {
        kind: 'http',
        method: 'POST',
        path: `/api/work/operations/${id}`,
      },
      scope: 'required',
      status: 'declared',
      directory: 'work/adapters',
      testsDirectory: 'work/tests',
      implementation: 'work/adapters/owner.ts',
      tests: ['work/tests/gateway.test.ts'],
    },
    {
      id: `${id}.mcp`,
      surface: {
        kind: 'mcp-tool',
        name: id.replaceAll('.', '_').replaceAll('-', '_'),
        description: id.slice(5).replaceAll('-', ' '),
        readOnly: id === 'work.read',
      },
      scope: 'required',
      status: 'declared',
      directory: 'work/adapters',
      testsDirectory: 'work/tests',
      implementation: 'work/adapters/transports.ts',
      tests,
    },
    {
      id: `${id}.cli`,
      surface: {
        kind: 'cli',
        command: `ae work ${id.slice(5)}`,
        output: 'json',
      },
      scope: 'required',
      status: 'declared',
      directory: 'work/adapters',
      testsDirectory: 'work/tests',
      implementation: 'work/adapters/transports.ts',
      tests,
    },
  ],
  status: 'declared',
  input: contract,
  output: contract,
  errors: contract,
  directory: 'work/operations',
  testsDirectory: 'work/tests',
  implementation: 'work/operations/index.ts',
  verification: [
    {
      id: `${id}.contract`,
      category: 'contract',
      expectation:
        'Reject malformed and undeclared commands, unsafe states and unknown fields.',
      tests,
    },
    {
      id: `${id}.behavior`,
      category: 'behavior',
      expectation:
        'Readiness follows prerequisites; focus is bounded; completion requires owner-reviewed evidence.',
      tests,
    },
    {
      id: `${id}.access`,
      category: 'access',
      expectation:
        'The private service authorizes identity before storage. Publication work denies agents. Guest storage never reads owner records.',
      tests: ['work/tests/gateway.test.ts'],
    },
    {
      id: `${id}.failure`,
      category: 'failure',
      expectation:
        'Stale revisions, conflicting storage writes and persistence failure do not partially mutate state.',
      tests,
    },
  ],
}));

export default {
  kind: 'system',
  id: 'work',
  name: 'AE Work',
  purpose:
    'Manage publications, features and bugs through next actions and dependencies.',
  owner: 'amazingefren',
  status: 'implemented',
  scope: 'required',
  visibility: 'public',
  context: {
    decisions: [
      'Owner authorized application implementation and agent refinement on 2026-09-09. AE Work extends the approved workspace shell.',
      'Spaces collect work. Focus is bounded to three items. Readiness derives from next action, acceptance criteria, dependencies and blockers.',
      'Publications are human-only. Agent work requires item and space permission; assignment does not grant permission. Owner accepts completion evidence.',
      'Remove explanatory interface prose. Use concise names, state, and contextual controls; retain essential failure recovery.',
      'Public code provides contracts and synthetic guest behavior. Owner rules and D1 persistence belong to ae-studio-engine.',
      'HTTP connects to the configured owner service. MCP and CLI adapters share an injected WorkPort; live agent identity and remote MCP registration remain unconfigured.',
    ],
    openQuestions: [
      'Owner service deployment and migration are not applied by this change.',
      'Daily owner use must guide further interface changes; no usability improvement is yet measured.',
    ],
  },
  capabilities: ['work-management', 'guest-work', 'portable-access'],
  governance: {
    permissionsDefined: ['work.read', 'work.write'],
    dataClassification: 'mixed',
  },
  risks: [],
  dependencies: ['workspace', 'design', 'auth'],
  schemaVersion: 5,
  views: [
    {
      id: 'guest',
      directory: 'work/ui',
      testsDirectory: 'work/tests',
      implementation: 'work/ui/index.ts',
      path: '/guest/work',
      status: 'declared',
      audience: 'guest',
      access: { kind: 'public' },
      data: 'synthetic',
      replicaOf: 'owner',
      isolation: 'session',
      sideEffects: 'sandbox-only',
      productionAccess: 'denied',
      fallback: 'fail-closed',
      operations: ['work.guest-execute'],
      verification: [
        {
          expectation: 'Guest work stays in a bounded synthetic session port.',
          tests,
        },
      ],
    },
    {
      id: 'owner',
      directory: 'work/ui',
      testsDirectory: 'work/tests',
      implementation: 'work/ui/index.ts',
      path: '/workspace/work',
      status: 'declared',
      audience: 'owner',
      access: {
        kind: 'authenticated',
        permissions: ['work.read', 'work.write'],
        ownership: 'caller',
      },
      data: 'owner',
      operations: [...operationIds],
      verification: [
        {
          expectation: 'Identity is authorized before work reads or writes.',
          tests: ['work/tests/gateway.test.ts'],
        },
      ],
    },
  ],
  contracts: [contract],
  operations: [
    ...operations,
    {
      id: 'work.guest-execute',
      access: { kind: 'public' },
      dataScope: 'synthetic',
      bindings: [],
      status: 'declared',
      input: contract,
      output: contract,
      errors: contract,
      directory: 'work/adapters',
      testsDirectory: 'work/tests',
      implementation: 'work/adapters/guest.ts',
      verification: [
        {
          id: 'work.guest-execute.access',
          category: 'access',
          expectation:
            'Only synthetic session data is accepted; owner state and invalid saved data fail closed.',
          tests,
        },
      ],
    },
  ],
  events: [{ id: 'work:guest-reset', contract, direction: 'consumes' }],
  capabilityPaths: {
    'work-management': 'work/operations',
    'guest-work': 'work/domain',
    'portable-access': 'work/adapters',
  },
  structure: {
    ui: 'work/ui',
    tests: 'work/tests',
    adapters: 'work/adapters',
    operations: 'work/operations',
  },
  entrypoints: ['work/operations/index.ts', 'work/ui/index.ts'],
} as const satisfies SystemManifest;
