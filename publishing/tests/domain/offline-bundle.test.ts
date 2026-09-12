import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createOfflineBundle,
  type ActivePublicationPort,
  type PublicationAssetPort,
} from '../../domain/offline-bundle/index.ts';
import { createSubscriptionOpml } from '../../domain/subscriptions/index.ts';
import type { Snapshot } from '../../../contracts/writing/index.ts';

const snapshot: Snapshot = {
  id: 'release_1',
  publishedAt: '2026-09-10T15:00:00.000Z',
  title: 'A public release',
  slug: 'a-public-release',
  summary: 'A tested public release.',
  kind: 'article',
  seoTitle: 'A public release',
  seoDescription: 'A tested public release.',
  tags: ['public'],
  coverAssetId: 'image_1',
  chapters: [
    {
      documentId: 'document_1',
      revision: 2,
      title: 'Public chapter',
      body: 'Full public text with asset:image_1.',
    },
  ],
  assets: [
    {
      id: 'image_1',
      name: 'private-name.png',
      mime: 'image/png',
      dataUrl: '/api/publications/assets/release_1/image_1',
      alt: 'A public image',
      caption: 'Approved caption',
      rights: 'Approved rights',
    },
  ],
  projectVersion: 4,
};

const active = (value: Snapshot[]): ActivePublicationPort => ({
  async list() {
    return { ok: true, value };
  },
});
const assets: PublicationAssetPort = {
  async read() {
    return {
      ok: true,
      value: { body: new Uint8Array([137, 80, 78, 71]), mime: 'image/png' },
    };
  },
};

test('offline Markdown retains Mermaid source without browser controls', async () => {
  const source = '```mermaid\nflowchart LR\n  A[Draft] --> B[Review]\n```';
  const value = {
    ...snapshot,
    chapters: [{ ...snapshot.chapters[0]!, body: source }],
  };
  const result = await createOfflineBundle(active([value]), assets).build();
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const contents = new TextDecoder().decode(result.value.body);
  assert.ok(contents.includes(source));
  assert.doesNotMatch(contents, /<svg|<button|diagram-tools/);
});

test('offline bundle contains the active revision, full text, and local approved asset', async () => {
  const result = await createOfflineBundle(active([snapshot]), assets).build();
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.contentType, 'application/zip');
  assert.equal(result.value.filename, 'ae-publications.zip');
  assert.deepEqual(result.value.revision, [
    {
      id: 'release_1',
      projectVersion: 4,
      publishedAt: '2026-09-10T15:00:00.000Z',
    },
  ]);
  assert.equal(
    new DataView(result.value.body.buffer).getUint32(0, true),
    0x04034b50,
  );
  const contents = new TextDecoder().decode(result.value.body);
  assert.match(contents, /assets\/release_1\/image_1\.png/);
  assert.match(
    contents,
    /Full public text with \.\.\/\.\.\/assets\/release_1\/image_1\.png/,
  );
  assert.doesNotMatch(contents, /private-name\.png/);
});

test('offline bundle rejects a withdrawal or replacement during asset collection', async () => {
  let reads = 0;
  const publications: ActivePublicationPort = {
    async list() {
      reads += 1;
      return { ok: true, value: reads === 1 ? [snapshot] : [] };
    },
  };
  const result = await createOfflineBundle(publications, assets).build();
  assert.deepEqual(result, {
    ok: false,
    error: {
      code: 'unavailable',
      message: 'Active publications changed during export.',
    },
  });
});

test('offline bundle rejects missing or oversized approved assets', async () => {
  const result = await createOfflineBundle(active([snapshot]), {
    async read() {
      return {
        ok: true,
        value: { body: new Uint8Array(4 * 1024 * 1024 + 1), mime: 'image/png' },
      };
    },
  }).build();
  assert.deepEqual(result, {
    ok: false,
    error: {
      code: 'unavailable',
      message: 'Approved publication asset unavailable.',
    },
  });
});

test('offline bundle rejects unresolved public asset references', async () => {
  const result = await createOfflineBundle(
    active([
      {
        ...snapshot,
        coverAssetId: 'missing_image',
        chapters: [{ ...snapshot.chapters[0], body: 'asset:missing_image' }],
      },
    ]),
    assets,
  ).build();
  assert.deepEqual(result, {
    ok: false,
    error: {
      code: 'unavailable',
      message: 'Approved publication asset unavailable.',
    },
  });
});

test('offline bundle converts port failures into a typed unavailable result', async () => {
  const result = await createOfflineBundle(
    {
      async list() {
        throw new Error('storage failed');
      },
    },
    assets,
  ).build();
  assert.deepEqual(result, {
    ok: false,
    error: {
      code: 'unavailable',
      message: 'Publication bundle unavailable.',
    },
  });
});

test('subscription OPML only emits the canonical public feed', () => {
  assert.deepEqual(createSubscriptionOpml('https://amazingefren.com/'), {
    ok: true,
    value: {
      body: '<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><head><title>AE subscriptions</title></head><body><outline text="AE Readings" title="AE Readings" type="rss" xmlUrl="https://amazingefren.com/readings/feed.xml" htmlUrl="https://amazingefren.com/readings"/></body></opml>',
      contentType: 'text/x-opml; charset=utf-8',
      filename: 'ae-subscriptions.opml',
    },
  });
  assert.equal(createSubscriptionOpml('http://amazingefren.com/').ok, false);
  assert.equal(
    createSubscriptionOpml('https://user@amazingefren.com/').ok,
    false,
  );
});
