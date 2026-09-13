import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  kind: 'system',
  id: 'mcp',
  name: 'AE MCP',
  purpose: 'Expose authorized system capabilities to AI clients.',
  owner: 'amazingefren',
  status: 'implemented',
  visibility: 'public',
  decisions: [
    'Tools and resources derive from owning operation bindings. Public transport excludes private and write operations; owner adapters require separate authorization.',
    'Public transport negotiates 2025-11-25. ZIP resources are capped at 4 MiB; larger exports use HTTP.',
    'Claude connectors use the same remote MCP transport; compatibility requires independent client verification.',
  ],
  capabilities: [
    'tools',
    'resources',
    'content-discovery',
    'system-discovery',
    'claude-connectors',
  ],
  governance: {
    permissionsDefined: [],
    dataClassification: 'mixed',
  },
  risks: [],
  dependencies: ['auth', 'publishing', 'system-explorer', 'studio'],
  schemaVersion: 6,
  contracts: ['contracts/api/mcp-rpc.schema.json'],
  operations: [
    {
      id: 'mcp.public',
      access: { kind: 'public' },
      bindings: [
        {
          id: 'mcp.public.http',
          surface: { kind: 'http', method: 'POST', path: '/mcp' },
          status: 'implemented',
          implementation: 'mcp/transport/public.ts',
          tests: ['mcp/tests/public.test.ts'],
          directory: 'mcp/transport',
          testsDirectory: 'mcp/tests',
        },
      ],
      status: 'implemented',
      input: 'contracts/api/mcp-rpc.schema.json',
      output: 'contracts/api/mcp-rpc.schema.json',
      errors: 'contracts/api/errors.schema.json',
      directory: 'mcp/transport',
      testsDirectory: 'mcp/tests',
      implementation: 'mcp/transport/public.ts',
      verification: [
        {
          id: 'mcp.public.protocol',
          category: 'contract',
          expectation: 'JSON-RPC requests return protocol-defined responses.',
          tests: ['mcp/tests/public.test.ts'],
        },
        {
          id: 'mcp.public.access',
          category: 'access',
          expectation:
            'Only declared public catalog tools and resources are available.',
          tests: ['mcp/tests/public.test.ts'],
        },
        {
          id: 'mcp.public.failure',
          category: 'failure',
          expectation:
            'Invalid requests, origins, methods, and operations receive defined failures.',
          tests: ['mcp/tests/public.test.ts'],
        },
      ],
    },
  ],
  capabilityPaths: {
    tools: 'mcp/transport',
    resources: 'mcp/transport',
    'content-discovery': 'mcp/transport',
    'system-discovery': 'mcp/transport',
    'claude-connectors': 'mcp/transport',
  },
  structure: {
    domain: 'mcp/domain',
    operations: 'mcp/operations',
    ports: 'mcp/ports',
    adapters: 'mcp/adapters',
    tests: 'mcp/tests',
    composition: 'mcp/composition',
  },
} as const satisfies SystemManifest;
