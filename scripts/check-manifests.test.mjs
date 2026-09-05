import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function rejectMutation(mutation, message) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { systems } from './manifests/registry.ts';
    const bindings = systems.flatMap(system => system.operations.flatMap(operation => operation.bindings));
    ${mutation}
    await import('./scripts/check-manifests.mjs');
  `], { cwd: new URL('../', import.meta.url), encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, message);
}

test('HTTP collisions across systems include equivalent parameter names', () => {
  rejectMutation(`
    const target = bindings.find(binding => binding.surface.kind === 'http' && binding.surface.path === '/api/articles/{id}');
    const other = bindings.find(binding => binding.surface.kind === 'http' && binding.surface.path.startsWith('/api/studio/'));
    other.surface = { ...target.surface, path: '/api/articles/{articleId}' };
  `, /Duplicate binding surface/);
});

test('MCP names collide even with different descriptions', () => {
  rejectMutation(`
    const tools = bindings.filter(binding => binding.surface.kind === 'mcp-tool');
    tools.at(-1).surface.name = tools[0].surface.name;
  `, /Duplicate binding surface/);
});

test('private operations cannot acquire public feed bindings', () => {
  rejectMutation(`
    const operation = systems.find(system => system.id === 'studio').operations[0];
    operation.bindings[0].surface = { kind: 'feed', format: 'rss', path: '/private.xml', fullText: true, itemId: 'id', updatedAt: 'updatedAt' };
  `, /Public distribution of protected operation/);
});
