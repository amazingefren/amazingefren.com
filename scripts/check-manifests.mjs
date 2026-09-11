import { checkDesign } from '../design/tests/check.ts';
import assert from 'node:assert/strict';
import { access, stat } from 'node:fs/promises';
import platform from '../ae.manifest.ts';
import { systems, conventions, catalog } from '../manifests/registry.ts';
import { checkRisks } from '../manifests/risks/check.mjs';

const root = new URL('../', import.meta.url);
const ids = new Set(systems.map((system) => system.id));
const operationIds = new Set();
const surfaces = new Set();
const bindingIds = new Set();
let obligationCount = 0;
let missingTests = 0;
const riskIds = new Set();
const viewPaths = new Set();

async function checkPath(path) {
  const url = new URL(path, root);
  assert(
    url.href.startsWith(root.href),
    `Reference outside repository: ${path}`,
  );
  await access(url);
}

async function checkDirectory(path, owner) {
  assert(
    typeof path === 'string' && path.length > 0,
    'Missing declared directory',
  );
  const url = new URL(path, root);
  assert(
    url.href.startsWith(root.href),
    `Directory outside repository: ${path}`,
  );
  if (owner) {
    const base = new URL(`${owner}/`, root).href;
    assert(
      url.href === base.slice(0, -1) || url.href.startsWith(base),
      `Directory outside owning system: ${path}`,
    );
  }
  assert((await stat(url)).isDirectory(), `Expected directory: ${path}`);
}

async function checkImplementationLocation(item) {
  if (item.implementation) {
    const directory = new URL(`${item.directory}/`, root).href;
    const implementation = new URL(item.implementation, root);
    assert(
      implementation.href.startsWith(directory),
      `Implementation outside declared directory: ${item.implementation}`,
    );
    assert(
      (await stat(implementation)).isFile(),
      `Expected implementation file: ${item.implementation}`,
    );
  }
  for (const test of item.tests ?? []) {
    assert(
      new URL(test, root).href.startsWith(
        new URL(`${item.testsDirectory}/`, root).href,
      ),
      `Test outside declared directory: ${test}`,
    );
  }
}

for (const path of [
  ...Object.values(platform.structure),
  ...Object.values(platform.contracts),
  ...Object.values(platform.access.channels),
]) {
  await checkDirectory(path);
}

assert.equal(ids.size, systems.length, 'Duplicate system ID');
assert.equal(
  new Set(catalog.map((item) => item.id)).size,
  catalog.length,
  'Duplicate manifest ID',
);
for (const convention of conventions) {
  assert.equal(convention.kind, 'convention');
  assert.equal(convention.schemaVersion, 1);
  assert(['experimental', 'implemented'].includes(convention.status));
  assert(Number.isInteger(convention.version) && convention.version >= 0);
  assert(convention.purpose.trim() && convention.owner.trim());
  assert(
    Object.keys(convention.syntax).length &&
      Object.keys(convention.records).length,
  );
  assert(convention.rules.length && convention.examples.length);
  for (const value of [
    ...Object.values(convention.syntax).flat(),
    ...Object.values(convention.records),
    ...convention.rules,
    ...convention.examples,
  ])
    assert(typeof value === 'string' && value.trim());
  for (const path of [...convention.implementations, ...convention.tests])
    await checkPath(path);
  if (convention.status === 'implemented')
    assert(convention.implementations.length && convention.tests.length);
}
for (const path of [
  platform.systems,
  platform.rules,
  platform.privacy,
  platform.evidence,
]) {
  await checkPath(path);
}

