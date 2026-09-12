import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('public display-title styles do not apply to manuscript H1 headings', async () => {
  const css = await readFile(
    new URL('../../adapters/http/public.css', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(css, /\.reader\s+h1\s*\{/);
  assert.match(css, /\.reader > header > h1\s*\{[^}]*clamp\(50px, 6vw, 78px\)/);
  assert.match(
    css,
    /\.reader > header > h1\s*\{[^}]*color: var\(--ae-theme-accent\)/,
  );
  for (const [heading, size, color] of [
    ['h1', '42', '--ae-theme-accent-soft'],
    ['h2', '30', '--ae-theme-accent-soft'],
    ['h3', '24', '--ae-muted'],
  ]) {
    assert.match(
      css,
      new RegExp(
        `\\.reader \\.publication-markdown ${heading}\\s*\\{[^}]*color: var\\(${color}\\)[^}]*font: 400 var\\(--ae-text-${size}\\)`,
      ),
    );
  }
  for (const [heading, size] of [
    ['h1', '36'],
    ['h2', '26'],
    ['h3', '22'],
  ]) {
    assert.match(
      css,
      new RegExp(
        `\\.reader \\.publication-markdown ${heading}\\s*\\{[^}]*font-size: var\\(--ae-text-${size}\\)`,
      ),
    );
  }
});
