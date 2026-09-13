import type { SystemManifest } from '../manifests/schema/system.schema.ts';

export default {
  kind: 'system',
  id: 'api',
  name: 'AE API',
  purpose: 'Compose HTTP interfaces over system operations.',
  owner: 'amazingefren',
  status: 'implemented',
  visibility: 'public',
  decisions: [
    'Public OpenAPI discovery derives implemented public HTTP bindings from the registry and excludes protected and synthetic operations.',
    'Generic schemas preserve referenced contract provenance; they do not infer payload validation from TypeScript source paths.',
  ],
  capabilities: ['http-interface'],
  governance: {
    permissionsDefined: [],
    dataClassification: 'mixed',
  },
  risks: [],
  dependencies: ['auth', 'publishing', 'system-explorer', 'studio'],
  schemaVersion: 6,
  contracts: ['api/contracts/openapi.ts'],
  operations: [
    {
      id: 'api.openapi',
      access: { kind: 'public' },
      dataScope: 'published',
      bindings: [
        {
          id: 'api.openapi.http',
          status: 'implemented',
          directory: 'api/adapters',
          testsDirectory: 'api/tests',
          implementation: 'api/adapters/http.ts',
          tests: ['api/tests/openapi.test.ts'],
          surface: { kind: 'http', method: 'GET', path: '/api/openapi.json' },
        },
      ],
      status: 'implemented',
      input: 'api/contracts/openapi.ts',
      output: 'api/contracts/openapi.ts',
      errors: 'api/contracts/openapi.ts',
      directory: 'api/domain',
      testsDirectory: 'api/tests',
      implementation: 'api/domain/openapi.ts',
      verification: [
        {
          id: 'api.openapi.public-only',
          category: 'access',
          expectation: 'Only implemented public HTTP bindings appear.',
          tests: ['api/tests/openapi.test.ts'],
        },
        {
          id: 'api.openapi.contract',
          category: 'contract',
          expectation: 'The response is a deterministic OpenAPI 3.1 document.',
          tests: ['api/tests/openapi.test.ts'],
        },
        {
          id: 'api.openapi.failure',
          category: 'failure',
          expectation: 'Wrong methods and paths return typed HTTP failures.',
          tests: ['api/tests/openapi.test.ts'],
        },
      ],
    },
  ],
  capabilityPaths: {
    'http-interface': 'api/adapters',
  },
  structure: {
    domain: 'api/domain',
    operations: 'api/operations',
    ports: 'api/ports',
    adapters: 'api/adapters',
    tests: 'api/tests',
    composition: 'api/composition',
  },
  entrypoints: ['api/domain/openapi.ts', 'api/adapters/http.ts'],
} as const satisfies SystemManifest;
