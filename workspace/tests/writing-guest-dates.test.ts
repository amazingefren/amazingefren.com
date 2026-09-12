import assert from 'node:assert/strict';
import test from 'node:test';
import { createGuestWritingPort } from '../../studio/writing/guest.ts';

test('guest releases retain their first publication instant, timezone, and slug', async () => {
  const port = createGuestWritingPort(memoryStorage());
  let state = await execute(port, {
    operation: 'publishing.projects.create',
    input: { kind: 'article', title: 'Stable address' },
  });
  const publication = state.publications[0];
  state = await execute(port, {
    operation: 'publishing.projects.update',
    input: {
      id: publication.id,
      expectedVersion: publication.version,
      fields: {
        title: publication.title,
        slug: 'stable-address',
        summary: '',
        tags: [],
        seoTitle: '',
        seoDescription: '',
        coverAssetId: null,
      },
    },
  });
  state = await execute(port, {
    operation: 'publishing.projects.review',
    input: {
      id: publication.id,
      expectedVersion: state.publications[0].version,
    },
  });
  state = await execute(port, {
    operation: 'publishing.projects.publish',
    input: {
      id: publication.id,
      expectedVersion: state.publications[0].version,
      publicationAt: '2025-01-10T16:00:00Z',
      timezone: 'America/Denver',
    },
  });
  const first = state.publications[0].live!;
  state = await execute(port, {
    operation: 'publishing.projects.withdraw',
    input: {
      id: publication.id,
      expectedVersion: state.publications[0].version,
    },
  });
  const renamed = await port.execute({
    operation: 'publishing.projects.update',
    input: {
      id: publication.id,
      expectedVersion: state.publications[0].version,
      fields: { ...fields(state.publications[0]), slug: 'renamed' },
    },
  });
  assert.equal(renamed.ok ? null : renamed.error.code, 'invalid');
  state = await execute(port, {
    operation: 'publishing.projects.review',
    input: {
      id: publication.id,
      expectedVersion: state.publications[0].version,
    },
  });
  state = await execute(port, {
    operation: 'publishing.projects.publish',
    input: {
      id: publication.id,
      expectedVersion: state.publications[0].version,
      publicationAt: '2025-02-10T16:00:00Z',
      timezone: 'UTC',
    },
  });
  const second = state.publications[0].live!;
  assert.equal(second.publishedAt, first.publishedAt);
  assert.equal(second.timezone, 'America/Denver');
  assert.equal(second.updatedAt, '2025-02-10T16:00:00.000Z');
});

async function execute(
  port: ReturnType<typeof createGuestWritingPort>,
  command: Parameters<typeof port.execute>[0],
) {
  const result = await port.execute(command);
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw new Error('Guest operation failed');
  return result.value;
}

function fields(
  project: (Awaited<
    ReturnType<ReturnType<typeof createGuestWritingPort>['read']>
  > extends { ok: true; value: infer T }
    ? T
    : never)['publications'][number],
) {
  return {
    title: project.title,
    slug: project.slug,
    summary: project.summary,
    tags: project.tags,
    seoTitle: project.seoTitle,
    seoDescription: project.seoDescription,
    coverAssetId: project.coverAssetId,
  };
}

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
