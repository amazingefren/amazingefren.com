import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedBytes, boundedJson } from '../../adapters/http/body.ts';

test('bounded bytes preserve binary chunks at the exact limit', async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([0, 255]));
      controller.enqueue(new Uint8Array([128, 1]));
      controller.close();
    },
  });
  const result = await boundedBytes(new Response(stream), 4);
  assert.deepEqual(result, {
    ok: true,
    value: new Uint8Array([0, 255, 128, 1]),
  });
});

test('bounded bytes cancel oversized streams without trusting content length', async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(5));
    },
    cancel() {
      cancelled = true;
    },
  });
  const result = await boundedBytes(
    new Response(stream, { headers: { 'content-length': '1' } }),
    4,
  );
  assert.equal(result.ok, false);
  assert.equal(cancelled, true);
  assert.equal(stream.locked, false);
});

test('bounded reads return defined failures for missing bodies and stream errors', async () => {
  assert.equal((await boundedBytes(new Response(null), 10)).ok, false);
  assert.equal((await boundedBytes(new Response('x'), 0)).ok, false);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.error(new Error('Read failed'));
    },
  });
  assert.equal((await boundedBytes(new Response(stream), 10)).ok, false);
  assert.equal(stream.locked, false);
});

test('bounded JSON preserves parsing behavior and rejects incomplete or oversized input', async () => {
  assert.deepEqual(await boundedJson(new Response('{"a":1}'), 7), {
    ok: true,
    value: { a: 1 },
  });
  assert.equal((await boundedJson(new Response('{"a":1}'), 6)).ok, false);
  assert.equal((await boundedJson(new Response('{'), 10)).ok, false);
});
