import assert from 'node:assert/strict';
import test from 'node:test';
import { createPortablePublicationHttpHandler } from '../../../adapters/http/portable-publications.ts';
import type { Snapshot } from '../../../../contracts/writing/index.ts';

const snapshot: Snapshot = {
  id: 'release_1',
  publishedAt: '2026-09-10T15:00:00.000Z',
  title: 'Public',
  slug: 'public',
  summary: 'Public.',
  kind: 'article',
  seoTitle: 'Public',
  seoDescription: 'Public.',
  tags: [],
  coverAssetId: null,
  chapters: [
    { documentId: 'document_1', revision: 1, title: 'Public', body: 'Text' },
  ],
  assets: [],
  projectVersion: 1,
};

test('portable publication handler exports the active bundle and canonical OPML', async () => {
  const handler = createPortablePublicationHttpHandler({
    publications: {
      async list() {
        return { ok: true, value: [snapshot] };
      },
    },
    assets: {
      async read() {
        return { ok: false, error: { code: 'missing', message: 'No asset' } };
      },
    },
    origin: 'https://amazingefren.com/',
  });
  const bundle = await handler(
    new Request('https://amazingefren.com/exports/publications.zip'),
  );
  assert.equal(bundle.status, 200);
  assert.equal(bundle.headers.get('content-type'), 'application/zip');
  assert.equal(bundle.headers.get('cache-control'), 'no-store');
  const opml = await handler(
    new Request('https://amazingefren.com/readings/subscriptions.opml'),
  );
  assert.equal(opml.status, 200);
  assert.match(
    await opml.text(),
    /https:\/\/amazingefren\.com\/readings\/feed\.xml/,
  );
});

test('portable publication handler does not serve undeclared paths', async () => {
  const handler = createPortablePublicationHttpHandler({
    publications: {
      async list() {
        return { ok: true, value: [] };
      },
    },
    assets: {
      async read() {
        return { ok: false, error: { code: 'missing', message: 'No asset' } };
      },
    },
    origin: 'https://amazingefren.com/',
  });
  assert.equal(
    (
      await handler(
        new Request('https://amazingefren.com/readings/private.zip'),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await handler(
        new Request(
          'https://amazingefren.com/exports/publications.zip?draft=true',
        ),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await handler(
        new Request('https://amazingefren.com/exports/publications.zip', {
          method: 'POST',
        }),
      )
    ).status,
    405,
  );
});
