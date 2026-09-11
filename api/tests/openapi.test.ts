import assert from 'node:assert/strict';
import test from 'node:test';
import { generateOpenApiDocument } from '../domain/openapi.ts';
import { createOpenApiHttpHandler } from '../adapters/http.ts';
import type { SystemManifest } from '../../manifests/schema/system.schema.ts';

const operation = (
  id: string,
  access: 'public' | 'authenticated',
  status: 'implemented' | 'declared' = 'implemented',
  path = '/api/items/:id',
  dataScope: 'published' | 'synthetic' = 'published',
) => ({
  id,
  dataScope,
  access:
    access === 'public'
      ? { kind: 'public' as const }
      : {
          kind: 'authenticated' as const,
          permissions: ['private.read'],
          ownership: 'caller' as const,
        },
  status,
  input: 'contracts/api/list-input.schema.json',
  output: 'contracts/api/catalog.schema.json',
  errors: 'contracts/api/errors.schema.json',
  directory: 'api',
  testsDirectory: 'api/tests',
  implementation: 'api/index.ts',
  verification: [],
  bindings: [
    {
      id: `${id}.http`,
      scope: 'required' as const,
      status: 'implemented' as const,
      implementation: 'api/index.ts',
      tests: [],
      directory: 'api',
      testsDirectory: 'api/tests',
      surface: { kind: 'http' as const, method: 'GET' as const, path },
    },
  ],
});
const system = (
  id: string,
  visibility: 'public' | 'private',
  operations: readonly ReturnType<typeof operation>[],
): SystemManifest => ({
  kind: 'system',
  id,
  name: id,
  purpose: id,
  owner: 'owner',
  status: 'implemented',
  scope: 'required',
  visibility,
  context: { decisions: [], openQuestions: [] },
  capabilities: [],
  governance: {
    permissionsDefined: [],
    dataClassification: visibility === 'public' ? 'public' : 'private',
  },
  risks: [],
  dependencies: [],
  schemaVersion: 5,
  contracts: [],
  operations,
  events: [],
  capabilityPaths: {},
  structure: {},
  entrypoints: [],
});

test('generates deterministic public OpenAPI paths and path parameters', () => {
  const document = generateOpenApiDocument([
    system('public', 'public', [operation('public.read', 'public')]),
    system('private', 'private', [operation('private.read', 'public')]),
    system('protected', 'public', [
      operation('protected.read', 'authenticated'),
    ]),
  ]);
  assert.deepEqual(Object.keys(document.paths), ['/api/items/{id}']);
  assert.equal(
    document.paths['/api/items/{id}']!.get!.parameters![0]!.name,
    'id',
  );
  assert.equal(
    document.paths['/api/items/{id}']!.get!['x-ae'].access,
    'public',
  );
  assert.equal(document.paths['/api/items/{id}']!.get!.requestBody, undefined);
});

test('fails duplicate route and operation collisions', () => {
  assert.throws(() =>
    generateOpenApiDocument([
      system('a', 'public', [operation('read', 'public')]),
      system('b', 'public', [operation('read', 'public')]),
    ]),
  );
});

test('excludes synthetic public operations', () => {
  const document = generateOpenApiDocument([
    system('public', 'public', [
      operation(
        'synthetic',
        'public',
        'implemented',
        '/api/private',
        'synthetic',
      ),
    ]),
  ]);
  assert.deepEqual(document.paths, {});
});

test('HTTP adapter serves JSON and rejects non-GET', async () => {
  const handler = createOpenApiHttpHandler([
    system('public', 'public', [operation('read', 'public')]),
  ]);
  const response = await handler(
    new Request('https://ae.test/api/openapi.json'),
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).openapi, '3.1.0');
  assert.equal(
    (
      await handler(
        new Request('https://ae.test/api/openapi.json', { method: 'POST' }),
      )
    ).status,
    405,
  );
  assert.equal(
    (await handler(new Request('https://ae.test/wrong'))).status,
    404,
  );
});

test('rejects equivalent path templates and omits GET bodies for TypeScript contracts', () => {
  assert.throws(() =>
    generateOpenApiDocument([
      system('one', 'public', [
        operation('one', 'public', 'implemented', '/items/:id'),
        operation('two', 'public', 'implemented', '/items/:name'),
      ]),
    ]),
  );
  const item = {
    ...operation('read', 'public'),
    input: 'api/contracts/openapi.ts',
  };
  const generated = generateOpenApiDocument([
    system('public', 'public', [item]),
  ]);
  assert.equal(generated.paths['/api/items/{id}'].get.requestBody, undefined);
});
