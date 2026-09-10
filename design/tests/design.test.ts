import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectStyles, checkDesign } from './check.ts';
import { systems } from '../../manifests/registry.ts';
import { renderTokens } from '../adapters/css/render.ts';

test('approved light surface stays flat and system dark has its own theme', () => {
  const css = renderTokens();
  assert.match(css, /--ae-background: #f5f0e8;/);
  assert.match(css, /--ae-page-background: var\(--ae-background\);/);
  assert.match(css, /:root:not\(\[data-theme\]\)/);
  assert.match(css, /color-scheme: dark/);
});

test('consumer styles reject invented colors, fonts, and token overrides', () => {
  assert.deepEqual(inspectStyles('.x { color: #ffffff; }'), ['Raw color']);
  assert.deepEqual(inspectStyles('.x { color: rgba(0,0,0,.2); }'), ['Raw color']);
  assert.deepEqual(inspectStyles('.x { font-family: Arial; }'), ['Local font family']);
  assert.deepEqual(inspectStyles('.x { --ae-ink: pink; }'), ['Canonical token override']);
  assert.deepEqual(inspectStyles('.x { color: var(--ae-invented); }'), ['Unknown token --ae-invented']);
  assert.deepEqual(inspectStyles('.x { color: var(--ae-ink); font-family: var(--ae-font-sans); }'), []);
});

test('generated assets, manifest references, and consumer styles agree', async () => {
  assert((await checkDesign(new URL('../../', import.meta.url), systems)) > 0);
});
