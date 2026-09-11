import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicationAssetPort } from '../../composition/publication-assets.ts';
import { maximumOfflineBundleAssetBytes } from '../../../publishing/domain/offline-bundle/index.ts';

test('publication asset port reads only its scoped public release path', async () => {
  const requests: Request[] = [];
  const port = createPublicationAssetPort({
    async publicAsset(request) {
      requests.push(request);
      return new Response(new Uint8Array([0, 255]), {
        headers: { 'content-type': 'image/png' },
      });
    },
  });
  assert.equal((await port.read('../private', 'image')).ok, false);
  assert.equal((await port.read('release', 'image/other')).ok, false);
  assert.equal(requests.length, 0);
  const result = await port.read('release', 'image');
  assert.deepEqual(result, {
    ok: true,
    value: { body: new Uint8Array([0, 255]), mime: 'image/png' },
  });
  assert.equal(
    new URL(requests[0].url).pathname,
    '/api/publications/assets/release/image',
  );
  assert.equal(requests[0].headers.get('cookie'), null);
});

test('publication asset port bounds reads and contains missing, malformed and thrown service failures', async () => {
  for (const response of [
    () => new Response(null, { status: 404 }),
    () =>
      new Response('<script>bad</script>', {
        headers: { 'content-type': 'text/html' },
      }),
    () =>
      new Response(new Uint8Array(maximumOfflineBundleAssetBytes + 1), {
        headers: { 'content-type': 'image/png', 'content-length': '1' },
      }),
    () => {
      throw new Error('Service unavailable');
    },
  ]) {
    const port = createPublicationAssetPort({
      publicAsset: async () => response(),
    });
    const result = await port.read('release', 'image');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'unavailable');
  }
});
