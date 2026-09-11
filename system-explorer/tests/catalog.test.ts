import assert from 'node:assert/strict';
import test from 'node:test';
import { createPublicCatalogSource } from '../domain/catalog/source.ts';
import { createSystemExplorer } from '../operations/index.ts';

test('catalog exposes only the approved public projection and a stable revision', () => {
  const source = createPublicCatalogSource('git:abc123');
  const first = createSystemExplorer({ source });
  const second = createSystemExplorer({ source });
  const listed = first.list({});
  const repeated = second.list({});
  assert.equal(listed.ok, true);
  assert.equal(repeated.ok, true);
  if (!listed.ok || !repeated.ok) return;
  assert.equal(listed.value.catalogRevision, repeated.value.catalogRevision);
  assert.equal(listed.value.provenance.sourceRevision, 'git:abc123');
  assert.ok(listed.value.items.some((entry) => entry.id === 'system-explorer'));
  assert.equal(JSON.stringify(listed.value).includes('ae-workbench'), false);
  assert.equal(
    JSON.stringify(listed.value).includes('permissionsDefined'),
    false,
  );
  assert.ok(
    listed.value.items
      .flatMap((entry) => entry.operations)
      .every((operation) => operation.access === 'public'),
  );
});

test('operations reject unknown input and deny undeclared identifiers', () => {
  const explorer = createSystemExplorer();
  assert.deepEqual(explorer.list({ limit: 101 }), {
    ok: false,
    error: {
      code: 'invalid_input',
      message: 'Limit must be an integer from 1 through 100',
    },
  });
  assert.deepEqual(explorer.read({ id: 'ae-workbench' }), {
    ok: false,
    error: {
      code: 'not_found',
      message: 'System is not approved for public catalog access',
    },
  });
  assert.equal(explorer.read({ id: 'system-explorer', extra: true }).ok, false);
});

test('catalog pagination is complete, stable, and defensively copied', () => {
  const entries = Array.from({ length: 101 }, (_, index) => ({
    id: `system-${String(index).padStart(3, '0')}`,
    name: 'System',
    purpose: 'Public projection',
    status: 'declared' as const,
    implementationVisibility: 'public' as const,
    sourceRevision: `catalog-fnv1a32:${index}`,
    capabilities: [],
    dependencies: [],
    contracts: [],
    operations: [],
  }));
  const explorer = createSystemExplorer({ source: { entries } });
  const first = explorer.list({ limit: 100 });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.value.items.length, 100);
  const second = explorer.list({ cursor: first.value.nextCursor, limit: 100 });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.value.items.length, 1);
  first.value.items[0].name = 'changed by caller';
  const read = explorer.read({ id: 'system-000' });
  assert.equal(read.ok, true);
  if (read.ok) assert.equal(read.value.name, 'System');
});
