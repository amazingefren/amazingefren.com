import test from 'node:test';
import assert from 'node:assert/strict';
import type { Snapshot } from '../../../contracts/writing/index.ts';
import {
  filterReadings,
  readingStats,
} from '../../ui/readings/reading-utils.ts';

function snapshot(overrides: Partial<Snapshot>): Snapshot {
  return {
    id: 'reading',
    publishedAt: '2026-09-01T00:00:00.000Z',
    title: 'A reading',
    slug: 'a-reading',
    summary: 'A summary',
    kind: 'article',
    seoTitle: '',
    seoDescription: '',
    tags: [],
    coverAssetId: null,
    chapters: [
      {
        documentId: 'chapter',
        revision: 2,
        title: 'Start',
        body: 'one two three',
      },
    ],
    assets: [],
    projectVersion: 3,
    ...overrides,
  };
}

test('filterReadings searches title, summary, and tags and sorts newest first', () => {
  const old = snapshot({
    id: 'old',
    title: 'Older',
    publishedAt: '2026-01-01T00:00:00.000Z',
    tags: ['systems'],
  });
  const fresh = snapshot({
    id: 'fresh',
    title: 'Fresh systems note',
    publishedAt: '2026-09-01T00:00:00.000Z',
    tags: ['research'],
  });
  assert.deepEqual(
    filterReadings([old, fresh], 'SYSTEMS').map((item) => item.id),
    ['fresh', 'old'],
  );
  assert.deepEqual(
    filterReadings([old, fresh], '', 'research').map((item) => item.id),
    ['fresh'],
  );
});

test('readingStats counts markdown words and rounds reading time up to one minute', () => {
  const item = snapshot({
    chapters: [
      {
        documentId: 'chapter',
        revision: 1,
        title: 'Start',
        body: '# One\n\nalpha [beta gamma](https://example.com) ![image](asset:x)',
      },
    ],
  });
  assert.deepEqual(readingStats(item), { words: 4, minutes: 1 });
});
