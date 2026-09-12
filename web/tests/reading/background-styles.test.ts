import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('public pages use a flat background without fixed attachment', async () => {
  const css = await readFile(
    new URL('../../adapters/http/public.css', import.meta.url),
    'utf8',
  );
  assert.match(css, /body\s*\{[^}]*background: var\(--ae-background\);/);
  assert.doesNotMatch(css, /background-attachment:\s*fixed/);
});
