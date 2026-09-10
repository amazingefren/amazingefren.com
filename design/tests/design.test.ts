import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectStyles, inspectCopy, contrast, checkDesign } from './check.ts';
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
  assert.deepEqual(inspectStyles('.x { color: orange; }'), ['Raw color']);
  assert.deepEqual(inspectStyles('.x { color: rgba(0,0,0,.2); }'), ['Raw color']);
  assert.deepEqual(inspectStyles('.x { font-family: Arial; }'), ['Local font family']);
  assert.deepEqual(inspectStyles('.x { --ae-ink: pink; }'), ['Canonical token override']);
  assert.deepEqual(inspectStyles('.x { color: var(--ae-invented); }'), ['Unknown token --ae-invented']);
  assert.deepEqual(inspectStyles('.x { color: var(--ae-ink); font-family: var(--ae-font-sans); }'), []);
});

test('generated assets, manifest references, and consumer styles agree', async () => {
  assert((await checkDesign(new URL('../../', import.meta.url), systems)) > 0);
});

test('hover checks reject valid tokens used for the wrong state', () => {
  assert.deepEqual(inspectStyles('.action:hover { background: var(--ae-theme-accent-soft); }'), ['Wrong hover token --ae-theme-accent-soft']);
  assert.deepEqual(inspectStyles('.action:hover { background: var(--ae-action-primary-hover); color: var(--ae-action-primary-ink); }'), []);
  assert.deepEqual(inspectStyles('.selected { background: var(--ae-theme-ambient); }'), []);
});

test('copy checks reject known filler while keeping useful errors', () => {
  assert.equal(inspectCopy('<p>Select a system to look inside</p>').length, 1);
  assert.equal(inspectCopy('<p>Each agent has a task, an owned area, and a handoff.</p>').length, 1);
  assert.deepEqual(inspectCopy('<p>Could not save. Your changes are still here.</p>'), []);
});

test('contrast uses relative luminance rather than token membership', () => {
  assert.equal(contrast('#000000', '#ffffff'), 21);
  assert.equal(contrast('#ffffff', '#ffffff'), 1);
  assert(contrast('#fffaf3', '#a83b23') >= 4.5);
});
