import assert from 'node:assert/strict';
import test from 'node:test';
import { createOwnerWorkspacePort } from '../../adapters/owner-server.ts';
import { createSyntheticWorkspaceState } from '../../domain/index.ts';

test('owner adapter denies before private storage reads', async () => {
  let reads = 0;
  const port = createOwnerWorkspacePort({
    now: () => 0,
    nextId: () => 'id-1',
    identity: { resolve: async () => null },
    authorization: {
      authorize: async () => ({ allowed: true, ownerId: 'owner-1' }),
    },
    storage: {
      read: async () => {
        reads += 1;
        return null;
      },
      write: async () => ({ ok: true }),
    },
  });
  const result = await port.execute({ operation: 'workspace.read', input: {} });
  assert.deepEqual(result, {
    ok: false,
    error: { code: 'denied', message: 'An authenticated owner is required' },
  });
  assert.equal(reads, 0);
});

test('owner adapter denies the guest reset command without reading storage', async () => {
  let reads = 0;
  const port = createOwnerWorkspacePort({
    now: () => 0,
    nextId: () => 'id-1',
    identity: {
      resolve: async () => ({
        kind: 'owner',
        subjectId: 'owner-1',
        ownerId: 'owner-1',
      }),
    },
    authorization: {
      authorize: async () => ({ allowed: true, ownerId: 'owner-1' }),
    },
    storage: {
      read: async () => {
        reads += 1;
        return null;
      },
      write: async () => ({ ok: true }),
    },
  });
  const result = await port.execute({
    operation: 'workspace.reset',
    input: {},
  });
  assert.deepEqual(result, {
    ok: false,
    error: {
      code: 'denied',
      message: 'Workspace reset is available only to guest sessions',
    },
  });
  assert.equal(reads, 0);
});

test('owner adapter fails closed for synthetic private storage', async () => {
  const seeded = createSyntheticWorkspaceState({
    now: () => 0,
    nextId: (() => {
      let id = 0;
      return () => `id-${++id}`;
    })(),
  });
  assert.equal(seeded.ok, true);
  if (!seeded.ok) return;
  let writes = 0;
  const port = createOwnerWorkspacePort({
    now: () => 0,
    nextId: () => 'id-99',
    identity: {
      resolve: async () => ({
        kind: 'owner',
        subjectId: 'owner-1',
        ownerId: 'owner-1',
      }),
    },
    authorization: {
      authorize: async () => ({ allowed: true, ownerId: 'owner-1' }),
    },
    storage: {
      read: async () => seeded.value,
      write: async () => {
        writes += 1;
        return { ok: true };
      },
    },
  });
  const result = await port.execute({ operation: 'workspace.read', input: {} });
  assert.deepEqual(result, {
    ok: false,
    error: {
      code: 'unavailable',
      message: 'Owner workspace storage is invalid',
    },
  });
  assert.equal(writes, 0);
});

test('owner adapter authorizes before reading and uses compare version writes', async () => {
  const seeded = createSyntheticWorkspaceState({
    now: () => 0,
    nextId: (() => {
      let id = 0;
      return () => `id-${++id}`;
    })(),
  });
  assert.equal(seeded.ok, true);
  if (!seeded.ok) return;
  const ownerState = { ...seeded.value, synthetic: false };
  let reads = 0;
  let expectedVersion = 0;
  const port = createOwnerWorkspacePort({
    now: () => 0,
    nextId: (() => {
      let id = 10;
      return () => `id-${++id}`;
    })(),
    identity: {
      resolve: async () => ({
        kind: 'owner',
        subjectId: 'owner-1',
        ownerId: 'owner-1',
      }),
    },
    authorization: {
      authorize: async ({ ownerId }) => ({ allowed: true, ownerId }),
    },
    storage: {
      read: async () => {
        reads += 1;
        return ownerState;
      },
      write: async (request) => {
        expectedVersion = request.expectedVersion;
        return { ok: true };
      },
    },
  });
  const result = await port.execute({
    operation: 'workspace.create-task',
    input: { title: 'Owner task' },
  });
  assert.equal(result.ok, true);
  assert.equal(reads, 1);
  assert.equal(expectedVersion, 1);
});
