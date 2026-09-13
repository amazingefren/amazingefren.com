import assert from 'node:assert/strict';
import test from 'node:test';
import { createGuestWritingPort } from '../../writing/guest.ts';

const storageKey = 'ae-writing-guest-v1';

test('guest writing rejects corrupt and owner-shaped storage without replacing it', async () => {
  for (const raw of [
    'not-json',
    JSON.stringify({
      schemaVersion: 1,
      synthetic: false,
      version: 0,
      documents: [],
      publications: [],
      assets: [],
    }),
  ]) {
    const saved = memoryStorage();
    saved.values.set(storageKey, raw);
    const result = await createGuestWritingPort(saved).execute({
      operation: 'studio.writing.read',
      input: {},
    });
    assert.deepEqual(result, {
      ok: false,
      error: {
        code: 'unavailable',
        message: 'Guest writing storage is corrupt.',
      },
    });
    assert.equal(saved.values.get(storageKey), raw);
  }
});

test('guest note saves reject stale revisions without changing the stored draft', async () => {
  const saved = memoryStorage();
  const port = createGuestWritingPort(saved);
  const created = await port.execute({
    operation: 'studio.notes.create',
    input: { kind: 'note', title: 'Draft', body: 'Original' },
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const document = created.value.documents[0]!;
  const result = await port.execute({
    operation: 'studio.notes.save',
    input: {
      id: document.id,
      expectedRevision: document.revision + 1,
      title: 'Changed',
      body: 'Should not persist',
      tags: [],
      collection: '',
      pinned: false,
    },
  });
  assert.deepEqual(result, {
    ok: false,
    error: { code: 'conflict', message: 'Document revision does not match.' },
  });
  const reread = await port.execute({
    operation: 'studio.writing.read',
    input: {},
  });
  assert.equal(reread.ok, true);
  if (reread.ok) assert.deepEqual(reread.value.documents[0], document);
});

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  };
}
