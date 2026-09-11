import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fitDimensions,
  isImageType,
  maximumImageBytes,
} from '../ui/writing/image-compression.ts';

test('image uploads keep the existing two MiB storage boundary', () => {
  assert.equal(maximumImageBytes, 2 * 1024 * 1024);
  assert.equal(isImageType('image/png'), true);
  assert.equal(isImageType('image/svg+xml'), false);
});

test('large image dimensions are reduced without upscaling', () => {
  assert.deepEqual(fitDimensions(8000, 4000, 4096), {
    width: 4096,
    height: 2048,
  });
  assert.deepEqual(fitDimensions(1200, 800, 4096), {
    width: 1200,
    height: 800,
  });
});
