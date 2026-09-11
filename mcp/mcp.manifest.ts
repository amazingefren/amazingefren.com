import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  kind: 'system',
  id: 'mcp',
  name: 'AE MCP',
  purpose: 'Expose authorized system capabilities to AI clients.',
  owner: 'amazingefren',
  status: 'declared',
  scope: 'required',
  visibility: 'public',
  context: {
    decisions: [
      'Thin adapter over authorized system operations.',
      'Target remote MCP over Streamable HTTP; verify negotiated protocol support with each client.',
      'Cloudflare MCP v2 article describes MCP specification 2026-07-28; it is not a separate Cloudflare standard.',
      'Claude custom connectors are clients of the same remote MCP service.',
      'Public read tools expose approved content and catalogs; private and write operations require separate authorization.',
      'Consider Code Mode when operation volume warrants it; enforce access per operation.',
      'Read tool and resource bindings from owning manifests; no separate registry.',
    ],
    openQuestions: [
      'Client compatibility matrix, SDK version, OAuth design, and connector testing.',
    ],
  },
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
  schemaVersion: 5,
  contracts: [],
  operations: [],
  events: [],
  capabilityPaths: {
    tools: 'mcp/transport',
    resources: 'mcp/transport',
    'content-discovery': 'mcp/transport',
    'system-discovery': 'mcp/transport',
    'claude-connectors': 'mcp/clients/claude',
  },
  structure: {
    domain: 'mcp/domain',
    operations: 'mcp/operations',
    ports: 'mcp/ports',
    adapters: 'mcp/adapters',
    tests: 'mcp/tests',
    composition: 'mcp/composition',
  },
  entrypoints: [],
} as const satisfies SystemManifest;
