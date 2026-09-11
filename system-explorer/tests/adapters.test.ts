import assert from 'node:assert/strict';
import test from 'node:test';
import { executeSystemExplorerCli } from '../adapters/cli/index.ts';
import { createOfflineBundle } from '../adapters/exports/offline-bundle/index.ts';
import { createSystemExplorerHttpHandler } from '../adapters/http/index.ts';
import { createSystemExplorerMcp } from '../adapters/mcp/index.ts';
import { createSystemExplorer } from '../operations/index.ts';

test('HTTP, CLI, MCP, and offline bindings share the same approved revision', async () => {
  const port = createSystemExplorer({ sourceRevision: 'git:test' });
  const http = createSystemExplorerHttpHandler(port);
  const response = await http(new Request('https://ae.test/api/systems'));
  const httpValue = (await response.json()) as { catalogRevision: string };
  const cli = executeSystemExplorerCli(port, ['list']);
  const mcp = createSystemExplorerMcp(port).list_systems();
  assert.equal(response.status, 200);
  assert.equal(cli.ok, true);
  assert.equal(mcp.ok, true);
  if (!cli.ok || !mcp.ok || !('items' in cli.value)) return;
  assert.equal(httpValue.catalogRevision, cli.value.catalogRevision);
  assert.equal(httpValue.catalogRevision, mcp.value.catalogRevision);
  const bundle = createOfflineBundle(cli.value);
  assert.deepEqual([...bundle.slice(0, 4)], [80, 75, 3, 4]);
  const resource = createSystemExplorerMcp(port).readResource(
    'ae://systems/system-explorer',
  );
  assert.equal(resource.ok, true);
  assert.equal(
    createSystemExplorerMcp(port).readResource('ae://systems/%').ok,
    false,
  );
});

test('HTTP export routes and malformed requests return defined responses', async () => {
  const handler = createSystemExplorerHttpHandler(createSystemExplorer());
  const exportJson = await handler(
    new Request('https://ae.test/exports/systems/index.json'),
  );
  const zip = await handler(new Request('https://ae.test/exports/systems.zip'));
  const invalid = await handler(
    new Request('https://ae.test/api/systems?limit=cat'),
  );
  const repeated = await handler(
    new Request('https://ae.test/api/systems?limit=1&limit=2'),
  );
  const unknown = await handler(
    new Request('https://ae.test/api/systems?private=true'),
  );
  const method = await handler(
    new Request('https://ae.test/api/systems', { method: 'POST' }),
  );
  assert.equal(exportJson.status, 200);
  assert.equal(exportJson.headers.get('cache-control'), 'no-store');
  assert.equal(zip.headers.get('content-type'), 'application/zip');
  assert.equal(invalid.status, 400);
  assert.equal(repeated.status, 400);
  assert.equal(unknown.status, 400);
  assert.equal(method.status, 405);
});

test('offline exports exhaust pages and stop a cursor cycle', async () => {
  const entries = Array.from({ length: 101 }, (_, index) => ({
    id: `system-${String(index).padStart(3, '0')}`,
    name: 'System',
    purpose: 'Public',
    status: 'declared' as const,
    implementationVisibility: 'public' as const,
    sourceRevision: `catalog-fnv1a32:${index}`,
    capabilities: [],
    dependencies: [],
    contracts: [],
    operations: [],
  }));
  const complete = createSystemExplorerHttpHandler(
    createSystemExplorer({ source: { entries } }),
  );
  const json = await complete(
    new Request('https://ae.test/exports/systems/index.json'),
  );
  assert.equal(((await json.json()) as { items: unknown[] }).items.length, 101);
  let calls = 0;
  const cycle = createSystemExplorerHttpHandler({
    list: () => ({
      ok: true as const,
      value: {
        catalogRevision: 'same',
        provenance: {
          scheme: 'catalog-fnv1a32' as const,
          sourceRevision: null,
        },
        items: [],
        nextCursor: ['a', 'b', 'a'][calls++] ?? null,
      },
    }),
    read: () => ({
      ok: false as const,
      error: { code: 'not_found' as const, message: 'missing' },
    }),
  });
  const unavailable = await cycle(
    new Request('https://ae.test/exports/systems/index.json'),
  );
  assert.equal(unavailable.status, 503);
});
