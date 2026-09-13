import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function rejectMutation(mutation, message) {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import { systems } from './manifests/registry.ts';
    const bindings = systems.flatMap(system => system.operations.flatMap(operation => operation.bindings));
    ${mutation}
    await import('./scripts/check-manifests.mjs');
  `,
    ],
    { cwd: new URL('../', import.meta.url), encoding: 'utf8' },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, message);
}

test('removed context and question fields cannot return', () => {
  rejectMutation(
    `systems[0].context = { decisions: [], openQuestions: [] };`,
    /Removed manifest field: work.context/,
  );
  rejectMutation(
    `systems[0].openQuestions = ['Pending work'];`,
    /Removed manifest field: work.openQuestions/,
  );
});

test('keyboard declarations require implemented shortcuts', () => {
  rejectMutation(
    `systems[0].keyboard = {
      directory: 'work/ui', testsDirectory: 'work/tests',
      implementation: null, tests: [], status: 'declared',
    };`,
    /Declare keyboard profiles only for implemented shortcuts/,
  );
});

test('constant binding scope cannot return', () => {
  rejectMutation(
    `bindings[0].scope = 'required';`,
    /Removed binding field: .*\.scope/,
  );
});

test('implemented operations require references for each obligation', () => {
  rejectMutation(
    `systems.find(system => system.id === 'api').operations[0].verification[0].tests = [];`,
    /Operation tests missing: api\.openapi\.public-only/,
  );
});

test('HTTP collisions across systems include equivalent parameter names', () => {
  rejectMutation(
    `
    const target = bindings.find(binding => binding.surface.kind === 'http' && binding.surface.path === '/api/articles/{id}');
    const other = bindings.find(binding => binding.surface.kind === 'http' && binding.surface.path.startsWith('/api/studio/'));
    other.surface = { ...target.surface, path: '/api/articles/{articleId}' };
  `,
    /Duplicate binding surface/,
  );
});

test('MCP names collide even with different descriptions', () => {
  rejectMutation(
    `
    const tools = bindings.filter(binding => binding.surface.kind === 'mcp-tool');
    tools.at(-1).surface.name = tools[0].surface.name;
  `,
    /Duplicate binding surface/,
  );
});

test('private operations cannot acquire public feed bindings', () => {
  rejectMutation(
    `
    const operation = systems.find(system => system.id === 'studio').operations[0];
    operation.bindings[0].surface = { kind: 'feed', format: 'rss', path: '/private.xml', fullText: true, itemId: 'id', updatedAt: 'updatedAt' };
  `,
    /Public distribution of protected operation/,
  );
});

test('guest views cannot select owner data', () => {
  rejectMutation(
    `systems.find(s => s.id === 'dashboard').views[1].data = 'owner';`,
    /View data scope mismatch/,
  );
});

test('guest views cannot reuse protected owner operations', () => {
  rejectMutation(
    `systems.find(s => s.id === 'dashboard').views[1].operations = ['dashboard.read-summary'];`,
    /View operation data scope mismatch/,
  );
});

test('guest replicas must fail closed rather than fall back to production', () => {
  rejectMutation(
    `systems.find(s => s.id === 'studio').views[1].fallback = 'owner';`,
    /Guest fallback must fail closed/,
  );
});

test('synthetic operations cannot use authenticated owner transport access', () => {
  rejectMutation(
    `systems.find(s => s.id === 'dashboard').operations[1].access = { kind: 'authenticated', permissions: ['dashboard.read'], ownership: 'caller' };`,
    /View operation access mismatch/,
  );
});

test('a guest replica must reference a declared owner view', () => {
  rejectMutation(
    `systems.find(s => s.id === 'studio').views[1].replicaOf = 'missing';`,
    /Guest replica requires an owner view/,
  );
});

test('view routes cannot collide across systems', () => {
  rejectMutation(
    `systems.find(s => s.id === 'studio').views[1].path = '/guest/dashboard';`,
    /Duplicate view path/,
  );
});

test('view implementations must stay in the declared directory', () => {
  rejectMutation(
    `systems.find(s => s.id === 'dashboard').views[0].implementation = 'web/adapters/http/home.tsx';`,
    /Implementation outside declared directory/,
  );
});

test('view directories must exist', () => {
  rejectMutation(
    `systems.find(s => s.id === 'dashboard').views[0].directory = 'dashboard/ui/missing';`,
    /ENOENT/,
  );
});

test('view obligations contribute to the reported missing-test total', () => {
  const options = { cwd: new URL('../', import.meta.url), encoding: 'utf8' };
  const baseline = spawnSync(
    process.execPath,
    ['scripts/check-manifests.mjs'],
    options,
  );
  const changed = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import { systems } from './manifests/registry.ts';
    systems.find(system => system.id === 'dashboard').views[0].verification.push({
      expectation: 'Additional independent review obligation', tests: [],
    });
    await import('./scripts/check-manifests.mjs');
  `,
    ],
    options,
  );
  assert.equal(baseline.status, 0, baseline.stderr);
  assert.equal(changed.status, 0, changed.stderr);
  for (const pattern of [
    /(\d+) obligations/,
    /Obligations without test references: (\d+)/,
  ]) {
    assert.equal(
      Number(changed.stdout.match(pattern)[1]),
      Number(baseline.stdout.match(pattern)[1]) + 1,
    );
  }
});
