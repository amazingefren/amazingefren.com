import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  publicationAssetId,
  publicationDiagramSize,
  publicationLanguage,
  safePublicationUrl,
  sanitizeMermaidSvg,
} from '../../rendering/publication-rendering.ts';

test('publication rendering keeps approved asset references and known aliases', () => {
  assert.equal(publicationAssetId('asset:asset-1'), 'asset-1');
  assert.equal(publicationAssetId('https://example.com/image.png'), null);
  assert.equal(publicationLanguage('ts'), 'typescript');
  assert.equal(publicationLanguage('unknown'), 'unknown');
});

test('publication diagram dimensions retain native viewBox dimensions', () => {
  assert.deepEqual(
    publicationDiagramSize('<svg viewBox="0 0 956.5 1621.1"></svg>'),
    { width: 956.5, height: 1621.1 },
  );
  assert.deepEqual(publicationDiagramSize('<svg viewBox="0 0 0 20"></svg>'), {
    width: 1,
    height: 1,
  });
  assert.deepEqual(publicationDiagramSize('<svg></svg>'), {
    width: 1,
    height: 1,
  });
});

test('publication diagram keeps source available in server HTML', async () => {
  const directory = await mkdtemp(
    join(process.cwd(), 'publishing/tests/rendering/.tmp-diagram-'),
  );
  const output = join(directory, 'PublicationDiagram.mjs');
  try {
    await build({
      bundle: true,
      entryPoints: [
        new URL('../../rendering/PublicationDiagram.tsx', import.meta.url)
          .pathname,
      ],
      external: ['react', 'react-dom'],
      format: 'esm',
      jsx: 'automatic',
      outfile: output,
      platform: 'node',
    });
    const { PublicationDiagram } = await import(pathToFileURL(output).href);
    const source = 'flowchart LR\n  A[Draft] --> B[Review]';
    const html = renderToStaticMarkup(
      createElement(PublicationDiagram, {
        includeActions: true,
        source,
        svg: '<svg viewBox="0 0 120 48"><rect width="120" height="48" /></svg>',
      }),
    );
    assert.match(html, /<details class="diagram-transcript">/);
    assert.match(
      html,
      /<pre><code>flowchart LR\n  A\[Draft\] --&gt; B\[Review\]<\/code><\/pre>/,
    );
    assert.doesNotMatch(html, /diagram-transcript" hidden/);
    assert.match(html, /<div aria-hidden="true" class="diagram-graphic"/);
    assert.match(
      html,
      /class="publication-diagram-viewport diagram-canvas"[^>]*role="region"[^>]*tabindex="0"/,
    );
    assert.doesNotMatch(html, /diagram-tools/);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test('publication rendering rejects unsafe URLs and SVG execution paths', () => {
  assert.equal(safePublicationUrl('javascript:alert(1)', 'href'), '');
  assert.equal(safePublicationUrl('data:text/html,unsafe', 'src'), '');
  assert.equal(safePublicationUrl('/images/example.webp', 'src'), '');
  const clean = sanitizeMermaidSvg(
    '<svg onload="alert(1)"><script>x</script><foreignObject>bad</foreignObject><a href="https://bad.example">x</a><path d="M0 0" /></svg>',
  );
  assert.match(clean, /<svg/);
  assert.match(clean, /<path/);
  assert.doesNotMatch(clean, /script|foreignObject|onload|https:\/\//i);
});

test('publication rendering keeps safe relative Markdown links', () => {
  assert.equal(
    safePublicationUrl('/readings/ae-intro', 'href'),
    '/readings/ae-intro',
  );
  assert.equal(safePublicationUrl('./chapter', 'href'), './chapter');
  assert.equal(safePublicationUrl('chapter?part=1', 'href'), 'chapter?part=1');
  assert.equal(
    safePublicationUrl('mailto:hello@example.com', 'href'),
    'mailto:hello@example.com',
  );
  assert.equal(safePublicationUrl('\njavascript:alert(1)', 'href'), '');
  assert.equal(safePublicationUrl('java\tscript:alert(1)', 'href'), '');
});

test('publication SVG rendering keeps only local sanitized paint references', () => {
  const clean = sanitizeMermaidSvg(
    '<svg><path fill="url(https://bad.example/paint)" stroke="url(\'data:text/css,bad\')" marker-end="url(#missing)"/><defs><marker id="arrow"/></defs><path marker-end="url(#arrow)"/></svg>',
  );
  assert.doesNotMatch(clean, /bad\.example|data:text|missing/);
  assert.match(clean, /url\(#user-content-arrow\)/);
});