await checkRisks(platform.risks, platform.id, riskIds, checkPath);
for (const system of systems) {
  await checkRisks(system.risks, system.id, riskIds, checkPath);
  assert.equal(system.kind, 'system');
  assert.equal(system.schemaVersion, 5);
  assert.equal(system.visibility, 'public');
  assert(['declared', 'prototype', 'implemented'].includes(system.status));
  for (const page of system.pages ?? []) {
    await checkPath(page.entrypoint);
    assert.equal(
      page.access.kind,
      'public',
      'Private page authorization is not implemented',
    );
  }
  for (const file of system.staticFiles ?? []) {
    await checkPath(file.source);
    const metadata = await stat(new URL(file.source, root));
    assert(metadata.isFile(), `Expected static file: ${file.source}`);
    if (file.status === 'placeholder')
      assert.equal(metadata.size, 0, `Placeholder has content: ${file.source}`);
  }
  for (const dependency of system.dependencies)
    assert(ids.has(dependency), `Unknown dependency: ${dependency}`);
  const views = system.views ?? [];
  assert.equal(
    new Set(views.map((view) => view.id)).size,
    views.length,
    `Duplicate view ID: ${system.id}`,
  );
  for (const view of views) {
    assert(typeof view.id === 'string' && view.id.trim(), 'Missing view ID');
    await checkDirectory(view.directory, system.id);
    await checkDirectory(view.testsDirectory, system.id);
    await checkImplementationLocation({
      ...view,
      tests: view.verification.flatMap((item) => item.tests),
    });
    assert(
      ['owner', 'public', 'guest'].includes(view.audience),
      `Unknown view audience: ${view.id}`,
    );
    assert(
      ['declared', 'implemented'].includes(view.status),
      `Unknown view status: ${view.id}`,
    );
    assert(
      typeof view.path === 'string' && view.path.startsWith('/'),
      `Invalid view path: ${view.id}`,
    );
    assert(!viewPaths.has(view.path), `Duplicate view path: ${view.path}`);
    viewPaths.add(view.path);
    assert.equal(
      new Set(view.operations).size,
      view.operations.length,
      `Duplicate view operation: ${view.id}`,
    );
    if (view.audience === 'owner') {
      assert.equal(view.data, 'owner', 'Owner view requires owner data');
      assert.equal(
        view.access.kind,
        'authenticated',
        'Owner view must authenticate',
      );
      assert.equal(
        view.access.ownership,
        'caller',
        'Owner view must enforce ownership',
      );
      assert(
        view.access.permissions.length > 0,
        'Owner view requires permission',
      );
      for (const permission of view.access.permissions)
        assert(
          systems.some((item) =>
            item.governance.permissionsDefined.includes(permission),
          ),
          `Unknown view permission: ${permission}`,
        );
    } else {
      assert.equal(
        view.access.kind,
        'public',
        'Public and guest views must use public entry access',
      );
      assert.equal(
        view.data,
        view.audience === 'guest' ? 'synthetic' : 'published',
        'View data scope mismatch',
      );
    }
    if (view.audience === 'guest') {
      assert(
        views.some(
          (other) => other.id === view.replicaOf && other.audience === 'owner',
        ),
        'Guest replica requires an owner view',
      );
      assert.equal(
        view.isolation,
        'session',
        'Guest data must be session-isolated',
      );
      assert.equal(
        view.sideEffects,
        'sandbox-only',
        'Guest side effects must be sandbox-only',
      );
      assert.equal(
        view.productionAccess,
        'denied',
        'Guest production access must be denied',
      );
      assert.equal(
        view.fallback,
        'fail-closed',
        'Guest fallback must fail closed',
      );
    }
    for (const id of view.operations) {
      const operation = system.operations.find((item) => item.id === id);
      assert(operation, `Unknown view operation: ${id}`);
      assert.equal(
        operation.dataScope,
        view.data,
        `View operation data scope mismatch: ${id}`,
      );
      assert.equal(
        operation.access.kind,
        view.access.kind,
        `View operation access mismatch: ${id}`,
      );
    }
    assert(
      view.verification.length > 0,
      `View obligations missing: ${view.id}`,
    );
    for (const obligation of view.verification) {
      assert(
        obligation.expectation.trim(),
        `Empty view obligation: ${view.id}`,
      );
      obligationCount += 1;
      if (obligation.tests.length === 0) missingTests += 1;
      for (const path of obligation.tests) await checkPath(path);
      if (view.status === 'implemented')
        assert(obligation.tests.length > 0, `View tests missing: ${view.id}`);
    }
    if (view.status === 'implemented') {
      assert(view.implementation, `View implementation missing: ${view.id}`);
      assert(
        view.operations.length > 0,
        `Implemented view has no operations: ${view.id}`,
      );
      for (const id of view.operations)
        assert.equal(
          system.operations.find((item) => item.id === id).status,
          'implemented',
          `View operation unfinished: ${id}`,
        );
    }
  }
  for (const path of [...system.entrypoints, ...system.contracts])
    await checkPath(path);
  assert.deepEqual(
    Object.keys(system.capabilityPaths).sort(),
    [...system.capabilities].sort(),
    `Capability paths mismatch: ${system.id}`,
  );
  for (const path of [
    ...Object.values(system.structure),
    ...Object.values(system.capabilityPaths),
  ])
    await checkDirectory(path, system.id);
  for (const item of [
    ...system.operations,
    ...system.operations.flatMap((operation) => operation.bindings),
    ...(system.keyboard ? [system.keyboard] : []),
  ]) {
    await checkDirectory(item.directory, system.id);
    await checkDirectory(item.testsDirectory, system.id);
    await checkImplementationLocation(item);
  }
  assert.equal(system.scope, 'required');
  for (const operation of system.operations) {
    if (operation.dataScope !== undefined)
      assert(
        ['owner', 'published', 'synthetic'].includes(operation.dataScope),
        `Invalid operation data scope: ${operation.id}`,
      );
    if (operation.dataScope === 'owner') {
      assert.equal(
        operation.access.kind,
        'authenticated',
        'Owner operation must authenticate',
      );
      assert.equal(
        operation.access.ownership,
        'caller',
        'Owner operation must enforce ownership',
      );
    }
    assert(
      !operationIds.has(operation.id),
      `Duplicate operation: ${operation.id}`,
    );
    operationIds.add(operation.id);
    assert(['public', 'authenticated'].includes(operation.access.kind));
    if (operation.access.kind === 'authenticated') {
      assert(Array.isArray(operation.access.permissions));
      const knownPermissions = new Set(
        systems.flatMap((item) => item.governance.permissionsDefined),
      );
      for (const permission of operation.access.permissions)
        assert(
          knownPermissions.has(permission),
          `Unknown permission: ${permission}`,
        );
    }
    for (const path of [operation.input, operation.output, operation.errors])
      await checkPath(path);
    if (operation.implementation) await checkPath(operation.implementation);
    if (operation.status === 'implemented') {
      assert(
        operation.implementation,
        `Missing implementation: ${operation.id}`,
      );
      assert(
        operation.verification.length > 0,
        `Missing obligations: ${operation.id}`,
      );
    }
    const obligationIds = new Set();
    for (const obligation of operation.verification) {
      assert(
        !obligationIds.has(obligation.id),
        `Duplicate obligation: ${obligation.id}`,
      );
      obligationIds.add(obligation.id);
      assert(
        ['contract', 'access', 'behavior', 'failure', 'integration'].includes(
          obligation.category,
        ),
      );
      assert(obligation.expectation.trim());
      obligationCount += 1;
      if (obligation.tests.length === 0) missingTests += 1;
      for (const path of obligation.tests) await checkPath(path);
    }
  }
  for (const operation of system.operations)
    for (const binding of operation.bindings) {
      assert(
        !bindingIds.has(binding.id),
        `Duplicate binding ID: ${binding.id}`,
      );
      bindingIds.add(binding.id);
      assert.equal(binding.scope, 'required');
      assert(['declared', 'implemented'].includes(binding.status));
      const surface = binding.surface;
      assert(
        [
          'http',
          'mcp-tool',
          'mcp-resource',
          'feed',
          'export',
          'cli',
          'mirror',
        ].includes(surface.kind),
      );
      const route = surface.path?.replace(/\{[^}]+\}/g, '{}');
      const signature = ['http', 'feed', 'export'].includes(surface.kind)
        ? `http:${surface.method ?? 'GET'}:${route}`
        : `${surface.kind}:${surface.name ?? surface.uriTemplate ?? surface.command ?? `${operation.id}:${surface.network}`}`;
      assert(
        !surfaces.has(signature),
        `Duplicate binding surface: ${binding.id}`,
      );
      surfaces.add(signature);
      if (['feed', 'export', 'mirror'].includes(surface.kind)) {
        assert.equal(
          operation.access.kind,
          'public',
          `Public distribution of protected operation: ${binding.id}`,
        );
      }
      if (binding.implementation) await checkPath(binding.implementation);
      for (const test of binding.tests) await checkPath(test);
      if (operation.status === 'implemented')
        assert.equal(
          binding.status,
          'implemented',
          `Required binding unfinished: ${binding.id}`,
        );
      if (binding.status === 'implemented') {
        assert.equal(operation.status, 'implemented');
        assert(
          binding.implementation && binding.tests.length > 0,
          `Binding verification missing: ${binding.id}`,
        );
      }
    }
  if (system.keyboard) {
    const keyboard = system.keyboard;
    assert.equal(keyboard.preset, 'vim');
    assert.equal(keyboard.scope, 'required');
    assert(keyboard.remappable && keyboard.disableSingleCharacterShortcuts);
    assert(
      keyboard.preserveBrowserShortcuts &&
        keyboard.ignoreEditableTargetsOutsideEditor,
    );
    const keys = new Set();
    for (const binding of keyboard.bindings) {
      assert(keyboard.modes.includes(binding.mode));
      const key = `${binding.mode}:${binding.keys}`;
      assert(!keys.has(key), `Duplicate keybinding: ${system.id}:${key}`);
      keys.add(key);
    }
    if (keyboard.implementation) await checkPath(keyboard.implementation);
    for (const test of keyboard.tests) await checkPath(test);
    if (keyboard.status === 'implemented')
      assert(keyboard.implementation && keyboard.tests.length > 0);
    if (system.status === 'implemented')
      assert.equal(keyboard.status, 'implemented');
  }
  for (const event of system.events) await checkPath(event.contract);
}

const bindingCount = systems.reduce(
  (total, system) =>
    total +
    system.operations.reduce(
      (count, operation) => count + operation.bindings.length,
      0,
    ),
  0,
);
console.log(
  `Risk declarations checked: ${riskIds.size}. Scores are qualitative; controls are not verified by this check.`,
);
console.log(
  `Required bindings: ${bindingCount}. Vim profiles: ${systems.filter((system) => system.keyboard).length}.`,
);
console.log(
  `References checked: ${systems.length} systems, ${operationIds.size} operations, ${obligationCount} obligations.`,
);
console.log(
  `Obligations without test references: ${missingTests}. Tests and benchmarks were not executed.`,
);

console.log(
  `Design drift checked: ${await checkDesign(root, systems)} UI files.`,
);
