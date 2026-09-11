import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWritingGateway,
  isPublicSnapshot,
} from '../../composition/writing.ts';

const snapshot = {
  id: 'release-1',
  publishedAt: '2026-09-10T00:00:00.000Z',
  title: 'Sample',
  slug: 'sample',
  summary: '',
  kind: 'article',
  seoTitle: '',
  seoDescription: '',
  tags: [],
  coverAssetId: null,
  chapters: [],
  assets: [
    {
      id: 'image-1',
      name: 'Sample',
      mime: 'image/png',
      dataUrl: '/api/publications/assets/release-1/image-1',
      alt: '',
      caption: '',
      rights: '',
    },
  ],
  projectVersion: 1,
};

test('public snapshots only reference their own release assets', () => {
  assert.equal(isPublicSnapshot(snapshot), true);
  for (const dataUrl of [
    'https://untrusted.example/track',
    '/api/writing/assets/image-1',
    '/api/publications/assets/other/image-1',
    'javascript:alert(1)',
  ]) {
    assert.equal(
      isPublicSnapshot({
        ...snapshot,
        assets: [{ ...snapshot.assets[0], dataUrl }],
      }),
      false,
    );
  }
  assert.equal(isPublicSnapshot({ ...snapshot, slug: '../private' }), false);
});

test('writing rejects cross-origin requests and Access headers before touching the service', async () => {
  let calls = 0;
  const gateway = createWritingGateway({
    async fetch() {
      calls++;
      return Response.json({});
    },
  });
  const request = (origin: string, cookie?: string) =>
    new Request(
      'https://example.com/api/writing/operations/studio.writing.read',
      {
        method: 'POST',
        headers: {
          origin,
          ...(cookie ? { cookie } : {}),
          'Cf-Access-Jwt-Assertion': 'forged',
        },
        body: '{}',
      },
    );
  assert.equal(
    (
      await gateway.operation(
        request('https://evil.test', '__Host-ae-session=' + 'a'.repeat(43)),
      )
    ).status,
    401,
  );
  assert.equal(
    (await gateway.operation(request('https://example.com'))).status,
    401,
  );
  assert.equal(calls, 0);
});

test('public gateway fails closed for a foreign asset URL in a snapshot', async () => {
  const gateway = createWritingGateway({
    async fetch() {
      return Response.json({
        ok: true,
        value: [
          {
            ...snapshot,
            assets: [
              {
                ...snapshot.assets[0],
                dataUrl: 'https://untrusted.example/image',
              },
            ],
          },
        ],
      });
    },
  });
  const result = await gateway.read();
  assert.equal(result.ok, false);
});
