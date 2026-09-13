import assert from 'node:assert/strict';
import test from 'node:test';
import { createGuestWritingPort } from '../../../studio/writing/guest.ts';

test('guest publication transitions reject stale project versions without changing the project', async () => {
  const port = createGuestWritingPort(memoryStorage());
  const created = await port.execute({
    operation: 'publishing.projects.create',
    input: { kind: 'article', title: 'Draft' },
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const project = created.value.publications[0]!;
  const result = await port.execute({
    operation: 'publishing.projects.update',
    input: {
      id: project.id,
      expectedVersion: project.version + 1,
      fields: {
        title: 'Changed',
        slug: 'changed',
        summary: '',
        tags: [],
        seoTitle: '',
        seoDescription: '',
        coverAssetId: null,
      },
    },
  });
  assert.deepEqual(result, {
    ok: false,
    error: {
      code: 'conflict',
      message: 'Publication project version does not match.',
    },
  });
  const reread = await port.execute({
    operation: 'studio.writing.read',
    input: {},
  });
  assert.equal(reread.ok, true);
  if (reread.ok) assert.deepEqual(reread.value.publications[0], project);
});

test('guest publications cannot publish before review', async () => {
  const port = createGuestWritingPort(memoryStorage());
  const created = await port.execute({
    operation: 'publishing.projects.create',
    input: { kind: 'article', title: 'Draft' },
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const project = created.value.publications[0]!;
  const result = await port.execute({
    operation: 'publishing.projects.publish',
    input: { id: project.id, expectedVersion: project.version },
  });
  assert.deepEqual(result, {
    ok: false,
    error: {
      code: 'invalid',
      message: 'Review this publication before publishing.',
    },
  });
  const reread = await port.execute({
    operation: 'studio.writing.read',
    input: {},
  });
  assert.equal(reread.ok, true);
  if (reread.ok) assert.deepEqual(reread.value.publications[0], project);
});

function memoryStorage() {
  let value: string | null = null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    removeItem: () => {
      value = null;
    },
  };
}
