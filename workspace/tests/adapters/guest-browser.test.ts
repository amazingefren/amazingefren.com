import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGuestPort,
  GUEST_WORKSPACE_STORAGE_KEY,
} from '../../adapters/guest-browser.ts';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    values,
  };
}

function deps() {
  let id = 0;
  return {
    now: () => Date.parse('2026-09-09T12:00:00.000Z'),
    nextId: () => `guest-${++id}`,
  };
}

test('guest browser state survives refresh and stays isolated by session storage', async () => {
  const first = storage();
  const second = storage();
  const port = createBrowserGuestPort(first, deps());
  const before = await port.execute({ operation: 'workspace.read', input: {} });
  assert.equal(before.ok, true);
  if (!before.ok) return;
  const created = await port.execute({
    operation: 'workspace.create-document',
    input: { title: 'Only first tab' },
  });
  assert.equal(created.ok, true);
  const refreshed = createBrowserGuestPort(first, deps());
  const persisted = await refreshed.execute({
    operation: 'workspace.read',
    input: {},
  });
  assert.equal(persisted.ok, true);
  if (persisted.ok)
    assert.equal(
      persisted.value.documents.some((item) => item.title === 'Only first tab'),
      true,
    );
  const other = await createBrowserGuestPort(second, deps()).execute({
    operation: 'workspace.read',
    input: {},
  });
  assert.equal(other.ok, true);
  if (other.ok)
    assert.equal(
      other.value.documents.some((item) => item.title === 'Only first tab'),
      false,
    );
});

test('a refreshed default guest adapter creates records without reusing prior identifiers', async () => {
  const tab = storage();
  const first = createBrowserGuestPort(tab);
  const created = await first.execute({
    operation: 'workspace.create-document',
    input: { title: 'Before refresh' },
  });
  assert.equal(created.ok, true);
  const refreshed = createBrowserGuestPort(tab);
  const afterRefresh = await refreshed.execute({
    operation: 'workspace.create-document',
    input: { title: 'After refresh' },
  });
  assert.equal(afterRefresh.ok, true);
  if (afterRefresh.ok)
    assert.equal(
      afterRefresh.value.documents.some(
        (item) => item.title === 'After refresh',
      ),
      true,
    );
});

test('guest browser corruption fails closed and reset only repairs its current tab', async () => {
  const first = storage();
  const second = storage();
  first.values.set(GUEST_WORKSPACE_STORAGE_KEY, 'not-json');
  await createBrowserGuestPort(second, deps()).execute({
    operation: 'workspace.read',
    input: {},
  });
  const port = createBrowserGuestPort(first, deps());
  const blocked = await port.execute({
    operation: 'workspace.read',
    input: {},
  });
  assert.deepEqual(blocked, {
    ok: false,
    error: {
      code: 'unavailable',
      message: 'Guest workspace storage is unavailable',
    },
  });
  const reset = await port.execute({ operation: 'workspace.reset', input: {} });
  assert.equal(reset.ok, true);
  assert.equal(first.values.has(GUEST_WORKSPACE_STORAGE_KEY), true);
  assert.equal(second.values.has(GUEST_WORKSPACE_STORAGE_KEY), true);
});
